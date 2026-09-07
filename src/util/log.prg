/*
 * log.prg - o registro do que o app fez nos arquivos do usuario.
 *
 * POR QUE ELE VEM ANTES DAS TELAS QUE ESCREVEM
 *
 * T10 (estrutura), T13 (operacoes em massa) e T14 (pack/zap) mexem no DBF do
 * cliente. Escrever o log DEPOIS delas significaria a primeira operacao
 * destrutiva rodando sem trilha -- e a pergunta que o log responde ("o que este
 * programa fez com o meu arquivo?") so tem valor se a resposta comeca antes do
 * estrago possivel. O original tinha isso e estava desligado: DBU.CH:16-17
 * aponta o log para `.\NUL`.
 *
 * UMA LINHA POR OPERACAO, EM JSON (JSONL)
 *
 * A alternativa obvia seria texto delimitado -- "hora | metodo | arquivo".
 * Nao serve: o que mais interessa registrar e a EXPRESSAO do filtro ou da
 * chave de indice, e ela pode conter qualquer caractere, inclusive o
 * delimitador. Um formato que quebra justamente no dado que motivou o registro
 * nao e formato. JSON escapa sozinho, o Harbour ja o gera nativo, e cada linha
 * continua legivel a olho nu e achavel com grep.
 *
 * UM ARQUIVO POR DIA, em `.qdbu/log/AAAA-MM-DD.jsonl`. Fica em `.qdbu/` e nao em
 * `.run/` de proposito: `.run/` e descartavel (cache, temporarios), e apagar o
 * log de operacoes nao pode ser efeito colateral de limpar cache.
 *
 * NADA AQUI PODE DERRUBAR UMA OPERACAO. Disco cheio, pasta somindo, arquivo
 * travado por outro processo -- o registro falha em silencio e a operacao segue.
 * Perder uma linha de log e ruim; perder a exportacao de 400 mil registros
 * porque o log nao pode escrever seria absurdo.
 */

#include "fileio.ch"

#define LOG_DIR   "log"

/*
 * Os metodos que valem registro: OS QUE MUDAM BYTES NO DISCO.
 *
 * A primeira lista era generosa -- abrir arquivo, abrir indice, ligar filtro,
 * trocar de ordem. Um dia de uso provou o erro: 25 das 36 linhas eram
 * `file.open`, quase todas disparadas sozinhas pela restauracao das abas ao
 * subir o app, e NENHUMA das 36 registrava algo que tivesse tocado um arquivo.
 * Um log assim falha do jeito que log falha -- ninguem le.
 *
 * O criterio agora e unico e verificavel: a operacao criou, alterou ou apagou
 * bytes em disco? Entra. Nao? Fica fora, por mais interessante que pareca.
 *
 * FORA, e de proposito: `workspace.*` (so anota uma pasta na arvore),
 * `file.open/close`, `index.open/close/setorder`, `filter.set/clear`, e toda a
 * navegacao e consulta. Nenhum deles altera nada.
 *
 * O FILTRO SAIU, e isso NAO custa auditoria -- desde que a operacao destrutiva
 * carregue o proprio escopo. "bulk.delete apagou 4.312 registros" sem dizer
 * QUAIS e inutil; entao a linha da destrutiva grava filtro ativo, ordem ativa e
 * contagem no instante do gatilho. E melhor do que a linha separada de
 * `filter.set`: o filtro pode ter sido trocado tres vezes antes de alguem puxar
 * o gatilho, e o que importa e o que valia na hora.
 *
 * Efeito colateral bom: um literal de senha digitado num filtro
 * (`USU_SENHA == '...'`) deixa de ser gravado. So sobrevive se alguem realmente
 * apagou registros por ele -- e ai tem de constar mesmo.
 *
 * `export.*` fica, apesar de nao alterar nada: cria arquivo novo, e e por onde o
 * dado SAI da maquina. E exatamente o que trilha de auditoria existe para
 * responder.
 *
 * A LISTA CRESCEU COM T10/T13/T14, como este comentario mandava -- com atraso:
 * as sete nasceram nas telas e nenhuma entrou aqui no commit em que nasceram.
 * Corrigido em 03/09/2026, a pedido do autor. Se uma operacao ALTERA o arquivo,
 * ela e log; nao ha excecao a lembrar.
 *
 * UMA LINHA POR OPERACAO, e nao por registro. Um REPLACE em 400 mil registros e
 * UM evento -- "repacei o campo X com a expressao Y no escopo Z, mexeu em N".
 * Registrar cada registro produziria um arquivo maior que o DBF e enterraria a
 * unica linha que interessa.
 */
STATIC FUNCTION MetodosRegistrados()
   RETURN { ;
      "index.create", ;
      "export.csv", "export.json", "export.xlsx", "export.dbf", ;
      "backup.run", ;
      "struct.create", "struct.modify", ;
      "bulk.pack", "bulk.zap", ;
      "mass.replace", "mass.delete", "mass.recall", "mass.appendfrom", ;
      "data.update", "data.append", "data.delete", "data.recall" }

/*
 * Os que escrevem NO ARQUIVO ABERTO -- o subconjunto que um handle somente
 * leitura tem de recusar.
 *
 * E um SUBCONJUNTO da lista acima, e a diferenca e exatamente "cria arquivo
 * novo" contra "muda este". `export.*` e `struct.create` produzem outro
 * arquivo; `backup.run` copia; `index.create` escreve um .ntx ao lado e nao
 * encosta no .DBF. Nenhum deles contraria a promessa de somente leitura, que e
 * sobre ESTE arquivo.
 *
 * Fica aqui, e nao no dispatcher, para as duas listas viverem lado a lado: sao
 * a mesma pergunta feita duas vezes -- "escreve?" e "escreve AQUI?" --, e
 * separa-las por arquivo faria a segunda ser esquecida quando a primeira
 * crescesse. Operacao destrutiva nova entra nas DUAS no mesmo commit.
 */
FUNCTION MetodosQueEscrevemNoArquivo()
   RETURN { ;
      "struct.modify", ;
      "bulk.pack", "bulk.zap", ;
      "mass.replace", "mass.delete", "mass.recall", "mass.appendfrom", ;
      "data.update", "data.append", "data.delete", "data.recall" }

/* <raiz>/.qdbu/log */
FUNCTION DirLog()

   LOCAL cDir := hb_DirSepAdd( DirConfigQDbu() ) + LOG_DIR

   IF ! hb_DirExists( cDir )
      hb_DirBuild( cDir )
   ENDIF

   RETURN cDir

/* O arquivo do dia. A troca de dia acontece sozinha, sem ninguem rotacionar. */
FUNCTION ArquivoLog( dDia )

   LOCAL d := iif( HB_ISDATE( dDia ) .AND. ! Empty( dDia ), dDia, Date() )

   RETURN hb_DirSepAdd( DirLog() ) + DToS( d ) + ".jsonl"

/*
 * Registra uma operacao.
 *
 * `hParams` vem como o chamador mandou. Nao ha filtragem de conteudo: o log
 * mora na mesma pasta do DBF e no mesmo dominio de confianca dele -- uma
 * expressao que cite um campo de senha nao expoe nada que o proprio arquivo ao
 * lado ja nao exponha. O que NAO entra sao os dados dos registros, que nunca
 * passam por aqui.
 */
FUNCTION LogOp( cMetodo, hParams, lOk, cCodigo, nMs, cArquivo, hErroParams, hResultado )

   LOCAL hLinha, cTexto, nHandle, oErr

   IF AScan( MetodosRegistrados(), {| c | c == cMetodo } ) == 0
      RETURN .F.
   ENDIF

   BEGIN SEQUENCE WITH {| e | Break( e ) }

      hLinha := { => }
      hb_HKeepOrder( hLinha, .T. )

      /* A data ja esta no nome do arquivo; repetir em cada linha so gastaria
         espaco num arquivo que pode ter milhares delas. */
      hLinha[ "t" ]  := Time()
      hLinha[ "m" ]  := cMetodo
      hLinha[ "ok" ] := hb_defaultValue( lOk, .T. )

      IF HB_ISSTRING( cArquivo ) .AND. ! Empty( cArquivo )
         hLinha[ "f" ] := cArquivo
      ENDIF

      /* O codigo da recusa entra: "o que este programa fez" inclui o que ele
         se RECUSOU a fazer, e por que. Uma exportacao barrada por SAME_FILE e
         parte da historia do arquivo. */
      IF ! hLinha[ "ok" ] .AND. HB_ISSTRING( cCodigo ) .AND. ! Empty( cCodigo )
         hLinha[ "erro" ] := cCodigo

         /*
          * Os parametros DA RECUSA, que nao sao os do pedido.
          *
          * A frase de ERROR_FILE_NOT_FOUND interpola {file}; o pedido mandou
          * `path`. Sem guardar os dois, o visualizador mostrava a mensagem com
          * o buraco por preencher -- "O arquivo '{file}' nao existe." Guardar
          * so o codigo obrigaria a tela a remontar o contexto; guardar os dois
          * deixa cada linha do log se explicar sozinha.
          */
         IF HB_ISHASH( hErroParams ) .AND. Len( hErroParams ) > 0
            hLinha[ "ep" ] := hErroParams
         ENDIF
      ENDIF

      IF HB_ISNUMERIC( nMs ) .AND. nMs >= 0
         hLinha[ "ms" ] := Int( nMs )
      ENDIF

      IF HB_ISHASH( hParams ) .AND. Len( hParams ) > 0
         hLinha[ "p" ] := hParams
      ENDIF

      /*
       * O DESFECHO, e nao so o pedido.
       *
       * O pedido diz `backup: true`; so o RESULTADO diz EM QUAL ARQUIVO a copia
       * ficou -- e e essa a pergunta que se faz ao log meses depois ("compactou
       * a tabela e fez backup? em que arquivo?"). O mesmo vale para as contas:
       * `changed`, `seen`, `before`/`after`. Sem isto o log conta a INTENCAO e
       * cala sobre o efeito.
       *
       * So dos metodos registrados, que ja e a lista curta, e os resultados
       * deles sao resumos de meia duzia de chaves -- nenhum carrega dado de
       * registro.
       */
      IF HB_ISHASH( hResultado ) .AND. Len( hResultado ) > 0
         hLinha[ "r" ] := hResultado
      ENDIF

      /* Convertido para UTF-8 aqui: o arquivo e lido por gente e por editor de
         texto, nao pelo dispatcher -- entao a conversao da saida nao passa por
         ele. Sem isto, um caminho com acento sai em CP850 num arquivo que todo
         mundo vai abrir como UTF-8. */
      cTexto := ParaUtf8( hb_jsonEncode( hLinha ) ) + hb_eol()

      nHandle := FOpen( ArquivoLog(), FO_WRITE + FO_SHARED )
      IF nHandle == F_ERROR
         nHandle := FCreate( ArquivoLog() )
      ELSE
         FSeek( nHandle, 0, FS_END )
      ENDIF

      IF nHandle != F_ERROR
         FWrite( nHandle, cTexto )
         FClose( nHandle )
      ENDIF

   RECOVER USING oErr
      HB_SYMBOL_UNUSED( oErr )
      RETURN .F.
   END SEQUENCE

   RETURN .T.
