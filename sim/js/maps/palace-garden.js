// 단풍 고궁: 연못과 달못루, 바깥마당의 금천과 무지개다리, 숨은뜰(후원), 탑마당, 뒷산과 성 밖 들판
import { C, Fr, hall, roof, fenceRun, arch, autumn, pick, lantern, lanternLine, flag, folk, beam, ball, ball0, G, TRS, DEG, THREE } from "./palace-kit.js";
import { pave } from "./palace-court.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const QUAY = { mat: "std:concrete", tile: 3 };
const quay = (w, x0, x1, z0, z1, top = 0.14) => w.box((x0 + x1) / 2, -3.4, (z0 + z1) / 2, x1 - x0, 3.4 + top, z1 - z0, C.stone, QUAY);

// 육각정: 육각 기단, 기둥 여섯, 두 겹 육각 지붕
export function hexPav(w, x, y, z, R = 4.6, name = "육각정 통과") {
  w.mesh(G.cyl(6), TRS(x, y - 1.1, z, 0, R + 1.4, 3.8, R + 1.4), C.stone, "std");
  w.col.addBox(V(x, y - 1.1, z), V(R + 0.6, 1.9, R + 0.6), null);
  const hc = 3.5, top = y + 0.8 + hc, P = [];
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; P.push(V(x + Math.sin(a) * R, top - 0.45, z + Math.cos(a) * R)); }
  const f = new Fr(w, x, y + 0.8, z);
  for (let k = 0; k < 6; k++) {
    const p = P[k], q = P[(k + 1) % 6];
    f.post(p.x - x, 0, p.z - z, 0.24, hc, C.red);
    beam(w, p, q, 0.4, 0.7, C.teal); beam(w, V(p.x, p.y - 0.42, p.z), V(q.x, q.y - 0.42, q.z), 0.34, 0.24, C.red);
    w.col.addCapsule(p, q, 0.36);
    // 추녀마루: 꼭대기에서 모서리로 내려와 끝이 들린다
    const a = (k * Math.PI) / 3, e = R + 2.5;
    beam(w, V(x + Math.sin(a) * 0.8, top + 3.9, z + Math.cos(a) * 0.8), V(x + Math.sin(a) * e * 0.6, top + 1.0, z + Math.cos(a) * e * 0.6), 0.34, 0.3, C.ridge);
    beam(w, V(x + Math.sin(a) * e * 0.6, top + 1.0, z + Math.cos(a) * e * 0.6), V(x + Math.sin(a) * e * 1.03, top + 0.75, z + Math.cos(a) * e * 1.03), 0.34, 0.3, C.ridge);
  }
  w.mesh(G.cone(6, 0.56), TRS(x, top + 0.45, z, 0, R + 2.5, 1.1, R + 2.5), C.tile, "std");
  w.mesh(G.cone(6, 0.56), TRS(x, top - 0.12, z, 0, R + 2.4, 0.16, R + 2.4), C.teal, "std");
  w.mesh(G.cone(6, 0.06), TRS(x, top + 2.5, z, 0, (R + 2.5) * 0.58, 3.0, (R + 2.5) * 0.58), C.tile, "std");
  w.mesh(ball(), TRS(x, top + 4.35, z, 0, 0.5, 0.75, 0.5), C.ridge, "std");
  w.col.addBox(V(x, top + 0.5, z), V(R + 1.2, 0.6, R + 1.2), null); w.col.addSphere(V(x, top + 1.9, z), (R + 2.5) * 0.42);
  w.gap(name, x, y + 0.8 + 1.5, z, 30, R - 1.1, 2.6, 500); w.gap(name, x, y + 0.8 + 1.5, z, 90, R - 1.1, 2.6, 500);
}

// 무지개다리: 가운데가 솟은 돌다리. 지역 z 방향으로 건넌다
function rainbow(w, x, z, name) {
  const f = new Fr(w, x, 0, z);
  f.box(0, 1.9, 0, 4.6, 0.5, 4.6, C.stoneL, QUAY);
  for (const s of [-1, 1]) {
    f.box(0, 0.85, s * 4.55, 4.6, 0.5, 5.4, C.stoneL, { rx: s * 23.6, ...QUAY });
    for (const sx of [-1, 1]) { for (const zz of [0.6, 2.2]) f.mesh(G.box(), sx * 2.1, 2.9, s * zz, 0, 0.3, 1.0, 0.3, C.stone); f.mesh(G.box(), sx * 2.1, 3.2, s * 1.2, 0, 0.2, 0.2, 2.6, C.stone); }
  }
  arch(f, 0, 1.9, 0, 7, 4.6, C.stone, { ry: 90, r: 3.3 });
  f.gap(name, 0, 0.45, 0, 90, 6.2, 2.7, 500);
}

// ── 연못과 달못루: 물 위 돌기둥 스무 개가 누각을 받친다 ──
export function pond(w) {
  quay(w, -119.5, -60.5, 0.5, 6); quay(w, -119.5, -60.5, 70, 75.5); quay(w, -119.5, -114, 6, 70); quay(w, -66, -60.5, 6, 70);
  const f = new Fr(w, -90, 0, 30);
  for (const x of [-12, -6, 0, 6, 12]) for (const z of [-9, -3, 3, 9]) { f.box(x, -3.4, z, 0.9, 8.4, 0.9, C.stoneL); f.box(x, 4.6, z, 1.5, 0.4, 1.5, C.stone, { col: false }); }
  f.box(0, 5.0, 0, 27, 0.55, 21, C.wood, { mat: "std:wood", tile: 2 });
  hall(w, -90, 5.55, 30, 24, 18, { open: true, plat: 0, hc: 4.5, nx: 5, nz: 3, cr: 0.32, rail: true, over: 3.0, rh: 5.8, lift: 2.2, sign: true });
  f.gap("달못루 돌기둥 사이", 0, 2.0, 0, 90, 4.8, 5.4, 600); f.gap("달못루 돌기둥 사이", 3, 2.0, 0, 0, 4.8, 5.4, 600);
  f.gap("달못루 누마루", 0, 7.4, 0, 90, 5.0, 3.2, 450); f.gap("달못루 누마루", 0, 7.4, 0, 0, 4.0, 3.2, 450);
  // 북쪽 둑에서 오르는 돌 층층다리
  w.box(-99, 2.62, 12.75, 3, 0.45, 14.6, C.stoneL, { rx: -21.8, ...QUAY });
  for (const s of [-1, 1]) w.box(-99 + s * 1.4, 3.3, 12.75, 0.2, 0.25, 14.6, C.stone, { rx: -21.8, col: false });
  // 섬과 소나무, 연잎
  w.tree(-90, 56, 1.15, "pine"); lantern(w, -87, 58.5, 1.0); w.rock(-93, 58, 1.3); w.rock(-88.5, 53.5, 1.0);
  for (let i = 0; i < 46; i++) {
    const x = -112 + w.rand() * 44, z = 8 + w.rand() * 60, r = 0.5 + w.rand() * 0.7;
    if (Math.hypot(x + 90, z - 56) < 8) continue;
    w.mesh(G.cyl(8), TRS(x, -0.95, z, w.rand() * 360, r, 0.05, r), w.rand() < 0.3 ? 0xa79a4a : 0x6f9450, "std");
    if (i % 5 === 0) w.mesh(G.cone(6, 0.1), TRS(x + 0.2, -0.7, z, 0, 0.26, 0.5, 0.26), 0xf0a0b4, "std");
  }
  for (const x of [-116, -107]) autumn(w, x, 78.2, 1.1, pick(w));
  for (const x of [-112, -102]) autumn(w, x, -3.6, 1.2, "ginkgo");
  for (const [x, z] of [[-117, 3], [-63, 3], [-117, 73], [-63, 73]]) lantern(w, x, z, 1.25, 0.14);
}

// ── 바깥마당: 금천(돌 수로)과 다리 셋, 은행나무 길 ──
export function outer(w) {
  pave(w, -58, 58, 69.6, 80.4); pave(w, -58, 58, 95.6, 106.4);
  // 수로 둑(양쪽 4.1m 돌 포장). 연못 쪽은 ㄱ자로 꺾인다
  quay(w, -82.4, 123, 80.4, 84.5); quay(w, -97.6, 123, 91.5, 95.6); quay(w, -97.6, -93.5, 75.5, 91.5); quay(w, -86.5, -82.4, 75.5, 80.4);
  // 가운데 어도 돌다리(막힌 둑다리): 난간과 서수 석상
  pave(w, -7.5, 7.5, 80.2, 95.8, C.stoneL, "std:concrete", 0.16, 2.8);
  for (const s of [-1, 1]) {
    quay(w, s * 7.5 - 0.5, s * 7.5 + 0.5, 84.5, 91.5, 0.16);
    w.box(s * 6.9, 0.16, 88, 0.45, 0.95, 15, C.stoneL);
    for (const z of [80.6, 95.4]) w.box(s * 6.9, 0.16, z, 0.8, 1.5, 0.8, C.stone, { col: false });
  }
  rainbow(w, -32, 88, "서쪽 무지개다리 아래"); rainbow(w, 32, 88, "동쪽 무지개다리 아래");
  for (const s of [-1, 1]) for (let x = 30; x <= 112; x += 11.6) { if (s > 0 && x > 60 && x < 64) continue; autumn(w, s * x, 101, 1.3, x % 2 ? "ginkgo" : "gold"); }
  for (const x of [-44, -18, 18, 44]) lantern(w, x, 74, 1.3, 0.07);
  for (const s of [-1, 1]) lanternLine(w, [s * 6.9, 3.4, 71], [s * 6.9, 3.4, 105], 12, 0.6);
  for (const s of [-1, 1]) for (const z of [71, 105]) { w.mesh(G.cyl(6), TRS(s * 6.9, 1.8, z, 0, 0.09, 3.5, 0.09), 0x5a4030, "std"); }
}

// ── 숨은뜰(후원): 월문으로 들어가는 담장 안 정원. 시내와 못, 정자 둘, 단풍 터널 ──
const SX = (z) => (z < -112 ? 100 : z < -95 ? 100 - ((z + 112) / 17) * 4 : z < -78 ? 96 + ((z + 95) / 17) * 8 : z < -62 ? 104 - ((z + 78) / 16) * 6 : 98 - ((z + 62) / 12) * 5);
export function garden(w) {
  const r = w.rand;
  fenceRun(w, [[62, -116], [62, 30], [87.3, 30]], 3.0); fenceRun(w, [[96.7, 30], [121, 30]], 3.0);
  // 월문: 둥근 구멍이 뚫린 두꺼운 담
  { const f = new Fr(w, 92, 0, 30);
    for (const s of [-1, 1]) f.box(s * 3.45, 0, 0, 2.5, 5.6, 1.1, C.plaster);
    f.box(0, 4.7, 0, 4.4, 0.9, 1.1, C.plaster); f.box(0, 0, 0, 4.4, 0.3, 1.1, C.plaster);
    arch(f, 0, 4.7, 0, 4.4, 1.12, C.plaster, { full: true, r: 2.2 });
    f.box(0, 0, 0, 9.5, 0.9, 1.25, C.stone, { col: false, mat: "std:brick", tile: 2.5 });
    f.roof(0, 5.6, 0, 5.2, 1.1, 0.8, { type: "gable", lod: true, col: false });
    f.gap("월문 통과", 0, 2.5, 0, 0, 3.3, 3.3, 650); }
  // 단풍 터널과 불로문(통돌 문)
  for (let z = -22; z <= 24; z += 6.6) for (const x of [66.6, 76.6]) autumn(w, x + (r() - 0.5), z + r() * 1.5, 1.7, r() < 0.7 ? "maple" : "crimson");
  w.gap("단풍 터널", 71.6, 1.9, 0, 0, 5.0, 3.0, 450);
  for (let z = -24; z <= 26; z += 2.4) w.mesh(G.cyl(8), TRS(71.6 + Math.sin(z) * 0.5, 0.08, z, 0, 0.75, 0.08, 0.6), C.stoneL, "std");
  { const f = new Fr(w, 71.6, 0, 19);
    for (const s of [-1, 1]) f.box(s * 2.3, 0, 0, 0.8, 3.9, 0.8, C.stoneL); f.box(0, 3.5, 0, 5.4, 0.8, 0.8, C.stoneL);
    arch(f, 0, 3.5, 0, 3.8, 0.82, C.stoneL, { r: 1.2 }); f.gap("불로문 통과", 0, 1.8, 0, 0, 3.4, 3.2, 600); }
  // 못가의 네모 정자(물 위로 반쯤 나와 있다)와 언덕 위 작은 육각정
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.box(92 + sx * 3, -3, -32 + sz * 3, 0.7, 3.9, 0.7, C.stoneL);
  hall(w, 92, 0, -32, 6, 6, { open: true, nx: 1, nz: 1, plat: 0.9, hc: 3.3, rail: true, over: 1.9, rh: 2.9, lift: 1.1, sign: true });
  w.gap("못가 정자 통과", 92, 2.35, -32, 90, 4.8, 2.3, 550);
  hexPav(w, 111, 0.2, -60, 3.5, "숨은뜰 육각정");
  // 시내 위 돌널다리와 징검돌
  for (const z of [-104, -70]) w.box(SX(z), 0.02, z, 8.6, 0.32, 2.4, C.stoneL, QUAY);
  for (let i = 0; i < 5; i++) w.mesh(G.cyl(8), TRS(SX(-87) - 3 + i * 1.5, -0.95, -87, 0, 0.55, 0.5, 0.55), C.stone, "std");
  // 단풍 숲
  for (let i = 0; i < 70; i++) {
    const x = 66 + r() * 52, z = -112 + r() * 138;
    if (Math.hypot(x - 92, z + 42) < 15 || Math.abs(x - SX(z)) < 5.5 && z < -48 || Math.abs(x - 71.6) < 8.5 && z > -28 || Math.hypot(x - 111, z + 60) < 9 || Math.abs(x - 92) < 5 && z > 16) continue;
    autumn(w, x, z, 0.95 + r() * 0.6, pick(w));
  }
  for (const [x, z] of [[84, -30], [100, -30], [80, -48], [104, -50], [96, -110], [104, -92]]) w.rock(x, z, 0.9 + r() * 0.8);
  for (const [x, z] of [[88, 24], [96, 24], [86, -26], [98, -26]]) lantern(w, x, z, 1.1);
}

// ── 탑마당: 오층석탑, 새벽종각, 황금 은행나무 ──
export function temple(w) {
  pave(w, 62.5, 122, 50.5, 80.3, 0xdfd0ad);
  fenceRun(w, [[62, 80.4], [62, 50], [87.4, 50]], 2.8); fenceRun(w, [[96.6, 50], [121, 50]], 2.8);
  { const f = new Fr(w, 92, 0, 50);      // 일주문
    for (const s of [-1, 1]) f.post(s * 3.0, 0, 0, 0.42, 5.2, C.red);
    f.box(0, 4.3, 0, 7.4, 0.9, 0.8, C.teal); f.box(0, 4.0, 0, 7.0, 0.3, 0.6, C.red, { col: false });
    f.roof(0, 5.2, 0, 5.6, 2.6, 2.3, { lift: 1.0 }); f.gap("일주문 통과", 0, 2.15, 0, 0, 4.8, 3.9, 450); }
  // 오층석탑
  { const x = 104, z = 65; let y = 0;
    w.box(x, 0, z, 7, 0.9, 7, C.stone, QUAY); w.box(x, 0.9, z, 5.4, 0.7, 5.4, C.stoneL, QUAY); y = 1.6;
    for (let i = 0; i < 5; i++) {
      const s = 3.6 - i * 0.52, h = 2.0 - i * 0.22;
      w.box(x, y, z, s, h, s, C.stoneL, { mat: "std:concrete", tile: 2 }); y += h;
      roof(w, x, y, z, s * 0.5 + 1.25 - i * 0.1, s * 0.5 + 1.25 - i * 0.1, 0.85, { type: "hip", lod: true, lift: 0.6, color: C.stone, under: C.stoneD, fascia: C.stoneL, mat: "std", ridge: false });
      y += 0.85;
    }
    w.cyl(x, y, z, 0.3, 2.4, C.stoneD, { rt: 0.08 }); for (let i = 0; i < 3; i++) w.mesh(ball(), TRS(x, y + 0.5 + i * 0.6, z, 0, 0.5 - i * 0.1, 0.22, 0.5 - i * 0.1), C.stoneL, "std"); }
  // 새벽종각: 큰 종 아래로 지나간다
  hall(w, 76, 0, 65, 9, 9, { open: true, nx: 1, nz: 1, plat: 0.6, hc: 6.6, cr: 0.4, over: 2.5, rh: 4.4, lift: 1.6, sign: true });
  w.cyl(76, 4.5, 65, 1.75, 2.9, C.bronze, { mat: "metal", rt: 1.25 }); w.box(76, 7.2, 65, 0.5, 0.6, 9, C.woodD, { col: false }); w.box(76, 4.3, 65, 3.9, 0.22, 3.9, 0x4c6249, { col: false, mat: "metal" });
  w.pipe(72.6, 5.4, 62.5, 72.6, 5.4, 67.5, 0.22, C.wood, { col: false });
  w.gap("새벽종 아래", 76, 2.5, 65, 90, 7.6, 3.4, 550);
  // 황금 은행나무(천 년 고목)
  { const x = 114, z = 60;
    w.cyl(x, 0, z, 1.2, 9.5, 0x5a4634, { rt: 0.8 });
    w.mesh(G.cyl(12), TRS(x, 0.1, z, 0, 10.5, 0.06, 9.5), 0xe9c02a, "std");
    for (let i = 0; i < 9; i++) { const a = i * 0.7, d = i ? 4.2 : 0, rr = i ? 3.6 + w.rand() * 1.6 : 5.2; w.blob(x + Math.cos(a) * d, 11 + (i % 3) * 2.4 + (i ? 0 : 3), z + Math.sin(a) * d, rr, rr * 0.9, rr, [0xf3c822, 0xeab81a, 0xf7d43a][i % 3], { col: i < 5 }); }
    w.gap("천 년 은행나무 아래", x - 5.2, 4.2, z, 0, 5.4, 5.4, 300); }
  for (const [x, z] of [[98, 58], [110, 72], [86, 58], [86, 72]]) lantern(w, x, z, 1.25, 0.07);
  for (const [x, z, k] of [[66, 54], [66, 77], [119, 77], [96, 77]]) autumn(w, x, z, 1.1, k || pick(w));
  for (let i = 0; i < 5; i++) folk(w, 96 + i * 1.3, 0.07, 62 + (i % 2) * 1.5, [0xb9b2a4, 0x8a8f9a, 0xcfc8b6][i % 3], 0);
}

// ── 뒷산: 홍살문, 돌계단 길, 꼭대기 노을정, 서쪽 봉수대, 동쪽 산신각. 온 산이 단풍 ──
const pathX = (z) => 10 * Math.min(1, (-140 - z) / 65) + Math.sin((-140 - z) * 0.11) * 7 * Math.min(1, (-140 - z) / 12) * Math.max(0, Math.min(1, (z + 205) / 12));
export function hill(w) {
  const r = w.rand;
  // 홍살문
  { const f = new Fr(w, 0, 0, -139);
    for (const s of [-1, 1]) f.post(s * 3, 0, 0, 0.28, 8.2, C.red, { n: 8 });
    f.box(0, 6.2, 0, 7.6, 0.34, 0.34, C.red); f.box(0, 7.2, 0, 7.6, 0.34, 0.34, C.red);
    for (let x = -2.5; x <= 2.5; x += 0.72) f.mesh(G.cone(4, 0.2), x, 7.5, 0, 0, 0.1, 2.3, 0.1, C.red, "paint");
    f.mesh(G.cyl(10), 0, 7.3, 0, 0, 0.62, 0.1, 0.62, C.blue, "paint", 90);
    f.gap("홍살문 통과", 0, 3.2, 0, 0, 5.2, 5.6, 350); }
  for (let z = -143; z > -203; z -= 1.9) { const x = pathX(z); w.box(x, w.h(x, z) - 0.2, z, 3.4, 0.42, 1.7, C.stoneL, { col: false, ry: (pathX(z - 1) - pathX(z + 1)) * 26 }); }
  for (let z = -150; z > -200; z -= 12) for (const s of [-1, 1]) { const x = pathX(z) + s * 2.6; lantern(w, x, z, 0.9); }
  // 노을정(꼭대기 육각정)과 전망 마당
  const py = w.h(10, -205);
  hexPav(w, 10, py + 0.3, -205, 4.8, "노을정 통과");
  for (let k = 0; k < 6; k++) { const a = k * 1.047; flag(w, 10 + Math.sin(a) * 9.5, -205 + Math.cos(a) * 9.5, 5.5, [C.red, C.yel, C.blue, C.wht, C.red, C.yel][k], k * 60); }
  for (const a of [0, 3.1416]) lanternLine(w, [10 + 9.5 * Math.sin(a), py + 5.2, -205 + 9.5 * Math.cos(a)], [10 + 9.5 * Math.sin(a + 1.047), py + 5.2, -205 + 9.5 * Math.cos(a + 1.047)], 6, 0.8);
  // 봉수대(서쪽 봉우리): 돌 굴뚝 다섯
  { const y = w.h(-150, -185), f = new Fr(w, -150, y - 1.2, -185, 12);
    f.box(0, 0, 0, 27, 2.2, 7.5, C.wall, { mat: "std:brick", tile: 3 });
    for (let i = -2; i <= 2; i++) { w.cyl(f.X(i * 5.2, 0), y + 1.0, f.Z(i * 5.2, 0), 1.5, 3.9, C.stone, { rt: 1.0, mat: "std:brick", tile: 3 }); w.box(f.X(i * 5.2, 1.4), y + 1.0, f.Z(i * 5.2, 1.4), 0.8, 0.9, 0.5, 0x2a2622, { col: false, ry: 12 }); }
    w.sph(f.X(0, 0), y + 5.6, f.Z(0, 0), 0.9, 0xff8a2a, { mat: "glow", col: false, sy: 1.5 });
    w.gap("봉수대 굴뚝 사이", f.X(2.6, 0), y + 2.9, f.Z(2.6, 0), 12 + 90, 2.0, 3.4, 700); }
  // 산신각(동쪽 봉우리)과 돌탑
  { const y = w.h(160, -175);
    hall(w, 160, y - 0.6, -175, 7, 5, { ry: -20, nx: 2, nz: 1, plat: 1.2, hc: 3.0, over: 1.5, rh: 2.4, lod: true, blind: -1 });
    for (const [dx, dz, s] of [[8, 4, 1], [10, 0, 0.7], [-8, 5, 0.85], [6, 8, 0.6]]) { const yy = w.h(160 + dx, -175 + dz); w.mesh(G.cone(7, 0.12), TRS(160 + dx, yy + 1.3 * s, -175 + dz, 0, 1.2 * s, 2.9 * s, 1.2 * s), C.stoneD, "std"); w.col.addSphere(V(160 + dx, yy + s, -175 + dz), s); }
    w.tree(151, -178, 1.3, "pine"); }
  // 단풍 숲
  let n = 0;
  for (let i = 0; i < 900 && n < 250; i++) {
    const x = -226 + r() * 452, z = -228 + r() * 92, h = w.h(x, z);
    if (h < 1.2 || Math.abs(x - pathX(z)) < 5 && z > -212 && Math.abs(x) < 30 || Math.hypot(x - 10, z + 205) < 14 || Math.abs(z + 205) < 7 && Math.abs(x - 10) < 76 || Math.hypot(x + 150, z + 185) < 17 || Math.hypot(x - 160, z + 175) < 13) continue;
    if (r() < 0.12) w.tree(x, z, 0.8 + r() * 0.5, "pine"); else autumn(w, x, z, 1.05 + r() * 0.75, pick(w), { litter: false });
    n++;
  }
  for (let i = 0; i < 26; i++) { const x = -220 + r() * 440, z = -225 + r() * 80; if (w.h(x, z) > 3 && Math.abs(x - pathX(z)) > 6 && Math.hypot(x - 10, z + 205) > 12) w.rock(x, z, 1 + r() * 1.6, 0x9a9488); }
}

// ── 성 밖: 순환로, 서쪽 활터(청 진영), 동쪽 큰북 마당(홍 진영), 숲, 먼 산의 단풍 ──
export function fields(w) {
  const r = w.rand, D = (x0, x1, z0, z1) => pave(w, x0, x1, z0, z1, C.dirt, "std:dirt", 0.06, 7);
  D(-146, 146, -134.5, -127.5); D(-232, 232, 124, 134); D(-146, -138, -127.5, 124); D(138, 146, -127.5, 124);
  D(-8, 8, 115, 124); D(-138, -127, -43.5, -36.5); D(127, 138, 36.5, 43.5); D(-3, 3, -127.5, -123.5);
  // 동쪽 냇물이 길 밑으로 지나는 돌 암거
  for (const x of [132.5, 149]) w.box(x, -3, 88, 1.2, 3.5, 9, C.stone, QUAY);
  // 서쪽 활터: 과녁과 사대, 깃발 고리
  for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.283 + 0.3; flag(w, -185 + Math.cos(a) * 34, 10 + Math.sin(a) * 34, 6, k % 2 ? C.blue : C.wht, a * 57.3); flag(w, 185 + Math.cos(a) * 34, 10 + Math.sin(a) * 34, 6, k % 2 ? C.red : C.yel, a * 57.3); }
  for (const z of [-14, 10, 34]) { w.box(-225.5, 0, z, 0.3, 3.0, 2.6, C.wht, { mat: "paint" }); w.mesh(G.cyl(12), TRS(-225.3, 1.8, z, 0, 0.9, 0.06, 0.9, 0, 90), C.red, "paint"); w.mesh(G.cyl(12), TRS(-225.25, 1.8, z, 0, 0.4, 0.06, 0.4, 0, 90), 0x20242c, "paint"); }
  hall(w, -186, 0, -44, 12, 6, { open: true, nx: 3, nz: 1, plat: 0.8, hc: 3.4, over: 2.0, rh: 3.0, rail: true });
  w.gap("활터 사정 통과", -186, 2.4, -44, 90, 4.8, 2.4, 400);
  // 동쪽 큰북 마당: 북 누각과 씨름판
  hall(w, 186, 0, -44, 8, 8, { open: true, nx: 1, nz: 1, plat: 1.0, hc: 5.2, over: 2.2, rh: 3.6, lift: 1.4 });
  w.mesh(G.cyl(14), TRS(186, 4.7, -44, 0, 1.7, 1.5, 1.7, 0, 90), C.red, "paint"); for (const s of [-1, 1]) w.mesh(G.cyl(14), TRS(186 + s * 0.78, 4.7, -44, 0, 1.55, 0.06, 1.55, 0, 90), C.wht, "std");
  w.col.addSphere(V(186, 4.7, -44), 1.6);
  w.gap("큰북 아래", 186, 2.0, -44, 0, 6.6, 1.9, 500);
  w.mesh(G.cyl(16), TRS(186, 0.12, 62, 0, 7, 0.2, 7), C.sand, "std"); for (let k = 0; k < 16; k++) { const a = k * 0.393; w.mesh(ball0(), TRS(186 + Math.cos(a) * 7, 0.3, 62 + Math.sin(a) * 7, 0, 0.5, 0.3, 0.5), C.thatch, "std"); }
  for (let i = 0; i < 9; i++) { const a = i * 0.7; folk(w, 186 + Math.cos(a) * 9, 0.06, 62 + Math.sin(a) * 9, [C.wht, C.pink, 0x8fb0d8, C.yel][i % 4], i % 3 ? 0x1c1c22 : 0); }
  // 숲
  const keep = (x, z) => Math.hypot(Math.abs(x) - 185, z - 10) > 38 && Math.hypot(Math.abs(x) - 186, z + 44) > 12 && Math.hypot(x - 186, z - 62) > 12 && !(x > 147 && Math.abs(z - (88 + (x - 150) * 0.2)) < 8);
  for (let i = 0; i < 150; i++) {
    const s = r() < 0.5 ? -1 : 1, x = s * (151 + r() * 76), z = -122 + r() * 238;
    if (!keep(x, z)) continue;
    if (r() < 0.1) w.tree(x, z, 0.9 + r() * 0.4, "pine"); else autumn(w, x, z, 1.0 + r() * 0.7, pick(w));
  }
  for (let x = -110; x <= 110; x += 13) for (const z of [117, -124.6]) if (Math.abs(x) > 24) autumn(w, x + r() * 3, z, 1.1, z > 0 ? "ginkgo" : "maple");
  for (let z = -105; z <= 100; z += 13) for (const s of [-1, 1]) if (Math.abs(z - s * 40) > 14 && Math.abs(z - 88) > 8) autumn(w, s * 132.5, z + r() * 3, 1.1, "orange");
  // 먼 산의 단풍(충돌 없음): 큼직한 수관 덩어리
  const col = new THREE.Color();
  for (let i = 0; i < 540; i++) {
    const x = -450 + r() * 900, z = -450 + r() * 900;
    if (Math.max(Math.abs(x), Math.abs(z)) < 246) continue;
    const y = w.h(x, z), s = 5 + r() * 5, k = r();
    col.setHSL(k < 0.45 ? 0.01 + r() * 0.03 : k < 0.75 ? 0.07 + r() * 0.03 : k < 0.92 ? 0.12 + r() * 0.02 : 0.3, 0.72, 0.36 + r() * 0.12);
    w.mesh(G.leaf(i % 3), TRS(x, y + s * 0.45, z, r() * 360, s, s * 0.8, s), col.getHex(), "leaf");
  }
}
export { DEG };
