// commits.mjs -- as mensagens de commit estao em ingles?
//
// Regra absoluta do autor (08/09/2026): mensagem de commit sai em INGLES
// TECNICO. O historico de um repositorio publico e lido por quem chega de
// fora, e e onde esta escrito POR QUE cada coisa e como e -- a parte que mais
// vale e a que ninguem reconstroi depois. Em portugues ela existe e nao
// alcanca ninguem.
//
// Regra sem trilho e regra que morre no primeiro dia corrido. Este script e o
// trilho: `confere.bat` o chama, e ele sai com codigo 1.
//
//   node app/devtools/commits.mjs           confere do CORTE ate HEAD
//   node app/devtools/commits.mjs <ref>     confere de <ref> ate HEAD
//
// O CORTE e explicito e nao uma data: a regra comecou num ponto do historico,
// e tudo que veio antes fica como esta. Reescrever historico ja publicado
// custa mais do que corrige -- quebra todo clone e toda referencia de commit.

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// O ultimo commit ESCRITO EM PORTUGUES, e a fronteira da regra. Daqui para
// frente, ingles. Nao mexa nisto para "passar" -- mexa na mensagem.
const CORTE = "d9ae885";

/*
 * O QUE DENUNCIA PORTUGUES, sem acusar ingles por engano.
 *
 * Duas familias, as duas escolhidas para NAO casar com o que um commit em
 * ingles legitimamente contem:
 *
 * - acento: nenhuma palavra inglesa tem. Identificador deste projeto tambem
 *   nao (`ModoDaPasta`, `abrirAvulsa`), entao citar um nao acusa nada.
 * - palavra funcional que so existe em portugues, como TOKEN INTEIRO. "de"
 *   ficou de fora de proposito: aparece em nome proprio e em citacao.
 */
const ACENTO = /[áàâãäéèêëíìîïóòôõöúùûüçñ]/i;
/* Medido, e nao adivinhado: `com` casava com "example.com" e `pasta` e
   palavra inglesa (a comida). Ficaram de fora, com `para`, `que`, `ser`,
   `foi`, `uma`, `sem` e `todo` -- todas aparecem em ingles ou em texto
   tecnico, e um trilho que acusa sem motivo e um trilho que se desliga. */
const PALAVRAS = [
  "nao", "sao", "esta", "estao", "tambem", "porque", "quando", "apenas",
  "mesmo", "entao", "ainda", "isso", "aqui", "agora", "cada", "onde", "quem",
  "arquivo", "arquivos", "conexao", "erro", "tela", "janela", "sobre",
  "antes", "depois", "assim", "mudanca", "versao", "muito", "pode", "seja",
  "tem", "faz", "sendo", "havia", "fica", "ficou", "vira", "virou",
];

/* CODIGO NAO E PROSA, e este projeto tem os identificadores em portugues.
   Um commit em ingles legitimamente cita `ModoDaPasta`, `QDBU_VERSAO`,
   `api_workspace.prg` e `identidade.versao` -- medir a lingua ali produz
   acusacao onde nao ha erro. Foi o que aconteceu na primeira versao: ela
   reprovou um commit em ingles por causa do `QDBU_VERSAO` no corpo. */
function prosa(texto) {
  return String(texto)
    .replace(/`[^`]*`/g, " ")
    .replace(/\b[\w-]+\.(prg|mjs|js|rs|c|h|bat|md|json|toml|css|html)\b/gi, " ")
    // identificador pontuado ou sublinhado: QDBU_VERSAO, identidade.versao
    .replace(/\b[A-Za-z_][A-Za-z0-9_]*[._][A-Za-z0-9_.]+\b/g, " ")
    // CAIXA ALTA inteira: QDBU_VERSAO solto, DBF, NTX, REPLACE
    .replace(/\b[A-Z][A-Z0-9_]{2,}\b/g, " ")
    // caixa mista: ModoDaPasta, abrirAvulsa, larguraPainel
    .replace(/\b(?=[A-Za-z]*[a-z])(?=[A-Za-z]*[A-Z])[A-Za-z]{3,}\b/g, " ")
    .replace(/\bCo-Authored-By:.*/gi, " ");
}

function git(...args) {
  return execFileSync("git", args, { cwd: raiz, encoding: "utf8" });
}

const desde = process.argv[2] || CORTE;

let intervalo;
try {
  git("cat-file", "-e", desde + "^{commit}");
  intervalo = `${desde}..HEAD`;
} catch {
  console.error(`commits.mjs: a referencia ${desde} nao existe neste repositorio.`);
  process.exit(1);
}

const SEP = "@@QDBU@@";
const bruto = git("log", "--reverse", `--format=%H${SEP}%s%n%b${SEP}`, intervalo);
const entradas = bruto.split(SEP + "\n").filter((x) => x.trim());

let ruins = 0;
let vistos = 0;

for (const e of entradas) {
  const [sha, corpo = ""] = e.split(SEP);
  if (!sha || !sha.trim()) continue;
  vistos++;

  const texto = prosa(corpo);
  const achados = new Set();

  if (ACENTO.test(texto)) {
    for (const p of texto.split(/\s+/)) if (ACENTO.test(p)) achados.add(p);
  }
  for (const p of PALAVRAS) {
    if (new RegExp(`(^|[^\\p{L}])${p}([^\\p{L}]|$)`, "iu").test(texto)) achados.add(p);
  }

  if (achados.size) {
    ruins++;
    const assunto = corpo.split("\n")[0];
    console.error(`  PORTUGUES  ${sha.trim().slice(0, 8)}  ${assunto}`);
    console.error(`             marcas: ${[...achados].slice(0, 8).join(", ")}`);
  }
}

console.log("");
if (ruins) {
  console.error(
    `commits.mjs: ${ruins} de ${vistos} commit(s) depois de ${desde} nao estao em ingles.\n` +
    "             A mensagem de commit e o unico lugar onde o POR QUE de uma\n" +
    "             mudanca sobrevive, e num repositorio publico ela e lida por\n" +
    "             quem nao le portugues. Reescreva antes de publicar\n" +
    "             (`git rebase -i` NAO em commit ja empurrado -- corrija dai\n" +
    "             para frente e converse com o autor sobre o que ja subiu)."
  );
  process.exit(1);
}
console.log(
  vistos
    ? `commits.mjs: os ${vistos} commit(s) depois de ${desde} estao em ingles.`
    : `commits.mjs: nenhum commit depois de ${desde} ainda.`
);
