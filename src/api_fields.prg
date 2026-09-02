/*
 * api_fields.prg - which columns the grid shows.
 *
 * The selection lives WITH THE HANDLE, in hInfo["visible"], and an empty list
 * means all of them. Storing it per handle is what lets the same file be open
 * twice later showing different columns, and what makes data.page need no
 * argument: it asks the handle.
 *
 * fields.select takes THE WHOLE LIST, never "toggle this one". Per-item toggle
 * needs the caller and the DLL to agree on the current state before every
 * click; if they ever disagree the checkbox inverts and nobody can tell why.
 * Sending the full list is idempotent -- repeating it lands on the same place.
 */

#include "dbstruct.ch"

/*
 * fields.available {"h":"h7"}
 *   -> {"fields":[{"key":"NETCLI->CLI_NOME","name":"CLI_NOME","type":"C",
 *                  "len":40,"dec":0,"n":3,"visible":true}, ...],
 *       "allVisible":true}
 *
 * Every field, with `visible` already resolved -- the UI does not have to know
 * that "empty means all", which is the kind of rule that gets forgotten in one
 * of the two places that check it.
 */
FUNCTION Api_Fields_Available( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, hInfo, aVis, aEstru, aRet, cAlias, i, lTodas

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo  := SessHandle( cH )
   aVis   := Visiveis( hInfo )
   lTodas := Empty( aVis )
   cAlias := Alias()
   aEstru := dbStruct()
   aRet   := {}

   FOR i := 1 TO Len( aEstru )
      AAdd( aRet, { ;
         "key"     => cAlias + "->" + aEstru[ i ][ DBS_NAME ], ;
         "name"    => aEstru[ i ][ DBS_NAME ], ;
         "type"    => aEstru[ i ][ DBS_TYPE ], ;
         "len"     => aEstru[ i ][ DBS_LEN ], ;
         "dec"     => aEstru[ i ][ DBS_DEC ], ;
         "n"       => i, ;
         "visible" => lTodas .OR. AScan( aVis, {| c | c == aEstru[ i ][ DBS_NAME ] } ) > 0 } )
   NEXT

   RETURN Ok( { "fields" => aRet, "allVisible" => lTodas } )

/*
 * fields.select {"h":"h7","fields":["CLI_COD","CLI_NOME"]}
 *   -> {"visible":["CLI_COD","CLI_NOME"],"allVisible":false}
 *
 * An empty list goes back to showing everything -- it is "no filter", not "no
 * columns". Hiding every column would leave a grid with nothing on it and no
 * way back except reopening the file.
 *
 * ORDER IS THE CALLER'S: the grid shows the columns in the order they arrive
 * here, not in DBF order. Nothing in the UI reorders columns yet -- but sorting
 * the list here would make that impossible to add later without changing the
 * contract, and it costs nothing to keep.
 */
FUNCTION Api_Fields_Select( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL aPedido := ParArr( hP, "fields" )
   LOCAL xErro, hInfo, aNovo, cNome, aJa

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo := SessHandle( cH )
   aNovo := {}
   aJa   := {}

   FOR EACH cNome IN aPedido
      IF ! HB_ISSTRING( cNome )
         RETURN Err( "ERROR_PARAM_MUST_BE_LIST", "fields must be a list of names", "fields", ;
                        { "param" => "fields" } )
      ENDIF

      cNome := NomeSimples( cNome )

      IF FieldPos( cNome ) == 0
         RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "fields", ;
                     { "field" => cNome, "alias" => Alias() } )
      ENDIF

      /* Repetido nao e erro do usuario, e ruido: a coluna nao pode aparecer
         duas vezes, entao vale a primeira posicao e as outras somem. */
      IF AScan( aJa, {| c | c == cNome } ) == 0
         AAdd( aJa, cNome )
         AAdd( aNovo, cNome )
      ENDIF
   NEXT

   hInfo[ "visible" ] := aNovo
   SessBump()

   RETURN Ok( { "visible" => aNovo, "allVisible" => Empty( aNovo ) } )

/* fields.reset {"h":"h7"} -- volta a mostrar tudo. */
FUNCTION Api_Fields_Reset( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, hInfo

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo := SessHandle( cH )
   hInfo[ "visible" ] := {}
   SessBump()

   RETURN Ok( { "visible" => {}, "allVisible" => .T. } )

/* ------------------------------------------------------------------ shared */

/*
 * The handle's visible list, as an array of plain names.
 *
 * PUBLIC because api_data.prg reads it: data.page with no `fields` uses the
 * handle's selection. Without that the grid would have to resend the whole list
 * on every page, and one forgotten call would show hidden columns again.
 */
FUNCTION Visiveis( hInfo )

   IF ! HB_ISHASH( hInfo ) .OR. ! hb_HHasKey( hInfo, "visible" )
      RETURN {}
   ENDIF

   RETURN iif( HB_ISARRAY( hInfo[ "visible" ] ), hInfo[ "visible" ], {} )

/*
 * "NETCLI->CLI_NOME" -> "CLI_NOME".
 *
 * Accepts both forms: the UI sends back the `key` it received, and making it
 * strip the prefix first would be a trap that only shows up with the second
 * file open.
 */
FUNCTION NomeSimples( cNome )

   LOCAL c := Upper( AllTrim( hb_defaultValue( cNome, "" ) ) )

   IF "->" $ c
      c := SubStr( c, At( "->", c ) + 2 )
   ENDIF

   RETURN c

/* ----------------------------------------------------------------- helpers */

STATIC FUNCTION ParStr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )

STATIC FUNCTION ParArr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN {}
   ENDIF

   RETURN iif( HB_ISARRAY( hP[ cChave ] ), hP[ cChave ], {} )
