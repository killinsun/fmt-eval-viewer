import { loadCsvFromPath, writeCsvToPath } from "./csv-node";
import { parseFmtSheet } from "./parse-fmt";
import type { FmtEvalStore } from "./store";
import {
  buildStoreFromSheetRows,
  saveFmtEvalJudgments,
} from "./store-build";
import { isCsvPath, isXlsxPath } from "./xlsx-io";
import { loadXlsxFromPath, writeXlsxToPath } from "./xlsx-node";

export async function loadFmtEvalStore(
  filePath: string,
  opts?: { sheetName?: string },
): Promise<FmtEvalStore> {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  const fileKey = `${fileName}:0:0`;

  if (isCsvPath(filePath)) {
    const sheetRows = await loadCsvFromPath(filePath);
    const parsed = parseFmtSheet(sheetRows, filePath);
    return buildStoreFromSheetRows({
      sourcePath: filePath,
      sourceFileName: fileName,
      fileKey,
      sourceKind: "csv",
      parsed,
      sheetRows,
    });
  }

  if (isXlsxPath(filePath)) {
    const { workbook, sheetName, rows } = loadXlsxFromPath(
      filePath,
      opts?.sheetName,
    );
    const parsed = parseFmtSheet(rows, filePath);
    return buildStoreFromSheetRows({
      sourcePath: filePath,
      sourceFileName: fileName,
      fileKey,
      sourceKind: "xlsx",
      parsed,
      sheetRows: rows,
      workbook,
      sheetName,
    });
  }

  throw new Error(`未対応の形式です（.csv / .xlsx のみ）: ${filePath}`);
}

export async function writeFmtEvalStore(store: FmtEvalStore): Promise<void> {
  if (store.sourceKind === "csv") {
    if (!store.sheetRows) throw new Error("CSV store missing sheetRows");
    await writeCsvToPath(store.sourcePath, store.sheetRows);
    return;
  }
  if (!store.workbook) throw new Error("xlsx store missing workbook");
  writeXlsxToPath(store.workbook, store.sourcePath);
}

export { saveFmtEvalJudgments };
