// Auditoria dos dicionarios de traducao.
//
//     node app/devtools/i18n.mjs
//
// Responde tres perguntas que ninguem consegue responder de olho:
//
//   1. Alguma chave e usada no codigo e nao existe no dicionario?  (ORFA)
//      E o unico dos tres que quebra na cara do usuario: a chave crua vai para
//      a tela. Sai com codigo 1 -- serve de porta de CI.
//
//   2. Algum idioma esta atras do pt-BR?  (INCOMPLETO)
//      Nao quebra: cai para o ingles. Mas so aparece para quem usa AQUELE
//      idioma, que normalmente nao e quem escreveu a chave.
//
//   3. Alguma chave existe e ninguem chama?  (MORTA)
//      Custa zero em execucao e muito em leitura -- daqui a um ano ninguem
//      sabe se pode mexer nela.
//
// A parte esperta e a lista IMPLICITAS: ha chaves que nunca aparecem escritas
// por inteiro no codigo porque sao montadas em tempo de execucao --
// "UI_TYPE_" + letra, e o sufixo por parametro de i18n.js. Sem declara-las,
// esta ferramenta apontaria trinta chaves vivas como mortas e viraria ruido
// que todo mundo ignora.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dirDic = join(raiz, "app", "ui", "js", "i18n");

// ------------------------------------------------------------- dicionarios

globalThis.window = {};
for (const arq of ["pt-BR.js", "en.js", "es.js"]) {
  // Os dicionarios sao scripts que atribuem em window.I18N; sem bundler, a
  // forma mais honesta de le-los e executa-los como a pagina executa.
  new Function(readFileSync(join(dirDic, arq), "utf8")).call(globalThis);
}
const DIC = globalThis.window.I18N;
const REF = "pt-BR";
const chaves = new Set(Object.keys(DIC[REF]));

// ----------------------------------------------------------- chaves em uso

/** Chaves montadas em tempo de execucao; procurar pelo nome inteiro nao acha. */
const IMPLICITAS = [
  // Pré-voo: o app monta `"UI_" + c.id`, `"UI_" + c.id + "_MSG"` e
  // `"UI_ROLE_" + role` a partir do que a DLL devolve em backup.check.
  /^UI_CHECK_[A-Z_]+$/,
  /^UI_ROLE_[A-Z]+$/,
  // T10: o editor monta `"UI_ROW_" + estado.toUpperCase()`.
  /^UI_ROW_[A-Z]+$/,
  /^UI_BACKUP_FILES$/,
  /^UI_TYPE_[A-Z]$/, //            window.I.tipo(letra)
  /^UI_THEME_[A-Z]+$/, //          "UI_THEME_" + tema.id (js/tema.js)
  /^ERROR_PARAM_REQUIRED_/, //     especializacao por params.param (i18n.js)
  /^ERROR_PARAM_OUT_OF_RANGE_/,
  /^ERROR_PARAM_TOO_(SMALL|BIG)_/,
  /^ERROR_UNSPECIFIED$/, //        default do proprio motor
  // T13: a tela de massa monta a chave a partir da operacao escolhida --
  // `"UI_MASS_EXPLAIN_" + op`, `"UI_MASS_CONFIRM_" + op` e
  // `"UI_MASS_DONE_" + r.action`, com op em REPLACE|DELETE|RECALL|APPENDFROM.
  /^UI_MASS_(EXPLAIN|CONFIRM|DONE)_[A-Z]+$/,
];

const fontes = [];
(function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) {
      if (nome !== "i18n") varrer(p);
    } else if (/[.](js|html|prg)$/.test(nome)) {
      fontes.push(p);
    }
  }
})(join(raiz, "app", "ui"));
(function varrerPrg(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) varrerPrg(p);
    else if (nome.endsWith(".prg")) fontes.push(p);
  }
})(join(raiz, "src"));

/**
 * Tira comentarios antes de procurar.
 *
 * Sem isto, a propria documentacao vira falso positivo: i18n.js explica o
 * formato escrevendo `data-i18n="CHAVE"` e testa prefixos com "ERROR_", e os
 * tres apareceriam como chaves orfas. Uma ferramenta que acusa o que nao e
 * problema deixa de ser lida.
 */
// O comentario vira BRANCO DO MESMO TAMANHO, e nao um espaco so.
//
// Colapsar mudava todos os deslocamentos seguintes, e o numero de linha
// calculado por `s.slice(0, m.index).split("\n").length` saia menor que o real
// -- api_data.prg:251 para um achado que estava na 334. Um relatorio que aponta
// para a linha errada custa mais tempo que o achado economiza.
const branco = (t) => t.replace(/[^\n]/g, " ");

function semComentarios(s, arq) {
  if (arq.endsWith(".prg")) return s.replace(/\/\*[\s\S]*?\*\//g, branco);
  if (arq.endsWith(".html")) return s.replace(/<!--[\s\S]*?-->/g, branco);
  return s.replace(/\/\*[\s\S]*?\*\//g, branco).replace(/^\s*\/\/.*$/gm, branco);
}

// Prefixo + pelo menos um segmento. O sufixo pode ser minusculo: e assim que
// se escreve a especializacao por parametro (ERROR_PARAM_REQUIRED_path).
const CHAVE = /"((?:UI|ERROR|WARN|INFO)_[A-Z0-9]+(?:_[A-Za-z0-9]+)*)"/g;

const usadas = new Set();
for (const f of fontes) {
  const s = semComentarios(readFileSync(f, "utf8"), f);
  for (const m of s.matchAll(CHAVE)) usadas.add(m[1]);
  for (const m of s.matchAll(/data-i18n(?:-ph|-title|-aria|-value)?="([A-Za-z0-9_]+)"/g)) {
    usadas.add(m[1]);
  }
}

const implicita = (k) => IMPLICITAS.some((r) => r.test(k));

const orfas = [...usadas].filter((k) => !chaves.has(k)).sort();
const mortas = [...chaves].filter((k) => !usadas.has(k) && !implicita(k)).sort();

const atrasados = {};
for (const idioma of Object.keys(DIC)) {
  if (idioma === REF) continue;
  const faltam = [...chaves].filter((k) => !(k in DIC[idioma])).sort();
  const sobram = Object.keys(DIC[idioma]).filter((k) => !chaves.has(k)).sort();
  if (faltam.length || sobram.length) atrasados[idioma] = { faltam, sobram };
}

// ------------------------------------------------- literais indo para a tela

// A primeira varredura desta migracao procurou ACENTO, e por isso deixou
// "abrindo ", "lendo..." e "parando..." passarem -- palavras portuguesas sem
// um unico acento. Procurar pelo DESTINO nao tem esse ponto cego: se o texto e
// atribuido a algo que a tela mostra, ele tem de vir do dicionario.
//
// So `"` literal: `T(...)`, variavel e template ficam de fora naturalmente.
const SAIDAS = [
  /\b(?:hint|msgFiltro|msgIndice|msgExport)\(\s*"([^"]{2,})"/g,
  /\.(?:textContent|title|placeholder)\s*=\s*"([^"]{2,})"/g,
  /\bnew Option\(\s*"([^"]{2,})"/g,
];

// Simbolo, numero e nome tecnico nao sao frase.
const NAO_E_FRASE = /^(?:[\W\d_]+|[A-Z][A-Z0-9_]*|RDD|CSV|JSON|DBF|CDP|DLL|UTF-8)$/;

const soltos = [];
for (const f of fontes) {
  if (!f.endsWith(".js")) continue;
  const s = semComentarios(readFileSync(f, "utf8"), f);
  for (const re of SAIDAS) {
    for (const m of s.matchAll(re)) {
      const v = m[1];
      if (NAO_E_FRASE.test(v)) continue;
      const linha = s.slice(0, m.index).split("\n").length;
      soltos.push(`${f.replace(raiz + "\\", "")}:${linha}  ${JSON.stringify(v)}`);
    }
  }
}

// ---------------------------------------- rotulo de tarefa nascendo no Harbour

// O ponto cego que deixou sete frases em portugues dentro da DLL por tres
// telas: o SOLTOS acima so varre .js, e a barra de tarefa recebe o rotulo como
// DADO vindo do Harbour -- nao como chave. Nenhuma das duas varreduras o via.
//
// A regra e simples e verificavel: o argumento de Dbu_JobBegin() vem de
// JobMsg(). Ver src/util/job.prg.
const JOB = /Dbu_JobBegin\(\s*([^,)]*)/g;

const rotulos = [];
for (const f of fontes) {
  if (!f.endsWith(".prg")) continue;
  const s = semComentarios(readFileSync(f, "utf8"), f);
  for (const m of s.matchAll(JOB)) {
    const arg = m[1].trim();
    if (/^JobMsg\s*\(/.test(arg)) continue;
    const linha = s.slice(0, m.index).split("\n").length;
    rotulos.push(`${f.replace(raiz + "\\", "")}:${linha}  ${arg}`);
  }
}

// ------------------------------------------------------------------ saida

const lista = (a) => (a.length ? "\n    " + a.join("\n    ") : "");

console.log(`dicionario ${REF}: ${chaves.size} chaves`);
console.log(`idiomas: ${Object.keys(DIC).join(", ")}`);
console.log(`fontes varridas: ${fontes.length}`);
console.log("");

let falhou = false;

if (orfas.length) {
  falhou = true;
  console.log(`ORFAS -- usadas no codigo, ausentes do dicionario (${orfas.length}):`);
  console.log(lista(orfas));
} else {
  console.log("ORFAS: nenhuma");
}

console.log("");
if (Object.keys(atrasados).length) {
  for (const [idioma, { faltam, sobram }] of Object.entries(atrasados)) {
    if (faltam.length) console.log(`${idioma} FALTAM (${faltam.length}):${lista(faltam)}`);
    if (sobram.length) console.log(`${idioma} SOBRAM (${sobram.length}):${lista(sobram)}`);
  }
} else {
  console.log("PARIDADE: todos os idiomas cobrem o dicionario de referencia");
}

console.log("");
if (soltos.length) {
  falhou = true;
  console.log(`SOLTOS -- literal indo para a tela sem passar pelo dicionario (${soltos.length}):`);
  console.log(lista(soltos));
} else {
  console.log("SOLTOS: nenhum");
}

console.log("");
if (rotulos.length) {
  falhou = true;
  console.log(`ROTULOS -- Dbu_JobBegin() sem JobMsg(), frase nasce na DLL (${rotulos.length}):`);
  console.log(lista(rotulos));
} else {
  console.log("ROTULOS: nenhum rotulo de tarefa fora do dicionario");
}

console.log("");
if (mortas.length) {
  console.log(`MORTAS -- no dicionario, sem chamador (${mortas.length}):${lista(mortas)}`);
  console.log("  (se for montada em runtime, declare o padrao em IMPLICITAS)");
} else {
  console.log("MORTAS: nenhuma");
}

process.exit(falhou ? 1 : 0);
