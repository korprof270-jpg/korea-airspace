// 제국 코어 저장고의 세부: 북서 배전 구역(축전기 열·방전탑·도는 레이더), 북동 연병장(주차된 보행 전차), 빈 터를 채우는 병영·변전·격납 블록,
// 가로등과 바닥 도관·환기구·소품, 성 밖 황무지(바위·대전차 장애물·외곽 초소·송전탑 행렬·경계 울타리), 하늘의 순찰 드론 떼와 저장고 안의 잔광
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, frame, ring, octa, ball, merged, mat, lattice, V3, duct, polar, sideFrame, motes, pulses, DEG, hash,
  BLK, BLK2, IRON, STEEL, GUN, RED, RED2, DRED, HAZ, CYA, CYA2, CYA3, TEAL, ICE, SLATE,
  WALL, WALL_H, ROAD_R, ROAD_HW, AVE, RAIL_R, YARD, COOL, MAZE, DEPOT, PRISON, SILO_D,
} from "./vault-kit.js";
import { flatArc } from "./vault-base.js";

const GL = { mat: "glow", col: false }, NC = { mat: "paint", col: false };
const octD = (x, z) => Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * Math.SQRT1_2);
const LAMP = 0x9aefff;

// 가로등: 가는 기둥과 발광 머리, 바닥 빛 웅덩이와 빛줄기 (충돌 없음)
function lamp(w, x, z, h = 8, color = LAMP, k = 0.42, ry = 0) {
  w.box(x, 0, z, 0.28, h, 0.28, 0x2c3138, { mat: "paint", col: false, ao: false });
  w.box(x, 0, z, 0.8, 0.5, 0.8, IRON, NC);
  w.box(x, h, z, 1.5, 0.22, 0.5, color, { mat: "glow", col: false, ry });
  w.pool(x, 0.05, z, h * 1.7, color, k);
  w.shaft(x, h, z, 0.2, h * 0.5, h, color, 0.018);
}

// ── 배전 구역(북서): 축전기 열, 방전탑 셋과 그 사이를 튀는 방전, 천천히 도는 감시 레이더 ──
export function powerField(w, K, ctx) {
  const { free, cap, taken } = ctx, r = w.rand;
  // 레이더 탑
  const [rx, rz] = [-124, -118], RH = 24;
  octa(w, rx, 0, rz, 5.4, 3, IRON, { mat: "std:panel" });
  w.cyl(rx, 3, rz, 2.6, RH - 3, BLK2, { mat: "std:panel", tile: 6, rt: 1.8 });
  w.cyl(rx, RH - 8, rz, 2.4, 0.8, RED, GL);
  w.cyl(rx, RH, rz, 3.2, 1.2, STEEL, NC);
  taken.push([rx, rz, 11]);
  w.pool(rx, 0.05, rz, 16, RED, 0.3);
  const C = new THREE.CylinderGeometry(8.5, 2.2, 2.6, 14, 1), B = new THREE.BoxGeometry(1, 1, 1);
  const dg = merged([[C, M(0, 5, 2.2, 1, 1, 1, 62, 0, 0), 0x2a2f38], [B, M(0, 2, 0, 2.4, 4, 2.4), 0x30353e], [B, M(0, 4.4, -1.4, 5, 1.4, 2.6), 0x23272e], [B, M(0, 7.6, 6.6, 0.3, 0.3, 6, 62, 0, 0), 0x545a64]]);
  const lg = merged([[new THREE.TorusGeometry(8.4, 0.16, 5, 28), M(0, 5.62, 3.36, 1, 1, 1, -28, 0, 0), RED], [B, M(0, 9.1, 9.3, 0.8, 0.8, 0.8), CYA]]);
  const dish = new THREE.Mesh(dg, mat(w, "paint")), dl = new THREE.Mesh(lg, mat(w, "glow"));
  dish.add(dl); dish.position.set(rx, RH + 1.2, rz); w.scene.add(dish); w.disposables.push(dg, lg, C, B);
  w.updaters.push((dt, t) => { dish.rotation.y = t * 0.5; });
  K.blink.add(rx, RH + 15, rz, RED, 0.5, 0);
  // 축전기 열
  const tops = [];
  let n = 0;
  for (let gx = -164; gx <= -66 && n < 26; gx += 8.5) for (let gz = -164; gz <= -74 && n < 26; gz += 8.5) {
    if (octD(gx, gz) > 174 || Math.hypot(gx, gz) < RAIL_R + 12 || !free(gx, gz, 4)) continue;
    const c = cap(gx, gz, 4), tall = (((gx + 164) / 8.5 + (gz + 164) / 8.5) | 0) % 5 === 0;
    if (tall && c > 44 && tops.length < 3 && tops.every((p) => Math.hypot(p[0] - gx, p[1] - gz) > 22)) {
      // 방전탑
      const H = 32;
      w.box(gx, 0, gz, 6.4, 1.4, 6.4, IRON, { mat: "paint" });
      lattice(w, gx, 1.4, gz, 2.2, H - 6, 5, GUN, { t: 0.4, color2: STEEL });
      w.cyl(gx, H - 4.6, gz, 1.2, 4, STEEL, { mat: "metal", col: false, rt: 0.5 });
      for (const y of [H - 9, H - 13]) ring(w, gx, y, gz, 3.4, 0.3, CYA2, { pitch: 90, seg: 18, mat: "glow", col: false });
      ball(w, gx, H + 1, gz, 2, CYA);
      w.pool(gx, 0.05, gz, 18, CYA, 0.4);
      tops.push([gx, gz, H + 1]);
    } else {
      if (c < 13) continue;
      const h = 7 + r() * 4;
      w.box(gx, 0, gz, 5.6, 1, 5.6, IRON, NC);
      w.box(gx, 1, gz, 4.6, h - 1, 4.6, BLK2, { mat: "std:panel", tile: 5 });
      w.box(gx, h * 0.55, gz, 4.72, 0.5, 4.72, n % 3 ? CYA2 : CYA, GL);
      w.cyl(gx, h, gz, 1.5, 1.6, GUN, { mat: "metal", col: false, rt: 1 });
      w.cyl(gx, h + 1.6, gz, 1.1, 0.3, CYA, GL);
      for (const s of [-1, 1]) w.box(gx + s * 2.36, 2, gz, 0.12, h - 4, 2.4, IRON, NC);
    }
    taken.push([gx, gz, 5]); n++;
  }
  // 방전: 탑 꼭대기 사이를 튀는 번개(선분). 드문드문 번쩍인다
  if (tops.length >= 2) {
    const pairs = tops.map((a, i) => [a, tops[(i + 1) % tops.length]]), SEG = 9, pos = new Float32Array(pairs.length * SEG * 6);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(1.2, 3, 3.4) })); lines.frustumCulled = false;
    w.scene.add(lines); w.disposables.push(g, lines.material);
    let acc = 0, seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    w.updaters.push((dt) => {
      acc += dt; if (acc < 0.07) return; acc = 0;
      pairs.forEach(([a, b], k) => {
        const on = rnd() < 0.3; let px = a[0], py = a[2], pz = a[1];
        for (let i = 0; i < SEG; i++) {
          const u = (i + 1) / SEG, j = i === SEG - 1 ? 0 : 3.2, qx = a[0] + (b[0] - a[0]) * u + (rnd() - 0.5) * j, qy = a[2] + (b[2] - a[2]) * u + (rnd() - 0.5) * j + Math.sin(u * Math.PI) * 3, qz = a[1] + (b[1] - a[1]) * u + (rnd() - 0.5) * j;
          const o = (k * SEG + i) * 6;
          if (on) { pos[o] = px; pos[o + 1] = py; pos[o + 2] = pz; pos[o + 3] = qx; pos[o + 4] = qy; pos[o + 5] = qz; } else pos.fill(0, o, o + 6);
          px = qx; py = qy; pz = qz;
        }
      });
      g.attributes.position.needsUpdate = true;
    });
  }
}

// 보행 전차(주차): 낮은 차체와 포탑, 붉은 눈
function walker(w, x, z, ry) {
  const F = frame(w, x, z, ry);
  F.box(0, 0.9, 0, 4, 1.5, 6, BLK2, { mat: "paint" });
  for (const s of [-1, 1]) { F.box(s * 2.4, 0, 0, 0.9, 1.5, 6.6, IRON, NC); F.box(s * 2.4, 1.5, 0, 1.1, 0.3, 5.4, STEEL, NC); }
  F.box(0, 2.4, 0.6, 2.8, 1.1, 3, IRON, NC);
  F.pipe(0, 2.95, -0.6, 0, 3.2, -4.6, 0.22, GUN, { col: false });
  F.box(0, 2.9, -0.92, 1.6, 0.3, 0.1, RED, GL);
  F.box(0, 1.4, -3.02, 2.6, 0.2, 0.08, RED2, GL);
}

// ── 연병장(북동): 붉은 팔각 표식의 넓은 마당과 둘레에 줄지어 선 보행 전차, 바깥쪽 사열 기둥 ──
export function parade(w, K, ctx) {
  const [cx, cz] = [125, -125], { taken } = ctx;
  flatArc(w, cx, 0.035, cz, 0, 44, 0x1a1e25, "std:panel", 0, Math.PI * 2, 8);
  for (const [r0, r1, c] of [[43.4, 44, RED], [35.4, 35.8, DRED], [21, 21.4, RED]]) flatArc(w, cx, 0.05, cz, r0, r1, c, "glow", 0, Math.PI * 2, 8);
  for (let k = 0; k < 8; k++) { const a = k * 45 + 22.5; w.box(cx + Math.cos(a * DEG) * 28.5, 0.05, cz + Math.sin(a * DEG) * 28.5, 13.4, 0.04, 0.5, k % 2 ? RED : 0x6d727b, { mat: k % 2 ? "glow" : "std", col: false, ao: false, ry: -a }); }
  // 제국 문장: 가운데 눈
  flatArc(w, cx, 0.05, cz, 6, 6.6, RED, "glow", 0, Math.PI * 2, 24);
  for (const a of [0, 90]) w.box(cx, 0.05, cz, 20, 0.04, 0.7, DRED, { mat: "glow", col: false, ao: false, ry: a + 45 });
  w.pool(cx, 0.05, cz, 50, RED, 0.3);
  // 보행 전차 열: 마당 남서·남동 가장자리(반경 40)에 마당을 보고 선다
  for (let k = 0; k < 12; k++) {
    const a = (58 + k * 13 + (k > 5 ? 22 : 0)) * DEG, x = cx + Math.cos(a) * 40.5, z = cz + Math.sin(a) * 40.5;
    if (octD(x, z) > 178 || ctx.KEEP.some(([fx, fz, fr]) => fr < 30 && Math.hypot(x - fx, z - fz) < fr + 5)) continue;
    walker(w, x, z, 90 - a / DEG);
  }
  // 사열 기둥: 성벽 쪽 가장자리의 검은 오벨리스크
  for (const a of [-80, -45, -10]) {
    const x = cx + Math.cos(a * DEG) * 52, z = cz + Math.sin(a * DEG) * 52;
    if (octD(x, z) > 178) continue;
    w.box(x, 0, z, 5, 2, 5, IRON, { mat: "paint", ry: -a });
    w.box(x, 2, z, 3.2, 20, 3.2, BLK, { mat: "std:panel", tile: 6, ry: -a });
    w.box(x - Math.cos(a * DEG) * 1.66, 5, z - Math.sin(a * DEG) * 1.66, 0.12, 15, 1.2, RED, { mat: "glow", col: false, ry: -a });
    w.box(x, 22, z, 3.8, 0.8, 3.8, STEEL, { mat: "paint", col: false, ry: -a });
    K.blink.add(x, 23.6, z, RED, 0.5, a);
    taken.push([x, z, 6]);
  }
}

// 빈 터를 채우는 건물 한 채. kind 0 병영(붉은 틈) · 1 변전(청록 띠와 냉각 핀) · 2 격납(넓고 낮은 계단 지붕, 문틈 빛)
function block(w, K, x, z, sx, sz, h, ry, kind) {
  const P = { mat: "std:panel", tile: 8, ry }, F = frame(w, x, z, ry);
  w.box(x, 0, z, sx + 1.6, 1.4, sz + 1.6, IRON, { mat: "paint", ry, col: false });
  if (kind === 0) {
    const h0 = h > 20 ? h * 0.66 : h;
    w.box(x, 0, z, sx, h0, sz, BLK, P);
    if (h0 < h) { w.box(x, h0, z, sx * 0.62, h - h0, sz * 0.62, BLK2, P); w.box(x, h0, z, sx + 0.5, 0.9, sz + 0.5, STEEL, { mat: "paint", ry, col: false }); w.box(x, h - 3.4, z, sx * 0.62 + 0.2, 1, sz * 0.62 + 0.2, RED, { mat: "glow", ry, col: false }); }
    for (const s of [-1, 1]) {
      for (const u of sx > 11 ? [-sx * 0.27, sx * 0.27] : [0]) F.box(u, 3.4, s * (sz / 2 + 0.06), 0.5, h0 - 6.4, 0.12, RED, GL);
      F.box(s * (sx / 2 + 0.06), 3.4, 0, 0.12, h0 - 6.4, 0.5, RED, GL);
    }
    w.box(x, h, z, (h0 < h ? sx * 0.62 : sx) + 0.6, 0.8, (h0 < h ? sz * 0.62 : sz) + 0.6, STEEL, { mat: "paint", ry, col: false });
    w.pipe(x, h + 0.8, z, x, h + 7, z, 0.2, GUN, { col: false });
    K.blink.add(x, h + 7.5, z, RED, 0.4, (x + z) | 0);
  } else if (kind === 1) {
    const h0 = h * 0.68;
    w.box(x, 0, z, sx, h0, sz, BLK2, P);
    w.box(x, h0, z, sx * 0.56, h - h0, sz * 0.56, BLK, P);
    w.box(x, h0 - 2, z, sx + 0.2, 0.7, sz + 0.2, CYA2, { mat: "glow", ry, col: false });
    w.box(x, h0, z, sx + 0.5, 0.7, sz + 0.5, IRON, { mat: "paint", ry, col: false });
    w.box(x, h - 1.6, z, sx * 0.56 + 0.2, 0.5, sz * 0.56 + 0.2, CYA, { mat: "glow", ry, col: false });
    for (let u = -sx / 2 + 1.4; u < sx / 2 - 1; u += 2.2) for (const s of [-1, 1]) F.box(u, h0 + 0.7, s * sz * 0.4, 0.4, 2.6, sz * 0.16, GUN, { mat: "metal", col: false });
    for (const s of [-1, 1]) { F.cyl(s * sx * 0.36, h0 + 0.7, 0, 1, 3.4, STEEL, { mat: "metal", col: false }); F.cyl(s * sx * 0.36, h0 + 4.1, 0, 0.7, 0.3, CYA, GL); }
    K.blink.add(x, h + 1, z, CYA, 0.4, (x - z) | 0);
  } else {
    const hh = Math.min(h, 13);
    w.box(x, 0, z, sx * 1.25, hh * 0.7, sz, BLK2, P);
    w.box(x, hh * 0.7, z, sx * 0.9, hh * 0.3, sz * 0.8, BLK, P);
    w.box(x, hh * 0.7, z, sx * 1.25 + 0.5, 0.6, sz + 0.5, IRON, { mat: "paint", ry, col: false });
    for (const s of [-1, 1]) {
      F.box(0, 0.4, s * (sz / 2 + 0.06), sx * 0.8, hh * 0.52, 0.12, 0x0b0d10, NC);
      F.box(0, hh * 0.52 + 0.5, s * (sz / 2 + 0.1), sx * 0.8, 0.4, 0.12, RED, GL);
      for (const u of [-1, 1]) F.box(u * sx * 0.42, 0.5, s * (sz / 2 + 0.1), 0.25, hh * 0.5, 0.12, HAZ, { mat: "std:hazard", tile: 2, col: false });
    }
    F.box(0, hh, 0, sx * 0.4, 1.4, sz * 0.3, STEEL, NC);
    F.box(0, hh + 0.5, 0, sx * 0.4 + 0.2, 0.3, sz * 0.3 + 0.2, CYA2, GL);
  }
}

// ── 빈 터 채우기: 사일로 고리와 성벽 사이의 빈자리에 병영·변전·격납 블록. 비행선 밑에서는 낮게 ──
export function blocks(w, K, ctx) {
  const { free, cap, taken } = ctx, r = w.rand;
  let n = 0;
  for (let gx = -166; gx <= 166; gx += 15) for (let gz = -166; gz <= 166; gz += 15) {
    const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 6, d = Math.hypot(x, z), o = octD(x, z), sx = 9 + r() * 6, sz = 9 + r() * 5, rad = Math.max(sx, sz) * 0.72;
    if (d < RAIL_R + 14 || o > 170 || r() < 0.2 || !free(x, z, rad + 1.5)) continue;
    const c = cap(x, z, rad + 2);
    if (c < 8) continue;
    const kind = r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2, h = Math.min(c, kind === 2 ? 12 : 12 + r() * r() * 30);
    const ry = -Math.round(Math.atan2(z, x) / DEG / 45) * 45 + 90;
    block(w, K, x, z, sx, sz, h, ry, kind);
    taken.push([x, z, rad + 2]);
    if (r() < 0.5) w.pool(x, 0.05, z, rad * 2.4, kind === 1 ? CYA : RED, 0.22);
    n++;
  }
  w.blockCount = n;
}

// ── 소품과 빛: 가로등, 바닥 도관, 환기구, 안테나, 상자 더미, 포좌 표식, 바닥 이음선 ──
export function props(w, K, ctx) {
  const { free, cap, taken, KEEP } = ctx, r = w.rand;
  const kept = (x, z, m = 0) => KEEP.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr + m);
  // 대로 가로등(성 안은 창백한 청록, 성 밖은 붉은빛)
  for (let i = 0; i < 4; i++) {
    const F = frame(w, 0, 0, 90 - i * 90);
    for (let v = 72; v <= 240; v += 17) {
      if (Math.abs(v - RAIL_R) < 8 || Math.abs(v - WALL) < 13 || (i === 3 && v > 104 && v < 196)) continue;
      const s = (v / 17) & 1 ? 1 : -1, out = v > WALL;
      lamp(w, F.X(s * (AVE + 2.6), v), F.Z(s * (AVE + 2.6), v), 8.5, out ? RED2 : LAMP, out ? 0.36 : 0.42, i * 90);
    }
  }
  // 순환로 가로등
  for (let k = 0; k < 16; k++) { const a = 11.25 + k * 22.5, [x, z] = polar(a, ROAD_R + ROAD_HW + 2); lamp(w, x, z, 7.5, k % 2 ? CYA : LAMP, 0.36, -a); }
  // 성벽 안쪽 순찰로·성 밖 외곽로의 붉은 등
  for (let i = 0; i < 8; i++) for (const u of [-62, -31, 31, 62]) {
    const A = sideFrame(w, i * 45, 191), B = sideFrame(w, i * 45, 229);
    lamp(w, A.X(u, 0), A.Z(u, 0), 7, RED2, 0.34, 90 - i * 45);
    if (Math.abs(u) > 40 || i % 2) lamp(w, B.X(u * 1.1, 0), B.Z(u * 1.1, 0), 7, RED, 0.3, 90 - i * 45);
  }
  // 바닥 이음선: 사일로 고리 밖으로 뻗는 방사 홈과 팔각 띠
  for (let k = 0; k < 16; k++) {
    const a = k * 22.5 + 11.25, c = Math.cos(a * DEG), s = Math.sin(a * DEG);
    for (let d = 100; d < 178; d += 6.5) {
      const x = c * (d + 3), z = s * (d + 3);
      if (octD(x, z) > 176 || kept(x, z, -4) || (x > MAZE.x0 - 4 && Math.abs(z) < MAZE.z1 + 4) || (z < YARD.z1 && Math.abs(x) < YARD.x1)) continue;
      w.box(x, 0.03, z, 0.5, 0.03, 5.2, (d / 6.5) & 3 ? 0x353b45 : CYA3, { mat: (d / 6.5) & 3 ? "std" : "glow", col: false, ao: false, ry: 90 - a });
    }
  }
  for (const rr of [128, 156]) for (let i = 0; i < 8; i++) {
    const F = sideFrame(w, i * 45, rr), L = 2 * rr * Math.tan(22.5 * DEG);
    for (let u = -L / 2 + 4; u < L / 2 - 2; u += 9) {
      const x = F.X(u, 0), z = F.Z(u, 0);
      if (kept(x, z, -4) || Math.abs(x) < AVE + 1 || Math.abs(z) < AVE + 1 || (x > MAZE.x0 - 4 && Math.abs(z) < MAZE.z1 + 4) || (z < YARD.z1 && Math.abs(x) < YARD.x1)) continue;
      F.box(u, 0.03, 0, 5.5, 0.03, 0.4, rr === 128 ? 0x3d434d : 0x343a43, { col: false, ao: false });
    }
  }
  // 냉각수 도관: 냉각탑 → 사일로 고리(바닥을 기는 굵은 관), 냉각탑끼리 잇는 관
  for (const i of [0, 2]) {
    const [x, z, R] = COOL[i], d = Math.hypot(x, z), c = x / d, s = z / d;
    duct(w, [c * (d - R - 0.5), 1.5, s * (d - R - 0.5)], [c * 112, 1.5, s * 112], 1.2, GUN, { glow: CYA2, every: 7 });
    duct(w, [c * 112, 1.5, s * 112], [c * 110, 9, s * 110], 1.2, GUN, { every: 5, col: false });
    w.box(c * 112, 0, s * 112, 3.4, 3.4, 3.4, IRON, { mat: "paint", ry: -Math.atan2(s, c) / DEG });
  }
  { const [ax, az, ar] = COOL[1], [bx, bz, br] = COOL[2], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    duct(w, [ax + ux * (ar + 0.4), 8, az + uz * (ar + 0.4)], [bx - ux * (br + 0.2), 8, bz - uz * (br + 0.2)], 1.3, GUN, { glow: CYA, every: 6 }); }
  // 포좌·착륙 표식(감시탑 진지): 포탑 자리마다 경고 팔각
  for (const [x, z] of ctx.turrets) { flatArc(w, x, 0.05, z, 5.2, 5.7, HAZ, "std", 0, Math.PI * 2, 8); flatArc(w, x, 0.045, z, 0, 5.2, 0x15181d, "std:panel", 0, Math.PI * 2, 8); w.pool(x, 0.05, z, 9, RED, 0.3); }
  // 환기구: 낮은 격자 상자에서 김이 오른다
  let nv = 0;
  for (let i = 0; i < 260 && nv < 9; i++) {
    const a = r() * Math.PI * 2, d = 112 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (octD(x, z) > 172 || !free(x, z, 4) || cap(x, z, 4) < 30) continue;
    w.box(x, 0, z, 4.4, 1.8, 4.4, IRON, { mat: "paint" });
    w.box(x, 1.8, z, 3.6, 0.2, 3.6, 0x0b0d10, NC);
    for (const u of [-1.2, 0, 1.2]) w.box(x + u, 1.86, z, 0.3, 0.2, 3.4, STEEL, NC);
    w.box(x, 1.2, z, 4.5, 0.2, 4.5, CYA3, GL);
    K.steam.add(x, 2.4, z, 2.2, 16, 3);
    taken.push([x, z, 5]); nv++;
  }
  // 안테나 돛대
  let na = 0;
  for (let i = 0; i < 260 && na < 12; i++) {
    const a = r() * Math.PI * 2, d = 114 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 16 + r() * 12;
    if (octD(x, z) > 176 || !free(x, z, 2.5) || cap(x, z, 3) < h + 2) continue;
    w.box(x, 0, z, 2, 1.6, 2, IRON, NC);
    w.pipe(x, 0, z, x, h, z, 0.22, GUN, { col: false });
    for (const f of [0.45, 0.7, 0.9]) w.box(x, h * f, z, 2.6 - f * 1.6, 0.14, 0.14, STEEL, { mat: "paint", col: false, ry: a / DEG });
    K.blink.add(x, h + 0.5, z, na % 3 ? RED : CYA, 0.36, na);
    taken.push([x, z, 3]); na++;
  }
  // 상자·통 더미
  let nc = 0;
  for (let i = 0; i < 500 && nc < 34; i++) {
    const a = r() * Math.PI * 2, d = 100 + r() * 78, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (octD(x, z) > 178 || !free(x, z, 3)) continue;
    const ry = r() * 90, F = frame(w, x, z, ry), hot = r() < 0.4;
    F.box(0, 0, 0, 2.4, 2, 2.4, hot ? 0x242830 : 0x2d3038, { mat: "std:panel", tile: 3 });
    if (hot) F.box(0, 0.8, 1.22, 1.8, 0.4, 0.08, CYA, GL); else F.box(0, 1, 1.22, 1.8, 0.2, 0.08, RED, GL);
    if (r() < 0.6) F.box(2.5, 0, 0.3, 2.2, 1.4, 2.2, 0x2a2e36, { mat: "std:panel", tile: 3, col: false });
    if (r() < 0.5) F.box(0.2, 2, 0, 2, 1.6, 2, 0x30343c, { mat: "std:panel", tile: 3, col: false });
    for (let k = 0, m = (r() * 4) | 0; k < m; k++) F.cyl(-2 - (k % 2) * 1.3, 0, -1 + ((k / 2) | 0) * 1.3, 0.55, 1.5, k % 2 ? GUN : DRED, { mat: "paint", col: false });
    taken.push([x, z, 4]); nc++;
  }
}

// ── 성 밖: 바위와 대전차 장애물, 외곽 초소, 지평선으로 이어지는 송전탑 행렬, 경계 울타리 ──
export function outskirts(w, K, ctx) {
  const { free, KEEP, LINES } = ctx, r = w.rand;
  const clear = (x, z, m) => !KEEP.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr + m) && !LINES.some((L) => L.some((p) => p.y < 30 && Math.hypot(x - p.x, z - p.z) < 8 + m)) && Math.abs(x) > AVE + 4 + m && Math.abs(z) > AVE + 4 + m && Math.abs(octD(x, z) - 222) > 7 + m;
  // 바위
  for (let i = 0; i < 150; i++) {
    const x = (r() * 2 - 1) * 330, z = (r() * 2 - 1) * 330, o = octD(x, z), s = 1.5 + r() * r() * 5;
    if (o < WALL + 9 + s || !clear(x, z, s)) continue;
    w.rock(x, z, s, r() < 0.5 ? 0x1c2026 : 0x23272e);
  }
  // 성문 밖 대전차 장애물과 검문 차단벽
  for (let i = 0; i < 4; i++) {
    const F = frame(w, 0, 0, 90 - i * 90);
    for (const s of [-1, 1]) {
      for (let u = 13; u < 50; u += 6.5) for (const v of [232, 238.5]) {
        const x = F.X(s * (u + (v > 235 ? 3 : 0)), v), z = F.Z(s * (u + (v > 235 ? 3 : 0)), v);
        if (!clear(x, z, 2)) continue;
        for (const [a, b] of [[[-1.5, 0, -1.5], [1.5, 2.6, 1.5]], [[1.5, 0, -1.5], [-1.5, 2.6, 1.5]], [[0, 0.2, 1.8], [0, 2.4, -1.8]]]) beam(w, [x + a[0], a[1], z + a[2]], [x + b[0], b[1], z + b[2]], 0.34, 0x30343b, { col: false });
      }
      F.box(s * 11, 0, 216, 6, 2.2, 1.6, 0x2a2e35, { mat: "std:concrete" });
      F.box(s * 11, 2.2, 216, 6, 0.3, 1.7, HAZ, { mat: "std:hazard", tile: 2, col: false });
      F.box(s * 10.5, 0, 228, 1.4, 5, 1.4, BLK2, { mat: "paint" });
      F.box(s * 10.5, 5, 228, 1.7, 0.6, 1.7, RED, GL);
    }
  }
  // 외곽 초소: 외곽로 꼭짓점마다 낮은 감시 초소
  for (let k = 0; k < 8; k++) {
    const [x, z] = polar(22.5 + k * 45, 252);
    if (Math.max(Math.abs(x), Math.abs(z)) > 236 || !clear(x, z, 6)) continue;
    w.box(x, 0, z, 6, 9, 6, BLK2, { mat: "std:panel", tile: 6, ry: -(22.5 + k * 45) });
    w.box(x, 9, z, 7.4, 3, 7.4, BLK, { mat: "std:panel", tile: 6, ry: -(22.5 + k * 45) });
    w.box(x, 10.2, z, 7.52, 0.8, 7.52, RED, { mat: "glow", ry: -(22.5 + k * 45), col: false });
    w.box(x, 12, z, 8, 0.6, 8, IRON, { mat: "paint", ry: -(22.5 + k * 45), col: false });
    w.pipe(x, 12.6, z, x, 19, z, 0.2, GUN, { col: false });
    K.blink.add(x, 19.5, z, RED, 0.5, k);
    w.pool(x, 0.05, z, 16, RED, 0.34);
  }
  // 송전탑 행렬: 네 대로를 따라 지평선까지. 한 메시로 합친다(성 밖, 충돌 없음)
  const B = new THREE.BoxGeometry(1, 1, 1), body = [], glow = [];
  const leg = (ax, ay, az, bx, by, bz, t, list, c) => { const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); const m = new THREE.Matrix4().compose(new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)), new THREE.Vector3(t, L, t)); list.push([B, m, c]); };
  for (let i = 0; i < 4; i++) {
    const c = Math.cos(i * 90 * DEG), s = Math.sin(i * 90 * DEG), side = i % 2 ? 1 : -1;
    let prev = null;
    for (let k = 0; k < 7; k++) {
      const d = 262 + k * 78 + k * k * 6, off = 26 * side, x = c * d - s * off, z = s * d + c * off, H = 46;
      for (const a of [-1, 1]) for (const b of [-1, 1]) leg(x + a * 5, 0, z + b * 5, x + a * 1.2, H, z + b * 1.2, 0.7, body, BLK2);
      for (const y of [12, 24, 36]) { const q = 5 - (3.8 * y) / H; for (const a of [-1, 1]) { leg(x - q, y, z + a * q, x + q, y, z + a * q, 0.4, body, IRON); leg(x + a * q, y, z - q, x + a * q, y, z + q, 0.4, body, IRON); } }
      leg(x + s * 11, H - 3, z - c * 11, x - s * 11, H - 3, z + c * 11, 0.8, body, IRON);
      glow.push([B, M(x, H + 1.5, z, 1.4, 1.4, 1.4), RED], [B, M(x, H - 8, z, 3, 0.5, 3), CYA2]);
      const tips = [-1, 1].map((a) => [x + a * s * 10.5, H - 3.6, z - a * c * 10.5]);
      if (prev) tips.forEach((p, j) => { const q = prev[j]; for (let u = 0; u < 4; u++) { const f0 = u / 4, f1 = (u + 1) / 4, sag = (f) => -Math.sin(f * Math.PI) * 7; leg(q[0] + (p[0] - q[0]) * f0, q[1] + sag(f0), q[2] + (p[2] - q[2]) * f0, q[0] + (p[0] - q[0]) * f1, q[1] + sag(f1), q[2] + (p[2] - q[2]) * f1, 0.22, body, 0x0c0e12); } });
      prev = tips;
    }
  }
  const bm = new THREE.Mesh(merged(body), mat(w, "paint")), gm = new THREE.Mesh(merged(glow), mat(w, "glow"));
  for (const m of [bm, gm]) { m.frustumCulled = false; w.scene.add(m); w.disposables.push(m.geometry); }
  // 경계 울타리: 비행 구역 가장자리의 붉은 표지 기둥
  for (let i = 0; i < 4; i++) {
    const F = frame(w, 0, 0, 90 - i * 90);
    for (let u = -234; u <= 234; u += 18) {
      if (Math.abs(u) < 14) continue;
      const x = F.X(u, 244), z = F.Z(u, 244);
      w.box(x, 0, z, 0.6, 5, 0.6, 0x23272e, { mat: "paint", col: false });
      w.box(x, 5, z, 0.9, 0.5, 0.9, RED, GL);
    }
  }
}

// ── 순찰 드론 떼: 기지 상공을 저마다 도는 작은 제국 드론(붉은 눈). 인스턴스 메시 둘. 저장고 안에는 떠오르는 잔광 ──
export function drones(w, K) {
  const B = new THREE.BoxGeometry(1, 1, 1), N = 18;
  const body = merged([[B, M(0, 0, 0, 1.6, 0.6, 2.4), 0x23272e], [B, M(0, 0.1, 0.2, 5.4, 0.16, 0.7), 0x30353e], [B, M(2.7, 0.2, 0.2, 0.5, 0.7, 1.6), 0x1d2026], [B, M(-2.7, 0.2, 0.2, 0.5, 0.7, 1.6), 0x1d2026], [B, M(0, 0.5, 0.9, 0.3, 0.9, 1), 0x1d2026]]);
  const eye = merged([[B, M(0, -0.05, -1.22, 0.9, 0.3, 0.1), RED], [B, M(2.7, 0.2, 1.02, 0.3, 0.3, 0.1), RED2], [B, M(-2.7, 0.2, 1.02, 0.3, 0.3, 0.1), RED2]]);
  const ib = new THREE.InstancedMesh(body, mat(w, "paint"), N), ie = new THREE.InstancedMesh(eye, mat(w, "glow"), N);
  for (const im of [ib, ie]) { im.frustumCulled = false; w.scene.add(im); }
  w.disposables.push(body, eye, B);
  const D = Array.from({ length: N }, (_, i) => ({ R: 128 + hash(i, 3) * 90, y: 78 + hash(i, 5) * 60, sp: (0.03 + hash(i, 7) * 0.05) * (i % 2 ? 1 : -1), ph: hash(i, 9) * 6.283, wob: 4 + hash(i, 11) * 8 }));
  const tm = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1.5, 1.5, 1.5);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const d = D[i], a = d.ph + t * d.sp, R = d.R + Math.sin(t * 0.13 + i) * 10;
      p.set(Math.cos(a) * R, d.y + Math.sin(t * 0.3 + i * 1.7) * d.wob, Math.sin(a) * R);
      e.set(0, -a + (d.sp > 0 ? Math.PI : 0), Math.sin(t * 0.5 + i) * 0.15); q.setFromEuler(e);
      tm.compose(p, q, s); ib.setMatrixAt(i, tm); ie.setMatrixAt(i, tm);
    }
    ib.instanceMatrix.needsUpdate = true; ie.instanceMatrix.needsUpdate = true;
  });
  motes(w, 0, 0, 30, 104, 240, 0x7af2ff, 0.5);
}
