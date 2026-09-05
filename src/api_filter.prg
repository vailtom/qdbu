/*
 * api_filter.prg - filtro sobre a work area.
 *
 * SET FILTER do xBase nao remove registros: ele faz dbSkip() pular os que nao
 * casam. Entao a paginacao por ancora continua valendo sem mudanca nenhuma --
 * foi para isto que ela foi desenhada assim.
 *
 * O que NAO da para ter de graca: quantos registros restaram. Com filtro ativo,
 * LastRec() continua sendo o total FISICO do arquivo, e saber o filtrado exige
 * percorrer tudo. Por isso a contagem e um pedido separado (filter.count) -- e a
 * UI mostra "?" ate alguem pedir, em vez de mentir um numero.
 *
 * Desde a T12 nao ha teto: a contagem roda como tarefa, com progresso e
 * cancelamento por fora da VM (src/bridge/progress.c).
 */

#include "dbinfo.ch"

/* Quantos valores distintos o "Suggested Values" oferece, e quantos registros
   ele varre para achar. Ler o arquivo inteiro para popular um combo seria
   trocar uma comodidade por um congelamento. */
#define QDBU_SUG_VALORES    50
#define QDBU_SUG_VARREDURA  5000

/* ------------------------------------------------------------------ aplicar */

/*
 * filter.set {"h":"h7","expr":"CLI_EST == 'SP'"}
 *
 * Exige tipo L. Uma expressao que devolve C ou N compila e o SET FILTER a
 * aceita, mas o resultado nao filtra nada de forma previsivel -- e o usuario
 * fica com uma grade "errada" sem nenhum erro na tela.
 */
FUNCTION Api_Filter_Set( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cExpr := ParStr( hP, "expr" )
   LOCAL xErro, hInfo, hDiag, bBloco, cErro := ""

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( AllTrim( cExpr ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "filter expression is required", "expr", ;
                  { "param" => "expr" } )
   ENDIF

   hDiag := ExprDiagnostico( cH, cExpr, "L" )

   IF ! hDiag[ "ok" ]
      RETURN Err( "ERROR_EXPR_INVALID", hDiag[ "error" ], "expr", ;
                  { "detail" => hDiag[ "error" ] } )
   ENDIF

   /* Avaliou e nao e logica: recusa, com o tipo que veio -- e o que permite
      dizer "isto devolve texto, um filtro precisa devolver .T./.F.". */
   IF hDiag[ "evaluated" ] .AND. ! hDiag[ "typeOk" ]
      RETURN Err( "ERROR_EXPR_NOT_LOGICAL", "filter must be logical", "expr", ;
                  { "type" => hDiag[ "type" ] } )
   ENDIF

   bBloco := ExprCompila( cH, cExpr, @cErro )
   IF bBloco == NIL
      RETURN Err( "ERROR_EXPR_INVALID", cErro, "expr", { "detail" => cErro } )
   ENDIF

   dbSetFilter( bBloco, cExpr )
   dbGoTop()

   hInfo := SessHandle( cH )
   hInfo[ "filter" ] := cExpr
   SessBump()

   RETURN Ok( EstadoFiltro( cH, hDiag[ "warning" ] ) )

/* filter.clear {"h":"h7"} */
FUNCTION Api_Filter_Clear( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, hInfo

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   dbClearFilter()
   dbGoTop()

   hInfo := SessHandle( cH )
   hInfo[ "filter" ] := ""
   SessBump()

   RETURN Ok( EstadoFiltro( cH, "" ) )

/* filter.get {"h":"h7"} -- o que esta valendo agora. */
FUNCTION Api_Filter_Get( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( EstadoFiltro( cH, "" ) )

/* ------------------------------------------------------------------ conferir */

/*
 * expr.check {"h":"h7","expr":"...","expect":"L"}
 *
 * O botao `Check` do xWDBU e do Navicat: diz se a expressao serve ANTES de
 * aplicar. Nao mexe em nada -- so relata. `expect` e opcional; sem ele, so
 * confere se compila.
 */
FUNCTION Api_Expr_Check( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cExpr := ParStr( hP, "expr" )
   LOCAL cEsp  := ParStr( hP, "expect" )
   LOCAL xErro, hDiag

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hDiag := ExprDiagnostico( cH, cExpr, cEsp )

   RETURN Ok( { ;
      "expr"      => cExpr, ;
      "ok"        => hDiag[ "ok" ] .AND. hDiag[ "typeOk" ], ;
      "compiles"  => hDiag[ "ok" ], ;
      "type"      => hDiag[ "type" ], ;
      "typeOk"    => hDiag[ "typeOk" ], ;
      "evaluated" => hDiag[ "evaluated" ], ;
      "error"     => hDiag[ "error" ], ;
      "warning"   => hDiag[ "warning" ] } )

/*
 * expr.eval {"h":"h7","expr":"..."} -> o valor no registro corrente.
 *
 * Serve para o usuario ver o que a expressao produz antes de filtrar por ela.
 */
FUNCTION Api_Expr_Eval( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cExpr := ParStr( hP, "expr" )
   LOCAL xErro, bBloco, xVal, lFalhou := .F., cErro := ""

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   bBloco := ExprCompila( cH, cExpr, @cErro )
   IF bBloco == NIL
      RETURN Err( "ERROR_EXPR_INVALID", cErro, "expr", { "detail" => cErro } )
   ENDIF

   xVal := ExprAvalia( bBloco, @lFalhou, @cErro )

   IF lFalhou
      RETURN Ok( { "recno" => RecNo(), "ok" => .F., ;
                   "error" => cErro, "value" => "", "type" => "" } )
   ENDIF

   RETURN Ok( { "recno" => RecNo(), "ok" => .T., "error" => "", ;
                "value" => ParaTexto( xVal ), "type" => ValType( xVal ) } )

/* ------------------------------------------------------------------ contar */

/*
 * filter.count {"h":"h7"} -> quantos registros o filtro deixa passar.
 *
 * SEPARADO de filter.set de proposito: contar percorre o arquivo, e a thread da
 * VM e unica -- contar 421 mil registros junto com o "aplicar" faria a UI
 * parecer travada em toda mudanca de filtro. Aqui e o usuario que pede.
 *
 * Preserva a posicao: contar nao pode mover o cursor da grade.
 */
FUNCTION Api_Filter_Count( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, nRec, nQtd, nTotal, lParou

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   nTotal := LastRec()
   nRec := RecNo()
   nQtd := 0

   /*
    * SEM TETO desde a T12. O que impedia contar 421 mil registros nao era o
    * tempo em si, e sim nao haver como mostrar progresso nem parar no meio --
    * a UI ficava sem resposta e sem explicacao.
    *
    * QDbu_JobBegin/Progress/Canceled escrevem e leem memoria C fora da VM
    * (src/bridge/progress.c), entao o Rust acompanha por outra thread enquanto
    * este laco roda.
    */
   QDbu_JobBegin( JobMsg( "UI_JOB_COUNTING" ), nTotal )

   dbGoTop()
   DO WHILE ! Eof()
      nQtd++

      /* A cada 500: consultar o cancelamento e atualizar o progresso custa uma
         CRITICAL_SECTION, e fazer isso por registro pesaria mais que o trabalho
         util. 500 mantem a barra fluida e o cancelamento com resposta rapida. */
      IF nQtd % 500 == 0
         QDbu_Progress( nQtd )
         IF QDbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   /* ANTES do JobEnd: ele zera o sinalizador, e perguntar depois responderia
      sempre .F. -- a contagem parcial passaria por completa. */
   lParou := QDbu_Canceled()

   QDbu_JobEnd()
   dbGoTo( nRec )

   /* Cancelado devolve o que deu tempo de contar, marcado como PARCIAL. Sem a
      marca, "12.500 registros passam" viraria uma contagem errada apresentada
      como certa. */
   RETURN Ok( { "h" => cH, "count" => nQtd, "records" => nTotal, ;
                "partial" => lParou, ;
                "filter" => SessHandle( cH )[ "filter" ] } )

/* ------------------------------------------------------- valores sugeridos */

/*
 * filter.values {"h":"h7","field":"CLI_EST"} -> valores distintos do campo.
 *
 * O "Suggested Values" do Navicat, que o autor chamou de melhor recurso do app:
 * em vez de digitar 'SP' na mao e errar o acento ou o espaco, escolhe-se de uma
 * lista do que EXISTE no arquivo.
 *
 * Varre no maximo QDBU_SUG_VARREDURA registros. Uma lista de sugestoes nao vale
 * ler 421 mil linhas, e `partial` avisa quando a lista pode estar incompleta --
 * melhor uma sugestao honestamente parcial que uma espera de meio minuto.
 *
 * Ignora o filtro em vigor de proposito: sugerir so o que o filtro atual ja
 * deixa passar tornaria impossivel trocar de valor.
 */
FUNCTION Api_Filter_Values( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cCampo := NomeSimples( ParStr( hP, "field" ) )
   LOCAL xErro, nPos, aVals, hVistos, nRec, nLidos, xVal, cTxt, cFiltro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   nPos := FieldPos( cCampo )
   IF nPos == 0
      RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "field", ;
                  { "field" => cCampo, "alias" => Alias() } )
   ENDIF

   aVals   := {}
   hVistos := { => }
   nRec    := RecNo()
   nLidos  := 0
   cFiltro := dbFilter()

   /* Sem o filtro, e devolvendo-o depois: ver comentario acima. */
   dbClearFilter()
   dbGoTop()

   DO WHILE ! Eof() .AND. nLidos < QDBU_SUG_VARREDURA .AND. Len( aVals ) < QDBU_SUG_VALORES
      nLidos++
      xVal := FieldGet( nPos )
      cTxt := ParaTexto( xVal )

      IF ! Empty( cTxt ) .AND. ! hb_HHasKey( hVistos, cTxt )
         hVistos[ cTxt ] := .T.
         AAdd( aVals, cTxt )
      ENDIF

      dbSkip( 1 )
   ENDDO

   IF ! Empty( cFiltro )
      dbSetFilter( hb_macroBlock( cFiltro ), cFiltro )
   ENDIF
   dbGoTo( nRec )

   ASort( aVals )

   RETURN Ok( { "field" => cCampo, "values" => aVals, ;
                "scanned" => nLidos, ;
                "partial" => ( nLidos >= QDBU_SUG_VARREDURA .OR. ;
                               Len( aVals ) >= QDBU_SUG_VALORES ) } )

/* ---------------------------------------------------------------- helpers */

/*
 * O filtro em vigor, LIDO DA WORK AREA por dbFilter().
 *
 * Publico porque FileState() usa. `count` nunca vem aqui: e caro e tem chamada
 * propria -- ver Api_Filter_Count().
 */
FUNCTION EstadoFiltro( cH, cAviso )

   RETURN { "h" => cH, ;
            "filter" => dbFilter(), ;
            "active" => ! Empty( dbFilter() ), ;
            "records" => LastRec(), ;
            "warning" => hb_defaultValue( cAviso, "" ) }

/*
 * A LETRA DO TIPO VIAJA CRUA. Aqui existia NomeDoTipo(), que devolvia "texto",
 * "numero", "data" -- palavras em portugues montadas dentro da DLL, que era
 * justamente o que a i18n veio eliminar. O que sai agora e a letra do dBASE
 * ("C", "N", "D", "L", "M"), e quem escolhe a palavra e o dicionario, pela
 * chave UI_TYPE_<letra>. Um tipo novo sem traducao aparece como "UI_TYPE_X" --
 * feio, mas imediatamente visivel, em vez de virar "desconhecido" em silencio.
 */

/* Valor de campo -> texto comparavel. Data em ISO para ordenar como string. */
STATIC FUNCTION ParaTexto( xVal )

   DO CASE
   CASE HB_ISSTRING( xVal )  ; RETURN RTrim( xVal )
   CASE HB_ISNUMERIC( xVal ) ; RETURN hb_ntos( xVal )
   CASE HB_ISDATE( xVal )    ; RETURN iif( Empty( xVal ), "", hb_DToC( xVal, "YYYY-MM-DD" ) )
   CASE HB_ISLOGICAL( xVal ) ; RETURN iif( xVal, ".T.", ".F." )
   ENDCASE

   RETURN ""

STATIC FUNCTION ParStr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )
