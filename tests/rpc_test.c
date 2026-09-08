/* Exercita workspace.* contra uma pasta real (as fixtures).

   NAO entra no trilho C: tests/build.bat compila so o testload.c. Este fica
   como roteiro manual --

       cl /nologo /Fe:bin\rpc_test.exe /Fo:bin\ tests\rpc_test.c
       bin\rpc_test.exe

   As chaves sao as que a DLL LE: `name`, `path`, `dir`. Estavam em portugues
   (`nome`, `caminho`), entao os passos 1, 2, 4, 6 e 7 exercitavam a recusa por
   parametro ausente achando que listavam arquivos. */
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
   rpc( "{\"id\":\"1\",\"method\":\"workspace.add\",\"params\":{\"name\":\"Fixtures\",\"dir\":\"tests/fixtures\"}}" );

   printf( "== 2. duplicada => recusa ==\n" );
   rpc( "{\"id\":\"2\",\"method\":\"workspace.add\",\"params\":{\"name\":\"Fixtures\",\"dir\":\"tests/fixtures\"}}" );

   printf( "== 3. lista as conexoes ==\n" );
   rpc( "{\"id\":\"3\",\"method\":\"workspace.list\",\"params\":{}}" );

   printf( "== 4. arquivos da conexao ==\n" );
   rpc( "{\"id\":\"4\",\"method\":\"workspace.files\",\"params\":{\"name\":\"Fixtures\"}}" );

   printf( "== 5. contagem sob demanda ==\n" );
   rpc( "{\"id\":\"5\",\"method\":\"workspace.count\",\"params\":{\"path\":\"tests/fixtures/tipos.dbf\"}}" );
   rpc( "{\"id\":\"6\",\"method\":\"workspace.count\",\"params\":{\"path\":\"tests/fixtures/vazio.dbf\"}}" );
   rpc( "{\"id\":\"7\",\"method\":\"workspace.count\",\"params\":{\"path\":\"tests/fixtures/filho.dbf\"}}" );

   printf( "== 6. conexao inexistente => recusa ==\n" );
   rpc( "{\"id\":\"8\",\"method\":\"workspace.files\",\"params\":{\"name\":\"NaoExiste\"}}" );

   printf( "== 6b. pasta avulsa: lista por DIR, sem conexao cadastrada ==\n" );
   rpc( "{\"id\":\"10\",\"method\":\"workspace.files\",\"params\":{\"dir\":\"tests/fixtures\"}}" );

   printf( "== 6c. DIR inexistente => recusa, nao ERR: ==\n" );
   rpc( "{\"id\":\"11\",\"method\":\"workspace.files\",\"params\":{\"dir\":\"Z:/nao/existe\"}}" );

   printf( "== 7. remove ==\n" );
   rpc( "{\"id\":\"9\",\"method\":\"workspace.remove\",\"params\":{\"name\":\"Fixtures\"}}" );

   pStop();
   FreeLibrary( h );
   return 0;
}
