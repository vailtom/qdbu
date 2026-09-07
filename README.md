**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

# QDbu

**QDbu** is a portable DBF utility for inspecting, editing and maintaining dBase
and Clipper databases.

A modern interface, an app with no limits, with a built-in expression builder
that knows the fields in your file — plus an optional AI to write, fix and change
the expression.

It opens DBF files directly, works record by record, handles NTX indexes, filters,
structure changes, PACK and ZAP operations, and imports and exports common data
formats. It is designed for the files that are still in use: including large
tables, network paths, legacy naming conventions and mixed codepages.

## New in 00.75: build xBase expressions instead of typing them blind

Six places in QDbu accept xBase expressions: the table filter, index key, index
FOR condition, and the WITH, FOR and WHILE expressions used by bulk REPLACE.

The new expression builder puts the current DBF fields, every operator and a
catalog of **126 Harbour/xBase functions** next to the editor. Each item has a
plain-language name, a short explanation and search terms in English, Portuguese
and Spanish.

The list is ranked by the type expected by the expression being edited, without
hiding the other choices. IntelliSense follows the cursor, shows the signature of
the current function and highlights the argument being entered.

The function catalog is generated from Harbour's own `$DOC$` documentation
blocks. Parameter notation such as `<cString>`, `<nStart>` and `[<nLen>]` is used
to determine argument types and optional parameters.

QDbu also checks the expression before it is used. A misspelled field produces a
suggestion instead of a dead end, and a valid expression is evaluated against the
record currently on screen:

> ✓ Expression valid. On record 270 the result is Yes.

An optional AI assistant can build the same expressions from plain language. For
example:

> customers from SP or MG with CGC filled in

becomes:

```xbase
(CLI_EST == "SP" .OR. CLI_EST == "MG") .AND. !Empty(CLI_CGC)
```

It can also repair an expression that does not compile or modify an existing one,
such as "include MG too".

The assistant never applies a change by itself. Its answer becomes an editable
draft, can be undone in one step, and passes through the same validation as an
expression typed by hand.

No DBF records are sent to the assistant. Only the request, field names and
types, and the function catalog leave the machine. If the requested operation
cannot be mapped to an existing field, the assistant asks which field to use
instead of inventing one.

The assistant is **optional and requires your own API key**. It supports OpenAI,
a local Ollama instance, or another endpoint compatible with the Chat Completions
format. Without a configured key, the assistant is unavailable and the rest of
QDbu works normally.

## What it does

- **Opens and browses** DBFs of any size, with real pagination. A 421,000-record
  file opens as fast as a seven-record one.
- **Edits** record by record, in the grid or in the form.
- **Filters** by expression or through a guided builder.
- **Indexes**: opens existing `.ntx` files, creates new ones, picks the active
  order.
- **Changes structure**, packs (PACK) and empties (ZAP).
- **Exports** to CSV, JSON, XLSX and DBF; **imports** from CSV and JSON.

## Built for DBFs as they actually exist

QDbu treats codepage selection as a file-level concern. CP850, Windows-1252,
ISO-8859-1, CP860 and UTF-8 are available, with settings resolved in the order
file → connection → global. The DBF language-driver byte at offset 29 is used as
a suggestion, not as an unquestionable answer; many Clipper DBFs simply contain
`0x00`.

That distinction matters when editing. Reading a Windows-written DBF through a
DOS codepage is not only a display problem: the next REPLACE can write the wrong
byte back to disk.

NTX files are matched by their key expression rather than by filename. A
`NETCLI.DBF` can therefore use `ID1CLI.NTX`, or any other naming convention. QDbu
reads the index header and checks whether the fields referenced by its expression
exist in the opened DBF.

Functions used only inside runtime expressions are explicitly linked into the
program. This avoids the classic case where a valid Clipper function such as
`PADR()` appears in an index expression but is reported as undefined because the
linker never saw a static call to it. The request list is based on the
CA-Clipper 5.3 reference.

QDbu also refuses values that do not fit the destination field instead of
silently converting them. Invalid text does not become a plausible numeric zero,
an invalid date does not erase an existing date, and an oversized string is not
quietly truncated.

Read-only mode is enforced by the Harbour RDD when the work area is opened, not
only by disabled controls in the interface. Record locking is used for normal
editing, so opening a DBF in QDbu does not require locking the entire file away
from the ERP that is using it.

Before destructive operations, QDbu runs a checklist and verifies the backup.
Every operation that changes bytes on disk is recorded in a JSONL log with the
request and its result.

The session is restored when QDbu is reopened, including open tabs, hidden
columns, active index order, filters and the opening mode of each file.

## Download

**QDbu 00.75** is a pre-release for Windows 32-bit. It ships as a portable
package: extract it and run the executable. No installer is required.

[Download the latest release](https://github.com/vailtom/qdbu/releases/latest)

QDbu is released under the **MIT License**.

## Notice

QDbu was built as a **proof of concept and a study exercise**. It is provided
**without warranty of any kind**, express or implied, and **you use it at your
own risk**.

It writes to DBF files. PACK, ZAP, structure changes, bulk `REPLACE` and record
editing all change bytes on disk, and the pre-flight checklist reduces that risk
without removing it. Have a backup before pointing it at production data.

See [LICENSE](LICENSE).

## From DBU to QDbu

QDbu takes its name and part of its purpose from **DBU**, the database utility
shipped with Clipper in the 1980s and 1990s. It also accepts the traditional DBU
command-line form, including a DBF filename and `/E`, `/C` and `/M`. The last two
are retained for compatibility and ignored, so an old batch file can still start
the program without being rewritten.

The database logic is written in **Harbour**, the modern xBase compiler that
keeps the program close to the language and runtime semantics of the databases it
works with.

The desktop interface is built with **Tauri, Rust and HTML/JavaScript**. QDbu
remains a small portable Windows application while the DBF work stays in Harbour.

## How it fits together

| layer | where |
|---|---|
| **Harbour** — all the data logic | `src/` |
| bridge | `src/bridge/` — three entry points: `HbStart`, `HbStop`, `HbCall` |
| application | `app/src-tauri/` — Rust, hosting the Harbour VM |
| interface | `app/ui/` — static HTML/CSS/JS, no bundler |

A string goes in, a string comes out; anything structured travels as JSON. The
Rust layer never reaches Harbour straight from a Tauri command — its VM has
thread affinity, so every request goes through a queue.

**Everything is 32-bit**, following the x86 Harbour build. A 64-bit process fails
to load the library with error 193.

## Building

Requirements: Harbour 3.2 (x86), Visual Studio with the x86 toolchain, Rust with
the `i686-pc-windows-msvc` target, Node (for the development tools only).

Tool paths live in one place, `env.bat`. Machine-specific tweaks go in
`env.local.bat`, which git ignores.

```bat
make.bat                          :: builds bin\qdbudll.dll
app\run.bat                       :: builds and launches
app\dev.bat                       :: same, serving the UI from disk (hot editing)
app\build.bat                     :: release
empacota.bat                      :: portable package into dist\
clean.bat                         :: report what can be freed; `clean.bat agora` frees it
```

## Validating

Three tracks, and nothing counts as done without all three:

```bat
tests\build.bat                   :: the DLL contract, no Rust and no GUI
cd app\src-tauri && cargo run --target i686-pc-windows-msvc -- --selftest
app\devtools\cdp.bat <cmd>        :: drives the interface with real clicks
```

`--selftest` **asserts**, it does not just print: every new function gets an
assertion.

## Test data

No database file enters the repository — `.gitignore` blocks `*.dbf`, `*.dbt`,
`*.ntx` and `*.vew`. No customer data, no production data. The fixtures are
**generated**, and the optional argument sizes the large file:

```bat
tests\fixtures\fixtures.bat [n]
```

## Documentation

Being prepared for the first release, as dedicated pages and video. For now, the
comment at the top of each module explains what it solves and why it was done
that way — that is where the reasoning lives.

## License

MIT — see [LICENSE](LICENSE). Both bundled dependencies are MIT as well:
[SweetAlert2](app/ui/vendor/sweetalert2/LICENSE) and
[harbour-xlsxwriter](lib/harbour-xlsxwriter/LICENSE).
