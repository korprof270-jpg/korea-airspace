// 네온 맵 공용 도구 (네온 시티·네온 아레나): 네온 간판 아틀라스, 병합 지오메트리, 경로, 고리·지붕·나무·군중
import * as THREE from "../../vendor/three.module.min.js";

export const DEG = Math.PI / 180;
export const MAG = 0xff2bd6, CYA = 0x21d4fd, YEL = 0xffe14a, GRN = 0x35ff7a, ORG = 0xff7a1a, VIO = 0x9b6bff, RED = 0xff3040, WARM = 0xffd9a0, WHT = 0xdfe8ff;
export const NEON = [MAG, CYA, YEL, GRN, ORG, VIO];

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color(), _v = new THREE.Vector3(), _n3 = new THREE.Matrix3();

// 위치·회전(도)·크기 → 행렬 (공용 임시 행렬을 돌려주므로 바로 써야 한다)
export function TRS(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx * DEG, ry * DEG, rz * DEG, "YXZ");
  return _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz));
}

// ── 지오메트리 템플릿(저폴리) ──
const T = {};
const tm = (k, f) => T[k] || (T[k] = f());
export const G = {
  box: () => tm("box", () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (n = 8) => tm("cyl" + n, () => new THREE.CylinderGeometry(1, 1, 1, n)),
  cone: (n = 8, rt = 0) => tm("cone" + n + "_" + rt, () => new THREE.CylinderGeometry(rt, 1, 1, n)),
  sph: () => tm("sph", () => new THREE.SphereGeometry(1, 12, 8)),
  // 사각뿔·사각 절두체(모서리가 축 방향, 밑변 한 변 = 1)
  pyr: (rt = 0) => tm("pyr" + rt, () => { const g = new THREE.CylinderGeometry(rt * Math.SQRT1_2, Math.SQRT1_2, 1, 4); g.rotateY(Math.PI / 4); return flat(g); }),
  // 박공 지붕(삼각기둥): x 폭 1, 높이 1, z 길이 1. 용마루는 z 방향
  gable: () => tm("gable", () => {
    const g = new THREE.BufferGeometry();
    const P = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0, 1, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0, 1, 0.5]];
    const F = [[0, 2, 1], [3, 4, 5], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 4], [0, 1, 4], [0, 4, 3]];
    const pos = []; for (const f of F) for (const i of f) pos.push(...P[i]);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    return g;
  }),
  // 수관용 덩어리(80 삼각형)
  leaf: (k = 0) => tm("leaf" + k, () => {
    const g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i);
      const n = Math.sin(_v.x * 3.1 + k * 2.1) * Math.sin(_v.y * 3.7 + k) * Math.sin(_v.z * 3.3 + k * 0.7);
      _v.multiplyScalar(1 + n * 0.22); P.setXYZ(i, _v.x, _v.y, _v.z);
    }
    g.computeVertexNormals();
    const N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i).normalize().lerp(_p.fromBufferAttribute(N, i), 0.5).normalize(); N.setXYZ(i, _v.x, _v.y, _v.z); }
    return g;
  }),
};
function flat(g) { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; }

// ── 월드 배치용 도형 ──
// 토러스 고리 + 캡슐 충돌체. axis: 고리의 축 방향(x|y|z)
export function ring(w, x, y, z, R, tube, color, o = {}) {
  const axis = o.axis || "y", seg = o.seg || 40, arc = o.arc ?? Math.PI * 2, a0 = o.a0 || 0;
  const g = new THREE.TorusGeometry(R, tube, o.sides || 6, seg, arc);
  if (a0) g.rotateZ(a0);
  if (axis === "x") g.rotateY(Math.PI / 2); else if (axis === "y") g.rotateX(Math.PI / 2);
  w.mesh(g, TRS(x, y, z), color, o.mat || "glow");
  g.dispose();
  if (o.col === false) return;
  const n = o.cseg || Math.max(6, Math.round((16 * arc) / (Math.PI * 2)));
  const pt = (a) => {
    const c = Math.cos(a) * R, s = Math.sin(a) * R;
    return axis === "x" ? new THREE.Vector3(x, y + s, z - c) : axis === "z" ? new THREE.Vector3(x + c, y + s, z) : new THREE.Vector3(x + c, y, z + s);
  };
  for (let i = 0; i < n; i++) w.col.addCapsule(pt(a0 + (i / n) * arc), pt(a0 + ((i + 1) / n) * arc), Math.max(tube, 0.12), o.tag);
}

// 가는 막대(장식, 충돌 없음)
export function bar(w, ax, ay, az, bx, by, bz, r, color, mat = "paint", n = 5) {
  const d = _v.set(bx - ax, by - ay, bz - az), len = d.length();
  _q.setFromUnitVectors(_p.set(0, 1, 0), d.normalize());
  w.mesh(G.cyl(n), _m.compose(_p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), _q, _s.set(r, len, r)), color, mat);
}
// 사각 단면 트러스(크레인·조명 리그): 현재 4개 + 지그재그 사재, 충돌은 캡슐 하나
export function truss(w, ax, ay, az, bx, by, bz, s, color, o = {}) {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz), d = b.clone().sub(a), len = d.length();
  d.normalize();
  const n1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), n2 = new THREE.Vector3().crossVectors(d, n1);
  const h = s / 2, mat = o.mat || "paint", bays = Math.max(1, Math.round(len / (o.bay || s * 1.6)));
  const c = (t, i) => a.clone().addScaledVector(d, t * len).addScaledVector(n1, (i === 0 || i === 3 ? -h : h)).addScaledVector(n2, i < 2 ? -h : h);
  for (let i = 0; i < 4; i++) { const p = c(0, i), q = c(1, i); bar(w, p.x, p.y, p.z, q.x, q.y, q.z, o.r || 0.11, color, mat); }
  for (let k = 0; k < bays; k++) for (let i = 0; i < 4; i++) {
    const p = c(k / bays, (i + (k % 2)) % 4), q = c((k + 1) / bays, (i + 1 - (k % 2) + 4) % 4);
    bar(w, p.x, p.y, p.z, q.x, q.y, q.z, (o.r || 0.11) * 0.6, color, mat, 4);
  }
  if (o.col !== false) w.col.addCapsule(a, b, s * 0.62);
}

// 박공 지붕(용마루가 로컬 z). y 는 처마 높이
export function gable(w, x, y, z, sx, h, sz, color, o = {}) {
  w.mesh(G.gable(), TRS(x, y, z, o.ry || 0, sx, h, sz), color, o.mat || "std");
  if (o.col !== false) { _e.set(0, (o.ry || 0) * DEG, 0); w.col.addBox(_p.set(x, y + h * 0.3, z), _s.set(sx * 0.36, h * 0.3, sz / 2), _q.setFromEuler(_e)); }
}
// 사각뿔(모임) 지붕. top: 윗면 비율(0 = 뾰족)
export function hip(w, x, y, z, sx, h, sz, color, o = {}) {
  w.mesh(G.pyr(o.top || 0), TRS(x, y + h / 2, z, o.ry || 0, sx, h, sz), color, o.mat || "std");
  if (o.col !== false) { _e.set(0, (o.ry || 0) * DEG, 0); w.col.addBox(_p.set(x, y + h * 0.35, z), _s.set(sx * 0.33, h * 0.35, sz * 0.33), _q.setFromEuler(_e)); }
}

// 가벼운 나무(약 260 삼각형). y 는 뿌리 높이
export function tree(w, x, y, z, s = 1, o = {}) {
  const r = w.rand, h = (2.6 + r() * 1.6) * s, cr = (1.9 + r() * 0.8) * s;
  w.mesh(G.cone(6, 0.6), TRS(x, y + h / 2, z, 0, 0.26 * s, h, 0.26 * s), o.trunk ?? 0x4a3828, "std");
  const base = _c.setHSL((o.hue ?? 0.3) + (r() - 0.5) * 0.08, o.sat ?? 0.5, (o.lum ?? 0.2) + r() * 0.07).getHex();
  const n = o.blobs || 3;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = i ? cr * 0.45 : 0, br = cr * (i ? 0.62 + r() * 0.2 : 0.9);
    w.mesh(G.leaf(i % 3), TRS(x + Math.cos(a) * d, y + h + cr * (i ? 0.25 + r() * 0.3 : 0.5), z + Math.sin(a) * d, r() * 360, br, br * 0.8, br), _c.set(base).offsetHSL(0, 0, (r() - 0.5) * 0.05).getHex(), "foliage");
  }
  if (o.col !== false) {
    w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 0.3 * s);
    w.col.addSphere(new THREE.Vector3(x, y + h + cr * 0.5, z), cr * 0.8);
  }
}

// 서 있는 사람들(장식, 충돌 없음): 중심 주변 반경 안에 n 명
export function people(w, x, y, z, rx, rz, n, o = {}) {
  const r = w.rand, tones = o.tones || [0xd9d2c4, 0x7f95c9, 0xc97f8a, 0x86b89a, 0xe0c070, 0x9a86c9, 0x596273];
  for (let i = 0; i < n; i++) {
    const px = x + (r() - 0.5) * 2 * rx, pz = z + (r() - 0.5) * 2 * rz, hh = 1.45 + r() * 0.35;
    w.mesh(G.cone(6, 0.55), TRS(px, y + hh * 0.42, pz, 0, 0.24, hh * 0.84, 0.2), tones[(r() * tones.length) | 0], "std");
    w.mesh(G.box(), TRS(px, y + hh * 0.93, pz, r() * 360, 0.24, 0.26, 0.24), 0xe2b99a, "std");
  }
}

// ── 병합 지오메트리 빌더(움직이는 소품용 한 덩어리 메시) ──
export class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; this.i = []; this.count = 0; }
  add(geo, m, color, k = 1) {
    const P = geo.attributes.position, N = geo.attributes.normal, I = geo.index, base = this.count;
    _n3.getNormalMatrix(m); _c.set(color);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m); this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); this.n.push(_v.x, _v.y, _v.z);
      this.c.push(_c.r * k, _c.g * k, _c.b * k);
    }
    if (I) for (let i = 0; i < I.count; i++) this.i.push(base + I.getX(i)); else for (let i = 0; i < P.count; i++) this.i.push(base + i);
    this.count += P.count;
    return this;
  }
  // y 는 바닥 높이
  box(x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) { return this.add(G.box(), TRS(x, y + sy / 2, z, ry, sx, sy, sz, rx, rz), color); }
  cyl(x, y, z, r, h, color, n = 8, rx = 0, rz = 0) { return this.add(G.cyl(n), TRS(x, y + h / 2, z, 0, r, h, r, rx, rz), color); }
  sph(x, y, z, rx, ry, rz, color) { return this.add(G.sph(), TRS(x, y, z, 0, rx, ry, rz), color); }
  // 두 점을 잇는 막대
  bar(a, b, r, color, n = 6) {
    const d = _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    _q.setFromUnitVectors(_p.set(0, 1, 0), d.normalize());
    return this.add(G.cyl(n), _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(r, len, r)), color);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    return g;
  }
}

// 움직이는 소품용 재질(월드 배치 재질과 비슷한 톤)
export const litMat = () => new THREE.MeshLambertMaterial({ vertexColors: true });
export const glowMat = (w, k = 1) => { const m = new THREE.MeshBasicMaterial({ vertexColors: true }); m.color.setScalar((w.env.glow ?? 2.4) * k); return m; };

// 인스턴스 묶음(한 번의 드로콜로 여러 대). 월드 씬에 추가해 돌려준다
export function fleet(w, geo, mat, n, shadow = false) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.frustumCulled = false; im.castShadow = shadow;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  w.scene.add(im);
  return im;
}
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _mm = new THREE.Matrix4();
// 인스턴스 i 를 pos 에 놓고 dir(진행 방향)로 향하게 한다. 모델 전방은 -Z
export function aim(im, i, pos, dir, s = 1) {
  _z.copy(dir).negate().normalize();
  _x.set(0, 1, 0).cross(_z); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); _x.normalize();
  _y.crossVectors(_z, _x);
  _mm.makeBasis(_x, _y, _z).setPosition(pos);
  if (s !== 1) _mm.scale(_s.set(s, s, s));
  im.setMatrixAt(i, _mm);
}

// ── 꺾은선 경로(일정 속도 이동용) ──
export class Rail {
  constructor(pts, closed = true) {
    this.pts = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.closed = closed;
    this.cum = [0];
    const n = this.pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) this.cum.push(this.cum[i] + this.pts[i].distanceTo(this.pts[(i + 1) % n]));
    this.length = this.cum[m];
  }
  // 거리 s 지점의 위치·방향
  at(s, pos, dir) {
    const L = this.length, n = this.pts.length;
    s = this.closed ? ((s % L) + L) % L : Math.min(L - 1e-4, Math.max(0, s));
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (this.cum[mid] <= s) lo = mid; else hi = mid; }
    const a = this.pts[lo], b = this.pts[(lo + 1) % n], t = (s - this.cum[lo]) / Math.max(1e-6, this.cum[lo + 1] - this.cum[lo]);
    pos.lerpVectors(a, b, t);
    if (dir) dir.subVectors(b, a).normalize();
    return pos;
  }
}

// 둥근 모서리 사각 경로(위에서 볼 때 시계 방향: 북변을 동쪽으로). cw=false 면 반대
export function roundRect(x0, x1, z0, z1, r, y = 0, seg = 6, cw = true) {
  const pts = [], arc = (cx, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); } };
  arc(x1 - r, z0 + r, -Math.PI / 2); arc(x1 - r, z1 - r, 0); arc(x0 + r, z1 - r, Math.PI / 2); arc(x0 + r, z0 + r, Math.PI);
  return cw ? pts : pts.reverse();
}

// ── 네온 간판 아틀라스 ──
// 한글 글꼴이 없는 환경(두부 글자)이면 영문 대체 문구를 쓴다
let _ko = null;
export function hangulOK() {
  if (_ko !== null) return _ko;
  try {
    const c = document.createElement("canvas"); c.width = c.height = 24;
    const g = c.getContext("2d", { willReadFrequently: true }); g.font = "20px sans-serif"; g.textBaseline = "top"; g.fillStyle = "#fff";
    const px = (ch) => { g.clearRect(0, 0, 24, 24); g.fillText(ch, 2, 2); const d = g.getImageData(0, 0, 24, 24).data; let h = 0, ink = 0; for (let i = 3; i < d.length; i += 4) { h = (h * 31 + d[i]) | 0; ink += d[i] > 40 ? 1 : 0; } return [h, ink]; };
    const a = px("한"), b = px("글"), t = px("￿");
    _ko = a[0] !== b[0] && a[0] !== t[0] && a[1] > 20;
  } catch (e) { _ko = false; }
  return _ko;
}

const hex = (c) => (typeof c === "number" ? "#" + c.toString(16).padStart(6, "0") : c);
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// 네온 글자(번짐 + 밝은 심)
export function neonText(g, txt, x, y, size, color, maxW, align = "center") {
  g.font = `900 ${size}px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  g.textAlign = align; g.textBaseline = "middle";
  g.shadowColor = color; g.shadowBlur = size * 0.35; g.fillStyle = color;
  g.fillText(txt, x, y, maxW); g.fillText(txt, x, y, maxW);
  g.shadowBlur = 0; g.fillStyle = "rgba(255,255,255,0.55)"; g.fillText(txt, x, y, maxW);
}
// 픽토그램: (cx, cy) 중심, 크기 s
const ICON = {
  bowl(g, s) { g.beginPath(); g.arc(0, -0.05 * s, 0.42 * s, 0.05 * Math.PI, 0.95 * Math.PI); g.closePath(); g.stroke(); for (const dx of [-0.2, 0, 0.2]) { g.beginPath(); g.moveTo(dx * s, -0.16 * s); g.quadraticCurveTo((dx + 0.08) * s, -0.28 * s, dx * s, -0.36 * s); g.quadraticCurveTo((dx - 0.08) * s, -0.44 * s, dx * s, -0.5 * s); g.stroke(); } },
  cup(g, s) { g.strokeRect(-0.3 * s, -0.22 * s, 0.46 * s, 0.5 * s); g.beginPath(); g.arc(0.2 * s, 0.03 * s, 0.16 * s, -Math.PI / 2, Math.PI / 2); g.stroke(); g.beginPath(); g.moveTo(-0.1 * s, -0.32 * s); g.quadraticCurveTo(0, -0.42 * s, -0.1 * s, -0.5 * s); g.stroke(); },
  note(g, s) { g.beginPath(); g.moveTo(-0.12 * s, 0.25 * s); g.lineTo(-0.12 * s, -0.4 * s); g.lineTo(0.3 * s, -0.48 * s); g.lineTo(0.3 * s, 0.15 * s); g.stroke(); for (const [x, y] of [[-0.24, 0.27], [0.18, 0.17]]) { g.beginPath(); g.ellipse(x * s, y * s, 0.14 * s, 0.1 * s, -0.4, 0, 6.3); g.fill(); } },
  cross(g, s) { g.fillRect(-0.12 * s, -0.4 * s, 0.24 * s, 0.8 * s); g.fillRect(-0.4 * s, -0.12 * s, 0.8 * s, 0.24 * s); },
  drone(g, s) { g.beginPath(); g.moveTo(-0.3 * s, -0.3 * s); g.lineTo(0.3 * s, 0.3 * s); g.moveTo(0.3 * s, -0.3 * s); g.lineTo(-0.3 * s, 0.3 * s); g.stroke(); for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * 0.3 * s, sy * 0.3 * s, 0.17 * s, 0, 6.3); g.stroke(); } g.fillRect(-0.1 * s, -0.1 * s, 0.2 * s, 0.2 * s); },
  arrow(g, s) { g.beginPath(); g.moveTo(-0.42 * s, 0); g.lineTo(0.3 * s, 0); g.moveTo(0.05 * s, -0.28 * s); g.lineTo(0.38 * s, 0); g.lineTo(0.05 * s, 0.28 * s); g.stroke(); },
  star(g, s) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? 0.2 : 0.46) * s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.stroke(); },
  bolt(g, s) { g.beginPath(); g.moveTo(0.1 * s, -0.48 * s); g.lineTo(-0.22 * s, 0.04 * s); g.lineTo(0.02 * s, 0.04 * s); g.lineTo(-0.1 * s, 0.48 * s); g.lineTo(0.24 * s, -0.08 * s); g.lineTo(0, -0.08 * s); g.closePath(); g.fill(); },
  fish(g, s) { g.beginPath(); g.ellipse(-0.06 * s, 0, 0.32 * s, 0.18 * s, 0, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(0.24 * s, 0); g.lineTo(0.44 * s, -0.18 * s); g.lineTo(0.44 * s, 0.18 * s); g.closePath(); g.stroke(); },
  train(g, s) { rrect(g, -0.4 * s, -0.24 * s, 0.8 * s, 0.4 * s, 0.1 * s); g.stroke(); g.strokeRect(-0.28 * s, -0.14 * s, 0.2 * s, 0.14 * s); g.strokeRect(0.06 * s, -0.14 * s, 0.2 * s, 0.14 * s); g.fillRect(-0.46 * s, 0.26 * s, 0.92 * s, 0.07 * s); },
  wheel(g, s) { g.beginPath(); g.arc(0, 0, 0.42 * s, 0, 6.3); g.stroke(); for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(Math.cos(a) * 0.42 * s, Math.sin(a) * 0.42 * s); g.lineTo(-Math.cos(a) * 0.42 * s, -Math.sin(a) * 0.42 * s); g.stroke(); } },
  warn(g, s) { g.beginPath(); g.moveTo(0, -0.42 * s); g.lineTo(0.44 * s, 0.34 * s); g.lineTo(-0.44 * s, 0.34 * s); g.closePath(); g.stroke(); g.fillRect(-0.045 * s, -0.16 * s, 0.09 * s, 0.26 * s); g.fillRect(-0.045 * s, 0.16 * s, 0.09 * s, 0.09 * s); },
  moon(g, s) { g.beginPath(); g.arc(0, 0, 0.4 * s, 0.6, 5.2); g.quadraticCurveTo(-0.05 * s, 0, 0.33 * s, 0.22 * s); g.stroke(); },
  flag(g, s) { g.beginPath(); g.moveTo(-0.3 * s, 0.45 * s); g.lineTo(-0.3 * s, -0.45 * s); g.stroke(); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) g.fillRect((-0.3 + i * 0.22) * s, (-0.45 + j * 0.16) * s, 0.22 * s, 0.16 * s); },
  heart(g, s) { g.beginPath(); g.moveTo(0, 0.36 * s); g.bezierCurveTo(-0.6 * s, -0.05 * s, -0.3 * s, -0.5 * s, 0, -0.18 * s); g.bezierCurveTo(0.3 * s, -0.5 * s, 0.6 * s, -0.05 * s, 0, 0.36 * s); g.stroke(); },
};
export function icon(g, name, cx, cy, s, color) {
  if (!ICON[name]) return;
  g.save(); g.translate(cx, cy);
  g.strokeStyle = g.fillStyle = hex(color); g.lineWidth = Math.max(2, s * 0.085); g.lineCap = g.lineJoin = "round";
  g.shadowColor = hex(color); g.shadowBlur = s * 0.22;
  ICON[name](g, s); ICON[name](g, s);
  g.restore();
}
// 기본 간판 그리기: 테두리 + 픽토그램 + 글자
function drawSign(g, W, H, d, ko) {
  const txt = Array.isArray(d.text) ? d.text[ko ? 0 : 1] : d.text || "";
  const fg = hex(d.fg ?? 0xffffff), fr = hex(d.frame ?? d.fg ?? 0xffffff);
  g.fillStyle = hex(d.bg ?? "#0a0c14"); g.fillRect(0, 0, W, H);
  if (d.draw) { d.draw(g, W, H, ko, txt); return; }
  const m = Math.min(W, H) * 0.08;
  if (d.frame !== null) { g.lineWidth = Math.min(W, H) * 0.045; g.strokeStyle = fr; g.shadowColor = fr; g.shadowBlur = 10; rrect(g, m, m, W - 2 * m, H - 2 * m, m * 1.5); g.stroke(); g.stroke(); g.shadowBlur = 0; }
  if (H > W) {
    // 세로 간판: 픽토그램 위, 글자는 한 자씩 아래로
    let y0 = m * 2.2;
    if (d.icon) { icon(g, d.icon, W / 2, y0 + W * 0.3, W * 0.56, d.ic ?? fr); y0 += W * 0.62; }
    const ch = [...txt], avail = H - y0 - m * 2.2, step = Math.min(W * 0.74, avail / Math.max(1, ch.length));
    ch.forEach((c, i) => neonText(g, c, W / 2, y0 + step * (i + 0.5) + (avail - step * ch.length) / 2, step * 0.86, fg, W * 0.7));
  } else {
    let x0 = m * 2;
    if (d.icon) { icon(g, d.icon, x0 + H * 0.3, H / 2, H * 0.56, d.ic ?? fr); x0 += H * 0.62; }
    const lines = txt.split("\n"), size = Math.min(H * (lines.length > 1 ? 0.3 : 0.46), ((W - x0 - m * 2) / Math.max(1, Math.max(...lines.map((l) => l.length)))) * (ko ? 1.05 : 1.75));
    lines.forEach((l, i) => neonText(g, l, (x0 + W - m * 2) / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.12, size, fg, W - x0 - m * 2.4));
  }
}

// designs: [{ id, kind: wide|tall|big, text: "글" | ["한글", "EN"], icon, fg, frame, bg, draw(g, W, H, ko, txt) }]
// 아틀라스 1024²: wide 256×128 ×15, tall 128×256 ×8, big 512×256 ×2
export class Signs {
  constructor(w, designs, glow = 1) {
    this.w = w;
    const S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d"), ko = hangulOK();
    g.fillStyle = "#05060a"; g.fillRect(0, 0, S, S);
    this.uv = {};
    let nw = 0, nt = 0, nb = 0;
    for (const d of designs) {
      let x, y, cw, ch;
      if (d.kind === "tall") { cw = 128; ch = 256; x = (nt % 8) * 128; y = 512; nt++; }
      else if (d.kind === "big") { cw = 512; ch = 256; x = (nb % 2) * 512; y = 768; nb++; }
      else { cw = 256; ch = 128; x = (nw % 4) * 256; y = ((nw / 4) | 0) * 128; nw++; }
      g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, cw, ch); g.clip();
      drawSign(g, cw, ch, d, ko);
      g.restore();
      const e = 1.5 / S;
      this.uv[d.id] = [x / S + e, 1 - (y + ch) / S + e, (x + cw) / S - e, 1 - y / S - e, cw / ch];
    }
    this.uv._blank = [1010 / S, 1 - 506 / S, 1014 / S, 1 - 502 / S, 1];   // wide 15번 칸(비워 둠)
    const t = (this.tex = new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: t });
    this.k = (w.env.glow ?? 2.4) * 0.52 * glow;
    this.mat.color.setScalar(this.k);
    this.p = []; this.u = []; this.i = []; this.count = 0;
    w.disposables.push(t);
  }
  _quad(m, uv, hw, hh, flip) {
    const b = this.count, s = flip ? -1 : 1;
    for (const [lx, ly, tu, tv] of [[-hw, -hh, 0, 0], [hw, -hh, 1, 0], [hw, hh, 1, 1], [-hw, hh, 0, 1]]) {
      _v.set(lx * s, ly, 0).applyMatrix4(m); this.p.push(_v.x, _v.y, _v.z);
      this.u.push(uv[0] + (uv[2] - uv[0]) * tu, uv[1] + (uv[3] - uv[1]) * tv);
    }
    if (flip) this.i.push(b, b + 2, b + 1, b, b + 3, b + 2); else this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.count += 4;
  }
  // 중심 (x,y,z), 폭 width(m). ry: 면이 향하는 방향(0 = +z, 90 = +x), pitch: -90 이면 위를 보게 눕힘. back: 뒷면도(어두운 판)
  add(id, x, y, z, width, o = {}) {
    const uv = this.uv[id]; if (!uv) return;
    const hw = width / 2, hh = (o.height ?? width / uv[4]) / 2;
    const m = TRS(x, y, z, o.ry || 0, 1, 1, 1, o.pitch || 0, o.roll || 0).clone();
    this._quad(m, uv, hw, hh, false);
    if (o.back) this._quad(m, o.back === true ? this.uv._blank : this.uv[o.back] || this.uv._blank, hw, hh, true);
  }
  // 움직이는 물체에 붙일 단독 간판 메시
  plane(id, width, height) {
    const uv = this.uv[id], g = new THREE.PlaneGeometry(width, height ?? width / uv[4]), U = g.attributes.uv;
    for (let i = 0; i < U.count; i++) U.setXY(i, uv[0] + (uv[2] - uv[0]) * U.getX(i), uv[1] + (uv[3] - uv[1]) * U.getY(i));
    return new THREE.Mesh(g, this.mat);
  }
  // 간판 여러 장을 바깥을 보는 고리로 두른 메시(회전 간판용)
  band(ids, R, h) {
    const n = ids.length, p = [], u = [], ix = [], hw = R * Math.tan(Math.PI / n);
    ids.forEach((id, k) => {
      const a = (k / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), uv = this.uv[id], b = k * 4;
      for (const [lx, ly, tu, tv] of [[-hw, -h / 2, 0, 0], [hw, -h / 2, 1, 0], [hw, h / 2, 1, 1], [-hw, h / 2, 0, 1]]) {
        p.push(c * R + s * lx, ly, s * R - c * lx);
        u.push(uv[0] + (uv[2] - uv[0]) * tu, uv[1] + (uv[3] - uv[1]) * tv);
      }
      ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2)); g.setIndex(ix);
    const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false;
    return m;
  }
  // 모아 둔 간판을 한 메시로 만들어 씬에 추가. pulse: 네온 숨쉬기
  finish(pulse = 0.06) {
    if (this.count) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
      g.setIndex(this.i);
      const mesh = new THREE.Mesh(g, this.mat);
      mesh.frustumCulled = false;
      this.w.scene.add(mesh);
    }
    if (pulse) this.w.updaters.push((dt, t) => this.mat.color.setScalar(this.k * (1 + Math.sin(t * 2.1) * pulse + (Math.sin(t * 13.7) > 0.96 ? -0.12 : 0))));
  }
}
