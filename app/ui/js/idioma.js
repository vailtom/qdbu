// idioma.js — o seletor de idioma do cabeçalho.
//
// Bandeira + nome, e um menu com os idiomas disponíveis. Separado de i18n.js
// de propósito: aquele arquivo é o motor (escolhe a frase) e não deve saber que
// existe uma tela; este é só um widget que fala com ele.
//
// POR QUE SVG E NÃO EMOJI. A escolha natural seria 🇧🇷 🇺🇸 🇪🇸 — uma linha em vez
// de trinta. Mas emoji de bandeira é um par de indicadores regionais, e o
// Windows não tem glifo para eles: a fonte cai nas letras, e o botão mostra
// "BR", "US", "ES" em caixa alta. Como o alvo é Windows, o SVG não é capricho.


/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta e um script classico, e
 * todos dividem UM escopo global: dois arquivos com `const PADRAO` no topo nao
 * convivem -- o segundo morre inteiro na analise e o que ele exportava deixa de
 * existir, sem erro visivel na tela. Só o que for posto em `window` sai daqui.
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

  (function montarSeletor() {
    const raiz = document.getElementById("idioma");
    if (!raiz || !window.I) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.id = "idioma-btn";
    botao.className = "idioma-btn";
    botao.setAttribute("aria-haspopup", "listbox");
    botao.setAttribute("aria-expanded", "false");

    const lista = document.createElement("ul");
    lista.id = "idioma-lista";
    lista.className = "idioma-lista";
    lista.setAttribute("role", "listbox");
    lista.hidden = true;

    raiz.appendChild(botao);
    raiz.appendChild(lista);

    /** A bandeira como nó, nunca por innerHTML de fora: o SVG vem da constante
     *  acima, mas passar por uma função que aceita string abriria a porta para
     *  alguém passar outra coisa depois. */
    function bandeira(cod) {
      const span = document.createElement("span");
      span.className = "bandeira";
      span.innerHTML = BANDEIRAS[cod] || "";
      return span;
    }

    function pintarBotao() {
      const cod = window.I.idioma();
      const info = window.I.idiomas().find((i) => i.cod === cod);
      botao.textContent = "";
      botao.appendChild(bandeira(cod));

      const nome = document.createElement("span");
      nome.className = "idioma-nome";
      nome.textContent = info ? info.nome : cod;
      botao.appendChild(nome);

      const seta = document.createElement("span");
      seta.className = "idioma-seta";
      seta.textContent = "▾";
      botao.appendChild(seta);

      botao.title = window.I.t("UI_LANGUAGE");
    }

    function pintarLista() {
      const atual = window.I.idioma();
      lista.textContent = "";

      for (const info of window.I.idiomas()) {
        const li = document.createElement("li");
        li.className = "idioma-item" + (info.cod === atual ? " ativo" : "");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", info.cod === atual ? "true" : "false");
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

    botao.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (lista.hidden) pintarLista();
      abrir(lista.hidden);
    });

    lista.addEventListener("click", (ev) => {
      const li = ev.target.closest(".idioma-item");
      if (!li) return;
      window.I.mudarIdioma(li.dataset.cod);
      abrir(false);
    });

    // Clicar fora e Esc fecham. Sem isso o menu fica pendurado sobre a grade e
    // some só no próximo clique no botão.
    document.addEventListener("click", () => abrir(false));
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !lista.hidden) abrir(false);
    });

    // Trocar o idioma repinta a tela inteira, inclusive este botão.
    window.addEventListener("idioma-mudou", pintarBotao);

    pintarBotao();
    window.I.aplicar();
  })();
})();
