import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export function parseCsvText(text: string): string[][] {
  return parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: false,
  }) as string[][];
}

export function serializeCsvRows(sheetRows: string[][]): string {
  return stringify(sheetRows, {
    quoted: true,
    quoted_empty: true,
  });
}

export function getCell(
  sheetRows: string[][],
  excelRow: number,
  col: number,
): string {
  if (col < 0) return "";
  const row = sheetRows[excelRow - 1];
  if (!row) return "";
  const v = row[col];
  return v == null ? "" : String(v).trim();
}

export function setCell(
  sheetRows: string[][],
  excelRow: number,
  col: number,
  value: string,
): void {
  if (col < 0) return;
  const idx = excelRow - 1;
  while (sheetRows.length <= idx) sheetRows.push([]);
  const row = sheetRows[idx]!;
  while (row.length <= col) row.push("");
  row[col] = value;
}
