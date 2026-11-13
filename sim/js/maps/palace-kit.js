// 단풍 고궁 공용 도구: 기와 지붕(처마 곡선), 전각·담장·성벽·홍예 조각, 단풍나무, 지역 좌표 틀
import * as THREE from "../../vendor/three.module.min.js";
import { G, TRS, DEG } from "./city-kit.js";

// 단청·기와·돌 색
export const C = {
  red: 0xb5402f, redD: 0x8e3226, teal: 0x2f8573, tealD: 0x1f5f58, blue: 0x2e62a8, yel: 0xe9b63a, wht: 0xf1e9d6, pink: 0xe58f86,
  tile: 0x5b6472, tileD: 0x454c58, ridge: 0xe4e0d4, stone: 0xbdb6a6, stoneD: 0x958f82, stoneL: 0xd6d0c2, wall: 0xa9a294,
  plaster: 0xefe6d0, wood: 0x7a4f33, woodD: 0x54361f, paper: 0xf2e6c4, sand: 0xe4d3ab, dirt: 0xc7ad80, thatch: 0xd8b25a, bronze: 0x5f7a5c,
};

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), X = new THREE.Vector3(1, 0, 0);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { sm };

// ── 지역 좌표 틀: (x, y, z) 에 놓이고 ry(도)만큼 돈 구조물을 지역 좌표로 짓는다 ──
export class Fr {
  constructor(w, x, y, z, ry = 0) { this.w = w; this.x = x; this.y = y; this.z = z; this.ry = ry; this.c = Math.cos(ry * DEG); this.s = Math.sin(ry * DEG); this.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry * DEG, 0)); }
  X(lx, lz) { return this.x + lx * this.c + lz * this.s; }
  Z(lx, lz) { return this.z - lx * this.s + lz * this.c; }
  LZ(px, pz) { return (px - this.x) * this.s + (pz - this.z) * this.c; }
  pt(lx, ly, lz) { return new THREE.Vector3(this.X(lx, lz), this.y + ly, this.Z(lx, lz)); }
  sub(lx, ly, lz, ry = 0) { return new Fr(this.w, this.X(lx, lz), this.y + ly, this.Z(lx, lz), this.ry + ry); }
  // ly 는 바닥 높이
  box(lx, ly, lz, sx, sy, sz, color, o = {}) { return this.w.box(this.X(lx, lz), this.y + ly, this.Z(lx, lz), sx, sy, sz, color, { ...o, ry: this.ry + (o.ry || 0) }); }
  // 충돌 상자만
  solid(lx, ly, lz, sx, sy, sz, tag) { this.w.col.addBox(this.pt(lx, ly + sy / 2, lz), _s.set(sx / 2, sy / 2, sz / 2), this.q, tag); }
  // 기둥(8각) + 캡슐
  post(lx, ly, lz, r, h, color = C.red, o = {}) {
    const x = this.X(lx, lz), z = this.Z(lx, lz), y = this.y + ly;
    this.w.mesh(G.cyl(o.n || 8), TRS(x, y + h / 2, z, this.ry, r, h, r), color, o.mat || "paint");
    if (o.base !== false) this.w.mesh(G.box(), TRS(x, y + 0.2, z, this.ry, r * 3, 0.4, r * 3), C.stoneL, "std");
    if (o.col !== false) this.w.col.addCapsule(new THREE.Vector3(x, y + r, z), new THREE.Vector3(x, y + h - r, z), r);
  }
  mesh(geo, lx, ly, lz, ry, sx, sy, sz, color, mat = "std") { this.w.mesh(geo, TRS(this.X(lx, lz), this.y + ly, this.Z(lx, lz), this.ry + ry, sx, sy, sz), color, mat); }
  // 두 지역 점을 잇는 각재(장식)
  beam(a, b, wd, ht, color, mat = "std") { beam(this.w, this.pt(a[0], a[1], a[2]), this.pt(b[0], b[1], b[2]), wd, ht, color, mat); }
  gap(name, lx, ly, lz, yaw, wd, ht, pts = 300, pitch = 0) { this.w.gap(name, this.X(lx, lz), this.y + ly, this.Z(lx, lz), this.ry + yaw, wd, ht, pts, pitch); }
  roof(lx, ly, lz, a, b, H, o = {}) { roof(this.w, this.X(lx, lz), this.y + ly, this.Z(lx, lz), a, b, H, { ...o, ry: this.ry + (o.ry || 0) }); }
}

// 두 점을 잇는 각재(단면 wd×ht), 충돌 없음
export function beam(w, a, b, wd, ht, color, mat = "std") {
  _v.subVectors(b, a); const len = _v.length();
  // 지역 x 를 진행 방향으로, 윗면이 되도록이면 위를 보게
  const yaw = Math.atan2(-_v.z, _v.x), pitch = Math.asin(Math.max(-1, Math.min(1, _v.y / len)));
  _e.set(0, yaw, pitch, "YZX"); _q.setFromEuler(_e);
  w.mesh(G.box(), _m.compose(_a.addVectors(a, b).multiplyScalar(0.5), _q, _s.set(len, ht, wd)), color, mat);
}

// ── 기와 지붕 ──────────────────────────────────────────────
// 처마 반폭 a(x)·b(z), 높이 H. 용마루는 x 방향. type: hipgable(팔작) | hip(우진각) | gable(맞배)
// 처마에서 완만하고 용마루로 갈수록 가파른 곡선 + 추녀 끝이 들리는 곡선
const GAB = 0.42;
const ROOFS = new Map();
function profile(t) { return 0.42 * t + 0.58 * t * t; }
function roofH(a, b, H, type, L, x, z) {
  const tz = (b - Math.abs(z)) / b, tx = (a - Math.abs(x)) / b;
  let t = type === "gable" ? tz : type === "hip" ? Math.min(tz, tx) : tx > GAB + 1e-4 ? tz : Math.min(tz, tx);
  t = Math.max(0, Math.min(1, t));
  const c = Math.min(a, b) * 0.95, u = Math.max(0, 1 - (a - Math.abs(x)) / c), v = Math.max(0, 1 - (b - Math.abs(z)) / c);
  return H * profile(t) + L * Math.pow(u * v, 1.6);
}
function roofGeo(a, b, H, type, lod, L, th) {
  const key = [a, b, H, type, lod, L, th].map((v) => (typeof v === "number" ? v.toFixed(2) : v)).join("|");
  if (ROOFS.has(key)) return ROOFS.get(key);
  const c = Math.min(a, b) * 0.95, fr = lod ? [0, 0.3, 1] : [0, 0.1, 0.26, 0.55, 1];
  const nodes = (half, extra) => {
    const l = [0, ...fr.map((f) => half - c * f), ...extra].filter((v) => v >= 0 && v <= half + 1e-6).sort((p, q) => p - q);
    const u = []; for (const v of l) if (!u.length || v - u[u.length - 1] > 0.025) u.push(v);
    return [...u.slice().reverse().filter((v) => v > 0.01).map((v) => -v), ...u];
  };
  const xs = nodes(a, type === "hipgable" ? [a - GAB * b, a - GAB * b - 0.05] : type === "hip" ? [a - b] : []);
  const zs = nodes(b, type === "hipgable" ? [b * (1 - GAB)] : []);
  const h = (x, z) => roofH(a, b, H, type, L, x, z);
  const top = [], uv = [], gab = [], und = [], fas = [];
  const n = new THREE.Vector3(), p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const tri = (A, B, Cc) => {
    p[0].set(...A); p[1].set(...B); p[2].set(...Cc);
    n.subVectors(p[1], p[0]).cross(_v.subVectors(p[2], p[0])).normalize();
    if (Math.abs(n.y) < 0.2) { gab.push(...A, ...B, ...Cc); return; }
    top.push(...A, ...B, ...Cc);
    const alongX = Math.abs(n.z) >= Math.abs(n.x);
    for (const q of [A, B, Cc]) uv.push((alongX ? q[0] : q[2]) / 4, q[1] / 4);
    und.push(A[0], A[1] - th, A[2], Cc[0], Cc[1] - th, Cc[2], B[0], B[1] - th, B[2]);
  };
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
    const p00 = [x0, h(x0, z0), z0], p10 = [x1, h(x1, z0), z0], p01 = [x0, h(x0, z1), z1], p11 = [x1, h(x1, z1), z1];
    if ((x0 + x1) * (z0 + z1) >= 0) { tri(p00, p01, p11); tri(p00, p11, p10); } else { tri(p00, p01, p10); tri(p10, p01, p11); }
  }
  // 처마 마구리 띠
  const quad = (A, B, flip) => {
    const A2 = [A[0], A[1] - th, A[2]], B2 = [B[0], B[1] - th, B[2]];
    if (flip) fas.push(...A, ...B2, ...B, ...A, ...A2, ...B2); else fas.push(...A, ...B, ...B2, ...A, ...B2, ...A2);
  };
  for (let i = 0; i < xs.length - 1; i++) for (const [z, flip] of [[-b, false], [b, true]]) quad([xs[i], h(xs[i], z), z], [xs[i + 1], h(xs[i + 1], z), z], flip);
  for (let j = 0; j < zs.length - 1; j++) for (const [x, flip] of [[a, false], [-a, true]]) quad([x, h(x, zs[j]), zs[j]], [x, h(x, zs[j + 1]), zs[j + 1]], flip);
  const mk = (pos, uvs) => {
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs || new Float32Array((pos.length / 3) * 2), 2));
    g.computeVertexNormals(); g.computeBoundingBox();
    return g;
  };
  const out = { top: mk(top, uv), gab: mk(gab), und: mk(und), fas: mk(fas) };
  ROOFS.set(key, out);
  return out;
}

// y 는 처마 높이. o: { ry, type, lod, lift, color, under, gable, ridge(false 면 마루 생략), col(false 면 충돌 없음), th }
export function roof(w, x, y, z, a, b, H, o = {}) {
  const type = o.type || "hipgable", lod = !!o.lod, L = o.lift ?? Math.min(a, b) * 0.16 + 0.25, th = o.th ?? (lod ? 0.28 : 0.42);
  const g = roofGeo(a, b, H, type, lod, L, th), ry = o.ry || 0;
  const M = TRS(x, y, z, ry).clone();
  w.mesh(g.top, M, o.color ?? C.tile, o.mat || "std:corrug");
  if (g.gab) w.mesh(g.gab, M, o.gable ?? C.plaster, "std");
  w.mesh(g.und, M, o.under ?? C.teal, "std");
  w.mesh(g.fas, M, o.fascia ?? C.stoneL, "std");
  const f = new Fr(w, x, y, z, ry), hh = (px, pz) => roofH(a, b, H, type, L, px, pz);
  if (o.ridge !== false) {
    const rc = o.ridgeColor ?? C.ridge, rw = lod ? 0.42 : 0.6, rh = lod ? 0.36 : 0.52;
    const xr = type === "gable" ? a : type === "hip" ? Math.max(0, a - b) : a - GAB * b;
    if (xr > 0.2) {
      f.mesh(G.box(), 0, H + rh * 0.3, 0, 0, xr * 2 + rw, rh, rw, rc);
      for (const s of [-1, 1]) f.mesh(G.box(), s * (xr + rw * 0.2), H + rh * 0.55, 0, 0, rw * 1.1, rh * 2.1, rw * 1.25, o.finial ?? C.tileD);   // 취두
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      if (type === "hipgable") {
        const gx = a - GAB * b, gz = b * (1 - GAB), gy = H * profile(GAB);
        f.beam([sx * gx, H + 0.05, 0], [sx * gx, gy + 0.12, sz * gz], rw * 0.8, rh * 0.8, rc);                 // 내림마루
        const mx = a - GAB * b * 0.45, mz = b - GAB * b * 0.45;
        f.beam([sx * gx, gy + 0.1, sz * gz], [sx * mx, hh(mx, mz) + 0.12, sz * mz], rw * 0.8, rh * 0.8, rc);  // 추녀마루
        f.beam([sx * mx, hh(mx, mz) + 0.12, sz * mz], [sx * a * 0.985, L + 0.14, sz * b * 0.985], rw * 0.8, rh * 0.8, rc);
      } else if (type === "hip") {
        const mx = a - b * 0.4, mz = b * 0.6;
        f.beam([sx * Math.max(0, a - b), H + 0.05, 0], [sx * mx, hh(mx, mz) + 0.12, sz * mz], rw * 0.8, rh * 0.8, rc);
        f.beam([sx * mx, hh(mx, mz) + 0.12, sz * mz], [sx * a * 0.985, L + 0.14, sz * b * 0.985], rw * 0.8, rh * 0.8, rc);
      } else f.beam([sx * a * 0.99, H + 0.05, 0], [sx * a * 0.99, 0.12, sz * b], rw * 0.8, rh * 0.8, rc);
    }
  }
  if (o.col !== false) {
    const xe = type === "gable" ? a : type === "hip" ? Math.max(0.3, a - b * 0.62) : a - GAB * b;
    if (lod) {
      f.solid(0, -th, 0, a * 1.84, th + H * 0.3, b * 1.84);
      f.solid(0, H * 0.3, 0, (type === "gable" ? a : Math.max(xe, a - b * 0.5)) * 2, H * 0.72, b * 0.96);
    } else {
      f.solid(0, -th, 0, a * 1.9, th + H * 0.13, b * 1.9);
      f.solid(0, H * 0.13, 0, (type === "gable" ? a : a - b * 0.27) * 2, H * 0.34, b * 1.46);
      f.solid(0, H * 0.47, 0, xe * 2, H * 0.58, b * 0.78);
    }
  }
}

// ── 전각 ──────────────────────────────────────────────────
// (x, y, z) 중심·바닥. W×D 평면, nx×nz 칸. o: { ry, hc(기둥 높이), plat(기단 높이), over(처마 내밀기), rh(지붕 높이), open(true = 벽 없는 누각),
//   holes: 앞뒤로 뚫린 칸 번호 목록(벽 있는 전각의 관통 통로), type, lod, body, door, under, tile }
export function hall(w, x, y, z, W, D, o = {}) {
  const f = new Fr(w, x, y, z, o.ry || 0), nx = o.nx || Math.max(1, Math.round(W / 4.5)), nz = o.nz || Math.max(1, Math.round(D / 4.5));
  const hc = o.hc ?? 4.2, plat = o.plat ?? 0.7, over = o.over ?? 2.2, cr = o.cr ?? 0.3, fz = 0.95;
  const top = plat + hc;
  if (plat > 0) { f.box(0, 0, 0, W + 2.4, plat, D + 2.4, C.stone, { mat: "std:concrete", tile: 3 }); f.box(0, plat - 0.12, 0, W + 2.7, 0.14, D + 2.7, C.stoneL, { col: false }); }
  const colX = (i) => -W / 2 + (i / nx) * W, colZ = (j) => -D / 2 + (j / nz) * D;
  const open = !!o.open, holes = o.holes || [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const edge = i === 0 || i === nx || j === 0 || j === nz;
    if (!edge && !(open && o.inner)) continue;
    f.post(colX(i), plat, colZ(j), cr, hc, o.post ?? C.red, { col: open || holes.length > 0 });
  }
  // 창방·평방 띠(단청): 붉은 띠 위에 녹색 띠, 그 사이 노란 선
  for (const [lx, lz, sx, sz] of [[0, -D / 2, W + 0.7, 0.55], [0, D / 2, W + 0.7, 0.55], [-W / 2, 0, 0.55, D + 0.7], [W / 2, 0, 0.55, D + 0.7]]) {
    f.box(lx, top - fz, lz, sx, 0.34, sz, o.post ?? C.red, { col: false, ao: false });
    f.box(lx, top - fz + 0.34, lz, sx + 0.1, fz - 0.34, sz + 0.1, o.band ?? C.teal, { col: false, ao: false });
    f.box(lx, top - fz + 0.3, lz, sx + 0.16, 0.09, sz + 0.16, C.yel, { col: false, ao: false });
    if (open || holes.length) f.solid(lx, top - fz, lz, sx, fz, sz);
  }
  if (!open) {
    const body = o.body ?? C.plaster, door = o.door ?? C.woodD, bw = W / nx;
    if (!holes.length) f.box(0, plat, 0, W - 0.3, hc - fz + 0.1, D - 0.3, body, { ao: false });
    else {
      // 관통 칸을 뺀 벽체: 앞·뒤·옆 벽(두께 0.5)
      f.box(-W / 2 + 0.25, plat, 0, 0.5, hc - fz, D - 0.3, body); f.box(W / 2 - 0.25, plat, 0, 0.5, hc - fz, D - 0.3, body);
      for (const s of [-1, 1]) for (let i = 0; i < nx; i++) {
        const hl = holes.find((q) => q[0] === i && (q[1] === 0 || q[1] === s));
        if (!hl) f.box(colX(i) + bw / 2, plat, s * (D / 2 - 0.25), bw, hc - fz, 0.5, body);
      }
    }
    // 문짝(살문): 칸마다 어두운 틀 + 창호지
    for (const s of [-1, 1]) for (let i = 0; i < nx; i++) {
      if (holes.find((q) => q[0] === i && (q[1] === 0 || q[1] === s))) continue;
      if (o.blind && s === o.blind) continue;
      f.box(colX(i) + bw / 2, plat + 0.25, s * (D / 2 - 0.1), bw - cr * 2.6, hc - fz - 0.5, 0.12, door, { col: false, ao: false });
      f.box(colX(i) + bw / 2, plat + 0.95, s * (D / 2 - 0.05), bw - cr * 2.6 - 0.5, hc - fz - 1.5, 0.1, C.paper, { col: false, ao: false });
    }
  } else if (o.floor !== false && o.rail) {
    // 누각 난간
    for (const [lx, lz, sx, sz] of [[0, -D / 2, W, 0.14], [0, D / 2, W, 0.14], [-W / 2, 0, 0.14, D], [W / 2, 0, 0.14, D]]) f.box(lx, plat + 0.85, lz, sx, 0.14, sz, C.redD, { col: false });
  }
  if (o.sign) { f.box(0, top - 0.35, D / 2 + 0.45, Math.min(4.2, W * 0.3), 1.25, 0.2, 0x1f2430, { col: false, ao: false }); f.box(0, top - 0.2, D / 2 + 0.57, Math.min(3.6, W * 0.25), 0.95, 0.06, C.yel, { col: false, ao: false, mat: "paint" }); }
  const rh = o.rh ?? Math.max(1.6, (D / 2 + over) * 0.62);
  if (o.roof !== false) f.roof(0, top, 0, W / 2 + over, D / 2 + over, rh, { type: o.type, lod: o.lod, color: o.tile, under: o.under, gable: o.gable, lift: o.lift, ridgeColor: o.ridgeColor, mat: o.roofMat, fascia: o.fascia, finial: o.finial });
  return { f, top, rh, plat, nx, nz, colX, colZ };
}

// ── 담장: 돌 기단 + 회벽 + 기와 지붕 ──
export function fence(w, ax, az, bx, bz, h = 2.6, o = {}) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz); if (len < 0.3) return;
  const ry = Math.atan2(-dz, dx) / DEG, mx = (ax + bx) / 2, mz = (az + bz) / 2, t = o.t ?? 0.7, y = o.y ?? 0;
  w.box(mx, y, mz, len, h, t, o.color ?? C.plaster, { ry, col: false, ao: false });
  w.box(mx, y, mz, len + 0.02, h * 0.36, t + 0.14, o.base ?? C.stone, { ry, col: false, mat: "std:brick", tile: 2.5 });
  w.mesh(G.gable(), TRS(mx, y + h, mz, ry + 90, t + 0.9, 0.62, len + 0.3), o.tile ?? C.tile, "std");
  w.mesh(G.box(), TRS(mx, y + h + 0.6, mz, ry, len + 0.3, 0.16, 0.24), C.ridge, "std");
  w.col.addBox(_a.set(mx, y + (h + 0.6) / 2, mz), _s.set(len / 2, (h + 0.6) / 2, t / 2 + 0.2), _q.setFromEuler(_e.set(0, ry * DEG, 0, "YXZ")));
}
// 꺾이는 담장. gaps: [[거리 시작, 끝]] 은 한 변 안에서 비우는 구간이 아니라 점 사이를 건너뛰려면 null 을 넣는다
export function fenceRun(w, pts, h, o) { for (let i = 0; i < pts.length - 1; i++) if (pts[i] && pts[i + 1]) fence(w, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], h, o); }

// ── 홍예(아치) 모서리 채움: 사각 통로 위 모서리를 둥글게 보이게 한다 ──
// 단위 조각: x 0..1, y 0..1 의 오른쪽 위 모서리, 깊이 z ±0.5. 원호 안쪽은 비어 있다
const _sp = [null, null];
function spandrel(flip) {
  if (_sp[flip ? 1 : 0]) return _sp[flip ? 1 : 0];
  const N = 6, pos = [], T = (a, b, c) => (flip ? pos.push(...a, ...c, ...b) : pos.push(...a, ...b, ...c));
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI / 2, a1 = ((i + 1) / N) * Math.PI / 2, x0 = Math.cos(a0), y0 = Math.sin(a0), x1 = Math.cos(a1), y1 = Math.sin(a1);
    T([1, 1, 0.5], [x0, y0, 0.5], [x1, y1, 0.5]);                    // 앞면
    T([1, 1, -0.5], [x1, y1, -0.5], [x0, y0, -0.5]);                 // 뒷면
    T([x0, y0, 0.5], [x0, y0, -0.5], [x1, y1, -0.5]); T([x0, y0, 0.5], [x1, y1, -0.5], [x1, y1, 0.5]);   // 안쪽 곡면
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.computeVertexNormals(); g.computeBoundingBox();
  return (_sp[flip ? 1 : 0] = g);
}
// 틀 f 의 지역 (lx, ly, lz) 가 통로 윗변 중앙. 폭 wd, 깊이 dep(지역 z), 반지름 r. full: 아래쪽도 채워 원형(월문)
export function arch(f, lx, ly, lz, wd, dep, color, o = {}) {
  const r = o.r ?? wd / 2, ry = o.ry || 0, c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
  for (const sx of [-1, 1]) {
    const ox = sx * (wd / 2 - r);
    f.mesh(spandrel(sx < 0), lx + ox * c, ly - r, lz - ox * s, ry, sx * r, r, dep, color, o.mat || "std");
    if (o.full) f.mesh(spandrel(sx > 0), lx + ox * c, ly - r, lz - ox * s, ry, sx * r, -r, dep, color, o.mat || "std");
  }
}

// ── 나무: 단풍(붉음·주황)·은행(노랑)·소나무 ──
const LEAF = { maple: [0.015, 0.78, 0.4], orange: [0.07, 0.85, 0.46], ginkgo: [0.135, 0.9, 0.5], gold: [0.105, 0.8, 0.47], crimson: [0.985, 0.7, 0.34], green: [0.27, 0.45, 0.26] };
const _c = new THREE.Color();
export function autumn(w, x, z, s = 1, kind = "maple", o = {}) {
  const r = w.rand, y = (o.y ?? w.h(x, z)) - 0.2, [hu, sa, lu] = LEAF[kind] || LEAF.maple;
  if (kind === "pine") { w.tree(x, z, s, "pine"); return; }
  const tall = kind === "ginkgo" ? 1.35 : 1, h = (2.8 + r() * 1.6) * s * tall, cr = (2.1 + r() * 0.8) * s;
  w.mesh(G.cone(6, 0.6), TRS(x, y + h / 2, z, 0, 0.3 * s, h, 0.3 * s), 0x4a3828, "std");
  const base = _c.setHSL((hu + (r() - 0.5) * 0.035 + 1) % 1, sa, lu + (r() - 0.5) * 0.06).getHex(), n = o.blobs || 3;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = i ? cr * 0.48 : 0, br = cr * (i ? 0.6 + r() * 0.2 : 0.9), sy = kind === "ginkgo" ? 1.15 : 0.8;
    w.mesh(G.leaf(i % 3), TRS(x + Math.cos(a) * d, y + h + cr * (i ? 0.2 + r() * 0.35 : 0.5), z + Math.sin(a) * d, r() * 360, br, br * sy, br), _c.set(base).offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.07).getHex(), "foliage");
  }
  if (o.litter !== false && y > -0.3 && y < 0.3) w.mesh(G.cyl(8), TRS(x + (r() - 0.5), 0.06 + r() * 0.03, z + (r() - 0.5), r() * 360, cr * 1.25, 0.04, cr * 1.05), _c.set(base).offsetHSL(0, -0.1, -0.04).getHex(), "std");   // 낙엽 깔개
  if (o.col !== false) {
    w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 0.32 * s);
    w.col.addSphere(new THREE.Vector3(x, y + h + cr * 0.5, z), cr * 0.8);
  }
}
const KINDS = ["maple", "maple", "orange", "ginkgo", "gold", "crimson", "orange", "maple", "ginkgo", "green"];
export const pick = (w) => KINDS[(w.rand() * KINDS.length) | 0];

// 석등: 받침 + 기둥 + 화사석(은은히 빛남) + 지붕돌
export function lantern(w, x, z, s = 1, y) {
  y = y ?? w.h(x, z);
  w.box(x, y, z, 0.9 * s, 0.3 * s, 0.9 * s, C.stoneD, { col: false });
  w.mesh(G.cyl(6), TRS(x, y + 0.95 * s, z, 0, 0.17 * s, 1.3 * s, 0.17 * s), C.stone, "std");
  w.box(x, y + 1.6 * s, z, 0.62 * s, 0.5 * s, 0.62 * s, 0xffd890, { mat: "glow", col: false });
  w.mesh(G.pyr(0.15), TRS(x, y + 2.32 * s, z, 0, 1.15 * s, 0.45 * s, 1.15 * s), C.stoneD, "std");
  w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 2.3 * s, z), 0.35 * s);
}

// 청사초롱 줄: 두 점 사이에 늘어진 줄과 등(붉은색·푸른색 번갈아)
export function lanternLine(w, a, b, n, sag = 1.2, o = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), cols = o.colors || [0xff5a48, 0x4a8cff], p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
  const at = (t, out) => out.lerpVectors(A, B, t).setY(A.y + (B.y - A.y) * t - sag * 4 * t * (1 - t));
  const seg = 8;
  for (let i = 0; i < seg; i++) { at(i / seg, p0); at((i + 1) / seg, p1); beam(w, p0, p1, 0.05, 0.05, 0x3a2c22); }
  for (let i = 0; i < n; i++) {
    at((i + 0.5) / n, p0);
    w.mesh(G.cyl(6), TRS(p0.x, p0.y - 0.42, p0.z, 0, 0.21, 0.55, 0.21), cols[i % cols.length], "glow");
    w.mesh(G.box(), TRS(p0.x, p0.y - 0.1, p0.z, 0, 0.3, 0.08, 0.3), 0x2a2220, "std");
  }
}
// 깃대와 깃발
export function flag(w, x, z, h, color, ry = 0, y) {
  y = y ?? w.h(x, z);
  w.mesh(G.cyl(6), TRS(x, y + h / 2, z, 0, 0.07, h, 0.07), 0x5a4030, "std");
  w.mesh(G.box(), TRS(x + Math.cos(ry * DEG) * 0.75, y + h - 1.0, z - Math.sin(ry * DEG) * 0.75, ry, 1.4, 1.7, 0.05), color, "std");
  w.mesh(G.box(), TRS(x + Math.cos(ry * DEG) * 0.75, y + h - 1.0, z - Math.sin(ry * DEG) * 0.75, ry, 0.5, 0.5, 0.07), C.wht, "std");
  w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 0.12);
}
// 돌계단: 지역 +z 쪽으로 내려간다. (lx, ly, lz) 는 윗단 가장자리 중앙·윗면 높이
export function stairs(f, lx, ly, lz, wd, n, o = {}) {
  const rise = o.rise ?? 0.36, run = o.run ?? 0.62, ry = o.ry || 0, c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
  for (let i = 0; i < n; i++) { const d = (i + 0.5) * run, top = ly - (i + 1) * rise; if (top <= -0.5) break; f.box(lx + d * s, 0, lz + d * c, wd, Math.max(0.1, top), run + 0.02, C.stoneL, { ry, col: false, ao: false }); }
  const L = n * run, hh = n * rise;
  // 소맷돌(옆 난간석)과 계단 충돌(비스듬한 상자 대신 2단)
  for (const sx of [-1, 1]) f.box(lx + sx * (wd / 2 + 0.25) * c + (L / 2) * s, 0, lz - sx * (wd / 2 + 0.25) * s + (L / 2) * c, 0.5, hh * 0.62, L, C.stone, { ry, col: false });
  f.box(lx + L * 0.25 * s, 0, lz + L * 0.25 * c, wd + 1, hh * 0.78, L * 0.5, C.stone, { ry, col: true, ao: false });
  f.box(lx + L * 0.75 * s, 0, lz + L * 0.75 * c, wd + 1, hh * 0.3, L * 0.5, C.stone, { ry, col: true, ao: false });
}
// 사람 모양(가벼운 정적 군중): 색 목록으로 옷 색을 준다
export function folk(w, x, y, z, tone, hat = 0x1c1c22) {
  const hh = 1.6;
  w.mesh(G.cone(6, 0.55), TRS(x, y + hh * 0.42, z, 0, 0.26, hh * 0.84, 0.22), tone, "std");
  w.mesh(G.box(), TRS(x, y + hh * 0.93, z, 0, 0.24, 0.26, 0.24), 0xe2b99a, "std");
  if (hat) w.mesh(G.cyl(8), TRS(x, y + hh * 1.03, z, 0, 0.36, 0.05, 0.36), hat, "std");
}
let _ball = null;
// 저폴리 공(20면): 감·독·좌판 물건처럼 작은 둥근 것
export const ball = () => _ball || (_ball = (() => { const g = new THREE.IcosahedronGeometry(1, 1); g.computeBoundingBox(); return g; })());
export const ball0 = () => _ball0 || (_ball0 = (() => { const g = new THREE.IcosahedronGeometry(1, 0); g.computeBoundingBox(); return g; })());
let _ball0 = null;
export { G, TRS, DEG, THREE };
