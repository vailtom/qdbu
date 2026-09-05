/*
 * job.prg - o rotulo de uma tarefa longa.
 *
 * POR QUE ISTO EXISTE
 *
 * `QDbu_JobBegin()` recebe UMA string, que a barra de tarefa mostra na tela. Ate
 * aqui as sete chamadas do projeto passavam a frase pronta e em portugues:
 *
 *     QDbu_JobBegin( "Exportando " + hb_FNameNameExt( cArq ), nTotal )
 *
 * Dois defeitos num so lugar.
 *
 * 1. TEXTO DE USUARIO NO HARBOUR. A regra do projeto e que nao exista nenhum --
 *    as 86 chamadas de Err() foram convertidas para codigo + parametros
 *    justamente por isso. A barra de tarefa escapou: o auditor
 *    (app/devtools/i18n.mjs) varre app/ui/js e nunca olhou os .prg, e a frase
 *    chega a tela como DADO, nao como chave. Quem trocasse o idioma via a tarefa
 *    em portugues.
 *
 * 2. CODEPAGE. O canal de progresso NAO passa pelo dispatcher -- ele existe
 *    justamente para ser lido com a VM ocupada. Entao o ConvertDeep() do
 *    dispatcher nunca tocou nesta string, e um nome de arquivo acentuado saia em
 *    CP850 por um canal que o Rust le como UTF-8. Com from_utf8_lossy, "JOÃO.DBF"
 *    virava "JO?O.DBF" sem erro em lugar nenhum.
 *
 * O FORMATO
 *
 * JSON de uma linha, em UTF-8, dentro dos 256 bytes do buffer:
 *
 *     {"c":"UI_JOB_EXPORTING","f":"NETCLI.csv"}
 *
 * `c` e a chave de traducao; `f` o unico parametro que estas mensagens
 * precisam (o nome do arquivo). A UI monta a frase no idioma de quem olha.
 *
 * Um rotulo que nao seja JSON continua sendo exibido cru pela UI -- e o que
 * torna esta mudanca segura de aplicar aos poucos.
 */

#include "hbclass.ch"

/*
 * O rotulo pronto para o QDbu_JobBegin().
 *
 * NOME CURTO, e nao o caminho completo: o buffer tem 256 bytes e o
 * hb_strncpy() do lado C corta por BYTE. Um corte no meio de um caractere
 * multibyte produziria UTF-8 invalido, que e exatamente o que o
 * from_utf8_lossy do Rust transformaria em lixo silencioso. Com o nome curto a
 * mensagem nao chega perto do limite.
 */
FUNCTION JobMsg( cCodigo, cArquivo )

   LOCAL hMsg := { => }

   hb_HKeepOrder( hMsg, .T. )
   hMsg[ "c" ] := cCodigo

   IF HB_ISSTRING( cArquivo ) .AND. ! Empty( cArquivo )
      hMsg[ "f" ] := hb_FNameNameExt( cArquivo )
   ENDIF

   /* ParaUtf8() aqui e nao no chamador: este e o unico ponto por onde o rotulo
      sai, entao e onde a conversao nao pode ser esquecida. */
   RETURN ParaUtf8( hb_jsonEncode( hMsg ) )
