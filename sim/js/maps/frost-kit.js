// 설원 통신기지 제작 도구: 배치 상수·색, 기울일 수 있는 조립대(Rig), 얼음 아치·고드름·눈 더미, 아치 격납고 박공, 거대 접시
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, frame, mat } from "./canyon-kit.js";
import { ring, dome, octa, ball, lattice, Blinkers, lane, V3 } from "./moon-kit.js";
import { PaintSigns } from "./airbase-kit.js";

export { M, beam, prop, merged, frame, mat, ring, dome, octa, ball, lattice, Blinkers, lane, V3, PaintSigns };

export const DEG = Math.PI / 180;
// 색: 눈·얼음 · 콘크리트 · 겨울 위장 강철 · 경고 주황 · 신호의 청록 · 난로의 주황
export const SNOW = 0xf0f5fb, SNOW_SH = 0xd3e1f3, ICE = 0xa9dcf2, ICE_D = 0x6fb9e2, ICE_K = 0x3f86c2;
export const CONC = 0x9aa2ad, CONC2 = 0x7d8693, STEEL = 0x5a6472, DARK = 0x2b313b, INK = 0x1a1d24, HULL = 0xb9c2ce, HULL2 = 0x8f9aa8, OLIVE = 0x66705a, WCAMO = 0xcfd6dd;
export const ORG = 0xf07a1e, RED = 0xff4030, AMB = 0xffb040, WARM = 0xffc070, CYA = 0x4fe3ff, CYA2 = 0x8ff2ff, GRN = 0x5cff8a, FIRE = 0xff7a2a, BRICK = 0x8d5a4a, RUST = 0x6a4a3a;

// ── 배치 상수 (북 = -z, 동 = +x) ──
export const RWY = { z: 15, x0: -96, x1: 86, w: 18 };                 // 기지 활주로(동서)
export const HANGARS = [-70, -30], HZ0 = -58, HZ1 = -18, HA = 14, HWALL = 3, HRISE = 9, DOOR = { w: 18, h: 8.5 };   // 반지하 아치 격납고 (남북으로 관통)
export const DISHES = [[-40, -105, -30], [30, -105, 8], [100, -105, 34]];   // 거대 접시 [x, z, 기울기(도, +면 동쪽)] — 축은 남북, 동서로 밑을 지난다
export const DISH_R = 20, DISH_Y = 27, DISH_LEG = 14;
export const BUNKER = [48, -48];                                        // 지휘 벙커
export const BLUE = [-5, 72];                                           // 아군 진지
// 백설 시: 큰길(동서) z = 38, 동쪽 길(남북) x = 205, 가운데 길 x = 150, 남쪽 길 z = 95
export const TOWN = { x0: 108, x1: 240, z0: -22, z1: 156, main: 38, mainW: 22, east: 205, eastW: 20, mid: 150, midW: 14, south: 95, southW: 14 };
export const TTOWER = [127, -12], SCHOOL = [127, 10], PLAZA = [176, 4], STACKS = [[220, -8], [234, -8]];
export const SHELTERS = [[165, 112], [190, 112], [165, 142], [190, 142]];
export const BRIDGE = { x0: -183, x1: -137, z: 39.5, y: 22 };          // 협곡을 건너는 철교
export const GUNS = [[60, 37], [100, 38], [140, 37], [178, 38]];        // 포대의 포 [포대 중심 기준 각도(도), 거리]

// ── 기울일 수 있는 조립대: 로컬 좌표로 부품을 놓고 통째로 돌린 채 월드에 굽는다 (충돌 포함) ──
const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 12), CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
const _Y = new THREE.Vector3(0, 1, 0);
export class Rig {
  constructor(w, x, y, z, rx = 0, ry = 0, rz = 0) { this.w = w; this.m = M(x, y, z, 1, 1, 1, rx, ry, rz); this.q = new THREE.Quaternion().setFromRotationMatrix(this.m); }
  P(u, y, v) { return V3(u, y, v).applyMatrix4(this.m); }
  // 상자: (u, y, v) 는 중심
  box(u, y, v, su, sy, sv, color, o = {}) {
    const lm = M(u, y, v, su, sy, sv, o.rx || 0, o.ry || 0, o.rz || 0);
    this.w.mesh(BOXG, this.m.clone().multiply(lm), color, o.mat || "paint");
    if (o.col !== false) this.w.col.addBox(this.P(u, y, v), V3(su / 2, sy / 2, sv / 2), new THREE.Quaternion().setFromRotationMatrix(lm).premultiply(this.q), o.tag);
    return this;
  }
  // 두 점을 잇는 원통
  pipe(a, b, r, color, o = {}) {
    const A = V3(...a), B = V3(...b), d = B.clone().sub(A), L = d.length();
    const lm = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_Y, d.normalize()), V3(r, L, r));
    this.w.mesh(o.seg === 6 ? CYL6 : CYLG, this.m.clone().multiply(lm), color, o.mat || "paint");
    if (o.col !== false) this.w.col.addCapsule(this.P(...a), this.P(...b), r, o.tag);
    return this;
  }
  beam(a, b, t, color, o = {}) { beam(this.w, this.P(...a).toArray(), this.P(...b).toArray(), t, color, o); return this; }
  gap(name, u, y, v, yaw, gw, gh, pts) { const p = this.P(u, y, v), e = new THREE.Euler().setFromQuaternion(this.q, "YXZ"); this.w.gap(name, p.x, p.y, p.z, e.y / DEG + yaw, gw, gh, pts, e.x / DEG); }
}

// ── 얼음·눈 ──
const T = {};
const tp = (k, f) => T[k] || (T[k] = f());
const up = (g) => { g.translate(0, 0.5, 0); g.computeBoundingBox(); return g; };
export const G = {
  box: BOXG, cyl: CYLG, cyl6: CYL6,
  spike: () => tp("spike", () => up(new THREE.ConeGeometry(1, 1, 5, 1, true))),
  cone8: () => tp("cone8", () => up(new THREE.ConeGeometry(1, 1, 8, 1, false))),
  ico: () => tp("ico", () => { const g = new THREE.IcosahedronGeometry(1, 1); g.computeBoundingBox(); return g; }),
  ico0: () => tp("ico0", () => { const g = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(); g.computeVertexNormals(); g.computeBoundingBox(); return g; }),
  hemi: () => tp("hemi", () => { const g = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.computeBoundingBox(); return g; }),
  // 포물면 접시(안팎 두 겹): 반경 1, 깊이 0.28, 축 +y
  dish: () => tp("dish", () => {
    const pts = [];
    for (let i = 9; i >= 0; i--) { const r = i / 9; pts.push(new THREE.Vector2(r, r * r * 0.28)); }
    for (let i = 0; i <= 9; i++) { const r = i / 9; pts.push(new THREE.Vector2(r * 0.985, r * r * 0.28 - 0.03)); }
    const g = new THREE.LatheGeometry(pts, 28); g.computeBoundingBox(); return g;
  }),
};
// 고드름: 꼭대기 (x, y, z) 에서 아래로 len
export function icicle(w, x, y, z, r, len, color = ICE) { w.mesh(G.spike(), M(x, y, z, r, len, r, 180, 0, 0), color, "paint"); }
// 가로대 a→b 아래에 매달린 고드름 줄
export function icicles(w, a, b, n, len = 2, color = ICE) {
  const r = w.rand;
  for (let i = 0; i < n; i++) { const t = (i + 0.2 + r() * 0.6) / n, l = len * (0.4 + r() * 0.9); icicle(w, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 0.12 + l * 0.07, l, r() < 0.3 ? ICE_D : color); }
}
// 눈 더미(충돌 없음): 납작한 덩어리
export function drift(w, x, y, z, rx, ry, rz, color = SNOW) { w.mesh(G.ico(), M(x, y, z, rx, ry, rz, 0, w.rand() * 360, 0), color, "std"); }
// 얼음 조각(각진 덩어리). col: 충돌 구
export function shardIce(w, x, y, z, rx, ry, rz, color = ICE, o = {}) {
  w.mesh(G.ico0(), M(x, y, z, rx, ry, rz, o.rx ?? (w.rand() - 0.5) * 40, w.rand() * 360, o.rz ?? (w.rand() - 0.5) * 40), color, "paint");
  if (o.col) w.col.addSphere(V3(x, y, z), Math.min(rx, ry, rz) * 0.9);
}
// 얼음 아치: (ax,az) → (bx,bz) 를 잇는 호. y0 = 발 높이, rise = 꼭대기 높이, thick = 굵기. 덩어리마다 푸른 띠가 섞인다
export function iceArch(w, ax, az, bx, bz, y0, rise, thick, o = {}) {
  const r = w.rand, n = o.n || Math.max(8, Math.round((Math.hypot(bx - ax, bz - az) + rise * 2) / (thick * 1.1)));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * t, k = 0.5 - 0.5 * Math.cos(a), s = Math.sin(a);
    const x = ax + (bx - ax) * k + (r() - 0.5) * thick * 0.2, z = az + (bz - az) * k + (r() - 0.5) * thick * 0.2, y = y0 + s * rise;
    const rr = thick * (1.3 - 0.4 * s) * (0.9 + r() * 0.2);
    w.mesh(G.ico0(), M(x, y, z, rr * 1.1, rr * (0.85 + 0.3 * (1 - s)), rr, (r() - 0.5) * 30, r() * 360, 0), [ICE, ICE_D, 0xc4e8f8, ICE][i % 4], "paint");
    if (o.snow !== false && s > 0.55) w.mesh(G.ico(), M(x, y + rr * 0.55, z, rr * 1.05, rr * 0.4, rr * 1.0, 0, r() * 360, 0), SNOW, "std");
    const p = V3(x, y, z);
    if (prev) w.col.addCapsule(prev.p, p, Math.min(prev.r, rr) * 0.82); else w.col.addSphere(p, rr * 0.82);
    prev = { p, r: rr };
  }
}

// ── 아치 격납고 박공벽: 반타원 윤곽에 문 구멍을 낸 판(앞뒤 양면) ──
export const archY = (u, a = HA, wall = HWALL, rise = HRISE) => wall + rise * Math.sqrt(Math.max(0, 1 - (u / a) ** 2));
const GABLE = {};
export function gableGeo(a, wall, rise, door) {
  const key = [a, wall, rise, door ? door.w : 0, door ? door.h : 0].join("|");
  if (GABLE[key]) return GABLE[key];
  const s = new THREE.Shape(), N = 16;
  s.moveTo(-a, 0);
  if (door) { s.lineTo(-door.w / 2, 0); s.lineTo(-door.w / 2, door.h); s.lineTo(door.w / 2, door.h); s.lineTo(door.w / 2, 0); }
  s.lineTo(a, 0); s.lineTo(a, wall);
  for (let i = 1; i <= N; i++) { const t = (i / N) * Math.PI; s.lineTo(Math.cos(t) * a, wall + Math.sin(t) * rise); }
  s.lineTo(-a, 0);
  const f = new THREE.ShapeGeometry(s), b = f.clone(); b.rotateY(Math.PI);
  const g = merged([[f, null, 0xffffff], [b, null, 0xffffff]]); g.deleteAttribute("color"); g.computeBoundingBox();
  const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) / 6, U.getY(i) / 6);
  return (GABLE[key] = g);
}

// 눈 덮인 지붕 판: 건물 윗면 (x, y, z) 에 크기 sx × sz
export function snowRoof(w, x, y, z, sx, sz, ry = 0, th = 0.5) { w.box(x, y, z, sx + 0.5, th, sz + 0.5, SNOW, { ry, col: false, ao: false }); }

// 결정론적 난수 해시
export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// 연기 기둥: 꼭대기에서 바람(동남쪽)에 쓸리며 오르는 덩어리들
export function plume(w, x, y, z, rad, rise, n = 5, color = 0x4a4e58, wind = [0.55, 0.25]) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false });
  const g = G.ico(), ph = hash(x, z) * 10;
  const puffs = Array.from({ length: n }, () => { const p = new THREE.Mesh(g, m); p.renderOrder = 4; p.userData.toonDone = true; w.scene.add(p); return p; });
  w.disposables.push(m);
  w.updaters.push((dt, t) => puffs.forEach((p, i) => {
    const u = (t * 0.06 + i / n + ph) % 1;
    p.position.set(x + u * rise * wind[0] + Math.sin(i * 2.4 + t * 0.3) * rad * 0.2, y + u * rise, z + u * rise * wind[1]);
    const k = rad * (0.5 + u * 1.8) * Math.min(1, u * 6) * Math.min(1, (1 - u) * 3) + 0.001; p.scale.set(k * 1.5, k * 0.8, k * 1.2); p.rotation.y = i * 1.3 + t * 0.1;
  }));
}
