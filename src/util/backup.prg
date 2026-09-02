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
 * O conjunto de arquivos que andam junto com um DBF.
 *
 * Devolve um array de { "path", "bytes", "role" }. `role` distingue o que e
 * insubstituivel (dbf, memo) do que e regeravel (index) -- mas TUDO entra no
 * backup, porque regerar um indice exige a chave, e a chave mora no arquivo que
 * se perderia.
 */
FUNCTION ConjuntoDoArquivo( cDbf, aIndices )

   LOCAL aSet := {}
   LOCAL cMemo, cIdx

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

   IF HB_ISARRAY( aIndices )
      FOR EACH cIdx IN aIndices
         IF HB_ISSTRING( cIdx ) .AND. hb_FileExists( cIdx )
            AAdd( aSet, { "path" => cIdx, ;
                          "bytes" => Max( 0, hb_FSize( cIdx ) ), ;
                          "role" => "index" } )
         ENDIF
      NEXT
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
 * O nome do backup: NOME_AAAAMMDD_HHMMSS.ext.bak
 *
 * AO LADO DO ORIGINAL, e nao dentro do projeto: o conjunto pode ter centenas de
 * MB, e copiar entre volumes e lento e pode nao caber. Ao lado, a copia e no
 * mesmo disco e a restauracao e uma renomeacao.
 *
 * COM CARIMBO DE HORA, e nao um `.bak` unico. A razao de existir da R4 e "nao
 * ficar sem volta"; um `.bak` que se sobrescreve faz a SEGUNDA operacao
 * destruir a unica copia da primeira -- que e precisamente a falha que a regra
 * existe para impedir. Os arquivos ficam visiveis na pasta do usuario de
 * proposito: quem ve, apaga quando quiser.
 *
 * A extensao original fica no nome (`.dbf.bak`, `.dbt.bak`) para o conjunto
 * poder ser remontado sem adivinhacao.
 */
FUNCTION NomeDoBackup( cArquivo, cCarimbo )

   LOCAL cSelo := iif( HB_ISSTRING( cCarimbo ) .AND. ! Empty( cCarimbo ), ;
                       cCarimbo, CarimboAgora() )

   RETURN hb_FNameDir( cArquivo ) + ;
          hb_FNameName( cArquivo ) + "_" + cSelo + ;
          hb_FNameExt( cArquivo ) + ".bak"


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
