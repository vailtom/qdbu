// Tela T1 — Conexões (pastas de trabalho).
//
// Modelo: arvore a esquerda com TODAS as conexoes cadastradas, sem limite e sem
// "trocar de pasta". Expandir lista os arquivos; clicar abre (T2, ainda por vir).

const $ = (id) => document.getElementById(id);

/*
 * Atalhos da traducao. Ver js/i18n.js.
 *
 * `T` e usado centenas de vezes neste arquivo; escrever window.I.t() em cada
 * uma faria a linha crescer sem dizer nada a mais.
 */
const T = (chave, params) => window.I.t(chave, params);

/**
 * A frase de um erro, no idioma da tela.
 *
 * Serve para os dois casos: recusa de negocio da DLL (tem codigo e params, e a
 * frase se monta do dicionario) e excecao qualquer do JS (so tem message). Sem
 * isto, cada `catch` teria de saber com qual dos dois esta lidando.
 */
const msgErro = (e) =>
  e && e.codigo ? window.I.doErro(e) : (e && e.message) || String(e);

/** Porta do CDP, guardada para a frase poder ser remontada em outro idioma. */
let portaCdp = null;

/** Classe CSS pela severidade do codigo -- ERROR_ vermelho, WARN_ amarelo. */
const sevErro = (e) => (e && e.codigo && window.I.severidade(e.codigo)) || "erro";

/**
 * O alvo do evento como ELEMENTO, ou null.
 *
 * `ev.target` nem sempre e um elemento: num keydown despachado sobre o
 * `document` -- o que qualquer codigo pode fazer, e o que um teste faz sem
 * pensar -- o alvo e o proprio documento, que nao tem `.matches` nem
 * `.closest`. Chamar um dos dois ali estoura com "is not a function", e o erro
 * aparece longe de quem o causou.
 */
const alvo = (ev) => (ev.target instanceof Element ? ev.target : null);

/* Barra invertida em regex ja quebrou este arquivo antes; aqui ela e um dado. */
const SEP_BARRA = String.fromCharCode(92);

/**
 * Caminho normalizado para COMPARAR.
 *
 * O Windows mistura `/` e `\` no mesmo caminho e não distingue maiúscula de
 * minúscula; comparar cru erra em silêncio.
 */
function chaveCaminho(p) {
  return String(p || "").split(SEP_BARRA).join("/").toLowerCase();
}

/** .T. quando o texto ja e caminho, e nao so um nome de arquivo. */
function ehCaminho(txt) {
  const t = String(txt || "");
  return t.includes("/") || t.includes(SEP_BARRA) || t.includes(":");
}

/**
 * A conexao que contem este arquivo, ou null.
 *
 * Serve para saber se algo que acabamos de criar cai numa pasta que a arvore
 * mostra -- exportar para dentro de uma conexao aberta e o caso comum, e a
 * arvore ficar desatualizada faz o usuario procurar no Explorer um arquivo que
 * o proprio app acabou de gerar.
 */
function conexaoDoCaminho(caminho) {
  const norm = (p) => {
    let x = String(p || "").split(SEP_BARRA).join("/").toLowerCase();
    while (x.endsWith("/")) x = x.slice(0, -1);
    return x;
  };
  const inteiro = norm(caminho);
  const pasta = inteiro.slice(0, inteiro.lastIndexOf("/"));
  return conexoes.find((c) => norm(c.dir) === pasta) || null;
}

/**
 * Caminho como o Windows escreve, SO PARA EXIBIR.
 *
 * Internamente circula com "/" -- e o que o Directory() devolve, o que o
 * usuario digita na conexao, e o que CaminhoOS() normaliza do lado Harbour.
 * Misturar as duas formas na tela ("J:/bases/base01/NETCLI.DBF") nao esta
 * errado tecnicamente, mas nao e o que o usuario ve no Explorer, e faz duvidar
 * se o caminho e o mesmo.
 *
 * A conversao acontece so na saida para a tela: mudar o valor guardado
 * obrigaria todo o resto a lidar com as duas formas.
 */
function paraExibir(caminho) {
  return String(caminho || "").split("/").join(SEP_BARRA);
}


// Conexoes expandidas e o cache dos arquivos ja lidos, por nome de conexao.
const expandidas = new Set();
const arquivosDe = new Map();
let conexoes = [];
let filtro = "";

// Abas: um arquivo aberto = um handle = uma aba.
let abas = [];        // [{h, alias, caminho, conexao, info}]
let abaAtiva = null;  // handle
let fechados = [];    // handles fechados, com o motivo

// Ordem das abas, por CAMINHO (nao por handle: handle muda a cada sessao).
// A DLL e dona de QUAIS arquivos estao abertos; a ordem de exibicao e da UI.
let ordemAbas = [];

// ---------------------------------------------------------------- utilidades

function tamanhoLegivel(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// "20260831" -> "31/08/2026"
function dataLegivel(aaaammdd) {
  if (!aaaammdd || aaaammdd.length !== 8) return "";
  return aaaammdd.slice(6, 8) + "/" + aaaammdd.slice(4, 6) + "/" + aaaammdd.slice(0, 4);
}

function hint(texto) {
  $("hint").textContent = texto || "";
}

function combina(texto) {
  return !filtro || texto.toLowerCase().includes(filtro);
}

// .T. quando algum arquivo JA LIDO da conexao casa com a busca.
function casaAlgum(con) {
  const arqs = arquivosDe.get(con.name);
  return Array.isArray(arqs) && arqs.some((a) => combina(a.name));
}

// ------------------------------------------------------------------- arvore

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function linhaConexao(con) {
  // Com busca ativa a conexao abre sozinha para mostrar o que casou. Sem isto o
  // usuario digita "netcli", ve a conexao aparecer na lista e nao ve o arquivo
  // -- a busca acha e esconde ao mesmo tempo. `expandidas` nao e tocada: ela e
  // escolha do usuario e vai para o disco; isto aqui e so exibicao.
  const aberta = expandidas.has(con.name) || (!!filtro && casaAlgum(con));
  const li = elemento("li", "conexao" + (aberta ? " aberta" : ""));

  const cab = elemento("div", "cab");
  cab.tabIndex = 0;
  cab.setAttribute("role", "button");
  cab.setAttribute("aria-expanded", String(aberta));
  cab.dataset.conexao = con.name;

  cab.appendChild(elemento("span", "seta", aberta ? "▾" : "▸"));
  cab.appendChild(elemento("span", "nome", con.name));

  if (!con.exists) {
    const aviso = elemento("span", "aviso", T("UI_FOLDER_NOT_FOUND"));
    aviso.title = paraExibir(con.dir);
    cab.appendChild(aviso);
  }

  /*
   * UM botao, e nao tres.
   *
   * Eram tres icones por linha -- abrir no Explorer, reler, remover. Numa
   * arvore com 278 pastas isso e ruido, e icone sozinho tem de ser decifrado:
   * so o tooltip dizia o que cada um fazia. No menu cada acao tem RÓTULO, o
   * destrutivo fica separado dos outros por uma linha, e sobra lugar para as
   * acoes que ainda vao aparecer sem a linha crescer de novo.
   *
   * O preco e um clique a mais no recarregar, que e o mais usado dos tres.
   */
  // Classe `acoes-conexao`, e NAO `menu-conexao`: o menu flutuante usa esse
  // segundo nome, e o botao herdava as regras dele -- position:fixed,
  // min-width:190px, borda e sombra. Cada linha da arvore ganhava uma caixa de
  // 190px por cima. Dois elementos diferentes nao podem dividir o nome.
  const menu = elemento("button", "acoes-conexao", "⋯");
  menu.type = "button";
  menu.title = T("UI_CONNECTION_ACTIONS", { name: con.name });
  menu.setAttribute("aria-haspopup", "menu");
  menu.setAttribute("aria-expanded", "false");
  menu.dataset.menuConexao = con.name;
  cab.appendChild(menu);

  // O caminho fica no tooltip, nao fixo na arvore: ocupa uma linha por conexao
  // e polui a lista. Tambem aparece na barra de status ao passar o mouse.
  cab.title = [con.name, paraExibir(con.dir)].join(String.fromCharCode(10));
  cab.dataset.dir = con.dir;   /* cru; paraExibir() so na hora de mostrar */

  li.appendChild(cab);

  if (aberta) {
    li.appendChild(listaArquivos(con));
  }

  return li;
}

function listaArquivos(con) {
  const arquivos = arquivosDe.get(con.name);

  if (arquivos === undefined) {
    return elemento("div", "carregando", T("UI_READING_FOLDER"));
  }
  if (arquivos === null) {
    return elemento("div", "carregando erro", T("UI_FOLDER_UNREADABLE"));
  }

  const visiveis = arquivos.filter((a) => combina(a.name) || combina(con.name));

  if (!visiveis.length) {
    return elemento(
      "div",
      "carregando",
      arquivos.length ? T("UI_NO_MATCH_SEARCH") : T("UI_NO_DBF_HERE")
    );
  }

  const ul = elemento("ul", "arquivos");
  for (const arq of visiveis) {
    const li = elemento("li", "arquivo");
    li.tabIndex = 0;
    li.dataset.caminho = arq.path;
    li.dataset.conexao = con.name;
    li.textContent = arq.name;

    // Metadados saem da arvore -- ela e uma lista de nomes. O detalhe vive no
    // painel da direita; aqui fica so como tooltip, que nao ocupa espaco.
    const det = [tamanhoLegivel(arq.size), dataLegivel(arq.date)];
    if (arq.fields) det.push(T("UI_FIELDS_COUNT", { n: arq.fields }));
    if (arq.memo) det.push(T("UI_MEMO"));
    if (arq.indexes.length) det.push(arq.indexes.join(", "));
    if (!arq.valid) {
      li.classList.add("invalido");
      det.unshift(T("UI_NOT_A_DBF_SHORT", { reason: arq.reason }));
    }
    li.title = [arq.name].concat(det).join(String.fromCharCode(10));

    ul.appendChild(li);
  }
  return ul;
}

function desenhar() {
  const arvore = $("arvore");
  arvore.textContent = "";

  if (!conexoes.length) {
    arvore.appendChild(elemento("p", "arvore-vazia", T("UI_NO_CONNECTIONS")));
    return;
  }

  // Com busca ativa, a conexao aparece se o nome dela casar OU se algum
  // arquivo ja carregado casar.
  const visiveis = conexoes.filter((con) => {
    if (!filtro) return true;
    if (combina(con.name)) return true;
    return casaAlgum(con);
  });

  if (!visiveis.length) {
    arvore.appendChild(elemento("p", "arvore-vazia", T("UI_NOTHING_MATCHES")));
    return;
  }

  const ul = elemento("ul", "conexoes");
  for (const con of visiveis) ul.appendChild(linhaConexao(con));
  arvore.appendChild(ul);
}

// -------------------------------------------------------------------- dados

async function carregarConexoes() {
  // As conexoes vem no session.state; esta funcao existe so para os pontos que
  // precisam recarregar so a lista, sem repintar tudo.
  const r = await QDBU.rpc("workspace.list");
  conexoes = r.connections;
  desenhar();
}

async function abrirConexao(nome) {
  expandidas.add(nome);
  desenhar();

  try {
    const r = await QDBU.rpc("workspace.files", { name: nome });
    arquivosDe.set(nome, r.files);
    desenhar();
    agendarSalvar();
  } catch (e) {
    arquivosDe.set(nome, null);
    desenhar();
    hint(msgErro(e));
  }
}

// A busca varre TODAS as conexoes cadastradas, nao so as expandidas: procurar um
// arquivo e justamente o caso em que nao se sabe em qual pasta ele esta. As
// pastas ainda nao lidas entram no cache na primeira busca; da segunda em diante
// o filtro e local.
//
// Sequencial de proposito: a DLL roda numa thread so e as chamadas enfileiram de
// qualquer jeito. Redesenhar a cada pasta faz o resultado ir aparecendo em vez
// de tudo de uma vez no fim.
async function carregarPastasPendentes() {
  const faltam = conexoes.filter((c) => c.exists && !arquivosDe.has(c.name));
  if (!faltam.length) return;

  for (const con of faltam) {
    try {
      const r = await QDBU.rpc("workspace.files", { name: con.name });
      arquivosDe.set(con.name, r.files);
    } catch (e) {
      arquivosDe.set(con.name, null);
    }
    desenhar();
  }
}

async function removerConexao(nome) {
  // Antipadrao H do catalogo: operacao destrutiva sem confirmacao. Remover a
  // conexao nao apaga dado nenhum, mas apaga cadastro -- e ja aconteceu de sair
  // por engano num clique.
  if (!window.confirm(T("UI_CONFIRM_REMOVE_CONNECTION", { name: nome }))) {
    return;
  }
  await QDBU.rpc("workspace.remove", { name: nome });
  expandidas.delete(nome);
  arquivosDe.delete(nome);
  await carregarConexoes();
  hint(T("INFO_CONNECTION_REMOVED", { name: nome }));
}

// --------------------------------------------------------------------- abas

// Duas conexoes podem ter NETCLI.DBF; o rotulo precisa dizer de qual e, senao
// da para editar o arquivo errado. E o que o ARC faz no titulo da janela.
function rotuloAba(a) {
  return a.conexao ? a.alias + " @" + a.conexao : a.alias;
}

function desenharAbas() {
  const cx = $("abas");
  // Se o foco estava numa aba, devolve depois de recriar -- senao a navegacao
  // por teclado morre no primeiro clique.
  const focada = document.activeElement && document.activeElement.closest
    ? (document.activeElement.closest(".aba") || {}).dataset
    : null;
  const hFocado = focada ? focada.h : null;

  cx.textContent = "";
  cx.hidden = abas.length === 0;

  for (const a of abas) {
    /*
     * Aba de arquivo perdido é MARCADA, não escondida. Esconder faria a pessoa
     * achar que fechou sozinha; deixar igual às outras faria ela clicar e
     * receber um erro sem entender de onde veio.
     */
    const solto = !!a.detached;
    const aba = elemento(
      "div",
      "aba" + (a.h === abaAtiva ? " ativa" : "") + (solto ? " solta" : "")
    );
    aba.dataset.h = a.h;
    aba.tabIndex = 0;
    aba.setAttribute("role", "tab");
    aba.setAttribute("aria-selected", String(a.h === abaAtiva));
    aba.title = solto
      ? T("UI_DETACHED_HINT") + "  " + paraExibir(a.caminho)
      : paraExibir(a.caminho);

    if (solto) {
      // O símbolo sozinho não é acessível: leitor de tela anuncia "aviso" ou
      // nada. A palavra vai no aria-label, e o ⚠ fica como marca visual.
      const marca = elemento("span", "aba-solta", "⚠");
      marca.setAttribute("role", "img");
      marca.setAttribute("aria-label", T("UI_DETACHED"));
      aba.appendChild(marca);
    }
    aba.appendChild(elemento("span", "aba-nome", rotuloAba(a)));

    const x = elemento("button", "aba-fechar", "×");
    x.dataset.fechar = a.h;
    x.title = T("UI_CLOSE_TAB", { alias: a.alias });
    aba.appendChild(x);

    cx.appendChild(aba);
  }

  if (hFocado) {
    const volta = cx.querySelector('.aba[data-h="' + hFocado + '"]');
    if (volta) volta.focus();
  }
}

// O contrato usa SHARED/EXCLUSIVE; a tela fala portugues. A UI decide pelo
// codigo, nunca pelo texto -- e o que permite traduzir depois sem quebrar nada.
const MODO = { SHARED: "UI_MODE_SHARED", EXCLUSIVE: "UI_MODE_EXCLUSIVE" };
const modoTexto = (m) => (MODO[m] ? T(MODO[m]) : String(m || "").toLowerCase());

function cartao(rotulo, valor, classe) {
  const d = elemento("div", "cartao" + (classe ? " " + classe : ""));
  d.appendChild(elemento("span", "c-rot", rotulo));
  d.appendChild(elemento("span", "c-val", valor));
  return d;
}

function desenharConteudo() {
  const a = abas.find((x) => x.h === abaAtiva);

  $("vazio").hidden = !!a;
  $("conteudo").hidden = !a;
  if (!a) {
    $("desconectado").hidden = true;
    return;
  }

  /*
   * R6: arquivo perdido → o painel cobre tudo e a grade não é desenhada.
   *
   * Sair aqui é o ponto: nada abaixo desta linha roda, então nenhuma linha
   * antiga chega à tela. Tentar desenhar e depois esconder deixaria uma janela
   * de um quadro em que os dados velhos aparecem.
   */
  if (a.detached) {
    /*
     * A grade é ESVAZIADA, e não apenas coberta.
     *
     * O painel é `position:absolute; inset:0`, então ninguém vê as linhas
     * embaixo — e foi exatamente isso que quase passou: o teste acusou 20
     * linhas ainda no DOM. Cobrir não é limpar. Se o painel falhar em aparecer
     * por qualquer motivo, o que fica na tela são dados de um arquivo que não
     * está mais aberto, que é a falha que a R6 existe para impedir.
     */
    // Esvazia o CONTEÚDO, preservando a estrutura: `desenharGrade()` faz
    // `querySelector("thead tr")` e assume que o <tr> existe. Apagar o thead
    // inteiro fazia esse seletor devolver null e derrubar a pintura em
    // silêncio — a grade ficava vazia até depois de reconectar.
    const corpo = $("grade").querySelector("tbody");
    if (corpo) corpo.textContent = "";
    const cabLinha = $("grade").querySelector("thead tr");
    if (cabLinha) cabLinha.textContent = "";
    $("cartoes").textContent = "";

    // A barra de posição também: ela dizia "1-20 de 20" sobre um arquivo que
    // não está mais aberto. Só apareceu ao olhar o screenshot — o teste de DOM
    // conferia a grade e não a barra.
    atualizarBarraGrade(null);

    $("desconectado").hidden = false;
    $("dc-titulo").textContent = a.alias || a.info.file || "";
    $("dc-motivo").textContent = msgErro({
      codigo: "ERROR_HANDLE_DETACHED",
      params: { file: a.info.file || a.alias, why: a.detachedWhy },
    });
    msgDesconectado("");
    return;
  }
  /* Limpa a mensagem ao sair do estado: reabrir o painel depois mostraria o
     motivo antigo por um quadro. */
  $("desconectado").hidden = true;
  $("dc-motivo").textContent = "";
  msgDesconectado("");

  const i = a.info;

  const cx = $("cartoes");
  cx.textContent = "";
  cx.appendChild(cartao(T("UI_CARD_RECORDS"), window.I.numero(i.records)));
  cx.appendChild(cartao(T("UI_CARD_FIELDS"), String(i.fieldCount)));
  cx.appendChild(cartao(T("UI_CARD_RECSIZE"), window.I.numero(i.recordSize)));
  cx.appendChild(cartao(T("UI_CARD_MODE"), modoTexto(i.mode), i.exclusive ? "alerta" : ""));
  cx.appendChild(cartao("RDD", i.rdd));
  if (i.hasMemo) {
    cx.appendChild(cartao(T("UI_CARD_MEMO"), i.memoFile || T("UI_YES")));
  }

  /*
   * `lastUpdate` sai do CABEÇALHO do DBF, não da data do arquivo em disco.
   * Copiar um DBF muda a data do arquivo e não muda a do cabeçalho — e a
   * pergunta que este cartão responde é "quando o DADO mudou pela última vez".
   */
  if (i.lastUpdate) {
    cx.appendChild(cartao(T("UI_CARD_LAST_UPDATE"), dataLegivel(i.lastUpdate)));
  }
  if (i.bytes) cx.appendChild(cartao(T("UI_CARD_SIZE"), tamanhoLegivel(i.bytes)));
  if (i.codepage) cx.appendChild(cartao(T("UI_CARD_CODEPAGE"), rotuloCodepage(i.codepage)));

  desenharGrade();
  desenharComboOrdem();
  desenharComboCodepage();

  desenharEstrutura(a);
}

/*
 * A tabela de campos, em dois modos.
 *
 * LEITURA é o que sempre existiu: uma linha por campo, nada clicável. EDIÇÃO
 * troca as células por controles e acrescenta a coluna de marca. A tabela é a
 * mesma de propósito — trocar de modo não pode reorganizar a tela, senão a
 * pessoa perde de vista onde estava.
 */
/*
 * A ABA "ESTRUTURA": listagem SOMENTE LEITURA.
 *
 * Não há rascunho aqui, e é isso que a torna incapaz de mostrar o arquivo
 * errado. O editor vive na modal `#dlg-estrutura`.
 */
function desenharEstrutura(a) {
  const corpo = $("estrutura").querySelector("tbody");
  corpo.textContent = "";

  const lista = a.fields || [];
  $("es-editar").hidden = !a.fields || a.detached;
  $("es-resumo-aba").textContent = lista.length
    ? T("UI_STRUCT_SUMMARY", { n: lista.length, bytes: 1 + lista.reduce((t, c) => t + Number(c.len || 0), 0) })
    : "";

  for (const c of lista) {
    const tr = document.createElement("tr");
    tr.appendChild(elemento("td", "es-marca", ""));
    for (const [v, cls] of [
      [c.n, "num dim"], [c.name, "nome"], [c.type, "tipo"],
      [c.len, "num"], [c.dec, "num"],
    ]) {
      tr.appendChild(elemento("td", cls, String(v)));
    }
    corpo.appendChild(tr);
  }
}


/*
 * A TABELA DA MODAL: a mesma de antes, com as células editáveis.
 *
 * Separada da listagem de propósito. Enquanto as duas eram a mesma função, o
 * `emEdicao` decidia linha a linha qual das duas telas estava sendo pintada --
 * e bastava esse booleano estar certo pela razão errada para o rascunho de um
 * arquivo aparecer sob o cabeçalho de outro.
 */
function desenharEditor() {
  const corpo = $("ed-estrutura").querySelector("tbody");
  corpo.textContent = "";
  if (!esRascunho) return;

  esRascunho.forEach((c, i) => {
    const tr = document.createElement("tr");
    const erros = c._removido ? [] : esValidaCampo(c, esRascunho, i);
    const estado = c._removido ? "sumiu" : !c._de ? "novo" : esMudou(c) ? "mudou" : "";
    tr.className = (estado ? estado + " " : "") + (i === esSel ? "sel" : "");
    tr.dataset.i = String(i);

    /*
     * NA LINHA REMOVIDA, A MARCA É UM BOTÃO DE VOLTAR.
     *
     * Desfazer sempre foi possível — bastava clicar `−` de novo — mas nada na
     * tela dizia isso: a linha riscada com os campos desabilitados PARECE
     * morte, não pendência, e o botão continuava rotulado "marcar para
     * remoção". Poder desfazer e não descobrir como equivale a não poder.
     */
    const tdM = elemento("td", "es-marca");
    if (estado === "sumiu") {
      const volta = elemento("button", "es-voltar", "↺");
      volta.type = "button";
      volta.title = T("UI_RESTORE_FIELD", { field: c.name });
      volta.addEventListener("click", (ev) => {
        ev.stopPropagation();
        c._removido = false;
        desenharEditor();
      });
      tdM.appendChild(volta);
    } else {
      tdM.textContent = { novo: "+", mudou: "•" }[estado] || "";
      if (estado) tdM.title = T("UI_ROW_" + estado.toUpperCase());
    }
    tr.appendChild(tdM);

    tr.appendChild(elemento("td", "num dim", String(i + 1)));

    tr.appendChild(esCelulaNome(c, erros));
    tr.appendChild(esCelulaTipo(c));
    /* Tamanho e decimais que o TIPO já decide ficam desabilitados, e não só
       ignorados: um campo editável cujo valor a validação depois descarta
       convida a pessoa a digitar algo que some sem explicação. Data, lógico e
       memo têm largura fixa; decimais só existem em numérico. */
    tr.appendChild(esCelula(c, "len", "number", erros.some((e) => e.includes("LEN")),
                            "num", "DLM".includes(c.type)));
    tr.appendChild(esCelula(c, "dec", "number", erros.some((e) => e.includes("DEC")),
                            "num", c.type !== "N"));

    if (erros.length) tr.title = erros.map((e) => T(e)).join(" · ");
    corpo.appendChild(tr);
  });

  esResumo();
}

/* Mudou em relação ao que está no disco? */
/*
 * A ORDEM DOS CAMPOS MUDOU?
 *
 * COMPARA SEQUÊNCIAS, e não índices. Pôr o rascunho vivo lado a lado com
 * `esOriginal` posição a posição dá certo enquanto ninguém remove nada: remover
 * encurta a lista viva, todo mundo depois anda uma casa, e a comparação acusa
 * "a ordem mudou" sobre uma alteração que não mexeu na ordem de nada.
 *
 * O certo é comparar as duas sequências de nomes ORIGINAIS dos sobreviventes: a
 * ordem em que estão agora contra a ordem em que estavam.
 *
 * MORA AQUI, sozinha, porque duas telas dependem dela -- o bloco de impacto e o
 * botão Aplicar. Enquanto cada uma tinha a sua conta, o impacto anunciava a
 * reordenação e o botão continuava travado dizendo "nada foi alterado":
 * arrastar campos de lugar era a única alteração que não dava para aplicar.
 */
function esOrdemMudou() {
  if (!esRascunho || !esOriginal) return false;
  const vivos = esRascunho.filter((c) => !c._removido && c._de).map((c) => c._de.name);
  const antes = esOriginal.map((c) => c.name).filter((n) => vivos.indexOf(n) >= 0);
  return vivos.join(" ") !== antes.join(" ");
}

function esMudou(c) {
  if (!c._de) return false;
  return ["name", "type", "len", "dec"].some((k) => String(c[k]) !== String(c._de[k]));
}

/*
 * A célula do nome, que na linha removida ganha o aviso.
 *
 * O `line-through` do CSS não alcançava o nome: ele está dentro de um `<input>`,
 * e a decoração da célula não atravessa o controle. O resultado era o número
 * riscado e o nome intacto — meia mensagem. Aqui o próprio input recebe a
 * decoração, e um `⚠` ao lado amarra a ideia.
 */
function esCelulaNome(c, erros) {
  const td = esCelula(c, "name", "text", erros.some((e) => e.includes("NAME")));
  if (!c._removido) return td;

  td.classList.add("nome-com-aviso");
  const aviso = elemento("span", "es-aviso", "⚠");
  aviso.setAttribute("role", "img");
  aviso.dataset.dica = T("UI_FIELD_WILL_GO");
  aviso.setAttribute("aria-label", T("UI_FIELD_WILL_GO"));
  td.appendChild(aviso);
  return td;
}

function esCelula(c, campo, tipo, ruim, classe, travado) {
  const td = elemento("td", classe || "");
  const inp = document.createElement("input");
  /*
   * NÚMERO É `type="text"` COM TECLADO NUMÉRICO, e não `type="number"`.
   *
   * Três motivos, e o primeiro é o que a reclamação expôs:
   *
   *   1. `input[type=number]` NÃO EXPÕE SELEÇÃO -- `selectionStart` devolve
   *      `null` por especificação. Então `select()` no foco não pode nem ser
   *      verificado, e era exatamente o comportamento que faltava: clicar num
   *      tamanho `0` deixava o cursor ao lado dele, e digitar `8` dava `08`.
   *   2. A setinha de incremento polui uma grade densa e rouba largura.
   *   3. Com texto, os dígitos são filtrados por nós -- nada de `e`, `+` ou
   *      `-`, que o campo numérico do navegador aceita e o DBF não.
   */
  if (tipo === "number") {
    inp.type = "text";
    inp.inputMode = "numeric";
    inp.autocomplete = "off";
  } else {
    inp.type = tipo;
  }
  inp.value = c[campo];
  inp.disabled = !!c._removido || !!travado;
  if (ruim) inp.className = "ruim";

  /*
   * O NÚMERO É SELECIONADO AO RECEBER O FOCO.
   *
   * Sem isto, clicar num tamanho que vale `0` deixa o cursor ao lado do zero:
   * digitar `8` produz `08` ou `80`, e a pessoa precisa apagar antes de
   * escrever. Com a seleção, digitar SUBSTITUI — que é o que se espera de uma
   * grade, e o que toda planilha faz.
   *
   * Só nos numéricos: no nome, selecionar tudo faria a primeira tecla apagar um
   * nome existente que a pessoa só queria corrigir.
   */
  if (tipo === "number") {
    /*
     * A seleção acontece no QUADRO SEGUINTE, e não dentro do `focus`.
     *
     * Chamado direto no manipulador, o `select()` roda e o navegador recolhe a
     * seleção logo depois -- ele posiciona o cursor por conta própria ao
     * terminar de processar o foco (e, no clique, ao processar o `mouseup`).
     * Medido: `selectionStart` saía 1 num valor "8", ou seja, cursor no fim e
     * nada selecionado. Adiar um tique deixa o navegador terminar primeiro.
     */
    inp.addEventListener("focus", () => setTimeout(() => inp.select(), 0));
  }
  /*
   * `input` atualiza o modelo e o resumo, sem tocar na tabela: redesenhar a
   * cada tecla tiraria o cursor do campo. O que precisa mudar de imediato é a
   * marca de erro na própria célula, e isso é uma classe.
   */
  inp.addEventListener("input", () => {
    /*
     * O NOME É NORMALIZADO ENQUANTO SE DIGITA, e não conferido no fim.
     *
     * A posição do cursor é preservada: sem isso, digitar no meio de um nome
     * jogava o cursor para o fim a cada tecla — o campo "corrigia" e a pessoa
     * perdia o lugar. O ajuste é a diferença de tamanho, porque `esNomeValido`
     * pode encurtar (símbolo removido) sem mexer no que veio antes.
     */
    if (campo === "name") {
      const antes = inp.value;
      const cursor = inp.selectionStart;
      const limpo = esNomeValido(antes);
      if (limpo !== antes) {
        inp.value = limpo;
        const delta = limpo.length - antes.length;
        inp.setSelectionRange(Math.max(0, cursor + delta), Math.max(0, cursor + delta));
      }
    }
    /*
     * Vazio CONTINUA vazio enquanto se digita.
     *
     * `Number("")` é 0, então apagar tudo escrevia 0 no modelo e o zero voltava
     * ao campo no próximo desenho -- era impossível deixar em branco nem por um
     * instante para digitar outro valor. O modelo guarda 0 (a validação precisa
     * de número), mas o INPUT fica como está até a pessoa sair dele.
     */
    /*
     * Só dígitos, e o cursor fica onde estava.
     *
     * Com `type="text"` a filtragem é nossa: uma letra teclada some sem mexer
     * no resto, e sem mandar o cursor para o fim -- que é o que acontecia no
     * campo do nome antes de eu preservar a posição.
     */
    if (tipo === "number") {
      const antes = inp.value;
      const so = antes.replace(/[^0-9]/g, "");
      if (so !== antes) {
        const cur = inp.selectionStart;
        inp.value = so;
        const d = so.length - antes.length;
        inp.setSelectionRange(Math.max(0, cur + d), Math.max(0, cur + d));
      }
    }

    /*
     * Vazio CONTINUA vazio enquanto se digita.
     *
     * `Number("")` é 0, então apagar tudo escrevia 0 no modelo e o zero voltava
     * ao campo no próximo desenho -- era impossível deixar em branco nem por um
     * instante para digitar outro valor. O modelo guarda 0 (a validação precisa
     * de número), mas o INPUT fica como está até a pessoa sair dele.
     */
    c[campo] = tipo === "number" ? Number(inp.value || 0) : inp.value;
    const i = esRascunho.indexOf(c);
    const erros = esValidaCampo(c, esRascunho, i);
    inp.classList.toggle(
      "ruim",
      erros.some((e) => e.includes(campo === "name" ? "NAME" : campo === "len" ? "LEN" : "DEC"))
    );
    esMarcaDaLinha(c, i);
    esResumo();
  });
  /* No `change` (ao sair do campo) roda a validação CRUZADA -- nome duplicado
     com OUTRA linha precisa aparecer nas duas. Sem reconstruir a tabela: ver
     `esRevalidar()`, e o Tab que voltava para o topo. */
  inp.addEventListener("change", () => esRevalidar());
  td.appendChild(inp);
  return td;
}

/*
 * O tipo é um `select`, e não texto livre.
 *
 * São cinco valores e um deles errado invalida o arquivo inteiro. Digitar "X"
 * e descobrir no Aplicar seria pior que não poder digitar.
 */
function esCelulaTipo(c) {
  const td = elemento("td", "tipo");
  const sel = document.createElement("select");
  sel.disabled = !!c._removido;
  for (const t of ES_TIPOS) {
    const o = new Option(t + " — " + window.I.tipo(t), t);
    sel.appendChild(o);
  }
  sel.value = c.type;
  sel.addEventListener("change", () => {
    c.type = sel.value;
    // Os tipos de tamanho fixo se ajustam sozinhos: deixar a pessoa digitar
    // "7" num campo Data só produziria um erro que o app já sabe evitar.
    if (c.type === "D") { c.len = 8; c.dec = 0; }
    if (c.type === "L") { c.len = 1; c.dec = 0; }
    if (c.type === "M") { c.len = 10; c.dec = 0; }
    // `dec` só tem significado em N. Em C ele era parte da largura no Clipper,
    // mas aqui a largura vai inteira em `len` — ver esValidaCampo().
    if (c.type !== "N") c.dec = 0;
    /* Sem reconstruir: quem acabou de escolher o tipo costuma seguir de Tab
       para o tamanho, e recriar os campos aqui jogaria o foco para o topo. */
    esRevalidar();
  });
  td.appendChild(sel);
  return td;
}

/*
 * A lista de erros: nome do campo e o que está errado.
 *
 * Cada item leva ATÉ o campo — clicar seleciona a linha, rola até ela e põe o
 * foco na célula culpada. Dizer "SUJO está errado" numa tabela de 120 campos e
 * deixar a pessoa procurar seria só metade do trabalho.
 */
function esListaErros() {
  const ul = $("es-erros-lista");
  ul.textContent = "";

  /*
   * UMA LINHA POR CAMPO, com os problemas dele MESCLADOS.
   *
   * Contando erros em vez de campos, um campo sem nome e com tamanho inválido
   * aparecia duas vezes na lista e o título dizia "3 campos com problema"
   * havendo 2. Quem lê conta campos, não violações.
   *
   * Campo sem nome é chamado pela POSIÇÃO — "campo 9" —, porque "(campo sem
   * nome)" repetido não distingue um do outro e não ajuda a achar nenhum.
   */
  const achados = [];
  (esRascunho || []).forEach((c, i) => {
    if (c._removido) return;
    const erros = esValidaCampo(c, esRascunho, i);
    if (!erros.length) return;
    achados.push({
      i,
      campo: (c.name || "").trim() || T("UI_FIELD_AT", { n: i + 1 }),
      erro: erros[0],                                  // guia o foco
      texto: erros.map((e) => T(e)).join(" · "),       // todos, mesclados
    });
  });

  /*
   * NENHUM CAMPO é um erro por si, e sem esta linha ele não aparecia em lugar
   * nenhum: a lista de achados percorre os campos, e uma lista vazia não tem o
   * que reprovar. O botão ficava liberado sobre uma estrutura impossível; a DLL
   * recusava, mas só depois de o usuário confirmar duas perguntas e esperar.
   */
  const vazio = (esRascunho || []).every((c) => c._removido);

  $("es-erros").hidden = achados.length === 0 && !vazio;
  $("es-erros-titulo").textContent =
    (vazio ? T("UI_STRUCT_EMPTY") : T("UI_STRUCT_ERRORS", { n: achados.length })) + ":";

  /* Sem campo nenhum não há campo a citar: a linha é a instrução, sem o botão
     de nome que as outras têm para levar o foco até a célula culpada. */
  if (vazio) {
    ul.appendChild(elemento("li", "", T("UI_STRUCT_EMPTY_HINT")));
    achados.push({ i: 0, campo: "", erro: "ERROR_NO_FIELDS", texto: "" });
    return achados;
  }

  for (const a of achados) {
    const li = document.createElement("li");
    const nome = elemento("button", "es-erro-campo", a.campo);
    nome.type = "button";
    nome.addEventListener("click", () => {
      esSelecionar(a.i);
      const tr = $("ed-estrutura").querySelector('tbody tr[data-i="' + a.i + '"]');
      if (!tr) return;
      tr.scrollIntoView({ block: "nearest" });
      // O foco vai para a célula que o erro cita, e não para a primeira: quem
      // clicou num erro de tamanho quer digitar o tamanho.
      const qual = a.erro.includes("NAME") ? 0 : a.erro.includes("DEC") ? 2 : 1;
      const campos = tr.querySelectorAll("input");
      const alvoInp = campos[Math.min(qual, campos.length - 1)];
      if (alvoInp) alvoInp.focus();
    });
    li.appendChild(nome);
    li.appendChild(document.createTextNode(" — " + a.texto));
    ul.appendChild(li);
  }

  return achados;
}

/* Atualiza só a marca de estado da linha, sem recriar nada. */
/*
 * REVALIDA TUDO SEM RECONSTRUIR A TABELA.
 *
 * O `change` (sair do campo) precisa rodar a validação CRUZADA -- nome
 * duplicado envolve DUAS linhas, e marcar só a que se está editando deixa a
 * outra limpa. A primeira versão resolvia isso chamando `desenharEditor()`, que
 * refaz a tabela inteira.
 *
 * E refazer a tabela DESTRÓI O FOCO. Tab dispara `blur` -> `change` -> os
 * `<input>` são recriados, o elemento que o navegador ia focar em seguida deixa
 * de existir, e a tabulação recomeça do topo da página. Foi o que o autor
 * relatou: criar um campo, digitar o nome, dar Tab, e o cursor saltar para o
 * começo da lista em vez de ir para a coluna do tipo.
 *
 * Aqui nada é criado nem removido: os mesmos elementos são atualizados no
 * lugar. O foco e a ordem de tabulação sobrevivem porque o DOM não muda de
 * forma. Só as OPERAÇÕES DE ESTRUTURA -- adicionar, inserir, remover, mover --
 * continuam chamando `desenharEditor()`, e nelas a tabela muda mesmo.
 */
function esRevalidar() {
  if (!esRascunho) return;

  esRascunho.forEach((c, i) => {
    const tr = $("ed-estrutura").querySelector('tbody tr[data-i="' + i + '"]');
    if (!tr) return;

    const erros = c._removido ? [] : esValidaCampo(c, esRascunho, i);
    const inps = tr.querySelectorAll("input");
    const marca = (inp, chave) => {
      if (inp) inp.classList.toggle("ruim", erros.some((e) => e.includes(chave)));
    };
    marca(inps[0], "NAME");
    marca(inps[1], "LEN");
    marca(inps[2], "DEC");

    /* O tipo pode ter mudado por outra célula (o combo ajusta `len` e `dec`
       sozinho): os campos numéricos são reescritos a partir do modelo, e a
       trava acompanha. Não se toca no campo que está sendo digitado. */
    if (inps[1] && document.activeElement !== inps[1]) inps[1].value = c.len;
    if (inps[2] && document.activeElement !== inps[2]) inps[2].value = c.dec;
    if (inps[1]) inps[1].disabled = !!c._removido || "DLM".includes(c.type);
    if (inps[2]) inps[2].disabled = !!c._removido || c.type !== "N";

    tr.title = erros.length ? erros.map((e) => T(e)).join(" · ") : "";
    esMarcaDaLinha(c, i);
  });

  esResumo();
}

function esMarcaDaLinha(c, i) {
  const tr = $("ed-estrutura").querySelector('tbody tr[data-i="' + i + '"]');
  if (!tr) return;
  const estado = c._removido ? "sumiu" : !c._de ? "novo" : esMudou(c) ? "mudou" : "";
  tr.classList.remove("novo", "mudou", "sumiu");
  if (estado) tr.classList.add(estado);
  const td = tr.querySelector("td.es-marca");
  if (td) {
    td.textContent = { novo: "+", mudou: "•", sumiu: "×" }[estado] || "";
    td.title = estado ? T("UI_ROW_" + estado.toUpperCase()) : "";
  }
}

/* A barra: quantos campos, o tamanho do registro, e quantos erros faltam. */
function esResumo() {
  if (!esRascunho) { $("es-resumo").textContent = ""; return; }

  const vivos = esRascunho.filter((c) => !c._removido);
  const achados = esListaErros();
  const bytes = esTamanhoRegistro(esRascunho);
  const mudou =
    esRascunho.some((c) => c._removido || !c._de || esMudou(c)) || esOrdemMudou();

  /*
   * A BARRA NÃO REPETE O ERRO.
   *
   * Ela chegou a mostrar "SUJO — número: de 1 a 19", a mesma frase que a faixa
   * acima da tabela já dizia — as duas separadas por meia tela. Informação
   * repetida longe de si mesma é pior que dita uma vez: a pessoa lê duas
   * vezes, e ainda tem de conferir se são a mesma coisa.
   *
   * A faixa é o lugar: fica colada na tabela, cabe a lista inteira, e os nomes
   * lá são clicáveis. Aqui fica só o que a faixa não diz — quantos campos e
   * quantos bytes o registro vai ter.
   */
  $("es-resumo").textContent = T("UI_STRUCT_SUMMARY", { n: vivos.length, bytes });
  $("es-resumo").className = "es-resumo";

  /* O botão travado DIZ o que o trava, no próprio `title`: cinza e mudo é o que
     leva a pessoa a clicar várias vezes sem entender. */
  const bAplicar = $("es-aplicar");
  /* Num arquivo novo o botão CRIA, e o texto tem de dizer isso: "Aplicar" sobre
     algo que ainda não existe não descreve o que vai acontecer. E não há "nada
     alterado" -- há campos montados, que bastam. */
  bAplicar.textContent = T(esNovo ? "UI_CREATE" : "UI_APPLY");
  bAplicar.disabled = achados.length > 0 || (!esNovo && !mudou);
  bAplicar.title = achados.length
    ? T("UI_APPLY_BLOCKED", { n: achados.length })
    : !esNovo && !mudou
    ? T("UI_APPLY_NOTHING")
    : bAplicar.textContent;

  esBotoes();

  // O impacto nos dados
  const itens = esImpacto();
  $("es-impacto").hidden = itens.length === 0;
  const ul = $("es-impacto-lista");
  ul.textContent = "";
  for (const it of itens) {
    ul.appendChild(elemento("li", it.grave ? "grave" : "", T(it.chave, it.p)));
  }
}

/**
 * Repinta a UI inteira a partir do que a DLL tem NA MEMORIA.
 *
 * `session.state` e a fonte da verdade: conexoes, arquivos abertos (com estado
 * vivo lido da work area) e handles fechados com o motivo. Se o front quebrar,
 * recarregar ou perder o proprio estado, uma chamada reconstroi tudo -- sem
 * reabrir nenhum arquivo.
 */
/**
 * Reordena `abas` conforme `ordemAbas`. O que nao estiver na lista vai para o
 * fim, na ordem em que a DLL devolveu -- assim um arquivo aberto agora aparece
 * ao lado do ultimo, e nao no meio.
 */
function aplicarOrdem() {
  const SEP = String.fromCharCode(92);
  const chave = (p) => p.split(SEP).join("/").toLowerCase();
  const pos = new Map(ordemAbas.map((p, i) => [chave(p), i]));

  abas.sort((a, b) => {
    const ia = pos.has(chave(a.caminho)) ? pos.get(chave(a.caminho)) : Infinity;
    const ib = pos.has(chave(b.caminho)) ? pos.get(chave(b.caminho)) : Infinity;
    return ia - ib;
  });

  ordemAbas = abas.map((a) => a.caminho);
}

/** Move a aba `h` para a posicao de `hAlvo`. */
function moverAba(h, hAlvo) {
  const de = abas.findIndex((a) => a.h === h);
  const para = abas.findIndex((a) => a.h === hAlvo);
  if (de < 0 || para < 0 || de === para) return false;

  const [item] = abas.splice(de, 1);
  abas.splice(para, 0, item);
  ordemAbas = abas.map((a) => a.caminho);

  desenharAbas();
  agendarSalvar();
  return true;
}

/** Garante que a aba ativa tem a estrutura carregada. */
/*
 * Carrega a estrutura da aba, e a recarrega quando o arquivo muda.
 *
 * Sob demanda de proposito: restaurar dez arquivos custaria dez file.open MAIS
 * dez file.info, tudo serializado na thread unica da VM, com a janela parada
 * antes de mostrar qualquer coisa. Assim se paga so pelo que se olha.
 *
 * O CACHE INVALIDA POR `rev`, e sem isso o T10 vira bug de cara: alterar a
 * estrutura reescrevia o arquivo, mas a aba Estrutura continuava listando os
 * campos velhos, e "Editar estrutura" abria o editor sobre a lista antiga --
 * ou seja, a alteracao seguinte seria montada em cima de uma foto vencida.
 *
 * `rev` e um contador que a DLL sobe a CADA mutacao, entao esta condicao cobre
 * de graca tudo o que ainda vai escrever: alterar estrutura, PACK, ZAP e as
 * operacoes em massa. O preco de um `rev` diferente e um `file.info` -- barato,
 * e so acontece quando algo realmente mudou.
 */
async function garantirEstrutura(aba) {
  if (!aba) return;
  if (aba.fields && aba.fieldsRev === QDBU.rev()) return;
  try {
    const rev = QDBU.rev();
    aba.fields = (await QDBU.rpc("file.info", { h: aba.h })).fields;
    aba.fieldsRev = rev;
    desenharConteudo();
    // O formulário depende de `fields` para saber o que pedir. Esta função é
    // assíncrona, então quem a chamou já seguiu adiante -- sem este empurrão,
    // abrir um arquivo com a visão Formulário aberta encontraria `fields` nulo,
    // desistiria em silêncio, e a tela ficaria com o arquivo anterior.
    garantirForm(aba);
  } catch (e) {
    /* aba pode ter sido fechada nesse meio tempo */
  }
}

/*
 * Torna `h` a aba ativa e deixa a tela inteira coerente com isso.
 *
 * Existe porque ativar uma aba aparecia em CINCO lugares -- abrir arquivo, ja
 * estava aberto, clique na aba, restaurar sessao, fechar a vizinha -- e cada um
 * repetia o mesmo trio na mao. Dois esqueciam garantirEstrutura(), entao dar
 * duplo clique num arquivo ja aberto trocava de aba e mostrava a lista de campos
 * VAZIA: a estrutura so e carregada sob demanda, e ninguem a pedia.
 */
/*
 * Poe os paineis laterais no arquivo que esta ativo AGORA.
 *
 * Eles sao por ARQUIVO: um painel aberto que continua listando os campos ou os
 * indices do arquivo anterior nao e so feio -- marcar uma coluna ali manda o
 * nome de um campo que nao existe no arquivo ativo, e a acao age no arquivo
 * errado ou e recusada por um motivo que a pessoa nao consegue entender.
 *
 * Estava escrito so dentro de ativarAba(), e fechar a aba nao passa por la:
 * fechar NETAGE00 promovia NETBOLE, a grade trocava para as 52 colunas dele, e
 * o painel seguia mostrando as 5 colunas do arquivo JA FECHADO.
 */
function sincronizarPaineis() {
  if (!$("painel-colunas").hidden) abrirPainelColunas();
  if (!$("painel-indices").hidden) abrirPainelIndices();
  if (!$("faixa-filtro").hidden) prepararFiltro();
}

function ativarAba(h) {
  abaAtiva = h;
  desenharAbas();
  desenharConteudo();
  garantirEstrutura(abas.find((a) => a.h === h));
  garantirPagina(abas.find((a) => a.h === h));
  garantirForm(abas.find((a) => a.h === h));

  sincronizarPaineis();
  desenharComboOrdem();

  // O indicador vale para a aba ATIVA: sem repintar aqui, uma aba sem filtro
  // herdaria o aviso da anterior e diria "filtrado" sobre a grade inteira.
  const a = abas.find((x) => x.h === h);
  marcarFiltroAtivo((a && a.info && a.info.filter) || "", null);
  ajustarBusca();
}

// Executa uma funcao de desenho isolando a falha: o resto da tela continua
// sendo pintado, e o erro aparece em vez de sumir.
function pintar(nome, fn) {
  try {
    fn();
  } catch (e) {
    console.error(T("UI_DRAW_FAILED", { what: nome }), e);
    hint(T("UI_DRAW_FAILED", { what: nome }) + ": " + msgErro(e));
  }
}

async function repintarDoEstado() {
  const st = await QDBU.rpc("session.state");

  conexoes = st.connections;

  // Preserva a estrutura ja carregada por arquivo; o resto vem do estado vivo.
  // O CARIMBO VIAJA JUNTO: guardar `fields` sem `fieldsRev` faria a foto velha
  // passar por atual, que e exatamente o bug que o `rev` veio resolver.
  const antes = new Map(abas.map((a) => [a.h, a.fields]));
  const antesRev = new Map(abas.map((a) => [a.h, a.fieldsRev]));
  abas = st.files.map((f) => ({
    h: f.h,
    alias: f.alias,
    caminho: f.path,
    conexao: f.connection,
    info: f,
    // R6: o arquivo foi fechado para uma operação e não voltou. A aba fica,
    // marcada — some é o que ela não pode fazer.
    detached: !!f.detached,
    detachedWhy: f.detachedWhy || "",
    fields: antes.get(f.h) || null,
    fieldsRev: antesRev.get(f.h),
  }));

  /*
   * A GRADE DE UM ARQUIVO PERDIDO É DESCARTADA, e isto é a R6 inteira.
   *
   * Deixar as linhas na tela mostraria dados de um arquivo que não está mais
   * aberto — a falha silenciosa que as regras de integridade existem para
   * impedir. O usuário olharia números que não pode mais confiar, sem nada
   * indicando isso.
   */
  for (const a of abas) {
    if (a.detached) {
      gradeDe.delete(a.h);
      colunasDe.delete(a.h);
      indicesDe.delete(a.h);
    }
  }

  fechados = st.closed;
  aplicarOrdem();

  if (!abas.some((a) => a.h === abaAtiva)) {
    abaAtiva = abas.length ? abas[abas.length - 1].h : null;
  }

  // As tres pinturas sao INDEPENDENTES e nenhuma pode derrubar as outras.
  //
  // Antes eram tres chamadas cruas em sequencia: uma excecao dentro de
  // desenhar() -- a arvore -- impedia desenharAbas() de rodar. O resultado era
  // `abas` ja sem o arquivo fechado e a barra de abas ainda mostrando ele; a
  // aba so sumia no proximo clique, que redesenha por outro caminho. Estado
  // interno e tela divergiam em silencio, que e o pior modo de falhar.
  pintar("arvore", desenhar);
  pintar("abas", desenharAbas);
  pintar("conteudo", desenharConteudo);

  /*
   * ESTRUTURA **E** PAGINA. So garantirEstrutura() estava aqui, e faltava a
   * pagina: fechar a aba ativa promovia a vizinha, marcava a barra de abas
   * certa -- e deixava a grade vazia, com o cabecalho em branco e a posicao em
   * "--", ate o usuario clicar noutra aba. A tela dizia "NETTRA aberto" sobre
   * uma grade que nao mostrava NETTRA nenhum.
   *
   * O lugar e aqui, e nao dentro de fecharAba(), porque todo caminho que
   * repinta do estado promove alguma aba a ativa -- fechar, restaurar sessao,
   * reabrir o que ja estava aberto, recuperar de erro. Corrigir so o fechamento
   * deixaria a mesma armadilha montada nos outros tres. Mesma licao do
   * comentario de ativarAba(): quando o trio se repete na mao, um dos lugares
   * esquece uma das partes.
   *
   * As duas sao no-op quando o dado ja esta em memoria, entao repintar de graca
   * nao custa ida a DLL.
   */
  const ativa = abas.find((a) => a.h === abaAtiva);
  garantirEstrutura(ativa);
  garantirPagina(ativa);
  garantirForm(ativa);
  sincronizarPaineis();
  return st;
}

/*
 * O FORMULÁRIO É A QUARTA GARANTIA, e nasceu esquecida.
 *
 * Medido em 04/09/2026 abrindo `NETPAR.DBF` com a visão Formulário já ativa: a
 * aba dizia "NETPAR @DBU original", a grade repintou com as 107 colunas dele --
 * e o formulário continuou mostrando os oito campos de TIPOS.DBF, com os dados
 * da fixture. Uma tela inteira de valores do arquivo ERRADO, sem nada indicando
 * isso, que é a falha silenciosa que a R6 existe para impedir.
 *
 * A causa é a do comentário acima, repetida: `carregarForm()` só era chamada em
 * `trocarVisao("form")`, então trocar de ARQUIVO com a visão já aberta não
 * passava por lugar nenhum que a atualizasse. O trio virou quarteto pelo mesmo
 * motivo que virou trio.
 *
 * No-op quando a visão não é o formulário: não custa ida à DLL para quem está
 * na grade.
 */
async function garantirForm(aba) {
  if (!aba || visaoAtiva !== "form") return;
  const dados = formDe.get(aba.h);
  let cursor = cursorDe.get(aba.h);
  // Já é deste arquivo e deste registro: nada a fazer.
  if (dados && dados.row && cursor && dados.row.recno === cursor) return;

  /*
   * O CURSOR NASCE NA PÁGINA, e a página ainda pode não ter chegado.
   *
   * Quem escreve `cursorDe` de um arquivo recém-aberto é `desenharGrade()`, que
   * adota a primeira linha à vista -- e ela só existe depois que `data.page`
   * responde. `garantirPagina()` é assíncrona e ninguém a esperava, então esta
   * função rodava com o cursor `undefined`, `carregarForm()` caía no ramo
   * "nenhum registro" e NADA a chamava de novo quando a página enfim chegava:
   * abrir um DBF com a visão Formulário ativa deixava a grade cheia e o
   * formulário vazio para sempre. Aqui a página é esperada, e o cursor sai dela
   * mesmo quando `desenharGrade()` não chegou a rodar (na visão Formulário ela
   * não roda).
   */
  if (!cursor) {
    let p = paginaDaAba(aba.h);
    if (!p) {
      await garantirPagina(aba);
      p = paginaDaAba(aba.h);
    }
    cursor = cursorDe.get(aba.h) || (p && p.rows.length ? p.rows[0].recno : 0);
  }

  // Arquivo vazio, ou a página não veio: aí sim não há registro a mostrar.
  if (!cursor) {
    formDe.delete(aba.h);
    if (aba.h === abaAtiva) desenharForm();
    return;
  }

  carregarForm(aba.h, cursor);
}

async function abrirArquivo(caminho, conexao) {
  // Windows mistura / e barra invertida no mesmo caminho; comparar cru erra.
  // fromCharCode(92) evita ter de escapar a barra invertida aqui.
  const SEP = String.fromCharCode(92);
  const norm = (p) => p.split(SEP).join("/").toLowerCase();
  const mesmo = (x, y) => norm(x) === norm(y);

  const ja = abas.find((a) => mesmo(a.caminho, caminho));
  if (ja) {
    ativarAba(ja.h);
    hint(T("UI_ALREADY_OPEN_SHORT"));
    return;
  }

  hint(T("UI_OPENING", { file: paraExibir(caminho) }));

  try {
    const i = await QDBU.rpc("file.open", { path: caminho, connection: conexao });
    await repintarDoEstado();

    // file.open ja trouxe a estrutura; session.state nao a traz (seria pesado
    // com muitos arquivos). Aproveita em vez de pedir de novo.
    const nova = abas.find((a) => a.h === i.h);
    if (nova) nova.fields = i.fields;

    ativarAba(i.h);
    hint(
      i.file + " — " +
      T("UI_TAB_SUMMARY", { records: i.records, fields: i.fieldCount }) +
      ", " + modoTexto(i.mode)
    );
  } catch (e) {
    // "Ja aberto" significa que a DLL tem o arquivo e a UI nao sabia: estado
    // dessincronizado. Repintar do estado resolve e ainda ativa a aba certa --
    // muito melhor que deixar o usuario diante de "ja esta aberto" sem ver aba.
    if (e.codigo === "ERROR_FILE_ALREADY_OPEN") {
      await repintarDoEstado();
      const achou = abas.find((a) => mesmo(a.caminho, caminho));
      if (achou) {
        ativarAba(achou.h);
        hint(T("UI_ALREADY_OPEN_SHORT"));
        return;
      }
    }

    hint(msgErro(e));
    // `ErroQDbu`, e nao `ErroDbu`: a classe foi renomeada com o projeto e este
    // ponto ficou para tras. `undefined` a direita de `instanceof` NAO da
    // false -- lanca TypeError, entao a recusa de abrir arquivo (inexistente,
    // travado, cabecalho invalido) escapava sem repintar a tela e sem tocar em
    // ninguem, deixando a arvore dizendo o contrario da DLL.
    if (!(e instanceof QDBU.ErroQDbu)) {
      await repintarDoEstado();
    }
  }
}

async function fecharAba(h) {
  try {
    await QDBU.rpc("file.close", { h: h });
  } catch (e) {
    /* mesmo que a DLL recuse, a aba sai da tela */
  }
  gradeDe.delete(h);
  colunasDe.delete(h);
  indicesDe.delete(h);
  ultimoAchado.delete(h);
  condicoesDe.delete(h);

  // O cru do disco tambem sai: ele so e povoado no boot, entao reabrir o
  // arquivo depois de fechar traria as condicoes de quando o app subiu, e nao
  // as que a pessoa editou desde entao. Sem isto, fechar e reabrir seria uma
  // forma silenciosa de voltar no tempo.
  const fechada = abas.find((a) => a.h === h);
  if (fechada) condicoesDoDisco.delete(chaveCaminho(fechada.caminho));

  const n = abas.findIndex((a) => a.h === h);
  /* Editar a estrutura de um arquivo que acabou de ser fechado não faz sentido
     -- e aplicar mandaria a lista para um handle morto. */
  if (esAlvo === h) esFechar();
  if (abaAtiva === h) {
    const restantes = abas.filter((a) => a.h !== h);
    abaAtiva = restantes.length
      ? restantes[Math.min(n, restantes.length - 1)].h
      : null;
  }
  await repintarDoEstado();
}

// Arrastar para reordenar, com POINTER EVENTS -- nao com HTML5 drag-and-drop.
//
// O HTML5 DnD depende do mecanismo de arrasto do sistema operacional; no
// WebView2 embutido no Tauri ele nao dispara de forma confiavel (o webview
// tambem captura drag para receber arquivos do SO). Pointer events funcionam
// em qualquer lugar e sao testaveis por CDP com mouse real.
//
// A ordem e da UI e vai para o session.json, entao sobrevive ao fechamento.
const ARRASTO_MINIMO = 5; // px antes de considerar arrasto, e nao clique

let arrasto = null; // {h, x0, moveu}

$("abas").addEventListener("pointerdown", (ev) => {
  if (ev.button !== 0) return;
  const aba = ev.target.closest(".aba");
  if (!aba || ev.target.closest("[data-fechar]")) return;

  arrasto = { h: aba.dataset.h, x0: ev.clientX, moveu: false };
  aba.setPointerCapture(ev.pointerId);
});

$("abas").addEventListener("pointermove", (ev) => {
  if (!arrasto) return;

  if (!arrasto.moveu) {
    if (Math.abs(ev.clientX - arrasto.x0) < ARRASTO_MINIMO) return;
    arrasto.moveu = true;
    document.body.classList.add("arrastando-aba");
    const org = $("abas").querySelector('.aba[data-h="' + arrasto.h + '"]');
    if (org) org.classList.add("arrastando");
  }

  // Com a captura de ponteiro, os eventos vem todos para a aba de origem --
  // entao o alvo tem de ser achado pela coordenada.
  const sob = document.elementFromPoint(ev.clientX, ev.clientY);
  const alvo = sob && sob.closest ? sob.closest(".aba") : null;

  $("abas").querySelectorAll(".aba.alvo").forEach((e) => e.classList.remove("alvo"));
  if (alvo && alvo.dataset.h !== arrasto.h) {
    alvo.classList.add("alvo");
    // Reordena ao vivo: o usuario ve a aba andando enquanto arrasta.
    moverAba(arrasto.h, alvo.dataset.h);
    const org = $("abas").querySelector('.aba[data-h="' + arrasto.h + '"]');
    if (org) org.classList.add("arrastando");
  }
});

function fimDoArrasto() {
  if (!arrasto) return;
  arrasto = null;
  document.body.classList.remove("arrastando-aba");
  $("abas").querySelectorAll(".aba.arrastando, .aba.alvo").forEach((e) =>
    e.classList.remove("arrastando", "alvo")
  );
}

$("abas").addEventListener("pointerup", fimDoArrasto);
$("abas").addEventListener("pointercancel", fimDoArrasto);

// Enter/espaco ativa a aba com foco (navegacao por teclado).
$("abas").addEventListener("keydown", (ev) => {
  const aba = ev.target.closest(".aba");
  if (aba && (ev.key === "Enter" || ev.key === " ")) {
    ev.preventDefault();
    aba.click();
  }
});

// Ctrl+Shift+seta move a ABA ATIVA. No documento, de proposito: desenharAbas()
// recria a barra inteira, entao o elemento que tinha foco deixa de existir --
// depender do foco faria a tecla so funcionar antes do primeiro clique.
document.addEventListener("keydown", (ev) => {
  if (!ev.ctrlKey || !ev.shiftKey) return;
  if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
  if (!abaAtiva || abas.length < 2) return;

  const i = abas.findIndex((a) => a.h === abaAtiva);
  const j = ev.key === "ArrowLeft" ? i - 1 : i + 1;
  if (j < 0 || j >= abas.length) return;

  ev.preventDefault();
  moverAba(abaAtiva, abas[j].h);
});

$("abas").addEventListener("click", async (ev) => {
  const x = ev.target.closest("[data-fechar]");
  if (x) {
    ev.stopPropagation();
    await fecharAba(x.dataset.fechar);
    return;
  }
  const aba = ev.target.closest(".aba");
  if (aba) {
    // Um arrasto termina com click; sem isto, soltar a aba tambem a ativaria.
    if (arrasto && arrasto.moveu) return;
    ativarAba(aba.dataset.h);
    agendarSalvar();
  }
});


// --------------------------------------------------------------------- grade

// Paginacao por ANCORA, nunca por deslocamento absoluto.
//
// A UI guarda o recno da primeira e da ultima linha que tem na tela e pede "o
// que vem depois da ultima" ou "o que vem antes da primeira". Um "pule 5000
// registros" so faria sentido na ordem fisica -- e quando o indice (T5) e o
// filtro (T6) entrarem, ordem fisica deixa de ser a ordem que o usuario ve.
//
// Por isso a pagina anterior e `ancora = primeira, deslocamento = -tamanho`, e
// nao `pagina - 1`: nao existe numero de pagina, existe onde o cursor esta.
const PAGINA_PADRAO = 200;

let tamanhoPagina = PAGINA_PADRAO;
let visaoAtiva = "dados";

/** Estado da grade por handle: sobrevive a troca de aba. */
const gradeDe = new Map(); // h -> {rows, cols, first, last, records, bof, eof, readAt}

/*
 * O REGISTRO CORRENTE, POR ABA -- e a UI é dona dele, não a DLL.
 *
 * Parece redondo guardar aqui o que a work area já sabe, e não é: `data.page`
 * MOVE o ponteiro ao paginar (medido na T10, quando ele foi usado como sonda e
 * mediu o próprio instrumento). Então o "registro corrente" da DLL muda só de
 * rolar a grade, sem ninguém pedir -- e um `PRÓXIMOS 100` disparado depois de
 * rolar operaria a partir de um lugar que a pessoa não escolheu.
 *
 * Com o cursor aqui, ele só muda quando alguém DIZ que mudou: clicando numa
 * linha ou pelo "ir p/ registro". Antes de operar, `data.goto` põe a work area
 * onde a tela está mostrando. Rolar não altera mais nada.
 */
const cursorDe = new Map(); // h -> recno escolhido pela pessoa

function paginaDaAba(h) {
  return gradeDe.get(h) || null;
}

/**
 * Pede uma pagina e repinta. `ancora` e "top" | "bottom" | recno.
 *
 * Toda falha vira mensagem na barra: um DBF que sumiu do disco entre a abertura
 * e a leitura tem de dizer isso, nao deixar a grade em branco.
 */
async function carregarPagina(h, ancora, deslocamento) {
  const aba = abas.find((a) => a.h === h);
  if (!aba) return;

  try {
    const p = await QDBU.rpc("data.page", {
      h: h,
      anchor: ancora,
      offset: deslocamento || 0,
      count: tamanhoPagina,
    });
    // O pedido fica junto da página: o refresh automático o repete tal qual,
    // e é isso que faz a mesma janela do arquivo continuar à vista.
    p.pedido = { ancora, deslocamento: deslocamento || 0 };
    gradeDe.set(h, p);
    if (h === abaAtiva) desenharGrade();
  } catch (e) {
    hint(msgErro(e));
  }
}

/** Primeira pagina do arquivo, se ainda nao houver nada carregado. */
function garantirPagina(aba) {
  if (!aba || gradeDe.has(aba.h)) return null;
  // DEVOLVE a promessa: `garantirForm()` precisa esperar por ela para saber em
  // que registro o formulário abre (o cursor nasce da página).
  return carregarPagina(aba.h, "top", 0);
}

function desenharGrade() {
  const aba = abas.find((a) => a.h === abaAtiva);
  const tabela = $("grade");
  const cabecalho = tabela.querySelector("thead tr");
  const corpo = tabela.querySelector("tbody");
  const vazia = $("grade-vazia");

  cabecalho.textContent = "";
  corpo.textContent = "";

  const p = aba ? paginaDaAba(aba.h) : null;
  if (!p) {
    vazia.hidden = false;
    vazia.textContent = T("UI_LOADING");
    atualizarBarraGrade(null);
    return;
  }

  // Coluna do numero do registro: e a identidade da linha, nao a posicao dela.
  // Sob indice a ordem muda e o recno continua o mesmo -- e isso que permite
  // ancorar a pagina seguinte.
  cabecalho.appendChild(elemento("th", "recno", "#"));
  for (const c of p.cols) {
    const th = elemento("th", c.type === "N" ? "num" : "", c.name);
    th.title = c.key + "  ·  " + c.type + c.len + (c.dec ? "," + c.dec : "");
    cabecalho.appendChild(th);
  }

  if (!p.rows.length) {
    vazia.hidden = false;
    /*
     * Grade vazia tem TRÊS causas, e dizer a errada manda a pessoa procurar no
     * lugar errado:
     *
     *   arquivo sem registro    não há o que mostrar, ponto
     *   filtro ativo            há registros, o filtro é que não deixou passar
     *   nem um nem outro        a página é que está fora do que existe
     *
     * A do meio era a que faltava: "Nada nesta página" sobre um filtro ativo
     * sugere que basta navegar para achar alguma coisa, quando o que precisa
     * mudar é o filtro.
     */
    const comFiltro = !!(aba.info && aba.info.filter);
    vazia.textContent =
      p.records === 0
        ? T("UI_EMPTY_FILE")
        : comFiltro
        ? T("UI_EMPTY_FILTERED")
        : T("UI_EMPTY_PAGE");
    atualizarBarraGrade(p);
    return;
  }
  vazia.hidden = true;

  for (const linha of p.rows) {
    const tr = document.createElement("tr");
    // Deletado no xBase e uma MARCA, nao uma remocao: o registro continua la e
    // pode ser recuperado (T8). Tachado deixa isso obvio sem esconder o dado --
    // o DBU original usava um "*" facil de nao ver.
    if (linha.deleted) tr.className = "deletado";

    /* A LINHA DO CURSOR FICA MARCADA. Sem isto, "próximos n" e "do atual até o
       fim" partem de um registro que a pessoa não vê -- ela escolhe um escopo
       relativo a um ponto invisível. */
    if (linha.recno === cursorDe.get(abaAtiva)) tr.classList.add("cursor");

    const tdn = elemento("td", "recno", String(linha.recno));
    if (linha.deleted) tdn.title = T("UI_DELETED_RECORD");
    tr.appendChild(tdn);

    linha.values.forEach((v, i) => tr.appendChild(celulaEditavel(v, p.cols[i], i)));
    corpo.appendChild(tr);
  }

  /* Nenhum cursor ainda: adota o primeiro registro à vista. Deixar sem marca
     nenhuma faria a pessoa escolher "do atual até o fim" sem um "atual". */
  if (!cursorDe.has(abaAtiva) && p.rows.length) {
    cursorDe.set(abaAtiva, p.rows[0].recno);
    const primeira = corpo.querySelector("tr");
    if (primeira) primeira.classList.add("cursor");
  }

  atualizarBarraGrade(p);
}

/*
 * Põe o cursor num registro: marca a linha e leva a work area junto.
 *
 * O `data.goto` acontece AQUI, e não na hora de operar, para que o estado da
 * DLL e o da tela nunca divirjam -- e porque `data.seek`/`data.locate` também
 * mexem no ponteiro, e a marca precisa acompanhá-los.
 */
async function porCursorEm(h, recno) {
  cursorDe.set(h, recno);
  for (const tr of $("grade").querySelectorAll("tbody tr")) {
    const n = Number((tr.querySelector("td.recno") || {}).textContent);
    tr.classList.toggle("cursor", n === recno);
  }
  atualizarRegistroAtual();
  try {
    await QDBU.rpc("data.goto", { h, recno });
  } catch (e) {
    /* A marca é da tela; se a DLL recusar, quem opera avisa. */
  }
}

/*
 * Escreve o registro atual na barra e diz se ele esta a vista.
 *
 * "Fora da pagina" nao e detalhe: e a diferenca entre "o cursor sumiu" e "o
 * cursor esta noutro lugar do arquivo". Sem isso, rolar a grade parece ter
 * perdido a escolha.
 */
function atualizarRegistroAtual() {
  const el = $("pg-atual");
  const n = cursorDe.get(abaAtiva);

  if (n == null) {
    el.hidden = true;
    return;
  }

  /*
   * `Recno()` SOBRE `Lastrec()`, exatamente como o original (DBUEDIT.PRG:600).
   *
   * O total é o FÍSICO e não muda com filtro nem com índice: são dois fatos
   * que não dependem do recorte -- o registro tem este número, o arquivo tem
   * este tamanho. Quantos passam pelo filtro é assunto do texto ao lado.
   */
  const p = gradeDe.get(abaAtiva);

  /*
   * ARQUIVO VAZIO NÃO TEM REGISTRO ATUAL.
   *
   * O cursor continua valendo 1 num arquivo de zero registros -- é o que o
   * `RecNo()` de um DBF vazio devolve --, e a frase saía "reg. 1 de 0". Visto
   * na tela em 03/09/2026 logo depois de um ZAP, lado a lado com "nenhum
   * registro à vista": duas afirmações no mesmo rodapé, uma delas impossível.
   *
   * Some, e não vira "reg. 0 de 0": o texto ao lado já diz que não há nada, e
   * repetir a mesma notícia em duas caixas é o defeito que o pré-voo teve.
   */
  if (p && p.records === 0) {
    el.hidden = true;
    return;
  }

  const naTela = !!$("grade").querySelector("tbody tr.cursor");
  el.hidden = false;
  el.textContent = T("UI_CURRENT_RECORD", {
    n: n.toLocaleString(window.I.idioma()),
    total: p ? p.records.toLocaleString(window.I.idioma()) : "?",
  });
  el.classList.toggle("fora", !naTela);
  el.title = naTela ? T("UI_CURRENT_RECORD_HINT") : T("UI_CURRENT_RECORD_AWAY");
}

/* Clicar no numero leva de volta ao registro -- e o caminho de volta quando se
   rolou para longe e se perdeu a linha de vista. */
$("pg-atual").addEventListener("click", async () => {
  const n = cursorDe.get(abaAtiva);
  if (n == null) return;
  await carregarPagina(abaAtiva, n, 0);
  await porCursorEm(abaAtiva, n);
});

/** Uma celula, formatada por tipo. */
/*
 * Uma celula, formatada por tipo -- e carregando o que o editor da T8 precisa.
 *
 * O `dataset` guarda o valor CRU (`bruto`) além do formatado que aparece. Sem
 * isso o editor teria de desfazer a formatação para saber o que estava lá: ler
 * "1.234,56" da tela e adivinhar se a vírgula é decimal, ou "05/03/2009" e
 * remontar o ISO. Toda conversão de volta é uma chance de o valor mudar sozinho
 * ao abrir e fechar o editor sem tocar em nada.
 */
function celula(v, col) {
  // Memo nao viaja na pagina: 200 memos seriam megabytes. A DLL manda so o
  // tamanho; o conteudo vem quando o editor pedir (T8).
  if (v && typeof v === "object" && v.memo) {
    // So o numero entre as aspas duplas angulares: cabe na celula, e nao ha
    // palavra para traduzir. A contagem em bytes vai no tooltip.
    const td = elemento("td", "memo", v.len ? "«memo " + window.I.numero(v.len) + "»" : "");
    td.title = T("UI_N_BYTES", { n: v.len });
    return td;
  }

  if (v === null || v === undefined || v === "") {
    return elemento("td", "nulo", "");
  }

  if (col.type === "N") {
    // SEM separador de milhar, de proposito: numa grade de dados o valor tem de
    // sair como esta no arquivo. Um CONT_KEY 11323 exibido "11.323" parece
    // decimal, nao se compara de bater o olho e quebra ao copiar para outro
    // sistema. As casas decimais seguem a definicao do campo, nao o valor -- um
    // campo N(11,2) com 5 gravado mostra "5,00", que e o que esta no DBF.
    return elemento(
      "td",
      "num",
      typeof v === "number" ? v.toFixed(col.dec || 0).replace(".", ",") : String(v)
    );
  }

  if (col.type === "D") {
    // A DLL manda ISO (AAAA-MM-DD) para nao depender do SET DATE da maquina;
    // aqui vira o formato de quem le.
    const iso = String(v);
    const td = elemento(
      "td",
      "data",
      iso.length === 10
        ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4)
        : iso
    );
    td.title = iso;
    return td;
  }

  if (col.type === "L") {
    return elemento("td", "logico", v ? "✓" : "·");
  }

  const txt = String(v);
  const td = elemento("td", "", txt);
  // Byte NUL existe em campo C de DBF real e nao se ve. Marcar evita que uma
  // celula "vazia" na tela seja lixo binario que ninguem notou.
  if (txt.indexOf(String.fromCharCode(0)) >= 0) {
    td.classList.add("binario");
    td.title = T("UI_HAS_NUL_BYTE");
  }
  return td;
}

/*
 * Envolve `celula()` para carimbar campo, tipo e valor cru na td.
 *
 * Feito aqui e não dentro de `celula()` porque ela tem seis `return` -- um por
 * tipo -- e carimbar em cada um é o tipo de repetição onde um dos lugares
 * esquece. Foi assim que os cinco botões da modal de estrutura nasceram
 * quebrados: o mesmo trio repetido à mão em dois caminhos.
 */
function celulaEditavel(v, col, idx) {
  const td = celula(v, col);
  td.dataset.campo = col.name;
  td.dataset.tipo = col.type;
  td.dataset.idx = String(idx);
  // `bruto` é o que veio da DLL, em JSON: string, number, boolean, ou o
  // {memo,len} do campo memo. JSON.stringify preserva o tipo na volta.
  td.dataset.bruto = JSON.stringify(v === undefined ? null : v);
  return td;
}


/* ===================================================================
 * T8 -- EDIÇÃO DE REGISTRO
 *
 * Até aqui a grade só lê. Daqui para baixo ela escreve, e a diferença que
 * organiza este bloco é uma só: **o que aparece na tela depois de gravar vem
 * do arquivo, nunca do que foi digitado.** `data.update` devolve a linha
 * relida (`row`), e é ela que repinta.
 *
 * Sem isso a tela mentiria em casos comuns e discretos: um N(5,2) que recebeu
 * 3,999 mostra 4,00 no disco; um C(10) que recebeu espaços à direita volta sem
 * eles; uma data digitada 5/3/9 volta 05/03/2009. Repintar com o que a pessoa
 * digitou deixaria a tela certa e o arquivo diferente -- e a divergência só
 * apareceria ao reabrir, longe da causa.
 * =================================================================== */

/* A célula em edição, ou null. Uma por vez: duas células abertas obrigariam a
   decidir o que fazer com a segunda quando a primeira falha ao gravar. */
let edicao = null;

/* O valor cru que a DLL mandou para esta célula. */
function bruteDaCelula(td) {
  try {
    return JSON.parse(td.dataset.bruto || "null");
  } catch (e) {
    return null;
  }
}

/*
 * O texto que entra no editor.
 *
 * Parte do valor CRU e não do texto da célula, com uma exceção deliberada: em
 * data e número o formato de tela já é o que a pessoa reconhece (DD/MM/AAAA,
 * vírgula decimal) e o backend aceita os dois -- reescrever aqui só criaria uma
 * terceira grafia.
 */
function textoParaEditor(td) {
  const v = bruteDaCelula(td);
  const tipo = td.dataset.tipo;

  if (v === null || v === undefined) return "";
  if (tipo === "L") return v ? "S" : "N";
  if (tipo === "D" || tipo === "N") return td.textContent.trim();
  return String(v);
}

/*
 * Abre o editor na célula.
 *
 * Campo memo não edita aqui: abre a modal própria. Um textarea de 4 KB dentro
 * de uma td de 80 px seria pior que não ter editor.
 */
async function abrirEditorCelula(td) {
  if (edicao) fecharEditorCelula(false);
  if (!td || td.classList.contains("recno")) return;

  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba) return;

  let tr = td.parentElement;
  const recno = Number((tr.querySelector("td.recno") || {}).textContent);
  if (!recno) return;

  if (td.dataset.tipo === "M" || td.dataset.tipo === "P") {
    await abrirEditorMemo(recno, td.dataset.campo);
    return;
  }

  // O cursor acompanha: quem edita a linha 12 espera que "registro atual" seja
  // a 12 -- e é dele que Excluir e Recuperar partem.
  await porCursorEm(abaAtiva, recno);

  /*
   * R8 -- O QUE SE EDITA TEM DE SER O QUE ESTÁ NO DISCO.
   *
   * A página em memória pode ter envelhecido: outro programa gravou este
   * registro depois de a grade o ler, e a célula ainda mostra o valor antigo.
   * Editar em cima dele e gravar seria APAGAR a escrita do outro sem ninguém
   * ver. Então o editor abre com o registro RELIDO agora -- e guarda os bytes
   * crus de cada campo, que voltam como `expect` na hora de gravar
   * (regras de integridade, R8).
   */
  let raw = null;
  try {
    const r = await QDBU.rpc("data.record", { h: abaAtiva, recno });
    raw = r.raw;
    if (linhaMudou(recno, r.row)) {
      aplicarLinha(recno, r.row);
      hint(T("INFO_RECORD_REFRESHED", { n: recno }));
      td = celulaDe(recno, td.dataset.campo) || td;
      tr = td.parentElement;
    }
  } catch (e) {
    hint(msgErro(e));
    return;
  }

  const largura = td.getBoundingClientRect().width;
  const original = td.innerHTML;

  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "cel-editor";
  inp.value = textoParaEditor(td);
  inp.style.width = Math.max(60, largura - 10) + "px";
  inp.setAttribute("aria-label", td.dataset.campo);

  // Confirmar e cancelar VISÍVEIS, e não só Enter/Esc (B7.2). O teclado
  // continua valendo; o que não pode é a única saída ser uma tecla que a
  // pessoa tem de adivinhar.
  const ok = elemento("button", "cel-ok", "✓");
  ok.title = T("UI_CONFIRM");
  ok.type = "button";
  const nao = elemento("button", "cel-cancel", "✗");
  nao.title = T("UI_CANCEL");
  nao.type = "button";

  td.textContent = "";
  td.classList.add("editando");
  td.appendChild(inp);
  td.appendChild(ok);
  td.appendChild(nao);

  /*
   * `inicial` E O TEXTO COM QUE O EDITOR NASCEU, guardado aqui e não relido
   * depois. `textoParaEditor(td)` só funciona sobre a célula INTACTA: em `D` e
   * `N` ela devolve `td.textContent`, e a td agora contém o input e os botões
   * ✓/✗ -- o texto dela virou "✓✗". Comparar contra isso nunca dá igual, então
   * confirmar sem ter digitado nada gravava assim mesmo: uma escrita no disco,
   * uma linha no log de alterações e, se outro processo tivesse mexido no
   * registro, um ERROR_STALE_VALUE por uma edição que não houve. Tabular pela
   * linha escrevia em toda célula numérica ou de data no caminho.
   */
  edicao = { td, tr, recno, campo: td.dataset.campo, original, inp, raw, inicial: inp.value };

  ok.addEventListener("mousedown", (ev) => {
    // mousedown e não click: o blur do input chegaria primeiro e fecharia o
    // editor antes de o clique no botão ser processado.
    ev.preventDefault();
    confirmarEdicao();
  });
  nao.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    fecharEditorCelula(false);
  });

  inp.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      confirmarEdicao();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      fecharEditorCelula(false);
    } else if (ev.key === "Tab") {
      // Tab confirma e anda: é como uma planilha se comporta, e digitar numa
      // grade sem isso obriga a alternar teclado e mouse a cada campo.
      ev.preventDefault();
      confirmarEdicao(ev.shiftKey ? -1 : 1);
    }
  });

  inp.focus();
  inp.select();
}

/* Devolve a célula ao que era. `gravou` evita repintar por cima da linha nova
   que `aplicarLinha()` acabou de desenhar. */
function fecharEditorCelula(gravou) {
  if (!edicao) return;
  const { td, original, recno, envelheceu } = edicao;
  edicao = null;
  td.classList.remove("editando");
  td.classList.remove("recusado");
  if (!gravou) td.innerHTML = original;
  // Quem viu a colisão e desistiu não pode receber de volta o valor de quando
  // o editor abriu -- é justamente o que já não existe no disco (R8).
  if (!gravou && envelheceu) relerLinha(recno);
}

/*
 * Grava a célula.
 *
 * A recusa NÃO fecha o editor: o texto digitado continua lá para ser corrigido.
 * Fechar e devolver o valor antigo obrigaria a pessoa a redigitar tudo por
 * causa de um caractere -- e é justamente quando o valor é comprido que o erro
 * acontece.
 */
async function confirmarEdicao(passo) {
  if (!edicao) return;
  const { td, recno, campo, inp, raw, inicial } = edicao;
  const texto = inp.value;

  // Nada mudou: não gasta uma escrita nem uma linha de log.
  if (texto === inicial) {
    fecharEditorCelula(false);
    if (passo) moverEdicao(td, passo);
    return;
  }

  /*
   * `expect` são os bytes que a célula tinha quando o editor abriu. A DLL só
   * grava se o disco AINDA for igual a eles -- conferido dentro do RLock, que
   * é o único lugar onde "ainda" vale (R8). Se alguém gravou no meio, volta
   * ERROR_STALE_VALUE com os dois valores, e quem decide é a pessoa.
   */
  let expect = raw && campo in raw ? { [campo]: raw[campo] } : undefined;

  for (;;) {
    try {
      const r = await QDBU.rpc("data.update", {
        h: abaAtiva,
        recno,
        values: { [campo]: texto },
        expect,
      });
      fecharEditorCelula(true);
      aplicarLinha(recno, r.row);
      hint(T("INFO_RECORD_UPDATED", { n: recno, field: campo }));
      if (passo) moverEdicao(celulaDe(recno, campo), passo);
      return;
    } catch (e) {
      if (e.codigo === "ERROR_STALE_VALUE") {
        const decisao = await perguntarColisao(e, recno);
        if (decisao === "sobrescrever") {
          // Por cima do que está lá AGORA -- se mudar de novo antes de gravar,
          // a pergunta volta. Nunca por cima do desconhecido.
          expect = { [campo]: e.params.raw };
          continue;
        }
        if (decisao === "descartar") {
          fecharEditorCelula(false);
          await relerLinha(recno);
          return;
        }
        // "deixa eu olhar": o editor fica aberto, marcado, com o texto digitado
        // -- e lembra que a célula envelheceu, para não voltar a ela ao fechar.
        if (edicao) edicao.envelheceu = true;
      }
      /*
       * A RECUSA APARECE NA CÉLULA, e não só na barra de status.
       *
       * O olho de quem acabou de digitar está na célula; uma frase no rodapé, a
       * 900 px dali, é lida depois de a pessoa já ter tentado de novo. A borda
       * vermelha diz ONDE, o hint diz O QUÊ, e o title guarda o motivo enquanto o
       * editor estiver aberto.
       */
      const msg = msgErro(e);
      td.classList.add("recusado");
      inp.title = msg;
      hint(msg);
      inp.focus();
      inp.select();
      return;
    }
  }
}

/* A td de um campo numa linha, depois de a linha ter sido repintada. */
function celulaDe(recno, campo) {
  for (const tr of $("grade").querySelectorAll("tbody tr")) {
    const n = Number((tr.querySelector("td.recno") || {}).textContent);
    if (n === recno) return tr.querySelector('td[data-campo="' + campo + '"]');
  }
  return null;
}

/*
 * A linha em memória difere do que acabou de vir do disco?
 * Compara os valores e a marca de exclusão -- o que a grade mostra.
 */
function linhaMudou(recno, row) {
  const p = gradeDe.get(abaAtiva);
  if (!p || !row) return false;
  const l = p.rows.find((x) => x.recno === recno);
  if (!l) return false;
  return JSON.stringify(l.values) !== JSON.stringify(row.values) || !!l.deleted !== !!row.deleted;
}

/* Relê UM registro do disco e repinta a linha dele. */
async function relerLinha(recno) {
  try {
    const r = await QDBU.rpc("data.record", { h: abaAtiva, recno });
    aplicarLinha(recno, r.row);
    return r;
  } catch (e) {
    hint(msgErro(e));
    return null;
  }
}

/*
 * A COLISÃO É DECISÃO DA PESSOA, não do programa.
 *
 * Três saídas: gravar por cima; descartar o que se digitou e ver o valor novo;
 * ou Esc, que não decide nada e deixa o editor aberto com o texto, para olhar
 * de novo. O foco nasce no botão seguro (descartar): Enter por reflexo não
 * apaga a escrita do outro.
 */
async function perguntarColisao(e, recno) {
  const p = e.params || {};
  const r = await Swal.fire(
    swalBase({
      icon: "warning",
      title: T("UI_STALE_TITLE"),
      html: escapaHtml(
        T("UI_STALE_EXPLAIN", {
          field: p.field,
          n: recno,
          expected: textoDeColisao(p.expected),
          actual: textoDeColisao(p.actual),
        })
      ),
      showCancelButton: true,
      confirmButtonText: T("UI_STALE_OVERWRITE"),
      cancelButtonText: T("UI_STALE_DISCARD"),
      focusCancel: true,
    })
  );
  if (r.isConfirmed) return "sobrescrever";
  if (r.dismiss === Swal.DismissReason.cancel) return "descartar";
  return "olhar";
}

/* Um valor da recusa como texto curto: memo de 4 KB não cabe numa pergunta. */
function textoDeColisao(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v.memo) return "«" + T("UI_MEMO") + " " + v.len + "»";
  const t = typeof v === "boolean" ? textoDoValor({ type: "L", len: 1, dec: 0 }, v) : String(v);
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

/* Abre o editor na célula vizinha, pulando as que não se editam na grade. */
function moverEdicao(td, passo) {
  if (!td) return;
  let alvo = td;
  for (;;) {
    alvo = passo > 0 ? alvo.nextElementSibling : alvo.previousElementSibling;
    if (!alvo) return;
    if (alvo.classList.contains("recno")) return;
    if (alvo.dataset.tipo !== "M" && alvo.dataset.tipo !== "P") break;
  }
  abrirEditorCelula(alvo);
}

/*
 * Repinta UMA linha com o que voltou do arquivo.
 *
 * Repintar a página inteira funcionaria e custaria uma volta à DLL por tecla --
 * numa grade de 500 linhas isso se sente. Mais grave: a página nova viria com o
 * scroll no topo, e quem estava editando a linha 380 seria jogado para longe do
 * que estava fazendo.
 */
function aplicarLinha(recno, row, cols) {
  if (!row) return;
  const p = gradeDe.get(abaAtiva);
  // O formulário grava com TODOS os campos e a grade mostra os visíveis:
  // casa pelo nome, nunca pela posição.
  if (p && cols) row = remapeiaLinha(row, cols, p.cols);
  if (p) {
    const i = p.rows.findIndex((l) => l.recno === recno);
    if (i >= 0) p.rows[i] = row;
  }
  for (const tr of $("grade").querySelectorAll("tbody tr")) {
    const n = Number((tr.querySelector("td.recno") || {}).textContent);
    if (n !== recno) continue;

    tr.classList.toggle("deletado", !!row.deleted);
    const tds = tr.querySelectorAll("td");
    row.values.forEach((v, i) => {
      const antiga = tds[i + 1];
      if (!antiga || !p) return;
      const nova = celulaEditavel(v, p.cols[i], i);
      tr.replaceChild(nova, antiga);
    });
    return;
  }
}

function remapeiaLinha(row, deCols, paraCols) {
  const porNome = new Map(deCols.map((c, i) => [c.name, row.values[i]]));
  return Object.assign({}, row, {
    values: paraCols.map((c) => (porNome.has(c.name) ? porNome.get(c.name) : null)),
  });
}

function atualizarBarraGrade(p) {
  const nf = (n) => n.toLocaleString(window.I.idioma());
  const pos = $("pg-posicao");
  const ref = $("pg-refresh");

  if (!p) {
    pos.textContent = "—";
    ref.textContent = "";
    return;
  }

  /*
   * SOB ÍNDICE, `first`–`last` NÃO DESCREVE A PÁGINA -- e o rótulo sozinho não
   * resolveu isso.
   *
   * `first`/`last` são o RecNo da primeira e da última linha à vista
   * (api_data.prg:92-93), não o quantos-ésimo elas são. O próprio arquivo diz:
   * "RecNo() is the identity of the row, never its position."
   *
   * Em ordem FÍSICA os dois sentidos coincidem e o intervalo é verdadeiro. Sob
   * índice, divergem, e a frase passa a mentir com números certos. Medido em
   * 03/09/2026 na fixture TIPOS.DBF, 7 registros indexados por TXT: a tela
   * mostrava as sete linhas e o rodapé dizia "nesta página: 4–5" -- um intervalo
   * de dois onde há sete, porque 4 e 5 eram só os recnos que calharam de ficar
   * nas pontas. Com empates fora de ordem física `first` pode até ser MAIOR que
   * `last`, e o intervalo sai invertido.
   *
   * A correção anterior (fix(T3)) trocou o rótulo de posição para "nesta
   * página" e parou aí -- honesta sobre o que a frase descreve, ainda errada
   * sobre os números. Aqui a escolha é pelo que se pode afirmar: em ordem
   * física, o intervalo; sob índice, QUANTAS linhas estão à vista, que é
   * verdade em qualquer ordem e não exige contar o arquivo.
   *
   * O DBU original não tinha o problema porque nunca mostrou intervalo: o
   * `browse` do Clipper é um cursor rolante e a linha de status dizia UM
   * registro -- `Recno()/Lastrec()` (DBUEDIT.PRG:600). Identidade sobre
   * tamanho, que não tem como ser lida como posição. Essa identidade continua
   * inteira em `pg-atual`.
   */
  const aba = abas.find((a) => a.h === abaAtiva);
  const filtrado = !!(aba && aba.info && aba.info.filter);
  const cont = contagemDe.get(abaAtiva);
  const indexada = ordensDaAba(abaAtiva).some((o) => o.active);

  pos.textContent = !p.rows.length
    ? T("UI_PAGE_RANGE_EMPTY")
    : indexada
      ? T("UI_PAGE_COUNT", { n: p.rows.length })
      : T("UI_PAGE_RANGE", { first: nf(p.first), last: nf(p.last) });

  /* Quantos passam pelo filtro é OUTRO fato, e não o tamanho do arquivo. Só
     aparece quando há filtro -- e "?" enquanto ninguém pediu a contagem, que é
     honesto: contar 400 mil linhas é uma tarefa, não um detalhe de rodapé. */
  if (filtrado) {
    pos.textContent +=
      " · " + T("UI_FILTERED_SUFFIX", { n: cont == null ? T("UI_UNKNOWN_COUNT") : nf(cont) });
  }

  /*
   * O REGISTRO ATUAL, em numero.
   *
   * A marca na grade e um indicativo VISUAL e so funciona com a linha a vista.
   * Num arquivo de 400 mil registros, rolar duas telas para baixo esconde o
   * cursor e a pessoa fica sem saber de onde um "proximos 100" vai partir. O
   * numero aqui responde sempre, e e clicavel: leva de volta para a linha.
   */
  atualizarRegistroAtual();

  // `Last Refresh`: a grade e um retrato, e outro processo pode ter escrito no
  // arquivo desde entao. Sem a hora nao da para saber se o que esta na tela e
  // de agora ou de meia hora atras.
  ref.textContent = p.readAt ? "⟳ " + p.readAt.slice(11) : "";
  ref.title = p.readAt ? T("UI_LAST_READ_AT", { time: p.readAt }) : "";

  $("pg-topo").disabled = p.first <= 1;
  $("pg-anterior").disabled = p.first <= 1;
  $("pg-proxima").disabled = p.eof;
  $("pg-fim").disabled = p.eof;
}

function trocarVisao(qual) {
  visaoAtiva = qual;
  for (const b of document.querySelectorAll(".visao")) {
    b.classList.toggle("ativa", b.dataset.visao === qual);
  }
  $("visao-dados").hidden = qual !== "dados";
  $("visao-estrutura").hidden = qual !== "estrutura";
  $("visao-form").hidden = qual !== "form";

  // O botao Colunas so vale sobre a grade; na Estrutura ele nao tem o que
  // filtrar e ficaria aceso comandando um painel que ninguem ve.
  $("pg-colunas").hidden = qual !== "dados";
  $("pg-indices").hidden = qual !== "dados";
  $("pg-filtro").hidden = qual !== "dados";
  $("pg-exportar").hidden = qual !== "dados";

  /*
   * As tres de REGISTRO valem na grade E no formulario -- as duas visoes falam
   * do mesmo registro, e o cursor e o mesmo. Escondê-las no formulario, que e
   * onde a pessoa esta olhando UM registro, seria escondê-las justamente onde
   * fazem mais sentido.
   */
  const emRegistro = qual === "dados" || qual === "form";
  $("pg-inserir").hidden = !emRegistro;
  $("pg-excluir").hidden = !emRegistro;
  $("pg-recuperar").hidden = !emRegistro;

  if (qual === "dados") {
    garantirPagina(abas.find((a) => a.h === abaAtiva));
    /*
     * Navegar no formulário move o cursor, e ele pode ter saído da página que a
     * grade tem em memória -- percorrer 300 registros ali e voltar mostraria a
     * grade parada na página velha, sem a linha do cursor em lugar nenhum. Só
     * recarrega quando de fato saiu: repaginar à toa jogaria o scroll para o
     * topo a cada alternância.
     */
    const alvo = cursorDe.get(abaAtiva);
    const pag = gradeDe.get(abaAtiva);
    if (alvo && pag && !pag.rows.some((l) => l.recno === alvo)) {
      carregarPagina(abaAtiva, alvo, 0);
    } else if (alvo) {
      /*
       * O registro continua na página, mas a MARCA não: quem navegou no
       * formulário mudou o cursor sem que a grade repintasse, e ela voltava com
       * o realce na linha onde ele estava ANTES. O rodapé dizia "reg. 5" e a
       * faixa acesa era a 1 -- duas afirmações sobre o mesmo cursor, uma delas
       * falsa, e é a visual que a pessoa usa para conferir onde está.
       */
      porCursorEm(abaAtiva, alvo);
    }
  }

  /*
   * O FORMULARIO SEGUE O CURSOR DA GRADE, e é isso que faz as duas serem vistas
   * do mesmo registro em vez de telas diferentes sobre o mesmo arquivo. Quem
   * estava na linha 12 encontra a 12 aqui -- e volta para a 12 lá.
   */
  if (qual === "form") carregarForm(abaAtiva, cursorDe.get(abaAtiva));
}

// ------------------------------------------------------- eventos da grade

document.querySelector(".visoes").addEventListener("click", (ev) => {
  const b = ev.target.closest(".visao");
  if (b) trocarVisao(b.dataset.visao);
});

$("pg-topo").addEventListener("click", () => carregarPagina(abaAtiva, "top", 0));

$("pg-fim").addEventListener("click", () =>
  carregarPagina(abaAtiva, "bottom", -(tamanhoPagina - 1))
);

$("pg-proxima").addEventListener("click", () => {
  const p = paginaDaAba(abaAtiva);
  if (p && p.rows.length) carregarPagina(abaAtiva, p.last, 1);
});

$("pg-anterior").addEventListener("click", () => {
  const p = paginaDaAba(abaAtiva);
  if (p && p.rows.length) carregarPagina(abaAtiva, p.first, -tamanhoPagina);
});

$("pg-tamanho").addEventListener("change", (ev) => {
  tamanhoPagina = Number(ev.target.value) || PAGINA_PADRAO;
  const p = paginaDaAba(abaAtiva);
  // Reancora na primeira linha visivel: mudar o tamanho da pagina nao deve
  // teletransportar o usuario para o topo do arquivo.
  carregarPagina(abaAtiva, p && p.rows.length ? p.first : "top", 0);
  agendarSalvar();
});

$("pg-recarregar").addEventListener("click", () => {
  const p = paginaDaAba(abaAtiva);
  carregarPagina(abaAtiva, p && p.rows.length ? p.first : "top", 0);
});

$("pg-ir").addEventListener("keydown", async (ev) => {
  if (ev.key !== "Enter") return;
  ev.preventDefault();

  const n = Number(String(ev.target.value).replace(/[^0-9]/g, ""));
  if (!n) return;

  try {
    await QDBU.rpc("data.goto", { h: abaAtiva, recno: n });
    await carregarPagina(abaAtiva, n, 0);
    /* Depois da pintura, senão a marca some junto com as linhas antigas. */
    await porCursorEm(abaAtiva, n);
    hint(T("UI_GOTO_RECORD", { n: n }));
  } catch (e) {
    hint(msgErro(e));
  }
});

// Teclas de pagina. No documento, e nao na grade: desenharGrade() recria a
// tabela inteira, entao o elemento que tinha foco deixa de existir.
document.addEventListener("keydown", (ev) => {
  if (!abaAtiva || visaoAtiva !== "dados") return;
  const el = alvo(ev);
  if (el && el.matches("input, select, textarea")) return;

  const p = paginaDaAba(abaAtiva);
  if (!p) return;

  if (ev.key === "PageDown" && !p.eof) {
    ev.preventDefault();
    carregarPagina(abaAtiva, p.last, 1);
  } else if (ev.key === "PageUp" && p.first > 1) {
    ev.preventDefault();
    carregarPagina(abaAtiva, p.first, -tamanhoPagina);
  } else if (ev.key === "Home" && ev.ctrlKey) {
    ev.preventDefault();
    carregarPagina(abaAtiva, "top", 0);
  } else if (ev.key === "End" && ev.ctrlKey) {
    ev.preventDefault();
    carregarPagina(abaAtiva, "bottom", -(tamanhoPagina - 1));
  } else if (ev.key === "F5") {
    ev.preventDefault();
    carregarPagina(abaAtiva, p.rows.length ? p.first : "top", 0);
  }
});


// ------------------------------------------------------------------ colunas

// Escolher quais colunas ver -- NETEST tem 125 campos e ha arquivos com 366.
// Sem isto a grade e uma parede horizontal e a coluna que interessa esta a
// trinta rolagens de distancia.
//
// A DLL e dona da selecao (fica no handle) e `data.page` sem `fields` ja usa
// ela. Aqui so se monta a lista INTEIRA dos marcados e se manda -- nunca
// "alterna este". Alternar exige que os dois lados concordem sobre o estado
// antes de cada clique; se discordarem uma vez, a caixa inverte e ninguem
// descobre por que.

/** Campos disponiveis por handle, como a DLL devolveu. */
const colunasDe = new Map(); // h -> [{key,name,type,len,dec,n,visible}]

let filtroColuna = "";

async function carregarColunas(h) {
  try {
    const r = await QDBU.rpc("fields.available", { h: h });
    colunasDe.set(h, r.fields);
    return r.fields;
  } catch (e) {
    hint(msgErro(e));
    return null;
  }
}

/** Aplica a selecao atual da lista e recarrega a pagina que esta na tela. */
async function aplicarColunas(h, nomes) {
  try {
    const r = await QDBU.rpc("fields.select", { h: h, fields: nomes });

    // `info` e o retrato que o save le. Sem atualizar aqui ele ficaria com a
    // selecao anterior ate o proximo session.state.
    const aba = abas.find((a) => a.h === h);
    if (aba && aba.info) aba.info.visible = r.visible;
    await carregarColunas(h);
    desenharListaColunas();

    // Reancora na linha que o usuario esta vendo: esconder uma coluna nao pode
    // mandar ninguem de volta para o topo de um arquivo de 400 mil registros.
    const p = paginaDaAba(h);
    await carregarPagina(h, p && p.rows.length ? p.first : "top", 0);
    agendarSalvar();
  } catch (e) {
    hint(msgErro(e));
  }
}

function desenharListaColunas() {
  const lista = $("pc-lista");
  const campos = colunasDe.get(abaAtiva) || [];
  const busca = filtroColuna.toLowerCase();

  lista.textContent = "";

  const visiveis = campos.filter((c) => c.visible).length;
  $("pc-conta").textContent = visiveis + " de " + campos.length;

  for (const c of campos) {
    if (busca && !c.name.toLowerCase().includes(busca)) continue;

    const li = elemento("li", "pc-item" + (c.visible ? "" : " oculta"));

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = c.visible;
    cb.dataset.campo = c.name;
    cb.id = "col-" + c.name;
    li.appendChild(cb);

    const rot = elemento("label", "pc-nome", c.name);
    rot.setAttribute("for", cb.id);
    li.appendChild(rot);

    // Clicar no NOME nao marca: leva ate a coluna na grade. Sao duas intencoes
    // diferentes e juntar as duas na mesma area faria uma esconder a outra.
    const ir = elemento("button", "pc-ir", "→");
    ir.type = "button";
    ir.dataset.ir = c.name;
    ir.title = T("UI_GO_TO_COLUMN", { name: c.name });
    ir.disabled = !c.visible;
    li.appendChild(ir);

    li.appendChild(elemento("span", "pc-tipo", c.type + c.len + (c.dec ? "," + c.dec : "")));
    lista.appendChild(li);
  }

  if (!lista.children.length) {
    lista.appendChild(elemento("li", "pc-vazio", T("ERROR_NO_COLUMN_MATCHES")));
  }
}

/** Nomes marcados, NA ORDEM DA LISTA -- que e a ordem em que virao na grade. */
function marcados() {
  return (colunasDe.get(abaAtiva) || []).filter((c) => c.visible).map((c) => c.name);
}

/** Abre/fecha o painel e acende o botao junto -- um ponto so decide os dois. */
function painelColunas(aberto) {
  $("painel-colunas").hidden = !aberto;
  $("pg-colunas").classList.toggle("ativo", aberto);
  if (aberto) painelIndices(false);
}

/*
 * `focar` só quando o usuário ABRIU o painel -- e não quando ele foi apenas
 * repintado.
 *
 * O foco era tomado sempre, e depois que sincronizarPaineis() entrou no
 * repintarDoEstado() isso passou a acontecer a cada abrir, fechar ou restaurar
 * arquivo: quem estava digitando um número em "ir p/" via o cursor saltar para
 * o filtro de colunas no meio da digitação. Mover o foco é resposta a um
 * pedido, nunca a uma repintura.
 */
async function abrirPainelColunas(focar) {
  if (!abaAtiva) return;
  painelColunas(true);
  if (!colunasDe.has(abaAtiva)) await carregarColunas(abaAtiva);
  desenharListaColunas();
  if (focar) $("pc-busca").focus();
}

/** Rola a grade ate a coluna e pisca, para o olho achar entre 366. */
function irAteColuna(nome) {
  const ths = [...document.querySelectorAll("#grade thead th")];
  const th = ths.find((e) => e.textContent === nome);
  if (!th) return;

  th.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });

  const i = ths.indexOf(th);
  const alvos = [th].concat(
    [...document.querySelectorAll("#grade tbody tr")].map((tr) => tr.cells[i])
  );
  for (const c of alvos) {
    if (!c) continue;
    c.classList.add("piscando");
    setTimeout(() => c.classList.remove("piscando"), 1200);
  }
}

// ---------------------------------------------------- eventos das colunas

$("pg-colunas").addEventListener("click", () => {
  if ($("painel-colunas").hidden) abrirPainelColunas(true);
  else painelColunas(false);
});

$("pc-fechar").addEventListener("click", () => painelColunas(false));

$("pc-busca").addEventListener("input", (ev) => {
  filtroColuna = ev.target.value.trim();
  desenharListaColunas();
});

$("pc-lista").addEventListener("change", async (ev) => {
  const cb = ev.target.closest("input[type=checkbox]");
  if (!cb) return;

  const campos = colunasDe.get(abaAtiva) || [];
  const alvo = campos.find((c) => c.name === cb.dataset.campo);
  if (!alvo) return;

  // Uma grade sem coluna nenhuma nao tem volta pela propria grade -- e a DLL
  // trata lista vazia como "mostrar todas", entao desmarcar a ultima faria
  // reaparecer TODAS. Barrar aqui e mais honesto que surpreender.
  if (alvo.visible && campos.filter((c) => c.visible).length === 1) {
    cb.checked = true;
    hint(T("ERROR_NEED_ONE_VISIBLE"));
    return;
  }

  alvo.visible = cb.checked;
  await aplicarColunas(abaAtiva, marcados());
});

$("pc-lista").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-ir]");
  if (b) irAteColuna(b.dataset.ir);
});

$("pc-todas").addEventListener("click", async () => {
  // Lista vazia = "sem selecao" para a DLL, que e exatamente "todas". Mandar os
  // 366 nomes daria no mesmo com mais bytes e travaria a selecao numa ordem.
  try {
    await QDBU.rpc("fields.reset", { h: abaAtiva });
    const aba = abas.find((a) => a.h === abaAtiva);
    if (aba && aba.info) aba.info.visible = [];
    await carregarColunas(abaAtiva);
    desenharListaColunas();
    const p = paginaDaAba(abaAtiva);
    await carregarPagina(abaAtiva, p && p.rows.length ? p.first : "top", 0);
    agendarSalvar();
  } catch (e) {
    hint(msgErro(e));
  }
});

$("pc-inverter").addEventListener("click", async () => {
  const campos = colunasDe.get(abaAtiva) || [];
  const novos = campos.filter((c) => !c.visible).map((c) => c.name);

  if (!novos.length) {
    hint(T("ERROR_INVERT_WOULD_EMPTY"));
    return;
  }

  for (const c of campos) c.visible = !c.visible;
  await aplicarColunas(abaAtiva, novos);
});


// ------------------------------------------------------------------ indices

// Ordenar em DBF exige indice. Nao existe "ordenar por esta coluna" em memoria:
// com 421 mil registros isso seria ler o arquivo inteiro para a RAM a cada
// clique. Quem ordena e o NTX -- e se nao houver um que sirva, a resposta certa
// e dizer isso, nao fingir que ordenou.
//
// A DLL nao aceita mais o limite de 7 indices do original: aquilo era o que
// cabia em 80 colunas de tela, nao um limite do RDD.

/** Candidatos da pasta por handle -- 512 bytes lidos por .ntx, uma vez. */
const indicesDe = new Map(); // h -> [{path,file,key,valid,reason,open,match}]

let filtroIndice = "";

/** Índices abertos e ordem ativa, direto do estado da aba (vem da DLL). */
function ordensDaAba(h) {
  const aba = abas.find((a) => a.h === h);
  return (aba && aba.info && aba.info.orders) || [];
}

async function carregarCandidatos(h) {
  try {
    const r = await QDBU.rpc("index.available", { h: h });
    indicesDe.set(h, r.candidates);
    return r.candidates;
  } catch (e) {
    hint(msgErro(e));
    return [];
  }
}

/**
 * Reancora e repinta depois de mexer em indice.
 *
 * SEMPRE do topo: a ancora que a grade tinha era um recno posicionado na ordem
 * ANTERIOR. Sob a ordem nova ele continua existindo, mas "o que vem depois
 * dele" e outra coisa -- a pagina sairia coerente e errada, que e pior do que
 * voltar ao inicio.
 */
async function aposMexerNoIndice(h, estado) {
  const aba = abas.find((a) => a.h === h);
  if (aba && aba.info && estado) aba.info.orders = estado.indexes;

  await carregarCandidatos(h);
  desenharPainelIndices();
  desenharComboOrdem();
  ajustarBusca();
  await carregarPagina(h, "top", 0);
  desenharGrade();
}

async function abrirIndice(caminho) {
  try {
    const r = await QDBU.rpc("index.open", { h: abaAtiva, path: caminho });
    await aposMexerNoIndice(abaAtiva, r);
    hint(T("INFO_INDEX_OPENED", { order: r.order, key: r.orderKey }));
  } catch (e) {
    hint(msgErro(e));
  }
}

async function fecharIndice(caminho) {
  try {
    const r = await QDBU.rpc("index.close", { h: abaAtiva, path: caminho });
    await aposMexerNoIndice(abaAtiva, r);
  } catch (e) {
    hint(msgErro(e));
  }
}

async function trocarOrdem(n) {
  try {
    const r = await QDBU.rpc("index.setorder", { h: abaAtiva, order: Number(n) });
    await aposMexerNoIndice(abaAtiva, r);
    hint(r.order === 0
      ? T("UI_PHYSICAL_ORDER")
      : T("UI_ORDERED_BY", { key: r.orderKey }));
  } catch (e) {
    hint(msgErro(e));
  }
}

// -------------------------------------------------------------- preferencias

/*
 * Preferencias: a config GLOBAL do app (o nivel mais geral da cascata).
 * Codepage padrao + mostrar registros deletados. O SET EPOCH e fixo (1979) e
 * so aparece informado.
 */
async function abrirConfig() {
  try {
    const c = await QDBU.rpc("config.get", {});
    codepagesDisp = c.codepages || codepagesDisp;
    preencherSelectCodepage($("cfg-codepage"), false);
    $("cfg-codepage").value = c.codepage || "PT850";
    $("cfg-deleted").checked = !!c.showDeleted;
    $("cfg-epoch").textContent = T("UI_EPOCH_INFO", { year: String(c.epoch) });
    $("dlg-config").showModal();
  } catch (e) {
    hint(msgErro(e));
  }
}

async function gravarConfig() {
  try {
    const r = await QDBU.rpc("config.set", {
      codepage: $("cfg-codepage").value,
      showDeleted: $("cfg-deleted").checked,
    });
    $("dlg-config").close();
    // SET DELETED e GLOBAL na VM: vale para TODAS as abas. As paginas em cache
    // (gradeDe/formDe) das outras envelhecem -- limpa-las forca a recarga ao
    // reativar; a ativa recarrega agora. Sem isto, trocar de aba mostraria o
    // estado de deletados anterior.
    gradeDe.clear();
    formDe.clear();
    if (visaoAtiva === "form") await carregarForm(abaAtiva, cursorDe.get(abaAtiva));
    else await carregarPagina(abaAtiva, "top", 0);
    hint(r.saved ? T("INFO_CONFIG_SAVED") : T("WARN_CONFIG_NOT_SAVED"));
  } catch (e) {
    hint(msgErro(e));
  }
}

$("btn-config").addEventListener("click", abrirConfig);
$("cfg-cancelar").addEventListener("click", () => $("dlg-config").close());
$("form-config").addEventListener("submit", (ev) => {
  ev.preventDefault();
  gravarConfig();
});

// --------------------------------------------------------------- codepage

/*
 * A codepage e POR ARQUIVO -- a lente com que a ponte le/grava os bytes de um
 * DBF, sem tocar no disco (B3.2/B3.5). A lista vem uma vez da DLL, filtrada
 * pelo que linkou; o rotulo de cada uma e traduzido (UI_CDP_<id>), o id nao.
 */
let codepagesDisp = [];

async function carregarCodepages() {
  try {
    const r = await QDBU.rpc("meta.codepages", {});
    codepagesDisp = r.codepages || [];
  } catch (e) {
    codepagesDisp = []; // sem lista, o seletor some -- e o padrao PT850 vale
  }
}

/* Rotulo traduzido; cai no proprio id se nao houver chave (codepage nova). */
function rotuloCodepage(id) {
  const k = "UI_CDP_" + id;
  const t = T(k);
  return t === k ? id : t;
}

/* Preenche um <select> com as codepages disponiveis. `comHerdar` inclui uma
   primeira opcao vazia "herda do nivel acima" -- para conexao e por-arquivo,
   onde nao escolher e legitimo (cai na cascata). */
function preencherSelectCodepage(sel, comHerdar) {
  sel.textContent = "";
  if (comHerdar) sel.appendChild(new Option(T("UI_CDP_INHERIT"), ""));
  for (const c of codepagesDisp) sel.appendChild(new Option(rotuloCodepage(c.id), c.id));
}

function desenharComboCodepage() {
  const sel = $("pg-codepage");
  const aba = abas.find((a) => a.h === abaAtiva);
  const atual = (aba && aba.info && aba.info.codepage) || "";
  // `pista` e nao `hint`: `hint()` e a funcao da barra de status, global e usada
  // no arquivo inteiro. Um `const hint` aqui a sombreia no corpo desta funcao --
  // a proxima linha que chamasse `hint("...")` morreria com "hint is not a
  // function". E a familia de defeitos que o guia do projeto lista em "NOME
  // COMPARTILHADO ENTRE ARQUIVOS".
  const pista = (aba && aba.info && aba.info.codepageHint) || "";

  sel.textContent = "";
  for (const c of codepagesDisp) {
    sel.appendChild(new Option(rotuloCodepage(c.id), c.id));
  }
  sel.value = atual;
  sel.disabled = !aba || !codepagesDisp.length || (aba && aba.detached);

  /*
   * O CABECALHO SUGERE, mas nao decide (a maioria dos DBFs Clipper grava 0x00).
   * Quando ele aponta uma codepage diferente da ativa, o seletor se destaca e
   * o title diz qual -- a pessoa troca se quiser, e nada muda sozinho.
   */
  const origem = (aba && aba.info && aba.info.codepageOrigin) || "";
  const sugere = pista && pista !== atual;
  sel.classList.toggle("sugere", !!sugere);
  // O title diz a origem (herdado da conexao/global) e, se houver, a sugestao
  // do cabecalho -- assim a pessoa sabe por que aquela lente esta ativa.
  const partes = [];
  if (origem === "connection") partes.push(T("UI_CODEPAGE_FROM_CONN"));
  else if (origem === "global" || origem === "default") partes.push(T("UI_CODEPAGE_FROM_GLOBAL"));
  else if (origem === "file") partes.push(T("UI_CODEPAGE_FROM_FILE"));
  if (sugere) partes.push(T("UI_CODEPAGE_HINT", { cp: rotuloCodepage(pista) }));
  sel.title = partes.length ? partes.join(" ") : T("UI_CODEPAGE_TITLE");

  const fixar = $("pg-cod-fixar");
  if (fixar) {
    fixar.disabled = sel.disabled;
    // "ja fixado neste arquivo" quando a origem e o proprio arquivo
    fixar.classList.toggle("ativo", origem === "file");
    fixar.title = origem === "file" ? T("UI_PINNED_FILE") : T("UI_PIN_FILE");
  }
}

/*
 * Troca a lente do arquivo ativo. `file.setcodepage` nao toca no disco -- so
 * muda como os bytes viram texto --, entao recarregar a visao a vista basta
 * para o acento aparecer certo. Reversivel: e so escolher outra.
 */
/*
 * Troca a lente do arquivo ativo. Duas formas, e a diferenca e SE grava:
 *   persist=false (seletor)  -> vale so nesta sessao, nada escrito em disco
 *   persist=true  (fixar)    -> grava em <pasta>/.qdbu/arquivos.json (opt-in)
 * Fixar e best-effort: se a pasta do cliente recusar, a lente vale igual e a
 * barra avisa. Ninguem cria arquivo de config sem pedir.
 */
async function trocarCodepage(id, persist) {
  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba) return;
  try {
    const arg = { h: abaAtiva, codepage: id };
    if (persist) arg.persist = "file";
    const r = await QDBU.rpc("file.setcodepage", arg);
    if (aba.info) {
      aba.info.codepage = r.codepage;
      aba.info.codepageHint = r.codepageHint;
      aba.info.codepageOrigin = r.codepageOrigin;
    }
    if (visaoAtiva === "form") await carregarForm(abaAtiva, cursorDe.get(abaAtiva));
    else {
      const p = paginaDaAba(abaAtiva);
      await carregarPagina(abaAtiva, p && p.rows.length ? p.first : "top", 0);
    }
    desenharComboCodepage();
    if (persist) {
      hint(r.saved ? T("INFO_CODEPAGE_PINNED", { cp: rotuloCodepage(id) })
                   : T("WARN_CODEPAGE_NOT_PINNED", { cp: rotuloCodepage(id) }));
    } else {
      hint(T("INFO_CODEPAGE_CHANGED", { cp: rotuloCodepage(id) }));
    }
  } catch (e) {
    hint(msgErro(e));
    desenharComboCodepage(); // volta o combo para a codepage que ficou
  }
}

// ------------------------------------------------------------------ desenho

function desenharComboOrdem() {
  const sel = $("pg-ordem");
  const ordens = ordensDaAba(abaAtiva);
  const ativa = ordens.find((o) => o.active);

  sel.textContent = "";
  sel.appendChild(new Option(T("UI_ORDER_PHYSICAL"), "0"));
  for (const o of ordens) {
    const op = new Option(o.name + " · " + resumo(o.key), String(o.order));
    op.title = o.key;
    sel.appendChild(op);
  }
  sel.value = String(ativa ? ativa.order : 0);
  sel.disabled = !ordens.length;
  sel.title = ordens.length ? T("UI_ORDER_TITLE") : T("UI_NO_INDEX_OPEN");
}

/** Expressao longa nao cabe num combo; o inteiro fica no title. */
function resumo(k) {
  const t = String(k || "");
  return t.length > 26 ? t.slice(0, 25) + "…" : t;
}

function desenharPainelIndices() {
  const abertos = $("pi-abertos");
  const pasta = $("pi-pasta");
  const ordens = ordensDaAba(abaAtiva);
  const cands = indicesDe.get(abaAtiva) || [];
  const busca = filtroIndice.toLowerCase();

  abertos.textContent = "";
  pasta.textContent = "";
  $("pi-conta").textContent = ordens.length
    ? T("UI_N_OPEN", { n: ordens.length })
    : T("UI_NONE_OPEN");
  $("pi-fechar-todos").disabled = !ordens.length;

  // Abertos: o rádio marca QUEM COMANDA. Só um pode, e é isso que o rádio diz --
  // com checkbox pareceria que dá para ter duas ordens ao mesmo tempo.
  const fis = elemento("li", "pi-item" + (ordens.every((o) => !o.active) ? " ativo" : ""));
  const rf = document.createElement("input");
  rf.type = "radio";
  rf.name = "ordem-ativa";
  rf.checked = ordens.every((o) => !o.active);
  rf.dataset.ordem = "0";
  fis.appendChild(rf);
  fis.appendChild(elemento("label", "pi-nome", T("UI_ORDER_PHYSICAL")));
  abertos.appendChild(fis);

  for (const o of ordens) {
    const li = elemento("li", "pi-item" + (o.active ? " ativo" : ""));
    const r = document.createElement("input");
    r.type = "radio";
    r.name = "ordem-ativa";
    r.checked = o.active;
    r.dataset.ordem = String(o.order);
    li.appendChild(r);

    const nome = elemento("label", "pi-nome", o.name);
    nome.title = o.key;
    li.appendChild(nome);

    li.appendChild(elemento("span", "pi-chave", resumo(o.key)));

    const x = elemento("button", "pi-x", "×");
    x.type = "button";
    // path, nao bag: ordBagName() devolve so o nome, sem pasta.
    x.dataset.fechar = o.path || o.bag;
    x.title = T("UI_CLOSE_INDEX", { file: o.name });
    li.appendChild(x);

    abertos.appendChild(li);
  }

  // Candidatos: os que não estão abertos, os prováveis primeiro.
  const ordem = { sure: 0, maybe: 1, no: 2 };
  const lista = cands
    .filter((c) => !c.open && c.match !== "no")
    .filter((c) => !busca || c.file.toLowerCase().includes(busca) ||
                             (c.key || "").toLowerCase().includes(busca))
    .sort((a, b) => ordem[a.match] - ordem[b.match] || a.file.localeCompare(b.file));

  for (const c of lista) {
    const li = elemento("li", "pi-cand " + c.match);
    const b = elemento("button", "pi-abrir", c.file);
    b.type = "button";
    b.dataset.abrir = c.path;
    // O motivo do "maybe" fica no tooltip: e ele que explica por que cinco
    // indices diferentes aparecem como candidatos do mesmo arquivo.
    b.title = c.key + (c.reason ? "\n\n" + c.reason : "");
    li.appendChild(b);
    li.appendChild(elemento("span", "pi-chave", resumo(c.key)));
    abertosOuPasta(pasta, li);
  }

  if (!lista.length) {
    pasta.appendChild(
      elemento("li", "pc-vazio",
        cands.length ? T("UI_NOTHING_ELSE_MATCHES") : T("UI_READING_FOLDER"))
    );
  }
}

function abertosOuPasta(ul, li) {
  ul.appendChild(li);
}

// --------------------------------------------------------------- eventos

/** Os dois painéis dividem o mesmo espaço: abrir um fecha o outro. */
function painelIndices(aberto) {
  $("painel-indices").hidden = !aberto;
  $("pg-indices").classList.toggle("ativo", aberto);
  if (aberto) painelColunas(false);
}

async function abrirPainelIndices() {
  if (!abaAtiva) return;
  // O formulario carrega o destino do arquivo ANTERIOR; deixar aberto ao trocar
  // de aba criaria o indice na pasta errada sem nenhum erro.
  formIndice(false);
  painelIndices(true);
  desenharPainelIndices();
  if (!indicesDe.has(abaAtiva)) await carregarCandidatos(abaAtiva);
  desenharPainelIndices();
}

$("pg-indices").addEventListener("click", () => {
  if ($("painel-indices").hidden) abrirPainelIndices();
  else painelIndices(false);
});

$("pi-fechar").addEventListener("click", () => {
  formIndice(false);
  painelIndices(false);
});

$("pi-busca").addEventListener("input", (ev) => {
  filtroIndice = ev.target.value.trim();
  desenharPainelIndices();
});

$("pi-abertos").addEventListener("change", (ev) => {
  const r = ev.target.closest("input[type=radio]");
  if (r) trocarOrdem(r.dataset.ordem);
});

$("pi-abertos").addEventListener("click", (ev) => {
  const x = ev.target.closest("[data-fechar]");
  if (x) fecharIndice(x.dataset.fechar);
});

$("pi-pasta").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-abrir]");
  if (b) abrirIndice(b.dataset.abrir);
});

$("pi-fechar-todos").addEventListener("click", async () => {
  try {
    const r = await QDBU.rpc("index.close", { h: abaAtiva, all: true });
    await aposMexerNoIndice(abaAtiva, r);
    hint(T("INFO_INDEXES_CLOSED"));
  } catch (e) {
    hint(msgErro(e));
  }
});

$("pg-ordem").addEventListener("change", (ev) => trocarOrdem(ev.target.value));
$("pg-codepage").addEventListener("change", (ev) => trocarCodepage(ev.target.value, false));
$("pg-cod-fixar").addEventListener("click", () => {
  const id = $("pg-codepage").value;
  if (id) trocarCodepage(id, true);
});

/**
 * Clique no cabecalho ordena -- SE houver indice que sirva.
 *
 * Nao se ordena em memoria: com 421 mil registros isso seria ler o arquivo
 * inteiro a cada clique, e a pagina seguinte teria de repetir a leitura. Quando
 * nao ha indice pela coluna, o certo e dizer que nao ha, e nao entregar uma
 * ordenacao que so vale para a pagina visivel -- o que pareceria funcionar e
 * mentiria em silencio.
 */
$("grade").addEventListener("click", async (ev) => {
  /*
   * CLICAR NUMA LINHA ESCOLHE O REGISTRO.
   *
   * Antes, clique em linha de dados não fazia nada -- só o cabeçalho respondia,
   * para trocar a ordem. A única forma de mover o ponteiro era digitar o número
   * no "ir p/ registro" do rodapé, o que torna "próximos n" impraticável: não
   * dá para apontar e dizer "é daqui para baixo".
   */
  const linha = ev.target.closest("tbody tr");
  if (linha && abaAtiva) {
    const n = Number((linha.querySelector("td.recno") || {}).textContent);
    if (n) await porCursorEm(abaAtiva, n);
    return;
  }

  const th = ev.target.closest("thead th");
  if (!th || th.classList.contains("recno") || !abaAtiva) return;

  const campo = th.textContent;
  const ordens = ordensDaAba(abaAtiva);

  // Casa a chave exata: "CLI_NOME" serve, "dtos(CLI_ANIV)" não é ordenar por
  // CLI_ANIV -- é por outra coisa que por acaso cita o campo.
  const achou = ordens.find((o) => (o.key || "").toUpperCase() === campo.toUpperCase());

  if (achou) {
    if (achou.active) {
      hint(T("UI_ALREADY_ORDERED_BY", { name: campo }));
      return;
    }
    await trocarOrdem(achou.order);
    return;
  }

  const cands = indicesDe.get(abaAtiva) || [];
  const pode = cands.find(
    (c) => !c.open && (c.key || "").toUpperCase() === campo.toUpperCase()
  );

  if (pode) {
    hint(T("UI_INDEX_AVAILABLE_FOR", { name: campo, file: pode.file }));
    return;
  }

  hint(T("UI_NO_INDEX_FOR", { name: campo }));
});


// ---------------------------------------------------- condicoes do guiado

// VARIAS CONDICOES, com E/OU entre elas -- como no Navicat, onde cada linha tem
// caixa propria e o [+] acrescenta uma irma.
//
// A PEGADINHA E A PRECEDENCIA. Em xBase `.AND.` liga mais forte que `.OR.`,
// entao `A .AND. B .OR. C` significa `(A .AND. B) .OR. C`. Quem montou as tres
// linhas pensando "A, e entao B ou C" leva outro conjunto de registros -- e a
// grade nao tem como avisar, porque a expressao esta correta, so nao e a que a
// pessoa quis dizer.
//
// A defesa e nao esconder: a previa mostra a expressao COM os parenteses que a
// precedencia aplica de fato, e quando ha mistura de E com OU sai um aviso.
// Nada de "corrigir" o que o usuario escreveu -- so deixar visivel.
//
// A caixa de cada linha liga/desliga a condicao sem apagar: e o que permite
// testar "e sem esta?" e voltar atras, que era o botao de marcar do Navicat.

/*
 * As condições são POR ARQUIVO, e agora de verdade.
 *
 * Antes existia só a lista global `condicoes`, e trocar de aba a filtrava
 * contra os campos do arquivo novo. Funcionava por acidente quando os nomes
 * coincidiam -- e pastas de clientes diferentes têm mesmo o mesmo esquema --,
 * mas o que a pessoa montou num arquivo se perdia ao voltar para ele.
 *
 * `condicoes` continua sendo a lista que a TELA edita; o mapa guarda uma por
 * handle. As duas apontam para o MESMO array quando a aba está ativa, então
 * `splice`/mutação já se refletem no mapa -- só a reatribuição precisa passar
 * por usarCondicoes().
 */
const condicoesDe = new Map();

/*
 * O que veio do session.json e ainda não foi conferido, por CAMINHO de arquivo.
 *
 * Por caminho, e não por handle, porque na hora em que o session.json é lido o
 * handle pode não existir ainda -- e, no caso do F5, o arquivo já está aberto
 * com um handle que a restauração nem chega a tocar.
 *
 * Fica cru de propósito: conferir `campo` exige a estrutura do arquivo, que só
 * é carregada quando alguém abre o painel. Materializar aqui obrigaria a pedir
 * `file.info` de todos os arquivos da sessão só para talvez nunca usar.
 */
const condicoesDoDisco = new Map();

let condicoes = [];
let condicoesDaAba = null; // de quem é a lista acima, para não guardar no h errado
let seqCond = 0;

/** Troca a lista da tela e a registra no arquivo ativo. */
function usarCondicoes(lista) {
  condicoes = lista;
  condicoesDaAba = abaAtiva;
  if (abaAtiva) condicoesDe.set(abaAtiva, lista);
}

/**
 * As condições em forma de DADO, para o session.json.
 *
 * Sem o `id`, que só faz sentido na sessão viva, e com cada campo copiado um a
 * um: o que sai daqui volta de um arquivo em disco e não pode carregar nada que
 * não tenha sido previsto.
 */
function condicoesSalvaveis(h) {
  const aba = abas.find((a) => a.h === h);
  const lista = condicoesDe.get(h);

  // Nunca abriu o painel neste arquivo nesta sessão: devolve o que veio do
  // disco, intocado. Sem isto o próximo salvamento apagaria o que a pessoa
  // montou na sessão anterior -- a mesma armadilha explicada nas colunas.
  if (!lista) {
    const cru = aba && condicoesDoDisco.get(chaveCaminho(aba.caminho));
    return cru && cru.length ? cru : null;
  }

  if (!lista.length) return null;
  return lista.map((c) => ({
    ativa: c.ativa !== false,
    juncao: c.juncao === "OU" ? "OU" : "E",
    campo: String(c.campo || ""),
    op: String(c.op || "=="),
    valor: String(c.valor == null ? "" : c.valor),
    calc: c.calc === true,
  }));
}

/**
 * Uma condição vinda do disco -> uma condição confiável, ou null.
 *
 * `op` e `campo` entram DIRETO na expressão montada (`campo + " " + op + ...`),
 * então os dois são conferidos contra o que existe: o operador contra a lista
 * de operadores, o campo contra a estrutura do arquivo. Um session.json editado
 * à mão -- ou trocado entre máquinas -- não pode virar código só por estar num
 * arquivo que o app confia. Mesmo raciocínio do modelo de confiança.
 */
function condicaoDoDisco(c, existem) {
  if (!c || typeof c !== "object") return null;
  const campo = String(c.campo || "");
  if (!existem.has(campo)) return null;
  if (!OPERADORES.some(([v]) => v === c.op)) return null;
  return {
    id: ++seqCond,
    ativa: c.ativa !== false,
    juncao: c.juncao === "OU" ? "OU" : "E",
    campo: campo,
    op: c.op,
    valor: String(c.valor == null ? "" : c.valor),
    calc: c.calc === true,
  };
}

// O primeiro item e o CODIGO gravado na condicao; o segundo e a chave do
// rotulo. Trocar de idioma nao pode mexer no valor -- montarExpressao() compara
// com "$", "inicia", "vazio", e um rotulo traduzido ali quebraria o filtro.
const OPERADORES = [
  ["==", "UI_OP_EQ"],
  ["!=", "UI_OP_NE"],
  ["$", "UI_OP_CONTAINS"],
  ["inicia", "UI_OP_STARTS"],
  [">", "UI_OP_GT"],
  ["<", "UI_OP_LT"],
  [">=", "UI_OP_GE"],
  ["<=", "UI_OP_LE"],
  ["vazio", "UI_OP_EMPTY"],
  ["naovazio", "UI_OP_NOT_EMPTY"],
];

const SEM_VALOR = ["vazio", "naovazio"];

function novaCondicao(campo) {
  return {
    id: ++seqCond,
    ativa: true,
    juncao: "E",
    campo: campo || "",
    op: "==",
    valor: "",
    // `calc` decide se o valor é um LITERAL ou uma EXPRESSÃO a avaliar. É um
    // botão na linha, não um prefixo no texto: ver o comentário do fx em
    // desenharCondicoes().
    calc: false,
  };
}

/* Data escrita de três jeitos, e nada além disso. Devolve AAAAMMDD ou null. */
function dataParaISO(txt) {
  const t = String(txt).trim();
  let m, a, mes, d;

  if ((m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) {
    d = m[1]; mes = m[2]; a = m[3];
  } else if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    a = m[1]; mes = m[2]; d = m[3];
  } else if ((m = t.match(/^(\d{4})(\d{2})(\d{2})$/))) {
    a = m[1]; mes = m[2]; d = m[3];
  } else {
    return null;
  }

  // 31/02/2026 casa a forma e não existe. Sem esta conferência ele viraria
  // SToD('20260231'), que o Harbour devolve como data VAZIA -- e uma data
  // vazia numa comparação passa a valer para quase todo registro.
  const dt = new Date(+a, +mes - 1, +d);
  if (dt.getFullYear() !== +a || dt.getMonth() !== +mes - 1 || dt.getDate() !== +d) {
    return null;
  }
  return a + mes + d;
}

const VALOR_SIM = /^(s|sim|v|verdadeiro|t|\.t\.|true|1|y|yes|x)$/i;
const VALOR_NAO = /^(n|nao|não|f|falso|\.f\.|false|0)$/i;

/**
 * Uma condição isolada -> texto xBase.
 *
 * Devolve `{txt}` quando dá, `{vazio}` quando ainda falta preencher, e
 * `{erro, params}` quando o valor não cabe no tipo do campo.
 *
 * O TERCEIRO CASO É O MOTIVO DESTA FUNÇÃO TER SIDO REESCRITA. Antes, valor que
 * não coubesse no tipo era CONVERTIDO na marra: número virava `0`, lógico
 * virava `.F.`, e data tinha os hifens removidos e era embrulhada em `SToD()`.
 * Digitar `date()-7` num campo Data produzia `SToD('date()7')` -- o menos sumia,
 * a data saía vazia, e a comparação passava a valer para todo registro com data.
 * Nenhum erro, em lugar nenhum: o filtro rodava e mentia. Recusar é a única
 * resposta honesta, porque o estrago aqui não aparece como falha, aparece como
 * um resultado plausível.
 *
 * MODO EXPRESSÃO (`c.calc`): com o botão fx ligado, o valor é entregue CRU como
 * expressão xBase, sem aspas e sem conversão -- `Date()-7`, `CLI_LIMC * 2`.
 * Sem isso o modo guiado não alcançaria data relativa, que é o caso comum.
 *
 * O modo é DECLARADO num botão, e não deduzido do texto. Já foi um prefixo `=`,
 * e a diferença importa: com prefixo, quem não conhece a convenção continua
 * digitando `Date()-7` e recebe uma recusa; e num campo texto o valor literal
 * "=OK" viraria código. Um botão aceso na linha diz o que está valendo antes de
 * a pessoa clicar em Aplicar, que é quando o engano ficaria caro.
 */
function textoDaCondicao(c) {
  if (!c.campo) return { vazio: true };
  if (c.op === "vazio") return { txt: "Empty(" + c.campo + ")" };
  if (c.op === "naovazio") return { txt: "!Empty(" + c.campo + ")" };

  const col = (colunasDe.get(abaAtiva) || []).find((x) => x.name === c.campo);
  const tipo = col ? col.type : "C";
  const bruto = c.valor.trim();
  if (!bruto) return { vazio: true };

  const crua = c.calc ? bruto : null;

  const recusa = (chave) => ({ erro: chave, params: { value: bruto, field: c.campo } });

  let val;
  if (crua !== null) {
    // Parênteses porque a expressão entra numa comparação: sem eles,
    // `CAMPO > Date()-7` ainda funciona, mas `CAMPO > A .OR. B` mudaria de
    // sentido. Custa dois caracteres e fecha a classe inteira.
    val = "(" + crua + ")";
  } else if (tipo === "N") {
    const n = Number(bruto.replace(/\s/g, "").replace(",", "."));
    if (!isFinite(n) || bruto === "") return recusa("ERROR_VALUE_NOT_NUMBER");
    val = String(n);
  } else if (tipo === "D") {
    const iso = dataParaISO(bruto);
    if (!iso) return recusa("ERROR_VALUE_NOT_DATE");
    val = "SToD('" + iso + "')";
  } else if (tipo === "L") {
    // Mesma lista do C2Bool() no Harbour (src/util/conv.prg): os dois lados
    // precisam concordar, senao um filtro montado aqui recusa o valor que a
    // exportacao escreveu. O que nao esta em nenhuma das duas listas e recusa,
    // e nao ".F." silencioso.
    if (VALOR_SIM.test(bruto)) val = ".T.";
    else if (VALOR_NAO.test(bruto)) val = ".F.";
    else return recusa("ERROR_VALUE_NOT_LOGICAL");
  } else {
    val = literal(bruto);
  }

  if (c.op === "$") {
    return { txt: (crua !== null ? val : literal(bruto)) + " $ " + c.campo };
  }
  if (c.op === "inicia") {
    // Com expressão o tamanho só se sabe em tempo de execução.
    return {
      txt: crua !== null
        ? "Left(" + c.campo + ", Len(" + val + ")) == " + val
        : "Left(" + c.campo + ", " + bruto.length + ") == " + literal(bruto),
    };
  }
  return { txt: c.campo + " " + c.op + " " + val };
}

/**
 * Junta as condições ativas aplicando a precedência EXPLICITAMENTE.
 *
 * Agrupa cada sequência de E num parêntese antes de ligar os OU. É a mesma
 * coisa que o Harbour faria sozinho -- a diferença é que aqui isso fica escrito
 * e o usuário vê o que pediu de verdade.
 */
function montarExpressao() {
  const brutas = condicoes.filter((c) => c.ativa);
  if (!brutas.length) return { expr: "", incompleta: true, misturado: false };

  const ativas = [];
  for (const c of brutas) {
    const r = textoDaCondicao(c);
    // A primeira recusa manda: apontar uma condição de cada vez é o que deixa
    // a mensagem dizer QUAL campo e QUAL valor.
    if (r.erro) {
      return { expr: "", incompleta: true, misturado: false, erro: r.erro, params: r.params };
    }
    if (r.vazio) return { expr: "", incompleta: true, misturado: false };
    ativas.push({ c: c, txt: r.txt });
  }

  // Quebra em grupos de E, separados pelos OU.
  const grupos = [[ativas[0].txt]];
  for (let i = 1; i < ativas.length; i++) {
    if (ativas[i].c.juncao === "OU") grupos.push([ativas[i].txt]);
    else grupos[grupos.length - 1].push(ativas[i].txt);
  }

  const temE = grupos.some((g) => g.length > 1);
  const temOu = grupos.length > 1;

  const partes = grupos.map((g) =>
    g.length === 1 ? g[0] : (temOu ? "(" + g.join(" .AND. ") + ")" : g.join(" .AND. "))
  );

  return {
    expr: partes.join(" .OR. "),
    incompleta: false,
    misturado: temE && temOu,
  };
}

function desenharCondicoes() {
  const cx = $("ff-condicoes");
  const campos = colunasDe.get(abaAtiva) || [];
  cx.textContent = "";

  condicoes.forEach((c, i) => {
    const linha = elemento("div", "ff-cond" + (c.ativa ? "" : " inativa"));
    linha.dataset.id = String(c.id);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = c.ativa;
    cb.dataset.campo = "ativa";
    cb.title = T("UI_USE_CONDITION");
    linha.appendChild(cb);

    // A junção só existe a partir da segunda: antes da primeira não há o que unir.
    if (i === 0) {
      linha.appendChild(elemento("span", "ff-juncao-vazia", T("UI_WHERE")));
    } else {
      const j = document.createElement("select");
      j.className = "ff-juncao";
      j.dataset.campo = "juncao";
      for (const v of ["E", "OU"])
        j.appendChild(new Option(T(v === "E" ? "UI_JOIN_AND" : "UI_JOIN_OR"), v));
      j.value = c.juncao;
      linha.appendChild(j);
    }

    const sc = document.createElement("select");
    sc.dataset.campo = "campo";
    for (const f of campos) {
      const op = new Option(f.name, f.name);
      op.title = f.type + f.len + (f.dec ? "," + f.dec : "");
      sc.appendChild(op);
    }
    sc.value = c.campo;
    linha.appendChild(sc);

    const so = document.createElement("select");
    so.dataset.campo = "op";
    for (const [v, chave] of OPERADORES) so.appendChild(new Option(T(chave), v));
    so.value = c.op;
    linha.appendChild(so);

    /*
     * fx -- "o que está escrito ao lado é para CALCULAR, não para comparar
     * como texto".
     *
     * Fica à ESQUERDA do campo porque é o que qualifica o que vem depois: lê-se
     * "fx: Date()-7". À direita seria lido como uma ação sobre o valor já
     * digitado, e é o oposto -- ele muda como o valor será interpretado.
     */
    const fx = elemento("button", "ff-fx" + (c.calc ? " ligado" : ""), "fx");
    fx.type = "button";
    fx.dataset.acao = "calc";
    fx.setAttribute("aria-pressed", c.calc ? "true" : "false");
    fx.title = T(c.calc ? "UI_CALC_ON" : "UI_CALC_OFF");
    fx.hidden = SEM_VALOR.includes(c.op);
    linha.appendChild(fx);

    const iv = document.createElement("input");
    iv.dataset.campo = "valor";
    if (c.calc) iv.classList.add("calc");
    iv.value = c.valor;
    iv.placeholder = T(c.calc ? "UI_VALUE_EXPR" : "UI_VALUE");
    iv.title = T(c.calc ? "UI_CALC_ON" : "UI_VALUE_TITLE");
    iv.autocomplete = "off";
    iv.spellcheck = false;
    iv.setAttribute("list", "ff-sugestoes");
    iv.hidden = SEM_VALOR.includes(c.op);
    linha.appendChild(iv);

    const mais = elemento("button", "ff-mini", "+");
    mais.type = "button";
    mais.dataset.acao = "add";
    mais.title = T("UI_ADD_CONDITION_BELOW");
    linha.appendChild(mais);

    const x = elemento("button", "ff-mini ff-rem", "×");
    x.type = "button";
    x.dataset.acao = "rem";
    x.title = T("UI_REMOVE");
    x.disabled = condicoes.length === 1;
    linha.appendChild(x);

    cx.appendChild(linha);
  });

  desenharPrevia();
}

function desenharPrevia() {
  const el = $("ff-previa");
  const msg = $("ff-msg");
  const m = montarExpressao();

  /*
   * Valor recusado aparece ENQUANTO se digita, na mesma linha de mensagem que
   * o resto do filtro usa. A marca `validacao` existe para esta função poder
   * apagar só o que ela mesma escreveu: sem ela, ou o erro ficaria pendurado
   * depois de corrigido, ou limpar apagaria o "filtro aplicado: ..." que veio
   * de outro lugar.
   */
  if (m.erro) {
    el.hidden = true;
    msgFiltro(T(m.erro, m.params), "erro");
    msg.dataset.validacao = "1";
    return;
  }
  if (msg.dataset.validacao === "1") {
    msgFiltro("");
    delete msg.dataset.validacao;
  }

  if (m.incompleta) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.textContent = m.expr;
  el.className = "ff-previa" + (m.misturado ? " alerta" : "");
  el.title = m.misturado ? T("UI_PRECEDENCE_HINT") : T("UI_EXPR_TO_APPLY");

  // Toda edição do guiado passa por aqui -- digitar, ligar o fx, trocar campo,
  // acrescentar linha. É o ponto único onde dá para gravar sem espalhar
  // chamadas por seis handlers. O agendarSalvar() é debounced em 400 ms, então
  // digitar não vira uma gravação por tecla.
  agendarSalvar();
}

/** Sugestões seguem o campo da linha que está em foco. */
async function sugestoesPara(campo) {
  const dl = $("ff-sugestoes");
  dl.textContent = "";
  $("ff-parcial").hidden = true;
  if (!campo || !abaAtiva) return;
  try {
    const r = await QDBU.rpc("filter.values", { h: abaAtiva, field: campo });
    for (const v of r.values) dl.appendChild(new Option(v));
    $("ff-parcial").hidden = !r.partial;
  } catch (e) {
    /* sugestão é conveniência; falhar aqui não pode impedir de filtrar */
  }
}

$("ff-condicoes").addEventListener("input", (ev) => {
  const linha = ev.target.closest(".ff-cond");
  if (!linha) return;
  const c = condicoes.find((x) => x.id === Number(linha.dataset.id));
  if (!c) return;

  const campo = ev.target.dataset.campo;
  if (campo === "ativa") c.ativa = ev.target.checked;
  else if (campo === "valor") c.valor = ev.target.value;
  else c[campo] = ev.target.value;

  if (campo === "op") {
    const semValor = SEM_VALOR.includes(c.op);
    linha.querySelector("[data-campo=valor]").hidden = semValor;
    // "está vazio" não compara com nada; deixar o fx aceso ao lado de um campo
    // que sumiu sugeriria que ele ainda vale para alguma coisa.
    linha.querySelector(".ff-fx").hidden = semValor;
  }
  if (campo === "ativa") linha.classList.toggle("inativa", !c.ativa);
  if (campo === "campo") {
    c.valor = "";
    linha.querySelector("[data-campo=valor]").value = "";
    sugestoesPara(c.campo);
  }

  desenharPrevia();
});

$("ff-condicoes").addEventListener("focusin", (ev) => {
  const linha = ev.target.closest(".ff-cond");
  if (!linha || ev.target.dataset.campo !== "valor") return;
  const c = condicoes.find((x) => x.id === Number(linha.dataset.id));
  if (c) sugestoesPara(c.campo);
});

$("ff-condicoes").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-acao]");
  if (!b) return;
  const linha = b.closest(".ff-cond");
  const i = condicoes.findIndex((x) => x.id === Number(linha.dataset.id));

  if (b.dataset.acao === "calc") {
    condicoes[i].calc = !condicoes[i].calc;
    desenharCondicoes();
    // O foco volta para o valor: quem acabou de ligar o fx vai digitar a
    // expressao, e devolver o cursor para o botao obrigaria um Tab a toa.
    const campo = $("ff-condicoes")
      .querySelector('.ff-cond[data-id="' + condicoes[i].id + '"] [data-campo=valor]');
    if (campo) campo.focus();
    return;
  }

  if (b.dataset.acao === "add") {
    condicoes.splice(i + 1, 0, novaCondicao(condicoes[i].campo));
  } else if (condicoes.length > 1) {
    condicoes.splice(i, 1);
  }
  desenharCondicoes();
});

$("ff-condicoes").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && ev.target.dataset.campo === "valor") {
    ev.preventDefault();
    aplicarFiltro();
  }
});

$("ff-add").addEventListener("click", () => {
  const ultimo = condicoes[condicoes.length - 1];
  condicoes.push(novaCondicao(ultimo ? ultimo.campo : ""));
  desenharCondicoes();
});

// ------------------------------------------------------------------- filtro

// DOIS MODOS, e o guiado existe para nao precisar do outro no caso comum.
//
// Escrever `CLI_EST == 'SP'` exige saber o nome do campo, o tipo dele e que
// string vai entre apostrofos. O modo guiado monta isso: escolhe-se campo,
// operador e valor -- e o valor vem de uma lista do que EXISTE no arquivo, que
// e o "Suggested Values" que o autor do video chamou de melhor recurso do
// Navicat. Menos digitacao e, sobretudo, menos filtro que nao casa nada porque
// o acento estava errado.
//
// O modo expressao continua ali para o que o guiado nao alcanca (`.AND.`,
// funcao, campo com campo).

let modoFiltro = "guiado";

/** Contagem filtrada por handle, quando alguem pediu. null = nao se sabe. */
const contagemDe = new Map();

/** Escapa uma string para virar literal xBase. */
function literal(txt) {
  // Apostrofo dentro do valor quebraria o literal; aspas duplas resolvem, e um
  // valor com os dois vira concatenacao de pedacos.
  const t = String(txt);
  if (!t.includes("'")) return "'" + t + "'";
  if (!t.includes('"')) return '"' + t + '"';
  return t.split("'").map((p) => "'" + p + "'").join(" + Chr(39) + ");
}

function expressaoAtual() {
  return modoFiltro === "guiado" ? montarExpressao().expr : $("ff-expr").value.trim();
}

/**
 * A expressão a aplicar, ou null com a recusa já na tela.
 *
 * Existe porque "não deu para montar" tem três causas diferentes e cada uma
 * merece uma frase: falta preencher, o valor não cabe no tipo, ou o modo
 * expressão está vazio. Antes as três viravam "informe o valor", que só está
 * certa numa delas.
 */
function expressaoValidada() {
  if (modoFiltro !== "guiado") {
    const txt = $("ff-expr").value.trim();
    if (!txt) {
      msgFiltro(T("ERROR_PARAM_REQUIRED_expr"), "erro");
      return null;
    }
    return txt;
  }

  const m = montarExpressao();
  if (m.erro) {
    msgFiltro(T(m.erro, m.params), "erro");
    return null;
  }
  if (m.incompleta || !m.expr) {
    msgFiltro(T("ERROR_TELL_VALUE"), "erro");
    return null;
  }
  return m.expr;
}

function msgFiltro(txt, classe) {
  const el = $("ff-msg");
  el.textContent = txt || "";
  el.className = "ff-msg" + (classe ? " " + classe : "");
}

/** Indicador permanente: a grade filtrada nao pode parecer a grade inteira. */
function marcarFiltroAtivo(expr, contagem) {
  const el = $("filtro-ativo");
  const ativo = !!expr;
  el.hidden = !ativo;
  if (!ativo) return;
  el.textContent =
    contagem == null
      ? T("UI_FILTERED_MARK")
      : T("UI_FILTERED_MARK_N", { n: contagem });
  el.title = expr;
}

async function aplicarFiltro() {
  const expr = expressaoValidada();
  if (!expr) return;
  try {
    const r = await QDBU.rpc("filter.set", { h: abaAtiva, expr: expr });
    const aba = abas.find((a) => a.h === abaAtiva);
    if (aba && aba.info) aba.info.filter = r.filter;

    // A contagem anterior era de OUTRO filtro. Apagar e melhor que exibir um
    // numero que nao corresponde ao que esta na tela.
    contagemDe.delete(abaAtiva);

    // Misturar E com OU nao e erro -- mas quase nunca e o que a pessoa quis
    // dizer sem perceber a precedencia. Avisa uma vez, apontando a previa.
    const mist = modoFiltro === "guiado" && montarExpressao().misturado;
    msgFiltro(
      r.warning ||
        (mist
          ? T("INFO_FILTER_APPLIED")
          : T("INFO_FILTER_ACTIVE", { expr: r.filter })),
      r.warning || mist ? "aviso" : "ok"
    );
    marcarFiltroAtivo(r.filter, null);
    agendarSalvar();
    await carregarPagina(abaAtiva, "top", 0);
  } catch (e) {
    msgFiltro(msgErro(e), sevErro(e));
  }
}

async function limparFiltro() {
  try {
    const r = await QDBU.rpc("filter.clear", { h: abaAtiva });
    const aba = abas.find((a) => a.h === abaAtiva);
    if (aba && aba.info) aba.info.filter = "";
    contagemDe.delete(abaAtiva);
    msgFiltro("");
    marcarFiltroAtivo("", null);
    const cols = colunasDe.get(abaAtiva) || [];
    usarCondicoes([novaCondicao(cols[0] ? cols[0].name : "")]);
    desenharCondicoes();
    $("ff-expr").value = "";
    agendarSalvar();
    await carregarPagina(abaAtiva, "top", 0);
  } catch (e) {
    msgFiltro(msgErro(e), sevErro(e));
  }
}

async function conferirFiltro() {
  const expr = expressaoValidada();
  if (!expr) return;
  try {
    const r = await QDBU.rpc("expr.check", { h: abaAtiva, expr: expr, expect: "L" });
    if (!r.compiles) {
      msgFiltro(T("UI_EXPR_RESULT", { expr: expr, value: r.error }), "erro");
    } else if (!r.typeOk) {
      msgFiltro(T("ERROR_EXPR_RETURNS", { expr: expr, type: window.I.tipo(r.type) }), "erro");
    } else if (r.warning) {
      msgFiltro(T("UI_EXPR_RESULT", { expr: expr, value: r.warning }), "aviso");
    } else {
      msgFiltro(T("INFO_EXPR_OK", { expr: expr }), "ok");
    }
  } catch (e) {
    msgFiltro(msgErro(e), sevErro(e));
  }
}

async function contarFiltro() {
  msgFiltro(T("UI_COUNTING"));
  try {
    const r = await comProgresso(QDBU.rpc("filter.count", { h: abaAtiva }));
    if (r.partial) {
      // Contagem interrompida NAO vira número na barra: "142.000 filtrados"
      // sobre uma contagem que parou no meio seria um dado errado com cara de
      // certo. A barra volta para "?" e a mensagem explica.
      contagemDe.delete(abaAtiva);
      msgFiltro(T("WARN_COUNT_STOPPED", { n: r.count }), "aviso");
      marcarFiltroAtivo(r.filter, null);
    } else {
      msgFiltro(T("INFO_COUNT_RESULT", { n: r.count, total: r.records }), "ok");
      marcarFiltroAtivo(r.filter, r.count);
      contagemDe.set(abaAtiva, r.count);
    }
    desenharGrade();
  } catch (e) {
    // TOO_LARGE nao e falha: e a resposta honesta de que contar travaria a UI.
    msgFiltro(msgErro(e), sevErro(e));
  }
}

/** Enche o combo de campos e puxa as sugestões do campo escolhido. */
async function prepararFiltro() {
  if (!colunasDe.has(abaAtiva)) await carregarColunas(abaAtiva);
  const campos = colunasDe.get(abaAtiva) || [];

  // Guardadas ganham de tudo. Na primeira vez neste arquivo, herda o que estava
  // montado -- só as condições cujo campo existe aqui, e em CÓPIA, senão duas
  // abas passariam a editar o mesmo objeto.
  // Primeira vez que o painel abre neste arquivo nesta sessão: se há condições
  // guardadas em disco, elas viram as da tela -- agora que os campos são
  // conhecidos e dá para conferir cada uma.
  if (!condicoesDe.has(abaAtiva)) {
    const abaAgora = abas.find((a) => a.h === abaAtiva);
    const cru = abaAgora && condicoesDoDisco.get(chaveCaminho(abaAgora.caminho));
    if (cru && cru.length) {
      const existem = new Set(campos.map((f) => f.name));
      const limpas = cru.map((c) => condicaoDoDisco(c, existem)).filter(Boolean);
      if (limpas.length) condicoesDe.set(abaAtiva, limpas);
    }
  }

  const guardadas = condicoesDe.get(abaAtiva);
  const herdadas = guardadas
    ? guardadas.filter((c) => campos.some((f) => f.name === c.campo))
    : condicoes
        .filter((c) => campos.some((f) => f.name === c.campo))
        .map((c) => Object.assign({}, c, { id: ++seqCond }));

  usarCondicoes(
    herdadas.length ? herdadas : [novaCondicao(campos.length ? campos[0].name : "")]
  );

  const aba = abas.find((a) => a.h === abaAtiva);
  const atual = (aba && aba.info && aba.info.filter) || "";
  marcarFiltroAtivo(atual, null);
  if (atual && !$("ff-expr").value) $("ff-expr").value = atual;

  desenharCondicoes();
  await sugestoesPara(condicoes[0].campo);
}

function faixaFiltro(aberta) {
  $("faixa-filtro").hidden = !aberta;
  $("pg-filtro").classList.toggle("ativo", aberta);
}

// --------------------------------------------------------------- eventos

$("pg-filtro").addEventListener("click", async () => {
  if ($("faixa-filtro").hidden) {
    if (!abaAtiva) return;
    faixaFiltro(true);
    await prepararFiltro();
    // O campo de valor e criado por desenharCondicoes(): buscar pelo id fixo
    // deixaria uma referencia orfa como as que ja quebraram a arvore antes.
    const primeiro = document.querySelector("#ff-condicoes [data-campo=valor]");
    if (primeiro) primeiro.focus();
  } else {
    faixaFiltro(false);
  }
});

$("ff-fechar").addEventListener("click", () => faixaFiltro(false));
$("ff-aplicar").addEventListener("click", aplicarFiltro);
$("ff-limpar").addEventListener("click", limparFiltro);
$("ff-check").addEventListener("click", conferirFiltro);
$("ff-contar").addEventListener("click", contarFiltro);

for (const r of document.querySelectorAll("input[name=ff-modo]")) {
  r.addEventListener("change", (ev) => {
    modoFiltro = ev.target.value;
    $("ff-guiado").hidden = modoFiltro !== "guiado";
    $("ff-texto").hidden = modoFiltro !== "texto";
    // Leva o que estava montado para o modo texto: quem troca de modo quer
    // continuar dali, nao recomecar.
    if (modoFiltro === "texto" && !$("ff-expr").value) {
      $("ff-expr").value = montarExpressao().expr;
    }
    msgFiltro("");
  });
}

// Enter aplica no modo expressao (o guiado trata dentro de ff-condicoes).
$("ff-expr").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    aplicarFiltro();
  }
});


// ---------------------------------------------------------- busca na grade

// DUAS BUSCAS DIFERENTES atrás do mesmo campo, e a diferença é de custo:
//
//   com índice ativo -> data.seek na chave. É instantâneo (o NTX é uma árvore),
//                       então dá para buscar A CADA TECLA, como o "ir para" do
//                       DBU original.
//
//   sem índice       -> data.locate, que percorre. Varrer 421 mil registros a
//                       cada tecla congelaria a UI, então só no Enter.
//
// O placeholder diz qual está valendo, senão o campo se comportaria de dois
// jeitos sem explicação.

let ultimaBusca = "";

/* Registro da última ocorrência, por handle. Sem guardar, "próxima" partiria de
   onde data.page deixou o cursor -- o fim do bloco visível -- e pularia o resto
   da página inteira. */
const ultimoAchado = new Map();

/** Ajusta o campo ao que existe: chave do índice, ou varredura. */
function ajustarBusca() {
  const el = $("pg-buscar");
  const ordens = ordensDaAba(abaAtiva);
  const ativa = ordens.find((o) => o.active);

  if (ativa) {
    el.placeholder = T("UI_SEEK_BY_INDEX", { key: ativa.key });
    el.title = T("UI_SEEK_BY_INDEX_TITLE", { key: ativa.name });
  } else {
    el.placeholder = T("UI_SCAN_SEARCH");
    el.title = T("UI_SCAN_SEARCH_TITLE");
  }
}

/** Vai para o registro e reancora a página nele. */
async function irParaRegistro(recno, msg) {
  await carregarPagina(abaAtiva, recno, 0);
  desenharGrade();
  if (msg) hint(msg);
}

/** Busca por índice — a cada tecla, porque o NTX responde na hora. */
async function buscarPorIndice(texto) {
  if (!texto) return;
  try {
    const r = await QDBU.rpc("data.seek", { h: abaAtiva, value: texto, soft: true });
    if (!r.found) {
      hint(T("ERROR_NOTHING_FROM", { value: texto }));
      return;
    }
    // `near` é o soft seek fazendo o trabalho: parou no próximo maior. Dizer
    // isso evita a conclusão de que o valor existe exatamente como digitado.
    await irParaRegistro(r.recno, r.near ? T("INFO_APPROXIMATE", { value: texto }) : "");
  } catch (e) {
    hint(msgErro(e));
  }
}

/**
 * Busca sem índice: procura o texto em todas as colunas de texto VISÍVEIS.
 *
 * Só nas visíveis de propósito: achar num campo que não está na tela deixaria o
 * cursor numa linha sem nada destacado, e a pessoa não entenderia por que ali.
 */
function expressaoDeBusca(texto) {
  const cols = (paginaDaAba(abaAtiva) || {}).cols || [];
  const alvos = cols.filter((c) => c.type === "C").map((c) => c.name);
  if (!alvos.length) return "";

  const lit = literal(texto.toUpperCase());
  return alvos.map((c) => lit + " $ Upper(" + c + ")").join(" .OR. ");
}

async function buscarPorVarredura(texto, doTopo) {
  const expr = expressaoDeBusca(texto);
  if (!expr) {
    hint(T("ERROR_NO_TEXT_COLUMN"));
    return;
  }

  hint(T("UI_SEARCHING"));
  try {
    const anterior = ultimoAchado.get(abaAtiva);
    const r = await comProgresso(
      QDBU.rpc("data.locate", {
        h: abaAtiva,
        expr: expr,
        from: doTopo || !anterior ? "top" : String(anterior),
      })
    );

    if (r.found) {
      ultimoAchado.set(abaAtiva, r.recno);
      await irParaRegistro(r.recno, T("INFO_FOUND_SCANNED", { n: r.scanned }));
    } else if (r.canceled) {
      // Parou porque alguém mandou parar, não porque não existe: dizer a
      // diferença evita o "não tem" sobre um arquivo que nem foi todo lido.
      // A DLL nao manda mais frase pronta: `canceled` + `scanned` bastam, e a
      // frase se monta no idioma da tela. Ver Api_Data_Locate em api_data.prg.
      hint(T("WARN_SEARCH_CANCELED", { n: r.scanned }));
    } else {
      hint(T("ERROR_NOT_FOUND", { value: texto }));
    }
  } catch (e) {
    hint(msgErro(e));
  }
}

/** Uma entrada só; o caminho depende de haver índice. */
async function buscar(texto, doTopo) {
  if (!abaAtiva || !texto) return;
  const temIndice = ordensDaAba(abaAtiva).some((o) => o.active);
  if (temIndice) await buscarPorIndice(texto);
  else await buscarPorVarredura(texto, doTopo);
}

// ------------------------------------------------------------- eventos

$("pg-buscar").addEventListener("input", (ev) => {
  const texto = ev.target.value.trim();
  if (texto !== ultimaBusca) ultimoAchado.delete(abaAtiva);
  ultimaBusca = texto;

  // Incremental só com índice. Sem ele cada tecla seria uma varredura.
  if (!ordensDaAba(abaAtiva).some((o) => o.active)) return;
  buscar(texto, false);
});

$("pg-buscar").addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  const texto = ev.target.value.trim();
  if (texto !== ultimaBusca) ultimoAchado.delete(abaAtiva);
  ultimaBusca = texto;
  // Enter no modo varredura começa do topo; repetir procura a partir daqui.
  buscar(texto, !ev.shiftKey && !ordensDaAba(abaAtiva).some((o) => o.active));
});

$("pg-proximo").addEventListener("click", () => buscar(ultimaBusca, false));

document.addEventListener("keydown", (ev) => {
  if (ev.key !== "F3" || !abaAtiva) return;
  ev.preventDefault();
  if (ultimaBusca) buscar(ultimaBusca, false);
  else $("pg-buscar").focus();
});


// ------------------------------------------------------------------ tarefa

// Barra de progresso de tarefa longa.
//
// O caminho é todo por FORA da fila de RPC, e isso é o desenho inteiro:
//
//   Harbour  Dbu_Progress()  escreve em memória C (src/bridge/progress.c)
//   Rust     HbProgressGet() lê essa memória sem tocar a VM
//   Tauri    comando async, para não bloquear a thread do IPC
//   JS       pergunta a cada 120ms enquanto a chamada não voltou
//
// Se qualquer um desses quatro passasse pela fila, o progresso só chegaria
// depois da tarefa terminar -- que foi exatamente o que aconteceu nas duas
// primeiras tentativas, uma por causa de um Mutex no Rust e outra porque um
// comando síncrono do Tauri bloqueia o IPC inteiro.

const PULSO_TAREFA = 120;

let vigiaTarefa = null;

/*
 * O rótulo da barra de tarefa.
 *
 * O Harbour manda `{"c":"UI_JOB_EXPORTING","f":"NETCLI.csv"}` — código e nome
 * do arquivo, não a frase pronta. Ver src/util/job.prg: a barra de tarefa era o
 * último lugar do app com texto de usuário nascendo na DLL, e o auditor de i18n
 * não a pegava porque a frase chega como DADO, não como chave.
 *
 * Rótulo que não seja esse JSON é exibido cru. É o que permitiu trocar os sete
 * pontos de chamada um a um sem a barra ficar em branco no meio do caminho — e
 * é o que protege se algum dia um rótulo passar por aqui sem código.
 */
function rotuloDaTarefa(bruto) {
  if (!bruto) return T("UI_JOB_WORKING");
  try {
    const m = JSON.parse(bruto);
    if (m && m.c) return T(m.c, m.f ? { file: m.f } : undefined);
  } catch (e) {
    // não é JSON: é rótulo cru, mostra como veio
  }
  return bruto;
}

function mostrarTarefa(a) {
  const cx = $("tarefa");
  if (!a || !a.ativo) {
    cx.hidden = true;
    return;
  }

  cx.hidden = false;
  $("tf-msg").textContent = rotuloDaTarefa(a.mensagem);

  const barra = cx.querySelector(".tf-barra");
  const temTotal = a.total > 0;
  barra.classList.toggle("indeterminada", !temTotal);

  if (temTotal) {
    const pct = Math.min(100, Math.round((a.atual / a.total) * 100));
    $("tf-cheia").style.width = pct + "%";
    $("tf-num").textContent =
      a.atual.toLocaleString(window.I.idioma()) + " / " + a.total.toLocaleString(window.I.idioma()) +
      "  " + pct + "%";
  } else {
    $("tf-num").textContent = a.atual ? a.atual.toLocaleString(window.I.idioma()) : "";
  }
}

/**
 * Acompanha uma chamada longa: liga a barra, pergunta o andamento em paralelo e
 * desliga no fim -- inclusive se a chamada falhar.
 */
async function comProgresso(promessa) {
  if (vigiaTarefa) clearInterval(vigiaTarefa);

  const inv = (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) || null;
  if (!inv) return promessa; // sem Tauri (teste isolado): só executa

  let ocupado = false;
  vigiaTarefa = setInterval(async () => {
    // Uma consulta por vez: se a anterior ainda não voltou, pular evita
    // empilhar pedidos e piorar justamente o que se quer medir.
    if (ocupado) return;
    ocupado = true;
    try {
      mostrarTarefa(await inv("andamento"));
    } catch (e) {
      /* barra é acessório: nunca pode derrubar a operação */
    }
    ocupado = false;
  }, PULSO_TAREFA);

  try {
    return await promessa;
  } finally {
    clearInterval(vigiaTarefa);
    vigiaTarefa = null;
    $("tarefa").hidden = true;
  }
}

$("tf-parar").addEventListener("click", async () => {
  const inv = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if (!inv) return;
  $("tf-msg").textContent = T("UI_STOPPING");
  try {
    await inv("cancelar");
  } catch (e) {
    hint(msgErro(e));
  }
});


// ------------------------------------------------------- criar indice (T11)

// Fica no painel de índices, embutido — não num diálogo. A lista dos índices
// que já existem é justamente a informação que evita criar um igual ao que está
// ali do lado.
//
// O destino sai da pasta do DBF por padrão. Guardar o índice em outro lugar é
// possível (a API aceita caminho completo), mas o padrão é ao lado do arquivo,
// que é onde todo o resto do mundo xBase procura.

function pastaDoArquivoAtivo() {
  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba) return "";
  const SEP = String.fromCharCode(92);
  const p = aba.caminho.split(SEP).join("/");
  return p.slice(0, p.lastIndexOf("/") + 1);
}

function atualizarDestino() {
  const nome = $("pi-arquivo").value.trim();
  const dest = $("pi-destino");
  if (!nome) {
    dest.textContent = "";
    return;
  }
  // Mostrar o caminho inteiro antes de criar: um índice gravado na pasta errada
  // não dá erro nenhum -- ele só não é achado depois.
  const completo = ehCaminho(nome) ? nome : pastaDoArquivoAtivo() + nome;
  dest.textContent = paraExibir(completo + (/\.[a-z]+$/i.test(completo) ? "" : ".ntx"));
}

function msgIndice(txt, classe) {
  const el = $("pi-msg");
  el.textContent = txt || "";
  el.className = "ff-msg" + (classe ? " " + classe : "");
}

function formIndice(aberto) {
  $("pi-form").hidden = !aberto;
  if (!aberto) return;
  msgIndice("");
  atualizarDestino();
  $("pi-chave").focus();
}

/** Confere chave e FOR sem criar nada — o mesmo `Check` do filtro. */
async function conferirIndice() {
  const chave = $("pi-chave").value.trim();
  if (!chave) {
    msgIndice(T("ERROR_TELL_KEY"), "erro");
    return false;
  }

  try {
    const k = await QDBU.rpc("expr.check", { h: abaAtiva, expr: chave });
    if (!k.compiles) {
      msgIndice(T("ERROR_EXPR_INVALID", { detail: k.error }), "erro");
      return false;
    }
    if (k.evaluated && !"CND".includes(k.type)) {
      msgIndice(T("ERROR_INDEX_KEY_BAD_TYPE", { type: window.I.tipo(k.type) }), "erro");
      return false;
    }

    const cond = $("pi-for").value.trim();
    if (cond) {
      const c = await QDBU.rpc("expr.check", { h: abaAtiva, expr: cond, expect: "L" });
      if (!c.compiles) {
        msgIndice(T("ERROR_EXPR_INVALID", { detail: c.error }), "erro");
        return false;
      }
      if (!c.typeOk) {
        msgIndice(T("ERROR_EXPR_NOT_LOGICAL_for", { type: window.I.tipo(c.type) }), "erro");
        return false;
      }
    }

    msgIndice(
      T("INFO_KEY_OK", {
        type: k.type ? window.I.tipo(k.type) : T("UI_EVALUATED_FIRST_RECORD"),
      }),
      "ok"
    );
    return true;
  } catch (e) {
    msgIndice(msgErro(e), sevErro(e));
    return false;
  }
}

async function criarIndice() {
  if (!(await conferirIndice())) return;

  const nome = $("pi-arquivo").value.trim();
  if (!nome) {
    msgIndice(T("ERROR_TELL_FILE_NAME"), "erro");
    return;
  }

  const caminho = ehCaminho(nome) ? nome : pastaDoArquivoAtivo() + nome;
  const corpo = {
    h: abaAtiva,
    path: caminho,
    key: $("pi-chave").value.trim(),
    unique: $("pi-unico").checked,
  };
  const cond = $("pi-for").value.trim();
  if (cond) corpo.for = cond;

  msgIndice(T("UI_CREATING"));
  try {
    const r = await comProgresso(QDBU.rpc("index.create", corpo));
    await aposMexerNoIndice(abaAtiva, r);
    formIndice(false);
    hint(T("INFO_INDEX_CREATED", { order: r.order, key: r.orderKey }));
  } catch (e) {
    // FILE_EXISTS não é falha do usuário: é a pergunta "sobrescrevo?", e ela
    // precisa ser feita, não assumida.
    if (e.codigo === "ERROR_FILE_EXISTS") {
      if (window.confirm(T("UI_CONFIRM_OVERWRITE", { file: nome }))) {
        corpo.replace = true;
        try {
          const r = await comProgresso(QDBU.rpc("index.create", corpo));
          await aposMexerNoIndice(abaAtiva, r);
          formIndice(false);
          hint(T("INFO_INDEX_REBUILT", { order: r.order, key: r.orderKey }));
          return;
        } catch (e2) {
          msgIndice(msgErro(e2), sevErro(e2));
          return;
        }
      }
      msgIndice(T("ERROR_INDEX_NOT_CREATED"), "aviso");
      return;
    }
    // A cor sai do prefixo do codigo: WARN_CANCELED_INDEX pinta de amarelo
    // sozinho, sem esta linha precisar conhecer o codigo. Ver src/util/err.prg.
    msgIndice(msgErro(e), sevErro(e));
  }
}

$("pi-novo").addEventListener("click", () => formIndice($("pi-form").hidden));
$("pi-cancelar-form").addEventListener("click", () => formIndice(false));
$("pi-conferir").addEventListener("click", conferirIndice);
$("pi-arquivo").addEventListener("input", atualizarDestino);

$("pi-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  criarIndice();
});

// Sugere um nome a partir da chave: quem digita `CLI_NOME` quase sempre quer um
// arquivo chamado assim, e digitar o mesmo duas vezes é onde nasce a divergência.
$("pi-chave").addEventListener("blur", () => {
  if ($("pi-arquivo").value.trim()) return;
  const k = $("pi-chave").value.trim().replace(/[^A-Za-z0-9_]/g, "").slice(0, 8);
  if (k) {
    $("pi-arquivo").value = k.toUpperCase() + ".ntx";
    atualizarDestino();
  }
});


// ---------------------------------------------------------------- exportar

// O diálogo NÃO fecha ao concluir. É o antipadrão F dos requisitos, e o autor do
// vídeo do Navicat foi explícito: "posso ter errado o formato, aí volto,
// corrijo e exporto de novo". Fechar obrigaria a remontar formato, destino,
// colunas e escopo — tudo de novo, por causa de um separador errado.
//
// A defesa contra errar é a PRÉVIA: as primeiras linhas exatamente como vão
// sair. Separador errado e encoding errado aparecem ali, antes de escrever
// 400 mil linhas.

let colsExport = []; // [{name,type,len,dec,marcada}]
let buscaColExport = "";

/**
 * As colunas que a busca deixa ver.
 *
 * Os botoes agem SOBRE ESTA LISTA, nao sobre as 122. Buscar "CLI_TEL", achar
 * tres e clicar em "Todas" tem de marcar essas tres -- marcar o arquivo inteiro
 * seria o oposto do que a busca acabou de pedir. Sem busca, a lista e o total e
 * o comportamento e o obvio.
 */
function colsFiltradas() {
  const b = buscaColExport.toLowerCase();
  return b ? colsExport.filter((c) => c.name.toLowerCase().includes(b)) : colsExport;
}

function ehCsv() {
  return $("ex-formato").value === "csv";
}

function extensaoAtual() {
  return $("ex-formato").value;
}

/**
 * Mostra as opcoes do formato escolhido, e so elas.
 *
 * JSON nao tem nenhuma -- e UTF-8 por definicao e nao tem separador -- entao o
 * grupo inteiro some. Deixar campos desabilitados na tela faria o usuario
 * procurar o que mudar neles.
 */
function opcoesDoFormato() {
  const fmt = extensaoAtual();
  const titulos = {
    csv: "UI_CSV_OPTIONS", xlsx: "UI_XLSX_OPTIONS",
    dbf: "UI_DBF_OPTIONS", json: "",
  };

  $("ex-so-csv").hidden = fmt !== "csv";
  $("ex-so-xlsx").hidden = fmt !== "xlsx";
  $("ex-so-dbf").hidden = fmt !== "dbf";
  $("ex-opcoes-formato").hidden = fmt === "json";
  $("ex-opcoes-titulo").textContent = titulos[fmt] ? T(titulos[fmt]) : "";
}

/** Troca a extensão do nome quando o formato muda, sem perder o que foi digitado. */
function ajustarExtensao() {
  const el = $("ex-arquivo");
  const v = el.value.trim();
  if (v) el.value = v.replace(/\.(csv|json|xlsx|dbf)$/i, "") + "." + extensaoAtual();
  opcoesDoFormato();
  atualizarDestinoExport();
}

function atualizarDestinoExport() {
  const nome = $("ex-arquivo").value.trim();
  const el = $("ex-destino");
  if (!nome) {
    el.textContent = "";
    return;
  }
  // Caminho completo à vista ANTES de gravar: um arquivo na pasta errada não dá
  // erro nenhum — só não é achado depois. Mesma razão do pi-destino da T11.
  el.textContent = paraExibir(ehCaminho(nome) ? nome : pastaDoArquivoAtivo() + nome);
}

function marcadas() {
  return colsExport.filter((c) => c.marcada).map((c) => c.name);
}

function desenharColsExport() {
  const ul = $("ex-lista");
  const lista = colsFiltradas();
  ul.textContent = "";

  // Diz sobre o que os botoes vao agir. Sem este aviso, "Todas" com busca ativa
  // pareceria ter marcado o arquivo inteiro.
  const filtrando = lista.length !== colsExport.length;
  $("ex-escopo-botoes").textContent = filtrando
    ? T("UI_ACT_ON_FILTERED", { n: lista.length })
    : "";

  for (const c of lista) {
    const li = elemento("li", "ex-item" + (c.marcada ? "" : " off"));
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = c.marcada;
    cb.dataset.campo = c.name;
    li.appendChild(cb);
    li.appendChild(elemento("label", "ex-nome", c.name));
    li.appendChild(elemento("span", "ex-tipo", c.type + c.len + (c.dec ? "," + c.dec : "")));
    ul.appendChild(li);
  }
  if (!lista.length) {
    ul.appendChild(elemento("li", "pc-vazio", T("ERROR_NO_COLUMN_NAMED")));
  }

  // O contador é o que impede o erro caro dos dois lados: exportar 122 quando
  // se vê 3, ou 3 quando se queria 122.
  $("ex-conta").textContent = marcadas().length + " de " + colsExport.length;
}

/** Monta o corpo do pedido, igual para prévia e gravação. */
function corpoExport(caminho) {
  const c = {
    h: abaAtiva,
    path: caminho,
    scope: $("ex-escopo").value,
    fields: marcadas(),
    skipDeleted: $("ex-sem-deletados").checked,
    timestamp: $("ex-stamp").checked,
    replace: true,
  };
  if (ehCsv()) {
    c.delimiter = $("ex-sep").value;
    c.encoding = $("ex-cdp").value;
    c.header = $("ex-cab").value === "1";
  } else if (extensaoAtual() === "xlsx") {
    c.sheet = $("ex-aba").value.trim() || "Dados";
  }
  return c;
}

/**
 * Prévia: exporta de verdade para um arquivo temporário e mostra o começo dele.
 *
 * Simular a formatação no JS daria uma prévia que concorda com o JS e não com o
 * que a DLL escreve — e o erro que se quer pegar é justamente a diferença entre
 * os dois. Exportar de verdade custa alguns milissegundos e não mente.
 */
async function previaExport() {
  if (!colsExport.length) return;
  if (!marcadas().length) {
    msgExport(T("ERROR_PICK_ONE_COLUMN"), "erro");
    return;
  }

  $("ex-amostra").textContent = T("UI_GENERATING");
  try {
    const corpo = corpoExport("preview." + extensaoAtual());
    corpo.timestamp = false;
    corpo.preview = 5;
    const r = await QDBU.rpc("export.preview", corpo);
    $("ex-amostra").textContent = r.sample || T("UI_EMPTY_FILE_PREVIEW");
    // records < 0 significa "nao sei": com filtro ativo, saber exigiria
    // percorrer o arquivo, e a previa nao pode custar isso num arquivo de um
    // milhao de linhas. Mostrar o -1 cru seria pior que nao mostrar nada.
    $("ex-quantos").textContent =
      r.records < 0
        ? T("UI_EXPORT_UNKNOWN_SCOPE")
        : T("UI_WILL_EXPORT", { n: r.records });
    msgExport("");
  } catch (e) {
    $("ex-amostra").textContent = "";
    msgExport(msgErro(e), sevErro(e));
  }
}

function msgExport(txt, classe) {
  const el = $("ex-msg");
  el.textContent = txt || "";
  // Remove e recoloca a classe: sem isto, exportar duas vezes seguidas nao
  // reinicia a animacao e a segunda mensagem aparece sem nenhum sinal de que
  // e nova -- justamente o problema que a faixa veio resolver.
  el.className = "ff-msg";
  if (classe) {
    void el.offsetWidth;
    el.className = "ff-msg " + classe;
  }
}

async function abrirExport() {
  if (!abaAtiva) return;
  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba) return;

  if (!colunasDe.has(abaAtiva)) await carregarColunas(abaAtiva);
  const campos = colunasDe.get(abaAtiva) || [];

  // Vem marcado com as VISÍVEIS — o que está na tela. Quem escolheu 3 de 122
  // fez isso de propósito; receber 122 ignoraria a decisão.
  colsExport = campos.map((c) => ({
    name: c.name, type: c.type, len: c.len, dec: c.dec, marcada: c.visible,
  }));

  // O combo "filtrados x todos" so existe se HOUVER filtro: sem ele as duas
  // opcoes fazem a mesma coisa, e um combo cujas escolhas nao mudam nada e
  // ruido que faz o usuario procurar diferenca onde nao ha.
  const temFiltro = !!(aba.info && aba.info.filter);
  const expr = temFiltro ? aba.info.filter : "";
  $("ex-escopo-campo").hidden = !temFiltro;
  // Sem filtro a linha fica sem nenhum campo -- esconder a div evita um vao
  // vazio no meio do dialogo.
  $("ex-linha-registros").hidden = !temFiltro;

  // A expressao vai no TOOLTIP, nao na tela: um filtro com varias condicoes
  // ocuparia linhas e empurraria o dialogo. Quem precisa conferir passa o
  // mouse -- mesmo padrao do caminho da conexao na arvore.
  const sel = $("ex-escopo");
  sel.textContent = "";
  sel.appendChild(new Option(T("UI_SCOPE_FILTERED"), "filtered"));
  sel.appendChild(new Option(T("UI_SCOPE_ALL"), "all"));
  sel.value = "filtered";
  sel.title = temFiltro ? T("UI_FILTER_IN_FORCE") + String.fromCharCode(10) + expr : "";
  $("ex-escopo-campo").title = sel.title;

  // O nome do arquivo no titulo: com dez abas abertas, "Exportar" sozinho nao
  // diz de qual delas -- e exportar a tabela errada e um erro que so aparece
  // depois, quando alguem abre o arquivo.
  $("ex-titulo-arq").textContent = aba.info ? aba.info.file : (aba.alias || "");

  const base = (aba.alias || "export").replace(/[^A-Za-z0-9_]/g, "");
  $("ex-arquivo").value = base + "." + extensaoAtual();
  opcoesDoFormato();
  $("ex-amostra").textContent = "";
  $("ex-quantos").textContent = "";
  buscaColExport = "";
  $("ex-busca").value = "";
  msgExport("");
  desenharColsExport();
  atualizarDestinoExport();

  $("dlg-export").showModal();
  previaExport();
}

async function gravarExport() {
  const nome = $("ex-arquivo").value.trim();
  if (!nome) {
    msgExport(T("ERROR_TELL_FILE_NAME"), "erro");
    return;
  }
  if (!marcadas().length) {
    msgExport(T("ERROR_PICK_ONE_COLUMN"), "erro");
    return;
  }

  const caminho = ehCaminho(nome) ? nome : pastaDoArquivoAtivo() + nome;
  const metodo = "export." + extensaoAtual();

  msgExport(T("UI_EXPORTING"));
  try {
    const r = await comProgresso(QDBU.rpc(metodo, corpoExport(caminho)));
    const mb = r.size > 1048576
      ? (r.size / 1048576).toFixed(1) + " MB"
      : Math.round(r.size / 1024) + " KB";

    // Hora na mensagem: o diálogo NÃO fecha, então a mesma tela pode acumular
    // várias exportações. Sem a hora, a segunda mensagem é indistinguível da
    // primeira e não dá para saber se o clique surtiu efeito.
    const hora = new Date().toLocaleTimeString(window.I.idioma());
    msgExport(
      T("INFO_EXPORT_DONE", { n: r.records, time: hora, file: r.file, size: mb }) +
        // Espaco, e nao " · ": as duas agora sao FRASES, cada uma com o proprio
        // ponto. Um separador grafico entre duas frases pontuadas fica estranho.
        (r.skipped ? " " + T("INFO_EXPORT_SKIPPED", { n: r.skipped }) : ""),
      "ok"
    );
    // Fica aberto de propósito: ver o resultado e poder exportar outro formato
    // sem remontar nada.
    hint(T("INFO_EXPORTED_TO", { file: paraExibir(r.path) }));

    // O arquivo novo pode ter caido numa pasta que a arvore mostra. Sem
    // recarregar, ele so apareceria no proximo reinicio -- e o usuario iria
    // procurar no Explorer algo que o app acabou de criar.
    const con = conexaoDoCaminho(r.path);
    if (con && arquivosDe.has(con.name)) {
      await abrirConexao(con.name);
    }
  } catch (e) {
    msgExport(msgErro(e), sevErro(e));
  }
}

// ------------------------------------------------------------- eventos

/**
 * "Save As..." do sistema operacional.
 *
 * Digitar caminho a mao e o jeito mais facil de gravar na pasta errada -- e um
 * caminho errado nao da erro nenhum, so nao e achado depois. O diálogo nativo
 * ainda resolve o que a UI nao tem como saber: quais pastas existem, o que ja
 * esta la, e onde o usuario costuma salvar.
 *
 * Chamado por `invoke("plugin:dialog|save")` e nao pelo pacote npm: o frontend
 * deste projeto e HTML/JS estatico, sem Node e sem bundler (ver o guia do projeto).
 */
async function escolherDestino() {
  const inv = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if (!inv) {
    msgExport(T("ERROR_DIALOG_UNAVAILABLE"), "aviso");
    return;
  }

  const fmt = extensaoAtual();
  const nomes = {
    csv:  { name: T("UI_FT_CSV"),  extensions: ["csv"] },
    json: { name: T("UI_FT_JSON"), extensions: ["json"] },
    xlsx: { name: T("UI_FT_XLSX"), extensions: ["xlsx"] },
    dbf:  { name: T("UI_FT_DBF"),  extensions: ["dbf"] },
  };

  const atual = $("ex-arquivo").value.trim();
  const soNome = atual.split("/").pop().split(SEP_BARRA).pop() || "export." + fmt;

  try {
    const escolhido = await inv("plugin:dialog|save", {
      options: {
        title: T("UI_SAVE_DIALOG_TITLE"),
        defaultPath: ehCaminho(atual) ? atual : pastaDoArquivoAtivo() + soNome,
        filters: [nomes[fmt], { name: T("UI_FT_ALL"), extensions: ["*"] }],
      },
    });

    // Cancelar no diálogo do sistema volta null -- e cancelar, não erro.
    if (!escolhido) return;

    $("ex-arquivo").value = escolhido;
    atualizarDestinoExport();

    // O usuário pode ter escolhido outra extensão na janela do sistema; o
    // formato segue o arquivo, senão gravaríamos CSV com nome .xlsx.
    const ext = (escolhido.match(/[.]([a-z]+)$/i) || [])[1];
    if (ext && ["csv", "json", "xlsx", "dbf"].includes(ext.toLowerCase())) {
      $("ex-formato").value = ext.toLowerCase();
      opcoesDoFormato();
    }
    previaExport();
  } catch (e) {
    msgExport(T("ERROR_DIALOG_FAILED", { detail: e.message || e }), "erro");
  }
}

$("ex-procurar").addEventListener("click", escolherDestino);
$("pg-exportar").addEventListener("click", abrirExport);
$("ex-fechar").addEventListener("click", () => $("dlg-export").close());
$("ex-atualizar").addEventListener("click", previaExport);

$("form-export").addEventListener("submit", (ev) => {
  ev.preventDefault();
  gravarExport();
});

$("ex-formato").addEventListener("change", () => {
  ajustarExtensao();
  previaExport();
});
$("ex-arquivo").addEventListener("input", atualizarDestinoExport);

for (const id of ["ex-escopo", "ex-sep", "ex-cdp", "ex-cab", "ex-sem-deletados", "ex-aba"]) {
  $(id).addEventListener("change", previaExport);
}

$("ex-lista").addEventListener("change", (ev) => {
  const cb = ev.target.closest("input[type=checkbox]");
  if (!cb) return;
  const c = colsExport.find((x) => x.name === cb.dataset.campo);
  if (c) c.marcada = cb.checked;
  desenharColsExport();
  previaExport();
});

/** Aplica uma decisao as colunas que a busca deixa ver. */
function marcarFiltradas(fn) {
  colsFiltradas().forEach(fn);
  desenharColsExport();
  previaExport();
}

$("ex-todas").addEventListener("click", () => marcarFiltradas((c) => (c.marcada = true)));
$("ex-nenhuma").addEventListener("click", () => marcarFiltradas((c) => (c.marcada = false)));
$("ex-inverter").addEventListener("click", () => marcarFiltradas((c) => (c.marcada = !c.marcada)));

$("ex-busca").addEventListener("input", (ev) => {
  buscaColExport = ev.target.value.trim();
  desenharColsExport();
});

/* "Só as da grade" ignora a busca de proposito: e uma volta ao estado conhecido,
   e faze-lo valer so para as filtradas deixaria o resto num estado misturado que
   ninguem pediu. */
$("ex-visiveis").addEventListener("click", () => {
  const vis = new Set(
    (colunasDe.get(abaAtiva) || []).filter((c) => c.visible).map((c) => c.name)
  );
  colsExport.forEach((c) => (c.marcada = vis.has(c.name)));
  desenharColsExport();
  previaExport();
});

// --------------------------------------------------------------- sessao

// Persistida em <raiz>/.dbu/sessao.json pelo lado Harbour.
//
// Em ARQUIVO, nao em localStorage: o armazenamento do webview e isolado por
// origem, e o app roda ora em tauri.localhost (assets embutidos) ora em
// dev.localhost (modo dev) -- o que se salva num modo nao aparece no outro.
//
// Grava a cada mudanca, com um respiro de 400ms para nao escrever a cada pixel
// arrastado. Assim uma queda nao leva a sessao junto.
let salvarPendente = null;
let restaurando = false;

function agendarSalvar() {
  if (restaurando) return;
  clearTimeout(salvarPendente);
  salvarPendente = setTimeout(salvarSessao, 400);
}

async function salvarSessao() {
  try {
    const ativa = abas.find((a) => a.h === abaAtiva);
    await QDBU.rpc("session.save", {
      panelWidth: Math.round($("painel").getBoundingClientRect().width),
      expanded: [...expandidas],
      // caminho, nao handle: handle so existe na sessao viva
      // A selecao de colunas vai junto do ARQUIVO, nao solta: e por arquivo que
      // ela faz sentido, e assim some sozinha quando o arquivo sai da sessao.
      // Lista vazia = todas, mesma convencao da DLL.
      //
      // Sai de `info.visible`, que vem da DLL -- NAO do espelho `colunasDe`, que
      // so existe depois de abrir o painel. Numa sessao restaurada em que o
      // painel nunca foi aberto, o espelho estaria vazio e o salvamento apagaria
      // a selecao que a DLL tinha guardado.
      openFiles: abas.map((a) => ({
        path: a.caminho,
        connection: a.conexao || "",
        fields: (a.info && a.info.visible) || [],
        // Mesma ideia das colunas: e estado POR ARQUIVO, entao vai junto dele e
        // some sozinho quando o arquivo sai da sessao. Sai de `info.filter`,
        // que vem de dbFilter() -- a work area, nao um espelho no JS.
        filter: (a.info && a.info.filter) || "",
        // As condicoes do modo guiado. `filter` sozinho guarda o RESULTADO --
        // a expressao ja montada --, e dela nao da para remontar as linhas:
        // `Left(X, 3) == 'ABC'` pode ter vindo de "comeca com" ou ter sido
        // digitada no modo expressao. Sem isto, reabrir o app trazia o filtro
        // valendo e o painel guiado em branco.
        conditions: condicoesSalvaveis(a.h) || undefined,
      })),
      activeTab: ativa ? ativa.caminho : "",
      tabOrder: ordemAbas,
      pageSize: tamanhoPagina,
    });
  } catch (e) {
    hint(T("ERROR_SESSION_SAVE_FAILED", { detail: msgErro(e) }));
  }
}

/**
 * Reabre o que estava aberto. Arquivo por arquivo, de proposito: se um sumiu ou
 * foi movido, os outros continuam abrindo e o usuario fica sabendo qual falhou.
 */
async function restaurarSessao() {
  let est;
  try {
    est = await QDBU.rpc("session.load");
  } catch (e) {
    return;
  }

  restaurando = true;
  larguraPainel(est.panelWidth || PAINEL_PADRAO);

  // O <select> so aceita os valores que ele oferece; um pageSize gravado a mao
  // fora da lista deixaria o campo em branco mostrando outra coisa.
  const tam = String(est.pageSize || PAGINA_PADRAO);
  if ([...$("pg-tamanho").options].some((o) => o.value === tam)) {
    tamanhoPagina = Number(tam);
    $("pg-tamanho").value = tam;
  }
  ordemAbas = est.tabOrder || (est.openFiles || []).map((f) => f.path || "");

  // A DLL pode ja ter arquivos abertos -- por exemplo depois de um F5, em que a
  // pagina recarrega mas a sessao Harbour continua viva. Sem reconciliar aqui, o
  // JS acharia que nao ha nada aberto e gravaria a sessao vazia por cima.
  await repintarDoEstado();

  for (const nome of est.expanded || []) {
    if (conexoes.some((c) => c.name === nome)) {
      await abrirConexao(nome);
    }
  }

  const SEP = String.fromCharCode(92);
  const chave = (p) => p.split(SEP).join("/").toLowerCase();
  const hb_nome = (p) => p.split(SEP).join("/").split("/").pop();
  const jaAbertos = new Set(abas.map((a) => chave(a.caminho)));
  const filtrosPerdidos = [];

  /*
   * As condições do guiado, guardadas ANTES do laço e para TODOS os arquivos da
   * sessão -- inclusive os que o laço vai pular por já estarem abertos.
   *
   * Esse "já aberto" não é caso raro: é o F5. A página recarrega, a sessão
   * Harbour continua viva com os arquivos abertos, e o laço abaixo não toca em
   * nenhum deles. Semear dentro do laço fazia as condições sumirem exatamente
   * aí -- e só aí, que é o pior tipo de bug para reproduzir.
   */
  for (const item of est.openFiles || []) {
    if (item.path && Array.isArray(item.conditions) && item.conditions.length) {
      condicoesDoDisco.set(chaveCaminho(item.path), item.conditions);
    }
  }

  for (const item of est.openFiles || []) {
    // `item` vem do session.json: as chaves sao `path`/`connection`.
    const p = item.path || "";
    if (!p || jaAbertos.has(chave(p))) continue;
    try {
      // Sem codepage aqui: a cascata (arquivo > conexao > global > PT850)
      // resolve no file.open. A escolha persiste nesses niveis, nao na sessao.
      const novo = await QDBU.rpc("file.open", {
        path: p,
        connection: item.connection || "",
      });

      // Reaplica as colunas escolhidas. Se um campo sumiu porque a estrutura
      // mudou desde a ultima sessao, a DLL recusa a lista inteira -- entao os
      // que ainda existem sao filtrados aqui e o arquivo abre com o resto, em
      // vez de voltar mostrando os 197 campos sem explicacao.
      if (Array.isArray(item.fields) && item.fields.length) {
        const existem = new Set((novo.fields || []).map((c) => c.name));
        const validos = item.fields.filter((n) => existem.has(n));
        if (validos.length) {
          await QDBU.rpc("fields.select", { h: novo.h, fields: validos });
        }
      }

      // O filtro pode nao valer mais: um campo citado pode ter sumido da
      // estrutura desde a ultima sessao. Falhar aqui nao pode impedir o arquivo
      // de abrir -- ele abre sem filtro, e o aviso diz por que.
      if (item.filter) {
        try {
          await QDBU.rpc("filter.set", { h: novo.h, expr: item.filter });
        } catch (e) {
          filtrosPerdidos.push(hb_nome(p) + ": " + msgErro(e));
        }
      }

    } catch (e) {
      /* o que falhou de verdade e apurado abaixo, contra o estado final */
    }
  }

  if ((est.openFiles || []).length) {
    await repintarDoEstado();
    const alvo = abas.find((a) => chave(a.caminho) === chave(est.activeTab || ""));
    if (alvo) {
      ativarAba(alvo.h);
    }
  }

  // Falha e APURADA CONTRA O ESTADO FINAL, nao pelo erro de cada chamada: um
  // "ja esta aberto" nao e falha, e o arquivo pode ter sido aberto por outro
  // caminho. Assim a mensagem nunca contradiz o que esta na tela.
  const abertos = new Set(abas.map((a) => chave(a.caminho)));
  const falhas = (est.openFiles || [])
    .map((f) => f.path || "")
    .filter((p) => p && !abertos.has(chave(p)))
    .map((p) => p.split(SEP).join("/").split("/").pop());

  restaurando = false;

  if (falhas.length) {
    hint(T("WARN_SESSION_FILE_SKIPPED", { files: falhas.join(", ") }));
  } else if (filtrosPerdidos.length) {
    // Um filtro que nao voltou muda o que esta na tela: sem dizer, o usuario ve
    // mais registros do que deixou e conclui que o filtro "nao funciona".
    hint(T("WARN_FILTER_NOT_REAPPLIED", { detail: filtrosPerdidos[0] }));
  } else if (abas.length) {
    hint(T("INFO_SESSION_RESTORED", { n: abas.length }));
  }
}

// -------------------------------------------------------------- divisoria

// Largura do painel: nomes de tabela variam muito (NETCCREDPRESLIST.DBF nao
// cabe em 320px). Arrastar ajusta; duplo clique volta ao padrao.
const PAINEL_PADRAO = 320;
const PAINEL_MIN = 160;
const PAINEL_MAX_FRACAO = 0.6;

function larguraPainel(px) {
  const max = Math.round(window.innerWidth * PAINEL_MAX_FRACAO);
  const v = Math.max(PAINEL_MIN, Math.min(px, max));
  $("painel").style.width = v + "px";
  agendarSalvar();
  return v;
}

(function iniciaDivisoria() {
  // A largura inicial vem da sessao, em restaurarSessao().
  const div = $("divisoria");
  let arrastando = false;

  div.addEventListener("pointerdown", (ev) => {
    arrastando = true;
    div.setPointerCapture(ev.pointerId);
    document.body.classList.add("arrastando");
  });

  div.addEventListener("pointermove", (ev) => {
    if (!arrastando) return;
    larguraPainel(ev.clientX - $("painel").getBoundingClientRect().left);
  });

  const solta = (ev) => {
    if (!arrastando) return;
    arrastando = false;
    try {
      div.releasePointerCapture(ev.pointerId);
    } catch (e) {
      /* o ponteiro pode ja ter saido */
    }
    document.body.classList.remove("arrastando");
  };
  div.addEventListener("pointerup", solta);
  div.addEventListener("pointercancel", solta);

  div.addEventListener("dblclick", () => larguraPainel(PAINEL_PADRAO));

  // Teclado: setas ajustam, Home volta ao padrao.
  div.addEventListener("keydown", (ev) => {
    const atual = $("painel").getBoundingClientRect().width;
    const passo = ev.shiftKey ? 40 : 10;
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      larguraPainel(atual - passo);
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      larguraPainel(atual + passo);
    } else if (ev.key === "Home") {
      ev.preventDefault();
      larguraPainel(PAINEL_PADRAO);
    }
  });
})();

// ------------------------------------------------------------------ eventos

$("arvore").addEventListener("click", async (ev) => {
  const abre = ev.target.closest("[data-menu-conexao]");
  if (abre) {
    // Sem stopPropagation o clique tambem chega ao cabecalho e colapsa a
    // conexao cujo menu a pessoa acabou de abrir.
    ev.stopPropagation();
    menuConexao(abre);
    return;
  }

  const cab = ev.target.closest(".cab");
  if (cab) {
    const nome = cab.dataset.conexao;
    if (expandidas.has(nome)) {
      expandidas.delete(nome);
      desenhar();
      agendarSalvar();
    } else {
      await abrirConexao(nome);
    }
    return;
  }

  // Clique simples SELECIONA. Abrir exige duplo clique: com nomes iguais entre
  // conexoes (NETCLI existe em todo cliente), um clique acidental abriria o
  // arquivo errado.
  const arq = ev.target.closest(".arquivo");
  if (arq) {
    document.querySelectorAll(".arquivo.sel").forEach((e) => e.classList.remove("sel"));
    arq.classList.add("sel");
    hint(paraExibir(arq.dataset.caminho) + "  ·  " + T("UI_DOUBLE_CLICK_TO_OPEN"));
  }
});

$("arvore").addEventListener("dblclick", async (ev) => {
  const arq = ev.target.closest(".arquivo");
  if (arq) {
    await abrirArquivo(arq.dataset.caminho, arq.dataset.conexao);
  }
});

$("arvore").addEventListener("keydown", async (ev) => {
  if (ev.key !== "Enter" && ev.key !== " ") return;

  const cab = ev.target.closest(".cab");
  if (cab) {
    ev.preventDefault();
    cab.click();
    return;
  }

  // No teclado, Enter num arquivo abre -- e o equivalente ao duplo clique, e
  // nao ha risco de disparo acidental como no mouse.
  const arq = ev.target.closest(".arquivo");
  if (arq) {
    ev.preventDefault();
    await abrirArquivo(arq.dataset.caminho, arq.dataset.conexao);
  }
});

// Hint contextual: passar o mouse revela o caminho sem sujar a arvore.
// E o item 14 do acumulador de requisitos (vindo do xWDBU).
$("arvore").addEventListener("mouseover", (ev) => {
  const cab = ev.target.closest(".cab");
  if (cab) {
    hint(paraExibir(cab.dataset.dir));
    return;
  }
  const arq = ev.target.closest(".arquivo");
  if (arq) {
    hint(paraExibir(arq.dataset.caminho));
  }
});

$("arvore").addEventListener("mouseleave", () => hint(""));

$("busca").addEventListener("input", (ev) => {
  filtro = ev.target.value.trim().toLowerCase();
  desenhar();
  if (filtro) carregarPastasPendentes();
});

// -------------------------------------------------------- dialogo de conexao

const dlg = $("dlg-conexao");

$("btn-nova-conexao").addEventListener("click", () => {
  conEditando = null;
  $("con-dir").value = "";
  $("con-nome").value = "";
  $("con-dir").disabled = false;
  $("con-nome").disabled = false;
  preencherSelectCodepage($("con-codepage"), true);
  $("con-codepage").value = "";
  $("con-erro").hidden = true;
  $("form-conexao").querySelector("button[type=submit]").textContent = T("UI_ADD");
  dlg.showModal();
  $("con-dir").focus();
});

/* Editar o codepage de uma conexao existente. Reusa o diálogo, com pasta e
   nome travados -- so a codepage muda (workspace.update). */
let conEditando = null;
function editarCodepageConexao(nome) {
  const con = (conexoes || []).find((c) => c.name === nome);
  conEditando = nome;
  $("con-dir").value = con ? con.dir : "";
  $("con-nome").value = nome;
  $("con-dir").disabled = true;
  $("con-nome").disabled = true;
  preencherSelectCodepage($("con-codepage"), true);
  $("con-codepage").value = (con && con.codepage) || "";
  $("con-erro").hidden = true;
  $("form-conexao").querySelector("button[type=submit]").textContent = T("UI_SAVE");
  dlg.showModal();
  $("con-codepage").focus();
}

$("con-cancelar").addEventListener("click", () => dlg.close());

$("form-conexao").addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const erro = $("con-erro");
  erro.hidden = true;
  document
    .querySelectorAll("#form-conexao .culpado")
    .forEach((e) => e.classList.remove("culpado"));

  try {
    if (conEditando) {
      await QDBU.rpc("workspace.update", {
        name: conEditando,
        codepage: $("con-codepage").value,
      });
      dlg.close();
      await carregarConexoes();
      hint(T("INFO_CONNECTION_UPDATED", { name: conEditando }));
      conEditando = null;
      return;
    }
    const r = await QDBU.rpc("workspace.add", {
      dir: $("con-dir").value.trim(),
      nome: $("con-nome").value.trim(),
      codepage: $("con-codepage").value,
    });
    dlg.close();
    await carregarConexoes();
    await abrirConexao(r.connection.name);
    hint(T("INFO_CONNECTION_ADDED", { name: r.connection.name }));
  } catch (e) {
    // Recusa de negocio traz o campo culpado -- da para destacar.
    erro.textContent = msgErro(e);
    erro.hidden = false;
    if (e.campo === "dir") $("con-dir").classList.add("culpado");
    if (e.campo === "nome") $("con-nome").classList.add("culpado");
  }
});

// --------------------------------------------------------------------- boot

(async () => {
  const s = await QDBU.status();

  const badge = $("badge");
  // Guardar a CHAVE no proprio elemento, e nao so o texto: o HTML nasce com
  // data-i18n="UI_CHECKING" e, sem esta linha, trocar de idioma faria
  // I.aplicar() reescrever "DLL carregada" de volta para "verificando...".
  badge.dataset.i18n = s.carregada ? "INFO_DLL_LOADED" : "ERROR_DLL_NOT_LOADED";
  badge.textContent = T(badge.dataset.i18n);
  badge.className = "badge " + (s.carregada ? "ok" : "bad");
  $("dll-path").textContent = s.caminho;
  $("arch").textContent = s.arch_app;
  $("log-path").textContent = s.log || "-";

  const cdp = $("cdp");
  const ligado = s.cdp && s.cdp !== "desligado";
  // A porta e um parametro, e data-i18n nao carrega parametros -- por isso o
  // valor fica guardado e a repintura de idioma refaz a frase.
  portaCdp = ligado ? s.cdp : null;
  cdp.textContent = ligado ? T("UI_CDP_PORT", { port: s.cdp }) : T("UI_CDP_OFF");
  cdp.className = "cdp " + (ligado ? "on" : "off");

  if (!s.carregada) {
    hint(s.erro || T("ERROR_DLL_NOT_LOADED"));
    return;
  }

  // A lista de codepages (uma vez): o seletor por arquivo do rodape sai dela.
  await carregarCodepages();

  // A DLL e a fonte da verdade: repinta a partir do que ela tem em memoria.
  // Depois disso, restaura o que a sessao anterior tinha e ainda nao esta aberto.
  await repintarDoEstado();
  await restaurarSessao();
})();

// ------------------------------------------------------- erro que nao some

// O webview nao tem console visivel: sem isto, uma excecao numa funcao de
// desenho morre em silencio e a tela fica com um estado antigo que parece
// certo. Foi assim que "fechei a aba e nada aconteceu" ficou invisivel por
// varias sessoes -- o erro estava la desde o primeiro clique.
window.addEventListener("error", (ev) => {
  hint(T("UI_INTERNAL_ERROR", { detail: ev.message }));
});

window.addEventListener("unhandledrejection", (ev) => {
  const e = ev.reason;
  console.error(T("UI_UNHANDLED_REJECTION"), e);
  hint(T("UI_INTERNAL_ERROR", { detail: msgErro(e) }));
});

// --------------------------------------------------------- trocar de idioma

// O `data-i18n` do HTML so alcanca o que o HTML escreveu. Tudo que o JS desenha
// -- a arvore, as abas, a grade, o combo de ordem, os paineis -- nasce com o
// texto ja resolvido e nao muda sozinho: o combo de ordem continuaria mostrando
// "Fisica" depois de trocar para ingles, porque a <option> foi criada por
// `new Option(T(...))` e nao carrega a chave consigo.
//
// A repintura NAO refaz o pedido a DLL. Tudo o que ela precisa ja esta em
// memoria (abas, paginas, colunas); ir ao Harbour so para trocar de idioma
// custaria uma volta inteira e poderia falhar por um motivo que nada tem a ver
// com a troca.
window.addEventListener("idioma-mudou", () => {
  pintar("arvore", desenhar);
  pintar("abas", desenharAbas);
  pintar("conteudo", desenharConteudo);
  pintar("combo de ordem", desenharComboOrdem);
  pintar("combo de codepage", desenharComboCodepage);
  pintar("busca", ajustarBusca);
  pintar("cdp", () => {
    $("cdp").textContent = portaCdp
      ? T("UI_CDP_PORT", { port: portaCdp })
      : T("UI_CDP_OFF");
    if (visaoAtiva === "form") desenharForm();
});

  // Paineis e dialogo so repintam se estiverem na tela: desenhar um painel
  // fechado o traria de volta aberto.
  if (!$("painel-colunas").hidden) pintar("colunas", desenharListaColunas);
  if (!$("painel-indices").hidden) pintar("indices", desenharPainelIndices);
  if (!$("faixa-filtro").hidden) pintar("condicoes", desenharCondicoes);
  if ($("dlg-log").open && ultimoLog) pintar("log", () => desenharLog(ultimoLog));
  if ($("dlg-export").open) {
    pintar("opcoes do formato", opcoesDoFormato);
    pintar("colunas da exportacao", desenharColsExport);
  }

  const a = abas.find((x) => x.h === abaAtiva);
  pintar("marca de filtro", () =>
    marcarFiltroAtivo((a && a.info && a.info.filter) || "", contagemDe.get(abaAtiva))
  );

  // As mensagens de uma acao ("73 de 75 registros passam") sao montadas uma vez
  // e nao guardam a chave que as gerou -- repinta-las exigiria que cada um dos
  // ~60 pontos que chamam msgFiltro/hint passasse chave e parametros em vez de
  // texto pronto. Apagar e a resposta honesta: uma frase parada no idioma
  // anterior mente sobre o que a tela esta dizendo agora, e o indicador que
  // realmente importa -- a marca de filtro e a barra de posicao -- acabou de
  // ser repintado logo acima.
  for (const id of ["ff-msg", "pi-msg", "ex-msg", "hint"]) {
    const el = $(id);
    if (el) el.textContent = "";
  }
});


// ------------------------------------------------------- menu da conexao

/*
 * UM menu flutuante para TODAS as conexoes, e nao um por linha.
 *
 * Com 278 pastas, um menu por conexao seriam 278 subarvores de DOM criadas
 * para talvez nunca abrirem. Este e criado uma vez, movido para junto do botao
 * que o chamou e preenchido na hora.
 */
let menuAberto = null; // {nome, botao} ou null

function fecharMenuConexao() {
  const cx = $("menu-conexao");
  cx.hidden = true;
  cx.textContent = "";
  if (menuAberto && menuAberto.botao.isConnected) {
    menuAberto.botao.setAttribute("aria-expanded", "false");
  }
  menuAberto = null;
}

function itemMenu(cx, icone, chave, acao, classe) {
  const b = elemento("button", "mc-item" + (classe ? " " + classe : ""));
  b.type = "button";
  b.setAttribute("role", "menuitem");
  // Icone e rotulo: o icone da o reconhecimento de relance que os tres botoes
  // antigos tinham, o rotulo tira a adivinhacao que eles exigiam. A largura
  // fixa do icone e o que alinha os textos numa coluna so.
  b.appendChild(elemento("span", "mc-icone", icone));
  b.appendChild(elemento("span", "mc-rotulo", T(chave)));
  b.addEventListener("click", () => {
    fecharMenuConexao();
    acao();
  });
  cx.appendChild(b);
}

function menuConexao(botao) {
  const nome = botao.dataset.menuConexao;

  // Clicar de novo no mesmo botao fecha -- e o que se espera de um menu.
  if (menuAberto && menuAberto.nome === nome) {
    fecharMenuConexao();
    return;
  }
  fecharMenuConexao();

  const con = conexoes.find((c) => c.name === nome);
  if (!con) return;

  const cx = $("menu-conexao");
  cx.textContent = "";

  // Cabecalho com o nome: o menu flutua longe da linha que o chamou, e sem
  // isto nao da para ter certeza de QUAL conexao vai ser removida.
  const cab = elemento("div", "mc-cab", con.name);
  cab.title = paraExibir(con.dir);
  cx.appendChild(cab);

  // Abrir no Explorer some quando a pasta nao existe: abrir um caminho morto
  // leva o Explorer para a pasta do usuario, que engana mais que nao abrir.
  if (con.exists) {
    itemMenu(cx, "🗀", "UI_MENU_OPEN_FOLDER", () => {
      QDBU.abrirPasta(con.dir).catch((e) =>
        hint(T("ERROR_OPEN_FOLDER_FAILED", { detail: msgErro(e) }))
      );
    });
  }

  itemMenu(cx, "⟳", "UI_MENU_RELOAD", async () => {
    expandidas.add(nome);
    await abrirConexao(nome);
    const n = (arquivosDe.get(nome) || []).length;
    hint(nome + ": " + T("UI_FILES_COUNT", { n: n }));
  });

  /*
   * CRIAR ENTRA PELA CONEXÃO, e não por um "Novo arquivo" no cabeçalho.
   *
   * Um DBF precisa de uma pasta, e conexão É uma pasta: entrando por aqui o
   * destino já vem preenchido e não há um campo vazio esperando alguém digitar
   * um caminho de cabeça. Some quando a pasta não existe, pelo mesmo motivo que
   * o "abrir no Explorer" some.
   */
  if (con.exists) {
    itemMenu(cx, "▤", "UI_NEW_DBF", () => {
      fecharMenuConexao();
      esCriarNovo(con.dir);
    });
  }

  cx.appendChild(elemento("div", "mc-linha"));

  // Destrutivo separado por uma linha: e o unico daqui que apaga cadastro, e
  // colar ele nos outros convida ao clique errado.
  itemMenu(cx, "\u2691", "UI_MENU_CODEPAGE", () => editarCodepageConexao(nome));
  itemMenu(cx, "×", "UI_MENU_REMOVE", () => removerConexao(nome), "risco");

  // Posiciona so depois de preenchido -- antes disso a altura nao existe.
  cx.hidden = false;
  const r = botao.getBoundingClientRect();
  const alt = cx.getBoundingClientRect().height;
  const larg = cx.getBoundingClientRect().width;

  /*
   * Alinhado pela DIREITA do botao, e nao pela esquerda.
   *
   * O botao fica na borda direita de um painel estreito (~190px). Abrindo para
   * a direita, o menu saía por cima da grade; ancorado pela direita ele cresce
   * para dentro do painel, que e de onde a acao partiu. O clamp final so evita
   * sair da janela quando o painel esta muito estreito.
   */
  cx.style.left =
    Math.max(6, Math.min(r.right - larg, window.innerWidth - larg - 6)) + "px";
  // Abre para CIMA quando nao cabe embaixo, em vez de sair pela borda.
  cx.style.top =
    (r.bottom + alt + 6 > window.innerHeight ? r.top - alt - 4 : r.bottom + 4) + "px";

  botao.setAttribute("aria-expanded", "true");
  menuAberto = { nome: nome, botao: botao };
}

// Fechar: clique fora, Esc, e rolagem da arvore -- o menu e posicionado em
// coordenadas de tela, entao rolar a lista o deixaria apontando para a linha
// errada. Fechar e mais honesto que reposicionar a cada pixel.
document.addEventListener("click", (ev) => {
  if (!menuAberto) return;
  const el = alvo(ev);
  if (el && (el.closest("#menu-conexao") || el.closest("[data-menu-conexao]"))) return;
  fecharMenuConexao();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && menuAberto) fecharMenuConexao();
});
$("arvore").addEventListener("scroll", () => {
  if (menuAberto) fecharMenuConexao();
});

// ------------------------------------------------- log de operacoes (T17)

/*
 * O visualizador do log.
 *
 * O log e JSONL no disco (ver src/util/log.prg); aqui ele vira tabela. A DLL
 * devolve as linhas ja decodificadas -- a tela nunca ve o formato, e por isso
 * trocar o formato um dia nao passa por aqui.
 *
 * Sempre as MAIS RECENTES primeiro: num dia de trabalho sao centenas de
 * operacoes, e a que interessa quase sempre e a ultima.
 */
let logDia = "";
// A ultima leitura do log, guardada para a troca de idioma repintar a tabela
// sem voltar a DLL -- as linhas ja estao aqui, e o que muda e so a frase.
let ultimoLog = null;

function diaLegivel(aaaammdd) {
  const d = String(aaaammdd || "");
  if (d.length !== 8) return d;
  return d.slice(6, 8) + "/" + d.slice(4, 6) + "/" + d.slice(0, 4);
}

async function abrirLog() {
  const dlg = $("dlg-log");
  msgLog("");
  $("lg-busca").value = "";

  try {
    const r = await QDBU.rpc("log.days");
    const sel = $("lg-dia");
    sel.textContent = "";
    for (const d of r.days) {
      sel.appendChild(new Option(diaLegivel(d.dia), d.dia));
    }
    $("lg-caminho").textContent = paraExibir(r.dir);
    $("lg-caminho").dataset.dir = r.dir;

    if (!r.days.length) {
      // Sem nenhum dia gravado a tabela nao tem o que mostrar, e dizer isso e
      // melhor que abrir um dialogo vazio que parece quebrado.
      logDia = "";
      desenharLog({ lines: [], found: 0, truncated: false });
      dlg.showModal();
      return;
    }

    logDia = r.days[0].dia;
    sel.value = logDia;
    dlg.showModal();
    await carregarLog();
  } catch (e) {
    msgLog(msgErro(e), sevErro(e));
    dlg.showModal();
  }
}

async function carregarLog() {
  if (!logDia) return;
  try {
    const r = await QDBU.rpc("log.read", {
      day: logDia,
      filter: $("lg-busca").value.trim(),
    });
    ultimoLog = r;
    desenharLog(r);
    msgLog("");
  } catch (e) {
    ultimoLog = { lines: [], found: 0, truncated: false };
    desenharLog(ultimoLog);
    msgLog(msgErro(e), sevErro(e));
  }
}

function desenharLog(r) {
  const corpo = $("lg-tabela").querySelector("tbody");
  const vazio = $("lg-vazio");
  corpo.textContent = "";

  if (!r.lines.length) {
    vazio.hidden = false;
    vazio.textContent = $("lg-busca").value.trim()
      ? T("UI_LOG_NOTHING_MATCHES")
      : T("UI_LOG_EMPTY");
    $("lg-conta").textContent = "";
    return;
  }
  vazio.hidden = true;

  for (const l of r.lines) {
    const tr = elemento("tr", l.ok ? "" : "recusa");
    tr.appendChild(elemento("td", "lg-hora", l.t || ""));
    tr.appendChild(elemento("td", "lg-metodo", l.m || ""));
    tr.appendChild(elemento("td", "lg-arquivo", l.f || ""));

    // A recusa mostra a FRASE traduzida, nao o codigo cru: quem le o log e a
    // mesma pessoa que viu a mensagem na tela, e as duas tem de bater.
    const res = elemento(
      "td",
      "lg-res",
      l.ok ? T("UI_LOG_OK") : fraseDaRecusa(l)
    );
    if (!l.ok) res.title = l.erro || "";
    tr.appendChild(res);

    tr.appendChild(elemento("td", "num lg-ms", l.ms == null ? "" : l.ms + " ms"));

    // Os parametros no tooltip da linha: sao o "porque" da operacao (a
    // expressao do filtro, a chave do indice) e ocupariam a tela inteira se
    // fossem coluna.
    if (l.p) tr.title = JSON.stringify(l.p, null, 1);
    corpo.appendChild(tr);
  }

  $("lg-conta").textContent = r.truncated
    ? T("UI_LOG_COUNT_TRUNCATED", { n: r.lines.length, total: r.found })
    : T("UI_LOG_COUNT", { n: r.found });
}

/*
 * A frase de uma linha recusada.
 *
 * `ep` sao os parametros DA RECUSA; `p` os do pedido. A frase quer os primeiros
 * -- ERROR_FILE_NOT_FOUND interpola {file}, e o pedido mandou `path`. Ver o
 * comentario em src/util/log.prg.
 *
 * Se sobrar um {buraco} -- linha gravada por uma versao anterior, ou codigo cuja
 * frase pede um parametro que nao foi guardado -- mostra o CODIGO. Ele e
 * autoexplicativo por desenho (ERROR_FILE_NOT_FOUND), e uma frase com o
 * marcador a vista parece defeito de quem le, nao do registro.
 */
function fraseDaRecusa(l) {
  const frase = window.I.doErro({ codigo: l.erro, params: l.ep || l.p || {} });
  return /\{[A-Za-z_][A-Za-z0-9_]*\}/.test(frase) ? l.erro || frase : frase;
}

function msgLog(txt, classe) {
  const el = $("lg-msg");
  el.textContent = txt || "";
  el.className = "ff-msg" + (classe ? " " + classe : "");
}

$("btn-log").addEventListener("click", abrirLog);
$("lg-fechar").addEventListener("click", () => $("dlg-log").close());
$("form-log").addEventListener("submit", (ev) => ev.preventDefault());

$("lg-dia").addEventListener("change", (ev) => {
  logDia = ev.target.value;
  carregarLog();
});

// Busca a cada tecla, com folga: o arquivo do dia e lido inteiro a cada
// consulta, e disparar por tecla numa digitacao rapida faria dezenas de
// leituras para mostrar so a ultima.
let logPendente = null;
$("lg-busca").addEventListener("input", () => {
  clearTimeout(logPendente);
  logPendente = setTimeout(carregarLog, 250);
});

$("lg-pasta").addEventListener("click", () => {
  const dir = $("lg-caminho").dataset.dir;
  if (!dir) return;
  QDBU.abrirPasta(dir).catch((e) =>
    msgLog(T("ERROR_OPEN_FOLDER_FAILED", { detail: msgErro(e) }), "erro")
  );
});


// ------------------------------------------------------------------- pré-voo

/*
 * O diálogo que mostra as conferências antes de alterar um arquivo.
 *
 * NÃO É UM "TEM CERTEZA?". Um aviso genérico ensina a clicar em OK sem ler, e
 * depois de três vezes ninguém lê mais nenhum. Aqui a pessoa vê o que foi
 * conferido, o resultado de cada item, e a lista do que vai ser copiado.
 *
 * É essa transparência que autoriza a ferramenta a fazer PACK e ZAP — que é a
 * razão de o QDBU existir. Recusar-se a operar não é segurança: é uma ferramenta
 * que não serve.
 *
 * O fluxo é sempre o mesmo, e vem de src/api_backup.prg:
 *
 *   backup.check   →  mostra           (não toca em nada)
 *   confirma       →  backup.run       (confere de novo, copia, verifica)
 *   backup ok      →  a operação real  (T10/T13/T14, via o callback)
 */

let prevooHandle = null;
let prevooDepois = null; // o que rodar depois do backup confirmado
let prevooOperacao = true; // pré-voo (true) × cópia avulsa (false)
let prevooAlvo = ""; // caminho escolhido; vazio = usa a sugestão da DLL

const PV_ICONE = { pass: "✓", warn: "!", fail: "✕" };

/*
 * Abre o pré-voo para o handle, e chama `aoConfirmar(resultadoDoBackup)`
 * depois de o backup estar feito e verificado.
 *
 * T10/T13/T14 entram por aqui e não por `backup.run` direto: assim nenhuma
 * delas pode esquecer a conferência, e a ordem — conferir, copiar, verificar,
 * só então operar — mora num lugar só.
 */
async function abrirPrevoo(h, aoConfirmar, opcoes) {
  prevooHandle = h;
  prevooDepois = aoConfirmar || null;

  /*
   * Dois usos, e eles pedem coisas diferentes.
   *
   *   pré-voo (padrão)  uma operação destrutiva vem depois. Destino fixo, ao
   *                     lado do original, e o espaço precisa caber o .tmp.
   *   cópia avulsa      a pessoa pediu uma cópia. Escolhe a pasta, nada vem
   *                     depois, e não há aviso sobre modo exclusivo — copiar
   *                     nunca exigiu exclusivo.
   */
  prevooOperacao = !(opcoes && opcoes.copiaAvulsa);
  prevooAlvo = "";

  const dlg = $("dlg-prevoo");
  msgPrevoo("");
  $("pv-confirma").checked = false;

  // Volta ao estado de ANTES: o diálogo é reaproveitado, e sem isto a segunda
  // abertura herdaria o "Fechar" e o botão escondido da primeira.
  $("pv-rodar").hidden = false;
  $("pv-cancelar").textContent = T("UI_CANCEL");
  $("pv-conjunto-box").open = false;

  try {
    await recarregarPrevoo();
    dlg.showModal();
  } catch (e) {
    msgPrevoo(msgErro(e), sevErro(e));
    dlg.showModal();
  }
}

/* Reconsulta o checklist. Chamado ao abrir e a cada troca de pasta: o espaço
   livre é do volume de DESTINO, então mudar a pasta muda a resposta. */
async function recarregarPrevoo() {
  desenharPrevoo(
    await QDBU.rpc("backup.check", {
      h: prevooHandle,
      path: prevooAlvo,
      forOperation: prevooOperacao,
    })
  );
}

function desenharPrevoo(r) {
  $("pv-arquivo").textContent = paraExibir(r.path);

  // --- as conferências ------------------------------------------------------
  const lista = $("pv-checks");
  lista.textContent = "";
  for (const c of r.checks) {
    const li = elemento("li", c.level);
    li.appendChild(elemento("span", "pv-icone", PV_ICONE[c.level] || "·"));
    li.appendChild(elemento("span", "pv-nome", T("UI_" + c.id)));
    li.appendChild(elemento("span", "pv-detalhe", detalheDoCheck(c)));
    lista.appendChild(li);
  }

  // --- o conjunto que vai ser copiado --------------------------------------
  const corpo = $("pv-conjunto");
  corpo.textContent = "";
  for (const f of r.set) {
    const tr = elemento("tr");
    tr.appendChild(elemento("td", "papel", T("UI_ROLE_" + f.role.toUpperCase())));
    // SEP_BARRA em vez de uma classe de regex com barra invertida: o caminho
    // vem do Windows (`J:\bases\base01\NETCLI.DBF`) e a pasta já está no
    // topo do diálogo — repeti-la em cada linha só empurra o tamanho para fora
    // da tela.
    tr.appendChild(
      elemento("td", "", f.path.split(SEP_BARRA).pop().split("/").pop())
    );
    tr.appendChild(elemento("td", "num", window.I.tamanho(f.bytes)));
    corpo.appendChild(tr);
  }
  /*
   * O resumo é só o rótulo de abrir, e não a contagem de novo.
   *
   * Ele repetia "1 arquivo, 160,2 KB" — a mesma frase que a conferência
   * "Arquivos que serão copiados" diz uma linha acima. Ler o DOM não denunciou
   * isso (os dois valores estavam certos); só apareceu ao olhar a tela.
   */
  $("pv-conjunto-resumo").textContent = T("UI_SEE_FILES");

  /*
   * Destino: só na cópia avulsa, e já com o nome sugerido dentro.
   *
   * A DLL devolve `target` — pasta e nome, com carimbo de hora. O campo nasce
   * preenchido porque o caso comum é aceitar; e é editável porque o segundo
   * caso mais comum é renomear na mesma pasta, que é como se guarda mais de uma
   * geração.
   *
   * Só sobrescreve o campo quando a pessoa ainda não digitou nada: recarregar o
   * checklist (a cada troca de destino) não pode apagar o que ela escreveu.
   */
  $("pv-destino-box").hidden = prevooOperacao;
  if (!prevooOperacao && !prevooAlvo) {
    $("pv-destino").value = r.target;
  }

  // --- confirmação de arquivo grande ---------------------------------------
  $("pv-confirma-box").hidden = !r.large;

  // Só `fail` impede. `warn` informa e deixa seguir — foi por confundir os dois
  // que a primeira versão mostrava um X vermelho num item que não bloqueia
  // nada. Ver o comentário sobre níveis em src/api_backup.prg.
  $("pv-rodar").disabled = !r.canProceed;
}

/*
 * A frase de detalhe de uma conferência.
 *
 * `CHECK_DISK_SPACE` tem duas frases — a que passou e a que não passou — porque
 * "17,1 GB livres; precisa de 2,5 GB" e "só 3 GB livres, e precisa de 2,5 GB"
 * não são a mesma frase com uma palavra trocada. Uma tranquiliza, a outra
 * explica o que fazer.
 */
function detalheDoCheck(c) {
  const p = c.params || {};
  if (c.id === "CHECK_DISK_SPACE") {
    return T(c.level === "pass" ? "UI_CHECK_DISK_SPACE_OK" : "UI_CHECK_DISK_SPACE_BAD", p);
  }
  return T("UI_" + c.id + "_MSG", p);
}

/*
 * O resultado: QUAIS arquivos nasceram, e não só a pasta.
 *
 * A primeira versão dizia "Backup feito em J:\bases\base01\" e parava aí — o
 * nome do arquivo estava na resposta (`files[].backup`) e não ia para a tela.
 * Obrigar a pessoa a abrir o Explorer para descobrir o que foi criado desfaz
 * justamente o que este diálogo existe para construir: saber o que aconteceu.
 *
 * A lista do conjunto é REESCRITA com os nomes das cópias. O que estava ali era
 * a previsão ("vai copiar isto"); depois de feito, a previsão não interessa
 * mais — interessa o que existe agora, com o nome pelo qual se procura.
 */
function mostrarBackupFeito(r) {
  /*
   * COMPACTADO DIZ O QUANTO ENCOLHEU, e por qual via saiu.
   *
   * "Cópia feita" não responde o que a pessoa quer saber depois de marcar
   * compactar: quanto ficou, e se o original precisou ser copiado antes. O
   * `mode` vem da DLL dizendo qual caminho foi possível -- `zip-direct` quando
   * deu para ler o original, `zip-copy` quando o arquivo estava exclusivo e a
   * cópia por registro foi necessária.
   */
  if (String(r.mode || "").startsWith("zip")) {
    const pct = r.source > 0 ? Math.round((1 - r.bytes / r.source) * 100) : 0;
    msgPrevoo(
      T("UI_BACKUP_DONE_ZIP", {
        dir: paraExibir(r.dir),
        from: window.I.tamanho(r.source),
        to: window.I.tamanho(r.bytes),
        pct: pct,
      }) + " " + T(r.mode === "zip-direct" ? "UI_ZIP_DIRECT" : "UI_ZIP_COPY"),
      "ok"
    );
  } else {
    msgPrevoo(T("UI_BACKUP_DONE", { dir: paraExibir(r.dir) }), "ok");
  }

  const corpo = $("pv-conjunto");
  corpo.textContent = "";
  for (const f of r.files) {
    const tr = elemento("tr");
    tr.appendChild(elemento("td", "papel", T("UI_ROLE_" + f.role.toUpperCase())));
    tr.appendChild(elemento("td", "bak", f.backup));
    tr.appendChild(elemento("td", "num", window.I.tamanho(f.bytes)));
    corpo.appendChild(tr);
  }

  // Aberto, não recolhido: o nome do arquivo é a resposta à pergunta "e agora,
  // onde está minha cópia?" — escondê-la atrás de um clique seria escondê-la.
  $("pv-conjunto-resumo").textContent = T("UI_BACKUP_FILES", { n: r.files.length });
  $("pv-conjunto-box").open = true;

  // O botão de copiar de novo não faz sentido depois de feito: uma segunda
  // cópia idêntica só ocuparia disco. Fechar é a ação que resta.
  $("pv-rodar").hidden = true;
  $("pv-cancelar").textContent = T("UI_CLOSE");
}

function msgPrevoo(txt, classe) {
  const el = $("pv-msg");
  el.textContent = txt || "";
  el.className = "ff-msg" + (txt && classe ? " " + classe : "");
}

/*
 * A porta de entrada do backup avulso.
 *
 * `copiaAvulsa: true` muda três coisas: a pasta passa a ser escolhível, o
 * espaço exigido cai de 2× para 1× (não há .tmp de operação seguinte), e some o
 * aviso sobre modo exclusivo — copiar nunca exigiu exclusivo.
 */
$("pg-backup").addEventListener("click", () => {
  if (!abaAtiva) return;
  abrirPrevoo(abaAtiva, null, { copiaAvulsa: true });
});

/* ------------------------------------------------- R6: reconectar / fechar */

function msgDesconectado(txt, classe) {
  const el = $("dc-msg");
  el.textContent = txt || "";
  el.className = "dc-msg" + (txt && classe ? " " + classe : "");
}

/*
 * Reconectar existe porque quem segurava o arquivo pode já ter soltado.
 *
 * Sem isto, a única saída seria fechar a aba e reabrir — perdendo colunas
 * escolhidas, filtro e posição. Punir o usuário por um problema que não foi
 * dele.
 */
$("dc-reconectar").addEventListener("click", async () => {
  if (!abaAtiva) return;
  const botao = $("dc-reconectar");
  botao.disabled = true;
  msgDesconectado("");
  try {
    const r = await QDBU.rpc("file.reconnect", { h: abaAtiva });
    await repintarDoEstado();
    hint(T("UI_RECONNECTED", { file: r.file }));
  } catch (e) {
    msgDesconectado(msgErro(e), sevErro(e));
  } finally {
    botao.disabled = false;
  }
});

/* Fechar a aba TEM de funcionar mesmo desconectada. Uma aba presa num erro que
   não se consegue nem fechar é pior que o erro. */
$("dc-fechar").addEventListener("click", () => {
  if (abaAtiva) fecharAba(abaAtiva);
});

$("pv-cancelar").addEventListener("click", () => $("dlg-prevoo").close());

/*
 * Escolher a pasta de destino.
 *
 * Usa o seletor NATIVO do sistema (tauri-plugin-dialog), e não um navegador de
 * pastas nosso: a pessoa já sabe usar o do Windows, ele mostra unidades de rede
 * e pendrives sem nós reimplementarmos nada, e um seletor caseiro seria uma tela
 * inteira para resolver o que o sistema já resolve.
 */
$("pv-escolher").addEventListener("click", async () => {
  const inv = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if (!inv) {
    msgPrevoo(T("ERROR_DIALOG_UNAVAILABLE"), "aviso");
    return;
  }
  try {
    const escolhido = await inv("plugin:dialog|save", {
      options: {
        title: T("UI_SAVE_AS"),
        defaultPath: $("pv-destino").value.trim(),
        filters: [
          { name: T("UI_FT_DBF"), extensions: ["dbf"] },
          { name: T("UI_FT_ALL"), extensions: ["*"] },
        ],
      },
    });
    if (!escolhido) return; // cancelar no diálogo do sistema é cancelar
    $("pv-destino").value = escolhido;
    prevooAlvo = escolhido;
    await recarregarPrevoo();
  } catch (e) {
    msgPrevoo(T("ERROR_DIALOG_FAILED", { detail: e.message || e }), "erro");
  }
});

/* Digitar também vale: o `⌕` é atalho, não a única porta. Reconsulta ao sair do
   campo, porque o espaço livre e a colisão de nome dependem do que foi digitado. */
$("pv-destino").addEventListener("change", async () => {
  prevooAlvo = $("pv-destino").value.trim();
  try {
    await recarregarPrevoo();
    msgPrevoo("");
  } catch (e) {
    msgPrevoo(msgErro(e), sevErro(e));
  }
});

$("pv-rodar").addEventListener("click", async () => {
  if (!prevooHandle) return;
  const botao = $("pv-rodar");
  botao.disabled = true;
  msgPrevoo("");

  try {
    const r = await comProgresso(
      QDBU.rpc("backup.run", {
        h: prevooHandle,
        path: prevooOperacao ? "" : $("pv-destino").value.trim(),
        forOperation: prevooOperacao,
        confirmLarge: $("pv-confirma").checked,
        compress: $("pv-zip").checked,
      })
    );
    mostrarBackupFeito(r);

    // A operação real só agora — depois de a cópia existir E ter sido
    // conferida. É o passo 3 da sequência que dá valor a todos os outros.
    if (prevooDepois) {
      const seguir = prevooDepois;
      prevooDepois = null;
      await seguir(r);
    }
  } catch (e) {
    msgPrevoo(msgErro(e), sevErro(e));
  } finally {
    botao.disabled = false;
  }
});



// ------------------------------------------------- T10: editor de estrutura

/*
 * AS EDIÇÕES SE ACUMULAM; APLICAR É UM ATO SÓ.
 *
 * Alterar estrutura reconstrói o arquivo inteiro fora do lugar (R2 de
 * regras de integridade). Fazer isso a cada tecla, num arquivo de 800 MB,
 * seria absurdo — e pior, deixaria a pessoa a meio caminho de uma mudança que
 * ela ainda estava pensando.
 *
 * Então o editor é uma ÁREA DE RASCUNHO: `esRascunho` é a estrutura que a
 * pessoa está montando, `esOriginal` é a que está no disco, e a diferença entre
 * as duas é o que a tela mostra e o que a DLL vai receber.
 */

let esEditando = false;
let esOriginal = null;   // [{name,type,len,dec}] como está no arquivo
let esRascunho = null;   // o mesmo, com as edições — cada item ganha `_id` e `_de`
let esSel = -1;          // índice da linha selecionada
let esSeq = 0;           // gerador de `_id` para campos novos
let esNovo = null;       // { dir } quando se está montando um arquivo NOVO

/*
 * NÃO HÁ RASCUNHO POR ABA, e é o ponto da modal.
 *
 * A versão anterior guardava um rascunho por handle, com dono e mapa, porque o
 * editor vivia dentro da aba. Deu para consertar o vazamento da tabela e ainda
 * assim o resumo e o bloco de impacto continuaram mostrando o arquivo errado --
 * a visão era espalhada por quatro regiões do DOM e cada uma lia as mesmas
 * variáveis globais. Cada região era uma chance nova de vazar.
 *
 * Com a modal existe um rascunho só, ele nasce quando ela abre e morre quando
 * ela fecha. `esAlvo` guarda de quem ele é para a hora de aplicar.
 */
let esAlvo = null;   // handle do arquivo sendo alterado (null quando é criação)

/* Os tipos que este editor oferece. NTX/DBF clássico: sem os exóticos do FoxPro,
   que o RDD daqui não escreve. */
const ES_TIPOS = ["C", "N", "D", "L", "M"];

/*
 * MAIÚSCULO E SEM ACENTO — a mesma regra do Kairo, e o mesmo código.
 *
 * Copiada de `upperSemAcento` (Kairo, src/lib/dominios.js:129), onde o
 * comentário registra o porquê: ela espelha o `RemoveAcentoPT850` do
 * `_Encode` do TDbfModel no servidor. Reescrever aqui uma segunda versão da
 * mesma regra seria criar duas verdades sobre o que é um nome válido.
 *
 * Nome de campo DBF não aceita acento nem minúscula: o formato guarda 10 bytes
 * ASCII maiúsculos. Normalizar ao digitar é melhor que recusar depois — quem
 * escreve "endereço" quer `ENDERECO`, e o app sabe disso.
 */
const upperSemAcento = (v) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

/*
 * O que sobra depois de tirar o que o DBF não aceita.
 *
 * Espaço, hífen e ponto viram `_` em vez de sumirem: quem digita "DATA NASC"
 * quer `DATA_NASC`, e apagar o espaço daria `DATANASC`, que é outra palavra.
 * O resto — símbolos, acentos que sobraram, qualquer coisa fora de A-Z 0-9 _ —
 * some, porque não há tradução óbvia.
 *
 * O primeiro caractere não pode ser dígito nem `_`: é regra do formato, e
 * cortá-lo aqui evita a pessoa digitar um nome inteiro para ser recusada no fim.
 */
function esNomeValido(v) {
  return upperSemAcento(v)
    .replace(/[ .\-]/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/^[0-9_]+/, "")
    .slice(0, 10);
}

/*
 * A validação, portada de `field_check` (DBUSTRU.PRG:1027).
 *
 * As regras são do formato DBF, não do gosto de ninguém — por isso valem
 * literalmente, inclusive o truque do Clipper para campo C longo: o tamanho
 * real é `256 * dec + len`, o que permite até 1024 bytes num campo caractere
 * usando o byte de decimais como parte alta.
 *
 * Devolve um array de códigos; vazio significa campo válido.
 */
function esValidaCampo(c, todos, indice) {
  const erros = [];
  const nome = (c.name || "").trim().toUpperCase();

  if (!nome) erros.push("ERROR_FIELD_NAME_EMPTY");
  else {
    if (!/^[A-Z][A-Z0-9_]*$/.test(nome)) erros.push("ERROR_FIELD_NAME_BAD");
    if (nome.length > 10) erros.push("ERROR_FIELD_NAME_LONG");
    const igual = todos.findIndex(
      (o, i) => i !== indice && !o._removido && (o.name || "").trim().toUpperCase() === nome
    );
    if (igual >= 0) erros.push("ERROR_FIELD_NAME_DUP");
  }

  if (!ES_TIPOS.includes(c.type)) erros.push("ERROR_FIELD_TYPE_BAD");

  const len = Number(c.len) || 0;
  const dec = Number(c.dec) || 0;

  if (c.type === "C") {
    /*
     * A largura inteira vai em `len` — o Harbour parte em dois bytes sozinho.
     *
     * Havia aqui a conta do Clipper (`256 * dec + len`), na suposição de que a
     * forma dividida chegasse pronta. Medido contra a DLL: pedir `C 300`
     * devolve `300.0`; pedir `len=44, dec=1` devolve `44.0`, e não 300. A conta
     * fazia a tela aceitar uma largura que o arquivo não teria.
     */
    if (len <= 0 || len > 1024) erros.push("ERROR_FIELD_LEN_C");
  } else if (c.type === "M") {
    if (len !== 10) erros.push("ERROR_FIELD_LEN_MEMO");
  } else if (c.type === "D") {
    if (len !== 8) erros.push("ERROR_FIELD_LEN_DATE");
  } else if (c.type === "L") {
    if (len !== 1) erros.push("ERROR_FIELD_LEN_LOGIC");
  } else if (len <= 0 || len > 19) {
    erros.push("ERROR_FIELD_LEN_N");
  }

  if (c.type === "N") {
    const maximo = len < 3 ? 0 : len > 17 ? 15 : len - 2;
    if (dec > maximo) erros.push("ERROR_FIELD_DEC");
  }

  return erros;
}

/* O tamanho do registro: 1 byte de marca de exclusão + a soma dos campos. */
function esTamanhoRegistro(campos) {
  return campos
    .filter((c) => !c._removido)
    .reduce((n, c) => n + (Number(c.len) || 0), 1);
}

/*
 * Abre o editor com uma estrutura VAZIA, para um arquivo que ainda não existe.
 *
 * O editor nasceu para alterar a estrutura de um arquivo aberto, e o caminho de
 * criar reusa a mesma tela de propósito: são a mesma tarefa -- montar uma lista
 * de campos. O que muda é que aqui não há original para comparar, então não há
 * marcas de alteração nem bloco de impacto; e no fim, em vez de reescrever, se
 * grava um arquivo novo.
 */
function esCriarNovo(dirPadrao) {
  /* Criar NÃO precisa de aba. Enquanto o editor morava dentro da aba, criar um
     arquivo sequestrava a visão Estrutura de um arquivo que nada tinha a ver
     com ele -- e trocar de aba no meio deixava o rascunho do arquivo novo
     desenhado sob outro. Aqui a modal é a tela inteira da tarefa. */
  esAlvo = null;
  esNovo = { dir: dirPadrao || "" };
  esEditando = true;
  esOriginal = [];
  /* Um campo para começar: uma tabela vazia com um botão "+" obriga a
     descobrir por onde se começa. */
  esRascunho = [{ name: "CODIGO", type: "C", len: 10, dec: 0, _id: "n" + ++esSeq, _de: null }];
  esSel = 0;
  $("ed-titulo").textContent = T("UI_NEW_FILE");
  desenharEditor();
  if (!$("dlg-estrutura").open) $("dlg-estrutura").showModal();
}

/* Abre a modal sobre a estrutura da aba `h`. */
function esEntrarNoModo(ligado) {
  if (!ligado) { esFechar(); return; }

  const aba = abas.find((a) => a.h === abaAtiva);
  esAlvo = abaAtiva;
  esNovo = null;
  esEditando = true;
  esOriginal = (aba && aba.fields ? aba.fields : []).map((c) => ({
    name: c.name, type: c.type, len: c.len, dec: c.dec,
  }));
  esRascunho = esOriginal.map((c, i) => ({ ...c, _id: "o" + i, _de: { ...c } }));
  esSel = esRascunho.length ? 0 : -1;
  $("ed-titulo").textContent = T("UI_EDIT_STRUCTURE_OF", {
    file: (aba && aba.info && aba.info.file) || (aba && aba.alias) || "",
  });
  desenharEditor();
  if (!$("dlg-estrutura").open) $("dlg-estrutura").showModal();
}

/* Fecha a modal e joga o rascunho fora. */
function esFechar() {
  /* Os painéis são zerados junto: deixá-los preenchidos faz o próximo abrir
     mostrar, por um quadro, o impacto e os erros da edição anterior. */
  $("es-impacto").hidden = true;
  $("es-impacto-lista").textContent = "";
  $("es-erros").hidden = true;
  $("es-erros-lista").textContent = "";
  $("ed-estrutura").querySelector("tbody").textContent = "";
  esEditando = false;
  esOriginal = esRascunho = esNovo = null;
  esAlvo = null;
  esSel = -1;
  if ($("dlg-estrutura").open) $("dlg-estrutura").close();
}

/* Há trabalho não aplicado? Decide se descartar precisa de pergunta. */
function esTemMudanca() {
  if (!esRascunho) return false;
  if (esNovo) return true;
  return esRascunho.some((c) => c._removido || !c._de || esMudou(c));
}

/*
 * O QUE VAI ACONTECER COM OS DADOS.
 *
 * É a razão de esta tela existir. Nada disto se lê na tabela de campos, e
 * descobrir depois de aplicar, no arquivo de um cliente, é tarde.
 */
function esImpacto() {
  const itens = [];
  /* Num arquivo novo não há dado a perder: todo campo é "criado, vazio", o que
     seria uma lista de óbvios do tamanho da estrutura. */
  if (!esRascunho || esNovo) return itens;

  for (const c of esRascunho) {
    if (c._removido) {
      itens.push({ grave: true, chave: "UI_IMPACT_REMOVED", p: { field: c.name } });
      // A saída fica escrita ao lado do estrago: quem lê "os dados são
      // perdidos" é exatamente quem precisa saber como desfazer.
      itens.push({ grave: false, chave: "UI_IMPACT_UNDO", p: { field: c.name } });
      continue;
    }
    if (!c._de) {
      /* Campo ainda sem nome não vira linha de impacto: sairia como "'' é
         criado, vazio em todos os registros". A faixa de erro logo acima já
         diz que falta o nome, e dizer duas vezes -- uma delas com aspas vazias
         -- só suja a lista que a pessoa precisa ler antes de aplicar. */
      if (!String(c.name || "").trim()) continue;
      itens.push({ grave: false, chave: "UI_IMPACT_ADDED", p: { field: c.name } });
      continue;
    }
    const de = c._de;
    if (de.type !== c.type) {
      itens.push({
        grave: true, chave: "UI_IMPACT_TYPE",
        p: { field: c.name, from: window.I.tipo(de.type), to: window.I.tipo(c.type) },
      });
    } else if (Number(c.len) < Number(de.len)) {
      itens.push({
        grave: true, chave: "UI_IMPACT_SHRUNK",
        p: { field: c.name, from: de.len, to: c.len },
      });
    }
    if (de.name !== c.name && !c._removido) {
      itens.push({ grave: false, chave: "UI_IMPACT_RENAMED", p: { from: de.name, to: c.name } });
    }
  }

  if (esOrdemMudou()) {
    itens.push({ grave: false, chave: "UI_IMPACT_REORDERED", p: {} });
  }

  return itens;
}

/* ---------------------------------------------------- T10: os botões */

/*
 * O EDITOR SO ABRE SOBRE UMA ESTRUTURA FRESCA.
 *
 * `garantirEstrutura` e assincrona, e o desenho da aba a dispara sem esperar --
 * o que basta para MOSTRAR a lista, porque ela se redesenha quando a resposta
 * chega. Nao basta para EDITAR: `esEntrarNoModo` fotografa `aba.fields` na
 * hora e essa foto vira o `_de` de cada campo, ou seja, a base de comparacao
 * da proxima alteracao. Abrir o editor sobre uma foto vencida faria a alteracao
 * seguinte ser montada contra um arquivo que ja nao existe.
 */
$("es-editar").addEventListener("click", async () => {
  const aba = abas.find((a) => a.h === abaAtiva);
  await garantirEstrutura(aba);
  esEntrarNoModo(true);
});

$("es-descartar").addEventListener("click", async () => {
  const mudou = esRascunho && esRascunho.some((c) => c._removido || !c._de || esMudou(c));
  if (mudou) {
    const r = await Swal.fire(
      swalBase({
        icon: "warning",
        title: T("UI_DISCARD_TITLE"),
        html: escapaHtml(T("UI_DISCARD_ASK")),
        showCancelButton: true,
        confirmButtonText: T("UI_DISCARD"),
        cancelButtonText: T("UI_CANCEL"),
      })
    );
    if (!r.isConfirmed) return;
  }
  esEntrarNoModo(false);
});

/*
 * Clicar numa linha a seleciona — mas SEM REDESENHAR.
 *
 * A primeira versão chamava `desenharConteudo()` aqui, e o clique no `select`
 * subia até a tabela: o combo abria e fechava no mesmo instante, porque o
 * redesenho DESTRUÍA o elemento que o navegador tinha acabado de abrir. O
 * mesmo mataria o cursor no meio de um nome sendo digitado.
 *
 * Selecionar é uma troca de classe. Redesenhar a tabela inteira para mover um
 * destaque era caro e errado — e o sintoma só aparece em quem usa, não em quem
 * lê o DOM.
 */
$("ed-estrutura").addEventListener("click", (ev) => {
  if (!esEditando) return;
  const el = alvo(ev);
  if (!el) return;

  const tr = el.closest("tr");
  if (!tr || !tr.dataset.i) return;

  esSelecionar(Number(tr.dataset.i));
});

/* Move o destaque trocando classes. Nenhum controle é recriado. */
function esSelecionar(i) {
  esSel = i;
  const corpo = $("ed-estrutura").querySelector("tbody");
  for (const tr of corpo.querySelectorAll("tr")) {
    tr.classList.toggle("sel", Number(tr.dataset.i) === i);
  }
  esBotoes();
}

/*
 * Liga e desliga os botões — e o de remover diz o que VAI fazer.
 *
 * Um botão que se chama "remover" sobre uma linha já removida mente sobre o
 * próprio efeito. Aqui ele vira "restaurar", com o ícone trocado.
 */
function esBotoes() {
  const temSel = esSel >= 0 && esRascunho && esSel < esRascunho.length;
  const c = temSel ? esRascunho[esSel] : null;
  const removido = !!(c && c._removido);

  const bDel = $("es-del");
  bDel.querySelector(".es-ico").textContent = removido ? "↺" : "−";
  $("es-del-rotulo").textContent = T(removido ? "UI_RESTORE_SHORT" : "UI_REMOVE_SHORT");
  bDel.title = removido
    ? T("UI_RESTORE_FIELD", { field: c.name })
    : T("UI_REMOVE_FIELD");
  bDel.classList.toggle("risco", !removido);
  bDel.disabled = !temSel;
  $("es-ins").disabled = !esRascunho;
  $("es-up").disabled = !temSel || esSel === 0;
  $("es-down").disabled = !temSel || esSel === esRascunho.length - 1;
}

function esNovoCampo() {
  return { name: "", type: "C", len: 10, dec: 0, _id: "n" + ++esSeq, _de: null };
}

/*
 * O CURSOR VAI PARA O NOME DA LINHA `i`.
 *
 * Um campo novo nasce sem nome, e sem nome ele é o único erro que trava o
 * Aplicar. Deixar o cursor fora dele obriga a mirar o mouse numa célula de
 * tabela antes de poder digitar aquilo que a tela está esperando -- e a linha
 * acabou de ser criada justamente para receber um nome.
 *
 * `desenharEditor()` é síncrono e recria os `<input>`, então o foco só pode ser
 * pedido DEPOIS dele: focar o elemento antigo não faz nada, porque ele já saiu
 * do documento.
 */
function esFocarNome(i) {
  const tr = $("ed-estrutura").querySelector('tbody tr[data-i="' + i + '"]');
  const inp = tr && tr.querySelector("input");
  if (inp) inp.focus();
}

$("es-add").addEventListener("click", () => {
  if (!esRascunho) return;
  esRascunho.push(esNovoCampo());
  esSel = esRascunho.length - 1;
  desenharEditor();
  esFocarNome(esSel);
});

/* Inserir ACIMA do selecionado. A posição do campo importa no DBF — é a ordem
   física dos bytes no registro — então "adicionar no fim" e "inserir aqui" são
   operações diferentes, e as duas são necessárias. */
$("es-ins").addEventListener("click", () => {
  if (!esRascunho) return;
  const i = esSel >= 0 ? esSel : esRascunho.length;
  esRascunho.splice(i, 0, esNovoCampo());
  esSel = i;
  desenharEditor();
  esFocarNome(esSel);
});

/*
 * Remover é MARCAR, não apagar da lista.
 *
 * A linha continua visível, riscada, até Aplicar. Some da tela imediatamente
 * quem some é o campo — e a pessoa perde a referência do que estava fazendo,
 * além de não ter como desfazer sem recomeçar. Campo NOVO, esse sim, sai de
 * vez: não há dado por trás dele para se lamentar.
 */
$("es-del").addEventListener("click", () => {
  if (!esRascunho || esSel < 0) return;
  const c = esRascunho[esSel];
  if (!c._de) {
    esRascunho.splice(esSel, 1);
    if (esSel >= esRascunho.length) esSel = esRascunho.length - 1;
  } else {
    c._removido = !c._removido;
  }
  desenharEditor();
});

const esMove = (d) => {
  if (!esRascunho || esSel < 0) return;
  const j = esSel + d;
  if (j < 0 || j >= esRascunho.length) return;
  const t = esRascunho[esSel];
  esRascunho[esSel] = esRascunho[j];
  esRascunho[j] = t;
  esSel = j;
  desenharEditor();
};

$("es-up").addEventListener("click", () => esMove(-1));
$("es-down").addEventListener("click", () => esMove(1));

/*
 * APLICAR — ainda inerte.
 *
 * A tela está pronta para ser julgada; a parte que reescreve o arquivo do
 * cliente ainda não existe. Dizer isso em voz alta é melhor que um botão que
 * não faz nada, e melhor que implementar antes de o desenho ser aprovado.
 */
/*
 * Aplicar a estrutura nova sobre um arquivo que JÁ TEM DADOS.
 *
 * É a operação mais perigosa da ferramenta inteira, e por isso ela pergunta
 * duas vezes: primeiro mostra o que vai acontecer com os dados (o mesmo bloco
 * de impacto que já está na tela, repetido aqui porque quem clica em "Aplicar"
 * pode não ter rolado até ele), depois oferece o backup.
 *
 * O que sai daqui para a DLL é a lista de campos com `from` -- o nome ORIGINAL
 * de cada um. É `from` que faz reordenar e renomear serem seguros: a DLL casa
 * origem e destino por esse nome, nunca por posição.
 */
async function esAplicar() {
  /*
   * O ALVO É `esAlvo`, e não `abaAtiva`.
   *
   * É aqui que o rascunho vira arquivo. Ler o handle da aba ativa faria a
   * estrutura montada para um arquivo ser gravada em outro se a aba de trás
   * mudasse -- sem erro nenhum, porque as duas são estruturas válidas. A modal
   * anota de quem é o rascunho na hora em que abre, e é esse handle que vale.
   */
  const alvo = esAlvo;
  const aba = abas.find((a) => a.h === alvo);
  if (!aba || aba.detached || !esRascunho) return;


  const arquivo = (aba.info && aba.info.file) || aba.alias;
  const graves = esImpacto().filter((i) => i.grave);

  const aviso = await Swal.fire(
    swalBase({
      icon: graves.length ? "warning" : "question",
      title: T("UI_MODIFY_TITLE"),
      html:
        escapaHtml(T("UI_MODIFY_ASK", { file: arquivo, n: (aba.info && aba.info.records) || 0 })) +
        (graves.length
          ? '<ul class="sw-lista">' +
            graves.map((i) => "<li>" + escapaHtml(T(i.chave, i.p)) + "</li>").join("") +
            "</ul>"
          : ""),
      showCancelButton: true,
      confirmButtonText: T("UI_GO_AHEAD"),
      cancelButtonText: T("UI_CANCEL"),
    })
  );
  if (!aviso.isConfirmed) return;

  const comBackup = await perguntarBackup();
  if (comBackup === null) return;

  const campos = esRascunho
    .filter((c) => !c._removido)
    .map((c) => ({
      name: c.name,
      type: c.type,
      len: c.len,
      dec: c.dec,
      // Campo novo não tem origem: nasce vazio em todos os registros.
      from: c._de ? c._de.name : "",
    }));

  /*
   * A MODAL FECHA ANTES DE A OPERAÇÃO COMEÇAR, e não depois.
   *
   * A barra de progresso -- com o botão Parar -- vive fora do diálogo. Um
   * `<dialog>` modal deixa INERTE tudo o que está fora dele, então, com a modal
   * aberta, reescrever 1,2 milhão de registros seria uma espera sem como
   * interromper: a barra aparece, o botão é pintado, e o clique não chega.
   * Medido: `elementFromPoint` no centro do Parar devolvia o próprio DIALOG.
   *
   * Se a operação falhar, a modal volta com o rascunho intacto -- perder uma
   * estrutura de vinte campos porque o arquivo estava travado seria punir a
   * pessoa por um problema que não é dela.
   */
  const guarda = { rascunho: esRascunho, original: esOriginal,
                   alvo: esAlvo, novo: esNovo, sel: esSel };
  esFechar();

  try {
    const r = await comProgresso(
      QDBU.rpc("struct.modify", { h: alvo, fields: campos, backup: comBackup })
    );

    // A grade em cache é da estrutura velha -- as colunas mudaram de nome.
    gradeDe.delete(alvo);
    colunasDe.delete(alvo);
    await repintarDoEstado();

    await Swal.fire(
      swalBase({
        icon: r.conversions ? "warning" : "success",
        title: T("UI_DONE"),
        html: escapaHtml(
          T("UI_MODIFY_OK", { file: r.file, n: r.after }) +
            " " + T("UI_MODIFY_FIELDS", { n: r.fields }) +
            (r.backup ? " " + T("UI_MODIFY_BACKUP", { file: r.backup }) : "") +
            (r.conversions ? " " + T("UI_MODIFY_LOST", { n: r.conversions }) : "")
        ) +
          /* Os índices caíram, e dizer QUAIS é o que permite reconstruí-los.
             Vai em bloco à parte porque é uma pendência de trabalho, não um
             relato do que acabou de acontecer. */
          ((r.indexes || []).length
            ? '<ul class="sw-lista sw-pend"><li>' +
              escapaHtml(T("WARN_INDEXES_DROPPED", { n: r.indexes.length })) +
              "<br>" + escapaHtml(r.indexes.join(", ")) +
              "</li></ul>"
            : ""),
        confirmButtonText: T("UI_OK"),
        showCancelButton: false,
      })
    );
  } catch (e) {
    await repintarDoEstado(); // o handle pode ter virado `detached` (R6)

    /* Devolve o rascunho e reabre -- mas só se o arquivo ainda está lá. Num
       handle perdido (R6) não há sobre o que editar, e a modal reaberta
       prometeria um Aplicar que vai recusar. */
    const aindaVale = abas.some((a) => a.h === guarda.alvo && !a.detached);
    if (guarda.alvo === null || aindaVale) {
      esAlvo = guarda.alvo; esOriginal = guarda.original;
      esRascunho = guarda.rascunho; esNovo = guarda.novo; esSel = guarda.sel;
      esEditando = true;
      desenharEditor();
      if (!$("dlg-estrutura").open) $("dlg-estrutura").showModal();
    }

    await Swal.fire(
      swalBase({
        icon: "error",
        title: T("UI_ERROR"),
        html: escapaHtml(msgErro(e)),
        confirmButtonText: T("UI_OK"),
        showCancelButton: false,
      })
    );
  }
}

/*
 * F5 COM RASCUNHO ABERTO PERGUNTA ANTES.
 *
 * Recarregar joga fora a estrutura montada, e F5 é tecla de dedo torto -- foi
 * assim que se perdeu um rascunho durante a validação desta tela.
 *
 * A pergunta é um SweetAlert, e NÃO um `beforeunload`. O `beforeunload` do
 * WebView2 abre um diálogo do próprio motor: some do DOM, não dá para validar
 * por CDP, e é exatamente o tipo de janela que trava o app quando não há
 * ninguém na frente da máquina para clicar. O diálogo da própria aplicação
 * responde à mesma necessidade e continua sendo nosso.
 */
document.addEventListener("keydown", async (ev) => {
  const recarregar =
    ev.key === "F5" || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "r");
  if (!recarregar || !esEditando) return;
  ev.preventDefault();
  const r = await Swal.fire(
    swalBase({
      icon: "warning",
      title: T("UI_RELOAD_TITLE"),
      html: escapaHtml(T("UI_RELOAD_ASK")),
      showCancelButton: true,
      confirmButtonText: T("UI_RELOAD_DISCARD"),
      cancelButtonText: T("UI_KEEP_EDITING"),
    })
  );
  if (r.isConfirmed) location.reload();
});

/*
 * DESCARTAR PERGUNTA quando há trabalho montado.
 *
 * Fechar sem aviso é barato de programar e caro para quem montou vinte campos.
 * Sem nada alterado, fecha direto -- confirmar o nada é ruído.
 */
async function esDescartar() {
  if (esTemMudanca()) {
    const r = await Swal.fire(
      swalBase({
        icon: "warning",
        title: T("UI_DISCARD_TITLE"),
        html: escapaHtml(T("UI_DISCARD_ASK")),
        showCancelButton: true,
        confirmButtonText: T("UI_DISCARD"),
        cancelButtonText: T("UI_KEEP_EDITING"),
      })
    );
    if (!r.isConfirmed) return;
  }
  esFechar();
}

$("es-descartar").addEventListener("click", esDescartar);

/* Esc é o gesto natural de fechar um diálogo, e o padrão do <dialog> fecha sem
   perguntar. Aqui ele passa pela mesma porta do botão Descartar. */
$("dlg-estrutura").addEventListener("cancel", (ev) => {
  ev.preventDefault();
  esDescartar();
});

$("es-aplicar").addEventListener("click", async () => {
  if (esNovo) {
    await abrirNovo();
    return;
  }
  await esAplicar();
});

/* ------------------------------------------- T10: gravar o arquivo novo */

/*
 * O caminho sugerido: a pasta da conexão e um nome que não colide.
 *
 * Nome padrão em maiúsculas e sem acento pela mesma regra dos campos -- é o que
 * o DBF aceita, e o que o resto da pasta vai parecer.
 */
function nvSugestao(dir) {
  const base = dir ? dir.replace(/[\\/]+$/, "") + SEP_BARRA : "";
  return base + T("UI_NEW_UNTITLED") + ".DBF";
}

function msgNovo(txt, classe) {
  const el = $("nv-msg");
  el.textContent = txt || "";
  el.className = "ff-msg" + (txt && classe ? " " + classe : "");
}

async function abrirNovo() {
  if (!esRascunho || !esNovo) return;
  const vivos = esRascunho.filter((c) => !c._removido);
  $("nv-caminho").value = nvSugestao(esNovo.dir);
  $("nv-resumo").textContent = T("UI_NEW_SUMMARY", {
    n: vivos.length,
    bytes: esTamanhoRegistro(esRascunho),
  });
  msgNovo("");
  $("dlg-novo").showModal();
  // O nome fica selecionado, sem a pasta nem a extensão: é a parte que a pessoa
  // veio trocar.
  const v = $("nv-caminho").value;
  const ini = v.lastIndexOf(SEP_BARRA) + 1;
  const fim = v.lastIndexOf(".");
  $("nv-caminho").focus();
  setTimeout(() => $("nv-caminho").setSelectionRange(ini, fim > ini ? fim : v.length), 0);
}

/*
 * Cria o arquivo. `substituir` só chega como `true` depois de a pessoa
 * confirmar no aviso -- a DLL recusa por padrão, e é ela que decide.
 */
async function nvCriar(substituir) {
  const caminho = $("nv-caminho").value.trim();
  if (!caminho) return;

  const campos = esRascunho
    .filter((c) => !c._removido)
    .map((c) => ({ name: c.name, type: c.type, len: c.len, dec: c.dec }));

  try {
    const r = await QDBU.rpc("struct.create", {
      path: caminho,
      fields: campos,
      replace: !!substituir,
    });

    $("dlg-novo").close();
    esEntrarNoModo(false);

    /* Abre o que acabou de nascer: criar um arquivo e não mostrá-lo obrigaria a
       procurá-lo na árvore para conferir se saiu como se pediu. */
    const a = await QDBU.rpc("file.open", { path: r.path });
    await repintarDoEstado();
    ativarAba(a.h);
    hint(T("UI_CREATED", { file: r.file, n: r.fields }));
    return;
  } catch (e) {
    /*
     * Já existe: PERGUNTA, não recusa seca.
     *
     * É o trâmite que todo aplicativo faz, e o próprio DBU original fazia em
     * DBUCOPY.PRG:194 (`rsvp( DBU_COPYTEXT2 )`). A DLL recusa por padrão porque
     * ela não pergunta nada; quem pergunta é a tela.
     */
    if (e.codigo === "ERROR_FILE_EXISTS") {
      const nome = (e.params && e.params.file) || caminho;
      const r = await Swal.fire(
        swalBase({
          icon: "warning",
          title: T("UI_OVERWRITE_TITLE"),
          html: escapaHtml(T("UI_OVERWRITE_ASK", { file: nome })),
          showCancelButton: true,
          confirmButtonText: T("UI_OVERWRITE"),
          cancelButtonText: T("UI_CANCEL"),
        })
      );
      if (r.isConfirmed) return nvCriar(true);
      return;
    }
    msgNovo(msgErro(e), sevErro(e));
  }
}

$("nv-criar").addEventListener("click", () => nvCriar(false));
$("nv-cancelar").addEventListener("click", () => $("dlg-novo").close());

/*
 * O ⌕ abre o seletor do sistema -- e é ATALHO, não a única porta.
 *
 * O campo ao lado aceita o caminho digitado, e é por ele que o fluxo funciona
 * mesmo sem ninguém na frente da máquina. Um seletor nativo é uma janela modal
 * do Windows: se ela abrir sem quem a feche, o app fica parado esperando.
 */
$("nv-procurar").addEventListener("click", async () => {
  const inv = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if (!inv) {
    msgNovo(T("ERROR_DIALOG_UNAVAILABLE"), "aviso");
    return;
  }
  try {
    const escolhido = await inv("plugin:dialog|save", {
      options: {
        title: T("UI_NEW_FILE"),
        defaultPath: $("nv-caminho").value.trim(),
        filters: [
          { name: T("UI_FT_DBF"), extensions: ["dbf"] },
          { name: T("UI_FT_ALL"), extensions: ["*"] },
        ],
      },
    });
    if (escolhido) $("nv-caminho").value = escolhido;
  } catch (e) {
    msgNovo(T("ERROR_DIALOG_FAILED", { detail: e.message || e }), "erro");
  }
});

/* ============================================================ T13: em massa */

/*
 * AS QUATRO OPERAÇÕES SÃO UMA TELA SÓ.
 *
 * Elas dividem o escopo inteiro -- FOR, WHILE e quantos registros --, que é a
 * parte difícil e a parte onde se erra. O que muda é o miolo: repaçar precisa
 * de campo e expressão, incluir-de precisa de arquivo e formato, deletar e
 * recuperar não precisam de nada.
 *
 * `msAlvo` guarda o handle de quem abriu, pela mesma razão do editor de
 * estrutura: a modal fica por cima, mas nada impede que a aba de trás mude, e
 * ler `abaAtiva` na hora de executar mandaria a operação para o arquivo errado.
 */
const MS_OPS = ["replace", "delete", "recall", "appendfrom"];
let msOp = "replace";
let msAlvo = null;

function msRotulo(op) {
  return T({ replace: "UI_MASS_REPLACE", delete: "UI_MASS_DELETE",
             recall: "UI_MASS_RECALL", appendfrom: "UI_MASS_APPEND" }[op]);
}

function msMsg(txt, classe) {
  const el = $("ms-msg");
  el.textContent = txt || "";
  el.className = "ff-msg" + (txt && classe ? " " + classe : "");
}

async function msAbrir() {
  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba || aba.detached) return;

  msAlvo = aba.h;
  msOp = "replace";
  msMsg("");
  $("ms-titulo").textContent = T("UI_MASS_ON", {
    file: (aba.info && aba.info.file) || aba.alias,
  });

  /* A lista de campos vem da estrutura já carregada; se ela ainda não veio, vem
     agora -- repaçar sem saber os campos não é uma tela, é um formulário em
     branco. */
  await garantirEstrutura(aba);
  const sel = $("ms-campo");
  sel.textContent = "";
  for (const c of aba.fields || []) {
    sel.appendChild(new Option(c.name + "  (" + window.I.tipo(c.type) + ")", c.name));
  }

  const fmt = $("ms-formato");
  fmt.textContent = "";
  for (const par of [["dbf", "UI_FMT_DBF"], ["csv", "UI_FMT_CSV"],
                     ["json", "UI_FMT_JSON"], ["sdf", "UI_FMT_SDF"]]) {
    fmt.appendChild(new Option(T(par[1]), par[0]));
  }

  /* "Detectar" é o padrão porque acerta sozinho na esmagadora maioria: conta
     `;` contra `,` na primeira linha. As opções explícitas existem para o
     arquivo esquisito em que a primeira linha mente. */
  const del = $("ms-delim");
  del.textContent = "";
  for (const par of [["", "UI_DELIM_AUTO"], [";", "UI_DELIM_SEMI"],
                     [",", "UI_DELIM_COMMA"], ["\t", "UI_DELIM_TAB"]]) {
    del.appendChild(new Option(T(par[1]), par[0]));
  }
  const cdp = $("ms-cdp");
  cdp.textContent = "";
  for (const par of [["UTF8", "UI_CDP_UTF8"], ["ANSI", "UI_CDP_ANSI"],
                     ["CP850", "UI_CDP_CP850"]]) {
    cdp.appendChild(new Option(T(par[1]), par[0]));
  }

  $("ms-cabecalho").checked = true;

  const modo = $("ms-modo");
  modo.textContent = "";
  for (const par of [["all", "UI_SCOPE_ALL_REC"], ["next", "UI_SCOPE_NEXT"],
                     ["rest", "UI_SCOPE_REST"]]) {
    modo.appendChild(new Option(T(par[1]), par[0]));
  }

  $("ms-with").value = "";
  $("ms-origem").value = pastaDe(aba.caminho || "");
  $("ms-for").value = "";
  $("ms-while").value = "";
  /*
   * COMEÇA EM 1, e não em 100.
   *
   * "Próximos" com 100 pré-carregado é um número que ninguém pediu na frente de
   * uma operação que apaga: se a pessoa não reparar, deleta 100 registros
   * achando que confirmou o que estava vendo. 1 é o menor estrago possível e o
   * significado literal de "o próximo" -- quem quer mais, digita.
   */
  $("ms-n").value = "1";

  msDesenhar();
  $("dlg-massa").showModal();
}

/* Só a pasta do caminho, para o campo de origem já começar no lugar certo. */
function pastaDe(caminho) {
  const i = Math.max(caminho.lastIndexOf("/"), caminho.lastIndexOf("\\"));
  return i >= 0 ? caminho.slice(0, i + 1) : "";
}

/* Redesenha o que depende da operação escolhida e do modo de escopo. */
function msDesenhar() {
  const tiras = $("ms-abas");
  tiras.textContent = "";
  for (const op of MS_OPS) {
    const b = elemento("button", "ms-aba" + (op === msOp ? " ativa" : ""), msRotulo(op));
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.op = op;
    b.addEventListener("click", () => { msOp = op; msMsg(""); msDesenhar(); });
    tiras.appendChild(b);
  }

  $("ms-replace").hidden = msOp !== "replace";
  $("ms-append").hidden = msOp !== "appendfrom";
  $("ms-explica").textContent = T("UI_MASS_EXPLAIN_" + msOp.toUpperCase());
  $("ms-with-rotulo").textContent = T("UI_MASS_WITH", { field: $("ms-campo").value || "" });
  $("ms-executar").textContent = msRotulo(msOp);

  /* "Quantos" só existe em PRÓXIMOS n. Um campo numérico aceso ao lado de
     "Tudo" convida a digitar um número que será ignorado. */
  $("ms-n").hidden = $("ms-modo").value !== "next";

  /*
   * DE ONDE VAI PARTIR, dito com todas as letras.
   *
   * "Próximos 100" e "do atual até o fim" são escopos RELATIVOS, e sem dizer
   * relativos a quê são um convite a alterar a parte errada do arquivo. O
   * número aqui é o mesmo que está marcado na grade atrás da modal.
   */
  const relativo = $("ms-modo").value !== "all";
  const onde = cursorDe.get(msAlvo);
  $("ms-partida").hidden = !relativo;
  if (relativo) {
    $("ms-partida").textContent = onde
      ? T("UI_MASS_FROM_RECORD", { n: onde })
      : T("UI_MASS_FROM_NONE");
    $("ms-partida").className = "ms-partida" + (onde ? "" : " ms-atencao");
  }

  /*
   * O AVISO DO RECORTE é a regra que mais surpreende.
   *
   * Diferente de alterar estrutura -- que vale para o ARQUIVO e por isso
   * neutraliza filtro e índice --, aqui a operação vale para O QUE ESTÁ NA
   * TELA. O DBU original trata isso como recurso, não descuido. Mas quem tem um
   * filtro ligado e manda "deletar tudo" precisa ver, antes, que "tudo" quer
   * dizer "tudo o que o filtro deixa passar".
   */
  const aba = abas.find((a) => a.h === msAlvo);
  const filtro = (aba && aba.info && aba.info.filter) || "";
  const li = $("ms-regra-recorte");
  li.textContent = filtro ? T("UI_MASS_RULE_FILTER", { expr: filtro }) : T("UI_MASS_RULE_NOFILTER");
  li.className = filtro ? "ms-atencao" : "";

  /* Cabeçalho e separador só existem em CSV. Num JSON as chaves JÁ são os
     nomes, e num SDF não há nem uma coisa nem outra. */
  const ehCsv = msOp === "appendfrom" && $("ms-formato").value === "csv";
  $("ms-csv").hidden = !ehCsv;

  /*
   * A NOTA agora é só do SDF, e o motivo mudou.
   *
   * Enquanto o delimitado passava pelo `__dbApp`, a nota avisava que não havia
   * progresso nem cancelamento. CSV e JSON passaram a ter os dois -- são lidos
   * pelo nosso próprio laço. O SDF continua com o motor do Harbour, e continua
   * merecendo o aviso.
   */
  const semProgresso = msOp === "appendfrom" && $("ms-formato").value === "sdf";
  $("ms-nota-texto").hidden = !semProgresso;
  if (semProgresso) $("ms-nota-texto").textContent = T("UI_MASS_TEXT_NOTE");

  /* Como os campos serão casados, dito antes de executar: por NOME quando há
     cabeçalho ou chaves, por POSIÇÃO quando não há. É a diferença entre o dado
     chegar na coluna certa e chegar na de ao lado. */
  const comoMapeia =
    msOp !== "appendfrom" ? "" :
    $("ms-formato").value === "dbf" ? "UI_MAP_BY_NAME_DBF" :
    $("ms-formato").value === "json" ? "UI_MAP_BY_NAME_JSON" :
    $("ms-formato").value === "sdf" ? "UI_MAP_BY_POSITION" :
    $("ms-cabecalho").checked ? "UI_MAP_BY_NAME_CSV" : "UI_MAP_BY_POSITION";
  $("ms-mapa").hidden = !comoMapeia;
  if (comoMapeia) $("ms-mapa").textContent = T(comoMapeia);
}

function msEscopo() {
  const e = { mode: $("ms-modo").value };
  if (e.mode === "next") e.n = Number($("ms-n").value || 0);
  const f = $("ms-for").value.trim();
  const w = $("ms-while").value.trim();
  if (f) e.for = f;
  if (w) e.while = w;
  return e;
}

/*
 * Executa. Uma confirmação, e só uma.
 *
 * O DBU original não confirmava NADA em repaçar, deletar e recuperar -- só o
 * botão " Ok " do diálogo, e o comando saía (DBUCOPY.PRG:930-988, 1064-1122).
 * Aqui há um aviso, porque um DELETE em 400 mil registros sem pergunta é o tipo
 * de coisa que se faz uma vez na vida. Mas só um: o autor decidiu não oferecer
 * cópia nestas quatro.
 */
async function msExecutar() {
  const aba = abas.find((a) => a.h === msAlvo);
  if (!aba || aba.detached) return;

  const escopo = msEscopo();

  /*
   * A WORK AREA VAI PARA ONDE A TELA MOSTRA, e vai AGORA.
   *
   * Entre abrir a modal e clicar em executar, qualquer `data.page` -- uma
   * rolagem, um refresh -- terá movido o ponteiro da DLL. Reafirmá-lo aqui é o
   * que faz "próximos n" começar no registro marcado, e não onde a paginação
   * por acaso parou.
   */
  if (escopo.mode !== "all" && cursorDe.has(msAlvo)) {
    try {
      await QDBU.rpc("data.goto", { h: msAlvo, recno: cursorDe.get(msAlvo) });
    } catch (e) {
      /* Recno fora de faixa: a própria operação recusa com o motivo. */
    }
  }

  const params = { h: msAlvo, scope: escopo };
  if (msOp === "replace") {
    params.field = $("ms-campo").value;
    params.with = $("ms-with").value.trim();
  } else if (msOp === "appendfrom") {
    params.path = $("ms-origem").value.trim();
    params.format = $("ms-formato").value;
    if (params.format === "csv") {
      params.header = $("ms-cabecalho").checked;
      if ($("ms-delim").value) params.delimiter = $("ms-delim").value;
      params.encoding = $("ms-cdp").value;
    }
  }

  const arquivo = (aba.info && aba.info.file) || aba.alias;
  const aviso = await Swal.fire(
    swalBase({
      icon: "warning",
      title: msRotulo(msOp),
      html: escapaHtml(
        T("UI_MASS_CONFIRM_" + msOp.toUpperCase(), {
          file: arquivo,
          field: params.field || "",
          source: params.path ? params.path.replace(/^.*[\\/]/, "") : "",
        }) + " " + T("UI_MASS_CONFIRM_SCOPE", { scope: msTextoDoEscopo(escopo) })
      ),
      showCancelButton: true,
      confirmButtonText: T("UI_GO_AHEAD"),
      cancelButtonText: T("UI_CANCEL"),
    })
  );
  if (!aviso.isConfirmed) return;

  /* Fecha ANTES de operar: a barra de progresso vive fora do diálogo, e um
     <dialog> modal deixa inerte tudo o que está fora dele -- o botão Parar
     ficaria inalcançável. Mesma lição da T10. */
  $("dlg-massa").close();

  try {
    const r = await comProgresso(QDBU.rpc("mass." + msOp, params));
    gradeDe.delete(msAlvo);
    await repintarDoEstado();
    await Swal.fire(
      swalBase({
        icon: "success",
        title: T("UI_DONE"),
        html: escapaHtml(msTextoDoResultado(r)),
        confirmButtonText: T("UI_OK"),
        showCancelButton: false,
      })
    );
  } catch (e) {
    await repintarDoEstado();
    /* Reabre com tudo preenchido: quem escreveu uma expressão de trinta
       caracteres e errou um parêntese quer corrigir, não redigitar. */
    if (abas.some((a) => a.h === msAlvo && !a.detached)) {
      if (!$("dlg-massa").open) $("dlg-massa").showModal();
      msMsg(msgErro(e), sevErro(e));
    } else {
      await Swal.fire(
        swalBase({ icon: "error", title: T("UI_ERROR"), html: escapaHtml(msgErro(e)),
                   confirmButtonText: T("UI_OK"), showCancelButton: false })
      );
    }
  }
}

function msTextoDoEscopo(e) {
  const chave = { all: "UI_SCOPE_ALL_REC", next: "UI_SCOPE_NEXT_N", rest: "UI_SCOPE_REST" }[e.mode];
  const partes = [T(chave, { n: e.n || 0 })];
  /* O ponto de partida entra na frase da confirmação: é a última chance de
     notar que "próximos 100" começa no registro errado. */
  if (e.mode !== "all" && cursorDe.has(msAlvo)) {
    partes.push(T("UI_MASS_FROM_RECORD", { n: cursorDe.get(msAlvo) }));
  }
  if (e.while) partes.push("WHILE " + e.while);
  if (e.for) partes.push("FOR " + e.for);
  return partes.join(" · ");
}

function msTextoDoResultado(r) {
  if (r.action === "appendfrom") {
    return T("UI_MASS_DONE_APPEND", { n: r.changed, file: r.file, total: r.records });
  }
  return T("UI_MASS_DONE_" + r.action.toUpperCase(), { n: r.changed, seen: r.seen });
}

$("pg-massa").addEventListener("click", msAbrir);
$("ms-cancelar").addEventListener("click", () => $("dlg-massa").close());
$("ms-executar").addEventListener("click", msExecutar);
$("ms-modo").addEventListener("change", msDesenhar);
$("ms-formato").addEventListener("change", msDesenhar);
$("ms-cabecalho").addEventListener("change", msDesenhar);
$("ms-campo").addEventListener("change", msDesenhar);

/* Só dígitos no "quantos", pela mesma razão do editor de estrutura: o campo
   numérico do navegador aceita `e`, `+` e `-`, que aqui não querem dizer nada. */
/*
 * O NÚMERO FICA SELECIONADO AO RECEBER O FOCO.
 *
 * Sem isto, clicar num campo que vale "1" deixa o cursor ao lado do 1: digitar
 * "50" produz "501" ou "150", e a pessoa precisa apagar antes de escrever. Com
 * a seleção, digitar SUBSTITUI -- é o que se espera, e a mesma decisão já
 * tomada nas células numéricas do editor de estrutura.
 *
 * No quadro seguinte, e não dentro do `focus`: chamado direto, o navegador
 * recolhe a seleção logo depois, ao terminar de processar o foco (e o `mouseup`
 * do clique). Medido no editor de estrutura, mesmo sintoma.
 */
$("ms-n").addEventListener("focus", () => setTimeout(() => $("ms-n").select(), 0));

$("ms-n").addEventListener("input", () => {
  const antes = $("ms-n").value;
  const so = antes.replace(/[^0-9]/g, "");
  if (so !== antes) $("ms-n").value = so;
});

$("ms-procurar").addEventListener("click", async () => {
  const inv = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if (!inv) { msMsg(T("ERROR_DIALOG_UNAVAILABLE"), "aviso"); return; }
  try {
    const escolhido = await inv("plugin:dialog|open", {
      options: { title: T("UI_MASS_PICK_SOURCE"), multiple: false, directory: false },
    });
    if (escolhido) $("ms-origem").value = escolhido;
  } catch (e) {
    msMsg(T("ERROR_DIALOG_FAILED", { detail: e.message || e }), "erro");
  }
});

// ------------------------------------------------------- T14: PACK e ZAP

/*
 * O PRIMEIRO CÓDIGO DESTA APLICAÇÃO QUE DESTRÓI DADO.
 *
 * Até aqui tudo só lia, ou criava arquivo novo ao lado. Daqui em diante o
 * arquivo do cliente muda — e por isso o fluxo tem duas perguntas, não uma.
 *
 *   1. avisa da perda e pergunta se segue
 *   2. pergunta se quer cópia antes
 *   3. executa
 *
 * As perguntas ficam AQUI e não na DLL: uma DLL que pergunta não tem como ser
 * testada sem GUI, e o cliente C precisa poder exercitar bulk.pack/bulk.zap.
 * A DLL recebe `backup` já decidido.
 */

/*
 * SweetAlert vestido com o tema do app.
 *
 * O `window.confirm()` que havia antes é modal do SISTEMA: sai com a cara do
 * Windows, ignora os 12 temas, e os botões vêm no idioma do SO e não no que a
 * pessoa escolheu. Pior, só tem duas saídas — e o fluxo do ZAP precisa de três
 * (com cópia, sem cópia, desistir). Com `confirm()` viravam duas caixas
 * empilhadas, e a segunda parece que o app está insistindo.
 */
/*
 * O ALVO DO SWEETALERT SEGUE O <dialog> MODAL ABERTO.
 *
 * `<dialog>.showModal()` põe o elemento na TOP LAYER do navegador, e tudo o que
 * está fora dela fica INERTE: continua sendo pintado, mas não recebe clique. O
 * SweetAlert se anexa ao `<body>` por padrão, ou seja, fora da top layer.
 *
 * O resultado é a tela "travada": a pergunta aparece, o fundo escurece, e o
 * clique no botão nunca chega -- ele é interceptado pelo conteúdo do diálogo,
 * que está por cima. Medido com `elementFromPoint` no centro do botão de
 * confirmar: devolvia o `<select>` da tabela de estrutura.
 *
 * Isto NÃO apareceu nos testes porque `.click()` programático não passa pela
 * camada de composição -- ele chama o manipulador direto. Só um clique de mouse
 * de verdade (`Input.dispatchMouseEvent`) expõe a falha.
 *
 * Apontar o `target` para o diálogo aberto põe o SweetAlert DENTRO da mesma
 * top layer, e o clique volta a chegar. Vale para qualquer diálogo modal que
 * venha a existir, e não só para o editor de estrutura.
 */
/*
 * A PILHA DE MODAIS, na ordem em que foram abertos.
 *
 * A top layer empilha na ordem das chamadas de `showModal()`, e não existe API
 * para perguntar quem está no topo. Varrer `dialog[open]` devolve a ordem do
 * DOCUMENTO, que é outra coisa: com o "Salvar como" aberto por cima do editor
 * de estrutura, a varredura entregaria o editor -- e o SweetAlert iria parar
 * debaixo do diálogo que está na frente, invisível e sem receber clique.
 *
 * O `showModal`/`close` são interceptados aqui para manter a ordem certa. Vale
 * para qualquer diálogo do app, inclusive os que ainda não existem.
 */
const pilhaModais = [];
(() => {
  const abrir = HTMLDialogElement.prototype.showModal;
  const fechar = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal = function () {
    abrir.call(this);
    const i = pilhaModais.indexOf(this);
    if (i >= 0) pilhaModais.splice(i, 1);
    pilhaModais.push(this);
  };
  HTMLDialogElement.prototype.close = function (v) {
    const i = pilhaModais.indexOf(this);
    if (i >= 0) pilhaModais.splice(i, 1);
    fechar.call(this, v);
  };
})();

function swalAlvo() {
  for (let i = pilhaModais.length - 1; i >= 0; i--) {
    if (pilhaModais[i].isConnected && pilhaModais[i].open) return pilhaModais[i];
  }
  return undefined; // undefined = o padrão do SweetAlert (o <body>)
}

function swalBase(extra) {
  return Object.assign(
    {
      customClass: { popup: "qdbu-swal", container: "qdbu-swal-fundo" },
      buttonsStyling: true,
      reverseButtons: true,
      focusCancel: true,
      heightAuto: false, // senão o SweetAlert mexe no <body> e a grade pula
      target: swalAlvo(),
    },
    extra || {}
  );
}

const escapaHtml = (t) =>
  String(t).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

/*
 * Pergunta em três saídas: "sim, com cópia" / "sim, sem cópia" / desistir.
 *
 * Devolve `true`, `false` ou `null` — e `null` (desistir) é o padrão de
 * qualquer coisa inesperada, porque o desfecho seguro é não fazer nada.
 */
async function perguntarBackup() {
  const r = await Swal.fire(
    swalBase({
      icon: "question",
      title: T("UI_ASK_BACKUP_TITLE"),
      html: escapaHtml(T("UI_ASK_BACKUP")),
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: T("UI_WITH_BACKUP"),
      denyButtonText: T("UI_WITHOUT_BACKUP"),
      cancelButtonText: T("UI_CANCEL"),
    })
  );
  if (r.isConfirmed) return true;
  if (r.isDenied) return false;
  return null;
}

/*
 * O fluxo completo, comum a PACK e ZAP.
 *
 * O aviso cita o ARQUIVO e os NÚMEROS deste arquivo — não é um "tem certeza?"
 * genérico. Aviso genérico ensina a clicar em OK sem ler, e depois de três
 * vezes ninguém lê mais nenhum.
 */
async function destrutiva(acao) {
  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba || aba.detached) return;

  const arquivo = (aba.info && aba.info.file) || aba.alias;
  const total = (aba.info && aba.info.records) || 0;

  const aviso = await Swal.fire(
    swalBase({
      icon: "warning",
      title: T(acao === "zap" ? "UI_ZAP_WARN_TITLE" : "UI_PACK_WARN_TITLE"),
      html: escapaHtml(
        T(acao === "zap" ? "UI_ZAP_WARN" : "UI_PACK_WARN", {
          file: arquivo,
          n: total,
        })
      ),
      showCancelButton: true,
      confirmButtonText: T("UI_GO_AHEAD"),
      cancelButtonText: T("UI_CANCEL"),
    })
  );
  if (!aviso.isConfirmed) return;

  const comBackup = await perguntarBackup();
  if (comBackup === null) return; // desistiu na segunda pergunta

  try {
    const r = await comProgresso(
      QDBU.rpc(acao === "zap" ? "bulk.zap" : "bulk.pack", {
        h: abaAtiva,
        backup: comBackup,
      })
    );

    // A grade em cache é de antes da operação: o arquivo mudou embaixo dela.
    gradeDe.delete(abaAtiva);
    await repintarDoEstado();

    await Swal.fire(
      swalBase({
        icon: "success",
        title: T("UI_DONE"),
        html: escapaHtml(mensagemDoResultado(acao, r)),
        confirmButtonText: T("UI_OK"),
        showCancelButton: false,
      })
    );
  } catch (e) {
    await repintarDoEstado(); // o handle pode ter virado `detached` (R6)
    await Swal.fire(
      swalBase({
        icon: "error",
        title: T("UI_ERROR"),
        html: escapaHtml(msgErro(e)),
        confirmButtonText: T("UI_OK"),
        showCancelButton: false,
      })
    );
  }
}

/* A frase do resultado, com os números do que realmente aconteceu. */
function mensagemDoResultado(acao, r) {
  if (acao === "zap") {
    return r.backup
      ? T("UI_ZAP_DONE_BACKUP", { file: r.file, n: r.before, backup: r.backup })
      : T("UI_ZAP_DONE", { file: r.file, n: r.before });
  }
  if (!r.removed) return T("UI_NOTHING_TO_PACK", { file: r.file });
  return r.backup
    ? T("UI_PACK_DONE_BACKUP", { file: r.file, n: r.removed, backup: r.backup })
    : T("UI_PACK_DONE", { file: r.file, n: r.removed });
}

$("pg-pack").addEventListener("click", () => destrutiva("pack"));
$("pg-zap").addEventListener("click", () => destrutiva("zap"));

/*
 * O MEMO EDITA NUMA MODAL, e não na célula.
 *
 * Memo é campo sem tamanho declarado: os arquivos reais têm de 20 bytes a
 * vários KB no mesmo campo. Um editor de 80 px de largura serviria para o
 * primeiro caso e seria inútil no segundo -- e é o segundo que justifica o
 * campo memo existir.
 *
 * O conteúdo vem do `raw` de `data.record` e não da grade: `data.page` manda só
 * o tamanho, de propósito (200 memos por página seriam megabytes a cada
 * rolagem). Houve um `data.memo`; ele saiu quando o `data.record` da R8 passou
 * a trazer o texto e os bytes de expectativa na MESMA leitura -- duas idas à
 * DLL para o mesmo registro abriam justamente a janela que a R8 fecha.
 */
/* O texto do memo no instante em que a modal abriu -- é o `expect` dele (R8). */
let memoAberto = null;

async function abrirEditorMemo(recno, campo) {
  const dlg = $("dlg-memo");
  const ta = $("memo-texto");
  const titulo = $("memo-titulo");

  await porCursorEm(abaAtiva, recno);

  try {
    // Uma leitura só: o registro (para a linha, se envelheceu) e o memo. Em
    // `raw`, um campo M já vem como TEXTO -- é assim que o expect do memo
    // funciona, porque o registro guarda só o número do bloco (R8).
    const r = await QDBU.rpc("data.record", { h: abaAtiva, recno });
    if (linhaMudou(recno, r.row)) {
      aplicarLinha(recno, r.row);
      hint(T("INFO_RECORD_REFRESHED", { n: recno }));
    }
    memoAberto = (r.raw && r.raw[campo]) || "";
    ta.value = memoAberto;
  } catch (e) {
    hint(msgErro(e));
    return;
  }

  titulo.textContent = T("UI_MEMO_TITLE", { field: campo, n: recno });
  dlg.dataset.recno = String(recno);
  dlg.dataset.campo = campo;
  $("memo-msg").textContent = "";
  atualizarContagemMemo();
  // A pilha de modais se mantém sozinha: showModal/close estão
  // instrumentados no fim deste arquivo, para o SweetAlert saber
  // sobre qual diálogo se ancorar.
  dlg.showModal();
  ta.focus();
}

/* O tamanho aparece enquanto se digita: memo não tem limite declarado, mas
   quem edita quer saber o que está criando. */
function atualizarContagemMemo() {
  $("memo-conta").textContent = T("UI_N_BYTES", { n: $("memo-texto").value.length });
}

async function gravarMemo() {
  const dlg = $("dlg-memo");
  const recno = Number(dlg.dataset.recno);
  const campo = dlg.dataset.campo;
  let expect = memoAberto === null ? undefined : { [campo]: memoAberto };

  for (;;) {
    try {
      // Grava por `data.update` -- o caminho único de escrita. Ver o comentário
      // de Api_Data_Memo em src/api_data.prg.
      const r = await QDBU.rpc("data.update", {
        h: abaAtiva,
        recno,
        values: { [campo]: $("memo-texto").value },
        expect,
      });
      aplicarLinha(recno, r.row);
      dlg.close();
      hint(T("INFO_RECORD_UPDATED", { n: recno, field: campo }));
      return;
    } catch (e) {
      if (e.codigo === "ERROR_STALE_VALUE") {
        const decisao = await perguntarColisao(e, recno);
        if (decisao === "sobrescrever") {
          expect = { [campo]: e.params.raw };
          continue;
        }
        if (decisao === "descartar") {
          dlg.close();
          await relerLinha(recno);
          return;
        }
      }
      // Não fecha: o texto digitado continua ali para ser corrigido.
      $("memo-msg").textContent = msgErro(e);
      $("memo-msg").className = "ff-msg erro";
      return;
    }
  }
}

/*
 * Inserir, excluir e recuperar.
 *
 * `data.delete` MARCA, não remove -- e é por isso que Recuperar existe ao lado,
 * com o mesmo peso visual. O DBU original já fazia esse par; uma tela que só
 * oferece "excluir" ensina que a marca é definitiva quando não é, e leva a
 * pessoa ao PACK para desfazer o que um clique desfaria.
 */
async function inserirRegistro() {
  try {
    const r = await QDBU.rpc("data.append", { h: abaAtiva });

    /*
     * Leva a grade até o registro novo -- ele nasce no FIM do arquivo, quase
     * sempre fora da página à vista, e "registro 8 acrescentado" sobre algo que
     * não se vê não é confirmação, é promessa.
     *
     * O deslocamento NEGATIVO é o que preserva o contexto: ancorar no novo com
     * offset 0 traz uma página que começa nele -- e como ele é o último, a
     * grade fica com UMA linha só e a pessoa perde o arquivo de vista. Voltando
     * uma página inteira antes de colher, ele aparece no fim de uma tela cheia,
     * que é onde a vista dela já estava.
     */
    /*
     * No FORMULÁRIO o registro novo simplesmente vira o registro à vista -- não
     * há página para reposicionar nem célula para abrir. Sem este desvio, quem
     * clicasse em "+ Registro" no formulário veria a grade recarregar por baixo
     * e o formulário continuar no registro anterior.
     */
    if (visaoAtiva === "form") {
      cursorDe.set(abaAtiva, r.recno);
      await carregarForm(abaAtiva, r.recno);
      hint(T("INFO_RECORD_ADDED", { n: r.recno }));
      const primeiro = $("fm-campos").querySelector(".fm-campo");
      if (primeiro) primeiro.focus();
      return;
    }

    await carregarPagina(abaAtiva, r.recno, -(tamanhoPagina - 1));
    await porCursorEm(abaAtiva, r.recno);

    /*
     * COM FILTRO ATIVO O REGISTRO NOVO PODE NÃO APARECER, e isso não é falha:
     * ele nasce em branco e um filtro como `CLI_EST == 'SP'` legitimamente o
     * exclui. O que não pode é a tela ficar calada -- a pessoa clicou, o hint
     * disse "acrescentado", e ela olharia uma grade onde nada mudou.
     */
    const td = celulaDe(r.recno, primeiroCampoEditavel());
    if (!td) {
      hint(T("INFO_RECORD_ADDED_HIDDEN", { n: r.recno }));
      return;
    }

    hint(T("INFO_RECORD_ADDED", { n: r.recno }));
    // Abre o editor no primeiro campo: um registro em branco existe para ser
    // preenchido, e obrigar um duplo clique a mais só adia o inevitável.
    abrirEditorCelula(td);
  } catch (e) {
    hint(msgErro(e));
  }
}

function primeiroCampoEditavel() {
  const p = gradeDe.get(abaAtiva);
  if (!p) return "";
  const c = p.cols.find((x) => x.type !== "M" && x.type !== "P");
  return c ? c.name : "";
}

async function marcarRegistro(excluir) {
  const recno = cursorDe.get(abaAtiva);
  if (!recno) {
    hint(T("UI_NO_CURRENT_RECORD"));
    return;
  }

  /*
   * R8 VALE PARA A MARCA TAMBÉM. Quem exclui decide OLHANDO a linha; se o
   * registro mudou depois que a tela o leu, a decisão foi tomada sobre outro
   * registro. Então: relê, mostra a diferença e pergunta -- e ainda assim
   * manda `expect`, porque entre a pergunta e a marca cabe outra escrita.
   *
   * No formulário a comparação é com TODOS os campos (é o que ele mostra); na
   * grade, com as colunas visíveis.
   */
  const aba = abas.find((a) => a.h === abaAtiva);
  const dados = visaoAtiva === "form" ? formDe.get(abaAtiva) : null;
  const noForm = !!(dados && dados.row && dados.row.recno === recno && aba && aba.fields);
  const fields = noForm ? aba.fields.map((f) => f.name) : undefined;

  for (;;) {
    let r0;
    try {
      r0 = await QDBU.rpc("data.record", { h: abaAtiva, recno, fields });
    } catch (e) {
      hint(msgErro(e));
      return;
    }

    const velha = noForm ? dados.row : (paginaDaAba(abaAtiva) || { rows: [] }).rows.find((l) => l.recno === recno);
    const cols = noForm ? dados.cols : (paginaDaAba(abaAtiva) || {}).cols;
    const dif = velha ? diferencaDaLinha(velha, r0.row, cols) : null;
    if (dif) {
      if (noForm) {
        dados.row = r0.row;
        dados.raw = r0.raw;
        desenharForm();
      }
      aplicarLinha(recno, r0.row, noForm ? dados.cols : undefined);
      hint(T("INFO_RECORD_REFRESHED", { n: recno }));
      if (!(await perguntarMarcaSobreLinhaVelha(excluir, recno, dif))) return;
    }

    try {
      const r = await QDBU.rpc(excluir ? "data.delete" : "data.recall", {
        h: abaAtiva,
        recno,
        expect: r0.raw,
        fields,
      });
      aplicarLinha(recno, r.row, noForm ? dados.cols : undefined);
      // A marca de excluído também é do formulário: sem isto, marcar no
      // formulário deixaria o distintivo apagado sobre um registro marcado.
      if (noForm) {
        dados.row = r.row;
        desenharForm();
      }
      hint(T(excluir ? "INFO_RECORD_DELETED" : "INFO_RECORD_RECALLED", { n: recno }));
      return;
    } catch (e) {
      // Mudou entre a leitura e a marca: volta ao começo, que relê e pergunta.
      if (e.codigo === "ERROR_STALE_VALUE") continue;
      hint(msgErro(e));
      return;
    }
  }
}

/* A primeira coluna cujo valor difere entre duas leituras da mesma linha. */
function diferencaDaLinha(velha, nova, cols) {
  if (!velha || !nova || !cols) return null;
  for (let i = 0; i < cols.length; i++) {
    const a = JSON.stringify(velha.values[i]);
    const b = JSON.stringify(nova.values[i]);
    if (a !== b) return { field: cols[i].name, expected: velha.values[i], actual: nova.values[i] };
  }
  return null;
}

async function perguntarMarcaSobreLinhaVelha(excluir, recno, dif) {
  const r = await Swal.fire(
    swalBase({
      icon: "warning",
      title: T("UI_STALE_TITLE"),
      html: escapaHtml(
        T(excluir ? "UI_STALE_DELETE_ASK" : "UI_STALE_RECALL_ASK", {
          n: recno,
          field: dif.field,
          expected: textoDeColisao(dif.expected),
          actual: textoDeColisao(dif.actual),
        })
      ),
      showCancelButton: true,
      confirmButtonText: T(excluir ? "UI_DELETE_ANYWAY" : "UI_RECALL_ANYWAY"),
      cancelButtonText: T("UI_CANCEL"),
      focusCancel: true,
    })
  );
  return r.isConfirmed;
}

/*
 * DUPLO CLIQUE ABRE O EDITOR; clique simples só move o cursor.
 *
 * Mesma convenção da árvore, onde um clique seleciona e dois abrem. Abrir no
 * clique simples poria a grade em edição sempre que alguém clicasse para
 * escolher a linha de um escopo -- e um editor aberto por engano sobre um
 * arquivo de cliente é exatamente o que a T8 não pode fazer.
 */
$("grade").addEventListener("dblclick", (ev) => {
  const td = ev.target.closest("td");
  if (!td || td.classList.contains("recno")) return;
  if (td.classList.contains("editando")) return;
  abrirEditorCelula(td);
});

/* Clique simples: cursor. Sem isto, Excluir partiria de uma linha que a pessoa
   não escolheu. */
$("grade").addEventListener("click", (ev) => {
  const td = ev.target.closest("td");
  if (!td || edicao) return;
  const tr = td.parentElement;
  const recno = Number((tr.querySelector("td.recno") || {}).textContent);
  if (recno) porCursorEm(abaAtiva, recno);
});

$("pg-inserir").addEventListener("click", inserirRegistro);
$("pg-excluir").addEventListener("click", () => marcarRegistro(true));
$("pg-recuperar").addEventListener("click", () => marcarRegistro(false));

$("memo-texto").addEventListener("input", atualizarContagemMemo);
$("memo-gravar").addEventListener("click", gravarMemo);
$("memo-fechar").addEventListener("click", () => $("dlg-memo").close());

/* ===================================================================
 * T9 -- FORMULÁRIO
 *
 * A MESMA linha da grade, virada de lado. A grade mostra muitos registros e
 * poucas colunas; o formulário mostra um registro e TODAS as colunas -- que é
 * o caso que a grade não resolve: 40 campos onde cabem 8, e um C(200) espremido
 * em 80 px.
 *
 * Três decisões que vêm daí:
 *
 * 1. MOSTRA TODOS OS CAMPOS, inclusive os que o painel Colunas escondeu. Ocultar
 *    ali é para caber na grade; repetir a escolha aqui tiraria do formulário a
 *    única razão de ele existir.
 *
 * 2. NÃO TEM BACKEND PRÓPRIO. Grava por `data.update`, o mesmo caminho da T8 --
 *    que já valida, trava por registro, e devolve a linha relida. Um segundo
 *    caminho de escrita teria de repetir as três recusas de tipo e envelheceria
 *    em separado.
 *
 * 3. O CURSOR É A LIGAÇÃO com a grade. Alternar as visões não muda de registro:
 *    quem estava na linha 12 vê a 12 no formulário e volta para a 12 na grade.
 *    Sem isso as duas seriam telas diferentes sobre o mesmo arquivo, e não duas
 *    vistas do mesmo registro.
 * =================================================================== */

/* O registro que o formulário tem em mãos, por handle. */
const formDe = new Map();

/*
 * Carrega no formulário o registro onde o cursor está.
 *
 * Pede a página de UM registro ancorada no cursor, com `fields` explícito: sem
 * ele a DLL serviria a seleção de colunas do handle, que é justamente o que o
 * formulário não quer.
 */
async function carregarForm(h, recno) {
  const aba = abas.find((a) => a.h === h);
  if (!aba || !aba.fields) return;

  const alvo = recno || cursorDe.get(h);
  if (!alvo) {
    formDe.delete(h);
    if (h === abaAtiva) desenharForm();
    return;
  }

  try {
    // `data.record`, e não `data.page`: traz o registro E os bytes crus de
    // cada campo na MESMA leitura (R8). Também posiciona a work area nele,
    // para Excluir/Recuperar partirem daqui.
    const r = await QDBU.rpc("data.record", {
      h,
      recno: alvo,
      fields: aba.fields.map((f) => f.name),
    });
    formDe.set(h, { row: r.row, cols: r.cols, records: r.records, raw: r.raw });
    cursorDe.set(h, r.row.recno);
  } catch (e) {
    formDe.set(h, null);
    fmMsg(msgErro(e), "erro");
  }
  if (h === abaAtiva) {
    desenharForm();
    atualizarRegistroAtual();
  }
}

function fmMsg(txt, classe) {
  const el = $("fm-msg");
  el.textContent = txt || "";
  el.className = "fm-msg" + (classe ? " " + classe : "");
}

/*
 * Desenha os campos.
 *
 * Cada campo já nasce editável -- não há "modo edição". Num formulário o
 * editável é o estado normal: exigir um duplo clique por campo, como na grade,
 * transformaria a tela feita para digitar na mais lenta de todas para digitar.
 * A grade é o contrário justamente porque lá o clique também serve para
 * escolher linha.
 */
function desenharForm() {
  const campos = $("fm-campos");
  const vazio = $("fm-vazio");
  const dados = formDe.get(abaAtiva);
  const aba = abas.find((a) => a.h === abaAtiva);

  campos.textContent = "";

  if (!aba || !dados || !dados.row) {
    vazio.hidden = false;
    vazio.textContent = T(aba && aba.info && aba.info.filter ? "UI_EMPTY_FILTERED" : "UI_EMPTY_PAGE");
    $("fm-pos").textContent = "";
    $("fm-deletado").hidden = true;
    return;
  }
  vazio.hidden = true;

  const { row, cols, records } = dados;
  $("fm-pos").textContent = T("UI_CURRENT_RECORD", {
    n: window.I.numero(row.recno),
    total: window.I.numero(records),
  });
  $("fm-deletado").hidden = !row.deleted;

  row.values.forEach((v, i) => {
    const col = cols[i];
    const linha = elemento("div", "fm-linha");

    const rot = elemento("label", "fm-rotulo", col.name);
    rot.htmlFor = "fm-" + col.name;
    // O tipo fica ao lado do nome, como na aba Estrutura: quem edita precisa
    // saber que ali cabem 10 caracteres ANTES de digitar 15 e levar recusa.
    rot.appendChild(elemento("span", "fm-tipo", tipoCurto(col)));
    linha.appendChild(rot);

    linha.appendChild(controleDoCampo(col, v, row.recno));
    campos.appendChild(linha);
  });
}

/* "C 40" · "N 12,2" · "M" -- a mesma notação da aba Estrutura. */
function tipoCurto(col) {
  if (col.type === "M" || col.type === "P") return col.type;
  if (col.type === "N") return col.type + " " + col.len + (col.dec ? "," + col.dec : "");
  if (col.type === "L" || col.type === "D") return col.type;
  return col.type + " " + col.len;
}

/*
 * O controle de um campo.
 *
 * Memo ganha `textarea` e ocupa a linha inteira -- é o campo que a grade não
 * conseguia mostrar, e para o qual a T8 precisou de uma modal. Aqui ele cabe no
 * lugar, sem modal nenhuma.
 */
function controleDoCampo(col, valor, recno) {
  const memo = col.type === "M" || col.type === "P";
  const el = document.createElement(memo ? "textarea" : "input");

  el.id = "fm-" + col.name;
  el.className = "fm-campo" + (memo ? " fm-memo" : "");
  el.dataset.campo = col.name;
  el.dataset.tipo = col.type;
  el.dataset.recno = String(recno);
  if (memo) el.rows = 4;

  if (memo) {
    // O texto do memo já veio no `raw` do MESMO data.record que trouxe o
    // registro -- uma leitura só, e é ela que vale como expect (R8).
    const dados = formDe.get(abaAtiva);
    el.value = (dados && dados.raw && dados.raw[col.name]) || "";
    el.dataset.original = el.value;
  } else {
    el.type = "text";
    el.value = textoDoValor(col, valor);
    el.dataset.original = el.value;
  }

  /*
   * GRAVA AO SAIR DO CAMPO, e só se mudou.
   *
   * `change` e não `input`: gravar a cada tecla mandaria uma escrita por
   * caractere ao arquivo do cliente, e encheria o log de alterações com uma
   * linha por letra -- o log existe para responder "o que mudou", não para
   * transcrever a digitação.
   */
  el.addEventListener("change", () => gravarCampo(el));

  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      el.value = el.dataset.original || "";
      fmMsg("");
      el.blur();
    } else if (ev.key === "Enter" && !memo) {
      // No memo o Enter é quebra de linha, e tem de continuar sendo.
      ev.preventDefault();
      el.blur();
    }
  });

  return el;
}

/* O valor formatado como a pessoa espera digitar -- mesma convenção da grade. */
function textoDoValor(col, v) {
  if (v === null || v === undefined) return "";
  if (col.type === "L") return v ? "S" : "N";
  if (col.type === "N") return typeof v === "number" ? v.toFixed(col.dec || 0).replace(".", ",") : String(v);
  if (col.type === "D") {
    const iso = String(v);
    return iso.length === 10 ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : iso;
  }
  return String(v);
}

/*
 * Grava um campo.
 *
 * A recusa DEVOLVE O FOCO ao campo e mantém o texto -- igual à célula da T8.
 * Um formulário que aceita o blur e deixa o valor recusado parado na tela faria
 * a pessoa sair achando que gravou.
 */
async function gravarCampo(el) {
  const original = el.dataset.original || "";
  if (el.value === original) return;

  const recno = Number(el.dataset.recno);
  const campo = el.dataset.campo;
  const aba = abas.find((a) => a.h === abaAtiva);
  const dados = formDe.get(abaAtiva);
  const fields = aba && aba.fields ? aba.fields.map((f) => f.name) : undefined;

  // R8: os bytes que o campo tinha quando o registro foi lido. O contrato é o
  // de confirmarEdicao(); a diferença é onde a pergunta aparece.
  let expect =
    dados && dados.raw && campo in dados.raw ? { [campo]: dados.raw[campo] } : undefined;

  for (;;) {
    try {
      const r = await QDBU.rpc("data.update", {
        h: abaAtiva,
        recno,
        values: { [campo]: el.value },
        expect,
        fields,
      });
      el.classList.remove("recusado");
      fmMsg(T("INFO_RECORD_UPDATED", { n: recno, field: campo }), "ok");

      // Reescreve o campo com o que FICOU no arquivo, não com o que foi digitado
      // -- mesma razão do `row` da T8. E atualiza a grade em memória, para
      // alternar de visão não mostrar o valor velho.
      if (dados && r.row) {
        dados.row = r.row;
        dados.raw = r.raw; // a próxima gravação confere contra os bytes NOVOS
        const i = dados.cols.findIndex((c) => c.name === campo);
        if (i >= 0 && el.dataset.tipo !== "M" && el.dataset.tipo !== "P") {
          el.value = textoDoValor(dados.cols[i], r.row.values[i]);
        }
      }
      el.dataset.original = el.value;
      aplicarLinha(recno, r.row, dados ? dados.cols : undefined);
      return;
    } catch (e) {
      if (e.codigo === "ERROR_STALE_VALUE") {
        const decisao = await perguntarColisao(e, recno);
        if (decisao === "sobrescrever") {
          expect = { [campo]: e.params.raw };
          continue;
        }
        if (decisao === "descartar") {
          // Mostra o registro como está no disco -- o que a pessoa digitou some
          // porque ela escolheu isso, e o valor do outro é o que fica.
          await carregarForm(abaAtiva, recno);
          return;
        }
      }
      el.classList.add("recusado");
      fmMsg(msgErro(e), "erro");
      el.focus();
      el.select();
      return;
    }
  }
}

/*
 * Navegação registro a registro.
 *
 * Anda pelo `data.page` com âncora e deslocamento, e não por `data.skip`: a
 * travessia tem de respeitar índice e filtro ativos, e é a página que sabe
 * disso. Um `skip` cru andaria na ordem física e o formulário discordaria da
 * grade sobre qual é "o próximo".
 */
async function navegarForm(para) {
  const aba = abas.find((a) => a.h === abaAtiva);
  if (!aba || !aba.fields) return;

  const dados = formDe.get(abaAtiva);
  const atual = dados && dados.row ? dados.row.recno : cursorDe.get(abaAtiva);

  let ancora = atual;
  let desloc = 0;
  if (para === "top") ancora = "top";
  else if (para === "bottom") ancora = "bottom";
  else if (!atual) ancora = "top";
  else desloc = para;

  try {
    const p = await QDBU.rpc("data.page", {
      h: abaAtiva,
      anchor: ancora,
      offset: desloc,
      count: 1,
      fields: aba.fields.map((f) => f.name),
    });

    /*
     * O LIMITE NÃO SE DETECTA POR `rows.length`.
     *
     * Medido em 04/09/2026: `data.page` com âncora no último registro e
     * `offset: 1` devolve UMA linha -- o próprio último -- com `eof: true`.
     * `dbSkip(1)` em EOF não sai do lugar, e a página volta o que encontrou.
     * A primeira versão testava `!p.rows.length` e por isso nunca avisava nada:
     * clicar ▶ no fim do arquivo não mudava a tela nem dizia por quê, e a
     * pessoa clica de novo achando que o botão falhou.
     *
     * O que denuncia o limite é o registro NÃO TER MUDADO depois de um pedido
     * de deslocamento -- fato que vale tanto para o fim quanto para o começo, e
     * que não depende de como o RDD trata EOF.
     */
    const chegou = p.rows.length ? p.rows[0].recno : null;
    if (chegou === null || (desloc !== 0 && chegou === atual)) {
      fmMsg(T(desloc < 0 ? "UI_AT_FIRST_RECORD" : "UI_AT_LAST_RECORD"), "aviso");
      return;
    }

    fmMsg("");
    // O `data.page` acima só serviu para achar QUAL é o próximo na ordem
    // vigente; o que se mostra vem de carregarForm(), numa leitura só com os
    // bytes crus (R8).
    await carregarForm(abaAtiva, chegou);
  } catch (e) {
    fmMsg(msgErro(e), "erro");
  }
}

$("fm-topo").addEventListener("click", () => navegarForm("top"));
$("fm-fim").addEventListener("click", () => navegarForm("bottom"));
$("fm-anterior").addEventListener("click", () => navegarForm(-1));
$("fm-proximo").addEventListener("click", () => navegarForm(1));

// ------------------------------------------------------ refresh automático (R9)
/*
 * A TELA ENVELHECE, E O DBU ORIGINAL SABIA DISSO.
 *
 * `TB_REFRESH_RATE 5`: a cada 5 s sem tecla, o browse do DBU relê o arquivo.
 * Aqui é o mesmo, com as mesmas duas regras: só quando ninguém está mexendo, e
 * sem mover nada que a pessoa esteja olhando. O R8 já garante que nenhuma
 * EDIÇÃO parte de dado velho; isto garante que a LEITURA também não fica velha.
 *
 * Quando NÃO roda: janela oculta, editor de célula aberto, qualquer modal ou
 * pergunta aberta, tarefa longa em andamento, foco num campo do formulário,
 * botão do mouse apertado, ou interação (roda, rolagem, tecla, clique) há
 * menos de 1 s.
 *
 * O que repinta: só se a página MUDOU (linhas ou total). Página igual só
 * renova o horário da leitura. E a rolagem é preservada: repintar é trocar as
 * linhas, não levar a pessoa de volta ao topo.
 *
 * Quanto custa: uma `data.page` (ou `data.record`, no formulário) por ciclo.
 * Sob filtro esparso num arquivo grande isso pode demorar, e a VM é uma só --
 * um refresh lento a cada 5 s deixaria TUDO lento. Por isso o intervalo se
 * adapta: nunca menos que 10× o que a última leitura levou, até 60 s.
 */
const AUTO_REFRESH_MS = 5000;
const AUTO_REFRESH_MAX_MS = 60000;
const AUTO_REFRESH_QUIETO_MS = 1000;
let autoTimer = null;
let autoOcupado = false;
let autoIntervalo = AUTO_REFRESH_MS;
let ultimaInteracao = 0;
let mouseApertado = false;

function marcarInteracao() {
  ultimaInteracao = Date.now();
}
document.addEventListener("wheel", marcarInteracao, { passive: true, capture: true });
document.addEventListener("scroll", marcarInteracao, { passive: true, capture: true });
document.addEventListener("keydown", marcarInteracao, { capture: true });
document.addEventListener(
  "mousedown",
  () => {
    mouseApertado = true;
    marcarInteracao();
  },
  { capture: true }
);
document.addEventListener(
  "mouseup",
  () => {
    mouseApertado = false;
    marcarInteracao();
  },
  { capture: true }
);

function telaOciosa() {
  if (document.hidden || !abaAtiva) return false;
  if (edicao || mouseApertado) return false;
  if (Date.now() - ultimaInteracao < AUTO_REFRESH_QUIETO_MS) return false;
  if (document.querySelector("dialog[open]")) return false;
  if (document.body.classList.contains("swal2-shown")) return false;
  if (!$("tarefa").hidden || vigiaTarefa) return false;
  const foco = document.activeElement;
  if (foco && ($("fm-campos").contains(foco) || foco.classList.contains("cel-editor"))) return false;
  return true;
}

function agendarAuto(ms) {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(cicloAuto, ms);
}

async function cicloAuto() {
  if (autoOcupado) return agendarAuto(autoIntervalo);
  if (!telaOciosa()) return agendarAuto(AUTO_REFRESH_QUIETO_MS);
  autoOcupado = true;
  const t0 = performance.now();
  try {
    if (visaoAtiva === "dados") await refrescarGrade();
    else if (visaoAtiva === "form") await refrescarForm();
  } catch (e) {
    /* refresh é acessório: nunca pode incomodar quem está trabalhando */
  } finally {
    autoOcupado = false;
    const dur = performance.now() - t0;
    autoIntervalo = Math.min(AUTO_REFRESH_MAX_MS, Math.max(AUTO_REFRESH_MS, Math.round(dur * 10)));
    agendarAuto(autoIntervalo);
  }
}

async function refrescarGrade() {
  const h = abaAtiva;
  const p = gradeDe.get(h);
  if (!p || !p.pedido) return;

  const novo = await QDBU.rpc("data.page", {
    h,
    anchor: p.pedido.ancora,
    offset: p.pedido.deslocamento,
    count: tamanhoPagina,
  });
  // A resposta pode chegar depois de a pessoa trocar de aba, navegar ou começar
  // a editar. Aí ela é jogada fora: o próximo ciclo pede de novo.
  if (h !== abaAtiva || gradeDe.get(h) !== p || visaoAtiva !== "dados" || !telaOciosa()) return;

  novo.pedido = p.pedido;
  const mudou = novo.records !== p.records || JSON.stringify(novo.rows) !== JSON.stringify(p.rows);
  gradeDe.set(h, novo);
  if (mudou) {
    const wrap = $("grade-wrap");
    const topo = wrap.scrollTop;
    const lado = wrap.scrollLeft;
    desenharGrade();
    wrap.scrollTop = topo;
    wrap.scrollLeft = lado;
  } else {
    atualizarBarraGrade(novo); // só o horário da leitura
  }
  // `data.page` move o ponteiro; o cursor da pessoa volta para onde estava.
  const rec = cursorDe.get(h);
  if (rec) QDBU.rpc("data.goto", { h, recno: rec }).catch(() => {});
}

async function refrescarForm() {
  const h = abaAtiva;
  const aba = abas.find((a) => a.h === h);
  const dados = formDe.get(h);
  if (!aba || !aba.fields || !dados || !dados.row) return;

  const recno = dados.row.recno;
  const r = await QDBU.rpc("data.record", { h, recno, fields: aba.fields.map((f) => f.name) });
  if (h !== abaAtiva || formDe.get(h) !== dados || visaoAtiva !== "form" || !telaOciosa()) return;

  // Os bytes novos valem como `expect` daqui em diante -- inclusive quando o
  // valor à vista não mudou (coluna escondida, ou estado que a tela achata).
  dados.raw = r.raw;
  dados.records = r.records;
  if (JSON.stringify(r.row) === JSON.stringify(dados.row)) return;

  dados.row = r.row;
  desenharForm();
  atualizarRegistroAtual();
  fmMsg(T("INFO_RECORD_REFRESHED", { n: recno }), "aviso");
  aplicarLinha(recno, r.row, dados.cols);
}

agendarAuto(AUTO_REFRESH_MS);
