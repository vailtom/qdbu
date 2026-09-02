/*
 * backup.prg - o checklist que roda ANTES de qualquer operacao destrutiva.
 *
 * POR QUE ELE E O PRODUTO, E NAO UM DETALHE INTERNO
 *
 * A tentacao e tratar seguranca como motivo para nao fazer -- adiar a tela que
 * escreve, so oferecer leitura, "nao arriscar arquivo real". Isso nao e
 * seguranca: e uma ferramenta que nao serve. O DBU existe para PACK, ZAP e
 * alterar estrutura; recusar-se a faze-los e recusar-se a ser o DBU.
 *
 * Seguranca de verdade e um checklist que RODA e que APARECE. O usuario ve cada
 * conferencia, ve o resultado de cada uma, e confirma. Quem confirma sabendo o
 * que vai acontecer confia na ferramenta; quem clica num botao que "faz alguma
 * coisa" nao confia -- e com razao.
 *
 * A SEQUENCIA, e ela e curta:
 *
 *   1. Tem espaco em disco?      >= 3x o tamanho do conjunto
 *   2. Faz o backup.
 *   3. O backup deu certo?       se nao: ORIENTA e ABORTA
 *   4. O arquivo e grande?       se sim: avisa que a operacao demora e pede
 *                                confirmacao explicita
 *   5. Opera.
 *
 * O passo 3 e o que da valor a todos os outros. Um backup que falhou em
 * silencio e pior que backup nenhum, porque a operacao seguinte roda com a
 * confianca de quem acha que tem volta.
 *
 * POR QUE 3x E NAO 2x
 *
 * A R2 de docs/10-integridade.md manda o destrutivo trabalhar fora do lugar:
 * monta um `.tmp`, verifica, e so entao troca os nomes. Entao em algum instante
 * coexistem tres copias do conjunto -- o original, o backup e o temporario. Com
 * 2x a operacao morre no meio por disco cheio, que e exatamente o cenario onde
 * um arquivo fica pela metade.
 *
 * O CONJUNTO, e nao so o .DBF
 *
 * Memo e indice andam junto com o DBF e somem junto. O `.ntx` em especial:
 * a expressao da chave mora no CABECALHO dele, entao perder o arquivo perde a
 * definicao do indice -- nao ha de onde remontar. Backup que salva so o `.dbf`
 * devolve um arquivo que abre e nao serve.
 */

#include "fileio.ch"
#include "dbinfo.ch"
#include "backup.ch"


/*
 * O conjunto que o backup copia: O DADO, e so ele.
 *
 *   .dbf   os registros
 *   .dbt / .fpt   o memo -- DADO tambem, e insubstituivel: some junto e nao volta
 *
 * INDICE NAO ENTRA, e a primeira versao errava nisto.
 *
 * O argumento de entao era "a chave mora no cabecalho do .ntx, perder o arquivo
 * perde a definicao". Errado por quatro motivos:
 *
 *   1. Indice e DERIVADO. Regenera do .dbf mais a chave.
 *   2. A chave nao se perde: rebind.prg ja a captura como metadado (`key`,
 *      `for`) de cada indice aberto, e ela viaja no resultado do backup.
 *   3. Depois de um PACK o indice e RECONSTRUIDO. Guardar o antigo e guardar
 *      lixo.
 *   4. Restaurar um .ntx velho ao lado de um .dbf restaurado e PIOR que nao
 *      ter: ele parece valido e aponta para posicoes que nao existem mais.
 *
 * E ha o custo: uma pasta real tem 395 indices. Copia-los multiplicaria o
 * tamanho e o tempo do backup para produzir arquivos que devem ser jogados
 * fora na restauracao.
 */
FUNCTION ConjuntoDoArquivo( cDbf )

   LOCAL aSet := {}
   LOCAL cMemo

   AAdd( aSet, { "path" => cDbf, ;
                 "bytes" => Max( 0, hb_FSize( cDbf ) ), ;
                 "role" => "data" } )

   /* Nao existe DBI_ que devolva o CAMINHO do memo -- so o handle e a extensao.
      O nome se monta trocando a extensao do proprio DBF, que e como o RDD o
      acha. Ver o mesmo raciocinio em api_file.prg. */
   cMemo := hb_FNameExtSet( cDbf, dbInfo( DBI_MEMOEXT ) )
   IF hb_FileExists( cMemo )
      AAdd( aSet, { "path" => cMemo, ;
                    "bytes" => Max( 0, hb_FSize( cMemo ) ), ;
                    "role" => "memo" } )
   ENDIF

   RETURN aSet


/* Soma dos bytes do conjunto. */
FUNCTION BytesDoConjunto( aSet )

   LOCAL n := 0, h

   FOR EACH h IN aSet
      n += h[ "bytes" ]
   NEXT

   RETURN n


/*
 * Espaco livre no volume que contem o caminho.
 *
 * HB_DISK_AVAIL e nao HB_DISK_FREE: o que interessa e o que ESTE usuario pode
 * gravar, que sob cota de disco e menos que o livre total. Escolher errado aqui
 * produz o pior resultado possivel -- a conferencia passa e a copia morre no
 * meio.
 *
 * Devolve -1 quando nao da para saber (caminho de rede sem resposta, unidade
 * que sumiu). Quem chama trata -1 como "nao pude conferir", que e diferente de
 * "nao tem espaco".
 */
FUNCTION EspacoLivre( cCaminho )

   LOCAL cDir := hb_FNameDir( cCaminho )
   LOCAL nEspaco, oErr

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      nEspaco := hb_DiskSpace( iif( Empty( cDir ), hb_cwd(), cDir ), HB_DISK_AVAIL )
   RECOVER USING oErr
      HB_SYMBOL_UNUSED( oErr )
      RETURN -1
   END SEQUENCE

   RETURN iif( HB_ISNUMERIC( nEspaco ), nEspaco, -1 )


/*
 * O nome sugerido: NOME_AAAAMMDD_HHMMSS.DBF -- um DBF de verdade.
 *
 * SEM `.bak`, e isso foi uma correcao de rumo. A primeira versao gerava
 * `NETCLI_20260902_113446.DBF.bak`, e um backup que nao se consegue ABRIR e um
 * backup que nao se consegue CONFERIR: a lista de arquivos do DBU so mostra
 * *.dbf, entao a copia ficava invisivel dentro do proprio programa que a criou.
 * Com a extensao real ela aparece na arvore, abre, e da para ver os registros
 * -- que e a prova de que a copia presta.
 *
 * O preco e a pasta ficar com mais DBFs a vista. Ficar a vista e melhor que
 * ficar escondido: quem ve, confere e apaga quando quiser.
 *
 * COM CARIMBO DE HORA, e nao um nome fixo. A razao de existir da R4 e "nao
 * ficar sem volta"; um nome que se sobrescreve faz a SEGUNDA operacao destruir
 * a unica copia da primeira -- precisamente a falha que a regra existe para
 * impedir.
 *
 * E so uma SUGESTAO: no backup manual a pessoa edita o caminho inteiro, e o
 * memo acompanha a base que ela escolher.
 */
FUNCTION NomeDoBackup( cArquivo, cCarimbo, cDirDestino )

   LOCAL cSelo := iif( HB_ISSTRING( cCarimbo ) .AND. ! Empty( cCarimbo ), ;
                       cCarimbo, CarimboAgora() )
   LOCAL cDir := iif( HB_ISSTRING( cDirDestino ) .AND. ! Empty( cDirDestino ), ;
                      hb_DirSepAdd( cDirDestino ), hb_FNameDir( cArquivo ) )

   RETURN cDir + hb_FNameName( cArquivo ) + "_" + cSelo + hb_FNameExt( cArquivo )


/*
 * O destino de um arquivo do conjunto, dado o destino escolhido para o .DBF.
 *
 * O memo SEGUE A BASE do nome que a pessoa escolheu. Se ela renomear o destino
 * para `NETCLI_ANTES.DBF`, o memo tem de sair `NETCLI_ANTES.DBT` -- e o par que
 * faz o arquivo abrir. Manter o memo com o nome antigo produziria um DBF que
 * abre e cujos campos memo estao vazios, que e a pior forma de estar errado.
 */
FUNCTION DestinoDoMembro( cOrigem, cDestinoDbf, cPapel )

   IF cPapel == "data"
      RETURN cDestinoDbf
   ENDIF

   /* memo: mesma base do DBF de destino, extensao do memo de origem */
   RETURN hb_FNameExtSet( cDestinoDbf, hb_FNameExt( cOrigem ) )


/*
 * Os dois caminhos estao no mesmo volume?
 *
 * Compara a raiz -- letra de unidade, ou o par servidor+compartilhamento numa
 * UNC. Importa porque decide DUAS coisas: de qual volume medir o espaco, e se o
 * temporario da operacao seguinte disputa espaco com o backup ou nao.
 */
FUNCTION MesmoVolume( c1, c2 )
   RETURN Upper( RaizDoVolume( c1 ) ) == Upper( RaizDoVolume( c2 ) )


/*
 * A raiz do volume: "J:" para um caminho local, "\\servidor\share" numa UNC.
 *
 * SEM LITERAL DE BARRA INVERTIDA. No Harbour a barra invertida NAO e escape em
 * string comum, entao "\\" sao DUAS barras e nao uma -- e um `"\"` no fim de
 * uma string e um convite a confusao para quem le. Chr( 92 ) diz exatamente o
 * que e, e nao muda de significado conforme quem le o codigo. Mesma razao do
 * SEP_BARRA em app/ui/js/app.js.
 */
STATIC FUNCTION RaizDoVolume( cCaminho )

   LOCAL cBarra := Chr( 92 )
   LOCAL c := StrTran( hb_defaultValue( cCaminho, "" ), "/", cBarra )
   LOCAL nServidor, nShare

   /* UNC: as duas primeiras barras, o servidor, e o compartilhamento. Nao para
      no servidor: dois compartilhamentos do mesmo servidor podem estar em discos
      diferentes, e e o disco que tem espaco livre. */
   IF Left( c, 2 ) == cBarra + cBarra
      nServidor := At( cBarra, SubStr( c, 3 ) )
      IF nServidor == 0
         RETURN c                                  /* so o servidor */
      ENDIF
      nShare := At( cBarra, SubStr( c, 3 + nServidor ) )
      RETURN iif( nShare == 0, c, Left( c, 2 + nServidor + nShare - 1 ) )
   ENDIF

   /* Local: a letra e os dois-pontos. Caminho relativo nao tem raiz -- devolve
      vazio, e quem compara trata como "nao da para saber". */
   RETURN iif( Len( c ) >= 2 .AND. SubStr( c, 2, 1 ) == ":", Left( c, 2 ), "" )


/* AAAAMMDD_HHMMSS. Um so por operacao, para o conjunto inteiro sair com o mesmo
   selo e ser reconhecivel como um grupo. */
FUNCTION CarimboAgora()
   RETURN DToS( Date() ) + "_" + StrTran( Time(), ":", "" )


/*
 * Copia um arquivo, com progresso e cancelamento.
 *
 * POR QUE NAO __CopyFile() / hb_vfCopyFile()
 *
 * As duas copiam e voltam. Um conjunto de 400 MB levaria segundos com a thread
 * da VM presa la dentro -- e a thread da VM e UMA SO. A UI inteira congela, nao
 * so esta operacao (Risco 5 do plano), e o botao Parar nao tem como ser
 * atendido, porque quem o atenderia esta dentro da copia.
 *
 * Em pedacos, o laco reporta progresso e consulta o cancelamento entre um
 * pedaco e outro. Nao e otimizacao: e o que torna a copia interrompivel.
 *
 * Devolve NIL em sucesso, ou a recusa pronta.
 */
FUNCTION CopiaArquivo( cOrigem, cDestino, nJaFeito, nTotalGeral )

   LOCAL nIn, nOut, cBuf, nLido
   LOCAL nFeito := hb_defaultValue( nJaFeito, 0 )

   nIn := FOpen( cOrigem, FO_READ + FO_SHARED )
   IF nIn == F_ERROR
      RETURN Err( "ERROR_BACKUP_READ_FAILED", "cannot read source", "path", ;
                  { "file" => hb_FNameNameExt( cOrigem ) } )
   ENDIF

   nOut := FCreate( cDestino )
   IF nOut == F_ERROR
      FClose( nIn )
      RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "cannot create backup", "path", ;
                  { "file" => hb_FNameNameExt( cDestino ) } )
   ENDIF

   DO WHILE .T.
      cBuf := Space( BLOCO_COPIA )
      nLido := FRead( nIn, @cBuf, BLOCO_COPIA )

      IF nLido <= 0
         EXIT
      ENDIF

      IF FWrite( nOut, cBuf, nLido ) != nLido
         FClose( nIn )
         FClose( nOut )
         FErase( cDestino )
         RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "short write", "path", ;
                     { "file" => hb_FNameNameExt( cDestino ) } )
      ENDIF

      nFeito += nLido
      IF HB_ISNUMERIC( nTotalGeral ) .AND. nTotalGeral > 0
         Dbu_Progress( nFeito )
      ENDIF

      /* Entre pedacos, nunca no meio de um. R1 de docs/10-integridade.md. */
      IF Dbu_Canceled()
         FClose( nIn )
         FClose( nOut )
         /* R3: cancelar nao deixa lixo. Um .bak pela metade e pior que nenhum,
            porque parece existir. */
         FErase( cDestino )
         RETURN Err( "WARN_CANCELED_BACKUP", "canceled by user", , ;
                     { "file" => hb_FNameNameExt( cOrigem ) } )
      ENDIF
   ENDDO

   FClose( nIn )
   FClose( nOut )

   RETURN NIL


/*
 * Confere que a copia ficou de pe.
 *
 * Tamanho igual, e nao so "o arquivo existe". FCreate() bem-sucedido seguido de
 * disco cheio deixa um arquivo -- vazio, ou truncado. Um backup que existe e
 * esta truncado e a pior das tres possibilidades, porque a operacao seguinte
 * roda com a confianca de quem acha que tem volta.
 *
 * Nao se compara conteudo: ler 400 MB de novo dobraria o tempo do backup para
 * defender de um caso (disco que confirma gravacao e devolve outra coisa) em
 * que nada mais neste programa funcionaria de qualquer modo.
 */
FUNCTION BackupConfere( cOrigem, cCopia )

   LOCAL nOrig, nCopia

   IF ! hb_FileExists( cCopia )
      RETURN Err( "ERROR_BACKUP_MISSING", "backup file was not created", , ;
                  { "file" => hb_FNameNameExt( cCopia ) } )
   ENDIF

   nOrig  := Max( 0, hb_FSize( cOrigem ) )
   nCopia := Max( 0, hb_FSize( cCopia ) )

   IF nOrig != nCopia
      RETURN Err( "ERROR_BACKUP_SIZE_MISMATCH", "backup size differs", , ;
                  { "file"     => hb_FNameNameExt( cCopia ), ;
                    "expected" => nOrig, ;
                    "got"      => nCopia } )
   ENDIF

   RETURN NIL
