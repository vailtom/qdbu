/*
 * progress.c - progresso e cancelamento de tarefa longa.
 *
 * A REGRA QUE DEFINE ESTE ARQUIVO: nada aqui toca a VM Harbour.
 *
 * Enquanto uma tarefa longa roda, a thread da VM esta ocupada dentro de um laco
 * PRG e nao aceita outra chamada -- e HbCall e sincrono. Se ler o progresso
 * exigisse a VM, so daria para le-lo depois que a tarefa terminasse, que e
 * exatamente quando ninguem precisa mais.
 *
 * Entao o estado vive aqui, em memoria C protegida por CRITICAL_SECTION, e os
 * dois exports novos podem ser chamados de QUALQUER thread, a qualquer momento.
 * O lado PRG escreve pelas HB_FUNC daqui (que rodam na thread da VM, dentro do
 * laco); o lado Rust le pelos exports __stdcall, de outra thread.
 *
 * O cancelamento anda no sentido contrario pelo mesmo caminho: HbCancel liga um
 * sinalizador e volta na hora, sem esperar a fila. Passar o cancelamento pela
 * fila de chamadas seria pedir para a tarefa parar usando o canal que a propria
 * tarefa esta bloqueando.
 */

#include "hbapi.h"
#include "hbapiitm.h"

#include <windows.h>
#include <string.h>

#define DBU_API   __declspec( dllexport )
#define DBU_MSG   256

static CRITICAL_SECTION s_cs;
static volatile LONG    s_lIniciado = 0;   /* CRITICAL_SECTION ja criada */
static volatile LONG    s_lCancelar = 0;   /* pedido de cancelamento */
static volatile LONG    s_lAtivo    = 0;   /* ha tarefa correndo */

static long s_nAtual = 0;
static long s_nTotal = 0;
static char s_szMsg[ DBU_MSG ] = "";

/*
 * Cria a CRITICAL_SECTION uma vez so.
 *
 * InterlockedCompareExchange em vez de "if( ! iniciado )": duas threads podem
 * chegar juntas -- a do Rust lendo progresso e a da VM comecando a tarefa -- e
 * duas InitializeCriticalSection sobre a mesma estrutura corrompem o lock.
 */
static void dbu_lock_init( void )
{
   if( InterlockedCompareExchange( &s_lIniciado, 1, 0 ) == 0 )
      InitializeCriticalSection( &s_cs );
   else
      while( s_lIniciado != 1 )   /* outra thread esta criando: espera */
         Sleep( 0 );
}

/* --------------------------------------------------------- lado Rust / C */

/*
 * HbProgressGet - le o progresso corrente. NAO toca a VM.
 *
 * Devolve 1 se ha tarefa ativa, 0 se nao. Todos os ponteiros sao opcionais.
 */
DBU_API int __stdcall HbProgressGet( char * pBuffer,
                                     int    nBufLen,
                                     int *  pnAtual,
                                     int *  pnTotal )
{
   int iAtivo;

   dbu_lock_init();
   EnterCriticalSection( &s_cs );

   if( pnAtual )
      *pnAtual = ( int ) s_nAtual;
   if( pnTotal )
      *pnTotal = ( int ) s_nTotal;

   if( pBuffer && nBufLen > 0 )
   {
      size_t n = strlen( s_szMsg );
      if( n > ( size_t ) nBufLen - 1 )
         n = ( size_t ) nBufLen - 1;
      memcpy( pBuffer, s_szMsg, n );
      pBuffer[ n ] = '\0';
   }

   iAtivo = ( int ) s_lAtivo;

   LeaveCriticalSection( &s_cs );

   return iAtivo;
}

/*
 * HbCancel - pede para a tarefa parar. NAO toca a VM, e volta na hora.
 *
 * Nao interrompe nada a forca: liga o sinalizador que o laco PRG consulta em
 * Dbu_Canceled(). Uma tarefa que nunca consulta nao para -- e isso e proposital,
 * porque abortar no meio de uma escrita deixaria o arquivo pela metade.
 */
DBU_API int __stdcall HbCancel( void )
{
   InterlockedExchange( &s_lCancelar, 1 );
   return 1;
}

/* --------------------------------------------------------------- lado PRG */

/*
 * Dbu_JobBegin( cMensagem, nTotal ) -- abre uma tarefa.
 *
 * Zera o pedido de cancelamento: um cancelamento que sobrasse da tarefa
 * anterior mataria esta antes do primeiro passo.
 */
HB_FUNC( DBU_JOBBEGIN )
{
   const char * pszMsg = hb_parc( 1 );

   dbu_lock_init();
   EnterCriticalSection( &s_cs );

   s_nAtual = 0;
   s_nTotal = hb_parnl( 2 );
   hb_strncpy( s_szMsg, pszMsg ? pszMsg : "", DBU_MSG - 1 );

   InterlockedExchange( &s_lCancelar, 0 );
   InterlockedExchange( &s_lAtivo, 1 );

   LeaveCriticalSection( &s_cs );
}

/* Dbu_Progress( nAtual, cMensagem ) -- avanca. cMensagem e opcional. */
HB_FUNC( DBU_PROGRESS )
{
   const char * pszMsg = hb_parc( 2 );

   dbu_lock_init();
   EnterCriticalSection( &s_cs );

   s_nAtual = hb_parnl( 1 );
   if( pszMsg )
      hb_strncpy( s_szMsg, pszMsg, DBU_MSG - 1 );

   LeaveCriticalSection( &s_cs );
}

/* Dbu_JobEnd() -- fecha a tarefa. */
HB_FUNC( DBU_JOBEND )
{
   dbu_lock_init();
   EnterCriticalSection( &s_cs );

   InterlockedExchange( &s_lAtivo, 0 );
   InterlockedExchange( &s_lCancelar, 0 );
   s_nAtual = 0;
   s_nTotal = 0;
   s_szMsg[ 0 ] = '\0';

   LeaveCriticalSection( &s_cs );
}

/*
 * Dbu_Canceled() -> .T. quando alguem pediu para parar.
 *
 * Sem lock de proposito: e leitura de um LONG alinhado, atomica no x86, e este
 * e o ponto mais chamado do laco -- entrar numa CRITICAL_SECTION a cada
 * registro custaria mais que o trabalho util.
 */
HB_FUNC( DBU_CANCELED )
{
   hb_retl( s_lCancelar != 0 );
}

/* Dbu_JobActive() -> .T. se ha tarefa aberta. Para diagnostico. */
HB_FUNC( DBU_JOBACTIVE )
{
   hb_retl( s_lAtivo != 0 );
}
