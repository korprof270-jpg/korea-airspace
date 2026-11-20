#!/bin/sh
# PC(macOS·Linux)에서 드론 시뮬레이터 실행: Node.js 또는 Python 3 가 필요합니다
cd "$(dirname "$0")"
URL=http://localhost:8080/sim/
(sleep 1; (open "$URL" || xdg-open "$URL") >/dev/null 2>&1) &
if command -v npx >/dev/null 2>&1; then npx --yes http-server . -p 8080 -c-1; else python3 -m http.server 8080; fi
