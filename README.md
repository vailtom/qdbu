# QDBU

Reconstrução do **DBU** — o utilitário de manipulação de DBF do Clipper — como
aplicativo de desktop: a lógica em **Harbour**, dentro de uma DLL, e a interface
em **Tauri + Rust + HTML/JS**.

O DBU original é especificação de comportamento, não código de partida. O que
ele fazia por teclado num terminal de 80 colunas, o QDBU faz numa janela — sem
abrir mão de nada que um arquivo de cliente exige: trava por registro, backup
antes de operação destrutiva, log de tudo que muda bytes no disco.

## O que ele faz

- **Abre e navega** DBF de qualquer tamanho, com paginação real. Um arquivo de
  421 mil registros abre no mesmo tempo que um de sete.
- **Edita** registro a registro, na grade ou no formulário, com trava por
  registro e conferência do disco antes de gravar.
- **Filtra** por expressão ou por um construtor guiado que recusa valor que não
  cabe no tipo, em vez de convertê-lo em silêncio.
- **Indexa**: abre `.ntx` existentes, cria novos, escolhe a ordem ativa.
- **Altera estrutura**, compacta (PACK) e esvazia (ZAP), sempre atrás de um
  checklist de pré-voo que confere espaço, copia e verifica a cópia.
- **Exporta** para CSV, JSON e XLSX; **importa** de CSV e JSON.
- **Fala três idiomas** (pt-BR, en, es) e tem doze temas.

## Como se monta

| camada | onde |
|---|---|
| lógica de dados | `src/` — Harbour, compilado em `bin/qdbudll.dll` |
| ponte | `src/bridge/` — três exports: `HbStart`, `HbStop`, `HbCall` |
| aplicação | `app/src-tauri/` — Rust; confina a DLL numa thread dedicada |
| interface | `app/ui/` — HTML/CSS/JS estático, sem bundler |

Uma string entra, uma string sai; o que é estruturado viaja em JSON. A camada
Rust nunca chama a DLL direto de um comando Tauri — a VM do Harbour tem
afinidade de thread, então todos os pedidos passam por uma fila.

**Tudo é 32-bit**, porque o Harbour instalado é x86. Um processo 64-bit falha ao
carregar a DLL com erro 193.

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
tests\build.bat                 :: contrato da DLL, sem Rust nem GUI
cd app\src-tauri && cargo run --target i686-pc-windows-msvc -- --selftest
app\devtools\cdp.bat <cmd>      :: dirige a interface por cliques de verdade
```

O `--selftest` **afirma**, não imprime: toda função nova ganha uma asserção.

## Dados de teste

Nenhum arquivo de banco entra no repositório — o `.gitignore` bloqueia `*.dbf`,
`*.dbt`, `*.ntx` e `*.vew`. As fixtures são **geradas**:

```bat
tests\fixtures\fixtures.bat [n]
```

## Documentação

`docs/` traz o plano de entrega, o modelo de confiança, as regras de integridade
para operação em bloco, o desenho do backup e a análise dos utilitários
concorrentes. `GUIA-DO-PROJETO.md` é o guia de trabalho no código: as regras invioláveis,
as armadilhas já pagas e o porquê de cada uma.

## Licença

Ainda não definida.
