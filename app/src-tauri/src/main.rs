// Sem console, nem em dev: a janela extra de terminal nao serve para nada
// quando o diagnostico e feito por CDP (ver app/devtools/cdp.mjs).
// Em troca, tudo que iria para o stderr vai para um arquivo de log -- ver
// `log()` abaixo e o campo `log` de StatusDll, que a UI mostra no rodape.
#![windows_subsystem = "windows"]

mod ia;
mod qdbudll;

use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Instant;

use qdbudll::Harbour;
use serde::Serialize;
use tauri::{Emitter, Manager, State};

/// Porta do Chrome DevTools Protocol do WebView2.
///
/// O CDP fica SEMPRE ligado em build de debug: e por ele que a UI e validada
/// (o webview nao tem console, e um erro de sintaxe no JS deixa a tela morta
/// sem sinal em lugar nenhum). Ver app/devtools/cdp.bat.
///
/// 9333 e nao 9222 de proposito: a 9222 costuma estar ocupada pelo Chrome.
/// Sobrescrevivel por QDBU_CDP_PORT; `QDBU_CDP_PORT=0` desliga.
const CDP_PORT_PADRAO: &str = "9333";

/// Versao de exibicao, `NN.NN`, e a data de linkedicao -- carimbadas pelo
/// `build.rs` a partir de `[package] version`. Ver o comentario de la: o par e
/// a data andam juntos porque nenhum dos dois identifica sozinho um binario.
const VERSAO: &str = env!("QDBU_VERSAO");
const COMPILADO: &str = env!("QDBU_COMPILADO");

/// O nome do produto na tela. **`QDbu`, com esta grafia exata** -- nao `QDBU`,
/// que e como o identificador do pacote e as variaveis de ambiente se escrevem.
/// Ele existe como constante para nao haver uma segunda grafia em lugar nenhum.
const PRODUTO: &str = "QDbu";

/// O titulo da janela, no formato do DBU: nome, versao e o que o programa e.
fn titulo_janela() -> String {
    format!("{PRODUTO} v{VERSAO} - Database Utility")
}

static PROXIMO_ID: AtomicU64 = AtomicU64::new(1);

/// Ultima geometria com a janela RESTAURADA (nao maximizada).
///
/// Existe porque, com a janela maximizada, `outer_position()` devolve a
/// geometria de tela cheia -- inutil para lembrar em QUAL MONITOR ela estava.
/// Guardar a posicao restaurada e o que faz o app voltar no monitor certo em
/// vez de sempre no primario.
static ULTIMA_RESTAURADA: Mutex<Option<(i32, i32, u32, u32)>> = Mutex::new(None);
static INICIO: OnceLock<Instant> = OnceLock::new();
static LOG_PATH: OnceLock<PathBuf> = OnceLock::new();

/// Raiz do projeto, achada subindo a partir do executavel ate encontrar
/// `qdbudll.hbp`. O projeto e autocontido: tudo que ele gera (log, dados do
/// WebView2, binarios) fica sob esta pasta, nunca em %TEMP% ou %LOCALAPPDATA%.
fn raiz_projeto() -> Option<PathBuf> {
    let exe = env::current_exe().ok()?;
    let mut dir = exe.parent()?.to_path_buf();
    for _ in 0..8 {
        if dir.join("qdbudll.hbp").is_file() {
            return Some(dir);
        }
        dir = dir.parent()?.to_path_buf();
    }
    None
}

/// Onde o app instalado grava, quando `raiz_projeto()` nao acha nada.
///
/// A regra 1 do o guia do projeto ("nada em %TEMP%, nada em %LOCALAPPDATA%") vale para a
/// ARVORE DE FONTES, onde `qdbudll.hbp` existe e `raiz_projeto()` responde. O app
/// INSTALADO nao tem `qdbudll.hbp` -- nunca teve, mas ate o instalador existir o
/// fallback nunca disparava. Agora dispara, e `env::temp_dir()` era a pior das
/// escolhas possiveis: a limpeza do Windows apaga `%TEMP%` sem aviso, entao o log
/// de "o que este programa fez com o meu arquivo?" sumiria sozinho.
///
/// A ordem: primeiro ao lado do executavel (mantem o app autocontido, e o que
/// vale para instalacao portatil numa pasta gravavel); se nao der para escrever
/// ali -- `C:\Program Files` nao deixa --, `%LOCALAPPDATA%\dbu-harbour`, que e
/// por design o lugar de dado por usuario de app instalado no Windows.
/// RESPONDIDA UMA VEZ. A sondagem cria e apaga um arquivo, e `arquivo_janela()`
/// chama isto a cada mover/redimensionar da janela -- sem o cache seriam dois
/// toques de disco por evento de janela, para uma resposta que nao muda enquanto
/// o processo vive.
static BASE_INSTALADO: OnceLock<PathBuf> = OnceLock::new();

fn base_instalado() -> PathBuf {
    BASE_INSTALADO
        .get_or_init(|| {
            if let Some(dir) = env::current_exe().ok().and_then(|p| p.parent().map(PathBuf::from)) {
                // Sondagem de escrita real: `Program Files` e legivel e listavel,
                // entao so tentar criar o arquivo responde a pergunta que importa.
                let sonda = dir.join(".qdbu-escrita.tmp");
                if std::fs::write(&sonda, b"").is_ok() {
                    let _ = std::fs::remove_file(&sonda);
                    return dir;
                }
            }
            env::var_os("LOCALAPPDATA")
                .map(PathBuf::from)
                .unwrap_or_else(env::temp_dir)
                .join("dbu-harbour")
        })
        .clone()
}

/// Pasta de artefatos de execucao, dentro do projeto: `<raiz>/.run`.
fn dir_run() -> PathBuf {
    let base = raiz_projeto().unwrap_or_else(base_instalado);
    let d = base.join(".run");
    let _ = std::fs::create_dir_all(&d);
    d
}

/// Arquivo de log: `QDBU_LOG` se definida, senao `<raiz>/.run/qdbu.log`.
fn caminho_log() -> &'static Path {
    LOG_PATH.get_or_init(|| {
        env::var("QDBU_LOG")
            .map(PathBuf::from)
            .ok()
            .unwrap_or_else(|| dir_run().join("qdbu.log"))
    })
}

/// Substitui o `eprintln!`: sem console, o stderr nao tem para onde ir.
/// O carimbo e o tempo desde o inicio do processo, que e o que importa para
/// ler a ordem dos eventos de boot.
fn log(msg: &str) {
    let t = INICIO.get_or_init(Instant::now).elapsed().as_secs_f64();
    let linha = format!("[t+{t:7.3}s] {msg}
");
    // Sem eprint! aqui: o binario nao tem console, e no modo --selftest o
    // stderr aponta para o console anexado do pai -- imprimir dos dois lados
    // duplicaria cada linha. Quem precisa de console usa `saida()`.
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(caminho_log()) {
        let _ = f.write_all(linha.as_bytes());
    }
}

/// Estado global: a fachada da VM Harbour (ou o motivo de nao ter carregado).
struct Estado {
    hb: Mutex<Option<Harbour>>,
    erro_carga: Mutex<Option<String>>,
    /// Leitor de progresso, num Mutex SEPARADO do `hb`.
    ///
    /// O comando `rpc` segura `hb` durante toda a chamada. Se o andamento
    /// morasse ali dentro, perguntar o progresso ficaria na fila atras da
    /// propria tarefa -- que e exatamente o problema que progress.c resolve no
    /// nivel de baixo. Aqui o lock e pego, o Arc e clonado e o lock e solto na
    /// mesma linha; ninguem espera por ninguem.
    progresso: Mutex<Option<Arc<qdbudll::Progresso>>>,
    /// O que veio na linha de comando. Lido uma vez no arranque e entregue a
    /// UI pelo `status` -- quem abre arquivo continua sendo o frontend.
    params: ParametrosLinha,
    /// A pergunta de saida ja foi respondida com "sim"?
    ///
    /// `CloseRequested` dispara de novo quando a UI manda fechar de verdade, e
    /// sem este trinco a pergunta se repetiria para sempre.
    saida_confirmada: Mutex<bool>,
}

#[derive(Serialize)]
struct StatusDll {
    carregada: bool,
    caminho: String,
    erro: Option<String>,
    arch_app: &'static str,
    log: String,
    cdp: String,
    /// Nome do produto na grafia oficial -- ver a constante PRODUTO.
    produto: &'static str,
    /// `NN.NN`, e a data de linkedicao que a acompanha.
    versao: &'static str,
    compilado: &'static str,
    /// O que veio na linha de comando, ja interpretado.
    params: ParametrosLinha,
}

#[derive(Serialize)]
struct Resultado {
    ok: bool,
    saida: String,
    /// true quando o Harbour devolveu "ERR:..." (erro de negocio, nao de FFI)
    erro_harbour: bool,
    ms: f64,
    bytes: usize,
}

/// Procura qdbudll.dll em locais previsiveis, do mais especifico ao mais generico.
///
/// A ORDEM MUDA ENTRE DEBUG E RELEASE, e o motivo e concreto.
///
/// O `resources` do tauri.conf.json faz o build script do tauri-build COPIAR
/// `bin/qdbudll.dll` para junto do executavel -- inclusive em
/// `target/i686-pc-windows-msvc/debug/`. Em desenvolvimento essa copia e uma
/// armadilha: quem roda `make.bat` e depois abre o .exe direto, sem passar pelo
/// cargo, carregaria a copia VELHA e continuaria vendo o defeito que acabou de
/// corrigir -- sem nenhum sinal, que e a mesma classe de perda de tempo do
/// frontend embutido descrita no o guia do projeto.
///
/// Entao: em DEBUG a fonte (`<raiz>/bin/qdbudll.dll`) vem primeiro; em RELEASE,
/// e no app instalado, a que esta ao lado do executavel -- que la e a unica.
fn achar_dll() -> PathBuf {
    if let Ok(p) = env::var("QDBU_DLL") {
        let p = PathBuf::from(p);
        if p.is_file() {
            return p;
        }
    }

    let mut candidatos: Vec<PathBuf> = Vec::new();

    // A DLL recem-compilada, achada pela raiz do repositorio -- precisa, sem
    // depender de quantos niveis o perfil de build tem no caminho.
    let fonte = raiz_projeto().map(|r| r.join("bin").join("qdbudll.dll"));
    if cfg!(debug_assertions) {
        candidatos.extend(fonte.clone());
    }

    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            // App INSTALADO: `bundle.resources` esta na forma de MAPA
            // (`{ "../../bin/qdbudll.dll": "qdbudll.dll" }`) justamente para cair
            // aqui. Na forma de LISTA o Tauri reescreve cada `..` como `_up_`
            // (tauri-utils `resource_relpath()`) e a DLL iria para
            // `resources/_up_/_up_/bin/qdbudll.dll`, caminho que NENHUM candidato
            // desta funcao alcanca: o app instalado subia com "FALHOU ao
            // carregar a DLL" e nada apontava para a causa.
            candidatos.push(dir.join("qdbudll.dll"));
            // Cinto e suspensorio: no Windows `resource_dir()` E o diretorio do
            // exe, mas se alguem voltar a forma de lista sem `..`, e aqui.
            candidatos.push(dir.join("resources").join("qdbudll.dll"));
            // rodando de target/i686-pc-windows-msvc/debug/ -> sobe ate a raiz
            for n in 1..=5 {
                let mut up = dir.to_path_buf();
                for _ in 0..n {
                    up = match up.parent() {
                        Some(p) => p.to_path_buf(),
                        None => break,
                    };
                }
                candidatos.push(up.join("bin").join("qdbudll.dll"));
            }
        }
    }

    if !cfg!(debug_assertions) {
        candidatos.extend(fonte);
    }

    if let Ok(cwd) = env::current_dir() {
        candidatos.push(cwd.join("bin").join("qdbudll.dll"));
        candidatos.push(cwd.join("qdbudll.dll"));
    }

    for c in &candidatos {
        if c.is_file() {
            return c.clone();
        }
    }

    candidatos.into_iter().next().unwrap_or_else(|| PathBuf::from("qdbudll.dll"))
}

#[tauri::command]
fn status(estado: State<Estado>) -> StatusDll {
    log("[qdbu] status() chamado pelo frontend");
    let hb = estado.hb.lock().unwrap();
    let erro = estado.erro_carga.lock().unwrap().clone();

    StatusDll {
        carregada: hb.is_some(),
        caminho: hb
            .as_ref()
            .map(|h| h.caminho().display().to_string())
            .unwrap_or_else(|| achar_dll().display().to_string()),
        erro,
        arch_app: if cfg!(target_pointer_width = "32") {
            "32-bit (i686)"
        } else {
            "64-bit (x86_64) - INCOMPATIVEL com a DLL 32-bit"
        },
        log: caminho_log().display().to_string(),
        cdp: env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")
            .ok()
            .and_then(|v| {
                v.split("--remote-debugging-port=")
                    .nth(1)
                    .map(|p| p.split_whitespace().next().unwrap_or(p).to_string())
            })
            .unwrap_or_else(|| "desligado".to_string()),
        produto: PRODUTO,
        versao: VERSAO,
        compilado: COMPILADO,
        params: estado.params.clone(),
    }
}

#[tauri::command]
fn executar(estado: State<Estado>, func: String, arg: String) -> Result<Resultado, String> {
    let hb = estado.hb.lock().unwrap();
    let hb = hb.as_ref().ok_or_else(|| {
        estado
            .erro_carga
            .lock()
            .unwrap()
            .clone()
            .unwrap_or_else(|| "qdbudll.dll nao carregada".to_string())
    })?;

    let t0 = Instant::now();
    let saida = hb.exec(func.trim(), &arg)?;
    let ms = t0.elapsed().as_secs_f64() * 1000.0;

    Ok(Resultado {
        ok: true,
        erro_harbour: saida.starts_with("ERR:"),
        bytes: saida.len(),
        saida,
        ms,
    })
}

/// Chamada RPC com envelope. O `id` e gerado AQUI, nao no JS: assim o frontend
/// so pensa em `metodo` + `params`, e ainda ganhamos deteccao de resposta
/// desalinhada de graca -- se o id que volta nao for o que enviamos, e bug de
/// ponte, nao dado ruim.
/*
 * ASYNC + spawn_blocking, e nao um comando sincrono.
 *
 * Comando sincrono do Tauri roda na thread do IPC. Um `filter.count` de 600 ms
 * bloqueava TODOS os outros comandos nesse tempo -- inclusive `andamento`, que
 * chegava 582 ms depois com a tarefa ja encerrada. Todo o cuidado de progress.c
 * (memoria C fora da VM, lock proprio, cancelamento por fora da fila) era
 * inutil uma camada acima: o gargalo tinha so mudado de lugar.
 *
 * Async devolve a thread do IPC na hora; o trabalho bloqueante vai para o pool.
 * Assim `andamento` e `cancelar` respondem ENQUANTO a tarefa roda, que e a
 * unica razao de eles existirem.
 */
#[tauri::command]
async fn rpc(
    app: tauri::AppHandle,
    metodo: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || rpc_sync(&app, metodo, params))
        .await
        .map_err(|e| format!("tarefa de RPC falhou: {e}"))?
}

fn rpc_sync(
    app: &tauri::AppHandle,
    metodo: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let estado = app.state::<Estado>();
    let hb = estado.hb.lock().unwrap();
    let hb = hb.as_ref().ok_or_else(|| {
        estado
            .erro_carga
            .lock()
            .unwrap()
            .clone()
            .unwrap_or_else(|| "qdbudll.dll nao carregada".to_string())
    })?;

    let id = format!("r{}", PROXIMO_ID.fetch_add(1, Ordering::Relaxed));
    let envelope = serde_json::json!({
        "id": &id,
        "method": &metodo,
        "params": params,
    });

    let t0 = Instant::now();
    let bruto = hb.exec("rpc", &envelope.to_string())?;
    let ms = t0.elapsed().as_secs_f64() * 1000.0;

    if let Some(resto) = bruto.strip_prefix("ERR:") {
        log(&format!("[rpc] {metodo} -> ERR: {resto}"));
        return Err(format!("falha no Harbour ({metodo}): {resto}"));
    }

    let mut resp: serde_json::Value = serde_json::from_str(&bruto)
        .map_err(|e| format!("resposta de {metodo} nao e JSON: {e} -- {bruto}"))?;

    match resp.get("id").and_then(|v| v.as_str()) {
        Some(eco) if eco == id => {}
        outro => {
            log(&format!("[rpc] id divergente: enviei {id}, voltou {outro:?}"));
            return Err(format!(
                "resposta desalinhada em {metodo}: enviei id={id}, voltou {outro:?}"
            ));
        }
    }

    if let Some(obj) = resp.as_object_mut() {
        obj.insert("ms".into(), serde_json::json!(ms));
    }

    Ok(resp)
}

/// Estado de uma tarefa longa. `None` quando nao ha nenhuma.
#[tauri::command]
async fn andamento(estado: State<'_, Estado>) -> Result<Option<qdbudll::Andamento>, String> {
    // Clona o Arc e SOLTA o lock antes de ler: segurar o Mutex durante a
    // leitura reintroduziria a espera que este caminho existe para evitar.
    let p = estado.progresso.lock().unwrap().clone();
    Ok(p.map(|p| p.ler()))
}

/// Pede o cancelamento da tarefa em andamento.
#[tauri::command]
async fn cancelar(estado: State<'_, Estado>) -> Result<bool, String> {
    let p = estado.progresso.lock().unwrap().clone();
    Ok(match p {
        Some(p) => {
            p.cancelar();
            true
        }
        None => false,
    })
}

/// Abre a pasta no Explorer do Windows.
///
/// SEM SHELL NO CAMINHO. `Command::new("explorer").arg(caminho)` entrega o
/// argumento direto ao processo; nao ha interpretador de comandos para tratar
/// `&`, `|` ou aspas de forma criativa. O caminho vem do proprio cadastro de
/// conexoes, mas "vem de dentro" nao e garantia de nada -- o session.json e um
/// arquivo em disco que qualquer um edita.
///
/// A conferencia de que e DIRETORIO nao e paranoia: apontar o explorer para um
/// executavel o EXECUTA. Recusar antes fecha isso sem depender de quem chama.
#[tauri::command]
fn abrir_pasta(caminho: String) -> Result<(), String> {
    let p = PathBuf::from(&caminho);

    if !p.is_dir() {
        return Err(format!("nao e uma pasta: {caminho}"));
    }

    // O explorer devolve codigo 1 mesmo quando abre certo, entao o status nao
    // serve para nada aqui: o que importa e ter conseguido criar o processo.
    std::process::Command::new("explorer")
        .arg(&p)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("nao foi possivel abrir o Explorer: {e}"))
}

// ---------------------------------------------------------------- IA

fn base_config() -> PathBuf {
    raiz_projeto().unwrap_or_else(base_instalado)
}

/// O que o webview pode saber da IA: endpoint, modelo, se ha chave, se o
/// aviso ja foi lido. A chave nunca sai daqui.
#[tauri::command]
fn ia_status() -> ia::StatusIa {
    ia::StatusIa::from(&ia::ler(base_config()))
}

/// Grava endpoint, modelo e chave. Chave vazia MANTEM a que esta: o campo
/// da tela nao mostra a chave (e senha), entao "vazio" significa "nao mexi".
#[tauri::command]
fn ia_configurar(endpoint: String, modelo: String, chave: String, aviso_lido: Option<bool>) -> Result<ia::StatusIa, String> {
    let base = base_config();
    let mut cfg = ia::ler(base.clone());
    cfg.endpoint = endpoint.trim().to_string();
    cfg.modelo = modelo.trim().to_string();
    if chave.trim() == "-" {
        cfg.chave.clear(); // o jeito explicito de APAGAR a chave
    } else if !chave.trim().is_empty() {
        cfg.chave = chave.trim().to_string();
    }
    if let Some(l) = aviso_lido {
        cfg.aviso_lido = l;
    }
    ia::gravar(base, &cfg)?;
    log("[ia] configuracao gravada");
    Ok(ia::StatusIa::from(&cfg))
}

/// Pede uma expressao. `sistema` e o prompt (o .md com os dados ja
/// preenchidos pela UI); `pedido` e o que a pessoa escreveu. Devolve a
/// expressao extraida, ou o motivo -- e a UI decide o que fazer com ela.
#[derive(Serialize)]
struct SugestaoIa {
    expressao: String,
    motivo: String,
    /// A IA nao entendeu e devolve UMA pergunta em vez de chutar -- e a
    /// resposta certa para "clientes inativos importantes".
    pergunta: String,
    bruto: String,
}

#[tauri::command]
async fn ia_sugerir(
    sistema: String,
    pedido: String,
    arquivo: Option<String>,
    uso: Option<String>,
) -> Result<SugestaoIa, String> {
    let cfg = ia::ler(base_config());
    let t0 = std::time::Instant::now();
    let mut e = ia::Entrada {
        q: ia::agora(),
        arq: arquivo.unwrap_or_default(),
        uso: uso.unwrap_or_default(),
        pedido: pedido.clone(),
        expr: String::new(),
        motivo: String::new(),
        pergunta: String::new(),
        erro: String::new(),
        ms: 0,
        tok_in: 0,
        tok_out: 0,
        modelo: ia::StatusIa::from(&cfg).modelo,
    };
    // Sem `?` aqui de proposito: a chamada que FALHOU tambem entra no
    // historico, e o erro do servico e a unica pista de por que nao veio
    // sugestao.
    let r = ia::perguntar(&cfg, &sistema, &pedido).await;
    e.ms = t0.elapsed().as_millis() as u64;
    match r {
        Err(msg) => {
            log(&format!("[ia] falhou em {} ms: {msg}", e.ms));
            e.erro = msg.clone();
            ia::registrar(base_config(), &e);
            Err(msg)
        }
        Ok(resp) => {
            e.tok_in = resp.tok_in;
            e.tok_out = resp.tok_out;
            let bruto = resp.texto;
            log(&format!(
                "[ia] resposta em {} ms, {} bytes, {} tokens ({} + {})",
                e.ms,
                bruto.len(),
                e.tok_in + e.tok_out,
                e.tok_in,
                e.tok_out
            ));
            let v = ia::json_de(&bruto);
            e.expr = ia::campo_de(&v, &["expression", "expressao"]);
            e.motivo = ia::campo_de(&v, &["reason", "motivo"]);
            e.pergunta = ia::campo_de(&v, &["question", "pergunta"]);
            ia::registrar(base_config(), &e);
            Ok(SugestaoIa {
                expressao: e.expr,
                motivo: e.motivo,
                pergunta: e.pergunta,
                bruto,
            })
        }
    }
}

/// As ultimas chamadas, da mais recente para a mais antiga. Sincrono e barato:
/// le de tras para a frente e para no limite, sem tocar na VM do Harbour.
#[tauri::command]
fn ia_historico(limite: Option<usize>) -> Vec<ia::Entrada> {
    ia::historico(base_config(), limite.unwrap_or(100).clamp(1, 500))
}

/// A resposta "Sim" da pergunta de saida.
///
/// Levanta o trinco e manda fechar de novo: o `CloseRequested` volta a
/// disparar, agora passa direto pela pergunta, e o resto do fechamento
/// (gravar a geometria, esperar a tarefa parar) acontece uma vez so, no lugar
/// onde ja estava escrito. `destroy()` aqui pularia tudo isso.
#[tauri::command]
fn confirmar_saida(janela: tauri::Window, estado: State<Estado>) {
    *estado.saida_confirmada.lock().unwrap() = true;
    log("[qdbu] saida confirmada pelo usuario");
    let _ = janela.close();
}

/*
 * NAO HA COMANDO PARA RECARREGAR A DLL, e a ausencia e deliberada.
 *
 * Existia um, herdado da ponte do prototipo (dll-harbour), onde havia o botao
 * "Recarregar DLL". A UI daqui foi escrita do zero e nunca teve esse botao --
 * a funcao ficou sem nenhum chamador.
 *
 * E a premissa nao fecha: com o app aberto, LoadLibrary trava o arquivo e o
 * linker nao consegue sobrescrever (LNK1104). Nunca existe uma DLL nova no
 * disco para recarregar; o fluxo prometido exige fechar o app antes, que e
 * exatamente o que a funcao dizia evitar.
 *
 * Se um dia fizer falta, nao e conserto e sim desenho novo: DOIS comandos,
 * "descarregar" e "carregar", com a imagem fora da memoria entre eles -- so
 * assim o make.bat tem janela para escrever.
 */

/// Como o binario e do subsistema "windows", ele nao herda o console de quem o
/// chamou. Para o `--selftest` continuar util no terminal, anexamos o console do
/// processo pai antes de imprimir. Se nao houver console (duplo clique), a
/// chamada falha silenciosamente e resta o arquivo de log.
#[cfg(windows)]
fn anexar_console_do_pai() {
    extern "system" {
        fn AttachConsole(dwProcessId: u32) -> i32;
    }
    const ATTACH_PARENT_PROCESS: u32 = u32::MAX;
    // SAFETY: chamada sem argumentos de ponteiro; falha e apenas ignorada.
    unsafe {
        AttachConsole(ATTACH_PARENT_PROCESS);
    }
}

/// Imprime no console (quando existe) e sempre grava no arquivo de log.
fn saida(msg: &str) {
    println!("{msg}");
    log(msg);
}

/// Bateria de testes sem GUI: `cargo run -- --selftest`.
/// Serve para validar a ponte FFI em CI ou em maquina sem WebView2.
fn selftest() -> i32 {
    let caminho = achar_dll();
    saida(&format!("DLL   : {}", caminho.display()));
    saida(&format!(
        "app   : {}",
        if cfg!(target_pointer_width = "32") {
            "32-bit (i686) - OK para qdbudll.dll"
        } else {
            "64-bit - INCOMPATIVEL, LoadLibrary vai falhar com erro 193"
        }
    ));
    saida(&format!("log   : {}", caminho_log().display()));

    let hb = match Harbour::iniciar(caminho) {
        Ok(h) => h,
        Err(e) => {
            saida(&format!("FALHOU ao carregar: {e}"));
            return 1;
        }
    };
    saida("HbStart: ok
");

    let mut t = Verificador::novo();

    // --- B0.2/B0.3: a ponte responde ---
    t.igual(
        "meta: Api_Ping ecoa o argumento",
        hb.exec("Api_Meta_Ping", "qdbu").as_deref(),
        Ok("pong:qdbu"),
    );
    t.contem(
        "meta: Api_Version identifica o produto pela grafia oficial",
        hb.exec("Api_Meta_Version", ""),
        "QDbu",
    );
    /*
     * O RDD sai da DLL, e nao de um literal na tela.
     *
     * O diálogo de abrir arquivo mostra este valor. Um literal "DBFNTX" no
     * HTML seria uma segunda verdade -- e no dia em que um segundo RDD for
     * linkado, a que envelheceria calada.
     */
    t.contem(
        "meta: Api_Version diz qual RDD foi linkado",
        hb.exec("Api_Meta_Version", ""),
        "\"rdd\":\"DBFNTX\"",
    );
    t.contem(
        "meta: funcao inexistente vira recusa, nao crash",
        hb.exec("Nao_Existe", ""),
        "ERR:",
    );

    // --- a via crua tem lista fechada (dispatch.prg, PermitidasNaViaCrua) ---
    //
    // Sem estas asercoes a guarda e removivel sem que nada falhe -- foi
    // exatamente esse o apontamento da revisao. Cada caso cobre um motivo de a
    // lista existir, e o ultimo prova que ela nao fechou demais.
    //
    // A ordem importa: `__QUIT` vem PRIMEIRO, e se ele passasse o processo
    // morreria aqui. As asercoes seguintes so chegam a rodar porque ele foi
    // recusado -- o teste de "nao derrubou" e o proprio selftest terminar.
    t.contem(
        "via crua: __QUIT e recusado (derrubaria o processo sem log)",
        hb.exec("__QUIT", ""),
        "ERR:funcao nao liberada",
    );
    t.contem(
        "via crua: OS() e recusado (vazamento de ambiente)",
        hb.exec("OS", ""),
        "ERR:funcao nao liberada",
    );
    // Esta e a que o prefixo `API_` deixaria passar: existe, comeca com `Api_`,
    // ESCREVE ARQUIVO, e esta via nao passa por LogOp(). E o caso que prova por
    // que a guarda e uma lista e nao um prefixo.
    t.contem(
        "via crua: Api_Meta_Copyfile e recusado (escreve em disco, sem log)",
        hb.exec("Api_Meta_Copyfile", "{}"),
        "ERR:funcao nao liberada",
    );
    // Controle no nome: a mensagem de recusa vai para tela e para log, e esta
    // via nao passa por ConvertDeep(). Sanea() apara antes de ecoar. Byte
    // INVALIDO em UTF-8 nao cabe num &str -- esse caso so o cliente C consegue
    // montar, e esta em tests/testload.c.
    let sujo = format!("Api_{}{}Zzz", char::from(1u8), char::from(127u8));
    t.contem(
        "via crua: nome com caractere de controle volta saneado",
        hb.exec(&sujo, ""),
        "ERR:funcao nao liberada",
    );
    t.ok(
        "via crua: o eco da recusa nao carrega o controle de volta",
        !hb.exec(&sujo, "").unwrap_or_default().contains(char::from(1u8)),
        "o caractere 0x01 atravessou Sanea()",
    );
    // A lista nao pode ter fechado demais: as tres liberadas continuam vivas.
    // (Ping e Version ja foram exercitadas acima; falta Echo.)
    t.igual(
        "via crua: Api_Meta_Echo continua liberado",
        hb.exec("Api_Meta_Echo", "ok").as_deref(),
        Ok("ok"),
    );

    // --- protocolo de buffer: a resposta cresce alem do buffer inicial ---
    let grande = "x".repeat(30_000);
    match hb.exec("Api_Meta_Echo", &grande) {
        Ok(r) => t.ok(
            "ponte: 30000 bytes atravessam com realocacao",
            r.len() == 30_000,
            &format!("voltaram {} bytes", r.len()),
        ),
        Err(e) => t.ok("ponte: 30000 bytes atravessam com realocacao", false, &e),
    }

    // --- B0.5: UTF-8 estrito no caminho feliz ---
    let acentos = "JOÃƒO Ã‡ÃƒO Ã‚NGULO ÃœBER Ã±";
    t.igual(
        "codepage: acentos sobrevivem ao round-trip UTF-8",
        hb.exec("Api_Meta_Echo", acentos).as_deref(),
        Ok(acentos),
    );


    // --- renomeacao para QDbu: a config antiga tem de sobreviver ---
    //
    // O que esta em jogo nao e o nome da pasta: e o LOG DE ALTERACOES. Ele
    // responde "o que este programa fez com o meu arquivo?", e uma resposta que
    // some porque o produto trocou de nome e pior do que nunca ter existido --
    // ninguem procura o que nao sabe que sumiu.
    //
    // Roda num diretorio descartavel dentro de `.run/`, e nao sobre a raiz de
    // verdade: a migracao real acontece UMA vez, entao um teste sobre ela
    // passaria na primeira execucao e ficaria inerte depois.
    {
        let campo = dir_run().join("selftest_migra");
        let _ = std::fs::remove_dir_all(&campo);

        // 1. nada a migrar (instalacao nova)
        let _ = std::fs::create_dir_all(&campo);
        t.ok(
            "migracao: sem .dbu, nao faz nada",
            migra_config_em(&campo) == Migracao::NadaAMigrar,
            "esperava NadaAMigrar num diretorio vazio",
        );

        // 2. o caso real: .dbu com conteudo, .qdbu ausente
        let antiga = campo.join(".dbu");
        let _ = std::fs::create_dir_all(antiga.join("log"));
        let _ = std::fs::write(antiga.join("log").join("20260903.jsonl"), b"{\"m\":\"bulk.pack\"}\n");
        let _ = std::fs::write(antiga.join("connections.json"), b"[]");

        let r = migra_config_em(&campo);
        let nova = campo.join(".qdbu");
        t.ok(
            "migracao: .dbu vira .qdbu",
            r == Migracao::Migrou && nova.is_dir() && !antiga.exists(),
            &format!("resultado {r:?}, .qdbu={} .dbu={}", nova.is_dir(), antiga.exists()),
        );
        // O que importa nao e a pasta ter sido criada, e o CONTEUDO ter chegado.
        let linha = std::fs::read_to_string(nova.join("log").join("20260903.jsonl")).unwrap_or_default();
        t.ok(
            "migracao: o log de alteracoes atravessa intacto",
            linha.contains("bulk.pack") && nova.join("connections.json").is_file(),
            &format!("log lido: {linha:?}"),
        );

        // 3. idempotente: rodar de novo nao mexe no que ja esta la
        let _ = std::fs::create_dir_all(campo.join(".dbu"));
        let _ = std::fs::write(campo.join(".dbu").join("intruso.json"), b"nao devia vencer");
        let r2 = migra_config_em(&campo);
        let ainda = std::fs::read_to_string(nova.join("log").join("20260903.jsonl")).unwrap_or_default();
        t.ok(
            "migracao: com .qdbu ja existente, nao sobrescreve",
            r2 == Migracao::JaExistia && ainda.contains("bulk.pack")
                && !nova.join("intruso.json").exists(),
            &format!("resultado {r2:?}"),
        );

        let _ = std::fs::remove_dir_all(&campo);
    }

    // --- B15.1: o log registra o que foi feito, inclusive o recusado ---
    //
    // A ida a DLL e por envelope, e nao por `Api_Log_Read` direto: o gancho que
    // grava a linha mora no dispatcher, entao chamar a funcao pelo nome pularia
    // exatamente o que esta sob teste.
    //
    // A prova e uma RECUSA de proposito, e por `export.csv`: so entram no log as
    // operacoes que mudam bytes em disco, entao `file.open` (que seria o teste
    // obvio) nao serve mais. O handle inexistente e recusado por SessSelect()
    // antes de qualquer arquivo ser criado -- exercita o gancho inteiro sem
    // deixar nada para tras.
    let alvo = "Z:/nao/existe/selftest.csv";
    let _ = rpc_bruto(
        &hb,
        "export.csv",
        &format!(r#"{{"h":"h_selftest_inexistente","path":"{alvo}"}}"#),
    );

    // O dia vem de `log.days`, e nao de um relogio do lado Rust: quem nomeia o
    // arquivo e o Harbour, e uma virada de meia-noite entre as duas chamadas
    // faria o teste falhar por um motivo que nao e o testado.
    let dia = rpc_bruto(&hb, "log.days", "{}")
        .ok()
        .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
        .and_then(|v| {
            v.pointer("/result/days/0/dia")
                .and_then(|d| d.as_str())
                .map(str::to_string)
        })
        .unwrap_or_default();

    match rpc_bruto(
        &hb,
        "log.read",
        &format!(r#"{{"day":"{dia}","filter":"selftest.csv"}}"#),
    ) {
        Ok(r) => {
            // Sem `day`, `log.read` le o dia de hoje -- que e onde a linha acima
            // acabou de cair.
            let tem_codigo = r.contains("ERROR_INVALID_HANDLE");
            // `ep` sao os parametros DA RECUSA. Sem eles o visualizador mostra a
            // frase com o {file} por preencher, que foi o defeito da T17.
            let tem_params = r.contains("\"ep\"");
            t.ok(
                "log: a recusa entrou no registro do dia",
                tem_codigo,
                &format!("esperava ERROR_INVALID_HANDLE em {r}"),
            );
            t.ok(
                "log: a linha leva os parametros da recusa (ep)",
                tem_params,
                &format!("esperava a chave \"ep\" em {r}"),
            );
        }
        Err(e) => {
            t.ok("log: a recusa entrou no registro do dia", false, &e);
            t.ok("log: a linha leva os parametros da recusa (ep)", false, &e);
        }
    }

    // --- B11 + i18n do rotulo: a maquinaria de tarefa longa ---
    //
    // Possivel gracas a meta.slowjob. As operacoes reais desta base sao rapidas
    // demais para observar a barra: contar 421.714 registros leva 40 ms e criar
    // o indice sobre eles leva 95 ms, ambos abaixo do pulso de 120 ms da UI.
    // Sem uma tarefa lenta de mentira, progresso e cancelamento so podiam ser
    // testados fabricando um arquivo gigante.
    if let Some(prog) = hb.progresso() {
        let prog = std::sync::Arc::new(prog);

        // O cancelamento vem de OUTRA thread, que e o unico jeito que existe: a
        // thread da VM esta dentro do laco e nao volta para atender ninguem.
        // HbCancel nao entra na fila justamente por isso (ver progress.c).
        let cancelador = std::sync::Arc::clone(&prog);
        let vigia = std::thread::spawn(move || {
            let mut rotulo = String::new();
            for _ in 0..400 {
                let a = cancelador.ler();
                if a.ativo {
                    if rotulo.is_empty() {
                        rotulo = a.mensagem.clone();
                    }
                    if a.atual >= 3 {
                        cancelador.cancelar();
                        return (rotulo, a.atual, a.total);
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            (rotulo, 0, 0)
        });

        let resp = rpc_bruto(&hb, "meta.slowjob", r#"{"seconds":8,"steps":80}"#);
        let (rotulo, visto, total) = vigia.join().unwrap_or_default();

        match resp {
            Ok(r) => {
                t.ok(
                    "tarefa: cancelamento de outra thread interrompe o laco",
                    r.contains("\"canceled\":true") || r.contains("\"canceled\": true"),
                    &format!("esperava canceled:true em {r}"),
                );
                t.ok(
                    "tarefa: parou muito antes do fim (nao esperou os 8 s)",
                    visto > 0 && total > 0 && visto < total / 2,
                    &format!("parou em {visto} de {total}"),
                );
            }
            Err(e) => {
                t.ok("tarefa: cancelamento de outra thread interrompe o laco", false, &e);
                t.ok("tarefa: parou muito antes do fim (nao esperou os 8 s)", false, &e);
            }
        }

        // O rotulo viaja como CODIGO, nao como frase pronta -- se voltar a ser
        // frase, a barra fica em portugues em qualquer idioma. Ver
        // src/util/job.prg.
        t.ok(
            "tarefa: o rotulo viaja como codigo de traducao, nao como frase",
            rotulo.contains("\"c\":\"UI_JOB_"),
            &format!("esperava {{\"c\":\"UI_JOB_...\"}}, veio {rotulo:?}"),
        );
    } else {
        saida("  --   tarefa: DLL sem HbProgressGet/HbCancel, pulando");
    }

    // --- TA: pre-voo e religar estado ---
    //
    // Roda contra uma fixture do proprio repositorio, e nao contra J:\bases: o
    // selftest precisa funcionar em maquina limpa, e a base de homologacao nao
    // vai junto (nem poderia).
    // O caminho sai de `raiz_projeto()`, e NAO de `achar_dll()`. Derivar da DLL
    // funcionava enquanto ela morava sempre em `<raiz>/bin/`; com o `resources`
    // do tauri.conf.json a DLL escolhida pode ser a copia em `target/...`, e o
    // caminho derivado dela nao existe -- o teste passava a ser PULADO em
    // silencio, que e pior do que falhar.
    let fixture = raiz_projeto()
        .map(|raiz| raiz.join("tests").join("fixtures").join("TIPOS.DBF"))
        .filter(|p| p.exists());

    if let Some(dbf) = fixture {
        let caminho = dbf.to_string_lossy().replace('\\', "/");
        let aberto = rpc_bruto(&hb, "file.open", &format!(r#"{{"path":"{caminho}"}}"#))
            .ok()
            .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());

        let h = aberto
            .as_ref()
            .and_then(|v| v.pointer("/result/h"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if h.is_empty() {
            t.ok("TA: abrir a fixture para o pre-voo", false, "file.open nao devolveu handle");
        } else {
            // --- o checklist responde, e nao toca em nada ---
            match rpc_bruto(&hb, "backup.check", &format!(r#"{{"h":"{h}"}}"#)) {
                Ok(r) => {
                    t.ok(
                        "TA: o checklist responde com niveis e um veredito",
                        r.contains("\"level\"") && r.contains("\"canProceed\""),
                        &format!("esperava level e canProceed em {r}"),
                    );
                    let v: serde_json::Value =
                        serde_json::from_str(&r).unwrap_or(serde_json::Value::Null);
                    let bytes = v.pointer("/result/bytes").and_then(|x| x.as_i64());
                    let preciso = v.pointer("/result/neededBytes").and_then(|x| x.as_i64());

                    // 2x, e nao 3x: o ORIGINAL ja ocupa o espaco dele e portanto
                    // nao esta no livre. O que nasce e o backup (1x) mais o .tmp
                    // que a R2 exige (1x). A primeira versao pedia 3x com uma
                    // justificativa aritmeticamente errada.
                    t.ok(
                        "TA: pre-voo no mesmo volume exige 2x o conjunto",
                        matches!((bytes, preciso), (Some(b), Some(n)) if b > 0 && n == b * 2),
                        &format!("bytes={bytes:?}, neededBytes={preciso:?}"),
                    );

                    // O memo entra (e DADO, insubstituivel); o indice nao (e
                    // derivado, e restaurar um .ntx velho e pior que nao ter).
                    t.ok(
                        "TA: o conjunto leva o memo e nao leva indice",
                        r.contains("\"role\":\"memo\"") && !r.contains("\"role\":\"index\""),
                        &format!("esperava memo sem index em {r}"),
                    );
                }
                Err(e) => {
                    t.ok("TA: o checklist responde com niveis e um veredito", false, &e);
                    t.ok("TA: pre-voo no mesmo volume exige 2x o conjunto", false, &e);
                    t.ok("TA: o conjunto leva o memo e nao leva indice", false, &e);
                }
            }

            // --- desligar -> operar -> religar, nas DUAS formas ---
            //
            // A comparacao acontece dentro da DLL de proposito: `data.page` MOVE
            // o ponteiro de registro, entao sondar de fora mede o proprio
            // instrumento. A primeira versao deste teste acusava o cursor
            // "mudando" de 25 para 26 quando quem o movera fora a sonda.
            for (fecha, nome) in [
                (false, "TA: religar preserva o ambiente (caminho PACK/ZAP)"),
                (true, "TA: religar preserva o ambiente (caminho estrutura)"),
            ] {
                let corpo = format!(r#"{{"h":"{h}","close":{fecha}}}"#);
                match rpc_bruto(&hb, "meta.rebindtest", &corpo) {
                    Ok(r) => t.ok(
                        nome,
                        r.contains("\"restored\":true"),
                        &format!("esperava restored:true em {r}"),
                    ),
                    Err(e) => t.ok(nome, false, &e),
                }
            }


        // --- R5: o PACK tem de deixar o INDICE valido, nao so o cursor ---
        //
        // O rebindtest acima prova que ordem, filtro e cursor voltam. Nao provava
        // o que o indice PASSOU A DESCREVER -- e era ali que estava o defeito:
        // `__dbPack()` rodava numa area exclusiva aberta sem ordem nenhuma, entao
        // nao reconstruia nada, e `Religar()` reanexava um .NTX do arquivo de
        // antes. Medido em 03/09/2026: 7 registros com 1 marcado viravam 6 na
        // ordem fisica e 3 na ordem indexada. Nenhum erro em lugar nenhum.
        //
        // Roda sobre uma COPIA em `.run/`: o PACK e destrutivo e a fixture tem de
        // sobreviver para a proxima execucao. A contagem sai de `data.page` com
        // uma pagina grande o bastante para caber o arquivo inteiro -- e a
        // travessia respeita a ordem ativa, que e exatamente o que esta sob teste.
        let copia = dir_run().join("selftest_pack.dbf");
        let copia_s = copia.to_string_lossy().replace('\\', "/");
        let origem_s = dbf.to_string_lossy().replace('\\', "/");
        let memo_orig = dbf.with_extension("dbt");
        let memo_copia = copia.with_extension("dbt");

        let _ = std::fs::remove_file(&copia);
        let _ = std::fs::remove_file(&memo_copia);
        let copiou = rpc_bruto(
            &hb,
            "meta.copyfile",
            // `shared`: o bloco TA acima ainda tem a fixture aberta nesta mesma
            // VM, e a leitura exclusiva do copiador esbarraria nela.
            &format!(r#"{{"source":"{origem_s}","dest":"{copia_s}","shared":true}}"#),
        )
        .map(|r| r.contains("\"ok\":true"))
        .unwrap_or(false);
        // O memo anda junto: sem ele o arquivo abre, mas ler o campo M falha.
        if memo_orig.exists() {
            let _ = std::fs::copy(&memo_orig, &memo_copia);
        }

        if copiou {
            let h2 = rpc_bruto(&hb, "file.open", &format!(r#"{{"path":"{copia_s}"}}"#))
                .ok()
                .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                .as_ref()
                .and_then(|v| v.pointer("/result/h"))
                .and_then(|v| v.as_str())
                .map(str::to_string);

            if let Some(h2) = h2 {
                let ntx = dir_run().join("selftest_pack.ntx");
                let ntx_s = ntx.to_string_lossy().replace('\\', "/");
                let _ = std::fs::remove_file(&ntx);

                let criou = rpc_bruto(
                    &hb,
                    "index.create",
                    &format!(r#"{{"h":"{h2}","key":"TXT","path":"{ntx_s}"}}"#),
                )
                .map(|r| r.contains("\"ok\":true"))
                .unwrap_or(false);

                // `n` conta as linhas que a travessia devolve -- pela ordem ativa.
                // `anchor`/`count`, e nao `from`/`size`: Api_Data_Page le esses
                // dois nomes e ignora quaisquer outros -- com os errados a
                // travessia caia no padrao (100 linhas) sem dizer nada, e um
                // indice que perdesse registros depois da centesima passaria
                // batido pela afirmacao que existe justamente para pega-lo.
                let conta = |h: &str| -> usize {
                    rpc_bruto(
                        &hb,
                        "data.page",
                        &format!(r#"{{"h":"{h}","anchor":"top","count":500}}"#),
                    )
                    .ok()
                    .map(|r| r.matches("\"recno\"").count())
                    .unwrap_or(0)
                };

                // O TESTE MARCA O PROPRIO REGISTRO, em vez de contar com a
                // fixture ter um. Depender do estado do arquivo em disco fez
                // este teste falhar por motivo errado assim que um PACK feito
                // pela UI consumiu o unico registro marcado da fixture: dizia
                // "removed:0" e acusava a correcao, que estava intacta. Marcar
                // aqui deixa o teste dizer respeito so ao que ele afirma.
                //
                // O escopo e `all` com um `for` sobre o RecNo, e nao
                // `next n:1`: `conta()` usa `data.page`, que MOVE O PONTEIRO e
                // para depois da ultima linha (o guia do projeto, e o mesmo tropeco da
                // primeira versao do rebindtest). Um `next` logo apos a
                // contagem parte do EOF e nao marca nada -- foi o que
                // aconteceu, e o sintoma foi de novo "removed:0".
                let antes = conta(&h2);
                let marcou = rpc_bruto(
                    &hb,
                    "mass.delete",
                    &format!(r#"{{"h":"{h2}","scope":{{"mode":"all","for":"RecNo()==1"}}}}"#),
                )
                .map(|r| r.contains("\"ok\":true"))
                .unwrap_or(false);
                let pack = rpc_bruto(&hb, "bulk.pack", &format!(r#"{{"h":"{h2}","backup":false}}"#));
                let depois = conta(&h2);

                t.ok(
                    "R5: marcar um registro para exclusao antes do PACK",
                    marcou,
                    "mass.delete recusou sobre a copia",
                );

                t.ok(
                    "R5: o indice sobrevive ao PACK (criar o indice)",
                    criou,
                    "index.create recusou sobre a copia",
                );
                // Quantos o PACK dis que tirou -- e nao um numero fixo.
                //
                // `data.page` DEVOLVE os marcados (a grade os mostra riscados),
                // entao `antes` conta o arquivo inteiro. Fixar "removed:1"
                // amarrava o teste a fixture nao trazer nenhum marcado de
                // fabrica: com o marcado que ela ja tem, o PACK tira DOIS e a
                // conta batia errado. O teste voltava a falhar por motivo
                // errado -- a terceira vez que este mesmo teste dependeu de
                // estado que nao e dele.
                let removidos = pack
                    .as_deref()
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(r).ok())
                    .and_then(|v| v.pointer("/result/removed").and_then(|n| n.as_u64()))
                    .unwrap_or(0) as usize;

                t.ok(
                    "R5: PACK removeu pelo menos o registro marcado",
                    removidos >= 1,
                    &format!("esperava removed >= 1 em {pack:?}"),
                );
                // O nucleo: a travessia INDEXADA depois do PACK tem de ver todos
                // os registros que sobraram -- nem um a menos. Antes da correcao
                // dava 3 de 6, porque o .NTX reanexado descrevia o arquivo velho.
                t.ok(
                    "R5: a ordem indexada ve todos os registros depois do PACK",
                    // `saturating_sub` como na mensagem: `antes` vem de
                    // `conta()`, que devolve 0 quando o rpc falha. Com a
                    // subtracao crua um data.page recusado fazia o --selftest
                    // ABORTAR ("attempt to subtract with overflow") em vez de
                    // imprimir qual afirmacao caiu.
                    removidos >= 1 && depois == antes.saturating_sub(removidos) && depois > 0,
                    &format!("antes {antes}, removidos {removidos}, depois {depois} (esperado {})",
                             antes.saturating_sub(removidos)),
                );

                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{h2}"}}"#));
                let _ = std::fs::remove_file(&ntx);
            } else {
                t.ok("R5: o indice sobrevive ao PACK", false, "file.open da copia falhou");
            }
            let _ = std::fs::remove_file(&copia);
            let _ = std::fs::remove_file(&memo_copia);

        // --- T8: escrita registro a registro ---
        //
        // Sobre uma COPIA da fixture: T8 grava de verdade, e a fixture tem de
        // sobreviver para a proxima execucao. Mesma razao (e mesmo molde) do
        // bloco R5 acima.
        //
        // O que estas asercoes protegem nao e "gravou": e o CONTRARIO --
        // que valor que nao cabe no tipo seja RECUSADO em vez de coagido. Um
        // update que aceita tudo passa em qualquer teste de "gravou" e corrompe
        // o arquivo do cliente em silencio, que e exatamente o modo de falha
        // que o filtro guiado ja teve uma vez.
        let ed = dir_run().join("selftest_t8.dbf");
        let ed_s = ed.to_string_lossy().replace('\\', "/");
        let ed_memo = ed.with_extension("dbt");
        let _ = std::fs::remove_file(&ed);
        let _ = std::fs::remove_file(&ed_memo);

        let copiou = rpc_bruto(
            &hb,
            "meta.copyfile",
            &format!(r#"{{"source":"{origem_s}","dest":"{ed_s}","shared":true}}"#),
        )
        .map(|r| r.contains("\"ok\":true"))
        .unwrap_or(false);
        if memo_orig.exists() {
            let _ = std::fs::copy(&memo_orig, &ed_memo);
        }

        if copiou {
            let h3 = rpc_bruto(&hb, "file.open", &format!(r#"{{"path":"{ed_s}"}}"#))
                .ok()
                .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                .as_ref()
                .and_then(|v| v.pointer("/result/h"))
                .and_then(|v| v.as_str())
                .map(str::to_string);

            if let Some(h3) = h3 {
                let up = |corpo: String| rpc_bruto(&hb, "data.update", &corpo);

                // --- o caminho feliz, e a prova de que a resposta traz o FATO ---
                let r = up(format!(
                    r#"{{"h":"{h3}","recno":1,"values":{{"TXT":"EDITADO","INT":77}}}}"#
                ));
                t.ok(
                    "T8: update grava e devolve a linha relida do arquivo",
                    r.as_deref()
                        .map(|s| s.contains("\"ok\":true") && s.contains("EDITADO") && s.contains("77"))
                        .unwrap_or(false),
                    &format!("{r:?}"),
                );

                // --- as recusas. Cada uma e um jeito conhecido de corromper ---
                //
                // TXT e C(40): 60 caracteres seriam truncados pelo RDD sem dizer
                // nada, e os 20 perdidos so apareceriam no dia em que alguem
                // conferisse o cadastro.
                let r = up(format!(
                    r#"{{"h":"{h3}","values":{{"TXT":"{}"}},"recno":1}}"#,
                    "X".repeat(60)
                ));
                t.ok(
                    "T8: texto maior que o campo e RECUSADO, nao truncado",
                    r.as_deref().map(|s| s.contains("ERROR_CELL_TOO_LONG")).unwrap_or(false),
                    &format!("{r:?}"),
                );

                // `Val("abc")` e 0, e zero e um valor plausivel: sem a checagem
                // de caracteres isto gravaria zero e ninguem notaria.
                let r = up(format!(r#"{{"h":"{h3}","recno":1,"values":{{"INT":"abc"}}}}"#));
                t.ok(
                    "T8: texto nao numerico em campo N e RECUSADO, nao vira zero",
                    r.as_deref().map(|s| s.contains("ERROR_CELL_NOT_NUMBER")).unwrap_or(false),
                    &format!("{r:?}"),
                );

                // C2Date devolve data VAZIA para o que nao entende. Numa celula
                // isso apagaria a data que estava la.
                let r = up(format!(r#"{{"h":"{h3}","recno":1,"values":{{"DATA":"31/02/2026"}}}}"#));
                t.ok(
                    "T8: data impossivel e RECUSADA, nao vira data vazia",
                    r.as_deref().map(|s| s.contains("ERROR_CELL_NOT_DATE")).unwrap_or(false),
                    &format!("{r:?}"),
                );

                let r = up(format!(r#"{{"h":"{h3}","recno":1,"values":{{"NAO_EXISTE":"x"}}}}"#));
                t.ok(
                    "T8: campo inexistente e recusado",
                    r.as_deref().map(|s| s.contains("ERROR_FIELD_NOT_FOUND")).unwrap_or(false),
                    &format!("{r:?}"),
                );

                let r = up(format!(r#"{{"h":"{h3}","recno":99999,"values":{{"TXT":"x"}}}}"#));
                t.ok(
                    "T8: registro fora da faixa e recusado (dbGoTo iria para EOF)",
                    r.as_deref().map(|s| s.contains("ERROR_RECORD_OUT_OF_RANGE")).unwrap_or(false),
                    &format!("{r:?}"),
                );

                // --- TUDO OU NADA ---
                //
                // A asercao que justifica validar antes de gravar: com um campo
                // bom e um ruim no mesmo lote, o bom NAO pode ter sido gravado.
                let _ = up(format!(r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"ANTES"}}}}"#));
                let r = up(format!(
                    r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"DEPOIS","INT":"lixo"}}}}"#
                ));
                let leu = rpc_bruto(&hb, "data.page", &format!(r#"{{"h":"{h3}","anchor":2,"count":1}}"#));
                t.ok(
                    "T8: lote com um campo invalido nao grava NENHUM",
                    r.as_deref().map(|s| s.contains("\"ok\":false")).unwrap_or(false)
                        && leu.as_deref().map(|s| s.contains("ANTES") && !s.contains("DEPOIS")).unwrap_or(false),
                    &format!("update {r:?} / leitura {leu:?}"),
                );

                // --- append ---
                let antes_n = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/records").and_then(|n| n.as_u64()))
                    .unwrap_or(0);
                let r = rpc_bruto(&hb, "data.append", &format!(r#"{{"h":"{h3}","values":{{"TXT":"NOVO"}}}}"#));
                let depois_n = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/records").and_then(|n| n.as_u64()))
                    .unwrap_or(0);
                t.ok(
                    "T8: append cria o registro e o arquivo cresce em um",
                    r.as_deref().map(|s| s.contains("\"ok\":true") && s.contains("NOVO")).unwrap_or(false)
                        && depois_n == antes_n + 1,
                    &format!("antes {antes_n}, depois {depois_n}, {r:?}"),
                );

                // --- delete / recall: MARCA, e por isso andam em par ---
                let novo_rec = depois_n;
                let rd = rpc_bruto(&hb, "data.delete", &format!(r#"{{"h":"{h3}","recno":{novo_rec}}}"#));
                t.ok(
                    "T8: delete marca o registro",
                    rd.as_deref().map(|s| s.contains("\"deleted\":true")).unwrap_or(false),
                    &format!("{rd:?}"),
                );
                let rr = rpc_bruto(&hb, "data.recall", &format!(r#"{{"h":"{h3}","recno":{novo_rec}}}"#));
                t.ok(
                    "T8: recall desmarca -- o registro nunca saiu do arquivo",
                    rr.as_deref().map(|s| s.contains("\"deleted\":false")).unwrap_or(false),
                    &format!("{rr:?}"),
                );

                // --- memo: grava por data.update, le pelo raw de data.record ---
                //
                // Nao ha `data.memo`: saiu em 04/09/2026, quando o data.record
                // passou a trazer o texto do memo em `raw` (R8). Um metodo que
                // ninguem chama e um caminho que envelhece sem ninguem ver.
                let rm = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":1,"values":{{"OBS":"memo escrito pela T8"}}}}"#));
                let rl = rpc_bruto(&hb, "data.record",
                    &format!(r#"{{"h":"{h3}","recno":1}}"#));
                t.ok(
                    "T8: memo grava por data.update e volta no raw de data.record",
                    rm.as_deref().map(|s| s.contains("\"ok\":true")).unwrap_or(false)
                        && rl.as_deref().map(|s| s.contains("\"OBS\":\"memo escrito pela T8\"")).unwrap_or(false),
                    &format!("grava {rm:?} / le {rl:?}"),
                );
                let rn = rpc_bruto(&hb, "data.memo",
                    &format!(r#"{{"h":"{h3}","recno":1,"field":"OBS"}}"#));
                t.ok(
                    "T8: data.memo NAO existe mais (metodo desconhecido)",
                    rn.as_deref().map(|s| s.contains("ERROR_UNKNOWN_METHOD")).unwrap_or(false),
                    &format!("{rn:?}"),
                );

                // --- o log ---
                //
                // A regra do projeto e que operacao que escreve entra no log no
                // mesmo commit em que nasce. Aqui ela vira asercao: a leitura de
                // memo NAO pode aparecer, e as escritas TEM de aparecer.
                // `days` e uma lista de objetos ({dia, bytes, arquivo}), nao de
                // strings -- e o dia mais recente vem primeiro.
                let hoje = rpc_bruto(&hb, "log.days", "{}")
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/days/0/dia").and_then(|d| d.as_str().map(str::to_string)))
                    .unwrap_or_default();
                // Filtra pelo nome da copia: o log do dia tem tudo o que este
                // selftest fez, e sem o filtro as linhas da T8 poderiam ficar
                // fora do teto de `max`.
                let linhas = rpc_bruto(
                    &hb,
                    "log.read",
                    &format!(r#"{{"day":"{hoje}","filter":"selftest_t8","max":500}}"#),
                )
                .unwrap_or_default();
                t.ok(
                    "T8: as quatro escritas entraram no log de alteracoes",
                    linhas.contains("data.update")
                        && linhas.contains("data.append")
                        && linhas.contains("data.delete")
                        && linhas.contains("data.recall"),
                    "faltou alguma das quatro no log do dia",
                );
                t.ok(
                    "T8: ler um registro (data.record) NAO gera linha de log",
                    !linhas.contains("data.record"),
                    "data.record apareceu no log -- ele so le, nao muda bytes",
                );

                // --- T9: o que o formulario assume de `data.page` ---
                //
                // O formulario navega por `data.page` com `count: 1` e `fields`
                // explicito. Duas propriedades sustentam isso, e a segunda me
                // surpreceu ao testar a UI -- por isso viram asercao aqui, e nao
                // ficam so no comentario de navegarForm().
                let uma = rpc_bruto(
                    &hb,
                    "data.page",
                    &format!(r#"{{"h":"{h3}","anchor":1,"count":1,"fields":["TXT","OBS"]}}"#),
                );
                t.ok(
                    "T9: `fields` explicito traz os campos pedidos, fora da selecao do handle",
                    uma.as_deref()
                        .map(|s| s.contains("\"TXT\"") && s.contains("\"OBS\""))
                        .unwrap_or(false),
                    &format!("{uma:?}"),
                );

                // NO FIM DO ARQUIVO, `offset: 1` DEVOLVE O PROPRIO ULTIMO
                // REGISTRO com `eof: true` -- `dbSkip(1)` em EOF nao sai do
                // lugar. Quem detectar o limite por `rows.length == 0` nunca vai
                // detecta-lo: foi assim que o botao "proximo" do formulario
                // ficou mudo no fim do arquivo. O que denuncia o limite e o
                // recno NAO TER MUDADO.
                let total = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/records").and_then(|n| n.as_u64()))
                    .unwrap_or(0);
                let alem = rpc_bruto(
                    &hb,
                    "data.page",
                    &format!(r#"{{"h":"{h3}","anchor":{total},"offset":1,"count":1}}"#),
                );
                let mesmo = alem
                    .as_deref()
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(r).ok())
                    .and_then(|v| v.pointer("/result/rows/0/recno").and_then(|n| n.as_u64()));
                t.ok(
                    "T9: passar do ultimo devolve o MESMO registro, nao uma pagina vazia",
                    mesmo == Some(total),
                    &format!("ultimo {total}, voltou {mesmo:?} -- {alem:?}"),
                );


                // --- R8: o que se edita tem de ser o que esta no disco ---
                //
                // as regras de integridade, R8. As oito asercoes abaixo sao o
                // contrato do `expect`; cada uma fecha um risco listado no
                // plano. Rodam sobre a mesma copia descartavel da T8 (h3).
                let rec = |n: u64| {
                    rpc_bruto(&hb, "data.record", &format!(r#"{{"h":"{h3}","recno":{n}}}"#))
                        .ok()
                        .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                };
                let raw_de = |v: &serde_json::Value, campo: &str| -> String {
                    v.pointer(&format!("/result/raw/{campo}"))
                        .and_then(|x| x.as_str())
                        .unwrap_or("")
                        .to_string()
                };

                // 1. data.record devolve row + raw e NAO move o ponteiro
                let antes_ptr = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/recno").and_then(|n| n.as_u64()));
                let r1 = rec(2);
                let depois_ptr = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/recno").and_then(|n| n.as_u64()));
                t.ok(
                    "R8: data.record devolve row e raw, e deixa o ponteiro no registro lido",
                    r1.as_ref().map(|v| v.pointer("/result/row/recno").is_some()
                        && v.pointer("/result/raw/TXT").is_some()).unwrap_or(false)
                        && depois_ptr == Some(2),
                    &format!("ptr antes {antes_ptr:?} depois {depois_ptr:?}; {r1:?}"),
                );

                // 2. expect correto grava
                let raw_txt = r1.as_ref().map(|v| raw_de(v, "TXT")).unwrap_or_default();
                let r2 = rpc_bruto(&hb, "data.update", &format!(
                    r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"COM EXPECT"}},"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_txt).unwrap()
                ));
                t.ok(
                    "R8: update com expect igual ao disco grava",
                    r2.as_deref().map(|s| s.contains("\"ok\":true") && s.contains("COM EXPECT")).unwrap_or(false),
                    &format!("{r2:?}"),
                );

                // 3. expect velho (o de antes da gravacao acima) e RECUSADO, com actual
                let r3 = rpc_bruto(&hb, "data.update", &format!(
                    r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"NAO PODE"}},"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_txt).unwrap()
                ));
                let leu3 = rec(2).map(|v| v.pointer("/result/row/values/0").cloned()).flatten();
                t.ok(
                    "R8: expect desatualizado e recusado com ERROR_STALE_VALUE e o valor atual",
                    r3.as_deref().map(|s| s.contains("ERROR_STALE_VALUE")
                        && s.contains("\"actual\":\"COM EXPECT\"")).unwrap_or(false)
                        && leu3 == Some(serde_json::json!("COM EXPECT")),
                    &format!("{r3:?} / disco {leu3:?}"),
                );

                // 4. sem expect grava (compatibilidade: append em branco, adocao gradual)
                let r4 = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"SEM EXPECT"}}}}"#));
                t.ok(
                    "R8: update sem expect continua gravando",
                    r4.as_deref().map(|s| s.contains("\"ok\":true")).unwrap_or(false),
                    &format!("{r4:?}"),
                );

                // 5. raw DISTINGUE o que FieldGet achata: nunca-preenchido x zero x overflow
                //
                // E a razao de o expect ser bytes. Um registro novo nasce com
                // espacos no campo N; gravar 0 muda os bytes e nao o valor lido.
                let novo = rpc_bruto(&hb, "data.append", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                    .and_then(|v| v.pointer("/result/recno").and_then(|n| n.as_u64()))
                    .unwrap_or(0);
                let raw_branco = rec(novo).map(|v| raw_de(&v, "INT")).unwrap_or_default();
                let _ = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":{novo},"values":{{"INT":0}}}}"#));
                let depois_zero = rec(novo);
                let raw_zero = depois_zero.as_ref().map(|v| raw_de(v, "INT")).unwrap_or_default();
                let valor_zero = depois_zero.as_ref()
                    .and_then(|v| v.pointer("/result/row/values/4").cloned());
                t.ok(
                    "R8: raw distingue 'nunca preenchido' de 'zero' -- FieldGet nao",
                    raw_branco.trim().is_empty() && raw_zero.trim() == "0" && raw_branco != raw_zero
                        && valor_zero == Some(serde_json::json!(0)),
                    &format!("branco {raw_branco:?} zero {raw_zero:?} valor {valor_zero:?}"),
                );

                // 6. memo: expect por TEXTO detecta mudanca dentro do mesmo bloco
                let _ = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":1,"values":{{"OBS":"memo A"}}}}"#));
                let raw_memo = rec(1).map(|v| raw_de(&v, "OBS")).unwrap_or_default();
                let _ = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":1,"values":{{"OBS":"memo B"}}}}"#));
                let r6 = rpc_bruto(&hb, "data.update", &format!(
                    r#"{{"h":"{h3}","recno":1,"values":{{"OBS":"memo C"}},"expect":{{"OBS":{}}}}}"#,
                    serde_json::to_string(&raw_memo).unwrap()
                ));
                t.ok(
                    "R8: memo -- expect e o TEXTO (o registro so guarda o bloco), e detecta a troca",
                    raw_memo == "memo A"
                        && r6.as_deref().map(|s| s.contains("ERROR_STALE_VALUE")
                            && s.contains("\"actual\":\"memo B\"")).unwrap_or(false),
                    &format!("raw {raw_memo:?} / {r6:?}"),
                );

                // 7. os 256 bytes atravessam record -> expect -> comparacao
                //
                // Grava um C(40) com bytes 1..255 (0 fica de fora: e o terminador
                // de string do RDD), le o raw, e usa esse raw como expect. Se um
                // byte se perdesse no caminho, o expect nao bateria.
                let todos: String = (1u8..=40).map(|b| char::from(b)).collect();
                let _ = rpc_bruto(&hb, "data.update", &format!(
                    r#"{{"h":"{h3}","recno":3,"values":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&todos).unwrap()
                ));
                let raw_bin = rec(3).map(|v| raw_de(&v, "TXT")).unwrap_or_default();
                let r7 = rpc_bruto(&hb, "data.update", &format!(
                    r#"{{"h":"{h3}","recno":3,"values":{{"TXT":"limpo"}},"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_bin).unwrap()
                ));
                t.ok(
                    "R8: bytes de controle atravessam record -> expect e batem",
                    raw_bin.len() == 40
                        && r7.as_deref().map(|s| s.contains("\"ok\":true")).unwrap_or(false),
                    &format!("raw len {} / {r7:?}", raw_bin.len()),
                );

                // 9. `fields` escolhe as colunas da row -- o formulario manda todas e
                //    indexa a resposta pela propria lista. raw traz sempre TODOS.
                let r9 = rpc_bruto(&hb, "data.record",
                    &format!(r#"{{"h":"{h3}","recno":2,"fields":["INT","TXT"]}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let n_vals = r9.as_ref().and_then(|v| v.pointer("/result/row/values")
                    .and_then(|a| a.as_array()).map(|a| a.len()));
                let n_cols = r9.as_ref().and_then(|v| v.pointer("/result/cols")
                    .and_then(|a| a.as_array()).map(|a| a.len()));
                let n_raw = r9.as_ref().and_then(|v| v.pointer("/result/raw")
                    .and_then(|o| o.as_object()).map(|o| o.len()));
                let u9 = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"FIELDS"}},"fields":["TXT"]}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let u9_vals = u9.as_ref().and_then(|v| v.pointer("/result/row/values")
                    .and_then(|a| a.as_array()).cloned());
                t.ok(
                    "R8: `fields` escolhe as colunas da row (record e update); raw traz todos",
                    n_vals == Some(2) && n_cols == Some(2) && n_raw.map(|n| n > 2).unwrap_or(false)
                        && u9_vals == Some(vec![serde_json::json!("FIELDS")]),
                    &format!("vals {n_vals:?} cols {n_cols:?} raw {n_raw:?} update {u9_vals:?}"),
                );

                // 10. expect em delete/recall: quem exclui decide olhando a
                //     linha; se ela mudou, a marca e recusada do mesmo jeito.
                let raw_del = rec(2).map(|v| raw_de(&v, "TXT")).unwrap_or_default();
                let _ = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"MUDOU ANTES DO DELETE"}}}}"#));
                let d_velho = rpc_bruto(&hb, "data.delete", &format!(
                    r#"{{"h":"{h3}","recno":2,"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_del).unwrap()
                ));
                let ainda = rec(2).and_then(|v| v.pointer("/result/row/deleted").and_then(|b| b.as_bool()));
                t.ok(
                    "R8: delete com expect desatualizado e RECUSADO e nao marca",
                    d_velho.as_deref().map(|s| s.contains("ERROR_STALE_VALUE")).unwrap_or(false)
                        && ainda == Some(false),
                    &format!("{d_velho:?} / deleted {ainda:?}"),
                );
                let raw_del2 = rec(2).map(|v| raw_de(&v, "TXT")).unwrap_or_default();
                let d_novo = rpc_bruto(&hb, "data.delete", &format!(
                    r#"{{"h":"{h3}","recno":2,"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_del2).unwrap()
                ));
                let marcado = rec(2).and_then(|v| v.pointer("/result/row/deleted").and_then(|b| b.as_bool()));
                t.ok(
                    "R8: delete com expect atual marca",
                    d_novo.as_deref().map(|s| s.contains("\"ok\":true")).unwrap_or(false)
                        && marcado == Some(true),
                    &format!("{d_novo:?} / deleted {marcado:?}"),
                );
                let _ = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":2,"values":{{"TXT":"MUDOU ANTES DO RECALL"}}}}"#));
                let r_velho = rpc_bruto(&hb, "data.recall", &format!(
                    r#"{{"h":"{h3}","recno":2,"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_del2).unwrap()
                ));
                let segue = rec(2).and_then(|v| v.pointer("/result/row/deleted").and_then(|b| b.as_bool()));
                t.ok(
                    "R8: recall com expect desatualizado e RECUSADO e nao desmarca",
                    r_velho.as_deref().map(|s| s.contains("ERROR_STALE_VALUE")).unwrap_or(false)
                        && segue == Some(true),
                    &format!("{r_velho:?} / deleted {segue:?}"),
                );
                let raw_rec = rec(2).map(|v| raw_de(&v, "TXT")).unwrap_or_default();
                let r_novo = rpc_bruto(&hb, "data.recall", &format!(
                    r#"{{"h":"{h3}","recno":2,"expect":{{"TXT":{}}}}}"#,
                    serde_json::to_string(&raw_rec).unwrap()
                ));
                let desmarcado = rec(2).and_then(|v| v.pointer("/result/row/deleted").and_then(|b| b.as_bool()));
                t.ok(
                    "R8: recall com expect atual desmarca",
                    r_novo.as_deref().map(|s| s.contains("\"ok\":true")).unwrap_or(false)
                        && desmarcado == Some(false),
                    &format!("{r_novo:?} / deleted {desmarcado:?}"),
                );

                // 8. data.record nao entra no log (so le)
                let linhas8 = rpc_bruto(&hb, "log.read",
                    &format!(r#"{{"day":"{hoje}","filter":"selftest_t8","max":500}}"#)).unwrap_or_default();
                t.ok(
                    "R8: data.record NAO gera linha de log -- so le",
                    !linhas8.contains("data.record"),
                    "data.record apareceu no log",
                );

                // --- B3: codepage por arquivo ---
                //
                // A lente com que a ponte le/grava os bytes de UM DBF, sem tocar
                // no disco. A prova e um byte que muda de significado entre
                // codepages: "e" agudo e 0x82 em CP850 e 0xE9 em CP1252. Gravado
                // sob PT850, relido sob outra codepage, tem de mudar de glifo --
                // e voltar ao original ao restaurar a lente.

                // 1. meta.codepages lista o que linkou (o debug mostra a lista)
                let cps = rpc_bruto(&hb, "meta.codepages", "{}")
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let ids: Vec<String> = cps.as_ref()
                    .and_then(|v| v.pointer("/result/codepages").and_then(|a| a.as_array()))
                    .map(|a| a.iter().filter_map(|c| c.pointer("/id").and_then(|x| x.as_str()).map(str::to_string)).collect())
                    .unwrap_or_default();
                t.ok(
                    "B3: meta.codepages lista as disponiveis, com PT850 e default PT850",
                    ids.iter().any(|x| x == "PT850") && ids.iter().any(|x| x == "ESWIN")
                        && cps.as_ref().and_then(|v| v.pointer("/result/default").and_then(|d| d.as_str())) == Some("PT850"),
                    &format!("ids={ids:?}"),
                );

                // 2. grava "cafe" (com e agudo) sob PT850 e le de volta igual
                let _ = rpc_bruto(&hb, "data.update",
                    &format!(r#"{{"h":"{h3}","recno":1,"values":{{"TXT":"caf\u00e9"}}}}"#));
                let le = |h: &str| -> String {
                    rpc_bruto(&hb, "data.record", &format!(r#"{{"h":"{h}","recno":1}}"#))
                        .ok()
                        .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                        .and_then(|v| v.pointer("/result/row/values/0").and_then(|x| x.as_str()).map(str::to_string))
                        .unwrap_or_default()
                };
                let sob_850 = le(&h3);
                t.ok(
                    "B3: grava e le sob PT850 -- round-trip do acento",
                    sob_850 == "caf\u{e9}",
                    &format!("leu {sob_850:?}"),
                );

                // 3. troca a lente para CP1252 (ESWIN): o MESMO byte 0x82 vira
                //    outro caractere -- prova que a leitura respeita o codepage
                let troca = rpc_bruto(&hb, "file.setcodepage",
                    &format!(r#"{{"h":"{h3}","codepage":"ESWIN"}}"#));
                let sob_1252 = le(&h3);
                t.ok(
                    "B3: file.setcodepage muda a lente e a leitura muda de glifo",
                    troca.as_deref().map(|s| s.contains("\"ok\":true") && s.contains("\"codepage\":\"ESWIN\"")).unwrap_or(false)
                        && sob_1252 != sob_850 && !sob_1252.is_empty(),
                    &format!("850={sob_850:?} 1252={sob_1252:?}"),
                );

                // 4. de volta a PT850: o acento reaparece -- nada foi alterado no disco
                let _ = rpc_bruto(&hb, "file.setcodepage",
                    &format!(r#"{{"h":"{h3}","codepage":"PT850"}}"#));
                t.ok(
                    "B3: restaurar a lente traz o valor de volta -- o disco nunca mudou",
                    le(&h3) == "caf\u{e9}",
                    &format!("voltou {:?}", le(&h3)),
                );

                // 5. codepage desconhecido e RECUSA de negocio, nao "ERR:"
                let ruim = rpc_bruto(&hb, "file.setcodepage",
                    &format!(r#"{{"h":"{h3}","codepage":"KLINGON"}}"#));
                t.ok(
                    "B3: codepage invalido recusa com ERROR_UNKNOWN_CODEPAGE",
                    ruim.as_deref().map(|s| s.contains("ERROR_UNKNOWN_CODEPAGE") && !s.contains("ERR:")).unwrap_or(false),
                    &format!("{ruim:?}"),
                );

                // 6. file.info reporta o codepage do arquivo e a pista do cabecalho
                let inf = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h3}"}}"#))
                    .ok()
                    .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                t.ok(
                    "B3: file.info traz codepage e codepageHint",
                    inf.as_ref().map(|v| v.pointer("/result/codepage").and_then(|x| x.as_str()) == Some("PT850")
                        && v.pointer("/result/codepageHint").is_some()).unwrap_or(false),
                    &format!("codepage={:?} hint={:?}",
                        inf.as_ref().and_then(|v| v.pointer("/result/codepage")),
                        inf.as_ref().and_then(|v| v.pointer("/result/codepageHint"))),
                );

                // --- config em tres niveis + cascata + SET EPOCH ---
                //
                // Idempotencia: rodadas anteriores deixam o pin de selftest_cfg
                // em .run/.qdbu/arquivos.json; sem apaga-lo, o teste de heranca
                // global/conexao acharia origem "file" e falharia na 2a execucao.
                let _ = std::fs::remove_file(dir_run().join(".qdbu").join("arquivos.json"));
                //
                // A codepage resolve por arquivo > conexao > global > PT850, e
                // escrever e opt-in. Aqui provamos a cascata inteira e o EPOCH
                // fixo do arranque, sobre uma copia (conjunto DBF+DBT) em .run/.
                let abre = |arg: &str| -> Option<serde_json::Value> {
                    rpc_bruto(&hb, "file.open", arg)
                        .ok()
                        .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                };
                let cod = |v: &Option<serde_json::Value>| -> (String, String) {
                    let g = |k: &str| v.as_ref()
                        .and_then(|x| x.pointer(&format!("/result/{k}")).and_then(|c| c.as_str()))
                        .unwrap_or("").to_string();
                    (g("codepage"), g("codepageOrigin"))
                };
                let hde = |v: &Option<serde_json::Value>| v.as_ref()
                    .and_then(|x| x.pointer("/result/h").and_then(|h| h.as_str())).unwrap_or("").to_string();

                let ed2 = dir_run().join("selftest_cfg.dbf");
                let ed2_s = ed2.to_string_lossy().replace('\\', "/");
                let dbt_de = |dbf: &str| dbf.strip_suffix(".dbf").map(|b| format!("{b}.dbt")).unwrap_or_default();
                // o conjunto: DBF e o DBT do memo -- sem o .dbt, o open recusa
                let _ = rpc_bruto(&hb, "meta.copyfile",
                    &format!(r#"{{"source":"{ed_s}","dest":"{ed2_s}","shared":true}}"#));
                let _ = rpc_bruto(&hb, "meta.copyfile",
                    &format!(r#"{{"source":"{}","dest":"{}","shared":true}}"#, dbt_de(&ed_s), dbt_de(&ed2_s)));

                // 1. SET EPOCH TO 1979 rodou na init da VM
                let cfg = rpc_bruto(&hb, "config.get", "{}")
                    .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                t.ok(
                    "CFG: config.get traz epoch 1979 (SET no arranque) e a lista de codepages",
                    cfg.as_ref().map(|v| v.pointer("/result/epoch").and_then(|e| e.as_i64()) == Some(1979)
                        && v.pointer("/result/codepages").and_then(|a| a.as_array()).map(|a| !a.is_empty()).unwrap_or(false)).unwrap_or(false),
                    &format!("{cfg:?}"),
                );

                // 2. config.set grava o codepage GLOBAL e o arquivo novo o HERDA
                let set_g = rpc_bruto(&hb, "config.set", r#"{"codepage":"ESWIN"}"#)
                    .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let hg = abre(&format!(r#"{{"path":"{ed2_s}"}}"#));
                let (cg, og) = cod(&hg);
                t.ok(
                    "CFG: global gravado e HERDADO por arquivo novo (origem=global)",
                    set_g.as_ref().map(|v| v.pointer("/result/saved").and_then(|b| b.as_bool()) == Some(true)).unwrap_or(false)
                        && cg == "ESWIN" && og == "global",
                    &format!("set {set_g:?} / codepage {cg} origem {og}"),
                );

                // 3. setcodepage sem persist: vale so na sessao (origem=session, saved:false)
                let hg_h = hde(&hg);
                let ss = rpc_bruto(&hb, "file.setcodepage",
                    &format!(r#"{{"h":"{hg_h}","codepage":"PTISO"}}"#))
                    .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                t.ok(
                    "CFG: setcodepage sem persist muda a sessao e NAO grava (saved:false, origem=session)",
                    ss.as_ref().map(|v| v.pointer("/result/codepage").and_then(|c| c.as_str()) == Some("PTISO")
                        && v.pointer("/result/saved").and_then(|b| b.as_bool()) == Some(false)
                        && v.pointer("/result/codepageOrigin").and_then(|o| o.as_str()) == Some("session")).unwrap_or(false),
                    &format!("{ss:?}"),
                );
                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{hg_h}"}}"#));

                // 4. codepage por CONEXAO -- ANTES de fixar nivel-arquivo em ed2.
                //    Cadastra cfgconn, atualiza para PTISO, e ed2 aberto por ela herda.
                let _ = rpc_bruto(&hb, "workspace.add",
                    &format!(r#"{{"name":"cfgconn","dir":"{}","codepage":"PT860"}}"#, dir_run().to_string_lossy().replace('\\', "/")));
                let upd = rpc_bruto(&hb, "workspace.update", r#"{"name":"cfgconn","codepage":"PTISO"}"#)
                    .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let hc = abre(&format!(r#"{{"path":"{ed2_s}","connection":"cfgconn"}}"#));
                let (cc, oc) = cod(&hc);
                t.ok(
                    "CFG: workspace.update muda o codepage da conexao, e o arquivo herda (origem=connection)",
                    upd.as_ref().map(|v| v.pointer("/result/connection/codepage").and_then(|c| c.as_str()) == Some("PTISO")).unwrap_or(false)
                        && cc == "PTISO" && oc == "connection",
                    &format!("upd {upd:?} / codepage {cc} origem {oc}"),
                );
                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{}"}}"#, hde(&hc)));
                let _ = rpc_bruto(&hb, "workspace.remove", r#"{"name":"cfgconn"}"#);

                // 5. persist:file fixa no .qdbu/ e vence a conexao ao reabrir (origem=file)
                let hf = abre(&format!(r#"{{"path":"{ed2_s}"}}"#));
                let sf = rpc_bruto(&hb, "file.setcodepage",
                    &format!(r#"{{"h":"{}","codepage":"ESWIN","persist":"file"}}"#, hde(&hf)))
                    .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{}"}}"#, hde(&hf)));
                let re = abre(&format!(r#"{{"path":"{ed2_s}","connection":"cfgconn"}}"#));
                let (cr, or_) = cod(&re);
                t.ok(
                    "CFG: persist:file grava (.qdbu/arquivos.json) e VENCE a conexao ao reabrir (origem=file)",
                    sf.as_ref().map(|v| v.pointer("/result/saved").and_then(|b| b.as_bool()) == Some(true)).unwrap_or(false)
                        && cr == "ESWIN" && or_ == "file",
                    &format!("fix {sf:?} / codepage {cr} origem {or_}"),
                );
                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{}"}}"#, hde(&re)));

                // 5b. DESFIXAR tira do disco -- e nao so da tela.
                //
                // A caixa de marcar do dialogo OFERECE desfixar; enquanto o
                // pino era botao de mao unica nao havia o que desfazer. Sem o
                // persist:"none", a tela dizia "nao fixado" com a entrada ainda
                // no arquivos.json, e a cascata trazia o pino de volta na
                // abertura seguinte -- mentira silenciosa, que e o modo de
                // falhar que este projeto persegue.
                let hu = abre(&format!(r#"{{"path":"{ed2_s}"}}"#));
                let su = rpc_bruto(&hb, "file.setcodepage",
                    &format!(r#"{{"h":"{}","codepage":"PT850","persist":"none"}}"#, hde(&hu)))
                    .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok());
                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{}"}}"#, hde(&hu)));
                // reabrir e a prova: se o disco ainda tivesse o pino, a cascata
                // devolveria origem "file" em vez de cair para o nivel de cima.
                let rv = abre(&format!(r#"{{"path":"{ed2_s}"}}"#));
                let (cv, ov) = cod(&rv);
                t.ok(
                    "CFG: persist:none DESFIXA -- o pino sai do disco e a cascata volta a mandar",
                    su.as_ref().map(|v| v.pointer("/result/codepageOrigin").and_then(|o| o.as_str()) == Some("session")).unwrap_or(false)
                        && ov != "file",
                    &format!("desfixar {su:?} / ao reabrir codepage {cv} origem {ov}"),
                );
                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{}"}}"#, hde(&rv)));

                // devolve o global para PT850, para nao vazar para outros testes
                let _ = rpc_bruto(&hb, "config.set", r#"{"codepage":"PT850"}"#);

                // 6. codepage invalido no global e recusa de negocio
                let ruimg = rpc_bruto(&hb, "config.set", r#"{"codepage":"KLINGON"}"#);
                t.ok(
                    "CFG: codepage invalido no config.set recusa (ERROR_UNKNOWN_CODEPAGE, nao ERR:)",
                    ruimg.as_deref().map(|s| s.contains("ERROR_UNKNOWN_CODEPAGE") && !s.contains("ERR:")).unwrap_or(false),
                    &format!("{ruimg:?}"),
                );

                // 7. `codepage` NO PEDIDO so escolhe a lente em file.open/
                //    file.setcodepage. Em workspace.add ele e DADO A GUARDAR --
                //    honra-lo ali fazia o proprio `name` ser convertido para
                //    CP1252 na gravacao e relido como PT850 pelo workspace.list,
                //    devolvendo acento quebrado. Ida e volta com acento e o que
                //    separa as duas versoes.
                let nome_ac = "Ação";
                let _ = rpc_bruto(&hb, "workspace.remove", &format!(r#"{{"name":"{nome_ac}"}}"#));
                let _ = rpc_bruto(
                    &hb,
                    "workspace.add",
                    &format!(
                        r#"{{"name":"{nome_ac}","dir":"{}","codepage":"ESWIN"}}"#,
                        dir_run().to_string_lossy().replace('\\', "/")
                    ),
                );
                let lst = rpc_bruto(&hb, "workspace.list", "{}");
                t.ok(
                    "CFG: `codepage` em workspace.add e DADO, nao lente -- o nome acentuado volta inteiro",
                    lst.as_deref().map(|s| s.contains(nome_ac)).unwrap_or(false),
                    &format!("esperava '{nome_ac}' em {lst:?}"),
                );
                let _ = rpc_bruto(&hb, "workspace.remove", &format!(r#"{{"name":"{nome_ac}"}}"#));

                let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{h3}"}}"#));
            } else {
                t.ok("T8: abrir a copia para editar", false, "file.open falhou");
            }
            let _ = std::fs::remove_file(&ed);
            let _ = std::fs::remove_file(&ed_memo);
        } else {
            t.ok("T8: preparar a copia para editar", false, "meta.copyfile falhou");
        }

        } else {
            t.ok("R5: o indice sobrevive ao PACK", false, "meta.copyfile falhou");
        }
            let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{h}"}}"#));
        }
    } else {
        saida("  --   TA: fixture TIPOS.DBF ausente, pulando (rode tests/fixtures/fixtures.bat)");
    }

    /*
     * ---- Somente leitura (RO) ------------------------------------------
     *
     * A garantia e do RDD, nao da tela: a work area e aberta com o 6o
     * parametro do dbUseArea, entao QUALQUER caminho de escrita bate nela.
     * O que se afirma aqui e que a recusa chega como RECUSA DE NEGOCIO e nao
     * como "ERR:", que neste projeto significa bug -- e que ler continua
     * funcionando, senao o modo nao serviria para nada.
     */
    saida("");
    {
        // A fixture e resolvida de novo aqui: `origem_s` do bloco T8 morre com
        // ele, e depender do escopo de outro teste amarraria os dois.
        let fonte_ro = raiz_projeto()
            .map(|raiz| raiz.join("tests").join("fixtures").join("TIPOS.DBF"))
            .filter(|p| p.exists());
        let ro = dir_run().join("selftest_ro.dbf");
        let ro_s = ro.to_string_lossy().replace('\\', "/");
        let _ = std::fs::remove_file(&ro);

        let copiou = match &fonte_ro {
            Some(p) => {
                let fonte_s = p.to_string_lossy().replace('\\', "/");
                rpc_bruto(
                    &hb,
                    "meta.copyfile",
                    &format!(r#"{{"source":"{fonte_s}","dest":"{ro_s}","shared":true}}"#),
                )
                .map(|r| r.contains("\"ok\":true"))
                .unwrap_or(false)
            }
            None => false,
        };

        // O CONJUNTO, nao so o .DBF: TIPOS.DBF tem memo, e `file.open` recusa
        // (com razao) um DBF com a flag de memo ligada e nenhum .dbt ao lado.
        let ro_memo = ro.with_extension("dbt");
        let _ = std::fs::remove_file(&ro_memo);
        if let Some(p) = &fonte_ro {
            let memo = p.with_extension("dbt");
            if memo.exists() {
                let _ = std::fs::copy(&memo, &ro_memo);
            }
        }

        if copiou {
            // A resposta CRUA e guardada: sem ela a falha diria so "file.open
            // falhou", que e a categoria e nao o fato -- a mesma armadilha que
            // ErroTexto() existe para evitar do outro lado.
            let bruta = rpc_bruto(&hb, "file.open", &format!(r#"{{"path":"{ro_s}","readOnly":true}}"#))
                .unwrap_or_else(|e| format!("erro de ponte: {e}"));
            let hro = serde_json::from_str::<serde_json::Value>(&bruta)
                .ok()
                .as_ref()
                .and_then(|v| v.pointer("/result/h"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match hro {
                Some(h) => {
                    let info = rpc_bruto(&hb, "file.info", &format!(r#"{{"h":"{h}"}}"#))
                        .unwrap_or_default();
                    t.ok(
                        "RO: file.info devolve readOnly true",
                        info.contains("\"readOnly\":true"),
                        &info,
                    );

                    let pag = rpc_bruto(
                        &hb, "data.page",
                        &format!(r#"{{"h":"{h}","anchor":"top","count":3}}"#),
                    ).unwrap_or_default();
                    t.ok(
                        "RO: LER continua funcionando -- o modo trava a escrita, nao o uso",
                        pag.contains("\"ok\":true"),
                        &pag,
                    );

                    // A recusa: negocio, com codigo estavel. NAO "ERR:".
                    for m in ["data.update", "data.append", "data.delete", "bulk.pack", "bulk.zap"] {
                        let r = rpc_bruto(
                            &hb, m,
                            &format!(r#"{{"h":"{h}","recno":1,"values":{{}},"backup":false}}"#),
                        ).unwrap_or_default();
                        t.ok(
                            &format!("RO: {m} recusa com ERROR_FILE_READ_ONLY, nao ERR:"),
                            r.contains("ERROR_FILE_READ_ONLY") && !r.starts_with("ERR:"),
                            &r,
                        );
                    }

                    /*
                     * Exportar NAO e recusado, e isso e a distincao inteira:
                     * somente leitura e uma promessa sobre ESTE arquivo, e
                     * export.csv escreve outro. Recusar aqui confundiria
                     * "nao mudo este" com "nao produzo nada".
                     */
                    let saida_csv = dir_run().join("selftest_ro.csv");
                    let csv_s = saida_csv.to_string_lossy().replace('\\', "/");
                    let exp = rpc_bruto(
                        &hb, "export.csv",
                        &format!(r#"{{"h":"{h}","path":"{csv_s}"}}"#),
                    ).unwrap_or_default();
                    t.ok(
                        "RO: exportar CONTINUA valendo -- cria arquivo novo, nao muda este",
                        exp.contains("\"ok\":true"),
                        &exp,
                    );
                    let _ = std::fs::remove_file(&saida_csv);

                    let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{h}"}}"#));
                }
                None => t.ok("RO: abrir somente leitura", false, &bruta),
            }
        } else {
            t.ok("RO: preparar a copia", false, "meta.copyfile falhou");
        }
        let _ = std::fs::remove_file(&ro);
        let _ = std::fs::remove_file(&ro_memo);
    }

    /*
     * ---- Construtor de expressao: o que a DLL entrega (EXP) --------------
     *
     * expr.functions e a ponte entre o catalogo (gerado da doc) e o binario:
     * o que o catalogo oferece tem de existir aqui. expr.check ganhou symbol,
     * value e recno para a linha de status do construtor. O historico e
     * chaveado pelo NOME do arquivo.
     */
    saida("");
    {
        let fonte_exp = raiz_projeto()
            .map(|raiz| raiz.join("tests").join("fixtures").join("TIPOS.DBF"))
            .filter(|p| p.exists());
        let ex = dir_run().join("selftest_exp.dbf");
        let ex_s = ex.to_string_lossy().replace('\\', "/");
        let ex_memo = ex.with_extension("dbt");
        let _ = std::fs::remove_file(&ex);
        let _ = std::fs::remove_file(&ex_memo);

        let copiou = match &fonte_exp {
            Some(p) => {
                let fonte_s = p.to_string_lossy().replace('\\', "/");
                let memo = p.with_extension("dbt");
                if memo.exists() { let _ = std::fs::copy(&memo, &ex_memo); }
                rpc_bruto(&hb, "meta.copyfile",
                    &format!(r#"{{"source":"{fonte_s}","dest":"{ex_s}","shared":true}}"#))
                    .map(|r| r.contains("\"ok\":true")).unwrap_or(false)
            }
            None => false,
        };

        // Sem arquivo aberto -- so precisa da DLL.
        let fns = rpc_bruto(&hb, "expr.functions", "{}").unwrap_or_default();
        t.ok("EXP: expr.functions -- tudo de ExprFuncsLista() linka (missing vazio)",
             fns.contains("\"missing\":[]"), &fns);
        t.ok("EXP: expr.functions -- STOD e PADR estao entre as linkadas",
             fns.contains("\"STOD\"") && fns.contains("\"PADR\""), &fns);
        let fns2 = rpc_bruto(&hb, "expr.functions",
            r#"{"names":["PADR","IIF","NAO_EXISTE_XYZ"]}"#).unwrap_or_default();
        t.ok("EXP: IIF conta como linkada (keyword) e nome inventado cai em missing",
             fns2.contains("\"linked\":[\"PADR\",\"IIF\"]") && fns2.contains("\"missing\":[\"NAO_EXISTE_XYZ\"]"),
             &fns2);

        // Historico, chaveado pelo nome -- idempotente por construcao.
        for i in 1..=21 {
            let _ = rpc_bruto(&hb, "expr.history.put",
                &format!(r#"{{"file":"SELFTEST_HIST.DBF","expr":"H{i}"}}"#));
        }
        let rep = rpc_bruto(&hb, "expr.history.put",
            r#"{"file":"SELFTEST_HIST.DBF","expr":"H21"}"#).unwrap_or_default();
        let hist: Vec<String> = serde_json::from_str::<serde_json::Value>(&rep).ok()
            .and_then(|v| v.pointer("/result/expressions").cloned())
            .and_then(|v| serde_json::from_value(v).ok()).unwrap_or_default();
        t.ok("EXP: historico guarda 20, mais recente primeiro, sem repetir, e diz saved",
             hist.len() == 20 && hist.first().map(|s| s == "H21").unwrap_or(false)
                && hist.iter().filter(|s| *s == "H21").count() == 1
                && !hist.iter().any(|s| s == "H1") && rep.contains("\"saved\":true"),
             &format!("{} itens, primeiro {:?}: {}", hist.len(), hist.first(), rep));
        let get = rpc_bruto(&hb, "expr.history.get", r#"{"file":"selftest_hist.dbf"}"#).unwrap_or_default();
        t.ok("EXP: get pelo nome em minusculas acha o mesmo historico (chave em maiusculas)",
             get.contains("\"H21\""), &get);

        if copiou {
            let hex = rpc_bruto(&hb, "file.open", &format!(r#"{{"path":"{ex_s}"}}"#))
                .ok().and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
                .as_ref().and_then(|v| v.pointer("/result/h")).and_then(|v| v.as_str())
                .map(|s| s.to_string());
            match hex {
                Some(h) => {
                    let chk = |expr: &str, expect: &str| rpc_bruto(&hb, "expr.check",
                        &format!(r#"{{"h":"{h}","expr":"{expr}","expect":"{expect}"}}"#)).unwrap_or_default();

                    let r = chk("TXTT == 'A'", "L");
                    t.ok("EXP: campo inexistente -- nao compila E devolve o simbolo (symbol)",
                         r.contains("\"compiles\":false") && r.contains("\"symbol\":\"TXTT\""), &r);

                    let r = chk("Upper(TXT)", "L");
                    t.ok("EXP: tipo errado -- typeOk false, type C, e o valor veio junto",
                         r.contains("\"typeOk\":false") && r.contains("\"type\":\"C\"") && r.contains("\"value\":\""), &r);

                    let r = chk("Len(TXT) >= 0", "L");
                    t.ok("EXP: expressao boa -- ok, value .T., recno presente",
                         r.contains("\"ok\":true") && r.contains("\"value\":\".T.\"") && r.contains("\"recno\":"), &r);

                    let r = chk("SToD('20260101')", "");
                    t.ok("EXP: SToD linka (entrou no REQUEST) e devolve Data",
                         r.contains("\"type\":\"D\""), &r);

                    let r = chk("PadR(TXT, 5)", "C");
                    t.ok("EXP: PadR com 2 argumentos avalia -- o patch cFill opcional e verdade no binario",
                         r.contains("\"ok\":true"), &r);

                    let _ = rpc_bruto(&hb, "file.close", &format!(r#"{{"h":"{h}"}}"#));
                }
                None => t.ok("EXP: abrir a copia", false, "file.open falhou"),
            }
        } else {
            t.ok("EXP: preparar a copia", false, "meta.copyfile falhou");
        }
        let _ = std::fs::remove_file(&ex);
        let _ = std::fs::remove_file(&ex_memo);
    }

    /*
     * ---- Linha de comando, versao e titulo -----------------------------
     *
     * Nao precisam da DLL: sao funcoes puras. Ficam no fim para nao empurrar
     * as asercoes de dado para baixo, e entram aqui e nao num `#[test]` porque
     * o projeto tem um trilho de regressao so, e ele e este.
     */
    saida("");
    let arg = |v: &[&str]| parametros_de(&v.iter().map(|s| s.to_string()).collect::<Vec<_>>());

    t.ok(
        "CLI: sem argumento nao pede nada",
        arg(&[]) == ParametrosLinha::default(),
        &format!("{:?}", arg(&[])),
    );
    t.ok(
        "CLI: o nome solto e o arquivo a abrir",
        arg(&["NETCLI.DBF"]).arquivo.as_deref() == Some("NETCLI.DBF"),
        &format!("{:?}", arg(&["NETCLI.DBF"])),
    );
    t.ok(
        "CLI: /E liga o uso exclusivo, em qualquer caixa e em qualquer ordem",
        arg(&["/e", "X.DBF"]).exclusivo && arg(&["X.DBF", "/E"]).exclusivo,
        &format!("{:?} / {:?}", arg(&["/e", "X.DBF"]), arg(&["X.DBF", "/E"])),
    );
    t.ok(
        "CLI: /C e /M sao ACEITOS e ignorados -- atalho antigo continua abrindo",
        arg(&["/C", "/M"]).ignorados.len() == 2 && arg(&["/C", "/M"]).desconhecidos.is_empty(),
        &format!("{:?}", arg(&["/C", "/M"])),
    );
    t.ok(
        "CLI: .VEW e reconhecido a parte -- nao vira 'arquivo nao encontrado'",
        arg(&["A.VEW"]).vew.as_deref() == Some("A.VEW") && arg(&["A.VEW"]).arquivo.is_none(),
        &format!("{:?}", arg(&["A.VEW"])),
    );
    t.ok(
        "CLI: opcao desconhecida NAO e tratada como nome de arquivo",
        arg(&["/Z"]).arquivo.is_none() && arg(&["/Z"]).desconhecidos == vec!["/Z".to_string()],
        &format!("{:?}", arg(&["/Z"])),
    );
    t.ok(
        "CLI: --selftest e afins nunca viram arquivo",
        arg(&["--selftest", "--help"]) == ParametrosLinha::default(),
        &format!("{:?}", arg(&["--selftest", "--help"])),
    );

    t.ok(
        "VER: a versao de exibicao e NN.NN, carimbada pelo build.rs",
        VERSAO.len() == 5
            && VERSAO.as_bytes()[2] == b'.'
            && VERSAO.chars().enumerate().all(|(i, c)| i == 2 || c.is_ascii_digit()),
        &format!("VERSAO={VERSAO:?}"),
    );
    t.ok(
        "VER: a data de linkedicao veio junto, no formato aaaa-mm-dd hh:mm",
        COMPILADO.len() == 16 && COMPILADO.as_bytes()[10] == b' ',
        &format!("COMPILADO={COMPILADO:?}"),
    );
    t.ok(
        "VER: o titulo e 'QDbu vNN.NN - Database Utility' -- e QDbu, nao QDBU",
        titulo_janela() == format!("QDbu v{VERSAO} - Database Utility"),
        &titulo_janela(),
    );

    t.resumo()
}

/// Um pedido pelo envelope, sem o `AppHandle` do Tauri -- que o selftest nao
/// tem, por rodar antes de existir aplicacao. Devolve o JSON cru: as asercoes
/// abaixo checam trechos, e desserializar so para reserializar nao ajudaria.
fn rpc_bruto(hb: &Harbour, metodo: &str, params_json: &str) -> Result<String, String> {
    let id = format!("st{}", PROXIMO_ID.fetch_add(1, Ordering::Relaxed));
    let envelope = format!(r#"{{"id":"{id}","method":"{metodo}","params":{params_json}}}"#);
    hb.exec("rpc", &envelope)
}

/// Arnes de verificacao do selftest. Cada item do checklist do projeto vira uma
/// asercao aqui -- o selftest e o trilho de regressao principal, entao ele
/// precisa AFIRMAR, nao so imprimir.
struct Verificador {
    falhas: u32,
    total: u32,
}

impl Verificador {
    fn novo() -> Self {
        Self { falhas: 0, total: 0 }
    }

    fn ok(&mut self, nome: &str, cond: bool, detalhe: &str) {
        self.total += 1;
        if cond {
            saida(&format!("  ok   {nome}"));
        } else {
            self.falhas += 1;
            saida(&format!("  FALHA {nome}
        {detalhe}"));
        }
    }

    fn igual(&mut self, nome: &str, obtido: Result<&str, &String>, esperado: Result<&str, &String>) {
        let cond = obtido == esperado;
        let detalhe = format!("esperado {esperado:?}, obtido {obtido:?}");
        self.ok(nome, cond, &detalhe);
    }

    fn contem(&mut self, nome: &str, obtido: Result<String, String>, trecho: &str) {
        match obtido {
            Ok(s) => {
                let cond = s.contains(trecho);
                let detalhe = format!("esperava conter {trecho:?}, obtido {s:?}");
                self.ok(nome, cond, &detalhe);
            }
            Err(e) => self.ok(nome, false, &format!("erro de FFI: {e}")),
        }
    }

    fn resumo(&self) -> i32 {
        saida(&format!(
            "
{} verificacoes, {} falhas",
            self.total, self.falhas
        ));
        if self.falhas == 0 {
            0
        } else {
            1
        }
    }
}

/// Geometria da janela, persistida em `<raiz>/.qdbu/janela.json`.
///
/// Arquivo, e nao localStorage: o armazenamento do webview e isolado por
/// ORIGEM, e o app roda ora em `tauri.localhost` (assets embutidos) ora em
/// `dev.localhost` (modo dev). O que se salva num modo nao aparece no outro.
#[derive(serde::Serialize, serde::Deserialize, Debug)]
struct Janela {
    x: i32,
    y: i32,
    largura: u32,
    altura: u32,
    maximizada: bool,
}

fn arquivo_janela() -> PathBuf {
    let base = raiz_projeto().unwrap_or_else(base_instalado);
    let dir = base.join(".qdbu");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("window.json")
}

fn ler_janela() -> Option<Janela> {
    let txt = std::fs::read_to_string(arquivo_janela()).ok()?;
    serde_json::from_str(&txt).ok()
}

/// Anota a geometria enquanto a janela esta restaurada. Chamado a cada
/// Moved/Resized -- e o unico momento em que da para saber onde ela realmente
/// esta, incluindo em qual monitor.
fn anotar_geometria(w: &tauri::Window) {
    if w.is_maximized().unwrap_or(false) {
        return;
    }

    let (p, s) = match (w.outer_position(), w.outer_size()) {
        (Ok(p), Ok(s)) => (p, s),
        _ => return,
    };

    // O evento Moved da maximizacao chega ANTES de is_maximized() virar true,
    // entao a checagem acima nao basta: sem esta guarda gravariamos a geometria
    // de tela cheia como se fosse a restaurada, e o app reabriria do tamanho do
    // monitor. Se a janela cobre quase um monitor inteiro, e maximizacao.
    if let Ok(monitores) = w.available_monitors() {
        let cobre_monitor = monitores.iter().any(|m| {
            let ms = m.size();
            s.width + 32 >= ms.width && s.height + 32 >= ms.height
        });
        if cobre_monitor {
            return;
        }
    }

    *ULTIMA_RESTAURADA.lock().unwrap() = Some((p.x, p.y, s.width, s.height));
}

fn gravar_janela(w: &tauri::Window) {
    let maximizada = w.is_maximized().unwrap_or(false);

    // Maximizada: a geometria de tela cheia nao serve para lembrar o monitor,
    // entao usamos a ultima posicao restaurada. Sem isto o app sempre voltava
    // no monitor primario, mesmo tendo sido fechado em outro.
    let (pos, tam) = if maximizada {
        match *ULTIMA_RESTAURADA.lock().unwrap() {
            Some((x, y, lg, al)) => ((x, y), (lg, al)),
            None => match ler_janela() {
                Some(j) => ((j.x, j.y), (j.largura, j.altura)),
                None => ((100, 100), (1280, 800)),
            },
        }
    } else {
        match (w.outer_position(), w.outer_size()) {
            (Ok(p), Ok(s)) => ((p.x, p.y), (s.width, s.height)),
            _ => return,
        }
    };

    let j = Janela {
        x: pos.0,
        y: pos.1,
        largura: tam.0,
        altura: tam.1,
        maximizada,
    };

    match serde_json::to_string_pretty(&j) {
        Ok(txt) => {
            if let Err(e) = std::fs::write(arquivo_janela(), txt) {
                log(&format!("[qdbu] nao gravou janela.json: {e}"));
            }
        }
        Err(e) => log(&format!("[qdbu] nao serializou a janela: {e}")),
    }
}

/// A janela cabe em algum monitor ligado agora?
///
/// Arranjo de monitores muda: o usuario desliga o segundo, leva o notebook para
/// outra mesa, troca a resolucao. Sem esta checagem a janela reabriria numa
/// coordenada que nao existe mais -- invisivel, e sem como trazer de volta.
///
/// Basta uma sobreposicao razoavel: exigir contencao total impediria a janela
/// de voltar levemente para fora da borda, o que e comum e inofensivo.
fn posicao_visivel(w: &tauri::WebviewWindow, x: i32, y: i32, lg: u32, al: u32) -> bool {
    let monitores = match w.available_monitors() {
        Ok(m) => m,
        Err(_) => return true, // sem saber, nao atrapalha
    };

    let (x2, y2) = (x + lg as i32, y + al as i32);

    monitores.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        let (mx2, my2) = (p.x + s.width as i32, p.y + s.height as i32);

        let sobrepoe_x = x.max(p.x) < x2.min(mx2);
        let sobrepoe_y = y.max(p.y) < y2.min(my2);
        if !(sobrepoe_x && sobrepoe_y) {
            return false;
        }

        // pelo menos um quarto da janela dentro deste monitor
        let larg = x2.min(mx2) - x.max(p.x);
        let alt = y2.min(my2) - y.max(p.y);
        (larg as i64) * (alt as i64) * 4 >= (lg as i64) * (al as i64)
    })
}

/// Serve `app/ui/` do disco por um protocolo proprio, para o frontend poder ser
/// editado sem recompilar o Rust.
///
/// Por que nao um servidor HTTP externo: a origem seria remota
/// (`http://127.0.0.1:5173`) e o ACL do Tauri v2 recusa `invoke` vindo de fora
/// -- o sintoma e "status not allowed. Plugin not found". Servindo por um
/// scheme proprio, a origem continua local e confiavel.
///
/// Ligado por `QDBU_UI_DIR` apontando para a pasta `app/ui`. Ver app/dev.bat.
fn mime_de(caminho: &str) -> &'static str {
    match caminho.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "md" | "txt" => "text/plain; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

fn serve_ui_do_disco(raiz: &Path, uri_path: &str) -> (u16, &'static str, Vec<u8>) {
    let rel = uri_path.trim_start_matches('/');
    let rel = if rel.is_empty() { "index.html" } else { rel };

    // Path traversal: recusa qualquer componente que nao seja nome simples.
    if rel.split('/').any(|c| c == ".." || c == "." || c.contains('\u{5C}')) {
        return (403, "text/plain; charset=utf-8", b"caminho recusado".to_vec());
    }

    let alvo = raiz.join(rel);
    match std::fs::read(&alvo) {
        Ok(b) => (200, mime_de(rel), b),
        Err(e) => (
            404,
            "text/plain; charset=utf-8",
            format!("{}: {e}", alvo.display()).into_bytes(),
        ),
    }
}

/// Liga o CDP do WebView2 antes de a webview existir.
///
/// Tem de rodar antes do `tauri::Builder`: o WebView2 le
/// WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS na criacao do ambiente, e depois disso
/// mudar a variavel nao tem efeito. Respeita valor ja definido por fora.
#[cfg(debug_assertions)]
fn liga_cdp() -> Option<String> {
    const VAR: &str = "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS";

    if let Ok(ja) = env::var(VAR) {
        return Some(format!("herdado do ambiente: {ja}"));
    }

    let porta = env::var("QDBU_CDP_PORT").unwrap_or_else(|_| CDP_PORT_PADRAO.to_string());
    if porta == "0" {
        return None;
    }

    env::set_var(VAR, format!("--remote-debugging-port={porta}"));
    Some(porta)
}

#[cfg(not(debug_assertions))]
fn liga_cdp() -> Option<String> {
    None
}

/// Pasta de onde servir o frontend, ou None para usar os assets embutidos.
///
/// Em DEBUG le do disco por padrao. `generate_context!()` embute app/ui/ no
/// binario em tempo de compilacao, entao sem isto uma alteracao no JS so
/// aparece depois de recompilar o Rust -- e o app fica rodando frontend antigo
/// sem dar sinal nenhum. Ja custou uma sessao inteira depurando um bug que
/// estava corrigido no disco havia dez minutos.
///
/// Nao depende de qual .bat lancou o app: rodar o .exe direto tem o mesmo
/// comportamento. `QDBU_UI_DIR` continua valendo para apontar outra pasta, e
/// `QDBU_UI_EMBUTIDA=1` forca os assets embutidos para testar o que o usuario
/// final recebe.
fn dir_da_ui() -> Option<PathBuf> {
    if let Ok(dir) = env::var("QDBU_UI_DIR") {
        return Some(PathBuf::from(dir));
    }

    if !cfg!(debug_assertions) || env::var("QDBU_UI_EMBUTIDA").is_ok() {
        return None;
    }

    let dir = raiz_projeto()?.join("app").join("ui");
    if dir.join("index.html").is_file() {
        Some(dir)
    } else {
        None
    }
}

/// Move `<raiz>/.dbu` para `<raiz>/.qdbu`, uma vez, na renomeacao para QDbu.
///
/// A pasta guarda o que o usuario nao pode perder: o LOG DE ALTERACOES (a
/// resposta para "o que este programa fez com o meu arquivo?"), as conexoes
/// cadastradas, a sessao e a geometria da janela. Trocar o nome da pasta sem
/// migrar nao apagaria nada, mas some com tudo da tela -- e um log de auditoria
/// que desaparece e pior do que nunca ter existido, porque ninguem procura o
/// que nao sabe que sumiu.
///
/// MORA AQUI, e nao no Harbour, para haver UMA implementacao. `DirConfigQDbu()`
/// (`src/util/paths.prg`) resolve a mesma raiz pela mesma marca (`qdbudll.hbp`),
/// entao quando a DLL for perguntar o caminho a pasta ja esta no lugar novo.
/// Roda antes do `--selftest` de proposito: os dois caminhos veem o mesmo disco.
///
/// Conservadora nos tres casos que nao sao "renomear e seguir":
///   - `.qdbu` ja existe  -> nao faz nada (migracao ja aconteceu, ou o usuario
///                           tem as duas; mexer aqui poderia sobrescrever)
///   - `.dbu` nao existe  -> instalacao nova, nada a fazer
///   - a renomeacao falha -> registra e SEGUE. Perder a migracao e ruim; nao
///                           subir o app por causa dela seria pior.
fn migra_pasta_de_config() {
    // A MESMA RAIZ QUE `dir_run()` E `arquivo_janela()`, e nao uma parecida.
    //
    // Aqui havia `raiz_projeto().or_else(current_exe().parent())`, que so
    // coincide com o resto quando o exe roda de uma pasta gravavel. Instalado em
    // `C:\Program Files`, `base_instalado()` cai para
    // `%LOCALAPPDATA%\dbu-harbour` -- e a migracao ia procurar `.dbu` dentro do
    // Program Files, nao achava nada, e o log de alteracoes e as conexoes
    // ficavam para tras exatamente na instalacao para a qual ela foi escrita.
    migra_config_em(&raiz_projeto().unwrap_or_else(base_instalado));
}

/// O que a migração fez -- para o teste distinguir "migrou" de "não tinha o que
/// migrar", dois desfechos que o log já separava e o tipo agora também.
#[derive(Debug, PartialEq, Eq)]
enum Migracao {
    Migrou,
    JaExistia,
    NadaAMigrar,
    Falhou,
}

/// O corpo da migração, com a raiz por PARÂMETRO.
///
/// Separado de `migra_pasta_de_config()` só para poder ser AFIRMADO. A função
/// de cima depende de `raiz_projeto()`, que aponta para o repositório real: um
/// teste sobre ela migraria a pasta de verdade uma vez e nunca mais -- passaria
/// na primeira execução e ficaria inerte em todas as seguintes, que é a
/// definição de teste que não testa. Com a raiz por parâmetro o selftest monta
/// os três estados num diretório descartável e confere cada um.
fn migra_config_em(raiz: &Path) -> Migracao {
    let antiga = raiz.join(".dbu");
    let nova = raiz.join(".qdbu");

    // `.qdbu` já existe: ou a migração já aconteceu, ou o usuário tem as duas.
    // Nos dois casos mexer aqui poderia sobrescrever config boa por config
    // velha, e isso é pior do que não migrar.
    if nova.exists() {
        return Migracao::JaExistia;
    }
    if !antiga.is_dir() {
        return Migracao::NadaAMigrar;
    }

    match std::fs::rename(&antiga, &nova) {
        Ok(()) => {
            log(&format!(
                "[qdbu] config migrada: {} -> {}",
                antiga.display(),
                nova.display()
            ));
            Migracao::Migrou
        }
        // Registra e SEGUE. Perder a migração é ruim; não subir o app por causa
        // dela seria pior.
        Err(e) => {
            log(&format!(
                "[qdbu] AVISO: nao consegui migrar {} para {} ({e}). O historico \
                 anterior nao aparecera na tela de Alteracoes; mova a pasta a mao \
                 para recupera-lo.",
                antiga.display(),
                nova.display()
            ));
            Migracao::Falhou
        }
    }
}
/*
 * ====================================================================
 *  Linha de comando -- a do DBU original, e so ela
 * ====================================================================
 *
 * O DBU aceitava, em qualquer ordem (`ParseCommLine`, DBU.PRG:880):
 *
 *   <arquivo>   .VEW ou .DBF para abrir
 *   /E          uso EXCLUSIVO dos arquivos
 *   /C          usar cor mesmo em monitor monocromatico
 *   /M          monocromatico
 *
 * Aqui vale o mesmo contrato, com duas diferencas honestas:
 *
 * - `/C` e `/M` sao ACEITOS E IGNORADOS, nao recusados. Nao ha monitor
 *   monocromatico para atender, mas um atalho ou .bat antigo que os passe
 *   tem de continuar abrindo o programa. Recusar um argumento que perdeu o
 *   sentido e transformar compatibilidade em erro.
 * - `.VEW` e RECONHECIDO e recusado com nome proprio. Ler o formato ainda
 *   nao existe (ver docs/09-modelo-de-confianca.md); dizer "arquivo nao
 *   encontrado" sobre um .VEW que esta ali seria a resposta errada.
 *
 * O que nao se reconhece vai para `desconhecidos` e a UI avisa -- em vez de
 * ser tratado como nome de arquivo, que e o que o original fazia e produz
 * "arquivo nao encontrado: /X".
 */
#[derive(Serialize, Clone, Default, PartialEq, Debug)]
struct ParametrosLinha {
    /// O arquivo a abrir, se veio um.
    arquivo: Option<String>,
    /// `/E`: abrir em uso exclusivo.
    exclusivo: bool,
    /// `.VEW` pedido na linha de comando -- reconhecido, ainda nao lido.
    vew: Option<String>,
    /// Aceitos por compatibilidade, sem efeito aqui (`/C`, `/M`).
    ignorados: Vec<String>,
    /// Nao reconhecidos.
    desconhecidos: Vec<String>,
}

fn parametros_de(args: &[String]) -> ParametrosLinha {
    let mut p = ParametrosLinha::default();

    for a in args {
        // Os proprios do app, ja tratados em main(), nunca sao arquivo.
        if a.starts_with("--") {
            continue;
        }

        match a.to_uppercase().as_str() {
            "/E" => p.exclusivo = true,
            "/C" | "/M" => p.ignorados.push(a.clone()),
            _ => {
                if a.starts_with('/') {
                    p.desconhecidos.push(a.clone());
                } else if a.to_uppercase().ends_with(".VEW") {
                    p.vew = Some(a.clone());
                } else if p.arquivo.is_none() {
                    p.arquivo = Some(a.clone());
                } else {
                    // O DBU abria UM arquivo. O segundo nome nao e um erro de
                    // digitacao a adivinhar -- e um pedido que o programa nao
                    // sabe atender, e cala-lo esconderia isso.
                    p.desconhecidos.push(a.clone());
                }
            }
        }
    }

    p
}

/// O texto de `--help`. Sai pelo console anexado, como o `--selftest`.
fn texto_de_ajuda() -> String {
    format!(
        "\
{PRODUTO} v{VERSAO} - Database Utility
Por Vailton Renato <vailtom@gmail.com>
Compilado em {COMPILADO}

  qdbu.exe [arquivo] [/E] [/C] [/M]

  arquivo   .DBF para abrir ao subir
  /E        uso exclusivo dos arquivos
  /C /M     aceitos por compatibilidade com o DBU; sem efeito aqui

  --selftest   roda a bateria de verificacao e sai
  --help       este texto

https://github.com/vailtom/qdbu
"
    )
}

fn main() {
    // O log acumula entre execucoes; marca onde cada sessao comeca.
    log(&format!(
        "===== sessao iniciada | pid {} | {} =====",
        std::process::id(),
        env::current_exe()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| "?".into())
    ));

    migra_pasta_de_config();

    if env::args().any(|a| a == "--selftest") {
        #[cfg(windows)]
        anexar_console_do_pai();
        std::process::exit(selftest());
    }

    if env::args().any(|a| a == "--help" || a == "-h" || a == "/?") {
        #[cfg(windows)]
        anexar_console_do_pai();
        println!("{}", texto_de_ajuda());
        std::process::exit(0);
    }

    // Parametros da linha de comando, no contrato do DBU. Lidos aqui e levados
    // a UI pelo `status`: quem abre arquivo e o frontend, pelo mesmo caminho de
    // sempre (`file.open`), e nao um segundo caminho so para a linha de comando.
    let params = parametros_de(&env::args().skip(1).collect::<Vec<_>>());
    if params != ParametrosLinha::default() {
        log(&format!("[qdbu] linha de comando: {params:?}"));
    }

    // WebView2 guarda cache e cookies em %LOCALAPPDATA%\<identifier> por padrao.
    // O projeto e autocontido, entao apontamos para dentro dele -- isso tambem
    // torna trivial limpar o estado do webview: apagar .run/webview2.
    if env::var("WEBVIEW2_USER_DATA_FOLDER").is_err() {
        env::set_var("WEBVIEW2_USER_DATA_FOLDER", dir_run().join("webview2"));
    }

    match liga_cdp() {
        Some(p) => log(&format!("[qdbu] CDP ativo na porta {p} -- devtools/cdp.bat")),
        None => log("[qdbu] CDP desligado"),
    }

    let ui_dir = dir_da_ui();
    let ui_dir_proto = ui_dir.clone();

    tauri::Builder::default()
        // Save As / Abrir nativos do sistema. Digitar caminho a mao e o jeito
        // mais facil de gravar na pasta errada -- e um caminho errado nao da
        // erro nenhum, so nao e achado depois.
        .plugin(tauri_plugin_dialog::init())
        .register_uri_scheme_protocol("dev", move |_ctx, request| {
            let raiz = ui_dir_proto
                .clone()
                .unwrap_or_else(|| PathBuf::from("."));
            let (code, mime, corpo) = serve_ui_do_disco(&raiz, request.uri().path());
            tauri::http::Response::builder()
                .status(code)
                .header("Content-Type", mime)
                .header("Cache-Control", "no-store")
                .body(corpo)
                .unwrap()
        })
        .setup(move |app| {
            let caminho = achar_dll();
            log(&format!("[qdbu] procurando DLL: {}", caminho.display()));
            let (hb, erro) = match Harbour::iniciar(caminho) {
                Ok(h) => {
                    log("[qdbu] DLL carregada, HbStart ok");
                    (Some(h), None)
                }
                Err(e) => {
                    log(&format!("[qdbu] FALHOU ao carregar a DLL: {e}"));
                    (None, Some(e))
                }
            };

            let leitor = hb.as_ref().and_then(|h| h.progresso());
            app.manage(Estado {
                hb: Mutex::new(hb),
                erro_carga: Mutex::new(erro),
                progresso: Mutex::new(leitor),
                params: params.clone(),
                saida_confirmada: Mutex::new(false),
            });

            /*
             * O titulo sai daqui, e nao do tauri.conf.json, porque carrega a
             * VERSAO -- que o build.rs carimba no binario. Um titulo fixo no
             * .json precisaria ser editado a cada release e, esquecido, mentiria
             * sobre qual build esta aberto. O do .json fica como o que a janela
             * mostra no instante entre criar e chegar aqui.
             */
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_title(&titulo_janela());
            }

            // Volta como estava. Sem sessao anterior, abre maximizado -- que e
            // o padrao pedido para uma ferramenta de grade larga.
            if let Some(w) = app.get_webview_window("main") {
                match ler_janela() {
                    Some(j) => {
                        if posicao_visivel(&w, j.x, j.y, j.largura, j.altura) {
                            let _ = w.set_position(tauri::PhysicalPosition::new(j.x, j.y));
                            let _ = w.set_size(tauri::PhysicalSize::new(j.largura, j.altura));
                        } else {
                            // Monitor desligado ou arranjo mudou: a janela ficaria
                            // fora da area visivel e o usuario nao teria como
                            // trazer de volta.
                            log("[qdbu] posicao salva esta fora dos monitores atuais; centralizando");
                            let _ = w.center();
                        }

                        // maximize() DEPOIS de posicionar: ele maximiza no monitor
                        // onde a janela esta. Antes, maximizaria no primario.
                        if j.maximizada {
                            let _ = w.maximize();
                        }
                        log(&format!("[qdbu] janela restaurada: {j:?}"));
                        if let Ok(Some(m)) = w.current_monitor() {
                            log(&format!(
                                "[qdbu] monitor: {:?} em {},{} de {}x{}",
                                m.name().cloned().unwrap_or_default(),
                                m.position().x, m.position().y,
                                m.size().width, m.size().height
                            ));
                        }
                    }
                    None => {
                        let _ = w.maximize();
                        log("[qdbu] sem sessao anterior: janela maximizada");
                    }
                }
            }

            // `generate_context!()` embute app/ui/ no binario em tempo de
            // compilacao, entao mexer no frontend nao aparece sem recompilar o
            // Rust. Com QDBU_UI_DIR apontando para app/ui, servimos do disco pelo
            // protocolo `dev` e um reload basta.
            if let Some(dir) = &ui_dir {
                if let Some(w) = app.get_webview_window("main") {
                    let alvo = if cfg!(windows) {
                        "http://dev.localhost/index.html"
                    } else {
                        "dev://localhost/index.html"
                    };
                    log(&format!("[qdbu] modo dev: servindo {} via {alvo}", dir.display()));
                    match alvo.parse() {
                        Ok(url) => {
                            if let Err(e) = w.navigate(url) {
                                log(&format!("[qdbu] navigate falhou: {e}"));
                            }
                        }
                        Err(e) => log(&format!("[qdbu] url invalida: {e}")),
                    }
                }
            }

            Ok(())
        })
        .on_page_load(|_w, payload| {
            log(&format!("[webview] page_load {:?} url={}", payload.event(), payload.url()));
        })
        .on_window_event(|w, ev| match ev {
            // Anotar em Moved/Resized e o que permite lembrar o monitor quando a
            // janela e fechada maximizada.
            tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                anotar_geometria(w);
            }
            tauri::WindowEvent::CloseRequested { api, .. } => {
                /*
                 * PERGUNTA ANTES, como o DBU fazia no DOS.
                 *
                 * O original perguntava "Sair para o DOS? (S/N)" ao ESC
                 * (`rsvp(DBU_EXITTODOS)`, DBUVIEW.PRG:395) e so entao saia. Um
                 * utilitario que escreve em arquivo de cliente nao deve fechar
                 * por um clique perdido no X.
                 *
                 * A pergunta e feita PELA UI, e nao por um dialogo nativo: e
                 * ela que tem os tres idiomas e o mesmo desenho de todas as
                 * outras perguntas do app. O Rust so avisa que alguem pediu
                 * para fechar; quem responde "sim" chama `confirmar_saida`,
                 * que levanta o trinco e manda fechar de novo -- e ai este
                 * mesmo tratador segue adiante.
                 *
                 * O trinco e o que impede o laco: sem ele o `close()` vindo da
                 * confirmacao cairia aqui e perguntaria outra vez.
                 */
                {
                    let estado = w.state::<Estado>();
                    let mut confirmada = estado.saida_confirmada.lock().unwrap();
                    if !*confirmada {
                        api.prevent_close();
                        if let Err(e) = w.emit("pedido-de-saida", ()) {
                            // A UI nao respondeu ao evento -- prender a pessoa
                            // numa janela que nao fecha e pior que fechar sem
                            // perguntar. Solta o trinco e deixa fechar.
                            log(&format!("[qdbu] nao deu para perguntar sobre a saida: {e}"));
                            *confirmada = true;
                            drop(confirmada);
                            let _ = w.destroy();
                        }
                        return;
                    }
                }

                gravar_janela(w);

                /*
                 * Fechar com tarefa rodando: cancelar E ESPERAR ela parar.
                 *
                 * Cancelar sem esperar seria pior que nao cancelar. O laco
                 * Harbour roda na thread `harbour-vm`; se o processo sair antes
                 * de ela devolver o controle, a thread morre no ponto em que
                 * estiver. Hoje toda a API e leitura e isso nao corrompe nada --
                 * mas quando a T13/T14 entrarem, esse ponto pode ser o meio de
                 * um FieldPut, e o registro fica pela metade no disco.
                 *
                 * Entao: `prevent_close`, pede o cancelamento, e so fecha quando
                 * o laco confirmar que parou. A espera acontece em outra thread
                 * para a janela nao congelar enquanto isso.
                 */
                let leitor = w.state::<Estado>().progresso.lock().unwrap().clone();

                let ativo = leitor.as_ref().map(|p| p.ler().ativo).unwrap_or(false);
                if !ativo {
                    return;
                }

                let p = match leitor {
                    Some(p) => p,
                    None => return,
                };

                p.cancelar();
                api.prevent_close();
                log("[qdbu] fechando com tarefa ativa: aguardando ela parar");

                let janela = w.clone();
                std::thread::spawn(move || {
                    let t0 = std::time::Instant::now();
                    let limite = std::time::Duration::from_secs(15);

                    while t0.elapsed() < limite {
                        if !p.ler().ativo {
                            log(&format!(
                                "[qdbu] tarefa parou em {} ms; fechando",
                                t0.elapsed().as_millis()
                            ));
                            let _ = janela.destroy();
                            return;
                        }
                        std::thread::sleep(std::time::Duration::from_millis(40));
                    }

                    /*
                     * Estourou o prazo: a tarefa nao consulta QDbu_Canceled(), ou
                     * o intervalo entre consultas e grande demais. Fecha assim
                     * mesmo -- prender o usuario numa janela que nao fecha e
                     * pior --, mas deixa registrado, porque isto e BUG da tarefa
                     * e nao comportamento normal.
                     */
                    log("[qdbu] AVISO: tarefa nao parou em 15s; fechando mesmo assim.                          A rotina em curso nao esta consultando QDbu_Canceled().");
                    let _ = janela.destroy();
                });
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            status, executar, rpc, andamento, cancelar, abrir_pasta, confirmar_saida,
            ia_status, ia_configurar, ia_sugerir, ia_historico
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o app Tauri");
}
