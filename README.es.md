[English](README.md) · [Português](README.pt-BR.md) · **Español**

# QDbu

Una utilidad de DBF para quienes **heredaron** un sistema en DBF — y nunca
aprendieron xBase.

**Describa el filtro en palabras** — *"clientes de SP o MG con CGC completado"* —
**y reciba la expresión lista, ya comprobada contra su propio archivo:**

```
(CLI_EST == "SP" .OR. CLI_EST == "MG") .AND. !Empty(CLI_CGC)
```

O ármela a mano, en un catálogo con los campos del propio archivo, 126 funciones
y todos los operadores — cada uno con nombre en lenguaje común, una línea que
dice para qué sirve, y búsqueda en tres idiomas. De una forma u otra, dice qué
da la expresión **en el registro que usted tiene delante**, antes de aplicar
nada:

> ✓ Expresión válida. En el registro 270 el resultado es Sí.

**[Descargar QDbu v00.75](https://github.com/vailtom/qdbu/releases/latest)**
— dos archivos, sin instalador: descomprima y ejecute `qdbu.exe`.
Windows, 32-bit.

---

Por debajo, quien hace el trabajo es **Harbour**: abre, lee, bloquea, indexa,
filtra y graba el DBF, con el mismo RDD que sostiene sistemas en producción
desde hace décadas. La interfaz es **Tauri + Rust + HTML/JS**, y existe para
darle una ventana a lo que él ya sabe hacer, y no al revés.

Lo que DBU hacía por teclado en una terminal de 80 columnas, QDbu lo hace en una
pantalla moderna, sin renunciar a nada de lo que exige el archivo de un cliente:
bloqueo por registro, copia de seguridad antes de toda operación destructiva, y
registro de todo lo que cambia bytes en el disco.

## El constructor de expresiones

Seis campos del programa aceptan expresión xBase: el filtro, la clave del índice
y su FOR, y el WITH, el FOR y el WHILE del `REPLACE` masivo. Escribir en
cualquiera de ellos significaba conocer el lenguaje.

El constructor pone delante suyo los campos del archivo, las funciones y los
operadores, ordenados por el tipo que ese campo espera, y nunca esconde el
resto. Un campo mal escrito tampoco es un callejón sin salida: dice qué campo no
existe y sugiere el más parecido. Y la línea de estado le habla a quien está
mirando — *si está bien, qué da, y de dónde salió ese resultado* — en vez de
recitar tipos.

### En palabras, si tiene una clave

Además de escribir la expresión, el asistente repara una que no compila — puntos
que faltan en `.AND.`, un paréntesis abierto — y modifica una que usted ya tiene
(*"incluya también MG"*). Tres cosas que no hace, a propósito:

- **Nunca aplica nada.** La sugerencia cae en el borrador como un único paso de
  deshacer y pasa por la misma comprobación que un texto escrito por usted.
- **Ningún registro sale de su máquina.** Va su pedido, los nombres y tipos de
  los campos, y el catálogo de funciones.
- **No adivina.** Sin un campo para lo que usted pidió, pregunta cuál usar en
  lugar de aceptar uno parecido — un `CLI_PESS` con `F`/`J` es física/jurídica,
  no femenino/masculino, y aquella expresión compilaría, se ejecutaría y estaría
  equivocada.

Requiere una clave de API propia, informada en Preferencias: OpenAI, un Ollama
local, o cualquier endpoint que hable el formato *chat completions*. Sin clave
el botón lo avisa, y todo lo demás funciona igual.

## Aviso

QDbu nació como **prueba de concepto y ejercicio de estudio**. Se entrega **sin
garantía de ningún tipo**, expresa o implícita, y **su uso es por su cuenta y
riesgo**.

Escribe en archivos DBF. PACK, ZAP, cambio de estructura, `REPLACE` masivo y
edición de registros modifican bytes en el disco, y la lista de comprobación
previa reduce el riesgo sin eliminarlo. Tenga copia de seguridad antes de
apuntarlo a datos de producción.

Ver [LICENSE](LICENSE).

## Qué hace

- **Abre y navega** DBF de cualquier tamaño, con paginación real. Un archivo de
  421.000 registros abre en el mismo tiempo que uno de siete.
- **Edita** registro a registro, en la cuadrícula o en el formulario.
- **Filtra** por expresión o mediante un constructor guiado — con un
  [constructor de expresiones](#el-constructor-de-expresiones) que conoce
  los campos del archivo y comprueba el resultado antes de aplicarlo.
- **Indexa**: abre `.ntx` existentes, crea nuevos, elige el orden activo.
- **Cambia la estructura**, compacta (PACK) y vacía (ZAP).
- **Exporta** a CSV, JSON, XLSX y DBF; **importa** de CSV y JSON.

## Más allá del DBU original

DBU resolvía lo esencial en una terminal de 80 columnas. QDbu mantiene lo que
hacía y se ocupa de lo que quedó fuera:

**Varias áreas de trabajo a la vez**

- **Todas las carpetas registradas visibles en un árbol**, sin límite y sin
  cambiar de directorio. Cada una con nombre propio y con búsqueda.
- **Un archivo por pestaña**, cada una con su propio orden, filtro y selección de
  campos.
- **La sesión vuelve como estaba**: pestañas, campos ocultos, orden activo y
  filtro de cada archivo.
- **Cuadrícula y formulario sobre el mismo registro.** El formulario muestra
  todos los campos, incluidos los que la cuadrícula oculta.
- **La paginación es ancla + desplazamiento** (`dbGoTo` → `dbSkip`), nunca un
  desplazamiento absoluto: "el registro 5000" no sobrevive a un cambio de orden o
  de filtro.

**Modo compartido de verdad**

- **`RLock()` por registro, no `FLock()` sobre el archivo.** Editar una celda no
  bloquea al ERP que tiene el DBF abierto.
- **La grabación lleva `expect`**, comprobado dentro del `RLock`. La comparación
  es sobre los bytes de `dbRecordInfo(DBRI_RAWRECORD)`, no sobre el valor: en un
  `N(12,2)`, `FieldGet()` aplasta "nunca rellenado" (los blancos de
  `APPEND BLANK`), `0.00` y "no cupo" (asteriscos) en el mismo `0`. Si el
  registro cambió desde la lectura, QDbu muestra los dos lados y deja la decisión
  a quien está delante.
- **Relectura automática en reposo**, repintando solo lo que cambió y
  conservando el desplazamiento.

**No corromper el archivo**

- **PACK, ZAP y cambio de estructura pasan por una lista de comprobación que se
  ejecuta:** espacio para 3× el conjunto, copia del conjunto entero (DBF, memo y
  `.ntx`), verificación del tamaño de esa copia, y solo entonces la operación.
- **Estado reenlazado por una sola rutina.** Tras `dbPack()` los RecNo cambian,
  así que el cursor vuelve por la clave **y** por el RecNo: solo por la clave
  falla cuando hay homónimos, porque la búsqueda blanda se detiene en la primera
  coincidencia. En cambios de estructura los índices se cierran antes, porque
  pasarían a describir un archivo que ya no existe.
- **Cancelación cooperativa**, siempre entre registros completos.
- **Registro JSONL de las operaciones que cambian bytes**, con la petición y el
  desenlace: el `backup: true` de la petición y el nombre del archivo creado.

**Codificación y tipos**

- **Codificación por archivo**, con cinco lentes: CP850, Windows-1252,
  ISO-8859-1, CP860 y UTF-8, en cascada archivo › conexión › global. El byte del
  controlador de idioma (desplazamiento 29) sugiere, pero no decide: la mayoría
  de los DBF de Clipper graban `0x00`. Leer un DBF grabado en 1252 con la lente
  de DOS muestra el acento equivocado, y graba el byte equivocado en el primer
  `REPLACE`.
- **El valor que no cabe en el tipo se rechaza, nunca se fuerza.** `Val("abc")`
  daría `0`, y el cero es plausible; `CToD("31/02/2026")` daría una fecha vacía y
  borraría la que ya estaba; un `C(40)` que recibe 60 caracteres se truncaría en
  silencio.
- **`.ntx` emparejado por la expresión de clave, no por el nombre.** En las bases
  reales el índice de `NETCLI.DBF` se llama `ID1CLI.ntx`, y cada desarrollador
  usa la convención que quiere. QDbu lee la cabecera del índice y comprueba que
  los campos que menciona existan en el archivo.
- **Las expresiones de índice y de filtro compilan en tiempo de ejecución**, así
  que las funciones del lenguaje están enlazadas a propósito: sin eso, un
  `PADR()` en una clave se rechaza con "Undefined function", para una función que
  existe en Clipper desde siempre.
- **El error trae `operation` y `args`, no solo `description`.** Una `W` tecleada
  por error en un WHILE dice **qué** variable no existe.

**Interfaz**

- **Tres idiomas** — portugués, inglés y español — conmutables sin reiniciar.
- **Doce temas**, uno de ellos claro, con contraste verificado con la fórmula del
  WCAG.

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
