import * as XLSX from "xlsx";
import { loadXlsxFromArrayBuffer } from "./xlsx-io";

export function loadXlsxFromPath(
  filePath: string,
  sheetName?: string,
): { workbook: XLSX.WorkBook; sheetName: string; rows: string[][] } {
  const workbook = XLSX.readFile(filePath);
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

export function writeXlsxToPath(
  workbook: XLSX.WorkBook,
  filePath: string,
): void {
  XLSX.writeFile(workbook, filePath);
}

/** @deprecated */
export const loadXlsxSheet = loadXlsxFromPath;
/** @deprecated */
export const writeXlsxWorkbook = writeXlsxToPath;

export { loadXlsxFromArrayBuffer };
