// 기지전(AOS · 드론 리그) — 두 팀이 세 라인을 밀어 상대 코어를 부수는 팀전 (맵: 드론 리그 스타디움)
//
// ── 규칙 (한눈에) ──
//  · 두 팀(청·홍, 팀당 1~5기: 사람 + 봇). 기지마다 코어 1개, 라인(위·가운데·아래)마다 팀당 타워 2개(바깥·안쪽)
//  · 타워는 사거리 안의 적을 쏜다: 미니언 먼저, 타워 밑에서 아군 드론을 공격한 적 드론은 바로 노린다
//  · 안쪽 타워는 같은 라인의 바깥 타워가 무너져야, 코어는 어느 한 라인의 타워 둘이 모두 무너져야 공격할 수 있다 (그 전에는 보호막)
//  · 30초마다 양쪽 기지에서 미니언이 라인마다 날아 나가 서로 싸우며 타워를 민다
//  · 감시자 캠프(60초마다 부활)와 가운데 보스(3분마다 부활): 잡으면 포인트, 보스는 팀 전체에 60초 강화(피해 +25% · 초당 회복)
//  · 숨은 상자: 구조물 속(떠 있는 판 밑·터널 안·LED 탑 꼭대기·아치 속)에서 경기 동안만 쓰는 부품 획득
//  · 전장 포인트(ⓟ): 미니언·정글·드론 격추·도움·타워 파괴·상자, 그리고 초당 2. 기지 원 안에서 왼쪽 위 포인트 판(또는 아이템 키)으로 업그레이드 창을 열어 화력·장갑·기동·스킬을 Lv5 까지 강화
//  · 코어 체력은 다른 모드의 4배(6400) · 공격받는 아군 타워·코어는 전장 지도에 붉은 경보로 뜬다
//  · 코어 반응로: 코어는 기지 맨 안쪽 높은 단 위, 둘레는 높은 방벽이고 경기장 쪽 진입로로만 열려 있다 (진입로 정면에서 노려야 맞는다)
//  · 기지 방어 포탑 넷(진입로 어귀 둘 · 뒤 방벽 위 둘): 기지 안에 들어온 적 드론(그리고 기지 구조물을 쏜 적 드론)을 강하게 쏜다. 미니언은 드론이 없을 때만
//    코어와 같은 보호막 — 코어가 노출되어야 부술 수 있다. 공격 순서는 방어 포탑 → 코어가 정석
//  · 침입 감지: 기지 문마다 감지 장막, 담장 위 레이저. 적 드론이 기지 원을 넘으면 그 팀에 경보(“기지 침입 감지!” · 지도 붉은 고동 · 사이렌)
//    경보 동안(12초, 적이 안에 있으면 계속) 방어 포탑이 깨어나 빨리 쏘고 사거리가 늘며, 가까운 아군 봇 셋이 기지로 돌아온다
//  · 승리 (셋 중 하나): ① 적 코어(본진) 파괴 — 즉시 승리  ② 팀 전장 점수가 목표(기본 60 · 40/60/80)에 먼저 닿으면 즉시 승리
//    ③ 시간 종료 — 전장 점수가 높은 팀 (같으면 부순 타워 수 → 코어 체력 → 무승부)
//  · 팀 전장 점수(SCORE): 드론 격추 +1 · 라인 타워 파괴 +5 · 기지 방어 포탑 +3 · 중앙 보스 +5 · 감시자 캠프 정리 +1 (ⓟ 와는 별개)
//
// ── 네트워크 (js/net/README.md 의 NetGame 사용, 동기화 세부는 aos-net.js) ──
//  this.ng = new NetGame(this, cfg.net)   cfg.net 이 없으면 오프라인(봇과 혼자). cfg.pvp 가 있으면 PVP 메뉴에서 온 경기
//  this.authority = ng.owner   true = 월드(타워·코어·미니언·정글·보스·상자·봇·팀 포인트)를 직접 시뮬레이션하는 쪽 (오프라인·호스트)
//                              false = 클라이언트: 월드 결정(생성·AI·점수)은 하지 않고 호스트 프레즌스로 받은 상태를 그린다
//  클라이언트가 월드 오브젝트를 맞히면 NetGame 이 누적 피해로 호스트에 보고 → 호스트의 combat.damage 로 적용 (reportHit 은 같은 일을 하는 직접 진입점)
//  업그레이드: wantBuy(key) — 업그레이드 창(AosShop)에서만 부른다. 오프라인·호스트는 바로, 클라이언트는 프레즌스 필드 "buy" 로 요청하고 호스트가 기지 안인지 확인해 반영
//  snapshot()/applySnapshot(s): 디버그·저장용 전체 상태(구조물·팀·상자·미니언·정글·봇·ⓟ). 온라인 경로는 aos-net.js 의 작은 필드들을 쓴다
//  PvP 규칙: cfg.net 이거나 cfg.pvp 이면 격납고 파츠 능력치 끔(baseStats) · 스킬 피해 60%(skillK). 경기 내 부품·강화는 그대로
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { TEAM_COLOR, TEAM_CSS, KINDS, PLAYER_HP } from "../combat.js";
import { submitRecord, records, fmtTime, clamp } from "../config.js";
import { Swarm } from "./aos-swarm.js";
import { drawAosHud, AosShop } from "./aos-hud.js";
import { registerMode } from "../session.js";
import { registerPvpMode } from "../pvp.js";
import { NetGame } from "../netgame.js";
import { botLook } from "../dronemodel.js";
import { AosNet } from "./aos-net.js";

export const AOS_TEAM = ["청팀", "홍팀"];
export const LANE_NAME = { top: "위", mid: "가운데", bot: "아래" };
export const TIER_NAME = { outer: "바깥", inner: "안쪽" };
export const UP = {
  fire: { name: "화력", icon: "✦", per: 12, unit: "% 피해", color: "#ff7a5a" },
  armor: { name: "장갑", icon: "⬢", per: 15, unit: "% 체력", color: "#5ad1ff" },
  move: { name: "기동", icon: "»", per: 6, unit: "% 속도", color: "#8cff4a" },
  skill: { name: "스킬", icon: "✺", per: 15, unit: "% 충전 · 미사일 +1", color: "#ffd24a" },
};
export const UP_KEYS = Object.keys(UP);
export const UP_MAX = 5, UP_COST = [120, 200, 300, 420, 560];
export const PARTS = {
  chip: { name: "과충전 레이저 칩", icon: "ϟ", desc: "레이저 피해 +20%", color: "#ff4ad6" },
  plate: { name: "강화 장갑판", icon: "⬣", desc: "최대 체력 +25%", color: "#5ad1ff" },
  booster: { name: "추진 부스터", icon: "»", desc: "속도 +10%", color: "#ffe14a" },
  warhead: { name: "유도 탄두", icon: "▲", desc: "미사일 피해 +30% · 미사일 +2", color: "#ff8a1f" },
  cell: { name: "실드 셀", icon: "◈", desc: "초당 체력 3 회복", color: "#35ff7a" },
};
export const PART_KEYS = Object.keys(PARTS);
export const PTS = { passive: 2, minion: 14, minionShare: 5, camp: 28, elite: 70, boss: 150, kill: 120, assist: 50, tower: 150, towerLast: 60, cache: 60, def: 80 };
// 팀 전장 점수 (승리 조건 ②③) — 이긴 쪽 팀에 더한다
export const SCORE = { kill: 1, tower: 5, def: 3, boss: 5, camp: 2 };
export const GOALS = [40, 60, 80], GOAL_DEF = 60;
export const WIN_WHY = { core: "본진 파괴", score: "목표 점수 달성", time: "시간 종료 — 점수 우세", tie: "시간 종료 — 타워·코어 우세", draw: "시간 종료 — 무승부" };
const WHY_CODE = ["", "core", "score", "time", "tie", "draw"];
const WAVE_T = 30, FIRST_WAVE = 6, WAVE_N = 4, CAMP_FIRST = 20, CAMP_RE = 60, BOSS_FIRST = 100, BOSS_RE = 180, CACHE_RE = 90, CACHE_FIRST = 40;
const TOWER_HP = { outer: 900, inner: 1100 }, TOWER_RANGE = 72, CORE_HP = 6400 /* 4× — 코어 공성은 긴 싸움 */, CORE_RANGE = 64;
const HERO_HP = 150, MINION_HP = 75, HEAVY_HP = 200, LANE_Y = 13;
const BUFF_T = 60, LEASH = 80, BOSS_LEASH = 100;
// 감시자: 경기 시간 1/3 마다 전차형 → 비행형 → 함대형으로 바뀐다. 잡으면 ⓟ 를 많이 주지만, 감시자를 많이 잡은 진영을 기억했다가 그쪽을 노린다
const W_NAME = ["전차형 감시자", "비행 감시자", "감시 함대"], W_PTS = [40, 55, 90], W_ELITE = [110, 130, 220];
// 기지 방어 포탑 · 침입 경보
const DEF_HP = 1300, DEF_RANGE = 88, DEF_BOOST_R = 14, DEF_SHOT = [0.55, 0.3], DEF_DMG = [6, 8], DEF_MINION = 4, ALARM_T = 12, FRONT_COS = Math.cos(42 * Math.PI / 180);
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// 인스턴싱으로 그리는 액터 종류 (전투 시스템의 KINDS 에 덧붙인다: 모델은 대리 Object3D)
const SW = {};
KINDS.minion = { hp: MINION_HP, radius: 0.85, scale: 1, speed: 15, accel: 13, dmg: 3.2, rate: 3, range: 22, missiles: 0, score: 0, name: "미니언", model: () => SW.minion.proxy() };
KINDS.sentinel = { hp: 90, radius: 1.2, scale: 1, speed: 13, accel: 12, dmg: 4.5, rate: 3, range: 26, missiles: 0, score: 0, name: "비행 감시자", model: () => SW.sentinel.proxy() };

export class AosMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.duration = cfg.time || 720;
    this.title = "서바이벌 · 기지전";
    this.recKey = "survival:aos:stadium";
    this.P = cfg.pvp || null;                            // PVP 메뉴에서 온 경기 (온라인 또는 '컴퓨터와 연습')
    this.ng = new NetGame(this, cfg.net || null);
    this.authority = this.ng.owner;                      // 호스트·오프라인 true, 클라이언트 false
    this.pvp = !!(cfg.net || cfg.pvp);
    if (this.pvp) this.title = "PVP · 기지전";
    this.size = clamp(cfg.teamSize || 5, 1, 5);
    this.goal = Math.round(clamp(+(cfg.goal || (cfg.pvp && cfg.pvp.goal)) || GOAL_DEF, 10, 300));   // 목표 전장 점수 (호스트 값이 호스트 필드로 덮어쓴다)
    this.why = "";                                        // 끝난 까닭: WIN_WHY 의 키
    this.netNeutrals = [];
    this.teams = AOS_TEAM.map((name, id) => ({ id, name, css: TEAM_CSS[id], score: 0, kills: 0, lost: 0, buffT: 0, core: null, towers: [], defs: [], alarmT: 0, alarmN: 0, intruder: null, pad: new THREE.Vector3(), base: new THREE.Vector3(), bossCallT: 0, callEval: 10 + id * 3, pushT: 0, pushLane: null, pushEval: 90 + id * 7 }));
    this.towers = []; this.defs = []; this.fields = []; this.heroes = []; this.minions = []; this.camps = []; this.caches = []; this.bubbles = [];
    this.boss = null; this.bossT = BOSS_FIRST; this.waveT = FIRST_WAVE; this.wave = 0; this.campT = CAMP_FIRST;
    this.endT = -1; this.winner = -1; this.alerts = {}; this.mapAlerts = []; this.hint = null; this.nid = 1; this.byId = new Map();
    let seen = false; try { seen = !!localStorage.getItem("fpv-aos-rules"); } catch (_) { /* 저장 불가 */ }
    this.ruleT = seen ? 0 : 8;   // 처음이면 시작 뒤에도 8초 동안 규칙 카드
  }

  // ── 시작 ──
  start() {
    const s = this.s, w = s.world, A = s.map.aos;
    if (!A) throw new Error("기지전은 드론 리그 스타디움에서만 할 수 있습니다");
    this.A = A;
    SW.minion = new Swarm(w.scene, "minion", 200); SW.sentinel = new Swarm(w.scene, "sentinel", 40);
    // 먼 영웅 드론(부품이 70여 개인 모델)은 단순한 인스턴스로 대신 그린다 (그리기 호출 절약)
    SW.far = new Swarm(w.scene, "minion", 24, { test: (a) => a.alive && a.lodFar, k: 1.9 });
    this.swarms = [SW.minion, SW.sentinel, SW.far];
    const c = this.initCombat({
      onKill: (a, k) => this._onKill(a, k), onDamage: (a, amt, k) => this._onDamage(a, amt, k),
      spawnPoint: (a) => this._spawn(a), botGoal: (a) => this._botGoal(a),
      baseStats: this.pvp, skillK: this.pvp ? 0.6 : 1,
    });
    c.multi = true;
    this.L0 = Object.assign({}, c.L);
    const me = this.me, P = this.P;
    if (P) { me.team = clamp(P.team || 0, 0, 1); me.name = P.name || "나"; }
    this.ng.attach(c);
    this.net = new AosNet(this);
    this.bubGeo = new THREE.SphereGeometry(1, 20, 12);
    this.bubMat = [0, 1].map((t) => new THREE.MeshBasicMaterial({ color: TEAM_COLOR[t], transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    // 라인 경로(청 → 홍), 기지·패드
    this.paths = {};
    for (const [id, pts] of Object.entries(A.lanes)) this.paths[id] = densify(pts, 45);
    this.teams.forEach((t, i) => { t.base.set(A.bases[i][0], 0, A.bases[i][1]); t.pad.set(A.pads[i][0], 0, A.pads[i][1]); });
    // 구조물: 코어 · 타워
    for (const t of this.teams) {
      // 코어: 기지 맨 안쪽 반응로 단 위 (맵이 자리를 주지 않으면 기지 가운데)
      const [cx, cz] = A.cores ? A.cores[t.id] : [t.base.x, t.base.z];
      const core = (t.core = c.spawnCore(cx, cz, t.id, { hp: CORE_HP, name: `${t.name} 코어` }));
      const y = w.h(cx, cz) + (A.reactor ? A.reactor.h : 0), K = 2.6;
      core.model.position.y = y;
      core.model.scale.setScalar(K); core.pos.y = y + 6.6 * K; core.radius = 6.5;
      core.collider.off = true; core.collider2.off = true;
      // 진입로 방향(기지 → 경기장 가운데)과 진입로 앞 대기 자리
      t.fwd = new THREE.Vector3(-t.base.x, 0, -t.base.z).normalize();
      t.approach = new THREE.Vector3(cx, y + 12, cz).addScaledVector(t.fwd, 36);
      core.collider = w.col.addCapsule(new THREE.Vector3(cx, y, cz), new THREE.Vector3(cx, y + 11, cz), 3.6, "core");
      core.collider2 = w.col.addSphere(core.pos.clone(), 6, "core");
      core.invulnerable = true; core.ai = { cool: 1 }; core.dmgBy = new Map();
      this._body(core, core.collider, core.collider2);
      this._reg(core);
    }
    for (const [lane, list] of Object.entries(A.towers)) for (const d of list) {
      const t = this.teams[d.team], a = c.spawnTurret(d.p[0], d.p[1], d.team, { hp: TOWER_HP[d.tier], name: `${t.name} ${LANE_NAME[lane]} ${TIER_NAME[d.tier]} 타워`, range: TOWER_RANGE });
      const y = w.h(d.p[0], d.p[1]);
      a.model.position.y = y + A.towerH; a.model.scale.setScalar(2.1); a.pos.y = y + A.towerH + 2.7 * 2.1; a.radius = 3.6;
      a.collider.off = true;
      a.collider = w.col.addCapsule(new THREE.Vector3(d.p[0], y + A.towerH, d.p[1]), new THREE.Vector3(d.p[0], y + A.towerH + 6, d.p[1]), 2.8, "turret");
      this._body(a, a.collider);
      a.aosTower = true; a.lane = lane; a.tier = d.tier; a.dmgBy = new Map(); a.ai.think = 1e9; a.ai.pick = Math.random() * 0.3;
      a.invulnerable = d.tier === "inner";
      t.towers.push(a); this.towers.push(a); this._reg(a);
    }
    // 기지 방어 포탑 (코어와 같은 보호막). 사격은 _defs 가 직접 한다 (전투 시스템 포탑 AI 는 표적 없이 쉰다)
    for (const t of this.teams) (A.defenses ? A.defenses[t.id] : []).forEach((d, i) => {
      const [x, z] = d.p, gy = w.h(x, z), a = c.spawnTurret(x, z, t.id, { hp: DEF_HP, name: `${t.name} 기지 방어 포탑 ${i + 1}`, range: DEF_RANGE }), K = 2.3;
      a.model.position.y = gy + d.y; a.model.scale.setScalar(K); a.pos.y = gy + d.y + 2.7 * K; a.radius = 3.4;
      a.collider.off = true;
      a.collider = w.col.addCapsule(new THREE.Vector3(x, gy + d.y, z), new THREE.Vector3(x, gy + d.y + 6, z), 2.8, "turret");
      this._body(a, a.collider);
      a.aosDef = true; a.defK = d.k; a.dmgBy = new Map(); a.ai.think = 1e9; a.ai.target = null; a.defPick = Math.random() * 0.3; a.defCool = Math.random();
      a.invulnerable = true;
      t.defs.push(a); this.defs.push(a); this._reg(a);
    });
    for (const t of this.teams) { this._bubble(t.core, 13); for (const a of t.towers) if (a.invulnerable) this._bubble(a, 7); for (const a of t.defs) this._bubble(a, 6.5); }
    this._makeFields();
    this.net.setup();
    // 감시자 캠프 · 상자
    A.camps.forEach((d, i) => this.camps.push({ i, d, home: new THREE.Vector3(d.p[0], w.h(d.p[0], d.p[1]) + 9, d.p[1]), members: [], alive: false, t: CAMP_FIRST, aggro: null, aggroT: 0 }));
    this._makeCaches();
    // 가속 고리: 라인의 빛 고리를 자기 팀 쪽 절반에서 통과하면 3초 가속
    this.hoops = Object.values(A.hoops || {}).flat().map((q) => ({ pos: new THREE.Vector3(q.p[0], w.h(q.p[0], q.p[1]) + 13, q.p[1]), team: q.t < 0.5 ? 0 : 1 }));
    this.hoopT = 0;
    // 나 + 봇 (봇은 호스트·오프라인만 만든다)
    const bots = !!this.cfg.botsOnly;
    me.aos = this._heroData(me.team, "mid", "lane");
    this.heroes.push(me); this._reg(me);
    this._place(me, true);
    me.spawnGodT = this.s.time + 3 + this.count;
    if (bots) { me.invulnerable = true; me.targetable = false; me.respawns = false; this.spectator = true; }
    const shuffle = (l) => { for (let i = l.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [l[i], l[j]] = [l[j], l[i]]; } return l; };
    const laneSets = this.teams.map(() => ["mid", "top", "bot", ...shuffle(["top", "bot", "mid"]).slice(0, 2)]);
    const names = ["독수리", "송골매", "참매", "황조롱이", "두루미", "올빼미", "까치", "물수리", "부엉이", "제비"];
    const roster = this.authority ? this._roster(bots) : [[], []];
    let k = 0;
    for (const t of this.teams) for (let i = 0; i < roster[t.id].length; i++, k++) {
      const df = roster[t.id][i], sk = df === "hard" ? 1.15 : df === "easy" ? 0.8 : 1;
      const b = c.spawnBot({ kind: "ace", team: t.id, respawns: true, name: names[k % names.length] });
      b.rk = null; b.name = `${t.id ? "홍" : "청"} · ${names[k % names.length]}${this.pvp ? " [AI]" : ""}`; b.ai.skill = c.diff.bot * sk * (this.cfg.difficulty === "hard" ? 1.1 : 1);
      b.K0 = Object.assign({}, b.K); b.K = Object.assign({}, b.K);
      b.aos = this._heroData(t.id, laneSets[t.id][i % 5], i >= 3 ? "roam" : "lane");
      b.isHero = true;
      this.heroes.push(b); this._reg(b);
      this._place(b, false);
      this.net.shareBot(b, k);
    }
    me.isHero = true;
    for (const h of this.heroes) this._applyStats(h, true);
    this.shop = this.spectator ? null : new AosShop(this);
  }

  // 구조물 충돌체를 그 액터의 몸체로: 맞으면 그 액터가 피해를 받고, 그 액터를 노리는 시야 검사에서는 가리지 않는다
  _body(a, ...cols) { a.unit = { aos: true }; for (const c of cols) c.owner = a; }
  _reg(a) { a.aid = this.nid++; this.byId.set(a.aid, a); return a; }
  botLook(kind, team) { return botLook(kind, team); }   // NetGame 이 클라이언트 쪽 봇 모델을 만들 때
  // 팀별 봇 명단 [[난이도…], […]]. 오프라인: 팀당 size 기 (내 팀은 나 빼고). PVP: 지정한 컴퓨터 + 채우기(팀당 5기까지)
  _roster(bots) {
    const out = [[], []], P = this.P, def = this.cfg.difficulty || "normal";
    if (!P) { for (const t of [0, 1]) for (let i = t === this.me.team && !bots ? 1 : 0; i < this.size; i++) out[t].push(def); return out; }
    const n = [0, 0];
    n[this.me.team]++;
    for (let i = 1; i < (P.players || 1); i++) n[(this.me.team + i) % 2]++;   // 다른 사람들은 번갈아 들어온다고 본다
    for (const e of (P.bots || []).slice(0, 8)) { const t = clamp(e[1] | 0, 0, 1); if (n[t] < 5) { out[t].push(e[2] || def); n[t]++; } }
    if (P.fill) for (const t of [0, 1]) while (n[t] < 5) { out[t].push(def); n[t]++; }
    return out;
  }
  _heroData(team, lane, role) { return { pts: 0, up: { fire: 0, armor: 0, move: 0, skill: 0 }, parts: {}, lane, role, mode: "lane", modeT: 0, dmgBy: new Map(), towerDmg: 0, earned: 0, assists: 0, hk: 0, killedBy: null, goal: new THREE.Vector3(), jungleT: 20 + Math.random() * 30 }; }
  _place(a, isMe) {
    const sp = this._spawn(a);
    if (isMe) this.placePlayer(sp.pos, sp.yaw);
    else { a.pos.copy(sp.pos); a.model.position.copy(a.pos); }
  }
  _spawn(a) {
    const t = this.teams[a.team], w = this.s.world, ang = Math.random() * Math.PI * 2, r = a.isPlayer ? 0 : 6 + Math.random() * 10;
    const p = new THREE.Vector3(t.pad.x + Math.cos(ang) * r, 0, t.pad.z + Math.sin(ang) * r);
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 1.2 : 6 + Math.random() * 6);
    return { pos: p, yaw: Math.atan2(t.pad.x, t.pad.z) };   // 경기장 가운데를 본다
  }

  _bubble(a, r) {
    const m = new THREE.Mesh(this.bubGeo, this.bubMat[a.team]);
    m.scale.setScalar(r); m.position.copy(a.pos); m.renderOrder = 8;
    this.s.world.scene.add(m); a.bubble = m; this.bubbles.push(m);
  }
  // 코어 노출: 코어와 기지 방어 포탑의 보호막을 함께 걷는다
  _openCore(t) { this._unshield(t.core); for (const a of t.defs) this._unshield(a); }
  _unshield(a) {
    if (!a.invulnerable) return;
    a.invulnerable = false;
    if (a.bubble) { this.s.world.scene.remove(a.bubble); a.bubble = null; this.s.fx.ring(a.pos, TEAM_COLOR[a.team], 14, 0.6); }
  }

  // ── 침입 감지 장막: 기지 문마다 옅은 장막 + 가로 레이저 줄, 담장 위 레이저 고리. 경보 때 붉게 번쩍인다 ──
  _makeFields() {
    const w = this.s.world, A = this.A;
    if (!A.gates) return;
    this.fieldGeo = [new THREE.PlaneGeometry(34, 28), new THREE.BoxGeometry(34, 0.14, 0.14), new THREE.TorusGeometry(A.baseR - 0.2, 0.1, 4, 120)];
    for (const t of this.teams) {
      const base = new THREE.Color(TEAM_COLOR[t.id]), g = new THREE.Group(), y = w.h(t.base.x, t.base.z);
      const matF = new THREE.MeshBasicMaterial({ color: base.clone(), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const matL = new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(1.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      for (const a of A.gates[t.id]) {
        const cx = t.base.x + Math.cos(a) * (A.baseR - 2), cz = t.base.z + Math.sin(a) * (A.baseR - 2), ry = Math.atan2(Math.cos(a), Math.sin(a));
        const pl = new THREE.Mesh(this.fieldGeo[0], matF); pl.position.set(cx, y + 14, cz); pl.rotation.y = ry; g.add(pl);
        for (const hh of [2.5, 8, 13.5, 19, 24.5]) { const ln = new THREE.Mesh(this.fieldGeo[1], matL); ln.position.set(cx, y + hh, cz); ln.rotation.y = ry; g.add(ln); }
      }
      const rg = new THREE.Mesh(this.fieldGeo[2], matL); rg.rotation.x = Math.PI / 2; rg.position.set(t.base.x, y + 6.2, t.base.z); g.add(rg);
      for (const m of g.children) m.renderOrder = 7;
      w.scene.add(g);
      this.fields.push({ t, g, matF, matL, base });
    }
  }
  _fieldsFx() {
    const tm = this.s.time;
    for (const f of this.fields) {
      const on = f.t.alarmT > 0 && f.t.core.alive, p = 0.5 + 0.5 * Math.sin(tm * 14);
      if (on) { f.matL.color.setRGB(2.2, 0.35 + p * 0.9, 0.3 + p * 0.6); f.matL.opacity = 0.75 + 0.25 * p; f.matF.color.setRGB(1, 0.12, 0.1); f.matF.opacity = 0.08 + 0.12 * p; }
      else { f.matL.color.copy(f.base).multiplyScalar(1.6); f.matL.opacity = f.t.core.alive ? 0.42 + 0.1 * Math.sin(tm * 2 + f.t.id) : 0.1; f.matF.color.copy(f.base); f.matF.opacity = f.t.core.alive ? 0.045 : 0; }
    }
  }
  // 기지 원 안(높이 70 m 아래)
  _inBaseOf(t, o) { return Math.hypot(o.pos.x - t.base.x, o.pos.z - t.base.z) < this.A.baseR + 1 && o.pos.y < 70; }
  // 코어 진입로 정면(코어를 제대로 노릴 수 있는 쪽)인가
  _front(t, p) {
    const k = t.core.pos, dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz);
    return d < (this.A.reactor ? this.A.reactor.r : 30) || (dx * t.fwd.x + dz * t.fwd.z) / d > FRONT_COS || p.y > k.y + 22;
  }
  // 침입 감지 (오프라인·호스트): 적 드론이 기지 원을 넘는 순간 경보. 안에 머무는 동안은 경보가 꺼지지 않는다
  _intrusion(dt) {
    for (const t of this.teams) {
      if (t.alarmT > 0) t.alarmT = Math.max(0, t.alarmT - dt);
      if (!t.core.alive) { t.alarmT = 0; t.intruder = null; continue; }
      let intr = null, bd = 1e9;
      for (const h of this.heroes) {
        if (h.team === t.id || h.targetable === false) continue;
        const inside = h.alive && this._inBaseOf(t, h), key = t.id ? "_inR" : "_inB";
        if (inside && !h[key]) this._trigger(t, h);
        h[key] = inside;
        if (inside) { const d = h.pos.distanceTo(t.core.pos); if (d < bd) { bd = d; intr = h; } }
      }
      t.intruder = intr;
      if (intr) t.alarmT = Math.max(t.alarmT, 2);
    }
  }
  _trigger(t, h) {
    t.alarmT = ALARM_T; t.alarmN++;
    this._alarmFx(t, h.pos);
    // 가까운 아군 봇 셋이 기지 방어로 (멀면 귀환)
    const near = this.heroes.filter((o) => o.team === t.id && o.alive && !o.isPlayer && !o.remote && o.aos && o.aos.mode !== "retreat" && o.pos.distanceTo(t.base) < 430)
      .sort((x, y) => x.pos.distanceTo(t.base) - y.pos.distanceTo(t.base)).slice(0, 3);
    for (const o of near) { o.aos.defendT = 16; if (o.pos.distanceTo(t.base) > 220 && !this._nearest(o, (q) => q.isHero && this._foe(o, q), 70)) this.startRecall(o); }
  }
  // 경보 연출 (호스트·클라이언트 모두): 지키는 팀 = 글 알림 · 사이렌 · 지도 고동, 들어간 쪽(나) = 짧은 경고
  _alarmFx(t, pos) {
    const now = this.s.time;
    t.alarmFxT = now;
    if (this.spectator) { this.mapAlerts.push({ x: t.base.x, z: t.base.z, t: 4, dur: 4, base: true, team: t.id }); return; }
    if (this.me.team === t.id) {
      this.mapAlerts.push({ x: t.base.x, z: t.base.z, t: 4, dur: 4, base: true, team: t.id });
      if ((this.alerts.intr || -99) > now) return;
      this.alerts.intr = now + 6;
      this._hint("기지 침입 감지!", "#ff3b3b", 4, (pos || t.core.pos).clone());
      this.s.game.sound.play("alarm");
    } else if (this.me.alive && this._inBaseOf(t, this.me) && (this.alerts.intrMe || -99) <= now) {
      this.alerts.intrMe = now + 10;
      this.s.hud.toast("적 기지 경보 발령 — 방어 포탑이 깨어납니다!", "#ffb02e", 2, 20);
      this.s.game.sound.play("warn");
    }
  }
  // 기지 방어 포탑 (오프라인·호스트): 기지 안의 적 드론 > 기지 구조물을 쏜 적 드론 > (경보 중) 사거리 안 적 드론 > 기지 안 미니언
  _defs(dt) {
    const c = this.combat, now = this.s.time;
    for (const a of this.defs) {
      if (!a.alive) { a.defTarget = null; continue; }
      const t = this.teams[a.team], boost = t.alarmT > 0, R = DEF_RANGE + (boost ? DEF_BOOST_R : 0);
      a.ai.target = null; a.ai.think = 1e9;
      if ((a.defPick -= dt) <= 0) {
        a.defPick = 0.25;
        let best = null, bs = 1e9;
        for (const o of c.actors) {
          if (!o.alive || !o.targetable || o.team === a.team || o.team === 2 || o.static || o.invulnerable) continue;
          const d = o.pos.distanceTo(a.pos);
          if (d > R) continue;
          let sc;
          if (o.isHero) { const inside = this._inBaseOf(t, o); if (!inside && !((o.baseAggro || -99) > now) && !boost) continue; sc = inside ? d : d + 40; }
          else if (o.isMinion) { if (!this._inBaseOf(t, o)) continue; sc = d + 400; }
          else continue;
          if (sc < bs && this._defSees(a, o)) { bs = sc; best = o; }
        }
        a.defTarget = best;
      }
      const tg = a.defTarget;
      if (!tg || !tg.alive) { a.defTarget = null; a.head.rotation.y += dt * (boost ? 2.4 : 0.5); continue; }
      const d = tg.pos.distanceTo(a.pos);
      _v.copy(tg.pos).addScaledVector(tg.vel, d / 150).sub(a.pos);
      a.head.rotation.set(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), Math.atan2(-_v.x, -_v.z), 0, "YXZ");
      if ((a.defCool -= dt) > 0) continue;
      a.defCool = DEF_SHOT[boost ? 1 : 0] * (0.9 + Math.random() * 0.2);
      _v.normalize();
      const sp = 0.012; _v.x += (Math.random() - 0.5) * sp; _v.y += (Math.random() - 0.5) * sp; _v.z += (Math.random() - 0.5) * sp; _v.normalize();
      _w.copy(a.pos).addScaledVector(_v, 3.4);
      const col = boost ? 0xff5040 : a.team ? 0xffa040 : 0x66b8ff;
      c.fireLaser(a, _w, _v, tg.isMinion ? DEF_MINION : DEF_DMG[boost ? 1 : 0], col, 150);
      this.s.fx.muzzle(_w, _v, col, 2.6);
      if (a.pos.distanceTo(this.s.camera.position) < 160) this.s.game.sound.play("elaser", c.volAt(a.pos) * 0.6, c.panAt(a.pos));
    }
  }

  // 포탑 머리에서 표적까지 시야 (자기 받침 충돌체 밖, 표적 쪽으로 6 m 나간 점부터)
  _defSees(a, o) { _w.copy(o.pos).sub(a.pos).normalize().multiplyScalar(6).add(a.pos); return this.s.world.col.visible(_w, o.pos, 2, o.unit || null); }

  // ── 숨은 상자 ──
  _makeCaches() {
    const w = this.s.world;
    this.cacheGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6); this.cacheRing = new THREE.TorusGeometry(1.7, 0.08, 5, 28);
    this.cacheMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd24a).multiplyScalar(2) });
    this.cacheMat2 = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const d of this.A.caches) {
      const g = new THREE.Group(), box = new THREE.Mesh(this.cacheGeo, this.cacheMat), ring = new THREE.Mesh(this.cacheRing, this.cacheMat2), ring2 = new THREE.Mesh(this.cacheRing, this.cacheMat2);
      ring2.rotation.x = Math.PI / 2; g.add(box, ring, ring2);
      const pos = new THREE.Vector3(d.p[0], w.h(d.p[0], d.p[2]) + d.p[1], d.p[2]);
      g.position.copy(pos); w.scene.add(g);
      g.visible = false;
      this.caches.push({ d, pos, g, box, ring, ring2, active: false, t: CACHE_FIRST, nid: this.nid++ });
    }
  }
  _caches(dt) {
    const tm = this.s.time;
    for (const k of this.caches) {
      if (!k.active) { if (this.authority && (k.t -= dt) <= 0) { k.active = true; k.g.visible = true; } continue; }
      k.box.rotation.y += dt * 1.6; k.ring.rotation.y += dt * 1.1; k.ring2.rotation.z += dt * 0.8; k.g.position.y = k.pos.y + Math.sin(tm * 2 + k.pos.x) * 0.3;
      if (!this.authority) continue;
      for (const a of this.heroes) if (a.alive && a.targetable !== false && a.pos.distanceTo(k.pos) < 4.2 + a.radius) { this._takeCache(k, a); break; }
    }
  }
  _takeCache(k, a) {
    k.active = false; k.g.visible = false; k.t = CACHE_RE;
    const free = PART_KEYS.filter((p) => !a.aos.parts[p]);
    this.s.fx.ring(k.pos, 0xffd24a, 8, 0.5); this.s.fx.burst(k.pos, 0xffd24a, 30, 14, 0.6, 0.4, 0);
    if (!free.length) { this._give(a, PTS.cache * 2); if (a === this.me) this.s.hud.toast(`숨은 상자 — 부품을 모두 모았습니다  +${PTS.cache * 2}ⓟ`, "#ffd24a", 2, 20); return; }
    const p = free[(Math.random() * free.length) | 0], P = PARTS[p];
    a.aos.parts[p] = 1; this._give(a, PTS.cache);
    if (p === "warhead") a.missiles += 2;
    this._applyStats(a);
    if (a === this.me) { this.s.hud.toast(`숨은 상자! ${P.icon} ${P.name} — ${P.desc}`, P.color, 2.6, 22); this.s.game.sound.play("pickup"); }
    else this.s.hud.feed(`${a.name} ▸ ${P.name} 획득`, TEAM_CSS[a.team]);
  }

  // ── 능력치: 강화 단계 + 부품 + 보스 강화 ──
  _applyStats(a, init = false) {
    if (a.remote) return;   // 다른 사람·대리 액터는 자기 쪽에서 적용한다
    const u = a.aos.up, P = a.aos.parts, buff = this.teams[a.team].buffT > 0 ? 0.25 : 0;
    const fire = 0.12 * u.fire + (P.chip ? 0.2 : 0) + buff, hpK = 1 + 0.15 * u.armor + (P.plate ? 0.25 : 0), mv = 0.06 * u.move + (P.booster ? 0.1 : 0);
    let maxHp;
    if (a.isPlayer) {
      const L = this.combat.L, L0 = this.L0;
      L.laserDmg = L0.laserDmg + fire; L.mDmg = L0.mDmg + 0.12 * u.fire + (P.warhead ? 0.3 : 0) + buff;
      L.thrust = L0.thrust + mv; L.gauge = L0.gauge + 0.15 * u.skill; L.mCap = L0.mCap + u.skill + (P.warhead ? 2 : 0);
      maxHp = PLAYER_HP * (1 + L0.hp) * hpK;
    } else {
      const K = a.K, B = a.K0;
      K.dmg = B.dmg * (1 + fire); K.speed = B.speed * (1 + mv); K.accel = B.accel * (1 + mv); K.missiles = B.missiles + u.skill + (P.warhead ? 2 : 0);
      maxHp = HERO_HP * hpK;
    }
    const d = maxHp - (init ? 0 : a.maxHp);
    a.maxHp = maxHp; a.hp = init ? maxHp : clamp(a.hp + Math.max(0, d), 0, maxHp);
  }
  _give(a, n) { if (!a || !a.aos) return; a.aos.pts += n; a.aos.earned += n; a.score += n; }
  cost(a, key) { const lv = a.aos.up[key]; return lv >= UP_MAX ? Infinity : UP_COST[lv]; }
  onPad(a) { const t = this.teams[a.team]; return Math.hypot(a.pos.x - t.pad.x, a.pos.z - t.pad.z) < this.A.padR + 6 && a.pos.y - this.s.world.h(a.pos.x, a.pos.z) < 30; }
  inBase(a) { const t = this.teams[a.team]; return Math.hypot(a.pos.x - t.base.x, a.pos.z - t.base.z) < this.A.baseR; }
  // 업그레이드 요청 (상점 UI·봇). 클라이언트는 호스트로 보내야 한다
  wantBuy(key, a = this.me) {
    if (!this.authority) { if (!this.inBase(a) || this.cost(a, key) > a.aos.pts) return false; this.net.wantBuy(key); this.s.game.sound.play("lap"); return true; }
    return this.buy(a, key);
  }
  buy(a, key) {
    if (!UP[key] || !a.alive || !this.inBase(a)) return false;
    const c = this.cost(a, key);
    if (a.aos.pts < c) return false;
    a.aos.pts -= c; a.aos.up[key]++;
    this._applyStats(a);
    if (a === this.me) { this.s.game.sound.play("lap"); this.s.hud.toast(`${UP[key].icon} ${UP[key].name} Lv${a.aos.up[key]}  (+${UP[key].per * a.aos.up[key]}${UP[key].unit.split(" ")[0]})`, UP[key].color, 1.4, 20); this.s.fx.ring(a.pos, 0x8cff4a, 5, 0.4); }
    return true;
  }
  _botShop(a) {
    const pri = a.aos.role === "roam" ? ["move", "fire", "armor", "skill"] : ["fire", "armor", "move", "skill"];
    for (let n = 0; n < 8; n++) {
      let best = null;
      for (const k of pri) if (a.aos.up[k] < UP_MAX && (!best || a.aos.up[k] < a.aos.up[best])) best = k;
      if (!best || !this.buy(a, best)) break;
    }
  }
  respawnTime() { return clamp(5 + (this.time / 60) * 1.1, 5, 18); }

  // ── 미니언 ──
  _wave() {
    const heavy = this.wave % 2 === 1 ? (this.time > 360 ? 2 : 1) : 0;   // 둘째 웨이브마다 중형 미니언 (6분 뒤엔 둘)
    this.wave++;
    if (this.minions.filter((m) => m.alive).length > 150) return;
    const online = this.ng.online;
    for (const t of this.teams) {
      if (!t.core.alive) continue;
      for (const lane of Object.keys(this.paths)) {
        const path = this.paths[lane], st = t.id ? path[path.length - 1] : path[0], nx = t.id ? path[path.length - 2] : path[1];
        _w.copy(nx).sub(st).setY(0).normalize();
        const extra = this.teams[1 - t.id].towers.filter((x) => x.lane === lane && !x.alive).length;   // 상대 타워를 부순 라인은 중형 미니언이 더 나온다
        const n = online ? 3 : WAVE_N;
        for (let i = 0; i < n + (online ? Math.min(1, heavy + extra) : heavy + extra); i++) {
          if (!this.net.canSpawnMinion()) break;
          const big = i >= n;
          const m = this._minion(t.id);
          m.pos.copy(st).addScaledVector(_w, -i * 5).add(_v.set((i % 2 ? 1 : -1) * 3, (i % 3) * 1.5, 0));
          m.vel.set(0, 0, 0); m.model.position.copy(m.pos);
          m.lane = lane; m.wp = t.id ? path.length - 2 : 1; m.heavy = big;
          m.hp = m.maxHp = big ? HEAVY_HP : MINION_HP;
          m.K = big ? this._heavyK : KINDS.minion;
          m.model.scale.setScalar(SW.minion.scale * (big ? 1.6 : 1)); m.radius = big ? 1.3 : 0.85;
          m.name = big ? "중형 미니언" : "미니언";
          this.net.shareMinion(m);
        }
      }
    }
  }
  _minion(team) {
    let m = this.minions.find((x) => !x.alive && x.team === team);
    const c = this.combat;
    if (!m) {
      m = c.spawnBot({ kind: "minion", team, respawns: false });
      m.rk = null; m.isMinion = true; m.ai.skill = c.diff.bot * 0.8;
      SW.minion.add(m, TEAM_COLOR[team]); this.minions.push(m); this._reg(m);
      if (!this._heavyK) this._heavyK = Object.assign({}, KINDS.minion, { dmg: 5.5, rate: 3.5, range: 26, speed: 13 });
    } else {
      m.alive = true; m.model.visible = true; m.stunT = 0; m.flash = 0; m.shield = 0;
      Object.assign(m.ai, { target: null, goal: null, roam: null, think: Math.random() * 0.2, stuck: 0, lastHit: null, lastHitT: 0, burst: 0, cool: Math.random() });
    }
    return m;
  }

  // ── 정글 ──
  _wStage() { const f = this.time / Math.max(1, this.duration); return f < 1 / 3 ? 0 : f < 2 / 3 ? 1 : 2; }
  // 감시자 캠프의 표적 진영: 감시자에게서 ⓟ 를 더 많이 가져간 쪽 (단계가 오를수록 적게 가져가도 노린다)
  _wHunt(camp, st) {
    const g = camp.grudge || (camp.grudge = [0, 0]), need = [160, 60, 1][st];
    const t = g[0] === g[1] ? -1 : g[0] > g[1] ? 0 : 1;
    camp.hunt = t >= 0 && g[t] >= need ? t : null;
    if (camp.hunt !== null && camp.hunt === this.me.team && !this._wWarned) { this._wWarned = this.time; }
    if (camp.hunt !== null) this._hint(camp.hunt === this.me.team ? `${W_NAME[st]}가 아군 진영을 노리고 다가옵니다!` : `${W_NAME[st]}가 ${this.teams[camp.hunt].name}을 노립니다`, camp.hunt === this.me.team ? "#ff8a5a" : "#c8a0ff", 4);
  }
  // 전차형(1단계) · 함대형(3단계) 감시자: 지상 전차 / 전투함 유닛 (온라인이 아닐 때만)
  _spawnCampUnit(camp, st) {
    const c = this.combat, d = camp.d;
    camp.members.length = 0;
    const list = st === 0 ? (d.big ? ["tank", "tank"] : ["tank"]) : [d.big ? "cruiser" : "frigate"];
    list.forEach((type, i) => {
      const elite = d.big && i === 0;
      const r = c.units.spawn(type, { pos: camp.home.clone().add(_v.set(i * 9 - 4, 0, i * 6)), near: true, hp: (st === 0 ? 0.9 : 0.55) * (elite ? 1.6 : 1) * (1 + this.size * 0.08), rank: 2 + st * 3 + (elite ? 2 : 0), scale: elite && st === 0 ? 1.25 : 1 });
      const u = r.unit;
      r.team = 2; for (const q of u.parts) q.team = 2;
      r.isNeutral = true; r.camp = camp; r.elite = elite; r.wStage = st; r.wUnit = u;
      r.name = (elite ? "정예 " : "") + W_NAME[st];
      u.home = camp.home.clone(); u.home.y = this.s.world.h(u.home.x, u.home.z);
      camp.members.push(r); this._reg(r);
    });
    camp.alive = true; camp.aggro = null; camp.aggroT = 0; camp.stage = st;
    this._wHunt(camp, st);
  }
  _spawnCamp(camp) {
    const st0 = this.ng.online ? 1 : this._wStage();
    if (st0 !== 1) return this._spawnCampUnit(camp, st0);
    const c = this.combat, d = camp.d, n = this.ng.online ? 2 : 3;   // 온라인은 프레즌스 예산 때문에 캠프당 둘
    camp.members.length = 0; camp.stage = 1;
    for (let i = 0; i < n; i++) {
      const elite = d.big && i === 0;
      const a = camp.pool && camp.pool[i] ? camp.pool[i] : null;
      let m = a;
      if (!m) {
        m = c.spawnBot({ kind: "sentinel", team: 2, respawns: false });
        m.rk = null; m.isNeutral = true; m.camp = camp; m.ai.skill = c.diff.bot;
        SW.sentinel.add(m, elite ? 0xffb040 : 0xa46bff); this._reg(m);
        (camp.pool || (camp.pool = [])).push(m);
      } else { m.alive = true; m.model.visible = true; m.stunT = 0; Object.assign(m.ai, { target: null, goal: null, roam: null, think: 0, lastHit: null, lastHitT: 0 }); }
      const ang = (i / n) * Math.PI * 2;
      m.home = camp.home.clone().add(_v.set(Math.cos(ang) * 5, i * 1.2, Math.sin(ang) * 5));
      m.pos.copy(m.home); m.vel.set(0, 0, 0); m.model.position.copy(m.pos);
      m.elite = elite; m.wStage = 1; m.hp = m.maxHp = elite ? 520 : 150;
      m.K = elite ? (this._eliteK || (this._eliteK = Object.assign({}, KINDS.sentinel, { dmg: 8, rate: 3.5, range: 30 }))) : KINDS.sentinel;
      m.model.scale.setScalar(SW.sentinel.scale * (elite ? 1.9 : 1)); m.radius = elite ? 2.2 : 1.2;
      m.name = elite ? "정예 비행 감시자" : "비행 감시자";
      camp.members.push(m);
      this.net.shareNeutral(m, `c${camp.i}_${i}_${(camp.gen = (camp.gen || 0) + 1) % 1000}`);
    }
    camp.alive = true; camp.aggro = null; camp.aggroT = 0;
    if (!this.ng.online) this._wHunt(camp, 1);
  }
  // 감시자가 노리는 진영의 가장 가까운 표적: 부술 수 있는 타워·방어 포탑·코어, 없으면 그 진영 드론
  _wTarget(team, from) {
    const t = this.teams[team];
    let best = null, bd = 1e9;
    for (const o of [...t.towers, ...t.defs, t.core]) { if (!o || !o.alive || o.invulnerable) continue; const d = o.pos.distanceTo(from); if (d < bd) { bd = d; best = o; } }
    for (const o of this.heroes) { if (!o.alive || o.team !== team) continue; const d = o.pos.distanceTo(from) * 0.8; if (d < bd) { bd = d; best = o; } }
    return best;
  }
  _spawnBoss() {
    const c = this.combat, A = this.A, w = this.s.world;
    const home = new THREE.Vector3(A.boss[0], w.h(A.boss[0], A.boss[2]) + 16, A.boss[2]);
    let b = this.boss;
    if (!b) {
      b = this.boss = c.spawnBot({ kind: "boss", team: 2, respawns: false, pos: home.clone() });
      b.rk = null; b.isNeutral = true; b.isBoss = true; b.camp = { aggro: null, aggroT: 0, boss: true }; b.home = home; this._reg(b);
      b.K = Object.assign({}, b.K, { speed: 7, missiles: 99 });
    } else { b.alive = true; b.model.visible = true; b.pos.copy(home); b.missiles = 99; Object.assign(b.ai, { target: null, goal: null, think: 0, lastHit: null }); }
    b.name = "중앙 보스 · 타이탄"; b.hp = b.maxHp = 4200 + 300 * this.size;
    b.model.position.copy(b.pos);
    this.net.shareBoss(b);
    this.s.game.sound.play("warn");
    this._hint("중앙 보스 출현! — 잡으면 팀 전체 60초 강화", "#ff4ad6", 8);
  }

  // ── 봇 판단 (전투 시스템이 0.2~0.4초마다 부른다) ──
  _botGoal(a) {
    if (a.isMinion) return this._minionAI(a);
    if (a.isNeutral) return this._neutralAI(a);
    if (a.isHero) { const g = this._heroAI(a); if (g) a.ai.target = null; return g; }
    return null;
  }
  _foe(a, o) { return o.alive && o.targetable && o.team !== a.team && o.team !== 2 && !o.invulnerable; }
  // 교전: 표적을 정하고, 서로 쫓다가 하늘 끝까지 올라가지 않게 높이 차이를 표적 높이에 따라 줄인다
  _engage(a, t) { a.ai.target = t; a.ai.los = this.combat._vis(a.pos, t, 1.5); a.ai.goal = null; if (!a.isNeutral) a.ai.altOff = clamp(24 - t.pos.y, -16, t.static ? -2 : 5); return null; }
  _minionAI(a) {
    let best = null, bs = 1e9;
    for (const o of this.combat.actors) {
      if (!this._foe(a, o)) continue;
      let d = a.pos.distanceTo(o.pos);
      if (d > (o.static ? 48 : 40)) continue;
      if (o.kind === "core" && !this._front(this.teams[o.team], a.pos)) continue;   // 코어는 진입로 정면에서만
      if (o.isHero) d *= 1.8; else if (o.static) d *= 1.2;
      if (d < bs) { bs = d; best = o; }
    }
    if (best) return this._engage(a, best);
    a.ai.target = null;
    const path = this.paths[a.lane], dir = a.team ? -1 : 1;
    let p = path[a.wp];
    while (p && Math.hypot(p.x - a.pos.x, p.z - a.pos.z) < 16) { a.wp += dir; p = path[a.wp]; }
    if (!p) { const foe = this.teams[1 - a.team], core = foe.core; return (a.goal2 || (a.goal2 = new THREE.Vector3())).copy(this._front(foe, a.pos) ? core.pos : foe.approach); }   // 라인 끝 → 진입로 앞 → 코어
    return (a.goal2 || (a.goal2 = new THREE.Vector3())).set(p.x, LANE_Y + (a.aid % 3) * 1.5, p.z);
  }
  _neutralAI(a) {
    const cp = a.camp, k = cp.aggro, R = a.isBoss ? BOSS_LEASH : LEASH;
    if (cp.hunt != null && !a.isBoss) {   // 보복: 표적 진영으로 날아가 타워·드론을 친다
      const t = this._wTarget(cp.hunt, a.pos);
      if (t) { if (t.pos.distanceTo(a.pos) < 55) return this._engage(a, t); a.ai.target = null; return (a.goal2 || (a.goal2 = new THREE.Vector3())).copy(t.pos).setY(Math.max(t.pos.y + 10, 16)); }
    }
    if (k && cp.aggroT > 0 && k.alive && k.targetable && k.pos.distanceTo(a.home) < R) return this._engage(a, k);
    a.ai.target = null;
    if (a.pos.distanceTo(a.home) < 10) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.06);   // 쫓던 적을 놓치면 제자리로 돌아가 서서히 회복
    return a.home;
  }
  _heroAI(a) {
    const D = a.aos, t = this.teams[a.team], foe = this.teams[1 - a.team], c = this.combat, g = D.goal;
    D.modeT -= 0.3;
    // 기지: 회복·정비
    if (this.inBase(a)) { this._botShop(a); if (D.mode === "retreat" && a.hp > a.maxHp * 0.92) D.mode = "lane"; }
    if (a.hp < a.maxHp * 0.3 && D.mode !== "retreat" && !this.inBase(a)) D.mode = "retreat";
    if (D.mode === "retreat") {
      a.ai.target = null;
      if (!(D.recall > 0) && a.pos.distanceTo(t.pad) > 160 && !this._nearest(a, (o) => o.isHero && this._foe(a, o), 70)) this.startRecall(a);
      return D.recall > 0 ? g.copy(a.pos) : g.copy(t.pad).setY(10);
    }
    // 침입 경보: 불려 온 봇은 기지 안의 적 드론부터 (귀환 중이면 기다린다)
    if (D.defendT > 0) {
      D.defendT -= 0.3;
      const x = t.intruder;
      if (x && x.alive && this._inBaseOf(t, x)) {
        if (x.pos.distanceTo(a.pos) < 90) return this._engage(a, x);
        return D.recall > 0 ? g.copy(a.pos) : g.copy(x.pos).setY(Math.max(16, x.pos.y));
      }
      if (!(t.alarmT > 0)) D.defendT = 0;
    }
    // 가까운 적 드론은 언제나 상대한다 (도망치는 적은 멀리 쫓지 않는다)
    const near = this._nearest(a, (o) => o.isHero && this._foe(a, o), 55, (o, d) => d * (0.6 + o.hp / o.maxHp));
    // 팀 보스 호출
    if (t.bossCallT > 0 && this.boss && this.boss.alive) {
      if (near && near.pos.distanceTo(a.pos) < 40) return this._engage(a, near);
      const b = this.boss;
      if (b.pos.distanceTo(a.pos) < 75) { b.camp.aggro = b.camp.aggro || a; b.camp.aggroT = Math.max(b.camp.aggroT, 3); return this._engage(a, b); }
      return g.copy(b.home).setY(14);
    }
    if (near) return this._engage(a, near);
    // 숨은 상자: 가까우면 먼저
    if (PART_KEYS.some((p) => !D.parts[p])) {
      const k = this.caches.filter((x) => x.active).sort((x, y) => x.pos.distanceTo(a.pos) - y.pos.distanceTo(a.pos))[0];
      if (k && k.pos.distanceTo(a.pos) < (D.role === "roam" ? 170 : 90)) return g.copy(k.pos);
    }
    // 정글
    if (D.mode === "jungle") {
      const cp = D.camp;
      if (!cp || !cp.alive || D.modeT <= 0) D.mode = "lane";
      else {
        const m = cp.members.filter((x) => x.alive).sort((x, y) => x.pos.distanceTo(a.pos) - y.pos.distanceTo(a.pos))[0];
        if (m && m.pos.distanceTo(a.pos) < 70) { if (cp.aggroT <= 0) { cp.aggro = a; cp.aggroT = 4; } return this._engage(a, m); }
        return g.copy(cp.home);
      }
    }
    if ((D.jungleT -= 0.3) <= 0) {
      D.jungleT = (D.role === "roam" ? 35 : 80) + Math.random() * 35;   // 캠프도 팀 전장 점수(+1)라 자주 들른다
      const cp = this.camps.filter((x) => x.alive && (x.d.side === a.team || D.role === "roam")).sort((x, y) => x.home.distanceTo(a.pos) - y.home.distanceTo(a.pos))[0];
      if (cp && cp.home.distanceTo(a.pos) < 320) { D.mode = "jungle"; D.camp = cp; D.modeT = 40; return g.copy(cp.home); }
    }
    // 라인: 가장 앞선 아군 미니언 뒤를 따라가며 적 미니언·타워를 친다
    const push = t.pushT > 0 && D.mode === "lane", lane = push ? t.pushLane : D.lane, path = this.paths[lane];
    let front = null, fp = -1;
    for (const m of this.minions) if (m.alive && m.team === a.team && m.lane === lane) { const pr = a.team ? path.length - m.wp : m.wp; if (pr > fp) { fp = pr; front = m; } }
    const tw = foe.towers.find((x) => x.alive && x.lane === lane && !x.invulnerable) || null;
    // 노출된 코어: 기지 방어 포탑부터 (진입로 어귀 → 뒤 방벽 위), 다 무너지면 코어
    const core = foe.core.alive && !foe.core.invulnerable ? this._pickDef(foe, a) || foe.core : null;
    // 공성: 아군 미니언이 타워를 맞아 주고 있으면 타워부터
    for (const s of [tw, core]) if (s && a.hp > a.maxHp * 0.45 && s.pos.distanceTo(a.pos) < this._sRange(s) + 30 && this.minions.some((m) => m.alive && m.team === a.team && m.pos.distanceTo(s.pos) < this._sRange(s))) return this._siege(a, s, foe);
    const minion = this._nearest(a, (o) => o.isMinion && this._foe(a, o), 60);
    if (minion) return this._engage(a, minion);
    for (const s of [tw, core]) {
      if (!s) continue;
      const d = s.pos.distanceTo(a.pos), R = this._sRange(s);
      if (d > R + 45) continue;
      const tank = this.minions.some((m) => m.alive && m.team === a.team && m.pos.distanceTo(s.pos) < R);
      const mates = push && this.heroes.filter((o) => o !== a && o.alive && o.team === a.team && o.pos.distanceTo(s.pos) < R + 40).length >= 1;
      const busy = s.aosDef ? s.defTarget && s.defTarget !== a : s.ai && s.ai.target && s.ai.target !== a;
      if (tank || busy || (a.hp > a.maxHp * (s === core ? 0.45 : 0.6) && mates)) return this._siege(a, s, foe);
      return g.copy(s.pos).sub(a.pos).setY(0).normalize().multiplyScalar(-(R + 12 - d)).add(a.pos).setY(LANE_Y + 4);   // 사거리 밖으로 물러선다
    }
    // 몰아치기 중인데 앞선 미니언이 없으면 표적 구조물 사거리 바로 밖까지 함께 간다
    if (push && (tw || core) && (!front || front.pos.distanceTo((tw || core).pos) > a.pos.distanceTo((tw || core).pos))) {
      const s = tw || core, R = this._sRange(s) + 14;
      return g.copy(a.pos).sub(s.pos).setY(0).normalize().multiplyScalar(R).add(s.pos).setY(LANE_Y + 6);
    }
    if (front) return g.copy(front.pos).sub(_v.copy(front.vel).setY(0).normalize().multiplyScalar(14)).setY(LANE_Y + 3 + (a.aid % 4));
    // 아군 미니언이 없으면 내 라인의 가장 앞 아군 타워 곁에서 기다린다
    const mine = t.towers.filter((x) => x.alive && x.lane === lane).sort((x, y) => (x.tier === "outer" ? -1 : 1))[0];
    if (mine) return g.copy(mine.pos).setY(LANE_Y + 6).add(_v.copy(foe.base).sub(t.base).setY(0).normalize().multiplyScalar(30));
    return g.copy(path[a.team ? path.length - 3 : 2]).setY(LANE_Y + 4);
  }
  // 구조물 공성 거리 (봇 판단용): 타워 · 코어 · 기지 방어 포탑
  _sRange(s) { return s.kind === "core" ? CORE_RANGE : s.aosDef ? 64 : TOWER_RANGE; }
  _pickDef(foe, a) {
    let best = null, bs = 1e9;
    for (const x of foe.defs) if (x.alive && !x.invulnerable) { const sc = x.pos.distanceTo(a.pos) + (x.defK === "rear" ? 60 : 0); if (sc < bs) { bs = sc; best = x; } }
    return best;
  }
  // 코어는 진입로 정면에서만 노린다: 옆·뒤에 있으면 먼저 진입로 앞으로
  _siege(a, s, foe) { if (s.kind === "core" && !this._front(foe, a.pos)) return a.aos.goal.copy(foe.approach); return this._engage(a, s); }
  _nearest(a, ok, R, score) {
    let best = null, bs = 1e9;
    for (const o of this.combat.actors) {
      if (!ok(o)) continue;
      const d = o.pos.distanceTo(a.pos);
      if (d > R) continue;
      const s = score ? score(o, d) : d;
      if (s < bs) { bs = s; best = o; }
    }
    return best;
  }

  // ── 타워·코어 ──
  _towers(dt) {
    const c = this.combat;
    for (const a of this.towers) {
      if (!a.alive) continue;
      if ((a.ai.pick -= dt) > 0) { a.ai.think = 1e9; continue; }
      a.ai.pick = 0.25; a.ai.think = 1e9;
      let best = null, bs = 1e9;
      for (const o of c.actors) {
        if (!o.alive || !o.targetable || o.team === a.team || o.team === 2 || o.static) continue;
        const d = o.pos.distanceTo(a.pos);
        if (d > TOWER_RANGE) continue;
        const s = o.isHero && o.aggroT > this.s.time ? d * 0.1 : o.isMinion ? d : d + 200;
        if (s < bs) { bs = s; best = o; }
      }
      a.ai.target = best;
    }
    for (const t of this.teams) {
      const k = t.core;
      if (!k.alive || (k.ai.cool -= dt) > 0) continue;
      const tg = this._nearest(k, (o) => o.alive && o.targetable && o.team !== k.team && o.team !== 2 && !o.static && !o.isMinion, CORE_RANGE);   // 코어는 적 드론만 쏜다 (미니언은 타워 몫)
      k.coreTarget = tg;
      if (!tg) { k.ai.cool = 0.4; continue; }
      k.ai.cool = 0.45;
      _v.copy(tg.pos).addScaledVector(tg.vel, tg.pos.distanceTo(k.pos) / 120).sub(k.pos).normalize();
      _w.copy(k.pos).addScaledVector(_v, 7.5);
      c.fireLaser(k, _w, _v, 8, t.id ? 0xff6050 : 0x66b8ff, 120);
      this.s.fx.muzzle(_w, _v, t.id ? 0xff6050 : 0x66b8ff, 3);
    }
  }

  // ── 피해·격추 ──
  _onDamage(a, amt, k) {
    const now = this.s.time;
    if (k && k.aosTower) a.hp -= amt * (a.isMinion ? 0.15 : 0.6);             // 타워 탄은 드론에게 아프다
    if (k && k.kind === "core") a.hp -= amt * 0.4;
    if (k && (a.aosTower || a.aosDef || a.kind === "core") && (k.isMinion || (k.isHero && !k.isPlayer && !k.remote))) a.hp -= amt * (k.isMinion ? 2 : 1);
    if (k && k.isHero && (a.aosDef || a.kind === "core") && k.team !== a.team) k.baseAggro = now + 3;   // 기지 구조물을 쏜 적 드론은 방어 포탑이 노린다   // 공성: 미니언·봇 탄은 구조물에 더 세다 (사람 레이저는 원래 강하다)
    if (a.aos) a.aos.hurtT = now;
    if (a.aos && k && k.isHero && k.team !== a.team) {
      a.aos.dmgBy.set(k, now);
      if (this.towers.some((t) => t.alive && t.team === a.team && t.pos.distanceTo(k.pos) < TOWER_RANGE)) k.aggroT = now + 2.5;   // 타워 밑에서 아군을 쏜 적
    }
    if (a.dmgBy && k && k.isHero) a.dmgBy.set(k, now);
    if ((a.aosTower || a.aosDef || a.kind === "core") && k && k.aos) k.aos.towerDmg += amt;
    if (a.isNeutral && k && k.team !== 2) { a.camp.aggro = k; a.camp.aggroT = 6; }
  }
  _credit(victim, k) {
    if (k && k.isHero) return k;
    const by = victim.aos ? victim.aos.dmgBy : victim.dmgBy;
    let best = null, bt = this.s.time - 10;
    if (by) for (const [h, t] of by) if (t > bt && h.team !== victim.team) { bt = t; best = h; }
    return best;
  }
  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (!this.authority) { if (a.isPlayer) { a.respawnT = this.respawnTime(); a.aos.killedBy = k ? k.name : null; } return; }   // 클라이언트: 점수는 호스트가 센다
    this.net.died(a);
    if (a.isMinion) {
      const cr = k && k.isHero ? k : null, team = k ? k.team : -1;
      if (cr) this._give(cr, PTS.minion);
      if (team === 0 || team === 1) for (const o of this.heroes) if (o !== cr && o.alive && o.team === team && o.pos.distanceTo(a.pos) < 70) this._give(o, PTS.minionShare);
      return;
    }
    if (a.isNeutral) {
      if (!k || k.team === 2) return;
      if (a.isBoss) {
        const t = this.teams[k.team];
        for (const o of this.heroes) if (o.team === k.team) this._give(o, PTS.boss);
        t.buffT = BUFF_T; for (const o of this.heroes) if (o.team === k.team) this._applyStats(o);
        this.bossT = BOSS_RE;
        this._score(k.team, SCORE.boss, "중앙 보스");
        h.feed(`${t.name} ▸ 중앙 보스 처치`, t.css);
        h.toast(k.team === me.team ? `보스 처치! 아군 60초 강화 (피해 +25% · 회복)  +${PTS.boss}ⓟ` : `${t.name}이 보스를 처치했습니다 — 60초 강화`, k.team === me.team ? "#ff4ad6" : "#ff8a7a", 2.4, 22);
        this.s.game.sound.play("bigkill");
        return;
      }
      const st = a.wStage ?? 1, cr = this._credit(a, k), pts = (a.elite ? W_ELITE : W_PTS)[st];
      { const tm = cr ? cr.team : k.team; if ((tm === 0 || tm === 1) && a.camp) { const g = a.camp.grudge || (a.camp.grudge = [0, 0]); g[tm] += pts; } }   // 감시자가 기억하는 원한
      if (a.camp && a.camp.members && !a.camp.members.some((m) => m !== a && m.alive)) { const tm = cr ? cr.team : k.team; if (tm === 0 || tm === 1) this._score(tm, SCORE.camp, "감시자 캠프"); }
      if (cr) { this._give(cr, pts); for (const o of this.heroes) if (o !== cr && o.alive && o.team === cr.team && o.pos.distanceTo(a.pos) < 80) this._give(o, pts / 2); }
      if (cr === me) h.toast(`${a.name}  +${pts}ⓟ`, "#c8a0ff", 1, 18);
      return;
    }
    if (a.isHero) {
      a.respawnT = this.respawnTime();
      const cr = this._credit(a, k), t = cr ? this.teams[cr.team] : k && k.team < 2 ? this.teams[k.team] : null;
      a.aos.killedBy = k ? k.name : cr ? cr.name : null;
      if (t) { t.kills++; this._score(t.id, SCORE.kill, "격추"); }
      if (cr) {
        this._give(cr, PTS.kill); cr.aos.hk++;
        for (const [o, tm] of a.aos.dmgBy) if (o !== cr && o.team === cr.team && tm > this.s.time - 10) { this._give(o, PTS.assist); o.aos.assists++; if (o === me) h.toast(`도움  +${PTS.assist}ⓟ`, "#9fd8ff", 1, 18); }
        h.feed(`${cr.name} ▸ ${a.name}`, cr === me ? "#ffd24a" : a === me ? "#ff6b5a" : TEAM_CSS[cr.team]);
        if (cr === me) h.toast(`${a.name} 격추  +${PTS.kill}ⓟ`, "#ffd24a", 1.2, 20);
      } else h.feed(`${a.name} 격추됨`, "#cfd8e3");
      a.aos.dmgBy.clear();
      if (!a.isPlayer) { a.aos.mode = "lane"; a.aos.modeT = 0; }
      return;
    }
    if (a.aosDef) {
      if (this.winner >= 0) return;
      const foe = this.teams[1 - a.team], cr = this._credit(a, k);
      for (const o of this.heroes) if (o.team === foe.id) this._give(o, PTS.def);
      if (cr) this._give(cr, PTS.towerLast);
      this._score(foe.id, SCORE.def, "방어 포탑");
      if (a.bubble) { this.s.world.scene.remove(a.bubble); a.bubble = null; }
      h.feed(`${foe.name} ▸ ${a.name} 파괴`, foe.css);
      h.toast(a.team === me.team ? "아군 기지 방어 포탑이 무너졌습니다" : `기지 방어 포탑 파괴!  +${PTS.def}ⓟ`, a.team === me.team ? "#ff8a7a" : "#ffd24a", 1.8, 20);
      this.s.game.sound.play(a.team === me.team ? "warn" : "bigkill", 0.7);
      return;
    }
    if (a.aosTower) {
      if (this.winner >= 0) return;   // 코어가 무너지며 함께 꺼진 타워
      const team = this.teams[a.team], foe = this.teams[1 - a.team], cr = this._credit(a, k);
      team.lost++;
      this._score(foe.id, SCORE.tower, "타워");
      for (const o of this.heroes) if (o.team === foe.id) this._give(o, PTS.tower);
      if (cr) this._give(cr, PTS.towerLast);
      if (a.bubble) { this.s.world.scene.remove(a.bubble); a.bubble = null; }
      h.feed(`${foe.name} ▸ ${a.name} 파괴`, foe.css);
      h.toast(a.team === me.team ? `${a.name}가 무너졌습니다` : `${a.name} 파괴!  +${PTS.tower}ⓟ`, a.team === me.team ? "#ff8a7a" : "#ffd24a", 2, 22);
      this.s.game.sound.play(a.team === me.team ? "warn" : "bigkill");
      if (a.tier === "outer") { const inn = team.towers.find((x) => x.lane === a.lane && x.tier === "inner"); if (inn && inn.alive) this._unshield(inn); }
      else if (team.core.invulnerable) {
        this._openCore(team);
        this._hint(a.team === me.team ? "아군 코어 노출! 기지를 지키세요" : `${team.name} 코어 노출 — 코어를 공격하세요!`, a.team === me.team ? "#ff6b5a" : "#35ff7a", 8);
      }
      return;
    }
    if (a.kind === "core") {
      this.winner = 1 - a.team; this.endT = 3.5; this.why = "core";
      for (const o of this.combat.actors) if (o.team === a.team && o.alive && (o.aosTower || o.aosDef || o.isMinion)) this.combat.kill(o, null);
      h.toast(a.team === me.team ? "아군 코어 파괴…" : `${a.name} 파괴! 승리!`, a.team === me.team ? "#ff6b5a" : "#35ff7a", 3, 34);
      this.s.slowMo(1.4, 0.25, 0.5);
    }
  }

  // 팀 전장 점수 (호스트·오프라인만 센다 → 호스트 필드 "a" 로 클라이언트에). 목표에 먼저 닿으면 즉시 승리
  _score(team, n, what) {
    if (!this.authority || this.winner >= 0 || this.state === "done") return;
    const t = this.teams[team];
    if (!t) return;
    t.score += n;
    if (t.score < this.goal) return;
    t.score = Math.max(t.score, this.goal);
    this.winner = team; this.why = "score"; this.endT = 3;
    const mine = team === this.me.team;
    this.s.hud.toast(this.spectator ? `${t.name} 목표 점수 ${this.goal} 달성!` : mine ? `목표 점수 ${this.goal} 달성! 승리!` : `${t.name}이 목표 점수 ${this.goal}에 닿았습니다…`, mine || this.spectator ? "#35ff7a" : "#ff6b5a", 3, 32);
    this.s.slowMo(1.2, 0.35, 0.5);
    void what;
  }

  _alert(key, txt, col, every, at) {
    const now = this.s.time;
    if ((this.alerts[key] || -99) > now) return;
    this.alerts[key] = now + every;
    this._hint(txt, col, 4, at ? at.pos : null);
  }
  _hint(txt, col, dur, pos = null) { this.hint = { txt, col, t: dur, dur, pos }; }
  // 공격받는 아군 구조물(타워·코어) → 전장 지도 경보. 체력이 줄어든 것으로 알아채므로 클라이언트(동기화된 체력)에서도 같다
  //  구조물마다 6초에 한 번, 경보 고리는 4초. 글 알림은 타워 10초 · 코어 8초에 한 번 (더 긴 목표 알림은 덮지 않는다)
  _watchStructs(dt) {
    for (let i = this.mapAlerts.length - 1; i >= 0; i--) if ((this.mapAlerts[i].t -= dt) <= 0) this.mapAlerts.splice(i, 1);
    if (this.spectator) return;
    const now = this.s.time, t = this.teams[this.me.team];
    for (const a of [t.core, ...t.towers, ...t.defs]) {
      const prev = a._hp0 ?? a.hp; a._hp0 = a.hp;
      if (!a.alive || a.hp >= prev - 0.5 || (a._alertT || -99) > now) continue;
      a._alertT = now + 6;
      const core = a.kind === "core";
      this.mapAlerts.push({ x: a.pos.x, z: a.pos.z, t: 4, dur: 4, core });
      if (this.hint && this.hint.dur > 4 && this.hint.t > 1.5) continue;
      this._alert(core ? "core" : a.aosDef ? "def" : "tw", core ? "아군 코어 공격받는 중!" : `${a.name.replace(t.name, "아군")} 공격받는 중`, "#ff6b5a", core ? 8 : 10, a);
    }
  }

  // ── 매 프레임 ──
  // 온라인 일시정지 중에도 세계는 돌지만 조종은 막는다
  get locked() { return super.locked || (this.ng.online && this.s.game.state === "pause"); }
  _lod() {
    const cam = this.s.camera.position;
    if (SW.far.list.length) { const live = new Set(this.combat.actors); for (const a of [...SW.far.list]) if (!live.has(a)) SW.far.remove(a); }
    for (const a of this.combat.actors) {
      if (a.isPlayer || !a.model || !(a.isHero || a.isBot || a.isPilot)) continue;
      if (a.swarmI === undefined) SW.far.add(a, TEAM_COLOR[a.team] ?? 0xffffff);
      const far = a.alive && a.pos.distanceToSquared(cam) > 170 * 170;
      if (far !== !!a.lodFar) { a.lodFar = far; a.model.visible = a.alive && !far; }
      else if (!far) a.model.visible = a.alive;
    }
  }
  update(dt) {
    if (this.shop) this.shop.update(dt);   // 기지 안에서는 아이템 키가 업그레이드 창 조작이라 전투 시스템보다 먼저
    super.update(dt);
    this.ng.update(dt); this.net.update(dt);
    // 클라이언트: 호스트 시계보다 많이 늦으면 따라잡는다
    const he = this.state === "run" ? this.ng.hostElapsed() : null;
    if (he !== null && he > this.time + 1.5) this.time = Math.min(this.duration, he);
    this._lod();
    for (const sw of this.swarms) sw.sync();
    this._fieldsFx();
    if (this.state === "countdown" || this.cut) return;
    if (this.ruleT > 0 && this.state === "run" && (this.ruleT -= dt) <= 0) { try { localStorage.setItem("fpv-aos-rules", "1"); } catch (_) { /* 저장 불가 */ } }
    if (this.hint && (this.hint.t -= dt) <= 0) this.hint = null;
    if (this.state !== "run") return;
    this._watchStructs(dt);
    this._caches(dt);
    this._recall(dt); this._hoops(dt);
    if (this.authority) this._world(dt);
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.time >= this.duration && this.endT < 0) {
      if (this.authority) { this.winner = this._timeWinner(); this._end(); }
      else if (this.time >= this.duration + 4) { this.winner = this._timeWinner(); this._end(); }   // (클라이언트는 보통 호스트의 승자·까닭을 받아 끝낸다)   // 호스트 소식이 끊겼을 때
    }
  }
  _world(dt) {
    const me = this.me;
    if ((this.waveT -= dt) <= 0) { this.waveT = this.time > 360 ? WAVE_T - 6 : WAVE_T; this._wave(); }   // 6분 뒤엔 웨이브가 더 잦다
    // 공정성: 전투 시스템은 액터 목록 순서대로 움직이고 쏘므로(뒤에 있는 쪽이 갓 움직인 표적을 노려 조금 더 잘 맞힌다) 1초마다 목록을 뒤집는다
    if ((this.flipT = (this.flipT || 0) - dt) <= 0) { this.flipT = 1; this.combat.actors.reverse(); }
    for (const cp of this.camps) {
      if (cp.hunt != null && cp.alive) for (const m of cp.members) {   // 전차·함대형: 집 좌표를 표적 진영 쪽으로 옮겨 진군
        if (!m.alive || !m.wUnit) continue;
        const t = this._wTarget(cp.hunt, m.pos), h = m.wUnit.home;
        if (!t) continue;
        _v.copy(t.pos).sub(h).setY(0);
        const L = _v.length(), sp = (m.wStage === 0 ? 5 : 8) * dt;
        if (L > 25) { h.addScaledVector(_v.normalize(), Math.min(sp, L - 25)); h.y = this.s.world.h(h.x, h.z); }
      }
      if (cp.aggroT > 0) cp.aggroT -= dt;
      if (cp.alive) { if (!cp.members.some((m) => m.alive)) { cp.alive = false; cp.t = CAMP_RE; } }
      else if ((cp.t -= dt) <= 0) this._spawnCamp(cp);
    }
    if (this.boss && this.boss.alive) { if (this.boss.camp.aggroT > 0) this.boss.camp.aggroT -= dt; }
    else if ((this.bossT -= dt) <= 0) { this.bossT = BOSS_RE; this._spawnBoss(); }
    this._towers(dt);
    this._intrusion(dt); this._defs(dt);
    // 팀: 보스 강화 시간, 봇들의 보스 호출
    for (const t of this.teams) {
      if (t.buffT > 0 && (t.buffT -= dt) <= 0) for (const o of this.heroes) if (o.team === t.id) this._applyStats(o);
      if (t.bossCallT > 0) t.bossCallT -= dt;
      if ((t.callEval -= dt) <= 0) {
        t.callEval = 15;
        const alive = this.heroes.filter((o) => o.team === t.id && o.alive && !o.isPlayer && o.hp > o.maxHp * 0.6).length;
        // 보스는 팀 전장 점수 +5 · 강화: 점수에서 밀리면 더 적극적으로
        const behind = t.score < this.teams[1 - t.id].score ? 0.15 : 0;
        if (this.boss && this.boss.alive && alive >= Math.min(3, this.size) && Math.random() < (this.cfg.difficulty === "hard" ? 0.7 : 0.55) + behind) t.bossCallT = 40;
      }
      // 한 라인 몰아치기: 보스 강화 중이거나, 살아 있는 수가 앞서거나, 가끔 무작위로 — 가장 약한 적 타워가 있는 라인에 모인다
      if (t.pushT > 0) t.pushT -= dt;
      if ((t.pushEval -= dt) <= 0) {
        const n = (id) => this.heroes.filter((o) => o.team === id && o.alive && o.targetable !== false).length, foe = this.teams[1 - t.id], open = !foe.core.invulnerable;
        t.pushEval = (open ? 20 : 40) + Math.random() * 30;
        const race = this.goal - Math.max(t.score, foe.score) <= 15;   // 누가 목표 점수에 가까우면 타워(+5)를 노려 몰아친다
        if (t.buffT > 10 || n(t.id) - n(foe.id) >= 2 || Math.random() < (open || race ? 0.7 : 0.4)) {
          const score = (ln) => { const ws = foe.towers.filter((x) => x.lane === ln && x.alive); return ws.length * 2 + ws.reduce((q, x) => q + x.hp / x.maxHp, 0) + Math.random() * 0.8; };
          t.pushLane = Object.keys(this.paths).sort((x, y) => score(x) - score(y))[0]; t.pushT = 45;
        }
      }
    }
    // 영웅: 초당 포인트·회복
    const pass = PTS.passive * dt;
    for (const a of this.heroes) {
      if (a.targetable === false) continue;
      this._give(a, pass);
      if (!a.alive) continue;
      let rg = (a.aos.parts.cell ? 3 : 0) + (this.teams[a.team].buffT > 0 ? 4 : 0);
      if (this.onPad(a)) rg += a.maxHp * 0.12;
      if (rg > 0 && a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + rg * dt);
    }
    void me;
  }
  // ── 기지 귀환: 4초 동안 버티면 정비 패드로 (맞으면 취소) ──
  startRecall(a) {
    if (!a.alive || this.inBase(a) || a.aos.recall > 0) return;
    a.aos.recall = 4; a.aos.recallAt = this.s.time;
    if (a === this.me) { this.s.hud.toast("기지 귀환 중… 4초 (맞으면 취소)", "#8cff4a", 1.4, 20); this.s.game.sound.play("shieldup"); }
  }
  _recall(dt) {
    for (const a of this.heroes) {
      const D = a.aos;
      if (a.remote || !(D.recall > 0)) continue;
      if (!a.alive || (D.hurtT || -1) > D.recallAt) { D.recall = 0; if (a === this.me && a.alive) this.s.hud.toast("귀환 취소", "#ff8a7a", 1, 18); continue; }
      if ((this._rfx = (this._rfx || 0) - dt) <= 0 && a.pos.distanceTo(this.s.camera.position) < 200) { this._rfx = 0.25; this.s.fx.ring(a.pos, 0x8cff4a, 3 + (4 - D.recall), 0.3); }
      if ((D.recall -= dt) > 0) continue;
      D.recall = 0;
      const sp = this._spawn(a);
      this.s.fx.ring(a.pos, 0x8cff4a, 8, 0.4);
      if (a.isPlayer) this.s.player.respawn(sp.pos, sp.yaw); else { a.pos.copy(sp.pos); a.vel.set(0, 0, 0); a.model.position.copy(a.pos); }
      this.s.fx.ring(sp.pos, 0x8cff4a, 8, 0.4);
      if (a === this.me) this.s.game.sound.play("lap");
    }
  }
  _hoops(dt) {
    if ((this.hoopT -= dt) > 0) return;
    this.hoopT = 0.1;
    for (const a of this.heroes) {
      if (!a.alive || a.remote || a.targetable === false || a.boostT > 1.5) continue;
      for (const q of this.hoops) if (q.team === a.team && a.pos.distanceToSquared(q.pos) < 110) { a.boostT = 3; if (a === this.me) { this.s.game.sound.play("boost", 0.7); this.s.fx.ring(q.pos, 0x3ff0ff, 11, 0.35); } break; }
    }
  }
  // R: 기지 귀환 (기지 안·뒤집혔을 때는 원래처럼 기체를 바로 세운다)
  onReset() {
    const b = this.s.player.body;
    if (this.spectator || !this.me.alive) return;
    if (this.inBase(this.me) || (b.flipped && b.onGround) || this.state !== "run") return super.onReset();
    this.startRecall(this.me);
  }
  // 시간 종료: 전장 점수 → 부순 타워 수 → 코어 체력 → 무승부 (this.why 도 정한다)
  _timeWinner() {
    const [a, b] = this.teams;
    if (a.score !== b.score) { this.why = "time"; return a.score > b.score ? 0 : 1; }
    this.why = "tie";
    if (a.lost !== b.lost) return a.lost < b.lost ? 0 : 1;
    const ha = a.core.hp / a.core.maxHp, hb = b.core.hp / b.core.maxHp;
    if (Math.abs(ha - hb) > 0.001) return ha > hb ? 0 : 1;
    this.why = "draw";
    return -1;
  }
  whyCode() { return Math.max(0, WHY_CODE.indexOf(this.why)); }
  setWhy(n) { this.why = WHY_CODE[n | 0] || this.why; }

  _end() {
    if (this.state === "done") return;
    const me = this.me, my = me.team, win = this.winner === my, draw = this.winner < 0;
    const rows = [...this.heroes].sort((x, y) => x.team - y.team || y.aos.earned - x.aos.earned).filter((o) => o.targetable !== false)
      .map((o) => ({ name: `${o.team ? "홍" : "청"} ${o === me ? "나" : o.name.replace(/^[청홍] · /, "")}`, me: o === me, vals: [`${o.aos.hk}/${o.deaths}/${o.aos.assists}`, Math.round(o.aos.towerDmg), Math.round(o.aos.earned), UP_KEYS.map((k) => o.aos.up[k]).join("·")] }));
    const sc = Math.round(me.aos.earned), rec = this.spectator || this.pvp ? false : submitRecord(this.recKey, sc);
    if (this.P && this.P.client && this.cfg.net) this.P.client.matchOver(this.P.mid);
    const [A, B] = this.teams;
    if (!this.why) this.why = draw ? "draw" : "time";
    const why = WIN_WHY[this.why] || "", wt = this.teams[this.winner];
    const how = draw ? why : this.spectator ? `${wt.name} 승리 · ${why}` : why;
    this.finish({
      title: draw ? "무승부" : this.spectator ? `${wt.name} 승리` : win ? "승리!" : "패배", sub: `${how} · 기지전 · ${fmtTime(Math.min(this.time, this.duration))}`, win: draw ? undefined : win, record: rec, stars: win ? 3 : draw ? 1 : 0,
      board: { cols: ["격추·피격·도움", "구조물", "ⓟ", "강화"], rows },
      pvp: this.P && this.cfg.net ? { auto: !!this.P.auto, code: this.P.code } : undefined,
      lines: [
        { label: "승리 조건", value: how },
        { label: "전장 점수", value: `청 ${A.score} : ${B.score} 홍 (목표 ${this.goal})` },
        { label: "팀 격추", value: `청 ${A.kills} : ${B.kills} 홍` }, { label: "부순 타워", value: `청 ${B.lost} : ${A.lost} 홍` },
        { label: "코어 체력", value: `청 ${Math.round(100 * A.core.hp / A.core.maxHp)}% · 홍 ${Math.round(100 * B.core.hp / B.core.maxHp)}%` },
        { label: "내 전장 포인트", value: `${sc}ⓟ` }, { label: "최고 기록", value: `${records[this.recKey] || sc}ⓟ` },
      ],
    });
  }

  missionObjective(o) {
    const me = this.me, foe = this.teams[1 - me.team];
    if (me.hp < me.maxHp * 0.3 && !this.inBase(me)) { o.pos = _v.copy(this.teams[me.team].pad).setY(6); o.label = "기지로 귀환"; o.color = "#8cff4a"; return o; }
    const list = [...foe.towers.filter((x) => x.alive && !x.invulnerable), ...foe.defs.filter((x) => x.alive && !x.invulnerable), ...(foe.core.alive && !foe.core.invulnerable ? [foe.core] : [])];
    let best = null, bd = 1e9;
    for (const x of list) { const d = x.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = x; } }
    if (!best) return null;
    o.pos = best.pos; o.label = best.name; o.color = foe.css;
    return o;
  }

  hud(h) { drawAosHud(this, h); }

  // ── 네트워크: 스냅숏 ──
  snapshot() {
    const r = (x) => Math.round(x * 10) / 10, out = { v: 1, t: Math.round(this.time * 10) / 10, w: this.wave };
    out.tm = this.teams.map((t) => [t.kills, t.lost, Math.round(t.buffT), t.score]);
    out.g = [this.goal, this.winner, this.whyCode()];
    out.st = [...this.teams.map((t) => t.core), ...this.towers, ...this.defs].map((a) => (a.alive ? Math.round(a.hp) : -1));
    out.al = this.teams.map((t) => [Math.round(t.alarmT * 10) / 10, t.alarmN]);
    out.ca = this.caches.reduce((m, k, i) => m | (k.active ? 1 << i : 0), 0);
    const mov = (a) => [a.aid, r(a.pos.x), r(a.pos.y), r(a.pos.z), Math.round(a.hp)];
    out.mn = this.minions.filter((m) => m.alive).map((m) => [...mov(m), m.team, m.heavy ? 1 : 0]);
    out.nt = [...this.camps.flatMap((c) => c.members.filter((m) => m.alive)), ...(this.boss && this.boss.alive ? [this.boss] : [])].map(mov);
    out.hb = this.heroes.filter((a) => !a.isPlayer).map((a) => [...mov(a), a.alive ? 1 : 0]);
    out.pl = this.heroes.map((a) => [a.aid, Math.round(a.aos.pts), ...UP_KEYS.map((k) => a.aos.up[k]), PART_KEYS.reduce((m, p, i) => m | (a.aos.parts[p] ? 1 << i : 0), 0)]);
    return out;
  }
  applySnapshot(s) {
    if (!s || s.v !== 1) return;
    s.tm.forEach((x, i) => { const t = this.teams[i]; if (t) { t.kills = x[0]; t.lost = x[1]; t.buffT = x[2]; t.score = x[3] | 0; } });
    if (Array.isArray(s.g)) { this.goal = s.g[0] || this.goal; this.winner = s.g[1] ?? -1; this.setWhy(s.g[2]); }
    if (s.al) s.al.forEach((x, i) => { const t = this.teams[i]; if (t && Array.isArray(x)) { t.alarmT = +x[0] || 0; t.alarmN = x[1] | 0; } });
    [...this.teams.map((t) => t.core), ...this.towers, ...this.defs].forEach((a, i) => {
      const v = s.st[i];
      if (v === undefined) return;
      if (v < 0) { if (a.alive) this.combat.kill(a, null); return; }
      a.hp = v;
      if (a.aosTower && a.invulnerable && !this.teams[a.team].towers.find((x) => x.lane === a.lane && x.tier === "outer").alive) this._unshield(a);
    });
    for (const t of this.teams) if (t.core.invulnerable && Object.keys(this.paths).some((ln) => t.towers.filter((x) => x.lane === ln).every((x) => !x.alive))) this._openCore(t);
    this.caches.forEach((k, i) => { k.active = !!(s.ca & (1 << i)); k.g.visible = k.active; });
    for (const row of s.pl || []) { const a = this.byId.get(row[0]); if (!a || !a.aos) continue; a.aos.pts = row[1]; UP_KEYS.forEach((k, j) => { a.aos.up[k] = row[2 + j]; }); PART_KEYS.forEach((p, j) => { a.aos.parts[p] = row[6] & (1 << j) ? 1 : 0; }); this._applyStats(a); }
    // 움직이는 액터(미니언·정글·봇)는 NetGame 의 공유 액터(대리 모델)로 그린다 — s.mn / s.nt / s.hb 는 그 연결이 없을 때의 대체 자료
  }
  reportHit(targetId, dmg, byId) {
    const a = this.byId.get(targetId), by = this.byId.get(byId) || null;
    if (!a || !a.alive || !this.authority) return false;
    this.combat.damage(a, clamp(+dmg || 0, 0, 600), by);
    return true;
  }

  dispose() {
    const sc = this.s.world.scene;
    if (this.shop) this.shop.dispose();
    this.ng.dispose();
    for (const m of this.bubbles) sc.remove(m);
    for (const k of this.caches) sc.remove(k.g);
    for (const f of this.fields) { sc.remove(f.g); f.matF.dispose(); f.matL.dispose(); }
    if (this.fieldGeo) this.fieldGeo.forEach((g) => g.dispose());
    for (const sw of this.swarms || []) sw.dispose();
    if (this.bubGeo) { this.bubGeo.dispose(); this.bubMat.forEach((m) => m.dispose()); }
    if (this.cacheGeo) { this.cacheGeo.dispose(); this.cacheRing.dispose(); this.cacheMat.dispose(); this.cacheMat2.dispose(); }
    super.dispose();
  }
}

// 꺾은선을 step m 간격 점들로 (y = 라인 비행 높이)
function densify(pts, step) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push(new THREE.Vector3(ax + (bx - ax) * k / n, LANE_Y, az + (bz - az) * k / n));
  }
  const e = pts[pts.length - 1];
  out.push(new THREE.Vector3(e[0], LANE_Y, e[1]));
  return out;
}

registerMode("aos", AosMode);
registerPvpMode("aos", { name: "기지전", en: "BASE WARS", icon: "🏯", desc: "세 라인을 밀어 상대 본진을 부수거나, 목표 전장 점수에 먼저 닿거나, 시간 종료 때 점수가 앞서면 승리. 미니언·타워·감시자·보스, 경기 내 업그레이드", session: "aos",
  teams: true, teamCounts: [2], maps: ["stadium"], time: [480, 720, 900], goal: GOALS, goalDef: GOAL_DEF, random: false });
