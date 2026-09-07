// catalogo.mjs -- gera app/ui/js/catalogo.js, o catalogo tipado das funcoes
// que o construtor de expressao oferece.
//
// A FONTE E A DOC DO PROPRIO HARBOUR, e so ela. Cada funcao do Harbour, nucleo
// e contribs, esta documentada num bloco $DOC$ com $SYNTAX$ em notacao hungara:
//
//     SubStr( <cString>, <nStart>, [<nLen>] ) --> cReturn
//
// O prefixo codifica o tipo (c=C, n=N, d=D, l=L, x/exp/u=qualquer), [...]
// marca opcional, e o retorno vem com prefixo tambem. Isto e o que faz o
// catalogo sair GERADO em vez de digitado -- e crescer copiando um .txt para
// hbdoc/ em vez de escrevendo JSON a mao.
//
// A DOC E VENDORIZADA em hbdoc/, nao buscada em runtime: o gerador roda a
// cada REQUEST novo, tem de funcionar offline e produzir os mesmos bytes em
// qualquer maquina. `--fetch <sha>` e a unica acao de rede, explicita.
//
// O QUE ENTRA: so o que esta no REQUEST de src/util/expr_funcs.prg -- a lista
// do que LINKA. Oferecer uma funcao que nao linka e o app sugerindo o que
// morre em runtime com "Undefined function", o defeito que fez aquele
// arquivo nascer. E o que esta no REQUEST e nao esta em doc nenhum e ERRO
// (SEM DOC, exit 1), a menos que esteja no manual (add) ou declarado como
// linkado-mas-nao-oferecido (ocultar). Nada fica de fora por esquecimento.
//
// Uso:
//   node app/devtools/catalogo.mjs                 gera app/ui/js/catalogo.js
//   node app/devtools/catalogo.mjs --fetch <sha>   baixa a doc de harbour/core@sha para hbdoc/
//   node app/devtools/catalogo.mjs --faltam        chaves UI_FN_*/UI_ARG_* ausentes, por idioma

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..");
const DIR_DOC = join(aqui, "hbdoc");
const ARQ_MANUAL = join(aqui, "catalogo.manual.json");
const ARQ_FUNCS = join(raiz, "src", "util", "expr_funcs.prg");
const ARQ_SAIDA = join(raiz, "app", "ui", "js", "catalogo.js");
const DIR_I18N = join(raiz, "app", "ui", "js", "i18n");

const FONTES = [
  { pasta: "core", caminho: "doc/en", src: "core" },
  { pasta: "hbct", caminho: "contrib/hbct/doc/en", src: "hbct" },
];

// ------------------------------------------------------------- expr_funcs

/** Os nomes do REQUEST, em maiusculas. */
function lerRequest() {
  const s = readFileSync(ARQ_FUNCS, "utf8");
  const nomes = new Set();
  for (const m of s.matchAll(/^\s*REQUEST\s+(.+?)\s*$/gm)) {
    for (const n of m[1].split(",")) {
      const t = n.trim().toUpperCase();
      if (t) nomes.add(t);
    }
  }
  return nomes;
}

/**
 * Os nomes de ExprFuncsLista(), o espelho em runtime do REQUEST. REQUEST exige
 * identificador literal e nao ha como enumera-lo na VM, entao a lista existe
 * duas vezes -- e este gerador e quem garante que as duas sao iguais.
 */
function lerLista() {
  const s = readFileSync(ARQ_FUNCS, "utf8");
  const i = s.indexOf("FUNCTION ExprFuncsLista");
  if (i < 0) return null;
  const corpo = s.slice(i, s.indexOf("RETURN", i) + 4000);
  const nomes = new Set();
  for (const m of corpo.matchAll(/"([A-Z_][A-Z0-9_]*)"/g)) nomes.add(m[1].toUpperCase());
  return nomes;
}

// ----------------------------------------------------------------- parser

const TIPO_POR_PREFIXO = {
  c: "C", n: "N", d: "D", l: "L", m: "M",
  a: "A", b: "B", o: "O", h: "H", t: "T",
  x: "any", exp: "any", u: "any",
};

/** `<cString>` -> "C"; `<xVal>` -> "any"; `<nome>` sem prefixo -> "any". */
function tipoDoNome(nome) {
  const m = /^([a-z]+)(?=[A-Z0-9_]|$)/.exec(nome);
  if (!m) return "any";
  return TIPO_POR_PREFIXO[m[1]] || "any";
}

/**
 * Divide os blocos $DOC$...$END$ de um arquivo e devolve, por bloco, um mapa
 * secao -> linhas. As secoes sao linhas `$NOME$`; o conteudo e o que vem ate
 * a proxima. Tolera o `*` de comentario C no inicio da linha, que alguns
 * arquivos usam e outros nao.
 */
function blocosDe(texto) {
  const blocos = [];
  // `/* $DOC$` vem na MESMA linha do abre-comentario, e `$END$` e seguido de
  // ` */` na seguinte: o strip tira `/*`, `*` e `*/` da margem, nao so o `*`.
  const linhas = texto.split(/\r?\n/).map((l) => l.replace(/^\s*\/?\*+\/?\s?/, ""));
  let atual = null;
  let secao = null;
  for (const l of linhas) {
    const t = l.trim();
    if (t === "$DOC$") { atual = {}; secao = null; continue; }
    if (t === "$END$") { if (atual) blocos.push(atual); atual = null; secao = null; continue; }
    if (!atual) continue;
    const m = /^\$([A-Z]+)\$$/.exec(t);
    if (m) { secao = m[1]; atual[secao] = atual[secao] || []; continue; }
    if (secao) atual[secao].push(l);
  }
  return blocos;
}

const texto = (b, sec) => (b[sec] || []).map((l) => l.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
const primeira = (b, sec) => ((b[sec] || []).map((l) => l.trim()).find(Boolean) || "");

/**
 * "SubStr( <cString>, <nStart>, [<nLen>] ) --> cReturn" -> { args, ret }.
 *
 * Tokenizador proprio em vez de regex: os argumentos vem com colchete
 * aninhado (`[<a> [, <b>]]`), uniao (`<cChar|nChar>`) e, num caso da fonte,
 * colchete sem fechar (MLCOUNT). Nada disso pode abortar -- avisa e segue.
 */
function parseSintaxe(sint, avisos, nome) {
  const seta = sint.indexOf("-->") >= 0 ? "-->" : sint.indexOf("->") >= 0 ? "->" : null;
  let cabeca = sint, retorno = "";
  if (seta) {
    const i = sint.indexOf(seta);
    cabeca = sint.slice(0, i);
    retorno = sint.slice(i + seta.length).trim().split(/\s+/)[0] || "";
    if (sint.indexOf(seta, i + 1) >= 0) avisos.push(`${nome}: mais de uma sintaxe; usei a primeira`);
  }

  const a = cabeca.indexOf("(");
  const z = cabeca.lastIndexOf(")");
  const miolo = a >= 0 && z > a ? cabeca.slice(a + 1, z) : "";

  const args = [];
  let tok = "", colchete = 0, angulo = 0, paren = 0;
  // Profundidade de colchete NO INICIO do token. Opcional e o argumento que
  // COMECA dentro de colchete -- `[<a>]`, ou `<a> [, <b>]` para o <b>. Um
  // colchete que abre no FIM do token (`<bBlock> [`) pertence ao proximo
  // argumento, nao a este: Eval( <bBlock> [, <xVal> [,...] ] ) tem bBlock
  // obrigatorio, e a primeira versao o marcava opcional por isso.
  let profInicio = 0;
  const fecha = () => {
    const t = tok.trim();
    const inicio = profInicio;
    tok = "";
    profInicio = colchete;
    if (!t) return;
    if (/^\.\.\./.test(t)) { if (args.length) args[args.length - 1].rest = true; return; }
    const nomes = [...t.matchAll(/<\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    if (!nomes.length) return; // "This function has no arguments"
    const tipos = [...new Set(nomes.map(tipoDoNome))];
    const arg = { n: nomes[0], t: tipos.length === 1 ? tipos[0] : "any", opc: inicio > 0 || /^\[/.test(t) };
    if (/\.\.\./.test(t)) arg.rest = true;
    args.push(arg);
  };
  for (const ch of miolo) {
    if (ch === "[") { colchete++; tok += ch; continue; }
    if (ch === "]") { colchete = Math.max(0, colchete - 1); tok += ch; continue; }
    if (ch === "<") angulo++;
    if (ch === ">") angulo = Math.max(0, angulo - 1);
    if (ch === "(") paren++;
    if (ch === ")") paren = Math.max(0, paren - 1);
    if (ch === "," && angulo === 0 && paren === 0) { fecha(); continue; }
    tok += ch;
  }
  fecha();
  if (colchete !== 0) avisos.push(`${nome}: colchete sem fechar na sintaxe da fonte -- seguido mesmo assim`);

  let ret = "any";
  if (retorno) {
    const r = retorno.replace(/[^A-Za-z0-9_]/g, "");
    if (/^NIL$/i.test(r)) ret = "U";
    else if (/^[a-z]/.test(r)) ret = tipoDoNome(r);
  }
  return { args, ret };
}

const CAT_NUCLEO = [
  [/string/i, "TEXTO"], [/conversion/i, "CONVERSAO"], [/date|time/i, "DATA"],
  [/math/i, "NUMERO"], [/database|rdd|order|index/i, "BANCO"], [/array/i, "VETOR"],
  [/environment|filesys|application|terminal|network/i, "AMBIENTE"],
];
function categoria(b, src, ret) {
  const alvo = src === "core" ? texto(b, "SUBCATEGORY") || texto(b, "CATEGORY") : texto(b, "CATEGORY");
  for (const [re, cat] of CAT_NUCLEO) if (re.test(alvo)) return cat;
  // Sem categoria util: o tipo de retorno e uma pista honesta.
  return { C: "TEXTO", N: "NUMERO", D: "DATA", L: "GERAL" }[ret] || "GERAL";
}

/** Le hbdoc/ inteiro e devolve { NOME_MAIUSCULO: entrada } + avisos. */
function lerDocs(request, avisos) {
  const funcoes = {};
  for (const fonte of FONTES) {
    const dir = join(DIR_DOC, fonte.pasta);
    if (!existsSync(dir)) continue;
    for (const arq of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
      for (const b of blocosDe(readFileSync(join(dir, arq), "utf8"))) {
        const tpl = texto(b, "TEMPLATE");
        if (tpl && !/function/i.test(tpl)) continue;
        let nome = primeira(b, "NAME").replace(/\(\)\s*$/, "").replace(/\*+$/, "").trim();
        if (!nome) continue;
        nome = nome.replace(/^\[I\]/i, "I");
        const chave = nome.toUpperCase();
        if (!request.has(chave)) continue;
        if (funcoes[chave]) {
          if (funcoes[chave].src !== fonte.src) avisos.push(`${chave}: em ${funcoes[chave].src} e ${fonte.src}; fica ${funcoes[chave].src}`);
          continue;
        }
        const { args, ret } = parseSintaxe(texto(b, "SYNTAX"), avisos, chave);
        funcoes[chave] = {
          nome, ret, cat: categoria(b, fonte.src, ret), src: fonte.src, args,
          one: texto(b, "ONELINER"),
          arq: `${fonte.pasta}/${arq}`,
        };
      }
    }
  }
  return funcoes;
}

// ----------------------------------------------------------------- manual

function lerManual() {
  if (!existsSync(ARQ_MANUAL)) return { add: {}, patch: {}, alias: {}, ocultar: [] };
  const m = JSON.parse(readFileSync(ARQ_MANUAL, "utf8"));
  // Chaves que comecam com `_` sao comentario do autor do manual, nao entrada.
  const semNotas = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith("_")));
  return { add: semNotas(m.add), patch: semNotas(m.patch), alias: semNotas(m.alias), ocultar: m.ocultar || [] };
}

function aplicarManual(funcoes, manual, request, erros, avisos) {
  for (const [chave, e] of Object.entries(manual.add)) {
    const k = chave.toUpperCase();
    if (funcoes[k]) { erros.push(`SOBRA: ${k} esta em add e agora tem doc em ${funcoes[k].arq} -- tire do manual`); continue; }
    // IIF e palavra-chave do compilador: linka por definicao e NAO pode estar
    // no REQUEST (o proprio expr_funcs.prg anota isso). E a unica excecao.
    if (!request.has(k) && k !== "IIF") { erros.push(`${k} esta em add mas nao no REQUEST -- nao linka`); continue; }
    funcoes[k] = { nome: e.nome || k, ret: e.ret || "any", cat: e.cat || "GERAL", src: "manual",
      args: (e.args || []).map((a) => ({ n: a.n, t: a.t || tipoDoNome(a.n), opc: !!a.opc, ...(a.rest ? { rest: true } : {}) })),
      one: e.one || "", arq: "catalogo.manual.json" };
  }
  for (const [chave, p] of Object.entries(manual.patch)) {
    const k = chave.toUpperCase();
    const f = funcoes[k];
    if (!f) { erros.push(`patch de ${k}: funcao nao existe no catalogo`); continue; }
    for (const [n, muda] of Object.entries(p.args || {})) {
      const a = f.args.find((x) => x.n.toLowerCase() === n.toLowerCase());
      if (!a) { erros.push(`patch de ${k}: argumento ${n} nao existe (tem: ${f.args.map((x) => x.n).join(", ")})`); continue; }
      Object.assign(a, muda);
    }
    if (p.ret) f.ret = p.ret;
    if (p.cat) f.cat = p.cat;
  }
  const aliases = {};
  for (const [de, para] of Object.entries(manual.alias)) {
    const d = de.toUpperCase(), p = para.toUpperCase();
    if (!funcoes[p]) { erros.push(`alias ${d} -> ${p}: destino nao esta no catalogo`); continue; }
    if (!request.has(d)) avisos.push(`alias ${d} nao esta no REQUEST -- so serve para a dica`);
    aliases[d] = p;
  }
  return aliases;
}

// ------------------------------------------------------------------ gerar

function gerar() {
  const erros = [], avisos = [];
  const request = lerRequest();
  const lista = lerLista();
  if (!lista) erros.push("ExprFuncsLista() nao existe em expr_funcs.prg");
  else {
    const soReq = [...request].filter((n) => !lista.has(n));
    const soLista = [...lista].filter((n) => !request.has(n));
    if (soReq.length) erros.push(`no REQUEST e nao em ExprFuncsLista(): ${soReq.join(", ")}`);
    if (soLista.length) erros.push(`em ExprFuncsLista() e nao no REQUEST: ${soLista.join(", ")}`);
  }

  const manual = lerManual();
  const funcoes = lerDocs(request, avisos);
  const aliases = aplicarManual(funcoes, manual, request, erros, avisos);
  const ocultar = new Set(manual.ocultar.map((n) => n.toUpperCase()));

  // LINKADO != OFERECIDO. O que esta no REQUEST e nao esta no catalogo tem
  // de ser EXATAMENTE a lista `ocultar` -- fora dela e esquecimento.
  const semDoc = [...request].filter((n) => !funcoes[n] && !aliases[n] && !ocultar.has(n)).sort();
  if (semDoc.length) erros.push(`SEM DOC (${semDoc.length}) -- nem doc, nem add, nem ocultar: ${semDoc.join(", ")}`);
  for (const n of ocultar) {
    if (funcoes[n]) erros.push(`${n} esta em ocultar e tem doc -- decida: oferecer ou nao`);
    if (!request.has(n)) erros.push(`${n} esta em ocultar mas nao no REQUEST`);
  }
  for (const n of Object.keys(funcoes)) if (!request.has(n) && n !== "IIF") erros.push(`${n} no catalogo sem estar no REQUEST`);

  for (const a of avisos) console.log("NOTA  " + a);
  if (erros.length) {
    for (const e of erros) console.log("ERRO  " + e);
    process.exit(1);
  }

  const ordenado = {};
  for (const k of Object.keys(funcoes).sort()) {
    const f = funcoes[k];
    ordenado[k] = { nome: f.nome, ret: f.ret, cat: f.cat, src: f.src, args: f.args, one: f.one };
  }
  const meta = lerMetaDoc();
  const saida =
    "// GERADO por app/devtools/catalogo.mjs -- nao edite a mao.\n" +
    "// Fonte: " + meta + " + catalogo.manual.json\n" +
    "// Regenerar: node app/devtools/catalogo.mjs\n" +
    "//\n" +
    "// Uma entrada por funcao que o construtor de expressao OFERECE. `args[].t` e\n" +
    "// `ret` sao letras de tipo (C N D L M A B) ou \"any\"; `opc` marca opcional;\n" +
    "// `one` e a descricao em ingles da fonte, usada quando nao ha UI_FN_<NOME>_DESC.\n" +
    "// Rotulo, descricao e palavras-chave traduzidos moram nos dicionarios de i18n.\n" +
    "(function () {\n" +
    "  window.CATALOGO = " +
    JSON.stringify({ versao: 1, fonte: meta, funcoes: ordenado, aliases, ocultas: [...ocultar].sort() }, null, 2).replace(/\n/g, "\n  ") +
    ";\n})();\n";
  writeFileSync(ARQ_SAIDA, saida, "utf8");

  const n = Object.keys(ordenado).length;
  const porSrc = {};
  for (const f of Object.values(ordenado)) porSrc[f.src] = (porSrc[f.src] || 0) + 1;
  console.log(`catalogo.js: ${n} funcoes (${Object.entries(porSrc).map(([s, c]) => `${s} ${c}`).join(", ")}), ${Object.keys(aliases).length} alias, ${ocultar.size} ocultas; REQUEST tem ${request.size}`);
}

function lerMetaDoc() {
  const p = join(DIR_DOC, "README.md");
  if (!existsSync(p)) return "hbdoc/ (origem nao registrada)";
  const m = /harbour\/core@([0-9a-f]{7,40})/.exec(readFileSync(p, "utf8"));
  return m ? `harbour/core@${m[1].slice(0, 12)}` : "hbdoc/";
}

// ----------------------------------------------------------------- fetch

async function fetchDocs(sha) {
  if (!/^[0-9a-f]{7,40}$/.test(sha || "")) { console.log("uso: --fetch <sha do harbour/core>"); process.exit(2); }
  let total = 0;
  for (const fonte of FONTES) {
    const api = `https://api.github.com/repos/harbour/core/contents/${fonte.caminho}?ref=${sha}`;
    const r = await fetch(api, { headers: { "User-Agent": "qdbu-catalogo" } });
    if (!r.ok) { console.log(`ERRO ${r.status} ao listar ${fonte.caminho}`); process.exit(1); }
    const itens = (await r.json()).filter((i) => i.type === "file" && i.name.endsWith(".txt"));
    const dir = join(DIR_DOC, fonte.pasta);
    mkdirSync(dir, { recursive: true });
    for (const it of itens) {
      const raw = `https://raw.githubusercontent.com/harbour/core/${sha}/${fonte.caminho}/${it.name}`;
      const t = await fetch(raw, { headers: { "User-Agent": "qdbu-catalogo" } });
      if (!t.ok) { console.log(`ERRO ${t.status} em ${raw}`); process.exit(1); }
      writeFileSync(join(dir, it.name), await t.text(), "utf8");
      total++;
    }
    console.log(`${fonte.pasta}: ${itens.length} arquivos`);
  }
  writeFileSync(join(DIR_DOC, "README.md"),
    "# hbdoc -- documentacao das funcoes, copiada do Harbour\n\n" +
    `Origem: harbour/core@${sha} (` + new Date().toISOString().slice(0, 10) + ")\n\n" +
    "- `core/`  <- doc/en/*.txt\n- `hbct/`  <- contrib/hbct/doc/en/*.txt\n\n" +
    "Copia fiel, sem edicao. Doc errada se corrige em `catalogo.manual.json`\n" +
    "(secao `patch`), nunca aqui: estes arquivos somem no proximo `--fetch`.\n" +
    "Para acrescentar funcoes de outra contrib, copie o `doc/en/*.txt` dela para\n" +
    "uma pasta nova aqui, registre a pasta em FONTES no catalogo.mjs, ponha os\n" +
    "nomes no REQUEST de src/util/expr_funcs.prg e regenere.\n\n" +
    "Licenca da documentacao: a do Harbour (GPL com excecao de linkagem);\n" +
    "ver LICENSE no repositorio harbour/core.\n", "utf8");
  console.log(`${total} arquivos em ${DIR_DOC}`);
}

// ---------------------------------------------------------------- faltam

function faltam() {
  if (!existsSync(ARQ_SAIDA)) { console.log("gere o catalogo primeiro"); process.exit(2); }
  const src = readFileSync(ARQ_SAIDA, "utf8");
  const json = src.slice(src.indexOf("window.CATALOGO = ") + "window.CATALOGO = ".length, src.lastIndexOf(";\n})"));
  const cat = JSON.parse(json);
  const idiomas = readdirSync(DIR_I18N).filter((f) => f.endsWith(".js")).map((f) => basename(f, ".js"));
  const args = new Set();
  for (const f of Object.values(cat.funcoes)) for (const a of f.args) args.add(a.n.toUpperCase());
  for (const idioma of idiomas) {
    const dic = readFileSync(join(DIR_I18N, idioma + ".js"), "utf8");
    const tem = (k) => new RegExp(`^\\s*${k}:`, "m").test(dic);
    const faltando = [];
    for (const [k, f] of Object.entries(cat.funcoes)) {
      if (!tem(`UI_FN_${k}`)) faltando.push(`UI_FN_${k}: "" // ${f.nome}: ${f.one}`);
      if (!tem(`UI_FN_${k}_DESC`)) faltando.push(`UI_FN_${k}_DESC: "" // ${f.one}`);
      if (!tem(`UI_FN_${k}_KW`)) faltando.push(`UI_FN_${k}_KW: ""`);
    }
    for (const a of [...args].sort()) if (!tem(`UI_ARG_${a}`)) faltando.push(`UI_ARG_${a}: ""`);
    console.log(`\n${idioma}: ${faltando.length} chave(s) faltando`);
    for (const l of faltando) console.log("  " + l);
  }
}

const argv = process.argv.slice(2);
if (argv[0] === "--fetch") await fetchDocs(argv[1]);
else if (argv[0] === "--faltam") faltam();
else gerar();
