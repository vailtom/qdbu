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
  UI_ROWS_PER_PAGE_TITLE: "Registros por página",
  UI_LAST_READ: "Última leitura",
  UI_RELOAD: "Reler do disco (F5)",

  // ---------------------------------------------------------------- estrutura
  UI_FIELD: "Campo",
  UI_TYPE: "Tipo",
  UI_SIZE: "Tam.",
  UI_DEC: "Dec.",

  // As letras do dBASE viajam cruas da DLL; a palavra é escolhida aqui, com o
  // nome que a listagem de estrutura sempre usou — "caractere", não "texto".
  UI_TYPE_C: "caractere",
  UI_TYPE_N: "numérico",
  UI_TYPE_D: "data",
  UI_TYPE_L: "lógico",
  UI_TYPE_M: "memo",
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
    "Antes de alterar o arquivo, o DBU confere o que pode dar errado e faz " +
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
    "A cópia fica na mesma pasta, com a hora no nome, e abre no DBU como " +
    "qualquer arquivo — dá para conferir antes de apagar a cópia.",
  UI_WITH_BACKUP: "Sim, copiar antes",
  UI_WITHOUT_BACKUP: "Não, seguir sem cópia",
  UI_GO_AHEAD: "Continuar",

  UI_ZAP_DONE: "'{file}' esvaziado: {n} registros apagados.",
  UI_ZAP_DONE_BACKUP:
    "'{file}' esvaziado: {n} registros apagados. A cópia ficou em '{backup}'.",
  UI_PACK_DONE: { one: "'{file}' compactado: {n} registro removido.", other: "'{file}' compactado: {n} registros removidos." },
  UI_PACK_DONE_BACKUP: "'{file}' compactado: {n} removidos. A cópia ficou em '{backup}'.",
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

};
