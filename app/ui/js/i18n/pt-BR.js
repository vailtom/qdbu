// Português do Brasil — o dicionário de referência.
//
// É aqui que a frase nasce; en.js e es.js seguem esta lista chave por chave.
// Quem escreve o app pensa em português, então uma chave nova aparece primeiro
// neste arquivo — e uma que falte nos outros dois cai para o inglês, nunca para
// a tela vazia. Ver a cadeia de reserva em ../i18n.js.
//
// CONVENÇÕES
//   {nome}        buraco preenchido com params.nome
//   [[: {x}]]     trecho que some inteiro quando {x} não veio
//   {one, other}  plural escolhido por params.n
//
// Prefixo da chave = severidade: ERROR_ recusou, WARN_ parou no meio, INFO_
// deu certo, UI_ texto fixo de tela. Ver src/util/err.prg.

(window.I18N || (window.I18N = {}))["pt-BR"] = {

  // ---------------------------------------------------------------- idiomas
  UI_LANGUAGE: "Idioma",
  UI_THEME: "Tema",
  UI_THEME_CLARO: "Claro",
  UI_THEME_GRAFITE: "Grafite",
  UI_THEME_MARINHO: "Azul-marinho",
  UI_THEME_MAGENTA: "Magenta",
  UI_THEME_VINHO: "Vinho",
  UI_THEME_VERDE: "Verde",
  UI_THEME_OLIVA: "Oliva",
  UI_THEME_OURO: "Ouro",
  UI_THEME_CAFE: "Café",
  UI_THEME_TERRACOTA: "Terracota",
  UI_THEME_AMEIXA: "Ameixa",
  UI_THEME_INDIGO: "Índigo",

  // ------------------------------------------------------------- topo e árvore
  UI_SUBTITLE: "Utilitário de banco de dados",
  UI_NEW_CONNECTION: "+ Conexão",
  UI_SEARCH_PLACEHOLDER: "Buscar conexão ou arquivo…",
  UI_CONNECTIONS: "Conexões",
  UI_PANEL_WIDTH: "Largura do painel",
  UI_DRAG_RESIZE: "Arraste para redimensionar (duplo clique volta ao padrão)",
  UI_NO_FILE_OPEN: "Nenhum arquivo aberto",
  UI_EMPTY_HINT:
    "Cadastre uma conexão — uma pasta com arquivos DBF — e dê duplo clique " +
    "num arquivo à esquerda.",

  // ------------------------------------------------------------------ visões
  UI_FILE_VIEW: "Visão do arquivo",
  UI_VIEW_STRUCTURE: "Estrutura",
  UI_VIEW_DATA: "Dados",
  UI_COLUMNS: "Colunas",
  UI_COLUMNS_TITLE: "Escolher colunas visíveis",
  UI_INDEXES: "Índices",
  UI_INDEXES_TITLE: "Índices NTX e ordem ativa",
  UI_FILTER: "Filtro",
  UI_FILTER_TITLE: "Filtrar registros",
  UI_EXPORT: "Exportar",
  UI_EXPORT_TITLE: "Exportar para CSV, JSON ou Excel",

  // ------------------------------------------------------------------ filtro
  UI_MODE_GUIDED: "Guiado",
  UI_MODE_EXPR: "Expressão",
  UI_ADD_CONDITION: "+ condição",
  UI_PARTIAL_SUGGESTIONS: "sugestões parciais",
  UI_PARTIAL_SUGGESTIONS_TITLE:
    "A lista mostra só os valores encontrados no início do arquivo",
  UI_FILTER_PLACEHOLDER: "CLI_EST == 'SP' .AND. !Empty(CLI_CGC)",
  UI_CHECK: "Conferir",
  UI_CHECK_TITLE: "Conferir sem aplicar",
  UI_APPLY: "Aplicar",
  UI_CLEAR: "Limpar",
  UI_COUNT: "Contar",
  UI_COUNT_TITLE: "Contar registros que passam",
  UI_CLOSE: "Fechar",

  UI_OP_EQ: "é igual a",
  UI_OP_NE: "é diferente de",
  UI_OP_CONTAINS: "contém",
  UI_OP_STARTS: "começa com",
  UI_OP_GT: "maior que",
  UI_OP_LT: "menor que",
  UI_OP_GE: "maior ou igual",
  UI_OP_LE: "menor ou igual",
  UI_OP_EMPTY: "está vazio",
  UI_OP_NOT_EMPTY: "não está vazio",
  UI_USE_CONDITION: "usar esta condição",
  UI_ADD_CONDITION_BELOW: "adicionar condição abaixo",
  UI_PRECEDENCE_HINT:
    "E liga mais forte que OU: os parênteses mostram como as condições " +
    "ficaram agrupadas de fato.",
  UI_EXPR_TO_APPLY: "expressão que será aplicada",

  // ----------------------------------------------------------- painel colunas
  UI_VISIBLE_COLUMNS: "Colunas visíveis",
  UI_ALL_F: "Todas",
  UI_NONE_F: "Nenhuma",
  UI_INVERT: "Inverter",
  UI_COLUMN_JUMP_HINT: "→ leva até a coluna na grade.",
  UI_FIND_COLUMN: "Localizar coluna…",

  // ----------------------------------------------------------- painel índices
  UI_CLOSE_ALL: "Fechar todos",
  UI_CLOSE_ALL_INDEXES: "Fechar todos os índices",
  UI_CREATE_ELLIPSIS: "Criar…",
  UI_CREATE_INDEX_TITLE: "Criar um índice NTX",
  UI_KEY: "Chave",
  UI_FILE: "Arquivo",
  UI_ONLY_RECORDS_THAT: "Só os registros que…",
  UI_OPTIONAL: "(opcional)",
  UI_UNIQUE_KEYS: "chaves únicas",
  UI_CREATE: "Criar",
  UI_CANCEL: "Cancelar",
  UI_IN_FOLDER: "Na pasta",
  UI_FILTER_INDEX: "Filtrar índice…",

  // -------------------------------------------------------------- barra grade
  UI_FIRST_PAGE: "Primeira página (Ctrl+Home)",
  UI_PREV_PAGE: "Página anterior (PgUp)",
  UI_NEXT_PAGE: "Próxima página (PgDn)",
  UI_LAST_PAGE: "Última página (Ctrl+End)",
  UI_GOTO: "ir p/",
  UI_RECORD: "registro",
  UI_SEARCH: "buscar",
  UI_NEXT_MATCH: "Próxima ocorrência (F3)",
  UI_ORDER: "ordem",
  UI_ORDER_PHYSICAL: "Física",
  UI_ORDER_TITLE: "Índice que comanda a ordem das linhas",
  UI_ROWS_PER_PAGE: "linhas/pág",
  UI_GRID_SETTINGS: "Ajustes da grade",
  UI_GRID_SETTINGS_TITLE: "Linhas por página e exibição de excluídos",
  UI_ROWS_N: "{n} linhas",
  UI_SHOW_DELETED_GLOBAL: "Vale para todas as abas: mostrar excluídos é um ajuste da sessão inteira, não deste arquivo.",
  UI_LAST_READ: "Última leitura — a tela se atualiza sozinha a cada 5 s enquanto nada está sendo editado",
  UI_RELOAD: "Reler do disco (F5)",

  // ---------------------------------------------------------------- estrutura
  UI_FIELD: "Campo",
  UI_TYPE: "Tipo",
  UI_SIZE: "Tam.",
  UI_DEC: "Dec.",

  // As letras do dBASE viajam cruas da DLL; a palavra é escolhida aqui, com o
  // nome que a listagem de estrutura sempre usou — "caractere", não "texto".
  UI_TYPE_C: "texto",
  UI_TYPE_N: "número",
  UI_TYPE_D: "data",
  UI_TYPE_L: "lógico",
  UI_TYPE_M: "texto longo",
  UI_TYPE_A: "vetor",
  UI_TYPE_B: "code block",
  UI_TYPE_U: "NIL",

  // ------------------------------------------------------------------ tarefa
  UI_STOP: "Parar",
  UI_CHECKING: "verificando…",
  UI_LOG: "log:",

  // --------------------------------------------------------------- exportação
  UI_EXPORT_TO: "Exportar",
  UI_FORMAT: "Formato",
  UI_FMT_CSV: "CSV",
  UI_FMT_JSON: "JSON",
  UI_FMT_XLSX: "Excel (.xlsx)",
  UI_FMT_DBF: "DBF (outra tabela)",
  UI_CHOOSE_WHERE_SAVE: "Escolher onde salvar…",
  UI_CSV_OPTIONS: "Opções do CSV",
  UI_XLSX_OPTIONS: "Opções da planilha",
  UI_DBF_OPTIONS: "Sobre o DBF gerado",
  UI_SEPARATOR: "Separador",
  UI_SEP_SEMICOLON: "Ponto e vírgula (Excel pt-BR)",
  UI_SEP_COMMA: "Vírgula",
  UI_SEP_TAB: "Tabulação",
  UI_ENCODING: "Codificação",
  UI_ENC_ANSI: "ANSI (sistemas antigos)",
  UI_ENC_CP850: "CP850 (DOS)",
  UI_HEADER: "Cabeçalho",
  UI_HEADER_FIRST_LINE: "Na primeira linha",
  UI_HEADER_NONE: "Não incluir",
  UI_DBF_NOTE:
    "Os campos escolhidos viram a estrutura do novo arquivo, com os tipos " +
    "originais. Índice e filtro ativos valem: o arquivo sai já na ordem e só " +
    "com o que passa.",
  UI_SHEET_NAME: "Nome da planilha",
  UI_SHEET_DEFAULT: "Dados",
  UI_RECORDS: "Registros",
  UI_ONLY_GRID: "Só as da grade",
  UI_FILTER_BY_NAME: "filtrar por nome…",
  UI_PREVIEW: "Prévia",
  UI_REFRESH: "Atualizar",
  UI_SKIP_DELETED: "Pular marcados p/ exclusão",
  UI_TIMESTAMP_NAME: "Data e hora no nome",
  UI_SCOPE_FILTERED: "Os que o filtro deixa passar",
  UI_SCOPE_ALL: "Todos, ignorando o filtro",
  UI_FILTER_IN_FORCE: "Filtro em vigor:",
  UI_EMPTY_FILE_PREVIEW: "(arquivo vazio)",
  UI_ACT_ON_FILTERED: "agem sobre as {n} filtradas",
  UI_WILL_EXPORT: { one: "{n} registro sairá", other: "{n} registros sairão" },

  UI_SAVE_DIALOG_TITLE: "Exportar para",
  UI_FT_CSV: "Texto separado (*.csv)",
  UI_FT_JSON: "JSON (*.json)",
  UI_FT_XLSX: "Planilha do Excel (*.xlsx)",
  UI_FT_DBF: "Tabela dBASE (*.dbf)",
  UI_FT_ALL: "Todos os arquivos",

  // ------------------------------------------------------------- nova conexão
  UI_NEW_CONNECTION_TITLE: "Nova conexão",
  UI_CONNECTION_EXPLAIN:
    "Uma conexão é uma pasta com arquivos DBF — normalmente a pasta de um cliente.",
  UI_FOLDER: "Pasta",
  UI_NAME: "Nome",
  UI_NAME_OPTIONAL: "(opcional — usa o nome da pasta)",
  UI_PH_CONNECTION_NAME: "Cliente A",
  UI_ADD: "Adicionar",

  // =========================================================== recusas da DLL
  //
  // Uma entrada por código de src/util/err.prg. Faltar aqui não quebra nada --
  // cai para o inglês, e daí para a própria chave.

  ERROR_UNSPECIFIED: "Erro não identificado.",
  ERROR_BAD_ENVELOPE: "O pedido não chegou como JSON válido.",
  ERROR_UNKNOWN_METHOD: "O método '{method}' não existe.",

  // O sufixo é o nome do parâmetro: ver a especialização em i18n.js.
  ERROR_PARAM_REQUIRED: "Preencha este campo.",
  ERROR_PARAM_REQUIRED_path: "Informe o caminho do arquivo.",
  ERROR_PARAM_REQUIRED_dir: "Informe a pasta da conexão.",
  ERROR_PARAM_REQUIRED_name: "Informe o nome da conexão.",
  ERROR_PARAM_REQUIRED_key: "Informe a expressão de chave.",
  ERROR_PARAM_REQUIRED_expr: "Informe a condição.",
  ERROR_PARAM_REQUIRED_value: "Informe o valor a procurar.",
  ERROR_PARAM_REQUIRED_method: "O pedido não disse qual método chamar.",
  ERROR_PARAM_REQUIRED_h: "Informe o arquivo aberto ou o caminho.",
  ERROR_PARAM_REQUIRED_state: "Estado da sessão ausente.",
  ERROR_PARAM_REQUIRED_fields: "Escolha pelo menos um campo.",

  ERROR_PARAM_OUT_OF_RANGE: "{value} está fora de {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_recno: "Não há registro {value}; o arquivo vai de {min} a {max}.",
  ERROR_PARAM_OUT_OF_RANGE_anchor: "A âncora {value} está fora de {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_order:
    "Não há ordem {value}; as ordens vão de {min} a {max} (0 = ordem física).",

  ERROR_PARAM_TOO_SMALL: "O mínimo é {min}.",
  ERROR_PARAM_TOO_SMALL_count: "Peça pelo menos {min} registro por página.",
  ERROR_PARAM_TOO_BIG: "O máximo é {max}.",
  ERROR_PARAM_TOO_BIG_count: "{value} passa do teto de {max} registros por página.",
  ERROR_PARAM_MUST_BE_LIST: "Este campo espera uma lista de nomes.",
  ERROR_BAD_DATE: "'{value}' não é uma data; use AAAA-MM-DD ou DD/MM/AAAA.",
  ERROR_BAD_ANCHOR: "A âncora precisa ser o topo, o fim, ou um número de registro.",

  ERROR_INVALID_HANDLE: "O arquivo '{handle}' não está aberto.",
  ERROR_HANDLE_CLOSED: "Este arquivo foi fechado em {closedIn}.",

  ERROR_CONNECTION_EXISTS: "Já existe uma conexão chamada '{name}'.",
  ERROR_CONNECTION_NOT_FOUND: "Não há conexão chamada '{name}'.",
  ERROR_DIR_NOT_FOUND: "A pasta '{dir}' não existe.",

  ERROR_FILE_NOT_FOUND: "O arquivo '{file}' não existe.",
  ERROR_FILE_EXISTS: "'{file}' já existe; marque substituir para sobrescrever.",
  ERROR_FILE_ALREADY_OPEN: "'{file}' já está aberto nesta sessão.",
  ERROR_NOT_A_DBF: "'{file}' não é um DBF válido[[: {reason}]].",
  ERROR_MEMO_FILE_MISSING:
    "'{file}' tem campo memo, mas o arquivo {memo} não está ao lado.",
  ERROR_OPEN_FAILED: "Não foi possível abrir '{file}'[[: {reason}]].",

  ERROR_FIELD_NOT_FOUND: "O campo '{field}' não existe em {alias}.",
  ERROR_NO_COLUMNS: "Nenhuma coluna selecionada.",

  ERROR_EXPR_INVALID: "A expressão não compila: {detail}.",
  ERROR_EXPR_NOT_LOGICAL:
    "A condição precisa resultar em lógico (.T./.F.); esta devolve {type}.",
  ERROR_EXPR_NOT_LOGICAL_for:
    "A condição FOR precisa resultar em lógico (.T./.F.); esta devolve {type}.",

  ERROR_NOT_AN_INDEX: "'{file}' não é um índice NTX[[: {reason}]].",
  ERROR_INDEX_ALREADY_OPEN: "'{file}' já está aberto neste arquivo.",
  ERROR_INDEX_NOT_OPEN: "'{file}' não está aberto neste arquivo.",
  ERROR_INDEX_OPEN_FAILED: "Não foi possível abrir '{file}'[[: {detail}]].",
  ERROR_INDEX_UNKNOWN_FUNCTION:
    "'{file}' usa a função {func}, que não existe nesta DLL — a chave é {key}.",
  ERROR_INDEX_FIELD_NOT_IN_FILE:
    "'{file}' usa {field}, que não existe em {alias}; este índice " +
    "provavelmente é de outro arquivo — a chave é {key}.",
  ERROR_INDEX_REJECTED_BY_RDD: "'{file}' não foi aceito pelo RDD.",
  ERROR_INDEX_OPEN_ON_CREATE: "'{file}' está aberto; feche-o antes de recriar.",
  ERROR_INDEX_KEY_BAD_TYPE:
    "A chave devolve {type}; um índice NTX aceita caractere, numérico ou data.",
  ERROR_INDEX_CREATE_FAILED: "Não foi possível criar '{file}'[[: {reason}]].",
  ERROR_NO_ACTIVE_ORDER:
    "SEEK exige uma ordem controladora; sem índice ativo use LOCATE, que " +
    "percorre o arquivo sequencialmente.",
  ERROR_SEEK_BAD_KEY_TYPE:
    "A chave do índice é {type}; SEEK não procura neste tipo.",

  ERROR_EXPORT_FAILED: "Não foi possível criar '{file}'[[: {reason}]].",
  ERROR_EXPORT_OPEN_FAILED:
    "'{file}' foi criado mas não abriu para gravação[[: {reason}]].",
  ERROR_SAME_FILE: "O destino é o próprio arquivo aberto; escolha outro nome.",

  WARN_CANCELED_PARTIAL_FILE: {
    one: "Cancelado com {n} registro; '{file}' foi apagado por estar incompleto.",
    other: "Cancelado com {n} registros; '{file}' foi apagado por estar incompleto.",
  },
  WARN_CANCELED_INDEX: "Criação cancelada; '{file}' foi apagado por estar incompleto.",

  // =========================================================== o app falando
  //
  // Mensagens montadas no JS. Mesmas regras de prefixo.

  // árvore e conexões
  INFO_CONNECTION_ADDED: "Conexão '{name}' adicionada.",
  INFO_CONNECTION_REMOVED: "Conexão '{name}' removida.",
  UI_NO_CONNECTIONS: "Nenhuma conexão cadastrada.",
  UI_NOTHING_MATCHES: "Nada casa com a busca.",
  UI_NO_MATCH_SEARCH: "Nenhum arquivo casa com a busca.",
  UI_NO_DBF_HERE: "Nenhum DBF nesta pasta.",
  UI_READING_FOLDER: "lendo a pasta…",
  UI_OPENING: "abrindo {file}…",
  UI_LOADING: "lendo…",
  UI_STOPPING: "parando…",
  UI_FOLDER_UNREADABLE: "Não foi possível ler a pasta.",
  UI_FOLDER_NOT_FOUND: "Pasta não encontrada.",
  UI_CONNECTION_ACTIONS: "Ações da conexão {name}",
  UI_MENU_OPEN_FOLDER: "Abrir no Explorer",
  UI_MENU_RELOAD: "Reler os arquivos",
  UI_MENU_REMOVE: "Remover a conexão",
  ERROR_OPEN_FOLDER_FAILED: "Não foi possível abrir a pasta: {detail}.",
  UI_NOT_A_DBF_SHORT: "NÃO É UM DBF: {reason}.",
  UI_DOUBLE_CLICK_TO_OPEN: "duplo clique para abrir",
  UI_FILES_COUNT: { one: "{n} arquivo", other: "{n} arquivos" },

  // abas e grade
  UI_ALREADY_OPEN_SHORT: "Já estava aberto.",
  UI_CLOSE_TAB: "Fechar {alias}",
  UI_TAB_SUMMARY: "{records} registros, {fields} campos",
  UI_EMPTY_FILE: "Arquivo sem registros.",
  UI_EMPTY_PAGE: "Nada nesta página.",
  UI_EMPTY_FILTERED: "Nenhum registro atende ao filtro ativo nesta página.",
  UI_DELETED_RECORD: "Registro marcado para exclusão.",
  UI_HAS_NUL_BYTE: "Contém byte NUL.",
  UI_LAST_READ_AT: "última leitura: {time}",
  UI_GO_TO_COLUMN: "ir até {name} na grade",
  UI_DRAW_FAILED: "Falha ao desenhar {what}.",
  UI_INTERNAL_ERROR: "Erro interno: {detail}.",
  UI_UNHANDLED_REJECTION: "Promessa rejeitada sem tratamento.",

  // colunas
  ERROR_NO_COLUMN_MATCHES: "Nenhuma coluna casa com a busca.",
  ERROR_NEED_ONE_VISIBLE: "Pelo menos uma coluna precisa ficar visível.",
  ERROR_INVERT_WOULD_EMPTY: "Inverter deixaria a grade sem colunas.",
  ERROR_NO_COLUMN_NAMED: "Nenhuma coluna com esse nome.",
  ERROR_PICK_ONE_COLUMN: "Marque pelo menos uma coluna.",

  // índices
  INFO_INDEX_OPENED: "Índice aberto — ordem {order}: {key}.",
  INFO_INDEXES_CLOSED: "Índices fechados — ordem física.",
  INFO_INDEX_CREATED: "Índice criado — ordem {order}: {key}.",
  INFO_INDEX_REBUILT: "Índice recriado — ordem {order}: {key}.",
  UI_PHYSICAL_ORDER: "Ordem física (por número de registro).",
  UI_ORDERED_BY: "Ordenado por {key}.",
  UI_NO_INDEX_OPEN: "Nenhum índice aberto — abra em Índices.",
  UI_NONE_OPEN: "nenhum aberto",
  UI_N_OPEN: { one: "{n} aberto", other: "{n} abertos" },
  UI_CLOSE_INDEX: "fechar {file}",
  UI_NOTHING_ELSE_MATCHES: "Nada mais casa com este arquivo.",
  UI_ALREADY_ORDERED_BY: "Já ordenado por {name}.",
  UI_INDEX_AVAILABLE_FOR: "Há um índice por {name} ({file}) — abra em Índices.",
  UI_NO_INDEX_FOR: "Sem índice por {name} — DBF só ordena por índice.",
  ERROR_INDEX_NOT_CREATED: "Não foi criado.",
  UI_CONFIRM_OVERWRITE: "{file} já existe.\n\nSobrescrever?",
  ERROR_TELL_FILE_NAME: "Informe o nome do arquivo.",
  ERROR_TELL_KEY: "Informe a chave.",
  INFO_KEY_OK: "Chave ok — {type}.",
  UI_EVALUATED_FIRST_RECORD: "avaliada no primeiro registro",

  // filtro
  INFO_FILTER_APPLIED:
    "Aplicado. E liga mais forte que OU — confira o agrupamento na prévia.",
  INFO_FILTER_ACTIVE: "Filtro aplicado: {expr}.",
  INFO_EXPR_OK: "{expr} → ok",
  ERROR_EXPR_RETURNS: "{expr} → devolve {type}; precisa ser lógico.",
  UI_EXPR_RESULT: "{expr} → {value}",
  ERROR_TELL_VALUE: "Informe o valor.",
  INFO_COUNT_RESULT: {
    one: "{n} de {total} registro passa.",
    other: "{n} de {total} registros passam.",
  },
  WARN_COUNT_STOPPED: "Contagem interrompida em {n} — o total continua desconhecido.",

  // busca
  UI_SEEK_BY_INDEX: "buscar {key}",
  UI_SEEK_BY_INDEX_TITLE: "SEEK por {key}: salta a cada tecla",
  UI_SCAN_SEARCH: "buscar (Enter)",
  UI_SCAN_SEARCH_TITLE: "Sem ordem controladora: varredura sequencial, só no Enter",
  ERROR_NOTHING_FROM: "Nenhuma chave a partir de {value}.",
  INFO_APPROXIMATE: "Soft seek — chave mais próxima: {value}.",
  ERROR_NO_TEXT_COLUMN: "Nenhuma coluna caractere visível para percorrer.",
  ERROR_NOT_FOUND: "Não encontrado: {value}.",

  // exportação
  INFO_EXPORT_DONE: {
    one: "\u2713 {n} registro exportado com sucesso em {time} — {file} ({size}).",
    other: "\u2713 {n} registros exportados com sucesso em {time} — {file} ({size}).",
  },
  INFO_EXPORT_SKIPPED: {
    one: "{n} marcado para exclusão ficou fora.",
    other: "{n} marcados para exclusão ficaram fora.",
  },
  INFO_EXPORTED_TO: "Exportado: {file}.",
  UI_EXPORTING: "exportando…",
  UI_GENERATING: "gerando…",
  ERROR_DIALOG_UNAVAILABLE: "Diálogo do sistema indisponível — digite o caminho.",
  ERROR_DIALOG_FAILED: "Não foi possível abrir o diálogo: {detail}.",

  // sessão
  ERROR_SESSION_SAVE_FAILED: "Não foi possível salvar a sessão: {detail}.",
  WARN_SESSION_FILE_SKIPPED: "Não reabriu: {files}.",
  WARN_FILTER_NOT_REAPPLIED: "Filtro não reaplicado — {detail}.",
  INFO_SESSION_RESTORED: {
    one: "Sessão anterior restaurada — {n} arquivo.",
    other: "Sessão anterior restaurada — {n} arquivos.",
  },

  // status
  INFO_DLL_LOADED: "DLL carregada",
  ERROR_DLL_NOT_LOADED: "DLL não carregada",
  UI_CDP_PORT: "CDP :{port}",
  UI_CDP_OFF: "CDP desligado",

  // ------------------------------------ o que apareceu ao converter o app.js

  // cartoes da estrutura
  UI_CARD_RECORDS: "registros",
  UI_CARD_FIELDS: "campos",
  UI_CARD_RECSIZE: "bytes/registro",
  UI_CARD_MODE: "modo",
  UI_CARD_MEMO: "memo",
  UI_YES: "sim",
  UI_MODE_SHARED: "compartilhado",
  UI_MODE_EXCLUSIVE: "exclusivo",

  // filtro guiado -- E/OU sao RÓTULOS; o valor interno continua "E"/"OU"
  UI_JOIN_AND: "E",
  UI_JOIN_OR: "OU",
  UI_WHERE: "onde",
  UI_REMOVE: "remover",
  UI_VALUE: "valor",
  UI_VALUE_TITLE:
    "O valor segue o tipo do campo. Para calcular em vez de comparar como " +
    "literal, ligue o botão fx ao lado.",
  UI_VALUE_EXPR: "expressão",
  UI_CALC_OFF: "fx — o valor está sendo comparado como literal; clique para calcular",
  UI_CALC_ON: "fx ligado — o valor é calculado (ex.: Date()-7, CLI_LIMC * 2)",

  // Recusas de valor no filtro guiado. Dizem o valor E o campo: "não é uma
  // data" sozinho não ajuda quem tem seis condições montadas na tela.
  ERROR_VALUE_NOT_NUMBER:
    "{field} é numérico e '{value}' não é um número — ligue o fx para calcular.",
  ERROR_VALUE_NOT_DATE:
    "{field} é data e '{value}' não é uma — use DD/MM/AAAA, ou ligue o fx " +
    "para calcular (ex.: Date()-7).",
  ERROR_VALUE_NOT_LOGICAL:
    "{field} é lógico e '{value}' não é sim nem não — use S/N, ou ligue o fx.",

  // em andamento
  UI_COUNTING: "contando…",
  UI_SEARCHING: "procurando…",
  UI_CREATING: "criando…",

  // grade e barra
  UI_PAGE_RANGE: "nesta página: {first}–{last}",
  UI_PAGE_RANGE_EMPTY: "nenhum registro à vista",
  UI_PAGE_COUNT: { one: "nesta página: {n} registro", other: "nesta página: {n} registros" },
  UI_FILTERED_SUFFIX: "{n} filtrados",
  UI_UNKNOWN_COUNT: "?",
  UI_GOTO_RECORD: "registro {n}",
  UI_N_BYTES: "{n} bytes",
  UI_FIELDS_COUNT: "{n} campos",
  UI_MEMO: "memo",
  UI_FILTERED_MARK: "filtrado",
  UI_FILTERED_MARK_N: "filtrado: {n}",

  UI_CONFIRM_REMOVE_CONNECTION:
    "Remover a conexão \"{name}\"?\n\nOs arquivos no disco não são tocados.",

  INFO_FOUND_SCANNED: {
    one: "Achado após {n} registro percorrido.",
    other: "Achado após {n} registros percorridos.",
  },
  WARN_SEARCH_CANCELED: {
    one: "Busca cancelada depois de {n} registro.",
    other: "Busca cancelada depois de {n} registros.",
  },
  UI_EXPORT_UNKNOWN_SCOPE: "os que o filtro deixar passar",


  // ------------------------------------------- T17: informações e log
  UI_CARD_LAST_UPDATE: "última gravação",
  UI_CARD_SIZE: "tamanho",
  UI_CARD_CODEPAGE: "codepage",

  UI_OPERATIONS_LOG: "Alterações",
  UI_LOG_EXPLAIN:
    "O que este programa alterou nos seus arquivos, dia a dia. Só entra aqui o " +
    "que criou, alterou ou apagou algo em disco — inclusive o que foi recusado. " +
    "Abrir, filtrar e navegar não deixam registro: não mudam nada.",
  UI_LOG_DAY: "Dia",
  UI_LOG_SEARCH: "Procurar",
  UI_LOG_SEARCH_PH: "nome do arquivo, operação, expressão…",
  UI_LOG_TIME: "Hora",
  UI_LOG_OPERATION: "Operação",
  UI_LOG_RESULT: "Resultado",
  UI_LOG_ELAPSED: "Tempo",
  UI_LOG_OK: "ok",
  UI_LOG_EMPTY: "Nada foi alterado neste dia.",
  UI_LOG_NOTHING_MATCHES: "Nenhuma alteração casa com a busca.",
  UI_LOG_COUNT: { one: "{n} alteração", other: "{n} alterações" },
  UI_LOG_COUNT_TRUNCATED: "mostrando {n} de {total}",

  ERROR_LOG_DAY_NOT_FOUND: "Nada foi alterado em {day}.",


  // ------------------------------------------- rótulos de tarefa longa
  UI_JOB_SEARCHING: "Procurando…",
  UI_JOB_COUNTING: "Contando os registros do filtro…",
  UI_JOB_INDEXING: "Criando o índice {file}…",
  UI_JOB_EXPORTING: "Exportando {file}…",
  UI_JOB_COPYING: "Copiando para {file}…",
  UI_JOB_WORKING: "Trabalhando…",

  UI_JOB_SIMULATING: "Simulando processamento…",


  // -------------------------------------- TA: pré-voo e backup
  ERROR_BACKUP_READ_FAILED: "Não foi possível ler '{file}' para copiar.",
  ERROR_BACKUP_WRITE_FAILED: "Não foi possível gravar a cópia '{file}'.",
  ERROR_BACKUP_MISSING: "A cópia '{file}' não chegou a ser criada.",
  ERROR_BACKUP_SIZE_MISMATCH:
    "A cópia '{file}' saiu com {got:size}, e o original tem {expected:size}. " +
    "O backup foi descartado.",
  ERROR_BACKUP_PRECHECK_FAILED:
    "As conferências de '{file}' não passaram; nada foi copiado.",
  ERROR_BACKUP_NEEDS_CONFIRM:
    "'{file}' ocupa {bytes:size}. Confirme para copiar.",
  WARN_CANCELED_BACKUP: "Cópia de '{file}' cancelada. Nada ficou no disco.",

  UI_JOB_BACKUP: "Copiando {file} para o backup…",

  // As conferências, uma frase por item do checklist.
  UI_CHECK_DISK_SPACE: "Espaço em disco",
  UI_CHECK_DISK_SPACE_OK: "{free:size} livres em {where}; a operação precisa de {needed:size}",
  UI_CHECK_DISK_SPACE_BAD: "só {free:size} livres em {where}, e a operação precisa de {needed:size}",
  UI_CHECK_DISK_UNKNOWN: "Espaço em disco",
  UI_CHECK_DISK_UNKNOWN_MSG: "não foi possível medir o espaço livre em {path}",
  UI_CHECK_FILE_SET: "Arquivos que serão copiados",
  UI_CHECK_FILE_SET_MSG: { one: "{n} arquivo, {bytes:size}", other: "{n} arquivos, {bytes:size}" },
  UI_CHECK_LARGE_FILE: "Arquivo grande",
  UI_CHECK_LARGE_FILE_MSG: "{bytes:size} — acima de {limit:size}, a cópia vai demorar",
  UI_CHECK_NOT_EXCLUSIVE: "Modo de abertura",
  UI_CHECK_NOT_EXCLUSIVE_MSG:
    "'{file}' está em modo compartilhado; a operação seguinte vai exigir exclusivo",

  UI_PREFLIGHT: "Conferências",
  UI_PREFLIGHT_EXPLAIN:
    "Antes de alterar o arquivo, o QDbu confere o que pode dar errado e faz " +
    "uma cópia. Nada é alterado até você confirmar.",
  UI_BACKUP_RUN: "Fazer o backup",
  UI_BACKUP_DONE: "Backup feito em {dir}",
  UI_BACKUP_FILES: { one: "{n} arquivo copiado", other: "{n} arquivos copiados" },
  UI_CONFIRM_LARGE: "Entendi que vai demorar, pode copiar",

  // O papel de cada arquivo do conjunto.
  UI_ROLE_DATA: "dados",
  UI_ROLE_MEMO: "memo",
  UI_ROLE_INDEX: "índice",


  // ------------------------------- religar estado depois de operação exclusiva
  ERROR_REBIND_INDEX_FAILED:
    "O índice '{file}' não voltou a abrir: {reason}. Chave: {key}",
  ERROR_REBIND_ORDER_LOST:
    "A ordem '{name}' não existe mais; a listagem voltou à ordem natural.",
  ERROR_REBIND_FILTER_FAILED:
    "O filtro não foi reaplicado: {reason} — {expr}",
  ERROR_OPERATION_FAILED:
    "A operação sobre '{file}' falhou. O arquivo não foi alterado.",
  WARN_REBIND_RECORD_GONE:
    "O registro onde você estava não existe mais; voltei ao início.",

  UI_SEE_FILES: "Ver os arquivos",


  // ------------------------------------------------ destino do backup avulso
  UI_CHECK_SOURCE_ROOM: "Espaço na pasta de origem",
  UI_CHECK_SOURCE_ROOM_MSG:
    "{free:size} livres em {where}; a operação vai criar um arquivo temporário de {needed:size} lá",

  UI_BACKUP: "Backup",
  UI_BACKUP_TITLE: "Copiar este arquivo para outro lugar, sem alterá-lo",

  UI_SAVE_AS: "Salvar como",
  UI_CHECK_TARGET_EXISTS: "Destino já existe",
  UI_CHECK_TARGET_EXISTS_MSG: "'{file}' já está lá; escolha outro nome para não sobrescrever",
  UI_CHECK_TARGET_IS_SOURCE: "Destino inválido",
  UI_CHECK_TARGET_IS_SOURCE_MSG: "'{file}' é o próprio arquivo de origem",


  // ---------------------------------------------- R6: arquivo perdido na troca
  ERROR_HANDLE_DETACHED:
    "'{file}' foi fechado para uma operação e não pôde ser reaberto. " +
    "Os dados na tela são de antes; use Reconectar quando o arquivo estiver livre.",
  ERROR_REOPEN_FAILED: "outro programa está com o arquivo",
  ERROR_CANNOT_LOCK_EXCLUSIVE:
    "Não foi possível abrir '{file}' em modo exclusivo — outro programa está " +
    "usando. Nada foi alterado.",
  ERROR_CANNOT_OPEN_SHARED:
    "Não foi possível reabrir '{file}' em modo compartilhado. Nada foi alterado.",
  ERROR_BACKUP_UNVERIFIABLE:
    "A cópia '{file}' foi criada, mas não foi possível medi-la para conferir.",

  UI_DETACHED: "desconectado",
  UI_RECONNECT: "Reconectar",
  UI_DETACHED_HINT: "O arquivo foi fechado para uma operação e não voltou.",
  UI_RECONNECTED: "'{file}' reconectado.",

  UI_CLOSE_TAB_SHORT: "Fechar a aba",


  // ============================================ T14: PACK e ZAP
  UI_PACK: "Compactar",
  UI_PACK_TITLE: "Remover definitivamente os registros marcados para exclusão",
  UI_ZAP: "Esvaziar",
  UI_ZAP_TITLE: "Apagar TODOS os registros, mantendo a estrutura",

  UI_JOB_PACK: "Compactando {file}…",
  UI_JOB_ZAP: "Esvaziando {file}…",

  // O aviso. Diz o que vai acontecer com ESTE arquivo, com números — não um
  // "tem certeza?" genérico, que ensina a clicar sem ler.
  UI_ZAP_WARN_TITLE: "Apagar todos os registros?",
  UI_ZAP_WARN:
    "Isto apaga os {n} registros de '{file}'. A estrutura dos campos é " +
    "mantida, mas os dados não voltam sozinhos.",
  UI_PACK_WARN_TITLE: "Compactar o arquivo?",
  UI_PACK_WARN:
    "Isto remove definitivamente os registros marcados para exclusão de " +
    "'{file}' e renumera os que sobram. Os números de registro mudam.",

  UI_ASK_BACKUP_TITLE: "Fazer uma cópia antes?",
  UI_ASK_BACKUP:
    "A cópia fica na mesma pasta, com a hora no nome, e abre no QDbu como " +
    "qualquer arquivo — dá para conferir antes de apagar a cópia.",
  UI_WITH_BACKUP: "Sim, copiar antes",
  UI_WITHOUT_BACKUP: "Não, seguir sem cópia",
  UI_GO_AHEAD: "Continuar",

  UI_ZAP_DONE: { one: "'{file}' esvaziado: {n} registro apagado.", other: "'{file}' esvaziado: {n} registros apagados." },
  UI_ZAP_DONE_BACKUP: {
    one: "'{file}' esvaziado: {n} registro apagado. A cópia ficou em '{backup}'.",
    other: "'{file}' esvaziado: {n} registros apagados. A cópia ficou em '{backup}'.",
  },
  UI_PACK_DONE: { one: "'{file}' compactado: {n} registro removido.", other: "'{file}' compactado: {n} registros removidos." },
  UI_PACK_DONE_BACKUP: {
    one: "'{file}' compactado: {n} registro removido. A cópia ficou em '{backup}'.",
    other: "'{file}' compactado: {n} registros removidos. A cópia ficou em '{backup}'.",
  },
  UI_NOTHING_TO_PACK: "'{file}' não tem registros marcados; nada foi alterado.",

  ERROR_ZAP_CREATE_FAILED:
    "Não foi possível criar o arquivo vazio de '{file}': {reason}. O original " +
    "foi restaurado e nada se perdeu.",
  ERROR_ZAP_FAILED: "O ZAP de '{file}' falhou: {reason}. O arquivo não foi alterado.",
  ERROR_PACK_FAILED: "A compactação de '{file}' falhou: {reason}. O arquivo não foi alterado.",

  UI_DONE: "Pronto",
  UI_ERROR: "Não deu",
  UI_OK: "Entendi",


  // ============================================ T10: editor de estrutura
  UI_EDIT_STRUCTURE: "Editar estrutura",
  UI_ADD_FIELD: "Acrescentar campo no fim",
  UI_INSERT_FIELD: "Inserir campo acima do selecionado",
  UI_REMOVE_FIELD: "Marcar o campo para remoção",
  UI_MOVE_UP: "Mover para cima",
  UI_MOVE_DOWN: "Mover para baixo",
  UI_APPLY: "Aplicar",
  UI_DISCARD: "Descartar",
  UI_DISCARD_TITLE: "Descartar as alterações?",
  UI_DISCARD_ASK: "As alterações que você fez na estrutura serão perdidas. O arquivo não foi tocado.",

  UI_ROW_NOVO: "campo novo",
  UI_ROW_MUDOU: "campo alterado",
  UI_ROW_SUMIU: "campo marcado para remoção",

  UI_STRUCT_SUMMARY: { one: "{n} campo · {bytes} bytes por registro", other: "{n} campos · {bytes} bytes por registro" },
  UI_STRUCT_ERRORS: { one: "{n} campo com problema", other: "{n} campos com problema" },

  UI_IMPACT: "O que acontece com os dados",
  UI_IMPACT_REMOVED: "'{field}' é removido — os dados dessa coluna são perdidos.",
  UI_IMPACT_ADDED: "'{field}' é criado, vazio em todos os registros.",
  UI_IMPACT_TYPE: "'{field}' muda de {from} para {to} — valores que não converterem são perdidos.",
  UI_IMPACT_SHRUNK: "'{field}' encolhe de {from} para {to} — valores mais longos são truncados.",
  UI_IMPACT_RENAMED: "'{from}' passa a se chamar '{to}' — os dados são mantidos.",
  UI_IMPACT_REORDERED: "A ordem dos campos muda. Índices e expressões que citam posição precisam ser conferidos.",

  ERROR_FIELD_NAME_EMPTY: "o nome não pode ficar vazio",
  ERROR_FIELD_NAME_BAD: "só letras, números e _, começando por letra",
  ERROR_FIELD_NAME_LONG: "no máximo 10 caracteres",
  ERROR_FIELD_NAME_DUP: "já existe um campo com esse nome",
  ERROR_FIELD_TYPE_BAD: "tipo inválido",
  ERROR_FIELD_LEN_C: "texto: de 1 a 1024",
  ERROR_FIELD_LEN_N: "número: de 1 a 19",
  ERROR_FIELD_LEN_MEMO: "memo tem sempre 10",
  ERROR_FIELD_LEN_DATE: "data tem sempre 8",
  ERROR_FIELD_LEN_LOGIC: "lógico tem sempre 1",
  ERROR_FIELD_DEC: "decimais demais para esse tamanho",


  UI_RESTORE_FIELD: "Trazer '{field}' de volta",
  UI_IMPACT_UNDO: "Para trazer '{field}' de volta, clique no ↺ na linha dele.",

  UI_ADD_SHORT: "Campo",
  UI_INSERT_SHORT: "Inserir",
  UI_REMOVE_SHORT: "Remover",
  UI_RESTORE_SHORT: "Restaurar",
  UI_UP_SHORT: "Subir",
  UI_DOWN_SHORT: "Descer",

  UI_FIELD_WILL_GO: "Este campo será removido",

  UI_APPLY_BLOCKED: { one: "Corrija o campo com problema para poder aplicar", other: "Corrija os {n} campos com problema para poder aplicar" },
  UI_APPLY_NOTHING: "Nada foi alterado ainda",

  UI_FIELD_AT: "campo {n}",


  // ---------------------------------------------- T10: criar arquivo novo
  UI_NEW_FILE: "Criar arquivo",
  UI_NEW_FILE_EXPLAIN:
    "O arquivo nasce vazio, com a estrutura que você montou. Nenhum registro " +
    "é criado.",
  UI_NEW_DBF: "Criar arquivo aqui…",
  UI_CREATE: "Criar",
  UI_NEW_SUMMARY: { one: "{n} campo · {bytes} bytes por registro", other: "{n} campos · {bytes} bytes por registro" },
  UI_CREATED: "'{file}' criado com {n} campos.",
  UI_OVERWRITE_TITLE: "O arquivo já existe",
  UI_OVERWRITE_ASK:
    "Já existe '{file}' nessa pasta. Substituir apaga o que está lá, " +
    "incluindo os registros.",
  UI_OVERWRITE: "Substituir",
  UI_NEW_UNTITLED: "SEM_NOME",

  ERROR_CREATE_FAILED: "Não foi possível criar '{file}'. {reason}",
  ERROR_FIELD_BAD: "O campo {n} veio malformado.",
  ERROR_RECORD_TOO_BIG:
    "O registro ficaria com {bytes} bytes, e o formato DBF só guarda até " +
    "{max}. Reduza o tamanho de algum campo.",

  ERROR_FILE_IS_OPEN:
    "'{file}' está aberto na aba {alias}. Feche a aba antes de substituir.",


  // ------------------------------------------ T10: alterar estrutura
  UI_JOB_RESTRUCT: "Reescrevendo {file} com a estrutura nova…",
  WARN_CANCELED_RESTRUCT:
    "Alteração cancelada. O arquivo original não foi tocado.",


  UI_MODIFY_TITLE: "Alterar a estrutura",
  UI_MODIFY_ASK: {
    one: "'{file}' tem {n} registro. Ele será reescrito com a estrutura nova.",
    other: "'{file}' tem {n} registros. Eles serão reescritos com a estrutura nova.",
  },
  UI_MODIFY_OK: {
    one: "'{file}' agora tem {n} registro.",
    other: "'{file}' agora tem {n} registros.",
  },
  UI_MODIFY_FIELDS: { one: "São {n} campo.", other: "São {n} campos." },
  WARN_INDEXES_DROPPED: {
    one: "{n} índice foi fechado e precisa ser reconstruído:",
    other: "{n} índices foram fechados e precisam ser reconstruídos:",
  },
  UI_MODIFY_BACKUP: "Cópia guardada em '{file}'.",
  UI_MODIFY_LOST: {
    one: "{n} valor não coube no tipo novo e ficou vazio.",
    other: "{n} valores não couberam no tipo novo e ficaram vazios.",
  },

  UI_STRUCT_EMPTY: "A estrutura ficou sem campos",

  UI_STRUCT_EMPTY_HINT: "Traga um campo de volta com o ↺, ou adicione um novo.",

  ERROR_NO_FIELDS: "Um arquivo precisa de pelo menos um campo.",

  UI_RELOAD_TITLE: "Recarregar a tela?",
  UI_RELOAD_ASK: "A estrutura que você montou ainda não foi aplicada, e recarregar descarta o que está aqui.",
  UI_RELOAD_DISCARD: "Descartar e recarregar",
  UI_KEEP_EDITING: "Continuar editando",


  // ============================================ T13: operações em massa
  UI_JOB_REPLACE: "Repaçando {file}…",
  UI_JOB_DELETING: "Marcando registros em {file}…",
  UI_JOB_RECALLING: "Recuperando registros em {file}…",
  UI_JOB_APPENDING: "Incluindo registros em {file}…",

  WARN_CANCELED_BULK: {
    one: "Interrompido. {n} registro já tinha sido alterado e assim ficou — cancelar para a operação, não desfaz o que ela já gravou.",
    other: "Interrompido. {n} registros já tinham sido alterados e assim ficaram — cancelar para a operação, não desfaz o que ela já gravou.",
  },

  ERROR_SCOPE_MODE: "Escopo '{mode}' não existe.",
  ERROR_SCOPE_COUNT: "Informe quantos registros.",
  ERROR_FOR_INVALID: "O FOR não pôde ser entendido: {detail}",
  ERROR_FOR_NOT_LOGICAL: "O FOR precisa resultar em verdadeiro ou falso; este resulta em {type}.",
  ERROR_WHILE_INVALID: "O WHILE não pôde ser entendido: {detail}",
  ERROR_WHILE_NOT_LOGICAL: "O WHILE precisa resultar em verdadeiro ou falso; este resulta em {type}.",

  ERROR_NO_FIELD_PICKED: "Escolha o campo a repaçar.",
  ERROR_NO_VALUE: "Informe com o quê repaçar.",
  ERROR_WITH_INVALID: "A expressão não pôde ser entendida: {detail}",
  ERROR_TYPE_MISMATCH:
    "'{field}' é {fieldType} e a expressão resulta em {exprType} — os dois tipos precisam bater.",

  ERROR_NO_SOURCE: "Escolha o arquivo de origem.",
  ERROR_SOURCE_NOT_FOUND: "'{file}' não foi encontrado.",
  ERROR_CANNOT_OPEN_SOURCE: "Não foi possível abrir '{file}': {reason}",
  ERROR_FORMAT_UNKNOWN: "Formato de origem '{format}' não existe.",
  ERROR_FORMAT_UNAVAILABLE: "Esta versão não lê arquivos {format}.",
  ERROR_APPEND_FAILED: "Não foi possível acrescentar o registro.",
  ERROR_APPEND_TEXT_FAILED: "'{file}' não pôde ser lido como {format}: {reason}",
  ERROR_CANNOT_LOCK_FILE:
    "'{file}' está sendo usado por outra pessoa. Operações em massa exigem o arquivo só para você.",

  UI_EDIT_STRUCTURE_OF: "Estrutura de {file}",
  UI_DISCARD_TITLE: "Descartar as alterações?",
  UI_DISCARD_ASK: "A estrutura que você montou ainda não foi aplicada e será perdida.",


  // =================================================== T13: operações em massa
  UI_MASS: "Em massa",
  UI_MASS_TITLE: "Repaçar, deletar, recuperar ou incluir registros de outro arquivo",
  UI_MASS_ON: "Em massa · {file}",

  UI_MASS_REPLACE: "Repaçar",
  UI_MASS_DELETE: "Deletar",
  UI_MASS_RECALL: "Recuperar",
  UI_MASS_APPEND: "Incluir de",

  UI_MASS_EXPLAIN_REPLACE:
    "Grava o resultado da expressão no campo escolhido, em cada registro do escopo.",
  UI_MASS_EXPLAIN_DELETE:
    "Marca os registros do escopo como deletados. Eles continuam no arquivo e voltam com Recuperar; quem os apaga de vez é o Compactar.",
  UI_MASS_EXPLAIN_RECALL:
    "Tira a marca de deletado dos registros do escopo.",
  UI_MASS_EXPLAIN_APPENDFROM:
    "Acrescenta ao fim deste arquivo os registros do arquivo de origem. Os campos são casados por NOME; o que não existir dos dois lados fica de fora ou nasce vazio.",

  UI_MASS_FIELD: "Campo",
  UI_MASS_WITH: "Repaçar {field} com",
  UI_MASS_WITH_HINT: "expressão — ex.: CLI_LIMC * 1.1",
  UI_MASS_SOURCE: "Arquivo de origem",
  UI_MASS_PICK_SOURCE: "Escolher o arquivo de origem",
  UI_MASS_FORMAT: "Formato",
  UI_FMT_DBF: "DBF (outro arquivo do mesmo tipo)",
  UI_FMT_SDF: "Texto de largura fixa (SDF)",
  UI_MASS_TEXT_NOTE:
    "Arquivos de texto são lidos pelo motor do Harbour, que não informa progresso: a barra não anda e não há como interromper. Em DBF há progresso e cancelamento.",

  UI_MASS_SCOPE: "Escopo",
  UI_MASS_RECORDS: "Registros",
  UI_SCOPE_ALL_REC: "Tudo",
  UI_SCOPE_NEXT: "Próximos…",
  UI_SCOPE_NEXT_N: { one: "próximo {n} registro", other: "próximos {n} registros" },
  UI_SCOPE_REST: "Do registro atual até o fim",
  UI_MASS_FOR_HINT: "só os registros em que… (opcional)",
  UI_MASS_WHILE_HINT: "enquanto… — para no primeiro que não casar (opcional)",

  UI_MASS_RULE_WHILE:
    "WHILE tem precedência sobre FOR: o WHILE PARA no primeiro registro que não casa; o FOR apenas PULA e segue até o fim.",
  UI_MASS_RULE_TOP:
    "Tudo começa do topo. Próximos e até-o-fim começam no registro onde o cursor está agora.",
  UI_MASS_RULE_FILTER:
    "O filtro ativo VALE aqui: a operação só alcança o que ele deixa passar ({expr}).",
  UI_MASS_RULE_NOFILTER:
    "Não há filtro ativo — a operação alcança o arquivo inteiro dentro do escopo.",

  UI_MASS_CONFIRM_REPLACE: "O campo {field} vai ser reescrito em {file}. Não há como desfazer.",
  UI_MASS_CONFIRM_DELETE: "Os registros vão ser marcados como deletados em {file}.",
  UI_MASS_CONFIRM_RECALL: "A marca de deletado vai ser retirada em {file}.",
  UI_MASS_CONFIRM_APPENDFROM: "Os registros de {source} vão ser acrescentados a {file}.",
  UI_MASS_CONFIRM_SCOPE: "Escopo: {scope}.",

  UI_MASS_DONE_REPLACE: { one: "{n} registro alterado, de {seen} examinados.", other: "{n} registros alterados, de {seen} examinados." },
  UI_MASS_DONE_DELETE: { one: "{n} registro marcado, de {seen} examinados.", other: "{n} registros marcados, de {seen} examinados." },
  UI_MASS_DONE_RECALL: { one: "{n} registro recuperado, de {seen} examinados.", other: "{n} registros recuperados, de {seen} examinados." },
  UI_MASS_DONE_APPEND: { one: "{n} registro veio de {file}. O arquivo tem agora {total}.", other: "{n} registros vieram de {file}. O arquivo tem agora {total}." },

  UI_MASS_FROM_RECORD: "a partir do registro {n}",
  UI_MASS_FROM_NONE: "Nenhum registro escolhido — clique numa linha da grade.",

  UI_CURRENT_RECORD: "reg. {n} de {total}",
  UI_CURRENT_RECORD_HINT: "Registro atual — é daqui que partem \"próximos n\" e \"até o fim\".",
  UI_CURRENT_RECORD_AWAY: "Registro atual, fora da página à vista. Clique para voltar até ele.",


  // ------------------------------------- T13: importar de CSV e JSON
  UI_FMT_CSV: "CSV / texto delimitado",
  UI_FMT_JSON: "JSON (lista de objetos)",
  UI_MASS_HAS_HEADER: "A primeira linha é o cabeçalho com os nomes das colunas",
  UI_MASS_DELIM: "Separador",
  UI_DELIM_AUTO: "Detectar sozinho",
  UI_DELIM_SEMI: "Ponto e vírgula  ;",
  UI_DELIM_COMMA: "Vírgula  ,",
  UI_DELIM_TAB: "Tabulação",

  UI_MAP_BY_NAME_DBF: "Os campos são casados por NOME. O que não existir dos dois lados fica de fora ou nasce vazio.",
  UI_MAP_BY_NAME_CSV: "As colunas são casadas por NOME, usando o cabeçalho. Coluna sem campo de mesmo nome é ignorada.",
  UI_MAP_BY_NAME_JSON: "As chaves de cada objeto são casadas por NOME com os campos. Chave sem campo correspondente é ignorada.",
  UI_MAP_BY_POSITION: "Sem nomes para casar: a primeira coluna vai no primeiro campo, e assim por diante.",

  ERROR_CSV_UNCLOSED_QUOTE:
    "'{file}' tem um campo entre aspas que nunca foi fechado — do ponto da aspa até o fim do arquivo viraria um campo só. Confira as aspas.",
  ERROR_SOURCE_EMPTY: "'{file}' não tem nada a ler.",
  ERROR_JSON_INVALID: "'{file}' não é um JSON válido.",
  ERROR_JSON_NOT_ARRAY:
    "'{file}' precisa ser uma lista de objetos — como a que o próprio Exportar gera.",

  UI_MASS_ENCODING: "Codificação do arquivo",
  UI_CDP_UTF8: "UTF-8 (o mais comum)",
  UI_CDP_ANSI: "ANSI / Windows-1252",
  UI_CDP_CP850: "CP850 (DOS)",

  UI_BACKUP_ZIP: "Compactar em .zip",
  UI_BACKUP_ZIP_HINT: "Um arquivo só, no lugar do .dbf (e do .dbt, quando há memo).",
  UI_BACKUP_DONE_ZIP: "Compactado em {dir} — de {from} para {to}, {pct}% menor.",
  UI_ZIP_DIRECT: "Lido direto do original, sem cópia intermediária.",
  UI_ZIP_COPY: "O arquivo estava em uso exclusivo, então foi copiado registro a registro antes de compactar.",
  UI_JOB_ZIP: "Compactando {file}…",
  ERROR_ZIP_CREATE_FAILED: "Não foi possível criar '{file}'.",
  ERROR_ZIP_FAILED: "'{file}' não pôde ser gravado: {reason}",
  UI_ROLE_ZIP: "compactado",


  // ---- T8: edicao de registro ----
  // As recusas dizem o CAMPO e o valor: numa grade de 40 colunas, "nao e um
  // numero" sozinho nao diz onde. Nenhuma cita o fx -- ele so existe no filtro
  // guiado, e mandar procurar um botao que nao esta na tela e pior que nao
  // explicar nada.
  ERROR_CELL_TYPE: "{field} não aceita esse tipo de valor.",
  ERROR_CELL_TOO_LONG:
    "{field} cabe {len} caracteres e o valor tem {size} — encurte ou aumente o campo pela estrutura.",
  ERROR_CELL_NOT_NUMBER: "{field} é numérico e '{value}' não é um número.",
  ERROR_CELL_NOT_DATE: "{field} é data e '{value}' não é uma — use DD/MM/AAAA.",
  ERROR_FIELD_TYPE_UNSUPPORTED: "{field} é do tipo {type} e não pode ser editado aqui.",
  ERROR_RECORD_OUT_OF_RANGE:
    "O registro {recno} não existe — o arquivo vai até {max}.",
  ERROR_CANNOT_LOCK_RECORD:
    "O registro {recno} de '{file}' está travado por outro usuário — tente de novo em instantes.",
  ERROR_WRITE_FAILED: "Não foi possível gravar o registro {recno} de '{file}'[[: {reason}]].",

  UI_ADD_RECORD: "+ Registro",
  UI_ADD_RECORD_TITLE: "Acrescenta um registro em branco no fim do arquivo",
  UI_DELETE_RECORD: "Excluir",
  UI_DELETE_RECORD_TITLE: "Marca o registro atual para exclusão (o PACK é que remove)",
  UI_RECALL_RECORD: "Recuperar",
  UI_RECALL_RECORD_TITLE: "Desfaz a marca de exclusão do registro atual",
  UI_CONFIRM: "Confirmar",
  UI_SAVE: "Gravar",
  UI_MEMO_TITLE: "{field} — registro {n}",
  UI_NO_CURRENT_RECORD: "Nenhum registro selecionado — clique numa linha da grade.",
  INFO_RECORD_UPDATED: "Registro {n} alterado: {field}.",
  INFO_RECORD_ADDED: "Registro {n} acrescentado.",
  INFO_RECORD_ADDED_HIDDEN:
    "Registro {n} acrescentado — o filtro ativo não o mostra, porque ele nasce em branco.",
  INFO_RECORD_DELETED: "Registro {n} marcado para exclusão.",
  INFO_RECORD_RECALLED: "Registro {n} recuperado.",

  // ---- T9: formulario ----
  UI_VIEW_FORM: "Formulário",
  UI_SWITCH_TO_FORM: "Ver um registro por vez, com todos os campos",
  UI_SWITCH_TO_GRID: "Voltar para a grade, com muitos registros",
  UI_FIRST_RECORD: "Primeiro registro",
  UI_PREV_RECORD: "Registro anterior",
  UI_NEXT_RECORD: "Próximo registro",
  UI_LAST_RECORD: "Último registro",
  UI_AT_FIRST_RECORD: "Já está no primeiro registro.",
  UI_AT_LAST_RECORD: "Já está no último registro.",
  UI_DELETED_BADGE: "excluído",

  // ---- R8: o que se edita tem de ser o que esta no disco ----
  ERROR_PARAM_MUST_BE_STRING: "O parâmetro '{param}' precisa ser texto[[ (campo {field})]].",
  ERROR_CONNECTION_NOT_FOUND: "Conexão '{name}' não encontrada.",
  ERROR_UNKNOWN_CODEPAGE: "Codepage '{codepage}' não é uma das disponíveis.",
  UI_CDP_PT850: "DOS Brasil (CP850)",
  UI_CDP_ESWIN: "Windows (CP1252)",
  UI_CDP_PTISO: "ISO-8859-1 (Latin-1)",
  UI_CDP_PT860: "DOS Portugal (CP860)",
  UI_CDP_UTF8: "UTF-8",
  INFO_CODEPAGE_CHANGED: "Codepage do arquivo: {cp}.",
  // ---- config em tres niveis (global / conexao / arquivo) ----
  UI_PREFERENCES: "Preferências",
  UI_CONFIG_EXPLAIN: "Valem para o app inteiro. Cada conexão e cada arquivo podem ter o próprio codepage por cima destes.",
  UI_DEFAULT_CODEPAGE: "Codepage padrão",
  UI_SHOW_DELETED: "Mostrar registros excluídos",
  UI_TOOLBAR_LABELS: "Mostrar os nomes na barra de ferramentas",
  UI_EPOCH_INFO: "Datas de dois dígitos usam o século a partir de {year} (SET EPOCH, fixo).",
  UI_CONN_CODEPAGE: "Codepage",
  UI_CDP_INHERIT: "(herdar)",
  UI_MENU_CODEPAGE: "Codepage da conexão",
  UI_PIN_FILE: "Fixar este codepage para o arquivo",
  UI_PINNED_FILE: "Codepage fixado para este arquivo",
  UI_CODEPAGE_FROM_CONN: "Herdado da conexão.",
  UI_CODEPAGE_FROM_GLOBAL: "Padrão do app.",
  UI_CODEPAGE_FROM_FILE: "Fixado neste arquivo.",
  INFO_CODEPAGE_PINNED: "Codepage {cp} fixado para este arquivo.",
  INFO_CONFIG_SAVED: "Preferências salvas.",
  INFO_CONNECTION_UPDATED: "Conexão '{name}' atualizada.",
  WARN_CODEPAGE_NOT_PINNED: "Não foi possível gravar na pasta; o codepage {cp} vale só nesta sessão.",
  WARN_CONFIG_NOT_SAVED: "Não foi possível salvar no disco; as preferências valem só nesta sessão.",
  UI_CODEPAGE: "Codepage",
  UI_CODEPAGE_TITLE: "Como os bytes deste arquivo viram texto — não altera o arquivo",
  UI_CODEPAGE_DIALOG: "Codepage deste arquivo",
  UI_CODEPAGE_EXPLAIN: "O DBF não guarda com segurança qual codepage foi usada ao gravar. Esta escolha é só a LENTE de leitura: trocar não altera um byte do arquivo, e dá para voltar quando quiser.",
  UI_CODEPAGE_HINT: "O cabeçalho sugere {cp}.",
  ERROR_STALE_VALUE:
    "{field} foi alterado por outra pessoa enquanto você editava: era '{expected}', agora é '{actual}'.",
  INFO_RECORD_REFRESHED:
    "Registro {n} foi alterado por outro usuário — mostrando os valores atuais.",
  UI_STALE_TITLE: "Alterado por outra pessoa",
  UI_STALE_EXPLAIN:
    "Enquanto você editava, {field} do registro {n} mudou de '{expected}' para '{actual}'. O que fazer com o que você digitou?",
  UI_STALE_DELETE_ASK:
    "O registro {n} mudou desde que você o viu — {field}: era '{expected}', agora é '{actual}'. Excluir mesmo assim?",
  UI_STALE_RECALL_ASK:
    "O registro {n} mudou desde que você o viu — {field}: era '{expected}', agora é '{actual}'. Recuperar mesmo assim?",
  UI_DELETE_ANYWAY: "Excluir mesmo assim",
  UI_RECALL_ANYWAY: "Recuperar mesmo assim",
  UI_STALE_DISCARD: "Descartar o meu",
  UI_STALE_OVERWRITE: "Gravar por cima",
  // ---------------------------------------------------------------- sobre
  // O texto e o mesmo do README, palavra por palavra: quem le a janela e quem
  // le o repositorio tem de receber a mesma informacao.
  UI_ABOUT: "Sobre",
  UI_ABOUT_WHAT:
    "Utilitário inspirado no DBU (o utilitário de manipulação de DBFs do Clipper), desenvolvido em Harbour, com interface em Tauri + Rust + HTML/JS.",
  UI_NOTICE: "Aviso",
  UI_ABOUT_WARRANTY:
    "O QDbu nasceu como prova de conceito e exercício de estudo. É fornecido sem garantia de nenhuma espécie, expressa ou implícita, e o uso é por sua conta e risco.",
  UI_ABOUT_COMPILED: "Compilado em {when}",
  UI_ABOUT_SOURCES: "Para baixar os últimos fontes e releases visite:",

  // ------------------------------------------------------------------ sair
  UI_QUIT_TITLE: "Sair do QDbu?",
  UI_QUIT_ASK: "O trabalho em andamento nas abas abertas não será retomado.",
  UI_QUIT_YES: "Sair",
  UI_QUIT_NO: "Ficar",

  // --------------------------------------------------------- linha de comando
  ERROR_CLI_VEW_UNSUPPORTED:
    "'{file}' é um arquivo .VEW, e o QDbu ainda não lê esse formato.",
  ERROR_CLI_UNKNOWN_OPTION: "Opção não reconhecida na linha de comando: {option}.",
  // ---------------------------------------------------------- arrastar e soltar
  UI_DROP_HERE: "Solte para abrir",
  UI_DROP_HINT: "Arquivos .DBF. Pasta se cadastra em + Conexão.",
  ERROR_DROP_NOT_A_DBF: "'{file}' não é um .DBF.",
  ERROR_DROP_NOT_A_FILE:
    "'{file}' não é um arquivo .DBF. Se for uma pasta, cadastre-a em + Conexão.",
  // ------------------------------------------------------------ abrir arquivo
  UI_OPEN_FILE: "Abrir arquivo",
  UI_OPEN_FILE_TITLE: "Abrir arquivo",
  UI_OPEN_FILE_EXPLAIN:
    "Um DBF solto, sem cadastrar a pasta. Para voltar a ele depois, cadastre a pasta como conexão.",
  UI_OPEN_DIALOG_TITLE: "Escolher arquivo DBF",
  UI_BROWSE: "Procurar…",
  UI_OPEN: "Abrir",
  UI_READ_ONLY: "Somente leitura",
  UI_EXCLUSIVE: "Uso exclusivo",
  UI_OPEN_MODE_EXPLAIN:
    "Somente leitura recusa qualquer gravação neste arquivo — a recusa é do driver, não da tela. Uso exclusivo impede que outro programa o abra enquanto você o usa.",
  UI_RDD: "Driver",
  ERROR_FILE_READ_ONLY:
    "'{file}' foi aberto somente para leitura, então {method} não pode gravar nele. Feche a aba e abra de novo sem essa opção.",
  // --------------------------------------------- construtor de expressão (T18)
  UI_PH_INDEX_KEY: "CLI_NOME",
  UI_PH_INDEX_FOR: "!Deleted()",
  UI_CX_TITLE: "Construtor de expressão",
  UI_CX_OPEN: "Construir a expressão",
  UI_CX_UNDO: "Desfazer (Ctrl+Z)",
  UI_CX_REDO: "Refazer (Ctrl+Y)",
  UI_CX_RESTORE: "Restaurar original",
  UI_CX_USE: "Usar",
  UI_CX_EXPECTS: "espera {type}",
  UI_CX_ANY_TYPE: "qualquer tipo",
  UI_CX_FROM_FILTER: "Filtro",
  UI_CX_FROM_KEY: "Chave do índice",
  UI_CX_FROM_FOR: "FOR",
  UI_CX_FROM_WHILE: "WHILE",
  UI_CX_FROM_REPLACE: "REPLACE {field}",
  UI_CX_EMPTY: "Digite ou monte uma expressão.",
  UI_CX_CHECKING: "conferindo…",
  UI_CX_MISSING: "Faltam: {args}.",
  UI_CX_OK_VALUE: "✓ Expressão válida. No registro {n} o resultado é {value}.",
  UI_CX_NEED_L: "uma condição (Sim/Não)",
  UI_CX_OK_VALUE_TYPED: "✓ Expressão válida, devolve {type}. No registro {n} o resultado é {value}.",
  UI_CX_VALUE_LEN: "{value} ({len} de {max} caracteres)",
  UI_CX_WRONG_TYPE: "✗ Aqui é preciso {expected}, e esta expressão devolve {got}.",
  UI_CX_NO_SYMBOL: "✗ Não existe campo ou função {symbol}.",
  UI_CX_SIMILAR: "Parecido: {name}.",
  UI_CX_NOT_COMPILE: "✗ Expressão incompleta ou mal formada: {detail}",
  UI_CX_NOT_COMPILE_PLAIN: "✗ Expressão incompleta ou mal formada.",
  UI_CX_WARNING: "⚠ Expressão válida, mas não deu para calcular no registro {n}: {detail}",
  UI_CX_SIMPLIFY: "dá para simplificar — usar só a condição",
  UI_CX_ARG_NOW: "{n}º argumento: {name} ({type}). Ctrl+Espaço sugere.",
  UI_CX_TRUE: "Sim",
  UI_CX_FALSE: "Não",
  UI_CX_DISCARD_ASK: "Há alterações que ainda não foram usadas.",

  // ----------------------------------------- construtor: colunas e catálogo (T18)
  UI_CX_MORE: "Mais",
  UI_CX_LESS: "Menos",
  UI_CX_SEARCH: "Dica: busque aqui um campo, função ou operador pelo nome ou pelo objetivo",
  UI_CX_FOUND_BY: "encontrado por: {term}",
  UI_CX_ELEM_CAMPOS: "Campos",
  UI_CX_ELEM_FUNCOES: "Funções",
  UI_CX_ELEM_OPERADORES: "Operadores",
  UI_CX_ELEM_CONSTANTES: "Constantes",
  UI_CX_ELEM_HISTORICO: "Histórico",
  UI_CX_NO_HISTORY: "Nenhuma expressão usada neste arquivo ainda.",
  UI_CX_COMPATIBLE: "devolve o tipo esperado",

  UI_CAT_TODAS: "Todas",
  UI_CAT_TEXTO: "Texto",
  UI_CAT_NUMERO: "Número",
  UI_CAT_DATA: "Data e hora",
  UI_CAT_CONVERSAO: "Conversão",
  UI_CAT_BANCO: "Arquivo e índice",
  UI_CAT_GERAL: "Geral",
  UI_CAT_VETOR: "Vetor",
  UI_CAT_AMBIENTE: "Ambiente",
  UI_CAT_COMPARACAO: "Comparação",
  UI_CAT_LOGICOS: "Lógicos",
  UI_CAT_ARITMETICA: "Aritmética",
  UI_CAT_AGRUPAMENTO: "Agrupamento",

  // operadores: rótulo · símbolo; a descrição é o Quick Tip
  UI_OPX_IGUAL: "igual",
  UI_OPX_IGUAL_DESC: "Compara só o começo: \"MA\" é igual a \"MARIA\". É como o índice busca.",
  UI_OPX_EXATO: "exatamente igual",
  UI_OPX_EXATO_DESC: "O texto inteiro tem de ser igual, do começo ao fim.",
  UI_OPX_DIF: "diferente",
  UI_OPX_DIF_DESC: "Verdadeiro quando os dois lados não são iguais. # e != fazem o mesmo.",
  UI_OPX_LT: "menor que",
  UI_OPX_LT_DESC: "Número, data ou texto (ordem alfabética).",
  UI_OPX_GT: "maior que",
  UI_OPX_GT_DESC: "Número, data ou texto (ordem alfabética).",
  UI_OPX_LE: "menor ou igual",
  UI_OPX_LE_DESC: "Número, data ou texto (ordem alfabética).",
  UI_OPX_GE: "maior ou igual",
  UI_OPX_GE_DESC: "Número, data ou texto (ordem alfabética).",
  UI_OPX_CONTEM: "contido em",
  UI_OPX_CONTEM_DESC: "\"ABC\" $ CLI_NOME é verdadeiro se ABC aparece em algum lugar do nome. O lado menor vem primeiro.",
  UI_OPX_MAIS: "somar / juntar",
  UI_OPX_MAIS_DESC: "Soma números, junta textos, avança dias numa data.",
  UI_OPX_MENOS: "subtrair",
  UI_OPX_MENOS_DESC: "Subtrai números ou dias de uma data; entre textos, junta tirando os espaços do meio.",
  UI_OPX_VEZES: "multiplicar",
  UI_OPX_VEZES_DESC: "Multiplica números.",
  UI_OPX_DIV: "dividir",
  UI_OPX_DIV_DESC: "Divide números. Dividir por zero dá erro no registro em que acontecer.",
  UI_OPX_RESTO: "resto da divisão",
  UI_OPX_RESTO_DESC: "7 % 3 é 1.",
  UI_OPX_POT: "elevado a",
  UI_OPX_POT_DESC: "2 ^ 3 é 8.",
  UI_OPX_AND: "e",
  UI_OPX_AND_DESC: "Verdadeiro só se os dois lados forem verdadeiros. Os pontos fazem parte: .AND.",
  UI_OPX_OR: "ou",
  UI_OPX_OR_DESC: "Verdadeiro se qualquer um dos lados for verdadeiro. Os pontos fazem parte: .OR.",
  UI_OPX_NOT: "não",
  UI_OPX_NOT_DESC: "Inverte: .NOT. Empty(X) é verdadeiro quando X tem conteúdo. ! faz o mesmo.",
  UI_OPX_PAREN: "parênteses",
  UI_OPX_PAREN_DESC: "Agrupa. Sem eles, .AND. liga mais forte que .OR.: A .OR. B .AND. C é A .OR. (B .AND. C).",

  UI_CX_CONST_TRUE: "verdadeiro",
  UI_CX_CONST_FALSE: "falso",
  UI_CX_CONST_EMPTY_STR: "texto vazio",
  UI_CX_CONST_ZERO: "zero",
  UI_CX_CONST_TODAY: "hoje",
  UI_CX_CONST_EMPTY_DATE: "data vazia",

  // argumentos: o rótulo que vai dentro do «placeholder»
  UI_ARG_AARRAY: "vetor",
  UI_ARG_ASOURCE: "vetor de origem",
  UI_ARG_ATARGET: "vetor de destino",
  UI_ARG_BBLOCK: "bloco",
  UI_ARG_BSORT: "bloco de ordem",
  UI_ARG_CALIAS: "alias",
  UI_ARG_CATTRIBUTES: "atributos",
  UI_ARG_CBUFFER: "bytes",
  UI_ARG_CCHARACTER: "caractere",
  UI_ARG_CDATE: "data como texto",
  UI_ARG_CDATESTRING: "data como texto",
  UI_ARG_CDIRSPEC: "pasta",
  UI_ARG_CDRIVE: "unidade",
  UI_ARG_CENVIROMENT: "variável",
  UI_ARG_CEXP: "expressão como texto",
  UI_ARG_CEXPRESSION: "texto",
  UI_ARG_CFIELDNAME: "nome do campo",
  UI_ARG_CFILENAME: "arquivo",
  UI_ARG_CFILESPEC: "arquivo",
  UI_ARG_CFILL: "caractere de preenchimento",
  UI_ARG_CHARD: "quebra dura",
  UI_ARG_CINDEXFILE: "arquivo de índice",
  UI_ARG_CINSERT: "texto a inserir",
  UI_ARG_CLOCSTRING: "procurar",
  UI_ARG_CMEMVARNAME: "nome da variável",
  UI_ARG_CNUMBER: "número como texto",
  UI_ARG_CORDER: "ordem",
  UI_ARG_CORDERBAGNAME: "arquivo de índice",
  UI_ARG_CORDERNAME: "ordem",
  UI_ARG_CREPSTRING: "substituir por",
  UI_ARG_CSEARCH: "procurar",
  UI_ARG_CSOFT: "quebra suave",
  UI_ARG_CSTRING: "texto",
  UI_ARG_CSTRINGTOMATCH: "procurar",
  UI_ARG_CTEMPLATE: "máscara",
  UI_ARG_DDATE: "data",
  UI_ARG_DDATESTRING: "data",
  UI_ARG_EXPFALSE: "se não",
  UI_ARG_EXPTRUE: "se sim",
  UI_ARG_LCONDITION: "condição",
  UI_ARG_LNEWDESCEND: "descendente",
  UI_ARG_LNEWERROR: "novo estado",
  UI_ARG_LWRAP: "quebrar palavras",
  UI_ARG_NASCIINUM: "código",
  UI_ARG_NCOUNT: "quantidade",
  UI_ARG_NCOUNTER: "ocorrência",
  UI_ARG_NDECIMALS: "decimais",
  UI_ARG_NDELETE: "quantos apagar",
  UI_ARG_NDOUBLE: "número",
  UI_ARG_NELEMENTS: "tamanho",
  UI_ARG_NFIELD: "posição do campo",
  UI_ARG_NIGNORE: "ignorar os primeiros",
  UI_ARG_NLEN: "quantidade",
  UI_ARG_NLENGTH: "tamanho",
  UI_ARG_NLEVEL: "nível",
  UI_ARG_NLINELENGTH: "largura da linha",
  UI_ARG_NLINENUMBER: "número da linha",
  UI_ARG_NNUMBER: "número",
  UI_ARG_NNUMBER1: "divisor",
  UI_ARG_NOCCURRENCES: "quantas vezes",
  UI_ARG_NORDER: "ordem",
  UI_ARG_NPLACE: "casas decimais",
  UI_ARG_NPOS: "a partir de",
  UI_ARG_NPOSITION: "posição",
  UI_ARG_NRELATION: "relação",
  UI_ARG_NSIZE: "quantidade",
  UI_ARG_NSTART: "início",
  UI_ARG_NTABSIZE: "tamanho do tab",
  UI_ARG_NTARGETPOS: "posição no destino",
  UI_ARG_NWIDTH: "largura",
  UI_ARG_NWORKAREA: "área de trabalho",
  UI_ARG_XEXP: "valor",
  UI_ARG_XEXPRESSION: "valor",
  UI_ARG_XORDER: "ordem",
  UI_ARG_XSEARCH: "procurar",
  UI_ARG_XVAL: "valor",
  UI_ARG_XVALUE: "valor",
  UI_ARG_XVALUE1: "outro valor",

  // funções: rótulo · descrição · palavras-chave (separadas por ;)
  UI_FN_ABS: "Valor absoluto",
  UI_FN_ABS_DESC: "O número sem o sinal: Abs(-5) é 5.",
  UI_FN_ABS_KW: "módulo;sem sinal;positivo",
  UI_FN_ACLONE: "Copiar vetor",
  UI_FN_ACLONE_DESC: "Cópia completa de um vetor, inclusive os vetores dentro dele.",
  UI_FN_ACLONE_KW: "clonar;duplicar;array",
  UI_FN_ACOPY: "Copiar elementos",
  UI_FN_ACOPY_DESC: "Copia elementos de um vetor para outro.",
  UI_FN_ACOPY_KW: "array;copiar",
  UI_FN_AEVAL: "Percorrer vetor",
  UI_FN_AEVAL_DESC: "Executa um bloco para cada elemento do vetor.",
  UI_FN_AEVAL_KW: "array;para cada;laço",
  UI_FN_ALIAS: "Alias da área",
  UI_FN_ALIAS_DESC: "O alias (apelido) do arquivo aberto numa área de trabalho.",
  UI_FN_ALIAS_KW: "apelido;área",
  UI_FN_ALLTRIM: "Remover espaços",
  UI_FN_ALLTRIM_DESC: "Tira os espaços do começo e do fim do texto.",
  UI_FN_ALLTRIM_KW: "trim;tirar espaços;limpar;aparar",
  UI_FN_ARRAY: "Criar vetor",
  UI_FN_ARRAY_DESC: "Cria um vetor vazio com o tamanho pedido.",
  UI_FN_ARRAY_KW: "array;novo vetor",
  UI_FN_ASC: "Código do caractere",
  UI_FN_ASC_DESC: "O código numérico (ASCII) do primeiro caractere do texto.",
  UI_FN_ASC_KW: "ascii;código",
  UI_FN_ASCAN: "Procurar no vetor",
  UI_FN_ASCAN_DESC: "A posição de um valor dentro do vetor, ou 0 se não está.",
  UI_FN_ASCAN_KW: "array;buscar;localizar",
  UI_FN_ASORT: "Ordenar vetor",
  UI_FN_ASORT_DESC: "Ordena os elementos de um vetor.",
  UI_FN_ASORT_KW: "array;classificar;sort",
  UI_FN_AT: "Posição do texto",
  UI_FN_AT_DESC: "Em que posição um trecho aparece dentro do texto; 0 se não aparece.",
  UI_FN_AT_KW: "procurar;localizar;encontrar;posição;índice",
  UI_FN_ATAIL: "Último elemento",
  UI_FN_ATAIL_DESC: "O último elemento de um vetor.",
  UI_FN_ATAIL_KW: "array;final",
  UI_FN_ATNUM: "Posição da n-ésima ocorrência",
  UI_FN_ATNUM_DESC: "Em que posição está a n-ésima vez que o trecho aparece no texto.",
  UI_FN_ATNUM_KW: "procurar;ocorrência;posição",
  UI_FN_BIN2I: "Bytes para inteiro (2)",
  UI_FN_BIN2I_DESC: "Converte 2 bytes num número inteiro com sinal.",
  UI_FN_BIN2I_KW: "binário;bytes;inteiro",
  UI_FN_BIN2L: "Bytes para inteiro (4)",
  UI_FN_BIN2L_DESC: "Converte 4 bytes num número inteiro com sinal.",
  UI_FN_BIN2L_KW: "binário;bytes;inteiro;long",
  UI_FN_BIN2W: "Bytes para inteiro (2, sem sinal)",
  UI_FN_BIN2W_DESC: "Converte 2 bytes num número inteiro sem sinal.",
  UI_FN_BIN2W_KW: "binário;bytes;word",
  UI_FN_BOF: "Início do arquivo?",
  UI_FN_BOF_DESC: "Verdadeiro quando se tentou voltar antes do primeiro registro.",
  UI_FN_BOF_KW: "começo;primeiro registro;bof",
  UI_FN_CDOW: "Nome do dia da semana",
  UI_FN_CDOW_DESC: "O dia da semana de uma data, por extenso.",
  UI_FN_CDOW_KW: "dia da semana;segunda;domingo;weekday",
  UI_FN_CHR: "Caractere do código",
  UI_FN_CHR_DESC: "O caractere que corresponde a um código numérico (ASCII).",
  UI_FN_CHR_KW: "ascii;caractere;código",
  UI_FN_CMONTH: "Nome do mês",
  UI_FN_CMONTH_DESC: "O mês de uma data, por extenso.",
  UI_FN_CMONTH_KW: "mês;janeiro;nome do mês",
  UI_FN_CTOD: "Texto para data",
  UI_FN_CTOD_DESC: "Converte um texto no formato de data (dd/mm/aaaa) numa data.",
  UI_FN_CTOD_KW: "converter;data;texto para data",
  UI_FN_CURDIR: "Pasta atual",
  UI_FN_CURDIR_DESC: "A pasta atual do sistema.",
  UI_FN_CURDIR_KW: "diretório;pasta;caminho",
  UI_FN_DATE: "Data de hoje",
  UI_FN_DATE_DESC: "A data atual do sistema.",
  UI_FN_DATE_KW: "hoje;agora;data atual",
  UI_FN_DAY: "Dia da data",
  UI_FN_DAY_DESC: "O dia do mês de uma data, como número (1 a 31).",
  UI_FN_DAY_KW: "dia;dia do mês",
  UI_FN_DBFILTER: "Filtro ativo",
  UI_FN_DBFILTER_DESC: "A expressão do filtro ativo na área de trabalho, como texto.",
  UI_FN_DBFILTER_KW: "filtro;set filter",
  UI_FN_DBRELATION: "Expressão da relação",
  UI_FN_DBRELATION_DESC: "A expressão que liga uma relação (SET RELATION).",
  UI_FN_DBRELATION_KW: "relação;set relation",
  UI_FN_DBRSELECT: "Área da relação",
  UI_FN_DBRSELECT_DESC: "A área de trabalho para onde uma relação aponta.",
  UI_FN_DBRSELECT_KW: "relação;área",
  UI_FN_DELETED: "Registro excluído?",
  UI_FN_DELETED_DESC: "Verdadeiro se o registro atual está marcado para exclusão.",
  UI_FN_DELETED_KW: "excluído;apagado;marcado;deletado",
  UI_FN_DESCEND: "Inverter para ordem decrescente",
  UI_FN_DESCEND_DESC: "Inverte um valor para que um índice sobre ele fique em ordem decrescente.",
  UI_FN_DESCEND_KW: "decrescente;inverso;índice",
  UI_FN_DIRECTORY: "Listar pasta",
  UI_FN_DIRECTORY_DESC: "Um vetor com os arquivos de uma pasta.",
  UI_FN_DIRECTORY_KW: "diretório;arquivos;listar;dir",
  UI_FN_DOW: "Número do dia da semana",
  UI_FN_DOW_DESC: "O dia da semana de uma data, como número (1 = domingo).",
  UI_FN_DOW_KW: "dia da semana;weekday",
  UI_FN_DTOC: "Data para texto",
  UI_FN_DTOC_DESC: "Converte uma data em texto no formato de data (dd/mm/aaaa).",
  UI_FN_DTOC_KW: "converter;data para texto;formatar data",
  UI_FN_DTOS: "Data para texto AAAAMMDD",
  UI_FN_DTOS_DESC: "Converte uma data em texto no formato AAAAMMDD — o certo para chave de índice.",
  UI_FN_DTOS_KW: "converter;data para texto;índice;aaaammdd",
  UI_FN_EOF: "Fim do arquivo?",
  UI_FN_EOF_DESC: "Verdadeiro quando se passou do último registro.",
  UI_FN_EOF_KW: "fim;último registro;eof",
  UI_FN_EMPTY: "Está vazio?",
  UI_FN_EMPTY_DESC: "Verdadeiro se o valor está vazio: texto só de espaços, zero, data vazia, falso.",
  UI_FN_EMPTY_KW: "vazio;em branco;nulo;sem conteúdo",
  UI_FN_EVAL: "Executar bloco",
  UI_FN_EVAL_DESC: "Executa um bloco de código e devolve o resultado.",
  UI_FN_EVAL_KW: "bloco;executar;codeblock",
  UI_FN_EXP: "Exponencial",
  UI_FN_EXP_DESC: "O número e elevado ao valor.",
  UI_FN_EXP_KW: "exponencial;euler",
  UI_FN_FCOUNT: "Quantidade de campos",
  UI_FN_FCOUNT_DESC: "Quantos campos o arquivo tem.",
  UI_FN_FCOUNT_KW: "campos;número de campos;estrutura",
  UI_FN_FIELDBLOCK: "Bloco de acesso ao campo",
  UI_FN_FIELDBLOCK_DESC: "Um bloco que lê ou grava um campo pelo nome.",
  UI_FN_FIELDBLOCK_KW: "campo;bloco;codeblock",
  UI_FN_FIELDGET: "Valor do campo pela posição",
  UI_FN_FIELDGET_DESC: "O valor do campo que está numa posição da estrutura.",
  UI_FN_FIELDGET_KW: "campo;valor;posição",
  UI_FN_FIELDNAME: "Nome do campo pela posição",
  UI_FN_FIELDNAME_DESC: "O nome do campo que está numa posição da estrutura.",
  UI_FN_FIELDNAME_KW: "campo;nome;posição",
  UI_FN_FIELDPOS: "Posição do campo",
  UI_FN_FIELDPOS_DESC: "A posição de um campo na estrutura, pelo nome; 0 se não existe.",
  UI_FN_FIELDPOS_KW: "campo;posição;existe",
  UI_FN_FIELDWBLOCK: "Bloco de acesso ao campo de outra área",
  UI_FN_FIELDWBLOCK_DESC: "Um bloco que lê ou grava um campo numa área de trabalho específica.",
  UI_FN_FIELDWBLOCK_KW: "campo;bloco;área",
  UI_FN_FILE: "Arquivo existe?",
  UI_FN_FILE_DESC: "Verdadeiro se o arquivo existe no disco.",
  UI_FN_FILE_KW: "existe;arquivo;disco",
  UI_FN_FOUND: "Busca encontrou?",
  UI_FN_FOUND_DESC: "Verdadeiro se a última busca (SEEK, LOCATE) encontrou registro.",
  UI_FN_FOUND_KW: "encontrado;seek;locate;busca",
  UI_FN_GETENV: "Variável de ambiente",
  UI_FN_GETENV_DESC: "O valor de uma variável de ambiente do sistema.",
  UI_FN_GETENV_KW: "ambiente;variável;sistema",
  UI_FN_HARDCR: "Quebras suaves em duras",
  UI_FN_HARDCR_DESC: "Troca as quebras de linha suaves de um memo por quebras normais.",
  UI_FN_HARDCR_KW: "memo;quebra de linha",
  UI_FN_HEADER: "Tamanho do cabeçalho",
  UI_FN_HEADER_DESC: "O tamanho do cabeçalho do arquivo, em bytes.",
  UI_FN_HEADER_KW: "cabeçalho;bytes",
  UI_FN_I2BIN: "Inteiro para bytes (2)",
  UI_FN_I2BIN_DESC: "Converte um inteiro em 2 bytes.",
  UI_FN_I2BIN_KW: "binário;bytes;inteiro",
  UI_FN_IIF: "Se … então … senão",
  UI_FN_IIF_DESC: "Devolve um valor se a condição for verdadeira e outro se for falsa.",
  UI_FN_IIF_KW: "se;condição;então;senão;if;condicional",
  UI_FN_INDEXEXT: "Extensão do índice",
  UI_FN_INDEXEXT_DESC: "A extensão dos arquivos de índice do driver em uso (.ntx).",
  UI_FN_INDEXEXT_KW: "índice;extensão;ntx",
  UI_FN_INDEXKEY: "Chave do índice",
  UI_FN_INDEXKEY_DESC: "A expressão de chave de um índice aberto, como texto.",
  UI_FN_INDEXKEY_KW: "índice;chave;expressão",
  UI_FN_INDEXORD: "Índice ativo",
  UI_FN_INDEXORD_DESC: "A posição do índice que está controlando a ordem; 0 se nenhum.",
  UI_FN_INDEXORD_KW: "índice;ordem ativa",
  UI_FN_INT: "Parte inteira",
  UI_FN_INT_DESC: "O número sem as casas decimais: Int(3.7) é 3.",
  UI_FN_INT_KW: "inteiro;truncar;sem decimais",
  UI_FN_ISALPHA: "Começa com letra?",
  UI_FN_ISALPHA_DESC: "Verdadeiro se o primeiro caractere do texto é uma letra.",
  UI_FN_ISALPHA_KW: "letra;alfabético",
  UI_FN_ISDIGIT: "Começa com dígito?",
  UI_FN_ISDIGIT_DESC: "Verdadeiro se o primeiro caractere do texto é um dígito.",
  UI_FN_ISDIGIT_KW: "dígito;número;numérico",
  UI_FN_ISLOWER: "Começa com minúscula?",
  UI_FN_ISLOWER_DESC: "Verdadeiro se o primeiro caractere do texto é uma letra minúscula.",
  UI_FN_ISLOWER_KW: "minúscula;caixa baixa",
  UI_FN_ISUPPER: "Começa com maiúscula?",
  UI_FN_ISUPPER_DESC: "Verdadeiro se o primeiro caractere do texto é uma letra maiúscula.",
  UI_FN_ISUPPER_KW: "maiúscula;caixa alta",
  UI_FN_L2BIN: "Inteiro para bytes (4)",
  UI_FN_L2BIN_DESC: "Converte um inteiro em 4 bytes.",
  UI_FN_L2BIN_KW: "binário;bytes;inteiro;long",
  UI_FN_LASTREC: "Total de registros",
  UI_FN_LASTREC_DESC: "Quantos registros o arquivo tem, contando os excluídos.",
  UI_FN_LASTREC_KW: "registros;total;quantidade;reccount",
  UI_FN_LEFT: "Começo do texto",
  UI_FN_LEFT_DESC: "Os primeiros N caracteres do texto.",
  UI_FN_LEFT_KW: "esquerda;começo;primeiros;início",
  UI_FN_LEN: "Tamanho",
  UI_FN_LEN_DESC: "Quantos caracteres tem o texto, ou quantos elementos tem o vetor.",
  UI_FN_LEN_KW: "comprimento;tamanho;quantos caracteres;length",
  UI_FN_LOG: "Logaritmo natural",
  UI_FN_LOG_DESC: "O logaritmo natural de um número.",
  UI_FN_LOG_KW: "logaritmo;ln",
  UI_FN_LOWER: "Converter para minúsculas",
  UI_FN_LOWER_DESC: "O texto todo em letras minúsculas.",
  UI_FN_LOWER_KW: "minúsculas;caixa baixa;lowercase",
  UI_FN_LTRIM: "Remover espaços do começo",
  UI_FN_LTRIM_DESC: "Tira os espaços do começo do texto.",
  UI_FN_LTRIM_KW: "trim;espaços;esquerda",
  UI_FN_LUPDATE: "Data da última gravação",
  UI_FN_LUPDATE_DESC: "A data em que o arquivo foi gravado pela última vez.",
  UI_FN_LUPDATE_KW: "última alteração;data de gravação;modificado",
  UI_FN_MAX: "Maior de dois",
  UI_FN_MAX_DESC: "O maior entre dois números ou duas datas.",
  UI_FN_MAX_KW: "máximo;maior",
  UI_FN_MEMOLINE: "Linha do memo",
  UI_FN_MEMOLINE_DESC: "Uma linha de um texto longo, numa largura de linha dada.",
  UI_FN_MEMOLINE_KW: "memo;linha;texto longo",
  UI_FN_MEMOREAD: "Ler arquivo de texto",
  UI_FN_MEMOREAD_DESC: "O conteúdo inteiro de um arquivo de texto do disco.",
  UI_FN_MEMOREAD_KW: "ler arquivo;texto;disco",
  UI_FN_MEMOTRAN: "Trocar quebras de linha",
  UI_FN_MEMOTRAN_DESC: "Troca as quebras de linha duras e suaves de um memo por outros caracteres.",
  UI_FN_MEMOTRAN_KW: "memo;quebra de linha;substituir",
  UI_FN_MEMVARBLOCK: "Bloco de acesso à variável",
  UI_FN_MEMVARBLOCK_DESC: "Um bloco que lê ou grava uma variável de memória pelo nome.",
  UI_FN_MEMVARBLOCK_KW: "variável;bloco;memvar",
  UI_FN_MIN: "Menor de dois",
  UI_FN_MIN_DESC: "O menor entre dois números ou duas datas.",
  UI_FN_MIN_KW: "mínimo;menor",
  UI_FN_MLCOUNT: "Quantidade de linhas do memo",
  UI_FN_MLCOUNT_DESC: "Quantas linhas um texto longo tem, numa largura de linha dada.",
  UI_FN_MLCOUNT_KW: "memo;linhas;contar",
  UI_FN_MOD: "Resto da divisão",
  UI_FN_MOD_DESC: "O resto da divisão de um número por outro: Mod(7, 3) é 1.",
  UI_FN_MOD_KW: "resto;módulo;divisão",
  UI_FN_MONTH: "Mês da data",
  UI_FN_MONTH_DESC: "O mês de uma data, como número (1 a 12).",
  UI_FN_MONTH_KW: "mês;número do mês",
  UI_FN_NETERR: "Erro de rede?",
  UI_FN_NETERR_DESC: "Verdadeiro se a última operação em rede (trava, abertura) falhou.",
  UI_FN_NETERR_KW: "rede;trava;lock;falhou",
  UI_FN_NUMAT: "Quantas vezes aparece",
  UI_FN_NUMAT_DESC: "Quantas vezes um trecho aparece dentro do texto.",
  UI_FN_NUMAT_KW: "contar;ocorrências;quantas vezes",
  UI_FN_ORDBAGEXT: "Extensão do arquivo de índice",
  UI_FN_ORDBAGEXT_DESC: "A extensão dos arquivos de índice do driver em uso.",
  UI_FN_ORDBAGEXT_KW: "índice;extensão",
  UI_FN_ORDBAGNAME: "Arquivo do índice",
  UI_FN_ORDBAGNAME_DESC: "O nome do arquivo de uma ordem (índice) aberta.",
  UI_FN_ORDBAGNAME_KW: "índice;arquivo;ordem",
  UI_FN_ORDDESCEND: "Ordem decrescente?",
  UI_FN_ORDDESCEND_DESC: "Se uma ordem está decrescente; pode trocar em tempo de execução.",
  UI_FN_ORDDESCEND_KW: "índice;decrescente;ordem",
  UI_FN_ORDFOR: "Condição FOR do índice",
  UI_FN_ORDFOR_DESC: "A expressão FOR de uma ordem (índice), como texto.",
  UI_FN_ORDFOR_KW: "índice;for;condição",
  UI_FN_ORDISUNIQUE: "Índice único?",
  UI_FN_ORDISUNIQUE_DESC: "Verdadeiro se a ordem foi criada como UNIQUE.",
  UI_FN_ORDISUNIQUE_KW: "índice;único;unique",
  UI_FN_ORDKEY: "Chave da ordem",
  UI_FN_ORDKEY_DESC: "A expressão de chave de uma ordem (índice), como texto.",
  UI_FN_ORDKEY_KW: "índice;chave;expressão",
  UI_FN_ORDKEYCOUNT: "Quantidade de chaves",
  UI_FN_ORDKEYCOUNT_DESC: "Quantas chaves uma ordem tem — com filtro e escopo, pode ser menos que os registros.",
  UI_FN_ORDKEYCOUNT_KW: "índice;contar;chaves",
  UI_FN_ORDKEYNO: "Posição na ordem",
  UI_FN_ORDKEYNO_DESC: "A posição do registro atual dentro da ordem ativa.",
  UI_FN_ORDKEYNO_KW: "índice;posição;número lógico",
  UI_FN_ORDKEYVAL: "Valor da chave",
  UI_FN_ORDKEYVAL_DESC: "O valor da chave do registro atual, lido do índice ativo.",
  UI_FN_ORDKEYVAL_KW: "índice;chave;valor",
  UI_FN_ORDNAME: "Nome da ordem",
  UI_FN_ORDNAME_DESC: "O nome da ordem que está numa posição da lista de índices.",
  UI_FN_ORDNAME_KW: "índice;nome;ordem",
  UI_FN_ORDNUMBER: "Posição da ordem",
  UI_FN_ORDNUMBER_DESC: "A posição de uma ordem na lista de índices, pelo nome.",
  UI_FN_ORDNUMBER_KW: "índice;posição;ordem",
  UI_FN_OS: "Sistema operacional",
  UI_FN_OS_DESC: "O nome do sistema operacional.",
  UI_FN_OS_KW: "sistema;windows;versão",
  UI_FN_PADC: "Centralizar",
  UI_FN_PADC_DESC: "O valor como texto, centralizado numa largura, completando com espaços dos dois lados.",
  UI_FN_PADC_KW: "centralizar;preencher;largura;alinhar",
  UI_FN_PADL: "Alinhar à direita",
  UI_FN_PADL_DESC: "O valor como texto, completado com espaços à esquerda até uma largura.",
  UI_FN_PADL_KW: "preencher;esquerda;largura;alinhar;zeros",
  UI_FN_PADR: "Alinhar à esquerda",
  UI_FN_PADR_DESC: "O valor como texto, completado com espaços à direita até uma largura. É a função de chave de índice de texto.",
  UI_FN_PADR_KW: "preencher;direita;largura;alinhar;índice",
  UI_FN_PCOUNT: "Quantidade de parâmetros",
  UI_FN_PCOUNT_DESC: "Quantos parâmetros a função atual recebeu.",
  UI_FN_PCOUNT_KW: "parâmetros;argumentos",
  UI_FN_PROCLINE: "Linha do programa",
  UI_FN_PROCLINE_DESC: "A linha do código-fonte em execução.",
  UI_FN_PROCLINE_KW: "linha;depuração",
  UI_FN_PROCNAME: "Nome da rotina",
  UI_FN_PROCNAME_DESC: "O nome da função ou procedimento em execução.",
  UI_FN_PROCNAME_KW: "rotina;função;depuração",
  UI_FN_RAT: "Última posição do texto",
  UI_FN_RAT_DESC: "Em que posição um trecho aparece pela última vez dentro do texto; 0 se não aparece.",
  UI_FN_RAT_KW: "procurar;última ocorrência;posição;direita",
  UI_FN_RDDNAME: "Driver ativo",
  UI_FN_RDDNAME_DESC: "O nome do driver (RDD) do arquivo aberto.",
  UI_FN_RDDNAME_KW: "rdd;driver;dbfntx",
  UI_FN_RECCOUNT: "Total de registros",
  UI_FN_RECCOUNT_DESC: "Quantos registros o arquivo tem, contando os excluídos.",
  UI_FN_RECCOUNT_KW: "registros;total;quantidade;lastrec",
  UI_FN_RECNO: "Número do registro",
  UI_FN_RECNO_DESC: "O número físico do registro atual.",
  UI_FN_RECNO_KW: "registro;número;recno;posição",
  UI_FN_RECSIZE: "Tamanho do registro",
  UI_FN_RECSIZE_DESC: "O tamanho de um registro, em bytes.",
  UI_FN_RECSIZE_KW: "registro;bytes;tamanho",
  UI_FN_REPLICATE: "Repetir texto",
  UI_FN_REPLICATE_DESC: "Um texto repetido N vezes: Replicate(\"-\", 3) é \"---\".",
  UI_FN_REPLICATE_KW: "repetir;replicar;vezes",
  UI_FN_RIGHT: "Fim do texto",
  UI_FN_RIGHT_DESC: "Os últimos N caracteres do texto.",
  UI_FN_RIGHT_KW: "direita;fim;últimos;final",
  UI_FN_ROUND: "Arredondar",
  UI_FN_ROUND_DESC: "O número arredondado a uma quantidade de casas decimais.",
  UI_FN_ROUND_KW: "arredondar;casas decimais;round",
  UI_FN_RTRIM: "Remover espaços do fim",
  UI_FN_RTRIM_DESC: "Tira os espaços do fim do texto.",
  UI_FN_RTRIM_KW: "trim;espaços;direita",
  UI_FN_SECONDS: "Segundos desde a meia-noite",
  UI_FN_SECONDS_DESC: "Quantos segundos se passaram desde a meia-noite.",
  UI_FN_SECONDS_KW: "segundos;hora;tempo",
  UI_FN_SELECT: "Número da área",
  UI_FN_SELECT_DESC: "O número da área de trabalho de um alias; sem alias, a área atual.",
  UI_FN_SELECT_KW: "área;alias;número",
  UI_FN_SOUNDEX: "Código fonético",
  UI_FN_SOUNDEX_DESC: "Um código que representa como o texto soa — nomes parecidos dão o mesmo código.",
  UI_FN_SOUNDEX_KW: "fonético;parecido;soa como",
  UI_FN_SPACE: "Espaços",
  UI_FN_SPACE_DESC: "Um texto com N espaços em branco.",
  UI_FN_SPACE_KW: "espaços;em branco",
  UI_FN_SQRT: "Raiz quadrada",
  UI_FN_SQRT_DESC: "A raiz quadrada de um número.",
  UI_FN_SQRT_KW: "raiz;quadrada",
  UI_FN_STOD: "Texto AAAAMMDD para data",
  UI_FN_STOD_DESC: "Converte um texto no formato AAAAMMDD numa data.",
  UI_FN_STOD_KW: "converter;data;aaaammdd;texto para data",
  UI_FN_STR: "Número para texto",
  UI_FN_STR_DESC: "Converte um número em texto, com tamanho e decimais opcionais.",
  UI_FN_STR_KW: "converter;número para texto;formatar",
  UI_FN_STRTRAN: "Substituir texto",
  UI_FN_STRTRAN_DESC: "Troca todas as ocorrências de um trecho por outro.",
  UI_FN_STRTRAN_KW: "substituir;trocar;replace",
  UI_FN_STRZERO: "Número com zeros à esquerda",
  UI_FN_STRZERO_DESC: "Converte um número em texto completando com zeros à esquerda: StrZero(7, 3) é \"007\".",
  UI_FN_STRZERO_KW: "zeros;preencher;número para texto;código",
  UI_FN_STUFF: "Apagar e inserir",
  UI_FN_STUFF_DESC: "Apaga um trecho do texto a partir de uma posição e insere outro no lugar.",
  UI_FN_STUFF_KW: "inserir;apagar;substituir trecho",
  UI_FN_SUBSTR: "Extrair parte do texto",
  UI_FN_SUBSTR_DESC: "Um pedaço do texto, a partir de uma posição, com uma quantidade de caracteres.",
  UI_FN_SUBSTR_KW: "parte;trecho;pedaço;substring;meio",
  UI_FN_TIME: "Hora atual",
  UI_FN_TIME_DESC: "A hora do sistema, como texto hh:mm:ss.",
  UI_FN_TIME_KW: "hora;agora;relógio",
  UI_FN_TRANSFORM: "Formatar com máscara",
  UI_FN_TRANSFORM_DESC: "O valor como texto, formatado por uma máscara: Transform(1234.5, \"@E 999,999.99\").",
  UI_FN_TRANSFORM_KW: "formatar;máscara;picture;moeda",
  UI_FN_TRIM: "Remover espaços do fim",
  UI_FN_TRIM_DESC: "Tira os espaços do fim do texto (o mesmo que RTrim).",
  UI_FN_TRIM_KW: "trim;espaços;direita",
  UI_FN_TYPE: "Tipo de uma expressão em texto",
  UI_FN_TYPE_DESC: "A letra do tipo de uma expressão escrita como texto; \"U\" se não existe.",
  UI_FN_TYPE_KW: "tipo;letra;existe",
  UI_FN_UPPER: "Converter para maiúsculas",
  UI_FN_UPPER_DESC: "O texto todo em letras maiúsculas.",
  UI_FN_UPPER_KW: "maiúsculas;caixa alta;uppercase",
  UI_FN_USED: "Área em uso?",
  UI_FN_USED_DESC: "Verdadeiro se há um arquivo aberto na área de trabalho.",
  UI_FN_USED_KW: "aberto;área;em uso",
  UI_FN_VAL: "Texto para número",
  UI_FN_VAL_DESC: "Converte um texto em número; texto que não é número dá 0.",
  UI_FN_VAL_KW: "converter;texto para número;valor",
  UI_FN_VALTYPE: "Tipo do valor",
  UI_FN_VALTYPE_DESC: "A letra do tipo de um valor: C, N, D, L, M.",
  UI_FN_VALTYPE_KW: "tipo;letra",
  UI_FN_VERSION: "Versão do Harbour",
  UI_FN_VERSION_DESC: "A versão do Harbour que está rodando.",
  UI_FN_VERSION_KW: "versão;harbour",
  UI_FN_WORD: "Inteiro de 16 bits",
  UI_FN_WORD_DESC: "Converte um número em inteiro de 16 bits (compatibilidade).",
  UI_FN_WORD_KW: "inteiro;word;compatibilidade",
  UI_FN_YEAR: "Ano da data",
  UI_FN_YEAR_DESC: "O ano de uma data, como número.",
  UI_FN_YEAR_KW: "ano",
};
