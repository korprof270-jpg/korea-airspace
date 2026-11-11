// 서바이벌(점수제 전투): 데스매치 / 거점 파괴전 / 화물 운반전
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode, CargoSys } from "./combatmode.js";
import { submitRecord, records, fmtTime } from "../config.js";
import { drawCombatHud } from "../combathud.js";

export const VARIANTS = {
  dm: { name: "데스매치", icon: "💥", desc: "모두가 적! 레이저·미사일·아이템으로 제한 시간 동안 가장 높은 점수를 얻으세요" },
  base: { name: "거점 파괴전", icon: "🏰", desc: "팀을 이뤄 적 포탑과 코어를 파괴하고 아군 기지를 지키는 팀전" },
  cargo: { name: "화물 운반전", icon: "📦", desc: "보급 상자를 집어 아군 착륙장으로 운반. 적 운반 드론을 막으면 더 유리합니다" },
};
const TEAM_NAME = ["청팀", "홍팀"];
const _v = new THREE.Vector3();

export class SurvivalMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.variant = VARIANTS[cfg.variant] ? cfg.variant : "dm";
    this.duration = cfg.time || 180;
    this.title = `서바이벌 · ${VARIANTS[this.variant].name}`;
    this.team = [0, 0];
    this.recKey = `survival:${this.variant}:${session.map.id}`;
    this.delivered = [0, 0];
    this.endT = -1;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat, v = this.variant;
    const c = this.initCombat({
      ffa: v === "dm",
      onKill: (a, k) => this._onKill(a, k),
      onDamage: (a, amt, k) => { if (k && k !== a && (k.kind === "player" || k.kind === "bot")) this._add(k, Math.min(amt, a.hp + amt) * (a.static ? 0.5 : 1)); },
      spawnPoint: (a) => this._spawn(a),
      botGoal: (a) => this._botGoal(a),
    });
    const n = this.cfg.bots || 5, hard = (this.cfg.difficulty || "normal") === "hard";

    if (v === "dm") {
      super.start();
      for (let i = 0; i < n; i++) {
        const kind = hard && i % 3 === 0 ? "ace" : "grunt";
        const b = c.spawnBot({ kind, team: 1, respawns: true, hpScale: kind === "ace" ? 1 : 100 / 70 });
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      }
      c.scatterPickups(11);
      return;
    }

    // 팀전: 기지 위치
    const B = (this.basePos = [new THREE.Vector3(mc.blue[0], 0, mc.blue[1]), new THREE.Vector3(mc.red[0], 0, mc.red[1])]);
    for (const p of B) p.y = w.h(p.x, p.z);
    const dir = _v.copy(B[1]).sub(B[0]).setY(0).normalize();
    const start = B[0].clone().addScaledVector(dir, mc.startOffset ?? 34);
    start.y = w.h(start.x, start.z) + 0.3;
    this.placePlayer(start, Math.atan2(-dir.x, -dir.z));
    const allies = Math.floor((n - 1) / 2), enemies = n - allies;

    if (v === "base") {
      this.bases = [this.buildBase(B[0].x, B[0].z, 0, 3), this.buildBase(B[1].x, B[1].z, 1, 3)];
      const mk = (team, i) => {
        const role = i % 3 === 2 ? "def" : i % 2 ? "turret" : "core";
        const b = c.spawnBot({ kind: hard && team === 1 && i === 0 ? "ace" : "grunt", team, respawns: true, focus: role === "def" ? null : role, home: role === "def" ? B[team] : null });
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      };
      for (let i = 0; i < allies; i++) mk(0, i);
      for (let i = 0; i < enemies; i++) mk(1, i);
      c.scatterPickups(9);
    } else {
      this.cargo = new CargoSys(this);
      this.pads = [this.buildPad(B[0].x, B[0].z, 0), this.buildPad(B[1].x, B[1].z, 1)];
      this.padGoal = this.pads.map((p) => p.pos.clone().setY(p.pos.y + 4));
      for (const [x, z] of mc.depots) this.cargo.addCrate(x, z, 1.4);
      const mk = (team, i) => {
        const b = c.spawnBot({ kind: "grunt", team, respawns: true });
        b.ai.role = i % 2 === 0 ? "courier" : "hunter";
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      };
      for (let i = 0; i < allies; i++) mk(0, i + 1);
      for (let i = 0; i < enemies; i++) mk(1, i);
      c.scatterPickups(8);
    }
  }

  _add(a, pts) {
    a.score += pts;
    if (this.variant !== "dm") this.team[a.team] += pts;
  }

  _spawn(a) {
    const c = this.combat, w = this.s.world;
    if (this.variant === "dm") {
      // 적들과 가장 먼 후보 지점
      let best = null, bd = -1;
      for (let i = 0; i < 8; i++) {
        const p = c.randomPoint(a.isPlayer ? 1.2 : 8, a.isPlayer ? 2.5 : 24);
        let d = 1e9;
        for (const o of c.actors) if (o !== a && o.alive) d = Math.min(d, o.pos.distanceTo(p));
        if (d > bd) { bd = d; best = p; }
      }
      return { pos: best, yaw: Math.atan2(best.x, best.z) };
    }
    const B = this.basePos[a.team], O = this.basePos[1 - a.team];
    const dir = _v.copy(O).sub(B).setY(0).normalize();
    const ang = Math.random() * Math.PI * 2, r = 26 + Math.random() * 10;
    const p = new THREE.Vector3(B.x + Math.cos(ang) * r + dir.x * 8, 0, B.z + Math.sin(ang) * r + dir.z * 8);
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 1.5 : 10 + Math.random() * 8);
    return { pos: p, yaw: Math.atan2(-dir.x, -dir.z) };
  }

  _botGoal(a) {
    if (this.variant !== "cargo" || a.ai.role !== "courier") return null;
    if (this.cargo.carried(a)) return this.padGoal[a.team];
    const cr = this.cargo.nearestIdle(a.pos);
    return cr ? cr.pos : null;
  }

  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    const drone = a.kind === "player" || a.kind === "bot";
    if (k && k !== a && (k.kind === "player" || k.kind === "bot")) {
      const pts = a.kind === "core" ? 1500 : a.kind === "turret" ? 300 : this.cargo && this.cargo.carried(a) ? 150 : 100;
      this._add(k, pts);
      h.feed(`${k.name} ▸ ${a.name}`, k === me ? "#ffd24a" : a === me ? "#ff6b5a" : "#cfd8e3");
      if (k === me) h.toast(`${a.name} 격파  +${pts}`, "#ffd24a", 1.2, 22);
    } else if (drone) h.feed(`${a.name} 추락`, "#9fb4c8");
    if (a.kind === "core") { this.coreDown = a.team; this.endT = 2; }
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run") return;
    if (this.cargo) {
      this.cargo.update(dt, this.pads, (a) => a.isPlayer || (a.ai && a.ai.role === "courier"), (a, pad) => {
        this._add(a, 300); this.delivered[a.team]++;
        this.s.hud.feed(`${a.name} 화물 배달 (${TEAM_NAME[a.team]})`, a.team === 0 ? "#5aa9ff" : "#ff5a66");
        if (a.isPlayer) { this.s.hud.toast("배달 완료  +300", "#35ff7a", 1.4, 24); this.s.game.sound.play("lap"); }
      });
    }
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.time >= this.duration) this._end();
  }

  _end() {
    const c = this.combat, me = this.me, sc = Math.round(me.score);
    const rec = submitRecord(this.recKey, sc);
    const rows = c.board().map((a) => ({ name: a.name + (this.variant === "dm" ? "" : ` · ${TEAM_NAME[a.team]}`), me: a === me, vals: [Math.round(a.score), a.kills, a.deaths] }));
    const board = { cols: ["점수", "격추", "피격추"], rows };
    if (this.variant === "dm") {
      const rank = 1 + c.board().filter((a) => a !== me && a.score > me.score).length;
      this.finish({
        title: rank === 1 ? "승리!" : `${rank}위`, sub: VARIANTS.dm.name, win: rank === 1, record: rec, stars: Math.max(0, 4 - rank), board,
        lines: [{ label: "내 점수", value: `${sc}` }, { label: "최고 기록", value: `${records[this.recKey]}` }],
      });
    } else {
      const [a, b] = this.team.map(Math.round);
      const win = this.coreDown !== undefined ? this.coreDown === 1 : a > b;
      this.finish({
        title: win ? "승리!" : a === b && this.coreDown === undefined ? "무승부" : "패배", sub: `${VARIANTS[this.variant].name} · ${TEAM_NAME[0]} ${a} : ${b} ${TEAM_NAME[1]}`,
        win, record: rec, stars: win ? (a > b * 1.5 ? 3 : 2) : a > b * 0.7 ? 1 : 0, board,
        lines: [{ label: "내 점수", value: `${sc}` }, ...(this.cargo ? [{ label: "배달 (청 : 홍)", value: `${this.delivered[0]} : ${this.delivered[1]}` }] : [])],
      });
    }
  }

  hud(h) {
    const u = h.u, W = h.W, s = this.s, c = this.combat, me = this.me;
    drawCombatHud(c, h);
    this.hudCountdown(h);
    h.panel(W / 2 - 92 * u, 10 * u, 184 * u, 46 * u);
    const left = Math.max(0, this.duration - this.time);
    h.text(fmtTime(left), W / 2, 44 * u, { size: 30, align: "center", mono: true, color: left < 20 ? "#ff6b5a" : "#fff" });
    if (this.variant === "dm") {
      const board = c.board(), rank = 1 + board.filter((a) => a !== me && a.score > me.score).length;
      h.text(`${Math.round(me.score)}`, 18 * u, 40 * u, { size: 34, mono: true });
      h.text(`${rank}위 / ${board.length}  ·  격추 ${me.kills}`, 18 * u, 64 * u, { size: 15, color: "#ffd24a" });
      if (board[0] && board[0] !== me) h.text(`1위 ${board[0].name} ${Math.round(board[0].score)}`, 18 * u, 84 * u, { size: 13, color: "#b8c7d6", bold: false });
    } else {
      h.text(`${Math.round(this.team[0])}`, W / 2 - 104 * u, 44 * u, { size: 28, align: "right", mono: true, color: "#5aa9ff" });
      h.text(`${Math.round(this.team[1])}`, W / 2 + 104 * u, 44 * u, { size: 28, mono: true, color: "#ff5a66" });
      h.text(`내 점수 ${Math.round(me.score)}  ·  격추 ${me.kills}`, 18 * u, 32 * u, { size: 15, color: "#ffd24a" });
      if (this.bases) {
        this.bases.forEach((b, t) => {
          const x = t === 0 ? W / 2 - 260 * u : W / 2 + 140 * u;
          h.text(t === 0 ? "아군 코어" : "적 코어", x, 74 * u, { size: 11, color: "#b8c7d6", bold: false });
          h.bar(x, 78 * u, 120 * u, 6 * u, b.core.hp / b.core.maxHp, t === 0 ? "#5aa9ff" : "#ff5a66");
          const alive = b.turrets.filter((x2) => x2.alive).length;
          h.text(`포탑 ${alive}`, x + 126 * u, 86 * u, { size: 11, color: "#b8c7d6", bold: false });
        });
        if (me.alive && this.bases[1].core.alive) h.marker(this.bases[1].core.pos, s.camera, "rgba(255,90,102,0.9)", "적 코어", this.bases[1].core.pos.distanceTo(me.pos));
      }
      if (this.cargo && me.alive && this.state === "run") {
        h.text(`배달 ${this.delivered[0]} : ${this.delivered[1]}`, 18 * u, 54 * u, { size: 14, color: "#b8c7d6" });
        if (this.cargo.carried(me)) {
          h.marker(this.padGoal[0], s.camera, "#35ff7a", "아군 착륙장", this.padGoal[0].distanceTo(me.pos));
          h.text("화물 운반 중 — 기체가 무겁습니다", W / 2, 84 * u, { size: 15, align: "center", color: "#ffd24a" });
        } else {
          const cr = this.cargo.nearestIdle(me.pos);
          if (cr) h.marker(cr.pos, s.camera, "#ffd24a", "화물", cr.pos.distanceTo(me.pos));
        }
      }
    }
  }
}
