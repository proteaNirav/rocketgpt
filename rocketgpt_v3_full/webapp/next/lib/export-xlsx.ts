export type XlsxSheetInput = {
  name: string;
  rows: Array<Record<string, string | number | boolean | null>>;
};

export async function exportSheetsAsXlsx(filename: string, sheets: XlsxSheetInput[]): Promise<void> {
  const xlsx = await import("xlsx");
  const workbook = xlsx.utils.book_new();

  sheets.forEach((sheet) => {
    const rows = sheet.rows.length ? sheet.rows : [{ empty: "" }];
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  });

  xlsx.writeFile(workbook, filename);
}
