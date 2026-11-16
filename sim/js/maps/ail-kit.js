// 에일 행성 제작 도구: 색, 껍질 돔·소라 탑·뼈 아치·산호·결정 첨탑·빛 버섯, 해파리 지오메트리
// 정적인 것은 모두 월드 배치(재질별 하나의 메시)로 합쳐지고, 움직이는 생물은 InstancedMesh 로 그린다
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, ring, dome, ball, Blinkers, lane, V3 } from "./moon-kit.js";
import { shard, shardG, icoG, octG, crystalCluster, faceted } from "./orbit-kit.js";

export { M, beam, prop, merged, ring, dome, ball, Blinkers, lane, V3, shard, shardG, icoG, octG, crystalCluster, faceted };

export const DEG = Math.PI / 180;
// 껍질(진주빛 연보라) · 갑각(짙은 자주) · 살(보라) · 뼈(상아) · 발광(보라·분홍·청록·연두)
export const PEARL = 0xd9c8f0, PEARL2 = 0xb7a2dc, SHELL = 0x3a2060, SHELL2 = 0x54307e, FLESH = 0x3b1a5c, FLESH2 = 0x5a2a82;
export const BONE = 0xe8dcc8, BONE2 = 0xc8b89e, ROOT = 0x4a2d62, ROOT2 = 0x5e3a78;
export const VIO = 0x8f4bff, VIO2 = 0xc77dff, PINK = 0xff5ed8, TEAL = 0x3ff0d8, TEAL2 = 0x2ab8ff, LIME = 0x9cff6a, GOLD = 0xffc86a;

const G = {};
const tp = (k, f) => G[k] || (G[k] = f());

// 소라 껍질: 나선으로 좁아지는 고깔(바닥 중심, 높이 1, 반경 1). 나선 홈을 따라 굴곡을 준다
export const conchG = () => tp("conch", () => {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24, r = Math.pow(1 - t, 1.25) * (1 + 0.12 * Math.sin(t * Math.PI * 7)); pts.push(new THREE.Vector2(Math.max(0.02, r), t)); }
  const g = new THREE.LatheGeometry(pts, 14);
  const P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    const a = Math.atan2(v.z, v.x), k = 1 + 0.1 * Math.sin(a * 1 + v.y * 22);
    P.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  g.computeVertexNormals();
  return g;
});
// 갈비 돔 껍질: 위로 갈수록 좁아지는 반구(바닥 중심, 반경 1)에 세로 골을 낸다
export const ribDomeG = (n = 12) => tp("ribdome" + n, () => {
  const g = new THREE.SphereGeometry(1, n * 2, 9, 0, Math.PI * 2, 0, Math.PI / 2);
  const P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    const a = Math.atan2(v.z, v.x), k = 1 + 0.055 * Math.cos(a * n) * (1 - v.y);
    P.setXYZ(i, v.x * k, v.y * (1 + 0.18 * v.y), v.z * k);
  }
  g.computeVertexNormals();
  return g;
});
// 둥근 혹(저폴리 구)
export const lumpG = () => tp("lump", () => new THREE.IcosahedronGeometry(1, 0));
const lump1G = () => tp("lump1", () => new THREE.IcosahedronGeometry(1, 1));
const beadG = () => tp("bead", () => new THREE.SphereGeometry(1, 7, 4));
const tubeG = (seg) => tp("tube" + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1, true));

// ── 가벼운 도형(휴대폰을 위해 정점 수를 줄인 것) ──
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
// 뚜껑 없는 각진 관 a → b (기본 충돌 없음, o.col 로 캡슐 충돌)
export function tube(w, ax, ay, az, bx, by, bz, r, color, o = {}) {
  _a.set(ax, ay, az); _b.set(bx, by, bz); _d.subVectors(_b, _a);
  const len = _d.length();
  if (len < 1e-4) return;
  _q.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
  _m.compose(_c.addVectors(_a, _b).multiplyScalar(0.5), _q, _s.set(r, len, r));
  w.mesh(tubeG(o.seg || (r > 1.5 ? 10 : r > 0.5 ? 7 : r > 0.15 ? 5 : 3)), _m, color, o.mat || "paint");
  if (o.col) w.col.addCapsule(_a.clone(), _b.clone(), r, o.tag);
}
// 작은 구슬(빛 방울 등, 충돌 없음)
export function bead(w, x, y, z, r, color, mat = "glow") { w.mesh(r > 0.8 ? lump1G() : beadG(), M(x, y, z, r, r, r), color, mat); }
// 울퉁불퉁한 덩어리(가벼운 blob). o.col 이면 구 충돌
export function lump(w, x, y, z, rx, ry, rz, color, o = {}) {
  w.mesh(lump1G(), M(x, y, z, rx, ry, rz, 0, o.ry ?? (x * 37 + z * 11) % 360, 0), color, o.mat || "paint");
  if (o.col) w.col.addSphere(V3(x, y, z), Math.min(rx, ry, rz) * 0.9);
}
// 작은 결정 무리(가벼운 crystalCluster): 밑동 혹 + 결정 몇 개 + 빛 심
export function crystals(w, x, z, s, r, o = {}) {
  const y = o.y ?? 0, cols = o.colors || [0xb45cff, 0x9b45f5, 0xd28cff], n = o.n ?? 4 + ((r() * 3) | 0);
  lump(w, x, y + 0.1 * s, z, 2 * s, 0.7 * s, 2 * s, FLESH);
  shard(w, x, y, z, 0.9 * s, (5 + r() * 4) * s, r() * 12, r() * 360, cols[0], { col: s > 0.6 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + r() * 40, d = (0.8 + r() * 1.2) * s, h = (1.8 + r() * 3.4) * s;
    shard(w, x + Math.cos(a * DEG) * d, y - 0.2, z + Math.sin(a * DEG) * d, (0.3 + r() * 0.35) * s, h, 18 + r() * 38, -a + 90, cols[i % cols.length], { col: false });
  }
  shard(w, x, y + 0.4 * s, z, 0.4 * s, (4 + r() * 2) * s, 0, 0, o.glow ?? VIO2, { mat: "glow", col: false });
  if (s > 0.7) w.pool(x, y + 0.06, z, 5 * s, o.glow ?? VIO, 0.35);
}
// 버섯 갓: 납작한 반구 + 아랫면
export const capG = () => tp("cap", () => {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, a = t * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * 1, Math.cos(a) * 0.55)); }
  pts.push(new THREE.Vector2(0.9, -0.08), new THREE.Vector2(0.2, -0.12), new THREE.Vector2(0.01, -0.12));
  const g = new THREE.LatheGeometry(pts.reverse().map((p) => p), 16);
  g.computeVertexNormals();
  return g;
});

// ── 껍질 돔 집: 갈비 돔 + 띠 + 빛나는 입구(아치) + 꼭대기 촉수 안테나 ──
export function shellDome(w, K, x, z, y, R, o = {}) {
  const r = w.rand, col = o.color ?? (r() < 0.5 ? PEARL : PEARL2), ry = o.ry ?? r() * 360;
  const H = R * (o.sy ?? 1.05);
  w.mesh(ribDomeG(o.ribs || 12), M(x, y - 0.6, z, R, H, R, 0, ry, 0), col, "paint");
  w.col.addSphere(V3(x, y - R * 0.18, z), R * 0.98);
  // 밑동 띠와 허리 띠
  ring(w, x, y + 0.2, z, R * 1.01, 0.55, SHELL, { pitch: 90, col: false, seg: 32 });
  ring(w, x, y + H * 0.5, z, R * 0.88, 0.3, SHELL2, { pitch: 90, col: false, seg: 32 });
  // 입구: 어두운 타원 + 빛 테
  const n = o.doors ?? (R > 9 ? 2 : 1);
  for (let k = 0; k < n; k++) {
    const a = (ry + k * (360 / n)) * DEG, dx = Math.cos(a), dz = Math.sin(a), dr = R * 0.985;
    const dh = Math.min(5, R * 0.42), dwid = Math.min(3.4, R * 0.3);
    w.mesh(lumpG(), M(x + dx * dr, y + dh * 0.5, z + dz * dr, dwid * 0.55, dh * 0.6, 0.5, 0, -a / DEG + 90, 0), SHELL, "flat");
    ring(w, x + dx * (dr + 0.15), y + dh * 0.5, z + dz * (dr + 0.15), dwid * 0.62, 0.14, o.light ?? VIO2, { yaw: -a / DEG + 90, col: false, mat: "glow", seg: 16 });
    w.pool(x + dx * (dr + 2), y, z + dz * (dr + 2), dwid * 1.6, o.light ?? VIO2, 0.35);
  }
  // 둥근 창(발광 점)
  for (let k = 0; k < (R > 8 ? 6 : 3); k++) {
    const a = r() * Math.PI * 2, e = 0.35 + r() * 0.35, cy = Math.sin(e * Math.PI / 2), cr = Math.cos(e * Math.PI / 2);
    bead(w, x + Math.cos(a) * R * cr * 1.0, y - 0.6 + H * cy * 1.0, z + Math.sin(a) * R * cr * 1.0, 0.35 + R * 0.03, k % 2 ? TEAL : VIO2);
  }
  // 꼭대기: 촉수 안테나 + 빛 구
  if (o.top !== false) {
    const th = R * 0.5;
    tube(w, x, y + H * 1.12 - 0.8, z, x + (r() - 0.5) * 1.5, y + H * 1.12 + th, z + (r() - 0.5) * 1.5, Math.max(0.25, R * 0.04), SHELL2);
    bead(w, x, y + H * 1.12 + th, z, Math.max(0.5, R * 0.07), o.light ?? PINK);
    if (K) K.blink.add(x, y + H * 1.12 + th + 0.9, z, o.light ?? PINK, 0.32, (x + z) & 1);
  }
}

// ── 소라 탑: 나선 껍질을 겹쳐 세운 탑 + 발광 나선 띠 ──
export function conchTower(w, K, x, z, y, H, R, o = {}) {
  const r = w.rand, ry = r() * 360;
  w.mesh(conchG(), M(x, y - 1, z, R, H, R, 0, ry, 0), o.color ?? PEARL, "paint");
  w.mesh(conchG(), M(x, y - 1, z, R * 1.05, H * 0.35, R * 1.05, 0, ry + 40, 0), SHELL2, "paint");
  w.col.addCapsule(V3(x, y, z), V3(x, y + H * 0.55, z), R * 0.62);
  w.col.addCapsule(V3(x, y + H * 0.55, z), V3(x, y + H * 0.9, z), R * 0.24);
  // 나선 발광 띠: 짧은 관 조각
  const N = 22;
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const t = 0.08 + (i / N) * 0.8, a = t * Math.PI * 6 + ry * DEG, rr = R * Math.pow(1 - t, 1.25) * 1.02 + 0.2;
    const p = [x + Math.cos(a) * rr, y - 1 + t * H, z + Math.sin(a) * rr];
    if (prev) tube(w, ...prev, ...p, Math.max(0.12, R * 0.045), o.light ?? TEAL, { mat: "glow" });
    prev = p;
  }
  if (K) K.blink.add(x, y + H - 0.4, z, o.light ?? TEAL, 0.5, 1);
}

// ── 뼈 아치: a → b 사이에 세운 반원 갈비뼈(척추 마디 혹 + 안쪽 발광 혈관). 아래로 날아 지날 수 있다 ──
export function ribArch(w, K, ax, ay, az, bx, by, bz, H, o = {}) {
  const N = o.n || 14, t = o.t ?? 1.1, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, s = Math.sin(u * Math.PI);
    pts.push([ax + (bx - ax) * u, ay + (by - ay) * u + s * H, az + (bz - az) * u]);
  }
  for (let i = 0; i < N; i++) {
    const tt = t * (1.25 - 0.45 * Math.sin((i + 0.5) / N * Math.PI));
    tube(w, ...pts[i], ...pts[i + 1], tt, o.color ?? BONE, { mat: "paint", col: true });
    if (i % 2 === 0 && i > 0) w.mesh(lumpG(), M(...pts[i], tt * 1.7, tt * 1.4, tt * 1.7), o.color2 ?? BONE2, "flat");
    // 안쪽 아래 면을 따라 빛 혈관
    const p0 = pts[i], p1 = pts[i + 1];
    tube(w, p0[0], p0[1] - tt * 0.8, p0[2], p1[0], p1[1] - tt * 0.8, p1[2], tt * 0.28, o.light ?? VIO2, { mat: "glow" });
  }
  // 발: 뿌리처럼 퍼지는 혹
  for (const p of [pts[0], pts[N]]) {
    lump(w, p[0], p[1] + 0.4, p[2], t * 3, t * 1.6, t * 3, o.color2 ?? BONE2, { mat: "paint" });
    if (K) K.blink.add(p[0], p[1] + t * 2.4, p[2], o.light ?? VIO2, 0.34, (p[0] | 0) & 1);
  }
  if (o.gap !== false) {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, yaw = Math.atan2(-(bz - az), bx - ax) / DEG;
    w.gap(o.name || "뼈 아치 아래", mx, Math.min(ay, by) + H * 0.4, mz, yaw, Math.hypot(bx - ax, bz - az) - 6, H * 0.7, o.pts || 250);
  }
  return pts;
}

// ── 산호 나무: 갈래가 진 줄기 + 끝마다 빛나는 구 (재귀) ──
export function coral(w, x, y, z, s, r, o = {}) {
  const cols = o.colors || [0xff6ab8, 0xd04aa8, 0xff8acf], tip = o.tip ?? PINK;
  const branch = (p, dir, len, rad, depth) => {
    const e = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    tube(w, ...p, ...e, rad, cols[depth % cols.length], { mat: "paint", col: depth < 2 && rad > 0.35 });
    if (depth >= (o.depth ?? 3) || rad < 0.12) { bead(w, e[0], e[1], e[2], rad * 2.6 + 0.12, tip); return; }
    const k = 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const a = r() * Math.PI * 2, sp = 0.45 + r() * 0.35;
      const d = [dir[0] * (1 - sp) + Math.cos(a) * sp, dir[1] * (1 - sp * 0.6) + 0.25, dir[2] * (1 - sp) + Math.sin(a) * sp], L = Math.hypot(...d);
      branch(e, d.map((q) => q / L), len * (0.62 + r() * 0.2), rad * 0.62, depth + 1);
    }
  };
  branch([x, y - 0.3, z], [0, 1, 0], 3.2 * s, 0.55 * s, 0);
}

// ── 결정 첨탑: 길쭉한 결정 기둥 + 둘레 작은 결정 + 속이 빛나는 심 + 떠 있는 고리 ──
export function crystalSpire(w, K, x, z, y, H, R, o = {}) {
  const r = w.rand, tilt = o.tilt ?? r() * 6, az = r() * 360, cols = o.colors || [0x7d6cff, 0x6a4ff0, 0x9c86ff];
  lump(w, x, y + 0.4, z, R * 2.6, R * 0.9, R * 2.6, FLESH, { mat: "paint" });
  shard(w, x, y - 0.5, z, R, H, tilt, az, cols[0]);
  shard(w, x, y + H * 0.1, z, R * 0.42, H * 0.86, tilt, az, o.glow ?? TEAL, { mat: "glow", col: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 360 + r() * 30, d = R * (1.1 + r() * 0.5);
    shard(w, x + Math.cos(a * DEG) * d, y - 0.4, z + Math.sin(a * DEG) * d, R * (0.3 + r() * 0.25), H * (0.18 + r() * 0.25), 16 + r() * 22, -a + 90, cols[i % cols.length], { col: true });
  }
  if (o.halo !== false && H > 30) {
    const hy = y + H * (0.55 + r() * 0.2);
    ring(w, x, hy, z, R * 2.2, 0.22, o.glow ?? TEAL, { pitch: 90 + (r() - 0.5) * 20, col: false, mat: "glow", seg: 28 });
  }
  w.pool(x, y + 0.1, z, R * 5, o.glow ?? TEAL, 0.28);
  if (K) K.blink.add(x, y + H * 0.98, z, o.glow ?? TEAL, 0.5, az & 1);
}

// ── 빛 버섯: 굽은 대 + 갓(아랫면이 빛난다) ──
export function glowShroom(w, x, z, y, s, r, o = {}) {
  const lean = (r() - 0.5) * 0.5, ax = r() * 6.28, h = s * (2.2 + r() * 1.4);
  const tx = x + Math.cos(ax) * lean * h, tz = z + Math.sin(ax) * lean * h;
  tube(w, x, y - 0.2, z, tx, y + h, tz, s * 0.18, o.stem ?? 0xe8d8ff, { col: s > 1.5 });
  w.mesh(capG(), M(tx, y + h, tz, s, s, s, 0, r() * 360, 0), o.cap ?? (r() < 0.5 ? 0x6a3cc8 : 0x3a8ad0), "paint");
  w.mesh(capG(), M(tx, y + h - s * 0.06, tz, s * 0.86, s * 0.25, s * 0.86, 180, 0, 0), o.glow ?? TEAL, "glow");
  if (s > 1.5) w.col.addSphere(V3(tx, y + h + s * 0.15, tz), s * 0.8);
}

// ── 해파리(떠다니는 생물): 종 + 테 + 늘어진 촉수. 원점 = 종 중심, 아래로 촉수 ──
export function jellyGeo() {
  return tp("jelly", () => {
    const parts = [];
    const bell = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    parts.push([bell, M(0, 0, 0, 1, 0.8, 1), 0xb070ff]);
    const inner = new THREE.SphereGeometry(0.62, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    parts.push([inner, M(0, -0.05, 0, 1, 0.9, 1), 0xff8ae0]);
    const rim = new THREE.TorusGeometry(0.9, 0.07, 4, 24); rim.rotateX(Math.PI / 2);
    parts.push([rim, M(0, -0.12, 0), 0xffd0ff]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, L = 2.2 + (i % 3) * 0.8;
      const t = new THREE.CylinderGeometry(0.05, 0.015, L, 3, 4); t.translate(0, -L / 2 - 0.15, 0);
      // 촉수는 살짝 굽힌다
      const P = t.attributes.position, v = new THREE.Vector3();
      for (let k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k); const q = -v.y; P.setXYZ(k, v.x + Math.sin(q * 1.3 + i) * 0.18 * q * 0.3, v.y, v.z + Math.cos(q * 1.1 + i) * 0.12 * q * 0.3); }
      parts.push([t, M(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62), i % 2 ? 0x7ff4ff : 0xd8a0ff]);
    }
    const g = merged(parts);
    g.computeBoundingSphere();
    return g;
  });
}
