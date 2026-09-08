/*
 * api_session.prg - session introspection and persistence.
 *
 * TWO DIFFERENT THINGS, on purpose:
 *
 *   session.state   what the DLL HAS IN MEMORY RIGHT NOW.
 *                   Read-only, no side effects. The front end can be rebuilt
 *                   from this alone -- if the UI breaks, reloads or loses its
 *                   own state, one call repaints everything without reopening
 *                   a single file. The DLL is the source of truth.
 *
 *   session.save/load   what the user had arranged, persisted to disk so work
 *                   can continue in the next run. Survives the process.
 *
 * Files, one owner each -- so there are never two writers in the same place:
 *   .qdbu/session.json      this module (panel, tree, tabs)
 *   .qdbu/connections.json  api_workspace
 *   .qdbu/window.json       the Rust side (position, size, maximized)
 */

#include "dbinfo.ch"
#include "set.ch"
#include "dbstruct.ch"

#define SESSION_FILE  "session.json"

/* ------------------------------------------------------------------ state */

/*
 * session.state -> everything the DLL holds right now.
 *
 * This is the "what do you have in there?" call. It exists so the front end
 * never has to keep a parallel copy of the truth: on boot, after a reload, or
 * whenever `rev` diverges, it asks and repaints.
 *
 * Includes closed handles on purpose: they explain why a handle stopped
 * working, which turns a mysterious failure into a readable message.
 */
FUNCTION Api_Session_State( hP )

   LOCAL aFiles := {}
   LOCAL aClosed := {}
   LOCAL aConn := {}
   LOCAL hInfo, hCon

   HB_SYMBOL_UNUSED( hP )

   FOR EACH hCon IN Connections()
      /* Mesmo resumo do workspace.list -- ver ConexaoResumo em
         api_workspace.prg. A tela le a lista pelas duas vias. */
      AAdd( aConn, ConexaoResumo( hCon ) )
   NEXT

   FOR EACH hInfo IN SessOpenFiles()
      /*
       * Handle perdido (R6) nao passa pelo FileState: ele nao tem work area --
       * `wa` e 0 --, e o FileState comeca selecionando a area. O que a tela
       * precisa aqui e outra coisa: o nome do arquivo, o estado, e o motivo,
       * para poder marcar a aba e oferecer Reconectar.
       */
      IF SessDetached( hInfo[ "h" ] )
         AAdd( aFiles, { ;
            "h"           => hInfo[ "h" ], ;
            "path"        => hInfo[ "path" ], ;
            "file"        => hb_FNameNameExt( hInfo[ "path" ] ), ;
            "alias"       => hInfo[ "alias" ], ;
            "connection"  => hInfo[ "connection" ], ;
            "detached"    => .T., ;
            "detachedWhy" => hInfo[ "detachedWhy" ] } )
      ELSE
         AAdd( aFiles, FileState( hInfo[ "h" ], .F. ) )
      ENDIF
   NEXT

   FOR EACH hInfo IN SessClosedFiles()
      AAdd( aClosed, { ;
         "h"        => hInfo[ "h" ], ;
         "path"     => hInfo[ "path" ], ;
         "alias"    => hInfo[ "alias" ], ;
         "closedIn" => hInfo[ "closedIn" ] } )
   NEXT

   RETURN Ok( { ;
      "rev"         => SessRev(), ;
      "connections" => aConn, ;
      "files"       => aFiles, ;
      "closed"      => aClosed, ;
      "ui"          => ReadUi() } )

/*
 * session.deleted {"show":false} -> liga/desliga SET DELETED.
 *
 * IDIOMA DO xBASE, e nao uma opcao por operacao: `SET DELETED ON` faz o proprio
 * dbSkip() pular os registros marcados, entao grade, contagem, busca, filtro e
 * exportacao passam a concordar sem que nenhuma delas precise saber da regra.
 *
 * Sem parametro, so relata. O padrao do Harbour e OFF -- registro marcado
 * aparece, tachado na grade -- e isso e o certo para uma ferramenta de
 * manutencao: quem abre o QDBU quer justamente ver o que esta marcado.
 */
FUNCTION Api_Session_Deleted( hP )

   LOCAL lAtual := Set( _SET_DELETED )

   IF HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "show" ) .AND. ;
      HB_ISLOGICAL( hP[ "show" ] )

      /* `show` e o inverso de DELETED: mostrar os marcados = DELETED OFF. Falar
         em "mostrar" evita a dupla negacao de "deleted = false". */
      Set( _SET_DELETED, ! hP[ "show" ] )
      SessBump()
   ENDIF

   RETURN Ok( { "show" => ! Set( _SET_DELETED ), ;
                "wasShowing" => ! lAtual } )

/* -------------------------------------------------------------- persistence */

/*
 * session.save {"panelWidth":320,"expanded":["base01"],
 *               "openFiles":[{"path":"...","connection":"..."}],
 *               "activeTab":"J:\\bases\\base01\\NETEST.DBF"}
 *
 * Stores PATH, not handle: a handle belongs to the live session and does not
 * survive shutdown. On the way back the files are reopened and get new handles.
 */
FUNCTION Api_Session_Save( hP )

   LOCAL hState := { => }

   IF ! HB_ISHASH( hP )
      RETURN Err( "ERROR_PARAM_REQUIRED", "session state is required", "state", ;
                  { "param" => "state" } )
   ENDIF

   hb_HKeepOrder( hState, .T. )
   hState[ "version" ]    := 1
   hState[ "panelWidth" ] := ParNum( hP, "panelWidth", 320 )
   hState[ "expanded" ]   := ParArr( hP, "expanded" )
   hState[ "openFiles" ]  := ParArr( hP, "openFiles" )
   hState[ "activeTab" ]  := ParStr( hP, "activeTab" )
   hState[ "tabOrder" ]   := ParArr( hP, "tabOrder" )
   hState[ "pageSize" ]   := ParNum( hP, "pageSize", 200 )

   hb_MemoWrit( SessionFile(), hb_jsonEncode( hState, .T. ) )

   RETURN Ok( { "saved" => .T. } )

/*
 * session.load -> the stored arrangement, or defaults.
 *
 * Reopens nothing: it only reports what was noted. The UI decides what to
 * reopen, file by file, so it can report which one vanished instead of failing
 * as a block.
 */
FUNCTION Api_Session_Load( hP )

   HB_SYMBOL_UNUSED( hP )

   RETURN Ok( ReadUi() )

/* session.forget -- start clean next time */
FUNCTION Api_Session_Forget( hP )

   HB_SYMBOL_UNUSED( hP )

   FErase( SessionFile() )

   RETURN Ok( { "forgotten" => .T. } )

/* ------------------------------------------------------------------ helpers */

STATIC FUNCTION Defaults()
   RETURN { "panelWidth" => 320, "expanded" => {}, "openFiles" => {}, ;
            "activeTab" => "", "tabOrder" => {}, "pageSize" => 200 }

/* Reads the saved arrangement. A corrupt file must never stop the app. */
STATIC FUNCTION ReadUi()

   LOCAL cJson := hb_MemoRead( SessionFile() )
   LOCAL xRead

   IF Empty( cJson )
      RETURN Defaults()
   ENDIF

   IF hb_jsonDecode( cJson, @xRead ) == 0 .OR. ! HB_ISHASH( xRead )
      RETURN Defaults()
   ENDIF

   RETURN { ;
      "panelWidth" => iif( hb_HHasKey( xRead, "panelWidth" ) .AND. HB_ISNUMERIC( xRead[ "panelWidth" ] ), ;
                           xRead[ "panelWidth" ], 320 ), ;
      "expanded"   => iif( hb_HHasKey( xRead, "expanded" ) .AND. HB_ISARRAY( xRead[ "expanded" ] ), ;
                           xRead[ "expanded" ], {} ), ;
      "openFiles"  => iif( hb_HHasKey( xRead, "openFiles" ) .AND. HB_ISARRAY( xRead[ "openFiles" ] ), ;
                           xRead[ "openFiles" ], {} ), ;
      "activeTab"  => iif( hb_HHasKey( xRead, "activeTab" ) .AND. HB_ISSTRING( xRead[ "activeTab" ] ), ;
                           xRead[ "activeTab" ], "" ), ;
      "tabOrder"   => iif( hb_HHasKey( xRead, "tabOrder" ) .AND. HB_ISARRAY( xRead[ "tabOrder" ] ), ;
                           xRead[ "tabOrder" ], {} ), ;
      "pageSize"   => iif( hb_HHasKey( xRead, "pageSize" ) .AND. HB_ISNUMERIC( xRead[ "pageSize" ] ), ;
                           xRead[ "pageSize" ], 200 ) }

STATIC FUNCTION ParStr( hP, cKey )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cKey )
      RETURN ""
   ENDIF

   RETURN iif( HB_ISSTRING( hP[ cKey ] ), hP[ cKey ], "" )

STATIC FUNCTION ParNum( hP, cKey, nDefault )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cKey )
      RETURN nDefault
   ENDIF

   RETURN iif( HB_ISNUMERIC( hP[ cKey ] ), hP[ cKey ], nDefault )

STATIC FUNCTION ParArr( hP, cKey )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cKey )
      RETURN {}
   ENDIF

   RETURN iif( HB_ISARRAY( hP[ cKey ] ), hP[ cKey ], {} )

STATIC FUNCTION SessionFile()

   LOCAL cDir := DirConfigQDbu()

   IF ! hb_DirExists( cDir )
      hb_DirBuild( cDir )
   ENDIF

   RETURN hb_DirSepAdd( cDir ) + SESSION_FILE
