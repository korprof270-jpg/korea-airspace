#!/usr/bin/env bash
# 게임 웹 버전을 fpvproject.github.io 저장소로 복사한다: sim/ 내용이 사이트 루트, 아이콘은 /icons/
# 사용: tools/publish-site.sh /path/to/fpvproject.github.io
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"; DEST="${1:?대상 폴더}"
[ -d "$DEST/.git" ] || { echo "git 저장소가 아님: $DEST"; exit 1; }
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$SRC/sim/." "$DEST/"
mkdir -p "$DEST/icons" && cp "$SRC/icons/"* "$DEST/icons/"
cp "$SRC/tools/site-sw.js" "$DEST/sw.js"
touch "$DEST/.nojekyll"
printf '# FPV PROJECT\n\n웹에서 바로 플레이: https://fpvproject.github.io\n\n원본 소스: korprof270-jpg/korea-airspace (sim/)\n' > "$DEST/README.md"
echo "copied to $DEST"
