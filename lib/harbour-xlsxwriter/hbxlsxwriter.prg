/*
 * Author: Vailton Renato <vailtom at gmail dot com>
 * Version: 1.3
 * Release: 2026-04-21
 */

#include "hbclass.ch"
#include "hbxlsxwriter.ch"

/*
 * THbXlsxWriter is a small Harbour facade over the C functions exported by
 * hbxlsxwriter_api.c.
 *
 * Keep this class boring on purpose:
 * - the C layer owns the real libxlsxwriter pointers;
 * - this class only stores opaque handles returned by C;
 * - Harbour code must never free those handles directly;
 * - the workbook handle has a C-level Harbour GC finalizer as a leak fallback;
 * - worksheet and format handles are borrowed from the workbook;
 * - setting a handle to NIL only drops the Harbour reference;
 * - row and column arguments start at 1, matching spreadsheet users;
 * - C calls return libxlsxwriter error codes when they reach the library;
 * - validation failures return wrapper error codes declared in hbxlsxwriter.ch.
 *
 * New methods should follow the same pattern so reports can check errors
 * without the wrapper hiding what happened.
 */
CLASS THbXlsxWriter

   /*
    * Opaque GC-managed C handle returned by HBXW_WORKBOOK_NEW().
    * Close() should release it explicitly. If Harbour code loses the object
    * without Close(), the C-level GC finalizer closes the workbook as fallback.
    */
   VAR hWorkbook

   /*
    * Opaque C pointer for the active worksheet.
    * Owned by the workbook. Never free it from Harbour code.
    */
   VAR hWorksheet

   /* Stored mainly for diagnostics and future error messages. */
   VAR cFileName

   /*
    * Last wrapper-level error.
    * Zero means success. Negative values are wrapper errors declared in
    * hbxlsxwriter.ch. Positive values returned by write/close calls are
    * libxlsxwriter error codes.
    */
   VAR nLastError

   /* Human-readable explanation for nLastError. */
   VAR cLastError

   /*
    * True only after Close() successfully owns the shutdown path. This lets
    * Close() be harmless if called twice after a real close, while still
    * reporting an invalid workbook when creation failed.
    */
   VAR lClosed

   METHOD LibVersion()
   METHOD New( cFileName, lConstantMemory, cTmpDir )
   METHOD AddSheet( cName )
   METHOD AddFormat()
   METHOD FormatSetBold( hFormat )
   METHOD FormatSetFontName( hFormat, cFontName )
   METHOD FormatSetFontSize( hFormat, nSize )
   METHOD FormatSetAlign( hFormat, nAlign )
   METHOD FormatSetFontColor( hFormat, nColor )
   METHOD FormatSetBgColor( hFormat, nColor )
   METHOD FormatSetFgColor( hFormat, nColor )
   METHOD FormatSetBorder( hFormat, nBorder )
   METHOD FormatSetBorderColor( hFormat, nColor )
   METHOD FormatSetItalic( hFormat )
   METHOD FormatSetUnderline( hFormat, nStyle )
   METHOD FormatSetTextWrap( hFormat )
   METHOD FormatSetRotation( hFormat, nAngle )
   METHOD FormatSetNumFormat( hFormat, cNumFormat )
   METHOD WriteString( nRow, nCol, cValue, hFormat )
   METHOD WriteNumber( nRow, nCol, nValue, hFormat )
   METHOD WriteFormula( nRow, nCol, cFormula, hFormat )
   METHOD WriteDate( nRow, nCol, dValue, hFormat )
   METHOD WriteComment( nRow, nCol, cText )
   METHOD WriteCommentOpt( nRow, nCol, cText, nVisible, cAuthor, ;
                           nWidth, nHeight, nColor )
   METHOD WriteUrl( nRow, nCol, cUrl, hFormat )
   METHOD MergeRange( nFirstRow, nFirstCol, nLastRow, nLastCol, cValue, hFormat )
   METHOD FreezePanes( nRows, nCols )
   METHOD SetLandscape()
   METHOD SetPortrait()
   METHOD SetGridlines( nOption )
   METHOD SetColumn( nFirstCol, nLastCol, nWidth, hFormat )
   METHOD SetRow( nRow, nHeight, hFormat )
   METHOD SetRowOutline( nRow, nHeight, hFormat, lHidden, nLevel, lCollapsed )
   METHOD SetColumnOutline( nFirstCol, nLastCol, nWidth, hFormat, lHidden, nLevel, lCollapsed )
   METHOD AutoFilter( nFirstRow, nFirstCol, nLastRow, nLastCol )
   METHOD InsertImage( nRow, nCol, cFileName )
   METHOD InsertImageOpt( nRow, nCol, cFileName, nXScale, nYScale, ;
                          nXOffset, nYOffset, nObjectPosition, ;
                          cDescription, cUrl, cTip )
   METHOD SetTabColor( nColor )
   METHOD SetHeader( cHeader )
   METHOD SetFooter( cFooter )
   METHOD SetZoom( nScale )
   METHOD Close()
   METHOD IsOpen()
   METHOD LastError()
   METHOD LastErrorMessage()
   METHOD HasError()
   METHOD ClearError()
   METHOD SetError( nError, cMessage )
   METHOD CheckWorkbook( cOperation )
   METHOD CheckWorksheet( cOperation )
   METHOD CheckFormat( hFormat, cOperation )
   METHOD CheckCell( nRow, nCol, cOperation )
   METHOD CheckRange( nFirstRow, nFirstCol, nLastRow, nLastCol, cOperation )

ENDCLASS

/*
 * Return the linked libxlsxwriter version.
 */
METHOD LibVersion() CLASS THbXlsxWriter
RETURN HBXW_VERSION()

/*
 * Create the workbook handle.
 *
 * The returned hWorkbook is a GC-managed handle. Do not try to release it
 * manually from Harbour. Close() is the supported release path because it
 * returns the libxlsxwriter error code; the C-level GC finalizer only exists as
 * a fallback when report code loses the object without closing it.
 *
 * Default to constant_memory because report exports can be large. In that mode
 * libxlsxwriter uses temporary files while building the XLSX instead of
 * keeping all rows in memory.
 *
 * cTmpDir is optional. Systems with restricted temp folders can pass a
 * writable directory here when creating large workbooks.
 */
METHOD New( cFileName, lConstantMemory, cTmpDir ) CLASS THbXlsxWriter

   ::cFileName := cFileName
   ::hWorkbook := NIL
   ::hWorksheet := NIL
   ::nLastError := HBXW_OK
   ::cLastError := ""
   ::lClosed := .F.

   IF lConstantMemory == NIL
      lConstantMemory := .T.
   ENDIF

   IF cTmpDir == NIL
      cTmpDir := ""
   ENDIF

   IF ValType( cFileName ) != "C" .OR. Empty( cFileName )
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  "Cannot create workbook: file name must be a non-empty string." )
      RETURN Self
   ENDIF

   IF ValType( lConstantMemory ) != "L"
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  "Cannot create workbook: constant_memory must be logical." )
      RETURN Self
   ENDIF

   IF ValType( cTmpDir ) != "C"
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  "Cannot create workbook: temporary directory must be a string." )
      RETURN Self
   ENDIF

   ::hWorkbook := HBXW_WORKBOOK_NEW( cFileName, lConstantMemory, cTmpDir )

   IF ::hWorkbook == NIL
      ::SetError( HBXW_ERR_WORKBOOK_CREATE_FAILED, ;
                  "Cannot create workbook: libxlsxwriter returned a NULL workbook handle." )
      RETURN Self
   ENDIF

   ::ClearError()

RETURN Self

/*
 * Add a worksheet and make it the current worksheet.
 *
 * The returned worksheet handle belongs to the workbook. The Harbour object
 * stores it only to route subsequent write calls to the active sheet.
 *
 * For now the class keeps one "current worksheet". This is enough for the
 * first reports and keeps the Harbour API simple. Multi-sheet reports can
 * later store returned handles explicitly if needed.
 *
 * Do not assign the C return value directly to ::hWorksheet. A NULL worksheet
 * handle can be returned when the workbook is invalid, when the sheet name is
 * invalid, or when libxlsxwriter refuses a duplicate sheet name. In those
 * cases the previous active worksheet must not be overwritten by NIL.
 */
METHOD AddSheet( cName ) CLASS THbXlsxWriter

   LOCAL hWorksheet

   IF ! ::CheckWorkbook( "AddSheet" )
      RETURN NIL
   ENDIF

   IF cName != NIL .AND. ValType( cName ) != "C"
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  "AddSheet failed: sheet name must be a string or NIL." )
      RETURN NIL
   ENDIF

   hWorksheet := HBXW_ADD_WORKSHEET( ::hWorkbook, cName )

   IF hWorksheet == NIL
      ::SetError( HBXW_ERR_ADD_WORKSHEET_FAILED, ;
                  "AddSheet failed: libxlsxwriter returned a NULL worksheet handle." )
      RETURN NIL
   ENDIF

   ::hWorksheet := hWorksheet
   ::ClearError()

RETURN ::hWorksheet

/*
 * Add a workbook-owned format and return its borrowed handle.
 *
 * Formats are released when the workbook closes. Harbour code must never free
 * format handles directly. Keep format creation limited and reuse returned
 * handles; creating one format per cell is bad for memory and file size.
 */
METHOD AddFormat() CLASS THbXlsxWriter

   LOCAL hFormat

   IF ! ::CheckWorkbook( "AddFormat" )
      RETURN NIL
   ENDIF

   hFormat := HBXW_ADD_FORMAT( ::hWorkbook )

   IF hFormat == NIL
      ::SetError( HBXW_ERR_ADD_FORMAT_FAILED, ;
                  "AddFormat failed: libxlsxwriter returned a NULL format handle." )
      RETURN NIL
   ENDIF

   ::ClearError()

RETURN hFormat

/*
 * Set bold text on a format handle returned by AddFormat().
 */
METHOD FormatSetBold( hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetBold" )
      RETURN ::nLastError
   ENDIF

   nError := HBXW_FORMAT_SET_BOLD( hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetBold failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the font name on a format handle.
 */
METHOD FormatSetFontName( hFormat, cFontName ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetFontName" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cFontName ) != "C" .OR. Empty( cFontName )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetFontName failed: font name must be a non-empty string." )
   ENDIF

   nError := HBXW_FORMAT_SET_FONT_NAME( hFormat, cFontName )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetFontName failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the font size on a format handle.
 */
METHOD FormatSetFontSize( hFormat, nSize ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetFontSize" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nSize ) != "N" .OR. nSize <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetFontSize failed: font size must be numeric and greater than zero." )
   ENDIF

   nError := HBXW_FORMAT_SET_FONT_SIZE( hFormat, nSize )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetFontSize failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set horizontal or vertical alignment on a format handle.
 *
 * Use HBXW_ALIGN_* constants. It is valid to call this twice on the same
 * format when combining horizontal and vertical alignment.
 */
METHOD FormatSetAlign( hFormat, nAlign ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetAlign" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nAlign ) != "N" .OR. nAlign < HBXW_ALIGN_NONE .OR. ;
      nAlign > HBXW_ALIGN_VERTICAL_DISTRIBUTED
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetAlign failed: alignment constant is invalid." )
   ENDIF

   nError := HBXW_FORMAT_SET_ALIGN( hFormat, nAlign )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetAlign failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the font color on a format handle using a HBXW_COLOR_* or 0xRRGGBB value.
 */
METHOD FormatSetFontColor( hFormat, nColor ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetFontColor" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nColor ) != "N" .OR. nColor < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetFontColor failed: color must be numeric." )
   ENDIF

   nError := HBXW_FORMAT_SET_FONT_COLOR( hFormat, nColor )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetFontColor failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the background color on a format handle.
 */
METHOD FormatSetBgColor( hFormat, nColor ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetBgColor" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nColor ) != "N" .OR. nColor < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetBgColor failed: color must be numeric." )
   ENDIF

   nError := HBXW_FORMAT_SET_BG_COLOR( hFormat, nColor )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetBgColor failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the foreground color on a format handle.
 */
METHOD FormatSetFgColor( hFormat, nColor ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetFgColor" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nColor ) != "N" .OR. nColor < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetFgColor failed: color must be numeric." )
   ENDIF

   nError := HBXW_FORMAT_SET_FG_COLOR( hFormat, nColor )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetFgColor failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set all cell borders on a format handle.
 */
METHOD FormatSetBorder( hFormat, nBorder ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetBorder" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nBorder ) != "N" .OR. nBorder < HBXW_BORDER_NONE .OR. ;
      nBorder > HBXW_BORDER_SLANT_DASH_DOT
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetBorder failed: border constant is invalid." )
   ENDIF

   nError := HBXW_FORMAT_SET_BORDER( hFormat, nBorder )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetBorder failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the color for all cell borders on a format handle.
 *
 * Use a HBXW_COLOR_* constant or a direct 0xRRGGBB value. For black, prefer
 * HBXW_COLOR_BLACK because libxlsxwriter treats 0x000000 as an unset color.
 */
METHOD FormatSetBorderColor( hFormat, nColor ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetBorderColor" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nColor ) != "N" .OR. nColor < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetBorderColor failed: color must be numeric." )
   ENDIF

   nError := HBXW_FORMAT_SET_BORDER_COLOR( hFormat, nColor )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetBorderColor failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set italic text on a format handle.
 */
METHOD FormatSetItalic( hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetItalic" )
      RETURN ::nLastError
   ENDIF

   nError := HBXW_FORMAT_SET_ITALIC( hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetItalic failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set underline style on a format handle.
 */
METHOD FormatSetUnderline( hFormat, nStyle ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetUnderline" )
      RETURN ::nLastError
   ENDIF

   IF nStyle == NIL
      nStyle := HBXW_UNDERLINE_SINGLE
   ENDIF

   IF ValType( nStyle ) != "N" .OR. nStyle < HBXW_UNDERLINE_NONE .OR. ;
      nStyle > HBXW_UNDERLINE_DOUBLE_ACCOUNTING
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetUnderline failed: underline constant is invalid." )
   ENDIF

   nError := HBXW_FORMAT_SET_UNDERLINE( hFormat, nStyle )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetUnderline failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Enable text wrapping on a format handle.
 */
METHOD FormatSetTextWrap( hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetTextWrap" )
      RETURN ::nLastError
   ENDIF

   nError := HBXW_FORMAT_SET_TEXT_WRAP( hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetTextWrap failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Rotate text in a format handle.
 */
METHOD FormatSetRotation( hFormat, nAngle ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetRotation" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nAngle ) != "N" .OR. ;
      ( nAngle < -90 .OR. nAngle > 90 ) .AND. nAngle != 270
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetRotation failed: angle must be between -90 and 90, or 270." )
   ENDIF

   nError := HBXW_FORMAT_SET_ROTATION( hFormat, nAngle )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetRotation failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set an Excel number/date format string on a format handle.
 *
 * Examples: "$#,##0" for money, "mmmm d yyyy" for dates.
 */
METHOD FormatSetNumFormat( hFormat, cNumFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckFormat( hFormat, "FormatSetNumFormat" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cNumFormat ) != "C" .OR. Empty( cNumFormat )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FormatSetNumFormat failed: number format must be a non-empty string." )
   ENDIF

   nError := HBXW_FORMAT_SET_NUM_FORMAT( hFormat, cNumFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_FORMAT_FAILED, ;
                         "FormatSetNumFormat failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Use WriteString() only for real text. Codes with leading zeroes should also
 * be written as strings so Excel does not strip formatting.
 *
 * hFormat is optional and must be a format handle returned by AddFormat().
 */
METHOD WriteString( nRow, nCol, cValue, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteString" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteString" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cValue ) != "C"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteString failed: value must be a string." )
   ENDIF

   nError := HBXW_WRITE_STRING( ::hWorksheet, nRow, nCol, cValue, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteString failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Use WriteNumber() for quantities, money, costs and calculated totals.
 *
 * hFormat is optional and must be a format handle returned by AddFormat().
 */
METHOD WriteNumber( nRow, nCol, nValue, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteNumber" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteNumber" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nValue ) != "N"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteNumber failed: value must be numeric." )
   ENDIF

   nError := HBXW_WRITE_NUMBER( ::hWorksheet, nRow, nCol, nValue, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteNumber failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Formulas are stored in the file and recalculated by Excel. Do not depend on
 * formula results for integrations that read the XLSX without recalculation.
 *
 * hFormat is optional and must be a format handle returned by AddFormat().
 */
METHOD WriteFormula( nRow, nCol, cFormula, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteFormula" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteFormula" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cFormula ) != "C" .OR. Empty( cFormula )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteFormula failed: formula must be a non-empty string." )
   ENDIF

   nError := HBXW_WRITE_FORMULA( ::hWorksheet, nRow, nCol, cFormula, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteFormula failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Write a Harbour date as a real Excel datetime cell.
 *
 * hFormat should usually contain a date number format such as "mmmm d yyyy".
 */
METHOD WriteDate( nRow, nCol, dValue, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteDate" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteDate" )
      RETURN ::nLastError
   ENDIF

   IF ValType( dValue ) != "D" .OR. Empty( dValue )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteDate failed: value must be a non-empty Harbour date." )
   ENDIF

   nError := HBXW_WRITE_DATETIME( ::hWorksheet, nRow, nCol, ;
                                  Year( dValue ), Month( dValue ), Day( dValue ), ;
                                  hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteDate failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Write a standard Excel cell comment.
 *
 * The comment is hidden by default in Excel and appears as the red triangle in
 * the cell corner.
 */
METHOD WriteComment( nRow, nCol, cText ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteComment" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteComment" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cText ) != "C" .OR. Empty( cText )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteComment failed: comment text must be a non-empty string." )
   ENDIF

   nError := HBXW_WRITE_COMMENT( ::hWorksheet, nRow, nCol, cText )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteComment failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Write a comment with practical display options.
 *
 * nVisible uses HBXW_COMMENT_DISPLAY_* constants. cAuthor is optional.
 * Width and height are pixel sizes for the comment box. nColor uses
 * HBXW_COLOR_* or a direct 0xRRGGBB value.
 */
METHOD WriteCommentOpt( nRow, nCol, cText, nVisible, cAuthor, ;
                        nWidth, nHeight, nColor ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteCommentOpt" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteCommentOpt" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cText ) != "C" .OR. Empty( cText )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteCommentOpt failed: comment text must be a non-empty string." )
   ENDIF

   IF nVisible == NIL
      nVisible := HBXW_COMMENT_DISPLAY_DEFAULT
   ENDIF

   IF cAuthor == NIL
      cAuthor := ""
   ENDIF

   IF nWidth == NIL
      nWidth := 0
   ENDIF

   IF nHeight == NIL
      nHeight := 0
   ENDIF

   IF nColor == NIL
      nColor := 0
   ENDIF

   IF ValType( nVisible ) != "N" .OR. ;
      nVisible < HBXW_COMMENT_DISPLAY_DEFAULT .OR. ;
      nVisible > HBXW_COMMENT_DISPLAY_VISIBLE
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteCommentOpt failed: comment visibility constant is invalid." )
   ENDIF

   IF ValType( cAuthor ) != "C"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteCommentOpt failed: author must be a string." )
   ENDIF

   IF ValType( nWidth ) != "N" .OR. ValType( nHeight ) != "N" .OR. ;
      nWidth < 0 .OR. nHeight < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteCommentOpt failed: width and height must be zero or greater." )
   ENDIF

   IF ValType( nColor ) != "N" .OR. nColor < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteCommentOpt failed: color must be numeric." )
   ENDIF

   nError := HBXW_WRITE_COMMENT_OPT( ::hWorksheet, nRow, nCol, cText, ;
                                     nVisible, cAuthor, nWidth, nHeight, nColor )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteCommentOpt failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Write a clickable URL.
 *
 * The URL must include a protocol such as "https://". hFormat is optional.
 */
METHOD WriteUrl( nRow, nCol, cUrl, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "WriteUrl" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "WriteUrl" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cUrl ) != "C" .OR. Empty( cUrl )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "WriteUrl failed: URL must be a non-empty string." )
   ENDIF

   nError := HBXW_WRITE_URL( ::hWorksheet, nRow, nCol, cUrl, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WRITE_FAILED, ;
                         "WriteUrl failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Merge a rectangular range and write text into the first cell.
 *
 * In constant_memory mode, libxlsxwriter writes rows sequentially. Configure
 * merged ranges before writing past the rows involved in the merge.
 */
METHOD MergeRange( nFirstRow, nFirstCol, nLastRow, nLastCol, cValue, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "MergeRange" ) .OR. ;
      ! ::CheckRange( nFirstRow, nFirstCol, nLastRow, nLastCol, "MergeRange" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cValue ) != "C"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "MergeRange failed: value must be a string." )
   ENDIF

   nError := HBXW_MERGE_RANGE( ::hWorksheet, nFirstRow, nFirstCol, ;
                               nLastRow, nLastCol, cValue, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "MergeRange failed. In constant_memory mode call it " + ;
                         "before writing past the merged rows. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Freeze the first nRows rows and first nCols columns.
 *
 * This method intentionally accepts zero because these parameters are counts,
 * not normal 1-based spreadsheet coordinates. Examples:
 * - FreezePanes( 1, 0 ) freezes only the first row.
 * - FreezePanes( 1, 1 ) freezes the first row and the first column.
 */
METHOD FreezePanes( nRows, nCols ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "FreezePanes" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nRows ) != "N" .OR. ValType( nCols ) != "N" .OR. ;
      nRows < 0 .OR. nCols < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "FreezePanes failed: row and column counts must be zero or greater." )
   ENDIF

   nError := HBXW_FREEZE_PANES( ::hWorksheet, nRows, nCols )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "FreezePanes failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the worksheet page orientation to landscape.
 */
METHOD SetLandscape() CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetLandscape" )
      RETURN ::nLastError
   ENDIF

   nError := HBXW_SET_LANDSCAPE( ::hWorksheet )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetLandscape failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the worksheet page orientation to portrait.
 */
METHOD SetPortrait() CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetPortrait" )
      RETURN ::nLastError
   ENDIF

   nError := HBXW_SET_PORTRAIT( ::hWorksheet )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetPortrait failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Control worksheet gridline visibility.
 */
METHOD SetGridlines( nOption ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetGridlines" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nOption ) != "N" .OR. nOption < HBXW_GRIDLINES_HIDE_ALL .OR. ;
      nOption > HBXW_GRIDLINES_SHOW_ALL
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetGridlines failed: option is invalid." )
   ENDIF

   nError := HBXW_SET_GRIDLINES( ::hWorksheet, nOption )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetGridlines failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the width and optional default format for one column or a column range.
 */
METHOD SetColumn( nFirstCol, nLastCol, nWidth, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetColumn" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nFirstCol ) != "N" .OR. ValType( nLastCol ) != "N" .OR. ;
      nFirstCol <= 0 .OR. nLastCol <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetColumn failed: column numbers must be positive." )
   ENDIF

   IF ValType( nWidth ) != "N" .OR. nWidth < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetColumn failed: width must be zero or greater." )
   ENDIF

   nError := HBXW_SET_COLUMN( ::hWorksheet, nFirstCol, nLastCol, nWidth, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_SET_COLUMN_FAILED, ;
                         "SetColumn failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set row height and optional default row format.
 *
 * Pass NIL or a non-positive height to keep libxlsxwriter's default row height
 * while applying a format to the row.
 */
METHOD SetRow( nRow, nHeight, hFormat ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetRow" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nRow ) != "N" .OR. nRow <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetRow failed: row number must be positive." )
   ENDIF

   IF nHeight != NIL .AND. ValType( nHeight ) != "N"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetRow failed: height must be numeric or NIL." )
   ENDIF

   nError := HBXW_SET_ROW( ::hWorksheet, nRow, nHeight, hFormat )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_SET_ROW_FAILED, ;
                         "SetRow failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set row outline/grouping options.
 *
 * nLevel uses Excel outline levels 0..7. lHidden controls whether the row is
 * initially hidden. lCollapsed marks the visible row that displays the plus
 * symbol for a collapsed group.
 */
METHOD SetRowOutline( nRow, nHeight, hFormat, lHidden, nLevel, lCollapsed ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetRowOutline" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nRow ) != "N" .OR. nRow <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetRowOutline failed: row number must be positive." )
   ENDIF

   IF nHeight != NIL .AND. ValType( nHeight ) != "N"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetRowOutline failed: height must be numeric or NIL." )
   ENDIF

   IF ValType( lHidden ) != "L" .OR. ValType( lCollapsed ) != "L"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetRowOutline failed: hidden and collapsed must be logical." )
   ENDIF

   IF ValType( nLevel ) != "N" .OR. nLevel < 0 .OR. nLevel > 7
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetRowOutline failed: outline level must be between 0 and 7." )
   ENDIF

   nError := HBXW_SET_ROW_OPT( ::hWorksheet, nRow, nHeight, hFormat, ;
                               lHidden, nLevel, lCollapsed )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_SET_ROW_FAILED, ;
                         "SetRowOutline failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set column outline/grouping options.
 */
METHOD SetColumnOutline( nFirstCol, nLastCol, nWidth, hFormat, lHidden, nLevel, lCollapsed ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetColumnOutline" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nFirstCol ) != "N" .OR. ValType( nLastCol ) != "N" .OR. ;
      nFirstCol <= 0 .OR. nLastCol <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetColumnOutline failed: column numbers must be positive." )
   ENDIF

   IF ValType( nWidth ) != "N" .OR. nWidth < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetColumnOutline failed: width must be zero or greater." )
   ENDIF

   IF ValType( lHidden ) != "L" .OR. ValType( lCollapsed ) != "L"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetColumnOutline failed: hidden and collapsed must be logical." )
   ENDIF

   IF ValType( nLevel ) != "N" .OR. nLevel < 0 .OR. nLevel > 7
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetColumnOutline failed: outline level must be between 0 and 7." )
   ENDIF

   nError := HBXW_SET_COLUMN_OPT( ::hWorksheet, nFirstCol, nLastCol, nWidth, hFormat, ;
                                  lHidden, nLevel, lCollapsed )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_SET_COLUMN_FAILED, ;
                         "SetColumnOutline failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Enable Excel autofilter for a rectangular range.
 *
 * Important for constant_memory mode:
 * libxlsxwriter writes rows sequentially and refuses some operations that point
 * back to rows already flushed. If AutoFilter() is called after writing past
 * nLastRow, worksheet_autofilter() can return an error and the XLSX will be
 * generated without the <autoFilter> element.
 *
 * Safe rule for report code:
 * configure AutoFilter() as soon as the final range is known, preferably right
 * after writing the header row and before writing the data rows. Keep total
 * rows outside the filter range when they should not be filtered as data.
 */
METHOD AutoFilter( nFirstRow, nFirstCol, nLastRow, nLastCol ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "AutoFilter" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nFirstRow ) != "N" .OR. ValType( nFirstCol ) != "N" .OR. ;
      ValType( nLastRow ) != "N" .OR. ValType( nLastCol ) != "N" .OR. ;
      nFirstRow <= 0 .OR. nFirstCol <= 0 .OR. nLastRow <= 0 .OR. nLastCol <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "AutoFilter failed: range coordinates must be positive." )
   ENDIF

   nError := HBXW_AUTOFILTER( ::hWorksheet, nFirstRow, nFirstCol, nLastRow, nLastCol )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_AUTOFILTER_FAILED, ;
                         "AutoFilter failed. In constant_memory mode call it " + ;
                         "before writing past the filter range. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Insert an image file at the given cell.
 *
 * The file path is resolved by libxlsxwriter from the current process working
 * directory. Tests keep image assets next to their .prg files and use a
 * fallback path when executed from the repository root.
 */
METHOD InsertImage( nRow, nCol, cFileName ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "InsertImage" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "InsertImage" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cFileName ) != "C" .OR. Empty( cFileName )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "InsertImage failed: file name must be a non-empty string." )
   ENDIF

   nError := HBXW_INSERT_IMAGE( ::hWorksheet, nRow, nCol, cFileName )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_INSERT_IMAGE_FAILED, ;
                         "InsertImage failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Insert an image with scaling and positioning options.
 *
 * libxlsxwriter exposes image size as scale factors, not final width/height in
 * pixels. Examples:
 * - nXScale = 0.50 and nYScale = 0.50 inserts at 50% of the original size.
 * - nXScale = 1.00 and nYScale = 1.00 keeps the original size.
 *
 * nXOffset and nYOffset are pixel offsets inside the target cell.
 *
 * nObjectPosition uses HBXW_OBJECT_* constants. The default keeps Excel's
 * normal object behavior. Use HBXW_OBJECT_DONT_MOVE_DONT_SIZE when the image
 * must stay fixed even if rows or columns are resized.
 *
 * cDescription is alt text. cUrl and cTip are optional hyperlink data.
 */
METHOD InsertImageOpt( nRow, nCol, cFileName, nXScale, nYScale, ;
                       nXOffset, nYOffset, nObjectPosition, ;
                       cDescription, cUrl, cTip ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "InsertImageOpt" ) .OR. ;
      ! ::CheckCell( nRow, nCol, "InsertImageOpt" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cFileName ) != "C" .OR. Empty( cFileName )
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "InsertImageOpt failed: file name must be a non-empty string." )
   ENDIF

   IF nXScale == NIL
      nXScale := 1.00
   ENDIF

   IF nYScale == NIL
      nYScale := 1.00
   ENDIF

   IF nXOffset == NIL
      nXOffset := 0
   ENDIF

   IF nYOffset == NIL
      nYOffset := 0
   ENDIF

   IF nObjectPosition == NIL
      nObjectPosition := HBXW_OBJECT_POSITION_DEFAULT
   ENDIF

   IF cDescription == NIL
      cDescription := ""
   ENDIF

   IF cUrl == NIL
      cUrl := ""
   ENDIF

   IF cTip == NIL
      cTip := ""
   ENDIF

   IF ValType( nXScale ) != "N" .OR. ValType( nYScale ) != "N" .OR. ;
      nXScale <= 0 .OR. nYScale <= 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "InsertImageOpt failed: scale values must be positive numbers." )
   ENDIF

   IF ValType( nXOffset ) != "N" .OR. ValType( nYOffset ) != "N" .OR. ;
      nXOffset < 0 .OR. nYOffset < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "InsertImageOpt failed: offsets must be zero or greater." )
   ENDIF

   IF ValType( nObjectPosition ) != "N" .OR. ;
      nObjectPosition < HBXW_OBJECT_POSITION_DEFAULT .OR. ;
      nObjectPosition > HBXW_OBJECT_MOVE_AND_SIZE_AFTER
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "InsertImageOpt failed: object position constant is invalid." )
   ENDIF

   IF ValType( cDescription ) != "C" .OR. ValType( cUrl ) != "C" .OR. ;
      ValType( cTip ) != "C"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "InsertImageOpt failed: description, URL and tip must be strings." )
   ENDIF

   nError := HBXW_INSERT_IMAGE_OPT( ::hWorksheet, nRow, nCol, cFileName, ;
                                    nXScale, nYScale, nXOffset, nYOffset, ;
                                    nObjectPosition, cDescription, cUrl, cTip )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_INSERT_IMAGE_FAILED, ;
                         "InsertImageOpt failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the worksheet tab color using a HBXW_COLOR_* or 0xRRGGBB value.
 */
METHOD SetTabColor( nColor ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetTabColor" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nColor ) != "N" .OR. nColor < 0
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetTabColor failed: color must be numeric." )
   ENDIF

   nError := HBXW_SET_TAB_COLOR( ::hWorksheet, nColor )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetTabColor failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the printable page header.
 *
 * Excel header/footer control codes such as &L, &C, &R, &P and &N are passed
 * through to libxlsxwriter unchanged.
 */
METHOD SetHeader( cHeader ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetHeader" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cHeader ) != "C"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetHeader failed: header must be a string." )
   ENDIF

   nError := HBXW_SET_HEADER( ::hWorksheet, cHeader )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetHeader failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the printable page footer.
 */
METHOD SetFooter( cFooter ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetFooter" )
      RETURN ::nLastError
   ENDIF

   IF ValType( cFooter ) != "C"
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetFooter failed: footer must be a string." )
   ENDIF

   nError := HBXW_SET_FOOTER( ::hWorksheet, cFooter )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetFooter failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Set the initial worksheet zoom.
 *
 * Excel expects a percentage from 10 to 400.
 */
METHOD SetZoom( nScale ) CLASS THbXlsxWriter

   LOCAL nError

   IF ! ::CheckWorksheet( "SetZoom" )
      RETURN ::nLastError
   ENDIF

   IF ValType( nScale ) != "N" .OR. nScale < 10 .OR. nScale > 400
      RETURN ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                         "SetZoom failed: scale must be between 10 and 400." )
   ENDIF

   nError := HBXW_SET_ZOOM( ::hWorksheet, nScale )

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_WORKSHEET_FAILED, ;
                         "SetZoom failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Close the workbook.
 *
 * Close() is mandatory. It writes the final XLSX package and releases the C
 * workbook and all workbook-owned objects such as worksheets. After closing,
 * clear the Harbour handles to avoid accidental reuse.
 *
 * The C workbook handle also has a Harbour GC finalizer. That finalizer protects
 * long-running applications from leaks if the object is abandoned, but explicit
 * Close() remains required for predictable error handling. Both paths set the
 * internal workbook pointer to NULL after closing, preventing double close.
 */
METHOD Close() CLASS THbXlsxWriter

   LOCAL nError

   IF ::lClosed .AND. ::hWorkbook == NIL
      RETURN ::ClearError()
   ENDIF

   IF ! ::CheckWorkbook( "Close" )
      RETURN ::nLastError
   ENDIF

   nError := HBXW_WORKBOOK_CLOSE( ::hWorkbook )

   ::hWorkbook := NIL
   ::hWorksheet := NIL
   ::lClosed := .T.

   IF nError != HBXW_OK
      RETURN ::SetError( HBXW_ERR_CLOSE_FAILED, ;
                         "Close failed. libxlsxwriter error: " + ;
                         LTrim( Str( nError ) ) )
   ENDIF

   ::ClearError()

RETURN nError

/*
 * Return .T. while the workbook handle is still valid for write operations.
 */
METHOD IsOpen() CLASS THbXlsxWriter
RETURN ::hWorkbook != NIL .AND. ! ::lClosed

/*
 * Return the last wrapper-level error code.
 */
METHOD LastError() CLASS THbXlsxWriter
RETURN ::nLastError

/*
 * Return the last human-readable error message.
 */
METHOD LastErrorMessage() CLASS THbXlsxWriter
RETURN ::cLastError

/*
 * Return .T. when the last checked operation failed.
 */
METHOD HasError() CLASS THbXlsxWriter
RETURN ::nLastError != HBXW_OK

/*
 * Clear the last error after a successful operation.
 */
METHOD ClearError() CLASS THbXlsxWriter

   ::nLastError := HBXW_OK
   ::cLastError := ""

RETURN HBXW_OK

/*
 * Store a predictable error code and message for the Harbour caller.
 */
METHOD SetError( nError, cMessage ) CLASS THbXlsxWriter

   ::nLastError := nError
   ::cLastError := cMessage

RETURN nError

/*
 * Validate that the workbook handle exists before calling the C layer.
 */
METHOD CheckWorkbook( cOperation ) CLASS THbXlsxWriter

   IF ::hWorkbook == NIL
      ::SetError( HBXW_ERR_INVALID_WORKBOOK, ;
                  cOperation + " failed: workbook handle is invalid." )
      RETURN .F.
   ENDIF

RETURN .T.

/*
 * Validate that a worksheet is active before using worksheet operations.
 */
METHOD CheckWorksheet( cOperation ) CLASS THbXlsxWriter

   IF ! ::CheckWorkbook( cOperation )
      RETURN .F.
   ENDIF

   IF ::hWorksheet == NIL
      ::SetError( HBXW_ERR_INVALID_WORKSHEET, ;
                  cOperation + " failed: worksheet handle is invalid." )
      RETURN .F.
   ENDIF

RETURN .T.

/*
 * Validate a workbook-owned format handle before calling C format setters.
 */
METHOD CheckFormat( hFormat, cOperation ) CLASS THbXlsxWriter

   IF hFormat == NIL
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  cOperation + " failed: format handle is invalid." )
      RETURN .F.
   ENDIF

RETURN .T.

/*
 * Validate public 1-based row and column coordinates.
 */
METHOD CheckCell( nRow, nCol, cOperation ) CLASS THbXlsxWriter

   IF ValType( nRow ) != "N" .OR. ValType( nCol ) != "N" .OR. ;
      nRow <= 0 .OR. nCol <= 0
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  cOperation + " failed: row and column must be positive." )
      RETURN .F.
   ENDIF

RETURN .T.

/*
 * Validate public 1-based rectangular ranges.
 */
METHOD CheckRange( nFirstRow, nFirstCol, nLastRow, nLastCol, cOperation ) CLASS THbXlsxWriter

   IF ! ::CheckCell( nFirstRow, nFirstCol, cOperation ) .OR. ;
      ! ::CheckCell( nLastRow, nLastCol, cOperation )
      RETURN .F.
   ENDIF

   IF nLastRow < nFirstRow .OR. nLastCol < nFirstCol
      ::SetError( HBXW_ERR_INVALID_ARGUMENT, ;
                  cOperation + " failed: final range coordinates must be after initial coordinates." )
      RETURN .F.
   ENDIF

RETURN .T.
