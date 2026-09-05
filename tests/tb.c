#include <windows.h>
#include <stdio.h>
typedef int (__stdcall * PS)( void );
typedef int (__stdcall * PC)( const char *, const char *, char *, int, int * );
int main(void){
  HMODULE h=LoadLibraryA("bin/qdbudll.dll");
  PS st=(PS)GetProcAddress(h,"HbStart"); PS sp=(PS)GetProcAddress(h,"HbStop");
  PC c=(PC)GetProcAddress(h,"HbCall"); char b[8192]; int n=0; st();
  c("rpc","{\"id\":\"1\",\"method\":\"meta.echo\",\"params\":{\"texto\":\"a\\b\"}}",b,sizeof(b),&n);
  printf("eco de a-barra-b: %s\n", b);
  sp(); FreeLibrary(h); return 0;
}
