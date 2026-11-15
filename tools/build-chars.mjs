// 인물 일러스트 빌드: sim/img/story/chars/src/<id>.mjs → sim/img/story/chars/<id>_<표정>.svg
// 소스 모듈은 export const ID, NAME 과 export function svg(expr) 를 내보낸다 (viewBox 0 0 1200 2400)
// 사용: node tools/build-chars.mjs [id ...]
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
const DIR = path.resolve("sim/img/story/chars"), SRC = path.join(DIR, "src");
const EXPRS = ["normal", "smile", "angry", "sad", "surprise", "serious"];
const only = process.argv.slice(2);
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith(".mjs"))) {
  const id = f.replace(".mjs", "");
  if (only.length && !only.includes(id)) continue;
  const m = await import(pathToFileURL(path.join(SRC, f)).href + "?t=" + Date.now());
  for (const e of EXPRS) {
    const s = m.svg(e);
    if (!s.startsWith("<svg")) throw new Error(`${id} ${e}: <svg 로 시작해야 함`);
    fs.writeFileSync(path.join(DIR, `${id}_${e}.svg`), s);
  }
  const kb = (fs.statSync(path.join(DIR, `${id}_normal.svg`)).size / 1024).toFixed(0);
  console.log(`${id} (${m.NAME}) → ${EXPRS.length}장, normal ${kb}KB`);
}
