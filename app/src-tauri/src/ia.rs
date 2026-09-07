//! A chamada a um modelo de linguagem, para o construtor de expressao.
//!
//! MORA NO RUST, e nao no JS nem no Harbour, por tres motivos que nao sao de
//! estilo:
//!
//! - A VM do Harbour e uma thread so: uma chamada de 3 a 10 s congelaria
//!   todas as abas. Aqui ela roda `async`, fora do IPC e fora da VM.
//! - O `fetch` do webview esbarra em CORS: OpenAI aceita chamada do browser,
//!   um Ollama local ou um proxy da empresa muitas vezes nao. Fora do browser
//!   CORS nao existe.
//! - A chave nao pode viver na pagina. Fica em `<raiz>/.qdbu/ia.json`, lida
//!   daqui; o webview so fica sabendo se ha chave ou nao (`ia_status`).
//!
//! O QUE SAI DA MAQUINA: o pedido em texto, os nomes e tipos dos campos, e o
//! catalogo de funcoes. NENHUM registro. O aviso de primeira vez, na UI, diz
//! isso — e diz que este programa nao guarda nada do que vai e volta.
//!
//! O QUE VOLTA nunca e aplicado: cai no rascunho do construtor como um passo
//! de undo, passa pelo `expr.check`, e so entra no arquivo se a pessoa clicar
//! em Usar. A IA sugere; quem decide e quem esta na frente.
//!
//! O formato e o de "chat completions" (`/v1/chat/completions`), que e o que
//! praticamente todo endpoint aceita — OpenAI, Ollama, proxies. Por isso o
//! endpoint e configuravel: a pessoa aponta para onde quiser.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// `<raiz>/.qdbu/ia.json` — a configuracao da IA, SEPARADA do config.json
/// que a DLL le e grava: a DLL nao tem por que conhecer a chave.
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ConfigIa {
    #[serde(default)]
    pub endpoint: String,
    #[serde(default)]
    pub modelo: String,
    #[serde(default)]
    pub chave: String,
    /// A pessoa ja leu o aviso de "isto sai da maquina"?
    #[serde(default)]
    pub aviso_lido: bool,
}

pub const ENDPOINT_PADRAO: &str = "https://api.openai.com/v1/chat/completions";
pub const MODELO_PADRAO: &str = "gpt-4o-mini";

fn arquivo(base: PathBuf) -> PathBuf {
    let dir = base.join(".qdbu");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("ia.json")
}

pub fn ler(base: PathBuf) -> ConfigIa {
    std::fs::read_to_string(arquivo(base))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

pub fn gravar(base: PathBuf, cfg: &ConfigIa) -> Result<(), String> {
    let txt = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(arquivo(base), txt).map_err(|e| e.to_string())
}

/// O que o webview pode saber: tudo MENOS a chave. `chave_ok` diz se ha uma.
#[derive(Serialize)]
pub struct StatusIa {
    pub endpoint: String,
    pub modelo: String,
    pub chave_ok: bool,
    pub aviso_lido: bool,
}

impl From<&ConfigIa> for StatusIa {
    fn from(c: &ConfigIa) -> Self {
        StatusIa {
            endpoint: if c.endpoint.is_empty() { ENDPOINT_PADRAO.into() } else { c.endpoint.clone() },
            modelo: if c.modelo.is_empty() { MODELO_PADRAO.into() } else { c.modelo.clone() },
            chave_ok: !c.chave.trim().is_empty(),
            aviso_lido: c.aviso_lido,
        }
    }
}

#[derive(Serialize)]
struct Mensagem<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct Pedido<'a> {
    model: &'a str,
    messages: Vec<Mensagem<'a>>,
    temperature: f32,
    /// JSON de saida exigido: `{"expressao": "..."}`. Prosa em volta da
    /// expressao ("Claro! A expressao e: ...") e o que quebra tudo, e este
    /// campo e o que a impede na origem. Endpoints que nao o conhecem
    /// ignoram; o `expr.check` do outro lado e a segunda barreira.
    #[serde(skip_serializing_if = "Option::is_none")]
    response_format: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct Resposta {
    choices: Vec<Escolha>,
}
#[derive(Deserialize)]
struct Escolha {
    message: Conteudo,
}
#[derive(Deserialize)]
struct Conteudo {
    content: String,
}

/// Manda `sistema` + `usuario` ao endpoint e devolve o texto da resposta.
/// Nao interpreta: quem extrai a expressao do JSON e o chamador.
pub async fn perguntar(cfg: &ConfigIa, sistema: &str, usuario: &str) -> Result<String, String> {
    if cfg.chave.trim().is_empty() {
        return Err("sem chave".into());
    }
    let endpoint = if cfg.endpoint.is_empty() { ENDPOINT_PADRAO } else { &cfg.endpoint };
    let modelo = if cfg.modelo.is_empty() { MODELO_PADRAO } else { &cfg.modelo };

    let corpo = Pedido {
        model: modelo,
        messages: vec![
            Mensagem { role: "system", content: sistema },
            Mensagem { role: "user", content: usuario },
        ],
        temperature: 0.0,
        response_format: Some(serde_json::json!({ "type": "json_object" })),
    };

    let cliente = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("cliente http: {e}"))?;

    let r = cliente
        .post(endpoint)
        .bearer_auth(cfg.chave.trim())
        .json(&corpo)
        .send()
        .await
        .map_err(|e| format!("nao foi possivel falar com {endpoint}: {e}"))?;

    let status = r.status();
    let texto = r.text().await.map_err(|e| format!("lendo a resposta: {e}"))?;
    if !status.is_success() {
        // O corpo do erro e a unica pista util ("invalid api key", "model
        // not found"). OpenAI e a maioria dos compativeis mandam
        // `{"error":{"message":...}}`: vai so a frase. Fora desse formato vai
        // o corpo inteiro, cortado num tamanho de tela.
        let frase = serde_json::from_str::<serde_json::Value>(&texto)
            .ok()
            .and_then(|v| v.get("error").cloned())
            .and_then(|e| e.get("message").and_then(|m| m.as_str()).map(|m| m.to_string()))
            .unwrap_or_else(|| texto.chars().take(400).collect());
        return Err(format!("HTTP {status}: {frase}"));
    }

    let resp: Resposta = serde_json::from_str(&texto)
        .map_err(|e| format!("resposta fora do formato esperado: {e}"))?;
    resp.choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "resposta sem conteudo".into())
}

/// O JSON da resposta. Tolera o modelo ter posto cercas de codigo em volta,
/// que e o vicio mais comum.
pub fn json_de(texto: &str) -> Option<serde_json::Value> {
    let limpo = texto.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
    serde_json::from_str(limpo).ok()
}

/// Um campo texto do JSON, aparado; vazio se nao veio. O contrato do prompt
/// e em ingles (`expression`, `reason`, `question`); o nome em portugues fica
/// aceito porque um prompt substituido pelo cliente pode pedir assim.
pub fn campo_de(v: &Option<serde_json::Value>, nomes: &[&str]) -> String {
    let Some(v) = v else { return String::new() };
    nomes
        .iter()
        .find_map(|n| v.get(*n).and_then(|x| x.as_str()))
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}
