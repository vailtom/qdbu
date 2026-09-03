/*
 * scope.prg - o ESCOPO das operacoes em massa. Uma implementacao, quatro telas.
 *
 * PORTADO DO ORIGINAL, e o original e mais magro do que a lenda xBase sugere.
 * O DBU nao tem `RECORD n` nem `REST` em lugar nenhum (conferido nas 11 mil
 * linhas de .PRG): tem tres coisas -- `FOR`, `WHILE` e `NEXT n`, esta ultima
 * guardada num `how_many` onde ZERO significa "tudo" (DBUCOPY.PRG:116-120).
 * `RESTO` entra aqui por decisao do autor, porque custa uma linha e e o
 * vocabulario que quem vem do Clipper procura; `REGISTRO n` ficou de fora
 * porque `data.goto` seguido de PROXIMOS 1 ja e exatamente isso.
 *
 * AS QUATRO REGRAS QUE VIERAM DO ORIGINAL, e nenhuma e obvia:
 *
 * 1. WHILE TEM PRECEDENCIA SOBRE FOR.
 *    DBU.HLP secao /16: "If both FOR and WHILE expressions are entered, WHILE
 *    takes precedence over FOR". Na pratica: o WHILE PARA o laco quando fica
 *    falso; o FOR apenas PULA o registro e o laco continua. Trocar os dois de
 *    papel muda o resultado em silencio -- um WHILE tratado como FOR percorre o
 *    arquivo inteiro em vez de parar no primeiro que nao casa.
 *
 * 2. `WHILE` VAZIO VIRA `.T.` -- E ISSO SO E CORRETO A PARTIR DO TOPO.
 *    O comentario do original diz exatamente isso (DBUCOPY.PRG:230: "literal
 *    true is correct only from top of file") e por isso ele faz `GO TOP` quando
 *    nao ha escopo numerico. Um `WHILE .T.` a partir do meio do arquivo
 *    processaria so a segunda metade sem avisar ninguem.
 *
 * 3. O FILTRO E O INDICE FICAM LIGADOS, DE PROPOSITO.
 *    Nenhuma das cinco operacoes do original desliga o filtro, e o DBU.HLP /12
 *    trata isso como recurso: "A subset of data may be copied by setting a
 *    filter". Aqui e o oposto do que a alteracao de estrutura faz -- la o
 *    recorte e neutralizado porque a operacao vale para o ARQUIVO; aqui a
 *    operacao vale para O QUE ESTA NA TELA.
 *
 * 4. `SET DELETED` NAO E TOCADO.
 *    O original nunca o altera. E obrigatorio: com DELETED ligado, o RECALL nao
 *    teria como enxergar os registros que precisa recuperar.
 *
 * LACO EXPLICITO, e nao `dbEval` nem os comandos `REPLACE ALL`/`DELETE ALL` do
 * xBase (B12.2 do plano). Sai mais lento e ganha duas coisas que o comando
 * nativo nao tem: progresso e cancelamento. Uma operacao de tres minutos que
 * nao pode ser interrompida trava a thread da VM inteira -- e a thread da VM e
 * a aplicacao toda (Risco 5 do plano).
 */

#include "dbinfo.ch"


/*
 * Confere o escopo ANTES de qualquer escrita e devolve o que o laco precisa.
 *
 * Devolve NIL em caso de recusa (com `xErro` preenchido) ou um hash pronto.
 * Separado do laco de proposito: uma expressao FOR mal escrita tem de ser
 * recusada com a area intacta, e nao no meio do trabalho.
 */
FUNCTION EscopoPrepara( cH, hEscopo, xErro )

   LOCAL cModo := "all", nQuantos := 0
   LOCAL cFor := "", cWhile := ""
   LOCAL bFor := NIL, bWhile := NIL
   LOCAL hDiag, cErr := ""

   xErro := NIL

   IF HB_ISHASH( hEscopo )
      IF hb_HHasKey( hEscopo, "mode" ) .AND. HB_ISSTRING( hEscopo[ "mode" ] )
         cModo := Lower( AllTrim( hEscopo[ "mode" ] ) )
      ENDIF
      IF hb_HHasKey( hEscopo, "n" ) .AND. HB_ISNUMERIC( hEscopo[ "n" ] )
         nQuantos := Int( hEscopo[ "n" ] )
      ENDIF
      IF hb_HHasKey( hEscopo, "for" ) .AND. HB_ISSTRING( hEscopo[ "for" ] )
         cFor := AllTrim( hEscopo[ "for" ] )
      ENDIF
      IF hb_HHasKey( hEscopo, "while" ) .AND. HB_ISSTRING( hEscopo[ "while" ] )
         cWhile := AllTrim( hEscopo[ "while" ] )
      ENDIF
   ENDIF

   IF !( cModo == "all" ) .AND. !( cModo == "next" ) .AND. !( cModo == "rest" )
      xErro := Err( "ERROR_SCOPE_MODE", "unknown scope", "scope", ;
                    { "mode" => cModo } )
      RETURN NIL
   ENDIF

   IF cModo == "next" .AND. nQuantos <= 0
      xErro := Err( "ERROR_SCOPE_COUNT", "next needs a positive count", "scope.n" )
      RETURN NIL
   ENDIF

   /* FOR e WHILE precisam ser LOGICAS, e o original ja recusava assim
      (DBU_COPYERR3 / DBU_COPYERR4). A diferenca e que aqui a expressao e
      COMPILADA E AVALIADA -- o `TYPE()` do original devolvia "UI" para o que
      nao conseguia resolver, e o codigo deixava passar sem checar nada
      (DBUCOPY.PRG:505). */
   IF ! Empty( cFor )
      hDiag := ExprDiagnostico( cH, cFor, "L" )
      IF ! hDiag[ "ok" ]
         xErro := Err( "ERROR_FOR_INVALID", "for expression is invalid", "scope.for", ;
                       { "detail" => hDiag[ "error" ] } )
         RETURN NIL
      ENDIF
      IF hDiag[ "evaluated" ] .AND. ! hDiag[ "typeOk" ]
         xErro := Err( "ERROR_FOR_NOT_LOGICAL", "for must be logical", "scope.for", ;
                       { "type" => hDiag[ "type" ] } )
         RETURN NIL
      ENDIF
      bFor := ExprCompila( cH, cFor, @cErr )
   ENDIF

   IF ! Empty( cWhile )
      hDiag := ExprDiagnostico( cH, cWhile, "L" )
      IF ! hDiag[ "ok" ]
         xErro := Err( "ERROR_WHILE_INVALID", "while expression is invalid", "scope.while", ;
                       { "detail" => hDiag[ "error" ] } )
         RETURN NIL
      ENDIF
      IF hDiag[ "evaluated" ] .AND. ! hDiag[ "typeOk" ]
         xErro := Err( "ERROR_WHILE_NOT_LOGICAL", "while must be logical", "scope.while", ;
                       { "type" => hDiag[ "type" ] } )
         RETURN NIL
      ENDIF
      bWhile := ExprCompila( cH, cWhile, @cErr )
   ENDIF

   RETURN { "mode" => cModo, "n" => nQuantos, ;
            "for" => cFor, "while" => cWhile, ;
            "bFor" => bFor, "bWhile" => bWhile }


/*
 * Percorre o escopo chamando `bAcao` em cada registro que passa.
 *
 * `bAcao` devolve NIL em caso de sucesso, ou um erro de recusa para
 * interromper -- uma linha que nao pode ser gravada nao vira aviso silencioso.
 *
 * `nFeitos` (por referencia) volta com quantos registros a acao TOCOU, que nao
 * e o mesmo que quantos foram VISITADOS: um FOR que recusa 90% visita todos e
 * toca 10%. A tela mostra os dois, porque "1.284 alterados" sem o "de 421.714
 * examinados" nao diz se o FOR pegou o que devia.
 */
FUNCTION EscopoPercorre( hEsc, cRotulo, bAcao, nFeitos, nVistos )

   LOCAL nTeto, xErro := NIL

   nFeitos := 0
   nVistos := 0

   /*
    * `GO TOP` so no modo "tudo" -- regra 2 la de cima.
    *
    * PROXIMOS n e RESTO comecam no REGISTRO CORRENTE, por definicao. O DBU.HLP
    * /17 e explicito: "The operation will begin with the current record".
    */
   IF hEsc[ "mode" ] == "all"
      dbGoTop()
   ENDIF

   nTeto := iif( hEsc[ "mode" ] == "next", hEsc[ "n" ], 0 )

   Dbu_JobBegin( JobMsg( cRotulo, Alias() ), ;
                 iif( nTeto > 0, nTeto, LastRec() ) )

   DO WHILE ! Eof()

      /* WHILE PARA o laco. FOR so pula. Regra 1. */
      IF hEsc[ "bWhile" ] != NIL .AND. ! EscopoVerdade( hEsc[ "bWhile" ] )
         EXIT
      ENDIF

      nVistos++

      IF hEsc[ "bFor" ] == NIL .OR. EscopoVerdade( hEsc[ "bFor" ] )
         IF ( xErro := Eval( bAcao ) ) != NIL
            EXIT
         ENDIF
         nFeitos++
      ENDIF

      /* O TETO CONTA REGISTROS VISITADOS, e nao registros tocados.
         "PROXIMOS 100 FOR x" no xBase olha 100 registros e altera os que
         casam -- nao procura ate achar 100 que casem. */
      IF nTeto > 0 .AND. nVistos >= nTeto
         EXIT
      ENDIF

      IF nVistos % 500 == 0
         Dbu_Progress( nVistos )
         IF Dbu_Canceled()
            Dbu_JobEnd()
            RETURN Err( "WARN_CANCELED_BULK", "canceled by user", , ;
                        { "n" => nFeitos } )
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   Dbu_JobEnd()

   RETURN xErro


/* Avalia o bloco tratando erro de DADO como "nao casa".
   Uma expressao correta que estoura num registro (divisao por campo zerado) nao
   pode derrubar a operacao inteira -- a mesma decisao ja tomada no filtro. */
STATIC FUNCTION EscopoVerdade( bBloco )

   LOCAL lFalhou := .F., cAviso := ""
   LOCAL xVal := ExprAvalia( bBloco, @lFalhou, @cAviso )

   RETURN ! lFalhou .AND. HB_ISLOGICAL( xVal ) .AND. xVal
