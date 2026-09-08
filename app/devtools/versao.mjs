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

// O PAR e a grafia da TELA; a TAG e semver. Os dois aparecem em lugares
// diferentes e nao se misturam: ferramenta nenhuma ordena pelo par -- e por
// isso a tag existe --, e ninguem le `v0.76.0` na janela Sobre.
// O maior SEM zero a esquerda, o menor COM dois digitos -- a mesma regra do
// build.rs, que e quem carimba o binario. Duas fontes divergindo aqui seria o
// proprio defeito que este arquivo veio impedir.
const par = `${maior}.${String(menor).padStart(2, "0")}`;
const tag = `v${maior}.${menor}.${patch}`;

/*
 * O PAR E PROCURADO ANCORADO NO NOME DO PRODUTO, e nao solto.
 *
 * Solto, o padrao era `\d{2}\.\d{2}`. Sem o zero a esquerda ele teria de
 * aceitar um digito antes do ponto, e passaria a casar com qualquer `1.65`
 * numa frase. Auditor que acusa numero de preco e auditor que alguem
 * desliga; ancorado, ele so olha onde a versao de fato e anunciada.
 *
 * Grupo 1 e o prefixo (`QDbu ` ou `QDbu v`), preservado na correcao; grupo 2
 * e o numero, que e o que se compara e se troca.
 */
const RE_PAR = /(QDbu\s+v?)(\d{1,3}\.\d{2})\b/g;
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
        // No par o numero e o grupo 2; na tag o casamento inteiro ja e ele.
        const achado = re === RE_PAR ? m[2] : m[0];
        const esperado = re === RE_PAR ? par : tag;
        achados.push({ n: i + 1, achado, esperado, linha: linha.trim() });
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
    // O prefixo do par volta como estava -- trocar "QDbu v0.75" por um numero
    // solto arrancaria o nome do produto da frase.
    novo = novo.replace(RE_PAR, (_todo, prefixo) => prefixo + par);
    novo = novo.replace(RE_TAG, tag);
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
