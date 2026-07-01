import { formatConversationHtml } from "./conversation";
import {
  getCell as getCsvCell,
  setCell as setCsvCell,
} from "./csv-io";
import { findTargetMinor, type FmtParsed, type FmtRow } from "./parse-fmt";
import type { FmtEvalRow, FmtEvalStore } from "./store";
import {
  getXlsxCell,
  setXlsxCell,
} from "./xlsx-io";
import type * as XLSX from "xlsx";

function isScoreCheckPlaceholder(value: string): boolean {
  const v = value.trim();
  return !v || v === "OK/NG" || v === "—" || v === "-";
}

function readCell(store: FmtEvalStore, excelRow: number, col: number): string {
  if (col < 0) return "";
  if (store.sourceKind === "csv" && store.sheetRows) {
    return getCsvCell(store.sheetRows, excelRow, col);
  }
  if (store.workbook && store.sheetName) {
    return getXlsxCell(store.workbook, store.sheetName, excelRow, col);
  }
  return "";
}

export function writeCell(
  store: FmtEvalStore,
  excelRow: number,
  col: number,
  value: string,
): void {
  if (col < 0) return;
  if (store.sourceKind === "csv" && store.sheetRows) {
    setCsvCell(store.sheetRows, excelRow, col, value);
    return;
  }
  if (store.workbook && store.sheetName) {
    setXlsxCell(store.workbook, store.sheetName, excelRow, col, value);
  }
}

function buildRows(
  store: Omit<FmtEvalStore, "rows">,
  sheetRows: string[][],
): FmtEvalRow[] {
  const rows: FmtEvalRow[] = [];

  for (const fmtRow of store.parsed.rows) {
    if (!fmtRow.hasExpectedScores) continue;

    const sheetRow = sheetRows[fmtRow.excelRow - 1] ?? [];
    const target = findTargetMinor(sheetRow, store.parsed);
    if (!target) continue;

    const scoreCheckRaw = readCell(
      { ...store, sheetRows } as FmtEvalStore,
      fmtRow.excelRow,
      store.parsed.scoreCheckCol,
    );
    const scoreCheck = isScoreCheckPlaceholder(scoreCheckRaw)
      ? ""
      : scoreCheckRaw;

    const fullStore = { ...store, sheetRows } as FmtEvalStore;

    rows.push({
      fmtTestNumber: fmtRow.testNumber,
      excelRow: fmtRow.excelRow,
      majorJa: fmtRow.majorJa,
      targetMinor: target.label,
      expectedRange: target.expected,
      scoreCheck,
      borderlineJudgment: readCell(
        fullStore,
        fmtRow.excelRow,
        store.parsed.borderlineJudgmentCol,
      ),
      aiActualScore: target.actual,
      aiManagerProposal: readCell(
        fullStore,
        fmtRow.excelRow,
        store.parsed.managerProposalCol,
      ),
      aiHrProposal: readCell(
        fullStore,
        fmtRow.excelRow,
        store.parsed.hrProposalCol,
      ),
      conversationLog: readCell(
        fullStore,
        fmtRow.excelRow,
        store.parsed.conversationCol,
      ),
      conversationHtml: formatConversationHtml(
        readCell(fullStore, fmtRow.excelRow, store.parsed.conversationCol),
      ),
      humanScoreJudgment: readCell(
        fullStore,
        fmtRow.excelRow,
        store.humanScoreJudgmentCol,
      ),
      humanNextActionJudgment: readCell(
        fullStore,
        fmtRow.excelRow,
        store.parsed.humanNextActionCol,
      ),
      humanEvalComplete: false,
    });
  }

  for (const row of rows) {
    row.humanEvalComplete = !!(
      row.humanScoreJudgment.trim() && row.humanNextActionJudgment.trim()
    );
  }

  rows.sort((a, b) => a.fmtTestNumber - b.fmtTestNumber);
  return rows;
}

export function buildStoreFromSheetRows(opts: {
  sourcePath: string;
  sourceFileName: string;
  fileKey: string;
  sourceKind: "csv" | "xlsx";
  parsed: FmtParsed;
  sheetRows: string[][];
  workbook?: XLSX.WorkBook;
  sheetName?: string;
}): FmtEvalStore {
  const humanScoreJudgmentCol =
    opts.parsed.conversationCol >= 0 ? opts.parsed.conversationCol + 1 : -1;
  const base = {
    sourcePath: opts.sourcePath,
    sourceFileName: opts.sourceFileName,
    fileKey: opts.fileKey,
    sourceKind: opts.sourceKind,
    parsed: opts.parsed,
    humanScoreJudgmentCol,
    sheetRows: opts.sheetRows,
    workbook: opts.workbook,
    sheetName: opts.sheetName,
  };
  return { ...base, rows: buildRows(base, opts.sheetRows) };
}

export function saveFmtEvalJudgments(
  store: FmtEvalStore,
  updates: Array<{
    fmtTestNumber: number;
    humanScoreJudgment?: string;
    humanNextActionJudgment?: string;
  }>,
): number {
  const fmtByTest = new Map(store.parsed.rows.map((r) => [r.testNumber, r]));
  let n = 0;

  for (const u of updates) {
    const fmtRow = fmtByTest.get(u.fmtTestNumber) as FmtRow | undefined;
    if (!fmtRow) continue;

    if (u.humanScoreJudgment !== undefined) {
      writeCell(store, fmtRow.excelRow, store.humanScoreJudgmentCol, u.humanScoreJudgment);
      const row = store.rows.find((r) => r.fmtTestNumber === u.fmtTestNumber);
      if (row) row.humanScoreJudgment = u.humanScoreJudgment.trim();
    }
    if (u.humanNextActionJudgment !== undefined) {
      writeCell(
        store,
        fmtRow.excelRow,
        store.parsed.humanNextActionCol,
        u.humanNextActionJudgment,
      );
      const row = store.rows.find((r) => r.fmtTestNumber === u.fmtTestNumber);
      if (row) row.humanNextActionJudgment = u.humanNextActionJudgment.trim();
    }

    const row = store.rows.find((r) => r.fmtTestNumber === u.fmtTestNumber);
    if (row) {
      row.humanEvalComplete = !!(
        row.humanScoreJudgment && row.humanNextActionJudgment
      );
    }
    n++;
  }

  return n;
}
