/* Exercita workspace.* contra uma pasta real (as fixtures). */
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef int (__stdcall * PFNSTART)( void );
typedef int (__stdcall * PFNSTOP )( void );
typedef int (__stdcall * PFNCALL )( const char *, const char *, char *, int, int * );

static PFNCALL s_pCall;

static void rpc( const char * json )
{
   char buf[ 65536 ];
   int needed = 0;
   int r = s_pCall( "rpc", json, buf, sizeof( buf ), &needed );
   printf( "-> %s\n\n", r >= 0 ? buf : "<falhou>" );
}

int main( void )
{
   HMODULE h = LoadLibraryA( "bin/qdbudll.dll" );
   PFNSTART pStart;
   PFNSTOP  pStop;

   if( ! h ) { printf( "LoadLibrary falhou: %lu\n", GetLastError() ); return 1; }

   pStart = ( PFNSTART ) GetProcAddress( h, "HbStart" );
   pStop  = ( PFNSTOP  ) GetProcAddress( h, "HbStop"  );
   s_pCall = ( PFNCALL ) GetProcAddress( h, "HbCall"  );
   pStart();

   printf( "== 1. cadastra a pasta das fixtures ==\n" );
   rpc( "{\"id\":\"1\",\"method\":\"workspace.add\",\"params\":{\"nome\":\"Fixtures\",\"dir\":\"tests/fixtures\"}}" );

   printf( "== 2. duplicada => recusa ==\n" );
   rpc( "{\"id\":\"2\",\"method\":\"workspace.add\",\"params\":{\"nome\":\"Fixtures\",\"dir\":\"tests/fixtures\"}}" );

   printf( "== 3. lista as conexoes ==\n" );
   rpc( "{\"id\":\"3\",\"method\":\"workspace.list\",\"params\":{}}" );

   printf( "== 4. arquivos da conexao ==\n" );
   rpc( "{\"id\":\"4\",\"method\":\"workspace.files\",\"params\":{\"nome\":\"Fixtures\"}}" );

   printf( "== 5. contagem sob demanda ==\n" );
   rpc( "{\"id\":\"5\",\"method\":\"workspace.count\",\"params\":{\"caminho\":\"tests/fixtures/tipos.dbf\"}}" );
   rpc( "{\"id\":\"6\",\"method\":\"workspace.count\",\"params\":{\"caminho\":\"tests/fixtures/vazio.dbf\"}}" );
   rpc( "{\"id\":\"7\",\"method\":\"workspace.count\",\"params\":{\"caminho\":\"tests/fixtures/filho.dbf\"}}" );

   printf( "== 6. conexao inexistente => recusa ==\n" );
   rpc( "{\"id\":\"8\",\"method\":\"workspace.files\",\"params\":{\"nome\":\"NaoExiste\"}}" );

   printf( "== 7. remove ==\n" );
   rpc( "{\"id\":\"9\",\"method\":\"workspace.remove\",\"params\":{\"nome\":\"Fixtures\"}}" );

   pStop();
   FreeLibrary( h );
   return 0;
}
