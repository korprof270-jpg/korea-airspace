// 레이싱: 게이트(또는 경로 체크포인트)를 순서대로 통과. AI 라이벌, 랩 타임, 기록 저장
import * as THREE from "../../vendor/three.module.min.js";
import { Mode } from "./base.js";
import { Gate, orientGates } from "../world.js";
import { buildDrone, botLook } from "../dronemodel.js";
import { settings, submitRecord, records, fmtTime, clamp } from "../config.js";
import { RaceGuide } from "./raceguide.js";

const PACE = { easy: 0.42, normal: 0.62, hard: 0.86 };
const NAMES = ["번개", "솔개", "매", "바람", "혜성", "제비"];
const DIV = 40;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3(), _t2 = new THREE.Vector3();
const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const GREEN = "#35ff7a";

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
    this.cueT = 0;           // 마지막 게이트 통과(또는 출발) 후 지난 시간 — 방향 안내 강조용
    this.split = 0;          // 직전 구간 기록 표시용
    this._cueOff = false;    // 다음 게이트가 화면 밖이라 방향 안내가 떠 있는지
    this._ob = { pos: new THREE.Vector3(), label: "", color: GREEN, pill: true };
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
      w.rider(model, [[0, 0, 0, 0.4, 0.16, 0.4]], "rival");
      this.bots.push({
        name: NAMES[i], model, v: 0, lat: (i % 2 ? 1 : -1) * (1.6 + Math.floor(i / 2) * 1.2), up: 0.4 * (i % 3),
        d: this.loop ? -(9 + i * 4.5) : 2 + i * 3, skill: pace * (0.94 + ((i * 37) % 10) * 0.012),
        pos: new THREE.Vector3(), finished: 0, count: 0, roll: 0,
      });
    }
    this._moveBots(0);
    this._states();
    // 월드 안내(흐르는 화살표·표지)
    this.guide = new RaceGuide(this);
    this._guideTarget();
  }

  // 안내선이 따라갈 레이싱 라인 구간: 직전 게이트(또는 출발점) → 다음 게이트
  _guideTarget() {
    if (!this.guide) return;
    const n = this.gates.length, g = this.gates[this.next];
    if (!g || this.state === "done") return this.guide.setTarget(null);
    let sA, sB = this.sGate[this.next];
    if (this.loop) {
      if (this.next === 0) { sB = this.L; sA = this.passed ? this.sGate[n - 1] : Math.max(this.sGate[n - 1], this.L - 40); }
      else sA = this.sGate[this.next - 1];
    } else sA = this.next ? this.sGate[this.next - 1] : 0;
    this.guide.setTarget(g, sA, sB);
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

  onGo() { this.lapStart = 0; this.cueT = 0; }

  physicsStep(p0, p1) {
    if (this.state !== "run") return;
    const g = this.gates[this.next];
    if (!g || !g.crossed(p0, p1)) return;
    const s = this.s, n = this.gates.length;
    this.passed++;
    this.lastGate = g;
    this.cueT = 0;
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
    this._guideTarget();
  }

  _finish() {
    this._states();
    if (this.guide) this.guide.setTarget(null);
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
    this.cueT += dt;
    if (this.guide) this.guide.update(dt, this.s.time, this.s.player.body.pos, this.s.camera);
  }

  // HUD 목표: 다음 게이트 (방향 안내가 거리를 대신 보여 줄 때는 조준선 아래 거리판을 숨긴다)
  hudObjective() {
    const g = this.gates && this.gates[this.next];
    if (!g || this.state === "done") return null;
    const o = this._ob, n = this.gates.length;
    g.center(o.pos);
    o.label = `게이트 ${this.next + 1}/${n}`;
    o.pill = !this._cueOff;
    return o;
  }

  hud(h) {
    const u = h.u, L = h.L, s = this.s, n = this.gates.length, g = h.g;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full", run = this.state === "run";
    h.timer(fmtTime(this.time), "#fff", "#ff5a1f");

    // 왼쪽 위: 랩 · 게이트 진행 · 최고 기록
    const gi = this.loop ? (this.passed ? ((this.passed - 1) % n) + 1 : 0) : this.passed;
    const pw = 184 * u, ph = (full ? 70 : 36) * u, x = L.l, y = L.t;
    h.plate(x, y, pw, ph, { accent: "#ff5a1f", skew: full ? 0.1 : 0.2 });
    h.text(this.loop ? "랩" : "구간", x + 20 * u, y + 20 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
    h.text(this.loop ? `${Math.min(this.lap + 1, this.laps)}/${this.laps}` : "주행", x + (this.loop ? 44 : 52) * u, y + 19 * u, { size: this.loop ? 24 : 18, base: "middle", mono: this.loop, shadow: false });
    h.text(`${gi}/${n}`, x + pw - 12 * u, y + 19 * u, { size: 18, align: "right", base: "middle", mono: true, color: GREEN, shadow: false });
    h.text("게이트", x + pw - 12 * u - (String(gi).length + String(n).length + 1) * 11.5 * u, y + 20 * u, { size: 11, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
    if (full) {
      // 게이트 진행 칸
      const bx = x + 16 * u, bw = pw - 32 * u, by = y + 36 * u, bh = 8 * u;
      if (n <= 24) {
        const gap = 2 * u, sw = (bw - gap * (n - 1)) / n, blink = Math.floor(s.time * 5) % 2;
        for (let i = 0; i < n; i++) {
          const done = i < gi;
          const next = i === this.next && this.state !== "done";
          g.fillStyle = "#0a0f1c"; g.fillRect(bx + i * (sw + gap) - 1 * u, by - 1 * u, sw + 2 * u, bh + 2 * u);
          g.fillStyle = next ? (blink ? "#ffffff" : GREEN) : done ? GREEN : "rgba(255,255,255,0.18)";
          g.fillRect(bx + i * (sw + gap), by, sw, bh);
        }
      } else h.bar(bx, by, bw, bh, gi / n, GREEN);
      const best = records[this.recKey];
      h.text(`최고 ${best ? fmtTime(best) : "--:--.--"}`, x + 14 * u, y + 59 * u, { size: 12, base: "middle", color: "#ffd24a", shadow: false });
      if (this.lapTimes.length) h.text(`직전 랩 ${fmtTime(this.lapTimes[this.lapTimes.length - 1])}`, x + pw - 12 * u, y + 59 * u, { size: 11, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
    }

    // 오른쪽 위: 순위
    if (this.bots.length) {
      const my = this.playerProgress();
      const rank = 1 + this.bots.filter((b) => b.count > my).length, first = rank === 1;
      const rw = 118 * u, rh = 46 * u, rx = L.r - rw, ry = L.trY;
      h.plate(rx, ry, rw, rh, { accent: first ? "#ffd24a" : "#8fa0b8", side: "right", skew: 0.16 });
      h.text(`${rank}`, rx + 50 * u, ry + 25 * u, { size: 34, align: "right", base: "middle", color: first ? "#ffd24a" : "#fff", shadow: false });
      h.text(`/ ${this.bots.length + 1}위`, rx + 56 * u, ry + 29 * u, { size: 14, base: "middle", color: "#b4c2d4", shadow: false });
      if (full) for (const b of this.bots) {
        const d = b.pos.distanceTo(s.camera.position);
        if (d < 120) h.bracket(b.pos, s.camera, 0.7, "rgba(255,184,107,0.9)", b.name);
      }
    }

    // 다음 게이트 안내
    const gt = this.gates[this.next];
    this._cueOff = false;
    if (gt && this.state !== "done") {
      const c = gt.center(_a), d = c.distanceTo(s.player.body.pos);
      if (h.vis("gateArrow")) {
        // 통과 직후·출발 전에는 강조, 화면 밖이면 항상 큰 화살표로 방향·거리 표시
        const recent = this.cueT < 2.4 || this.state === "countdown";
        const pop = run ? clamp(1 - this.cueT / 0.45, 0, 1) : 0;
        const sc = h.cue(c, s.camera, { color: GREEN, dist: d, pop, force: recent });
        this._cueOff = !sc.on;
        if (sc.on) this._gateMark(h, sc, recent, pop);
      } else {
        const sc = h.project(c, s.camera, h._s);
        if (sc.on) this._gateMark(h, sc, false, 0);
      }
    }
  }

  // 화면 안의 다음 게이트 표시: 마름모 + (통과 직후) 조여 드는 꺾쇠와 "다음" 표지
  _gateMark(h, sc, recent, pop) {
    const g = h.g, u = h.u, r = 9 * u, x = sc.x, y = sc.y;
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath();
    h.stroke2(GREEN, 2.5 * u);
    if (!recent) return;
    const k = clamp(this.cueT / 0.5, 0, 1), R = (20 + (1 - k) * 34 + Math.sin(this.s.time * 8) * 2) * u, c = 8 * u;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const sx = i === 0 || i === 3 ? -1 : 1, sy = i < 2 ? -1 : 1;
      g.moveTo(x + sx * R, y + sy * (R - c)); g.lineTo(x + sx * R, y + sy * R); g.lineTo(x + sx * (R - c), y + sy * R);
    }
    h.stroke2(pop > 0.3 ? "#ffffff" : GREEN, 3 * u);
    h.text("다음", x, y - R - 8 * u, { size: 13, align: "center", color: GREEN });
  }

  dispose() {
    for (const b of this.bots) { this.s.world.scene.remove(b.model); b.model.userData.dispose(); }
    if (this.guide) { this.guide.dispose(); this.guide = null; }
  }
}
