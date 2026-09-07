// construtor-ia.js — o botão ✦ do construtor de expressão: a pessoa escreve
// o que quer em linguagem comum, e um modelo de linguagem devolve a expressão.
//
// É a versão final da ideia do construtor: ele existe porque o público não
// sabe montar a expressão, e isto é ele nem precisando.
//
// TRÊS COISAS QUE ESTE MÓDULO NÃO FAZ, de propósito:
//
// - Não aplica nada. A resposta cai no rascunho como UM passo de undo (Ctrl+Z
//   volta ao que estava), passa pelo expr.check como qualquer texto, e só entra
//   no arquivo se a pessoa clicar em Usar. A IA sugere; quem decide é quem
//   está na frente. O aviso de primeira vez diz isso — e lembra do backup.
// - Não manda dado. Vai o pedido, os nomes e tipos dos campos, e o catálogo de
//   funções. Nenhum registro. O aviso diz isso também, e que este programa não
//   guarda nada do que vai e volta.
// - Não vê a chave. Ela mora no Rust (ia.json); daqui só se sabe se existe.
//   Sem chave o botão CONTINUA LÁ: clicar nele diz que o recurso existe e
//   leva a Preferências. Esconder o botão esconderia o recurso de quem mais
//   precisa dele — quem nunca abriu Preferências.
//
// O PROMPT MORA FORA DO FONTE, em app/ui/prompts/construtor.md — para o autor
// editar a prosa sem recompilar. Três camadas, da mais específica à mais
// geral: <raiz>/.qdbu/prompts/construtor.md (a máquina do cliente; ajuste sem
// release), app/ui/prompts/ do disco (debug: edita e reload) e o embutido no
// binário. Os DADOS (campos, funções, tipo esperado) são JSON gerado pelo JS e
// anexado ao fim — ninguém os edita, então não há mal-entendido possível.

/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta é um script clássico e
 * todos dividem UM escopo global. Nada sai daqui: o módulo se liga por eventos.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (k, p) => window.I.t(k, p);

  let status = null; // último ia_status
  let promptBase = null; // o .md, carregado uma vez
  // A pergunta pendente da IA e o pedido que a provocou. Cada envio é uma
  // chamada nova, sem memória; sem isto a resposta "use CLI_VALTO" chegaria
  // solta, sem o pedido nem a pergunta. Some quando uma expressão volta, ou
  // quando o construtor reabre.
  let dialogo = null; // { previous_request, question_asked }

  /* Troca o placeholder pela CHAVE, não pelo texto: assim a troca de idioma
     (que repinta por data-i18n-ph) mantém a frase certa. */
  function trocarPh(chave) {
    const el = $("cx-ia-pedido");
    el.dataset.i18nPh = chave;
    el.placeholder = T(chave);
  }

  // ------------------------------------------------------------ o prompt

  async function carregarPrompt() {
    if (promptBase !== null) return promptBase;
    // A camada do cliente vem pela DLL? Não: é arquivo local, e o Rust já
    // serve app/ui/ pelo protocolo dev. O .qdbu/prompts/ do cliente entra
    // como caminho relativo que o mesmo servidor resolve. Falhou tudo, o
    // prompt fica vazio e a IA recebe só os dados — pior, mas não trava.
    for (const url of ["prompts/construtor.md"]) {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) {
          promptBase = await r.text();
          return promptBase;
        }
      } catch (e) {
        /* tenta a próxima */
      }
    }
    promptBase = "";
    return promptBase;
  }

  /**
   * O ALVO, dito com todas as letras. "tipo esperado: L" é pouco: a IA precisa
   * saber que a expressão vai num SET FILTER TO e é avaliada registro a
   * registro, ou que vai num REPLACE do campo NOME (C, 40) do NETCLI.DBF. Sem
   * isto ela devolve `Upper(NOME)` para um filtro, ou 60 letras para 40.
   *
   * SEMPRE EM INGLÊS, como o prompt inteiro, seja qual for o idioma da tela:
   * o modelo trabalha melhor em inglês, e o que volta para a pessoa (reason,
   * question) o prompt manda vir no idioma do pedido. Nomes de campo e de
   * arquivo vão como estão.
   */
  function alvoDe(ctx) {
    const f = ctx.alvo || {};
    const arq = ctx.arquivo || "the current file";
    const tipoCampo = f.tipo
      ? `${f.campo} (type ${f.tipo}${f.tamanho ? ", len " + f.tamanho + (f.dec ? ", dec " + f.dec : "") : ""})`
      : "";
    const POR_USO = {
      filter: {
        command: "SET FILTER TO <expression>",
        type: "L",
        goal: `Filter the records of ${arq}. The expression is evaluated for EVERY record and must return a LOGICAL value (.T. or .F.); records where it is .T. stay visible.`,
      },
      index_key: {
        command: "INDEX ON <expression> TO <file>",
        type: "any",
        goal: `Key of a new index over ${arq}. The expression is evaluated for every record and must return the SAME type (C, N or D) and, for C, the SAME length for every record — pad with PadR()/Str() when combining fields. Logical is not allowed.`,
      },
      index_for: {
        command: "INDEX ON ... FOR <expression>",
        type: "L",
        goal: `Condition of a new index over ${arq}: only records where the expression is .T. enter the index. Must return a LOGICAL value.`,
      },
      replace: {
        command: `REPLACE ${f.campo || "<field>"} WITH <expression>`,
        type: f.tipo || ctx.expect || "any",
        goal: `Compute the NEW VALUE of field ${tipoCampo} in ${arq}, for every record that matches the FOR/WHILE conditions. The expression must return type ${f.tipo || ctx.expect}${f.tamanho && f.tipo === "C" ? `, at most ${f.tamanho} characters` : ""}. It may read the current value of any field, including ${f.campo}.`,
      },
      mass_for: {
        command: "REPLACE ... FOR <expression>",
        type: "L",
        goal: `Which records of ${arq} the mass operation touches. Evaluated for every record; must return a LOGICAL value.`,
      },
      mass_while: {
        command: "REPLACE ... WHILE <expression>",
        type: "L",
        goal: `How far the mass operation goes in ${arq}: it stops at the first record where the expression is .F. Must return a LOGICAL value.`,
      },
    };
    const t = POR_USO[ctx.uso] || { command: ctx.rotulo || "", type: ctx.expect || "any", goal: "" };
    const alvo = { command: t.command, type: t.type, goal: t.goal, file: ctx.arquivo || "" };
    if (f.campo) alvo.field = { name: f.campo, type: f.tipo, len: f.tamanho, dec: f.dec };
    return alvo;
  }

  /**
   * O prompt de sistema: o .md + os dados deste pedido em JSON.
   * O JSON é GERADO — é a parte em que não pode haver mal-entendido, e não há.
   */
  /**
   * A expressão que JÁ está no rascunho, como dado: a IA tanto corrige
   * ("faltam os pontos no .AND.") quanto altera ("inclua também MG"). Vai o
   * veredito do expr.check quando houve um -- é o erro exato da DLL, não a
   * frase traduzida da tela.
   */
  function atualDe(atual) {
    if (!atual || !atual.texto.trim()) return null;
    const c = { expression: atual.texto.trim() };
    const r = atual.check;
    if (r && !r.compiles) {
      c.compiles = false;
      c.error = r.symbol ? "unknown symbol: " + r.symbol : r.error || "does not compile";
    } else if (r && r.evaluated && !r.typeOk) {
      c.compiles = true;
      c.returned_type = r.type;
      c.error = "returns the wrong type";
    } else if (r) {
      c.compiles = true;
      c.returned_type = r.type;
    }
    return c;
  }

  async function montarSistema(ctx, atual) {
    const base = await carregarPrompt();
    const cat = (window.CATALOGO && window.CATALOGO.funcoes) || {};
    const functions = Object.values(cat).map((f) => ({
      name: f.nome,
      args: f.args.map((a) => (a.opc ? "[" + a.n + "]" : a.n)),
      returns: f.ret,
      does: f.one,
    }));
    const fields = (ctx.campos || []).map((c) => {
      const o = { name: c.name, type: c.type };
      if (c.len) o.len = c.len;
      if (c.dec) o.dec = c.dec;
      return o;
    });
    const dados = { target: alvoDe(ctx), fields, functions };
    const current = atualDe(atual);
    if (current) dados.current = current;
    if (dialogo) dados.dialogue = dialogo;
    return base.trim() + "\n\n" + JSON.stringify(dados, null, 1);
  }

  // ------------------------------------------------------------- o aviso

  /** Devolve true se a pessoa já leu (ou acabou de aceitar) o aviso. */
  function garantirAviso() {
    if (status && status.aviso_lido) return Promise.resolve(true);
    return new Promise((resolver) => {
      const dlg = $("dlg-ia-aviso");
      const fim = (ok) => {
        dlg.removeEventListener("close", aoFechar);
        resolver(ok);
      };
      const aoFechar = () => fim(dlg.returnValue === "ok");
      dlg.addEventListener("close", aoFechar);
      dlg.returnValue = "";
      $("ia-aviso-nao-mostrar").checked = false;
      $("form-ia-aviso").onsubmit = (ev) => {
        ev.preventDefault();
        // Só "não mostrar mais" + confirmar grava o flag (no Rust, junto da
        // config). Confirmar sem marcar: continua, e pergunta de novo da
        // próxima vez -- a pessoa decide quando já leu o bastante.
        if ($("ia-aviso-nao-mostrar").checked) {
          window.QDBU.iaConfigurar(status.endpoint, status.modelo, "", true).then((s) => { status = s; }).catch(() => {});
        }
        dlg.close("ok");
      };
      $("ia-aviso-cancelar").onclick = () => dlg.close("");
      dlg.showModal();
    });
  }

  // ------------------------------------------------------------- pedir

  function estado(texto, classe) {
    const el = $("cx-ia-estado");
    el.textContent = texto;
    el.className = "cx-ia-estado " + (classe || "");
  }

  /* O pedido em palavras vai como MENSAGEM DO USUÁRIO, separada do prompt de
     sistema -- e o prompt diz que ela é descrição, nunca instrução. No modo
     corrigir (o ✦ junto do erro) a pessoa pode não ter escrito nada: aí a
     mensagem é nossa, em inglês, e o que ela escreveu vai depois como
     complemento. */
  const PEDIDO_CORRIGIR = "Fix the current expression so that it compiles and returns the required type. Keep its evident intent; change as little as possible.";

  async function pedir(corrigir) {
    const escrito = $("cx-ia-pedido").value.trim();
    let pedido = escrito;
    if (corrigir) pedido = escrito ? PEDIDO_CORRIGIR + "\nThe person adds: " + escrito : PEDIDO_CORRIGIR;
    if (!pedido) return;
    const ctx = window.Construtor.contexto();
    if (!ctx) return;

    if (!(await garantirAviso())) return;

    const btn = $("cx-ia-enviar");
    btn.disabled = true;
    estado(T("UI_IA_THINKING"), "");
    try {
      const sistema = await montarSistema(ctx, window.Construtor.atual());
      const r = await window.QDBU.iaSugerir(sistema, pedido, ctx.arquivo || "", ctx.uso || "");
      if (!r.expressao) {
        // Pergunta vale mais que chute: fica na caixa, e a pessoa completa
        // o pedido no mesmo campo.
        if (r.pergunta && !dialogo) {
          // UMA pergunta, uma resposta, fim -- decisão do autor: isto não
          // vira chat. A pergunta só abre diálogo quando não há um aberto.
          estado(T("UI_IA_QUESTION", { q: r.pergunta }), "pergunta");
          dialogo = { previous_request: pedido, question_asked: r.pergunta };
          $("cx-ia-pedido").value = "";
          trocarPh("UI_IA_ANSWER_PH");
        } else {
          // Segunda pergunta (o prompt proíbe, mas o modelo pode insistir)
          // vira "não conseguiu", e o diálogo se encerra.
          const why = r.motivo || r.pergunta;
          estado(why ? T("UI_IA_NO_RESULT_WHY", { why }) : T("UI_IA_NO_RESULT"), "erro");
          dialogo = null;
          trocarPh("UI_IA_PEDIDO_PH");
        }
        $("cx-ia-pedido").focus();
        return;
      }
      dialogo = null;
      trocarPh("UI_IA_PEDIDO_PH");
      // UM passo de undo: Ctrl+Z volta ao que estava antes de pedir. E o
      // texto entra pelo mesmo `inserir()` da paleta -- que já conferirá.
      window.Construtor.substituir(r.expressao);
      estado(T("UI_IA_DONE"), "ok");
    } catch (e) {
      estado(T("ERROR_IA_FAILED", { detail: String(e) }), "erro");
    } finally {
      btn.disabled = false;
    }
  }

  // -------------------------------------------------------- histórico

  /* Os pedidos anteriores, do Rust (`.qdbu/ia/AAAAMMDD.jsonl`). Não é o
     histórico de EXPRESSÕES da paleta -- aquele guarda o resultado, por
     arquivo; este guarda a FRASE, que é o que a pessoa quer repetir e o que
     ela não consegue reescrever igual. */
  async function abrirHistorico() {
    const lista = $("cx-ia-lista");
    if (!lista.hidden) {
      lista.hidden = true;
      return;
    }
    lista.textContent = "";
    let itens = [];
    try {
      itens = await window.QDBU.iaHistorico(100);
    } catch (e) {
      /* sem histórico legível: a lista vazia já diz */
    }
    if (!itens.length) {
      const li = document.createElement("li");
      li.className = "vazio";
      li.textContent = T("UI_IA_HIST_EMPTY");
      lista.appendChild(li);
    }
    for (const it of itens) {
      const li = document.createElement("li");
      li.tabIndex = 0;
      const ped = document.createElement("span");
      ped.className = "ped";
      ped.textContent = it.pedido;
      const meta = document.createElement("span");
      meta.className = "meta";
      // O que aconteceu com aquele pedido: a expressão, a pergunta ou o erro.
      const saiu = it.erro ? "✗ " + it.erro : it.expr || it.pergunta || it.motivo || "";
      const toks = it.tok_in || it.tok_out ? " · " + T("UI_IA_TOKENS", { n: it.tok_in + it.tok_out }) : "";
      meta.textContent = it.q + (it.arq ? " · " + it.arq : "") + toks + (saiu ? " · " + saiu : "");
      li.append(ped, meta);
      /* Traz de volta O PEDIDO E A EXPRESSÃO daquela vez. Restaurar os dois
         não perde nada: um Sugerir seguinte sobrescreve o rascunho de
         qualquer jeito, e a expressão entra como UM passo de undo. E poupa a
         chamada -- repetir um pedido para receber a mesma resposta é gastar
         por nada.

         Sem expressão (o item foi uma pergunta, ou um erro) só a frase volta,
         e a linha de estado diz o que fazer em seguida. */
      const usar = () => {
        $("cx-ia-pedido").value = it.pedido;
        lista.hidden = true;
        if (it.expr) {
          window.Construtor.substituir(it.expr);
          estado(T("UI_IA_HIST_USED"), "ok");
          $("cx-expr").focus();
        } else {
          estado(T("UI_IA_HIST_USED_ASK"), "");
          $("cx-ia-pedido").focus();
        }
      };
      li.addEventListener("click", usar);
      li.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") { ev.preventDefault(); usar(); }
      });
      lista.appendChild(li);
    }
    lista.hidden = false;
  }

  function temChave() {
    return !!(status && status.chave_ok);
  }

  function mostrarCaixa(sim) {
    const caixa = $("cx-ia-caixa");
    caixa.hidden = !sim;
    if (!sim) {
      $("cx-ia-lista").hidden = true;
      $("cx-expr").focus();
      return;
    }
    if (temChave()) {
      estado("", "");
      $("cx-ia-pedido").focus();
    } else {
      // Sem chave a caixa vira a orientação: o que falta e onde se põe.
      estado(T("UI_IA_NO_KEY"), "");
      $("cx-ia-config").focus();
    }
  }

  // ------------------------------------------------------------- estado

  async function atualizarBotao() {
    try {
      status = await window.QDBU.iaStatus();
    } catch (e) {
      status = null;
    }
    const tem = temChave();
    $("cx-ia-pedido").hidden = !tem;
    $("cx-ia-enviar").hidden = !tem;
    $("cx-ia-config").hidden = tem;
    // A chave acabou de entrar com a caixa aberta: destrava sem novo clique.
    if (!$("cx-ia-caixa").hidden) mostrarCaixa(true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!$("cx-ia")) return;
    atualizarBotao();
    window.addEventListener("ia-mudou", (ev) => {
      status = ev.detail || status;
      atualizarBotao();
    });
    // Ao abrir o construtor: caixa recolhida e vazia -- o diálogo é um só e é
    // reaproveitado, e o pedido da abertura anterior pode ser de OUTRO alvo.
    // E reconfere a chave, que pode ter entrado nesse meio tempo.
    window.addEventListener("construtor-aberto", () => {
      $("cx-ia-caixa").hidden = true;
      $("cx-ia-pedido").value = "";
      trocarPh("UI_IA_PEDIDO_PH");
      dialogo = null;
      estado("", "");
      atualizarBotao();
    });

    // Para quem edita o .md: `ConstrutorIa.montarSistema(Construtor.contexto())`
    // no console mostra o prompt exatamente como vai. Nada mais sai daqui.
    window.ConstrutorIa = { montarSistema };

    $("cx-ia").addEventListener("click", () => mostrarCaixa($("cx-ia-caixa").hidden));
    $("cx-ia-enviar").addEventListener("click", () => pedir(false));
    // O ✦ junto do erro: aparece quando o expr.check recusou, some quando
    // passou. Clicar abre a caixa (que orienta, se não há chave) e pede a
    // correção daquela expressão, sem a pessoa precisar descrever o erro.
    window.addEventListener("construtor-status", (ev) => {
      $("cx-ia-corrigir").hidden = ev.detail.classe !== "erro";
    });
    $("cx-ia-hist").addEventListener("click", abrirHistorico);
    $("cx-ia-corrigir").addEventListener("click", () => {
      mostrarCaixa(true);
      if (temChave()) pedir(true);
    });
    // Preferências abre por cima do construtor (top layer empilha); ao gravar,
    // `ia-mudou` chega aqui e a caixa destrava sozinha.
    $("cx-ia-config").addEventListener("click", () => window.abrirConfig && window.abrirConfig());
    $("cx-ia-pedido").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); pedir(false); }
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        // Esc fecha a lista primeiro; só depois recolhe a caixa.
        if (!$("cx-ia-lista").hidden) $("cx-ia-lista").hidden = true;
        else mostrarCaixa(false);
      }
    });
  });
})();
