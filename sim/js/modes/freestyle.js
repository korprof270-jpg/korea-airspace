// 프리스타일: 플립·롤·스핀·파워 루프·다이브·근접 비행·갭 통과를 감지해 콤보 점수를 준다
import * as THREE from "../../vendor/three.module.min.js";
import { Mode, stars } from "./base.js";
import { gapCrossed } from "../world.js";
import { submitRecord, records, fmtTime } from "../config.js";

const TAU = Math.PI * 2;
const _up = new THREE.Vector3();

export class FreestyleMode extends Mode {
  constructor(session, cfg) {
    super(session, cfg);
    this.timed = cfg.session !== "free";
    this.duration = 120;
    this.title = `프리스타일 · ${session.map.name}`;
    if (!this.timed) { this.state = "run"; this.count = 0; }
    this.score = 0; this.tricks = 0;
    this.mult = 1; this.window = 0; this.bestMult = 1; this.comboPts = 0; this.bestCombo = 0;
    this.acc = { roll: 0, pitch: 0, yaw: 0 };
    this.flipY0 = 0; this.flipYMax = 0;
    this.dive = 0; this.diveTop = 0;
    this.prox = 0; this.proxPts = 0;
    this.inv = 0;
    this.lastTrick = ""; this.repeat = 0;
    this.log = [];
    this.recKey = `freestyle:${session.map.id}`;
  }

  // 묘기 인정: 같은 묘기를 반복하면 점수가 줄어든다
  award(name, pts, key = name) {
    if (key === this.lastTrick) this.repeat++; else { this.repeat = 0; this.lastTrick = key; }
    const p = Math.round(pts * Math.max(0.3, 1 - this.repeat * 0.25) * this.mult);
    this.score += p; this.comboPts += p; this.tricks++;
    this.bestCombo = Math.max(this.bestCombo, this.comboPts);
    this.log.unshift({ text: `${name}  +${p}`, t: 0 });
    if (this.log.length > 5) this.log.pop();
    this.mult = Math.min(5, this.mult + 0.5);
    this.bestMult = Math.max(this.bestMult, this.mult);
    this.window = 3.2;
    this.s.game.sound.play(this.mult >= 3 ? "combo" : "trick");
  }

  breakCombo() { this.mult = 1; this.window = 0; this.comboPts = 0; this.repeat = 0; this.lastTrick = ""; }

  onImpact(impact, hard) {
    if (impact > 3) this.breakCombo();
    super.onImpact(impact, hard);
  }

  physicsStep(p0, p1) {
    if (this.state !== "run") return;
    const b = this.s.player.body;
    if (b.speed < 5) return;
    for (const g of this.s.world.gaps) {
      if (g.cool > 0 || !gapCrossed(g, p0, p1)) continue;
      g.cool = 5;
      this.award(`갭 통과 · ${g.name}`, g.pts * (0.7 + Math.min(1, b.speed / 25) * 0.6), "gap:" + g.name);
    }
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run") return;
    const s = this.s, pl = s.player, b = pl.body;
    for (const g of s.world.gaps) if (g.cool > 0) g.cool -= dt;
    for (const l of this.log) l.t += dt;
    if (this.window > 0) { this.window -= dt; if (this.window <= 0) this.breakCombo(); }

    const air = !b.onGround && !pl.crashed;
    if (air) {
      // 축별 회전 누적 (느린 회전은 묘기로 치지 않고 서서히 잊는다)
      const w = b.omega, a = this.acc;
      const track = (key, rate, thr) => {
        if (Math.abs(rate) > thr) a[key] += rate * dt; else a[key] *= Math.exp(-dt * 5);
        if (Math.abs(a[key]) >= TAU * 0.93) { const sgn = Math.sign(a[key]); a[key] -= sgn * TAU; return sgn; }
        return 0;
      };
      if (Math.abs(a.pitch) < 0.3) { this.flipY0 = b.pos.y; this.flipYMax = b.pos.y; }
      this.flipYMax = Math.max(this.flipYMax, b.pos.y);
      const r = track("roll", -w.z, 2.6);
      if (r) this.award(r > 0 ? "롤 (우)" : "롤 (좌)", 100, "roll");
      const p = track("pitch", w.x, 2.4);
      if (p) {
        const rise = this.flipYMax - this.flipY0;
        if (rise > 3.5 && b.speed > 4) this.award("파워 루프", 320 + rise * 12, "loop");
        else this.award(p > 0 ? "백플립" : "프론트 플립", 130, "flip");
        this.flipY0 = this.flipYMax = b.pos.y;
      }
      const y = track("yaw", w.y, 3.4);
      if (y) this.award("요 스핀", 90, "yaw");

      // 다이브: 빠르게 떨어진 높이만큼
      if (b.vel.y < -11) { if (this.dive === 0) this.diveTop = b.pos.y; this.dive = this.diveTop - b.pos.y; }
      else if (this.dive > 0 && b.vel.y > -4) { if (this.dive > 10) this.award(`다이브 ${this.dive.toFixed(0)}m`, this.dive * 12, "dive"); this.dive = 0; }

      // 근접 비행: 장애물·지면 가까이를 빠르게
      const near = b.speed > 9 ? s.world.col.nearest(b.pos, 2.4) : 9;
      if (near < 1.7) {
        this.prox += dt; this.proxPts += dt * 70 * (b.speed / 15) * (near < 0.9 ? 1.6 : 1);
        if (this.window > 0) this.window = Math.max(this.window, 1.2);
      } else if (this.prox > 0) {
        if (this.prox > 0.5) this.award(`근접 비행 ${this.prox.toFixed(1)}초`, this.proxPts, "prox");
        this.prox = 0; this.proxPts = 0;
      }

      // 배면 비행
      _up.set(0, 1, 0).applyQuaternion(b.quat);
      if (_up.y < -0.75 && Math.abs(w.x) < 2 && Math.abs(w.z) < 2) this.inv += dt;
      else { if (this.inv > 1) this.award(`배면 비행 ${this.inv.toFixed(1)}초`, this.inv * 90, "inv"); this.inv = 0; }
    } else {
      this.acc.roll = this.acc.pitch = this.acc.yaw = 0;
      this.dive = 0; this.prox = 0; this.proxPts = 0; this.inv = 0;
      if (b.onGround && this.mult > 1 && b.speed < 1) this.breakCombo();
    }

    if (this.timed && this.time >= this.duration) {
      const sc = Math.round(this.score), rec = submitRecord(this.recKey, sc);
      this.finish({
        title: "세션 종료", sub: s.map.name, stars: stars(sc, [2500, 7000, 15000]), record: rec,
        lines: [
          { label: "점수", value: `${sc}` }, { label: "성공한 묘기", value: `${this.tricks}` },
          { label: "최고 배율", value: `×${this.bestMult.toFixed(1)}` }, { label: "최고 콤보", value: `${Math.round(this.bestCombo)}` },
          { label: "최고 기록", value: `${records[this.recKey]}` },
        ],
      });
    }
  }

  hud(h) {
    const u = h.u, W = h.W;
    this.hudCountdown(h);
    if (this.timed) {
      h.panel(W / 2 - 92 * u, 10 * u, 184 * u, 46 * u);
      h.text(fmtTime(Math.max(0, this.duration - this.time)), W / 2, 44 * u, { size: 30, align: "center", mono: true });
    }
    h.text(`${Math.round(this.score)}`, 18 * u, 40 * u, { size: 34, mono: true });
    const best = records[this.recKey];
    h.text(`최고 ${best || "--"}`, 18 * u, 60 * u, { size: 13, color: "#ffd24a", bold: false });
    if (this.mult > 1) {
      h.text(`×${this.mult.toFixed(1)}`, W - 18 * u, 46 * u, { size: 40, align: "right", color: this.mult >= 3 ? "#ff5ad6" : "#ffd24a" });
      h.bar(W - 138 * u, 56 * u, 120 * u, 6 * u, this.window / 3.2, "#ffd24a");
      h.text(`콤보 ${Math.round(this.comboPts)}`, W - 18 * u, 80 * u, { size: 13, align: "right", color: "#b8c7d6" });
    }
    let y = 110 * u;
    for (const l of this.log) {
      if (l.t > 4) continue;
      h.g.globalAlpha = Math.min(1, (4 - l.t) * 1.5);
      h.text(l.text, 18 * u, y, { size: 15, color: l.t < 0.4 ? "#fff" : "#9fe7ff" });
      h.g.globalAlpha = 1;
      y += 21 * u;
    }
    if (this.prox > 0.3) h.text(`근접 +${Math.round(this.proxPts * this.mult)}`, W / 2, h.H * 0.62, { size: 18, align: "center", color: "#35ff7a" });
    if (this.dive > 6) h.text(`다이브 ${this.dive.toFixed(0)}m`, W / 2, h.H * 0.66, { size: 18, align: "center", color: "#9fe7ff" });
    if (!this.timed) h.text("자유 비행 — Esc 로 종료", W / 2, 30 * u, { size: 14, align: "center", color: "#b8c7d6", bold: false });
  }
}
