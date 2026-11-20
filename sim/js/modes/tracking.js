// 트래킹: 움직이는 피사체(차량·사람·드론·보트)를 화면에 담고 적정 거리를 유지하며 따라간다. 별점은 적정 거리 유지 비율
import * as THREE from "../../vendor/three.module.min.js";
import { Mode, stars } from "./base.js";
import { PathMover, makeSubjectModel } from "../entities.js";
import { submitRecord, records, clamp, fmtTime } from "../config.js";

// 피사체별: 평균 속도 v(m/s) · 조준 높이 · 적정 거리 범위 · 지면 추종 여부
const SUBJ = {
  runner: { v: 9, h: 1.0, dmin: 25, dmax: 55, ground: true },
  car: { v: 21, h: 0.8, dmin: 25, dmax: 55, ground: true },
  sportscar: { v: 27, h: 0.7, dmin: 25, dmax: 55, ground: true },
  truck: { v: 16, h: 1.8, dmin: 25, dmax: 55, ground: true },
  forklift: { v: 9, h: 1.2, dmin: 25, dmax: 55, ground: true },
  boat: { v: 18, h: 0.8, dmin: 25, dmax: 55, ground: false },
  drone: { v: 22, h: 0, dmin: 25, dmax: 55, ground: false, bank: 1.5 },
  skier: { v: 20, h: 0.9, dmin: 25, dmax: 55, ground: true },
  bike: { v: 22, h: 0.9, dmin: 25, dmax: 55, ground: true },
  supercar: { v: 33, h: 0.6, dmin: 25, dmax: 55, ground: true },
  heli: { v: 30, h: 1.6, dmin: 25, dmax: 55, ground: false, bank: 0.8 },
  fpv: { v: 36, h: 0, dmin: 25, dmax: 55, ground: false, bank: 2.2 },
  ray: { v: 24, h: 0, dmin: 25, dmax: 55, ground: false, bank: 1.2 },
  shuttle: { v: 27, h: 0, dmin: 25, dmax: 55, ground: false, bank: 0.6 },   // 제국 수송정
  scout: { v: 22, h: 0, dmin: 25, dmax: 55, ground: false, bank: 1.5 },     // 제국 정찰 드론
  skiff: { v: 24, h: 0, dmin: 25, dmax: 55, ground: false, bank: 1.0 },     // 에일 비행정
  craft: { v: 16, h: 0, dmin: 25, dmax: 55, ground: false, bank: 0.9 },     // 아군 소형정 (관측정)
  cargo: { v: 13, h: 0.6, dmin: 25, dmax: 55, ground: false, bank: 0.2 },   // 화물 드론
};
const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _f = new THREE.Vector3();


export class TrackingMode extends Mode {
  constructor(session, cfg) {
    super(session, cfg);
    this.def = session.map.tracking.find((t) => t.id === cfg.subject) || session.map.tracking[0];
    this.info = SUBJ[this.def.type] || SUBJ.car;
    this.duration = this.def.duration || 75;
    this.title = `트래킹 · ${this.def.name}`;
    this.score = 0; this.quality = 0; this.streak = 0; this.bestStreak = 0; this.lost = 0;
    this.qSum = 0; this.visT = 0; this.visible = true;
    this.recKey = `tracking:${session.map.id}:${this.def.id}`;
    this.target = new THREE.Vector3();
  }

  start() {
    const w = this.s.world, d = this.def;
    this.mover = new PathMover(d.clear ? this._clearPath(d.path, d.clear, d.closed !== false) : d.path, { closed: d.closed !== false, ground: this.info.ground ? w : null, bank: this.info.bank || 0, lift: d.lift || 0 });
    // 속도: 경로에 적힌 속도의 평균을 종류별 평균 속도(v)에 맞춘다. 경로가 원래 더 빠르면 그대로
    { const sp = this.mover.speeds, avg = sp.reduce((a, b) => a + b, 0) / sp.length; this.spd = Math.max(1, (d.v || this.info.v || 12) / Math.max(1, avg)); this.mover.speed *= this.spd; }
    this.model = makeSubjectModel(d.type, d.color);
    { const R = this.model.userData.radius || 1.5, hh = Math.max(0.35, this.info.h); w.rider(this.model, [[0, this.info.h, 0, Math.max(0.3, R * 0.42), hh, Math.max(0.3, R * 0.9)]], "subject"); }
    w.scene.add(this.model);
    this._sync(0);
    this.placePlayer(this._clearBehind(0.3), this._yaw());
  }

  // 비행 피사체 경로 다듬기(clear = 여유 반경 m): 구조물·지형에 걸리는 점은 걸리지 않을 때까지 위로 올리고, 이웃 점과의 높이 차를 완만하게 한다
  _clearPath(path, r, closed) {
    const col = this.s.world.col, top = this.s.world.ceiling - 10, n = path.length, P = path.map((p) => p.slice()), q = new THREE.Vector3();
    const free = (x, y, z) => !col.blocked(q.set(x, y, z), r);
    const lift = (i) => { const p = P[i]; let k = 0; while (k++ < 40 && p[1] < top && !free(p[0], p[1], p[2])) p[1] += 2; };
    for (let round = 0; round < 10; round++) {
      let moved = false;
      for (let i = 0; i < n; i++) lift(i);
      // 점 사이 곡선도 확인: 막히는 곳은 그 구간의 양 끝 점을 함께 올린다
      const cv = new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(p[0], p[1], p[2])), closed, "centripetal"), seg = closed ? n : n - 1, up = new Set();
      for (let i = 0; i < seg; i++) for (let k = 1; k < 8; k++) { cv.getPoint((i + k / 8) / seg, q); if (col.blocked(q, r)) { up.add(i); up.add((i + 1) % n); break; } }
      for (const i of up) { P[i][1] = Math.min(top, P[i][1] + 2); moved = true; }
      if (!moved) break;
    }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {   // 급하게 오르내리지 않게 (기울기 0.5 이내로 이웃을 끌어올린다)
      for (const j of [i - 1, i + 1]) { const o = closed ? P[(j + n) % n] : P[j]; if (!o) continue; const d = Math.hypot(o[0] - P[i][0], o[2] - P[i][2]); if (o[1] < P[i][1] - d * 0.5) o[1] = P[i][1] - d * 0.5; }
    }
    return P;
  }

  _yaw() { _f.copy(this.mover.vel); if (_f.lengthSq() < 0.01) _f.set(0, 0, -1).applyQuaternion(this.mover.quat); return Math.atan2(-_f.x, -_f.z); }
  _behind(out, back, up) {
    _f.set(0, 0, 1).applyQuaternion(this.mover.quat); _f.y = 0; _f.normalize();
    out.copy(this.mover.pos).addScaledVector(_f, back);
    out.y = Math.max(this.mover.pos.y + up, this.s.world.h(out.x, out.z) + up);
    return out;
  }

  // 적정 거리(25~55m) 안에서 시작: 32m 뒤부터, 건물에 막히면 조금씩 가까이
  _clearBehind(up) {
    const out = new THREE.Vector3(), col = this.s.world.col;
    for (const back of [32, 28, 24, 18, 12, 9]) { this._behind(out, back, up + (back > 12 ? 4 : 0)); if (!col.blocked || !col.blocked(out, 2)) return out; }
    return out;
  }

  respawnPoint() { return { pos: this._clearBehind(3), yaw: this._yaw() }; }
  // 재배치 직후에도 스틱을 움직일 때까지 제자리에 떠 있는다
  onReset() { super.onReset(); this._hold = true; this._holdAt = this.time; this._holdPos = this.s.player.body.pos.clone(); }

  _sync(dt) {
    this.model.position.copy(this.mover.pos);
    this.model.quaternion.copy(this.mover.quat);
    this.model.userData.tick(dt, this.mover.speed);
    this.target.copy(this.mover.pos); this.target.y += this.info.h;
  }

  update(dt) {
    // 시작 전 대기 + 출발 직후: 스틱을 움직이기 전까지 제자리에 떠 있는다 (떨어지지 않게 위치·속도를 붙잡는다)
    {
      const pl = this.s.player, b = pl.body, sp = pl.spawn, st = this.s.game.input.sticks;
      if (this.state === "countdown") { this._hold = true; this._holdAt = 0; this._holdPos = sp && sp.pos; }
      else if (this._hold && (Math.abs(st.lx) > 0.12 || Math.abs(st.ly) > 0.12 || Math.abs(st.rx) > 0.12 || Math.abs(st.ry) > 0.12 || pl.crashed || this.time - this._holdAt > 6)) this._hold = false;
      if (this._hold && this._holdPos && this.state !== "done") { b.pos.copy(this._holdPos); b.vel.set(0, 0, 0); if (b.omega) b.omega.set(0, 0, 0); b.onGround = false; }
    }
    super.update(dt);
    if (this.state !== "run") { this._sync(0); return; }
    this.mover.update(dt, this.spd || 1);
    this._sync(dt);

    // 추적 품질: 화면 중앙에 가까울수록, 적정 거리일수록 높다
    const cam = this.s.camera, info = this.info;
    _p.copy(this.target).applyMatrix4(cam.matrixWorldInverse);
    const front = _p.z < 0;
    _p.applyMatrix4(cam.projectionMatrix);
    const dist = cam.position.distanceTo(this.target);
    this.visT -= dt;
    if (this.visT <= 0) { this.visT = 0.15; const sc = this.subCols || (this.subCols = (this.s.world.riders || []).filter((r) => r.src === this.model).map((r) => r.c));
      for (const c of sc) c.off = true;      // 피사체 자신의 충돌 상자는 시야 판정에서 제외
      this.visible = this.s.world.col.visible(cam.position, this.target, 0.8);
      for (const c of sc) c.off = false; }
    // 점수 기준: 피사체가 화면 안에 있고, 적정 거리 범위를 "유지"할 때. 가까이 붙는다고 점수가 오르지 않는다
    //  범위 가운데(ideal)일수록 1, 범위 끝에서는 0.8, 너무 가까우면 빠르게 0, 멀어지면 범위의 1.5배에서 0
    let q = 0, band = false;
    if (front && Math.abs(_p.x) < 0.95 && Math.abs(_p.y) < 0.95 && this.visible) {
      const lo = info.dmin, hi = info.dmax, mid = (lo + hi) / 2, half = (hi - lo) / 2;
      let dq;
      if (dist < lo) dq = clamp((dist - lo * 0.7) / (lo * 0.3), 0, 0.8);
      else if (dist > hi) dq = clamp(0.8 * (1 - (dist - hi) / (hi * 0.5)), 0, 0.8);
      else { dq = 1 - 0.2 * Math.abs(dist - mid) / half; band = true; }
      const center = 1 - Math.min(1, Math.hypot(_p.x, _p.y * 0.8));
      q = dq * (0.85 + 0.15 * center);
    }
    if (band) this.keepT = (this.keepT || 0) + dt;
    this.dist = dist;
    this.quality += (q - this.quality) * Math.min(1, dt * 6);
    this.qSum += q * dt;
    if (q > 0.45) { this.streak += dt; this.lost = 0; }
    else if (q < 0.12) { this.lost += dt; if (this.lost > 1.5 && this.streak > 0) { if (this.streak > 4) this.s.hud.toast("피사체를 놓쳤습니다", "#ff6b5a", 1.2, 22); this.streak = 0; } }
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.combo = 1 + Math.min(2, this.streak / 10);
    this.score += q * 100 * dt * this.combo;

    if (this.time >= this.duration || this.mover.done) {
      const sc = Math.round(this.score), keep = (this.keepT || 0) / Math.max(1, this.time);
      this.keepRatio = keep;
      const rec = submitRecord(this.recKey, sc);
      this.finish({
        title: "추적 종료", sub: this.def.name, stars: stars(keep, [0.45, 0.68, 0.86]), record: rec,
        lines: [
          { label: "적정 거리 유지", value: `${Math.round(keep * 100)}%` },
          { label: "점수", value: `${sc}` }, { label: "평균 프레이밍", value: `${Math.round((this.qSum / this.duration) * 100)}%` },
          { label: "최장 연속 추적", value: `${this.bestStreak.toFixed(1)}초` }, { label: "최고 기록", value: `${records[this.recKey]}` },
        ],
      });
    }
  }

  // HUD 목표: 피사체
  hudObjective() {
    if (this.state === "done") return null;
    const o = this._ob || (this._ob = { pos: this.target, label: this.def.name, color: "#ffd24a", dist: undefined });
    const q = this.quality;
    o.color = q > 0.6 ? "#35ff7a" : q > 0.3 ? "#ffd24a" : "#ff6b5a";
    o.dist = this.state === "run" ? this.dist : undefined;
    return o;
  }

  hud(h) {
    const u = h.u, L = h.L, s = this.s, g = h.g;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full";
    const left = Math.max(0, this.duration - this.time);
    h.timer(fmtTime(left), left < 10 ? "#ff6b5a" : "#fff", "#21d4fd");

    // 왼쪽 위: 점수 · 콤보
    const pw = 176 * u, ph = (full ? 62 : 36) * u, x = L.l, y = L.t;
    h.plate(x, y, pw, ph, { accent: "#21d4fd", skew: full ? 0.1 : 0.2 });
    h.text("점수", x + 20 * u, y + 20 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
    h.text(`${Math.round(this.score)}`, x + pw - 14 * u, y + 19 * u, { size: 26, align: "right", base: "middle", mono: true, shadow: false });
    if (full) {
      const cb = this.combo || 1;
      h.text(`콤보 ×${cb.toFixed(1)}`, x + 14 * u, y + 47 * u, { size: 13, base: "middle", color: "#ffd24a", shadow: false });
      h.bar(x + 84 * u, y + 43 * u, pw - 100 * u, 7 * u, (cb - 1) / 2, "#ffd24a");
      // 추적 중 표시
      if (this.state === "run" && Math.floor(s.time * 2) % 2) { g.fillStyle = "#ff3b3b"; g.beginPath(); g.arc(x + pw + 14 * u, y + 13 * u, 5 * u, 0, 7); g.fill(); g.lineWidth = 2 * u; g.strokeStyle = "#0a0f1c"; g.stroke(); }
      if (this.state === "run") h.text("REC", x + pw + 24 * u, y + 14 * u, { size: 12, base: "middle", color: "#ff6b5a" });
    }

    // 오른쪽 위: 프레이밍 품질 + 적정 거리 게이지
    const q = this.quality, col = q > 0.6 ? "#35ff7a" : q > 0.3 ? "#ffd24a" : "#ff6b5a";
    const rw = 190 * u, rh = (full ? 62 : 34) * u, rx = L.r - rw, ry = L.trY;
    h.plate(rx, ry, rw, rh, { accent: col, side: "right", skew: full ? 0.1 : 0.2 });
    h.text(`유지 ${Math.round(((this.keepT || 0) / Math.max(1, this.time)) * 100)}%`, rx + 14 * u, ry + 18 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
    h.segbar(rx + 78 * u, ry + 11 * u, rw - 100 * u, 13 * u, q, 8, col);
    if (full) {
      // 거리: 적정 범위(초록 구간) 안에 지시침이 들어오게
      const info = this.info, max = info.dmax * 1.8, bx = rx + 78 * u, bw = rw - 100 * u, by = ry + 40 * u, bh = 7 * u;
      h.text("거리", rx + 16 * u, ry + 44 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
      g.fillStyle = "#0a0f1c"; g.fillRect(bx - 1.5 * u, by - 1.5 * u, bw + 3 * u, bh + 3 * u);
      g.fillStyle = "rgba(255,255,255,0.16)"; g.fillRect(bx, by, bw, bh);
      g.fillStyle = "rgba(53,255,122,0.75)"; g.fillRect(bx + bw * info.dmin / max, by, bw * (info.dmax - info.dmin) / max, bh);
      if (this.dist !== undefined) {
        const px = bx + bw * clamp(this.dist / max, 0, 1), ok = this.dist >= info.dmin && this.dist <= info.dmax;
        g.beginPath(); g.moveTo(px, by + bh + 1 * u); g.lineTo(px - 5 * u, by + bh + 9 * u); g.lineTo(px + 5 * u, by + bh + 9 * u); g.closePath();
        h.fill2(ok ? "#ffffff" : "#ff6b5a", 2);
      }
    }

    if (this.state === "run") {
      const b = h.bracket(this.target, s.camera, (this.model.userData.radius || 1.5) * 1.1, col, this.visible ? null : "가려짐");
      if (!b) h.cue(this.target, s.camera, { color: "#ffd24a", label: this.def.name });
    }
  }

  dispose() { this.s.world.scene.remove(this.model); if (this.model.userData.dispose) this.model.userData.dispose(); }
}
