// 웹 파일을 www/ 로 복사 (Capacitor 네이티브 앱 빌드용)
import { cpSync, rmSync, mkdirSync } from "node:fs";

const FILES = ["index.html", "styles.css", "manifest.webmanifest", "sw.js", "data", "js", "icons", "sim"];

rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log("www/ 빌드 완료");
