// 거신 공창의 바탕: 눈 골짜기 지형 · 도로 · 조립 구덩이(옹벽·덧판·쇳물 낙하) · 쇳물 수로 · 미완성 거신 오메가 · 비계
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, ring, octa, ball, lattice, V3, DEG, hash, BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, EMB, HAZ,
  SNOW, SNOW2, ICE, ICE2, CONC, CONC2, SOOT, C, PIT_R, PIT_D, ROAD_R, LAKE, CHAN, CAUSE, CH_D, LAVA_Y, PARADE, RAIL,
  polar, height, colorFn, chanDist, inCause, snowCap,
} from "./foundry-kit.js";

const F = -PIT_D;                      // 구덩이 바닥 높이
const ASPH = 0x2c2f36;

// ── 지형과 도로 ──
export function ground(w, K) {
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.08, 1.12, 1.22", rockTint: "0.74, 0.8, 0.95", rockLo: 0.34, rockHi: 0.56, seg: w.quality === "low" ? 260 : 320 });
  const road = (x, z, sx, sz, ry = 0, c = ASPH) => w.box(x, -0.06, z, sx, 0.18, sz, c, { mat: "std:asphalt", tile: 6, ry, col: false, ao: false });
  // 순환로: 구덩이를 도는 12 m 도로 + 가운데 점선 + 바깥 눈 둑
  const N = 60, L = 2 * Math.PI * ROAD_R / N;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * 360, [x, z] = polar(th, ROAD_R);
    road(x, z, L + 0.7, 12, th);
    if (i % 2) { const [mx, mz] = polar(th, ROAD_R); w.box(mx, 0.12, mz, L * 0.55, 0.03, 0.35, HAZ, { ry: th, col: false, ao: false }); }
  }
  // 남쪽 진입로와 연병장
  road(0, 144, 14, 172);
  for (let z = 70; z < 224; z += 12) w.box(0, 0.12, z, 0.35, 0.03, 5, 0xd8dde4, { col: false, ao: false });
  w.box(PARADE[0], -0.06, PARADE[1], 84, 0.16, 78, 0x3a3e46, { mat: "std:concrete", tile: 10, col: false, ao: false });
  road(0, 144, 14, 172);
  ring(w, PARADE[0], 0.14, PARADE[1], 30, 0.45, HAZ, { pitch: 90, col: false, seg: 48 });
  ring(w, PARADE[0], 0.14, PARADE[1], 12, 0.3, RED, { pitch: 90, col: false, seg: 32, mat: "glow" });
  for (let k = 0; k < 4; k++) { const a = k * 90 + 45; w.box(PARADE[0] + Math.sin(a * DEG) * 21, 0.11, PARADE[1] + Math.cos(a * DEG) * 21, 1.2, 0.03, 14, HAZ, { ry: a, col: false, ao: false }); }
  // 북쪽 하역장으로 가는 길, 동쪽 제철 지대의 남북 작업로
  road(-40, -134, 96, 11, 13);
  road(128, -22, 11, 262);
  road(128, -22, 0.3, 262, 0, 0x8a8f98);
  // 철도 자갈 바닥(복선)
  w.box(0, -0.05, RAIL.z, 470, 0.25, 15, 0x4a4d55, { mat: "std:concrete", tile: 5, col: false, ao: false });
}

// ── 조립 구덩이: 옹벽 · 가장자리 덧판 · 턱 · 바닥 표식 ──
export function pit(w, K) {
  const N = 32, seg = 360 / N;
  for (let i = 0; i < N; i++) {
    const th = (i + 0.5) * seg, [x, z] = polar(th, PIT_R - 1.75), mouth = chanDist(...polar(th, PIT_R + 1)) < 8.5;
    const L = 2 * Math.PI * (PIT_R - 0.5) / N + 0.3, top = mouth ? -CH_D - 0.4 : 1.4;
    w.box(x, F - 1, z, L, top - F + 1, 2.5, i % 2 ? CONC : CONC2, { mat: "std:concrete", tile: 9, ry: th });
    // 옹벽의 세로 버팀대와 붉은 등
    const [bx, bz] = polar(th - seg / 2, PIT_R - 3.2);
    w.box(bx, F, bz, 1.4, (mouth ? -CH_D : 0) - F, 1.4, IRON, { mat: "paint", ry: th - seg / 2, col: false });
    if (i % 4 === 0) w.box(bx, -5, bz, 1.5, 1.2, 1.5, RED, { mat: "glow", ry: th - seg / 2, col: false });
    if (mouth) continue;
    // 덧판(가장자리 갑판)과 경고 턱
    const [ax, az] = polar(th, PIT_R + 4.5), La = 2 * Math.PI * (PIT_R + 12) / N + 0.3;
    w.box(ax, -0.2, az, La, 0.5, 16, i % 2 ? IRON : BLK2, { mat: "std:panel", tile: 6, ry: th });
    const [kx, kz] = polar(th, PIT_R - 2.4);
    w.box(kx, 0.3, kz, L - 0.6, 1.1, 1.2, HAZ, { mat: "std:hazard", tile: 2, ry: th, col: false });
  }
  // 바닥: 콘크리트 원판 표식과 방사 선
  for (const [R, c] of [[52, HAZ], [30, 0x8a8f98]]) ring(w, C[0], F + 0.12, C[1], R, 0.35, c, { pitch: 90, col: false, seg: 56 });
  for (let k = 0; k < 12; k++) { const [x, z] = polar(k * 30 + 15, 41); w.box(x, F + 0.02, z, 0.5, 0.06, 20, 0x8a8f98, { ry: k * 30 + 15, col: false, ao: false }); }
  w.pool(C[0], F + 0.1, C[1], 62, ORG, 0.16);
}

// ── 쇳물 수로: 쇳물 띠 · 턱 · 구덩이로 떨어지는 쇳물과 받이 ──
export function channels(w, K) {
  const lava = K.lava;
  CHAN.forEach((c, ci) => {
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i], b = c[i + 1], dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const last = i === c.length - 2;
      // 마지막 구간은 옹벽 안쪽 낙수구까지 늘인다
      let ex = b[0], ez = b[1];
      if (last) { while (Math.hypot(ex - C[0], ez - C[1]) > PIT_R - 5.5) { ex += dx * 0.25; ez += dz * 0.25; } }
      lava.strip(a[0] - dx * 5, a[1] - dz * 5, last ? ex : b[0] + dx * 6.5, last ? ez : b[1] + dz * 6.5, 15, LAVA_Y);
      // 양쪽 턱(6 m 토막). 둑길·다른 수로·구덩이 덧판 자리는 건너뛴다
      for (let s = 3; s < L + 6; s += 6) {
        const px = a[0] + dx * s, pz = a[1] + dz * s;
        for (const sd of [-1, 1]) {
          const kx = px + sd * 8.2 * Math.abs(dz), kz = pz + sd * 8.2 * Math.abs(dx);
          if (inCause(kx, kz, 1) || chanDist(kx, kz) < 7.9 || Math.hypot(kx - C[0], kz - C[1]) < PIT_R + 13) continue;
          w.box(kx, -0.1, kz, dx ? 6 : 1.1, 0.8, dx ? 1.1 : 6, (s / 6 | 0) % 4 ? IRON : HAZ, { mat: (s / 6 | 0) % 4 ? "paint" : "std:hazard", tile: 2, col: false });
        }
        if ((s / 6 | 0) % 3 === 0 && !inCause(px, pz, 2)) w.pool(px, 0.1, pz, 17, ORG, 0.3);
      }
      if (!last) continue;
      // 낙수구: 옹벽을 뚫고 나온 강철 홈통 + 쇳물 폭포 + 바닥의 받이
      const ry = dx ? 0 : 90, ux = dx, uz = dz;                       // 흐름 방향 (ux, uz)
      const mx = ex - ux * 2.5, mz = ez - uz * 2.5;                   // 홈통 가운데
      w.box(mx, LAVA_Y - 1.5, mz, dx ? 11 : 11.5, 1.3, dx ? 11.5 : 11, IRON, { mat: "paint" });
      for (const sd of [-1, 1]) w.box(mx + sd * 5.4 * Math.abs(uz), LAVA_Y - 1.5, mz + sd * 5.4 * Math.abs(ux), dx ? 11 : 1.2, 4.2, dx ? 1.2 : 11, BLK2, { mat: "paint" });
      const fx = ex + ux * 3, fz = ez + uz * 3;                       // 폭포가 떨어지는 선
      lava.strip(ex, ez, fx, fz, 8.6, LAVA_Y);
      const nx = Math.abs(uz) * 4, nz = Math.abs(ux) * 4;
      lava.quad([fx - nx, LAVA_Y, fz - nz], [fx + nx, LAVA_Y, fz + nz], [fx + nx + ux * 1.5, F + 1.2, fz + nz + uz * 1.5], [fx - nx + ux * 1.5, F + 1.2, fz - nz + uz * 1.5]);
      // 받이: 낮은 턱으로 두른 쇳물 못
      const bx = fx + ux * 4.5, bz = fz + uz * 4.5;
      lava.strip(bx - ux * 7, bz - uz * 7, bx + ux * 7, bz + uz * 7, 15, F + 1.3);
      for (const [ou, ov, su, sv] of [[7.6, 0, 1.2, 17.4], [-7.6, 0, 1.2, 17.4], [0, 8.1, 16.4, 1.2], [0, -8.1, 16.4, 1.2]]) {
        const X = bx + ux * ou + Math.abs(uz) * ov, Z = bz + uz * ou + Math.abs(ux) * ov;
        w.box(X, F, Z, dx ? su : sv, 2.2, dx ? sv : su, BLK2, { mat: "paint" });
      }
      w.pool(bx, F + 0.2, bz, 26, ORG, 0.75);
      K.steam.add(bx, F + 3, bz, 5, 34, 4, 0.1);
      K.sparks.push([fx + ux * 1.5, F + 2, fz + uz * 1.5, 5, 1]);
      void ri(ci), ry;
    }
  });
  // 둑길: 암거 입구(양쪽 면)와 난간, 붉은 표시등
  for (const [x0, x1, z0, z1] of CAUSE) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ew = chanDist(cx, cz - 20) > chanDist(cx - 20, cz);   // 수로가 동서로 흐르면 true
    const along = ew ? [x0, x1] : [z0, z1];
    for (const e of along) {
      const px = ew ? e : cx, pz = ew ? cz : e;
      // 암거 머리벽: 수로 폭을 막는 콘크리트 + 가운데 쇳물 구멍(빛)
      w.box(px, -CH_D - 0.5, pz, ew ? 1.6 : 17, CH_D + 1.9, ew ? 17 : 1.6, CONC2, { mat: "std:concrete", tile: 5 });
      const sgn = e === along[0] ? -1 : 1;
      w.box(px + (ew ? sgn * 0.85 : 0), LAVA_Y - 0.3, pz + (ew ? 0 : sgn * 0.85), ew ? 0.2 : 9, 2.3, ew ? 9 : 0.2, EMB, { mat: "glow", col: false });
      w.box(px, 1.4, pz, ew ? 1.8 : 17.4, 0.35, ew ? 17.4 : 1.8, HAZ, { mat: "std:hazard", tile: 2, col: false });
      for (const sd of [-1, 1]) K.blink.add(px + (ew ? 0 : sd * 8.4), 2.2, pz + (ew ? sd * 8.4 : 0), RED, 0.35, sd > 0 ? 1 : 0);
    }
  }
}
const ri = (i) => i;

// ── 미완성 거신 오메가: 머리 없는 몸통 + 오른팔 하나. 앞(가슴)은 남쪽을 본다 ──
// 실루엣: 골반(폭 34) → 잘록한 허리(20) → 위로 벌어지는 갈비 여섯 단(28 → 46) → 어깨 멍에(58) → 견갑과 팔
export function titan(w, K) {
  const X = (u) => C[0] + u, Z = (v) => C[1] + v;
  const bx = (u, y, v, su, sy, sv, color, o = {}) => w.box(X(u), y, Z(v), su, sy, sv, color, { mat: "std:panel", tile: 9, ...o });
  const gl = (u, y, v, su, sy, sv, color) => w.box(X(u), y, Z(v), su, sy, sv, color, { mat: "glow", col: false });
  const sn = (u, y, v, su, sv, o = {}) => w.box(X(u), y, Z(v), su, 0.7, sv, SNOW, { col: false, ao: false, ...o });
  const pp = (u1, y1, v1, u2, y2, v2, r, color, o) => w.pipe(X(u1), y1, Z(v1), X(u2), y2, Z(v2), r, color, o);

  // 거치대: 팔각 받침 · 네 귀의 물림 탑 · 가운데 받침 기둥
  octa(w, X(0), F, Z(0), 23, 4.5, CONC2, { mat: "std:concrete" });
  octa(w, X(0), F + 4.5, Z(0), 19, 1.2, HAZ, { mat: "std:hazard", col: false });
  w.cyl(X(0), F + 4.5, Z(0), 7.5, 26, RUST, { mat: "metal" });
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    bx(su * 22, F, sv * 14, 7, 33, 7, STEEL, { mat: "paint" });
    bx(su * 22, 9, sv * 14, 8, 1.2, 8, HAZ, { mat: "std:hazard", tile: 2, col: false });
    bx(su * 18.6, 5, sv * 11.6, 8, 3, 4, IRON, { mat: "paint" });                        // 물림 팔
    gl(su * 25.6, -8, sv * 14, 0.25, 14, 0.8, RED);
    K.blink.add(X(su * 22), 11, Z(sv * 14), RED, 0.5, su > 0 ? 0 : 1);
  }
  // 허벅지 밑동(다리는 아직 없다): 잘린 관절과 늘어진 유압관
  for (const su of [-1, 1]) {
    w.cyl(X(su * 10.5), -7, Z(0), 6.2, 13, BLK2, { mat: "std:panel" });
    w.cyl(X(su * 10.5), -8.4, Z(0), 6.8, 1.6, HAZ, { mat: "std:hazard", col: false });
    w.cyl(X(su * 10.5), -8.7, Z(0), 4.8, 0.4, RED, { mat: "glow", col: false });
    for (let k = 0; k < 4; k++) pp(su * 10.5 + Math.cos(k * 1.57 + 0.4) * 3.2, -8.5, Math.sin(k * 1.57 + 0.4) * 3.2, su * 10.5 + Math.cos(k * 1.57 + 0.4) * 3.6, -13 - k * 1.3, Math.sin(k * 1.57 + 0.4) * 3.6, 0.35, BLK, { col: false });
  }
  // 골반과 허리띠
  bx(0, 6, 0, 30, 13, 18, BLK2);
  for (const su of [-1, 1]) { bx(su * 16.8, 7, 0, 5, 11, 20.5, IRON, { rz: su * -6 }); gl(su * 19.6, 12.4, 0, 0.25, 0.7, 16, RED); }
  bx(0, 3.5, 9.6, 11, 14, 3.2, IRON, { rx: -7 });
  gl(0, 9, 11.6, 5, 5, 0.25, DRED);
  bx(0, 19, 0, 33, 2.2, 20.5, STEEL, { mat: "paint" });
  gl(0, 19.7, 10.35, 26, 0.6, 0.25, RED);
  // 허리: 잘록한 마디판 셋 + 등뼈 + 옆구리 유압 기둥. 마디 사이로 주황빛이 샌다
  w.cyl(X(0), 21, Z(-4), 4, 19, STEEL, { mat: "metal" });
  [[20, 13], [18, 12.4], [22, 14]].forEach(([su, sv], i) => {
    bx(0, 21.2 + i * 6, 1, su, 5, sv, i % 2 ? BLK2 : BLK);
    gl(0, 26.2 + i * 6, 1, su - 2.4, 1, sv - 1.2, i === 2 ? EMB : ORG);
  });
  for (const su of [-1, 1]) for (const sv of [-1, 1]) pp(su * 13.5, 20.5, sv * 5.5, su * 15.5, 40.5, sv * 5.5, 0.95, GUN);

  // 가슴: 위로 갈수록 넓어지는 갈비 여섯 단. 단 사이의 틈으로 용광로 빛이 샌다
  const LV = 6, RY = (i) => 39.6 + i * 6.4, RW = (i) => 28 + i * 3.6, RD = (i) => 16 + i * 1.2;
  for (let i = 0; i < LV; i++) {
    const y = RY(i), W = RW(i), D = RD(i);
    bx(0, y, 0, W, 4.6, D, i % 2 ? BLK2 : IRON);
    // 갈비 끝의 밝은 모서리판(형태가 읽히게)
    for (const su of [-1, 1]) bx(su * (W / 2 - 0.4), y + 0.5, 0, 1.4, 3.6, D + 1, STEEL, { mat: "paint", col: false });
    if (i < LV - 1) {
      bx(0, y + 4.6, 0, W - 2.6, 1.8, D - 2.4, BLK, { col: false });
      gl(0, y + 4.9, D / 2 - 1.1, W - 4, 1.2, 0.25, i % 2 ? ORG : EMB); gl(0, y + 4.9, -D / 2 + 1.1, W - 4, 1.2, 0.25, DRED);
      for (const su of [-1, 1]) gl(su * (W / 2 - 1.2), y + 4.9, 0, 0.25, 1.2, D - 4, ORG);
    }
  }
  // 흉골(두 줄 기둥)과 가슴 한가운데의 노심(주황 발광구) — 맵 어디서나 보이는 표적
  for (const su of [-1, 1]) bx(su * 5.4, 40, 9.9, 3.2, 34, 2.6, STEEL, { mat: "paint", rx: 5 });
  ring(w, X(0), 58, Z(11.9), 7.4, 1.15, GUN, { seg: 28 });
  w.sph(X(0), 58, Z(9.6), 5.8, EMB, { mat: "glow", col: false });
  ring(w, X(0), 58, Z(12.8), 6, 0.3, ORG, { seg: 28, mat: "glow", col: false });
  gl(0, 42, 9.6, 6.6, 8.5, 0.3, ORG); gl(0, 66.8, 11.2, 6.6, 5, 0.3, ORG);
  w.pool(X(0), 0.3, Z(58), 34, ORG, 0.3);
  // 흉갑 두 장(앞으로 기운 큰 판)과 붉은 테, 등판
  for (const su of [-1, 1]) {
    bx(su * 14.2, 61.5, 12.6, 19.5, 15.5, 4.4, BLK2, { rx: -7, rz: su * 4 });
    bx(su * 14.2, 62.6, 14.2, 15, 12, 1.6, IRON, { rx: -7, rz: su * 4, col: false });
    gl(su * 14.2, 61.8, 15.5, 17.5, 0.5, 0.3, RED);
    bx(su * 14.2, 70, -12.4, 19.5, 6.4, 3.6, BLK2);
  }
  // 어깨 멍에와 승모판(목에서 어깨로 흘러내리는 판), 위에 쌓인 눈
  bx(0, 76, 0, 58, 8, 24, IRON);
  gl(0, 79.4, 12.15, 54, 0.7, 0.25, RED); gl(0, 79.4, -12.15, 54, 0.7, 0.25, DRED);
  for (const su of [-1, 1]) { bx(su * 18, 83.2, 0, 19, 3.4, 21, BLK2, { rz: su * 12 }); sn(su * 19, 86.3, -2, 14, 15, { rz: su * 12 }); sn(su * 25, 84, 9, 7, 5.6); }
  // 등짐: 방열 상자와 배기통 둘
  bx(0, 46, -14.6, 27, 34, 9.4, IRON);
  sn(0, 80, -16.5, 26, 5);
  for (const su of [-1, 1]) {
    w.cyl(X(su * 8), 80, Z(-15), 3, 9, STEEL, { mat: "metal" });
    w.cyl(X(su * 8), 88.6, Z(-15), 2.3, 0.4, ORG, { mat: "glow", col: false });
    gl(su * 8, 54, -19.45, 6.5, 16, 0.25, DRED);
    for (let k = 0; k < 4; k++) bx(su * 8, 55.5 + k * 3.7, -19.6, 7.4, 0.9, 0.9, STEEL, { mat: "paint", col: false });
    K.steam.add(X(su * 8), 90, Z(-15), 4, 46, 4, 0.2);
  }

  // 목: 받침 기둥 + 네 버팀대 위에 뜬 열린 목 고리(머리는 아직 없다)
  w.cyl(X(0), 84, Z(0), 6.4, 4, STEEL, { mat: "metal" });
  w.cyl(X(0), 88, Z(0), 2.6, 2, GUN, { mat: "metal", col: false });
  w.cyl(X(0), 90, Z(0), 1.5, 0.4, RED, { mat: "glow", col: false });
  ring(w, X(0), 100, Z(0), 11, 1.35, GUN, { pitch: 90, seg: 40 });
  ring(w, X(0), 100, Z(0), 9.5, 0.3, RED, { pitch: 90, seg: 40, mat: "glow", col: false });
  ring(w, X(0), 101.5, Z(0), 11.2, 0.35, HAZ, { pitch: 90, seg: 40, col: false });
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    beam(w, [X(su * 9.5), 84, Z(sv * 7)], [X(su * 7.8), 99.4, Z(sv * 7.8)], 1.3, STEEL);
    K.blink.add(X(su * 7.9), 102.2, Z(sv * 7.9), RED, 0.6, su * sv > 0 ? 0 : 1);
  }
  w.gap("거신의 목 고리", X(0), 100, Z(0), 0, 17, 17, 900, -90);

  // 오른팔(서쪽): 어깨 관절 · 견갑 · 위팔 · 팔꿈치 · 아래팔과 건틀릿 · 손목(손은 아직 크레인에 매달려 있다)
  pp(-29, 80, 0, -34, 80, 0, 5.6, STEEL, { mat: "metal" });
  w.sph(X(-40), 80, Z(0), 12.5, BLK2, { mat: "std:panel" });
  bx(-41, 88.6, 0, 26, 4.6, 28, IRON, { rz: 13 });
  sn(-41.2, 93.3, 0, 22, 24, { rz: 13 });
  bx(-52, 69, 0, 4.6, 19, 26, IRON, { rz: -7 });
  bx(-40, 72, 13.2, 17, 13, 2.4, IRON, { rx: 8 }); bx(-40, 72, -13.2, 17, 13, 2.4, IRON, { rx: -8 });
  gl(-54.5, 78, 0, 0.3, 0.8, 22, RED); gl(-40, 76, 14.6, 13, 0.6, 0.3, RED);
  bx(-42, 40, 0, 12, 31, 13, BLK);
  bx(-48.8, 44, 0, 2.6, 22, 15.5, IRON);
  bx(-42, 47, 7.3, 9, 17, 2.2, IRON);
  for (const sv of [-1, 1]) { pp(-37, 69, sv * 7.6, -37, 43, sv * 7.6, 1, GUN, { col: false }); gl(-42, 44, sv * 6.65, 7.4, 1, 0.25, sv > 0 ? ORG : DRED); }
  gl(-42, 64.5, 8.5, 7, 0.6, 0.25, RED);
  pp(-42, 36, -8.8, -42, 36, 8.8, 7.2, STEEL, { mat: "metal" });
  for (const sv of [-1, 1]) { w.box(X(-42), 33.6, Z(sv * 9), 4.8, 4.8, 0.3, RED, { mat: "glow", col: false }); ring(w, X(-42), 36, Z(sv * 8.9), 6.4, 0.5, HAZ, { seg: 24, col: false }); }
  bx(-42, 8, 0, 11, 25, 12, BLK2);
  bx(-42, 6, 0, 15.5, 16, 16, IRON);
  bx(-42, 9, 8.2, 11, 10, 1.2, STEEL, { mat: "paint", col: false });
  gl(-42, 22.2, 0, 13.9, 0.6, 14.4, RED);
  gl(-42, 12.5, 8.9, 8, 0.6, 0.25, ORG);
  w.cyl(X(-42), 2.2, Z(0), 5, 3.8, HAZ, { mat: "std:hazard" });
  w.cyl(X(-42), 1.9, Z(0), 3.6, 0.35, RED, { mat: "glow", col: false });
  for (let k = 0; k < 5; k++) { const a = k * 1.26, L = 4 + (k % 3) * 2.5; pp(-42 + Math.cos(a) * 2.6, 2.2, Math.sin(a) * 2.6, -42 + Math.cos(a) * 3, 2.2 - L, Math.sin(a) * 3, 0.3, BLK, { col: false }); ball(w, X(-42 + Math.cos(a) * 3), 2 - L, Z(Math.sin(a) * 3), 0.45, ORG); }
  w.gap("몸통과 팔 사이", X(-28.5), 46, Z(0), 0, 12, 44, 700);
  w.gap("거신의 팔 밑", X(-42), -9, Z(0), 0, 18, 22, 400);

  // 왼어깨(동쪽): 팔이 아직 없는 빈 관절 구멍과 늘어진 전선
  pp(29, 79, 0, 33.4, 79, 0, 7, STEEL, { mat: "metal" });
  ring(w, X(33.8), 79, Z(0), 7.8, 1.05, GUN, { yaw: 90, seg: 28 });
  gl(33.7, 75, 0, 0.3, 8, 8, DRED);
  ring(w, X(34.1), 79, Z(0), 4.6, 0.3, RED, { yaw: 90, seg: 24, mat: "glow", col: false });
  for (let k = 0; k < 6; k++) { const v = -5 + k * 2, L = 5 + ((k * 7) % 5) * 2.4; pp(33.7, 74.5, v, 34.8, 74.5 - L, v * 1.15, 0.28, BLK, { col: false }); ball(w, X(34.8), 74.3 - L, Z(v * 1.15), 0.42, k % 2 ? ORG : RED); }
  for (let k = 0; k < 4; k++) K.blink.add(X(34.6), 79 + Math.sin(k * 1.57) * 9, Z(Math.cos(k * 1.57) * 9), RED, 0.5, k);
  // 용접 자리(불꽃이 튄다)
  K.sparks.push([X(-34), 79, Z(8), 3, 0], [X(22), 63, Z(15), 3, 0], [X(-13), 45, Z(9.5), 3, 0], [X(33), 76, Z(-6), 3, 0], [X(-42), 35, Z(10), 3, 0], [X(6), 99, Z(-10), 3, 0], [X(13), 23, Z(8.5), 3, 0], [X(-10), 70, Z(-19.6), 3, 0], [X(-50), 14, Z(4), 3, 0]);
}

// ── 비계: 구덩이 북·동쪽의 격자탑 · 탑을 잇는 통로 · 골반 앞과 등 뒤의 작업 발판 · 몸통으로 건너가는 다리 ──
// (앞쪽과 팔 쪽은 비워 거신의 모습이 가리지 않게 한다) ctx.clearCol(x, z, y0, y1, r), ctx.clear(x, y, z, r)
export function scaffold(w, K, ctx) {
  const X = (u) => C[0] + u, Z = (v) => C[1] + v;
  const TOPS = { 75: 70, 105: 86, 135: 94, 165: 78, 195: 94, 225: 70 };
  const towers = [];
  for (const th of [75, 105, 135, 165, 195, 225]) {
    const [x, z] = polar(th, 53), top = TOPS[th], k = th / 30 | 0;
    if (!ctx.clearCol(x, z, F, top, 9.5)) continue;
    lattice(w, x, F, z, 3.6, top - F, Math.round((top - F) / 9), k % 2 ? GUN : STEEL, { t: 0.55, color2: k % 3 ? IRON : RUST, open: Math.abs(Math.sin(th * DEG)) > 0.7 ? "x" : "z" });
    w.box(x, top, z, 8.6, 0.5, 8.6, IRON, { mat: "paint", col: false });
    w.box(x, top + 0.5, z, 8.8, 0.5, 8.8, SNOW, { col: false, ao: false });
    w.box(x, top + 0.5, z, 1.2, 3.6, 1.2, STEEL, { mat: "paint", col: false });
    K.blink.add(x, top + 4.6, z, RED, 0.6, k);
    for (let y = 6; y < top - 4; y += 18) w.box(x, y, z, 1, 1, 1, RED, { mat: "glow", col: false });
    towers.push({ k, th, x, z, top });
  }
  // 발판 다리: 두 점을 잇는 발판과 난간. 비행선과 겹치면 놓지 않는다
  const walk = (a, b, y) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx) / DEG;
    for (let s = 0; s <= 6; s++) if (!ctx.clear(a[0] + dx * s / 6, y + 2, a[1] + dz * s / 6, 7.5)) return false;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    w.box(mx, y, mz, L, 0.4, 2.6, IRON, { mat: "std:panel", tile: 4, ry });
    for (const sd of [-1, 1]) {
      const ox = -dz / L * 1.3 * sd, oz = dx / L * 1.3 * sd;
      beam(w, [a[0] + ox, y + 1.5, a[1] + oz], [b[0] + ox, y + 1.5, b[1] + oz], 0.16, HAZ, { col: false });
      beam(w, [a[0] + ox, y - 1.6, a[1] + oz], [mx + ox, y, mz + oz], 0.3, STEEL, { col: false });
      beam(w, [b[0] + ox, y - 1.6, b[1] + oz], [mx + ox, y, mz + oz], 0.3, STEEL, { col: false });
    }
    return true;
  };
  towers.forEach((t, i) => {
    const n = towers[i + 1];
    if (!n || n.th - t.th !== 30) return;
    for (const y of [3, 30, 57, 84]) if (y < Math.min(t.top, n.top) - 2) walk([t.x, t.z], [n.x, n.z], y);
  });
  // 골반 앞(낮게)과 등 뒤(높게)의 작업 발판
  for (const [v, top, us] of [[14.5, 33, [-18, -9, 0, 9, 18]], [-22.5, 84, [-21, -10.5, 0, 10.5, 21]]]) {
    const sg = Math.sign(v), u0 = us[0], u1 = us[us.length - 1];
    for (const u of us) beam(w, [X(u), F, Z(v)], [X(u), top, Z(v)], 0.5, GUN, { col: Math.abs(u) > 17 });
    for (const u of us) beam(w, [X(u), F, Z(v + sg * 2.4)], [X(u), top, Z(v + sg * 2.4)], 0.4, STEEL, { col: false });
    for (let y = F + 10; y <= top; y += 11) {
      w.box(X(0), y, Z(v + sg * 1.2), u1 - u0 + 0.6, 0.35, 3, y > 0 ? IRON : BLK2, { mat: "std:panel", tile: 4 });
      beam(w, [X(u0), y + 1.4, Z(v + sg * 2.4)], [X(u1), y + 1.4, Z(v + sg * 2.4)], 0.16, HAZ, { col: false });
      if (y + 11 <= top) for (let q = 0; q < us.length - 1; q++) beam(w, [X(us[q]), y, Z(v)], [X(us[q + 1]), y + 11, Z(v)], 0.2, STEEL, { col: false });
      if (y > 0) for (const su of [-1, 1]) w.box(X(su * u1), y + 2.2, Z(v + sg * 2.5), 0.8, 0.8, 0.4, RED, { mat: "glow", col: false });
    }
  }
  // 탑에서 몸통으로 건너가는 다리
  const span = (th, y, r1) => {
    const t = towers.find((q) => q.th === th); if (!t || y > t.top - 1) return;
    const [ax, az] = polar(th, 49.5), [bx, bz] = polar(th, r1);
    if (walk([ax, az], [bx, bz], y)) K.blink.add((ax + bx) / 2, y + 2.4, (az + bz) / 2, RED, 0.4, (th / 30) | 0);
  };
  for (const [th, y, r1] of [[165, 30, 26], [195, 57, 26], [165, 57, 26], [195, 84, 26], [75, 57, 22], [105, 30, 20], [105, 68, 35], [75, 3, 28], [225, 57, 26], [135, 57, 28], [135, 84, 30], [135, 3, 30], [225, 3, 28]]) span(th, y, r1);
}
