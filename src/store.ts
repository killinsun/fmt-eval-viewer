import { parseCsvText, serializeCsvRows } from "./csv-io";
import { findTargetMinor, parseFmtSheet } from "./parse-fmt";
import {
  buildStoreFromSheetRows,
  saveFmtEvalJudgments,
} from "./store-build";
import {
  isCsvFile,
  isXlsxFile,
  loadXlsxFromArrayBuffer,
  workbookToArrayBuffer,
} from "./xlsx-io";
import type * as XLSX from "xlsx";

export type FmtEvalRow = {
  fmtTestNumber: number;
  excelRow: number;
  majorJa: string;
  targetMinor: string;
  expectedRange: string;
  scoreCheck: string;
  borderlineJudgment: string;
  aiActualScore: string;
  aiManagerProposal: string;
  aiHrProposal: string;
  conversationLog: string;
  conversationHtml: string;
  humanScoreJudgment: string;
  humanNextActionJudgment: string;
  humanEvalComplete: boolean;
};

export type FmtEvalStore = {
  sourcePath: string;
  sourceFileName: string;
  fileKey: string;
  sourceKind: "csv" | "xlsx";
  parsed: import("./parse-fmt").FmtParsed;
  humanScoreJudgmentCol: number;
  rows: FmtEvalRow[];
  sheetRows?: string[][];
  workbook?: XLSX.WorkBook;
  sheetName?: string;
};

export type FmtJudgmentEntry = {
  humanScoreJudgment: string;
  humanNextActionJudgment: string;
};

export function fileKeyFromFile(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export async function loadFmtEvalStoreFromFile(
  file: File,
  opts?: { sheetName?: string },
): Promise<FmtEvalStore> {
  const fileKey = fileKeyFromFile(file);
  const name = file.name;

  if (isCsvFile(name)) {
    const sheetRows = parseCsvText(await file.text());
    const parsed = parseFmtSheet(sheetRows, name);
    return buildStoreFromSheetRows({
      sourcePath: name,
      sourceFileName: name,
      fileKey,
      sourceKind: "csv",
      parsed,
      sheetRows,
    });
  }

  if (isXlsxFile(name)) {
    const { workbook, sheetName, rows } = loadXlsxFromArrayBuffer(
      await file.arrayBuffer(),
      opts?.sheetName,
    );
    const parsed = parseFmtSheet(rows, name);
    return buildStoreFromSheetRows({
      sourcePath: name,
      sourceFileName: name,
      fileKey,
      sourceKind: "xlsx",
      parsed,
      sheetRows: rows,
      workbook,
      sheetName,
    });
  }

  throw new Error(`未対応の形式です（.csv / .xlsx のみ）: ${name}`);
}

export function extractJudgments(
  store: FmtEvalStore,
): Record<number, FmtJudgmentEntry> {
  const out: Record<number, FmtJudgmentEntry> = {};
  for (const row of store.rows) {
    if (!row.humanScoreJudgment.trim() && !row.humanNextActionJudgment.trim()) {
      continue;
    }
    out[row.fmtTestNumber] = {
      humanScoreJudgment: row.humanScoreJudgment,
      humanNextActionJudgment: row.humanNextActionJudgment,
    };
  }
  return out;
}

export function applyJudgments(
  store: FmtEvalStore,
  judgments: Record<number, FmtJudgmentEntry>,
): number {
  return saveFmtEvalJudgments(
    store,
    Object.entries(judgments).map(([fmt, j]) => ({
      fmtTestNumber: Number(fmt),
      humanScoreJudgment: j.humanScoreJudgment,
      humanNextActionJudgment: j.humanNextActionJudgment,
    })),
  );
}

export { saveFmtEvalJudgments };

export function exportFmtEvalStore(store: FmtEvalStore): Blob {
  if (store.sourceKind === "csv") {
    if (!store.sheetRows) throw new Error("CSV store missing sheetRows");
    return new Blob([serializeCsvRows(store.sheetRows)], {
      type: "text/csv;charset=utf-8",
    });
  }
  if (!store.workbook) throw new Error("xlsx store missing workbook");
  return new Blob([workbookToArrayBuffer(store.workbook)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadFileName(store: FmtEvalStore): string {
  const base = store.sourceFileName.replace(/\.(csv|xlsx?)$/i, "");
  const ext = store.sourceKind === "csv" ? ".csv" : ".xlsx";
  return `${base}_評価済${ext}`;
}

export function downloadFmtEvalStore(store: FmtEvalStore): void {
  const blob = exportFmtEvalStore(store);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadFileName(store);
  a.click();
  URL.revokeObjectURL(url);
}
