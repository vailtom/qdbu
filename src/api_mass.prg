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


STATIC FUNCTION ParLog( hP, cChave, lPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave ) .OR. ;
      ! HB_ISLOGICAL( hP[ cChave ] )
      RETURN hb_defaultValue( lPadrao, .F. )
   ENDIF

   RETURN hP[ cChave ]


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

   /*
    * `delim` SAIU, e nao por gosto.
    *
    * O RDD DELIM do Harbour trunca no `""` escapado, ignora o `;` como
    * separador e engole o cabecalho como registro -- as tres medidas em
    * 03/09/2026. Como o nosso `export.csv` grava com `;` por padrao, exportar e
    * reimportar destruia o arquivo. O `csv` faz o mesmo trabalho certo, com o
    * parser do ERP (util/csv.prg). Um pedido antigo com "delim" e aceito e
    * tratado como "csv", para nao quebrar quem ja chamava assim.
    */
   IF cFmt == "delim"
      cFmt := "csv"
   ENDIF

   IF !( cFmt == "dbf" ) .AND. !( cFmt == "sdf" ) .AND. ;
      !( cFmt == "csv" ) .AND. !( cFmt == "json" )
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

   DO CASE
   CASE cFmt == "dbf"
      hEsc := EscopoPrepara( cH, ParHash( hP, "scope" ), @xErro )
      IF hEsc == NIL
         dbUnlock()
         RETURN xErro
      ENDIF
      xErro := AnexaDeDbf( cArq, hEsc, @nFeitos, @nVistos )

   CASE cFmt == "csv"
      xErro := AnexaDeTabela( CsvComoTabela( cArq, hP, @xErro ), hP, ;
                              @nFeitos, @nVistos, xErro )

   CASE cFmt == "json"
      xErro := AnexaDeTabela( JsonComoTabela( cArq, @xErro ), hP, ;
                              @nFeitos, @nVistos, xErro )

   OTHERWISE
      xErro := AnexaDeTexto( cArq, cFmt, ParHash( hP, "scope" ) )
      nFeitos := LastRec() - nAntes
      nVistos := nFeitos
   ENDCASE

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
   LOCAL nOrigem, aPara := {}, aEstru, i, xErro, oErr
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
   RECOVER USING oErr
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
                  { "file" => hb_FNameNameExt( cArq ), ;
                    "reason" => ErroTexto( oErr ) } )
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
   LOCAL oErr

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
   RECOVER USING oErr
      /* Mesma armadilha do caminho DBF: o motor abre area para ler o texto e,
         quando falha, deixa a selecao no lugar errado. Sem este `dbSelectArea`
         a recusa vira "Workarea not in use" no `dbCommit()` de quem chamou. */
      dbSelectArea( nDestino )
      RETURN Err( "ERROR_APPEND_TEXT_FAILED", "the text file could not be read", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "format" => cFmt, ;
                    "reason" => ErroTexto( oErr ) } )
   END SEQUENCE

   /* E tambem no caminho de SUCESSO: `__dbApp` nao promete devolver a selecao. */
   dbSelectArea( nDestino )

   RETURN NIL


/* Dois caminhos apontam para o mesmo arquivo? Compara o caminho canonico, e nao
   o texto: "./X.DBF" e "X.DBF" sao o mesmo arquivo e nao a mesma string.
   Mesmo criterio do `export.dbf` (api_export.prg:416). */
STATIC FUNCTION MesmoArquivoNoDisco( c1, c2 )
   RETURN Upper( CaminhoOS( c1 ) ) == Upper( CaminhoOS( c2 ) )


/*
 * CSV -> tabela em memoria: { aCabecalho, aLinhas }.
 *
 * `aCabecalho` vazio significa "sem cabecalho": o mapeamento entao e por
 * POSICAO, campo 1 do arquivo no campo 1 do DBF. Com cabecalho, o mapeamento e
 * por NOME -- o mesmo criterio de identidade que a importacao de DBF e a
 * alteracao de estrutura usam. Casar por posicao quando ha nome disponivel e a
 * receita de por o codigo dentro do nome sem erro nenhum.
 */
STATIC FUNCTION CsvComoTabela( cArq, hP, xErro )

   LOCAL aLinhas, aCab := {}
   LOCAL cDelim := ParStr( hP, "delimiter" )
   LOCAL lCab := ParLog( hP, "header", .T. )
   LOCAL lAbertas := .F.

   xErro := NIL

   aLinhas := CsvLe( cArq, iif( Empty( cDelim ), NIL, Left( cDelim, 1 ) ), ;
                     @lAbertas, ParStr( hP, "encoding" ) )

   IF lAbertas
      xErro := Err( "ERROR_CSV_UNCLOSED_QUOTE", "a quoted field was never closed", ;
                    "path", { "file" => hb_FNameNameExt( cArq ) } )
      RETURN NIL
   ENDIF

   IF Empty( aLinhas )
      xErro := Err( "ERROR_SOURCE_EMPTY", "nothing to read", "path", ;
                    { "file" => hb_FNameNameExt( cArq ) } )
      RETURN NIL
   ENDIF

   IF lCab
      aCab := aLinhas[ 1 ]
      hb_ADel( aLinhas, 1, .T. )
   ENDIF

   RETURN { aCab, aLinhas }


/*
 * JSON -> tabela. Espera um ARRAY DE OBJETOS, que e o que o nosso export.json
 * grava -- o par das duas pontas.
 *
 * `hb_jsonDecode` TEM UMA ARMADILHA: ele devolve quantos bytes consumiu e
 * ignora o resto, sem reclamar. Um arquivo truncado pela metade produz um item
 * indefinido ou uma lista curta, em silencio. O ERP contorna isso procurando
 * texto cru no buffer antes de confiar no hash (NETATABC.prg:2402). Aqui a
 * conferencia e do retorno e do tipo, que e mais direto e nao depende do
 * conteudo.
 */
STATIC FUNCTION JsonComoTabela( cArq, xErro )

   LOCAL cTexto := hb_MemoRead( cArq )
   LOCAL xDados := NIL
   LOCAL nLidos, aCab := {}, aLinhas := {}, aLinha, hReg, cChave, i

   xErro := NIL

   IF Empty( cTexto )
      xErro := Err( "ERROR_SOURCE_EMPTY", "nothing to read", "path", ;
                    { "file" => hb_FNameNameExt( cArq ) } )
      RETURN NIL
   ENDIF

   nLidos := hb_jsonDecode( cTexto, @xDados )

   IF nLidos == 0 .OR. xDados == NIL
      xErro := Err( "ERROR_JSON_INVALID", "not valid JSON", "path", ;
                    { "file" => hb_FNameNameExt( cArq ) } )
      RETURN NIL
   ENDIF

   IF ! HB_ISARRAY( xDados )
      xErro := Err( "ERROR_JSON_NOT_ARRAY", "expected an array of objects", "path", ;
                    { "file" => hb_FNameNameExt( cArq ) } )
      RETURN NIL
   ENDIF

   /*
    * O CABECALHO E A UNIAO DAS CHAVES DE TODOS OS OBJETOS, e nao as do
    * primeiro. JSON e esparso por natureza: um registro pode omitir a chave que
    * outro traz, e olhar so o primeiro perderia colunas inteiras sem avisar.
    */
   FOR EACH hReg IN xDados
      IF HB_ISHASH( hReg )
         FOR i := 1 TO Len( hReg )
            cChave := hb_HKeyAt( hReg, i )
            IF HB_ISSTRING( cChave ) .AND. ;
               AScan( aCab, {| c | Upper( c ) == Upper( cChave ) } ) == 0
               AAdd( aCab, cChave )
            ENDIF
         NEXT
      ENDIF
   NEXT

   IF Empty( aCab )
      xErro := Err( "ERROR_JSON_NOT_ARRAY", "expected an array of objects", "path", ;
                    { "file" => hb_FNameNameExt( cArq ) } )
      RETURN NIL
   ENDIF

   /* Cada objeto vira uma linha na ordem do cabecalho; chave ausente vira
      campo vazio, e nao um deslocamento das colunas seguintes. */
   /* `AAdd()` devolve O ELEMENTO ADICIONADO, e nao o array -- entao
      `aLinhas := AAdd( aLinhas, {} )` trocava `aLinhas` pelo {} recem-criado e
      o `ATail` seguinte caia em NIL. Monta-se a linha inteira e so entao ela
      entra na lista. */
   FOR EACH hReg IN xDados
      aLinha := {}
      FOR i := 1 TO Len( aCab )
         AAdd( aLinha, ;
               iif( HB_ISHASH( hReg ) .AND. hb_HHasKey( hReg, aCab[ i ] ), ;
                    ComoTexto( hReg[ aCab[ i ] ] ), "" ) )
      NEXT
      AAdd( aLinhas, aLinha )
   NEXT

   RETURN { aCab, aLinhas }


/* Qualquer valor do JSON como texto -- a conversao para o tipo do campo e do
   PoeValor, que ja sabe fazer isso e ja e usado pela alteracao de estrutura. */
STATIC FUNCTION ComoTexto( x )

   DO CASE
   CASE x == NIL          ; RETURN ""
   CASE HB_ISSTRING( x )  ; RETURN x
   CASE HB_ISNUMERIC( x ) ; RETURN AllTrim( Str( x ) )
   CASE HB_ISLOGICAL( x ) ; RETURN iif( x, "T", "F" )
   CASE HB_ISDATE( x )    ; RETURN iif( Empty( x ), "", DToS( x ) )
   ENDCASE

   /* Objeto ou lista aninhada: volta como JSON. Melhor guardar o texto do que
      descartar a coluna -- quem importou sabe o que era. */
   RETURN hb_jsonEncode( x )


/*
 * Grava uma tabela em memoria no DBF aberto.
 *
 * Comum a CSV e JSON de proposito: os dois chegam aqui como
 * { cabecalho, linhas de texto }, e o unico lugar que decide como um texto vira
 * valor de campo e o `PoeValor` -- o mesmo da alteracao de estrutura. Duas
 * copias dessa conversao seriam duas respostas diferentes para "o que fazer com
 * um texto que nao e numero".
 */
STATIC FUNCTION AnexaDeTabela( aTab, hP, nFeitos, nVistos, xErro )

   LOCAL aCab, aLinhas, aPara := {}, aLinha
   LOCAL i, nPos, aEstru, hEsc, nTeto, cTipo

   nFeitos := 0
   nVistos := 0

   IF aTab == NIL
      RETURN xErro
   ENDIF

   aCab := aTab[ 1 ]
   aLinhas := aTab[ 2 ]
   aEstru := dbStruct()

   /*
    * O MAPA, resolvido uma vez.
    *
    * Com cabecalho: cada coluna do arquivo procura um campo de MESMO NOME no
    * destino; a que nao acha e ignorada, e o campo do destino que ninguem
    * alimenta fica vazio. Sem cabecalho: posicao por posicao, ate acabar o
    * menor dos dois.
    */
   IF Empty( aCab )
      FOR i := 1 TO Len( aEstru )
         AAdd( aPara, i )
      NEXT
   ELSE
      FOR i := 1 TO Len( aCab )
         AAdd( aPara, FieldPos( AllTrim( aCab[ i ] ) ) )
      NEXT
   ENDIF

   /* O escopo vale para a ORIGEM, como no caminho DBF: "proximos 10" sao as 10
      primeiras linhas do arquivo, e nao 10 registros do destino. */
   hEsc := ParHash( hP, "scope" )
   nTeto := 0
   IF HB_ISHASH( hEsc ) .AND. hb_HHasKey( hEsc, "mode" ) .AND. ;
      HB_ISSTRING( hEsc[ "mode" ] ) .AND. Lower( hEsc[ "mode" ] ) == "next" .AND. ;
      hb_HHasKey( hEsc, "n" ) .AND. HB_ISNUMERIC( hEsc[ "n" ] )
      nTeto := Int( hEsc[ "n" ] )
   ENDIF

   QDbu_JobBegin( JobMsg( "UI_JOB_APPENDING", Alias() ), Len( aLinhas ) )

   FOR EACH aLinha IN aLinhas

      nVistos++

      dbAppend()
      IF NetErr()
         QDbu_JobEnd()
         RETURN Err( "ERROR_APPEND_FAILED", "could not add a record", "h" )
      ENDIF

      FOR i := 1 TO Len( aLinha )
         nPos := iif( i <= Len( aPara ), aPara[ i ], 0 )
         IF nPos > 0 .AND. nPos <= Len( aEstru )
            cTipo := aEstru[ nPos ][ DBS_TYPE ]
            PoeTexto( nPos, aLinha[ i ], cTipo )
         ENDIF
      NEXT

      nFeitos++

      IF nTeto > 0 .AND. nVistos >= nTeto
         EXIT
      ENDIF

      IF nVistos % 500 == 0
         QDbu_Progress( nVistos )
         IF QDbu_Canceled()
            QDbu_JobEnd()
            RETURN Err( "WARN_CANCELED_BULK", "canceled by user", , ;
                        { "n" => nFeitos } )
         ENDIF
      ENDIF
   NEXT

   QDbu_JobEnd()

   RETURN NIL


/* Texto -> campo, convertendo pelo tipo do destino. Reusa a mesma tabela de
   conversao da alteracao de estrutura (api_struct.prg), para "ABC" num campo
   numerico dar o mesmo resultado nos dois caminhos. */
STATIC FUNCTION PoeTexto( nPos, cTexto, cTipo )

   LOCAL xVal

   DO CASE
   CASE cTipo == "C" .OR. cTipo == "M"
      xVal := cTexto

   CASE cTipo == "N"
      xVal := Val( StrTran( cTexto, ",", "." ) )

   CASE cTipo == "D"
      xVal := iif( Len( cTexto ) == 8 .AND. SoDigitos( cTexto ), ;
                   SToD( cTexto ), CToD( cTexto ) )

   CASE cTipo == "L"
      xVal := Upper( Left( AllTrim( cTexto ), 1 ) ) $ "TSY1"

   OTHERWISE
      RETURN .F.
   ENDCASE

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      FieldPut( nPos, xVal )
   RECOVER
      RETURN .F.
   END SEQUENCE

   RETURN .T.


STATIC FUNCTION SoDigitos( c )

   LOCAL i

   IF Empty( c )
      RETURN .F.
   ENDIF

   FOR i := 1 TO Len( c )
      IF ! ( SubStr( c, i, 1 ) $ "0123456789" )
         RETURN .F.
      ENDIF
   NEXT

   RETURN .T.
