// ── 거대로봇 (적 보스 · 초거대로봇 · 아군 공성 로봇) ─────────────────────
// 모델: 부위(노드)마다 색을 정점에 구워 넣은 덩어리 하나(+ 발광 덩어리 하나)로 합쳐 그린다 → 세부는 많아도 그리기 호출은 30회 안팎
// 부위: 머리 센서 · 흉부 장갑 · 레이저 팔 · 미사일 팔 · 양다리 · 몸통 코어(본체)
// 큰 공격(예고 → 공격 → 회복): 땅 찍기 충격파 · 팔 레이저 휩쓸기 · 미사일 일제 사격(비유도). 회복 동안 흉갑이 열려 코어가 드러난다(피해 1.75배)
// 행진: spawn("titan", { march: [점...], target: 액터 }) — 경로를 따라 걸으며 소품을 짓밟고, 목표에 닿으면 큰 피해. u.march.eta 로 도달 예상 시간
import * as THREE from "../vendor/three.module.min.js";
import { clamp } from "./config.js";
import { armorMat, chamferBox } from "./unitskin.js";
import { mergeStatic } from "./mergemodel.js";
import { TitanFX } from "./titanfx.js";

const V3 = THREE.Vector3;
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e = new V3(), _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _col = new THREE.Color();
const UP = new V3(0, 1, 0);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const turn = (cur, want, max) => cur + clamp(wrap(want - cur), -max, max);
const ease = (k) => 1 - (1 - k) * (1 - k);

// ── 색 (정점 색으로 굽는다) ──
const COL = { armor: 0x6c7890, plate: 0x96a3b8, dark: 0x2c313b, metal: 0xa3acbb, steel: 0x464d5a, haz: 0xd9a21c, rub: 0x17191e, hose: 0x2a2d33, brass: 0xa8874a };
const ALLY = { armor: 0x5a78a4, plate: 0x8fa8cc };

// ── 공유 지오메트리·재질 ──
const _geo = new Map();
const cylG = (r1, r2, h, seg = 12) => { const k = `c${r1}|${r2}|${h}|${seg}`; let g = _geo.get(k); if (!g) _geo.set(k, (g = new THREE.CylinderGeometry(r1, r2, h, seg))); return g; };
const sphG = (r, ws = 14, hs = 10) => { const k = `s${r}|${ws}`; let g = _geo.get(k); if (!g) _geo.set(k, (g = new THREE.SphereGeometry(r, ws, hs))); return g; };
const boxG = (w, h, d) => { const k = `b${w}|${h}|${d}`; let g = _geo.get(k); if (!g) _geo.set(k, (g = new THREE.BoxGeometry(w, h, d))); return g; };
let GLOW = null, CRACK = null;
const glowMat = () => GLOW || (GLOW = new THREE.MeshBasicMaterial({ vertexColors: true }));
const crackMat = () => CRACK || (CRACK = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a1e).multiplyScalar(2.6) }));

// ── 조립 도구: 노드별·종류별로 부품을 모아 두었다가 덩어리 하나로 합친다 ──
class Kit {
  constructor() { this.map = new Map(); }
  put(node, kind, geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, k = 1) {
    let e = this.map.get(node); if (!e) this.map.set(node, (e = {}));
    (e[kind] || (e[kind] = [])).push({ geo, m: new THREE.Matrix4().compose(_a.set(x, y, z), _q.setFromEuler(_eu.set(rx, ry, rz)), _b.set(sx, sy, sz)), col: _col.set(color).multiplyScalar(k).clone() });
  }
  build(mats) {
    const out = new Map();
    for (const [node, e] of this.map) {
      const r = {};
      for (const kind in e) {
        const L = e[kind];
        let nv = 0, ni = 0;
        for (const p of L) { nv += p.geo.attributes.position.count; ni += p.geo.index ? p.geo.index.count : p.geo.attributes.position.count; }
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
        let vo = 0, io = 0;
        const nm = new THREE.Matrix3();
        for (const p of L) {
          const g = p.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
          nm.getNormalMatrix(p.m);
          for (let i = 0; i < P.count; i++) {
            _a.fromBufferAttribute(P, i).applyMatrix4(p.m); pos[(vo + i) * 3] = _a.x; pos[(vo + i) * 3 + 1] = _a.y; pos[(vo + i) * 3 + 2] = _a.z;
            _a.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = _a.x; nor[(vo + i) * 3 + 1] = _a.y; nor[(vo + i) * 3 + 2] = _a.z;
            if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
            col[(vo + i) * 3] = p.col.r; col[(vo + i) * 3 + 1] = p.col.g; col[(vo + i) * 3 + 2] = p.col.b;
          }
          if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = vo + g.index.getX(i);
          else for (let i = 0; i < P.count; i++) idx[io++] = vo + i;
          vo += P.count;
        }
        const mg = new THREE.BufferGeometry();
        mg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        mg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
        mg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        mg.setAttribute("color", new THREE.BufferAttribute(col, 3));
        mg.setIndex(new THREE.BufferAttribute(nv > 65535 ? idx : new Uint16Array(idx), 1));
        mg.computeBoundingSphere();
        const me = new THREE.Mesh(mg, mats[kind]);
        me.castShadow = kind === "s"; me.receiveShadow = kind === "s";
        me.userData.keep = true;
        if (kind === "c") me.visible = false;
        node.add(me);
        r[kind] = me;
      }
      out.set(node, r);
    }
    return out;
  }
}
function grp(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; }

// 공용 연출 묶음 (전투 한 판에 하나)
export function titanFX(U) { return U.tfx || (U.tfx = new TitanFX(U.c)); }

// 경로 점: V3 · [x,z] · [x,y,z] · {x,z}
const toV = (p) => (p.isVector3 ? p.clone() : Array.isArray(p) ? (p.length >= 3 ? new V3(p[0], 0, p[2]) : new V3(p[0], 0, p[1])) : new V3(p.x, 0, p.z));

export function makeMech(U, o) {
  const S = o.scale || 1, w = U.w, c = U.c, team = o.team ?? 1;
  const friendly = c.player ? team === c.player.team && !c.ffa : team === 0;
  const big = S >= 1.8 || !!o.boss, siege = !!o.siege;
  const FX = titanFX(U);
  if (S >= 1.6 || o.march) FX._index();   // 짓밟기용 정점 색인은 등장할 때 미리 (첫 걸음에 멈칫하지 않게)
  const g = new THREE.Group();
  const p0 = o.march && o.march.length && !o.pos ? toV(o.march[0]) : null;
  const p = U.groundSpot(o.pos ? o.pos.x : p0 ? p0.x : 0, o.pos ? o.pos.z : p0 ? p0.z : 0, o.march ? 12 : 45, 9 * S);
  g.position.copy(p); g.scale.setScalar(S); w.scene.add(g);
  const AR = friendly ? ALLY.armor : COL.armor, PL = friendly ? ALLY.plate : COL.plate;
  const TC = friendly ? 0x38c8ff : o.tc;
  const K = new Kit();
  const B = (n, W, H, D, col, x, y, z, rx, ry, rz) => K.put(n, "s", chamferBox(W, H, D), col, x, y, z, rx, ry, rz);
  const C = (n, r1, r2, h, col, x, y, z, rx, ry, rz, seg = 12) => K.put(n, "s", cylG(r1, r2, h, seg), col, x, y, z, rx, ry, rz);
  const GB = (n, W, H, D, col, x, y, z, k = 2.2, rx, ry, rz) => K.put(n, "g", boxG(W, H, D), col, x, y, z, rx, ry, rz, 1, 1, 1, k);
  const GC = (n, r1, r2, h, col, x, y, z, k = 2.2, rx, ry, rz, seg = 12) => K.put(n, "g", cylG(r1, r2, h, seg), col, x, y, z, rx, ry, rz, 1, 1, 1, k);
  const XR = Math.PI / 2;
  // 리벳 줄 (판 위 작은 머리들)
  const bolts = (n, x0, y0, z0, cnt, dx, dy, col = COL.metal, axis = "z") => { for (let i = 0; i < cnt; i++) { const x = x0 + dx * i, y = y0 + dy * i; if (axis === "z") C(n, 0.12, 0.12, 0.12, col, x, y, z0, XR, 0, 0, 6); else C(n, 0.12, 0.12, 0.12, col, x0, y, z0 + dx * i, 0, 0, XR, 6); } };
  // 환기 슬랫
  const slats = (n, W, H, cnt, x, y, z, d = 0.2, col = COL.dark) => { B(n, W + 0.2, H + 0.2, d * 0.6, COL.steel, x, y, z); for (let k = 0; k < cnt; k++) B(n, W, (H / cnt) * 0.45, d, col, x, y - H / 2 + (k + 0.5) * (H / cnt), z + (z >= 0 ? d * 0.3 : -d * 0.3)); };
  // 경고 줄무늬 (노랑 판 + 비스듬한 검은 띠)
  const haz = (n, W, H, x, y, z, ry = 0) => { B(n, W, H, 0.12, COL.haz, x, y, z, 0, ry); const nn = Math.max(2, Math.round(W / 0.55)); for (let k = 0; k < nn; k++) { const u = -W / 2 + (k + 0.5) * (W / nn); K.put(n, "s", boxG(0.16, H * 1.25, 0.14), COL.rub, x + Math.cos(ry) * u, y, z - Math.sin(ry) * u + (z >= 0 ? 0.02 : -0.02), 0, ry, 0.6); } };
  // 호스: 점들을 잇는 굵은 관
  const hose = (n, pts, r = 0.22, col = COL.hose) => { const cv = new THREE.CatmullRomCurve3(pts.map((q) => new V3(...q))); K.put(n, "s", new THREE.TubeGeometry(cv, 14, r, 6), col, 0, 0, 0); for (const t of [0, 1]) { const q = cv.getPoint(t); C(n, r * 1.6, r * 1.6, 0.35, COL.metal, q.x, q.y, q.z, 0, 0, 0, 8); } };
  // 균열(피해 상태): 판 표면에 지그재그 금. 피해를 입으면 주황색으로 빛난다
  let crS = 7 + Math.floor(S * 13);
  const rnd = () => ((crS = (crS * 1664525 + 1013904223) >>> 0) / 4294967296);
  const crack = (n, x, y, z, size, ry = 0) => {
    let u = 0, v = 0, a = rnd() * 6.28;
    for (let k = 0; k < 6; k++) {
      const L = size * (0.25 + rnd() * 0.25); a += (rnd() - 0.5) * 1.6;
      const mu = u + Math.cos(a) * L / 2, mv = v + Math.sin(a) * L / 2;
      K.put(n, "c", boxG(L, 0.09 + rnd() * 0.06, 0.12), 0xffffff, x + Math.cos(ry) * mu, y + mv, z - Math.sin(ry) * mu, 0, ry, a);
      u += Math.cos(a) * L; v += Math.sin(a) * L;
      if (k === 2) { u = v = 0; a += Math.PI; }
    }
  };

  // ── 골반·다리 ──
  const HIP = 11;
  const pelvis = grp(g, 0, HIP, 0);
  B(pelvis, 5.2, 2.2, 3.4, COL.dark, 0, 0, 0);
  B(pelvis, 2.2, 2.6, 1.3, AR, 0, -1.2, -1.6); haz(pelvis, 1.8, 0.4, 0, -0.4, -2.3);
  C(pelvis, 1.0, 1.0, 5.6, COL.steel, 0, -0.2, 0, 0, 0, XR, 14);
  for (const sx of [-1, 1]) { B(pelvis, 1.4, 2.4, 3.1, AR, sx * 3.35, -0.9, 0, 0, 0, sx * 0.14); B(pelvis, 1.45, 0.25, 3.15, COL.metal, sx * 3.4, 0.25, 0, 0, 0, sx * 0.14); bolts(pelvis, sx * 3.95, -0.4, -1.0, 3, 0, -0.6, COL.metal, "x"); }
  B(pelvis, 2.6, 1.8, 1.3, PL, 0, -0.9, 1.75); slats(pelvis, 1.8, 1.0, 4, 0, -0.9, 2.45, 0.18);
  for (const sx of [-1, 1]) hose(pelvis, [[sx * 1.3, 0.6, 1.5], [sx * 1.9, 0.2, 2.0], [sx * 2.3, -0.7, 1.4]], 0.2);
  crack(pelvis, 0.4, -1.0, -2.3, 1.6);
  const legs = [-1, 1].map((sx) => {
    const th = grp(pelvis, sx * 2.4, -0.4, 0);
    C(th, 1.15, 1.15, 2.7, COL.metal, 0, 0, 0, 0, 0, XR, 16); C(th, 0.6, 0.6, 2.9, COL.steel, 0, 0, 0, 0, 0, XR, 10);
    B(th, 2.0, 5.0, 2.4, AR, 0, -2.8, 0); B(th, 1.2, 4.2, 2.6, COL.dark, 0, -2.9, 0.1);
    B(th, 0.3, 3.6, 2.0, PL, sx * 1.1, -2.6, 0.1); bolts(th, sx * 1.27, -1.2, -0.6, 4, 0.4, 0, COL.metal, "x");
    slats(th, 1.3, 1.4, 3, 0, -4.1, 1.25, 0.2);
    crack(th, sx * 0.2, -3.3, -1.28, 1.8);
    const tp = grp(th, 0, -2.4, -1.3);   // 허벅지 앞판(피해를 받으면 떨어져 나간다)
    B(tp, 2.4, 3.3, 0.5, PL, 0, 0, 0, -0.06); B(tp, 2.0, 0.3, 0.55, COL.metal, 0, 1.2, -0.05); haz(tp, 1.6, 0.35, 0, -1.25, -0.3); bolts(tp, -0.9, 0.6, -0.28, 4, 0.6, 0);
    const kn = grp(th, 0, -5.4, 0);
    C(kn, 1.3, 1.3, 2.5, COL.dark, 0, 0, 0, 0, 0, XR, 16); C(kn, 1.45, 1.45, 0.4, COL.metal, sx * 1.35, 0, 0, 0, 0, XR, 16); C(kn, 0.5, 0.5, 0.3, COL.haz, sx * 1.6, 0, 0, 0, 0, XR, 10);
    B(kn, 1.8, 4.2, 2.2, AR, 0, -2.3, 0.2); B(kn, 2.2, 1.7, 1.0, PL, 0, -0.5, -1.15, -0.25);
    B(kn, 2.0, 2.6, 0.6, PL, 0, -2.4, -1.15); bolts(kn, -0.7, -1.4, -1.48, 3, 0.7, 0);
    B(kn, 1.5, 3.0, 0.8, COL.dark, 0, -2.4, 1.5); slats(kn, 1.0, 1.6, 3, 0, -2.4, 1.95, 0.16);
    haz(kn, 2.2, 0.35, 0, -3.95, -1.0); C(kn, 0.85, 0.85, 2.3, COL.metal, 0, -4.3, 0, 0, 0, XR, 12);
    hose(kn, [[sx * 0.7, -0.6, 1.25], [sx * 1.15, -2.0, 1.6], [sx * 0.8, -3.6, 1.2]], 0.16);
    crack(kn, -0.2, -2.6, -1.48, 1.6);
    const ft = grp(kn, 0, -4.3, 0);
    B(ft, 2.6, 0.9, 4.4, COL.dark, 0, -0.55, -0.5); B(ft, 2.2, 0.6, 2.4, AR, 0, -0.05, -0.4);
    for (const tx of [-0.85, 0, 0.85]) { B(ft, 0.75, 0.75, 1.7, COL.steel, tx, -0.62, -3.0); C(ft, 0.38, 0.38, 0.8, COL.metal, tx, -0.62, -2.2, 0, 0, XR, 8); }
    B(ft, 1.5, 0.8, 1.3, COL.steel, 0, -0.6, 1.9); haz(ft, 2.0, 0.3, 0, -0.35, -2.75);
    // 무릎 유압 실린더: 바깥 통은 허벅지에, 막대는 정강이에 붙어 걸을 때 늘었다 줄었다 한다
    const pa = grp(th, 0, -1.4, -1.55), pb = grp(kn, 0, -1.9, -1.5);
    C(pa, 0.34, 0.34, 3.4, COL.steel, 0, -1.7, 0, 0, 0, 0, 10); C(pa, 0.42, 0.42, 0.5, COL.metal, 0, -0.05, 0, 0, 0, 0, 10); C(pa, 0.4, 0.4, 0.2, COL.haz, 0, -3.3, 0, 0, 0, 0, 10);
    C(pb, 0.17, 0.17, 3.6, COL.metal, 0, -1.8, 0, 0, 0, 0, 8); C(pb, 0.3, 0.3, 0.5, COL.steel, 0, -0.05, 0, 0, 0, 0, 8);
    return { sx, th, tp, kn, ft, pa, pb, down: false };
  });

  // ── 몸통 ──
  const waist = grp(pelvis, 0, 1.4, 0);
  C(waist, 1.25, 1.25, 1.8, COL.metal, 0, 1.0, 0, 0, 0, 0, 16); C(waist, 1.5, 1.9, 0.6, COL.dark, 0, 0.2, 0, 0, 0, 0, 14);
  for (let i = 0; i < 3; i++) B(waist, 4.6 + i * 0.4, 0.55, 3.4, i % 2 ? COL.steel : COL.dark, 0, 1.6 + i * 0.55, 0);
  B(waist, 6.4, 2.4, 4.2, AR, 0, 3.6, 0.1);
  B(waist, 7.6, 3.4, 4.6, AR, 0, 6.3, 0);
  for (const sx of [-1, 1]) {
    B(waist, 3.0, 2.6, 0.7, PL, sx * 2.25, 6.7, -2.35, -0.22, sx * 0.22, 0);   // 가슴 판
    bolts(waist, sx * 1.2, 7.8, -2.62, 3, sx * 0.7, -0.1);
    B(waist, 0.4, 4.6, 3.4, PL, sx * 3.85, 4.9, 0); B(waist, 2.6, 2.4, 3.6, PL, sx * 4.7, 6.6, 0);
    GB(waist, 0.3, 0.3, 4.6, TC, sx * 3.75, 7.95, 0, 2.0); GB(waist, 0.14, 3.4, 0.14, TC, sx * 2.1, 4.4, -2.18, 2.0);
    haz(waist, 0.2, 1.8, sx * 3.0, 2.4, -2.18);
    // 어깨 위 미사일 포드(장식) · 배기 굴뚝
    B(waist, 1.6, 1.2, 2.2, AR, sx * 3.0, 9.1, 0.8); B(waist, 1.65, 0.12, 2.25, COL.haz, sx * 3.0, 9.72, 0.8);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) GC(waist, 0.22, 0.22, 0.1, 0xff4a3a, sx * 3.0 - 0.35 + i * 0.7, 9.3 - j * 0.45, -0.33, 1.6, XR, 0, 0, 8);
    C(waist, 0.55, 0.65, 2.4, COL.steel, sx * 1.6, 8.9, 3.6, 0, 0, 0, 10); C(waist, 0.6, 0.6, 0.3, COL.metal, sx * 1.6, 10.1, 3.6, 0, 0, 0, 10); GC(waist, 0.4, 0.4, 0.06, 0xff8a3a, sx * 1.6, 10.26, 3.6, 1.6, 0, 0, 0, 10);
    hose(waist, [[sx * 2.0, 7.4, 2.4], [sx * 3.6, 8.0, 2.1], [sx * 4.6, 7.0, 0.9]], 0.26);
    hose(waist, [[sx * 1.6, 2.6, 2.0], [sx * 2.6, 3.4, 2.4], [sx * 3.3, 5.4, 2.1]], 0.2);
  }
  B(waist, 7.4, 0.5, 4.6, COL.metal, 0, 8.0, 0); B(waist, 6.6, 0.4, 4.0, COL.dark, 0, 2.45, 0);
  B(waist, 4.2, 0.8, 3.2, COL.steel, 0, 8.45, -0.1); C(waist, 0.9, 1.1, 1.0, COL.dark, 0, 8.6, -0.3, 0, 0, 0, 12);
  slats(waist, 3.4, 1.4, 4, 0, 6.5, -2.7, 0.3);
  GB(waist, 3.0, 0.12, 0.12, TC, 0, 2.6, -2.2, 2.0);
  // 코어 받침 (흉갑 뒤): 둥근 테 + 냉각 날개
  C(waist, 1.7, 1.7, 0.6, COL.steel, 0, 4.0, -2.15, XR, 0, 0, 18);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; B(waist, 0.25, 0.7, 0.4, COL.metal, Math.cos(a) * 1.85, 4.0 + Math.sin(a) * 1.85, -2.35, 0, 0, a); }
  // 등 반응로 팩: 환기구·추진기·배기
  B(waist, 4.8, 4.6, 2.2, COL.dark, 0, 5.4, 3.3); B(waist, 5.0, 0.4, 2.4, COL.metal, 0, 7.8, 3.3);
  slats(waist, 3.2, 1.6, 4, 0, 6.3, 4.45, 0.22, COL.steel);
  for (const sx of [-1, 1]) { C(waist, 0.7, 0.95, 1.6, COL.steel, sx * 1.4, 3.0, 3.6, 0, 0, 0, 12); GC(waist, 0.55, 0.55, 0.12, 0x7fd8ff, sx * 1.4, 2.15, 3.6, 2.0, 0, 0, 0, 12); }
  haz(waist, 3.0, 0.4, 0, 4.1, 4.42);
  crack(waist, 0.6, 3.4, -2.08, 2.4); crack(waist, -1.4, 6.2, 2.32, 2.2, Math.PI); crack(waist, 2.4, 5.4, -2.32, 1.6);
  // 흉갑 (부위): 반쪽씩 두 장. 회복 구간에 옆으로 벌어져 코어를 드러낸다
  const chest = [-1, 1].map((sx) => {
    const n = grp(waist, sx * 1.15, 4.0, -2.6);
    B(n, 2.3, 3.2, 0.9, PL, sx * 0.05, 0, 0); B(n, 2.4, 0.3, 1.0, COL.metal, 0, 1.55, 0); B(n, 0.3, 3.0, 1.0, COL.steel, -sx * 1.05, 0, -0.05);
    bolts(n, sx * 0.9, 1.1, -0.48, 4, 0, -0.7); haz(n, 1.4, 0.3, sx * 0.2, -1.3, -0.48);
    crack(n, sx * 0.2, 0.2, -0.5, 1.2);
    return { n, sx, x0: sx * 1.15 };
  });
  const chestC = grp(waist, 0, 4.0, -2.4);
  // 머리: 투구·바이저·쌍안 센서·볏·안테나
  const head = grp(waist, 0, 8.6, -0.3);
  B(head, 2.6, 2.0, 2.6, PL, 0, 0.3, 0); B(head, 2.9, 0.4, 2.9, AR, 0, 1.35, 0); B(head, 0.35, 1.0, 2.6, AR, 0, 1.8, 0.1);
  B(head, 2.3, 0.9, 0.5, COL.dark, 0, -0.55, -1.2); B(head, 2.5, 0.8, 0.2, COL.dark, 0, 0.3, -1.32);
  for (const sx of [-1, 1]) { C(head, 0.38, 0.38, 0.5, COL.steel, sx * 1.45, 0.1, 0.2, 0, 0, XR, 10); B(head, 0.3, 1.2, 1.6, AR, sx * 1.35, 0.6, 0.1); }
  C(head, 0.04, 0.04, 2.2, COL.dark, -0.9, 2.3, 0.6, 0, 0, 0, 5); C(head, 0.04, 0.04, 1.4, COL.dark, 0.9, 2.0, 0.7, 0, 0, 0, 5); GB(head, 0.16, 0.16, 0.16, 0xff4040, 0.9, 2.75, 0.7, 2.4);
  crack(head, 0.3, 0.8, -1.32, 1.0);
  // ── 팔 ──
  const arms = [-1, 1].map((sx) => {
    const sh = grp(waist, sx * 5.2, 6.4, 0);
    C(sh, 1.2, 1.2, 2.3, COL.metal, 0, 0, 0, 0, 0, XR, 16); C(sh, 0.7, 0.7, 2.6, COL.steel, 0, 0, 0, 0, 0, XR, 10);
    B(sh, 1.8, 4.2, 2.0, AR, 0, -2.4, 0); B(sh, 1.0, 3.6, 2.2, COL.dark, 0, -2.5, 0.05); B(sh, 0.45, 2.6, 1.8, PL, sx * 0.95, -2.4, 0);
    hose(sh, [[0, -0.9, 1.1], [sx * 0.5, -2.6, 1.4], [0, -4.0, 1.1]], 0.18);
    crack(sh, sx * 0.2, -2.6, -1.02, 1.4);
    const pd = grp(sh, sx * 0.3, 1.1, 0);   // 어깨 장갑(떨어져 나갈 수 있다)
    B(pd, 3.0, 1.2, 3.4, AR, 0, 0.05, 0, 0, 0, -sx * 0.18); B(pd, 0.5, 2.6, 3.0, PL, sx * 1.35, -1.0, 0); haz(pd, 2.0, 0.3, 0, -0.2, -1.75);
    GB(pd, 0.12, 0.12, 3.2, TC, sx * 1.62, -0.2, 0, 2.0); bolts(pd, sx * 1.62, -1.6, -1.0, 3, 1.0, 0, COL.metal, "x");
    const fore = grp(sh, 0, -4.6, 0);
    C(fore, 0.95, 0.95, 2.5, COL.metal, 0, 0, 0, 0, 0, XR, 14);
    let gun = null, coilAt = null;
    if (sx < 0) {   // 왼팔: 3연 회전 레이저 포
      B(fore, 2.2, 2.4, 5.4, COL.dark, 0, -0.6, -2.0); B(fore, 0.3, 1.9, 4.2, PL, sx * 1.2, -0.6, -2.0); B(fore, 2.0, 0.3, 4.0, AR, 0, 0.7, -2.0);
      GB(fore, 0.18, 0.18, 4.4, TC, 1.15, -0.6, -2.4, 2.0); slats(fore, 1.4, 1.0, 3, 0, -0.6, 0.72, 0.16);
      C(fore, 0.85, 0.85, 0.5, COL.metal, 0, -0.6, -4.9, XR, 0, 0, 14);
      coilAt = [0, -0.6, -5.5];
      gun = grp(fore, 0, -0.6, -5.2);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; C(gun, 0.28, 0.32, 3.4, COL.steel, Math.cos(a) * 0.42, Math.sin(a) * 0.42, -1.7, XR, 0, 0, 8); }
      C(gun, 0.75, 0.75, 0.3, COL.metal, 0, 0, -3.3, XR, 0, 0, 12); C(gun, 0.5, 0.5, 0.6, COL.dark, 0, 0, -0.2, XR, 0, 0, 10);
    } else {        // 오른팔: 6연장 미사일 발사기
      B(fore, 2.8, 2.8, 4.6, COL.dark, 0, -0.6, -1.6); B(fore, 3.0, 0.3, 4.4, AR, 0, 0.85, -1.6); B(fore, 0.3, 2.4, 3.8, PL, sx * 1.45, -0.6, -1.4);
      haz(fore, 2.4, 0.3, 0, -2.05, -3.9); bolts(fore, -1.1, 0.85, -3.6, 4, 0.73, 0, COL.metal);
    }
    crack(fore, 0.2, -0.6, -2.5, 1.4, sx < 0 ? 0 : 0);
    return { sx, sh, pd, fore, gun, coilAt, pitch: 0, spin: 0 };
  });

  // ── 개별 재질 (기체마다): 외피(피해 발광) · 눈 · 코어 · 레이저 충전 코일 · 미사일 관 ──
  const solid = armorMat(0xffffff, 0.05); solid.vertexColors = true; solid.emissive = new THREE.Color(0);
  const built = K.build({ s: solid, g: glowMat(), c: crackMat() });
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(TC).multiplyScalar(2.6) });
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb02e).multiplyScalar(1.4) });
  const coilMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3d6a) });
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4a3a) });
  const mesh = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.userData.keep = true; parent.add(me); return me; };
  // 눈: 두 갈래 바이저 + 가운데 외눈 (한 덩어리)
  const eyeGeo = (() => { const k = new Kit(); const tmp = new THREE.Group(); k.put(tmp, "e", boxG(0.75, 0.22, 0.12), 0xffffff, -0.55, 0.32, 0, 0, 0, -0.12); k.put(tmp, "e", boxG(0.75, 0.22, 0.12), 0xffffff, 0.55, 0.32, 0, 0, 0, 0.12); k.put(tmp, "e", cylG(0.22, 0.22, 0.12, 12), 0xffffff, 0, 0.1, 0, XR, 0, 0); const r = k.build({ e: eyeMat }).get(tmp).e; r.removeFromParent(); return r.geometry; })();
  const eyeM = mesh(head, eyeGeo, eyeMat, 0, 0, -1.43);
  const coreM = mesh(waist, sphG(1.15, 16, 12), coreMat, 0, 4.0, -2.2);
  const coilM = mesh(arms[0].fore, (() => { const k = new Kit(), tmp = new THREE.Group(); for (let i = 0; i < 3; i++) k.put(tmp, "e", cylG(0.95, 0.95, 0.18, 14), 0xffffff, 0, 0, i * 0.45, XR, 0, 0); const r = k.build({ e: coilMat }).get(tmp).e; r.removeFromParent(); return r.geometry; })(), coilMat, ...arms[0].coilAt);
  const tubes = [];
  for (const mx of [-0.75, 0, 0.75]) for (const my of [-1.3, -0.1]) tubes.push(new V3(mx, my - 0.0, -3.95));
  const tubeM = mesh(arms[1].fore, (() => { const k = new Kit(), tmp = new THREE.Group(); for (const t of tubes) k.put(tmp, "e", cylG(0.32, 0.32, 0.12, 10), 0xffffff, t.x, t.y, t.z, XR, 0, 0); const r = k.build({ e: tubeMat }).get(tmp).e; r.removeFromParent(); return r.geometry; })(), tubeMat, 0, 0, 0);
  // 피해 균열 메시: 부위 → 노드들
  const crackOf = (nodes) => nodes.map((n) => built.get(n) && built.get(n).c).filter(Boolean);

  // 충돌 상자: 몸통·골반·다리 (도우미 물체가 보이는 동안만 유효)
  const hitT = grp(waist, 0, 4.6, 0), hitP = grp(pelvis), hitL = legs.map((l) => grp(l.th, 0, -5, 0));
  const colT = [...w.rider(hitT, [[0, 0, 0, 3.5 * S, 3.1 * S, 2.1 * S]], "enemy"), ...w.rider(hitP, [[0, 0, 0, 2.5 * S, 1.1 * S, 1.6 * S]], "enemy")];
  const colL = hitL.map((h) => w.rider(h, [[0, 0, 0, 1.0 * S, 5 * S, 1.2 * S]], "enemy"));

  const hp = (o.hp || 1) * S;
  const u = {
    group: g, parts: [], yaw: o.yaw ?? Math.random() * 6.28, home: p.clone(), roam: 50, range: 150 + 30 * S, stuck: 0, goalT: 0, wy: 0, hy: 0, hp: 0, ph: 0, stag: 0, kneel: 0, lean: 0, burst: 0, legsDown: 0,
    S, big, siege, team, friendly, atk: null, win: 0, open: 0, crouch: 0, stepK: 0, steam: 0, heat: 0, mats: { solid, eyeM, coreM, coilM, tubeM },
  };
  const ext = { score: friendly ? 0 : 3000, armor: 0.25, cutR: 34 * S, team };
  u.root = U.actor(u, o.name || "거대로봇", 3.6 * S, 900 * hp, ext);
  const pa = (name, r, h) => U.actor(u, name, r * S, h * hp, { score: friendly ? 0 : 200, team });
  const P = { head: pa("머리 센서", 2.3, 220), chest: pa("흉부 장갑", 2.5, 360), armL: pa("레이저 팔", 2.7, 280), armR: pa("미사일 팔", 2.7, 280), legL: pa("왼다리", 2.8, 320), legR: pa("오른다리", 2.8, 320) };
  u.parts.push(P.head, P.chest, P.armL, P.armR, P.legL, P.legR);
  U.own(colT, u.root); U.own(colL[0], P.legL); U.own(colL[1], P.legR);
  const CR = new Map([[P.head, crackOf([head])], [P.chest, crackOf(chest.map((q) => q.n))], [P.armL, crackOf([arms[0].sh, arms[0].fore])], [P.armR, crackOf([arms[1].sh, arms[1].fore])], [P.legL, crackOf([legs[0].th, legs[0].kn])], [P.legR, crackOf([legs[1].th, legs[1].kn])], [u.root, crackOf([waist, pelvis])]]);
  const partNode = new Map([[P.head, head], [P.chest, chestC], [P.armL, arms[0].fore], [P.armR, arms[1].fore], [P.legL, legs[0].kn], [P.legR, legs[1].kn], [u.root, hitT]]);
  // 움직이는 노드 목록 (mergeStatic 이 진영 장식 부품을 같은 노드끼리 합친다)
  g.userData.anim = [];
  const owned = [];
  for (const r of built.values()) for (const k in r) owned.push([r[k], r[k].material]);
  // 진영 외피(에일)가 재질을 복제해 바꿔 끼우면, 이 파일이 매 프레임 고치는 재질로 되돌린다
  u.relink = () => {
    for (const [me, mat] of owned) if (me.material !== mat) { if (mat === solid && me.material.color) solid.color.copy(me.material.color).lerp(new THREE.Color(0xc9a6ff), 0.35); me.material = mat; }
    eyeM.material = eyeMat; coreM.material = coreMat; coilM.material = coilMat; tubeM.material = tubeMat;
  };
  u.merge = () => {
    const L = []; g.traverse((q) => { if (!q.isMesh) L.push(q); else if (q.onBeforeRender !== THREE.Mesh.prototype.onBeforeRender) q.userData.keep = true; });
    g.userData.anim = L; mergeStatic(g);
  };

  // ── 행진 경로 ──
  if (o.march || o.target) {
    u.march = { pts: (o.march || []).map(toV), i: 0, target: o.target || null, eta: Infinity, progress: 0, remaining: 0, total: 0, reached: false, done: false, halted: false, text: "", said: 99, dmg: o.dmg, onReach: o.onReach || null, escort: siege ? o.escort ?? 170 : 0 };
    const m = u.march; let L = 0, prev = p;
    for (const q of m.pts) { L += Math.hypot(q.x - prev.x, q.z - prev.z); prev = q; }
    if (m.target) L += Math.hypot(m.target.pos.x - prev.x, m.target.pos.z - prev.z);
    m.total = Math.max(1, L);
  }
  u.root.march = u.march || null;

  // ── 도우미 ──
  const mz = new V3(), wp = new V3(), gp = new V3();
  const hostileCol = friendly ? 0x38b8ff : 0xff3030;
  const say = (txt, col = "#ffd24a", dur = 1.6, size = 22) => { if (c.s.hud && c.player && c.player.pos.distanceTo(u.root.pos) < 450) c.s.hud.toast(txt, col, dur, size); };
  const stagger = (k = 1) => { u.stag = Math.max(u.stag, k); c.snd.play("bigkill", c.volAt(u.root.pos) * 0.7, c.panAt(u.root.pos), 0.6); };
  const endAtk = () => {
    const a = u.atk; if (!a) return;
    if (a.disc) a.disc = FX.drop(a.disc);
    if (a.ring) a.ring = FX.drop(a.ring);
    if (a.beam) a.beam = FX.freeBeam(a.beam);
    u.atk = null;
  };
  const coolDown = () => (big ? 5 : 7.5) + Math.random() * 3 + (u.march && !u.march.reached && !u.march.done ? 3 : 0) - (u.march && u.march.reachT ? 3.5 : 0);
  const openWindow = (t) => { endAtk(); u.win = t; u.winSaid = false; u.cool.big = t + coolDown(); };   // 다음 큰 공격은 회복이 끝난 뒤 쉬었다가
  const broke = (part, fn) => {
    if (!part.alive && !part.gone) {
      part.gone = true; fn(); stagger(1);
      say(`${u.root.name} — ${part.name} 파괴!`, "#ffd24a", 1.6, 22);
      for (const m of CR.get(part) || []) m.visible = false;
      // 공격을 예고하던 무기를 부수면 공격이 끊기고 곧바로 약점이 드러난다
      if (u.atk && u.atk.ph === "tele" && ((part === P.armL && u.atk.kind === "sweep") || (part === P.armR && u.atk.kind === "salvo") || part === P.chest)) { openWindow(big ? 3.4 : 2.8); say("공격 저지! 코어 노출", "#35ff7a", 1.8, 24); }
    }
  };
  const groundAt = (v) => v.set(v.x, w.h(v.x, v.z), v.z);
  const heightAbove = (a) => a.pos.y - w.h(a.pos.x, a.pos.z);
  const mine = (a) => a && a.unit === u;
  // 사선이 열려 있는가: 내 몸체·표적 자신의 충돌체(포탑 받침·코어 기둥)는 가리지 않는다
  const clear = (from, t) => { const L = t.colliders || [t.collider, t.collider2], prev = []; for (const q of L) if (q) { prev.push(q.off); q.off = true; } try { return U.clear(from, t, u); } finally { let i = 0; for (const q of L) if (q) q.off = prev[i++]; } };
  // 플레이어가 이 기체를 노리고 있는가 (조준·락온)
  const threatened = () => c.player && c.player.alive && (mine(c.aim) || mine(c.lock));

  // 표적 고르기: 플레이어·드론·목표물(행진 목표·적 구조물) 사이에서 점수로
  u.pickTarget = () => {
    let best = null, bs = Infinity;
    const from = u.root.pos, obj = u.march && !u.march.done ? u.march.target : null;
    for (const a of c.actors) {
      if (!a.alive || !a.targetable || a.unit === u || !c.hostile(u.root, a)) continue;
      let d = a.pos.distanceTo(from);
      if (a === obj) d *= 0.7;
      else if (a.static) { if (a.unit && a.unit.root !== a) continue; d *= siege || friendly ? 0.6 : 1.8; if (a.kind === "prop" && !a.unit && !siege) continue; }
      if (a.isPlayer) d *= threatened() ? 0.45 : 0.85;
      if (d > u.range * (a === obj ? 2 : 1)) continue;
      if (d < bs) { bs = d; best = a; }
    }
    return best;
  };

  // ── 큰 공격 ──
  const SLAM_R = (big ? 30 : 22) * S, LOW = 9 * S;
  const choose = (t) => {
    const n = u.legsDown;
    _a.copy(t.pos).sub(u.root.pos); const dist = Math.hypot(_a.x, _a.z);
    const obj = u.march && u.march.target && u.march.target.alive && u.march.reachT;
    // 가까이·낮게 붙은 적이 있으면 땅 찍기
    let close = 0;
    for (const a of c.actors) if (a.alive && a.targetable && !a.static && c.hostile(u.root, a) && Math.hypot(a.pos.x - g.position.x, a.pos.z - g.position.z) < SLAM_R * 0.75 && heightAbove(a) < LOW * 1.3) close++;
    const opts = [];
    if (t.static && dist < SLAM_R * 0.8 && (siege || friendly)) close += 2;   // 공성 로봇: 가까운 적 구조물을 찍어 부순다
    if (obj || close) opts.push(["slam", obj ? 9 : 3 + close]);
    if (P.armL.alive && dist > 25 && dist < 300) opts.push(["sweep", 2.2]);
    if (P.armR.alive && dist > 45) opts.push(["salvo", t.static ? 1 : 2]);
    if (!opts.length && dist < SLAM_R * 1.2) opts.push(["slam", 1]);
    if (!opts.length) return null;
    let sum = 0; for (const q of opts) sum += q[1];
    let r = Math.random() * sum; for (const q of opts) if ((r -= q[1]) <= 0) return q[0];
    return opts[0][0];
  };
  const startAtk = (kind, t) => {
    const a = (u.atk = { kind, ph: "tele", t: 0, tgt: t, hit: new Set() });
    if (kind === "slam") {
      a.T = big ? 1.6 : 1.3;
      a.disc = FX.hold(true, hostileCol); a.ring = FX.hold(false, hostileCol);
      c.snd.play("rumble", c.volAt(g.position), c.panAt(g.position), 0.7);
      if (!friendly) say("⚠ 지면 충격파 — 높이 올라가세요!", "#ff8a5a", 1.4, 22);
    } else if (kind === "sweep") {
      a.T = big ? 1.4 : 1.2; a.span = big ? 1.5 : 1.2; a.dir = Math.random() < 0.5 ? -1 : 1;
      _a.copy(t.pos).sub(u.root.pos);
      a.center = clamp(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw), -1.3, 1.3);
      arms[0].sh.updateWorldMatrix(true, false); wp.setFromMatrixPosition(arms[0].sh.matrixWorld);
      a.pitch = clamp(Math.atan2(t.pos.y - wp.y, Math.hypot(t.pos.x - wp.x, t.pos.z - wp.z)), -0.9, 1.2);
      a.beam = FX.beam();
      c.snd.play("emp", c.volAt(g.position), c.panAt(g.position), 0.6);
      if (!friendly) say("⚠ 레이저 휩쓸기 충전!", "#ff5a7a", 1.3, 22);
    } else {
      a.T = big ? 1.7 : 1.4; a.n = big ? 12 : 6; a.fired = 0;
      a.beam = FX.beam();
      if (t.isPlayer) { say("⚠ 미사일 락온 — 피하세요!", "#ff3b3b", 1.5, 24); c.snd.play("alarm", 0.7); }
    }
  };
  // 부위·구조물에 피해 (행진 목표면 큰 피해)
  const smashTarget = (t, dmg) => { if (t && t.alive) { c.damage(t, dmg, u.root, t.pos); c.fx.explosion(t.pos, 2.5); } };
  const stepAtk = (dt) => {
    const a = u.atk, t = a.tgt && a.tgt.alive ? a.tgt : u.target;
    a.t += dt;
    const k = Math.min(1, a.t / a.T);
    if (a.kind === "slam") {
      gp.copy(g.position).setY(w.h(g.position.x, g.position.z) + 0.9);
      if (a.ph === "tele") {
        u.crouch = ease(k) * 1.8;
        for (const ar of arms) ar.want = 2.3;   // 두 팔을 머리 위로 치켜든다
        FX.set(a.disc, gp, SLAM_R * k, 0.06 + 0.12 * k);
        FX.set(a.ring, gp, SLAM_R, 0.3 + 0.4 * Math.abs(Math.sin(a.t * (6 + 10 * k))));
        if (Math.random() < dt * 8) c.fx.spark(_a.copy(gp).add(_b.set((Math.random() - 0.5) * 8 * S, 0, (Math.random() - 0.5) * 8 * S)), 0xffb04a, 4);
        if (k >= 1) {
          a.ph = "act"; a.t = 0; a.T = 1.15;
          a.disc = FX.drop(a.disc); a.ring = FX.drop(a.ring);
          FX.wave(gp, 2 * S, SLAM_R, 1.15, friendly ? 0x7fe0ff : 0xffa040, 1);
          FX.wave(gp, 1 * S, SLAM_R * 0.55, 0.7, 0xffffff, 0.6);
          FX.crack(gp, 14 * S, 14); for (let i = 0; i < 4; i++) FX.crack(_a.copy(gp).add(_b.set((Math.random() - 0.5) * 14 * S, 0, (Math.random() - 0.5) * 14 * S)), 7 * S, 11);
          U.boom(_a.copy(gp), 2.5 + S * 0.5);
          c.snd.play("farboom", c.volAt(gp) + 0.2, c.panAt(gp), 0.7);
          for (let i = 0; i < 14; i++) { const an = (i / 14) * 6.28; c.fx.smoke(_a.copy(gp).add(_b.set(Math.cos(an) * 7 * S, 0, Math.sin(an) * 7 * S)), 3 * S, 2.4, 0.42, 2 * S); }
          c.fx.debrisBurst(gp, 0x6a5a48, 18, 14 * Math.sqrt(S), 0.5 * S);
          FX.crush(gp, SLAM_R * 0.33, 20 * S, 22, (q, r, h) => rubble(q, r, h));
          // 행진 목표·근접 구조물: 찍기 한 번에 큰 피해
          if (u.march && u.march.reachT && u.march.target && u.march.target.alive) smashTarget(u.march.target, u.march.dmg ?? u.march.target.maxHp * 0.34);
          u.crouch = -0.6;
        }
      } else {
        u.crouch += (0 - u.crouch) * Math.min(1, dt * 3);
        const r = 2 * S + (SLAM_R - 2 * S) * ease(Math.min(1, a.t / 1.15)), band = 2.4 * S;
        for (const o2 of c.actors) {
          if (!o2.alive || a.hit.has(o2) || o2.unit === u || !c.hostile(u.root, o2)) continue;
          const d = Math.hypot(o2.pos.x - gp.x, o2.pos.z - gp.z);
          if (Math.abs(d - r) > band + o2.radius) continue;
          const st = o2.static;
          if (!st && heightAbove(o2) > LOW) continue;      // 높이 떠 있으면 피한다
          if (st && !(siege || friendly) && o2 !== (u.march && u.march.target)) continue;
          a.hit.add(o2);
          c.damage(o2, (st ? 70 : 24) * u.rk.dmg * (big ? 1.15 : 1), u.root, o2.pos);
          if (!st && o2.vel) { _a.set(o2.pos.x - gp.x, 0, o2.pos.z - gp.z).normalize(); o2.vel.addScaledVector(_a, 16); o2.vel.y += 9; }
          if (o2.isPlayer) c._blast(o2.pos, 2);
        }
        if (a.t >= a.T) openWindow(big ? 3.0 : 2.4);
      }
    } else if (a.kind === "sweep") {
      const ar = arms[0];
      ar.want = a.pitch;
      ar.fore.updateWorldMatrix(true, false);
      mz.set(0, -0.6, -8.8).applyMatrix4(ar.fore.matrixWorld);
      _d.set(0, 0, -1).transformDirection(ar.fore.matrixWorld);
      if (a.ph === "tele") {
        u.wyWant = a.center - a.dir * a.span / 2;
        coilMat.color.setRGB(1, 0.24, 0.4).multiplyScalar(1 + 3 * k * (0.7 + 0.3 * Math.sin(a.t * 40)));
        if (a.beam) {
          // 조준선: 지금 방향(깜박임) + 휩쓸고 갈 끝 방향(희미)
          FXs.stretch(a.beam.lineA, mz, _d, 300, 0.3 * S * (1 + k));
          a.beam.lineA.material.opacity = 0.4 + 0.5 * (Math.sin(a.t * (10 + 20 * k)) > 0 ? 1 : 0.2);
          const yawEnd = u.yaw + a.center + a.dir * a.span / 2;
          _e.set(-Math.sin(yawEnd) * Math.cos(a.pitch), Math.sin(a.pitch), -Math.cos(yawEnd) * Math.cos(a.pitch));
          FXs.stretch(a.beam.lineB, mz, _e, 300, 0.22 * S);
          a.beam.lineB.material.opacity = 0.25;
        }
        if (Math.random() < dt * 20) c.fx.puff(mz, 0xff4a7a, 0.6 * S, 0.3, 0.6);
        if (k >= 1) { a.ph = "act"; a.t = 0; a.T = big ? 2.3 : 1.9; a.tick = 0; c.snd.play("orbital", c.volAt(mz) + 0.15, c.panAt(mz), 0.8); if (a.beam) a.beam.lineB.visible = false; }
      } else {
        const kk = Math.min(1, a.t / a.T);
        u.wyWant = a.center - a.dir * a.span / 2 + a.dir * a.span * kk;
        u.wyFast = true;
        ar.spin += dt * 30;
        coilMat.color.setRGB(1, 0.5, 0.6).multiplyScalar(4);
        // 광선 길이: 지형·구조물에 막히는 곳까지
        if ((a.tick -= dt) <= 0) {
          a.tick = 0.1;
          let L = 320; w.col.skip = u;
          for (let s2 = 6; s2 < 320; s2 += 6) { _a.copy(mz).addScaledVector(_d, s2); const hc = w.col.hitBy(_a, 0); if (hc && !(hc.owner && hc.owner.unit === u)) { L = s2; break; } }
          w.col.skip = null; a.L = L;
          // 맞은 대상 (광선 선분 근처)
          for (const o2 of c.actors) {
            if (!o2.alive || !o2.targetable || o2.unit === u || !c.hostile(u.root, o2)) continue;
            _b.copy(o2.pos).sub(mz); const tt = clamp(_b.dot(_d), 0, L); _c.copy(mz).addScaledVector(_d, tt);
            if (_c.distanceTo(o2.pos) < 1.4 * S + o2.radius) c.damage(o2, 7 * u.rk.dmg * (big ? 1.15 : 1), u.root, _c);
          }
          if (L < 320) {   // 끝점: 불꽃·그을린 자국, 작은 소품은 녹아 무너진다
            _a.copy(mz).addScaledVector(_d, L);
            c.fx.explosion(_a, 0.8); c.fx.smoke(_a, 2 * S, 1.6, 0.15, 1.5);
            if (Math.random() < 0.35) FX.crack(_a, 4 * S, 7);
            if (Math.random() < 0.3) FX.crush(_a, 3 * S, 30, 14, (q, r, h) => rubble(q, r, h));
          }
        }
        if (a.beam) {
          const L = a.L || 320, fl = 1 + Math.sin(a.t * 60) * 0.12;
          FXs.stretch(a.beam.core, mz, _d, L, 0.55 * S * fl); FXs.stretch(a.beam.glow, mz, _d, L, 1.5 * S * fl);
          a.beam.core.material.color.set(0xffffff); a.beam.glow.material.color.set(friendly ? 0x3ab0ff : 0xff2a4a);
          a.beam.lineA.visible = false;
        }
        if (a.t >= a.T) { coilMat.color.set(0xff3d6a); openWindow(big ? 2.8 : 2.3); }
      }
    } else {   // 미사일 일제 사격
      const ar = arms[1];
      ar.fore.updateWorldMatrix(true, false);
      if (t) { wp.setFromMatrixPosition(ar.sh.matrixWorld); ar.want = clamp(Math.atan2(t.pos.y - wp.y, Math.hypot(t.pos.x - wp.x, t.pos.z - wp.z)), -1.0, 1.3) + 0.35; }
      if (a.ph === "tele") {
        const blink = Math.sin(a.t * (8 + 26 * k)) > 0;
        tubeMat.color.setRGB(1, 0.25, 0.2).multiplyScalar(blink ? 3.5 : 0.8);
        if (t && a.beam) { mz.set(0, -0.6, -4.2).applyMatrix4(ar.fore.matrixWorld); _d.copy(t.pos).sub(mz); const L = _d.length(); _d.multiplyScalar(1 / L); FXs.stretch(a.beam.lineA, mz, _d, Math.max(1, L - 14), 0.28 * S); a.beam.lineA.material.opacity = blink ? 0.75 : 0.25; }
        if (t && t.isPlayer) { c.warn = Math.max(c.warn || 0, 0.5); if (blink && !a.bl) c.snd.play("lockbeep", 0.6); }
        a.bl = blink;
        if (k >= 1) { a.ph = "act"; a.t = 0; a.T = a.n * 0.09 + 0.2; if (a.beam) a.beam = FX.freeBeam(a.beam); }
      } else {
        tubeMat.color.setRGB(1, 0.6, 0.3).multiplyScalar(3);
        while (a.fired < a.n && a.t >= a.fired * 0.09) {
          const tb = tubes[a.fired % tubes.length];
          mz.copy(tb).applyMatrix4(ar.fore.matrixWorld);
          if (t) { c._lead(mz, t, 62, _a); _a.x += (Math.random() - 0.5) * 12; _a.y += (Math.random() - 0.5) * 6; _a.z += (Math.random() - 0.5) * 12; _d.copy(_a).sub(mz).normalize(); }
          else _d.set(0, 0, -1).transformDirection(ar.fore.matrixWorld);
          if (!u.cut) c.fireMissile(u.root, mz, _d, null, 20 * u.rk.dmg);   // 비유도: 쏜 순간의 예측 지점으로 곧게
          if (t && t.isPlayer) c.warn = Math.max(c.warn || 0, 1.2);
          c.fx.smoke(mz, 1.2 * S, 1.2, 0.5, 1);
          a.fired++;
        }
        if (a.t >= a.T) { tubeMat.color.set(0xff4a3a); openWindow(big ? 2.6 : 2.2); }
      }
    }
  };
  // 무너진 소품: 먼지·잔해·소리
  const rubble = (q, r, h) => {
    c.fx.debrisBurst(q, 0x7a7266, Math.min(16, 5 + Math.round(h)), 8 + h * 0.4, 0.35 + Math.min(1, r * 0.12));
    for (let i = 0; i < 3; i++) c.fx.smoke(_e.copy(q).add(_b.set((Math.random() - 0.5) * r * 2, -h * 0.3, (Math.random() - 0.5) * r * 2)), 2 + r * 0.6, 2.6, 0.55, r);
    c.snd.play("explode", c.volAt(q) * 0.5, c.panAt(q), 0.55);
    FX.crack(q, 3 + r * 1.5, 12);
  };

  // ── 이동 ──
  const speed0 = (o.speed || 1) * (2 + 1.0 * S);
  const fwd = (out) => out.set(-Math.sin(u.yaw), 0, -Math.cos(u.yaw));
  // 한 걸음: 목표 방향으로 몸을 돌리고 전진. 거대한 기체는 앞의 소품을 짓밟고, 너무 큰 것·가파른 곳에서는 막힌다
  const stride = (dt, goal, spd, rate) => {
    const want = Math.atan2(-(goal.x - g.position.x), -(goal.z - g.position.z));
    u.yaw = turn(u.yaw, want, rate * dt); g.rotation.y = u.yaw;
    if (spd <= 0 || Math.abs(wrap(want - u.yaw)) > 0.7) return 0;
    fwd(_a);
    const nx = g.position.x + _a.x * spd * dt, nz = g.position.z + _a.z * spd * dt, gy = w.h(nx, nz);
    if (S >= 1.6 || u.march) {
      if ((u.crushT = (u.crushT || 0) - dt) <= 0) { u.crushT = 0.25; u.blockAhead = FX.crush(_b.set(g.position.x + _a.x * 5 * S, g.position.y, g.position.z + _a.z * 5 * S), 6 * S, 18 * S, 12 + 6 * S, (q, r, h) => rubble(q, r, h)); }
      if (u.blockAhead && !u.march) { u.stuck += dt; return 0; }
    } else {
      _b.set(nx + _a.x * 7 * S, gy + 6.3 * S + 1, nz + _a.z * 7 * S);
      if (w.col.blocked(_b, 3.1 * S)) { u.stuck += dt; return 0; }
    }
    if (gy - g.position.y > spd * dt * 1.6 + 0.3) { u.stuck += dt; return 0; }   // 너무 가파른 오르막
    g.position.set(nx, gy, nz); u.stuck = Math.max(0, u.stuck - dt * 0.5);
    return spd;
  };
  const roam = (dt, spd) => {
    if (!u.goal || Math.hypot(u.goal.x - g.position.x, u.goal.z - g.position.z) < 12 * S || u.stuck > 1.8 || (u.goalT -= dt) < 0) {
      const t = u.target, h = u.home, a = Math.random() * 6.283, r = 10 + Math.random() * u.roam;
      const cx = t && Math.random() < 0.6 ? (t.pos.x + h.x) / 2 : h.x, cz = t && Math.random() < 0.6 ? (t.pos.z + h.z) / 2 : h.z;
      u.goal = new V3(clamp(cx + Math.cos(a) * r, -w.size + 15, w.size - 15), 0, clamp(cz + Math.sin(a) * r, -w.size + 15, w.size - 15));
      u.stuck = 0; u.goalT = 14;
    }
    return stride(dt, u.goal, spd, u.legsDown === 2 ? 0.25 : 0.5);
  };
  const marchStep = (dt, spd) => {
    const m = u.march, t = m.target;
    // 남은 거리 · 도달 예상 시간
    let rem = 0, prev = g.position;
    for (let i = m.i; i < m.pts.length; i++) { rem += Math.hypot(m.pts[i].x - prev.x, m.pts[i].z - prev.z); prev = m.pts[i]; }
    if (t && t.alive) rem += Math.max(0, Math.hypot(t.pos.x - prev.x, t.pos.z - prev.z) - (12 * S + t.radius));
    m.remaining = rem; m.progress = clamp(1 - rem / m.total, 0, 1);
    const eff = speed0 * (u.legsDown === 0 ? 1 : u.legsDown === 1 ? 0.33 : 0) * 0.65;   // 큰 공격으로 멈추는 시간을 감안
    m.eta = m.done || m.reached ? 0 : eff > 0 ? rem / eff : Infinity;
    m.text = m.reached ? (t && t.alive ? "로봇이 목표를 공격 중!" : "로봇 목표 도달") : u.legsDown === 2 ? "로봇 정지 (양다리 파괴)" : m.halted ? "호위 대기 — 로봇 곁으로 오세요" : `로봇 도달까지 ${Math.ceil(m.eta)}초`;
    // 남은 시간 알림 (60·30·10초)
    if (!m.reached && isFinite(m.eta) && t && c.player && c.hostile(t, u.root) === true) {
      for (const s2 of [60, 30, 10]) if (m.eta <= s2 && m.said > s2 && c.s.hud) { m.said = s2; c.s.hud.feed(`${u.root.name}: ${m.text}`, friendly ? "#7fe6ff" : "#ff8a8a"); }
    }
    if (m.done) return roam(dt, spd);
    // 아군 공성 로봇: 플레이어가 곁에 있어야 전진
    m.halted = !!(m.escort && c.player && c.player.alive && c.player.pos.distanceTo(u.root.pos) > m.escort);
    if (m.halted) return 0;
    if (m.reached) {
      if (!t || !t.alive) { m.done = true; m.reachT = false; u.home.copy(g.position); return 0; }
      return stride(dt, t.pos, 0, 0.5);   // 목표를 마주 본다
    }
    let goal = m.detour || (m.i < m.pts.length ? m.pts[m.i] : t && t.alive ? t.pos : null);
    if (!goal) { m.done = true; u.home.copy(g.position); return 0; }
    const dg = Math.hypot(goal.x - g.position.x, goal.z - g.position.z);
    if (m.detour && dg < 8 * S) m.detour = null;
    else if (!m.detour && m.i < m.pts.length && dg < 7 * S) m.i++;
    else if (!m.detour && m.i >= m.pts.length && t && dg < 12 * S + t.radius) {
      m.reached = m.reachT = true;
      say(friendly ? `${u.root.name} 목표 도달 — 공격 개시!` : `⚠ ${u.root.name}이(가) 목표에 도달했다!`, friendly ? "#35ff7a" : "#ff4a5a", 2.4, 26);
      if (m.onReach) m.onReach(u.root, t);
      u.cool.big = 0.5;
      return 0;
    }
    const v = stride(dt, goal, spd, 0.5);
    // 너무 큰 것에 막혔으면 옆으로 돌아간다
    if (u.blockAhead && u.stuck > 1.2 && !m.detour) {
      const side = (u.side = -(u.side || 1)); fwd(_a);
      m.detour = new V3(g.position.x - _a.z * side * 26 * S + _a.x * 10 * S, 0, g.position.z + _a.x * side * 26 * S + _a.z * 10 * S);
      u.stuck = 0;
    }
    if (u.stuck > 6) { fwd(_a); g.position.x += _a.x * 4 * S; g.position.z += _a.z * 4 * S; g.position.y = w.h(g.position.x, g.position.z); u.stuck = 0; m.detour = null; }   // 마지막 수단: 밀고 나간다
    return v;
  };

  // 유압 실린더: 두 노드 사이를 잇도록 통·막대를 돌린다
  const link = (pa2, pb2) => {
    pa2.parent.updateWorldMatrix(true, false); pb2.parent.updateWorldMatrix(true, false);
    _a.copy(pb2.position).applyMatrix4(pb2.parent.matrixWorld).applyMatrix4(_mi.copy(pa2.parent.matrixWorld).invert()).sub(pa2.position);   // b 위치(a 부모 기준)
    if (_a.lengthSq() > 1e-6) pa2.quaternion.setFromUnitVectors(_c.set(0, -1, 0), _a.normalize());
    _b.copy(pa2.position).applyMatrix4(pa2.parent.matrixWorld).applyMatrix4(_mi.copy(pb2.parent.matrixWorld).invert()).sub(pb2.position);
    if (_b.lengthSq() > 1e-6) pb2.quaternion.setFromUnitVectors(_c.set(0, -1, 0), _b.normalize());
  };

  u.update = (dt) => {
    // 부위 파괴 → 동작 변화
    broke(P.head, () => { U.chunk(head, new V3((Math.random() - 0.5) * 6, 12, 6)); });
    broke(P.chest, () => { for (const q of chest) U.chunk(q.n, new V3(q.sx * 7, 5, -6), 2); U.boom(_a.setFromMatrixPosition(chestC.matrixWorld), 1.8); say("흉갑 파괴 — 코어가 드러났다!", "#35ff7a", 2.2, 24); });
    arms.forEach((a, i) => broke(i ? P.armR : P.armL, () => { if (!a.pdGone) { a.pdGone = true; U.chunk(a.pd, new V3(a.sx * 6, 8, 2), 2); } U.chunk(a.fore, new V3(a.sx * 7, 5, (Math.random() - 0.5) * 5), 2.5); }));
    legs.forEach((l, i) => broke(i ? P.legR : P.legL, () => { l.down = true; u.legsDown++; if (!l.tpGone) { l.tpGone = true; U.chunk(l.tp, new V3(l.sx * 4, 6, -4), 2); } U.chunk(l.kn, new V3(l.sx * 4, 3, 3), 1.5); U.boom(_a.setFromMatrixPosition(l.kn.matrixWorld), 1.5); }));
    // 피해 상태: 금이 빛나고(55% 아래), 판이 떨어져 나가고(45%), 불꽃·연기(30%)
    const tm = u.t;
    for (const [part, ms] of CR) {
      if (!part.alive) continue;
      const f = part.hp / part.maxHp;
      for (const m of ms) m.visible = f < 0.55;
      if (f < 0.3 && Math.random() < dt * 4) { const n = partNode.get(part); n.updateWorldMatrix(true, false); _a.setFromMatrixPosition(n.matrixWorld); c.fx.spark(_a, 0xffc060, 5); if (Math.random() < 0.5) c.fx.smoke(_a, 1.2 * S, 1.6, 0.1, 1); }
    }
    CRACK.color.setRGB(1, 0.48, 0.12).multiplyScalar(1.6 + 1.2 * Math.max(0, Math.sin(tm * 6)));
    arms.forEach((a, i) => { const pr = i ? P.armR : P.armL; if (!a.pdGone && pr.hp < pr.maxHp * 0.45) { a.pdGone = true; U.chunk(a.pd, new V3(a.sx * 6, 8, 2), 2); c.fx.spark(_a.setFromMatrixPosition(a.sh.matrixWorld), 0xffd27a, 14); } });
    legs.forEach((l, i) => { const pr = i ? P.legR : P.legL; if (!l.tpGone && pr.hp < pr.maxHp * 0.45) { l.tpGone = true; U.chunk(l.tp, new V3(l.sx * 3, 5, -6), 2); c.fx.spark(_a.setFromMatrixPosition(l.th.matrixWorld), 0xffd27a, 14); } });
    const rf = u.root.hp / u.root.maxHp;
    solid.emissive.setRGB(0.5, 0.12, 0.03).multiplyScalar(rf < 0.4 ? (0.4 - rf) * (0.8 + 0.4 * Math.sin(tm * 5)) : 0);

    // ── 표적 · 큰 공격 ──
    if (u.cool.big === undefined) u.cool.big = 3 + Math.random() * 2;   // 등장 직후 잠깐은 큰 공격을 하지 않는다
    const t = u.target;
    const busy = !!u.atk || u.win > 0;
    if (!u.cut) {
      if (u.atk) stepAtk(dt);
      else if (u.win > 0) u.win -= dt;
      else if (!(u.cool.big > 0) && u.stag < 0.25 && (t || (u.march && u.march.reachT))) {
        const tt = u.march && u.march.reachT && u.march.target && u.march.target.alive ? u.march.target : t;   // 목표에 닿았으면 목표부터 부순다
        const k = tt && choose(tt);
        if (k) startAtk(k, tt);
        u.cool.big = 99;   // 공격이 끝나면(openWindow) 다시 정한다
      }
    } else if (u.atk) endAtk();
    // 회복 구간: 흉갑이 열리고 코어가 드러난다
    const winOn = u.win > 0;
    u.open += ((winOn ? 1 : 0) - u.open) * Math.min(1, dt * (winOn ? 5 : 3));
    for (const q of chest) { q.n.position.x = q.x0 + q.sx * 1.2 * u.open; q.n.position.z = -2.6 - 0.5 * u.open; q.n.rotation.y = q.sx * 0.75 * u.open; }
    P.chest.targetable = P.chest.alive && u.open < 0.4;
    u.root.armor = winOn ? 1.75 : P.chest.alive ? 0.25 : 1;
    if (winOn && !u.winSaid && !friendly) { u.winSaid = true; say("코어 노출! 지금 공격하세요", "#35ff7a", 1.8, 24); c.snd.play("door", c.volAt(g.position), c.panAt(g.position), 0.6); }
    const coreK = winOn ? 3.2 + Math.sin(tm * 14) * 1.2 : P.chest.alive ? 0.9 : 1.6 + Math.sin(tm * 8) * 0.6;
    coreMat.color.setRGB(1, 0.69, 0.18).multiplyScalar(coreK);
    if (winOn && Math.random() < dt * 10) { waist.updateWorldMatrix(true, false); for (const sx of [-1, 1]) c.fx.smoke(_a.set(sx * 1.6, 10.4, 3.6).applyMatrix4(waist.matrixWorld), 1.2 * S, 1.8, 0.78, 0.8 * S); }

    // ── 이동 ──
    const n = u.legsDown, spd = n === 0 ? speed0 : n === 1 ? speed0 * 0.33 : 0;
    const v = busy || u.cut ? stride(dt, t ? t.pos : _a.copy(g.position).add(fwd(_b)), 0, 0.3) * 0 : u.march ? marchStep(dt, spd) : roam(dt, spd);
    if (u.march && busy) marchStep(0, 0);   // 예상 시간만 갱신
    // 걷기: 다리를 번갈아 내딛고 골반이 출렁인다. 발 디딜 때 땅이 울리고 먼지·균열
    const pph = u.ph, moving = v > 0 ? 1 : 0;
    u.stepK += ((moving) - u.stepK) * Math.min(1, dt * 4);
    u.ph += dt * (moving ? (n ? 1.1 : 1.55) * Math.sqrt(speed0 / (2 + S)) : 0);
    if (moving && Math.floor((u.ph - Math.PI / 2) / Math.PI) !== Math.floor((pph - Math.PI / 2) / Math.PI)) {
      const li = ((Math.floor((u.ph - Math.PI / 2) / Math.PI) % 2) + 2) % 2, l = legs[li];
      if (!l.down) {
        l.ft.updateWorldMatrix(true, false); _a.set(0, -1, -0.5).applyMatrix4(l.ft.matrixWorld); groundAt(_a);
        c._blast(_a, 0.5 + 0.35 * S); c.snd.play("explode", c.volAt(_a) * 0.4, c.panAt(_a), 0.45);
        for (let i = 0; i < 3; i++) c.fx.smoke(_e.copy(_a).add(_b.set((Math.random() - 0.5) * 4 * S, 0.5, (Math.random() - 0.5) * 4 * S)), 1.6 * S, 1.8, 0.4, 1.6 * S);
        if (S >= 1.4) FX.crack(_a, 4.5 * S, 8);
      }
    }
    legs.forEach((l, i) => {
      const ph = u.ph + i * Math.PI, A = 0.36 * u.stepK;
      let th = Math.sin(ph) * A, kn = -Math.max(0, Math.cos(ph)) * 0.85 * u.stepK;
      if (n === 1 && !l.down) { th = 0.8; kn = -1.9; }       // 한쪽이 부서지면 남은 다리로 무릎을 꿇는다
      if (l.down) th = n === 2 ? 0.68 : 0.05;
      // 땅 찍기 예고: 무릎을 굽혀 웅크린다
      th += u.crouch * 0.12; kn -= u.crouch * 0.24;
      l.th.rotation.x += (th - l.th.rotation.x) * Math.min(1, dt * 6);
      l.kn.rotation.x += (kn - l.kn.rotation.x) * Math.min(1, dt * 6);
      l.ft.rotation.x = -(l.th.rotation.x + l.kn.rotation.x);
      if (l.down && Math.random() < dt * 5) c.fx.smoke(_a.setFromMatrixPosition(l.th.matrixWorld).add(_b.set(0, -5 * S, 0)), 1, 1.4, 0.1, 0.6);
    });
    u.kneel += ((n === 0 ? 0 : n === 1 ? 3.6 : 6.4) - u.kneel) * Math.min(1, dt * 1.6);
    const side = n === 1 ? (legs[0].down ? 1 : -1) : 0;
    u.lean += (side * 0.2 - u.lean) * Math.min(1, dt * 1.6);
    u.stag = Math.max(0, u.stag - dt * 0.9);
    const sg = Math.sin(u.stag * Math.PI) * 0.35;
    pelvis.position.y = HIP - u.kneel - u.crouch * 0.9 + Math.abs(Math.sin(u.ph)) * 0.35 * u.stepK + (u.stag > 0 ? Math.sin(tm * 40) * 0.12 * u.stag : 0);
    pelvis.rotation.z = u.lean + Math.sin(u.ph) * 0.03 * u.stepK; pelvis.rotation.x = n === 2 ? 0.12 : 0;
    // ── 몸통·머리·팔 조준 ──
    g.updateWorldMatrix(true, true);
    u.root.pos.setFromMatrixPosition(hitT.matrixWorld);
    let rel = u.wy;
    if (t) { _a.copy(t.pos).sub(u.root.pos); rel = clamp(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw), -1.4, 1.4); }
    const want = u.wyWant !== undefined && u.atk ? u.wyWant : rel;
    u.wy = turn(u.wy, want, (u.wyFast ? 1.4 : big ? 0.75 : 1.1) * dt * (u.stag > 0.25 ? 0.3 : 1));
    u.wyFast = false; if (!u.atk) u.wyWant = undefined;
    waist.rotation.set(-sg + (n === 2 ? 0.1 : 0) + u.crouch * 0.08, u.wy, Math.sin(tm * 0.7) * 0.015);
    if (P.head.alive) {
      let hy = 0, hpch = 0;
      if (t) { head.updateWorldMatrix(true, false); wp.setFromMatrixPosition(head.matrixWorld); hy = clamp(wrap(rel - u.wy), -0.6, 0.6); hpch = clamp(Math.atan2(t.pos.y - wp.y, Math.hypot(t.pos.x - wp.x, t.pos.z - wp.z)), -0.35, 0.45); }
      else hy = Math.sin(tm * 0.6) * 0.5;   // 표적이 없으면 두리번거린다
      u.hy += (hy - u.hy) * Math.min(1, dt * 3); u.hp += (hpch - u.hp) * Math.min(1, dt * 3);
      head.rotation.set(u.hp, u.hy, 0);
      const ek = u.atk && u.atk.ph === "tele" ? 2.6 + Math.sin(tm * 30) * 1.6 : 2.2 + Math.sin(tm * 3) * 0.3;
      eyeMat.color.set(TC).multiplyScalar(ek);
    }
    // 팔을 목표 높이로 든다 (큰 공격 중이면 그 자세)
    arms.forEach((a, i) => {
      if (!(i ? P.armR : P.armL).alive) return;
      let want2 = a.want;
      if (want2 === undefined) { want2 = -0.15; if (t) { wp.setFromMatrixPosition(a.sh.matrixWorld); want2 = clamp(Math.atan2(t.pos.y - wp.y, Math.hypot(t.pos.x - wp.x, t.pos.z - wp.z)), -1.0, 1.3); } }
      a.pitch += clamp(want2 - a.pitch, -1.6 * dt, 1.6 * dt) * (u.atk ? 1.6 : 1); a.sh.rotation.x = a.pitch; a.sh.rotation.z = a.sx * (0.08 + 0.04 * Math.sin(u.ph));
      a.want = undefined;
      if (a.gun) { a.spin *= Math.pow(0.2, dt); a.gun.rotation.z += a.spin * dt; }
    });
    for (const l of legs) if (!l.down) link(l.pa, l.pb);
    g.updateWorldMatrix(true, true);
    // 부위 위치 갱신
    if (P.head.alive) P.head.pos.setFromMatrixPosition(head.matrixWorld);
    if (P.chest.alive) P.chest.pos.setFromMatrixPosition(chestC.matrixWorld);
    arms.forEach((a, i) => { const pa2 = i ? P.armR : P.armL; if (pa2.alive) pa2.pos.setFromMatrixPosition(a.fore.matrixWorld); else if (Math.random() < dt * 5) { c.fx.smoke(_b.setFromMatrixPosition(a.sh.matrixWorld).add(_c.set(0, -4 * S, 0)), 1.1, 1.4, 0.1, 0.5); if (Math.random() < 0.25) c.fx.spark(_b, 0x9fe7ff, 6); } });
    legs.forEach((l, i) => { const pl = i ? P.legR : P.legL; if (pl.alive) pl.pos.setFromMatrixPosition(l.kn.matrixWorld); });
    if (!P.head.alive && Math.random() < dt * 4) c.fx.smoke(_b.setFromMatrixPosition(waist.matrixWorld).add(_c.set(0, 8.5 * S, 0)), 1.2, 1.6, 0.1, 0.5);
    // 배기: 걸을 때 등 굴뚝에서 연기, 가끔 옆구리 환기구에서 증기
    if ((u.steam -= dt) <= 0) {
      u.steam = moving ? 0.25 : 0.7;
      for (const sx of [-1, 1]) c.fx.smoke(_a.set(sx * 1.6, 10.4, 3.6).applyMatrix4(waist.matrixWorld), 0.9 * S, 1.8, 0.2, 0.5 * S);
      if (Math.random() < 0.15) { const sx = Math.random() < 0.5 ? -1 : 1; for (let i = 0; i < 4; i++) c.fx.smoke(_a.set(sx * 3.1, 2.4, 2.2).applyMatrix4(waist.matrixWorld), 0.8 * S, 1.2, 0.8, 0.8 * S); }
    }
    if (!t || u.stag > 0.25 || busy || u.cut) return;
    // ── 평소 무기 ──
    _a.copy(t.pos).sub(u.root.pos);
    const dist = _a.length(), spread = P.head.alive ? 0.04 : 0.11;   // 머리(센서)를 잃으면 조준이 흐트러진다
    const aligned = Math.abs(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw - u.wy)) < 0.2;
    if (!aligned) return;
    // 왼팔 레이저 포: 8연사 (포신이 돈다)
    if (P.armL.alive && !(u.cool.las > 0)) {
      if (u.burst <= 0) u.burst = 8;
      mz.set(0, -0.6, -8.8).applyMatrix4(arms[0].fore.matrixWorld);
      if (clear(mz, t)) { U.laser(u, mz, U.aim(mz, t, 105, spread, _b, u), 6, friendly ? 0x5ab4ff : 0xff3d6a, 105); u.burst--; arms[0].spin = 14; u.cool.las = u.burst > 0 ? 0.11 : 3.2; } else { u.burst = 0; u.cool.las = 0.7; }
    }
    // 오른팔 미사일: 3발 (비유도, 예측 지점으로)
    if (P.armR.alive && dist > 25 && !(u.cool.msl > 0)) {
      u.cool.msl = 7;
      for (let k = 0; k < 3; k++) {
        mz.copy(tubes[k * 2]).applyMatrix4(arms[1].fore.matrixWorld);
        c._lead(mz, t, 62, _c); _c.x += (k - 1) * 3; _d.copy(_c).sub(mz).normalize();
        if (!u.cut) c.fireMissile(u.root, mz, _d, null, 26 * u.rk.dmg);
      }
      if (t.isPlayer) c.warn = Math.max(c.warn || 0, 1.2);
    }
    // 머리 센서 광선: 강한 한 발
    if (P.head.alive && !(u.cool.eye > 0)) { u.cool.eye = 4.2; mz.set(0, 0.2, -1.6).applyMatrix4(head.matrixWorld); if (clear(mz, t)) U.laser(u, mz, U.aim(mz, t, 120, 0.03, _b, u), 16, friendly ? 0x7fe6ff : 0x5ad8ff, 120); }
  };
  // 모드·연출용: 큰 공격을 바로 시작 (kind: slam | sweep | salvo)
  u.force = (kind, t = u.target) => { if (!u.root.alive) return false; endAtk(); u.win = 0; if (kind === "sweep" && !P.armL.alive || kind === "salvo" && !P.armR.alive) return false; startAtk(kind, t || c.player); return true; };
  u.onDeath = () => { endAtk(); u.win = 0; stagger(1); u.fall = 0; };
  u.dying = (dt) => {   // 연쇄 폭발 → 무릎이 꺾이며 앞으로 쓰러진다
    if (u.deadT < 2.6) {
      waist.rotation.x = -0.25 + Math.sin(u.t * 30) * 0.03; pelvis.position.y += Math.sin(u.t * 45) * 0.05;
      coreMat.color.setRGB(1, 0.7, 0.3).multiplyScalar(2 + Math.random() * 3);
      if (Math.random() < dt * 7) { _a.set((Math.random() - 0.5) * 7, 2 + Math.random() * 8, (Math.random() - 0.5) * 4).applyMatrix4(waist.matrixWorld); c.fx.explosion(_a, 1.3); c.snd.play("explode", c.volAt(_a) * 0.5, c.panAt(_a)); }
      return;
    }
    if (u.fall < 1) {
      u.fall = Math.min(1, u.fall + dt / 1.7); const e = u.fall * u.fall;
      g.rotation.x = -1.45 * e; pelvis.position.y = HIP - u.kneel - 4 * e;
      for (const l of legs) { l.th.rotation.x = 1.0 * e + (l.down ? 0.68 : 0) * (1 - e); l.kn.rotation.x = -1.4 * e; }
      if (u.fall >= 1) { coreMat.color.setRGB(0.15, 0.1, 0.05); eyeMat.color.setRGB(0.05, 0.05, 0.05); _a.set(0, 2, -14 * S).applyQuaternion(g.quaternion).add(g.position); U.boom(_a, 5); FX.crack(groundAt(_a), 18 * S, 20); for (const h of [hitT, hitP, ...hitL]) h.visible = false; c.s.feel.emit("blast", 1, _a); }
      return;
    }
    if (u.deadT < 20 && Math.random() < dt * 6) { _a.set((Math.random() - 0.5) * 8, 2, -4 - Math.random() * 14).multiplyScalar(S).applyQuaternion(g.quaternion).add(g.position); c.fx.smoke(_a, 2, 2.6, 0.1, 1.5); }
  };
  return u;
}
const FXs = TitanFX;
