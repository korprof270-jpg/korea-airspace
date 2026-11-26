// 돌파 작전: 맵마다 작전 1~5 (차례로 열림). 한 작전은 한 맵 안에서 스테이지 3~5개를 이어 가며 적 본진 요새까지 간다 (서바이벌)
//  · 스토리: 맵마다 작전 브리핑 + 스테이지 이야기. 스테이지가 끝나면 다음 임무를 고른다 — 침투 · 교전 · 탈취
//    고른 임무는 지형에 맞는 다른 구역에서 (침투: 건물·지형이 빽빽한 곳 / 교전: 트인 곳 / 탈취: 적 시설). 같은 곳을 다시 쓰지 않는다
//  · 침투: 레이더 탐지권(붉은 기둥)을 낮게 피해 데이터 노드 파괴. 들키면 증원 · 교전: 적 2파 + 중간 보스 + 스테이지 보스
//    탈취: 점령 원 안에 머물러 게이지 100% · 마지막: 작전 1~3 본진 앞 결전(최종 보스), 작전 4~5 요새 공성전(포대 → 실드 발생기 → 핵심)
//  · 안내: 목표 위치에 큰 빛 기둥 + 위에서 내리꽂는 화살표 + 화면 화살표(방향·거리)
//  · 작전 3 이상 승리 → 훈장(🎖): 격납고에서 최대 단계 파츠·스킬 한계 돌파
//  · Lv1 시작, ⓟ로 화력·장갑·기동·스킬 강화 · 목숨 5개(500ⓟ로 하나 더) · 1~4인 협동(방장 기준 진행) · 혼자면 AI 윙맨 3기
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { drawCombatHud } from "../combathud.js";
import { clamp, fmtTime, submitRecord, records, save } from "../config.js";
import { PLAYER_HP } from "../combat.js";
import { registerMode } from "../session.js";
import { NetGame } from "../netgame.js";
import { UP, UP_KEYS, UP_MAX } from "./aos.js";
import { AosShop } from "./aos-hud.js";
import { BossBrain } from "./bossbrain.js";
import { buildSite, SITE_NAMES, CITADEL_TOWERS } from "./strikesites.js";
import * as GP from "../garage.js";

const mul32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const KINDS = { tank: ["tank", "tank", "lighttank", "heavytank", "missiletank"], robot: ["aa", "sniperbot", "shieldbot", "mortarbot"], ship: ["frigate", "destroyer", "destroyer"] };
const V3 = THREE.Vector3, _v = new V3();
const LIVES = 5, REST = 5, LIFE_COST = 500, LIFE_MAX = 9, REVIVE_COST = 200, PICK_T = 15;
const UP_COST = [80, 140, 220, 320, 450];
const PTS = { drone: 10, unit: 25, mid: 120, boss: 250, final: 600, clear: 100 };
// 작전 1~5: hp 적 체력 배율 · cnt 적 수 배율 · stages 스테이지 수 · medal 승리 훈장 · diff 적 조준·피해
export const OPS = [
  { n: 1, name: "선발 정찰", diff: "easy", hp: 0.8, cnt: 0.8, stages: 3, medal: 0, last: "final", boss: "twin", tag: "쉬움" },
  { n: 2, name: "보급선 차단", diff: "normal", hp: 1, cnt: 1, stages: 4, medal: 0, last: "final", boss: "titan", tag: "보통" },
  { n: 3, name: "지휘부 강습", diff: "normal", hp: 1.25, cnt: 1.15, stages: 4, medal: 1, last: "final", boss: "flag", tag: "어려움" },
  { n: 4, name: "요새 공성전", diff: "hard", hp: 1.45, cnt: 1.3, stages: 5, medal: 2, last: "siege", tag: "매우 어려움" },
  { n: 5, name: "최종 병기 저지", diff: "hard", hp: 1.7, cnt: 1.45, stages: 5, medal: 3, last: "siege", boss: "omega", tag: "지옥" },
];
export const opCleared = (mapId) => Math.max(0, Math.min(5, records[`strikeOp:${mapId}`] | 0));
const MT = {
  infil: { name: "침투", icon: "🥷", css: "#b48cff", col: 0xb48cff, desc: "레이더 탐지권을 낮게 피해 데이터 노드 파괴", sites: ["radar", "relay", "bunker"] },
  fight: { name: "교전", icon: "⚔", css: "#ff7a3a", col: 0xff7a3a, desc: "적 주력 2파 · 중간 보스 · 스테이지 보스", sites: ["flak", "armory", "power", "fuel"] },
  seize: { name: "탈취", icon: "🚩", css: "#ffd24a", col: 0xffd24a, desc: "점령 원 안에 머물러 시설 빼앗기 · 적 증원", sites: ["fuel", "mine", "dock", "power", "armory"] },
  final: { name: "결전", icon: "☠", css: "#ff3d4d", col: 0xff3d4d },
  siege: { name: "공성", icon: "🏰", css: "#ff3d4d", col: 0xff3d4d },
};
const CHOICES = ["infil", "fight", "seize"];
// 맵마다 이야기 (적이 무엇을 하고 있는지). 없으면 기본 문장
const STORY = {
  city: "네온 시티의 전력망을 장악한 적이 도시 지하에 무기 공장을 숨겼다.",
  canyon: "붉은 협곡 깊은 곳, 적이 채굴한 광석으로 거대 병기를 조립하고 있다.",
  factory: "석양의 항만이 적 함대의 보급항으로 바뀌었다. 바다 쪽 출구를 막아야 한다.",
  snow: "눈보라에 숨은 설국 산장 일대에 적 전진 기지가 들어섰다.",
  island: "화산섬의 지열로 적이 동력로를 돌리고 있다. 분화구 너머가 본진이다.",
  moon: "달 기지의 통신이 끊겼다. 적이 기지를 점령하고 궤도 포를 세우는 중이다.",
  orbit: "궤도 요새 아크라이트 안쪽 고리를 적이 차지했다. 바깥 고리부터 되찾는다.",
  empire: "기계제국 수도 한복판, 제국 근위대가 최종 병기를 깨우려 한다.",
  airbase: "비행기지 활주로가 적 손에 넘어갔다. 격납고와 관제탑을 되찾아라.",
  ail: "에일 행성 어미별 주변에 적 탐사선이 내려앉았다.",
  outpost: "붉은 협곡 전초기지가 함락됐다. 적은 이곳을 발판 삼아 진격할 생각이다.",
  vault: "제국 코어 저장고의 봉인이 풀리고 있다. 코어가 적 손에 넘어가기 전에 막아라.",
  foundry: "거신 공창에서 적 거신이 하나둘 깨어난다. 생산 라인을 멈춰야 한다.",
  spaceport: "제국 궤도 발사기지에서 적 함대가 출항 준비 중이다.",
  aildune: "유리 사막 모래 밑에서 적 기지 신호가 잡혔다.",
  ailsea: "빛 바다 위로 적 함대가 몰려든다. 해안 거점부터 차례로 무너뜨려라.",
  ailwood: "포자 숲 깊숙이 적이 둥지를 틀었다. 숲길이 좁고 시야가 짧다.",
  ailsky: "폭풍 무덤의 번개 속에 적 요새가 떠 있다.",
  frost: "설원 통신기지가 적 교란 전파를 내보내고 있다. 중계소를 하나씩 꺼라.",
};
const OP_TEXT = [
  "적 선발대가 들어왔다. 첫 방어선을 뚫고 적 본진 앞까지 정찰하라.",
  "적이 맵 곳곳에 보급 시설을 세웠다. 보급선을 끊고 본진을 지키는 거대 병기를 쓰러뜨려라.",
  "적 지휘관이 확인됐다. 지휘 체계를 무너뜨리고 기함 '폭군'을 격침하라.",
  "적 본진 요새가 완성됐다. 방공 포대 → 실드 발생기 → 요새 핵심 순으로 요새를 함락하라.",
  "요새 안에서 최종 병기 '오메가'가 깨어난다. 요새를 무너뜨리고 오메가를 저지하라.",
];
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
const MIDS = ["gunMid", "sniperK", "msltank", "shieldK", "mortarK", "aceK", "destK"];
const BOSSES = ["turtle", "giant", "gunK", "cruiser", "carrier", "twin", "fortress"];
const MIXES = [["drone", 4], ["drone", 3, "tank", 1, "robot", 1], ["drone", 3, "ace", 1], ["tank", 2, "drone", 2], ["robot", 2, "drone", 2], ["ship", 1, "drone", 3], ["ace", 2, "jet", 1], ["jet", 2, "drone", 3]];
const SHIPS = new Set(["flagship", "carrier", "cruiser", "destroyer", "frigate"]);
const COMPASS = ["동", "북동", "북", "북서", "서", "남서", "남", "남동"];
const INFIL_FLOOR = 14;   // 레이더는 이 높이 아래를 못 본다

export class StrikeMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.op = OPS[clamp((cfg.op | 0 || 1) - 1, 0, 4)]; this.N = this.op.stages;
    this.duration = 3600; this.title = `돌파 작전 ${this.op.n} · ${this.op.name}`;
    this.recKey = `strike:${session.map.id}:op${this.op.n}`;
    this.si = -1; this.picks = ["fight"]; this.lives = LIVES; this.cleared = 0; this.kills = 0;
    this.phase = "travel"; this.list = []; this.wave = 0; this.brains = []; this.extras = [];
    this.co = cfg.coop || null;
    this.ng = new NetGame(this, cfg.net || null);
    this.auth = !this.co || !this.ng.online || this.co.host === this.ng.myId;
    this.seed = this.co ? this.co.seed : Math.floor(Math.random() * 1e9);
    this.km = new Set(); this.myBossDmg = {}; this.out = false; this.wk = -1; this.syncT = 0; this.hudN = 0;
    this.gfx = []; this.optGfx = []; this.endT = -1; this.bossDead = false; this.restT = 0; this.guideT = 0;
    this.alN = 0; this.alMine = 0; this.rfN = 0; this.cp = 0; this.stealth = 0;
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
    // 작전 구역 확장: 원래 반경 + 150~240m (지형이 있는 범위 안). 섬·우주처럼 바깥이 허공인 맵은 그대로
    if (!w.def.land) w.size = w.size + Math.min(240, Math.max(150, w.size * 0.9));
    const A = new V3(mc.blue[0], 0, mc.blue[1]);
    this.RE = w.size - 70;
    const aS = Math.atan2(A.z, A.x);
    this._rngS(7);
    // 적 본진: 출발 기지 반대편 맵 끝
    const fa = aS + Math.PI + (this.R() - 0.5) * 0.5, lim = w.size - 75;
    const fin = this._gs(clamp(Math.cos(fa) * this.RE, -lim, lim), clamp(Math.sin(fa) * this.RE, -lim, lim), 30, 14).clone();
    this.fin = fin; this.home = A.clone(); this.home.y = w.h(A.x, A.z);
    this.axis = fin.clone().sub(A).setY(0).normalize();
    this.D0 = Math.hypot(fin.x - A.x, fin.z - A.z);
    // 본진 앞 결전장 (요새 성문 앞 트인 곳)
    this.gate = this._gs(fin.x - this.axis.x * 125, fin.z - this.axis.z * 125, 30, 10).clone();
    this.siteGone = [buildSite(w, fin, "citadel", 0)];
    this.used = [this.home.clone(), fin.clone(), this.gate.clone()];
    this._cands();
    this.cur = this.home.clone();
    const sp = this._spawn(me); this.placePlayer(sp.pos, sp.yaw);
    if (!this.co || this.co.ids.length <= 1) for (let i = 0; i < 3; i++) {
      const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.4, leader: me, slot: i, name: ["윙맨 매", "윙맨 송골", "윙맨 참매"][i] });
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
    c.scatterPickups(4);
    this.shop = new AosShop(this);
    { const t = this.shop.el.querySelector("b"); if (t) t.textContent = "돌파 작전 · 업그레이드"; }
    {
      const btn = (this.lifeBtn = document.createElement("button"));
      btn.style.cssText = "display:flex;width:100%;align-items:center;gap:8px;margin:6px 0 4px;padding:8px;border-radius:8px;border:1px solid #5a2a3a;background:#2a1220;color:#fff;font:inherit;cursor:pointer;text-align:left";
      btn.innerHTML = `<span style="color:#ff6b8a;width:62px">❤ 목숨</span><span data-lv style="flex:1;color:#cfd8e6;font-size:11.5px"></span><b data-cost style="color:#ffd24a;min-width:64px;text-align:right">${LIFE_COST}ⓟ</b>`;
      btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); this.buyLife(); });
      const help = this.shop.el.querySelector("[data-help]");
      this.shop.el.insertBefore(btn, help);
      const rb = (this.reviveBtn = document.createElement("button"));
      rb.style.cssText = btn.style.cssText.replace("#5a2a3a", "#2a5a3a").replace("#2a1220", "#12261a") + ";display:none";
      rb.innerHTML = `<span style="color:#8cff4a;width:62px">🤝 구조</span><span data-lv style="flex:1;color:#cfd8e6;font-size:11.5px"></span><b style="color:#ffd24a;min-width:64px;text-align:right">${REVIVE_COST}ⓟ</b>`;
      rb.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); this.reviveMate(); });
      this.shop.el.insertBefore(rb, help);
    }
    this._brief();
    this._go(0);
  }

  // 작전 브리핑 (7초 또는 누르면 닫힘)
  _brief() {
    const m = this.s.map, o = this.op, el = (this.briefEl = document.createElement("div"));
    el.style.cssText = "position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:31;width:min(560px,92vw);padding:16px 20px;border-radius:14px;border:1px solid #35ff7a55;background:rgba(6,12,24,0.9);color:#e8f4ff;font:500 14px/1.6 'Noto Sans KR',sans-serif;pointer-events:auto;cursor:pointer;box-shadow:0 8px 40px #0008";
    el.innerHTML = `<div style="color:#35ff7a;font-weight:800;font-size:12px;letter-spacing:.08em">작전 브리핑 · ${m.name}</div>
      <div style="font-size:20px;font-weight:800;margin:4px 0 8px">작전 ${o.n} · ${o.name} <small style="font-size:12px;color:#ffb02e">${o.tag} · 스테이지 ${o.stages}</small></div>
      <div style="color:#cfd8e6">${STORY[m.id] || `${m.name}에 적이 진지를 세웠다.`}<br>${OP_TEXT[o.n - 1]}</div>
      <div style="margin-top:8px;color:#9aa8bc;font-size:12px">스테이지가 끝날 때마다 다음 임무(🥷 침투 · ⚔ 교전 · 🚩 탈취)를 고릅니다${o.medal ? ` · 승리하면 훈장 🎖${o.medal}` : ""} · 눌러서 닫기</div>`;
    const close = () => { if (this.briefEl) { this.briefEl.remove(); this.briefEl = null; } };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); close(); });
    document.body.appendChild(el);
    this.briefTo = setTimeout(close, 8000);
  }

  // 후보 지점: 맵 전체를 60m 격자로 훑어 지형 성격(건물 밀도 · 높낮이)을 매긴다. 같은 맵이면 모두 같은 결과
  _cands() {
    const w = this.s.world, RE = this.RE, out = [];
    for (let x = -RE; x <= RE; x += 60) for (let z = -RE; z <= RE; z += 60) {
      if (Math.hypot(x, z) > RE) continue;
      if (this.used.some((q) => Math.hypot(q.x - x, q.z - z) < 150)) continue;
      let blk = 0, hmin = 1e9, hmax = -1e9;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = 10 + (i % 3) * 12, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, h = w.h(px, pz); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); if (w.col.blocked(_v.set(px, h + 6, pz), 2)) blk++; }
      out.push({ p: new V3(x, w.h(x, z), z), blk, rel: hmax - hmin });
    }
    this.cands = out;
  }
  // 다음 스테이지 후보 셋 (침투·교전·탈취). 지나온 곳과 130m 넘게 떨어지고, 진행할수록 본진 쪽으로
  _options(si) {
    const from = this.cur, want = this.D0 * (1 - (si + 0.6) / this.N) + 60, taken = [], out = [];
    const fit = { infil: (c) => c.blk * 1.6 + c.rel * 0.12, fight: (c) => 6 - c.blk * 1.5 - c.rel * 0.08, seize: (c) => 3 - Math.abs(c.blk - 2) * 0.6 };
    this._rngS(4000 + si);
    const types = si === 0 ? ["fight"] : CHOICES;
    for (const type of types) {
      let best = null, bs = -1e9;
      for (let pass = 0; pass < 2 && !best; pass++) for (const c of this.cands) {
        const d = Math.hypot(c.p.x - from.x, c.p.z - from.z);
        const near = Math.min(...this.used.concat(taken).map((q) => Math.hypot(q.x - c.p.x, q.z - c.p.z)));
        if (pass === 0 && (d < 120 || d > 520 || near < 130)) continue;
        if (pass === 1 && near < 70) continue;
        const df = Math.hypot(c.p.x - this.fin.x, c.p.z - this.fin.z), sc = fit[type](c) - Math.abs(df - want) / 35 - d / 400 + this.R() * 0.6;
        if (sc > bs) { bs = sc; best = c; }
      }
      const p = best ? this._gs(best.p.x, best.p.z, 20, 8).clone() : from.clone().addScaledVector(this.axis, 150);
      const L = MT[type].sites, site = L[Math.floor(this.R() * L.length)];
      taken.push(p);
      out.push({ type, pos: p, site, name: this._name(p, site) });
    }
    return out;
  }
  _name(p, site) {
    const ang = Math.atan2(-p.z, p.x), dir = COMPASS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    return `${dir}쪽 ${SITE_NAMES[site] || "거점"}`;
  }
  _stageOf(si) {
    const o = this.op;
    if (si === this.N - 1) {
      if (o.last === "siege") return { type: "siege", pos: this.fin.clone(), name: "적 본진 요새 · 공성전", waves: [{ siege: true }].concat(o.boss ? [{ boss: o.boss, final: true, at: this.gate }] : []), final: !o.boss, last: true };
      return { type: "final", pos: this.gate.clone(), name: "적 본진 성문 앞 · 최종 결전", waves: this._fightWaves(si, o.boss), final: true, last: true };
    }
    const opts = this.optsFor === si && this.opts ? this.opts : this._options(si);
    const opt = opts.find((x) => x.type === this.picks[si]) || opts[0];
    const st = { type: opt.type, pos: opt.pos, site: opt.site, name: opt.name };
    if (opt.type === "fight") st.waves = this._fightWaves(si);
    else st.waves = [{ [opt.type]: true }];
    return st;
  }
  _fightWaves(si, finalBoss) {
    this._rngS(6000 + si);
    const o = this.op.n, R = this.R, k = (n) => Math.max(1, Math.round(n * this.op.cnt));
    const mix = () => { const m = MIXES[Math.floor(R() * MIXES.length)]; return m.map((v, i) => (i % 2 ? k(v) : v)); };
    const mid = MIDS[clamp(Math.floor((o - 1) * 1.2 + si * 0.8 + R() * 2), 0, MIDS.length - 1)];
    if (finalBoss) return [{ mid: o >= 3 ? "twin" : mid }, mix(), { boss: finalBoss, final: true }];
    const boss = BOSSES[clamp(Math.floor((o - 1) * 1.3 + si * 0.7 + R() * 1.5), 0, BOSSES.length - 1)];
    return [mix(), { mid }, mix(), { boss }];
  }
  _spawn(a) {
    const w = this.s.world, inZone = (this.phase === "fight" || this.phase === "rest" || this.phase === "choose") && this.target;
    const base = inZone ? this.target.clone().addScaledVector(this.axis, this.st && this.st.type === "siege" ? -110 : -45) : this.cur || this.home;
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
  // 500ⓟ → 목숨 +1
  buyLife() {
    const D = this.me.aos;
    if (this.lives >= LIFE_MAX) { this.s.hud.toast(`목숨은 최대 ${LIFE_MAX}개까지`, "#ffb02e", 1.2, 18); return false; }
    if (!(D.pts >= LIFE_COST)) { this.s.hud.toast(`ⓟ가 부족합니다 (${LIFE_COST}ⓟ 필요)`, "#ffb02e", 1.2, 18); this.s.game.sound.play("click"); return false; }
    D.pts -= LIFE_COST; this.lives++;
    this.s.hud.toast(`목숨 +1 (남은 목숨 ${this.lives})`, "#ff6b8a", 1.4, 22); this.s.game.sound.play("pickup");
    return true;
  }
  // 협동: 관전 중인 팀원 하나를 살린다 (그 팀원 화면에서 목숨 1개로 다시 출격)
  _downMates() { return this.co && this.ng.online ? this.ng.players().filter((p) => !p.me && this.ng.field(p.id, "out") && !(this.rvPend && this.rvPend[p.id] > this.s.time)) : []; }
  reviveMate() {
    const D = this.me.aos, list = this._downMates();
    if (!list.length) { this.s.hud.toast("관전 중인 팀원이 없습니다", "#9fb4c8", 1.2, 18); return false; }
    if (!(D.pts >= REVIVE_COST)) { this.s.hud.toast(`ⓟ가 부족합니다 (${REVIVE_COST}ⓟ 필요)`, "#ffb02e", 1.2, 18); this.s.game.sound.play("click"); return false; }
    const t = list[0];
    D.pts -= REVIVE_COST; this.rvN = (this.rvN || 0) + 1;
    (this.rvPend || (this.rvPend = {}))[t.id] = this.s.time + 4;   // 응답이 오기 전 같은 팀원을 두 번 사지 않게
    this.ng.setField("rv", [t.id, this.rvN]);
    this.s.hud.toast(`${t.name} 구조 요청 — 곧 다시 출격합니다`, "#8cff4a", 1.6, 22); this.s.game.sound.play("pickup");
    return true;
  }
  // 목숨이 다했을 때: 내 ⓟ 200으로 스스로 부활 (협동은 관전 중 언제든, 혼자는 10초 안에)
  get canSelfRevive() { return (this.out || this.reviveWait > 0) && this.me.aos.pts >= REVIVE_COST && this.state === "run" && this.endT < 0; }
  selfRevive() {
    if (!this.canSelfRevive) return false;
    this.me.aos.pts -= REVIVE_COST;
    this.reviveWait = 0;
    if (this.out) this._revived(null);
    else { const me = this.me; this.lives = 1; me.respawns = true; me.respawnT = 0.6; this.s.hud.toast("부활! 목숨 1개로 다시 출격", "#8cff4a", 2.2, 26); this.s.game.sound.play("lap"); }
    return true;
  }
  _selfReviveTick(dt) {
    if (this.reviveWait > 0 && (this.reviveWait -= dt) <= 0 && !this.out && this.lives <= 0 && this.endT < 0) this.endT = 1.5;   // 혼자: 시간 안에 부활하지 않음 → 실패
    const can = this.canSelfRevive;
    if (can && (this.s.game.input.take("item") || this.s.game.input.take("shop"))) { this.selfRevive(); return; }
    // 터치·마우스용 부활 버튼
    let b = this.revBtn;
    if (can && !b) {
      b = this.revBtn = document.createElement("button");
      b.style.cssText = "position:fixed;left:50%;bottom:22%;transform:translateX(-50%);z-index:32;padding:12px 22px;border-radius:12px;border:2px solid #8cff4a;background:rgba(10,30,16,0.92);color:#fff;font:700 16px 'Noto Sans KR',sans-serif;cursor:pointer;pointer-events:auto;touch-action:manipulation";
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this.selfRevive(); });
      document.body.appendChild(b);
    }
    if (b) { b.style.display = can ? "block" : "none"; if (can) b.textContent = `💚 ${REVIVE_COST}ⓟ로 부활${this.reviveWait > 0 ? ` (${Math.ceil(this.reviveWait)}초)` : ""} · [E]`; }
  }
  _revived(by) {
    if (!this.out) return;
    const me = this.me, pl = this.s.player;
    this.out = false; this.lives = 1; this.ng.setField("out", 0);
    me.respawns = true; me.targetable = true; me.respawnT = 0.6; pl.frozen = false;
    this.s.hud.toast(by ? `${by}님이 살려 줬습니다! 목숨 1개로 다시 출격` : "부활! 목숨 1개로 다시 출격", "#8cff4a", 2.4, 26); this.s.game.sound.play("lap");
  }
  _lifeDraw() {
    const rb = this.reviveBtn;
    if (rb) { const L = this._downMates(); rb.style.display = L.length ? "flex" : "none"; if (L.length) { rb.querySelector("[data-lv]").textContent = `${L[0].name} 살리기${L.length > 1 ? ` (관전 ${L.length}명)` : ""}`; rb.style.opacity = this.me.aos.pts >= REVIVE_COST ? "1" : "0.55"; } }
    const b = this.lifeBtn; if (!b) return;
    const can = this.me.aos.pts >= LIFE_COST && this.lives < LIFE_MAX;
    b.querySelector("[data-lv]").textContent = `지금 ${this.lives}개 · 하나 더 사기${this.lives >= LIFE_MAX ? " (최대)" : ""}`;
    b.style.opacity = can ? "1" : "0.55";
  }
  _give(n, why) { if (this.out) return; this.me.aos.pts += n; if (why) this.s.hud.toast(`${why}  +${n}ⓟ`, "#ffd24a", 1.1, 18); }

  // ── 다음 스테이지로: 큰 빛 기둥 + 내리꽂는 화살표 + 화면 화살표 · 가는 길에 서브미션 ──
  _go(si) {
    this.si = si; this.st = this._stageOf(si); this.picks[si] = this.st.type;
    this._clearGfx(); this._hideChoice();
    this.target = this.st.pos.clone();
    this.used.push(this.target.clone());
    if (this.st.site) this.siteGone.push(buildSite(this.s.world, this.target.clone().addScaledVector(_v.set(this.target.x, 0, this.target.z).normalize(), 18), this.st.site, Math.atan2(this.target.x, this.target.z)));
    this.phase = "travel"; this.guideT = 5;
    const from = this.cur.clone(), to = this.target.clone(), w = this.s.world, M = MT[this.st.type];
    this._pillar(to, M.col, true);
    if (this.st.type === "final") this._arena();
    // 서브미션: 보급 캡슐 · 적 정찰기 (씨앗으로 모두 같게)
    this._rngS(99 + si * 13);
    const k = this.R() < 0.5 ? "pods" : "scouts", items = [], c = this.combat, lat = new V3(-(to.z - from.z), 0, to.x - from.x).normalize();
    const P = (f, off) => { const p = from.clone().lerp(to, f).addScaledVector(lat, off); p.y = w.h(p.x, p.z) + 12 + this.R() * 8; return p; };
    if (k === "pods") for (let i = 0; i < 3; i++) { const p = P(0.3 + i * 0.2, (this.R() - 0.5) * 50), m = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), new THREE.MeshBasicMaterial({ color: 0x8cff4a })); m.position.copy(p); w.scene.add(m); this.gfx.push(m); items.push({ p, m }); }
    else for (let i = 0; i < 2; i++) { const p = P(0.5 + i * 0.15, (i ? 1 : -1) * 45); p.y += 10; const b = c.spawnBot({ kind: "jet", team: 1, pos: p, temp: true, name: "적 정찰기" }); if (b) { b.ai.path = [P(0.95, (i ? -1 : 1) * 70).setY(p.y), P(0.1, (i ? -1 : 1) * 50).setY(p.y)]; b.ai.pi = 0; items.push({ a: b }); } }
    const SUB = { pods: ["보급 캡슐 회수", 80], scouts: ["적 정찰기 격추", 100] };
    this.sub = { k, name: SUB[k][0], reward: SUB[k][1], items, got: 0, need: items.length, done: false };
    const lead = this.st.last ? (this.st.type === "siege" ? "적 요새가 보인다. 공성 준비." : "적 본진 성문 앞. 마지막 싸움이다.") : `${M.icon} ${M.name} 임무 — ${this.st.name}`;
    this.s.hud.toast(`STAGE ${si + 1}/${this.N} · ${lead}`, M.css, 3, 28);
    if (si > 0) this.s.game.sound.play("lap");
  }
  // 목표 위치 표시: 굵은 빛 기둥(멀리서도 보임) + 위에서 아래로 내리꽂는 큰 화살표
  _pillar(to, col, main, list = this.gfx) {
    const w = this.s.world, R = main ? 11 : 6, H = main ? 320 : 200;
    const mat = (o) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, side: THREE.DoubleSide });   // 지형에 가려도 보이게
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 20, 1, true), mat(0.26));
    beam.position.set(to.x, to.y + H / 2, to.z); beam.renderOrder = 5; w.scene.add(beam); list.push(beam);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.28, R * 0.28, H, 10, 1, true), mat(0.55));
    core.position.copy(beam.position); w.scene.add(core); list.push(core);
    const arrow = new THREE.Group(), am = mat(0.9);
    const head = new THREE.Mesh(new THREE.ConeGeometry(R * 1.1, R * 1.6, 4), am); head.rotation.x = Math.PI; arrow.add(head);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(R * 0.45, R * 2, R * 0.45), am); shaft.position.y = R * 1.7; arrow.add(shaft);
    arrow.position.set(to.x, to.y + (main ? 70 : 50), to.z); arrow.userData.y0 = arrow.position.y; arrow.userData.arrow = true;
    w.scene.add(arrow); list.push(arrow);
    if (main) { this.beamM = beam; this.arrowM = arrow; }
    return arrow;
  }
  _subTick() {
    const S = this.sub, me = this.me;
    if (!S || S.done || !me.alive) return;
    for (const it of S.items) {
      if (it.done) continue;
      if (it.a) { if (!it.a.alive) { it.done = true; S.got++; } continue; }
      it.m.rotation.y += 0.04;
      if (me.pos.distanceTo(it.p) < 5) { it.done = true; S.got++; it.m.visible = false; this.s.game.sound.play("pickup"); this.combat.give(me, "repair"); }
    }
    if (S.got >= S.need) { S.done = true; this._give(S.reward, `서브미션 성공 · ${S.name}`); this.s.game.sound.play("lap"); }
  }
  // 본진 앞 결전장: 붉은 고리·신호탑·붉은 안개
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
    this._redFog();
  }
  _redFog() { const sc = this.s.world.scene; if (!this.fog0 && sc.fog && sc.fog.color) { this.fog0 = sc.fog.color.clone(); sc.fog.color.lerp(new THREE.Color(0x3a0a10), 0.45); } }
  _dispose(list) { for (const m of list) { this.s.world.scene.remove(m); m.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } list.length = 0; }
  _clearGfx() { this._dispose(this.gfx); this.beamM = null; this.arrowM = null; this.zoneM = null; this.sent = null; this.bubble = null; }

  // ── 다음 임무 고르기 (스테이지 사이) ──
  _choose() {
    this.phase = "choose"; this.pickT = PICK_T;
    this.optsFor = this.si + 1; this.opts = this._options(this.si + 1); this.optSel = 1;
    this._dispose(this.optGfx);
    for (const o of this.opts) this._pillar(o.pos, MT[o.type].col, false, this.optGfx);
    this._showChoice();
    this.s.hud.toast(this.auth ? "다음 임무를 고르세요 — 1 · 2 · 3" : "방장이 다음 임무를 고르는 중", "#ffd24a", 2, 24);
    this.s.game.sound.play("warn");
  }
  _showChoice() {
    this._hideChoice();
    const el = (this.choiceEl = document.createElement("div"));
    el.style.cssText = "position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:31;display:flex;gap:10px;width:min(720px,94vw);pointer-events:auto";
    el.innerHTML = this.opts.map((o, i) => { const M = MT[o.type], d = Math.round(Math.hypot(o.pos.x - this.cur.x, o.pos.z - this.cur.z)); return `<button data-i="${i}" style="flex:1;min-width:0;padding:12px 10px;border-radius:12px;border:2px solid ${M.css}66;background:rgba(8,12,26,0.92);color:#fff;font:600 13px/1.45 'Noto Sans KR',sans-serif;cursor:pointer;text-align:left;touch-action:manipulation">
      <div style="color:${M.css};font-weight:800;font-size:16px">${i + 1}. ${M.icon} ${M.name}</div><div style="color:#e8f4ff">${o.name}</div><div style="color:#9aa8bc;font-size:11.5px">${M.desc}<br>${d}m 떨어짐</div></button>`; }).join("");
    el.addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; e.preventDefault(); e.stopPropagation(); this._pick(+b.dataset.i); });
    document.body.appendChild(el);
    this._keyFn = (e) => { if (this.phase !== "choose") return; const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code]; if (n !== undefined) { e.preventDefault(); this._pick(n); } };
    window.addEventListener("keydown", this._keyFn);
    this._drawChoice();
  }
  _drawChoice() {
    const el = this.choiceEl; if (!el) return;
    el.querySelectorAll("[data-i]").forEach((b, i) => { const M = MT[this.opts[i].type], on = i === this.optSel; b.style.borderColor = on ? M.css : M.css + "55"; b.style.transform = on ? "translateY(-4px)" : ""; b.style.opacity = this.auth ? "1" : "0.75"; });
  }
  _hideChoice() { if (this.choiceEl) { this.choiceEl.remove(); this.choiceEl = null; } if (this._keyFn) { window.removeEventListener("keydown", this._keyFn); this._keyFn = null; } this._dispose(this.optGfx); }
  _pick(i) {
    if (this.phase !== "choose" || !this.opts || !this.opts[i]) return;
    if (!this.auth) { this.s.hud.toast("다음 임무는 방장이 고릅니다", "#9fb4c8", 1.2, 18); return; }
    const o = this.opts[i];
    this.picks[this.si + 1] = o.type;
    this.s.hud.toast(`${MT[o.type].icon} ${MT[o.type].name} — ${o.name}`, MT[o.type].css, 2.2, 28); this.s.game.sound.play("gate");
    this.cur = this.target.clone();
    this._go(this.si + 1);
  }

  // ── 교전 ──
  _enter() {
    if (this.phase !== "travel") return;
    this._dispose(this.gfx); this.beamM = null; this.arrowM = null;
    this.phase = "fight"; this.wave = 0; this.list = [];
    if (this.sub && !this.sub.done) { for (const it of this.sub.items) if (it.a && it.a.alive) this.combat.removeActor(it.a); this.sub.done = true; }
    const T = this.st.type;
    const line = { infil: "침투 개시 — 붉은 기둥(레이더 탐지권) 안에서는 낮게! 데이터 노드를 모두 파괴", seize: "탈취 개시 — 노란 원 안에 머물러 점령 게이지를 채워라", fight: `${this.st.name} — 교전 개시`, final: "⚠ 적 본진 성문 앞 — 최종 결전", siege: "⚠ 공성전 개시 — 외곽 방공 포대부터 부숴라" }[T];
    this.s.hud.toast(line, MT[T].css, 3, 26);
    this.s.game.sound.play("warn");
    this._spawnWave(this.st.waves[0]);
  }
  _rng(extra = 0) { const r = (this.R = mul32((this.seed ^ (this.si * 7919 + this.wave * 104729 + extra * 31337)) >>> 0)); this.rr = (a, b) => a + r() * (b - a); this.rp = (L) => L[Math.floor(r() * L.length)]; }
  _rngS(x) { const r = (this.R = mul32((this.seed ^ Math.imul(x, 2654435761)) >>> 0)); this.rr = (a, b) => a + r() * (b - a); this.rp = (L) => L[Math.floor(r() * L.length)]; }
  _gs(x, z, rad, need) { return this.combat.units.groundSpot(x, z, rad, need, this.R || Math.random); }
  get lvl() { return this.op.hp * (1 + Math.max(0, this.si) * 0.06); }
  _lift(g) {
    if (!this._liftAll || !g) return;
    g.traverse((o) => { if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.emissive || o.material.blending === THREE.AdditiveBlending) return; const m = o.material.clone(); m.emissive = (o.material.vertexColors ? new THREE.Color(0x9aa6bc) : o.material.color.clone()).multiplyScalar(0.42).add(new THREE.Color(0x1a2030)); o.material = m; });
  }

  _spawnBoss(key, isBoss, final, at) {
    this._rng(); const rnd = this.rr;
    const c = this.combat, C = at || this.target, B = BOSS[key], lvl = this.lvl;
    const n = B.n || 1, out = [];
    for (let i = 0; i < n; i++) {
      let a;
      const px = C.x + this.axis.x * 30 + (i - (n - 1) / 2) * 26, pz = C.z + this.axis.z * 30 + rnd(-6, 6);
      if (B.unit) {
        const ship = SHIPS.has(B.unit), g = ship ? new V3(px, this.s.world.h(px, pz), pz) : this._gs(px, pz, 50, 6 + (B.scale || 1) * 6).clone();
        if (ship) g.y += 38;
        a = c.units.spawn(B.unit, { pos: g, near: true, home: g.clone(), hp: B.hp * lvl, scale: B.scale, rank: isBoss ? 14 + this.si : 8 + this.si, name: B.name });
        if (a) this._lift(a.unit.group);
      } else { const p = new V3(px, this.s.world.h(px, pz) + 24, pz); a = c.spawnBot({ kind: B.bot, team: 1, pos: p, temp: true, hpScale: B.hp * lvl, name: B.name, rank: isBoss ? 14 : 9 }); if (a) { a.ai.home = C; if (B.bot === "gunship") { a.model.scale.multiplyScalar(1.35); c.fitBody(a); } } }
      if (!a) continue;
      a.name = B.name + (n > 1 ? ` ${i + 1}` : "");
      if (isBoss) a.isStageBoss = true; else a.isMidBoss = true;
      if (a.unit) for (const q of a.unit.parts) { q.noTarget = true; q.bossPart = a; }
      if (final) a.stBoss = true;
      const type = B.unit ? (SHIPS.has(B.unit) ? "ship" : "ground") : "air";
      this.brains.push(new BossBrain(this, a, type, { center: C, stage: isBoss, extras: this.extras }));
      out.push(a);
    }
    if (final && this.op.n === 3) { const p = C.clone().addScaledVector(this.axis, 70); p.y = this.s.world.h(p.x, p.z) + 42; const a = c.units.spawn("cruiser", { pos: p, near: true, hp: 1.2 * lvl, rank: 16, name: "호위 순양함" }); if (a) { a.name = "호위 순양함"; a.isMidBoss = true; this.brains.push(new BossBrain(this, a, "ship", { center: C, extras: this.extras })); out.push(a); } }
    for (let i = 0; i < 2; i++) { const q = C.clone().add(new V3(rnd(-40, 40), rnd(18, 28), rnd(-40, 40))); const e = c.spawnBot({ kind: isBoss ? "ace" : "grunt", team: 1, pos: q, temp: true, hpScale: lvl }); if (e) { e.ai.home = C; out.push(e); } }
    if (out[0]) {
      if (isBoss) this.bossIntro(out[0], out[0].name, final ? `돌파 작전 ${this.op.n} · 최종 보스` : `${this.st.name} · 스테이지 보스`, false);
      else { out[0].bossBar = { name: out[0].name, mid: true }; this.s.hud.toast(`⚠ 중간 보스 · ${B.name}`, "#ff8a3a", 2, 26); this.s.game.sound.play("warn"); }
    }
    return out;
  }
  // 적 무리 (spec: [종류, 수, ...]). C 둘레 r1~r2 m, 본진 쪽에서
  _group(spec, C, r1 = 25, r2 = 70) {
    const c = this.combat, rnd = this.rr, pick = this.rp, lvl = this.lvl, out = [];
    for (let i = 0; i < spec.length; i += 2) {
      const kind = spec[i], n = spec[i + 1];
      for (let j = 0; j < n; j++) {
        const p = C.clone().addScaledVector(this.axis, rnd(r1, r2)).add(new V3(rnd(-45, 45), 0, rnd(-45, 45)));
        let a = null;
        if (KINDS[kind] || kind === "carrier" || kind === "mech") {
          const type = KINDS[kind] ? pick(KINDS[kind]) : kind, ship = kind === "ship" || kind === "carrier";
          const g = ship ? new V3(p.x, this.s.world.h(p.x, p.z) + 36, p.z) : this._gs(p.x, p.z, 30, 6).clone();
          a = c.units.spawn(type, { pos: g, near: true, home: C.clone(), hp: lvl });
          if (a) this._lift(a.unit.group);
        } else {
          p.y = this.s.world.h(p.x, p.z) + rnd(16, 30);
          const bk = kind === "drone" ? pick(["grunt", "grunt", "kamikaze"]) : kind;
          a = c.spawnBot({ kind: bk, team: 1, pos: p, temp: true, hpScale: lvl });
          if (a && a.ai) a.ai.home = C;
        }
        if (a) out.push(a);
      }
    }
    return out;
  }
  _push(L) { for (const a of L) { a.sx = this.list.length; a.wk = this.wk; this.list.push(a); } }
  _spawnWave(spec) {
    this.wk = this.si * 100 + this.wave; this.km.clear(); this.myBossDmg = {};
    this._rng();
    this.list = [];
    if (spec.infil) this._setupInfil();
    else if (spec.seize) this._setupSeize();
    else if (spec.siege) this._setupSiege();
    else if (!Array.isArray(spec)) this._push(this._spawnBoss(spec.boss || spec.mid, !!spec.boss, !!spec.final, spec.at));
    else this._push(this._group(spec, this.target));
    this.wave++;
    if (this.wave > 1 && Array.isArray(spec)) this.s.hud.toast(`적 ${this.wave}파`, "#ff8a3a", 1.2, 22);
  }
  // 증원 (탈취·침투 경보·공성 단계): 방장이 순번을 올리면 모두 같은 순번의 무리를 붙인다
  _reinforce() {
    const k = this.rfN++, T = this.st.type, cnt = (n) => Math.max(1, Math.round(n * this.op.cnt));
    this._rng(500 + k);
    const far = this.target.clone().addScaledVector(this.axis, 60);
    if (T === "seize" && k === 2) { this._push(this._spawnBoss(MIDS[clamp(this.op.n - 1 + this.si, 0, MIDS.length - 1)], false, false)); return; }
    const spec = T === "infil" ? ["ace", this.op.n >= 3 ? 2 : 1, "drone", cnt(2)] : T === "siege" ? (k % 2 ? ["ace", cnt(2), "drone", cnt(2)] : ["robot", cnt(1), "tank", cnt(1), "drone", cnt(3)]) : this.rp([["drone", cnt(3)], ["tank", cnt(1), "drone", cnt(2)], ["robot", cnt(1), "drone", cnt(2)], ["jet", 1, "drone", cnt(2)]]);
    this._push(this._group(spec, far, 40, 90));
    this.s.hud.toast(T === "infil" ? "⚠ 경보! 적 증원 출격" : "적 증원 접근", "#ff8a3a", 1.4, 22);
  }

  // ── 침투: 레이더 탐지권 + 데이터 노드 ──
  _setupInfil() {
    const c = this.combat, w = this.s.world, C = this.target, lvl = this.lvl, n = 3 + (this.op.n >= 3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + this.R(), r = 16 + this.R() * 22, g = this._gs(C.x + Math.cos(a0) * r, C.z + Math.sin(a0) * r, 18, 3);
      const t = c.spawnTurret(g.x, g.z, 1, { name: "데이터 노드", hp: Math.round(110 * lvl), range: 55 });
      t.node = true; this._push([t]);
    }
    // 레이더 탐지권: 붉은 기둥 (INFIL_FLOOR 아래는 못 본다)
    const m = 3 + (this.op.n >= 4 ? 1 : 0), RR = 24 + this.op.n * 2;
    this.sent = [];
    for (let i = 0; i < m; i++) {
      const a0 = (i / m) * Math.PI * 2 + 0.6 + this.R() * 0.5, r = 30 + this.R() * 26, x = C.x + Math.cos(a0) * r, z = C.z + Math.sin(a0) * r, y = w.h(x, z);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const vol = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, 70, 28, 1, true), mat); vol.position.set(x, y + INFIL_FLOOR + 35, z); w.scene.add(vol);
      const floor = new THREE.Mesh(new THREE.RingGeometry(RR - 1, RR, 40), new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.set(x, y + INFIL_FLOOR, z); w.scene.add(floor);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 20, 8), new THREE.MeshLambertMaterial({ color: 0x3a404c })); pole.position.set(x, y + 10, z); w.scene.add(pole);
      const dish = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3040).multiplyScalar(1.6) })); dish.position.set(x, y + 21, z); w.scene.add(dish);
      this.gfx.push(vol, floor, pole, dish);
      this.sent.push({ x, z, y, R: RR, vol, dish });
    }
    this.det = 0; this.alCD = 0; this.alN = 0; this.rfN = 0; this.stealth = 1;
    this._push(this._group(["drone", Math.max(1, Math.round(2 * this.op.cnt))], C, 0, 30));
  }
  _infilTick(dt) {
    const me = this.me, w = this.s.world;
    let inside = false;
    if (this.sent) for (const s of this.sent) {
      s.dish.rotation.y += dt * 1.6;
      const seen = me.alive && Math.hypot(me.pos.x - s.x, me.pos.z - s.z) < s.R && me.pos.y - w.h(me.pos.x, me.pos.z) > INFIL_FLOOR;
      s.vol.material.opacity = seen ? 0.08 + 0.03 * Math.sin(this.s.time * 14) : 0.04;
      inside = inside || seen;
    }
    this.det = clamp(this.det + (inside ? dt * 0.85 : -dt * 0.3), 0, 1);
    if ((this.alCD -= dt) <= 0 && this.det >= 1) {
      this.det = 0; this.alCD = 8;
      if (this.auth) this._alarm(); else this.ng.setField("al", ++this.alMine);
    }
    if (this.auth && !this.list.some((a) => a.node && a.alive)) this._cleared();
  }
  _alarm() { this.alN++; this.stealth = 0; this.s.game.sound.play("warn"); this._reinforce(); }

  // ── 탈취: 점령 원 ──
  _setupSeize() {
    const w = this.s.world, C = this.target;
    this.ZR = 30; this.cp = 0; this.rfN = 0; this.rfT = 7;
    const ring = new THREE.Mesh(new THREE.RingGeometry(this.ZR - 1.5, this.ZR, 56), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(C.x, C.y + 1, C.z);
    const vol = new THREE.Mesh(new THREE.CylinderGeometry(this.ZR, this.ZR, 45, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); vol.position.set(C.x, C.y + 22.5, C.z);
    w.scene.add(ring, vol); this.gfx.push(ring, vol); this.zoneM = vol;
    this._push(this._group(["tank", 1, "robot", 1, "drone", Math.round(3 * this.op.cnt)], C, 10, 50));
  }
  _inZone(p) { return Math.hypot(p.x - this.target.x, p.z - this.target.z) < this.ZR && p.y - this.s.world.h(p.x, p.z) < 45; }
  _seizeTick(dt) {
    const me = this.me, mine = me.alive && this._inZone(me.pos);
    if (this.co && this.ng.online) this.ng.setField("in", mine ? this.si : -1);
    if (this.zoneM) this.zoneM.material.opacity = mine ? 0.16 + 0.05 * Math.sin(this.s.time * 6) : 0.09;
    if (!this.auth) return;
    let n = mine ? 1 : 0;
    if (this.co && this.ng.online) for (const p of this.ng.players()) if (!p.me && this.ng.field(p.id, "in") === this.si) n++;
    const foes = this.list.some((a) => a.alive && a.unit && this._inZone(a.pos));
    const rate = n ? (100 / (24 + this.op.n * 4)) * (1 + 0.35 * (n - 1)) * (foes ? 0.5 : 1) : 0;
    this.cp = Math.min(100, this.cp + rate * dt);
    if ((this.rfT -= dt) <= 0) { this.rfT = Math.max(6, 12 - this.op.n); this._reinforce(); }
    if (this.cp >= 100) this._cleared();
  }

  // ── 공성전: 방공 포대 → 실드 발생기 → 요새 핵심 ──
  _setupSiege() {
    const c = this.combat, w = this.s.world, C = this.fin, lvl = this.lvl;
    const bat = [];
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + 0.2, r = i % 2 ? 44 : 78, x = C.x + Math.cos(a0) * r, z = C.z + Math.sin(a0) * r;
      const t = c.spawnTurret(x, z, 1, { name: "방공 포대", hp: Math.round(200 * lvl), range: 120 }); t.bat = true; bat.push(t);
    }
    this._push(bat);
    const gens = [];
    for (let i = 0; i < 3; i++) { const a0 = (i / 3) * Math.PI * 2 + 0.3, x = C.x + Math.cos(a0) * 26, z = C.z + Math.sin(a0) * 26; const g = c.spawnTurret(x, z, 1, { name: "실드 발생기", hp: Math.round(320 * lvl), range: 70 }); g.shieldGen = true; g.gen = true; g.invulnerable = true; gens.push(g); }
    this._push(gens);
    const core = c.spawnCore(C.x, C.z, 1, { name: "요새 핵심", hp: Math.round(2400 * lvl) });
    core.invulnerable = true; core.core = true; core.isStageBoss = true; if (!this.op.boss) core.stBoss = true;
    this._push([core]); this.coreA = core;
    this._push(this._group(["robot", Math.round(2 * this.op.cnt), "tank", 1, "drone", Math.round(3 * this.op.cnt)], C, -60, 40));
    const mk = (r, col, o) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); w.scene.add(m); this.gfx.push(m); return m; };
    this.bubble = mk(19, 0x5ab4ff, 0.16); this.bubble.position.set(C.x, w.h(C.x, C.z) + 4, C.z);
    this.genB = gens.map((g) => { const b = mk(4, 0xffb02e, 0.22); b.position.copy(g.pos); return b; });
    this.sgPh = 1; this.barT = 5; this.rfN = 0;
    this._redFog();
  }
  _siegeTick(dt) {
    const L = this.list, me = this.me, c = this.combat, w = this.s.world;
    if (this.sgPh === 1 && !L.some((a) => a.bat && a.alive)) {
      this.sgPh = 2; for (const a of L) if (a.gen) a.invulnerable = false;
      if (this.genB) { this._dispose(this.genB); this.genB = null; }
      this.s.hud.toast("외곽 포대 붕괴 — 실드 발생기 3기를 부숴라", "#ffb02e", 2.6, 26); this.s.game.sound.play("lap");
      if (this.auth) this._reinforce();
    }
    if (this.sgPh === 2 && !L.some((a) => a.gen && a.alive)) {
      this.sgPh = 3; if (this.coreA) { this.coreA.invulnerable = false; this.coreA.bossBar = { name: "요새 핵심" }; }
      if (this.bubble) { this.s.world.scene.remove(this.bubble); this.bubble = null; }
      this.s.hud.toast("요새 실드 해제 — 요새 핵심을 파괴하라!", "#35ff7a", 2.6, 28); this.s.game.sound.play("bigkill");
      if (this.auth) this._reinforce();
    }
    if (this.bubble) this.bubble.material.opacity = 0.13 + 0.05 * Math.sin(this.s.time * 4);
    // 요새 포격: 탑에서 내 기체 쪽으로 일제 사격 (곧게 날아오는 미사일)
    if (this.coreA && this.coreA.alive && me.alive && (this.barT -= dt) <= 0) {
      this.barT = Math.max(2.2, 5 - this.op.n * 0.5) * (this.sgPh === 3 ? 0.7 : 1);
      const C = this.fin, n = 2 + (this.sgPh === 3 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const [tx, tz] = CITADEL_TOWERS[Math.floor(Math.random() * CITADEL_TOWERS.length)], o = new V3(C.x + tx, w.h(C.x + tx, C.z + tz) + 33, C.z + tz);
        if (o.distanceTo(me.pos) > 260) continue;
        c.fireMissile(this.coreA, o, _v.copy(me.pos).sub(o).normalize(), me, Math.round(18 * this.lvl));
      }
    }
  }

  // 스테이지 확보 → 5초 정비 → 다음 임무 고르기
  _cleared() {
    if (this.phase !== "fight") return;
    const me = this.me, T = this.st.type;
    this.cleared++; me.score += 500;
    const bonus = T === "infil" && this.stealth ? 80 : 0;
    this._give(PTS.clear + (T === "fight" ? 0 : 20) + bonus, `${this.st.name} 확보${bonus ? " · 들키지 않음 보너스" : ""}`);
    if (me.alive) me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.3);
    for (const b of this.extras) if (b.alive) this.combat.kill(b, null);
    for (const a of this.list) if (a.alive) { a.remoteKill = true; this.combat.kill(a, null); }
    this.extras.length = 0; for (const b of this.brains) b._cleanup(); this.brains = [];
    this._dispose(this.gfx); this.sent = null; this.zoneM = null;
    this.phase = "rest"; this.restT = REST; this.cur = this.target.clone();
    if (this.shop && !this.out) this.shop.show();
    this.s.game.sound.play("lap");
  }
  _afterRest() {
    if (this.shop) this.shop.close();
    if (this.si + 1 >= this.N - 1) { this.cur = this.target.clone(); return this._go(this.N - 1); }
    this._choose();
  }

  _onDmg(a, amt, k) {
    if (a.bossPart && a.bossPart.alive && amt > 0 && !this._fwd) { this._fwd = true; this.combat.damage(a.bossPart, (amt * 0.6) / (a.bossPart.armor || 1), k, a.pos); this._fwd = false; }
    if (k !== this.me || !(amt > 0)) return;
    if (a.wk === this.wk && (a.isStageBoss || a.isMidBoss || a.unit || a.static)) this.myBossDmg[a.sx] = (this.myBossDmg[a.sx] || 0) + amt;
  }
  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (a.wk === this.wk && a.sx !== undefined) this.km.add(a.sx);
    if (a.remoteKill) { if (a.stBoss && !this.bossDead) this._won(); return; }
    if (a === me) {
      this.lives--;
      h.toast(this.lives > 0 ? `격추! 남은 목숨 ${this.lives}` : "목숨을 모두 잃었습니다", "#ff6b5a", 2, 26);
      if (this.lives <= 0) {
        me.respawns = false;
        if (this.co && this.ng.online) { this.out = true; this.ng.setField("out", 1); }
        else if (me.aos.pts >= REVIVE_COST) { this.reviveWait = 10; h.toast(`${REVIVE_COST}ⓟ로 부활할 수 있습니다 — 10초 안에`, "#8cff4a", 2.4, 24); }
        else this.endT = 2.2;
      }
      return;
    }
    if (k === me && a.team !== 0) {
      const sc = a.stBoss ? 5000 : a.isStageBoss ? 2000 : a.isMidBoss ? 800 : a.static ? 300 : a.unit ? 300 : 100;
      const pt = a.stBoss ? PTS.final : a.isStageBoss ? PTS.boss : a.isMidBoss ? PTS.mid : a.unit || a.static ? PTS.unit : PTS.drone;
      me.score += sc; this.kills++;
      this._give(pt); h.toast(`${a.name} 격추  +${sc} · +${pt}ⓟ`, "#ffd24a", 1, 18);
      if (a.isStageBoss || a.isMidBoss) for (let i = 0; i < (a.isStageBoss ? 3 : 1); i++) this.combat.addPickup(a.pos.clone().add(new V3((Math.random() - 0.5) * 12, 2, (Math.random() - 0.5) * 12)).setY(Math.max(a.pos.y, this.s.world.h(a.pos.x, a.pos.z) + 3)));
      else if (Math.random() < (a.unit || a.static ? 0.5 : 0.18)) this.combat.addPickup(a.pos.clone().setY(Math.max(a.pos.y, this.s.world.h(a.pos.x, a.pos.z) + 3)));
    }
    if (a.stBoss && !this.bossDead) this._won();
  }
  _won() { this.bossDead = true; this.endT = 3.5; this.s.hud.toast(this.op.n >= 4 && !this.op.boss ? "요새 함락 — 작전 성공!" : "최종 보스 격파 — 작전 성공!", "#35ff7a", 3, 32); this.s.game.sound.play("bigkill"); }

  update(dt) {
    super.update(dt);
    this.hudN++;
    if (this.shop) { this.shop.update(dt); if (this.shop.open) this._lifeDraw(); }
    this.ng.update(dt);
    if (this.co && this.ng.online && (this.syncT -= dt) <= 0) { this.syncT = 0.25; this._coop(); }
    if (this.out) this._spectate(dt);
    this._selfReviveTick(dt);
    if (this.state !== "run") return;
    for (const b of this.brains) b.update(dt);
    this.brains = this.brains.filter((b) => b.alive);
    const me = this.me, st = this.st;
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.endT > 0 || !st) return;
    if (this.guideT > 0) this.guideT -= dt;
    const t = this.s.time;
    if (this.beamM) this.beamM.material.opacity = 0.16 + 0.08 * Math.sin(t * 3);
    for (const m of this.gfx.concat(this.optGfx)) if (m.userData.arrow) { m.position.y = m.userData.y0 + Math.sin(t * 2.4) * 5; m.rotation.y += dt * 1.2; }
    if (this.phase === "travel") {
      this._subTick();
      if (me.alive && Math.hypot(me.pos.x - this.target.x, me.pos.z - this.target.z) < (st.type === "siege" ? 130 : 45)) { if (this.auth) this._enter(); else this.ng.setField("en", this.si); }
    } else if (this.phase === "fight") {
      const left = this.list.filter((a) => a.alive).length;
      this.left = left;
      if (st.type === "infil") this._infilTick(dt);
      else if (st.type === "seize") this._seizeTick(dt);
      else {
        if (st.type === "siege" && this.wave === 1) this._siegeTick(dt);
        if (!left && !this.cut && this.auth) {
          if (this.wave < st.waves.length) this._spawnWave(st.waves[this.wave]);
          else if (!st.last) this._cleared();
        }
      }
    } else if (this.phase === "rest") {
      if ((this.restT -= dt) <= 0 && this.auth) this._afterRest();
    } else if (this.phase === "choose") {
      if (this.auth) {
        const inp = this.s.game.input;
        if (inp.take("itemNext")) { this.optSel = (this.optSel + 1) % 3; this._drawChoice(); }
        if (inp.take("item")) return this._pick(this.optSel);
        if ((this.pickT -= dt) <= 0) return this._pick(this.optSel);
      }
    }
  }

  // ── 협동 동기화 (0.25초마다) ──
  _coop() {
    const ng = this.ng, me = this.me, c = this.combat, others = ng.players().filter((p) => !p.me);
    if (!this.auth) { if (!others.some((p) => p.id === this.co.host)) { this.hostGone = (this.hostGone || 0) + 0.25; if (this.hostGone > 6) { this.auth = true; this.s.hud.toast("방장이 나가 이어서 진행합니다", "#ffb02e", 2.2, 20); this._drawChoice(); } } else this.hostGone = 0; }
    ng.setField("kl", [this.wk, [...this.km]]);
    ng.setField("bd", [this.wk, this.myBossDmg]);
    ng.setField("sc", Math.round(me.score));
    ng.setField("rp", me.aos.pts >= REVIVE_COST ? 1 : 0);
    for (const p of others) {
      const rv = ng.field(p.id, "rv");
      if (Array.isArray(rv) && rv[0] === ng.myId && +rv[1] > ((this.rvSeen || (this.rvSeen = {}))[p.id] || 0)) { this.rvSeen[p.id] = +rv[1]; this._revived(p.name); }
    }
    const tot = Object.assign({}, this.myBossDmg);
    for (const p of others) {
      const kl = ng.field(p.id, "kl");
      if (Array.isArray(kl) && kl[0] === this.wk && Array.isArray(kl[1])) for (const i of kl[1]) { const a = this.list[i | 0]; if (a && a.alive) { a.remoteKill = true; c.kill(a, null); } }
      const bd = ng.field(p.id, "bd");
      if (Array.isArray(bd) && bd[0] === this.wk && bd[1] && typeof bd[1] === "object") for (const [k, v] of Object.entries(bd[1])) tot[k] = (tot[k] || 0) + Math.max(0, Math.min(1e6, +v || 0));
    }
    for (const [k, d] of Object.entries(tot)) { const a = this.list[k | 0]; if (a && a.alive && !a.invulnerable) { const want = a.maxHp - d; if (want < a.hp) a.hp = Math.max(0, want); if (a.hp <= 0.5) c.kill(a, null); } }
    if (this.auth) {
      if (this.phase === "travel" && others.some((p) => ng.field(p.id, "en") === this.si)) this._enter();
      if (this.phase === "fight" && this.st.type === "infil") for (const p of others) { const al = +ng.field(p.id, "al") || 0, seen = (this.alSeen || (this.alSeen = {})); if (al > (seen[p.id] || 0)) { seen[p.id] = al; this._alarm(); } }
      const live = (this.out ? 0 : 1) + others.filter((p) => !ng.field(p.id, "out")).length;
      const canRp = (this.out && me.aos.pts >= REVIVE_COST) || others.some((p) => ng.field(p.id, "out") && ng.field(p.id, "rp"));
      if (live) this.allOutT = 0; else this.allOutT = (this.allOutT || 0) + 0.25;
      if (!live && this.endT < 0 && (!canRp || this.allOutT > 10)) this.endT = 2.5;
      ng.setField("pg", { si: this.si, w: this.wave, ph: this.phase, ch: this.picks.slice(), rf: this.rfN, cp: Math.round(this.cp), al: this.alN, fin: this.bossDead ? 1 : 0, fail: !live && this.endT > 0 ? 1 : 0 });
      return;
    }
    const pg = ng.field(this.co.host, "pg");
    if (!pg || typeof pg !== "object") return;
    if (Array.isArray(pg.ch)) this.picks = pg.ch.map((x) => (MT[x] ? x : "fight")).slice(0, 6);
    let guard = 0;
    while (pg.si > this.si && guard++ < 8) { if (this.phase === "fight") this._cleared(); if (this.shop) this.shop.close(); this.cur = this.target ? this.target.clone() : this.cur; this._go(this.si + 1); }
    if (pg.si !== this.si) return;
    if (pg.ph === "fight" && this.phase === "travel") this._enter();
    if (this.phase === "fight") {
      while (pg.w > this.wave && this.wave < this.st.waves.length && guard++ < 10) this._spawnWave(this.st.waves[this.wave]);
      while ((+pg.rf || 0) > this.rfN && guard++ < 20) this._reinforce();
      if (this.st.type === "seize") this.cp = clamp(+pg.cp || 0, 0, 100);
      if (this.st.type === "infil" && (+pg.al || 0) > this.alN) { this.alN = +pg.al; this.stealth = 0; }
    }
    if ((pg.ph === "rest" || pg.ph === "choose") && this.phase === "fight") this._cleared();
    if (pg.ph === "choose" && this.phase === "rest") { if (this.shop) this.shop.close(); this._choose(); }
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
    const me = this.me, st = this.st;
    if (!st || !this.target) return null;
    if (this.phase === "travel" || this.phase === "rest") { o.pos = this.target; o.label = `${this.phase === "rest" ? "정비 중" : "목표"} · ${st.name}`; o.color = MT[st.type].css; return o; }
    if (this.phase === "fight") {
      for (const b of this.brains) { const g = b.objective(); if (g) { o.pos = g.pos; o.label = "실드 발생기"; o.color = "#5ab4ff"; return o; } }
      const near = (f) => { let best = null, bd = 1e9; for (const a of this.list) if (a.alive && f(a)) { const d = a.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = a; } } return best; };
      let best = null;
      if (st.type === "infil") best = near((a) => a.node);
      else if (st.type === "seize") { o.pos = this.target; o.label = `점령 구역 ${Math.floor(this.cp)}%`; o.color = "#ffd24a"; return o; }
      else if (st.type === "siege" && this.wave === 1) best = near((a) => (this.sgPh === 1 ? a.bat : this.sgPh === 2 ? a.gen : a.core));
      best = best || near(() => true);
      if (best) { o.pos = best.pos; o.label = best.name; o.color = "#ff6a5a"; return o; }
    }
    return null;
  }

  hud(h) {
    const u = h.u, L = h.L, me = this.me, s = this.s, st = this.st;
    drawCombatHud(this.combat, h);
    if (this.cut || !st) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const cx = L.cx, y0 = L.t + 8 * u, M = MT[st.type];
    h.plate(cx - 210 * u, y0, 420 * u, 50 * u, { skew: 0.06, fill: "rgba(8,12,26,0.85)", accent: M.css });
    h.text(`작전 ${this.op.n} · STAGE ${this.si + 1}/${this.N} · ${M.icon} ${M.name} · ${st.name}`, cx, y0 + 15 * u, { size: 12.5, align: "center", base: "middle", bold: true, color: "#e8f4ff", shadow: false });
    const dist = this.target ? Math.round(Math.hypot(me.pos.x - this.target.x, me.pos.z - this.target.z)) : 0;
    let sub = "";
    if (this.phase === "fight") {
      if (st.type === "infil") { const n = this.list.filter((a) => a.node && a.alive).length; sub = `데이터 노드 ${n}개 남음 · ${this.stealth ? "들키지 않음" : `경보 ${this.alN}회`}`; }
      else if (st.type === "seize") sub = `점령 ${Math.floor(this.cp)}%`;
      else if (st.type === "siege" && this.wave === 1) sub = ["", "① 외곽 방공 포대", "② 실드 발생기", "③ 요새 핵심"][this.sgPh] + ` · 남은 적 ${this.left ?? 0}`;
      else { const cw = st.waves[Math.max(0, this.wave - 1)], tag = cw && !Array.isArray(cw) ? (cw.boss ? " · 보스" : cw.mid ? " · 중간 보스" : "") : ""; sub = `남은 적 ${this.left ?? 0} · ${Math.min(this.wave, st.waves.length)}/${st.waves.length}파${tag}`; }
    } else if (this.phase === "travel") sub = `목표까지 ${dist}m${this.sub && !this.sub.done ? ` · 서브미션 ${this.sub.name} ${this.sub.got}/${this.sub.need}` : ""}`;
    else if (this.phase === "rest") sub = `정비 시간 · ${Math.ceil(this.restT)}초`;
    else sub = this.auth ? `다음 임무 고르기 · ${Math.ceil(this.pickT)}초` : "방장이 다음 임무를 고르는 중";
    h.text(`${this.lives > LIVES ? `❤×${this.lives}` : "❤".repeat(Math.max(0, this.lives)) + "♡".repeat(Math.max(0, LIVES - this.lives))}  ${sub}  ·  ${Math.round(me.score)}점`, cx, y0 + 34 * u, { size: 11.5, align: "center", base: "middle", color: "#ffb4a8", shadow: false });
    let ly = y0 + 62 * u;
    const trail = this.picks.slice(0, this.si + 1).map((x) => MT[x].icon).join(" → ");
    if (this.si > 0) { h.text(`지나온 임무 ${trail}`, cx, ly, { size: 11, align: "center", color: "#9fd8ff" }); ly += 14 * u; }
    if (this.co && this.ng.online) h.text(this.ng.players().map((p) => `${p.me ? "★" : "·"}${p.name}${this.ng.field(p.id, "out") || (p.me && this.out) ? "(관전)" : ""} ${p.me ? Math.round(me.score) : this.ng.field(p.id, "sc") || 0}`).join("   "), cx, ly, { size: 11, align: "center", color: "#cfe8ff" });
    else if (!this.co) h.text("혼자 · AI 윙맨 3기와 함께", cx, ly, { size: 10.5, align: "center", color: "#9aa8bc" });
    if (!this.out) {
      const x = L.l, y = L.t + 100 * u, w = 214 * u, hh = 40 * u, D = me.aos;
      h.plate(x, y, w, hh, { skew: 0.08, fill: "rgba(8,12,26,0.86)", accent: "#ffd24a" });
      h.text(`ⓟ ${Math.floor(D.pts)}`, x + 14 * u, y + 13 * u, { size: 15, base: "middle", bold: true, color: "#ffd24a", shadow: false });
      h.text(UP_KEYS.map((k) => `${UP[k].icon}${D.up[k] + 1}`).join(" "), x + w - 12 * u, y + 13 * u, { size: 11, align: "right", base: "middle", color: "#cfd8e6", shadow: false });
      h.text(this.combat.touchUI() ? "눌러서 업그레이드 (Lv1 시작)" : `업그레이드 [${h.keyName ? h.keyName("item", "E") : "E"}] · Lv1 시작`, x + 14 * u, y + 29 * u, { size: 10, base: "middle", color: "#9aa8bc", shadow: false });
      this.panelRect = { x, y, w, h: hh, f: this.hudN };
    }
    // 이동 안내: 화면 화살표가 목표 방향·거리를 늘 알려 준다. 처음 5초는 크게 + 안내판
    if (this.phase === "travel" && me.alive) {
      h.cue(this.target, s.camera, { color: M.css, label: st.last ? "적 본진" : `${M.name} 목표`, dist, force: this.guideT > 0, pop: Math.max(0, this.guideT / 5) });
      if (this.guideT > 0) {
        h.fade(Math.min(1, this.guideT * 1.5));
        h.plate(h.W / 2 - 180 * u, h.H / 2 + 74 * u, 360 * u, 40 * u, { skew: 0.08, fill: "rgba(8,14,28,0.78)", accent: M.css });
        h.text(`${M.icon} ${M.name} ▸ ${st.name}`, h.W / 2, h.H / 2 + 88 * u, { size: 14, align: "center", bold: true, color: M.css });
        h.text(`${dist}m · 화살표 방향의 빛 기둥으로`, h.W / 2, h.H / 2 + 104 * u, { size: 12, align: "center", color: "#e8f4ff" });
        h.fade(1);
      }
    }
    if (this.phase === "choose" && this.opts) for (const o of this.opts) h.marker(o.pos.clone().setY(o.pos.y + 20), s.camera, MT[o.type].css, `${MT[o.type].icon} ${MT[o.type].name} · ${o.name}`, o.pos.distanceTo(me.pos));
    if (this.phase === "rest") h.banner(`스테이지 확보 · 정비 ${Math.ceil(this.restT)}초 — ⓟ로 업그레이드`, h.H * 0.3, "#35ff7a", 20);
    if (this.phase === "fight" && st.type === "infil" && this.det > 0.02) {
      const bw = 220 * u, bx = cx - bw / 2, by = h.H * 0.66;
      h.g.fillStyle = "rgba(0,0,0,0.5)"; h.g.fillRect(bx, by, bw, 8 * u); h.g.fillStyle = this.det > 0.6 ? "#ff3a3a" : "#ffb02e"; h.g.fillRect(bx, by, bw * this.det, 8 * u);
      h.text(`⚠ 레이더 탐지 중 — ${INFIL_FLOOR}m 아래로 낮게!`, cx, by - 10 * u, { size: 13, align: "center", bold: true, color: "#ff6a5a" });
    }
    if (this.phase === "fight" && st.type === "seize") {
      const bw = 260 * u, bx = cx - bw / 2, by = L.t + 84 * u + (this.si > 0 ? 14 * u : 0);
      h.g.fillStyle = "rgba(0,0,0,0.5)"; h.g.fillRect(bx, by, bw, 9 * u); h.g.fillStyle = "#ffd24a"; h.g.fillRect(bx, by, bw * this.cp / 100, 9 * u);
      if (me.alive && !this._inZone(me.pos)) h.text("점령 원 밖 — 노란 원 안으로(높이 45m 아래)", cx, by + 24 * u, { size: 12, align: "center", bold: true, color: "#ffd24a" });
    }
    for (const b of this.brains) if (b.warnT > 0 && b.warn) { h.banner(`⚠ ${b.a.name} · ${b.warn}`, h.H * 0.24, "#ff5a3a", 18); break; }
    if (this.out) { h.text(`관전 중${this.specT ? ` · ${this.specT.name}` : ""} · [발사] 다른 팀원`, cx, h.H * 0.8, { size: 15, align: "center", bold: true, color: "#9fd8ff" }); h.text(me.aos.pts >= REVIVE_COST ? `내 ${REVIVE_COST}ⓟ로 부활하거나, 팀원이 살려 주면 다시 출격합니다` : `팀원이 ${REVIVE_COST}ⓟ로 살려 주면 다시 출격합니다 (내 ⓟ ${Math.floor(me.aos.pts)}/${REVIVE_COST})`, cx, h.H * 0.8 + 20 * u, { size: 12, align: "center", color: "#8cff4a" }); }
    else if (this.co && this.ng.online && (this.hudN % 2 === 0 ? (this._dmC = this._downMates().length) : this._dmC)) h.text(`🤝 관전 중인 팀원 ${this._dmC}명 — 업그레이드 창에서 ${REVIVE_COST}ⓟ로 살리기`, cx, h.H * 0.7, { size: 13, align: "center", bold: true, color: "#8cff4a" });
  }

  _end() {
    if (this.state === "done") return;
    const me = this.me, win = this.bossDead, sc = Math.round(me.score + (win ? this.lives * 1000 : 0)), mid = this.s.map.id;
    const rec = submitRecord(this.recKey, sc);
    let medal = 0, first = false, unlocked = "";
    if (win) {
      const k = `strikeOp:${mid}`, prev = records[k] | 0;
      first = this.op.n > prev;
      if (first) { records[k] = this.op.n; save(); if (this.op.n < 5) unlocked = `작전 ${this.op.n + 1} 열림`; }
      medal = this.op.medal ? this.op.medal + (first ? 1 : 0) : 0;
      if (medal) GP.addMedals(medal, `돌파 작전 ${this.op.n} 승리`);
    }
    this.finish({
      strike: win && this.op.n < 5 ? { next: this.op.n + 1, name: OPS[this.op.n].name, map: mid, coop: !!(this.co && this.ng.online) } : null,   // 결과 화면 '다음 작전' 버튼
      title: win ? "작전 성공!" : "작전 실패", sub: `돌파 작전 ${this.op.n} · ${this.op.name} · ${this.s.map.name} · 스테이지 ${Math.min(this.N, this.si + 1)}/${this.N}${unlocked ? " · " + unlocked : ""}`, win, record: rec,
      stars: win ? (this.lives >= 3 ? 3 : this.lives >= 2 ? 2 : 1) : 0,
      lines: [{ label: "점수", value: `${sc}${win ? ` (남은 목숨 +${this.lives * 1000})` : ""}` }, { label: "임무", value: this.picks.slice(0, this.si + 1).map((x) => MT[x].name).join(" → ") },
        { label: "격추", value: `${this.kills}` }, { label: "남은 목숨", value: `${this.lives}` },
        ...(win && this.op.medal ? [{ label: "훈장", value: `🎖 +${medal}${first ? " (첫 승리 +1)" : ""} · 보유 ${GP.medals()} — 격납고 파츠·스킬 한계 돌파` }] : win ? [{ label: "훈장", value: "작전 3부터 승리하면 훈장 🎖 (격납고 한계 돌파)" }] : []),
        { label: "업그레이드", value: UP_KEYS.map((k) => `${UP[k].name} ${me.aos.up[k] + 1}`).join(" · ") },
        { label: "걸린 시간", value: fmtTime(this.time) }, { label: "최고 기록", value: `${records[this.recKey] || sc}` }],
    });
  }

  dispose() {
    if (this.siteGone) for (const f of this.siteGone) f();
    if (this.revBtn) { this.revBtn.remove(); this.revBtn = null; }
    clearTimeout(this.briefTo); if (this.briefEl) { this.briefEl.remove(); this.briefEl = null; }
    this._hideChoice();
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
