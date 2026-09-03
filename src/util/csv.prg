/*
 * csv.prg - leitura de CSV, RFC 4180.
 *
 * PORTADO DO ERP DO AUTOR, e nao escrito do zero de proposito. A origem e
 * `J:\programa\NP32.svn\Apps\csv_reader\csv_reader.prg:48` (ParseCSV, de
 * 02/05/2026), com o tratamento de BOM e a deteccao de separador da porta que
 * vive em `NETRTC.Planilhas.prg:114` (CSVCarrega/CSVParseTexto). Codigo em
 * producha ha anos, validado contra celula com quebra de linha interna.
 *
 * POR QUE NAO O `DELIM` DO HARBOUR, que ja vinha de graca:
 *
 *   Medido em 03/09/2026, com `__dbApp( ..., "DELIM" )`:
 *
 *     "ele disse ""oi"" ontem"          ->  "ele disse"     TRUNCADO no ""
 *     "SILVA, JOAO";"a;b";"c"           ->  so o 1o campo   ; NAO e separador
 *     A;B;C  (cabecalho)                ->  virou REGISTRO
 *
 *   As tres sao perda silenciosa de dado. E a terceira e fatal para nos: o
 *   nosso proprio `export.csv` grava com `;` por padrao (e o que o Excel pt-BR
 *   espera), entao exportar e reimportar destruia o arquivo.
 *
 * O `hb_ATokens` tem um modo com aspas que quase serve -- 3o parametro
 * `lSkipStrings`, em hbtoken.c:264 -- e cobre separador dentro de aspas e
 * quebra de linha. Mas fecha a aspa incondicionalmente (hbtoken.c:183), entao
 * tambem erra o `""`, e nao remove as aspas do valor: a flag
 * `_HB_TOK_STRIP_QUOTE` esta definida e nunca e testada, constante morta.
 *
 * O QUE ESTE CODIGO DESVIA DO RFC, e e deliberado:
 *
 *   `AllTrim()` em todo campo, inclusive nos que vieram entre aspas. Pelo RFC,
 *   `"  espaco  "` deveria preservar os espacos. Para importar em DBF o
 *   contrario e o util -- planilha real vem cheia de espaco de digitacao, e um
 *   campo C(10) que recebe "  ABC   " perde o valor no lado direito. O ERP
 *   tomou essa decisao e ela esta aqui de proposito, dita em voz alta.
 */

#include "fileio.ch"


/*
 * Le o arquivo inteiro e devolve array de linhas, cada uma array de campos.
 *
 * `cDelim` NIL faz a deteccao automatica pela primeira linha: mais `;` que `,`
 * decide por `;`. Cobre a saida do Excel pt-BR e a do nosso proprio export.
 *
 * `lAbertas` (por referencia) volta .T. quando o arquivo terminou com uma aspa
 * aberta. Nao e erro do parser -- e arquivo malformado, e quem chama decide se
 * recusa ou avisa. Sem isto o resto do arquivo vira um campo so, em silencio.
 */
FUNCTION CsvLe( cArquivo, cDelim, lAbertas, cCdp )

   LOCAL cTexto

   lAbertas := .F.

   IF Empty( cArquivo ) .OR. ! hb_FileExists( cArquivo )
      RETURN {}
   ENDIF

   cTexto := hb_MemoRead( cArquivo )

   IF Empty( cTexto )
      RETURN {}
   ENDIF

   cTexto := CsvSemBom( cTexto )

   /*
    * A CODIFICACAO E CONVERTIDA ANTES DE QUALQUER COISA.
    *
    * `hb_MemoRead` devolve BYTES CRUS, e o DBF fala CP850. Sem converter,
    * "acento acao" gravado em UTF-8 ou em ANSI chega como lixo -- medido:
    * `ação` virou `aþÒo`. E o pior e que a estrutura do arquivo continua certa,
    * entao a importacao "funciona" e o estrago so aparece na tela depois.
    *
    * A tabela e a MESMA da exportacao (DeUtf8Seguro, api_export.prg:645), e nao
    * uma segunda opiniao: o que sai por um lado tem de voltar pelo outro. UTF-8
    * e o padrao porque e o que o nosso proprio export.csv grava.
    */
   cTexto := CsvDeCodepage( cTexto, cCdp )

   IF ! HB_ISSTRING( cDelim ) .OR. Len( cDelim ) != 1
      cDelim := CsvDelimitador( cTexto )
   ENDIF

   RETURN CsvTexto( cTexto, cDelim, @lAbertas )


/*
 * Tira o BOM UTF-8, nas DUAS formas -- e as duas sao necessarias.
 *
 * Com a codepage ativa, os bytes EF BB BF chegam colapsados num unico
 * caractere U+FEFF (65279). Lidos crus, chegam como tres bytes. Testar so uma
 * das formas deixa o BOM contaminar o primeiro campo do cabecalho, e o efeito e
 * um campo que "existe mas nunca casa" no mapeamento por nome.
 */
STATIC FUNCTION CsvSemBom( cTexto )

   IF Len( cTexto ) >= 1 .AND. Asc( SubStr( cTexto, 1, 1 ) ) == 65279
      RETURN SubStr( cTexto, 2 )
   ENDIF

   IF Len( cTexto ) >= 3 .AND. ;
      SubStr( cTexto, 1, 3 ) == Chr( 239 ) + Chr( 187 ) + Chr( 191 )
      RETURN SubStr( cTexto, 4 )
   ENDIF

   RETURN cTexto


/* Mais `;` que `,` na primeira linha fisica decide por `;`. */
STATIC FUNCTION CsvDelimitador( cTexto )

   LOCAL nPos := At( Chr( 10 ), cTexto )
   LOCAL cLinha1 := iif( nPos > 0, SubStr( cTexto, 1, nPos - 1 ), cTexto )

   RETURN iif( CsvConta( cLinha1, ";" ) > CsvConta( cLinha1, "," ), ";", "," )


STATIC FUNCTION CsvConta( cTexto, cChar )

   LOCAL n := 0, i

   FOR i := 1 TO Len( cTexto )
      IF SubStr( cTexto, i, 1 ) == cChar
         n++
      ENDIF
   NEXT

   RETURN n


/*
 * A maquina de estados, caractere a caractere.
 *
 * NAO TROCAR POR `hb_ATokens` COM CRLF. O comentario do original avisa disso, e
 * a razao e a celula multilinha: quebrar por CRLF antes de olhar as aspas
 * desalinha TODOS os registros a partir da primeira celula que contem uma
 * quebra de linha. O erro nao aparece no comeco do arquivo -- aparece do meio
 * para o fim, que e onde ninguem confere.
 */
FUNCTION CsvTexto( cTexto, cDelim, lAbertas )

   LOCAL aLinhas := {}
   LOCAL aLinha := {}
   LOCAL cCampo := ""
   LOCAL c, i
   LOCAL nLen := Len( cTexto )
   LOCAL lEmAspas := .F.

   hb_default( @cDelim, "," )
   lAbertas := .F.

   FOR i := 1 TO nLen
      c := SubStr( cTexto, i, 1 )

      IF lEmAspas

         IF c == '"'
            /* Duas aspas seguidas sao UMA aspa no valor. E o unico caso que o
               DELIM do Harbour e o hb_ATokens erram. */
            IF i < nLen .AND. SubStr( cTexto, i + 1, 1 ) == '"'
               cCampo += '"'
               i++
            ELSE
               lEmAspas := .F.
            ENDIF
         ELSE
            /* Dentro de aspas, CR e LF sao conteudo -- e a celula multilinha
               depende exatamente disto. */
            cCampo += c
         ENDIF

      ELSE

         DO CASE
         CASE c == '"'
            lEmAspas := .T.

         CASE c == cDelim
            AAdd( aLinha, AllTrim( cCampo ) )
            cCampo := ""

         CASE c == Chr( 13 )
            /* CR ignorado FORA de aspas: quem fecha o registro e o LF. Dentro
               de aspas ele foi preservado, no ramo de cima. */

         CASE c == Chr( 10 )
            AAdd( aLinha, AllTrim( cCampo ) )
            cCampo := ""
            AAdd( aLinhas, aLinha )
            aLinha := {}

         OTHERWISE
            cCampo += c
         ENDCASE

      ENDIF
   NEXT

   /* Arquivo terminou com aspa aberta: o resto virou um campo so. Quem chama
      precisa saber -- em silencio isto e um arquivo importado errado. */
   lAbertas := lEmAspas

   /* Ultimo registro sem LF no fim. O teste de conteudo evita criar uma linha
      fantasma depois do LF final, que e o caso comum. */
   AAdd( aLinha, AllTrim( cCampo ) )
   IF Len( aLinha ) > 1 .OR. ! Empty( aLinha[ 1 ] )
      AAdd( aLinhas, aLinha )
   ENDIF

   RETURN aLinhas


/*
 * Converte o texto lido para a codepage nativa do DBF.
 *
 * Espelha `DeUtf8Seguro()` da exportacao. "" e UTF8 sao o mesmo caso porque o
 * nosso export grava UTF-8 e e o formato que o resto do mundo manda.
 */
STATIC FUNCTION CsvDeCodepage( cTexto, cCdp )

   SWITCH Upper( hb_defaultValue( cCdp, "" ) )
   CASE "UTF8" ; CASE "" ; RETURN DeUtf8( cTexto )
   CASE "ANSI"           ; RETURN hb_Translate( cTexto, "PTISO", CdpNativa() )
   ENDSWITCH

   RETURN cTexto   /* CP850 ja e a nativa */
