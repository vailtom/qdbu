/*
 * api_meta.prg - funcoes de servico: identidade, versao, saude.
 *
 * Estas aceitam OS DOIS modos de chamada:
 *   cru       Api_Meta_Ping("dbu")                    -> string
 *   envelope  {"method":"meta.ping","params":{"msg":"dbu"}} -> JSON
 *
 * O modo cru existe porque o cliente C (tests/testload.c) e o --selftest
 * exercitam a ponte sem montar envelope -- e e bom que o teste mais basico da
 * ponte nao dependa da camada de roteamento.
 */

/* Extrai um parametro aceitando hash (envelope) ou string (cru). */
STATIC FUNCTION Arg( x, cChave )

   IF HB_ISHASH( x )
      RETURN iif( hb_HHasKey( x, cChave ) .AND. HB_ISSTRING( x[ cChave ] ), ;
                  x[ cChave ], "" )
   ENDIF

   RETURN iif( HB_ISSTRING( x ), x, "" )

FUNCTION Api_Meta_Ping( xArg )
   RETURN "pong:" + Arg( xArg, "msg" )

FUNCTION Api_Meta_Version( xArg )

   LOCAL hRet := { => }

   HB_SYMBOL_UNUSED( xArg )

   hRet[ "produto" ]  := "dbu-harbour"
   hRet[ "versao" ]   := "0.0.1"
   hRet[ "harbour" ]  := Version()
   hRet[ "compiler" ] := hb_Compiler()
   hRet[ "build" ]    := hb_BuildDate()

   /* Versao da libxlsxwriter linkada. Serve de diagnostico: se a exportacao
      XLSX falhar, a primeira pergunta e se a lib esta mesmo no binario -- e
      esta linha responde sem precisar exportar nada. */
   hRet[ "xlsx" ] := VersaoXlsx()

   RETURN hb_jsonEncode( hRet )

/* "" quando a lib nao esta linkada, em vez de derrubar o meta.version. */
STATIC FUNCTION VersaoXlsx()

   LOCAL cVer, oXls

   /* RETURN de dentro de BEGIN SEQUENCE nao compila no Harbour (E0025):
      a saida tem de ser depois do END SEQUENCE. */
   BEGIN SEQUENCE WITH {| e | Break( e ) }
      oXls := THbXlsxWriter()
      cVer := oXls:LibVersion()
   RECOVER
      cVer := ""
   END SEQUENCE

   RETURN hb_defaultValue( cVer, "" )

/* Devolve o argumento intacto. Existe para o selftest exercitar o protocolo de
   buffer (respostas maiores que o buffer inicial) e o round-trip UTF-8. */
FUNCTION Api_Meta_Echo( xArg )
   RETURN Arg( xArg, "texto" )
