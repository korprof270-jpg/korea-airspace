// 진영별 적 외형
//  eia: 에이아 제국 기계 병기 (휴마 연합 본편·에이아 잔존 함대)
//  ail: 에일 행성 외계 종족 (우주선·비행체·날아다니는 외계 생명체)
// factionModel(faction, kind, color) → THREE.Group | null
//   kind: grunt ace kamikaze gunship jet boss. color = 계급 색(포인트에 쓴다)
//   반환 모델은 -z 가 앞, userData.tick(dt, thrust, time) 와 userData.dispose() 를 갖는다
//   null 이면 기본 드론 모델을 쓴다
// decorateUnit(unit, type, faction): 지상·함선 유닛(tank aa frigate cruiser mech)에 진영 외피를 입힌다
//
// 구현 메모
//  - 모델은 진영·종류별 "틀"을 한 번 만들고(같은 재질 조각은 한 지오메트리로 합친다) 인스턴스는 틀을 복제해 쓴다
//    → 지오메트리는 모든 인스턴스가 공유, 재질은 진영 공용 + 계급 색별 캐시. dispose 는 공유 자원을 남긴다
//  - 움직이는 부위(고리·날개·촉수·회전익)만 따로 노드로 두고 tick 에서 돌린다
//  - 재질은 toon.js 의 toonMat(밴드 조명·림 라이트)과 발광용 MeshBasicMaterial(색 > 1 → 블룸)
import * as THREE from "../vendor/three.module.min.js";
import { toonMat } from "./toon.js";

const PI = Math.PI, TAU = PI * 2;
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const UPV = new THREE.Vector3(0, 1, 0);

// ── 임시 지오메트리 (틀을 만들 때만 쓰고 합친 뒤 버린다) ─────────────────
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, s = 8) => new THREE.CylinderGeometry(a, b, h, s);
const sph = (r, ws = 10, hs = 8, ...a) => new THREE.SphereGeometry(r, ws, hs, ...a);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const oct = (r) => new THREE.OctahedronGeometry(r);
const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
const tor = (R, r, rs = 4, ts = 12, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc);
function slab(pts, depth, bevel = 0) {   // 평면 도형(x, z) → 두께 depth 의 판. 가운데가 y=0
  const sh = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
  const g = new THREE.ExtrudeGeometry(sh, bevel ? { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 } : { depth, bevelEnabled: false });
  g.rotateX(PI / 2); g.translate(0, depth / 2, 0);   // 도형 y → +z, 돌출 → -y
  return g;
}
const XR = [PI / 2, 0, 0];      // 원기둥·원뿔을 z 축으로 (원뿔 끝 +z)
const XF = [-PI / 2, 0, 0];     // 원뿔 끝 -z (앞)

// ── 틀: 노드마다 (재질 키, 지오메트리, 변환) 목록을 모았다가 재질별로 합친다 ──
function node(parent, name = "", x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; }
function put(n, mk, geo, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  if (Array.isArray(r)) _q.setFromEuler(_e.set(r[0], r[1], r[2], r[3] || "XYZ")); else if (r && r.isQuaternion) _q.copy(r); else _q.identity();
  if (typeof s === "number") _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
  (n.userData.L || (n.userData.L = [])).push({ mk, geo, m: new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s) });
}
// a → b 를 잇는 막대(원기둥·원뿔·상자). 축 = 지오메트리의 +y
function rod(n, mk, geo, a, b, sx = 1, sz = sx) {
  _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _v.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UPV, _w.copy(_v).normalize());
  put(n, mk, geo, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], q, [sx, len, sz]);
}
const qDir = (d) => new THREE.Quaternion().setFromUnitVectors(UPV, _w.set(d[0], d[1], d[2]).normalize());

function merge(list) {
  let nv = 0, ni = 0;
  for (const { geo } of list) { nv += geo.attributes.position.count; ni += geo.index ? geo.index.count : geo.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(); let vo = 0, io = 0;
  for (const { geo, m } of list) {
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const P = geo.attributes.position, N = geo.attributes.normal; nm.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m); pos[(vo + i) * 3] = _v.x; pos[(vo + i) * 3 + 1] = _v.y; pos[(vo + i) * 3 + 2] = _v.z;
      _v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = _v.x; nor[(vo + i) * 3 + 1] = _v.y; nor[(vo + i) * 3 + 2] = _v.z;
    }
    const flip = m.determinant() < 0, I = geo.index, n = I ? I.count : P.count;
    for (let i = 0; i < n; i += 3) {
      const a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, c = I ? I.getX(i + 2) : i + 2;
      idx[io++] = vo + a; idx[io++] = vo + (flip ? c : b); idx[io++] = vo + (flip ? b : c);
    }
    vo += P.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
function bake(root) {
  const nodes = [], used = new Set();
  root.traverse((o) => { if (o.userData.L) nodes.push(o); });
  for (const n of nodes) {
    const by = {};
    for (const e of n.userData.L) { (by[e.mk] || (by[e.mk] = [])).push(e); used.add(e.geo); }
    for (const mk in by) { const m = new THREE.Mesh(merge(by[mk]), null); m.userData.mk = mk; m.name = (n.name || "") + "." + mk; n.add(m); }
    delete n.userData.L;
  }
  for (const g of used) g.dispose();
}
const TPL = new Map();
function template(key, build) {
  let t = TPL.get(key);
  if (!t) { const root = new THREE.Group(); build(root); bake(root); t = root; TPL.set(key, t); }
  return t;
}
const NOSHADOW = new Set(["red", "redOff", "accG", "plume", "vein", "pale", "membrane", "jelly", "crystal", "paleOff"]);
function instance(tpl, pal) {
  const r = tpl.clone(true), N = {};
  r.traverse((o) => {
    if (o.name) N[o.name] = o;
    if (o.isMesh) { o.material = pal[o.userData.mk]; o.castShadow = !NOSHADOW.has(o.userData.mk); o.receiveShadow = false; }
  });
  return { r, N };
}

// ── 재질 ────────────────────────────────────────────────────
const basic = (c, k = 2.2, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), ...o });
let EIA = null, AIL = null;
function eiaShared() {
  if (EIA) return EIA;
  EIA = {
    hull: toonMat({ color: 0x343a45, spec: 0.55, shine: 60, metal: true, rim: 0.45, rimColor: 0xa8b8d0, flat: true }),
    plate: toonMat({ color: 0x5c6573, spec: 0.6, shine: 70, metal: true, rim: 0.4, rimColor: 0xc8d4e8, flat: true }),
    dark: toonMat({ color: 0x15181e, spec: 0.35, shine: 30, rim: 0.3, rimColor: 0x8090a8, flat: true }),
    lens: toonMat({ color: 0x06060a, spec: 1, shine: 120 }),
    hazard: toonMat({ color: 0xf0b81a, spec: 0.3, shine: 30, flat: true }),
    red: basic(0xff2d3d, 1.7), redOff: basic(0xff2d3d, 0.22),
  };
  return EIA;
}
function ailShared() {
  if (AIL) return AIL;
  AIL = {
    skin: toonMat({ color: 0x2c1658, spec: 0.35, shine: 30, rim: 0.85, rimColor: 0xc060ff, rimEdge: 0.55 }),
    belly: toonMat({ color: 0x55308f, spec: 0.2, rim: 0.6, rimColor: 0xe0b0ff }),
    shell: toonMat({ color: 0x1d0e3c, spec: 0.75, shine: 80, rim: 0.75, rimColor: 0xc060ff }),
    membrane: toonMat({ color: 0x7a3ccc, transparent: true, opacity: 0.72, side: THREE.DoubleSide, rim: 0.9, rimColor: 0xe0b0ff }),
    jelly: toonMat({ color: 0x8a48e0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, spec: 0.8, shine: 70, rim: 1, rimColor: 0xf0d0ff, depthWrite: false }),
    crystal: toonMat({ color: 0xb487ff, emissive: 0x3a1278, transparent: true, opacity: 0.86, spec: 1, shine: 110, rim: 0.9, rimColor: 0xffe6ff, flat: true }),
    vein: basic(0xc060ff, 2.2), pale: basic(0xe0b0ff, 2.4), paleOff: basic(0xc060ff, 0.5),
  };
  return AIL;
}
// 공용 재질의 시간 애니메이션 (프레임당 한 번)
let animT = -1;
const _vein = new THREE.Color(0xc060ff), _pale = new THREE.Color(0xe0b0ff);
function animShared(t) {
  if (t === animT) return; animT = t;
  if (AIL) {
    AIL.vein.color.copy(_vein).multiplyScalar(1.7 + 0.7 * Math.sin(t * 2.3));
    AIL.membrane.color.setHSL(0.76 + 0.035 * Math.sin(t * 1.7), 0.62, 0.45 + 0.05 * Math.sin(t * 2.9));
    AIL.jelly.opacity = 0.5 + 0.1 * Math.sin(t * 3.1);
  }
}
const PAL = new Map();
function palette(faction, color) {
  const key = faction + ":" + color;
  let p = PAL.get(key);
  if (p) return p;
  const sh = faction === "eia" ? eiaShared() : ailShared();
  const c = new THREE.Color(color);
  p = Object.assign({}, sh, {
    acc: faction === "eia" ? toonMat({ color: c, spec: 0.5, shine: 50, rim: 0.35, flat: true }) : toonMat({ color: c.clone().lerp(new THREE.Color(0x6a2ac0), 0.25), spec: 0.6, shine: 60, rim: 0.8, rimColor: 0xe0b0ff }),
    accG: basic(c, 2.3),
    plume: new THREE.MeshBasicMaterial({ color: (faction === "eia" ? c.clone() : c.clone().lerp(new THREE.Color(0xc060ff), 0.5)).multiplyScalar(1.6), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
  });
  PAL.set(key, p);
  return p;
}

// 추진 불꽃(+z 로 뻗는 원뿔, 노드 원점이 밑동)
function plume(parent, name, x, y, z, r, len) { r *= 0.8; len *= 0.6; const n = node(parent, name, x, y, z); put(n, "plume", cone(r, len, 6), [0, 0, len / 2], XR); put(n, "plume", cone(r * 0.5, len * 0.6, 6), [0, 0, len * 0.3], XR); return n; }

// ════════════════════════════════════════════════════════════
//  에이아 제국 기계 병기
// ════════════════════════════════════════════════════════════
const EIA_BUILD = {
  // Sentinel: 깎은 구체 몸통 + 붉은 외눈, 두 겹 회전 장갑 고리, 양옆 추진 포드
  grunt(R) {
    const b = node(R, "body");
    put(b, "hull", ico(0.5, 1));
    put(b, "plate", cyl(0.56, 0.56, 0.16, 8), [0, 0, 0], [0, PI / 8, 0]);
    put(b, "acc", cone(0.32, 0.3, 6), [0, 0.52, 0.04]);
    put(b, "dark", cone(0.3, 0.26, 6), [0, -0.5, 0], [PI, 0, 0]);
    put(b, "dark", cyl(0.27, 0.32, 0.24, 8), [0, 0.02, -0.42], XR);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4; put(b, "accG", box(0.1, 0.06, 0.1), [Math.cos(a) * 0.57, 0, Math.sin(a) * 0.57], [0, -a, 0]); }
    rod(b, "dark", cyl(0.015, 0.02, 1, 4), [0.12, 0.5, 0.15], [0.26, 0.98, 0.32]);
    put(b, "red", sph(0.04, 6, 4), [0.26, 0.99, 0.32]);
    const eye = node(b, "eye", 0, 0.02, -0.5);
    put(eye, "red", sph(0.17, 12, 8), [0, 0, -0.04], 0, [1, 1, 0.7]);
    put(eye, "lens", cyl(0.07, 0.07, 0.04, 8), [0, 0, -0.16], XR);
    put(eye, "plate", tor(0.21, 0.035, 4, 10), [0, 0, -0.1]);
    put(eye, "dark", box(0.5, 0.06, 0.12), [0, 0.2, -0.06], [-0.3, 0, 0]);   // 눈썹 차양
    for (const sx of [-1, 1]) {   // 추진 포드
      put(b, "dark", box(0.2, 0.08, 0.2), [sx * 0.5, -0.12, 0.12]);
      put(b, "hull", cyl(0.11, 0.15, 0.46, 6), [sx * 0.66, -0.14, 0.12], XR);
      put(b, "accG", cyl(0.09, 0.09, 0.03, 6), [sx * 0.66, -0.14, 0.36], XR);
      plume(b, "pl" + (sx > 0 ? 1 : 0), sx * 0.66, -0.14, 0.37, 0.09, 0.6);
    }
    const tilt = node(R, "tilt", 0, -0.08, 0); tilt.rotation.x = -0.42;
    const ra = node(tilt, "ringA"), rb = node(R, "ringB");
    for (let k = 0; k < 2; k++) {
      put(ra, "plate", tor(0.86, 0.05, 3, 9, 2.2), [0, 0, 0], [PI / 2, 0, k * PI]);
      put(ra, "accG", box(0.12, 0.08, 0.12), [Math.cos(k * PI + 1.1) * 0.86, 0, -Math.sin(k * PI + 1.1) * 0.86]);
      put(rb, "hull", tor(0.76, 0.06, 3, 8, 1.7), [0, 0, 0.05], [0, 0, k * PI + 0.7]);
      put(rb, "red", box(0.07, 0.07, 0.07), [Math.cos(k * PI + 1.55) * 0.76, Math.sin(k * PI + 1.55) * 0.76, 0.05]);
    }
  },
  // Mantis: 길쭉한 각진 몸통, 낫 모양 칼날 팔 둘, 쌍안
  ace(R) {
    const b = node(R, "body");
    put(b, "hull", oct(0.5), [0, 0, 0.1], 0, [0.75, 0.48, 1.5]);
    put(b, "plate", box(0.46, 0.1, 0.9), [0, 0.2, 0.2], [0.12, 0, 0]);
    put(b, "acc", box(0.08, 0.06, 0.8), [0, 0.27, 0.22], [0.12, 0, 0]);
    put(b, "hull", cone(0.26, 0.95, 5), [0, 0.02, 1.15], XR);
    put(b, "dark", cyl(0.12, 0.12, 0.35, 6), [0, -0.12, 0.6], XR);
    const head = node(b, "head", 0, 0.06, -0.78);
    put(head, "dark", oct(0.3), [0, 0, 0], 0, [1.05, 0.7, 1.25]);
    put(head, "plate", box(0.05, 0.12, 0.42), [0, 0.18, 0.02], [0.2, 0, 0]);
    for (const sx of [-1, 1]) put(head, "red", sph(0.07, 8, 6), [sx * 0.11, 0.04, -0.27]);
    put(head, "dark", box(0.36, 0.04, 0.12), [0, 0.1, -0.24], [-0.4, 0, 0]);
    for (const sx of [-1, 1]) {
      const arm = node(b, sx < 0 ? "armL" : "armR", sx * 0.36, -0.02, -0.3);
      rod(arm, "dark", box(1, 1, 1), [0, 0, 0], [sx * 0.42, 0.06, -0.2], 0.1, 0.12);
      put(arm, "plate", ico(0.09, 0), [sx * 0.42, 0.06, -0.2]);
      // 낫 칼날: 바깥에서 앞쪽 안으로 휜다
      const bl = node(arm, sx < 0 ? "bladeL" : "bladeR", sx * 0.42, 0.06, -0.2);
      const pts = [[0.02 * sx, 0.1], [0.16 * sx, -0.05], [0.12 * sx, -0.5], [-0.2 * sx, -1.0], [-0.12 * sx, -0.52], [-0.08 * sx, 0.04]];
      put(bl, "acc", slab(pts, 0.04));
      put(bl, "accG", slab([[-0.09 * sx, -0.02], [-0.13 * sx, -0.5], [-0.19 * sx, -0.93], [-0.15 * sx, -0.52]], 0.05));
      // 등 지느러미 + 추진기
      put(b, "hull", box(0.85, 0.035, 0.36), [sx * 0.48, 0.13, 0.55], [0, sx * 0.45, sx * 0.32]);
      put(b, "accG", box(0.12, 0.05, 0.06), [sx * 0.84, 0.27, 0.78], [0, sx * 0.45, sx * 0.32]);
      put(b, "dark", cyl(0.07, 0.09, 0.3, 6), [sx * 0.17, -0.06, 0.86], XR);
      put(b, "accG", cyl(0.06, 0.06, 0.02, 6), [sx * 0.17, -0.06, 1.02], XR);
      plume(b, "pl" + (sx > 0 ? 1 : 0), sx * 0.17, -0.06, 1.03, 0.07, 0.55);
    }
  },
  // Spike: 가시 공 기뢰. 껍질은 돌고 띠·눈이 깜박인다
  kamikaze(R) {
    const sh = node(R, "shell");
    put(sh, "hull", ico(0.44, 1));
    const P = new THREE.IcosahedronGeometry(1, 0).attributes.position, seen = [];
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).normalize();
      if (seen.some((s) => s.distanceTo(_v) < 0.01)) continue; seen.push(_v.clone());
      const d = [_v.x, _v.y, _v.z], q = qDir(d);
      put(sh, "plate", cone(0.1, 0.46, 5), [_v.x * 0.62, _v.y * 0.62, _v.z * 0.62], q);
      put(sh, "acc", cyl(0.12, 0.12, 0.07, 5), [_v.x * 0.43, _v.y * 0.43, _v.z * 0.43], q);
    }
    const bl = node(sh, "blink");
    put(bl, "red", tor(0.45, 0.045, 3, 14), [0, 0, 0], [PI / 2, 0, 0]);
    put(bl, "red", tor(0.45, 0.045, 3, 14), [0, 0, 0], [0, PI / 2, 0]);
    const eye = node(R, "eye", 0, 0, -0.38);
    put(eye, "dark", cyl(0.2, 0.22, 0.12, 8), [0, 0, 0], XR);
    const eb = node(eye, "blinkEye");
    put(eb, "red", sph(0.14, 10, 6), [0, 0, -0.07], 0, [1, 1, 0.6]);
    put(R, "dark", cyl(0.1, 0.14, 0.2, 6), [0, 0, 0.47], XR);
    plume(R, "pl0", 0, 0, 0.58, 0.08, 0.45);
  },
  // Warden: 육각 장갑 선체 + 회전 기관포 + 덕트 회전익 넷
  gunship(R) {
    const b = node(R, "body");
    put(b, "hull", cyl(1.12, 1.28, 0.7, 6), [0, 0, 0], [0, PI / 6, 0], [1, 1, 1.28]);
    put(b, "plate", cyl(0.78, 1.0, 0.34, 6), [0, 0.5, 0.05], [0, PI / 6, 0], [1, 1, 1.25]);
    put(b, "dark", cyl(1.0, 0.6, 0.42, 6), [0, -0.54, 0], [0, PI / 6, 0], [1, 1, 1.25]);
    put(b, "dark", box(0.62, 0.3, 0.66), [0, 0.8, 0.15]);
    put(b, "red", box(0.5, 0.08, 0.04), [0, 0.82, -0.19]);
    put(b, "red", box(1.1, 0.1, 0.05), [0, 0.06, -1.47]);
    for (let i = -1; i <= 1; i++) put(b, "red", sph(0.07, 6, 4), [i * 0.3, -0.14, -1.45]);
    put(b, "acc", box(1.62, 0.05, 0.16), [0, 0.36, -0.95]);
    for (let i = 0; i < 4; i++) put(b, "hazard", box(0.12, 0.052, 0.3), [-0.55 + i * 0.37, 0.69, 0.75], [0, 0.6, 0]);
    put(b, "dark", box(1.5, 0.05, 0.36), [0, 0.68, 0.75]);
    for (const sx of [-1, 1]) {
      put(b, "dark", box(0.3, 0.22, 0.75), [sx * 0.52, 0.72, -0.25]);              // 미사일 상자
      for (const k of [-1, 1]) put(b, "red", cyl(0.05, 0.05, 0.02, 6), [sx * 0.52 + k * 0.07, 0.72, -0.63], XR);
      put(b, "plate", box(0.32, 0.3, 0.8), [sx * 0.95, -0.28, -0.75]);            // 측면 포
      for (const k of [-1, 1]) put(b, "dark", cyl(0.05, 0.05, 0.9, 5), [sx * 0.95 + k * 0.08, -0.28, -1.4], XR);
      put(b, "dark", cyl(0.16, 0.22, 0.5, 6), [sx * 0.45, -0.05, 1.55], XR);       // 뒤 추진기
      put(b, "accG", cyl(0.13, 0.13, 0.03, 6), [sx * 0.45, -0.05, 1.81], XR);
      plume(b, "pl" + (sx > 0 ? 1 : 0), sx * 0.45, -0.05, 1.82, 0.13, 0.9);
    }
    const gat = node(b, "gat", 0, -0.62, -1.35);
    put(b, "plate", cyl(0.25, 0.25, 0.4, 8), [0, -0.62, -1.25], XR);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; put(gat, "dark", cyl(0.04, 0.04, 1.0, 5), [Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.5], XR); }
    put(gat, "plate", cyl(0.19, 0.19, 0.06, 8), [0, 0, -0.75], XR);
    put(gat, "accG", tor(0.17, 0.025, 3, 10), [0, 0, -1.0]);
    // 회전익: 덕트 + 지지대(고정), 날개(회전)
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      const x = sx * 1.55, z = sz * 0.95, y = 0.15;
      put(b, "hull", tor(0.55, 0.08, 4, 14), [x, y, z], [PI / 2, 0, 0]);
      put(b, "accG", tor(0.47, 0.022, 3, 14), [x, y + 0.06, z], [PI / 2, 0, 0]);
      rod(b, "dark", box(1, 1, 1), [sx * 0.95, 0.05, z * 0.85], [x, y, z], 0.12, 0.2);
      put(b, "dark", cyl(0.09, 0.11, 0.2, 6), [x, y, z]);
      const rt = node(b, "rot" + i, x, y + 0.08, z);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; put(rt, "dark", box(0.46, 0.02, 0.1), [Math.cos(a) * 0.24, 0, -Math.sin(a) * 0.24], [0.2, a, 0]); }
    });
  },
  // Lancer: 모서리를 깎은 화살촉 평면 + 빛나는 이음선, 쌍 창(lance)
  jet(R) {
    const b = node(R, "body");
    const half = [[0, -3.0], [0.36, -1.7], [0.58, -0.4], [2.3, 1.25], [2.3, 1.6], [1.0, 1.4], [0.72, 2.3], [0.3, 2.05], [0, 2.15]];
    const full = half.concat(half.slice(1, -1).reverse().map(([x, z]) => [-x, z]));
    put(b, "hull", slab(full, 0.1, 0.1));
    const sp = [[0, -2.75], [0.3, -1.0], [0.42, 0.7], [0.28, 2.05], [-0.28, 2.05], [-0.42, 0.7], [-0.3, -1.0]];
    put(b, "plate", slab(sp, 0.18, 0.12), [0, 0.2, 0]);
    put(b, "dark", slab([[0, -2.2], [0.24, -1.2], [0, -0.7], [-0.24, -1.2]], 0.05), [0, 0.4, 0]);
    put(b, "red", slab([[0, -2.05], [0.17, -1.25], [0.1, -1.15], [0, -1.65], [-0.1, -1.15], [-0.17, -1.25]], 0.05), [0, 0.43, 0]);
    for (const sx of [-1, 1]) {
      const ed = (a, c, mk = "accG", y = 0.05, w = 0.09) => rod(b, mk, box(1, 1, 1), [a[0] * sx, y, a[1]], [c[0] * sx, y, c[1]], w, 0.06);
      ed([0.62, -0.3], [2.25, 1.28]);                 // 앞전 이음선
      ed([0.42, -1.05], [0.5, 0.65], "accG", 0.27, 0.04);
      ed([2.33, 1.25], [2.33, 1.62], "red", 0.03, 0.08);  // 날개 끝 센서
      put(b, "hull", box(0.05, 0.62, 0.75), [sx * 0.55, 0.42, 1.45], [0, 0, sx * -0.42]);
      put(b, "acc", box(0.07, 0.1, 0.5), [sx * 0.69, 0.71, 1.55], [0, 0, sx * -0.42]);
      put(b, "dark", box(0.42, 0.24, 0.5), [sx * 0.3, 0.05, 2.05]);
      put(b, "accG", box(0.34, 0.16, 0.04), [sx * 0.3, 0.05, 2.31]);
      plume(b, "pl" + (sx > 0 ? 1 : 0), sx * 0.3, 0.05, 2.33, 0.16, 1.6);
      put(b, "dark", cyl(0.06, 0.06, 1.7, 5), [sx * 1.25, -0.14, 0.1], XR);    // 창
      put(b, "plate", cone(0.06, 0.45, 5), [sx * 1.25, -0.14, -0.98], XF);
      put(b, "accG", box(0.05, 0.05, 0.25), [sx * 1.25, -0.22, 0.5]);
    }
  },
  // Overseer: 앞을 노려보는 육각 모선. 거대한 붉은 눈, 조리개 날, 바깥 회전 장갑 고리
  boss(R) {
    const b = node(R, "body");
    put(b, "hull", cyl(4.2, 4.2, 2.2, 6), [0, 0, 0], [PI / 2, 0, 0]);
    put(b, "plate", cyl(4.25, 3.7, 0.55, 6), [0, 0, -1.35], [PI / 2, 0, 0]);
    put(b, "dark", cyl(3.0, 3.6, 2.0, 6), [0, 0, 2.0], [PI / 2, 0, 0]);
    put(b, "dark", cyl(2.1, 2.5, 0.7, 12), [0, 0, -1.7], [PI / 2, 0, 0]);
    put(b, "plate", tor(2.25, 0.18, 4, 18), [0, 0, -2.05]);
    put(b, "red", sph(1.75, 18, 12), [0, 0, -1.75], 0, [1, 1, 0.55]);
    put(b, "lens", box(0.42, 1.9, 0.3), [0, 0, -2.66]);
    put(b, "lens", tor(0.95, 0.06, 3, 16), [0, 0, -2.5]);
    const iris = node(b, "iris", 0, 0, -2.2);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; put(iris, "dark", box(0.9, 0.3, 0.12), [Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0], [0, 0, a + 0.5]); }
    for (let i = 0; i < 6; i++) {   // 바퀴살 장갑판 + 계급 불빛
      const a = (i / 6) * TAU + PI / 6, c = Math.cos(a), s = Math.sin(a);
      put(b, "plate", box(1.4, 0.5, 0.25), [c * 3.0, s * 3.0, -1.66], [0, 0, a]);
      put(b, "accG", box(0.3, 0.3, 0.12), [c * 3.65, s * 3.65, -1.78], [0, 0, a]);
      put(b, "dark", cyl(0.35, 0.45, 0.5, 6), [Math.cos(a - PI / 6) * 4.1, Math.sin(a - PI / 6) * 4.1, 0.3], XR);   // 가장자리 포탑
      put(b, "dark", cyl(0.08, 0.08, 1.2, 5), [Math.cos(a - PI / 6) * 4.1, Math.sin(a - PI / 6) * 4.1, -0.5], XR);
      put(b, "red", box(0.5, 0.12, 0.05), [Math.cos(a - PI / 6) * 4.2, Math.sin(a - PI / 6) * 4.2, -1.14], [0, 0, a - PI / 6 + PI / 2]);
    }
    for (let i = 0; i < 3; i++) {   // 뒤 추진기
      const a = (i / 3) * TAU + PI / 2, x = Math.cos(a) * 1.7, y = Math.sin(a) * 1.7;
      put(b, "hull", cyl(0.65, 0.85, 1.0, 8), [x, y, 3.2], XR);
      put(b, "accG", cyl(0.55, 0.55, 0.05, 8), [x, y, 3.72], XR);
      plume(b, "pl" + i, x, y, 3.75, 0.55, 3);
    }
    const ring = node(R, "ring", 0, 0, 0.4);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      put(ring, "plate", tor(5.6, 0.42, 4, 5, 0.72), [0, 0, 0], [0, 0, a]);
      put(ring, "dark", box(0.5, 1.2, 1.3), [Math.cos(a) * 5.6, Math.sin(a) * 5.6, 0], [0, 0, a]);
      put(ring, "red", box(0.25, 0.25, 0.1), [Math.cos(a + 0.36) * 5.6, Math.sin(a + 0.36) * 5.6, -0.45]);
      put(ring, "accG", box(0.6, 0.12, 0.08), [Math.cos(a + 0.18) * 5.95, Math.sin(a + 0.18) * 5.95, -0.3], [0, 0, a + 0.18 + PI / 2]);
    }
    const ring2 = node(R, "ring2", 0, 0, 1.6);
    for (let i = 0; i < 4; i++) put(ring2, "hull", tor(4.9, 0.25, 3, 6, 1.0), [0, 0, 0], [0, 0, (i / 4) * TAU]);
  },
};

function eiaTick(kind, N, ph) {
  const pls = [N.pl0, N.pl1, N.pl2].filter(Boolean);
  const fl = (thr, t, k = 1) => { for (const p of pls) p.scale.set(1, 1, Math.max(0.15, (0.45 + thr * 0.9 + Math.sin(t * 50 + ph) * 0.12) * k)); };
  switch (kind) {
    case "grunt": return (dt, thr, t) => {
      N.body.position.y = Math.sin(t * 2.1 + ph) * 0.05;
      N.ringA.rotation.y = t * 1.3 + ph; N.tilt.rotation.z = Math.sin(t * 0.7 + ph) * 0.15;
      N.ringB.rotation.z = -t * 0.9 - ph; N.tilt.position.y = N.body.position.y - 0.08; N.ringB.position.y = N.body.position.y;
      N.eye.rotation.y = Math.sin(t * 0.8 + ph) * 0.3; N.eye.rotation.x = Math.sin(t * 1.3 + ph * 2) * 0.12;
      fl(thr, t);
    };
    case "ace": return (dt, thr, t) => {
      const s = Math.sin(t * 2.4 + ph);
      N.armL.rotation.y = -0.15 + s * 0.12; N.armR.rotation.y = 0.15 - s * 0.12;
      N.bladeL.rotation.x = 0.1 + Math.max(0, Math.sin(t * 1.1 + ph)) ** 6 * 0.8; N.bladeR.rotation.x = 0.1 + Math.max(0, Math.sin(t * 1.1 + ph + 1.5)) ** 6 * 0.8;
      N.head.rotation.y = Math.sin(t * 0.9 + ph) * 0.25;
      N.body.position.y = Math.sin(t * 3 + ph) * 0.03;
      fl(thr, t);
    };
    case "kamikaze": {
      const bl = N.blink.children[0], be = N.blinkEye.children[0];
      return (dt, thr, t) => {
        N.shell.rotation.y += dt * (1.5 + thr * 2); N.shell.rotation.x += dt * 0.8;
        const on = Math.sin(t * (7 + thr * 6) + ph) > 0.2;
        const pal = bl.userData.pal; bl.material = on ? pal.red : pal.redOff; be.material = on ? pal.red : pal.redOff;
        const k = on ? 1.12 : 1; N.blinkEye.scale.setScalar(k);
        fl(thr, t);
      };
    }
    case "gunship": return (dt, thr, t) => {
      for (let i = 0; i < 4; i++) N["rot" + i].rotation.y += dt * (i % 2 ? 30 : -30);
      N.gat.rotation.z += dt * 9;
      N.body.position.y = Math.sin(t * 1.4 + ph) * 0.06; N.body.rotation.z = Math.sin(t * 0.9 + ph) * 0.03;
      fl(thr, t);
    };
    case "jet": return (dt, thr, t) => fl(thr, t);
    case "boss": return (dt, thr, t) => {
      N.ring.rotation.z = t * 0.25; N.ring2.rotation.z = -t * 0.4; N.iris.rotation.z = Math.sin(t * 0.5) * 0.4;
      N.iris.scale.setScalar(1 + Math.sin(t * 1.7) * 0.05);
      N.body.position.y = Math.sin(t * 0.8 + ph) * 0.25;
      fl(thr, t);
    };
  }
}

// ════════════════════════════════════════════════════════════
//  에일 외계 종족
// ════════════════════════════════════════════════════════════
// 바깥 → 안쪽으로 굽은 촉수 사슬. 반환: 마디 노드 목록
function tentacle(parent, name, x, y, z, segs, len, r0, mkBody = "belly", mkTip = "pale") {
  const out = []; let p = node(parent, name + "0", x, y, z);
  for (let i = 0; i < segs; i++) {
    const r1 = r0 * (1 - (i + 1) / (segs + 0.6)), ri = r0 * (1 - i / (segs + 0.6));
    put(p, mkBody, cyl(ri, r1, len, 5), [0, -len / 2, 0]);
    put(p, "vein", sph(ri * 0.55, 5, 3), [0, -len * 0.15, 0]);
    out.push(p);
    if (i < segs - 1) p = node(p, name + (i + 1), 0, -len, 0);
    else put(p, mkTip, sph(r1 * 1.6 + 0.02, 6, 4), [0, -len, 0]);
  }
  return out;
}
const AIL_BUILD = {
  // Ray: 쥐가오리. 두 마디 날개가 너울거리고 정맥이 빛난다
  grunt(R) {
    const b = node(R, "body");
    put(b, "skin", sph(0.5, 14, 8), [0, 0, 0], 0, [0.9, 0.3, 1.45]);
    put(b, "belly", sph(0.5, 12, 6), [0, -0.05, 0.02], 0, [0.82, 0.22, 1.32]);
    put(b, "vein", box(0.035, 0.02, 1.0), [0, 0.15, 0.05]);
    for (let i = 0; i < 3; i++) put(b, "pale", sph(0.04, 6, 4), [0, 0.14, -0.3 + i * 0.25]);
    for (const sx of [-1, 1]) {
      put(b, "skin", cone(0.09, 0.42, 6), [sx * 0.24, -0.02, -0.78], [-PI / 2 - 0.2, 0, sx * 0.3]);   // 머리 지느러미
      put(b, "accG", sph(0.065, 8, 6), [sx * 0.21, 0.07, -0.55]);                                  // 눈 (계급 색)
      put(b, "vein", box(0.03, 0.02, 0.55), [sx * 0.2, 0.12, 0.05], [0, sx * 0.25, 0]);
      const w1 = node(b, sx < 0 ? "w1L" : "w1R", sx * 0.3, 0.02, 0);
      const s = (pts) => slab(pts.map(([x, z]) => [x * sx, z]), 0.05);
      const rev = (a) => a;   // ExtrudeGeometry 가 감김 방향을 스스로 맞춘다
      put(w1, "skin", s(rev([[0, -0.55], [0.55, -0.32], [0.8, -0.12], [0.8, 0.42], [0.4, 0.5], [0, 0.6]])));
      rod(w1, "vein", box(1, 1, 1), [0, 0.035, -0.3], [sx * 0.8, 0.035, -0.05], 0.03, 0.025);
      rod(w1, "vein", box(1, 1, 1), [0, 0.035, 0.2], [sx * 0.78, 0.035, 0.2], 0.03, 0.025);
      const w2 = node(w1, sx < 0 ? "w2L" : "w2R", sx * 0.8, 0, 0);
      put(w2, "skin", s(rev([[0, -0.12], [0.35, 0.05], [0.72, 0.38], [0.35, 0.36], [0, 0.42]])));
      rod(w2, "vein", box(1, 1, 1), [0, 0.035, 0], [sx * 0.68, 0.035, 0.36], 0.028, 0.022);
      put(w2, "accG", sph(0.05, 6, 4), [sx * 0.7, 0.02, 0.37]);
    }
    const tail = node(b, "tail", 0, 0, 0.66);
    put(tail, "skin", cone(0.05, 1.3, 5), [0, 0, 0.65], XR);
    put(tail, "pale", sph(0.05, 6, 4), [0, 0, 1.32]);
  },
  // Stinger: 잠자리형. 네 장의 반짝이는 날개, 마디 꼬리 끝의 독침
  ace(R) {
    const b = node(R, "body");
    put(b, "skin", sph(0.21, 10, 8), [0, 0.02, -0.78], 0, [1, 0.85, 0.9]);
    for (const sx of [-1, 1]) {
      put(b, "accG", sph(0.11, 10, 8), [sx * 0.12, 0.07, -0.84]);             // 겹눈 (계급 색)
      put(b, "shell", cone(0.04, 0.22, 5), [sx * 0.07, -0.08, -0.98], [-PI / 2 - 0.5, 0, sx * 0.4]);   // 턱
      for (let k = 0; k < 3; k++) rod(b, "shell", cyl(0.018, 0.012, 1, 4), [sx * 0.1, -0.15, -0.5 + k * 0.15], [sx * 0.35, -0.42, -0.62 + k * 0.2]);
    }
    put(b, "skin", sph(0.28, 12, 8), [0, 0, -0.38], 0, [0.85, 0.9, 1.35]);
    put(b, "shell", sph(0.29, 12, 6, 0, TAU, 0, PI * 0.45), [0, 0.03, -0.38], 0, [0.88, 0.95, 1.38]);
    for (let k = 0; k < 3; k++) put(b, "crystal", oct(0.09), [0, 0.3, -0.55 + k * 0.17], [0, 0, 0.3 * (k - 1)], [0.6, 1.8, 0.6]);
    put(b, "vein", box(0.04, 0.02, 0.4), [0, 0.27, -0.38]);
    // 배: 마디 사슬
    let p = node(b, "ab0", 0, 0.02, -0.1); const abs = [];
    for (let i = 0; i < 4; i++) {
      const r = 0.14 - i * 0.022;
      put(p, i % 2 ? "skin" : "shell", sph(r, 8, 6), [0, 0, 0.17], 0, [1, 0.9, 1.6]);
      put(p, "vein", tor(r * 0.95, 0.012, 3, 10), [0, 0, 0.3]);
      abs.push(p);
      if (i < 3) p = node(p, "ab" + (i + 1), 0, 0, 0.36);
    }
    put(p, "crystal", cone(0.06, 0.42, 5), [0, 0.12, 0.52], [PI / 2 - 0.55, 0, 0]);
    put(p, "accG", sph(0.04, 6, 4), [0, 0.24, 0.71]);
    // 날개 넷
    [[-1, -0.48], [1, -0.48], [-1, -0.25], [1, -0.25]].forEach(([sx, z], i) => {
      const w = node(b, "w" + i, sx * 0.1, 0.2, z);
      const L = i < 2 ? 1.05 : 0.95;
      put(w, "membrane", sph(0.5, 10, 4), [sx * L * 0.5, 0, 0], [0, sx * (i < 2 ? 0.12 : -0.18), 0], [L, 0.03, 0.34]);
      rod(w, "vein", box(1, 1, 1), [0, 0.02, -0.08], [sx * L * 0.95, 0.02, -0.05], 0.012, 0.012);
      put(w, "accG", sph(0.03, 5, 3), [sx * L * 0.96, 0.02, sx * (i < 2 ? -0.05 : 0.07)]);
    });
  },
  // Spore: 해파리. 맥동하는 종 + 비치는 핵, 끌리는 촉수
  kamikaze(R) {
    const b = node(R, "body"); b.rotation.x = -1.05;   // 종 꼭대기가 앞(-z)을 향해 기운다
    const bell = node(b, "bell");
    put(bell, "jelly", sph(0.62, 14, 7, 0, TAU, 0, PI * 0.56));
        put(bell, "pale", tor(0.6, 0.04, 3, 16), [0, -0.11, 0], [PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) put(bell, "vein", tor(0.625, 0.01, 3, 8, PI * 0.42), [0, 0, 0], [0, (i / 8) * TAU, 0.06]);
    put(bell, "skin", tor(0.3, 0.07, 4, 12), [0, -0.02, 0], [PI / 2, 0, 0]);
    const core = node(b, "core", 0, 0.12, 0);
    put(core, "accG", ico(0.25, 1));
    const tn = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; tn.push(tentacle(b, "t" + i + "_", Math.cos(a) * 0.46, -0.1, Math.sin(a) * 0.46, 2, 0.5, 0.06)); }
    for (let i = 0; i < 2; i++) tentacle(b, "o" + i + "_", (i ? 1 : -1) * 0.12, -0.05, 0, 2, 0.4, 0.09, "membrane", "vein");
  },
  // Leviathan pup: 갑각 선체에 수정 가시, 빛나는 구멍들, 너울대는 옆지느러미와 꼬리
  gunship(R) {
    const b = node(R, "body");
    put(b, "shell", sph(1.0, 16, 10), [0, 0, 0], 0, [1.1, 0.62, 1.85]);
    put(b, "belly", sph(1.0, 14, 8), [0, -0.16, 0.05], 0, [0.95, 0.46, 1.65]);
    for (let i = 0; i < 5; i++) {   // 갑각 마디(늑골)
      const z = -1.1 + i * 0.55, f = Math.sqrt(Math.max(0.05, 1 - (z / 1.85) ** 2)), rx = 1.1 * f + 0.03, ry = 0.62 * f + 0.04;
      put(b, "skin", tor(1, 0.06, 4, 14, PI), [0, 0, z], [0, 0, 0], [rx, ry, 1]);
      put(b, "vein", sph(0.07, 6, 4), [0, ry + 0.02, z + 0.25]);
    }
    for (let i = 0; i < 5; i++) {   // 등 수정 가시
      const z = -0.9 + i * 0.45, h = [0.8, 1.15, 1.3, 1.0, 0.7][i];
      put(b, "crystal", oct(0.2), [0, 0.6 + h * 0.18, z], [-0.35, 0, 0], [0.55, h * 1.4, 0.55]);
      if (i % 2 === 0) for (const sx of [-1, 1]) put(b, "crystal", oct(0.13), [sx * 0.42, 0.52, z + 0.1], [-0.3, 0, sx * -0.6], [0.5, 1.6, 0.5]);
    }
    put(b, "skin", sph(0.55, 12, 8), [0, -0.05, -1.75], 0, [0.95, 0.62, 1.2]);   // 머리
    put(b, "accG", sph(0.24, 10, 8), [0, -0.12, -2.34], 0, [1, 0.75, 0.6]);       // 주포구 (계급 색)
    put(b, "shell", tor(0.26, 0.06, 4, 12), [0, -0.12, -2.3], 0, [1, 0.8, 1]);
    for (const sx of [-1, 1]) {
      put(b, "pale", sph(0.085, 8, 6), [sx * 0.36, 0.12, -2.05]);
      for (let k = 0; k < 3; k++) {   // 옆 발광 포구
        const z = -0.8 + k * 0.7, f = Math.sqrt(1 - (z / 1.85) ** 2);
        put(b, "accG", sph(0.1, 8, 6), [sx * 1.08 * f, -0.08, z], 0, [0.5, 1, 1]);
        put(b, "shell", tor(0.12, 0.035, 3, 10), [sx * 1.08 * f, -0.08, z], [0, PI / 2, 0]);
      }
      const fin = node(b, sx < 0 ? "finL" : "finR", sx * 0.85, -0.2, 0.1);
      const pts = [[0, -0.6], [0.9, -0.1], [1.25, 0.5], [0.6, 0.45], [0, 0.6]].map(([x, z]) => [x * sx, z]);
      put(fin, "membrane", slab(pts, 0.04));
      rod(fin, "vein", box(1, 1, 1), [0, 0.03, -0.3], [sx * 1.15, 0.03, 0.45], 0.03, 0.025);
      rod(fin, "vein", box(1, 1, 1), [0, 0.03, 0.2], [sx * 0.65, 0.03, 0.42], 0.03, 0.025);
    }
    const t0 = node(b, "tail0", 0, 0, 1.7);
    put(t0, "skin", cyl(0.3, 0.2, 0.8, 8), [0, 0, 0.35], XR);
    put(t0, "vein", tor(0.27, 0.03, 3, 10), [0, 0, 0.3]);
    const t1 = node(t0, "tail1", 0, 0, 0.75);
    put(t1, "skin", cone(0.2, 0.8, 8), [0, 0, 0.4], XR);
    put(t1, "membrane", slab([[0, 0.3], [0.65, 1.1], [0.1, 0.85], [0, 1.0], [-0.1, 0.85], [-0.65, 1.1]], 0.04));
    put(t1, "pale", sph(0.08, 6, 4), [0, 0, 0.78]);
  },
  // Shard: 투명한 수정 동체 안에 빛나는 핵, 쓸어 넘긴 수정 날개, 주위를 도는 파편
  jet(R) {
    const b = node(R, "body");
    put(b, "crystal", oct(1), [0, 0, 0], 0, [0.55, 0.36, 2.85]);
    put(b, "accG", oct(1), [0, 0, 0.1], 0, [0.2, 0.15, 1.5]);
    put(b, "shell", sph(0.5, 12, 6, 0, TAU, 0, PI * 0.5), [0, 0.06, 0.55], 0, [0.75, 0.55, 2.3]);
    put(b, "vein", box(0.04, 0.03, 2.0), [0, 0.33, 0.55]);
    for (const sx of [-1, 1]) {
      put(b, "crystal", oct(1), [sx * 1.25, -0.02, 0.75], [0, sx * -0.62, 0], [1.4, 0.07, 0.42]);
      put(b, "crystal", oct(1), [sx * 0.75, 0.05, 1.7], [0, sx * -0.3, sx * 0.25], [0.7, 0.05, 0.28]);
      put(b, "crystal", oct(1), [sx * 0.32, 0.45, 1.55], [-0.3, 0, sx * -0.4], [0.04, 0.55, 0.38]);
      rod(b, "vein", box(1, 1, 1), [sx * 0.3, 0.02, 0.0], [sx * 2.2, 0.02, 1.42], 0.04, 0.03);
      put(b, "pale", sph(0.07, 6, 4), [sx * 2.38, 0, 1.58]);
      put(b, "shell", sph(0.2, 8, 6), [sx * 0.3, -0.05, 2.2], 0, [1, 0.8, 1.5]);
      put(b, "pale", cyl(0.13, 0.13, 0.03, 8), [sx * 0.3, -0.05, 2.48], XR);
      plume(b, "pl" + (sx > 0 ? 1 : 0), sx * 0.3, -0.05, 2.5, 0.13, 1.5);
    }
    const orb = node(R, "orb", 0, 0, -0.6);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; put(orb, "crystal", oct(0.16), [Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0], [0, 0, a], [0.5, 1.6, 0.5]); }
  },
  // 모체: 늑골 갑각 돔, 아래로 빛나는 핵, 수정 왕관, 늘어진 촉수
  boss(R) {
    const b = node(R, "body");
    put(b, "shell", sph(4.2, 20, 12, 0, TAU, 0, PI * 0.55), [0, 0, 0], 0, [1.15, 0.62, 1.35]);
    put(b, "belly", sph(4.0, 18, 8, 0, TAU, PI * 0.5, PI * 0.5), [0, 0.15, 0], 0, [1.1, 0.35, 1.28]);
    for (let i = 0; i < 7; i++) {   // 늑골
      const z = -4.2 + i * 1.4, f = Math.sqrt(Math.max(0.04, 1 - (z / 5.67) ** 2));
      put(b, "skin", tor(1, 0.22, 4, 18, PI), [0, 0, z], [0, 0, 0], [4.83 * f + 0.1, 2.6 * f + 0.1, 1]);
      put(b, "vein", sph(0.18, 6, 4), [-(4.83 * f) * 0.7, 2.6 * f * 0.72, z + 0.6]);
      put(b, "vein", sph(0.18, 6, 4), [(4.83 * f) * 0.7, 2.6 * f * 0.72, z + 0.6]);
    }
    put(b, "vein", box(0.25, 0.1, 9.5), [0, 2.65, 0]);
    // 앞쪽 발광 눈 줄
    for (let i = -2; i <= 2; i++) put(b, "accG", sph(i ? 0.38 : 0.55, 10, 8), [i * 1.0, 0.45 - Math.abs(i) * 0.12, -5.62 + Math.abs(i) * 0.3], 0, [1, 0.75, 0.6]);
    put(b, "shell", tor(5.0, 0.3, 4, 24), [0, 0.15, 0], [PI / 2, 0, 0], [1.1, 1.3, 1]);
    // 수정 왕관
    const crown = node(b, "crown", 0, 2.4, 0);
    put(crown, "crystal", oct(1), [0, 1.9, 0], 0, [0.6, 2.4, 0.6]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU, x = Math.cos(a) * 1.3, z = Math.sin(a) * 1.3, h = 1.4 + (i % 2) * 0.6;
      put(crown, "crystal", oct(1), [x, h * 0.75, z], qDir([Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45]), [0.4, h, 0.4]);
    }
    put(crown, "accG", tor(1.3, 0.1, 3, 14), [0, 0.15, 0], [PI / 2, 0, 0]);
    // 아래 핵
    const core = node(b, "core", 0, -1.2, 0.3);
    put(core, "pale", ico(1.25, 1));
    put(b, "accG", tor(1.65, 0.14, 4, 18), [0, -0.9, 0.3], [PI / 2, 0, 0]);
    put(b, "shell", tor(2.0, 0.3, 4, 18), [0, -0.6, 0.3], [PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      tentacle(b, "t" + i + "_", Math.cos(a) * 3.0, -0.6, Math.sin(a) * 3.4 + 0.3, 3, 1.7, 0.32, "skin", "pale");
    }
    for (let i = 0; i < 2; i++) {   // 뒤 생체 추진구
      const x = (i ? 1 : -1) * 1.6;
      put(b, "pale", sph(0.55, 10, 6), [x, 0.1, 5.35], 0, [1, 0.7, 0.4]);
      plume(b, "pl" + i, x, 0.1, 5.5, 0.5, 2.6);
    }
  },
};

function ailTick(kind, N, ph) {
  const pls = [N.pl0, N.pl1].filter(Boolean);
  const fl = (thr, t) => { for (const p of pls) p.scale.set(1, 1, Math.max(0.2, 0.5 + thr * 0.8 + Math.sin(t * 30 + ph) * 0.15)); };
  const tents = (pre, n, segs, amp, sp) => { const L = []; for (let i = 0; i < n; i++) for (let k = 0; k < segs; k++) { const o = N[pre + i + "_" + k]; if (o) L.push([o, i, k]); } return (t) => { for (const [o, i, k] of L) { o.rotation.x = Math.sin(t * sp - k * 0.9 + i * 1.7 + ph) * amp * (k + 1) * 0.6 + (k ? 0 : 0.15); o.rotation.z = Math.cos(t * sp * 0.8 - k * 0.7 + i * 2.3 + ph) * amp * 0.5; } }; };
  switch (kind) {
    case "grunt": return (dt, thr, t) => {
      const w = t * (4 + thr * 2.5) + ph, a = Math.sin(w) * 0.42, a2 = Math.sin(w - 0.8) * 0.5;
      N.w1R.rotation.z = a; N.w1L.rotation.z = -a; N.w2R.rotation.z = a2; N.w2L.rotation.z = -a2;
      N.body.position.y = -Math.sin(w) * 0.06;
      N.tail.rotation.y = Math.sin(t * 2.5 + ph) * 0.3; N.tail.rotation.x = Math.sin(w - 1.2) * 0.15;
    };
    case "ace": return (dt, thr, t) => {
      const w = t * 32 + ph;
      for (let i = 0; i < 4; i++) { const sx = i % 2 ? 1 : -1, a = Math.sin(w + (i < 2 ? 0 : 1.6)) * 0.45; N["w" + i].rotation.z = sx * a; }
      for (let i = 0; i < 4; i++) N["ab" + i].rotation.x = -0.12 - 0.08 * Math.sin(t * 2 + ph - i * 0.6);
      N.ab0.rotation.y = Math.sin(t * 1.3 + ph) * 0.12;
      N.body.position.y = Math.sin(t * 5 + ph) * 0.025;
    };
    case "kamikaze": {
      const tn = tents("t", 6, 2, 0.35, 3.2), to = tents("o", 2, 2, 0.25, 2.2);
      return (dt, thr, t) => {
        const pu = Math.sin(t * 3.4 + ph);
        N.bell.scale.set(1 + pu * 0.1, 1 - pu * 0.12, 1 + pu * 0.1);
        N.core.scale.setScalar(1 + Math.max(0, Math.sin(t * 6.8 + ph)) * 0.25);
        N.core.rotation.y += dt * 1.5;
        tn(t); to(t);
      };
    }
    case "gunship": return (dt, thr, t) => {
      const s = Math.sin(t * 2 + ph);
      N.finL.rotation.z = -s * 0.25; N.finR.rotation.z = s * 0.25;
      N.tail0.rotation.y = Math.sin(t * 1.6 + ph) * 0.18; N.tail1.rotation.y = Math.sin(t * 1.6 + ph - 0.9) * 0.3;
      N.body.position.y = Math.sin(t * 1.1 + ph) * 0.08; N.body.rotation.z = Math.sin(t * 0.8 + ph) * 0.04;
    };
    case "jet": return (dt, thr, t) => { N.orb.rotation.z = t * 2.2 + ph; fl(thr, t); };
    case "boss": {
      const tn = tents("t", 8, 3, 0.16, 1.3);
      return (dt, thr, t) => {
        N.core.scale.setScalar(1 + Math.sin(t * 2.2) * 0.08); N.core.rotation.y += dt * 0.6;
        N.crown.rotation.y = t * 0.15;
        N.body.position.y = Math.sin(t * 0.7 + ph) * 0.3;
        tn(t); fl(thr, t);
      };
    }
  }
}

const KINDS = ["grunt", "ace", "kamikaze", "gunship", "jet", "boss"];
// 판정 반경(combat.js KINDS)에 맞춘 크기 배율
const SCALE = { eia: { grunt: 1.05, ace: 1.05, kamikaze: 1.0, gunship: 1.05, jet: 1.0, boss: 1.0 }, ail: { grunt: 0.82, ace: 0.95, kamikaze: 1.15, gunship: 1.0, jet: 1.0, boss: 1.0 } };

export function factionModel(faction, kind, color) {
  if ((faction !== "eia" && faction !== "ail") || !KINDS.includes(kind)) return null;
  const B = faction === "eia" ? EIA_BUILD : AIL_BUILD;
  const pal = palette(faction, color ?? 0xff2d3d);
  const tpl = template(faction + ":" + kind, (R) => B[kind](node(R, "pivot")));
  const { r, N } = instance(tpl, pal);
  r.children[0].scale.setScalar(SCALE[faction][kind]);
  r.traverse((o) => { if (o.isMesh) o.userData.pal = pal; });
  const ph = Math.random() * TAU;
  const tk = (faction === "eia" ? eiaTick : ailTick)(kind, N, ph);
  r.userData.tick = (dt, thrust = 0.4, time = 0) => { animShared(time); tk(dt || 0, thrust, time); };
  r.userData.tick(0, 0.4, 0);
  r.userData.dispose = () => {};   // 지오메트리·재질은 모든 인스턴스가 공유한다(진영×종류, 진영×계급 색)
  r.userData.faction = faction;
  return r;
}

// ════════════════════════════════════════════════════════════
//  지상·함선 유닛 외피
// ════════════════════════════════════════════════════════════
const near = (a, b) => Math.abs(a - b) < 0.05;
const kids = (g) => g.children.filter((c) => c.isGroup);
// 유닛 그룹 구조(enemies.js)에서 부위 노드를 찾는다. 못 찾으면 null
function findParts(g, type) {
  try {
    if (type === "tank") return { root: g, tur: kids(g).find((c) => kids(c).length > 0) || null };
    if (type === "aa") { const hip = kids(g).find((c) => near(c.position.y, 3.6)); const top = hip && kids(hip).find((c) => near(c.position.x, 0) && near(c.position.y, 0.3)); return { root: g, top }; }
    if (type === "mech") { const pel = kids(g).find((c) => near(c.position.y, 11)); const waist = pel && kids(pel).find((c) => near(c.position.x, 0) && near(c.position.y, 1.4)); const head = waist && kids(waist).find((c) => near(c.position.y, 8.6)); return { root: g, waist, head }; }
    return { root: g };
  } catch (e) { return { root: g }; }
}
const SHIP = { frigate: { L: 28, W: 6.5, H: 4 }, cruiser: { L: 46, W: 9, H: 5 } };

const DECOR = {
  eia: {
    tank: {
      root(n) {
        for (const sx of [-1, 1]) {
          put(n, "plate", box(0.12, 0.75, 5.0), [sx * 2.18, 0.95, 0], [0, 0, sx * 0.12]);
          for (let i = 0; i < 5; i++) put(n, "hazard", box(0.04, 0.6, 0.18), [sx * 2.27, 0.95, 1.2 + i * 0.36], [0.7, 0, sx * 0.12]);
          put(n, "dark", box(0.05, 0.8, 0.12), [sx * 2.28, 0.95, -2.5], [0, 0, sx * 0.12]);
        }
        for (let i = 0; i < 5; i++) put(n, "hazard", box(0.25, 0.05, 0.6), [-1.2 + i * 0.6, 1.97, 2.5], [0, 0.6, 0]);
        put(n, "dark", box(3.0, 0.04, 0.6), [0, 1.96, 2.5]);
        put(n, "red", box(0.25, 0.25, 0.08), [-1.3, 1.5, -2.84]); put(n, "red", box(0.25, 0.25, 0.08), [1.3, 1.5, -2.84]);
      },
      tur(n) {
        put(n, "dark", cyl(0.34, 0.38, 0.3, 8), [-0.55, 0.62, -1.38], XR);
        put(n, "red", sph(0.24, 10, 8), [-0.55, 0.62, -1.5], 0, [1, 1, 0.6]);
        put(n, "lens", cyl(0.08, 0.08, 0.04, 8), [-0.55, 0.62, -1.64], XR);
        put(n, "plate", box(2.6, 0.12, 0.9), [0, 0.95, -0.6], [0.25, 0, 0]);
        for (const sx of [-1, 1]) put(n, "plate", box(0.12, 0.7, 2.4), [sx * 1.22, 0.45, 0.1], [0, 0, sx * -0.15]);
        rod(n, "dark", cyl(0.025, 0.025, 1, 4), [-0.8, 0.9, 1.0], [-0.95, 2.4, 1.2]);
        put(n, "red", sph(0.06, 6, 4), [-0.95, 2.42, 1.2]);
      },
    },
    aa: {
      top(n) {
        put(n, "dark", box(1.0, 0.25, 0.4), [0, 1.85, -1.0], [0.3, 0, 0]);
        put(n, "dark", cyl(0.3, 0.34, 0.35, 8), [0, 1.55, -1.22], XR);
        put(n, "red", sph(0.24, 10, 8), [0, 1.55, -1.36], 0, [1, 1, 0.6]);
        put(n, "lens", cyl(0.08, 0.08, 0.04, 8), [0, 1.55, -1.5], XR);
        for (const sx of [-1, 1]) { put(n, "plate", box(0.14, 1.3, 2.2), [sx * 1.38, 0.85, 0], [0, 0, sx * 0.08]); for (let i = 0; i < 3; i++) put(n, "hazard", box(0.05, 0.22, 0.4), [sx * 1.46, 0.5, -0.6 + i * 0.6], [0.7, 0, sx * 0.08]); }
      },
    },
    mech: {
      waist(n) {
        for (const sx of [-1, 1]) {
          for (let i = 0; i < 4; i++) put(n, "hazard", box(0.08, 0.5, 1.2), [sx * 6.03, 6.4, -1.2 + i * 0.8], [0.75, 0, 0]);
          put(n, "plate", box(0.5, 1.2, 4.8), [sx * 3.8, 8.0, 0], [0, 0, sx * 0.35]);
          put(n, "red", box(0.3, 0.3, 0.1), [sx * 2.6, 6.6, -2.86]);
        }
        put(n, "plate", box(4.4, 1.0, 0.5), [0, 7.4, -2.5], [-0.25, 0, 0]);
        for (let i = 0; i < 6; i++) put(n, "hazard", box(0.35, 0.8, 0.06), [-1.55 + i * 0.62, 1.85, -2.25], [0, 0, 0.6]);
        put(n, "dark", box(4.0, 0.9, 0.04), [0, 1.85, -2.23]);
        for (let i = 0; i < 3; i++) put(n, "red", box(2.4, 0.12, 0.1), [0, 4.0 + i * 0.5, 3.72]);
      },
      head(n) {
        put(n, "dark", cyl(0.55, 0.62, 0.4, 10), [0, 0.6, -1.3], XR);
        put(n, "red", sph(0.48, 12, 8), [0, 0.6, -1.48], 0, [1, 1, 0.6]);
        put(n, "lens", cyl(0.15, 0.15, 0.05, 8), [0, 0.6, -1.76], XR);
        put(n, "plate", box(3.0, 0.3, 1.6), [0, 1.25, -0.5], [-0.2, 0, 0]);
        put(n, "plate", box(0.3, 0.9, 2.2), [0, 1.5, 0.2]);
      },
    },
    ship(n, S) {
      const { L, W, H } = S;
      put(n, "dark", cyl(H * 0.24, H * 0.28, 0.6, 10), [0, 0, -L * 0.64], XR);
      put(n, "red", sph(H * 0.2, 12, 8), [0, 0, -L * 0.655], 0, [1, 1, 0.6]);
      for (const sx of [-1, 1]) {
        put(n, "plate", box(0.3, H * 0.55, L * 0.45), [sx * W * 0.52, H * 0.12, -L * 0.05], [0, 0, sx * -0.15]);
        for (let i = 0; i < 4; i++) put(n, "red", sph(0.22, 6, 4), [sx * W * 0.38, H * 0.2, -L * 0.5 + i * 0.9]);
        for (let i = 0; i < 6; i++) put(n, "hazard", box(0.08, 0.45, 0.9), [sx * W * 0.51, -H * 0.42, L * 0.2 + i * 0.9], [0.7, 0, 0]);
      }
      for (let i = 0; i < 3; i++) put(n, "dark", box(0.25, H * 0.5, L * 0.08), [0, H * 0.7, -L * 0.3 + i * L * 0.1], [0, 0, 0]);
    },
  },
  ail: {
    tank: {
      root(n) {
        for (let i = 0; i < 5; i++) put(n, "crystal", oct(0.3), [(i % 2 ? 1 : -1) * 1.1, 2.1, 1.3 + i * 0.3], [-0.5, 0, (i % 2 ? -1 : 1) * 0.5], [0.6, 2.4, 0.6]);
        for (const sx of [-1, 1]) {
          rod(n, "vein", box(1, 1, 1), [sx * 1.72, 1.2, -2.6], [sx * 1.72, 1.4, 2.6], 0.06, 0.06);
          rod(n, "vein", box(1, 1, 1), [sx * 1.72, 1.4, -0.5], [sx * 1.4, 1.95, 0.6], 0.06, 0.06);
          for (let i = 0; i < 2; i++) { const z = -2.8; rod(n, "skin", cone(0.14, 1, 5), [sx * (0.6 + i * 0.6), 1.2, z], [sx * (0.8 + i * 0.7), 0.1, z - 0.9]); put(n, "pale", sph(0.1, 6, 4), [sx * (0.8 + i * 0.7), 0.1, z - 0.9]); }
        }
        put(n, "membrane", slab([[-1.4, 2.3], [1.4, 2.3], [0.9, 3.4], [-0.9, 3.4]], 0.05), [0, 1.6, 0], [-0.25, 0, 0]);
      },
      tur(n) {
        put(n, "crystal", oct(0.35), [0, 1.5, 0.6], [-0.3, 0, 0], [0.6, 2.4, 0.6]);
        put(n, "crystal", oct(0.25), [0.6, 1.25, 0.9], [-0.3, 0, -0.5], [0.6, 2.4, 0.6]);
        put(n, "crystal", oct(0.25), [-0.6, 1.25, 0.9], [-0.3, 0, 0.5], [0.6, 2.4, 0.6]);
        for (const sx of [-1, 1]) put(n, "pale", sph(0.16, 8, 6), [sx * 0.6, 0.6, -1.38], 0, [1, 1, 0.6]);
        rod(n, "vein", box(1, 1, 1), [-1.17, 0.5, -1.2], [-1.17, 0.5, 1.2], 0.06, 0.06);
        rod(n, "vein", box(1, 1, 1), [1.17, 0.5, -1.2], [1.17, 0.5, 1.2], 0.06, 0.06);
      },
    },
    aa: {
      top(n) {
        for (let i = 0; i < 3; i++) put(n, "pale", sph(0.32, 10, 8), [(i - 1) * 0.75, 1.9, 0.6 - Math.abs(i - 1) * 0.2]);
        put(n, "membrane", tor(1.55, 0.35, 3, 14), [0, 1.62, 0], [PI / 2, 0, 0], [1, 1, 0.3]);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4; put(n, "crystal", oct(0.25), [Math.cos(a) * 1.1, 1.9, Math.sin(a) * 1.0], qDir([Math.cos(a), 1.4, Math.sin(a)]), [0.6, 2.6, 0.6]); }
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; rod(n, "skin", cone(0.09, 1, 5), [Math.cos(a) * 1.1, 0.1, Math.sin(a) * 1.0], [Math.cos(a) * 1.5, -1.0, Math.sin(a) * 1.4]); }
        rod(n, "vein", box(1, 1, 1), [-1.32, 0.3, -1.1], [-1.32, 1.4, 1.1], 0.06, 0.06);
        rod(n, "vein", box(1, 1, 1), [1.32, 0.3, -1.1], [1.32, 1.4, 1.1], 0.06, 0.06);
      },
    },
    mech: {
      waist(n) {
        for (const sx of [-1, 1]) {
          for (let i = 0; i < 4; i++) put(n, "crystal", oct(0.5), [sx * (4.4 + i * 0.35), 8.0 + (i % 2) * 0.4, -1 + i * 0.6], qDir([sx * 0.7, 1, (i - 1.5) * 0.2]), [0.6, 2.8 - i * 0.3, 0.6]);
          rod(n, "vein", box(1, 1, 1), [sx * 0.9, 2.2, -2.35], [sx * 3.2, 7.2, -2.3], 0.15, 0.1);
          rod(n, "vein", box(1, 1, 1), [sx * 3.65, 1.6, -1.5], [sx * 3.65, 7.6, 1.5], 0.12, 0.1);
          for (let i = 0; i < 3; i++) { const z = -1 + i; rod(n, "skin", cone(0.22, 1, 5), [sx * 3.2, 1.5, z], [sx * 3.6, -1.6 - i * 0.5, z - 0.4]); put(n, "pale", sph(0.18, 6, 4), [sx * 3.6, -1.6 - i * 0.5, z - 0.4]); }
        }
        for (let i = 0; i < 4; i++) put(n, "crystal", oct(0.45), [0, 6.6 + i * 0.6, 2.5 + i * 0.15], [-0.6, 0, 0], [0.6, 2.6, 0.6]);
        put(n, "membrane", slab([[-3, 0], [3, 0], [2.2, 2.4], [-2.2, 2.4]], 0.08), [0, 7.9, 2.3], [-1.1, 0, 0]);
      },
      head(n) {
        for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.42; put(n, "crystal", oct(0.32), [Math.sin(a) * 0.9, 1.4 + (i === 2 ? 0.4 : 0), Math.cos(a) * 0.4 - 0.1], qDir([Math.sin(a) * 0.8, 1, 0]), [0.6, i === 2 ? 3.2 : 2.3, 0.6]); }
        for (const sx of [-1, 1]) put(n, "pale", sph(0.22, 8, 6), [sx * 0.65, 0.2, -1.38], 0, [1, 1, 0.6]);
      },
    },
    ship(n, S) {
      const { L, W, H } = S;
      for (let i = 0; i < 7; i++) { const z = -L * 0.38 + i * L * 0.11, h = 1.2 + Math.sin(i * 0.9) * 0.4; put(n, "crystal", oct(0.6), [0, H * 0.5 + h * 1.3, z], [-0.45, 0, 0], [0.7, h * 2.5, 0.7]); }
      for (const sx of [-1, 1]) {
        rod(n, "vein", box(1, 1, 1), [sx * W * 0.51, 0, -L * 0.35], [sx * W * 0.51, H * 0.2, L * 0.35], 0.12, 0.12);
        rod(n, "vein", box(1, 1, 1), [sx * W * 0.51, H * 0.2, -L * 0.1], [sx * W * 0.3, H * 0.5, L * 0.05], 0.12, 0.12);
        put(n, "membrane", slab([[0, -L * 0.18], [W * 0.75, -L * 0.02], [W * 0.75, L * 0.14], [0, L * 0.2]].map(([x, z]) => [x * sx, z]), 0.1), [sx * W * 0.5, H * 0.2, 0], [0, 0, sx * 0.35]);
        for (let i = 0; i < 4; i++) { const z = -L * 0.25 + i * L * 0.16, len = H * (1.3 + (i % 2) * 0.7); rod(n, "skin", cone(0.35, 1, 5), [sx * W * 0.3, -H * 0.45, z], [sx * W * 0.38, -H * 0.45 - len, z + 1.5]); put(n, "pale", sph(0.3, 6, 4), [sx * W * 0.38, -H * 0.45 - len, z + 1.5]); }
      }
      for (let i = 0; i < 3; i++) put(n, "pale", sph(0.5, 8, 6), [(i - 1) * 1.2, 0, -L * 0.645], 0, [1, 1, 0.5]);
    },
  },
};
// 유닛 외피의 시간 애니메이션: 공용 재질 색을 렌더 직전에 갱신 (유닛에는 tick 이 없다)
let decoT = -1;
const _red = new THREE.Color(0xff2d3d);
function decoPulse() {
  const t = performance.now() / 1000;
  if (Math.abs(t - decoT) < 0.008) return; decoT = t;
  if (EIA) EIA.red.color.copy(_red).multiplyScalar(2.1 + 0.8 * Math.max(0, Math.sin(t * 2.4)));
  if (AIL) animShared(t);
}

const _purple = new THREE.Color(0x4a1f8c);
export function decorateUnit(u, type, faction) {
  if (faction === "ail") {
    const seen = new Map();
    u.group.traverse((m) => {
      if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
      let mat = seen.get(m.material);
      if (!mat) {
        mat = m.material.clone();
        if (mat.color) { const hsl = {}; mat.color.getHSL(hsl); if (hsl.l < 0.75) mat.color.lerp(_purple, hsl.s < 0.35 ? 0.6 : 0.3); }
        seen.set(m.material, mat);
      }
      m.material = mat;
    });
  }
  if (faction !== "eia" && faction !== "ail") return;
  try {
    const D = DECOR[faction], ship = SHIP[type], pal = palette(faction, faction === "eia" ? 0xff2d3d : 0xc060ff);
    const parts = findParts(u.group, type);
    const roles = ship ? { root: (n) => D.ship(n, ship) } : D[type] || {};
    for (const role in roles) {
      const target = parts[role];
      if (!target) continue;
      const tpl = template("unit:" + faction + ":" + type + ":" + role, (R) => roles[role](R));
      const { r } = instance(tpl, pal);
      r.name = "faction-decor";
      r.traverse((o) => { if (o.isMesh && (o.userData.mk === "vein" || o.userData.mk === "red" || o.userData.mk === "membrane")) o.onBeforeRender = decoPulse; });
      target.add(r);
    }
  } catch (e) { console.warn("진영 외피 실패", e); }
}
