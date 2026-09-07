// idioma.js — o seletor de idioma, com as bandeiras.
//
// Vive DENTRO de Preferências (07/09/2026): o idioma se escolhe uma vez e
// nunca mais, e um controle de uma vez só não ganha lugar no cabeçalho.
//
// É um widget, não o motor: i18n.js decide a frase; este arquivo só mostra
// bandeira + nome e recolhe uma ESCOLHA. Ele não aplica nada sozinho — quem
// aplica é o Gravar do diálogo, pelo mesmo caminho dos outros campos, e o
// Cancelar deixa como estava. Foi por isso que o <select> nativo não serviu:
// além de não renderizar SVG, aplicar-na-hora e Cancelar não convivem.
//
// POR QUE SVG E NÃO EMOJI. A escolha natural seria 🇧🇷 🇺🇸 🇪🇸 — uma linha em vez
// de trinta. Mas emoji de bandeira é um par de indicadores regionais, e o
// Windows não tem glifo para eles: a fonte cai nas letras, e o botão mostra
// "BR", "US", "ES" em caixa alta. Como o alvo é Windows, o SVG não é capricho.

/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta é um script clássico e
 * todos dividem UM escopo global. Só `window.Idioma` sai daqui.
 */
(function () {
  const BANDEIRAS = {
    // Verde, losango amarelo, círculo azul. Sem a faixa nem as estrelas: em 20
    // pixels de altura elas viram sujeira, e a silhueta já identifica.
    "pt-BR":
      '<svg viewBox="0 0 28 20" aria-hidden="true">' +
      '<rect width="28" height="20" fill="#009B3A"/>' +
      '<path d="M14 2.4 25.6 10 14 17.6 2.4 10Z" fill="#FEDF00"/>' +
      '<circle cx="14" cy="10" r="4.1" fill="#002776"/></svg>',

    // Treze faixas seriam ilegíveis nesta altura; sete bastam para a leitura.
    en:
      '<svg viewBox="0 0 28 20" aria-hidden="true">' +
      '<rect width="28" height="20" fill="#B22234"/>' +
      '<g fill="#fff">' +
      '<rect y="2.9" width="28" height="2.9"/><rect y="8.6" width="28" height="2.9"/>' +
      '<rect y="14.3" width="28" height="2.9"/></g>' +
      '<rect width="12.6" height="11.4" fill="#3C3B6E"/></svg>',

    es:
      '<svg viewBox="0 0 28 20" aria-hidden="true">' +
      '<rect width="28" height="20" fill="#AA151B"/>' +
      '<rect y="5" width="28" height="10" fill="#F1BF00"/></svg>',
  };

  let raiz = null;
  let botao = null;
  let lista = null;
  let escolhido = null; // o código pendente; null = ainda não montado

  /** A bandeira como nó, nunca por innerHTML de fora: o SVG vem da constante
   *  acima, e passar por uma função que aceita string abriria a porta para
   *  alguém passar outra coisa depois. */
  function bandeira(cod) {
    const span = document.createElement("span");
    span.className = "bandeira";
    span.innerHTML = BANDEIRAS[cod] || "";
    return span;
  }

  function nomeDe(cod) {
    const info = window.I.idiomas().find((i) => i.cod === cod);
    return info ? info.nome : cod;
  }

  function pintarBotao() {
    botao.textContent = "";
    botao.appendChild(bandeira(escolhido));

    const nome = document.createElement("span");
    nome.className = "idioma-nome";
    nome.textContent = nomeDe(escolhido);
    botao.appendChild(nome);

    const seta = document.createElement("span");
    seta.className = "idioma-seta";
    seta.textContent = "▾";
    botao.appendChild(seta);

    botao.title = window.I.t("UI_LANGUAGE");
  }

  function pintarLista() {
    lista.textContent = "";
    for (const info of window.I.idiomas()) {
      const li = document.createElement("li");
      li.className = "idioma-item" + (info.cod === escolhido ? " ativo" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", info.cod === escolhido ? "true" : "false");
      li.dataset.cod = info.cod;
      li.appendChild(bandeira(info.cod));

      const nome = document.createElement("span");
      nome.className = "idioma-nome";
      // Cada idioma escrito NO PRÓPRIO idioma ("Español", não "Espanhol"):
      // quem procura a própria língua reconhece a palavra dela, mesmo sem
      // entender uma só palavra da tela em volta.
      nome.textContent = info.nome;
      li.appendChild(nome);
      lista.appendChild(li);
    }
  }

  function abrir(sim) {
    lista.hidden = !sim;
    botao.setAttribute("aria-expanded", sim ? "true" : "false");
    raiz.classList.toggle("aberto", sim);
  }

  /**
   * Monta o widget em `el` uma vez; chamadas seguintes só sincronizam a
   * escolha com o idioma vigente — é o que o diálogo faz ao abrir, para o
   * Cancelar de uma abertura anterior não deixar uma escolha pendurada.
   */
  function montar(el) {
    if (!el || !window.I) return;
    escolhido = window.I.idioma();

    if (raiz === el) {
      pintarBotao();
      return;
    }
    raiz = el;

    botao = document.createElement("button");
    botao.type = "button";
    botao.id = "idioma-btn";
    botao.className = "idioma-btn";
    botao.setAttribute("aria-haspopup", "listbox");
    botao.setAttribute("aria-expanded", "false");

    lista = document.createElement("ul");
    lista.id = "idioma-lista";
    lista.className = "idioma-lista";
    lista.setAttribute("role", "listbox");
    lista.hidden = true;

    raiz.textContent = "";
    raiz.appendChild(botao);
    raiz.appendChild(lista);

    botao.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (lista.hidden) pintarLista();
      abrir(lista.hidden);
    });

    // Escolher só ANOTA. Aplicar é do Gravar.
    lista.addEventListener("click", (ev) => {
      const li = ev.target.closest(".idioma-item");
      if (!li) return;
      escolhido = li.dataset.cod;
      pintarBotao();
      abrir(false);
    });

    // Clicar fora fecha a lista. O Esc só é interceptado com a lista aberta —
    // e na fase de captura, senão o <dialog> por baixo o receberia junto e
    // fecharia o diálogo inteiro em vez de só a lista.
    document.addEventListener("click", () => abrir(false));
    document.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key === "Escape" && !lista.hidden) {
          ev.stopPropagation();
          ev.preventDefault();
          abrir(false);
        }
      },
      true
    );

    window.addEventListener("idioma-mudou", () => {
      if (raiz) pintarBotao();
    });

    pintarBotao();
  }

  /** O código pendente — o que o Gravar aplica. */
  function valor() {
    return escolhido;
  }

  window.Idioma = { montar, valor };
})();
