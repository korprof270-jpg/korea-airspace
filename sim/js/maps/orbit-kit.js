// 궤도 요새 아크라이트 제작 도구: 갑판 윤곽·높이 함수·색·각기둥 선체·결정(에일 생체 결정)·아치·고리문
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged } from "./canyon-kit.js";
import { ring, dome, octa, ball, lattice, dish, Blinkers, lane, V3 } from "./moon-kit.js";

export { M, beam, prop, merged, ring, dome, octa, ball, lattice, dish, Blinkers, lane, V3 };

export const DEG = Math.PI / 180;
// 선체 색: 흰 장갑판 · 회색 · 짙은 철 · 남색 띠 · 주황 경고 · 청록 에너지 · 에일 보라
export const WH = 0xe4e8ef, HULL = 0xc3c9d3, HULL2 = 0x9aa2ae, STEEL = 0x5f6672, DARK = 0x2a2f39, INK = 0x1a1d24, NAVY = 0x23407e;
export const ORG = 0xf07a1e, YEL = 0xf2c230, RED = 0xff4030, AMB = 0xffb040, CYA = 0x4fe3ff, CYA2 = 0x2aa6ff, GRN = 0x5cff8a;
export const VIO = 0x8f4bff, VIO2 = 0xc77dff, PINK = 0xff5ed8, FLESH = 0x3b1a5c, FLESH2 = 0x5a2a82;

// ── 갑판: 모서리를 깎은 사각형(팔각). |x|,|z| ≤ HALF, |x|+|z| ≤ CH ──
export const HALF = 240, CH = 420, VOID = -320;
export const OCT = [[HALF, -(CH - HALF)], [HALF, CH - HALF], [CH - HALF, HALF], [-(CH - HALF), HALF], [-HALF, CH - HALF], [-HALF, -(CH - HALF)], [-(CH - HALF), -HALF], [CH - HALF, -HALF]];
// 갑판 바깥으로 나간 거리(안쪽이면 음수)
export const outside = (x, z) => Math.max(Math.abs(x) - HALF, Math.abs(z) - HALF, (Math.abs(x) + Math.abs(z) - CH) / Math.SQRT2);
export const onDeck = (x, z, m = 0) => outside(x, z) <= -m;
// 높이: 갑판 위는 0, 가장자리 밖은 가파르게 떨어져 수백 m 아래 숨은 바닥에 닿는다(허공)
export function height(x, z) {
  const d = outside(x, z);
  return d <= 0 ? 0 : Math.max(VOID, -d * 7);
}

// 결정론적 난수 해시
export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// 평평한 면 법선을 가진 지오메트리(툰 각진 느낌)
export function faceted(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); n.computeBoundingBox(); return n; }

const G = {};
const tp = (k, f) => G[k] || (G[k] = f());
// 결정 조각: 육각 기둥 + 뾰족한 끝(바닥 중심, 높이 1)
export const shardG = () => tp("shard", () => {
  const body = new THREE.CylinderGeometry(0.82, 1, 0.72, 6, 1, false); body.translate(0, 0.36, 0);
  const tip = new THREE.ConeGeometry(0.82, 0.28, 6, 1, true); tip.translate(0, 0.86, 0);
  const g = merged([[body.toNonIndexed(), null, 0xffffff], [tip.toNonIndexed(), null, 0xffffff]]);
  g.deleteAttribute("color");
  return faceted(g);
});
export const octG = () => tp("octa", () => faceted(new THREE.OctahedronGeometry(1, 0)));
export const icoG = () => tp("ico", () => faceted(new THREE.IcosahedronGeometry(1, 0)));

// 결정 하나: 바닥 (x,y,z), 굵기 r, 길이 h, 기울기 tilt(도)·방위 az(도). col: 충돌 캡슐
export function shard(w, x, y, z, r, h, tilt, az, color = VIO, o = {}) {
  const m = M(x, y, z, r, h, r, tilt, az, 0);
  w.mesh(shardG(), m, color, o.mat || "paint");
  if (o.col !== false && h > 2) {
    const a = V3(0, 0.1, 0).applyMatrix4(m), b = V3(0, 0.8, 0).applyMatrix4(m);
    w.col.addCapsule(a, b, r * 0.7);
  }
  return m;
}
// 결정 무리: 가운데 큰 것 + 둘레로 기울어진 작은 것들, 안쪽에 빛나는 조각
export function crystalCluster(w, x, z, s, r, o = {}) {
  const y = o.y ?? 0, n = o.n ?? 5 + ((r() * 4) | 0), cols = o.colors || [VIO, 0x7a3cf0, 0xa35cff];
  // 밑동: 짙은 생체 덩어리
  w.blob(x, y + 0.2 * s, z, 2.4 * s, 0.9 * s, 2.4 * s, FLESH, { mat: "paint", col: false, grad: [0.55, 1.1] });
  shard(w, x, y, z, 1.1 * s, (7 + r() * 5) * s, r() * 12, r() * 360, cols[0]);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + r() * 40, d = (0.9 + r() * 1.4) * s, h = (2.2 + r() * 4.2) * s;
    const ax = x + Math.cos(a * DEG) * d, az = z + Math.sin(a * DEG) * d;
    shard(w, ax, y - 0.2, az, (0.35 + r() * 0.4) * s, h, 18 + r() * 38, -a + 90, cols[i % cols.length], { col: h > 3 });
  }
  // 빛나는 작은 결정(보라 발광)
  for (let i = 0; i < 3; i++) {
    const a = r() * 6.28, d = (1.2 + r() * 1.6) * s;
    shard(w, x + Math.cos(a) * d, y - 0.1, z + Math.sin(a) * d, 0.22 * s, (1.2 + r() * 1.6) * s, 25 + r() * 30, r() * 360, VIO2, { mat: "glow", col: false });
  }
}

// 각기둥 껍질: 다각형 pts 를 y0 에서 크기 1, y1 에서 크기 k1 로 이은 옆면(바깥을 향함). cap: 아래 뚜껑
export function prism(pts, y0, y1, k0 = 1, k1 = 1, cap = false) {
  const pos = [], uv = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) / 8, H = Math.abs(y1 - y0) / 8;
    const A0 = [a[0] * k0, y0, a[1] * k0], B0 = [b[0] * k0, y0, b[1] * k0], A1 = [a[0] * k1, y1, a[1] * k1], B1 = [b[0] * k1, y1, b[1] * k1];
    // 위(y0)가 아래(y1)보다 높다고 가정: 바깥에서 볼 때 반시계
    pos.push(...A0, ...A1, ...B0, ...B0, ...A1, ...B1);
    uv.push(0, H, 0, 0, L, H, L, H, 0, 0, L, 0);
  }
  if (cap) for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    pos.push(0, y1, 0, a[0] * k1, y1, a[1] * k1, b[0] * k1, y1, b[1] * k1);
    uv.push(0, 0, a[0] / 8, a[1] / 8, b[0] / 8, b[1] / 8);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  // 감는 방향이 반대로 나오면 법선을 바깥으로 뒤집는다
  const P = g.attributes.position, N = g.attributes.normal, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let t = 0; t < P.count; t += 3) {
    c.set(0, 0, 0); for (let j = 0; j < 3; j++) c.add(v.fromBufferAttribute(P, t + j)); c.multiplyScalar(1 / 3);
    v.fromBufferAttribute(N, t);
    const isCap = cap && t >= n * 6;
    const want = isCap ? (y1 < y0 ? -1 : 1) : 1, dot = isCap ? v.y : v.x * c.x + v.z * c.z;
    if (Math.sign(dot) !== want && Math.abs(dot) > 1e-6) {
      const ax = P.getX(t + 1), ay = P.getY(t + 1), az = P.getZ(t + 1);
      P.setXYZ(t + 1, P.getX(t + 2), P.getY(t + 2), P.getZ(t + 2)); P.setXYZ(t + 2, ax, ay, az);
      const ux = g.attributes.uv.getX(t + 1), uy = g.attributes.uv.getY(t + 1);
      g.attributes.uv.setXY(t + 1, g.attributes.uv.getX(t + 2), g.attributes.uv.getY(t + 2)); g.attributes.uv.setXY(t + 2, ux, uy);
    }
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

// 트러스 아치: 중심 (x,z), 두 다리 사이 거리 span, 높이 H. yaw: 다리가 놓인 축(0 = x 축) → 통과 방향은 그 직각
export function arch(w, K, x, z, span, H, yaw = 0, o = {}) {
  const c = Math.cos(yaw * DEG), s = Math.sin(yaw * DEG), N = 12, half = span / 2, dep = o.depth || 2.6, col = o.color ?? HULL, acc = o.accent ?? ORG;
  const P = (u, y, v) => [x + u * c + v * s, y, z - u * s + v * c];
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI; pts.push([-Math.cos(t) * half, Math.sin(t) * H]); }
  for (const v of [-dep / 2, dep / 2]) for (let i = 0; i < N; i++) beam(w, P(pts[i][0], pts[i][1], v), P(pts[i + 1][0], pts[i + 1][1], v), 0.9, col);
  for (let i = 1; i < N; i++) {
    beam(w, P(pts[i][0], pts[i][1], -dep / 2), P(pts[i][0], pts[i][1], dep / 2), 0.5, STEEL, { col: false });
    if (i % 2) beam(w, P(pts[i][0], pts[i][1], -dep / 2), P(pts[i + 1][0], pts[i + 1][1], dep / 2), 0.32, STEEL, { col: false });
  }
  // 발: 받침 상자, 꼭대기 걷는 길 + 표시등
  for (const sd of [-1, 1]) { const [fx, , fz] = P(sd * half, 0, 0); w.box(fx, 0, fz, 4.2, 2.2, dep + 2.4, DARK, { mat: "paint", ry: yaw }); w.box(fx, 2.2, fz, 4.4, 0.4, dep + 2.6, acc, { mat: "paint", ry: yaw, col: false }); }
  const [tx, , tz] = P(0, H, 0);
  w.box(tx, H + 0.4, tz, 8, 0.5, dep + 1.4, DARK, { mat: "paint", ry: yaw });
  for (let i = 2; i < N - 1; i += 2) { const p = P(pts[i][0], pts[i][1] + 0.6, 0); K.blink.add(p[0], p[1], p[2], o.light ?? CYA, 0.34, i / 2); }
  // 안쪽 아래 면을 따라 빛나는 띠
  for (let i = 1; i < N - 1; i++) beam(w, P(pts[i][0] * 0.97, pts[i][1] * 0.97 - 0.3, 0), P(pts[i + 1][0] * 0.97, pts[i + 1][1] * 0.97 - 0.3, 0), 0.22, o.light ?? CYA, { mat: "glow", col: false });
  if (o.gap !== false) w.gap(o.name || "캣워크 아치 아래", x, H * 0.4, z, yaw, span - 6, H * 0.75, o.pts || 300);
}

// 서 있는 고리문(세로 고리). 축 방향 yaw(도, 0 = z 축) — 그 방향으로 통과
export function ringGate(w, K, x, y, z, R, yaw = 0, o = {}) {
  ring(w, x, y, z, R, 0.75, o.color ?? HULL, { yaw, seg: 36 });
  ring(w, x, y, z, R - 0.75, 0.22, o.light ?? CYA, { yaw, seg: 36, mat: "glow", col: false });
  const c = Math.cos(yaw * DEG), s = Math.sin(yaw * DEG);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, px = Math.cos(a) * R, py = Math.sin(a) * R;
    w.box(x + px * c, y + py - 0.9, z - px * s, 1.9, 1.8, 2.2, i % 2 ? DARK : (o.accent ?? ORG), { mat: "paint", ry: yaw, col: false });
    if (i % 2 === 0) K.blink.add(x + px * c * 1.08, y + py * 1.08, z - px * s * 1.08, o.light ?? CYA, 0.3, i / 2);
  }
  // 받침 기둥
  if (o.stand !== false && y - R > 0.5) {
    w.box(x, 0, z, 3.4, y - R + 0.4, 3.4, DARK, { mat: "paint", ry: yaw });
    w.box(x, 0, z, 7, 0.8, 5, STEEL, { mat: "paint", ry: yaw });
  }
  if (o.gap !== false) w.gap(o.name || "고리문 통과", x, y, z, yaw, R * 1.4, R * 1.4, o.pts || 400);
}
