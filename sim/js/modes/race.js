// 레이싱: 게이트(또는 경로 체크포인트)를 순서대로 통과. AI 라이벌, 랩 타임, 기록 저장
import * as THREE from "../../vendor/three.module.min.js";
import { Mode } from "./base.js";
import { Gate, orientGates } from "../world.js";
import { buildDrone, botLook } from "../dronemodel.js";
import { settings, submitRecord, records, fmtTime, clamp } from "../config.js";

const PACE = { easy: 0.42, normal: 0.62, hard: 0.86 };
const NAMES = ["번개", "솔개", "매", "바람", "혜성", "제비"];
const DIV = 40;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3(), _t2 = new THREE.Vector3();
const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class RaceMode extends Mode {
  constructor(session, cfg) {
    super(session, cfg);
    this.track = session.map.tracks.find((t) => t.id === cfg.track) || session.map.tracks[0];
    this.loop = this.track.loop !== false;
    this.laps = this.loop ? (cfg.laps || this.track.laps || 3) : 1;
    this.title = `레이싱 · ${this.track.name}`;
    this.next = 0;           // 다음 게이트 인덱스
    this.passed = 0;         // 통과한 게이트 총수
    this.lap = 0;
    this.lapStart = 0;
    this.lapTimes = [];
    this.bots = [];
    this.lastGate = null;
    this.recKey = `race:${session.map.id}:${this.track.id}:${this.laps}`;
    this.lapKey = `lap:${session.map.id}:${this.track.id}`;
  }

  start() {
    const s = this.s, w = s.world;
    const defs = orientGates(this.track.gates.map((g) => ({ ...g })), this.loop);
    this.gates = defs.map((d, i) => new Gate(d, w, i));
    const n = this.gates.length;
    const g0 = this.gates[0];

    // 출발 위치: 지정값 또는 첫 게이트 앞 16m
    let pos, yaw;
    if (this.track.start) { pos = new THREE.Vector3(...this.track.start.pos); yaw = (this.track.start.yaw || 0) * Math.PI / 180; }
    else {
      const f = _a.copy(g0.fwd); f.y = 0; f.normalize();
      pos = g0.center(new THREE.Vector3()).addScaledVector(f, -16);
      pos.y = w.h(pos.x, pos.z) + 0.3;
      yaw = Math.atan2(-f.x, -f.z);
    }
    this.placePlayer(pos, yaw);

    // 레이싱 라인(봇 경로)
    const pts = this.gates.map((g) => g.center(new THREE.Vector3()));
    if (!this.loop) pts.unshift(pos.clone().add(new THREE.Vector3(0, 1.5, 0)));
    this.curve = new THREE.CatmullRomCurve3(pts, this.loop, "centripetal");
    const segs = this.loop ? n : n; // 열린 경로: 점 n+1개 → 구간 n개
    this.curve.arcLengthDivisions = segs * DIV;
    const lens = this.curve.getLengths(segs * DIV);
    this.L = lens[lens.length - 1];
    this.sGate = this.gates.map((_, i) => lens[(this.loop ? i : i + 1) * DIV]);

    // 라이벌
    const count = clamp(this.cfg.rivals ?? 3, 0, 5);
    const pace = PACE[this.cfg.difficulty || settings.difficulty] || PACE.normal;
    for (let i = 0; i < count; i++) {
      const model = buildDrone(botLook("racer", i % 2), 1.8, { halo: [0xff2d3d, 0x2f8cff, 0xffc400, 0xb44cff, 0x35ff7a][i] });
      w.scene.add(model);
      this.bots.push({
        name: NAMES[i], model, v: 0, lat: (i % 2 ? 1 : -1) * (1.6 + Math.floor(i / 2) * 1.2), up: 0.4 * (i % 3),
        d: this.loop ? -(9 + i * 4.5) : 2 + i * 3, skill: pace * (0.94 + ((i * 37) % 10) * 0.012),
        pos: new THREE.Vector3(), finished: 0, count: 0, roll: 0,
      });
    }
    this._moveBots(0);
    this._states();
  }

  _states() {
    const n = this.gates.length;
    const total = this.loop ? this.laps * n + 1 : n;
    this.gates.forEach((g, i) => {
      if (this.passed >= total) return g.setState("done");
      if (i === this.next) g.setState("next");
      else if (i === (this.next + 1) % n && (this.loop || this.next + 1 < n) && this.passed + 1 < total) g.setState("after");
      else g.setState(!this.loop && i < this.next ? "done" : "idle");
    });
  }

  onGo() { this.lapStart = 0; }

  physicsStep(p0, p1) {
    if (this.state !== "run") return;
    const g = this.gates[this.next];
    if (!g || !g.crossed(p0, p1)) return;
    const s = this.s, n = this.gates.length;
    this.passed++;
    this.lastGate = g;
    s.game.sound.play("gate");
    if (this.loop && this.next === 0 && this.passed > 1) {
      // 한 바퀴 완료
      const lt = this.time - this.lapStart;
      this.lapTimes.push(lt);
      this.lapStart = this.time;
      this.lap++;
      const best = submitRecord(this.lapKey, lt, true);
      s.game.sound.play("lap");
      s.hud.toast(`랩 ${this.lap}  ${fmtTime(lt)}${best ? "  ★ 최고 기록" : ""}`, best ? "#ffd24a" : "#fff", 2);
      if (this.lap >= this.laps) return this._finish();
    }
    if (!this.loop && this.passed >= n) return this._finish();
    this.next = (this.next + 1) % n;
    this._states();
  }

  _finish() {
    this._states();
    const total = this.time;
    const rank = 1 + this.bots.filter((b) => b.finished && b.finished < total).length;
    const rec = submitRecord(this.recKey, total, true);
    const lines = [
      { label: "기록", value: fmtTime(total) },
      { label: "순위", value: `${rank} / ${this.bots.length + 1}` },
    ];
    if (this.lapTimes.length) lines.push({ label: "베스트 랩", value: fmtTime(Math.min(...this.lapTimes)) });
    lines.push({ label: "최고 기록", value: fmtTime(records[this.recKey]) });
    this.finish({ title: rank === 1 ? "우승!" : "완주!", lines, record: rec, win: true, stars: rank === 1 ? 3 : rank === 2 ? 2 : 1 });
  }

  respawnPoint() {
    const g = this.lastGate;
    if (!g) return this.s.player.spawn;
    const pos = g.center(new THREE.Vector3()).addScaledVector(g.fwd, 1.5);
    const f = _a.copy(g.fwd); f.y = 0;
    if (f.lengthSq() < 0.01) f.set(0, 0, -1);
    return { pos, yaw: Math.atan2(-f.x, -f.z) };
  }

  _moveBots(dt) {
    const n = this.gates.length;
    for (const b of this.bots) {
      if (dt > 0 && !b.finished) {
        // 앞쪽 곡률로 코너 속도 제한
        const u0 = this._u(b.d + 5), u1 = this._u(b.d + 11);
        this.curve.getTangentAt(u0, _t); this.curve.getTangentAt(u1, _t2);
        const kappa = _t.distanceTo(_t2) / 6;
        const vmax = 31 * b.skill, alat = 30 * b.skill * b.skill + 4;
        const vt = Math.min(vmax, Math.sqrt(alat / Math.max(kappa, 1e-4)));
        b.v += clamp(vt - b.v, -24 * dt, 13 * b.skill * dt + 2 * dt);
        b.d += b.v * dt;
        const end = this.loop ? this.laps * this.L : this.L;
        if (b.d >= end) { b.d = end + 0.01; b.finished = this.time; this.s.hud.feed(`${b.name} 완주`, "#ffb86b"); }
      }
      const u = this._u(b.d);
      this.curve.getPointAt(u, b.pos);
      this.curve.getTangentAt(u, _t);
      // 좌우 간격을 두고 비행(게이트 근처에서는 중앙으로)
      _x.crossVectors(_t, UP).normalize();
      let near = 1;
      for (const sg of this.sGate) { const dd = Math.abs(((b.d % this.L) + this.L) % this.L - sg); near = Math.min(near, Math.min(dd, this.L - dd) / 9); }
      const k = clamp(near, 0.12, 1);
      b.pos.addScaledVector(_x, b.lat * k * 0.5).addScaledVector(UP, b.up * k * 0.4);
      // 자세: 진행 방향 + 뱅크 + 전진 기울기
      this.curve.getTangentAt(this._u(b.d + 2), _t2);
      const turn = _t.x * _t2.z - _t.z * _t2.x;
      b.roll += (clamp(turn * b.v * 0.9, -1.1, 1.1) - b.roll) * Math.min(1, dt * 6 + (dt ? 0 : 1));
      _z.copy(_t).negate();
      _x.crossVectors(UP, _z).normalize();
      _y.copy(UP).multiplyScalar(Math.cos(b.roll)).addScaledVector(_x, Math.sin(b.roll));
      _y.addScaledVector(_t, clamp(b.v / 40, 0, 0.7)).normalize();
      _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
      _m.makeBasis(_x, _y, _z);
      b.model.position.copy(b.pos);
      b.model.quaternion.setFromRotationMatrix(_m);
      b.model.userData.tick(dt, 0.35 + b.v / 45, this.s.time);
      // 진행도(순위 계산용)
      if (this.loop) {
        if (b.d < 0) b.count = b.d / 100;
        else {
          const lap = Math.floor(b.d / this.L), r = b.d - lap * this.L;
          let c = 0; for (const sg of this.sGate) if (sg <= r) c++;
          const s0 = this.sGate[c - 1], s1 = c < n ? this.sGate[c] : this.L;
          b.count = lap * n + c + (r - s0) / (s1 - s0);
        }
      } else {
        let c = 0; for (const sg of this.sGate) if (sg <= b.d) c++;
        const s0 = c ? this.sGate[c - 1] : 0, s1 = c < n ? this.sGate[c] : this.L + 1;
        b.count = c + (b.d - s0) / (s1 - s0);
      }
    }
  }

  _u(d) { return this.loop ? (((d % this.L) + this.L) % this.L) / this.L : clamp(d / this.L, 0, 1); }

  playerProgress() {
    const g = this.gates[this.next], n = this.gates.length;
    if (!g || this.state === "done") return this.passed + 1;
    const prev = this.lastGate ? this.lastGate.center(_a) : this.s.player.spawn.pos;
    const seg = Math.max(1, prev.distanceTo(g.center(_b)));
    return this.passed + clamp(1 - this.s.player.body.pos.distanceTo(_b) / seg, 0, 0.99);
  }

  update(dt) {
    super.update(dt);
    this._moveBots(this.state === "run" || this.state === "done" ? dt : 0);
    // 다음 게이트 깜빡임
    const g = this.gates[this.next];
    if (g && g.state === "next") g.mat.emissiveIntensity = 3.0 + Math.sin(this.s.time * 9) * 0.9;
  }

  hud(h) {
    const u = h.u, W = h.W, s = this.s, n = this.gates.length;
    this.hudCountdown(h);
    h.panel(W / 2 - 92 * u, 10 * u, 184 * u, 46 * u);
    h.text(fmtTime(this.time), W / 2, 44 * u, { size: 30, align: "center", mono: true });
    const lapTxt = this.loop ? `랩 ${Math.min(this.lap + 1, this.laps)}/${this.laps}` : "구간 주행";
    h.text(lapTxt, 18 * u, 32 * u, { size: 20 });
    h.text(`게이트 ${this.loop ? (this.passed ? ((this.passed - 1) % n) + 1 : 0) : this.passed}/${n}`, 18 * u, 56 * u, { size: 15, color: "#b8c7d6" });
    const best = records[this.recKey];
    h.text(`최고 ${best ? fmtTime(best) : "--"}`, 18 * u, 78 * u, { size: 13, color: "#ffd24a", bold: false });
    if (this.bots.length) {
      const my = this.playerProgress();
      const rank = 1 + this.bots.filter((b) => b.count > my).length;
      h.text(`${rank}`, W - 62 * u, 50 * u, { size: 44, align: "right", color: rank === 1 ? "#ffd24a" : "#fff" });
      h.text(`/ ${this.bots.length + 1}위`, W - 16 * u, 50 * u, { size: 15, align: "right", color: "#b8c7d6" });
      for (const b of this.bots) {
        const d = b.pos.distanceTo(s.camera.position);
        if (d < 120) h.bracket(b.pos, s.camera, 0.7, "rgba(255,184,107,0.8)", b.name);
      }
    }
    const g = this.gates[this.next];
    if (g && this.state !== "done") {
      const c = g.center(_a);
      h.marker(c, s.camera, "#35ff7a", null, c.distanceTo(s.player.body.pos));
    }
  }

  dispose() {
    for (const b of this.bots) { this.s.world.scene.remove(b.model); b.model.userData.dispose(); }
  }
}
