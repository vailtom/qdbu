/*
 * err.prg - business refusals.
 *
 * TWO ERROR CLASSES -- the most important distinction in this API:
 *
 *   business refusal  ->  Err( "CODE", "message" )  ->  {"ok":false,...}
 *       The caller asked for something invalid: file already open, filter that
 *       is not logical, closed handle. It is expected, has a stable code, and
 *       the UI can highlight the offending field.
 *
 *   runtime failure   ->  Harbour exception  ->  RECOVER  ->  "ERR:..."
 *       Our bug: 1/0, corrupt file, the unforeseen.
 *
 * Using RECOVER for an expected error destroys the structure and leaves the UI
 * with raw text. With the split, "ERR:" always means a bug to fix -- which is
 * what makes the log actionable.
 *
 * CODES ARE IN ENGLISH and CARRY THEIR SEVERITY AS A PREFIX:
 *
 *     ERROR_   the request was refused; nothing happened
 *     WARN_    it stopped part-way -- typically the user canceled
 *     INFO_    it worked; this is the confirmation
 *
 * The prefix does two jobs, and neither is decoration.
 *
 *   1. IT IS THE FALLBACK MESSAGE. The code is the i18n key, and a key with no
 *      entry in the chosen dictionary FALLS THROUGH TO THE SCREEN -- at that
 *      moment the code IS the sentence the user reads. "FILE_NOT_FOUND" alone
 *      looks like some technical field the app happened to print;
 *      "ERROR_FILE_NOT_FOUND" announces itself as an error to someone who has
 *      never seen this code. A missing translation degrades into something
 *      legible instead of something baffling.
 *
 *   2. IT IS HOW THE UI PICKS THE COLOUR. One rule -- read the prefix -- instead
 *      of a growing list of `if (code === "CANCELED")` scattered through the JS.
 *      Adding WARN_CANCELED_INDEX later already paints yellow, with no JS change.
 *
 * That is why canceling is WARN_ and not ERROR_: the user pressed cancel, and
 * calling their own decision an error is the app arguing with them.
 *
 * WHERE THE CATALOGUE LIVES: right below, and it is the authoritative list --
 * app/ui/js/i18n/*.js must have one entry per code here. There used to be a
 * block of #define constants; nothing ever used them (every call site wrote the
 * literal), so they were dead weight pretending to be a contract.
 */

/*
 * ---- refusal codes: the i18n key list ----
 *
 * The `params` each one carries is what the translated sentence interpolates.
 * Adding a code here without adding it to the three dictionaries is a bug that
 * only shows up in the language nobody on the team reads -- so the list is
 * grouped to make an omission visible.
 *
 *   envelope / dispatcher
 *     ERROR_BAD_ENVELOPE
 *     ERROR_UNKNOWN_METHOD          method
 *
 *   parameters (generic, reused everywhere)
 *     ERROR_PARAM_REQUIRED          param
 *     ERROR_PARAM_OUT_OF_RANGE      param, value, min, max
 *     ERROR_PARAM_TOO_SMALL         param, min
 *     ERROR_PARAM_TOO_BIG           param, value, max
 *     ERROR_PARAM_MUST_BE_LIST      param
 *     ERROR_PARAM_MUST_BE_STRING    param, field
 *     ERROR_BAD_DATE                value
 *     ERROR_BAD_ANCHOR
 *
 *   handles
 *     ERROR_INVALID_HANDLE          handle
 *     ERROR_HANDLE_CLOSED           handle, closedIn
 *
 *   workspace
 *     ERROR_CONNECTION_EXISTS       name
 *     ERROR_CONNECTION_NOT_FOUND    name
 *     ERROR_DIR_NOT_FOUND           dir
 *
 *   files
 *     ERROR_FILE_NOT_FOUND          file
 *     ERROR_FILE_EXISTS             file    (destino que ja existe: struct.create,
 *                                   meta.copyfile -- nenhum dos dois sobrescreve
 *                                   sem `replace`)
 *     ERROR_FILE_ALREADY_OPEN       file
 *     ERROR_FILE_IS_OPEN            file, alias   (o destino esta aberto numa aba)
 *     ERROR_NOT_A_DBF               file, reason
 *     ERROR_MEMO_FILE_MISSING       file, memo
 *     ERROR_OPEN_FAILED             file, reason
 *
 *   fields
 *     ERROR_FIELD_NOT_FOUND         field, alias
 *     ERROR_UNKNOWN_CODEPAGE       codepage   (nao e uma das oferecidas)
 *     ERROR_CONNECTION_NOT_FOUND    name
 *     ERROR_STALE_VALUE             field, expected, actual, raw   (R8: o campo mudou
 *                                   no disco entre a leitura e a gravacao)
 *     ERROR_NO_COLUMNS
 *
 *   structure sync (docs/20) -- struct.diff / struct.compose
 *     ERROR_SYNC_SAME_DIR           dir
 *     ERROR_SYNC_CHOICE_MISSING     field           (divergent field with no keep/adopt/drop)
 *     ERROR_SYNC_CHOICE_INVALID     field, choice
 *
 *   expressions
 *     ERROR_EXPR_INVALID            detail   (Harbour's own text; not translated)
 *     ERROR_EXPR_NOT_LOGICAL        type
 *
 *   indexes
 *     ERROR_NOT_AN_INDEX            file, reason
 *     ERROR_INDEX_ALREADY_OPEN      file
 *     ERROR_INDEX_NOT_OPEN          file
 *     ERROR_INDEX_OPEN_FAILED       file, reason
 *     ERROR_INDEX_REJECTED_BY_RDD   file
 *     ERROR_INDEX_OPEN_ON_CREATE    file
 *     ERROR_INDEX_KEY_BAD_TYPE      type
 *     ERROR_INDEX_CREATE_FAILED     file, reason
 *     ERROR_NO_ACTIVE_ORDER
 *     ERROR_SEEK_BAD_KEY_TYPE       type
 *
 *   backup / pre-voo
 *     ERROR_BACKUP_READ_FAILED      file
 *     ERROR_BACKUP_WRITE_FAILED     file
 *     ERROR_BACKUP_MISSING          file
 *     ERROR_BACKUP_SIZE_MISMATCH    file, expected, got
 *     ERROR_BACKUP_PRECHECK_FAILED  file, needed, free
 *     ERROR_BACKUP_NEEDS_CONFIRM    file, bytes
 *     WARN_CANCELED_BACKUP          file
 *
 *   T10 -- estrutura
 *     ERROR_NO_FIELDS
 *     ERROR_FIELD_BAD               n
 *     ERROR_FIELD_NAME_EMPTY        n
 *     ERROR_FIELD_NAME_LONG         field
 *     ERROR_FIELD_NAME_BAD          field
 *     ERROR_FIELD_NAME_DUP          field
 *     ERROR_FIELD_TYPE_BAD          field
 *     ERROR_FIELD_LEN_C             field
 *     ERROR_FIELD_LEN_N             field
 *     ERROR_FIELD_LEN_DATE          field
 *     ERROR_FIELD_LEN_LOGIC         field
 *     ERROR_FIELD_LEN_MEMO          field
 *     ERROR_FIELD_DEC               field
 *     ERROR_RECORD_TOO_BIG          bytes, max
 *     ERROR_CREATE_FAILED           file, reason
 *
 *   T14 -- PACK e ZAP
 *     ERROR_ZAP_CREATE_FAILED       file
 *     ERROR_ZAP_FAILED              file
 *     ERROR_PACK_FAILED             file
 *
 *   R6 -- arquivo perdido na troca de modo
 *     ERROR_HANDLE_DETACHED         handle, file, why
 *     ERROR_REOPEN_FAILED
 *     ERROR_CANNOT_LOCK_EXCLUSIVE   file
 *     ERROR_FILE_IN_USE             file, mode ("exclusive" | "shared")
 *     ERROR_RENAME_FAILED           file   -- ja se gastou backup/conversao
 *     ERROR_FILE_READ_ONLY          method, file
 *     ERROR_CANNOT_OPEN_SHARED      file
 *     ERROR_BACKUP_UNVERIFIABLE     file
 *
 *   religar estado (R5)
 *     ERROR_REBIND_INDEX_FAILED     file, key
 *     ERROR_REBIND_ORDER_LOST       name
 *     ERROR_REBIND_FILTER_FAILED    expr
 *     ERROR_OPERATION_FAILED        file
 *     WARN_REBIND_RECORD_GONE
 *
 *   log
 *     ERROR_LOG_DAY_NOT_FOUND       day
 *
 *   export
 *     ERROR_EXPORT_FAILED           file, reason
 *     ERROR_EXPORT_OPEN_FAILED      file, reason
 *     ERROR_SAME_FILE
 *
 *   cancelation -- WARN_, not ERROR_: the user chose it
 *     WARN_CANCELED_PARTIAL_FILE    file, n
 *     WARN_CANCELED_INDEX           file
 */

/*
 * Builds a business refusal.
 *
 *   cCode    stable identifier -- the UI keys off THIS, never off the text
 *   cMsg     fallback in plain English, for the log and for clients without a
 *            translation table (the C client, a script)
 *   cField   (optional) which form field is wrong
 *   hParams  (optional) values the translated sentence interpolates
 *
 * NO USER-FACING TEXT IN PORTUGUESE LIVES HERE ANYMORE.
 *
 * Two reasons, and the second was learned the hard way:
 *
 *   1. The app is meant to be published worldwide. A message built here would
 *      have to be translated here, and the DLL would need to know the language.
 *
 *   2. These .prg files are saved as UTF-8 while the DBF side is CP850, and the
 *      dispatcher converts native -> UTF-8 on the way out. An accented literal
 *      written here gets converted TWICE and reaches the screen as "├®". Moving
 *      the sentence to the JS side removes the problem instead of working
 *      around it -- JSON is UTF-8 by definition.
 *
 * So the refusal carries data, and the sentence is assembled in
 * app/ui/js/i18n/. Example:
 *
 *   Err( "ERROR_FILE_EXISTS", "file already exists", "path", { "file" => cNome } )
 *      -> pt-BR: "'NETCLI.csv' ja existe -- marque substituir para sobrescrever"
 *      -> en:    "'NETCLI.csv' already exists -- check replace to overwrite"
 */
FUNCTION Err( cCode, cMsg, cField, hParams )

   LOCAL hErr := { => }

   hb_HKeepOrder( hErr, .T. )

   /* O default tambem obedece a convencao: se um dia escapar sem codigo, o que
      chega na tela ainda se le como erro, e nao como a palavra solta "ERROR". */
   hErr[ "code" ]    := hb_defaultValue( cCode, "ERROR_UNSPECIFIED" )
   hErr[ "message" ] := hb_defaultValue( cMsg, "" )

   IF HB_ISSTRING( cField ) .AND. ! Empty( cField )
      hErr[ "field" ] := cField
   ENDIF

   /* Sempre presente, ainda que vazio: assim o lado JS nunca precisa testar se
      a chave existe antes de interpolar. */
   hErr[ "params" ] := iif( HB_ISHASH( hParams ), hParams, { => } )

   RETURN { "ok" => .F., "error" => hErr }

/*
 * Success response. xData becomes "result" -- may be hash, array or string.
 *
 * Do NOT use hb_defaultValue() here: it returns the default when the TYPE
 * differs, not only when the value is NIL. With a hash as default, every string
 * return (meta.ping -> "pong:") would silently become {}.
 */
FUNCTION Ok( xData )

   IF xData == NIL
      xData := { => }
   ENDIF

   RETURN { "ok" => .T., "result" => xData }

/* .T. when the value is a response already built by Err()/Ok(). */
FUNCTION IsResponse( x )
   RETURN HB_ISHASH( x ) .AND. hb_HHasKey( x, "ok" )


/*
 * O TEXTO COMPLETO DE UM ERRO DO HARBOUR -- e este e o PADRAO DO PROJETO.
 *
 * Toda mensagem que chega a uma pessoa mostra a informacao INTEIRA. Nunca a
 * descricao generica sozinha.
 *
 * O erro do Harbour vem em tres partes, e so a primeira e obvia:
 *
 *   description  o que aconteceu       "Variable does not exist"
 *   operation    SOBRE O QUE           "W"        <- o que faltava
 *   args         com quais valores     (quando ha)
 *
 * Guardar so `description` produz frases que descrevem uma categoria e nao um
 * fato: "Variable does not exist" nao diz QUAL variavel, e quem le fica sem o
 * unico dado que resolveria o problema. Foi assim que um `W` digitado por
 * engano num campo WHILE virou uma recusa que a pessoa nao tinha como
 * diagnosticar.
 *
 * O `api_index.prg` ja tratava disso ha tempos, e o comentario de la e a regra
 * em uma linha: "Dizer `Variable does not exist [LOG_NOW]` nao ajuda ninguem".
 * Certo -- mas nao dizer o `[LOG_NOW]` ajuda menos ainda. A funcao vive aqui,
 * uma so, para que o proximo tratador de erro nasca completo sem que ninguem
 * precise lembrar disso.
 */
FUNCTION ErroTexto( oErr, cPadrao )

   LOCAL cDesc, cOper, cTexto

   IF ! HB_ISOBJECT( oErr )
      RETURN hb_defaultValue( cPadrao, "" )
   ENDIF

   cDesc := iif( HB_ISSTRING( oErr:description ), AllTrim( oErr:description ), "" )
   cOper := iif( HB_ISSTRING( oErr:operation ), AllTrim( oErr:operation ), "" )

   cTexto := iif( Empty( cDesc ), hb_defaultValue( cPadrao, "" ), cDesc )

   /* O `operation` so entra se ainda nao estiver dito. O Harbour as vezes ja o
      inclui na descricao, e repetir viraria "Argument error: + : +". */
   IF ! Empty( cOper ) .AND. ! ( Upper( cOper ) $ Upper( cTexto ) )
      cTexto := iif( Empty( cTexto ), cOper, cTexto + ": " + cOper )
   ENDIF

   RETURN cTexto


/*
 * O nome do simbolo que o erro cita, sozinho -- para quem precisa dele como
 * DADO e nao como frase (interpolar em "o campo {field} nao existe").
 */
FUNCTION ErroSimbolo( oErr )

   IF ! HB_ISOBJECT( oErr ) .OR. ! HB_ISSTRING( oErr:operation )
      RETURN ""
   ENDIF

   RETURN AllTrim( oErr:operation )
