// 메뉴 3D 무대: 정비소 받침대 + 모드별 미니 장면(움직이는 3D 미리보기), 카드 썸네일·맵 미리보기 렌더러
import * as THREE from "../vendor/three.module.min.js";
import { settings, DRONE_CLASSES } from "./config.js";
import { buildDrone, botLook } from "./dronemodel.js";
import { makeCar } from "./entities.js";
import { toonMat, toonify } from "./toon.js";
import { World } from "./world.js";
import { MAPS } from "./maps/index.js";
import { SKILLS } from "./skilldefs.js";
import { partLook, skillLv } from "./garage.js";

const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
const _x = new V3(), _y = new V3(), _z = new V3(), _a = new V3(), _b = new V3(), _m = new THREE.Matrix4();
const glow = (c, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

// 받침대 바닥 무늬: 동심원 + 눈금
function floorTexture() {
  const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"), c = S / 2;
  g.fillStyle = "#101736"; g.fillRect(0, 0, S, S);
  const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.5);
  gr.addColorStop(0, "#2c3d80"); gr.addColorStop(0.45, "#1d2a62"); gr.addColorStop(0.46, "#162050"); gr.addColorStop(1, "#101736");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = "#2c3f8c"; g.lineWidth = 3;
  for (const r of [0.1, 0.2, 0.34, 0.5, 0.7, 0.94]) { g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); }
  g.lineWidth = 2;
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r0 = c * (i % 4 ? 0.2 : 0.17), r1 = c * 0.225; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// 드론 자세: 앞(-Z)을 fwd 로, 윗면을 up 으로, pitch 만큼 기수를 숙인다
function orient(obj, fwd, up = UP, pitch = 0) {
  _z.copy(fwd).normalize().negate();
  _x.crossVectors(up, _z); if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0); _x.normalize();
  _y.crossVectors(_z, _x);
  _m.makeBasis(_x, _y, _z); obj.quaternion.setFromRotationMatrix(_m);
  if (pitch) obj.rotateX(-pitch);
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => { if (m.map && m.map.isCanvasTexture) m.map.dispose(); m.dispose(); });
  });
}

// 레이저 볼트 + 명중 섬광 묶음
class Bolts {
  constructor(group, n = 12) {
    const geo = new THREE.CylinderGeometry(0.007, 0.007, 0.14, 6); geo.rotateX(Math.PI / 2);
    const fg = new THREE.SphereGeometry(1, 10, 8);
    this.b = Array.from({ length: n }, () => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial()); m.visible = false; group.add(m); return { m, t: 0, life: 1, a: new V3(), c: new V3() }; });
    this.f = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; group.add(m); return { m, t: 1 }; });
  }
  fire(a, c, color) {
    const s = this.b.find((x) => !x.m.visible); if (!s) return;
    s.a.copy(a); s.c.copy(c); s.t = 0; s.life = Math.max(0.08, a.distanceTo(c) / 3.4); s.col = color;
    s.m.material.color.set(color).multiplyScalar(2.8); s.m.visible = true;
  }
  tick(dt) {
    for (const s of this.b) {
      if (!s.m.visible) continue;
      s.t += dt; const k = s.t / s.life;
      if (k >= 1) { s.m.visible = false; this._flash(s.c, s.col); continue; }
      s.m.position.lerpVectors(s.a, s.c, k); s.m.lookAt(s.c);
    }
    for (const f of this.f) {
      if (!f.m.visible) continue;
      f.t += dt / 0.28; if (f.t >= 1) { f.m.visible = false; continue; }
      f.m.scale.setScalar(0.015 + f.t * 0.07); f.m.material.opacity = 1 - f.t;
    }
  }
  _flash(p, color) {
    const f = this.f.find((x) => !x.m.visible) || this.f[0];
    f.m.position.copy(p); f.t = 0; f.m.visible = true; f.m.material.color.set(color).multiplyScalar(1.8);
  }
}

// 지나간 자리를 따라 줄어드는 빛 구슬 꼬리
class Trail {
  constructor(group, color, n = 18, size = 0.014) {
    const geo = new THREE.SphereGeometry(1, 8, 6), mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, opacity: 0.75, depthWrite: false });
    this.m = Array.from({ length: n }, () => { const m = new THREE.Mesh(geo, mat); m.visible = false; group.add(m); return m; });
    this.p = Array.from({ length: n }, () => new V3()); this.n = 0; this.acc = 0; this.size = size;
  }
  tick(dt, pos) {
    this.acc += dt;
    if (this.acc > 0.03) { this.acc = 0; this.p.unshift(this.p.pop().copy(pos)); this.n = Math.min(this.n + 1, this.p.length); }
    this.m.forEach((m, i) => { m.visible = i < this.n; m.position.copy(this.p[i]); m.scale.setScalar(this.size * (1 - i / this.m.length)); });
  }
}

// ── 모드별 미니 장면 ─────────────────────────────────────────
// 반환: { group, tick(dt, t), view: { dist, h, look, angle, spin } }
function playerDrone(s = 1.45) { const d = buildDrone(settings.drone, s, { parts: partLook() }); return d; }
function botDrone(kind, team, s = 1.35) { return buildDrone(botLook(kind, team), s, { halo: team ? 0xff3d4d : 0x2f8cff }); }

function vRace() {
  const g = new THREE.Group(), R = 0.86, Y = 0.34, gates = [];
  const frameG = new THREE.BoxGeometry(1, 1, 1), legM = toonMat({ color: 0x1d2236 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, gate = new THREE.Group(), mat = glow(0xff7a1a, 2.4);
    const bar = (x, y, sx, sy) => { const m = new THREE.Mesh(frameG, mat); m.position.set(x, y, 0); m.scale.set(sx, sy, 0.03); gate.add(m); };
    const w = 0.62, h = 0.5;
    bar(0, h / 2, w + 0.03, 0.03); bar(0, -h / 2, w + 0.03, 0.03); bar(-w / 2, 0, 0.03, h); bar(w / 2, 0, 0.03, h);
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(frameG, legM); l.scale.set(0.018, Y - h / 2 + 0.06, 0.018); l.position.set(sx * w / 2, -h / 2 - (Y - h / 2 + 0.06) / 2, 0); gate.add(l); }
    _a.set(Math.cos(a) * R, Y, Math.sin(a) * R); gate.position.copy(_a);
    gate.lookAt(_a.x - Math.sin(a), Y, _a.z + Math.cos(a));
    g.add(gate); gates.push({ a, mat });
  }
  const me = playerDrone(), rival = botDrone("racer", 1, 1.3);
  g.add(me, rival);
  const trail = new Trail(g, settings.drone.accentColor || "#ff5a1f");
  let th = 0;
  const place = (obj, a, y) => {
    obj.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
    _a.set(-Math.sin(a), 0, Math.cos(a)); _b.set(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(0.8).add(UP).normalize();
    orient(obj, _a, _b, 0.28);
  };
  return {
    group: g,
    view: { dist: 2.75, h: 1.2, look: 0.22, angle: 0.5, spin: 0.09 },
    tick(dt, t) {
      th += dt * 0.95;
      place(me, th, Y + Math.sin(t * 2.1) * 0.025);
      place(rival, th - 0.95, Y - 0.04 + Math.sin(t * 1.7) * 0.02);
      me.userData.tick(dt, 0.75, t); rival.userData.tick(dt, 0.7, t);
      trail.tick(dt, me.position);
      let next = null, best = 9;
      for (const q of gates) { const d = (((q.a - th) % 6.2832) + 6.2832) % 6.2832; if (d < best) { best = d; next = q; } }
      for (const q of gates) q.mat.color.set(q === next ? 0x25ff6a : 0xff7a1a).multiplyScalar(q === next ? 2.6 + Math.sin(t * 9) * 0.5 : 2.2);
    },
  };
}

function vTracking() {
  const g = new THREE.Group(), R = 0.7;
  const road = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.82, 72), toonMat({ color: 0x2a2f45 }));
  road.rotation.x = -Math.PI / 2; road.position.y = -0.056; road.receiveShadow = true; g.add(road);
  const dashG = new THREE.BoxGeometry(0.05, 0.003, 0.012), dashM = glow(0xe8ecf4, 1.1);
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2, d = new THREE.Mesh(dashG, dashM); d.position.set(Math.cos(a) * R, -0.053, Math.sin(a) * R); d.rotation.y = -a; g.add(d); }
  const car = makeCar(0xff5a3a, true); car.scale.setScalar(0.1); g.add(car);
  const me = playerDrone(1.35); g.add(me);
  // 카메라 화각 선(드론 → 피사체 사각틀)
  const lp = new Float32Array(16 * 3), lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(0x3ad8ff).multiplyScalar(1.8), transparent: true, opacity: 0.85 }));
  lines.frustumCulled = false; g.add(lines);
  const rec = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow(0xff2d3d, 2.6)); g.add(rec);
  let ph = 0;
  const corner = new V3(), side = new V3();
  return {
    group: g,
    view: { dist: 2.05, h: 1.0, look: 0.12, angle: 2.2, spin: 0.07 },
    tick(dt, t) {
      ph += dt * 0.55;
      car.position.set(Math.cos(ph) * R, -0.055, Math.sin(ph) * R);
      _a.set(-Math.sin(ph), 0, Math.cos(ph)); orient(car, _a);
      car.userData.tick(dt, 5);
      const pd = ph - 0.62;
      me.position.set(Math.cos(pd) * (R + 0.14), 0.32 + Math.sin(t * 1.4) * 0.02, Math.sin(pd) * (R + 0.14));
      _b.copy(car.position).add(_y.set(0, 0.05, 0)).sub(me.position); orient(me, _b, UP, 0.12);
      me.userData.tick(dt, 0.6, t);
      // 사각틀
      side.crossVectors(_b, UP).normalize().multiplyScalar(0.24);
      const c = car.position, hy = 0.15, apex = me.position;
      const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => corner.copy(c).addScaledVector(side, sx).add(_y.set(0, 0.06 + sy * hy, 0)).clone());
      let k = 0; const put = (v) => { lp[k++] = v.x; lp[k++] = v.y; lp[k++] = v.z; };
      for (const v of cs) { put(apex); put(v); }
      for (let i = 0; i < 4; i++) { put(cs[i]); put(cs[(i + 1) % 4]); }
      lg.attributes.position.needsUpdate = true;
      rec.position.copy(me.position).add(_y.set(0, 0.07, 0)); rec.visible = Math.sin(t * 6) > -0.2;
    },
  };
}

function vFreestyle() {
  const g = new THREE.Group(), HY = 0.42, R = 0.33, C = new V3(0, HY + R, 0);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.014, 10, 48), glow(0xb44cff, 2.6)); hoop.position.set(0, HY, 0); g.add(hoop);
  const hoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.006, 8, 48), glow(0xff5ad6, 2)); hoop2.position.set(0, HY, 0); g.add(hoop2);
  const legM = toonMat({ color: 0x1d2236 });
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, HY - 0.26 + 0.06, 8), legM); leg.position.set(0, (HY - 0.26 - 0.06) / 2, 0); g.add(leg);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 10), legM); p.position.set(sx * 0.7, 0.19, -0.2); g.add(p);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), glow(sx < 0 ? 0xb44cff : 0x3ad8ff, 2.4)); tip.position.set(sx * 0.7, 0.46, -0.2); g.add(tip);
  }
  const me = playerDrone(1.25); g.add(me);
  const trail = new Trail(g, "#ff5ad6", 24, 0.016);
  let ph = -0.6;
  return {
    group: g,
    view: { dist: 2.0, h: 0.75, look: 0.5, angle: 1.25, spin: 0.06 },
    tick(dt, t) {
      ph += dt * 1.55;
      const s = Math.sin(ph), c = Math.cos(ph);
      me.position.set(0, C.y - R * c, -R * s);
      _a.set(0, R * s, -R * c); _b.copy(C).sub(me.position).normalize();
      orient(me, _a, _b);
      // 두 바퀴마다 한 번 배럴 롤
      const lap = Math.floor(ph / 6.2832), u = ph / 6.2832 - lap;
      if (lap % 2) { const k = Math.min(1, Math.max(0, (u - 0.3) / 0.4)); me.rotateZ(k * k * (3 - 2 * k) * Math.PI * 2); }
      me.userData.tick(dt, 0.9, t);
      trail.tick(dt, me.position);
      hoop2.rotation.z = t * 0.6;
    },
  };
}

function vSurvival() {
  const g = new THREE.Group(), R = 0.52;
  const me = playerDrone(1.35), foe = botDrone("grunt", 1, 1.35), bolts = new Bolts(g);
  g.add(me, foe);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), glow(0xffd24a, 2.4)); gem.position.set(0, 0.13, 0); g.add(gem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 32), glow(0xffd24a, 1.8)); ring.position.copy(gem.position); g.add(ring);
  let th = 0, shot = 0, side = 0;
  const muzzle = new V3();
  return {
    group: g,
    view: { dist: 2.0, h: 0.85, look: 0.3, angle: 0.25, spin: 0.08 },
    tick(dt, t) {
      th += dt * 0.42;
      me.position.set(Math.cos(th) * R, 0.38 + Math.sin(t * 1.3) * 0.04, Math.sin(th) * R);
      foe.position.set(Math.cos(th + Math.PI) * R, 0.44 + Math.sin(t * 1.1) * 0.04, Math.sin(th + Math.PI) * R);
      orient(me, _a.copy(foe.position).sub(me.position), UP, 0.1);
      orient(foe, _a.copy(me.position).sub(foe.position), UP, 0.1);
      me.userData.tick(dt, 0.6, t); foe.userData.tick(dt, 0.6, t);
      shot -= dt;
      if (shot <= 0) {
        shot = 0.2; side ^= 1;
        const from = Math.floor(t * 1.2) % 3 === 2 ? foe : me, to = from === me ? foe : me;
        muzzle.set(side ? 0.04 : -0.04, 0, -0.12).applyQuaternion(from.quaternion).add(from.position);
        _b.copy(to.position).add(_y.set(Math.sin(t * 7) * 0.03, Math.cos(t * 5) * 0.03, 0));
        bolts.fire(muzzle, _b, from === me ? 0x3ad8ff : 0xff4a3a);
      }
      bolts.tick(dt);
      gem.rotation.y = t * 1.8; ring.rotation.x = t * 1.2; ring.rotation.y = t * 0.7;
    },
  };
}

function vChallenge() {
  const g = new THREE.Group(), bolts = new Bolts(g, 14);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 10), toonMat({ color: 0x2f3643 })); pillar.position.y = 0.1; g.add(pillar);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), glow(0x3aa0ff, 2.6)); core.position.y = 0.32; g.add(core);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3aa0ff).multiplyScalar(0.5), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  shield.position.y = 0.3; g.add(shield);
  for (const a of [0.6, 2.7, 4.8]) {   // 포탑
    const tur = new THREE.Group(), tm = toonMat({ color: 0x3a4250 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), tm); base.position.y = -0.02; tur.add(base);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.07), tm); head.position.y = 0.04; tur.add(head);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.008, 0.072), glow(0x3aa0ff, 2.2)); strip.position.y = 0.05; tur.add(strip);
    tur.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); g.add(tur);
  }
  const lead = playerDrone(1.3), wing = [botDrone("grunt", 0, 1.2), botDrone("grunt", 0, 1.2)];
  const foes = [botDrone("grunt", 1, 1.2), botDrone("kamikaze", 1, 1.1), botDrone("grunt", 1, 1.2)];
  g.add(lead, ...wing, ...foes);
  let th = 0, fire = 0, k = 0;
  const muzzle = new V3();
  return {
    group: g,
    view: { dist: 2.5, h: 1.15, look: 0.32, angle: 0.8, spin: 0.07 },
    tick(dt, t) {
      th += dt * 0.38;
      const R = 0.78, y = 0.5;
      const fl = [lead, ...wing], slots = [[0, 0], [-0.22, 0.2], [-0.22, -0.2]];
      fl.forEach((d, i) => {
        const a = th + slots[i][0], r = R + slots[i][1];
        d.position.set(Math.cos(a) * r, y + (i ? -0.04 : 0) + Math.sin(t * 1.5 + i) * 0.02, Math.sin(a) * r);
        _a.set(-Math.sin(a), 0, Math.cos(a)); _b.set(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(0.6).add(UP).normalize();
        orient(d, _a, _b, 0.22); d.userData.tick(dt, 0.7, t);
      });
      foes.forEach((d, i) => {
        const a = -th * 1.2 + i * 2.1, r = 1.18;
        d.position.set(Math.cos(a) * r, 0.72 + Math.sin(t * 1.2 + i * 2) * 0.05, Math.sin(a) * r);
        orient(d, _a.set(0, 0.3, 0).sub(d.position), UP, 0.2); d.userData.tick(dt, 0.6, t);
      });
      fire -= dt;
      if (fire <= 0) {
        fire = 0.16; k++;
        const from = fl[k % 3], to = foes[(k >> 1) % 3];
        if (k % 4 === 3) { const f = foes[k % 3]; muzzle.copy(f.position); bolts.fire(muzzle, _b.set(0, 0.32, 0).addScaledVector(_a.copy(f.position).normalize(), 0.22), 0xff4a3a); }
        else { muzzle.set(0, 0, -0.1).applyQuaternion(from.quaternion).add(from.position); bolts.fire(muzzle, to.position, 0x3ad8ff); }
      }
      bolts.tick(dt);
      core.rotation.y = t * 0.8; core.rotation.x = t * 0.5;
      shield.material.opacity = 0.14 + Math.sin(t * 3) * 0.04;
    },
  };
}

// 비행훈련: 착륙장 위에서 링 세 개를 8자로 꿰는 훈련기
function vTraining() {
  const g = new THREE.Group(), legM = toonMat({ color: 0x1d2236 });
  const pad = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 40), glow(0xffd24a, 2)); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.004; g.add(pad);
  for (const [x, z, w, d] of [[-0.07, 0, 0.025, 0.2], [0.07, 0, 0.025, 0.2], [0, 0, 0.14, 0.025]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, d), glow(0xffd24a, 1.6)); b.position.set(x, 0.004, z); g.add(b); }
  const rings = [[-0.62, 0.42], [0.62, 0.42]].map(([x, y], i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 10, 40), glow(i ? 0x35ff7a : 0xffb02e, 2.4)); m.position.set(x, y, 0); g.add(m);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, y - 0.2 + 0.06, 8), legM); leg.position.set(x, (y - 0.2 - 0.06) / 2, 0); g.add(leg);
    return m;
  });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 10), toonMat({ color: 0xff7a1a })); c.position.set(Math.cos(a) * 1.05, -0.01, Math.sin(a) * 1.05); g.add(c); }
  const me = playerDrone(1.3); g.add(me);
  const trail = new Trail(g, "#ffd24a", 26, 0.014);
  let ph = 0;
  return {
    group: g,
    view: { dist: 2.5, h: 1.0, look: 0.3, angle: 0.5, spin: 0.07 },
    tick(dt, t) {
      ph += dt * 0.9;
      // 8자(렘니스케이트): 두 링을 번갈아 통과
      const s = Math.sin(ph), c = Math.cos(ph);
      me.position.set(0.62 * s, 0.42 + Math.sin(ph * 2) * 0.03, 0.42 * s * c);
      _a.set(0.62 * c, 0, 0.42 * Math.cos(ph * 2)); _b.set(-s * 0.9, 1, 0).normalize();
      orient(me, _a, _b, 0.2);
      me.userData.tick(dt, 0.7, t);
      trail.tick(dt, me.position);
      rings.forEach((r, i) => r.material.color.set((s > 0) === (i === 1) ? 0x35ff7a : 0xffb02e).multiplyScalar(2.4));
    },
  };
}

// ── 격납고 스킬 미리보기: 내 기체 + 적 셋, 3.4초마다 스킬 연출을 되풀이 ──
const addM = (c, op = 0.8, side = THREE.FrontSide) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side });
function vSkill(id, lv = 1) {
  const D = SKILLS[id] || SKILLS.lockon, col = D.color, g = new THREE.Group(), P = 3.4;
  const vk = 1 + (lv - 1) * 0.12, acc = lv >= 5 ? 0xfff0b0 : 0xffffff;   // 강화 레벨: 발동 고리가 늘고 커진다 (Lv.3 · Lv.5)
  const me = playerDrone(1.35); g.add(me);
  const home = new V3(0, 0.36, 0);
  const foes = [0, 1, 2].map((i) => { const m = botDrone("grunt", 1, 1.0); g.add(m); return { m, a: i * 2.094 + 0.5, h: 0.32 + i * 0.1, shake: 0, stun: 0, fall: 0 }; });
  const bolts = new Bolts(g, 28);
  const torus = new THREE.TorusGeometry(1, 0.02, 6, 64), sph = new THREE.SphereGeometry(1, 24, 16), cylG = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
  const mk = (geo, c, op, side) => { const m = new THREE.Mesh(geo, addM(c, op, side)); m.visible = false; g.add(m); return m; };
  const aura = [mk(torus, col, 0.9), mk(torus, 0xffffff, 0.8)], pillar = mk(cylG, col, 0.5, THREE.DoubleSide);
  if (lv >= 3) aura.push(mk(torus, acc, 0.9));
  if (lv >= 5) aura.push(mk(torus, acc, 0.9), mk(torus, col, 0.9));
  const flashes = Array.from({ length: 10 }, () => ({ m: mk(sph, col, 0.9), t: 1 }));
  const flash = (p, c = col, s = 0.06) => { const f = flashes.find((x) => x.t >= 1) || flashes[0]; f.t = 0; f.s = s; f.m.position.copy(p); f.m.material.color.set(c).multiplyScalar(1.8); f.m.visible = true; };
  const S = {};   // 스킬별 상태
  let cyc = -1, last = 0;
  const foePos = (f) => f.m.position;
  // 스킬별 준비
  if (id === "lockon") S.br = foes.map(() => mk(torus, col, 0.9));
  if (id === "overdrive") { S.trail = new Trail(g, col, 22, 0.02); S.ang = 0; }
  if (id === "swarm") { const cg = new THREE.ConeGeometry(0.012, 0.05, 6); cg.rotateX(Math.PI / 2); S.ms = Array.from({ length: 12 }, () => ({ m: (() => { const m = new THREE.Mesh(cg, glow(0xffffff, 1.5)); m.visible = false; g.add(m); return m; })(), t: 1, a: new V3(), c: new V3(), b: new V3(), f: null })); S.dots = new Trail(g, col, 40, 0.012); S.k = 0; }
  if (id === "emp") { S.charge = mk(sph, col, 0.4, THREE.BackSide); S.shell = mk(sph, col, 0.5, THREE.DoubleSide); S.ring = mk(torus, 0xffffff, 0.9); }
  if (id === "aegis") { const ig = new THREE.IcosahedronGeometry(0.24, 1); S.dome = new THREE.Mesh(ig, addM(col, 0.12, THREE.DoubleSide)); S.wire = new THREE.LineSegments(new THREE.WireframeGeometry(ig), new THREE.LineBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.6), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); S.dome.add(S.wire); S.dome.visible = false; g.add(S.dome); S.q = []; S.hit = 0; }
  if (id === "orbital") { S.mark = mk(torus, col, 0.9); S.mark2 = mk(torus, 0xffffff, 0.6); S.guide = mk(cylG, col, 0.4, THREE.DoubleSide); S.beam = mk(cylG, col, 0.6, THREE.DoubleSide); S.core = mk(cylG, 0xffffff, 0.9, THREE.DoubleSide); }
  const _p = new V3(), _q = new V3();
  return {
    group: g,
    view: { dist: 2.9, h: 1.25, look: 0.3, angle: 0.55, spin: 0.1 },
    tick(dt, t) {
      const c = Math.floor(t / P), u = t - c * P, fresh = c !== cyc;
      if (fresh) { cyc = c; last = 0; for (const f of foes) { f.stun = 0; f.fall = 0; } if (S.trail) S.ang = 0; }
      // 적 셋: 천천히 둘레를 돈다 (마비·추락·흔들림 반영)
      foes.forEach((f, i) => {
        f.a += dt * 0.22;
        const sink = f.fall > 0 ? Math.min(0.28, f.fall * 0.5) : f.stun > 0 ? 0.08 : 0;
        f.m.position.set(Math.cos(f.a) * 0.74, f.h - sink + Math.sin(t * 1.3 + i) * 0.025, Math.sin(f.a) * 0.74);
        if (f.shake > 0) { f.shake -= dt * 3; f.m.position.x += (Math.random() - 0.5) * 0.03 * f.shake; f.m.position.y += (Math.random() - 0.5) * 0.03 * f.shake; }
        orient(f.m, _a.copy(me.position).sub(f.m.position), UP, 0.1);
        if (f.fall > 0) { f.fall += dt; f.m.rotateZ(f.fall * 3); }
        if (f.stun > 0) { f.stun -= dt; f.m.rotateZ(Math.sin(t * 40) * 0.15); if (Math.random() < dt * 8) flash(_p.copy(f.m.position).add(_q.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.12)), 0x9fc0ff, 0.025); }
        f.m.userData.tick(dt, f.stun > 0 ? 0.1 : 0.6, t);
      });
      // 내 기체
      if (id !== "overdrive" || u > 2.6 || u < 0.2) me.position.lerp(_p.set(0, 0.36 + Math.sin(t * 1.6) * 0.015, 0), Math.min(1, dt * 6));
      me.userData.tick(dt, 0.7, t);
      // 공통 발동 연출: 퍼지는 고리 두 겹 + 솟는 빛 기둥
      const e = clamp01(u / 0.6), ee = 1 - (1 - e) * (1 - e);
      aura.forEach((r, i) => { r.visible = u < 0.6; r.position.copy(me.position); r.position.y += -0.05 + i * 0.06 + ee * 0.05; r.rotation.x = Math.PI / 2; r.scale.setScalar((0.05 + ee * (0.45 + i * 0.25)) * vk); r.material.opacity = 0.9 * (1 - e); });
      pillar.visible = u < 0.6; pillar.position.copy(me.position); pillar.position.y += 0.6; pillar.scale.set((0.05 + ee * 0.08) * vk * vk, 1.4, (0.05 + ee * 0.08) * vk * vk); pillar.material.opacity = 0.5 * (1 - e);
      // ── 스킬별 ──
      if (id === "lockon") {
        const on = u > 0.3 && u < 2.7;
        S.br.forEach((b, i) => { b.visible = on; b.position.copy(foes[i].m.position); b.quaternion.copy(me.quaternion); b.rotateZ(t * 4); b.scale.setScalar(0.09 + (u < 0.45 ? (0.45 - u) * 0.6 : 0)); });
        if (on) {
          if ((S.ft = (S.ft || 0) - dt) <= 0) {
            S.ft = 0.07; S.k = ((S.k || 0) + 1) % 3; const f = foes[S.k];
            orient(me, _a.copy(f.m.position).sub(me.position), UP, 0.05);
            _p.set(S.k % 2 ? 0.04 : -0.04, 0, -0.1).applyQuaternion(me.quaternion).add(me.position);
            bolts.fire(_p, f.m.position, col); f.shake = 0.6;
          }
        }
      } else if (id === "overdrive") {
        if (u > 0.2 && u < 2.6) {
          S.ang += dt * 6.5;
          const r = 0.5 + Math.sin(S.ang * 0.5) * 0.08;
          _p.set(Math.cos(S.ang) * r, 0.42 + Math.sin(S.ang * 2) * 0.06, Math.sin(S.ang) * r);
          _q.set(-Math.sin(S.ang), 0, Math.cos(S.ang));
          me.position.copy(_p); orient(me, _q, UP, 0.5);
          for (const f of foes) if (f.m.position.distanceTo(me.position) < 0.2 && f.shake <= 0) { f.shake = 1; flash(f.m.position, col, 0.09); }
          if (u < 0.3) flash(me.position, 0xffffff, 0.12);
        }
        S.trail.tick(dt, me.position);
      } else if (id === "swarm") {
        if (u > 0.25 && u < 1.15 && (S.ft = (S.ft || 0) - dt) <= 0) {
          S.ft = 0.075;
          const m = S.ms.find((x) => x.t >= 1);
          if (m) {
            const k = S.k++, f = foes[k % 3], side = k % 2 ? 1 : -1;
            m.f = f; m.t = 0; m.a.copy(me.position); m.c.copy(f.m.position);
            _x.set(1, 0, 0).applyQuaternion(me.quaternion);
            m.b.copy(me.position).addScaledVector(_x, side * (0.25 + (k % 4) * 0.05)).add(_q.set(0, 0.35 + (k % 3) * 0.08, 0));
            m.m.visible = true; flash(me.position, col, 0.04);
          }
        }
        for (const m of S.ms) {
          if (m.t >= 1) { m.m.visible = false; continue; }
          m.t += dt / 0.65;
          const k = Math.min(1, m.t), a1 = 1 - k;
          m.c.copy(m.f.m.position);
          _p.copy(m.a).multiplyScalar(a1 * a1).addScaledVector(m.b, 2 * a1 * k).addScaledVector(m.c, k * k);
          _q.copy(_p).sub(m.m.position);
          m.m.position.copy(_p); if (_q.lengthSq() > 1e-8) m.m.lookAt(_p.clone().add(_q));
          S.dots.tick(dt / 3, _p);
          if (m.t >= 1) { flash(m.c, 0xffa040, 0.08); m.f.shake = 1; m.m.visible = false; }
        }
      } else if (id === "emp") {
        S.charge.visible = u > 0.15 && u < 0.7;
        const ck = clamp01((u - 0.15) / 0.55);
        S.charge.position.copy(me.position); S.charge.scale.setScalar(0.7 * (1 - ck) + 0.05); S.charge.material.opacity = 0.1 + 0.45 * ck;
        const bk = clamp01((u - 0.7) / 0.7), be = 1 - Math.pow(1 - bk, 3);
        S.shell.visible = S.ring.visible = u > 0.7 && u < 1.4;
        S.shell.position.copy(me.position); S.shell.scale.setScalar(0.05 + be * 0.95); S.shell.material.opacity = 0.5 * (1 - bk);
        S.ring.position.copy(me.position); S.ring.rotation.x = Math.PI / 2; S.ring.scale.setScalar(0.05 + be * 1.05); S.ring.material.opacity = 0.9 * (1 - bk);
        if (u > 0.7 && last <= 0.7) { flash(me.position, 0xffffff, 0.25); for (const f of foes) { f.stun = 2; f.shake = 1; } }
        if (u > 0.15 && u < 0.7 && Math.random() < dt * 25) flash(_p.copy(me.position).add(_q.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5)), col, 0.02);
      } else if (id === "aegis") {
        const on = u > 0.2 && u < 3.1;
        S.dome.visible = on; S.dome.position.copy(me.position); S.dome.rotation.y = t * 0.6;
        S.hit = Math.max(0, S.hit - dt * 3);
        const sIn = clamp01((u - 0.2) / 0.2);
        S.dome.scale.setScalar(0.5 + 0.5 * sIn + S.hit * 0.08); S.dome.material.opacity = 0.1 + S.hit * 0.3; S.wire.material.opacity = 0.4 + S.hit * 0.5;
        if (on && u < 2.8 && (S.ft = (S.ft || 0) - dt) <= 0) {
          S.ft = 0.32; const f = foes[(S.k = ((S.k || 0) + 1) % 3)];
          _q.copy(f.m.position).sub(me.position).normalize();
          const hitAt = me.position.clone().addScaledVector(_q, 0.24);
          bolts.fire(f.m.position, hitAt, 0xff4a3a);
          S.q.push({ at: hitAt, f, wait: f.m.position.distanceTo(hitAt) / 3.4 });
        }
        for (let i = S.q.length - 1; i >= 0; i--) { const q = S.q[i]; if ((q.wait -= dt) > 0) continue; S.q.splice(i, 1); S.hit = 1; bolts.fire(q.at, q.f.m.position, col); q.f.shake = 0.8; }
      } else if (id === "orbital") {
        const f = foes[0], at = _p.copy(f.m.position); at.y = 0.005;
        const mk1 = u > 0.2 && u < 1.6;
        S.mark.visible = S.mark2.visible = S.guide.visible = mk1;
        const blink = 0.6 + 0.4 * Math.sin(u * (10 + u * 20));
        S.mark.position.copy(at); S.mark.rotation.x = -Math.PI / 2; S.mark.scale.setScalar(0.2); S.mark.material.opacity = 0.9 * blink;
        S.mark2.position.copy(at); S.mark2.rotation.x = -Math.PI / 2; S.mark2.scale.setScalar(0.2 * (1 - clamp01((u - 0.2) / 1.4)) + 0.02);
        S.guide.position.set(at.x, 1.6, at.z); S.guide.scale.set(0.005, 3.2, 0.005); S.guide.material.opacity = 0.3 + 0.4 * clamp01((u - 0.2) / 1.4);
        const bk = clamp01((u - 1.6) / 0.8), bs = bk < 0.1 ? bk / 0.1 : 1 - Math.max(0, (bk - 0.5) / 0.5);
        S.beam.visible = S.core.visible = u > 1.6 && u < 2.4;
        S.beam.position.set(at.x, 1.6, at.z); S.beam.scale.set(0.1 * bs + 0.001, 3.2, 0.1 * bs + 0.001);
        S.core.position.set(at.x, 1.6, at.z); S.core.scale.set(0.035 * bs + 0.001, 3.2, 0.035 * bs + 0.001);
        if (u > 1.6 && last <= 1.6) { flash(at.clone().setY(f.m.position.y), 0xffffff, 0.3); f.fall = 0.01; for (const o of foes) o.shake = 1; }
        if (u > 1.6 && u < 2.3 && Math.random() < dt * 20) flash(_q.set(at.x + (Math.random() - 0.5) * 0.3, 0.03, at.z + (Math.random() - 0.5) * 0.3), 0xffa060, 0.05);
      }
      last = u;
      bolts.tick(dt);
      for (const f of flashes) { if (f.t >= 1) { f.m.visible = false; continue; } f.t += dt / 0.3; f.m.scale.setScalar(f.s * (0.4 + f.t)); f.m.material.opacity = 0.9 * (1 - f.t); }
    },
  };
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));

const VIGNETTES = { race: vRace, tracking: vTracking, freestyle: vFreestyle, survival: vSurvival, challenge: vChallenge, training: vTraining };

// 슬롯 부착점 (기체 안쪽 g 기준 좌표, 없으면 null) — 정비소 카메라 · 부품 카드
export function partAnchor(model, slot) {
  const A = model && model.userData.anchors;
  if (!slot || !A) return null;
  const p = { armor: A.plates && A.plates[0], motor: A.motors && A.motors[0], battery: A.belly, laser: A.laser, missile: A.pods, sensor: A.sensor, shield: A.shield, cooler: A.cooler }[slot];
  if (!p) return null;
  const v = new V3(p[0], p[1], p[2]);
  if (slot === "sensor") v.y += 0.02; else if (slot === "laser") v.z -= 0.02;
  return v;
}

// ── 무대 ───────────────────────────────────────────────────
export class MenuScene {
  constructor(o = {}) {
    this.thumb = !!o.thumb;
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(0x121a40);
    sc.fog = new THREE.Fog(0x121a40, 3.5, 11);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    // 만화풍 쇼룸: 흰 주광 + 청록·주황 림 라이트가 툰 밴드와 림을 또렷하게 만든다
    sc.add(new THREE.HemisphereLight(0xc4d2ff, 0x2a2350, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(2, 4, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 12 });
    sc.add(key);
    const rim = new THREE.DirectionalLight(0x21d4fd, 1.5); rim.position.set(-3, 1.5, -2.5); sc.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff5a1f, 1.2); rim2.position.set(3, 0.8, -2); sc.add(rim2);
    const padMat = toonMat({ color: 0x2a3566 }), baseMat = toonMat({ color: 0x1b2248 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.03, 48), padMat);
    pad.position.y = -0.015; pad.receiveShadow = true; sc.add(pad);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.03, 48), baseMat);
    base.position.y = -0.045; base.receiveShadow = true; sc.add(base);
    const gl = glow(0x21d4fd);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.007, 8, 64), gl);
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.028; sc.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, dot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.016), i % 2 ? gl : padMat);
      dot.position.set(Math.cos(a) * 0.5, -0.028, Math.sin(a) * 0.5); dot.rotation.y = -a + Math.PI / 2; sc.add(dot);
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), toonMat({ color: 0xffffff, map: floorTexture() }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.06; floor.receiveShadow = true; sc.add(floor);
    this.pivot = new THREE.Group(); sc.add(this.pivot);
    this.angle = 0.6; this.spin = 0.35; this.t = 0; this.close = false; this.drag = 0;
    this.focus = null;     // 3D 를 보여 줄 화면 영역 {x, y, w, h} (화면 중심 기준 위치)
    this.mode = null; this.vig = null;
    this.studio = null;    // 정비소 카메라 { pitch, zoom, slot, aim } — 켜져 있으면 드래그·확대·부품 맞춤으로 본다
    if (!this.thumb) {
      // 부품 표지: 고른 부품 자리를 감싸는 빛 고리
      const mk = (r, t, op) => new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ff0ff).multiplyScalar(1.6), transparent: true, opacity: op, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.mark = new THREE.Group(); this.mark.add(mk(1, 0.03, 0.9), mk(1.35, 0.012, 0.5));
      this.mark.visible = false; this.mark.renderOrder = 10; this.mark.children.forEach((m) => (m.renderOrder = 10));
      sc.add(this.mark);
    }
    this.setLook(settings.drone);
  }

  // ── 정비소 카메라 ──
  // on: 켜고 끄기. 켜면 기체를 크게, 손으로 돌려 보고(orbit) 휠·핀치로 확대한다
  studioOn(on) {
    if (!on) { this.studio = null; if (this.mark) this.mark.visible = false; return; }
    if (!this.studio) this.studio = { pitch: 0.38, zoom: 1, slot: null, aim: null, idle: 0, _p: 0.38, _z: 1, _f: 0, _t: new V3(0, 0.17, 0) };
  }
  // 부품 자리로 카메라를 맞춘다 (null 이면 기체 전체)
  studioFocus(slot) {
    const S = this.studio;
    if (!S || S.slot === slot) return;
    S.slot = slot || null;
    const a = this._anchor(S.slot);
    if (a) { S.aim = Math.atan2(a.x, a.z) + (a.z < -0.02 ? 0.5 : 0.45); S.pitch = a.y < -0.004 ? -0.22 : 0.42; S.zoom = 1; }
    else { S.aim = null; S.pitch = 0.38; }
    S.idle = 2.5;
  }
  // 손으로 돌리기: dx·dy 픽셀
  studioDrag(dx, dy) {
    const S = this.studio; if (!S) { this.angle -= dx * 0.008; this.drag = 0; return; }   // 스킬 미리보기 장면은 좌우로만
    this.angle -= dx * 0.009; S.pitch = Math.max(-0.75, Math.min(1.15, S.pitch + dy * 0.006)); S.aim = null; S.idle = 3; this.drag = 0;
  }
  studioZoom(k) { const S = this.studio; if (!S) return; S.zoom = Math.max(0.45, Math.min(1.7, S.zoom * k)); S.idle = 3; }
  studioReset() { const S = this.studio; if (!S) return; S.zoom = 1; S.pitch = 0.38; S.slot = null; S.aim = null; S.idle = 0; }
  _anchor(slot) { return partAnchor(this.model, slot); }

  // parts: 미리보기용 파츠 구성 (주지 않으면 지금 장착한 것)
  setLook(look, parts) {
    if (this.model) { this.pivot.remove(this.model); this.model.userData.dispose(); }
    const cls = DRONE_CLASSES[look.cls] || DRONE_CLASSES.freestyle;
    this.model = buildDrone(look, cls.scale, { parts: parts || partLook() });
    this.model.position.y = 0.16;
    this.pivot.add(this.model);
    this.size = cls.scale;
    if (this.mode) { const m = this.mode; this.mode = null; this.setMode(m); }
  }

  // 격납고 스킬 미리보기 (null 이면 끈다)
  previewSkill(id) {
    id = id && SKILLS[id] ? id : null;
    const lv = id ? skillLv(id) : 0;
    if (id === this.skillId && lv === this.skillLvl) return;
    this.skillLvl = lv;
    if (this.skillVig) { this.scene.remove(this.skillVig.group); disposeTree(this.skillVig.group); this.skillVig = null; }
    const was = this.skillId;
    this.skillId = id;
    this.pivot.visible = !id && !this.mode;
    if (!id) return;
    this.skillVig = vSkill(id, lv);
    toonify(this.skillVig.group);
    this.skillVig.group.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
    this.scene.add(this.skillVig.group);
    if (id !== was) this.angle = this.skillVig.view.angle;
  }

  // 모드별 미니 장면으로 바꾼다 (null 이면 받침대 위 드론)
  setMode(id) {
    id = VIGNETTES[id] ? id : null;
    if (id && this.skillId) this.previewSkill(null);
    if (id === this.mode) return;
    if (this.vig) { this.scene.remove(this.vig.group); disposeTree(this.vig.group); this.vig = null; }
    this.mode = id;
    this.pivot.visible = !id && !this.skillId;
    if (!id) return;
    this.vig = VIGNETTES[id]();
    toonify(this.vig.group);
    this.vig.group.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
    this.scene.add(this.vig.group);
    this.angle = this.vig.view.angle;
    this.vig.tick(0.001, this.t);
  }

  update(dt, aspect) {
    this.t += dt;
    const W = innerWidth, H = innerHeight, f = this.thumb ? null : this.focus;
    // 3D 영역이 화면보다 작으면 그만큼 멀리서 본다
    const fit = f ? Math.max(0.42, Math.min(1, (f.w / W) * 1.45, (f.h / H) * 1.08)) : 1;
    const narrow = Math.min(1, aspect * 0.9);
    this.camera.aspect = aspect;
    if (f) this.camera.setViewOffset(W, H, -f.x, -f.y, W, H); else this.camera.clearViewOffset();
    const VG = this.vig || this.skillVig;
    if (VG) {
      const v = VG.view;
      VG.tick(dt, this.t);
      this.angle += (v.spin + this.drag) * dt;
      this.drag *= Math.exp(-dt * 5);
      const d = v.dist / fit / Math.max(0.62, narrow);
      this.camera.position.set(Math.sin(this.angle) * d, v.h * (d / v.dist), Math.cos(this.angle) * d);
      this.camera.lookAt(0, v.look, 0);
    } else if (this.studio) {
      const S = this.studio;
      S.idle = Math.max(0, S.idle - dt);
      if (S.aim !== null) {
        let d = S.aim - this.angle; d = Math.atan2(Math.sin(d), Math.cos(d));
        this.angle += d * Math.min(1, dt * 4.5);
        if (Math.abs(d) < 0.01) S.aim = null;
      } else if (!S.idle) this.angle += (S.slot ? 0.05 : 0.16) * dt;
      const k = Math.min(1, dt * 6);
      S._p += (S.pitch - S._p) * k; S._z += (S.zoom - S._z) * k; S._f += ((S.slot ? 1 : 0) - S._f) * k;
      const mn = f ? Math.max(120, Math.min(f.w, f.h * 1.3)) : Math.min(W, H * 1.3), d0 = 0.7 * (0.55 + this.size * 0.5) * H / mn;   // 무대 영역의 짧은 변에 기체가 알맞게 차도록
      const near = S.slot === "armor" || S.slot === "motor" ? 0.5 : S.slot === "shield" || S.slot === "cooler" ? 0.42 : 0.38, dist = d0 * (1 - (1 - near) * S._f) * S._z;   // 넓게 퍼진 부품(장갑·모터)은 조금 멀리서
      this.model.position.y = 0.16 + Math.sin(this.t * 1.6) * 0.008 * (1 - S._f);
      this.model.rotation.z = Math.sin(this.t * 1.1) * 0.04 * (1 - S._f);
      this.model.rotation.x = Math.cos(this.t * 0.9) * 0.03 * (1 - S._f);
      this.model.updateMatrixWorld(true);
      const a = this._anchor(S.slot), T = _a.set(0, 0.15, 0);
      if (a && this.model.userData.inner) { this.model.userData.inner.localToWorld(a); T.lerp(a, S._f); }
      S._t.lerp(T, Math.min(1, dt * 7));
      const cp = Math.cos(S._p);
      this.camera.position.set(S._t.x + Math.sin(this.angle) * cp * dist, S._t.y + Math.sin(S._p) * dist, S._t.z + Math.cos(this.angle) * cp * dist);
      this.camera.lookAt(S._t);
      if (this.mark) {
        this.mark.visible = !!a && S._f > 0.3;
        if (a) {
          this.mark.position.copy(a); this.mark.quaternion.copy(this.camera.quaternion);
          const r = (0.016 + 0.004 * Math.sin(this.t * 4)) * this.size * (0.6 + 0.4 * S._z);
          this.mark.scale.setScalar(r); this.mark.children[1].rotation.z = this.t * 0.8;
          for (const m of this.mark.children) m.material.opacity = (m === this.mark.children[0] ? 0.85 : 0.45) * Math.min(1, (S._f - 0.3) * 2);
        }
      }
      this.model.userData.tick(dt, 0.3, this.t);
    } else {
      this.angle += (this.spin + this.drag) * dt;
      this.drag *= Math.exp(-dt * 5);
      // 파츠 살펴보기(low): 더 가까이, 기체 높이에서 본다 — 배 아래 무장·배터리가 보이게
      const lk = (this._low = (this._low || 0) + ((this.low ? 1 : 0) - (this._low || 0)) * Math.min(1, dt * 5));
      const d = (this.close ? 0.62 : 0.95) * (0.55 + this.size * 0.5) / fit / narrow * (1 - 0.3 * lk);
      this.camera.position.set(Math.sin(this.angle) * d, 0.16 + d * (0.42 - 0.47 * lk), Math.cos(this.angle) * d);
      this.camera.lookAt(0, this.close ? 0.15 : 0.15 + d * 0.3, 0);
      this.model.position.y = 0.16 + Math.sin(this.t * 1.6) * 0.012;
      this.model.rotation.z = Math.sin(this.t * 1.1) * 0.05;
      this.model.rotation.x = Math.cos(this.t * 0.9) * 0.04;
      this.model.userData.tick(dt, 0.35, this.t);
    }
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    if (this.vig) disposeTree(this.vig.group);
    if (this.skillVig) disposeTree(this.skillVig.group);
    disposeTree(this.scene);
  }
}

// ── 썸네일: 모드 장면과 맵을 작은 이미지로 구워 카드에 쓴다 ─────────────
const MAP_VIEW = {
  city: [[-20, 34, 96], [30, 14, 20]],
  canyon: [[20, 70, 60], [-60, 30, -10]],
  factory: [[-36, 18, -70], [40, 14, -150]],
  arena: [[-88, 14, -50], [20, 10, 10]],
};
const CACHE = "hgfpv-mapthumb-3:";

export class Thumbs {
  constructor() {
    this.mode = {}; this.map = {}; this.frame = {}; this.canopy = {}; this.part = {};
    this.jobs = []; this.r = null; this.stage = null; this.timer = 0;
    this.listeners = new Set();
    for (const id of Object.keys(MAPS)) { try { const v = localStorage.getItem(CACHE + id); if (v) this.map[id] = v; } catch (_) { /* 저장소 없음 */ } }
  }

  onReady(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(kind, id, url) { for (const fn of this.listeners) fn(kind, id, url); }

  // 아직 없는 썸네일만 작업 목록에 넣는다
  want(kind, ids) {
    for (const id of ids) {
      if (this[kind][id] || this.jobs.some((j) => j.kind === kind && j.id === id)) continue;
      if (kind === "map" && !(MAPS[id] && (MAPS[id].thumb || MAP_VIEW[id]))) continue;
      if (kind === "part") this.jobs.unshift({ kind, id }); else this.jobs.push({ kind, id });   // 정비소 부품 카드는 지금 보는 것부터
    }
    if (!this.timer && this.jobs.length) this.timer = setTimeout(() => this._pump(), kind === "map" ? 350 : 120);
  }

  _renderer(w, h) {
    if (!this.r) {
      const cv = document.createElement("canvas");
      this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      this.r.toneMapping = THREE.CustomToneMapping;
      this.r.setPixelRatio(1);
    }
    this.r.setSize(w, h, false);
    return this.r;
  }

  _pump() {
    this.timer = 0;
    const job = this.jobs.shift();
    if (!job) return this._release();
    let url = null;
    try { url = job.kind === "mode" ? this._modeShot(job.id) : job.kind === "frame" || job.kind === "canopy" ? this._frameShot(job.id, job.kind) : job.kind === "part" ? this._partShot(job.id) : this._mapShot(job.id); }
    catch (e) { console.warn("썸네일을 만들지 못했습니다", job, e); }
    if (url) { this[job.kind][job.id] = url; this._emit(job.kind, job.id, url); }
    if (this.jobs.length) this.timer = setTimeout(() => this._pump(), this.jobs[0].kind === "map" ? 250 : this.jobs[0].kind === "frame" || this.jobs[0].kind === "canopy" || this.jobs[0].kind === "part" ? 30 : 16);
    else this.timer = setTimeout(() => this._release(), 1500);
  }

  _modeShot(id) {
    const st = this.stage || (this.stage = new MenuScene({ thumb: true }));
    st.setMode(id);
    st.angle += 0.35;
    for (let i = 0; i < 48; i++) st.update(1 / 30, 1.6);
    const r = this._renderer(480, 300);
    r.render(st.scene, st.camera);
    return r.domElement.toDataURL("image/jpeg", 0.86);
  }

  // 격납고 프레임 카드: 같은 색(중립 회색 + 주황)으로 형상만 비교되게 비스듬히 위에서 찍는다
  _frameShot(id, kind = "frame") {
    const r = this._renderer(200, 128);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x141c30);
    sc.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a3040, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 1.5); sc.add(sun);
    const look = { frame: kind === "frame" ? id : "x", canopy: kind === "canopy" ? id : "racer", props: 3, skin: "solid", frameColor: "#4a5262", accentColor: "#ff6a2a", propColor: "#7fdcff", ledColor: "#3dff7c", ledMode: "solid" };
    const d = buildDrone(look, 1);
    d.userData.tick(0.016, 0, 0);
    sc.add(d);
    const box = new THREE.Box3().setFromObject(d), c = box.getCenter(new THREE.Vector3()), rad = box.getSize(new THREE.Vector3()).length() / 2;
    const cam = new THREE.PerspectiveCamera(30, 200 / 128, 0.01, 10);
    cam.position.set(c.x + rad * 1.5, c.y + rad * 2.1, c.z + rad * 2.3); cam.lookAt(c);
    r.render(sc, cam);
    const url = r.domElement.toDataURL("image/jpeg", 0.85);
    d.userData.dispose();
    return url;
  }

  // 정비소 부품 카드: id "슬롯.부품.단계" — 그 부품을 단 기체를 부품 자리에 바짝 붙어 찍는다
  _partShot(id) {
    const [slot, v, lv] = id.split("."), W = 200, H = 140, r = this._renderer(W, H);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x111a2e);
    sc.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a3040, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(2, 3, 2.5); sc.add(sun);
    const rim = new THREE.DirectionalLight(0x21d4fd, 1.4); rim.position.set(-2, 0.5, -2); sc.add(rim);
    const look = { frame: "x", canopy: "racer", props: 3, skin: "solid", frameColor: "#4a5262", accentColor: "#ff6a2a", propColor: "#7fdcff", ledColor: "#3dff7c", ledMode: "solid" };
    const parts = partLook({ slot, v, lv: Math.max(0, Math.min(5, +lv || 0)) });
    const d = buildDrone(look, 1, { parts });
    d.userData.tick(0.016, 0, 0); sc.add(d); d.updateMatrixWorld(true);
    const a = partAnchor(d, slot) || new THREE.Vector3();
    const ax = Math.atan2(a.x, a.z) + 0.5, el = a.y < -0.004 ? -0.35 : 0.5, dist = slot === "armor" || slot === "motor" ? 0.17 : 0.13;
    const cam = new THREE.PerspectiveCamera(32, W / H, 0.005, 10);
    cam.position.set(a.x + Math.sin(ax) * Math.cos(el) * dist, a.y + Math.sin(el) * dist, a.z + Math.cos(ax) * Math.cos(el) * dist); cam.lookAt(a);
    r.render(sc, cam);
    const url = r.domElement.toDataURL("image/jpeg", 0.86);
    d.userData.dispose();
    return url;
  }

  _mapShot(id) {
    if (MAPS[id].thumbDraw) return MAPS[id].thumbDraw(480, 300);   // 대형 맵: 짓지 않고 대륙 지도 그림으로
    const r = this._renderer(480, 300), w = new World(MAPS[id], "low", r), [p, l] = MAPS[id].thumb ? [MAPS[id].thumb.pos, MAPS[id].thumb.look] : MAP_VIEW[id];
    try {
      const cam = new THREE.PerspectiveCamera(62, 1.6, 0.1, 4000);
      cam.position.set(...p); cam.lookAt(...l); cam.updateMatrixWorld();
      for (let i = 0; i < 3; i++) w.update(1 / 30);
      w.follow(cam, cam.position);
      r.render(w.scene, cam);
      const url = r.domElement.toDataURL("image/jpeg", 0.82);
      try { localStorage.setItem(CACHE + id, url); } catch (_) { /* 저장 공간 부족 */ }
      return url;
    } finally { w.dispose(); }
  }

  _release() {
    this.timer = 0;
    if (this.jobs.length) { this.timer = setTimeout(() => this._pump(), 30); return; }   // 기다리는 동안 새 작업이 들어왔다
    if (this.stage) { this.stage.dispose(); this.stage = null; }
    if (this.r) { this.r.dispose(); this.r.forceContextLoss(); this.r = null; }
  }
}
