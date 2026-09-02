/**
 * cdp.mjs - driver Chrome DevTools Protocol para o webview do app Tauri.
 *
 * O WebView2 aceita --remote-debugging-port via a variavel de ambiente
 * WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS. Com a porta aberta da para inspecionar
 * e dirigir a UI de fora do processo, sem devtools visual.
 *
 * Requer Node 20 com --experimental-websocket (use os wrappers .bat/.sh).
 *
 * Uso:
 *   node --experimental-websocket cdp.mjs eval     "<expressao js>"
 *   node --experimental-websocket cdp.mjs evalfile "<arquivo.js>"
 *   node --experimental-websocket cdp.mjs text  "<seletor css>"
 *   node --experimental-websocket cdp.mjs click "<seletor css>"
 *   node --experimental-websocket cdp.mjs fill  "<seletor css>" "<valor>"
 *   node --experimental-websocket cdp.mjs shot  "<arquivo.png>"
 *   node --experimental-websocket cdp.mjs reload
 *   node --experimental-websocket cdp.mjs logs  [segundos]
 *   node --experimental-websocket cdp.mjs html  [seletor]
 *
 * Porta: env CDP_PORT (padrao 9333).
 */

const PORT = process.env.CDP_PORT || "9333";
const [, , cmd, ...args] = process.argv;

async function alvo() {
  // Algumas builds do WebView2 devolvem /json/list vazio; /json sempre funciona.
  let lista = [];
  for (const ep of ["/json", "/json/list"]) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${ep}`);
      const d = await r.json();
      if (Array.isArray(d) && d.length) { lista = d; break; }
    } catch (e) { /* tenta o proximo */ }
  }
  const pages = lista.filter((p) => p.type === "page");
  if (!pages.length) throw new Error("nenhuma pagina encontrada no CDP");
  // Prefere o webview do Tauri, caso a porta tenha mais de um alvo.
  return pages.find((p) => (p.url || "").includes("tauri.localhost")) || pages[0];
}

function conectar(url) {
  return new Promise((ok, err) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => ok(ws));
    ws.addEventListener("error", (e) => err(new Error("falha no WebSocket: " + e.message)));
  });
}

let ws = null;
let seq = 0;
function enviar(ws, method, params = {}) {
  const id = ++seq;
  return new Promise((ok, err) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener("message", onMsg);
      if (m.error) err(new Error(method + ": " + JSON.stringify(m.error)));
      else ok(m.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/** Avalia uma expressao no contexto da pagina e devolve o valor. */
async function avaliar(ws, expr) {
  const r = await enviar(ws, "Runtime.evaluate", {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error(
      "excecao na pagina: " +
        (d.exception?.description || d.text) +
        (d.lineNumber != null ? ` (linha ${d.lineNumber})` : "")
    );
  }
  return r.result?.value;
}

const j = JSON.stringify;

async function main() {
  const alv = await alvo();
  ws = await conectar(alv.webSocketDebuggerUrl);

  if (cmd === "logs") {
    const segs = Number(args[0] || 5);
    await enviar(ws, "Runtime.enable");
    await enviar(ws, "Log.enable");
    console.log(`escutando console/erros por ${segs}s em ${alv.url} ...`);
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Runtime.consoleAPICalled") {
        const txt = m.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ");
        console.log(`[console.${m.params.type}] ${txt}`);
      } else if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        console.log(`[EXCECAO] ${d.exception?.description || d.text}`);
      } else if (m.method === "Log.entryAdded") {
        const e = m.params.entry;
        console.log(`[${e.level}] ${e.text}${e.url ? " @ " + e.url : ""}`);
      }
    });
    await new Promise((r) => setTimeout(r, segs * 1000));
    return;
  }

  if (cmd === "reload") {
    // Recarrega a pagina. Util com app/dev.bat, em que a UI vem de um servidor
    // estatico e nao dos assets embutidos no binario.
    await enviar(ws, "Page.enable");
    await enviar(ws, "Page.reload", { ignoreCache: true });
    console.log("pagina recarregada");
    return;
  }

  if (cmd === "shot") {
    const destino = args[0] || "webview.png";
    const r = await enviar(ws, "Page.captureScreenshot", { format: "png" });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(destino, Buffer.from(r.data, "base64"));
    console.log("screenshot salvo em " + destino);
    return;
  }

  let out;
  switch (cmd) {
    case "eval":
      out = await avaliar(ws, args[0]);
      break;
    // Roteiro de varias linhas nao cabe num argumento de linha de comando: no
    // Windows ele e reinterpretado pelo shell e chega truncado ou com aspas
    // trocadas. Ler de arquivo tira o shell do caminho.
    case "evalfile": {
      const { readFileSync } = await import("node:fs");
      out = await avaliar(ws, readFileSync(args[0], "utf8"));
      break;
    }
    case "text":
      out = await avaliar(ws, `document.querySelector(${j(args[0])})?.innerText ?? null`);
      break;
    case "html":
      out = await avaliar(
        ws,
        args[0]
          ? `document.querySelector(${j(args[0])})?.outerHTML ?? null`
          : "document.body.innerHTML"
      );
      break;
    case "click":
      out = await avaliar(
        ws,
        `(() => { const e = document.querySelector(${j(args[0])});
           if (!e) return "elemento nao encontrado: " + ${j(args[0])};
           e.click(); return "clicado: " + (e.textContent||e.id||e.tagName).trim(); })()`
      );
      break;
    case "fill":
      out = await avaliar(
        ws,
        `(() => { const e = document.querySelector(${j(args[0])});
           if (!e) return "elemento nao encontrado: " + ${j(args[0])};
           e.value = ${j(args[1] ?? "")};
           e.dispatchEvent(new Event("input", {bubbles:true}));
           return "preenchido"; })()`
      );
      break;
    default:
      console.error(
        "comandos: eval | evalfile | text | html | click | fill | shot | reload | logs"
      );
      process.exitCode = 2;
      return;
  }

  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("erro: " + e.message);
  // So sugere o CDP quando o erro e mesmo de conexao; um EPERM ao gravar o
  // screenshot, por exemplo, nao tem nada a ver com a porta.
  if (/fetch|ECONNREFUSED|WebSocket|nenhuma pagina/i.test(e.message)) {
    console.error(
      `dica: o app esta rodando com CDP? use app/run.bat (CDP sobe sozinho em debug, porta ${PORT})`
    );
  }
  process.exitCode = 1;
}).finally(() => {
  // Sem isso o WebSocket segura o event loop e o processo nunca termina
  // quando algo falha antes do fim (ex.: EPERM ao gravar o screenshot).
  try {
    ws?.close();
  } catch (e) {
    /* ja fechado */
  }
});
