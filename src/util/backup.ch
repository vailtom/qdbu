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

/* 1 MB por pedaco: grande o bastante para a copia nao virar sindrome de chamada
   de sistema, pequeno o bastante para o cancelamento responder rapido. */
#define BLOCO_COPIA    ( 1024 * 1024 )

#endif
