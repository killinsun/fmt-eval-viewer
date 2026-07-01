export const FMT_EVAL_VIEWER_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FMT 人間評価ビューア</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f4f4f5; --panel: #fff; --border: #d4d4d8; --text: #18181b;
      --muted: #71717a; --accent: #2563eb; --ok: #16a34a; --warn: #ca8a04; --bad: #dc2626;
      --user-bg: #eff6ff; --ai-bg: #f0fdf4; --score-box-bg: #fafafa;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #09090b; --panel: #18181b; --border: #3f3f46; --text: #fafafa;
        --muted: #a1a1aa; --accent: #60a5fa; --ok: #4ade80; --warn: #facc15; --bad: #f87171;
        --user-bg: #172554; --ai-bg: #052e16; --score-box-bg: #27272a;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }
    header { padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    header h1 { font-size: 15px; margin: 0; }
    .meta { color: var(--muted); font-size: 12px; }
    .save-status { font-size: 12px; margin-left: auto; }
    .save-status.ok { color: var(--ok); }
    .save-status.err { color: var(--bad); }
    main { flex: 1; display: grid; grid-template-columns: 260px 1fr 380px; min-height: 0; }
    aside, .center, .eval { border-right: 1px solid var(--border); overflow: auto; background: var(--panel); }
    .eval { border-right: none; }
    .panel-title { position: sticky; top: 0; background: var(--panel); border-bottom: 1px solid var(--border); padding: 8px 12px; font-size: 11px; font-weight: 700; color: var(--muted); z-index: 1; }
    .filters { padding: 10px; display: grid; gap: 8px; }
    select, input, textarea, button {
      font: inherit; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);
    }
    select, input { width: 100%; padding: 7px 9px; font-size: 13px; }
    textarea { width: 100%; padding: 10px; min-height: 88px; resize: vertical; line-height: 1.5; font-size: 13px; }
    button { padding: 8px 14px; cursor: pointer; background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; }
    button.secondary { background: var(--bg); color: var(--text); border-color: var(--border); }
    .list { padding: 8px; display: grid; gap: 5px; }
    .item { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; cursor: pointer; background: var(--bg); font-size: 12px; }
    .item.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
    .item.done { border-left: 3px solid var(--ok); }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--border); font-size: 10px; margin-right: 4px; }
    .badge.pass { color: var(--ok); }
    .badge.fail { color: var(--bad); }
    .badge.pending { color: var(--warn); }
    .center-body, .eval-body { padding: 14px; }
    .head h2 { margin: 0 0 6px; font-size: 17px; }
    .head p { margin: 0; color: var(--muted); font-size: 12px; }
    .score-box-row { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 12px; margin-bottom: 16px; }
    .score-box {
      border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;
      background: var(--score-box-bg); min-height: 88px; display: flex; flex-direction: column; justify-content: center;
    }
    .score-box .label { font-size: 11px; color: var(--muted); margin-bottom: 8px; letter-spacing: .02em; }
    .score-box .value { font-size: 28px; font-weight: 700; line-height: 1.1; letter-spacing: .02em; }
    .score-box .value.okng { font-size: 32px; }
    .score-box .sub { font-size: 11px; color: var(--muted); margin-top: 6px; }
    .score-box.pass .value { color: var(--ok); }
    .score-box.fail .value { color: var(--bad); }
    .score-box.highlight { border-color: #52525b; background: #27272a; }
    .okng-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .okng-picker button {
      padding: 14px; font-size: 18px; font-weight: 700; border-radius: 10px;
      background: var(--bg); color: var(--text); border: 2px solid var(--border);
    }
    .okng-picker button.selected-ok { border-color: var(--ok); color: var(--ok); background: rgba(74,222,128,.08); }
    .okng-picker button.selected-ng { border-color: var(--bad); color: var(--bad); background: rgba(248,113,113,.08); }
    .conversation-wrap { margin-top: 4px; }
    .conversation-wrap .conv-label { font-size: 11px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
    .conversation { display: grid; gap: 8px; }
    .turn { border-radius: 10px; padding: 10px 14px; line-height: 1.6; font-size: 14px; }
    .turn.user { background: var(--user-bg); }
    .turn.ai { background: var(--ai-bg); border-left: 3px solid var(--ok); }
    .turn .role { display: block; font-size: 10px; font-weight: 700; color: var(--muted); margin-bottom: 3px; }
    .card { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--bg); font-size: 13px; }
    .card h3 { margin: 0 0 6px; font-size: 12px; color: var(--muted); letter-spacing: .04em; }
    .proposal { white-space: pre-wrap; font-size: 12px; line-height: 1.55; max-height: 220px; overflow: auto; }
    label { display: grid; gap: 4px; font-size: 12px; color: var(--muted); margin-bottom: 10px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .quick { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
    .quick button { padding: 4px 8px; font-size: 11px; font-weight: 500; }
    .empty { padding: 20px; color: var(--muted); font-size: 13px; }
    @media (max-width: 1100px) { main { grid-template-columns: 1fr; } aside, .center, .eval { border-right: none; border-bottom: 1px solid var(--border); } }
  </style>
</head>
<body>
  <header>
    <h1>FMT 人間評価</h1>
    <div class="meta" id="headerMeta">loading...</div>
    <div class="save-status" id="saveStatus"></div>
  </header>
  <main>
    <aside>
      <div class="panel-title">テストケース</div>
      <div class="filters">
        <label>フィルタ
          <select id="filter">
            <option value="all">すべて</option>
            <option value="pending">未評価</option>
            <option value="done">評価済み</option>
            <option value="fail">スコアチェック FAIL</option>
          </select>
        </label>
        <label>検索
          <input id="q" placeholder="FMT# / 小カテゴリ..." />
        </label>
      </div>
      <div class="list" id="list"></div>
    </aside>
    <div class="center">
      <div class="panel-title">会話ログ</div>
      <div class="center-body" id="center"><div class="empty">左から選択</div></div>
    </div>
    <div class="eval">
      <div class="panel-title">人間評価（保存）</div>
      <div class="eval-body" id="eval"><div class="empty">左から選択</div></div>
    </div>
  </main>
  <script>
    let meta = null;
    let rows = [];
    let selected = null;
    let dirty = false;

    const els = {
      headerMeta: document.getElementById("headerMeta"),
      saveStatus: document.getElementById("saveStatus"),
      filter: document.getElementById("filter"),
      q: document.getElementById("q"),
      list: document.getElementById("list"),
      center: document.getElementById("center"),
      eval: document.getElementById("eval"),
    };

    function setStatus(msg, ok) {
      els.saveStatus.textContent = msg;
      els.saveStatus.className = "save-status " + (ok ? "ok" : ok === false ? "err" : "");
    }

    async function loadMeta() {
      const res = await fetch("/api/meta");
      meta = await res.json();
      els.headerMeta.textContent = meta.sourcePath + " · " + meta.total + "件 · 評価済 " + meta.done;
    }

    async function loadRows() {
      const p = new URLSearchParams({ filter: els.filter.value, q: els.q.value });
      const res = await fetch("/api/rows?" + p);
      rows = await res.json();
      if (!selected || !rows.find(r => r.fmtTestNumber === selected)) {
        selected = rows[0]?.fmtTestNumber ?? null;
      }
      renderList();
      renderDetail();
    }

    function renderList() {
      if (!rows.length) {
        els.list.innerHTML = '<div class="empty">該当なし</div>';
        return;
      }
      els.list.innerHTML = rows.map(r => {
        const cls = ["item", r.fmtTestNumber === selected ? "active" : "", r.humanEvalComplete ? "done" : ""].filter(Boolean).join(" ");
        const sc = r.scoreCheck === "PASS" ? "pass" : r.scoreCheck === "FAIL" ? "fail" : "pending";
        return '<div class="' + cls + '" data-fmt="' + r.fmtTestNumber + '">' +
          '<strong>FMT#' + r.fmtTestNumber + '</strong> ' + r.targetMinor +
          '<div><span class="badge">' + r.expectedRange + '</span>' +
          '<span class="badge ' + sc + '">' + (r.scoreCheck || "?") + '</span>' +
          (r.humanEvalComplete ? '<span class="badge pass">評価済</span>' : '<span class="badge pending">未</span>') +
          '</div></div>';
      }).join("");
      els.list.querySelectorAll(".item").forEach(el => {
        el.onclick = () => { if (dirty) saveCurrent(true); selected = Number(el.dataset.fmt); renderList(); renderDetail(); };
      });
    }

    function currentRow() { return rows.find(r => r.fmtTestNumber === selected); }

    function scoreCheckDisplay(row) {
      if (row.scoreCheck === "PASS") return { text: "OK", cls: "pass" };
      if (row.scoreCheck === "FAIL") return { text: "NG", cls: "fail" };
      return { text: row.scoreCheck || "OK/NG", cls: "" };
    }

    function humanOkNg(val) {
      const v = (val || "").trim();
      if (v === "OK" || v.includes("問題無し")) return "ok";
      if (v === "NG" || v.startsWith("差分あり")) return "ng";
      if (v === "判断OK") return "ok";
      return "";
    }

    function renderDetail() {
      const row = currentRow();
      if (!row) {
        els.center.innerHTML = els.eval.innerHTML = '<div class="empty">左から選択</div>';
        return;
      }
      const sc = scoreCheckDisplay(row);
      els.center.innerHTML =
        '<div class="head"><h2>' + row.targetMinor + ' <span class="badge">' + row.expectedRange + '</span></h2>' +
        '<p>FMT#' + row.fmtTestNumber + ' · 行' + row.excelRow + ' · ' + row.majorJa + '</p></div>' +
        '<div class="score-box-row">' +
        '<div class="score-box"><div class="label">実際スコア（' + esc(row.targetMinor) + '）</div>' +
        '<div class="value">' + esc(row.aiActualScore || "—") + '</div>' +
        '<div class="sub">想定 ' + esc(row.expectedRange) + '</div></div>' +
        '<div class="score-box highlight ' + sc.cls + '"><div class="label">スコアチェック</div>' +
        '<div class="value okng">' + esc(sc.text) + '</div>' +
        (row.borderlineJudgment ? '<div class="sub">自動: ' + esc(row.borderlineJudgment) + '</div>' : '') +
        '</div>' +
        '<div class="score-box"><div class="label">人の評価（点数）</div>' +
        '<div class="value okng">' + esc(row.humanScoreJudgment || "OK/NG") + '</div>' +
        '<div class="sub">BM列</div></div>' +
        '</div>' +
        '<div class="conversation-wrap"><div class="conv-label">会話ログ</div>' +
        '<div class="conversation">' + row.conversationHtml + '</div></div>';

      const hOkNg = humanOkNg(row.humanScoreJudgment);
      const hNaOk = humanOkNg(row.humanNextActionJudgment);
      els.eval.innerHTML =
        '<div class="head"><h2>人間評価</h2><p>BK / BM 列に保存</p></div>' +
        '<label>点数に対する評価 (BM列)</label>' +
        '<div class="okng-picker" id="scoreOkNg">' +
        '<button type="button" data-val="OK" class="' + (hOkNg === "ok" ? "selected-ok" : "") + '">OK</button>' +
        '<button type="button" data-val="NG" class="' + (hOkNg === "ng" ? "selected-ng" : "") + '">NG</button>' +
        '</div>' +
        '<div class="quick">' +
        quickBtn("問題無し", "humanScore", "・・・のため問題無し") +
        quickBtn("判断OK", "humanScore", "判断OK") +
        quickBtn("差分あり", "humanScore", "差分あり: ") +
        '</div>' +
        '<textarea id="humanScore" placeholder="OK / NG / ・・・のため問題無し など">' + esc(row.humanScoreJudgment) + '</textarea>' +
        '<div class="card" style="margin:12px 0"><h3>AI 上司に推奨</h3><div class="proposal">' + esc(row.aiManagerProposal) + '</div></div>' +
        '<div class="card" style="margin-bottom:12px"><h3>AI 人事に推奨</h3><div class="proposal">' + esc(row.aiHrProposal) + '</div></div>' +
        '<label>ネクストアクションの評価 (BK列)</label>' +
        '<div class="okng-picker" id="naOkNg">' +
        '<button type="button" data-val="・・・のため問題無し" class="' + (hNaOk === "ok" ? "selected-ok" : "") + '">問題無し</button>' +
        '<button type="button" data-val="差分あり: " class="' + (hNaOk === "ng" ? "selected-ng" : "") + '">差分あり</button>' +
        '</div>' +
        '<textarea id="humanNa" placeholder="・・・のため問題無し / 差分あり: ...">' + esc(row.humanNextActionJudgment) + '</textarea>' +
        '<div class="actions">' +
        '<button onclick="saveCurrent(false)">保存</button>' +
        '<button class="secondary" onclick="nextRow()">保存して次へ</button>' +
        '</div>';

      wireOkNgPicker("scoreOkNg", "humanScore");
      wireOkNgPicker("naOkNg", "humanNa");
      els.eval.querySelectorAll(".quick button").forEach(btn => {
        btn.onclick = () => {
          document.getElementById(btn.dataset.target).value = btn.dataset.val;
          dirty = true;
          renderDetail();
        };
      });
      for (const id of ["humanScore", "humanNa"]) {
        document.getElementById(id).oninput = () => { dirty = true; };
      }
    }

    function wireOkNgPicker(pickerId, textareaId) {
      const picker = document.getElementById(pickerId);
      if (!picker) return;
      picker.querySelectorAll("button").forEach(btn => {
        btn.onclick = () => {
          document.getElementById(textareaId).value = btn.dataset.val;
          dirty = true;
          renderDetail();
        };
      });
    }

    function quickBtn(label, target, val) {
      return '<button type="button" class="secondary" data-target="' + target + '" data-val="' + escAttr(val) + '">' + label + '</button>';
    }
    function esc(s) { return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    function escAttr(s) { return esc(s).replace(/"/g,"&quot;"); }

    async function saveCurrent(silent) {
      const row = currentRow();
      if (!row) return;
      const humanScoreJudgment = document.getElementById("humanScore")?.value ?? row.humanScoreJudgment;
      const humanNextActionJudgment = document.getElementById("humanNa")?.value ?? row.humanNextActionJudgment;
      if (!silent) setStatus("保存中...", null);
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fmtTestNumber: row.fmtTestNumber, humanScoreJudgment, humanNextActionJudgment }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus(data.error || "保存失敗", false); return; }
      row.humanScoreJudgment = humanScoreJudgment.trim();
      row.humanNextActionJudgment = humanNextActionJudgment.trim();
      row.humanEvalComplete = !!(row.humanScoreJudgment && row.humanNextActionJudgment);
      dirty = false;
      setStatus("保存済 " + new Date().toLocaleTimeString(), true);
      await loadMeta();
      renderList();
    }

    function nextRow() {
      saveCurrent(true).then(() => {
        const idx = rows.findIndex(r => r.fmtTestNumber === selected);
        if (idx >= 0 && idx < rows.length - 1) {
          selected = rows[idx + 1].fmtTestNumber;
          renderList();
          renderDetail();
        }
      });
    }

    els.filter.onchange = loadRows;
    els.q.oninput = () => { clearTimeout(window.__qt); window.__qt = setTimeout(loadRows, 200); };
    window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

    loadMeta().then(loadRows);
  </script>
</body>
</html>`;
