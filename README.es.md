[English](README.md) · [Português](README.pt-BR.md) · **Español**

# QDbu

**QDbu** es una utilidad portátil para inspeccionar, editar y mantener archivos
DBF de dBase y Clipper.

Interfaz moderna, una aplicación sin límites con un constructor de expresiones
integrado que conoce los campos de su archivo — con IA opcional para escribir,
corregir y modificar la expresión.

Abre archivos DBF directamente, trabaja registro por registro, maneja índices
NTX, filtros, cambios de estructura, operaciones PACK y ZAP, e importa y exporta
formatos de datos comunes. Está hecho para archivos que siguen en uso: incluidas
tablas grandes, rutas de red, convenciones antiguas de nombres y distintos
codepages.

## Nuevo en 00.75: construya expresiones xBase en lugar de escribirlas a ciegas

Seis lugares de QDbu aceptan expresiones xBase: el filtro de la tabla, la clave
del índice, el FOR del índice y las expresiones WITH, FOR y WHILE utilizadas por
el REPLACE masivo.

El nuevo constructor de expresiones coloca junto al editor los campos del DBF
actual, todos los operadores y un catálogo de **126 funciones Harbour/xBase**.
Cada elemento tiene un nombre en lenguaje común, una explicación breve y términos
de búsqueda en inglés, portugués y español.

La lista se ordena según el tipo esperado por la expresión que se está editando,
sin ocultar las demás opciones. IntelliSense sigue el cursor, muestra la firma de
la función actual y resalta el argumento que se está introduciendo.

El catálogo de funciones se genera a partir de los propios bloques de
documentación `$DOC$` de Harbour. Notaciones de parámetros como `<cString>`,
`<nStart>` y `[<nLen>]` se utilizan para determinar los tipos de argumentos y los
parámetros opcionales.

QDbu también comprueba la expresión antes de utilizarla. Un campo escrito
incorrectamente recibe una sugerencia en lugar de convertirse en un callejón sin
salida, y una expresión válida se evalúa sobre el registro que está actualmente
en pantalla:

> ✓ Expresión válida. En el registro 270 el resultado es Sí.

Un asistente opcional de IA puede construir las mismas expresiones a partir de
lenguaje natural. Por ejemplo:

> clientes de SP o MG con CGC informado

se convierte en:

```xbase
(CLI_EST == "SP" .OR. CLI_EST == "MG") .AND. !Empty(CLI_CGC)
```

También puede corregir una expresión que no compila o modificar una expresión
existente, como "incluya también MG".

El asistente nunca aplica un cambio por sí solo. La respuesta se convierte en un
borrador editable, puede deshacerse en un paso y pasa por la misma validación que
una expresión escrita manualmente.

Ningún registro del DBF se envía al asistente. Solo salen de la máquina la
petición, los nombres y tipos de los campos y el catálogo de funciones. Si lo
solicitado no puede asociarse con un campo existente, el asistente pregunta qué
campo debe utilizar en lugar de inventar uno.

El asistente es **opcional y requiere una clave de API del propio usuario**.
Admite OpenAI, una instancia local de Ollama u otro endpoint compatible con el
formato Chat Completions. Sin una clave configurada, el asistente no está
disponible y el resto de QDbu funciona normalmente.

## Qué hace

- **Abre y navega** DBF de cualquier tamaño, con paginación real. Un archivo de
  421.000 registros abre en el mismo tiempo que uno de siete.
- **Edita** registro a registro, en la cuadrícula o en el formulario.
- **Filtra** por expresión o mediante un constructor guiado.
- **Indexa**: abre `.ntx` existentes, crea nuevos, elige el orden activo.
- **Cambia la estructura**, compacta (PACK) y vacía (ZAP).
- **Exporta** a CSV, JSON, XLSX y DBF; **importa** de CSV y JSON.

## Hecho para los DBF que existen en el mundo real

QDbu trata la selección del codepage a nivel de archivo. Están disponibles CP850,
Windows-1252, ISO-8859-1, CP860 y UTF-8, con resolución en el orden
archivo → conexión → global. El byte del language driver del DBF, en el offset
29, se utiliza como sugerencia y no como respuesta definitiva; muchos DBF de
Clipper simplemente contienen `0x00`.

Esta diferencia importa al editar. Leer un DBF escrito en Windows mediante un
codepage DOS no es solo un problema de visualización: el siguiente REPLACE puede
escribir de nuevo en disco el byte incorrecto.

Los archivos NTX se asocian por la expresión de la clave y no por el nombre del
archivo. Por tanto, un `NETCLI.DBF` puede utilizar `ID1CLI.NTX` o cualquier otra
convención. QDbu lee la cabecera del índice y comprueba si los campos mencionados
por su expresión existen en el DBF abierto.

Las funciones utilizadas únicamente dentro de expresiones compiladas en runtime
se enlazan explícitamente con el programa. Esto evita el caso clásico en el que
una función válida de Clipper como `PADR()` aparece en una expresión de índice
pero se considera indefinida porque el linker nunca encontró una llamada estática
a ella. La lista de REQUEST se basa en la referencia de CA-Clipper 5.3.

QDbu también rechaza los valores que no caben en el campo de destino en lugar de
convertirlos silenciosamente. Un texto inválido no se convierte en un cero
numérico plausible, una fecha inválida no borra una fecha existente y una cadena
demasiado larga no se trunca sin aviso.

El modo de solo lectura es impuesto por el RDD de Harbour al abrir el área de
trabajo, y no únicamente por controles desactivados en la interfaz. La edición
normal utiliza bloqueo por registro, por lo que abrir un DBF en QDbu no exige
bloquear el archivo completo para el ERP que también está utilizando la base.

Antes de las operaciones destructivas, QDbu ejecuta una lista de comprobación y
verifica la copia de seguridad. Toda operación que modifica bytes en disco queda
registrada en un log JSONL con la petición y su resultado.

La sesión se restaura al volver a abrir QDbu, incluidas las pestañas abiertas,
columnas ocultas, orden de índice activo, filtros y modo de apertura de cada
archivo.

## Descarga

**QDbu 00.76** es una versión preliminar para Windows de 32 bits. Se distribuye
como un paquete portátil: basta con descomprimirlo y ejecutar `qdbu.exe`.
No requiere instalador.

[Descargue la última versión](https://github.com/vailtom/qdbu/releases/latest)

QDbu se distribuye bajo la **licencia MIT**.

## Aviso

QDbu nació como **prueba de concepto y ejercicio de estudio**. Se entrega **sin
garantía de ningún tipo**, expresa o implícita, y **su uso es por su cuenta y
riesgo**.

Escribe en archivos DBF. PACK, ZAP, cambio de estructura, `REPLACE` masivo y
edición de registros modifican bytes en el disco, y la lista de comprobación
previa reduce el riesgo sin eliminarlo. Tenga copia de seguridad antes de
apuntarlo a datos de producción.

Ver [LICENSE](LICENSE).

## De DBU a QDbu

QDbu toma su nombre y parte de su propósito de **DBU**, la utilidad de bases de
datos que acompañaba a Clipper en los años 80 y 90. También acepta la forma
tradicional de línea de comandos de DBU, incluido el nombre del archivo DBF y las
opciones `/E`, `/C` y `/M`. Las dos últimas se conservan por compatibilidad y se
ignoran, de modo que un archivo batch antiguo puede seguir iniciando el programa
sin necesidad de modificarlo.

La lógica de base de datos está escrita en **Harbour**, el compilador xBase
moderno que mantiene el programa cerca del lenguaje y de la semántica de runtime
de las bases con las que trabaja.

La interfaz de escritorio está construida con **Tauri, Rust y HTML/JavaScript**.
QDbu sigue siendo una pequeña aplicación portátil para Windows mientras el
trabajo con DBF permanece en Harbour.

## Cómo se arma

| capa | dónde |
|---|---|
| **Harbour** — toda la lógica de datos | `src/` |
| puente | `src/bridge/` — tres puntos de entrada: `HbStart`, `HbStop`, `HbCall` |
| aplicación | `app/src-tauri/` — Rust, que hospeda la VM de Harbour |
| interfaz | `app/ui/` — HTML/CSS/JS estático, sin bundler |

Entra una cadena, sale una cadena; lo estructurado viaja en JSON. La capa Rust
nunca alcanza a Harbour directamente desde un comando de Tauri: su VM tiene
afinidad de hilo, así que todas las peticiones pasan por una cola.

**Todo es de 32 bits**, siguiendo la compilación x86 de Harbour. Un proceso de
64 bits falla al cargar la biblioteca con el error 193.

## Compilar

Requisitos: Harbour 3.2 (x86), Visual Studio con la cadena de herramientas x86,
Rust con el objetivo `i686-pc-windows-msvc`, Node (solo para las herramientas de
desarrollo).

Las rutas de las herramientas viven en un único lugar, `env.bat`. Los ajustes de
cada máquina van en `env.local.bat`, que git ignora.

```bat
make.bat                          :: compila bin\qdbudll.dll
app\run.bat                       :: compila y lanza
app\dev.bat                       :: igual, sirviendo la UI desde el disco
app\build.bat                     :: release
empacota.bat                      :: paquete portátil en dist\
clean.bat                         :: informe de lo liberable; `clean.bat agora` lo libera
```

## Validar

Tres vías, y nada se da por terminado sin las tres:

```bat
tests\build.bat                   :: el contrato de la DLL, sin Rust ni GUI
cd app\src-tauri && cargo run --target i686-pc-windows-msvc -- --selftest
app\devtools\cdp.bat <cmd>        :: dirige la interfaz con clics de verdad
```

`--selftest` **afirma**, no solo imprime: toda función nueva recibe una
aserción.

## Datos de prueba

Ningún archivo de base de datos entra en el repositorio: `.gitignore` bloquea
`*.dbf`, `*.dbt`, `*.ntx` y `*.vew`. Ningún dato de cliente, ningún dato de
producción. Los fixtures se **generan**, y el argumento opcional dimensiona el
archivo grande:

```bat
tests\fixtures\fixtures.bat [n]
```

## Documentación

En preparación para la primera versión, en páginas propias y en vídeo. Por
ahora, el comentario al inicio de cada módulo explica qué resuelve y por qué se
hizo así — ahí es donde vive el razonamiento.

## Licencia

MIT — ver [LICENSE](LICENSE). Las dos dependencias que acompañan al proyecto son
MIT también: [SweetAlert2](app/ui/vendor/sweetalert2/LICENSE) y
[harbour-xlsxwriter](lib/harbour-xlsxwriter/LICENSE).
