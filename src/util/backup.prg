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
#include "set.ch"


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
FUNCTION CopiaArquivo( cOrigem, cDestino, nBloco, bEvento, nCopiados, lExclusivo )

   LOCAL nIn, nOut, nLido, nErro, nEscrito, nDone
   LOCAL nTotal, nFeito := 0
   LOCAL cBuf, nQuero
   LOCAL nModo

   nBloco := Max( 4096, Min( hb_defaultValue( nBloco, BLOCO_COPIA ), 32 * 1024 * 1024 ) )
   nCopiados := 0

   /*
    * EXCLUSIVO por padrao, e o padrao importa.
    *
    * Esta via so roda com o arquivo FORA da work area -- fechado por nos, para
    * uma operacao exclusiva. Abrir compartilhado ali deixaria outro processo
    * gravar no meio da copia, e o resultado seria um borrao no tempo em vez de
    * um retrato: metade do arquivo de antes, metade de depois, sem nada
    * indicando isso.
    *
    * O Harbour abre a origem COMPARTILHADA no proprio __CopyFile (rtl/copyfile.c),
    * mas ele e um COPY FILE de uso geral, que escolheu "sempre conseguir copiar"
    * em vez de "garantir consistencia". Backup escolhe o contrario: se alguem
    * esta com o arquivo, falhar e a resposta certa.
    */
   nModo := iif( hb_defaultValue( lExclusivo, .T. ), ;
                 FO_READ + FO_EXCLUSIVE, FO_READ + FO_SHARED )

   nIn := FOpen( cOrigem, nModo )
   IF nIn == F_ERROR
      RETURN Err( "ERROR_BACKUP_READ_FAILED", "cannot open source", "path", ;
                  { "file" => hb_FNameNameExt( cOrigem ), "os" => FError() } )
   ENDIF

   /* O tamanho vem do HANDLE que vai ser lido, e nao do nome: e ele que define
      quanto falta a cada volta, e um hb_FSize() no nome poderia responder sobre
      outra coisa entre uma chamada e outra. */
   nTotal := FSeek( nIn, 0, FS_END )
   FSeek( nIn, 0, FS_SET )

   nOut := FCreate( cDestino )
   IF nOut == F_ERROR
      nErro := FError()
      FClose( nIn )
      RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "cannot create backup", "path", ;
                  { "file" => hb_FNameNameExt( cDestino ), "os" => nErro } )
   ENDIF

   IF HB_ISBLOCK( bEvento )
      Eval( bEvento, 0, nTotal )
   ENDIF

   DO WHILE nFeito < nTotal

      /*
       * PEDE EXATAMENTE O QUE FALTA, e por isso ler menos E erro.
       *
       * Pedindo sempre o bloco inteiro, uma leitura curta significa duas coisas
       * -- fim de arquivo ou falha -- e nao ha como distinguir. Calculando o
       * resto, a ambiguidade some: se pedi 700 KB porque e o que falta e vieram
       * 300 KB, algo deu errado. E o desenho do FileCopy() do NETSPOOL.PRG.
       */
      nQuero := Min( nBloco, nTotal - nFeito )
      cBuf := Space( nQuero )

      nLido := FRead( nIn, @cBuf, nQuero )

      IF nLido != nQuero
         nErro := FError()
         FClose( nIn )
         FClose( nOut )
         Descarta( cDestino )
         RETURN Err( "ERROR_BACKUP_READ_FAILED", "short read", "path", ;
                     { "file" => hb_FNameNameExt( cOrigem ), "os" => nErro } )
      ENDIF

      /*
       * GRAVACAO PARCIAL E NORMAL, e insistir e obrigatorio.
       *
       * FWrite pode gravar menos que o pedido -- e o caso comum em
       * compartilhamento de rede. A versao anterior tratava isso como falha
       * fatal e APAGAVA a copia: a rotina que existe para nao perder backup,
       * perdendo backup por um comportamento previsto do sistema. O
       * __CopyFile do Harbour insiste num laco interno; aqui tambem.
       */
      nEscrito := 0
      DO WHILE nEscrito < nLido
         nDone := FWrite( nOut, SubStr( cBuf, nEscrito + 1, nLido - nEscrito ), ;
                          nLido - nEscrito )
         IF nDone <= 0
            nErro := FError()
            FClose( nIn )
            FClose( nOut )
            Descarta( cDestino )
            RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "write failed", "path", ;
                        { "file" => hb_FNameNameExt( cDestino ), "os" => nErro } )
         ENDIF
         nEscrito += nDone
      ENDDO

      nFeito += nLido

      IF HB_ISBLOCK( bEvento )
         Eval( bEvento, nFeito, nTotal )
      ENDIF

      /* Entre pedacos, nunca no meio de um. R1 de docs/10-integridade.md. */
      IF Dbu_Canceled()
         FClose( nIn )
         FClose( nOut )
         /* R3: cancelar nao deixa lixo. Copia pela metade e pior que nenhuma,
            porque parece existir. */
         Descarta( cDestino )
         RETURN Err( "WARN_CANCELED_BACKUP", "canceled by user", , ;
                     { "file" => hb_FNameNameExt( cOrigem ) } )
      ENDIF
   ENDDO

   FClose( nIn )

   /*
    * O FCLOSE DO DESTINO E CHECADO, e nao e formalidade.
    *
    * E nele que o ultimo buffer vai para o disco -- entao disco cheio,
    * compartilhamento que caiu e cota estourada aparecem AQUI, e nao nos FWrite
    * anteriores, que so encheram o buffer do sistema.
    */
   FError( 0 )
   FClose( nOut )
   nErro := FError()

   IF nErro != 0
      Descarta( cDestino )
      RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "flush failed on close", "path", ;
                  { "file" => hb_FNameNameExt( cDestino ), "os" => nErro } )
   ENDIF

   nCopiados := nFeito

   RETURN NIL


/*
 * Apaga uma copia abandonada, e RECLAMA se nao conseguir.
 *
 * A R3 diz que cancelar nao deixa lixo. Um FErase() sem conferencia transforma
 * isso em intencao: se o arquivo estiver travado por um antivirus ou por uma
 * indexacao do sistema, sobra um backup pela metade, e ele parece um backup
 * bom -- que e exatamente o caso contra o qual a regra existe.
 *
 * Nao levanta erro: quem chama ja esta devolvendo uma recusa. Devolve .F. para
 * o chamador poder dizer o que ficou para tras.
 */
FUNCTION Descarta( cArquivo )

   IF ! hb_FileExists( cArquivo )
      RETURN .T.
   ENDIF

   FErase( cArquivo )

   RETURN ! hb_FileExists( cArquivo )


/*
 * Confere que a copia ficou de pe.
 *
 * COMPARA COM O QUE FOI ESCRITO, e nao com o tamanho da origem relido agora.
 *
 * A primeira versao fazia `hb_FSize( origem ) != hb_FSize( copia )`. Parece a
 * conferencia obvia e e uma armadilha: o DBF esta aberto em modo COMPARTILHADO,
 * entao outro processo pode ter acrescentado registros durante a copia. A
 * origem cresce, a copia -- que esta integra, com tudo o que existia quando
 * comecou -- passa a "divergir", e a rotina APAGA um backup bom.
 *
 * Numa base viva de cliente, isso e o modo de falha mais provavel de todos: o
 * momento em que alguem quer backup e exatamente o momento de movimento.
 *
 * O que se afirma aqui e o que a copia PODE afirmar: cada byte lido foi
 * escrito, e o arquivo no disco tem esse tamanho. Se a origem cresceu no
 * caminho, a copia e um retrato consistente do instante em que comecou -- que e
 * o que um backup e.
 *
 * O tamanho do arquivo em disco ainda e conferido contra os bytes escritos:
 * FCreate bem-sucedido seguido de disco cheio deixa um arquivo truncado, e um
 * backup truncado e pior que backup nenhum, porque parece existir.
 */
FUNCTION BackupConfere( cCopia, nEscritos )

   LOCAL nDisco

   IF ! hb_FileExists( cCopia )
      RETURN Err( "ERROR_BACKUP_MISSING", "backup file was not created", , ;
                  { "file" => hb_FNameNameExt( cCopia ) } )
   ENDIF

   nDisco := hb_FSize( cCopia )

   /* -1 e "nao pude medir", que NAO e "esta certo". Sem esta distincao, um
      compartilhamento de rede que engasga faria Max( 0, -1 ) virar 0 e, num
      arquivo vazio, o backup passaria sem nada ter sido conferido. */
   IF nDisco < 0
      RETURN Err( "ERROR_BACKUP_UNVERIFIABLE", "cannot stat the copy", , ;
                  { "file" => hb_FNameNameExt( cCopia ) } )
   ENDIF

   IF HB_ISNUMERIC( nEscritos ) .AND. nDisco != nEscritos
      RETURN Err( "ERROR_BACKUP_SIZE_MISMATCH", "backup size differs", , ;
                  { "file"     => hb_FNameNameExt( cCopia ), ;
                    "expected" => nEscritos, ;
                    "got"      => nDisco } )
   ENDIF

   RETURN NIL


/*
 * Copia por REGISTRO, para arquivo que esta aberto.
 *
 * POR QUE ESTA EXISTE, ALEM DA COPIA DE BYTES
 *
 * A copia de bytes precisa abrir o arquivo com FOpen, e isso e impossivel
 * quando o RDD o mantem aberto EXCLUSIVO -- o Windows nega o segundo handle
 * mesmo sendo o proprio processo, porque a restricao e do handle. E o pre-voo
 * roda justamente antes de PACK/ZAP, que exigem exclusivo. Ou seja: a copia de
 * bytes falha exatamente no caso que motiva o backup.
 *
 * Esta le pela WORK AREA. Nao ha handle emprestado, nao ha janela de fechamento,
 * e o que se le ja passou pelos buffers do RDD -- some a dependencia de
 * dbCommit() e o risco de cabecalho velho.
 *
 * FIDELIDADE: e o que separa isto de um `export.dbf`
 *
 * Um COPY TO comum nao serve de backup. Com SET DELETED ON ele descarta os
 * registros marcados -- o backup nasceria ja packado, inutil para desfazer
 * justamente um PACK. E com filtro ou indice ativos, ele copia um recorte na
 * ordem do indice, e os numeros de registro mudam.
 *
 * Entao aqui, de proposito:
 *
 *   SET DELETED OFF     todo registro entra
 *   dbClearFilter()     nenhum recorte
 *   ordSetFocus( 0 )    ordem FISICA, para RecNo() bater
 *   Deleted() -> dbDelete()   a marca acompanha o registro
 *
 * Quem chama e responsavel por restaurar filtro, ordem e SET DELETED depois --
 * e por isso esta funcao vive atras do rebind.prg, que ja faz isso.
 *
 * O QUE ELA NAO PRESERVA, e nao tem como
 *
 * O cabecalho e NOVO: a data de gravacao vira hoje. Os bytes de folga e
 * qualquer lixo entre registros somem. Para restaurar um PACK isso e
 * irrelevante -- o que importa sao os registros, as marcas e os numeros, e os
 * tres sobrevivem.
 */
FUNCTION CopiaPorRegistro( cDestino, bEvento )

   LOCAL nOrigem := Select()
   LOCAL aEstru  := dbStruct()
   LOCAL nTotal  := LastRec()
   LOCAL nDestino, oErr, i, aValores, nFeitos := 0
   LOCAL lDelAntes := Set( _SET_DELETED )
   LOCAL nOrdAntes := IndexOrd()
   LOCAL cFiltro   := dbFilter()
   LOCAL xErro     := NIL

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbCreate( cDestino, aEstru )     /* cria o .DBT junto quando ha memo */
   RECOVER USING oErr
      RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "could not create the copy", "path", ;
                  { "file" => hb_FNameNameExt( cDestino ), ;
                    "reason" => DescricaoDoErro( oErr ) } )
   END SEQUENCE

   BEGIN SEQUENCE WITH {| e | Break( e ) }
      dbUseArea( .T., , cDestino, NIL, .F., .F. )   /* exclusivo: e nosso */
   RECOVER USING oErr
      Descarta( cDestino )
      RETURN Err( "ERROR_BACKUP_WRITE_FAILED", "copy created but could not be opened", ;
                  "path", { "file" => hb_FNameNameExt( cDestino ), ;
                            "reason" => DescricaoDoErro( oErr ) } )
   END SEQUENCE

   nDestino := Select()
   dbSelectArea( nOrigem )

   /* Neutraliza o recorte. Restaurado no fim, sempre. */
   Set( _SET_DELETED, .F. )
   dbClearFilter()
   ordSetFocus( 0 )
   dbGoTop()

   DO WHILE ! Eof()

      aValores := {}
      FOR i := 1 TO Len( aEstru )
         AAdd( aValores, FieldGet( i ) )
      NEXT

      dbSelectArea( nDestino )
      dbAppend()
      FOR i := 1 TO Len( aValores )
         FieldPut( i, aValores[ i ] )
      NEXT
      dbSelectArea( nOrigem )

      /* A marca de deletado E dado: sem ela o backup vira um PACK. */
      IF Deleted()
         dbSelectArea( nDestino )
         dbDelete()
         dbSelectArea( nOrigem )
      ENDIF

      nFeitos++

      IF nFeitos % 500 == 0
         IF HB_ISBLOCK( bEvento )
            Eval( bEvento, nFeitos, nTotal )
         ENDIF
         IF Dbu_Canceled()
            xErro := Err( "WARN_CANCELED_BACKUP", "canceled by user", , ;
                          { "file" => hb_FNameNameExt( cDestino ) } )
            EXIT
         ENDIF
      ENDIF

      dbSkip( 1 )
   ENDDO

   dbSelectArea( nDestino )
   dbCloseArea()
   dbSelectArea( nOrigem )

   /* Restaura o ambiente da origem ANTES de qualquer saida. */
   Set( _SET_DELETED, lDelAntes )
   IF nOrdAntes > 0
      ordSetFocus( nOrdAntes )
   ENDIF
   IF ! Empty( cFiltro )
      BEGIN SEQUENCE WITH {| e | Break( e ) }
         dbSetFilter( hb_macroBlock( cFiltro ), cFiltro )
      RECOVER
      END SEQUENCE
   ENDIF

   IF xErro != NIL
      Descarta( cDestino )      /* R3: cancelar nao deixa lixo */
      RETURN xErro
   ENDIF

   IF HB_ISBLOCK( bEvento )
      Eval( bEvento, nFeitos, nTotal )
   ENDIF

   RETURN NIL


/* A descricao de um erro do Harbour, ou vazio. */
STATIC FUNCTION DescricaoDoErro( oErr )
   RETURN iif( HB_ISOBJECT( oErr ) .AND. HB_ISSTRING( oErr:description ), ;
               oErr:description, "" )
