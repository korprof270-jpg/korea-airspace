import fs from "fs";
// 이 저장소의 sim/ 을 검사한다 (어느 작업 폴더에서 돌려도 같다)
const SIM = new URL("../sim/", import.meta.url);
const { SCENES, RADIO } = await import(new URL("js/scenes.js", SIM).href);
const { MOODS, BG_MOOD, SCENE_SFX } = await import(new URL("js/cues.js", SIM).href);
const imgs = new Set(fs.readdirSync(new URL("img/story", SIM)).filter((f) => f.endsWith(".jpg")).map((f) => f.replace(".jpg", "")));
const sfx = new Set(SCENE_SFX), moods = new Set([...Object.keys(MOODS), "-", "auto"]);
let bgm = 0;
const rooms = new Set(["briefing", "hangarin", "black", "night", "lab", "control"]), who = new Set(["강 교관", "모아", "서하린", "바우", "유리", "차도윤", "노을", "관제", "에이아", "바르가", "나", "EIA", "한서윤", "차 장군", "강도현", "XN-0", "아샤", "니르바", "카르타", "윤채아", "진세라", "한별", "루카", "구철", "여명"]);
const ex = new Set(["normal", "smile", "angry", "sad", "surprise", "serious", undefined]);
let n = 0, ch = 0; const bad = [];
const walk = (L, k) => { for (const it of L || []) {
  if (typeof it === "string") {
    if (it.startsWith("@bg ")) { const x = it.slice(4); if (!imgs.has(x) && !rooms.has(x)) bad.push(k + " bg " + x); }
    else if (it.startsWith("@cg ")) { const x = it.slice(4); if (x !== "-" && !imgs.has(x)) bad.push(k + " cg " + x); }
    else if (it.startsWith("@bgm ")) { bgm++; const x = it.slice(5); if (!moods.has(x)) bad.push(k + " bgm " + x); }
    else if (it.startsWith("@sfx ")) { const x = it.slice(5); if (!sfx.has(x)) bad.push(k + " sfx " + x); }
    else if (it.startsWith("@") && !["@shake", "@flash", "@clear"].includes(it)) bad.push(k + " cmd " + it);
    else if (!it.startsWith("@")) { n++; const i = it.indexOf("|"); if (i > 0) { const [w, e] = it.slice(0, i).split(":"); if (!who.has(w)) bad.push(k + " who " + w); if (!ex.has(e)) bad.push(k + " expr " + e); } else if (i < 0) bad.push(k + " no bar: " + it.slice(0, 20)); }
  } else if (it.choice) { ch++; for (const c of it.choice) { walk(c.then, k);
    if (c.mod) for (const [sid, m] of Object.entries(c.mod)) {
      if (!/^(c|e|s)\d[ab]?-\d$/.test(sid)) bad.push(k + " mod stage " + sid);
      for (const key of Object.keys(m)) if (!["team", "wing", "power", "diff", "bots", "time", "boss", "objAdd", "objDel", "objNeed", "note", "laps", "rivals", "limitK"].includes(key)) bad.push(k + " mod key " + key);
      for (const o of m.objAdd || []) if (!["win", "rank", "crash", "kills", "boss", "truck", "core", "time", "stars", "keep", "hp"].includes(o.t)) bad.push(k + " objAdd " + o.t);
      if (m.wing && m.team !== undefined && m.wing.length < m.team) bad.push(k + " wing shorter than team");
    } for (const r of Object.keys(c.rel || {})) if (!["서하린","바우","유리","차도윤","모아","노을","윤채아","진세라","한별","루카"].includes(r)) bad.push(k + " rel " + r); } }
  else if (it.if) { walk(it.then, k); walk(it.else, k); }
} };
for (const [k, v] of Object.entries(SCENES)) { walk(v.pre, k); walk(v.post, k); }
for (const k of [...imgs, ...rooms]) if (!BG_MOOD[k]) bad.push("bg without default mood " + k);
for (const m of Object.values(BG_MOOD)) if (!MOODS[m]) bad.push("BG_MOOD unknown mood " + m);
console.log("lines", n, "choices", ch, "bgm", bgm, "scenes", Object.keys(SCENES).length, "radio", Object.keys(RADIO).length); console.log(bad.join("\n") || "all ok");
if (bad.length) process.exitCode = 1;
