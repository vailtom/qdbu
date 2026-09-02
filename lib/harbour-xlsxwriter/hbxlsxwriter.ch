/*
 * Author: Vailton Renato <vailtom at gmail dot com>
 * Version: 1.3
 * Release: 2026-04-21
 */

#ifndef HBXLSXWRITER_CH_
#define HBXLSXWRITER_CH_

#define HBXW_OK 0

#define HBXW_ERR_INVALID_WORKBOOK      -1
#define HBXW_ERR_INVALID_WORKSHEET     -2
#define HBXW_ERR_WORKBOOK_CREATE_FAILED -3
#define HBXW_ERR_ADD_WORKSHEET_FAILED  -4
#define HBXW_ERR_INVALID_ARGUMENT      -5
#define HBXW_ERR_WRITE_FAILED          -6
#define HBXW_ERR_SET_COLUMN_FAILED     -7
#define HBXW_ERR_AUTOFILTER_FAILED     -8
#define HBXW_ERR_CLOSE_FAILED          -9
#define HBXW_ERR_ADD_FORMAT_FAILED     -10
#define HBXW_ERR_FORMAT_FAILED         -11
#define HBXW_ERR_INSERT_IMAGE_FAILED   -12
#define HBXW_ERR_SET_ROW_FAILED        -13
#define HBXW_ERR_WORKSHEET_FAILED      -14

#define HBXW_UNDERLINE_NONE              0
#define HBXW_UNDERLINE_SINGLE            1
#define HBXW_UNDERLINE_DOUBLE            2
#define HBXW_UNDERLINE_SINGLE_ACCOUNTING 3
#define HBXW_UNDERLINE_DOUBLE_ACCOUNTING 4

#define HBXW_ALIGN_NONE                 0
#define HBXW_ALIGN_LEFT                 1
#define HBXW_ALIGN_CENTER               2
#define HBXW_ALIGN_RIGHT                3
#define HBXW_ALIGN_FILL                 4
#define HBXW_ALIGN_JUSTIFY              5
#define HBXW_ALIGN_CENTER_ACROSS        6
#define HBXW_ALIGN_DISTRIBUTED          7
#define HBXW_ALIGN_VERTICAL_TOP         8
#define HBXW_ALIGN_VERTICAL_BOTTOM      9
#define HBXW_ALIGN_VERTICAL_CENTER      10
#define HBXW_ALIGN_VERTICAL_JUSTIFY     11
#define HBXW_ALIGN_VERTICAL_DISTRIBUTED 12

#define HBXW_BORDER_NONE                0
#define HBXW_BORDER_THIN                1
#define HBXW_BORDER_MEDIUM              2
#define HBXW_BORDER_DASHED              3
#define HBXW_BORDER_DOTTED              4
#define HBXW_BORDER_THICK               5
#define HBXW_BORDER_DOUBLE              6
#define HBXW_BORDER_HAIR                7
#define HBXW_BORDER_MEDIUM_DASHED       8
#define HBXW_BORDER_DASH_DOT            9
#define HBXW_BORDER_MEDIUM_DASH_DOT     10
#define HBXW_BORDER_DASH_DOT_DOT        11
#define HBXW_BORDER_MEDIUM_DASH_DOT_DOT 12
#define HBXW_BORDER_SLANT_DASH_DOT      13

#define HBXW_GRIDLINES_HIDE_ALL          0
#define HBXW_GRIDLINES_SHOW_SCREEN       1
#define HBXW_GRIDLINES_SHOW_PRINT        2
#define HBXW_GRIDLINES_SHOW_ALL          3

/*
 * Common RGB colors used by format and worksheet methods.
 *
 * The wrapper accepts these constants and any direct 0xRRGGBB numeric value.
 * Example: HBXW_COLOR_BLUE and 0x0000FF are the same color.
 *
 * Black is the exception: use HBXW_COLOR_BLACK. libxlsxwriter uses 0x000000
 * internally as "unset", so its black constant has a special value.
 *
 * libxlsxwriter writes the final XLSX color internally as ARGB, so the XML may
 * show 0x0000FF as FF0000FF.
 */
#define HBXW_COLOR_BLACK                0x1000000
#define HBXW_COLOR_BLUE                 0x0000FF
#define HBXW_COLOR_BROWN                0x800000
#define HBXW_COLOR_CYAN                 0x00FFFF
#define HBXW_COLOR_GRAY                 0x808080
#define HBXW_COLOR_RED                  0xFF0000
#define HBXW_COLOR_GREEN                0x008000
#define HBXW_COLOR_LIME                 0x00FF00
#define HBXW_COLOR_MAGENTA              0xFF00FF
#define HBXW_COLOR_NAVY                 0x000080
#define HBXW_COLOR_ORANGE               0xFF6600
#define HBXW_COLOR_PINK                 0xFF00FF
#define HBXW_COLOR_PURPLE               0x800080
#define HBXW_COLOR_SILVER               0xC0C0C0
#define HBXW_COLOR_WHITE                0xFFFFFF
#define HBXW_COLOR_YELLOW               0xFFFF00

#define HBXW_OBJECT_POSITION_DEFAULT              0
#define HBXW_OBJECT_MOVE_AND_SIZE                 1
#define HBXW_OBJECT_MOVE_DONT_SIZE                2
#define HBXW_OBJECT_DONT_MOVE_DONT_SIZE           3
#define HBXW_OBJECT_MOVE_AND_SIZE_AFTER           4

#define HBXW_COMMENT_DISPLAY_DEFAULT              0
#define HBXW_COMMENT_DISPLAY_HIDDEN               1
#define HBXW_COMMENT_DISPLAY_VISIBLE              2

#endif
