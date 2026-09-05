/*
 * api_file.prg - abrir, fechar e inspecionar arquivos DBF.
 *
 * Cada arquivo aberto ganha um HANDLE opaco. Toda operacao posterior cita o
 * handle, e comeca por dbSelectArea() -- e isso que impede uma chamada de vazar
 * para a workarea de outra. Ver session.prg.
 */

#include "dbinfo.ch"
#include "dbstruct.ch"
#include "fileio.ch"

/* ------------------------------------------------------------------ abrir */

/*
 * file.open {"caminho":"J:/bases/base01/NETCLI.DBF","exclusivo":false,"conexao":"base01"}
 *   -> {"h":"h7","alias":"NETCLI",...}
 *
 * O mesmo arquivo aberto duas vezes e RECUSA, nao erro: e o comportamento do
 * DBU original (DBU_OPENMSG4) e evita duas abas editando o mesmo registro.
 */
FUNCTION Api_File_Open( hP )

   LOCAL cArq  := ParStr( hP, "path" )
   LOCAL lExcl := ParLog( hP, "exclusive", .F. )
   LOCAL cConn := ParStr( hP, "connection" )
   LOCAL cCdp  := ParStr( hP, "codepage" )
   LOCAL cAlias, cH, hJa, nArea, cMotivo, oErr, cOrigem

   IF Empty( cArq )
      RETURN Err( "ERROR_PARAM_REQUIRED", "file path is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   /* Codepage: se veio explicito no pedido, tem de ser valido e vence tudo.
      Senao, a CASCATA decide -- arquivo > conexao > global > PT850 (config.prg).
      A pista do cabecalho vai junto no FileState, para a tela sugerir sem
      adivinhar por conta propria. */
   IF ! Empty( cCdp )
      IF ! CdpValida( cCdp )
         RETURN Err( "ERROR_UNKNOWN_CODEPAGE", "unknown codepage", "codepage", ;
                     { "codepage" => cCdp } )
      ENDIF
      cOrigem := "request"
   ELSE
      cCdp := CodepageResolvido( CaminhoOS( cArq ), cConn, @cOrigem )
   ENDIF

   cArq := CaminhoOS( cArq )

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "file not found", "path", ;
                  { "file" => cArq } )
   ENDIF

   hJa := HandleDoArquivo( cArq )
   IF hJa != NIL
      RETURN Err( "ERROR_FILE_ALREADY_OPEN", "file already open in this session", ;
                  "path", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   /* Valida ANTES de mandar o Harbour abrir: um .DBF que e arquivo texto faria
      o USE estourar erro de runtime, e erro previsivel tem de ser recusa. */
   IF ! EhDbfValido( cArq, @cMotivo )
      RETURN Err( "ERROR_NOT_A_DBF", "not a valid DBF", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "reason" => cMotivo } )
   ENDIF

   /* Flag de memo ligada exige o arquivo memo ao lado. Acontece de alguem
      copiar so o .DBF -- e em J:/bases/base01 ha um caso real ("NETLBL -
      Copia.DBF"). Sem esta checagem o dbUseArea estoura "Open error", que
      viraria "ERR:" quando na verdade e situacao previsivel. */
   IF TemFlagMemo( cArq ) .AND. ! MemoAoLado( cArq, @cMotivo )
      RETURN Err( "ERROR_MEMO_FILE_MISSING", "memo file missing next to the DBF", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "memo" => cMotivo } )
   ENDIF

   cAlias := AliasLivre( cArq )

   /* dbUseArea pode estourar por motivos previsiveis (arquivo travado por outro
      processo, permissao, memo corrompido). Erro previsivel e RECUSA. */
   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T.,, cArq, cAlias, ! lExcl, .F. )
   RECOVER USING oErr
      RETURN Err( "ERROR_OPEN_FAILED", "could not open the file", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), ;
                    "reason" => iif( HB_ISOBJECT( oErr ) .AND. ;
                                     HB_ISSTRING( oErr:description ), ;
                                     oErr:description, "" ) } )
   END SEQUENCE

   IF ! Used()
      RETURN Err( "ERROR_OPEN_FAILED", "could not open the file", ;
                  "path", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   nArea := Select()

   cH := SessNewHandle( { ;
      "path"       => cArq, ;
      "alias"      => cAlias, ;
      "wa"         => nArea, ;
      "exclusive"  => lExcl, ;
      "connection" => cConn, ;
      "indexes"    => {}, ;
      "visible"    => {}, ;   /* colunas visiveis; vazio = todas (T4) */
      "codepage"   => cCdp, ;
      "codepageOrigin" => cOrigem, ;
      "filter"     => "" } )

   RETURN Ok( FileState( cH, .T. ) )

/* ----------------------------------------------------------------- fechar */

/* file.close {"h":"h7"} */
FUNCTION Api_File_Close( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xSel := SessSelect( cH )

   IF xSel != NIL
      RETURN xSel
   ENDIF

   dbCloseArea()
   SessClose( cH, "file.close" )

   RETURN Ok( { "h" => cH, "closed" => .T. } )

/* ------------------------------------------------------------- codepage */

/*
 * file.setcodepage {"h":"h7","codepage":"ESWIN"[,"persist":"file"]} -> FileState
 *
 * Troca a lente do arquivo SEM fechar/reabrir e SEM tocar no disco de dados --
 * so muda como os bytes daquele DBF viram texto. O `rev` sobe (SessBump), a UI
 * rele a pagina e ve o acento certo. Reversivel: e so trocar de novo.
 *
 * `persist` e OPT-IN e decide se a escolha sobrevive ao fechamento:
 *   ausente  -> vale so nesta sessao (nada e escrito em disco)
 *   "file"   -> fixa em <pasta>/.qdbu/arquivos.json (o nivel mais especifico)
 *
 * Fixar e BEST-EFFORT: pasta do cliente read-only ou de rede nao derruba nada
 * -- a lente vale igual, e `saved` volta .F. para a UI avisar. Nunca "ERR:".
 * Conexao e global se fixam noutros lugares (workspace.update, config.set).
 */
FUNCTION Api_File_SetCodepage( hP )

   LOCAL cH      := ParStr( hP, "h" )
   LOCAL cCdp    := ParStr( hP, "codepage" )
   LOCAL cPers   := ParStr( hP, "persist" )
   LOCAL xErro := SessSelect( cH )
   LOCAL hInfo, hRet, lSalvou := .F.

   IF xErro != NIL
      RETURN xErro
   ENDIF

   IF ! CdpValida( cCdp )
      RETURN Err( "ERROR_UNKNOWN_CODEPAGE", "unknown codepage", "codepage", ;
                  { "codepage" => cCdp } )
   ENDIF

   /* Hash do handle e por referencia: alterar aqui altera o guardado. */
   hInfo := SessHandle( cH )
   hInfo[ "codepage" ] := cCdp

   IF cPers == "file"
      lSalvou := SalvaCodepageArquivo( hInfo[ "path" ], cCdp )
   ENDIF

   /*
    * A ORIGEM SO E "file" SE O DISCO ACEITOU.
    *
    * Fixar e best-effort: pasta de cliente read-only ou de rede devolve
    * .F. e a lente vale so nesta sessao. Carimbar "file" antes de saber
    * acendia o 📌 e punha o title "fixado neste arquivo" enquanto a barra
    * avisava que NAO tinha gravado -- duas afirmacoes opostas na mesma tela,
    * e a que a pessoa acredita e a do botao. Reabrir o arquivo cairia na
    * cascata e a escolha teria sumido sem ninguem ver.
    */
   hInfo[ "codepageOrigin" ] := iif( lSalvou, "file", "session" )

   SessBump()

   hRet := FileState( cH, .F. )
   hRet[ "persisted" ] := cPers
   hRet[ "saved" ]     := lSalvou

   RETURN Ok( hRet )

/*
 * Pista de codepage vinda do CABECALHO -- o byte do "language driver" (offset
 * 29). E so PISTA: a maioria dos DBFs Clipper grava 0x00 (nao especificado), e
 * um valor errado ali nao pode calar a escolha da pessoa. Devolve o id
 * sugerido quando o byte e reconhecido E a codepage esta disponivel, senao "".
 *
 * Le com hb_vfOpen/hb_BPeek, como EhDbfValido e TemFlagMemo -- cabecalho cru,
 * antes de qualquer work area. Nao e FRead sobre dado de registro (o que o R8
 * proibe): e a mesma leitura de 32 bytes que valida o arquivo ao abrir.
 */
STATIC FUNCTION CdpDoCabecalho( cArq )

   LOCAL hFile := hb_vfOpen( cArq, FO_READ + FO_SHARED )
   LOCAL cBuf := Space( 32 )
   LOCAL nLng, cId := ""

   IF hFile == NIL
      RETURN ""
   ENDIF

   IF hb_vfRead( hFile, @cBuf, 32 ) >= 30
      nLng := hb_BPeek( cBuf, 30 )   /* offset 29, 1-based no hb_BPeek */
      DO CASE
      CASE nLng == 0x02 ; cId := "PT850"   /* DOS 850 (multilingue) */
      CASE nLng == 0x03 ; cId := "ESWIN"   /* Windows-1252 (ANSI)   */
      CASE nLng == 0xC9 ; cId := "ESWIN"   /* Windows-1252 (VFP)    */
      ENDCASE
   ENDIF

   hb_vfClose( hFile )

   RETURN iif( CdpValida( cId ), cId, "" )

/* file.close_all */
FUNCTION Api_File_Close_All( hP )

   LOCAL nQty := 0
   LOCAL hInfo

   HB_SYMBOL_UNUSED( hP )

   FOR EACH hInfo IN SessOpenFiles()
      IF SessSelect( hInfo[ "h" ] ) == NIL
         dbCloseArea()
         SessClose( hInfo[ "h" ], "file.close_all" )
         nQty++
      ENDIF
   NEXT

   RETURN Ok( { "closed" => nQty } )

/* ------------------------------------------------------------------- info */

/* file.info {"h":"h7"} -- estado atual, lido da workarea */
FUNCTION Api_File_Info( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL xSel := SessSelect( cH )

   IF xSel != NIL
      RETURN xSel
   ENDIF

   RETURN Ok( FileState( cH, .T. ) )

/* file.list -- os arquivos abertos, para a barra de abas */
FUNCTION Api_File_List( hP )

   LOCAL aRet := {}
   LOCAL hInfo

   HB_SYMBOL_UNUSED( hP )

   FOR EACH hInfo IN SessOpenFiles()
      AAdd( aRet, { ;
         "h"       => hInfo[ "h" ], ;
         "alias"   => hInfo[ "alias" ], ;
         "caminho" => hInfo[ "path" ], ;
         "conexao" => hInfo[ "connection" ] } )
   NEXT

   RETURN Ok( { "openFiles" => aRet } )

/* ---------------------------------------------------------------- estrutura */

/*
 * file.struct {"h":"h7"} ou {"caminho":"..."}
 *
 * Por caminho, abre numa area temporaria e fecha -- ler a estrutura de um
 * arquivo nao deveria obrigar a abri-lo como aba.
 */
FUNCTION Api_File_Struct( hP )

   LOCAL cH  := ParStr( hP, "h" )
   LOCAL cArq := ParStr( hP, "path" )
   LOCAL aRet, xSel, cAlias, cMotivo

   IF ! Empty( cH )
      xSel := SessSelect( cH )
      IF xSel != NIL
         RETURN xSel
      ENDIF
      RETURN Ok( { "h" => cH, "fields" => AreaStructure() } )
   ENDIF

   IF Empty( cArq )
      RETURN Err( "ERROR_PARAM_REQUIRED", "h or path is required", "h", ;
                  { "param" => "h" } )
   ENDIF

   cArq := CaminhoOS( cArq )

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "file not found", "path", { "file" => cArq } )
   ENDIF

   IF ! EhDbfValido( cArq, @cMotivo )
      RETURN Err( "ERROR_NOT_A_DBF", "not a valid DBF", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), "reason" => cMotivo } )
   ENDIF

   cAlias := AliasLivre( cArq )
   dbUseArea( .T.,, cArq, cAlias, .T., .T. )

   IF ! Used()
      RETURN Err( "ERROR_NOT_A_DBF", "could not read the file", "path", ;
                  { "file" => cArq } )
   ENDIF

   aRet := AreaStructure()
   dbCloseArea()

   RETURN Ok( { "path" => cArq, "fields" => aRet } )

/* ----------------------------------------------------------------- apoio */

/* Numerico do envelope, com padrao. STATIC como nos demais api_*.prg. */
STATIC FUNCTION ParNum( hP, cChave, nPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN nPadrao
   ENDIF

   RETURN iif( HB_ISNUMERIC( hP[ cChave ] ), hP[ cChave ], nPadrao )

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

/* Handle aberto que ja aponta para este arquivo, ou NIL. */
STATIC FUNCTION HandleDoArquivo( cArq )

   LOCAL hInfo

   FOR EACH hInfo IN SessOpenFiles()
      IF Upper( hInfo[ "path" ] ) == Upper( cArq )
         RETURN hInfo
      ENDIF
   NEXT

   RETURN NIL

/*
 * Alias unico. O nome do arquivo pode repetir entre conexoes (NETCLI existe em
 * todo cliente), entao acrescenta sufixo quando ja houver.
 */
STATIC FUNCTION AliasLivre( cArq )

   LOCAL cBase := Upper( hb_FNameName( cArq ) )
   LOCAL cTenta := cBase
   LOCAL n := 1

   /* alias precisa comecar por letra e nao ter pontuacao */
   cTenta := AllTrim( hb_StrReplace( cTenta, "-. ", "___" ) )
   IF Empty( cTenta ) .OR. ! IsAlpha( Left( cTenta, 1 ) )
      cTenta := "T" + cTenta
   ENDIF

   cBase := cTenta

   DO WHILE Select( cTenta ) > 0
      n++
      cTenta := cBase + "_" + hb_ntos( n )
   ENDDO

   RETURN cTenta

/*
 * Valida o cabecalho antes de abrir. Devolve .F. e o motivo em cMotivo.
 * Repete o cuidado de api_workspace: um .DBF que e INI faria o USE estourar.
 */
STATIC FUNCTION EhDbfValido( cArq, cMotivo )

   LOCAL hFile, cBuf
   LOCAL nSig, nRegs, nHdr, nRec, nTam

   cMotivo := ""
   hFile := hb_vfOpen( cArq, FO_READ + FO_SHARED )

   IF hFile == NIL
      cMotivo := "nao foi possivel abrir para leitura"
      RETURN .F.
   ENDIF

   cBuf := Space( 32 )

   IF hb_vfRead( hFile, @cBuf, 32 ) < 32
      hb_vfClose( hFile )
      cMotivo := "menor que 32 bytes"
      RETURN .F.
   ENDIF

   hb_vfClose( hFile )

   nSig  := hb_BPeek( cBuf, 1 )
   nRegs := hb_BPeek( cBuf, 5 ) + hb_BPeek( cBuf, 6 ) * 256 + ;
            hb_BPeek( cBuf, 7 ) * 65536 + hb_BPeek( cBuf, 8 ) * 16777216
   nHdr  := hb_BPeek( cBuf, 9 )  + hb_BPeek( cBuf, 10 ) * 256
   nRec  := hb_BPeek( cBuf, 11 ) + hb_BPeek( cBuf, 12 ) * 256

   IF AScan( { 0x02, 0x03, 0x04, 0x05, 0x30, 0x31, 0x32, 0x43, 0x63, ;
               0x83, 0x8B, 0x8E, 0xB3, 0xCB, 0xE5, 0xF5, 0xFB }, nSig ) == 0
      cMotivo := "assinatura 0x" + hb_NumToHex( nSig, 2 ) + " nao e xBase"
      RETURN .F.
   ENDIF

   IF nHdr < 33 .OR. nRec < 1
      cMotivo := "cabecalho ou registro com tamanho impossivel"
      RETURN .F.
   ENDIF

   nTam := hb_FSize( cArq )

   IF nRegs > 0 .AND. Abs( nHdr + nRegs * nRec - nTam ) > nRec + 8
      cMotivo := "cabecalho anuncia " + hb_ntos( nRegs ) + " registros, " + ;
                 "incompativel com o tamanho do arquivo"
      RETURN .F.
   ENDIF

   RETURN .T.

/* Bit 0x80 do primeiro byte: o DBF declara ter campo memo. */
STATIC FUNCTION TemFlagMemo( cArq )

   LOCAL hFile := hb_vfOpen( cArq, FO_READ + FO_SHARED )
   LOCAL cBuf := Space( 1 )
   LOCAL lRet := .F.

   IF hFile != NIL
      IF hb_vfRead( hFile, @cBuf, 1 ) == 1
         lRet := hb_bitAnd( hb_BPeek( cBuf, 1 ), 0x80 ) != 0
      ENDIF
      hb_vfClose( hFile )
   ENDIF

   RETURN lRet

/* .DBT (DBFNTX/DBFCDX) ou .FPT (FoxPro) ao lado do DBF. */
STATIC FUNCTION MemoAoLado( cArq, cQual )

   LOCAL cBase := hb_FNameExtSet( cArq, "" )
   LOCAL cExt

   FOR EACH cExt IN { ".dbt", ".DBT", ".fpt", ".FPT" }
      IF hb_FileExists( cBase + cExt )
         cQual := cExt
         RETURN .T.
      ENDIF
   NEXT

   cQual := hb_FNameNameExt( cBase + ".dbt" )

   RETURN .F.

/* Estrutura da area corrente, no formato que a UI espera. */
FUNCTION AreaStructure()

   LOCAL aEstru := dbStruct()
   LOCAL aRet := {}
   LOCAL aField, i := 0

   FOR EACH aField IN aEstru
      i++
      AAdd( aRet, { ;
         "n"        => i, ;
         "name"     => aField[ DBS_NAME ], ;
         "type"     => aField[ DBS_TYPE ], ;
         "len"      => aField[ DBS_LEN ], ;
         "dec"      => aField[ DBS_DEC ] } )
   NEXT

   RETURN aRet

/*
 * Snapshot of one open file, READ FROM THE WORK AREA.
 *
 * Never from a copy kept aside: recno, total and mode are Harbour's truth, and
 * duplicating them in the session object is how the original DBU ended up with
 * 70 globals.
 *
 * Single place that describes a file -- session.state uses this too, so the UI
 * never sees two different shapes for the same thing.
 *
 * lWithFields: the full structure is heavy (NETEST has 125 fields). file.open
 * and file.info send it; session.state does not, since it lists every file.
 */
FUNCTION FileState( cH, lWithFields )

   LOCAL hInfo := SessHandle( cH )
   LOCAL nOld := Select()
   LOCAL hRet, cMemo

   IF hInfo == NIL
      RETURN { => }
   ENDIF

   dbSelectArea( hInfo[ "wa" ] )

   hRet := { => }
   hb_HKeepOrder( hRet, .T. )

   hRet[ "h" ]          := cH
   hRet[ "alias" ]      := hInfo[ "alias" ]
   hRet[ "path" ]       := hInfo[ "path" ]
   hRet[ "file" ]       := hb_FNameNameExt( hInfo[ "path" ] )
   hRet[ "connection" ] := hInfo[ "connection" ]
   hRet[ "exclusive" ]  := hInfo[ "exclusive" ]
   hRet[ "mode" ]       := iif( hInfo[ "exclusive" ], "EXCLUSIVE", "SHARED" )
   hRet[ "records" ]    := LastRec()
   hRet[ "recno" ]      := RecNo()
   hRet[ "fieldCount" ] := FCount()
   hRet[ "recordSize" ] := Max( 0, dbInfo( DBI_GETRECSIZE ) )
   hRet[ "hasMemo" ]    := AScan( dbStruct(), {| a | a[ 2 ] $ "MP" } ) > 0
   hRet[ "rdd" ]        := rddName()

   /*
    * O que o painel de informacoes precisa e a grade nao.
    *
    * `lastUpdate` sai do CABECALHO do DBF, e nao da data do arquivo em disco:
    * copiar um DBF muda a data do arquivo e nao muda a do cabecalho -- e a
    * pergunta "quando este dado mudou pela ultima vez" e sobre o dado.
    */
   hRet[ "lastUpdate" ] := dbInfo( DBI_LASTUPDATE )
   hRet[ "headerSize" ] := Max( 0, dbInfo( DBI_GETHEADERSIZE ) )
   /* O codepage E do arquivo (guardado no handle), nao mais um global. E a
      pista que o cabecalho carrega no byte do language driver anda junto: ""
      quando o DBF nao declara, o id sugerido quando declara e esta disponivel. */
   hRet[ "codepage" ]     := iif( hb_HHasKey( hInfo, "codepage" ) .AND. ;
                                  ! Empty( hInfo[ "codepage" ] ), ;
                                  hInfo[ "codepage" ], CdpPadrao() )
   /* De onde a lente veio: file/connection/global/default/request/session.
      A UI usa para dizer "herdado da conexao" e nao destacar o que nao mudou. */
   hRet[ "codepageOrigin" ] := iif( hb_HHasKey( hInfo, "codepageOrigin" ), ;
                                    hInfo[ "codepageOrigin" ], "default" )
   hRet[ "codepageHint" ] := CdpDoCabecalho( hInfo[ "path" ] )
   hRet[ "bytes" ]      := Max( 0, hb_FSize( hInfo[ "path" ] ) )

   /*
    * O memo anda junto e some junto; saber o nome dele importa quando falta.
    *
    * Nao existe DBI_ que devolva o CAMINHO do memo -- so o handle (numero) e a
    * extensao. O nome se monta trocando a extensao do proprio DBF, que e como o
    * RDD o acha: mesma pasta, mesmo nome, extensao do DBI_MEMOEXT (.DBT no NTX,
    * .FPT no CDX).
    */
   IF hRet[ "hasMemo" ]
      cMemo := hb_FNameExtSet( hInfo[ "path" ], dbInfo( DBI_MEMOEXT ) )
      hRet[ "memoFile" ]  := hb_FNameNameExt( cMemo )
      hRet[ "memoBytes" ] := Max( 0, hb_FSize( cMemo ) )
   ENDIF
   hRet[ "deleted" ]    := Deleted()
   hRet[ "bof" ]        := Bof()
   hRet[ "eof" ]        := Eof()
   hRet[ "indexes" ]    := hInfo[ "indexes" ]
   hRet[ "visible" ]    := Visiveis( hInfo )   /* colunas escolhidas; {} = todas */
   hRet[ "orders" ]     := EstadoIndices( cH )[ "indexes" ]   /* indices abertos (T5) */
   hRet[ "order" ]      := IndexOrd()
   /* dbFilter() e a verdade -- hInfo["filter"] e so o texto que guardamos para
      persistir. Ler da work area evita os dois divergirem. */
   hRet[ "filter" ]     := dbFilter()

   IF hb_defaultValue( lWithFields, .F. )
      hRet[ "fields" ] := AreaStructure()
   ENDIF

   dbSelectArea( nOld )

   RETURN hRet


/*
 * file.reopen {"h":"h7","exclusive":true} -- troca o modo de abertura.
 *
 * A SEQUENCIA E A R6 de docs/10-integridade.md, e cada falha tem tratamento
 * proprio porque elas nao sao equivalentes.
 *
 *   1. fotografa o ambiente (rebind.prg)
 *   2. dbCloseArea()
 *   3. reabre no modo pedido
 *      falhou -> tenta VOLTAR ao modo anterior imediatamente
 *                conseguiu -> religa e recusa. NADA foi perdido.
 *                falhou    -> `detached`. A aba fica na tela, marcada.
 *   4. religa indices, ordem, filtro e cursor
 *
 * ENTRE 2 E 3 EXISTE UMA JANELA. Qualquer processo da rede pode pegar o arquivo
 * ali. Nao da para fechar essa janela -- da para torna-la inofensiva, e e o que
 * o passo 3 faz: a recusa acontece antes de qualquer operacao destrutiva, entao
 * o pior caso e "nao consegui trocar o modo", nunca "perdi o arquivo do
 * usuario sem avisar".
 */
FUNCTION Api_File_Reopen( hP )

   LOCAL cH    := ParStr( hP, "h" )
   LOCAL lExcl := ParLog( hP, "exclusive", .F. )
   LOCAL xErro, hInfo, hEstado, cArq, cAlias, nWa

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hInfo  := SessHandle( cH )
   cArq   := hInfo[ "path" ]
   cAlias := hInfo[ "alias" ]

   /* Ja esta no modo pedido: nao mexe. Fechar e reabrir a toa seria abrir a
      janela por nada. */
   IF hInfo[ "exclusive" ] == lExcl
      RETURN Ok( FileState( cH, .F. ) )
   ENDIF

   hEstado := EstadoAntes( cH )

   dbCloseArea()

   nWa := AbreNaArea( cArq, cAlias, lExcl )

   IF nWa == 0
      /* Nao conseguiu o modo pedido. Volta ao anterior AGORA, antes que a
         janela cresca. */
      nWa := AbreNaArea( cArq, cAlias, hInfo[ "exclusive" ] )

      IF nWa == 0
         SessDetach( cH, "ERROR_REOPEN_FAILED" )
         RETURN Err( "ERROR_HANDLE_DETACHED", "could not reopen in either mode", "h", ;
                     { "handle" => cH, ;
                       "file"   => hb_FNameNameExt( cArq ), ;
                       "why"    => "ERROR_REOPEN_FAILED" } )
      ENDIF

      /* Voltou ao estado anterior: religa e recusa. Nada foi perdido. */
      SessReattach( cH, nWa, hInfo[ "exclusive" ] )
      Religar( hEstado )

      RETURN Err( iif( lExcl, "ERROR_CANNOT_LOCK_EXCLUSIVE", "ERROR_CANNOT_OPEN_SHARED" ), ;
                  "mode change refused", "h", ;
                  { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   SessReattach( cH, nWa, lExcl )

   RETURN Ok( { ;
      "state"        => FileState( cH, .F. ), ;
      "rebindErrors" => Religar( hEstado ) } )


/*
 * Abre o arquivo numa area nova e devolve o numero dela, ou 0 se nao deu.
 *
 * Nao levanta erro: quem chama precisa TENTAR e decidir, e um erro aqui viraria
 * um RECOVER no dispatcher -- que significa bug, e nao "o arquivo esta em uso".
 */
FUNCTION AbreNaArea( cArq, cAlias, lExcl )

   LOCAL nWa := 0

   /* O RECOVER nao reatribui: `nWa` ja nasce 0, e se o dbUseArea estourar a
      atribuicao nunca completou. Reatribuir era codigo morto (W0032). */
   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T., , cArq, cAlias, ! lExcl, .F. )
      nWa := Select()
   RECOVER
   END SEQUENCE

   RETURN nWa


/*
 * file.reconnect {"h":"h7"} -- tenta trazer de volta um handle perdido (R6).
 *
 * Existe porque quem estava segurando o arquivo pode ja ter soltado. Sem isto,
 * a unica saida seria fechar a aba e reabrir o arquivo -- perdendo colunas
 * escolhidas, filtro e posicao, que e punir o usuario por um problema que nao
 * foi dele.
 *
 * Reabre COMPARTILHADO, sempre: e o modo normal de trabalho, e quem quer
 * exclusivo pede por file.reopen. Reconectar tem de ser a operacao com maior
 * chance de dar certo, nao a mais ambiciosa.
 */
FUNCTION Api_File_Reconnect( hP )

   LOCAL cH := ParStr( hP, "h" )
   LOCAL hInfo := SessHandle( cH )
   LOCAL nWa

   IF hInfo == NIL
      RETURN Err( "ERROR_INVALID_HANDLE", "handle does not exist", "h", ;
                  { "handle" => hb_CStr( cH ) } )
   ENDIF

   IF ! SessDetached( cH )
      RETURN Ok( FileState( cH, .F. ) )      /* ja esta ligado */
   ENDIF

   IF ! hb_FileExists( hInfo[ "path" ] )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "file no longer exists", "h", ;
                  { "file" => hb_FNameNameExt( hInfo[ "path" ] ) } )
   ENDIF

   nWa := AbreNaArea( hInfo[ "path" ], hInfo[ "alias" ], .F. )

   IF nWa == 0
      RETURN Err( "ERROR_CANNOT_OPEN_SHARED", "still held by another program", "h", ;
                  { "file" => hb_FNameNameExt( hInfo[ "path" ] ) } )
   ENDIF

   SessReattach( cH, nWa, .F. )

   RETURN Ok( FileState( cH, .F. ) )


/*
 * file.reopenslow {"h":"h7","exclusive":true,"hold":15} -- o file.reopen com a
 * janela ALARGADA de proposito.
 *
 * POR QUE EXISTE
 *
 * O ramo irrecuperavel da R6 -- reabrir falha nos DOIS modos -- depende de
 * alguem tomar o arquivo dentro da janela entre o dbCloseArea() e o
 * dbUseArea(). Essa janela dura milissegundos: nao da para vence-la de fora com
 * confiabilidade, e "tentei varias vezes e uma pegou" nao e teste.
 *
 * Aqui a janela vira segundos, e uma PESSOA consegue agir: abrir o mesmo
 * arquivo no DBU original com /E, ou em qualquer programa que peca exclusivo.
 * O caminho de codigo e o mesmo do file.reopen -- o que muda e so o tempo de
 * espera no meio. Nao e simulacao: e a corrida de verdade, em camera lenta.
 *
 * `hold` tem teto de 60 s. A thread da VM e uma so, entao esperar aqui congela
 * o app inteiro -- o que e aceitavel num gancho de diagnostico e nao seria em
 * mais nada.
 */
FUNCTION Api_File_Reopenslow( hP )

   LOCAL cH     := ParStr( hP, "h" )
   LOCAL lExcl  := ParLog( hP, "exclusive", .T. )
   LOCAL nEspera := ParNum( hP, "hold", 10 )
   LOCAL xErro, hInfo, hEstado, cArq, cAlias, nWa

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   nEspera := Max( 1, Min( nEspera, 60 ) )

   hInfo   := SessHandle( cH )
   cArq    := hInfo[ "path" ]
   cAlias  := hInfo[ "alias" ]
   hEstado := EstadoAntes( cH )

   dbCloseArea()

   /* ---- A JANELA, aberta de par em par ---- */
   hb_idleSleep( nEspera )

   nWa := AbreNaArea( cArq, cAlias, lExcl )

   IF nWa == 0
      nWa := AbreNaArea( cArq, cAlias, hInfo[ "exclusive" ] )

      IF nWa == 0
         SessDetach( cH, "ERROR_REOPEN_FAILED" )
         RETURN Err( "ERROR_HANDLE_DETACHED", "could not reopen in either mode", "h", ;
                     { "handle" => cH, ;
                       "file"   => hb_FNameNameExt( cArq ), ;
                       "why"    => "ERROR_REOPEN_FAILED" } )
      ENDIF

      SessReattach( cH, nWa, hInfo[ "exclusive" ] )
      Religar( hEstado )

      RETURN Err( iif( lExcl, "ERROR_CANNOT_LOCK_EXCLUSIVE", "ERROR_CANNOT_OPEN_SHARED" ), ;
                  "mode change refused", "h", { "file" => hb_FNameNameExt( cArq ) } )
   ENDIF

   SessReattach( cH, nWa, lExcl )

   RETURN Ok( { "state" => FileState( cH, .F. ), ;
                "rebindErrors" => Religar( hEstado ) } )
