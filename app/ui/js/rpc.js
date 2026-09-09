// Ponte JS -> Tauri -> DLL.
//
// A API do Tauri v2 chega de duas formas: `window.__TAURI__.core` (so com
// "withGlobalTauri": true) e `window.__TAURI_INTERNALS__` (sempre presente).
// Sem bundler nao da para importar @tauri-apps/api, entao aceitamos as duas.

/*
 * ESCOPO PROPRIO. Sem bundler, todo .js desta pasta e script classico e todos
 * dividem UM escopo global -- e este arquivo declarava treze nomes soltos la
 * (`status`, `rpc`, `invoke`, `rev`...), justamente os mais provaveis de
 * alguem repetir. Um `const` de mesmo nome em outro arquivo derruba o segundo
 * arquivo INTEIRO na analise, sem erro na tela; ja mordeu tres vezes num dia
 * so. So `window.QDBU` atravessa.
 */
(function () {
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

  return; // o diagnostico acima ja e a mensagem; `window.QDBU` nao nasce
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

/** Abre um cmd.exe com a pasta como diretorio corrente. Mesma razao do
    `abrirPasta`: e o sistema operacional, nao o Harbour. */
async function abrirTerminal(caminho, perfil) {
  return invoke("abrir_terminal", { caminho: caminho, perfil: perfil || null });
}

/** Os ids de terminal que EXISTEM nesta maquina. A lista de verdade e do Rust
    (`TERMINAIS`), que e quem abre o processo; a UI so oferece o que voltar. */
async function terminais() {
  return invoke("terminais", {});
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
 * Avisa o Rust de que a pergunta de saida CHEGOU e esta na tela.
 *
 * Sem este aceno o Rust nao teria como distinguir "a pessoa esta lendo a
 * pergunta" de "ninguem ouviu o evento" -- e `emit()` responde Ok nos dois
 * casos. Sem resposta em poucos segundos ele fecha, porque prender alguem
 * numa janela que nao fecha e pior que fechar sem perguntar.
 */
async function saidaPerguntada() {
  return invoke("saida_perguntada");
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

/**
 * A IA do construtor de expressao -- tres comandos Tauri, nenhum pela DLL.
 *
 * A chave NUNCA chega aqui: `iaStatus()` diz se ha uma (`chave_ok`) e como
 * reconhece-la (`chave_marca`, `sk-...abcd`, montada no Rust), e so.
 * `iaConfigurar()` manda a chave uma vez, para o Rust gravar em
 * <raiz>/.qdbu/ia.json; um campo vazio significa "nao mexi", e "-" apaga.
 * `iaSugerir()` leva o prompt ja montado e o pedido, e volta com a
 * expressao -- que cai no rascunho do construtor e passa pelo expr.check
 * antes de a pessoa poder Usar. A IA nunca aplica nada.
 */
async function iaStatus() {
  return invoke("ia_status");
}
async function iaConfigurar(endpoint, modelo, chave, avisoLido) {
  return invoke("ia_configurar", { endpoint, modelo, chave, avisoLido: avisoLido == null ? null : !!avisoLido });
}
/**
 * Os modelos que o servico oferece.
 *
 * Leva endpoint e chave DA TELA porque quem esta configurando do zero ainda
 * nao gravou nada -- sem isso, listar exigiria gravar, fechar e reabrir. Campo
 * vazio faz o Rust usar o que esta no disco, a mesma convencao de
 * `iaConfigurar`.
 */
async function iaModelos(endpoint, chave) {
  return invoke("ia_modelos", { endpoint: endpoint || "", chave: chave || "" });
}
async function iaSugerir(sistema, pedido, arquivo, uso) {
  return invoke("ia_sugerir", { sistema, pedido, arquivo: arquivo || "", uso: uso || "" });
}
async function iaHistorico(limite) {
  return invoke("ia_historico", { limite: limite == null ? null : limite });
}
/**
 * O prompt posto pelo cliente em `<raiz>/.qdbu/prompts/construtor.md`, ou "".
 *
 * Nao da para busca-lo por `fetch`: o protocolo de dev serve `app/ui/`, e no
 * app instalado os assets estao dentro do binario. Quem le o disco e o Rust.
 */
async function iaPrompt() {
  return invoke("ia_prompt");
}

/** Contador de revisao da ultima resposta. Ver session.prg. */
let ultimaRev = 0;
const rev = () => ultimaRev;

window.QDBU = { status, chamar, rpc, rev, abrirPasta, abrirTerminal, terminais, aoEvento, confirmarSaida, saidaPerguntada,
                iaStatus, iaConfigurar, iaModelos, iaSugerir, iaHistorico, iaPrompt, ErroQDbu };
})();
