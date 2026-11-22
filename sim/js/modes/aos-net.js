// 기지전 온라인 동기화 (netgame.js 의 NetGame 위에서) — 호스트가 월드를 시뮬레이션하고, 클라이언트는 받아 그린다
//  호스트 → 프레즌스(약 15 Hz, 4 KiB 이하):
//   · 구조물 22개   defineKind "st"  [체력, 생존]                       (코어 2 · 타워 12 · 기지 방어 포탑 8. 클라이언트는 자기 쪽에 세운 같은 구조물에 반영. 맞히면 호스트로 보고)
//   · 미니언        defineKind "mn"  [x, y, z, 체력, 팀|중형<<1, 사격 수] (온라인은 동시에 최대 30기)
//   · 정글 감시자   defineKind "nt"  [x, y, z, 체력, 정예<<1, 사격 수]
//   · 보스          defineActorKind "boss" (보간되는 대리 액터)
//   · 봇            shareActor "bot" (NetGame 기본)
//   · 호스트 값     "a" [승자, 격추0, 격추1, 잃은 타워0, 잃은 타워1, 강화0, 강화1, 상자 비트, 캠프 비트, 전장 점수0, 전장 점수1, 목표 점수, 끝난 까닭 번호]
//                   "p" { id: [ⓟ, 화력, 장갑, 기동, 스킬, 부품 비트, 격추, 도움, 구조물 피해] }  (봇·사람 모두)
//                   "tf" [[구조물 번호, 표적 id], ...]  (타워·코어·방어 포탑이 지금 쏘는 표적 — 클라이언트는 피해 없는 탄으로 보여 준다)
//                   "al" [[경보 남은 초 ×10, 경보 횟수], [..]]  (팀별 침입 경보 — 횟수가 늘면 클라이언트도 경보 연출)
//  클라이언트 → 호스트: 자기 프레즌스 필드 "buy" [번호, 강화 종류] (기지 안에서만 호스트가 받아 준다)
import * as THREE from "../../vendor/three.module.min.js";
import { buildDrone, botLook } from "../dronemodel.js";
import { TEAM_COLOR, TEAM_CSS } from "../combat.js";
import { UP_KEYS, PART_KEYS, PARTS } from "./aos.js";

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
export const NET_MINIONS = 30;

export class AosNet {
  constructor(m) {
    this.m = m; this.ng = m.ng; this.host = m.ng.owner; this.online = m.ng.online;
    this.buyN = 0; this.seenBuy = new Map(); this.mnN = 0; this.fieldT = 0; this.tfT = 0; this.drop = []; this.lastA = ""; this.lastP = ""; this.alSeen = []; this.alN = [];
  }

  setup() {
    const m = this.m, ng = this.ng;
    m.structs = [...m.teams.map((t) => t.core), ...m.towers, ...m.defs];
    m.structs.forEach((a, i) => { a.nid = "s" + i; });
    ng.defineKind("st", { ser: (a) => [Math.round(a.hp), a.alive ? 1 : 0], create: (id) => m.structs[+id.slice(1)] || null, apply: (a, d) => this._struct(a, d), remove: () => {}, actor: (a) => a });
    for (const kind of ["mn", "nt"]) ng.defineKind(kind, {
      ser: (a) => [Math.round(a.pos.x), Math.round(a.pos.y), Math.round(a.pos.z), Math.max(0, Math.round(a.alive ? a.hp : 0)), (a.team === 1 ? 1 : 0) | (a.heavy || a.elite ? 2 : 0), (a.shotN || 0) & 255],
      create: (id, d, owner) => this._proxy(kind, id, d, owner), apply: (o, d) => this._apply(o, d), remove: (o) => this._remove(o), actor: (o) => o,
    });
    ng.defineActorKind("boss", { meta: (a) => [a.name], build: () => ({ model: buildDrone(botLook("boss", 2), 17, { halo: TEAM_COLOR[2] }), radius: 5.5, name: "중앙 보스 · 타이탄" }) });
    if (!this.online) return;
    if (this.host) for (const a of m.structs) ng.share("st", a.nid, a);
    else for (const a of m.structs) a.remote = true;
    ng.onDeath = (e) => this._death(e);
  }

  // ── 호스트: 새로 생긴 월드 액터 공유 ──
  shareMinion(a) { if (this.online && this.host) { a.nid = "n" + (++this.mnN % 100000); this.ng.share("mn", a.nid, a); } }
  shareNeutral(a, id) { if (this.online && this.host) { a.nid = id; this.ng.share("nt", id, a); } }
  shareBoss(a) { if (this.online && this.host && !a.nid) this.ng.shareActor("boss", a, "boss"); }
  shareBot(a, i) { if (this.online && this.host) this.ng.shareActor("bot", a, "b" + i); }
  died(a) { if (this.online && this.host && a.nid && (a.isMinion || (a.isNeutral && !a.isBoss))) this.drop.push([a.nid, this.m.s.time + 1.2]); }
  canSpawnMinion() { return !this.online || this.m.minions.filter((x) => x.alive).length < NET_MINIONS; }

  update(dt) {
    if (!this.online) return;
    const m = this.m, ng = this.ng;
    if (this.host) {
      for (let i = this.drop.length - 1; i >= 0; i--) if (m.s.time > this.drop[i][1]) { const id = this.drop[i][0], o = ng.owned.get(id); if (o && !o.obj.alive) ng.unshare(id); this.drop.splice(i, 1); }
      this._pilots();
      if ((this.fieldT -= dt) <= 0) { this.fieldT = 0.1; this._fields(); }
    } else this._client(dt);
  }

  // 원격 사람(조종사)도 영웅으로: 포인트·강화·부품·상자는 호스트가 센다
  _pilots() {
    const m = this.m, ng = this.ng, live = new Set(this.m.combat.actors);
    for (const p of ng.players()) {
      if (p.me || !p.actor) continue;
      const a = p.actor;
      if (!a.aos) { a.aos = m._heroData(a.team, "mid", "lane"); a.isHero = true; m.heroes.push(a); }
      const f = ng.field(p.id, "buy");
      if (Array.isArray(f) && typeof f[0] === "number" && f[0] > (this.seenBuy.get(p.id) || 0)) { this.seenBuy.set(p.id, f[0]); if (typeof f[1] === "string") m.buy(a, f[1]); }
    }
    m.heroes = m.heroes.filter((a) => !a.remote || live.has(a));
  }
  _fields() {
    const m = this.m, ng = this.ng, [A, B] = m.teams;
    ng.setHostField("a", [m.winner, A.kills, B.kills, A.lost, B.lost, Math.round(A.buffT), Math.round(B.buffT),
      m.caches.reduce((s, k, i) => s | (k.active ? 1 << i : 0), 0), m.camps.reduce((s, c, i) => s | (c.alive ? 1 << i : 0), 0), A.score, B.score, m.goal, m.whyCode()]);
    const p = {};
    for (const a of m.heroes) {
      const id = ng.idOf(a);
      if (!id || a.targetable === false) continue;
      const D = a.aos;
      p[id] = [Math.floor(D.pts), ...UP_KEYS.map((k) => D.up[k]), PART_KEYS.reduce((s, q, i) => s | (D.parts[q] ? 1 << i : 0), 0), D.hk, D.assists, Math.round(D.towerDmg), a.deaths];
    }
    ng.setHostField("p", p);
    const tf = [];
    m.structs.forEach((s, i) => { const t = s.alive && (s.aosTower ? s.ai.target : s.aosDef ? s.defTarget : s.coreTarget); if (t && t.alive) { const id = ng.idOf(t); if (id) tf.push([i, id]); } });
    ng.setHostField("tf", tf);
    ng.setHostField("al", m.teams.map((t) => [Math.round(t.alarmT * 10), t.alarmN]));
  }

  // ── 클라이언트 ──
  wantBuy(key) { this.ng.setField("buy", [++this.buyN, key]); }
  _client(dt) {
    const m = this.m, ng = this.ng, me = m.me;
    // 팀·상자·캠프
    const a = ng.hostField("a");
    if (Array.isArray(a) && a.length >= 9) {
      const key = a.join(",");
      if (key !== this.lastA) {
        this.lastA = key;
        const [A, B] = m.teams;
        A.kills = a[1] | 0; B.kills = a[2] | 0; A.lost = a[3] | 0; B.lost = a[4] | 0;
        for (const [t, b] of [[A, a[5]], [B, a[6]]]) { if (b > 0 && !(t.buffT > 0)) m.s.hud.toast(t.id === me.team ? "보스 처치! 아군 60초 강화" : `${t.name}이 보스를 처치했습니다`, t.id === me.team ? "#ff4ad6" : "#ff8a7a", 2.2, 22); t.buffT = +b || 0; }
        m.caches.forEach((k, i) => { const on = !!(a[7] & (1 << i)); k.active = on; k.g.visible = on; });
        m.camps.forEach((c, i) => { c.alive = !!(a[8] & (1 << i)); });
        if (a.length >= 13) { A.score = Math.max(0, a[9] | 0); B.score = Math.max(0, a[10] | 0); if (a[11] >= 10 && a[11] <= 300) m.goal = a[11] | 0; m.setWhy(a[12]); }
        if (m.winner < 0 && m.endT < 0 && (a[0] >= 0 || (a.length >= 13 && a[12] > 0))) { m.winner = a[0] >= 0 ? a[0] | 0 : -1; m.endT = 2.5; }   // 무승부(-1)도 까닭이 오면 끝낸다
      }
    }
    for (const t of m.teams) if (t.buffT > 0) t.buffT = Math.max(0, t.buffT - dt);
    // 침입 경보: 호스트의 경보 횟수가 늘면 연출, 남은 시간은 호스트 값을 따르며 사이사이 줄여 간다
    const al = ng.hostField("al");
    if (Array.isArray(al)) m.teams.forEach((t, i) => {
      const x = al[i]; if (!Array.isArray(x)) return;
      const n = x[1] | 0, key = x.join(",");
      if (this.alSeen[i] !== undefined && n > this.alN[i]) m._alarmFx(t, null);
      if (key !== this.alSeen[i]) t.alarmT = Math.max(0, (+x[0] || 0) / 10);
      this.alSeen[i] = key; this.alN[i] = n; t.alarmN = n;
    });
    for (const t of m.teams) if (t.alarmT > 0) t.alarmT = Math.max(0, t.alarmT - dt);
    // 영웅 정보
    const p = ng.hostField("p");
    if (p && typeof p === "object") {
      const heroes = [me];
      for (const q of ng.players()) if (!q.me && q.actor) heroes.push(q.actor);
      for (const o of m.combat.actors) if (o.remote && o.isBot) heroes.push(o);
      for (const h of heroes) {
        const e = p[ng.idOf(h)];
        if (!h.aos) { h.aos = m._heroData(h.team, "mid", "lane"); h.isHero = true; }
        if (!Array.isArray(e)) continue;
        const D = h.aos, before = UP_KEYS.map((k) => D.up[k]).join("") + "|" + PART_KEYS.map((q) => D.parts[q] ? 1 : 0).join("");
        D.pts = +e[0] || 0; UP_KEYS.forEach((k, i) => { D.up[k] = e[1 + i] | 0; });
        const got = [];
        PART_KEYS.forEach((q, i) => { const on = !!(e[5] & (1 << i)); if (on && !D.parts[q]) got.push(q); D.parts[q] = on ? 1 : 0; });
        D.hk = e[6] | 0; D.assists = e[7] | 0; D.towerDmg = e[8] | 0; D.earned = Math.max(D.earned, D.pts);
        if (h === me) {
          const after = UP_KEYS.map((k) => D.up[k]).join("") + "|" + PART_KEYS.map((q) => D.parts[q] ? 1 : 0).join("");
          if (after !== before) m._applyStats(me);
          for (const q of got) { m.s.hud.toast(`숨은 상자! ${PARTS[q].icon} ${PARTS[q].name} — ${PARTS[q].desc}`, PARTS[q].color, 2.6, 22); m.s.game.sound.play("pickup"); if (q === "warhead") me.missiles += 2; }
        }
      }
      m.heroes = heroes;
    }
    const bs = ng.actorById("boss");
    m.boss = bs || null;
    // 대리 미니언·감시자 보간
    for (const o of [...m.minions, ...m.netNeutrals]) if (o.alive && o.tgt) { o.pos.lerp(o.tgt, Math.min(1, dt * 9)); o.model.position.copy(o.pos); }
    // 타워·코어 사격 연출 (피해 없음)
    if ((this.tfT -= dt) <= 0) {
      this.tfT = 0.42;
      const tf = ng.hostField("tf");
      if (Array.isArray(tf)) for (const e of tf.slice(0, 16)) {
        const s = m.structs[e[0]], t = ng.actorById(e[1]);
        if (!s || !s.alive || !t || !t.alive) continue;
        this._ghost(s, t, s.aosTower ? 2.6 : s.aosDef ? 3.4 : 7.5, s.aosDef && m.teams[s.team].alarmT > 0 ? 0xff5040 : s.team ? 0xffa040 : 0x66b8ff, s.aosDef ? 150 : 110);
      }
    }
  }
  _ghost(from, to, off, color, speed) {
    const c = this.m.combat;
    _v.copy(to.pos).sub(from.pos).normalize();
    _w.copy(from.pos).addScaledVector(_v, off);
    c.fireLaser(from, _w, _v, 0, color, speed);
    c.shots[c.shots.length - 1].ghost = true;
  }
  _struct(a, d) {
    const m = this.m;
    if (!Array.isArray(d)) return;
    if (!d[1] && a.alive) {
      m.combat.kill(a, null);
      if (a.bubble) { m.s.world.scene.remove(a.bubble); a.bubble = null; }
      m.s.hud.feed(`${a.name} 파괴`, TEAM_CSS[1 - a.team]);
      m.s.hud.toast(a.team === m.me.team ? `${a.name}가 무너졌습니다` : `${a.name} 파괴!`, a.team === m.me.team ? "#ff8a7a" : "#ffd24a", 2, 22);
    } else if (d[1]) a.hp = Math.max(0, +d[0] || 0);
    // 보호막: 바깥 타워가 무너진 라인의 안쪽 타워, 타워 둘이 모두 무너진 라인이 있으면 코어
    for (const t of m.teams) {
      for (const x of t.towers) if (x.alive && x.invulnerable && !t.towers.find((y) => y.lane === x.lane && y.tier === "outer").alive) m._unshield(x);
      if (t.core.invulnerable && Object.keys(m.paths).some((ln) => t.towers.filter((x) => x.lane === ln).every((x) => !x.alive))) {
        m._openCore(t);
        m._hint(t.id === m.me.team ? "아군 코어 노출! 기지를 지키세요" : `${t.name} 코어 노출 — 코어를 공격하세요!`, t.id === m.me.team ? "#ff6b5a" : "#35ff7a", 8);
      }
    }
  }
  _proxy(kind, id, d, owner) {
    const m = this.m, sw = kind === "mn" ? m.swarms[0] : m.swarms[1], f = d[4] | 0, big = !!(f & 2), team = kind === "mn" ? f & 1 : 2;
    const hp = kind === "mn" ? (big ? 200 : 75) : big ? 420 : 110;
    const a = this.ng.makeProxy(id, { owner, team, name: kind === "mn" ? (big ? "중형 미니언" : "미니언") : big ? "정예 비행 감시자" : "비행 감시자", radius: kind === "mn" ? (big ? 1.3 : 0.85) : big ? 2.2 : 1.2, model: sw.proxy(), hp: +d[3] || hp, maxHp: hp });
    a.isMinion = kind === "mn"; a.isNeutral = kind === "nt"; a.heavy = big;
    a.model.scale.setScalar(sw.scale * (big ? (kind === "mn" ? 1.6 : 1.9) : 1));
    a.tgt = new THREE.Vector3(+d[0] || 0, +d[1] || 0, +d[2] || 0); a.pos.copy(a.tgt); a.alive = +d[3] > 0; a.model.visible = a.alive; a.model.position.copy(a.pos);
    a.shotSeen = d[5] | 0; a.sw = sw;
    sw.add(a, kind === "mn" ? TEAM_COLOR[team] : big ? 0xffb040 : 0xa46bff);
    (kind === "mn" ? m.minions : m.netNeutrals).push(a);
    return a;
  }
  _apply(a, d) {
    if (!Array.isArray(d)) return;
    a.tgt.set(+d[0] || 0, +d[1] || 0, +d[2] || 0); a.hp = Math.max(0, +d[3] || 0);
    if (a.hp <= 0 && a.alive) { a.alive = false; a.model.visible = false; this.m.s.fx.destroy(a.pos, 1); }
    const n = d[5] | 0;
    if (n !== a.shotSeen && a.alive) {
      a.shotSeen = n;
      // 쏜 방향은 싣지 않는다: 가장 가까운 적 쪽으로 피해 없는 탄을 보여 준다
      let best = null, bd = 45;
      for (const o of this.m.combat.actors) if (o.alive && o.team !== a.team && (o.team !== 2 || !a.isNeutral) && o.targetable !== false) { const dd = o.pos.distanceTo(a.pos); if (dd < bd) { bd = dd; best = o; } }
      if (best) this._ghost(a, best, a.radius + 0.4, a.isNeutral ? 0xc080ff : a.team ? 0xff5040 : 0x66b8ff, 92);
    }
  }
  _remove(a) {
    const m = this.m;
    a.sw.remove(a);
    this.ng._dropActor(a);
    m.minions = m.minions.filter((x) => x !== a); m.netNeutrals = m.netNeutrals.filter((x) => x !== a);
  }
  // 격추: 호스트는 원격 영웅의 격추도 점수에 반영, 클라이언트는 알림만
  _death(e) {
    const m = this.m, h = m.s.hud, v = e.victim, k = e.killer;
    if (this.host) { if (!e.local && v && v.isHero) m._onKill(v, k); return; }
    if (v && (v.isPilot || v.isBot || v === m.me)) {
      const vn = v.name || this.ng.nameOf(e.vid), kn = k ? k.name : this.ng.nameOf(e.kid);
      if (e.kid && e.kid !== e.vid) { h.feed(`${kn} ▸ ${vn}`, k === m.me ? "#ffd24a" : v === m.me ? "#ff6b5a" : TEAM_CSS[k ? k.team : 0] || "#cfd8e3"); if (k === m.me) h.toast(`${vn} 격추`, "#ffd24a", 1.2, 20); }
    }
  }
}
