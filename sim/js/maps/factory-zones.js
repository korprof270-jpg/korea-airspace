// 석양의 항만 — 추가 구역: 수로와 사장교, 정유 단지(증류탑·구형 탱크·플레어·냉각탑), 조선소(선체 늑골·골리앗 크레인),
// 조차장, 어시장, 공사 중 건물, 컨베이어와 벌크선, 유조선 잔교, 방파제와 등대, 바다 위의 배들
import * as THREE from "../../vendor/three.module.min.js";
import { PathMover, makeBoat } from "../entities.js";
import { M, beam, flora, prop } from "./canyon-kit.js";

export const QUAY = -128, CH0 = 198, CH1 = 230, SEA = -1.2;
export const BRIDGE_Z = 92, TOWER = [272, 150], HULL = [-254, -116, -36], SITE = [66, 160];
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const CONC = 0xa9a9a4, STEEL = 0x4a525c, RED = 0xd9432f, WHITE = 0xf2f0ea, YEL = 0xe0a52a;
const CC = [0xb5452f, 0x2f6fb0, 0x3d8b5a, 0xd9a441, 0x8a8f99, 0x7a3fa0, 0xc96a2b, 0x2a9d8f];

// 피어오르는 증기·연기 뭉치 (재질 하나를 나눠 쓴다)
export function plume(w, x, y, z, rad, rise, n = 3, color = 0xffffff, op = 0.5) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }), g = new THREE.IcosahedronGeometry(1, 1);
  const puffs = Array.from({ length: n }, () => { const p = new THREE.Mesh(g, m); p.renderOrder = 5; w.scene.add(p); return p; });
  w.updaters.push((dt, t) => puffs.forEach((p, i) => {
    const u = (t * 0.07 + i / n) % 1;
    p.position.set(x + u * rise * 0.4 + Math.sin(i * 2.4 + t * 0.3) * rad * 0.2, y + u * rise, z - u * rise * 0.2);
    p.scale.setScalar(rad * (0.45 + u * 1.1) * Math.min(1, u * 6) * Math.min(1, (1 - u) * 3.5) + 0.001);
  }));
}

// ── 수로(운하) 안벽과 사장교 ──
export function channel(w) {
  for (const [x, s] of [[CH0, -1], [CH1, 1]]) {
    w.box(x + s * 0.8, -4, 236, 1.6, 4.1, 728, CONC, { mat: "std:concrete", tile: 6 });
    w.box(x + s * 3, 0.02, 236, 0.5, 0.03, 728, 0xe0b52a, { col: false, ao: false });
    for (let z = -110; z <= 250; z += 24) w.cyl(x + s * 1.3, 0, z, 0.35, 0.8, 0x2c2f35, { mat: "paint", col: false });
  }
  const BZ = BRIDGE_Z, DY = 9, mid = (CH0 + CH1) / 2, co = { mat: "std:concrete", tile: 6 }, DK = 0x5a606a;
  w.box(mid, DY, BZ, 48, 1, 11, DK, co);
  const ang = Math.atan((DY + 0.8) / 38), deckY = (x) => DY + 1 - Math.max(0, Math.abs(x - mid) - 24) * Math.tan(ang);
  for (const s of [-1, 1]) {
    w.box(mid + s * 43, 4.1, BZ, 38 / Math.cos(ang), 1, 11, DK, { ...co, rz: -s * ang * 57.3 });
    w.box(mid + s * 35, 0, BZ, 1.6, 5.6, 8, CONC, co);
    w.box(mid, DY + 1, BZ + s * 5.3, 48, 0.9, 0.2, 0xd8d8d8, { col: false });
    for (let x = mid - 18; x <= mid + 18; x += 12) w.box(x, DY + 1.9, BZ + s * 5.3, 0.35, 0.35, 0.35, 0xffe2a8, { mat: "glow", col: false });
  }
  for (const px of [CH0 - 5, CH1 + 5]) {
    const lz = (y, sz) => BZ + sz * (7.5 - 5.9 * y / 50), dir = px < mid ? 1 : -1;
    for (const sz of [-1, 1]) {
      beam(w, [px, 0, lz(0, sz)], [px, 50, lz(50, sz)], 1.7, WHITE);
      for (let k = 0; k < 3; k++) {
        const ya = 47 - k * 3.6;
        for (const [d, far] of [[dir, 20 - k * 6], [-dir, 9 - k * 3]]) { const xa = px + d * far; beam(w, [px, ya, lz(ya, sz)], [xa, deckY(xa) + 0.1, BZ + sz * 5.2], 0.16, 0xe9e4d8); }
      }
    }
    beam(w, [px, 8.1, BZ - 6.5], [px, 8.1, BZ + 6.5], 1.2, WHITE); beam(w, [px, 36, BZ - 3.2], [px, 36, BZ + 3.2], 1.2, WHITE);
    w.box(px, 50, BZ, 2.4, 2.2, 5, RED, { mat: "paint" }); w.sph(px, 52.8, BZ, 0.45, 0xff3030, { mat: "glow", col: false });
    w.gap("사장교 주탑 사이", px, 19, BZ, 90, 6.6, 16, 450);
  }
  w.gap("사장교 아래", mid, 4, BZ, 0, 30, 8, 400);
}

// 쌍곡선 냉각탑: 꼭대기로 들어가 다리 사이로 빠져나올 수 있다
function coolingTower(w, x, z) {
  const yT = 36, rT = 10.5, b = 21.5, y0 = 6, y1 = 50, R = (y) => rT * Math.sqrt(1 + ((y - yT) / b) ** 2), prof = [];
  for (let i = 0; i <= 8; i++) { const y = y0 + ((y1 - y0) * i) / 8; prof.push(new THREE.Vector2(R(y), y)); }
  const outer = new THREE.LatheGeometry(prof, 24), inner = outer.clone(), idx = inner.index.array, N = inner.attributes.normal;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i));
  w.mesh(outer, M(x, 0, z), 0xdcd6c8, "std:concrete"); w.mesh(inner, M(x, 0, z), 0xa39e92, "std:concrete");
  const NA = 16, NL = 5, q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let l = 0; l < NL; l++) {
    const ya = y0 + ((y1 - y0) * l) / NL, yb = y0 + ((y1 - y0) * (l + 1)) / NL, ra = R(ya), rb = R(yb), rm = ((ra + rb) / 2) * Math.cos(Math.PI / NA);
    for (let i = 0; i < NA; i++) {
      const a = ((i + 0.5) / NA) * Math.PI * 2;
      e.set(Math.atan2(rb - ra, yb - ya), Math.PI / 2 - a, 0, "YXZ");
      w.col.addBox(V3(x + Math.cos(a) * rm, (ya + yb) / 2, z + Math.sin(a) * rm), V3(rm * Math.tan(Math.PI / NA) + 0.4, Math.hypot(yb - ya, rb - ra) / 2 + 0.2, 0.6), q.setFromEuler(e));
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2, tx = x + Math.cos(a) * R(y0), tz = z + Math.sin(a) * R(y0);
    for (const da of [-0.09, 0.09]) beam(w, [x + Math.cos(a + da) * 19, 0, z + Math.sin(a + da) * 19], [tx, y0 + 0.3, tz], 0.7, 0xb9b3a8, { mat: "std" });
  }
  w.cyl(x, 0, z, 16.5, 0.5, 0x3a7a8c, { col: false, ao: false, mat: "paint" });
  w.gap("냉각탑 다이브", x, 30, z, 0, 17, 17, 900, -90);
  plume(w, x, 50, z, 9, 50, 4, 0xfff4e6, 0.55);
}

// ── 정유 단지 (수로 동쪽 섬) ──
export function refinery(w) {
  const column = (x, z, rad, h, col) => {
    w.cyl(x, 0, z, rad, h, col, { mat: "metal" }); w.sph(x, h, z, rad, col, { mat: "metal", sy: 0.5, col: false });
    for (let y = 9; y < h - 3; y += 9) { w.cyl(x, y, z, rad + 1.4, 0.25, 0x3a3f47, { ao: false }); w.cyl(x, y + 1.1, z, rad + 1.4, 0.1, YEL, { col: false, ao: false }); }
    w.box(x + rad + 0.25, 0, z, 0.3, h - 2, 0.7, YEL, { col: false });
    w.sph(x, h + rad * 0.5 + 0.5, z, 0.4, 0xff3030, { mat: "glow", col: false });
  };
  column(250, -62, 3.4, 54, 0xcfd3d8); column(263, -48, 2.7, 42, 0xd9dde2); column(249, -40, 2.4, 34, 0xc9ced6); column(262, -78, 2.2, 30, 0xd9dde2);
  w.box(256.5, 27.2, -55, 13.5, 0.3, 1.5, STEEL, { ry: Math.atan2(-14, 13) * 57.3 });
  w.gap("증류탑 사이", 256.5, 14, -55, -47.2, 11, 22, 500);
  w.box(283, 0, -40, 10, 12, 9, 0x8a8f99, { mat: "std:panel", tile: 4 }); w.cyl(283, 12, -40, 1.3, 24, 0xb9b3a8); w.cyl(283, 30, -40, 1.45, 2, RED, { col: false });
  // 파이프 랙 (남북) 과 수로를 건너는 송유관 다리
  for (let z = -104; z <= -6; z += 14) { for (const x of [237.5, 242.5]) w.pipe(x, 0, z, x, 11.2, z, 0.2, 0x6b727c); for (const y of [7, 10.6]) w.box(240, y, z, 5.6, 0.35, 0.35, 0x6b727c, { col: false }); }
  for (const [x, y, c, rad] of [[238.4, 7.75, 0xc94a3a, 0.4], [240, 7.65, 0x3d7fc9, 0.3], [241.6, 7.7, 0xd9c23a, 0.35], [239, 11.4, 0xcfd3d8, 0.45], [241.2, 11.4, 0xcfd3d8, 0.45]]) w.pipe(x, y, -106, x, y, -4, rad, c);
  w.gap("정유 파이프 랙 아래", 240, 3.4, -55, 90, 12, 6, 400);
  const PZ = -60;
  for (const x of [193, 235]) for (const [dx, dz] of [[-1.5, -1.8], [1.5, -1.8], [-1.5, 1.8], [1.5, 1.8]]) w.pipe(x + dx, 0, PZ + dz, x + dx, 14.4, PZ + dz, 0.28, 0x6b727c);
  for (const dz of [-1.8, 1.8]) {
    for (const y of [11, 14.2]) beam(w, [188, y, PZ + dz], [240, y, PZ + dz], 0.45, YEL);
    for (let x = 190; x < 240; x += 6) { beam(w, [x, 11, PZ + dz], [x, 14.2, PZ + dz], 0.25, YEL, { col: false }); beam(w, [x, 11, PZ + dz], [x + 6, 14.2, PZ + dz], 0.2, YEL, { col: false }); }
  }
  for (const [dz, c] of [[-0.9, 0xc94a3a], [0, 0x3d7fc9], [0.9, 0xcfd3d8]]) { w.pipe(187, 11.8, PZ + dz, 240, 11.8, PZ + dz, 0.36, c); w.pipe(187, 11.8, PZ + dz, 187, 0, PZ + dz, 0.36, c); }
  w.box(190, 0, PZ - 10, 7, 4.5, 6, 0x6d7683, { mat: "std:corrug", tile: 3 });
  w.gap("송유관 다리 아래", 214, 4.8, PZ, 0, 30, 10, 400);
  // 구형 탱크 4기
  for (const [x, z] of [[252, 24], [276, 24], [252, 50], [276, 50]]) {
    w.sph(x, 11.5, z, 8.5, WHITE, { mat: "paint" }); w.cyl(x, 11.2, z, 8.56, 0.7, 0x2f6fb0, { col: false, ao: false, mat: "paint" }); w.cyl(x, 19.8, z, 2, 0.3, STEEL, { col: false });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283 + 0.5; w.pipe(x + Math.cos(a) * 7, 0, z + Math.sin(a) * 7, x + Math.cos(a) * 7, 9, z + Math.sin(a) * 7, 0.32, 0x8a8f99); }
  }
  for (const z of [24, 50]) w.box(264, 20.1, z, 22, 0.3, 1.4, STEEL);
  w.box(264, 20.1, 37, 1.4, 0.3, 24.6, STEEL);
  for (const z of [24, 50]) w.gap("구형 탱크 사이", 264, 9.5, z, 0, 6.4, 16, 500);
  for (const x of [252, 276]) w.gap("구형 탱크 사이", x, 9.5, 37, 90, 8.4, 16, 450);
  for (const [x, z, sx, sz] of [[264, 11, 50, 0.4], [264, 63, 50, 0.4], [239.5, 37, 0.4, 52], [288.5, 37, 0.4, 52]]) w.box(x, 0, z, sx, 1, sz, CONC, { mat: "std:concrete", tile: 4 });
  // 플레어 스택: 일렁이는 불꽃
  const fx = 284, fz = -104;
  w.cyl(fx, 0, fz, 0.9, 56, 0xb9b3a8, { mat: "metal" });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283; beam(w, [fx + Math.cos(a) * 8, 0, fz + Math.sin(a) * 8], [fx, 34, fz], 0.35, STEEL); }
  const flame = new THREE.Group(), fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.5, 0.35) }), fm2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 3.0, 1.4) });
  const fg = new THREE.ConeGeometry(2.3, 9, 8); fg.translate(0, 4.5, 0);
  const f1 = new THREE.Mesh(fg, fm), f2 = new THREE.Mesh(fg, fm2); f2.scale.set(0.5, 0.55, 0.5);
  flame.add(f1, f2); flame.position.set(fx, 56, fz); w.scene.add(flame);
  w.updaters.push((dt, t) => { const k = 1 + 0.18 * Math.sin(t * 9) + 0.12 * Math.sin(t * 23.7); flame.scale.set(1 + 0.1 * Math.sin(t * 13), k, 1 + 0.1 * Math.cos(t * 11)); flame.rotation.z = 0.12 * Math.sin(t * 3.1); });
  w.pool(fx, 0, fz, 34, 0xff9a4a, 0.5);
  coolingTower(w, TOWER[0], TOWER[1]);
  w.building(286, 112, 14, 10, 8, 0xb9b3a8);
  for (const z of [-60, 0, 60, 120]) { w.cyl(332, 0, z, 17, 14, 0xc9ced6, { mat: "metal", col: false }); w.cone(332, 14, z, 17, 2.4, 0xaab1ba, { col: false, mat: "std" }); }
  for (const [x, z, ry] of [[246, -116, 0], [292, -4, 90], [238, 126, 0], [292, 178, 90], [244, 192, 0]]) w.lamp(x, z, 9, 0xffd9a0, ry, 2);
  // 유조선 잔교와 유조선
  const JX = 262, X0 = 258, Z0 = -191, L = 80, B = 14, bx = X0 + L / 2 - 9;
  w.box(JX, 3.5, -153, 4, 0.5, 50, CONC, { mat: "std:concrete", tile: 4 }); w.box(JX, 3.5, -180, 22, 0.6, 6, CONC, { mat: "std:concrete", tile: 4 });
  for (let z = -133; z >= -178; z -= 10) for (const dx of [-1.6, 1.6]) w.pipe(JX + dx, -4, z, JX + dx, 3.5, z, 0.3, 0x5a5f68);
  for (const [dx, c] of [[-1.3, 0xc94a3a], [1.3, 0x3d7fc9]]) w.pipe(JX + dx, 4.4, -128, JX + dx, 4.4, -178, 0.3, c);
  for (const x of [254, 262, 270]) { w.pipe(x, 4.1, -180.5, x, 10.5, -180.5, 0.25, YEL); w.pipe(x, 10.5, -180.5, x, 7.2, -187, 0.2, YEL); }
  w.gap("유조선 잔교 아래", JX, 1.1, -148, 90, 8.4, 3.8, 700);
  w.box(X0, -1.4, Z0, L, 3.4, B, 0x8a2f26, { mat: "paint" }); w.box(X0, 2, Z0, L, 3, B, 0x1f2a36, { mat: "paint" });
  w.box(X0, 5, Z0, L - 2, 0.25, B - 1, 0x7a4a3a, { mat: "std:panel", tile: 4 });
  w.box(X0 - L / 2 - 3.4, -1.4, Z0, 7, 6.4, 9.6, 0x1f2a36, { mat: "paint", ry: 45 });
  w.box(bx, 5.2, Z0, 10, 11, 12, WHITE, { mat: "std:facade", tile: 24, ao: false }); w.box(bx - 1, 16.2, Z0, 6, 2.6, 15, WHITE, { mat: "paint" });
  w.cyl(bx + 3, 16.2, Z0, 1.6, 6, 0x2f6fb0, { mat: "paint" });
  for (const dz of [-1.2, 1.2]) w.pipe(X0 - L / 2 + 8, 6.4, Z0 + dz, bx - 7, 6.4, Z0 + dz, 0.4, 0xc94a3a);
  for (let i = 0; i < 5; i++) { const x = X0 - L / 2 + 14 + i * 11; w.pipe(x, 6.4, Z0 - 5.5, x, 6.4, Z0 + 5.5, 0.3, 0xd9c23a); w.cyl(x + 5, 5.2, Z0 + (i % 2 ? 3.6 : -3.6), 1.6, 1, 0x9aa3ad, { mat: "metal", col: false }); }
}

// ── 사일로 → 부두 컨베이어, 선적기와 벌크선 ──
export function conveyor(w) {
  const X = 182, GY = 17, GAL = 0x8a8f99;
  for (let z = -112; z < 150; z += 29.2) w.box(X, GY, z + 14.6, 3.2, 3, 29.2, GAL, { mat: "std:corrug", tile: 3 });
  for (let z = -100; z <= 140; z += 30) { for (const s of [-1, 1]) beam(w, [X + s * 3.4, 0, z], [X + s * 1, GY, z], 0.5, STEEL); beam(w, [X - 2.2, 8.5, z], [X + 2.2, 8.5, z], 0.3, STEEL, { col: false }); }
  w.box(X, 0, 153, 6, 24, 6, 0x6d7683, { mat: "std:corrug", tile: 3 }); w.box(X, 0, -115, 6, 27, 6, 0x6d7683, { mat: "std:corrug", tile: 3 });
  w.box(173, 27.2, 156.5, 16.6, 2.2, 2.4, YEL, { mat: "paint", rz: -42 });
  w.box(X, 23, -135, 2.6, 1.6, 34, YEL, { mat: "paint" }); w.pipe(X, 27, -115, X, 38, -115, 0.4, YEL);
  beam(w, [X, 38, -115], [X, 24.6, -150], 0.18, 0x30343a, { col: false }); w.pipe(X, 23, -150, X, 11.5, -150, 0.7, STEEL); w.sph(X, 38.6, -115, 0.4, 0xff3030, { mat: "glow", col: false });
  for (const z of [-55, 35, 95]) w.gap("컨베이어 아래", X, 8, z, 90, 24, 15, 300);
  w.gap("선적기 붐 아래", X, 15.2, -136, 90, 20, 13, 450);
  // 벌크선 (x 110..186)
  const X0 = 148, Z0 = -150, L = 76, B = 18, bx = X0 - L / 2 + 8;
  w.box(X0, -1.4, Z0, L, 4, B, 0x8a2f26, { mat: "paint" }); w.box(X0, 2.6, Z0, L, 3.4, B, 0x1d3b2f, { mat: "paint" });
  w.box(X0, 6, Z0, L - 2, 0.25, B - 1, 0x4d6b5a, { mat: "std:panel", tile: 4 });
  w.box(X0 + L / 2 + 4, -1.4, Z0, 9, 7.4, 11.5, 0x1d3b2f, { mat: "paint", ry: 45 });
  w.box(bx, 6.2, Z0, 11, 12, 14, WHITE, { mat: "std:facade", tile: 24, ao: false }); w.box(bx + 1, 18.2, Z0, 7, 2.8, 18, WHITE, { mat: "paint" });
  w.cyl(bx - 3, 18.2, Z0, 1.8, 6.5, 0xd9a441, { mat: "paint", rt: 1.5 });
  for (let i = 0; i < 4; i++) {
    const x = X0 - L / 2 + 26 + i * 14;
    w.box(x, 6.2, Z0, 11, 1.2, 11, 0x2f4a3d, { mat: "paint" });
    if (i === 3) w.box(x, 6.6, Z0, 9.6, 1.3, 9.6, 0xd9b45a, { mat: "std:dirt", tile: 3, col: false }); else w.box(x, 7.4, Z0, 11.4, 0.4, 11.4, 0x3d6b5a, { mat: "std:corrug", tile: 2 });
  }
}

// ── 조선소 (서쪽): 선대 위의 선체 늑골, 골리앗 크레인과 매달린 선체 블록 ──
export function shipyard(w) {
  const [hx, z0, z1] = HULL, PRIME = 0xb5482f, n = Math.round((z1 - z0) / 6);
  w.box(hx, 0.02, (z0 + z1) / 2, 30, 0.3, z1 - z0 + 16, 0x9a9da2, { col: false, mat: "std:concrete", tile: 5 });
  w.box(hx, 0.3, (z0 + z1) / 2, 0.9, 1, z1 - z0, STEEL);
  const hwAt = (i) => 8 * Math.min(1, 0.55 + i * 0.25, 0.7 + (n - i) * 0.3);
  for (let i = 0; i <= n; i++) {
    const z = z0 + i * 6, hw = hwAt(i);
    for (const s of [-1, 1]) {
      beam(w, [hx, 1.2, z], [hx + s * hw * 0.8, 2.4, z], 0.5, PRIME); beam(w, [hx + s * hw * 0.8, 2.4, z], [hx + s * hw, 6.5, z], 0.5, PRIME); beam(w, [hx + s * hw, 6.5, z], [hx + s * hw, 12.8, z], 0.5, PRIME);
      if (i < n) { const hw2 = hwAt(i + 1); for (const y of [6.5, 12.8]) beam(w, [hx + s * hw, y, z], [hx + s * hw2, y, z + 6], 0.36, PRIME, { col: false }); }
      if (i >= n - 3 && i < n) { const hw2 = hwAt(i + 1); w.box(hx + s * (hw + hw2) / 2, 2.4, z + 3, 0.25, 10.4, 6.1, 0x8a8f99, { mat: "std:panel", tile: 3 }); }
    }
    if (i % 2 === 0) beam(w, [hx - hw, 12.8, z], [hx + hw, 12.8, z], 0.4, PRIME);
    if (i % 3 === 1) for (const s of [-1, 1]) w.box(hx + s * 3, 0, z, 1.2, 1.2, 1.2, 0x7a5a3a, { mat: "std:wood", tile: 2, col: false });
  }
  w.gap("선체 늑골 터널", hx, 7, z0 + 30, 0, 13, 9.6, 500); w.gap("선체 늑골 터널", hx, 7, z1 - 9, 0, 13, 9.6, 500);
  // 비계
  for (const z of [z0 + 22, z0 + 46]) { for (const dx of [11, 14]) for (const dz of [-4, 4]) w.pipe(hx + dx, 0, z + dz, hx + dx, 13, z + dz, 0.09, 0x9aa3ad, { col: false }); for (const y of [4.3, 8.6, 12.9]) w.box(hx + 12.5, y, z, 3.4, 0.15, 8.6, YEL); }
  // 골리앗 크레인 (z = -78)
  const gz = -78, gy = 58, xa = hx - 40, xb = hx + 38;
  w.box(hx - 1, gy, gz, 84, 6, 5, RED, { mat: "paint" });
  for (const x of [hx - 22, hx + 20]) w.box(x, gy + 1.5, gz, 10, 3, 5.1, WHITE, { mat: "paint", col: false });
  for (const s of [-1, 1]) { beam(w, [xa, 0, gz + s * 13], [xa, gy, gz + s * 2], 2.4, RED); beam(w, [xb, 0, gz + s * 9], [xb, gy, gz + s * 1.2], 1.5, RED); w.box(xa, 0, gz + s * 13, 3.4, 2, 5, STEEL); w.box(xb, 0, gz + s * 9, 2.6, 2, 4, STEEL); }
  beam(w, [xa, 22, gz - 8.8], [xa, 22, gz + 8.8], 1.4, RED);
  for (const x of [xa, xb]) w.box(x, 0.03, -72, 0.5, 0.12, 110, 0x5a5f68, { col: false, mat: "metal", ao: false });
  for (const x of [hx - 40, hx, hx + 36]) w.sph(x, gy + 6.5, gz, 0.45, 0xff3030, { mat: "glow", col: false });
  w.box(hx, gy - 3, gz, 7, 3, 6.4, STEEL);
  for (const [dx, dz] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]]) beam(w, [hx + dx * 0.4, gy - 3, gz + dz * 0.6], [hx + dx, 28.5, gz + dz], 0.1, 0x22262c, { col: false });
  w.box(hx, 21, gz, 12, 7.4, 8, 0x9c5a3a, { mat: "std:panel", tile: 4 }); w.box(hx, 28.4, gz, 12.4, 0.3, 8.4, PRIME);
  w.gap("매달린 선체 블록 아래", hx, 17, gz, 0, 11, 6.6, 600);
  w.gap("골리앗 다리 사이", xa, 11, gz, 90, 16, 20, 400);
  // 철판 더미와 블록
  for (const [x, z, ry] of [[hx + 26, -40, 10], [hx + 30, -112, 80], [hx - 30, -30, 0]]) for (let k = 0; k < 4; k++) w.box(x, k * 0.32, z, 9 - k * 0.5, 0.3, 4, [0x7a7f88, 0x8a6a52, 0x6f7781][k % 3], { ry: ry + k * 3, mat: "metal" });
  w.box(hx + 34, 0, -8, 12, 7, 9, 0x9c5a3a, { mat: "std:panel", tile: 4, ry: 12 });
  for (const [x, z] of [[hx + 22, -124], [hx - 26, -124], [hx - 30, -60], [hx - 36, -4]]) w.lamp(x, z, 10, 0xffd9a0, 0, 2);
}

// ── 어시장 (서쪽 부두): 줄지은 천막 지붕과 어선 ──
export function fishMarket(w) {
  const ROOF = [0x2a9d8f, WHITE, 0xe94f37, 0xffc23a, 0x2f6fb0];
  for (let i = 0; i < 5; i++) {
    const x = -190 + i * 17, z = -117;
    for (const dx of [-6.6, 6.6]) for (const dz of [-4.4, 4.4]) w.pipe(x + dx, 0, z + dz, x + dx, 4.2, z + dz, 0.14, 0x59606a);
    for (const s of [-1, 1]) w.box(x, 4.75, z + s * 2.45, 14.4, 0.18, 5.4, s > 0 ? ROOF[i] : ROOF[(i + 1) % 5], { mat: "std:corrug", tile: 2, rx: s * 14 });
    w.box(x, 0, z + 4.4, 13.2, 3, 0.2, 0x6d7683, { mat: "std:corrug", tile: 2 });
    for (let k = 0; k < 5; k++) w.box(x - 5 + k * 2.5, 0, z + 2.6 + (k % 2) * 0.5, 1.6, 0.7 + (k % 3) * 0.35, 1.1, [WHITE, 0x2f6fb0, 0xffc23a][k % 3], { col: k === 2 });
    w.box(x, 4.1, z, 9, 0.12, 0.3, 0xfff0c8, { mat: "glow", col: false }); w.pool(x, 0, z, 9, 0xffe2b0, 0.4);
  }
  w.gap("어시장 천막 아래", -156, 2.3, -118.4, 90, 5, 3.4, 600);
  for (let i = 0; i < 4; i++) {
    const x = -188 + i * 21, z = -135.5, c = [0x2f6fb0, 0xe94f37, 0x3d8b5a, 0xf2f0ea][i];
    w.box(x, -1.5, z, 10, 2.2, 3.4, c, { mat: "paint" }); w.box(x + 5.8, -1.5, z, 2.4, 2.2, 2.4, c, { mat: "paint", ry: 45 });
    w.box(x - 2.4, 0.7, z, 3, 2.1, 2.6, WHITE, { mat: "paint" }); w.pipe(x + 1.5, 0.7, z, x + 1.5, 5.6, z, 0.07, 0x3a3f47, { col: false });
    for (let k = 0; k < 5; k++) w.box(x - 3 + k * 1.9, 3.9 + Math.abs(k - 2) * 0.35, z, 0.26, 0.26, 0.26, 0xfff0b0, { mat: "glow", col: false });
  }
}

// ── 조차장 (남쪽): 유치선의 화차, 달리는 화물 열차, 신호 문형탑, 기관고, 과선교 ──
export function railYard(w) {
  const TZ = [222, 230, 238, 246];
  for (const z of TZ) { w.box(0, 0.03, z, 860, 0.08, 3.2, 0x4a4036, { col: false, ao: false }); for (const s of [-0.75, 0.75]) w.box(0, 0.1, z + s, 860, 0.1, 0.14, 0x8a8f99, { col: false, mat: "metal", ao: false }); }
  for (let i = 0; i < 7; i++) w.box(-104 + i * 15.5, 0.5, 222, 14, 3.4, 2.9, [0x6b4a3a, 0x3d5a6b, 0x7a6a3a, 0x444a52][i % 4], { mat: "std:corrug", tile: 2.6 });
  for (let i = 0; i < 5; i++) { const x = 66 + i * 15; w.pipe(x - 5.4, 2.6, 238, x + 5.4, 2.6, 238, 1.45, i % 2 ? 0xcfd3d8 : 0x2c3138, { mat: "paint" }); w.box(x, 0.5, 238, 12.6, 0.6, 2.6, 0x2c3138); }
  w.box(-112, 0.5, 230, 15, 3.9, 3, 0xd9772f, { mat: "paint" }); w.box(-116.5, 4.4, 230, 4, 1.2, 2.8, 0x2c3138, { mat: "paint" });
  w.box((CH0 + CH1) / 2, -0.7, 234, CH1 - CH0 + 6, 0.7, 34, 0x5a5f68, { mat: "std:concrete", tile: 6 });
  for (const z of [219, 249]) w.box((CH0 + CH1) / 2, -4, z, 3, 3.4, 3, CONC, { mat: "std:concrete", tile: 4 });
  // 신호 문형탑
  const gx = 30;
  for (const z of [217.5, 250.5]) beam(w, [gx, 0, z], [gx, 9, z], 0.6, STEEL);
  for (const y of [8, 9.4]) beam(w, [gx, y, 217.5], [gx, y, 250.5], 0.4, STEEL);
  for (let z = 219; z < 250; z += 4.5) beam(w, [gx, 8, z], [gx, 9.4, z + 2.2], 0.16, STEEL, { col: false });
  TZ.forEach((z, i) => { w.box(gx, 9.6, z, 0.6, 2, 0.9, 0x16181d); w.sph(gx - 0.4, 11, z, 0.3, i === 3 ? 0x35ff7a : 0xff3030, { mat: "glow", col: false }); w.sph(gx - 0.4, 10.2, z, 0.3, i === 3 ? 0x1f5a34 : 0x5a1f1f, { mat: "paint", col: false }); });
  w.gap("신호 문형탑 아래", gx, 4.2, 234, 90, 30, 7, 350);
  // 기관고 (양쪽이 뚫린 차고)
  const sx = -160, sz = 226;
  for (const s of [-1, 1]) { w.box(sx, 0, sz + s * 8.2, 40, 9, 0.5, 0x8b6f5a, { mat: "std:brick", tile: 3 }); w.box(sx, 10, sz + s * 4.3, 41, 0.3, 9.4, 0x4a4f58, { mat: "std:corrug", tile: 2, rx: s * 12 }); }
  for (const x of [sx - 20, sx + 20]) w.box(x, 9, sz, 0.5, 1.2, 16.9, 0x8b6f5a, { mat: "std:brick", tile: 3 });
  for (let x = sx - 14; x <= sx + 14; x += 14) w.box(x, 8.6, sz, 0.3, 0.2, 2, 0xfff0c8, { mat: "glow", col: false });
  w.gap("기관고 관통", sx, 4.4, sz, 90, 14.6, 8, 450);
  // 과선교
  const fx = -60;
  for (const z of [214, 254]) { w.box(fx, 0, z, 3.4, 8, 3.4, 0x6d7683, { mat: "std:concrete", tile: 4 }); w.box(fx + 6, 3.6, z, 11.5, 0.4, 2.2, STEEL, { rz: -40 }); }
  w.box(fx, 8, 234, 3, 0.4, 40, STEEL); for (const s of [-1.4, 1.4]) w.box(fx + s, 8.4, 234, 0.1, 1.1, 40, YEL, { col: false });
  w.gap("과선교 아래", fx, 4, 234, 90, 34, 7, 350);
  // 급수탑과 담장
  for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) w.pipe(150 + dx, 0, 212 + dz, 150 + dx * 0.8, 12, 212 + dz * 0.8, 0.22, STEEL);
  w.cyl(150, 12, 212, 4, 6, 0xb5673c, { mat: "std:corrug", tile: 2 }); w.cone(150, 18, 212, 4.4, 2, 0x5a3a2c, { mat: "std", col: false, grad: [0.8, 1.05] });
  w.box(-51, 0, 262, 498, 3, 0.6, 0x8d9197, { mat: "std:concrete", tile: 6 });
  for (let x = -280; x <= 180; x += 46) w.lamp(x, 256, 10, 0xffd9a0, 180, 2);
  // 달리는 화물 열차 (가장 바깥 선로, 보이기만 한다)
  const parts = [[new THREE.BoxGeometry(17, 3.6, 3), M(0, 2.4, 0), 0xd9432f], [new THREE.BoxGeometry(4, 1.3, 3.04), M(5, 4.6, 0), 0xf2f0ea], [new THREE.BoxGeometry(0.2, 0.5, 2), M(8.6, 2.2, 0), 0xfff2c0]];
  for (let i = 1; i <= 9; i++) { parts.push([new THREE.BoxGeometry(14, 0.5, 2.8), M(-i * 15.5, 0.85, 0), 0x2c3138]); if (i % 4) parts.push([new THREE.BoxGeometry(12.2, 2.6, 2.44), M(-i * 15.5, 2.4, 0), CC[(i * 3) % CC.length]]); else parts.push([new THREE.CylinderGeometry(1.4, 1.4, 12, 10), M(-i * 15.5, 2.5, 0, 1, 1, 1, 0, 0, 90), 0xcfd3d8]); }
  const train = prop(w, parts);
  w.updaters.push((dt, t) => train.position.set(((t * 11) % 1100) - 420, 0.1, 246));
}

// ── 공사 중인 건물 (층마다 뚫려 있고 가운데가 비어 있다) 과 타워 크레인 ──
export function site(w) {
  const [cx, cz] = SITE, SL = 0xb9b6ae, so = { mat: "std:concrete", tile: 5 };
  for (const dx of [-18, 0, 18]) for (const dz of [-18, 0, 18]) if (dx || dz) w.box(cx + dx, 0, cz + dz, 1.2, 28, 1.2, CONC, so);
  for (let k = 1; k <= 5; k++) {
    const y = k * 5.5;
    for (const s of [-1, 1]) { w.box(cx, y, cz + s * 13.5, 40, 0.5, 13, SL, so); w.box(cx + s * 13.5, y, cz, 13, 0.5, 14, SL, so); w.box(cx, y + 0.5, cz + s * 19.9, 40, 0.3, 0.12, 0xff7a1a, { col: false }); w.box(cx + s * 19.9, y + 0.5, cz, 0.12, 0.3, 40, 0xff7a1a, { col: false }); }
    if (k < 5) w.box(cx + (k % 2 ? 14 : -14), y + 0.5, cz + (k % 2 ? -15 : 15), 3, 1.4, 2, k % 2 ? 0x9b6b3d : 0x3d6b8c, {});
  }
  for (let k = 0; k < 5; k++) { w.gap(`공사장 ${k + 1}층 관통`, cx, k * 5.5 + 3.1, cz - 11, 90, 13, 4.4, 320 + k * 50); w.gap(`공사장 ${k + 1}층 관통`, cx - 9, k * 5.5 + 3.1, cz, 0, 15, 4.4, 320 + k * 50); }
  w.gap("공사장 아트리움 다이브", cx, 14, cz, 0, 13, 13, 700, -90);
  // 타워 크레인
  const tx = cx - 26, tz = cz - 24, H = 46;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(w, [tx + a * 1.1, 0, tz + b * 1.1], [tx + a * 1.1, H, tz + b * 1.1], 0.3, YEL);
  for (let y = 0; y < H; y += 5.75) for (const [a, b, c, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) beam(w, [tx + a * 1.1, y, tz + b * 1.1], [tx + c * 1.1, y + 5.75, tz + d * 1.1], 0.16, YEL, { col: false });
  w.col.addCapsule(V3(tx, 0, tz), V3(tx, H, tz), 1.5);
  w.box(tx, H, tz, 3, 2.4, 3, WHITE, { mat: "paint" });
  const jx = 0.83, jz = 0.56;   // 지브 방향 (건물 위로)
  beam(w, [tx - jx * 13, H + 3, tz - jz * 13], [tx + jx * 44, H + 3, tz + jz * 44], 0.9, YEL); beam(w, [tx, H + 2.4, tz], [tx, H + 10, tz], 0.6, YEL);
  beam(w, [tx, H + 10, tz], [tx + jx * 30, H + 3.6, tz + jz * 30], 0.14, 0x30343a, { col: false }); beam(w, [tx, H + 10, tz], [tx - jx * 12, H + 3.6, tz - jz * 12], 0.14, 0x30343a, { col: false });
  w.box(tx - jx * 11, H + 0.6, tz - jz * 11, 3.4, 2.4, 2.6, 0x6d7683, { ry: -34 });
  beam(w, [tx + jx * 30, H + 2.6, tz + jz * 30], [tx + jx * 30, H - 12, tz + jz * 30], 0.08, 0x22262c, { col: false }); w.box(tx + jx * 30, H - 13.4, tz + jz * 30, 1, 1.4, 1, YEL, { mat: "paint" });
  w.sph(tx, H + 10.5, tz, 0.4, 0xff3030, { mat: "glow", col: false });
  w.gap("타워 크레인 지브 아래", tx + jx * 30, H - 4, tz + jz * 30, -34, 16, 12, 400);
}

// ── 냉동 컨테이너 더미, 리치 스태커 ──
export function reefers(w) {
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = -26 + i * 13, z = 160 + row * 6.4, st = 1 + ((i + row) % 3);
    for (let k = 0; k < st; k++) { w.container(x, k * 2.6, z, 0, k % 2 ? 0xe9e7e0 : 0xf2f0ea); w.box(x - 6.14, k * 2.6 + 1.6, z, 0.06, 0.5, 1.4, (i + k + row) % 3 ? 0x35ff7a : 0xffb020, { mat: "glow", col: false }); }
  }
  for (const [x, z, ry] of [[156, 60, 90], [100, -96, 90]]) {
    w.box(x, 0.6, z, 3.2, 2, 7, 0xd9432f, { mat: "paint", ry }); w.box(x, 2.6, z, 2, 1.6, 2, 0x1d2b3a, { mat: "paint", ry, col: false });
    const dx = ry ? 1 : 0, dz = ry ? 0 : -1;
    beam(w, [x - dx * 2, 3, z - dz * 2], [x + dx * 6, 7.4, z + dz * 6], 0.7, 0xd9432f); w.container(x + dx * 6.5, 4.4, z + dz * 6.5, ry ? 0 : 90, 0x2f6fb0);
  }
}

// ── 원료 야적장 (남서쪽): 색색의 원료 더미와 스태커 ──
export function stockyard(w) {
  const K = flora(w);
  [[-276, 0x2f2c2a], [-252, 0xa4532f], [-228, 0xd9b23a]].forEach(([x, c], j) => { for (let i = 0; i < 5; i++) w.cone(x + (i % 2) * 1.5, -0.3, 70 + i * 14 + j * 3, 10.5, 8.6 + ((i + j) % 3) * 0.8, c, { mat: "std:rock", grad: [0.75, 1.08] }); });
  const sx = -264, sz = 96;
  w.box(sx, 0.03, 104, 3, 0.1, 120, 0x4a4036, { col: false, ao: false });
  w.box(sx, 0, sz, 5, 6, 7, YEL, { mat: "paint" }); beam(w, [sx, 6, sz], [sx, 19, sz], 1, YEL);
  beam(w, [sx - 9, 15.5, sz], [sx + 24, 13.5, sz], 1.3, RED); w.box(sx - 10, 12.6, sz, 4, 3, 3.4, 0x6d7683);
  w.mesh(K.T.col8, M(sx + 24.4, 13.5, sz, 3.2, 0.9, 3.2, 0, 0, 90), 0x2c3138, "paint"); w.col.addSphere(V3(sx + 24, 13.5, sz), 2.6);
  for (const dx of [-9, 22]) beam(w, [sx, 19, sz], [sx + dx, dx < 0 ? 15.8 : 14.1, sz], 0.16, 0x30343a, { col: false });
  w.sph(sx, 19.6, sz, 0.4, 0xff3030, { mat: "glow", col: false });
  w.gap("원료 더미 골짜기", sx, 6.6, 136, 0, 10, 7.4, 400); w.gap("원료 더미 골짜기", -240, 6.6, 110, 0, 10, 7.4, 400);
  w.gap("스태커 붐 아래", sx + 12, 9.6, sz, 0, 9, 6.6, 450);
  for (const [x, z] of [[-212, 60], [-212, 150], [-290, 150]]) w.lamp(x, z, 10, 0xffd9a0, 90, 2);
}

// ── 방파제·등대·부표와 바다 위의 배들 ──
export function seaside(w) {
  const r = w.rand, K = flora(w), BW = [[-300, -176], [-262, -214], [-214, -244], [-160, -262], [-112, -268]];
  for (let s = 0; s < BW.length - 1; s++) {
    const [ax, az] = BW[s], [bx, bz] = BW[s + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 6.5);
    for (let i = 0; i < n; i++) {
      const t = i / n, x = ax + (bx - ax) * t + (r() - 0.5) * 3, z = az + (bz - az) * t + (r() - 0.5) * 3, sz = 4.6 + r() * 2.4;
      w.mesh(K.T.rock[(r() * 4) | 0], M(x, -0.4, z, sz * 1.25, sz * 0.72, sz * 1.25, 0, r() * 360, 0), [0x6f6a64, 0x7d776f, 0x5f5b56][(r() * 3) | 0], "std:rock");
      w.col.addSphere(V3(x, -0.6, z), sz * 0.72);
      if (i % 2) w.mesh(K.T.rock[(r() * 4) | 0], M(x + (r() - 0.5) * 4, 1.6, z + (r() - 0.5) * 4, 2.4, 1.5, 2.4, 0, r() * 360, 0), 0x8a847a, "std:rock");
    }
  }
  // 등대
  const lx = -104, lz = -270;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283; w.mesh(K.T.rock[i % 4], M(lx + Math.cos(a) * 6, -0.3, lz + Math.sin(a) * 6, 5, 3, 5, 0, i * 50, 0), 0x6f6a64, "std:rock"); }
  w.cyl(lx, -1.5, lz, 7.5, 3, CONC, { mat: "std:concrete", tile: 4 });
  w.cyl(lx, 1.5, lz, 3.6, 29, WHITE, { rt: 2.4, mat: "paint" });
  for (const y of [8, 19]) w.cyl(lx, y, lz, 3.66 - (y - 1.5) * 0.0414, 4, RED, { rt: 3.66 - (y + 2.5) * 0.0414, mat: "paint", col: false });
  w.cyl(lx, 30.5, lz, 4.2, 0.4, STEEL); w.cyl(lx, 30.9, lz, 1.9, 3.2, 0x9fd0ff, { mat: "glass", col: false }); w.sph(lx, 32.5, lz, 0.9, 0xfff0b0, { mat: "glow", col: false });
  w.cone(lx, 34.1, lz, 2.7, 2.4, RED, { mat: "paint", col: false, grad: [0.8, 1.05] });
  w.col.addCapsule(V3(lx, 31, lz), V3(lx, 35.5, lz), 1.9);
  const bg = new THREE.ConeGeometry(5, 70, 10, 1, true); bg.rotateX(Math.PI / 2); bg.translate(0, 0, -35);
  const bm = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const lamp = new THREE.Group(); lamp.add(new THREE.Mesh(bg, bm)); const b2 = new THREE.Mesh(bg, bm); b2.rotation.y = Math.PI; lamp.add(b2);
  lamp.position.set(lx, 32.5, lz); w.scene.add(lamp);
  w.updaters.push((dt) => { lamp.rotation.y += dt * 0.5; });
  w.gap("등대 발코니 스치기", lx + 7, 31.4, lz, 0, 6, 5, 500); w.gap("등대 발코니 스치기", lx, 31.4, lz + 7, 90, 6, 5, 500);
  w.gap("방파제 끝 돌기", lx + 13, 5, lz, 0, 12, 10, 300);
  // 항로 부표
  for (const [x, z, c] of [[-40, -236, 0xff3030], [-20, -262, 0x35ff7a], [120, -230, 0xff3030], [130, -256, 0x35ff7a], [206, -214, 0xff3030], [226, -226, 0x35ff7a]]) { w.cyl(x, -1.5, z, 0.8, 1.6, c === 0xff3030 ? 0xb5452f : 0x3d8b5a, { mat: "paint", col: false }); w.pipe(x, 0, z, x, 2.4, z, 0.08, 0x30343a, { col: false }); w.sph(x, 2.7, z, 0.32, c, { mat: "glow", col: false }); }
  // 예인선(만 안을 돈다)과 작은 배들
  const tug = prop(w, [[new THREE.BoxGeometry(5, 2.4, 13), M(0, 0.9, 0), 0x1f2a36], [new THREE.BoxGeometry(3.6, 2.4, 3.6), M(0, 0.9, -7.4, 1, 1, 1, 0, 45, 0), 0x1f2a36], [new THREE.BoxGeometry(5.1, 0.5, 13.1), M(0, 2, 0), 0xd9432f],
    [new THREE.BoxGeometry(3.6, 2.6, 4.6), M(0, 3.5, -1.5), 0xf2f0ea], [new THREE.BoxGeometry(3.7, 0.8, 4.7), M(0, 4, -1.5), 0x1d2b3a], [new THREE.CylinderGeometry(0.6, 0.7, 2.6, 8), M(0, 5.3, 1.6), 0xd9a441], [new THREE.BoxGeometry(0.12, 3, 0.12), M(0, 6.3, -2.5), 0x3a3f47]]);
  const mv = [[new PathMover(TUG_PATH, { closed: true, offset: 330 }), tug, null]];
  for (const [path, col, off] of [[[[-200, -1.05, -160, 5], [-120, -1.05, -172, 6], [-60, -1.05, -192, 6], [-130, -1.05, -216, 5], [-220, -1.05, -196, 5]], 0x2f6fb0, 0], [CHANNEL_PATH, 0xf2f0ea, 0], [CHANNEL_PATH, 0xffc23a, 330]]) {
    const b = makeBoat(col); b.scale.setScalar(1.5); w.scene.add(b);
    mv.push([new PathMover(path, { closed: true, offset: off }), b, b.userData.tick]);
  }
  w.updaters.push((dt) => { for (const [m, g, tick] of mv) { m.update(dt); g.position.copy(m.pos); g.quaternion.copy(m.quat); if (tick) tick(dt, m.speed); } });
}

export const TUG_PATH = [[-150, -1.05, -192, 6], [-40, -1.05, -206, 7], [80, -1.05, -212, 7], [176, -1.05, -224, 6], [150, -1.05, -246, 6], [20, -1.05, -240, 7], [-90, -1.05, -234, 7], [-170, -1.05, -214, 6]];
const CHANNEL_PATH = [[208, -1.05, 196, 5], [208, -1.05, 92, 7], [207, -1.05, -100, 7], [211, -1.05, -164, 5], [221, -1.05, -150, 5], [222, -1.05, -100, 7], [222, -1.05, 92, 7], [221, -1.05, 196, 5]];
