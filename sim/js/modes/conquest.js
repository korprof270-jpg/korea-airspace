// 점령전: 4개 팀이 지역 거점을 땅따먹기처럼 차지하고, 상대 시작 기지(본부)를 부수면 그 팀은 탈락한다
// 점수: 기체 격추 · 포탑·지상 유닛 파괴 · 거점 점령 · 거점 보유(초당) · 적 본부 파괴. 시간이 끝나거나 한 팀만 남으면 순위 결정
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { TEAM_COLOR, TEAM_CSS } from "../combat.js";
import { submitRecord, records, fmtTime, clamp } from "../config.js";
import { drawCombatHud } from "../combathud.js";
import * as GP from "../garage.js";

export const TEAM_NAMES = ["청팀", "홍팀", "자팀", "주팀"];
const CAP_R = 16, CAP_H = 64, CAP_TIME = 6;
export const PTS = { kill: 100, turret: 200, unit: 300, part: 60, capture: 300, hold: 3, hq: 2000 };
const LETTERS = "ABCDEFGH";
const _v = new THREE.Vector3();

export class ConquestMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.duration = cfg.time || 300;
    this.title = "서바이벌 · 점령전";
    this.recKey = `survival:conq:${session.map.id}`;
    this.teams = TEAM_NAMES.map((name, id) => ({ id, name, css: TEAM_CSS[id], score: 0, kills: 0, caps: 0, out: false, outAt: 0, hq: null, home: new THREE.Vector3() }));
    this.points = [];
    this.endT = -1; this.holdT = 0;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat;
    const c = this.initCombat({
      onKill: (a, k) => this._onKill(a, k),
      spawnPoint: (a) => this._spawn(a),
      botGoal: (a) => this._botGoal(a),
    });
    c.multi = true;   // 4팀: 적 표시를 팀 색으로
    // 네 본부: 청·홍은 맵의 두 기지 터, 자·주는 그 사이를 가로지르는 축의 양끝
    const A = new THREE.Vector3(mc.blue[0], 0, mc.blue[1]), B = new THREE.Vector3(mc.red[0], 0, mc.red[1]);
    const mid = A.clone().add(B).multiplyScalar(0.5), half = A.distanceTo(B) / 2, perp = new THREE.Vector3(-(B.z - A.z), 0, B.x - A.x).normalize();
    const lim = w.size - 30, cl = (p) => p.set(clamp(p.x, -lim, lim), 0, clamp(p.z, -lim, lim));
    const spots = [A, B, cl(mid.clone().addScaledVector(perp, half)), cl(mid.clone().addScaledVector(perp, -half))];
    this.teams.forEach((t, i) => {
      const p = i < 2 ? spots[i] : c.units.groundSpot(spots[i].x, spots[i].z, 50, 12);
      p.y = w.h(p.x, p.z);
      t.home.copy(p);
      t.hq = this.buildBase(p.x, p.z, i, 2, (i === 0 ? 2600 : 1300) * 4);   // 본부 체력 4배 (아군 본부는 그 2배)
      t.hq.core.name = `${t.name} 본부`;
      for (const tr of t.hq.turrets) tr.name = `${t.name} 포탑`;
    });
    // 내 시작 위치: 기존 팀전과 같은 활주 지점
    const me = this.teams[0].home, dir = _v.copy(B).sub(A).setY(0).normalize(), st = me.clone().addScaledVector(dir, mc.startOffset ?? 34);
    st.y = w.h(st.x, st.z) + 0.3;
    this.placePlayer(st, Math.atan2(-dir.x, -dir.z));
    this._makePoints();
    // 팀마다 AI 드론. 셋 중 하나는 적 본부 공격, 나머지는 거점 점령
    const n = this.cfg.bots || 5, per = clamp(Math.round(n / 2), 2, 4), hard = (this.cfg.difficulty || "normal") === "hard";
    let k = 0;
    for (const t of this.teams) for (let i = 0; i < (t.id === 0 ? per - 1 : per); i++, k++) {
      const kind = i === per - 1 && t.id ? "jet" : hard && i === 0 && t.id ? "ace" : "grunt";
      const b = this.combat.spawnBot({ kind, team: t.id, respawns: true, name: t.id === 0 ? `${["독수리", "송골매", "참매"][i % 3]}` : undefined });
      b.ai.role = i % 3 === 2 ? "attack" : "capture"; b.ai.slotPt = k;
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
    c.scatterPickups(10);
  }

  // 지역 거점: 디포 터 4곳 + 맵 가운데 (+ 큰 맵이면 둘 더)
  _makePoints() {
    const s = this.s, w = s.world, c = this.combat, mc = s.map.combat;
    const cand = [...mc.depots.map(([x, z]) => new THREE.Vector3(x, 0, z)), new THREE.Vector3(0, 0, 0)];
    for (let i = 0; i < 40; i++) cand.push(c.randomPoint(3, 5, 0.65));
    const hqR = Math.min(45, w.size * 0.28), gapR = Math.min(40, w.size * 0.24), want = w.size > 180 ? 7 : 5;
    for (const q of cand) {
      if (this.points.length >= want) break;
      if (this.teams.some((t) => Math.hypot(t.home.x - q.x, t.home.z - q.z) < hqR)) continue;
      if (this.points.some((p) => Math.hypot(p.pos.x - q.x, p.pos.z - q.z) < gapR)) continue;
      const gy = w.h(q.x, q.z), g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xe8ecf4, fog: false });
      const soft = new THREE.MeshBasicMaterial({ color: 0xe8ecf4, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(CAP_R, 0.3, 6, 56), mat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.4;
      const fill = new THREE.Mesh(new THREE.RingGeometry(0.1, CAP_R, 48), soft); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.25;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 90, 10, 1, true), soft); beam.position.y = 45;
      const flag = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), mat); flag.position.y = 9;
      g.add(ring, fill, beam, flag); g.position.set(q.x, gy, q.z);
      w.scene.add(g);
      this.points.push({ pos: new THREE.Vector3(q.x, gy + 6, q.z), name: `거점 ${LETTERS[this.points.length]}`, owner: -1, cap: -1, v: 0, g, mat, soft, fill, flag, n: [0, 0, 0, 0] });
    }
  }

  _spawn(a) {
    const t = this.teams[a.team], w = this.s.world;
    const ang = Math.random() * Math.PI * 2, r = 22 + Math.random() * 10;
    const p = new THREE.Vector3(t.home.x + Math.cos(ang) * r, 0, t.home.z + Math.sin(ang) * r);
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 1.5 : 10 + Math.random() * 8);
    for (let i = 0; i < 12 && w.col.blocked(p, 1.6); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(t.home.x, t.home.z) };
  }

  _botGoal(a) {
    const t = this.teams[a.team];
    if (t.out) return null;
    const tg = a.ai.target;
    if (tg && tg.pos.distanceTo(a.pos) < (a.ai.role === "attack" ? 45 : 18)) return null;   // 바로 붙은 적과는 교전, 거점 담당은 점령 우선
    if (a.ai.role === "attack") {
      let best = null, bd = 1e9;
      for (const o of this.teams) if (o !== t && !o.out) { const d = o.home.distanceTo(a.pos); if (d < bd) { bd = d; best = o; } }
      if (best && bd > 30) return _v.copy(best.home).setY(best.home.y + 14).clone();
      return null;
    }
    let best = null, bs = 1e9;
    this.points.forEach((p, i) => {
      if (p.owner === a.team && !p.n.some((x, j) => x && j !== a.team)) return;
      const d = p.pos.distanceTo(a.pos) * ((i + a.ai.slotPt) % 3 === 0 ? 0.5 : 1);
      if (d < bs) { bs = d; best = p; }
    });
    return best ? best.pos : null;
  }

  _give(team, pts, who) {
    if (team < 0 || this.teams[team].out) return;
    this.teams[team].score += pts;
    if (who) who.score += pts;
  }

  _onKill(a, k) {
    const h = this.s.hud, me = this.me, kt = k ? k.team : -1;
    if (a.kind === "core") return this._eliminate(a.team, k);
    const pts = a.kind === "turret" ? PTS.turret : a.unit ? (a === a.unit.root ? PTS.unit : PTS.part) : a.kind === "player" || a.kind === "bot" ? PTS.kill : 0;
    if (k && k !== a && kt !== a.team && pts) {
      this._give(kt, pts, k); this.teams[kt].kills += a.kind === "bot" || a.kind === "player" ? 1 : 0;
      h.feed(`${k.name} ▸ ${a.name}`, k === me ? "#ffd24a" : a === me ? "#ff6b5a" : TEAM_CSS[kt] || "#cfd8e3");
      if (k === me) h.toast(`${a.name} 격파  +${pts}`, "#ffd24a", 1.1, 20);
    }
  }

  // 본부가 무너진 팀은 탈락: 드론·포탑이 모두 멈추고, 그 팀 거점은 중립으로
  _eliminate(team, k) {
    const t = this.teams[team], h = this.s.hud, c = this.combat;
    if (t.out) return;
    t.out = true; t.outAt = this.time;
    if (k && k.team !== team) { this._give(k.team, PTS.hq, k); h.feed(`${this.teams[k.team].name} ▸ ${t.name} 본부 파괴`, TEAM_CSS[k.team]); }
    for (const a of c.actors) if (a.team === team && a.alive && a !== this.me && (a.kind === "bot" || a.kind === "turret")) { a.respawns = false; c.kill(a, null); }
    for (const a of c.actors) if (a.team === team && a.kind === "bot") a.respawns = false;
    for (const p of this.points) if (p.owner === team) { p.owner = -1; p.cap = -1; p.v = 0; }
    h.toast(team === 0 ? "우리 본부가 파괴되었습니다 — 탈락" : `${t.name} 탈락!`, team === 0 ? "#ff6b5a" : TEAM_CSS[team], 2.2, 30);
    this.s.game.sound.play(team === 0 ? "fail" : "bigkill");
    if (team === 0) { this.me.respawns = false; this.endT = 2.5; }
    if (this.teams.filter((x) => !x.out).length <= 1) this.endT = 2.5;
  }

  _points(dt) {
    const c = this.combat, h = this.s.hud, me = this.me;
    this.inPt = null;
    for (const p of this.points) {
      p.n.fill(0);
      for (const a of c.actors) {
        if (!a.alive || (a.kind !== "player" && a.kind !== "bot") || this.teams[a.team].out) continue;
        const dy = a.pos.y - p.g.position.y;
        if (Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < CAP_R && dy > -2 && dy < CAP_H) { p.n[a.team]++; if (a === me) this.inPt = p; }
      }
      const present = p.n.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
      if (present.length === 1) {
        const t = present[0], rate = (dt / CAP_TIME) * Math.min(2.5, 0.6 + p.n[t] * 0.6);
        if (p.owner === t) p.v = Math.min(1, p.v + rate);
        else if (p.owner >= 0) { p.v -= rate; if (p.v <= 0) { h.feed(`${this.teams[t].name} ▸ ${p.name} 중립화`, TEAM_CSS[t]); p.owner = -1; p.cap = t; p.v = 0; } }
        else {
          if (p.cap !== t) { p.v -= rate; if (p.v <= 0) { p.cap = t; p.v = 0; } }
          else { p.v += rate; if (p.v >= 1) { p.owner = t; p.v = 1; this._capture(p, t); } }
        }
      }
      const col = p.owner >= 0 ? TEAM_COLOR[p.owner] : 0xe8ecf4;
      p.mat.color.setHex(col).multiplyScalar(1.6);
      p.soft.color.setHex(p.owner < 0 && p.cap >= 0 ? TEAM_COLOR[p.cap] : col);
      p.fill.scale.setScalar(Math.max(0.02, p.v)); p.flag.rotation.y += dt * 1.5;
    }
    // 보유 점수: 1초마다 거점 하나에 PTS.hold
    if ((this.holdT += dt) >= 1) { this.holdT -= 1; for (const p of this.points) if (p.owner >= 0) this._give(p.owner, PTS.hold); }
  }
  _capture(p, t) {
    const c = this.combat, h = this.s.hud;
    this.teams[t].caps++;
    for (const a of c.actors) if (a.alive && a.team === t && (a.kind === "player" || a.kind === "bot") && Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < CAP_R) a.score += PTS.capture;
    this.teams[t].score += PTS.capture;
    h.feed(`${this.teams[t].name} ▸ ${p.name} 점령`, TEAM_CSS[t]);
    if (this.inPt === p && t === 0) GP.ev("capture");
    if (this.inPt === p && t === 0) { h.toast(`${p.name} 점령  +${PTS.capture}`, "#35ff7a", 1.5, 24); this.s.game.sound.play("lap"); }
  }

  ranking() {
    return [...this.teams].sort((a, b) => (a.out !== b.out ? (a.out ? 1 : -1) : a.out ? b.outAt - a.outAt : b.score - a.score));
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run" || this.cut) return;
    this._points(dt);
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.time >= this.duration) this._end();
  }

  _end() {
    if (this.state === "done") return;
    const rk = this.ranking(), mine = rk.indexOf(this.teams[0]) + 1, me = this.me, sc = Math.round(this.teams[0].score);
    const rec = submitRecord(this.recKey, sc);
    this.finish({
      title: mine === 1 ? "승리!" : `${mine}위`, sub: `점령전 · ${this.s.map.name}`, win: mine === 1, record: rec, stars: Math.max(0, 4 - mine),
      board: { cols: ["점수", "거점", "격추", "상태"], rows: rk.map((t) => ({ name: t.name, me: t.id === 0, vals: [Math.round(t.score), this.points.filter((p) => p.owner === t.id).length, t.kills, t.out ? "탈락" : "생존"] })) },
      lines: [{ label: "팀 점수", value: `${sc}` }, { label: "내 점수", value: `${Math.round(me.score)}` }, { label: "최고 기록", value: `${records[this.recKey]}` }],
    });
  }

  missionObjective(o) {
    const me = this.me;
    let best = null, bd = 1e9;
    for (const p of this.points) { if (p.owner === 0) continue; const d = p.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = p; } }
    if (!best) return null;
    o.pos = best.pos; o.label = best.name; o.color = best.owner >= 0 ? TEAM_CSS[best.owner] : "#e8ecf4";
    return o;
  }

  hud(h) {
    const u = h.u, L = h.L, s = this.s, me = this.me;
    drawCombatHud(this.combat, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full", left = Math.max(0, this.duration - this.time);
    h.timer(fmtTime(left), left < 30 ? "#ff6b5a" : "#fff", "#ff3d5a");
    // 왼쪽 위: 팀 순위표
    const rk = this.ranking(), x = L.l, y = L.t, pw = 214 * u, rh = 20 * u, ph = 12 * u + rk.length * rh + (full ? 18 * u : 0);
    h.plate(x, y, pw, ph, { accent: TEAM_CSS[0], skew: 0.04 });
    rk.forEach((t, i) => {
      const yy = y + 8 * u + i * rh + rh / 2, col = t.out ? "#5b6880" : t.css;
      h.text(`${i + 1}`, x + 16 * u, yy, { size: 13, base: "middle", color: "#b4c2d4", shadow: false });
      h.g.fillStyle = col; h.g.fillRect(x + 28 * u, yy - 6 * u, 10 * u, 12 * u);
      h.text(t.name + (t.id === 0 ? " (나)" : ""), x + 46 * u, yy, { size: 13, base: "middle", color: t.out ? "#5b6880" : "#fff", bold: t.id === 0, shadow: false });
      h.text(t.out ? "탈락" : `${Math.round(t.score)}`, x + pw - 40 * u, yy, { size: 13, align: "right", base: "middle", mono: !t.out, color: t.out ? "#ff6b5a" : "#fff", shadow: false });
      h.text(`⚑${this.points.filter((p) => p.owner === t.id).length}`, x + pw - 10 * u, yy, { size: 11, align: "right", base: "middle", color: col, shadow: false });
    });
    if (full) h.text(`내 점수 ${Math.round(me.score)} · 격추 ${me.kills}`, x + 14 * u, y + ph - 9 * u, { size: 11, base: "middle", color: "#ffd24a", shadow: false });
    // 거점 현황 (나침반 아래)
    const n = this.points.length, bw = 30 * u, gap = 6 * u, x0 = L.cx - (n * bw + (n - 1) * gap) / 2, by = L.subY + 6 * u;
    this.points.forEach((p, i) => {
      const bx = x0 + i * (bw + gap), col = p.owner >= 0 ? TEAM_CSS[p.owner] : "#e8ecf4";
      h.plate(bx, by, bw, 20 * u, { skew: 0.2, fill: p.owner >= 0 ? col : "rgba(12,18,34,0.85)", stroke: p === this.inPt ? "#ffd24a" : undefined });
      h.text(LETTERS[i], bx + bw / 2, by + 11 * u, { size: 12, align: "center", base: "middle", color: p.owner >= 0 ? "#0b0f24" : col, shadow: false });
      if (p.v > 0.02 && p.v < 1) h.bar(bx + 3 * u, by + 22 * u, bw - 6 * u, 3 * u, p.v, TEAM_CSS[p.owner >= 0 ? p.owner : Math.max(0, p.cap)]);
      if (me.alive) { const d = p.pos.distanceTo(me.pos); if (d > CAP_R) h.marker(p.pos, s.camera, col, p.name, d); }
    });
    // 적 본부 위치
    if (me.alive) for (const t of this.teams) if (t.id && !t.out) h.marker(t.hq.core.pos, s.camera, t.css, `${t.name} 본부`, t.hq.core.pos.distanceTo(me.pos));
    if (this.inPt && me.alive) {
      const p = this.inPt, contested = p.n.filter((x) => x).length > 1;
      const txt = contested ? `${p.name} 교전 중 — 적을 몰아내세요` : p.owner === 0 ? (p.v >= 1 ? `${p.name} 확보` : `${p.name} 강화 중`) : `${p.name} 점령 중`;
      h.text(txt, L.cx, h.H * 0.3, { size: 18, align: "center", color: contested ? "#ff8a7a" : "#35ff7a" });
      h.bar(L.cx - 80 * u, h.H * 0.3 + 8 * u, 160 * u, 7 * u, p.v, p.owner === 0 || p.cap === 0 ? TEAM_CSS[0] : "#ff8a7a");
    }
  }

  dispose() {
    for (const p of this.points) { this.s.world.scene.remove(p.g); p.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); p.mat.dispose(); p.soft.dispose(); }
    super.dispose();
  }
}
