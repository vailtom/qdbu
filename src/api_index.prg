/*
 * api_index.prg - NTX indexes.
 *
 * NTX ONLY, on purpose: the 234 DBFs of a real client folder come with 395
 * .ntx and not a single .cdx. Supporting CDX would be dead code here.
 *
 * TWO WAYS TO ASK, and they are not the same question:
 *
 *   index.info {"path":...}   reads the file HEADER, without opening anything.
 *                             It is how the UI can offer "this .ntx sorts by
 *                             CLI_NOME" before the user commits to opening it.
 *
 *   index.list {"h":...}      what is OPEN on this handle, from the work area.
 *                             Harbour's truth, not a copy kept aside.
 *
 * NO LIMIT OF 7. The original capped it because seven was what fit on an 80
 * column screen, not because the RDD cared.
 */

#include "dbinfo.ch"
#include "ord.ch"
#include "fileio.ch"
#include "directry.ch"

/* NTX header: the key expression starts at offset 23 (1-based) and ends at the
   first Chr(0). Ported from ntx_key() -- DBUUTIL.PRG:2153. */
#define NTX_POS_CHAVE   23
#define NTX_CABECALHO  512

/* ------------------------------------------------------------------- abrir */

/*
 * index.open {"h":"h7","path":"J:/bases/base01/NETCLI.NTX"}
 *
 * Opening the same index twice is a REFUSAL, not an error -- port of dup_ntx()
 * from the original. Adding the same bag again would give two orders with the
 * same name and make "which one is active" unanswerable.
 */
FUNCTION Api_Index_Open( hP )

   LOCAL cH   := ParStr( hP, "h" )
   LOCAL cArq := ParStr( hP, "path" )
   LOCAL xErro, hInfo, cMotivo, oErr, nAntes

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( cArq )
      RETURN Err( "ERROR_PARAM_REQUIRED", "index path is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   cArq := CaminhoOS( cArq )

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "index file not found", "path", ;
                  { "file" => cArq } )
   ENDIF

   IF ! EhNtxValido( cArq, @cMotivo )
      RETURN Err( "ERROR_NOT_AN_INDEX", "not a valid NTX index", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "reason" => cMotivo } )
   ENDIF

   hInfo := SessHandle( cH )

   IF AScan( hInfo[ "indexes" ], {| c | MesmoArquivo( c, cArq ) } ) > 0
      RETURN Err( "ERROR_INDEX_ALREADY_OPEN", "index already open on this file", ;
                  "path", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   nAntes := ordCount()

   /* Um NTX de outro DBF abre sem reclamar e so erra na primeira navegacao,
      com o registro errado. Erro previsivel e recusa. */
   BEGIN SEQUENCE WITH {| e | Break( e ) }
      ordListAdd( cArq )
   RECOVER USING oErr

      /* DESFAZER E OBRIGATORIO. ordListAdd() registra o bag na work area e SO
         DEPOIS compila a expressao de chave; quando a compilacao falha, o
         indice fica aberto no RDD e ausente da sessao. Foi exatamente o que
         aconteceu com IDACLI.ntx: a work area passou a ter 10 ordens e a sessao
         6, e index.available marcava como "nao aberto" um indice que estava.
         Estado dividido em dois lugares e a origem do proximo bug inexplicavel. */
      Reconstroi( hInfo[ "indexes" ] )

      RETURN FalhaDoIndice( oErr, cArq )
   END SEQUENCE

   IF ordCount() <= nAntes
      Reconstroi( hInfo[ "indexes" ] )
      RETURN Err( "ERROR_INDEX_REJECTED_BY_RDD", "index rejected by the RDD", ;
                  "path", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   AAdd( hInfo[ "indexes" ], cArq )
   SessBump()

   RETURN Ok( EstadoIndices( cH ) )

/*
 * index.close {"h":"h7","path":"...NETCLI.NTX"}  ou  {"h":"h7","all":true}
 *
 * Fechar tudo derruba a ordem ativa junto: sem indice, a travessia volta a ser
 * a fisica, que e o que dbGoTop() passa a significar.
 */
FUNCTION Api_Index_Close( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL cArq  := ParStr( hP, "path" )
   LOCAL lTudo := ParLog( hP, "all", .F. )
   LOCAL xErro, hInfo, nPos, aRestantes, c

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo := SessHandle( cH )

   IF lTudo
      ordListClear()
      hInfo[ "indexes" ] := {}
      SessBump()
      RETURN Ok( EstadoIndices( cH ) )
   ENDIF

   cArq := CaminhoOS( cArq )
   nPos := AScan( hInfo[ "indexes" ], {| c | MesmoArquivo( c, cArq ) } )

   IF nPos == 0
      RETURN Err( "ERROR_INDEX_NOT_OPEN", "index is not open on this file", ;
                  "path", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   /* Nao existe "remover um bag" no RDD: fecha-se tudo e reabre-se o resto.
      Custa uma releitura de header por indice e mantem os que sobraram com a
      mesma expressao -- tentar remexer na lista por dentro sairia mais caro em
      manutencao do que essa releitura custa em tempo. */
   aRestantes := {}
   FOR EACH c IN hInfo[ "indexes" ]
      IF ! MesmoArquivo( c, cArq )
         AAdd( aRestantes, c )
      ENDIF
   NEXT

   ordListClear()
   FOR EACH c IN aRestantes
      ordListAdd( c )
   NEXT

   hInfo[ "indexes" ] := aRestantes
   SessBump()

   RETURN Ok( EstadoIndices( cH ) )

/* ----------------------------------------------------------------- listar */

/* index.list {"h":"h7"} -> os indices abertos e qual comanda. */
FUNCTION Api_Index_List( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( EstadoIndices( cH ) )

/*
 * index.info {"path":"...NETCLI.NTX"} -> a chave, SEM abrir nada.
 *
 * Le so o cabecalho. Serve para a UI dizer "este indice ordena por CLI_NOME"
 * antes de o usuario decidir abrir -- e para explicar por que um .ntx foi
 * recusado, em vez de um "nao deu" sem motivo.
 */
FUNCTION Api_Index_Info( hP )

   LOCAL cArq := ParStr( hP, "path" )
   LOCAL cMotivo := ""

   IF Empty( cArq )
      RETURN Err( "ERROR_PARAM_REQUIRED", "index path is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   cArq := CaminhoOS( cArq )

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "index file not found", "path", ;
                  { "file" => cArq } )
   ENDIF

   IF ! EhNtxValido( cArq, @cMotivo )
      RETURN Ok( { "path" => cArq, "file" => hb_FNameNameExt( cArq ), ;
                   "valid" => .F., "reason" => cMotivo, "key" => "" } )
   ENDIF

   RETURN Ok( { "path" => cArq, "file" => hb_FNameNameExt( cArq ), ;
                "valid" => .T., "reason" => "", "key" => ChaveDoNtx( cArq ) } )

/*
 * index.available {"h":"h7"} -> os .ntx da pasta que servem para ESTE arquivo.
 *
 * NAO da para achar indice por nome. Nas bases reais o .ntx de NETCLI.DBF se
 * chama ID1CLI.ntx, ID2CLI.ntx ... IDSCLI.ntx -- procurar "NETCLI.ntx" acha
 * zero, e a arvore diria "sem indices" para um arquivo que tem onze. A
 * convencao de nomes e de quem escreveu o sistema, e nao existe uma so.
 *
 * Entao casa-se pelo CONTEUDO: le-se a expressao de chave do cabecalho e
 * verifica-se se todo campo citado existe neste DBF. Custa 512 bytes por .ntx,
 * uma vez, e funciona com qualquer convencao de nome.
 *
 * `match` diz o quanto se confia: "sure" quando a expressao cita campo com
 * nome que so existe aqui, "maybe" quando os campos existem mas poderiam ser de
 * outro arquivo parecido. Nada e escondido -- a lista traz todos, e o usuario
 * abre o que quiser.
 */
FUNCTION Api_Index_Available( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xErro, hInfo, cDir, aRet, aItem, cArq, cChave, aCampos, cCampo
   LOCAL nBate, nTotal, lValido, cMotivo, aAbertos

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo := SessHandle( cH )
   cDir  := hb_FNameDir( hInfo[ "path" ] )
   aRet  := {}
   aAbertos := hInfo[ "indexes" ]

   FOR EACH aItem IN Directory( hb_DirSepAdd( cDir ) + "*.ntx" )

      cArq := hb_DirSepAdd( cDir ) + aItem[ F_NAME ]
      cMotivo := ""
      lValido := EhNtxValido( cArq, @cMotivo )
      cChave  := iif( lValido, ChaveDoNtx( cArq ), "" )

      /* Quantos identificadores da expressao sao campos deste arquivo. Um
         indice de outro DBF cita campos que aqui nao existem. */
      aCampos := IdentificadoresDe( cChave )
      nTotal  := Len( aCampos )
      nBate   := 0
      FOR EACH cCampo IN aCampos
         IF FieldPos( cCampo ) > 0
            nBate++
         ENDIF
      NEXT

      AAdd( aRet, { ;
         "path"  => cArq, ;
         "file"  => aItem[ F_NAME ], ;
         "key"   => cChave, ;
         "valid" => lValido, ;
         "reason" => cMotivo, ;
         "open"  => AScan( aAbertos, {| c | MesmoArquivo( c, cArq ) } ) > 0, ;
         "match" => Confianca( lValido, nTotal, nBate ) } )
   NEXT

   RETURN Ok( { "h" => cH, "dir" => cDir, "candidates" => Desempata( aRet ) } )

/*
 * Rebaixa "sure" para "maybe" quando a MESMA expressao aparece em mais de um
 * .ntx da pasta.
 *
 * Sem isto ha falso positivo garantido: NETCLI.DBF tem um campo NP_SYNC, e
 * IDSCLI/IDSEST/IDSPALD/IDSPALT/IDSUSU.ntx TODOS indexam por NP_SYNC -- cada
 * um do seu proprio DBF. Os cinco batiam como "sure", e quatro estavam errados.
 *
 * Quando cinco arquivos da pasta ordenam pela mesma chave, nenhum deles e
 * obviamente deste DBF, e dizer "sure" seria mentir. Continuam todos na lista:
 * o casamento por conteudo e pista, nao prova, e quem decide e o usuario.
 */
STATIC FUNCTION Desempata( aCand )

   LOCAL hQuantos := { => }
   LOCAL hItem, cChave

   FOR EACH hItem IN aCand
      cChave := Upper( hItem[ "key" ] )
      IF ! Empty( cChave )
         hQuantos[ cChave ] := iif( hb_HHasKey( hQuantos, cChave ), ;
                                    hQuantos[ cChave ] + 1, 1 )
      ENDIF
   NEXT

   FOR EACH hItem IN aCand
      cChave := Upper( hItem[ "key" ] )
      IF hItem[ "match" ] == "sure" .AND. ! Empty( cChave ) .AND. ;
         hQuantos[ cChave ] > 1
         hItem[ "match" ] := "maybe"
         hItem[ "reason" ] := "outros " + hb_ntos( hQuantos[ cChave ] - 1 ) + ;
                              " indices desta pasta usam a mesma chave"
      ENDIF
   NEXT

   RETURN aCand

/*
 * "sure"  todo identificador da expressao e campo daqui, e ha pelo menos um
 * "maybe" alguns batem -- pode ser expressao com funcao ou literal
 * "no"     nenhum bate, ou o arquivo nem e NTX
 */
STATIC FUNCTION Confianca( lValido, nTotal, nBate )

   IF ! lValido .OR. nTotal == 0
      RETURN "no"
   ENDIF

   DO CASE
   CASE nBate == nTotal ; RETURN "sure"
   CASE nBate > 0       ; RETURN "maybe"
   ENDCASE

   RETURN "no"

/*
 * Identificadores de uma expressao xBase: "UPPER(CLI_NOME)+DTOS(CLI_DATA)" ->
 * {"UPPER","CLI_NOME","DTOS","CLI_DATA"}.
 *
 * Nomes de funcao entram junto e simplesmente nao serao campos -- o que ja
 * empurra a expressao para "maybe" em vez de "sure", que e o certo: uma
 * expressao com funcao merece menos confianca do que uma so de campos.
 */
STATIC FUNCTION IdentificadoresDe( cExpr )

   LOCAL aRet := {}
   LOCAL cAtual := ""
   LOCAL i, cCh

   cExpr := Upper( hb_defaultValue( cExpr, "" ) )

   FOR i := 1 TO Len( cExpr ) + 1
      cCh := iif( i > Len( cExpr ), " ", SubStr( cExpr, i, 1 ) )

      IF IsAlpha( cCh ) .OR. IsDigit( cCh ) .OR. cCh == "_"
         cAtual += cCh
      ELSE
         /* Comeca com letra e nao e so numero: candidato a nome de campo. */
         IF Len( cAtual ) > 0 .AND. IsAlpha( Left( cAtual, 1 ) ) .AND. ;
            AScan( aRet, {| c | c == cAtual } ) == 0
            AAdd( aRet, cAtual )
         ENDIF
         cAtual := ""
      ENDIF
   NEXT

   RETURN aRet

/* ------------------------------------------------------------------ criar */

/*
 * index.create {"h":"h7","path":"J:/bases/base01/MEU.ntx","key":"CLI_NOME",
 *               "for":"!Deleted()","unique":false}
 *
 * PRIMEIRA ROTINA DESTE APP QUE ESCREVE UM ARQUIVO -- ainda que um .ntx, e nao
 * o DBF. As regras de docs/10-integridade.md ja valem aqui:
 *
 *   - nao sobrescreve arquivo existente sem que o chamador diga `replace`
 *   - cancelar apaga o .ntx incompleto (R3): um indice pela metade abre sem
 *     reclamar e devolve registro errado, que e pior do que nao existir
 *   - roda como tarefa, com progresso e cancelamento (T12)
 *
 * O DBF nao e tocado: criar indice le o arquivo e escreve ao lado.
 */
FUNCTION Api_Index_Create( hP )

   LOCAL cH     := ParStr( hP, "h" )
   LOCAL cArq   := ParStr( hP, "path" )
   LOCAL cChave := ParStr( hP, "key" )
   LOCAL cFor   := ParStr( hP, "for" )
   LOCAL lUnico := ParLog( hP, "unique", .F. )
   LOCAL lSubst := ParLog( hP, "replace", .F. )
   LOCAL xErro, hDiag, oErr, lParou, nTotal

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF Empty( AllTrim( cChave ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "key expression is required", "key", ;
                  { "param" => "key" } )
   ENDIF

   IF Empty( AllTrim( cArq ) )
      RETURN Err( "ERROR_PARAM_REQUIRED", "index path is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   cArq := CaminhoOS( cArq )

   /* Destino sem extensao ganha .ntx: e o unico formato que criamos, e deixar o
      usuario com um arquivo sem extensao seria pegadinha. */
   IF Empty( hb_FNameExt( cArq ) )
      cArq += ".ntx"
   ENDIF

   IF ! hb_DirExists( hb_FNameDir( cArq ) )
      RETURN Err( "ERROR_DIR_NOT_FOUND", "folder not found", "path", ;
                  { "dir" => hb_FNameDir( cArq ) } )
   ENDIF

   /* ABERTO e verificado ANTES de "ja existe": regravar um indice em uso daria
      arquivo corrompido, e dizer "use replace" primeiro mandaria o usuario para
      uma segunda recusa depois de ele achar que tinha resolvido. */
   IF AScan( SessHandle( cH )[ "indexes" ], ;
             {| c | Upper( CaminhoOS( c ) ) == Upper( cArq ) } ) > 0
      RETURN Err( "ERROR_INDEX_OPEN_ON_CREATE", ;
                  "index is open; close it before rebuilding", ;
                  "path", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   IF hb_FileExists( cArq ) .AND. ! lSubst
      RETURN Err( "ERROR_FILE_EXISTS", "file already exists", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   /* A chave precisa COMPILAR e produzir valor indexavel. Sem esta conferencia,
      uma expressao errada so falharia depois de percorrer 400 mil registros. */
   hDiag := ExprDiagnostico( cH, cChave, "" )

   IF ! hDiag[ "ok" ]
      RETURN Err( "ERROR_EXPR_INVALID", hDiag[ "error" ], "key", ;
                  { "detail" => hDiag[ "error" ] } )
   ENDIF

   IF hDiag[ "evaluated" ] .AND. ! ( hDiag[ "type" ] $ "CND" )
      RETURN Err( "ERROR_INDEX_KEY_BAD_TYPE", "NTX key must be text, number or date", ;
                  "key", { "type" => hDiag[ "type" ] } )
   ENDIF

   IF ! Empty( AllTrim( cFor ) )
      hDiag := ExprDiagnostico( cH, cFor, "L" )
      IF ! hDiag[ "ok" ]
         RETURN Err( "ERROR_EXPR_INVALID", hDiag[ "error" ], "for", ;
                     { "detail" => hDiag[ "error" ] } )
      ENDIF
      IF hDiag[ "evaluated" ] .AND. ! hDiag[ "typeOk" ]
         RETURN Err( "ERROR_EXPR_NOT_LOGICAL", "FOR condition must be logical", "for", ;
                     { "type" => hDiag[ "type" ] } )
      ENDIF
   ENDIF

   nTotal := LastRec()

   Dbu_JobBegin( JobMsg( "UI_JOB_INDEXING", cArq ), nTotal )

   BEGIN SEQUENCE WITH {| e | Break( e ) }

      /* O bloco de avaliacao publica o progresso: ordCreate() nao avisa em que
         registro esta, e sem isto a barra ficaria parada durante a indexacao
         inteira -- justamente a operacao mais demorada do app. */
      ordCondSet( iif( Empty( cFor ), NIL, cFor ), ;
                  iif( Empty( cFor ), NIL, hb_macroBlock( cFor ) ), ;
                  .T., ;                      /* lAll */
                  NIL, ;                      /* bWhile */
                  {|| ProgressoIndice() }, ;  /* bEval */
                  100, ;                      /* nInterval */
                  NIL, NIL, NIL, ;
                  .F., ;                      /* lRest */
                  .F., ;                      /* lDescend */
                  .F., ;                      /* lAdditive */
                  .F., ;                      /* lCurrent */
                  .F., ;                      /* lCustom */
                  .F. )                       /* lNoOptimize */

      ordCreate( cArq, , cChave, hb_macroBlock( cChave ), lUnico )

   RECOVER USING oErr

      ordCondSet()          /* limpa a condicao, senao vaza para o proximo */
      Dbu_JobEnd()
      LimpaParcial( cArq )

      RETURN Err( "ERROR_INDEX_CREATE_FAILED", "could not create index", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), ;
                    "reason" => iif( HB_ISOBJECT( oErr ) .AND. ;
                                     HB_ISSTRING( oErr:description ), ;
                                     oErr:description, "" ) } )

   END SEQUENCE

   ordCondSet()

   lParou := Dbu_Canceled()   /* antes do JobEnd, que zera o sinalizador */
   Dbu_JobEnd()

   IF lParou
      /*
       * R3 de docs/10-integridade.md: cancelar nao deixa lixo.
       *
       * Um .ntx interrompido no meio nao se anuncia -- ele abre, tem cabecalho
       * valido, e devolve o registro errado nas chaves que faltaram. Deixa-lo
       * no disco seria pior que nao ter criado nada.
       */
      /* ordCreate abriu o indice novo na work area. Reconstroi() a devolve
         exatamente aos indices que a sessao conhece -- o novo sai junto, e e
         isso que permite apagar o arquivo em seguida. */
      Reconstroi( SessHandle( cH )[ "indexes" ] )
      LimpaParcial( cArq )

      RETURN Err( "WARN_CANCELED_INDEX", "index creation canceled", "path", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   /* ordCreate deixa o indice novo aberto e como ordem ativa. Registrar na
      sessao mantem hInfo["indexes"] igual a work area -- a divergencia entre os
      dois foi bug real na T5. */
   AAdd( SessHandle( cH )[ "indexes" ], cArq )
   SessBump()

   RETURN Ok( EstadoIndices( cH ) )

/* Publica o progresso durante ordCreate e responde ao cancelamento.
   Devolver .F. faz o RDD abortar a indexacao. */
STATIC FUNCTION ProgressoIndice()

   Dbu_Progress( RecNo() )

   RETURN ! Dbu_Canceled()

/* Apaga um indice que ficou pela metade. */
STATIC FUNCTION LimpaParcial( cArq )

   IF hb_FileExists( cArq )
      FErase( cArq )
   ENDIF

   RETURN NIL

/* -------------------------------------------------------------- ordem ativa */

/*
 * index.setorder {"h":"h7","order":2}   0 = ordem fisica (natural)
 *
 * MELHORIA sobre o original, que so usava o slot [1]: com varios indices
 * abertos da para trocar qual comanda sem fechar nada.
 *
 * Depois de trocar a ordem, dbGoTop(): a posicao atual foi calculada na ordem
 * ANTERIOR, e deixar o cursor onde estava daria uma pagina que nao e nem a
 * antiga nem a nova. O chamador reancora.
 */
FUNCTION Api_Index_SetOrder( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL nOrd  := ParNum( hP, "order", 0 )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   IF nOrd < 0 .OR. nOrd > ordCount()
      RETURN Err( "ERROR_PARAM_OUT_OF_RANGE", "order out of range", "order", ;
                  { "param" => "order", "value" => nOrd, ;
                    "min" => 0, "max" => ordCount() } )
   ENDIF

   ordSetFocus( nOrd )
   dbGoTop()

   RETURN Ok( EstadoIndices( cH ) )

/* ---------------------------------------------------------------- helpers */

/*
 * Os indices do handle e qual esta no comando, LIDOS DA WORK AREA.
 *
 * Publico porque FileState() usa: assim session.state ja traz a ordem ativa e a
 * UI nao precisa de uma chamada a mais so para saber como a grade esta ordenada.
 */
FUNCTION EstadoIndices( cH )

   LOCAL aRet := {}
   LOCAL nAtiva := IndexOrd()
   LOCAL hInfo := SessHandle( cH )
   LOCAL aReg := iif( hInfo == NIL, {}, hInfo[ "indexes" ] )
   LOCAL i, cBag

   FOR i := 1 TO ordCount()
      cBag := ordBagName( i )
      AAdd( aRet, { ;
         "order"  => i, ;
         "name"   => NomeDaOrdem( i ), ;
         "key"    => ordKey( i ), ;
         "for"    => ordFor( i ), ;
         "bag"    => cBag, ;
         "path"   => CaminhoDoBag( cBag, aReg ), ;
         "active" => ( i == nAtiva ) } )
   NEXT

   RETURN { "h" => cH, "indexes" => aRet, "order" => nAtiva, ;
            "orderKey" => iif( nAtiva > 0, ordKey( nAtiva ), "" ) }

/*
 * Caminho completo do bag.
 *
 * ordBagName() devolve so "ID2CLI", sem pasta -- e index.close precisa do
 * caminho. Casa-se pelo nome contra a lista registrada na sessao; sem isto o
 * botao de fechar do painel mandava "ID2CLI", que resolvia para o diretorio
 * corrente e voltava INDEX_NOT_OPEN para um indice que estava aberto.
 */
STATIC FUNCTION CaminhoDoBag( cBag, aReg )

   LOCAL cAlvo := Upper( hb_FNameName( hb_defaultValue( cBag, "" ) ) )
   LOCAL c

   FOR EACH c IN aReg
      IF Upper( hb_FNameName( c ) ) == cAlvo
         RETURN c
      ENDIF
   NEXT

   RETURN hb_defaultValue( cBag, "" )

/*
 * NTX nao guarda nome de tag: ordName() volta vazio. Cai-se no nome do arquivo,
 * que e como o usuario chama o indice de qualquer forma.
 */
STATIC FUNCTION NomeDaOrdem( i )

   LOCAL cNome := ordName( i )

   IF ! Empty( cNome )
      RETURN cNome
   ENDIF

   RETURN hb_FNameName( hb_defaultValue( ordBagName( i ), "" ) )

/*
 * Le a expressao de chave do cabecalho NTX.
 *
 * Porte de ntx_key() (DBUUTIL.PRG:2153) COM validacao: o original avisa em
 * comentario que "assume a valid index file". Aqui nao da para assumir -- na
 * mesma pasta ha .DBF que sao arquivo de texto, e nada garante que um .ntx
 * seja um NTX.
 */
STATIC FUNCTION ChaveDoNtx( cArq )

   LOCAL cBuffer := Space( NTX_CABECALHO )
   LOCAL nH := FOpen( cArq, FO_READ + FO_SHARED )
   LOCAL cChave, nZero

   IF nH == F_ERROR
      RETURN ""
   ENDIF

   FRead( nH, @cBuffer, NTX_CABECALHO )
   FClose( nH )

   cChave := SubStr( cBuffer, NTX_POS_CHAVE )
   nZero  := At( Chr( 0 ), cChave )

   IF nZero > 0
      cChave := SubStr( cChave, 1, nZero - 1 )
   ENDIF

   RETURN AllTrim( cChave )

/*
 * .T. quando o arquivo se parece com um NTX de verdade.
 *
 * Sem isto, um arquivo qualquer renomeado para .ntx e aceito pelo ordListAdd()
 * e so quebra na primeira navegacao -- com o registro errado na tela, que e
 * pior do que uma recusa.
 */
STATIC FUNCTION EhNtxValido( cArq, cMotivo )

   LOCAL cBuffer := Space( NTX_CABECALHO )
   LOCAL nH, nLido, nAssin, cChave, i, nByte

   cMotivo := ""

   IF hb_FSize( cArq ) < NTX_CABECALHO
      cMotivo := "menor que um cabecalho NTX (" + hb_ntos( hb_FSize( cArq ) ) + " bytes)"
      RETURN .F.
   ENDIF

   nH := FOpen( cArq, FO_READ + FO_SHARED )
   IF nH == F_ERROR
      cMotivo := "nao foi possivel ler o arquivo"
      RETURN .F.
   ENDIF

   nLido := FRead( nH, @cBuffer, NTX_CABECALHO )
   FClose( nH )

   IF nLido < NTX_CABECALHO
      cMotivo := "cabecalho incompleto"
      RETURN .F.
   ENDIF

   /* Assinatura NTX: 0x0006 (Clipper) ou 0x0106 (com FOR). Little-endian. */
   nAssin := Bin2W( SubStr( cBuffer, 1, 2 ) )
   IF nAssin != 6 .AND. nAssin != 262
      cMotivo := "assinatura 0x" + hb_NumToHex( nAssin, 4 ) + " nao e NTX"
      RETURN .F.
   ENDIF

   cChave := ChaveDoNtx( cArq )
   IF Empty( cChave )
      cMotivo := "sem expressao de chave no cabecalho"
      RETURN .F.
   ENDIF

   /* Expressao com byte de controle e cabecalho corrompido, nao expressao. */
   FOR i := 1 TO Len( cChave )
      nByte := Asc( SubStr( cChave, i, 1 ) )
      IF nByte < 32 .AND. nByte != 9
         cMotivo := "expressao de chave com byte de controle"
         RETURN .F.
      ENDIF
   NEXT

   RETURN .T.

/*
 * Deixa a work area com exatamente estes indices, e nada mais.
 *
 * Usado para desfazer um ordListAdd() que registrou o bag e falhou depois: nao
 * existe "remover um bag" no RDD, entao limpa-se e reabre-se a lista conhecida.
 */
STATIC FUNCTION Reconstroi( aIndices )

   LOCAL c

   ordListClear()

   FOR EACH c IN aIndices
      BEGIN SEQUENCE WITH {| e | Break( e ) }
         ordListAdd( c )
      RECOVER
         /* Se um indice que estava aberto agora recusa, o arquivo mudou embaixo
            de nos. Seguir com o resto e melhor que abortar tudo. */
      END SEQUENCE
   NEXT

   RETURN NIL

/*
 * Traduz a falha de abertura para algo acionavel.
 *
 * "Undefined function" e o caso comum e o mais confuso: a expressao do indice
 * usa uma funcao que este binario nao tem. Sao tres motivos diferentes, e o
 * usuario precisa saber qual:
 *
 *   - funcao do APLICATIVO dele (DESCDATA, NCM_VAL nas bases reais). Nao ha o
 *     que fazer aqui: o codigo esta no sistema dele, nao nesta DLL.
 *   - abreviacao do Clipper (SUBST por SUBSTR). Resolvida em util/clipper.prg.
 *   - funcao de biblioteca que faltava linkar (STRZERO, da Clipper Tools).
 *
 * Sem dizer QUAL funcao, os tres viram o mesmo "nao deu" -- e 39 dos 395
 * indices de uma pasta real caem aqui.
 */
STATIC FUNCTION FalhaDoIndice( oErr, cArq )

   LOCAL cDesc := ""
   LOCAL cOper := ""
   LOCAL cNome := hb_FNameNameExt( cArq )

   IF HB_ISOBJECT( oErr )
      cDesc := iif( HB_ISSTRING( oErr:description ), oErr:description, "" )
      cOper := iif( HB_ISSTRING( oErr:operation ), oErr:operation, "" )
   ENDIF

   IF "Undefined function" $ cDesc .OR. "undefined function" $ Lower( cDesc )
      RETURN Err( "ERROR_INDEX_UNKNOWN_FUNCTION", ;
                  "index key uses a function this DLL does not have", "path", ;
                  { "file" => cNome, ;
                    "func" => iif( Empty( cOper ), "", Upper( cOper ) + "()" ), ;
                    "key"  => ChaveDoNtx( cArq ) } )
   ENDIF

   /* Campo inexistente quase sempre quer dizer indice de OUTRO arquivo -- e o
      que acontece ao tentar abrir os 395 .ntx de uma pasta num DBF so. Dizer
      "Variable does not exist [LOG_NOW]" nao ajuda ninguem a entender isso. */
   IF "does not exist" $ Lower( cDesc ) .OR. "nao existe" $ Lower( cDesc )
      RETURN Err( "ERROR_INDEX_FIELD_NOT_IN_FILE", ;
                  "index key uses a field this file does not have", "path", ;
                  { "file"  => cNome, ;
                    "field" => iif( Empty( cOper ), "", Upper( cOper ) ), ;
                    "alias" => Alias(), ;
                    "key"   => ChaveDoNtx( cArq ) } )
   ENDIF

   RETURN Err( "ERROR_INDEX_OPEN_FAILED", "could not open index", "path", ;
               { "file"   => cNome, ;
                 "detail" => AllTrim( cDesc + ;
                                      iif( Empty( cOper ), "", " [" + cOper + "]" ) ) } )


/* Windows mistura / e barra invertida e nao distingue maiuscula de minuscula. */
STATIC FUNCTION MesmoArquivo( c1, c2 )
   RETURN Upper( CaminhoOS( hb_defaultValue( c1, "" ) ) ) == ;
          Upper( CaminhoOS( hb_defaultValue( c2, "" ) ) )

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
