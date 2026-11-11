// 트래킹: 움직이는 피사체(차량·사람·드론·보트)를 화면에 담아 따라가며 촬영 점수를 얻는다
import * as THREE from "../../vendor/three.module.min.js";
import { Mode, stars } from "./base.js";
import { PathMover, makeSubjectModel } from "../entities.js";
import { submitRecord, records, clamp, fmtTime } from "../config.js";

// 피사체별: 조준 높이, 적정 거리 범위, 지면 추종 여부
const SUBJ = {
  runner: { h: 1.0, dmin: 2.5, dmax: 10, ground: true },
  car: { h: 0.8, dmin: 4, dmax: 16, ground: true },
  sportscar: { h: 0.7, dmin: 4, dmax: 18, ground: true },
  truck: { h: 1.8, dmin: 6, dmax: 22, ground: true },
  forklift: { h: 1.2, dmin: 3, dmax: 12, ground: true },
  boat: { h: 0.8, dmin: 5, dmax: 18, ground: false },
  drone: { h: 0, dmin: 3, dmax: 14, ground: false, bank: 1.5 },
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
    this.mover = new PathMover(d.path, { closed: d.closed !== false, ground: this.info.ground ? w : null, bank: this.info.bank || 0, lift: d.lift || 0 });
    this.model = makeSubjectModel(d.type, d.color);
    w.scene.add(this.model);
    this._sync(0);
    this.placePlayer(this._behind(new THREE.Vector3(), 9, 0.3), this._yaw());
  }

  _yaw() { _f.copy(this.mover.vel); if (_f.lengthSq() < 0.01) _f.set(0, 0, -1).applyQuaternion(this.mover.quat); return Math.atan2(-_f.x, -_f.z); }
  _behind(out, back, up) {
    _f.set(0, 0, 1).applyQuaternion(this.mover.quat); _f.y = 0; _f.normalize();
    out.copy(this.mover.pos).addScaledVector(_f, back);
    out.y = Math.max(this.mover.pos.y + up, this.s.world.h(out.x, out.z) + up);
    return out;
  }

  respawnPoint() { return { pos: this._behind(new THREE.Vector3(), 7, 3), yaw: this._yaw() }; }

  _sync(dt) {
    this.model.position.copy(this.mover.pos);
    this.model.quaternion.copy(this.mover.quat);
    this.model.userData.tick(dt, this.mover.speed);
    this.target.copy(this.mover.pos); this.target.y += this.info.h;
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run") { this._sync(0); return; }
    this.mover.update(dt);
    this._sync(dt);

    // 촬영 품질: 화면 중앙에 가까울수록, 적정 거리일수록 높다
    const cam = this.s.camera, info = this.info;
    _p.copy(this.target).applyMatrix4(cam.matrixWorldInverse);
    const front = _p.z < 0;
    _p.applyMatrix4(cam.projectionMatrix);
    const dist = cam.position.distanceTo(this.target);
    this.visT -= dt;
    if (this.visT <= 0) { this.visT = 0.15; this.visible = this.s.world.col.visible(cam.position, this.target, 0.8); }
    let q = 0;
    if (front && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1 && this.visible) {
      const center = 1 - Math.min(1, Math.hypot(_p.x, _p.y * 0.8));
      let dq = 1;
      if (dist < info.dmin) dq = clamp((dist - info.dmin * 0.35) / (info.dmin * 0.65), 0, 1);
      else if (dist > info.dmax) dq = clamp(1 - (dist - info.dmax) / (info.dmax * 1.5), 0, 1);
      q = (0.3 + 0.7 * center) * dq;
    }
    this.dist = dist;
    this.quality += (q - this.quality) * Math.min(1, dt * 6);
    this.qSum += q * dt;
    if (q > 0.45) { this.streak += dt; this.lost = 0; }
    else if (q < 0.12) { this.lost += dt; if (this.lost > 1.5 && this.streak > 0) { if (this.streak > 4) this.s.hud.toast("피사체를 놓쳤습니다", "#ff6b5a", 1.2, 22); this.streak = 0; } }
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.combo = 1 + Math.min(2, this.streak / 10);
    this.score += q * 100 * dt * this.combo;

    if (this.time >= this.duration || this.mover.done) {
      const sc = Math.round(this.score), max = this.duration * 100;
      const rec = submitRecord(this.recKey, sc);
      this.finish({
        title: "촬영 종료", sub: this.def.name, stars: stars(sc / max, [0.35, 0.8, 1.35]), record: rec,
        lines: [
          { label: "점수", value: `${sc}` }, { label: "평균 프레이밍", value: `${Math.round((this.qSum / this.duration) * 100)}%` },
          { label: "최장 연속 추적", value: `${this.bestStreak.toFixed(1)}초` }, { label: "최고 기록", value: `${records[this.recKey]}` },
        ],
      });
    }
  }

  hud(h) {
    const u = h.u, W = h.W, s = this.s;
    this.hudCountdown(h);
    h.panel(W / 2 - 92 * u, 10 * u, 184 * u, 46 * u);
    h.text(fmtTime(Math.max(0, this.duration - this.time)), W / 2, 44 * u, { size: 30, align: "center", mono: true });
    h.text(`${Math.round(this.score)}`, 18 * u, 40 * u, { size: 34, mono: true });
    h.text(`콤보 ×${(this.combo || 1).toFixed(1)}`, 18 * u, 64 * u, { size: 15, color: "#ffd24a" });
    // 프레이밍 품질 바
    const q = this.quality, col = q > 0.6 ? "#35ff7a" : q > 0.3 ? "#ffd24a" : "#ff6b5a";
    h.text("프레이밍", W - 18 * u, 30 * u, { size: 13, align: "right", color: "#b8c7d6" });
    h.bar(W - 178 * u, 38 * u, 160 * u, 10 * u, q, col);
    if (this.dist !== undefined) h.text(`${this.dist.toFixed(1)} m`, W - 18 * u, 70 * u, { size: 15, align: "right", mono: true, color: this.dist > this.info.dmax || this.dist < this.info.dmin ? "#ff6b5a" : "#fff" });
    if (this.state === "run") {
      const b = h.bracket(this.target, s.camera, (this.model.userData.radius || 1.5) * 1.1, col, this.visible ? null : "가려짐");
      if (!b) h.marker(this.target, s.camera, "#ffd24a", this.def.name);
    }
  }

  dispose() { this.s.world.scene.remove(this.model); if (this.model.userData.dispose) this.model.userData.dispose(); }
}
