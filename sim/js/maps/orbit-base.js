// 궤도 요새 구역 짓기: 갑판·선체, 중앙 반응로 탑, 격납고 줄, 도킹 암, 방열판 숲, 주포대, 안테나 마스트, 캣워크 다리, 에너지 도관
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, prop, ring, octa, ball, lattice, dish, V3, DEG, hash, prism, arch, ringGate,
  WH, HULL, HULL2, STEEL, DARK, INK, NAVY, ORG, YEL, RED, AMB, CYA, CYA2, GRN, OCT, HALF, CH, outside,
} from "./orbit-kit.js";

export const REACTOR = [0, -45];
export const HANGARS = [-150, -75, 0], HZ = -195, HW = 56, HD = 46, HH = 24;
export const DOCKS = [-20, 40, 100], DOCK_X = 212, ARM_Y = 18, ARM_END = 266;
export const RAD_X = [-215, -185, -155], RAD_Z = [-120, -90, -60, -30, 0];
export const GUNS = [[-160, 196], [-60, 206], [60, 206], [160, 196]];
export const MASTS = [[-212, 150, 84], [208, 172, 62], [214, -140, 72]];
export const ROAD_R = 135;
export const BRIDGE_Y = 22;

const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 14);
const bx = (sx, sy, sz, x, y, z, c, rx = 0, ry = 0, rz = 0) => [BOXG, M(x, y, z, sx, sy, sz, rx, ry, rz), c];

// ── 갑판: 팔각 판 하나. 40 m 구획마다 판 색을 조금씩 달리하고(삼각형 단위로 끊어 또렷하게), 패널 텍스처를 8 m 로 깐다 ──
export function deck(w) {
  const S = HALF * 2, N = 48, g0 = new THREE.PlaneGeometry(S, S, N, N);
  g0.rotateX(-Math.PI / 2);
  const P0 = g0.attributes.position;
  for (let i = 0; i < P0.count; i++) {
    let x = P0.getX(i), z = P0.getZ(i);
    const e = Math.abs(x) + Math.abs(z) - CH;
    if (e > 0) { x -= Math.sign(x) * e / 2; z -= Math.sign(z) * e / 2; }
    P0.setXYZ(i, x, 0, z);
  }
  const g = g0.toNonIndexed(); g0.dispose();
  const P = g.attributes.position, U = g.attributes.uv, col = new Float32Array(P.count * 3), c = new THREE.Color();
  const TONES = [0x8c929e, 0x838995, 0x959ba6, 0x7b818d, 0x8a8f98];
  for (let t = 0; t < P.count; t += 3) {
    const cx = (P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3, cz = (P.getZ(t) + P.getZ(t + 1) + P.getZ(t + 2)) / 3;
    const sx = Math.floor((cx + 240) / 40), sz = Math.floor((cz + 240) / 40), h = hash(sx * 7 + 3, sz * 13 + 5);
    c.set(TONES[(h * TONES.length) | 0]);
    const k = 1 + (hash(Math.floor(cx / 10), Math.floor(cz / 10)) - 0.5) * 0.05;
    for (let j = 0; j < 3; j++) { col[(t + j) * 3] = c.r * k; col[(t + j) * 3 + 1] = c.g * k; col[(t + j) * 3 + 2] = c.b * k * 1.02; U.setXY(t + j, P.getX(t + j) / 8, P.getZ(t + j) / 8); }
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, w.material("std:panel"));
  m.receiveShadow = true; m.frustumCulled = false;
  w.scene.add(m);
  w.disposables.push(g);
}

// ── 선체: 갑판 아래로 곧은 옆벽 → 좁아지는 용골 → 엔진. 옆벽에는 창문 띠와 경고 줄무늬 ──
export function hull(w, K) {
  w.mesh(prism(OCT, 0, -4, 1, 1), new THREE.Matrix4(), DARK, "paint");
  w.mesh(prism(OCT, -4, -26, 1, 1), new THREE.Matrix4(), HULL2, "std:panel");
  w.mesh(prism(OCT, -26, -30, 1, 0.97), new THREE.Matrix4(), NAVY, "paint");
  w.mesh(prism(OCT, -30, -62, 0.97, 0.66), new THREE.Matrix4(), HULL2, "std:panel");
  w.mesh(prism(OCT, -62, -80, 0.66, 0.36, true), new THREE.Matrix4(), STEEL, "std:panel");
  // 옆벽 장식과 충돌 벽(갑판 아래로 파고들지 못하게)
  const n = OCT.length;
  for (let i = 0; i < n; i++) {
    const a = OCT[i], b = OCT[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = tz, nz = -tx, ry = Math.atan2(-tz, tx) / DEG;
    const o = Math.sign(nx * mx + nz * mz) || 1, ox = nx * o, oz = nz * o;
    // 창문 띠 두 줄, 경고 띠
    for (const [y, hgt, c, mat] of [[-10, 0.9, CYA, "glow"], [-17, 0.6, AMB, "glow"]]) {
      const segs = Math.max(1, Math.round(L / 14));
      for (let s = 0; s < segs; s++) {
        const u = (s + 0.5) / segs - 0.5;
        w.box(mx + tx * u * L + ox * 0.15, y, mz + tz * u * L + oz * 0.15, L / segs - 4, hgt, 0.3, c, { mat, col: false, ry });
      }
    }
    w.box(mx + ox * 0.2, -3.2, mz + oz * 0.2, L, 1.2, 0.3, YEL, { mat: "std:hazard", tile: 2, col: false, ry, ao: false });
    // 갑판 테두리 턱(경고 줄무늬) — 낮아서 넘어 날 수 있다
    w.box(mx - ox * 0.8, 0, mz - oz * 0.8, L + 1.5, 0.9, 1.6, YEL, { mat: "std:hazard", tile: 2, ry, ao: false });
    w.box(mx - ox * 2.6, 0, mz - oz * 2.6, L - 2, 0.06, 0.5, WH, { col: false, ry, ao: false });
    // 충돌 벽: 바깥 아래에서 선체 안으로 파고들지 못하게
    w.col.addBox(V3(mx - ox * 3, -30, mz - oz * 3), V3(L / 2 + 3, 29, 3), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry * DEG, 0)));
    // 테두리 표시등
    const lights = Math.round(L / 20);
    for (let s = 0; s <= lights; s++) { const u = s / lights - 0.5; K.blink.add(mx + tx * u * L - ox * 0.8, 1.3, mz + tz * u * L - oz * 0.8, s % 2 ? RED : AMB, 0.34, s); }
  }
  // 용골 엔진: 아래로 향한 노즐 + 푸른 불꽃
  for (const [x, z] of [[0, 0], [60, 60], [-60, 60], [60, -60], [-60, -60]]) {
    w.cyl(x, -100, z, 9, 22, STEEL, { mat: "metal", col: false, rt: 13 });
    w.cyl(x, -104, z, 7.6, 4, CYA, { mat: "glow", col: false, rt: 8.6 });
    w.cyl(x, -80, z, 14, 3, DARK, { mat: "paint", col: false });
  }
  // 아래로 늘어진 안테나 가시
  for (const [x, z, L] of [[110, -40, 50], [-120, 30, 60], [30, 120, 45], [-40, -120, 55]]) {
    w.pipe(x, -60, z, x, -60 - L, z, 0.6, HULL2, { col: false });
    K.blink.add(x, -61 - L, z, RED, 0.6, 1);
  }
}

// ── 갑판 무늬: 순환 도로, 반응로 둘레 에너지 원, 방사 유도선, 착륙장 ──
export function markings(w, K) {
  const flat = (geo, y, color, mat = "std") => { geo.rotateX(-Math.PI / 2); w.mesh(geo, M(0, y, 0), color, mat); };
  // 순환 도로
  { const g = new THREE.RingGeometry(ROAD_R - 5, ROAD_R + 5, 128, 1); flat(g, 0.03, 0x3c414c, "std:panel"); }
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2, ry = -a / DEG;
    for (const r of [ROAD_R - 4.6, ROAD_R + 4.6]) w.box(Math.cos(a) * r, 0.04, Math.sin(a) * r, 0.35, 0.06, 2.6, i % 2 ? CYA : WH, { mat: i % 2 ? "glow" : "std", col: false, ry, ao: false });
    if (i % 2) w.box(Math.cos(a) * ROAD_R, 0.04, Math.sin(a) * ROAD_R, 0.4, 0.05, 4.2, YEL, { col: false, ry, ao: false });
  }
  // 반응로 에너지 원 + 방사선
  const [rx, rz] = REACTOR;
  { const g = new THREE.RingGeometry(57, 59, 96, 1); g.rotateX(-Math.PI / 2); w.mesh(g, M(rx, 0.05, rz), CYA, "glow"); }
  { const g = new THREE.RingGeometry(62, 63, 96, 1); g.rotateX(-Math.PI / 2); w.mesh(g, M(rx, 0.05, rz), CYA2, "glow"); }
  w.pool(rx, 0.06, rz, 70, CYA, 0.16);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16, ry = -a / DEG + 90;
    w.box(rx + Math.cos(a) * 44, 0.05, rz + Math.sin(a) * 44, 0.6, 0.05, 22, i % 2 ? CYA : 0xdfe3ea, { mat: i % 2 ? "glow" : "std", col: false, ry, ao: false });
  }
  // 착륙장 (남동): 겹 원 + 십자
  const [px, pz] = PAD;
  octa(w, px, -0.2, pz, 17, 0.45, 0x4a505c, { mat: "std:panel", col: false });
  ring(w, px, 0.3, pz, 13, 0.18, AMB, { pitch: 90, col: false, mat: "glow", seg: 40 });
  ring(w, px, 0.3, pz, 9, 0.12, WH, { pitch: 90, col: false, seg: 40 });
  w.box(px, 0.25, pz, 9, 0.06, 1.2, WH, { col: false, ao: false }); w.box(px, 0.25, pz, 1.2, 0.06, 9, WH, { col: false, ao: false });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; K.blink.add(px + Math.cos(a) * 16.6, 0.6, pz + Math.sin(a) * 16.6, AMB, 0.3, k); }
  w.pool(px, 0.3, pz, 20, AMB, 0.18);
  // 가로등: 도로 바깥 둘레
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.2; w.lamp(Math.cos(a) * (ROAD_R + 9), Math.sin(a) * (ROAD_R + 9), 8, i % 4 ? 0xbfe8ff : AMB, -a / DEG + 90 + 180, 1.8); }
}
export const PAD = [102, 168];

// ── 중앙 반응로 탑: 2단 받침, 빛나는 띠를 두른 코어 기둥, 버팀 날개, 왕관과 에너지 구, 하늘로 솟는 빛기둥, 자이로 고리 ──
export function reactor(w, K) {
  const [x, z] = REACTOR;
  octa(w, x, 0, z, 26, 3, DARK, { mat: "std:panel" });
  octa(w, x, 2.9, z, 26.4, 0.4, ORG, { col: false });
  octa(w, x, 3, z, 18, 3, HULL2, { mat: "std:panel" });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; w.box(x + Math.cos(a) * 21.5, 3, z + Math.sin(a) * 21.5, 3.2, 0.3, 1.2, CYA, { mat: "glow", col: false, ry: -a / DEG + 90 }); }
  // 코어 기둥
  w.cyl(x, 6, z, 11, 58, WH, { mat: "std:panel", tile: 6 });
  for (const y of [14, 26, 38, 50]) { w.cyl(x, y, z, 11.35, 1.6, CYA, { mat: "glow", col: false }); w.cyl(x, y + 1.6, z, 11.6, 0.6, DARK, { mat: "paint", col: false }); }
  for (const y of [8, 20, 32, 44, 56]) w.cyl(x, y, z, 11.8, 0.9, NAVY, { mat: "paint", col: false });
  // 버팀 날개 4장
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, cx = x + Math.cos(a) * 14.5, cz = z + Math.sin(a) * 14.5, ry = -a / DEG;
    w.box(cx, 6, cz, 8, 26, 2.4, HULL, { mat: "std:panel", ry });
    w.box(x + Math.cos(a) * 12.6, 32, z + Math.sin(a) * 12.6, 3.2, 10, 2.4, HULL, { mat: "std:panel", ry });
    w.box(x + Math.cos(a) * 18.4, 6, z + Math.sin(a) * 18.4, 0.3, 24, 0.6, CYA, { mat: "glow", col: false, ry });
    w.box(cx, 31.6, cz, 8.4, 0.6, 2.8, ORG, { col: false, ry });
  }
  // 왕관: 넓은 테두리 + 비스듬한 방출 갈퀴 + 에너지 구
  w.cyl(x, 64, z, 14, 3.5, DARK, { mat: "paint" });
  w.cyl(x, 67.5, z, 14.4, 0.6, CYA, { mat: "glow", col: false });
  w.cyl(x, 68.1, z, 8, 3, HULL2, { mat: "paint", rt: 5 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    beam(w, [x + c * 12, 67, z + s * 12], [x + c * 9.5, 84, z + s * 9.5], 1.3, HULL);
    ball(w, x + c * 9.5, 84.6, z + s * 9.5, 0.9, CYA);
  }
  w.sph(x, 85, z, 5.6, CYA, { mat: "glow" });
  ring(w, x, 85, z, 8.4, 0.35, CYA, { pitch: 90, col: false, mat: "glow" });
  ring(w, x, 85, z, 10.8, 0.25, CYA2, { pitch: 70, yaw: 30, col: false, mat: "glow" });
  // 하늘로 솟는 빛기둥 (가산, 충돌 없음)
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.6, 120, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x3fd6ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  bm.position.set(x, 151, z); bm.renderOrder = 6; w.scene.add(bm);
  const bm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 120, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xc8f6ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  bm2.position.copy(bm.position); bm2.renderOrder = 6; w.scene.add(bm2);
  w.updaters.push((dt, t) => { bm.material.opacity = 0.18 + 0.06 * Math.sin(t * 3.1); });
  // 자이로 고리: 수평 큰 고리 + 기울어진 두 고리. 고리와 기둥 사이로 날 수 있다
  const RS = [[32, 42, 90, 0], [25, 28, 72, 20], [25, 54, 72, 110]];
  for (const [R, y, pitch, yaw] of RS) {
    ring(w, x, y, z, R, 0.9, HULL2, { pitch, yaw, seg: 48 });
    ring(w, x, y + (pitch === 90 ? 0.9 : 0), z, R, 0.3, CYA, { pitch, yaw, seg: 48, mat: "glow", col: false });
  }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; beam(w, [x + Math.cos(a) * 11, 42, z + Math.sin(a) * 11], [x + Math.cos(a) * 31.2, 42, z + Math.sin(a) * 31.2], 0.7, STEEL); }
  w.gap("반응로 고리 수직 통과", x + 22, 42, z, 0, 14, 14, 600, 90);
  w.gap("반응로 고리 수직 통과", x - 22, 42, z, 0, 14, 14, 600, 90);
  w.pipe(x, 88, z, x, 100, z, 0.25, WH);
  K.blink.add(x, 100.5, z, RED, 0.5, 0);
}

// ── 격납고 줄(북쪽): 남쪽 큰 문, 동서 옆문(세 동을 꿰는 터널), 안에는 셔틀과 정비 장비 ──
export function hangars(w, K) {
  const T = 1.6, DW = 36, DH = 17, SD = 14, SH = 11;
  HANGARS.forEach((cx, i) => {
    const x0 = cx - HW / 2, x1 = cx + HW / 2, z0 = HZ - HD / 2, z1 = HZ + HD / 2;
    const P = { mat: "std:panel", tile: 6 };
    // 뒷벽(북)
    w.box(cx, 0, z0, HW, HH, T, HULL, P);
    // 앞벽(남): 큰 문 양옆 + 문 위 상인방
    const sw = (HW - DW) / 2;
    for (const s of [-1, 1]) w.box(cx + s * (DW / 2 + sw / 2), 0, z1, sw, HH, T, HULL, P);
    w.box(cx, DH, z1, DW, HH - DH, T, HULL, P);
    w.box(cx, DH - 0.6, z1 + 0.9, DW + 1, 0.8, 0.4, YEL, { mat: "std:hazard", tile: 2, col: false });
    for (const s of [-1, 1]) w.box(cx + s * (DW / 2 + 0.3), 0, z1 + 0.9, 0.6, DH, 0.4, YEL, { mat: "std:hazard", tile: 2, col: false });
    // 옆벽(동·서): 가운데 옆문
    for (const xs of [x0, x1]) {
      const sd = (HD - SD) / 2;
      for (const s of [-1, 1]) w.box(xs, 0, HZ + s * (SD / 2 + sd / 2), T, HH, sd, HULL, P);
      w.box(xs, SH, HZ, T, HH - SH, SD, HULL, P);
      for (const s of [-1, 1]) w.box(xs + (xs > cx ? 0.9 : -0.9), 0, HZ + s * (SD / 2 + 0.3), 0.4, SH, 0.6, ORG, { col: false });
      w.box(xs + (xs > cx ? 0.9 : -0.9), SH - 0.5, HZ, 0.4, 0.5, SD + 1.2, ORG, { col: false });
      w.gap("격납고 터널", xs, SH / 2, HZ, 90, SD - 2, SH - 2, 350);
    }
    // 지붕: 평판 + 둥근 갈비뼈 + 천창
    w.box(cx, HH, HZ, HW + 2, 1.6, HD + 2, HULL2, P);
    for (let k = -2; k <= 2; k++) w.box(cx + k * 11, HH + 1.6, HZ, 1.2, 1.4, HD + 2, STEEL, { mat: "paint", col: false });
    w.box(cx, HH + 1.6, HZ, 8, 0.3, HD - 6, CYA, { mat: "glow", col: false });
    // 앞면 번호판·띠
    w.box(cx, HH - 3.2, z1 + 0.85, HW, 1.4, 0.3, NAVY, { mat: "paint", col: false });
    w.box(cx + DW / 2 + sw / 2, 7, z1 + 0.85, 7, 7, 0.3, i === 1 ? ORG : NAVY, { mat: "paint", col: false });
    for (let b = 0; b <= i; b++) w.box(cx + DW / 2 + sw / 2 - i + b * 2, 8, z1 + 1.05, 0.9, 5, 0.15, WH, { mat: "glow", col: false });
    // 실내: 바닥 유도선, 천장 조명, 정비 셔틀
    w.box(cx, 0.03, HZ, 1, 0.05, HD - 4, YEL, { col: false, ao: false });
    w.box(cx, 0.03, HZ, HW - 6, 0.05, 1, YEL, { col: false, ao: false });
    for (const s of [-1, 1]) for (const zz of [-12, 0, 12]) { w.box(cx + s * 14, HH - 0.6, HZ + zz, 6, 0.3, 1.2, 0xeaf6ff, { mat: "glow", col: false }); w.pool(cx + s * 14, 0.05, HZ + zz, 9, 0xd8eeff, 0.22); }
    if (i !== 1) shuttle(w, cx + (i ? 8 : -8), HZ - 6, i ? 20 : -20);
    else {
      // 가운데 격납고는 비워 두고 화물 더미만
      const cc = [ORG, NAVY, HULL2, 0x2f6fb0];
      for (let k = 0; k < 6; k++) w.container(cx - 16 + (k % 3) * 2, k > 2 ? 2.6 : 0, HZ - 16 + (k % 2) * 3, 90, cc[k % 4], 6);
    }
    w.gap("격납고 정문", cx, DH / 2, z1, 0, DW - 4, DH - 2, 250);
    K.blink.add(x0, HH + 2, z1, RED, 0.45, 0); K.blink.add(x1, HH + 2, z1, RED, 0.45, 1);
  });
}

// 정비 셔틀: 둥근 동체 + 삼각 날개 + 꼬리 (정적, 충돌 상자 근사)
export function shuttle(w, x, z, ry = 0, y = 0) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
  const [fx, fz] = P(0, -9), [bx2, bz2] = P(0, 9);
  w.pipe(fx, y + 3.6, fz, bx2, y + 3.6, bz2, 2.6, WH, { mat: "paint" });
  w.sph(fx, y + 3.6, fz, 2.6, WH, { mat: "paint", col: false });
  const [nx, nz] = P(0, -10.6); w.sph(nx, y + 3.9, nz, 1.3, INK, { mat: "glass", col: false });
  w.box(x, y + 2.4, z, 16, 0.6, 7, HULL, { mat: "paint", ry, col: false });
  w.box(x, y + 2.4, z + 0, 16.2, 0.25, 1, ORG, { ry, col: false, mat: "paint" });
  const [tx, tz] = P(0, 8); w.box(tx, y + 5.5, tz, 0.6, 4.6, 4, HULL, { mat: "paint", ry });
  const [ex, ez] = P(0, 9.6); w.cyl(ex, y + 3.6 - 0.5, ez, 1.2, 1, CYA, { mat: "glow", col: false });
  for (const [u, v] of [[-3, -5], [3, -5], [0, 5]]) { const [lx, lz] = P(u, v); w.pipe(lx, 0, lz, lx, y + 2.2, lz, 0.25, STEEL, { col: false }); }
  w.col.addBox(V3(x, y + 3.4, z), V3(3, 2.6, 10), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry * DEG, 0)));
  w.col.addBox(V3(x, y + 2.4, z), V3(8, 0.4, 3.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry * DEG, 0)));
}

// ── 도킹 구역(동쪽): 관제 탑 세 동과 갑판 밖으로 뻗은 도킹 암, 끝의 고정 고리, 정박한 수송선 ──
export function docks(w, K) {
  DOCKS.forEach((z, i) => {
    const x = DOCK_X;
    w.box(x, 0, z, 16, 28, 14, HULL, { mat: "std:panel", tile: 6 });
    w.box(x, 28, z, 18, 3, 16, DARK, { mat: "paint" });
    w.box(x, 21, z, 16.3, 3, 14.3, CYA, { mat: "glow", col: false });
    w.box(x, 22.4, z, 16.4, 0.4, 14.4, DARK, { col: false });
    for (const yy of [6, 12]) w.box(x - 8.1, yy, z, 0.3, 1, 10, AMB, { mat: "glow", col: false });
    w.pipe(x, 31, z, x, 42, z, 0.3, WH); K.blink.add(x, 42.5, z, RED, 0.45, i);
    // 암: 위아래 두 보 + 사선 가새, 끝에 고정 고리
    const xa = x + 8, xb = ARM_END, hw = 1.8;
    for (const dz of [-hw, hw]) for (const yy of [ARM_Y - 1.5, ARM_Y + 1.5]) beam(w, [xa, yy, z + dz], [xb, yy, z + dz], 0.8, yy > ARM_Y ? HULL : STEEL);
    for (let k = 0; k < 8; k++) {
      const u0 = xa + ((xb - xa) * k) / 8, u1 = xa + ((xb - xa) * (k + 1)) / 8;
      for (const dz of [-hw, hw]) beam(w, [u0, ARM_Y - 1.5, z + dz], [u1, ARM_Y + 1.5, z + dz], 0.35, STEEL, { col: false });
      beam(w, [u1, ARM_Y + 1.5, z - hw], [u1, ARM_Y + 1.5, z + hw], 0.35, STEEL, { col: false });
      if (k % 2) K.blink.add(u1, ARM_Y + 2.2, z, AMB, 0.28, k);
    }
    w.box((xa + xb) / 2, ARM_Y - 2.05, z, xb - xa, 0.2, 0.6, CYA, { mat: "glow", col: false });
    ring(w, xb + 1, ARM_Y, z, 6.5, 0.9, ORG, { yaw: 90, seg: 32 });
    ring(w, xb + 1.6, ARM_Y, z, 5.4, 0.25, CYA, { yaw: 90, seg: 32, mat: "glow", col: false });
    w.gap("도킹 암 아래", (xa + xb) / 2 + 10, ARM_Y / 2 - 1, z, 0, 3.6 + 10, ARM_Y - 6, 300);
    w.gap("도킹 고리 통과", xb + 1, ARM_Y, z, 90, 8, 8, 500);
  });
  // 정박한 수송선: 갑판 밖, 가운데 암 끝에 닿아 있다 (원경, 충돌 없음)
  const sx = 314, sz = DOCKS[1];
  w.pipe(sx, ARM_Y, sz - 70, sx, ARM_Y, sz + 60, 22, HULL, { mat: "std:panel", col: false });
  w.sph(sx, ARM_Y, sz - 70, 22, HULL, { mat: "paint", col: false, sy: 1 });
  for (const dz of [-40, -10, 20, 50]) w.pipe(sx, ARM_Y, sz + dz - 2, sx, ARM_Y, sz + dz + 2, 22.6, NAVY, { col: false });
  w.box(sx - 20, ARM_Y - 4, sz, 6, 8, 10, DARK, { col: false });
  for (const [dy, dx] of [[16, 0], [-16, 0], [0, 16], [0, -16]]) w.cyl(sx + dx, ARM_Y + dy - 6, sz + 64, 7, 12, STEEL, { col: false, mat: "metal" });
  for (const [dy, dx] of [[16, 0], [-16, 0], [0, 16], [0, -16]]) { w.pipe(sx + dx, ARM_Y + dy, sz + 66, sx + dx, ARM_Y + dy, sz + 70, 5.4, CYA, { mat: "glow", col: false }); }
  for (let k = 0; k < 10; k++) w.box(sx - 22.3, ARM_Y + 6, sz - 54 + k * 11, 0.3, 1.4, 6, AMB, { mat: "glow", col: false });
  w.box(sx, ARM_Y + 22, sz - 20, 10, 8, 26, HULL2, { mat: "paint", col: false });
  w.box(sx - 5.2, ARM_Y + 26, sz - 20, 0.3, 1.6, 22, CYA, { mat: "glow", col: false });
  // 도킹 구역 바닥: 화물 컨테이너 줄과 크레인 갠트리
  const cc = [ORG, NAVY, HULL2, 0x2f6fb0, YEL];
  for (let k = 0; k < 10; k++) w.container(176 + (k % 2) * 3, k >= 5 ? 2.6 : 0, -64 + (k % 5) * 3.2, 90, cc[k % 5], 6);
  for (const zz of [-85, 140]) {
    for (const s of [-1, 1]) beam(w, [186, 0, zz + s * 6], [186, 20, zz + s * 6], 1.2, ORG);
    for (const s of [-1, 1]) beam(w, [236, 0, zz + s * 6], [236, 20, zz + s * 6], 1.2, ORG);
    for (const s of [-1, 1]) beam(w, [186, 20, zz + s * 6], [236, 20, zz + s * 6], 1.4, ORG);
    w.box(205, 17.5, zz, 5, 2.5, 13, DARK, { mat: "paint" });
    w.gap("크레인 갠트리 아래", 211, 9, zz, 0, 44, 16, 200);
  }
}

// ── 방열판 숲(서쪽): 기둥 위에 세운 세로 방열판 줄. 판 사이 6 m 틈, 판 아래 5 m 틈. 갑판 밖으로는 거대한 날개 방열판 ──
export function radiators(w, K) {
  for (const x of RAD_X) {
    for (const z of RAD_Z) {
      const L = 24, y0 = 5, H = 16;
      w.box(x, y0, z, 1, H, L, WH, { mat: "std:panel", tile: 4 });
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) w.box(x + s * 0.55, y0 + 2.5 + k * 3.7, z, 0.12, 0.5, L - 2, k % 2 ? ORG : RED, { mat: "glow", col: false });
      w.box(x, y0 + H, z, 1.8, 0.9, L + 0.6, STEEL, { mat: "paint", col: false });
      w.box(x, y0 - 0.9, z, 1.8, 0.9, L + 0.6, STEEL, { mat: "paint" });
      for (const s of [-1, 1]) { w.pipe(x, 0, z + s * 8, x, y0 - 0.8, z + s * 8, 0.6, DARK); w.cyl(x, 0, z + s * 8, 1.4, 0.4, STEEL, { col: false }); }
    }
    // 줄 머리의 냉각 펌프
    w.box(x, 0, RAD_Z[RAD_Z.length - 1] + 18, 5, 4, 5, HULL2, { mat: "std:panel" });
    w.cyl(x, 4, RAD_Z[RAD_Z.length - 1] + 18, 1.8, 1.6, ORG, { mat: "paint", col: false });
    w.pipe(x, 2.5, RAD_Z[0] - 14, x, 2.5, RAD_Z[RAD_Z.length - 1] + 16, 0.7, NAVY, { col: false });
  }
  for (let i = 0; i < RAD_X.length - 1; i++) w.gap("방열판 사이", (RAD_X[i] + RAD_X[i + 1]) / 2, 10, -60, 0, 20, 14, 150);
  for (const z of RAD_Z.slice(0, -1)) w.gap("방열판 틈", RAD_X[1], 12, z + 15, 90, 4, 14, 400);
  // 갑판 밖으로 뻗은 날개 방열판 두 장
  for (const zc of [-150, 60]) {
    beam(w, [-238, 6, zc], [-430, 6, zc], 2, STEEL, { col: false });
    for (let k = 0; k < 6; k++) {
      const xx = -262 - k * 28;
      w.box(xx, 4, zc, 24, 0.6, 46, WH, { mat: "std:panel", col: false });
      for (let s = -2; s <= 2; s++) w.box(xx, 4.65, zc + s * 9, 22, 0.1, 0.6, s % 2 ? ORG : RED, { mat: "glow", col: false });
    }
  }
}

// ── 주포대(남쪽 가장자리): 팔각 받침, 회전 포탑 몸체, 우주로 겨눈 쌍열 포신 ──
export function guns(w, K) {
  GUNS.forEach(([x, z], i) => {
    octa(w, x, 0, z, 11, 3.5, DARK, { mat: "std:panel" });
    octa(w, x, 3.4, z, 11.3, 0.4, YEL, { col: false, mat: "std:hazard" });
    w.cyl(x, 3.8, z, 8, 1.4, STEEL, { mat: "paint" });
    const ry = (x < 0 ? 12 : -12) + (i % 2 ? 5 : -5);
    const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), P = (u, y, v) => [x + u * c + v * s, y, z - u * s + v * c];
    // 몸체
    w.box(x, 5.2, z, 13, 6, 12, HULL, { mat: "std:panel", ry });
    w.box(x, 11.2, z, 10, 1.4, 9, HULL2, { mat: "paint", ry });
    const [fx, , fz] = P(0, 0, 6.2); w.box(fx, 6.4, fz, 11, 3, 0.4, NAVY, { mat: "paint", ry, col: false });
    const [gx, , gz] = P(0, 0, -6.3); w.box(gx, 8.2, gz, 6, 1.1, 0.3, CYA, { mat: "glow", ry, col: false });
    // 포신: 위로 20도, 바깥(+z)
    const el = 22 * DEG, L = 30;
    for (const u of [-2.6, 2.6]) {
      const a = P(u, 8.6, 5), b = P(u, 8.6 + Math.sin(el) * L, 5 + Math.cos(el) * L);
      w.pipe(...a, ...b, 0.95, STEEL, { mat: "metal" });
      const m = P(u, 8.6 + Math.sin(el) * (L - 3), 5 + Math.cos(el) * (L - 3)), m2 = P(u, 8.6 + Math.sin(el) * (L + 0.4), 5 + Math.cos(el) * (L + 0.4));
      w.pipe(...m, ...m2, 1.35, DARK, { col: false });
      const g1 = P(u, 8.6 + Math.sin(el) * 6, 5 + Math.cos(el) * 6), g2 = P(u, 8.6 + Math.sin(el) * 7, 5 + Math.cos(el) * 7);
      w.pipe(...g1, ...g2, 1.15, CYA, { mat: "glow", col: false });
    }
    // 탄약 저장고·계단
    const [ax, , az] = P(-9, 0, -4); w.box(ax, 0, az, 5, 4, 7, HULL2, { mat: "std:panel", ry });
    K.blink.add(x, 12.6, z, RED, 0.4, i);
    w.pool(x, 0.05, z, 16, CYA, 0.12);
  });
  // 가장자리의 작은 근접 방어 포탑
  const n = OCT.length;
  for (let i = 0; i < n; i++) {
    const a = OCT[i], b = OCT[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L / 90));
    for (let j = 0; j < k; j++) {
      const t = (j + 0.5) / k, px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t, d = Math.hypot(px, pz), x = px - (px / d) * 7, z = pz - (pz / d) * 7;
      if (GUNS.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 26) || DOCKS.some((dz) => x > 200 && Math.abs(dz - z) < 16)) continue;
      w.cyl(x, 0, z, 2.6, 1.6, DARK, { mat: "paint" });
      w.sph(x, 1.6, z, 2.1, HULL, { mat: "paint", sy: 0.8 });
      const ux = px / d, uz = pz / d;
      w.pipe(x, 2.6, z, x + ux * 5, 4.6, z + uz * 5, 0.32, STEEL, { col: false });
      w.pipe(x + uz * 0.7, 2.6, z - ux * 0.7, x + ux * 5 + uz * 0.7, 4.6, z + uz * 5 - ux * 0.7, 0.32, STEEL, { col: false });
    }
  }
}

// ── 안테나 마스트: 격자탑 + 전파 접시 + 깜박이 ──
export function masts(w, K) {
  MASTS.forEach(([x, z, H], i) => {
    w.box(x, 0, z, 12, 2, 12, DARK, { mat: "paint" });
    lattice(w, x, 2, z, 2.6, H, Math.round(H / 7), HULL, { color2: ORG, t: 0.55, open: i % 2 ? "x" : "z" });
    w.pipe(x, H + 2, z, x, H + 20, z, 0.35, WH);
    K.blink.add(x, H + 20.5, z, RED, 0.55, i);
    for (const y of [H * 0.5, H * 0.8]) for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + i; w.pipe(x, y, z, x + Math.cos(a) * 7, y + 3, z + Math.sin(a) * 7, 0.18, WH, { col: false }); }
    dish(w, x - Math.sign(x) * 15, 0, z + (i === 2 ? 14 : -10), 6, (Math.atan2(-x, -z) / DEG) + 180, 50, { ph: 9 });
  });
}

// ── 캣워크 다리: 반응로 ↔ 도킹 관제탑(동), 반응로 ↔ 방열판 펌프(서). 아래로 도관이 지난다 ──
export function bridges(w, K) {
  const [rx, rz] = REACTOR, y = BRIDGE_Y;
  for (const [x0, x1, piers] of [[rx + 19, 202, [70, 115, 160]], [rx - 19, -144, [-60, -100]]]) {
    const L = Math.abs(x1 - x0), mx = (x0 + x1) / 2;
    w.box(mx, y, rz, L, 0.7, 4, HULL2, { mat: "std:panel" });
    for (const s of [-1, 1]) {
      w.box(mx, y + 0.7, rz + s * 1.9, L, 1.1, 0.12, STEEL, { col: false });
      beam(w, [x0, y + 1.9, rz + s * 1.9], [x1, y + 1.9, rz + s * 1.9], 0.18, ORG, { col: false });
    }
    w.box(mx, y - 0.25, rz, L, 0.2, 0.5, CYA, { mat: "glow", col: false });
    for (const px of piers) {
      for (const s of [-1, 1]) beam(w, [px, 0, rz + s * 3], [px, y, rz + s * 1.6], 0.9, STEEL);
      w.box(px, y - 1.6, rz, 1.2, 1.6, 5, DARK, { col: false });
      w.box(px, 0, rz, 3, 1, 8, DARK, { mat: "paint" });
      K.blink.add(px, y + 2.6, rz, AMB, 0.3, px & 1);
    }
    const n = Math.round(L / 30);
    for (let k = 0; k < n; k++) { const xx = Math.min(x0, x1) + (k + 0.5) * (L / n); w.gap("캣워크 다리 아래", xx, y / 2, rz, 90, 30, y - 4, 150); }
  }
  // 서쪽 끝 계단탑
  for (const tx of [-148, 206]) {
    w.box(tx, 0, rz, 8, y + 1.2, 8, HULL, { mat: "std:panel" });
    w.box(tx, y + 1.2, rz, 8.6, 0.5, 8.6, ORG, { col: false });
    w.box(tx + (tx < 0 ? 4.1 : -4.1), 4, rz, 0.3, 12, 1.4, CYA, { mat: "glow", col: false });
  }
}

// ── 에너지 도관: 반응로에서 사방으로 뻗는 굵은 관 두 가닥 + 청록 발광 띠 ──
export function conduits(w, K) {
  const [rx, rz] = REACTOR;
  const runs = [[[rx, rz - 26], [rx, -112]], [[rx, rz + 26], [rx, 40]], [[rx + 26, rz], [200, rz]], [[rx - 26, rz], [-142, rz]]];
  for (const [a, b] of runs) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    // 순환 도로와 만나는 곳은 갑판 아래로 숨긴다(덮개판)
    const nearRoad = (d) => Math.abs(Math.hypot(a[0] + ux * d, a[1] + uz * d) - ROAD_R) < 8;
    const pieces = []; let st = null;
    for (let d = 0; d <= L; d += 0.5) { const nr = nearRoad(d); if (!nr && st === null) st = d; if ((nr || d + 0.5 > L) && st !== null) { pieces.push([st, d]); st = null; } }
    for (let d = 0; d <= L; d += 0.5) if (nearRoad(d) && !nearRoad(d - 0.5)) { const x = a[0] + ux * (d + 8), z = a[1] + uz * (d + 8); w.box(x, 0, z, Math.abs(ux) > 0.5 ? 16 : 9, 0.25, Math.abs(ux) > 0.5 ? 9 : 16, DARK, { mat: "std:hazard", tile: 2, col: false }); }
    for (const s of [-1, 1]) {
      const ox = px * s * 2.2, oz = pz * s * 2.2;
      for (const [d0, d1] of pieces) w.pipe(a[0] + ux * d0 + ox, 1.5, a[1] + uz * d0 + oz, a[0] + ux * d1 + ox, 1.5, a[1] + uz * d1 + oz, 1.1, s > 0 ? HULL2 : STEEL, { mat: "paint" });
      for (let d = 6; d < L - 2; d += 9) if (!nearRoad(d)) w.pipe(a[0] + ux * d + ox, 1.5, a[1] + uz * d + oz, a[0] + ux * (d + 1) + ox, 1.5, a[1] + uz * (d + 1) + oz, 1.22, CYA, { mat: "glow", col: false });
    }
    for (let d = 10; d < L - 4; d += 18) {
      if (nearRoad(d)) continue;
      const x = a[0] + ux * d, z = a[1] + uz * d;
      w.box(x, 0, z, Math.abs(ux) > 0.5 ? 1.4 : 7.6, 1.2, Math.abs(ux) > 0.5 ? 7.6 : 1.4, DARK, { mat: "paint" });
    }
    w.box((a[0] + b[0]) / 2, 0.04, (a[1] + b[1]) / 2, Math.abs(ux) > 0.5 ? L : 9, 0.05, Math.abs(ux) > 0.5 ? 9 : L, 0x3c414c, { col: false, ao: false });
  }
}
