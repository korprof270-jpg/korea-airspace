// 경기 중 네트워크 동기화 (PvP · 앞으로의 온라인 모드 공용) — 프레즌스만 쓰는 구조
//
// ┌─ 통합 API (모드가 쓰는 것) ────────────────────────────────────────────────────────────────┐
// │ const ng = new NetGame(mode, cfg.net)    // cfg.net 이 없으면 오프라인(봇과 혼자). 자세한 설명: js/net/README.md
// │ ng.role            "host" | "client" | "offline"   — 경기를 시작할 때의 역할(경기 중에는 바뀌지 않는다)
// │ ng.owner           role !== "client" (호스트·오프라인): 월드 오브젝트·봇을 직접 시뮬레이션하는 쪽
// │ ng.myId            내 식별자(peer 라벨, 오프라인은 "me")
// │ ng.attach(combat)  initCombat 직후 한 번. 피해·격추·미사일 훅을 건다
// │ ng.update(dt)      매 프레임 (mode.update 끝에서)
// │ ng.dispose()       mode.dispose 에서
// │ ── 호스트 소유 월드 오브젝트 (id → 상태, 호스트가 시뮬레이션, 클라이언트는 맞힌 것을 보고) ──
// │ ng.defineActorKind(kind, { build(meta, team, id) → { model, radius, name }, meta(actor) → Json })
// │     드론처럼 움직이는 전투 액터(봇·몬스터·포탑 등). 위치·자세·체력·생존·팀·격추·사격을 자동으로 싣고,
// │     클라이언트에는 보간되는 대리 액터(kind "remote")를 만든다. 대리 액터를 맞히면 자동으로 호스트에 피해가 보고된다
// │ ng.shareActor(kind, actor, id?)   호스트: 내 로컬 전투 액터를 공유 (actor.nid = id)
// │ ng.defineKind(kind, { ser(obj) → Json, create(id, data, owner) → obj, apply(obj, data), remove(obj), actor?(obj) → 전투 액터 })
// │     임의의 오브젝트(점령 지점·상점·아이템 상자 등). ser 는 작게(숫자 배열 권장)
// │ ng.share(kind, id, obj) / ng.unshare(id)   호스트: 공유 시작·중지
// │ ng.makeProxy(id, opts)  클라이언트 create() 안에서 대리 전투 액터가 필요할 때 (맞으면 호스트로 보고됨)
// │ ng.onHitReport = (id, dmg, attackerId, attackerActor) => {}   호스트: 액터가 없는 오브젝트에 들어온 피해 보고
// │ ng.onDeath = ({ vid, kid, victim, killer, local }) => {}      모든 드론·공유 액터의 격추 (로컬·원격 공통, 한 번씩)
// │ ── 모드 전용 값 ──
// │ ng.setField(key, json)          내 프레즌스에 싣는 플레이어별 값 (예: 경기 내 레벨·업그레이드)
// │ ng.field(id, key)               다른 플레이어(또는 나)의 값
// │ ng.setHostField(key, json)      호스트만: 팀 점수 같은 경기 전체 값
// │ ng.hostField(key)               호스트가 실은 값 (호스트·오프라인은 내 값)
// │ ng.players()                    [{ id, name, team, actor, me }] (나 포함, 대리 봇 제외)
// │ ng.actorById(id)                id → 전투 액터 (나 · 원격 플레이어 · 공유/대리 액터)
// └──────────────────────────────────────────────────────────────────────────────────────────┘
// 프레즌스 g 의 모양 (모두 짧은 키, 반올림한 숫자):
//  { m: 경기 id, t: 보낸 쪽 시계(ms), p/q/v/a: 위치·자세·속도·조준, hp, mh, sh, fl: 생존|보호<<1|마비<<2|과충전<<3, tm, k, d, f: 쏜 레이저 수,
//    sk: [스킬 id, 발동 수], ms: [[n, 쏜 id, 표적 id]], dl: [[n, 격추된 id, 격추한 id]], hd: [[맞은 id, 때린 id, 누적 피해, 마비 횟수, 마비 초]],
//    x: {플레이어별 모드 값}, h: {호스트 값}, w: {종류: [[id, ...], ...]}, el: 진행 시간 }
// 피해: 쏜 쪽이 누적 피해를 싣고, 맞은 쪽(또는 호스트)이 늘어난 만큼만 한 번 적용한다 (맞은 쪽 권한 · 받은 값은 모두 검사·제한)
import * as THREE from "../vendor/three.module.min.js";
import { buildDrone, FRAMES, CANOPIES, SKINS, LED_MODES } from "./dronemodel.js";
import { DRONE_CLASSES, settings } from "./config.js";
import { SKILLS } from "./skilldefs.js";
import { TEAM_COLOR } from "./combat.js";
import * as GP from "./garage.js";

const SEND_DT = 1 / 15;            // 프레즌스 보내는 간격(초)
const DELAY = 120, EXTRAP = 250;   // 보간 지연·최대 외삽(ms)
export const PLAYER_SCALE = 2.2, PLAYER_R = 0.9;
const MAX_HIT = 600;               // 한 번에 받아들이는 최대 피해
const PRES_WARN = 3800;

const fin = (x) => typeof x === "number" && isFinite(x);
export const num = (x, d = 0, lo = -1e6, hi = 1e6) => (fin(x) ? Math.min(hi, Math.max(lo, x)) : d);
const rd = (x, k = 100) => Math.round(x * k) / k;
const ID_RE = /^[A-Za-z0-9_.:-]{1,48}$/;
export const sid = (x) => (typeof x === "string" && ID_RE.test(x) ? x : "");
const v3 = (a, out, lim = 5000) => (Array.isArray(a) && a.length >= 3 ? out.set(num(a[0], 0, -lim, lim), num(a[1], 0, -lim, lim), num(a[2], 0, -lim, lim)) : out);
const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), FWD = new THREE.Vector3();
const HEX = /^#[0-9a-fA-F]{6}$/;

// ── 기체 외형: 내 외형을 작은 객체로 / 받은 것을 검사해 되살림 ──
export function lookSpec() {
  const d = settings.drone, P = GP.partLook(), L = GP.loadout();
  return { c: d.cls, f: d.frame, cp: d.canopy, pr: d.props, s: d.skin, fc: d.frameColor, ac: d.accentColor, pc: d.propColor, lc: d.ledColor, lm: d.ledMode,
    pt: GP.SLOTS.map((k) => [P[k].v, P[k].lv]), lz: L.fx.laser };
}
export function parseLook(o) {
  o = o && typeof o === "object" ? o : {};
  const pick = (v, set, d) => (typeof v === "string" && Object.prototype.hasOwnProperty.call(set, v) ? v : d);
  const col = (v, d) => (typeof v === "string" && HEX.test(v) ? v : d);
  const look = { frame: pick(o.f, FRAMES, "x"), canopy: pick(o.cp, CANOPIES, "pod"), props: Math.round(num(o.pr, 3, 2, 5)), skin: pick(o.s, SKINS, "solid"),
    frameColor: col(o.fc, "#1b1f27"), accentColor: col(o.ac, "#ff5a1f"), propColor: col(o.pc, "#21d4fd"), ledColor: col(o.lc, "#3dff7c"), ledMode: pick(o.lm, LED_MODES, "solid") };
  const parts = {};
  GP.SLOTS.forEach((k, i) => { const e = Array.isArray(o.pt) ? o.pt[i] : null, V = GP.PARTS[k].variants; parts[k] = { v: e && typeof e[0] === "string" && V[e[0]] ? e[0] : "std", lv: Math.round(num(e && e[1], 0, 0, 5)) }; });
  const cls = DRONE_CLASSES[o.c] ? o.c : "freestyle";
  return { look, parts, scale: DRONE_CLASSES[cls].scale, laser: Math.round(num(o.lz, 0x4dd8ff, 0, 0xffffff)) };
}

export class NetGame {
  // o: { room, me, mid, host, client, elapsed }  (없으면 오프라인)
  constructor(mode, o = null) {
    this.mode = mode; this.s = mode.s;
    this.room = o && o.room ? o.room : null;
    this.myId = (o && sid(o.me)) || "me";
    this.mid = (o && String(o.mid || "")) || "offline";
    this.client = o ? o.client || null : null;
    this.role = !this.room ? "offline" : o.host ? "host" : "client";
    this.kinds = new Map();          // 종류 → 정의
    this.owned = new Map();          // id → { kind, obj } (호스트가 공유하는 것)
    this.proxies = new Map();        // id → { kind, obj, owner, seen } (클라이언트가 받은 것)
    this.remotes = new Map();        // peer → 원격 플레이어 액터
    this.offs = new Map();           // peer → 시계 차이(ms)
    this.lastP = new Map();          // peer → 마지막으로 처리한 presence 객체
    this.hd = new Map();             // `${v}|${akey}` → [v, a, tot, ss, sd]
    this.seenHit = new Map();        // `${sender}|${v}|${akey}` → { tot, ss }
    this.dl = []; this.dlN = 0; this.dlSeen = new Map();
    this.ms = []; this.msN = 0;
    this.fields = {}; this.hfields = {};
    this.sendT = 0; this._warned = false;
    this.onDeath = null; this.onHitReport = null;
    this._pending = [];              // 원격 사격·미사일 연출 대기
  }
  get owner() { return this.role !== "client"; }
  get online() { return this.role !== "offline"; }

  attach(combat) {
    this.c = combat;
    const h = combat.h, prevKill = h.onKill;
    h.onKill = (a, k) => { this._localKill(a, k); if (prevKill) prevKill(a, k); };
    h.onRemoteHit = (a, amt, att) => this._remoteHit(a, amt, att);
    h.onMissile = (a, t) => this._missileOut(a, t);
    this.defineActorKind("bot", {
      meta: (a) => [a.name, a.botKind || "grunt"],
      build: (m, team) => this._botModel(m, team),
    });
  }

  // ── 정의·공유 ──
  defineKind(kind, def) { this.kinds.set(kind, Object.assign({ actorKind: false }, def)); }
  defineActorKind(kind, def) { this.kinds.set(kind, Object.assign({ actorKind: true }, def)); }
  share(kind, id, obj) { if (sid(id) && this.kinds.has(kind)) this.owned.set(id, { kind, obj }); return obj; }
  shareActor(kind, actor, id) { id = sid(id || actor.nid) || `${kind[0]}${this.owned.size}`; actor.nid = id; return this.share(kind, id, actor); }
  unshare(id) { this.owned.delete(id); }
  setField(k, v) { this.fields[k] = v; }
  setHostField(k, v) { this.hfields[k] = v; }
  field(id, k) {
    if (id === this.myId) return this.fields[k];
    const pr = this._peer(id), g = pr && pr.presence && pr.presence.g;
    return g && g.x && typeof g.x === "object" ? g.x[k] : undefined;
  }
  hostField(k) {
    if (this.owner) return this.hfields[k];
    const hp = this._hostPeer(), g = hp && hp.presence && hp.presence.g;
    return g && g.h && typeof g.h === "object" ? g.h[k] : undefined;
  }
  _peers() { return this.room ? this.room.peers() : []; }
  _peer(id) { return this._peers().find((p) => p.peer === id) || null; }
  _hostPeer() {
    let best = null;
    for (const p of this._peers()) { const g = p.presence && p.presence.g; if (g && g.m === this.mid && g.w) best = p; }
    return best;
  }
  // 호스트의 경기 진행 시간(초) — 느린 클라이언트가 시계를 맞출 때
  hostElapsed() {
    if (this.owner) return null;
    const hp = this._hostPeer(), g = hp && hp.presence && hp.presence.g;
    return g && fin(g.el) ? g.el : null;
  }
  players() {
    const me = this.mode.me, out = [{ id: this.myId, name: me.name, team: me.team, actor: me, me: true }];
    for (const [id, a] of this.remotes) out.push({ id, name: a.name, team: a.team, actor: a, me: false });
    return out;
  }
  actorById(id) {
    if (!id) return null;
    if (id === this.myId) return this.mode.me;
    if (this.remotes.has(id)) return this.remotes.get(id);
    const o = this.owned.get(id) || this.proxies.get(id);
    if (!o) return null;
    const k = this.kinds.get(o.kind);
    return k && k.actorKind ? o.obj : k && k.actor ? k.actor(o.obj) : null;
  }
  idOf(a) {
    if (!a) return "";
    if (a === this.mode.me) return this.myId;
    return a.nid || "";
  }
  nameOf(id) { const a = this.actorById(id); return a ? a.name : id && id[0] === "b" ? "봇" : "파일럿"; }

  // 대리 전투 액터 (원격 플레이어·공유 오브젝트). 맞으면 combat → onRemoteHit → 누적 피해로 보고된다
  makeProxy(id, o = {}) {
    const a = this.c._actor(Object.assign({ kind: "remote", remote: true, nid: id, peer: o.owner || "", name: "", team: 0, radius: PLAYER_R, hp: 100, maxHp: 100, alive: false, targetable: true, buf: [], fN: -1 }, o));
    if (a.model) { this.s.world.scene.add(a.model); a.model.visible = false; }
    return a;
  }
  _dropActor(a) {
    const c = this.c, i = c.actors.indexOf(a);
    if (i >= 0) c.actors.splice(i, 1);
    if (a.model) { this.s.world.scene.remove(a.model); if (a.model.userData.dispose) a.model.userData.dispose(); }
    if (c.lock === a) { c.lock = null; c.lockT = 0; }
    if (c.aim === a) c.aim = null;
    for (const m of c.missiles) if (m.target === a) m.target = null;
    if (c.skill && c.skill.marks) c.skill.marks.length = 0;
  }

  _botModel(m, team) {
    const kind = Array.isArray(m) && typeof m[1] === "string" ? m[1] : "grunt";
    const name = Array.isArray(m) && typeof m[0] === "string" ? m[0].slice(0, 24) : "봇";
    const look = this.mode.botLook ? this.mode.botLook(kind, team) : null;
    const model = buildDrone(look || { frame: "raptor", canopy: "racer", props: 3, skin: "solid", ledMode: "blink", frameColor: "#2a1114", accentColor: "#ff2d3d", propColor: "#ff7a7a", ledColor: "#ff2020" }, kind === "gunship" ? 5 : 2.6, { halo: TEAM_COLOR[team & 3] });
    return { model, radius: kind === "gunship" ? 1.7 : 0.9, name };
  }

  // ── 피해 보고 (내가 쏜 것이 대리 액터에 맞음) ──
  _akey(att) { return att === this.mode.me ? this.myId : "B"; }
  _remoteHit(a, amt, att) {
    if (!this.online || !a.nid || !(amt > 0) || a.god) return false;
    const aid = this.idOf(att);
    if (!aid) return false;
    const key = `${a.nid}|${this._akey(att)}`;
    let e = this.hd.get(key);
    if (!e) this.hd.set(key, (e = [a.nid, aid, 0, 0, 0]));
    e[1] = aid; e[2] = rd(e[2] + amt, 10);
    return true;
  }
  _stunOut(a, dur) {
    const key = `${a.nid}|${this.myId}`;
    let e = this.hd.get(key);
    if (!e) this.hd.set(key, (e = [a.nid, this.myId, 0, 0, 0]));
    e[3]++; e[4] = rd(Math.min(6, dur), 10);
  }
  _missileOut(a, t) {
    if (!this.online) return;
    const sh = this.idOf(a);
    if (!sh || (a !== this.mode.me && !this.owned.has(sh))) return;
    this.ms.push([++this.msN, sh, this.idOf(t)]);
    if (this.ms.length > 6) this.ms.shift();
  }

  // ── 격추 ──
  _localKill(a, k) {
    const vid = this.idOf(a);
    if (!vid || a.remote) return;
    const kid = this.idOf(k);
    if (this.online && (a === this.mode.me || this.owned.has(vid))) { this.dl.push([++this.dlN, vid, kid]); if (this.dl.length > 8) this.dl.shift(); }
    if (this.onDeath) this.onDeath({ vid, kid, victim: a, killer: k || null, local: true });
  }
  _remoteDeath(vid, kid) {
    const victim = this.actorById(vid), killer = this.actorById(kid);
    if (kid && kid !== vid && killer && !killer.remote) {
      // 내가(또는 내 봇이) 원격 대상을 격추: 격추 수는 보낸 쪽이 아니라 격추한 쪽이 센다
      killer.kills++;
      if (killer === this.mode.me && victim) {
        const c = this.c;
        c._myKill(victim, 1);
        if (c.skill) { c.skill.onKill(victim); c.skill.gain(9); }
        GP.ev("kill");
      }
    }
    if (this.onDeath) this.onDeath({ vid, kid, victim, killer, local: false });
  }

  // ── 매 프레임 ──
  update(dt) {
    if (!this.online) return;
    const now = performance.now();
    this._in(now);
    for (const a of this.remotes.values()) this._interp(a, now, dt);
    for (const p of this.proxies.values()) { const k = this.kinds.get(p.kind); if (k.actorKind) this._interp(p.obj, now, dt); }
    // 대리 액터에 걸린 마비(EMP)를 보고하고 로컬 값은 지운다 (상태는 맞은 쪽이 알려 준다)
    for (const a of this.c.actors) if (a.remote && a.stunT > 0) { this._stunOut(a, a.stunT); a.stunT = 0; }
    this._fx();
    if ((this.sendT -= dt) <= 0) { this.sendT = SEND_DT; this._out(now); }
  }

  _in(now) {
    const present = new Set();
    for (const pr of this._peers()) {
      if (pr.sameTab || pr.kind === "agent") continue;
      const g = pr.presence && pr.presence.g;
      if (!g || typeof g !== "object" || g.m !== this.mid) continue;
      present.add(pr.peer);
      if (pr.presence === this.lastP.get(pr.peer)) continue;
      this.lastP.set(pr.peer, pr.presence);
      try { this._ingest(pr, g, now); } catch (e) { console.warn("[netgame] 잘못된 상태 무시", e); }
    }
    for (const [id, a] of this.remotes) if (!present.has(id)) { this._dropActor(a); this.remotes.delete(id); this.s.hud.feed(`${a.name} 퇴장`, "#9fb4c8"); }
    for (const [id, p] of this.proxies) if (!present.has(p.owner) || now - p.seen > 4000) this._dropProxy(id, p);
  }
  _dropProxy(id, p) {
    const k = this.kinds.get(p.kind);
    if (k.actorKind) this._dropActor(p.obj); else if (k.remove) k.remove(p.obj);
    this.proxies.delete(id);
  }

  _clock(peer, t, now) {
    if (!fin(t)) return;
    const off = now - t;
    const o = this.offs.get(peer);
    this.offs.set(peer, o === undefined || off < o ? off : o + (off - o) * 0.02);
  }

  _ingest(pr, g, now) {
    const peer = pr.peer;
    this._clock(peer, g.t, now);
    // 원격 플레이어
    let a = this.remotes.get(peer);
    if (!a) {
      const L = parseLook(pr.presence.lk), tm = Math.round(num(g.tm, 0, 0, 3));
      const name = this.client ? this.client.nameOf(pr) : (typeof pr.presence.n === "string" ? pr.presence.n.slice(0, 16) : "파일럿");
      a = this.makeProxy(peer, { owner: peer, name, team: tm, radius: PLAYER_R, model: buildDrone(L.look, L.scale * PLAYER_SCALE, { parts: L.parts, halo: TEAM_COLOR[tm] }), laserColor: L.laser, isPilot: true });
      this.remotes.set(peer, a);
      this.s.hud.feed(`${name} 입장`, "#9fd8ff");
      // 처음 볼 때: 이미 지나간 미사일·스킬·격추 기록은 다시 재생하지 않는다
      const top = (L) => (Array.isArray(L) ? L.reduce((m, e) => Math.max(m, Array.isArray(e) ? num(e[0], 0, 0, 1e9) : 0), 0) : 0);
      a.msN = top(g.ms); a.skN = Array.isArray(g.sk) ? Math.round(num(g.sk[1], 0, 0, 1e6)) : 0;
      if (!this.dlSeen.has(peer)) this.dlSeen.set(peer, top(g.dl));
    }
    this._actorState(a, g, now, g.p, g.q, g.v, g.fl, g.hp, g.mh, g.sh, g.tm, g.k, g.d, g.f);
    if (Array.isArray(g.a)) v3(g.a, a.aim || (a.aim = new THREE.Vector3()), 2);
    // 스킬 발동 연출
    if (Array.isArray(g.sk)) {
      const n = Math.round(num(g.sk[1], 0, 0, 1e6)), def = SKILLS[g.sk[0]];
      if (a.skN !== undefined && n > a.skN && def) this._pending.push({ k: "skill", a, def });
      a.skN = n;
    }
    // 미사일 연출
    if (Array.isArray(g.ms)) {
      const prev = a.msN;
      let top = prev || 0;
      for (const e of g.ms.slice(-6)) {
        if (!Array.isArray(e)) continue;
        const n = Math.round(num(e[0], 0, 0, 1e9));
        if (prev !== undefined && n > prev) this._pending.push({ k: "missile", sh: sid(e[1]), t: sid(e[2]) });
        top = Math.max(top, n);
      }
      a.msN = top;
    }
    // 나 · 내가 가진 오브젝트가 받은 피해
    if (Array.isArray(g.hd)) for (const e of g.hd.slice(0, 64)) this._hitIn(peer, e);
    // 격추 기록
    if (Array.isArray(g.dl)) {
      const last = this.dlSeen.get(peer);
      let top = last || 0;
      const L = g.dl.filter((e) => Array.isArray(e)).map((e) => [Math.round(num(e[0], 0, 0, 1e9)), sid(e[1]), sid(e[2])]).sort((x, y) => x[0] - y[0]);
      for (const [n, vid, kid] of L) { if (last !== undefined && n > last && vid) this._remoteDeath(vid, kid); top = Math.max(top, n); }
      this.dlSeen.set(peer, top);
    }
    // 호스트 소유 오브젝트
    if (g.w && typeof g.w === "object" && !this.owner) {
      for (const kind of Object.keys(g.w)) {
        const def = this.kinds.get(kind), list = g.w[kind];
        if (!def || !Array.isArray(list)) continue;
        for (const e of list.slice(0, 64)) {
          if (!Array.isArray(e)) continue;
          const id = sid(e[0]);
          if (!id || id === this.myId || this.remotes.has(id)) continue;
          let p = this.proxies.get(id);
          if (!p) {
            let obj;
            if (def.actorKind) {
              const tm = Math.round(num(e[13], 0, 0, 3)), b = def.build(e[18], tm, id) || {};
              obj = this.makeProxy(id, { owner: peer, name: b.name || id, team: tm, radius: b.radius || PLAYER_R, model: b.model || null, laserColor: b.laser || 0xff6a4d, isBot: kind === "bot" });
            } else obj = def.create ? def.create(id, e.slice(1), peer) : null;
            if (!obj) continue;
            this.proxies.set(id, (p = { kind, obj, owner: peer, seen: now }));
          }
          p.seen = now;
          if (def.actorKind) this._actorState(p.obj, g, now, e.slice(1, 4), e.slice(4, 8), e.slice(8, 11), e[14], e[11], e[12], 0, e[13], e[15], e[16], e[17]);
          else if (def.apply) def.apply(p.obj, e.slice(1));
        }
      }
    }
  }

  // 액터 상태 반영 + 보간 버퍼
  _actorState(a, g, now, p, q, v, fl, hp, mh, sh, tm, k, d, f) {
    const t = num(g.t, 0);
    const flags = Math.round(num(fl, 0, 0, 255)), alive = !!(flags & 1);
    const snap = { t, p: v3(p, new THREE.Vector3()), q: new THREE.Quaternion(), v: v3(v, new THREE.Vector3(), 200) };
    if (Array.isArray(q) && q.length >= 4) { snap.q.set(num(q[0]), num(q[1]), num(q[2]), num(q[3], 1)); if (snap.q.lengthSq() < 1e-6) snap.q.set(0, 0, 0, 1); snap.q.normalize(); }
    if (alive && !a.alive) {   // 재출격(또는 처음 봄): 이전 위치에서 끌려오지 않게 버퍼를 비운다
      a.buf.length = 0; a.alive = true; a.pos.copy(snap.p); a.quat.copy(snap.q);
      if (a.model) { a.model.visible = true; a.model.position.copy(a.pos); }
    } else if (!alive && a.alive) {
      a.alive = false;
      if (a.model) a.model.visible = false;
      if (a.seenOnce) { this.c.fx.destroy(a.pos, 1); this.c.snd.play("explode", this.c.volAt(a.pos), this.c.panAt(a.pos)); this.c._blast(a.pos, 1); }
    }
    a.seenOnce = true;
    const b = a.buf;
    if (!b.length || t > b[b.length - 1].t) { b.push(snap); if (b.length > 24) b.shift(); }
    a.maxHp = num(mh, a.maxHp || 100, 1, 1e5); a.hp = num(hp, a.hp, 0, a.maxHp); a.shield = num(sh, 0, 0, 1e4);
    a.god = !!(flags & 2); a.stunned = !!(flags & 4); a.overT = flags & 8 ? 1 : 0;
    a.team = Math.round(num(tm, a.team, 0, 3));
    a.kills = Math.round(num(k, 0, 0, 1e5)); a.deaths = Math.round(num(d, 0, 0, 1e5)); a.score = a.kills * 100;
    const fN = Math.round(num(f, 0, 0, 1e9));
    if (a.fN >= 0 && fN > a.fN && a.alive) this._pending.push({ k: "shot", a, n: Math.min(3, fN - a.fN) });
    a.fN = fN;
  }

  _interp(a, now, dt) {
    const b = a.buf;
    if (!a.alive || !b.length) return;
    const off = this.offs.get(a.peer) ?? 0, rt = now - off - DELAY;
    let i = b.length - 1;
    while (i > 0 && b[i].t > rt) i--;
    const s0 = b[i], s1 = b[i + 1];
    if (s1 && rt >= s0.t) {
      const k = Math.min(1, (rt - s0.t) / Math.max(1, s1.t - s0.t));
      a.pos.lerpVectors(s0.p, s1.p, k); a.quat.slerpQuaternions(s0.q, s1.q, k); a.vel.lerpVectors(s0.v, s1.v, k);
    } else if (rt >= s0.t) {
      const e = Math.min(EXTRAP, rt - s0.t) / 1000;
      a.pos.copy(s0.p).addScaledVector(s0.v, e); a.quat.copy(s0.q); a.vel.copy(s0.v);
    } else { a.pos.copy(s0.p); a.quat.copy(s0.q); a.vel.copy(s0.v); }
    if (a.model) {
      a.model.position.copy(a.pos); a.model.quaternion.copy(a.quat);
      if (a.model.userData.tick) a.model.userData.tick(dt, 0.4 + a.vel.length() / 50, this.s.time);
      if (a.stunned && Math.random() < dt * 8) this.c.fx.spark(a.pos, 0xb8c8ff, 3);
    }
  }

  // 받은 누적 피해 → 나 또는 내가 가진 오브젝트에 늘어난 만큼 적용
  _hitIn(sender, e) {
    if (!Array.isArray(e)) return;
    const vid = sid(e[0]), aid = sid(e[1]);
    if (!vid) return;
    let victim = null, raw = null;
    if (vid === this.myId) victim = this.mode.me;
    else if (this.owner && this.owned.has(vid)) { raw = this.owned.get(vid); victim = this.actorById(vid); }
    else return;
    const akey = aid === sender ? sender : "B";
    const key = `${sender}|${vid}|${akey}`, prev = this.seenHit.get(key) || { tot: 0, ss: 0 };
    const tot = num(e[2], 0, 0, 1e7), ss = Math.round(num(e[3], 0, 0, 1e6));
    const delta = Math.min(MAX_HIT, tot - prev.tot);
    this.seenHit.set(key, { tot: Math.max(prev.tot, tot), ss: Math.max(prev.ss, ss) });
    const att = this.actorById(aid) || this.remotes.get(sender) || null;
    if (delta > 0.05) {
      if (victim) { const c = this.c; c._net = true; try { c.damage(victim, delta, att, att ? att.pos : null); } finally { c._net = false; } }
      else if (raw && this.onHitReport) this.onHitReport(vid, delta, aid, att);
    }
    if (ss > prev.ss && victim && victim.alive) {
      victim.stunT = Math.max(victim.stunT || 0, num(e[4], 3.5, 0, 6));
      if (victim === this.mode.me) { this.s.hud.toast("EMP 피격 — 조종 불능!", "#b8c8ff", 1.5, 24); this.c.feel.emit("stun"); }
    }
  }

  // 원격 사격·미사일·스킬 연출 (피해 없는 '유령' 탄)
  _fx() {
    const c = this.c;
    for (const ev of this._pending.splice(0)) {
      if (ev.k === "shot") {
        const a = ev.a;
        if (!a.alive) continue;
        if (a.aim && a.isPilot) FWD.copy(a.aim); else FWD.set(0, 0, -1).applyQuaternion(a.quat);
        if (FWD.lengthSq() < 0.5) continue;
        FWD.normalize();
        for (let i = 0; i < ev.n; i++) {
          _v.copy(a.pos).addScaledVector(FWD, a.radius + 0.4 + i * 1.5);
          c.fireLaser(a, _v, FWD, 0, a.overT > 0 ? 0xff4ad6 : a.laserColor || 0xff6a4d, a.isPilot ? 170 : 92);
          c.shots[c.shots.length - 1].ghost = true;
        }
        if (a.pos.distanceToSquared(this.s.camera.position) < 40000) c.snd.play("elaser", c.volAt(a.pos) * 0.7, c.panAt(a.pos));
      } else if (ev.k === "missile") {
        const sh = this.actorById(ev.sh), t = this.actorById(ev.t);
        if (!sh || !sh.remote || !sh.alive) continue;
        _w.set(0, 0, -1).applyQuaternion(sh.quat);
        if (t) _w.copy(t.pos).sub(sh.pos).normalize();
        c.fireMissile(sh, _v.copy(sh.pos).addScaledVector(_w, sh.radius + 1), _w, t, 0, true);
        c.missiles[c.missiles.length - 1].ghost = true;
      } else if (ev.k === "skill") {
        const a = ev.a, col = ev.def.color;
        if (!a.alive) continue;
        c.fx.ring(a.pos, col, 14, 0.5); c.fx.ring(a.pos, 0xffffff, 8, 0.35); c.fx.burst(a.pos, col, 40, 16, 0.8, 0.35, -4); c.fx.flash(a.pos, col, 10, 0.35);
        this.s.hud.feed(`${a.name} ▸ ${ev.def.icon} ${ev.def.name}`, "#" + col.toString(16).padStart(6, "0"));
      }
    }
  }

  // ── 보내기 ──
  _out(now) {
    const c = this.c, me = this.mode.me, pl = this.s.player, b = pl.body;
    const r3 = (v, k = 100) => [rd(v.x, k), rd(v.y, k), rd(v.z, k)];
    const fl = (me.alive ? 1 : 0) | (this.s.time < (me.spawnGodT || 0) || me.dodgeT > 0 ? 2 : 0) | (me.stunT > 0 ? 4 : 0) | (me.overT > 0 ? 8 : 0);
    const g = {
      m: this.mid, t: Math.round(now), p: r3(b.pos), q: [rd(b.quat.x, 1000), rd(b.quat.y, 1000), rd(b.quat.z, 1000), rd(b.quat.w, 1000)], v: r3(b.vel, 10), a: r3(pl.aimDir),
      hp: Math.round(me.hp), mh: Math.round(me.maxHp), sh: Math.round(me.shield || 0), fl, tm: me.team, k: me.kills, d: me.deaths, f: me.shotN || 0,
      el: Math.round(this.mode.time || 0),
    };
    if (c.skill) g.sk = [c.skill.id, c.skill.actN || 0];
    if (this.ms.length) g.ms = this.ms;
    if (this.dl.length) g.dl = this.dl;
    // 피해 보고: 아직 있는 대상만
    const hd = [];
    for (const [key, e] of this.hd) { if (this.actorById(e[0])) hd.push(e); else if (!this._peer(e[0])) this.hd.delete(key); }
    if (hd.length) g.hd = hd;
    if (Object.keys(this.fields).length) g.x = this.fields;
    if (this.owner) {
      if (Object.keys(this.hfields).length) g.h = this.hfields;
      const w = {};
      for (const [id, o] of this.owned) {
        const def = this.kinds.get(o.kind);
        let e;
        if (def.actorKind) {
          const a = o.obj;
          e = [id, ...r3(a.pos), rd(a.quat.x, 1000), rd(a.quat.y, 1000), rd(a.quat.z, 1000), rd(a.quat.w, 1000), ...r3(a.vel, 10), Math.round(a.hp), Math.round(a.maxHp),
            (a.alive ? 1 : 0) | (a.stunT > 0 ? 4 : 0) | (a.overT > 0 ? 8 : 0), a.team, a.kills, a.deaths, a.shotN || 0, def.meta ? def.meta(a) : 0];
        } else e = [id, ...[].concat(def.ser(o.obj))];
        (w[o.kind] || (w[o.kind] = [])).push(e);
      }
      g.w = w;
    }
    const json = JSON.stringify(g);
    if (json.length > PRES_WARN && !this._warned) { this._warned = true; console.warn(`[netgame] 프레즌스가 큽니다 (${json.length}B) — 월드 오브젝트를 줄이세요`); }
    this.room.presence({ g }).catch((e) => { if (!this._warned) { this._warned = true; console.warn("[netgame] presence 거부", e && e.message); } });
  }

  dispose() {
    if (this.room) this.room.presence({ g: null }).catch(() => {});
    for (const [id, p] of this.proxies) { const k = this.kinds.get(p.kind); if (!k.actorKind && k.remove) k.remove(p.obj); void id; }
  }
}
