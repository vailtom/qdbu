/*
 * api_struct.prg - criar e alterar a estrutura de um DBF.
 *
 * A VALIDACAO MORA AQUI, E NAO SO NA TELA.
 *
 * O editor de estrutura em app/ui/js/app.js valida enquanto a pessoa digita, e
 * e o que faz a tela ser usavel. Mas a DLL nao pode confiar nisso: o cliente C
 * o cliente C (tests/) chama direto, o --selftest chama direto, e qualquer um que use a
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
#include "dbinfo.ch"
#include "fileio.ch"
#include "directry.ch"


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
   IF ( xErro := SessFileOpenErr( cArq ) ) != NIL
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


/*
 * struct.modify {"h":"h7","fields":[{name,type,len,dec,from}],"backup":true}
 *
 * `from` E O NOME ORIGINAL DO CAMPO -- e o coracao desta funcao.
 *
 * O mapeamento entre a estrutura velha e a nova e por IDENTIDADE, nunca por
 * posicao. Se a pessoa move CLI_NOME do terceiro para o primeiro lugar, mapear
 * por posicao poria o CODIGO dentro do NOME e vice-versa -- em 400 mil
 * registros, sem erro nenhum, e so descoberto quando alguem ler um relatorio.
 * `from` vazio significa CAMPO NOVO: nasce em branco em todos os registros.
 *
 * A SEQUENCIA e a R2 de as regras de integridade, com R4/R5/R6 por cima:
 *
 *   1. valida a estrutura nova       (antes de tocar em disco)
 *   2. fecha a area, toma EXCLUSIVO  (ninguem escreve enquanto convertemos)
 *   3. backup, se pedido             (e se falhar, NAO opera)
 *   4. monta um .tmp com a estrutura nova, ao lado do original
 *   5. copia registro a registro, convertendo, preservando a marca de exclusao
 *   6. confere a contagem
 *   7. troca os nomes                (o original so morre aqui)
 *   8. reabre compartilhado e religa
 *
 * O ORIGINAL SO E TOCADO NO PASSO 7. Ate la, qualquer falha -- disco cheio,
 * conversao impossivel, cancelamento -- deixa o arquivo exatamente como estava
 * e o pior caso e "nao fiz nada".
 */
FUNCTION Api_Struct_Modify( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL lBackup := ParLog( hP, "backup", .T. )
   LOCAL aCampos := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "fields" ) .AND. ;
                         HB_ISARRAY( hP[ "fields" ] ), hP[ "fields" ], NIL )
   LOCAL xErro, hInfo, hEstado, aEstru, aDe
   LOCAL cArq, cAlias, cTmp, cBackup, cSelo, cExtMemo
   LOCAL nWa, nAntes, nDepois, nFalhas := 0
   LOCAL aIndices, lModoOrig, aFalhas := {}

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF aCampos == NIL .OR. Len( aCampos ) == 0
      RETURN Err( "ERROR_NO_FIELDS", "at least one field is required", "fields" )
   ENDIF

   /* Valida ANTES de fechar nada: um erro no decimo campo nao pode deixar a
      area fechada e o usuario sem o arquivo. */
   IF ( xErro := ValidaEstrutura( aCampos, @aEstru ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo    := SessHandle( cH )
   /*
    * O MODO ORIGINAL E COPIADO PARA UM LOCAL, e isto nao e preciosismo.
    *
    * `hInfo` e uma REFERENCIA VIVA para o hash da sessao, e o
    * `SessReattach( cH, nWa, .T. )` la embaixo grava `.T.` em
    * `hInfo[ "exclusive" ]` -- e o registro de que a area esta exclusiva
    * AGORA. A partir dali, todo `hInfo[ "exclusive" ]` devolve `.T.`, e a
    * reabertura no fim devolveria o arquivo EXCLUSIVO mesmo para quem o tinha
    * aberto compartilhado. O sintoma e mudo: a operacao termina bem, e o
    * arquivo fica travado para todo mundo ate a aba ser fechada.
    */
   lModoOrig := hInfo[ "exclusive" ]
   cArq     := hInfo[ "path" ]
   cAlias   := hInfo[ "alias" ]
   nAntes   := LastRec()
   cExtMemo := dbInfo( DBI_MEMOEXT )
   hEstado  := EstadoAntes( cH )

   /*
    * A lista de indices e fotografada AGORA, porque depois da operacao ela
    * estara vazia de proposito -- ver `lSemIndices` em Religar(). O nome de
    * cada um viaja para a tela: dizer "os indices cairam" sem dizer QUAIS
    * obriga a pessoa a caÃ§ar na pasta o que precisa reconstruir.
    */
   aIndices := {}
   AEval( hInfo[ "indexes" ], {| c | AAdd( aIndices, hb_FNameNameExt( c ) ) } )

   cSelo   := CarimboAgora()
   cBackup := NomeDoBackup( cArq, cSelo )

   /* O temporario mora AO LADO do original: a troca de nomes no fim tem de ser
      uma renomeacao no mesmo volume, e nao uma copia que pode falhar na hora
      errada.
      
      O QUE MUDA E O NOME DE BASE, NAO A EXTENSAO. Um "tipos.tm$" parece
      inofensivo e nao e: o Harbour deriva o nome do memo da BASE, entao o .DBT
      do temporario nasceria chamado "tipos.dbt" -- exatamente o memo do
      original, que esta aberto. O dbCreate morre com "Create error" e a
      mensagem nao diz nada sobre memo. Com base propria, o par temporario e
      inteiramente separado. */
   cTmp := AoLado( cArq, "$tmp" )
   Descarta( cTmp )
   Descarta( hb_FNameExtSet( cTmp, cExtMemo ) )

   dbCloseArea()

   nWa := AbreNaArea( cArq, cAlias, .T. )      /* EXCLUSIVO */
   IF nWa == 0
      RETURN ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, ;
                          Err( "ERROR_CANNOT_LOCK_EXCLUSIVE", "another program is using it", ;
                               "h", { "file" => hb_FNameNameExt( cArq ) } ), .T. )
   ENDIF

   SessReattach( cH, nWa, .T. )

   /* R4: backup antes. Se ele falhar, a operacao NAO acontece. */
   IF lBackup
      QDbu_JobBegin( JobMsg( "UI_JOB_BACKUP", hb_FNameNameExt( cBackup ) ), LastRec() )
      xErro := CopiaPorRegistro( cBackup, {| n, t | HB_SYMBOL_UNUSED( t ), QDbu_Progress( n ) } )
      QDbu_JobEnd()
      IF xErro != NIL
         ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL, .T. )
         RETURN xErro
      ENDIF
   ENDIF

   /* A lista `from` na ordem da estrutura nova. */
   aDe := {}
   AEval( aCampos, {| h | AAdd( aDe, ;
      iif( HB_ISHASH( h ) .AND. hb_HHasKey( h, "from" ) .AND. HB_ISSTRING( h[ "from" ] ), ;
           Upper( AllTrim( h[ "from" ] ) ), "" ) ) } )

   xErro := TransformaPara( cTmp, aEstru, aDe, @nFalhas )

   IF xErro != NIL
      Descarta( cTmp )
      Descarta( hb_FNameExtSet( cTmp, cExtMemo ) )
      ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL, .T. )
      RETURN xErro
   ENDIF

   /* Fecha a origem antes de trocar os nomes: renomear exige o arquivo livre. */
   dbCloseArea()

   IF ( xErro := TrocaNomes( cArq, cTmp, cBackup, cExtMemo, lBackup ) ) != NIL
      Descarta( cTmp )
      Descarta( hb_FNameExtSet( cTmp, cExtMemo ) )
      ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL, .T. )
      RETURN xErro
   ENDIF

   /* Os indices nao voltaram; o registro da sessao tem de dizer o mesmo, senao
      a tela mostra uma lista de indices abertos que nao existe mais. */
   hInfo[ "indexes" ] := {}

   /* Ver a nota no `Api_Bulk_Run`: o que o religar nao repos viaja com o
      sucesso, senao a tela fica descrevendo um filtro que ja nao esta ligado. */
   xErro := ReabreArea( cH, cArq, cAlias, lModoOrig, hEstado, NIL, .T., @aFalhas )
   IF xErro != NIL
      RETURN xErro
   ENDIF

   nDepois := LastRec()

   RETURN Ok( { "file"       => hb_FNameNameExt( cArq ), ;
                "rebindErrors" => aFalhas, ;
                "backup"     => iif( lBackup, hb_FNameNameExt( cBackup ), "" ), ;
                "before"     => nAntes, ;
                "after"      => nDepois, ;
                "fields"     => Len( aEstru ), ;
                "indexes"    => aIndices, ;
                "conversions" => nFalhas } )


/*
 * Copia a origem para o `.tmp` com a estrutura nova, campo a campo.
 *
 * A ORIGEM E A AREA SELECIONADA. Quem chama ja a deixou aberta em exclusivo, e
 * por isso ninguem escreve enquanto isto roda -- o retrato e consistente por
 * construcao.
 *
 * `aDe` traz, para cada campo NOVO, o nome do campo de ORIGEM. Vazio significa
 * campo novo: fica em branco. E o mapeamento por identidade que faz reordenar
 * ser seguro.
 *
 * CONVERSAO QUE FALHA NAO ABORTA. Um valor que nao converte -- "ABC" indo para
 * um campo numerico -- vira o vazio do tipo destino e ENTRA NA CONTA. Abortar
 * no registro 300 mil por causa de um texto sujo obrigaria a pessoa a limpar o
 * arquivo antes de poder mudar a estrutura, e ela nao tem como limpar sem mudar
 * a estrutura. A conta e devolvida para a tela dizer quantos.
 */
STATIC FUNCTION TransformaPara( cTmp, aEstru, aDe, nFalhas )

   LOCAL nOrigem := Select()
   LOCAL nDestino, oErr, i, nPos, cAliasTmp
   LOCAL nTentativa := 0
   LOCAL aValores, aPos := {}
   LOCAL nTotal := LastRec(), nFeitos := 0
   LOCAL lDelAntes := Set( _SET_DELETED )
   LOCAL nOrdAntes := IndexOrd()
   LOCAL cFiltro := dbFilter()
   LOCAL xErro := NIL

   nFalhas := 0

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbCreate( cTmp, aEstru )
   RECOVER USING oErr
      RETURN Err( "ERROR_CREATE_FAILED", "could not create the temporary file", "path", ;
                  { "file"   => hb_FNameNameExt( cTmp ), ;
                    "reason" => ErroTexto( oErr ) } )
   END SEQUENCE

   /*
    * ALIAS EXPLICITO, e nao o derivado do nome do arquivo.
    *
    * O temporario se chama "TIPOS$tmp.DBF", e o `$` nao e caractere valido de
    * alias -- deixar o Harbour derivar o alias do nome falha na abertura, com
    * um erro que fala de arquivo e nao de alias. O sufixo numerico existe pelo
    * caso remoto de alguem ter um DBF chamado TMPESTRU aberto.
    */
   cAliasTmp := "TMPESTRU"
   DO WHILE Select( cAliasTmp ) != 0
      cAliasTmp := "TMPESTRU" + hb_ntos( ++nTentativa )
   ENDDO

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T., , cTmp, cAliasTmp, .F., .F. )
   RECOVER USING oErr
      /* `reason` estava "" POR ESCRITO: o campo existia para o motivo e ia
         vazio, entao a tela dizia que nao abriu sem dizer por que. */
      RETURN Err( "ERROR_CREATE_FAILED", "temporary file could not be opened", "path", ;
                  { "file" => hb_FNameNameExt( cTmp ), ;
                    "reason" => ErroTexto( oErr ) } )
   END SEQUENCE

   nDestino := Select()
   dbSelectArea( nOrigem )

   /* A POSICAO DE ORIGEM E RESOLVIDA UMA VEZ, e nao a cada registro: FieldPos()
      em 400 mil registros vezes 122 campos seriam 48 milhoes de buscas por
      nome. Aqui sao 122. */
   FOR i := 1 TO Len( aDe )
      AAdd( aPos, iif( Empty( aDe[ i ] ), 0, FieldPos( aDe[ i ] ) ) )
   NEXT

   /* O recorte e neutralizado: alterar estrutura vale para o ARQUIVO, nao para
      o que esta filtrado na tela. E a ordem fisica preserva os RecNo(). */
   Set( _SET_DELETED, .F. )
   dbClearFilter()
   ordSetFocus( 0 )
   dbGoTop()

   QDbu_JobBegin( JobMsg( "UI_JOB_RESTRUCT", hb_FNameNameExt( cTmp ) ), nTotal )

   DO WHILE ! Eof()

      aValores := {}
      FOR i := 1 TO Len( aEstru )
         nPos := aPos[ i ]
         AAdd( aValores, iif( nPos == 0, NIL, FieldGet( nPos ) ) )
      NEXT

      dbSelectArea( nDestino )
      dbAppend()
      FOR i := 1 TO Len( aEstru )
         IF aValores[ i ] != NIL
            IF ! PoeValor( i, aValores[ i ], aEstru[ i ][ DBS_TYPE ] )
               nFalhas++
            ENDIF
         ENDIF
      NEXT
      dbSelectArea( nOrigem )

      /* A marca de exclusao e DADO: sem ela, mudar estrutura viraria um PACK. */
      IF Deleted()
         dbSelectArea( nDestino )
         dbDelete()
         dbSelectArea( nOrigem )
      ENDIF

      nFeitos++
      IF nFeitos % 500 == 0
         QDbu_Progress( nFeitos )
         IF QDbu_Canceled()
            xErro := Err( "WARN_CANCELED_RESTRUCT", "canceled by user", , ;
                          { "file" => hb_FNameNameExt( cTmp ) } )
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   QDbu_JobEnd()

   dbSelectArea( nDestino )
   dbCloseArea()
   dbSelectArea( nOrigem )

   /* Restaura o ambiente da origem SEMPRE, inclusive na saida por erro. */
   Set( _SET_DELETED, lDelAntes )
   IF nOrdAntes > 0
      ordSetFocus( nOrdAntes )
   ENDIF
   IF ! Empty( cFiltro )
      BEGIN SEQUENCE WITH {| e | Break( e ) }
         dbSetFilter( hb_macroBlock( cFiltro ), cFiltro )
      RECOVER
      END SEQUENCE
   ENDIF

   RETURN xErro


/*
 * Poe o valor no campo `i` do destino, convertendo quando o tipo mudou.
 *
 * Devolve .F. quando o valor NAO coube -- e o chamador conta, sem abortar.
 *
 * As conversoes seguem o que o xBase faz naturalmente, e nada mais: nada de
 * adivinhar formato de data em texto livre, que produziria datas erradas com
 * ar de certas. O que nao converte vira o VAZIO do tipo destino, nunca um valor
 * inventado.
 */
STATIC FUNCTION PoeValor( i, xValor, cTipoDestino )

   LOCAL cOrigem := ValType( xValor )
   LOCAL xNovo, lOk := .T.

   /*
    * MEMO E TEXTO. `ValType()` de um campo memo devolve "M", nao "C" -- e um
    * DO CASE que so pergunta por "C" manda todo memo para o OTHERWISE, que
    * grava vazio. O sintoma e cruel: a estrutura sai perfeita, o .DBT continua
    * la, e o conteudo de todos os memos sumiu em silencio. Normalizar aqui
    * resolve as quatro direcoes de uma vez.
    */
   IF cOrigem == "M"
      cOrigem := "C"
   ENDIF

   DO CASE
   CASE cTipoDestino == "C" .OR. cTipoDestino == "M"
      DO CASE
      CASE cOrigem == "C" ; xNovo := xValor
      CASE cOrigem == "N" ; xNovo := AllTrim( Str( xValor ) )
      /* DToS, e nao DToC: "07/03/09" depende do SET DATE corrente e perde o
         seculo -- 1909 e 2009 viram a mesma string. AAAAMMDD e a forma
         canonica do xBase, e faz o caminho de volta (C -> D) devolver a MESMA
         data, porque a conversao inversa aqui embaixo prefere SToD. */
      CASE cOrigem == "D" ; xNovo := iif( Empty( xValor ), "", DToS( xValor ) )
      CASE cOrigem == "L" ; xNovo := iif( xValor, "T", "F" )
      OTHERWISE           ; xNovo := "" ; lOk := .F.
      ENDCASE

   CASE cTipoDestino == "N"
      DO CASE
      CASE cOrigem == "N" ; xNovo := xValor
      CASE cOrigem == "C"
         xNovo := Val( xValor )
         /* Val() devolve 0 tanto para "0" quanto para "ABC". So e falha quando
            o texto nao era vazio nem um numero de verdade. */
         IF xNovo == 0 .AND. ! Empty( AllTrim( xValor ) ) .AND. ;
            ! ( AllTrim( xValor ) $ "0 0.0 0,0 00" )
            lOk := .F.
         ENDIF
      CASE cOrigem == "L" ; xNovo := iif( xValor, 1, 0 )
      CASE cOrigem == "D" ; xNovo := iif( Empty( xValor ), 0, xValor - SToD( "19000101" ) )
      OTHERWISE           ; xNovo := 0 ; lOk := .F.
      ENDCASE

   CASE cTipoDestino == "D"
      DO CASE
      CASE cOrigem == "D" ; xNovo := xValor
      CASE cOrigem == "C"
         /* SToD para AAAAMMDD, CToD para o formato corrente. Texto que nao for
            nem um nem outro vira data vazia -- e conta como falha. */
         xNovo := iif( Len( AllTrim( xValor ) ) == 8 .AND. IsDigit( AllTrim( xValor ) ), ;
                       SToD( AllTrim( xValor ) ), CToD( AllTrim( xValor ) ) )
         IF Empty( xNovo ) .AND. ! Empty( AllTrim( xValor ) )
            lOk := .F.
         ENDIF
      OTHERWISE           ; xNovo := CToD( "" ) ; lOk := .F.
      ENDCASE

   OTHERWISE                                            /* L */
      DO CASE
      CASE cOrigem == "L" ; xNovo := xValor
      CASE cOrigem == "C" ; xNovo := Upper( Left( AllTrim( xValor ), 1 ) ) $ "TSY1"
      CASE cOrigem == "N" ; xNovo := xValor != 0
      OTHERWISE           ; xNovo := .F. ; lOk := .F.
      ENDCASE
   ENDCASE

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      FieldPut( i, xNovo )
   RECOVER
      lOk := .F.
   END SEQUENCE

   RETURN lOk


/* Todo caractere e digito? */
STATIC FUNCTION IsDigit( c )

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


/*
 * A TROCA DE NOMES -- o unico instante em que o original e tocado.
 *
 * Ordem: primeiro o original sai do lugar, depois o novo entra. Nunca o
 * contrario. Se fosse "apaga o original, renomeia o novo", uma falha entre os
 * dois passos deixaria a pessoa sem arquivo nenhum. Aqui, uma falha no meio
 * deixa o original vivo com outro nome -- recuperavel a mao.
 *
 * `lBackup` decide o destino do original: virar backup carimbado, ou morrer.
 * Quando a pessoa dispensou o backup, ele ainda assim vai para um `.old`
 * temporario ate o novo estar no lugar, e so entao e apagado.
 *
 * O MEMO ACOMPANHA SEMPRE. Um DBF com campo memo cujo .DBT ficou para tras nao
 * abre -- e "nao abre" depois de alterar estrutura parece perda total.
 */
STATIC FUNCTION TrocaNomes( cArq, cTmp, cBackup, cExtMemo, lBackup )

   /* Sem backup pedido, o original ainda passa por um nome temporario -- e ele
      tambem precisa de BASE propria, pela mesma razao do `$tmp`: um
      "tipos.ol$" arrastaria o memo "tipos.dbt" para cima do memo novo. */
   LOCAL cGuarda := iif( lBackup, cBackup, AoLado( cArq, "$old" ) )
   LOCAL cMemoArq := hb_FNameExtSet( cArq, cExtMemo )
   LOCAL cMemoTmp := hb_FNameExtSet( cTmp, cExtMemo )
   LOCAL cMemoGua := hb_FNameExtSet( cGuarda, cExtMemo )
   LOCAL lTinhaMemo := hb_FileExists( cMemoArq )

   Descarta( cGuarda )
   Descarta( cMemoGua )

   /*
    * 1. o original sai do lugar
    *
    * CODIGO PROPRIO, e nao ERROR_CANNOT_LOCK_EXCLUSIVE. A causa costuma ser a
    * mesma -- outro processo pegou o arquivo --, mas a POSICAO e outra: aqui
    * ja se gastou o backup inteiro e a conversao inteira. Se a UI tratasse
    * isto como "em uso" ela repetiria a operacao do zero, e o `Descarta` no
    * topo desta funcao apagaria a copia que a tentativa anterior fez. Repetir
    * so e barato antes de escrever.
    */
   IF FRename( cArq, cGuarda ) != 0
      RETURN Err( "ERROR_RENAME_FAILED", "could not put the new file in place", "h", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF
   IF lTinhaMemo
      FRename( cMemoArq, cMemoGua )
   ENDIF

   /* 2. o novo entra */
   IF FRename( cTmp, cArq ) != 0
      /* DESFAZ: por o original de volta e melhor que deixar os dois de fora. */
      FRename( cGuarda, cArq )
      IF lTinhaMemo
         FRename( cMemoGua, cMemoArq )
      ENDIF
      RETURN Err( "ERROR_RENAME_FAILED", "could not put the new file in place", "h", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   IF hb_FileExists( cMemoTmp )
      FRename( cMemoTmp, cMemoArq )
   ENDIF

   /* 3. sem backup pedido, o original so morre AGORA -- com o novo ja no lugar */
   IF ! lBackup
      Descarta( cGuarda )
      Descarta( cMemoGua )
   ENDIF

   RETURN NIL


/* Um irmao do arquivo, na mesma pasta, com sufixo no NOME e a mesma extensao.
   `J:\d\TIPOS.DBF` + "$tmp" -> `J:\d\TIPOS$tmp.DBF`. O par DBF/memo do
   resultado nao encosta no par do original. */
STATIC FUNCTION AoLado( cArq, cSufixo )
   RETURN hb_FNameMerge( hb_FNameDir( cArq ), ;
                         hb_FNameName( cArq ) + cSufixo, ;
                         hb_FNameExt( cArq ) )


/* ======================================================================
 * SINCRONIZAR ESTRUTURA -- pasta contra pasta (docs/20).
 *
 * O ERP do autor confronta cada DBF da pasta com um dicionario interno e
 * lista, tabela a tabela, o que esta fora; o Navicat faz o mesmo entre dois
 * bancos. Aqui a referencia e OUTRA PASTA de DBFs (decisao do autor,
 * 09/09/2026): a base de homologacao contra a do cliente.
 *
 * Tres metodos, e NENHUM escreve. `struct.scan` le estruturas, `struct.diff`
 * compara, `struct.compose` monta a estrutura de destino a partir das
 * escolhas da pessoa. Quem escreve continua sendo `struct.modify` (T10) e
 * `struct.create`, um arquivo por vez, cada um com o proprio backup -- e por
 * isso nada novo entra em `MetodosRegistrados()`: o log ganha uma linha por
 * arquivo aplicado, ja com o nome da copia.
 * ====================================================================== */

/*
 * struct.scan {"dir":"..."} ou {"name":"conexao"}
 *   -> { dir, files:[ {name, path, valid, inUse, reason, records,
 *                      fields:[ {n,name,type,len,dec} ... ]} ... ] }
 *
 * LE O CABECALHO, NAO ABRE WORK AREA. Sao 227 arquivos na base mais rica;
 * abrir cada um custaria lock, memo e indice para responder uma pergunta que
 * os 32 bytes por campo ja respondem. Arquivo em uso ou invalido entra na
 * lista com `inUse`/`reason`, como na arvore -- sumir da lista pareceria
 * "esta igual".
 *
 * Os campos saem no MESMO formato do `file.info fields:true`, e ha asercao
 * que compara os dois sobre o mesmo arquivo: e o que garante que ler o
 * cabecalho por conta propria diz o mesmo que o RDD.
 */
FUNCTION Api_Struct_Scan( hP )

   LOCAL cDir := ResolveFolder( hP )
   LOCAL aRet

   IF ! HB_ISSTRING( cDir )
      RETURN cDir            /* ja e uma recusa */
   ENDIF

   /* O MESMO `ScanDir` DO DIFF, e nao uma copia dele. As duas leituras eram
      identicas caractere a caractere, e a assercao do --selftest que compara
      o scan com o `file.info` media so uma das duas -- a outra podia divergir
      calada. Apontado em revisao, 09/09/2026. */
   aRet := ScanDir( cDir )

   ASort( aRet,,, {| x, y | Upper( x[ "name" ] ) < Upper( y[ "name" ] ) } )

   RETURN Ok( { "dir" => cDir, "files" => aRet } )


/*
 * struct.diff {"source":{dir|name}, "target":{dir|name}, "byPosition":false}
 *   -> { source, target, byPosition,
 *        files:[ { name, status, side, records:{source,target},
 *                  source:[campos], target:[campos],
 *                  diagnostics:[ {field, kind, kinds:[...], source:{...}, target:{...}} ] } ] }
 *
 *   status  same | differs | missingInTarget | onlyInTarget | inUse | invalid
 *   side    de qual lado veio o inUse/invalid ("source" | "target")
 *   kind    missing | extra | type | len | dec | position   (o primeiro)
 *   kinds   todas as diferencas daquele campo, na ordem acima
 *
 * CASA CAMPOS POR NOME. O ERP do autor casa por posicao (DIC_StruCompare) e
 * paga por isso: um campo inserido no meio faz TODOS os seguintes parecerem
 * errados, e o dicionario dele carrega campos "INUTIL/DESATIVADO" que nao
 * podem sair so para as posicoes nao andarem. Aqui o nome e a identidade --
 * a mesma regra do `from` do struct.modify (docs/12) --, e a POSICAO vira um
 * diagnostico proprio, ligado por opcao (`byPosition`), porque cada usuario
 * decide se a ordem importa para o sistema dele (decisao do autor,
 * 09/09/2026).
 *
 * "Fora de posicao" e medido pela ORDEM RELATIVA entre os campos comuns, e
 * nao pelo indice absoluto: inserir um campo novo antes dos outros nao pode
 * marcar todos os outros como movidos. Uma troca de dois vizinhos marca os
 * dois -- e honesto, os dois mudaram de lugar.
 *
 * "So no alvo" (onlyInTarget) e um arquivo que existe no cliente e nao na
 * referencia. E INFORMACAO, nunca acao: o Navicat oferece apagar; o QDbu nao
 * apaga arquivo de cliente.
 */
FUNCTION Api_Struct_Diff( hP )

   LOCAL cSrc, cTgt, lPos
   LOCAL hSrc, hTgt, aNomes := {}, cNome, aRet := {}
   LOCAL hA, hB, hArq

   cSrc := ResolveFolder( SubHash( hP, "source" ) )
   IF ! HB_ISSTRING( cSrc )
      RETURN cSrc
   ENDIF
   cTgt := ResolveFolder( SubHash( hP, "target" ) )
   IF ! HB_ISSTRING( cTgt )
      RETURN cTgt
   ENDIF
   lPos := ParLog( hP, "byPosition", .F. )

   /* A mesma pasta dos dois lados compararia um arquivo consigo mesmo e
      responderia "esta tudo igual" -- verdade inutil, e quase sempre um clique
      errado no seletor. */
   IF Upper( hb_DirSepDel( cSrc ) ) == Upper( hb_DirSepDel( cTgt ) )
      RETURN Err( "ERROR_SYNC_SAME_DIR", "source and target are the same folder", "target", ;
                  { "dir" => cTgt } )
   ENDIF

   hSrc := ByName( ScanDir( cSrc ) )
   hTgt := ByName( ScanDir( cTgt ) )

   FOR EACH cNome IN hb_HKeys( hSrc )
      AAdd( aNomes, cNome )
   NEXT
   FOR EACH cNome IN hb_HKeys( hTgt )
      IF ! hb_HHasKey( hSrc, cNome )
         AAdd( aNomes, cNome )
      ENDIF
   NEXT
   ASort( aNomes )

   FOR EACH cNome IN aNomes
      hA := iif( hb_HHasKey( hSrc, cNome ), hSrc[ cNome ], NIL )
      hB := iif( hb_HHasKey( hTgt, cNome ), hTgt[ cNome ], NIL )
      hArq := { "name"        => iif( hB != NIL, hB[ "name" ], hA[ "name" ] ), ;
                "status"      => "", ;
                "side"        => "", ;
                "reason"      => "", ;
                "records"     => { "source" => iif( hA == NIL, 0, hA[ "records" ] ), ;
                                   "target" => iif( hB == NIL, 0, hB[ "records" ] ) }, ;
                "source"      => iif( hA == NIL, {}, hA[ "fields" ] ), ;
                "target"      => iif( hB == NIL, {}, hB[ "fields" ] ), ;
                "diagnostics" => {} }

      DO CASE
      CASE hA == NIL
         hArq[ "status" ] := "onlyInTarget"
      CASE hB == NIL
         /* A referencia invalida ou em uso nao pode servir de molde: nem
            criar o arquivo que falta a partir dela. */
         IF ! hA[ "valid" ]
            hArq[ "status" ] := iif( hA[ "inUse" ], "inUse", "invalid" )
            hArq[ "side" ]   := "source"
            hArq[ "reason" ] := hA[ "reason" ]
         ELSE
            hArq[ "status" ] := "missingInTarget"
         ENDIF
      CASE ! hB[ "valid" ]
         hArq[ "status" ] := iif( hB[ "inUse" ], "inUse", "invalid" )
         hArq[ "side" ]   := "target"
         hArq[ "reason" ] := hB[ "reason" ]
      CASE ! hA[ "valid" ]
         hArq[ "status" ] := iif( hA[ "inUse" ], "inUse", "invalid" )
         hArq[ "side" ]   := "source"
         hArq[ "reason" ] := hA[ "reason" ]
      OTHERWISE
         hArq[ "diagnostics" ] := CompareFields( hA[ "fields" ], hB[ "fields" ], lPos )
         hArq[ "status" ] := iif( Empty( hArq[ "diagnostics" ] ), "same", "differs" )
      ENDCASE

      AAdd( aRet, hArq )
   NEXT

   RETURN Ok( { "source" => cSrc, "target" => cTgt, "byPosition" => lPos, "files" => aRet } )


/*
 * struct.compose {"source":[campos], "target":[campos],
 *                 "choices":{"CAMPO":"keep"|"adopt"|"drop"}, "byPosition":false}
 *   -> { fields:[ {name,type,len,dec,from} ], losses:[ {field, kind} ], changed }
 *
 * PURA: nao le disco, nao abre area. E o que a torna barata no trilho C e no
 * --selftest, e o que permite a UI montar a estrutura de destino sem ter de
 * saber as regras -- elas moram aqui, num lugar so, e sao afirmadas.
 *
 * A DLL NAO ESCOLHE POR NINGUEM. Quando o cliente tem o campo maior, ou tem
 * um campo que a referencia nao tem, nao existe padrao certo: o ERP do autor
 * mantem (nunca encolhe, preserva o NP_SYNC), o Navicat iguala. Decisao do
 * autor (09/09/2026): quem opera e DBA e decide caso a caso. Campo divergente
 * sem escolha e recusa com o nome dele -- nao um chute silencioso.
 *
 * O que NAO pergunta: campo que so existe na referencia (`missing`) sempre
 * nasce, em branco; campo fora de posicao so muda de lugar. Nenhum dos dois
 * perde dado.
 *
 * `from` E SEMPRE O NOME NO ALVO -- e o `struct.modify` copia por ele, nunca
 * por posicao. Reordenar aqui e seguro por causa disso.
 *
 * ORDEM: com `byPosition` a da referencia (e o que um ERP que le por posicao
 * precisa); sem, a do alvo. Nos dois casos o que so existe de um lado vai
 * para o FIM: o campo novo no fim e como o ERP do autor faz, e o extra
 * mantido no fim e onde o NP_SYNC dele fica.
 *
 * `losses` marca o que a escolha custa: encolher, mudar tipo, cortar decimal
 * e remover. A UI mostra com a mesma frase do T10 (UI_MODIFY_LOST).
 */
FUNCTION Api_Struct_Compose( hP )

   LOCAL aSrc := ListOf( hP, "source" )
   LOCAL aTgt := ListOf( hP, "target" )
   LOCAL hEsc := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "choices" ) .AND. HB_ISHASH( hP[ "choices" ] ), ;
                      hP[ "choices" ], { => } )
   LOCAL lPos := ParLog( hP, "byPosition", .F. )
   LOCAL hS := { => }, hT := { => }, hE := { => }
   LOCAL aOrdem := {}, aFim := {}, aFields := {}, aLosses := {}
   LOCAL h, cNome, cEsc, hA, hB, hDef, xErro, lMudou := .F.

   IF Empty( aSrc ) .AND. Empty( aTgt )
      RETURN Err( "ERROR_NO_FIELDS", "source and target are both empty", "source" )
   ENDIF

   /*
    * A FORMA DAS DUAS LISTAS E CONFERIDA ANTES DE QUALQUER LEITURA.
    *
    * Sem isto, `{"source":[1,2]}` chegava em `h[ "name" ]` sobre um numero: o
    * erro de runtime subia pelo RECOVER do dispatcher e virava `"ERR:"` -- que
    * neste projeto significa BUG A CORRIGIR. Parametro malformado e recusa de
    * negocio, e a fronteira entre as duas coisas so continua valendo se toda
    * porta de entrada a defender. `Api_Struct_Create` e `Api_Struct_Modify` ja
    * o faziam com `ValidaEstrutura`; esta nao. Apontado em revisao, 09/09/2026.
    *
    * A conferencia aqui e de FORMA, e nao das regras do DBF: as duas listas
    * vem de `struct.scan`, que le cabecalhos de verdade, e um tipo exotico de
    * um arquivo antigo tem de conseguir ser COMPARADO. Quem cobra as regras e
    * o `struct.modify`, na hora de escrever.
    */
   IF ( xErro := CheckFieldShape( aSrc, "source" ) ) != NIL
      RETURN xErro
   ENDIF
   IF ( xErro := CheckFieldShape( aTgt, "target" ) ) != NIL
      RETURN xErro
   ENDIF

   FOR EACH h IN aSrc
      hS[ Upper( AllTrim( h[ "name" ] ) ) ] := h
   NEXT
   FOR EACH h IN aTgt
      hT[ Upper( AllTrim( h[ "name" ] ) ) ] := h
   NEXT
   /*
    * A ESCOLHA E CONFERIDA CONTRA UMA LISTA, e nao com `$` numa string.
    *
    * `cEsc $ "keep,adopt,drop"` e SUBSTRING: `""`, `"ee"`, `"p,a"` e `","`
    * passavam por escolha valida, e la adiante nenhum `== "keep"` casava --
    * entao o campo era recusado como ERROR_SYNC_CHOICE_MISSING, dizendo
    * "decida" a quem tinha decidido. Recusa que aponta o lugar errado custa
    * mais que recusa nenhuma. Apontado em revisao, 09/09/2026.
    */
   FOR EACH cNome IN hb_HKeys( hEsc )
      cEsc := Lower( AllTrim( hb_CStr( hEsc[ cNome ] ) ) )
      IF AScan( { "keep", "adopt", "drop" }, {| c | c == cEsc } ) == 0
         RETURN Err( "ERROR_SYNC_CHOICE_INVALID", "unknown choice", "choices", ;
                     { "field" => Upper( cNome ), "choice" => cEsc } )
      ENDIF
      hE[ Upper( AllTrim( cNome ) ) ] := cEsc
   NEXT

   /* A ordem base e de um lado; o que so existe no outro vai para o fim. */
   IF lPos
      FOR EACH h IN aSrc ; AAdd( aOrdem, Upper( AllTrim( h[ "name" ] ) ) ) ; NEXT
      FOR EACH h IN aTgt
         IF ! hb_HHasKey( hS, Upper( AllTrim( h[ "name" ] ) ) )
            AAdd( aFim, Upper( AllTrim( h[ "name" ] ) ) )
         ENDIF
      NEXT
   ELSE
      FOR EACH h IN aTgt ; AAdd( aOrdem, Upper( AllTrim( h[ "name" ] ) ) ) ; NEXT
      FOR EACH h IN aSrc
         IF ! hb_HHasKey( hT, Upper( AllTrim( h[ "name" ] ) ) )
            AAdd( aFim, Upper( AllTrim( h[ "name" ] ) ) )
         ENDIF
      NEXT
   ENDIF
   AEval( aFim, {| c | AAdd( aOrdem, c ) } )

   FOR EACH cNome IN aOrdem
      hA := iif( hb_HHasKey( hS, cNome ), hS[ cNome ], NIL )
      hB := iif( hb_HHasKey( hT, cNome ), hT[ cNome ], NIL )
      cEsc := iif( hb_HHasKey( hE, cNome ), hE[ cNome ], "" )

      DO CASE
      CASE hB == NIL                       /* so na referencia: nasce em branco */
         hDef := hA
         AAdd( aFields, NewField( hDef, "" ) )
         lMudou := .T.

      CASE hA == NIL                       /* so no alvo: manter ou remover */
         /* "ADOTAR A REFERENCIA" NUM CAMPO QUE A REFERENCIA NAO TEM E REMOVER.
            E o que a palavra quer dizer, e e o que o botao "adotar em tudo" da
            tela ja traduz para `drop` -- mas um pedido montado a mao, ou uma
            tela futura que mande `adopt` direto, caia em CHOICE_MISSING e
            mandava decidir de novo o que ja tinha sido decidido. */
         IF cEsc == "keep"
            AAdd( aFields, NewField( hB, cNome ) )
         ELSEIF cEsc == "drop" .OR. cEsc == "adopt"
            AAdd( aLosses, { "field" => cNome, "kind" => "drop" } )
            lMudou := .T.
         ELSE
            RETURN Err( "ERROR_SYNC_CHOICE_MISSING", "field needs a decision", "choices", ;
                        { "field" => cNome } )
         ENDIF

      CASE SameDef( hA, hB )              /* igual: nada a decidir */
         AAdd( aFields, NewField( hB, cNome ) )

      OTHERWISE                            /* divergente: manter ou adotar */
         IF cEsc == "keep"
            AAdd( aFields, NewField( hB, cNome ) )
         ELSEIF cEsc == "adopt"
            AAdd( aFields, NewField( hA, cNome ) )
            lMudou := .T.
            IF hA[ "type" ] != hB[ "type" ]
               AAdd( aLosses, { "field" => cNome, "kind" => "type" } )
            ELSE
               IF hA[ "len" ] < hB[ "len" ]
                  AAdd( aLosses, { "field" => cNome, "kind" => "shrink" } )
               ENDIF
               IF hA[ "dec" ] < hB[ "dec" ]
                  AAdd( aLosses, { "field" => cNome, "kind" => "dec" } )
               ENDIF
            ENDIF
         ELSEIF cEsc == "drop"
            RETURN Err( "ERROR_SYNC_CHOICE_INVALID", "cannot drop a field the reference has", "choices", ;
                        { "field" => cNome, "choice" => cEsc } )
         ELSE
            RETURN Err( "ERROR_SYNC_CHOICE_MISSING", "field needs a decision", "choices", ;
                        { "field" => cNome } )
         ENDIF
      ENDCASE
   NEXT

   /*
    * Reordenar tambem e mudanca -- e a unica que o laco acima nao ve.
    *
    * A comparacao e `==`, EXATA. Com `!=` (que obedece ao SET EXACT, nunca
    * ligado aqui) a troca de `CLI_NOME` com `CLI_NOME2` nao era vista: um dos
    * nomes e prefixo do outro, `!=` respondia .F., e o laco concluia que nada
    * tinha se movido. `changed` voltava .F., a UI pulava o arquivo, e o que
    * ficava de fora era justamente a reordenacao que a pessoa ligou o
    * `byPosition` para corrigir. Apontado em revisao, 09/09/2026.
    */
   IF ! lMudou
      lMudou := Len( aFields ) != Len( aTgt )
      IF ! lMudou
         FOR EACH h IN aFields
            IF ! ( Upper( AllTrim( aTgt[ h:__enumIndex() ][ "name" ] ) ) == h[ "name" ] )
               lMudou := .T.
               EXIT
            ENDIF
         NEXT
      ENDIF
   ENDIF

   RETURN Ok( { "fields" => aFields, "losses" => aLosses, "changed" => lMudou } )


/* ------------------------------------------------------ auxiliares do sync */

/* Um sub-hash do pedido, ou o proprio pedido quando a chave nao veio -- para
   `struct.diff` aceitar {"source":{"dir":...}} e o ResolveFolder ler dali. */
STATIC FUNCTION SubHash( hP, cChave )

   IF HB_ISHASH( hP ) .AND. hb_HHasKey( hP, cChave ) .AND. HB_ISHASH( hP[ cChave ] )
      RETURN hP[ cChave ]
   ENDIF

   RETURN { => }

STATIC FUNCTION ListOf( hP, cChave )

   IF HB_ISHASH( hP ) .AND. hb_HHasKey( hP, cChave ) .AND. HB_ISARRAY( hP[ cChave ] )
      RETURN hP[ cChave ]
   ENDIF

   RETURN {}

/* Os arquivos de uma pasta com a estrutura de cada um -- o miolo do
   struct.scan, reusado pelo diff nos dois lados. */
STATIC FUNCTION ScanDir( cDir )

   LOCAL aItem, aRet := {}, hHdr, cPath

   FOR EACH aItem IN Directory( hb_DirSepAdd( cDir ) + "*.dbf" )
      cPath := hb_DirSepAdd( cDir ) + aItem[ F_NAME ]
      hHdr  := ReadDbfHeader( cPath, .T. )
      AAdd( aRet, { ;
         "name"    => aItem[ F_NAME ], ;
         "path"    => cPath, ;
         "valid"   => hHdr[ "valid" ], ;
         "inUse"   => hHdr[ "inUse" ], ;
         "reason"  => hHdr[ "reason" ], ;
         "records" => hHdr[ "records" ], ;
         "fields"  => hHdr[ "fieldList" ] } )
   NEXT

   RETURN aRet

STATIC FUNCTION ByName( aArqs )

   LOCAL hRet := { => }, h

   FOR EACH h IN aArqs
      hRet[ Upper( h[ "name" ] ) ] := h
   NEXT

   RETURN hRet

STATIC FUNCTION SameDef( hA, hB )
   RETURN hA[ "type" ] == hB[ "type" ] .AND. hA[ "len" ] == hB[ "len" ] .AND. hA[ "dec" ] == hB[ "dec" ]

/*
 * A posicao de um NOME numa lista de nomes -- comparando EXATO.
 *
 * `AScan( a, cNome )` compara com `=`, e `=` obedece ao SET EXACT, que este
 * projeto nunca liga: `AScan( {"NP_SYNCX","NP_SYNC"}, "NP_SYNC" )` devolve 1,
 * a posicao do OUTRO campo. Com `COD`/`CODIGO`, `CLI_NOME`/`CLI_NOME2` -- que
 * e a cara de um DBF de verdade -- o diagnostico `position` passava a comparar
 * duas posicoes de campos diferentes: campo parado saia como movido e campo
 * movido saia como igual. O bloco de codigo usa `==`, que ignora o SET EXACT.
 * Apontado em revisao, 09/09/2026; e a mesma razao do `hb_AScan(..., .T.)` do
 * dispatch.prg.
 */
STATIC FUNCTION RankOf( aNomes, cNome )
   RETURN AScan( aNomes, {| c | c == cNome } )

STATIC FUNCTION NewField( hDef, cFrom )
   RETURN { "name" => Upper( AllTrim( hDef[ "name" ] ) ), "type" => hDef[ "type" ], ;
            "len" => hDef[ "len" ], "dec" => hDef[ "dec" ], "from" => cFrom }

/*
 * A FORMA de uma lista de campos vinda do pedido: hash com `name` de texto e
 * nao vazio, `type` de texto, `len` e `dec` numericos. Devolve a recusa ou NIL.
 *
 * Nao cobra as regras do DBF -- nome de ate 10, tipo em CNDLM, tamanho que
 * cabe. Quem cobra e o `ValidaEstrutura`, na hora de ESCREVER. Aqui as listas
 * vem de `struct.scan`, que le cabecalhos reais: recusar comparar um arquivo
 * antigo por causa de um tipo que o Harbour nao cria hoje seria esconder da
 * tela justamente o arquivo que precisa ser olhado.
 */
STATIC FUNCTION CheckFieldShape( aLista, cLado )

   LOCAL i, h

   FOR i := 1 TO Len( aLista )
      h := aLista[ i ]
      IF ! HB_ISHASH( h )
         RETURN Err( "ERROR_FIELD_BAD", "field is not an object", cLado, { "n" => i } )
      ENDIF
      IF ! ( hb_HHasKey( h, "name" ) .AND. HB_ISSTRING( h[ "name" ] ) ) .OR. ;
         Empty( AllTrim( h[ "name" ] ) )
         RETURN Err( "ERROR_FIELD_NAME_EMPTY", "field without a name", cLado, { "n" => i } )
      ENDIF
      IF ! ( hb_HHasKey( h, "type" ) .AND. HB_ISSTRING( h[ "type" ] ) ) .OR. ;
         ! ( hb_HHasKey( h, "len" ) .AND. HB_ISNUMERIC( h[ "len" ] ) ) .OR. ;
         ! ( hb_HHasKey( h, "dec" ) .AND. HB_ISNUMERIC( h[ "dec" ] ) )
         RETURN Err( "ERROR_FIELD_BAD", "field needs type, len and dec", cLado, ;
                     { "n" => i, "field" => Upper( AllTrim( h[ "name" ] ) ) } )
      ENDIF
   NEXT

   RETURN NIL

/*
 * As diferencas entre duas estruturas, por nome.
 *
 * Uma entrada por campo, com TODAS as diferencas dele em `kinds` -- a escolha
 * (manter/adotar) e por campo, entao a tela precisa ve-las juntas. `kind` e a
 * primeira, para quem so quer um selo.
 */
STATIC FUNCTION CompareFields( aSrc, aTgt, lPos )

   LOCAL hT := { => }, hS := { => }, h, cNome, hA, hB, aKinds, aRet := {}
   LOCAL aComumS := {}, aComumT := {}, nRankS, nRankT

   FOR EACH h IN aSrc ; hS[ Upper( AllTrim( h[ "name" ] ) ) ] := h ; NEXT
   FOR EACH h IN aTgt ; hT[ Upper( AllTrim( h[ "name" ] ) ) ] := h ; NEXT

   /* A ordem relativa dos campos comuns, de cada lado. */
   FOR EACH h IN aSrc
      cNome := Upper( AllTrim( h[ "name" ] ) )
      IF hb_HHasKey( hT, cNome ) ; AAdd( aComumS, cNome ) ; ENDIF
   NEXT
   FOR EACH h IN aTgt
      cNome := Upper( AllTrim( h[ "name" ] ) )
      IF hb_HHasKey( hS, cNome ) ; AAdd( aComumT, cNome ) ; ENDIF
   NEXT

   FOR EACH h IN aSrc
      cNome := Upper( AllTrim( h[ "name" ] ) )
      hA := h
      IF ! hb_HHasKey( hT, cNome )
         AAdd( aRet, { "field" => cNome, "kind" => "missing", "kinds" => { "missing" }, ;
                       "source" => hA, "target" => NIL } )
         LOOP
      ENDIF
      hB := hT[ cNome ]
      aKinds := {}
      IF ! ( hA[ "type" ] == hB[ "type" ] ) ; AAdd( aKinds, "type" ) ; ENDIF
      IF hA[ "len" ]  != hB[ "len" ]  ; AAdd( aKinds, "len" )  ; ENDIF
      IF hA[ "dec" ]  != hB[ "dec" ]  ; AAdd( aKinds, "dec" )  ; ENDIF
      IF lPos
         nRankS := RankOf( aComumS, cNome )
         nRankT := RankOf( aComumT, cNome )
         IF nRankS != nRankT ; AAdd( aKinds, "position" ) ; ENDIF
      ENDIF
      IF ! Empty( aKinds )
         AAdd( aRet, { "field" => cNome, "kind" => aKinds[ 1 ], "kinds" => aKinds, ;
                       "source" => hA, "target" => hB } )
      ENDIF
   NEXT

   FOR EACH h IN aTgt
      cNome := Upper( AllTrim( h[ "name" ] ) )
      IF ! hb_HHasKey( hS, cNome )
         AAdd( aRet, { "field" => cNome, "kind" => "extra", "kinds" => { "extra" }, ;
                       "source" => NIL, "target" => h } )
      ENDIF
   NEXT

   RETURN aRet
