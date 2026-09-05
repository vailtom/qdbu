// tema.js — a paleta, e o seletor dela no cabeçalho.
//
// DE ONDE VEIO
//
// Dos prints do NetPDV, o PDV do mesmo autor. Eram onze, e à primeira vista
// pareciam onze telas; são a MESMA tela em onze matizes. A receita de cada uma
// é sempre a mesma: um matiz só, em três alturas — muito escuro na moldura,
// médio nos detalhes, branco no conteúdo.
//
// O DBU original já fazia isso, ao contrário: a paleta dele também é um matiz só
// (quente, ~35°) em nove luminosidades, mas escuro no conteúdo. Copiar as cores
// de lá inverteria o app; o que viaja é o MATIZ. Mantendo luminosidade e
// saturação e trocando o ângulo da cor, sai o mesmo desenho noutra cor — e
// nenhuma regra de layout precisa mudar, porque o CSS já lê tudo de var().
//
// A SATURAÇÃO DOS FUNDOS É MENOR que a do acento, de propósito. Fundo saturado
// cansa numa tela que fica aberta o dia inteiro, e esta tem 400 mil linhas para
// ler. O acento é que carrega a cor.
//
// O QUE NÃO ENTRA NO TEMA: verde, vermelho e âmbar de significado (--ok,
// --erro, --aviso, em app.css). Cor que quer dizer alguma coisa não pode virar
// decoração: num tema azul, "aviso" azul deixaria de avisar.


/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta e um script classico, e
 * todos dividem UM escopo global: dois arquivos com `const PADRAO` no topo nao
 * convivem -- o segundo morre inteiro na analise e o que ele exportava deixa de
 * existir, sem erro visivel na tela. Só o que for posto em `window` sai daqui.
 */
(function () {
  const VARIAVEIS = [
    "--bg", "--bg2", "--bg3", "--bg4",
    "--line", "--line2",
    "--fg", "--dim", "--dim2",
    "--amber",
  ];

  /*
   * O que so o tema CLARO precisa mexer.
   *
   * As cores de significado nao acompanham o MATIZ do tema -- verde e sucesso
   * em qualquer paleta -- mas precisam acompanhar a LUMINOSIDADE: #6fbf73 sobre
   * branco da 1,9:1 e some. O significado se preserva; o valor se adapta.
   */
  const EXTRAS = ["--ok", "--aviso", "--erro", "--acento-texto"];

  /*
   * As ONZE do NetPDV, mais o ambar do DBU original -- que abre a lista por ser a cor
   * com que o app nasceu e o que continua valendo no app.css.
   *
   * Cada uma sai de um hex NUCLEO, que la e a cor escura da moldura contra
   * branco. Aqui o app ja e escuro, entao o nucleo nao serve de acento: o que
   * se aproveita dele e o MATIZ. A rampa de fundos usa as luminosidades do
   * ambar original com o matiz do nucleo; o acento e o mesmo matiz clareado
   * ATE PASSAR em 4.5:1 contra o fundo -- medido pela formula do WCAG, nao
   * escolhido no olho. O menor da familia ficou em 4.52:1 (Ameixa).
   *
   * DUAS ARMADILHAS que o gerador teve de tratar:
   *
   *   O grafite (#2E2C2E) e cinza com um residuo de matiz -- R46 G44 B46.
   *   Amplificar esse residuo o transformava num acento MAGENTA. Nucleo sem
   *   matiz util produz tema neutro, ponto.
   *
   *   A saturacao do acento tem teto. Sem ele, Vinho e Magenta saiam neon
   *   (#f2171a, #e506b6) e destoavam do resto da familia.
   */
  const TEMAS = [
    {
      /*
       * O unico CLARO da familia, inspirado no Kairo: pagina cinza clara,
       * paineis brancos, acento azul.
       *
       * Nao e a inversao de um tema escuro. Fundo branco exige repensar as tres
       * cores de significado (as escuras somem) e o texto que vai sobre o
       * acento -- por isso ele carrega `extra`, que os outros onze nao precisam.
       * Os onze pares de contraste foram medidos; o pior ficou em 1,49:1, que e
       * a linha divisoria, e o pior de TEXTO em 3,07:1 (rotulo terciario).
       */
      id: "claro",
      origem: "inspirado no Kairo",
      claro: true,
      cores: ["#f4f5f7", "#ffffff", "#eef0f3", "#e3e6ea", "#e2e5e9", "#cfd4da",
              "#151a21", "#5a6472", "#8a94a3", "#1f6fd0"],
      extra: {
        "--ok": "#137a3a",
        "--aviso": "#9a5b02",
        "--erro": "#b3261e",
        "--acento-texto": "#ffffff",
      },
    },
    {
      id: "grafite",
      origem: "NetPDV #2E2C2E",
      cores: ["#120f12", "#1a151a", "#211b21", "#272027", "#352a35", "#433643",
              "#e7dee7", "#938593", "#6a5e6a", "#808080"],
    },
    {
      id: "marinho",
      origem: "NetPDV #00366D",
      cores: ["#0b1016", "#11171e", "#151e27", "#18232f", "#202f3f", "#283c51",
              "#d5e3f0", "#778ca1", "#546474", "#307fcf"],
    },
    {
      id: "magenta",
      origem: "NetPDV #7B1265",
      cores: ["#150c13", "#1d121b", "#251722", "#2d1a29", "#3d2237", "#4d2c46",
              "#eed8ea", "#9d7b96", "#72566c", "#d241b4"],
    },
    {
      id: "vinho",
      origem: "NetPDV #681516",
      cores: ["#150c0d", "#1d1212", "#251717", "#2c1b1b", "#3c2324", "#4c2d2d",
              "#edd9d9", "#9c7c7c", "#715758", "#d65153"],
    },
    {
      id: "verde",
      origem: "NetPDV #004024",
      cores: ["#0b1611", "#111e18", "#15271f", "#182f25", "#203f31", "#28513f",
              "#d5f0e5", "#77a18f", "#547466", "#29ae73"],
    },
    {
      id: "oliva",
      origem: "NetPDV #3D621F",
      cores: ["#10140d", "#171c13", "#1d2418", "#232b1c", "#2e3a25", "#3b4a2f",
              "#e2ecda", "#8b9a7e", "#636f59", "#65a631"],
    },
    {
      id: "ouro",
      origem: "NetPDV #78650A",
      cores: ["#15140c", "#1e1b11", "#262316", "#2e2a19", "#3e3921", "#4f482a",
              "#efebd7", "#9f9879", "#736e55", "#ae9729"],
    },
    {
      id: "cafe",
      origem: "NetPDV #704614",
      cores: ["#15110c", "#1d1812", "#251f17", "#2c241b", "#3c3123", "#4d3e2c",
              "#eee4d8", "#9d8d7b", "#716557", "#ae7129"],
    },
    {
      id: "terracota",
      origem: "NetPDV #6C3414",
      cores: ["#150f0c", "#1d1612", "#251c17", "#2c211b", "#3c2c23", "#4d382c",
              "#eee0d8", "#9d877b", "#716057", "#c6662f"],
    },
    {
      id: "ameixa",
      origem: "NetPDV #3F0F37",
      cores: ["#140d13", "#1d121b", "#251722", "#2c1b29", "#3b2437", "#4c2d47",
              "#edd9ea", "#9c7c96", "#70586c", "#d039b7"],
    },
    {
      id: "indigo",
      origem: "NetPDV #190E33",
      cores: ["#0f0d14", "#16131c", "#1b1824", "#201b2c", "#2b243b", "#372e4b",
              "#dfd9ed", "#867d9b", "#5f5870", "#8d6cda"],
    },
  ];

  /*
   * O Cafe e o PADRAO, e por isso a rampa dele e a que esta no :root do
   * app.css: `aplicar(PADRAO)` LIMPA as variaveis em vez de escrever, entao o
   * que vale no padrao e a folha de estilo -- e as duas tem de concordar.
   *
   * Havia um "Ambar" aqui, o tom com que o app nasceu. Saiu por ser o mesmo
   * matiz do Cafe, so que mais claro: duas entradas para a mesma cor.
   */
  const PADRAO = "cafe";
  let atual = PADRAO;

  function daId(id) {
    return TEMAS.find((t) => t.id === id) || null;
  }

  /**
   * localStorage, como o idioma: a paleta é de quem está olhando a tela, não do
   * arquivo aberto. Restaurar uma sessão salva em outra máquina não pode trocar
   * as cores de quem está aqui agora.
   */
  /* Chave `dbu.` -> `qdbu.`, com a antiga lida uma vez. Mesma razão do
     `guardado()` de i18n.js: o tema escolhido não pode virar o padrão só
     porque o produto trocou de nome. Migra ao ler e apaga a antiga. */
  function guardado() {
    try {
      const v = localStorage.getItem("qdbu.tema");
      if (v) return daId(v) ? v : null;

      const antigo = localStorage.getItem("dbu.tema");
      if (antigo && daId(antigo)) {
        localStorage.setItem("qdbu.tema", antigo);
        localStorage.removeItem("dbu.tema");
        return antigo;
      }
      return null;
    } catch (e) {
      return null; // modo privado, storage bloqueado — segue no padrão
    }
  }

  function aplicar(id) {
    const t = daId(id);
    if (!t) return false;

    const raiz = document.documentElement;

    // Os extras saem SEMPRE antes: um tema sem `extra` tem de voltar aos
    // valores do app.css, e nao herdar os do tema anterior.
    EXTRAS.forEach((v) => raiz.style.removeProperty(v));
    if (t.extra) {
      for (const [v, cor] of Object.entries(t.extra)) raiz.style.setProperty(v, cor);
    }

    // Sem isto a barra de rolagem nativa, o <select> e a caixa de marcar
    // continuam desenhados pelo tema ESCURO do Windows dentro de uma tela clara.
    raiz.style.colorScheme = t.claro ? "light" : "dark";
    // O tema PADRÃO limpa em vez de escrever: assim o que vale é o que está no
    // app.css, e não uma cópia aqui que pode envelhecer sem ninguém notar.
    if (t.id === PADRAO) {
      VARIAVEIS.forEach((v) => raiz.style.removeProperty(v));
    } else {
      VARIAVEIS.forEach((v, i) => raiz.style.setProperty(v, t.cores[i]));
    }

    atual = t.id;
    raiz.dataset.tema = t.id;
    return true;
  }

  function mudarTema(id) {
    if (!aplicar(id)) return false;
    try {
      localStorage.setItem("qdbu.tema", id);
    } catch (e) {
      /* sem storage: vale só para esta execução */
    }
    window.dispatchEvent(new CustomEvent("tema-mudou", { detail: id }));
    return true;
  }

  const tema = () => atual;
  const temas = () => TEMAS.slice();

  // ------------------------------------------------------------- o seletor

  (function montarSeletor() {
    const raiz = document.getElementById("tema");
    if (!raiz) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "tema-btn";
    botao.setAttribute("aria-haspopup", "listbox");
    botao.setAttribute("aria-expanded", "false");

    const lista = document.createElement("ul");
    lista.className = "tema-lista";
    lista.setAttribute("role", "listbox");
    lista.hidden = true;

    raiz.appendChild(botao);
    raiz.appendChild(lista);

    /** A amostra: três quadradinhos com fundo, linha e acento do tema. */
    function amostra(t) {
      const span = document.createElement("span");
      span.className = "tema-amostra";
      // índices 1, 5 e 9: fundo de painel, linha e acento -- os três que dizem
      // como o tema se parece sem precisar aplicá-lo.
      for (const i of [1, 5, 9]) {
        const p = document.createElement("span");
        p.style.background = t.cores[i];
        span.appendChild(p);
      }
      return span;
    }

    function pintarBotao() {
      const t = daId(atual);
      botao.textContent = "";
      botao.appendChild(amostra(t));
      botao.title = window.I ? window.I.t("UI_THEME") : "Tema";
    }

    function pintarLista() {
      lista.textContent = "";
      for (const t of TEMAS) {
        const li = document.createElement("li");
        li.className = "tema-item" + (t.id === atual ? " ativo" : "");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", t.id === atual ? "true" : "false");
        li.dataset.tema = t.id;
        li.appendChild(amostra(t));

        const nome = document.createElement("span");
        nome.className = "tema-nome";
        nome.textContent = window.I ? window.I.t("UI_THEME_" + t.id.toUpperCase()) : t.id;
        li.appendChild(nome);

        // De onde a cor saiu, no tooltip: daqui a um ano ninguem lembra que
        // "indigo" veio do print 10 do NetPDV.
        li.title = t.origem;
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
      const li = ev.target.closest(".tema-item");
      if (!li) return;
      mudarTema(li.dataset.tema);
      pintarBotao();
      abrir(false);
    });

    document.addEventListener("click", () => abrir(false));
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !lista.hidden) abrir(false);
    });

    // O nome do tema é traduzido; trocar de idioma tem de repintar o rótulo.
    window.addEventListener("idioma-mudou", pintarBotao);

    aplicar(guardado() || PADRAO);
    pintarBotao();
  })();

  window.Tema = { tema, temas, mudarTema };
})();
