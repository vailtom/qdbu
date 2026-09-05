// i18n.js — tradução da interface.
//
// POR QUE A TRADUÇÃO MORA AQUI E NÃO NO HARBOUR
//
// Duas razões, e a segunda foi aprendida apanhando:
//
//   1. A DLL não sabe — nem deve saber — o idioma de quem está olhando a tela.
//      Ela devolve `code` + `params`; a frase se monta deste lado. O mesmo
//      pedido serve a três idiomas sem recompilar nada.
//
//   2. Os `.prg` são UTF-8, o DBF é CP850, e o dispatcher converte nativo →
//      UTF-8 na saída. Um literal acentuado escrito no Harbour é convertido
//      DUAS vezes e chega na tela como "├®". Trazer a frase para o JS não
//      contorna o problema: elimina — JSON é UTF-8 por definição.
//
// A CHAVE CARREGA A SEVERIDADE NO PREFIXO
//
//     ERROR_   o pedido foi recusado; nada aconteceu
//     WARN_    parou no meio — normalmente o usuário cancelou
//     INFO_    deu certo; isto é a confirmação
//     UI_      texto fixo de interface (rótulo, título, dica)
//
// Isso paga em dois lugares. A cor da mensagem sai do prefixo, então não há
// lista de `if (codigo === "CANCELED")` espalhada pelo app — um código novo
// já nasce pintado certo. E quando falta a tradução, a chave vaza para a tela:
// "ERROR_FILE_NOT_FOUND" ao menos se anuncia como erro, enquanto
// "FILE_NOT_FOUND" pareceria um campo técnico qualquer.


/*
 * ESCOPO PRÓPRIO. Sem bundler, todo arquivo desta pasta e um script classico e
 * todos dividem UM escopo global.
 *
 * Nao e teoria: `atual` daqui ficava visivel para os outros arquivos, e um
 * `atual = ...` sem declaracao em tema.js passou a escrever NESTA variavel --
 * aplicar o tema Grafite trocava o IDIOMA para "grafite". Fechar cada arquivo
 * e o que impede um nome comum de virar um canal entre dois modulos que nao se
 * conhecem. So `window.I` sai daqui.
 */
(function () {
  const IDIOMAS = [
    { cod: "pt-BR", nome: "Português", pais: "Brasil" },
    { cod: "en", nome: "English", pais: "United States" },
    { cod: "es", nome: "Español", pais: "España" },
  ];

  const PADRAO = "en"; // o que sobra quando o navegador fala outra língua

  // Os dicionários se registram em window.I18N antes deste arquivo carregar.
  const DIC = window.I18N || (window.I18N = {});

  let atual = PADRAO;

  // ------------------------------------------------------------------ escolha

  /**
   * Idioma do sistema, reduzido ao que existe aqui.
   *
   * `navigator.language` vem como "pt-BR", "pt-PT", "en-GB", "es-AR". Casar o
   * código inteiro primeiro e só depois o prefixo faz "pt-PT" cair em pt-BR (o
   * português certo é mais útil que inglês) sem que "pt-BR" precise de exceção.
   */
  function doNavegador() {
    const lista = navigator.languages || [navigator.language || ""];
    for (const bruto of lista) {
      const l = String(bruto);
      if (DIC[l]) return l;
      const curto = l.split("-")[0];
      const achado = IDIOMAS.find((i) => i.cod.split("-")[0] === curto);
      if (achado && DIC[achado.cod]) return achado.cod;
    }
    return PADRAO;
  }

  /**
   * localStorage e não a sessão da DLL de propósito: o idioma é do computador,
   * não do arquivo aberto. Restaurar uma sessão salva em outra máquina não pode
   * trocar a língua da pessoa que está olhando agora.
   */
  /*
   * A CHAVE MUDOU DE `dbu.` PARA `qdbu.` na renomeação do produto, e a antiga
   * ainda é lida uma vez.
   *
   * Sem isso, quem já usava o app abriria a versão nova em português quando
   * tinha escolhido inglês — e a escolha não estaria "perdida", estaria
   * ignorada num `localStorage` que ninguém vai abrir para conferir. O custo de
   * ler a chave velha é uma linha; o de não ler é uma preferência que some sem
   * explicação.
   *
   * Migra ao ler: grava sob o nome novo e apaga o antigo, então isto acontece
   * uma vez por navegador e depois o ramo fica inerte.
   */
  function guardado() {
    try {
      const v = localStorage.getItem("qdbu.idioma");
      if (v) return DIC[v] ? v : null;

      const antigo = localStorage.getItem("dbu.idioma");
      if (antigo && DIC[antigo]) {
        localStorage.setItem("qdbu.idioma", antigo);
        localStorage.removeItem("dbu.idioma");
        return antigo;
      }
      return null;
    } catch (e) {
      return null; // modo privado, storage bloqueado — segue com o do navegador
    }
  }

  function idioma() {
    return atual;
  }

  function idiomas() {
    return IDIOMAS.filter((i) => DIC[i.cod]);
  }

  function mudarIdioma(cod) {
    if (!DIC[cod]) return false;
    atual = cod;
    try {
      localStorage.setItem("qdbu.idioma", cod);
    } catch (e) {
      /* sem storage: vale só para esta execução */
    }
    document.documentElement.lang = cod;
    aplicar();
    window.dispatchEvent(new CustomEvent("idioma-mudou", { detail: cod }));
    return true;
  }

  // ------------------------------------------------------------------ tradução

  /** Número com separador de milhar do idioma: 421714 → "421.714" / "421,714". */
  function numero(n) {
    return typeof n === "number" && isFinite(n) ? n.toLocaleString(atual) : n;
  }

  /**
   * Texto cru da chave, com a cadeia de reserva.
   *
   * idioma escolhido → inglês → a própria chave. O último degrau é o que torna
   * uma tradução faltando um incômodo visível em vez de uma tela em branco.
   */
  function bruto(chave, params) {
    let v = (DIC[atual] && DIC[atual][chave]) || (DIC[PADRAO] && DIC[PADRAO][chave]);
    if (v === undefined) return null;

    // Forma plural: { one, other }, escolhida por params.n. `n` é o nome único
    // do contável em todo o catálogo -- com um nome por chave ("records",
    // "files", "fields") o motor teria de adivinhar qual olhar.
    if (v && typeof v === "object") {
      const n = params && typeof params.n === "number" ? params.n : 0;
      v = Math.abs(n) === 1 ? v.one : v.other;
    }
    return v;
  }

  /** Um `{param}` que não veio, ou veio vazio, some da frase. */
  function vazio(params, nome) {
    if (!params || !(nome in params)) return true;
    const v = params[nome];
    return v === null || v === undefined || v === "";
  }

  /**
   * Resolve os trechos opcionais `[[...]]`.
   *
   * O Harbour manda `reason` e `detail` com o que o RDD disse -- que às vezes é
   * string vazia. Sem isso a frase termina em "não foi possível abrir 'X':" com
   * dois-pontos pendurados, e a pontuação varia por idioma, então costurar no
   * JS daria o mesmo problema em três lugares. Escrito no dicionário:
   *
   *     "não foi possível abrir '{file}'[[: {reason}]]"
   *
   * o trecho inteiro cai fora quando o que ele interpola não veio.
   */
  function opcionais(txt, params) {
    return txt.replace(/\[\[(.*?)\]\]/g, (todo, dentro) => {
      const nomes = [...dentro.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      return nomes.length && nomes.every((n) => vazio(params, n)) ? "" : dentro;
    });
  }

  /**
   * t("ERROR_FILE_EXISTS", {file: "NETCLI.csv"})
   *   → "'NETCLI.csv' já existe — marque substituir para sobrescrever"
   *
   * ESPECIALIZAÇÃO POR PARÂMETRO. Quando vem `param`, a chave `CODE_<param>` é
   * tentada antes de `CODE`. Assim ERROR_PARAM_REQUIRED tem uma frase genérica
   * ("preencha este campo") e, para os casos que merecem, uma sob medida
   * (ERROR_PARAM_REQUIRED_key → "informe a expressão de chave") -- sem precisar
   * de um código novo no Harbour para cada campo.
   *
   * Chave desconhecida devolve a própria chave. Não lança: uma frase feia numa
   * tela é um bug a corrigir; uma exceção aqui derrubaria a tela inteira, e o
   * webview não tem console para dizer por quê.
   */
  /**
   * Contagem de bytes em unidade que se lê. 874418955 → "834.0 MB".
   *
   * QUEM DECIDE É O MOLDE, e não quem manda o número. A DLL manda bytes crus
   * porque é o que ela sabe; a frase é que decide se aquilo se lê como tamanho
   * ("ocupa 834 MB") ou como contagem. Sem isto, `ERROR_BACKUP_NEEDS_CONFIRM`
   * dizia "ocupa 874.418.955 bytes" — verdade que ninguém consegue ler.
   *
   * Escrito `{bytes:size}` no dicionário. O sufixo é do MOLDE, então cada
   * idioma escolhe sozinho, e um parâmetro que em outra frase seja contagem
   * pura continua saindo como número.
   *
   * Base 1024 com os símbolos KB/MB/GB: é o que o Explorer do Windows mostra, e
   * concordar com o sistema operacional importa mais aqui do que a briga entre
   * KiB e KB — a pessoa vai comparar este número com o que vê na pasta.
   */
  function tamanho(v) {
    const n = Number(v);
    if (!isFinite(n)) return String(v);
    if (n < 1024) return numero(n) + " B";

    const un = ["KB", "MB", "GB", "TB"];
    let x = n / 1024;
    let i = 0;
    while (x >= 1024 && i < un.length - 1) {
      x /= 1024;
      i++;
    }
    // Uma casa decimal: duas dão precisão falsa, zero perde a diferença entre
    // 1,2 GB e 1,9 GB, que é justamente a que decide se cabe no disco.
    return numero(Math.round(x * 10) / 10) + " " + un[i];
  }

  function t(chave, params) {
    let txt = null;

    if (params && params.param) {
      txt = bruto(chave + "_" + params.param, params);
    }
    if (txt === null || txt === undefined) txt = bruto(chave, params);
    if (txt === null || txt === undefined) return chave;
    if (!params) return String(txt);

    const pronto = opcionais(String(txt), params).replace(
      /\{(\w+)(?::(\w+))?\}/g,
      (todo, nome, formato) => {
        if (!(nome in params)) return todo;
        const v = params[nome];
        if (v === null || v === undefined) return "";
        return formato === "size" ? tamanho(v) : numero(v);
      }
    );

    /*
     * Pontuacao dobrada no fim.
     *
     * Ha frases que terminam num parametro que JA e uma frase pronta:
     * "Filtro nao reaplicado --- {detail}." recebe em {detail} o texto de outro
     * erro, que ja veio com o proprio ponto. O resultado seria ".." -- e a
     * alternativa (tirar o ponto do molde) quebraria o caso em que o detalhe vem
     * cru, sem pontuacao, que e a maioria. Aparar o excesso no fim resolve os
     * dois sem o molde ter de adivinhar o que vai receber.
     */
    return pronto.replace(/([.!?…])\s*[.]$/, "$1");
  }

  /**
   * Letra do tipo dBASE → palavra no idioma. "C" → "texto" / "text" / "texto".
   *
   * A DLL manda a letra crua justamente para não decidir a palavra: ver o
   * comentário que substituiu NomeDoTipo() em src/api_filter.prg.
   */
  function tipo(letra) {
    return letra ? t("UI_TYPE_" + String(letra).toUpperCase()) : "";
  }

  /**
   * Severidade a partir do prefixo da chave.
   *
   * Devolve a classe CSS que o app já usa ("erro" / "aviso" / "ok"), então
   * mensagem nova entra pintada certo sem tocar em quem exibe.
   */
  function severidade(chave) {
    const c = String(chave || "");
    if (c.startsWith("ERROR_")) return "erro";
    if (c.startsWith("WARN_")) return "aviso";
    if (c.startsWith("INFO_")) return "ok";
    return "";
  }

  /**
   * Frase de um erro vindo da DLL.
   *
   * `message` é o fallback em inglês que o Harbour montou -- serve ao log e ao
   * cliente em C. Aqui ele só entra se a chave não existir no dicionário, o que
   * significa código novo sem tradução: melhor a frase em inglês que a chave crua.
   */
  function doErro(e) {
    if (!e) return t("ERROR_UNSPECIFIED");
    const chave = e.codigo || e.code;
    if (!chave) return e.message || t("ERROR_UNSPECIFIED");

    // `type` chega como a letra do dBASE; a frase quer a palavra. Traduzir aqui,
    // e não no dicionário, porque interpolação não aninha tradução.
    const p = Object.assign({}, e.params || {});
    if (p.type) p.type = tipo(p.type);

    if (bruto(chave, p) === undefined && bruto(chave + "_" + p.param, p) === undefined) {
      // Código sem tradução: a frase em inglês que o Harbour montou é melhor que
      // a chave crua. Quando nem ela existe, a chave -- que ao menos diz ERROR_.
      return e.message || chave;
    }
    return t(chave, p);
  }

  // ------------------------------------------------------------------ o DOM

  /**
   * Aplica as traduções no HTML.
   *
   *   data-i18n="CHAVE"          troca o texto do elemento
   *   data-i18n-ph="CHAVE"       troca o placeholder
   *   data-i18n-title="CHAVE"    troca o title
   *   data-i18n-aria="CHAVE"     troca o aria-label
   *
   * Só o texto é trocado, nunca o innerHTML: um dicionário é dado, e mandar dado
   * para innerHTML é como se escreve um XSS sem perceber. Onde a frase precisa
   * de negrito no meio, o HTML fica com filhos e a chave vai no filho de texto.
   */
  function aplicar(raiz) {
    const r = raiz || document;

    r.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    r.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    r.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    r.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });

    // Valor inicial de campo (o nome da planilha nasce "Dados"/"Data"/"Datos").
    // Só enquanto o usuário não digitou: sobrescrever o que ele escreveu ao
    // trocar de idioma seria apagar trabalho dele.
    //
    // A marca é posta AQUI, no primeiro toque, e não num ouvinte de fora: a
    // guarda e quem a liga têm de nascer juntas, senão a guarda vira decoração --
    // foi o que aconteceu na primeira versão deste arquivo, em que nada nunca
    // marcava `i18nTocado` e o campo era reescrito mesmo depois de digitado.
    r.querySelectorAll("[data-i18n-value]").forEach((el) => {
      if (!el.dataset.i18nLigado) {
        el.dataset.i18nLigado = "1";
        el.addEventListener("input", () => {
          el.dataset.i18nTocado = "1";
        });
      }
      if (el.dataset.i18nTocado !== "1") el.value = t(el.dataset.i18nValue);
    });
  }

  // ------------------------------------------------------------------ partida

  atual = guardado() || doNavegador();
  document.documentElement.lang = atual;

  window.I = {
    t,
    tipo,
    doErro,
    severidade,
    numero,
    tamanho,
    aplicar,
    idioma,
    idiomas,
    mudarIdioma,
  };
})();
