# harbour-xlsxwriter

Author: Vailton Renato <vailtom at gmail dot com>

Harbour wrapper for `libxlsxwriter`.

The project creates real XLSX files with typed cells, without depending on
Microsoft Excel being installed on the machine.

## Upstream Project

This wrapper is built on top of `libxlsxwriter`, the C library for creating
Excel XLSX files by John McNamara.

- Website: https://libxlsxwriter.github.io/
- Source: https://github.com/jmcnamara/libxlsxwriter

## Goals

- Generate valid `.xlsx` files from Harbour applications.
- Preserve numeric, date and text semantics instead of exporting HTML as `.xls`.
- Support large reports using the `constant_memory` mode from `libxlsxwriter`.
- Keep the initial API small and predictable for production use.

## Initial Scope

- Workbook creation and close.
- Worksheet creation.
- String, number, date, formula and URL writing.
- Basic column width, row height, autofilter, merge range, freeze panes,
  header/footer, tab color and zoom support.
- Image insertion with scaling, offsets, object positioning, alt text and
  optional hyperlink.
- Runtime access to the linked `libxlsxwriter` version.
- Wrapper-level validation and last-error diagnostics.
- A Harbour class facade for easier use from `.prg` code.
- Basic reusable formats: bold, italic, underline, alignment, font color,
  fill color, border, border color, text wrap and number/date format strings.
- Cell comments with a simple API and an options-based API for visibility,
  author, box size and background color.

Advanced resources such as tables, data validation, charts and rich strings are
intentionally outside the first version.

## Build

The project is built with `hbmk2`.

Build the dependencies first:

```sh
hbmk2 zlib.hbp
hbmk2 libxlsxwriter.hbp
```

Then build the Harbour wrapper static library:

```sh
hbmk2 hbxlsxwriter.hbp
```

Applications can consume the wrapper through the package file:

```sh
hbmk2 my_report.prg hbxlsxwriter.hbc
```

The `.hbc` file adds the public include path, the repository library path and
the required static libraries: `hbxlsxwriter`, `xlsxwriter` and `zlib`.

The project also ships `hbxlsxwriter.hbx`, the Harbour external symbols file.
Use it when an application needs explicit external symbol requests:

```sh
hbmk2 my_report.prg hbxlsxwriter.hbc hbxlsxwriter.hbx
```

The dependency sources are stored under `3rd/` so the default build does not
depend on system-wide installations.

Static libraries are generated in the repository root:

- `zlib.lib`
- `xlsxwriter.lib`
- `hbxlsxwriter.lib`

The public package/helper files are:

- `hbxlsxwriter.hbc`
- `hbxlsxwriter.hbx`

To build and run the examples under `tests/`:

```sh
hbmk2 tests/hello.hbp -rebuild
hbmk2 tests/tutorial1.hbp -rebuild
hbmk2 tests/tutorial2.hbp -rebuild
hbmk2 tests/tutorial3.hbp -rebuild
hbmk2 tests/demo.hbp -rebuild
hbmk2 tests/outline.hbp -rebuild
hbmk2 tests/formatting.hbp -rebuild
hbmk2 tests/colors.hbp -rebuild
hbmk2 tests/worksheet_features.hbp -rebuild
hbmk2 tests/images.hbp -rebuild
hbmk2 tests/comments.hbp -rebuild
hbmk2 tests/large_products.hbp -rebuild
hbmk2 tests/sales_report.hbp -rebuild
hbmk2 tests/matriz_bcg.hbp -rebuild
```

Each test executable is generated next to its `.prg`, following the usual
Harbour example/tutorial convention.

## Tests And Examples

The `tests/` directory is executable documentation. Each `.prg` has a matching
`.hbp`, and the generated executable is placed next to the source file.

| File | Purpose | Main resources shown |
| --- | --- | --- |
| `hello.prg` | Smallest useful XLSX export. Useful to validate the build and the open/write/close flow. | Workbook creation, worksheet creation, string writing. |
| `tutorial1.prg` | Harbour version of the first upstream tutorial. Useful to understand typed text and numeric cells. | Strings, numbers, basic worksheet output. |
| `tutorial2.prg` | Harbour version of the second upstream tutorial. Useful to learn reusable formats. | `AddFormat()`, bold format, money number format, formula total. |
| `tutorial3.prg` | Harbour version of the third upstream tutorial. Useful to avoid writing dates as text. | Real Excel date cells, date number format. |
| `demo.prg` | Compact visual example. Useful as a smoke test with a visible image. | Text, numbers, bold format, column width, image insertion. |
| `outline.prg` | Row and column grouping example. Useful for analytic reports with collapsible detail. | `SetRowOutline()`, `SetColumnOutline()`, hidden/collapsed outline levels. |
| `formatting.prg` | General formatting guide. Useful as a quick reference for common cell styles. | Bold, italic, underline, alignment, fill, border, wrap, merge range, money format. |
| `colors.prg` | Color reference workbook. Useful to see constants and RGB values rendered in Excel. | `HBXW_COLOR_*`, direct `0xRRGGBB`, font color, fill color, border color. |
| `worksheet_features.prg` | Worksheet usability example. Useful for report headers and user-facing workbook behavior. | Merge range, freeze panes, header/footer, tab color, zoom, clickable URL. |
| `images.prg` | Image placement example. Useful for logos and report headers. | Original size, scaling, offsets, fixed object positioning, image hyperlink. |
| `comments.prg` | Cell comment example. Useful for review notes, audit hints and visible workbook guidance. | `WriteComment()`, `WriteCommentOpt()`, visible comments, author, comment box size, comment color. |
| `large_products.prg` | Large product listing example. Useful to validate exports with more than 20K rows without loading the worksheet in memory. | `constant_memory`, sequential row writing, typed cells, reusable formats, autofilter configured before data rows, total row outside the filter. |
| `sales_report.prg` | Report-oriented example. Useful as a base for business exports. | Typed strings/numbers, autofilter, column widths, formula total outside the filtered range. |
| `matriz_bcg.prg` | BCG matrix study example. Useful to reproduce a quadrant-style report with rotated labels and merged blocks. | Merged titles, colored sections, rotated text, page landscape, hidden gridlines. |

## Harbour API Reference

`THbXlsxWriter` is the Harbour facade over the C wrapper. It owns one workbook
handle, keeps one active worksheet, creates reusable workbook-owned formats and
writes typed XLSX cells without requiring Microsoft Excel to be installed.

Rows and columns in the Harbour API are 1-based unless a method explicitly says
otherwise. Optional `hFormat` parameters accept handles returned by
`AddFormat()` or `NIL`.

### Workbook Lifecycle

| Method | Parameters | Objective |
| --- | --- | --- |
| `New( cFileName, lConstantMemory, cTmpDir )` | `cFileName`: output `.xlsx`; `lConstantMemory`: `.T.` for large streaming-style exports; `cTmpDir`: optional temporary directory. | Creates the workbook handle and prepares the XLSX package. |
| `Close()` | None. | Finalizes the XLSX ZIP package, releases workbook-owned objects and returns the close error code. Always call it explicitly. |
| `IsOpen()` | None. | Returns whether the workbook handle is still available for write operations. |
| `LibVersion()` | None. | Returns the linked `libxlsxwriter` version for diagnostics and support. |

### Worksheet Methods

| Method | Parameters | Objective |
| --- | --- | --- |
| `AddSheet( cName )` | `cName`: worksheet name or `NIL` for the default name. | Adds a worksheet, makes it the active worksheet and returns its borrowed handle. |
| `SetColumn( nFirstCol, nLastCol, nWidth, hFormat )` | 1-based column range, width and optional format. | Sets width and optional default format for one column or a column range. |
| `SetRow( nRow, nHeight, hFormat )` | 1-based row, height or `NIL`, optional format. | Sets row height and optional default row format. |
| `SetRowOutline( nRow, nHeight, hFormat, lHidden, nLevel, lCollapsed )` | Row, height, optional format, hidden flag, level `0..7`, collapsed flag. | Configures Excel outline/grouping for one row. |
| `SetColumnOutline( nFirstCol, nLastCol, nWidth, hFormat, lHidden, nLevel, lCollapsed )` | Column range, width, optional format, hidden flag, level `0..7`, collapsed flag. | Configures Excel outline/grouping for one column range. |
| `AutoFilter( nFirstRow, nFirstCol, nLastRow, nLastCol )` | 1-based rectangular range. | Enables Excel autofilter for a range. In `constant_memory` mode, call it before writing past the filtered rows. |
| `MergeRange( nFirstRow, nFirstCol, nLastRow, nLastCol, cValue, hFormat )` | 1-based range, text value and optional format. | Merges a range and writes text into the top-left cell. Configure early in `constant_memory` mode. |
| `FreezePanes( nRows, nCols )` | Counts of top rows and left columns to freeze. Zero is valid. | Freezes panes for easier scrolling. Example: `FreezePanes( 1, 0 )` freezes the first row. |
| `SetLandscape()` | None. | Sets the worksheet print orientation to landscape. |
| `SetPortrait()` | None. | Sets the worksheet print orientation to portrait. |
| `SetGridlines( nOption )` | `HBXW_GRIDLINES_*` constant. | Controls screen and print gridline visibility. |
| `SetTabColor( nColor )` | `HBXW_COLOR_*` or direct `0xRRGGBB`. | Sets the worksheet tab color. |
| `SetHeader( cHeader )` | Excel header string. | Sets the printed page header. Excel control codes such as `&L`, `&C`, `&R`, `&P` and `&N` are passed through. |
| `SetFooter( cFooter )` | Excel footer string. | Sets the printed page footer using the same Excel control codes. |
| `SetZoom( nScale )` | Zoom percentage from `10` to `400`. | Sets the initial worksheet zoom in Excel. |

### Cell Writing Methods

| Method | Parameters | Objective |
| --- | --- | --- |
| `WriteString( nRow, nCol, cValue, hFormat )` | 1-based cell, string value, optional format. | Writes a real text cell. Use it for names, codes, identifiers and values with leading zeroes. |
| `WriteNumber( nRow, nCol, nValue, hFormat )` | 1-based cell, numeric value, optional format. | Writes a real numeric cell for quantities, money, costs, totals and percentages. |
| `WriteFormula( nRow, nCol, cFormula, hFormat )` | 1-based cell, Excel formula string, optional format. | Writes a formula for Excel to calculate when opening the file. |
| `WriteDate( nRow, nCol, dValue, hFormat )` | 1-based cell, Harbour date, optional date format. | Writes a Harbour date as a real Excel datetime cell. |
| `WriteComment( nRow, nCol, cText )` | 1-based cell and comment text. | Writes a standard Excel cell comment with the default library behavior. |
| `WriteCommentOpt( nRow, nCol, cText, nVisible, cAuthor, nWidth, nHeight, nColor )` | 1-based cell, comment text, `HBXW_COMMENT_DISPLAY_*`, optional author, width, height and color. | Writes a comment with practical display options for production reports. |
| `WriteUrl( nRow, nCol, cUrl, hFormat )` | 1-based cell, URL string, optional format. | Writes a clickable Excel hyperlink. Include a protocol such as `https://`. |

### Format Methods

| Method | Parameters | Objective |
| --- | --- | --- |
| `AddFormat()` | None. | Creates a workbook-owned format handle. Reuse handles; do not create one format per cell. |
| `FormatSetBold( hFormat )` | Format handle. | Enables bold text. |
| `FormatSetFontName( hFormat, cFontName )` | Format handle and font family name. | Sets the font family, such as `Arial`. |
| `FormatSetFontSize( hFormat, nSize )` | Format handle and size. | Sets the font size in points. |
| `FormatSetItalic( hFormat )` | Format handle. | Enables italic text. |
| `FormatSetUnderline( hFormat, nStyle )` | Format handle and `HBXW_UNDERLINE_*` style. | Applies underline; `NIL` defaults to single underline. |
| `FormatSetAlign( hFormat, nAlign )` | Format handle and `HBXW_ALIGN_*` constant. | Sets horizontal or vertical alignment. Call twice to combine both. |
| `FormatSetFontColor( hFormat, nColor )` | Format handle and color. | Sets the text color. |
| `FormatSetBgColor( hFormat, nColor )` | Format handle and color. | Sets the fill/background color. |
| `FormatSetFgColor( hFormat, nColor )` | Format handle and color. | Sets the foreground color for fill patterns. |
| `FormatSetBorder( hFormat, nBorder )` | Format handle and `HBXW_BORDER_*` constant. | Sets the same border style on all sides. |
| `FormatSetBorderColor( hFormat, nColor )` | Format handle and color. | Sets the same border color on all sides. |
| `FormatSetTextWrap( hFormat )` | Format handle. | Enables text wrapping for long values. |
| `FormatSetRotation( hFormat, nAngle )` | Format handle and angle. | Rotates text in a cell, including vertical labels. |
| `FormatSetNumFormat( hFormat, cNumFormat )` | Format handle and Excel number/date format string. | Applies formats such as `$#,##0.00` or `mmmm d yyyy` while preserving numeric/date cells. |

Color methods accept `HBXW_COLOR_*` constants or direct `0xRRGGBB` values. Use
`HBXW_COLOR_BLACK` for black because `libxlsxwriter` treats `0x000000` as an
unset color internally.

### Image Methods

| Method | Parameters | Objective |
| --- | --- | --- |
| `InsertImage( nRow, nCol, cFileName )` | 1-based cell and image path. | Inserts an image using the original file size. |
| `InsertImageOpt( nRow, nCol, cFileName, nXScale, nYScale, nXOffset, nYOffset, nObjectPosition, cDescription, cUrl, cTip )` | Cell, image path, X/Y scale, pixel offsets, `HBXW_OBJECT_*` positioning, alt text, optional URL and tooltip. | Inserts an image with controlled size and placement. `libxlsxwriter` uses scale factors instead of final width/height in pixels. |

### Error Methods

| Method | Parameters | Objective |
| --- | --- | --- |
| `LastError()` | None. | Returns the last wrapper-level or library error code. |
| `LastErrorMessage()` | None. | Returns a readable explanation for the last error. |
| `HasError()` | None. | Returns `.T.` when the last checked operation failed. |
| `ClearError()` | None. | Clears the stored error state after custom caller handling. |

Workbook and worksheet handles are opaque C pointers owned by `libxlsxwriter`.
Harbour code must store and pass them back, but must not free them.

The workbook handle is GC-managed at the C wrapper level. If Harbour code loses
the last object reference without calling `Close()`, the Harbour GC will close
the workbook as a fallback to avoid leaking memory and temporary files. This is
not a replacement for explicit `Close()`: production code must still call it so
it can receive and log the final `libxlsxwriter` error code.

Worksheet handles are borrowed pointers owned by the workbook. They are released
when the workbook closes and must never be freed directly.

Validation failures return negative wrapper error codes declared in
`hbxlsxwriter.ch`. Calls that reach `libxlsxwriter` still return the
library error code. Check `HasError()` or `LastErrorMessage()` when a method
returns an error or an expected handle is `NIL`.

When using `constant_memory` mode, configure worksheet features that reference
earlier rows before writing past those rows. For example, call `AutoFilter()`
after writing the header row and before writing the data rows. Otherwise the
underlying library can reject the operation and the generated XLSX will not
contain the filter.

## Threading

`THbXlsxWriter` is not MT-safe per instance. Do not share the same object across
Harbour threads. The object keeps mutable state such as the active worksheet and
the close state, and there are no locks around those values. Treat one workbook
object as owned by one thread.
