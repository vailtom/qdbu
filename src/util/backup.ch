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
 * A R2 de docs/10-integridade.md manda o destrutivo trabalhar fora do lugar:
 * monta um .tmp, verifica, e so entao troca os nomes. Em algum instante
 * coexistem TRES copias do conjunto -- original, backup e temporario. Com 2x a
 * operacao morre no meio por disco cheio, que e o cenario onde um arquivo fica
 * pela metade.
 */
#define FATOR_ESPACO   3

/* 256 MB. Acima disto a operacao pede confirmacao explicita. Nao e limite
   tecnico: e o ponto em que a espera deixa de ser instantanea, e a pessoa
   merece saber antes de comecar, nao depois. */
#define GRANDE_BYTES   ( 256 * 1024 * 1024 )

/* 1 MB por pedaco: grande o bastante para a copia nao virar sindrome de chamada
   de sistema, pequeno o bastante para o cancelamento responder rapido. */
#define BLOCO_COPIA    ( 1024 * 1024 )

#endif
