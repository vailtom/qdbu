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
  UI_ROWS_PER_PAGE_TITLE: "Records per page",
  UI_LAST_READ: "Last read",
  UI_RELOAD: "Reload from disk (F5)",

  UI_FIELD: "Field",
  UI_TYPE: "Type",
  UI_SIZE: "Width",
  UI_DEC: "Dec.",

  // The dBASE field types, spelled as a structure listing spells them.
  UI_TYPE_C: "Character",
  UI_TYPE_N: "Numeric",
  UI_TYPE_D: "Date",
  UI_TYPE_L: "Logical",
  UI_TYPE_M: "Memo",
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

  UI_PAGE_RANGE: "{first}–{last} of {total}",
  UI_PAGE_RANGE_EMPTY: "0 of {total}",
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
    "Before altering the file, DBU checks what could go wrong and makes a " +
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
    "Index '{file}' failed to reopen. Key: {key}",
  ERROR_REBIND_ORDER_LOST:
    "Order '{name}' no longer exists; the listing fell back to natural order.",
  ERROR_REBIND_FILTER_FAILED:
    "The filter was not reapplied — {expr}",
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
    "in DBU like any file — you can check it before deleting the copy.",
  UI_WITH_BACKUP: "Yes, copy first",
  UI_WITHOUT_BACKUP: "No, go without a copy",
  UI_GO_AHEAD: "Continue",

  UI_ZAP_DONE: "'{file}' zapped: {n} records deleted.",
  UI_ZAP_DONE_BACKUP:
    "'{file}' zapped: {n} records deleted. The copy is in '{backup}'.",
  UI_PACK_DONE: { one: "'{file}' packed: {n} record removed.", other: "'{file}' packed: {n} records removed." },
  UI_PACK_DONE_BACKUP: "'{file}' packed: {n} removed. The copy is in '{backup}'.",
  UI_NOTHING_TO_PACK: "'{file}' has no records marked; nothing was changed.",

  ERROR_ZAP_CREATE_FAILED:
    "Could not create the empty file for '{file}'. The original was restored " +
    "and nothing was lost.",
  ERROR_ZAP_FAILED: "The ZAP on '{file}' failed. The file was not changed.",
  ERROR_PACK_FAILED: "Packing '{file}' failed. The file was not changed.",

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

  UI_NOT_YET_TITLE: "Not yet",
  UI_NOT_YET:
    "The screen is ready to be reviewed, but the part that rewrites the file " +
    "has not been implemented. Nothing was changed.",

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
  ERROR_NO_FIELDS: "Define at least one field before creating the file.",
  ERROR_RECORD_TOO_BIG:
    "The record would be {bytes} bytes, and the DBF format only holds up to " +
    "{max}. Shrink one of the fields.",

  ERROR_FILE_IS_OPEN:
    "'{file}' is open in tab {alias}. Close the tab before replacing it.",

};
