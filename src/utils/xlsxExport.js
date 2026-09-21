import * as XLSX from 'xlsx';

/**
 * Exports one or more record sets to a real .xlsx workbook using SheetJS.
 * @param {string} filename - e.g. "properties-report.xlsx"
 * @param {{ sheetName: string, rows: object[] }[]} sheets - each sheet's rows
 *   should already be flattened into plain objects; object keys become the
 *   column headers in the order they first appear.
 */
export function exportToXlsx(filename, sheets) {
  const workbook = XLSX.utils.book_new();
  for (const { sheetName, rows } of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  }
  XLSX.writeFile(workbook, filename);
}

export function exportSingleSheetXlsx(filename, sheetName, rows, columns) {
  const mapped = rows.map((row) => {
    const out = {};
    for (const col of columns) {
      out[col.header] = typeof col.value === 'function' ? col.value(row) : row[col.value];
    }
    return out;
  });
  exportToXlsx(filename, [{ sheetName, rows: mapped }]);
}
