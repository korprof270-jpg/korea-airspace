// 제국 궤도 발사기지 제작 도구: 배치 좌표 · 해안 높이 함수(안벽·부두·방파제·해상 플랫폼·화염 도랑) · 지면 색 · 공용 부품
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, mat, ring, octa, ball, lattice, Blinkers, lane, V3, arch, ringGate, monolith, BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, EMB, HAZ } from "./empire-kit.js";

export { THREE, M, beam, prop, merged, mat, ring, octa, ball, lattice, Blinkers, lane, V3, arch, ringGate, monolith, BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, EMB, HAZ };

export const DEG = Math.PI / 180;
// 낮의 제국 기지 색: 콘크리트 · 아스팔트 · 모래 · 흰 증기 · 선체 회색
export const CONC = 0xa3a49f, CONC2 = 0x8c8e8b, CONC3 = 0x6f7275, ASPH = 0x44474c, ASPH2 = 0x36393e, SAND = 0xd2c193, SAND2 = 0xb9a877;
export const WHT = 0xe6e8ea, HULL = 0x2a2d34, HULL2 = 0x383c45, DECK = 0x4a4e57, VAP = 0xf4f6f8, SEAB = 0x2c4d57;

// ── 배치 (x 동 · z 남) ──
export const WY = -2.6, SEA = -9;                         // 수면 · 바다 바닥
export const ELEV = [20, -45];                            // 궤도 엘리베이터 축
export const DRUM_R = 36, WELL_R = 13, RING_R = 52;       // 닻 기단 반경 · 가운데 우물 · 바깥 성곽
export const TUN = { hw: 8, h: 12 };                      // 기단을 십자로 꿰는 터널(반폭 · 높이)
export const SHAFT = { half: 11, y0: 34, lh: 22, levels: 10 };   // 격자 축(반변 · 시작 높이 · 층 높이 · 층 수)
// 발사대 [x, z, 탑 방향 각(도, 0 = +x 로 탑이 선다), 종류]
export const PADS = [
  { x: -190, z: -70, ta: 180, kind: "rocket", name: "1번 발사대" },
  { x: -135, z: -150, ta: 233, kind: "shuttle", name: "2번(중앙) 발사대" },
  { x: -40, z: -180, ta: 270, kind: "empty", name: "3번 발사대" },
];
export const PAD_R = 26, TOWER_OFF = 22, TRENCH = { hw: 9, hl: 44, d: 2.3 };
export const HANGARS = [[-105, -15], [-65, -15]], HG = { w: 34, d: 34, h: 15 };   // 격납고(남북으로 뚫림)
export const QUAY_Z = 78;                                 // 남쪽 안벽
export const PIERS = [{ x: -100, z0: 76, z1: 188, hw: 8 }, { x: -10, z0: 76, z1: 188, hw: 8 }];
export const SHIPS = [                                    // 정박한 전함 [x, z0(함수·북), z1(함미·남), 폭]
  { x: -73, z0: 88, z1: 196, bw: 18, name: "순양함 가르메트" },
  { x: -37, z0: 88, z1: 196, bw: 18, name: "순양함 벨로크" },
  { x: 17, z0: 84, z1: 202, bw: 20, name: "전함 오르도" },
];
export const MOLE = [[92, 84], [165, 130], [165, 214]], MOLE_R = 15;       // 방파제 중심선
export const BASTION = [170, 132, 34], TIP = [165, 214, 14];               // 포대 보루 · 끝단(관제 첨탑)
export const PLATS = [[185, 30, 30], [205, -52, 21]];                      // 해상 플랫폼 [x, z, 반경]
export const CAUSE = { z: 30, x0: 100, x1: 158, y: 8, w: 9 };             // 둑길 다리(뭍 → 1번 플랫폼)
export const CAUSE2 = { a: [192, 2], b: [201, -32], y: 8, w: 7 };         // 플랫폼 사이 다리
export const TANKS = [[85, -128], [113, -128], [141, -128], [85, -100], [113, -100], [141, -100]], TANK_R = 10;
export const RADARS = [[40, -190], [72, -168], [92, -200]];
export const HQ = [[124, -58, 13, 74], [132, -82, 12, 56], [116, -42, 10, 44]];                   // 함대 사령부 모노리스

export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// ── 해안선: 남쪽 안벽(서쪽은 모래 해변으로 풀린다)과 동쪽 해안(북쪽은 자연 해안) ──
export const southZ = (x) => QUAY_Z + 22 * sm(-130, -235, x) + 5 * Math.sin(x * 0.05) * sm(-140, -175, x);
export const eastX = (z) => 125 - 0.55 * z + 7 * Math.sin(z * 0.045) * sm(-40, -75, z);
// 뭍 안쪽으로 들어간 거리(+), 바다 쪽(−)
export function coast(x, z) { return Math.min(southZ(x) - z, (eastX(z) - x) * 0.876); }
const hardK = (x, z) => (southZ(x) - z < (eastX(z) - x) * 0.876 ? sm(-150, -128, x) : sm(-42, -14, z));
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
// 인공 지반(부두·방파제·플랫폼) 안쪽 거리
export function madeD(x, z) {
  let d = -1e9;
  for (const p of PIERS) d = Math.max(d, Math.min(p.hw - Math.abs(x - p.x), z - p.z0, p.z1 - z));
  if (x > 60) {
    d = Math.max(d, MOLE_R - segD(x, z, MOLE[0], MOLE[1]), MOLE_R - segD(x, z, MOLE[1], MOLE[2]));
    d = Math.max(d, BASTION[2] - Math.hypot(x - BASTION[0], z - BASTION[1]), TIP[2] - Math.hypot(x - TIP[0], z - TIP[1]));
    for (const [px, pz, R] of PLATS) d = Math.max(d, R - Math.hypot(x - px, z - pz));
  }
  return d;
}
// 발사대 화염 도랑: 탑 방향과 직각으로 발사대 밑을 지난다 → 깊이(+)
export function trenchD(x, z) {
  for (const p of PADS) {
    const dx = x - p.x, dz = z - p.z;
    if (Math.abs(dx) > 60 || Math.abs(dz) > 60) continue;
    const c = Math.cos(p.ta * DEG), s = Math.sin(p.ta * DEG), u = dx * c + dz * s, v = -dx * s + dz * c;   // u: 탑 쪽, v: 도랑 방향
    const k = Math.min((TRENCH.hw - Math.abs(u)) / 3.5, (TRENCH.hl - Math.abs(v)) / 12);
    if (k > 0) return TRENCH.d * sm(0, 1, k);
  }
  return 0;
}
const EDGE = -3.4;   // 안벽은 기준선보다 이만큼 바깥까지 평평하다(경사면은 안벽 상자 뒤에 숨는다)
export function height(x, z) {
  const d = coast(x, z);
  let h;
  if (d > 60) h = 0;
  else {
    const k = hardK(x, z), beach = SEA - SEA * sm(-46, 16, d), quay = d > EDGE ? 0 : SEA;
    h = beach + (quay - beach) * k;
  }
  if (h < 0 && madeD(x, z) > EDGE) h = 0;
  if (h === 0 && x < 0 && z < -20) h -= trenchD(x, z);
  // 맵 밖 뭍: 북·서로 낮은 사구와 바위 언덕
  if (d > 12) {
    const e = Math.max(-244 - z, -244 - x);
    if (e > 0) {
      const n1 = Math.sin(x * 0.021 + 0.7) * Math.sin(z * 0.017 + 1.9), n2 = Math.sin(x * 0.053 + z * 0.041) * 0.5 + Math.sin(x * 0.11 - z * 0.07) * 0.2;
      h += ((22 + 13 * n1) * sm(0, 120, e) + 7 * sm(10, 90, e) * (1 + n2)) * sm(12, 60, d);
    }
  }
  return h;
}

// ── 지면 색 ──
const _c = new THREE.Color(), _c2 = new THREE.Color();
export function colorFn(x, y, z, slope) {
  const n = Math.sin(x * 0.05 + z * 0.03) * Math.sin(z * 0.045 - x * 0.02), d = coast(x, z), md = madeD(x, z);
  if (y < WY - 0.5) return _c.set(SEAB).lerp(_c2.set(0x6a8a80), sm(-7, WY, y) * 0.7);
  if (y > 1.2) {          // 바깥 언덕: 마른 풀과 바위
    _c.set(0x9a9468).lerp(_c2.set(0x7f8a58), 0.4 + n * 0.3);
    if (slope > 0.2) _c.lerp(_c2.set(0x8a8272), 0.7);
    return _c;
  }
  if (md > EDGE - 3 && d < 0) {   // 부두·방파제·플랫폼
    const k = 0.94 + hash(Math.floor((x + 600) / 9), Math.floor((z + 600) / 9)) * 0.1;
    return _c.set(x > 60 ? CONC3 : CONC2).multiplyScalar(k);
  }
  const hk = hardK(x, z);
  if (hk < 0.5 && d < 26) {       // 모래 해변 → 풀 섞인 사구
    _c.set(SAND).lerp(_c2.set(SAND2), 0.5 + n * 0.5);
    if (y < WY + 0.9) _c.multiplyScalar(0.8);
    return _c.lerp(_c2.set(0x9aa070), sm(14, 26, d) * 0.6);
  }
  if (y < -0.3) return _c.set(0x35363a).lerp(_c2.set(0x241c18), Math.min(1, -y / 2.3) * 0.8);   // 화염 도랑: 그을음
  // 기지 바닥: 12 m 콘크리트 판, 발사대 둘레는 그을린 색, 맵 밖은 마른 들
  if (Math.abs(x) > 238 || z < -238) return _c.set(0xa59c74).lerp(_c2.set(0x8c9160), 0.5 + n * 0.4);
  const k = 0.93 + hash(Math.floor((x + 600) / 12), Math.floor((z + 600) / 12)) * 0.12;
  _c.set(CONC).multiplyScalar(k);
  for (const p of PADS) { const r = Math.hypot(x - p.x, z - p.z); if (r < PAD_R + 10) _c.lerp(_c2.set(0x5d5f63), sm(PAD_R + 10, PAD_R - 4, r) * 0.85); }
  const re = Math.hypot(x - ELEV[0], z - ELEV[1]);
  if (re < RING_R + 4) _c.lerp(_c2.set(0x54565c), 0.8);
  if (hk < 0.5) _c.lerp(_c2.set(0xa59c74), sm(60, 26, d) * 0.8);
  return _c;
}

// 회전된 국소 좌표: u = +x, v = +z 를 ry(도)만큼 돌린 축
export const local = (x, z, ry) => { const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG); return (u, v) => [x + u * c + v * s, z - u * s + v * c]; };
// 바닥 칠(도로·표식): 얇은 상자, 충돌 없음
export function paint(w, x, z, sx, sz, color, y = 0.07, ry = 0, m = "std") { w.box(x, y, z, sx, 0.05, sz, color, { ry, col: false, ao: false, mat: m }); }
// 두 점을 잇는 바닥 띠(도로)
export function strip(w, a, b, wd, color, y = 0.06, m = "std:asphalt") {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  w.box((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, L, 0.05, wd, color, { ry: Math.atan2(-dz, dx) / DEG, col: false, ao: false, mat: m, tile: 6 });
}
// 다각형 기둥(바닥 윤곽 pts[[x, z]…] 을 y0→y1 로 밀어 올림). 구멍 holes 가능
export function extr(pts, y0, y1, holes = []) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) / 8, U.getY(i) / 8);
  g.computeBoundingBox();
  return g;
}
const ID = new THREE.Matrix4();
export function slab(w, pts, y0, y1, color, m = "std:panel", holes) { w.mesh(extr(pts, y0, y1, holes), ID, color, m); }
export const circle = (cx, cz, r, n = 32, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
// 원통·고리 모양 충돌체: x 방향 띠로 나눈 축 정렬 상자. keep(x, z) 가 false 인 띠는 건너뛴다
export function ringCol(w, cx, cz, r0, r1, y0, y1, step = 4, keep = null) {
  for (let x = -r1 + step / 2; x < r1; x += step) {
    const zo = Math.sqrt(Math.max(0, r1 * r1 - x * x)), zi = Math.abs(x) < r0 ? Math.sqrt(r0 * r0 - x * x) : 0;
    for (const s of zi > 0 ? [-1, 1] : [0]) {
      const za = s === 0 ? -zo : s * zi, zb = s === 0 ? zo : s * zo, zc = (za + zb) / 2, hz = Math.abs(zb - za) / 2;
      if (hz < 0.4 || (keep && !keep(x, zc, hz))) continue;
      w.col.addBox(V3(cx + x, (y0 + y1) / 2, cz + zc), V3(step / 2, (y1 - y0) / 2, hz));
    }
  }
}
// 트러스 들보: 위아래 현재 두 줄 + 지그재그 사재. a → b (세로 높이 hh)
export function truss(w, a, b, hh, t, color, o = {}) {
  const n = o.n || Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (hh * 1.3)));
  beam(w, a, b, t, color, { col: false }); beam(w, [a[0], a[1] + hh, a[2]], [b[0], b[1] + hh, b[2]], t, color, { col: false });
  const P = (i, up) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n + (up ? hh : 0), a[2] + (b[2] - a[2]) * i / n];
  for (let i = 0; i < n; i++) beam(w, P(i, i % 2), P(i + 1, (i + 1) % 2), t * 0.6, o.color2 ?? color, { col: false });
  if (o.col !== false) w.col.addCapsule(V3(a[0], a[1] + hh / 2, a[2]), V3(b[0], b[1] + hh / 2, b[2]), hh / 2 + t * 0.5);
}
// 격자탑(충돌은 통짜 상자 하나): 네 귀 기둥 + 층 가로대 + 네 면 가새
export function mast(w, x, y, z, half, H, levels, color, o = {}) {
  const t = o.t || 0.6, lh = H / levels, c2 = o.color2 ?? color, top = o.taper ?? 1;
  const hf = (i) => half * (1 + (top - 1) * i / levels);
  for (let i = 0; i < levels; i++) {
    const a = hf(i), b = hf(i + 1), y0 = y + i * lh, y1 = y0 + lh, d = i % 2 ? 1 : -1;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(w, [x + sx * a, y0, z + sz * a], [x + sx * b, y1, z + sz * b], t, color, { col: false });
    for (const s of [-1, 1]) {
      beam(w, [x - b, y1, z + s * b], [x + b, y1, z + s * b], t * 0.7, c2, { col: false });
      beam(w, [x + s * b, y1, z - b], [x + s * b, y1, z + b], t * 0.7, c2, { col: false });
      beam(w, [x - a * d, y0, z + s * a], [x + b * d, y1, z + s * b], t * 0.5, c2, { col: false });
      beam(w, [x + s * a, y0, z - a * d], [x + s * b, y1, z + b * d], t * 0.5, c2, { col: false });
    }
  }
  if (o.col !== false) w.col.addBox(V3(x, y + H / 2, z), V3(half, H / 2, half));
}

// ── 흰 증기: 모든 분출구를 InstancedMesh 하나로. add(x, y, z, 반경, 오르는 높이, 개수, 옆으로 흐르는 방향[dx, dz]) ──
export class Vapour {
  constructor(w) { this.w = w; this.list = []; }
  add(x, y, z, rad, rise, n = 5, drift = [0.3, 0.1], speed = 0.09) { for (let i = 0; i < n; i++) this.list.push({ x, y, z, rad, rise, ph: i / n + hash(x * 3 + i, z) * 0.2, drift, speed, k: i }); }
  finish() {
    const L = this.list; if (!L.length) return;
    const g = new THREE.IcosahedronGeometry(1, 1), m = new THREE.MeshLambertMaterial({ color: VAP, emissive: 0x9aa0a8, flatShading: true, transparent: true, opacity: 0.86, depthWrite: false });
    const im = new THREE.InstancedMesh(g, m, L.length); im.frustumCulled = false; im.renderOrder = 4; this.w.scene.add(im); this.w.disposables.push(g, m);
    const o = new THREE.Object3D();
    this.w.updaters.push((dt, t) => {
      for (let i = 0; i < L.length; i++) {
        const p = L[i], u = (t * p.speed + p.ph) % 1, s = p.rad * (0.45 + u * 1.5) * Math.min(1, u * 7) * Math.min(1, (1 - u) * 3) + 0.001;
        o.position.set(p.x + u * p.rise * p.drift[0] + Math.sin(p.k * 2.4 + t * 0.4) * p.rad * 0.25, p.y + u * p.rise, p.z + u * p.rise * p.drift[1] + Math.cos(p.k * 1.7 + t * 0.3) * p.rad * 0.25);
        o.scale.set(s, s * 0.8, s); o.rotation.y = p.k + t * 0.1; o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
}
