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

/* Numerico do envelope, com padrao. STATIC como em cada api_*.prg: o custo de
   repetir sete linhas e menor que o de um util global que todo modulo importa. */
STATIC FUNCTION ParNum( hP, cChave, nPadrao )

   IF ! HB_ISHASH( hP ) .OR. ! hb_HHasKey( hP, cChave )
      RETURN nPadrao
   ENDIF

   RETURN iif( HB_ISNUMERIC( hP[ cChave ] ), hP[ cChave ], nPadrao )

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

/*
 * meta.slowjob {"seconds":5,"steps":50} -- uma tarefa lenta DE MENTIRA.
 *
 * POR QUE ISTO EXISTE
 *
 * A barra de progresso e o botao de cancelar nao tinham como ser observados. As
 * operacoes reais sao rapidas demais nesta maquina: contar 421.714 registros com
 * !Deleted() leva 40 ms, e criar o indice sobre os mesmos 421.714 leva 95 ms --
 * ambos abaixo do pulso de 120 ms com que a UI consulta o andamento. A barra
 * nunca chegava a ser pintada, entao nao havia como afirmar que ela funciona,
 * nem como testar o cancelamento sem inventar um arquivo gigante.
 *
 * Este job nao le nem escreve nada: so dorme em fatias, reportando progresso e
 * consultando o cancelamento entre uma fatia e outra -- exatamente o formato que
 * a R1 de docs/10-integridade.md exige de toda rotina longa. E o cancelamento
 * nao "para o sono": ele e conferido ENTRE as fatias, que e o unico ponto onde
 * uma operacao real estaria consistente.
 *
 * Fica no binario de producao de proposito. Nao toca em dado, o teto de 30 s
 * limita o estrago de um chamador desastrado, e ter como provar a barra numa
 * maquina de cliente vale mais que a linha de codigo que ela custa. T13 e T14
 * vao precisar dele para testar cancelamento sem arriscar arquivo de verdade.
 *
 * hb_idleSleep() e nao um laco ocupado: um laco de espera ocupada nesta thread
 * comeria um nucleo inteiro durante o teste e mediria o escalonador, nao a
 * barra.
 */
FUNCTION Api_Meta_Slowjob( hP )

   LOCAL nSeg    := ParNum( hP, "seconds", 5 )
   LOCAL nPassos := ParNum( hP, "steps", 50 )
   LOCAL nFeitos := 0
   LOCAL lParou  := .F.
   LOCAL nFatia, i

   /* Teto: a thread da VM e uma so, entao um `seconds` grande congelaria o app
      inteiro -- e nao so esta chamada. Ver o Risco 5 do plano. */
   nSeg    := Max( 0.1, Min( nSeg, 30 ) )
   nPassos := Max( 1, Min( Int( nPassos ), 1000 ) )
   nFatia  := nSeg / nPassos

   Dbu_JobBegin( JobMsg( "UI_JOB_SIMULATING" ), nPassos )

   FOR i := 1 TO nPassos
      hb_idleSleep( nFatia )
      nFeitos := i
      Dbu_Progress( i )

      /* Entre fatias, nunca no meio: e onde uma operacao real estaria com o
         registro completo. R1 de docs/10-integridade.md. */
      IF Dbu_Canceled()
         lParou := .T.
         EXIT
      ENDIF
   NEXT

   Dbu_JobEnd()

   RETURN Ok( { ;
      "seconds"  => nSeg, ;
      "steps"    => nPassos, ;
      "done"     => nFeitos, ;
      "canceled" => lParou } )
