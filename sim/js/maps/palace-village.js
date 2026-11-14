// 단풍 고궁: 성 밖 한옥 마을(기와집·초가집 마당과 골목), 마을 마당, 장터
import { C, Fr, hall, fence, autumn, pick, lantern, lanternLine, flag, folk, beam, ball, ball0, G, TRS, THREE } from "./palace-kit.js";
import { pave } from "./palace-court.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BR = { mat: "std:brick", tile: 2.5 };

// 집 한 채(날개 하나): 기단 + 회벽 + 나무 뼈대 + 지붕. 긴 쪽이 지역 x
function wing(f, lx, lz, len, dep, ry, thatch, front = 1) {
  const g = f.sub(lx, 0, lz, ry);
  g.box(0, 0, 0, len + 0.9, 0.45, dep + 0.9, C.stone, { col: false, ...BR });
  g.box(0, 0.45, 0, len, 2.8, dep, thatch ? 0xe6d6b4 : C.plaster, { ao: false });
  for (const y of [0.45, 3.0]) g.box(0, y, 0, len + 0.08, 0.25, dep + 0.08, C.woodD, { col: false, ao: false });
  const n = Math.max(2, Math.round(len / 3.2));
  for (let i = 0; i <= n; i++) for (const s of [-1, 1]) g.box(-len / 2 + (i / n) * len, 0.45, s * dep / 2, 0.24, 2.8, 0.14, C.woodD, { col: false, ao: false });
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + ((i + 0.5) / n) * len;
    g.box(x, 0.85, front * (dep / 2 + 0.03), (len / n) * 0.62, 1.9, 0.08, i % 2 ? C.paper : 0xead9b0, { col: false, ao: false });
    g.box(x, 0.85, front * (dep / 2 + 0.05), 0.08, 1.9, 0.08, C.wood, { col: false, ao: false });
  }
  if (!thatch) g.box(0, 0.45, front * (dep / 2 + 0.65), len * 0.55, 0.3, 1.3, C.wood, { col: false, mat: "std:wood", tile: 2 });   // 툇마루
  if (thatch) g.roof(0, 3.25, 0, len / 2 + 1.0, dep / 2 + 1.0, 2.3, { type: "hip", lod: true, color: C.thatch, mat: "std", under: 0xb08e48, fascia: 0xc7a252, ridge: false, lift: 0.1 });
  else g.roof(0, 3.25, 0, len / 2 + 1.3, dep / 2 + 1.3, dep * 0.28 + 1.2, { lod: true, under: C.wood, fascia: C.tileD, lift: 0.85 });
}

// 장독 몇 개
function jars(w, x, z, n) {
  for (let i = 0; i < n; i++) { const s = 0.42 + w.rand() * 0.4, px = x + (i % 3) * 1.25, pz = z + ((i / 3) | 0) * 1.3; w.mesh(ball(), TRS(px, s * 0.85, pz, 0, s * 0.72, s * 0.9, s * 0.72), [0x6b3f2a, 0x5a3424, 0x7a4a30][i % 3], "paint"); w.mesh(G.cyl(8), TRS(px, s * 1.72, pz, 0, s * 0.55, 0.1, s * 0.55), 0x4a2c1e, "std"); }
}
// 감나무: 잎이 거의 진 가지에 주황 감
function persimmon(w, x, z) {
  w.cyl(x, 0, z, 0.3, 4.6, 0x4a3828, { rt: 0.16 });
  const p = V(x, 4.4, z);
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + w.rand(), q = V(x + Math.cos(a) * 2.4, 5.6 + w.rand() * 1.6, z + Math.sin(a) * 2.4);
    beam(w, p, q, 0.12, 0.12, 0x4a3828);
    for (let k = 0; k < 3; k++) w.mesh(ball0(), TRS(q.x + (w.rand() - 0.5) * 1.3, q.y - 0.2 - w.rand() * 0.7, q.z + (w.rand() - 0.5) * 1.3, 0, 0.22, 0.2, 0.22), 0xff7a1a, "paint");
    if (i % 2) w.mesh(G.leaf(i % 3), TRS(q.x, q.y + 0.3, q.z, 0, 1.2, 0.8, 1.2), 0xd98a2a, "foliage");
  }
  w.col.addSphere(V(x, 5.8, z), 2.2);
}

// 집터 하나(31×34m): 담장, 솟을대문, 집 날개들, 마당 살림. side: 대문이 나는 쪽(+1 = 남, -1 = 북)
function lot(w, cx, cz, side, type, gx) {
  const f = new Fr(w, cx, 0, cz, side > 0 ? 0 : 180), hw = 15, hd = 16.5, r = w.rand;
  const F = (ax, az, bx, bz, h = 2.1) => fence(w, f.X(ax, az), f.Z(ax, az), f.X(bx, bz), f.Z(bx, bz), h, { t: 0.55, color: 0xe2d4b4 });
  F(-hw, -hd, hw, -hd); F(-hw, -hd, -hw, hd); F(hw, -hd, hw, hd); F(-hw, hd, gx - 2.2, hd); F(gx + 2.2, hd, hw, hd);
  pave(w, cx - hw, cx + hw, cz - hd, cz + hd, 0xd9c8a0, "std:dirt", 0.05, 7);
  // 솟을대문
  for (const s of [-1, 1]) { f.box(gx + s * 1.95, 0, hd, 0.5, 3.9, 0.9, C.woodD); f.box(gx + s * 1.5, 0, hd + 1.0, 0.1, 3.0, 1.5, C.wood, { col: false, ry: s * 12 }); }
  f.box(gx, 3.4, hd, 4.4, 0.5, 0.7, C.woodD);
  f.roof(gx, 3.9, hd, 3.2, 1.5, 1.3, { type: "gable", lod: true, under: C.wood, fascia: C.tileD });
  f.gap("솟을대문 통과", gx, 1.8, hd, 0, 3.0, 3.1, 550);
  const th = type === "D";
  (w.pLots || (w.pLots = [])).push({ f, type, gx });
  if (type === "A") { wing(f, 1, -9.5, 18, 6.4, 0); wing(f, -9.6, 2.5, 13, 5.4, 90, false, -1); }
  else if (type === "B") { wing(f, 0, -10, 17, 6.4, 0); wing(f, -10, 1.5, 12, 5.2, 90, false, -1); wing(f, 10, 1.5, 12, 5.2, 90, false, 1); }
  else if (type === "C") { wing(f, 0, -10.5, 20, 6, 0); wing(f, -10.3, 0.5, 14, 5, 90, false, -1); wing(f, 10.3, 0.5, 14, 5, 90, false, 1); wing(f, gx > 0 ? -5 : 5, 10.5, 11, 5, 0, false, -1); f.gap("안마당 내려앉기", 0, 3.6, 0.3, 0, 11, 10, 500, 90); }
  else { wing(f, -4, -9.5, 13, 5.6, 0, true); wing(f, 8.5, 3, 9, 5, 90, true, 1);
    // 볏가리와 평상
    w.mesh(G.cone(8, 0.15), TRS(f.X(-9, 6), 1.5, f.Z(-9, 6), 0, 1.9, 3.0, 1.9), C.thatch, "std"); w.col.addSphere(V(f.X(-9, 6), 1.3, f.Z(-9, 6)), 1.6); }
  // 마당 살림
  jars(w, f.X(th ? 2 : 6, -3.5), f.Z(th ? 2 : 6, -3.5), 5 + ((r() * 4) | 0));
  f.box(type === "B" ? 0 : 3, 0, 5, 3.2, 0.5, 2.2, C.wood, { col: false, mat: "std:wood", tile: 2 });
  const tx = -gx * 0.9 + (type === "B" ? 0 : 2), tz = 11.5;
  if (type !== "C") { if (r() < 0.5) persimmon(w, f.X(tx, tz), f.Z(tx, tz)); else autumn(w, f.X(tx, tz), f.Z(tx, tz), 1.05, pick(w)); }
  else jars(w, f.X(-1.2, -1), f.Z(-1.2, -1), 6);
}

// 장터 좌판: 기둥 넷과 비스듬한 천막, 좌판 위 물건
function stall(w, x, z, ry, color, goods) {
  const f = new Fr(w, x, 0, z, ry);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.mesh(G.cyl(6), sx * 2.2, sz > 0 ? 1.6 : 1.3, sz * 1.5, 0, 0.08, sz > 0 ? 3.2 : 2.6, 0.08, C.woodD);
  f.box(0, 2.72, 0, 5.2, 0.12, 3.9, color, { rx: 11.5 }); f.box(0, 2.74, 1.0, 5.22, 0.13, 0.7, C.wht, { rx: 11.5, col: false });
  f.box(0, 0, 0.2, 4.0, 0.9, 1.5, C.wood, { mat: "std:wood", tile: 2 });
  for (let i = 0; i < 9; i++) f.mesh(i % 2 ? ball0() : G.box(), -1.6 + (i % 5) * 0.8, 1.08, -0.2 + ((i / 5) | 0) * 0.7, 0, 0.28, 0.26, 0.28, goods[i % goods.length], "paint");
  folk(w, f.X(0, -1.3), 0.05, f.Z(0, -1.3), [C.wht, 0x8fb0d8, C.pink][(x + z) & 1 ? 0 : 1], 0);
}

export function village(w) {
  const r = w.rand, D = (x0, x1, z0, z1) => pave(w, x0, x1, z0, z1, C.dirt, "std:dirt", 0.06, 7);
  D(-217, 222, 176, 184); D(-37, 37, 134, 176);
  const XS = [-199.5, -163.5, -127.5, -91.5, -55.5, 55.5, 91.5, 127.5], T = "ABCD";
  XS.forEach((x, i) => {
    lot(w, x, 159, 1, T[(i * 3 + 1) % 4], i % 2 ? 7 : -7); lot(w, x, 201, -1, T[(i * 3 + 2 + (i > 4 ? 1 : 0)) % 4], i % 2 ? -6 : 6);
  });
  // 골목(집터 사이 5m)과 골목 어귀의 등불 줄
  [-181.5, -145.5, -109.5, -73.5, 73.5, 109.5].forEach((x, i) => {
    D(x - 2.6, x + 2.6, 134, 176); D(x - 2.6, x + 2.6, 184, 219);
    lanternLine(w, [x - 2.4, 4.6, 143], [x + 2.4, 4.6, 143], 3, 0.35); lanternLine(w, [x - 2.4, 4.6, 174], [x + 2.4, 4.6, 174], 3, 0.35);
    for (const z of [143, 174]) for (const s of [-1, 1]) w.mesh(G.cyl(6), TRS(x + s * 2.4, 2.3, z, 0, 0.07, 4.6, 0.07), 0x5a4030, "std");
    w.gap(i < 4 ? "서촌 골목" : "동촌 골목", x, 2.1, 159, 0, 4.4, 3.6, 300);
  });
  // 큰길 위 청사초롱 줄
  for (const x of [-190, -154, -118, -82, -46, 46, 82, 118]) {
    for (const s of [-1, 1]) { w.mesh(G.cyl(6), TRS(x, 3, 180 + s * 3.7, 0, 0.09, 6, 0.09), 0x5a4030, "std"); w.col.addCapsule(V(x, 0, 180 + s * 3.7), V(x, 6, 180 + s * 3.7), 0.12); }
    lanternLine(w, [x, 6, 176.3], [x, 6, 183.7], 5, 0.7);
  }
  w.gap("등불 큰길", -118, 2.7, 180, 90, 6.4, 4.4, 250); w.gap("등불 큰길", 82, 2.7, 180, 90, 6.4, 4.4, 250);
  // 마을 어귀: 장승과 솟대
  for (const s of [-1, 1]) {
    const x = s * 9, z = 137;
    w.cyl(x, 0, z, 0.42, 4.6, s < 0 ? 0x8a5a3a : 0x7a4a30, { rt: 0.36 }); w.box(x, 3.2, z + 0.36, 0.6, 0.9, 0.2, C.plaster, { col: false }); w.box(x, 3.5, z + 0.47, 0.5, 0.12, 0.06, 0x20242c, { col: false }); w.box(x, 1.2, z + 0.4, 0.34, 1.6, 0.1, C.wht, { col: false });
    w.cyl(x + s * 3.5, 0, z + 2, 0.07, 8.5, 0x6a5038); w.mesh(G.box(), TRS(x + s * 3.5, 8.6, z + 2, 30, 1.0, 0.2, 0.3), 0x3a3028, "std"); w.mesh(G.box(), TRS(x + s * 3.5 + 0.5, 8.75, z + 2.3, 30, 0.34, 0.3, 0.22), 0x3a3028, "std");
  }
  // 마을 마당: 당산나무(큰 느티나무), 모정, 우물
  { const x = 0, z = 200;
    w.cyl(x, 0, z, 1.3, 8, 0x5a4634, { rt: 0.85 });
    w.mesh(G.cyl(12), TRS(x, 0.45, z, 0, 4.2, 0.9, 4.2), C.stone, "std"); w.col.addBox(V(x, 0.45, z), V(3.4, 0.45, 3.4), null);
    for (let i = 0; i < 8; i++) { const a = i * 0.8, d = i ? 4.6 : 0, rr = i ? 3.8 + r() * 1.4 : 5.4; w.blob(x + Math.cos(a) * d, 10 + (i % 3) * 2 + (i ? 0 : 3), z + Math.sin(a) * d, rr, rr * 0.85, rr, [0xd9902a, 0xc9a02a, 0xb8782a][i % 3], { col: i < 5 }); }
    for (let i = 0; i < 12; i++) { const a = i * 0.524; w.mesh(G.box(), TRS(x + Math.cos(a) * 1.5, 3.2 + (i % 4) * 0.5, z + Math.sin(a) * 1.5, i * 30, 0.08, 1.3, 0.5), [C.red, C.blue, C.yel, C.wht, 0x35a35a][i % 5], "std"); }   // 오색 천
    w.gap("당산나무 아래", x, 4.6, z - 6, 90, 6, 6, 300); }
  hall(w, -22, 0, 204, 8, 6, { open: true, nx: 2, nz: 1, plat: 1.1, hc: 3.0, over: 1.6, rh: 2.6, lod: true, under: C.wood, post: C.woodD, band: C.wood, rail: true });
  w.gap("모정 통과", -22, 2.35, 204, 0, 3.2, 2.1, 550);
  { const x = 22, z = 206;
    w.mesh(G.cyl(10), TRS(x, 0.5, z, 0, 1.5, 1.0, 1.5), C.stone, "std"); w.mesh(G.cyl(10), TRS(x, 0.98, z, 0, 1.1, 0.06, 1.1), 0x2a4a5a, "std"); w.col.addBox(V(x, 0.5, z), V(1.3, 0.5, 1.3), null);
    const f = new Fr(w, x, 0, z); for (const s of [-1, 1]) f.post(s * 2.0, 0, 0, 0.16, 3.2, C.woodD, { base: false }); f.roof(0, 3.2, 0, 3.0, 1.6, 1.2, { type: "gable", lod: true, under: C.wood, fascia: C.tileD }); }
  for (const [x, z, k] of [[-30, 172, "ginkgo"], [30, 172, "ginkgo"], [-30, 142, "maple"], [30, 142, "orange"], [-14, 216, "gold"], [14, 216, "maple"], [32, 192, "crimson"], [-34, 190, "orange"]]) autumn(w, x, z, 1.25, k);
  for (let i = 0; i < 8; i++) folk(w, -6 + (i % 4) * 4 + r() * 2, 0.06, 190 + ((i / 4) | 0) * 22 + r() * 2, [C.wht, 0x8fb0d8, C.pink, C.yel, 0x9ac28a][i % 5], i % 3 ? 0x1c1c22 : 0);
  // ── 장터(동쪽 끝) ──
  D(150, 222, 138, 176); D(150, 222, 184, 222);
  const awn = [C.red, C.blue, C.yel, C.wht, 0x3f9a6a, C.pink], goods = [[0xff7a1a, 0xd9402a, 0xe9c02a], [0x8fb0d8, C.wht, 0x9a6ad0], [0x7a9a3a, 0xc94a3a, 0xe8d0a0]];
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
    stall(w, 185 + s * 9, 147 + k * 8.4, s > 0 ? -90 : 90, awn[(k * 2 + (s > 0 ? 1 : 0)) % 6], goods[(k + (s > 0 ? 1 : 0)) % 3]);
    stall(w, 185 + s * 9, 190 + k * 8.4, s > 0 ? -90 : 90, awn[(k * 2 + 3 + (s > 0 ? 1 : 0)) % 6], goods[(k + 1 + (s > 0 ? 1 : 0)) % 3]);
  }
  for (let k = 0; k < 4; k++) { lanternLine(w, [176.5, 5.6, 144 + k * 9.5], [193.5, 5.6, 148.7 + k * 9.5], 7, 1.0); lanternLine(w, [176.5, 5.6, 187 + k * 9.5], [193.5, 5.6, 191.7 + k * 9.5], 7, 1.0); }
  for (const z of [139.5, 220.5]) {
    const f = new Fr(w, 185, 0, z);
    for (const s of [-1, 1]) f.post(s * 4, 0, 0, 0.3, 6, C.red);
    f.box(0, 5.0, 0, 9.6, 0.8, 0.5, C.woodD); f.box(0, 5.15, 0.28, 5.2, 0.5, 0.06, C.yel, { col: false, mat: "paint" });
    f.roof(0, 6, 0, 6.2, 1.6, 1.4, { type: "gable", lod: true, under: C.red });
    f.gap("장터 문 통과", 0, 2.5, 0, 0, 6.6, 4.6, 350);
  }
  w.gap("장터 등불 아래", 185, 2.4, 162, 0, 7, 4.2, 300); w.gap("장터 등불 아래", 185, 2.4, 205, 0, 7, 4.2, 300);
  // 주막(초가)과 평상, 가마솥
  { const f = new Fr(w, 162, 0, 204); wing(f, 0, 0, 13, 6, 90, true, 1); f.box(6.5, 0, -4, 3.2, 0.5, 2.4, C.wood, { col: false }); f.box(6.5, 0, 3, 3.2, 0.5, 2.4, C.wood, { col: false }); }
  { const f = new Fr(w, 210, 0, 160); wing(f, 0, 0, 14, 6, 90, true, -1); w.cyl(203.5, 0, 150, 0.9, 0.9, 0x2a2a2e, { mat: "metal", rt: 1.1 }); }
  { const f = new Fr(w, 210, 0, 204); wing(f, 0, 0, 14, 6.4, 90, false, -1); }
  { const f = new Fr(w, 160, 0, 156); wing(f, 0, 0, 12, 6, 90, false, 1); }
  jars(w, 199, 196, 9); persimmon(w, 170, 190); persimmon(w, 201, 172);
  for (let i = 0; i < 14; i++) folk(w, 181 + r() * 8, 0.06, 144 + r() * 74, [C.wht, 0x8fb0d8, C.pink, C.yel, 0x9ac28a, 0xb9a0d8][i % 6], i % 2 ? 0x1c1c22 : 0);
  // 마을 뒤 황금 들녘과 볏가리, 허수아비
  for (let x = -214; x < 150; x += 40) pave(w, x, x + 37, 221.5, 236, [0xdcb848, 0xcfae3c, 0xe2c452][((x + 214) / 40) % 3 | 0], "std:dirt", 0.05, 5);
  for (let i = 0; i < 16; i++) { const x = -210 + i * 23 + r() * 6, z = 226 + r() * 6; w.mesh(G.cone(8, 0.12), TRS(x, 1.3, z, 0, 1.5, 2.6, 1.5), C.thatch, "std"); w.col.addSphere(V(x, 1.2, z), 1.3); }
  for (const x of [-170, -60, 70]) { w.cyl(x, 0, 229, 0.06, 2.6, C.woodD); w.box(x, 1.7, 229, 1.8, 0.1, 0.1, C.woodD, { col: false }); w.box(x, 1.2, 229, 0.7, 0.9, 0.2, C.wht, { col: false }); w.mesh(G.cone(8, 0.1), TRS(x, 2.75, 229, 0, 0.55, 0.3, 0.55), C.thatch, "std"); }
  void flag; void lantern;
}
