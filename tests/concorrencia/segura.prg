/*
 * segura.prg -- um cliente xBase de verdade segurando um DBF.
 *
 * Rodar com o hbrun, que compila e executa na hora:
 *
 *   hbrun segura.prg <arquivo.dbf> [shared|excl|grab] [segundos]
 *
 *   shared  abre compartilhado e segura -- o ERP do cliente com o arquivo
 *   excl    abre exclusivo e segura    -- o DBU original com /E
 *   grab    fica TENTANDO abrir exclusivo ate conseguir, e ai segura
 *
 * POR QUE UM PROCESSO HARBOUR, e nao um FileStream do PowerShell.
 *
 * O FileStream abre o arquivo com um share mode e pronto. O RDD faz mais que
 * isso -- le o cabecalho, mantem o proprio lock, e e o mesmo codigo que esta
 * do outro lado no QDbu. Testar contra um FileStream mede o sistema de
 * arquivos; testar contra isto mede o que de fato acontece na maquina do
 * cliente, onde quem esta com o arquivo e um programa Clipper.
 *
 * O MODO `grab` E O QUE ENCENA A JANELA DA R6.
 *
 * Entre o `dbCloseArea()` e o `dbUseArea()` do QDbu existe um intervalo em que
 * o arquivo esta livre e qualquer processo da rede pode leva-lo. Esse ramo --
 * nao conseguir reabrir em NENHUM dos dois modos, e o handle virar `detached`
 * -- e o pior desfecho da R6 e nao tinha como ser exercitado: a janela dura
 * milissegundos. Com o `file.reopenslow` ela vira segundos, e este laco a
 * ocupa. Nao e simulacao: e a corrida de verdade, em camera lenta.
 *
 * Imprime uma linha por evento, para quem chama saber o que aconteceu sem
 * precisar adivinhar pelo silencio.
 */

REQUEST DBFNTX

PROCEDURE Main( cArq, cModo, cSeg )

   LOCAL nSeg, nAte, lPegou := .F., nVoltas := 0

   IF Empty( cArq )
      ? "uso: hbrun segura.prg <arquivo.dbf> [shared|excl|grab] [segundos]"
      QUIT
   ENDIF

   cModo := Lower( hb_defaultValue( cModo, "shared" ) )
   nSeg  := Val( hb_defaultValue( cSeg, "10" ) )
   IF nSeg <= 0
      nSeg := 10
   ENDIF

   rddSetDefault( "DBFNTX" )

   IF ! hb_FileExists( cArq )
      ? "NAO EXISTE:", cArq
      QUIT
   ENDIF

   DO CASE
   CASE cModo == "grab"
      /* O teto e o mesmo `hold` do reopenslow do outro lado; passar disso
         significa que a janela nunca abriu, e ficar tentando para sempre
         prenderia quem chamou. */
      nAte := Seconds() + nSeg
      DO WHILE Seconds() < nAte .AND. ! lPegou
         nVoltas++
         lPegou := Abre( cArq, .T. )
         IF ! lPegou
            hb_idleSleep( 0.05 )
         ENDIF
      ENDDO
      IF ! lPegou
         ? "NAO PEGOU apos", nVoltas, "tentativas em", nSeg, "s"
         QUIT
      ENDIF
      ? "PEGOU EXCLUSIVO na volta", nVoltas

   OTHERWISE
      IF ! Abre( cArq, cModo == "excl" )
         ? "NAO ABRIU:", cArq, "(" + cModo + ")"
         QUIT
      ENDIF
      ? "ABERTO", Upper( cModo ), "--", LastRec(), "registros"
   ENDCASE

   /* SEGURA. E aqui que o outro lado e medido. */
   ? "SEGURANDO por", nSeg, "s"
   hb_idleSleep( nSeg )

   dbCloseArea()
   ? "SOLTO"

   RETURN


/* Nao levanta erro: quem chama precisa TENTAR e decidir. Mesma razao do
   `AbreNaArea` do lado do QDbu. */
STATIC FUNCTION Abre( cArq, lExcl )

   LOCAL lOk := .F.

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T., "DBFNTX", cArq, "SEGURA", ! lExcl, .F. )
      lOk := ! NetErr() .AND. ! Empty( Alias() )
   RECOVER
   END SEQUENCE

   RETURN lOk
