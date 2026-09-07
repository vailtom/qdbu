// English — also the fallback language.
//
// When a key is missing from the language in use, i18n.js looks here before
// giving up and printing the key. That makes this the one dictionary that must
// stay complete: a gap here is a gap the user actually sees.
//
// REGISTER: the vocabulary a DBA already owns, not plain conversational
// English. The canonical xBase terms are used on purpose and are not to be
// "simplified" —
//
//     controlling order   the index driving the row order (not "sorting")
//     natural order       no index; rows in record-number order
//     SEEK / LOCATE       key lookup vs. sequential scan — different costs
//     soft seek           lands on the nearest key when there is no exact hit
//     Character/Numeric/Date/Logical/Memo   the dBASE field types, as the
//                         structure listing spells them
//
// Someone opening a DBF utility knows these words; translating them into
// everyday phrasing makes the message longer AND less precise.
//
// Mirrors pt-BR.js key by key. See the conventions documented there.

(window.I18N || (window.I18N = {}))["en"] = {

  UI_LANGUAGE: "Language",
  UI_THEME: "Theme",
  UI_THEME_CLARO: "Light",
  UI_THEME_GRAFITE: "Graphite",
  UI_THEME_MARINHO: "Navy",
  UI_THEME_MAGENTA: "Magenta",
  UI_THEME_VINHO: "Wine",
  UI_THEME_VERDE: "Green",
  UI_THEME_OLIVA: "Olive",
  UI_THEME_OURO: "Gold",
  UI_THEME_CAFE: "Coffee",
  UI_THEME_TERRACOTA: "Terracotta",
  UI_THEME_AMEIXA: "Plum",
  UI_THEME_INDIGO: "Indigo",

  UI_SUBTITLE: "Database Utility",
  UI_NEW_CONNECTION: "+ Connection",
  UI_SEARCH_PLACEHOLDER: "Search connection or file…",
  UI_CONNECTIONS: "Connections",
  UI_PANEL_WIDTH: "Panel width",
  UI_DRAG_RESIZE: "Drag to resize (double click restores the default)",
  UI_NO_FILE_OPEN: "No file open",
  UI_EMPTY_HINT:
    "Register a connection — a folder holding DBF files — then double click " +
    "a file on the left.",

  UI_FILE_VIEW: "File view",
  UI_VIEW_STRUCTURE: "Structure",
  UI_VIEW_DATA: "Data",
  UI_COLUMNS: "Columns",
  UI_COLUMNS_TITLE: "Choose visible columns",
  UI_INDEXES: "Indexes",
  UI_INDEXES_TITLE: "NTX indexes and controlling order",
  UI_FILTER: "Filter",
  UI_FILTER_TITLE: "Filter records",
  UI_EXPORT: "Export",
  UI_EXPORT_TITLE: "Export to CSV, JSON or Excel",

  UI_MODE_GUIDED: "Guided",
  UI_MODE_EXPR: "Expression",
  UI_ADD_CONDITION: "+ condition",
  UI_PARTIAL_SUGGESTIONS: "partial suggestions",
  UI_PARTIAL_SUGGESTIONS_TITLE:
    "The list holds only values sampled from the start of the file",
  UI_FILTER_PLACEHOLDER: "CLI_EST == 'SP' .AND. !Empty(CLI_CGC)",
  UI_CHECK: "Check",
  UI_CHECK_TITLE: "Compile without applying",
  UI_APPLY: "Apply",
  UI_CLEAR: "Clear",
  UI_COUNT: "Count",
  UI_COUNT_TITLE: "Count records matching the filter",
  UI_CLOSE: "Close",

  UI_OP_EQ: "equals",
  UI_OP_NE: "not equal to",
  UI_OP_CONTAINS: "contains",
  UI_OP_STARTS: "starts with",
  UI_OP_GT: "greater than",
  UI_OP_LT: "less than",
  UI_OP_GE: "greater or equal",
  UI_OP_LE: "less or equal",
  UI_OP_EMPTY: "is empty",
  UI_OP_NOT_EMPTY: "is not empty",
  UI_USE_CONDITION: "use this condition",
  UI_ADD_CONDITION_BELOW: "add a condition below",
  UI_PRECEDENCE_HINT:
    ".AND. binds tighter than .OR.: the parentheses show the grouping " +
    "actually in effect.",
  UI_EXPR_TO_APPLY: "expression that will be applied",

  UI_VISIBLE_COLUMNS: "Visible columns",
  UI_ALL_F: "All",
  UI_NONE_F: "None",
  UI_INVERT: "Invert",
  UI_COLUMN_JUMP_HINT: "→ scrolls the grid to the column.",
  UI_FIND_COLUMN: "Find column…",

  UI_CLOSE_ALL: "Close all",
  UI_CLOSE_ALL_INDEXES: "Close every index",
  UI_CREATE_ELLIPSIS: "Create…",
  UI_CREATE_INDEX_TITLE: "Create an NTX index",
  UI_KEY: "Key",
  UI_FILE: "File",
  UI_ONLY_RECORDS_THAT: "FOR condition",
  UI_OPTIONAL: "(optional)",
  UI_UNIQUE_KEYS: "unique keys",
  UI_CREATE: "Create",
  UI_CANCEL: "Cancel",
  UI_IN_FOLDER: "In the folder",
  UI_FILTER_INDEX: "Filter index…",

  UI_FIRST_PAGE: "First page (Ctrl+Home)",
  UI_PREV_PAGE: "Previous page (PgUp)",
  UI_NEXT_PAGE: "Next page (PgDn)",
  UI_LAST_PAGE: "Last page (Ctrl+End)",
  UI_GOTO: "go to",
  UI_RECORD: "record",
  UI_SEARCH: "search",
  UI_NEXT_MATCH: "Next match (F3)",
  UI_ORDER: "order",
  UI_ORDER_PHYSICAL: "Natural",
  UI_ORDER_TITLE: "Controlling index for the row order",
  UI_ROWS_PER_PAGE: "rows/page",
  UI_GRID_SETTINGS: "Grid settings",
  UI_GRID_SETTINGS_TITLE: "Rows per page and display of deleted records",
  UI_ROWS_N: "{n} rows",
  UI_SHOW_DELETED_GLOBAL: "Applies to every tab: showing deleted records is a session-wide setting, not a per-file one.",
  UI_LAST_READ: "Last read — the screen refreshes by itself every 5 s while nothing is being edited",
  UI_RELOAD: "Reload from disk (F5)",

  UI_FIELD: "Field",
  UI_TYPE: "Type",
  UI_SIZE: "Width",
  UI_DEC: "Dec.",

  // The dBASE field types, spelled as a structure listing spells them.
  UI_TYPE_C: "Text",
  UI_TYPE_N: "Number",
  UI_TYPE_D: "Date",
  UI_TYPE_L: "Logical",
  UI_TYPE_M: "Long text",
  UI_TYPE_A: "Array",
  UI_TYPE_B: "Code block",
  UI_TYPE_U: "NIL",

  UI_STOP: "Stop",
  UI_CHECKING: "checking…",
  UI_LOG: "log:",

  UI_EXPORT_TO: "Export",
  UI_FORMAT: "Format",
  UI_FMT_CSV: "CSV",
  UI_FMT_JSON: "JSON",
  UI_FMT_XLSX: "Excel (.xlsx)",
  UI_FMT_DBF: "DBF (another table)",
  UI_CHOOSE_WHERE_SAVE: "Choose where to save…",
  UI_CSV_OPTIONS: "CSV options",
  UI_XLSX_OPTIONS: "Worksheet options",
  UI_DBF_OPTIONS: "About the DBF produced",
  UI_SEPARATOR: "Delimiter",
  UI_SEP_SEMICOLON: "Semicolon (Excel, comma-decimal locales)",
  UI_SEP_COMMA: "Comma",
  UI_SEP_TAB: "Tab",
  UI_ENCODING: "Encoding",
  UI_ENC_ANSI: "ANSI (legacy systems)",
  UI_ENC_CP850: "CP850 (DOS)",
  UI_HEADER: "Header row",
  UI_HEADER_FIRST_LINE: "On the first line",
  UI_HEADER_NONE: "Omit",
  UI_DBF_NOTE:
    "The selected fields become the structure of the new table, keeping their " +
    "original types. The controlling order and the active filter apply: the " +
    "table is written already ordered and holding only matching records.",
  UI_SHEET_NAME: "Worksheet name",
  UI_SHEET_DEFAULT: "Data",
  UI_RECORDS: "Records",
  UI_ONLY_GRID: "Only those in the grid",
  UI_FILTER_BY_NAME: "filter by name…",
  UI_PREVIEW: "Preview",
  UI_REFRESH: "Refresh",
  UI_SKIP_DELETED: "Skip records marked for deletion",
  UI_TIMESTAMP_NAME: "Timestamp in the file name",
  UI_SCOPE_FILTERED: "Matching the active filter",
  UI_SCOPE_ALL: "All records, ignoring the filter",
  UI_FILTER_IN_FORCE: "Active filter:",
  UI_EMPTY_FILE_PREVIEW: "(empty file)",
  UI_ACT_ON_FILTERED: "act on the {n} listed",
  UI_WILL_EXPORT: { one: "{n} record will be exported", other: "{n} records will be exported" },

  UI_SAVE_DIALOG_TITLE: "Export to",
  UI_FT_CSV: "Delimited text (*.csv)",
  UI_FT_JSON: "JSON (*.json)",
  UI_FT_XLSX: "Excel worksheet (*.xlsx)",
  UI_FT_DBF: "dBASE table (*.dbf)",
  UI_FT_ALL: "All files",

  UI_NEW_CONNECTION_TITLE: "New connection",
  UI_CONNECTION_EXPLAIN:
    "A connection is a folder holding DBF files — typically one client's data folder.",
  UI_FOLDER: "Folder",
  UI_NAME: "Name",
  UI_NAME_OPTIONAL: "(optional — the folder name is used)",
  UI_PH_CONNECTION_NAME: "Client A",
  UI_ADD: "Add",

  // ------------------------------------------------------------ DLL refusals

  ERROR_UNSPECIFIED: "Unidentified error.",
  ERROR_BAD_ENVELOPE: "The request did not arrive as valid JSON.",
  ERROR_UNKNOWN_METHOD: "No such method: '{method}'.",

  ERROR_PARAM_REQUIRED: "This field is required.",
  ERROR_PARAM_REQUIRED_path: "File path is required.",
  ERROR_PARAM_REQUIRED_dir: "Connection folder is required.",
  ERROR_PARAM_REQUIRED_name: "Connection name is required.",
  ERROR_PARAM_REQUIRED_key: "Key expression is required.",
  ERROR_PARAM_REQUIRED_expr: "Condition is required.",
  ERROR_PARAM_REQUIRED_value: "Search value is required.",
  ERROR_PARAM_REQUIRED_method: "The request did not name a method.",
  ERROR_PARAM_REQUIRED_h: "An open file or a path is required.",
  ERROR_PARAM_REQUIRED_state: "Session state missing.",
  ERROR_PARAM_REQUIRED_fields: "At least one field is required.",

  ERROR_PARAM_OUT_OF_RANGE: "{value} is outside the range {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_recno: "Record {value} is out of range; valid: {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_anchor: "Anchor {value} is out of range; valid: {min}..{max}.",
  ERROR_PARAM_OUT_OF_RANGE_order:
    "Order {value} is out of range; valid: {min}..{max} (0 = natural order).",

  ERROR_PARAM_TOO_SMALL: "The minimum is {min}.",
  ERROR_PARAM_TOO_SMALL_count: "Count must be at least {min}.",
  ERROR_PARAM_TOO_BIG: "The maximum is {max}.",
  ERROR_PARAM_TOO_BIG_count: "Count {value} exceeds the page ceiling of {max} records.",
  ERROR_PARAM_MUST_BE_LIST: "This field expects a list of names.",
  ERROR_BAD_DATE: "'{value}' is not a date; use YYYY-MM-DD or DD/MM/YYYY.",
  ERROR_BAD_ANCHOR: "The anchor must be top, bottom, or a record number.",

  ERROR_INVALID_HANDLE: "File '{handle}' is not open.",
  ERROR_HANDLE_CLOSED: "This file was closed in {closedIn}.",

  ERROR_CONNECTION_EXISTS: "A connection named '{name}' already exists.",
  ERROR_CONNECTION_NOT_FOUND: "No connection named '{name}'.",
  ERROR_DIR_NOT_FOUND: "Folder '{dir}' does not exist.",

  ERROR_FILE_NOT_FOUND: "File '{file}' does not exist.",
  ERROR_FILE_EXISTS: "'{file}' already exists; select replace to overwrite.",
  ERROR_FILE_ALREADY_OPEN: "'{file}' is already open in this session.",
  ERROR_NOT_A_DBF: "'{file}' is not a valid DBF[[: {reason}]].",
  ERROR_MEMO_FILE_MISSING:
    "'{file}' has a memo field, but the {memo} file is not alongside it.",
  ERROR_OPEN_FAILED: "Could not open '{file}'[[: {reason}]].",

  ERROR_FIELD_NOT_FOUND: "Field '{field}' does not exist in {alias}.",
  ERROR_NO_COLUMNS: "No column selected.",

  ERROR_EXPR_INVALID: "The expression does not compile: {detail}.",
  ERROR_EXPR_NOT_LOGICAL:
    "The condition must evaluate to Logical; this one returns {type}.",
  ERROR_EXPR_NOT_LOGICAL_for:
    "The FOR condition must evaluate to Logical; this one returns {type}.",

  ERROR_NOT_AN_INDEX: "'{file}' is not an NTX index[[: {reason}]].",
  ERROR_INDEX_ALREADY_OPEN: "'{file}' is already open on this file.",
  ERROR_INDEX_NOT_OPEN: "'{file}' is not open on this file.",
  ERROR_INDEX_OPEN_FAILED: "Could not open '{file}'[[: {detail}]].",
  ERROR_INDEX_UNKNOWN_FUNCTION:
    "'{file}' calls {func}, which this build does not link — key: {key}.",
  ERROR_INDEX_FIELD_NOT_IN_FILE:
    "'{file}' references {field}, absent from {alias}; the index most likely " +
    "belongs to another table — key: {key}.",
  ERROR_INDEX_REJECTED_BY_RDD: "'{file}' was rejected by the RDD.",
  ERROR_INDEX_OPEN_ON_CREATE: "'{file}' is open; close it before rebuilding.",
  ERROR_INDEX_KEY_BAD_TYPE:
    "The key returns {type}; an NTX index accepts Character, Numeric or Date.",
  ERROR_INDEX_CREATE_FAILED: "Could not create '{file}'[[: {reason}]].",
  ERROR_NO_ACTIVE_ORDER:
    "SEEK requires a controlling order; with none, use LOCATE, which scans " +
    "the file sequentially.",
  ERROR_SEEK_BAD_KEY_TYPE: "The index key is {type}; SEEK cannot search it.",

  ERROR_EXPORT_FAILED: "Could not create '{file}'[[: {reason}]].",
  ERROR_EXPORT_OPEN_FAILED:
    "'{file}' was created but could not be opened for writing[[: {reason}]].",
  ERROR_SAME_FILE: "The destination is the source table; choose another name.",

  WARN_CANCELED_PARTIAL_FILE: {
    one: "Canceled after {n} record; '{file}' was deleted as incomplete.",
    other: "Canceled after {n} records; '{file}' was deleted as incomplete.",
  },
  WARN_CANCELED_INDEX: "Creation canceled; '{file}' was deleted as incomplete.",

  // ------------------------------------------------------------ the app talking

  INFO_CONNECTION_ADDED: "Connection '{name}' added.",
  INFO_CONNECTION_REMOVED: "Connection '{name}' removed.",
  UI_NO_CONNECTIONS: "No connections registered.",
  UI_NOTHING_MATCHES: "Nothing matches the search.",
  UI_NO_MATCH_SEARCH: "No file matches the search.",
  UI_NO_DBF_HERE: "No DBF in this folder.",
  UI_READING_FOLDER: "reading the folder…",
  UI_OPENING: "opening {file}…",
  UI_LOADING: "reading…",
  UI_STOPPING: "stopping…",
  UI_FOLDER_UNREADABLE: "Could not read the folder.",
  UI_FOLDER_NOT_FOUND: "Folder not found.",
  UI_CONNECTION_ACTIONS: "Actions for the connection {name}",
  UI_MENU_OPEN_FOLDER: "Open in Explorer",
  UI_MENU_RELOAD: "Refresh the file list",
  UI_MENU_REMOVE: "Remove the connection",
  ERROR_OPEN_FOLDER_FAILED: "Could not open the folder: {detail}.",
  UI_NOT_A_DBF_SHORT: "NOT A DBF: {reason}.",
  UI_DOUBLE_CLICK_TO_OPEN: "double click to open",
  UI_FILES_COUNT: { one: "{n} file", other: "{n} files" },

  UI_ALREADY_OPEN_SHORT: "Already open.",
  UI_CLOSE_TAB: "Close {alias}",
  UI_TAB_SUMMARY: "{records} records, {fields} fields",
  UI_EMPTY_FILE: "Table has no records.",
  UI_EMPTY_PAGE: "No rows on this page.",
  UI_EMPTY_FILTERED: "No record on this page matches the active filter.",
  UI_DELETED_RECORD: "Record marked for deletion.",
  UI_HAS_NUL_BYTE: "Contains a NUL byte.",
  UI_LAST_READ_AT: "last read: {time}",
  UI_GO_TO_COLUMN: "scroll to {name} in the grid",
  UI_DRAW_FAILED: "Failed to render {what}.",
  UI_INTERNAL_ERROR: "Internal error: {detail}.",
  UI_UNHANDLED_REJECTION: "Unhandled promise rejection.",

  ERROR_NO_COLUMN_MATCHES: "No column matches the search.",
  ERROR_NEED_ONE_VISIBLE: "At least one column must remain visible.",
  ERROR_INVERT_WOULD_EMPTY: "Inverting would leave the grid with no columns.",
  ERROR_NO_COLUMN_NAMED: "No column by that name.",
  ERROR_PICK_ONE_COLUMN: "Select at least one column.",

  INFO_INDEX_OPENED: "Index opened — order {order}: {key}.",
  INFO_INDEXES_CLOSED: "Indexes closed — natural order.",
  INFO_INDEX_CREATED: "Index created — order {order}: {key}.",
  INFO_INDEX_REBUILT: "Index rebuilt — order {order}: {key}.",
  UI_PHYSICAL_ORDER: "Natural order (by record number).",
  UI_ORDERED_BY: "Ordered by {key}.",
  UI_NO_INDEX_OPEN: "No index open — open one in Indexes.",
  UI_NONE_OPEN: "none open",
  UI_N_OPEN: { one: "{n} open", other: "{n} open" },
  UI_CLOSE_INDEX: "close {file}",
  UI_NOTHING_ELSE_MATCHES: "Nothing else matches this file.",
  UI_ALREADY_ORDERED_BY: "Already ordered by {name}.",
  UI_INDEX_AVAILABLE_FOR: "An index on {name} exists ({file}) — open it in Indexes.",
  UI_NO_INDEX_FOR: "No index on {name} — a DBF orders only by index.",
  ERROR_INDEX_NOT_CREATED: "It was not created.",
  UI_CONFIRM_OVERWRITE: "{file} already exists.\n\nOverwrite?",
  ERROR_TELL_FILE_NAME: "File name is required.",
  ERROR_TELL_KEY: "Key expression is required.",
  INFO_KEY_OK: "Key valid — {type}.",
  UI_EVALUATED_FIRST_RECORD: "evaluated on the first record",

  INFO_FILTER_APPLIED:
    "Applied. .AND. binds tighter than .OR. — check the grouping in the preview.",
  INFO_FILTER_ACTIVE: "Filter applied: {expr}.",
  INFO_EXPR_OK: "{expr} → ok",
  ERROR_EXPR_RETURNS: "{expr} → returns {type}; it must be Logical.",
  UI_EXPR_RESULT: "{expr} → {value}",
  ERROR_TELL_VALUE: "Value is required.",
  INFO_COUNT_RESULT: {
    one: "{n} of {total} record matches.",
    other: "{n} of {total} records match.",
  },
  WARN_COUNT_STOPPED: "Count interrupted at {n} — the total is still unknown.",

  UI_SEEK_BY_INDEX: "seek {key}",
  UI_SEEK_BY_INDEX_TITLE: "SEEK on {key}: jumps on every keystroke",
  UI_SCAN_SEARCH: "search (Enter)",
  UI_SCAN_SEARCH_TITLE: "No controlling order: sequential scan, on Enter only",
  ERROR_NOTHING_FROM: "No key at or after {value}.",
  INFO_APPROXIMATE: "Soft seek — nearest key {value}.",
  ERROR_NO_TEXT_COLUMN: "No visible Character column to scan.",
  ERROR_NOT_FOUND: "Not found: {value}.",

  INFO_EXPORT_DONE: {
    one: "\u2713 {n} record exported successfully at {time} — {file} ({size}).",
    other: "\u2713 {n} records exported successfully at {time} — {file} ({size}).",
  },
  INFO_EXPORT_SKIPPED: {
    one: "{n} record marked for deletion was left out.",
    other: "{n} records marked for deletion were left out.",
  },
  INFO_EXPORTED_TO: "Exported: {file}.",
  UI_EXPORTING: "exporting…",
  UI_GENERATING: "generating…",
  ERROR_DIALOG_UNAVAILABLE: "System dialog unavailable — type the path.",
  ERROR_DIALOG_FAILED: "Could not open the dialog: {detail}.",

  ERROR_SESSION_SAVE_FAILED: "Could not save the session: {detail}.",
  WARN_SESSION_FILE_SKIPPED: "Did not reopen: {files}.",
  WARN_FILTER_NOT_REAPPLIED: "Filter not reapplied — {detail}.",
  INFO_SESSION_RESTORED: {
    one: "Previous session restored — {n} file.",
    other: "Previous session restored — {n} files.",
  },

  INFO_DLL_LOADED: "DLL loaded",
  ERROR_DLL_NOT_LOADED: "DLL not loaded",
  UI_CDP_PORT: "CDP :{port}",
  UI_CDP_OFF: "CDP off",

  // ------------------------------------ surfaced while converting app.js

  UI_CARD_RECORDS: "records",
  UI_CARD_FIELDS: "fields",
  UI_CARD_RECSIZE: "bytes/record",
  UI_CARD_MODE: "mode",
  UI_CARD_MEMO: "memo",
  UI_YES: "yes",
  UI_MODE_SHARED: "shared",
  UI_MODE_EXCLUSIVE: "exclusive",

  // Guided filter -- these are LABELS; the stored value stays "E"/"OU".
  UI_JOIN_AND: "AND",
  UI_JOIN_OR: "OR",
  UI_WHERE: "where",
  UI_REMOVE: "remove",
  UI_VALUE: "value",
  UI_VALUE_TITLE:
    "The value follows the field type. To evaluate it instead of comparing it " +
    "as a literal, turn on the fx button beside it.",
  UI_VALUE_EXPR: "expression",
  UI_CALC_OFF: "fx — the value is compared as a literal; click to evaluate it",
  UI_CALC_ON: "fx on — the value is evaluated (e.g. Date()-7, CLI_LIMC * 2)",

  // Value refusals in the guided filter. They name the value AND the field:
  // "not a date" alone does not help someone with six conditions on screen.
  ERROR_VALUE_NOT_NUMBER:
    "{field} is Numeric and '{value}' is not a number — turn on fx to evaluate it.",
  ERROR_VALUE_NOT_DATE:
    "{field} is a Date and '{value}' is not one — use YYYY-MM-DD, or turn on " +
    "fx to evaluate it (e.g. Date()-7).",
  ERROR_VALUE_NOT_LOGICAL:
    "{field} is Logical and '{value}' is neither true nor false — use T/F, or " +
    "turn on fx.",

  UI_COUNTING: "counting…",
  UI_SEARCHING: "scanning…",
  UI_CREATING: "creating…",

  UI_PAGE_RANGE: "on this page: {first}–{last}",
  UI_PAGE_RANGE_EMPTY: "no records in view",
  UI_PAGE_COUNT: { one: "on this page: {n} record", other: "on this page: {n} records" },
  UI_FILTERED_SUFFIX: "{n} filtered",
  UI_UNKNOWN_COUNT: "?",
  UI_GOTO_RECORD: "record {n}",
  UI_N_BYTES: "{n} bytes",
  UI_FIELDS_COUNT: "{n} fields",
  UI_MEMO: "memo",
  UI_FILTERED_MARK: "filtered",
  UI_FILTERED_MARK_N: "filtered: {n}",

  UI_CONFIRM_REMOVE_CONNECTION:
    "Remove the connection \"{name}\"?\n\nThe files on disk are not touched.",

  INFO_FOUND_SCANNED: {
    one: "Found after scanning {n} record.",
    other: "Found after scanning {n} records.",
  },
  WARN_SEARCH_CANCELED: {
    one: "Scan canceled after {n} record.",
    other: "Scan canceled after {n} records.",
  },
  UI_EXPORT_UNKNOWN_SCOPE: "whatever the filter lets through",


  // ------------------------------------------- T17: file info and log
  UI_CARD_LAST_UPDATE: "last written",
  UI_CARD_SIZE: "size",
  UI_CARD_CODEPAGE: "codepage",

  UI_OPERATIONS_LOG: "Changes",
  UI_LOG_EXPLAIN:
    "What this program changed in your files, day by day. Only operations that " +
    "created, modified or deleted something on disk are recorded — refusals " +
    "included. Opening, filtering and browsing leave no entry: they change nothing.",
  UI_LOG_DAY: "Day",
  UI_LOG_SEARCH: "Search",
  UI_LOG_SEARCH_PH: "file name, operation, expression…",
  UI_LOG_TIME: "Time",
  UI_LOG_OPERATION: "Operation",
  UI_LOG_RESULT: "Result",
  UI_LOG_ELAPSED: "Elapsed",
  UI_LOG_OK: "ok",
  UI_LOG_EMPTY: "Nothing was changed on this day.",
  UI_LOG_NOTHING_MATCHES: "No change matches the search.",
  UI_LOG_COUNT: { one: "{n} change", other: "{n} changes" },
  UI_LOG_COUNT_TRUNCATED: "showing {n} of {total}",

  ERROR_LOG_DAY_NOT_FOUND: "Nothing was changed on {day}.",


  // ------------------------------------------- long-running task labels
  UI_JOB_SEARCHING: "Searching…",
  UI_JOB_COUNTING: "Counting filtered records…",
  UI_JOB_INDEXING: "Building index {file}…",
  UI_JOB_EXPORTING: "Exporting {file}…",
  UI_JOB_COPYING: "Copying to {file}…",
  UI_JOB_WORKING: "Working…",

  UI_JOB_SIMULATING: "Simulating processing…",


  // -------------------------------------- TA: pre-flight and backup
  ERROR_BACKUP_READ_FAILED: "Cannot read '{file}' to copy it.",
  ERROR_BACKUP_WRITE_FAILED: "Cannot write the copy '{file}'.",
  ERROR_BACKUP_MISSING: "The copy '{file}' was never created.",
  ERROR_BACKUP_SIZE_MISMATCH:
    "The copy '{file}' came out at {got:size}, and the original has " +
    "{expected:size}. The backup was discarded.",
  ERROR_BACKUP_PRECHECK_FAILED:
    "Pre-flight checks on '{file}' did not pass; nothing was copied.",
  ERROR_BACKUP_NEEDS_CONFIRM:
    "'{file}' takes up {bytes:size}. Confirm to copy.",
  WARN_CANCELED_BACKUP: "Copy of '{file}' canceled. Nothing was left on disk.",

  UI_JOB_BACKUP: "Copying {file} to the backup…",

  // The checks, one phrase per checklist item.
  UI_CHECK_DISK_SPACE: "Disk space",
  UI_CHECK_DISK_SPACE_OK: "{free:size} free on {where}; the operation needs {needed:size}",
  UI_CHECK_DISK_SPACE_BAD: "only {free:size} free on {where}, and the operation needs {needed:size}",
  UI_CHECK_DISK_UNKNOWN: "Disk space",
  UI_CHECK_DISK_UNKNOWN_MSG: "could not measure free space on {path}",
  UI_CHECK_FILE_SET: "Files to be copied",
  UI_CHECK_FILE_SET_MSG: { one: "{n} file, {bytes:size}", other: "{n} files, {bytes:size}" },
  UI_CHECK_LARGE_FILE: "Large file",
  UI_CHECK_LARGE_FILE_MSG: "{bytes:size} — above {limit:size}, the copy will take a while",
  UI_CHECK_NOT_EXCLUSIVE: "Open mode",
  UI_CHECK_NOT_EXCLUSIVE_MSG:
    "'{file}' is open shared; the next operation will require exclusive",

  UI_PREFLIGHT: "Pre-flight checks",
  UI_PREFLIGHT_EXPLAIN:
    "Before altering the file, QDbu checks what could go wrong and makes a " +
    "copy. Nothing is altered until you confirm.",
  UI_BACKUP_RUN: "Run the backup",
  UI_BACKUP_DONE: "Backup written to {dir}",
  UI_BACKUP_FILES: { one: "{n} file copied", other: "{n} files copied" },
  UI_CONFIRM_LARGE: "I understand it will take a while, go ahead",

  // What each file in the set is.
  UI_ROLE_DATA: "data",
  UI_ROLE_MEMO: "memo",
  UI_ROLE_INDEX: "index",


  // ------------------------------- rebinding state after an exclusive operation
  ERROR_REBIND_INDEX_FAILED:
    "Index '{file}' did not open again: {reason}. Key: {key}",
  ERROR_REBIND_ORDER_LOST:
    "Order '{name}' no longer exists; the listing fell back to natural order.",
  ERROR_REBIND_FILTER_FAILED:
    "The filter was not reapplied: {reason} - {expr}",
  ERROR_OPERATION_FAILED:
    "The operation on '{file}' failed. The file was not altered.",
  WARN_REBIND_RECORD_GONE:
    "The record you were on no longer exists; moved to the top.",

  UI_SEE_FILES: "See the files",


  // ----------------------------------------- destination of a standalone copy
  UI_CHECK_SOURCE_ROOM: "Room in the source folder",
  UI_CHECK_SOURCE_ROOM_MSG:
    "{free:size} free on {where}; the operation will create a {needed:size} temporary file there",

  UI_BACKUP: "Backup",
  UI_BACKUP_TITLE: "Copy this file somewhere else, without altering it",

  UI_SAVE_AS: "Save as",
  UI_CHECK_TARGET_EXISTS: "Destination already exists",
  UI_CHECK_TARGET_EXISTS_MSG: "'{file}' is already there; pick another name so it is not overwritten",
  UI_CHECK_TARGET_IS_SOURCE: "Invalid destination",
  UI_CHECK_TARGET_IS_SOURCE_MSG: "'{file}' is the source file itself",


  // ------------------------------------------ R6: file lost during a mode swap
  ERROR_HANDLE_DETACHED:
    "'{file}' was closed for an operation and could not be reopened. " +
    "What is on screen is from before; use Reconnect once the file is free.",
  ERROR_REOPEN_FAILED: "another program holds the file",
  ERROR_CANNOT_LOCK_EXCLUSIVE:
    "Could not open '{file}' in exclusive mode — another program is using it. " +
    "Nothing was altered.",
  ERROR_CANNOT_OPEN_SHARED:
    "Could not reopen '{file}' in shared mode. Nothing was altered.",
  ERROR_BACKUP_UNVERIFIABLE:
    "The copy '{file}' was created, but it could not be measured to verify.",

  UI_DETACHED: "disconnected",
  UI_RECONNECT: "Reconnect",
  UI_DETACHED_HINT: "The file was closed for an operation and did not come back.",
  UI_RECONNECTED: "'{file}' reconnected.",

  UI_CLOSE_TAB_SHORT: "Close the tab",


  // ============================================ T14: PACK and ZAP
  UI_PACK: "Pack",
  UI_PACK_TITLE: "Permanently remove records marked for deletion",
  UI_ZAP: "Zap",
  UI_ZAP_TITLE: "Delete ALL records, keeping the structure",

  UI_JOB_PACK: "Packing {file}…",
  UI_JOB_ZAP: "Zapping {file}…",

  UI_ZAP_WARN_TITLE: "Delete every record?",
  UI_ZAP_WARN:
    "This deletes the {n} records in '{file}'. The field structure is kept, " +
    "but the data does not come back on its own.",
  UI_PACK_WARN_TITLE: "Pack the file?",
  UI_PACK_WARN:
    "This permanently removes the records marked for deletion in '{file}' " +
    "and renumbers the rest. Record numbers change.",

  UI_ASK_BACKUP_TITLE: "Make a copy first?",
  UI_ASK_BACKUP:
    "The copy stays in the same folder, with the time in its name, and opens " +
    "in QDbu like any file — you can check it before deleting the copy.",
  UI_WITH_BACKUP: "Yes, copy first",
  UI_WITHOUT_BACKUP: "No, go without a copy",
  UI_GO_AHEAD: "Continue",

  UI_ZAP_DONE: { one: "'{file}' zapped: {n} record deleted.", other: "'{file}' zapped: {n} records deleted." },
  UI_ZAP_DONE_BACKUP: {
    one: "'{file}' zapped: {n} record deleted. The copy is in '{backup}'.",
    other: "'{file}' zapped: {n} records deleted. The copy is in '{backup}'.",
  },
  UI_PACK_DONE: { one: "'{file}' packed: {n} record removed.", other: "'{file}' packed: {n} records removed." },
  UI_PACK_DONE_BACKUP: {
    one: "'{file}' packed: {n} record removed. The copy is in '{backup}'.",
    other: "'{file}' packed: {n} records removed. The copy is in '{backup}'.",
  },
  UI_NOTHING_TO_PACK: "'{file}' has no records marked; nothing was changed.",

  ERROR_ZAP_CREATE_FAILED:
    "The empty file for '{file}' could not be created: {reason}. The original was put back and nothing was lost.",
  ERROR_ZAP_FAILED: "The ZAP on '{file}' failed: {reason}. The file was not changed.",
  ERROR_PACK_FAILED: "Packing '{file}' failed: {reason}. The file was not changed.",

  UI_DONE: "Done",
  UI_ERROR: "Did not work",
  UI_OK: "Got it",


  // ============================================ T10: structure editor
  UI_EDIT_STRUCTURE: "Edit structure",
  UI_ADD_FIELD: "Append a field at the end",
  UI_INSERT_FIELD: "Insert a field above the selected one",
  UI_REMOVE_FIELD: "Mark the field for removal",
  UI_MOVE_UP: "Move up",
  UI_MOVE_DOWN: "Move down",
  UI_APPLY: "Apply",
  UI_DISCARD: "Discard",
  UI_DISCARD_TITLE: "Discard the changes?",
  UI_DISCARD_ASK: "The structure changes you made will be lost. The file was not touched.",

  UI_ROW_NOVO: "new field",
  UI_ROW_MUDOU: "changed field",
  UI_ROW_SUMIU: "field marked for removal",

  UI_STRUCT_SUMMARY: { one: "{n} field · {bytes} bytes per record", other: "{n} fields · {bytes} bytes per record" },
  UI_STRUCT_ERRORS: { one: "{n} field with a problem", other: "{n} fields with problems" },

  UI_IMPACT: "What happens to the data",
  UI_IMPACT_REMOVED: "'{field}' is removed — the data in that column is lost.",
  UI_IMPACT_ADDED: "'{field}' is created, empty in every record.",
  UI_IMPACT_TYPE: "'{field}' changes from {from} to {to} — values that fail to convert are lost.",
  UI_IMPACT_SHRUNK: "'{field}' shrinks from {from} to {to} — longer values are truncated.",
  UI_IMPACT_RENAMED: "'{from}' becomes '{to}' — the data is kept.",
  UI_IMPACT_REORDERED: "Field order changes. Indexes and expressions that rely on position need checking.",

  ERROR_FIELD_NAME_EMPTY: "the name cannot be empty",
  ERROR_FIELD_NAME_BAD: "letters, digits and _ only, starting with a letter",
  ERROR_FIELD_NAME_LONG: "10 characters at most",
  ERROR_FIELD_NAME_DUP: "a field with this name already exists",
  ERROR_FIELD_TYPE_BAD: "invalid type",
  ERROR_FIELD_LEN_C: "text: 1 to 1024",
  ERROR_FIELD_LEN_N: "number: 1 to 19",
  ERROR_FIELD_LEN_MEMO: "memo is always 10",
  ERROR_FIELD_LEN_DATE: "date is always 8",
  ERROR_FIELD_LEN_LOGIC: "logical is always 1",
  ERROR_FIELD_DEC: "too many decimals for this length",


  UI_RESTORE_FIELD: "Bring '{field}' back",
  UI_IMPACT_UNDO: "To bring '{field}' back, click the ↺ on its row.",

  UI_ADD_SHORT: "Field",
  UI_INSERT_SHORT: "Insert",
  UI_REMOVE_SHORT: "Remove",
  UI_RESTORE_SHORT: "Restore",
  UI_UP_SHORT: "Up",
  UI_DOWN_SHORT: "Down",

  UI_FIELD_WILL_GO: "This field will be removed",

  UI_APPLY_BLOCKED: { one: "Fix the field with a problem to apply", other: "Fix the {n} fields with problems to apply" },
  UI_APPLY_NOTHING: "Nothing has been changed yet",

  UI_FIELD_AT: "field {n}",


  // ---------------------------------------------- T10: create a new file
  UI_NEW_FILE: "Create file",
  UI_NEW_FILE_EXPLAIN:
    "The file is born empty, with the structure you built. No records are " +
    "created.",
  UI_NEW_DBF: "Create a file here…",
  UI_CREATE: "Create",
  UI_NEW_SUMMARY: { one: "{n} field · {bytes} bytes per record", other: "{n} fields · {bytes} bytes per record" },
  UI_CREATED: "'{file}' created with {n} fields.",
  UI_OVERWRITE_TITLE: "The file already exists",
  UI_OVERWRITE_ASK:
    "'{file}' is already in that folder. Replacing deletes what is there, " +
    "records included.",
  UI_OVERWRITE: "Replace",
  UI_NEW_UNTITLED: "SEM_NOME",

  ERROR_CREATE_FAILED: "Could not create '{file}'. {reason}",
  ERROR_FIELD_BAD: "Field {n} is malformed.",
  ERROR_RECORD_TOO_BIG:
    "The record would be {bytes} bytes, and the DBF format only holds up to " +
    "{max}. Shrink one of the fields.",

  ERROR_FILE_IS_OPEN:
    "'{file}' is open in tab {alias}. Close the tab before replacing it.",


  // ------------------------------------------ T10: change the structure
  UI_JOB_RESTRUCT: "Rewriting {file} with the new structure…",
  WARN_CANCELED_RESTRUCT:
    "Change canceled. The original file was not touched.",


  UI_MODIFY_TITLE: "Change the structure",
  UI_MODIFY_ASK: {
    one: "'{file}' has {n} record. It will be rewritten with the new structure.",
    other: "'{file}' has {n} records. They will be rewritten with the new structure.",
  },
  UI_MODIFY_OK: {
    one: "'{file}' now has {n} record.",
    other: "'{file}' now has {n} records.",
  },
  UI_MODIFY_FIELDS: { one: "It has {n} field.", other: "It has {n} fields." },
  WARN_INDEXES_DROPPED: {
    one: "{n} index was closed and must be rebuilt:",
    other: "{n} indexes were closed and must be rebuilt:",
  },
  UI_MODIFY_BACKUP: "A copy was kept in '{file}'.",
  UI_MODIFY_LOST: {
    one: "{n} value did not fit the new type and was left empty.",
    other: "{n} values did not fit the new type and were left empty.",
  },

  UI_STRUCT_EMPTY: "The structure has no fields left",

  UI_STRUCT_EMPTY_HINT: "Bring a field back with ↺, or add a new one.",

  ERROR_NO_FIELDS: "A file needs at least one field.",

  UI_RELOAD_TITLE: "Reload the screen?",
  UI_RELOAD_ASK: "The structure you built has not been applied yet, and reloading discards what is here.",
  UI_RELOAD_DISCARD: "Discard and reload",
  UI_KEEP_EDITING: "Keep editing",


  // ============================================ T13: mass operations
  UI_JOB_REPLACE: "Replacing in {file}…",
  UI_JOB_DELETING: "Marking records in {file}…",
  UI_JOB_RECALLING: "Recalling records in {file}…",
  UI_JOB_APPENDING: "Appending records to {file}…",

  WARN_CANCELED_BULK: {
    one: "Stopped. {n} record had already been changed and stayed that way — canceling stops the operation, it does not undo what it wrote.",
    other: "Stopped. {n} records had already been changed and stayed that way — canceling stops the operation, it does not undo what it wrote.",
  },

  ERROR_SCOPE_MODE: "There is no '{mode}' scope.",
  ERROR_SCOPE_COUNT: "Say how many records.",
  ERROR_FOR_INVALID: "The FOR could not be understood: {detail}",
  ERROR_FOR_NOT_LOGICAL: "The FOR must come out true or false; this one comes out {type}.",
  ERROR_WHILE_INVALID: "The WHILE could not be understood: {detail}",
  ERROR_WHILE_NOT_LOGICAL: "The WHILE must come out true or false; this one comes out {type}.",

  ERROR_NO_FIELD_PICKED: "Pick the field to replace.",
  ERROR_NO_VALUE: "Say what to replace it with.",
  ERROR_WITH_INVALID: "The expression could not be understood: {detail}",
  ERROR_TYPE_MISMATCH:
    "'{field}' is {fieldType} and the expression comes out {exprType} — the two types must match.",

  ERROR_NO_SOURCE: "Pick the source file.",
  ERROR_SOURCE_NOT_FOUND: "'{file}' was not found.",
  ERROR_CANNOT_OPEN_SOURCE: "'{file}' could not be opened: {reason}",
  ERROR_FORMAT_UNKNOWN: "There is no '{format}' source format.",
  ERROR_FORMAT_UNAVAILABLE: "This build does not read {format} files.",
  ERROR_APPEND_FAILED: "The record could not be added.",
  ERROR_APPEND_TEXT_FAILED: "'{file}' could not be read as {format}: {reason}",
  ERROR_CANNOT_LOCK_FILE:
    "'{file}' is being used by someone else. Mass operations need the file to yourself.",

  UI_EDIT_STRUCTURE_OF: "Structure of {file}",
  UI_DISCARD_TITLE: "Discard the changes?",
  UI_DISCARD_ASK: "The structure you built has not been applied yet and will be lost.",


  // =================================================== T13: mass operations
  UI_MASS: "In bulk",
  UI_MASS_TITLE: "Replace, delete, recall, or append records from another file",
  UI_MASS_ON: "In bulk · {file}",

  UI_MASS_REPLACE: "Replace",
  UI_MASS_DELETE: "Delete",
  UI_MASS_RECALL: "Recall",
  UI_MASS_APPEND: "Append from",

  UI_MASS_EXPLAIN_REPLACE:
    "Writes the result of the expression into the chosen field, on every record in the scope.",
  UI_MASS_EXPLAIN_DELETE:
    "Marks the records in the scope as deleted. They stay in the file and come back with Recall; what removes them for good is Pack.",
  UI_MASS_EXPLAIN_RECALL:
    "Takes the deleted mark off the records in the scope.",
  UI_MASS_EXPLAIN_APPENDFROM:
    "Adds the source file records to the end of this one. Fields are matched by NAME; whatever is missing on either side is left out or comes in empty.",

  UI_MASS_FIELD: "Field",
  UI_MASS_WITH: "Replace {field} with",
  UI_MASS_WITH_HINT: "expression — e.g. CLI_LIMC * 1.1",
  UI_MASS_SOURCE: "Source file",
  UI_MASS_PICK_SOURCE: "Choose the source file",
  UI_MASS_FORMAT: "Format",
  UI_FMT_DBF: "DBF (another file of the same kind)",
  UI_FMT_SDF: "Fixed-width text (SDF)",
  UI_MASS_TEXT_NOTE:
    "Text files are read by Harbour own engine, which reports no progress: the bar does not move and there is no way to stop. DBF has progress and cancelling.",

  UI_MASS_SCOPE: "Scope",
  UI_MASS_RECORDS: "Records",
  UI_SCOPE_ALL_REC: "All",
  UI_SCOPE_NEXT: "Next…",
  UI_SCOPE_NEXT_N: { one: "next {n} record", other: "next {n} records" },
  UI_SCOPE_REST: "From the current record to the end",
  UI_MASS_FOR_HINT: "only records where… (optional)",
  UI_MASS_WHILE_HINT: "while… — stops at the first that does not match (optional)",

  UI_MASS_RULE_WHILE:
    "WHILE takes precedence over FOR: WHILE STOPS at the first record that does not match; FOR merely SKIPS it and carries on to the end.",
  UI_MASS_RULE_TOP:
    "All starts from the top. Next and to-the-end start at the record the cursor is on right now.",
  UI_MASS_RULE_FILTER:
    "The active filter COUNTS here: the operation only reaches what it lets through ({expr}).",
  UI_MASS_RULE_NOFILTER:
    "No filter is active — the operation reaches the whole file within the scope.",

  UI_MASS_CONFIRM_REPLACE: "The field {field} will be rewritten in {file}. This cannot be undone.",
  UI_MASS_CONFIRM_DELETE: "Records will be marked as deleted in {file}.",
  UI_MASS_CONFIRM_RECALL: "The deleted mark will be taken off in {file}.",
  UI_MASS_CONFIRM_APPENDFROM: "Records from {source} will be added to {file}.",
  UI_MASS_CONFIRM_SCOPE: "Scope: {scope}.",

  UI_MASS_DONE_REPLACE: { one: "{n} record changed, out of {seen} examined.", other: "{n} records changed, out of {seen} examined." },
  UI_MASS_DONE_DELETE: { one: "{n} record marked, out of {seen} examined.", other: "{n} records marked, out of {seen} examined." },
  UI_MASS_DONE_RECALL: { one: "{n} record recalled, out of {seen} examined.", other: "{n} records recalled, out of {seen} examined." },
  UI_MASS_DONE_APPEND: { one: "{n} record came from {file}. The file now has {total}.", other: "{n} records came from {file}. The file now has {total}." },

  UI_MASS_FROM_RECORD: "starting at record {n}",
  UI_MASS_FROM_NONE: "No record chosen — click a row in the grid.",

  UI_CURRENT_RECORD: "rec. {n} of {total}",
  UI_CURRENT_RECORD_HINT: "Current record — this is where \"next n\" and \"to the end\" start.",
  UI_CURRENT_RECORD_AWAY: "Current record, off the visible page. Click to go back to it.",


  // ------------------------------------- T13: import from CSV and JSON
  UI_FMT_CSV: "CSV / delimited text",
  UI_FMT_JSON: "JSON (list of objects)",
  UI_MASS_HAS_HEADER: "The first line is the header with the column names",
  UI_MASS_DELIM: "Separator",
  UI_DELIM_AUTO: "Detect it",
  UI_DELIM_SEMI: "Semicolon  ;",
  UI_DELIM_COMMA: "Comma  ,",
  UI_DELIM_TAB: "Tab",

  UI_MAP_BY_NAME_DBF: "Fields are matched by NAME. Whatever is missing on either side is left out or comes in empty.",
  UI_MAP_BY_NAME_CSV: "Columns are matched by NAME, using the header. A column with no field of the same name is ignored.",
  UI_MAP_BY_NAME_JSON: "Each object key is matched by NAME against the fields. A key with no matching field is ignored.",
  UI_MAP_BY_POSITION: "No names to match: the first column goes into the first field, and so on.",

  ERROR_CSV_UNCLOSED_QUOTE:
    "'{file}' has a quoted field that was never closed - from that quote to the end of the file would become a single field. Check the quotes.",
  ERROR_SOURCE_EMPTY: "'{file}' has nothing to read.",
  ERROR_JSON_INVALID: "'{file}' is not valid JSON.",
  ERROR_JSON_NOT_ARRAY:
    "'{file}' must be a list of objects - like the one Export itself writes.",

  UI_MASS_ENCODING: "File encoding",
  UI_CDP_UTF8: "UTF-8 (most common)",
  UI_CDP_ANSI: "ANSI / Windows-1252",
  UI_CDP_CP850: "CP850 (DOS)",

  UI_BACKUP_ZIP: "Compress into a .zip",
  UI_BACKUP_ZIP_HINT: "A single file, instead of the .dbf (and the .dbt, when there is a memo).",
  UI_BACKUP_DONE_ZIP: "Compressed into {dir} - from {from} to {to}, {pct}% smaller.",
  UI_ZIP_DIRECT: "Read straight from the original, with no intermediate copy.",
  UI_ZIP_COPY: "The file was held exclusively, so it was copied record by record before compressing.",
  UI_JOB_ZIP: "Compressing {file}...",
  ERROR_ZIP_CREATE_FAILED: "'{file}' could not be created.",
  ERROR_ZIP_FAILED: "'{file}' could not be written: {reason}",
  UI_ROLE_ZIP: "compressed",


  // ---- T8: record editing ----
  ERROR_CELL_TYPE: "{field} does not take that kind of value.",
  ERROR_CELL_TOO_LONG:
    "{field} holds {len} characters and the value has {size} — shorten it or widen the field in the structure.",
  ERROR_CELL_NOT_NUMBER: "{field} is Numeric and '{value}' is not a number.",
  ERROR_CELL_NOT_DATE: "{field} is a Date and '{value}' is not one — use YYYY-MM-DD.",
  ERROR_FIELD_TYPE_UNSUPPORTED: "{field} is type {type} and cannot be edited here.",
  ERROR_RECORD_OUT_OF_RANGE: "Record {recno} does not exist — the file goes up to {max}.",
  ERROR_CANNOT_LOCK_RECORD:
    "Record {recno} of '{file}' is locked by another user — try again in a moment.",
  ERROR_WRITE_FAILED: "Could not write record {recno} of '{file}'[[: {reason}]].",

  UI_ADD_RECORD: "+ Record",
  UI_ADD_RECORD_TITLE: "Appends a blank record at the end of the file",
  UI_DELETE_RECORD: "Delete",
  UI_DELETE_RECORD_TITLE: "Marks the current record for deletion (PACK is what removes it)",
  UI_RECALL_RECORD: "Recall",
  UI_RECALL_RECORD_TITLE: "Clears the deletion mark on the current record",
  UI_CONFIRM: "Confirm",
  UI_SAVE: "Save",
  UI_MEMO_TITLE: "{field} — record {n}",
  UI_NO_CURRENT_RECORD: "No record selected — click a row in the grid.",
  INFO_RECORD_UPDATED: "Record {n} updated: {field}.",
  INFO_RECORD_ADDED: "Record {n} appended.",
  INFO_RECORD_ADDED_HIDDEN:
    "Record {n} appended — the active filter hides it, because it starts blank.",
  INFO_RECORD_DELETED: "Record {n} marked for deletion.",
  INFO_RECORD_RECALLED: "Record {n} recalled.",

  // ---- T9: form ----
  UI_VIEW_FORM: "Form",
  UI_SWITCH_TO_FORM: "View one record at a time, with every field",
  UI_SWITCH_TO_GRID: "Back to the grid, with many records",
  UI_FIRST_RECORD: "First record",
  UI_PREV_RECORD: "Previous record",
  UI_NEXT_RECORD: "Next record",
  UI_LAST_RECORD: "Last record",
  UI_AT_FIRST_RECORD: "Already at the first record.",
  UI_AT_LAST_RECORD: "Already at the last record.",
  UI_DELETED_BADGE: "deleted",

  // ---- R8: what you edit must be what is on disk ----
  ERROR_PARAM_MUST_BE_STRING: "Parameter '{param}' must be a string[[ (field {field})]].",
  ERROR_CONNECTION_NOT_FOUND: "Connection '{name}' not found.",
  ERROR_UNKNOWN_CODEPAGE: "Codepage '{codepage}' is not one of the available ones.",
  UI_CDP_PT850: "DOS Brazil (CP850)",
  UI_CDP_ESWIN: "Windows (CP1252)",
  UI_CDP_PTISO: "ISO-8859-1 (Latin-1)",
  UI_CDP_PT860: "DOS Portugal (CP860)",
  UI_CDP_UTF8: "UTF-8",
  INFO_CODEPAGE_CHANGED: "File codepage: {cp}.",
  // ---- three-level config (global / connection / file) ----
  UI_PREFERENCES: "Preferences",
  UI_CONFIG_EXPLAIN: "These apply to the whole app. Each connection and each file may set its own codepage on top of these.",
  UI_DEFAULT_CODEPAGE: "Default codepage",
  UI_SHOW_DELETED: "Show deleted records",
  UI_TOOLBAR_LABELS: "Show labels on the toolbar",
  UI_EPOCH_INFO: "Two-digit years use the century from {year} on (SET EPOCH, fixed).",
  UI_CONN_CODEPAGE: "Codepage",
  UI_CDP_INHERIT: "(inherit)",
  UI_MENU_CODEPAGE: "Connection codepage",
  UI_PIN_FILE: "Pin this codepage for the file",
  UI_PINNED_FILE: "Codepage pinned for this file",
  UI_CODEPAGE_FROM_CONN: "Inherited from the connection.",
  UI_CODEPAGE_FROM_GLOBAL: "App default.",
  UI_CODEPAGE_FROM_FILE: "Pinned for this file.",
  INFO_CODEPAGE_PINNED: "Codepage {cp} pinned for this file.",
  INFO_CONFIG_SAVED: "Preferences saved.",
  INFO_CONNECTION_UPDATED: "Connection '{name}' updated.",
  WARN_CODEPAGE_NOT_PINNED: "Could not write to the folder; codepage {cp} applies to this session only.",
  WARN_CONFIG_NOT_SAVED: "Could not save to disk; preferences apply to this session only.",
  UI_CODEPAGE: "Codepage",
  UI_CODEPAGE_TITLE: "How this file's bytes become text — does not change the file",
  UI_CODEPAGE_DIALOG: "This file's codepage",
  UI_CODEPAGE_EXPLAIN: "A DBF does not reliably record which codepage it was written with. This choice is only the reading LENS: changing it does not alter a single byte of the file, and you can change it back at any time.",
  UI_CODEPAGE_HINT: "The header suggests {cp}.",
  ERROR_STALE_VALUE:
    "{field} was changed by someone else while you were editing: it was '{expected}', now it is '{actual}'.",
  INFO_RECORD_REFRESHED:
    "Record {n} was changed by another user — showing the current values.",
  UI_STALE_TITLE: "Changed by someone else",
  UI_STALE_EXPLAIN:
    "While you were editing, {field} of record {n} changed from '{expected}' to '{actual}'. What to do with what you typed?",
  UI_STALE_DELETE_ASK:
    "Record {n} changed since you saw it — {field}: it was '{expected}', now it is '{actual}'. Delete anyway?",
  UI_STALE_RECALL_ASK:
    "Record {n} changed since you saw it — {field}: it was '{expected}', now it is '{actual}'. Recall anyway?",
  UI_DELETE_ANYWAY: "Delete anyway",
  UI_RECALL_ANYWAY: "Recall anyway",
  UI_STALE_DISCARD: "Discard mine",
  UI_STALE_OVERWRITE: "Overwrite",
  // ---------------------------------------------------------------- about
  UI_ABOUT: "About",
  UI_ABOUT_WHAT:
    "A utility inspired by DBU (Clipper's DBF handling tool), built in Harbour, with a Tauri + Rust + HTML/JS front end.",
  UI_NOTICE: "Notice",
  UI_ABOUT_WARRANTY:
    "QDbu was built as a proof of concept and a study exercise. It is provided without warranty of any kind, express or implied, and you use it at your own risk.",
  UI_ABOUT_COMPILED: "Built on {when}",
  UI_ABOUT_SOURCES: "For the latest sources and releases visit:",

  // ------------------------------------------------------------------ quit
  UI_QUIT_TITLE: "Quit QDbu?",
  UI_QUIT_ASK: "Work in progress in the open tabs will not be resumed.",
  UI_QUIT_YES: "Quit",
  UI_QUIT_NO: "Stay",

  // ---------------------------------------------------------- command line
  ERROR_CLI_VEW_UNSUPPORTED:
    "'{file}' is a .VEW file, and QDbu does not read that format yet.",
  ERROR_CLI_UNKNOWN_OPTION: "Unrecognised command-line option: {option}.",
  // ------------------------------------------------------------ drag and drop
  UI_DROP_HERE: "Drop to open",
  UI_DROP_HINT: "DBF files. Folders are registered under + Connection.",
  ERROR_DROP_NOT_A_DBF: "'{file}' is not a .DBF.",
  ERROR_DROP_NOT_A_FILE:
    "'{file}' is not a .DBF file. If it is a folder, register it under + Connection.",
  // ------------------------------------------------------------ open file
  UI_OPEN_FILE: "Open file",
  UI_OPEN_FILE_TITLE: "Open file",
  UI_OPEN_FILE_EXPLAIN:
    "A single DBF, without registering its folder. To come back to it later, register the folder as a connection.",
  UI_OPEN_DIALOG_TITLE: "Choose a DBF file",
  UI_BROWSE: "Browse…",
  UI_OPEN: "Open",
  UI_READ_ONLY: "Read-only",
  UI_EXCLUSIVE: "Exclusive use",
  UI_OPEN_MODE_EXPLAIN:
    "Read-only refuses every write to this file — the refusal comes from the driver, not from the screen. Exclusive use stops another program from opening it while you have it.",
  UI_RDD: "Driver",
  ERROR_FILE_READ_ONLY:
    "'{file}' was opened read-only, so {method} cannot write to it. Close the tab and open it again without that option.",
  // ---------------------------------------------------- expression builder (T18)
  UI_CX_TITLE: "Expression builder",
  UI_CX_OPEN: "Build the expression",
  UI_CX_UNDO: "Undo (Ctrl+Z)",
  UI_CX_REDO: "Redo (Ctrl+Y)",
  UI_CX_RESTORE: "Restore original",
  UI_CX_USE: "Use",
  UI_CX_EXPECTS: "expects {type}",
  UI_CX_ANY_TYPE: "any type",
  UI_CX_FROM_FILTER: "Filter",
  UI_CX_FROM_KEY: "Index key",
  UI_CX_FROM_FOR: "FOR",
  UI_CX_FROM_WHILE: "WHILE",
  UI_CX_FROM_REPLACE: "REPLACE {field}",
  UI_CX_EMPTY: "Type or build an expression.",
  UI_CX_CHECKING: "checking…",
  UI_CX_MISSING: "Missing: {args}.",
  UI_CX_OK_VALUE: "✓ compiles · {type} · on record {n} it is {value}",
  UI_CX_VALUE_LEN: "{value} ({len} of {max})",
  UI_CX_WRONG_TYPE: "✗ Expected {expected} — this returns {got}.",
  UI_CX_NO_SYMBOL: "✗ There is no field or function {symbol}.",
  UI_CX_SIMILAR: "Similar: {name}.",
  UI_CX_NOT_COMPILE: "✗ {detail}",
  UI_CX_WARNING: "⚠ Compiles, but could not be evaluated on record {n}: {detail}",
  UI_CX_SIMPLIFY: "the condition is already Logical — it works without the IIf.",
  UI_CX_TRUE: "Yes",
  UI_CX_FALSE: "No",
  UI_CX_DISCARD_ASK: "There are changes that were not used yet.",
};
