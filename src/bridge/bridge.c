/*
 * bridge.c - ponte C entre o app Tauri (stdcall) e a VM Harbour.
 *
 * Exporta 3 funcoes:
 *   HbStart()  - inicializa a VM Harbour (1x, na thread que vai usar a DLL;
 *                devolve 0 se outra thread ja for a dona)
 *   HbStop()   - finaliza a VM (so a thread que iniciou)
 *   HbCall()   - despacha uma chamada para a funcao PRG DllDispatch()
 *
 * Convencao: __stdcall, strings UTF-8, buffer fornecido pelo chamador.
 */

#include "hbapi.h"
#include "hbapiitm.h"
#include "hbvm.h"
#include "hbstack.h"
#include "hbinit.h"

#include <windows.h>   /* GetCurrentThreadId -- ver o guarda de thread abaixo */
#include <string.h>

#define DBU_API __declspec( dllexport )

/* codigos de retorno */
#define DBU_ERR_NOTINIT   -1
#define DBU_ERR_NODISP    -2
#define DBU_ERR_BADARG    -3
#define DBU_ERR_TRUNC     -4
#define DBU_ERR_THREAD    -5

/*
 * A VM PERTENCE A UMA THREAD, e a partir daqui isto e verificado.
 *
 * `s_fInit` sozinho e do PROCESSO. Uma segunda thread que chamasse HbStart
 * recebia 1 -- "deu certo" -- sem que hb_vmInit() rodasse para ela: a thread
 * nunca era registrada na VM e a primeira HbCall estourava, longe da causa.
 *
 * Guardar QUEM inicializou transforma isso num "nao" imediato. O lado Rust ja
 * confina a DLL numa thread so (dbudll.rs) e agora espera ela morrer antes de
 * subir outra; este guarda existe para o dia em que alguem esquecer a regra --
 * falhar alto na chamada errada e melhor que corromper na chamada seguinte.
 */
static HB_BOOL s_fInit  = HB_FALSE;
static DWORD   s_dwDona = 0;

static char   s_szProgName[] = "dbudll";
static char * s_argv[] = { s_szProgName, NULL };

DBU_API int __stdcall HbStart( void )
{
   if( ! s_fInit )
   {
      hb_cmdargInit( 1, s_argv );
      hb_vmInit( HB_FALSE );   /* HB_FALSE = nao executa MAIN() */
      s_fInit  = HB_TRUE;
      s_dwDona = GetCurrentThreadId();
      return 1;
   }

   /* Ja iniciada: so a dona pode ouvir "sim". Para ela e idempotente. */
   return ( GetCurrentThreadId() == s_dwDona ) ? 1 : 0;
}

DBU_API int __stdcall HbStop( void )
{
   if( ! s_fInit )
      return 1;

   /* Quem nao inicializou nao finaliza: hb_vmQuit() de outra thread arranca a
      VM debaixo da que esta usando. */
   if( GetCurrentThreadId() != s_dwDona )
      return 0;

   s_fInit  = HB_FALSE;
   s_dwDona = 0;
   hb_vmQuit();
   return 1;
}

/*
 * Chama DllDispatch( cFunc, cArg ) no lado PRG.
 * Retorna: >= 0 tamanho do resultado copiado, ou codigo DBU_ERR_*.
 * DBU_ERR_THREAD sai quando a chamada vem de uma thread que nao e a dona.
 * Se o buffer for pequeno demais retorna DBU_ERR_TRUNC e grava em
 * pnNeeded o tamanho necessario (sem o NUL final).
 */
DBU_API int __stdcall HbCall( const char * szFunc,
                                const char * szArg,
                                char * pBuffer,
                                int    nBufLen,
                                int *  pnNeeded )
{
   PHB_DYNS pDyn;
   PHB_ITEM pRet;
   const char * pszRet;
   HB_SIZE nLen;

   if( ! s_fInit )
      return DBU_ERR_NOTINIT;

   /* Chamar a VM de outra thread e o erro que este binario nao consegue
      sobreviver -- hb_vmPushDynSym numa thread sem pilha Harbour derruba o
      processo. Recusar e a unica saida util. */
   if( GetCurrentThreadId() != s_dwDona )
      return DBU_ERR_THREAD;

   if( szFunc == NULL || pBuffer == NULL || nBufLen <= 0 )
      return DBU_ERR_BADARG;

   pDyn = hb_dynsymFindName( "DLLDISPATCH" );
   if( pDyn == NULL || ! hb_dynsymIsFunction( pDyn ) )
      return DBU_ERR_NODISP;

   hb_vmPushDynSym( pDyn );
   hb_vmPushNil();
   hb_vmPushString( szFunc, strlen( szFunc ) );
   hb_vmPushString( szArg ? szArg : "", szArg ? strlen( szArg ) : 0 );
   hb_vmDo( 2 );

   pRet   = hb_stackReturnItem();
   pszRet = hb_itemGetCPtr( pRet );
   nLen   = hb_itemGetCLen( pRet );

   if( pnNeeded )
      *pnNeeded = ( int ) nLen;

   if( ( HB_SIZE ) nBufLen < nLen + 1 )
   {
      /* copia o que cabe, ainda termina em NUL */
      memcpy( pBuffer, pszRet, ( size_t ) nBufLen - 1 );
      pBuffer[ nBufLen - 1 ] = '\0';
      return DBU_ERR_TRUNC;
   }

   memcpy( pBuffer, pszRet, ( size_t ) nLen );
   pBuffer[ nLen ] = '\0';

   return ( int ) nLen;
}
