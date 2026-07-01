import type { FmtJudgmentEntry } from "../store";

const STORAGE_KEY = "fmt-eval-session-v1";

export type SessionSnapshot = {
  fileKey: string;
  fileName: string;
  sourceKind: "csv" | "xlsx";
  selectedFmt: number | null;
  judgments: Record<number, FmtJudgmentEntry>;
  updatedAt: string;
};

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function saveSession(snapshot: SessionSnapshot): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString() }),
  );
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function findRestorableSession(
  fileKey: string,
): SessionSnapshot | null {
  const session = loadSession();
  if (!session || session.fileKey !== fileKey) return null;
  if (Object.keys(session.judgments).length === 0) return null;
  return session;
}
