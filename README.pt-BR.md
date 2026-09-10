[English](README.md) · **Português** · [Español](README.es.md)

# QDbu

**QDbu** é um utilitário portátil para inspecionar, editar e manter arquivos DBF
do dBase e do Clipper.

Interface moderna, um app sem limites com um construtor de expressões embutido
que conhece os campos do seu arquivo — com IA opcional para escrever, corrigir e
alterar a expressão.

Ele abre DBFs diretamente, trabalha registro a registro, manipula índices NTX,
filtros, alterações de estrutura, PACK e ZAP, além de importar e exportar
formatos comuns de dados. Foi feito para arquivos que continuam em uso:
inclusive tabelas grandes, caminhos de rede, convenções antigas de nomes e
codepages diferentes.

## Construa expressões xBase em vez de digitá-las às cegas

Seis pontos do QDbu abrem o construtor de expressões: o filtro da tabela, a
chave do índice e o FOR dele, o WITH do repacar em massa, e o FOR e o WHILE que
delimitam toda operação em massa — repacar, excluir, recuperar e incluir de.

O novo construtor de expressões coloca ao lado do editor os campos do DBF atual,
todos os operadores e um catálogo de **126 funções Harbour/xBase**. Cada item tem
um nome em linguagem comum, uma explicação curta e termos de busca em inglês,
português e espanhol.

A lista é ordenada pelo tipo esperado pela expressão que está sendo editada, sem
esconder as demais opções. O IntelliSense acompanha o cursor, mostra a assinatura
da função atual e destaca o argumento que está sendo informado.

O catálogo de funções é gerado a partir dos próprios blocos de documentação
`$DOC$` do Harbour. Notações de parâmetros como `<cString>`, `<nStart>` e
`[<nLen>]` são usadas para identificar tipos de argumentos e parâmetros
opcionais.

O QDbu também verifica a expressão antes de usá-la. Um campo digitado errado
recebe uma sugestão em vez de virar um beco sem saída, e uma expressão válida é
avaliada no registro que está atualmente na tela:

> ✓ Expressão válida. No registro 270 o resultado é Sim.

Um assistente opcional de IA pode construir as mesmas expressões a partir de
linguagem natural. Por exemplo:

> clientes de SP ou MG com CGC preenchido

vira:

```xbase
(CLI_EST == "SP" .OR. CLI_EST == "MG") .AND. !Empty(CLI_CGC)
```

Ele também pode corrigir uma expressão que não compila ou alterar uma expressão
existente, como em "inclua também MG".

O assistente nunca aplica uma alteração sozinho. A resposta vira um rascunho
editável, pode ser desfeita em um passo e passa pela mesma validação de uma
expressão digitada manualmente.

Nenhum registro do DBF é enviado ao assistente. Saem da máquina apenas o pedido,
os nomes e tipos dos campos e o catálogo de funções. Se o que foi pedido não
puder ser associado a um campo existente, o assistente pergunta qual campo deve
usar em vez de inventar um.

O assistente é **opcional e exige uma chave de API do próprio usuário**. Ele
suporta OpenAI, uma instância local do Ollama ou outro endpoint compatível com o
formato Chat Completions. Sem uma chave configurada, o assistente não funciona e
o restante do QDbu continua funcionando normalmente.

## O que ele faz

- **Abre e navega** DBF de qualquer tamanho, com paginação real. Um arquivo de
  421 mil registros abre no mesmo tempo que um de sete.
- **Edita** registro a registro, na grade ou no formulário.
- **Filtra** por expressão ou por um construtor guiado.
- **Indexa**: abre `.ntx` existentes, cria novos, escolhe a ordem ativa.
- **Altera estrutura**, compacta (PACK) e esvazia (ZAP).
- **Exporta** para CSV, JSON, XLSX e DBF; **importa** de CSV e JSON.

## Feito para os DBFs que existem no mundo real

O QDbu trata a escolha de codepage por arquivo. Estão disponíveis CP850,
Windows-1252, ISO-8859-1, CP860 e UTF-8, com resolução na ordem
arquivo → conexão → global. O byte de language driver do DBF, no offset 29, é
usado como sugestão, não como resposta definitiva; muitos DBFs de Clipper
simplesmente contêm `0x00`.

Essa diferença importa na edição. Ler um DBF gravado no Windows usando uma
codepage DOS não é apenas um problema de exibição: o próximo REPLACE pode gravar
o byte errado de volta no disco.

Arquivos NTX são associados pela expressão da chave, não pelo nome do arquivo.
Assim, um `NETCLI.DBF` pode usar `ID1CLI.NTX` ou qualquer outra convenção. O QDbu
lê o cabeçalho do índice e verifica se os campos citados pela expressão existem
no DBF aberto.

Funções usadas apenas dentro de expressões compiladas em runtime são linkadas
explicitamente no programa. Isso evita o caso clássico em que uma função válida
do Clipper, como `PADR()`, aparece numa expressão de índice mas é considerada
indefinida porque o linker nunca encontrou uma chamada estática para ela. A lista
de REQUEST é baseada na referência do CA-Clipper 5.3.

O QDbu também recusa valores que não cabem no campo de destino em vez de
convertê-los silenciosamente. Um texto inválido não vira um zero numérico
plausível, uma data inválida não apaga uma data existente e uma string maior que
o campo não é truncada sem aviso.

O modo somente leitura é imposto pelo RDD do Harbour ao abrir a área de trabalho,
e não apenas por controles desabilitados na interface. A edição normal usa trava
por registro, portanto abrir um DBF no QDbu não exige bloquear o arquivo inteiro
para o ERP que também está usando a base.

Antes de operações destrutivas, o QDbu executa um checklist e verifica o backup.
Toda operação que altera bytes no disco é registrada em um log JSONL com o
pedido e o resultado.

A sessão é restaurada quando o QDbu é aberto novamente, incluindo abas abertas,
colunas ocultas, ordem de índice ativa, filtros e o modo de abertura de cada
arquivo.

## Download

O **QDbu 0.77** é uma versão de pré-lançamento para Windows 32-bit. Ele é
distribuído como um pacote portátil: basta descompactar e executar o
`qdbu.exe`. Não há instalador.

[Baixe a versão mais recente](https://github.com/vailtom/qdbu/releases/latest)

O QDbu é distribuído sob a **licença MIT**.

## Aviso

O QDbu nasceu como **prova de conceito e exercício de estudo**. É fornecido
**sem garantia de nenhuma espécie**, expressa ou implícita, e **o uso é por sua
conta e risco**.

Ele escreve em arquivo DBF. PACK, ZAP, alteração de estrutura, `REPLACE` em
massa e edição de registro mudam bytes no disco, e o pré-voo reduz o risco sem
eliminá-lo. Tenha backup antes de apontá-lo para dado de produção.

Ver [LICENSE](LICENSE).

## Do DBU ao QDbu

O QDbu herda seu nome e parte de sua proposta do **DBU**, o utilitário de banco de
dados que acompanhava o Clipper nos anos 80 e 90. Ele também aceita a forma
tradicional de linha de comando do DBU, incluindo o nome do arquivo DBF e as
opções `/E`, `/C` e `/M`. As duas últimas são mantidas por compatibilidade e
ignoradas, permitindo que um arquivo batch antigo continue abrindo o programa sem
precisar ser alterado.

A lógica de banco de dados é escrita em **Harbour**, o compilador xBase moderno
que mantém o programa próximo da linguagem e da semântica de runtime das bases
com que ele trabalha.

A interface desktop é construída com **Tauri, Rust e HTML/JavaScript**. Assim, o
QDbu continua sendo um pequeno aplicativo portátil para Windows enquanto o
trabalho com DBF permanece no Harbour.

## Como se monta

| camada | onde |
|---|---|
| **Harbour** — toda a lógica de dados | `src/` |
| ponte | `src/bridge/` — três pontos de entrada: `HbStart`, `HbStop`, `HbCall` |
| aplicação | `app/src-tauri/` — Rust, que hospeda a VM do Harbour |
| interface | `app/ui/` — HTML/CSS/JS estático, sem bundler |

Uma string entra, uma string sai; o que é estruturado viaja em JSON. A camada
Rust nunca alcança o Harbour direto de um comando Tauri — a VM dele tem
afinidade de thread, então todos os pedidos passam por uma fila.

**Tudo é 32-bit**, acompanhando o Harbour x86. Um processo 64-bit falha ao
carregar a biblioteca com erro 193.

## Construir

Pré-requisitos: Harbour 3.2 (x86), Visual Studio com toolchain x86, Rust com o
alvo `i686-pc-windows-msvc`, Node (só para as ferramentas de desenvolvimento).

Os caminhos de ferramenta ficam num ponto único, `env.bat`. Ajuste de máquina
vai em `env.local.bat`, que o git ignora.

```bat
make.bat                          :: compila bin\qdbudll.dll
app\run.bat                       :: compila e lança
app\dev.bat                       :: idem, servindo a UI do disco (edição a quente)
app\build.bat                     :: release
empacota.bat                      :: pacote portátil em dist\
clean.bat                         :: relatório do que dá para liberar; `clean.bat agora` libera
```

## Validar

Três trilhos, e nenhum item se dá por pronto sem os três:

```bat
tests\build.bat                   :: contrato da DLL, sem Rust nem GUI
cd app\src-tauri && cargo run --target i686-pc-windows-msvc -- --selftest
app\devtools\cdp.bat <cmd>        :: dirige a interface por cliques de verdade
```

O `--selftest` **afirma**, não imprime: toda função nova ganha uma asserção.

## Dados de teste

Nenhum arquivo de banco entra no repositório — o `.gitignore` bloqueia `*.dbf`,
`*.dbt`, `*.ntx` e `*.vew`. Nenhum dado de cliente, nenhum dado de produção. As
fixtures são **geradas**, e o argumento opcional dimensiona o arquivo grande:

```bat
tests\fixtures\fixtures.bat [n]
```

## Documentação

Em preparação para o primeiro release, em páginas próprias e em vídeo. Por
enquanto, o comentário no topo de cada módulo explica o que ele resolve e por
que foi feito assim — é onde mora o raciocínio.

## Licença

MIT — ver [LICENSE](LICENSE). As duas dependências que acompanham o projeto são
MIT também: o [SweetAlert2](app/ui/vendor/sweetalert2/LICENSE) e a
[harbour-xlsxwriter](lib/harbour-xlsxwriter/LICENSE).
