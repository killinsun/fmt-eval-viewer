import { SUB_LABELS } from "./sub-labels";

export type FmtSubColumn = {
  label: string;
  expectedCol: number;
  actualCol: number;
};

export type FmtRow = {
  testNumber: number;
  excelRow: number;
  majorJa: string;
  hasExpectedScores: boolean;
  expectedRangeBySub: Record<string, string>;
};

export type FmtParsed = {
  sourcePath: string;
  subColumns: FmtSubColumn[];
  rows: FmtRow[];
  scoreCheckCol: number;
  managerProposalCol: number;
  hrProposalCol: number;
  conversationCol: number;
  humanNextActionCol: number;
  borderlineJudgmentCol: number;
};

function stripFurigana(text: string): string {
  return text.replace(/([\u4E00-\u9FFF々]+)[\u3040-\u309F\u30A0-\u30FF]+$/g, "$1").trim();
}

function resolveSubLabel(raw: string): string {
  const label = stripFurigana(raw);
  const exact = SUB_LABELS.find((s) => s === label);
  if (exact) return exact;
  const partial = SUB_LABELS.find(
    (s) => s.startsWith(label) || label.startsWith(s),
  );
  return partial ?? label;
}

function normalizeRangeLabel(raw: string): string | null {
  const t = stripFurigana(raw.trim());
  if (!t) return null;
  const m = t.match(/(\d+)\s*[~〜\-－]\s*(\d+)\s*点/);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (min === 80 && max === 100) return "80-100点";
  if (min === 60 && max === 79) return "60-79点";
  if (min === 40 && max === 59) return "40-59点";
  if (min === 20 && max === 39) return "20-39点";
  if (min === 0 && max === 19) return "0-19点";
  return null;
}

export function parseFmtSheet(
  sheetRows: string[][],
  sourcePath: string,
): FmtParsed {
  if (sheetRows.length < 2) throw new Error("FMT CSV が短すぎます（ヘッダ2行必要）");

  const header1 = sheetRows[0] ?? [];
  const header2 = sheetRows[1] ?? [];
  const subColumns: FmtSubColumn[] = [];

  for (let col = 0; col < header2.length; col++) {
    const h2 = header2[col]?.trim() ?? "";
    if (!h2.startsWith("【想定スコア】")) continue;
    const rawLabel = h2.replace("【想定スコア】", "").trim();
    const label = resolveSubLabel(rawLabel);
    if (!SUB_LABELS.includes(label as (typeof SUB_LABELS)[number])) continue;
    subColumns.push({ label, expectedCol: col, actualCol: col + 1 });
  }

  let scoreCheckCol = -1;
  let managerProposalCol = -1;
  let hrProposalCol = -1;
  let conversationCol = -1;
  let humanNextActionCol = -1;

  for (let col = 0; col < header1.length; col++) {
    const h1 = header1[col]?.trim() ?? "";
    const h2 = header2[col]?.trim() ?? "";
    if (h1.includes("スコアチェック")) scoreCheckCol = col;
    if (h2.includes("上司に推奨")) managerProposalCol = col;
    if (h2.includes("人事に推奨")) hrProposalCol = col;
    if (h1 === "会話" || h1.startsWith("会話")) conversationCol = col;
    if (h1.includes("人との評価") || h1.includes("評価との一致")) {
      humanNextActionCol = col;
    }
  }

  const borderlineJudgmentCol =
    conversationCol >= 0 ? conversationCol + 2 : -1;
  if (humanNextActionCol < 0 && borderlineJudgmentCol >= 0) {
    humanNextActionCol = borderlineJudgmentCol - 1;
  }

  const rows: FmtRow[] = [];
  for (let r = 2; r < sheetRows.length; r++) {
    const row = sheetRows[r] ?? [];
    const testRaw = row[0]?.trim();
    if (!testRaw || !/^\d+$/.test(testRaw)) continue;

    const expectedRangeBySub: Record<string, string> = {};
    for (const sc of subColumns) {
      const val = row[sc.expectedCol]?.trim() ?? "";
      if (!val) continue;
      const normalized = normalizeRangeLabel(val);
      if (normalized) expectedRangeBySub[sc.label] = normalized;
    }

    rows.push({
      testNumber: Number(testRaw),
      excelRow: r + 1,
      majorJa: row[1]?.trim() ?? "",
      hasExpectedScores: Object.keys(expectedRangeBySub).length > 0,
      expectedRangeBySub,
    });
  }

  return {
    sourcePath,
    subColumns,
    rows,
    scoreCheckCol,
    managerProposalCol,
    hrProposalCol,
    conversationCol,
    humanNextActionCol,
    borderlineJudgmentCol,
  };
}

export function findTargetMinor(
  row: string[],
  parsed: FmtParsed,
): { label: string; expected: string; actual: string } | null {
  for (const sc of parsed.subColumns) {
    const expected = row[sc.expectedCol]?.trim() ?? "";
    const actual = row[sc.actualCol]?.trim() ?? "";
    if (!expected) continue;
    if (actual && actual !== "-" && actual !== "評価不可") {
      return { label: sc.label, expected, actual };
    }
  }
  for (const sc of parsed.subColumns) {
    const expected = row[sc.expectedCol]?.trim() ?? "";
    if (expected) {
      return {
        label: sc.label,
        expected,
        actual: row[sc.actualCol]?.trim() ?? "",
      };
    }
  }
  return null;
}
