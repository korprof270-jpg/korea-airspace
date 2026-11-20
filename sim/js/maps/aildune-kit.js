// 유리 사막 제작 도구: 색, 육각 결정 기둥·들보, 소리굽쇠 결정, 오르간 관 결정, 맥박이 흐르는 빛 줄기(Veins), 뼈 풍차·풍경 지오메트리
// 에일 수도 맵(ail-kit)의 부품과 색을 이어 쓰되, 사막은 호박·청록·분홍 유리빛이 주조다
import * as THREE from "../../vendor/three.module.min.js";
import { M, merged, ring, ball, Blinkers, V3, shard, shardG, icoG, octG, faceted, DEG, tube, bead, lump, crystals, lumpG, conchG, ribDomeG, capG, shellDome, ribArch,
  PEARL, PEARL2, SHELL, SHELL2, FLESH, BONE, BONE2, VIO, VIO2, PINK, TEAL, TEAL2, GOLD } from "./ail-kit.js";

export { THREE, M, merged, ring, ball, Blinkers, V3, shard, shardG, icoG, octG, faceted, DEG, tube, bead, lump, crystals, lumpG, conchG, ribDomeG, capG, shellDome, ribArch,
  PEARL, PEARL2, SHELL, SHELL2, FLESH, BONE, BONE2, VIO, VIO2, PINK, TEAL, TEAL2, GOLD };

// 유리 결정(청록 3단) · 호박 결정 · 장미 결정 · 깊은 남보라 · 순례상 돌 · 빈 합창(먹빛·핏빛)
export const CT = [0x1f6f8a, 0x2fa9b0, 0x86ecd8], CA = [0xa8562a, 0xe08a3a, 0xffd28a], CP = [0x8a2f6a, 0xd0559a, 0xffa8d8], CV = [0x2a2a78, 0x4a4fc0, 0x8f9aff];
export const AMBER = 0xffb24a, AMBER2 = 0xff8a2a, ROSE = 0xff7ac0, ICE = 0xbff8ee, DEEP = 0x1a2f5a;
export const STONE = 0xb9a892, STONE2 = 0x94826f, STONE3 = 0x6e6058, SAND = 0xe2b070, SAND2 = 0xc48a56;
export const VOID = 0x221226, VOID2 = 0x3a1c3c, BLOOD = 0xff3a6a;

const G = {};
const tp = (k, f) => G[k] || (G[k] = f());
// 육각 기둥(바닥 중심, 반경 1, 높이 1) — 평평한 면 법선
export const hexG = () => tp("hex", () => { const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false); g.translate(0, 0.5, 0); return faceted(g); });
// 위가 좁아지는 육각 기둥 / 비스듬히 잘린 끝(높이 1)
export const hexTaperG = (k) => tp("hext" + k, () => { const g = new THREE.CylinderGeometry(k, 1, 1, 6, 1, false); g.translate(0, 0.5, 0); return faceted(g); });
export const hexCutG = () => tp("hexcut", () => {
  const g = new THREE.CylinderGeometry(0.34, 1, 1, 6, 1, false); g.translate(0, 0.5, 0);
  const P = g.attributes.position; for (let i = 0; i < P.count; i++) if (P.getY(i) > 0.5) P.setXYZ(i, P.getX(i) + 0.42, P.getY(i), P.getZ(i));
  return faceted(g);
});
// 얇은 판 결정(프리즘 조각): 마름모 판
export const plateG = () => tp("plate", () => { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.55, 1, 0.16); return faceted(g); });

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
// 두 점을 잇는 육각 결정 들보. o: { mat, col(캡슐 충돌), geo, tag }
export function hexBeam(w, a, b, r, color, o = {}) {
  _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); _d.subVectors(_b, _a);
  const len = _d.length(); if (len < 1e-4) return;
  _q.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
  _m.compose(_a, _q, _s.set(r, len, o.rz ?? r));
  w.mesh(o.geo || hexG(), _m, color, o.mat || "paint");
  if (o.col) w.col.addCapsule(_a.clone(), _b.clone(), r * 0.86, o.tag);
}
// 세 띠로 색이 바뀌는 곧은 결정 기둥 (x,y,z 바닥 → 높이 h). cols: [아래, 가운데, 위]. tip: 끝 모양("point" | "cut" | "flat")
export function column(w, x, y, z, r, h, cols, o = {}) {
  const ry = o.ry ?? 0, f = o.bands || [0.34, 0.36, 0.3], tipH = o.tip === "flat" ? 0 : Math.min(h * 0.16, r * (o.tip === "cut" ? 2.2 : 3));
  let yy = y; const body = h - tipH;
  for (let i = 0; i < 3; i++) { const hh = body * f[i]; w.mesh(hexG(), M(x, yy, z, r, hh + 0.02, r, 0, ry, 0), cols[i], o.mat || "paint"); yy += hh; }
  if (tipH) w.mesh(o.tip === "cut" ? hexCutG() : hexTaperG(0.05), M(x, yy, z, r, tipH, r, 0, ry + (o.cutYaw ?? 0), 0), o.tipColor ?? cols[2], o.tipMat || o.mat || "paint");
  if (o.col !== false) w.col.addCapsule(V3(x, y + r * 0.6, z), V3(x, y + h - r * 0.8, z), r * 0.9, o.tag);
}

// ── 맥박이 흐르는 빛 줄기: 관 조각을 한 메시에 모으고, 줄기를 따라 밝은 마디가 달려간다 ──
export class Veins {
  constructor(w) { this.w = w; this.pos = []; this.col = []; this.ph = []; this.idx = []; this.n = 0; this.c = new THREE.Color(); }
  // pts: [[x,y,z], ...], r: 굵기, color, ph0: 위상 시작, sp: 1 m 당 위상
  add(pts, r, color, ph0 = 0, sp = 0.02) {
    this.c.set(color);
    let ph = ph0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _d.length(); if (len < 1e-4) continue;
      _d.multiplyScalar(1 / len);
      _c.set(Math.abs(_d.y) > 0.9 ? 1 : 0, Math.abs(_d.y) > 0.9 ? 0 : 1, 0).cross(_d).normalize(); _b.crossVectors(_d, _c);
      const base = this.n, ph1 = ph + len * sp;
      for (let e = 0; e < 2; e++) for (let k = 0; k < 4; k++) {
        const an = k * Math.PI / 2 + 0.785, cx = Math.cos(an) * r, cy = Math.sin(an) * r, p = e ? b : a;
        this.pos.push(p[0] + _c.x * cx + _b.x * cy, p[1] + _c.y * cx + _b.y * cy, p[2] + _c.z * cx + _b.z * cy);
        this.col.push(this.c.r, this.c.g, this.c.b); this.ph.push(e ? ph1 : ph);
      }
      for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; this.idx.push(base + k, base + 4 + k, base + k2, base + k2, base + 4 + k, base + 4 + k2); }
      this.n += 8; ph = ph1;
    }
    return ph;
  }
  finish() {
    if (!this.n) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("ph", new THREE.Float32BufferAttribute(this.ph, 1));
    g.setIndex(this.idx);
    const k = this.w.env.glow ?? 2;
    const mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, k: { value: k } }, side: THREE.DoubleSide,
      vertexShader: "attribute float ph; attribute vec3 color; varying float vP; varying vec3 vC; void main(){ vP = ph; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying float vP; varying vec3 vC; uniform float t, k;
        void main(){
          float p = fract(vP - t * 0.22), q = fract(vP * 0.37 - t * 0.09 + 0.5);
          float b = 0.5 + 1.5 * smoothstep(0.86, 0.98, p) * (1.0 - smoothstep(0.98, 1.0, p)) + 0.45 * smoothstep(0.6, 0.86, p) + 0.5 * smoothstep(0.9, 1.0, q);
          gl_FragColor = vec4(vC * k * b, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false; m.userData.toonDone = true;
    this.w.scene.add(m); this.w.disposables.push(g, mat);
    this.w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
  }
}

// ── 소리굽쇠 결정: 줄기 → 멍에 → 나란한 두 가지. 가지 사이로 날아 지날 수 있다 ──
// (x, z): 두 가지의 한가운데, y0: 땅, lx/lz: 가지가 놓인 축(단위 벡터). o: { H: 가지 끝 높이, yoke: 멍에 높이, gap: 가지 안쪽 틈, rt: 가지 굵기, cols, glow, name, pts }
export function fork(w, K, V, x, z, y0, lx, lz, o = {}) {
  const H = o.H ?? 70, yoke = o.yoke ?? H * 0.3, gap = o.gap ?? 12, rt = o.rt ?? 2.6, cols = o.cols || CT, glow = o.glow ?? TEAL, D = gap / 2 + rt;
  const ry = Math.atan2(-lz, lx) / DEG;
  // 줄기와 뿌리 결정
  if (yoke > 2.5) {
    column(w, x, y0 - 2.5, z, rt * 1.5, yoke + 2.5, [cols[0], cols[0], cols[1]], { tip: "flat", ry });
    w.mesh(hexTaperG(0.6), M(x, y0 - 1, z, rt * 2.6, 3.2, rt * 2.6, 0, ry + 30, 0), cols[0], "paint");
    for (let i = 0; i < 5; i++) { const a = i * 72 + 20, d = rt * 2.3; shard(w, x + Math.cos(a * DEG) * d, y0 - 0.6, z + Math.sin(a * DEG) * d, rt * 0.55, rt * (2.2 + (i % 3)), 24, -a + 90, cols[1 + (i & 1)], { col: false }); }
  }
  // 멍에: 가로 들보 + 양 끝 마디
  const yk = y0 + Math.max(yoke, -1);
  hexBeam(w, [x - lx * (D + rt * 0.6), yk, z - lz * (D + rt * 0.6)], [x + lx * (D + rt * 0.6), yk, z + lz * (D + rt * 0.6)], rt * 1.25, cols[1], { col: true });
  hexBeam(w, [x - lx * D * 0.7, yk - rt * 0.9, z - lz * D * 0.7], [x + lx * D * 0.7, yk - rt * 0.9, z + lz * D * 0.7], rt * 1.0, cols[0]);
  for (const s of [-1, 1]) {
    const tx = x + lx * D * s, tz = z + lz * D * s, th = y0 + H - yk;
    w.mesh(icoG(), M(tx, yk, tz, rt * 1.5, rt * 1.5, rt * 1.5, 0, ry, 0), cols[0], "paint");
    column(w, tx, yk, tz, rt, th, cols, { tip: "cut", ry, cutYaw: s > 0 ? 180 : 0, tipColor: o.tipColor ?? ICE });
    // 안쪽 면의 빛 줄(틈을 밝힌다)과 맥박
    const ix = tx - lx * rt * 0.9 * s, iz = tz - lz * rt * 0.9 * s;
    V.add([[ix, yk + rt, iz], [ix, yk + th * 0.5, iz], [ix, y0 + H - rt * 2.4, iz]], 0.34, glow, (x + z) * 0.01, 0.018);
    const ox = tx + lx * rt * 0.9 * s, oz = tz + lz * rt * 0.9 * s;
    w.box(ox, yk + th * 0.18, oz, 0.3, th * 0.5, 0.9, glow, { mat: "glow", col: false, ry, ao: false });
    K.blink.add(tx, y0 + H + 0.6, tz, glow, 0.55 + rt * 0.1, s > 0 ? 0 : 1);
  }
  // 멍에 속의 빛 심, 바닥 빛
  w.mesh(octG(), M(x, yk + rt * 0.2, z, rt * 0.9, rt * 1.5, rt * 0.9, 0, ry, 0), glow, "glow");
  w.pool(x, y0 + 0.1, z, D * 2.4, glow, 0.3);
  if (o.gapReg !== false) w.gap(o.name || "소리굽쇠 결정 사이", x, yk + rt * 1.3 + Math.min(18, (H - yoke) * 0.4) / 2, z, ry, gap - 1, Math.min(18, (H - yoke) * 0.4), o.pts || 350);
}

// ── 오르간 관 결정: 한 줄로 선 육각 관. 높이가 계단처럼 오르내리고, 관마다 빛나는 숨구멍이 있다 ──
// (x, z): 줄의 가운데, (dx, dz): 줄 방향(단위). o: { n, r, sp(간격), H(가장 높은 관), lo(가장 낮은 비율), cols, glow, rise: "arc" | "up" }
export function pipes(w, K, V, x, z, y0, dx, dz, o = {}) {
  const n = o.n ?? 6, r = o.r ?? 2.2, sp = o.sp ?? r * 2.15, H = o.H ?? 50, lo = o.lo ?? 0.4, cols = o.cols || CT, glow = o.glow ?? TEAL, ry = Math.atan2(-dz, dx) / DEG, out = [];
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0.5, k = o.rise === "up" ? lo + (1 - lo) * u : lo + (1 - lo) * Math.sin(u * Math.PI), h = H * k, off = (i - (n - 1) / 2) * sp;
    const px = x + dx * off, pz = z + dz * off, c = [cols[0], cols[i % 2 ? 1 : 2], cols[i % 2 ? 2 : 1]];
    // 발(좁은 밑동) → 몸통 → 열린 입(어두운 속 + 빛 테)
    w.mesh(hexTaperG(1.9), M(px, y0 - 1.5, pz, r * 0.52, 4.5, r * 0.52, 0, ry + 90, 0), cols[0], "paint");
    column(w, px, y0 + 3, pz, r, h - 3, c, { tip: "flat", ry: ry + 90, bands: [0.12, 0.5, 0.38] });
    w.mesh(hexG(), M(px, y0 + h - 0.15, pz, r * 0.78, 0.3, r * 0.78, 0, ry + 90, 0), DEEP, "flat");
    ring(w, px, y0 + h + 0.12, pz, r * 0.9, 0.18, glow, { pitch: 90, col: false, mat: "glow", seg: 6 });
    // 숨구멍: 관 아래쪽의 빛나는 가로 틈(줄의 직각 방향 양면)
    const my = y0 + 3 + (h - 3) * 0.12 + 1.2;
    for (const s of [-1, 1]) w.box(px - dz * r * 0.88 * s, my, pz + dx * r * 0.88 * s, r * 0.95, 1.1, 0.25, glow, { mat: "glow", col: false, ry, ao: false });
    if (i % 2 === 0) V.add([[px - dz * r * 0.9, my + 1.4, pz + dx * r * 0.9], [px - dz * r * 0.9, y0 + h - 1, pz + dx * r * 0.9]], 0.2, glow, i * 0.13 + x * 0.01, 0.02);
    if (h > 30) K.blink.add(px, y0 + h + 1.1, pz, glow, 0.45, i & 1);
    out.push([px, pz, h]);
  }
  w.pool(x, y0 + 0.1, z, sp * n * 0.6, glow, 0.26);
  return out;
}

// ── 뼈 풍차 날개(회전하는 부분): 갈비 날 다섯 장이 돌아가는 바퀴. 축은 로컬 z ──
export const rotorG = () => tp("rotor", () => {
  const parts = [], hub = new THREE.CylinderGeometry(0.55, 0.55, 0.7, 8); hub.rotateX(Math.PI / 2);
  parts.push([hub, null, BONE2]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 360;
    const blade = new THREE.BoxGeometry(0.34, 4.6, 0.1); blade.translate(0, 2.6, 0);
    const P = blade.attributes.position; for (let k = 0; k < P.count; k++) { const y = P.getY(k); P.setX(k, P.getX(k) * (1 + y * 0.42) + y * y * 0.035); }
    blade.computeVertexNormals();
    parts.push([blade, M(0, 0, 0, 1, 1, 1, 0, 0, a), i % 2 ? BONE : PEARL]);
    const tip = new THREE.OctahedronGeometry(0.34, 0);
    parts.push([tip, M(Math.sin(-a * DEG) * 5.1, Math.cos(a * DEG) * 5.1, 0), i % 2 ? AMBER : TEAL]);
  }
  const g = merged(parts); g.computeBoundingSphere(); return g;
});
// 풍경(흔들리는 부분): 매단 줄 + 결정 추 셋. 매단 점이 원점, 아래로 늘어진다
export const chimeG = () => tp("chime", () => {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.7, L = 2.2 + (i % 2) * 0.9;
    const s = new THREE.CylinderGeometry(0.03, 0.03, L, 3); s.translate(x, -L / 2, 0); parts.push([s, null, BONE2]);
    const c = new THREE.CylinderGeometry(0.2, 0.26, 1.5, 6); c.translate(x, -L - 0.75, 0); parts.push([faceted(c), null, [0x86ecd8, 0xffd28a, 0xffa8d8][i]]);
  }
  const g = merged(parts); g.computeBoundingSphere(); return g;
});
// 모래 가오리(헤엄치는 생물): 납작한 마름모 몸 + 긴 꼬리. 머리가 -z, 날개가 ±x
export const sandRayG = () => tp("sandray", () => {
  const body = new THREE.SphereGeometry(1, 10, 6); body.scale(1.9, 0.26, 1.5);
  const P = body.attributes.position;
  for (let k = 0; k < P.count; k++) { const x = P.getX(k), z = P.getZ(k), ax = Math.abs(x) / 1.9; P.setZ(k, z * (1 - ax * 0.72) + ax * 0.5); P.setY(k, P.getY(k) * (1 - ax * 0.7)); }
  body.computeVertexNormals();
  const tail = new THREE.CylinderGeometry(0.02, 0.1, 3.2, 4); tail.rotateX(Math.PI / 2); tail.translate(0, 0, 2.6);
  const fin = new THREE.ConeGeometry(0.16, 0.5, 4); fin.translate(0, 0.3, 0.9);
  const parts = [[body, null, 0xe8b06a], [tail, null, 0xc8854a], [fin, null, 0x5fd8c8]];
  for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(0.12, 5, 4); e.translate(0.36 * s, 0.16, -1.05); parts.push([e, null, 0x9ffff0]); const h = new THREE.ConeGeometry(0.14, 0.7, 4); h.rotateX(-Math.PI / 2); h.translate(0.5 * s, 0, -1.5); parts.push([h, null, 0xc8854a]); }
  const g = merged(parts); g.computeBoundingSphere(); return g;
});
