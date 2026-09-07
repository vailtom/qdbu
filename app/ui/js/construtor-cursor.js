// construtor-cursor.js — o que vive JUNTO DO CURSOR no construtor de
// expressão: o IntelliSense (sugestões enquanto se digita) e a dica
// flutuante (a assinatura da função em que o cursor está, com o argumento
// atual destacado).
//
// São as duas coisas que o Expression Builder do Access faz na própria caixa,
// e as duas dependem da mesma pergunta que um <textarea> não sabe responder:
// ONDE está o cursor, em pixels. A resposta vem de um div-espelho — um clone
// invisível do textarea, com a mesma fonte, o mesmo padding e a mesma largura,
// onde o texto até o cursor é seguido de um <span>. A posição do span É a do
// cursor. É a técnica que todo editor em textarea usa; não há API para isso.
//
// A dica fixa (embaixo das colunas) descreve o item SELECIONADO na lista; esta
// descreve a função ONDE O CURSOR ESTÁ. Não são a mesma informação — uma é "o
// que é isto que estou olhando", a outra é "onde estou dentro do que estou
// escrevendo" (decisão do autor, 07/09/2026).

/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta é um script clássico e
 * todos dividem UM escopo global. Nada sai daqui: o módulo se liga por eventos.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (k, p) => window.I.t(k, p);
  const tipo = (l) => window.I.tipo(l);

  const MAX_SUGESTOES = 8;

  let sugestoes = []; // [{ id, rotulo, sub, inserir }]
  let ativa = -1;
  let palavraIni = -1; // onde começa a palavra sendo digitada

  // ------------------------------------------------------------ espelho

  /**
   * Coordenadas (relativas ao .cx-editor) do caractere na posição `pos`.
   * O espelho copia o que decide a quebra de linha: fonte, padding, borda,
   * largura, white-space. Mudou o CSS do textarea, mudou aqui — por isso
   * copia do computado, não repete valores.
   */
  function coordenadaDe(pos) {
    const ta = $("cx-expr");
    const esp = $("cx-espelho");
    const c = getComputedStyle(ta);
    for (const p of ["font", "lineHeight", "letterSpacing", "padding", "borderWidth", "boxSizing", "whiteSpace", "wordWrap", "overflowWrap"]) {
      esp.style[p] = c[p];
    }
    esp.style.width = c.width;
    esp.textContent = "";
    esp.appendChild(document.createTextNode(ta.value.slice(0, pos)));
    const marca = document.createElement("span");
    marca.textContent = ta.value.slice(pos, pos + 1) || ".";
    esp.appendChild(marca);
    return {
      x: marca.offsetLeft - ta.scrollLeft,
      y: marca.offsetTop - ta.scrollTop,
      h: marca.offsetHeight || parseFloat(c.lineHeight) || 18,
    };
  }

  function posicionar(el, pos) {
    const c = coordenadaDe(pos);
    const editor = $("cx-expr").parentElement;
    el.style.left = Math.max(0, Math.min(c.x, editor.clientWidth - el.offsetWidth - 4)) + "px";
    el.style.top = c.y + c.h + 4 + "px";
  }

  // ------------------------------------------------------ IntelliSense

  /** A palavra (identificador) imediatamente antes do cursor, ou null. */
  function palavraNoCursor() {
    const ta = $("cx-expr");
    if (ta.selectionStart !== ta.selectionEnd) return null;
    const antes = ta.value.slice(0, ta.selectionStart);
    const m = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(antes);
    if (!m) return null;
    // Dentro de string literal não se sugere nada.
    const aspas = (antes.match(/"/g) || []).length % 2 || (antes.match(/'/g) || []).length % 2;
    if (aspas) return null;
    return { texto: m[1], ini: antes.length - m[1].length };
  }

  function esconderSugestoes() {
    const ul = $("cx-sugestoes");
    ul.hidden = true;
    ul.textContent = "";
    sugestoes = [];
    ativa = -1;
  }

  function mostrarSugestoes(forcar) {
    const p = palavraNoCursor();
    if (!p || (!forcar && p.texto.length < 2)) { esconderSugestoes(); return; }
    if (!window.Paleta || !window.Paleta.candidatos) { esconderSugestoes(); return; }

    sugestoes = window.Paleta.candidatos(p.texto).slice(0, MAX_SUGESTOES);
    if (!sugestoes.length) { esconderSugestoes(); return; }
    palavraIni = p.ini;
    ativa = 0;

    const ul = $("cx-sugestoes");
    ul.textContent = "";
    sugestoes.forEach((s, i) => {
      const li = document.createElement("li");
      li.dataset.i = i;
      li.className = i === ativa ? "ativa" : "";
      const rot = document.createElement("span");
      rot.className = "cx-rot";
      rot.textContent = s.sub || s.rotulo;
      li.appendChild(rot);
      if (s.sub && s.rotulo !== s.sub) {
        const sub = document.createElement("span");
        sub.className = "cx-sub";
        sub.textContent = s.rotulo;
        li.appendChild(sub);
      }
      ul.appendChild(li);
    });
    ul.hidden = false;
    posicionar(ul, palavraIni);
  }

  function moverAtiva(delta) {
    if (!sugestoes.length) return;
    ativa = (ativa + delta + sugestoes.length) % sugestoes.length;
    for (const li of $("cx-sugestoes").children) li.classList.toggle("ativa", Number(li.dataset.i) === ativa);
  }

  /**
   * Aceitar uma sugestão SUBSTITUI a palavra que estava sendo digitada — o
   * `Up` vira `Upper( «texto» )`, não `UpUpper(...)`. Seleciona a palavra e
   * deixa `inserir()` trocar a seleção; com a seleção não-vazia, `envolver`
   * não age (não há o que envolver além da própria palavra).
   */
  function aceitarSugestao() {
    const s = sugestoes[ativa];
    if (!s) return false;
    const ta = $("cx-expr");
    ta.setSelectionRange(palavraIni, ta.selectionStart);
    esconderSugestoes();
    s.inserir({ semEnvolver: true });
    return true;
  }

  // --------------------------------------------------- dica flutuante

  /**
   * A chamada em que o cursor está: { nome, arg } ou null.
   *
   * Varredura para a frente até o cursor com uma pilha: identificador seguido
   * de `(` empilha; `,` no nível avança o argumento; `)` desempilha. Strings
   * (`"…"`, `'…'`, `[…]`) são puladas — vírgula dentro de aspas não conta.
   */
  function contextoDaChamada(texto, pos) {
    const pilha = [];
    let i = 0;
    while (i < pos) {
      const ch = texto[i];
      if (ch === '"' || ch === "'") {
        const fim = texto.indexOf(ch, i + 1);
        i = fim < 0 ? pos : fim + 1;
        continue;
      }
      if (ch === "[") {
        const fim = texto.indexOf("]", i + 1);
        i = fim < 0 ? pos : fim + 1;
        continue;
      }
      if (ch === "(") {
        const m = /([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(texto.slice(0, i));
        pilha.push({ nome: m ? m[1] : "", arg: 0 });
      } else if (ch === ")") {
        pilha.pop();
      } else if (ch === "," && pilha.length) {
        pilha[pilha.length - 1].arg++;
      }
      i++;
    }
    for (let k = pilha.length - 1; k >= 0; k--) if (pilha[k].nome) return pilha[k];
    return null;
  }

  function funcaoDoCatalogo(nome) {
    const cat = window.CATALOGO;
    if (!cat) return null;
    let k = nome.toUpperCase();
    if (cat.aliases && cat.aliases[k]) k = cat.aliases[k];
    return cat.funcoes[k] ? { chave: k, f: cat.funcoes[k] } : null;
  }

  function rotuloArg(a) {
    const k = "UI_ARG_" + a.n.toUpperCase();
    const r = T(k);
    return r === k ? tipo(a.t) || a.n : r;
  }

  function pintarDicaFlutuante() {
    const dica = $("cx-dica-flutuante");
    const ta = $("cx-expr");
    if (ta.selectionStart !== ta.selectionEnd && !/«/.test(ta.value)) { dica.hidden = true; return; }
    const ctx = contextoDaChamada(ta.value, ta.selectionStart);
    const achado = ctx && funcaoDoCatalogo(ctx.nome);
    if (!achado) { dica.hidden = true; return; }

    const { chave, f } = achado;
    dica.textContent = "";
    const linha = document.createElement("div");
    linha.className = "cx-dica-ass";
    linha.appendChild(document.createTextNode(f.nome + "( "));
    f.args.forEach((a, i) => {
      if (i) linha.appendChild(document.createTextNode(", "));
      const s = document.createElement(i === ctx.arg || (a.rest && ctx.arg >= i) ? "b" : "span");
      s.textContent = a.opc ? "[" + rotuloArg(a) + "]" : rotuloArg(a);
      linha.appendChild(s);
    });
    linha.appendChild(document.createTextNode(" ) → " + (f.ret === "any" ? T("UI_CX_ANY_TYPE") : tipo(f.ret))));
    dica.appendChild(linha);

    const arg = f.args[Math.min(ctx.arg, f.args.length - 1)];
    const desc = document.createElement("div");
    desc.className = "cx-dica-desc";
    const dk = "UI_FN_" + chave + "_DESC";
    const d = T(dk);
    if (arg && f.args.length) {
      desc.textContent = T("UI_CX_ARG_NOW", { n: Math.min(ctx.arg, f.args.length - 1) + 1, name: rotuloArg(arg), type: arg.t === "any" ? T("UI_CX_ANY_TYPE") : tipo(arg.t) });
    } else {
      desc.textContent = d === dk ? f.one : d;
    }
    dica.appendChild(desc);

    dica.hidden = false;
    // Abaixo da linha do cursor; se o dropdown está aberto, ele tem prioridade.
    if (!$("cx-sugestoes").hidden) { dica.hidden = true; return; }
    posicionar(dica, ta.selectionStart);
  }

  // ------------------------------------------------------------- eventos

  document.addEventListener("DOMContentLoaded", () => {
    const ta = $("cx-expr");
    if (!ta) return;

    ta.addEventListener("input", () => { mostrarSugestoes(false); pintarDicaFlutuante(); });
    ta.addEventListener("click", () => { esconderSugestoes(); pintarDicaFlutuante(); });
    ta.addEventListener("keyup", (ev) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)) pintarDicaFlutuante();
    });
    ta.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== ta) { esconderSugestoes(); $("cx-dica-flutuante").hidden = true; } }, 120));
    ta.addEventListener("scroll", () => { if (!$("cx-sugestoes").hidden) posicionar($("cx-sugestoes"), palavraIni); });

    // Com o dropdown aberto, setas/Tab/Enter/Esc são dele; fechado, passam
    // adiante. Este ouvinte é de BOLHA no textarea, então o ouvinte de
    // captura do diálogo roda antes dele -- quem cede o Tab é aquele lá,
    // conferindo `#cx-sugestoes`. O `stopPropagation()` daqui serve ao que
    // vem DEPOIS na bolha, não ao que já passou.
    ta.addEventListener("keydown", (ev) => {
      if (ev.ctrlKey && ev.key === " ") { ev.preventDefault(); mostrarSugestoes(true); return; }
      if ($("cx-sugestoes").hidden) return;
      switch (ev.key) {
        case "ArrowDown": ev.preventDefault(); ev.stopPropagation(); moverAtiva(1); return;
        case "ArrowUp": ev.preventDefault(); ev.stopPropagation(); moverAtiva(-1); return;
        case "Tab":
        case "Enter": ev.preventDefault(); ev.stopPropagation(); aceitarSugestao(); return;
        case "Escape": ev.preventDefault(); ev.stopPropagation(); esconderSugestoes(); return;
      }
    }, true);

    const ul = $("cx-sugestoes");
    ul.addEventListener("mousedown", (ev) => ev.preventDefault());
    ul.addEventListener("click", (ev) => {
      const li = ev.target.closest("li[data-i]");
      if (!li) return;
      ativa = Number(li.dataset.i);
      aceitarSugestao();
    });

    // Quando o editor fixa um texto por conta própria (inserir, undo), o
    // cursor mudou sem tecla -- a dica acompanha.
    window.addEventListener("construtor-mudou", () => { esconderSugestoes(); pintarDicaFlutuante(); });
    window.addEventListener("idioma-mudou", pintarDicaFlutuante);
  });
})();
