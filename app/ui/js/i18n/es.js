// Español.
//
// PENDIENTE DE REVISIÓN POR UN HABLANTE NATIVO. Nadie en el proyecto tiene el
// español como lengua materna: este archivo se escribió siguiendo la
// terminología xBase publicada, y merece una lectura de alguien que trabaje a
// diario con DBF en español antes de la primera versión pública. Si una frase
// suena traducida, lo está — corregirla aquí no rompe nada.
//
// REGISTRO: vocabulario de DBA, no lenguaje coloquial. Los términos xBase
// canónicos se usan a propósito —
//
//     orden controlador   el índice que manda en el orden de las filas
//     orden natural       sin índice; por número de registro
//     SEEK / LOCATE       búsqueda por clave vs. barrido secuencial
//     soft seek           cae en la clave más cercana si no hay coincidencia
//     Carácter/Numérico/Fecha/Lógico/Memo   los tipos dBASE, tal como los
//                         escribe el listado de estructura
//
// Refleja pt-BR.js clave por clave. Convenciones documentadas allí.

(window.I18N || (window.I18N = {}))["es"] = {

  UI_LANGUAGE: "Idioma",
  UI_THEME: "Tema",
  UI_THEME_CLARO: "Claro",
  UI_THEME_GRAFITE: "Grafito",
  UI_THEME_MARINHO: "Azul marino",
  UI_THEME_MAGENTA: "Magenta",
  UI_THEME_VINHO: "Vino",
  UI_THEME_VERDE: "Verde",
  UI_THEME_OLIVA: "Oliva",
  UI_THEME_OURO: "Oro",
  UI_THEME_CAFE: "Café",
  UI_THEME_TERRACOTA: "Terracota",
  UI_THEME_AMEIXA: "Ciruela",
  UI_THEME_INDIGO: "Índigo",

  UI_SUBTITLE: "Utilidad de base de datos",
  UI_NEW_CONNECTION: "+ Conexión",
  UI_SEARCH_PLACEHOLDER: "Buscar conexión o archivo…",
  UI_CONNECTIONS: "Conexiones",
  UI_PANEL_WIDTH: "Ancho del panel",
  UI_DRAG_RESIZE: "Arrastre para redimensionar (doble clic vuelve al valor por omisión)",
  UI_NO_FILE_OPEN: "Ningún archivo abierto",
  UI_EMPTY_HINT:
    "Registre una conexión — una carpeta con archivos DBF — y haga doble clic " +
    "en un archivo a la izquierda.",

  UI_FILE_VIEW: "Vista del archivo",
  UI_VIEW_STRUCTURE: "Estructura",
  UI_VIEW_DATA: "Datos",
  UI_COLUMNS: "Columnas",
  UI_COLUMNS_TITLE: "Elegir columnas visibles",
  UI_INDEXES: "Índices",
  UI_INDEXES_TITLE: "Índices NTX y orden controlador",
  UI_FILTER: "Filtro",
  UI_FILTER_TITLE: "Filtrar registros",
  UI_EXPORT: "Exportar",
  UI_EXPORT_TITLE: "Exportar a CSV, JSON o Excel",

  UI_MODE_GUIDED: "Guiado",
  UI_MODE_EXPR: "Expresión",
  UI_ADD_CONDITION: "+ condición",
  UI_PARTIAL_SUGGESTIONS: "sugerencias parciales",
  UI_PARTIAL_SUGGESTIONS_TITLE:
    "La lista solo trae valores muestreados del comienzo del archivo",
  UI_FILTER_PLACEHOLDER: "CLI_EST == 'SP' .AND. !Empty(CLI_CGC)",
  UI_CHECK: "Comprobar",
  UI_CHECK_TITLE: "Compilar sin aplicar",
  UI_APPLY: "Aplicar",
  UI_CLEAR: "Limpiar",
  UI_COUNT: "Contar",
  UI_COUNT_TITLE: "Contar registros que cumplen el filtro",
  UI_CLOSE: "Cerrar",

  UI_OP_EQ: "es igual a",
  UI_OP_NE: "es distinto de",
  UI_OP_CONTAINS: "contiene",
  UI_OP_STARTS: "empieza por",
  UI_OP_GT: "mayor que",
  UI_OP_LT: "menor que",
  UI_OP_GE: "mayor o igual",
  UI_OP_LE: "menor o igual",
  UI_OP_EMPTY: "está vacío",
  UI_OP_NOT_EMPTY: "no está vacío",
  UI_USE_CONDITION: "usar esta condición",
  UI_ADD_CONDITION_BELOW: "agregar condición debajo",
  UI_PRECEDENCE_HINT:
    ".AND. liga más fuerte que .OR.: los paréntesis muestran la agrupación " +
    "que realmente rige.",
  UI_EXPR_TO_APPLY: "expresión que se aplicará",

  UI_VISIBLE_COLUMNS: "Columnas visibles",
  UI_ALL_F: "Todas",
  UI_NONE_F: "Ninguna",
  UI_INVERT: "Invertir",
  UI_COLUMN_JUMP_HINT: "→ desplaza la rejilla hasta la columna.",
  UI_FIND_COLUMN: "Localizar columna…",

  UI_CLOSE_ALL: "Cerrar todos",
  UI_CLOSE_ALL_INDEXES: "Cerrar todos los índices",
  UI_CREATE_ELLIPSIS: "Crear…",
  UI_CREATE_INDEX_TITLE: "Crear un índice NTX",
  UI_KEY: "Clave",
  UI_FILE: "Archivo",
  UI_ONLY_RECORDS_THAT: "Condición FOR",
  UI_OPTIONAL: "(opcional)",
  UI_UNIQUE_KEYS: "claves únicas",
  UI_CREATE: "Crear",
  UI_CANCEL: "Cancelar",
  UI_IN_FOLDER: "En la carpeta",
  UI_FILTER_INDEX: "Filtrar índice…",

  UI_FIRST_PAGE: "Primera página (Ctrl+Inicio)",
  UI_PREV_PAGE: "Página anterior (RePág)",
  UI_NEXT_PAGE: "Página siguiente (AvPág)",
  UI_LAST_PAGE: "Última página (Ctrl+Fin)",
  UI_GOTO: "ir a",
  UI_RECORD: "registro",
  UI_SEARCH: "buscar",
  UI_NEXT_MATCH: "Siguiente coincidencia (F3)",
  UI_ORDER: "orden",
  UI_ORDER_PHYSICAL: "Natural",
  UI_ORDER_TITLE: "Índice controlador del orden de las filas",
  UI_ROWS_PER_PAGE: "filas/pág",
  UI_ROWS_PER_PAGE_TITLE: "Registros por página",
  UI_LAST_READ: "Última lectura",
  UI_RELOAD: "Releer del disco (F5)",

  UI_FIELD: "Campo",
  UI_TYPE: "Tipo",
  UI_SIZE: "Long.",
  UI_DEC: "Dec.",

  UI_TYPE_C: "carácter",
  UI_TYPE_N: "numérico",
  UI_TYPE_D: "fecha",
  UI_TYPE_L: "lógico",
  UI_TYPE_M: "memo",
  UI_TYPE_A: "vector",
  UI_TYPE_B: "code block",
  UI_TYPE_U: "NIL",

  UI_STOP: "Detener",
  UI_CHECKING: "comprobando…",
  UI_LOG: "registro:",

  UI_EXPORT_TO: "Exportar",
  UI_FORMAT: "Formato",
  UI_FMT_CSV: "CSV",
  UI_FMT_JSON: "JSON",
  UI_FMT_XLSX: "Excel (.xlsx)",
  UI_FMT_DBF: "DBF (otra tabla)",
  UI_CHOOSE_WHERE_SAVE: "Elegir dónde guardar…",
  UI_CSV_OPTIONS: "Opciones del CSV",
  UI_XLSX_OPTIONS: "Opciones de la hoja",
  UI_DBF_OPTIONS: "Sobre el DBF generado",
  UI_SEPARATOR: "Delimitador",
  UI_SEP_SEMICOLON: "Punto y coma (Excel con coma decimal)",
  UI_SEP_COMMA: "Coma",
  UI_SEP_TAB: "Tabulación",
  UI_ENCODING: "Codificación",
  UI_ENC_ANSI: "ANSI (sistemas antiguos)",
  UI_ENC_CP850: "CP850 (DOS)",
  UI_HEADER: "Encabezado",
  UI_HEADER_FIRST_LINE: "En la primera línea",
  UI_HEADER_NONE: "No incluir",
  UI_DBF_NOTE:
    "Los campos elegidos forman la estructura de la tabla nueva, conservando " +
    "sus tipos originales. El orden controlador y el filtro activo rigen: la " +
    "tabla se escribe ya ordenada y solo con lo que pasa el filtro.",
  UI_SHEET_NAME: "Nombre de la hoja",
  UI_SHEET_DEFAULT: "Datos",
  UI_RECORDS: "Registros",
  UI_ONLY_GRID: "Solo las de la rejilla",
  UI_FILTER_BY_NAME: "filtrar por nombre…",
  UI_PREVIEW: "Vista previa",
  UI_REFRESH: "Actualizar",
  UI_SKIP_DELETED: "Omitir marcados para borrar",
  UI_TIMESTAMP_NAME: "Fecha y hora en el nombre",
  UI_SCOPE_FILTERED: "Los que cumplen el filtro activo",
  UI_SCOPE_ALL: "Todos, ignorando el filtro",
  UI_FILTER_IN_FORCE: "Filtro activo:",
  UI_EMPTY_FILE_PREVIEW: "(archivo vacío)",
  UI_ACT_ON_FILTERED: "actúan sobre las {n} listadas",
  UI_WILL_EXPORT: { one: "saldrá {n} registro", other: "saldrán {n} registros" },

  UI_SAVE_DIALOG_TITLE: "Exportar a",
  UI_FT_CSV: "Texto delimitado (*.csv)",
  UI_FT_JSON: "JSON (*.json)",
  UI_FT_XLSX: "Hoja de Excel (*.xlsx)",
  UI_FT_DBF: "Tabla dBASE (*.dbf)",
  UI_FT_ALL: "Todos los archivos",

  UI_NEW_CONNECTION_TITLE: "Nueva conexión",
  UI_CONNECTION_EXPLAIN:
    "Una conexión es una carpeta con archivos DBF — normalmente la carpeta de un cliente.",
  UI_FOLDER: "Carpeta",
  UI_NAME: "Nombre",
  UI_NAME_OPTIONAL: "(opcional — usa el nombre de la carpeta)",
  UI_PH_CONNECTION_NAME: "Cliente A",
  UI_ADD: "Agregar",

  // -------------------------------------------------------- rechazos de la DLL

  ERROR_UNSPECIFIED: "Error no identificado.",
  ERROR_BAD_ENVELOPE: "La solicitud no llegó como JSON válido.",
  ERROR_UNKNOWN_METHOD: "No existe el método '{method}'.",

  ERROR_PARAM_REQUIRED: "Este campo es obligatorio.",
  ERROR_PARAM_REQUIRED_path: "Falta la ruta del archivo.",
  ERROR_PARAM_REQUIRED_dir: "Falta la carpeta de la conexión.",
  ERROR_PARAM_REQUIRED_name: "Falta el nombre de la conexión.",
  ERROR_PARAM_REQUIRED_key: "Falta la expresión de clave.",
  ERROR_PARAM_REQUIRED_expr: "Falta la condición.",
  ERROR_PARAM_REQUIRED_value: "Falta el valor a buscar.",
  ERROR_PARAM_REQUIRED_method: "La solicitud no indicó el método.",
  ERROR_PARAM_REQUIRED_h: "Falta el archivo abierto o la ruta.",
  ERROR_PARAM_REQUIRED_state: "Falta el estado de la sesión.",
  ERROR_PARAM_REQUIRED_fields: "Elija al menos un campo.",

  ERROR_PARAM_OUT_OF_RANGE: "{value} está fuera del rango {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_recno: "El registro {value} está fuera de rango; válido: {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_anchor: "El ancla {value} está fuera de rango; válido: {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_order:
    "No existe el orden {value}; válido: {min}..{max} (0 = orden natural).",

  ERROR_PARAM_TOO_SMALL: "El mínimo es {min}.",
  ERROR_PARAM_TOO_SMALL_count: "Count debe ser al menos {min}.",
  ERROR_PARAM_TOO_BIG: "El máximo es {max}.",
  ERROR_PARAM_TOO_BIG_count: "Count {value} supera el tope de {max} registros por página.",
  ERROR_PARAM_MUST_BE_LIST: "Este campo espera una lista de nombres.",
  ERROR_BAD_DATE: "'{value}' no es una fecha; use AAAA-MM-DD o DD/MM/AAAA.",
  ERROR_BAD_ANCHOR: "El ancla debe ser el principio, el final, o un número de registro.",

  ERROR_INVALID_HANDLE: "El archivo '{handle}' no está abierto.",
  ERROR_HANDLE_CLOSED: "Este archivo se cerró en {closedIn}.",

  ERROR_CONNECTION_EXISTS: "Ya existe una conexión llamada '{name}'.",
  ERROR_CONNECTION_NOT_FOUND: "No hay ninguna conexión llamada '{name}'.",
  ERROR_DIR_NOT_FOUND: "La carpeta '{dir}' no existe.",

  ERROR_FILE_NOT_FOUND: "El archivo '{file}' no existe.",
  ERROR_FILE_EXISTS: "'{file}' ya existe; marque reemplazar para sobrescribir.",
  ERROR_FILE_ALREADY_OPEN: "'{file}' ya está abierto en esta sesión.",
  ERROR_NOT_A_DBF: "'{file}' no es un DBF válido[[: {reason}]].",
  ERROR_MEMO_FILE_MISSING:
    "'{file}' tiene campo memo, pero el archivo {memo} no está al lado.",
  ERROR_OPEN_FAILED: "No se pudo abrir '{file}'[[: {reason}]].",

  ERROR_FIELD_NOT_FOUND: "El campo '{field}' no existe en {alias}.",
  ERROR_NO_COLUMNS: "Ninguna columna seleccionada.",

  ERROR_EXPR_INVALID: "La expresión no compila: {detail}.",
  ERROR_EXPR_NOT_LOGICAL:
    "La condición debe dar lógico (.T./.F.); esta devuelve {type}.",
  ERROR_EXPR_NOT_LOGICAL_for:
    "La condición FOR debe dar lógico (.T./.F.); esta devuelve {type}.",

  ERROR_NOT_AN_INDEX: "'{file}' no es un índice NTX[[: {reason}]].",
  ERROR_INDEX_ALREADY_OPEN: "'{file}' ya está abierto en este archivo.",
  ERROR_INDEX_NOT_OPEN: "'{file}' no está abierto en este archivo.",
  ERROR_INDEX_OPEN_FAILED: "No se pudo abrir '{file}'[[: {detail}]].",
  ERROR_INDEX_UNKNOWN_FUNCTION:
    "'{file}' llama a {func}, que esta compilación no enlaza — clave: {key}.",
  ERROR_INDEX_FIELD_NOT_IN_FILE:
    "'{file}' referencia {field}, ausente en {alias}; lo más probable es que " +
    "el índice sea de otra tabla — clave: {key}.",
  ERROR_INDEX_REJECTED_BY_RDD: "El RDD rechazó '{file}'.",
  ERROR_INDEX_OPEN_ON_CREATE: "'{file}' está abierto; ciérrelo antes de recrearlo.",
  ERROR_INDEX_KEY_BAD_TYPE:
    "La clave devuelve {type}; un índice NTX acepta carácter, numérico o fecha.",
  ERROR_INDEX_CREATE_FAILED: "No se pudo crear '{file}'[[: {reason}]].",
  ERROR_NO_ACTIVE_ORDER:
    "SEEK exige un orden controlador; sin índice activo use LOCATE, que " +
    "recorre el archivo secuencialmente.",
  ERROR_SEEK_BAD_KEY_TYPE: "La clave del índice es {type}; SEEK no busca en este tipo.",

  ERROR_EXPORT_FAILED: "No se pudo crear '{file}'[[: {reason}]].",
  ERROR_EXPORT_OPEN_FAILED:
    "'{file}' se creó pero no se pudo abrir para escritura[[: {reason}]].",
  ERROR_SAME_FILE: "El destino es la propia tabla de origen; elija otro nombre.",

  WARN_CANCELED_PARTIAL_FILE: {
    one: "Cancelado con {n} registro; '{file}' se borró por estar incompleto.",
    other: "Cancelado con {n} registros; '{file}' se borró por estar incompleto.",
  },
  WARN_CANCELED_INDEX: "Creación cancelada; '{file}' se borró por estar incompleto.",

  // ------------------------------------------------------- la aplicación habla

  INFO_CONNECTION_ADDED: "Conexión '{name}' agregada.",
  INFO_CONNECTION_REMOVED: "Conexión '{name}' eliminada.",
  UI_NO_CONNECTIONS: "Ninguna conexión registrada.",
  UI_NOTHING_MATCHES: "Nada coincide con la búsqueda.",
  UI_NO_MATCH_SEARCH: "Ningún archivo coincide con la búsqueda.",
  UI_NO_DBF_HERE: "Ningún DBF en esta carpeta.",
  UI_READING_FOLDER: "leyendo la carpeta…",
  UI_OPENING: "abriendo {file}…",
  UI_LOADING: "leyendo…",
  UI_STOPPING: "deteniendo…",
  UI_FOLDER_UNREADABLE: "No se pudo leer la carpeta.",
  UI_FOLDER_NOT_FOUND: "Carpeta no encontrada.",
  UI_CONNECTION_ACTIONS: "Acciones de la conexión {name}",
  UI_MENU_OPEN_FOLDER: "Abrir en el Explorador",
  UI_MENU_RELOAD: "Releer los archivos",
  UI_MENU_REMOVE: "Eliminar la conexión",
  ERROR_OPEN_FOLDER_FAILED: "No se pudo abrir la carpeta: {detail}.",
  UI_NOT_A_DBF_SHORT: "NO ES UN DBF: {reason}.",
  UI_DOUBLE_CLICK_TO_OPEN: "doble clic para abrir",
  UI_FILES_COUNT: { one: "{n} archivo", other: "{n} archivos" },

  UI_ALREADY_OPEN_SHORT: "Ya estaba abierto.",
  UI_CLOSE_TAB: "Cerrar {alias}",
  UI_TAB_SUMMARY: "{records} registros, {fields} campos",
  UI_EMPTY_FILE: "La tabla no tiene registros.",
  UI_EMPTY_PAGE: "Ninguna fila en esta página.",
  UI_EMPTY_FILTERED: "Ningún registro de esta página cumple el filtro activo.",
  UI_DELETED_RECORD: "Registro marcado para borrar.",
  UI_HAS_NUL_BYTE: "Contiene un byte NUL.",
  UI_LAST_READ_AT: "última lectura: {time}",
  UI_GO_TO_COLUMN: "desplazar hasta {name} en la rejilla",
  UI_DRAW_FAILED: "No se pudo dibujar {what}.",
  UI_INTERNAL_ERROR: "Error interno: {detail}.",
  UI_UNHANDLED_REJECTION: "Promesa rechazada sin captura.",

  ERROR_NO_COLUMN_MATCHES: "Ninguna columna coincide con la búsqueda.",
  ERROR_NEED_ONE_VISIBLE: "Al menos una columna debe quedar visible.",
  ERROR_INVERT_WOULD_EMPTY: "Invertir dejaría la rejilla sin columnas.",
  ERROR_NO_COLUMN_NAMED: "Ninguna columna con ese nombre.",
  ERROR_PICK_ONE_COLUMN: "Seleccione al menos una columna.",

  INFO_INDEX_OPENED: "Índice abierto — orden {order}: {key}.",
  INFO_INDEXES_CLOSED: "Índices cerrados — orden natural.",
  INFO_INDEX_CREATED: "Índice creado — orden {order}: {key}.",
  INFO_INDEX_REBUILT: "Índice recreado — orden {order}: {key}.",
  UI_PHYSICAL_ORDER: "Orden natural (por número de registro).",
  UI_ORDERED_BY: "Ordenado por {key}.",
  UI_NO_INDEX_OPEN: "Ningún índice abierto — abra uno en Índices.",
  UI_NONE_OPEN: "ninguno abierto",
  UI_N_OPEN: { one: "{n} abierto", other: "{n} abiertos" },
  UI_CLOSE_INDEX: "cerrar {file}",
  UI_NOTHING_ELSE_MATCHES: "Nada más coincide con este archivo.",
  UI_ALREADY_ORDERED_BY: "Ya ordenado por {name}.",
  UI_INDEX_AVAILABLE_FOR: "Hay un índice por {name} ({file}) — ábralo en Índices.",
  UI_NO_INDEX_FOR: "No hay índice por {name} — un DBF solo ordena por índice.",
  ERROR_INDEX_NOT_CREATED: "No se creó.",
  UI_CONFIRM_OVERWRITE: "{file} ya existe.\n\n¿Sobrescribir?",
  ERROR_TELL_FILE_NAME: "Falta el nombre del archivo.",
  ERROR_TELL_KEY: "Falta la expresión de clave.",
  INFO_KEY_OK: "Clave válida — {type}.",
  UI_EVALUATED_FIRST_RECORD: "evaluada en el primer registro",

  INFO_FILTER_APPLIED:
    "Aplicado. .AND. liga más fuerte que .OR. — revise la agrupación en la vista previa.",
  INFO_FILTER_ACTIVE: "Filtro aplicado: {expr}.",
  INFO_EXPR_OK: "{expr} → ok",
  ERROR_EXPR_RETURNS: "{expr} → devuelve {type}; debe ser lógico.",
  UI_EXPR_RESULT: "{expr} → {value}",
  ERROR_TELL_VALUE: "Falta el valor.",
  INFO_COUNT_RESULT: {
    one: "{n} de {total} registro cumple.",
    other: "{n} de {total} registros cumplen.",
  },
  WARN_COUNT_STOPPED: "Conteo interrumpido en {n} — el total sigue sin conocerse.",

  UI_SEEK_BY_INDEX: "buscar {key}",
  UI_SEEK_BY_INDEX_TITLE: "SEEK por {key}: salta con cada tecla",
  UI_SCAN_SEARCH: "buscar (Intro)",
  UI_SCAN_SEARCH_TITLE: "Sin orden controlador: barrido secuencial, solo con Intro",
  ERROR_NOTHING_FROM: "Ninguna clave a partir de {value}.",
  INFO_APPROXIMATE: "Soft seek — clave más cercana: {value}.",
  ERROR_NO_TEXT_COLUMN: "Ninguna columna carácter visible para recorrer.",
  ERROR_NOT_FOUND: "No encontrado: {value}.",

  INFO_EXPORT_DONE: {
    one: "\u2713 {n} registro exportado con éxito a las {time} — {file} ({size}).",
    other: "\u2713 {n} registros exportados con éxito a las {time} — {file} ({size}).",
  },
  INFO_EXPORT_SKIPPED: {
    one: "{n} marcado para borrar quedó fuera.",
    other: "{n} marcados para borrar quedaron fuera.",
  },
  INFO_EXPORTED_TO: "Exportado: {file}.",
  UI_EXPORTING: "exportando…",
  UI_GENERATING: "generando…",
  ERROR_DIALOG_UNAVAILABLE: "Diálogo del sistema no disponible — escriba la ruta.",
  ERROR_DIALOG_FAILED: "No se pudo abrir el diálogo: {detail}.",

  ERROR_SESSION_SAVE_FAILED: "No se pudo guardar la sesión: {detail}.",
  WARN_SESSION_FILE_SKIPPED: "No volvió a abrirse: {files}.",
  WARN_FILTER_NOT_REAPPLIED: "Filtro no reaplicado — {detail}.",
  INFO_SESSION_RESTORED: {
    one: "Sesión anterior restaurada — {n} archivo.",
    other: "Sesión anterior restaurada — {n} archivos.",
  },

  INFO_DLL_LOADED: "DLL cargada",
  ERROR_DLL_NOT_LOADED: "DLL no cargada",
  UI_CDP_PORT: "CDP :{port}",
  UI_CDP_OFF: "CDP apagado",

  // ------------------------------- surgieron al convertir app.js

  UI_CARD_RECORDS: "registros",
  UI_CARD_FIELDS: "campos",
  UI_CARD_RECSIZE: "bytes/registro",
  UI_CARD_MODE: "modo",
  UI_CARD_MEMO: "memo",
  UI_YES: "sí",
  UI_MODE_SHARED: "compartido",
  UI_MODE_EXCLUSIVE: "exclusivo",

  // Filtro guiado -- son RÓTULOS; el valor interno sigue siendo "E"/"OU".
  UI_JOIN_AND: "Y",
  UI_JOIN_OR: "O",
  UI_WHERE: "donde",
  UI_REMOVE: "quitar",
  UI_VALUE: "valor",
  UI_VALUE_TITLE:
    "El valor sigue el tipo del campo. Para calcularlo en vez de compararlo " +
    "como literal, active el botón fx que está al lado.",
  UI_VALUE_EXPR: "expresión",
  UI_CALC_OFF: "fx — el valor se compara como literal; pulse para calcularlo",
  UI_CALC_ON: "fx activo — el valor se calcula (ej.: Date()-7, CLI_LIMC * 2)",

  // Rechazos de valor en el filtro guiado. Nombran el valor Y el campo: "no es
  // una fecha" a secas no ayuda a quien tiene seis condiciones en pantalla.
  ERROR_VALUE_NOT_NUMBER:
    "{field} es numérico y '{value}' no es un número — active el fx para calcular.",
  ERROR_VALUE_NOT_DATE:
    "{field} es fecha y '{value}' no lo es — use DD/MM/AAAA, o active el fx " +
    "para calcular (ej.: Date()-7).",
  ERROR_VALUE_NOT_LOGICAL:
    "{field} es lógico y '{value}' no es sí ni no — use S/N, o active el fx.",

  UI_COUNTING: "contando…",
  UI_SEARCHING: "recorriendo…",
  UI_CREATING: "creando…",

  UI_PAGE_RANGE: "en esta página: {first}–{last}",
  UI_PAGE_RANGE_EMPTY: "ningún registro a la vista",
  UI_FILTERED_SUFFIX: "{n} filtrados",
  UI_UNKNOWN_COUNT: "?",
  UI_GOTO_RECORD: "registro {n}",
  UI_N_BYTES: "{n} bytes",
  UI_FIELDS_COUNT: "{n} campos",
  UI_MEMO: "memo",
  UI_FILTERED_MARK: "filtrado",
  UI_FILTERED_MARK_N: "filtrado: {n}",

  UI_CONFIRM_REMOVE_CONNECTION:
    "¿Eliminar la conexión \"{name}\"?\n\nLos archivos en disco no se tocan.",

  INFO_FOUND_SCANNED: {
    one: "Hallado tras recorrer {n} registro.",
    other: "Hallado tras recorrer {n} registros.",
  },
  WARN_SEARCH_CANCELED: {
    one: "Búsqueda cancelada tras {n} registro.",
    other: "Búsqueda cancelada tras {n} registros.",
  },
  UI_EXPORT_UNKNOWN_SCOPE: "los que deje pasar el filtro",


  // ------------------------------------ T17: información del archivo y registro
  UI_CARD_LAST_UPDATE: "última grabación",
  UI_CARD_SIZE: "tamaño",
  UI_CARD_CODEPAGE: "codepage",

  UI_OPERATIONS_LOG: "Modificaciones",
  UI_LOG_EXPLAIN:
    "Lo que este programa modificó en sus archivos, día a día. Solo se registra " +
    "lo que creó, modificó o eliminó algo en disco — incluidos los rechazos. " +
    "Abrir, filtrar y navegar no dejan registro: no cambian nada.",
  UI_LOG_DAY: "Día",
  UI_LOG_SEARCH: "Buscar",
  UI_LOG_SEARCH_PH: "nombre de archivo, operación, expresión…",
  UI_LOG_TIME: "Hora",
  UI_LOG_OPERATION: "Operación",
  UI_LOG_RESULT: "Resultado",
  UI_LOG_ELAPSED: "Tiempo",
  UI_LOG_OK: "ok",
  UI_LOG_EMPTY: "No se modificó nada en este día.",
  UI_LOG_NOTHING_MATCHES: "Ninguna modificación coincide con la búsqueda.",
  UI_LOG_COUNT: { one: "{n} modificación", other: "{n} modificaciones" },
  UI_LOG_COUNT_TRUNCATED: "mostrando {n} de {total}",

  ERROR_LOG_DAY_NOT_FOUND: "No se modificó nada en {day}.",


  // ------------------------------------------- rótulos de tarea larga
  UI_JOB_SEARCHING: "Buscando…",
  UI_JOB_COUNTING: "Contando los registros del filtro…",
  UI_JOB_INDEXING: "Creando el índice {file}…",
  UI_JOB_EXPORTING: "Exportando {file}…",
  UI_JOB_COPYING: "Copiando a {file}…",
  UI_JOB_WORKING: "Trabajando…",

  UI_JOB_SIMULATING: "Simulando procesamiento…",


  // -------------------------------------- TA: prevuelo y copia de seguridad
  ERROR_BACKUP_READ_FAILED: "No se pudo leer '{file}' para copiarlo.",
  ERROR_BACKUP_WRITE_FAILED: "No se pudo grabar la copia '{file}'.",
  ERROR_BACKUP_MISSING: "La copia '{file}' nunca llegó a crearse.",
  ERROR_BACKUP_SIZE_MISMATCH:
    "La copia '{file}' salió con {got:size}, y el original tiene " +
    "{expected:size}. La copia de seguridad fue descartada.",
  ERROR_BACKUP_PRECHECK_FAILED:
    "Las comprobaciones de '{file}' no pasaron; no se copió nada.",
  ERROR_BACKUP_NEEDS_CONFIRM:
    "'{file}' ocupa {bytes:size}. Confirme para copiar.",
  WARN_CANCELED_BACKUP: "Copia de '{file}' cancelada. No quedó nada en el disco.",

  UI_JOB_BACKUP: "Copiando {file} a la copia de seguridad…",

  // Las comprobaciones, una frase por elemento de la lista.
  UI_CHECK_DISK_SPACE: "Espacio en disco",
  UI_CHECK_DISK_SPACE_OK: "{free:size} libres en {where}; la operación necesita {needed:size}",
  UI_CHECK_DISK_SPACE_BAD: "solo {free:size} libres en {where}, y la operación necesita {needed:size}",
  UI_CHECK_DISK_UNKNOWN: "Espacio en disco",
  UI_CHECK_DISK_UNKNOWN_MSG: "no se pudo medir el espacio libre en {path}",
  UI_CHECK_FILE_SET: "Archivos que se copiarán",
  UI_CHECK_FILE_SET_MSG: { one: "{n} archivo, {bytes:size}", other: "{n} archivos, {bytes:size}" },
  UI_CHECK_LARGE_FILE: "Archivo grande",
  UI_CHECK_LARGE_FILE_MSG: "{bytes:size} — por encima de {limit:size}, la copia va a tardar",
  UI_CHECK_NOT_EXCLUSIVE: "Modo de apertura",
  UI_CHECK_NOT_EXCLUSIVE_MSG:
    "'{file}' está abierto en modo compartido; la operación siguiente exigirá exclusivo",

  UI_PREFLIGHT: "Comprobaciones",
  UI_PREFLIGHT_EXPLAIN:
    "Antes de alterar el archivo, DBU comprueba lo que puede salir mal y hace " +
    "una copia. Nada se altera hasta que usted confirme.",
  UI_BACKUP_RUN: "Hacer la copia",
  UI_BACKUP_DONE: "Copia guardada en {dir}",
  UI_BACKUP_FILES: { one: "{n} archivo copiado", other: "{n} archivos copiados" },
  UI_CONFIRM_LARGE: "Entiendo que va a tardar, adelante",

  // El papel de cada archivo del conjunto.
  UI_ROLE_DATA: "datos",
  UI_ROLE_MEMO: "memo",
  UI_ROLE_INDEX: "índice",


  // ---------------------- restablecer el estado tras una operación exclusiva
  ERROR_REBIND_INDEX_FAILED:
    "El índice '{file}' no volvió a abrir: {reason}. Clave: {key}",
  ERROR_REBIND_ORDER_LOST:
    "El orden '{name}' ya no existe; el listado volvió al orden natural.",
  ERROR_REBIND_FILTER_FAILED:
    "El filtro no fue reaplicado: {reason} - {expr}",
  ERROR_OPERATION_FAILED:
    "La operación sobre '{file}' falló. El archivo no fue alterado.",
  WARN_REBIND_RECORD_GONE:
    "El registro en el que estaba ya no existe; volví al principio.",

  UI_SEE_FILES: "Ver los archivos",


  // ------------------------------------------ destino de la copia individual
  UI_CHECK_SOURCE_ROOM: "Espacio en la carpeta de origen",
  UI_CHECK_SOURCE_ROOM_MSG:
    "{free:size} libres en {where}; la operación creará un archivo temporal de {needed:size} allí",

  UI_BACKUP: "Copia",
  UI_BACKUP_TITLE: "Copiar este archivo a otro lugar, sin alterarlo",

  UI_SAVE_AS: "Guardar como",
  UI_CHECK_TARGET_EXISTS: "El destino ya existe",
  UI_CHECK_TARGET_EXISTS_MSG: "'{file}' ya está allí; elija otro nombre para no sobrescribirlo",
  UI_CHECK_TARGET_IS_SOURCE: "Destino no válido",
  UI_CHECK_TARGET_IS_SOURCE_MSG: "'{file}' es el propio archivo de origen",


  // ------------------------------------- R6: archivo perdido al cambiar de modo
  ERROR_HANDLE_DETACHED:
    "'{file}' se cerró para una operación y no se pudo volver a abrir. " +
    "Lo que está en pantalla es de antes; use Reconectar cuando el archivo esté libre.",
  ERROR_REOPEN_FAILED: "otro programa tiene el archivo",
  ERROR_CANNOT_LOCK_EXCLUSIVE:
    "No se pudo abrir '{file}' en modo exclusivo — otro programa lo está " +
    "usando. No se alteró nada.",
  ERROR_CANNOT_OPEN_SHARED:
    "No se pudo volver a abrir '{file}' en modo compartido. No se alteró nada.",
  ERROR_BACKUP_UNVERIFIABLE:
    "La copia '{file}' se creó, pero no se pudo medir para verificarla.",

  UI_DETACHED: "desconectado",
  UI_RECONNECT: "Reconectar",
  UI_DETACHED_HINT: "El archivo se cerró para una operación y no volvió.",
  UI_RECONNECTED: "'{file}' reconectado.",

  UI_CLOSE_TAB_SHORT: "Cerrar la pestaña",


  // ============================================ T14: PACK y ZAP
  UI_PACK: "Compactar",
  UI_PACK_TITLE: "Eliminar definitivamente los registros marcados para borrado",
  UI_ZAP: "Vaciar",
  UI_ZAP_TITLE: "Borrar TODOS los registros, manteniendo la estructura",

  UI_JOB_PACK: "Compactando {file}…",
  UI_JOB_ZAP: "Vaciando {file}…",

  UI_ZAP_WARN_TITLE: "¿Borrar todos los registros?",
  UI_ZAP_WARN:
    "Esto borra los {n} registros de '{file}'. La estructura de los campos se " +
    "mantiene, pero los datos no vuelven solos.",
  UI_PACK_WARN_TITLE: "¿Compactar el archivo?",
  UI_PACK_WARN:
    "Esto elimina definitivamente los registros marcados para borrado de " +
    "'{file}' y renumera los que quedan. Los números de registro cambian.",

  UI_ASK_BACKUP_TITLE: "¿Hacer una copia antes?",
  UI_ASK_BACKUP:
    "La copia queda en la misma carpeta, con la hora en el nombre, y se abre " +
    "en DBU como cualquier archivo — puede revisarla antes de borrarla.",
  UI_WITH_BACKUP: "Sí, copiar antes",
  UI_WITHOUT_BACKUP: "No, seguir sin copia",
  UI_GO_AHEAD: "Continuar",

  UI_ZAP_DONE: "'{file}' vaciado: {n} registros borrados.",
  UI_ZAP_DONE_BACKUP:
    "'{file}' vaciado: {n} registros borrados. La copia quedó en '{backup}'.",
  UI_PACK_DONE: { one: "'{file}' compactado: {n} registro eliminado.", other: "'{file}' compactado: {n} registros eliminados." },
  UI_PACK_DONE_BACKUP: "'{file}' compactado: {n} eliminados. La copia quedó en '{backup}'.",
  UI_NOTHING_TO_PACK: "'{file}' no tiene registros marcados; no se cambió nada.",

  ERROR_ZAP_CREATE_FAILED:
    "No se pudo crear el archivo vacío de '{file}': {reason}. El original fue restaurado y nada se perdió.",
  ERROR_ZAP_FAILED: "El ZAP de '{file}' falló: {reason}. El archivo no fue alterado.",
  ERROR_PACK_FAILED: "La compactación de '{file}' falló: {reason}. El archivo no fue alterado.",

  UI_DONE: "Listo",
  UI_ERROR: "No salió",
  UI_OK: "Entendido",


  // ============================================ T10: editor de estructura
  UI_EDIT_STRUCTURE: "Editar estructura",
  UI_ADD_FIELD: "Añadir campo al final",
  UI_INSERT_FIELD: "Insertar campo encima del seleccionado",
  UI_REMOVE_FIELD: "Marcar el campo para eliminación",
  UI_MOVE_UP: "Mover arriba",
  UI_MOVE_DOWN: "Mover abajo",
  UI_APPLY: "Aplicar",
  UI_DISCARD: "Descartar",
  UI_DISCARD_TITLE: "¿Descartar los cambios?",
  UI_DISCARD_ASK: "Los cambios que hizo en la estructura se perderán. El archivo no fue tocado.",

  UI_ROW_NOVO: "campo nuevo",
  UI_ROW_MUDOU: "campo modificado",
  UI_ROW_SUMIU: "campo marcado para eliminación",

  UI_STRUCT_SUMMARY: { one: "{n} campo · {bytes} bytes por registro", other: "{n} campos · {bytes} bytes por registro" },
  UI_STRUCT_ERRORS: { one: "{n} campo con problema", other: "{n} campos con problemas" },

  UI_IMPACT: "Qué pasa con los datos",
  UI_IMPACT_REMOVED: "'{field}' se elimina — los datos de esa columna se pierden.",
  UI_IMPACT_ADDED: "'{field}' se crea, vacío en todos los registros.",
  UI_IMPACT_TYPE: "'{field}' cambia de {from} a {to} — los valores que no conviertan se pierden.",
  UI_IMPACT_SHRUNK: "'{field}' se reduce de {from} a {to} — los valores más largos se truncan.",
  UI_IMPACT_RENAMED: "'{from}' pasa a llamarse '{to}' — los datos se mantienen.",
  UI_IMPACT_REORDERED: "El orden de los campos cambia. Índices y expresiones que dependen de la posición deben revisarse.",

  ERROR_FIELD_NAME_EMPTY: "el nombre no puede quedar vacío",
  ERROR_FIELD_NAME_BAD: "solo letras, números y _, empezando por letra",
  ERROR_FIELD_NAME_LONG: "10 caracteres como máximo",
  ERROR_FIELD_NAME_DUP: "ya existe un campo con ese nombre",
  ERROR_FIELD_TYPE_BAD: "tipo no válido",
  ERROR_FIELD_LEN_C: "texto: de 1 a 1024",
  ERROR_FIELD_LEN_N: "número: de 1 a 19",
  ERROR_FIELD_LEN_MEMO: "memo siempre es 10",
  ERROR_FIELD_LEN_DATE: "fecha siempre es 8",
  ERROR_FIELD_LEN_LOGIC: "lógico siempre es 1",
  ERROR_FIELD_DEC: "demasiados decimales para esa longitud",


  UI_RESTORE_FIELD: "Traer '{field}' de vuelta",
  UI_IMPACT_UNDO: "Para traer '{field}' de vuelta, haga clic en el ↺ de su fila.",

  UI_ADD_SHORT: "Campo",
  UI_INSERT_SHORT: "Insertar",
  UI_REMOVE_SHORT: "Eliminar",
  UI_RESTORE_SHORT: "Restaurar",
  UI_UP_SHORT: "Subir",
  UI_DOWN_SHORT: "Bajar",

  UI_FIELD_WILL_GO: "Este campo será eliminado",

  UI_APPLY_BLOCKED: { one: "Corrija el campo con problema para poder aplicar", other: "Corrija los {n} campos con problemas para poder aplicar" },
  UI_APPLY_NOTHING: "Todavía no se cambió nada",

  UI_FIELD_AT: "campo {n}",


  // ---------------------------------------------- T10: crear archivo nuevo
  UI_NEW_FILE: "Crear archivo",
  UI_NEW_FILE_EXPLAIN:
    "El archivo nace vacío, con la estructura que usted armó. No se crea " +
    "ningún registro.",
  UI_NEW_DBF: "Crear un archivo aquí…",
  UI_CREATE: "Crear",
  UI_NEW_SUMMARY: { one: "{n} campo · {bytes} bytes por registro", other: "{n} campos · {bytes} bytes por registro" },
  UI_CREATED: "'{file}' creado con {n} campos.",
  UI_OVERWRITE_TITLE: "El archivo ya existe",
  UI_OVERWRITE_ASK:
    "Ya existe '{file}' en esa carpeta. Sustituirlo borra lo que está allí, " +
    "incluidos los registros.",
  UI_OVERWRITE: "Sustituir",
  UI_NEW_UNTITLED: "SEM_NOME",

  ERROR_CREATE_FAILED: "No se pudo crear '{file}'. {reason}",
  ERROR_FIELD_BAD: "El campo {n} vino mal formado.",
  ERROR_RECORD_TOO_BIG:
    "El registro quedaría con {bytes} bytes, y el formato DBF solo guarda " +
    "hasta {max}. Reduzca el tamaño de algún campo.",

  ERROR_FILE_IS_OPEN:
    "'{file}' está abierto en la pestaña {alias}. Cierre la pestaña antes de sustituirlo.",


  // ------------------------------------------ T10: cambiar la estructura
  UI_JOB_RESTRUCT: "Reescribiendo {file} con la estructura nueva…",
  WARN_CANCELED_RESTRUCT:
    "Cambio cancelado. El archivo original no fue tocado.",


  UI_MODIFY_TITLE: "Cambiar la estructura",
  UI_MODIFY_ASK: {
    one: "'{file}' tiene {n} registro. Será reescrito con la estructura nueva.",
    other: "'{file}' tiene {n} registros. Serán reescritos con la estructura nueva.",
  },
  UI_MODIFY_OK: {
    one: "'{file}' ahora tiene {n} registro.",
    other: "'{file}' ahora tiene {n} registros.",
  },
  UI_MODIFY_FIELDS: { one: "Tiene {n} campo.", other: "Tiene {n} campos." },
  WARN_INDEXES_DROPPED: {
    one: "{n} índice fue cerrado y debe reconstruirse:",
    other: "{n} índices fueron cerrados y deben reconstruirse:",
  },
  UI_MODIFY_BACKUP: "Se guardó una copia en '{file}'.",
  UI_MODIFY_LOST: {
    one: "{n} valor no cupo en el tipo nuevo y quedó vacío.",
    other: "{n} valores no cupieron en el tipo nuevo y quedaron vacíos.",
  },

  UI_STRUCT_EMPTY: "La estructura quedó sin campos",

  UI_STRUCT_EMPTY_HINT: "Recupere un campo con ↺, o agregue uno nuevo.",

  ERROR_NO_FIELDS: "Un archivo necesita al menos un campo.",

  UI_RELOAD_TITLE: "¿Recargar la pantalla?",
  UI_RELOAD_ASK: "La estructura que usted armó todavía no fue aplicada, y recargar descarta lo que está aquí.",
  UI_RELOAD_DISCARD: "Descartar y recargar",
  UI_KEEP_EDITING: "Seguir editando",


  // ============================================ T13: operaciones masivas
  UI_JOB_REPLACE: "Reemplazando en {file}…",
  UI_JOB_DELETING: "Marcando registros en {file}…",
  UI_JOB_RECALLING: "Recuperando registros en {file}…",
  UI_JOB_APPENDING: "Agregando registros a {file}…",

  WARN_CANCELED_BULK: {
    one: "Interrumpido. {n} registro ya había sido modificado y así quedó — cancelar detiene la operación, no deshace lo que ya grabó.",
    other: "Interrumpido. {n} registros ya habían sido modificados y así quedaron — cancelar detiene la operación, no deshace lo que ya grabó.",
  },

  ERROR_SCOPE_MODE: "El alcance '{mode}' no existe.",
  ERROR_SCOPE_COUNT: "Indique cuántos registros.",
  ERROR_FOR_INVALID: "El FOR no pudo entenderse: {detail}",
  ERROR_FOR_NOT_LOGICAL: "El FOR debe dar verdadero o falso; este da {type}.",
  ERROR_WHILE_INVALID: "El WHILE no pudo entenderse: {detail}",
  ERROR_WHILE_NOT_LOGICAL: "El WHILE debe dar verdadero o falso; este da {type}.",

  ERROR_NO_FIELD_PICKED: "Elija el campo a reemplazar.",
  ERROR_NO_VALUE: "Indique con qué reemplazar.",
  ERROR_WITH_INVALID: "La expresión no pudo entenderse: {detail}",
  ERROR_TYPE_MISMATCH:
    "'{field}' es {fieldType} y la expresión da {exprType} — los dos tipos deben coincidir.",

  ERROR_NO_SOURCE: "Elija el archivo de origen.",
  ERROR_SOURCE_NOT_FOUND: "No se encontró '{file}'.",
  ERROR_CANNOT_OPEN_SOURCE: "No se pudo abrir '{file}': {reason}",
  ERROR_FORMAT_UNKNOWN: "El formato de origen '{format}' no existe.",
  ERROR_FORMAT_UNAVAILABLE: "Esta versión no lee archivos {format}.",
  ERROR_APPEND_FAILED: "No se pudo agregar el registro.",
  ERROR_APPEND_TEXT_FAILED: "'{file}' no pudo leerse como {format}: {reason}",
  ERROR_CANNOT_LOCK_FILE:
    "'{file}' está siendo usado por otra persona. Las operaciones masivas necesitan el archivo solo para usted.",

  UI_EDIT_STRUCTURE_OF: "Estructura de {file}",
  UI_DISCARD_TITLE: "¿Descartar los cambios?",
  UI_DISCARD_ASK: "La estructura que usted armó todavía no fue aplicada y se perderá.",


  // =================================================== T13: operaciones masivas
  UI_MASS: "En masa",
  UI_MASS_TITLE: "Reemplazar, borrar, recuperar o agregar registros de otro archivo",
  UI_MASS_ON: "En masa · {file}",

  UI_MASS_REPLACE: "Reemplazar",
  UI_MASS_DELETE: "Borrar",
  UI_MASS_RECALL: "Recuperar",
  UI_MASS_APPEND: "Agregar de",

  UI_MASS_EXPLAIN_REPLACE:
    "Graba el resultado de la expresión en el campo elegido, en cada registro del alcance.",
  UI_MASS_EXPLAIN_DELETE:
    "Marca como borrados los registros del alcance. Siguen en el archivo y vuelven con Recuperar; los elimina de verdad el Compactar.",
  UI_MASS_EXPLAIN_RECALL:
    "Quita la marca de borrado de los registros del alcance.",
  UI_MASS_EXPLAIN_APPENDFROM:
    "Agrega al final de este archivo los registros del archivo de origen. Los campos se emparejan por NOMBRE; lo que falte de un lado queda fuera o nace vacío.",

  UI_MASS_FIELD: "Campo",
  UI_MASS_WITH: "Reemplazar {field} con",
  UI_MASS_WITH_HINT: "expresión — ej.: CLI_LIMC * 1.1",
  UI_MASS_SOURCE: "Archivo de origen",
  UI_MASS_PICK_SOURCE: "Elegir el archivo de origen",
  UI_MASS_FORMAT: "Formato",
  UI_FMT_DBF: "DBF (otro archivo del mismo tipo)",
  UI_FMT_SDF: "Texto de ancho fijo (SDF)",
  UI_FMT_DELIM: "Texto delimitado",
  UI_MASS_TEXT_NOTE:
    "Los archivos de texto los lee el motor de Harbour, que no informa progreso: la barra no avanza y no hay cómo interrumpir. En DBF hay progreso y cancelación.",

  UI_MASS_SCOPE: "Alcance",
  UI_MASS_RECORDS: "Registros",
  UI_SCOPE_ALL_REC: "Todo",
  UI_SCOPE_NEXT: "Próximos…",
  UI_SCOPE_NEXT_N: { one: "próximo {n} registro", other: "próximos {n} registros" },
  UI_SCOPE_REST: "Del registro actual hasta el final",
  UI_MASS_FOR_HINT: "solo los registros donde… (opcional)",
  UI_MASS_WHILE_HINT: "mientras… — se detiene en el primero que no coincida (opcional)",

  UI_MASS_RULE_WHILE:
    "WHILE tiene precedencia sobre FOR: el WHILE SE DETIENE en el primer registro que no coincide; el FOR solo lo SALTA y sigue hasta el final.",
  UI_MASS_RULE_TOP:
    "Todo empieza desde arriba. Próximos y hasta-el-final empiezan en el registro donde está el cursor ahora.",
  UI_MASS_RULE_FILTER:
    "El filtro activo CUENTA aquí: la operación solo alcanza lo que él deja pasar ({expr}).",
  UI_MASS_RULE_NOFILTER:
    "No hay filtro activo — la operación alcanza el archivo entero dentro del alcance.",

  UI_MASS_CONFIRM_REPLACE: "El campo {field} será reescrito en {file}. No hay cómo deshacer.",
  UI_MASS_CONFIRM_DELETE: "Los registros serán marcados como borrados en {file}.",
  UI_MASS_CONFIRM_RECALL: "La marca de borrado será quitada en {file}.",
  UI_MASS_CONFIRM_APPENDFROM: "Los registros de {source} serán agregados a {file}.",
  UI_MASS_CONFIRM_SCOPE: "Alcance: {scope}.",

  UI_MASS_DONE_REPLACE: { one: "{n} registro modificado, de {seen} examinados.", other: "{n} registros modificados, de {seen} examinados." },
  UI_MASS_DONE_DELETE: { one: "{n} registro marcado, de {seen} examinados.", other: "{n} registros marcados, de {seen} examinados." },
  UI_MASS_DONE_RECALL: { one: "{n} registro recuperado, de {seen} examinados.", other: "{n} registros recuperados, de {seen} examinados." },
  UI_MASS_DONE_APPEND: { one: "{n} registro vino de {file}. El archivo tiene ahora {total}.", other: "{n} registros vinieron de {file}. El archivo tiene ahora {total}." },

  UI_MASS_FROM_RECORD: "a partir del registro {n}",
  UI_MASS_FROM_NONE: "Ningún registro elegido — haga clic en una fila de la grilla.",

  UI_CURRENT_RECORD: "reg. {n} de {total}",
  UI_CURRENT_RECORD_HINT: "Registro actual — de aquí parten \"próximos n\" y \"hasta el final\".",
  UI_CURRENT_RECORD_AWAY: "Registro actual, fuera de la página visible. Haga clic para volver a él.",

};
