// 제국 코어 저장고 바탕: 동심 팔각 강철 바닥과 바깥 황무지, 순환로·대로·청록 에너지 도관, 주인공인 코어 저장고(속이 빈 16각 원자로 돔),
// 저장고를 두른 코어 사일로 여덟 기와 배관 다리·순환 배관, 팔각 성벽과 네 성문 망루·네 모서리 탐조등 탑
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, frame, ring, octa, V3, yawAcross, shell, band, duct, pulses, polar, sideFrame, DEG, hash,
  BLK, BLK2, IRON, STEEL, GUN, RED, RED2, DRED, HAZ, CYA, CYA2, CYA3, TEAL, ICE, NAVY, SLATE,
  WALL, WALL_H, WALL_T, VERT_R, VR, V_SH, V_TOP, V_CROWN, CORE_Y, ROAD_R, ROAD_HW, AVE, SILO_D, SILO_R, SILO_H, SILOS, PIPE_Y, MANI_Y,
} from "./vault-kit.js";

const ROADC = 0x1b1e24, I4 = new THREE.Matrix4();

// 평평한 고리 조각(월드 좌표 UV). r0~r1, 각 a0~a1(라디안)
function arcGeo(r0, r1, a0 = 0, a1 = Math.PI * 2, seg = 96, tile = 6) {
  const pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg, c = Math.cos(a), s = Math.sin(a);
    pos.push(c * r0, 0, s * r0, c * r1, 0, s * r1); nor.push(0, 1, 0, 0, 1, 0); uv.push((c * r0) / tile, (s * r0) / tile, (c * r1) / tile, (s * r1) / tile);
    if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
export function flatArc(w, x, y, z, r0, r1, color, mat = "glow", a0 = 0, a1 = Math.PI * 2, seg = 72) { const g = arcGeo(r0, r1, a0, a1, seg); w.mesh(g, M(x, y, z), color, mat); g.dispose(); }

// ── 바닥: 성벽 안은 동심 팔각 강철판 모자이크, 밖은 검은 황무지. 방위 a 에서 팔각형 가장자리까지의 거리로 고리를 늘린다 ──
export function ground(w) {
  const SEG = 64, oct = (a) => 1 / Math.cos(((((a / DEG + 22.5) % 45) + 45) % 45 - 22.5) * DEG);
  const build = (radii, tones, tile, key, vary) => {
    const pos = [], uv = [], col = [], c = new THREE.Color();
    for (let j = 0; j < radii.length - 1; j++) for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2, k0 = oct(a0), k1 = oct(a1), r0 = radii[j], r1 = radii[j + 1];
      const A = [Math.cos(a0) * r0 * k0, Math.sin(a0) * r0 * k0], B = [Math.cos(a0) * r1 * k0, Math.sin(a0) * r1 * k0], C = [Math.cos(a1) * r0 * k1, Math.sin(a1) * r0 * k1], D = [Math.cos(a1) * r1 * k1, Math.sin(a1) * r1 * k1];
      // 판 하나 = 고리 한 칸 × 방위 두 칸. 판마다 톤을 조금씩 달리한다
      c.set(tones[(hash(j * 7 + 3, (i >> 1) + j * 31) * tones.length) | 0]).multiplyScalar(1 + (hash(i, j) - 0.5) * vary);
      for (const q of [A, C, B, B, C, D]) { pos.push(q[0], 0, q[1]); uv.push(q[0] / tile, q[1] / tile); col.push(c.r, c.g, c.b); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, w.material(key)); m.receiveShadow = true; m.frustumCulled = false;
    w.scene.add(m); w.disposables.push(g, m.material);
  };
  build(Array.from({ length: 17 }, (_, i) => (i / 16) * WALL), [0x262b33, 0x222730, 0x2b3038, 0x1f242c, 0x282d36], 8, "std:panel", 0.07);
  build([WALL, 226, 262, 320, 430, 640, 1100, 2600], [0x191b1f, 0x1d1f22, 0x16181c, 0x1f2023], 16, "std:dirt", 0.12);
}

// ── 바닥 무늬: 저장고 광장, 안쪽 순환로, 네 대로(성문 밖까지), 사일로에서 저장고로 흐르는 청록 에너지 도관, 순찰로 ──
export function markings(w, K) {
  flatArc(w, 0, 0.02, 0, 0, ROAD_R - ROAD_HW, 0x1c2129, "std:panel");
  flatArc(w, 0, 0.03, 0, ROAD_R - ROAD_HW, ROAD_R + ROAD_HW, ROADC, "std:asphalt");
  flatArc(w, 0, 0.02, 0, ROAD_R + ROAD_HW, 98, 0x20252d, "std:panel");
  for (const r of [ROAD_R - ROAD_HW + 0.5, ROAD_R + ROAD_HW - 0.5]) for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 360 + 2.5, [x, z] = polar(a, r);
    w.box(x, 0.05, z, 0.35, 0.04, 2.6, i % 3 ? 0x7c828c : CYA, { mat: i % 3 ? "std" : "glow", col: false, ry: -a, ao: false });
  }
  // 대로: 저장고 관문 앞마당 → 순환로 → 성문 → 성 밖
  for (let i = 0; i < 4; i++) {
    const F = frame(w, 0, 0, 90 - i * 90);
    F.box(0, 0.035, 45, AVE * 2, 0.03, 13, ROADC, { mat: "std:asphalt", col: false, ao: false });
    F.box(0, 0.02, (ROAD_R + ROAD_HW + 246) / 2 - 0.5, AVE * 2, 0.03, 246 - ROAD_R - ROAD_HW + 1, ROADC, { mat: "std:asphalt", col: false, ao: false });
    for (let v = 66; v < 244; v += 8) {
      if (Math.abs(v - WALL) < 9) continue;
      const lit = (v / 8) & 1;
      for (const u of [-AVE + 0.5, AVE - 0.5]) F.box(u, 0.05, v, 0.35, 0.04, 3.4, lit ? RED : 0x70757e, { mat: lit ? "glow" : "std", col: false, ao: false });
      if (!lit) F.box(0, 0.05, v, 0.3, 0.04, 2.4, 0x8d9199, { col: false, ao: false });
    }
    // 성문 앞 정지선과 경고 무늬
    for (const v of [WALL - 14, WALL + 14]) F.box(0, 0.05, v, AVE * 2, 0.04, 1.2, HAZ, { mat: "std:hazard", tile: 2, col: false, ao: false });
  }
  // 저장고 광장의 팔각 무늬
  for (const [r, c] of [[43.2, CYA3], [48.6, 0x59606b]]) flatArc(w, 0, 0.045, 0, r, r + 0.4, c, c === CYA3 ? "glow" : "std", 0, Math.PI * 2, 16);
  // 에너지 도관: 사일로 → 저장고 → 주 코어. 덮개판 사이 홈으로 청록빛이 흐른다
  const runs = [];
  SILOS.forEach(([sx, sz, a]) => {
    const F = frame(w, 0, 0, 90 - a / DEG);
    F.box(0, 0.045, 55.3, 2.8, 0.04, 29.4, 0x0b0e12, { col: false, ao: false });
    F.box(0, 0.06, 55.3, 0.7, 0.05, 29.4, CYA, { mat: "glow", col: false, ao: false });
    F.box(0, 0.045, 25.5, 2.2, 0.04, 21, 0x0b0e12, { col: false, ao: false });
    F.box(0, 0.06, 25.5, 0.6, 0.05, 21, CYA, { mat: "glow", col: false, ao: false });
    for (const v of [44, 50, 62, 67]) F.box(0, 0.05, v, 4.2, 0.06, 0.6, 0x3a404a, { col: false, ao: false });
    runs.push([[Math.cos(a) * 69, Math.sin(a) * 69], [Math.cos(a) * 16, Math.sin(a) * 16]]);
  });
  pulses(w, runs, CYA, 3, 16, [4, 0.16, 1.1]);
  flatArc(w, 0, 0.05, 0, 67.7, 68.3, CYA3);
  flatArc(w, 0, 0.05, 0, 96.4, 97, 0x4c525c, "std");
  // 성벽 안쪽 순찰로와 성 밖 외곽로(팔각)
  for (let i = 0; i < 8; i++) {
    const F = sideFrame(w, i * 45, 184), L = 2 * 184 * Math.tan(22.5 * DEG);
    F.box(0, 0.015, 0, L + 3, 0.03, 8, 0x1d2026, { mat: "std:asphalt", col: false, ao: false });
    for (let u = -L / 2 + 5; u < L / 2; u += 10) if (Math.abs(u) > 10 || i % 2) F.box(u, 0.045, 0, 3, 0.03, 0.3, 0x6d727b, { col: false, ao: false });
    const G = sideFrame(w, i * 45, 222), L2 = 2 * 222 * Math.tan(22.5 * DEG);
    G.box(0, 0.015, 0, L2 + 4, 0.03, 9, 0x141619, { mat: "std:asphalt", col: false, ao: false });
    for (let u = -L2 / 2 + 6; u < L2 / 2; u += 12) if (Math.abs(u) > 10 || i % 2) G.box(u, 0.045, 0, 4, 0.03, 0.3, 0x5a5f66, { col: false, ao: false });
  }
}

// ── 코어 저장고: 16각 몸통(동서남북 관문) → 안으로 기우는 어깨 → 열린 왕관. 안은 비어 있고 한가운데 주 코어가 떠 있다 ──
export function vault(w, K) {
  const N = 16, portal = (k) => k % 4 === 0, VV = VR / Math.cos(11.25 * DEG), TH = 3.5;
  shell(w, 0, 0, [[0, VR], [22, VR], [V_SH, VR], [92, V_CROWN], [V_TOP, V_CROWN]], { thick: TH, color: BLK, inner: 0x0b1b24, skip: (k, t) => t === 0 && portal(k) });
  // 허리띠 셋과 어깨 테
  band(w, 0, 0, VR + 1, 22, 2.2, 1.4, IRON);
  band(w, 0, 0, VR + 0.25, 24.4, 0.5, 0.3, CYA, { mat: "glow" });
  band(w, 0, 0, VR + 1.2, V_SH - 1.6, 2.6, 1.6, IRON);
  band(w, 0, 0, VR + 1.35, V_SH - 0.7, 0.6, 0.2, CYA, { mat: "glow" });
  band(w, 0, 0, V_CROWN + 0.9, 91, 2, 1.2, IRON);
  band(w, 0, 0, V_CROWN + 1, V_TOP - 1.4, 1.8, 1.3, STEEL);
  for (let k = 0; k < N; k++) {
    const a = (k + 0.5) * 22.5, c = Math.cos(a * DEG), s = Math.sin(a * DEG);
    // 모서리 갈비뼈와 청록 틈빛
    w.box(c * (VV + 0.2), 0, s * (VV + 0.2), 2, V_SH, 2.6, BLK2, { mat: "paint", ry: 90 - a, col: false });
    w.box(c * (VV + 1.55), 26, s * (VV + 1.55), 0.5, 29, 0.14, CYA, { mat: "glow", ry: 90 - a, col: false });
    w.box(c * (VV + 1.55), 4, s * (VV + 1.55), 0.5, 15, 0.14, CYA2, { mat: "glow", ry: 90 - a, col: false });
    // 어깨 갈비뼈
    const cv = V_CROWN / Math.cos(11.25 * DEG);
    beam(w, [c * (VV + 0.3), V_SH, s * (VV + 0.3)], [c * (cv + 0.3), 92.4, s * (cv + 0.3)], 1.6, BLK2, { col: false });
    beam(w, [c * (VV + 0.6), V_SH + 2, s * (VV + 0.6)], [c * (cv + 0.9), 91.6, s * (cv + 0.9)], 0.38, CYA, { mat: "glow", col: false });
    // 안쪽 모서리 등
    w.box(c * (VV - TH - 0.9), 44, s * (VV - TH - 0.9), 0.5, 13, 0.14, CYA, { mat: "glow", ry: 90 - a, col: false });
  }
  for (let k = 0; k < N; k++) {
    const a = k * 22.5, F = frame(w, Math.cos(a * DEG) * VR, Math.sin(a * DEG) * VR, 90 - a);
    if (portal(k)) {
      // 관문: 문설주·상인방·차양, 문 위의 청록 문장
      for (const u of [-7.2, 7.2]) { F.box(u, 0, -TH / 2, 1.7, 22, TH + 1.2, IRON, { mat: "paint" }); F.box(u * 0.87, 1, 0.5, 0.3, 18.6, 0.2, CYA, { mat: "glow", col: false }); }
      F.box(0, 20.2, -TH / 2, 16, 2, TH + 1.2, IRON, { mat: "paint" });
      F.box(0, 19.4, 0.55, 12.6, 0.8, 0.3, HAZ, { mat: "std:hazard", tile: 2, col: false });
      F.box(0, 24.6, 2.4, 17.5, 1.1, 5.4, BLK2, { mat: "paint" });
      F.box(0, 24.2, 5.05, 13, 0.5, 0.2, RED, { mat: "glow", col: false });
      F.box(0, 30, 0.2, 1.6, 22, 0.3, CYA, { mat: "glow", col: false });
      for (const u of [-3.4, 3.4]) F.box(u, 34, 0.2, 0.7, 12, 0.3, CYA2, { mat: "glow", col: false });
      F.box(0, 0.05, 6, 12, 0.05, 0.6, CYA, { mat: "glow", col: false, ao: false });
      w.pool(F.X(0, 8), 0.05, F.Z(0, 8), 15, CYA, 0.5);
      F.gap("코어 저장고 관문", 0, 10, -TH / 2, 0, 12, 18, 400);
    } else {
      // 판벽 창: 세로 틈 둘
      for (const u of [-3.2, 3.2]) { F.box(u, 36, 0.12, 0.9, 16, 0.2, k % 2 ? CYA2 : CYA, { mat: "glow", col: false }); F.box(u, 35.4, 0.2, 1.7, 17.2, 0.25, IRON, { mat: "paint", col: false }); }
      if (k % 4 === 2) {
        // 버팀 날개(대각 방향): 계단형, 단마다 붉은 선
        F.box(0, 0, 4.4, 3.4, 30, 8.8, BLK2, { mat: "std:panel", tile: 6 });
        F.box(0, 30, 2.6, 3.4, 16, 5.2, BLK2, { mat: "std:panel", tile: 6 });
        F.box(0, 46, 1.3, 3.2, 10, 2.6, BLK2, { mat: "std:panel", tile: 6, col: false });
        F.box(0, 29.9, 6.9, 3.7, 0.5, 4, RED, { mat: "glow", col: false });
        F.box(0, 45.9, 3.9, 3.7, 0.5, 2.6, RED, { mat: "glow", col: false });
        F.box(0, 3, 8.86, 0.6, 25, 0.14, RED, { mat: "glow", col: false });
        K.blink.add(F.X(0, 8), 31.4, F.Z(0, 8), RED, 0.5, k >> 2);
      }
      // 안벽 코어 보관 선반: 훔쳐 온 에너지 코어가 줄지어 꽂혀 있다
      for (let sh = 0; sh < 4; sh++) {
        const y = 3 + sh * 8.4;
        F.box(0, y, -TH - 1.3, 12.4, 0.5, 2.6, IRON, { mat: "paint", col: sh < 3 });
        for (let j = -2; j <= 2; j++) { F.cyl(j * 2.4, y + 0.5, -TH - 1.3, 0.8, 2.8, (j + sh) % 3 ? CYA : ICE, { mat: "glow", col: false }); F.cyl(j * 2.4, y + 3.3, -TH - 1.3, 0.92, 0.45, GUN, { mat: "paint", col: false }); }
      }
    }
    // 어깨 판마다 점검창
    const ys = 74, rs = VR - ((ys - V_SH) / (92 - V_SH)) * (VR - V_CROWN);
    if (k % 2) w.box(Math.cos(a * DEG) * (rs + 0.2), ys, Math.sin(a * DEG) * (rs + 0.2), 4.6, 0.9, 0.4, CYA2, { mat: "glow", ry: 90 - a, rx: -25, col: false });
  }
  // 왕관: 빛 고리와 발톱 여덟
  ring(w, 0, V_TOP + 0.7, 0, V_CROWN - 1.2, 0.4, CYA, { pitch: 90, seg: 48, mat: "glow", col: false });
  ring(w, 0, V_TOP - 4, 0, V_CROWN - TH - 0.3, 0.3, CYA, { pitch: 90, seg: 48, mat: "glow", col: false });
  for (let k = 1; k < N; k += 2) {
    const c = Math.cos(k * 22.5 * DEG), s = Math.sin(k * 22.5 * DEG);
    beam(w, [c * 25.2, 95, s * 25.2], [c * 30, 113, s * 30], 2.4, BLK2, { tw: 3.4 });
    beam(w, [c * 24.2, 99, s * 24.2], [c * 28.4, 112.5, s * 28.4], 0.4, CYA, { mat: "glow", col: false });
    beam(w, [c * 30, 113, s * 30], [c * 27, 117, s * 27], 1.4, IRON, { col: false });
    K.blink.add(c * 27, 117.8, s * 27, CYA, 0.7, k >> 1);
  }
  // 실내: 바닥 빛 고리, 주 코어 받침, 순찰 통로
  for (const [r, c] of [[13.6, CYA], [26, CYA2], [35.2, CYA3]]) flatArc(w, 0, 0.06, 0, r, r + 0.5, c);
  w.pool(0, 0.06, 0, 46, CYA, 0.32);
  w.cyl(0, 0, 0, 10.5, 2.4, IRON, { mat: "std:panel" });
  w.cyl(0, 2.3, 0, 10.7, 0.3, CYA, { mat: "glow", col: false });
  w.cyl(0, 2.4, 0, 7, 3, BLK2, { mat: "paint", rt: 5.4 });
  w.cyl(0, 5.4, 0, 4.2, 6.6, GUN, { mat: "metal", rt: 2.4 });
  for (let i = 0; i < 4; i++) {
    const c = Math.cos((i * 90 + 45) * DEG), s = Math.sin((i * 90 + 45) * DEG);
    beam(w, [c * 6, 4.5, s * 6], [c * 10.4, 15, s * 10.4], 1.1, GUN, { col: false });
    beam(w, [c * 10.4, 15, s * 10.4], [c * 8.6, 21, s * 8.6], 0.8, GUN, { col: false });
    w.sph(c * 8.6, 21.4, s * 8.6, 0.7, CYA, { mat: "glow", col: false });
  }
  w.col.addSphere(V3(0, CORE_Y, 0), 7.2);
  band(w, 0, 0, VR - TH, 40, 0.6, 4.4, IRON, { mat: "std:panel", col: true });
  band(w, 0, 0, VR - TH - 4.3, 40.6, 1, 0.16, STEEL);
  band(w, 0, 0, VR - TH - 4.35, 39.7, 0.3, 0.2, CYA, { mat: "glow" });
  ring(w, 0, 76, 0, 27.4, 0.3, CYA2, { pitch: 90, seg: 48, mat: "glow", col: false });
  ring(w, 0, 60, 0, 35.6, 0.3, CYA2, { pitch: 90, seg: 48, mat: "glow", col: false });
  // 빛기둥: 주 코어에서 왕관을 지나 하늘로
  K.beams.add(0, CORE_Y - 2, 0, 5.2, 440, CYA, 0.62, 3.2);
  K.beams.add(0, 6, 0, 13, 330, CYA2, 0.1, 8);

  // ── 움직이는 주 코어: 천천히 숨 쉬듯 밝아지는 정이십면체, 엇갈려 도는 자이로 고리 셋, 빛 껍질 ──
  const cm = new THREE.MeshBasicMaterial({ color: 0x7af2ff });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(5.6, 1), cm); core.position.set(0, CORE_Y, 0);
  const shellM = new THREE.Mesh(new THREE.SphereGeometry(7.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0x2ad8ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(19, 20, 12), new THREE.MeshBasicMaterial({ color: 0x1ab0e0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.3, 2.6) });
  const rings = [9.4, 8.4, 7.6].map((r) => new THREE.Mesh(new THREE.TorusGeometry(r, 0.24, 6, 48), gm));
  for (const m of [core, shellM, halo, ...rings]) { m.position.set(0, CORE_Y, 0); m.frustumCulled = false; w.scene.add(m); }
  shellM.renderOrder = 6; halo.renderOrder = 6;
  const base = new THREE.Color(0x58ecff);
  w.updaters.push((dt, t) => {
    const br = 0.5 + 0.5 * Math.sin(t * 1.5), fl = Math.sin(t * 9.3) * 0.04;
    cm.color.copy(base).multiplyScalar(1.25 + br * 0.9 + fl);
    core.rotation.set(t * 0.17, t * 0.31, 0); core.scale.setScalar(1 + br * 0.06);
    shellM.scale.setScalar(1 + br * 0.16); shellM.material.opacity = 0.16 + br * 0.22;
    halo.material.opacity = 0.05 + br * 0.07;
    rings[0].rotation.set(t * 0.6, t * 0.35, 0); rings[1].rotation.set(-t * 0.45 + 1.1, 0, t * 0.5); rings[2].rotation.set(1.57, t * 0.8, t * 0.2);
  });
  // 왕관 위에서 빛기둥을 감싸고 도는 유도 고리 둘(움직임, 충돌 없음)
  const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 2.1, 2.4) });
  const hoops = [[15, 131], [11, 146]].map(([r, y]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 6, 56), hm); m.position.set(0, y, 0); m.frustumCulled = false; w.scene.add(m); w.disposables.push(m.geometry); return m; });
  w.disposables.push(hm);
  w.updaters.push((dt, t) => { hoops[0].rotation.set(Math.PI / 2 + Math.sin(t * 0.4) * 0.22, 0, t * 0.3); hoops[1].rotation.set(Math.PI / 2 + Math.cos(t * 0.33) * 0.3, 0, -t * 0.4); hoops[1].position.y = 146 + Math.sin(t * 0.5) * 3; });
  w.gap("코어 저장고 왕관 강하", 0, V_TOP - 2, 0, 0, 36, 36, 900, 90);
  w.gap("주 코어 옆 스치기", 0, CORE_Y, 0, 0, 62, 26, 500);
  w.gap("주 코어 옆 스치기", 0, CORE_Y, 0, 90, 62, 26, 500);
}

// ── 코어 사일로 여덟: 세로 틈으로 청록빛이 새는 검은 원통, 열린 머리 위에 뜬 코어, 저장고로 건너가는 배관 다리, 사일로끼리 잇는 순환 배관 ──
export function silos(w, K) {
  SILOS.forEach(([x, z, a], i) => {
    const ad = a / DEG, c = Math.cos(a), s = Math.sin(a);
    w.cyl(x, 0, z, 12.6, 3, IRON, { mat: "std:panel" });
    w.cyl(x, 2.7, z, 12.75, 0.35, CYA2, { mat: "glow", col: false });
    w.cyl(x, 3, z, SILO_R, SILO_H - 3, BLK, { mat: "std:panel", tile: 6 });
    for (const y of [11, 23, 35]) w.cyl(x, y, z, SILO_R + 0.4, 1.3, IRON, { mat: "paint", col: false });
    for (let k = 0; k < 8; k++) {
      const b = ad + k * 45 + 22.5, bc = Math.cos(b * DEG), bs = Math.sin(b * DEG);
      w.box(x + bc * (SILO_R - 0.05), 5.5, z + bs * (SILO_R - 0.05), 1.3, 34, 0.4, k % 2 ? CYA : CYA2, { mat: "glow", ry: 90 - b, col: false });
      for (const o of [-1.1, 1.1]) w.box(x + bc * SILO_R - bs * o, 4.5, z + bs * SILO_R + bc * o, 0.5, 36, 0.7, BLK2, { mat: "paint", ry: 90 - b, col: false });
    }
    // 머리: 테, 빛나는 코어 우물, 발톱 셋이 받친 떠 있는 코어
    w.cyl(x, SILO_H, z, SILO_R + 0.9, 1.8, STEEL, { mat: "paint", col: false });
    w.cyl(x, SILO_H + 1.75, z, 7.8, 0.3, CYA, { mat: "glow", col: false });
    w.cyl(x, SILO_H + 1.8, z, 3.4, 2.4, GUN, { mat: "metal", rt: 2.2, col: false });
    for (let k = 0; k < 3; k++) {
      const b = (ad + k * 120 + 60) * DEG, bc = Math.cos(b), bs = Math.sin(b);
      beam(w, [x + bc * 9.6, SILO_H + 1.6, z + bs * 9.6], [x + bc * 6.4, SILO_H + 10, z + bs * 6.4], 1, BLK2, { col: false });
      beam(w, [x + bc * 6.4, SILO_H + 10, z + bs * 6.4], [x + bc * 4, SILO_H + 12.4, z + bs * 4], 0.7, IRON, { col: false });
      K.blink.add(x + bc * 6.4, SILO_H + 10.8, z + bs * 6.4, CYA, 0.4, i + k);
    }
    w.sph(x, SILO_H + 8, z, 3.2, CYA, { mat: "glow", col: false });
    ring(w, x, SILO_H + 8, z, 4.6, 0.22, ICE, { pitch: 90, seg: 24, mat: "glow", col: false });
    w.col.addSphere(V3(x, SILO_H + 8, z), 4.6);
    K.beams.add(x, SILO_H + 6, z, 2.6, 190, CYA, 0.42, 1.6);
    w.pool(x, 0.05, z, 27, CYA, 0.3);
    // 점검 사다리와 제어함
    w.box(x + c * (SILO_R + 0.3), 3, z + s * (SILO_R + 0.3), 1.2, SILO_H - 3, 0.3, STEEL, { mat: "paint", ry: 90 - ad, col: false });
    w.box(x + c * 13.4, 0, z + s * 13.4, 3, 2.6, 2.2, SLATE, { mat: "paint", ry: 90 - ad });
    w.box(x + c * 14.52, 1.3, z + s * 14.52, 2, 0.5, 0.1, RED, { mat: "glow", ry: 90 - ad, col: false });
    // 저장고로 건너가는 배관 다리
    const P = (r, y, o = 0) => [c * r - s * o, y, s * r + c * o];
    duct(w, P(SILO_D - SILO_R + 0.4, PIPE_Y), P(VR - 0.6, PIPE_Y), 2, GUN, { glow: CYA, every: 7.4 });
    for (const o of [-3.3, 3.3]) {
      beam(w, P(SILO_D - SILO_R, PIPE_Y - 2.3, o), P(VR, PIPE_Y - 2.3, o), 0.55, STEEL);
      beam(w, P(SILO_D - SILO_R, PIPE_Y + 0.4, o), P(VR, PIPE_Y + 0.4, o), 0.22, IRON, { col: false });
      for (let r = VR + 2; r < SILO_D - SILO_R - 3; r += 7) beam(w, P(r, PIPE_Y - 2.3, o), P(r + 3.5, PIPE_Y + 0.4, o), 0.2, IRON, { col: false });
    }
    for (let r = VR + 3; r < SILO_D - SILO_R; r += 7) beam(w, P(r, PIPE_Y - 2.3, -3.3), P(r, PIPE_Y - 2.3, 3.3), 0.4, STEEL, { col: false });
    for (const r of [VR + 0.3, SILO_D - SILO_R - 0.3]) ring(w, c * r, PIPE_Y, s * r, 3.1, 0.6, IRON, { yaw: 90 - ad, seg: 20, col: false });
    ring(w, c * 55, PIPE_Y, s * 55, 2.5, 0.3, CYA, { yaw: 90 - ad, seg: 20, mat: "glow", col: false });
    K.blink.add(c * 55, PIPE_Y - 3.3, s * 55, CYA, 0.36, i);
    w.gap("배관 다리 아래", c * ROAD_R, 13, s * ROAD_R, yawAcross(c, s), 26, 24, 250);
    // 다음 사일로로 가는 순환 배관(세 마디)
    const pts = [0, 15, 30, 45].map((d, j) => { const b = (ad + d) * DEG, r = j === 0 || j === 3 ? SILO_D : SILO_D + 4.5; return [Math.cos(b) * r, MANI_Y, Math.sin(b) * r]; });
    for (const [q, t] of [[pts[0], pts[1]], [pts[3], pts[2]]]) { const L = Math.hypot(t[0] - q[0], t[2] - q[2]); q[0] += ((t[0] - q[0]) / L) * (SILO_R - 0.5); q[2] += ((t[2] - q[2]) / L) * (SILO_R - 0.5); }
    for (let j = 0; j < 3; j++) duct(w, pts[j], pts[j + 1], 1.3, IRON, { glow: CYA2, joint: STEEL, every: 8 });
    const mid = (ad + 22.5) % 360, [mx, mz] = polar(mid, SILO_D + 4.5);
    if (Math.round(mid) % 90 === 45) {
      // 대각 방향: 순환 배관을 받치는 밸브 탑
      w.box(mx, 0, mz, 5, 4, 5, SLATE, { mat: "std:panel", ry: -mid });
      w.box(mx, 4, mz, 2.2, MANI_Y - 5.3, 2.2, BLK2, { mat: "paint", ry: -mid });
      w.box(mx, 16, mz, 2.5, 0.6, 2.5, RED, { mat: "glow", ry: -mid, col: false });
      ring(w, mx, 6.2, mz, 1.8, 0.25, HAZ, { yaw: -mid + 90, seg: 16, col: false });
    } else w.gap("순환 배관 아래", mx, 17, mz, yawAcross(-Math.sin(mid * DEG), Math.cos(mid * DEG)), 26, 30, 200);
  });
}

// ── 팔각 성벽: 여덟 변의 판벽과 흉벽, 동서남북 성문 망루(아래는 차량 문, 위는 성벽 길이 꿰뚫는 통로), 대각 변의 모서리 탐조등 탑 ──
export const GATE_NAMES = ["동문", "남문", "서문", "북문"];
export function walls(w, K) {
  const half = VERT_R * Math.sin(22.5 * DEG), P = { mat: "std:panel", tile: 8 };
  for (let i = 0; i < 8; i++) {
    const a = i * 45, F = sideFrame(w, a), gate = i % 2 === 0, g = gate ? 18 : 11;
    for (const s of [-1, 1]) {
      const L = half - g + 1.2, uc = s * (g + L / 2 - 0.6);
      F.box(uc, 0, 0, L, WALL_H, WALL_T, BLK, P);
      F.box(uc, 0, 0, L, 3, WALL_T + 2, IRON, { mat: "paint", col: false });
      F.box(uc, WALL_H - 5.4, 0, L, 0.9, WALL_T + 0.3, RED, { mat: "glow", col: false });
      F.box(uc, WALL_H, WALL_T / 2 - 0.4, L, 1.2, 0.8, IRON, { mat: "paint", col: false });
      F.box(uc, WALL_H, 0, L, 0.12, WALL_T - 1.6, 0x2c3038, { col: false, ao: false });
      for (let u = g + 4; u < half - 3; u += 6) F.box(s * u, WALL_H + 1.2, WALL_T / 2 - 0.4, 3, 0.9, 0.8, BLK2, { mat: "paint", col: false });
      // 성벽 길 유도등: 순찰 코스를 따라 붉은 점선
      for (let u = g + 3; u < half - 2; u += 7) F.box(s * u, WALL_H + 0.12, -0.4, 2.6, 0.06, 0.34, (u / 7) & 1 ? RED2 : RED, { mat: "glow", col: false, ao: false });
      for (let u = g + 16; u < half - 8; u += 24) {
        F.box(s * u, 0, -WALL_T / 2 - 1.1, 3, WALL_H - 2.5, 2.4, BLK2, P);
        F.box(s * u, 5, -WALL_T / 2 - 2.36, 0.45, WALL_H - 11, 0.12, RED, { mat: "glow", col: false });
        F.box(s * u, 0, WALL_T / 2 + 1.6, 4, 11, 3.4, BLK2, { ...P, rx: -14 });
      }
    }
    if (gate) gatehouse(w, K, F, i >> 1); else cornerTower(w, K, F, i >> 1);
    // 꼭짓점 기둥
    const [vx, vz] = polar(a + 22.5, VERT_R);
    octa(w, vx, 0, vz, 5.2, WALL_H + 6, BLK2, { mat: "std:panel", ry: a });
    octa(w, vx, WALL_H + 6, vz, 6, 1.4, IRON, { mat: "paint", col: false, ry: a });
    octa(w, vx, WALL_H - 1, vz, 5.4, 0.8, RED, { mat: "glow", col: false, ry: a });
    w.pipe(vx, WALL_H + 7, vz, vx, WALL_H + 15, vz, 0.3, GUN, { col: false });
    K.blink.add(vx, WALL_H + 15.6, vz, RED, 0.55, i);
  }
}

// 성문 망루: 두 문기둥 사이로 차량이 드나들고(v 방향), 성벽 높이 위층 통로로는 성벽 길이 지난다(u 방향)
function gatehouse(w, K, F, n) {
  const P = { mat: "std:panel", tile: 8 }, D = 14;
  for (const s of [-1, 1]) {
    F.box(s * 12.6, 0, 0, 11.2, WALL_H, D, BLK2, P);
    F.box(s * 12.6, 0, 0, 12.2, 3.2, D + 1.6, IRON, { mat: "paint", col: false });
    for (const v of [-1, 1]) {
      F.box(s * 7.3, 0, v * (D / 2 + 0.25), 0.9, 13, 0.5, HAZ, { mat: "std:hazard", tile: 2, col: false });
      F.box(s * 13, 6, v * (D / 2 + 0.1), 0.6, 12, 0.2, RED, { mat: "glow", col: false });
      F.box(s * 13, 0, v * (D / 2 + 2.2), 5, 9, 3.6, BLK, { ...P, rx: -v * 16 });
    }
  }
  F.box(0, 13, 0, 14, WALL_H - 13, D, BLK2, P);
  for (const v of [-1, 1]) {
    F.box(0, 12.2, v * (D / 2 + 0.25), 14, 0.8, 0.5, HAZ, { mat: "std:hazard", tile: 2, col: false });
    F.box(0, 16, v * (D / 2 + 0.12), 9, 2.2, 0.2, RED, { mat: "glow", col: false });
    w.pool(F.X(0, v * 13), 0.05, F.Z(0, v * 13), 16, RED, 0.4);
    // 위층 통로의 옆벽(성 안쪽·바깥쪽): 감시창 띠
    F.box(0, WALL_H, v * (D / 2 - 0.7), 36.4, 13.4, 1.4, BLK, P);
    F.box(0, WALL_H + 6.4, v * (D / 2 + 0.06), 30, 0.9, 0.16, RED, { mat: "glow", col: false });
    F.box(0, WALL_H + 6.2, v * (D / 2 - 1.46), 30, 0.5, 0.12, RED2, { mat: "glow", col: false });
  }
  F.box(0, 12.7, 0, 1.2, 0.3, D - 2, RED, { mat: "glow", col: false });
  F.box(0, WALL_H, 0, 36, 0.14, D - 2.8, 0x2c3038, { col: false, ao: false });
  for (const u of [-18.4, 18.4]) F.box(u, WALL_H + 12.2, 0, 0.5, 0.9, D - 2.8, HAZ, { mat: "std:hazard", tile: 2, col: false });
  F.box(0, WALL_H + 13.4, 0, 39, 3, D + 2, IRON, P);
  F.box(0, WALL_H + 13.25, 0, 34, 0.2, 1, RED, { mat: "glow", col: false });
  // 지붕 위 지휘실과 안테나
  F.box(0, WALL_H + 16.4, 0, 19, 5.6, 9, BLK2, P);
  F.box(0, WALL_H + 19, 0, 19.3, 1, 9.3, RED, { mat: "glow", col: false });
  F.box(0, WALL_H + 22, 0, 20, 0.7, 10, IRON, { mat: "paint", col: false });
  for (const s of [-1, 1]) {
    const x = F.X(s * 15, 0), z = F.Z(s * 15, 0);
    w.pipe(x, WALL_H + 16.4, z, x, WALL_H + 27, z, 0.25, GUN, { col: false });
    K.blink.add(x, WALL_H + 27.5, z, RED, 0.45, n + (s > 0 ? 1 : 0));
  }
  F.gap(GATE_NAMES[n] + " 통과", 0, 6.5, 0, 0, 13, 12, 300);
  F.gap(GATE_NAMES[n] + " 망루 관통", 0, WALL_H + 6.7, 0, 90, 10.6, 12, 350);
}

// 모서리 탐조등 탑: 성벽 길이 밑동을 꿰뚫고, 꼭대기에 붉은 탐조등
function cornerTower(w, K, F, n) {
  const P = { mat: "std:panel", tile: 8 }, D = 16;
  F.box(0, 0, 0, 22, WALL_H, D, BLK2, P);
  F.box(0, 0, 0, 23.4, 3.2, D + 1.6, IRON, { mat: "paint", col: false });
  for (const v of [-1, 1]) {
    F.box(0, WALL_H, v * (D / 2 - 1), 22, 13.4, 2, BLK, P);
    F.box(0, WALL_H + 6.4, v * (D / 2 + 0.06), 17, 0.9, 0.16, RED, { mat: "glow", col: false });
    F.box(0, 5, v * (D / 2 + 0.06), 0.6, 13, 0.16, RED, { mat: "glow", col: false });
    for (const s of [-1, 1]) F.box(s * 9, 0, v * (D / 2 + 2), 3.4, 15, 4, BLK, { ...P, rx: -v * 13 });
  }
  F.box(0, WALL_H, 0, 22, 0.14, D - 4, 0x2c3038, { col: false, ao: false });
  for (const u of [-11.2, 11.2]) F.box(u, WALL_H + 12.2, 0, 0.5, 0.9, D - 4, HAZ, { mat: "std:hazard", tile: 2, col: false });
  F.box(0, WALL_H + 13.4, 0, 24, 3, D + 2, IRON, P);
  F.box(0, WALL_H + 16.4, 0, 14, 20, 11, BLK, P);
  F.box(0, WALL_H + 28, 0, 14.3, 1.2, 11.3, RED, { mat: "glow", col: false });
  for (const s of [-1, 1]) F.box(s * 7.1, WALL_H + 18, 0, 0.14, 8, 0.6, RED, { mat: "glow", col: false });
  F.box(0, WALL_H + 36.4, 0, 17, 1.4, 14, IRON, { mat: "paint" });
  F.box(0, WALL_H + 37.8, 0, 5, 2.2, 5, STEEL, { mat: "paint", col: false });
  const x = F.X(0, 0), z = F.Z(0, 0);
  w.pipe(x + 5, WALL_H + 37.8, z + 4, x + 5, WALL_H + 47, z + 4, 0.25, GUN, { col: false });
  K.blink.add(x + 5, WALL_H + 47.6, z + 4, RED, 0.55, n);
  K.lights.push([F.X(0, -2), WALL_H + 41.4, F.Z(0, -2), n * 1.7, 0.17 + n * 0.02, 40]);
  F.gap("모서리 탐조등 탑 관통", 0, WALL_H + 6.7, 0, 90, 11.6, 12, 350);
}
