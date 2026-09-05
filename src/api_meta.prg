/*
 * api_meta.prg - funcoes de servico: identidade, versao, saude.
 *
 * Estas aceitam OS DOIS modos de chamada:
 *   cru       Api_Meta_Ping("qdbu")                    -> string
 *   envelope  {"method":"meta.ping","params":{"msg":"qdbu"}} -> JSON
 *
 * O modo cru existe porque o cliente C (tests/testload.c) e o --selftest
 * exercitam a ponte sem montar envelope -- e e bom que o teste mais basico da
 * ponte nao dependa da camada de roteamento.
 */
#include "backup.ch"

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
/*
 * meta.codepages -> { "codepages":[{"id":"PT850","cp":850},...], "default":"PT850" }
 *
 * A lista que a tela mostra no seletor de codepage por arquivo. Vem filtrada
 * pelo que linkou (ver CodepagesDisponiveis em util/cdp.prg); a UI casa cada
 * id com o rotulo traduzido UI_CDP_<id>.
 */
FUNCTION Api_Meta_Codepages( hP )

   HB_SYMBOL_UNUSED( hP )

   /* Ok() e nao hb_jsonEncode: via envelope, o dispatcher embrulha o retorno.
      Uma string crua viraria `result:"{...}"` (texto), e a UI leria result.codepages
      como indefinido. As demais Api_* de dados fazem igual. */
   RETURN Ok( { ;
      "codepages" => CodepagesDisponiveis(), ;
      "default"   => CdpPadrao() } )

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
 * a R1 de as regras de integridade exige de toda rotina longa. E o cancelamento
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

   QDbu_JobBegin( JobMsg( "UI_JOB_SIMULATING" ), nPassos )

   FOR i := 1 TO nPassos
      hb_idleSleep( nFatia )
      nFeitos := i
      QDbu_Progress( i )

      /* Entre fatias, nunca no meio: e onde uma operacao real estaria com o
         registro completo. R1 de as regras de integridade. */
      IF QDbu_Canceled()
         lParou := .T.
         EXIT
      ENDIF
   NEXT

   QDbu_JobEnd()

   RETURN Ok( { ;
      "seconds"  => nSeg, ;
      "steps"    => nPassos, ;
      "done"     => nFeitos, ;
      "canceled" => lParou } )


/*
 * meta.rebindtest {"h":"h7"} -- exercita o ComEstadoPreservado com uma operacao
 * que nao faz nada.
 *
 * POR QUE ELE EXISTE
 *
 * A rotina de religar estado (src/util/rebind.prg) e o item que o plano marca
 * como o mais perigoso do checklist inteiro, e o sintoma de ela estar errada e
 * o pior que existe: a operacao "funciona" e a grade depois mostra dados
 * errados, sem nenhum erro na tela.
 *
 * Ela nasce ANTES das telas que a consomem (T10, T13, T14), entao nao ha
 * operacao destrutiva com que testa-la. Sem isto, a primeira vez que
 * desligar->religar rodasse seria em cima do arquivo de um cliente.
 *
 * A operacao aqui e um bloco vazio: desliga o ambiente, nao faz nada, religa. O
 * que se afirma e que ordem, filtro, indices e cursor voltam identicos -- se
 * nao voltam com uma operacao que nao mexeu em nada, nao vao voltar com um
 * PACK.
 *
 * `close` escolhe a forma: .F. e o caminho de PACK/ZAP (indices ficam abertos),
 * .T. e o de alterar estrutura (indices sao fechados e reabertos). As duas
 * precisam ser testadas porque sao caminhos diferentes.
 */
FUNCTION Api_Meta_Rebindtest( hP )

   LOCAL cH := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "h" ), hP[ "h" ], "" )
   LOCAL lFechar := HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "close" ) .AND. ;
                    HB_ISLOGICAL( hP[ "close" ] ) .AND. hP[ "close" ]
   LOCAL xErro, hRes, hAntes

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   hRes := ComEstadoPreservado( cH, {|| NIL }, lFechar )

   hAntes := hRes[ "before" ]

   /*
    * A comparacao e feita AQUI, e nao pelo chamador.
    *
    * O estado "antes" so existe dentro do ComEstadoPreservado, e sondar de fora
    * nao serve: `data.page` MOVE o ponteiro de registro (le a pagina e para
    * depois da ultima linha). A primeira versao deste teste fotografava com
    * data.page e media o proprio instrumento -- acusava o cursor "mudando" de
    * 25 para 26 quando quem o movera fora a sonda.
    */
   RETURN Ok( { ;
      "closedIndexes" => lFechar, ;
      "opError"       => iif( hRes[ "error" ] == NIL, "", ;
                              hRes[ "error" ][ "error" ][ "code" ] ), ;
      "rebindErrors"  => hRes[ "rebindErrors" ], ;
      "recnoBefore"   => hAntes[ "recno" ], ;
      "recnoAfter"    => RecNo(), ;
      "orderBefore"   => hAntes[ "order" ], ;
      "orderAfter"    => IndexOrd(), ;
      "filterBefore"  => hAntes[ "filter" ], ;
      "filterAfter"   => dbFilter(), ;
      "indexesBefore" => Len( hAntes[ "indexes" ] ), ;
      "indexesAfter"  => ordCount(), ;
      "keyDuplicated" => ChaveRepetida( hAntes[ "key" ] ), ;
      "restored"      => hAntes[ "recno" ] == RecNo() .AND. ;
                         hAntes[ "order" ] == IndexOrd() .AND. ;
                         hAntes[ "filter" ] == dbFilter() .AND. ;
                         Len( hAntes[ "indexes" ] ) == ordCount() } )

/*
 * A chave do registro corrente se repete no arquivo?
 *
 * Serve para o teste poder AFIRMAR que exercitou o caso dificil. Ancorar so
 * pela chave funciona por acidente quando a chave e unica; o defeito
 * (voltar noutro registro) so aparece quando ha homonimos, e em dado real eles
 * sempre existem -- em NETCLI, "VALE PRESENTE" aparece varias vezes.
 */
STATIC FUNCTION ChaveRepetida( xChave )

   LOCAL nGuarda := RecNo()
   LOCAL nQuantos := 0

   IF xChave == NIL .OR. IndexOrd() == 0
      RETURN .F.
   ENDIF

   IF dbSeek( xChave )
      DO WHILE ! Eof() .AND. ordKeyVal() == xChave .AND. nQuantos < 2
         nQuantos++
         dbSkip( 1 )
      ENDDO
   ENDIF

   dbGoTo( nGuarda )

   RETURN nQuantos > 1


/*
 * meta.detach {"h":"h7"} -- forca um handle ao estado `detached` (R6).
 *
 * POR QUE PRECISA EXISTIR
 *
 * O ramo irrecuperavel da R6 -- reabrir falha nos DOIS modos -- depende de
 * alguem tomar o arquivo dentro da janela de milissegundos entre o
 * dbCloseArea() e o dbUseArea(). E uma corrida que nao se vence de fora com
 * confiabilidade, e "testei umas vezes e uma delas pegou" nao e teste.
 *
 * O ramo RECUPERAVEL (nao consegui exclusivo, voltei ao compartilhado) e
 * testavel de verdade: basta outro processo abrir o arquivo em modo normal.
 * Esse tem teste real, e passa.
 *
 * Este gancho cobre o que sobra: o comportamento da TELA quando o estado
 * acontece -- grade descartada, aba marcada, motivo visivel, Reconectar
 * funcionando, aba ainda fechavel. Ele nao prova que o estado E ALCANCADO pela
 * corrida; prova o que o app faz quando ele acontece.
 *
 * Fecha a work area de verdade, e nao so marca a flag: um `detached` com a area
 * ainda aberta seria um estado que nunca existe na vida real, e o teste estaria
 * medindo uma ficcao.
 */
FUNCTION Api_Meta_Detach( hP )

   LOCAL cH := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "h" ), hP[ "h" ], "" )
   LOCAL xErro

   IF ( xErro := SessSelect( cH ) ) != NIL
      RETURN xErro
   ENDIF

   dbCloseArea()
   SessDetach( cH, "ERROR_REOPEN_FAILED" )

   RETURN Ok( { "h" => cH, "detached" => .T. } )


/*
 * meta.copyfile {"source":"...","dest":"...","block":1048576} -- exercita a
 * copia de bytes direto, sem passar pelo backup.
 *
 * POR QUE PRECISA EXISTIR
 *
 * A via de bytes so roda com o arquivo FORA da work area, e hoje nenhum fluxo
 * faz isso: quem fecha a area para operar e a T14, que ainda nao existe. Sem
 * este gancho a rotina seria codigo nao exercitado ate o dia em que rodasse
 * pela primeira vez em cima do arquivo de um cliente.
 *
 * Serve tambem para MEDIR o tamanho de bloco. A discussao sobre 64 KB, 1 MB ou
 * 10 MB nao se resolve por opiniao: o __CopyFile do Harbour usa 64 KB ha 25
 * anos, e o palpite contrario era de que bloco maior seria melhor. Com o
 * parametro exposto, mede-se.
 */
FUNCTION Api_Meta_Copyfile( hP )

   LOCAL cOrig  := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "source" ), hP[ "source" ], "" )
   LOCAL cDest  := iif( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "dest" ), hP[ "dest" ], "" )
   LOCAL nBloco := ParNum( hP, "block", 0 )
   LOCAL lExcl  := ! ( HB_ISHASH( hP ) .AND. hb_HHasKey( hP, "shared" ) .AND. hP[ "shared" ] == .T. )
   LOCAL nCopiados := 0
   LOCAL nInicio, xErro

   IF Empty( cOrig ) .OR. Empty( cDest )
      RETURN Err( "ERROR_PARAM_REQUIRED", "source and dest are required", , ;
                  { "param" => "source/dest" } )
   ENDIF

   cOrig := CaminhoOS( cOrig )
   cDest := CaminhoOS( cDest )

   IF ! hb_FileExists( cOrig )
      RETURN Err( "ERROR_FILE_NOT_FOUND", "source not found", "source", ;
                  { "file" => hb_FNameNameExt( cOrig ) } )
   ENDIF

   /* O bloco EFETIVO, e nao o pedido: CopiaArquivo() aplica piso e teto, e
      reportar o pedido faria a medicao mentir sobre o que rodou. */
   nBloco := iif( nBloco == 0, BLOCO_COPIA, ;
                  Max( 4096, Min( nBloco, 32 * 1024 * 1024 ) ) )

   nInicio := hb_MilliSeconds()
   xErro := CopiaArquivo( cOrig, cDest, nBloco, NIL, @nCopiados, lExcl )

   IF xErro != NIL
      RETURN xErro
   ENDIF

   RETURN Ok( { "source"    => hb_FNameNameExt( cOrig ), ;
                "dest"      => hb_FNameNameExt( cDest ), ;
                "block"     => nBloco, ;
                "exclusive" => lExcl, ;
                "bytes"     => nCopiados, ;
                "ms"        => hb_MilliSeconds() - nInicio } )
