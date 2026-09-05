/*
 * api_data.prg - records: pagination (reading) and single-record writing (T8).
 *
 * A primeira metade LE, a segunda ESCREVE. A fronteira esta marcada por um
 * cabecalho la embaixo, e as regras da escrita moram nele.
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
#include "dbinfo.ch"

/* Response ceiling. A page of 500 x 366 fields is already a few MB of JSON;
   above that the fault is in the request, not in the file. */
#define QDBU_MAX_PAGE  500

/*
 * data.page {"h":"h7","anchor":"top","count":200}
 *           {"h":"h7","anchor":1234,"offset":1,"count":200}
 *
 *   anchor  "top" | "bottom" | recno
 *   offset  how many to skip from the anchor before collecting (may be
 *           negative -- that is how the previous page is asked for)
 *   count   how many records; ceiling QDBU_MAX_PAGE
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

   IF nQtd > QDBU_MAX_PAGE
      RETURN Err( "ERROR_PARAM_TOO_BIG", "count above the page limit", "count", ;
                  { "param" => "count", "value" => nQtd, "max" => QDBU_MAX_PAGE } )
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
   QDbu_JobBegin( JobMsg( "UI_JOB_SEARCHING" ), LastRec() )

   DO WHILE ! Eof()
      nLidos++
      xVal := ExprAvalia( bBloco, @lFalhou, @cIgnora )

      /* Registro em que a expressao estoura nao casa -- e nao interrompe a
         busca. Uma linha com dado ruim nao pode abortar a varredura inteira. */
      IF ! lFalhou .AND. HB_ISLOGICAL( xVal ) .AND. xVal
         QDbu_JobEnd()
         RETURN Ok( hb_HMerge( Posicao( cH ), { ;
            "found" => .T., "scanned" => nLidos, "canceled" => .F. } ) )
      ENDIF

      IF nLidos % 500 == 0
         QDbu_Progress( nLidos )
         IF QDbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   lParou := QDbu_Canceled()   /* antes do JobEnd, que zera o sinalizador */
   QDbu_JobEnd()

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

/* Hash vazio quando falta ou nao e hash. Quem exige o parametro confere o
   Empty() e monta a propria recusa -- aqui nao da para saber se a ausencia e
   erro (data.update sem `values`) ou o caso normal (data.append em branco). */
STATIC FUNCTION ParHash( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave ) .OR. ;
      ! HB_ISHASH( hP[ cChave ] )
      RETURN { => }
   ENDIF

   RETURN hP[ cChave ]


/* =====================================================================
 * T8 -- ESCRITA REGISTRO A REGISTRO
 *
 * O resto deste arquivo LE. Daqui para baixo ESCREVE, e a diferenca de risco e
 * de natureza: T10/T13/T14 alteram em bloco, fora do lugar, com backup e
 * pre-voo; aqui a pessoa digita um valor e ele vai para o arquivo do cliente
 * agora. Nao ha "entre registros completos" onde parar -- cada gravacao e
 * atomica por si.
 *
 * Tres regras que valem para tudo abaixo:
 *
 * 1. TRAVA POR REGISTRO, e nao pelo arquivo. `EmMassa()` usa FLock() porque
 *    percorre o arquivo, e uma escrita alheia no meio do caminho invalidaria o
 *    que ele acabou de ler. Aqui e o oposto: uma celula, um registro -- travar
 *    o arquivo inteiro para isso bloquearia todo mundo por causa de uma tecla.
 *
 * 2. VALOR QUE NAO CABE NO TIPO E RECUSADO, NUNCA CONVERTIDO. Mesma regra do
 *    filtro guiado, e aqui ela pesa mais: la um valor coagido dava resultado
 *    errado na tela, reversivel fechando a aba; aqui vira byte no disco.
 *    `C2Date()` devolve data vazia quando nao entende -- generosidade correta
 *    para importar um lote de milhares de linhas, e errada para uma celula,
 *    onde "nao entendi" tem de chegar a quem acabou de digitar.
 *
 * 3. O QUE NAO CABE NO CAMPO NAO E TRUNCADO EM SILENCIO. Um C(10) que recebe 15
 *    caracteres devolve recusa dizendo o tamanho. Gravar os 10 primeiros e
 *    perder os 5 seguintes sem avisar e a forma mais barata de corromper dado.
 * ===================================================================== */

/*
 * A coluna pelo nome, com a estrutura que a validacao precisa.
 * Devolve NIL quando o campo nao existe -- quem chama monta a recusa.
 */
STATIC FUNCTION ColunaPorNome( cNome )

   LOCAL aEstru, nPos

   cNome := NomeSimples( hb_defaultValue( cNome, "" ) )
   nPos := FieldPos( cNome )

   IF nPos == 0
      RETURN NIL
   ENDIF

   aEstru := dbStruct()

   RETURN DescreveColuna( Alias(), aEstru[ nPos ], nPos )

/*
 * So digitos, sinal, ponto e virgula -- o que C2Num sabe ler.
 *
 * Existe porque `Val()` nao distingue "0" de "abc": os dois devolvem 0. Sem
 * esta checagem, digitar "abc" num campo numerico gravaria zero em silencio, e
 * zero e um valor plausivel -- ninguem descobriria olhando a tela.
 */
STATIC FUNCTION ENumerico( cTxt )

   LOCAL i, c
   LOCAL lDigito := .F.

   FOR i := 1 TO Len( cTxt )
      c := SubStr( cTxt, i, 1 )
      DO CASE
      CASE c >= "0" .AND. c <= "9"
         lDigito := .T.
      CASE c $ ".,"
      CASE ( c == "+" .OR. c == "-" ) .AND. i == 1
      OTHERWISE
         RETURN .F.
      ENDCASE
   NEXT

   RETURN lDigito

/*
 * Converte o valor vindo do JSON para o tipo do campo, ou RECUSA.
 *
 * O JSON ja chega tipado (numero e numero, booleano e booleano), entao o caso
 * comum nem converte. Texto e aceito para todos os tipos porque e o que um
 * campo de edicao produz -- e ai valem as funcoes de conv.prg, com a diferenca
 * de que aqui o "nao entendi" volta como erro em vez de valor vazio.
 *
 * `xConv` sai com o valor pronto para o FieldPut.
 */
STATIC FUNCTION ValidaValor( hCol, xVal, xConv )

   LOCAL cTipo := hCol[ "type" ]
   LOCAL cTxt, cFmt

   xConv := NIL

   DO CASE
   CASE cTipo == "C"
      DO CASE
      CASE HB_ISSTRING( xVal )  ; cTxt := xVal
      CASE HB_ISNUMERIC( xVal ) ; cTxt := AllTrim( Str( xVal ) )
      CASE HB_ISLOGICAL( xVal ) ; cTxt := Bool2C( xVal )
      CASE HB_ISDATE( xVal )    ; cTxt := DToS( xVal )
      CASE xVal == NIL          ; cTxt := ""
      OTHERWISE
         RETURN Err( "ERROR_CELL_TYPE", "value does not fit the field type", "value", ;
                     { "field" => hCol[ "name" ], "type" => cTipo } )
      ENDCASE

      /* O tamanho e conferido AQUI e nao no FieldPut: o RDD trunca calado. */
      IF Len( cTxt ) > hCol[ "len" ]
         RETURN Err( "ERROR_CELL_TOO_LONG", "value longer than the field", "value", ;
                     { "field" => hCol[ "name" ], "len" => hCol[ "len" ], ;
                       "size" => Len( cTxt ) } )
      ENDIF

      xConv := cTxt

   CASE cTipo == "N"
      DO CASE
      CASE HB_ISNUMERIC( xVal )
         xConv := xVal
      CASE HB_ISSTRING( xVal )
         cTxt := AllTrim( xVal )
         IF Empty( cTxt )
            xConv := 0
         ELSE
            IF ! ENumerico( cTxt )
               RETURN Err( "ERROR_CELL_NOT_NUMBER", "not a number", "value", ;
                           { "field" => hCol[ "name" ], "value" => cTxt } )
            ENDIF
            xConv := C2Num( cTxt )
         ENDIF
      CASE xVal == NIL
         xConv := 0
      OTHERWISE
         RETURN Err( "ERROR_CELL_TYPE", "value does not fit the field type", "value", ;
                     { "field" => hCol[ "name" ], "type" => cTipo } )
      ENDCASE

      /* Nao cabe na largura: o RDD gravaria o campo cheio de asteriscos, que e
         perda silenciosa do numero que a pessoa digitou. */
      cFmt := Str( xConv, hCol[ "len" ], hCol[ "dec" ] )
      IF "*" $ cFmt
         RETURN Err( "ERROR_CELL_TOO_LONG", "number does not fit the field", "value", ;
                     { "field" => hCol[ "name" ], "len" => hCol[ "len" ], ;
                       "size" => Len( AllTrim( Str( xConv ) ) ) } )
      ENDIF

   CASE cTipo == "D"
      DO CASE
      CASE HB_ISDATE( xVal )
         xConv := xVal
      CASE HB_ISSTRING( xVal )
         cTxt := AllTrim( xVal )
         IF Empty( cTxt )
            xConv := hb_SToD( "" )
         ELSE
            xConv := C2Date( cTxt )
            /* C2Date devolve vazia quando nao entende. Numa celula isso tem de
               virar recusa: gravar vazio no lugar de "31/02/2026" apagaria a
               data que estava la sem ninguem ter pedido. */
            IF Empty( xConv )
               RETURN Err( "ERROR_CELL_NOT_DATE", "not a date", "value", ;
                           { "field" => hCol[ "name" ], "value" => cTxt } )
            ENDIF
         ENDIF
      CASE xVal == NIL
         xConv := hb_SToD( "" )
      OTHERWISE
         RETURN Err( "ERROR_CELL_TYPE", "value does not fit the field type", "value", ;
                     { "field" => hCol[ "name" ], "type" => cTipo } )
      ENDCASE

   CASE cTipo == "L"
      DO CASE
      CASE HB_ISLOGICAL( xVal ) ; xConv := xVal
      CASE HB_ISSTRING( xVal )  ; xConv := C2Bool( xVal )
      CASE HB_ISNUMERIC( xVal ) ; xConv := ( xVal != 0 )
      CASE xVal == NIL          ; xConv := .F.
      OTHERWISE
         RETURN Err( "ERROR_CELL_TYPE", "value does not fit the field type", "value", ;
                     { "field" => hCol[ "name" ], "type" => cTipo } )
      ENDCASE

   CASE cTipo $ "MP"
      DO CASE
      CASE HB_ISSTRING( xVal ) ; xConv := xVal
      CASE xVal == NIL         ; xConv := ""
      OTHERWISE
         RETURN Err( "ERROR_CELL_TYPE", "value does not fit the field type", "value", ;
                     { "field" => hCol[ "name" ], "type" => cTipo } )
      ENDCASE

   OTHERWISE
      RETURN Err( "ERROR_FIELD_TYPE_UNSUPPORTED", "field type cannot be edited", "value", ;
                  { "field" => hCol[ "name" ], "type" => cTipo } )
   ENDCASE

   RETURN NIL

/*
 * Trava o registro corrente para escrita, ou devolve a recusa.
 *
 * Em modo EXCLUSIVO o RDD dispensa a trava e `RLock()` devolve .T. de graca; em
 * compartilhado ele conversa com o sistema de arquivos. Nos dois casos a
 * chamada e a mesma -- e por isso nao ha `IF exclusivo` aqui.
 *
 * A recusa nomeia o REGISTRO, e nao so o arquivo: "outro usuario esta com este
 * arquivo" manda a pessoa procurar quem fechou o programa; "o registro 4.312
 * esta travado" diz que e so esperar um instante e repetir.
 */
STATIC FUNCTION TravaRegistro( cH )

   IF RLock()
      RETURN NIL
   ENDIF

   RETURN Err( "ERROR_CANNOT_LOCK_RECORD", "another user is holding this record", "h", ;
               { "file"  => hb_FNameNameExt( SessHandle( cH )[ "path" ] ), ;
                 "recno" => RecNo() } )

/*
 * Posiciona no registro pedido, conferindo que ele existe.
 *
 * `dbGoTo()` num numero fora da faixa nao estoura: ele leva para EOF, e uma
 * gravacao a partir dali escreveria no lugar errado sem aviso nenhum.
 */
STATIC FUNCTION VaiParaRegistro( nRec )

   IF ! HB_ISNUMERIC( nRec ) .OR. nRec < 1 .OR. nRec > LastRec()
      RETURN Err( "ERROR_RECORD_OUT_OF_RANGE", "record does not exist", "recno", ;
                  { "recno" => hb_defaultValue( nRec, 0 ), "max" => LastRec() } )
   ENDIF

   dbGoTo( nRec )

   IF Eof()
      RETURN Err( "ERROR_RECORD_OUT_OF_RANGE", "record does not exist", "recno", ;
                  { "recno" => nRec, "max" => LastRec() } )
   ENDIF

   RETURN NIL

/*
 * data.update {"h":"h7","recno":42,"values":{"CLI_NOME":"JOAO","CLI_LIM":1500}}
 *
 * -> {"h":"h7","recno":42,"changed":["CLI_NOME","CLI_LIM"],"row":{...}}
 *
 * TUDO OU NADA. Os valores sao validados ANTES de qualquer FieldPut: um lote
 * com tres campos certos e um errado nao grava os tres. Sem isto, corrigir a
 * recusa e reenviar gravaria os certos duas vezes -- inofensivo para texto,
 * mas nao para quem estivesse contando com a primeira tentativa nao ter valido.
 *
 * A LINHA VOLTA NA RESPOSTA (`row`), relida do arquivo depois de gravar. A UI
 * poderia repintar com o que digitou, e estaria repintando a INTENCAO em vez do
 * FATO: um C(10) que recebeu 10 caracteres exatos, um N(5,2) arredondado pelo
 * RDD, uma data normalizada -- todos voltam diferentes do que entrou. Mostrar o
 * que ficou no disco e o unico jeito de a tela nao mentir.
 */
FUNCTION Api_Data_Update( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL nRec    := ParNum( hP, "recno", 0 )
   LOCAL hVals   := ParHash( hP, "values" )
   LOCAL hExpect := ParHash( hP, "expect" )
   LOCAL xErro, hCol, cNome, xConv
   LOCAL aPares := {}, aNomes := {}, i

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( hVals )
      RETURN Err( "ERROR_PARAM_REQUIRED", "values is required", "values", ;
                  { "param" => "values" } )
   ENDIF

   IF ( xErro := VaiParaRegistro( nRec ) ) != NIL
      RETURN xErro
   ENDIF

   /* --- 1. valida TUDO antes de gravar QUALQUER COISA --- */
   FOR i := 1 TO Len( hVals )
      cNome := hb_HKeyAt( hVals, i )
      hCol := ColunaPorNome( cNome )

      IF hCol == NIL
         RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "values", ;
                     { "field" => cNome, "alias" => Alias() } )
      ENDIF

      IF ( xErro := ValidaValor( hCol, hb_HValueAt( hVals, i ), @xConv ) ) != NIL
         RETURN xErro
      ENDIF

      AAdd( aPares, { hCol[ "pos" ], xConv } )
      AAdd( aNomes, hCol[ "name" ] )
   NEXT

   /* --- 2. trava, CONFERE, grava, solta --- */
   IF ( xErro := TravaRegistro( cH ) ) != NIL
      RETURN xErro
   ENDIF

   /*
    * R8: o `expect` e conferido AQUI, com o registro travado. Antes do lock
    * ainda caberia uma escrita alheia entre conferir e gravar. Opcional: sem
    * `expect`, grava como sempre -- e o caso do append em branco, e o que
    * permite a grade adotar primeiro e o formulario depois.
    */
   IF ! Empty( hExpect ) .AND. ( xErro := ConfereExpect( hExpect ) ) != NIL
      dbUnlock()
      RETURN xErro
   ENDIF

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      FOR i := 1 TO Len( aPares )
         FieldPut( aPares[ i ][ 1 ], aPares[ i ][ 2 ] )
      NEXT
      dbCommit()
   RECOVER USING xErro
      dbUnlock()
      RETURN Err( "ERROR_WRITE_FAILED", "could not write the record", "h", ;
                  { "file"   => hb_FNameNameExt( SessHandle( cH )[ "path" ] ), ;
                    "recno"  => nRec, ;
                    "reason" => ErroTexto( xErro ) } )
   END SEQUENCE

   dbUnlock()
   SessBump()

   RETURN Ok( { "h"       => cH, ;
                "recno"   => nRec, ;
                "changed" => aNomes, ;
                "raw"     => RawDoRegistro(), ;
                "row"     => LinhaPedida( hP, cH ) } )

/*
 * data.append {"h":"h7","values":{"CLI_NOME":"NOVO"}}
 *
 * -> {"h":"h7","recno":1197,"row":{...},"records":1197}
 *
 * `values` e OPCIONAL: um registro em branco e um pedido legitimo -- o DBU
 * original insere vazio e deixa a pessoa preencher na grade.
 *
 * O registro nasce e SO DEPOIS recebe os valores, porque `dbAppend()` ja
 * devolve o registro travado. Se a validacao recusasse aqui, o registro em
 * branco ja estaria no arquivo -- por isso ela roda ANTES do append, como no
 * update.
 */
FUNCTION Api_Data_Append( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL hVals := ParHash( hP, "values" )
   LOCAL xErro, hCol, cNome, xConv
   LOCAL aPares := {}, i, nRec

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF ! Empty( hVals )
      FOR i := 1 TO Len( hVals )
         cNome := hb_HKeyAt( hVals, i )
         hCol := ColunaPorNome( cNome )

         IF hCol == NIL
            RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "values", ;
                        { "field" => cNome, "alias" => Alias() } )
         ENDIF

         IF ( xErro := ValidaValor( hCol, hb_HValueAt( hVals, i ), @xConv ) ) != NIL
            RETURN xErro
         ENDIF

         AAdd( aPares, { hCol[ "pos" ], xConv } )
      NEXT
   ENDIF

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbAppend()

      /* `NetErr()` depois do append e como o xBase avisa que nao conseguiu o
         lock do registro novo -- em rede, dois appends simultaneos disputam a
         mesma posicao. Sem esta checagem o FieldPut escreveria num registro que
         nao e nosso. */
      IF NetErr()
         Break( NIL )
      ENDIF

      FOR i := 1 TO Len( aPares )
         FieldPut( aPares[ i ][ 1 ], aPares[ i ][ 2 ] )
      NEXT
      dbCommit()
   RECOVER USING xErro
      dbUnlock()
      RETURN Err( "ERROR_APPEND_FAILED", "could not add the record", "h", ;
                  { "file"   => hb_FNameNameExt( SessHandle( cH )[ "path" ] ), ;
                    "reason" => iif( xErro == NIL, "", ErroTexto( xErro ) ) } )
   END SEQUENCE

   nRec := RecNo()
   dbUnlock()
   SessBump()

   RETURN Ok( { "h"       => cH, ;
                "recno"   => nRec, ;
                "row"     => LinhaPedida( hP, cH ), ;
                "records" => LastRec() } )

/*
 * data.delete {"h":"h7","recno":42,"expect":{...}}   marca
 * data.recall {"h":"h7","recno":42,"expect":{...}}   desmarca
 *
 * `expect` e opcional e tem o contrato do data.update (R8): os bytes crus que
 * `data.record` devolveu em `raw`; qualquer campo diferente no disco recusa
 * com ERROR_STALE_VALUE.
 *
 * MARCA, nao remocao -- e o motivo de os dois existirem em par. No xBase o
 * registro excluido continua no arquivo ate um PACK; a grade mostra tachado.
 * Chamar isto de "excluir" na tela e correto, desde que "recuperar" esteja do
 * lado -- o que o DBU original ja fazia.
 */
FUNCTION Api_Data_Delete( hP )
   RETURN MarcaRegistro( hP, .T. )

FUNCTION Api_Data_Recall( hP )
   RETURN MarcaRegistro( hP, .F. )

STATIC FUNCTION MarcaRegistro( hP, lExcluir )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL nRec    := ParNum( hP, "recno", 0 )
   LOCAL hExpect := ParHash( hP, "expect" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF ( xErro := VaiParaRegistro( nRec ) ) != NIL
      RETURN xErro
   ENDIF

   IF ( xErro := TravaRegistro( cH ) ) != NIL
      RETURN xErro
   ENDIF

   /* R8 tambem aqui: quem exclui decide olhando a linha. Se o registro mudou
      depois que a tela o leu, a decisao foi tomada sobre outro registro --
      e a marca so entra se o disco ainda for o que a pessoa viu. */
   IF ! Empty( hExpect ) .AND. ( xErro := ConfereExpect( hExpect ) ) != NIL
      dbUnlock()
      RETURN xErro
   ENDIF

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      IF lExcluir
         dbDelete()
      ELSE
         dbRecall()
      ENDIF
      dbCommit()
   RECOVER USING xErro
      dbUnlock()
      RETURN Err( "ERROR_WRITE_FAILED", "could not write the record", "h", ;
                  { "file"   => hb_FNameNameExt( SessHandle( cH )[ "path" ] ), ;
                    "recno"  => nRec, ;
                    "reason" => ErroTexto( xErro ) } )
   END SEQUENCE

   dbUnlock()
   SessBump()

   RETURN Ok( { "h"       => cH, ;
                "recno"   => nRec, ;
                "deleted" => Deleted(), ;
                "row"     => LinhaPedida( hP, cH ) } )

/*
 * NAO HA `data.memo`. Houve -- so leitura, para o editor pedir o conteudo de UM
 * memo, ja que `data.page` manda so o tamanho. Saiu em 04/09/2026 quando o
 * `data.record` (R8, abaixo) passou a trazer o texto do memo em `raw`, na
 * MESMA leitura que traz o registro: um metodo que ninguem chama e um caminho
 * que envelhece sem ninguem ver.
 *
 * GRAVAR memo continua sendo `data.update` com o campo memo em `values` --
 * `ValidaValor()` ja trata "M". Duas razoes para nao existir outro caminho:
 *
 *   - O log registra por METODO, no gancho do dispatcher. Um metodo que ora le
 *     ora escreve poria uma linha em `.qdbu/log` toda vez que alguem ABRISSE um
 *     memo para olhar, e "so entra o que muda bytes" e o criterio que faz esse
 *     log ser lido. Foi por gerar linha a toa que `file.open` saiu da lista.
 *   - Um caminho de escrita so. `data.update` ja valida, trava, grava e devolve
 *     a linha relida; um segundo caminho para o mesmo fim teria de repetir isso
 *     e envelheceria em separado.
 */

/* =====================================================================
 * R8 -- O QUE SE EDITA TEM DE SER O QUE ESTA NO DISCO
 *
 * Duas pecas, e a regra que as une esta em docs/10-integridade.md, R8:
 *
 *   data.record  -> le UM registro AGORA, e devolve alem dos valores os BYTES
 *                   CRUS de cada campo. E o que a UI chama ao abrir o editor.
 *   expect       -> o data.update recebe esses bytes de volta e so grava se o
 *                   disco ainda for igual a eles -- conferido DENTRO do RLock.
 *
 * POR QUE BYTES E NAO VALORES. FieldGet() achata estados diferentes do disco:
 * num N(12,2), "nunca preenchido" (espacos), "zero" (0.00) e "nao coube"
 * (asteriscos) sao tres bytes distintos que voltam todos como 0.00 -- e o RDD
 * produz os tres com APPEND BLANK e REPLACE, sem ninguem escrever byte a byte.
 * Um expect por valor deixaria passar a mudanca entre eles. Os bytes nao.
 *
 * TUDO PELO RDD. `dbRecordInfo( DBRI_RAWRECORD )` e API do RDD, da mesma
 * familia de dbInfo(): devolve o buffer do registro como o RDD o mantem. Nao
 * ha FSeek/FRead em lugar nenhum. Medido em 04/09/2026 em modo COMPARTILHADO:
 * depois de outra area gravar, dbGoTo + RAWRECORD traz os bytes novos.
 *
 * MEMO vem de FieldGet(). No registro, o campo M guarda so o NUMERO DO BLOCO no
 * .DBT -- e assim que o xBase funciona. Reescrever o texto dentro do mesmo
 * bloco nao muda esses 10 bytes, entao os bytes crus nao servem; o texto que
 * FieldGet() traz pelo RDD serve, e memo e texto, que nao achata.
 * ===================================================================== */

/*
 * Posicao do campo dentro do buffer do registro: 1 e a marca de exclusao, e
 * cada campo comeca onde o anterior terminou. Vem da estrutura, nao de conta
 * feita a mao -- e por isso vale para qualquer arquivo.
 */
STATIC FUNCTION OffsetDoCampo( nPos, aEstru )

   LOCAL nOff := 2, i

   /* `aEstru` vem de quem ja tem a estrutura em maos. `dbStruct()` MONTA um
      array novo a cada chamada -- num NETEST.DBF de 126 colunas sao 126 arrays
      de 126 elementos por registro lido, e data.record roda a cada editor
      aberto e a cada ciclo do refresh automatico. */
   IF aEstru == NIL
      aEstru := dbStruct()
   ENDIF

   FOR i := 1 TO nPos - 1
      nOff += aEstru[ i ][ DBS_LEN ]
   NEXT

   RETURN nOff

/*
 * Os bytes crus do campo, como estao no disco, OU o texto quando e memo.
 * `cRaw` e o buffer do registro ja lido -- quem chama le uma vez e reusa.
 * `aEstru` idem: opcional, so para nao remontar a estrutura por campo.
 */
STATIC FUNCTION BytesDoCampo( hCol, cRaw, aEstru )

   IF hCol[ "type" ] $ "MP"
      RETURN hb_defaultValue( FieldGet( hCol[ "pos" ] ), "" )
   ENDIF

   RETURN SubStr( cRaw, OffsetDoCampo( hCol[ "pos" ], aEstru ), hCol[ "len" ] )

/*
 * Os bytes de TODOS os campos do registro corrente, por nome.
 * Todos, e nao so os visiveis: o formulario mostra todos, e o custo e o
 * tamanho do registro -- que ja esta em memoria.
 */
STATIC FUNCTION RawDoRegistro()

   LOCAL cRaw := dbRecordInfo( DBRI_RAWRECORD )
   LOCAL aEstru := dbStruct()
   LOCAL hRaw := { => }
   LOCAL i, hCol

   hb_HKeepOrder( hRaw, .T. )

   FOR i := 1 TO Len( aEstru )
      hCol := DescreveColuna( Alias(), aEstru[ i ], i )
      hRaw[ hCol[ "name" ] ] := BytesDoCampo( hCol, cRaw, aEstru )
   NEXT

   RETURN hRaw

/*
 * data.record {"h":"h7","recno":42,"fields":[...]}
 *
 * -> {"h":"h7","recno":42,"row":{...},"cols":[...],"records":421714,
 *     "raw":{"TXT":"JOAO      ","NUM":"        0.00",...}}
 *
 * Le UM registro AGORA. E o que a UI chama ao abrir o editor: o que se edita
 * tem de vir do disco, nao da pagina em memoria -- que pode ter envelhecido
 * enquanto outro usuario gravava.
 *
 * NAO usa dbSkip. `data.page` para DEPOIS da ultima linha (e o comportamento
 * documentado dele, e o motivo de nao servir como sonda); este posiciona com
 * dbGoTo e fica ali, porque o registro corrente e o que Excluir/Recuperar vao
 * usar em seguida.
 *
 * `row` vem no formato de `data.page`, com as colunas VISIVEIS -- e o que a
 * grade repinta. `raw` traz TODOS os campos, porque e o que vai voltar como
 * `expect`, e o formulario edita qualquer um.
 */
FUNCTION Api_Data_Record( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL nRec    := ParNum( hP, "recno", 0 )
   LOCAL aCampos := ParArr( hP, "fields" )
   LOCAL xErro, aCols

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   /* Mesma regra do data.page: sem `fields`, as visiveis. */
   IF Empty( aCampos )
      aCampos := Visiveis( SessHandle( cH ) )
   ENDIF

   IF ( xErro := SelecionaColunas( aCampos, @aCols ) ) != NIL
      RETURN xErro
   ENDIF

   IF ( xErro := VaiParaRegistro( nRec ) ) != NIL
      RETURN xErro
   ENDIF

   /* `cols` e `records` vem junto para o formulario poder viver so disto,
      sem um data.page ao lado -- row e raw tem de sair da MESMA leitura. */
   RETURN Ok( { "h"       => cH, ;
                "recno"   => nRec, ;
                "row"     => LinhaDe( aCols ), ;
                "cols"    => aCols, ;
                "records" => LastRec(), ;
                "raw"     => RawDoRegistro() } )

/*
 * Confere o `expect` contra o disco. Chamada DENTRO do RLock, antes do
 * FieldPut: fora dele ainda caberia uma escrita alheia entre conferir e gravar,
 * que e exatamente a corrida que se quer fechar.
 *
 * Devolve NIL se tudo bate, ou a recusa com os DOIS lados -- `expected` e
 * `actual` como a tela mostra, e `raw` para a UI poder reenviar se a pessoa
 * decidir gravar por cima sabendo do que se trata.
 *
 * Os dois lados saem de ValorDeBytes(), e nao um de ValorDoCampo(): para memo
 * este devolve {memo,len} -- e a pergunta mostrava "[object Object]" no lugar
 * do texto (visto no CDP em 04/09/2026).
 */
STATIC FUNCTION ConfereExpect( hExpect )

   LOCAL cRaw := dbRecordInfo( DBRI_RAWRECORD )
   LOCAL aEstru := dbStruct()
   LOCAL i, cNome, hCol, cEsperado, cAtual

   FOR i := 1 TO Len( hExpect )
      cNome := hb_HKeyAt( hExpect, i )
      hCol := ColunaPorNome( cNome )

      IF hCol == NIL
         RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "expect", ;
                     { "field" => cNome, "alias" => Alias() } )
      ENDIF

      cEsperado := hb_HValueAt( hExpect, i )
      IF ! HB_ISSTRING( cEsperado )
         RETURN Err( "ERROR_PARAM_MUST_BE_STRING", "expect must carry raw bytes", "expect", ;
                     { "param" => "expect", "field" => cNome } )
      ENDIF

      cAtual := BytesDoCampo( hCol, cRaw, aEstru )

      IF ! ( cAtual == cEsperado )
         RETURN Err( "ERROR_STALE_VALUE", "the field changed since it was read", "value", ;
                     { "field"    => hCol[ "name" ], ;
                       "expected" => ValorDeBytes( hCol, cEsperado ), ;
                       "actual"   => ValorDeBytes( hCol, cAtual ), ;
                       "raw"      => cAtual } )
      ENDIF
   NEXT

   RETURN NIL

/*
 * O valor que a tela mostraria para uns bytes crus -- para a recusa poder
 * dizer "era X, agora e Y" com os dois lados no mesmo formato. Memo ja e o
 * texto; os outros passam pela mesma normalizacao de ValorDoCampo(), so que
 * sobre os bytes recebidos em vez do FieldGet.
 */
STATIC FUNCTION ValorDeBytes( hCol, cBytes )

   DO CASE
   CASE hCol[ "type" ] $ "MP" ; RETURN cBytes
   CASE hCol[ "type" ] == "N" ; RETURN Val( cBytes )
   CASE hCol[ "type" ] == "D" ; RETURN iif( Empty( hb_SToD( cBytes ) ), "", ;
                                       hb_DToC( hb_SToD( cBytes ), "YYYY-MM-DD" ) )
   CASE hCol[ "type" ] == "L" ; RETURN Upper( cBytes ) $ "TY"
   ENDCASE

   RETURN RTrim( cBytes )

/*
 * A linha corrente no mesmo formato de `data.page`, para a UI repintar sem
 * pedir a pagina inteira de volta.
 *
 * Respeita a selecao de colunas do handle: devolver campos escondidos faria a
 * linha nova ter mais celulas que as vizinhas.
 */
/*
 * A linha como quem chamou a QUER: com as colunas de `fields` quando o
 * parametro veio, senao as visiveis -- a mesma regra do data.page.
 *
 * O formulario manda TODOS os campos e indexa a resposta pela propria lista;
 * uma linha so com as visiveis o faria ler a coluna errada assim que alguem
 * escondesse uma na grade. A grade nao manda nada e recebe as visiveis.
 */
STATIC FUNCTION LinhaPedida( hP, cH )

   LOCAL aCampos := ParArr( hP, "fields" )
   LOCAL aCols

   IF Empty( aCampos )
      aCampos := Visiveis( SessHandle( cH ) )
   ENDIF

   IF SelecionaColunas( aCampos, @aCols ) != NIL
      RETURN NIL
   ENDIF

   RETURN LinhaDe( aCols )

STATIC FUNCTION LinhaDe( aCols )

   LOCAL aValores := {}
   LOCAL hCol

   FOR EACH hCol IN aCols
      AAdd( aValores, ValorDoCampo( hCol ) )
   NEXT

   RETURN { "recno" => RecNo(), "deleted" => Deleted(), "values" => aValores }
