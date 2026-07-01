import * as XLSX from "xlsx";

export function loadXlsxFromArrayBuffer(
  buffer: ArrayBuffer,
  sheetName?: string,
): { workbook: XLSX.WorkBook; sheetName: string; rows: string[][] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const name =
    sheetName ??
    (workbook.SheetNames.includes("検証結果")
      ? "検証結果"
      : workbook.SheetNames[0]);
  if (!name) throw new Error("xlsx にシートがありません");
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`シートが見つかりません: ${name}`);
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];
  return { workbook, sheetName: name, rows };
}

export function getXlsxCell(
  workbook: XLSX.WorkBook,
  sheetName: string,
  excelRow: number,
  col: number,
): string {
  if (col < 0) return "";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return "";
  const v = sheet[XLSX.utils.encode_cell({ r: excelRow - 1, c: col })]?.v;
  return v == null ? "" : String(v).trim();
}

export function setXlsxCell(
  workbook: XLSX.WorkBook,
  sheetName: string,
  excelRow: number,
  col: number,
  value: string,
): void {
  if (col < 0) return;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  const addr = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
  sheet[addr] = { t: "s", v: value };
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  if (excelRow - 1 > range.e.r) range.e.r = excelRow - 1;
  if (col > range.e.c) range.e.c = col;
  sheet["!ref"] = XLSX.utils.encode_range(range);
}

export function workbookToArrayBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return out as ArrayBuffer;
}

export function isXlsxFile(name: string): boolean {
  return /\.xlsx?$/i.test(name);
}

export function isCsvFile(name: string): boolean {
  return /\.csv$/i.test(name);
}

export function isXlsxPath(path: string): boolean {
  return isXlsxFile(path);
}

export function isCsvPath(path: string): boolean {
  return isCsvFile(path);
}
