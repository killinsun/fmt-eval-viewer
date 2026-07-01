import {
  applyJudgments,
  downloadFmtEvalStore,
  extractJudgments,
  loadFmtEvalStoreFromFile,
  saveFmtEvalJudgments,
  type FmtEvalRow,
  type FmtEvalStore,
} from "../store";
import {
  findRestorableSession,
  saveSession,
  type SessionSnapshot,
} from "./session";
import "./ui.css";

let store: FmtEvalStore | null = null;
let filteredRows: FmtEvalRow[] = [];
let selected: number | null = null;
let dirty = false;

const els = {
  uploadScreen: document.getElementById("uploadScreen")!,
  appMain: document.getElementById("appMain")!,
  dropzone: document.getElementById("dropzone")!,
  fileInput: document.getElementById("fileInput") as HTMLInputElement,
  headerMeta: document.getElementById("headerMeta")!,
  saveStatus: document.getElementById("saveStatus")!,
  btnDownload: document.getElementById("btnDownload") as HTMLButtonElement,
  btnReopen: document.getElementById("btnReopen") as HTMLButtonElement,
  filter: document.getElementById("filter") as HTMLSelectElement,
  q: document.getElementById("q") as HTMLInputElement,
  list: document.getElementById("list")!,
  center: document.getElementById("center")!,
  evalPanel: document.getElementById("eval")!,
};

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

function setStatus(msg: string, ok: boolean | null = null): void {
  els.saveStatus.textContent = msg;
  els.saveStatus.className =
    "save-status " + (ok === true ? "ok" : ok === false ? "err" : "");
}

function persistSession(): void {
  if (!store) return;
  const snapshot: SessionSnapshot = {
    fileKey: store.fileKey,
    fileName: store.sourceFileName,
    sourceKind: store.sourceKind,
    selectedFmt: selected,
    judgments: extractJudgments(store),
    updatedAt: new Date().toISOString(),
  };
  saveSession(snapshot);
}

function updateHeader(): void {
  if (!store) return;
  const done = store.rows.filter((r) => r.humanEvalComplete).length;
  els.headerMeta.textContent = `${store.sourceFileName} · ${store.rows.length}件 · 評価済 ${done}`;
  els.btnDownload.disabled = false;
}

function applyFilters(): FmtEvalRow[] {
  if (!store) return [];
  const needle = els.q.value.trim().toLowerCase();
  return store.rows.filter((row) => {
    if (els.filter.value === "pending" && row.humanEvalComplete) return false;
    if (els.filter.value === "done" && !row.humanEvalComplete) return false;
    if (els.filter.value === "fail" && row.scoreCheck !== "FAIL") return false;
    if (needle) {
      const hay =
        `${row.fmtTestNumber} ${row.targetMinor} ${row.majorJa} ${row.expectedRange}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

function currentRow(): FmtEvalRow | undefined {
  return filteredRows.find((r) => r.fmtTestNumber === selected);
}

function scoreCheckDisplay(row: FmtEvalRow): { text: string; cls: string } {
  if (row.scoreCheck === "PASS") return { text: "OK", cls: "pass" };
  if (row.scoreCheck === "FAIL") return { text: "NG", cls: "fail" };
  return { text: row.scoreCheck || "OK/NG", cls: "" };
}

function humanOkNg(val: string): string {
  const v = (val || "").trim();
  if (v === "OK" || v.includes("問題無し") || v.includes("問題なし")) return "ok";
  if (v === "NG" || v.startsWith("差分あり")) return "ng";
  if (v === "判断OK") return "ok";
  return "";
}

function renderList(): void {
  if (!filteredRows.length) {
    els.list.innerHTML = '<div class="empty">該当なし</div>';
    return;
  }
  els.list.innerHTML = filteredRows
    .map((r) => {
      const cls = [
        "item",
        r.fmtTestNumber === selected ? "active" : "",
        r.humanEvalComplete ? "done" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const sc =
        r.scoreCheck === "PASS"
          ? "pass"
          : r.scoreCheck === "FAIL"
            ? "fail"
            : "pending";
      return `<div class="${cls}" data-fmt="${r.fmtTestNumber}"><strong>FMT#${r.fmtTestNumber}</strong> ${esc(r.targetMinor)}<div><span class="badge">${esc(r.expectedRange)}</span><span class="badge ${sc}">${esc(r.scoreCheck || "?")}</span>${r.humanEvalComplete ? '<span class="badge pass">評価済</span>' : '<span class="badge pending">未</span>'}</div></div>`;
    })
    .join("");

  els.list.querySelectorAll(".item").forEach((el) => {
    el.addEventListener("click", () => {
      if (dirty) saveCurrent(true);
      selected = Number((el as HTMLElement).dataset.fmt);
      renderList();
      renderDetail();
    });
  });
}

function wireOkNgPicker(pickerId: string, textareaId: string): void {
  const picker = document.getElementById(pickerId);
  if (!picker) return;
  picker.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ta = document.getElementById(textareaId) as HTMLTextAreaElement;
      ta.value = (btn as HTMLButtonElement).dataset.val ?? "";
      dirty = true;
      renderDetail();
    });
  });
}

function renderDetail(): void {
  const row = currentRow();
  if (!row) {
    els.center.innerHTML = '<div class="empty">左から選択</div>';
    els.evalPanel.innerHTML = '<div class="empty">左から選択</div>';
    return;
  }

  const sc = scoreCheckDisplay(row);
  els.center.innerHTML = `<div class="head"><h2>${esc(row.targetMinor)} <span class="badge">${esc(row.expectedRange)}</span></h2><p>FMT#${row.fmtTestNumber} · 行${row.excelRow} · ${esc(row.majorJa)}</p></div><div class="score-box-row"><div class="score-box"><div class="label">実際スコア（${esc(row.targetMinor)}）</div><div class="value">${esc(row.aiActualScore || "—")}</div><div class="sub">想定 ${esc(row.expectedRange)}</div></div><div class="score-box highlight ${sc.cls}"><div class="label">スコアチェック</div><div class="value okng">${esc(sc.text)}</div>${row.borderlineJudgment ? `<div class="sub">自動: ${esc(row.borderlineJudgment)}</div>` : ""}</div><div class="score-box"><div class="label">人の評価（点数）</div><div class="value okng">${esc(row.humanScoreJudgment || "OK/NG")}</div><div class="sub">BM列</div></div></div><div class="conversation-wrap"><div class="conv-label">会話ログ</div><div class="conversation">${row.conversationHtml}</div></div>`;

  const hOkNg = humanOkNg(row.humanScoreJudgment);
  const hNaOk = humanOkNg(row.humanNextActionJudgment);
  els.evalPanel.innerHTML = `<div class="head"><h2>人間評価</h2><p>BK / BM 列（ブラウザ内保存 + ダウンロード）</p></div><label class="field">点数に対する評価 (BM列)</label><div class="okng-picker" id="scoreOkNg"><button type="button" data-val="OK" class="${hOkNg === "ok" ? "selected-ok" : ""}">OK</button><button type="button" data-val="NG" class="${hOkNg === "ng" ? "selected-ng" : ""}">NG</button></div><div class="quick"><button type="button" class="secondary" data-target="humanScore" data-val="・・・のため問題無し">問題無し</button><button type="button" class="secondary" data-target="humanScore" data-val="判断OK">判断OK</button><button type="button" class="secondary" data-target="humanScore" data-val="差分あり: ">差分あり</button></div><textarea id="humanScore" placeholder="OK / NG / ・・・のため問題無し など">${esc(row.humanScoreJudgment)}</textarea><div class="card" style="margin:12px 0"><h3>AI 上司に推奨</h3><div class="proposal">${esc(row.aiManagerProposal)}</div></div><div class="card" style="margin-bottom:12px"><h3>AI 人事に推奨</h3><div class="proposal">${esc(row.aiHrProposal)}</div></div><label class="field">ネクストアクションの評価 (BK列)</label><div class="okng-picker" id="naOkNg"><button type="button" data-val="・・・のため問題無し" class="${hNaOk === "ok" ? "selected-ok" : ""}">問題無し</button><button type="button" data-val="差分あり: " class="${hNaOk === "ng" ? "selected-ng" : ""}">差分あり</button></div><textarea id="humanNa" placeholder="・・・のため問題無し / 差分あり: ...">${esc(row.humanNextActionJudgment)}</textarea><div class="actions"><button type="button" id="btnSave">保存</button><button type="button" class="secondary" id="btnNext">保存して次へ</button></div>`;

  wireOkNgPicker("scoreOkNg", "humanScore");
  wireOkNgPicker("naOkNg", "humanNa");

  els.evalPanel.querySelectorAll(".quick button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = (btn as HTMLButtonElement).dataset.target!;
      const ta = document.getElementById(target) as HTMLTextAreaElement;
      ta.value = (btn as HTMLButtonElement).dataset.val ?? "";
      dirty = true;
      renderDetail();
    });
  });

  for (const id of ["humanScore", "humanNa"]) {
    document.getElementById(id)?.addEventListener("input", () => {
      dirty = true;
    });
  }

  document.getElementById("btnSave")?.addEventListener("click", () => saveCurrent(false));
  document.getElementById("btnNext")?.addEventListener("click", () => nextRow());
}

function refreshView(): void {
  filteredRows = applyFilters();
  if (!selected || !filteredRows.find((r) => r.fmtTestNumber === selected)) {
    selected = filteredRows[0]?.fmtTestNumber ?? null;
  }
  updateHeader();
  renderList();
  renderDetail();
}

function saveCurrent(silent: boolean): void {
  if (!store) return;
  const row = currentRow();
  if (!row) return;

  const humanScoreJudgment =
    (document.getElementById("humanScore") as HTMLTextAreaElement | null)?.value ??
    row.humanScoreJudgment;
  const humanNextActionJudgment =
    (document.getElementById("humanNa") as HTMLTextAreaElement | null)?.value ??
    row.humanNextActionJudgment;

  if (!silent) setStatus("保存中...", null);

  saveFmtEvalJudgments(store, [
    {
      fmtTestNumber: row.fmtTestNumber,
      humanScoreJudgment,
      humanNextActionJudgment,
    },
  ]);

  row.humanScoreJudgment = humanScoreJudgment.trim();
  row.humanNextActionJudgment = humanNextActionJudgment.trim();
  row.humanEvalComplete = !!(
    row.humanScoreJudgment && row.humanNextActionJudgment
  );
  dirty = false;
  persistSession();
  if (!silent) setStatus(`保存済 ${new Date().toLocaleTimeString()}`, true);
  refreshView();
}

function nextRow(): void {
  saveCurrent(true);
  const idx = filteredRows.findIndex((r) => r.fmtTestNumber === selected);
  if (idx >= 0 && idx < filteredRows.length - 1) {
    selected = filteredRows[idx + 1]!.fmtTestNumber;
    renderList();
    renderDetail();
  }
}

async function openFile(file: File): Promise<void> {
  try {
    setStatus("読み込み中...", null);
    const loaded = await loadFmtEvalStoreFromFile(file);
    const restorable = findRestorableSession(loaded.fileKey);

    if (restorable) {
      const n = Object.keys(restorable.judgments).length;
      const when = new Date(restorable.updatedAt).toLocaleString();
      const ok = confirm(
        `このファイルの前回作業（${n}件・${when}）を復元しますか？`,
      );
      if (ok) {
        applyJudgments(loaded, restorable.judgments);
        selected = restorable.selectedFmt;
      }
    }

    store = loaded;
    dirty = false;
    els.uploadScreen.classList.add("hidden");
    els.appMain.classList.remove("hidden");
    els.btnReopen.classList.remove("hidden");
    els.btnDownload.classList.remove("hidden");
    persistSession();
    setStatus("読み込み完了", true);
    refreshView();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), false);
    alert(err instanceof Error ? err.message : String(err));
  }
}

function setupUpload(): void {
  els.fileInput.addEventListener("change", () => {
    const file = els.fileInput.files?.[0];
    if (file) void openFile(file);
  });

  els.dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.dropzone.classList.add("dragover");
  });
  els.dropzone.addEventListener("dragleave", () => {
    els.dropzone.classList.remove("dragover");
  });
  els.dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) void openFile(file);
  });

  els.btnReopen.addEventListener("click", () => {
    if (dirty && !confirm("未保存の変更があります。別ファイルを開きますか？")) {
      return;
    }
    store = null;
    dirty = false;
    els.appMain.classList.add("hidden");
    els.uploadScreen.classList.remove("hidden");
    els.fileInput.value = "";
    setStatus("", null);
  });

  els.btnDownload.addEventListener("click", () => {
    if (!store) return;
    if (dirty) saveCurrent(true);
    downloadFmtEvalStore(store);
    setStatus("ダウンロード開始", true);
  });

  els.filter.addEventListener("change", refreshView);
  els.q.addEventListener("input", () => {
    clearTimeout((window as unknown as { __qt?: number }).__qt);
    (window as unknown as { __qt?: number }).__qt = window.setTimeout(
      refreshView,
      200,
    );
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

setupUpload();
