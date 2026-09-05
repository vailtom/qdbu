# QDBU

Utilitário inspirado no **DBU** (o utilitário de manipulação de DBFs do Clipper),
desenvolvido em **Harbour**, com interface em **Tauri + Rust + HTML/JS**.

O Harbour é quem faz o trabalho: ele abre, lê, trava, indexa, filtra e grava o
DBF, com o mesmo RDD que sustenta sistemas em produção há décadas. A camada
gráfica existe para dar janela ao que ele já sabe fazer — e não o contrário.

O que o DBU fazia por teclado num terminal de 80 colunas, o QDBU faz numa tela
moderna, sem abrir mão de nada que um arquivo de cliente exige: trava por
registro, backup antes de operação destrutiva, e log de tudo que muda bytes no
disco.

## Aviso

O QDBU nasceu como **prova de conceito e exercício de estudo**. É fornecido
**sem garantia de nenhuma espécie**, expressa ou implícita, e **o uso é por sua
conta e risco**.

Ele escreve em arquivo DBF. PACK, ZAP, alteração de estrutura, `REPLACE` em
massa e edição de registro mudam bytes no disco, e o pré-voo reduz o risco sem
eliminá-lo. Tenha backup antes de apontá-lo para dado de produção.

Ver [LICENSE](LICENSE).

## O que ele faz

- **Abre e navega** DBF de qualquer tamanho, com paginação real. Um arquivo de
  421 mil registros abre no mesmo tempo que um de sete.
- **Edita** registro a registro, na grade ou no formulário.
- **Filtra** por expressão ou por um construtor guiado.
- **Indexa**: abre `.ntx` existentes, cria novos, escolhe a ordem ativa.
- **Altera estrutura**, compacta (PACK) e esvazia (ZAP).
- **Exporta** para CSV, JSON, XLSX e DBF; **importa** de CSV e JSON.

## Além do DBU original

O DBU resolvia o essencial num terminal de 80 colunas. O QDBU mantém o que ele
fazia e trata o que ficou de fora:

**Várias work areas ao mesmo tempo**

- **Todas as pastas cadastradas visíveis numa árvore**, sem limite e sem trocar
  de diretório. Cada uma com nome próprio e busca.
- **Um arquivo por aba**, cada uma com a própria ordem, filtro e seleção de
  campos.
- **A sessão volta como estava**: abas, campos ocultos, ordem ativa e filtro de
  cada arquivo.
- **Grade e formulário sobre o mesmo registro.** O formulário mostra todos os
  campos, inclusive os que a grade escondeu.
- **A paginação é âncora + deslocamento** (`dbGoTo` → `dbSkip`), nunca offset
  absoluto: "o 5000º registro" não sobrevive a uma troca de ordem ou filtro.

**Modo compartilhado de verdade**

- **`RLock()` por registro, não `FLock()` no arquivo.** Editar uma célula não
  bloqueia o ERP que está com o DBF aberto.
- **Gravação com `expect`**, conferido dentro do `RLock`. A comparação é sobre
  os bytes de `dbRecordInfo(DBRI_RAWRECORD)`, e não sobre o valor: num `N(12,2)`
  o `FieldGet()` achata "nunca preenchido" (brancos de `APPEND BLANK`), `0.00` e
  "não coube" (asteriscos) no mesmo `0`. Se o registro mudou desde a leitura, o
  QDBU mostra os dois lados e deixa a decisão com quem está na frente.
- **Releitura automática em ociosidade**, repintando só o que mudou e
  preservando a rolagem.

**Não corromper arquivo**

- **PACK, ZAP e alteração de estrutura passam por um checklist que roda:**
  espaço para 3× o conjunto, cópia do conjunto inteiro (DBF, memo e `.ntx`),
  conferência do tamanho da cópia, e só então a operação.
- **Estado religado numa rotina só.** Depois do `dbPack()` os RecNo mudam, então
  o cursor volta pela chave **e** pelo RecNo — só pela chave erra quando há
  homônimos, e o soft seek para na primeira ocorrência. Em alteração de
  estrutura os índices são fechados antes, porque passariam a descrever um
  arquivo que não existe mais.
- **Cancelamento cooperativo**, sempre entre registros completos.
- **Log JSONL das operações que mudam bytes**, com o pedido e o desfecho — o
  `backup: true` do pedido e o nome do arquivo que nasceu.

**Codepage e tipos**

- **Codepage por arquivo**, com cinco lentes: CP850, Windows-1252, ISO-8859-1,
  CP860 e UTF-8, em cascata arquivo › conexão › global. O byte do language
  driver (offset 29) sugere, mas não decide — a maioria dos DBFs Clipper grava
  `0x00`. Ler um DBF gravado em 1252 com a lente do DOS mostra acento trocado, e
  grava byte errado no primeiro `REPLACE`.
- **Valor que não cabe no tipo é recusado, nunca coagido.** `Val("abc")` daria
  `0` e zero é plausível; `CToD("31/02/2026")` daria data vazia e apagaria a que
  estava lá; um `C(40)` recebendo 60 caracteres seria truncado calado.
- **`.ntx` casado pela expressão de chave, não pelo nome.** Nas bases reais o
  índice de `NETCLI.DBF` se chama `ID1CLI.ntx`, e cada dev usa a convenção que
  quer. O QDBU lê o cabeçalho do índice e confere se os campos citados existem
  no arquivo.
- **A expressão de índice e a de filtro compilam em runtime**, então as funções
  da linguagem estão linkadas de propósito — sem isso um `PADR()` numa chave
  recusa com "Undefined function", numa função que existe no Clipper desde
  sempre.
- **O erro traz `operation` e `args`, não só `description`.** Um `W` digitado
  por engano num WHILE diz **qual** variável não existe.

**Interface**

- **Três idiomas** — português, inglês e espanhol — trocáveis sem reiniciar.
- **Doze temas**, um deles claro, com contraste verificado pela fórmula do WCAG.

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
make.bat                        :: compila bin\qdbudll.dll
app\run.bat                     :: compila e lança
app\dev.bat                     :: idem, servindo a UI do disco (edição a quente)
app\build.bat                   :: release
```

## Validar

Três trilhos, e nenhum item se dá por pronto sem os três:

```bat
testsuild.bat                 :: contrato da DLL, sem Rust nem GUI
cd app\src-tauri && cargo run --target i686-pc-windows-msvc -- --selftest
app\devtools\cdp.bat <cmd>      :: dirige a interface por cliques de verdade
```

O `--selftest` **afirma**, não imprime: toda função nova ganha uma asserção.

## Dados de teste

Nenhum arquivo de banco entra no repositório — o `.gitignore` bloqueia `*.dbf`,
`*.dbt`, `*.ntx` e `*.vew`. Nenhum dado de cliente, nenhum dado de produção. As
fixtures são **geradas**, e o argumento opcional dimensiona o arquivo grande:

```bat
testsixturesixtures.bat [n]
```

## Documentação

Em preparação para o primeiro release, em páginas próprias e em vídeo. Por
enquanto, o comentário no topo de cada módulo explica o que ele resolve e por
que foi feito assim — é onde mora o raciocínio.

## Licença

MIT — ver [LICENSE](LICENSE). As duas dependências que acompanham o projeto são
MIT também: o [SweetAlert2](app/ui/vendor/sweetalert2/LICENSE) e a
[harbour-xlsxwriter](lib/harbour-xlsxwriter/LICENSE).
