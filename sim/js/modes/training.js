// 비행훈련: ACRO 전용. 과목의 수행 과제를 순서대로 해내면 통과
import * as THREE from "../../vendor/three.module.min.js";
import { Mode } from "./base.js";
import { settings, save, fmtTime, STICK_MODES, clamp } from "../config.js";
import { LESSONS, COURSES, TRICK_DEMO } from "../training.js";

const TAU = Math.PI * 2;
const _up = new THREE.Vector3(), _v = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
const TRICK_NAME = { rollL: "왼쪽 롤", rollR: "오른쪽 롤", flipB: "백플립", flipF: "프론트 플립", loop: "파워 루프", spin: "요 스핀" };
const C_NOW = 0x35ff7a, C_NEXT = 0xffb02e, C_ZONE = 0x3ad8ff;

// 맵별 훈련장 위치(없으면 출발 지점): 앞쪽 50m·좌우 20m·높이 35m 가 비어 있는 곳
export const SITES = {
  factory: { pos: [-2, 0.3, 134], yaw: 0 },
  arena: { pos: [-28, 0.4, -4], yaw: 270 },
  moon: { pos: [0, 0.3, 80], yaw: 180 },
  snow: { pos: [60, 0.5, 120], yaw: 0 },
  palace: { pos: [-15, 0.3, 45], yaw: 0 },
};

const basic = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false, side: THREE.DoubleSide });

export class TrainingMode extends Mode {
  constructor(session, cfg) {
    super(session, cfg);
    this.lesson = LESSONS.find((l) => l.id === cfg.lesson) || LESSONS[0];
    const co = COURSES.find((c) => c.id === this.lesson.course);
    this.title = `비행훈련 · ${co.name} ${this.lesson.no} ${this.lesson.name}`;
    this.tasks = this.lesson.tasks.map((t) => ({ ...t, acc: 0 }));
    this.ti = 0; this.taskT = 0;
    this.crashes = 0; this._wasCrashed = false;
    this.flown = false;
    this.rot = { roll: 0, pitch: 0, yaw: 0 };
    this.flipY0 = 0; this.flipYMax = 0;
    this.dive = 0; this.diveTop = 0;
    this.group = new THREE.Group();
    this.objs = [];
    this.pulse = 0;
    this.demoKey = this.lesson.demo || null;    // 트릭 과목: 시범을 먼저 보여 준다
    this.demo = null;
  }

  start() {
    const s = this.s, site = SITES[s.map.id] || s.map.spawn || { pos: [0, 0.3, 0], yaw: 0 };
    const yaw = (site.yaw || 0) * Math.PI / 180;
    this.origin = new THREE.Vector3(...site.pos);
    this.ground = s.world.h(this.origin.x, this.origin.z);
    this.fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    this.placePlayer(this.origin, yaw);
    // 훈련은 ACRO 로만. 평소 쓰던 비행 모드 설정은 건드리지 않는다
    this._fm = settings.flightMode;
    s.player.flightMode = "ACRO";
    s.world.scene.add(this.group);
    this.enter(0);
    if (this.demoKey) this.startDemo();
  }

  // ── 시범: 스크립트대로 기체를 움직이며 스틱 입력과 설명을 보여 준다 ──
  startDemo() {
    const s = this.s, pl = s.player, phases = TRICK_DEMO[this.demoKey];
    if (!phases) return;
    const yaw = Math.atan2(-this.fwd.x, -this.fwd.z), alt = this.demoKey === "dive" ? 34 : this.demoKey === "inv" ? 24 : 16;
    let q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), p = this.P([0, alt, 8]);
    const up = new THREE.Vector3(0, 1, 0), AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
    let t0 = 0;
    const list = phases.map((ph) => {
      const o = { ...ph, t0, q0: q.clone(), p0: p.clone() };
      o.qEnd = ph.rot ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AX[ph.rot[0]], ph.rot[1] * Math.PI / 180)) : q.clone();
      o.off = (k) => {
        const v = new THREE.Vector3();
        if (ph.mv) v.addScaledVector(this.fwd, ph.mv[0] * k).addScaledVector(up, ph.mv[1] * k).addScaledVector(this.right, ph.mv[2] * k);
        if (ph.arc) { const a = (ph.arc.deg * k * Math.PI) / 180; v.addScaledVector(this.fwd, ph.arc.r * Math.sin(a)).addScaledVector(up, ph.arc.r * (1 - Math.cos(a))); }
        return v;
      };
      q = o.qEnd; p = p.clone().add(o.off(1)); t0 += ph.d;
      return o;
    });
    this.demo = { t: -0.6, list, total: t0, st: [0.5, 0, 0, 0], prev: list[0].p0.clone(), trail: [] };
    this.state = "demo";
    this._cam = pl.camMode; pl.camMode = "chase"; pl.camInit = false;
    pl.model.scale.setScalar(1.7);   // 시범 중에는 기체를 크게 보여 준다
    for (const t of this.tasks) t.acc = 0;
  }
  _demoStep(dt) {
    const d = this.demo, pl = this.s.player, b = pl.body;
    if (this.s.game.input.take("item")) d.t = d.total + 1;   // E: 건너뛰기
    d.t += dt;
    if (d.t > d.total + 0.8) return this.endDemo();
    const tt = Math.max(0, d.t);
    let ph = d.list[d.list.length - 1];
    for (const x of d.list) if (tt < x.t0 + x.d) { ph = x; break; }
    const k0 = clamp((tt - ph.t0) / ph.d, 0, 1), k = k0 * k0 * (3 - 2 * k0);
    d.ph = ph; d.k = k0;
    b.quat.copy(ph.q0).slerp(ph.qEnd, ph.rot && Math.abs(ph.rot[1]) > 180 ? 0 : k);
    if (ph.rot && Math.abs(ph.rot[1]) > 180) {   // 한 바퀴 이상은 slerp 로 안 되니 축 각도로 직접
      const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }[ph.rot[0]];
      b.quat.copy(ph.q0).multiply(new THREE.Quaternion().setFromAxisAngle(AX, ph.rot[1] * k * Math.PI / 180));
    }
    const pos = ph.p0.clone().add(ph.off(k));
    b.vel.copy(pos).sub(d.prev).multiplyScalar(1 / Math.max(dt, 1e-3)); d.prev.copy(pos);
    b.pos.copy(pos); b.omega.set(0, 0, 0); b.onGround = false; b.thrust = ph.s[0];
    pl.crashed = false; pl.battery = 1;
    for (let i = 0; i < 4; i++) d.st[i] += (ph.s[i] - d.st[i]) * Math.min(1, dt * 16);
    // 시범 카메라: 출발점 기준 비스듬히 뒤·옆 고정 위치에서 기체를 따라 본다 (루프·다이브처럼 크게 움직이면 조금 물러난다)
    const far = this.demoKey === "loop" || this.demoKey === "dive" ? 1.9 : 1;
    if (!d.camBase) d.camBase = d.list[0].p0.clone().addScaledVector(this.fwd, -2.6 * far).addScaledVector(this.right, 1.5 * far).add(new THREE.Vector3(0, 0.55 * far, 0));
    d.look = d.look ? d.look.lerp(pos, Math.min(1, dt * 8)) : pos.clone();
    this.s.debugCam = { pos: d.camBase.toArray(), look: d.look.toArray(), fov: this.demoKey === "dive" ? 70 : 58 };
  }
  endDemo() {
    const pl = this.s.player;
    this.demo = null; this.s.debugCam = null; pl.model.scale.setScalar(1);
    pl.camMode = this._cam || settings.camera; pl.camInit = false;
    const yaw = Math.atan2(-this.fwd.x, -this.fwd.z);
    this.placePlayer(this.origin, yaw);
    this.state = "countdown"; this.count = 3.6; this._lastBeep = 4; this.time = 0;
    this.enter(0);
    this.s.hud.toast("이제 직접 해 보세요!", "#35ff7a", 1.8, 30);
  }

  // 훈련장 좌표 [오른쪽, 높이, 앞] → 월드
  P(p) {
    const v = this.origin.clone().addScaledVector(this.right, p[0]).addScaledVector(this.fwd, p[2]);
    v.y = Math.max(this.ground, this.s.world.h(v.x, v.z)) + p[1];
    return v;
  }
  get task() { return this.tasks[this.ti]; }
  agl() { const b = this.s.player.body; return b.pos.y - this.s.world.h(b.pos.x, b.pos.z); }

  clearObjs() {
    for (const o of this.objs) { this.group.remove(o); o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }); }
    this.objs.length = 0;
  }
  add(o) { this.group.add(o); this.objs.push(o); return o; }

  // 과제 시작: 공중 표지를 만든다
  enter(i) {
    this.ti = i; this.taskT = 0;
    this.clearObjs();
    const t = this.task;
    if (!t) return;
    t.acc = 0;
    this.rot.roll = this.rot.pitch = this.rot.yaw = 0; this.dive = 0; this.diving = false;
    if (t.type === "rings") {
      t.i = 0;
      const prev = this.s.player.body.pos.clone();
      t.w = t.pts.map((p) => this.P(p));
      t.n = t.w.map((p, k) => {
        const a = k ? t.w[k - 1] : prev, n = p.clone().sub(a); n.y *= 0.35;
        if (n.lengthSq() < 0.01) n.copy(this.fwd);
        return n.normalize();
      });
      t.mesh = t.w.map((p, k) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.13, 8, 40), basic(C_NEXT, 0.5));
        m.position.copy(p); m.quaternion.setFromUnitVectors(_z, t.n[k]); m.visible = k <= 2;
        return this.add(m);
      });
    } else if (t.type === "hover") {
      t.w = this.P(t.p);
      const g = new THREE.Group(); g.position.copy(t.w);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(t.r, 24, 16), basic(C_ZONE, 0.12));
      const eq = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.09, 8, 48), basic(C_ZONE, 0.9)); eq.rotation.x = Math.PI / 2;
      const gy = this.s.world.h(t.w.x, t.w.z) - t.w.y;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, -gy, 6), basic(C_ZONE, 0.45)); pole.position.y = gy / 2;
      const foot = new THREE.Mesh(new THREE.RingGeometry(t.r * 0.86, t.r, 40), basic(C_ZONE, 0.5)); foot.rotation.x = -Math.PI / 2; foot.position.y = gy + 0.06;
      g.add(ball, eq, pole, foot); t.ball = ball; t.eq = eq;
      this.add(g);
    } else if (t.type === "land" && t.p) {
      t.w = this.P(t.p);
      const pad = new THREE.Mesh(new THREE.RingGeometry(t.r - 0.35, t.r, 48), basic(C_NOW, 0.9)); pad.rotation.x = -Math.PI / 2; pad.position.copy(t.w).y += 0.07;
      const fill = new THREE.Mesh(new THREE.CircleGeometry(t.r - 0.35, 48), basic(C_NOW, 0.14)); fill.rotation.x = -Math.PI / 2; fill.position.copy(t.w).y += 0.05;
      this.add(pad); this.add(fill);
    } else if (t.type === "alt" && t.hold) {
      // 고도 띠: 기체를 따라다니는 위·아래 고리
      t.bands = [t.min, t.max].filter((x) => x !== undefined).map((y) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(5.4, 5.8, 48), basic(C_ZONE, 0.55)); m.rotation.x = -Math.PI / 2; m.userData.y = y;
        return this.add(m);
      });
    }
  }

  done(text) {
    const s = this.s;
    s.game.sound.play("trick");
    this.pulse = 1;
    if (this.ti + 1 >= this.tasks.length) return this.complete();
    s.hud.toast(text || "과제 완료", "#35ff7a", 1.1, 24);
    this.enter(this.ti + 1);
  }

  complete() {
    this.clearObjs();
    const l = this.lesson, t = this.time, c = this.crashes;
    const stars = c === 0 && t <= l.par ? 3 : c <= 1 && t <= l.par * 1.6 ? 2 : 1;
    this.ti = this.tasks.length;
    this.finish({
      title: "과목 통과", sub: this.title, win: true, stars,
      lines: [
        { label: "걸린 시간", value: fmtTime(t) }, { label: "기준 시간", value: fmtTime(l.par) },
        { label: "추락", value: `${c}회` }, { label: "수행 과제", value: `${this.tasks.length}/${this.tasks.length}` },
      ],
    });
  }

  fail(why) {
    this.finish({
      title: "과목 실패", sub: why, win: false, stars: 0,
      lines: [{ label: "수행 과제", value: `${this.ti}/${this.tasks.length}` }, { label: "추락", value: `${this.crashes}회` }],
    });
  }

  onReset() {
    super.onReset();
    this.flown = false;
    const t = this.task;
    if (t && t.type !== "rings") t.acc = 0;
    this.rot.roll = this.rot.pitch = this.rot.yaw = 0; this.dive = 0; this.diving = false;
  }

  // 링 통과: 링 면을 가로지른 지점이 반경 안이면 인정
  physicsStep(p0, p1) {
    const t = this.task;
    if (this.state !== "run" || !t || t.type !== "rings") return;
    const c = t.w[t.i], n = t.n[t.i];
    const d0 = _v.copy(p0).sub(c).dot(n), d1 = _v.copy(p1).sub(c).dot(n);
    if ((d0 < 0) === (d1 < 0)) return;
    const k = d0 / (d0 - d1);
    _v.copy(p0).lerp(p1, k);
    if (_v.distanceTo(c) > t.r) return;
    this.s.fx.ring(c, C_NOW, t.r * 1.2, 0.5);
    this.s.game.sound.play("beep");
    t.mesh[t.i].visible = false;
    t.i++; t.acc = t.i / t.w.length;
    if (t.i >= t.w.length) this.done();
  }

  // 회전 묘기 감지 (프리스타일과 같은 기준)
  tricks(dt, b) {
    const w = b.omega, a = this.rot, out = [];
    const track = (key, rate, thr) => {
      if (Math.abs(rate) > thr) a[key] += rate * dt; else a[key] *= Math.exp(-dt * 5);
      if (Math.abs(a[key]) >= TAU * 0.93) { const sgn = Math.sign(a[key]); a[key] -= sgn * TAU; return sgn; }
      return 0;
    };
    if (Math.abs(a.pitch) < 0.3) { this.flipY0 = b.pos.y; this.flipYMax = b.pos.y; }
    this.flipYMax = Math.max(this.flipYMax, b.pos.y);
    const r = track("roll", -w.z, 2.6);
    if (r) out.push(r > 0 ? "rollR" : "rollL");
    const p = track("pitch", w.x, 2.4);
    if (p) {
      const rise = this.flipYMax - this.flipY0;
      out.push(rise > 3.5 && b.speed > 4 ? "loop" : p > 0 ? "flipB" : "flipF");
      this.flipY0 = this.flipYMax = b.pos.y;
    }
    if (track("yaw", w.y, 3.4)) out.push("spin");
    return out;
  }

  update(dt) {
    if (this.state === "demo") { this.s.player.flightMode = "ACRO"; return this._demoStep(dt); }
    if (this.demoKey && this.state === "run" && this.s.game.input.take("item")) return this.startDemo();   // E: 시범 다시 보기
    super.update(dt);
    const s = this.s, pl = s.player, b = pl.body;
    if (pl.flightMode !== "ACRO") {
      pl.flightMode = "ACRO"; b.altTarget = null; b.holdPos = null;
      settings.flightMode = this._fm; save();
      s.hud.toast("비행훈련은 ACRO 모드 전용입니다", "#ffd24a", 1.6, 20);
    }
    this.pulse = Math.max(0, this.pulse - dt * 2.5);
    if (this.state !== "run") return;
    const t = this.task;
    if (!t) return;
    this.taskT += dt;
    if (this.lesson.limit && this.time > this.lesson.limit) return this.fail("제한 시간 초과");
    if (pl.crashed && !this._wasCrashed) { this.crashes++; s.hud.toast("추락 — 다시 시도", "#ff6b5a", 1.2, 22); }
    this._wasCrashed = pl.crashed;
    if (pl.crashed) return;

    const agl = this.agl(), air = !b.onGround;
    if (agl > 1) this.flown = true;
    const hold = (ok) => { t.acc = ok ? t.acc + dt : Math.max(0, t.acc - dt * 2); return t.acc >= t.hold; };
    _up.set(0, 1, 0).applyQuaternion(b.quat);
    const got = air ? this.tricks(dt, b) : (this.rot.roll = this.rot.pitch = this.rot.yaw = 0, []);

    switch (t.type) {
      case "alt": {
        const inBand = air && agl >= t.min && (t.max === undefined || agl <= t.max) && (!t.upright || _up.y > 0.7);
        t.ok = inBand;
        if (t.bands) for (const m of t.bands) { m.position.set(b.pos.x, s.world.h(b.pos.x, b.pos.z) + m.userData.y, b.pos.z); m.material.color.setHex(inBand ? C_NOW : C_ZONE); }
        if (!t.hold) { if (inBand) this.done(); } else if (hold(inBand)) this.done();
        break;
      }
      case "hover": {
        const inside = air && b.pos.distanceTo(t.w) < t.r, slow = b.speed <= t.v;
        t.ok = inside && slow; t.inside = inside;
        t.ball.material.color.setHex(t.ok ? C_NOW : inside ? C_NEXT : C_ZONE); t.eq.material.color.copy(t.ball.material.color);
        if (hold(t.ok)) this.done();
        break;
      }
      case "rings":
        t.mesh.forEach((m, k) => {
          if (k < t.i) return;
          const now = k === t.i;
          m.visible = k <= t.i + 2;   // 지금 링과 다음 두 개만 보인다
          m.material.color.setHex(now ? C_NOW : C_NEXT); m.material.opacity = now ? 0.95 : k === t.i + 1 ? 0.5 : 0.2;
          m.scale.setScalar(now ? 1 + Math.sin(s.time * 6) * 0.03 : 1);
        });
        break;
      case "yaw": {
        if (!air) t.rad = 0;
        else t.rad = (t.rad || 0) + b.omega.y * dt;
        t.acc = Math.max(0, (t.rad * Math.sign(t.turns)) / (Math.abs(t.turns) * TAU));
        if (t.acc >= 1) this.done();
        break;
      }
      case "speed":
        t.acc = Math.min(1, (b.speed * 3.6) / t.kmh);
        if (air && b.speed * 3.6 >= t.kmh) this.done();
        break;
      case "trick": {
        const want = t.any || [t.trick];
        for (const g of got) {
          if (want.includes(g)) { t.cnt = (t.cnt || 0) + 1; s.hud.toast(TRICK_NAME[g], "#ff5ad6", 1, 26); }
        }
        t.acc = (t.cnt || 0) / (t.n || 1);
        if (t.acc >= 1) this.done();
        break;
      }
      case "inv": {
        const inv = air && _up.y < -0.7;
        t.ok = inv;
        if (hold(inv)) this.done();
        break;
      }
      case "dive":
        if (air && b.vel.y < -9) { if (!this.diving) { this.diving = true; this.diveTop = b.pos.y; } this.dive = this.diveTop - b.pos.y; }
        else if (this.diving && (b.vel.y > -3 || !air)) { const d = this.dive; this.diving = false; this.dive = 0; if (d >= t.m && air) return this.done(); }
        t.acc = Math.min(1, this.dive / t.m);
        break;
      case "land": {
        const onPad = !t.w || Math.hypot(b.pos.x - t.w.x, b.pos.z - t.w.z) < t.r;
        const ok = this.flown && b.onGround && !b.flipped && b.speed < 0.6 && _up.y > 0.85;
        t.off = ok && !onPad;
        t.acc = ok && onPad ? t.acc + dt : 0;
        if (t.acc >= 0.8) this.done();
        break;
      }
    }
  }

  // 지금 과제의 진행 상태 한 줄
  status(t) {
    const b = this.s.player.body, agl = this.agl();
    switch (t.type) {
      case "alt": return `현재 고도 ${agl.toFixed(1)}m` + (t.hold ? `  ·  ${Math.min(t.hold, t.acc).toFixed(1)} / ${t.hold}초` : "");
      case "hover": return (t.inside ? (t.ok ? "좋아요, 그대로" : `속도를 줄이세요 (${(b.speed * 3.6).toFixed(0)}km/h)`) : `정점까지 ${b.pos.distanceTo(t.w).toFixed(0)}m`) + `  ·  ${Math.min(t.hold, t.acc).toFixed(1)} / ${t.hold}초`;
      case "rings": return `링 ${t.i} / ${t.w.length}`;
      case "yaw": return `${Math.round(Math.min(1, t.acc) * Math.abs(t.turns) * 360)}° / ${Math.abs(t.turns) * 360}°`;
      case "speed": return `${(b.speed * 3.6).toFixed(0)} / ${t.kmh} km/h`;
      case "trick": return (t.n || 1) > 1 ? `${t.cnt || 0} / ${t.n}회` : agl < 6 ? "고도가 낮습니다 — 더 올라가서" : "";
      case "inv": return `${Math.min(t.hold, t.acc).toFixed(1)} / ${t.hold}초`;
      case "dive": return this.dive > 0 ? `급강하 ${this.dive.toFixed(0)} / ${t.m}m — 이제 끌어올리세요` : `현재 고도 ${agl.toFixed(0)}m`;
      case "land": return t.off ? "착륙장 밖입니다 — 다시 떠서 안으로" : !this.flown ? "먼저 이륙하세요" : `현재 고도 ${agl.toFixed(1)}m`;
    }
    return "";
  }

  target() {
    const t = this.task;
    if (!t) return null;
    if (t.type === "rings") return { pos: t.w[t.i], label: `링 ${t.i + 1}`, color: "#35ff7a" };
    if (t.type === "hover") return { pos: t.w, label: "정점", color: "#3ad8ff" };
    if (t.type === "land" && t.w) return { pos: t.w, label: "착륙장", color: "#35ff7a" };
    return null;
  }
  hudObjective() { return this.state === "run" ? this.target() : null; }

  // 시범 화면: 설명 자막 + 단계 표시 + 두 스틱의 움직임
  _demoHud(h) {
    const d = this.demo, u = h.u, L = h.L, W = h.W, g = h.g, ph = d.ph || d.list[0], idx = d.list.indexOf(ph);
    h.plate(L.cx - 130 * u, L.t, 260 * u, 30 * u, { fill: "rgba(12,18,34,0.92)", accent: "#ff5ad6", skew: 0.2 });
    h.text(`시범 · ${this.lesson.name}`, L.cx, L.t + 16 * u, { size: 15, align: "center", base: "middle", color: "#ff9be6", shadow: false });
    h.text(d.t < 0 ? "잘 보세요" : `${idx + 1}. ${ph.cap}`, L.cx, L.t + 64 * u, { size: 20, align: "center", color: "#fff" });
    // 단계 막대
    const n = d.list.length, bw = Math.min(46 * u, (W * 0.6) / n), x0 = L.cx - (n * bw) / 2;
    d.list.forEach((x, i) => h.bar(x0 + i * bw + 2 * u, L.t + 76 * u, bw - 4 * u, 5 * u, i < idx ? 1 : i === idx && d.t >= 0 ? d.k : 0, i === idx ? "#ff5ad6" : "#9fe7ff"));
    // 스틱 두 개 (스틱 모드에 맞춰 채널을 배치)
    const M = STICK_MODES[settings.stickMode] || STICK_MODES[2], val = { throttle: d.st[0] * 2 - 1, yaw: d.st[1], pitch: d.st[2], roll: d.st[3] };
    const NAME = { throttle: "스로틀", yaw: "요", pitch: "피치", roll: "롤" };
    const S = Math.min(120 * u, h.H * 0.22), gap = 34 * u, by = L.conTop - S - 52 * u;
    [["l", L.cx - gap / 2 - S], ["r", L.cx + gap / 2]].forEach(([side, bx]) => {
      const cx = bx + S / 2, cy = by + S / 2, r = S / 2 - 10 * u, xc = M[side + "x"], yc = M[side + "y"];
      const vx = val[xc], vy = val[yc];
      g.beginPath(); g.roundRect(bx, by, S, S, 16 * u); g.fillStyle = "rgba(10,16,30,0.82)"; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = "#0b0f24"; g.stroke();
      g.beginPath(); g.moveTo(cx, by + 10 * u); g.lineTo(cx, by + S - 10 * u); g.moveTo(bx + 10 * u, cy); g.lineTo(bx + S - 10 * u, cy); g.lineWidth = 1.5 * u; g.strokeStyle = "rgba(255,255,255,0.25)"; g.stroke();
      // 움직인 방향 화살 (가운데에서 멀리 갈수록 진하게)
      const mag = Math.hypot(vx, vy);
      if (mag > 0.15) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + vx * r, cy - vy * r); g.lineWidth = 5 * u; g.lineCap = "round"; g.strokeStyle = `rgba(255,90,214,${Math.min(1, mag)})`; g.stroke(); }
      g.beginPath(); g.arc(cx + vx * r, cy - vy * r, 11 * u, 0, 7); h.fill2(side === "l" ? "#ffd24a" : "#3ad8ff", 3);
      h.text(side === "l" ? "왼쪽 스틱" : "오른쪽 스틱", cx, by - 8 * u, { size: 12, align: "center", color: "#b4c2d4" });
      h.text(`↕ ${NAME[yc]}   ↔ ${NAME[xc]}`, cx, by + S + 18 * u, { size: 12, align: "center", color: "#ffe9a8" });
    });
    h.text(`MODE ${settings.stickMode}`, L.cx, by + S / 2 + 4 * u, { size: 11, align: "center", color: "#7b8aa3" });
    h.text("E · 건너뛰기", W - L.l - 4 * u, L.b - 10 * u, { size: 12, align: "right", color: "#b4c2d4" });
  }

  hud(h) {
    const u = h.u, L = h.L, W = h.W;
    if (this.state === "demo") return this._demoHud(h);
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full", lim = this.lesson.limit;
    if (lim) { const left = Math.max(0, lim - this.time); h.timer(fmtTime(left), left < 15 ? "#ff6b5a" : "#fff", "#ffd24a"); }
    else h.timer(fmtTime(this.time), "#fff", "#ffd24a");

    // 왼쪽 위: 과제 목록
    const rows = this.tasks, x = L.l, y = L.t, pw = Math.min(250 * u, W * 0.3), rh = 19 * u, ph = (full ? 30 * u + rows.length * rh : 34 * u);
    h.plate(x, y, pw, ph, { accent: "#ffd24a", skew: 0.04 });
    h.text(`과제 ${Math.min(this.ti + 1, rows.length)} / ${rows.length}`, x + 16 * u, y + 17 * u, { size: 13, base: "middle", color: "#ffd24a", shadow: false });
    h.text(`추락 ${this.crashes}`, x + pw - 12 * u, y + 17 * u, { size: 12, align: "right", base: "middle", color: this.crashes ? "#ff8a7a" : "#b4c2d4", shadow: false });
    if (full) rows.forEach((t, i) => {
      const yy = y + 30 * u + i * rh + rh / 2 - 2 * u, cur = i === this.ti, ok = i < this.ti;
      h.text(ok ? "✔" : cur ? "▶" : "·", x + 16 * u, yy, { size: 12, base: "middle", color: ok ? "#35ff7a" : cur ? "#fff" : "#7b8aa3", shadow: false });
      let s = t.text; const max = Math.floor((pw - 44 * u) / (11.5 * u));
      if (s.length > max) s = s.slice(0, max - 1) + "…";
      h.text(s, x + 32 * u, yy, { size: 12, base: "middle", color: ok ? "#7fdca6" : cur ? "#fff" : "#8f9db3", bold: cur, shadow: false });
    });

    if (this.demoKey && full && this.state === "run") h.text("E · 시범 다시 보기", x + 4 * u, y + ph + 18 * u, { size: 12, color: "#ff9be6" });
    const t = this.task;
    if (!t || this.state === "done") return;
    // 가운데 위: 지금 과제 · 상태 · 요령
    const cy = L.subY + 24 * u, col = t.ok ? "#35ff7a" : "#fff";
    h.text(t.text, L.cx, cy, { size: 21 + this.pulse * 5, align: "center", color: col });
    const st = this.state === "run" ? this.status(t) : "";
    if (st) h.text(st, L.cx, cy + 23 * u, { size: 14, align: "center", color: t.off ? "#ff8a7a" : "#9fe7ff", mono: false });
    const frac = t.type === "land" ? t.acc / 0.8 : t.hold ? t.acc / t.hold : t.acc;
    if (frac > 0 && this.state === "run") h.bar(L.cx - 90 * u, cy + 32 * u, 180 * u, 6 * u, frac, "#35ff7a");
    if (t.tip && full && (this.state !== "run" || this.taskT < 9)) {
      h.fade(this.state !== "run" ? 1 : Math.min(1, (9 - this.taskT) * 1.5));
      const max = Math.max(16, Math.floor((W * 0.62) / (13 * u))), lines = [];
      let line = "";
      for (const word of t.tip.split(" ")) { if ((line + " " + word).length > max && line) { lines.push(line); line = word; } else line = line ? line + " " + word : word; }
      if (line) lines.push(line);
      lines.forEach((ln, i) => h.text(ln, L.cx, cy + (54 + i * 18) * u, { size: 13, align: "center", color: "#ffe9a8" }));
      h.fade(1);
    }
    if (this.state !== "run") return;
    const tg = this.target();
    if (tg) h.marker(tg.pos, this.s.camera, tg.color, tg.label, tg.pos.distanceTo(this.s.player.body.pos));
  }

  dispose() {
    if (this.demo) { this.s.player.camMode = this._cam || settings.camera; this.s.debugCam = null; this.s.player.model.scale.setScalar(1); }
    this.clearObjs();
    this.s.world.scene.remove(this.group);
  }
}
