/**
 * input.mjs - entrada REAL pelo CDP (Input.dispatchMouseEvent / KeyEvent).
 *
 * Existe porque evento sintetico do DOM passa por cima de coisas que o usuario
 * encontra: drag-and-drop nativo, foco, e a captura de drag que o webview faz.
 * Um teste que so dispara `new MouseEvent(...)` aprova codigo que nao funciona.
 *
 * Uso:
 *   node --experimental-websocket input.mjs drag <x1> <y1> <x2> <y2>
 *   node --experimental-websocket input.mjs key  <tecla> [ctrl,shift,alt] [vezes]
 *   node --experimental-websocket input.mjs click <x> <y>
 *   node --experimental-websocket input.mjs dblclick <x> <y>
 *   node --experimental-websocket input.mjs type  <texto>
 */
const PORT = process.env.CDP_PORT || "9333";
const [, , cmd, ...args] = process.argv;

async function alvo() {
  for (const ep of ["/json", "/json/list"]) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${ep}`);
      const d = await r.json();
      const p = (Array.isArray(d) ? d : []).filter((x) => x.type === "page");
      if (p.length) return p.find((x) => (x.url || "").includes("localhost")) || p[0];
    } catch (e) { /* proximo */ }
  }
  throw new Error("nenhuma pagina no CDP");
}

let seq = 0;
function envia(ws, method, params = {}) {
  const id = ++seq;
  return new Promise((ok, err) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener("message", onMsg);
      m.error ? err(new Error(method + ": " + JSON.stringify(m.error))) : ok(m.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Tecla nao imprimivel precisa do codigo virtual do Windows: sem ele o WebView2
// recebe o evento mas nao age -- nao apaga, nao navega.
const CODIGOS = {
  ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40,
  Backspace: 8, Delete: 46, Enter: 13, Escape: 27, Tab: 9,
  Home: 36, End: 35, PageUp: 33, PageDown: 34,
};

const MODS = { ctrl: 2, shift: 8, alt: 1, meta: 4 };
function mods(lista) {
  return (lista || "").split(",").filter(Boolean)
    .reduce((acc, m) => acc | (MODS[m.trim().toLowerCase()] || 0), 0);
}

async function main() {
  const alv = await alvo();
  const ws = await new Promise((ok, err) => {
    const w = new WebSocket(alv.webSocketDebuggerUrl);
    w.addEventListener("open", () => ok(w));
    w.addEventListener("error", (e) => err(new Error("WebSocket: " + e.message)));
  });

  const mouse = (type, x, y, extra = {}) =>
    envia(ws, "Input.dispatchMouseEvent", {
      type, x: Number(x), y: Number(y), button: "left", clickCount: 1, ...extra,
    });

  if (cmd === "drag") {
    const [x1, y1, x2, y2] = args.map(Number);
    await mouse("mousePressed", x1, y1);
    // Passos intermediarios: um unico salto nao dispara o dragover de alguns
    // alvos, e o usuario real move o mouse gradualmente.
    for (let i = 1; i <= 10; i++) {
      await mouse("mouseMoved", x1 + ((x2 - x1) * i) / 10, y1 + ((y2 - y1) * i) / 10,
                  { buttons: 1 });
      await pausa(25);
    }
    await mouse("mouseReleased", x2, y2);
    console.log(`arrastou (${x1},${y1}) -> (${x2},${y2})`);
  } else if (cmd === "click") {
    const [x, y] = args.map(Number);
    await mouse("mousePressed", x, y);
    await mouse("mouseReleased", x, y);
    console.log(`clicou (${x},${y})`);
  } else if (cmd === "dblclick") {
    // Duplo clique de verdade: e o `clickCount: 2` que faz o WebView2 emitir
    // `dblclick`. Dois comandos `click` seguidos NAO servem -- cada um abre uma
    // conexao nova e o intervalo passa do limite do duplo clique.
    const [x, y] = args.map(Number);
    await mouse("mousePressed", x, y, { clickCount: 1 });
    await mouse("mouseReleased", x, y, { clickCount: 1 });
    await mouse("mousePressed", x, y, { clickCount: 2 });
    await mouse("mouseReleased", x, y, { clickCount: 2 });
    console.log(`duplo clique (${x},${y})`);
  } else if (cmd === "key") {
    const [tecla, mm, vezes] = args;
    const m = mods(mm);
    const n = Number(vezes) > 0 ? Number(vezes) : 1;
    const cod = CODIGOS[tecla];
    const base = { key: tecla, code: tecla, modifiers: m,
                   windowsVirtualKeyCode: cod, nativeVirtualKeyCode: cod };
    for (let i = 0; i < n; i++) {
      await envia(ws, "Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
      await envia(ws, "Input.dispatchKeyEvent", { type: "keyUp", ...base });
      await pausa(20);
    }
    console.log(`tecla ${tecla}${m ? " + " + mm : ""}${n > 1 ? " x" + n : ""}`);
  } else if (cmd === "type") {
    // Caractere a caractere, com `text` no keyDown -- e o que faz o campo
    // receber a letra e disparar `input`. Definir so `.value` pelo JS nao passa
    // por nada disso: foi assim que um filtro quebrado passou no teste e falhou
    // na mao do usuario.
    const texto = args.join(" ");
    for (const ch of texto) {
      const cod = ch.toUpperCase().charCodeAt(0);
      await envia(ws, "Input.dispatchKeyEvent", {
        type: "keyDown", text: ch, unmodifiedText: ch, key: ch,
        windowsVirtualKeyCode: cod, nativeVirtualKeyCode: cod,
      });
      await envia(ws, "Input.dispatchKeyEvent", {
        type: "keyUp", key: ch, windowsVirtualKeyCode: cod, nativeVirtualKeyCode: cod,
      });
      await pausa(20);
    }
    console.log(`digitou "${texto}"`);
  } else {
    console.error("comandos: drag | click | dblclick | key | type");
    process.exitCode = 2;
  }

  ws.close();
}

main().catch((e) => {
  console.error("erro: " + e.message);
  process.exitCode = 1;
});
