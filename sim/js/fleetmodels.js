// 기함 모델 (fleet.js 가 쓴다): 선체 세부(패널 선·돌기·함교 탑·안테나 마스트·격납고 통로)와 재질
//  · 선체는 "금속(광택) · 무광 · 발광 · 효과(가산)" 네 재질로만 합친다. 색은 정점 색이라 재질은 함대 전체가 함께 쓴다 → 선체 하나 그리기 호출 4회
//  · 포탑은 함선마다 InstancedMesh 둘(포탑 몸체 · 포신) — 포탑이 많아도 2회. 포신은 표적을 따라 돌고 쏠 때 뒤로 밀린다
//  · 분사 불꽃 · 항해등 · 점멸등 · 엔진 빛은 한 메시(효과 셰이더): 시간 uniform 으로 깜박이고, 불꽃 띠가 뒤로 흐른다. 엔진 구역(pod)별로 끌 수 있다
//  · 그을음 자국은 InstancedMesh 하나 (부위가 부서지거나 선체가 상할 때 하나씩 켠다)
//  · 좌표: 앞 -Z, 위 +Y, 오른쪽 +X. 크기는 축척 1 기준(fleet.js 가 함선마다 scale)
import * as THREE from "../vendor/three.module.min.js";
import { toonMat } from "./toon.js";

const V3 = THREE.Vector3, PI = Math.PI;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), _c = new THREE.Color(), _v = new V3();

// ── 공유 재질 (Fleet 하나가 만들고 dispose 한다) ──
export function fleetMats() {
  const metal = toonMat({ color: 0xffffff, vertexColors: true, spec: 0.55, shine: 80, rim: 0.32 });
  const matte = toonMat({ color: 0xffffff, vertexColors: true });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const fx = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uT: { value: 0 }, uPw: { value: 1 }, uPod: { value: new THREE.Vector4(1, 1, 1, 1) } },
    // fx: (종류, k, 구역, 값)  종류 0 불꽃(k = 노즐→끝 0..1, 값 = 길이) · 1 점멸등(k = 위상, 값 = 주기) · 2 맥동광(k = 위상, 값 = 속도) · 3 차례로 흐르는 등(k = 순번 위상)
    vertexShader: `attribute vec3 vcol; attribute vec4 fx; uniform float uT; uniform float uPw; uniform vec4 uPod; varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position; float a = 1.0; float ty = fx.x; float pod = fx.z;
        float on = pod < 0.5 ? uPod.x : pod < 1.5 ? uPod.y : pod < 2.5 ? uPod.z : uPod.w;
        if (ty < 0.5) {
          float fl = 0.88 + 0.08 * sin(uT * 31.0 + pod * 2.1) + 0.05 * sin(uT * 17.0 + pod);
          p.z += fx.y * fx.w * (uPw * fl - 1.0);
          a = pow(1.0 - fx.y, 1.2) * (0.7 + 0.3 * sin(fx.y * 16.0 - uT * 38.0 + pod * 1.7));
        } else if (ty < 1.5) {
          float ph = fract(uT / fx.w + fx.y);
          a = (ph < 0.05 || (ph > 0.12 && ph < 0.16)) ? 1.0 : 0.04;
        } else if (ty < 2.5) {
          a = 0.72 + 0.28 * sin(uT * fx.w + fx.y * 6.283);
        } else {
          float ph = fract(uT * 0.55 - fx.y);
          a = 0.15 + 0.85 * smoothstep(0.85, 1.0, ph);
        }
        a *= on;
        vC = vcol; vA = a;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(a > 0.001 ? p : vec3(0.0), 1.0);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, vA); }`,
  });
  // 그을음: 거의 검은 무광 (정점 색 없음)
  const scorch = toonMat({ color: 0x15110e, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return { metal, matte, glow, fx, scorch, dispose() { for (const m of [metal, matte, glow, fx, scorch]) m.dispose(); } };
}

// 결정적 난수 (같은 함선은 늘 같은 세부)
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ── 합치기 도구: 재질 키별로 정점 색을 입혀 한 메시로 ──
function kit() {
  const G = { metal: [], matte: [], glow: [], fx: [] };
  const put = (key, geo, color, p, r, s, k, fx) => {
    _q.identity(); if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    _s.set(1, 1, 1); if (s) _s.set(s[0], s[1], s[2]);
    const m = new THREE.Matrix4().compose(_p.set(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0), _q, _s);
    G[key].push({ geo, m, col: new THREE.Color(color).multiplyScalar(k || 1), fx });
  };
  const A = {
    metal: (geo, color, p, r, s) => put("metal", geo, color, p, r, s),
    matte: (geo, color, p, r, s) => put("matte", geo, color, p, r, s),
    glow: (geo, color, p, r, s, k = 2.2) => put("glow", geo, color, p, r, s, k),
    // 효과: fx = [종류, k, 구역, 값] 또는 (로컬 점) => [..]
    fx: (geo, color, p, fx, r = null, s = null, k = 1.6) => put("fx", geo, color, p, r, s, k, fx),
  };
  A.bake = (root, mats) => {
    const out = {};
    for (const key of ["metal", "matte", "glow", "fx"]) {
      const list = G[key]; if (!list.length) continue;
      let n = 0;
      const parts = list.map((e) => { const g = e.geo.index ? e.geo.toNonIndexed() : e.geo.clone(); e.geo.dispose(); if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; return { g, e }; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), fxa = key === "fx" ? new Float32Array(n * 4) : null;
      let o = 0;
      for (const { g, e } of parts) {
        const P = g.attributes.position, c = P.count;
        if (fxa) for (let i = 0; i < c; i++) { _v.fromBufferAttribute(P, i); const f = typeof e.fx === "function" ? e.fx(_v) : e.fx; fxa.set(f, (o + i) * 4); }
        g.applyMatrix4(e.m);
        pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
        for (let i = 0; i < c; i++) { col[(o + i) * 3] = e.col.r; col[(o + i) * 3 + 1] = e.col.g; col[(o + i) * 3 + 2] = e.col.b; }
        o += c; g.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute(key === "fx" ? "vcol" : "color", new THREE.BufferAttribute(col, 3));
      if (fxa) g.setAttribute("fx", new THREE.BufferAttribute(fxa, 4));
      g.computeBoundingSphere();
      const mat = key === "fx" ? mats.fx.clone() : mats[key];
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = false;
      if (key === "fx") { mesh.renderOrder = 3; mesh.frustumCulled = false; }
      root.add(mesh); out[key] = mesh;
    }
    return out;
  };
  return A;
}

const box = (w, h, l) => new THREE.BoxGeometry(w, h, l);
function wedge(w, h, l, fx, fy, dy = 0) {   // 앞(-Z)으로 좁아지는 상자
  const g = new THREE.BoxGeometry(w, h, l), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) if (P.getZ(i) < 0) { P.setX(i, P.getX(i) * fx); P.setY(i, P.getY(i) * fy + dy); }
  g.computeVertexNormals();
  return g;
}
const cylZ = (r0, r1, l, n = 12, open = false) => { const g = new THREE.CylinderGeometry(r0, r1, l, n, 1, open); g.rotateX(PI / 2); return g; };
const cylY = (r0, r1, l, n = 10) => new THREE.CylinderGeometry(r0, r1, l, n);
const cylX = (r0, r1, l, n = 8) => { const g = new THREE.CylinderGeometry(r0, r1, l, n); g.rotateZ(PI / 2); return g; };
const sph = (r, a = 12, b = 9) => new THREE.SphereGeometry(r, a, b);
// 불꽃 원뿔: 노즐(z=0)에서 +Z 끝(z=len)으로 가늘어진다
function flameGeo(r, len, n = 10) { const g = new THREE.ConeGeometry(r, len, n, 1, true); g.rotateX(PI / 2); g.translate(0, 0, len / 2); return g; }
function addFlame(A, x, y, z, r, len, color, pod) {
  A.fx(flameGeo(r, len), color, [x, y, z], (lp) => [0, Math.max(0, Math.min(1, lp.z / len)), pod, len], null, null, 1.5);
  A.fx(flameGeo(r * 0.55, len * 0.6), 0xffffff, [x, y, z], (lp) => [0, Math.max(0, Math.min(1, lp.z / (len * 0.6))), pod, len * 0.6], null, null, 1.2);
  A.fx(new THREE.CircleGeometry(r * 1.05, 14), color, [x, y, z - 0.05], [2, Math.random(), pod, 9], [0, PI, 0], null, 2.2);   // 노즐 안쪽 빛
}
// 패널 선: 선체 면 위로 살짝 튀어나온 어두운 띠
function panelLines(A, color, x0, x1, y, z0, z1, step, side, depth = 0.05) {
  for (let z = z0; z <= z1; z += step) A.matte(box(depth, Math.abs(y[1] - y[0]), 0.12), color, [side, (y[0] + y[1]) / 2, z]);
}
// 돌기(그리블): 작은 상자·관·통풍구를 결정적 난수로 흩뿌린다
function greebles(A, R, n, x0, x1, y, z0, z1, cols) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), t = R();
    const c = cols[(R() * cols.length) | 0];
    if (t < 0.45) { const w = 0.4 + R() * 1.1, h = 0.2 + R() * 0.5, l = 0.4 + R() * 1.6; A.metal(box(w, h, l), c, [x, y + h / 2, z]); }
    else if (t < 0.7) { const r = 0.15 + R() * 0.3, l = 1 + R() * 3; A.matte(cylZ(r, r, l, 6), c, [x, y + r, z]); }
    else if (t < 0.88) { A.matte(box(0.9, 0.12, 0.9), 0x1a1d22, [x, y + 0.06, z]); for (let k = -1; k <= 1; k++) A.matte(box(0.8, 0.08, 0.08), 0x3a3f48, [x, y + 0.14, z + k * 0.25]); }
    else { const h = 0.5 + R() * 0.8; A.metal(cylY(0.25, 0.32, h, 8), c, [x, y + h / 2, z]); A.matte(cylY(0.36, 0.36, 0.08, 8), 0x1a1d22, [x, y + h, z]); }
  }
}
// 안테나 마스트: 기둥 + 가로대 + 꼭대기 점멸등
function mast(A, x, y, z, h, metalCol, lampCol, phase = 0) {
  A.matte(cylY(0.09, 0.16, h, 6), metalCol, [x, y + h / 2, z]);
  for (let k = 1; k <= 3; k++) A.matte(box(1.6 - k * 0.35, 0.06, 0.06), metalCol, [x, y + h * (0.35 + k * 0.17), z]);
  A.matte(box(0.06, 0.06, 1.0), metalCol, [x, y + h * 0.7, z]);
  A.fx(sph(0.28, 8, 6), lampCol, [x, y + h + 0.15, z], [1, phase, 3, 1.4], null, null, 3);
}

// ── 포탑 (InstancedMesh 용 공용 지오메트리) ──
// 몸체: 바닥 y=0, 앞 -Z. 포신: 회전축(0, 0, 0) 기준으로 -Z 로 뻗는다 (함선에서 몸체 위 (0, 0.95, -0.9) 에 붙는다)
export const TURRET = { pivot: new V3(0, 0.95, -0.9), muzzle: 3.5 };
function vcolGeo(parts) {   // [geo, color, p, r] → 정점 색 지오메트리 하나
  let n = 0; const L = parts.map(([geo, col, p, r]) => { const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose(); for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k); _q.identity(); if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2])); g.applyMatrix4(new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s.set(1, 1, 1))); n += g.attributes.position.count; return [g, new THREE.Color(col)]; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0; for (const [g, c] of L) { const k = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); for (let i = 0; i < k; i++) col.set([c.r, c.g, c.b], (o + i) * 3); o += k; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere();
  return g;
}
export function turretGeos(style) {
  const P = style === "ally" ? [0x9aa4b4, 0x6c7584, 0x2f6fb0] : style === "eia" ? [0x4a505e, 0x2b2f3a, 0xff2a3a] : [0x7a3a8a, 0x4a2466, 0xd070ff];
  const body = style === "ail"
    ? vcolGeo([[sph(1.25, 12, 8), P[0], [0, 0.6, 0]], [sph(0.8, 10, 6), P[1], [0, 1.0, -0.6]], [new THREE.TorusGeometry(1.1, 0.12, 6, 14), P[1], [0, 0.35, 0], [PI / 2, 0, 0]]])
    : vcolGeo([
      [cylY(1.25, 1.45, 0.5, 14), 0x22262e, [0, 0.25, 0]],
      [wedge(2.1, 1.0, 2.6, 0.75, 0.7, -0.1), P[0], [0, 0.95, 0]],
      [box(2.2, 0.12, 2.0), P[1], [0, 1.46, 0.25]],
      [box(0.5, 0.35, 0.7), P[1], [0.7, 1.6, 0.4]],           // 조준경
      [box(0.08, 0.6, 2.3), 0x1a1d22, [-1.06, 0.9, 0]], [box(0.08, 0.6, 2.3), 0x1a1d22, [1.06, 0.9, 0]],   // 옆 패널 선
      [box(1.6, 0.12, 0.1), P[2], [0, 1.1, -1.3]],             // 앞면 띠
    ]);
  const barrel = style === "ail"
    ? vcolGeo([[cylZ(0.5, 0.25, 2.4, 8), P[1], [0, 0, -1.2]], [sph(0.42, 8, 6), P[2], [0, 0, -2.5]]])
    : vcolGeo([
      [box(1.5, 0.8, 0.6), P[1], [0, 0, -0.1]],                 // 포방패
      [cylZ(0.17, 0.15, 3.3, 8), 0x2a2e36, [-0.4, 0, -1.9]], [cylZ(0.17, 0.15, 3.3, 8), 0x2a2e36, [0.4, 0, -1.9]],
      [cylZ(0.25, 0.25, 0.5, 8), 0x15171c, [-0.4, 0, -3.4]], [cylZ(0.25, 0.25, 0.5, 8), 0x15171c, [0.4, 0, -3.4]],   // 포구 제퇴기
      [cylZ(0.21, 0.21, 0.5, 8), 0x3a3f48, [-0.4, 0, -0.9]], [cylZ(0.21, 0.21, 0.5, 8), 0x3a3f48, [0.4, 0, -0.9]],
    ]);
  return { body, barrel };
}
// 포탑 자리: side -1 좌현 · 1 우현 · 0 갑판(앞). rest = 쉬는 방향(배 기준 yaw)
function mount(list, x, y, z, side, s = 1, under = false, group = null) { list.push({ p: new V3(x, y, z), side, s, under, rest: side ? -side * PI / 2 : 0, group }); }

// ── 아군 순양함 (길이 약 62 m): 흰 선체 · 연합 파랑 띠 · 계단식 함교 탑 · 측면 포열 · 엔진 셋 · 기함은 옆으로 뚫린 격납고 통로 ──
export function allyShip(big, mats, seed = 1) {
  const g = new THREE.Group(), A = kit(), R = rng(seed * 7919 + 13);
  const HULL = 0xdfe5ee, PLATE = 0x8d97a8, DARK = 0x1d2129, BLUE = 0x2f6fb0, LINE = 0x5c6472, GLASS = 0x1f3550;
  const WIN = 0x9fe4ff, THR = 0x58c8ff;
  // 선체: 기함은 z -2..6 에 옆으로 뚫린 격납고 통로 (높이 y -2.4..1.2)
  const hullBox = (z0, z1) => { const l = z1 - z0, c = (z0 + z1) / 2; A.metal(box(9, 5, l), HULL, [0, 0, c]); };
  if (big) {
    hullBox(-17, -2); hullBox(6, 21);
    A.metal(box(9, 1.3, 8), HULL, [0, 1.85, 2]);                     // 통로 지붕
    A.matte(box(8.6, 0.1, 8), 0x2a2f38, [0, 1.17, 2]);               // 지붕 안쪽
    A.matte(box(8.6, 0.1, 8), 0x3a4150, [0, -2.42, 2]);              // 통로 바닥 (아래 판 위)
    for (let z = -1; z <= 5; z += 2) A.glow(box(7.6, 0.06, 0.35), WIN, [0, 1.1, z], null, null, 2);       // 천장 조명
    for (const x of [-3.6, 3.6]) for (let z = -1.5; z <= 5.5; z += 1.75) A.fx(box(0.4, 0.05, 0.4), 0xffc040, [x, -2.36, z], [3, (z + 2) / 8, 2, 1], null, null, 2.2);   // 유도등 (차례로 흐른다)
    A.glow(box(0.6, 0.05, 7.6), 0x4aa8ff, [0, -2.36, 2], null, null, 1.6);   // 바닥 중앙선
    for (const x of [-4.52, 4.52]) { A.matte(box(0.16, 3.8, 0.3), DARK, [x, -0.6, -2.1]); A.matte(box(0.16, 3.8, 0.3), DARK, [x, -0.6, 6.1]); A.glow(box(0.1, 0.2, 7.6), 0xffa040, [x, 1.0, 2], null, null, 1.8); }   // 문틀 · 경고등 띠
  } else hullBox(-17, 21);
  A.metal(wedge(9, 5, 16, 0.22, 0.5, -0.6), HULL, [0, 0, -25]);
  A.metal(box(7, 1.6, 40), PLATE, [0, -3.2, 1]);
  A.metal(wedge(7, 1.6, 12, 0.3, 0.6, 0.3), PLATE, [0, -3.2, -25]);
  A.matte(box(8.4, 0.2, 36), DARK, [0, 2.6, 2]);
  A.metal(wedge(4, 0.1, 10, 0.2, 1), BLUE, [0, 2.55, -24], [0.12, 0, 0]);
  const segs = big ? [[-17, -2], [6, 21]] : [[-17, 21]];
  for (const x of [-1, 1]) {
    for (const [z0, z1] of segs) {
      const l = z1 - z0, c = (z0 + z1) / 2;
      A.metal(box(0.12, 0.8, l), BLUE, [x * 4.52, 1.6, c]);
      const pz0 = Math.max(z0, -13), pz1 = Math.min(z1, 17);
      if (pz1 > pz0) { A.metal(box(1.6, 2.2, pz1 - pz0), PLATE, [x * 5.0, -0.8, (pz0 + pz1) / 2]); A.glow(box(0.08, 0.14, pz1 - pz0), 0x4aa8ff, [x * 5.82, -1.7, (pz0 + pz1) / 2], null, null, 2.2); }
      panelLines(A, LINE, 0, 0, [-2.4, 0.9], z0 + 1.5, z1 - 1, 3.2, x * 4.53);
      for (let z = z0 + 1; z <= z1 - 1; z += 2) A.fx(box(0.08, 0.35, 1.1), WIN, [x * 4.53, 0.15, z], [2, R(), 3, 0.6 + R() * 0.8], null, null, 1.1);   // 창문 (조금씩 다르게 깜박)
    }
    A.metal(wedge(0.5, 2.4, 12, 1, 0.5, 0), PLATE, [x * 4.7, -2.4, -20]);   // 이물 옆 장갑
    A.fx(sph(0.35, 8, 6), x < 0 ? 0xff2a2a : 0x2aff6a, [x * 5.9, 0.4, -14], [2, 0, 3, 2], null, null, 2.4);   // 좌현 빨강 · 우현 초록 항해등
    A.fx(sph(0.3, 8, 6), 0xffffff, [x * 4.6, 2.7, 20.5], [1, x < 0 ? 0 : 0.5, 3, 2.2], null, null, 3);
    A.metal(box(0.4, 5, 5), BLUE, [x * 4.2, 5.5, 22], [0.3, 0, -x * 0.25]);   // 꼬리날개
    A.glow(box(0.1, 0.3, 3.6), 0xff3030, [x * 4.42, 6.6, 22.6], [0.3, 0, -x * 0.25], null, 1.6);
    for (let k = 0; k < 6; k++) A.fx(box(0.25, 0.25, 0.25), 0x8fe0ff, [x * 5.85, -1.45, -10 + k * 4.6], [3, k / 6, 3, 1], null, null, 2.6);   // 흐르는 측면 등
  }
  // 갑판 돌기 · 점검구 · 상부 통풍구
  greebles(A, R, big ? 30 : 18, -3.6, 3.6, 2.7, -14, 18, [PLATE, 0xb8c0cc, LINE]);
  for (let z = -12; z <= 18; z += 5) A.matte(box(8.2, 0.04, 0.12), LINE, [0, 2.72, z]);
  // 함교 탑 (계단식) + 레이더 + 마스트
  A.metal(wedge(6, 4, 14, 0.8, 0.7, 0.4), HULL, [0, 4.6, 8]);
  A.metal(box(4.6, 2.6, 7), HULL, [0, 7.8, 9]);
  A.metal(box(3.4, 1.8, 4.2), HULL, [0, 9.9, 10.2]);
  A.metal(box(4.1, 0.7, 0.15), GLASS, [0, 8.3, 5.45]);
  A.glow(box(3.7, 0.25, 0.12), WIN, [0, 8.2, 5.38], null, null, 1.7);
  A.glow(box(3.0, 0.2, 0.1), WIN, [0, 10.2, 8.05], null, null, 1.5);
  for (const x of [-1, 1]) { A.matte(box(0.1, 0.5, 6.4), LINE, [x * 2.32, 7.8, 9.2]); A.metal(box(1.2, 0.3, 2.2), PLATE, [x * 3.0, 8.9, 8]); }   // 함교 날개
  A.metal(box(5.2, 0.3, 7.6), PLATE, [0, 9.25, 9]);
  A.metal(cylY(1.5, 1.5, 0.15, 16), PLATE, [0, 11.0, 11]); A.matte(cylY(0.3, 0.3, 0.6, 8), DARK, [0, 10.9, 11]);   // 레이더 원판
  mast(A, 0, 11.2, 12.2, 5.2, DARK, 0xffffff, 0);
  mast(A, -1.6, 11.0, 9.5, 2.6, DARK, 0xff3030, 0.4);
  A.fx(sph(0.5, 8, 6), 0xff2a2a, [0, -4.2, 0], [1, 0.3, 3, 1.2], null, null, 2.6);   // 배 밑 점멸등
  // 기관부
  A.metal(box(10, 6, 6), PLATE, [0, 0, 22]);
  A.metal(box(10.06, 0.8, 6.06), BLUE, [0, 2.2, 22]);
  for (let z = 19.6; z <= 24.4; z += 1.2) A.matte(box(10.1, 0.08, 0.1), LINE, [0, -1.2, z]);
  for (const x of [-3.2, 0, 3.2]) { A.matte(cylZ(1.5, 1.9, 1.6, 14, true), DARK, [x, -0.4, 25.6]); A.matte(new THREE.TorusGeometry(1.85, 0.12, 6, 16), 0x3a3f48, [x, -0.4, 26.35]); addFlame(A, x, -0.4, 26.2, 1.4, 9, THR, 0); }
  // 포탑 자리
  const turrets = [];
  mount(turrets, 0, 2.7, -16, 0, 1.05); mount(turrets, 0, 2.7, -8, 0, 1.05);
  for (const x of [-1, 1]) for (const z of big ? [-12, -6.5, 12] : [-8, 6]) mount(turrets, x * 6.0, 0.4, z, x, 0.9);
  const meshes = A.bake(g, mats);
  const boxes = big
    ? [[0, 0, -12.5, 5.9, 2.6, 11.5], [0, 0, 15.5, 5.9, 3, 9.5], [0, 1.85, 2, 4.6, 0.65, 4], [0, -3.2, 1, 3.5, 0.8, 20], [0, 6.5, 9, 3, 3.5, 7], [0, 0, -29, 2.5, 2, 5]]
    : [[0, 0, 0, 5, 3, 24], [0, 6.5, 9, 3, 3.5, 7], [0, 0, 22, 5, 3, 3]];
  return finishShip(g, meshes, { turrets, L: 62, W: 12, H: 10, light: 0xbfe4ff, search: [[-2.5, -4, -20], [2.5, -4, -20]], boxes,
    hangar: big ? { z0: -2, z1: 6, y0: -2.4, y1: 1.2 } : null, launch: [0, big ? -0.6 : -4, big ? 2 : 6] });
}

// ── 에이아 순양함: 검은 강철 선체 · 쌍갈래 충각 · 붉은 눈과 발광 띠 · 톱니 등지느러미 · 기함은 발진 통로 ──
//  parts: 기함 약점(엔진 좌·우 · 주포탑 · 좌현/우현 포대 · 실드 발생기)
export function eiaShip(big, mats, seed = 1) {
  const g = new THREE.Group(), A = kit(), R = rng(seed * 104729 + 7);
  const HULL = 0x2b2f3a, PLATE = 0x4a505e, DARK = 0x15171c, LINE = 0x0c0d10, RED = 0xff2a3a, THR = 0xff7a3a;
  const segs = big ? [[-14, 3], [9, 22]] : [[-14, 22]];
  for (const [z0, z1] of segs) A.metal(box(8, 5, z1 - z0), HULL, [0, 0, (z0 + z1) / 2]);
  if (big) {
    A.metal(box(8, 1.0, 6), HULL, [0, 2.0, 6]);
    A.matte(box(7.6, 0.08, 6), 0x1a1c22, [0, 1.47, 6]);
    for (let z = 3.6; z <= 8.4; z += 1.2) A.glow(box(7.0, 0.06, 0.3), 0xff4a3a, [0, 1.42, z], null, null, 1.8);
    for (const x of [-3.2, 3.2]) for (let z = 3.4; z <= 8.6; z += 1.3) A.fx(box(0.35, 0.05, 0.35), 0xff6a2a, [x, -2.05, z], [3, (z - 3) / 6, 2, 1], null, null, 2.4);
    for (const x of [-4.02, 4.02]) { A.matte(box(0.16, 3.6, 0.3), DARK, [x, -0.3, 2.9]); A.matte(box(0.16, 3.6, 0.3), DARK, [x, -0.3, 9.1]); }
  }
  A.metal(wedge(5.5, 3, 32, 0.4, 0.5, 0.5), PLATE, [0, -3.6, 2]);
  for (const x of [-1, 1]) {
    A.metal(wedge(3, 3.6, 22, 0.25, 0.4, 0), HULL, [x * 3.2, 0, -23]);
    A.glow(box(0.15, 0.4, 20), RED, [x * 4.72, 0.6, -21], null, null, 2.4);
    for (let z = -30; z <= -16; z += 3) A.matte(box(0.06, 2.6, 0.1), LINE, [x * (3.2 + 1.5 * (1 - (-z - 12) / 22 * 0.75)), 0, z]);
    for (const [z0, z1] of segs) {
      const l = z1 - z0, c = (z0 + z1) / 2;
      A.glow(box(0.12, 0.3, l - 1), RED, [x * 4.06, 1.2, c], null, null, 2.2);
      const pz0 = Math.max(z0, -9), pz1 = Math.min(z1, 17);
      if (pz1 > pz0) A.metal(box(1.4, 2.6, pz1 - pz0), PLATE, [x * 4.6, -0.4, (pz0 + pz1) / 2]);
      panelLines(A, LINE, 0, 0, [-2.4, 2.4], z0 + 1, z1 - 1, 2.6, x * 4.02);
      for (let z = z0 + 1.5; z <= z1 - 1; z += 3.2) A.fx(box(0.1, 0.9, 0.7), RED, [x * 5.33, -0.8, z], [2, R(), 3, 1.5 + R()], null, null, 2);
    }
    A.metal(wedge(0.5, 6, 8, 1, 0.25, -2), HULL, [x * 3.4, 3.4, 19], [0, 0, -x * 0.35]);   // 꼬리 지느러미
    A.fx(sph(0.3, 8, 6), RED, [x * 4.6, 6.6, 21.5], [1, x < 0 ? 0 : 0.5, 3, 1.8], null, null, 3);
    for (let k = 0; k < 7; k++) A.fx(box(0.22, 0.22, 0.6), 0xff4030, [x * 4.75, -1.85, -8 + k * 3.8], [3, k / 7, 3, 1], null, null, 2.6);
  }
  A.fx(sph(1.5), 0xff3040, [0, 0.2, -14], [2, 0, 3, 3], null, null, 2.4);   // 붉은 눈 (맥동)
  A.matte(cylZ(2.3, 2.3, 1.2, 16, true), DARK, [0, 0.2, -14.4]);
  A.matte(new THREE.TorusGeometry(2.0, 0.15, 6, 18), 0x3a1015, [0, 0.2, -15]);
  // 톱니 등지느러미 · 함교
  for (let i = 0; i < 5; i++) A.metal(wedge(0.5, 3.4, 4, 1, 0.2, -1.2), PLATE, [0, 3.6, -8 + i * 4.5], [0.25, 0, 0]);
  greebles(A, R, big ? 26 : 14, -3.4, 3.4, 2.5, -12, 20, [PLATE, 0x3a3f4a, 0x5a606e]);
  A.metal(wedge(5, 3, 10, 0.6, 0.6, 0.5), HULL, [0, 4.0, 14]);
  A.metal(box(3.2, 1.6, 4.4), HULL, [0, 6.2, 15.4]);
  A.glow(box(3.4, 0.4, 0.15), RED, [0, 4.7, 9.05], null, null, 2.4);
  A.glow(box(2.6, 0.22, 0.1), RED, [0, 6.4, 13.15], null, null, 2);
  mast(A, 0, 7.0, 17, 6, DARK, RED, 0.2);
  mast(A, 1.2, 7.0, 15, 3, DARK, RED, 0.7);
  A.fx(sph(0.5, 8, 6), RED, [0, -5.2, 2], [1, 0.1, 3, 1.2], null, null, 2.6);
  // 기관부
  A.metal(box(9, 6, 5), PLATE, [0, 0, 23.5]);
  for (let y = -2.4; y <= 2.4; y += 1.2) A.matte(box(9.05, 0.08, 5.05), LINE, [0, y, 23.5]);
  for (const x of [-2.4, 2.4]) for (const y of [-1.3, 1.5]) { A.matte(cylZ(1.2, 1.5, 1.4, 12, true), DARK, [x, y, 26.6]); addFlame(A, x, y, 27.1, 1.1, 8, THR, big ? (x < 0 ? 0 : 1) : 0); }
  const turrets = [];
  mount(turrets, 0, 2.6, -2, 0, big ? 1.25 : 1, false, "main"); mount(turrets, 0, -3.3, 8, 0, 1, true, "main");
  for (const x of [-1, 1]) for (const z of big ? [-10, -1, 13] : [-6, 8]) mount(turrets, x * 5.4, 0.3, z, x, 0.9, false, x < 0 ? "port" : "stbd");
  // 실드 발생기 (기함): 함교 뒤 기둥 위의 빛나는 구
  let shieldAt = null;
  if (big) shieldAt = new V3(0, 8.4, 19.6);
  const meshes = A.bake(g, mats);
  const boxes = big
    ? [[0, 0, -5.5, 4.8, 3.2, 8.5], [0, 0, 15.5, 4.8, 3.2, 6.5], [0, 2.0, 6, 4, 0.5, 3], [0, -3.6, 2, 2.75, 1.5, 16], [0, 0, 23.5, 4.5, 3, 2.5], [-3.2, 0, -23, 1.6, 1.6, 10], [3.2, 0, -23, 1.6, 1.6, 10], [0, 5.2, 15, 2.2, 1.8, 4]]
    : [[0, 0, 4, 4.8, 3.2, 21], [-3.2, 0, -23, 1.6, 1.6, 10], [3.2, 0, -23, 1.6, 1.6, 10]];
  const parts = big ? [
    { id: "engL", name: "좌현 엔진", kind: "engine", c: [-2.4, 0.1, 25.4], r: 3.4, box: [-2.4, 0.1, 25.5, 2.2, 3, 2.4], hp: 650, pod: 0 },
    { id: "engR", name: "우현 엔진", kind: "engine", c: [2.4, 0.1, 25.4], r: 3.4, box: [2.4, 0.1, 25.5, 2.2, 3, 2.4], hp: 650, pod: 1 },
    { id: "main", name: "주포탑", kind: "turret", c: [0, 3.6, -2], r: 2.8, box: [0, 3.6, -2, 1.6, 1.2, 1.8], hp: 600, group: "main" },
    { id: "port", name: "좌현 포대", kind: "turret", c: [-5.6, 1.0, -1], r: 3.2, group: "port", hp: 750 },
    { id: "stbd", name: "우현 포대", kind: "turret", c: [5.6, 1.0, -1], r: 3.2, group: "stbd", hp: 750 },
    { id: "shield", name: "실드 발생기", kind: "shield", c: [0, 8.4, 19.6], r: 2.6, box: [0, 8.0, 19.6, 1.6, 1.8, 1.6], hp: 1000 },
  ] : null;
  const ship = finishShip(g, meshes, { turrets, L: 62, W: 11, H: 10, light: 0xff4a5a, search: [[-3.2, -1.6, -32], [3.2, -1.6, -32]], boxes, parts,
    hangar: big ? { z0: 3, z1: 9, y0: -2.1, y1: 1.5 } : null, launch: [0, big ? -0.3 : -4.5, big ? 6 : 8] });
  if (big) shieldGen(g, shieldAt, 0x3a3f4a, 0xff4a5a, mats);
  return ship;
}

// ── 에일 모함: 보랏빛 생체 선체 · 갈비뼈 마디 · 맥동하는 혈관 · 막 지느러미 · 꼬리 촉수 ──
export function ailShip(big, mats, seed = 1) {
  const g = new THREE.Group(), A = kit(), R = rng(seed * 6007 + 3);
  const HULL = 0x4a2466, PLATE = 0x7a3a8a, DARK = 0x1a0c22, MEMB = 0x9a4ab8, VEIN = 0xd070ff, EYE = 0x6affd8, SAC = 0xff6ad8;
  A.metal(sph(1, 18, 12), HULL, [0, 0, 0], null, [7, 5.5, 28]);
  A.metal(sph(1, 14, 10), PLATE, [0, -2.4, 2], null, [5, 3, 22]);
  for (let z = -18; z <= 18; z += 6) { const f = Math.sqrt(Math.max(0.05, 1 - (z / 28) ** 2)); A.metal(new THREE.TorusGeometry(1, 0.06, 6, 20), PLATE, [0, 0, z], null, [7.3 * f, 5.8 * f, 6]); }
  for (let z = -15; z <= 15; z += 6) { const f = Math.sqrt(Math.max(0.05, 1 - (z / 28) ** 2)); A.matte(new THREE.TorusGeometry(1, 0.03, 4, 20), DARK, [0, 0, z], null, [7.05 * f, 5.55 * f, 6]); }
  for (const x of [-1, 1]) {
    A.fx(box(0.18, 0.18, 34), VEIN, [x * 3.4, 3.4, 0], [2, x < 0 ? 0 : 0.5, 3, 2.2], [0.04, 0, 0], null, 1.9);
    A.fx(box(0.12, 0.12, 26), VEIN, [x * 5.4, 1.6, 0], [2, 0.25, 3, 2.6], [0, 0, 0], null, 1.6);
    for (let z = -14; z <= 14; z += 7) A.fx(sph(0.45, 8, 6), VEIN, [x * 6.4 * Math.sqrt(1 - (z / 28) ** 2), 0.4, z], [2, (z + 14) / 28, 3, 3], null, null, 2.2);
    A.fx(sph(0.8, 10, 8), EYE, [x * 2.4, 1.4, -22.5], [2, 0, 3, 1.5], null, null, 2.6);
    A.metal(box(9, 0.3, 7), MEMB, [x * 9, -0.6, 4], [0, 0, x * 0.25]);   // 옆 지느러미
    for (let k = 0; k < 4; k++) A.matte(box(0.1, 0.34, 6.6), DARK, [x * (6 + k * 2), -0.6 + Math.sin(0.25) * (k * 2 - 3), 4], [0, 0, x * 0.25]);
    for (const k of [0, 1, 2]) A.metal(cylZ(0.9, 0.15, 14, 8), PLATE, [x * (1.4 + k * 1.2), -2 - k * 0.8, 32 + k], [-0.25 - k * 0.12, x * 0.12 * (k + 1), 0]);   // 촉수
    A.fx(sph(1.5, 10, 8), SAC, [x * 2.2, 0.3, 26], [2, x < 0 ? 0 : 0.3, big ? (x < 0 ? 0 : 1) : 0, 4], null, null, 2.2);
    addFlame(A, x * 2.2, 0.3, 27.4, 1.3, 9, 0xd060ff, big ? (x < 0 ? 0 : 1) : 0);
  }
  // 등 돌기 (가시)
  for (let i = 0; i < (big ? 14 : 8); i++) { const z = -16 + R() * 30, x = (R() - 0.5) * 6, h = 0.8 + R() * 1.6, f = Math.sqrt(Math.max(0.05, 1 - (z / 28) ** 2)); A.metal(new THREE.ConeGeometry(0.3, h, 6), PLATE, [x, 5.1 * f * Math.sqrt(Math.max(0, 1 - (x / 7) ** 2)) + h / 2 - 0.2, z]); }
  A.matte(new THREE.ConeGeometry(3.2, 7, 12, 1, true), DARK, [0, -0.6, -27.5], [-PI / 2, 0, 0]);
  A.fx(sph(1.4, 10, 8), 0xff4ad0, [0, -0.6, -26], [2, 0, 3, 5], null, null, 1.6);   // 입 속 빛
  A.metal(wedge(0.4, 6.5, 18, 1, 0.2, -2.6), MEMB, [0, 6.6, 3]);
  const turrets = [];
  for (const x of [-1, 1]) for (const z of big ? [-12, -2, 9] : [-6, 6]) mount(turrets, x * 6.9 * Math.sqrt(1 - (z / 28) ** 2), 0.6, z, x, 0.9, false, x < 0 ? "port" : "stbd");
  mount(turrets, 0, 4.6, -10, 0, 1.1, false, "main");
  const meshes = A.bake(g, mats);
  const parts = big ? [
    { id: "engL", name: "좌측 추진낭", kind: "engine", c: [-2.2, 0.3, 26], r: 2.8, box: [-2.2, 0.3, 26, 1.8, 1.8, 2], hp: 650, pod: 0 },
    { id: "engR", name: "우측 추진낭", kind: "engine", c: [2.2, 0.3, 26], r: 2.8, box: [2.2, 0.3, 26, 1.8, 1.8, 2], hp: 650, pod: 1 },
    { id: "main", name: "등 포자탑", kind: "turret", c: [0, 5.4, -10], r: 2.6, group: "main", hp: 600 },
    { id: "port", name: "좌측 포자낭", kind: "turret", c: [-6.6, 1.2, -2], r: 3.2, group: "port", hp: 750 },
    { id: "stbd", name: "우측 포자낭", kind: "turret", c: [6.6, 1.2, -2], r: 3.2, group: "stbd", hp: 750 },
    { id: "shield", name: "막 발생 기관", kind: "shield", c: [0, 10.8, 5], r: 2.6, box: [0, 10.4, 5, 1.6, 1.8, 1.6], hp: 1000 },
  ] : null;
  const ship = finishShip(g, meshes, { turrets, L: 64, W: 14, H: 11, light: 0xd080ff, search: [[-2.4, -2, -24], [2.4, -2, -24]],
    boxes: [[0, 0, 0, 6, 4.6, 24], [0, 5, 3, 0.6, 3, 8], [-8.5, -0.6, 4, 4.4, 0.6, 3.5], [8.5, -0.6, 4, 4.4, 0.6, 3.5]], parts, hangar: null, launch: [0, -4.5, 6] });
  if (big) shieldGen(g, new V3(0, 10.8, 5), 0x4a2466, 0xd070ff, mats);
  return ship;
}

// 실드 발생기 모형: 받침 + 고리 + 빛나는 구 (부서지면 숨긴다 → 따로 한 묶음)
function shieldGen(g, at, base, light, mats) {
  const A = kit(), grp = new THREE.Group(); grp.position.copy(at); g.add(grp);
  A.metal(cylY(0.6, 1.2, 2.6, 10), base, [0, -1.6, 0]);
  A.metal(new THREE.TorusGeometry(1.5, 0.16, 6, 20), base, [0, 0, 0], [PI / 2, 0, 0]);
  A.metal(new THREE.TorusGeometry(1.5, 0.12, 6, 20), base, [0, 0, 0], [0, 0, 0]);
  for (let k = 0; k < 4; k++) { const a = k * PI / 2; A.matte(box(0.12, 1.8, 0.12), 0x15171c, [Math.cos(a) * 1.1, -1.0, Math.sin(a) * 1.1], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]); }
  A.fx(sph(0.95, 14, 10), light, [0, 0, 0], [2, 0, 3, 6], null, null, 2.6);
  A.fx(sph(1.25, 12, 8), 0xffffff, [0, 0, 0], [2, 0.5, 3, 6], null, null, 0.35);
  const m = A.bake(grp, mats);
  g.userData.shieldGen = grp; g.userData.shieldGenMeshes = m;
}

// 공통: 포탑 인스턴스 · 탐조등 · 그을음 · 정리
function finishShip(g, meshes, o) {
  const sl = [];
  const coneGeo = new THREE.ConeGeometry(9, 70, 18, 1, true); coneGeo.translate(0, -35, 0);
  const coneMat = new THREE.MeshBasicMaterial({ color: o.light, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (const p of o.search) {
    const piv = new THREE.Group(); piv.position.set(...p); g.add(piv);
    const c = new THREE.Mesh(coneGeo, coneMat); c.renderOrder = 4; piv.add(c);
    sl.push(piv);
  }
  Object.assign(g.userData, { meshes, turrets: o.turrets, L: o.L, W: o.W, H: o.H, boxes: o.boxes, parts: o.parts || null, hangar: o.hangar, launch: o.launch, search: sl, coneGeo, coneMat });
  return g;
}
