// 게임(sim/)과 아이콘을 앱 묶음용 폴더로 복사: node apps/pack-web.mjs <대상 폴더>
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || "www");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(`${root}/sim`, `${out}/sim`, { recursive: true, filter: (p) => !p.includes("/.livepage") });
cpSync(`${root}/icons`, `${out}/icons`, { recursive: true });
writeFileSync(`${out}/index.html`, '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=sim/index.html"><title>FPV PROJECT</title>');
console.log("packed →", out);
