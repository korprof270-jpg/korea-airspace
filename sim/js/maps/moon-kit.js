// 달 기지 제작 도구: 고리·돔·격자탑·전파 접시·깜박이등·지구
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged } from "./canyon-kit.js";

export { M, beam, prop, merged };

const DEG = Math.PI / 180;
export const WH = 0xe9ebf0, WH2 = 0xc9ced8, ORG = 0xf07a1e, DK = 0x2b3038, GREY = 0x7c828c, GOLD = 0xd9a441, CYA = 0x4fe3ff, AMB = 0xffb040, GRN = 0x5cff8a, RED = 0xff4030, CONC = 0x8d9099, NAVY = 0x1c3f8f;
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// 닫힌 꺾은선을 부드러운 고리로 만들고 옆으로 off 미터 민 차선을 돌려준다 → [[x, z], ...]
export function lane(pts, off = 0, n = 0) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => V3(p[0], 0, p[1])), true, "centripetal"), N = n || pts.length * 6, out = [], p = V3(0, 0, 0), t = V3(0, 0, 0);
  for (let i = 0; i < N; i++) { c.getPointAt(i / N, p); c.getTangentAt(i / N, t); out.push([p.x - t.z * off, p.z + t.x * off]); }
  return out;
}
// 관을 가로질러 지나는 갭의 yaw (관 방향 tx,tz)
export const yawAcross = (tx, tz) => Math.atan2(tz, -tx) / DEG;

const G = {};
const tp = (k, f) => G[k] || (G[k] = f());
const hemi = () => tp("hemi", () => new THREE.SphereGeometry(1, 20, 7, 0, Math.PI * 2, 0, Math.PI / 2));
const oct = () => tp("oct", () => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.translate(0, 0.5, 0); return g; });
const lowSph = () => tp("lsph", () => new THREE.SphereGeometry(1, 10, 6));

// 고리(토러스). 축은 yaw/pitch 로 돌린 로컬 +z. o: { yaw, pitch(도), mat, col, seg, arc, tag }
export function ring(w, x, y, z, R, t, color, o = {}) {
  const seg = o.seg || 28, arc = o.arc || Math.PI * 2;
  const g = tp(`tor${seg}|${(t / R).toFixed(3)}|${arc.toFixed(2)}`, () => new THREE.TorusGeometry(1, t / R, 6, seg, arc));
  const m = M(x, y, z, R, R, R, o.pitch || 0, o.yaw || 0, o.roll || 0);
  w.mesh(g, m, color, o.mat || "paint");
  if (o.col !== false) {
    const n = Math.max(6, Math.round(12 * arc / (Math.PI * 2))), pts = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * arc; pts.push(V3(Math.cos(a), Math.sin(a), 0).applyMatrix4(m)); }
    for (let i = 0; i < n; i++) w.col.addCapsule(pts[i], pts[i + 1], t, o.tag);
  }
}

// 반구 돔 (바닥 중심 x,y,z)
export function dome(w, x, y, z, R, color, o = {}) {
  w.mesh(hemi(), M(x, y, z, R, R * (o.sy || 1), R), color, o.mat || "paint");
  if (o.col !== false) w.col.addSphere(V3(x, y, z), R * Math.min(1, o.sy || 1));
}
// 팔각 기둥·판 (바닥 중심)
export function octa(w, x, y, z, r, h, color, o = {}) {
  w.mesh(oct(), M(x, y, z, r, h, r, 0, o.ry ?? 22.5, 0), color, o.mat || "paint");
  if (o.col !== false) w.col.addBox(V3(x, y + h / 2, z), V3(r * 0.86, h / 2, r * 0.86));
}
// 작은 구(충돌 없음, 저폴리)
export function ball(w, x, y, z, r, color, mat = "glow") { w.mesh(lowSph(), M(x, y, z, r, r, r), color, mat); }

// 격자탑: 네 귀 기둥 + 층마다 가로대 + (open 축의 면은 비우고) 나머지 두 면에만 가새. open: "x" | "z" (그 방향으로 통과할 수 있다)
export function lattice(w, x, y, z, half, H, levels, color, o = {}) {
  const t = o.t || 0.5, open = o.open || "z", c2 = o.color2 ?? color, lh = H / levels;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(w, [x + sx * half, y, z + sz * half], [x + sx * half, y + H, z + sz * half], t, color);
  for (let i = 1; i <= levels; i++) {
    const yy = y + i * lh, col = i % 2 ? c2 : color;
    for (const s of [-1, 1]) {
      beam(w, [x - half, yy, z + s * half], [x + half, yy, z + s * half], t * 0.7, col, {});
      beam(w, [x + s * half, yy, z - half], [x + s * half, yy, z + half], t * 0.7, col, {});
      // 가새
      const d = i % 2 ? 1 : -1;
      if (open === "z") beam(w, [x + s * half, yy - lh, z - half * d], [x + s * half, yy, z + half * d], t * 0.5, col, { col: false });
      else beam(w, [x - half * d, yy - lh, z + s * half], [x + half * d, yy, z + s * half], t * 0.5, col, { col: false });
    }
  }
  // 가새가 있는 면은 얇은 상자 하나로 막는다
  const q = null;
  for (const s of [-1, 1]) {
    if (open === "z") w.col.addBox(V3(x + s * half, y + H / 2, z), V3(t * 0.5, H / 2, half), q);
    else w.col.addBox(V3(x, y + H / 2, z + s * half), V3(half, H / 2, t * 0.5), q);
  }
}

// 전파 접시: 받침 기둥 + 기울어진 포물면 + 급전기. az: 향하는 방위(도), tilt: 수직에서 기운 각(도)
export function dish(w, x, y, z, R, az, tilt, o = {}) {
  const ph = o.ph || 11, depth = R * 0.3;
  const g = tp("dish", () => {
    const pts = [];
    for (let i = 8; i >= 0; i--) { const r = i / 8; pts.push(new THREE.Vector2(r, r * r * 0.3)); }
    for (let i = 0; i <= 8; i++) { const r = i / 8; pts.push(new THREE.Vector2(r * 0.99, r * r * 0.3 - 0.035)); }
    return new THREE.LatheGeometry(pts, 24);
  });
  w.cyl(x, y, z, 2.4, ph, WH2, { mat: "paint", rt: 1.5 });
  w.box(x, y + ph - 0.6, z, 5, 2.2, 3.2, GREY, { mat: "paint", ry: az });
  const m = M(x, y + ph + 1.6, z, 1, 1, 1, tilt, az, 0), P = (lx, ly, lz) => V3(lx, ly, lz).applyMatrix4(m).toArray();
  w.mesh(g, M(x, y + ph + 1.6, z, R, R, R, tilt, az, 0), WH, "paint");
  ring(w, ...P(0, depth - 0.1, 0), R, 0.28, ORG, { col: false, yaw: az, pitch: tilt - 90, seg: 24 });
  const f = P(0, R * 0.62, 0);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; beam(w, P(Math.cos(a) * R * 0.92, depth * 0.85, Math.sin(a) * R * 0.92), f, 0.22, GREY, { col: false }); }
  ball(w, f[0], f[1], f[2], 0.9, DK, "paint"); ball(w, f[0], f[1] - 0.2, f[2], 0.45, RED);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  w.col.addBox(V3(...P(0, depth * 0.55, 0)), V3(R * 0.74, depth * 0.55, R * 0.74), q);
  w.col.addSphere(V3(...f), 1);
  return { P, top: y + ph + 1.6 };
}

// 깜박이는 표시등: 두 무리가 번갈아 켜진다 (메시 2개)
export class Blinkers {
  constructor(w) { this.w = w; this.parts = [[], []]; }
  add(x, y, z, color = RED, r = 0.32, group = 0) { this.parts[group & 1].push([lowSph(), M(x, y, z, r, r, r), color]); }
  finish() {
    const ms = this.parts.map((p) => {
      if (!p.length) return null;
      const m = new THREE.Mesh(merged(p), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.2, 2.2, 2.2) }));
      m.frustumCulled = false; this.w.scene.add(m); return m;
    });
    this.w.updaters.push((dt, t) => { const k = (t * 1.1) % 2; if (ms[0]) ms[0].visible = k < 0.5; if (ms[1]) ms[1].visible = k >= 1 && k < 1.5; });
  }
}

// ── 지구: 멀리 떠 있는 빛을 받지 않는 구. 천천히 자전하고, 밤 쪽은 고정된 그림자 껍질로 가린다 ──
function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, y, wrap) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), W = (i) => ((i % wrap) + wrap) % wrap;
  const a = hash(W(ix), iy), b = hash(W(ix + 1), iy), c = hash(W(ix), iy + 1), d = hash(W(ix + 1), iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
function earthTexture() {
  const W = 512, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), img = g.createImageData(W, H), d = img.data;
  const fb = (u, v, f, s) => vn(u * f + s, v * f * 0.5 + s, f) * 0.55 + vn(u * f * 2 + s, v * f + s, f * 2) * 0.3 + vn(u * f * 4 + s, v * f * 2 + s, f * 4) * 0.15;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / H, lat = Math.abs(v - 0.5) * 2;
    const land = fb(u, v, 6, 3) - lat * lat * 0.08, cl = fb(u + v * 0.15, v, 10, 41) + 0.12 * Math.sin(v * 21 + u * 9);
    let c = land > 0.56 ? (fb(u, v, 12, 77) > 0.5 || lat > 0.55 ? [0x4f, 0xa8, 0x55] : [0xd8, 0xc0, 0x7a]) : land > 0.52 ? [0x54, 0xb6, 0xf2] : land > 0.4 ? [0x2c, 0x7a, 0xe0] : [0x1f, 0x58, 0xc4];
    if (lat > 0.86 + (land - 0.5) * 0.3) c = [0xf2, 0xf6, 0xff];
    if (cl > 0.6) c = [0xff, 0xff, 0xff]; else if (cl > 0.56) c = [(c[0] + 510) / 3, (c[1] + 510) / 3, (c[2] + 510) / 3];
    const k = (j * W + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}
export function earth(w, dir, dist = 1500, R = 210) {
  const p = V3(...dir).normalize().multiplyScalar(dist), sun = w.sunDir.clone();
  const tex = earthTexture();
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 28), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  body.position.copy(p); body.rotation.z = 0.41;
  // 그림자 껍질: 해 반대쪽이 어둡다(경계는 두 단으로 끊는다)
  const sg = new THREE.SphereGeometry(R * 1.004, 48, 28), P = sg.attributes.position, col = new Float32Array(P.count * 4), v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { const nl = v.fromBufferAttribute(P, i).normalize().dot(sun); col[i * 4 + 3] = nl > 0.16 ? 0 : nl > -0.02 ? 0.45 : 0.93; col[i * 4 + 2] = 0.03; }
  sg.setAttribute("color", new THREE.BufferAttribute(col, 4));
  const shade = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, fog: false, depthWrite: false }));
  shade.position.copy(p); shade.renderOrder = 1;
  // 대기 후광
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 40, 20), new THREE.MeshBasicMaterial({ color: 0x3f8cff, transparent: true, opacity: 0.32, side: THREE.BackSide, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(p);
  for (const m of [halo, body, shade]) { m.frustumCulled = false; w.scene.add(m); }
  w.disposables.push(tex);
  w.updaters.push((dt) => { body.rotation.y += dt * 0.012; });
  return body;
}
