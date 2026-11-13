// 단풍 고궁: 궁성(성벽·성문·각루), 조정 마당과 회랑, 정전(하늘마루전), 침전·생활 구역
import { C, Fr, hall, fenceRun, arch, autumn, pick, lantern, lanternLine, flag, stairs, folk, ball, G, TRS, THREE } from "./palace-kit.js";

export const WX = 125, WN = -120, WS = 110, WT = 4, WH = 6.5;
const STONE = { mat: "std:brick", tile: 3.2 };

// 바닥 포장 판(충돌 없음). 지형이 0 인 평지에만 쓴다
export function pave(w, x0, x1, z0, z1, color = C.sand, mat = "std:dirt", y = 0.07, tile = 6) {
  w.box((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.abs(x1 - x0), y, Math.abs(z1 - z0), color, { col: false, ao: false, mat, tile });
}

// ── 성벽: 두께 4m, 높이 6.5m, 바깥쪽 여장과 순찰로. holes: [[지역 x 중심, 폭, 높이]] 는 수문 ──
function crenel(f, len, lz, y, h = 1.25) {
  const n = Math.max(1, Math.floor(len / 2.7)), st = len / n;
  for (let i = 0; i < n; i++) f.mesh(G.box(), -len / 2 + (i + 0.5) * st, y + h / 2, lz, 0, st - 0.62, h, 0.62, C.wall, "std");
  f.mesh(G.box(), 0, y + h * 0.24, lz, 0, len, h * 0.48, 0.6, C.wall, "std");
  f.solid(0, y, lz, len, h, 0.62);
}
export function rampart(w, ax, az, bx, bz, out, holes = []) {
  const len = Math.hypot(bx - ax, bz - az), alongX = Math.abs(bx - ax) > 1;
  const f = new Fr(w, (ax + bx) / 2, 0, (az + bz) / 2, alongX ? 0 : 90);
  let x0 = -len / 2;
  for (const [cx, ow, oh] of holes.slice().sort((p, q) => p[0] - q[0])) {
    f.box((x0 + cx - ow / 2) / 2, -3.4, 0, cx - ow / 2 - x0, WH + 3.4, WT, C.wall, STONE);
    f.box(cx, oh, 0, ow, WH - oh, WT, C.wall, STONE);
    arch(f, cx, oh, 0, ow, WT + 0.08, C.stoneD, { r: ow * 0.46 });
    f.gap("수문 통과", cx, oh / 2 - 0.3, 0, 0, ow - 0.5, oh + 0.4, 450);
    x0 = cx + ow / 2;
  }
  f.box((x0 + len / 2) / 2, -3.4, 0, len / 2 - x0, WH + 3.4, WT, C.wall, STONE);
  f.box(0, WH, 0, len, 0.12, WT + 0.3, C.stoneL, { col: false, ao: false });
  crenel(f, len, out * (WT / 2 - 0.31), WH + 0.1);
  f.box(0, WH + 0.1, -out * (WT / 2 - 0.15), len, 0.3, 0.3, C.stoneD, { col: false });
}

// ── 성문: 돌 육축에 홍예 통로, 위에 문루 ──
// ry 0 이면 통로가 z 방향. o: { wd, dep, hb, ops:[[cx, 폭, 높이]], names, pav:[W, D], two, pts }
export function gatehouse(w, x, z, ry, o) {
  const f = new Fr(w, x, 0, z, ry), Wd = o.wd, dep = o.dep, hb = o.hb;
  let x0 = -Wd / 2;
  o.ops.slice().sort((p, q) => p[0] - q[0]).forEach(([cx, ow, oh], i) => {
    f.box((x0 + cx - ow / 2) / 2, -0.5, 0, cx - ow / 2 - x0, hb + 0.5, dep, C.wall, STONE);
    f.box(cx, oh, 0, ow, hb - oh, dep, C.wall, STONE);
    arch(f, cx, oh, 0, ow, dep + 0.08, C.stoneD, { r: ow * 0.44 });
    // 홍예 위 밝은 돌 띠와 활짝 열린 붉은 문짝
    for (const s of [-1, 1]) {
      f.box(cx, oh + 0.25, s * (dep / 2 + 0.03), ow + 1.2, 0.35, 0.08, C.stoneL, { col: false, ao: false });
      f.box(cx + s * (ow / 2 - 0.1), 0, dep * 0.2, 0.16, oh * 0.8, dep * 0.34, C.red, { col: false, ao: false });
      f.box(cx + s * (ow / 2 - 0.2), oh * 0.3, dep * 0.2, 0.1, 0.25, dep * 0.3, C.yel, { col: false, ao: false, mat: "paint" });
    }
    f.gap(o.names ? o.names[i] : "성문 통과", cx, oh / 2, 0, 0, ow - 0.6, oh - 0.4, o.pts || 350);
    x0 = cx + ow / 2;
  });
  f.box((x0 + Wd / 2) / 2, -0.5, 0, Wd / 2 - x0, hb + 0.5, dep, C.wall, STONE);
  f.box(0, hb, 0, Wd + 0.5, 0.3, dep + 0.5, C.stoneL, { col: false });
  for (const s of [-1, 1]) crenel(f, Wd, s * (dep / 2 - 0.31), hb + 0.3);
  // 문루
  const [pw, pd] = o.pav, y1 = hb + 0.3;
  const h1 = hall(w, x, y1, z, pw, pd, { ry, open: true, plat: 0.25, hc: o.two ? 3.9 : 3.5, nz: 1, rail: true, over: 2.3, rh: o.two ? 2.1 : 3.0, type: o.two ? "hip" : "hipgable", sign: !o.two });
  f.gap(o.pavName || "문루 통과", 0, y1 + 0.25 + (h1.top - 0.25 - 0.95) / 2, 0, 90, pd - 1.1, h1.top - 0.25 - 1.3, 400);
  if (o.two) hall(w, x, y1 + h1.top + 0.8, z, pw - 6.5, pd - 2.2, { ry, open: true, plat: 0, hc: 2.9, nz: 1, over: 2.5, rh: 3.6, sign: true });
  // 문 앞 해태 석상과 수문장
  if (o.guard !== false) for (const s of [-1, 1]) {
    const g = f.sub(s * (Wd / 2 - 2.5), 0, dep / 2 + 4.5);
    g.box(0, 0, 0, 2.2, 1.0, 3.0, C.stone, { mat: "std:concrete", tile: 3 }); g.box(0, 1.0, 0.2, 1.2, 1.2, 1.9, C.stoneL, { col: false }); g.box(0, 1.9, -0.6, 1.0, 0.9, 0.9, C.stoneL, { col: false });
    const gx = s * (o.ops[o.ops.length >> 1][1] / 2 + 1.6);
    folk(w, f.X(gx, dep / 2 + 1.5), 0.07, f.Z(gx, dep / 2 + 1.5), C.red);
  }
}

// 각루: 성벽 모서리의 돈대와 작은 누각
function turret(w, x, z) {
  w.box(x, -0.5, z, 9, WH + 1.1, 9, C.wall, STONE);
  for (const ry of [0, 90]) { const f = new Fr(w, x, WH + 0.6, z, ry); for (const s of [-1, 1]) crenel(f, 9, s * 4.19, 0, 0.6); }
  hall(w, x, WH + 0.6, z, 5.6, 5.6, { open: true, plat: 0.3, hc: 3.9, nx: 1, nz: 1, over: 1.9, rh: 2.8, lift: 1.0 });
  w.gap("각루 통과", x, WH + 2.5, z, 0, 4.6, 2.3, 450); w.gap("각루 통과", x, WH + 2.5, z, 90, 4.6, 2.3, 450);
  flag(w, x + 3.6, z + 3.6, 5, [C.red, C.blue, C.yel, C.wht][(x > 0 ? 1 : 0) + (z > 0 ? 2 : 0)], 0, WH + 0.6);
}

export function walls(w) {
  // 남: 해오름문(삼문), 동·서·북: 단문
  rampart(w, -WX, WS, -19, WS, 1); rampart(w, 19, WS, WX, WS, 1);
  rampart(w, -WX, WN, -8, WN, -1); rampart(w, 8, WN, WX, WN, -1, [[100 - (8 + WX) / 2, 7, 2.6]]);
  rampart(w, WX, WN, WX, 31, 1); rampart(w, WX, 49, WX, WS, 1, [[-(88 - (49 + WS) / 2), 7, 2.6]]);
  rampart(w, -WX, WN, -WX, -49, -1); rampart(w, -WX, -31, -WX, WS, -1);
  gatehouse(w, 0, WS, 0, { wd: 38, dep: 10, hb: 9, ops: [[-10.5, 5, 5.4], [0, 7.6, 6.8], [10.5, 5, 5.4]], names: ["해오름문 서협", "해오름문 어칸", "해오름문 동협"], pav: [27, 7.4], two: true, pavName: "해오름문 문루" });
  gatehouse(w, WX, 40, 90, { wd: 18, dep: 8, hb: 7.2, ops: [[0, 6.4, 5.6]], names: ["동문 통과"], pav: [12.5, 5.6], pavName: "동문 문루" });
  gatehouse(w, -WX, -40, -90, { wd: 18, dep: 8, hb: 7.2, ops: [[0, 6.4, 5.6]], names: ["서문 통과"], pav: [12.5, 5.6], pavName: "서문 문루" });
  gatehouse(w, 0, WN, 180, { wd: 16, dep: 7, hb: 7.2, ops: [[0, 5.4, 5.2]], names: ["북문 통과"], pav: [10.5, 5], pavName: "북문 문루", guard: false });
  for (const sx of [-1, 1]) for (const z of [WN, WS]) turret(w, sx * WX, z);
  // 성벽 위 오방색 깃발
  const cols = [C.red, C.blue, C.yel, C.wht, 0x2b2b30];
  let k = 0;
  for (let x = -100; x <= 100; x += 25) { if (Math.abs(x) > 24) flag(w, x, WS + 1.69, 3.6, cols[k++ % 5], 0, WH + 1.3); if (Math.abs(x) > 12) flag(w, x, WN - 1.69, 3.6, cols[k++ % 5], 0, WH + 1.3); }
  for (let z = -95; z <= 95; z += 24) for (const s of [-1, 1]) if (Math.abs(z - s * 40) > 13) flag(w, s * (WX + 1.69), z, 3.6, cols[k++ % 5], 90, WH + 1.3);
  w.gap("남쪽 성곽길", -70, WH + 1.5, WS + 0.3, 90, 2.9, 2.6, 250); w.gap("동쪽 성곽길", WX + 0.3, WH + 1.5, -40, 0, 2.9, 2.6, 250);
  w.gap("서쪽 성곽길", -WX - 0.3, WH + 1.5, 40, 0, 2.9, 2.6, 250); w.gap("북쪽 성곽길", 60, WH + 1.5, WN - 0.3, 90, 2.9, 2.6, 250);
}

// ── 회랑: 한쪽이 벽이고 한쪽이 열린 긴 복도. wallAt 은 벽이 있는 쪽의 아무 점 ──
export function corridor(w, ax, az, bx, bz, wallAt, o = {}) {
  const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax) * 180 / Math.PI;
  const f = new Fr(w, (ax + bx) / 2, 0, (az + bz) / 2, ry), wd = o.wd ?? 6, hc = o.hc ?? 4.9, plat = 0.4, n = Math.max(1, Math.round(len / 5.2));
  const side = wallAt ? Math.sign(f.LZ(wallAt[0], wallAt[1])) : 0;
  f.box(0, 0, 0, len, plat, wd + 1.3, C.stone, { mat: "std:concrete", tile: 3 });
  for (let i = 0; i <= n; i++) for (const s of [-1, 1]) { const lx = -len / 2 + (i / n) * len; if (s !== side && o.skip && o.skip(f.X(lx, 0), f.Z(lx, 0))) continue; f.post(lx, plat, s * wd / 2, 0.26, hc, C.red, { col: s !== side }); }
  if (side) {
    f.box(0, plat, side * (wd / 2 + 0.05), len, hc - 0.9, 0.5, C.plaster, { ao: false });
    f.box(0, plat, side * (wd / 2 + 0.05), len + 0.02, 1.0, 0.62, C.stone, { col: false, mat: "std:brick", tile: 2.5 });
    for (let i = 0; i < n; i++) f.box(-len / 2 + ((i + 0.5) / n) * len, plat + 1.7, side * (wd / 2 + 0.05), (len / n) * 0.5, 1.5, 0.6, C.tealD, { col: false, ao: false });
  }
  for (const s of [-1, 1]) {
    f.box(0, plat + hc - 0.9, s * wd / 2, len, 0.34, 0.5, C.red, { col: false, ao: false });
    f.box(0, plat + hc - 0.56, s * wd / 2, len, 0.56, 0.58, C.teal, { col: false, ao: false });
    f.box(0, plat + hc - 0.6, s * wd / 2, len, 0.08, 0.64, C.yel, { col: false, ao: false });
    f.solid(0, plat + hc - 0.9, s * wd / 2, len, 0.9, 0.5);
  }
  f.roof(0, plat + hc, 0, len / 2 + 0.5, wd / 2 + 1.5, 2.3, { type: "gable", lod: true });
  (w.pCorr || (w.pCorr = [])).push({ f, len, wd, hc, plat, n, side });
  if (o.gap !== false) f.gap(o.name || "회랑 통과", o.gx || 0, plat + 1.95, 0, 90, wd - 1.1, 3.6, o.pts || 350);
  return f;
}

// ── 조정 마당: 회랑으로 둘러싼 마당, 어도와 품계석, 중문 ──
export function court(w) {
  pave(w, -52, 52, -56, 63, C.sand, "std:dirt", 0.07, 7);
  pave(w, -4.2, 4.2, -8, 104, C.stoneL, "std:concrete", 0.1, 2.8);         // 어도
  pave(w, -1.5, 1.5, -8, 104, 0xcfc8b6, "std:concrete", 0.13, 3);
  pave(w, 4.2, 123, 36, 44, C.stoneL, "std:concrete", 0.1, 2.8);           // 동문 길
  corridor(w, -55, 66, -55, 5, [-60, 0], { name: "서회랑 남쪽", gx: 16, skip: (x, z) => z > 31 && z < 45 }); corridor(w, -55, 5, -55, -56, [-60, 0], { name: "서회랑 북쪽" });
  corridor(w, 55, 66, 55, 47, [60, 0], { gap: false }); corridor(w, 55, 33, 55, -56, [60, 0], { name: "동회랑", skip: (x, z) => z > -24 && z < -10 });
  corridor(w, -52, 66, -11, 66, [0, 70], { name: "남회랑 서쪽" }); corridor(w, 11, 66, 52, 66, [0, 70], { name: "남회랑 동쪽" });
  // 중문(밝음문): 세 칸이 모두 열린 문
  hall(w, 0, 0, 66, 22, 8, { nx: 3, nz: 1, plat: 0.3, hc: 5.6, holes: [[0, 0], [1, 0], [2, 0]], over: 2.6, rh: 4.2, sign: true });
  for (const [x, n] of [[-7.33, "밝음문 서칸"], [0, "밝음문 어칸"], [7.33, "밝음문 동칸"]]) w.gap(n, x, 2.7, 66, 0, 5.6, 4.3, 350);
  // 동회랑의 협문(수레가 지나는 문)
  hall(w, 55, 0, 40, 14, 7, { ry: 90, nx: 1, nz: 1, plat: 0.3, hc: 5.6, holes: [[0, 0]], over: 2.2, rh: 3.4 });
  w.gap("동협문 통과", 55, 2.7, 40, 90, 11, 4.3, 250);
  // 품계석과 드므(방화수 독), 마당 석등
  for (let z = 6; z <= 54; z += 4) for (const s of [-1, 1]) w.mesh(G.box(), TRS(s * 8.5, 0.42, z, 0, 0.34, 0.7, 0.26), C.stoneL, "std");
  for (const [x, z] of [[-44, 56], [44, 56], [-44, -2], [44, -2]]) lantern(w, x, z, 1.5, 0.07);
  for (const s of [-1, 1]) w.cyl(s * 16, 0.07, -3.5, 1.0, 0.9, C.bronze, { mat: "metal", rt: 1.15 });
  // 마당 가장자리 청사초롱 줄
  for (const s of [-1, 1]) for (let z = -2; z < 60; z += 15.5) if (s < 0 || z + 15.5 < 31 || z > 49) lanternLine(w, [s * 51.6, 4.2, z], [s * 51.6, 4.2, z + 15.5], 6, 0.9);
  // 북쪽 담과 뒷문(침전으로)
  fenceRun(w, [[-52, -56], [-5, -56]], 3.2); fenceRun(w, [[5, -56], [52, -56]], 3.2);
  hall(w, 0, 0, -56, 8, 4, { nx: 1, nz: 1, plat: 0.2, hc: 4.4, holes: [[0, 0]], over: 1.6, rh: 2.4 });
  w.gap("뒷문 통과", 0, 2.1, -56, 0, 6.6, 3.2, 300);
}

// ── 정전(하늘마루전): 2단 월대 위의 중층 전각. 가운데 세 칸으로 들어가 어좌 양옆 뒷칸으로 빠져나간다 ──
export function throne(w) {
  const cz = -30, f = new Fr(w, 0, 0, cz);
  f.box(0, 0, 0, 60, 1.6, 44, C.stone, { mat: "std:concrete", tile: 3.2 }); f.box(0, 1.6, 0, 50, 1.4, 36, C.stone, { mat: "std:concrete", tile: 3.2 });
  // 월대 난간(돌기둥과 돌란대)
  for (const [hw, hd, y] of [[30, 22, 1.6], [25, 18, 3.0]]) {
    for (let x = -hw; x <= hw + 0.01; x += hw / 8) for (const s of [-1, 1]) { if (Math.abs(x) < 7) continue; f.mesh(G.box(), x, y + 0.55, s * (hd - 0.3), 0, 0.34, 1.1, 0.34, C.stoneL); }
    for (let z = -hd; z <= hd + 0.01; z += hd / 6) for (const s of [-1, 1]) { if (Math.abs(z) < 4) continue; f.mesh(G.box(), s * (hw - 0.3), y + 0.55, z, 0, 0.34, 1.1, 0.34, C.stoneL); }
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
      f.box(t * (hw + 7) / 2, y + 0.75, s * (hd - 0.3), hw - 7, 0.2, 0.26, C.stoneL, { col: false }); f.box(s * (hw - 0.3), y + 0.75, t * (hd + 4) / 2, 0.26, 0.2, hd - 4, C.stoneL, { col: false });
    }
  }
  stairs(f, 0, 3.0, 18, 13, 8, { rise: 0.375 }); stairs(f, 0, 3.0, -18, 13, 8, { rise: 0.375, ry: 180 });
  stairs(f, 25, 3.0, 0, 7, 8, { rise: 0.375, ry: 90 }); stairs(f, -25, 3.0, 0, 7, 8, { rise: 0.375, ry: -90 });
  // 아래층: 앞 가운데 세 칸, 뒤 양옆 칸이 열려 있다
  const h1 = hall(w, 0, 3.0, cz, 34, 20, { nx: 5, nz: 3, plat: 0.7, hc: 8, cr: 0.45, holes: [[1, 0], [3, 0], [2, 1]], over: 3.2, rh: 3.5, type: "hip", lift: 2.2, sign: true });
  hall(w, 0, 3.0 + h1.top + 1.0, cz, 25, 12.5, { nx: 5, nz: 2, plat: 0, hc: 3.6, cr: 0.36, body: C.redD, door: C.tealD, over: 3.4, rh: 6.2, lift: 2.4, sign: true });
  // 어좌: 단 + 붉은 의자 + 일월오봉 병풍
  const t = new Fr(w, 0, 3.7, cz - 5.6);
  t.box(0, 0, 0, 5.6, 1.3, 5, C.red, { mat: "paint" }); t.box(0, 1.3, 0.3, 2.0, 0.9, 1.6, C.redD, { col: false }); t.box(0, 2.2, -0.4, 2.2, 1.6, 0.3, C.yel, { col: false, mat: "paint" });
  t.box(0, 1.3, -2.0, 5.4, 4.4, 0.3, C.blue, { mat: "paint" });
  for (let i = -2; i <= 2; i++) t.mesh(G.cone(4, 0), i * 1.0, 2.6 + (i === 0 ? 0.3 : 0), -1.8, 45, 0.7, 2.2 + (i === 0 ? 0.6 : 0), 0.1, C.teal, "paint");
  t.mesh(G.cyl(8), -1.7, 5.0, -1.8, 0, 0.36, 0.08, 0.36, C.red, "glow"); t.mesh(G.cyl(8), 1.7, 5.0, -1.8, 0, 0.36, 0.08, 0.36, 0xffffff, "glow");
  for (const x of [-6.8, 6.8]) w.gap(x < 0 ? "정전 서칸 관통" : "정전 동칸 관통", x, 3.7 + 3.4, cz, 0, 5.4, 6.4, 600);
  // 월대 모서리 향로와 석등
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { w.cyl(sx * 21, 3.0, cz + sz * 14.5, 0.75, 1.5, C.bronze, { mat: "metal", rt: 0.95 }); lantern(w, sx * 27, cz + sz * 19, 1.3, 1.6); }
}

// ── 침전(왕의 생활 공간): 뒷마당의 전각 세 채와 그 사이를 잇는 높은 복도각 ──
export function quarters(w) {
  pave(w, -52, 52, -112, -58.5, 0xdcccaa, "std:dirt", 0.07, 7);
  pave(w, -2.2, 2.2, -116, -58, C.stoneL, "std:concrete", 0.1, 2.8);
  hall(w, 0, 0, -82, 30, 11, { nx: 7, nz: 2, plat: 1.3, hc: 4.4, over: 2.4, rh: 4.6, sign: true });
  stairs(new Fr(w, 0, 0, -82), 0, 1.3, 6.7, 6, 4, { rise: 0.33 });
  for (const s of [-1, 1]) {
    hall(w, s * 37, 0, -84, 17, 9, { ry: 90, nx: 4, nz: 2, plat: 1.3, hc: 4.0, over: 2.0, rh: 3.8 });
    // 복도각: 돌기둥 위에 얹힌 다리 복도. 아래로 지나갈 수 있다
    const f = new Fr(w, s * 23.5, 0, -82);
    for (const x of [-4.2, 4.2]) for (const z of [-1.5, 1.5]) f.post(x, 0, z, 0.3, 3.5, C.stoneL, { mat: "std", base: false });
    f.box(0, 3.5, 0, 17.4, 0.4, 4.2, C.wood, { mat: "std:wood", tile: 2 }); f.box(0, 3.9, 0, 17.0, 2.5, 3.6, C.plaster);
    for (let x = -6; x <= 6; x += 3) for (const z of [-1, 1]) f.box(x, 4.5, z * 1.82, 2.0, 1.3, 0.1, C.tealD, { col: false, ao: false });
    f.roof(0, 6.4, 0, 9.2, 3.2, 1.8, { type: "gable", lod: true });
    f.gap(s < 0 ? "서쪽 복도각 아래" : "동쪽 복도각 아래", 0, 1.8, 0, 0, 7.4, 3.0, 450);
  }
  // 굴뚝(벽돌 육각 기둥에 작은 지붕)과 화계(계단식 꽃밭)
  for (const x of [-9, 9]) { w.mesh(G.cyl(6), TRS(x, 2.2, -97, 0, 0.95, 4.4, 0.95), 0xc77a56, "std"); w.mesh(G.pyr(0.2), TRS(x, 4.75, -97, 0, 2.8, 0.9, 2.8), C.tile, "std"); w.col.addCapsule(new THREE.Vector3(x, 0, -97), new THREE.Vector3(x, 4.4, -97), 0.9); }
  const fl = [0xd8452f, 0xe8a030, 0xd96a8a, 0x7a9a3a];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = -105.2 - i * 3.6, y = 0.9 * (i + 1);
    w.box(s * 34, 0, z, 40, y, 3.6, C.stone, { mat: "std:brick", tile: 2.5 });
    for (let k = 0; k < 9; k++) {
      const px = s * (16 + k * 4.4 + w.rand() * 2);
      if (i === 2 && k % 2) autumn(w, px, z, 0.6, pick(w), { y: y + 0.2, litter: false });
      else w.mesh(G.leaf(k % 3), TRS(px, y + 0.5, z, 0, 0.9, 0.7, 0.9), fl[(k + i) % 4], "foliage");
    }
  }
  for (const [x, z] of [[20, -66], [46, -64]]) autumn(w, x, z, 1.2, pick(w));
}

// ── 생활 구역(서북): 작은 전각들과 장독대, 서문에서 이어지는 길 ──
export function living(w) {
  pave(w, -121, -59, -112, -6, 0xd9c9a4, "std:dirt", 0.07, 7);
  pave(w, -121, -59, -43.5, -36.5, C.stoneL, "std:concrete", 0.1, 2.8);
  hall(w, -90, 0, -19, 24, 9, { nx: 5, nz: 2, plat: 1.0, hc: 3.9, over: 2.0, rh: 3.9, sign: true });
  hall(w, -108, 0, -66, 22, 9, { ry: 90, nx: 5, nz: 2, plat: 0.8, hc: 3.6, over: 1.9, rh: 3.3, type: "gable" });
  hall(w, -78, 0, -62, 20, 8, { nx: 4, nz: 2, plat: 0.8, hc: 3.6, over: 1.9, rh: 3.6 });
  hall(w, -92, 0, -101, 34, 8, { nx: 8, nz: 2, plat: 0.8, hc: 3.6, over: 1.9, rh: 3.4, type: "gable" });
  // 안마당 담과 일각문
  fenceRun(w, [[-121, -8], [-104, -8]], 2.6); fenceRun(w, [[-76, -8], [-59, -8]], 2.6);
  fenceRun(w, [[-121, -48], [-96.6, -48]], 2.6); fenceRun(w, [[-91.4, -48], [-59, -48]], 2.6);
  { const f = new Fr(w, -94, 0, -48); for (const s of [-1, 1]) f.post(s * 2.3, 0, 0, 0.22, 3.6, C.woodD); f.roof(0, 3.6, 0, 3.6, 1.5, 1.2, { type: "gable", lod: true }); f.gap("일각문 통과", 0, 1.8, 0, 0, 3.8, 3.2, 500); }
  // 장독대: 낮은 단 위의 옹기 독
  w.box(-70, 0, -84, 12, 0.5, 9, C.stone, { mat: "std:brick", tile: 2.5 });
  for (let i = 0; i < 26; i++) { const x = -75 + (i % 6) * 2 + w.rand() * 0.5, z = -87.5 + ((i / 6) | 0) * 1.9, s = 0.5 + w.rand() * 0.45; w.mesh(ball(), TRS(x, 0.5 + s * 0.85, z, 0, s * 0.72, s * 0.9, s * 0.72), [0x6b3f2a, 0x5a3424, 0x7a4a30][i % 3], "paint"); w.mesh(G.cyl(8), TRS(x, 0.5 + s * 1.72, z, 0, s * 0.55, 0.1, s * 0.55), 0x4a2c1e, "std"); }
  for (const [x, z, k] of [[-64, -70, "gold"], [-116, -30, "maple"], [-66, -30, "orange"], [-116, -90, "ginkgo"], [-100, -84, "maple"], [-64, -106, "crimson"], [-84, -78, "orange"]]) autumn(w, x, z, 1.25, k);
  lantern(w, -100, -28, 1.2, 0.07); lantern(w, -80, -28, 1.2, 0.07);
}
