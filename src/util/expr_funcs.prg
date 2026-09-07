/*
 * expr_funcs.prg - funcoes que so aparecem dentro de EXPRESSAO.
 *
 * Este arquivo nao implementa nada. Ele existe pelos REQUEST -- e sem eles o
 * app quebra de um jeito que nao da para adivinhar.
 *
 * POR QUE: a chave de um NTX (e o filtro, na T6) e compilada em RUNTIME, quando
 * o indice abre. O linker decide o que entra no binario olhando o que o CODIGO
 * chama estaticamente. Uma funcao que so aparece dentro de uma expressao
 * guardada no cabecalho de um arquivo nao e chamada por ninguem -- e some.
 *
 * O sintoma nao aponta para a causa: o indice recusa com "Undefined function
 * PADR()", uma funcao PADRAO do Harbour, que existe e esta documentada. Ela so
 * nao esta NESTE binario. Foi assim que IDACLI.ntx, um indice valido, ficou
 * inabrivel.
 *
 * A LISTA NAO E ADIVINHADA. Vem da referencia da linguagem do CA-Clipper 5.3
 * (itlnet.net/programming/program/reference/c53g01c, "Functions A-M" e
 * "Functions N-Z"), que e o que qualquer indice escrito na epoca pode citar --
 * nao so os das bases que temos a mao. Uma lista tirada do que apareceu nos
 * nossos arquivos recusaria SOUNDEX ou STUFF de outro cliente, com o mesmo erro
 * incompreensivel.
 *
 * FICAM DE FORA, de proposito:
 *   - tela, mouse, grafico, teclado (DISPBOX, MROW, G*, INKEY, ACHOICE...):
 *     nao existem numa expressao de dados, e a DLL nem tem console.
 *   - as que ALTERAM dados (DBDELETE, DBAPPEND, DBCREATE, FERASE, FWRITE...).
 *     Expressao de indice e codigo executado com privilegio total -- ver
 *     o modelo de confianca. Nao linkar o que destroi e uma barreira barata, e
 *     nenhum indice legitimo chama isso para montar uma chave.
 *   - IIF: e palavra-chave do compilador, nao funcao. O linker procuraria um
 *     HB_FUN_IIF que nao existe; expressoes com iif() ja compilam.
 *
 * Ao encontrar um indice recusado por funcao ausente, o conserto e acrescentar
 * o nome aqui. A mensagem de recusa ja diz qual e -- ver DescreveFalha() em
 * api_index.prg.
 */

REQUEST ABS, ACLONE, ACOPY, AEVAL, ALIAS, ALLTRIM, ARRAY, ASC
REQUEST ASCAN, ASORT, AT, ATAIL, ATNUM, BIN2I, BIN2L, BIN2W
REQUEST BOF, CDOW, CHR, CMONTH, CTOD, CURDIR, DATE, DAY
REQUEST DBFILTER, DBRELATION, DBRSELECT, DELETED, DESCEND, DIRECTORY, DISKNAME, DOW
REQUEST DTOC, DTOS, EMPTY, EOF, EVAL, EXP, FCOUNT, FIELDBLOCK
REQUEST FIELDGET, FIELDNAME, FIELDPOS, FIELDWBLOCK, FILE, FKLABEL, FKMAX, FOUND
REQUEST GETENV, HARDCR, HEADER, I2BIN, INDEXEXT, INDEXKEY, INDEXORD, INT
REQUEST ISALPHA, ISDIGIT, ISLOWER, ISUPPER, L2BIN, LASTREC, LEFT, LEN
REQUEST LOG, LOWER, LTRIM, LUPDATE, MAX, MEMOLINE, MEMOREAD, MEMOTRAN
REQUEST MEMVARBLOCK, MIN, MLCOUNT, MOD, MONTH, NETERR, NETNAME, NUMAT
REQUEST ORDBAGEXT, ORDBAGNAME, ORDDESCEND, ORDFOR, ORDISUNIQUE, ORDKEY, ORDKEYCOUNT, ORDKEYNO
REQUEST ORDKEYVAL, ORDNAME, ORDNUMBER, OS, PAD, PADC, PADL, PADR
REQUEST PCOUNT, PROCLINE, PROCNAME, RAT, RDDNAME, RECCOUNT, RECNO, RECSIZE
REQUEST REPLICATE, RIGHT, ROUND, RTRIM, SECONDS, SELECT, SOUNDEX, SPACE
REQUEST SQRT, STOD, STR, STRTRAN, STRZERO, STUFF, SUBSTR, TIME, TRANSFORM
REQUEST TRIM, TYPE, UPDATED, UPPER, USED, VAL, VALTYPE, VERSION
REQUEST WORD, YEAR

/*
 * Um modulo so com REQUEST compila para NADA -- o C gerado sai vazio ("unidade
 * de traducao vazia") e os REQUEST somem junto, sem adiantar coisa alguma. Foi
 * o que aconteceu na primeira tentativa: os REQUEST estavam certos e o indice
 * continuava recusando PADR().
 *
 * INIT PROCEDURE em vez de funcao solta: e chamada na subida da VM, entao o
 * linker nao tem como decidir que o modulo e dispensavel.
 */
/*
 * O ESPELHO DO REQUEST, para runtime.
 *
 * REQUEST exige identificador literal e a VM nao sabe enumera-lo. Esta lista
 * existe para `expr.functions` responder o que linka, e para o gerador do
 * catalogo (app/devtools/catalogo.mjs) conferir que oferece so o que existe.
 * E a MESMA lista duas vezes, de proposito -- e o gerador FALHA se as duas
 * divergirem, entao esquecer um lado nao passa em silencio.
 *
 * STOD entrou nas duas em 07/09/2026: o filtro guiado ja emitia SToD() e so
 * linkava por acidente de outro modulo chamar hb_SToD.
 */
FUNCTION ExprFuncsLista()
   RETURN { ;
      "ABS", "ACLONE", "ACOPY", "AEVAL", "ALIAS", "ALLTRIM", "ARRAY", "ASC", ;
      "ASCAN", "ASORT", "AT", "ATAIL", "ATNUM", "BIN2I", "BIN2L", "BIN2W", ;
      "BOF", "CDOW", "CHR", "CMONTH", "CTOD", "CURDIR", "DATE", "DAY", ;
      "DBFILTER", "DBRELATION", "DBRSELECT", "DELETED", "DESCEND", "DIRECTORY", "DISKNAME", "DOW", ;
      "DTOC", "DTOS", "EMPTY", "EOF", "EVAL", "EXP", "FCOUNT", "FIELDBLOCK", ;
      "FIELDGET", "FIELDNAME", "FIELDPOS", "FIELDWBLOCK", "FILE", "FKLABEL", "FKMAX", "FOUND", ;
      "GETENV", "HARDCR", "HEADER", "I2BIN", "INDEXEXT", "INDEXKEY", "INDEXORD", "INT", ;
      "ISALPHA", "ISDIGIT", "ISLOWER", "ISUPPER", "L2BIN", "LASTREC", "LEFT", "LEN", ;
      "LOG", "LOWER", "LTRIM", "LUPDATE", "MAX", "MEMOLINE", "MEMOREAD", "MEMOTRAN", ;
      "MEMVARBLOCK", "MIN", "MLCOUNT", "MOD", "MONTH", "NETERR", "NETNAME", "NUMAT", ;
      "ORDBAGEXT", "ORDBAGNAME", "ORDDESCEND", "ORDFOR", "ORDISUNIQUE", "ORDKEY", "ORDKEYCOUNT", "ORDKEYNO", ;
      "ORDKEYVAL", "ORDNAME", "ORDNUMBER", "OS", "PAD", "PADC", "PADL", "PADR", ;
      "PCOUNT", "PROCLINE", "PROCNAME", "RAT", "RDDNAME", "RECCOUNT", "RECNO", "RECSIZE", ;
      "REPLICATE", "RIGHT", "ROUND", "RTRIM", "SECONDS", "SELECT", "SOUNDEX", "SPACE", ;
      "SQRT", "STOD", "STR", "STRTRAN", "STRZERO", "STUFF", "SUBSTR", "TIME", ;
      "TRANSFORM", "TRIM", "TYPE", "UPDATED", "UPPER", "USED", "VAL", "VALTYPE", ;
      "VERSION", "WORD", "YEAR" }

INIT PROCEDURE ExprFuncsLink()
   RETURN
