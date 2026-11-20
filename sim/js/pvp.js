// PvP 대기실: 로비(접속자·방 목록·랜덤 매칭)와 커스텀 방(방장 권한·팀·컴퓨터 플레이어·시작)
// 서버가 없다: 모두 프레즌스로 주고받는다 (js/net/README.md 참고)
//  로비 프레즌스  { n: 이름, v: 1, q?: {m: 모드, s: 대기 시작}, mt?: {c, p: [peer…], m: 맵, o: 모드, at}, ls?: {c, n, m, o, p, x, s} }
//  방 프레즌스    { n, j: 입장 시각, rd: 준비, lk: 외형, room?: 방 설정(방장만), g?: 경기 상태(netgame.js) }
//  방 설정        { c: 코드, n: 방 이름, m: 맵, o: 모드, t: 시간(초), tn: 팀 수, bf: 봇 채우기, cb: [[id, 팀, 난이도]] 컴퓨터,
//                  st: 경기 번호, go: 진행 중, sd: 시드, as: [[peer, 팀]], kk: [쫓겨난 peer], ep: 방장 세대, au: 랜덤 매칭 방, ap: 매칭된 peer }
// 방장 = 입장 시각(j)이 가장 이른 사람(같으면 peer 라벨 순). 방장이 나가면 다음 사람이 마지막 설정을 이어받는다
//
// 새 모드 붙이기 (예: 점령전 AOS):
//   import { registerPvpMode } from "./pvp.js";  import { registerMode } from "./session.js";
//   registerMode("aos", AosMode);
//   registerPvpMode("aos", { name: "점령전 AOS", en: "AOS", icon: "🏯", desc: "…", session: "aos", teams: true, teamCounts: [2], maps: ["stadium"], time: [600, 900], random: true });
//   게임 cfg: { mode: def.session, map, time, difficulty, pvp: { variant, teams, team, name, bots: [[id, 팀, 난이도]], fill, seed, elapsed }, net: {...} | null }
//   net 이 null 이면 오프라인(봇과 혼자). 경기 동기화는 netgame.js 의 NetGame 을 쓴다
import { connect, getNick, setNick, cleanName } from "./net.js";
import { lookSpec, sid, num } from "./netgame.js";
import { MAP_LIST, MAPS } from "./maps/index.js";

export const MAX_PLAYERS = 8, FILL_TO = 6;
export const PVP_MODES = {
  ffa: { name: "개인전", en: "FREE FOR ALL", icon: "💥", desc: "모두가 적. 제한 시간 동안 가장 많이 격추한 사람이 1위", session: "pvp", teams: false, random: true },
  tdm: { name: "팀전", en: "TEAM DEATHMATCH", icon: "⚔️", desc: "팀을 나눠 격추 수 합계로 겨룹니다", session: "pvp", teams: true, teamCounts: [2, 3, 4], random: true },
};
export function registerPvpMode(id, def) { if (/^[a-z][a-z0-9]{0,15}$/.test(id)) PVP_MODES[id] = Object.assign({ session: id, teams: true, teamCounts: [2] }, def); }
export const BOT_DIFF = { easy: "쉬움", normal: "보통", hard: "어려움" };
export const TIMES = [[120, "2분"], [180, "3분"], [300, "5분"], [600, "10분"]];
export const TEAM_LABEL = ["청팀", "홍팀", "자팀", "주팀"];
const CODE_CH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MATCH_WAIT = 6000, ALONE_OFFER = 15000;
const rcode = (n = 4) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CODE_CH[b % CODE_CH.length]).join("");
const rint = () => crypto.getRandomValues(new Uint32Array(1))[0] >>> 1;
const mapsFor = (o) => { const d = PVP_MODES[o]; const L = MAP_LIST.map((m) => m.id); return d && Array.isArray(d.maps) ? d.maps.filter((id) => MAPS[id]) : L; };
const timesFor = (o) => { const d = PVP_MODES[o]; return d && Array.isArray(d.time) ? d.time : TIMES.map((t) => t[0]); };
// 목표 점수가 있는 모드(기지전 등: def.goal = [40, 60, 80], def.goalDef)
export const goalsFor = (o) => { const d = PVP_MODES[o]; return d && Array.isArray(d.goal) ? d.goal : null; };
const goalFix = (o, v) => { const L = goalsFor(o); return !L ? 0 : L.includes(v) ? v : PVP_MODES[o].goalDef || L[Math.floor(L.length / 2)]; };

// 받은 방 설정 검사 (다른 사람이 보낸 값은 모두 믿지 않는다)
function validCfg(o) {
  if (!o || typeof o !== "object") return null;
  const c = typeof o.c === "string" && /^[A-Z0-9]{4,6}$/.test(o.c) ? o.c : null;
  if (!c || !PVP_MODES[o.o] || !MAPS[o.m]) return null;
  const tn = Math.round(num(o.tn, 2, 2, 4));
  const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  return {
    c, n: cleanName(o.n) || `방 ${c}`, m: o.m, o: o.o, t: Math.round(num(o.t, 180, 60, 1800)), tn, bf: o.bf ? 1 : 0, gs: Math.round(num(o.gs, 0, 0, 300)),
    cb: arr(o.cb, MAX_PLAYERS).filter((e) => Array.isArray(e) && sid(e[0])).map((e) => [sid(e[0]), Math.round(num(e[1], 0, 0, 3)), BOT_DIFF[e[2]] ? e[2] : "normal"]),
    st: Math.round(num(o.st, 0, 0, 1e6)), go: o.go ? 1 : 0, sd: Math.round(num(o.sd, 1, 0, 2 ** 31)),
    as: arr(o.as, 32).filter((e) => Array.isArray(e) && sid(e[0])).map((e) => [sid(e[0]), Math.round(num(e[1], 0, 0, 3))]),
    kk: arr(o.kk, 24).map(sid).filter(Boolean), ep: Math.round(num(o.ep, 0, 0, 1e6)), au: o.au ? 1 : 0, ap: arr(o.ap, MAX_PLAYERS).map(sid).filter(Boolean),
  };
}
function validListing(o) {
  if (!o || typeof o !== "object" || typeof o.c !== "string" || !/^[A-Z0-9]{4,6}$/.test(o.c) || !PVP_MODES[o.o]) return null;
  return { c: o.c, n: cleanName(o.n) || `방 ${o.c}`, m: MAPS[o.m] ? o.m : null, o: o.o, p: Math.round(num(o.p, 1, 0, 99)), x: Math.round(num(o.x, MAX_PLAYERS, 1, 99)), s: o.s ? 1 : 0 };
}

export class PvpClient {
  constructor(game) {
    this.game = game;
    this.status = "off";            // off | connecting | ready | none
    this.tr = null; this.room = null; this.offline = false;
    this.code = ""; this.cfg = null; this.isHost = false; this.hostPeer = null;
    this.msg = ""; this.queue = null; this.profiles = {}; this.subs = new Set();
    this.myName = ""; this.playedSt = -1;
  }
  get me() { return this.offline ? "me" : this.tr ? this.tr.me() : null; }
  get kind() { return this.tr ? this.tr.kind : null; }
  get name() { return getNick() || this.myName || (this.tr && this.tr.me() ? `파일럿-${this.tr.me().slice(0, 4).toUpperCase()}` : "파일럿"); }
  setName(v) { setNick(v); this._presName(); this._notify(); }
  on(f) { this.subs.add(f); return () => this.subs.delete(f); }
  _notify() {
    if (this._nq) return;
    this._nq = true;
    setTimeout(() => { this._nq = false; for (const f of [...this.subs]) try { f(); } catch (e) { console.error(e); } }, 30);
  }

  init() {
    if (this._init) return this._init;
    this.status = "connecting"; this._notify();
    return (this._init = connect().then((tr) => {
      this.tr = tr;
      if (!tr) { this.status = "none"; this._notify(); return null; }
      this.status = "ready";
      if (tr.user && tr.user.me) tr.user.me().then((v) => { if (v && v.name) { this.myName = cleanName(v.name); this._presName(); this._notify(); } }).catch(() => {});
      tr.lobby.presence({ n: this.name, v: 1 }).catch(() => {});
      tr.lobby.onPeers(() => { this._lobbyTick(); this._notify(); });
      this._timer = setInterval(() => { this._lobbyTick(); this._roomTick(); }, 400);
      this._notify();
      return tr;
    }).catch((e) => { console.warn("[pvp] 연결 실패", e); this.status = "none"; this._notify(); return null; }));
  }
  _presName() {
    if (!this.tr) return;
    this.tr.lobby.presence({ n: this.name }).catch(() => {});
    if (this.room) this.room.presence({ n: this.name }).catch(() => {});
  }

  // ── 이름 (user 기능이 있으면 그 이름, 없으면 각자 적은 별명) ──
  nameOf(p) {
    if (!p) return "파일럿";
    if (p.sameTab || p.peer === this.me) return this.name;
    const pr = p.by && this.profiles[p.by];
    if (pr && pr.name) return cleanName(pr.name) || "파일럿";
    const n = p.presence && cleanName(p.presence.n);
    return n || "파일럿";
  }
  _profiles(peers) {
    const u = this.tr && this.tr.user;
    if (!u || !u.profiles) return;
    const ids = [...new Set(peers.map((p) => p.by).filter((b) => b && !(b in this.profiles)))];
    if (!ids.length || this._profBusy) return;
    this._profBusy = true;
    for (const id of ids) this.profiles[id] = this.profiles[id] || { name: "" };
    u.profiles(ids).then((r) => { Object.assign(this.profiles, r || {}); this._notify(); }).catch(() => {}).finally(() => { this._profBusy = false; });
  }

  lobbyPeers() { return this.tr ? this.tr.lobby.peers().filter((p) => p.kind !== "agent") : []; }
  online() { return this.lobbyPeers().length; }
  listings() {
    const out = [];
    for (const p of this.lobbyPeers()) { const l = validListing(p.presence && p.presence.ls); if (l && !out.find((x) => x.c === l.c)) out.push(Object.assign(l, { host: this.nameOf(p) })); }
    return out.sort((a, b) => a.s - b.s || b.p - a.p);
  }

  // ── 랜덤 매칭 (배틀넷) ──
  startQueue(mode) {
    if (!this.tr || !PVP_MODES[mode]) return;
    this.queue = { mode, since: Date.now(), t0: performance.now(), mm: 0 };
    this.tr.lobby.presence({ q: { m: mode, s: this.queue.since }, mt: null }).catch(() => {});
    this._notify();
  }
  cancelQueue() {
    this.queue = null;
    if (this.tr) this.tr.lobby.presence({ q: null, mt: null }).catch(() => {});
    this._notify();
  }
  queued() {
    if (!this.queue) return [];
    return this.lobbyPeers().filter((p) => p.presence && p.presence.q && p.presence.q.m === this.queue.mode).sort((a, b) => (a.peer < b.peer ? -1 : 1));
  }
  aloneLong() { return !!this.queue && this.queued().length < 2 && performance.now() - this.queue.t0 > ALONE_OFFER; }
  _lobbyTick() {
    if (!this.tr) return;
    const ps = this.lobbyPeers(), me = this.me;
    this._profiles(ps);
    // 나를 넣은 매칭 제안을 받으면 그 방으로
    if (this.queue) {
      for (const p of ps) {
        const mt = p.presence && p.presence.mt;
        if (!mt || typeof mt.c !== "string" || !/^[A-Z0-9]{4,6}$/.test(mt.c) || !Array.isArray(mt.p) || !mt.p.includes(me) || mt.c === this._lastMt) continue;
        if (!MAPS[mt.m] || !PVP_MODES[mt.o]) continue;
        this._lastMt = mt.c;
        const q = this.queue;
        this.queue = null;
        this.tr.lobby.presence({ q: null }).catch(() => {});
        this.joinRoom(mt.c, { auto: { m: mt.m, o: mt.o, ap: mt.p.map(sid).filter(Boolean).slice(0, MAX_PLAYERS) } }).then((ok) => { if (!ok) this.startQueue(q.mode); });
        return;
      }
      // 중매인: 대기 중인 사람 가운데 peer 라벨이 가장 작은 사람이 묶는다
      const qs = this.queued();
      if (qs.length && qs[0].peer === me) {
        if (qs.length >= 2) { if (!this.queue.mm) this.queue.mm = performance.now(); } else this.queue.mm = 0;
        if (qs.length >= MAX_PLAYERS || (qs.length >= 2 && performance.now() - this.queue.mm >= MATCH_WAIT)) {
          const peers = qs.slice(0, MAX_PLAYERS).map((p) => p.peer), mode = this.queue.mode, maps = mapsFor(mode);
          const mt = { c: rcode(5), p: peers, m: maps[rint() % maps.length], o: mode, at: Date.now() };
          this.tr.lobby.presence({ mt }).catch(() => {});
          this._notify();
        }
      }
    }
  }
  // 혼자일 때: 봇과 바로 붙는 매칭 방
  soloBots() {
    const mode = this.queue ? this.queue.mode : "ffa", maps = mapsFor(mode);
    this.cancelQueue();
    return this.joinRoom(rcode(5), { auto: { m: maps[rint() % maps.length], o: mode, ap: [this.me], solo: true } });
  }

  // ── 커스텀 방 ──
  createRoom(name) {
    if (!this.tr) return this.createOffline(name);
    return this.joinRoom(rcode(4), { create: { n: cleanName(name) || `${this.name}의 방` } });
  }
  // 네트워크 없이 혼자 (컴퓨터 플레이어와): 같은 대기실 화면을 쓴다
  createOffline(name) {
    this.leaveRoom();
    this.offline = true; this.code = "SOLO"; this.isHost = true; this.playedSt = -1;
    this.cfg = this._defaultCfg({ create: { n: cleanName(name) || "연습 방" } });
    this.cfg.cb = [["c1", 1, "normal"], ["c2", 1, "normal"]];
    this._notify();
    return Promise.resolve(true);
  }
  async joinRoom(code, opt = {}) {
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length < 4) { this.msg = "방 코드는 4자리입니다"; this._notify(); return false; }
    if (!this.tr) { this.msg = "온라인에 연결되어 있지 않습니다"; this._notify(); return false; }
    this.leaveRoom();
    this.msg = "";
    let r;
    try { r = await this.tr.join("pvp-" + code.toLowerCase()); } catch (e) { this.msg = `방에 들어가지 못했습니다 (${(e && e.code) || "오류"})`; this._notify(); return false; }
    this.room = r; this.code = code; this.cfg = null; this.isHost = false; this.hostPeer = null; this.opt = opt;
    this.myJ = Date.now(); this.joinedAt = performance.now(); this.playedSt = -1; this.ready = false;
    r.presence({ n: this.name, j: this.myJ, rd: 0, lk: lookSpec() }).catch(() => {});
    this._unsub = r.onPeers(() => { this._roomTick(); this._notify(); });
    this._notify();
    return true;
  }
  leaveRoom(msg = "") {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    if (this.room) { const r = this.room; this.room = null; r.leave().catch(() => {}); }
    if (this.tr && this._listed) { this._listed = null; this.tr.lobby.presence({ ls: null }).catch(() => {}); }
    this.offline = false; this.cfg = null; this.isHost = false; this.code = ""; this.hostPeer = null;
    if (msg) this.msg = msg;
    this._notify();
  }
  inRoom() { return !!(this.room || this.offline); }

  roomPeers() {
    if (this.offline) return [{ peer: "me", sameTab: true, presence: { n: this.name, j: 0, rd: 1 } }];
    if (!this.room) return [];
    return this.room.peers().filter((p) => p.kind !== "agent" && p.presence && typeof p.presence.j === "number")
      .slice().sort((a, b) => a.presence.j - b.presence.j || (a.peer < b.peer ? -1 : 1));
  }
  // 대기실 화면용: 사람 + 컴퓨터, 팀별
  slots() {
    const c = this.cfg, ps = this.roomPeers().slice(0, MAX_PLAYERS);
    const team = (peer, i) => { const e = c && c.as.find((x) => x[0] === peer); return e ? e[1] : i % Math.max(2, (c && c.tn) || 2); };
    const out = ps.map((p, i) => ({ id: p.peer, name: this.nameOf(p), host: i === 0, me: p.sameTab || p.peer === this.me, ready: !!(p.presence.rd) || i === 0, team: team(p.peer, i), bot: false }));
    if (c) for (const [id, tm, df] of c.cb) out.push({ id, name: `컴퓨터 (${BOT_DIFF[df]})`, bot: true, diff: df, team: tm, ready: true });
    return out;
  }
  _smallTeam(c, extra = []) {
    const n = new Array(c.tn).fill(0);
    for (const [, t] of c.as) if (t < c.tn) n[t]++;
    for (const [, t] of c.cb) if (t < c.tn) n[t]++;
    for (const t of extra) n[t]++;
    return n.indexOf(Math.min(...n));
  }
  _defaultCfg(opt) {
    const a = opt.auto, cr = opt.create || {};
    const o = a ? a.o : this._lastMode || "ffa", maps = mapsFor(o);
    return { c: this.code, n: a ? "랜덤 매칭" : cr.n || `${this.name}의 방`, m: a ? a.m : maps.includes(this._lastMap) ? this._lastMap : maps[0], o, t: a ? 180 : timesFor(o)[1] || timesFor(o)[0], tn: 2, gs: goalFix(o, 0),
      bf: a ? 1 : 0, cb: [], st: 0, go: 0, sd: 1, as: [], kk: [], ep: 0, au: a ? 1 : 0, ap: a ? a.ap : [] };
  }

  _roomTick() {
    if (this.offline || !this.room) return;
    const now = performance.now(), me = this.me, ps = this.roomPeers();
    const host = ps[0], was = this.isHost;
    this.isHost = !!host && host.peer === me;
    const pending = !this.opt.create && !this.opt.auto && !this.cfg;
    if (!this.isHost && host) {
      const rc = validCfg(host.presence.room);
      if (rc && rc.c === this.code) { this.cfg = rc; this.hostPeer = host.peer; }
    }
    // 정원 · 쫓겨남
    const idx = ps.findIndex((p) => p.peer === me);
    if (this.cfg && this.cfg.kk.includes(me)) return this.leaveRoom("방장이 회원님을 방에서 내보냈습니다");
    if (idx >= MAX_PLAYERS) return this.leaveRoom("방이 가득 찼습니다 (최대 8명)");
    if (this.isHost) {
      if (pending) {
        if (now - this.joinedAt > 3500) return this.leaveRoom(`방 ${this.code} 을(를) 찾을 수 없습니다`);
        return;
      }
      if (!this.cfg) this.cfg = this._defaultCfg(this.opt);
      const c = this.cfg;
      c.c = this.code;
      if (!was) { c.ep++; this.hostPeer = me; }
      const present = ps.slice(0, MAX_PLAYERS).map((p) => p.peer);
      c.as = c.as.filter((x) => present.includes(x[0]));
      for (const p of present) if (!c.as.find((x) => x[0] === p)) c.as.push([p, this._smallTeam(c)]);
      for (const e of c.as) if (e[1] >= c.tn) e[1] = this._smallTeam(c);
      for (const e of c.cb) if (e[1] >= c.tn) e[1] = e[1] % c.tn;
      // 랜덤 매칭 방: 다 모이면(또는 잠시 뒤 둘 이상이면) 자동 시작, 끝내 혼자면 봇과
      if (c.au && !c.go && !c.st) {
        this._autoT = this._autoT || now;
        const all = c.ap.every((p) => present.includes(p)), w = now - this._autoT;
        if (this.opt.auto && this.opt.auto.solo) { c.bf = 1; this._start(); }
        else if ((all && present.length >= 2 && w > 800) || (present.length >= 2 && w > 6000)) this._start();
        else if (w > 10000) { c.bf = 1; this._start(); }
      }
      this._publish();
    } else if (pending && now - this.joinedAt > 6000) return this.leaveRoom(`방 ${this.code} 에서 응답이 없습니다`);
    // 경기 시작 (중간 입장 포함)
    const c = this.cfg;
    if (c && c.go && c.st !== this.playedSt && this.game.state !== "play" && this.game.state !== "pause") this._launch(c);
  }
  _publish() {
    const c = this.cfg, j = JSON.stringify(c);
    if (j !== this._pubJ) { this._pubJ = j; this.room.presence({ room: c }).catch((e) => console.warn("[pvp] 방 설정 전송 실패", e)); }
    if (!c.au) {
      const ls = { c: c.c, n: c.n, m: c.m, o: c.o, p: this.roomPeers().length, x: MAX_PLAYERS, s: c.go };
      const lj = JSON.stringify(ls);
      if (lj !== this._listed) { this._listed = lj; this.tr.lobby.presence({ ls }).catch(() => {}); }
    }
    this._notify();
  }

  // ── 방장 조작 ──
  _host(fn) { if (!this.isHost || !this.cfg) return; fn(this.cfg); if (this.offline) this._notify(); else this._publish(); }
  setCfg(k, v) {
    this._host((c) => {
      if (k === "m" && mapsFor(c.o).includes(v)) { c.m = v; this._lastMap = v; }
      else if (k === "o" && PVP_MODES[v]) { c.o = v; this._lastMode = v; const ms = mapsFor(v); if (!ms.includes(c.m)) c.m = ms[0]; const ts = timesFor(v); if (!ts.includes(c.t)) c.t = ts[0]; const tc = PVP_MODES[v].teamCounts || [2]; if (!tc.includes(c.tn)) c.tn = tc[0]; c.gs = goalFix(v, c.gs); }
      else if (k === "t" && timesFor(c.o).includes(+v)) c.t = +v;
      else if (k === "gs" && (goalsFor(c.o) || []).includes(+v)) c.gs = +v;
      else if (k === "tn" && (PVP_MODES[c.o].teamCounts || [2]).includes(+v)) c.tn = +v;
      else if (k === "bf") c.bf = +v ? 1 : 0;
    });
  }
  setTeam(id, team) {
    this._host((c) => {
      const t = ((+team % c.tn) + c.tn) % c.tn, e = c.as.find((x) => x[0] === id) || c.cb.find((x) => x[0] === id);
      if (e) e[1] = t; else if (id === this.me || this.roomPeers().find((p) => p.peer === id)) c.as.push([id, t]);
    });
  }
  cycleTeam(id) { const s = this.slots().find((x) => x.id === id); if (s && this.cfg) this.setTeam(id, s.team + 1); }
  kick(id) {
    this._host((c) => {
      if (id === this.me) return;
      if (c.cb.find((x) => x[0] === id)) { c.cb = c.cb.filter((x) => x[0] !== id); return; }
      if (!c.kk.includes(id)) c.kk.push(id);
      if (c.kk.length > 24) c.kk.shift();
      c.as = c.as.filter((x) => x[0] !== id);
    });
  }
  addBot(team) {
    this._host((c) => {
      if (this.slots().length >= MAX_PLAYERS) return;
      let n = 1; while (c.cb.find((x) => x[0] === "c" + n)) n++;
      c.cb.push(["c" + n, team === undefined ? this._smallTeam(c) : team % c.tn, "normal"]);
    });
  }
  cycleBotDiff(id) { this._host((c) => { const e = c.cb.find((x) => x[0] === id); if (e) { const L = Object.keys(BOT_DIFF); e[2] = L[(L.indexOf(e[2]) + 1) % L.length]; } }); }
  toggleReady() { if (!this.room) return; this.ready = !this.ready; this.room.presence({ rd: this.ready ? 1 : 0 }).catch(() => {}); this._notify(); }
  canStart() { return this.isHost && this.cfg && !this.cfg.go && (this.slots().length >= 2 || this.cfg.bf); }
  start() {
    if (!this.isHost || !this.cfg) return false;
    if (!this.canStart()) { this.msg = "혼자서는 시작할 수 없습니다 — 컴퓨터를 넣거나 봇 채우기를 켜세요"; this._notify(); return false; }
    this._start();
    return true;
  }
  _start() {
    const c = this.cfg;
    c.st++; c.go = 1; c.sd = rint();
    if (this.offline) { this._notify(); this._launch(c); return; }
    this._publish();
    this._launch(c);
  }
  // 경기가 끝났거나(방장) 방장이 경기에서 나옴: 대기실로 되돌린다
  matchOver(mid) {
    const c = this.cfg;
    if (!c || !this.isHost || `${c.c}:${c.st}` !== mid) return;
    if (c.go) { c.go = 0; if (this.offline) this._notify(); else this._publish(); }
  }

  _launch(c) {
    this.playedSt = c.st;
    const def = PVP_MODES[c.o], me = this.me, ps = this.roomPeers();
    const mine = c.as.find((x) => x[0] === me), idx = Math.max(0, ps.findIndex((p) => p.peer === me));
    const team = def.teams ? (mine ? mine[1] : idx % c.tn) : 0;
    const mid = `${c.c}:${c.st}`;
    // 중간 입장: 방장 경기 시계를 따른다
    let elapsed = 0;
    if (!this.isHost && !this.offline) {
      const hp = ps.find((p) => p.peer === this.hostPeer), g = hp && hp.presence.g;
      if (g && g.m === mid) elapsed = num(g.el, 0, 0, c.t);
    }
    const cfg = {
      mode: def.session, map: c.m, time: c.t, difficulty: "normal",
      pvp: { variant: c.o, teams: def.teams ? c.tn : 0, team, name: this.name, bots: c.cb.map((e) => e.slice()), fill: c.bf ? FILL_TO : 0, goal: goalFix(c.o, c.gs) || undefined, seed: c.sd, elapsed, code: c.c, auto: !!c.au, players: Math.min(MAX_PLAYERS, ps.length || 1), client: this, mid },
      net: this.offline ? null : { room: this.room, me, mid, host: this.isHost, client: this },
    };
    this.game.startSession(cfg);
  }
}
