// Sem console, nem em dev: a janela extra de terminal nao serve para nada
// quando o diagnostico e feito por CDP (ver app/devtools/cdp.mjs).
// Em troca, tudo que iria para o stderr vai para um arquivo de log -- ver
// `log()` abaixo e o campo `log` de StatusDll, que a UI mostra no rodape.
#![windows_subsystem = "windows"]

mod dbudll;

use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Instant;

use dbudll::Harbour;
use serde::Serialize;
use tauri::{Manager, State};

/// Porta do Chrome DevTools Protocol do WebView2.
///
/// O CDP fica SEMPRE ligado em build de debug: e por ele que a UI e validada
/// (o webview nao tem console, e um erro de sintaxe no JS deixa a tela morta
/// sem sinal em lugar nenhum). Ver app/devtools/cdp.bat.
///
/// 9333 e nao 9222 de proposito: a 9222 costuma estar ocupada pelo Chrome.
/// Sobrescrevivel por DBU_CDP_PORT; `DBU_CDP_PORT=0` desliga.
const CDP_PORT_PADRAO: &str = "9333";

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
/// `dbudll.hbp`. O projeto e autocontido: tudo que ele gera (log, dados do
/// WebView2, binarios) fica sob esta pasta, nunca em %TEMP% ou %LOCALAPPDATA%.
fn raiz_projeto() -> Option<PathBuf> {
    let exe = env::current_exe().ok()?;
    let mut dir = exe.parent()?.to_path_buf();
    for _ in 0..8 {
        if dir.join("dbudll.hbp").is_file() {
            return Some(dir);
        }
        dir = dir.parent()?.to_path_buf();
    }
    None
}

/// Pasta de artefatos de execucao, dentro do projeto: `<raiz>/.run`.
fn dir_run() -> PathBuf {
    let base = raiz_projeto().unwrap_or_else(env::temp_dir);
    let d = base.join(".run");
    let _ = std::fs::create_dir_all(&d);
    d
}

/// Arquivo de log: `DBU_LOG` se definida, senao `<raiz>/.run/dbu-console.log`.
fn caminho_log() -> &'static Path {
    LOG_PATH.get_or_init(|| {
        env::var("DBU_LOG")
            .map(PathBuf::from)
            .ok()
            .unwrap_or_else(|| dir_run().join("dbu-console.log"))
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
    progresso: Mutex<Option<Arc<dbudll::Progresso>>>,
}

#[derive(Serialize)]
struct StatusDll {
    carregada: bool,
    caminho: String,
    erro: Option<String>,
    arch_app: &'static str,
    log: String,
    cdp: String,
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

/// Procura dbudll.dll em locais previsiveis, do mais especifico ao mais generico.
fn achar_dll() -> PathBuf {
    if let Ok(p) = env::var("DBU_DLL") {
        let p = PathBuf::from(p);
        if p.is_file() {
            return p;
        }
    }

    let mut candidatos: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidatos.push(dir.join("dbudll.dll"));
            // rodando de target/i686-pc-windows-msvc/debug/ -> sobe ate a raiz
            for n in 1..=5 {
                let mut up = dir.to_path_buf();
                for _ in 0..n {
                    up = match up.parent() {
                        Some(p) => p.to_path_buf(),
                        None => break,
                    };
                }
                candidatos.push(up.join("bin").join("dbudll.dll"));
            }
        }
    }

    if let Ok(cwd) = env::current_dir() {
        candidatos.push(cwd.join("bin").join("dbudll.dll"));
        candidatos.push(cwd.join("dbudll.dll"));
    }

    for c in &candidatos {
        if c.is_file() {
            return c.clone();
        }
    }

    candidatos.into_iter().next().unwrap_or_else(|| PathBuf::from("dbudll.dll"))
}

#[tauri::command]
fn status(estado: State<Estado>) -> StatusDll {
    log("[dbu] status() chamado pelo frontend");
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
            .unwrap_or_else(|| "dbudll.dll nao carregada".to_string())
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
            .unwrap_or_else(|| "dbudll.dll nao carregada".to_string())
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
async fn andamento(estado: State<'_, Estado>) -> Result<Option<dbudll::Andamento>, String> {
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
            "32-bit (i686) - OK para dbudll.dll"
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
        hb.exec("Api_Meta_Ping", "dbu").as_deref(),
        Ok("pong:dbu"),
    );
    t.contem(
        "meta: Api_Version identifica o produto",
        hb.exec("Api_Meta_Version", ""),
        "dbu-harbour",
    );
    t.contem(
        "meta: funcao inexistente vira recusa, nao crash",
        hb.exec("Nao_Existe", ""),
        "ERR:",
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

/// Geometria da janela, persistida em `<raiz>/.dbu/janela.json`.
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
    let base = raiz_projeto().unwrap_or_else(|| {
        env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()))
            .unwrap_or_else(env::temp_dir)
    });
    let dir = base.join(".dbu");
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
                log(&format!("[dbu] nao gravou janela.json: {e}"));
            }
        }
        Err(e) => log(&format!("[dbu] nao serializou a janela: {e}")),
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
/// Ligado por `DBU_UI_DIR` apontando para a pasta `app/ui`. Ver app/dev.bat.
fn mime_de(caminho: &str) -> &'static str {
    match caminho.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
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

    let porta = env::var("DBU_CDP_PORT").unwrap_or_else(|_| CDP_PORT_PADRAO.to_string());
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
/// comportamento. `DBU_UI_DIR` continua valendo para apontar outra pasta, e
/// `DBU_UI_EMBUTIDA=1` forca os assets embutidos para testar o que o usuario
/// final recebe.
fn dir_da_ui() -> Option<PathBuf> {
    if let Ok(dir) = env::var("DBU_UI_DIR") {
        return Some(PathBuf::from(dir));
    }

    if !cfg!(debug_assertions) || env::var("DBU_UI_EMBUTIDA").is_ok() {
        return None;
    }

    let dir = raiz_projeto()?.join("app").join("ui");
    if dir.join("index.html").is_file() {
        Some(dir)
    } else {
        None
    }
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

    if env::args().any(|a| a == "--selftest") {
        #[cfg(windows)]
        anexar_console_do_pai();
        std::process::exit(selftest());
    }

    // WebView2 guarda cache e cookies em %LOCALAPPDATA%\<identifier> por padrao.
    // O projeto e autocontido, entao apontamos para dentro dele -- isso tambem
    // torna trivial limpar o estado do webview: apagar .run/webview2.
    if env::var("WEBVIEW2_USER_DATA_FOLDER").is_err() {
        env::set_var("WEBVIEW2_USER_DATA_FOLDER", dir_run().join("webview2"));
    }

    match liga_cdp() {
        Some(p) => log(&format!("[dbu] CDP ativo na porta {p} -- devtools/cdp.bat")),
        None => log("[dbu] CDP desligado"),
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
            log(&format!("[dbu] procurando DLL: {}", caminho.display()));
            let (hb, erro) = match Harbour::iniciar(caminho) {
                Ok(h) => {
                    log("[dbu] DLL carregada, HbStart ok");
                    (Some(h), None)
                }
                Err(e) => {
                    log(&format!("[dbu] FALHOU ao carregar a DLL: {e}"));
                    (None, Some(e))
                }
            };

            let leitor = hb.as_ref().and_then(|h| h.progresso());
            app.manage(Estado {
                hb: Mutex::new(hb),
                erro_carga: Mutex::new(erro),
                progresso: Mutex::new(leitor),
            });

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
                            log("[dbu] posicao salva esta fora dos monitores atuais; centralizando");
                            let _ = w.center();
                        }

                        // maximize() DEPOIS de posicionar: ele maximiza no monitor
                        // onde a janela esta. Antes, maximizaria no primario.
                        if j.maximizada {
                            let _ = w.maximize();
                        }
                        log(&format!("[dbu] janela restaurada: {j:?}"));
                        if let Ok(Some(m)) = w.current_monitor() {
                            log(&format!(
                                "[dbu] monitor: {:?} em {},{} de {}x{}",
                                m.name().cloned().unwrap_or_default(),
                                m.position().x, m.position().y,
                                m.size().width, m.size().height
                            ));
                        }
                    }
                    None => {
                        let _ = w.maximize();
                        log("[dbu] sem sessao anterior: janela maximizada");
                    }
                }
            }

            // `generate_context!()` embute app/ui/ no binario em tempo de
            // compilacao, entao mexer no frontend nao aparece sem recompilar o
            // Rust. Com DBU_UI_DIR apontando para app/ui, servimos do disco pelo
            // protocolo `dev` e um reload basta.
            if let Some(dir) = &ui_dir {
                if let Some(w) = app.get_webview_window("main") {
                    let alvo = if cfg!(windows) {
                        "http://dev.localhost/index.html"
                    } else {
                        "dev://localhost/index.html"
                    };
                    log(&format!("[dbu] modo dev: servindo {} via {alvo}", dir.display()));
                    match alvo.parse() {
                        Ok(url) => {
                            if let Err(e) = w.navigate(url) {
                                log(&format!("[dbu] navigate falhou: {e}"));
                            }
                        }
                        Err(e) => log(&format!("[dbu] url invalida: {e}")),
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
                log("[dbu] fechando com tarefa ativa: aguardando ela parar");

                let janela = w.clone();
                std::thread::spawn(move || {
                    let t0 = std::time::Instant::now();
                    let limite = std::time::Duration::from_secs(15);

                    while t0.elapsed() < limite {
                        if !p.ler().ativo {
                            log(&format!(
                                "[dbu] tarefa parou em {} ms; fechando",
                                t0.elapsed().as_millis()
                            ));
                            let _ = janela.destroy();
                            return;
                        }
                        std::thread::sleep(std::time::Duration::from_millis(40));
                    }

                    /*
                     * Estourou o prazo: a tarefa nao consulta Dbu_Canceled(), ou
                     * o intervalo entre consultas e grande demais. Fecha assim
                     * mesmo -- prender o usuario numa janela que nao fecha e
                     * pior --, mas deixa registrado, porque isto e BUG da tarefa
                     * e nao comportamento normal.
                     */
                    log("[dbu] AVISO: tarefa nao parou em 15s; fechando mesmo assim.                          A rotina em curso nao esta consultando Dbu_Canceled().");
                    let _ = janela.destroy();
                });
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            status, executar, rpc, andamento, cancelar, abrir_pasta
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o app Tauri");
}
