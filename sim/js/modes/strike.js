// 돌파 작전: 고른 맵 한 곳에서 구역을 옮겨 가며 적 본진의 최종 병기까지 가는 단계형 작전 (서바이벌)
//  · 6단계: 구역 → 구역 → 갈림길(루트 A·B·C 입구가 각각 다른 구역으로) → 구역 → 갈림길 → 최종 구역
//  · 이동: 빛 고리 길 + 빛 기둥 + 화면 화살표(5초)로 다음 구역 방향·위치 안내, 가는 길에 서브미션
//  · 교전: 적 1파 · 중간 보스 · 적 2파 · 스테이지 보스 (보스는 bossbrain.js: 이동·패턴 7종·실드 기믹·체력 단계)
//  · 구역 확보 → 5초 정비(업그레이드 창). 격납고 파츠 능력치 없이 Lv1 시작, ⓟ로 화력·장갑·기동·스킬 강화
//  · 목숨 3개. 1~4인 협동(방장 기준 진행, 같은 적, 격추·보스 체력 공유), 혼자면 AI 윙맨 3기
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { drawCombatHud } from "../combathud.js";
import { clamp, fmtTime, submitRecord, records } from "../config.js";
import { PLAYER_HP } from "../combat.js";
import { registerMode } from "../session.js";
import { NetGame } from "../netgame.js";
import { UP, UP_KEYS, UP_MAX } from "./aos.js";
import { AosShop } from "./aos-hud.js";
import { BossBrain } from "./bossbrain.js";

// 같은 씨앗이면 모두 같은 수열: 협동에서 모든 화면에 같은 적이 같은 자리에 나오게
const mul32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const KINDS = { tank: ["tank", "tank", "lighttank", "heavytank", "missiletank"], robot: ["aa", "sniperbot", "shieldbot", "mortarbot"], ship: ["frigate", "destroyer", "destroyer"] };
const V3 = THREE.Vector3, _v = new V3();
const ROUTE = {
  A: { name: "지상 돌파", col: 0xff7a3a, css: "#ff7a3a", desc: "전차·로봇 지상 부대" },
  B: { name: "공중전", col: 0x5ab4ff, css: "#5ab4ff", desc: "드론·전투기 편대" },
  C: { name: "함대 강습", col: 0xffd24a, css: "#ffd24a", desc: "구축함·항모 전단" },
};
const LIVES = 3, REST = 5;
const UP_COST = [80, 140, 220, 320, 450];
const PTS = { drone: 10, unit: 25, mid: 120, boss: 250, final: 600, clear: 100 };
// 보스 목록: unit = 지상·함선 유닛, bot = 드론형. hp 는 배율, n 은 마릿수
const BOSS = {
  gunMid: { bot: "gunship", hp: 2.2, name: "강습선" },
  turtle: { unit: "heavytank", scale: 1.7, hp: 3.5, name: "철갑 거북" },
  sniperK: { unit: "sniperbot", scale: 1.5, hp: 3, name: "저격 대장" },
  giant: { unit: "mech", scale: 1.5, hp: 0.9, name: "강철 거인" },
  msltank: { unit: "missiletank", scale: 1.5, hp: 3, name: "미사일 포대장" },
  twin: { unit: "mech", scale: 2.85, hp: 1.2, name: "쌍포 거인" },
  aceK: { bot: "ace", hp: 4, n: 2, name: "붉은 에이스" },
  gunK: { bot: "gunship", hp: 4.5, name: "강습선 편대장" },
  destK: { unit: "destroyer", hp: 1.6, name: "구축함 '송곳'" },
  carrier: { unit: "carrier", hp: 1.3, name: "항모 '벌집'" },
  shieldK: { unit: "shieldbot", scale: 1.5, hp: 2.5, n: 2, name: "방패 대장" },
  cruiser: { unit: "cruiser", hp: 1.5, name: "순양함 '철벽'" },
  mortarK: { unit: "mortarbot", scale: 1.5, hp: 2.5, n: 2, name: "포격 대장" },
  titan: { unit: "titan", scale: 6.5, hp: 1.1, name: "초거대 로봇 '골리앗'" },
  fortress: { unit: "flagship", hp: 1.4, name: "공중 요새 '심판'" },
  flag: { unit: "flagship", hp: 1.6, name: "기함 '폭군'" },
  omega: { unit: "titan", scale: 7.3, hp: 1.5, name: "최종 병기 '오메가'" },
};
// 작전 단계 (한 맵 안의 구역들). pos 는 시작할 때 맵을 읽어 정한다
const PLAN = [
  { key: "z1", waves: [["drone", 4], { mid: "gunMid" }, ["drone", 3, "ace", 1], { boss: "turtle" }] },
  { key: "z2", waves: [["tank", 1, "robot", 1, "drone", 3], { mid: "sniperK" }, ["drone", 3, "jet", 1], { boss: "giant" }], fork: 1 },
  { key: "r1", route: 1 },
  { key: "z4", waves: [["drone", 4, "robot", 1], { mid: "shieldK" }, ["ace", 2, "tank", 1], { boss: "cruiser" }], fork: 2 },
  { key: "r2", route: 2 },
  { key: "fin", final: true, waves: [{ mid: "twin" }, ["ace", 3, "drone", 2], { boss: "omega", final: true }] },
];
const ROUTE_WAVES = {
  A1: [["tank", 2, "drone", 2], { mid: "msltank" }, ["robot", 2, "drone", 2], { boss: "twin" }],
  A2: [["tank", 2, "robot", 1], { mid: "mortarK" }, ["robot", 2, "tank", 1, "drone", 2], { boss: "titan" }],
  B1: [["drone", 5], { mid: "aceK" }, ["jet", 2, "drone", 3], { boss: "gunK" }],
  B2: [["ace", 3, "jet", 1], { mid: "gunMid" }, ["drone", 6], { boss: "fortress" }],
  C1: [["ship", 1, "drone", 3], { mid: "destK" }, ["drone", 4], { boss: "carrier" }],
  C2: [["ship", 1, "drone", 2], { mid: "carrier" }, ["ship", 2], { boss: "flag" }],
};
const SHIPS = new Set(["flagship", "carrier", "cruiser", "destroyer", "frigate"]);
const COMPASS = ["동", "북동", "북", "북서", "서", "남서", "남", "남동"];

export class StrikeMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.duration = 3600; this.title = "서바이벌 · 돌파 작전";
    this.recKey = `strike:${session.map.id}`;
    this.si = -1; this.route = []; this.lives = LIVES; this.cleared = 0; this.kills = 0;
    this.phase = "travel"; this.list = []; this.wave = 0; this.brains = []; this.extras = [];
    this.co = cfg.coop || null;
    this.ng = new NetGame(this, cfg.net || null);
    this.auth = !this.co || !this.ng.online || this.co.host === this.ng.myId;
    this.seed = this.co ? this.co.seed : Math.floor(Math.random() * 1e9);
    this.km = new Set(); this.myBossDmg = {}; this.out = false; this.wk = -1; this.syncT = 0; this.hudN = 0;
    this.gfx = []; this.gates = null; this.endT = -1; this.bossDead = false; this.restT = 0; this.guideT = 0;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat;
    const c = this.initCombat({ baseStats: true, onKill: (a, k) => this._onKill(a, k), onDamage: (a, amt, k) => this._onDmg(a, amt, k), spawnPoint: (a) => this._spawn(a) });
    this.ng.attach(c);
    const me = this.me;
    if (this.co) me.name = this.co.name || "파일럿";
    me.aos = { pts: 0, up: { fire: 0, armor: 0, move: 0, skill: 0 } };
    this.L0 = Object.assign({}, c.L);
    this._applyStats(true);
    this._liftAll = s.map.id === "orbit" || s.map.id === "moon";
    // 구역 배치: 우리 기지 → 적 기지 쪽으로 지그재그. 갈림길 루트는 서로 다른 세 곳
    const A = new V3(mc.blue[0], 0, mc.blue[1]), B = new V3(mc.red[0], 0, mc.red[1]), lim = w.size - 35;
    const axis = B.clone().sub(A).setY(0); const L = axis.length(); axis.normalize();
    const side = new V3(-axis.z, 0, axis.x), half = Math.min(w.size * 0.62, Math.max(70, L * 0.42));
    const at = (t, v) => { const p = A.clone().addScaledVector(axis, L * t).addScaledVector(side, v * half); p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim); const g = c.units.groundSpot(p.x, p.z, 40, 10); return g.clone(); };
    this.at = at; this.axis = axis;
    this.home = at(0.02, 0);
    this.spots = { z1: at(0.18, -0.55), z2: at(0.34, 0.55), r1: { A: at(0.52, -0.75), B: at(0.5, 0), C: at(0.52, 0.75) }, z4: at(0.68, 0), r2: { A: at(0.84, -0.75), B: at(0.82, 0), C: at(0.84, 0.75) }, fin: at(0.96, 0) };
    this.cur = this.home.clone();
    const sp = this._spawn(me); this.placePlayer(sp.pos, sp.yaw);
    if (!this.co || this.co.ids.length <= 1) for (let i = 0; i < 3; i++) {
      const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.4, leader: me, slot: i, name: ["윙맨 매", "윙맨 송골", "윙맨 참매"][i] });
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
    c.scatterPickups(4);
    this.shop = new AosShop(this);
    { const t = this.shop.el.querySelector("b"); if (t) t.textContent = "돌파 작전 · 업그레이드"; }
    this._go(0);
  }

  // 구역 이름: 맵 가운데 기준 방위 + 지형 성격 (건물이 빽빽 · 높낮이 큼 · 트임)
  _name(p, final) {
    if (final) return "적 본진 · 최종 결전";
    const w = this.s.world, ang = Math.atan2(-p.z, p.x), dir = COMPASS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    let blk = 0, hmin = 1e9, hmax = -1e9;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = 12 + (i % 4) * 9, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, h = w.h(x, z); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); if (w.col.blocked(_v.set(x, h + 6, z), 2)) blk++; }
    const kind = blk >= 5 ? "밀집 지역" : hmax - hmin > 14 ? "고지대" : "개활지";
    return `${dir}쪽 ${kind}`;
  }
  _stage(si) {
    const P = PLAN[si]; if (!P) return null;
    if (P.route) { const r = this.route[P.route - 1] || "B"; const pos = this.spots[P.key][r]; return { pos, waves: ROUTE_WAVES[r + P.route], name: `루트 ${r} · ${ROUTE[r].name} — ${this._name(pos)}`, r }; }
    const pos = this.spots[P.key];
    return { pos, waves: P.waves, fork: P.fork, final: P.final, name: this._name(pos, P.final) };
  }
  _spawn(a) {
    const w = this.s.world, base = (this.phase === "fight" || this.phase === "rest" || this.phase === "fork") && this.target ? this.target.clone().addScaledVector(this.axis, -45) : this.cur || this.home || this.at(0.02, 0);
    const p = base.clone(); p.y = w.h(p.x, p.z) + (a.isPlayer ? 4 : 12);
    if (!a.isPlayer) { p.x += (Math.random() - 0.5) * 20; p.z += (Math.random() - 0.5) * 20; }
    for (let i = 0; i < 12 && w.col.blocked(p, 1.8); i++) p.y += 3;
    const d = this.target ? _v.copy(this.target).sub(p).setY(0) : this.axis;
    return { pos: p, yaw: Math.atan2(-d.x, -d.z) };
  }

  // ── ⓟ 업그레이드 (AosShop 이 부른다) ──
  inBase() { return true; }
  cost(a, key) { const lv = a.aos.up[key]; return lv >= UP_MAX ? Infinity : UP_COST[lv]; }
  wantBuy(key) {
    const me = this.me, D = me.aos, c = this.cost(me, key);
    if (!(D.pts >= c)) return false;
    D.pts -= c; D.up[key]++; this._applyStats();
    this.s.game.sound.play("pickup"); this.s.hud.toast(`${UP[key].name} Lv${D.up[key] + 1}`, UP[key].color, 1, 20);
    return true;
  }
  _applyStats(init) {
    const me = this.me, u = me.aos.up, L = this.combat.L, L0 = this.L0;
    L.laserDmg = L0.laserDmg + 0.15 * u.fire; L.mDmg = L0.mDmg + 0.15 * u.fire;
    L.thrust = (L0.thrust || 0) + 0.06 * u.move; L.gauge = (L0.gauge || 0) + 0.15 * u.skill; L.mCap = (L0.mCap || 0) + u.skill;
    const mh = PLAYER_HP * (1 + (L0.hp || 0)) * (1 + 0.15 * u.armor), d = mh - me.maxHp;
    me.maxHp = mh; me.hp = init ? mh : clamp(me.hp + Math.max(0, d), 0, mh);
  }
  _give(n, why) { if (this.out) return; this.me.aos.pts += n; if (why) this.s.hud.toast(`${why}  +${n}ⓟ`, "#ffd24a", 1.1, 18); }

  // ── 다음 구역으로: 길 안내(빛 고리·빛 기둥·화살표) + 서브미션 ──
  _go(si) {
    this.si = si; this.st = this._stage(si);
    this._clearGfx();
    this.target = this.st.pos.clone();
    this.phase = "travel"; this.guideT = 5;
    const from = this.cur.clone(), to = this.target.clone(), w = this.s.world, col = this.st.final ? 0xff3d4d : 0x35ff7a;
    // 길: 빛 고리 (출발 → 도착)
    const n = Math.max(4, Math.min(10, Math.round(from.distanceTo(to) / 30)));
    for (let i = 1; i <= n; i++) {
      const p = from.clone().lerp(to, i / (n + 1)); p.y = w.h(p.x, p.z) + 16;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.35, 6, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.position.copy(p); ring.lookAt(to.clone().setY(p.y)); w.scene.add(ring); this.gfx.push(ring);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 160, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(to.x, to.y + 80, to.z); w.scene.add(beam); this.gfx.push(beam); this.beamM = beam;
    if (this.st.final) this._arena();
    // 서브미션 (모두 같은 것: 씨앗)
    this._rng(99);
    const k = ["pods", "scouts", "rings"][Math.floor(this.R() * 3)], items = [], c = this.combat, lat = new V3(-this.axis.z, 0, this.axis.x);
    const P = (f, off) => { const p = from.clone().lerp(to, f).addScaledVector(lat, off); p.y = w.h(p.x, p.z) + 12 + this.R() * 8; return p; };
    if (k === "pods") for (let i = 0; i < 3; i++) { const p = P(0.3 + i * 0.2, (this.R() - 0.5) * 50), m = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), new THREE.MeshBasicMaterial({ color: 0x8cff4a })); m.position.copy(p); w.scene.add(m); this.gfx.push(m); items.push({ p, m }); }
    else if (k === "rings") for (let i = 0; i < 5; i++) { const p = P(0.2 + i * 0.14, Math.sin(i * 1.3) * 22), m = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.45, 8, 32), new THREE.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.copy(p); m.lookAt(to.clone().setY(p.y)); w.scene.add(m); this.gfx.push(m); items.push({ p, m }); }
    else for (let i = 0; i < 2; i++) { const p = P(0.5 + i * 0.15, (i ? 1 : -1) * 45); p.y += 10; const b = c.spawnBot({ kind: "jet", team: 1, pos: p, temp: true, name: "적 정찰기" }); if (b) { b.ai.path = [P(0.95, (i ? -1 : 1) * 70).setY(p.y), P(0.1, (i ? -1 : 1) * 50).setY(p.y)]; b.ai.pi = 0; items.push({ a: b }); } }
    const SUB = { pods: ["보급 캡슐 회수", 80], scouts: ["적 정찰기 격추", 100], rings: ["비행 고리 통과", 60] };
    this.sub = { k, name: SUB[k][0], reward: SUB[k][1], items, got: 0, need: k === "rings" ? 4 : items.length, done: false };
    this.s.hud.toast(`STAGE ${si + 1} · ${this.st.name}`, this.st.final ? "#ff3d4d" : "#8cc4ff", 2.6, 30);
    if (si > 0) this.s.game.sound.play("lap");
  }
  _subTick() {
    const S = this.sub, me = this.me;
    if (!S || S.done || !me.alive) return;
    for (const it of S.items) {
      if (it.done) continue;
      if (it.a) { if (!it.a.alive) { it.done = true; S.got++; } continue; }
      it.m.rotation.y += 0.04;
      if (me.pos.distanceTo(it.p) < (S.k === "rings" ? 6.5 : 5)) { it.done = true; S.got++; it.m.visible = false; this.s.game.sound.play(S.k === "rings" ? "gate" : "pickup"); if (S.k === "pods") this.combat.give(me, "repair"); }
    }
    if (S.got >= S.need) { S.done = true; this._give(S.reward, `서브미션 성공 · ${S.name}`); this.s.game.sound.play("lap"); }
  }
  // 최종 결전장: 붉은 고리·신호탑·붉은 안개
  _arena() {
    if (this.arena) return;
    const w = this.s.world, C = this.target;
    const ring = new THREE.Mesh(new THREE.RingGeometry(68, 72, 64), new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(C.x, C.y + 0.8, C.z); w.scene.add(ring); this.arena = [ring];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, x = C.x + Math.cos(a) * 70, z = C.z + Math.sin(a) * 70, y = w.h(x, z);
      const py = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 26, 8), new THREE.MeshLambertMaterial({ color: 0x2a2f3a, emissive: 0x220406 })); py.position.set(x, y + 13, z); w.scene.add(py);
      const lt = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(2) })); lt.position.set(x, y + 27, z); w.scene.add(lt);
      this.arena.push(py, lt);
    }
    const sc = w.scene; if (sc.fog && sc.fog.color) { this.fog0 = sc.fog.color.clone(); sc.fog.color.lerp(new THREE.Color(0x3a0a10), 0.45); }
  }
  _clearGfx() { for (const m of this.gfx) { this.s.world.scene.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } this.gfx = []; this.beamM = null; }

  // ── 교전 ──
  _enter() {
    if (this.phase !== "travel") return;
    this._clearGfx();
    this.phase = "fight"; this.wave = 0; this.list = [];
    if (this.sub && !this.sub.done) { for (const it of this.sub.items) if (it.a && it.a.alive) this.combat.removeActor(it.a); this.sub.done = true; }
    this.s.hud.toast(this.st.final ? "⚠ 적 본진 진입 — 최종 결전" : `${this.st.name} — 교전 개시`, this.st.final ? "#ff3d4d" : "#ffd24a", 2.2, 28);
    this.s.game.sound.play("warn");
    this._spawnWave(this.st.waves[0]);
  }
  _rng(extra = 0) { const r = (this.R = mul32((this.seed ^ (this.si * 7919 + this.wave * 104729 + extra * 31337)) >>> 0)); this.rr = (a, b) => a + r() * (b - a); this.rp = (L) => L[Math.floor(r() * L.length)]; }
  _lift(g) {
    if (!this._liftAll || !g) return;
    g.traverse((o) => { if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.emissive || o.material.blending === THREE.AdditiveBlending) return; const m = o.material.clone(); m.emissive = (o.material.vertexColors ? new THREE.Color(0x9aa6bc) : o.material.color.clone()).multiplyScalar(0.42).add(new THREE.Color(0x1a2030)); o.material = m; });
  }
  _spawnBoss(key, isBoss, final) {
    this._rng(); const rnd = this.rr;
    const c = this.combat, C = this.target, B = BOSS[key], lvl = 1 + this.si * 0.07;
    const n = B.n || 1, out = [];
    for (let i = 0; i < n; i++) {
      let a;
      const px = C.x + this.axis.x * 30 + (i - (n - 1) / 2) * 26, pz = C.z + this.axis.z * 30 + rnd(-6, 6);
      if (B.unit) {
        const ship = SHIPS.has(B.unit), g = ship ? new V3(px, this.s.world.h(px, pz), pz) : c.units.groundSpot(px, pz, 50, 6 + (B.scale || 1) * 6).clone();   // 지상 보스: 넓고 평평한 자리
        if (ship) g.y += 38;
        a = c.units.spawn(B.unit, { pos: g, near: true, home: g.clone(), hp: B.hp * lvl, scale: B.scale, rank: isBoss ? 14 + this.si : 8 + this.si, name: B.name });
        if (a) this._lift(a.unit.group);
      } else { const p = new V3(px, this.s.world.h(px, pz) + 24, pz); a = c.spawnBot({ kind: B.bot, team: 1, pos: p, temp: true, hpScale: B.hp * lvl, name: B.name, rank: isBoss ? 14 : 9 }); if (a) { a.ai.home = C; if (B.bot === "gunship") { a.model.scale.multiplyScalar(1.35); c.fitBody(a); } } }
      if (!a) continue;
      a.name = B.name + (n > 1 ? ` ${i + 1}` : "");
      if (isBoss) a.isStageBoss = true; else a.isMidBoss = true;
      if (a.unit) for (const q of a.unit.parts) { q.noTarget = true; q.bossPart = a; }   // 부위는 따로 조준되지 않는다 (맞히면 본체에도 피해)
      if (final) a.stBoss = true;
      const type = B.unit ? (SHIPS.has(B.unit) ? "ship" : "ground") : "air";
      this.brains.push(new BossBrain(this, a, type, { center: C, stage: isBoss, extras: this.extras }));
      out.push(a);
    }
    if (final && this.route.includes("C")) { const f = BOSS.flag, p = C.clone().addScaledVector(this.axis, 70); p.y = this.s.world.h(p.x, p.z) + 42; const a = c.units.spawn("flagship", { pos: p, near: true, hp: f.hp, rank: 18, name: "호위 기함" }); a.name = "호위 기함"; a.isMidBoss = true; this.brains.push(new BossBrain(this, a, "ship", { center: C, extras: this.extras })); out.push(a); }
    for (let i = 0; i < 2; i++) { const q = C.clone().add(new V3(rnd(-40, 40), rnd(18, 28), rnd(-40, 40))); const e = c.spawnBot({ kind: isBoss ? "ace" : "grunt", team: 1, pos: q, temp: true }); if (e) { e.ai.home = C; out.push(e); } }
    if (out[0]) {
      if (isBoss) this.bossIntro(out[0], out[0].name, final ? "돌파 작전 · 최종 보스" : `${this.st.name} · 스테이지 보스`, false);
      else { out[0].bossBar = { name: out[0].name, mid: true }; this.s.hud.toast(`⚠ 중간 보스 · ${B.name}`, "#ff8a3a", 2, 26); this.s.game.sound.play("warn"); }
    }
    return out;
  }
  _spawnWave(spec) {
    const c = this.combat, C = this.target, lvl = this.si * 0.08;
    this.wk = this.si * 100 + this.wave; this.km.clear(); this.myBossDmg = {};
    if (spec && !Array.isArray(spec)) { this.list = this._spawnBoss(spec.boss || spec.mid, !!spec.boss, !!spec.final); this.list.forEach((a, i) => { a.sx = i; a.wk = this.wk; }); this.wave++; return; }
    this._rng(); const rnd = this.rr, pick = this.rp;
    this.list = [];
    for (let i = 0; i < spec.length; i += 2) {
      const kind = spec[i], n = spec[i + 1];
      for (let j = 0; j < n; j++) {
        const p = C.clone().addScaledVector(this.axis, rnd(25, 70)).add(new V3(rnd(-45, 45), 0, rnd(-45, 45)));
        let a = null;
        if (KINDS[kind] || kind === "carrier" || kind === "mech") {
          const type = KINDS[kind] ? pick(KINDS[kind]) : kind, ship = kind === "ship" || kind === "carrier";
          const g = ship ? new V3(p.x, this.s.world.h(p.x, p.z) + 36, p.z) : c.units.groundSpot(p.x, p.z, 30, 6).clone();
          a = c.units.spawn(type, { pos: g, near: true, home: g.clone() });
          if (a) this._lift(a.unit.group);
        } else {
          p.y = this.s.world.h(p.x, p.z) + rnd(16, 30);
          const bk = kind === "drone" ? pick(["grunt", "grunt", "kamikaze"]) : kind;
          a = c.spawnBot({ kind: bk, team: 1, pos: p, temp: true, hpScale: 1 + lvl });
          if (a && a.ai) a.ai.home = C;
        }
        if (a) { a.sx = this.list.length; a.wk = this.wk; this.list.push(a); }
      }
    }
    this.wave++;
    if (this.wave > 1) this.s.hud.toast(`적 ${this.wave}파`, "#ff8a3a", 1.2, 22);
  }

  // 구역 확보 → 5초 정비 → 다음 구역(또는 갈림길)
  _cleared() {
    const me = this.me;
    this.cleared++; me.score += 500;
    this._give(PTS.clear, `${this.st.name} 확보`);
    if (me.alive) me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.3);
    for (const b of this.extras) if (b.alive) this.combat.kill(b, null);
    this.extras.length = 0; this.brains = [];
    this.phase = "rest"; this.restT = REST; this.cur = this.target.clone();
    if (this.shop && !this.out) this.shop.show();
    this.s.game.sound.play("lap");
  }
  _afterRest() {
    if (this.shop) this.shop.close();
    if (this.st.fork) return this._fork();
    this._go(this.si + 1);
  }
  _fork() {
    this.phase = "fork";
    const w = this.s.world, opts = this.spots[PLAN[this.si + 1].key];
    this.gates = ["A", "B", "C"].map((k) => {
      const dest = opts[k], p = this.cur.clone().lerp(dest, 0.32); p.y = w.h(p.x, p.z);
      const R = ROUTE[k];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 1.1, 8, 40), new THREE.MeshBasicMaterial({ color: R.col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.position.set(p.x, p.y + 22, p.z); ring.lookAt(dest.clone().setY(p.y + 22)); w.scene.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: R.col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(p.x, p.y + 45, p.z); w.scene.add(beam);
      this.gfx.push(ring, beam);
      return { k, p: p.clone().setY(p.y + 22), ring, where: this._name(dest) };
    });
    this.guideT = 5;
    this.s.hud.toast("갈림길 — 들어가는 입구의 루트로 진행합니다", "#ffd24a", 2.6, 24);
    this.s.game.sound.play("warn");
  }
  _pickRoute(k) {
    if (this.phase !== "fork") return;
    this.route.push(k); this.gates = null;
    this.s.hud.toast(`루트 ${k} · ${ROUTE[k].name}!`, ROUTE[k].css, 2.2, 28); this.s.game.sound.play("gate");
    this._go(this.si + 1);
  }

  _onDmg(a, amt, k) {
    // 보스 부위에 맞은 피해는 본체에도 60% 들어간다 (부위를 따로 노리지 않아도 보스 체력이 깎이게)
    if (a.bossPart && a.bossPart.alive && amt > 0 && !this._fwd) { this._fwd = true; this.combat.damage(a.bossPart, (amt * 0.6) / (a.bossPart.armor || 1), k, a.pos); this._fwd = false; }   // 본체 장갑과 무관하게 60%
    if (k !== this.me || !(amt > 0)) return;
    if (a.wk === this.wk && (a.isStageBoss || a.isMidBoss || a.unit)) this.myBossDmg[a.sx] = (this.myBossDmg[a.sx] || 0) + amt;
  }
  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (a.wk === this.wk && a.sx !== undefined) this.km.add(a.sx);
    if (a.remoteKill) { if (a.stBoss && !this.bossDead) this._won(); return; }
    if (a === me) {
      this.lives--;
      h.toast(this.lives > 0 ? `격추! 남은 목숨 ${this.lives}` : "목숨을 모두 잃었습니다", "#ff6b5a", 2, 26);
      if (this.lives <= 0) { me.respawns = false; if (this.co && this.ng.online) { this.out = true; this.ng.setField("out", 1); } else this.endT = 2.2; }
      return;
    }
    if (k === me && a.team !== 0) {
      const sc = a.stBoss ? 5000 : a.isStageBoss ? 2000 : a.isMidBoss ? 800 : a.shieldGen ? 300 : a.unit ? 300 : 100;
      const pt = a.stBoss ? PTS.final : a.isStageBoss ? PTS.boss : a.isMidBoss ? PTS.mid : a.unit || a.shieldGen ? PTS.unit : PTS.drone;
      me.score += sc; this.kills++;
      this._give(pt); h.toast(`${a.name} 격추  +${sc} · +${pt}ⓟ`, "#ffd24a", 1, 18);
      if (a.isStageBoss || a.isMidBoss) for (let i = 0; i < (a.isStageBoss ? 3 : 1); i++) this.combat.addPickup(a.pos.clone().add(new V3((Math.random() - 0.5) * 12, 2, (Math.random() - 0.5) * 12)).setY(Math.max(a.pos.y, this.s.world.h(a.pos.x, a.pos.z) + 3)));
      else if (Math.random() < (a.unit ? 0.5 : 0.18)) this.combat.addPickup(a.pos.clone().setY(Math.max(a.pos.y, this.s.world.h(a.pos.x, a.pos.z) + 3)));
    }
    if (a.stBoss && !this.bossDead) this._won();
  }
  _won() { this.bossDead = true; this.endT = 3.5; this.s.hud.toast("최종 병기 격파 — 작전 성공!", "#35ff7a", 3, 32); this.s.game.sound.play("bigkill"); }

  update(dt) {
    super.update(dt);
    this.hudN++;
    if (this.shop) this.shop.update(dt);
    this.ng.update(dt);
    if (this.co && this.ng.online && (this.syncT -= dt) <= 0) { this.syncT = 0.25; this._coop(); }
    if (this.out) this._spectate(dt);
    if (this.state !== "run") return;
    for (const b of this.brains) b.update(dt);
    this.brains = this.brains.filter((b) => b.alive);
    const me = this.me, st = this.st;
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.endT > 0 || !st) return;
    if (this.guideT > 0) this.guideT -= dt;
    if (this.beamM) this.beamM.material.opacity = 0.18 + 0.12 * Math.sin(this.s.time * 3);
    for (const m of this.gfx) if (m.geometry && m.geometry.type === "TorusGeometry" && m.geometry.parameters.radius < 6) m.material.opacity = 0.4 + 0.25 * Math.sin(this.s.time * 4 + m.position.x * 0.05);
    if (this.phase === "travel") {
      this._subTick();
      if (me.alive && Math.hypot(me.pos.x - this.target.x, me.pos.z - this.target.z) < 42) { if (this.auth) this._enter(); else this.ng.setField("en", this.si); }
    } else if (this.phase === "fight") {
      const left = this.list.filter((a) => a.alive).length;
      this.left = left;
      if (!left && !this.cut && this.auth) {
        if (this.wave < st.waves.length) this._spawnWave(st.waves[this.wave]);
        else if (!st.final) this._cleared();
      }
    } else if (this.phase === "rest") {
      if ((this.restT -= dt) <= 0 && this.auth) this._afterRest();
    } else if (this.phase === "fork" && this.gates) {
      for (const g of this.gates) {
        g.ring.material.opacity = 0.6 + 0.3 * Math.sin(this.s.time * 4);
        if (me.alive && Math.hypot(me.pos.x - g.p.x, me.pos.z - g.p.z) < 16 && Math.abs(me.pos.y - g.p.y) < 30) { if (this.auth) { this._pickRoute(g.k); break; } this.ng.setField("gk", [this.si, g.k]); }
      }
    }
  }

  // ── 협동 동기화 (0.25초마다) ──
  _coop() {
    const ng = this.ng, me = this.me, c = this.combat, others = ng.players().filter((p) => !p.me);
    if (!this.auth) { if (!others.some((p) => p.id === this.co.host)) { this.hostGone = (this.hostGone || 0) + 0.25; if (this.hostGone > 6) { this.auth = true; this.s.hud.toast("방장이 나가 이어서 진행합니다", "#ffb02e", 2.2, 20); } } else this.hostGone = 0; }
    ng.setField("kl", [this.wk, [...this.km]]);
    ng.setField("bd", [this.wk, this.myBossDmg]);
    ng.setField("sc", Math.round(me.score));
    const tot = Object.assign({}, this.myBossDmg);
    for (const p of others) {
      const kl = ng.field(p.id, "kl");
      if (Array.isArray(kl) && kl[0] === this.wk && Array.isArray(kl[1])) for (const i of kl[1]) { const a = this.list[i | 0]; if (a && a.alive) { a.remoteKill = true; c.kill(a, null); } }
      const bd = ng.field(p.id, "bd");
      if (Array.isArray(bd) && bd[0] === this.wk && bd[1] && typeof bd[1] === "object") for (const [k, v] of Object.entries(bd[1])) tot[k] = (tot[k] || 0) + Math.max(0, Math.min(1e6, +v || 0));
    }
    for (const [k, d] of Object.entries(tot)) { const a = this.list[k | 0]; if (a && a.alive) { const want = a.maxHp - d; if (want < a.hp) a.hp = Math.max(0, want); if (a.hp <= 0.5) c.kill(a, null); } }
    if (this.auth) {
      if (this.phase === "travel" && others.some((p) => ng.field(p.id, "en") === this.si)) this._enter();
      if (this.phase === "fork") for (const p of others) { const gk = ng.field(p.id, "gk"); if (Array.isArray(gk) && gk[0] === this.si && ROUTE[gk[1]]) { this._pickRoute(gk[1]); break; } }
      const live = (this.out ? 0 : 1) + others.filter((p) => !ng.field(p.id, "out")).length;
      if (!live && this.endT < 0) this.endT = 2.5;
      ng.setField("pg", { si: this.si, w: this.wave, ph: this.phase, rt: this.route.slice(), fin: this.bossDead ? 1 : 0, fail: !live ? 1 : 0 });
      return;
    }
    const pg = ng.field(this.co.host, "pg");
    if (!pg || typeof pg !== "object") return;
    if (Array.isArray(pg.rt)) this.route = pg.rt.filter((r) => ROUTE[r]).slice(0, 2);
    let guard = 0;
    while (pg.si > this.si && guard++ < 8) { if (this.phase === "fight") { this.list.forEach((a) => { if (a.alive) { a.remoteKill = true; c.kill(a, null); } }); this._cleared(); } if (this.shop) this.shop.close(); this.cur = this.target ? this.target.clone() : this.cur; this._go(this.si + 1); }
    if (pg.si !== this.si) return;
    if (pg.ph === "fight" && this.phase === "travel") this._enter();
    if (this.phase === "fight") while (pg.w > this.wave && this.wave < this.st.waves.length && guard++ < 10) this._spawnWave(this.st.waves[this.wave]);
    if (pg.ph === "rest" && this.phase === "fight") { this.list.forEach((a) => { if (a.alive) { a.remoteKill = true; c.kill(a, null); } }); this._cleared(); }
    if (pg.ph === "fork" && (this.phase === "rest" || this.phase === "fight")) { if (this.shop) this.shop.close(); if (this.phase === "fight") this._cleared(); this._fork(); }
    if (pg.fin && !this.bossDead) this._won();
    if (pg.fail && this.endT < 0) this.endT = 2.5;
  }
  _spectate(dt) {
    const s = this.s, pl = s.player, b = pl.body, me = this.me;
    pl.frozen = true; if (pl.model) pl.model.visible = false; me.targetable = false;
    const mates = this.ng.players().filter((p) => !p.me && p.actor && !this.ng.field(p.id, "out")).map((p) => p.actor);
    if (s.game.input.take("fire")) this.specI = (this.specI || 0) + 1;
    const t = mates.length ? mates[(this.specI || 0) % mates.length] : null;
    this.specT = t;
    if (!t) return;
    _v.set(0, 0, 1).applyQuaternion(t.quat || b.quat); _v.y = 0; if (_v.lengthSq() < 0.01) _v.set(0, 0, 1); _v.normalize();
    const want = t.pos.clone().addScaledVector(_v, 10).add(new V3(0, 4, 0));
    b.pos.lerp(want, Math.min(1, dt * 3)); b.vel.set(0, 0, 0);
    b.quat.setFromRotationMatrix(new THREE.Matrix4().lookAt(b.pos, t.pos, new V3(0, 1, 0)));
  }

  missionObjective(o) {
    const me = this.me;
    if (this.phase === "travel" || this.phase === "rest") { if (!this.target) return null; o.pos = this.phase === "rest" ? this.target : this.target; o.label = `${this.phase === "rest" ? "정비 중" : "다음 구역"} · ${this.st.name}`; o.color = this.st.final ? "#ff3d4d" : "#35ff7a"; return o; }
    if (this.phase === "fight") {
      for (const b of this.brains) { const g = b.objective(); if (g) { o.pos = g.pos; o.label = "실드 발생기"; o.color = "#5ab4ff"; return o; } }
      let best = null, bd = 1e9; for (const a of this.list) if (a.alive) { const d = a.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = a; } } if (best) { o.pos = best.pos; o.label = best.name; o.color = "#ff6a5a"; return o; }
    }
    return null;
  }

  hud(h) {
    const u = h.u, L = h.L, me = this.me, s = this.s, st = this.st;
    drawCombatHud(this.combat, h);
    if (this.cut || !st) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const cx = L.cx, y0 = L.t + 8 * u;
    h.plate(cx - 200 * u, y0, 400 * u, 50 * u, { skew: 0.06, fill: "rgba(8,12,26,0.85)", accent: st.final ? "#ff3d4d" : "#35ff7a" });
    h.text(`STAGE ${this.si + 1}/${PLAN.length} · ${st.name}`, cx, y0 + 15 * u, { size: 12.5, align: "center", base: "middle", bold: true, color: "#e8f4ff", shadow: false });
    const cw = st.waves[Math.max(0, this.wave - 1)], tag = cw && !Array.isArray(cw) ? (cw.boss ? " · 스테이지 보스" : " · 중간 보스") : "";
    const dist = this.target ? Math.round(Math.hypot(me.pos.x - this.target.x, me.pos.z - this.target.z)) : 0;
    const sub = this.phase === "fight" ? `남은 적 ${this.left ?? 0} · ${Math.min(this.wave, st.waves.length)}/${st.waves.length}파${tag}`
      : this.phase === "travel" ? `다음 구역 ${dist}m${this.sub && !this.sub.done ? ` · 서브미션 ${this.sub.name} ${this.sub.got}/${this.sub.need}` : ""}`
      : this.phase === "rest" ? `정비 시간 · ${Math.ceil(this.restT)}초` : "갈림길 — 입구에 들어가면 그 루트로";
    h.text(`${"❤".repeat(Math.max(0, this.lives))}${"♡".repeat(Math.max(0, LIVES - this.lives))}  ${sub}  ·  ${Math.round(me.score)}점`, cx, y0 + 34 * u, { size: 11.5, align: "center", base: "middle", color: "#ffb4a8", shadow: false });
    let ly = y0 + 62 * u;
    if (this.route.length) { h.text(this.route.map((r) => `루트 ${r}`).join(" → "), cx, ly, { size: 11, align: "center", color: "#9fd8ff" }); ly += 14 * u; }
    if (this.co && this.ng.online) h.text(this.ng.players().map((p) => `${p.me ? "★" : "·"}${p.name}${this.ng.field(p.id, "out") || (p.me && this.out) ? "(관전)" : ""} ${p.me ? Math.round(me.score) : this.ng.field(p.id, "sc") || 0}`).join("   "), cx, ly, { size: 11, align: "center", color: "#cfe8ff" });
    else if (!this.co) h.text("혼자 · AI 윙맨 3기와 함께", cx, ly, { size: 10.5, align: "center", color: "#9aa8bc" });
    // 왼쪽: ⓟ 판
    if (!this.out) {
      const x = L.l, y = L.t + 100 * u, w = 214 * u, hh = 40 * u, D = me.aos;
      h.plate(x, y, w, hh, { skew: 0.08, fill: "rgba(8,12,26,0.86)", accent: "#ffd24a" });
      h.text(`ⓟ ${Math.floor(D.pts)}`, x + 14 * u, y + 13 * u, { size: 15, base: "middle", bold: true, color: "#ffd24a", shadow: false });
      h.text(UP_KEYS.map((k) => `${UP[k].icon}${D.up[k] + 1}`).join(" "), x + w - 12 * u, y + 13 * u, { size: 11, align: "right", base: "middle", color: "#cfd8e6", shadow: false });
      h.text(this.combat.touchUI() ? "눌러서 업그레이드 (Lv1 시작)" : `업그레이드 [${h.keyName ? h.keyName("item", "E") : "E"}] · Lv1 시작`, x + 14 * u, y + 29 * u, { size: 10, base: "middle", color: "#9aa8bc", shadow: false });
      this.panelRect = { x, y, w, h: hh, f: this.hudN };
    }
    // 이동 안내: 처음 5초 크게, 그 뒤에도 화면 가장자리 화살표(목표 표지)는 계속
    if ((this.phase === "travel" || this.phase === "fork") && this.guideT > 0 && me.alive) {
      const tgt = this.phase === "fork" && this.gates ? this.gates[1].p : this.target;
      const sp = h.project(tgt, s.camera, this._gs || (this._gs = {})), ang = sp.on ? Math.atan2(sp.y - h.H / 2, sp.x - h.W / 2) : h._dirAngle(sp);
      const col = st.final ? "#ff3d4d" : this.phase === "fork" ? "#ffd24a" : "#35ff7a";
      h.fade(Math.min(1, this.guideT * 1.5));
      for (let i = 0; i < 3; i++) { const r = (50 + i * 14) * u + ((s.time * 30 * u) % (14 * u)); h.chevron(h.W / 2 + Math.cos(ang) * r, h.H / 2 + Math.sin(ang) * r, ang, (11 - i * 1.5) * u, col, 1.5); }
      h.plate(h.W / 2 - 170 * u, h.H / 2 + 74 * u, 340 * u, 40 * u, { skew: 0.08, fill: "rgba(8,14,28,0.78)", accent: col });
      h.text(this.phase === "fork" ? "갈림길 ▸ 루트 입구 셋 중 하나로" : `다음 구역 ▸ ${st.name}`, h.W / 2, h.H / 2 + 88 * u, { size: 14, align: "center", bold: true, color: col });
      h.text(this.phase === "fork" ? "A 왼쪽 · B 가운데 · C 오른쪽" : `${dist}m · 빛 고리를 따라 빛 기둥으로`, h.W / 2, h.H / 2 + 104 * u, { size: 12, align: "center", color: "#e8f4ff" });
      h.fade(1);
    }
    if (this.phase === "rest") h.banner(`구역 확보 · 정비 ${Math.ceil(this.restT)}초 — ⓟ로 업그레이드`, h.H * 0.3, "#35ff7a", 20);
    if (this.phase === "fork" && this.gates && me.alive) for (const g of this.gates) { const R = ROUTE[g.k]; h.marker(g.p, s.camera, R.css, `루트 ${g.k} · ${R.name} → ${g.where}`, g.p.distanceTo(me.pos)); }
    // 보스 패턴 경고
    for (const b of this.brains) if (b.warnT > 0 && b.warn) { h.banner(`⚠ ${b.a.name} · ${b.warn}`, h.H * 0.24, "#ff5a3a", 18); break; }
    if (this.out) h.text(`관전 중${this.specT ? ` · ${this.specT.name}` : ""} · [발사] 다른 팀원`, cx, h.H * 0.8, { size: 15, align: "center", bold: true, color: "#9fd8ff" });
  }

  _end() {
    if (this.state === "done") return;
    const me = this.me, win = this.bossDead, sc = Math.round(me.score + (win ? this.lives * 1000 : 0));
    const rec = submitRecord(this.recKey, sc);
    this.finish({
      title: win ? "작전 성공!" : "작전 실패", sub: `돌파 작전 · ${this.s.map.name} · ${this.si + 1}/${PLAN.length} 구역${this.route.length ? " · " + this.route.map((r) => "루트 " + r).join(" → ") : ""}`, win, record: rec,
      stars: win ? (this.lives >= 3 ? 3 : this.lives >= 2 ? 2 : 1) : 0,
      lines: [{ label: "점수", value: `${sc}${win ? ` (남은 목숨 +${this.lives * 1000})` : ""}` }, { label: "확보한 구역", value: `${this.cleared + (win ? 1 : 0)} / ${PLAN.length}` },
        { label: "격추", value: `${this.kills}` }, { label: "업그레이드", value: UP_KEYS.map((k) => `${UP[k].name} ${me.aos.up[k] + 1}`).join(" · ") },
        { label: "걸린 시간", value: fmtTime(this.time) }, { label: "최고 기록", value: `${records[this.recKey] || sc}` }],
    });
  }

  dispose() {
    this._clearGfx();
    if (this.arena) for (const m of this.arena) this.s.world.scene.remove(m);
    if (this.fog0 && this.s.world.scene.fog) this.s.world.scene.fog.color.copy(this.fog0);
    for (const b of this.brains) b._cleanup();
    if (this.shop) this.shop.dispose();
    if (this.ng) this.ng.dispose();
    super.dispose();
  }
}

registerMode("strike", StrikeMode);
