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

/// A configuracao, ou o motivo de nao ter dado.
///
/// `Ok(None)` e "ainda nao existe", que e normal. `Err` e "existe e nao da
/// para ler" -- e a diferenca entre os dois vale a chave da pessoa: engolindo
/// o erro, `ia_status` dizia "(nao configurada)", ela abria Preferencias,
/// clicava Gravar sem redigitar, e o campo vazio (que significa "nao mexi")
/// gravava vazio por cima. Chave perdida sem uma palavra.
pub fn tentar_ler(base: PathBuf) -> Result<Option<ConfigIa>, String> {
    let arq = arquivo(base);
    let txt = match std::fs::read_to_string(&arq) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(format!("{}: {e}", arq.display())),
    };
    serde_json::from_str(&txt)
        .map(Some)
        .map_err(|e| format!("{}: {e}", arq.display()))
}

/// Para quem nao tem o que fazer com a falha (a propria chamada ao modelo, que
/// ja recusa por falta de chave). Quem MEXE na configuracao usa `tentar_ler`.
pub fn ler(base: PathBuf) -> ConfigIa {
    tentar_ler(base).ok().flatten().unwrap_or_default()
}

/// Grava por arquivo temporario + rename.
///
/// `fs::write` trunca antes de escrever: uma queda no meio deixa um `ia.json`
/// pela metade -- e era esse arquivo pela metade que fazia a chave sumir. O
/// rename e a operacao que o sistema de arquivos trata como indivisivel: ou o
/// arquivo antigo continua inteiro, ou o novo esta inteiro.
pub fn gravar(base: PathBuf, cfg: &ConfigIa) -> Result<(), String> {
    let alvo = arquivo(base);
    let txt = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    let tmp = alvo.with_extension("json.novo");
    std::fs::write(&tmp, txt).map_err(|e| format!("{}: {e}", tmp.display()))?;
    // Windows recusa rename por cima de arquivo existente.
    let _ = std::fs::remove_file(&alvo);
    std::fs::rename(&tmp, &alvo).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("{}: {e}", alvo.display())
    })
}

/// O prompt que o cliente pos em `<raiz>/.qdbu/prompts/construtor.md`, ou "".
///
/// E a camada que permite ajustar a prosa numa maquina sem gerar release. Le
/// daqui e nao do webview porque `fetch` alcanca `app/ui/` e mais nada: no app
/// instalado os assets estao dentro do binario.
pub fn prompt_do_cliente(base: PathBuf) -> String {
    let arq = base.join(".qdbu").join("prompts").join("construtor.md");
    std::fs::read_to_string(arq).unwrap_or_default()
}

/// O que o webview pode saber: tudo MENOS a chave. `chave_ok` diz se ha uma.
#[derive(Serialize)]
pub struct StatusIa {
    pub endpoint: String,
    pub modelo: String,
    pub chave_ok: bool,
    pub aviso_lido: bool,
    /// Vazio quando esta tudo bem. Preenchido quando o `ia.json` existe e nao
    /// da para ler -- a UI precisa dizer isso, senao "(nao configurada)" e uma
    /// mentira que leva a pessoa a apagar a propria chave.
    pub problema: String,
}

impl From<&ConfigIa> for StatusIa {
    fn from(c: &ConfigIa) -> Self {
        StatusIa {
            endpoint: if c.endpoint.is_empty() { ENDPOINT_PADRAO.into() } else { c.endpoint.clone() },
            modelo: if c.modelo.is_empty() { MODELO_PADRAO.into() } else { c.modelo.clone() },
            chave_ok: !c.chave.trim().is_empty(),
            aviso_lido: c.aviso_lido,
            problema: String::new(),
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
    #[serde(default)]
    usage: Option<Uso>,
}

/// O `usage` da resposta. OpenAI manda sempre; endpoints compativeis quase
/// sempre. Quem nao mandar deixa zero -- e informacao, nao pode derrubar uma
/// sugestao que ja veio.
#[derive(Deserialize, Default)]
struct Uso {
    #[serde(default)]
    prompt_tokens: u32,
    #[serde(default)]
    completion_tokens: u32,
}

/// O que a chamada devolveu: o texto e o que ela custou.
pub struct RespostaIa {
    pub texto: String,
    pub tok_in: u32,
    pub tok_out: u32,
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
pub async fn perguntar(cfg: &ConfigIa, sistema: &str, usuario: &str) -> Result<RespostaIa, String> {
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
    let u = resp.usage.unwrap_or_default();
    let conteudo = resp
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "resposta sem conteudo".to_string())?;
    Ok(RespostaIa { texto: conteudo, tok_in: u.prompt_tokens, tok_out: u.completion_tokens })
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

// ------------------------------------------------------------- historico

/// Uma chamada, como ela foi -- vira uma linha JSONL em
/// `<raiz>/.qdbu/ia/AAAAMMDD.jsonl`. Mesmo formato e mesmo por-dia do log de
/// alteracoes, pelo mesmo motivo: e o arquivo que responde "o que rodou por
/// aqui" meses depois, e um arquivo por dia nunca vira um monolito.
///
/// SEPARADO do log de alteracoes de proposito. Aquele so registra o que muda
/// bytes no disco -- criterio unico e verificavel. Pedido e resposta nao mudam
/// byte nenhum; juntar os dois encheria a auditoria de linhas que nao tocaram
/// arquivo, que e exatamente o erro que aquele log ja cometeu uma vez.
///
/// A chamada que FALHOU entra tambem: "o que rodou por ali" inclui o que nao
/// deu certo, e o erro do servico e a unica pista quando alguem pergunta por
/// que nao veio sugestao naquele dia.
#[derive(Serialize, Deserialize, Clone)]
pub struct Entrada {
    /// Hora local, `AAAA-MM-DD HH:MM:SS`.
    pub q: String,
    #[serde(default)]
    pub arq: String,
    #[serde(default)]
    pub uso: String,
    pub pedido: String,
    #[serde(default)]
    pub expr: String,
    #[serde(default)]
    pub motivo: String,
    #[serde(default)]
    pub pergunta: String,
    #[serde(default)]
    pub erro: String,
    #[serde(default)]
    pub ms: u64,
    /// Tokens cobrados, ida e volta. Zero quando o endpoint nao informa.
    #[serde(default)]
    pub tok_in: u32,
    #[serde(default)]
    pub tok_out: u32,
    #[serde(default)]
    pub modelo: String,
}

pub fn agora() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn pasta_hist(base: PathBuf) -> PathBuf {
    let dir = base.join(".qdbu").join("ia");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

/// Best-effort, como o log de alteracoes: disco cheio ou pasta somente-leitura
/// nao podem derrubar uma sugestao que ja foi produzida.
pub fn registrar(base: PathBuf, e: &Entrada) {
    use std::io::Write;
    let dia = chrono::Local::now().format("%Y%m%d").to_string();
    let arq = pasta_hist(base).join(format!("{dia}.jsonl"));
    if let Ok(linha) = serde_json::to_string(e) {
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(arq) {
            let _ = writeln!(f, "{linha}");
        }
    }
}

/// As `limite` chamadas mais recentes, da mais nova para a mais velha.
///
/// Le de tras para a frente -- dias do mais recente ao mais antigo, e dentro do
/// dia a ultima linha primeiro -- e para assim que enche. Ler o historico
/// inteiro para descartar 90% dele seria o mesmo desperdicio que a grade evita
/// paginando.
pub fn historico(base: PathBuf, limite: usize) -> Vec<Entrada> {
    let mut dias: Vec<PathBuf> = std::fs::read_dir(pasta_hist(base))
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "jsonl"))
        .collect();
    dias.sort(); // AAAAMMDD ordena como data
    dias.reverse();

    let mut fora: Vec<Entrada> = Vec::new();
    for dia in dias {
        let Ok(txt) = std::fs::read_to_string(&dia) else { continue };
        for linha in txt.lines().rev() {
            if let Ok(e) = serde_json::from_str::<Entrada>(linha) {
                fora.push(e);
                if fora.len() >= limite {
                    return fora;
                }
            }
        }
    }
    fora
}
