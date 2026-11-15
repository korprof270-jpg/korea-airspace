import fs from "fs";
const { SCENES, RADIO } = await import("/home/user/korea-airspace/sim/js/scenes.js");
const imgs = new Set(fs.readdirSync("/home/user/korea-airspace/sim/img/story").map((f) => f.replace(".jpg", "")));
const rooms = new Set(["briefing", "hangarin", "black", "night", "lab", "control"]), who = new Set(["강 교관", "모아", "서하린", "바우", "유리", "차도윤", "노을", "관제", "에이아", "바르가", "나", "EIA", "한서윤", "차 장군", "강도현", "XN-0", "아샤", "니르바", "카르타"]);
const ex = new Set(["normal", "smile", "angry", "sad", "surprise", "serious", undefined]);
let n = 0, ch = 0; const bad = [];
const walk = (L, k) => { for (const it of L || []) {
  if (typeof it === "string") {
    if (it.startsWith("@bg ")) { const x = it.slice(4); if (!imgs.has(x) && !rooms.has(x)) bad.push(k + " bg " + x); }
    else if (it.startsWith("@cg ")) { const x = it.slice(4); if (x !== "-" && !imgs.has(x)) bad.push(k + " cg " + x); }
    else if (!it.startsWith("@")) { n++; const i = it.indexOf("|"); if (i > 0) { const [w, e] = it.slice(0, i).split(":"); if (!who.has(w)) bad.push(k + " who " + w); if (!ex.has(e)) bad.push(k + " expr " + e); } else if (i < 0) bad.push(k + " no bar: " + it.slice(0, 20)); }
  } else if (it.choice) { ch++; for (const c of it.choice) { walk(c.then, k); for (const r of Object.keys(c.rel || {})) if (!["서하린","바우","유리","차도윤","모아","노을"].includes(r)) bad.push(k + " rel " + r); } }
  else if (it.if) { walk(it.then, k); walk(it.else, k); }
} };
for (const [k, v] of Object.entries(SCENES)) { walk(v.pre, k); walk(v.post, k); }
console.log("lines", n, "choices", ch, "scenes", Object.keys(SCENES).length, "radio", Object.keys(RADIO).length); console.log(bad.join("\n") || "all ok");
