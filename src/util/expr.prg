/*
 * expr.prg - compilar e avaliar expressao do usuario.
 *
 * DUAS FALHAS DIFERENTES, e confundi-las e o erro classico:
 *
 *   nao compila            -> RECUSA. "CLI_NOME >" esta incompleta; nao ha o
 *                             que fazer com ela, e a UI destaca o campo.
 *
 *   compila e estoura em   -> AVISO. "1/CLI_SALDO" e uma expressao legitima que
 *   ALGUM registro            quebra no registro em que o saldo e zero. Tratar
 *                             isso como recusa impediria um filtro correto de
 *                             ser usado por causa de uma linha entre 400 mil.
 *
 * O compilador de macro do Harbour e o mesmo do Clipper: a expressao roda com
 * privilegio total. Ver o modelo de confianca -- um filtro salvo e, na
 * pratica, um executavel.
 */

/*
 * Cache de codeblock por (handle, texto).
 *
 * Sem ele, cada pagina recompila a mesma expressao: paginar 400 mil registros
 * de 200 em 200 sao 2100 compilacoes identicas. O texto entra na chave porque e
 * ele que identifica a expressao -- e o handle porque o mesmo texto em outro
 * arquivo se refere a outros campos.
 */
STATIC s_hCache

STATIC FUNCTION Cache()
   IF s_hCache == NIL
      s_hCache := { => }
   ENDIF
   RETURN s_hCache

/* Esquece o que foi compilado para um handle -- chamado ao fechar o arquivo,
   senao o cache cresce sem limite numa sessao longa. */
FUNCTION ExprEsquece( cH )

   LOCAL h := Cache()
   LOCAL cChave

   FOR EACH cChave IN hb_HKeys( h )
      IF Left( cChave, Len( cH ) + 1 ) == cH + "|"
         hb_HDel( h, cChave )
      ENDIF
   NEXT

   RETURN NIL

/*
 * Compila uma expressao e devolve o codeblock, ou NIL com o motivo.
 *
 * A AREA JA TEM DE ESTAR SELECIONADA: a compilacao resolve nomes de campo
 * contra a area corrente, e compilar com a area errada produz um bloco que
 * aponta para os campos de outro arquivo -- que roda e devolve lixo, em vez de
 * falhar.
 */
FUNCTION ExprCompila( cH, cExpr, cErro )

   LOCAL h := Cache()
   LOCAL cChave := cH + "|" + cExpr
   LOCAL bBloco, oErr

   cErro := ""

   IF ! HB_ISSTRING( cExpr ) .OR. Empty( AllTrim( cExpr ) )
      cErro := "expressao vazia"
      RETURN NIL
   ENDIF

   IF hb_HHasKey( h, cChave )
      RETURN h[ cChave ]
   ENDIF

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      bBloco := hb_macroBlock( cExpr )
   RECOVER USING oErr
      cErro := ErroTexto( oErr, "erro de sintaxe" )
      RETURN NIL
   END SEQUENCE

   IF bBloco == NIL
      cErro := "nao compila: erro de sintaxe"
      RETURN NIL
   ENDIF

   h[ cChave ] := bBloco

   RETURN bBloco

/*
 * Avalia sem deixar excecao escapar.
 *
 * lFalhou distingue "deu NIL" de "estourou": uma expressao pode legitimamente
 * devolver NIL, e tratar as duas como a mesma coisa esconderia o erro.
 */
FUNCTION ExprAvalia( bBloco, lFalhou, cErro, cSimbolo )

   LOCAL xRet, oErr

   lFalhou := .F.
   cErro := ""
   cSimbolo := ""

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      xRet := Eval( bBloco )
   RECOVER USING oErr
      lFalhou := .T.
      /* COMPLETO: description + operation. Sem o `operation`, um `W` digitado
         por engano vira "Variable does not exist" e a pessoa nao descobre que o
         culpado e o `W`. Ver ErroTexto() em util/err.prg -- padrao do projeto. */
      cErro := ErroTexto( oErr, "erro ao avaliar" )
      /* E o NOME, como dado: "CLI_NOMEE" sozinho, para a UI montar "nao
         existe campo CLI_NOMEE -- parecido: CLI_NOME". ErroSimbolo() existia
         desde o inicio para isto e nunca tinha sido chamada. */
      cSimbolo := ErroSimbolo( oErr )
      RETURN NIL
   END SEQUENCE

   RETURN xRet

/*
 * O valor de uma expressao como TEXTO, para a tela: data em ISO (quem formata
 * e o JS), logico como .T./.F., numero sem zeros a esquerda. Publica porque
 * expr.check e expr.eval (api_filter.prg) devolvem o mesmo campo `value`.
 */
FUNCTION ExprTexto( xVal )

   DO CASE
   CASE HB_ISSTRING( xVal )  ; RETURN RTrim( xVal )
   CASE HB_ISNUMERIC( xVal ) ; RETURN hb_ntos( xVal )
   CASE HB_ISDATE( xVal )    ; RETURN iif( Empty( xVal ), "", hb_DToC( xVal, "YYYY-MM-DD" ) )
   CASE HB_ISLOGICAL( xVal ) ; RETURN iif( xVal, ".T.", ".F." )
   ENDCASE

   RETURN ""

/*
 * Compila, avalia UMA vez no registro corrente e confere o tipo.
 *
 * Devolve um hash com o diagnostico -- nunca uma recusa pronta, porque quem
 * chama decide se o caso e recusa (filter.set com tipo errado) ou informacao
 * (expr.check, que so relata).
 *
 *   ok        compilou
 *   type      tipo do resultado ("L","C","N","D","U"), "" se nao avaliou
 *   typeOk    o tipo bate com cEsperado (ou cEsperado vazio)
 *   evaluated conseguiu avaliar no registro corrente
 *   error     motivo, quando nao compilou
 *   warning   compilou mas estourou NESTE registro -- nao impede o uso.
 *             E o motivo CRU (ErroTexto); a frase em volta e do dicionario.
 *   symbol    o nome do campo/funcao ausente, quando essa e a causa
 *   value     o resultado como texto (ExprTexto), quando avaliou
 */
FUNCTION ExprDiagnostico( cH, cExpr, cEsperado )

   LOCAL cErro := "", cAviso := "", cSimbolo := ""
   LOCAL lFalhou := .F.
   LOCAL bBloco, xVal, cTipo

   bBloco := ExprCompila( cH, cExpr, @cErro )

   IF bBloco == NIL
      RETURN { "ok" => .F., "type" => "", "typeOk" => .F., ;
               "evaluated" => .F., "error" => cErro, "warning" => "", ;
               "symbol" => "", "value" => "" }
   ENDIF

   xVal := ExprAvalia( bBloco, @lFalhou, @cAviso, @cSimbolo )

   IF lFalhou

      /* Duas falhas de avaliacao MUITO diferentes, e so uma e aviso:
       *
       *   simbolo inexistente ("Variable does not exist", "Undefined function")
       *   -> RECUSA. NAO_EXISTE==1 compila -- o macro-compilador aceita o nome e
       *      so vai procura-lo ao rodar -- mas falha em TODOS os registros. Como
       *      aviso, o filtro seria aplicado, nao casaria nada, e a grade ficaria
       *      vazia sem nenhuma explicacao.
       *
       *   erro de DADO (divisao por zero, data vazia) -> aviso. 1/CLI_SALDO e
       *      uma expressao correta que quebra na linha em que o saldo e zero;
       *      barrar por causa de uma linha entre 400 mil frustaria um filtro
       *      legitimo.
       */
      IF EhSimboloAusente( cAviso )
         RETURN { "ok" => .F., "type" => "", "typeOk" => .F., ;
                  "evaluated" => .F., "error" => cAviso, "warning" => "", ;
                  "symbol" => cSimbolo, "value" => "" }
      ENDIF

      /* So o motivo. Havia aqui uma frase em portugues nascendo na DLL
         ("nao pode ser avaliada no registro atual: "), contra a regra de
         que texto de usuario mora no dicionario -- a UI ja embrulha o aviso
         em UI_EXPR_RESULT, entao a frase era dobrada e num idioma so. */
      RETURN { "ok" => .T., "type" => "", "typeOk" => .T., ;
               "evaluated" => .F., "error" => "", "warning" => cAviso, ;
               "symbol" => "", "value" => "" }
   ENDIF

   cTipo := ValType( xVal )

   RETURN { "ok" => .T., "type" => cTipo, ;
            "typeOk" => Empty( cEsperado ) .OR. cTipo == cEsperado, ;
            "evaluated" => .T., "error" => "", "warning" => "", ;
            "symbol" => "", "value" => ExprTexto( xVal ) }

/* .T. quando a falha e "este nome nao existe" -- estrutural, nao de dado. */
STATIC FUNCTION EhSimboloAusente( cMsg )

   LOCAL c := Lower( hb_defaultValue( cMsg, "" ) )

   RETURN "does not exist" $ c .OR. ;
          "undefined function" $ c .OR. ;
          "nao existe" $ c
