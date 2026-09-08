/*
 * testload.c - exemplo/teste em C puro do consumo de bin/qdbudll.dll.
 *
 * Faz exatamente o que o wrapper Delphi (delphi/HbDll.pas) faz:
 *   LoadLibrary -> GetProcAddress -> HbStart -> HbCall... -> HbStop -> FreeLibrary
 * Inclusive a realocacao de buffer quando HbCall devolve HBDLL_ERR_TRUNC.
 *
 * Build: testsbuild.bat
 */

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define HBDLL_ERR_NOTINIT   -1
#define HBDLL_ERR_NODISP    -2
#define HBDLL_ERR_BADARG    -3
#define HBDLL_ERR_TRUNC     -4
#define HBDLL_ERR_THREAD    -5

typedef int ( __stdcall * PFNSTART )( void );
typedef int ( __stdcall * PFNSTOP  )( void );
typedef int ( __stdcall * PFNCALL  )( const char * szFunc, const char * szArg,
                                      char * pBuffer, int nBufLen, int * pnNeeded );

static PFNSTART s_pStart;
static PFNSTOP  s_pStop;
static PFNCALL  s_pCall;

static const char * ErrName( int iRet )
{
   switch( iRet )
   {
      case HBDLL_ERR_NOTINIT: return "VM nao inicializada";
      case HBDLL_ERR_NODISP:  return "DllDispatch ausente";
      case HBDLL_ERR_BADARG:  return "argumento invalido";
      case HBDLL_ERR_TRUNC:   return "buffer insuficiente";
   }
   return "erro desconhecido";
}

/*
 * Equivalente C de HbExec() do Delphi: chama, e se o buffer for pequeno
 * realoca com o tamanho exato informado em 'needed' e repete.
 * Devolve string malloc()ada (o chamador libera), ou NULL em erro.
 */
static char * HbExec( const char * szFunc, const char * szArg, int nStartSize )
{
   char * pBuf;
   int    nLen = nStartSize > 0 ? nStartSize : 8192;
   int    nNeeded = 0;
   int    iRet;

   pBuf = ( char * ) malloc( ( size_t ) nLen );
   if( ! pBuf )
      return NULL;

   iRet = s_pCall( szFunc, szArg, pBuf, nLen, &nNeeded );

   if( iRet == HBDLL_ERR_TRUNC && nNeeded > 0 )
   {
      char * pNew;

      printf( "      [buffer %d insuficiente, realocando para %d]\n", nLen, nNeeded + 1 );

      nLen = nNeeded + 1;
      pNew = ( char * ) realloc( pBuf, ( size_t ) nLen );
      if( ! pNew ) { free( pBuf ); return NULL; }
      pBuf = pNew;

      iRet = s_pCall( szFunc, szArg, pBuf, nLen, &nNeeded );
   }

   if( iRet < 0 )
   {
      printf( "      [HbCall falhou: %d - %s]\n", iRet, ErrName( iRet ) );
      free( pBuf );
      return NULL;
   }

   return pBuf;
}

static void Try_( const char * szFunc, const char * szArg, int nStartSize )
{
   char * pRet;

   printf( "%-12s(%-18s) -> ", szFunc, szArg );
   fflush( stdout );

   pRet = HbExec( szFunc, szArg, nStartSize );
   if( pRet )
   {
      printf( "%s\n", pRet );
      free( pRet );
   }
   else
      printf( "<sem resultado>\n" );
}

int main( int argc, char * argv[] )
{
   const char * szDll = argc > 1 ? argv[ 1 ] : "bin/qdbudll.dll";
   HMODULE hDll;

   hDll = LoadLibraryA( szDll );
   if( ! hDll )
   {
      printf( "LoadLibrary(\"%s\") falhou. GetLastError=%lu\n", szDll, GetLastError() );
      printf( "  126 = modulo nao encontrado (path errado ou dependencia faltando)\n" );
      printf( "  193 = arquitetura errada (DLL 32-bit x exe 64-bit, ou vice-versa)\n" );
      return 1;
   }

   s_pStart = ( PFNSTART ) GetProcAddress( hDll, "HbStart" );
   s_pStop  = ( PFNSTOP  ) GetProcAddress( hDll, "HbStop"  );
   s_pCall  = ( PFNCALL  ) GetProcAddress( hDll, "HbCall"  );

   if( ! s_pStart || ! s_pStop || ! s_pCall )
   {
      printf( "GetProcAddress falhou (HbStart=%p HbStop=%p HbCall=%p)\n",
              ( void * ) s_pStart, ( void * ) s_pStop, ( void * ) s_pCall );
      FreeLibrary( hDll );
      return 1;
   }

   printf( "DLL: %s\n", szDll );
   printf( "HbStart -> %d\n\n", s_pStart() );

   printf( "-- modo cru: LISTA FECHADA (dispatch.prg, PermitidasNaViaCrua) --\n" );
   printf( "   As tres liberadas passam; tudo o mais e recusado com \"ERR:\".\n" );
   Try_( "Api_Meta_Ping",    "qdbu", 8192 );
   Try_( "Nao_Existe",       "",     8192 );
   /* Existe, comeca com Api_, e ESCREVE ARQUIVO -- a via crua nao passa por
      LogOp(), entao um prefixo `API_` abriria uma rota de escrita sem registro.
      E o caso que justifica a lista ser lista. */
   Try_( "Api_Meta_Copyfile", "{}",  8192 );
   /* Se este passasse, o teste terminaria AQUI: __QUIT derruba o processo sem
      erro, sem log e sem o "ERR:" que o contrato promete. As linhas seguintes
      saindo e a prova de que ele foi recusado. */
   Try_( "__QUIT",           "",     8192 );
   /* Bytes que NAO sao UTF-8 valido no nome. So o cliente C consegue montar
      isto (no Rust o nome ja e um &str valido). Sem o Sanea() do dispatcher o
      eco voltaria cru e `String::from_utf8` estrito, em qdbudll.rs, trocaria a
      recusa por um erro duro de ponte. */
   Try_( "Api_\xFF\xFEZzz",  "",     8192 );

   printf( "\n-- envelope: id ecoado, rev, result --\n" );
   Try_( "rpc", "{\"id\":\"r-1\",\"method\":\"meta.ping\",\"params\":{}}", 8192 );

   printf( "\n-- envelope: metodo inexistente vira RECUSA, nao ERR: --\n" );
   Try_( "rpc", "{\"id\":\"r-2\",\"method\":\"nao.existe\",\"params\":{}}", 8192 );

   printf( "\n-- envelope: JSON invalido --\n" );
   Try_( "rpc", "isto nao e json", 8192 );

   printf( "\n-- workspace: pasta inexistente = recusa com campo culpado --\n" );
   /* `name`, e nao `nome`: e a chave que Api_Workspace_Add le. Com a errada o
      nome vinha vazio e a DLL derivava o da pasta -- o teste passava sem nunca
      ter exercitado o campo. E o mesmo par que escondeu o nome da conexao na
      UI por semanas. */
   Try_( "rpc", "{\"id\":\"r-3\",\"method\":\"workspace.add\",\"params\":{\"name\":\"X\",\"dir\":\"Z:/nao/existe\"}}", 8192 );

   /* PASTA AVULSA: `workspace.files` aceita `dir` CRU, sem conexao cadastrada.
      E o contrato inteiro do recurso -- se ele quebrar, a pasta avulsa deixa de
      ter o que listar, e nenhum teste de UI diria por que. */
   printf( "\n-- workspace.files por DIR, sem conexao cadastrada (pasta avulsa) --\n" );
   Try_( "rpc", "{\"id\":\"r-4\",\"method\":\"workspace.files\",\"params\":{\"dir\":\"tests/fixtures\"}}", 65536 );

   /* Pasta que nao existe volta RECUSA DE NEGOCIO, nunca "ERR:" -- arrastar
      para a janela um caminho sem extensao que nao e pasta cai exatamente
      aqui, e a UI precisa da recusa para dizer a frase certa. */
   printf( "\n-- workspace.files por DIR inexistente = recusa, nao ERR: --\n" );
   Try_( "rpc", "{\"id\":\"r-5\",\"method\":\"workspace.files\",\"params\":{\"dir\":\"Z:/nao/existe\"}}", 8192 );

   /* Sem `name` e sem `dir` nao ha o que listar: recusa nomeando o parametro. */
   printf( "\n-- workspace.files sem name e sem dir = recusa --\n" );
   Try_( "rpc", "{\"id\":\"r-6\",\"method\":\"workspace.files\",\"params\":{}}", 8192 );

   printf( "\n-- buffer pequeno de proposito (8 bytes), deve realocar --\n" );
   Try_( "Api_Meta_Version", "", 8 );

   printf( "\nHbStop -> %d\n", s_pStop() );
   FreeLibrary( hDll );

   return 0;
}
