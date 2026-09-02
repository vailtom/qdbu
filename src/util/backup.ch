/*
 * backup.ch - as constantes do pre-voo, compartilhadas.
 *
 * Ficam num .ch e nao no backup.prg porque `#define` no Harbour vale so ate o
 * fim do ARQUIVO. Com elas no .prg, o api_backup.prg compilava com "Ambiguous
 * reference 'FATOR_ESPACO'" -- um Warning, mas em runtime a constante ausente
 * vira a string literal do nome, e `nBytes * "FATOR_ESPACO"` daria erro de tipo
 * dentro da conferencia que existe justamente para evitar surpresa.
 */

#ifndef _BACKUP_CH
#define _BACKUP_CH

/*
 * QUANTO ESPACO LIVRE EXIGIR, e a conta e sobre o que sera ACRESCENTADO.
 *
 * A primeira versao pedia 3x com a justificativa de que "coexistem tres copias
 * -- original, backup e temporario". A aritmetica estava errada: o original JA
 * OCUPA o espaco dele, e portanto nao esta no espaco livre. O que nasce e o
 * backup (1x) e, quando uma operacao destrutiva vem depois, o temporario que a
 * R2 exige (mais 1x).
 *
 *   FATOR_COPIA     1x  copia avulsa: so o backup nasce
 *   FATOR_OPERACAO  2x  backup + o .tmp da operacao que vem a seguir
 *
 * E os dois valem para o volume de DESTINO. Copiar para outro disco nao ocupa
 * nada no volume de origem -- exceto o temporario, que continua nascendo la, e
 * por isso vira uma conferencia propria quando os volumes diferem.
 */
#define FATOR_COPIA      1
#define FATOR_OPERACAO   2

/* 256 MB. Acima disto a operacao pede confirmacao explicita. Nao e limite
   tecnico: e o ponto em que a espera deixa de ser instantanea, e a pessoa
   merece saber antes de comecar, nao depois. */
#define GRANDE_BYTES   ( 256 * 1024 * 1024 )

/*
 * 256 KB por pedaco, e o numero foi MEDIDO, nao escolhido.
 *
 * Copiando o mesmo arquivo de 834 MB (J:/bases/BASE02/NETROM.DBF), com
 * meta.copyfile variando so o bloco:
 *
 *      8 KB   1294 ms    644 MB/s   106.741 iteracoes   (o do Clipper)
 *     64 KB    608 ms   1372 MB/s    13.343             (o do __CopyFile)
 *    256 KB    471 ms   1771 MB/s     3.336   <-- melhor
 *      1 MB    649 ms   1285 MB/s       834
 *      5 MB    714 ms   1168 MB/s       167   <-- pior que 64 KB
 *     10 MB    679 ms   1228 MB/s        84
 *
 * A curva sobe ate 256 KB e DESCE depois. O palpite comum -- "bloco maior copia
 * mais rapido" -- e falso: passado o ponto em que a chamada de sistema ja se
 * diluiu, blocos grandes so pioram a localidade de cache.
 *
 * Ressalva: os numeros altos sao com o arquivo no cache do sistema, entao medem
 * o custo de chamada e de copia de memoria, nao o disco frio. A conclusao que
 * importa se sustenta assim mesmo -- bloco grande nao compra nada.
 *
 * O bloco tambem e a latencia do cancelamento: um bloco por vez. Com 256 KB
 * isso e imperceptivel ate num compartilhamento lento; com 10 MB a 5 MB/s
 * seriam 2 segundos ate o Parar responder.
 *
 * E parametro em CopiaArquivo(), nao valor fixo: e o que o FileCopy() do
 * NETSPOOL.PRG aprendeu em 2014 -- porta LPT, disco local e rede querem coisas
 * diferentes. Este e so o padrao.
 */
#define BLOCO_COPIA    ( 256 * 1024 )

#endif
