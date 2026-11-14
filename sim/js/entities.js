// 움직이는 소품: 경로 이동기 + 차량·사람·보트 모델 (트래킹 피사체, 교통, 호송 차량)
import * as THREE from "../vendor/three.module.min.js";
import { buildDrone, botLook } from "./dronemodel.js";
import { toonMat } from "./toon.js";

const _t = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _z = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();

// 점 목록 [x,y,z,(속도)] 을 따라 움직인다. ground 가 있으면 지면 높이에 붙는다
export class PathMover {
  constructor(points, o = {}) {
    this.closed = o.closed !== false;
    this.speeds = points.map((p) => p[3] ?? o.speed ?? 8);
    this.ground = o.ground || null; // world
    this.lift = o.lift ?? 0;
    this.curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), this.closed, "centripetal");
    this.curve.arcLengthDivisions = Math.max(200, points.length * 30);
    this.length = this.curve.getLength();
    this.s = o.offset || 0;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.speed = this.speeds[0];
    this.bank = o.bank ?? 0;      // 선회 시 기울기 계수(드론)
    this.done = false;
    this._prevDir = new THREE.Vector3(0, 0, -1);
    this.roll = 0;
    this.update(0);
  }

  get u() { return this.closed ? ((this.s / this.length) % 1 + 1) % 1 : Math.min(1, Math.max(0, this.s / this.length)); }

  update(dt, speedScale = 1) {
    const n = this.speeds.length;
    const f = this.u * (this.closed ? n : n - 1), i = Math.floor(f) % n, j = this.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const target = (this.speeds[i] + (this.speeds[j] - this.speeds[i]) * (f - Math.floor(f))) * speedScale;
    this.speed += Math.max(-8 * dt, Math.min(6 * dt, target - this.speed));
    this.s += this.speed * dt;
    if (!this.closed && this.s >= this.length) { this.s = this.length; this.done = true; }
    const u = this.u;
    this.curve.getPointAt(u, this.pos);
    this.curve.getTangentAt(u, _t);
    if (this.ground) {
      const e = 1.2;
      const h0 = this.ground.h(this.pos.x, this.pos.z), h1 = this.ground.h(this.pos.x + _t.x * e, this.pos.z + _t.z * e);
      this.pos.y = h0 + this.lift;
      _t.y = (h1 - h0) / e;
      _t.normalize();
    }
    this.vel.copy(_t).multiplyScalar(this.done ? 0 : this.speed);
    // 자세: 진행 방향 + 선회 뱅크
    _z.copy(_t).negate();
    let up = _up;
    if (this.bank && dt > 0) {
      const turn = (this._prevDir.x * _t.z - this._prevDir.z * _t.x) / dt; // 요 변화율 (+ = 우선회)
      this.roll += (Math.max(-0.9, Math.min(0.9, turn * this.bank * this.speed * 0.04)) - this.roll) * Math.min(1, dt * 4);
      _x.crossVectors(_up, _z).normalize();
      up = _y.copy(_up).multiplyScalar(Math.cos(this.roll)).addScaledVector(_x, Math.sin(this.roll));
    }
    this._prevDir.copy(_t);
    _x.crossVectors(up, _z).normalize();
    _y.crossVectors(_z, _x);
    _m.makeBasis(_x, _y, _z);
    this.quat.setFromRotationMatrix(_m);
  }
}

// 툰 재질. gloss: 차체·유리처럼 반짝이는 면
const mat = (color, o = {}) => toonMat({ color, ...o });
const gloss = (color, k = 0.55) => toonMat({ color, spec: k, shine: 70, rim: 0.3 });
function part(g, geo, m, x, y, z) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; }

// 승용차 (전방 -Z, 길이 4.4m)
export function makeCar(color = 0xd13b3b, sporty = false) {
  const g = new THREE.Group();
  const body = gloss(color), dark = mat(0x1c1f26), glass = gloss(0x27405c, 0.9), light = new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  const h = sporty ? 0.5 : 0.62;
  part(g, new THREE.BoxGeometry(1.8, h, 4.4), body, 0, 0.35 + h / 2, 0);
  part(g, new THREE.BoxGeometry(1.6, sporty ? 0.42 : 0.6, sporty ? 1.9 : 2.3), glass, 0, 0.35 + h + (sporty ? 0.21 : 0.3), 0.25);
  if (sporty) part(g, new THREE.BoxGeometry(1.7, 0.06, 0.4), body, 0, 1.15, 2.0);
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = part(g, new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12), dark, sx * 0.86, 0.34, sz * 1.4);
    w.rotation.z = Math.PI / 2;
    wheels.push(w);
  }
  part(g, new THREE.BoxGeometry(1.5, 0.14, 0.06), light, 0, 0.72, -2.21);
  part(g, new THREE.BoxGeometry(1.5, 0.12, 0.06), tail, 0, 0.74, 2.21);
  g.userData.tick = (dt, speed) => { for (const w of wheels) w.rotation.x -= (speed / 0.34) * dt; };
  g.userData.radius = 2.4;
  return g;
}

export function makeTruck(color = 0x3d6b4f) {
  const g = new THREE.Group();
  const body = gloss(color, 0.35), dark = mat(0x1c1f26), cab = gloss(0xe4e4e4), glass = gloss(0x27405c, 0.9), light = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  part(g, new THREE.BoxGeometry(2.5, 2.7, 6.2), body, 0, 2.1, 1.3);
  part(g, new THREE.BoxGeometry(2.4, 2.0, 2.0), cab, 0, 1.7, -2.9);
  part(g, new THREE.BoxGeometry(2.2, 0.8, 0.1), glass, 0, 2.1, -3.92);
  part(g, new THREE.BoxGeometry(2.3, 0.3, 8.4), dark, 0, 0.75, 0.2);
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-2.8, 1.2, 3.2]) {
    const w = part(g, new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), dark, sx * 1.15, 0.5, sz);
    w.rotation.z = Math.PI / 2;
    wheels.push(w);
  }
  part(g, new THREE.BoxGeometry(2.0, 0.16, 0.06), light, 0, 1.0, -3.93);
  g.userData.tick = (dt, speed) => { for (const w of wheels) w.rotation.x -= (speed / 0.5) * dt; };
  g.userData.radius = 4;
  return g;
}

// 달리는 사람 (키 1.75m)
export function makeRunner(color = 0xff5a1f) {
  const g = new THREE.Group();
  const shirt = mat(color), skin = mat(0xe6b48f), pants = mat(0x23272f), shoe = mat(0xf2f2f2);
  part(g, new THREE.BoxGeometry(0.42, 0.55, 0.24), shirt, 0, 1.2, 0);
  part(g, new THREE.SphereGeometry(0.13, 10, 8), skin, 0, 1.63, 0);
  const limb = (m, len, x, y) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    const me = new THREE.Mesh(new THREE.BoxGeometry(0.13, len, 0.14), m); me.position.y = -len / 2; me.castShadow = true;
    piv.add(me); g.add(piv); return piv;
  };
  const legL = limb(pants, 0.9, -0.12, 0.93), legR = limb(pants, 0.9, 0.12, 0.93);
  const armL = limb(skin, 0.6, -0.28, 1.45), armR = limb(skin, 0.6, 0.28, 1.45);
  for (const l of [legL, legR]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.26), shoe); s.position.set(0, -0.9, -0.06); l.add(s); }
  let ph = 0;
  g.userData.tick = (dt, speed) => {
    ph += dt * (4 + speed * 1.6);
    const a = Math.sin(ph) * Math.min(1.0, 0.25 + speed * 0.14);
    legL.rotation.x = a; legR.rotation.x = -a; armL.rotation.x = -a * 0.9; armR.rotation.x = a * 0.9;
    g.children[0].position.y = 1.2 + Math.abs(Math.cos(ph)) * 0.04;
  };
  g.userData.radius = 1.0;
  return g;
}

export function makeBoat(color = 0xf2f2f2) {
  const g = new THREE.Group();
  const hull = gloss(color, 0.4), deck = mat(0x9b6a36), dark = gloss(0x27405c, 0.8), stripe = mat(0xd13b3b);
  const h = part(g, new THREE.BoxGeometry(2.0, 0.7, 5.6), hull, 0, 0.3, 0);
  h.geometry.translate(0, 0, 0);
  const bow = part(g, new THREE.ConeGeometry(1.0, 1.8, 4), hull, 0, 0.3, -3.6);
  bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.5);
  part(g, new THREE.BoxGeometry(1.8, 0.06, 5.4), deck, 0, 0.67, 0);
  part(g, new THREE.BoxGeometry(1.5, 0.7, 1.4), dark, 0, 1.05, -0.4);
  part(g, new THREE.BoxGeometry(2.04, 0.14, 5.6), stripe, 0, 0.5, 0);
  let ph = 0;
  g.userData.tick = (dt) => { ph += dt * 3; g.children.forEach((c) => (c.position.y += Math.sin(ph) * 0.0015)); };
  g.userData.radius = 3;
  return g;
}

// 지게차 (공장 맵)
export function makeForklift(color = 0xf5a623) {
  const g = new THREE.Group();
  const body = gloss(color, 0.4), dark = mat(0x1c1f26), steel = gloss(0x838995, 0.5);
  part(g, new THREE.BoxGeometry(1.2, 0.9, 2.0), body, 0, 0.8, 0.3);
  part(g, new THREE.BoxGeometry(1.1, 1.3, 0.1), steel, 0, 1.9, -0.2);
  part(g, new THREE.BoxGeometry(1.2, 0.08, 1.3), dark, 0, 2.55, 0.3);
  for (const sx of [-1, 1]) {
    part(g, new THREE.BoxGeometry(0.08, 2.4, 0.08), steel, sx * 0.4, 1.4, -0.85);
    part(g, new THREE.BoxGeometry(0.12, 0.06, 1.2), steel, sx * 0.3, 0.3, -1.5);
  }
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-0.5, 1.0]) {
    const w = part(g, new THREE.CylinderGeometry(0.3, 0.3, 0.25, 10), dark, sx * 0.62, 0.3, sz);
    w.rotation.z = Math.PI / 2; wheels.push(w);
  }
  part(g, new THREE.BoxGeometry(1.0, 0.9, 1.0), mat(0x9b6b3d), 0, 0.82, -1.5);
  g.userData.tick = (dt, speed) => { for (const w of wheels) w.rotation.x -= (speed / 0.3) * dt; };
  g.userData.radius = 1.8;
  return g;
}

// 스키 타는 사람: 무릎을 굽힌 활강 자세, 스키·폴. 회전할 때 몸을 안쪽으로 기울인다
export function makeSkier(color = 0xff3d6a) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const jacket = mat(color), pants = mat(0x1d2a44), skin = mat(0xe6b48f), helmet = gloss(0xffffff, 0.5), ski = gloss(0xffd24a, 0.4), pole = mat(0x9aa4b4);
  part(body, new THREE.BoxGeometry(0.42, 0.5, 0.3), jacket, 0, 1.0, -0.08).rotation.x = -0.55;   // 앞으로 숙인 상체 (-z 가 앞)
  part(body, new THREE.SphereGeometry(0.14, 10, 8), helmet, 0, 1.3, -0.3);
  part(body, new THREE.BoxGeometry(0.3, 0.06, 0.1), gloss(0x222222, 0.8), 0, 1.3, -0.43);
  for (const x of [-0.13, 0.13]) {
    part(body, new THREE.BoxGeometry(0.14, 0.45, 0.16), pants, x, 0.6, -0.1).rotation.x = 0.7;     // 허벅지: 엉덩이에서 무릎(앞)으로
    part(body, new THREE.BoxGeometry(0.14, 0.42, 0.16), pants, x, 0.22, -0.12).rotation.x = -0.45;  // 정강이: 무릎에서 발로
    part(body, new THREE.BoxGeometry(0.11, 0.03, 1.7), ski, x, 0.02, -0.05);
    const p1 = part(body, new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5), pole, x * 2.6, 0.55, 0.05); p1.rotation.x = -0.75;
    part(body, new THREE.BoxGeometry(0.1, 0.36, 0.1), jacket, x * 2.3, 0.92, -0.3).rotation.x = 0.9;
  }
  let lean = 0, prev = 0;
  g.userData.tick = (dt, speed) => {
    const yaw = g.rotation.y, turn = ((yaw - prev + Math.PI * 3) % (Math.PI * 2)) - Math.PI; prev = yaw;
    lean += (Math.max(-0.6, Math.min(0.6, -turn / Math.max(dt, 1e-3) * 0.35)) - lean) * Math.min(1, dt * 4);
    body.rotation.z = lean;
  };
  g.userData.radius = 1.0;
  return g;
}

// 오토바이와 운전자
export function makeBike(color = 0x21d4fd) {
  const g = new THREE.Group(), paint = gloss(color, 0.3), dark = mat(0x1a1d24), tire = mat(0x111111), suit = mat(0x23272f);
  const wheels = [];
  for (const z of [-0.75, 0.75]) { const w = part(g, new THREE.CylinderGeometry(0.33, 0.33, 0.14, 16), tire, 0, 0.33, z); w.rotation.z = Math.PI / 2; wheels.push(w); }
  part(g, new THREE.BoxGeometry(0.3, 0.35, 1.2), paint, 0, 0.62, 0);
  part(g, new THREE.BoxGeometry(0.34, 0.22, 0.5), paint, 0, 0.82, -0.45).rotation.x = -0.3;
  part(g, new THREE.BoxGeometry(0.26, 0.16, 0.45), dark, 0, 0.82, 0.3);
  part(g, new THREE.BoxGeometry(0.5, 0.05, 0.05), dark, 0, 0.98, -0.62);
  const r = part(g, new THREE.BoxGeometry(0.38, 0.5, 0.28), suit, 0, 1.12, 0.05); r.rotation.x = -0.7;
  part(g, new THREE.SphereGeometry(0.16, 10, 8), gloss(color, 0.4), 0, 1.35, -0.25);
  g.userData.tick = (dt, speed) => { for (const w of wheels) w.rotation.x -= (speed / 0.33) * dt; };
  g.userData.radius = 1.2;
  return g;
}

// 헬리콥터: 주 로터·꼬리 로터가 돈다
export function makeHeli(color = 0xd13b3b) {
  const g = new THREE.Group(), paint = gloss(color, 0.35), dark = mat(0x22262e), glass = gloss(0x7ec8ff, 0.9);
  part(g, new THREE.SphereGeometry(1.1, 16, 12), paint, 0, 1.4, 0).scale.set(1, 0.9, 1.5);
  part(g, new THREE.SphereGeometry(0.75, 14, 10), glass, 0, 1.55, -0.95).scale.set(1, 0.8, 0.8);
  part(g, new THREE.CylinderGeometry(0.18, 0.32, 3.2, 8), paint, 0, 1.6, 2.4).rotation.x = Math.PI / 2;
  part(g, new THREE.BoxGeometry(0.08, 0.9, 0.6), paint, 0, 2.0, 3.9);
  for (const x of [-0.7, 0.7]) part(g, new THREE.BoxGeometry(0.08, 0.08, 2.4), dark, x, 0.3, 0);
  part(g, new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), dark, 0, 2.45, 0);
  const rotor = new THREE.Group(); rotor.position.set(0, 2.72, 0); g.add(rotor);
  for (let i = 0; i < 4; i++) { const b = part(rotor, new THREE.BoxGeometry(0.22, 0.04, 4.6), dark, 0, 0, 0); b.rotation.y = (i * Math.PI) / 2; b.position.set(0, 0, 0); b.geometry.translate(0, 0, 2.3); }
  const tail = new THREE.Group(); tail.position.set(0.12, 2.0, 3.95); g.add(tail);
  for (let i = 0; i < 2; i++) { const b = part(tail, new THREE.BoxGeometry(0.03, 0.9, 0.12), dark, 0, 0, 0); b.rotation.x = (i * Math.PI) / 2; }
  g.userData.tick = (dt) => { rotor.rotation.y += dt * 28; tail.rotation.x += dt * 40; };
  g.userData.radius = 3;
  return g;
}

// 종류 이름 → 모델
export function makeSubjectModel(type, color) {
  switch (type) {
    case "car": return makeCar(color ?? 0xd13b3b);
    case "sportscar": return makeCar(color ?? 0xffc400, true);
    case "truck": return makeTruck(color);
    case "runner": return makeRunner(color);
    case "boat": return makeBoat(color);
    case "forklift": return makeForklift(color);
    case "skier": return makeSkier(color);
    case "bike": return makeBike(color);
    case "heli": return makeHeli(color);
    case "supercar": { const c = makeCar(color ?? 0xff2d3d, true); c.scale.set(1.05, 0.85, 1.12); return c; }
    case "fpv": {   // 다른 레이싱 드론: 작고 빠르며, 꼬리 불빛이 남는다
      const d = buildDrone({ ...botLook("racer", 0), accentColor: "#ff2bd6", ledColor: "#ff2bd6", propColor: "#21d4fd" }, 1.6, { halo: 0xff2bd6 });
      d.userData.radius = 0.5;
      const tick = d.userData.tick; let t = 0;
      d.userData.tick = (dt) => { t += dt; tick(dt, 0.9, t); };
      return d;
    }
    case "drone": {
      const d = buildDrone({ ...botLook("racer", 1), accentColor: "#ffd400", ledColor: "#ffd400", propColor: "#ffffff" }, 2.2, { halo: 0xffd400 });
      d.userData.radius = 0.6;
      const tick = d.userData.tick;
      let t = 0;
      d.userData.tick = (dt) => { t += dt; tick(dt, 0.6, t); };
      return d;
    }
  }
  return makeCar(color);
}
