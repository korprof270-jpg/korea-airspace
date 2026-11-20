// 대규모 전투의 기함 함대: 하늘 높이 아군(휴마 연합)과 적(에이아 기계 함대 · 에일 생체 함대) 기함들이 줄지어 순항하며 포격전을 벌인다
//  · 측면 포열의 예광탄 · 주포 빔 · 미사일 일제 사격 · 함재기 출격(장식용 공중전) · 손상되면 연기와 불, 격침되면 기울며 추락
//  · 적 기함은 전투 액터(팀 1)라 플레이어가 쏘아 격침할 수 있다(단단함). 아군 기함은 표적이 되지 않고 함대 포격으로만 피해를 입는다
//  · 아군 함선을 잃어도 임무 실패는 아니다(호송 대상은 따로 있다). 온라인·PvP·AOS·데스매치에는 나오지 않는다
//  · 모델은 재질별로 합친 메시, 탄·빔·연기는 효과 풀(fx)을 돌려 쓴다. 함선·함재기 수는 그래픽 품질에 따라 줄인다
import * as THREE from "../vendor/three.module.min.js";
import { toonMat } from "./toon.js";
import { settings } from "./config.js";
import { makeEscortCraft } from "./ships.js";
import { factionModel } from "./factions.js";

const V3 = THREE.Vector3, PI = Math.PI;
const _v = new V3(), _a = new V3(), _b = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), _m4 = new THREE.Matrix4();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ── 대규모 전투인가 ──
export function fleetWanted(mode) {
  const cfg = mode.cfg || {}, c = mode.combat, w = mode.s.world;
  if (settings.fx && settings.fx.fleet === false) return false;
  if (cfg.net || cfg.online || !c || c.ffa) return false;
  if (!mode.s.map.combat || w.size < 150 || (w.ceiling || 999) < 110) return false;
  if (cfg.mode === "challenge") return (cfg.team ?? 0) >= 2 || (cfg.power || 1) >= 1.2 || cfg.mission === "boss" || cfg.mission === "titan";
  if (cfg.mode === "survival") return cfg.variant === "base" || cfg.variant === "conq" || cfg.variant === "fleet" || (cfg.variant === "tdm" && (cfg.bots || 0) >= 8);
  return cfg.mode === "conquest";
}

// ── 모델 ──
const mat = (color, o = {}) => toonMat({ color, ...o });
const gloss = (color, k = 0.5) => toonMat({ color, spec: k, shine: 70, rim: 0.3 });
const lit = (color, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });
// 같은 재질끼리 한 메시로 합친다
function kit() {
  const groups = new Map();
  const add = (m, geo, p = [0, 0, 0], r = null, s = null) => {
    _q.identity(); if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    _s.set(1, 1, 1); if (s) _s.set(s[0], s[1], s[2]);
    let L = groups.get(m); if (!L) groups.set(m, (L = []));
    L.push({ geo, m: new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s) });
  };
  const bake = (root) => {
    for (const [m, list] of groups) {
      const parts = list.map(({ geo, m: mx }) => { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(mx); geo.dispose(); for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
      let n = 0; for (const g of parts) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      let o = 0; for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = false; root.add(mesh);
    }
    return root;
  };
  return { add, bake };
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
const sph = (r, a = 12, b = 9) => new THREE.SphereGeometry(r, a, b);
// 분사 불꽃 (뒤 +Z 로)
function flame(root, x, y, z, r, len, color) {
  const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
  for (const [k, op] of [[1, 0.45], [0.55, 0.85]]) {
    const geo = new THREE.ConeGeometry(r * k, len * (k < 1 ? 0.6 : 1), 10, 1, true); geo.rotateX(PI / 2); geo.translate(0, 0, len * (k < 1 ? 0.3 : 0.5));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: k < 1 ? 0xffffff : color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 3; g.add(m);
  }
  return g;
}
// 포탑 하나: 받침 + 포신 둘. side: -1 좌현 · 1 우현 · 0 갑판(앞)
function turret(A, M, x, y, z, side, s = 1, under = false) {
  const yaw = side ? -side * PI / 2 : 0, dy = under ? -1 : 1;
  A(M.dark, cylY(1.2 * s, 1.4 * s, 0.6 * s), [x, y, z]);
  A(M.plate, box(2.0 * s, 1.0 * s, 2.4 * s), [x, y + 0.7 * s * dy, z], [0, yaw, 0]);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  for (const b of [-0.4, 0.4]) A(M.dark, cylZ(0.15 * s, 0.15 * s, 3.2 * s, 6), [x + fx * 2.3 * s + rx * b * s, y + 0.75 * s * dy, z + fz * 2.3 * s + rz * b * s], [0, yaw, 0]);
  return { p: new V3(x + fx * 3.9 * s, y + 0.75 * s * dy, z + fz * 3.9 * s), side, dir: new V3(fx, 0, fz) };
}

// 아군 순양함 (길이 약 62 m): 흰 선체 · 연합 파랑 띠 · 계단식 함교 · 측면 포열 · 엔진 셋
function allyShip(big) {
  const g = new THREE.Group(), K = kit(), A = K.add;
  const M = { hull: gloss(0xdfe5ee, 0.4), plate: gloss(0x8d97a8, 0.35), dark: mat(0x1d2129), blue: gloss(0x2f6fb0, 0.5), glass: gloss(0x1f3550, 0.9) };
  const win = lit(0x9fe4ff, 1.7), thr = lit(0x58c8ff, 2.6), red = lit(0xff2a2a, 2.2), green = lit(0x2aff6a, 2.0), band = lit(0x4aa8ff, 2.2);
  A(M.hull, box(9, 5, 38), [0, 0, 2]);
  A(M.hull, wedge(9, 5, 16, 0.22, 0.5, -0.6), [0, 0, -25]);
  A(M.plate, box(7, 1.6, 40), [0, -3.2, 1]);
  A(M.plate, wedge(7, 1.6, 12, 0.3, 0.6, 0.3), [0, -3.2, -25]);
  A(M.dark, box(8.4, 0.2, 36), [0, 2.6, 2]);
  A(M.blue, wedge(4, 0.1, 10, 0.2, 1), [0, 2.55, -24], [0.12, 0, 0]);
  for (const x of [-1, 1]) {
    A(M.blue, box(0.12, 0.8, 36), [x * 4.52, 1.2, 2]);
    A(M.plate, box(1.6, 2.2, 30), [x * 5.0, -0.8, 2]);
    A(band, box(0.08, 0.14, 30), [x * 5.82, -1.7, 2]);
    for (let z = -12; z <= 16; z += 4) A(win, box(0.08, 0.4, 1.4), [x * 4.52, 0.1, z]);
    A(x < 0 ? red : green, sph(0.35, 8, 6), [x * 5.9, 0.4, -14]);
    A(M.blue, box(0.4, 5, 5), [x * 4.2, 5.5, 22], [0.3, 0, -x * 0.25]);   // 꼬리날개
  }
  // 함교
  A(M.hull, wedge(6, 4, 14, 0.8, 0.7, 0.4), [0, 4.6, 8]);
  A(M.hull, box(4.6, 2.6, 7), [0, 7.8, 9]);
  A(M.glass, box(4.1, 0.7, 0.15), [0, 8.3, 5.45]);
  A(win, box(3.7, 0.25, 0.12), [0, 8.2, 5.38]);
  A(M.plate, box(5.2, 0.3, 7.6), [0, 9.25, 9]);
  A(M.dark, cylY(0.14, 0.2, 6, 6), [0, 12.3, 10.5]);
  A(M.dark, box(4.2, 0.15, 0.2), [0, 13.6, 10.5]);
  // 기관부
  A(M.plate, box(10, 6, 6), [0, 0, 22]);
  A(M.blue, box(10.06, 0.8, 6.06), [0, 2.2, 22]);
  const noz = [];
  for (const x of [-3.2, 0, 3.2]) { A(M.dark, cylZ(1.5, 1.9, 1.6, 14, true), [x, -0.4, 25.6]); A(thr, new THREE.CircleGeometry(1.4, 14), [x, -0.4, 25.2]); noz.push(x); }
  // 포탑
  const guns = [turret(A, M, 0, 2.9, -16, 0), turret(A, M, 0, 2.9, -8, 0)];
  for (const x of [-1, 1]) for (const z of big ? [-12, -2, 10] : [-8, 6]) guns.push(turret(A, M, x * 6.4, 0.6, z, x, 0.9));
  K.bake(g);
  const fl = noz.map((x) => flame(g, x, -0.4, 26, 1.4, 9, 0x4ab8ff));
  return finishShip(g, { guns, flames: fl, L: 62, W: 12, H: 10, light: 0xbfe4ff, strobe: [0, 13.9, 10.5], beacon: [0, -4.2, 0], search: [[-2.5, -4, -20], [2.5, -4, -20]],
    boxes: [[0, 0, 0, 5, 3, 24], [0, 6.5, 9, 3, 3.5, 7], [0, 0, 22, 5, 3, 3]] });
}

// 에이아 순양함: 검은 강철 선체 · 앞으로 뻗은 쌍갈래 충각 · 붉은 눈과 발광 띠 · 톱니 등지느러미
function eiaShip(big) {
  const g = new THREE.Group(), K = kit(), A = K.add;
  const M = { hull: gloss(0x2b2f3a, 0.45), plate: gloss(0x4a505e, 0.4), dark: mat(0x15171c) };
  const red = lit(0xff2a3a, 2.4), thr = lit(0xff7a3a, 2.6), eye = lit(0xff3040, 3);
  A(M.hull, box(8, 5, 36), [0, 0, 4]);
  A(M.plate, wedge(5.5, 3, 32, 0.4, 0.5, 0.5), [0, -3.6, 2]);
  for (const x of [-1, 1]) {
    A(M.hull, wedge(3, 3.6, 22, 0.25, 0.4, 0), [x * 3.2, 0, -23]);
    A(red, box(0.15, 0.4, 20), [x * 4.72, 0.6, -21]);
    A(red, box(0.12, 0.3, 30), [x * 4.06, 1.2, 4]);
    for (let z = -6; z <= 16; z += 5.5) A(red, box(0.1, 0.9, 0.7), [x * 4.06, -0.8, z]);
    A(M.plate, box(1.4, 2.6, 26), [x * 4.6, -0.4, 4]);
    A(M.hull, wedge(0.5, 6, 8, 1, 0.25, -2), [x * 3.4, 3.4, 19], [0, 0, -x * 0.35]);   // 꼬리 지느러미
  }
  A(eye, sph(1.5), [0, 0.2, -14]);
  A(M.dark, cylZ(2.3, 2.3, 1.2, 16, true), [0, 0.2, -14.4]);
  // 톱니 등지느러미와 함교
  for (let i = 0; i < 5; i++) A(M.plate, wedge(0.5, 3.4, 4, 1, 0.2, -1.2), [0, 3.6, -8 + i * 4.5], [0.25, 0, 0]);
  A(M.hull, wedge(5, 3, 10, 0.6, 0.6, 0.5), [0, 4.0, 14]);
  A(red, box(3.4, 0.4, 0.15), [0, 4.7, 9.05]);
  A(M.dark, cylY(0.15, 0.25, 7, 6), [0, 8, 16]);
  // 기관부
  A(M.plate, box(9, 6, 5), [0, 0, 23.5]);
  const noz = [];
  for (const x of [-2.4, 2.4]) for (const y of [-1.3, 1.5]) { A(M.dark, cylZ(1.2, 1.5, 1.4, 12, true), [x, y, 26.6]); A(thr, new THREE.CircleGeometry(1.1, 12), [x, y, 26.2]); noz.push([x, y]); }
  const guns = [turret(A, M, 0, 2.9, -2, 0), turret(A, M, 0, -3.4, 8, 0, 1, true)];
  for (const x of [-1, 1]) for (const z of big ? [-10, 0, 10] : [-6, 8]) guns.push(turret(A, M, x * 5.9, 0.4, z, x, 0.9));
  K.bake(g);
  const fl = noz.map(([x, y]) => flame(g, x, y, 27, 1.1, 8, 0xff5a2a));
  return finishShip(g, { guns, flames: fl, L: 62, W: 11, H: 10, light: 0xff4a5a, strobe: [0, 11.6, 16], beacon: [0, -5.2, 2], search: [[-3.2, -1.6, -32], [3.2, -1.6, -32]], eye: true,
    boxes: [[0, 0, 4, 4.8, 3.2, 21], [-3.2, 0, -23, 1.6, 1.6, 10], [3.2, 0, -23, 1.6, 1.6, 10]] });
}

// 에일 모함: 보랏빛 생체 선체 · 갈비뼈 마디 · 발광 혈관 · 막 지느러미 · 꼬리 촉수
function ailShip(big) {
  const g = new THREE.Group(), K = kit(), A = K.add;
  const M = { hull: gloss(0x4a2466, 0.6), plate: gloss(0x7a3a8a, 0.4), dark: mat(0x1a0c22), memb: gloss(0x9a4ab8, 0.3) };
  const vein = lit(0xd070ff, 2.2), eye = lit(0x6affd8, 2.6), sac = lit(0xff6ad8, 2.2);
  A(M.hull, sph(1, 18, 12), [0, 0, 0], null, [7, 5.5, 28]);
  A(M.plate, sph(1, 14, 10), [0, -2.4, 2], null, [5, 3, 22]);
  for (let z = -18; z <= 18; z += 6) { const f = Math.sqrt(Math.max(0.05, 1 - (z / 28) ** 2)); A(M.plate, new THREE.TorusGeometry(1, 0.06, 6, 20), [0, 0, z], null, [7.3 * f, 5.8 * f, 6]); }
  for (const x of [-1, 1]) {
    A(vein, box(0.18, 0.18, 34), [x * 3.4, 3.4, 0], [0.04, 0, 0]);
    for (let z = -14; z <= 14; z += 7) A(vein, sph(0.45, 8, 6), [x * 6.4 * Math.sqrt(1 - (z / 28) ** 2), 0.4, z]);
    A(eye, sph(0.8, 10, 8), [x * 2.4, 1.4, -22.5]);
    A(M.memb, box(9, 0.3, 7), [x * 9, -0.6, 4], [0, 0, x * 0.25]);   // 옆 지느러미
    for (const k of [0, 1, 2]) A(M.plate, cylZ(0.9, 0.15, 14, 8), [x * (1.4 + k * 1.2), -2 - k * 0.8, 32 + k], [-0.25 - k * 0.12, x * 0.12 * (k + 1), 0]);   // 촉수
    A(sac, sph(1.5, 10, 8), [x * 2.2, 0.3, 26]);
  }
  A(M.dark, new THREE.ConeGeometry(3.2, 7, 12, 1, true), [0, -0.6, -27.5], [-PI / 2, 0, 0]);
  A(M.memb, wedge(0.4, 6.5, 18, 1, 0.2, -2.6), [0, 6.6, 3]);
  const guns = [];
  for (const x of [-1, 1]) for (const z of big ? [-12, -2, 9] : [-6, 6]) { const p = new V3(x * 6.9 * Math.sqrt(1 - (z / 28) ** 2), 1.2, z); A(M.plate, sph(1.3, 10, 8), [p.x, p.y, p.z]); A(sac, sph(0.6, 8, 6), [p.x + x * 0.9, p.y, p.z]); guns.push({ p: p.add(new V3(x * 1.4, 0, 0)), side: x, dir: new V3(x, 0, 0) }); }
  guns.push({ p: new V3(0, 0, -29), side: 0, dir: new V3(0, 0, -1) });
  K.bake(g);
  const fl = [flame(g, -2.2, 0.3, 27.5, 1.3, 9, 0xd060ff), flame(g, 2.2, 0.3, 27.5, 1.3, 9, 0xd060ff)];
  return finishShip(g, { guns, flames: fl, L: 64, W: 14, H: 11, light: 0xd080ff, strobe: [0, 9.6, 3], beacon: [0, -5.6, 2], search: [[-2.4, -2, -24], [2.4, -2, -24]],
    boxes: [[0, 0, 0, 6, 4.6, 24], [0, 5, 3, 0.6, 3, 8]] });
}

// 공통: 불꽃·항해등·탐조등 연결, 맥동
function finishShip(g, o) {
  const strobe = new THREE.Mesh(sph(0.45, 8, 6), lit(0xffffff, 3)); strobe.position.set(...o.strobe); g.add(strobe);
  const beacon = new THREE.Mesh(sph(0.5, 8, 6), lit(0xff2a2a, 2.6)); beacon.position.set(...o.beacon); g.add(beacon);
  const sl = [];
  const coneGeo = new THREE.ConeGeometry(9, 70, 18, 1, true); coneGeo.translate(0, -35, 0);
  const coneMat = new THREE.MeshBasicMaterial({ color: o.light, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (const p of o.search) {
    const piv = new THREE.Group(); piv.position.set(...p); g.add(piv);
    const c = new THREE.Mesh(coneGeo, coneMat); c.renderOrder = 4; piv.add(c);
    const lamp = new THREE.Mesh(sph(0.6, 8, 6), lit(o.light, 2.6)); piv.add(lamp);
    sl.push(piv);
  }
  let t = Math.random() * 10;
  g.userData.tick = (dt, hpK) => {
    t += dt;
    const k = 0.9 + Math.sin(t * 29) * 0.06 + Math.sin(t * 13) * 0.04, pw = 0.6 + hpK * 0.5;
    for (const f of o.flames) f.scale.set(k, k, pw * (0.9 + Math.sin(t * 41 + f.position.x) * 0.1));
    strobe.visible = t % 1.6 < 0.08 || (t % 1.6 > 0.2 && t % 1.6 < 0.27);
    beacon.visible = t % 1.2 > 0.6 && t % 1.2 < 0.8;
    sl.forEach((p, i) => { p.rotation.set(0.55 + Math.sin(t * 0.35 + i * 2) * 0.35, 0, Math.sin(t * 0.27 + i * 1.7) * 0.5); });
  };
  g.userData.guns = o.guns; g.userData.L = o.L; g.userData.W = o.W; g.userData.H = o.H; g.userData.boxes = o.boxes;
  g.userData.dispose = () => g.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
  return g;
}

// ── 이름 ──
const ALLY_NAMES = ["연합 순양함 한빛", "호위함 청룡", "호위함 백호", "호위함 현무"];
const EIA_NAMES = ["에이아 기함 ‘철혈’", "에이아 순양함 ‘붉은 눈’", "에이아 구축함 ‘톱니’", "에이아 구축함 ‘망치’"];
const AIL_NAMES = ["에일 모함 ‘심연의 노래’", "에일 순항체 ‘보랏빛 촉수’", "에일 순항체 ‘가시 포자’", "에일 순항체 ‘물결’"];
const COL = { ally: { tracer: 0x7fd0ff, beam: 0x5ab4ff, msl: 0x9fd8ff }, eia: { tracer: 0xff6a4a, beam: 0xff3040, msl: 0xffa070 }, ail: { tracer: 0xd070ff, beam: 0xc060ff, msl: 0xff8ae0 } };

export class Fleet {
  constructor(mode) {
    this.mode = mode; this.s = mode.s; this.c = mode.combat; this.w = this.s.world; this.fx = this.s.fx;
    const q = this.s.game.q || "med", w = this.w, mc = this.s.map.combat;
    this.q = q; this.t = 0;
    this.enemyStyle = this.s.cfg.faction === "ail" ? "ail" : "eia";
    const nShip = q === "low" ? 2 : q === "high" || q === "ultra" ? 4 : 3;
    this.maxF = q === "low" ? 1 : q === "high" || q === "ultra" ? 4 : 3;   // 편마다 함재기
    // 축: 아군 진영 → 적 진영. 두 함대는 축에 수직인 항로를 따라 서로 옆구리를 보이며 순항한다
    const blue = new V3(mc.blue[0], 0, mc.blue[1]), red = new V3(mc.red[0], 0, mc.red[1]);
    const axis = red.clone().sub(blue); axis.y = 0; if (axis.lengthSq() < 1) axis.set(1, 0, 0); axis.normalize();
    const mid = blue.clone().add(red).multiplyScalar(0.5), lane = new V3(-axis.z, 0, axis.x);
    const lim = w.size - 40, sep = clamp(w.size * 0.75, 130, 230);
    this.ships = []; this.shots = []; this.missiles = []; this.fighters = []; this.beams = [];
    for (const side of [0, 1]) {
      const sg = side ? 1 : -1, C = mid.clone().addScaledVector(axis, sg * sep / 2);
      C.x = clamp(C.x, -lim, lim); C.z = clamp(C.z, -lim, lim);
      for (let i = 0; i < nShip; i++) {
        const big = i === 0, sc = big ? 1 : 0.72;
        const model = side ? (this.enemyStyle === "ail" ? ailShip(big) : eiaShip(big)) : allyShip(big);
        model.scale.setScalar(sc);
        w.scene.add(model);
        const off = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 78 * (side ? -1 : 1);   // 기함을 가운데 두고 양옆으로
        const sh = { side, big, model, sc, i, name: (side ? (this.enemyStyle === "ail" ? AIL_NAMES : EIA_NAMES) : ALLY_NAMES)[i] || `함선 ${i + 1}`,
          C: C.clone().addScaledVector(axis, (i % 2 ? 18 : -10) * sg), lane: lane.clone(), axis: axis.clone().multiplyScalar(sg), off, ph: side ? PI : 0,
          A: 0, R: (model.userData.L * sc) / 2, guns: model.userData.guns, cool: {}, smokeT: 0, dead: false, deadT: 0, pos: new V3(), vel: new V3(), yaw: 0, roll: 0 };
        // 항로가 맵 안에 들도록 진폭을 정한다
        let A = 70;
        for (; A > 10; A -= 10) { const a = sh.C.clone().addScaledVector(lane, off + A), b = sh.C.clone().addScaledVector(lane, off - A); if (Math.max(Math.abs(a.x), Math.abs(a.z), Math.abs(b.x), Math.abs(b.z)) < lim) break; }
        sh.A = A;
        sh.alt = this._alt(sh) + i * 12 + side * 6;
        // 전투 액터: 적은 표적(플레이어가 격침 가능), 아군은 표적 아님
        const hp = (big ? 5200 : 2800) * (mode.variant === "fleet" ? 5 : 1) * (side ? 1 : 1.25) * (mode.cfg.power || 1);   // 함대전: 함선 내구도 5배
        sh.actor = this.c.addProp(new THREE.Object3D(), { name: sh.name, team: side, radius: (big ? 10 : 7), hp, maxHp: hp, static: true, targetable: !!side, flagship: true, armor: side ? 0.5 : 1 });
        sh.actor.ai = { lastHit: null, lastHitT: 0 };   // 마지막으로 때린 쪽 (combat.damage 가 적는다) → 플레이어 격침 보너스
        sh.hit = new THREE.Group(); model.add(sh.hit);
        const cols = w.rider(sh.hit, model.userData.boxes, side ? "enemy" : "mover");
        for (const cc of cols) cc.owner = sh.actor;
        sh.actor.colliders = cols;   // 조준 시야 판정에서 자기 선체는 빼도록
        this.ships.push(sh);
        this._place(sh, 0);
      }
    }
    // 빔: 미리 만든 가산 원통 (돌려 쓴다)
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); this.beamGeo.rotateX(PI / 2); this.beamGeo.translate(0, 0, 0.5);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      const core = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.add(core); core.scale.set(0.35, 0.35, 1);
      m.visible = false; m.frustumCulled = false; m.renderOrder = 22; w.scene.add(m);
      this.beams.push({ m, core, on: false, t: 0, life: 0, from: new V3(), to: new V3(), w: 1 });
    }
    this.fT = [3, 5];
    this.announced = false;
  }

  // 항로 전체에서 지형·건물에 닿지 않는 고도 (천장 아래)
  _alt(sh) {
    const w = this.w, top = (w.ceiling || 200) - 22;
    let y = 0;
    for (let s = -sh.A - 40; s <= sh.A + 40; s += 12) for (const d of [-14, 0, 14]) {
      _v.copy(sh.C).addScaledVector(sh.lane, sh.off + s).addScaledVector(sh.axis, d);
      y = Math.max(y, w.h(_v.x, _v.z) + 38);
    }
    y = Math.max(y, top * 0.55);
    for (let n = 0; n < 30 && y < top; n++) {
      let ok = true;
      for (let s = -sh.A - 30; s <= sh.A + 30 && ok; s += 15) { _v.copy(sh.C).addScaledVector(sh.lane, sh.off + s); _v.y = y; if (w.col.blocked(_v, sh.R * 0.6)) ok = false; }
      if (ok) break;
      y += 6;
    }
    return Math.min(y, top - 10);
  }

  _place(sh, dt) {
    const u = this.t * (6 / Math.max(20, sh.A)) + sh.ph;   // 약 6 m/s
    const along = Math.sin(u) * sh.A, across = Math.cos(u) * 16;
    const px = sh.C.x + sh.lane.x * (sh.off + along) + sh.axis.x * across, pz = sh.C.z + sh.lane.z * (sh.off + along) + sh.axis.z * across;
    const py = sh.alt + Math.sin(this.t * 0.35 + sh.i) * 1.6;
    if (dt > 0) sh.vel.set((px - sh.pos.x) / dt, (py - sh.pos.y) / dt, (pz - sh.pos.z) / dt);
    sh.pos.set(px, py, pz);
    const vx = sh.lane.x * Math.cos(u) * sh.A - sh.axis.x * Math.sin(u) * 16, vz = sh.lane.z * Math.cos(u) * sh.A - sh.axis.z * Math.sin(u) * 16;
    const want = Math.atan2(-vx, -vz);
    let d = want - sh.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    sh.yaw = dt > 0 ? sh.yaw + clamp(d, -0.25 * dt, 0.25 * dt) : want;
    sh.roll += (clamp(-d * 0.8, -0.12, 0.12) - sh.roll) * Math.min(1, dt * 0.8);
    sh.model.position.copy(sh.pos);
    sh.model.rotation.set(0, sh.yaw, sh.roll, "YXZ");
    sh.actor.pos.copy(sh.pos); sh.actor.vel.copy(sh.vel);
  }

  // 선체 위의 임의의 점 (월드)
  _hullPoint(sh, out) {
    const L = sh.model.userData.L * sh.sc, W = sh.model.userData.W * sh.sc, H = sh.model.userData.H * sh.sc;
    out.set(rnd(-0.4, 0.4) * W, rnd(-0.3, 0.3) * H, rnd(-0.42, 0.42) * L).applyEuler(sh.model.rotation).add(sh.pos);
    return out;
  }
  _gunWorld(sh, gun, out) { return out.copy(gun.p).multiplyScalar(sh.sc).applyEuler(sh.model.rotation).add(sh.pos); }

  _pickTarget(sh) {
    let best = null, bd = 1e9;
    for (const o of this.ships) {
      if (o.side === sh.side || o.dead) continue;
      const d = o.pos.distanceTo(sh.pos) * (0.8 + Math.random() * 0.5);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  update(dt, live) {
    this.t += dt;
    const fx = this.fx, me = this.mode.me;
    for (const sh of this.ships) {
      if (sh.dead) { this._dying(sh, dt); continue; }
      this._place(sh, dt);
      const hpK = sh.actor.hp / sh.actor.maxHp;
      sh.model.userData.tick(dt, hpK);
      if (!sh.actor.alive) { this._sink(sh); continue; }
      // 손상: 연기 꼬리 · 불길 · 작은 폭발
      if (hpK < 0.65 && (sh.smokeT -= dt) <= 0) {
        sh.smokeT = hpK < 0.3 ? 0.07 : 0.14;
        const pts = sh.dmgPts || (sh.dmgPts = [0, 1, 2].map(() => new V3(rnd(-0.3, 0.3) * sh.model.userData.W, rnd(0, 0.35) * sh.model.userData.H, rnd(-0.35, 0.35) * sh.model.userData.L)));
        for (let k = 0; k < (hpK < 0.3 ? 3 : 1); k++) {
          _a.copy(pts[k]).multiplyScalar(sh.sc).applyEuler(sh.model.rotation).add(sh.pos);
          fx.smoke(_a, 2.6 * sh.sc, 3.2, 0.09, 1.4);
          if (hpK < 0.4) fx.burst(_a, 0xff7a2a, 3, 3, 0.6, 1.4 * sh.sc, -2);
        }
        if (hpK < 0.3 && Math.random() < 0.06) fx.explosion(this._hullPoint(sh, _a), 1.1);
      }
      if (!live) continue;
      this._fire(sh, dt, me);
    }
    if (live) { this._fighters(dt); this._shots(dt); this._missiles(dt); }
    this._beams(dt);
    if (live) this._drawShots();
    if (live && !this.announced && this.t > 2.5) {
      this.announced = true;
      const n0 = this.ships.filter((x) => !x.side).length;
      this.s.hud.feed(`아군 함대 ${n0}척 전개 — 적 기함 접근`, "#9fd8ff");
    }
  }

  _fire(sh, dt, me) {
    const c = sh.cool, st = sh.side ? this.enemyStyle : "ally", col = COL[st];
    for (const k in c) c[k] -= dt;
    const tgt = sh.tgt && !sh.tgt.dead && Math.random() > dt * 0.1 ? sh.tgt : (sh.tgt = this._pickTarget(sh));
    if (tgt) {
      const dir = _b.copy(tgt.pos).sub(sh.pos); const dist = dir.length(); dir.normalize();
      // 측면 포열: 목표 쪽 옆구리의 포가 연달아 예광탄을 쏜다
      if (!(c.broad > 0)) {
        c.broad = rnd(2.2, 3.4) * (sh.big ? 1 : 1.3);
        const right = _v.set(Math.cos(sh.yaw), 0, -Math.sin(sh.yaw)), sideTo = right.dot(dir) > 0 ? 1 : -1;
        const guns = sh.guns.filter((g) => g.side === sideTo || g.side === 0);
        guns.forEach((g, gi) => { for (let r = 0; r < 3; r++) this._later(gi * 0.12 + r * 0.09, () => this._shot(sh, g, tgt, col.tracer, st === "ail" ? 70 : 170, st === "ail" ? 1.6 : 0.5, 4.5)); });
      }
      // 주포 빔 (기함)
      if (sh.big && !(c.beam > 0) && dist < 420) {
        c.beam = rnd(5, 7.5);
        const g = sh.guns[0], from = this._gunWorld(sh, g, new V3()), to = this._hullPoint(tgt, new V3());
        this._beam(from, to, col.beam, st === "ail" ? 1.4 : 1.0, 0.55);
        this.fx.muzzle(from, _a.copy(to).sub(from).normalize(), col.beam, 4);
        this.fx.flash(from, col.beam, 4, 0.15);
        this._later(0.05, () => { if (!tgt.dead) { this.fx.explosion(to, 1.6); this._hurt(tgt, 110, sh, to); } });
        this._snd("elaser", sh.pos, 0.9, 0.5);
      }
      // 미사일 일제 사격
      if (!(c.msl > 0)) {
        c.msl = rnd(9, 13) * (sh.big ? 1 : 1.4);
        const n = sh.big ? 6 : 3;
        for (let k = 0; k < n; k++) this._later(k * 0.18, () => this._missile(sh, tgt, col.msl));
      }
    }
    // 근접 방어: 적 기함은 가까이 온 플레이어에게 대공 사격
    if (sh.side && me && me.alive && !(c.pd > 0)) {
      const d = me.pos.distanceTo(sh.pos);
      if (d < 120) {
        c.pd = rnd(0.9, 1.4);
        let best = null, bd = 1e9;
        for (const g of sh.guns) { const p = this._gunWorld(sh, g, _a); const dd = p.distanceTo(me.pos); if (dd < bd) { bd = dd; best = g; } }
        const from = this._gunWorld(sh, best, new V3()), dir = new V3();
        this.c._lead(from, me, 110, dir).sub(from).normalize();
        dir.x += rnd(-0.04, 0.04); dir.y += rnd(-0.04, 0.04); dir.z += rnd(-0.04, 0.04); dir.normalize();
        this.c.fireLaser(sh.actor, from, dir, 4, COL[this.enemyStyle].tracer, 110);
        this.fx.muzzle(from, dir, COL[this.enemyStyle].tracer, 2.4);
      } else c.pd = 0.5;
    }
  }

  // 함대끼리의 피해: 적 기함의 장갑(0.5)은 플레이어 탄에만 적용되도록 되돌려 준다. 0.6 배 → 함대 포격만으로는 기함이 3~5분 버틴다
  _hurt(t, dmg, src, pt) { if (t && !t.dead && t.actor.alive) this.c.damage(t.actor, dmg * 0.6 / (t.actor.armor || 1), src ? src.actor : null, pt); }
  _blast(pos, k) { const d = this.s.camera.position.distanceTo(pos), e = k * clamp(1 - d / 260, 0, 1); if (e > 0.05 && this.s.feel && this.s.feel.emit) this.s.feel.emit("blast", e, pos); }   // 먼 폭발은 화면을 흔들지 않는다
  _later(t, f) { (this.queue || (this.queue = [])).push({ t, f }); }
  _snd(name, pos, vol = 1, rate = 1) { const c = this.c; if (c.snd && c.volAt) c.snd.play(name, c.volAt(pos) * vol, c.panAt(pos), rate); }

  // 예광탄 (장식 + 명중하면 함선 피해)
  _shot(sh, g, tgt, color, speed, width, dmg) {
    if (sh.dead || !tgt || tgt.dead) return;
    const from = this._gunWorld(sh, g, new V3());
    const miss = Math.random() < 0.3;
    const aim = this._hullPoint(tgt, new V3());
    const tt = from.distanceTo(aim) / speed;
    aim.addScaledVector(tgt.vel, tt);
    if (miss) aim.add(_a.set(rnd(-1, 1), rnd(-0.6, 1), rnd(-1, 1)).multiplyScalar(14));
    const dir = aim.clone().sub(from), len = dir.length(); dir.normalize();
    this.shots.push({ pos: from, dir, speed, life: len / speed, color, width, dmg: miss ? 0 : dmg, tgt, src: sh, miss });
    if (this.shots.length > 260) this.shots.shift();
    this.fx.muzzle(from, dir, color, 3);
    if (Math.random() < 0.35) this.fx.flash(from, color, 2.2, 0.07);
    if (Math.random() < 0.25) this._snd("laser", from, 0.35, 0.6);
  }
  _shots(dt) {
    const fx = this.fx;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.pos.addScaledVector(s.dir, s.speed * Math.min(s.life, dt)); s.life -= dt;
      if (s.life > 0) continue;
      this.shots.splice(i, 1);
      if (s.miss || !s.tgt || s.tgt.dead) { fx.burst(s.pos, 0xffc070, 6, 5, 0.4, 0.8, 0); fx.smoke(s.pos, 1.4, 1.4, 0.2, 1); continue; }   // 대공 작렬
      fx.explosion(s.pos, 0.55);
      this._hurt(s.tgt, s.dmg, s.src, s.pos);
    }
  }
  _drawShots() {
    const fx = this.fx;
    for (const s of this.shots) fx.bolt(s.pos, s.dir, s.width > 1 ? 3 : 7, s.color, s.width);
    for (const m of this.missiles) fx.bolt(m.pos, _a.copy(m.vel).normalize(), 2.2, 0xdde3ec, 0.5);
    for (const f of this.fighters) for (const b of f.bolts) fx.bolt(b.p, b.d, 3.5, b.c, 0.22);
    fx.endBolts();
  }

  _missile(sh, tgt, color) {
    if (sh.dead || !tgt || tgt.dead) return;
    const p = this._hullPoint(sh, new V3()); p.y += sh.model.userData.H * sh.sc * 0.4;
    const v = new V3(rnd(-0.5, 0.5), 1, rnd(-0.5, 0.5)).normalize().multiplyScalar(18);
    this.missiles.push({ pos: p, vel: v, tgt, src: sh, life: 9, color, off: new V3(rnd(-0.3, 0.3), rnd(-0.2, 0.2), rnd(-0.35, 0.35)) });
    this.fx.flash(p, color, 2.5, 0.12);
    if (Math.random() < 0.5) this._snd("missile", p, 0.5, 0.8);
  }
  _missiles(dt) {
    const fx = this.fx;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      const t = m.tgt;
      if (t && !t.dead) {
        _a.copy(m.off).multiply(_b.set(t.model.userData.W, t.model.userData.H, t.model.userData.L)).multiplyScalar(t.sc).applyEuler(t.model.rotation).add(t.pos);
        _b.copy(_a).sub(m.pos); const d = _b.length();
        if (d < 3) { this.missiles.splice(i, 1); fx.explosion(m.pos, 1.3); this._hurt(t, 28, m.src, m.pos); continue; }
        _b.normalize().multiplyScalar(55);
        m.vel.lerp(_b, Math.min(1, dt * 1.6));
      }
      m.pos.addScaledVector(m.vel, dt);
      if ((m.tr = (m.tr || 0) + 1) % 2 === 0) { fx.puff(m.pos, m.color, 0.7, 0.6, 0.3); fx.smoke(m.pos, 0.9, 1.6, 0.55, 0.3); }
      if (m.life <= 0 || m.pos.y < this.w.h(m.pos.x, m.pos.z)) { this.missiles.splice(i, 1); fx.explosion(m.pos, 0.8); }
    }
  }

  _beam(from, to, color, width, life) {
    let b = this.beams.find((x) => !x.on) || this.beams[0];
    b.on = true; b.t = 0; b.life = life; b.from.copy(from); b.to.copy(to); b.w = width;
    b.m.material.color.set(color); b.core.material.color.set(0xffffff); b.m.visible = true;
  }
  _beams(dt) {
    for (const b of this.beams) {
      if (!b.on) continue;
      b.t += dt;
      const k = b.t / b.life;
      if (k >= 1) { b.on = false; b.m.visible = false; continue; }
      const len = b.from.distanceTo(b.to);
      b.m.position.copy(b.from); b.m.lookAt(b.to);
      const wv = b.w * (1 - k * 0.6) * (1 + Math.sin(b.t * 70) * 0.12);
      b.m.scale.set(wv, wv, len);
      b.m.material.opacity = 0.55 * (1 - k); b.core.material.opacity = 0.95 * (1 - k);
      if (Math.random() < dt * 30) this.fx.burst(b.to, b.m.material.color.getHex(), 3, 6, 0.3, 0.9, 0);
    }
    if (this.queue && this.queue.length) {
      for (const e of this.queue) e.t -= dt;
      const due = this.queue.filter((e) => e.t <= 0); this.queue = this.queue.filter((e) => e.t > 0);
      for (const e of due) e.f();
    }
  }

  // ── 함재기 (장식용 공중전) ──
  _fighters(dt) {
    const w = this.w, fx = this.fx;
    for (const side of [0, 1]) {
      this.fT[side] -= dt;
      const mine = this.fighters.filter((f) => f.side === side && f.alive).length;
      const carriers = this.ships.filter((s) => s.side === side && !s.dead);
      if (this.fT[side] <= 0 && mine < this.maxF && carriers.length) {
        this.fT[side] = rnd(5, 9);
        const cs = carriers[(Math.random() * carriers.length) | 0];
        this._launch(cs);
      }
    }
    for (let i = this.fighters.length - 1; i >= 0; i--) {
      const f = this.fighters[i];
      for (let k = f.bolts.length - 1; k >= 0; k--) { const b = f.bolts[k]; b.p.addScaledVector(b.d, 160 * dt); if ((b.life -= dt) <= 0) f.bolts.splice(k, 1); }
      if (!f.alive) { if (!f.bolts.length) { w.scene.remove(f.model); if (f.model.userData.dispose) f.model.userData.dispose(); this.fighters.splice(i, 1); } continue; }
      f.t += dt;
      // 목표: 적 함재기를 쫓고, 없으면 적 기함 옆을 스치는 공격 기동
      if (!f.tgt || !f.tgt.alive || (f.retT -= dt) <= 0) {
        f.retT = rnd(4, 7);
        const foes = this.fighters.filter((o) => o.side !== f.side && o.alive);
        f.tgt = foes.length && Math.random() < 0.7 ? foes[(Math.random() * foes.length) | 0] : null;
        const ships = this.ships.filter((s) => s.side !== f.side && !s.dead);
        f.ship = ships.length ? ships[(Math.random() * ships.length) | 0] : null;
        f.offs = new V3(rnd(-1, 1), rnd(-0.3, 0.6), rnd(-1, 1)).normalize().multiplyScalar(rnd(22, 40));
      }
      const goal = _a;
      if (f.tgt) goal.copy(f.tgt.pos).addScaledVector(f.tgt.vel, 0.4);
      else if (f.ship) goal.copy(f.ship.pos).add(f.offs);
      else goal.copy(f.home);
      const minY = w.h(f.pos.x, f.pos.z) + 25, maxY = (w.ceiling || 200) - 8;
      if (goal.y < minY) goal.y = minY;
      const want = _b.copy(goal).sub(f.pos).normalize().multiplyScalar(f.spd);
      if (f.pos.y < minY) want.y = Math.abs(want.y) + 10;
      if (f.pos.y > maxY) want.y = -Math.abs(want.y) - 5;
      const lim = w.size - 15; if (Math.abs(f.pos.x) > lim || Math.abs(f.pos.z) > lim) want.set(-f.pos.x, 0, -f.pos.z).normalize().multiplyScalar(f.spd);
      f.vel.lerp(want, Math.min(1, dt * 1.3));
      f.pos.addScaledVector(f.vel, dt);
      f.model.position.copy(f.pos);
      _v.copy(f.pos).add(f.vel); _m4.lookAt(f.pos, _v, THREE.Object3D.DEFAULT_UP); f.model.quaternion.setFromRotationMatrix(_m4);
      if (f.model.userData.tick) f.model.userData.tick(dt, 0.8, this.t);
      // 사격: 앞에 표적이 있으면 짧은 연사
      const tp = f.tgt ? f.tgt.pos : f.ship ? f.ship.pos : null;
      if (tp && (f.gun -= dt) <= 0) {
        const to = _v.copy(tp).sub(f.pos), d = to.length();
        if (d < 110 && to.normalize().dot(_b.copy(f.vel).normalize()) > 0.9) {
          f.gun = 0.11; f.burst = (f.burst || 0) + 1; if (f.burst > 6) { f.burst = 0; f.gun = rnd(0.8, 1.6); }
          const d0 = _b.copy(f.vel).normalize().clone(); d0.x += rnd(-0.03, 0.03); d0.y += rnd(-0.03, 0.03); d0.normalize();
          f.bolts.push({ p: f.pos.clone(), d: d0, life: Math.min(0.7, d / 160), c: f.side ? COL[this.enemyStyle].tracer : COL.ally.tracer });
          if (f.tgt && d < 70 && Math.random() < 0.05) this._fighterDown(f.tgt);
          if (!f.tgt && f.ship && d < 60 && Math.random() < 0.2 && f.ship.actor.alive) { this._hurt(f.ship, 2, null, f.ship.pos); fx.hitSpark(this._hullPoint(f.ship, _s), d0, 0xffd27a, 4, false, false); }
        } else f.gun = 0.2;
      }
      if (f.t > 70) this._fighterDown(f);
    }
  }
  _launch(cs) {
    const side = cs.side, model = side ? (factionModel(this.enemyStyle, "jet", 0xff2d3d) || makeEscortCraft(0xb03040)) : makeEscortCraft(0x2f6fb0);
    model.scale.multiplyScalar(side ? 1 : 1.1);
    this.w.scene.add(model);
    const p = new V3(0, -cs.model.userData.H * cs.sc * 0.45, cs.model.userData.L * cs.sc * 0.2).applyEuler(cs.model.rotation).add(cs.pos);
    const fwd = new V3(-Math.sin(cs.yaw), -0.3, -Math.cos(cs.yaw)).normalize();
    this.fighters.push({ side, model, pos: p, vel: fwd.multiplyScalar(26), spd: rnd(30, 38), alive: true, t: 0, gun: 1, bolts: [], tgt: null, ship: null, retT: 0, home: cs.pos.clone() });
    this.fx.flash(p, side ? 0xff6a4a : 0x7fd0ff, 2.5, 0.2);
  }
  _fighterDown(f) {
    if (!f.alive) return;
    f.alive = false; f.model.visible = false;
    this.fx.explosion(f.pos, 0.9); this.fx.debrisBurst(f.pos, 0x5a6070, 6, 10, 0.25);
    this._snd("explode", f.pos, 0.4);
  }

  // ── 격침 ──
  _sink(sh) {
    sh.dead = true; sh.deadT = 0; sh.vy = 0; sh.rollV = (Math.random() < 0.5 ? -1 : 1) * rnd(0.12, 0.22); sh.pitchV = rnd(0.04, 0.09);
    sh.hit.visible = false;   // 충돌 상자 끄기
    const fx = this.fx, hud = this.s.hud, me = this.mode.me;
    fx.destroy(sh.pos, 3.2);
    for (let k = 0; k < 3; k++) fx.destroy(this._hullPoint(sh, new V3()), 1.8);
    fx.debrisBurst(sh.pos, sh.side ? 0x3a3f4a : 0xc8d0dc, 22, 22, 1.1);
    this._blast(sh.pos, 0.6);
    this._snd("explode", sh.pos, 1.3, 0.7);
    if (sh.side) {
      const mine = me && sh.actor.ai.lastHit === me;
      hud.feed(`적 기함 격침 — ${sh.name}`, "#35ff7a");
      if (mine) { me.score += sh.big ? 2500 : 1500; hud.toast(`${sh.name} 격침!  +${sh.big ? 2500 : 1500}`, "#ffd24a", 2.6, 28); }
      else hud.toast(`${sh.name} 격침!`, "#35ff7a", 2.2, 26);
    } else {
      hud.feed(`아군 함선 피격 침몰 — ${sh.name}`, "#ff6b5a");
      hud.toast(`${sh.name} 격침… 함대가 흔들린다`, "#ff6b5a", 2.4, 24);
    }
    for (const f of this.fighters) if (f.ship === sh) f.ship = null;
  }
  // 격침된 함선: 불타며 기울어 추락하다 땅에 닿으면 큰 폭발
  _dying(sh, dt) {
    const fx = this.fx, g = sh.model, w = this.w;
    if (sh.sunk) return;
    sh.deadT += dt;
    sh.vy -= 3.2 * dt;
    g.position.y += sh.vy * dt;
    g.position.x += -Math.sin(sh.yaw) * 5 * dt; g.position.z += -Math.cos(sh.yaw) * 5 * dt;
    g.rotation.z += sh.rollV * dt; g.rotation.x -= sh.pitchV * dt;
    sh.pos.copy(g.position);
    if (Math.random() < dt * 6) { fx.explosion(this._hullPoint(sh, _a), rnd(1, 2)); fx.smoke(_a, 3.2, 3, 0.07, 2); }
    if (Math.random() < dt * 14) { this._hullPoint(sh, _a); fx.smoke(_a, 3, 3.6, 0.06, 1.6); fx.burst(_a, 0xff7a2a, 3, 3, 0.6, 1.8, -2); }
    if (Math.random() < dt * 0.8) fx.debrisBurst(this._hullPoint(sh, _a), 0x3a3f4a, 5, 12, 0.6);
    if (g.position.y < w.h(g.position.x, g.position.z) + 2 || sh.deadT > 14) {
      sh.sunk = true;
      fx.destroy(g.position, 5); fx.ring(g.position, 0xffc98a, 60, 1.1); fx.debrisBurst(g.position, 0x3a3f4a, 26, 26, 1.2);
      this._snd("explode", g.position, 1.4, 0.6);
      this._blast(g.position, 0.8);
      g.visible = false;
    }
  }

  // 남은 함선 수 (결과·HUD 용)
  alive(side) { return this.ships.filter((s) => s.side === side && !s.dead).length; }

  dispose() {
    const sc = this.w.scene;
    for (const sh of this.ships) { sc.remove(sh.model); sh.model.userData.dispose(); }
    for (const f of this.fighters) { sc.remove(f.model); if (f.model.userData.dispose) f.model.userData.dispose(); }
    for (const b of this.beams) { sc.remove(b.m); b.m.material.dispose(); b.core.material.dispose(); }
    this.beamGeo.dispose();
    this.ships = []; this.fighters = []; this.shots = []; this.missiles = [];
  }
}
