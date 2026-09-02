/*
 * api_struct.prg - criar e alterar a estrutura de um DBF.
 *
 * A VALIDACAO MORA AQUI, E NAO SO NA TELA.
 *
 * O editor de estrutura em app/ui/js/app.js valida enquanto a pessoa digita, e
 * e o que faz a tela ser usavel. Mas a DLL nao pode confiar nisso: o cliente C
 * (tests/) chama direto, o --selftest chama direto, e qualquer um que use a
 * ponte chama direto. Uma DLL que so valida porque a UI validou aceita um campo
 * chamado "1 CAMPO@" vindo de um chamador distraido, e o arquivo nasce
 * invalido.
 *
 * As regras sao as mesmas dos dois lados, portadas de `field_check`
 * (DBUSTRU.PRG:1027) do DBU original. Duplicacao deliberada, e a unica forma de
 * a tela ser boa E a ponte ser segura.
 *
 * A ORDEM: CRIAR ANTES DE MODIFICAR
 *
 * Criar e uma chamada -- dbCreate() -- sem dado para preservar, sem backup, sem
 * exclusivo, sem religar estado: nada pode se perder porque o arquivo ainda nao
 * existe. Modificar tem de converter registro a registro, mapear campo a campo
 * por IDENTIDADE (nunca por posicao, senao reordenar corrompe em silencio),
 * levar o memo junto, invalidar indices, e obedecer R2/R4/R5/R6.
 *
 * Escrever o criar primeiro deixa a validacao pronta para o modificar herdar --
 * e da como fabricar arquivos de teste com estrutura conhecida.
 */

#include "dbstruct.ch"
#include "fileio.ch"


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


/*
 * struct.create {"path":"...","fields":[{name,type,len,dec}],"replace":false}
 *
 * Cria um DBF vazio com a estrutura dada. `replace` autoriza sobrescrever um
 * arquivo existente -- sem ele, existir e recusa, nao pergunta: a DLL nao
 * pergunta nada (ver o cabecalho de api_bulk.prg).
 */
FUNCTION Api_Struct_Create( hP )

   LOCAL cArq   := ParStr( hP, "path" )
   LOCAL lSubst := ParLog( hP, "replace", .F. )
   LOCAL aCampos := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "fields" ) .AND. ;
                         HB_ISARRAY( hP[ "fields" ] ), hP[ "fields" ], NIL )
   LOCAL aEstru, xErro, oErr, cMemo

   IF Empty( AllTrim( cArq ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "destination file is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   IF aCampos == NIL .OR. Len( aCampos ) == 0
      RETURN Err( "ERROR_NO_FIELDS", "at least one field is required", "fields" )
   ENDIF

   cArq := CaminhoOS( cArq )

   /* Sem extensao, .DBF. Um "CLIENTES" digitado a mao nao pode virar um arquivo
      sem extensao que o proprio app depois nao lista. */
   IF Empty( hb_FNameExt( cArq ) )
      cArq += ".DBF"
   ENDIF

   IF ! hb_DirExists( hb_FNameDir( cArq ) )
      RETURN Err( "ERROR_DIR_NOT_FOUND", "destination folder not found", "path", ;
                  { "dir" => hb_FNameDir( cArq ) } )
   ENDIF

   IF hb_FileExists( cArq ) .AND. ! lSubst
      RETURN Err( "ERROR_FILE_EXISTS", "file already exists", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   /*
    * O DESTINO ESTA ABERTO NESTA SESSAO?
    *
    * Sem esta conferencia, o dbCreate falha porque o RDD segura o arquivo, e o
    * unico sinal e um "Create error" cru vindo do Harbour -- que nao diz o que
    * houve nem o que fazer. Medido: substituir um CLIENTES.DBF aberto numa aba
    * devolvia exatamente isso.
    *
    * A recusa e NOSSA e cita a aba, porque a saida e fechar a aba -- e so quem
    * sabe que ela existe pode dizer isso.
    */
   IF ( xErro := DestinoAberto( cArq ) ) != NIL
      RETURN xErro
   ENDIF

   /* A validacao ANTES de tocar no disco: um erro no decimo campo nao pode
      deixar um arquivo pela metade no lugar de um que existia. */
   IF ( xErro := ValidaEstrutura( aCampos, @aEstru ) ) != NIL
      RETURN xErro
   ENDIF

   /*
    * Sobrescrever apaga o memo antigo tambem.
    *
    * dbCreate() cria o .DBT novo quando ha campo memo, mas NAO apaga o antigo
    * quando a estrutura nova nao tem memo nenhum -- e um .DBT orfao faz o
    * proximo arquivo de mesmo nome abrir com campos memo apontando para blocos
    * de outro arquivo. Mesmo cuidado que o export.dbf ja toma.
    */
   IF hb_FileExists( cArq )
      cMemo := hb_FNameExtSet( cArq, ".DBT" )
      IF hb_FileExists( cMemo )
         FErase( cMemo )
      ENDIF
   ENDIF

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbCreate( cArq, aEstru )
   RECOVER USING oErr
      RETURN Err( "ERROR_CREATE_FAILED", "could not create the file", "path", ;
                  { "file"   => hb_FNameNameExt( cArq ), ;
                    "reason" => iif( HB_ISOBJECT( oErr ) .AND. ;
                                     HB_ISSTRING( oErr:description ), ;
                                     oErr:description, "" ) } )
   END SEQUENCE

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_CREATE_FAILED", "file was not created", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "reason" => "" } )
   ENDIF

   RETURN Ok( { "path"   => cArq, ;
                "file"   => hb_FNameNameExt( cArq ), ;
                "fields" => Len( aEstru ), ;
                "bytes"  => Max( 0, hb_FSize( cArq ) ) } )


/*
 * Confere a estrutura e devolve, por referencia, no formato do dbCreate().
 *
 * As regras sao do FORMATO DBF, nao de gosto -- por isso valem literalmente.
 *
 * O campo C aceita ate 1024 bytes, e a largura vai INTEIRA em `len`: quem parte
 * em dois bytes (o truque do Clipper, com o byte de decimais como parte alta) e
 * o proprio Harbour, no dbCreate (dbf1.c:3261). Uma versao anterior deste
 * arquivo pedia a forma ja dividida e contava `256 * dec + len` -- somava duas
 * vezes, e um pedido de `len=44, dec=1` passava como se fosse 300 quando o
 * arquivo saia com 44. Medido: pedir `C 300` devolve `300.0`, 301 bytes por
 * registro.
 *
 * Devolve NIL quando esta tudo certo, ou a recusa com o NOME do campo culpado.
 * "estrutura invalida" sem dizer qual campo obriga a pessoa a conferir os 122 a
 * mao.
 */
STATIC FUNCTION ValidaEstrutura( aCampos, aEstru )

   LOCAL i, j, hC, cNome, cTipo, nLen, nDec, nMax
   LOCAL nBytes := 1                      /* o byte da marca de exclusao */

   aEstru := {}

   FOR i := 1 TO Len( aCampos )

      hC := aCampos[ i ]
      IF ! HB_ISHASH( hC )
         RETURN Err( "ERROR_FIELD_BAD", "field is not an object", "fields", ;
                     { "n" => i } )
      ENDIF

      cNome := Upper( AllTrim( iif( hb_HHasKey( hC, "name" ) .AND. ;
                                    HB_ISSTRING( hC[ "name" ] ), hC[ "name" ], "" ) ) )
      cTipo := Upper( AllTrim( iif( hb_HHasKey( hC, "type" ) .AND. ;
                                    HB_ISSTRING( hC[ "type" ] ), hC[ "type" ], "" ) ) )
      nLen  := iif( hb_HHasKey( hC, "len" ) .AND. HB_ISNUMERIC( hC[ "len" ] ), ;
                    Int( hC[ "len" ] ), 0 )
      nDec  := iif( hb_HHasKey( hC, "dec" ) .AND. HB_ISNUMERIC( hC[ "dec" ] ), ;
                    Int( hC[ "dec" ] ), 0 )

      /* ---- nome ---- */
      IF Empty( cNome )
         RETURN Err( "ERROR_FIELD_NAME_EMPTY", "empty field name", "fields", ;
                     { "n" => i } )
      ENDIF

      IF Len( cNome ) > 10
         RETURN Err( "ERROR_FIELD_NAME_LONG", "field name too long", "fields", ;
                     { "field" => cNome } )
      ENDIF

      IF ! ( SubStr( cNome, 1, 1 ) $ "ABCDEFGHIJKLMNOPQRSTUVWXYZ" )
         RETURN Err( "ERROR_FIELD_NAME_BAD", "must start with a letter", "fields", ;
                     { "field" => cNome } )
      ENDIF

      FOR j := 1 TO Len( cNome )
         IF ! ( SubStr( cNome, j, 1 ) $ "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_" )
            RETURN Err( "ERROR_FIELD_NAME_BAD", "invalid character", "fields", ;
                        { "field" => cNome } )
         ENDIF
      NEXT

      FOR j := 1 TO Len( aEstru )
         IF aEstru[ j ][ DBS_NAME ] == cNome
            RETURN Err( "ERROR_FIELD_NAME_DUP", "duplicated field name", "fields", ;
                        { "field" => cNome } )
         ENDIF
      NEXT

      /* ---- tipo ---- */
      IF ! ( cTipo $ "CNDLM" ) .OR. Len( cTipo ) != 1
         RETURN Err( "ERROR_FIELD_TYPE_BAD", "invalid field type", "fields", ;
                     { "field" => cNome } )
      ENDIF

      /* ---- tamanho ---- */
      DO CASE
      CASE cTipo == "C"
         /*
          * A LARGURA INTEIRA VAI EM `len`. O Harbour faz a divisao sozinho.
          *
          * Eu tinha portado a conta do Clipper -- `256 * dec + len` -- achando
          * que o chamador passava a forma JA DIVIDIDA, com o byte de decimais
          * servindo de parte alta. Errado nos dois sentidos: a conta somava
          * duas vezes, e `len=44, dec=1` passava como se fosse 300 quando o
          * arquivo saia com 44.
          *
          * O `dbCreate` do Harbour recebe a largura cheia e parte ele mesmo
          * (dbf1.c:3261-3262: `bLen = uiLen; bDec = uiLen >> 8`). Medido: pedir
          * `C 300` devolve `300.0` com 301 bytes por registro.
          *
          * `dec` num campo C nao tem significado proprio e e zerado.
          */
         IF nLen <= 0 .OR. nLen > 1024
            RETURN Err( "ERROR_FIELD_LEN_C", "invalid width", "fields", ;
                        { "field" => cNome } )
         ENDIF
         nDec := 0
         nBytes += nLen

      CASE cTipo == "D"
         IF nLen != 8
            RETURN Err( "ERROR_FIELD_LEN_DATE", "date is always 8", "fields", ;
                        { "field" => cNome } )
         ENDIF
         nDec := 0
         nBytes += 8

      CASE cTipo == "L"
         IF nLen != 1
            RETURN Err( "ERROR_FIELD_LEN_LOGIC", "logical is always 1", "fields", ;
                        { "field" => cNome } )
         ENDIF
         nDec := 0
         nBytes += 1

      CASE cTipo == "M"
         IF nLen != 10
            RETURN Err( "ERROR_FIELD_LEN_MEMO", "memo is always 10", "fields", ;
                        { "field" => cNome } )
         ENDIF
         nDec := 0
         nBytes += 10

      OTHERWISE                            /* N */
         IF nLen <= 0 .OR. nLen > 19
            RETURN Err( "ERROR_FIELD_LEN_N", "invalid width", "fields", ;
                        { "field" => cNome } )
         ENDIF
         nMax := iif( nLen < 3, 0, iif( nLen > 17, 15, nLen - 2 ) )
         IF nDec > nMax
            RETURN Err( "ERROR_FIELD_DEC", "too many decimals", "fields", ;
                        { "field" => cNome } )
         ENDIF
         nBytes += nLen
      ENDCASE

      AAdd( aEstru, { cNome, cTipo, nLen, nDec } )
   NEXT

   /*
    * O TETO DO REGISTRO, que a tela nao conferia.
    *
    * O cabecalho do DBF guarda o tamanho do registro em DOIS bytes: 65535 e o
    * limite absoluto do formato. Passar disso produz um arquivo que o proprio
    * Harbour reabre com o tamanho truncado -- e ai cada registro lido sai
    * deslocado, sem erro nenhum. E o tipo de corrupcao que so aparece semanas
    * depois.
    */
   IF nBytes > 65535
      RETURN Err( "ERROR_RECORD_TOO_BIG", "record size over the DBF limit", "fields", ;
                  { "bytes" => nBytes, "max" => 65535 } )
   ENDIF

   RETURN NIL


/*
 * O caminho esta aberto em algum handle desta sessao?
 *
 * Compara caminho completo em maiusculas: no Windows o sistema de arquivos nao
 * distingue caixa, entao "clientes.dbf" e "CLIENTES.DBF" sao o mesmo arquivo e
 * comparar sensivel deixaria passar.
 */
STATIC FUNCTION DestinoAberto( cArq )

   LOCAL cAlvo := Upper( AllTrim( cArq ) )
   LOCAL hInfo

   FOR EACH hInfo IN SessOpenFiles()
      IF Upper( AllTrim( hInfo[ "path" ] ) ) == cAlvo
         RETURN Err( "ERROR_FILE_IS_OPEN", "target is open in a tab", "path", ;
                     { "file"  => hb_FNameNameExt( cArq ), ;
                       "alias" => hInfo[ "alias" ] } )
      ENDIF
   NEXT

   RETURN NIL
