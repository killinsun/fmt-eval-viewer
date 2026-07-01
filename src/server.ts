/**
 * FMT 人間評価ビューア — ローカル Bun サーバー
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { FMT_EVAL_VIEWER_HTML } from "./viewer-html";
import {
  loadFmtEvalStore,
  saveFmtEvalJudgments,
  writeFmtEvalStore,
  type FmtEvalStore,
} from "./store-node";

const DEFAULT_PORT = 3848;

function parseArg(prefix: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`${prefix}=`));
  if (eq) return eq.slice(prefix.length + 1);
  return undefined;
}

function resolveInputPath(): string {
  const fromArg =
    parseArg("--file") ??
    parseArg("--csv") ??
    parseArg("--xlsx") ??
    process.env.FMT_FILE;
  if (!fromArg) {
    for (const candidate of ["./記入.csv", "./記入.xlsx"]) {
      const p = resolve(process.cwd(), candidate);
      if (existsSync(p)) return p;
    }
    throw new Error("ファイル未指定: --file=PATH");
  }
  return resolve(process.cwd(), fromArg);
}

function filterRows(
  store: FmtEvalStore,
  query: { filter?: string; q?: string },
) {
  const needle = query.q?.trim().toLowerCase();
  return store.rows.filter((row) => {
    if (query.filter === "pending" && row.humanEvalComplete) return false;
    if (query.filter === "done" && !row.humanEvalComplete) return false;
    if (query.filter === "fail" && row.scoreCheck !== "FAIL") return false;
    if (needle) {
      const hay =
        `${row.fmtTestNumber} ${row.targetMinor} ${row.majorJa} ${row.expectedRange}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

async function main(): Promise<void> {
  const filePath = resolveInputPath();
  const port = Number(parseArg("--port") ?? DEFAULT_PORT);
  const sheetName = parseArg("--sheet");
  let store = await loadFmtEvalStore(filePath, { sheetName });

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/") {
        return new Response(FMT_EVAL_VIEWER_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/api/meta") {
        return Response.json({
          sourcePath: store.sourcePath,
          sourceKind: store.sourceKind,
          total: store.rows.length,
          done: store.rows.filter((r) => r.humanEvalComplete).length,
          humanScoreCol: store.humanScoreJudgmentCol,
          humanNextActionCol: store.parsed.humanNextActionCol,
        });
      }

      if (url.pathname === "/api/rows") {
        return Response.json(
          filterRows(store, {
            filter: url.searchParams.get("filter") || undefined,
            q: url.searchParams.get("q") || undefined,
          }),
        );
      }

      if (url.pathname === "/api/save" && req.method === "POST") {
        try {
          const body = (await req.json()) as {
            fmtTestNumber: number;
            humanScoreJudgment?: string;
            humanNextActionJudgment?: string;
          };
          saveFmtEvalJudgments(store, [body]);
          await writeFmtEvalStore(store);
          return Response.json({ ok: true, fmtTestNumber: body.fmtTestNumber });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          );
        }
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`FMT eval viewer (local): http://localhost:${server.port}`);
  console.log(`file: ${filePath} (${store.rows.length} rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
