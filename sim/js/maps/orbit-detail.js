// 궤도 요새 디테일: 에일 생체 결정 감염 구역, 떠다니는 소행성·잔해, 갑판 소품
import * as THREE from "../../vendor/three.module.min.js";
import { M, prop, merged, beam, ball, V3, DEG, shard, crystalCluster, icoG, onDeck, outside, hash,
  WH, HULL, HULL2, STEEL, DARK, NAVY, ORG, YEL, RED, AMB, CYA, VIO, VIO2, PINK, FLESH, FLESH2 } from "./orbit-kit.js";
import { HANGARS, HZ, HW, HD, HH, DOCK_X, DOCKS, MASTS, REACTOR } from "./orbit-base.js";

const ROCKC = [0x8d8a86, 0x75726f, 0xa29d96, 0x6b6560];

// ── 에일 감염: 북동 구역을 뒤덮은 결정 숲, 갑판을 기어가는 발광 혈관, 격납고 지붕·마스트에 달라붙은 결정 ──
export function infestation(w, K, ctx) {
  const r = w.rand;
  // 감염의 중심(북동). 중심에서 멀수록 드문드문
  const C = [150, -150], RAD = 120;
  let n = 0;
  for (let i = 0; i < 2400 && n < 46; i++) {
    const x = C[0] + (r() * 2 - 1) * RAD, z = C[1] + (r() * 2 - 1) * RAD, d = Math.hypot(x - C[0], z - C[1]);
    if (d > RAD || r() > 1.15 - d / RAD || !onDeck(x, z, 8) || !ctx.free(x, z, 7)) continue;
    crystalCluster(w, x, z, 0.8 + r() * 0.9 * (1 - d / RAD) + 0.3, r);
    ctx.taken.push([x, z, 7]);
    n++;
  }
  // 커다란 결정 첨탑 셋
  for (const [x, z, s] of [[188, -62, 2.2], [76, -206, 1.9], [212, -196, 1.6]]) {
    if (!ctx.free(x, z, 10)) continue;
    w.blob(x, 0.4, z, 7 * s, 2.2 * s, 7 * s, FLESH, { mat: "paint", col: false });
    shard(w, x, 0, z, 2.6 * s, 22 * s, 6, 30, VIO);
    for (let k = 0; k < 7; k++) { const a = (k / 7) * 360 + r() * 20, d = 3.2 * s; shard(w, x + Math.cos(a * DEG) * d, -0.4, z + Math.sin(a * DEG) * d, (0.8 + r() * 0.6) * s, (6 + r() * 9) * s, 22 + r() * 25, -a + 90, k % 2 ? 0x7a3cf0 : VIO2, { mat: k % 3 ? "paint" : "glow" }); }
    w.pool(x, 0.08, z, 24 * s, VIO, 0.35);
    ctx.taken.push([x, z, 10 * s]);
  }
  // 발광 혈관: 감염 중심에서 반응로·격납고·도킹 쪽으로 뻗는 구불구불한 관
  const veins = [[C, [REACTOR[0] + 30, REACTOR[1] - 10]], [C, [40, -175]], [C, [DOCK_X - 14, DOCKS[0] - 6]], [C, [100, -40]], [C, [210, -110]], [C, [120, -222]]];
  for (const [a, b] of veins) vein(w, a, b, r, ctx);
  for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = r() * 60; vein(w, C, [C[0] + Math.cos(a) * (60 + d), C[1] + Math.sin(a) * (60 + d)], r, ctx, 0.5); }
  w.pool(C[0], 0.07, C[1], 150, VIO, 0.14);
  // 격납고 동쪽 동 지붕과 옆벽
  const hx = HANGARS[2];
  for (let k = 0; k < 6; k++) crystalCluster(w, hx + 6 + r() * (HW / 2 - 8), HZ - HD / 2 + 4 + r() * (HD - 8), 0.7 + r() * 0.5, r, { y: HH + 1.6 });
  for (let k = 0; k < 5; k++) { const z = HZ - HD / 2 + 3 + r() * (HD - 6), y = 2 + r() * 14; shard(w, hx + HW / 2 + 0.6, y, z, 0.6 + r() * 0.5, 3 + r() * 4, 60 + r() * 20, -90 + r() * 40 - 20, k % 2 ? VIO : VIO2, { mat: k % 2 ? "paint" : "glow", col: false }); }
  // 감염된 마스트(북동)
  const [mx, mz, mh] = MASTS[2];
  for (let k = 0; k < 9; k++) { const y = 4 + r() * mh * 0.8, a = r() * 360; shard(w, mx + Math.cos(a * DEG) * 3, y, mz + Math.sin(a * DEG) * 3, 0.5 + r() * 0.5, 3 + r() * 4, 50 + r() * 30, -a + 90, k % 2 ? VIO : VIO2, { mat: k % 3 ? "paint" : "glow", col: false }); }
  // 둥근 포자 꼬투리: 빛나는 알 무리
  for (let k = 0; k < 14; k++) {
    const a = r() * 6.28, d = 20 + r() * 90, x = C[0] + Math.cos(a) * d, z = C[1] + Math.sin(a) * d;
    if (!onDeck(x, z, 8) || !ctx.free(x, z, 5)) continue;
    w.blob(x, 0.3, z, 2.2, 1, 2.2, FLESH2, { mat: "paint", col: false });
    for (let j = 0; j < 4; j++) { const b = r() * 6.28, e = r() * 1.6; w.sph(x + Math.cos(b) * e, 1.0 + r() * 0.5, z + Math.sin(b) * e, 0.6 + r() * 0.5, j % 2 ? PINK : VIO2, { mat: "glow", col: false }); }
    w.col.addSphere(V3(x, 0.8, z), 1.8);
  }
}

// 바닥을 기어가는 혈관: a → b 를 잡음으로 굽혀 짧은 관 조각으로 잇는다. 마디마다 빛나는 혹
function vein(w, a, b, r, ctx, k = 1) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(4, Math.round(L / 5)), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, ph = r() * 9;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, wob = Math.sin(t * 9 + ph) * 5 + Math.sin(t * 23 + ph * 2) * 1.6;
    const x = a[0] + (b[0] - a[0]) * t - uz * wob, z = a[1] + (b[1] - a[1]) * t + ux * wob;
    if (!onDeck(x, z, 2)) break;
    const p = [x, 0.25, z];
    if (prev) {
      const rr = (0.75 - t * 0.5) * k + 0.15;
      w.pipe(...prev, ...p, rr, FLESH2, { col: false });
      w.pipe(prev[0], prev[1] + rr * 0.6, prev[2], p[0], p[1] + rr * 0.6, p[2], rr * 0.35, VIO2, { mat: "glow", col: false });
      if (i % 3 === 0) w.sph(x, 0.3, z, rr * 1.8, i % 2 ? PINK : VIO2, { mat: "glow", col: false });
    }
    prev = p;
  }
}

// ── 소행성·잔해: 구역 안 하늘의 바위(충돌 있음, 트랙 근처는 비움) + 바깥 멀리 천천히 도는 소행성대 ──
export function asteroids(w, K, ctx) {
  const r = w.rand;
  let n = 0;
  for (let i = 0; i < 900 && n < 34; i++) {
    const x = (r() * 2 - 1) * 225, z = (r() * 2 - 1) * 225, y = 78 + r() * 95, s = 3 + r() * r() * 10;
    if (Math.hypot(x - REACTOR[0], z - REACTOR[1]) < 30 + s || !ctx.freeAir(x, y, z, s + 10)) continue;
    rock(w, x, y, z, s, r, true);
    if (r() < 0.35) for (let k = 0; k < 3 + ((r() * 3) | 0); k++) { const a = r() * 6.28, b = r() * 1.2; shard(w, x + Math.cos(a) * s * 0.6 * Math.cos(b), y + Math.sin(b) * s * 0.6, z + Math.sin(a) * s * 0.6 * Math.cos(b), s * 0.12, s * (0.5 + r() * 0.5), 30 + r() * 60, r() * 360, k % 2 ? VIO : VIO2, { mat: k % 2 ? "paint" : "glow", col: false }); }
    ctx.air.push([x, y, z, s]);
    n++;
  }
  // 갑판 가장자리 바깥, 구역 안쪽 낮은 고도의 바위와 부서진 잔해
  for (let i = 0; i < 600 && n < 52; i++) {
    const a = r() * 6.28, d = 246 + r() * 20, x = Math.cos(a) * d, z = Math.sin(a) * d, y = -30 + r() * 80, s = 2 + r() * 6;
    if (onDeck(x, z, -6) || Math.abs(x) > 266 || Math.abs(z) > 266 || !ctx.freeAir(x, y, z, s + 8) || (x > 220 && DOCKS.some((dz) => Math.abs(z - dz) < 16))) continue;
    rock(w, x, y, z, s, r, true); ctx.air.push([x, y, z, s]); n++;
  }
  for (let i = 0; i < 18; i++) {
    const x = (r() * 2 - 1) * 220, z = (r() * 2 - 1) * 220, y = 60 + r() * 100;
    if (!ctx.freeAir(x, y, z, 12)) continue;
    debris(w, x, y, z, r);
  }
  // 바깥 소행성대: 하나로 합친 메시가 요새 둘레를 아주 천천히 돈다 (충돌 없음)
  const G = icoG(), parts = [];
  for (let i = 0; i < 150; i++) {
    const a = r() * Math.PI * 2, d = 340 + r() * 700, y = -140 + r() * 320 + Math.sin(a * 3) * 40, s = 4 + r() * r() * 46;
    parts.push([G, M(Math.cos(a) * d, y, Math.sin(a) * d, s * (0.8 + r() * 0.5), s * (0.6 + r() * 0.4), s * (0.8 + r() * 0.5), r() * 360, r() * 360, r() * 360), ROCKC[i % 4]]);
    if (r() < 0.2) parts.push([G, M(Math.cos(a) * d + s, y + s * 0.6, Math.sin(a) * d, s * 0.25, s * 0.9, s * 0.25, r() * 40, r() * 360, 0), VIO]);
  }
  const belt = prop(w, parts, "flat", false);
  belt.frustumCulled = false;
  w.updaters.push((dt) => { belt.rotation.y += dt * 0.003; });
  // 부서진 옛 위성 잔해(원경)
  for (const [x, y, z] of [[-420, 70, -300], [380, 120, -420], [-300, -40, 420]]) {
    w.box(x, y, z, 18, 10, 26, HULL2, { mat: "std:panel", col: false, rx: 24, ry: 40, rz: 15 });
    w.box(x + 14, y + 4, z - 10, 40, 0.8, 14, NAVY, { mat: "paint", col: false, rx: 30, ry: 10, rz: 50 });
    beam(w, [x - 10, y, z], [x - 40, y + 20, z + 12], 1.4, STEEL, { col: false });
  }
}

function rock(w, x, y, z, s, r, col) {
  w.blob(x, y, z, s * (0.85 + r() * 0.4), s * (0.6 + r() * 0.35), s * (0.85 + r() * 0.4), ROCKC[(r() * 4) | 0], { mat: "std:rock", grad: [0.65, 1.1], col: false, ry: r() * 360 });
  if (col) w.col.addSphere(V3(x, y, z), s * 0.62);
  // 작은 파편
  for (let k = 0; k < 2; k++) { const a = r() * 6.28, d = s * (1.6 + r()); w.blob(x + Math.cos(a) * d, y + (r() - 0.5) * s, z + Math.sin(a) * d, s * 0.22, s * 0.18, s * 0.22, ROCKC[k], { mat: "std:rock", col: false }); }
}

// 떠다니는 잔해: 휘어진 판과 부러진 보
function debris(w, x, y, z, r) {
  const ry = r() * 360, rx = r() * 50 - 25, rz = r() * 50 - 25;
  w.box(x, y, z, 6 + r() * 6, 0.5, 4 + r() * 4, r() < 0.5 ? HULL : HULL2, { mat: "std:panel", rx, ry, rz });
  beam(w, [x - 3, y - 1, z], [x + 4 + r() * 3, y + 2 + r() * 3, z + r() * 4 - 2], 0.5, STEEL);
  if (r() < 0.5) beam(w, [x, y, z - 2], [x + r() * 4 - 2, y + 4, z + 3], 0.35, ORG, { col: false });
}

// ── 갑판 소품: 화물 상자, 연료 구, 정비 카트, 바닥 표지 ──
export function props(w, K, ctx) {
  const r = w.rand, cc = [ORG, NAVY, HULL2, 0x2f6fb0, YEL];
  let n = 0;
  for (let i = 0; i < 1600 && n < 70; i++) {
    const x = (r() * 2 - 1) * 225, z = (r() * 2 - 1) * 225;
    if (!onDeck(x, z, 10) || !ctx.free(x, z, 6) || Math.hypot(x - 150, z + 150) < 120) continue;
    const k = r();
    if (k < 0.45) {
      // 화물 상자 더미
      const ry = ((r() * 4) | 0) * 90 + (r() - 0.5) * 8;
      for (let j = 0; j < 2 + ((r() * 3) | 0); j++) w.box(x + (j % 2) * 2.4, (j > 1 ? 1.8 : 0), z + ((j / 2) | 0) * 0.3, 2.2, 1.8, 2.2, cc[(i + j) % 5], { mat: "std:corrug", tile: 2, ry });
    } else if (k < 0.65) {
      // 연료 구
      w.cyl(x, 0, z, 1.8, 1.4, STEEL, { mat: "paint", col: false });
      w.sph(x, 3.4, z, 2.6, i % 2 ? WH : ORG, { mat: "paint" });
      w.box(x, 3.3, z, 5.4, 0.3, 0.3, DARK, { col: false });
    } else if (k < 0.8) {
      // 정비 카트
      const ry = r() * 360;
      w.box(x, 0.4, z, 2.4, 1.2, 4, YEL, { mat: "paint", ry });
      w.box(x, 1.6, z, 2.2, 0.9, 1.6, DARK, { mat: "paint", ry, col: false });
      K.blink.add(x, 2.7, z, AMB, 0.22, i);
    } else {
      // 접지 기둥 + 발광 표지
      w.cyl(x, 0, z, 0.35, 3, STEEL, { mat: "paint" });
      w.box(x, 3, z, 0.9, 0.9, 0.9, i % 2 ? CYA : AMB, { mat: "glow", col: false });
    }
    ctx.taken.push([x, z, 6]);
    n++;
  }
}
