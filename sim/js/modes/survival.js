// 서바이벌(점수제 전투): 데스매치 / 거점 점령전 (화물 운반전은 스토리 전용)
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode, CargoSys } from "./combatmode.js";
import { submitRecord, records, fmtTime } from "../config.js";
import { drawCombatHud } from "../combathud.js";

export const VARIANTS = {
  dm: { name: "데스매치", icon: "💥", desc: "모두가 적! 레이저·미사일·아이템으로 제한 시간 동안 가장 높은 점수를 얻으세요" },
  base: { name: "거점 점령전", icon: "🏰", desc: "맵 어딘가에 숨은 거점 5곳을 찾아내 점령하는 팀전. 거점은 가까이 가야 드러나고, 차지한 만큼 점수가 쌓입니다" },
  cargo: { name: "화물 운반전", icon: "📦", desc: "보급 상자를 집어 아군 착륙장으로 운반. 적 운반 드론을 막으면 더 유리합니다", hidden: true },   // 스토리 단계에서만 쓴다
};
const TEAM_NAME = ["청팀", "홍팀"];
const _v = new THREE.Vector3();
const POINTS = 5, CAP_R = 17, CAP_H = 30, REVEAL_R = 80, CAP_TIME = 7;   // 거점 수, 점령 반경·높이, 드러나는 거리, 혼자 점령하는 데 걸리는 초
const PT_COL = [0x5aa9ff, 0xff5a66, 0xe8ecf4], PT_CSS = ["#5aa9ff", "#ff5a66", "#e8ecf4"];

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
      this.pads = [this.buildPad(B[0].x, B[0].z, 0), this.buildPad(B[1].x, B[1].z, 1)];
      this._makePoints(B);
      const mk = (team, i) => {
        const b = c.spawnBot({ kind: hard && team === 1 && i === 0 ? "ace" : "grunt", team, respawns: true });
        b.ai.slotPt = i;
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

  // 거점 5곳을 매 판 다른 자리에 놓는다 (서로·양 팀 기지와 떨어진 열린 곳). 발견 전에는 보이지 않는다
  _makePoints(B) {
    const c = this.combat, w = this.s.world, pts = (this.points = []);
    const ok = (p, gap) => pts.every((q) => Math.hypot(q.pos.x - p.x, q.pos.z - p.z) > gap) && B.every((b) => Math.hypot(b.x - p.x, b.z - p.z) > 55);
    for (let gap = Math.min(110, w.size * 0.5); pts.length < POINTS && gap > 20; gap *= 0.8) {
      for (let i = 0; i < 60 && pts.length < POINTS; i++) {
        const p = c.randomPoint(7, 12, 0.78);
        if (!ok(p, gap) || w.col.blocked(p, 5)) continue;
        const gy = w.h(p.x, p.z), g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: PT_COL[2], fog: false });
        const soft = new THREE.MeshBasicMaterial({ color: PT_COL[2], transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: false });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(CAP_R, 0.3, 6, 56), mat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.4;
        const fill = new THREE.Mesh(new THREE.RingGeometry(0.1, CAP_R, 48), soft); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.25;   // 점령 진행에 따라 안쪽부터 차오른다
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 90, 10, 1, true), soft); beam.position.y = 45;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), mat); gem.position.y = p.y - gy;
        g.add(ring, fill, beam, gem); g.position.set(p.x, gy, p.z); g.visible = false;
        w.scene.add(g);
        pts.push({ pos: p.clone(), name: "거점 " + "ABCDE"[pts.length], v: 0, owner: -1, found: false, g, mat, soft, fill, gem, n: [0, 0] });
      }
    }
  }

  // 거점 갱신: 발견 → 점령(한 팀만 있을 때 그 팀 쪽으로 기운다) → 점수
  _points(dt) {
    const c = this.combat, h = this.s.hud, me = this.me;
    this.inPt = null;
    for (const p of this.points) {
      p.n[0] = p.n[1] = 0;
      for (const a of c.actors) {
        if (!a.alive || (a.kind !== "player" && a.kind !== "bot")) continue;
        const d = Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z), dy = a.pos.y - p.g.position.y;
        if (!p.found && a.team === 0 && d < REVEAL_R) {
          p.found = true; p.g.visible = true;
          h.toast(`${p.name} 발견!`, "#ffd24a", 1.6, 24); h.feed(`${a.name} ▸ ${p.name} 발견`, "#ffd24a"); this.s.game.sound.play("lock");
        }
        if (d < CAP_R && dy > -2 && dy < CAP_H) { p.n[a.team]++; if (a === me) this.inPt = p; }
      }
      const t = p.n[0] && !p.n[1] ? 0 : p.n[1] && !p.n[0] ? 1 : -1;
      if (t >= 0) {
        const dir = t === 0 ? 1 : -1, before = p.owner;
        p.v = Math.max(-1, Math.min(1, p.v + dir * (dt / CAP_TIME) * Math.min(2.5, 0.6 + p.n[t] * 0.6)));
        if (p.owner >= 0 && p.owner !== t && p.v * dir >= 0) p.owner = -1;        // 중립화
        if (p.v * dir >= 1) p.owner = t;
        if (p.owner !== before && p.owner === t) {
          for (const a of c.actors) if (a.alive && a.team === t && (a.kind === "player" || a.kind === "bot") && Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < CAP_R) this._add(a, 300);
          if (p.found) { h.feed(`${TEAM_NAME[t]} ▸ ${p.name} 점령`, PT_CSS[t]); this.s.game.sound.play(t === 0 ? "lap" : "warn"); }
          if (this.inPt === p && t === 0) h.toast(`${p.name} 점령  +300`, "#35ff7a", 1.5, 24);
        }
      }
      if (p.owner >= 0) this.team[p.owner] += dt * 6;   // 차지한 거점마다 초당 6점
      const col = PT_COL[p.owner < 0 ? 2 : p.owner];
      p.mat.color.setHex(col).multiplyScalar(1.6);
      p.soft.color.setHex(Math.abs(p.v) > 0.02 ? PT_COL[p.v > 0 ? 0 : 1] : col);
      p.fill.scale.setScalar(Math.max(0.02, Math.abs(p.v))); p.gem.rotation.y += dt * 1.5;
    }
    // 다섯 곳을 모두 차지하면 즉시 승리
    for (const t of [0, 1]) if (this.endT < 0 && this.points.length && this.points.every((p) => p.owner === t)) { this.sweep = t; this.endT = 2; h.toast(`${TEAM_NAME[t]} 전 거점 점령!`, PT_CSS[t], 2, 30); }
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
    // 구조물 안에서 재출격하지 않도록 막힌 자리면 위로 올린다
    for (let i = 0; i < 12 && w.col.blocked(p, 1.6); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(-dir.x, -dir.z) };
  }

  _botGoal(a) {
    if (this.points) {
      // 가까운 적과 싸우는 중이 아니면, 우리 것이 아닌 거점 가운데 자기 몫(번호로 나눔)·가까운 곳으로 간다
      const t = a.ai.target;
      if (t && t.pos.distanceTo(a.pos) < 45) return null;
      let best = null, bs = 1e9;
      this.points.forEach((p, i) => { if (p.owner === a.team && !p.n[1 - a.team]) return; const d = p.pos.distanceTo(a.pos) * ((i + a.ai.slotPt) % 3 === 0 ? 0.45 : 1); if (d < bs) { bs = d; best = p; } });
      return best ? best.pos : null;
    }
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
    if (this.points) this._points(dt);
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
      const win = this.sweep !== undefined ? this.sweep === 0 : this.coreDown !== undefined ? this.coreDown === 1 : a > b;
      this.finish({
        title: win ? "승리!" : a === b && this.coreDown === undefined ? "무승부" : "패배", sub: `${VARIANTS[this.variant].name} · ${TEAM_NAME[0]} ${a} : ${b} ${TEAM_NAME[1]}`,
        win, record: rec, stars: win ? (a > b * 1.5 ? 3 : 2) : a > b * 0.7 ? 1 : 0, board,
        lines: [{ label: "내 점수", value: `${sc}` }, ...(this.points ? [{ label: "거점 (청 : 홍)", value: `${this.points.filter((p) => p.owner === 0).length} : ${this.points.filter((p) => p.owner === 1).length}` }] : []), ...(this.cargo ? [{ label: "배달 (청 : 홍)", value: `${this.delivered[0]} : ${this.delivered[1]}` }] : [])],
      });
    }
  }

  dispose() {
    if (this.points) for (const p of this.points) { this.s.world.scene.remove(p.g); p.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); p.mat.dispose(); p.soft.dispose(); }
    super.dispose();
  }

  // 임무 목표: 거점 / 화물 / 착륙장
  missionObjective(o) {
    const me = this.me;
    if (this.points) {
      // 발견한 거점 가운데 아직 우리 것이 아닌 가장 가까운 곳
      let best = null, bd = 1e9;
      for (const p of this.points) { if (!p.found || (p.owner === 0 && !p.n[1])) continue; const d = p.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = p; } }
      if (!best) return null;
      o.pos = best.pos; o.label = best.name; o.color = PT_CSS[best.owner < 0 ? 2 : best.owner];
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
      if (this.points) {
        // 거점 현황: 나침반 아래 다섯 칸 (미발견은 ?)
        const n = this.points.length, bw = 30 * u, gap = 6 * u, x0 = L.cx - (n * bw + (n - 1) * gap) / 2, by = L.subY + 6 * u;
        this.points.forEach((p, i) => {
          const bx = x0 + i * (bw + gap), col = p.found ? PT_CSS[p.owner < 0 ? 2 : p.owner] : "#5b6880";
          h.plate(bx, by, bw, 20 * u, { skew: 0.2, fill: p.found && p.owner >= 0 ? col : "rgba(12,18,34,0.85)", stroke: p === this.inPt ? "#ffd24a" : undefined });
          h.text(p.found ? "ABCDE"[i] : "?", bx + bw / 2, by + 11 * u, { size: 12, align: "center", base: "middle", color: p.found && p.owner >= 0 ? "#0b0f24" : col, shadow: false });
          if (p.found && Math.abs(p.v) > 0.02 && Math.abs(p.v) < 1) h.bar(bx + 3 * u, by + 22 * u, bw - 6 * u, 3 * u, Math.abs(p.v), PT_CSS[p.v > 0 ? 0 : 1]);
          if (p.found && me.alive) { const d = p.pos.distanceTo(me.pos); if (d > CAP_R) h.marker(p.pos, s.camera, col, p.name, d); }
        });
        const unk = this.points.filter((p) => !p.found).length;
        if (unk && full) h.text(`숨은 거점 ${unk}곳 — 맵을 탐색하세요`, L.cx, by + 42 * u, { size: 12, align: "center", color: "#ffd24a" });
        if (this.inPt && me.alive) {
          const p = this.inPt, both = p.n[0] && p.n[1];
          const txt = both ? `${p.name} 교전 중 — 적을 몰아내세요` : p.owner === 0 && p.v >= 1 ? `${p.name} 확보` : `${p.name} 점령 중`;
          h.text(txt, L.cx, h.H * 0.3, { size: 18, align: "center", color: both ? "#ff8a7a" : "#35ff7a" });
          h.bar(L.cx - 80 * u, h.H * 0.3 + 8 * u, 160 * u, 7 * u, (p.v + 1) / 2, "#5aa9ff", "rgba(255,90,102,0.75)");
        }
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
