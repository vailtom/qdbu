/*
 * api_data.prg - reading records: pagination.
 *
 * ANCHOR + OFFSET, NEVER AN ABSOLUTE OFFSET. The page is asked for as
 * "starting at record N, skip K, give me C records", and is served with
 * dbGoTo(N) -> dbSkip(K) -> C x dbSkip(1).
 *
 * The reason is that an absolute offset does not survive an index or a filter:
 * "the 5000th record" only means something in the current traversal order, and
 * recomputing it means walking the file from the top on every page. With an
 * anchor, the caller keeps the recno of the first row it has and asks for what
 * comes after it -- and that stays correct once index (T5) and filter (T6)
 * arrive, without touching this file.
 *
 * Not the same thing as recno: under an index, dbSkip(1) follows the index, not
 * the physical order. RecNo() is the identity of the row, never its position.
 */

#include "dbstruct.ch"

/* Response ceiling. A page of 500 x 366 fields is already a few MB of JSON;
   above that the fault is in the request, not in the file. */
#define DBU_MAX_PAGE  500

/*
 * data.page {"h":"h7","anchor":"top","count":200}
 *           {"h":"h7","anchor":1234,"offset":1,"count":200}
 *
 *   anchor  "top" | "bottom" | recno
 *   offset  how many to skip from the anchor before collecting (may be
 *           negative -- that is how the previous page is asked for)
 *   count   how many records; ceiling DBU_MAX_PAGE
 *   fields  (optional) field names to read; default all of them
 *
 * -> {"rows":[{"recno":1,"deleted":false,"values":[...]}, ...],
 *     "cols":[{"key":"NETCLI->CLI_NOME","name":"CLI_NOME","type":"C",...}],
 *     "first":1,"last":200,"records":421714,"bof":false,"eof":false,
 *     "readAt":"2026-08-31 14:32:07"}
 */
FUNCTION Api_Data_Page( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL xAncora := iif( hb_HHasKey( hP, "anchor" ), hP[ "anchor" ], "top" )
   LOCAL nDesloc := ParNum( hP, "offset", 0 )
   LOCAL nQtd    := ParNum( hP, "count", 100 )
   LOCAL aCampos := ParArr( hP, "fields" )

   LOCAL xErro, aCols, aLinhas, nTotal, lBof, lEof, nPrim, nUlt

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF nQtd < 1
      RETURN Err( "ERROR_PARAM_TOO_SMALL", "count must be >= 1", "count", ;
                  { "param" => "count", "min" => 1 } )
   ENDIF

   IF nQtd > DBU_MAX_PAGE
      RETURN Err( "ERROR_PARAM_TOO_BIG", "count above the page limit", "count", ;
                  { "param" => "count", "value" => nQtd, "max" => DBU_MAX_PAGE } )
   ENDIF

   /* Sem `fields` explicito vale a selecao guardada no handle (T4). Assim a
      grade nao precisa reenviar a lista a cada pagina -- e uma chamada que
      esquecesse de mandar nao traria de volta as colunas escondidas. */
   IF Empty( aCampos )
      aCampos := Visiveis( SessHandle( cH ) )
   ENDIF

   IF ( xErro := SelecionaColunas( aCampos, @aCols ) ) != NIL
      RETURN xErro
   ENDIF

   IF ( xErro := PosicionaNaAncora( xAncora, nDesloc ) ) != NIL
      RETURN xErro
   ENDIF

   aLinhas := ColheLinhas( nQtd, aCols )

   /* Read AFTER walking: bof/eof describe where the traversal stopped. */
   nTotal := LastRec()
   lBof   := Bof()
   lEof   := Eof()

   nPrim := iif( Empty( aLinhas ), 0, aLinhas[ 1 ][ "recno" ] )
   nUlt  := iif( Empty( aLinhas ), 0, ATail( aLinhas )[ "recno" ] )

   RETURN Ok( { ;
      "rows"    => aLinhas, ;
      "cols"    => aCols, ;
      "first"   => nPrim, ;
      "last"    => nUlt, ;
      "records" => nTotal, ;
      "bof"     => lBof, ;
      "eof"     => lEof, ;
      "readAt"  => Agora() } )

/*
 * data.goto {"h":"h7","recno":1234}
 *
 * Positions and reports, without bringing a page: the UI asks for the page
 * separately, anchored on the record it landed on.
 */
FUNCTION Api_Data_Goto( hP )

   LOCAL cH   := ParStr( hP, "h" )
   LOCAL nRec := ParNum( hP, "recno", 0 )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF nRec < 1 .OR. nRec > LastRec()
      RETURN Err( "ERROR_PARAM_OUT_OF_RANGE", "record number out of range", "recno", ;
                  { "param" => "recno", "value" => nRec, ;
                    "min" => 1, "max" => LastRec() } )
   ENDIF

   dbGoTo( nRec )

   RETURN Ok( { "recno" => RecNo(), "deleted" => Deleted(), ;
                "records" => LastRec(), "bof" => Bof(), "eof" => Eof() } )

/* --------------------------------------------------------------- navegar */

/*
 * data.skip {"h":"h7","n":-1}
 *
 * Passo relativo, na ordem VIGENTE -- indice e filtro incluidos. Serve para as
 * setas e para o Ctrl+seta; a grade usa data.page com ancora para blocos.
 */
FUNCTION Api_Data_Skip( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL nN := ParNum( hP, "n", 1 )
   LOCAL xErro, i

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   FOR i := 1 TO Abs( nN )
      dbSkip( iif( nN > 0, 1, -1 ) )
      IF Eof() .OR. Bof()
         EXIT
      ENDIF
   NEXT

   /* Bof() deixa o cursor ANTES do primeiro e Eof() num registro fantasma:
      nenhum dos dois e posicao valida para a grade ancorar. */
   IF Eof()
      dbGoBottom()
   ELSEIF Bof()
      dbGoTop()
   ENDIF

   RETURN Ok( Posicao( cH ) )

/* data.top / data.bottom -- extremos da ordem vigente, nao do arquivo. */
FUNCTION Api_Data_Top( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   dbGoTop()

   RETURN Ok( Posicao( cH ) )

FUNCTION Api_Data_Bottom( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   dbGoBottom()

   RETURN Ok( Posicao( cH ) )

/*
 * data.seek {"h":"h7","value":"SILVA","soft":true}
 *
 * SOFT POR PADRAO -- porte do ajuste feito no DBU original em 25-12-2001
 * (DBUEDIT.PRG:737-748), que acrescentou SOFT aos tres tipos e trocou o teste
 * de Found() por !Eof().
 *
 * A diferenca importa: sem soft, procurar SILVA num indice que so tem SILVEIRA
 * devolve "nao encontrado" e devolve o cursor para onde estava -- o usuario nao
 * descobre que estava a uma linha do que queria. Com soft, o cursor para no
 * proximo maior e a resposta diz que foi aproximado.
 *
 * Exige ORDEM ATIVA: seek e busca por indice. Sem indice, o certo e dizer isso
 * e apontar data.locate, nao varrer o arquivo fingindo que era a mesma coisa.
 */
FUNCTION Api_Data_Seek( hP )

   LOCAL cH     := ParStr( hP, "h" )
   LOCAL cValor := ParStr( hP, "value" )
   LOCAL lSoft  := ParLog( hP, "soft", .T. )
   LOCAL xErro, cTipo, xChave, nRec, lAchou

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF IndexOrd() == 0
      RETURN Err( "ERROR_NO_ACTIVE_ORDER", "seek needs an active index", "h", { => } )
   ENDIF

   /* Len() e nao Empty(): Empty() considera vazia a string so com espaco em
      branco, e procurar por espaco num indice de texto e legitimo -- e como se
      acham os registros com o campo em branco. */
   IF Len( cValor ) == 0
      RETURN Err( "ERROR_PARAM_REQUIRED", "value is required", "value", { "param" => "value" } )
   ENDIF

   /* O tipo vem da EXPRESSAO DO INDICE, nao do que o usuario digitou: procurar
      2024 num indice de data e procurar uma data, e comparar texto com data
      nao acha nada nem avisa. */
   cTipo := Type( ordKey() )

   SWITCH cTipo
   CASE "C" ; xChave := cValor ; EXIT
   CASE "N" ; xChave := Val( cValor ) ; EXIT
   CASE "D" ; xChave := TextoParaData( cValor ) ; EXIT
   OTHERWISE
      RETURN Err( "ERROR_SEEK_BAD_KEY_TYPE", "index key type cannot be searched", "value", ;
                  { "type" => cTipo } )
   ENDSWITCH

   IF cTipo == "D" .AND. Empty( xChave )
      RETURN Err( "ERROR_BAD_DATE", "invalid date", "value", { "value" => cValor } )
   ENDIF

   nRec := RecNo()

   dbSeek( xChave, lSoft )

   /* !Eof() em vez de Found(): com soft, a chave exata pode nao existir e ainda
      assim o cursor parou num registro util. Testar Found() jogaria fora
      justamente o que o soft foi buscar. */
   lAchou := ! Eof()

   IF ! lAchou
      dbGoTo( nRec )
      RETURN Ok( { "found" => .F., "exact" => .F., "near" => .F., ;
                   "recno" => RecNo(), "key" => ordKey() } )
   ENDIF

   /* `exact`/`near` dizem tudo o que a frase dizia, e sem idioma dentro. */
   RETURN Ok( hb_HMerge( Posicao( cH ), { ;
      "found"   => .T., ;
      "exact"   => Found(), ;
      "near"    => ! Found(), ;
      "key"     => ordKey() } ) )

/*
 * data.locate {"h":"h7","expr":"...","from":"current"}
 *
 * Busca SEM indice, percorrendo o arquivo inteiro. Roda como TAREFA: publica
 * progresso e consulta cancelamento a cada 500 registros, entao a UI mostra a
 * barra e o botao de parar enquanto a varredura corre.
 *
 * `scanned` diz quantos foram lidos e `canceled` se alguem mandou parar --
 * "nao encontrado" e "parei antes de terminar" sao respostas diferentes.
 */
FUNCTION Api_Data_Locate( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cExpr := ParStr( hP, "expr" )
   LOCAL cDe   := ParStr( hP, "from" )
   LOCAL xErro, hDiag, bBloco, cErro := "", nRec, nLidos, lFalhou := .F.
   LOCAL xVal, cIgnora := "", lParou

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( AllTrim( cExpr ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "search condition is required", "expr", ;
                  { "param" => "expr" } )
   ENDIF

   hDiag := ExprDiagnostico( cH, cExpr, "L" )

   IF ! hDiag[ "ok" ]
      RETURN Err( "ERROR_EXPR_INVALID", hDiag[ "error" ], "expr" )
   ENDIF

   IF hDiag[ "evaluated" ] .AND. ! hDiag[ "typeOk" ]
      RETURN Err( "ERROR_EXPR_NOT_LOGICAL", "condition must be logical", "expr", ;
                  { "type" => hDiag[ "type" ] } )
   ENDIF

   bBloco := ExprCompila( cH, cExpr, @cErro )
   IF bBloco == NIL
      RETURN Err( "ERROR_EXPR_INVALID", cErro, "expr" )
   ENDIF

   nRec := RecNo()

   /*
    * De onde comecar. `from` aceita "top", "current" ou um RECNO.
    *
    * O recno explicito existe porque data.page deixa o cursor no fim da pagina
    * que acabou de ler -- entao "current" depois de paginar significa "fim do
    * bloco visivel", nao "onde o usuario esta". Procurar a proxima ocorrencia
    * saltava o resto da pagina e dizia "nao encontrado" com o arquivo cheio de
    * ocorrencias. Quem chama sabe em que registro parou; que diga.
    */
   IF Lower( cDe ) == "top"
      dbGoTop()
   ELSE
      IF Val( cDe ) > 0
         dbGoTo( Val( cDe ) )
      ENDIF
      /* Do registro SEGUINTE: senao procurar de novo acha o mesmo para sempre. */
      dbSkip( 1 )
   ENDIF

   nLidos := 0

   /* SEM TETO desde a T12: a varredura roda como tarefa, com progresso e
      cancelamento por fora da VM. O que impedia percorrer 421 mil registros nao
      era o tempo, e sim a UI ficar sem resposta e sem saida. */
   Dbu_JobBegin( JobMsg( "UI_JOB_SEARCHING" ), LastRec() )

   DO WHILE ! Eof()
      nLidos++
      xVal := ExprAvalia( bBloco, @lFalhou, @cIgnora )

      /* Registro em que a expressao estoura nao casa -- e nao interrompe a
         busca. Uma linha com dado ruim nao pode abortar a varredura inteira. */
      IF ! lFalhou .AND. HB_ISLOGICAL( xVal ) .AND. xVal
         Dbu_JobEnd()
         RETURN Ok( hb_HMerge( Posicao( cH ), { ;
            "found" => .T., "scanned" => nLidos, "canceled" => .F. } ) )
      ENDIF

      IF nLidos % 500 == 0
         Dbu_Progress( nLidos )
         IF Dbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   lParou := Dbu_Canceled()   /* antes do JobEnd, que zera o sinalizador */
   Dbu_JobEnd()

   /* Nao achou: devolve o cursor. Deixar o usuario no fim do arquivo depois de
      uma busca frustrada perde o lugar em que ele estava. */
   dbGoTo( nRec )

   /* Sem "message": a frase se monta no JS, a partir de `canceled` e `scanned`.
      Montar aqui devolveria portugues fixo -- o mesmo motivo que tirou o texto
      de dentro de Err(). Ver src/util/err.prg. */
   RETURN Ok( hb_HMerge( Posicao( cH ), { ;
      "found"    => .F., ;
      "scanned"  => nLidos, ;
      "canceled" => lParou } ) )

/* ------------------------------------------------------------------ helpers */

/* Onde o cursor esta, do jeito que a grade precisa para ancorar. */
STATIC FUNCTION Posicao( cH )
   RETURN { "h" => cH, "recno" => RecNo(), "deleted" => Deleted(), ;
            "records" => LastRec(), "bof" => Bof(), "eof" => Eof(), ;
            "order" => IndexOrd() }

/* Aceita AAAA-MM-DD e DD/MM/AAAA; vazio quando nao e nenhum dos dois. */
STATIC FUNCTION TextoParaData( cTxt )

   LOCAL c := AllTrim( hb_defaultValue( cTxt, "" ) )

   IF Len( c ) == 10 .AND. SubStr( c, 3, 1 ) == "/"
      RETURN hb_SToD( SubStr( c, 7, 4 ) + SubStr( c, 4, 2 ) + SubStr( c, 1, 2 ) )
   ENDIF

   RETURN hb_SToD( StrTran( StrTran( c, "-", "" ), "/", "" ) )



/*
 * Places the cursor at the anchor and applies the offset.
 *
 * dbSkip in a loop, not dbGoTo(recno + n): under an index the physical number
 * says nothing about the traversal, and dbSkip is what respects order and
 * filter. The cost is the same as what the RDD would do anyway.
 */
STATIC FUNCTION PosicionaNaAncora( xAncora, nDesloc )

   LOCAL i

   DO CASE
   CASE HB_ISSTRING( xAncora ) .AND. Lower( xAncora ) == "top"
      dbGoTop()

   CASE HB_ISSTRING( xAncora ) .AND. Lower( xAncora ) == "bottom"
      dbGoBottom()

   CASE HB_ISNUMERIC( xAncora )
      IF xAncora < 1 .OR. xAncora > LastRec()
         RETURN Err( "ERROR_PARAM_OUT_OF_RANGE", "anchor out of range", "anchor", ;
                     { "param" => "anchor", "value" => xAncora, ;
                       "min" => 1, "max" => LastRec() } )
      ENDIF
      dbGoTo( xAncora )

   OTHERWISE
      RETURN Err( "ERROR_BAD_ANCHOR", "anchor must be top, bottom or a record number", ;
                  "anchor", { => } )
   ENDCASE

   IF nDesloc != 0
      FOR i := 1 TO Abs( nDesloc )
         dbSkip( iif( nDesloc > 0, 1, -1 ) )
         IF Eof() .OR. Bof()
            EXIT
         ENDIF
      NEXT

      /* dbSkip(-1) at the top leaves Bof() with the cursor on record 1 already;
         going past the end leaves Eof(), where there is nothing to read. Both
         are normal ends of travel, not errors. */
      IF Eof()
         dbGoBottom()
      ELSEIF Bof()
         dbGoTop()
      ENDIF
   ENDIF

   RETURN NIL

/*
 * Walks forward collecting rows. Stops at eof -- asking for 200 with 30 left
 * returns 30, and `eof` in the response says why.
 */
STATIC FUNCTION ColheLinhas( nQtd, aCols )

   LOCAL aRet := {}
   LOCAL i, aValores, hCol

   FOR i := 1 TO nQtd
      IF Eof()
         EXIT
      ENDIF

      aValores := {}
      FOR EACH hCol IN aCols
         AAdd( aValores, ValorDoCampo( hCol ) )
      NEXT

      AAdd( aRet, { "recno" => RecNo(), "deleted" => Deleted(), ;
                    "values" => aValores } )

      dbSkip( 1 )
   NEXT

   RETURN aRet

/*
 * One field, formatted by type.
 *
 * C   string, trailing blanks trimmed on the right only -- a leading space may
 *     be data, and the DBF pads to the right
 * N   number
 * D   ISO "AAAA-MM-DD", empty date as ""; the UI formats for display. Sending
 *     DToC() would hand over a date in the machine's SET DATE and be ambiguous
 * L   boolean
 * M   NOT the content: {"memo":true,"len":n}. A page of 200 memos would be
 *     megabytes; the editor asks for the one it needs (T8)
 */
STATIC FUNCTION ValorDoCampo( hCol )

   LOCAL xVal := FieldGet( hCol[ "pos" ] )

   DO CASE
   CASE hCol[ "type" ] $ "MP"
      RETURN { "memo" => .T., "len" => Len( hb_defaultValue( xVal, "" ) ) }

   CASE HB_ISSTRING( xVal )
      RETURN RTrim( xVal )

   CASE HB_ISDATE( xVal )
      RETURN iif( Empty( xVal ), "", hb_DToC( xVal, "YYYY-MM-DD" ) )

   ENDCASE

   RETURN xVal

/*
 * Builds the column list, honouring the requested subset.
 *
 * `key` is ALIAS->FIELD from day one: with the grid showing more than one file
 * later, "CODIGO" alone stops identifying anything, and retrofitting the prefix
 * would break every profile already saved.
 */
STATIC FUNCTION SelecionaColunas( aPedidos, aCols )

   LOCAL cAlias := Alias()
   LOCAL aEstru := dbStruct()
   LOCAL cNome, nPos, i

   aCols := {}

   IF Empty( aPedidos )
      FOR i := 1 TO Len( aEstru )
         AAdd( aCols, DescreveColuna( cAlias, aEstru[ i ], i ) )
      NEXT
      RETURN NIL
   ENDIF

   FOR EACH cNome IN aPedidos
      IF ! HB_ISSTRING( cNome )
         RETURN Err( "ERROR_PARAM_MUST_BE_LIST", "fields must be a list of names", "fields", ;
                     { "param" => "fields" } )
      ENDIF

      cNome := NomeSimples( cNome )   /* api_fields.prg */

      nPos := FieldPos( cNome )
      IF nPos == 0
         RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "fields", ;
                     { "field" => cNome, "alias" => cAlias } )
      ENDIF

      AAdd( aCols, DescreveColuna( cAlias, aEstru[ nPos ], nPos ) )
   NEXT

   RETURN NIL

STATIC FUNCTION DescreveColuna( cAlias, aField, nPos )
   RETURN { ;
      "key"  => cAlias + "->" + aField[ DBS_NAME ], ;
      "name" => aField[ DBS_NAME ], ;
      "type" => aField[ DBS_TYPE ], ;
      "len"  => aField[ DBS_LEN ], ;
      "dec"  => aField[ DBS_DEC ], ;
      "pos"  => nPos }

/* Timestamp of the read, for the `Last Refresh` in the bottom bar: it says
   whether what is on screen is from now or from ten minutes ago. */
STATIC FUNCTION Agora()
   RETURN hb_TToC( hb_DateTime(), "YYYY-MM-DD", "HH:MM:SS" )

STATIC FUNCTION ParStr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )

STATIC FUNCTION ParNum( hP, cChave, nPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN nPadrao
   ENDIF

   RETURN iif( HB_ISNUMERIC( hP[ cChave ] ), hP[ cChave ], nPadrao )

STATIC FUNCTION ParLog( hP, cChave, lPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN lPadrao
   ENDIF

   RETURN iif( HB_ISLOGICAL( hP[ cChave ] ), hP[ cChave ], lPadrao )

STATIC FUNCTION ParArr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN {}
   ENDIF

   RETURN iif( HB_ISARRAY( hP[ cChave ] ), hP[ cChave ], {} )
