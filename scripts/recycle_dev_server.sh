#!/bin/bash
# Recycle the trend_ui Next.js dev server: stop it, wipe the .next build
# cache (webpack's PackFileCacheStrategy cache silently corrupts on a
# long-running dev server — see the 2026-09-12 KataGo-tab-stuck-loading
# incident, ENOENT on .next/server/app/stories, empty client chunk dirs),
# then start it fresh. Meant to run non-interactively (cron), so it does
# not read stdin or print interactive menus like setup.sh does.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PORT=3000
LOG="${SCRIPT_DIR}/logs/dev.log"

mkdir -p "${SCRIPT_DIR}/logs"
ts() { date -u '+%Y-%m-%d %H:%M:%S UTC'; }

echo "[$(ts)] === Recycling trend_ui dev server (scheduled cache flush) ===" >> "$LOG"

# Stop: same patterns as setup.sh's stop_services, belt-and-suspenders.
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "node.*trend_ui" 2>/dev/null || true
if lsof -ti ":${APP_PORT}" > /dev/null 2>&1; then
    lsof -ti ":${APP_PORT}" | xargs -r kill -9 2>/dev/null || true
fi
sleep 2

# Wipe the build cache — this is the actual fix, not just the restart.
rm -rf "${SCRIPT_DIR}/.next"

echo "[$(ts)] === Starting trend_ui dev server ===" >> "$LOG"
cd "${SCRIPT_DIR}"
nohup npm run dev >> "$LOG" 2>&1 &
disown

sleep 5
if pgrep -f "next dev" > /dev/null; then
    echo "[$(ts)] === Recycle OK: dev server started ===" >> "$LOG"
else
    echo "[$(ts)] === Recycle FAILED: dev server did not start, check log above ===" >> "$LOG"
fi
