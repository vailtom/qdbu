// construtor.js — o construtor de expressão (docs/16).
//
// UM diálogo, seis portas: filtro, chave e FOR do índice, WITH/FOR/WHILE do Em
// massa. Quem chama passa o texto atual e o CONTEXTO (quem chamou, que tipo
// espera, o campo-alvo no REPLACE) e recebe o texto editado — ou null no
// cancelar. O construtor não aplica nada: quem aplica é a tela que o abriu.
//
// O ARTEFATO É TEXTO. A chave de um índice mora como texto no .ntx; FOR, WHILE
// e WITH viram texto. Não há AST aqui — o rascunho é uma string, e desfazer é
// trocar uma string por outra. A DLL só é chamada para conferir (expr.check).
//
// O RASCUNHO VIVE AQUI, não na DLL. Ela não sabe que há um construtor aberto.
//
// Público: quem herdou sistemas em DBF e NÃO domina xBase. Cada decisão de
// desenho abaixo parte disso — placeholders com nome na língua da tela, tipos
// em palavras, "não existe campo X, parecido: Y".

/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta é um script clássico e
 * todos dividem UM escopo global. Só `window.Construtor` sai daqui.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (k, p) => window.I.t(k, p);
  const tipo = (l) => window.I.tipo(l);

  // Placeholder de argumento: «nome» obrigatório, «nome?» opcional. Os
  // guillemets não são caracteres do xBase — nunca compilam por acidente — e
  // o «?» marca opcional porque `[…]` é delimitador de STRING em xBase: um
  // `[«quantidade»]` que a pessoa preenchesse viraria a string "5".
  const PH = /«[^«»]*»/g;
  const PH_OPC = /«[^»]*\?»/;

  const LIMITE_UNDO = 100;
  const RESPIRO_DIGITACAO = 500; // ms sem tecla que fecham um passo de undo
  const RESPIRO_CHECK = 600; // ms sem tecla até o Check automático

  let S = null; // estado do diálogo aberto; null = fechado

  // ------------------------------------------------------------- textarea

  const ta = () => $("cx-expr");

  function valor() {
    return ta().value;
  }

  function fixar(texto, sel) {
    const el = ta();
    el.value = texto;
    S.conhecido = texto;
    if (sel) el.setSelectionRange(sel[0], sel[1]);
    atualizarBotoes();
    agendarCheck(0);
  }

  // ---------------------------------------------------------------- undo

  /*
   * Snapshot por OPERAÇÃO SEMÂNTICA, não por tecla. Um clique da paleta é um
   * passo; uma rajada de digitação é um passo, fechado por RESPIRO_DIGITACAO
   * sem tecla ou ao perder o foco. Ctrl+Z que desfaz por letra é inútil para
   * quem montou a expressão clicando.
   *
   * O snapshot parte de `S.conhecido` — o último texto que este módulo VIU —,
   * e não do evento `beforeinput`. É o que faz o `fill` do CDP (que troca o
   * valor de uma vez) produzir um passo de undo como a digitação produziria.
   */
  function snapshot() {
    const topo = S.undo[S.undo.length - 1];
    if (topo && topo.texto === S.conhecido) return;
    const el = ta();
    S.undo.push({ texto: S.conhecido, sel: [el.selectionStart, el.selectionEnd] });
    if (S.undo.length > LIMITE_UNDO) S.undo.shift();
    S.redo.length = 0;
  }

  function fecharGrupo() {
    if (S.grupo) {
      clearTimeout(S.grupo);
      S.grupo = null;
    }
    S.conhecido = valor();
    atualizarBotoes();
  }

  function aoDigitar() {
    if (!S.grupo) snapshot(); // abre o grupo: o estado ANTES da primeira tecla
    clearTimeout(S.grupo);
    S.grupo = setTimeout(fecharGrupo, RESPIRO_DIGITACAO);
    agendarCheck(RESPIRO_CHECK);
    atualizarBotoes();
  }

  function desfazer() {
    fecharGrupo();
    const p = S.undo.pop();
    if (!p) return;
    const el = ta();
    S.redo.push({ texto: S.conhecido, sel: [el.selectionStart, el.selectionEnd] });
    fixar(p.texto, p.sel);
  }

  function refazer() {
    fecharGrupo();
    const p = S.redo.pop();
    if (!p) return;
    const el = ta();
    S.undo.push({ texto: S.conhecido, sel: [el.selectionStart, el.selectionEnd] });
    fixar(p.texto, p.sel);
  }

  /* Volta ao texto de quando o diálogo abriu — mesmo depois de cem passos. É
     um passo de undo como outro qualquer: dá para desfazer o Restaurar. */
  function restaurar() {
    fecharGrupo();
    if (valor() === S.original) return;
    snapshot();
    fixar(S.original, [S.original.length, S.original.length]);
  }

  function temMudanca() {
    return valor() !== S.original;
  }

  function atualizarBotoes() {
    if (!S) return;
    $("cx-desfazer").disabled = S.undo.length === 0 && !S.grupo;
    $("cx-refazer").disabled = S.redo.length === 0;
    $("cx-restaurar").disabled = valor() === S.original;
  }

  // --------------------------------------------------------- placeholders

  function placeholders(texto) {
    return [...texto.matchAll(PH)].map((m) => ({ ini: m.index, fim: m.index + m[0].length, txt: m[0] }));
  }

  /** Seleciona o próximo (ou anterior) placeholder a partir do cursor. */
  function irParaPlaceholder(recuar) {
    const el = ta();
    const lista = placeholders(el.value);
    if (!lista.length) return false;
    let alvo;
    if (recuar) {
      alvo = [...lista].reverse().find((p) => p.fim <= el.selectionStart) || lista[lista.length - 1];
    } else {
      alvo = lista.find((p) => p.ini >= el.selectionEnd) || lista[0];
    }
    el.focus();
    el.setSelectionRange(alvo.ini, alvo.fim);
    return true;
  }

  /** Placeholders obrigatórios que sobraram — rótulos sem os guillemets. */
  function faltantes(texto) {
    return placeholders(texto).filter((p) => !PH_OPC.test(p.txt)).map((p) => p.txt.slice(1, -1));
  }

  /**
   * O texto pronto para a DLL: opcionais vazios saem COM a vírgula, várias
   * linhas viram uma (hb_macroBlock recebe uma linha). Nunca deixa «» passar.
   */
  function limpo(texto) {
    return texto
      .replace(/,\s*«[^»]*\?»/g, "")
      .replace(/«[^»]*\?»\s*,?\s*/g, "")
      .replace(/\s*\n\s*/g, " ")
      .trim();
  }

  // ------------------------------------------------------------- inserir

  /**
   * Insere `trecho` no cursor (substituindo a seleção) como UM passo de undo.
   * Se `trecho` traz placeholders, o primeiro fica selecionado; senão o
   * cursor vai para o fim do inserido.
   *
   * `envolver`: o texto imediatamente antes do cursor — um identificador, ou
   * uma chamada com parênteses balanceados — vira o primeiro argumento. É o
   * gesto mais comum: clicar em CLI_NOME e depois em Upper tem de dar
   * `Upper( CLI_NOME )`, não `CLI_NOMEUpper( «texto» )`.
   */
  function inserir(trecho, opcoes) {
    const o = opcoes || {};
    const el = ta();
    fecharGrupo();
    snapshot();

    let ini = el.selectionStart;
    const fim = el.selectionEnd;
    const texto = el.value;
    let corpo = trecho;

    // O que vai virar o primeiro argumento: a seleção, ou o identificador /
    // chamada colado ao cursor. Só o PRIMEIRO placeholder recebe (regex sem
    // /g); os demais ficam para o Tab.
    if (o.envolver) {
      let envolto = "";
      if (ini !== fim) {
        envolto = texto.slice(ini, fim);
      } else {
        envolto = trechoAntesDoCursor(texto.slice(0, ini));
        if (envolto) ini -= envolto.length;
      }
      if (envolto) corpo = trecho.replace(/«[^«»]*»/, envolto);
    }

    const novo = texto.slice(0, ini) + corpo + texto.slice(fim);
    const primeiro = corpo.search(PH);
    let sel;
    if (primeiro >= 0) {
      const m = corpo.slice(primeiro).match(PH);
      sel = [ini + primeiro, ini + primeiro + m[0].length];
    } else {
      sel = [ini + corpo.length, ini + corpo.length];
    }
    fixar(novo, sel);
    el.focus();
  }

  /** Identificador, ou chamada `Nome( … )` balanceada, colada ao fim de `s`. */
  function trechoAntesDoCursor(s) {
    if (/\)\s*$/.test(s)) {
      let prof = 0;
      for (let i = s.length - 1; i >= 0; i--) {
        const ch = s[i];
        if (ch === ")") prof++;
        else if (ch === "(") {
          prof--;
          if (prof === 0) {
            const m = /([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(s.slice(0, i));
            return m ? s.slice(i - m[0].length) : s.slice(i);
          }
        }
      }
      return "";
    }
    const m = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(s);
    return m ? m[1] : "";
  }

  // --------------------------------------------------------------- check

  let seqCheck = 0;
  let timerCheck = null;

  function agendarCheck(ms) {
    clearTimeout(timerCheck);
    timerCheck = setTimeout(conferir, ms);
  }

  function status(texto, classe) {
    const el = $("cx-status");
    el.textContent = texto;
    el.className = "cx-status " + (classe || "");
  }

  function valorNaTela(r) {
    const v = r.value == null ? "" : String(r.value);
    if (r.type === "L") return v === ".T." ? T("UI_CX_TRUE") : T("UI_CX_FALSE");
    if (r.type === "C" || r.type === "M") {
      const alvo = S.ctx.alvo;
      if (alvo && alvo.tamanho && (alvo.tipo === "C")) {
        return T("UI_CX_VALUE_LEN", { value: "'" + v + "'", len: v.length, max: alvo.tamanho });
      }
      return "'" + v + "'";
    }
    return v;
  }

  /*
   * A linha de status compõe expr.check numa ida só:
   *   ✓ compila · Lógico · no registro 1 vale Sim
   *   ✗ esperava Lógico — isto devolve Texto
   *   ✗ Não existe campo ou função CLI_NOMEE. Parecido: CLI_NOME
   * Placeholder obrigatório sobrando não vai à DLL: "faltam: texto, início".
   */
  async function conferir() {
    if (!S) return;
    const bruto = valor();
    const meu = ++seqCheck;

    if (!bruto.trim()) {
      status(T("UI_CX_EMPTY"), "");
      S.ultimoCheck = null;
      return;
    }
    const falta = faltantes(bruto);
    if (falta.length) {
      status(T("UI_CX_MISSING", { args: falta.join(", ") }), "aviso");
      S.ultimoCheck = null;
      return;
    }

    const expr = limpo(bruto);
    const expect = S.ctx.expect === "any" ? "" : S.ctx.expect === "M" ? "C" : S.ctx.expect;
    status(T("UI_CX_CHECKING"), "");
    let r;
    try {
      r = await window.QDBU.rpc("expr.check", { h: S.ctx.h, expr, expect });
    } catch (e) {
      if (meu !== seqCheck) return;
      status(T("UI_CX_NOT_COMPILE", { detail: window.I.doErro(e) }), "erro");
      S.ultimoCheck = null;
      return;
    }
    if (meu !== seqCheck) return; // resposta atrasada de um texto que já mudou
    S.ultimoCheck = r;

    if (!r.compiles) {
      if (r.symbol) {
        let msg = T("UI_CX_NO_SYMBOL", { symbol: r.symbol });
        const perto = parecido(r.symbol);
        if (perto) msg += " " + T("UI_CX_SIMILAR", { name: perto });
        status(msg, "erro");
      } else {
        status(T("UI_CX_NOT_COMPILE", { detail: r.error }), "erro");
      }
      return;
    }
    // M devolvido onde se espera C (e vice-versa) é compatível: texto é texto.
    const tipoOk = r.typeOk || (expect === "C" && r.type === "M");
    if (r.evaluated && !tipoOk) {
      status(T("UI_CX_WRONG_TYPE", { expected: tipo(S.ctx.expect), got: tipo(r.type) }), "erro");
      return;
    }
    if (!r.evaluated) {
      status(T("UI_CX_WARNING", { n: r.recno, detail: r.warning }), "aviso");
      return;
    }
    status(T("UI_CX_OK_VALUE", { type: tipo(r.type), n: r.recno, value: valorNaTela(r) }), "ok");
    if (simplificavel(expr)) {
      // Sugere, não impõe: um botão de texto ao lado do status. Aceitar é um
      // passo de undo como outro qualquer.
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cx-simplificar";
      b.textContent = T("UI_CX_SIMPLIFY");
      $("cx-status").appendChild(document.createTextNode(" · "));
      $("cx-status").appendChild(b);
    }
  }

  // "IIf( cond, .T., .F. )" é "cond". Sugere; não impõe.
  const RE_IIF = /^\s*IIf\s*\(\s*([\s\S]+?)\s*,\s*\.T\.\s*,\s*\.F\.\s*\)\s*$/i;
  function simplificavel(expr) {
    const m = RE_IIF.exec(expr);
    if (!m) return null;
    // a condição tem de ser balanceada sozinha, senão o casamento foi por
    // uma vírgula de dentro de outra chamada
    let prof = 0;
    for (const ch of m[1]) {
      if (ch === "(") prof++;
      if (ch === ")") prof--;
      if (prof < 0) return null;
    }
    return prof === 0 ? m[1] : null;
  }

  function simplificar() {
    const c = simplificavel(limpo(valor()));
    if (!c) return;
    fecharGrupo();
    snapshot();
    fixar(c, [c.length, c.length]);
  }

  // ------------------------------------------------------------ parecido

  function distancia(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  }

  /** O campo (ou função do catálogo) mais parecido com `simbolo`, ou "". */
  function parecido(simbolo) {
    const alvo = String(simbolo).toUpperCase();
    const nomes = (S.ctx.campos || []).map((c) => c.name.toUpperCase());
    const cat = window.CATALOGO && window.CATALOGO.funcoes;
    if (cat) for (const k of Object.keys(cat)) nomes.push(k);
    let melhor = "", melhorD = Infinity;
    for (const n of nomes) {
      const d = distancia(alvo, n);
      if (d < melhorD || (d === melhorD && n.startsWith(alvo[0]) && !melhor.startsWith(alvo[0]))) {
        melhor = n; melhorD = d;
      }
    }
    const teto = alvo.length < 5 ? 1 : 2;
    return melhorD <= teto ? melhor : "";
  }

  // ------------------------------------------------------------ diálogo

  function rotuloContexto(ctx) {
    const esp = ctx.expect === "any" ? T("UI_CX_ANY_TYPE") : tipo(ctx.expect);
    let alvo = "";
    if (ctx.alvo && ctx.alvo.tamanho) {
      alvo = ctx.alvo.dec ? ` (${ctx.alvo.tamanho},${ctx.alvo.dec})` : ` (${ctx.alvo.tamanho})`;
    }
    return ctx.rotulo + " · " + T("UI_CX_EXPECTS", { type: esp + alvo });
  }

  function pintarCromo() {
    if (!S) return;
    $("cx-contexto").textContent = rotuloContexto(S.ctx);
    conferir();
  }

  function fechar(resultado) {
    clearTimeout(timerCheck);
    clearTimeout(S.grupo);
    const resolver = S.resolver;
    S = null;
    $("dlg-construtor").close();
    resolver(resultado);
  }

  function usar() {
    fecharGrupo();
    const falta = faltantes(valor());
    if (falta.length) {
      status(T("UI_CX_MISSING", { args: falta.join(", ") }), "erro");
      irParaPlaceholder(false);
      return;
    }
    const pronto = limpo(valor());
    const h = S.ctx.h;
    fechar(pronto);
    if (h) window.QDBU.rpc("expr.history.put", { h, expr: pronto }).catch(() => {});
  }

  /* Esc e Cancelar passam pela mesma porta. Com alteração, pergunta — mesma
     regra do editor de estrutura (esDescartar): fechar sem aviso é barato de
     programar e caro para quem montou vinte cliques. */
  async function sair() {
    fecharGrupo();
    if (!temMudanca()) {
      fechar(null);
      return;
    }
    // `swalBase` e `escapaHtml` vêm do app.js, que carrega DEPOIS deste
    // arquivo -- por nome, não por `window.`: um `const` no topo de um script
    // clássico é visível como nome global e NÃO como propriedade de window.
    // Referenciar por nome é resolvido só quando sair() roda, e aí já existem.
    const r = await Swal.fire(
      swalBase({
        icon: "warning",
        title: T("UI_DISCARD_TITLE"),
        html: escapaHtml(T("UI_CX_DISCARD_ASK")),
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: T("UI_CX_USE"),
        denyButtonText: T("UI_DISCARD"),
        cancelButtonText: T("UI_KEEP_EDITING"),
      })
    );
    if (r.isConfirmed) usar();
    else if (r.isDenied) fechar(null);
  }

  /**
   * Abre o construtor. `ctx`: { h, rotulo, expect, alvo?, campos }.
   * Devolve o texto pronto (sem placeholders opcionais, uma linha) ou null.
   */
  function abrir(texto, ctx) {
    // Já aberto: traz o foco de volta ao que está na tela em vez de rejeitar
    // em silêncio -- foi assim que um teste "abriu a chave" e recebeu o FOR.
    if (S) {
      ta().focus();
      return Promise.resolve(null);
    }
    return new Promise((resolver) => {
      S = {
        ctx: Object.assign({ expect: "any", campos: [] }, ctx || {}),
        original: texto || "",
        conhecido: texto || "",
        undo: [],
        redo: [],
        grupo: null,
        ultimoCheck: null,
        resolver,
      };
      const el = ta();
      el.value = S.original;
      $("cx-status").textContent = "";
      atualizarBotoes();
      pintarCromo();
      if (window.Paleta) window.Paleta.montar(S.ctx, []);
      $("dlg-construtor").showModal();
      el.focus();
      const n = S.original.length;
      el.setSelectionRange(n, n);

      // O histórico chega depois, best-effort: abrir não espera o disco.
      if (S.ctx.h && window.Paleta) {
        window.QDBU.rpc("expr.history.get", { h: S.ctx.h })
          .then((r) => { if (S) window.Paleta.historico(r.expressions || []); })
          .catch(() => {});
      }
    });
  }

  // ------------------------------------------------------------- eventos

  document.addEventListener("DOMContentLoaded", () => {
    const dlg = $("dlg-construtor");
    if (!dlg) return;

    ta().addEventListener("input", aoDigitar);
    ta().addEventListener("blur", () => S && fecharGrupo());

    $("cx-desfazer").addEventListener("click", desfazer);
    $("cx-refazer").addEventListener("click", refazer);
    $("cx-restaurar").addEventListener("click", restaurar);
    $("cx-conferir").addEventListener("click", () => { fecharGrupo(); conferir(); });
    $("cx-usar").addEventListener("click", usar);
    $("cx-cancelar").addEventListener("click", sair);
    $("cx-status").addEventListener("click", (ev) => {
      if (ev.target.closest(".cx-simplificar")) simplificar();
    });

    // O <form method="dialog"> fecharia o diálogo em qualquer submit implícito.
    $("form-construtor").addEventListener("submit", (ev) => ev.preventDefault());
    dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); sair(); });

    /*
     * Teclas do diálogo, na fase de captura: Ctrl+Z/Y são NOSSOS, não do
     * navegador — o undo nativo desfaz por letra e ignora os passos da
     * paleta. Tab só é interceptado quando há placeholder; sem ele o
     * teclado precisa alcançar os botões. Ctrl+Enter = Usar.
     */
    dlg.addEventListener(
      "keydown",
      (ev) => {
        if (!S) return;
        const ctrl = ev.ctrlKey || ev.metaKey;
        if (ctrl && !ev.shiftKey && ev.key.toLowerCase() === "z") { ev.preventDefault(); desfazer(); return; }
        if (ctrl && (ev.key.toLowerCase() === "y" || (ev.shiftKey && ev.key.toLowerCase() === "z"))) { ev.preventDefault(); refazer(); return; }
        if (ctrl && ev.key === "Enter") { ev.preventDefault(); usar(); return; }
        if (ev.key === "Tab" && document.activeElement === ta() && PH.test(ta().value)) {
          PH.lastIndex = 0;
          ev.preventDefault();
          irParaPlaceholder(ev.shiftKey);
          return;
        }
        PH.lastIndex = 0;
      },
      true
    );

    window.addEventListener("idioma-mudou", pintarCromo);
  });

  window.Construtor = { abrir, inserir, limpo, faltantes, trechoAntesDoCursor };
})();
