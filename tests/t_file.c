#include <windows.h>
#include <stdio.h>
typedef int (__stdcall * PS)( void );
typedef int (__stdcall * PC)( const char *, const char *, char *, int, int * );
static PC s_pCall;
static void rpc( const char * rot, const char * j ) {
   char buf[ 262144 ]; int n = 0;
   int r = s_pCall( "rpc", j, buf, sizeof( buf ), &n );
   printf( "%-34s %s\n", rot, r >= 0 ? buf : "<falhou>" );
}
int main( void ) {
   HMODULE h = LoadLibraryA( "bin/qdbudll.dll" );
   PS pStart = ( PS ) GetProcAddress( h, "HbStart" );
   PS pStop  = ( PS ) GetProcAddress( h, "HbStop"  );
   s_pCall = ( PC ) GetProcAddress( h, "HbCall" );
   pStart();

   printf( "\n== abre um DBF pequeno ==\n" );
   rpc( "open tipos.dbf",
        "{\"id\":\"1\",\"method\":\"file.open\",\"params\":{\"caminho\":\"tests/fixtures/tipos.dbf\",\"conexao\":\"Fixtures\"}}" );

   printf( "\n== o MESMO arquivo de novo => recusa ==\n" );
   rpc( "open de novo",
        "{\"id\":\"2\",\"method\":\"file.open\",\"params\":{\"caminho\":\"tests/fixtures/tipos.dbf\"}}" );

   printf( "\n== .DBF que e INI => recusa, sem crash ==\n" );
   rpc( "open Netarg2",
        "{\"id\":\"3\",\"method\":\"file.open\",\"params\":{\"caminho\":\"J:/bases/base01/Netarg2.dbf\"}}" );
   rpc( "open NETCCSTLIST",
        "{\"id\":\"4\",\"method\":\"file.open\",\"params\":{\"caminho\":\"J:/bases/base01/NETCCSTLIST.DBF\"}}" );

   printf( "\n== arquivo GRANDE (421 mil registros) ==\n" );
   rpc( "open NETBUYIT",
        "{\"id\":\"5\",\"method\":\"file.open\",\"params\":{\"caminho\":\"J:/bases/base01/NETBUYIT.DBF\",\"conexao\":\"base01\"}}" );

   printf( "\n== MESMO NOME em conexoes diferentes: alias tem de divergir ==\n" );
   rpc( "open NETEST @DBU",
        "{\"id\":\"6\",\"method\":\"file.open\",\"params\":{\"caminho\":\"J:/programa/dbu/NETEST.DBF\",\"conexao\":\"DBU original\"}}" );
   rpc( "open NETEST @base01",
        "{\"id\":\"7\",\"method\":\"file.open\",\"params\":{\"caminho\":\"J:/bases/base01/NETEST.DBF\",\"conexao\":\"base01\"}}" );

   printf( "\n== abertos ==\n" );
   rpc( "file.list", "{\"id\":\"8\",\"method\":\"file.list\",\"params\":{}}" );

   printf( "\n== estrutura sem abrir ==\n" );
   rpc( "struct por caminho",
        "{\"id\":\"9\",\"method\":\"file.struct\",\"params\":{\"caminho\":\"tests/fixtures/pai.dbf\"}}" );

   printf( "\n== handle invalido e handle fechado ==\n" );
   rpc( "handle inexistente", "{\"id\":\"10\",\"method\":\"file.info\",\"params\":{\"h\":\"h999\"}}" );
   rpc( "close h1",           "{\"id\":\"11\",\"method\":\"file.close\",\"params\":{\"h\":\"h1\"}}" );
   rpc( "usar h1 fechado",    "{\"id\":\"12\",\"method\":\"file.info\",\"params\":{\"h\":\"h1\"}}" );

   printf( "\n== fecha tudo ==\n" );
   rpc( "close_all", "{\"id\":\"13\",\"method\":\"file.close_all\",\"params\":{}}" );

   pStop(); FreeLibrary( h ); return 0;
}
