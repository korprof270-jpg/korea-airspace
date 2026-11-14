// 서바이벌(점수제 전투): 데스매치 / 거점 공략전 (화물 운반전은 스토리 전용)
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode, CargoSys } from "./combatmode.js";
import { submitRecord, records, fmtTime } from "../config.js";
import { drawCombatHud } from "../combathud.js";

export const VARIANTS = {
  dm: { name: "데스매치", icon: "💥", desc: "모두가 적! 레이저·미사일·아이템으로 제한 시간 동안 가장 높은 점수를 얻으세요" },
  base: { name: "거점 공략전", icon: "🏰", desc: "맵 어딘가에 숨은 적 거점 5곳(코어 + 포탑)을 찾아내 부수고, 아군 기지를 지키는 팀전. 적 거점은 가까이 가야 드러납니다" },
  cargo: { name: "화물 운반전", icon: "📦", desc: "보급 상자를 집어 아군 착륙장으로 운반. 적 운반 드론을 막으면 더 유리합니다", hidden: true },   // 스토리 단계에서만 쓴다
};
const TEAM_NAME = ["청팀", "홍팀"];
const _v = new THREE.Vector3();
const c0 = (m, t) => m.combat.kill(t, null);
const POINTS = 5, REVEAL_R = 90;   // 적 거점 수, 드러나는 거리(m)

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
      this.home = this.buildBase(B[0].x, B[0].z, 0, 3, 1000);
      this._makeOutposts(B);
      const mk = (team, i) => {
        // 아군: 코어·포탑 공략과 기지 방어를 나눠 맡는다. 적: 절반은 우리 기지를 치고 절반은 자기 거점을 지킨다
        const def = team === 0 ? i % 3 === 2 : i % 2 === 1, op = this.outposts[i % Math.max(1, this.outposts.length)] || { pos: B[1] };
        const b = c.spawnBot({ kind: hard && team === 1 && i === 0 ? "ace" : "grunt", team, respawns: true, focus: def ? null : i % 2 ? "turret" : "core", home: def ? (team === 0 ? B[0] : op.pos) : null });
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

  // 적 거점 5곳(코어 + 포탑 2)을 매 판 다른 자리에 세운다. 발견 전에는 보이지 않고, 쏘지도 맞지도 않는다
  _makeOutposts(B) {
    const c = this.combat, w = this.s.world, ops = (this.outposts = []), p = new THREE.Vector3();
    const flat = (x, z) => { const h0 = w.h(x, z); for (let k = 0; k < 6; k++) { const a = k * 1.047; if (Math.abs(w.h(x + Math.cos(a) * 14, z + Math.sin(a) * 14) - h0) > 3) return false; } return true; };
    const ok = (x, z, gap) => ops.every((q) => Math.hypot(q.pos.x - x, q.pos.z - z) > gap) && Math.hypot(B[0].x - x, B[0].z - z) > Math.min(120, w.size * 0.55);
    for (let gap = Math.min(110, w.size * 0.5), strict = true; ops.length < POINTS && gap > 15; gap *= 0.8, strict = gap > 40) {
      for (let i = 0; i < 80 && ops.length < POINTS; i++) {
        const q = c.randomPoint(3, 5, 0.78);
        p.set(q.x, w.h(q.x, q.z) + 7, q.z);
        if (!ok(p.x, p.z, gap) || w.col.blocked(p, 5) || (strict && !flat(p.x, p.z))) continue;
        const b = this.buildBase(p.x, p.z, 1, 2, 380);
        b.name = "적 거점 " + "ABCDE"[ops.length]; b.found = false; b.core.name = b.name;
        ops.push(b);
        for (const a of [b.core, ...b.turrets]) this._hide(a, true);
      }
    }
  }
  _hide(a, hide) {
    a.targetable = !hide; a.invulnerable = hide; a.model.visible = !hide;
    for (const k of ["collider", "collider2"]) if (a[k]) a[k].off = hide;
  }

  // 아군이 가까이 가면 적 거점이 드러난다
  _outposts() {
    const c = this.combat, h = this.s.hud;
    for (const b of this.outposts) {
      if (b.found) continue;
      for (const a of c.actors) {
        if (!a.alive || a.team !== 0 || (a.kind !== "player" && a.kind !== "bot")) continue;
        if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > REVEAL_R) continue;
        b.found = true;
        for (const x of [b.core, ...b.turrets]) this._hide(x, false);
        h.toast(`${b.name} 발견!`, "#ffd24a", 1.6, 24); h.feed(`${a.name} ▸ ${b.name} 발견`, "#ffd24a"); this.s.game.sound.play("lock");
        break;
      }
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
    let B = this.basePos[a.team]; const O = this.basePos[1 - a.team];
    if (this.outposts && a.team === 1) { const live = this.outposts.filter((b) => b.core.alive); if (live.length) B = live[(Math.random() * live.length) | 0].pos; }
    const dir = _v.copy(O).sub(B).setY(0).normalize();
    const ang = Math.random() * Math.PI * 2, r = 26 + Math.random() * 10;
    const p = new THREE.Vector3(B.x + Math.cos(ang) * r + dir.x * 8, 0, B.z + Math.sin(ang) * r + dir.z * 8);
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 1.5 : 10 + Math.random() * 8);
    // 구조물 안에서 재출격하지 않도록 막힌 자리면 위로 올린다
    for (let i = 0; i < 12 && w.col.blocked(p, 1.6); i++) p.y += 3;
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
    if (a.kind === "core") {
      if (!this.outposts || a.team === 0) { this.coreDown = a.team; this.endT = 2; }
      else {
        const left = this.outposts.filter((b) => b.core.alive).length;
        for (const b of this.outposts) if (b.core === a) for (const t of b.turrets) if (t.alive) c0(this, t);   // 코어가 터지면 딸린 포탑도 멈춘다
        h.toast(left ? `${a.name} 파괴 — 남은 거점 ${left}` : "적 거점 전멸!", "#35ff7a", 1.8, 26);
        if (!left) { this.coreDown = 1; this.endT = 2; }
      }
    }
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
    if (this.outposts) this._outposts();
    const bc = this.cfg.boss;
    if (bc && !this.bossA && !this.cut && this.time >= (bc.at ?? 60)) {
      const live = this.outposts ? this.outposts.filter((b) => b.core.alive) : [], c = this.combat;
      const at = live.length ? live[0].pos : this.basePos ? this.basePos[1] : c.randomPoint(20, 30);
      this.bossA = this.spawnBoss({ ...bc, pos: c.randomPoint(18, 28, 0, at.x, at.z, 30) });
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
        lines: [{ label: "내 점수", value: `${sc}` }, ...(this.outposts ? [{ label: "부순 적 거점", value: `${this.outposts.filter((b) => !b.core.alive).length} / ${this.outposts.length}` }] : []), ...(this.cargo ? [{ label: "배달 (청 : 홍)", value: `${this.delivered[0]} : ${this.delivered[1]}` }] : [])],
      });
    }
  }

  // 임무 목표: 거점 / 화물 / 착륙장
  missionObjective(o) {
    const me = this.me;
    if (this.outposts) {
      // 발견한 적 거점 가운데 아직 살아 있는 가장 가까운 코어
      let best = null, bd = 1e9;
      for (const b of this.outposts) { if (!b.found || !b.core.alive) continue; const d = b.core.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = b; } }
      if (!best) return null;
      o.pos = best.core.pos; o.label = best.name; o.color = "#ff5a66";
      return o;
    }
    if (this.cargo && this.state === "run") {
      if (this.cargo.carried(me)) { o.pos = this.padGoal[0]; o.label = "아군 착륙장"; o.color = "#35ff7a"; return o; }
      const cr = this.cargo.nearestIdle(me.pos);
      if (cr) { o.pos = cr.pos; o.label = "화물"; o.color = "#ffd24a"; return o; }
    }
    return null;
  }

  hud(h) {
    const u = h.u, L = h.L, s = this.s, c = this.combat, me = this.me;
    drawCombatHud(c, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full", dm = this.variant === "dm";
    const left = Math.max(0, this.duration - this.time);
    h.timer(fmtTime(left), left < 20 ? "#ff6b5a" : "#fff", "#ff3d5a");

    // 왼쪽 위: 내 점수
    const pw = 184 * u, ph = (full ? 60 : 36) * u, x = L.l, y = L.t;
    h.plate(x, y, pw, ph, { accent: "#ff3d5a", skew: full ? 0.1 : 0.2 });
    h.text("점수", x + 20 * u, y + 20 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
    h.text(`${Math.round(me.score)}`, x + pw - 14 * u, y + 19 * u, { size: 26, align: "right", base: "middle", mono: true, shadow: false });
    if (dm) {
      const board = c.board(), rank = 1 + board.filter((a) => a !== me && a.score > me.score).length;
      if (full) {
        h.text(`${rank}위 / ${board.length}`, x + 14 * u, y + 46 * u, { size: 14, base: "middle", color: rank === 1 ? "#ffd24a" : "#fff", shadow: false });
        h.text(`격추 ${me.kills}`, x + pw - 14 * u, y + 46 * u, { size: 13, align: "right", base: "middle", color: "#ffd24a", shadow: false });
        if (board[0] && board[0] !== me) h.text(`1위 ${board[0].name} ${Math.round(board[0].score)}`, x + 6 * u, y + ph + 18 * u, { size: 12, color: "#b4c2d4" });
      }
    } else {
      // 팀 점수: 시계 양옆
      const tw = 78 * u, th = 32 * u, ty = L.t + 4 * u;
      h.plate(L.cx - 92 * u - tw, ty, tw, th, { accent: "#5aa9ff", skew: 0.16 });
      h.text(`${Math.round(this.team[0])}`, L.cx - 100 * u, ty + 17 * u, { size: 20, align: "right", base: "middle", mono: true, color: "#8cc4ff", shadow: false });
      h.plate(L.cx + 92 * u, ty, tw, th, { accent: "#ff5a66", side: "right", skew: 0.16 });
      h.text(`${Math.round(this.team[1])}`, L.cx + 104 * u, ty + 17 * u, { size: 20, base: "middle", mono: true, color: "#ff8a94", shadow: false });
      if (full) {
        h.text(`격추 ${me.kills}`, x + 14 * u, y + 46 * u, { size: 13, base: "middle", color: "#ffd24a", shadow: false });
        if (this.cargo) h.text(`배달 ${this.delivered[0]} : ${this.delivered[1]}`, x + pw - 14 * u, y + 46 * u, { size: 13, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
      }
      if (this.outposts) {
        // 적 거점 현황: 나침반 아래 다섯 칸 (미발견 ?, 발견 = 코어 내구도, 파괴 = ✕) + 아군 코어 내구도
        const n = this.outposts.length, bw = 32 * u, gap = 6 * u, x0 = L.cx - (n * bw + (n - 1) * gap) / 2, by = L.subY + 6 * u;
        this.outposts.forEach((b, i) => {
          const bx = x0 + i * (bw + gap), dead = !b.core.alive, col = !b.found ? "#5b6880" : dead ? "#6b7890" : "#ff8a94";
          h.plate(bx, by, bw, 20 * u, { skew: 0.2, fill: "rgba(12,18,34,0.85)" });
          h.text(!b.found ? "?" : dead ? "✕" : "ABCDE"[i], bx + bw / 2, by + 11 * u, { size: 12, align: "center", base: "middle", color: col, shadow: false });
          if (b.found && !dead) {
            h.bar(bx + 3 * u, by + 22 * u, bw - 6 * u, 3 * u, b.core.hp / b.core.maxHp, "#ff5a66");
            const bd = b.core.pos.distanceTo(me.pos); if (me.alive && bd > 90) h.marker(b.core.pos, s.camera, "rgba(255,90,102,0.95)", b.name, bd);   // 가까우면 조준 틀이 대신 보인다
          }
        });
        const unk = this.outposts.filter((b) => !b.found).length;
        if (unk && full) h.text(`숨은 적 거점 ${unk}곳 — 맵을 탐색하세요`, L.cx, by + 42 * u, { size: 12, align: "center", color: "#ffd24a" });
        const hc = this.home.core, hk = hc.hp / hc.maxHp, hw = 150 * u, hy = y + ph + 16 * u;
        h.text(`아군 코어 · 포탑 ${this.home.turrets.filter((t) => t.alive).length}`, x + 4 * u, hy + 4 * u, { size: 11, color: hk < 0.35 ? "#ff8a7a" : "#8cc4ff" });
        h.bar(x + 4 * u, hy + 9 * u, hw, 7 * u, hk, hk < 0.35 ? "#ff6b5a" : "#5aa9ff");
      }
      if (this.cargo && me.alive && this.state === "run") {
        if (this.cargo.carried(me)) {
          h.marker(this.padGoal[0], s.camera, "#35ff7a", "아군 착륙장", this.padGoal[0].distanceTo(me.pos));
          h.banner("화물 운반 중 — 기체가 무겁습니다", L.subY + 20 * u, "#ffd24a", 14);
        } else {
          const cr = this.cargo.nearestIdle(me.pos);
          if (cr) h.marker(cr.pos, s.camera, "#ffd24a", "화물", cr.pos.distanceTo(me.pos));
        }
      }
    }
  }
}
