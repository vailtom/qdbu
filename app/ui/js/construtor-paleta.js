// construtor-paleta.js — as três colunas do construtor de expressão:
// Elementos → Categorias → Valores, com busca nos três idiomas e ranking
// pelo tipo esperado.
//
// Separado de construtor.js de propósito: aquele é o EDITOR (rascunho,
// desfazer, status, Usar); este é o que se NAVEGA para inserir. Os dois se
// falam por uma interface pequena — `Construtor.inserir()` de lá para cá, e
// `Paleta.montar(ctx)` daqui para lá.
//
// RANKING, NUNCA FILTRO. Com destino Lógico, comparações e Empty() vêm em
// cima; Upper() vem embaixo — mas vem. Um campo Lógico pode receber
// `IIf(idade >= 18 .AND. Upper(AllTrim(PAIS)) == "BR", .T., .F.)`: a raiz é
// L, e dentro há Texto, Número e funções de texto. Esconder o que não devolve
// L impediria justamente isso. "Todas" fica sempre a um clique.

/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta é um script clássico e
 * todos dividem UM escopo global. Só `window.Paleta` sai daqui.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (k, p) => window.I.t(k, p);
  const tipo = (l) => window.I.tipo(l);

  const ELEMENTOS = ["CAMPOS", "FUNCOES", "OPERADORES", "CONSTANTES", "HISTORICO"];

  /*
   * Operadores: rótulo · símbolo. Aparece a palavra (o público não sabe o que
   * `$` faz); insere-se o símbolo (é o que compila). Na terceira vez a pessoa
   * já sabe.
   *
   * `ret` é o tipo que o operador PRODUZ — é o que o ranking lê. Comparação e
   * lógicos produzem L; aritmética produz o tipo dos operandos (any).
   *
   * `=` e `==`: os dois, rotulados "igual" e "exatamente igual" (decisão do
   * autor). A descrição do `=` é o único aviso que a pessoa vai ter de que
   * ele casa por prefixo — por isso ela diz "MA" é igual a "MARIA".
   */
  const OPERADORES = [
    { id: "IGUAL", s: "=", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "EXATO", s: "==", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "DIF", s: "<>", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "LT", s: "<", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "GT", s: ">", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "LE", s: "<=", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "GE", s: ">=", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "CONTEM", s: "$", cat: "COMPARACAO", ret: "L", bin: true },
    { id: "AND", s: ".AND.", cat: "LOGICOS", ret: "L", bin: true },
    { id: "OR", s: ".OR.", cat: "LOGICOS", ret: "L", bin: true },
    { id: "NOT", s: ".NOT.", cat: "LOGICOS", ret: "L", pre: true },
    { id: "MAIS", s: "+", cat: "ARITMETICA", ret: "any", bin: true },
    { id: "MENOS", s: "-", cat: "ARITMETICA", ret: "any", bin: true },
    { id: "VEZES", s: "*", cat: "ARITMETICA", ret: "N", bin: true },
    { id: "DIV", s: "/", cat: "ARITMETICA", ret: "N", bin: true },
    { id: "RESTO", s: "%", cat: "ARITMETICA", ret: "N", bin: true },
    { id: "POT", s: "^", cat: "ARITMETICA", ret: "N", bin: true },
    { id: "PAREN", s: "( «expressão» )", cat: "AGRUPAMENTO", ret: "any" },
  ];

  const CONSTANTES = [
    { id: "TRUE", s: ".T.", ret: "L" },
    { id: "FALSE", s: ".F.", ret: "L" },
    { id: "EMPTY_STR", s: '""', ret: "C" },
    { id: "ZERO", s: "0", ret: "N" },
    { id: "TODAY", s: "Date()", ret: "D" },
    { id: "EMPTY_DATE", s: 'CToD("")', ret: "D" },
  ];

  // Ordem das categorias de função na coluna do meio, quando não há busca.
  const CATS_FN = ["TEXTO", "NUMERO", "DATA", "CONVERSAO", "GERAL", "BANCO", "VETOR", "AMBIENTE"];
  const CATS_OP = ["COMPARACAO", "LOGICOS", "ARITMETICA", "AGRUPAMENTO"];

  let S = null; // { ctx, elemento, categoria, busca, item }

  // ----------------------------------------------------------- normalizar

  /** minúscula, sem acento, pontuação → espaço: "Maiúsculas()" → "maiusculas". */
  function norm(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /*
   * O índice de busca de uma função: nome Harbour + rótulo, descrição e
   * palavras-chave NOS TRÊS IDIOMAS. Lê window.I18N direto porque `T()` só
   * responde pelo idioma ativo — e a tela em pt-BR tem de achar `Upper` por
   * "uppercase" e por "mayúsculas" também.
   */
  const cacheIndice = new Map();
  function indiceDe(chave, f) {
    if (cacheIndice.has(chave)) return cacheIndice.get(chave);
    const termos = [{ t: norm(f.nome), peso: 100, visivel: true, cru: f.nome }];
    const dic = window.I18N || {};
    const atual = window.I.idioma();
    for (const cod of Object.keys(dic)) {
      const d = dic[cod];
      const rot = d["UI_FN_" + chave];
      if (rot) termos.push({ t: norm(rot), peso: 80, visivel: cod === atual, cru: rot });
      const kw = d["UI_FN_" + chave + "_KW"];
      if (kw) for (const k of kw.split(";")) termos.push({ t: norm(k), peso: 60, visivel: false, cru: k.trim() });
      const desc = d["UI_FN_" + chave + "_DESC"];
      if (desc) termos.push({ t: norm(desc), peso: 20, visivel: cod === atual, cru: desc });
    }
    cacheIndice.set(chave, termos);
    return termos;
  }
  window.addEventListener("idioma-mudou", () => cacheIndice.clear());

  /**
   * Pontuação de um item contra a busca; 0 = não casa. Devolve também POR QUÊ.
   *
   * Dois cuidados que a primeira versão não tinha, os dois vistos no teste:
   *
   * - O termo VISÍVEL ganha do invisível quando os dois casam. Buscar
   *   "maiusculas" com o rótulo "Converter para maiúsculas" na tela dizia
   *   "encontrado por: maiúsculas" -- porque a palavra-chave (exata, 60)
   *   batia o rótulo (contém, 80×0.3). Achar pelo que está escrito na tela
   *   nunca é "encontrado por".
   * - Palavra INTEIRA vale mais que trecho. "uppercase" casa inteira em Upper
   *   e é só um trecho... também em IsUpper -- os dois têm a keyword exata.
   *   O desempate é o nome Harbour mais curto: Upper antes de IsUpper, Trim
   *   antes de AllTrim. Quem digita o nome quase certo quer o mais direto.
   */
  function pontuar(termos, busca) {
    let melhor = 0, por = null;
    for (const x of termos) {
      let p = 0;
      if (x.t === busca) p = x.peso;
      else if (x.t.split(" ").includes(busca)) p = x.peso * 0.7;
      else if (x.t.startsWith(busca)) p = x.peso * 0.6;
      else if (x.t.includes(busca)) p = x.peso * 0.3;
      // Visível ganha do invisível; e rótulo de OUTRO idioma não passa de
      // palavra-chave do atual ("Starts with uppercase?" não pode vencer
      // a keyword "uppercase" de Upper quando a tela está em pt-BR).
      if (p > 0 && x.visivel) p += 5;
      if (p > 0 && !x.visivel && x.peso === 80) p = Math.min(p, 55);
      if (p > melhor) { melhor = p; por = x; }
    }
    return { p: melhor, por };
  }

  /** Bônus de tipo: o item devolve o que o destino espera? */
  function compativel(ret) {
    const e = S.ctx.expect;
    if (!e || e === "any") return false;
    if (ret === e) return true;
    if ((e === "C" && ret === "M") || (e === "M" && ret === "C")) return true;
    return false;
  }

  // ------------------------------------------------------------- valores

  function valoresCampos(cat) {
    return (S.ctx.campos || [])
      .filter((c) => cat === "TODAS" || c.type === cat)
      .map((c) => ({
        id: "campo:" + c.name, rotulo: c.name,
        sub: tipo(c.type) + (c.len ? " " + c.len + (c.dec ? "," + c.dec : "") : ""),
        ret: c.type,
        termos: [{ t: norm(c.name), peso: 100, visivel: true, cru: c.name }],
        inserir: () => window.Construtor.inserir(c.name),
        dica: () => [c.name + " · " + tipo(c.type) + (c.len ? " (" + c.len + (c.dec ? "," + c.dec : "") + ")" : ""), ""],
      }));
  }

  // `Nome( a, b )` com argumentos; `Nome()` sem -- `Deleted(  )` era o que
  // saía antes, e é o que o Check vê.
  const chamada = (nome, args) => (args.length ? nome + "( " + args.join(", ") + " )" : nome + "()");

  function assinatura(f, comMarcas) {
    const args = f.args.map((a) => {
      const r = T("UI_ARG_" + a.n.toUpperCase());
      const nome = r === "UI_ARG_" + a.n.toUpperCase() ? tipo(a.t) || a.n : r;
      return a.opc ? (comMarcas ? "[" + nome + "]" : nome) : nome;
    });
    return chamada(f.nome, args);
  }

  function textoDeInsercao(f) {
    const args = f.args.map((a) => {
      const k = "UI_ARG_" + a.n.toUpperCase();
      const r = T(k);
      const nome = r === k ? tipo(a.t) || a.n : r;
      return "«" + nome + (a.opc ? "?" : "") + "»";
    });
    return chamada(f.nome, args);
  }

  function valoresFuncoes(cat) {
    const cat0 = window.CATALOGO ? window.CATALOGO.funcoes : {};
    const out = [];
    for (const [k, f] of Object.entries(cat0)) {
      if (cat !== "TODAS" && f.cat !== cat) continue;
      const rk = "UI_FN_" + k;
      const rot = T(rk);
      const dk = rk + "_DESC";
      const desc = T(dk);
      out.push({
        id: "fn:" + k,
        rotulo: rot === rk ? f.nome : rot,
        sub: f.nome + "()",
        ret: f.ret,
        termos: indiceDe(k, f),
        inserir: (o) => window.Construtor.inserir(textoDeInsercao(f), { envolver: f.args.length > 0 && !(o && o.semEnvolver) }),
        dica: () => [assinatura(f, true) + " → " + (f.ret === "any" ? T("UI_CX_ANY_TYPE") : tipo(f.ret)), desc === dk ? f.one : desc],
      });
    }
    return out;
  }

  function valoresOperadores(cat) {
    return OPERADORES.filter((o) => cat === "TODAS" || o.cat === cat).map((o) => ({
      id: "op:" + o.id,
      rotulo: T("UI_OPX_" + o.id),
      sub: o.s,
      ret: o.ret,
      termos: [{ t: norm(T("UI_OPX_" + o.id)), peso: 80, visivel: true, cru: T("UI_OPX_" + o.id) }, { t: o.s, peso: 100, visivel: true, cru: o.s }],
      inserir: () => window.Construtor.inserir(o.pre ? o.s + " " : o.bin ? " " + o.s + " " : o.s),
      dica: () => [T("UI_OPX_" + o.id) + " · " + o.s, T("UI_OPX_" + o.id + "_DESC")],
    }));
  }

  function valoresConstantes() {
    return CONSTANTES.map((c) => ({
      id: "const:" + c.id,
      rotulo: T("UI_CX_CONST_" + c.id),
      sub: c.s,
      ret: c.ret,
      termos: [{ t: norm(T("UI_CX_CONST_" + c.id)), peso: 80, visivel: true, cru: "" }, { t: norm(c.s), peso: 100, visivel: true, cru: c.s }],
      inserir: () => window.Construtor.inserir(c.s),
      dica: () => [c.s + " · " + tipo(c.ret), ""],
    }));
  }

  function valoresHistorico() {
    return (S.historico || []).map((e, i) => ({
      id: "hist:" + i,
      rotulo: e,
      sub: "",
      ret: "any",
      termos: [{ t: norm(e), peso: 100, visivel: true, cru: e }],
      inserir: () => window.Construtor.inserir(e),
      dica: () => [e, ""],
    }));
  }

  function valoresDe(elemento, cat) {
    switch (elemento) {
      case "CAMPOS": return valoresCampos(cat);
      case "FUNCOES": return valoresFuncoes(cat);
      case "OPERADORES": return valoresOperadores(cat);
      case "CONSTANTES": return valoresConstantes();
      case "HISTORICO": return valoresHistorico();
    }
    return [];
  }

  /** Busca ativa: percorre TODOS os elementos, não só o selecionado. */
  function valoresDaBusca(busca) {
    const tudo = [];
    for (const el of ["CAMPOS", "FUNCOES", "OPERADORES", "CONSTANTES"]) {
      for (const v of valoresDe(el, "TODAS")) {
        const r = pontuar(v.termos, busca);
        if (r.p > 0) {
          v.pontos = r.p + (compativel(v.ret) ? 15 : 0);
          v.por = r.por && !r.por.visivel ? r.por.cru : null;
          tudo.push(v);
        }
      }
    }
    return tudo.sort((a, b) => b.pontos - a.pontos || (a.sub || a.rotulo).length - (b.sub || b.rotulo).length || a.rotulo.localeCompare(b.rotulo));
  }

  // ------------------------------------------------------------ categorias

  function categoriasDe(elemento) {
    if (elemento === "CAMPOS") {
      const tipos = [...new Set((S.ctx.campos || []).map((c) => c.type))];
      const ordem = ["C", "N", "D", "L", "M"];
      tipos.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
      return ["TODAS", ...tipos];
    }
    if (elemento === "FUNCOES") {
      const cat0 = window.CATALOGO ? window.CATALOGO.funcoes : {};
      const presentes = new Set(Object.values(cat0).map((f) => f.cat));
      return ["TODAS", ...CATS_FN.filter((c) => presentes.has(c))];
    }
    if (elemento === "OPERADORES") return ["TODAS", ...CATS_OP];
    return [];
  }

  function rotuloCategoria(elemento, cat) {
    if (cat === "TODAS") return T("UI_CAT_TODAS");
    if (elemento === "CAMPOS") return tipo(cat);
    return T("UI_CAT_" + cat);
  }

  /*
   * A categoria que abre por padrão, dado o tipo esperado: com destino Lógico,
   * Funções abre em "Lógico"... que não existe como categoria — abre em Geral
   * (Empty, IIf) e Operadores abre em Comparação. É o "trazer para cima".
   */
  function categoriaInicial(elemento) {
    const e = S.ctx.expect;
    if (elemento === "CAMPOS") return (S.ctx.campos || []).some((c) => c.type === e) ? e : "TODAS";
    if (elemento === "FUNCOES") return { C: "TEXTO", M: "TEXTO", N: "NUMERO", D: "DATA", L: "GERAL" }[e] || "TODAS";
    if (elemento === "OPERADORES") return e === "L" ? "COMPARACAO" : e === "N" ? "ARITMETICA" : "TODAS";
    return "";
  }

  // --------------------------------------------------------------- pintar

  function li(texto, classe, dados) {
    const el = document.createElement("li");
    el.className = classe || "";
    el.setAttribute("role", "option");
    if (dados) for (const [k, v] of Object.entries(dados)) el.dataset[k] = v;
    if (typeof texto === "string") el.textContent = texto;
    else el.appendChild(texto);
    return el;
  }

  function pintarElementos() {
    const ul = $("cx-elementos");
    ul.textContent = "";
    for (const e of ELEMENTOS) {
      const item = li(T("UI_CX_ELEM_" + e), e === S.elemento ? "ativo" : "", { id: e });
      ul.appendChild(item);
    }
  }

  function pintarCategorias() {
    const ul = $("cx-categorias");
    ul.textContent = "";
    const cats = categoriasDe(S.elemento);
    ul.hidden = cats.length === 0;
    for (const c of cats) {
      ul.appendChild(li(rotuloCategoria(S.elemento, c), c === S.categoria ? "ativo" : "", { id: c }));
    }
  }

  function pintarValores() {
    const ul = $("cx-valores");
    ul.textContent = "";
    $("cx-encontrado").textContent = "";

    let itens;
    if (S.busca) {
      itens = valoresDaBusca(S.busca);
    } else {
      itens = valoresDe(S.elemento, S.categoria);
      // Sem busca: compatíveis primeiro, ordem original dentro de cada grupo.
      itens.forEach((v, i) => { v.pontos = (compativel(v.ret) ? 1 : 0); v.ordem = i; });
      itens.sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem);
    }
    S.itens = itens;

    if (!itens.length && S.elemento === "HISTORICO" && !S.busca) {
      ul.appendChild(li(T("UI_CX_NO_HISTORY"), "vazio"));
      return;
    }

    for (const v of itens) {
      const frag = document.createDocumentFragment();
      const rot = document.createElement("span");
      rot.className = "cx-rot";
      rot.textContent = v.rotulo;
      frag.appendChild(rot);
      if (v.sub) {
        const sub = document.createElement("span");
        sub.className = "cx-sub";
        sub.textContent = v.sub;
        frag.appendChild(sub);
      }
      if (v.por) {
        const por = document.createElement("span");
        por.className = "cx-por";
        por.textContent = T("UI_CX_FOUND_BY", { term: v.por });
        frag.appendChild(por);
      }
      const item = li(frag, (compativel(v.ret) ? "compativel " : "") + (S.item === v.id ? "ativo" : ""), { id: v.id });
      item.title = compativel(v.ret) ? T("UI_CX_COMPATIBLE") : "";
      ul.appendChild(item);
    }
  }

  /** A dica FIXA, embaixo das colunas: o item selecionado na lista. */
  function pintarDica() {
    const el = $("cx-dica-fixa");
    const v = (S.itens || []).find((x) => x.id === S.item);
    if (!v) { el.textContent = ""; return; }
    const [a, b] = v.dica();
    el.textContent = "";
    const l1 = document.createElement("div");
    l1.className = "cx-dica-ass";
    l1.textContent = a;
    el.appendChild(l1);
    if (b) {
      const l2 = document.createElement("div");
      l2.className = "cx-dica-desc";
      l2.textContent = b;
      el.appendChild(l2);
    }
  }

  function pintar() {
    pintarElementos();
    pintarCategorias();
    pintarValores();
    pintarDica();
  }

  // ---------------------------------------------------------------- API

  /** Monta (ou remonta) a paleta para um contexto. Chamado por Construtor.abrir. */
  function montar(ctx, historico) {
    S = {
      ctx, historico: historico || [],
      elemento: "FUNCOES", categoria: null, busca: "", item: null, itens: [],
    };
    S.categoria = categoriaInicial(S.elemento);
    $("cx-busca").value = "";
    pintar();
  }

  function historico(lista) {
    if (!S) return;
    S.historico = lista || [];
    if (S.elemento === "HISTORICO") pintar();
  }

  function escolherElemento(id) {
    S.elemento = id;
    S.categoria = categoriaInicial(id);
    S.item = null;
    pintar();
  }

  function escolherCategoria(id) {
    S.categoria = id;
    S.item = null;
    pintar();
  }

  /*
   * Selecionar NÃO repinta a lista — só move a classe `ativo`.
   *
   * Repintar recriava os <li>, e o navegador só sintetiza `dblclick` quando
   * os dois cliques caem no MESMO nó: o segundo `mousePressed` encontrava um
   * elemento novo, e o duplo clique nunca acontecia. Achado por CDP: dois
   * `click` chegavam, `dblclick` nenhum — a mesma armadilha que o cdp.mjs
   * documenta, agora do lado do app.
   */
  function selecionar(id) {
    S.item = id;
    for (const li of $("cx-valores").querySelectorAll("li[data-id]")) {
      li.classList.toggle("ativo", li.dataset.id === id);
    }
    pintarDica();
  }

  function inserirItem(id) {
    const v = (S.itens || []).find((x) => x.id === id);
    if (v) v.inserir();
  }

  // ------------------------------------------------------------- eventos

  document.addEventListener("DOMContentLoaded", () => {
    if (!$("cx-elementos")) return;

    /*
     * `mousedown` com preventDefault em TODAS as listas: o clique não pode
     * roubar o foco do textarea. É o que mantém a seleção do placeholder
     * visível e o cursor onde a pessoa deixou — sem isto, inserir "colaria"
     * sempre no fim, porque o textarea perderia a posição ao perder o foco.
     */
    for (const id of ["cx-elementos", "cx-categorias", "cx-valores"]) {
      $(id).addEventListener("mousedown", (ev) => ev.preventDefault());
    }

    $("cx-elementos").addEventListener("click", (ev) => {
      const el = ev.target.closest("li[data-id]");
      if (el) escolherElemento(el.dataset.id);
    });
    $("cx-categorias").addEventListener("click", (ev) => {
      const el = ev.target.closest("li[data-id]");
      if (el) escolherCategoria(el.dataset.id);
    });
    // Clique simples SELECIONA (mostra a dica); duplo clique INSERE. Mesma
    // convenção da árvore de arquivos e do Access.
    $("cx-valores").addEventListener("click", (ev) => {
      const el = ev.target.closest("li[data-id]");
      if (el) selecionar(el.dataset.id);
    });
    $("cx-valores").addEventListener("dblclick", (ev) => {
      const el = ev.target.closest("li[data-id]");
      if (el) inserirItem(el.dataset.id);
    });

    $("cx-busca").addEventListener("input", () => {
      if (!S) return;
      S.busca = norm($("cx-busca").value);
      S.item = null;
      pintarValores();
      pintarDica();
    });
    // Enter na busca insere o primeiro resultado -- o gesto "digitei, é esse".
    $("cx-busca").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && S && S.busca && S.itens.length) {
        ev.preventDefault();
        inserirItem(S.itens[0].id);
      }
    });

    window.addEventListener("idioma-mudou", () => { if (S) pintar(); });
  });

  /**
   * Candidatos para o IntelliSense: campos e funções cujo NOME começa com o
   * prefixo digitado (case-insensitive), ranqueados pelo tipo esperado. Só o
   * nome — quem digita `Up` quer `Upper`, não "Converter para maiúsculas".
   */
  function candidatos(prefixo) {
    if (!S) return [];
    const p = prefixo.toLowerCase();
    const out = [];
    for (const v of valoresDe("CAMPOS", "TODAS")) {
      if (v.rotulo.toLowerCase().startsWith(p)) out.push({ ...v, pontos: 10 + (compativel(v.ret) ? 5 : 0), sub: v.rotulo, rotulo: v.sub });
    }
    for (const v of valoresDe("FUNCOES", "TODAS")) {
      const nome = v.sub.replace(/\(\)$/, "");
      if (nome.toLowerCase().startsWith(p)) out.push({ ...v, pontos: 5 + (compativel(v.ret) ? 5 : 0), sub: nome });
    }
    return out.sort((a, b) => b.pontos - a.pontos || a.sub.length - b.sub.length || a.sub.localeCompare(b.sub));
  }

  window.Paleta = { montar, historico, norm, candidatos };
})();
