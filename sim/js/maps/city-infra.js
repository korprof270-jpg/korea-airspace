// 네온 시티 기반 시설: 천변(가라앉은 물길)과 다리, 모노레일 고가와 역, 거리 소품
import * as THREE from "../../vendor/three.module.min.js";
import { DEG, MAG, CYA, YEL, GRN, ORG, RED, WARM, NEON, ring, bar, gable, tree, roundRect } from "./city-kit.js";

export const ROADS = [-150, -90, -30, 30, 90, 150];
export const RAIL_Y = 13.2;          // 모노레일 빔 윗면
const glow = (w, x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "glow", col: false, ...o });
const conc = (w, x, y, z, sx, sy, sz, c = 0x4a4f5a, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "std:concrete", tile: 6, ...o });
const dim = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const blocked = (K, x, z, m = 0) => K.block.some(([x0, x1, z0, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);

// x 방향으로 긴 상자: 맵 안쪽은 60m 조각(충돌 격자 부담을 줄임), 바깥은 장식만
function longBox(w, x0, x1, y, z, sy, sz, color, o = {}) {
  const IN = 270;
  if (x0 < -IN) w.box((x0 - IN) / 2, y, z, -IN - x0, sy, sz, color, { ...o, col: false });
  if (x1 > IN) w.box((x1 + IN) / 2, y, z, x1 - IN, sy, sz, color, { ...o, col: false });
  for (let x = Math.max(x0, -IN); x < Math.min(x1, IN) - 0.01; x += 60) { const e = Math.min(x + 60, x1, IN); w.box((x + e) / 2, y, z, e - x, sy, sz, color, o); }
}

// ── 천변: 도로보다 6m 낮은 물길(z 49..71)과 산책로, 다리 10개 ──
export function stream(w, K) {
  const Z0 = 49, Z1 = 71, WEIR = [-124, 174];
  const weir = (x) => Math.abs(x - WEIR[0]) < 2 || Math.abs(x - WEIR[1]) < 2;
  w.col.setTerrain((x, z) => (z > Z0 && z < Z1 ? (z > 52.5 && z < 67.5 && !weir(x) ? -7 : -5) : 0));
  for (const b of [[-930, 930, -930, Z0], [-930, 930, Z1, 930]]) w.ground(0x3a3d46, "wetasphalt", 9, { vary: 0.08, env: 1.4, bounds: b });
  w.water(-5.5, 0x16405a);
  w.box(0, -7.6, 60, 1860, 0.6, 15.4, 0x0b1820, { col: false, ao: false });
  for (const s of [-1, 1]) {
    w.box(0, -7.6, 60 + s * 9.25, 1860, 2.6, 3.5, 0x555a64, { col: false, mat: "std:concrete", tile: 5 });      // 산책로(윗면 -5)
    longBox(w, -930, 930, -7.6, 60 + s * 11.5, 7.55, 1, 0x4a4f5a, { mat: "std:concrete", tile: 6 });          // 옹벽
    glow(w, 0, -1.4, 60 + s * 10.97, 470, 0.16, 0.06, s < 0 ? CYA : MAG);
    glow(w, 0, -4.99, 60 + s * 7.56, 470, 0.05, 0.1, s < 0 ? CYA : MAG);
    for (let x = -210; x <= 210; x += 30) w.pool(x + 15, -5, 60 + s * 9.25, 5, s < 0 ? CYA : MAG, 0.22);
  }
  for (const x of WEIR) {   // 징검다리 보
    for (let k = -3; k <= 3; k++) w.box(x, -6.6, 60 + k * 2.15, 3.4, 1.6, 1.5, 0x6a6f7a, { col: false, mat: "std:rock", tile: 3 });
    glow(w, x, -5.02, 60, 0.2, 0.05, 15, dim(CYA, 0.7));
  }
  // 길가 산책로(가로 띠)·난간·가로수·보안등
  const OPEN = [[-150, 9.2], [-90, 9.2], [-60, 2.6], [-30, 9.2], [0, 5.8], [30, 9.2], [60, 2.5], [90, 9.2], [120, 3.2], [150, 9.2], [203.2, 0]];
  const r = w.rand;
  for (const s of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      w.box(i * 60, 0, 60 + s * 17, 46, 0.18, 11.9, 0x4a4e58, { col: false, mat: "std:concrete", tile: 5 });
      for (const t of [-16, -5.5, 5.5, 16]) {
        const x = i * 60 + t;
        if (OPEN.some(([bx, hw]) => Math.abs(x - bx) < hw + 2.6) || (s > 0 && Math.abs(x - 17) < 5)) continue;
        tree(w, x, 0.18, 60 + s * 19, 0.95 + r() * 0.3, { hue: 0.29 + r() * 0.05 });
        glow(w, x + 2.6, 0.18, 60 + s * 14, 0.25, 0.9, 0.25, WARM); w.pool(x + 2.6, 0.2, 60 + s * 14, 4.5, WARM, 0.3);
      }
    }
    let x = -203;
    for (const [bx, hw] of OPEN) {
      const x1 = bx - hw, z = 60 + s * 11.3;
      if (x1 - x > 1) { w.box((x + x1) / 2, 0.18, z, x1 - x, 1.0, 0.36, 0x596273); glow(w, (x + x1) / 2, 1.18, z, x1 - x, 0.08, 0.14, s < 0 ? CYA : MAG); }
      x = bx + hw;
    }
  }
  // 차도 다리 6개
  for (const bx of ROADS) {
    conc(w, bx, -1.2, 60, 18, 1.22, 22.2, 0x454a55);
    w.box(bx, 0.02, 60, 14, 0.035, 22.2, 0x33363e, { col: false, mat: "std:wetasphalt", tile: 9 });
    for (const s of [-1, 1]) {
      w.box(bx + s * 8, 0.02, 60, 2, 0.18, 22.2, 0x5a5f6a, { col: false });
      w.box(bx + s * 8.8, 0.2, 60, 0.3, 1.0, 22.2, 0x596273); glow(w, bx + s * 8.8, 1.2, 60, 0.12, 0.08, 22.2, WARM);
      for (const k of [-1, 1]) { glow(w, bx + s * 8.8, 1.2, 60 + k * 10.6, 0.4, 2.2, 0.4, WARM); w.pool(bx + s * 6, 0.1, 60 + k * 8, 6, WARM, 0.3); }
    }
    for (const z of [53, 60, 67]) glow(w, bx, -1.3, z, 16.5, 0.08, 0.4, CYA);
    w.gap("천변 다리 아래", bx, -3.4, 60, 90, 20.5, 4, 220);
  }
  const foot = (x, wd, name) => { conc(w, x, -0.5, 60, wd, 0.52, 22.2, 0x596273); w.gap(name, x, -3, 60, 90, 20.5, 4.6, 240); };
  // 무지개 다리(-60): 세 겹 네온 아치
  foot(-60, 4.6, "무지개 다리 아래");
  [[10.6, MAG], [9.8, YEL], [9.0, CYA]].forEach(([R, c]) => ring(w, -60, 0.1, 60, R, 0.3, c, { axis: "x", arc: Math.PI, seg: 30, cseg: 12 }));
  for (const s of [-1, 1]) glow(w, -60 + s * 2.2, 0.02, 60, 0.1, 0.9, 16, dim(WARM, 0.6));
  w.gap("무지개 아치", -60, 4.8, 60, 90, 14, 7, 420);
  // 달맞이 다리(0): 커다란 달 고리
  foot(0, 11.2, "달맞이 다리 아래");
  ring(w, 0, 7.3, 60, 7, 0.55, 0xfff0c0, { axis: "z", seg: 56, sides: 8, cseg: 20 });
  ring(w, 0, 7.3, 60, 6.2, 0.1, YEL, { axis: "z", seg: 48, sides: 4, col: false });
  for (const s of [-1, 1]) { w.box(s * 2.4, 0.02, 60, 2.2, 0.9, 1.6, 0x596273); glow(w, s * 5.4, 0.02, 60, 0.12, 1, 22, dim(YEL, 0.5)); }
  w.pool(0, 0.1, 60, 13, YEL, 0.35);
  w.gap("달맞이 고리", 0, 7.3, 60, 0, 9, 9, 520);
  // 출렁다리(60): 주탑과 늘어진 케이블
  foot(60, 4.2, "출렁다리 아래");
  for (const z of [49.6, 70.4]) {
    for (const s of [-1, 1]) w.pipe(60 + s * 2.3, 0, z, 60 + s * 2.3, 11, z, 0.28, 0xdfe3ea);
    w.box(60, 10.4, z, 5.2, 0.5, 0.5, 0xdfe3ea, { col: false }); glow(w, 60, 11, z, 5, 0.25, 0.3, CYA);
  }
  for (const s of [-1, 1]) for (let k = 0; k < 8; k++) {
    const z0 = 49.6 + k * 2.6, z1 = z0 + 2.6, y = (z) => 2.2 + 8.8 * ((z - 60) / 10.4) ** 2;
    bar(w, 60 + s * 2.3, y(z0), z0, 60 + s * 2.3, y(z1), z1, 0.07, CYA, "glow", 4);
    if (k) bar(w, 60 + s * 2.05, 0.02, z0, 60 + s * 2.3, y(z0), z0, 0.025, 0x9aa0a8, "metal", 4);
  }
  // 지붕 다리(120): 속으로 지나갈 수 있다
  foot(120, 5.6, "지붕 다리 아래");
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) w.box(120 + s * 2.6, 0.02, 50 + k * 5, 0.32, 3.7, 0.32, 0x9a3a2e, { mat: "paint" });
  gable(w, 120, 3.7, 60, 7, 1.9, 23.6, 0x2a3a40, { mat: "paint" });
  for (let k = 0; k < 4; k++) { glow(w, 120, 3.1, 52.5 + k * 5, 0.4, 0.5, 0.4, k % 2 ? ORG : YEL); w.pool(120, 0.05, 52.5 + k * 5, 4, ORG, 0.3); }
  w.gap("지붕 다리 속", 120, 1.9, 60, 0, 4.6, 3.3, 650);
  // 물길을 가로지르는 등불 줄
  for (const x of [-195, -175, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165, 190]) {
    bar(w, x, -0.4, 49.1, x, -1.3, 60, 0.03, 0x1c1f27); bar(w, x, -1.3, 60, x, -0.4, 70.9, 0.03, 0x1c1f27);
    for (let k = 0; k < 6; k++) { const z = 51.5 + k * 3.4; glow(w, x, -0.55 - Math.sin(((z - 49) / 22) * Math.PI) * 0.9 - 0.5, z, 0.45, 0.5, 0.45, [YEL, ORG, RED, MAG, CYA, GRN][(k + ((x + 195) / 10 | 0)) % 6]); }
  }
}

// ── 모노레일 순환선(±90 도로 위)과 문형 교각. 열차 경로 점을 돌려준다 ──
export function monorail(w, K) {
  const pts = roundRect(-90, 90, -90, 90, 28, RAIL_Y, 8), n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[2] - a[2]), k = Math.max(1, Math.ceil(len / 32)), ry = Math.atan2(-(b[2] - a[2]), b[0] - a[0]) / DEG;
    if (len < 0.01) continue;
    for (let j = 0; j < k; j++) {
      const t = (j + 0.5) / k, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
      w.box(x, RAIL_Y - 1.3, z, len / k + 0.45, 1.3, 1.3, 0xc9ced8, { ry, mat: "std:concrete", tile: 6 });
      glow(w, x, RAIL_Y - 0.78, z, len / k + 0.45, 0.14, 1.38, dim(CYA, 0.8), { ry });
    }
  }
  const portal = (x, z, alongX, c) => {
    for (const s of [-1, 1]) {
      const px = x + (alongX ? 0 : s * 7.3), pz = z + (alongX ? s * 7.3 : 0);
      w.pipe(px, 0, pz, px, 11.4, pz, 0.45, 0x8a909c, { mat: "std" }); K.block.push([px - 1.4, px + 1.4, pz - 1.4, pz + 1.4]);
    }
    w.box(x, RAIL_Y - 2.3, z, alongX ? 1.1 : 15.6, 1.0, alongX ? 15.6 : 1.1, 0x8a909c, { mat: "std:concrete", tile: 6 });
    glow(w, x, RAIL_Y - 2.42, z, alongX ? 0.4 : 14, 0.12, alongX ? 14 : 0.4, c);
  };
  for (const t of [-45, -15, 15, 45]) { portal(90, t, false, MAG); portal(-90, t, false, GRN); if (Math.abs(t) > 30) { portal(t, -90, true, CYA); portal(t, 90, true, YEL); } }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 81.8, z = sz * 81.8;
    w.pipe(x, 0, z, x, RAIL_Y - 1.3, z, 0.7, 0x8a909c, { mat: "std" }); w.box(x, RAIL_Y - 2.1, z, 2.6, 0.8, 2.6, 0x8a909c, { ry: 45 });
    K.block.push([x - 2.2, x + 2.2, z - 2.2, z + 2.2]);
  }
  return pts;
}

// 고가 역: 승강장·지붕·유리벽·승강기 탑. side: 승강기 탑이 서는 쪽(±1)
export function station(w, K, cx, cz, id, c, side) {
  for (const s of [-1, 1]) {
    w.box(cx, RAIL_Y - 0.9, cz + s * 3.5, 40, 0.6, 3.2, 0x596273, { mat: "std:concrete", tile: 4 });
    glow(w, cx, RAIL_Y - 0.28, cz + s * 2.0, 40, 0.05, 0.16, YEL);
    w.box(cx, RAIL_Y - 0.3, cz + s * 5.2, 40, 2.6, 0.15, 0x8fd3ff, { mat: "glass" });
    for (const x of [-18, -6, 6, 18]) w.pipe(cx + x, 0, cz + s * 6, cx + x, 18.4, cz + s * 6, 0.4, 0xdfe3ea);
    w.box(cx, 18.9, cz + s * 6.2, 13, 1.7, 0.36, 0x12151c, { col: false });
    K.signs.add(id, cx, 19.75, cz + s * 6.52, 12, { ry: s > 0 ? 0 : 180 });
    glow(w, cx, 18.3, cz + s * 6.5, 42, 0.25, 0.2, c);
  }
  w.box(cx, 18.4, cz, 42, 0.5, 13, 0xdfe3ea, { mat: "paint" });
  for (const s of [-1, 1]) glow(w, cx + s * 21, 18.3, cz, 0.2, 0.25, 13, c);
  for (let x = -16; x <= 16; x += 8) glow(w, cx + x, 18.28, cz, 0.3, 0.1, 9, dim(WARM, 0.8));
  w.pool(cx, 0.1, cz, 20, c, 0.25);
  const sz = cz + side * 9.3;
  w.box(cx + 17, 0, sz, 5, 16.5, 4.2, 0x66758a, { mat: "lit:facadelit", tile: 24, ao: false });
  w.box(cx + 17, 12.3, cz + side * 6.3, 3, 0.5, 2.4, 0x596273);
  glow(w, cx + 17, 16.6, sz, 5.2, 0.3, 4.4, c);
  K.block.push([cx - 22, cx + 22, cz - 8.5, cz + 8.5]);
  w.gap("역사 통과", cx, 15.7, cz, 90, 9.6, 4.8, 450);
}

// ── 거리: 차선·횡단보도·신호등·가로등·주차 차량 ──
export function streets(w, K) {
  const r = w.rand, nearX = (c) => Math.min(...ROADS.map((q) => Math.abs(c - q)));
  for (const p of ROADS) {
    for (let c = -225; c <= 225; c += 10) {
      if (nearX(c) < 11) continue;
      if (c < 46 || c > 74) glow(w, p, 0.03, c, 0.2, 0.03, 4, 0x3c4048);
      glow(w, c, 0.03, p, 4, 0.03, 0.2, 0x3c4048);
    }
    for (let m = -3; m <= 3; m++) {
      for (const [x, z, ry] of [[p - 7.7, m * 60 + 9, 90], [p + 7.7, m * 60 - 9, -90], [m * 60 + 9, p - 7.7, 0], [m * 60 - 9, p + 7.7, 180]]) {
        if ((ry === 90 || ry === -90) && z > 38.5 && z < 81.5) continue;       // 천변 구간
        if (!blocked(K, x, z, 0.6)) w.lamp(x, z, 7, WARM, ry);
      }
    }
  }
  for (const ix of ROADS) for (const iz of ROADS) {
    // 횡단보도
    for (let k = -2.5; k <= 2.5; k++) for (const s of [-1, 1]) {
      w.box(ix + k * 2.2, 0.02, iz + s * 9.3, 0.9, 0.035, 3, 0xb4bac6, { col: false, ao: false });
      w.box(ix + s * 9.3, 0.02, iz + k * 2.2, 3, 0.035, 0.9, 0xb4bac6, { col: false, ao: false });
    }
    // 신호등(대각 두 모서리)
    const d = ix * iz > 0 ? -1 : 1;
    for (const s of [-1, 1]) {
      const px = ix + s * 7.6, pz = iz + s * d * 7.6;
      if (blocked(K, px, pz, 0.8)) continue;
      w.cyl(px, 0, pz, 0.14, 7.6, 0x2c3138, { mat: "paint", rt: 0.1 });
      bar(w, px, 7.3, pz, px - s * 5.2, 7.3, pz, 0.07, 0x2c3138);
      const hx = px - s * 5.2, on = (ix + iz + s * 30) % 120 === 0;
      w.box(hx, 6.0, pz, 0.5, 1.5, 0.5, 0x16181d);
      [RED, YEL, GRN].forEach((c, i) => glow(w, hx, 7.05 - i * 0.48, pz, 0.3, 0.3, 0.56, dim(c, (on ? i === 2 : i === 0) ? 1 : 0.12)));
    }
  }
  // 주차 차량(남쪽 거리)
  for (let i = 0; i < 30; i++) {
    const p = ROADS[(r() * 6) | 0], z = 99 + r() * 104, side = p === 150 ? 5.9 : p === 30 ? -5.9 : r() < 0.5 ? -5.9 : 5.9, c = [0xb33a3a, 0x2f5fa0, 0xd9d9d9, 0x2b2b2b, 0xc9a23a, 0x3d8a5a][i % 6];
    if (Math.abs(z - 150) < 13 || blocked(K, p + side, z, 2.6)) continue;
    w.box(p + side, 0.25, z, 1.8, 0.8, 4.3, c, { mat: "paint" }); w.box(p + side, 1.05, z + 0.2, 1.6, 0.55, 2.2, 0x1c2430, { col: false });
    K.block.push([p + side - 1, p + side + 1, z - 4.6, z + 4.6]);
  }
}

// 일반 블록 패드 가장자리의 가로수
export function padTrees(w, K, cx, cz) {
  const r = w.rand;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (r() < 0.45) continue;
    for (const t of [-13, 0, 13]) {
      const x = cx + dx * 21.4 + (dx ? 0 : t + r() * 3), z = cz + dz * 21.4 + (dz ? 0 : t + r() * 3);
      if (r() < 0.25 || blocked(K, x, z, 2.5)) continue;
      tree(w, x, 0.18, z, 0.85 + r() * 0.3, { hue: 0.28 + r() * 0.06 });
    }
  }
}
