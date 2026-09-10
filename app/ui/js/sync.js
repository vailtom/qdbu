/*
 * sync.js -- Sincronizar estrutura: pasta de referencia contra pasta alvo.
 *
 * O ERP do autor tem "Rastrear base de dados -> Estrutura de dados": duas
 * listas (tabelas com problema, campos com problema), a descricao do problema
 * por campo, F3 reestrutura uma, F7 reestrutura todas. O Navicat faz o mesmo
 * entre dois bancos. Aqui a referencia e OUTRA PASTA de DBFs (decisao do
 * autor, 09/09/2026) -- a base de homologacao contra a do cliente.
 *
 * QUEM DECIDE E A PESSOA. Quando o cliente tem o campo maior, ou tem um campo
 * que a referencia nao tem, nao ha padrao certo: o ERP mantem, o Navicat
 * iguala. Cada campo divergente pede uma escolha explicita, e Aplicar so
 * libera quando nao falta nenhuma. A DLL recusa compor sem escolha
 * (ERROR_SYNC_CHOICE_MISSING) -- a tela e a primeira barreira, nao a unica.
 *
 * NADA AQUI ESCREVE POR CONTA PROPRIA. Comparar e compor sao leitura pura
 * (struct.diff, struct.compose). Quem escreve e o struct.modify do T10, um
 * arquivo por vez, com o proprio backup, e o struct.create para o que falta.
 * Falha num arquivo nao para os outros: cada um e uma operacao independente,
 * e o resultado lista o que foi, o que falhou e o que nao chegou a rodar.
 *
 * Fechado em IIFE como todo arquivo novo de app/ui/js: so `window.Sync`
 * atravessa. Os nomes de app.js (`$`, `T`, `hint`, `swalBase`, `conexoes`,
 * `avulsa`, `insistirEmUso`, `comProgresso`, `perguntarBackup`...) sao
 * resolvidos na hora da chamada, nunca na carga -- e a mesma armadilha do
 * `escapaHtml` registrada no construtor.
 *
 * OS IDENTIFICADORES DAQUI SAO EM INGLES, pela regra do guia para codigo novo
 * -- o repositorio e publico e quem chega de fora precisa conseguir ler. Tres
 * excecoes, e todas por serem CONTRATO DE FORA:
 *
 *   `.ok` / `.valor` / `.erro` / `.desistiu`  o que o `insistirEmUso` do
 *                                             app.js devolve
 *   `sy-...` (ids) e `data-visao`             markup, na convencao do app
 *                                             inteiro (ff-, ms-, ex-)
 *   `conexoes`, `avulsa`, `abas`              globais do app.js
 *
 * Renomear so deste lado qualquer um dos tres quebraria em silencio, que e
 * exatamente como o JS deste projeto costuma quebrar.
 */
(function () {
  "use strict";

  const OTHER = "__outra__";

  /*
   * OS DOIS LADOS -- e as tres coisas que os nomeiam, cada uma na sua lingua.
   *
   * `key` e o estado (identificador nosso: ingles). `id` e o controle no HTML
   * (markup, na convencao do app inteiro -- `sy-`, `ff-`, `ms-`, `ex-`).
   * `pickTitle` e a chave do dicionario, que e CONTRATO e por isso tambem
   * ingles. Antes era uma string so fazendo os tres papeis, e a chave saia
   * `UI_SYNC_PICK_TITLE_ORIGEM`: portugues no unico espaco que o guia aponta
   * como ja-certo. Apontado em revisao, 09/09/2026.
   */
  const SIDES = [
    { key: "source", id: "sy-origem", pickTitle: "UI_SYNC_PICK_TITLE_SOURCE" },
    { key: "target", id: "sy-alvo",   pickTitle: "UI_SYNC_PICK_TITLE_TARGET" },
  ];
  const ACTIONABLE = new Set(["differs", "missingInTarget"]);

  /** Estado do dialogo. `null` fora dele. */
  let S = null;

  // ------------------------------------------------------------ abrir

  /**
   * Abre o dialogo. `alvo` (dir) vem pre-preenchido quando se entra pelo menu
   * da conexao; pelo botao da barra os dois lados sao escolhidos aqui.
   */
  async function openSync(targetDir) {
    S = {
      target: targetDir || "",
      source: "",
      byPos: false,
      diff: null,
      sel: null,
      choices: new Map(),
      withData: new Set(),
      marked: new Set(),
      onlyDiff: true,
      view: "dif",         /* a visao de abertura -- ver o comentario de selectFile */
      search: "",
      stop: false,
      running: false,
    };
    try {
      const cfg = await QDBU.rpc("config.get", {});
      S.byPos = !!cfg.syncByPosition;
    } catch (e) {
      /* a preferencia e acessorio: sem ela, desligada */
    }
    $("sy-pos").checked = S.byPos;
    $("sy-so-dif").checked = true;
    $("sy-busca").value = "";
    buildPickers();
    clearResult();
    $("dlg-sync").showModal();
  }

  /*
   * Os dois seletores oferecem o que a pessoa ja tem cadastrado -- conexoes e
   * a pasta avulsa -- mais "outra pasta...", que abre o seletor do sistema. O
   * caminho escolhido vira uma opcao propria, para poder ser trocado de lado
   * pelo botao sem ter de procurar de novo.
   */
  function buildPickers() {
    for (const side of SIDES) {
      const sel = $(side.id);
      sel.textContent = "";
      sel.appendChild(new Option(T("UI_SYNC_PICK"), ""));
      for (const c of conexoes) {
        if (!c.exists) continue;
        sel.appendChild(new Option(c.name + "  —  " + paraExibir(c.dir), c.dir));
      }
      if (avulsa && avulsa.dir) {
        sel.appendChild(new Option(avulsa.name + "  —  " + paraExibir(avulsa.dir), avulsa.dir));
      }
      sel.appendChild(new Option(T("UI_SYNC_OTHER_FOLDER"), OTHER));
      const current = S[side.key];
      if (current && ![...sel.options].some((o) => o.value === current)) {
        sel.insertBefore(new Option(paraExibir(current), current), sel.lastElementChild);
      }
      sel.value = current || "";
    }
  }

  async function pickOtherFolder(side) {
    const sel = $(side.id);
    const previous = S[side.key];
    try {
      const chosen = await escolherNoSistema({
        title: T(side.pickTitle), multiple: false, directory: true,
      });
      if (!chosen) {
        sel.value = previous || "";
        return;
      }
      const changed = S[side.key] !== chosen;
      S[side.key] = chosen;
      buildPickers();
      if (changed && S.diff) clearResult();
    } catch (e) {
      sel.value = previous || "";
      hint(msgErro(e));
    }
  }

  // ------------------------------------------------------------ comparar

  function clearResult() {
    S.diff = null;
    S.sel = null;
    S.choices.clear();
    S.withData.clear();
    S.marked.clear();
    paintFiles();
    paintFields();
    paintSummary();
  }

  async function compare() {
    if (!S.source || !S.target) {
      syncMsg(T("ERROR_SYNC_NEED_BOTH"), "aviso");
      return;
    }
    const button = $("sy-comparar");
    button.disabled = true;
    syncMsg(T("UI_SYNC_COMPARING"), "");
    try {
      const r = await QDBU.rpc("struct.diff", {
        source: { dir: S.source }, target: { dir: S.target }, byPosition: S.byPos,
      });
      S.diff = r;
      S.sel = null;
      S.choices.clear();
      S.withData.clear();
      S.marked.clear();
      /* Marcar de saida o que e ACIONAVEL: a pessoa abre a tela para
         sincronizar, e desmarcar um ou dois e menos trabalho que marcar cem. */
      for (const f of r.files) if (ACTIONABLE.has(f.status)) S.marked.add(f.name);
      syncMsg("", "");
      paintFiles();
      const first = r.files.find((f) => ACTIONABLE.has(f.status));
      selectFile(first ? first.name : null);
      paintSummary();
    } catch (e) {
      syncMsg(msgErro(e), "erro");
    } finally {
      button.disabled = false;
    }
  }

  // ------------------------------------------------------------ pintar

  const fileByName = (name) => (S.diff ? S.diff.files.find((f) => f.name === name) : null);

  const isVisible = (f) => {
    if (S.onlyDiff && f.status === "same") return false;
    if (S.search && !f.name.toLowerCase().includes(S.search)) return false;
    return true;
  };

  function paintFiles() {
    const ul = $("sy-arquivos");
    ul.textContent = "";
    if (!S.diff) {
      $("sy-arquivos-vazio").hidden = false;
      $("sy-arquivos-vazio").textContent = T("UI_SYNC_NO_COMPARE_YET");
      return;
    }
    let n = 0;
    for (const f of S.diff.files) {
      if (!isVisible(f)) continue;
      n++;
      const li = document.createElement("li");
      li.className = "sy-arq" + (f.name === S.sel ? " sel" : "");
      li.dataset.name = f.name;

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "sy-marca";
      chk.disabled = !ACTIONABLE.has(f.status);
      chk.checked = S.marked.has(f.name);
      chk.title = T("UI_SYNC_MARK_TITLE");
      li.appendChild(chk);

      const name = document.createElement("span");
      name.className = "sy-nome";
      name.textContent = f.name;
      li.appendChild(name);

      const selo = document.createElement("span");
      selo.className = "sy-selo " + f.status;
      selo.textContent = T("UI_SYNC_STATUS_" + f.status);
      li.appendChild(selo);

      if (S.withData.has(f.name)) {
        const d = document.createElement("span");
        d.className = "sy-comdados";
        d.title = T("UI_SYNC_WITH_DATA_TITLE");
        li.appendChild(d);
      }

      const pending = pendingIn(f);
      if (pending > 0) {
        const bal = document.createElement("span");
        bal.className = "sy-pend";
        bal.textContent = String(pending);
        bal.title = T("UI_SYNC_PENDING", { n: pending });
        li.appendChild(bal);
      }
      ul.appendChild(li);
    }
    $("sy-arquivos-vazio").hidden = n > 0;
    $("sy-arquivos-vazio").textContent = T("UI_SYNC_NO_FILES");
  }

  /*
   * Quais diagnosticos PEDEM escolha: extra (manter/remover) e os que mudam a
   * definicao (manter/adotar). `missing` nasce em branco e `position` so muda
   * de lugar -- nenhum dos dois perde dado, entao nao perguntam.
   */
  const needsChoice = (d) => d.kinds.some((k) => k === "extra" || k === "type" || k === "len" || k === "dec");

  function pendingIn(f) {
    if (f.status !== "differs") return 0;
    const picks = S.choices.get(f.name) || {};
    return f.diagnostics.filter((d) => needsChoice(d) && !picks[d.field]).length;
  }

  const defText = (c) => (c ? c.type + " " + c.len + (c.dec ? "," + c.dec : "") : "—");

  /*
   * TODAS as linhas de campo, na ORDEM que o `compose` usaria -- e nao so os
   * diagnosticos.
   *
   * Ver o que CONFERE e o pedido do autor (09/09/2026): o DBU nao tinha, o
   * Navicat tem, e sem isso a tela responde "o que esta errado" mas nao "como
   * esta". Numa tabela de 51 campos, conferir os 47 que batem e o que da
   * confianca para mexer nos 4 que nao batem.
   *
   * A ordem e a do resultado -- referencia com `byPosition`, senao o alvo, o
   * que so existe de um lado no fim --, entao a lista ja mostra COMO VAI
   * FICAR, e nao duas listas que a pessoa tem de casar de cabeca.
   */
  function rowsOf(f) {
    const hS = new Map(f.source.map((c) => [c.name, c]));
    const hT = new Map(f.target.map((c) => [c.name, c]));
    /* A TABELA QUE VAI NASCER nao tem `diagnostics` -- a DLL nao os gera para
       `missingInTarget`, porque o arquivo inteiro e a diferenca. A tela
       sintetiza um `missing` por campo para caber na MESMA tabela dos outros
       casos: uma lista solta ali quebrava o layout (apanhado pelo autor em
       09/09/2026) e obrigava o olho a reaprender a leitura a cada arquivo. */
    const hD = new Map(
      f.status === "missingInTarget"
        ? f.source.map((c) => [c.name, { field: c.name, kind: "novo", kinds: ["novo"], source: c, target: null }])
        : f.diagnostics.map((d) => [d.field, d])
    );
    const base = S.byPos ? f.source : f.target;
    const other = S.byPos ? f.target : f.source;
    const seen = new Set();
    const order = [];
    for (const c of base) { order.push(c.name); seen.add(c.name); }
    for (const c of other) if (!seen.has(c.name)) order.push(c.name);
    /*
     * A POSICAO E NUMERADA AQUI, sobre a lista INTEIRA -- nunca sobre a
     * filtrada.
     *
     * O numero e a posicao do campo no arquivo COMO ELE VAI FICAR, e e por ele
     * que a pessoa vai procurar depois ("a descricao e o segundo"). Numerar as
     * linhas visiveis daria 1,2,3 na visao "so as diferencas" e mentiria sobre
     * onde o campo esta -- num sistema que le campo por POSICAO, como o ERP do
     * autor, essa mentira e cara. Filtrado, os numeros pulam (1, 6, 7, 9...),
     * e o pulo e a informacao.
     */
    /*
     * O CAMPO REMOVIDO NAO OCUPA POSICAO -- ele nao vai existir.
     *
     * Numerar sobre a lista inteira dava A=1, B=2, C=3 com B marcado para
     * remover, quando o arquivo nasce A=1, C=2: a coluna mentia sobre TODOS os
     * campos depois do primeiro `drop`, que e justamente a promessa que o
     * comentario acima faz ("a posicao do campo no arquivo COMO ELE VAI
     * FICAR"). Quem sai da lista mostra travessao, e o travessao ja diz que
     * aquela linha nao tera lugar nenhum. Apontado em revisao, 09/09/2026.
     */
    const picks = S.choices.get(f.name) || {};
    let pos = 0;
    return order.map((n) => {
      const d = hD.get(n) || null;
      const removed = !!d && d.kinds.includes("extra") && (picks[n] === "drop" || picks[n] === "adopt");
      return {
        pos: removed ? null : ++pos,
        removed: removed,
        field: n, src: hS.get(n) || null, tgt: hT.get(n) || null, d: d,
      };
    });
  }

  const inView = (l) => (S.view === "todos" ? true : S.view === "iguais" ? !l.d : !!l.d);

  /*
   * A COLUNA DE POSICAO DEPENDE DA ESCOLHA, e por isso e reescrita a cada
   * radio -- marcar um campo para remover tira dele o lugar e adianta todos os
   * seguintes.
   *
   * So os NUMEROS sao reescritos, e nao a tabela: repintar recria os nos sob o
   * dedo de quem acabou de clicar (a mesma armadilha do dblclick registrada no
   * construtor) e perderia a rolagem numa tabela de 126 campos. E a conta vem
   * de `rowsOf`, que enxerga a lista INTEIRA -- a visao "so as diferencas"
   * esconde linhas, e numerar as visiveis diria 1,2,3 sobre um arquivo em que
   * o campo e o nono. Achado clicando, 09/09/2026.
   */
  function renumber(f) {
    const porNome = new Map(rowsOf(f).map((l) => [l.field, l]));
    for (const tr of $("sy-campos").querySelectorAll("tbody tr")) {
      const l = porNome.get(tr.dataset.field);
      if (!l) continue;
      tr.cells[0].textContent = l.pos === null ? "—" : String(l.pos);
      tr.cells[0].classList.toggle("sai", !!l.removed);
    }
  }

  function paintFields() {
    const f = S.sel ? fileByName(S.sel) : null;
    const title = $("sy-campos-titulo");
    const body = $("sy-campos");
    body.textContent = "";
    $("sy-lote").hidden = true;
    $("sy-visao").hidden = true;
    $("sy-conta").textContent = "";

    if (!f) {
      title.textContent = T("UI_SYNC_FIELDS_TITLE_NONE");
      body.appendChild(note("sy-nota", T(S.diff ? "UI_SYNC_PICK_FILE" : "UI_SYNC_NO_COMPARE_YET")));
      return;
    }
    title.textContent = T("UI_SYNC_FIELDS_TITLE", { file: f.name });

    if (f.status === "onlyInTarget") {
      body.appendChild(note("sy-nota", T("UI_SYNC_ONLY_TARGET_TXT")));
      return;
    }
    if (f.status === "inUse" || f.status === "invalid") {
      body.appendChild(note("sy-nota aviso", T(f.status === "inUse" ? "UI_SYNC_IN_USE_TXT" : "UI_SYNC_INVALID_TXT", {
        side: T("UI_SYNC_SIDE_" + (f.side || "target")), reason: f.reason || "",
      })));
      return;
    }
    /*
     * A TABELA QUE VAI NASCER usa a mesma tabela de campos, e nao uma lista
     * solta: e o que mantem o layout de pe (pedido do autor). Os tres botoes
     * de visao somem -- nao ha o que comparar, e duas das tres visoes viriam
     * vazias --, e no lugar deles entra a escolha de levar os DADOS junto.
     */
    const nasce = f.status === "missingInTarget";
    $("sy-visao").hidden = nasce;
    /*
     * BOTAO QUE NAO TEM O QUE FAZER NAO FICA NA TELA.
     *
     * Um arquivo pode DIFERIR sem ter uma unica decisao a tomar: se a unica
     * diferenca e um campo que so existe na referencia (nasce em branco) ou um
     * campo fora de posicao (so muda de lugar), nada se perde e nada e
     * perguntado. Era o caso de uma NETUSU.DBF real -- um `missing` sozinho --,
     * e os quatro botoes apareciam assim mesmo, respondendo "nada a decidir" a
     * quem clicasse. Achado pelo autor, 09/09/2026.
     *
     * E a mesma regra dos tres botoes de visao numa tabela que vai nascer, e a
     * dos seletores de codepage e de terminal: a tela so oferece o que existe.
     *
     * As duas linhas vao e vem SEPARADAS, porque os alcances sao separados: o
     * NETUSU pode nao ter o que decidir enquanto outros doze arquivos da pasta
     * tem, e ai a linha da lista inteira continuaria valendo.
     *
     * A DA LISTA INTEIRA ESTA COMENTADA no index.html (decisao do autor,
     * 09/09/2026: "achei perigoso") -- decidir por arquivo que ninguem olhou,
     * com `Atualizar` removendo coluna, e caro demais para um clique. Daqui
     * ela e tratada como PODE NAO EXISTIR: descomentar o markup a traz de
     * volta inteira, sem tocar em JS.
     */
    const pedeAqui = f.status === "differs" && f.diagnostics.some(needsChoice);
    const rotuloTodos = $("sy-lote-todos");
    const pedeAlgum = !!rotuloTodos && S.diff.files.some(
      (x) => x.status === "differs" && x.diagnostics.some(needsChoice));
    $("sy-lote").hidden = !pedeAqui && !pedeAlgum;
    for (const id of ["sy-lote-este", "sy-lote-manter", "sy-lote-adotar"]) {
      $(id).hidden = !pedeAqui;
    }
    if (rotuloTodos) {
      for (const id of ["sy-lote-todos", "sy-lote-manter-todos", "sy-lote-adotar-todos"]) {
        $(id).hidden = !pedeAlgum;
      }
    }
    /* O NOME DO ARQUIVO NO ROTULO, e nao "neste arquivo": o nome e o unico
       jeito de a linha nao poder ser confundida com a de baixo, e ele ja esta
       na cabeca de quem acabou de escolher o arquivo na lista. */
    $("sy-lote-este").textContent = T("UI_SYNC_ALL_THIS_FILE", { file: f.name });
    bulkEcho("", "");
    if (nasce) {
      body.appendChild(copyDataBox(f));
    }
    for (const b of $("sy-visao").querySelectorAll("button")) {
      b.classList.toggle("ativa", b.dataset.visao === S.view);
    }

    const todas = rowsOf(f);
    const rows = todas.filter(inView);
    $("sy-conta").textContent = T("UI_SYNC_VIEW_COUNT", { n: rows.length, total: todas.length });

    if (!rows.length) {
      body.appendChild(note("sy-nota", T(f.status === "same" && S.view === "dif"
        ? "UI_SYNC_SAME_TXT" : "UI_SYNC_NO_FIELDS_IN_VIEW")));
      return;
    }

    const picks = S.choices.get(f.name) || {};
    const table = document.createElement("table");
    table.className = "sy-tabela";
    const thead = table.createTHead();
    const hr = thead.insertRow();
    for (const k of ["UI_SYNC_COL_POS", "UI_SYNC_COL_FIELD", "UI_SYNC_COL_REF", "UI_SYNC_COL_TARGET", "UI_SYNC_COL_WHAT", "UI_SYNC_COL_CHOICE"]) {
      const th = document.createElement("th");
      th.textContent = T(k);
      if (k === "UI_SYNC_COL_POS") th.className = "sy-pos-col";
      hr.appendChild(th);
    }
    const tbody = table.createTBody();
    for (const l of rows) {
      const d = l.d;
      const tr = tbody.insertRow();
      tr.dataset.field = l.field;
      if (!d) tr.classList.add("confere");
      const tdN = tr.insertCell();
      tdN.className = "sy-pos-col" + (l.removed ? " sai" : "");
      tdN.textContent = l.pos === null ? "—" : String(l.pos);
      tr.insertCell().textContent = l.field;
      const tdA = tr.insertCell(); tdA.className = "mono"; tdA.textContent = defText(l.src);
      const tdB = tr.insertCell(); tdB.className = "mono"; tdB.textContent = defText(l.tgt);
      const tdK = tr.insertCell();
      tdK.textContent = d ? d.kinds.map((k) => T("UI_SYNC_KIND_" + k)).join(" · ") : T("UI_SYNC_FIELD_SAME");
      const tdE = tr.insertCell();
      tdE.className = "sy-escolha";
      if (!d || !needsChoice(d)) {
        tdE.textContent = !d ? ""
          : d.kinds.includes("novo") ? ""
          : T(d.kinds.includes("missing") ? "UI_SYNC_AUTO_CREATE" : "UI_SYNC_AUTO_MOVE");
        tdE.classList.add("auto");
        continue;
      }
      const options = d.kinds.includes("extra")
        ? [["keep", "UI_SYNC_KEEP"], ["drop", "UI_SYNC_DROP"]]
        : [["keep", "UI_SYNC_KEEP"], ["adopt", "UI_SYNC_ADOPT"]];
      for (const [optValue, optKey] of options) {
        const lab = document.createElement("label");
        lab.className = "sy-radio" + (optValue === "drop" ? " risco" : "");
        const r = document.createElement("input");
        r.type = "radio";
        r.name = "sy-esc-" + d.field;
        r.value = optValue;
        r.checked = picks[d.field] === optValue;
        r.dataset.field = d.field;
        lab.appendChild(r);
        lab.appendChild(document.createTextNode(" " + T(optKey)));
        tdE.appendChild(lab);
      }
      if (!picks[d.field]) tr.classList.add("pendente");
    }
    body.appendChild(table);
  }

  /*
   * COPIAR OS DADOS DA REFERENCIA JUNTO, so para a tabela que vai NASCER.
   *
   * Pedido do autor (09/09/2026) olhando a NETBANL.DBF -- a tabela de bancos:
   * ela nao existe no cliente, e criar vazia obriga alguem a preencher 471
   * bancos a mao. O mesmo vale para NCM, CFOP, municipios: tabelas de DOMINIO,
   * iguais em toda instalacao.
   *
   * MAS E POR ARQUIVO, E NUNCA EM LOTE, e a medicao na base real e o motivo:
   * das 49 tabelas a criar em `lucrimax\790` vindas de `traco2`, 34 tem
   * dados -- e no meio delas estao NETCOMP2 com 76.456 registros e NETCOMP0
   * com 21.903, que sao dados DAQUELE cliente, nao dominio. Um botao "copiar
   * em todas" levaria a base de um cliente para dentro da de outro, sem
   * ninguem olhar. Marcar seis tabelas de dominio a mao e rapido; marcar
   * trinta e quatro de uma vez e o acidente.
   *
   * Por isso a contagem de registros fica NO ROTULO: a decisao se toma
   * olhando o numero.
   */
  function copyDataBox(f) {
    const n = (f.records && f.records.source) || 0;
    const box = document.createElement("div");
    box.className = "sy-copiar";

    const lab = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = "sy-copiar-dados";
    chk.disabled = n === 0;
    chk.checked = S.withData.has(f.name);
    lab.appendChild(chk);
    lab.appendChild(document.createTextNode(" " + T(n === 0 ? "UI_SYNC_COPY_NONE" : "UI_SYNC_COPY_DATA", { n: n })));
    box.appendChild(lab);

    if (n > 0) {
      const warn = document.createElement("p");
      warn.className = "sy-copiar-aviso";
      warn.textContent = T("UI_SYNC_COPY_WARN");
      box.appendChild(warn);
    }
    return box;
  }

  function note(cls, text) {
    const el = document.createElement("p");
    el.className = cls;
    el.textContent = text;
    return el;
  }

  function paintSummary() {
    const foot = $("sy-resumo");
    const one = $("sy-aplicar-um");
    const all = $("sy-aplicar-todos");
    /*
     * O QUE ESTA RODANDO NAO PODE SER MEXIDO POR BAIXO.
     *
     * `Fechar` chama `close()`, e `close()` NAO dispara `cancel` -- entao a
     * guarda do Esc nunca era consultada: o ouvinte de `close` zerava `S`, e a
     * volta seguinte do laco estourava em `S.stop` com o lote pela metade,
     * sem dialogo de resultado e sem os arquivos restantes. Trocar de pasta ou
     * recomparar no meio tem o mesmo efeito sobre o `S.diff` que o laco esta
     * percorrendo. Apontado em revisao, 09/09/2026.
     */
    for (const id of ["sy-fechar", "sy-comparar", "sy-trocar", "sy-origem", "sy-alvo", "sy-pos"]) {
      $(id).disabled = S.running;
    }
    if (!S.diff) {
      foot.textContent = "";
      one.disabled = true;
      all.disabled = true;
      return;
    }
    const n = (st) => S.diff.files.filter((f) => f.status === st).length;
    const pending = S.diff.files.reduce((a, f) => a + pendingIn(f), 0);
    foot.textContent =
      T("UI_SYNC_SUMMARY", { differs: n("differs"), create: n("missingInTarget"), same: n("same"),
                             only: n("onlyInTarget"), busy: n("inUse") + n("invalid") }) +
      (S.withData.size ? "  ·  " + T("UI_SYNC_WITH_DATA_COUNT", { n: S.withData.size }) : "") +
      (pending ? "  ·  " + T("UI_SYNC_PENDING", { n: pending }) : "");

    const selectedFile = S.sel ? fileByName(S.sel) : null;
    one.disabled = S.running || !selectedFile || !ACTIONABLE.has(selectedFile.status) || pendingIn(selectedFile) > 0;
    const marked = [...S.marked].map(fileByName).filter(Boolean);
    all.disabled = S.running || marked.length === 0 || marked.some((f) => pendingIn(f) > 0);
    all.textContent = T("UI_SYNC_APPLY_MARKED", { n: marked.length });
  }

  /* A resposta do clique em massa: ao lado do botao, e nao no alto do dialogo.
     Some sozinha na proxima pintura de campos -- uma frase sobre um arquivo
     nao pode sobreviver a troca de arquivo. */
  function bulkEcho(txt, cls) {
    const el = $("sy-lote-eco");
    el.textContent = txt || "";
    el.className = "sy-lote-eco" + (cls ? " " + cls : "");
  }

  function syncMsg(txt, cls) {
    const el = $("sy-msg");
    el.textContent = txt || "";
    el.className = "ff-msg sy-msg" + (cls ? " " + cls : "");
  }

  function selectFile(name) {
    S.sel = name;
    /*
     * A VISAO "os que conferem" NAO PODE ESCONDER UMA PENDENCIA.
     *
     * Ela e grudada de proposito -- quem esta comparando arquivo a arquivo nao
     * quer reescolher a visao a cada clique. Mas ela mostra justamente as
     * linhas SEM decisao a tomar, e com ela ligada um arquivo com pendencia
     * abria vazio de radios: o Aplicar ficava travado por campos que a pessoa
     * nao tinha como ver. Apanhado clicando, em 09/09/2026.
     *
     * A volta e para "so as diferencas", que e a visao de abertura. "Todos os
     * campos" chegou a ser o padrao por um dia e foi RECUSADO pelo autor --
     * *"ficou pior e confuso, antes estava bom"*: a tela existe para achar o
     * que esta errado, e abrir na lista inteira faz o olho procurar as
     * diferencas no meio dos 47 campos que conferem.
     */
    const f = name ? fileByName(name) : null;
    if (f && S.view === "iguais" && pendingIn(f) > 0) S.view = "dif";
    /* A frase do lote fala do arquivo escolhido -- deixa-la de pe enquanto a
       pessoa olha OUTRO e afirmar algo falso sobre o que esta na tela. Mesma
       regra da mensagem da chave de API, que some quando o campo muda. (O eco
       ao lado dos botoes e limpo pelo paintFields, logo adiante.) */
    syncMsg("", "");
    paintFiles();
    paintFields();
    paintSummary();
  }

  // ------------------------------------------------------------ escolhas

  function setChoice(fileName, field, choice) {
    const picks = S.choices.get(fileName) || {};
    picks[field] = choice;
    S.choices.set(fileName, picks);
  }

  /*
   * "Atualizar" e "Ignorar", para o arquivo escolhido ou para a lista inteira.
   *
   * Os verbos sao do autor (09/09/2026), e trocaram "adotar a referencia" e
   * "manter o do alvo": dizem a MESMA coisa em uma palavra, e uma palavra e o
   * que cabe numa coluna de decisao ao lado de 126 campos.
   *
   * Num campo EXTRA -- que so existe no alvo -- "Atualizar" significa
   * REMOVER: a referencia nao o tem, e igualar-se a ela e nao te-lo. E o que a
   * palavra quer dizer nos dois casos; um botao que dissesse "Atualizar" e
   * deixasse o extra de pe estaria mentindo pela metade.
   */
  function bulkChoice(mode, all) {
    const targets = all ? S.diff.files.filter((f) => f.status === "differs") : [fileByName(S.sel)].filter(Boolean);
    let decided = 0;
    const touched = new Set();
    for (const f of targets) {
      for (const d of f.diagnostics) {
        if (!needsChoice(d)) continue;
        const extra = d.kinds.includes("extra");
        setChoice(f.name, d.field, mode === "adopt" ? (extra ? "drop" : "adopt") : "keep");
        decided++;
        touched.add(f.name);
      }
    }
    paintFiles();
    paintFields();
    paintSummary();
    /*
     * O BOTAO TEM DE DIZER O QUE FEZ.
     *
     * Ele preenchia as decisoes e ficava calado: tres pontinhos de radio no
     * meio da tabela, uma frase que some do rodape, dois botoes que trocam de
     * cinza para ativo -- nada disso e um "clique recebido". O autor perguntou
     * se era para acontecer alguma coisa (09/09/2026), e a pergunta e a
     * resposta.
     *
     * O ramo de NADA A FAZER virou REDE DE SEGURANCA: desde que o botao passou
     * a sumir quando o arquivo nao tem o que decidir (ver paintFields), nao ha
     * clique possivel que caia nele. Ele fica porque um caminho novo que chame
     * `bulkChoice` sem passar por aquela pintura precisa dizer alguma coisa --
     * ficar quieto e justamente o defeito que esta funcao acabou de perder.
     */
    if (!decided) {
      bulkEcho(T("UI_SYNC_BULK_NONE"), "aviso");
      return;
    }
    /* Sem o nome do arquivo: a linha ja comeca com "em NETNF2.DBF:", duas
       palavras a esquerda desta frase. Repetir ali gasta a largura que a
       propria frase precisa. */
    bulkEcho(T(all ? "UI_SYNC_BULK_DONE_ALL" : "UI_SYNC_BULK_DONE", { n: decided }), "ok");
  }

  // ------------------------------------------------------------ aplicar

  const SEP = String.fromCharCode(92);
  const norm = (c) => String(c || "").split(SEP).join("/").toLowerCase();

  async function applyFiles(names) {
    const files = names.map(fileByName).filter((f) => f && ACTIONABLE.has(f.status));
    if (!files.length) return;

    // Uma confirmacao para o lote, com o que cada um perde -- e nao uma por
    // arquivo: cem "tem certeza?" ensinam a clicar em Sim sem ler.
    /*
     * COMPOR UMA VEZ SO, E APLICAR O QUE FOI MOSTRADO.
     *
     * Eram duas chamadas por arquivo com os mesmos argumentos -- 98 idas a uma
     * VM de thread unica para aplicar 49 arquivos --, e a segunda relia
     * `S.choices` e `S.byPos` DEPOIS da confirmacao e da pergunta de backup.
     * O que a pessoa aprovou e o que seria escrito eram dois calculos
     * separados, e nada garantia que dessem o mesmo resultado. Agora o
     * resultado e guardado e viaja ate o `applyOne`. Apontado em revisao,
     * 09/09/2026.
     */
    const composed = new Map();
    const rows = [];
    for (const f of files) {
      let losses = [];
      if (f.status === "differs") {
        try {
          const comp = await QDBU.rpc("struct.compose", {
            source: f.source, target: f.target, choices: S.choices.get(f.name) || {}, byPosition: S.byPos,
          });
          composed.set(f.name, { comp: comp });
          losses = comp.losses.map((l) => T("UI_SYNC_LOSS_" + l.kind, { field: l.field }));
        } catch (e) {
          composed.set(f.name, { erro: e });
          losses = [msgErro(e)];
        }
      }
      /* A linha diz o que vai acontecer COM AQUELE arquivo -- criada vazia e
         criada com 471 registros nao sao a mesma operacao, e e aqui que a
         pessoa confere se marcou o que queria. */
      let what;
      if (f.status !== "missingInTarget") {
        what = T("UI_SYNC_STATUS_differs");
      } else if (S.withData.has(f.name)) {
        what = T("UI_SYNC_CREATE_WITH_DATA", { n: (f.records && f.records.source) || 0 });
      } else {
        what = T("UI_SYNC_CREATE_EMPTY");
      }
      rows.push(
        "<li><b>" + escapaHtml(f.name) + "</b> — " + escapaHtml(what) +
        (losses.length ? '<ul class="sw-pend"><li>' + losses.map(escapaHtml).join("</li><li>") + "</li></ul>" : "") +
        "</li>"
      );
    }
    /*
     * A FRASE SEGUE O QUE O LOTE FAZ.
     *
     * "Cada um e uma operacao separada, com a propria copia" e verdade quando
     * ha arquivo a ALTERAR -- e promessa vazia num lote so de criacao, onde
     * nao existe original para copiar. Mesmo defeito que a pergunta de copia
     * tinha, uma frase adiante; apanhado no mesmo teste (09/09/2026).
     */
    /* "criadas VAZIAS" e mentira se alguma leva os dados junto -- e a caixa
       dizia as duas coisas ao mesmo tempo, com a linha do arquivo logo abaixo
       falando em "1 registro copiado". Apanhado no teste da propria copia. */
    const soCria = files.every((f) => f.status === "missingInTarget");
    const algumComDados = files.some((f) => S.withData.has(f.name));
    const r = await Swal.fire(
      swalBase({
        icon: "warning",
        title: T("UI_SYNC_APPLY_TITLE"),
        html: escapaHtml(T(!soCria ? "UI_SYNC_APPLY_ASK"
                            : algumComDados ? "UI_SYNC_APPLY_ASK_CREATE_DATA"
                            : "UI_SYNC_APPLY_ASK_CREATE", { n: files.length })) +
              '<ul class="sw-lista sy-confirma">' + rows.join("") + "</ul>",
        showCancelButton: true,
        confirmButtonText: T("UI_SYNC_APPLY_CONFIRM"),
        cancelButtonText: T("UI_CANCEL"),
        focusCancel: true,
      })
    );
    if (!r.isConfirmed) return;

    /*
     * A COPIA SO E OFERECIDA SE HOUVER O QUE COPIAR.
     *
     * Um lote so de tabelas que vao NASCER nao tem original nenhum -- e
     * perguntar "fazer uma copia antes?" ali e uma pergunta sem resposta
     * certa, que ensina a clicar em Sim sem ler. Apanhado pelo autor
     * (09/09/2026) medindo traco2 contra lucrimax/790, onde o lote era so de
     * criacao. Num lote misto a pergunta continua valendo: ela e sobre os
     * que serao ALTERADOS, e o `struct.create` ignora o parametro.
     */
    const vaiAlterar = files.some((f) => f.status === "differs");
    const backup = vaiAlterar ? await perguntarBackup() : false;
    if (backup === null) return;

    S.running = true;
    S.stop = false;
    $("sy-parar").hidden = false;
    $("sy-parar").disabled = false;
    paintSummary();
    const results = [];
    try {
      for (const f of files) {
        if (S.stop) {
          results.push({ name: f.name, tipo: "stop" });
          continue;
        }
        syncMsg(T("UI_SYNC_WORKING", { file: f.name }), "");
        try {
          const r = await applyOne(f, backup, composed.get(f.name));
          results.push({ name: f.name, tipo: r.done ? "ok" : "skip", losses: r.losses });
        } catch (e) {
          results.push({ name: f.name, tipo: "fail", detalhe: msgErro(e) });
        }
      }
    } finally {
      S.running = false;
      $("sy-parar").hidden = true;
      syncMsg("", "");
      /*
       * OS CONTROLES VOLTAM AQUI, e nao na recomparacao do fim.
       *
       * Quem os destrava e o `paintSummary`, e ele so corria de novo depois do
       * `compare()` final -- que pode falhar (a pasta saiu do ar no meio do
       * lote, a rede caiu). O desfecho seria uma janela com Fechar desabilitado
       * e nenhum caminho de volta, que e pior que qualquer coisa que a trava
       * evita: prender alguem numa janela que nao fecha. Medido por CDP em
       * 09/09/2026 -- passou porque a recomparacao deu certo.
       */
      paintSummary();
    }

    const ok = results.filter((x) => x.tipo === "ok").length;
    const falhas = results.filter((x) => x.tipo === "fail").length;
    await Swal.fire(
      swalBase({
        icon: falhas ? "warning" : "success",
        title: T("UI_SYNC_RESULT_TITLE"),
        html: '<ul class="sw-lista sy-resultado">' + results.map((x) =>
          '<li class="' + x.tipo + '">' +
          escapaHtml(T("UI_SYNC_RESULT_" + x.tipo, { file: x.name, detail: x.detalhe || "" })) +
          /* O QUE O RELIGAR NAO REPOS APARECE AQUI, arquivo a arquivo. A barra
             de status fica ATRAS do dialogo e do escurecimento: mandar para la
             o unico aviso de que a grade perdeu o filtro e o mesmo que nao
             avisar -- a licao do msgIa, e o motivo de a lista tambem entrar na
             pergunta de tentar novamente. */
          ((x.losses && x.losses.length)
            ? '<ul class="sw-pend"><li>' + x.losses.map(escapaHtml).join("</li><li>") + "</li></ul>" : "") +
          "</li>"
        ).join("") + "</ul>",
        confirmButtonText: T("UI_OK"),
        showCancelButton: false,
      })
    );
    hint(T("INFO_SYNC_DONE", { ok: ok, fail: falhas }));

    // Recompara: o que sumiu da lista e o que foi feito -- como no ERP.
    await compare();
  }

  /*
   * Um arquivo. `{ feito, perdas }` -- `feito` e falso quando nao havia o que
   * mudar, e `perdas` sao as frases do que o religar nao conseguiu repor.
   *
   * Abre um handle proprio quando o arquivo nao esta numa aba -- e o fecha no
   * fim, com ou sem sucesso. Quando esta, usa a aba: dois handles do mesmo
   * arquivo brigariam pelo exclusivo, e a aba precisa ser repintada depois
   * porque a estrutura dela mudou embaixo.
   */
  async function applyOne(f, backup, ready) {
    const path = S.target.replace(/[\\/]+$/, "") + "/" + f.name;

    if (f.status === "missingInTarget") {
      /*
       * COM DADOS = COPIA DE ARQUIVO, e nao criar-e-importar.
       *
       * `meta.copyfile` leva estrutura, registros, marcas de exclusao e o byte
       * de codepage do cabecalho de uma vez -- uma copia fiel. Criar vazio e
       * depois importar registro a registro faria a mesma coisa mais devagar,
       * e reabriria as tres perguntas que a importacao tem (codepage, tipo que
       * nao converte, registro deletado). O memo vai junto: sem o `.dbt`, o
       * arquivo copiado abre e o memo vem vazio.
       */
      if (S.withData.has(f.name)) {
        const srcPath = S.source.replace(/[\\/]+$/, "") + "/" + f.name;
        await QDBU.rpc("meta.copyfile", { source: srcPath, dest: path, shared: true });
        if (f.source.some((c) => c.type === "M")) {
          const noExt = (c) => c.replace(/\.[^.\\/]*$/, "");
          try {
            await QDBU.rpc("meta.copyfile", { source: noExt(srcPath) + ".dbt", dest: noExt(path) + ".dbt", shared: true });
          } catch (e) {
            /* Memo declarado na estrutura e `.dbt` ausente na origem: o
               arquivo copiado ainda abre, e a recusa aqui derrubaria uma
               copia que ja deu certo. */
          }
        }
        return { done: true, losses: [] };
      }
      await QDBU.rpc("struct.create", {
        path: path,
        fields: f.source.map((c) => ({ name: c.name, type: c.type, len: c.len, dec: c.dec })),
      });
      return { done: true, losses: [] };
    }

    /* A estrutura E A QUE FOI CONFIRMADA: composta antes da pergunta e
       carregada ate aqui. Sem `pronto` (um caminho novo que chame direto) ela
       e composta na hora, com as escolhas de agora. */
    let comp;
    if (ready && ready.erro) {
      throw ready.erro;
    } else if (ready && ready.comp) {
      comp = ready.comp;
    } else {
      comp = await QDBU.rpc("struct.compose", {
        source: f.source, target: f.target, choices: S.choices.get(f.name) || {}, byPosition: S.byPos,
      });
    }
    if (!comp.changed) return { done: false, losses: [] };

    const tab = abas.find((a) => norm(a.caminho) === norm(path));
    let h = tab ? tab.h : null;
    if (!h) {
      /* ABRIR TAMBEM INSISTE. Medido com o arquivo tomado em exclusivo por um
         Clipper de verdade (tests/concorrencia/segura.prg): sem isto o
         `file.open` recusava e o lote registrava "falhou" -- sem a pergunta
         de tentar novamente que o NetUse do DBU faz. A recusa de abrir e a
         mesma classe de "em uso" que a do struct.modify, e merece o mesmo
         tratamento: espera dois segundos em silencio, depois pergunta. */
      const ab = await insistirEmUso(async () => {
        try {
          return { ok: true, valor: await QDBU.rpc("file.open", { path: path }) };
        } catch (err) {
          return { ok: false, erro: err };
        }
      });
      if (!ab.ok) {
        if (ab.desistiu) throw new Error(T("WARN_SYNC_SKIPPED"));
        throw ab.erro;
      }
      h = ab.valor.h;
    }
    try {
      /* O mesmo "tentar novamente" do editor de estrutura: o ERP do cliente
         pode ter aberto o arquivo entre comparar e aplicar, e o struct.modify
         so toca o original no passo 7 -- repetir e seguro. */
      const t = await insistirEmUso(async () => {
        try {
          return { ok: true, valor: await comProgresso(QDBU.rpc("struct.modify", { h: h, fields: comp.fields, backup: backup })) };
        } catch (err) {
          return { ok: false, erro: err };
        }
      });
      if (!t.ok) {
        if (t.desistiu) throw new Error(T("WARN_SYNC_SKIPPED"));
        throw t.erro;
      }
      /*
       * `rebindErrors` DO LOTE TEM DE CHEGAR A ALGUEM.
       *
       * O resultado do `struct.modify` era descartado, e este era o unico
       * ponto do app que chamava a operacao sem passar por
       * `avisarPerdasDoReligar()`. Nenhuma dessas perdas produz erro: o lote
       * dizia "ok", a grade repintava, e um arquivo aberto numa aba ficava
       * mostrando TODOS os registros com o filtro ainda escrito no painel.
       * Apontado em revisao, 09/09/2026.
       *
       * A funcao do app.js corrige o painel do filtro e escreve na barra; as
       * frases tambem sobem para o dialogo de resultado, que e o que a pessoa
       * esta olhando.
       */
      const lost = (t.valor && t.valor.rebindErrors) || [];
      if (lost.length) avisarPerdasDoReligar(t.valor);
      return {
        done: true,
        losses: lost.map((p) => msgErro({ codigo: p.code, params: p.params || {} })),
      };
    } finally {
      if (tab) {
        await repintarDoEstado();
      } else {
        try { await QDBU.rpc("file.close", { h: h }); } catch (e) { /* ja fechado pela R6 */ }
      }
    }
  }

  // ------------------------------------------------------------ eventos

  document.addEventListener("DOMContentLoaded", () => {
    for (const side of SIDES) {
      $(side.id).addEventListener("change", (ev) => {
        if (!S) return;
        if (ev.target.value === OTHER) {
          pickOtherFolder(side);
          return;
        }
        if (S[side.key] === ev.target.value) return;
        S[side.key] = ev.target.value;
        /*
         * TROCAR DE PASTA INVALIDA A COMPARACAO -- e nao so o botao de trocar.
         *
         * O resultado na tela e de DUAS pastas especificas: `f.target` sao os
         * campos daquele alvo, e o `from` de cada campo e o nome NAQUELE
         * arquivo. Escolhendo outro alvo, o diff, as marcas e as escolhas
         * continuavam de pe e o Aplicar seguia habilitado: ele montaria a
         * estrutura calculada para a base A e a escreveria por cima da base B
         * -- campos `from` que nao existem la voltariam em branco, e campos de
         * B ausentes em A sumiriam. Apontado em revisao, 09/09/2026.
         */
        if (S.diff) clearResult();
      });
    }
    $("sy-trocar").addEventListener("click", () => {
      if (!S) return;
      [S.source, S.target] = [S.target, S.source];
      buildPickers();
      clearResult();
    });
    $("sy-pos").addEventListener("change", async (ev) => {
      if (!S) return;
      S.byPos = ev.target.checked;
      try { await QDBU.rpc("config.set", { syncByPosition: S.byPos }); } catch (e) { hint(msgErro(e)); }
      if (S.diff) await compare();
    });
    $("sy-comparar").addEventListener("click", () => S && compare());
    $("sy-so-dif").addEventListener("change", (ev) => { if (S) { S.onlyDiff = ev.target.checked; paintFiles(); } });
    $("sy-busca").addEventListener("input", (ev) => { if (S) { S.search = ev.target.value.trim().toLowerCase(); paintFiles(); } });

    /* Um ouvinte na lista: os <li> sao recriados a cada repintura. */
    $("sy-arquivos").addEventListener("click", (ev) => {
      if (!S) return;
      const li = ev.target.closest(".sy-arq");
      if (!li) return;
      if (ev.target.classList.contains("sy-marca")) {
        if (ev.target.checked) S.marked.add(li.dataset.name); else S.marked.delete(li.dataset.name);
        paintSummary();
        return;
      }
      selectFile(li.dataset.name);
    });
    $("sy-marcar-todos").addEventListener("click", () => {
      if (!S || !S.diff) return;
      for (const f of S.diff.files) if (ACTIONABLE.has(f.status) && isVisible(f)) S.marked.add(f.name);
      paintFiles(); paintSummary();
    });
    $("sy-marcar-nenhum").addEventListener("click", () => {
      if (!S) return;
      S.marked.clear();
      paintFiles(); paintSummary();
    });
    $("sy-marcar-inverter").addEventListener("click", () => {
      if (!S || !S.diff) return;
      for (const f of S.diff.files) {
        if (!ACTIONABLE.has(f.status) || !isVisible(f)) continue;
        if (S.marked.has(f.name)) S.marked.delete(f.name); else S.marked.add(f.name);
      }
      paintFiles(); paintSummary();
    });

    $("sy-campos").addEventListener("change", (ev) => {
      if (!S || ev.target.type !== "radio") return;
      setChoice(S.sel, ev.target.dataset.field, ev.target.value);
      ev.target.closest("tr").classList.remove("pendente");
      renumber(fileByName(S.sel));
      paintFiles();
      paintSummary();
    });
    $("sy-campos").addEventListener("change", (ev) => {
      if (!S || ev.target.id !== "sy-copiar-dados") return;
      if (ev.target.checked) S.withData.add(S.sel); else S.withData.delete(S.sel);
      paintFiles();
      paintSummary();
    });
    $("sy-visao").addEventListener("click", (ev) => {
      /* `data-visao` e nao `data-view`: o atributo e MARKUP, e o app inteiro
         ja o usa nas abas de estrutura/dados (index.html:180). Duas grafias
         para a mesma ideia no mesmo HTML seriam pior que uma em portugues. */
      const b = ev.target.closest("button[data-visao]");
      if (!S || !b) return;
      S.view = b.dataset.visao;
      paintFields();
    });
    /*
     * OS OUTROS DOIS PODEM NAO ESTAR NO HTML.
     *
     * A linha "em todos os arquivos" esta comentada no index.html, e
     * `$("id-que-nao-existe").addEventListener(...)` estoura AQUI, no
     * DOMContentLoaded, levando junto todos os ouvintes registrados depois --
     * a tela morre sem uma palavra em lugar nenhum. E como o JS deste projeto
     * ja quebrou tres vezes. Registrar o que existe custa uma linha.
     */
    for (const [id, mode, todos] of [["sy-lote-manter", "keep", false],
                                     ["sy-lote-adotar", "adopt", false],
                                     ["sy-lote-manter-todos", "keep", true],
                                     ["sy-lote-adotar-todos", "adopt", true]]) {
      const b = $(id);
      if (b) b.addEventListener("click", () => S && bulkChoice(mode, todos));
    }

    $("sy-aplicar-um").addEventListener("click", () => S && S.sel && applyFiles([S.sel]));
    $("sy-aplicar-todos").addEventListener("click", () => S && applyFiles([...S.marked]));
    $("sy-parar").addEventListener("click", () => {
      if (!S) return;
      S.stop = true;
      $("sy-parar").disabled = true;
      syncMsg(T("UI_SYNC_STOPPING"), "aviso");
    });
    $("sy-fechar").addEventListener("click", () => {
      if (S && S.running) return;   /* o botao ja esta desabilitado; este e o segundo trinco */
      $("dlg-sync").close();
    });
    /* Submissao implicita: um <form method="dialog"> com um unico campo de
       texto fecha o dialogo no Enter da busca. Todos os botoes daqui sao
       type="button"; nao ha submit legitimo a preservar. */
    $("form-sync").addEventListener("submit", (ev) => ev.preventDefault());
    $("dlg-sync").addEventListener("close", () => { S = null; });
    // Fechar no meio de um lote deixaria o laco escrevendo sem tela: Esc so
    // vale parado.
    $("dlg-sync").addEventListener("cancel", (ev) => { if (S && S.running) ev.preventDefault(); });

    window.addEventListener("idioma-mudou", () => {
      if (!S || !$("dlg-sync").open) return;
      buildPickers();
      paintFiles(); paintFields(); paintSummary();
    });
  });

  window.Sync = { open: openSync };
})();
