**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

# QDbu

A utility inspired by **DBU** (Clipper's DBF handling tool), built in
**Harbour**, with a **Tauri + Rust + HTML/JS** front end.

Harbour does the work: it opens, reads, locks, indexes, filters and writes the
DBF, through the same RDD that has been holding production systems together for
decades. The graphical layer exists to give that engine a window — not the other
way around.

What DBU did by keyboard on an 80-column terminal, QDbu does on a modern screen,
without giving up anything a customer's file demands: per-record locking, a
backup before every destructive operation, and a log of everything that changes
bytes on disk.

## Notice

QDbu was built as a **proof of concept and a study exercise**. It is provided
**without warranty of any kind**, express or implied, and **you use it at your
own risk**.

It writes to DBF files. PACK, ZAP, structure changes, bulk `REPLACE` and record
editing all change bytes on disk, and the pre-flight checklist reduces that risk
without removing it. Have a backup before pointing it at production data.

See [LICENSE](LICENSE).

## What it does

- **Opens and browses** DBFs of any size, with real pagination. A 421,000-record
  file opens as fast as a seven-record one.
- **Edits** record by record, in the grid or in the form.
- **Filters** by expression or through a guided builder.
- **Indexes**: opens existing `.ntx` files, creates new ones, picks the active
  order.
- **Changes structure**, packs (PACK) and empties (ZAP).
- **Exports** to CSV, JSON, XLSX and DBF; **imports** from CSV and JSON.

## Beyond the original DBU

DBU covered the essentials on an 80-column terminal. QDbu keeps what it did and
deals with what was left out:

**Several work areas at once**

- **Every registered folder visible in one tree**, with no limit and without
  changing directory. Each one named, and searchable.
- **One file per tab**, each with its own order, filter and field selection.
- **The session comes back as it was**: tabs, hidden fields, active order and
  the filter of each file.
- **Grid and form over the same record.** The form shows every field, including
  the ones the grid is hiding.
- **Pagination is anchor + offset** (`dbGoTo` → `dbSkip`), never an absolute
  offset: "the 5000th record" does not survive a change of order or filter.

**Shared mode that actually works**

- **`RLock()` per record, not `FLock()` on the file.** Editing a cell does not
  block the ERP that has the DBF open.
- **Writes carry `expect`**, checked inside the `RLock`. The comparison is on the
  bytes from `dbRecordInfo(DBRI_RAWRECORD)`, not on the value: in an `N(12,2)`,
  `FieldGet()` flattens "never filled" (the blanks from `APPEND BLANK`), `0.00`
  and "did not fit" (asterisks) into the same `0`. If the record changed since it
  was read, QDbu shows both sides and leaves the decision to the person at the
  keyboard.
- **Automatic re-read while idle**, repainting only what changed and preserving
  the scroll position.

**Not corrupting the file**

- **PACK, ZAP and structure changes go through a checklist that actually runs:**
  room for 3× the file set, a copy of the whole set (DBF, memo and `.ntx`), a
  size check on that copy, and only then the operation.
- **State rebound by a single routine.** After `dbPack()` the RecNos change, so
  the cursor comes back by key **and** by RecNo — key alone lands on the wrong
  row when there are duplicates, since a soft seek stops at the first match. For
  structure changes the indexes are closed first, because they would end up
  describing a file that no longer exists.
- **Cooperative cancellation**, always between whole records.
- **A JSONL log of every operation that changes bytes**, carrying the request and
  the outcome — the request's `backup: true` and the name of the file it created.

**Codepage and types**

- **Codepage per file**, with five lenses: CP850, Windows-1252, ISO-8859-1,
  CP860 and UTF-8, cascading file › connection › global. The language driver byte
  (offset 29) suggests but does not decide — most Clipper DBFs write `0x00`.
  Reading a 1252-encoded DBF through the DOS lens shows the wrong accents, and
  writes the wrong byte on the first `REPLACE`.
- **A value that does not fit the type is refused, never coerced.** `Val("abc")`
  would give `0`, and zero is plausible; `CToD("31/02/2026")` would give an empty
  date and wipe the one already there; a `C(40)` given 60 characters would be
  truncated in silence.
- **`.ntx` matched by key expression, not by name.** In real databases the index
  for `NETCLI.DBF` is called `ID1CLI.ntx`, and every developer uses whatever
  convention they like. QDbu reads the index header and checks that the fields it
  names exist in the file.
- **Index and filter expressions compile at runtime**, so the language functions
  are linked on purpose — without that, a `PADR()` in a key is rejected with
  "Undefined function", for a function that has existed in Clipper forever.
- **Errors carry `operation` and `args`, not just `description`.** A stray `W`
  typed into a WHILE clause tells you **which** variable does not exist.

**Interface**

- **Three languages** — Portuguese, English and Spanish — switchable without a
  restart.
- **Twelve themes**, one of them light, with contrast verified against the WCAG
  formula.

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
