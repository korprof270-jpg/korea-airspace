// 제국 코어 저장고의 구역들: 북쪽 포로 감시탑과 요새 마당, 서쪽 냉각탑 셋(속이 빈 쌍곡면 껍질, 꼭대기로 뛰어들어 밑 아치로 나온다),
// 동쪽 배관 미로(두 층 배관과 받침 기둥·저장조·배기탑), 저장고를 도는 화물 모노레일과 코어 화차, 남동 착륙장과 수송정, 남서 코어 적치장과 갠트리 크레인
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, frame, ring, octa, ball, merged, mat, V3, shell, band, duct, polar, DEG, hash,
  BLK, BLK2, IRON, STEEL, GUN, RED, RED2, DRED, HAZ, CYA, CYA2, CYA3, TEAL, ICE, NAVY, SLATE,
  WALL, WALL_H, SILO_D, SILO_R, RAIL_R, RAIL_Y, PRISON, YARD, COOL, MAZE, PADS, DEPOT,
} from "./vault-kit.js";
import { flatArc } from "./vault-base.js";

const P8 = { mat: "std:panel", tile: 8 }, GL = { mat: "glow", col: false }, NC = { mat: "paint", col: false };

// ── 포로 감시탑: 대로를 걸터앉은 네 다리 밑동 → 팔각 감방 몸통 → 가늘어지는 검은 첨탑. 감시 고리 셋과 탐조등, 꼭대기의 붉은 눈 ──
export function prison(w, K) {
  const [px, pz] = PRISON;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = px + sx * 12.5, z = pz + sz * 12.5;
    w.box(x, 0, z, 9, 22, 9, BLK2, P8);
    w.box(x, 0, z, 10.4, 3, 10.4, IRON, NC);
    w.box(x + sx * 4.56, 5, z, 0.14, 14, 0.7, RED, GL); w.box(x, 5, z + sz * 4.56, 0.7, 14, 0.14, RED, GL);
    w.box(x - sx * 4.3, 0, z - sz * 4.3, 1.2, 16, 1.2, HAZ, { mat: "std:hazard", tile: 2, col: false });
  }
  for (const [dx, dz, sx, sz] of [[0, 12.5, 16, 9], [0, -12.5, 16, 9], [12.5, 0, 9, 16], [-12.5, 0, 9, 16]]) {
    w.box(px + dx, 16, pz + dz, sx, 6, sz, BLK2, P8);
    w.box(px + dx * 1.37, 17.6, pz + dz * 1.37, dx ? 0.14 : 11, 1, dz ? 0.14 : 11, RED, GL);
  }
  w.box(px, 22, pz, 36, 3, 36, IRON, P8);
  w.box(px, 21.7, pz, 15.6, 0.3, 15.6, RED2, GL);
  octa(w, px, 25, pz, 16.5, 15, BLK, { mat: "std:panel" });
  octa(w, px, 40, pz, 18, 1.8, IRON, { col: false });
  octa(w, px, 36.6, pz, 16.62, 0.8, RED, { mat: "glow", col: false });
  // 감방 창: 층마다 창백한 틈
  for (const y of [28, 31.4]) band(w, px, pz, 15.3, y, 0.7, 0.2, ICE, { n: 8, mat: "glow", over: -4.5 });
  // 첨탑 몸통(세 마디)과 날개 넷
  const SEG = [[41.8, 11, 74, 9], [74, 9, 106, 7], [106, 7, 130, 4.4]];
  for (const [y0, r0, y1, r1] of SEG) w.cyl(px, y0, pz, r0, y1 - y0, BLK, { mat: "std:panel", tile: 8, rt: r1 });
  for (const y of [74, 106]) w.cyl(px, y - 0.8, pz, (y === 74 ? 9 : 7) + 0.7, 1.8, IRON, NC);
  for (let k = 0; k < 8; k++) {
    const a = k * 45 * DEG, c = Math.cos(a), s = Math.sin(a);
    if (k % 2) { beam(w, [px + c * 15, 41, pz + s * 15], [px + c * 7.6, 112, pz + s * 7.6], 1.3, BLK2, { tw: 3.2, col: false }); beam(w, [px + c * 16.4, 43, pz + s * 16.4], [px + c * 8.9, 111, pz + s * 8.9], 0.3, RED, GL); }
    else {
      beam(w, [px + c * 11.2, 45, pz + s * 11.2], [px + c * 9.25, 72, pz + s * 9.25], 0.4, RED, GL);
      beam(w, [px + c * 9.2, 78, pz + s * 9.2], [px + c * 7.25, 104, pz + s * 7.25], 0.36, RED, GL);
      beam(w, [px + c * 7.15, 109, pz + s * 7.15], [px + c * 4.7, 128, pz + s * 4.7], 0.3, RED2, GL);
    }
  }
  // 감시 고리: 버팀대 넷에 매달린 고리와 붉은 띠, 고리마다 탐조등
  [[60, 21, 9.9], [93, 16, 7.9], [119, 10.5, 5.6]].forEach(([y, R, r], i) => {
    ring(w, px, y, pz, R, 0.9, IRON, { pitch: 90, seg: 40 });
    ring(w, px, y + 1.05, pz, R, 0.22, RED, { pitch: 90, seg: 40, mat: "glow", col: false });
    ring(w, px, y - 1.0, pz, R - 0.8, 0.16, i ? RED2 : CYA2, { pitch: 90, seg: 40, mat: "glow", col: false });
    for (let k = 0; k < 4; k++) {
      const a = (k * 90 + 45 + i * 45) * DEG, c = Math.cos(a), s = Math.sin(a);
      beam(w, [px + c * r, y - 5, pz + s * r], [px + c * R, y, pz + s * R], 0.7, STEEL, { col: false });
      beam(w, [px + c * r, y + 4, pz + s * r], [px + c * R, y, pz + s * R], 0.4, GUN, { col: false });
      w.box(px + c * R, y - 2.2, pz + s * R, 2, 2, 2, BLK2, NC);
      if (i < 2 && k % 2 === i) K.lights.push([px + c * R, y - 2.4, pz + s * R, k * 1.9 + i, 0.2 + i * 0.05, 42 - i * 8]);
      else K.blink.add(px + c * R, y - 2.6, pz + s * R, RED, 0.5, k + i);
    }
  });
  // 꼭대기: 붉은 눈과 바늘
  w.cyl(px, 130, pz, 5.2, 1.4, IRON, NC);
  ball(w, px, 135.5, pz, 3.6, RED);
  ring(w, px, 135.5, pz, 5.2, 0.3, IRON, { pitch: 90, seg: 24, col: false });
  ring(w, px, 135.5, pz, 5.2, 0.3, IRON, { seg: 24, col: false });
  w.col.addSphere(V3(px, 135.5, pz), 4.2);
  w.pipe(px, 139, pz, px, 158, pz, 0.35, GUN, { col: false });
  K.blink.add(px, 158.6, pz, RED, 0.8, 0);
  w.pool(px, 0.05, pz, 46, RED, 0.42);
  w.shaft(px, 135, pz, 1, 15, 60, RED, 0.05);
  w.gap("감시탑 밑동 관통", px, 8.5, pz, 0, 15, 15, 400);
  w.gap("감시탑 밑동 관통", px, 8.5, pz, 90, 15, 15, 400);

  // ── 요새 마당: 낮은 방벽과 모서리 보루, 대로 쪽 정문, 감방동 ──
  const { x0, x1, z0, z1 } = YARD, WH = 9, zc = (z0 + z1) / 2, L = z1 - z0;
  for (const x of [x0, x1]) {
    const s = Math.sign(x);
    w.box(x, 0, zc, 2.6, WH, L, BLK, P8);
    w.box(x, WH, zc, 3.2, 0.5, L, IRON, NC);
    w.box(x - s * 1.36, WH - 2.2, zc, 0.12, 0.5, L - 8, RED, GL);
    for (let z = z0 + 10; z < z1 - 6; z += 14) { w.box(x + s * 2, 0, z, 2.4, 6, 3, BLK2, { ...P8, rz: s * 14, col: false }); w.box(x, WH + 0.5, z, 3.2, 1.1, 2.2, BLK2, NC); }
    // 모서리 보루
    octa(w, x, 0, z1, 6.8, 15, BLK2, { mat: "std:panel" });
    octa(w, x, 15, z1, 7.6, 1.4, IRON, { col: false });
    octa(w, x, 11.4, z1, 6.94, 0.8, RED, { mat: "glow", col: false });
    w.box(x, 16.4, z1, 4, 2.4, 4, STEEL, NC);
    w.pipe(x, 18.8, z1, x, 26, z1, 0.25, GUN, { col: false });
    K.blink.add(x, 26.5, z1, RED, 0.5, s > 0 ? 1 : 0);
    w.pool(x - s * 8, 0.05, z1 - 8, 16, RED, 0.3);
  }
  for (const s of [-1, 1]) {
    const xa = s * 12, xb = s * (x1 - 3), xm = (xa + xb) / 2, len = Math.abs(xb - xa);
    w.box(xm, 0, z1, len, WH, 2.6, BLK, P8);
    w.box(xm, WH, z1, len, 0.5, 3.2, IRON, NC);
    w.box(xm, WH - 2.2, z1 + 1.36, len - 6, 0.5, 0.12, RED, GL);
    for (let x = 20; x < x1 - 10; x += 12) w.box(s * x, WH + 0.5, z1, 2.2, 1.1, 3.2, BLK2, NC);
    // 정문 문기둥
    w.box(s * 12, 0, z1, 5, 19, 5, BLK2, P8);
    w.box(s * 12, 19, z1, 5.8, 1.2, 5.8, IRON, NC);
    w.box(s * 9.44, 2, z1, 0.14, 12, 1, RED, GL);
    w.box(s * 12, 4, z1 + 2.56, 1, 13, 0.14, RED, GL);
    K.blink.add(s * 12, 20.9, z1, RED, 0.5, s > 0 ? 1 : 0);
  }
  w.box(0, 15.4, z1, 19, 2.6, 3.4, IRON, P8);
  w.box(0, 14.9, z1, 17, 0.5, 3.6, HAZ, { mat: "std:hazard", tile: 2, col: false });
  w.box(0, 16.2, z1 + 1.76, 9, 0.9, 0.14, RED, GL);
  w.gap("감시탑 진지 정문", 0, 7.5, z1, 0, 18, 14, 300);
  // 감방동 셋: 낮은 벙커, 창백한 창살 틈
  for (const [bx, bz, sx, sz] of [[-30, -144, 28, 12], [-52, -187, 14, 12], [52, -187, 14, 12]]) {
    w.box(bx, 0, bz, sx, 8, sz, BLK2, P8);
    w.box(bx, 8, bz, sx + 1, 0.8, sz + 1, IRON, NC);
    w.box(bx, 8.8, bz, sx * 0.5, 1.6, sz * 0.5, STEEL, NC);
    w.box(bx, 8.75, bz, sx * 0.5 + 0.3, 0.3, sz * 0.5 + 0.3, RED, GL);
    for (let u = -sx / 2 + 2.5; u <= sx / 2 - 2.4; u += 3.6) for (const s of [-1, 1]) w.box(bx + u, 3.4, bz + s * (sz / 2 + 0.06), 1.4, 2.2, 0.12, ICE, GL);
    w.box(bx, 0, bz, sx + 1.4, 1, sz + 1.4, IRON, NC);
  }
  // 지휘소 자리와 포좌 표식, 호송정 착륙 표식
  flatArc(w, 30, 0.05, -140, 17, 17.5, RED, "glow", 0, Math.PI * 2, 8);
  flatArc(w, 30, 0.04, -140, 0, 17, 0x1a1d23, "std:panel", 0, Math.PI * 2, 8);
  flatArc(w, 34, 0.05, -172, 9, 9.4, HAZ, "std", 0, Math.PI * 2, 24);
  w.box(34, 0.05, -172, 6, 0.04, 0.8, HAZ, { col: false, ao: false }); w.box(34, 0.05, -172, 0.8, 0.04, 6, HAZ, { col: false, ao: false });
}

// ── 냉각탑 셋: 쌍곡면 껍질(12각), 밑에는 하나 걸러 아치가 뚫려 있고 안에는 냉각수 못. 꼭대기에서 증기가 피어오른다 ──
export function cooling(w, K) {
  COOL.forEach(([x, z, R, H, ph], i) => {
    const n = 12, da = (Math.PI * 2) / n, p0 = ph * DEG, th = 2.2;
    const tiers = [[0, R], [12, R * 0.9], [H * 0.42, R * 0.67], [H * 0.68, R * 0.58], [H * 0.88, R * 0.62], [H, R * 0.69]];
    shell(w, x, z, tiers, { n, phase: p0, thick: th, color: 0x3a424d, inner: 0x12303a, mat: "std:concrete", skip: (k, t) => t === 0 && k % 2 === 0 });
    const kv = 1 / Math.cos(da / 2);
    for (let k = 0; k < n; k++) {
      const a = p0 + (k + 0.5) * da, c = Math.cos(a), s = Math.sin(a);
      // 모서리 갈비뼈
      for (let t = 0; t < tiers.length - 1; t++) beam(w, [x + c * tiers[t][1] * kv, tiers[t][0], z + s * tiers[t][1] * kv], [x + c * tiers[t + 1][1] * kv, tiers[t + 1][0], z + s * tiers[t + 1][1] * kv], 1, IRON, { col: false });
      w.box(x + c * R * kv, 0, z + s * R * kv, 2.6, 2.4, 2.6, IRON, { mat: "paint", ry: -a / DEG, col: false });
      const am = p0 + k * da, F = frame(w, x + Math.cos(am) * R * 0.95, z + Math.sin(am) * R * 0.95, 90 - am / DEG), wid = 2 * R * 0.9 * Math.tan(da / 2);
      if (k % 2 === 0) {
        // 아치: 경고 띠와 문설주 빛
        F.box(0, 11.4, 0.9, wid, 0.8, 0.5, HAZ, { mat: "std:hazard", tile: 2, col: false, rx: 5 });
        for (const u of [-1, 1]) F.box(u * (wid / 2 - 0.2), 0.6, 0.4, 0.3, 10, 0.3, CYA2, GL);
        if (k % 4 === 0) F.gap("냉각탑 밑 아치", 0, 6, -1, 0, wid - 1.5, 10.5, 350);
      } else if (i < 2) F.box(0, 2, 0.5, 0.5, 8, 0.2, RED, GL);
      // 판마다 허리까지 오르는 청록 점검등 줄
      if (k % 2) { const am2 = p0 + k * da, cc = Math.cos(am2), ss = Math.sin(am2); beam(w, [x + cc * (R * 0.9 + 0.3), 13, z + ss * (R * 0.9 + 0.3)], [x + cc * (R * 0.67 + 0.5), H * 0.42 - 2, z + ss * (R * 0.67 + 0.5)], 0.3, CYA2, { mat: "glow", col: false }); }
    }
    band(w, x, z, R * 0.67 + 0.35, H * 0.42 - 0.6, 1.3, 0.6, IRON, { n, phase: p0 });
    band(w, x, z, R * 0.58 + 0.35, H * 0.68 - 0.6, 1.3, 0.6, IRON, { n, phase: p0 });
    band(w, x, z, R * 0.58 + 0.42, H * 0.68 + 0.9, 0.5, 0.2, RED, { n, phase: p0, mat: "glow" });
    band(w, x, z, R * 0.69 + 0.5, H - 1.5, 1.5, 0.9, STEEL, { n, phase: p0 });
    band(w, x, z, R * 0.69 + 0.56, H - 2.6, 0.6, 0.2, RED, { n, phase: p0, mat: "glow" });
    band(w, x, z, R * 0.62 - th, H * 0.88, 0.5, 0.2, CYA, { n, phase: p0, mat: "glow" });
    // 안: 냉각수 못과 분무 고리
    flatArc(w, x, 0.5, z, 0, R * 0.78, TEAL, "glow", 0, Math.PI * 2, 24);
    flatArc(w, x, 0.52, z, R * 0.78, R * 0.82, CYA2, "glow", 0, Math.PI * 2, 24);
    w.cyl(x, 0, z, R * 0.84, 0.5, IRON, { mat: "paint", col: false });
    ring(w, x, 15, z, R * 0.62, 0.45, GUN, { pitch: 90, seg: 24, col: false });
    ring(w, x, 15.5, z, R * 0.62, 0.14, CYA, { pitch: 90, seg: 24, mat: "glow", col: false });
    w.pool(x, 0.6, z, R * 1.2, CYA, 0.5);
    w.pool(x, 0.05, z, R * 2.3, CYA2, 0.22);
    // 둘레 바닥: 어두운 물받이 띠와 청록 테
    flatArc(w, x, 0.04, z, R + 1, R + 6, 0x161a20, "std:panel", 0, Math.PI * 2, 24);
    flatArc(w, x, 0.06, z, R + 6, R + 6.5, CYA3, "glow", 0, Math.PI * 2, 24);
    K.steam.add(x, H - 4, z, R * 0.46, 78, 6);
    K.beams.add(x, 1, z, R * 0.5, H * 1.5, CYA2, 0.1, R * 0.36);
    for (let k = 0; k < 4; k++) K.blink.add(x + Math.cos(p0 + k * 1.571) * (R * 0.69 + 1), H + 0.6, z + Math.sin(p0 + k * 1.571) * (R * 0.69 + 1), RED, 0.6, k + i);
    w.gap("냉각탑 강하", x, H - 2, z, 0, R * 1.1, R * 1.1, 700, 90);
  });
}

// ── 배관 미로(동쪽): 남북 배관 셋(아래층)과 동서 배관 넷(위층), 교차점마다 받침 기둥과 수직 연결관, 저장조와 배기탑 ──
export function maze(w, K) {
  const { x0, x1, z0, z1, NS, EW, yNS, yEW } = MAZE;
  for (const x of NS) {
    duct(w, [x, yNS, z0], [x, yNS, z1], 2, GUN, { glow: CYA2, every: 12.3 });
    for (const z of [z0, z1]) {
      w.pipe(x, 0, z, x, yNS, z, 2, GUN, { mat: "metal" });
      w.sph(x, yNS, z, 2.3, IRON, { mat: "paint", col: false });
      w.cyl(x, 0, z, 3.4, 1.4, IRON, NC);
      ring(w, x, 6, z, 2.3, 0.4, HAZ, { pitch: 90, seg: 14, col: false });
    }
  }
  for (const z of EW) {
    duct(w, [x0, yEW, z], [x1, yEW, z], 2, IRON, { glow: CYA, joint: STEEL, every: 12 });
    w.pipe(x1, 0, z, x1, yEW, z, 2, IRON, { mat: "metal" });
    w.sph(x1, yEW, z, 2.3, STEEL, { mat: "paint", col: false });
    w.cyl(x1, 0, z, 3.4, 1.4, IRON, NC);
    if (Math.abs(z) > 40) { w.pipe(x0, 0, z, x0, yEW, z, 2, IRON, { mat: "metal" }); w.sph(x0, yEW, z, 2.3, STEEL, { mat: "paint", col: false }); w.cyl(x0, 0, z, 3.4, 1.4, IRON, NC); }
    else {
      // 안쪽 두 줄은 모노레일 위를 넘어 사일로로 이어진다
      const s = Math.sign(z), sx = SILO_D * Math.cos(22.5 * DEG), sz = s * SILO_D * Math.sin(22.5 * DEG);
      duct(w, [x0, yEW, z], [sx + SILO_R - 0.5, 36, sz], 1.7, IRON, { glow: CYA, joint: STEEL, every: 8 });
      ring(w, sx + SILO_R + 0.2, 36, sz, 2.6, 0.5, STEEL, { yaw: 90, seg: 16, col: false });
    }
  }
  for (const x of NS) for (const z of EW) {
    w.box(x, 0, z, 2.6, yNS - 1.8, 2.6, BLK2, { mat: "paint" });
    w.box(x, 0, z, 4.4, 1.2, 4.4, IRON, NC);
    w.box(x, yNS - 3, z, 5.4, 1.2, 3.4, IRON, NC);
    w.pipe(x, yNS + 1.8, z, x, yEW - 1.8, z, 1.1, STEEL, { mat: "metal" });
    ring(w, x, (yNS + yEW) / 2, z, 1.9, 0.3, (x + z) % 3 ? HAZ : RED, { pitch: 90, seg: 14, mat: (x + z) % 3 ? "paint" : "glow", col: false });
    w.box(x + 1.36, 4, z, 0.12, 9, 0.5, RED, GL);
    K.blink.add(x, yEW + 2.6, z, (x + z) % 2 ? CYA : RED, 0.4, x + z);
  }
  // 저장조(배관 사이 칸)와 배기탑
  for (const [tx, tz, r, h] of [[163, 45, 8.5, 15], [163, -45, 8.5, 15], [137, -45, 7, 22], [163, -15, 6, 12], [163, 15, 6, 12]]) {
    w.cyl(tx, 0, tz, r, h, BLK2, { mat: "std:panel", tile: 6 });
    w.cyl(tx, h, tz, r * 0.7, 1.4, IRON, { mat: "paint", col: false, rt: r * 0.4 });
    w.cyl(tx, h * 0.55, tz, r + 0.12, 0.7, CYA2, GL);
    w.cyl(tx, 0, tz, r + 0.6, 1.2, IRON, NC);
    w.pipe(tx, h + 1, tz, tx, yEW, tz, 0.7, STEEL, { col: false });
    w.pool(tx, 0.05, tz, r * 2.2, CYA, 0.25);
  }
  for (const [tx, tz, h] of [[190, -45, 46], [190, 45, 52], [190, 16, 38]]) {
    w.cyl(tx, 0, tz, 3.6, 5, IRON, { mat: "paint" });
    w.cyl(tx, 5, tz, 2.4, h - 5, BLK, { mat: "std:panel", tile: 6, rt: 1.8 });
    w.cyl(tx, h - 6, tz, 2.3, 1, RED, GL);
    w.cyl(tx, h, tz, 2.2, 1.2, STEEL, NC);
    K.blink.add(tx, h + 2, tz, RED, 0.5, tz > 0 ? 1 : 0);
    K.steam.add(tx, h + 1, tz, 3.4, 34, 3);
  }
  // 미로 바닥: 경고 테두리와 칸 번호 띠
  for (const z of [z0 - 6, z1 + 6]) w.box((x0 + x1) / 2, 0.04, z, x1 - x0 + 8, 0.03, 1, HAZ, { mat: "std:hazard", tile: 2, col: false, ao: false });
  for (const z of [-45, 45]) w.box(x0 - 5, 0.04, z, 1, 0.03, 50, HAZ, { mat: "std:hazard", tile: 2, col: false, ao: false });
  for (const x of [137, 163]) for (const z of [-60, -30, 30, 60]) w.box(x, 0.04, z + (z > 0 ? -15 : 15), 9, 0.03, 0.5, CYA3, { mat: "glow", col: false, ao: false });
  w.gap("배관 미로 통과", (NS[0] + NS[1]) / 2, 10, 45, 0, 22, 18, 300);
  w.gap("배관 미로 통과", (NS[1] + NS[2]) / 2, 9.5, 0, 0, 22, 17, 300);
  w.gap("배관 미로 대로", NS[1], 9, 0, 90, 15, 16, 250);
  w.gap("배관 층 사이", NS[1], (yNS + yEW) / 2, 0, 0, 20, 4.6, 600);
}

// ── 화물 모노레일: 저장고와 사일로를 한 바퀴 도는 고가 레일. 코어를 실은 화차 열차 셋이 돈다 ──
export function rail(w, K, blocked = () => false) {
  const N = 72, top = RAIL_Y, pt = (i, r = RAIL_R, y = top - 0.9) => { const a = (i / N) * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  for (let i = 0; i < N; i++) {
    beam(w, pt(i), pt(i + 1), 1.8, IRON);
    beam(w, pt(i, RAIL_R, top + 0.12), pt(i + 1, RAIL_R, top + 0.12), 0.5, STEEL, { col: false });
    beam(w, pt(i, RAIL_R - 1.0, top - 1.2), pt(i + 1, RAIL_R - 1.0, top - 1.2), 0.22, i % 2 ? RED : RED2, { mat: "glow", col: false });
  }
  for (let k = 0; k < 24; k++) {
    const ad = 7.5 + k * 15, [x, z] = polar(ad, RAIL_R);
    if (blocked(x, z)) continue;
    w.box(x, 0, z, 2, top - 1.8, 2, BLK2, { mat: "paint", ry: -ad });
    w.box(x, 0, z, 3.6, 1.2, 3.6, IRON, { mat: "paint", ry: -ad, col: false });
    w.box(x, top - 3.4, z, 5, 1.6, 2.4, IRON, { mat: "paint", ry: -ad, col: false });
    w.box(x, 6, z, 2.2, 0.5, 2.2, k % 2 ? RED : HAZ, { mat: k % 2 ? "glow" : "paint", ry: -ad, col: false });
    if (k % 3 === 0) w.pool(x, 0.05, z, 9, RED, 0.3);
  }
  // 화차: 검은 받침차 + 청록 코어 통. 인스턴스 메시 둘(몸체·발광)
  const B = new THREE.BoxGeometry(1, 1, 1), C = new THREE.CylinderGeometry(1, 1, 1, 10);
  const body = merged([
    [B, M(0, 1.0, 0, 3, 0.9, 7.6), 0x30353e], [B, M(0, 0.2, 0, 1.2, 1, 6.6), 0x1d2026], [B, M(0, 1.9, 3.5, 3, 1.6, 0.4), 0x262a31], [B, M(0, 1.9, -3.5, 3, 1.6, 0.4), 0x262a31],
    [B, M(1.45, 1.7, 0, 0.14, 0.5, 7.2), 0x3b4049], [B, M(-1.45, 1.7, 0, 0.14, 0.5, 7.2), 0x3b4049], [C, M(0, 3.72, 0, 1.25, 0.3, 1.25), 0x545a64], [C, M(0, 1.6, 0, 1.3, 0.3, 1.3), 0x545a64],
  ]);
  const glow = merged([[C, M(0, 2.65, 0, 1.05, 1.9, 1.05), CYA], [B, M(0, 0.9, 3.84, 2.2, 0.3, 0.1), RED], [B, M(0, 0.9, -3.84, 2.2, 0.3, 0.1), RED], [C, M(0, 2.65, 2.3, 0.5, 1.5, 0.5), ICE], [C, M(0, 2.65, -2.3, 0.5, 1.5, 0.5), ICE]]);
  const TR = 3, PER = 3, n = TR * PER;
  const ib = new THREE.InstancedMesh(body, mat(w, "paint"), n), ig = new THREE.InstancedMesh(glow, mat(w, "glow"), n);
  for (const im of [ib, ig]) { im.frustumCulled = false; w.scene.add(im); }
  w.disposables.push(body, glow, B, C);
  const tm = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = new THREE.Vector3(1, 1, 1);
  const place = (t) => {
    for (let i = 0; i < n; i++) {
      const a = t * 0.075 + ((i / PER) | 0) * (Math.PI * 2 / TR) + (i % PER) * 0.083;
      p.set(Math.cos(a) * RAIL_R, top + 0.3, Math.sin(a) * RAIL_R); e.set(0, -a, 0); q.setFromEuler(e);
      tm.compose(p, q, s1); ib.setMatrixAt(i, tm); ig.setMatrixAt(i, tm);
    }
    ib.instanceMatrix.needsUpdate = true; ig.instanceMatrix.needsUpdate = true;
  };
  place(0);
  for (let i = 0; i < n; i++) w.rider([ib, i], [[0, 2, 0, 1.6, 2, 3.9]], "mover");
  w.updaters.push((dt, t) => place(t));
  // 적재 승강장 둘(남남서 적치장 쪽·동북동 쪽): 레일 바깥에 붙은 단
  for (const ad of [120, 330]) {
    const [x, z] = polar(ad, RAIL_R + 6.2), F = frame(w, x, z, 90 - ad);
    F.box(0, 0, 0, 16, top - 1.2, 7, BLK2, P8);
    F.box(0, top - 1.2, 0, 17, 0.6, 8, IRON, NC);
    F.box(0, top - 3, 3.56, 12, 0.6, 0.12, RED, GL);
    for (const u of [-7, 7]) { F.box(u, top - 0.6, 2.6, 0.5, 7, 0.5, STEEL, NC); F.box(u, top - 0.6, -2.4, 0.5, 7, 0.5, STEEL, NC); }
    F.box(0, top + 6.4, 0, 17, 0.5, 8, BLK2, { mat: "paint" });
    F.box(0, top + 6.1, 0, 14, 0.2, 0.6, CYA, GL);
    for (const u of [-4, 0, 4]) { F.cyl(u, top - 0.6, 1.6, 1, 2.2, CYA, GL); F.cyl(u, top + 1.6, 1.6, 1.1, 0.3, GUN, NC); }
    w.pool(F.X(0, 8), 0.05, F.Z(0, 8), 13, CYA, 0.3);
  }
}

// 제국 수송정(주기 상태): 검은 선체, 꺾인 날개, 붉은 조종창과 엔진 불빛
function shuttle(w, x, z, ry, y0 = 0.8) {
  const F = frame(w, x, z, ry, y0);
  F.box(0, 1.5, 0.5, 5, 3.4, 14, BLK2, { mat: "paint" });
  F.box(0, 1.8, -8.4, 3.6, 2.6, 3.4, IRON, NC);
  F.box(0, 2.2, -10.6, 2.2, 1.6, 1.4, STEEL, NC);
  F.box(0, 3.5, -8.6, 2.8, 0.6, 2.4, RED, GL);
  F.box(0, 4.9, 1, 3.4, 0.5, 9, IRON, NC);
  for (const s of [-1, 1]) {
    F.box(s * 5.4, 3.2, 2.4, 6.6, 0.5, 6.4, BLK, { mat: "paint", rz: -s * 10, col: false });
    F.box(s * 8.6, 1.9, 2.6, 1.8, 1.8, 8, GUN, { mat: "metal", col: false });
    F.box(s * 8.6, 2.2, 6.7, 1.2, 1.2, 0.2, RED2, GL);
    F.box(s * 8.6, 2.2, -1.5, 1.3, 1.3, 0.2, 0x0a0c10, NC);
    F.box(s * 2.56, 2.6, 0.5, 0.1, 0.4, 11, RED, GL);
    F.box(s * 2, 0, 4.5, 0.7, 1.6, 0.7, STEEL, NC);
    F.box(s * 1.6, 5.2, 6.4, 0.4, 3, 3.4, BLK2, { mat: "paint", rz: -s * 16, col: false });
  }
  F.box(0, 0, -6, 0.7, 1.6, 0.7, STEEL, NC);
  F.box(0, 2.4, 7.56, 3, 1.4, 0.14, RED2, GL);
}

// ── 착륙장 셋(남동): 팔각 착륙 단과 유도등, 주기된 수송정 둘, 관제탑과 연료 저장조 ──
export function pads(w, K) {
  PADS.forEach(([x, z], i) => {
    octa(w, x, 0, z, 15, 0.8, 0x1f232a, { mat: "std:panel" });
    octa(w, x, 0, z, 16, 0.4, IRON, { col: false });
    flatArc(w, x, 0.86, z, 11.4, 12, i === 1 ? CYA2 : RED, "glow", 0, Math.PI * 2, 8);
    flatArc(w, x, 0.85, z, 5, 5.4, HAZ, "std", 0, Math.PI * 2, 24);
    for (const [bx, bz, sx, sz] of [[0, 0, 7, 1], [-3, 0, 1, 6], [3, 0, 1, 6]]) w.box(x + bx, 0.84, z + bz, sx, 0.04, sz, 0x8f949c, { col: false, ao: false, ry: 45 });
    for (let k = 0; k < 8; k++) { const a = (k * 45 + 22.5) * DEG; w.box(x + Math.cos(a) * 14.2, 0.8, z + Math.sin(a) * 14.2, 0.8, 0.5, 0.8, k % 2 ? RED : ICE, GL); K.blink.add(x + Math.cos(a) * 14.2, 1.7, z + Math.sin(a) * 14.2, k % 2 ? RED : CYA, 0.3, k); }
    w.pool(x, 0.9, z, 20, i === 1 ? CYA : RED, 0.34);
    if (i !== 1) shuttle(w, x, z, i ? -35 : 20);
  });
  // 관제탑
  const [tx, tz] = [106, 127];
  w.box(tx, 0, tz, 7, 4, 7, BLK2, P8);
  w.box(tx, 4, tz, 3.4, 22, 3.4, BLK, P8);
  octa(w, tx, 26, tz, 6, 4.4, BLK2, { mat: "std:panel" });
  octa(w, tx, 27.4, tz, 6.12, 1.4, RED, { mat: "glow", col: false });
  octa(w, tx, 30.4, tz, 6.8, 0.8, IRON, { col: false });
  w.pipe(tx, 31, tz, tx, 39, tz, 0.25, GUN, { col: false });
  K.blink.add(tx, 39.6, tz, RED, 0.5, 1);
  for (const s of [-1, 1]) w.box(tx + s * 1.76, 6, tz, 0.12, 18, 0.5, RED, GL);
  // 연료 저장조와 급유관
  for (const [fx, fz] of [[136, 152], [146, 142], [170, 112]]) {
    if ((Math.abs(fx) + Math.abs(fz)) * Math.SQRT1_2 > WALL - 14) continue;
    w.cyl(fx, 0, fz, 4.6, 7, BLK2, { mat: "std:panel", tile: 6 });
    w.sph(fx, 7, fz, 4.6, IRON, { mat: "paint", sy: 0.45, col: false });
    w.cyl(fx, 3.2, fz, 4.7, 0.6, HAZ, { mat: "std:hazard", tile: 2, col: false });
    K.blink.add(fx, 9.6, fz, RED, 0.35, fx);
  }
}

// 코어 통(적치용): 검은 틀 안에 청록 코어가 든 운반 상자
function crate(w, x, y, z, ry, hot = true) {
  w.box(x, y, z, 6.4, 3, 3, hot ? 0x242830 : 0x2d3038, { mat: "std:panel", tile: 4, ry, col: false });
  const F = frame(w, x, z, ry, y);
  for (const u of [-3.0, 3.0]) F.box(u, 0, 0, 0.5, 3.1, 3.2, IRON, NC);
  if (hot) { for (const v of [-1.52, 1.52]) F.box(0, 1.1, v, 4.6, 0.8, 0.1, CYA, GL); F.box(0, 3, 0, 3.4, 0.08, 0.6, CYA2, GL); }
  else for (const v of [-1.52, 1.52]) F.box(0, 1.3, v, 4.6, 0.3, 0.1, RED, GL);
}

// ── 코어 적치장(남서): 훔쳐 온 코어 통이 줄지어 쌓인 마당과 갠트리 크레인(움직이는 트롤리), 가운데는 보급 창고 자리 ──
export function stockyard(w, K) {
  const { x, z } = DEPOT, r = w.rand;
  flatArc(w, x, 0.04, z, 0, 46, 0x1b1f26, "std:panel", 0, Math.PI * 2, 8);
  flatArc(w, x, 0.06, z, 13, 13.5, CYA2, "glow", 0, Math.PI * 2, 8);
  flatArc(w, x, 0.06, z, 45.4, 46, HAZ, "std", 0, Math.PI * 2, 8);
  w.pool(x, 0.05, z, 30, CYA, 0.3);
  // 통 더미: 가운데(반경 17)와 갠트리 자리는 비운다
  for (let ix = -3; ix <= 3; ix++) for (let iz = -2; iz <= 2; iz++) {
    const cx = x + ix * 9.5, cz = z + iz * 7.6;
    if (Math.hypot(cx - x, cz - z) < 18 || Math.hypot(cx - x, cz - z) > 38 || r() < 0.12) continue;
    const n = 1 + ((r() * 3) | 0), ry = r() < 0.2 ? 90 : 0;
    for (let k = 0; k < n; k++) crate(w, cx + (r() - 0.5) * 0.5, k * 3.05, cz, ry + (r() - 0.5) * 4, r() < 0.7);
    w.col.addBox(V3(cx, n * 1.52, cz), ry ? V3(1.6, n * 1.52, 3.3) : V3(3.3, n * 1.52, 1.6));
    if (n === 3) K.blink.add(cx, 9.6, cz, CYA, 0.3, ix + iz);
  }
  // 갠트리 크레인: 마당 북쪽을 동서로 가로지른다
  const gz = z - 30, xa = x - 30, xb = x + 22, xm = (xa + xb) / 2, GY = 27;
  for (const gx of [xa, xb]) for (const s of [-1, 1]) {
    beam(w, [gx, 0, gz + s * 5], [gx, GY, gz + s * 1.2], 1.2, BLK2);
    w.box(gx, 0, gz + s * 5, 2.6, 1.4, 2.6, IRON, NC);
  }
  for (const gx of [xa, xb]) { beam(w, [gx, 9, gz - 3.8], [gx, 9, gz + 3.8], 0.6, STEEL, { col: false }); K.blink.add(gx, GY + 3.4, gz, RED, 0.45, gx > x ? 1 : 0); w.box(gx, GY + 1.6, gz, 2, 1.4, 2, IRON, NC); }
  for (const s of [-1, 1]) w.box(xm, GY - 0.4, gz + s * 1.6, xb - xa + 6, 2, 1, IRON, { mat: "paint" });
  w.box(xm, GY + 1.5, gz, xb - xa + 6, 0.16, 0.5, RED, GL);
  for (let u = xa + 6; u < xb; u += 8.5) w.box(u, GY - 0.3, gz, 0.4, 0.4, 3.2, STEEL, NC);
  // 트롤리와 매달린 코어 통(움직임)
  const B = new THREE.BoxGeometry(1, 1, 1);
  const tg = merged([[B, M(0, 0, 0, 4.4, 1.4, 5), 0x3b4049], [B, M(0, -1, 0, 2.4, 0.8, 2.4), 0x272a31], [B, M(2.21, 0, 0, 0.1, 0.5, 3.4), 0xe8b01a]]);
  const trolley = new THREE.Mesh(tg, mat(w, "paint")); trolley.position.set(xm, GY - 0.6, gz);
  const hg = merged([[B, M(0, 0, 0, 6.4, 3, 3), 0x242830], [B, M(-3, 0, 0, 0.5, 3.1, 3.2), 0x3b4049], [B, M(3, 0, 0, 0.5, 3.1, 3.2), 0x3b4049], [B, M(0, 1.9, 0, 3, 0.6, 2), 0x545a64]]);
  const load = new THREE.Mesh(hg, mat(w, "paint")), lg = merged([[B, M(0, -0.3, 1.53, 4.6, 0.8, 0.1), CYA], [B, M(0, -0.3, -1.53, 4.6, 0.8, 0.1), CYA]]), lamp = new THREE.Mesh(lg, mat(w, "glow"));
  const cg = new THREE.BoxGeometry(0.14, 1, 0.14); cg.translate(0, -0.5, 0);
  const cable = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0x0c0d10 }));
  load.add(lamp); w.scene.add(trolley, load, cable); w.disposables.push(tg, hg, lg, cg, cable.material, B);
  w.rider(load, [[0, 0, 0, 3.3, 1.6, 1.6]], "mover");
  w.updaters.push((dt, t) => {
    const u = t * 0.08, tx = xm + Math.sin(u) * 20, drop = 5 + (0.5 + 0.5 * Math.sin(u * 2 + 1.2)) * 10;
    trolley.position.x = tx; load.position.set(tx, GY - 1.8 - drop, gz); cable.position.set(tx, GY - 1.4, gz); cable.scale.y = drop - 1.6;
  });
}
