/*
 * api_log.prg - ler o log de operacoes.
 *
 * Quem ESCREVE e util/log.prg, chamado do dispatcher. Aqui so se le.
 *
 * O arquivo e JSONL: uma operacao por linha. Ler e devolver linha a linha, ja
 * decodificadas, poupa o lado JS de conhecer o formato -- e deixa a porta
 * aberta para trocar o formato um dia sem mexer na tela.
 */

#include "directry.ch"

#define LOG_MAX_LINHAS   2000

/*
 * log.days -> os dias que existem, do mais recente para o mais antigo.
 *
 * So os nomes: um dia movimentado tem milhares de linhas, e a tela precisa
 * primeiro saber QUAIS dias existem para depois pedir um.
 */
FUNCTION Api_Log_Days( hP )

   LOCAL aArq, aRet := {}, aItem, cNome

   HB_SYMBOL_UNUSED( hP )

   aArq := Directory( hb_DirSepAdd( DirLog() ) + "*.jsonl" )

   FOR EACH aItem IN aArq
      cNome := aItem[ F_NAME ]
      AAdd( aRet, { ;
         "dia"     => hb_FNameName( cNome ), ;   /* AAAAMMDD, como no nome */
         "bytes"   => aItem[ F_SIZE ], ;
         "arquivo" => cNome } )
   NEXT

   /* Mais recente primeiro: o nome e AAAAMMDD, entao ordem alfabetica decrescente
      e ordem cronologica decrescente -- sem precisar converter para data. */
   ASort( aRet, , , {| x, y | x[ "dia" ] > y[ "dia" ] } )

   RETURN Ok( { "days" => aRet, "dir" => DirLog() } )

/*
 * log.read {"day":"20260901","filter":"NETCLI","max":500} -> as linhas do dia.
 *
 * `filter` e busca simples de texto na linha crua, antes de decodificar: quem
 * procura "NETCLI" quer as linhas que citam NETCLI em qualquer campo, e nao
 * escolher em qual. Achar primeiro e decodificar depois tambem evita decodificar
 * milhares de linhas que serao descartadas.
 *
 * Devolve as MAIS RECENTES: um dia de trabalho tem centenas de operacoes e o que
 * interessa quase sempre e o fim do arquivo. Por isso `truncated` diz quando
 * ficou coisa para tras -- numero incompleto sem aviso e o que faz alguem
 * concluir errado.
 */
FUNCTION Api_Log_Read( hP )

   LOCAL cDia := ParStr( hP, "day" )
   LOCAL cBusca := Upper( AllTrim( ParStr( hP, "filter" ) ) )
   LOCAL nMax := ParNum( hP, "max", LOG_MAX_LINHAS )
   LOCAL cArq, cTexto, aLinhas, aRet := {}, cLinha, hLinha, i, nAchadas

   IF Empty( cDia )
      RETURN Err( "ERROR_PARAM_REQUIRED", "day is required", "day", ;
                  { "param" => "day" } )
   ENDIF

   nMax := Max( 1, Min( nMax, LOG_MAX_LINHAS ) )

   cArq := hb_DirSepAdd( DirLog() ) + cDia + ".jsonl"

   /* Codigo proprio, e nao ERROR_FILE_NOT_FOUND: o dia pedido nao e um arquivo
      que o usuario escolheu -- ele veio da lista que o proprio log.days deu. A
      frase "o arquivo '20260830' nao existe" mandaria procurar um arquivo com
      esse nome, que nunca existiu. Este dia so nao tem operacao registrada. */
   IF ! hb_FileExists( cArq )
      RETURN Err( "ERROR_LOG_DAY_NOT_FOUND", "no log for this day", "day", ;
                  { "day" => cDia } )
   ENDIF

   cTexto := hb_MemoRead( cArq )
   aLinhas := hb_ATokens( StrTran( cTexto, Chr( 13 ), "" ), Chr( 10 ) )

   nAchadas := 0

   /* De tras para frente: as ultimas sao as que interessam, e parar em nMax
      evita percorrer o arquivo inteiro num dia com milhares de linhas. */
   FOR i := Len( aLinhas ) TO 1 STEP -1
      cLinha := aLinhas[ i ]
      IF Empty( cLinha )
         LOOP
      ENDIF
      IF ! Empty( cBusca ) .AND. ! ( cBusca $ Upper( cLinha ) )
         LOOP
      ENDIF

      nAchadas++
      IF Len( aRet ) >= nMax
         LOOP   /* segue contando, para poder dizer quanto ficou de fora */
      ENDIF

      hLinha := NIL
      /* O arquivo esta em UTF-8 (ver LogOp); o resto da DLL fala CP850. */
      IF hb_jsonDecode( DeUtf8( cLinha ), @hLinha ) != 0 .AND. HB_ISHASH( hLinha )
         AAdd( aRet, hLinha )
      ENDIF
   NEXT

   RETURN Ok( { ;
      "day"       => cDia, ;
      "lines"     => aRet, ;
      "found"     => nAchadas, ;
      "truncated" => nAchadas > Len( aRet ), ;
      "path"      => cArq } )

/* ------------------------------------------------------------------ helpers
 *
 * Copias locais, como em todo api_*.prg. Sao STATIC de proposito: sao tres
 * linhas cada, e uma versao publica compartilhada criaria acoplamento entre
 * modulos que hoje nao se conhecem -- pelo custo de nao repetir seis linhas.
 */

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
