# Lucide

Ícones de https://lucide.dev — licença ISC, em `LICENSE`.

**Só a licença mora aqui.** Os ícones em si estão **inline** no
`app/ui/index.html`, num `<svg id="sprite-icones">` logo abaixo do `<body>`.

Inline, e não um arquivo referenciado por `<use href="arquivo.svg#id">`, porque
referência externa em `<use>` depende da origem — e esta interface é servida ora
pelo protocolo `dev://` do disco, ora embutida no binário. Inline funciona nos
dois sem depender de qual está valendo, e atende a regra de o app funcionar sem
rede.

## Os 14 em uso

| símbolo | onde | por quê |
|---|---|---|
| `table-properties` | Estrutura | o esquema, não o dado |
| `table-2` | Dados | a grade |
| `rectangle-ellipsis` | Formulário | um registro, campos empilhados |
| `columns-3` | Colunas | escolher o que aparece |
| `arrow-down-a-z` | Índices | o painel é sobre a ORDEM ativa |
| `funnel` | Filtro | universal |
| `file-output` | Exportar | o dado sai da máquina |
| `shield-check` | Backup | o pré-voo é um checklist que roda |
| `plus` | + Registro | |
| `circle-minus` | Excluir | **não é lixeira de propósito** |
| `undo-2` | Recuperar | desfaz a marca |
| `layers` | Em massa | muitos registros de uma vez |
| `shrink` | Compactar | PACK encolhe o arquivo |
| `trash-2` | Esvaziar | a lixeira fica para o que destrói de verdade |
| `info` | Sobre | identidade, versão e data de linkedição |
| `file-plus` | alvo do arrastar-e-soltar | o arquivo ENTRA — ver abaixo |
| `square-function` | abrir o construtor de expressão | o "fx" ao lado de cada campo de expressão |
| `redo-2` | Refazer, no construtor | par do `undo-2` que já existia |

**`file-plus` e não `file-output` no alvo do arrasto.** Os dois são um arquivo com uma seta, e a diferença é o SENTIDO dela: em `file-output` a seta sai — é o ícone de Exportar, o dado deixando a máquina. Num alvo onde se solta um arquivo para abrir, ele diz exatamente o contrário do que acontece. O `+` não tem sentido para inverter.

**A escolha de `circle-minus` para Excluir é semântica, não estética.** No xBase
excluir é uma MARCA reversível, com Recuperar do lado; uma lixeira ensinaria que
é definitivo, que é o oposto. A lixeira ficou para o ZAP, que destrói mesmo.

## Acrescentar um ícone

Pegue o miolo de `https://unpkg.com/lucide-static@latest/icons/<nome>.svg` e
ponha num `<symbol id="i-<nome>" viewBox="0 0 24 24">` dentro do sprite. O traço
herda `currentColor`, então o ícone acompanha os doze temas sem regra por tema.
