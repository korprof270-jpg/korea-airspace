// PvP: 다른 플레이어(와 컴퓨터)와 겨루는 서바이벌 — 개인전(FFA) / 팀전(TDM)
// 파츠 능력치 미적용(외형만) · 스킬 피해 60% · 3초 재출격 · 3초 리스폰 보호
// 네트워크 동기화는 netgame.js (cfg.net 이 없으면 오프라인: 컴퓨터와 혼자)
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { TEAM_CSS } from "../combat.js";
import { botLook } from "../dronemodel.js";
import { fmtTime, clamp } from "../config.js";
import { drawCombatHud } from "../combathud.js";
import { NetGame } from "../netgame.js";
import { TEAM_LABEL } from "../pvp.js";

export const PVP_SKILL_K = 0.6;
const CALL = ["독수리", "송골매", "까치", "올빼미", "참매", "황조롱이", "두루미", "갈매기"];
const DIFF = { easy: { kind: "grunt", skill: 0.75, rank: 1 }, normal: { kind: "grunt", skill: 1, rank: 5 }, hard: { kind: "ace", skill: 1.2, rank: 9 } };
const _v = new THREE.Vector3();

export class PvpMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.P = cfg.pvp || {};
    this.variant = this.P.variant === "tdm" ? "tdm" : "ffa";
    this.teamN = this.variant === "tdm" ? clamp(this.P.teams || 2, 2, 4) : 0;
    this.duration = cfg.time || 180;
    this.title = `PVP · ${this.variant === "tdm" ? "팀전" : "개인전"}`;
    this.ng = new NetGame(this, cfg.net || null);
    this.bots = [];
    if (this.P.elapsed > 0) { this.time = Math.min(this.duration - 10, this.P.elapsed + 1); this.count = 1.2; }   // 중간 입장
  }
  // 온라인 일시정지 중에도 세계는 돌지만 조종은 막는다
  get locked() { return super.locked || this.s.game.state === "pause"; }
  botLook(kind, team) { return botLook(kind, this.variant === "ffa" ? 1 : team); }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat, ffa = this.variant === "ffa";
    const c = this.initCombat({ ffa, baseStats: true, skillK: PVP_SKILL_K, spawnPoint: (a) => this._spawn(a) });
    c.multi = this.teamN > 2;
    const me = this.me;
    me.name = this.P.name || "나"; me.team = ffa ? 0 : clamp(this.P.team || 0, 0, this.teamN - 1);
    this.ng.attach(c);
    this.ng.onDeath = (e) => this._onDeath(e);
    // 팀 기지: 청·홍은 맵의 두 기지, 자·주는 그 사이 축의 양끝 (점령전과 같은 배치)
    const A = new THREE.Vector3(mc.blue[0], 0, mc.blue[1]), B = new THREE.Vector3(mc.red[0], 0, mc.red[1]);
    const mid = A.clone().add(B).multiplyScalar(0.5), half = A.distanceTo(B) / 2, perp = new THREE.Vector3(-(B.z - A.z), 0, B.x - A.x).normalize();
    const lim = w.size - 30, cl = (p) => p.set(clamp(p.x, -lim, lim), 0, clamp(p.z, -lim, lim));
    this.bases = [A, B, cl(mid.clone().addScaledVector(perp, half)), cl(mid.clone().addScaledVector(perp, -half))];
    for (const p of this.bases) p.y = w.h(p.x, p.z);
    this.center = mid;
    const sp = this._spawn(me);
    this.placePlayer(sp.pos, sp.yaw);
    me.spawnGodT = s.time + 3 + this.count;   // 처음 출격도 보호
    // 컴퓨터 플레이어: 호스트(또는 오프라인)만 시뮬레이션하고, 다른 사람에게는 프레즌스로 보낸다
    if (this.ng.owner) {
      const list = (this.P.bots || []).slice(0, 8);
      const fill = Math.max(0, (this.P.fill || 0) - (this.P.players || 1) - list.length);
      const count = new Array(Math.max(1, this.teamN)).fill(0);
      count[me.team]++;
      for (const e of list) if (this.teamN) count[e[1] % this.teamN]++;
      for (let i = 0; i < fill; i++) { const t = this.teamN ? count.indexOf(Math.min(...count)) : 1; if (this.teamN) count[t]++; list.push([`f${i}`, t, "normal"]); }
      list.forEach(([, team, df], i) => {
        const D = DIFF[df] || DIFF.normal, tm = ffa ? 1 : clamp(team, 0, this.teamN - 1);
        const b = c.spawnBot({ kind: D.kind, team: tm, respawns: true, skill: D.skill, rank: D.rank, name: `${CALL[i % CALL.length]} [AI]` });
        b.pvpTeam = tm;
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
        this.ng.shareActor("bot", b, "b" + i);
        this.bots.push(b);
      });
    }
    c.scatterPickups(9);
  }

  _spawn(a) {
    const c = this.combat, w = this.s.world;
    if (this.variant === "ffa") {
      let best = null, bd = -1;
      for (let i = 0; i < 10; i++) {
        const p = c.randomPoint(a.isPlayer ? 2 : 8, a.isPlayer ? 6 : 24, 0.6);
        let d = 1e9;
        for (const o of c.actors) if (o !== a && o.alive && (o.kind === "bot" || o.remote || o.isPlayer)) d = Math.min(d, o.pos.distanceTo(p));
        if (d > bd) { bd = d; best = p; }
      }
      return { pos: best, yaw: Math.atan2(best.x, best.z) };
    }
    const B = this.bases[clamp(a.team, 0, 3)], O = this.center;
    const dir = _v.copy(O).sub(B).setY(0); if (dir.lengthSq() < 1) dir.set(1, 0, 0); dir.normalize();
    const ang = Math.random() * Math.PI * 2, r = 18 + Math.random() * 12;
    const p = new THREE.Vector3(B.x + Math.cos(ang) * r + dir.x * 10, 0, B.z + Math.sin(ang) * r + dir.z * 10);
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 2 : 10 + Math.random() * 8);
    for (let i = 0; i < 12 && w.col.blocked(p, 1.6); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(-dir.x, -dir.z) };
  }

  _onDeath({ vid, kid, victim, killer }) {
    const h = this.s.hud, me = this.me, ng = this.ng;
    const vn = victim ? victim.name : ng.nameOf(vid), kn = killer ? killer.name : ng.nameOf(kid);
    if (kid && kid !== vid) {
      h.feed(`${kn} ▸ ${vn}`, killer === me ? "#ffd24a" : victim === me ? "#ff6b5a" : "#cfd8e3");
      if (killer === me) h.toast(`${vn} 격추`, "#ffd24a", 1.2, 22);
    } else h.feed(`${vn} 추락`, "#9fb4c8");
    for (const a of [me, ...this.bots]) a.score = a.kills * 100;
  }

  onGo() { this.s.hud.toast("파츠 능력치 미적용 · 스킬 피해 60%", "#9fd8ff", 2.2, 18); }

  update(dt) {
    super.update(dt);
    this.ng.update(dt);
    // 클라이언트: 호스트 시계보다 많이 늦으면 따라잡는다 (프레임이 느린 기기도 같은 때 끝나게)
    const he = this.state === "run" ? this.ng.hostElapsed() : null;
    if (he !== null && he > this.time + 1.5) this.time = Math.min(this.duration, he);
    if (this.state === "run" && this.time >= this.duration) this._end();
  }

  // 순위: 격추 많은 순, 같으면 피격추 적은 순
  _rows() { return this.combat.board().slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths); }
  teamKills() {
    const t = new Array(this.teamN || 1).fill(0);
    for (const a of this.combat.board()) if (this.teamN && a.team < this.teamN) t[a.team] += a.kills;
    return t;
  }

  _end() {
    const me = this.me, rows = this._rows(), ffa = this.variant === "ffa";
    const board = { cols: ["순위", "격추", "피격추"], rows: rows.map((a, i) => ({ name: a.name + (ffa ? "" : ` · ${TEAM_LABEL[a.team] || ""}`), me: a === me, vals: [i + 1, a.kills, a.deaths] })) };
    const lines = [{ label: "내 격추", value: `${me.kills}` }, { label: "내 피격추", value: `${me.deaths}` }];
    let res;
    if (ffa) {
      const rank = 1 + rows.findIndex((a) => a === me);
      res = { title: rank === 1 ? "1위 — 승리!" : `${rank}위`, sub: `PVP 개인전 · ${rows.length}명`, win: rank === 1, stars: Math.max(0, 4 - rank), board, lines };
    } else {
      const t = this.teamKills(), best = Math.max(...t), mine = t[me.team], tie = t.filter((x) => x === best).length > 1;
      const win = mine === best && !tie;
      res = { title: win ? "승리!" : mine === best ? "무승부" : "패배", sub: `PVP 팀전 · ${t.map((x, i) => `${TEAM_LABEL[i]} ${x}`).join(" : ")}`, win, stars: win ? 3 : mine === best ? 1 : 0, board, lines };
    }
    res.pvp = { auto: !!this.P.auto, code: this.P.code };
    if (this.P.client) this.P.client.matchOver(this.P.mid);
    this.finish(res);
  }

  hud(h) {
    const u = h.u, L = h.L, c = this.combat, me = this.me;
    drawCombatHud(c, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full", left = Math.max(0, this.duration - this.time);
    h.timer(fmtTime(left), left < 20 ? "#ff6b5a" : "#fff", "#ff3d5a");
    const pw = 190 * u, ph = (full ? 60 : 36) * u, x = L.l, y = L.t;
    h.plate(x, y, pw, ph, { accent: this.variant === "tdm" ? TEAM_CSS[me.team] : "#ff3d5a", skew: full ? 0.1 : 0.2 });
    h.text("격추", x + 20 * u, y + 20 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
    h.text(`${me.kills}`, x + pw - 14 * u, y + 19 * u, { size: 26, align: "right", base: "middle", mono: true, shadow: false });
    if (full) {
      const rows = this._rows(), rank = 1 + rows.findIndex((a) => a === me);
      h.text(this.variant === "ffa" ? `${rank}위 / ${rows.length}` : `${TEAM_LABEL[me.team]}`, x + 14 * u, y + 46 * u, { size: 14, base: "middle", color: this.variant === "tdm" ? TEAM_CSS[me.team] : rank === 1 ? "#ffd24a" : "#fff", shadow: false });
      h.text(`피격추 ${me.deaths}`, x + pw - 14 * u, y + 46 * u, { size: 13, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
      const on = this.ng.online ? `온라인 ${1 + this.ng.remotes.size}명` : "오프라인 연습";
      h.text(`${on} · Tab 점수판`, x + 6 * u, y + ph + 16 * u, { size: 11, color: "#9fb4c8" });
    }
    if (this.variant === "tdm") {
      const t = this.teamKills(), tw = 58 * u, th = 30 * u, gap = 6 * u, n = t.length, tot = n * tw + (n - 1) * gap, ty = L.subY + 4 * u;
      t.forEach((k, i) => {
        const bx = L.cx - tot / 2 + i * (tw + gap);
        h.plate(bx, ty, tw, th, { accent: TEAM_CSS[i], skew: 0.16 });
        h.text(`${k}`, bx + tw / 2, ty + 16 * u, { size: 18, align: "center", base: "middle", mono: true, color: TEAM_CSS[i], shadow: false });
      });
    }
  }

  dispose() { this.ng.dispose(); super.dispose(); }
}
