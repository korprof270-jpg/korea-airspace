// 서바이벌 전선전 연출가 (데스매치 · 팀 데스매치, 오프라인 전용 — 스토리·온라인·점령전은 건드리지 않는다)
//  · 전선 이동: 아군 기지 → 적 본진 축을 3~4 구역으로 나눈다. 지금 구역의 목표를 정리하면 전선이 다음 구역으로 (배너·무전·표지)
//    구역 성격은 맵에서 읽는다: 구조물이 빽빽 → 근접전(방패기·스텔스기), 높낮이가 큼 → 저격 지대, 트인 땅 → 자폭 떼·모함기
//  · 구역 목표(동시 진행·이동 목표): 점령 · 다지점 방어 · 수송대 차단 · 호위 · 현상범 추격 · 포격 회피 · 데이터 코어 운반 · 거대 병기 저지 · 적 본진 돌파
//  · 숨은 발견물: 보급 캐시 · 파손된 포탑(수리하면 아군) · 숨은 정예
//  · 판 중 지형·날씨 변화: 폭풍우(안개) · 밤(노출·조명 + 탐조등) · 구조물 붕괴 연출
//  · 위협 단계(Ⅰ~Ⅴ)가 음악 긴장도를 받친다. 마지막 60초는 총력전
import * as THREE from "../vendor/three.module.min.js";
import { clamp } from "./config.js";
import { ITEMS, ITEM_SLOTS, SHIELD_HP } from "./combat.js";
import { clampRank } from "./ranks.js";

const V3 = THREE.Vector3;
const _v = new V3(), _w = new V3();
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (L) => L[(Math.random() * L.length) | 0];
const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"];
const TIER_NAME = ["경계", "교전", "격전", "위기", "총력전"];
const TIER_COL = ["#8cc4ff", "#ffd24a", "#ffb02e", "#ff7a3a", "#ff3d5a"];
const MUSIC_FLOOR = [0.08, 0.2, 0.36, 0.55, 0.82];
const CAP = { low: 9, med: 13, high: 15 };            // 동시에 살아 있는 적 드론 상한 (휴대폰 저사양 고려)
const VACUUM = new Set(["moon", "orbit"]);
const BOUNTY = ["검은 매", "붉은 칼날", "유령 13", "모래 늑대", "철갑 까마귀", "백색 송곳"];
const MIX = {
  dense: ["shield", "stealth", "grunt", "shield", "ace", "stealth"],
  high: ["sniper", "grunt", "sniper", "jet", "stealth", "ace"],
  open: ["swarm", "carrier", "jet", "grunt", "sniper", "swarm"],
};
const LIMIT = { shield: 3, sniper: 2, carrier: 1, stealth: 2 };
const SECTOR_LABEL = { dense: "밀집 지역 · 근접전", high: "고지대 · 저격 주의", open: "개활지 · 장거리 교전" };
const ASSAULT_GOAL = 6000;   // 공방전: 공격 쪽이 이 점수를 먼저 모으면 그 판(전·후반) 승리
const OBJ_ICON = { strike: "✸", hold: "◎", dintercept: "✈", hq: "⌂", capture: "◎", defend: "⛨", intercept: "✈", escort: "⛴", bounty: "☠", bombard: "☄", datacore: "◆", titan: "⚙", base: "⌂", clear: "✕" };

export function directorWanted(mode) {
  const cfg = mode.cfg || {};
  return !cfg.net && !cfg.online && !cfg.story && !cfg.noDirector && cfg.mode === "survival" && (mode.variant === "dm" || mode.variant === "tdm") && !!mode.s.map.combat;
}

export class Director {
  constructor(mode) {
    this.m = mode; this.s = mode.s; this.c = mode.combat; this.w = mode.s.world;
    this.me = mode.me;
    this.ffa = this.c.ffa;
    this.A2 = mode.cfg.assault || null;               // 공방전: { half, role: "atk" | "def", wins, total }
    this.def = !!(this.A2 && this.A2.role === "def");
    if (this.ffa) this.me.squad = "p";                // 개인전: 내 편 오브젝트(방어 지점·호위선·수리 포탑)는 나와 같은 squad
    this.cap = CAP[this.s.game.q] || CAP.med;
    this.objs = []; this.done = 0; this.failed = 0; this.total = 0; this.cleared = 0; this.maxTier = 1; this.tier = 1;
    this.spawnT = 6; this.failBoostT = 0; this.supportCD = 25; this.bannerT = 0; this.banner = null;
    this.allOut = false; this.victory = false; this.stageT = 0; this.si = -1; this.secI = 0;
    this.gfx = [];                                     // 정리할 장면 물체
    this._geo();
    this._plan();
    this.weather = new Weather(this);
    this.dbg = this._debug();
  }

  // ── 맵 읽기: 구역 나누기 + 구역 성격 ──
  _geo() {
    const w = this.w, mc = this.s.map.combat, lim = w.size - 20;
    const A = new V3(clamp(mc.blue[0], -lim, lim), 0, clamp(mc.blue[1], -lim, lim)), B = new V3(clamp(mc.red[0], -lim, lim), 0, clamp(mc.red[1], -lim, lim));
    this.A = A; this.B = B;
    this.axis = B.clone().sub(A).normalize(); this.side = new V3(-this.axis.z, 0, this.axis.x);
    this.L = A.distanceTo(B);
    const dur = this.m.duration;
    this.N = this.m.cfg.assault || dur < 240 ? 3 : 4;
    this.halfW = Math.min(w.size * 0.8, Math.max(90, this.L * 0.45));
    this.secs = [];
    for (let i = 0; i < this.N; i++) {
      const sc = { i, t0: i / this.N, t1: (i + 1) / this.N, perches: [], covers: [], structs: [], opens: [] };
      sc.c = this.at(sc, 0, 0, 0);
      this._analyze(sc);
      this.secs.push(sc);
    }
    // 모든 구역 성격이 같으면 상대 비교로 나눈다 (가장 빽빽한 곳 = 근접전, 높낮이가 가장 큰 곳 = 저격, 가장 트인 곳 = 개활지)
    const S = this.secs;
    if (S.every((q) => q.kind === S[0].kind)) {
      const by = (f) => S.slice().sort((a, b) => f(b) - f(a));
      const dense = by((q) => q.frac)[0], high = by((q) => q.relief).find((q) => q !== dense), open = by((q) => -q.frac).find((q) => q !== dense && q !== high);
      if (dense.frac > 0.06) dense.kind = "dense";
      if (high) high.kind = "high";
      if (open) open.kind = "open";
      for (const q of S) q.label = SECTOR_LABEL[q.kind];
    }
  }
  // 구역 sc 안의 점: u = 축 방향(-1 뒤 · 1 앞), v = 옆(-1..1), alt = 지면 위 높이
  at(sc, u, v, alt = 0, out = new V3()) {
    const t = sc.t0 + (u + 1) / 2 * (sc.t1 - sc.t0), lim = this.w.size - 18;
    out.copy(this.A).addScaledVector(this.axis, this.L * t).addScaledVector(this.side, v * this.halfW);
    out.x = clamp(out.x, -lim, lim); out.z = clamp(out.z, -lim, lim);
    out.y = this.w.h(out.x, out.z) + alt;
    return out;
  }
  _top(x, z) {   // 구조물 지붕까지 포함한 높이
    const w = this.w, p = _v.set(x, w.h(x, z) + 3, z);
    let n = 0;
    while (n++ < 30 && p.y < w.ceiling - 25 && w.col.blocked(p, 2.2)) p.y += 4;
    return p.y;
  }
  _analyze(sc) {
    const w = this.w, H = [];
    let blk = 0, n = 0;
    for (let k = 0; k < 36; k++) {
      const p = this.at(sc, rnd(-0.95, 0.95), rnd(-0.95, 0.95), 6);
      if (w.def.land && !w.def.land(p.x, p.z)) continue;
      n++;
      const b = w.col.blocked(p, 3.5);
      if (b) { blk++; sc.structs.push(p.clone()); }
      const top = this._top(p.x, p.z);
      H.push({ p: new V3(p.x, top, p.z), g: w.h(p.x, p.z) });
      // 숨을 곳: 막히지 않았는데 옆에 구조물이 있는 낮은 자리
      if (!b) {
        let near = 0;
        for (let a = 0; a < 4; a++) if (w.col.blocked(_w.set(p.x + Math.cos(a * 1.57) * 9, p.y, p.z + Math.sin(a * 1.57) * 9), 2.5)) near++;
        if (near) sc.covers.push(p.clone()); else sc.opens.push(p.clone());
      }
    }
    const tops = H.map((q) => q.p.y), lo = Math.min(...tops, 0), hi = Math.max(...tops, 0);
    const frac = n ? blk / n : 0;
    sc.frac = frac; sc.relief = hi - lo;
    sc.kind = frac > 0.2 ? "dense" : hi - lo > 26 ? "high" : "open";
    if (sc.kind === "dense" && hi - lo > 40 && Math.random() < 0.4) sc.kind = "high";
    // 저격 자리: 가장 높은 곳 위 (천장 아래)
    H.sort((a, b) => b.p.y - a.p.y);
    for (const q of H) {
      if (sc.perches.length >= 3) break;
      const y = Math.min(q.p.y + 6, w.ceiling - 22);
      const pp = new V3(q.p.x, y, q.p.z);
      if (w.col.blocked(pp, 2.5) || sc.perches.some((o) => o.distanceTo(pp) < 40)) continue;
      sc.perches.push(pp);
    }
    if (!sc.perches.length) sc.perches.push(this.at(sc, 0.7, rnd(-0.5, 0.5), 45));
    sc.label = SECTOR_LABEL[sc.kind];
  }

  // ── 판의 흐름 ──
  _plan() {
    const d = this.m.duration, N = this.N, tdm = !this.ffa;
    let P;
    if (this.A2 && this.def) P = [{ sec: 2, name: "전초 사수", objs: ["hold"], alt: ["defend", "dintercept"], side: ["dintercept"] },
      { sec: 1, name: "송신탑 방어", objs: ["defend"], alt: ["hold", "dintercept"], side: ["dintercept"] },
      { sec: 0, name: "침투 저지", objs: ["dintercept"], alt: ["hold", "defend"], side: [] },
      { sec: 0, name: "본진 사수", objs: ["hq"], side: [] }];
    else if (this.A2) P = [{ sec: 0, name: "침투 작전", objs: ["capture"], side: ["datacore"] },
      { sec: 1, name: "거점 격파", objs: ["strike"], side: ["intercept"] },
      { sec: 2, name: "적 본진 돌파", objs: ["base"], side: [] }];
    else if (N === 3) P = [{ sec: 0, name: "정찰", objs: ["capture"], side: ["bombard"] },
      { sec: 1, name: "수송대 차단", objs: ["intercept"], side: ["bounty"] },
      { sec: 2, name: "적 본진 돌파", objs: ["base"], side: ["titan"] }];
    else if (d < 480) P = [{ sec: 0, name: "정찰", objs: ["capture"], side: ["datacore"] },
      { sec: 1, name: "거점 방어", objs: ["defend"], side: ["bombard"] },
      { sec: 2, name: "수송대 차단", objs: ["intercept"], side: ["bounty"] },
      { sec: 3, name: "적 본진 돌파", objs: ["base"], side: ["titan"] }];
    else P = [{ sec: 0, name: "정찰", objs: ["capture"], side: ["datacore"] },
      { sec: 1, name: "거점 방어", objs: ["defend"], side: ["bombard"] },
      { sec: 2, name: "수송대 차단", objs: ["intercept"], side: ["bounty"] },
      { sec: 2, name: "거대 병기 강습", objs: ["titan"], side: [tdm ? "escort" : "datacore"] },
      { sec: 3, name: "적 본진 돌파", objs: ["base"], side: [] }];
    this.plan = P;
    this.finalT = Math.min(60, d * 0.3);
    this.k = clamp(d / 600, 0.45, 1.15);            // 목표 제한 시간 배율
  }

  start() {
    const c = this.c, last = this.secs[this.N - 1];
    if (this.def) {   // 수비: 적 본진 대신 아군 본진(뒤쪽 끝). 마지막 방어선이 무너질 때까지 방어막
      const hp = c.units.groundSpot(this.A.x, this.A.z, 30, 9);
      const hq = (this.base = this.m.buildBase(hp.x, hp.z, 0, 4, 9000));
      hq.core.name = "아군 본진 코어"; hq.core.dir = true; hq.core.invulnerable = true; hq.core.squad = "p"; hq.core.tag = "hq";
      for (const t of hq.turrets) { t.hp = t.maxHp = 600; t.squad = "p"; t.name = "아군 본진 포탑"; t.dir = true; }
      const dm = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 12), new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      dm.position.copy(hq.core.pos); this.w.scene.add(dm); this.baseDome = dm; this.gfx.push(dm);
      this._finds();
      return;
    }
    // 적 본진: 튼튼한 코어(사용자 요청: 예전 기지의 약 4배 × 코어 3배) + 포탑 4. 마지막 단계 전까지는 방어막으로 무적
    const bp = c.units.groundSpot(this.B.x, this.B.z, 30, 9);
    const base = (this.base = this.m.buildBase(bp.x, bp.z, 1, 4, 4500));   // 적 본진 코어: 9000 → 4500 (사용자 요청)
    base.core.name = "적 본진 코어"; base.core.dir = true; base.core.invulnerable = true; base.core.squad = "e";
    for (const t of base.turrets) { t.hp = t.maxHp = 600; t.squad = "e"; t.name = "적 본진 포탑"; t.dir = true; }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 12), new THREE.MeshBasicMaterial({ color: 0xff5a66, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    dome.position.copy(base.core.pos); this.w.scene.add(dome); this.baseDome = dome; this.gfx.push(dome);
    void last;
    this._finds();
  }

  // ── 매 프레임 ──
  update(dt) {
    const m = this.m;
    this.weather.update(dt);
    this._fx(dt);
    if (m.state !== "run" || m.cut) return;
    if (this.si < 0) this._stage(0);
    this.stageT += dt;
    if (this.stormT > 0 && (this.stormT -= dt) <= 0) this.weather.storm(true, 55);
    if (this.sideQ && this.sideQ.length && this.stageT >= this.sideT && this.pause <= 0 && !this.objs.some((o) => o.state === "run" && !o.primary)) {
      this._add(this.sideQ.shift(), false); this.sideT = this.stageT + 40;
    }
    const left = m.duration - m.time;
    if (!this.allOut && left <= this.finalT && !this.victory && !this.lost) this._allOut();
    if (this.A2 && !this.victory && !this.lost && m.endT < 0) {   // 공격 점수 목표 달성 → 그 판 공격 쪽 승리
      if (!this.def && m.team[0] >= ASSAULT_GOAL) { this.victory = true; this.byScore = true; m.endT = 3; this._banner("공격 점수 달성 — 공격 성공!", "#35ff7a", 4); }
      else if (this.def && m.team[1] >= ASSAULT_GOAL) { this.lost = true; this.byScore = true; m.endT = 3; this._banner("적 공격 점수 달성 — 방어 실패", "#ff6b5a", 4); }
    }
    for (const o of this.objs) if (o.state === "run") { o.t += dt; o.upd(dt); if (o.state === "run" && o.limit && o.t >= o.limit) o.timeout ? o.timeout() : this._end(o, false); }
    for (let i = this.objs.length - 1; i >= 0; i--) { const o = this.objs[i]; if (o.state !== "run" && (o.gone = (o.gone || 0) + dt) > 4 && !(o.primary && o.stage === this.si)) { o.clean(); this.objs.splice(i, 1); } }   // 이번 단계 주 목표는 단계가 넘어갈 때까지 남겨 둔다(판정용)
    this._stageCheck(dt);
    this._spawner(dt);
    this._findTick(dt);
    this._support(dt);
    this._tier(dt);
    if (this.bannerT > 0) this.bannerT -= dt;
    this._guideTick(dt);
  }
  // 목표 안내: 하나씩 5초 동안 (주 목표가 먼저). 목표 자리에는 빛 기둥
  _guideTick(dt) {
    let G = this.guide;
    if (G && (G.t -= dt) <= 0 || G && G.o.state !== "run") { G = this.guide = null; if (this.guideM) this.guideM.visible = false; }
    if (!G && this.guideQ && this.guideQ.length) {
      this.guideQ.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
      const o = this.guideQ.shift();
      if (o.state === "run") G = this.guide = { o, t: 5, T: 5 };
    }
    if (!G) return;
    const mk = G.o.marks && G.o.marks[0];
    if (!mk) return;
    if (!this.guideM) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 160, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.w.scene.add(m); this.gfx.push(m); this.guideM = m;
    }
    const m = this.guideM, k = G.t / G.T;
    m.visible = true; m.position.set(mk.pos.x, mk.pos.y + 80, mk.pos.z);
    m.material.color.set(mk.color || "#ffd24a"); m.material.opacity = 0.35 * Math.min(1, (G.T - G.t) * 3) * Math.min(1, G.t * 1.5) * (0.8 + 0.2 * Math.sin(this.s.time * 8));
    void k;
  }

  // 단계 시작
  _stage(i) {
    const st = this.plan[i];
    this.si = i; this.stageT = 0; this.pause = 0;
    const moved = st.sec !== this.secI || i === 0;
    this.secI = st.sec;
    const sc = this.secs[st.sec];
    if (moved && i > 0) this._advanceFx(sc);
    if (this.def && i === 0) { const sp = this.spawnPoint(this.me); this.m.placePlayer(sp.pos, sp.yaw); }
    if (this.def) this._banner(i === 0 ? `방어 개시 — 제${st.sec + 1} 구역 · ${sc.label}` : `방어선 후퇴 — ${st.name}`, i === 0 ? "#8cc4ff" : "#ff8a5a");
    else this._banner(i === 0 ? `작전 개시 — 제1 구역 · ${sc.label}` : moved ? `전선 이동 — 제${st.sec + 1} 구역 · ${sc.label}` : `제${st.sec + 1} 구역 2차 공세`, i === 0 ? "#8cc4ff" : "#35ff7a");
    this.s.game.sound.play(i === 0 ? "go" : "lap");
    for (const t of st.objs) this._add(t, true);
    // 보조 목표는 단계 시작과 동시에 몰아치지 않게: 주 목표에 익숙해질 시간(약 35초) 뒤 하나씩
    this.sideQ = st.side.slice(); this.sideT = i === 0 ? 45 : 35;
    if (this.def) this.say(i === 0 ? `수비 개시. 적이 제${st.sec + 1} 구역으로 밀려옵니다 — ${st.name}!` : `방어선이 밀렸어요. ${st.name}!`, 3);
    else this.say(i === 0 ? `작전 개시. 제1 구역 ${sc.label} — ${st.name}부터 시작합니다.` : moved ? `전선이 제${st.sec + 1} 구역으로 이동합니다. ${sc.label}, 대비하세요.` : `같은 구역에 적 2차 공세! ${st.name}!`, 3);
    // 날씨 · 지형 변화 계획
    if (i === 1) this.stormT = 25;   // 폭풍은 단계 시작 25초 뒤에 (새 목표와 겹치지 않게)
    if (st.objs.includes("titan") || (i === this.plan.length - 1 && !this.nightDone)) { this.nightDone = true; this.weather.night(true); }
    // 원래 편성 드론도 새 구역을 거점으로
    for (const a of this.c.actors) if (a.kind === "bot" && a.alive && a.ai && (this.ffa || a.team === 1) && a.squad !== "p") a.ai.home = sc.c;
  }

  _stageCheck(dt) {
    const prim = this.objs.filter((o) => o.primary && o.stage === this.si);
    if (!prim.length || prim.some((o) => o.state === "run")) return;
    if (this.si === this.plan.length - 1) return;   // 마지막 단계(본진)는 코어가 부서질 때 끝
    if (this.def) return this._defCheck(dt, prim);
    if (prim.some((o) => o.state === "fail") && !prim.some((o) => o.type === "clear")) {
      this._add("clear", true);
      return;
    }
    if (this.pause === 0) {   // 구역 확보 직후: 잠깐 숨 돌릴 시간 (보조 목표 정리 · 증원 멈춤)
      for (const o of this.objs) if (o.state === "run" && o.stage === this.si && !o.keep) this._end(o, null);
      this.sideQ = [];
      this.s.hud.toast("목표 달성 — 정비 시간", "#8cc4ff", 1.8, 22);
    }
    if ((this.pause += dt) < (this.allOut ? 3.5 : 12)) return;
    // 구역 확보 → 다음 단계. 보조 목표는 남은 것을 정리한다
    for (const o of this.objs) if (o.state === "run" && o.stage === this.si && !o.keep) this._end(o, null);
    const cur = this.plan[this.si], nxt = this.plan[this.si + 1];
    if (nxt.sec !== cur.sec) { this.cleared++; this.s.hud.toast(`제${cur.sec + 1} 구역 확보!`, "#35ff7a", 2.0, 30); }
    this._stage(this.si + 1);
  }

  // 수비: 목표를 지켜 내면 적이 같은 구역에서 다른 방식으로 재공세, 뚫리면 방어선이 한 구역 뒤로
  _defCheck(dt, prim) {
    const fell = prim.some((o) => o.state === "fail");
    if (this.pause === 0) {
      for (const o of this.objs) if (o.state === "run" && o.stage === this.si && !o.keep) this._end(o, null);
      this.sideQ = [];
      this.s.hud.toast(fell ? "방어선 돌파당함 — 후퇴!" : "방어 성공 — 적 재정비 중", fell ? "#ff6b5a" : "#35ff7a", 1.8, 22);
    }
    if ((this.pause += dt) < (this.allOut ? 3.5 : 12)) return;
    if (fell) return this._stage(this.si + 1);
    const st = this.plan[this.si], alt = st.alt || st.objs;
    this.wave2 = (this.wave2 || 0) + 1;
    for (const o of prim) o.stage = -1;   // 지난 공세 목표는 이번 판정에서 뺀다
    this.pause = 0; this.stageT = 0;
    this._banner(`적 재공세 — ${this.plan[this.si].name}`, "#ffb02e");
    this._add(alt[this.wave2 % alt.length], true);
    this.sideQ = st.side.slice(); this.sideT = 35;
  }

  // 마지막 60초: 총력전 — 아직 본진 단계가 아니면 전선을 본진으로 밀어 올린다
  _allOut() {
    this.allOut = true;
    if (this.def) {   // 수비: 전선은 그대로, 적 증원만 거세진다
      this._banner("적 총공세 — 1분만 버텨라!", "#ff3d5a", 4.5);
      this.say("남은 시간 1분! 적이 총공세로 나옵니다. 버텨요!", 4);
      this.s.game.sound.play("warn");
      return;
    }
    const last = this.plan.length - 1;
    if (this.si < last) {
      for (const o of this.objs) if (o.state === "run" && !o.keep) this._end(o, null);
      if (this.plan[this.si].sec !== this.plan[last].sec) this.cleared++;
      this._stage(last);
    }
    this._banner("총력전 — 적 본진을 돌파하라!", "#ff3d5a", 4.5);
    this.say("남은 시간 1분! 전 병력 총력전, 적 본진으로 밀어붙여요!", 4);
    this.s.game.sound.play("warn");
  }

  // ── 목표 ──
  _add(type, primary) {
    const sc = this.secs[this.secI], f = this["_o_" + type];
    if (!f) return null;
    const o = f.call(this, sc);
    if (!o) return null;
    Object.assign(o, { type, primary, stage: this.si, state: "run", t: 0, icon: OBJ_ICON[type] || "●" });
    if (!o.marks) o.marks = [];
    if (!o.clean) o.clean = () => {};
    this.objs.push(o);
    (this.guideQ || (this.guideQ = [])).push(o);   // 새 목표: 방향 안내선 + 위치 표시 5초
    this.total++;
    return o;
  }
  // ok: true 성공 · false 실패(증원) · null 중단
  _end(o, ok) {
    if (o.state !== "run") return;
    o.state = ok === true ? "ok" : ok === false ? "fail" : "skip";
    if (ok === false && this.A2) { const ep = o.ePts || o.pts || 400; this.m.team[1] += ep; this.s.hud.feed(`적 ${this.def ? "공격" : "수비"} 성공 +${ep}`, "#ff6b5a"); }
    if (o.fin) o.fin(ok);
    const h = this.s.hud;
    if (ok === true) {
      this.done++;
      const pts = o.pts || 400;
      this.m._add(this.me, pts);
      const gift = o.gift ? this._gift(o.gift) : "";
      h.toast(`✔ ${o.name} 완료  +${pts}${gift ? " · " + gift : ""}`, "#35ff7a", 2.2, 24);
      h.feed(`목표 완료 ▸ ${o.name}`, "#35ff7a");
      this.s.game.sound.play("lap");
      if (o.okLine) this.say(o.okLine, 2);
    } else if (ok === false) {
      this.failed++;
      h.toast(`✖ ${o.name} 실패 — 적 증원!`, "#ff6b5a", 2.2, 24);
      h.feed(`목표 실패 ▸ ${o.name}`, "#ff6b5a");
      this.s.game.sound.play("warn");
      this.say(o.failLine || "목표를 놓쳤어요! 적 증원이 몰려옵니다!", 3);
      this._reinforce();
    }
  }
  // 보상: 아이템 · 일시 강화
  _gift(kind) {
    const me = this.me, c = this.c;
    if (!me.alive) return "";
    if (kind === "over") { me.overT = Math.max(me.overT, 15); return "과충전 15초"; }
    if (kind === "shield") { me.shield = SHIELD_HP; me.shieldT = 12; return "실드 12초"; }
    if (kind === "repair") { c.give(me, "repair"); c.give(me, "missiles"); return "수리 · 미사일"; }
    if (kind === "boost") { me.boostT = Math.max(me.boostT, 10); return "부스터 10초"; }
    if (ITEMS[kind]) { if (me.items.length < ITEM_SLOTS || ITEMS[kind].instant) { c.give(me, kind); return ITEMS[kind].name; } me.overT = Math.max(me.overT, 12); return "과충전 12초"; }
    return "";
  }
  _reinforce() {
    this.failBoostT = 45;
    const sc = this.secs[this.secI], mix = MIX[sc.kind];
    const n = this.canSpawn(4);
    for (let i = 0; i < n; i++) this.spawnE(i === 0 ? pick(mix.filter((k) => k !== "swarm")) : pick(["grunt", "ace"]), this.at(sc, rnd(0.2, 1), rnd(-0.8, 0.8), rnd(14, 26)));
  }

  // 점령: 링 안에 머물면 차오른다. 적 드론이 링 안에 있으면 멈춘다
  _o_capture(sc) {
    const p = this._ground(sc, rnd(-0.2, 0.5), rnd(-0.5, 0.5), 10), r = 26, vis = this._zone(p, r, 0xffd24a);
    const o = { name: "정찰 거점 점령", pts: 500, gift: "over", limit: 85 * this.k + 20, prog: 0, contest: false, okLine: "정찰 거점 확보! 적 배치가 보입니다.", failLine: "정찰 거점을 확보하지 못했어요! 적이 몰려옵니다!" };
    o.marks = [{ pos: p.clone().setY(p.y + 8), label: "점령 지역", color: "#ffd24a" }];
    for (let i = 0; i < 2; i++) this.spawnE("grunt", _v.copy(p).add(new V3(rnd(-30, 30), rnd(12, 20), rnd(-30, 30))).clone());
    o.upd = (dt) => {
      const me = this.me, inside = me.alive && Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < r && me.pos.y < p.y + 50;
      o.contest = false;
      for (const a of this.c.actors) if (a.alive && a.kind === "bot" && this.c.hostile(me, a) && !a.cloaked && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r && a.pos.y < p.y + 50) { o.contest = true; break; }
      if (inside && !o.contest) o.prog += dt / (16 * Math.max(0.7, this.k));
      vis.set(o.prog, inside ? (o.contest ? 0xff6b5a : 0x35ff7a) : 0xffd24a, this.s.time);
      if (o.prog >= 1) this._end(o, true);
    };
    o.line = () => ({ text: o.contest ? "적 교전 — 점령 정지" : `점령 ${Math.floor(o.prog * 100)}%`, frac: o.prog, col: o.contest ? "#ff6b5a" : "#ffd24a" });
    o.clean = () => vis.dispose();
    return o;
  }

  // 다지점 방어: 2~3개 아군 송신탑을 동시에 노린다. 하나라도 버티면 성공
  _o_defend(sc) {
    const c = this.c, n = this.m.duration >= 300 ? 3 : 2, pts = [];
    for (let i = 0; i < n; i++) {
      let p = null;
      for (let k = 0; k < 12; k++) { const q = this._ground(sc, rnd(-0.8, 0.3), (i - (n - 1) / 2) * 0.7 + rnd(-0.15, 0.15), 8); if (pts.every((o) => o.pos.distanceTo(q) > 55) || k === 11) { p = q; break; } }
      const core = c.spawnCore(p.x, p.z, 0, { hp: 1200, name: `방어 지점 ${"ABC"[i]}` });   // 코어 체력 3배(요청)
      core.dir = true; core.tag = "dpoint"; core.squad = "p";
      pts.push(core);
    }
    const o = { name: "다지점 방어", pts: 300, gift: "shield", limit: 65 * this.k + 15, wave: 3, warned: new Set(), okLine: "방어 성공! 송신탑이 버텼어요.", failLine: "송신탑이 모두 무너졌어요! 적 증원 접근!" };
    o.pts0 = pts;
    o.upd = (dt) => {
      const live = pts.filter((q) => q.alive);
      if (!live.length) return this._end(o, false);
      for (const q of live) if (q.hp < q.maxHp * 0.5 && !o.warned.has(q)) { o.warned.add(q); this.say(`${q.name}이 공격받고 있어요! 체력 절반!`, 3); }
      if ((o.wave -= dt) <= 0) {
        o.wave = Math.max(6, 11 - this.tier);
        const tgt = pick(live), k = this.canSpawn(2);
        for (let i = 0; i < k; i++) {
          const b = this.spawnE(i ? pick(MIX[sc.kind].filter((x) => x !== "swarm" && x !== "sniper")) : "grunt", _v.copy(tgt.pos).addScaledVector(this.axis, rnd(70, 110)).addScaledVector(this.side, rnd(-40, 40)).clone().setY(tgt.pos.y + rnd(10, 22)), { focus: "dpoint" });
          if (b) b.ai.home = tgt.pos;
        }
      }
      o.marks.length = 0;
      for (const q of live) o.marks.push({ pos: q.pos, label: q.name + (q.flash > 0 ? " ⚠" : ""), color: q.flash > 0 ? "#ff6b5a" : "#5aa9ff" });
    };
    o.timeout = () => { const live = pts.filter((q) => q.alive).length; o.pts = 300 + live * 250; this._end(o, live > 0); };
    o.line = () => ({ text: pts.map((q, i) => `${"ABC"[i]} ${q.alive ? Math.ceil(q.hp / q.maxHp * 100) + "%" : "✕"}`).join("  "), frac: 1 - o.t / o.limit, col: "#8cc4ff", bars: pts.map((q) => (q.alive ? q.hp / q.maxHp : 0)) });
    o.clean = () => { for (const q of pts) this.c.removeActor(q); };
    return o;
  }

  // 수송대 차단: 적 수송기 3기가 구역을 가로지른다. 하나라도 빠져나가면 실패
  _o_intercept(sc) {
    const sgn = Math.random() < 0.5 ? 1 : -1, ts = [];
    const path = [this.at(sc, -0.3, sgn * 1.15, 20), this.at(sc, 0.1, sgn * 0.4, 22), this.at(sc, 0.3, -sgn * 0.4, 22), this.at(sc, 0.6, -sgn * 1.2, 20)];
    for (const p of path) p.y = Math.min(Math.max(p.y, this._top(p.x, p.z) + 10), this.w.ceiling - 20);
    for (let i = 0; i < 3; i++) {
      const p = path[0].clone().addScaledVector(this.axis, (i - 1) * 14).addScaledVector(this.side, -sgn * i * 10);
      const b = this.c.spawnBot({ kind: "gunship", team: 1, pos: p, hpScale: 0.9, name: "적 수송기", temp: true, squad: "e" });
      b.ai.path = path; b.ai.pi = 1; b.convoy = true;
      ts.push(b);
    }
    for (let i = 0; i < this.canSpawn(2); i++) { const e = this.spawnE("grunt", path[0].clone().add(new V3(rnd(-15, 15), 6, rnd(-15, 15)))); if (e) e.ai.home = path[2]; }
    const o = { name: "적 수송대 차단", pts: 700, gift: "repair", escaped: 0, okLine: "수송대 전멸! 적 보급선이 끊겼어요.", failLine: "수송기가 빠져나갔어요! 적 증원이 옵니다!" };
    o.upd = () => {
      for (const b of ts) if (b.alive && b.ai.pi >= path.length) { b.alive = false; this.c.removeActor(b); o.escaped++; this.s.hud.toast("수송기 이탈!", "#ff6b5a", 1.2, 20); }
      const live = ts.filter((b) => b.alive);
      o.marks.length = 0;
      for (const b of live) o.marks.push({ pos: b.pos, label: "수송기", color: "#ff8a3a" });
      if (!live.length) this._end(o, o.escaped === 0);
    };
    o.line = () => ({ text: `수송기 ${ts.filter((b) => b.alive).length}/3${o.escaped ? ` · 이탈 ${o.escaped}` : ""}`, frac: ts.filter((b) => b.alive).reduce((q, b) => q + b.hp / b.maxHp, 0) / 3, col: "#ff8a3a" });
    o.clean = () => { for (const b of ts) if (b.alive) this.c.removeActor(b); };
    return o;
  }

  // 호위: 아군 수송선이 구역을 지나 다음 구역 입구까지. 적은 수송선을 노린다
  _o_escort(sc) {
    const path = [this.at(sc, -1.1, 0.3, 22), this.at(sc, -0.3, -0.25, 22), this.at(sc, 0.4, 0.25, 22), this.at(sc, 1.1, 0, 24)];
    for (const p of path) p.y = Math.min(Math.max(p.y, this._top(p.x, p.z) + 10), this.w.ceiling - 20);
    const b = this.c.spawnBot({ kind: "gunship", team: 0, pos: path[0].clone(), hpScale: 6, name: "아군 수송선 '한빛'", temp: true, squad: "p" });
    b.armor = 0.7;
    b.tag = "escort"; b.ai.path = path; b.ai.pi = 1; b.convoy = true; b.ai.slow = 0.8;
    const o = { name: "아군 수송선 호위", pts: 800, gift: "over", limit: 0, wave: 4, okLine: "수송선 무사 통과! 고마워요!", failLine: "수송선이 격추됐어요! 적 증원 접근!" };
    o.upd = (dt) => {
      if (!b.alive) return this._end(o, false);
      if (b.ai.pi >= path.length) return this._end(o, true);
      o.marks[0] = { pos: b.pos, label: "수송선", color: "#5aa9ff" };
      if ((o.wave -= dt) <= 0) {
        o.wave = 9;
        for (let i = 0; i < this.canSpawn(2); i++) this.spawnE(pick(["grunt", "ace", "kamikaze"]), b.pos.clone().addScaledVector(this.axis, rnd(60, 90)).addScaledVector(this.side, rnd(-40, 40)), { focus: "escort" });
      }
    };
    o.line = () => ({ text: `수송선 ${Math.ceil(b.hp / b.maxHp * 100)}% · 진행 ${Math.round(clamp((b.ai.pi - 1) / (path.length - 1), 0, 1) * 100)}%`, frac: b.hp / b.maxHp, col: "#5aa9ff" });
    o.clean = () => { if (b.alive) this.c.removeActor(b); };
    return o;
  }

  // 현상범 추격: 이름 있는 정예가 내가 다가가면 달아난다. 시간이 지나면 도주
  _o_bounty(sc) {
    const p = this.at(sc, rnd(0.3, 0.9), rnd(-0.7, 0.7), rnd(18, 28));
    const nm = pick(BOUNTY);
    const b = this.c.spawnBot({ kind: "ace", team: 1, pos: p, hpScale: 2.4, name: `현상범 '${nm}'`, temp: true, squad: "e", rank: clampRank(this.c.level + 3) });
    b.bounty = true; b.ai.skill *= 1.15;
    const o = { name: `현상범 '${nm}' 추격`, pts: 900, gift: "boost", limit: 55 * this.k + 15, okLine: `현상범 '${nm}' 격추! 현상금 지급합니다.`, failLine: `'${nm}'이 도주했어요! 놈의 부하들이 몰려옵니다!` };
    o.upd = () => { if (!b.alive) return this._end(o, true); o.marks[0] = { pos: b.pos, label: `☠ ${nm}`, color: "#ffd24a" }; };
    o.fin = (ok) => { if (ok === false && b.alive) { this.c.fx.ring(b.pos, 0xffd24a, 6, 0.5); this.c.removeActor(b); } };
    o.line = () => ({ text: `현상범 체력 ${Math.ceil(b.hp / b.maxHp * 100)}%`, frac: 1 - o.t / o.limit, col: "#ffd24a" });
    o.clean = () => { if (b.alive) this.c.removeActor(b); };
    return o;
  }

  // 포격 경보: 붉은 원이 뜨고 2.4초 뒤 포탄. 두 번 넘게 맞으면 실패. 포탄은 적도 다친다
  _o_bombard() {
    const o = { name: "포격 지대 돌파", pts: 450, gift: "repair", limit: 32 * Math.max(0.8, this.k), hits: 0, next: 4, keep: false, okLine: "포격 지대 통과, 잘 피했어요!", failLine: "포격에 너무 많이 맞았어요! 적이 틈을 노립니다!" };
    o.upd = (dt) => {
      if ((o.next -= dt) > 0) return;
      o.next = rnd(1.6, 2.4);
      const me = this.me;
      if (!me.alive) return;
      const n = Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        _v.copy(me.pos).addScaledVector(me.vel, 2.2 + i * 0.6); _v.x += rnd(-16, 16); _v.z += rnd(-16, 16);
        this._shell(_v, rnd(13, 18), 2.4, 44, 0xff3040, null, (hitMe) => { if (hitMe && o.state === "run") { o.hits++; if (o.hits > 2) this._end(o, false); } });
      }
    };
    o.timeout = () => { o.pts = o.hits === 0 ? 700 : 450; this._end(o, true); };
    o.line = () => ({ text: `피격 ${o.hits}/2 — 붉은 원을 피하세요`, frac: 1 - o.t / o.limit, col: "#ff6b5a" });
    return o;
  }

  // 데이터 코어: 집어서 아군 수신기로. 운반 중 격추되면 그 자리에 떨어진다
  _o_datacore(sc) {
    const p = this._ground(sc, rnd(0.2, 0.8), rnd(-0.8, 0.8), 3);
    const pad = this.m.buildPad(...(() => { const q = this._ground(this.secs[Math.max(0, sc.i - 1)], sc.i ? 0.6 : -0.6, rnd(-0.3, 0.3), 0); return [q.x, q.z]; })(), 0);
    this.gfx.push(pad.g);
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x40e0ff).multiplyScalar(2.2) });
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), mat), ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.1, 6, 28), mat);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 50, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = 25; g.add(gem, ring, beam); g.position.copy(p); this.w.scene.add(g);
    for (let i = 0; i < this.canSpawn(2); i++) { const e = this.spawnE(pick(MIX[sc.kind].filter((k) => k !== "swarm")), p.clone().add(new V3(rnd(-25, 25), rnd(12, 20), rnd(-25, 25)))); if (e) e.ai.home = p; }
    const pos = p.clone(), pl = this.s.player;
    const o = { name: "데이터 코어 회수", pts: 650, gift: "emp", limit: 80 * this.k + 20, carry: false, okLine: "데이터 수신 완료! 적 배치도를 받았어요.", failLine: "데이터 코어를 놓쳤어요! 적이 눈치챘습니다!" };
    o.upd = (dt) => {
      const me = this.me;
      gem.rotation.y += dt * 2; ring.rotation.x += dt * 1.4;
      if (o.carry) {
        if (!me.alive) { o.carry = false; pl.body.extraMass = 0; pos.copy(me.pos); pos.y = this.w.h(pos.x, pos.z) + 3; g.position.copy(pos); beam.visible = true; g.scale.setScalar(1); this.s.hud.toast("데이터 코어 떨어뜨림!", "#ff6b5a", 1.4, 20); }
        else {
          pos.copy(me.pos); pos.y -= 1.6; g.position.copy(pos); beam.visible = false; g.scale.setScalar(0.4); g.visible = pl.camMode !== "fpv";
          if (Math.hypot(me.pos.x - pad.pos.x, me.pos.z - pad.pos.z) < pad.r + 1 && me.pos.y - pad.pos.y < 14) this._end(o, true);
        }
      } else if (me.alive && me.pos.distanceTo(pos) < 5.5) {
        o.carry = true; pl.body.extraMass = pl.body.spec.mass * 0.3; this.s.game.sound.play("pickup");
        this.s.hud.toast("데이터 코어 확보 — 수신기로!", "#40e0ff", 1.6, 22);
      }
      o.marks[0] = o.carry ? { pos: pad.pos.clone().setY(pad.pos.y + 4), label: "아군 수신기", color: "#35ff7a" } : { pos, label: "데이터 코어", color: "#40e0ff" };
    };
    o.fin = () => { pl.body.extraMass = 0; };
    o.line = () => ({ text: o.carry ? "운반 중 — 수신기로" : "코어 회수", frac: 1 - o.t / o.limit, col: "#40e0ff" });
    o.clean = () => { pl.body.extraMass = 0; this.w.scene.remove(g, pad.g); gem.geometry.dispose(); ring.geometry.dispose(); beam.geometry.dispose(); mat.dispose(); beam.material.dispose(); };
    return o;
  }

  // 거대 병기 강습: 거신(titan)이 구역 앞쪽에서 아군 쪽으로 진군. titan 이 아직 없으면 거대로봇(mech) 보스로
  _o_titan(sc) {
    const c = this.c, p = this._ground(sc, 0.85, rnd(-0.3, 0.3), 0);
    const march = [this.at(sc, 0.2, 0, 0), this.at(sc, -0.6, 0, 0), this.at(this.secs[Math.max(0, sc.i - 1)], 0, 0, 0)];
    let b = null;
    try { b = c.units.spawn("titan", { pos: p, march, target: march[march.length - 1], name: "거신 병기" }); } catch (e) { b = null; }
    if (!b) b = c.units.spawn("mech", { pos: p, name: "강습 거대로봇", hp: 2.2, home: p });
    const u = b.unit;
    for (const a of [b, ...(u ? u.parts : [])]) a.squad = "e";
    this.titanM = u && !u.march ? { u, pts: march, i: 0 } : null;   // 진군 경로를 모르는 유닛이면 집 좌표를 차례로 옮긴다
    this.m.bossIntro(b, b.name, "거대 병기 강습", false);
    this._collapse(sc);
    const o = { name: "거대 병기 저지", pts: 1500, gift: "over", keep: false, okLine: "거대 병기 격파! 대단해요!", failLine: "" };
    o.upd = () => {
      if (!b.alive) return this._end(o, true);
      const M = this.titanM;
      if (M && M.i < M.pts.length) { const g = M.u.group.position; M.u.home.copy(M.pts[M.i]); if (Math.hypot(g.x - M.pts[M.i].x, g.z - M.pts[M.i].z) < 28) M.i++; }
      o.marks[0] = { pos: b.pos, label: b.name, color: "#ff3d4d" };
    };
    o.line = () => ({ text: `거대 병기 ${Math.ceil(b.hp / b.maxHp * 100)}%`, frac: b.hp / b.maxHp, col: "#ff3d4d" });
    return o;
  }

  // 적 본진 돌파: 방어막이 내려가고 코어를 부수면 승리. 함대가 있으면 적 기함도 표적
  _o_base() {
    const base = this.base, core = base.core;
    core.invulnerable = false;
    if (this.baseDome) { this.w.scene.remove(this.baseDome); }
    this.c.fx.ring(core.pos, 0xff5a66, 18, 0.8);
    const fl = this.m.fleet, ship = fl && fl.ships ? fl.ships.find((sh) => sh.side && !sh.dead && sh.actor && sh.actor.alive) : null;
    const o = { name: "적 본진 코어 파괴", pts: 2500, gift: "", keep: true, ship, okLine: "적 본진 붕괴! 우리가 이겼어요!" };
    this.say(ship ? "본진 방어막 해제! 코어를 부숴요 — 적 기함도 노릴 수 있어요!" : "본진 방어막 해제! 지금이에요, 코어를 부숴요!", 4);
    for (let i = 0; i < this.canSpawn(3); i++) this.spawnE(pick(["shield", "grunt", "ace"]), core.pos.clone().add(new V3(rnd(-40, 40), rnd(14, 24), rnd(-40, 40))), { focus: null });
    o.upd = () => {
      if (!core.alive) { this._end(o, true); this.victory = true; this.m.endT = 3.5; this._banner("적 본진 돌파!", "#35ff7a", 4); return; }
      o.marks.length = 0;
      o.marks.push({ pos: core.pos, label: "적 본진 코어", color: "#ff5a66" });
      if (o.ship && o.ship.actor.alive && !o.ship.dead) o.marks.push({ pos: o.ship.actor.pos, label: o.ship.name || "적 기함", color: "#ffb02e" });
      else if (o.ship && !o.shipDown) { o.shipDown = true; this.m._add(this.me, 2000); this.s.hud.toast("적 기함 격침!  +2000", "#ffd24a", 2.2, 26); this.done++; this.total++; }
    };
    o.line = () => ({ text: `본진 코어 ${Math.ceil(core.hp / core.maxHp * 100)}%${o.ship ? (o.shipDown ? " · 기함 ✕" : ` · 기함 ${Math.ceil(o.ship.actor.hp / o.ship.actor.maxHp * 100)}%`) : ""}`, frac: core.hp / core.maxHp, col: "#ff5a66" });
    return o;
  }

  // ── 공방전 목표 ──
  // 거점 격파(공격): 구역 곳곳의 적 시설 3곳(레이더·발전기·통신소)을 부순다. 시설마다 포탑 하나가 지킨다
  _o_strike(sc) {
    const c = this.c, names = ["적 레이더", "적 발전기", "적 통신소"], T = [];
    for (let i = 0; i < 3; i++) {
      let p = null;
      for (let k = 0; k < 12; k++) { const q = this._ground(sc, rnd(-0.3, 0.8), (i - 1) * 0.65 + rnd(-0.12, 0.12), 8); if (T.every((t) => t.pos.distanceTo(q) > 50) || k === 11) { p = q; break; } }
      const core = c.spawnCore(p.x, p.z, 1, { hp: 1100, name: names[i] });
      core.dir = true; core.pts = 500; core.squad = "e";
      const tr = c.spawnTurret(p.x + 14, p.z + 6, 1, { name: names[i] + " 포탑" }); tr.squad = "e"; tr.dir = true;
      T.push(core); core.guard = tr;
    }
    const o = { name: "적 시설 격파", pts: 600, ePts: 800, gift: "missiles", limit: 95 * this.k + 25, okLine: "적 시설 모두 격파! 본진으로 갑니다!", failLine: "시설을 다 부수지 못했어요! 적이 몰려옵니다!" };
    o.upd = () => {
      const live = T.filter((t) => t.alive);
      if (!live.length) return this._end(o, true);
      o.marks.length = 0;
      for (const t of live) o.marks.push({ pos: t.pos, label: t.name, color: "#ff8a3a" });
    };
    o.line = () => ({ text: T.map((t) => `${t.name.slice(2)} ${t.alive ? Math.ceil(t.hp / t.maxHp * 100) + "%" : "✕"}`).join(" · "), frac: 1 - o.t / o.limit, col: "#ff8a3a", bars: T.map((t) => (t.alive ? t.hp / t.maxHp : 0)) });
    o.clean = () => { for (const t of T) { if (t.alive) c.removeActor(t); if (t.guard && t.guard.alive) c.removeActor(t.guard); } };
    return o;
  }

  // 점령 방어(수비): 적 점령조가 링 안으로 몰려와 게이지를 채운다. 링 안 적을 쫓아내고, 아무도 없으면 내가 서서 되돌린다
  _o_hold(sc) {
    const p = this._ground(sc, rnd(-0.4, 0.2), rnd(-0.4, 0.4), 10), r = 26, vis = this._zone(p, r, 0x5aa9ff), goal = p.clone().setY(p.y + 10);
    const o = { name: "점령 저지", pts: 700, ePts: 900, gift: "shield", limit: 70 * this.k + 20, prog: 0, n: 0, wave: 2, okLine: "점령 저지 성공! 거점을 지켰어요.", failLine: "적이 거점을 점령했어요! 방어선이 밀립니다!" };
    o.marks = [{ pos: goal, label: "방어 지역", color: "#5aa9ff" }];
    o.upd = (dt) => {
      if ((o.wave -= dt) <= 0) {   // 점령조 투입: 링을 향해 곧장 날아온다
        o.wave = Math.max(8, 13 - this.tier);
        for (let i = 0, k = this.canSpawn(2); i < k; i++) {
          const b = this.spawnE(i ? pick(["shield", "grunt", "ace"]) : "grunt", _v.copy(p).addScaledVector(this.axis, rnd(90, 130)).addScaledVector(this.side, rnd(-50, 50)).clone().setY(p.y + rnd(14, 24)));
          if (b) { b.ai.path = [goal]; b.ai.pi = 0; b.capper = true; }
        }
      }
      const me = this.me, inside = me.alive && Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < r && me.pos.y < p.y + 50;
      let n = 0;
      for (const a of this.c.actors) if (a.alive && a.kind === "bot" && a.team === 1 && !a.cloaked && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r && a.pos.y < p.y + 50) n++;
      o.n = n;
      if (n) o.prog += dt * Math.min(3, n) / (34 * Math.max(0.7, this.k));
      else if (inside) o.prog = Math.max(0, o.prog - dt / 12);
      vis.set(o.prog, n ? 0xff6b5a : inside ? 0x35ff7a : 0x5aa9ff, this.s.time);
      if (o.prog >= 1) this._end(o, false);
    };
    o.timeout = () => this._end(o, true);
    o.line = () => ({ text: o.n ? `적 ${o.n}기 점령 중 ${Math.floor(o.prog * 100)}%` : `적 점령 ${Math.floor(o.prog * 100)}%`, frac: 1 - o.prog, col: o.n ? "#ff6b5a" : "#5aa9ff" });
    o.clean = () => vis.dispose();
    return o;
  }

  // 침투 저지(수비): 적 침투 수송기 3기가 아군 쪽으로 파고든다. 하나라도 뒤로 빠져나가면 실패
  _o_dintercept(sc) {
    const sgn = Math.random() < 0.5 ? 1 : -1, ts = [];
    const path = [this.at(sc, 1.1, sgn * 0.9, 20), this.at(sc, 0.4, sgn * 0.3, 22), this.at(sc, -0.3, -sgn * 0.3, 22), this.at(sc, -1.2, -sgn * 0.8, 20)];
    for (const p of path) p.y = Math.min(Math.max(p.y, this._top(p.x, p.z) + 10), this.w.ceiling - 20);
    for (let i = 0; i < 3; i++) {
      const p = path[0].clone().addScaledVector(this.axis, (i - 1) * 14).addScaledVector(this.side, -sgn * i * 10);
      const b = this.c.spawnBot({ kind: "gunship", team: 1, pos: p, hpScale: 0.9, name: "적 침투기", temp: true, squad: "e" });
      b.ai.path = path; b.ai.pi = 1; b.convoy = true; b.ai.slow = 0.85;
      ts.push(b);
    }
    for (let i = 0; i < this.canSpawn(2); i++) { const e = this.spawnE("grunt", path[0].clone().add(new V3(rnd(-15, 15), 6, rnd(-15, 15)))); if (e) e.ai.home = path[2]; }
    const o = { name: "적 침투 저지", pts: 700, ePts: 1000, gift: "repair", escaped: 0, okLine: "침투조 전멸! 잘 막았어요.", failLine: "침투기가 방어선을 뚫었어요!" };
    o.upd = () => {
      for (const b of ts) if (b.alive && b.ai.pi >= path.length) { b.alive = false; this.c.removeActor(b); o.escaped++; this.s.hud.toast("침투기 돌파!", "#ff6b5a", 1.2, 20); }
      const live = ts.filter((b) => b.alive);
      o.marks.length = 0;
      for (const b of live) o.marks.push({ pos: b.pos, label: "침투기", color: "#ff8a3a" });
      if (!live.length) this._end(o, o.escaped === 0);
    };
    o.line = () => ({ text: `침투기 ${ts.filter((b) => b.alive).length}/3${o.escaped ? ` · 돌파 ${o.escaped}` : ""}`, frac: ts.filter((b) => b.alive).reduce((q, b) => q + b.hp / b.maxHp, 0) / 3, col: "#ff8a3a" });
    o.clean = () => { for (const b of ts) if (b.alive) this.c.removeActor(b); };
    return o;
  }

  // 본진 사수(수비 마지막): 방어막이 내려간 아군 본진 코어를 시간 끝까지 지킨다
  _o_hq() {
    const core = this.base.core;
    core.invulnerable = false;
    if (this.baseDome) this.w.scene.remove(this.baseDome);
    this.c.fx.ring(core.pos, 0x5aa9ff, 18, 0.8);
    const o = { name: "아군 본진 사수", pts: 1500, keep: true, wave: 3, okLine: "" };
    this.say("본진 방어막이 꺼졌어요! 끝까지 코어를 지켜요!", 4);
    o.upd = (dt) => {
      if (!core.alive) { this._end(o, false); this.lost = true; this.m.endT = 3.5; this._banner("아군 본진 함락…", "#ff6b5a", 4); return; }
      if ((o.wave -= dt) <= 0) {
        o.wave = this.allOut ? 6 : 9;
        for (let i = 0, k = this.canSpawn(3); i < k; i++) this.spawnE(pick(["grunt", "ace", "shield", "kamikaze"]), core.pos.clone().addScaledVector(this.axis, rnd(90, 140)).addScaledVector(this.side, rnd(-60, 60)).setY(core.pos.y + rnd(14, 26)), { focus: "hq", home: core.pos });
      }
      o.marks[0] = { pos: core.pos, label: "아군 본진 코어" + (core.flash > 0 ? " ⚠" : ""), color: core.flash > 0 ? "#ff6b5a" : "#5aa9ff" };
    };
    o.line = () => ({ text: `본진 코어 ${Math.ceil(core.hp / core.maxHp * 100)}%`, frac: core.hp / core.maxHp, col: "#5aa9ff" });
    return o;
  }

  // 소탕: 목표 실패 뒤 구역 안 적 n기 격추
  _o_clear(sc) {
    const need = 3 + Math.min(3, this.tier);
    const o = { name: `구역 소탕 (적 ${need}기)`, pts: 300, gift: "repair", need, got: 0, limit: 22 + 30 * this.k, okLine: "구역 정리 완료. 전진합니다!" };
    o.onKill = (a) => { if (a.kind === "bot" && Math.hypot(a.pos.x - sc.c.x, a.pos.z - sc.c.z) < this.L / this.N + this.halfW) o.got++; if (o.got >= need) this._end(o, true); };
    o.upd = () => {};
    o.timeout = () => this._end(o, null);
    o.line = () => ({ text: `격추 ${o.got}/${need}`, frac: o.got / need, col: "#ffb02e" });
    return o;
  }

  // ── 적 생성 ──
  canSpawn(n = 1) {
    let alive = 0;
    for (const a of this.c.actors) if (a.alive && a.kind === "bot" && (this.ffa ? a.squad !== "p" : a.team === 1)) alive++;
    return Math.max(0, Math.min(n, this.cap - alive));
  }
  _count(kind) { let n = 0; for (const a of this.c.actors) if (a.alive && a.botKind === kind && a.temp) n++; return n; }
  spawnE(kind, pos, o = {}) {
    const c = this.c, sc = this.secs[this.secI];
    if (kind === "swarm") { let last = null; for (let i = 0; i < this.canSpawn(4); i++) last = this.spawnE("kamikaze", pos.clone().add(new V3(rnd(-8, 8), rnd(-3, 3), rnd(-8, 8))), o); return last; }
    if (LIMIT[kind] && this._count(kind) >= LIMIT[kind]) kind = "grunt";
    if (!this.canSpawn(1)) return null;
    const P = pos.clone();
    if (kind === "sniper") { const pp = sc.perches.find((q) => !c.actors.some((a) => a.alive && a.ai && a.ai.perch === q)); if (pp) P.copy(pp); }
    if (kind === "stealth" && sc.covers.length) P.copy(pick(sc.covers)).y += rnd(3, 8);
    P.y = Math.min(Math.max(P.y, this.w.h(P.x, P.z) + 6), this.w.ceiling - 15);
    for (let i = 0; i < 10 && this.w.col.blocked(P, 2.5); i++) P.y += 4;
    const b = c.spawnBot({ kind, team: 1, pos: P, temp: true, squad: "e", hpScale: kind === "grunt" ? 100 / 70 : 1, focus: o.focus, rank: o.rank, name: o.name });
    b.ai.home = o.home || sc.c;
    if (kind === "sniper") { b.ai.perch = P.clone(); b.ai.range = 130; }
    this.spawned = (this.spawned || 0) + 1;
    return b;
  }
  // 주기적인 적 투입: 구역 성격에 맞는 구성. 위협 단계가 높을수록 자주
  _spawner(dt) {
    if (this.pause > 0 && !this.allOut) return;   // 단계 사이 정비 시간에는 증원 없음
    if ((this.spawnT -= dt) > 0) return;
    this.spawnT = this.allOut ? 5 : Math.max(8, 19 - this.tier * 2.2);
    if (!this.canSpawn(1)) return;
    const sc = this.secs[this.secI], kind = pick(MIX[sc.kind]);
    let p = null;
    for (let i = 0; i < 6; i++) { p = this.at(sc, rnd(0.1, 1), rnd(-0.85, 0.85), rnd(14, 28)); if (p.distanceTo(this.me.pos) > 70) break; }
    this.spawnE(kind, p);
  }
  // 리스폰 지점: 적은 지금 구역 앞쪽, 나·아군은 구역 뒤쪽 (전선이 움직이면 함께)
  spawnPoint(a) {
    const sc = this.secs[Math.max(0, this.secI)];
    if (a.isPlayer || (!this.ffa && a.team === 0)) {
      const p = this.at(sc, -1.05, rnd(-0.3, 0.3), a.isPlayer ? 2 : rnd(10, 16));
      for (let i = 0; i < 12 && this.w.col.blocked(p, 1.8); i++) p.y += 3;
      return { pos: p, yaw: Math.atan2(-this.axis.x, -this.axis.z) };
    }
    if (this.ffa && a.squad !== "e") return null;   // 개인전 원래 편성: 기존 규칙(멀리 떨어진 곳)
    const p = this.at(sc, rnd(0.3, 1), rnd(-0.8, 0.8), rnd(12, 24));
    for (let i = 0; i < 12 && this.w.col.blocked(p, 2.5); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(this.axis.x, this.axis.z) };
  }
  // 드론 목표: 수송 경로 · 현상범 도주 · 숨은 정예 대기 · 구역 밖이면 구역으로
  botGoal(a) {
    const ai = a.ai, me = this.me;
    if (ai.path) {
      const q = ai.path[ai.pi];
      if (q && Math.hypot(q.x - a.pos.x, q.z - a.pos.z) < 14) ai.pi++;
      return ai.path[Math.min(ai.pi, ai.path.length - 1)];
    }
    if (a.dormant) {
      if (me.alive && (me.pos.distanceTo(a.pos) < 70 || a.hp < a.maxHp)) { a.dormant = false; this.s.hud.toast(`${a.name} 기동!`, "#c77dff", 1.4, 20); }
      else return ai.home;
    }
    if (a.bounty && me.alive) {
      const d = me.pos.distanceTo(a.pos);
      if (d < 50) return null;   // 몰리면 맞서 싸운다
      if (d < 160) {
        const g = ai.flee || (ai.flee = new V3());
        if (!ai.fleeT || this.s.time > ai.fleeT || a.pos.distanceTo(g) < 15) {
          ai.fleeT = this.s.time + 2.5;
          _v.copy(a.pos).sub(me.pos).setY(0).normalize();
          const lim = this.w.size - 30, ang = rnd(-0.8, 0.8), cs = Math.cos(ang), sn = Math.sin(ang);
          g.set(clamp(a.pos.x + (_v.x * cs - _v.z * sn) * 70, -lim, lim), 0, clamp(a.pos.z + (_v.x * sn + _v.z * cs) * 70, -lim, lim));
          g.y = Math.min(this.w.ceiling - 20, Math.max(this._top(g.x, g.z) + 8, a.pos.y));
        }
        return g;
      }
    }
    if (!ai.target && (this.ffa ? a.squad === "e" : a.team === 1) && ai.home) {
      if (Math.hypot(ai.home.x - a.pos.x, ai.home.z - a.pos.z) > this.L / this.N * 0.9) return _w.copy(ai.home).setY(Math.max(ai.home.y, this.w.h(ai.home.x, ai.home.z)) + 18);
    }
    return null;
  }
  onKill(a, k) {
    for (const o of this.objs) if (o.state === "run" && o.onKill) o.onKill(a, k);
    if (a.hiddenElite && k === this.me) { this.m._add(this.me, 800); this.s.hud.toast(`숨은 정예 격추!  +800 · ${this._gift("shield")}`, "#c77dff", 2.2, 24); this.foundN++; }
    return a.dir === true;
  }

  // ── 숨은 발견물: 보급 캐시 · 파손된 포탑 · 숨은 정예 (매 판 다른 자리, 축에서 먼 곳·구조물 틈) ──
  _finds() {
    this.finds = []; this.foundN = 0;
    const cand = [];
    for (const sc of this.secs) {
      for (const p of sc.covers) cand.push(p);
      for (let i = 0; i < 4; i++) cand.push(this.at(sc, rnd(-0.9, 0.9), (Math.random() < 0.5 ? -1 : 1) * rnd(0.75, 1.0), 4));
    }
    cand.sort(() => Math.random() - 0.5);
    const start = this.at(this.secs[0], -1.05, 0, 0);
    const types = ["cache", "turret", "elite", this.m.duration >= 300 ? "cache" : null].filter(Boolean);
    const pts = [];
    for (const q of cand) {
      if (pts.length >= types.length) break;
      if (this.w.def.land && !this.w.def.land(q.x, q.z)) continue;
      if (pts.some((p) => p.distanceTo(q) < 90) || q.distanceTo(start) < 150 || q.distanceTo(this.B) < 70) continue;
      // 축에서 떨어진 곳을 우선
      const off = Math.abs(_v.copy(q).sub(this.A).dot(this.side));
      if (off < this.halfW * 0.35 && Math.random() < 0.7) continue;
      pts.push(q.clone());
    }
    types.forEach((t, i) => { if (pts[i]) this._find(t, pts[i]); });
  }
  _find(type, p) {
    const c = this.c, w = this.w, f = { type, pos: p.clone(), found: false, hint: false, t: 0 };
    p.y = w.h(p.x, p.z);
    if (type === "cache") {
      const g = new THREE.Group(), m1 = new THREE.MeshLambertMaterial({ color: 0x5a6a4a }), m2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x35ff7a).multiplyScalar(2) });
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.5), m1); box.position.y = 0.65; box.castShadow = true;
      const st = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.16, 1.54), m2); st.position.y = 0.95;
      g.add(box, st); g.position.copy(p); g.rotation.y = rnd(0, 6); w.scene.add(g); this.gfx.push(g);
      f.g = g; f.pos.copy(p).setY(p.y + 1); f.name = "보급 캐시";
    } else if (type === "turret") {
      const t = c.spawnTurret(p.x, p.z, 0, { name: "수리한 포탑", range: 110, hp: 260 });
      t.targetable = false; t.invulnerable = true; t.radarHide = true; t.dir = true; t.squad = "p"; t.head.rotation.x = 0.55;
      f.a = t; f.pos.copy(t.pos); f.name = "파손된 포탑"; f.rep = 0;
    } else {
      const b = this.spawnE("stealth", p.clone().setY(p.y + 6), { rank: clampRank(c.level + 3), name: "숨은 정예 '그림자'", home: p.clone().setY(p.y + 8) });
      if (!b) return;
      b.hp = b.maxHp = b.maxHp * 1.8; b.dormant = true; b.hiddenElite = true; b.temp = false;
      f.a = b; f.name = "숨은 정예";
    }
    this.finds.push(f);
  }
  _findTick(dt) {
    const me = this.me;
    if (!me.alive) return;
    for (const f of this.finds) {
      if (f.found) continue;
      if (f.type === "elite") { if (f.a && !f.a.dormant) { f.found = true; } else if (f.a) f.pos.copy(f.a.pos); }
      const d = me.pos.distanceTo(f.pos);
      if (!f.hint && d < 110) { f.hint = true; this.s.hud.toast("? 미확인 신호 감지 — 주변을 살펴보세요", "#c77dff", 1.8, 18); this.s.game.sound.play("lock", 0.4); }
      if (f.type === "cache" && d < 7) {
        f.found = true; this.foundN++;
        this.m._add(me, 300); this.c.give(me, "repair"); this.c.give(me, "missiles");
        this.s.hud.toast("숨은 보급 캐시 발견!  +300 · 수리 · 미사일", "#35ff7a", 2.2, 24); this.s.game.sound.play("pickup");
        this.c.fx.ring(f.pos, 0x35ff7a, 6, 0.5); f.g.visible = false;
      } else if (f.type === "turret") {
        if (d < 13) {
          f.rep += dt;
          if (f.rep >= 2.5) {
            f.found = true; this.foundN++;
            const t = f.a; t.targetable = true; t.invulnerable = false; t.radarHide = false; t.hp = t.maxHp; t.head.rotation.x = 0;
            this.m._add(me, 250);
            this.s.hud.toast("포탑 수리 완료 — 아군으로 합류!  +250", "#5aa9ff", 2.2, 24); this.s.game.sound.play("lap");
            this.c.fx.ring(t.pos, 0x5aa9ff, 8, 0.5);
          }
        } else f.rep = Math.max(0, f.rep - dt);
      }
    }
  }

  // ── 아군 화력 지원: 지금 구역 안의 표적을 락온하면 기함 포격(fleet.js 가 지원하면) 또는 포병 사격 ──
  _support(dt) {
    if ((this.supportCD -= dt) > 0) return;
    const c = this.c, t = c.lock;
    if (!t || !t.alive || c.lockT < c.lockNeed || t.static && t.invulnerable) return;
    const sc = this.secs[this.secI];
    if (Math.abs(_v.copy(t.pos).sub(sc.c).dot(this.axis)) > this.L / this.N * 0.75) return;
    this.supportCD = 32;
    const fl = this.m.fleet;
    if (fl && fl.supportStrike && fl.supportStrike(t) !== false) { this.say("기함 화력 지원! 표적에 포격 들어갑니다!", 2); this.supports = (this.supports || 0) + 1; return; }
    this.say("포병 지원 사격 — 표적 주변에서 떨어져요!", 2);
    this.supports = (this.supports || 0) + 1;
    for (let i = 0; i < 3; i++) {
      const p = t.pos.clone().add(new V3(rnd(-7, 7), 0, rnd(-7, 7)));
      this._shell(p, 11, 1.8 + i * 0.35, 70, 0x5ab4ff, this.me, null, t);
    }
  }

  // 포탄: 경고 원 → 지연 후 폭발. owner 가 있으면 그 편의 적에게만, 없으면 모두에게 (아군 포격은 follow 표적 위치로)
  _shell(pos, r, delay, dmg, col, owner, cb, follow = null) {
    const L = this.shells || (this.shells = []);
    if (L.length >= 10) return;
    const vis = this._warnRing(col);
    L.push({ pos: pos.clone(), r, t: 0, delay, dmg, owner, cb, follow, vis });
  }
  _shellTick(dt) {
    const L = this.shells;
    if (!L || !L.length) return;
    const c = this.c, me = this.me;
    for (let i = L.length - 1; i >= 0; i--) {
      const s = L[i];
      s.t += dt;
      if (s.follow && s.follow.alive && s.t < s.delay - 0.6) { s.pos.x = s.follow.pos.x + (s.pos.x - s.follow.pos.x) * 0.98; s.pos.z = s.follow.pos.z + (s.pos.z - s.follow.pos.z) * 0.98; }
      const gy = this.w.h(s.pos.x, s.pos.z);
      s.vis.place(s.pos.x, gy, s.pos.z, s.r, s.t / s.delay, this.s.time);
      if (s.t < s.delay) continue;
      s.vis.free();
      L.splice(i, 1);
      const top = s.follow && s.follow.alive ? Math.max(gy + 1, s.follow.pos.y) : me.alive && Math.hypot(me.pos.x - s.pos.x, me.pos.z - s.pos.z) < s.r * 1.5 ? me.pos.y : gy + 2;
      _v.set(s.pos.x, top, s.pos.z);
      c.fx.explosion(_v, 2.0); c.fx.flash(_v, 0xffd0a0, s.r, 0.25);
      if (top - gy > 6) { _w.set(s.pos.x, gy + 1, s.pos.z); c.fx.explosion(_w, 1.4); }
      c.snd.playAt("explode", _v, this.s.camera, 1);
      c._blast(_v, 2);
      let hitMe = false;
      for (const a of c.actors.slice()) {
        if (!a.alive || a.static || (a.kind !== "bot" && a.kind !== "player")) continue;
        if (Math.hypot(a.pos.x - s.pos.x, a.pos.z - s.pos.z) > s.r || a.pos.y > gy + 90) continue;
        if (s.owner && !c.hostile(s.owner, a)) continue;
        const hp0 = a.hp;
        c.damage(a, s.dmg, s.owner, _v);
        if (a === me && a.hp < hp0) hitMe = true;
      }
      if (s.cb) s.cb(hitMe);
    }
  }

  // ── 위협 단계 ──
  _tier(dt) {
    if (this.failBoostT > 0) this.failBoostT -= dt;
    const n = this.plan.length;
    let t = 1 + Math.round(this.si / Math.max(1, n - 1) * 3);
    if (this.failBoostT > 0) t++;
    if (this.allOut) t = 5;
    this.tier = clamp(t, 1, 5);
    if (this.tier > this.maxTier) { this.maxTier = this.tier; if (this.tier >= 3) this.s.hud.feed(`위협 단계 ${ROMAN[this.tier - 1]} · ${TIER_NAME[this.tier - 1]}`, TIER_COL[this.tier - 1]); }
    this.c.musicFloor = MUSIC_FLOOR[this.tier - 1];
  }

  // ── 연출 ──
  say(line, prio = 2) { if (this.s.radioSay) this.s.radioSay("관제", line, { prio, ttl: 7, force: prio >= 3 }); }
  _banner(text, col, dur = 3.4) { this.banner = { text, col }; this.bannerT = dur; }
  _fx(dt) {
    this._shellTick(dt);
    // 전선 표지: 새 구역 중심의 빛 기둥 (몇 초)
    const bk = this.beacon;
    if (bk) { bk.t += dt; bk.m.material.opacity = 0.22 * Math.min(1, bk.t * 2) * Math.max(0, 1 - bk.t / 9); bk.m.scale.x = bk.m.scale.z = 1 + bk.t * 0.08; if (bk.t > 9) bk.m.visible = false; }
    const sl = this.slab;
    if (sl) {
      sl.t += dt;
      if (sl.t < sl.fall) { const k = sl.t / sl.fall; sl.m.position.y = sl.y0 + (sl.y1 - sl.y0) * k * k; sl.m.rotation.x = sl.rx * k; sl.m.rotation.z = sl.rz * k; }
      else if (!sl.hit) { sl.hit = true; this.c.fx.explosion(sl.m.position, 2.2); this.c.fx.debrisBurst(sl.m.position, 0x6b6f78, 18, 14, 0.6); this.c._blast(sl.m.position, 2.5); this.c.snd.playAt("explode", sl.m.position, this.s.camera, 1); }
      else sl.m.position.y -= dt * 0.6;
      if (sl.t > 12) { this.w.scene.remove(sl.m); sl.m.geometry.dispose(); this.slab = null; }
    }
    if (this.booms) for (let i = this.booms.length - 1; i >= 0; i--) { const b = this.booms[i]; if ((b.t -= dt) <= 0) { this.c.fx.explosion(b.p, b.k); this.c.fx.debrisBurst(b.p, 0x7a7468, 8, 10, 0.4); this.c.snd.playAt("explode", b.p, this.s.camera, 0.7); this.booms.splice(i, 1); } }
  }
  _advanceFx(sc) {
    if (!this.beaconM) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 220, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x35ff7a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.w.scene.add(m); this.gfx.push(m); this.beaconM = m;
    }
    const m = this.beaconM;
    m.position.set(sc.c.x, sc.c.y + 110, sc.c.z); m.visible = true;
    this.beacon = { m, t: 0 };
    // 지나온 구역의 구조물 하나가 무너진다 (연출)
    const prev = this.secs[Math.max(0, sc.i - 1)];
    if (prev !== sc) this._collapse(prev);
  }
  // 구조물 붕괴: 연쇄 폭발 + 떨어지는 콘크리트 판 + 연기 기둥 (판정 없는 연출)
  _collapse(sc) {
    const me = this.me;
    let p = null;
    const L = sc.structs.length ? sc.structs : sc.perches;
    for (const q of L.slice().sort(() => Math.random() - 0.5)) { if (!me || q.distanceTo(me.pos) > 40) { p = q; break; } }
    if (!p) return;
    const top = this._top(p.x, p.z), gy = this.w.h(p.x, p.z);
    this.booms = this.booms || [];
    for (let i = 0; i < 5; i++) this.booms.push({ t: i * 0.32, p: new V3(p.x + rnd(-5, 5), gy + (top - gy) * (1 - i / 5) + 2, p.z + rnd(-5, 5)), k: 1.6 + Math.random() });
    if (!this.slab) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(rnd(7, 11), 2.4, rnd(7, 11)), this._slabMat || (this._slabMat = new THREE.MeshLambertMaterial({ color: 0x8a8a8e })));
      m.position.set(p.x, top + 2, p.z); m.castShadow = true; this.w.scene.add(m);
      this.slab = { m, t: -1.2, fall: 1.7, y0: top + 2, y1: gy + 1.2, rx: rnd(-0.6, 0.6), rz: rnd(-0.6, 0.6) };
    }
    if (this.m.ambience) this.m.ambience.wreck(new V3(p.x, gy, p.z), 3);
    this.collapses = (this.collapses || 0) + 1;
    if (me && p.distanceTo(me.pos) < 300) this.say("구조물 붕괴! 파편 조심하세요!", 2);
  }

  // 점령 링 (지면 링 + 반투명 벽)
  _zone(p, r, col) {
    const g = new THREE.Group();
    const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.4, 6, 72), ringM); ring.rotation.x = Math.PI / 2;
    const wallM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 34, 48, 1, true), wallM); wall.position.y = 17;
    g.add(ring, wall); g.position.set(p.x, p.y + 0.6, p.z); this.w.scene.add(g);
    return {
      set: (k, c2, t) => { ringM.color.setHex(c2).multiplyScalar(2); wallM.color.setHex(c2); wallM.opacity = 0.07 + 0.05 * Math.sin(t * 3) + k * 0.12; wall.scale.y = 0.3 + 0.7 * Math.max(0.05, k); wall.position.y = 17 * wall.scale.y; },
      dispose: () => { this.w.scene.remove(g); ring.geometry.dispose(); wall.geometry.dispose(); ringM.dispose(); wallM.dispose(); },
    };
  }
  // 포격 경고 원 (재사용 풀)
  _warnRing(col) {
    const P = this.ringPool || (this.ringPool = []);
    let e = P.find((q) => !q.used);
    if (!e) {
      if (!this.ringGeo) { this.ringGeo = new THREE.RingGeometry(0.92, 1, 48); this.ringGeo.rotateX(-Math.PI / 2); this.discGeo = new THREE.CircleGeometry(1, 40); this.discGeo.rotateX(-Math.PI / 2); }
      const m1 = new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const m2 = new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(this.ringGeo, m1), disc = new THREE.Mesh(this.discGeo, m2);
      ring.renderOrder = disc.renderOrder = 3;
      this.w.scene.add(ring, disc); this.gfx.push(ring, disc);
      e = { ring, disc, m1, m2, used: false };
      e.place = (x, y, z, r, k, t) => { ring.visible = disc.visible = true; ring.position.set(x, y + 0.4, z); disc.position.set(x, y + 0.35, z); ring.scale.setScalar(r); disc.scale.setScalar(r * Math.min(1, k)); m1.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * (6 + k * 10))); };
      e.free = () => { e.used = false; ring.visible = disc.visible = false; };
      P.push(e);
    }
    e.used = true; e.m1.color.setHex(col); e.m2.color.setHex(col);
    return e;
  }
  _ground(sc, u, v, need = 6) {
    const w = this.w;
    for (let i = 0; i < 30; i++) {
      const p = this.at(sc, clamp(u + (i ? rnd(-0.3, 0.3) : 0), -1, 1), clamp(v + (i ? rnd(-0.35, 0.35) : 0), -1, 1), 0);
      if (w.def.land && !w.def.land(p.x, p.z)) continue;
      _v.set(p.x, p.y + need + 2, p.z);
      if (!w.col.blocked(_v, need)) return p;
    }
    return this.at(sc, u, v, 0);
  }

  // ── HUD ──
  objective(o) {
    const me = this.me;
    let best = null, bd = 1e9;
    for (const q of this.objs) {
      if (q.state !== "run" || !q.primary) continue;
      for (const mk of q.marks) { const d = mk.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = mk; } }
    }
    if (!best) return null;
    o.pos = best.pos; o.label = best.label; o.color = best.color;
    return o;
  }
  hud(h) {
    const u = h.u, L = h.L, s = this.s, me = this.me, cam = s.camera, full = h.lvl === "full";
    if (this.m.state !== "run" || this.m.cut) return;
    // 전선 띠: 구역 칸 + 적 본진 + 위협 단계
    const N = this.N, bw = 40 * u, gap = 4 * u, tw = N * bw + (N - 1) * gap + 26 * u, x0 = L.cx - tw / 2, y0 = L.subY + 2 * u;
    for (let i = 0; i < N; i++) {
      const x = x0 + i * (bw + gap), cur = i === this.secI, done = this.def ? i > this.secI : i < this.secI, sc = this.secs[i];
      const col = cur ? "#ffd24a" : done ? (this.def ? "#ff6b5a" : "#35ff7a") : "#5b6880";
      h.plate(x, y0, bw, 16 * u, { skew: 0.25, fill: cur ? "rgba(60,48,10,0.9)" : "rgba(12,18,34,0.85)", accent: cur ? col : null });
      h.text(done ? (this.def ? "✖" : "✔") : `${i + 1}${sc.kind === "dense" ? "▦" : sc.kind === "high" ? "▲" : "〰"}`, x + bw / 2, y0 + 8.5 * u, { size: 10.5, align: "center", base: "middle", color: col, shadow: false });
    }
    const bx = x0 + N * (bw + gap);
    if (this.def) h.text("⌂", x0 - 14 * u, y0 + 8.5 * u, { size: 14, align: "center", base: "middle", color: this.base.core.alive ? "#5aa9ff" : "#ff6b5a" });
    else h.text("⌂", bx + 10 * u, y0 + 8.5 * u, { size: 14, align: "center", base: "middle", color: this.base.core.alive ? "#ff5a66" : "#35ff7a" });
    if (this.A2) {   // 공방전: 전·후반 · 역할 · 승수 · 공격 점수
      const A = this.A2, atk = Math.round(this.m.team[this.def ? 1 : 0]);
      h.text(`${A.half === 1 ? "전반" : "후반"} · ${this.def ? "수비" : "공격"}   승 ${A.wins[0]} : ${A.wins[1]}   공격 점수 ${atk} / ${ASSAULT_GOAL}`, L.cx, y0 + 28 * u, { size: 11.5, align: "center", base: "middle", bold: true, color: this.def ? "#8cc4ff" : "#ffd24a" });
    }
    const tc = TIER_COL[this.tier - 1];
    h.plate(x0 + tw + 8 * u, y0 - 1 * u, 74 * u, 18 * u, { skew: 0.2, fill: "rgba(12,18,34,0.9)", accent: tc });
    h.text(`위협 ${ROMAN[this.tier - 1]}`, x0 + tw + 46 * u, y0 + 8.5 * u, { size: 11, align: "center", base: "middle", bold: true, color: tc, shadow: false });

    // 목표 목록 (오른쪽 가운데)
    const list = this.objs.filter((o) => o.state === "run" || (o.gone || 0) < 2.5);
    if (list.length) {
      const w = 236 * u, lh = 34 * u, x = L.r - w, y = h.H * 0.34, ph = 24 * u + list.length * lh, st = this.plan[this.si];
      h.plate(x, y, w, ph, { accent: tc, side: "right", skew: 0.04 });
      h.text(`${st ? st.name : ""} · 제${this.secI + 1} 구역`, x + 12 * u, y + 13 * u, { size: 11.5, base: "middle", bold: true, color: "#ffd24a", shadow: false });
      list.forEach((o, i) => {
        const yy = y + 28 * u + i * lh, ln = o.line ? o.line() : { text: "", frac: 0, col: "#fff" };
        const st2 = o.state, col = st2 === "ok" ? "#35ff7a" : st2 === "fail" ? "#ff6b5a" : st2 === "skip" ? "#8895a8" : o.primary ? "#fff" : "#cfd8e3";
        h.text(`${st2 === "ok" ? "✔" : st2 === "fail" ? "✖" : o.icon} ${o.name}${o.primary ? "" : " (보조)"}`, x + 12 * u, yy, { size: 12, base: "middle", color: col, shadow: false });
        if (o.limit && st2 === "run") { const left = Math.max(0, o.limit - o.t); h.text(`${Math.ceil(left)}s`, x + w - 12 * u, yy, { size: 12, align: "right", base: "middle", mono: true, color: left < 10 ? "#ff6b5a" : "#b4c2d4", shadow: false }); }
        if (full || o.primary) h.text(ln.text, x + 26 * u, yy + 14 * u, { size: 10.5, base: "middle", color: ln.col, shadow: false });
        h.bar(x + w - 82 * u, yy + 11 * u, 70 * u, 4 * u, clamp(ln.frac || 0, 0, 1), ln.col);
      });
      const fy = y + ph + 14 * u;
      if (full && this.finds.length) h.text(`숨은 발견물 ${this.foundN}/${this.finds.length}`, L.r - 8 * u, fy, { size: 11, align: "right", color: "#c77dff" });
    }
    // 목표 표지
    if (me.alive) for (const o of this.objs) {
      if (o.state !== "run") continue;
      for (const mk of o.marks) { const d = mk.pos.distanceTo(me.pos); if (d > 25 && d < (o.primary ? 3000 : 700)) h.marker(mk.pos, cam, mk.color, o.primary ? mk.label : mk.label + "·보조", d); }
    }
    // 숨은 발견물: 신호를 감지한 것만 흐린 물음표
    if (me.alive) for (const f of this.finds) if (f.hint && !f.found && (f.type !== "elite")) { const d = f.pos.distanceTo(me.pos); if (d < 140) h.marker(f.pos, cam, "rgba(199,125,255,0.8)", f.type === "turret" ? (f.rep > 0 ? `수리 ${Math.round(f.rep / 2.5 * 100)}%` : "? 파손된 포탑") : "?", d); }
    // 새 목표 안내: 화면 가운데에서 목표 쪽으로 점선 + 큰 화살표, 목표 자리에는 맥동하는 고리 (5초)
    const G = this.guide, gm = G && G.o.marks && G.o.marks[0];
    if (G && gm && me.alive) {
      const col = gm.color || "#ffd24a", a = Math.min(1, (G.T - G.t) * 3, G.t * 1.5), d = gm.pos.distanceTo(me.pos);
      const sp = h.project(gm.pos, cam, this._gs || (this._gs = {})), cx = h.W / 2, cy = h.H / 2;
      const ang = sp.on ? Math.atan2(sp.y - cy, sp.x - cx) : h._dirAngle(sp);
      const R0 = 64 * u, R1 = sp.on ? Math.max(R0, Math.hypot(sp.x - cx, sp.y - cy) - 30 * u) : Math.min(h.W, h.H) * 0.36;
      const g = h.g; h.fade(a);
      g.save(); g.setLineDash([7 * u, 7 * u]); g.lineDashOffset = -s.time * 40 * u; g.strokeStyle = col; g.lineWidth = 2.5 * u;
      if (R1 > R0) { g.beginPath(); g.moveTo(cx + Math.cos(ang) * R0, cy + Math.sin(ang) * R0); g.lineTo(cx + Math.cos(ang) * R1, cy + Math.sin(ang) * R1); g.stroke(); }
      g.restore();
      for (let i = 0; i < 3; i++) { const r = R0 - 18 * u + i * 14 * u + ((s.time * 30 * u) % (14 * u)); h.chevron(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, ang, (10 - i * 1.5) * u, col, 1.5); }
      if (sp.on) {
        const pr = (14 + 6 * Math.sin(s.time * 8)) * u;
        g.strokeStyle = col; g.lineWidth = 3 * u; g.beginPath(); g.arc(sp.x, sp.y, pr, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1.5 * u; g.beginPath(); g.arc(sp.x, sp.y, pr * 1.8, 0, Math.PI * 2); g.stroke();
      }
      h.plate(cx - 150 * u, cy + 72 * u, 300 * u, 44 * u, { skew: 0.08, fill: "rgba(8,14,28,0.78)", accent: col });
      h.text(`${G.o.primary ? "새 목표" : "보조 목표"} ▸ ${G.o.name}`, cx, cy + 86 * u, { size: 16, align: "center", bold: true, color: col });
      h.text(`${gm.label} · ${Math.round(d)}m${sp.on ? "" : sp.front ? "" : " (뒤쪽)"}`, cx, cy + 106 * u, { size: 13, align: "center", color: "#e8f4ff" });
      h.fade(1);
    }
    // 배너 · 포격 경고
    if (this.bannerT > 0 && this.banner) { h.fade(Math.min(1, this.bannerT * 2)); h.banner(this.banner.text, h.H * 0.78, this.banner.col, 20); h.fade(1); }
    if (this.shells && this.shells.some((q) => !q.owner && me.alive && Math.hypot(q.pos.x - me.pos.x, q.pos.z - me.pos.z) < q.r + 4) && Math.floor(s.time * 6) % 2) h.banner("☄ 포격 경보 — 원 밖으로!", h.H * 0.6, "#ff3040", 18);
  }

  // 결과 화면용
  resultLines() {
    return [
      { label: "완료한 목표", value: `${this.done} / ${this.total}` },
      this.def ? { label: "지켜 낸 방어선", value: `${this.N - (this.N - 1 - this.secI) - (this.si >= this.plan.length - 1 ? 1 : 0)} / ${this.N}${this.lost ? " · 본진 함락" : ""}` }
        : { label: "돌파한 전선", value: `${this.cleared + (this.victory ? 1 : 0)} / ${this.N}${this.victory ? (this.byScore ? " · 공격 점수 달성" : " · 적 본진 파괴") : ""}` },
      { label: "최고 위협 단계", value: `${ROMAN[this.maxTier - 1]} · ${TIER_NAME[this.maxTier - 1]}` },
      { label: "숨은 발견물", value: `${this.foundN} / ${this.finds.length}` },
    ];
  }

  // 시험·디버그: s.mode.director.dbg
  _debug() {
    const self = this;
    return {
      stage: (i) => { for (const o of self.objs) if (o.state === "run") self._end(o, null); self._stage(clamp(i, 0, self.plan.length - 1)); return self.plan[self.si].name; },
      obj: (t, primary = false) => !!self._add(t, primary),
      win: (t) => { const o = self.objs.find((q) => q.type === t && q.state === "run"); if (o) self._end(o, true); return !!o; },
      fail: (t) => { const o = self.objs.find((q) => q.type === t && q.state === "run"); if (o) self._end(o, false); return !!o; },
      spawn: (kind, dist = 60) => { const me = self.me, d = new V3(0, 0, -1).applyQuaternion(me.quat); d.y = 0; d.normalize(); const p = me.pos.clone().addScaledVector(d, dist); p.y += 4; return self.spawnE(kind, p); },
      weather: (k, on = true) => { if (k === "storm") self.weather.storm(on, 999); else if (k === "night") self.weather.night(on); else if (k === "collapse") self._collapse(self.secs[self.secI]); },
      finds: () => self.finds.map((f) => ({ type: f.type, pos: f.pos.toArray().map(Math.round), found: f.found })),
      allOut: () => { self.m.time = self.m.duration - self.finalT + 0.1; },
      state: () => ({ stage: self.si, sec: self.secI, secs: self.secs.map((q) => q.kind), tier: self.tier, objs: self.objs.map((o) => `${o.type}:${o.state}`), done: self.done, total: self.total, alive: self.c.actors.filter((a) => a.alive && a.kind === "bot").length, actors: self.c.actors.length }),
    };
  }

  dispose() {
    for (const o of this.objs) { try { o.clean(); } catch (e) { /* 정리 실패 무시 */ } }
    this.objs.length = 0;
    for (const g of this.gfx) this.w.scene.remove(g);
    if (this.slab) this.w.scene.remove(this.slab.m);
    if (this.ringGeo) { this.ringGeo.dispose(); this.discGeo.dispose(); }
    this.weather.dispose();
    this.s.player.body.extraMass = 0;
  }
}

// ── 판 중 날씨·조명 변화: 안개·노출·햇빛을 천천히 바꾼다 (재질·셰이더는 그대로, 프레임마다 숫자 몇 개만) ──
class Weather {
  constructor(d) {
    this.d = d; this.w = d.w; const sc = this.w.scene, f = sc.fog;
    this.base = { near: f ? f.near : 120, far: f ? f.far : 900, col: f ? f.color.clone() : new THREE.Color(0x9fb3c8), exp: this.w.exposure ?? 1, sun: this.w.sun ? this.w.sun.intensity : 1, bg: sc.background };
    this.hemi = null; sc.traverse((o) => { if (!this.hemi && o.isHemisphereLight) this.hemi = o; });
    this.base.hemi = this.hemi ? this.hemi.intensity : 1;
    this.vac = VACUUM.has(d.s.map.id); this.wasNight = !!this.w.night;
    this.st = 0; this.stT = 0; this.nt = 0; this.ntT = 0; this.stormLeft = 0;
    this.stormCol = this.vac ? new THREE.Color(0x6e6a66) : new THREE.Color(0x8d939b);
    this.nightCol = new THREE.Color(this.wasNight ? 0x05060c : 0x0b1020);
    this.col = new THREE.Color(); this.lights = null; this.flashT = 0;
    this.name = this.vac ? "분진 장막" : "폭풍우";
  }
  storm(on, dur = 55) {
    this.stT = on ? 1 : 0; this.stormLeft = dur;
    if (on) { this.d.say(this.vac ? "포격 분진이 시야를 덮어요! 레이더를 믿으세요!" : "폭풍우 접근! 시야가 크게 떨어집니다!", 2); this.d.s.hud.toast(`${this.name} — 시야 저하`, "#b4c2d4", 2, 22); }
  }
  night(on) {
    this.ntT = on ? 1 : 0;
    if (on) { this.d.say(this.wasNight ? "적이 전력망을 끊었어요! 정전 — 탐조등을 조심하세요!" : "해가 집니다. 적 탐조등이 켜져요!", 2); this.d.s.hud.toast(this.wasNight ? "정전 — 어둠 속 교전" : "야간 전투", "#8ca0ff", 2, 22); this._lights(); }
  }
  _lights() {
    if (this.lights) return;
    const d = this.d, geo = new THREE.ConeGeometry(16, 170, 18, 1, true);
    geo.translate(0, -85, 0); geo.rotateX(Math.PI);   // 꼭짓점이 원점, 위로 퍼진다
    this.lgeo = geo;
    this.lmat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const spots = [d.base.pos, d.at(d.secs[d.N - 1], -0.6, 0.6, 0), d.at(d.secs[d.N - 1], -0.6, -0.6, 0), d.at(d.secs[Math.max(0, d.N - 2)], 0.3, 0, 0)];
    this.lights = spots.map((p, i) => { const g = new THREE.Group(), m = new THREE.Mesh(geo, this.lmat); g.add(m); g.position.copy(p); g.position.y += 2; this.w.scene.add(g); return { g, m, ph: i * 1.7 }; });
  }
  update(dt) {
    const sc = this.w.scene, f = sc.fog, b = this.base;
    if (this.stormLeft > 0 && (this.stormLeft -= dt) <= 0) { this.stT = 0; this.d.say("폭풍이 걷힙니다. 시야 회복!", 1); }
    this.st += clamp(this.stT - this.st, -dt * 0.2, dt * 0.2);
    this.nt += clamp(this.ntT - this.nt, -dt * 0.12, dt * 0.12);
    if (this.st < 1e-3 && this.nt < 1e-3 && !this.dirty) return;
    this.dirty = this.st > 1e-3 || this.nt > 1e-3;
    const s = this.st, n = this.nt * (this.wasNight ? 0.6 : 1);
    if (f) {
      f.near = b.near + (Math.min(b.near, 8) - b.near) * s;
      f.far = (b.far + (Math.min(b.far, 190) - b.far) * s) * (1 - 0.35 * n);
      this.col.copy(b.col).lerp(this.stormCol, s * 0.85).lerp(this.nightCol, n * 0.85);
      f.color.copy(this.col);
      sc.background = s > 0.55 ? f.color : b.bg;
    }
    // 번개 (폭풍 중, 진공 맵 제외): 노출을 잠깐 올린다
    let flash = 0;
    if (!this.vac && s > 0.6) { if ((this.flashT -= dt) <= 0) { this.flashT = rnd(5, 11); this.flashK = 0.25; this.d.c.snd.play("explode", 0.25, rnd(-0.6, 0.6), 0.4); } }
    if (this.flashK > 0) { this.flashK -= dt; flash = Math.max(0, this.flashK) * 2.4; }
    this.w.exposure = b.exp * (1 - 0.5 * n) * (1 - 0.12 * s) + flash;
    if (this.w.sun) this.w.sun.intensity = b.sun * (1 - 0.75 * n) * (1 - 0.45 * s);
    if (this.hemi) this.hemi.intensity = b.hemi * (1 - 0.45 * n) * (1 - 0.2 * s);
    if (this.lights) {
      this.lmat.opacity = 0.13 * this.nt;
      const t = this.d.s.time;
      for (const L of this.lights) { L.g.visible = this.nt > 0.05; L.m.rotation.set(0.4 + Math.sin(t * 0.37 + L.ph) * 0.18, 0, 0); L.g.rotation.y = t * 0.35 + L.ph; }
    }
  }
  dispose() {
    const sc = this.w.scene, f = sc.fog, b = this.base;
    if (f) { f.near = b.near; f.far = b.far; f.color.copy(b.col); }
    sc.background = b.bg; this.w.exposure = b.exp;
    if (this.w.sun) this.w.sun.intensity = b.sun;
    if (this.hemi) this.hemi.intensity = b.hemi;
    if (this.lights) { for (const L of this.lights) sc.remove(L.g); this.lgeo.dispose(); this.lmat.dispose(); }
  }
}
