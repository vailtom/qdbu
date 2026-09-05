/*
 * zip.prg - o backup compactado.
 *
 * A PERGUNTA QUE ORIGINOU ISTO, do autor: "da para criar o zip a partir do
 * ORIGINAL, em vez de copiar o DBF e zipar a copia? Com arquivo exclusivo acho
 * que nao funciona; compartilhado eu nao sei."
 *
 * A resposta e sim, e o codigo NAO ADIVINHA qual caso e o seu -- ele TENTA
 * abrir o original para leitura e cai para a copia so quando o SO nega. Assim a
 * regra nao depende de eu ter deduzido certo o comportamento do Windows para
 * cada combinacao de modo.
 *
 *   consegue abrir o original    -> ZIPA DIRETO. Nada e copiado, e o pico de
 *                                   disco e so o do .zip.
 *   o SO nega o segundo handle   -> COPY TO num .dbf temporario, zipa o
 *                                   temporario, apaga o temporario.
 *
 * O `hb_zipStoreFileHandle` (contrib/hbmzip/mzip.c:1166) e o que torna a via
 * direta possivel: ele recebe um HANDLE, e nao um caminho. Fosse por caminho, a
 * biblioteca abriria o arquivo do jeito dela e nos nao teriamos como pedir
 * FO_SHARED.
 *
 * POR QUE A VIA DE COPIA USA `COPY TO` E NAO BYTES:
 *
 * Ela so e alcancada quando o arquivo esta aberto -- e para arquivo aberto a
 * copia consistente e a que passa pelo RDD, registro a registro. Copiar bytes
 * de um arquivo que outra pessoa esta gravando captura um estado partido. Essa
 * decisao ja foi tomada e documentada em o desenho do backup; aqui ela e apenas
 * reusada (`CopiaPorRegistro`).
 */

#include "fileio.ch"
#include "hbmzip.ch"


/*
 * Compacta `cOrigem` em `cZip`.
 *
 * `cModo` (por referencia) volta com o caminho que foi usado -- "direct" ou
 * "copy" -- para a tela poder dizer a verdade sobre o que aconteceu, em vez de
 * uma frase generica.
 *
 * `bEvento` recebe ( nBytesFeitos, nBytesTotal ) para a barra de progresso.
 */
FUNCTION ZipDoArquivo( cOrigem, cZip, cNomeDentro, bEvento, cModo )

   LOCAL hArq, nRet
   LOCAL hZip
   LOCAL cTmp, xErro

   cModo := ""

   IF Empty( cOrigem ) .OR. ! hb_FileExists( cOrigem )
      RETURN Err( "ERROR_SOURCE_NOT_FOUND", "nothing to compress", "path", ;
                  { "file" => hb_FNameNameExt( cOrigem ) } )
   ENDIF

   hb_default( @cNomeDentro, hb_FNameNameExt( cOrigem ) )

   /*
    * A TENTATIVA. `FO_READ + FO_SHARED` e o mesmo pedido que a copia de bytes
    * faz, e por isso o resultado aqui e o mesmo que ela teria: se o RDD segura
    * o arquivo em exclusivo, o Windows nega este handle mesmo estando no nosso
    * proprio processo.
    */
   hArq := FOpen( cOrigem, FO_READ + FO_SHARED )

   IF hArq != F_ERROR

      cModo := "direct"

      hZip := hb_zipOpen( cZip )
      IF hZip == NIL
         FClose( hArq )
         RETURN Err( "ERROR_ZIP_CREATE_FAILED", "could not create the zip", "path", ;
                     { "file" => hb_FNameNameExt( cZip ) } )
      ENDIF

      /* Nivel 6: o padrao do zlib. Nivel 9 custa bem mais tempo por poucos por
         cento num DBF, que e texto de largura fixa e comprime muito de qualquer
         jeito. */
      nRet := hb_zipStoreFileHandle( hZip, hArq, cNomeDentro, NIL, 6 )
      hb_zipClose( hZip )
      FClose( hArq )

      IF nRet != 0
         Descarta( cZip )
         RETURN Err( "ERROR_ZIP_FAILED", "the zip could not be written", "path", ;
                     { "file" => hb_FNameNameExt( cZip ), ;
                       "reason" => hb_zipErrorStr( nRet ) } )
      ENDIF

      IF ! Empty( bEvento )
         Eval( bEvento, Max( 0, hb_FSize( cOrigem ) ), Max( 0, hb_FSize( cOrigem ) ) )
      ENDIF

      RETURN NIL
   ENDIF

   /*
    * O SO negou. O arquivo esta aberto em exclusivo -- por nos ou por outra
    * pessoa -- e a unica leitura consistente e pela work area.
    *
    * O temporario nasce com BASE PROPRIA, e nao so extensao propria: o Harbour
    * deriva o nome do memo da base, entao um `NOME.tm$` criaria um `.DBT`
    * chamado `NOME.dbt`, que e o memo do arquivo que esta aberto. Mesma pedra
    * da alteracao de estrutura (api_struct.prg).
    */
   cModo := "copy"

   /*
    * SEM `$` NO NOME. Pela terceira vez no projeto: `$` nao e caractere valido
    * de ALIAS, e o `CopiaPorRegistro` abre o destino com `dbUseArea( ..., NIL,
    * ... )`, que deriva o alias do nome do arquivo. Com `$` a criacao falha com
    * uma mensagem que fala de GRAVACAO, nao de alias -- e se perde tempo
    * procurando permissao de disco. Base propria continua sendo necessaria, so
    * que com caractere que serve para as duas coisas.
    */
   cTmp := hb_FNameMerge( hb_FNameDir( cZip ), ;
                          hb_FNameName( cZip ) + "_ZTMP", ".dbf" )
   ZipLimpaTemp( cTmp )

   xErro := CopiaPorRegistro( cTmp, bEvento )
   IF xErro != NIL
      /* Limpa o CONJUNTO, e nao so o .dbf: o dbCreate ja pode ter deixado o
         .DBT para tras, e um memo orfao fica na pasta parecendo backup. */
      ZipLimpaTemp( cTmp )
      RETURN xErro
   ENDIF

   hArq := FOpen( cTmp, FO_READ + FO_SHARED )
   IF hArq == F_ERROR
      Descarta( cTmp )
      RETURN Err( "ERROR_ZIP_FAILED", "the temporary copy could not be read", "path", ;
                  { "file" => hb_FNameNameExt( cTmp ), "reason" => "" } )
   ENDIF

   hZip := hb_zipOpen( cZip )
   IF hZip == NIL
      FClose( hArq )
      ZipLimpaTemp( cTmp )
      RETURN Err( "ERROR_ZIP_CREATE_FAILED", "could not create the zip", "path", ;
                  { "file" => hb_FNameNameExt( cZip ) } )
   ENDIF

   nRet := hb_zipStoreFileHandle( hZip, hArq, cNomeDentro, NIL, 6 )

   /* O memo entra junto: um DBF com campo memo cujo .DBT ficou de fora nao
      abre, e um backup que nao abre nao e backup. */
   ZipJuntaMemo( hZip, cTmp, cNomeDentro )

   hb_zipClose( hZip )
   FClose( hArq )
   ZipLimpaTemp( cTmp )

   IF nRet != 0
      Descarta( cZip )
      RETURN Err( "ERROR_ZIP_FAILED", "the zip could not be written", "path", ;
                  { "file" => hb_FNameNameExt( cZip ), ;
                    "reason" => hb_zipErrorStr( nRet ) } )
   ENDIF

   RETURN NIL


/* Acrescenta o .DBT/.FPT do temporario, se houver. */
STATIC FUNCTION ZipJuntaMemo( hZip, cDbf, cNomeDentro )

   LOCAL cMemo, hArq, cNome, c

   FOR EACH c IN { ".dbt", ".fpt" }
      cMemo := hb_FNameExtSet( cDbf, c )
      IF hb_FileExists( cMemo )
         hArq := FOpen( cMemo, FO_READ + FO_SHARED )
         IF hArq != F_ERROR
            cNome := hb_FNameExtSet( cNomeDentro, c )
            hb_zipStoreFileHandle( hZip, hArq, cNome, NIL, 6 )
            FClose( hArq )
         ENDIF
      ENDIF
   NEXT

   RETURN NIL


/* O temporario some inteiro -- o .dbf e o memo. R3: nao deixar lixo. */
STATIC FUNCTION ZipLimpaTemp( cDbf )

   Descarta( cDbf )
   Descarta( hb_FNameExtSet( cDbf, ".dbt" ) )
   Descarta( hb_FNameExtSet( cDbf, ".fpt" ) )

   RETURN NIL
