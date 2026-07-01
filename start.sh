#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun が必要です: https://bun.sh"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "初回セットアップ: bun install"
  bun install
fi

FILE="${1:-${FMT_FILE:-${FMT_CSV:-./記入.csv}}}"
exec bun run src/server.ts --file="$FILE"
