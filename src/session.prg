/*
 * session.prg - live session state.
 *
 * Harbour work areas ARE global per-thread state; there is no moving that to
 * the JS side, and re-establishing the environment on every call (reopen,
 * reindex, refilter per page) would be unworkable. So the state lives here.
 *
 * Since the DLL runs on a single thread (guaranteed by app/src-tauri/src/
 * qdbudll.rs), a STATIC is safe without any synchronization.
 *
 * THE WORK AREA IS THE TRUTH for recno, eof/bof, active order and compiled
 * filter. What lives here is only what Harbour cannot tell us: the handle map,
 * the filter source text, the selected field list, and the revision counter.
 */

STATIC s_nRev := 0
STATIC s_nHandleSeq := 0
STATIC s_hHandles                    /* "h7" => hash with the file data */
STATIC s_aConnections                /* registered work folders */

/* --------------------------------------------------------------- revision */

/*
 * Counter that rises on every mutation. Every response carries the current
 * value; the JS compares it with what it holds and, if it skipped, refetches
 * session.state. That is the whole cache invalidation, in one line.
 */
FUNCTION SessRev()
   RETURN s_nRev

FUNCTION SessBump()
   s_nRev++
   RETURN s_nRev

/* ---------------------------------------------------------------- handles */

STATIC FUNCTION Handles()
   IF s_hHandles == NIL
      s_hHandles := { => }
      hb_HKeepOrder( s_hHandles, .T. )
   ENDIF
   RETURN s_hHandles

/*
 * Registers an open file and returns its handle.
 *
 * The counter NEVER recycles: a handle from a closed file, if reused, yields a
 * refusal instead of silently hitting some other file.
 */
FUNCTION SessNewHandle( hData )

   LOCAL cH

   s_nHandleSeq++
   cH := "h" + hb_ntos( s_nHandleSeq )

   hData[ "h" ] := cH
   hData[ "open" ] := .T.
   Handles()[ cH ] := hData

   SessBump()

   RETURN cH

/* Handle data, or NIL when it never existed. */
FUNCTION SessHandle( cH )

   LOCAL h := Handles()

   IF ! HB_ISSTRING( cH ) .OR. ! hb_HHasKey( h, cH )
      RETURN NIL
   ENDIF

   RETURN h[ cH ]

/*
 * O TERCEIRO ESTADO: `detached`.
 *
 * `open` e normal; `closed` e o usuario tendo mandado fechar -- esperado, e a
 * mensagem cita o `closedIn`. Faltava o caso em que o APP fechou a area para
 * uma operacao exclusiva e NAO CONSEGUIU REABRIR: outro processo da rede pegou
 * o arquivo na janela entre o dbCloseArea() e o dbUseArea().
 *
 * Nao e erro passageiro nem foi pedido por ninguem: e um estado, e a aba
 * continua na tela. Sem distingui-lo, a UI mostraria as linhas de um arquivo
 * que nao esta mais aberto -- a falha silenciosa que docs/10-integridade.md
 * inteiro existe para impedir. Ver R6 la.
 *
 * Selects the handle's work area. THIS IS THE ISOLATION GUARANTEE: every Api_*
 * that takes a handle starts here, so no function depends on which area the
 * previous call happened to leave selected. That implicit dependency is exactly
 * what rotted the original DBU.
 *
 * Returns NIL when fine, or the ready-made refusal when the handle is bad.
 */
FUNCTION SessSelect( cH )

   LOCAL hInfo := SessHandle( cH )

   IF hInfo == NIL
      RETURN Err( "ERROR_INVALID_HANDLE", "handle does not exist", "h", ;
                  { "handle" => hb_CStr( cH ) } )
   ENDIF

   IF hb_HHasKey( hInfo, "detached" ) .AND. hInfo[ "detached" ]
      RETURN Err( "ERROR_HANDLE_DETACHED", "file was lost during an exclusive operation", ;
                  "h", { "handle" => cH, ;
                         "file"   => hb_FNameNameExt( hInfo[ "path" ] ), ;
                         "why"    => hInfo[ "detachedWhy" ] } )
   ENDIF

   IF ! hInfo[ "open" ]
      RETURN Err( "ERROR_HANDLE_CLOSED", "handle was closed", "h", ;
                  { "handle" => cH, "closedIn" => hInfo[ "closedIn" ] } )
   ENDIF

   dbSelectArea( hInfo[ "wa" ] )

   RETURN NIL

/* Marks as closed. The handle stays in the map, with the reason, so the error
   message can be useful instead of "unknown handle". */
FUNCTION SessClose( cH, cWhere )

   LOCAL hInfo := SessHandle( cH )

   IF hInfo == NIL
      RETURN .F.
   ENDIF

   hInfo[ "open" ] := .F.
   hInfo[ "closedIn" ] := hb_defaultValue( cWhere, "file.close" )

   /* Os codeblocks compilados para este handle nao servem mais a ninguem: o
      handle nunca e reciclado. Sem isto o cache so cresce numa sessao longa. */
   ExprEsquece( cH )

   SessBump()

   RETURN .T.

/* Open handles, in opening order. */
FUNCTION SessOpenFiles()

   LOCAL aRet := {}
   LOCAL h := Handles()
   LOCAL cH

   FOR EACH cH IN hb_HKeys( h )
      IF h[ cH ][ "open" ]
         AAdd( aRet, h[ cH ] )
      ENDIF
   NEXT

   RETURN aRet

/* Closed handles, for diagnostics (session.state). */
FUNCTION SessClosedFiles()

   LOCAL aRet := {}
   LOCAL h := Handles()
   LOCAL cH

   FOR EACH cH IN hb_HKeys( h )
      IF ! h[ cH ][ "open" ]
         AAdd( aRet, h[ cH ] )
      ENDIF
   NEXT

   RETURN aRet

/* ------------------------------------------------------------ connections */

FUNCTION SessConnections()
   IF s_aConnections == NIL
      s_aConnections := {}
   ENDIF
   RETURN s_aConnections

FUNCTION SessSetConnections( aCon )
   s_aConnections := aCon
   SessBump()
   RETURN aCon


/*
 * Marca o handle como perdido, com o motivo.
 *
 * `cPorque` e um CODIGO de traducao, nao uma frase: quem le a mensagem e a
 * mesma pessoa que escolheu o idioma. Ver R6 de docs/10-integridade.md.
 *
 * A workarea nao e fechada aqui -- ela ja nao existe, e por isso chegamos neste
 * estado. O handle fica no mapa, com o caminho, para a aba poder oferecer
 * "reconectar" e para a mensagem citar o arquivo pelo nome.
 */
FUNCTION SessDetach( cH, cPorque )

   LOCAL hInfo := SessHandle( cH )

   IF hInfo == NIL
      RETURN .F.
   ENDIF

   hInfo[ "detached" ] := .T.
   hInfo[ "detachedWhy" ] := hb_defaultValue( cPorque, "ERROR_REOPEN_FAILED" )
   hInfo[ "wa" ] := 0

   SessBump()

   RETURN .T.


/*
 * Devolve o handle ao normal, apontando para a workarea nova.
 *
 * Usado depois de fechar e reabrir a area -- seja na sequencia normal de uma
 * operacao exclusiva, seja num "reconectar" pedido pelo usuario. O HANDLE E O
 * MESMO: `h7` continua `h7`, porque a UI inteira o referencia. O que muda e a
 * area por tras dele.
 */
FUNCTION SessReattach( cH, nWa, lExclusivo )

   LOCAL hInfo := SessHandle( cH )

   IF hInfo == NIL
      RETURN .F.
   ENDIF

   hInfo[ "wa" ] := nWa
   hInfo[ "open" ] := .T.
   hInfo[ "detached" ] := .F.
   hInfo[ "detachedWhy" ] := ""

   IF HB_ISLOGICAL( lExclusivo )
      hInfo[ "exclusive" ] := lExclusivo
   ENDIF

   SessBump()

   RETURN .T.


/* O handle esta perdido? */
FUNCTION SessDetached( cH )

   LOCAL hInfo := SessHandle( cH )

   RETURN hInfo != NIL .AND. hb_HHasKey( hInfo, "detached" ) .AND. hInfo[ "detached" ]
