/*
 * api_workspace.prg - conexoes (pastas de trabalho) e listagem de arquivos.
 *
 * Modelo (ver o plano de entrega secao 1b):
 *   conexao = um diretorio com DBFs, nomeado. Todas visiveis numa arvore,
 *   sem limite e sem "trocar de pasta".
 *
 * O cadastro (nome + caminho) fica central, em <raiz>/.qdbu/connections.json.
 * Os perfis de visao ficam em <pasta do cliente>/.qdbu/perfis/, para acompanharem
 * backup e copia da pasta.
 */

#include "directry.ch"
#include "fileio.ch"

#define CONNECTIONS_FILE  "connections.json"

/* ---------------------------------------------------------------- listar */

/*
 * workspace.list -> as conexoes cadastradas.
 * Nao varre disco: so devolve o cadastro, com um flag dizendo se a pasta ainda
 * existe. Varrer aqui deixaria a abertura do app lenta com pasta em rede.
 */
FUNCTION Api_Workspace_List( hP )

   LOCAL aRet := {}
   LOCAL hCon

   HB_SYMBOL_UNUSED( hP )

   FOR EACH hCon IN Connections()
      AAdd( aRet, { ;
         "name"   => hCon[ "name" ], ;
         "dir"    => hCon[ "dir" ], ;
         "codepage" => iif( hb_HHasKey( hCon, "codepage" ), hCon[ "codepage" ], "" ), ;
         "readOnly"  => hb_HHasKey( hCon, "readOnly" ) .AND. hCon[ "readOnly" ], ;
         "exclusive" => hb_HHasKey( hCon, "exclusive" ) .AND. hCon[ "exclusive" ], ;
         "existe" => hb_DirExists( hCon[ "dir" ] ) } )
   NEXT

   RETURN Ok( { "connections" => aRet } )

/* ------------------------------------------------------------ adicionar */

/*
 * workspace.add {"name":"Cliente A","dir":"J:\\bases\\base03"}
 *
 * Recusa (nao "ERR:") quando: falta parametro, pasta nao existe, ou ja ha
 * conexao com o mesmo nome.
 */
FUNCTION Api_Workspace_Add( hP )

   LOCAL cName := Par( hP, "name" )
   LOCAL cDir  := Par( hP, "dir" )
   LOCAL cCdp  := Par( hP, "codepage" )
   LOCAL aCon, hCon

   IF Empty( cDir )
      RETURN Err( "ERROR_PARAM_REQUIRED", "connection folder is required", "dir", ;
                  { "param" => "dir" } )
   ENDIF

   cDir := hb_DirSepDel( CaminhoOS( cDir ) )

   IF ! hb_DirExists( cDir )
      RETURN Err( "ERROR_DIR_NOT_FOUND", "folder not found", "dir", { "dir" => cDir } )
   ENDIF

   /* sem nome, usa o da pasta -- e o que o usuario esperaria */
   IF Empty( cName )
      cName := FolderName( cDir )
   ENDIF

   aCon := Connections()

   IF AScan( aCon, {| h | Upper( h[ "name" ] ) == Upper( cName ) } ) > 0
      RETURN Err( "ERROR_CONNECTION_EXISTS", "a connection with this name exists", "name", ;
                  { "name" => cName } )
   ENDIF

   IF ! Empty( cCdp ) .AND. ! CdpValida( cCdp )
      RETURN Err( "ERROR_UNKNOWN_CODEPAGE", "unknown codepage", "codepage", ;
                  { "codepage" => cCdp } )
   ENDIF

   /*
    * O MODO DE ABERTURA E PROPRIEDADE DA CONEXAO, como o codepage.
    *
    * Uma pasta de producao de cliente marcada somente-leitura vale para TODO
    * arquivo aberto por ela, sem ninguem precisar lembrar de marcar a caixa a
    * cada abertura -- e esquecer uma vez e o que estraga o arquivo. Guardados
    * so quando LIGADOS: um `false` em cada conexao no connections.json faria
    * parecer que toda conexao decide sobre isso, e a esmagadora maioria nao
    * decide nada.
    */
   hCon := { "name" => cName, "dir" => cDir }
   IF ParLog( hP, "readOnly" )
      hCon[ "readOnly" ] := .T.
   ENDIF
   IF ParLog( hP, "exclusive" )
      hCon[ "exclusive" ] := .T.
   ENDIF
   IF ! Empty( cCdp )
      hCon[ "codepage" ] := cCdp
   ENDIF
   AAdd( aCon, hCon )
   SaveConnections( aCon )

   RETURN Ok( { "connection" => hCon } )

/*
 * workspace.update {"name":"Cliente A","codepage":"ESWIN"} -> { connection }
 *
 * Muda o codepage de uma conexao ja cadastrada (o nivel CONEXAO da cascata).
 * codepage vazio REMOVE a escolha -- a conexao volta a herdar do global.
 * Igual ao Navicat: a codepage e propriedade da conexao, editavel depois.
 */
FUNCTION Api_Workspace_Update( hP )

   LOCAL cName := Par( hP, "name" )
   LOCAL cCdp  := Par( hP, "codepage" )
   LOCAL aCon := Connections()
   LOCAL n, cChave

   IF Empty( cName )
      RETURN Err( "ERROR_PARAM_REQUIRED", "connection name is required", "name", ;
                  { "param" => "name" } )
   ENDIF

   IF ! Empty( cCdp ) .AND. ! CdpValida( cCdp )
      RETURN Err( "ERROR_UNKNOWN_CODEPAGE", "unknown codepage", "codepage", ;
                  { "codepage" => cCdp } )
   ENDIF

   n := AScan( aCon, {| h | Upper( h[ "name" ] ) == Upper( cName ) } )
   IF n == 0
      RETURN Err( "ERROR_CONNECTION_NOT_FOUND", "connection not found", "name", ;
                  { "name" => cName } )
   ENDIF

   IF Empty( cCdp )
      IF hb_HHasKey( aCon[ n ], "codepage" )
         hb_HDel( aCon[ n ], "codepage" )
      ENDIF
   ELSE
      aCon[ n ][ "codepage" ] := cCdp
   ENDIF

   /* Desligado SOME da conexao, em vez de virar `false`: o arquivo so guarda o
      que foi escolhido, e ausencia ja e o padrao. */
   FOR EACH cChave IN { "readOnly", "exclusive" }
      IF ParLog( hP, cChave )
         aCon[ n ][ cChave ] := .T.
      ELSEIF hb_HHasKey( aCon[ n ], cChave )
         hb_HDel( aCon[ n ], cChave )
      ENDIF
   NEXT

   SaveConnections( aCon )

   RETURN Ok( { "connection" => aCon[ n ] } )

/* workspace.remove {"name":"Cliente A"} */
FUNCTION Api_Workspace_Remove( hP )

   LOCAL cName := Par( hP, "name" )
   LOCAL aCon := Connections()
   LOCAL n

   IF Empty( cName )
      RETURN Err( "ERROR_PARAM_REQUIRED", "connection name is required", "name", ;
                  { "param" => "name" } )
   ENDIF

   n := AScan( aCon, {| h | Upper( h[ "name" ] ) == Upper( cName ) } )

   IF n == 0
      RETURN Err( "ERROR_CONNECTION_NOT_FOUND", "connection not found", "name", ;
                  { "name" => cName } )
   ENDIF

   hb_ADel( aCon, n, .T. )
   SaveConnections( aCon )

   RETURN Ok( { "removed" => cName } )

/* -------------------------------------------------------------- arquivos */

/*
 * workspace.files {"name":"Cliente A"} ou {"dir":"J:\\..."}
 *   -> os DBFs da pasta, com metadados.
 *
 * `registros` NAO vem aqui: contar exige abrir cada arquivo, e numa pasta com
 * dezenas de DBFs em rede isso trava a arvore. A contagem e sob demanda, por
 * workspace.count.
 */
FUNCTION Api_Workspace_Files( hP )

   LOCAL cDir := ConnectionDir( hP )
   LOCAL aDir, aItem, aRet := {}
   LOCAL cName, cPath, hHdr

   IF ! HB_ISSTRING( cDir )
      RETURN cDir            /* ja e uma recusa */
   ENDIF

   aDir := Directory( hb_DirSepAdd( cDir ) + "*.dbf" )

   FOR EACH aItem IN aDir
      cName := aItem[ F_NAME ]
      cPath := hb_DirSepAdd( cDir ) + cName
      hHdr := ReadHeader( cPath )
      AAdd( aRet, { ;
         "name"      => cName, ;
         "path"      => cPath, ;
         "size"      => aItem[ F_SIZE ], ;
         "date"      => DToS( aItem[ F_DATE ] ), ;
         "time"      => aItem[ F_TIME ], ;
         "valid"     => hHdr[ "valid" ], ;
         "reason"    => hHdr[ "reason" ], ;
         "fields"    => hHdr[ "fields" ], ;
         "memo"      => hHdr[ "memo" ], ;
         "indexes"   => IndexesOf( cDir, cName ) } )
   NEXT

   ASort( aRet,,, {| x, y | Upper( x[ "name" ] ) < Upper( y[ "name" ] ) } )

   RETURN Ok( { "dir" => cDir, "files" => aRet } )

/*
 * workspace.count {"caminho":"J:\\...\\NETCLI.DBF"}
 *   -> numero de registros, sob demanda.
 *
 * Le so o cabecalho do DBF (bytes 4..7, little-endian) em vez de abrir a
 * workarea: e instantaneo e nao mexe em nada que esteja aberto.
 */
FUNCTION Api_Workspace_Count( hP )

   LOCAL cArq := Par( hP, "path" )
   LOCAL hHdr

   IF Empty( cArq )
      RETURN Err( "ERROR_PARAM_REQUIRED", "file path is required", "path", ;
                  { "param" => "path" } )
   ENDIF

   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "file not found", "path", { "file" => cArq } )
   ENDIF

   hHdr := ReadHeader( cArq )

   IF ! hHdr[ "valid" ]
      RETURN Err( "ERROR_NOT_A_DBF", "not a valid DBF", "path", ;
                  { "file" => hb_FNameNameExt( cArq ), ;
                    "reason" => hHdr[ "reason" ] } )
   ENDIF

   RETURN Ok( { "path"      => cArq, ;
                "records" => hHdr[ "records" ], ;
                "fields"    => hHdr[ "fields" ], ;
                "recordSize" => hHdr[ "recordSize" ] } )

/*
 * Le e VALIDA o cabecalho de 32 bytes de um DBF.
 *
 * Validar nao e paranoia: na pasta de homologacao J:/bases/base01 ha 7
 * arquivos com extensao .DBF que sao INI/texto (assinatura 0x5B = '['). Confiar
 * cegamente nos bytes 4..7 faria a arvore anunciar "1.380.013.134 registros".
 *
 * Quatro checagens:
 *   1. assinatura conhecida do formato xBase
 *   2. tamanho do cabecalho e do registro plausiveis
 *   3. cabecalho + registros*tamanho bate com o tamanho real do arquivo
 *   4. le 32 bytes de verdade
 */
STATIC FUNCTION ReadHeader( cArq )

   LOCAL hFile, cBuf
   LOCAL nSig, nRegs, nHdr, nRec, nTam, nEsperado
   LOCAL hRet := { "valid" => .F., "reason" => "", "records" => 0, ;
                   "fields" => 0, "recordSize" => 0, "memo" => .F. }

   hFile := hb_vfOpen( cArq, FO_READ + FO_SHARED )

   IF hFile == NIL
      hRet[ "reason" ] := "nao foi possivel abrir para leitura"
      RETURN hRet
   ENDIF

   cBuf := Space( 32 )

   IF hb_vfRead( hFile, @cBuf, 32 ) < 32
      hb_vfClose( hFile )
      hRet[ "reason" ] := "menor que 32 bytes"
      RETURN hRet
   ENDIF

   hb_vfClose( hFile )

   nSig  := hb_BPeek( cBuf, 1 )
   nRegs := hb_BPeek( cBuf, 5 ) + hb_BPeek( cBuf, 6 ) * 256 + ;
            hb_BPeek( cBuf, 7 ) * 65536 + hb_BPeek( cBuf, 8 ) * 16777216
   nHdr  := hb_BPeek( cBuf, 9 )  + hb_BPeek( cBuf, 10 ) * 256
   nRec  := hb_BPeek( cBuf, 11 ) + hb_BPeek( cBuf, 12 ) * 256

   IF AScan( { 0x02, 0x03, 0x04, 0x05, 0x30, 0x31, 0x32, 0x43, 0x63, ;
               0x83, 0x8B, 0x8E, 0xB3, 0xCB, 0xE5, 0xF5, 0xFB }, nSig ) == 0
      hRet[ "reason" ] := "assinatura 0x" + hb_NumToHex( nSig, 2 ) + " nao e xBase"
      RETURN hRet
   ENDIF

   IF nHdr < 33 .OR. nRec < 1
      hRet[ "reason" ] := "cabecalho ou registro com tamanho impossivel"
      RETURN hRet
   ENDIF

   nTam := hb_FSize( cArq )
   nEsperado := nHdr + nRegs * nRec

   /* tolera lixo no fim (EOF marker, padding), mas nao ordem de grandeza errada */
   IF nRegs > 0 .AND. Abs( nEsperado - nTam ) > nRec + 8
      hRet[ "reason" ] := "cabecalho anuncia " + hb_ntos( nRegs ) + ;
                          " registros (" + hb_ntos( nEsperado ) + " bytes), " + ;
                          "mas o arquivo tem " + hb_ntos( nTam )
      RETURN hRet
   ENDIF

   hRet[ "valid" ]    := .T.
   hRet[ "records" ] := nRegs
   hRet[ "fields" ]    := Max( 0, Int( ( nHdr - 33 ) / 32 ) )
   hRet[ "recordSize" ] := nRec
   hRet[ "memo" ]      := hb_bitAnd( nSig, 0x80 ) != 0

   RETURN hRet

/* ---------------------------------------------------------------- apoio */

/* Como o Par(), mas para logico: chave ausente ou de outro tipo e .F. */
STATIC FUNCTION ParLog( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN .F.
   ENDIF

   RETURN HB_ISLOGICAL( hP[ cChave ] ) .AND. hP[ cChave ]

STATIC FUNCTION Par( hP, cChave )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cChave ] ), hP[ cChave ], "" )

/* Resolves the folder: accepts "name" (registered connection) or "dir". */
STATIC FUNCTION ConnectionDir( hP )

   LOCAL cName := Par( hP, "name" )
   LOCAL cDir  := Par( hP, "dir" )
   LOCAL n

   IF ! Empty( cName )
      n := AScan( Connections(), {| h | Upper( h[ "name" ] ) == Upper( cName ) } )
      IF n == 0
         RETURN Err( "ERROR_CONNECTION_NOT_FOUND", "connection not found", "name", ;
                     { "name" => cName } )
      ENDIF
      cDir := Connections()[ n ][ "dir" ]
   ENDIF

   IF Empty( cDir )
      RETURN Err( "ERROR_PARAM_REQUIRED", "connection name or dir is required", "name", ;
                  { "param" => "name" } )
   ENDIF

   cDir := hb_DirSepDel( CaminhoOS( cDir ) )

   IF ! hb_DirExists( cDir )
      RETURN Err( "ERROR_DIR_NOT_FOUND", "folder not found", "dir", { "dir" => cDir } )
   ENDIF

   RETURN cDir

STATIC FUNCTION FolderName( cDir )

   LOCAL c := hb_DirSepDel( cDir )
   LOCAL n := RAt( hb_ps(), c )

   RETURN iif( n > 0, SubStr( c, n + 1 ), c )

/* Indices com o mesmo nome-base do DBF, na mesma pasta. */
STATIC FUNCTION IndexesOf( cDir, cNameDbf )

   LOCAL cBase := hb_FNameName( cNameDbf )
   LOCAL aRet := {}
   LOCAL aItem

   FOR EACH aItem IN Directory( hb_DirSepAdd( cDir ) + cBase + ".ntx" )
      AAdd( aRet, aItem[ F_NAME ] )
   NEXT

   RETURN aRet

/* ------------------------------------------------------------ persistencia */

/* <raiz>/.qdbu/connections.json -- mesma convencao .qdbu/ das pastas de trabalho. */
STATIC FUNCTION ArqConnections()

   LOCAL cDir := DirConfigQDbu()

   IF ! hb_DirExists( cDir )
      hb_DirBuild( cDir )
   ENDIF

   RETURN hb_DirSepAdd( cDir ) + CONNECTIONS_FILE

/*
 * Registered connections, loading from disk on first use.
 *
 * PUBLIC because session.state also needs them: that call must report
 * everything the DLL has, and reading the file lazily would make the answer
 * depend on whether workspace.list happened to run first.
 */
FUNCTION Connections()

   LOCAL aCon := SessConnections()
   LOCAL cJson, xLido

   IF Len( aCon ) > 0
      RETURN aCon
   ENDIF

   cJson := hb_MemoRead( ArqConnections() )

   IF ! Empty( cJson )
      IF hb_jsonDecode( cJson, @xLido ) != 0 .AND. HB_ISARRAY( xLido )
         SessSetConnections( xLido )
         RETURN xLido
      ENDIF
   ENDIF

   RETURN aCon

STATIC FUNCTION SaveConnections( aCon )

   SessSetConnections( aCon )
   hb_MemoWrit( ArqConnections(), hb_jsonEncode( aCon, .T. ) )

   RETURN .T.
