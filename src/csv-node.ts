import { readFile, writeFile } from "node:fs/promises";
import { parseCsvText, serializeCsvRows } from "./csv-io";

export async function loadCsvFromPath(csvPath: string): Promise<string[][]> {
  const text = await readFile(csvPath, "utf8");
  return parseCsvText(text);
}

export async function writeCsvToPath(
  csvPath: string,
  sheetRows: string[][],
): Promise<void> {
  await writeFile(csvPath, serializeCsvRows(sheetRows), "utf8");
}

/** @deprecated */
export const loadCsvSheetRows = loadCsvFromPath;
/** @deprecated */
export const writeCsvSheetRows = writeCsvToPath;
