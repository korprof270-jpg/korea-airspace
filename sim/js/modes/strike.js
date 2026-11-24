// 돌파 작전: 지역(맵)을 옮겨 가며 구역을 하나씩 깨고 적 수도의 최종 병기까지 가는 단계형 작전 (서바이벌)
//  · 스테이지마다 다른 맵: 진입 지점 → (이동 중 서브미션) → 교전 구역 → 적 1파 · 중간 보스 · 적 2파 · 스테이지 보스
//  · 구역 확보 → 5초 정비(업그레이드 창) → 다음 지역으로 이동. 갈림길에서는 루트 A·B·C 입구로 들어가면 그 루트의 지역으로
//      A 지상 돌파(전차·로봇) · B 공중전(드론·전투기) · C 함대 강습(구축함·항모)
//  · 격납고 파츠 능력치 없이 Lv1 로 시작. 격추·보스·서브미션으로 ⓟ 를 모아 화력·장갑·기동·스킬 강화 (기지전과 같은 창)
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
  giant: { unit: "mech", hp: 0.9, name: "강철 거인" },
  msltank: { unit: "missiletank", scale: 1.5, hp: 3, name: "미사일 포대장" },
  twin: { unit: "mech", scale: 1.9, hp: 1.2, name: "쌍포 거인" },
  aceK: { bot: "ace", hp: 4, n: 2, name: "붉은 에이스" },
  gunK: { bot: "gunship", hp: 4.5, name: "강습선 편대장" },
  destK: { unit: "destroyer", hp: 1.6, name: "구축함 '송곳'" },
  carrier: { unit: "carrier", hp: 1.3, name: "항모 '벌집'" },
  shieldK: { unit: "shieldbot", scale: 1.5, hp: 2.5, n: 2, name: "방패 대장" },
  cruiser: { unit: "cruiser", hp: 1.5, name: "순양함 '철벽'" },
  mortarK: { unit: "mortarbot", scale: 1.5, hp: 2.5, n: 2, name: "포격 대장" },
  titan: { unit: "titan", scale: 2.4, hp: 1.1, name: "초거대 로봇 '골리앗'" },
  fortress: { unit: "flagship", hp: 1.4, name: "공중 요새 '심판'" },
  flag: { unit: "flagship", hp: 1.6, name: "기함 '폭군'" },
  omega: { unit: "titan", scale: 3.0, hp: 1.5, name: "최종 병기 '오메가'" },
};
// 작전 지도: 스테이지마다 지역(맵). route 스테이지는 고른 루트에 따라 맵이 다르다
const PLAN = [
  { map: "canyon", name: "붉은 협곡 · 전초선", waves: [["drone", 4], { mid: "gunMid" }, ["drone", 3, "ace", 1], { boss: "turtle" }] },
  { map: "factory", name: "석양의 항만 · 방어선", waves: [["tank", 1, "robot", 1, "drone", 3], { mid: "sniperK" }, ["drone", 3, "jet", 1], { boss: "giant" }], fork: 1 },
  { route: 1, maps: { A: "outpost", B: "airbase", C: "island" } },
  { map: "frost", name: "설원 통신기지 · 중앙 관문", waves: [["drone", 4, "robot", 1], { mid: "shieldK" }, ["ace", 2, "tank", 1], { boss: "cruiser" }], fork: 2 },
  { route: 2, maps: { A: "foundry", B: "spaceport", C: "orbit" } },
  { map: "empire", name: "기계제국 수도 · 최종 결전", final: true, waves: [{ mid: "twin" }, ["ace", 3, "drone", 2], { boss: "omega", final: true }] },
];
const ROUTE_WAVES = {
  A1: [["tank", 2, "drone", 2], { mid: "msltank" }, ["robot", 2, "drone", 2], { boss: "twin" }],
  A2: [["tank", 2, "robot", 1], { mid: "mortarK" }, ["robot", 2, "tank", 1, "drone", 2], { boss: "titan" }],
  B1: [["drone", 5], { mid: "aceK" }, ["jet", 2, "drone", 3], { boss: "gunK" }],
  B2: [["ace", 3, "jet", 1], { mid: "gunMid" }, ["drone", 6], { boss: "fortress" }],
  C1: [["ship", 1, "drone", 3], { mid: "destK" }, ["drone", 4], { boss: "carrier" }],
  C2: [["ship", 1, "drone", 2], { mid: "carrier" }, ["ship", 2], { boss: "flag" }],
};
const ROUTE_NAME = { outpost: "협곡 전초기지", airbase: "비행기지", island: "화산섬 해역", foundry: "거신 공창", spaceport: "궤도 발사기지", orbit: "궤도 요새" };
// 스테이지 정보(루트 반영): { map, name, waves, fork, final }
export function stageInfo(si, route) {
  const p = PLAN[si];
  if (!p) return null;
  if (!p.route) return p;
  const r = route[p.route - 1] || "B";
  const map = p.maps[r];
  return { map, name: `루트 ${r} · ${ROUTE[r].name} — ${ROUTE_NAME[map] || map}`, waves: ROUTE_WAVES[r + p.route], fork: 0, r };
}
export const STRIKE_FIRST_MAP = PLAN[0].map;

export class StrikeMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    // 이어 하기 상태 (지역을 옮길 때 다음 세션으로 넘긴다)
    const K = (this.K = Object.assign({ si: 0, route: [], lives: LIVES, score: 0, pts: 0, up: { fire: 0, armor: 0, move: 0, skill: 0 }, kills: 0, cleared: 0, el: 0 }, cfg.strike || {}));
    this.si = K.si; this.route = K.route.slice(); this.lives = K.lives; this.cleared = K.cleared; this.kills = K.kills;
    this.st = stageInfo(this.si, this.route) || stageInfo(0, []);
    this.duration = 3600; this.title = `돌파 작전 · ${this.si + 1}/${PLAN.length}`;
    this.recKey = "strike:campaign";
    this.phase = "travel"; this.list = []; this.wave = 0;
    this.co = cfg.coop || null;
    this.ng = new NetGame(this, cfg.net || null);
    this.auth = !this.co || !this.ng.online || this.co.host === this.ng.myId;
    this.seed = this.co ? this.co.seed : (cfg.strike && cfg.strike.seed) || Math.floor(Math.random() * 1e9);
    this.km = new Set(); this.myBossDmg = {}; this.out = false; this.wk = -1; this.syncT = 0; this.hudN = 0;
    this.gfx = []; this.gates = null; this.endT = -1; this.bossDead = false; this.restT = 0; this.guideT = 5; this.loading = false;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat;
    const c = this.initCombat({ baseStats: true, onKill: (a, k) => this._onKill(a, k), onDamage: (a, amt, k) => this._onDmg(a, amt, k), spawnPoint: (a) => this._spawn(a) });
    this.ng.attach(c);
    const me = this.me;
    if (this.co) me.name = this.co.name || "파일럿";
    me.score = this.K.score;
    me.aos = { pts: this.K.pts, up: Object.assign({ fire: 0, armor: 0, move: 0, skill: 0 }, this.K.up) };
    this.L0 = Object.assign({}, c.L);
    this._applyStats(true);
    // 지역 배치: 진입 지점(우리 기지 쪽) → 교전 구역(적 기지 쪽)
    const A = new V3(mc.blue[0], 0, mc.blue[1]), B = new V3(mc.red[0], 0, mc.red[1]), lim = w.size - 25;
    const axis = B.clone().sub(A).setY(0); const L = axis.length(); axis.normalize();
    const side = new V3(-axis.z, 0, axis.x), half = Math.min(w.size * 0.55, Math.max(60, L * 0.32));
    const at = (t, v) => { const p = A.clone().addScaledVector(axis, L * t).addScaledVector(side, v * half); p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim); p.y = w.h(p.x, p.z); return p; };
    this.at = at; this.axis = axis;
    this.entry = at(0.02, 0); this.target = at(this.st.final ? 0.82 : 0.72, 0);
    const sp = this._spawn(me); this.placePlayer(sp.pos, sp.yaw);
    if (!this.co || this.co.ids.length <= 1) for (let i = 0; i < 3; i++) {
      const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.4, leader: me, slot: i, name: ["윙맨 매", "윙맨 송골", "윙맨 참매"][i] });
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
    c.scatterPickups(3);
    this.shop = new AosShop(this);
    { const t = this.shop.el.querySelector("b"); if (t) t.textContent = "돌파 작전 · 업그레이드"; }
    this._travel();
    if (this.st.final) this._arena();
    if (s.map.id === "orbit") this._liftAll = true;
  }

  _spawn(a) {
    const w = this.s.world, base = this.phase === "fight" || this.phase === "rest" || this.phase === "fork" ? this.at(0.5, 0) : this.entry || this.at(0.02, 0);
    const p = base.clone(); p.y += a.isPlayer ? 4 : 12;
    if (!a.isPlayer) { p.x += (Math.random() - 0.5) * 20; p.z += (Math.random() - 0.5) * 20; }
    for (let i = 0; i < 12 && w.col.blocked(p, 1.8); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(-this.axis.x, -this.axis.z) };
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

  // ── 이동 단계: 방향·위치 5초 안내 + 서브미션 ──
  _travel() {
    this.phase = "travel"; this.guideT = 5;
    this._beam(this.target, this.st.final ? 0xff3d4d : 0x35ff7a);
    this._rng(99);
    const kinds = ["pods", "scouts", "rings"], k = kinds[Math.floor(this.R() * 3)];
    const from = this.entry.clone(), to = this.target.clone(), w = this.s.world, c = this.combat, items = [];
    const P = (f, lat) => { const p = from.clone().lerp(to, f).addScaledVector(new V3(-this.axis.z, 0, this.axis.x), lat); p.y = w.h(p.x, p.z) + 12 + this.R() * 10; return p; };
    if (k === "pods") for (let i = 0; i < 3; i++) {
      const p = P(0.25 + i * 0.22, (this.R() - 0.5) * 70), m = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), new THREE.MeshBasicMaterial({ color: 0x8cff4a }));
      m.position.copy(p); w.scene.add(m); this.gfx.push(m); items.push({ p, m, done: false });
    }
    else if (k === "rings") for (let i = 0; i < 5; i++) {
      const p = P(0.18 + i * 0.15, Math.sin(i * 1.3) * 30), m = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.45, 8, 32), new THREE.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.copy(p); m.lookAt(p.clone().add(this.axis)); w.scene.add(m); this.gfx.push(m); items.push({ p, m, done: false });
    }
    else for (let i = 0; i < 2; i++) {
      const p = P(0.45 + i * 0.15, (i ? 1 : -1) * 50); p.y += 10;
      const b = c.spawnBot({ kind: "jet", team: 1, pos: p, temp: true, name: "적 정찰기" });
      if (b) { b.ai.path = [P(0.9, (i ? -1 : 1) * 80).setY(p.y), P(0.1, (i ? -1 : 1) * 60).setY(p.y)]; b.ai.pi = 0; b.scout = true; items.push({ a: b, done: false }); }
    }
    const SUB = { pods: ["보급 캡슐 회수", 80], scouts: ["적 정찰기 격추", 100], rings: ["비행 고리 통과", 60] };
    this.sub = { k, name: SUB[k][0], reward: SUB[k][1], items, got: 0, need: k === "rings" ? 4 : items.length, done: false };
    const s = this.s;
    s.hud.toast(`${this.st.name}`, this.st.final ? "#ff3d4d" : "#8cc4ff", 2.6, 30);
    setTimeout(() => { if (this.state !== "done" && this.sub && !this.sub.done) s.hud.toast(`서브미션 · ${this.sub.name} (+${this.sub.reward}ⓟ)`, "#ffd24a", 2.2, 22); }, 1800);
  }
  _subTick() {
    const S = this.sub, me = this.me;
    if (!S || S.done || !me.alive) return;
    for (const it of S.items) {
      if (it.done) continue;
      if (it.a) { if (!it.a.alive) { it.done = true; S.got++; } }
      else if (me.pos.distanceTo(it.p) < (S.k === "rings" ? 6.5 : 5)) {
        it.done = true; S.got++; it.m.visible = false; this.s.game.sound.play(S.k === "rings" ? "gate" : "pickup");
        if (S.k === "pods") this.combat.give(me, "repair");
      }
      if (it.m && !it.done) it.m.rotation.y += 0.04;
    }
    if (S.got >= S.need) { S.done = true; this._give(S.reward, `서브미션 성공 · ${S.name}`); this.s.game.sound.play("lap"); }
  }
  _beam(to, col) {
    const w = this.s.world, beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 160, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(to.x, to.y + 80, to.z); w.scene.add(beam); this.gfx.push(beam); this.beamM = beam;
  }
  // 최종 결전장: 붉은 고리·신호탑·짙은 붉은 안개
  _arena() {
    const w = this.s.world, C = this.target;
    const ring = new THREE.Mesh(new THREE.RingGeometry(68, 72, 64), new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(C.x, C.y + 0.8, C.z); w.scene.add(ring); this.arena = [ring];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, x = C.x + Math.cos(a) * 70, z = C.z + Math.sin(a) * 70, y = w.h(x, z);
      const py = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 26, 8), new THREE.MeshLambertMaterial({ color: 0x2a2f3a, emissive: 0x220406 }));
      py.position.set(x, y + 13, z); w.scene.add(py);
      const lt = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(2) }));
      lt.position.set(x, y + 27, z); w.scene.add(lt); this.arena.push(py, lt);
    }
    const sc = w.scene;
    if (sc.fog && sc.fog.color) { this.fog0 = sc.fog.color.clone(); sc.fog.color.lerp(new THREE.Color(0x3a0a10), 0.45); }
  }
  _clearGfx() { for (const m of this.gfx) { this.s.world.scene.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } this.gfx = []; this.beamM = null; }

  // ── 교전 ──
  _enter() {
    if (this.phase !== "travel") return;
    this._clearGfx();
    this.phase = "fight"; this.wave = 0; this.list = [];
    if (this.sub && !this.sub.done) { for (const it of this.sub.items) if (it.a && it.a.alive) this.combat.removeActor(it.a); this.s.hud.feed(`서브미션 실패 · ${this.sub.name}`, "#9fb4c8"); this.sub.done = true; }
    this.s.hud.toast(this.st.final ? "⚠ 적 수도 진입 — 최종 결전" : `${this.st.name} — 교전 개시`, this.st.final ? "#ff3d4d" : "#ffd24a", 2.2, 28);
    this.s.game.sound.play("warn");
    this._spawnWave(this.st.waves[0]);
  }
  _rng(extra = 0) { const r = (this.R = mul32((this.seed ^ (this.si * 7919 + this.wave * 104729 + extra * 31337)) >>> 0)); this.rr = (a, b) => a + r() * (b - a); this.rp = (L) => L[Math.floor(r() * L.length)]; }
  _lift(g) {   // 어두운 맵(우주)에서 큰 적이 검은 덩어리로 보이지 않게
    if (!this._liftAll || !g) return;
    g.traverse((o) => { if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.emissive || o.material.blending === THREE.AdditiveBlending) return; const m = o.material.clone(); m.emissive = (o.material.vertexColors ? new THREE.Color(0x9aa6bc) : o.material.color.clone()).multiplyScalar(0.42).add(new THREE.Color(0x1a2030)); o.material = m; });
  }
  _spawnBoss(key, isBoss, final) {
    this._rng(); const rnd = this.rr;
    const c = this.combat, C = this.target, B = BOSS[key], lvl = 1 + this.si * 0.07;
    const n = B.n || 1, out = [];
    for (let i = 0; i < n; i++) {
      const p = C.clone().addScaledVector(this.axis, rnd(40, 60)).add(new V3((i - (n - 1) / 2) * 30, 0, rnd(-10, 10)));
      let a;
      if (B.unit) { p.y = this.s.world.h(p.x, p.z) + (["flagship", "carrier", "cruiser", "destroyer"].includes(B.unit) ? 38 : 0); a = c.units.spawn(B.unit, { pos: p, near: true, home: p.clone(), hp: B.hp * lvl, scale: B.scale, rank: isBoss ? 14 + this.si : 8 + this.si, name: B.name }); if (a) this._lift(a.unit.group); }
      else { p.y = this.s.world.h(p.x, p.z) + 24; a = c.spawnBot({ kind: B.bot, team: 1, pos: p, temp: true, hpScale: B.hp * lvl, name: B.name, rank: isBoss ? 14 : 9 }); if (a) { a.ai.home = C; if (B.bot === "gunship") { a.model.scale.multiplyScalar(1.35); c.fitBody(a); } } }
      if (!a) continue;
      a.name = B.name + (n > 1 ? ` ${i + 1}` : "");
      if (isBoss) a.isStageBoss = true; else a.isMidBoss = true;
      if (final) a.stBoss = true;
      out.push(a);
    }
    if (final && this.route.includes("C")) { const f = BOSS.flag, p = C.clone().addScaledVector(this.axis, 70); p.y = this.s.world.h(p.x, p.z) + 42; const a = c.units.spawn("flagship", { pos: p, near: true, hp: f.hp, rank: 18, name: "호위 기함" }); a.name = "호위 기함"; a.isMidBoss = true; out.push(a); }
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
          const type = KINDS[kind] ? pick(KINDS[kind]) : kind;
          p.y = this.s.world.h(p.x, p.z) + (kind === "ship" || kind === "carrier" ? 36 : 0);
          a = c.units.spawn(type, { pos: p, near: true, home: p.clone() });
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

  // 구역 확보 → 5초 정비 → 다음 지역(또는 갈림길)
  _cleared() {
    const me = this.me;
    this.cleared++; me.score += 500;
    this._give(PTS.clear, `${this.st.name} 확보`);
    if (me.alive) me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.3);
    this.phase = "rest"; this.restT = REST;
    if (this.shop && !this.out) this.shop.show();
    this.s.game.sound.play("lap");
  }
  _afterRest() {
    if (this.shop) this.shop.close();
    if (this.st.fork) return this._fork();
    this._load(this.si + 1);
  }
  _fork() {
    this.phase = "fork";
    const w = this.s.world;
    this.gates = ["A", "B", "C"].map((k, i) => {
      const p = this.at(Math.min(0.95, (this.st.final ? 0.82 : 0.72) + 0.12), (i - 1) * 0.62), R = ROUTE[k];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 8, 40), new THREE.MeshBasicMaterial({ color: R.col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.position.set(p.x, p.y + 22, p.z); ring.lookAt(ring.position.clone().add(this.axis)); w.scene.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: R.col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(p.x, p.y + 45, p.z); w.scene.add(beam);
      this.gfx.push(ring, beam);
      return { k, p: p.clone().setY(p.y + 22), ring };
    });
    this.s.hud.toast("갈림길 — 들어가는 입구의 루트로 다음 지역에 갑니다", "#ffd24a", 2.6, 24);
    this.s.game.sound.play("warn");
  }
  _pickRoute(k) {
    if (this.phase !== "fork") return;
    this.route.push(k); this.gates = null;
    this.s.hud.toast(`루트 ${k} · ${ROUTE[k].name}!`, ROUTE[k].css, 2.2, 28); this.s.game.sound.play("gate");
    this._load(this.si + 1);
  }
  // 다음 지역 맵으로: 상태를 넘기고 세션을 새로 시작
  _load(next) {
    if (this.loading) return;
    const info = stageInfo(next, this.route);
    if (!info) return;
    this.loading = true; this.phase = "load"; this.loadNext = next;
    const me = this.me, g = this.s.game;
    const K = { si: next, route: this.route.slice(), lives: this.lives, score: Math.round(me.score), pts: me.aos.pts, up: Object.assign({}, me.aos.up), kills: this.kills, cleared: this.cleared, el: this.K.el + this.time, seed: this.seed };
    this.s.hud.toast(`다음 지역으로 이동 — ${info.name}`, "#8cc4ff", 2.4, 26);
    const cfg = Object.assign({}, this.cfg, { map: info.map, strike: K });
    if (this.co && cfg.net) cfg.net = Object.assign({}, cfg.net, { mid: `strike-${this.seed}-${next}`, host: this.co.host === this.ng.myId || (this.auth && cfg.net.host) });
    if (this.co && this.auth && this.co.host !== this.ng.myId) cfg.coop = Object.assign({}, this.co, { host: this.ng.myId });
    setTimeout(() => { if (g.session === this.s) g.startSession(cfg); }, this.co ? 1600 : 900);
  }

  _onDmg(a, amt, k) {
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
      const sc = a.stBoss ? 5000 : a.isStageBoss ? 2000 : a.isMidBoss ? 800 : a.unit ? 300 : 100;
      const pt = a.stBoss ? PTS.final : a.isStageBoss ? PTS.boss : a.isMidBoss ? PTS.mid : a.unit ? PTS.unit : PTS.drone;
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
    const me = this.me, st = this.st;
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.endT > 0 || this.loading) return;
    if (this.guideT > 0) this.guideT -= dt;
    if (this.beamM) this.beamM.material.opacity = 0.18 + 0.12 * Math.sin(this.s.time * 3);
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
        if (me.alive && Math.hypot(me.pos.x - g.p.x, me.pos.z - g.p.z) < 17 && Math.abs(me.pos.y - g.p.y) < 30) { if (this.auth) { this._pickRoute(g.k); break; } this.ng.setField("gk", [this.si, g.k]); }
      }
    }
  }

  // ── 협동 동기화 (0.25초마다) ──
  _coop() {
    const ng = this.ng, me = this.me, c = this.combat, others = ng.players().filter((p) => !p.me);
    if (!this.auth) { if (!others.some((p) => p.id === this.co.host)) { this.hostGone = (this.hostGone || 0) + 0.25; if (this.hostGone > 14) { this.auth = true; this.s.hud.toast("방장이 나가 이어서 진행합니다", "#ffb02e", 2.2, 20); } } else this.hostGone = 0; }
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
      ng.setField("pg", { si: this.si, w: this.wave, ph: this.phase, rt: this.route.slice(), ld: this.loading ? this.loadNext : -1, fin: this.bossDead ? 1 : 0, fail: !live ? 1 : 0 });
      return;
    }
    const pg = ng.field(this.co.host, "pg");
    if (!pg || typeof pg !== "object" || pg.si !== this.si) return;
    if (Array.isArray(pg.rt)) this.route = pg.rt.filter((r) => ROUTE[r]).slice(0, 2);
    if (pg.ph === "fight" && this.phase === "travel") this._enter();
    let guard = 0;
    if (this.phase === "fight") while (pg.w > this.wave && this.wave < this.st.waves.length && guard++ < 10) this._spawnWave(this.st.waves[this.wave]);
    if (pg.ph === "rest" && this.phase === "fight") { this.list.forEach((a) => { if (a.alive) { a.remoteKill = true; c.kill(a, null); } }); this._cleared(); }
    if (pg.ph === "fork" && (this.phase === "rest" || this.phase === "fight")) { if (this.shop) this.shop.close(); this._fork(); }
    if (pg.ld > this.si && !this.loading) this._load(pg.ld);
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
    if (this.phase === "travel") { o.pos = this.target; o.label = this.st.final ? "적 수도 · 최종 결전" : this.st.name; o.color = this.st.final ? "#ff3d4d" : "#35ff7a"; return o; }
    if (this.phase === "fight") { let best = null, bd = 1e9; for (const a of this.list) if (a.alive) { const d = a.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = a; } } if (best) { o.pos = best.pos; o.label = best.name; o.color = "#ff6a5a"; return o; } }
    return null;
  }

  hud(h) {
    const u = h.u, L = h.L, me = this.me, s = this.s, st = this.st;
    drawCombatHud(this.combat, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const cx = L.cx, y0 = L.t + 8 * u;
    h.plate(cx - 200 * u, y0, 400 * u, 50 * u, { skew: 0.06, fill: "rgba(8,12,26,0.85)", accent: st.final ? "#ff3d4d" : "#35ff7a" });
    h.text(`STAGE ${this.si + 1}/${PLAN.length} · ${st.name}`, cx, y0 + 15 * u, { size: 12.5, align: "center", base: "middle", bold: true, color: "#e8f4ff", shadow: false });
    const cw = st.waves[Math.max(0, this.wave - 1)], tag = cw && !Array.isArray(cw) ? (cw.boss ? " · 스테이지 보스" : " · 중간 보스") : "";
    const sub = this.phase === "fight" ? `남은 적 ${this.left ?? 0} · ${Math.min(this.wave, st.waves.length)}/${st.waves.length}파${tag}`
      : this.phase === "travel" ? (this.sub && !this.sub.done ? `서브미션 · ${this.sub.name} ${this.sub.got}/${this.sub.need}` : "교전 구역으로 이동")
      : this.phase === "rest" ? `정비 시간 · ${Math.ceil(this.restT)}초` : this.phase === "fork" ? "갈림길 — 입구에 들어가면 그 루트로" : "다음 지역으로 이동 중…";
    h.text(`${"❤".repeat(Math.max(0, this.lives))}${"♡".repeat(Math.max(0, LIVES - this.lives))}  ${sub}  ·  ${Math.round(me.score)}점`, cx, y0 + 34 * u, { size: 11.5, align: "center", base: "middle", color: "#ffb4a8", shadow: false });
    let ly = y0 + 62 * u;
    if (this.route.length) { h.text(this.route.map((r) => `루트 ${r}`).join(" → "), cx, ly, { size: 11, align: "center", color: "#9fd8ff" }); ly += 14 * u; }
    if (this.co && this.ng.online) h.text(this.ng.players().map((p) => `${p.me ? "★" : "·"}${p.name}${this.ng.field(p.id, "out") || (p.me && this.out) ? "(관전)" : ""} ${p.me ? Math.round(me.score) : this.ng.field(p.id, "sc") || 0}`).join("   "), cx, ly, { size: 11, align: "center", color: "#cfe8ff" });
    else if (!this.co) h.text("혼자 · AI 윙맨 3기와 함께", cx, ly, { size: 10.5, align: "center", color: "#9aa8bc" });
    // 왼쪽: ⓟ 판 (누르면 업그레이드 창)
    if (!this.out) {
      const x = L.l, y = L.t + 100 * u, w = 214 * u, hh = 40 * u, D = me.aos;
      h.plate(x, y, w, hh, { skew: 0.08, fill: "rgba(8,12,26,0.86)", accent: "#ffd24a" });
      h.text(`ⓟ ${Math.floor(D.pts)}`, x + 14 * u, y + 13 * u, { size: 15, base: "middle", bold: true, color: "#ffd24a", shadow: false });
      h.text(UP_KEYS.map((k) => `${UP[k].icon}${D.up[k] + 1}`).join(" "), x + w - 12 * u, y + 13 * u, { size: 11, align: "right", base: "middle", color: "#cfd8e6", shadow: false });
      h.text(this.combat.touchUI() ? "눌러서 업그레이드 (Lv1 시작)" : `업그레이드 [${h.keyName ? h.keyName("item", "E") : "E"}] · Lv1 시작`, x + 14 * u, y + 29 * u, { size: 10, base: "middle", color: "#9aa8bc", shadow: false });
      this.panelRect = { x, y, w, h: hh, f: this.hudN };
    }
    // 이동 안내 5초: 화면 가운데 큰 화살표 + 거리
    if (this.phase === "travel" && this.guideT > 0 && me.alive) {
      const sp = h.project(this.target, s.camera, this._gs || (this._gs = {})), ang = sp.on ? Math.atan2(sp.y - h.H / 2, sp.x - h.W / 2) : h._dirAngle(sp);
      h.fade(Math.min(1, this.guideT * 1.5));
      for (let i = 0; i < 3; i++) { const r = (50 + i * 14) * u + ((s.time * 30 * u) % (14 * u)); h.chevron(h.W / 2 + Math.cos(ang) * r, h.H / 2 + Math.sin(ang) * r, ang, (11 - i * 1.5) * u, st.final ? "#ff3d4d" : "#35ff7a", 1.5); }
      h.plate(h.W / 2 - 160 * u, h.H / 2 + 74 * u, 320 * u, 40 * u, { skew: 0.08, fill: "rgba(8,14,28,0.78)", accent: "#35ff7a" });
      h.text(`이동 ▸ ${st.name}`, h.W / 2, h.H / 2 + 88 * u, { size: 14, align: "center", bold: true, color: "#35ff7a" });
      h.text(`${Math.round(this.target.distanceTo(me.pos))}m · 빛 기둥 방향`, h.W / 2, h.H / 2 + 104 * u, { size: 12, align: "center", color: "#e8f4ff" });
      h.fade(1);
    }
    if (this.phase === "rest") h.banner(`구역 확보 · 정비 ${Math.ceil(this.restT)}초 — ⓟ로 업그레이드`, h.H * 0.3, "#35ff7a", 20);
    if (this.phase === "fork" && this.gates && me.alive) for (const g of this.gates) { const R = ROUTE[g.k]; h.marker(g.p, s.camera, R.css, `루트 ${g.k} · ${R.name} (${R.desc})`, g.p.distanceTo(me.pos)); }
    if (this.out) h.text(`관전 중${this.specT ? ` · ${this.specT.name}` : ""} · [발사] 다른 팀원`, cx, h.H * 0.8, { size: 15, align: "center", bold: true, color: "#9fd8ff" });
  }

  _end() {
    if (this.state === "done") return;
    const me = this.me, win = this.bossDead, sc = Math.round(me.score + (win ? this.lives * 1000 : 0));
    const rec = submitRecord(this.recKey, sc);
    this.finish({
      title: win ? "작전 성공!" : "작전 실패", sub: `돌파 작전 · ${this.si + 1}/${PLAN.length} 지역${this.route.length ? " · " + this.route.map((r) => "루트 " + r).join(" → ") : ""}`, win, record: rec,
      stars: win ? (this.lives >= 3 ? 3 : this.lives >= 2 ? 2 : 1) : 0,
      lines: [{ label: "점수", value: `${sc}${win ? ` (남은 목숨 +${this.lives * 1000})` : ""}` }, { label: "확보한 지역", value: `${this.cleared + (win ? 1 : 0)} / ${PLAN.length}` },
        { label: "격추", value: `${this.kills}` }, { label: "업그레이드", value: UP_KEYS.map((k) => `${UP[k].name} ${me.aos.up[k] + 1}`).join(" · ") },
        { label: "걸린 시간", value: fmtTime(this.K.el + this.time) }, { label: "최고 기록", value: `${records[this.recKey] || sc}` }],
    });
  }

  dispose() {
    this._clearGfx();
    if (this.arena) for (const m of this.arena) this.s.world.scene.remove(m);
    if (this.fog0 && this.s.world.scene.fog) this.s.world.scene.fog.color.copy(this.fog0);
    if (this.shop) this.shop.dispose();
    if (this.ng) this.ng.dispose();
    super.dispose();
  }
}

registerMode("strike", StrikeMode);
