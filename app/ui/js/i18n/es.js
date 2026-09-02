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

  UI_PAGE_RANGE: "{first}–{last} de {total}",
  UI_PAGE_RANGE_EMPTY: "0 de {total}",
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

};
