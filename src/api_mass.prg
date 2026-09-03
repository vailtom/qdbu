/*
 * api_mass.prg - REPACAR, DELETAR, RECUPERAR e INCLUIR DE. As operacoes que
 * alteram MUITOS registros do arquivo aberto.
 *
 * A FRONTEIRA COM A T15 nao e o formato, e a DIRECAO:
 *
 *   exportar (api_export.prg)  le e cria arquivo NOVO. Nunca toca no original.
 *   massa    (aqui)            ALTERA o arquivo aberto.
 *
 * O QUE ESTAS QUATRO NAO FAZEM, e e deliberado:
 *
 *   - nao fecham a area nem tomam exclusivo. Diferente de PACK/ZAP e da
 *     alteracao de estrutura, aqui o arquivo continua o mesmo arquivo: os
 *     registros mudam de conteudo, nao de lugar. `RecNo()` continua valendo, o
 *     indice continua descrevendo o arquivo certo, e nao ha janela em que o
 *     arquivo esteja fora do lugar. Por isso nao ha R5 nem R6 nestas quatro.
 *
 *   - nao desligam filtro nem indice -- e o oposto do que api_struct faz. Ver
 *     a regra 3 em util/scope.prg: aqui a operacao vale para O QUE ESTA NA
 *     TELA, e o original trata isso como recurso, nao como descuido.
 *
 *   - nao perguntam nada. A tela avisa e confirma; a DLL recebe decidido e
 *     executa. Uma DLL que pergunta nao tem como ser exercitada pelo cliente C.
 *
 * TRAVAMENTO: `FLOCK()` antes, `UNLOCK` depois, como o original
 * (DBUCOPY.PRG:535, 966, 1100). Um arquivo compartilhado com outra pessoa
 * escrevendo no meio de um REPLACE em massa e corrupcao garantida, e a resposta
 * certa e recusar, nao tentar.
 */

#include "dbstruct.ch"
#include "dbinfo.ch"

/* Os RDDs de texto. Sem estes REQUEST o linker nao traz SDF nem DELIM (eles
   moram dentro de hbrdd.lib, sem .lib propria), e o `__dbApp` falha com um erro
   de work area que nao menciona RDD nenhum. */
REQUEST SDF
REQUEST DELIM


STATIC FUNCTION ParStr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )


STATIC FUNCTION ParHash( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave ) .OR. ;
      ! HB_ISHASH( hP[ cChave ] )
      RETURN { => }
   ENDIF

   RETURN hP[ cChave ]


/*
 * Tudo o que as quatro fazem igual: seleciona, prepara o escopo, trava,
 * percorre, destrava, devolve a conta.
 *
 * `bAcao` e o unico pedaco diferente entre elas -- e nas tres primeiras cabe em
 * uma linha. Ter uma copia da moldura por operacao seria quatro chances de a
 * regra do WHILE, do GO TOP ou do UNLOCK divergir num dos quatro lugares.
 */
STATIC FUNCTION EmMassa( cH, hP, cAcao, cRotulo, bMonta )

   LOCAL xErro, hEsc, bAcao
   LOCAL nFeitos := 0, nVistos := 0
   LOCAL nRecAntes

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hEsc := EscopoPrepara( cH, ParHash( hP, "scope" ), @xErro )
   IF hEsc == NIL
      RETURN xErro
   ENDIF

   /* Monta a acao DEPOIS do escopo: o REPLACE valida campo e expressao aqui, e
      uma expressao errada tem de ser recusada com o arquivo intacto. */
   bAcao := Eval( bMonta, @xErro )
   IF xErro != NIL
      RETURN xErro
   ENDIF

   nRecAntes := RecNo()

   /*
    * FLOCK() -- travar o ARQUIVO, e nao registro a registro.
    *
    * Um lock por registro seria mais educado com quem esta do outro lado, e
    * seria errado: entre travar o registro 10 e o 11, outra pessoa pode
    * escrever no 11 baseando-se no que leu do 10. O original trava o arquivo
    * inteiro pelo mesmo motivo (DBUCOPY.PRG:535).
    */
   IF ! Empty( Alias() ) .AND. ! FLock()
      RETURN Err( "ERROR_CANNOT_LOCK_FILE", "another user is holding the file", "h", ;
                  { "file" => hb_FNameNameExt( SessHandle( cH )[ "path" ] ) } )
   ENDIF

   xErro := EscopoPercorre( hEsc, cRotulo, bAcao, @nFeitos, @nVistos )

   dbCommit()
   dbUnlock()

   /* O cursor volta para onde estava. Sem isto, uma operacao "TUDO" larga a
      pessoa no fim do arquivo -- ela mandou alterar, nao navegar. */
   IF nRecAntes > 0 .AND. nRecAntes <= LastRec()
      dbGoTo( nRecAntes )
   ENDIF

   SessBump()

   IF xErro != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( { "action"  => cAcao, ;
                "changed" => nFeitos, ;
                "seen"    => nVistos, ;
                "records" => LastRec() } )


/*
 * mass.replace {"h":"h7","field":"CLI_LIMC","with":"CLI_LIMC * 1.1",
 *               "scope":{"mode":"all","for":"CLI_EST == 'SP'"}}
 *
 * UM CAMPO POR VEZ, como o original (DBUCOPY.PRG:446: "only one field can be
 * replaced at a time"). Nao e limitacao tecnica -- e que duas expressoes na
 * mesma passada teriam de decidir se a segunda enxerga o valor que a primeira
 * acabou de gravar, e qualquer resposta a essa pergunta surpreende metade das
 * pessoas.
 */
FUNCTION Api_Mass_Replace( hP )
   RETURN EmMassa( ParStr( hP, "h" ), hP, "replace", "UI_JOB_REPLACE", ;
                   {| xErro | MontaReplace( hP, @xErro ) } )


STATIC FUNCTION MontaReplace( hP, xErro )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL cCampo := Upper( AllTrim( ParStr( hP, "field" ) ) )
   LOCAL cExpr := AllTrim( ParStr( hP, "with" ) )
   LOCAL nPos, cTipo, hDiag, bBloco, cErr := ""

   xErro := NIL

   IF Empty( cCampo )
      xErro := Err( "ERROR_NO_FIELD_PICKED", "pick a field", "field" )
      RETURN NIL
   ENDIF

   IF ( nPos := FieldPos( cCampo ) ) == 0
      xErro := Err( "ERROR_FIELD_NOT_FOUND", "no such field", "field", ;
                    { "field" => cCampo } )
      RETURN NIL
   ENDIF

   IF Empty( cExpr )
      xErro := Err( "ERROR_NO_VALUE", "nothing to write", "with" )
      RETURN NIL
   ENDIF

   cTipo := ( dbStruct() )[ nPos ][ DBS_TYPE ]

   hDiag := ExprDiagnostico( cH, cExpr, NIL )
   IF ! hDiag[ "ok" ]
      xErro := Err( "ERROR_WITH_INVALID", "expression is invalid", "with", ;
                    { "detail" => hDiag[ "error" ] } )
      RETURN NIL
   ENDIF

   /*
    * A CHECAGEM DE TIPO, e aqui divergimos do original de proposito.
    *
    * O DBU so acusava se `TYPE(with) <> TYPE(campo)` E o destino nao fosse memo
    * E `TYPE(with) <> "UI"` (DBUCOPY.PRG:503-506). Esse ultimo termo e um
    * buraco: `TYPE()` devolve "UI" para tudo que ele nao consegue resolver, e o
    * codigo deixava passar sem checar NADA -- exatamente as expressoes mais
    * complicadas, que sao as que mais erram.
    *
    * Aqui a expressao e COMPILADA E AVALIADA num registro de verdade, entao o
    * tipo e o tipo real. Memo continua isento, porque memo aceita texto de
    * qualquer tamanho e a comparacao "M" vs "C" reprovaria o caso normal.
    */
   IF hDiag[ "evaluated" ] .AND. ! ( cTipo == "M" ) .AND. hDiag[ "type" ] != cTipo
      xErro := Err( "ERROR_TYPE_MISMATCH", "expression type does not fit the field", ;
                    "with", { "field" => cCampo, ;
                              "fieldType" => cTipo, ;
                              "exprType" => hDiag[ "type" ] } )
      RETURN NIL
   ENDIF

   IF cTipo == "M" .AND. hDiag[ "evaluated" ] .AND. ;
      ! ( hDiag[ "type" ] == "C" ) .AND. ! ( hDiag[ "type" ] == "M" )
      xErro := Err( "ERROR_TYPE_MISMATCH", "a memo takes text", "with", ;
                    { "field" => cCampo, "fieldType" => cTipo, ;
                      "exprType" => hDiag[ "type" ] } )
      RETURN NIL
   ENDIF

   bBloco := ExprCompila( cH, cExpr, @cErr )

   RETURN {|| GravaCampo( nPos, bBloco ) }


STATIC FUNCTION GravaCampo( nPos, bBloco )

   LOCAL lFalhou := .F., cAviso := ""
   LOCAL xVal := ExprAvalia( bBloco, @lFalhou, @cAviso )

   /*
    * Um registro em que a expressao estoura NAO derruba a operacao, e tambem
    * nao e gravado. E a mesma decisao do filtro (B6.2): `CLI_TOTAL / CLI_QTD`
    * e uma expressao correta que quebra na linha em que a quantidade e zero;
    * abortar no registro 300 mil por causa dela obrigaria a pessoa a limpar o
    * arquivo antes de poder limpar o arquivo.
    *
    * A conta de "tocados" nao inclui estes, porque nao foram tocados.
    */
   IF lFalhou
      RETURN NIL
   ENDIF

   FieldPut( nPos, xVal )

   RETURN NIL


/* mass.delete {"h":"h7","scope":{...}} */
FUNCTION Api_Mass_Delete( hP )
   RETURN EmMassa( ParStr( hP, "h" ), hP, "delete", "UI_JOB_DELETING", ;
                   {| xErro | ( xErro := NIL, {|| dbDelete(), NIL } ) } )


/* mass.recall {"h":"h7","scope":{...}} */
FUNCTION Api_Mass_Recall( hP )
   RETURN EmMassa( ParStr( hP, "h" ), hP, "recall", "UI_JOB_RECALLING", ;
                   {| xErro | ( xErro := NIL, {|| dbRecall(), NIL } ) } )


/*
 * mass.appendfrom {"h":"h7","path":"J:/x/NOVOS.DBF","format":"dbf"|"sdf"|"delim",
 *                  "scope":{...}}
 *
 * O ESCOPO AQUI VALE PARA A ORIGEM, e nao para o destino. E por isso que o
 * original e o unico dos cinco que NAO faz `GO TOP` (DBUCOPY.PRG:378-382): o
 * `GO TOP` mexeria no arquivo errado.
 *
 * DUAS VIAS, e a diferenca e visivel para quem usa:
 *
 *   DBF     laco explicito, campo a campo, POR NOME. Tem progresso e
 *           cancelamento, e o mapeamento e o mesmo criterio de identidade da
 *           alteracao de estrutura: casar por posicao poria o codigo dentro do
 *           nome sempre que as duas estruturas divergissem em uma coluna.
 *
 *   SDF /   `__dbApp()`, o motor nativo. Texto de largura fixa e texto
 *   DELIM   delimitado nao tem estrutura propria para percorrer -- os campos
 *           sao recortados pela estrutura do DESTINO, coluna a coluna, e essa
 *           logica ja esta escrita e testada dentro do Harbour. O preco e nao
 *           haver barra de progresso; a tela avisa antes.
 */
FUNCTION Api_Mass_Appendfrom( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL cArq := ParStr( hP, "path" )
   LOCAL cFmt := Lower( AllTrim( ParStr( hP, "format" ) ) )
   LOCAL xErro, hEsc, hInfo
   LOCAL nAntes, nFeitos := 0, nVistos := 0

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( cFmt )
      cFmt := "dbf"
   ENDIF

   IF !( cFmt == "dbf" ) .AND. !( cFmt == "sdf" ) .AND. !( cFmt == "delim" )
      RETURN Err( "ERROR_FORMAT_UNKNOWN", "unknown source format", "format", ;
                  { "format" => cFmt } )
   ENDIF

   IF Empty( cArq )
      RETURN Err( "ERROR_NO_SOURCE", "pick a source file", "path" )
   ENDIF

   cArq := CaminhoOS( cArq )

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_SOURCE_NOT_FOUND", "source file does not exist", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   hInfo := SessHandle( cH )

   /* "Arquivo nao pode ser incluido em si proprio" -- DBU_APPERR2, e nao e
      paranoia: um arquivo que se anexa cresce enquanto e lido, e o laco nunca
      chega ao fim. */
   IF MesmoArquivoNoDisco( cArq, hInfo[ "path" ] )
      RETURN Err( "ERROR_SAME_FILE", "a file cannot be appended to itself", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   nAntes := LastRec()

   IF ! Empty( Alias() ) .AND. ! FLock()
      RETURN Err( "ERROR_CANNOT_LOCK_FILE", "another user is holding the file", "h", ;
                  { "file" => hb_FNameNameExt( hInfo[ "path" ] ) } )
   ENDIF

   IF cFmt == "dbf"
      hEsc := EscopoPrepara( cH, ParHash( hP, "scope" ), @xErro )
      IF hEsc == NIL
         dbUnlock()
         RETURN xErro
      ENDIF
      xErro := AnexaDeDbf( cArq, hEsc, @nFeitos, @nVistos )
   ELSE
      xErro := AnexaDeTexto( cArq, cFmt, ParHash( hP, "scope" ) )
      nFeitos := LastRec() - nAntes
      nVistos := nFeitos
   ENDIF

   dbCommit()
   dbUnlock()
   SessBump()

   IF xErro != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( { "action"  => "appendfrom", ;
                "file"    => hb_FNameNameExt( cArq ), ;
                "format"  => cFmt, ;
                "changed" => nFeitos, ;
                "seen"    => nVistos, ;
                "before"  => nAntes, ;
                "records" => LastRec() } )


/*
 * Anexa de outro DBF, campo a campo, casando POR NOME.
 *
 * O `dbAppend()` acontece na area de DESTINO e o `FieldGet` na de ORIGEM, entao
 * os valores sao colhidos ANTES de trocar de area -- ler um campo com a area
 * errada selecionada devolve o campo errado sem erro nenhum.
 */
STATIC FUNCTION AnexaDeDbf( cArq, hEsc, nFeitos, nVistos )

   LOCAL nDestino := Select()
   LOCAL nOrigem, aPara := {}, aEstru, i, xErro
   /* ALIAS SEM `$`. Custou uma sessao na T10 e a pedra e a mesma: `$` nao e
      caractere valido de alias, e o `dbUseArea` falha com um erro que fala do
      ARQUIVO, nao do alias. O sufixo numerico cobre o caso de ja haver um
      "ORIGEM" aberto. */
   LOCAL cAlias := "ORIGEM", nTent := 0

   DO WHILE Select( cAlias ) != 0
      cAlias := "ORIGEM" + hb_ntos( ++nTent )
   ENDDO

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T., , cArq, cAlias, .T., .T. )       /* compartilhado, so leitura */
   RECOVER
      /*
       * VOLTA PARA A AREA DE DESTINO ANTES DE DESISTIR.
       *
       * `dbUseArea` com "nova area" JA SELECIONOU uma area vazia quando falha
       * ao abrir o arquivo. Sair daqui sem desfazer isso deixa a area corrente
       * apontando para o nada, e o `dbCommit()` de quem chamou estoura com
       * "Workarea not in use" -- uma recusa clara vira erro de runtime, e a
       * tela mostra "Erro nao identificado" no lugar do motivo.
       */
      dbSelectArea( nDestino )
      RETURN Err( "ERROR_CANNOT_OPEN_SOURCE", "could not open the source", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   END SEQUENCE

   nOrigem := Select()
   aEstru := dbStruct()

   /*
    * O mapa ORIGEM -> DESTINO, resolvido uma vez.
    *
    * Campo da origem que nao existe no destino e IGNORADO em silencio, e e o
    * comportamento do `APPEND FROM` do xBase que o original delegava. Campo do
    * destino que nao existe na origem fica com o vazio do tipo.
    */
   dbSelectArea( nDestino )
   FOR i := 1 TO Len( aEstru )
      AAdd( aPara, FieldPos( aEstru[ i ][ DBS_NAME ] ) )
   NEXT
   dbSelectArea( nOrigem )

   xErro := EscopoPercorre( hEsc, "UI_JOB_APPENDING", ;
      {|| CopiaUmRegistro( nOrigem, nDestino, aPara ) }, @nFeitos, @nVistos )

   dbSelectArea( nOrigem )
   dbCloseArea()
   dbSelectArea( nDestino )

   RETURN xErro


STATIC FUNCTION CopiaUmRegistro( nOrigem, nDestino, aPara )

   LOCAL aVal := {}, i

   FOR i := 1 TO Len( aPara )
      AAdd( aVal, iif( aPara[ i ] == 0, NIL, FieldGet( i ) ) )
   NEXT

   dbSelectArea( nDestino )
   dbAppend()

   IF NetErr()
      dbSelectArea( nOrigem )
      RETURN Err( "ERROR_APPEND_FAILED", "could not add a record", "h" )
   ENDIF

   FOR i := 1 TO Len( aPara )
      IF aVal[ i ] != NIL
         BEGIN SEQUENCE WITH {| e | Break( e ) }
            FieldPut( aPara[ i ], aVal[ i ] )
         RECOVER
            /* Tipo incompativel entre origem e destino: o campo fica vazio e o
               registro entra. Perder uma coluna e melhor que perder a linha. */
         END SEQUENCE
      ENDIF
   NEXT

   dbSelectArea( nOrigem )

   RETURN NIL


/*
 * Texto: entrega ao `__dbApp()` do proprio Harbour.
 *
 * SEM PROGRESSO E SEM CANCELAMENTO -- e a tela diz isso antes. O motor nativo e
 * um laco fechado dentro do Harbour; envolve-lo em progresso exigiria reescrever
 * o recorte de largura fixa e o parser de delimitado, que e justamente a parte
 * que ja esta certa la dentro.
 */
STATIC FUNCTION AnexaDeTexto( cArq, cFmt, hEscopo )

   LOCAL cRdd := iif( cFmt == "sdf", "SDF", "DELIM" )
   LOCAL nNext := NIL, lRest
   LOCAL cModo := "all"
   LOCAL nDestino := Select()

   /* O RDD tem de estar REGISTRADO, e a conferencia e barata. Sem ela, um
      Harbour compilado sem os RDDs de texto responderia com um erro de work
      area -- que nao diz nada sobre formato e manda a pessoa procurar no lugar
      errado. */
   IF AScan( rddList(), {| c | Upper( AllTrim( c ) ) == cRdd } ) == 0
      RETURN Err( "ERROR_FORMAT_UNAVAILABLE", "this build has no text RDD", "format", ;
                  { "format" => cFmt } )
   ENDIF

   IF HB_ISHASH( hEscopo ) .AND. hb_HHasKey( hEscopo, "mode" ) .AND. ;
      HB_ISSTRING( hEscopo[ "mode" ] )
      cModo := Lower( AllTrim( hEscopo[ "mode" ] ) )
   ENDIF

   IF cModo == "next" .AND. HB_ISHASH( hEscopo ) .AND. hb_HHasKey( hEscopo, "n" )
      nNext := hEscopo[ "n" ]
   ENDIF
   lRest := ( cModo == "rest" )

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      __dbApp( cArq, NIL, NIL, NIL, nNext, NIL, lRest, cRdd )
   RECOVER
      /* Mesma armadilha do caminho DBF: o motor abre area para ler o texto e,
         quando falha, deixa a selecao no lugar errado. Sem este `dbSelectArea`
         a recusa vira "Workarea not in use" no `dbCommit()` de quem chamou. */
      dbSelectArea( nDestino )
      RETURN Err( "ERROR_APPEND_TEXT_FAILED", "the text file could not be read", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "format" => cFmt } )
   END SEQUENCE

   /* E tambem no caminho de SUCESSO: `__dbApp` nao promete devolver a selecao. */
   dbSelectArea( nDestino )

   RETURN NIL


/* Dois caminhos apontam para o mesmo arquivo? Compara o caminho canonico, e nao
   o texto: "./X.DBF" e "X.DBF" sao o mesmo arquivo e nao a mesma string.
   Mesmo criterio do `export.dbf` (api_export.prg:416). */
STATIC FUNCTION MesmoArquivoNoDisco( c1, c2 )
   RETURN Upper( CaminhoOS( c1 ) ) == Upper( CaminhoOS( c2 ) )
