// 온라인 대전 연결 계층: 두 가지 전송을 같은 모양으로 감싼다
//  1) claude.ai 아티팩트의 실시간 room 기능 (window.claude.use("room"))
//  2) 같은 브라우저(같은 출처)의 다른 탭끼리 BroadcastChannel 로 흉내 낸 대체 전송 — room 을 쓸 수 없을 때(로컬 테스트 등) 자동으로
// 모양: { kind, lobby, join(name) → Promise<room>, me() → peer 라벨 | null, user }
//  room: presence(patch) · peers() · onPeers(h) · on(topic, h) · emit(topic, data) · connected() · leave()
// 프레즌스(presence)만으로 동작하도록 설계했다 (이벤트는 관리자 전용일 수 있어 쓰지 않는다)

export const PRESENCE_MAX = 4096;   // 병합된 내 프레즌스 JSON 의 최대 바이트

let _conn = null;
// 한 번만 연결을 시도한다. 결과: 전송 객체 또는 null (둘 다 쓸 수 없음)
export function connect() { return _conn || (_conn = _connect()); }

const wait = (ms) => new Promise((r) => setTimeout(() => r(null), ms));

async function _connect() {
  let room = null, user = null;
  const c = typeof window !== "undefined" ? window.claude : null;
  if (c && typeof c.use === "function") {
    // 액자 밖(직접 연 페이지)에서는 null, 응답이 없는 호스트에서는 10초 뒤 null 이 온다. 넉넉히 기다리되 영원히는 아니다
    try { room = await Promise.race([c.use("room"), wait(11000)]); } catch (_) { room = null; }
    if (room) { try { user = await Promise.race([c.use("user"), wait(6000)]); } catch (_) { user = null; } }
  }
  if (room) return new CapTransport(room, user);
  if (typeof BroadcastChannel === "function") return new LocalTransport();
  return null;
}

// ── 1) 아티팩트 room 기능 ──
function wrapRoom(r, named) {
  return {
    name: named ? r.name : "",
    presence: (p) => r.presence(p),
    peers: () => r.peers(),
    onPeers: (h, e) => r.onPeers(h, e),
    on: (t, h, e) => r.on(t, h, e),
    emit: (t, d) => r.emit(t, d),
    connected: () => r.connected(),
    leave: named ? () => r.leave() : async () => {},
  };
}
class CapTransport {
  constructor(room, user) {
    this.kind = "room";
    this.raw = room;
    this.user = user;
    this.lobby = wrapRoom(room, false);
  }
  me() { const p = this.raw.peers().find((x) => x.sameTab); return p ? p.peer : null; }
  async join(name) { const r = await this.raw.join(name); return wrapRoom(r, true); }
}

// ── 2) 같은 출처의 탭끼리: BroadcastChannel ──
// 프레즌스는 바뀔 때(최대 30회/초로 묶어서)와 1초마다(살아 있음 알림) 보낸다. 3.5초 동안 소식이 없으면 나간 것으로 본다
const CH = "fpv-pvp-net-v1";
const HEART = 1000, EXPIRE = 3500;
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b & 31]).join("").slice(0, 12);
const enc = typeof TextEncoder === "function" ? new TextEncoder() : null;
const bytes = (s) => (enc ? enc.encode(s).length : s.length * 3);
const deepFreeze = (o) => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };

class LocalTransport {
  constructor() {
    this.kind = "local";
    this.user = null;
    this.id = rid();
    this.rooms = new Map();             // 방 이름 → LocalRoom ("" = 로비)
    this.ch = new BroadcastChannel(CH);
    this.ch.onmessage = (e) => this._msg(e.data);
    this.lobby = this._room("");
    addEventListener("pagehide", () => { for (const r of this.rooms.values()) r._bye(); });
    this._hb = setInterval(() => { for (const r of this.rooms.values()) r._tick(); }, HEART / 2);
  }
  me() { return this.id; }
  _room(name) { let r = this.rooms.get(name); if (!r) { r = new LocalRoom(this, name); this.rooms.set(name, r); r._hello(); } return r; }
  async join(name) {
    if (!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(name)) throw Object.assign(new Error("room name"), { code: "invalid_argument" });
    if (this.rooms.size > 16) throw Object.assign(new Error("too many rooms"), { code: "limit_reached" });
    const r = this._room(name);
    return r.api;
  }
  _send(m) { try { this.ch.postMessage(m); } catch (_) { /* 닫힌 채널 */ } }
  _msg(m) {
    if (!m || typeof m !== "object" || m.f === this.id) return;
    const r = this.rooms.get(m.r);
    if (r) r._recv(m);
  }
}

class LocalRoom {
  constructor(tr, name) {
    this.tr = tr; this.name = name;
    this.mine = {}; this.mineJson = "{}";
    this.others = new Map();            // peer → { presence, json, updatedAt, seen, obj }
    this.subs = new Set(); this.topics = new Map();
    this.snap = null; this.selfObj = null;
    this.pend = { joined: new Map(), left: new Map(), updated: new Map() };
    this.flushQ = false; this.sendT = null; this.lastSend = 0; this.alive = true;
    const self = this;
    this.api = {
      name,
      presence: (p) => self.presence(p),
      peers: () => self.peers(),
      onPeers: (h) => self.onPeers(h),
      on: (t, h) => { let s = self.topics.get(t); if (!s) self.topics.set(t, (s = new Set())); s.add(h); return () => s.delete(h); },
      emit: (t, d) => self.emit(t, d),
      connected: () => self.alive,
      leave: async () => self.leave(),
    };
  }
  _hello() { this.tr._send({ k: "hi", r: this.name, f: this.tr.id }); this._sendState(); }
  _bye() { this.tr._send({ k: "bye", r: this.name, f: this.tr.id }); }
  leave() {
    if (!this.alive || !this.name) return;
    this.alive = false;
    this._bye();
    this.subs.clear(); this.topics.clear();
    clearTimeout(this.sendT);
    this.tr.rooms.delete(this.name);
  }
  presence(patch) {
    if (!this.alive) return Promise.reject(Object.assign(new Error("left"), { code: "invalid_argument" }));
    if (!patch || typeof patch !== "object") return Promise.reject(Object.assign(new Error("patch"), { code: "invalid_argument" }));
    const next = { ...this.mine };
    for (const k of Object.keys(patch)) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
    let json;
    try { json = JSON.stringify(next); } catch (e) { return Promise.reject(Object.assign(new Error("not json"), { code: "invalid_argument" })); }
    if (bytes(json) > PRESENCE_MAX) {
      console.warn(`[net] presence ${bytes(json)}B > ${PRESENCE_MAX}B — 거부`);
      return Promise.reject(Object.assign(new Error(`presence over ${PRESENCE_MAX} bytes`), { code: "invalid_argument" }));
    }
    if (json === this.mineJson) return Promise.resolve();
    this.mine = deepFreeze(JSON.parse(json)); this.mineJson = json;
    this.selfObj = null; this.snap = null;
    this._mark("updated", this.tr.id);
    // 묶어 보내기: 최대 30회/초
    if (!this.sendT) {
      const d = Math.max(0, 33 - (performance.now() - this.lastSend));
      this.sendT = setTimeout(() => { this.sendT = null; this._sendState(); }, d);
    }
    return Promise.resolve();
  }
  _sendState() { this.lastSend = performance.now(); this.tr._send({ k: "st", r: this.name, f: this.tr.id, p: this.mineJson }); }
  _tick() {
    if (!this.alive) return;
    const now = performance.now();
    if (now - this.lastSend > HEART) this._sendState();
    for (const [peer, o] of this.others) if (now - o.seen > EXPIRE) { this.others.delete(peer); this.snap = null; this._mark("left", peer, o.obj); }
  }
  _recv(m) {
    if (m.k === "hi") { this._sendState(); return; }
    if (m.k === "bye") { const o = this.others.get(m.f); if (o) { this.others.delete(m.f); this.snap = null; this._mark("left", m.f, o.obj); } return; }
    if (m.k === "ev") { const s = this.topics.get(m.t); if (s) for (const h of [...s]) try { h({ topic: m.t, data: m.d, peer: m.f, by: null, isMe: false, sameTab: false, kind: "viewer", guest: false }); } catch (e) { console.error(e); } return; }
    if (m.k !== "st" || typeof m.p !== "string") return;
    let o = this.others.get(m.f);
    const now = performance.now();
    if (!o) {
      let p = {}; try { p = deepFreeze(JSON.parse(m.p)); } catch (_) { /* 무시 */ }
      o = { presence: p, json: m.p, updatedAt: Date.now(), seen: now, obj: null };
      this.others.set(m.f, o); this.snap = null; this._mark("joined", m.f);
      return;
    }
    o.seen = now;
    if (o.json === m.p) return;
    try { o.presence = deepFreeze(JSON.parse(m.p)); } catch (_) { return; }
    o.json = m.p; o.updatedAt = Date.now(); o.obj = null; this.snap = null;
    this._mark("updated", m.f);
  }
  _peerObj(peer) {
    if (peer === this.tr.id) {
      return this.selfObj || (this.selfObj = Object.freeze({ peer, by: null, isMe: true, sameTab: true, kind: "viewer", guest: false, presence: this.mine, updatedAt: Date.now() }));
    }
    const o = this.others.get(peer);
    if (!o) return null;
    return o.obj || (o.obj = Object.freeze({ peer, by: null, isMe: false, sameTab: false, kind: "viewer", guest: false, presence: o.presence, updatedAt: o.updatedAt }));
  }
  peers() {
    if (this.snap) return this.snap;
    const list = [this._peerObj(this.tr.id)];
    for (const peer of this.others.keys()) list.push(this._peerObj(peer));
    return (this.snap = Object.freeze(list));
  }
  onPeers(h) {
    this.subs.add(h);
    queueMicrotask(() => { if (this.subs.has(h)) { const ps = this.peers(); try { h({ peers: ps, joined: ps, left: [], updated: [] }); } catch (e) { console.error(e); } } });
    return () => this.subs.delete(h);
  }
  emit(t, d) {
    if (!this.alive) return Promise.resolve();
    this.tr._send({ k: "ev", r: this.name, f: this.tr.id, t, d });
    const s = this.topics.get(t);
    if (s) for (const h of [...s]) queueMicrotask(() => h({ topic: t, data: d, peer: this.tr.id, by: null, isMe: true, sameTab: true, kind: "viewer", guest: false }));
    return Promise.resolve();
  }
  _mark(kind, peer, obj) {
    const P = this.pend;
    if (kind === "left") { if (P.joined.has(peer)) P.joined.delete(peer); else P.left.set(peer, obj || { peer }); P.updated.delete(peer); }
    else if (kind === "joined") P.joined.set(peer, true);
    else if (!P.joined.has(peer)) P.updated.set(peer, true);
    if (this.flushQ) return;
    this.flushQ = true;
    const run = () => {
      this.flushQ = false;
      const ps = this.peers(), get = (id) => ps.find((x) => x.peer === id);
      const ch = { peers: ps, joined: [...P.joined.keys()].map(get).filter(Boolean), left: [...P.left.values()], updated: [...P.updated.keys()].map(get).filter(Boolean) };
      P.joined.clear(); P.left.clear(); P.updated.clear();
      for (const h of [...this.subs]) try { h(ch); } catch (e) { console.error(e); }
    };
    // 화면 한 장에 한 번 (숨은 탭에서도 멈추지 않게 타이머로)
    setTimeout(run, 16);
  }
}

// ── 이름 ──
const NICK_KEY = "fpv.pvp.nick";
// 화면에 보일 이름: 제어·보이지 않는 문자를 걷어 내고 16자까지
const BAD_CH = new RegExp("[" + [[0, 0x1f], [0x7f, 0x9f], [0xad, 0xad], [0x61c, 0x61c], [0x180e, 0x180e], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x206f], [0xfe00, 0xfe0f], [0xfeff, 0xfeff]].map(([a, b]) => `\\u${a.toString(16).padStart(4, "0")}-\\u${b.toString(16).padStart(4, "0")}`).join("") + "]", "g");
export function cleanName(s) {
  return String(s == null ? "" : s).replace(BAD_CH, "").replace(/\s+/g, " ").trim().slice(0, 16);
}
let _nick = null;   // 탭마다 처음 읽은 값을 쓴다 (다른 탭에서 바꿔도 이 탭 이름은 그대로)
export function getNick() { if (_nick === null) { try { _nick = cleanName(localStorage.getItem(NICK_KEY) || ""); } catch (_) { _nick = ""; } } return _nick; }
export function setNick(v) { const n = (_nick = cleanName(v)); try { if (n) localStorage.setItem(NICK_KEY, n); else localStorage.removeItem(NICK_KEY); } catch (_) { /* 저장 불가 */ } return n; }
