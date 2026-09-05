/*
 * api_export.prg - levar o recorte para fora: CSV, JSON, XLSX e DBF.
 *
 * O QUE SAI E O QUE ESTA NA TELA. Indice ativo, filtro ativo e colunas
 * escolhidas valem aqui do mesmo jeito que valem na grade -- exportar o arquivo
 * inteiro quando a tela mostra 73 linhas seria a surpresa mais cara possivel.
 *
 * DUAS DIFERENCAS de proposito em relacao a grade:
 *
 *   memo    entra INTEIRO. Na grade vai so o tamanho, porque 200 memos por
 *           pagina seriam megabytes; quem exporta quer o conteudo.
 *   tipos   no XLSX, numero vira celula numerica e data vira celula de data --
 *           nao texto que parece numero. E a razao de usar a hbxlsxwriter em
 *           vez de despejar CSV com outra extensao.
 *
 * O DBF NAO E TOCADO: le-se e escreve-se um arquivo novo ao lado. Ainda assim
 * valem as regras de as regras de integridade, porque o arquivo GERADO pode ficar
 * pela metade -- ver Cancelado() no fim deste arquivo.
 */

#include "dbstruct.ch"
#include "fileio.ch"
#include "hbxlsxwriter.ch"

/* De quantos em quantos registros publicar progresso e olhar o cancelamento.
   Mesmo valor do filter.count: mantem a barra fluida sem pesar no laco. */
#define QDBU_PASSO_JOB  500

/*
 * Registro marcado para exclusao.
 *
 * O QUE MANDA E O `SET DELETED` DA SESSAO (session.deleted). Com ele ligado, o
 * proprio dbSkip() pula os marcados e nada aqui precisa saber disso -- grade,
 * contagem e exportacao concordam sozinhas.
 *
 * `skipDeleted` e um ATALHO local, para o caso legitimo de querer ver os
 * marcados na tela e nao os mandar para fora. Nao substitui o SET DELETED: e um
 * "alem disso". Quando o SET DELETED ja esta ligado, esta flag nunca dispara,
 * porque Deleted() nao chega a ser verdadeiro.
 */
STATIC s_lPulaDeletado := .F.

/* Teto de linhas. Zero = sem teto (exportacao de verdade); a previa usa 5. */
STATIC s_nLimite := 0

/* ------------------------------------------------------------------- CSV */

/*
 * export.csv {"h":"h7","path":"C:/tmp/clientes.csv","scope":"filtered",
 *             "fields":["CLI_NOME"],"delimiter":";","encoding":"UTF8",
 *             "header":true,"bom":true,"timestamp":false}
 *
 * Delimitador `;` por padrao: e o que o Excel em portugues espera. Com `,` ele
 * joga a linha inteira numa celula so, e o usuario conclui que o arquivo saiu
 * errado.
 *
 * BOM por padrao com UTF-8, pela mesma razao: sem ele o Excel abre o arquivo
 * como ANSI e todo acento vira caractere estranho.
 */
FUNCTION Api_Export_Csv( hP )

   LOCAL cH   := ParStr( hP, "h" )
   LOCAL cSep := ParStr( hP, "delimiter" )
   LOCAL cCdp := Upper( ParStr( hP, "encoding" ) )
   LOCAL lCab := ParLog( hP, "header", .T. )
   LOCAL lBom := ParLog( hP, "bom", .T. )

   LOCAL xErro, aCols, cArq, nHandle, cLinha, hCol, nLidos, lParou
   LOCAL aValores, nTotal, nPulados := 0

   IF ( xErro := Prepara( hP, @cArq, @aCols, "csv" ) ) != NIL
      RETURN xErro
   ENDIF

   /*
    * Len() == 0, e NAO Empty().
    *
    * Empty() no Harbour considera vazia toda string so com espaco em branco --
    * e TAB e espaco em branco. Com Empty(), pedir separador de tabulacao caia
    * silenciosamente no ";" e o arquivo saia com o separador errado, sem
    * nenhum erro: o parametro chegava certo e era descartado aqui.
    */
   IF Len( cSep ) == 0
      cSep := ";"
   ENDIF
   IF Len( cCdp ) == 0
      cCdp := "UTF8"
   ENDIF

   nHandle := FCreate( cArq )
   IF nHandle == F_ERROR
      RETURN Err( "ERROR_EXPORT_FAILED", "could not create the file", "path", ;
                  { "file" => cArq } )
   ENDIF

   nTotal := LastRec()
   QDbu_JobBegin( JobMsg( "UI_JOB_EXPORTING", cArq ), nTotal )

   /* BOM antes de qualquer byte, senao o Excel nao o reconhece. */
   IF lBom .AND. cCdp == "UTF8"
      FWrite( nHandle, hb_BChar( 239 ) + hb_BChar( 187 ) + hb_BChar( 191 ) )
   ENDIF

   IF lCab
      cLinha := ""
      FOR EACH hCol IN aCols
         cLinha += iif( hCol:__enumIndex() > 1, cSep, "" ) + ;
                   CampoCsv( hCol[ "name" ], cSep )
      NEXT
      FWrite( nHandle, ParaCodepage( cLinha, cCdp ) + hb_eol() )
   ENDIF

   nLidos := 0
   dbGoTop()

   DO WHILE ! Eof()

      IF s_lPulaDeletado .AND. Deleted()
         nPulados++
         dbSkip( 1 )
         LOOP
      ENDIF

      aValores := {}
      FOR EACH hCol IN aCols
         AAdd( aValores, CampoCsv( ValorTexto( hCol ), cSep ) )
      NEXT

      FWrite( nHandle, ParaCodepage( ArrayToCsv( aValores, cSep ), cCdp ) + hb_eol() )

      IF s_nLimite > 0 .AND. ++nLidos >= s_nLimite
         EXIT
      ELSEIF s_nLimite == 0 .AND. ++nLidos % QDBU_PASSO_JOB == 0
         QDbu_Progress( nLidos )
         IF QDbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   lParou := QDbu_Canceled()
   QDbu_JobEnd()
   FClose( nHandle )

   RETURN Finaliza( cH, cArq, aCols, nLidos, lParou, nPulados )

/* ------------------------------------------------------------------ JSON */

/*
 * export.json {"h":"h7","path":"...","fields":[...]}
 *
 * Array de objetos, uma linha por registro -- e formato legivel por olho humano
 * e por `jq`, e o arquivo cresce de forma previsivel.
 *
 * Escrito a mao em vez de montar um array e chamar hb_jsonEncode no fim: 421 mil
 * registros num array unico seriam centenas de MB em RAM antes de o primeiro
 * byte chegar ao disco.
 *
 * Sempre UTF-8, por definicao do formato.
 */
FUNCTION Api_Export_Json( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, aCols, cArq, nHandle, hCol, nLidos, lParou, hLinha, nTotal
   LOCAL nPulados := 0

   IF ( xErro := Prepara( hP, @cArq, @aCols, "json" ) ) != NIL
      RETURN xErro
   ENDIF

   nHandle := FCreate( cArq )
   IF nHandle == F_ERROR
      RETURN Err( "ERROR_EXPORT_FAILED", "could not create the file", "path", ;
                  { "file" => cArq } )
   ENDIF

   nTotal := LastRec()
   QDbu_JobBegin( JobMsg( "UI_JOB_EXPORTING", cArq ), nTotal )

   FWrite( nHandle, "[" + hb_eol() )

   nLidos := 0
   dbGoTop()

   DO WHILE ! Eof()

      IF s_lPulaDeletado .AND. Deleted()
         nPulados++
         dbSkip( 1 )
         LOOP
      ENDIF

      hLinha := { => }
      hb_HKeepOrder( hLinha, .T. )
      FOR EACH hCol IN aCols
         hLinha[ hCol[ "name" ] ] := ValorJson( hCol )
      NEXT

      FWrite( nHandle, ;
              iif( nLidos > 0, "," + hb_eol(), "" ) + ;
              "  " + hb_jsonEncode( ConvertDeep( hLinha, .T. ) ) )

      IF s_nLimite > 0 .AND. ++nLidos >= s_nLimite
         EXIT
      ELSEIF s_nLimite == 0 .AND. ++nLidos % QDBU_PASSO_JOB == 0
         QDbu_Progress( nLidos )
         IF QDbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   lParou := QDbu_Canceled()

   /* Fecha o array mesmo cancelado: um JSON truncado no meio nao abre em lugar
      nenhum, e o arquivo vai ser apagado logo abaixo de qualquer forma -- mas
      se um dia alguem resolver conservar o parcial, ele ao menos sera valido. */
   FWrite( nHandle, hb_eol() + "]" + hb_eol() )

   QDbu_JobEnd()
   FClose( nHandle )

   RETURN Finaliza( cH, cArq, aCols, nLidos, lParou, nPulados )

/* ------------------------------------------------------------------ XLSX */

/*
 * export.xlsx {"h":"h7","path":"...","sheet":"Dados","fields":[...]}
 *
 * XLSX de verdade (OOXML/ZIP) pela hbxlsxwriter, em modo `constant_memory`:
 * escreve linha a linha e nao guarda a planilha em RAM. Sem isso, 421 mil linhas
 * nao caberiam na memoria de um processo 32-bit.
 *
 * O modo impoe escrita SEQUENCIAL e exige AutoFilter/larguras ANTES dos dados --
 * por isso a ordem abaixo nao pode ser trocada por conveniencia.
 */
FUNCTION Api_Export_Xlsx( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cAba  := ParStr( hP, "sheet" )
   LOCAL xErro, aCols, cArq, oXls, hNegrito, hData, hCol, nLidos, lParou
   LOCAL nLin, nCol, xVal, nTotal, cTmp, nPulados := 0
   LOCAL nFalhas := 0, cPrimeiraFalha := ""

   IF ( xErro := Prepara( hP, @cArq, @aCols, "xlsx" ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( cAba )
      cAba := "Dados"
   ENDIF

   /* Temporario dentro do projeto (regra 1 do o guia do projeto): a lib grava pedacos do
      ZIP em disco durante o constant_memory. */
   cTmp := hb_DirSepAdd( DirRun() )
   IF ! hb_DirExists( cTmp )
      hb_DirBuild( cTmp )
   ENDIF

   oXls := THbXlsxWriter():New( cArq, .T., cTmp )

   IF oXls == NIL .OR. ! oXls:IsOpen()
      RETURN Err( "ERROR_EXPORT_FAILED", "could not create the file", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), ;
                    "reason" => iif( oXls == NIL, "", oXls:LastErrorMessage() ) } )
   ENDIF

   nTotal := LastRec()
   QDbu_JobBegin( JobMsg( "UI_JOB_EXPORTING", cArq ), nTotal )

   oXls:AddSheet( cAba )

   hNegrito := oXls:AddFormat()
   oXls:FormatSetBold( hNegrito )

   hData := oXls:AddFormat()
   oXls:FormatSetNumFormat( hData, "dd/mm/yyyy" )

   /* Larguras e cabecalho ANTES das linhas: em constant_memory nao da para
      voltar e mexer numa linha ja escrita. */
   FOR nCol := 1 TO Len( aCols )
      oXls:SetColumn( nCol, nCol, LarguraDe( aCols[ nCol ] ) )
      oXls:WriteString( 1, nCol, aCols[ nCol ][ "name" ], hNegrito )
   NEXT

   oXls:FreezePanes( 1, 0 )

   nLidos := 0
   nLin := 1
   dbGoTop()

   DO WHILE ! Eof()

      IF s_lPulaDeletado .AND. Deleted()
         nPulados++
         dbSkip( 1 )
         LOOP
      ENDIF

      nLin++
      FOR nCol := 1 TO Len( aCols )
         hCol := aCols[ nCol ]
         xVal := ValorNativo( hCol )

         /* Tipo preservado: numero soma, data ordena. Se tudo virasse texto, o
            XLSX nao valeria mais que um CSV renomeado. */
         /*
          * O RETORNO DE CADA WRITE E CONFERIDO.
          *
          * A lib recusa alguns valores (caractere de controle, string longa
          * demais) devolvendo codigo de erro -- e ignorar esse retorno faz a
          * celula sumir da planilha sem nada na tela. Foi assim que um campo
          * com TAB no meio desapareceu do XLSX enquanto o CSV o exportava
          * corretamente: dado perdido em silencio, o pior modo de falhar.
          *
          * Aqui a falha e contada e volta no resultado, com a primeira coluna
          * que deu problema.
          */
         DO CASE
         CASE HB_ISNUMERIC( xVal )
            Confere( oXls:WriteNumber( nLin, nCol, xVal ), ;
                     aCols[ nCol ][ "name" ], @nFalhas, @cPrimeiraFalha )
         CASE HB_ISDATE( xVal )
            IF ! Empty( xVal )
               Confere( oXls:WriteDate( nLin, nCol, xVal, hData ), ;
                        aCols[ nCol ][ "name" ], @nFalhas, @cPrimeiraFalha )
            ENDIF
         CASE HB_ISLOGICAL( xVal )
            Confere( oXls:WriteString( nLin, nCol, Bool2C( xVal ) ), ;
                     aCols[ nCol ][ "name" ], @nFalhas, @cPrimeiraFalha )
         OTHERWISE
            /*
             * NUL fora ANTES de entregar a string.
             *
             * A libxlsxwriter e C: ela le a string ate o primeiro byte zero.
             * Um campo com "antes<NUL>depois" -- lixo binario comum em DBF real
             * -- chegava ao Excel como "antes", perdendo metade do valor sem
             * erro nenhum. O CSV ja fazia isso em CampoCsv(); aqui faltava.
             */
            IF Len( hb_CStr( xVal ) ) > 0
               Confere( oXls:WriteString( nLin, nCol, ;
                           ParaUtf8( LimpaControle( hb_CStr( xVal ) ) ) ), ;
                        aCols[ nCol ][ "name" ], @nFalhas, @cPrimeiraFalha )
            ENDIF
         ENDCASE
      NEXT

      IF s_nLimite > 0 .AND. ++nLidos >= s_nLimite
         EXIT
      ELSEIF s_nLimite == 0 .AND. ++nLidos % QDBU_PASSO_JOB == 0
         QDbu_Progress( nLidos )
         IF QDbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   lParou := QDbu_Canceled()
   QDbu_JobEnd()

   /* Close() SEMPRE, inclusive cancelado: e ele que fecha o pacote ZIP e libera
      o handle. Pular o Close para "abortar mais rapido" vaza o handle e deixa os
      temporarios da lib no disco -- o arquivo some, o lixo fica. */
   oXls:Close()

   IF nFalhas > 0
      /* Nao e recusa: o arquivo saiu e a maioria das celulas esta la. Mas o
         usuario precisa saber que algo nao coube, e em qual coluna procurar. */
      hb_default( @cPrimeiraFalha, "?" )
   ENDIF

   RETURN Finaliza( cH, cArq, aCols, nLidos, lParou, nPulados, ;
                    nFalhas, cPrimeiraFalha )

/* ------------------------------------------------------------------- DBF */

/*
 * export.dbf {"h":"h7","path":"...","fields":[...],"scope":"filtered"}
 *
 * O antigo `COPY TO` do Clipper. Absorve o B12.3 do checklist: era "operacao em
 * massa", mas na pratica e a mesma coisa que exportar -- le o arquivo aberto e
 * cria outro ao lado, sem tocar no original. A fronteira util nao e o FORMATO
 * (DBF de um lado, CSV de outro), e a DIRECAO: o que sai vira exportacao, o que
 * escreve no arquivo aberto fica na T13.
 *
 * UNICO FORMATO COM ESTRUTURA. Os outros descrevem valores; este descreve
 * tambem tipo, tamanho e decimais -- entao os campos escolhidos viram a
 * estrutura do arquivo novo, com os tipos ORIGINAIS. Exportar N(12,2) como
 * texto seria perder no destino o que o CSV ja perde por natureza.
 */
FUNCTION Api_Export_Dbf( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, aCols, cArq, hCol, nLidos, lParou, nPulados := 0
   LOCAL aEstru, nOrigem, nDestino, cAliasNovo, oErr, aValores, i, nTotal

   IF ( xErro := Prepara( hP, @cArq, @aCols, "dbf" ) ) != NIL
      RETURN xErro
   ENDIF

   /*
    * DESTINO NAO PODE SER A ORIGEM.
    *
    * Copiar NETCLI.DBF sobre ele mesmo com filtro ativo apagaria justamente os
    * registros que o filtro esconde -- o arquivo sairia "funcionando", com
    * menos dados, e a perda so apareceria quando alguem procurasse um registro
    * que nao existe mais. E a unica operacao deste modulo capaz de destruir
    * dado, e por isso e barrada antes de qualquer arquivo ser criado.
    */
   IF Upper( CaminhoOS( cArq ) ) == Upper( CaminhoOS( SessHandle( cH )[ "path" ] ) )
      RETURN Err( "ERROR_SAME_FILE", "destination is the file being read", "path" )
   ENDIF

   /* Estrutura do destino: so as colunas escolhidas, com os tipos de origem. */
   aEstru := {}
   FOR EACH hCol IN aCols
      AAdd( aEstru, { hCol[ "name" ], hCol[ "type" ], hCol[ "len" ], hCol[ "dec" ] } )
   NEXT

   IF Empty( aEstru )
      RETURN Err( "ERROR_NO_COLUMNS", "no column selected", "fields" )
   ENDIF

   nOrigem := Select()
   nTotal := LastRec()

   QDbu_JobBegin( JobMsg( "UI_JOB_COPYING", cArq ), nTotal )

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      /* dbCreate cria o .DBT junto quando ha campo memo na estrutura. */
      dbCreate( cArq, aEstru )
   RECOVER USING oErr
      QDbu_JobEnd()
      RETURN Err( "ERROR_EXPORT_FAILED", "could not create the file", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), ;
                    "reason" => iif( HB_ISOBJECT( oErr ) .AND. ;
                                     HB_ISSTRING( oErr:description ), ;
                                     oErr:description, "" ) } )
   END SEQUENCE

   cAliasNovo := AliasDestino( cArq )

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T., , cArq, cAliasNovo, .F., .F. )   /* exclusivo: e nosso */
   RECOVER USING oErr
      QDbu_JobEnd()
      ApagaDbf( cArq )
      RETURN Err( "ERROR_EXPORT_OPEN_FAILED", "file created but could not be opened", ;
                  "path", { "file" => hb_FNameNameExt( cArq ), ;
                            "reason" => iif( HB_ISOBJECT( oErr ) .AND. ;
                                             HB_ISSTRING( oErr:description ), ;
                                             oErr:description, "" ) } )
   END SEQUENCE

   nDestino := Select()
   dbSelectArea( nOrigem )
   dbGoTop()

   nLidos := 0

   DO WHILE ! Eof()

      IF s_lPulaDeletado .AND. Deleted()
         nPulados++
         dbSkip( 1 )
         LOOP
      ENDIF

      /* Le TUDO na origem antes de trocar de area: alternar duas vezes por
         campo, em 400 mil registros com 100 colunas, seriam 80 milhoes de
         trocas de work area. */
      aValores := {}
      FOR EACH hCol IN aCols
         AAdd( aValores, FieldGet( hCol[ "pos" ] ) )
      NEXT

      dbSelectArea( nDestino )
      dbAppend()
      FOR i := 1 TO Len( aValores )
         FieldPut( i, aValores[ i ] )
      NEXT
      dbSelectArea( nOrigem )

      IF ++nLidos % QDBU_PASSO_JOB == 0
         QDbu_Progress( nLidos )
         IF QDbu_Canceled()
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   lParou := QDbu_Canceled()
   QDbu_JobEnd()

   /* Fecha o destino ANTES de qualquer coisa: e ele que grava o cabecalho com a
      contagem de registros. Apagar com a area aberta deixaria o handle preso. */
   dbSelectArea( nDestino )
   dbCloseArea()
   dbSelectArea( nOrigem )

   IF lParou
      ApagaDbf( cArq )
      RETURN Err( "WARN_CANCELED_PARTIAL_FILE", "canceled; partial file deleted", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "n" => nLidos } )
   ENDIF

   RETURN Finaliza( cH, cArq, aCols, nLidos, .F., nPulados, 0, "" )

/*
 * Alias livre para o destino.
 *
 * O nome do arquivo pode colidir com um alias ja em uso -- copiar NETCLI.DBF
 * para uma pasta de backup com o mesmo nome daria "alias already in use" e a
 * copia falharia por um motivo que nada tem a ver com o pedido.
 */
STATIC FUNCTION AliasDestino( cArq )

   LOCAL cBase := Upper( hb_FNameName( cArq ) )
   LOCAL cTenta := "DEST_" + cBase
   LOCAL i := 1

   DO WHILE Select( cTenta ) > 0 .AND. i < 100
      i++
      cTenta := "DEST" + hb_ntos( i ) + "_" + cBase
   ENDDO

   RETURN cTenta

/* Apaga o DBF e o memo que veio com ele -- R3 de as regras de integridade. */
STATIC FUNCTION ApagaDbf( cArq )

   LOCAL cSem := hb_FNameExtSet( cArq, "" )
   LOCAL cExt

   FErase( cArq )

   /* O .DBT anda junto: deixa-lo orfao faria o proximo dbCreate com o mesmo
      nome herdar memo de outro arquivo. */
   FOR EACH cExt IN { ".dbt", ".DBT", ".fpt", ".FPT" }
      IF hb_FileExists( cSem + cExt )
         FErase( cSem + cExt )
      ENDIF
   NEXT

   RETURN NIL

/* --------------------------------------------------------------- previa */

/*
 * export.preview {...mesmos parametros...,"preview":5} -> as primeiras linhas
 * como VAO SAIR.
 *
 * Exporta de verdade para um arquivo temporario em .run/ e devolve o comeco
 * dele. Poderia formatar em memoria e economizar o disco -- mas ai a previa
 * concordaria com o codigo da previa, e nao com o codigo que escreve o arquivo.
 * O erro que se quer pegar (separador errado, codificacao errada, coluna a mais)
 * mora justamente na diferenca entre os dois.
 *
 * Nao vale para XLSX: e um ZIP binario, nao ha "primeiras linhas" para mostrar.
 * Nesse caso volta a contagem e um resumo das colunas, que e o que da para
 * conferir antes de gravar.
 */
FUNCTION Api_Export_Preview( hP )

   LOCAL nQtas := ParNum( hP, "preview", 5 )
   LOCAL cFmt  := Lower( ParStr( hP, "format" ) )
   LOCAL hCopia, cTmp, xRet, cTexto, nH, cBuf, nLido, aCols, cH, xErro

   cH := ParStr( hP, "h" )

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( cFmt )
      cFmt := ExtensaoDe( ParStr( hP, "path" ) )
   ENDIF

   /* XLSX e DBF nao tem previa de texto: um e ZIP, o outro e binario com
      cabecalho. Devolve a estrutura, que e o que da para conferir antes. */
   IF cFmt == "xlsx" .OR. cFmt == "dbf"
      IF ( xErro := ColunasParaPreview( hP, @aCols ) ) != NIL
         RETURN xErro
      ENDIF
      RETURN Ok( { "sample" => ResumoColunas( aCols ), ;
                   "records" => ContaEscopo( hP ), ;
                   "binary" => .T. } )
   ENDIF

   cTmp := hb_DirSepAdd( DirRun() )
   IF ! hb_DirExists( cTmp )
      hb_DirBuild( cTmp )
   ENDIF
   cTmp += "preview." + cFmt

   /* Copia dos parametros com destino e teto proprios: a previa nao pode
      escrever no arquivo que o usuario escolheu nem varrer 421 mil registros. */
   hCopia := hb_HClone( hP )
   hCopia[ "path" ] := cTmp
   hCopia[ "replace" ] := .T.
   hCopia[ "timestamp" ] := .F.
   hCopia[ "limit" ] := Max( 1, Min( nQtas, 50 ) )

   xRet := iif( cFmt == "json", Api_Export_Json( hCopia ), Api_Export_Csv( hCopia ) )

   IF ! xRet[ "ok" ]
      RETURN xRet
   ENDIF

   /* Le so o comeco: o arquivo e pequeno por causa do `limit`, mas o teto aqui
      protege de um campo memo gigante numa das primeiras linhas. */
   cTexto := ""
   nH := FOpen( cTmp, FO_READ + FO_SHARED )
   IF nH != F_ERROR
      cBuf := Space( 8192 )
      nLido := FRead( nH, @cBuf, 8192 )
      FClose( nH )
      cTexto := Left( cBuf, nLido )
   ENDIF
   FErase( cTmp )

   /* O BOM apareceria como lixo no comeco da previa. */
   IF Left( cTexto, 3 ) == hb_BChar( 239 ) + hb_BChar( 187 ) + hb_BChar( 191 )
      cTexto := SubStr( cTexto, 4 )
   ENDIF

   RETURN Ok( { "sample" => DeUtf8Seguro( cTexto, hP ), ;
                "records" => ContaEscopo( hP ), ;
                "binary" => .F. } )

/*
 * A previa volta pelo dispatcher, que converte tudo para UTF-8 na saida. Se o
 * usuario pediu CP850 ou ANSI, o texto lido do arquivo esta naquela codificacao
 * -- converter de volta para a nativa evita que o dispatcher receba bytes que
 * nao sao dela e produza mojibake na tela.
 */
STATIC FUNCTION DeUtf8Seguro( cTexto, hP )

   LOCAL cCdp := Upper( ParStr( hP, "encoding" ) )

   SWITCH cCdp
   CASE "UTF8" ; CASE "" ; RETURN DeUtf8( cTexto )
   CASE "ANSI"           ; RETURN hb_Translate( cTexto, "PTISO", CdpNativa() )
   ENDSWITCH

   RETURN cTexto   /* CP850 ja e a nativa */

STATIC FUNCTION ExtensaoDe( cArq )

   LOCAL c := Lower( SubStr( hb_defaultValue( cArq, "" ), 2 ) )

   DO CASE
   CASE ".json" $ c ; RETURN "json"
   CASE ".xlsx" $ c ; RETURN "xlsx"
   CASE ".dbf"  $ c ; RETURN "dbf"
   ENDCASE

   RETURN "csv"

STATIC FUNCTION ColunasParaPreview( hP, aCols )

   LOCAL aCampos := ParArr( hP, "fields" )

   IF Empty( aCampos )
      aCampos := Visiveis( SessHandle( ParStr( hP, "h" ) ) )
   ENDIF

   RETURN ColunasDaExportacao( aCampos, @aCols )

STATIC FUNCTION ResumoColunas( aCols )

   LOCAL cTxt := ""
   LOCAL hCol

   FOR EACH hCol IN aCols
      cTxt += hCol[ "name" ] + "  " + hCol[ "type" ] + ;
              hb_ntos( hCol[ "len" ] ) + ;
              iif( hCol[ "dec" ] > 0, "," + hb_ntos( hCol[ "dec" ] ), "" ) + hb_eol()
   NEXT

   RETURN cTxt

/* Quantos registros o escopo escolhido produz, sem varrer o arquivo: com filtro
   ativo nao da para saber sem contar, e a previa nao pode custar isso. */
STATIC FUNCTION ContaEscopo( hP )

   IF Lower( ParStr( hP, "scope" ) ) == "all" .OR. Empty( dbFilter() )
      RETURN LastRec()
   ENDIF

   RETURN -1   /* desconhecido: a UI mostra "?" */

/* --------------------------------------------------------------- comum */

/*
 * Valida o pedido, resolve o destino e monta as colunas.
 *
 * Tudo que pode recusar acontece AQUI, antes de criar arquivo: um destino
 * invalido descoberto na linha 300 mil deixa um arquivo pela metade e o trabalho
 * perdido.
 */
STATIC FUNCTION Prepara( hP, cArq, aCols, cExt )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL cEscopo := Lower( ParStr( hP, "scope" ) )
   LOCAL aCampos := ParArr( hP, "fields" )
   LOCAL lStamp  := ParLog( hP, "timestamp", .F. )
   LOCAL lSubst  := ParLog( hP, "replace", .F. )
   LOCAL xErro, hInfo, cDir

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   cArq := ParStr( hP, "path" )
   IF Empty( AllTrim( cArq ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "destination file is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   cArq := CaminhoOS( cArq )

   IF Empty( hb_FNameExt( cArq ) )
      cArq += "." + cExt
   ENDIF

   IF lStamp
      cArq := hb_FNameDir( cArq ) + hb_FNameName( cArq ) + "_" + ;
              hb_TToC( hb_DateTime(), "YYYYMMDD", "HHMM" ) + hb_FNameExt( cArq )
      cArq := StrTran( cArq, " ", "_" )
   ENDIF

   cDir := hb_FNameDir( cArq )
   IF ! Empty( cDir ) .AND. ! hb_DirExists( cDir )
      RETURN Err( "ERROR_DIR_NOT_FOUND", "folder not found", "path", { "dir" => cDir } )
   ENDIF

   IF hb_FileExists( cArq ) .AND. ! lSubst
      RETURN Err( "ERROR_FILE_EXISTS", "file already exists", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   /*
    * Colunas. Vazio significa "as visiveis" -- o que esta na tela --, e nao
    * "todas": quem escolheu 3 de 122 fez isso de proposito. `scope: "all"` no
    * campo `fields` seria ambiguo, entao quem quiser todas manda a lista inteira
    * (a UI tem o botao "Todas" para isso).
    */
   hInfo := SessHandle( cH )
   IF Empty( aCampos )
      aCampos := Visiveis( hInfo )
   ENDIF

   IF ( xErro := ColunasDaExportacao( aCampos, @aCols ) ) != NIL
      RETURN xErro
   ENDIF

   /*
    * Escopo do FILTRO, que e outra pergunta: "all" exporta o arquivo inteiro,
    * ignorando o filtro em vigor. Nao mexemos no filtro da sessao -- ele e
    * desligado e religado aqui dentro, senao exportar mudaria o que o usuario ve
    * na grade depois.
    */
   IF cEscopo == "all" .AND. ! Empty( dbFilter() )
      dbClearFilter()
   ENDIF

   s_lPulaDeletado := ParLog( hP, "skipDeleted", .F. )
   s_nLimite := ParNum( hP, "limit", 0 )

   RETURN NIL

/*
 * Colunas da exportacao: como SelecionaColunas() da grade, mas o memo entra
 * inteiro em vez de virar {"memo":true}.
 */
STATIC FUNCTION ColunasDaExportacao( aPedidos, aCols )

   LOCAL cAlias := Alias()
   LOCAL aEstru := dbStruct()
   LOCAL cNome, nPos, i

   aCols := {}

   IF Empty( aPedidos )
      FOR i := 1 TO Len( aEstru )
         AAdd( aCols, DescreveCol( cAlias, aEstru[ i ], i ) )
      NEXT
      RETURN NIL
   ENDIF

   FOR EACH cNome IN aPedidos
      IF ! HB_ISSTRING( cNome )
         RETURN Err( "ERROR_PARAM_MUST_BE_LIST", "fields must be a list of names", "fields", ;
                        { "param" => "fields" } )
      ENDIF

      cNome := NomeSimples( cNome )
      nPos := FieldPos( cNome )

      IF nPos == 0
         RETURN Err( "ERROR_FIELD_NOT_FOUND", "field not found", "fields", ;
                     { "field" => cNome, "alias" => cAlias } )
      ENDIF

      AAdd( aCols, DescreveCol( cAlias, aEstru[ nPos ], nPos ) )
   NEXT

   RETURN NIL

STATIC FUNCTION DescreveCol( cAlias, aField, nPos )
   RETURN { "key"  => cAlias + "->" + aField[ DBS_NAME ], ;
            "name" => aField[ DBS_NAME ], ;
            "type" => aField[ DBS_TYPE ], ;
            "len"  => aField[ DBS_LEN ], ;
            "dec"  => aField[ DBS_DEC ], ;
            "pos"  => nPos }

/*
 * Resposta comum, e a limpeza do parcial.
 *
 * R3 de as regras de integridade: cancelar nao deixa lixo. Um CSV cortado no meio
 * de uma linha e um XLSX sem o resto das linhas SAO arquivos validos aos olhos
 * do sistema -- abrem, tem tamanho, e estao incompletos. Deixa-los seria pior
 * que nao ter exportado.
 */
STATIC FUNCTION Finaliza( cH, cArq, aCols, nLidos, lParou, nPulados, nFalhas, cColuna )

   LOCAL aNomes := {}
   LOCAL hCol

   FOR EACH hCol IN aCols
      AAdd( aNomes, hCol[ "name" ] )
   NEXT

   IF lParou
      IF hb_FileExists( cArq )
         FErase( cArq )
      ENDIF
      RETURN Err( "WARN_CANCELED_PARTIAL_FILE", "canceled; partial file deleted", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "n" => nLidos } )
   ENDIF

   RETURN Ok( { "h" => cH, ;
                "path" => cArq, ;
                "file" => hb_FNameNameExt( cArq ), ;
                "records" => nLidos, ;
                "skipped" => hb_defaultValue( nPulados, 0 ), ;
                "cellErrors" => hb_defaultValue( nFalhas, 0 ), ;
                "errorColumn" => hb_defaultValue( cColuna, "" ), ;
                "columns" => aNomes, ;
                "size" => hb_FSize( cArq ) } )

/* --------------------------------------------------------------- valores */

/* Valor no tipo nativo do Harbour -- o XLSX e o JSON precisam do tipo. */
STATIC FUNCTION ValorNativo( hCol )

   LOCAL xVal := FieldGet( hCol[ "pos" ] )

   /* Memo INTEIRO, ao contrario da grade. */
   IF hCol[ "type" ] $ "MP"
      RETURN RTrim( hb_defaultValue( xVal, "" ) )
   ENDIF

   IF HB_ISSTRING( xVal )
      RETURN RTrim( xVal )
   ENDIF

   RETURN xVal

/*
 * Valor para o JSON.
 *
 * Igual ao nativo, EXCETO data: hb_jsonEncode() serializa um valor tipo D no
 * formato cru do DBF ("20090703"), e data vazia como oito espacos. Os dois sao
 * inuteis para quem consome o arquivo -- "        " nao e nem data nem nulo.
 * ISO resolve os dois: ordena como texto e todo mundo sabe ler.
 */
STATIC FUNCTION ValorJson( hCol )

   LOCAL xVal := ValorNativo( hCol )

   IF HB_ISDATE( xVal )
      RETURN iif( Empty( xVal ), "", hb_DToC( xVal, "YYYY-MM-DD" ) )
   ENDIF

   RETURN xVal

/* Valor como texto, para o CSV. Data em ISO: ordena como string e nao depende
   do SET DATE de quem abrir. */
STATIC FUNCTION ValorTexto( hCol )

   LOCAL xVal := ValorNativo( hCol )

   DO CASE
   CASE xVal == NIL          ; RETURN ""
   CASE HB_ISSTRING( xVal )  ; RETURN xVal
   CASE HB_ISNUMERIC( xVal ) ; RETURN hb_ntos( xVal )
   CASE HB_ISDATE( xVal )    ; RETURN iif( Empty( xVal ), "", hb_DToC( xVal, "YYYY-MM-DD" ) )
   CASE HB_ISLOGICAL( xVal ) ; RETURN Bool2C( xVal )
   ENDCASE

   RETURN hb_CStr( xVal )

/*
 * Escape RFC 4180: aspas dobram, e o campo so e envolvido quando precisa --
 * separador, aspas ou quebra de linha dentro do valor.
 *
 * DBF real tem quebra de linha em campo C e byte NUL como lixo. Sem este escape,
 * uma linha vira duas e o arquivo inteiro desalinha a partir dali.
 */
STATIC FUNCTION CampoCsv( cTexto, cSep )

   LOCAL c := hb_defaultValue( cTexto, "" )

   /* NUL nao tem representacao em CSV e nao e dado: sai fora. */
   c := StrTran( c, hb_BChar( 0 ), "" )

   IF cSep $ c .OR. '"' $ c .OR. Chr( 13 ) $ c .OR. Chr( 10 ) $ c
      RETURN '"' + StrTran( c, '"', '""' ) + '"'
   ENDIF

   RETURN c

STATIC FUNCTION ArrayToCsv( aValores, cSep )

   LOCAL cLinha := ""
   LOCAL c

   FOR EACH c IN aValores
      cLinha += iif( c:__enumIndex() > 1, cSep, "" ) + c
   NEXT

   RETURN cLinha

/*
 * Codepage de saida do CSV.
 *
 * O lado DBF e CP850; o padrao de saida e UTF-8, porque e o que qualquer
 * ferramenta de hoje espera. CP850 e CP1252 ficam para quem precisa alimentar
 * um sistema antigo.
 */
STATIC FUNCTION ParaCodepage( cTexto, cCdp )

   IF Empty( cTexto )
      RETURN cTexto
   ENDIF

   SWITCH cCdp
   CASE "UTF8"  ; RETURN ParaUtf8( cTexto )
   CASE "CP850" ; RETURN cTexto                       /* ja e a nativa */
   CASE "ANSI"  ; RETURN hb_Translate( cTexto, CdpNativa(), "PTISO" )
   ENDSWITCH

   RETURN ParaUtf8( cTexto )

/* Conta a celula que a lib recusou e guarda a primeira coluna problematica. */
STATIC FUNCTION Confere( nErro, cColuna, nFalhas, cPrimeira )

   IF nErro != 0
      nFalhas++
      IF Empty( cPrimeira )
         cPrimeira := cColuna
      ENDIF
   ENDIF

   RETURN NIL

/*
 * Tira os caracteres de controle que o XLSX nao aceita.
 *
 * TAB, CR e LF sao validos em XML e a lib os aceita; o resto abaixo de 0x20 nao.
 * Trocar por espaco preserva a largura do campo e nao inventa conteudo -- apagar
 * juntaria palavras que estavam separadas.
 */
STATIC FUNCTION LimpaControle( cTexto )

   LOCAL cRet := ""
   LOCAL i, n

   FOR i := 1 TO Len( cTexto )
      n := hb_BCode( SubStr( cTexto, i, 1 ) )
      DO CASE
      CASE n == 0                      /* NUL trunca a string no lado C */
      CASE n < 32 .AND. n != 9 .AND. n != 10 .AND. n != 13
         cRet += " "
      OTHERWISE
         cRet += SubStr( cTexto, i, 1 )
      ENDCASE
   NEXT

   RETURN cRet

/* Largura da coluna no Excel: o tamanho do campo, com teto -- uma coluna C(254)
   ocuparia a tela inteira e ninguem le 254 caracteres numa celula. */
STATIC FUNCTION LarguraDe( hCol )

   LOCAL n := Max( Len( hCol[ "name" ] ), hCol[ "len" ] ) + 2

   RETURN Min( n, 48 )

/* ---------------------------------------------------------------- params */

STATIC FUNCTION ParStr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )

STATIC FUNCTION ParLog( hP, cChave, lPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN lPadrao
   ENDIF

   RETURN iif( HB_ISLOGICAL( hP[ cChave ] ), hP[ cChave ], lPadrao )

STATIC FUNCTION ParNum( hP, cChave, nPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN nPadrao
   ENDIF

   RETURN iif( HB_ISNUMERIC( hP[ cChave ] ), hP[ cChave ], nPadrao )

STATIC FUNCTION ParArr( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN {}
   ENDIF

   RETURN iif( HB_ISARRAY( hP[ cChave ] ), hP[ cChave ], {} )
