@echo off
rem PC(Windows)에서 드론 시뮬레이터 실행: Node.js 가 설치되어 있어야 합니다 (https://nodejs.org)
cd /d "%~dp0"
start "" http://localhost:8080/sim/
npx --yes http-server . -p 8080 -c-1
