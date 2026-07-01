# FMT 人間評価ビューア

記入済み **FMT CSV / xlsx** の人間評価（BM/BK 列）を入力するツールです。

- **Web 版（推奨）**: ブラウザ完結。Vercel にデプロイして URL 共有
- **ローカル版**: Bun サーバーで PC 上のファイルを直接更新

Langfuse や本リポジトリ本体は **不要** です。

---

## Web 版（ブラウザ完結 · Vercel）

ファイルは **サーバーに送信されません**。ブラウザ内だけで処理します。

### 使い方

1. サイトを開く
2. 記入 CSV / xlsx を **ドラッグ&ドロップ** または選択
3. 左の一覧からケースを選び、右パネルで BM/BK を入力 → **保存**
4. 作業後 **ダウンロード** で `記入_評価済.csv` / `.xlsx` を取得

### 作業の復元（localStorage）

**人間評価（BM/BK 列）だけ** を `localStorage` に自動保存します。元ファイル全体は保存しません。

- 保存内容: ファイル識別子 + 各 FMT# の BM/BK 入力 + 最後に開いていた FMT#
- 同じファイルを再度開くと「前回の作業を復元しますか？」と確認

### ローカル開発

```bash
cd fmt-eval-viewer
bun install
bun run dev
```

→ http://localhost:5173

### Vercel デプロイ

Vercel プロジェクト設定:

| 項目 | 値 |
|------|-----|
| Root Directory | `fmt-eval-viewer` |
| Build Command | `bun run build` |
| Output Directory | `dist` |
| Install Command | `bun install` |

---

## ローカル版（Bun サーバー）

PC 上のファイルを **直接上書き** します。

```bash
cd fmt-eval-viewer
bun install
bun run start:local -- --file="/path/to/記入.csv"
```

→ http://localhost:3848

---

## 配布（他メンバー向け）

**Web 版**: Vercel の URL を共有するだけ（Bun 不要）

**ローカル版**: `fmt-eval-viewer/` フォルダを ZIP 共有 + `bun install`

---

## 注意

- Web 版: Excel で xlsx を開いたままダウンロード上書きは不可 → **ダウンロードしてから開く**
- ローカル版: 保存で指定ファイルが上書きされます
- localStorage は **同一ブラウザ** のみ。別 PC / シークレットモードでは復元不可
