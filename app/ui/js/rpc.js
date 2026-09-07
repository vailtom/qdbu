// Ponte JS -> Tauri -> DLL.
//
// A API do Tauri v2 chega de duas formas: `window.__TAURI__.core` (so com
// "withGlobalTauri": true) e `window.__TAURI_INTERNALS__` (sempre presente).
// Sem bundler nao da para importar @tauri-apps/api, entao aceitamos as duas.
const __core =
  (window.__TAURI__ && window.__TAURI__.core) ||
  window.__TAURI_INTERNALS__ ||
  null;

if (!__core || typeof __core.invoke !== "function") {
  const diag = [
    "API do Tauri indisponivel no webview.",
    "",
    "window.__TAURI__           = " + typeof window.__TAURI__,
    "window.__TAURI_INTERNALS__ = " + typeof window.__TAURI_INTERNALS__,
    "",
    'Confira "withGlobalTauri": true em app/src-tauri/tauri.conf.json,',
    "ou se a pagina foi aberta no navegador em vez do app."
  ].join("\n");

  document.addEventListener("DOMContentLoaded", () => {
    const pre = document.createElement("pre");
    pre.style.cssText =
      "padding:24px;color:#e0685f;font:13px monospace;white-space:pre-wrap";
    pre.textContent = diag;
    document.body.innerHTML = "";
    document.body.appendChild(pre);
  });

  throw new Error("API do Tauri indisponivel");
}

const invoke = __core.invoke;

/** Estado da DLL: carregada, caminho, arquitetura, caminho do log. */
async function status() {
  return invoke("status");
}

/**
 * Abre a pasta no Explorer do Windows.
 *
 * Nao passa pela DLL: e o sistema operacional, nao o Harbour. Por isso e um
 * comando Tauri proprio, e nao um metodo do envelope.
 */
async function abrirPasta(caminho) {
  return invoke("abrir_pasta", { caminho: caminho });
}

/** Chamada crua `funcao(argumento) -> string`. Sem envelope. */
async function chamar(func, arg) {
  const r = await invoke("executar", { func: func, arg: arg || "" });
  return r.saida;
}

/**
 * Erro de NEGOCIO devolvido pelo Harbour: o usuario pediu algo invalido.
 * Tem codigo estavel e, as vezes, o campo culpado -- da para destacar na tela.
 * Diferente de falha de runtime, que vira excecao comum.
 */
class ErroQDbu extends Error {
  constructor(erro, metodo) {
    // `message` e o texto em ingles que o Harbour montou. Ele NAO e o que vai
    // para a tela: serve ao log e a quem chama a DLL sem dicionario (o cliente
    // em C, um script). A frase que o usuario le sai de I.doErro(), a partir do
    // codigo e dos params -- ver app/ui/js/i18n.js.
    super(erro.message || "unidentified error");
    this.name = "ErroQDbu";
    this.codigo = erro.code || "ERROR_UNSPECIFIED";
    this.campo = erro.field || null;
    this.params = erro.params || {};
    this.metodo = metodo;
  }
}

/**
 * Chamada com envelope: `rpc("workspace.files", {nome: "Cliente A"})`.
 *
 * O id de correlacao e gerado no Rust -- aqui nao se pensa nisso. Sucesso
 * devolve o `result` direto; recusa de negocio vira ErroQDbu.
 */
async function rpc(metodo, params) {
  const resp = await invoke("rpc", { metodo: metodo, params: params || {} });

  if (!resp.ok) {
    throw new ErroQDbu(resp.error || {}, metodo);
  }

  ultimaRev = resp.rev;
  return resp.result;
}

/**
 * Escuta um evento emitido pelo Rust.
 *
 * O `event` so existe em `window.__TAURI__` -- ele NAO esta no
 * `__TAURI_INTERNALS__`, que e a via de reserva do `invoke`. Como o unico
 * evento hoje e a pergunta de saida, e o Rust ja trata o caso de ninguem
 * responder (fecha em vez de prender a janela), a ausencia so precisa nao
 * quebrar o resto do arranque.
 */
async function aoEvento(nome, fn) {
  const ev = window.__TAURI__ && window.__TAURI__.event;
  if (!ev || typeof ev.listen !== "function") return null;
  return ev.listen(nome, fn);
}

/**
 * Responde "sim" a pergunta de saida.
 *
 * O Rust levanta o trinco e manda fechar de novo; o resto do fechamento
 * (gravar a geometria, esperar a tarefa parar) acontece la, uma vez so.
 */
async function confirmarSaida() {
  return invoke("confirmar_saida");
}

/** Contador de revisao da ultima resposta. Ver session.prg. */
let ultimaRev = 0;
const rev = () => ultimaRev;

window.QDBU = { status, chamar, rpc, rev, abrirPasta, aoEvento, confirmarSaida, ErroQDbu };
