#include <windows.h>
#include <stdio.h>
typedef int (__stdcall * PS)( void );
typedef int (__stdcall * PC)( const char *, const char *, char *, int, int * );
static PC s_c;
static void rpc(const char*rot,const char*j){
  char b[262144]; int n=0;
  int r=s_c("rpc",j,b,sizeof(b),&n);
  printf("%-22s %s\n\n", rot, r>=0?b:"<falhou>");
}
int main(void){
  HMODULE h=LoadLibraryA("bin/qdbudll.dll");
  PS st=(PS)GetProcAddress(h,"HbStart"); PS sp=(PS)GetProcAddress(h,"HbStop");
  s_c=(PC)GetProcAddress(h,"HbCall"); st();

  printf("== 1. estado com a memoria vazia ==\n");
  rpc("session.state","{\"id\":\"1\",\"method\":\"session.state\",\"params\":{}}");

  printf("== 2. abre dois arquivos e fecha um ==\n");
  rpc("open NETUSU","{\"id\":\"2\",\"method\":\"file.open\",\"params\":{\"path\":\"J:/programa/dbu/NETUSU.DBF\",\"connection\":\"DBU original\"}}");
  rpc("open tipos", "{\"id\":\"3\",\"method\":\"file.open\",\"params\":{\"path\":\"tests/fixtures/tipos.dbf\",\"connection\":\"Fixtures\"}}");
  rpc("close h1",   "{\"id\":\"4\",\"method\":\"file.close\",\"params\":{\"h\":\"h1\"}}");

  printf("== 3. o que a DLL tem agora (aberto + fechado + ui) ==\n");
  rpc("session.state","{\"id\":\"5\",\"method\":\"session.state\",\"params\":{}}");

  sp(); FreeLibrary(h); return 0;
}
