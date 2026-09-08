// versao.mjs -- a versao publicada bate com a versao do binario?
//
// Este arquivo existe por causa de um erro concreto: a 00.76 foi empacotada,
// marcada e publicada com os tres README ainda dizendo 00.75. Nada quebrou,
// nada avisou -- a primeira tela do repositorio publico simplesmente mentia
// sobre qual versao estava la, e quem percebeu foi o autor, depois de no ar.
//
// A licao e a mesma dos outros dois auditores (`i18n.mjs`, `catalogo.mjs`):
// item de checklist se esquece; trilho que FALHA nao. Por isso o
// `empacota.bat` chama isto ANTES de montar o .zip, e aborta se divergir.
// Nao da para produzir um pacote com o README atrasado.
//
//   node app/devtools/versao.mjs              confere; sai 1 se divergir
//   node app/devtools/versao.mjs --corrigir   reescreve e sai 0
//
// A VERSAO VEM DE UM LUGAR SO: `[package] version` do Cargo.toml. E a mesma
// que o build.rs carimba no binario e que a janela Sobre mostra. Aqui ela e
// so LIDA -- este script nunca a altera, senao passariam a existir dois donos
// da versao, que e exatamente o problema que ele veio impedir.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const corrigir = process.argv.includes("--corrigir");

// Os arquivos publicados que carregam a versao por escrito.
const ALVOS = ["README.md", "README.pt-BR.md", "README.es.md"];

// ------------------------------------------------------------- a referencia

const cargo = readFileSync(join(raiz, "app", "src-tauri", "Cargo.toml"), "utf8");
const mVer = cargo.match(/^version\s*=\s*"(\d+)\.(\d+)\.(\d+)"/m);
if (!mVer) {
  console.error("versao.mjs: nao achei `version = \"x.y.z\"` no Cargo.toml.");
  process.exit(1);
}
const [, maior, menor, patch] = mVer;

// O PAR `NN.NN` e a grafia da TELA (convencao do Clipper); a TAG e semver.
// Os dois aparecem em lugares diferentes e nao se misturam: ferramenta
// nenhuma ordena por `00.76`, e ninguem le `v0.76.0` na janela Sobre.
const par = `${String(maior).padStart(2, "0")}.${String(menor).padStart(2, "0")}`;
const tag = `v${maior}.${menor}.${patch}`;

// Um `00.NN` solto no texto, e uma tag `v0.N.N`. O `\b` de tras evita casar
// com o comeco de um numero maior.
const RE_PAR = /\b\d{2}\.\d{2}\b/g;
const RE_TAG = /\bv\d+\.\d+\.\d+\b/g;

// ---------------------------------------------------------------- conferir

let problemas = 0;
let arrumados = 0;

for (const nome of ALVOS) {
  const caminho = join(raiz, nome);
  let texto;
  try {
    texto = readFileSync(caminho, "utf8");
  } catch {
    console.error(`  FALTA   ${nome} -- o arquivo nao existe`);
    problemas++;
    continue;
  }

  const linhas = texto.split(/\r?\n/);
  const achados = [];

  linhas.forEach((linha, i) => {
    for (const re of [RE_PAR, RE_TAG]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(linha)) !== null) {
        const esperado = re === RE_PAR ? par : tag;
        achados.push({ n: i + 1, achado: m[0], esperado, linha: linha.trim() });
      }
    }
  });

  /*
   * NENHUMA MENCAO E DEFEITO, e nao "nada a conferir".
   *
   * Se alguem reescrever o README e a frase da versao sair junto, o silencio
   * seria o pior desfecho possivel: a ferramenta continuaria verde para
   * sempre sobre um arquivo que deixou de dizer qual versao esta publicada.
   */
  if (!achados.length) {
    console.error(`  SEM VERSAO  ${nome} -- nenhum "NN.NN" nem tag; a versao sumiu do texto?`);
    problemas++;
    continue;
  }

  const errados = achados.filter((a) => a.achado !== a.esperado);
  if (!errados.length) {
    console.log(`  ok      ${nome} (${achados.length} mencao(oes) em ${par})`);
    continue;
  }

  if (corrigir) {
    let novo = texto;
    for (const re of [RE_PAR, RE_TAG]) {
      const esperado = re === RE_PAR ? par : tag;
      novo = novo.replace(re, esperado);
    }
    writeFileSync(caminho, novo);
    for (const e of errados) {
      console.log(`  corrigido ${nome}:${e.n}  ${e.achado} -> ${e.esperado}`);
    }
    arrumados += errados.length;
  } else {
    for (const e of errados) {
      console.error(`  ATRASADO  ${nome}:${e.n}  diz ${e.achado}, o binario e ${e.esperado}`);
      console.error(`            ${e.linha}`);
    }
    problemas += errados.length;
  }
}

// ------------------------------------------------------------------ desfecho

console.log("");
if (problemas) {
  console.error(
    `versao.mjs: ${problemas} divergencia(s). O binario e ${par} (tag ${tag}).\n` +
    "            Rode `node app/devtools/versao.mjs --corrigir` e confira o diff\n" +
    "            antes de empacotar -- publicar um README atrasado e publicar\n" +
    "            uma informacao falsa na primeira tela do repositorio."
  );
  process.exit(1);
}
console.log(
  arrumados
    ? `versao.mjs: ${arrumados} mencao(oes) atualizada(s) para ${par}.`
    : `versao.mjs: os ${ALVOS.length} README dizem ${par}, como o binario.`
);
