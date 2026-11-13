// 메뉴 3D 무대: 정비소 받침대 + 모드별 미니 장면(움직이는 3D 미리보기), 카드 썸네일·맵 미리보기 렌더러
import * as THREE from "../vendor/three.module.min.js";
import { settings, DRONE_CLASSES } from "./config.js";
import { buildDrone, botLook } from "./dronemodel.js";
import { makeCar } from "./entities.js";
import { toonMat, toonify } from "./toon.js";
import { World } from "./world.js";
import { MAPS } from "./maps/index.js";

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
function playerDrone(s = 1.45) { const d = buildDrone(settings.drone, s); return d; }
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

const VIGNETTES = { race: vRace, tracking: vTracking, freestyle: vFreestyle, survival: vSurvival, challenge: vChallenge };

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
    this.setLook(settings.drone);
  }

  setLook(look) {
    if (this.model) { this.pivot.remove(this.model); this.model.userData.dispose(); }
    const cls = DRONE_CLASSES[look.cls] || DRONE_CLASSES.freestyle;
    this.model = buildDrone(look, cls.scale);
    this.model.position.y = 0.16;
    this.pivot.add(this.model);
    this.size = cls.scale;
    if (this.mode) { const m = this.mode; this.mode = null; this.setMode(m); }
  }

  // 모드별 미니 장면으로 바꾼다 (null 이면 받침대 위 드론)
  setMode(id) {
    id = VIGNETTES[id] ? id : null;
    if (id === this.mode) return;
    if (this.vig) { this.scene.remove(this.vig.group); disposeTree(this.vig.group); this.vig = null; }
    this.mode = id;
    this.pivot.visible = !id;
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
    if (this.vig) {
      const v = this.vig.view;
      this.vig.tick(dt, this.t);
      this.angle += (v.spin + this.drag) * dt;
      this.drag *= Math.exp(-dt * 5);
      const d = v.dist / fit / Math.max(0.62, narrow);
      this.camera.position.set(Math.sin(this.angle) * d, v.h * (d / v.dist), Math.cos(this.angle) * d);
      this.camera.lookAt(0, v.look, 0);
    } else {
      this.angle += (this.spin + this.drag) * dt;
      this.drag *= Math.exp(-dt * 5);
      const d = (this.close ? 0.62 : 0.95) * (0.55 + this.size * 0.5) / fit / narrow;
      this.camera.position.set(Math.sin(this.angle) * d, 0.16 + d * 0.42, Math.cos(this.angle) * d);
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
    this.mode = {}; this.map = {};
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
      this.jobs.push({ kind, id });
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
    try { url = job.kind === "mode" ? this._modeShot(job.id) : this._mapShot(job.id); }
    catch (e) { console.warn("썸네일을 만들지 못했습니다", job, e); }
    if (url) { this[job.kind][job.id] = url; this._emit(job.kind, job.id, url); }
    if (this.jobs.length) this.timer = setTimeout(() => this._pump(), this.jobs[0].kind === "map" ? 250 : 16);
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

  _mapShot(id) {
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
