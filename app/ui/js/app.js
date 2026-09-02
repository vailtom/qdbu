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
  const r = await DBU.rpc("workspace.list");
  conexoes = r.connections;
  desenhar();
}

async function abrirConexao(nome) {
  expandidas.add(nome);
  desenhar();

  try {
    const r = await DBU.rpc("workspace.files", { name: nome });
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
      const r = await DBU.rpc("workspace.files", { name: con.name });
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
  await DBU.rpc("workspace.remove", { name: nome });
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
  if (i.codepage) cx.appendChild(cartao(T("UI_CARD_CODEPAGE"), i.codepage));

  desenharGrade();
  desenharComboOrdem();

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
function desenharEstrutura(a) {
  const corpo = $("estrutura").querySelector("tbody");
  corpo.textContent = "";

  const emEdicao = esEditando && esRascunho;
  const lista = emEdicao ? esRascunho : (a.fields || []);

  $("es-editar").hidden = emEdicao || !a.fields;
  $("es-acoes").hidden = !emEdicao;
  $("es-confirmar").hidden = !emEdicao;

  lista.forEach((c, i) => {
    const tr = document.createElement("tr");

    if (!emEdicao) {
      tr.appendChild(elemento("td", "es-marca", ""));
      for (const [v, cls] of [
        [c.n, "num dim"], [c.name, "nome"], [c.type, "tipo"],
        [c.len, "num"], [c.dec, "num"],
      ]) {
        tr.appendChild(elemento("td", cls, String(v)));
      }
      corpo.appendChild(tr);
      return;
    }

    // --- modo edição ---------------------------------------------------
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
        desenharConteudo();
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
    tr.appendChild(esCelula(c, "len", "number", erros.some((e) => e.includes("LEN")), "num"));
    tr.appendChild(esCelula(c, "dec", "number", erros.some((e) => e.includes("DEC")), "num"));

    if (erros.length) tr.title = erros.map((e) => T(e)).join(" · ");
    corpo.appendChild(tr);
  });

  if (emEdicao) esResumo();
}

/* Mudou em relação ao que está no disco? */
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

function esCelula(c, campo, tipo, ruim, classe) {
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
  inp.disabled = !!c._removido;
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
  /* No `change` (ao sair do campo) a tabela se redesenha: é quando a validação
     cruzada — nome duplicado com OUTRA linha — precisa aparecer nas duas. */
  inp.addEventListener("change", () => desenharConteudo());
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
    desenharConteudo();
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

  $("es-erros").hidden = achados.length === 0;
  $("es-erros-titulo").textContent = T("UI_STRUCT_ERRORS", { n: achados.length }) + ":";

  for (const a of achados) {
    const li = document.createElement("li");
    const nome = elemento("button", "es-erro-campo", a.campo);
    nome.type = "button";
    nome.addEventListener("click", () => {
      esSelecionar(a.i);
      const tr = $("estrutura").querySelector('tbody tr[data-i="' + a.i + '"]');
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
function esMarcaDaLinha(c, i) {
  const tr = $("estrutura").querySelector('tbody tr[data-i="' + i + '"]');
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
  const mudou = esRascunho.some((c) => c._removido || !c._de || esMudou(c));

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
 * Carrega a estrutura da aba, uma vez so.
 *
 * Sob demanda de proposito: restaurar dez arquivos custaria dez file.open MAIS
 * dez file.info, tudo serializado na thread unica da VM, com a janela parada
 * antes de mostrar qualquer coisa. Assim se paga so pelo que se olha.
 *
 * O cache NAO invalida hoje, e esta certo enquanto nada altera estrutura de DBF.
 * Quando o T10 (editor de estrutura) chegar, isto vira bug: o usuario insere um
 * campo e continua vendo a lista antiga. A peca ja existe -- DBU.rev() traz o
 * contador da DLL, que sobe a cada mutacao -- e a condicao passa a ser
 * `aba.fields && aba.fieldsRev === DBU.rev()`. Anotado no T10 do plano.
 */
async function garantirEstrutura(aba) {
  if (!aba || aba.fields) return;
  try {
    aba.fields = (await DBU.rpc("file.info", { h: aba.h })).fields;
    desenharConteudo();
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
  const st = await DBU.rpc("session.state");

  conexoes = st.connections;

  // Preserva a estrutura ja carregada por arquivo; o resto vem do estado vivo.
  const antes = new Map(abas.map((a) => [a.h, a.fields]));
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
  }));

  /*
   * A GRADE DE UM ARQUIVO PERDIDO É DESCARTADA, e isto é a R6 inteira.
   *
   * Deixar as linhas na tela mostraria dados de um arquivo que não está mais
   * aberto — a falha silenciosa que docs/10-integridade.md existe para
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
  sincronizarPaineis();
  return st;
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
    const i = await DBU.rpc("file.open", { path: caminho, connection: conexao });
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
    if (!(e instanceof DBU.ErroDbu)) {
      await repintarDoEstado();
    }
  }
}

async function fecharAba(h) {
  try {
    await DBU.rpc("file.close", { h: h });
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
    const p = await DBU.rpc("data.page", {
      h: h,
      anchor: ancora,
      offset: deslocamento || 0,
      count: tamanhoPagina,
    });
    gradeDe.set(h, p);
    if (h === abaAtiva) desenharGrade();
  } catch (e) {
    hint(msgErro(e));
  }
}

/** Primeira pagina do arquivo, se ainda nao houver nada carregado. */
function garantirPagina(aba) {
  if (!aba || gradeDe.has(aba.h)) return;
  carregarPagina(aba.h, "top", 0);
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

    const tdn = elemento("td", "recno", String(linha.recno));
    if (linha.deleted) tdn.title = T("UI_DELETED_RECORD");
    tr.appendChild(tdn);

    linha.values.forEach((v, i) => tr.appendChild(celula(v, p.cols[i])));
    corpo.appendChild(tr);
  }

  atualizarBarraGrade(p);
}

/** Uma celula, formatada por tipo. */
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

function atualizarBarraGrade(p) {
  const nf = (n) => n.toLocaleString(window.I.idioma());
  const pos = $("pg-posicao");
  const ref = $("pg-refresh");

  if (!p) {
    pos.textContent = "—";
    ref.textContent = "";
    return;
  }

  // Com filtro ativo, p.records e o total FISICO do arquivo -- dizer "de 75"
  // sobre uma grade que so tem 73 linhas navegaveis leva a conclusao errada. Se
  // a contagem foi pedida, usa-se ela; senao diz-se "de ?", que e honesto.
  const aba = abas.find((a) => a.h === abaAtiva);
  const filtrado = !!(aba && aba.info && aba.info.filter);
  const cont = contagemDe.get(abaAtiva);
  const total = filtrado
    ? T("UI_FILTERED_SUFFIX", { n: cont == null ? T("UI_UNKNOWN_COUNT") : cont })
    : nf(p.records);

  pos.textContent = p.rows.length
    ? T("UI_PAGE_RANGE", { first: p.first, last: p.last, total: total })
    : T("UI_PAGE_RANGE_EMPTY", { total: total });

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

  // O botao Colunas so vale sobre a grade; na Estrutura ele nao tem o que
  // filtrar e ficaria aceso comandando um painel que ninguem ve.
  $("pg-colunas").hidden = qual !== "dados";
  $("pg-indices").hidden = qual !== "dados";
  $("pg-filtro").hidden = qual !== "dados";
  $("pg-exportar").hidden = qual !== "dados";

  if (qual === "dados") garantirPagina(abas.find((a) => a.h === abaAtiva));
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
    await DBU.rpc("data.goto", { h: abaAtiva, recno: n });
    await carregarPagina(abaAtiva, n, 0);
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
    const r = await DBU.rpc("fields.available", { h: h });
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
    const r = await DBU.rpc("fields.select", { h: h, fields: nomes });

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
    await DBU.rpc("fields.reset", { h: abaAtiva });
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
    const r = await DBU.rpc("index.available", { h: h });
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
    const r = await DBU.rpc("index.open", { h: abaAtiva, path: caminho });
    await aposMexerNoIndice(abaAtiva, r);
    hint(T("INFO_INDEX_OPENED", { order: r.order, key: r.orderKey }));
  } catch (e) {
    hint(msgErro(e));
  }
}

async function fecharIndice(caminho) {
  try {
    const r = await DBU.rpc("index.close", { h: abaAtiva, path: caminho });
    await aposMexerNoIndice(abaAtiva, r);
  } catch (e) {
    hint(msgErro(e));
  }
}

async function trocarOrdem(n) {
  try {
    const r = await DBU.rpc("index.setorder", { h: abaAtiva, order: Number(n) });
    await aposMexerNoIndice(abaAtiva, r);
    hint(r.order === 0
      ? T("UI_PHYSICAL_ORDER")
      : T("UI_ORDERED_BY", { key: r.orderKey }));
  } catch (e) {
    hint(msgErro(e));
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
    const r = await DBU.rpc("index.close", { h: abaAtiva, all: true });
    await aposMexerNoIndice(abaAtiva, r);
    hint(T("INFO_INDEXES_CLOSED"));
  } catch (e) {
    hint(msgErro(e));
  }
});

$("pg-ordem").addEventListener("change", (ev) => trocarOrdem(ev.target.value));

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
 * arquivo que o app confia. Mesmo raciocínio do docs/09-modelo-de-confianca.md.
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
    const r = await DBU.rpc("filter.values", { h: abaAtiva, field: campo });
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
    const r = await DBU.rpc("filter.set", { h: abaAtiva, expr: expr });
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
    const r = await DBU.rpc("filter.clear", { h: abaAtiva });
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
    const r = await DBU.rpc("expr.check", { h: abaAtiva, expr: expr, expect: "L" });
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
    const r = await comProgresso(DBU.rpc("filter.count", { h: abaAtiva }));
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
    const r = await DBU.rpc("data.seek", { h: abaAtiva, value: texto, soft: true });
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
      DBU.rpc("data.locate", {
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
    const k = await DBU.rpc("expr.check", { h: abaAtiva, expr: chave });
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
      const c = await DBU.rpc("expr.check", { h: abaAtiva, expr: cond, expect: "L" });
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
    const r = await comProgresso(DBU.rpc("index.create", corpo));
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
          const r = await comProgresso(DBU.rpc("index.create", corpo));
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

// O diálogo NÃO fecha ao concluir. É o antipadrão F do docs/05, e o autor do
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
    const r = await DBU.rpc("export.preview", corpo);
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
    const r = await comProgresso(DBU.rpc(metodo, corpoExport(caminho)));
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
 * deste projeto e HTML/JS estatico, sem Node e sem bundler (ver GUIA-DO-PROJETO.md).
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
    await DBU.rpc("session.save", {
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
    est = await DBU.rpc("session.load");
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
      const novo = await DBU.rpc("file.open", { path: p, connection: item.connection || "" });

      // Reaplica as colunas escolhidas. Se um campo sumiu porque a estrutura
      // mudou desde a ultima sessao, a DLL recusa a lista inteira -- entao os
      // que ainda existem sao filtrados aqui e o arquivo abre com o resto, em
      // vez de voltar mostrando os 197 campos sem explicacao.
      if (Array.isArray(item.fields) && item.fields.length) {
        const existem = new Set((novo.fields || []).map((c) => c.name));
        const validos = item.fields.filter((n) => existem.has(n));
        if (validos.length) {
          await DBU.rpc("fields.select", { h: novo.h, fields: validos });
        }
      }

      // O filtro pode nao valer mais: um campo citado pode ter sumido da
      // estrutura desde a ultima sessao. Falhar aqui nao pode impedir o arquivo
      // de abrir -- ele abre sem filtro, e o aviso diz por que.
      if (item.filter) {
        try {
          await DBU.rpc("filter.set", { h: novo.h, expr: item.filter });
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
  $("con-dir").value = "";
  $("con-nome").value = "";
  $("con-erro").hidden = true;
  dlg.showModal();
  $("con-dir").focus();
});

$("con-cancelar").addEventListener("click", () => dlg.close());

$("form-conexao").addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const erro = $("con-erro");
  erro.hidden = true;
  document
    .querySelectorAll("#form-conexao .culpado")
    .forEach((e) => e.classList.remove("culpado"));

  try {
    const r = await DBU.rpc("workspace.add", {
      dir: $("con-dir").value.trim(),
      nome: $("con-nome").value.trim(),
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
  const s = await DBU.status();

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
  pintar("busca", ajustarBusca);
  pintar("cdp", () => {
    $("cdp").textContent = portaCdp
      ? T("UI_CDP_PORT", { port: portaCdp })
      : T("UI_CDP_OFF");
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
      DBU.abrirPasta(con.dir).catch((e) =>
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
    const r = await DBU.rpc("log.days");
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
    const r = await DBU.rpc("log.read", {
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
  DBU.abrirPasta(dir).catch((e) =>
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
 * razão de o DBU existir. Recusar-se a operar não é segurança: é uma ferramenta
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
    await DBU.rpc("backup.check", {
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
  msgPrevoo(T("UI_BACKUP_DONE", { dir: paraExibir(r.dir) }), "ok");

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
    const r = await DBU.rpc("file.reconnect", { h: abaAtiva });
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
      DBU.rpc("backup.run", {
        h: prevooHandle,
        path: prevooOperacao ? "" : $("pv-destino").value.trim(),
        forOperation: prevooOperacao,
        confirmLarge: $("pv-confirma").checked,
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
 * docs/10-integridade.md). Fazer isso a cada tecla, num arquivo de 800 MB,
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
  esNovo = { dir: dirPadrao || "" };
  esEditando = true;
  esOriginal = [];
  /* Um campo para começar: uma tabela vazia com um botão "+" obriga a
     descobrir por onde se começa. */
  esRascunho = [{ name: "CODIGO", type: "C", len: 10, dec: 0, _id: "n" + ++esSeq, _de: null }];
  esSel = 0;
  desenharConteudo();
}

function esEntrarNoModo(ligado) {
  if (!ligado) esNovo = null;
  esEditando = ligado;
  $("es-acoes").hidden = !ligado;
  $("es-confirmar").hidden = !ligado;
  $("es-editar").hidden = ligado;
  if (ligado) {
    const aba = abas.find((a) => a.h === abaAtiva);
    esOriginal = (aba && aba.fields ? aba.fields : []).map((c) => ({
      name: c.name, type: c.type, len: c.len, dec: c.dec,
    }));
    esRascunho = esOriginal.map((c, i) => ({ ...c, _id: "o" + i, _de: { ...c } }));
    esSel = esRascunho.length ? 0 : -1;
  } else {
    esOriginal = esRascunho = null;
    esSel = -1;
  }
  desenharConteudo();
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

  const ordemMudou = esRascunho
    .filter((c) => !c._removido && c._de)
    .some((c, i, arr) => arr[i]._de && esOriginal[i] && esOriginal[i].name !== c._de.name);
  if (ordemMudou) itens.push({ grave: false, chave: "UI_IMPACT_REORDERED", p: {} });

  return itens;
}

/* ---------------------------------------------------- T10: os botões */

$("es-editar").addEventListener("click", () => esEntrarNoModo(true));

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
$("estrutura").addEventListener("click", (ev) => {
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
  const corpo = $("estrutura").querySelector("tbody");
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

$("es-add").addEventListener("click", () => {
  if (!esRascunho) return;
  esRascunho.push(esNovoCampo());
  esSel = esRascunho.length - 1;
  desenharConteudo();
});

/* Inserir ACIMA do selecionado. A posição do campo importa no DBF — é a ordem
   física dos bytes no registro — então "adicionar no fim" e "inserir aqui" são
   operações diferentes, e as duas são necessárias. */
$("es-ins").addEventListener("click", () => {
  if (!esRascunho) return;
  const i = esSel >= 0 ? esSel : esRascunho.length;
  esRascunho.splice(i, 0, esNovoCampo());
  desenharConteudo();
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
  desenharConteudo();
});

const esMove = (d) => {
  if (!esRascunho || esSel < 0) return;
  const j = esSel + d;
  if (j < 0 || j >= esRascunho.length) return;
  const t = esRascunho[esSel];
  esRascunho[esSel] = esRascunho[j];
  esRascunho[j] = t;
  esSel = j;
  desenharConteudo();
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
$("es-aplicar").addEventListener("click", async () => {
  /* Criar já funciona; alterar a estrutura de um arquivo existente ainda não.
     Dizer isso em voz alta é melhor que um botão que não faz nada. */
  if (esNovo) {
    await abrirNovo();
    return;
  }
  await Swal.fire(
    swalBase({
      icon: "info",
      title: T("UI_NOT_YET_TITLE"),
      html: escapaHtml(T("UI_NOT_YET")),
      confirmButtonText: T("UI_OK"),
      showCancelButton: false,
    })
  );
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
    const r = await DBU.rpc("struct.create", {
      path: caminho,
      fields: campos,
      replace: !!substituir,
    });

    $("dlg-novo").close();
    esEntrarNoModo(false);

    /* Abre o que acabou de nascer: criar um arquivo e não mostrá-lo obrigaria a
       procurá-lo na árvore para conferir se saiu como se pediu. */
    const a = await DBU.rpc("file.open", { path: r.path });
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
function swalBase(extra) {
  return Object.assign(
    {
      customClass: { popup: "dbu-swal", container: "dbu-swal-fundo" },
      buttonsStyling: true,
      reverseButtons: true,
      focusCancel: true,
      heightAuto: false, // senão o SweetAlert mexe no <body> e a grade pula
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
      DBU.rpc(acao === "zap" ? "bulk.zap" : "bulk.pack", {
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
