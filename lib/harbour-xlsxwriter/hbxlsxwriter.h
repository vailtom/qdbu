/*
 * Author: Vailton Renato <vailtom at gmail dot com>
 * Version: 1.3
 * Release: 2026-04-21
 */

#ifndef HBXLSXWRITER_H_
   #define HBXLSXWRITER_H_

   #include "hbapi.h"
   #include "xlsxwriter.h"

   #define HBXW_TRUE  1
   #define HBXW_FALSE 0

   HB_EXTERN_BEGIN

   /*
    * Helper functions shared by the Harbour-callable C wrappers.
    *
    * Harbour passes C handles as opaque pointer values. These helpers keep the
    * casts in one place so exported functions stay small and easier to audit.
    *
    * Workbook handles returned to Harbour are GC-managed owner handles. The raw
    * lxw_workbook pointer inside that handle is closed by HBXW_WORKBOOK_CLOSE()
    * or, as a fallback, by the Harbour GC finalizer.
    *
    * Worksheet handles are borrowed raw pointers owned by the workbook. They
    * must never be freed directly. Closing the workbook releases its worksheets.
    *
    * Public Harbour methods use spreadsheet-style indexes starting at 1. The
    * libxlsxwriter C API uses indexes starting at 0, so row/column conversion is
    * centralized here as well.
    */
   lxw_workbook * hbxw_par_workbook( int iParam );
   lxw_worksheet * hbxw_par_worksheet( int iParam );
   lxw_format * hbxw_par_format( int iParam );
   lxw_row_t hbxw_par_row( int iParam );
   lxw_col_t hbxw_par_col( int iParam );

   HB_EXTERN_END

#endif
