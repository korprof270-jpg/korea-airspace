// 드론 함대전: 하늘을 메운 두 드론 함대(아군 휴마 연합 · 적 에이아 기계 함대 / 에일 생체 군체)가 편대를 이뤄 밀려와 서로 뒤엉켜 싸운다
//  · 함대 드론 대부분은 가벼운 모의 유닛: 간단한 조향 + 인스턴싱(진영마다 그리기 호출 2회). 유닛끼리는 확률로 맞히는 간이 교전
//    (예광탄·미사일·폭발·연기를 끌며 떨어지는 잔해)
//  · 플레이어 가까이 온 몇 기만 진짜 전투 액터(봇)로 승격된다: 조준·락온·레이더에 잡히고, 나를 쏘고, 격추하면 점수. 멀어지면 다시 모의 유닛으로
//  · 이기는 쪽으로 전선이 밀린다. 위 가운데 '함대 전력' 막대와 짧은 무전. 그래픽 품질이 낮을수록 드론 수가 줄어든다
//  · 대규모 전투 함대(fleet.js)가 떠 있으면 증원 편대는 각 진영 기함에서 출격하고, 기함이 격침되면 그 진영의 남은 증원이 줄어든다
//  · 서바이벌 '함대전'(cfg.variant = "fleet")과 스토리 일부 단계(cfg.swarm). 온라인·PvP·AOS 에는 나오지 않는다
import * as THREE from "../vendor/three.module.min.js";
import { settings } from "./config.js";
import { merge, T } from "./modes/aos-swarm.js";

const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
const _a = new V3(), _b = new V3(), _d = new V3(), _x = new V3(), _y = new V3(), _z = new V3(), _m = new THREE.Matrix4(), _s = new V3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// 그래픽 품질별: 진영마다 처음 드론 수(n), 진짜 액터로 승격하는 최대 수(적 e · 아군 a)
const TIER = { low: { n: 14, e: 3, a: 2 }, med: { n: 26, e: 5, a: 4 }, high: { n: 40, e: 7, a: 5 }, ultra: { n: 54, e: 8, a: 6 } };
const PROMOTE_R = 210, DEMOTE_R = 260;   // 승격·강등 거리(m)
const SHOT_V = 190;
const COL = { ally: 0x7fd0ff, eia: 0xff5a3a, ail: 0xd070ff };
const DIFF_K = { easy: 0.8, normal: 1, hard: 1.25 };

// ── 대규모 드론 함대전을 벌일 판인가 ──
export function swarmWanted(mode) {
  const cfg = mode.cfg || {}, c = mode.combat;
  if (cfg.net || cfg.online || cfg.pvp || !c || c.ffa || cfg.mode === "aos") return false;
  if (cfg.mode === "survival" && cfg.variant === "fleet") return true;   // 함대전은 모드 자체라 설정과 상관없이 켠다
  if (!cfg.swarm || (settings.fx && settings.fx.fleet === false)) return false;
  const w = mode.s.world;
  return w.size >= 150 && (w.ceiling || 999) >= 100;
}

// ── 모양: 아군 연합 쿼드 드론 / 에이아 기계 쌍갈래 드론 / 에일 생체 군체 (앞 = -Z) ──
const SHAPES = {
  ally() {
    const body = [], glow = [];
    body.push([new THREE.BoxGeometry(0.62, 0.26, 1.3), null, 0xdfe5ee], [new THREE.BoxGeometry(0.4, 0.2, 0.55), T(0, 0.2, 0.1), 0x2f6fb0], [new THREE.BoxGeometry(0.3, 0.14, 0.4), T(0, -0.18, -0.1), 0x2a3040]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      body.push([new THREE.BoxGeometry(0.12, 0.08, 1.05), T(sx * 0.38, 0, sz * 0.38, 1, 1, 1, 0, sx * sz * Math.PI / 4), 0x8d97a8]);
      body.push([new THREE.CylinderGeometry(0.11, 0.13, 0.2, 8), T(sx * 0.76, 0.05, sz * 0.76), 0x1d2129]);
      glow.push([new THREE.TorusGeometry(0.38, 0.045, 4, 14), T(sx * 0.76, 0.16, sz * 0.76, 1, 1, 1, Math.PI / 2), 0x3a9fe8]);   // 프로펠러 보호 고리 (빛)
    }
    glow.push([new THREE.BoxGeometry(0.46, 0.08, 0.1), T(0, 0.04, -0.66), 0x9fe4ff], [new THREE.BoxGeometry(0.07, 0.06, 1.0), T(-0.32, 0.1, 0.02), 0x4aa8ff], [new THREE.BoxGeometry(0.07, 0.06, 1.0), T(0.32, 0.1, 0.02), 0x4aa8ff], [new THREE.BoxGeometry(0.3, 0.12, 0.06), T(0, 0, 0.67), 0x58c8ff]);
    return { body: merge(body), glow: merge(glow), scale: 2.3 };
  },
  eia() {
    const body = [], glow = [];
    body.push([new THREE.OctahedronGeometry(0.55, 0), T(0, 0, 0.1, 1.05, 0.5, 1.6), 0x2b2f3a]);
    for (const sx of [-1, 1]) {
      body.push([new THREE.ConeGeometry(0.13, 1.0, 5), T(sx * 0.26, -0.02, -0.75, 1, 1, 1, -Math.PI / 2, 0, 0), 0x4a505e]);   // 앞으로 뻗은 쌍갈래 충각
      body.push([new THREE.BoxGeometry(0.95, 0.05, 0.42), T(sx * 0.62, 0, 0.35, 1, 1, 1, 0, sx * 0.45, sx * 0.12), 0x3a3f4a]);   // 뒤로 젖힌 날개
      body.push([new THREE.BoxGeometry(0.05, 0.4, 0.38), T(sx * 0.98, 0.12, 0.52, 1, 1, 1, 0, 0, -sx * 0.3), 0x15171c]);
      glow.push([new THREE.BoxGeometry(0.7, 0.05, 0.05), T(sx * 0.58, 0.03, 0.2, 1, 1, 1, 0, sx * 0.45, 0), 0xff2a3a]);
    }
    glow.push([new THREE.SphereGeometry(0.17, 8, 6), T(0, 0.04, -0.62), 0xff3040], [new THREE.BoxGeometry(0.34, 0.16, 0.06), T(0, 0, 0.92), 0xff7a3a]);
    return { body: merge(body), glow: merge(glow), scale: 2.4 };
  },
  ail() {
    const body = [], glow = [];
    body.push([new THREE.SphereGeometry(0.5, 10, 8), T(0, 0, 0, 1, 0.75, 1.55), 0x4a2466], [new THREE.SphereGeometry(0.34, 8, 6), T(0, -0.16, 0.1, 1, 0.6, 1.3), 0x7a3a8a]);
    for (const sx of [-1, 1]) {
      body.push([new THREE.BoxGeometry(0.9, 0.04, 0.55), T(sx * 0.6, -0.04, 0.15, 1, 1, 1, 0, sx * 0.25, sx * 0.3), 0x9a4ab8]);   // 막 지느러미
      body.push([new THREE.ConeGeometry(0.09, 0.9, 5), T(sx * 0.16, -0.1, 1.05, 1, 1, 1, Math.PI / 2 - 0.2, 0, sx * 0.25), 0x7a3a8a]);   // 꼬리 촉수
      glow.push([new THREE.SphereGeometry(0.1, 6, 5), T(sx * 0.17, 0.12, -0.66), 0x6affd8]);
      glow.push([new THREE.SphereGeometry(0.13, 6, 5), T(sx * 0.28, 0.05, 0.4), 0xff6ad8]);
    }
    glow.push([new THREE.BoxGeometry(0.06, 0.06, 1.1), T(0, 0.36, 0), 0xd070ff]);
    return { body: merge(body), glow: merge(glow), scale: 2.4 };
  },
};

// 진영 하나의 그림: 몸체 + 발광부 인스턴스 메시 두 개
class Flock {
  constructor(scene, shape, cap) {
    const sh = SHAPES[shape]();
    this.S = sh.scale;
    this.body = new THREE.InstancedMesh(sh.body, new THREE.MeshLambertMaterial({ vertexColors: true }), cap);
    this.glow = new THREE.InstancedMesh(sh.glow, new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.3, 2.3, 2.3) }), cap);
    for (const m of [this.body, this.glow]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    this.cap = cap; this.scene = scene; this.n = 0;
  }
  begin() { this.n = 0; }
  put(mx) { if (this.n >= this.cap) return; this.body.setMatrixAt(this.n, mx); this.glow.setMatrixAt(this.n, mx); this.n++; }
  end() { this.body.count = this.glow.count = this.n; this.body.instanceMatrix.needsUpdate = this.glow.instanceMatrix.needsUpdate = true; }
  dispose() { for (const m of [this.body, this.glow]) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); m.dispose(); } }
}

export class SwarmWar {
  constructor(mode) {
    this.mode = mode; const s = (this.s = mode.s); this.c = mode.combat; this.w = s.world; this.fx = s.fx;
    const cfg = mode.cfg || {}, c = this.c, w = this.w, mc = s.map.combat || { blue: [-w.size * 0.6, 0], red: [w.size * 0.6, 0] };
    const q = s.game.q || "med", touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const TQ = TIER[q] || TIER.med;
    this.ail = cfg.faction === "ail";
    this.surv = cfg.mode === "survival" && cfg.variant === "fleet";
    this.story = !!cfg.story;
    this.eName = this.ail ? "에일 군체" : "적 함대";
    this.who = this.surv ? "함대 관제" : "윤채아";
    const base = touch ? Math.min(TQ.n, 18) : TQ.n;
    const dk = DIFF_K[cfg.difficulty || settings.difficulty] || 1;
    let nA, nE, rA, rE;
    if (this.surv) {
      const k = cfg.fleetSize || 1;
      nA = Math.round(base * k); nE = Math.round(base * k * dk);
      rA = nA; rE = Math.round(nE * (0.6 + 0.5 * dk));   // 보통: 거의 같은 규모 — 플레이어의 활약이 승패를 가른다
      this.rate = 1;
    } else {
      const k = typeof cfg.swarm === "number" ? cfg.swarm : 1;
      nA = Math.round(base * k); nE = Math.round(base * k * 0.92);
      rA = Math.round(nA * 1.3); rE = Math.round(nE * 1.1);
      this.rate = 0.6;   // 스토리: 임무가 길어도 하늘의 싸움이 끝까지 이어지게 천천히 소모된다
    }
    this.n0 = [nA, nE]; this.res = [rA, rE]; this.tot = [nA + rA, nE + rE];
    this.alive = [0, 0]; this.kills = [0, 0]; this.myKills = 0;
    this.hitK = [this.story ? 1.12 : 1, 1];   // 스토리에서는 아군 함대가 조금 낫다
    this.slots = [touch ? Math.min(TQ.a, 2) : TQ.a, touch ? Math.min(TQ.e, 4) : TQ.e];
    this.nearN = q === "low" || touch ? 2 : q === "med" ? 3 : 4;   // 진짜 모델로 그리는 승격 액터 수
    // 전장 축: 아군 진영 → 적 진영
    const blue = new V3(mc.blue[0], 0, mc.blue[1]), red = new V3(mc.red[0], 0, mc.red[1]);
    this.axis = red.clone().sub(blue); this.axis.y = 0; if (this.axis.lengthSq() < 1) this.axis.set(1, 0, 0); this.axis.normalize();
    this.lat = new V3(-this.axis.z, 0, this.axis.x);
    this.mid = blue.add(red).multiplyScalar(0.5);
    this.lim = w.size - 25;
    this.top = (w.ceiling || 200) - 12;
    this.line = 0; this.lastLine = 0; this.latOff = 0;
    const me = s.player.body.pos;
    this.F = new V3();
    this._frontGoal(this.F, me);
    this.F.y = this._fy(this.F, me.y + 30);
    this.units = []; this.squads = []; this.shots = []; this.missiles = [];
    this.flock = [new Flock(w.scene, "ally", nA * 2 + 12), new Flock(w.scene, this.ail ? "ail" : "eia", nE * 2 + 12)];
    this.t = 0; this.promoT = 0; this.waveT = [this.surv ? 45 : 40, this.surv ? 38 : 34]; this.waveN = [0, 0]; this.checkT = 0;
    this.calls = []; this.callT = 0; this.said = {}; this.streak = []; this.contact = false;
    this.shipsN = null;
    // 처음 편대: 각 진영 뒤쪽에 쐐기 편대 여럿
    for (const side of [0, 1]) this._wave(side, this.n0[side], true);
    // 승격용 진짜 전투 액터: 미리 만들어 두고(숨김) 돌려 쓴다
    this.pool = [[], []];
    for (const side of [0, 1]) for (let i = 0; i < this.slots[side]; i++) {
      const kind = side && i % 3 === 2 ? "jet" : "grunt";
      const a = c.spawnBot({ kind, team: side, name: side ? (this.ail ? "에일 군체 드론" : "적 함대 드론") : "연합 함대 드론", pos: new V3(0, -400, 0) });
      a.swarm = true; a.respawns = false;
      a.K = Object.assign({}, a.K, { dmg: a.K.dmg * (this.story ? 0.6 : 0.75), missiles: 1 });
      this._park(a);
      this.pool[side].push(a);
    }
    // 격추 처리 가로채기: 함대 드론 액터가 떨어지면 모의 유닛을 잔해로 바꾸고, 내가 떨어뜨렸을 때만 모드의 점수 처리로 넘긴다
    const h = c.h, orig = h.onKill;
    h.onKill = (a, k) => {
      if (!a.swarm) return orig && orig(a, k);
      const u = a.swarmU;
      a.swarmU = null; this._park(a);
      if (u) { u.actor = null; u.hp = 0; this._down(u, k ? k.team : 1 - u.side, true); }
      if (k && k.isPlayer && a.team !== k.team) { this._myKill(); if (orig) orig(a, k); }
    };
    // 함대 드론 액터의 표적 고르기: 적은 나보다 근처 아군 함대 드론을 더 자주 노리고, 아군은 드론끼리 싸운다 (임무 목표·구조물은 건드리지 않는다)
    const think = c._think.bind(c);
    c._think = (a) => { think(a); if (a.swarm) this._retarget(a); };
    // 함대 드론 액터끼리의 피해: 계급과 상관없이 같은 비율로, 모의 교전보다 조금 빠른 정도로 줄인다 (플레이어 근처가 소모전이 되지 않게)
    const dmg = c.damage.bind(c);
    c.damage = (a, amount, att, pt) => dmg(a, a.swarm && att && att.swarm ? amount * 0.15 * a.maxHp / (105 * (att.rk ? att.rk.dmg : 1)) : amount, att, pt);
    c.swarm = this;
    this._call(`아군 드론 함대 ${nA}기 전개. ${this.eName}와 교전합니다!`, "#9fd8ff", 1.2);
  }

  // ── 전선 ──
  // 서바이벌: 두 진영 사이 축 위(전력 차만큼 밀린다), 옆으로는 플레이어를 따라. 스토리: 플레이어 머리 위 하늘 (임무 현장 근처)
  _frontGoal(out, me) {
    if (this.surv) {
      const lt = clamp(_a.copy(me).sub(this.mid).dot(this.lat), -this.lim * 0.5, this.lim * 0.5);
      this.latOff += (lt - this.latOff) * 0.02;
      out.copy(this.mid).addScaledVector(this.axis, this.line).addScaledVector(this.lat, this.latOff);
    } else {
      out.set(me.x * 0.75 + this.mid.x * 0.25, 0, me.z * 0.75 + this.mid.z * 0.25).addScaledVector(this.axis, this.line * 0.5);
    }
    out.x = clamp(out.x, -this.lim + 40, this.lim - 40); out.z = clamp(out.z, -this.lim + 40, this.lim - 40);
    return out;
  }
  _fy(p, want) { const g = this.w.h(p.x, p.z); return clamp(want, g + 45, Math.max(g + 50, this.top - 30)); }

  // 진영 뒤쪽(또는 기함) 출격 지점
  _rear(side, out) {
    const sg = side ? 1 : -1;
    out.copy(this.F).addScaledVector(this.axis, sg * rnd(160, 210)).addScaledVector(this.lat, rnd(-70, 70));
    out.x = clamp(out.x, -this.lim, this.lim); out.z = clamp(out.z, -this.lim, this.lim);
    out.y = this._fy(out, this.F.y + rnd(-15, 25));
    return out;
  }
  _ships(side) { const f = this.mode.fleet; return f ? f.ships.filter((x) => x.side === side && !x.dead) : []; }

  // 편대 투입: n 기를 5~6기 쐐기 편대로 나눠
  _wave(side, n, first = false) {
    const ships = first ? [] : this._ships(side);
    let left = n, k = 0;
    while (left > 0) {
      const m = Math.min(left, left - 6 < 3 ? left : 6);
      const at = new V3();
      let launch = null;
      if (ships.length) { launch = ships[k % ships.length]; at.copy(launch.pos); at.y -= 6; }
      else this._rear(side, at);
      if (first) at.addScaledVector(this.lat, (k - (n / 6 - 1) / 2) * 34);
      const dir = _a.copy(this.F).sub(at).setY(0); if (dir.lengthSq() < 1) dir.copy(this.axis).multiplyScalar(side ? -1 : 1); dir.normalize();
      const sq = { side, anchor: at.clone(), dir: dir.clone(), st: 0, spd: rnd(21, 25), t: 0, n: 0, chk: Math.random() };
      for (let i = 0; i < m; i++) this._spawn(sq, i, launch);
      this.squads.push(sq);
      left -= m; k++;
    }
  }
  _slot(sq, i, out) {
    const row = (i + 1) >> 1, sg = i % 2 ? 1 : -1;
    _b.set(-sq.dir.z, 0, sq.dir.x);
    return out.copy(sq.anchor).addScaledVector(_b, sg * row * 8).addScaledVector(sq.dir, -row * 7).addScaledVector(UP, row * 1.4 * (sq.side ? -1 : 1));
  }
  _spawn(sq, i, launch) {
    const u = { side: sq.side, sq, slot: i, pos: new V3(), vel: new V3(), hp: 1, alive: true, st: 0, tgt: null, retT: 0, gunT: rnd(0.5, 2), burst: 0, bn: 3 + (Math.random() * 3 | 0),
      mT: rnd(6, 20), evT: 0, evD: new V3(), bank: 0, spd: rnd(23, 29), agi: rnd(1.4, 2.0), gy: 0, gT: Math.random() * 0.3, bT: Math.random() * 0.5, actor: null, smT: 0, fallT: 0, spinV: 0, dead: false };
    if (launch) u.pos.copy(sq.anchor).add(_a.set(rnd(-6, 6), rnd(-3, 1), rnd(-6, 6)));
    else this._slot(sq, i, u.pos).add(_a.set(rnd(-2, 2), rnd(-1, 1), rnd(-2, 2)));
    u.vel.copy(sq.dir).multiplyScalar(sq.spd);
    if (launch) u.vel.y -= 4;
    u.gy = this.w.h(u.pos.x, u.pos.z);
    sq.n++;
    this.units.push(u); this.alive[u.side]++;
  }

  // ── 전력 ──
  strength(side) { return clamp((this.alive[side] + this.res[side]) / Math.max(1, this.tot[side]), 0, 1); }

  // ── 매 프레임 ──
  update(dt, live) {
    this.t += dt;
    const me = this.mode.me, mp = this.s.player.body.pos;
    // 전선: 전력이 앞선 쪽으로 밀린다
    const sa = this.strength(0), se = this.strength(1);
    if (live && this.contact) this.line = clamp(this.line + clamp((sa - se) * 3, -1, 1) * 5 * dt, -this.lim * 0.45, this.lim * 0.45);
    this._frontGoal(_d, mp);
    const k = Math.min(1, dt * 0.15);
    this.F.x += (_d.x - this.F.x) * k; this.F.z += (_d.z - this.F.z) * k;
    this.F.y += (this._fy(this.F, mp.y + (this.surv ? 25 : 30)) - this.F.y) * Math.min(1, dt * 0.25);
    for (const sq of this.squads) this._squad(sq, dt);
    for (const u of this.units) this._unit(u, dt, live);
    if (live) { this._shots(dt); this._missiles(dt); }
    // 떨어져 땅에 닿은 잔해 정리
    if ((this._gc = (this._gc || 0) + 1) % 30 === 0) { this.units = this.units.filter((u) => !u.dead); this.squads = this.squads.filter((q) => q.n > 0); }
    if ((this.promoT -= dt) <= 0) { this.promoT = 0.4; if (me) this._promote(mp); }
    if (live) this._waves(dt);
    this._draw(live);
    if ((this.callT -= dt) <= 0 && this.calls.length > 1) { this.calls.shift(); this.callT = 3.4; }
    else if (this.calls.length === 1 && this.callT < -0.5) this.calls.shift();
  }

  _squad(sq, dt) {
    sq.t += dt;
    if (sq.st) return;
    // 전선 쪽으로 순항, 적 편대와 닿거나 전선에 도착하면 산개해 교전
    _a.copy(this.F).sub(sq.anchor); _a.y = 0;
    const dF = _a.length();
    if (dF > 1) { _a.multiplyScalar(1 / dF); sq.dir.lerp(_a, Math.min(1, dt * 0.4)).normalize(); }
    sq.anchor.addScaledVector(sq.dir, sq.spd * dt);
    sq.anchor.y += (this.F.y + (sq.side ? 6 : -4) - sq.anchor.y) * Math.min(1, dt * 0.5);
    if ((sq.chk -= dt) > 0) return;
    sq.chk = 0.5;
    let go = dF < 70 || sq.t > 28;
    if (!go) for (let i = 0; i < 10; i++) { const o = this.units[(Math.random() * this.units.length) | 0]; if (o && o.alive && o.side !== sq.side && o.pos.distanceToSquared(sq.anchor) < 130 * 130) { go = true; break; } }
    if (!go) return;
    sq.st = 1;
    for (const u of this.units) if (u.sq === sq && u.st === 0) u.st = 1;
    if (!this.contact) { this.contact = true; this._call("전위 접촉! 전 편대, 교전 개시!", "#ffd24a"); }
  }

  _pick(u) {
    u.retT = rnd(3, 6);
    let best = null, bd = 1e12;
    const L = this.units, n = L.length;
    for (let i = 0; i < 9 && n; i++) {
      const o = L[(Math.random() * n) | 0];
      if (!o.alive || o.side === u.side) continue;
      const d = o.pos.distanceToSquared(u.pos) * rnd(0.7, 1.3);
      if (d < bd) { bd = d; best = o; }
    }
    u.tgt = best;
  }

  _unit(u, dt, live) {
    if (u.dead) return;
    if (u.actor) { u.pos.copy(u.actor.pos); u.vel.copy(u.actor.vel); return; }
    if (u.st === 2) return this._fall(u, dt);
    const des = _d, spd = u.spd, F = this.F;
    let t = null, dist = 0;
    if (u.st === 0) {
      this._slot(u.sq, u.slot, des).sub(u.pos).multiplyScalar(0.9).addScaledVector(u.sq.dir, u.sq.spd);
      if (des.length() > spd * 1.35) des.setLength(spd * 1.35);
    } else {
      if (!u.tgt || !u.tgt.alive || (u.retT -= dt) <= 0) this._pick(u);
      t = u.tgt;
      if (u.evT > 0) { u.evT -= dt; des.copy(u.evD).multiplyScalar(spd); }
      else if (t) {
        des.copy(t.pos).addScaledVector(t.vel, 0.6).sub(u.pos);
        dist = des.length();
        des.multiplyScalar(spd / Math.max(dist, 0.01));
        if (dist < 16) {   // 너무 붙으면 옆으로 빠져나가며 다시 돈다 (공중전 선회)
          u.evT = rnd(0.9, 1.7);
          _a.copy(u.vel).normalize(); _b.crossVectors(_a, UP).normalize().multiplyScalar(Math.random() < 0.5 ? -1 : 1);
          u.evD.copy(_a).multiplyScalar(0.5).add(_b).addScaledVector(UP, rnd(-0.5, 0.6)).normalize();
        }
      } else des.copy(F).sub(u.pos).setLength(spd);
      // 전선 근처에 머문다
      _a.copy(u.pos).sub(F); const dF = _a.length(), R = this.surv ? 150 : 135;
      if (dF > R) des.addScaledVector(_a, -spd * Math.min(1.2, (dF - R) / 60) / dF);
    }
    // 높이·경계
    if ((u.gT -= dt) <= 0) { u.gT = 0.3; u.gy = this.w.h(u.pos.x, u.pos.z); }
    const lo = Math.max(u.gy + 22, F.y - 55), hi = Math.min(this.top, F.y + 55);
    if (u.pos.y < lo) des.y += (lo - u.pos.y) * 1.6;
    else if (u.pos.y > hi) des.y -= (u.pos.y - hi) * 1.6;
    const L = this.lim;
    if (Math.abs(u.pos.x) > L) des.x -= Math.sign(u.pos.x) * (Math.abs(u.pos.x) - L) * 2;
    if (Math.abs(u.pos.z) > L) des.z -= Math.sign(u.pos.z) * (Math.abs(u.pos.z) - L) * 2;
    // 높은 구조물: 가끔 앞을 살펴 막혔으면 위로
    if ((u.bT -= dt) <= 0) { u.bT = 0.5; _a.copy(u.pos).addScaledVector(u.vel, 0.8); if (this.w.col.blocked(_a, 2.5)) u.vel.y += 18; }
    // 적분 + 기울기(선회 방향으로 뱅크)
    _a.copy(u.vel).normalize(); _b.copy(des).normalize();
    const turn = _a.x * _b.z - _a.z * _b.x;
    u.bank += (clamp(turn * 2.4, -1.1, 1.1) - u.bank) * Math.min(1, dt * 4);
    u.vel.lerp(des, Math.min(1, dt * u.agi));
    u.pos.addScaledVector(u.vel, dt);
    if (u.pos.y < u.gy + 3) { u.pos.y = u.gy + 3; if (u.vel.y < 0) u.vel.y = 0; }
    if (live && t && u.st === 1) this._gun(u, t, dt, dist || u.pos.distanceTo(t.pos));
  }

  // 사격: 앞에 표적이 있으면 짧은 연사, 가끔 미사일
  _gun(u, t, dt, d) {
    if ((u.gunT -= dt) <= 0) {
      if (d < 95 && _a.copy(u.vel).normalize().dot(_b.copy(t.pos).sub(u.pos).normalize()) > 0.92) {
        u.burst++; u.gunT = 0.09;
        if (u.burst >= u.bn) { u.burst = 0; u.gunT = rnd(1.0, 2.2); }
        const al = this.alive, odds = clamp(Math.sqrt(Math.max(1, al[1 - u.side]) / Math.max(1, al[u.side])), 0.8, 1.5);   // 수에서 밀리는 쪽이 더 악착같이 (눈덩이 완화)
        const hit = Math.random() < 0.26 * this.hitK[u.side] * odds;
        const aim = _a.copy(t.pos).addScaledVector(t.vel, d / SHOT_V);
        if (!hit) aim.add(_b.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(5));
        const from = u.pos.clone().addScaledVector(_b.copy(u.vel).normalize(), 1.4);
        const dir = aim.sub(from), len = dir.length(); dir.multiplyScalar(1 / len);
        this.shots.push({ p: from, d: dir.clone(), life: len / SHOT_V, hit, tgt: t, side: u.side });
        if (this.shots.length > 320) this.shots.shift();
        const cd = from.distanceTo(this.s.camera.position);
        if (cd < 200) this.fx.muzzle(from, dir, u.side ? COL[this.ail ? "ail" : "eia"] : COL.ally, 1.2);
        if (cd < 60 && Math.random() < 0.3) this._snd("elaser", from, 0.35, 1.1);
      } else u.gunT = 0.2;
    }
    if ((u.mT -= dt) <= 0) {
      u.mT = rnd(14, 26);
      if (d > 45 && d < 170) {
        const p = u.pos.clone(), v = _a.copy(u.vel).normalize().multiplyScalar(30).add(_b.set(0, 4, 0)).clone();
        this.missiles.push({ p, v, tgt: t, life: 6, side: u.side, hit: Math.random() < 0.7, tr: 0 });
        if (p.distanceTo(this.s.camera.position) < 80) this._snd("missile", p, 0.4, 1);
      }
    }
  }
  _shots(dt) {
    const fx = this.fx, cam = this.s.camera.position;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.p.addScaledVector(s.d, SHOT_V * Math.min(s.life, dt)); s.life -= dt;
      if (s.life > 0) continue;
      this.shots.splice(i, 1);
      if (!s.hit || !s.tgt.alive) continue;
      if (s.p.distanceToSquared(cam) < 160 * 160) fx.hitSpark(s.p, s.d, 0xffd27a, 5, false, false);
      this._hurt(s.tgt, 0.04 * this.rate, s.p, s.side);
    }
  }
  _missiles(dt) {
    const fx = this.fx, cam = this.s.camera.position;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i], t = m.tgt;
      m.life -= dt;
      if (t.alive) {
        _a.copy(t.pos).sub(m.p); const d = _a.length();
        if (d < 3 && m.hit) { this.missiles.splice(i, 1); if (m.p.distanceToSquared(cam) < 400 * 400) fx.explosion(m.p, 0.6); this._hurt(t, 0.3 * this.rate, m.p, m.side); continue; }
        if (m.hit || m.life > 4.5) m.v.lerp(_a.multiplyScalar(62 / Math.max(d, 0.1)), Math.min(1, dt * 2.2));
      }
      m.p.addScaledVector(m.v, dt);
      if ((m.tr++ & 1) === 0 && m.p.distanceToSquared(cam) < 300 * 300) { fx.puff(m.p, m.side ? 0xffa070 : 0x9fd8ff, 0.5, 0.45, 0.2); fx.smoke(m.p, 0.6, 1.1, 0.6, 0.2); }
      if (m.life <= 0 || m.p.y < this.w.h(m.p.x, m.p.z)) { this.missiles.splice(i, 1); if (m.p.distanceToSquared(cam) < 300 * 300) fx.explosion(m.p, 0.5); }
    }
  }
  _hurt(u, dmg, pt, srcSide) {
    if (!u.alive) return;
    if (u.actor) { const a = u.actor; this.c.damage(a, dmg * a.maxHp * 0.8, null, pt); return; }
    u.hp -= dmg;
    if (u.hp <= 0) this._down(u, srcSide, false);
  }
  // 격추: 폭발하고 연기를 끌며 떨어진다
  _down(u, srcSide, quiet) {
    if (!u.alive) return;
    u.alive = false; u.st = 2; u.fallT = 0; u.spinV = rnd(-7, 7); u.smT = 0; u.tgt = null;
    u.vel.multiplyScalar(0.6); u.vel.y += rnd(-2, 5);
    this.alive[u.side]--; this.kills[srcSide === u.side ? 1 - u.side : srcSide]++;
    if (u.sq) u.sq.n--;
    const cd = u.pos.distanceTo(this.s.camera.position);
    if (!quiet && cd < 520) {
      this.fx.explosion(u.pos, cd < 150 ? 0.8 : 1.1);
      if (cd < 220) this.fx.debrisBurst(u.pos, u.side ? 0x3a3f4a : 0xc8d0dc, 5, 9, 0.22);
      if (cd < 160) this._snd("explode", u.pos, 0.45, 1.1);
    }
  }
  _fall(u, dt) {
    u.fallT += dt;
    u.vel.y -= 13 * dt; u.vel.multiplyScalar(1 - 0.25 * dt);
    u.pos.addScaledVector(u.vel, dt);
    u.bank += u.spinV * dt;
    const cd2 = u.pos.distanceToSquared(this.s.camera.position);
    if ((u.smT -= dt) <= 0) {
      u.smT = 0.09;
      if (cd2 < 380 * 380) { this.fx.smoke(u.pos, 0.9, 1.7, 0.08, 0.35); this.fx.puff(u.pos, 0xff7a2a, 0.45, 0.3, 0.2); }
    }
    if ((u.gT -= dt) <= 0) { u.gT = 0.2; u.gy = this.w.h(u.pos.x, u.pos.z); }
    if (u.pos.y < u.gy + 0.5 || u.fallT > 9) {
      u.dead = true;
      if (cd2 < 450 * 450) { this.fx.explosion(u.pos, 0.9); if (cd2 < 200 * 200) this._snd("explode", u.pos, 0.35, 0.8); }
    }
  }

  // ── 승격 / 강등: 플레이어 가까이의 몇 기만 진짜 전투 액터 ──
  _park(a) {
    a.alive = false; a.model.visible = false; a.pos.set(0, -400, 0); a.vel.set(0, 0, 0); a.ai.target = null;
    const c = this.c;
    if (c.lock === a) c.lock = null;
    if (c.aim === a) c.aim = null;
  }
  _promote(mp) {
    for (const side of [0, 1]) {
      const pool = this.pool[side];
      // 멀어진 액터는 모의 유닛으로
      for (const a of pool) {
        const u = a.swarmU;
        if (!u || !a.alive) continue;
        if (a.pos.distanceTo(mp) > DEMOTE_R || u.side !== side) this._demote(u);
      }
      const free = pool.filter((a) => !a.swarmU && !a.alive);
      if (!free.length) continue;
      const cand = [];
      for (const u of this.units) if (u.side === side && u.alive && !u.actor) { const d = u.pos.distanceTo(mp); if (d < PROMOTE_R) cand.push([d, u]); }
      cand.sort((x, y) => x[0] - y[0]);
      for (let i = 0; i < free.length && i < cand.length; i++) this._up(cand[i][1], free[i]);
    }
  }
  _up(u, a) {
    a.alive = true; a.hp = Math.max(1, a.maxHp * u.hp); a.shield = 0; a.stunT = 0; a.flash = 0; a.boostT = 0; a.overT = 0;
    a.pos.copy(u.pos); a.vel.copy(u.vel); a.missiles = 1;
    a.model.visible = true; a.model.position.copy(u.pos);
    const ai = a.ai;
    ai.target = null; ai.think = 0; ai.goal = null; ai.roam = null; ai.burst = 0; ai.cool = rnd(0.4, 1.2); ai.mcool = rnd(4, 9); ai.lastHit = null;
    ai.yaw = Math.atan2(-u.vel.x, -u.vel.z);
    a.quat.setFromAxisAngle(UP, ai.yaw); a.model.quaternion.copy(a.quat);
    ai.hate = Math.random() < (this.story ? 0.35 : 0.5);   // 이 드론이 플레이어를 우선 노리는가
    a.swarmU = u; u.actor = a; u.st = 1;
  }
  _demote(u) {
    const a = u.actor;
    u.pos.copy(a.pos); u.vel.copy(a.vel); u.hp = clamp(a.hp / a.maxHp, 0.05, 1);
    if (u.vel.lengthSq() < 25) u.vel.set(rnd(-1, 1), 0, rnd(-1, 1)).normalize().multiplyScalar(u.spd);
    u.actor = null; u.tgt = null; a.swarmU = null;
    this._park(a);
  }
  // 함대 드론 액터의 표적: 적 드론은 나 / 근처 아군 함대 드론 / 아군 윙맨 가운데, 아군 함대 드론은 적 드론만
  _retarget(a) {
    const ai = a.ai, t = ai.target, c = this.c;
    const drone = (o) => o && (o.kind === "bot" || o.kind === "player");
    if (a.team === 1 && t && t.isPlayer && ai.hate) return;
    if (drone(t) && !(a.team === 1 && t && t.isPlayer)) return;
    let best = null, bd = 1e9;
    for (const o of c.actors) {
      if (!o.alive || !o.targetable || !drone(o) || !c.hostile(a, o)) continue;
      if (a.team === 1 && o.isPlayer) continue;
      const d = o.pos.distanceTo(a.pos);
      if (d < bd) { bd = d; best = o; }
    }
    if (best && (!t || !t.isPlayer || bd < t.pos.distanceTo(a.pos) * 1.6)) { ai.target = best; ai.los = c._vis(a.pos, best, 1.5); }
    else if (!drone(t)) ai.target = null;
  }

  _myKill() {
    this.myKills++;
    const t = this.t;
    this.streak = this.streak.filter((x) => t - x < 9); this.streak.push(t);
    if (this.streak.length >= 3 && !this._recent("streak", 25)) this._call(`${this.eName} 대열이 흔들립니다. 좋은 사격이에요!`, "#35ff7a", 0, "streak");
  }

  // ── 증원 편대 ──
  _waves(dt) {
    for (const side of [0, 1]) {
      if (this.res[side] <= 0) continue;
      this.waveT[side] -= dt;
      const low = this.alive[side] < this.n0[side] * 0.45 && this.waveT[side] < (this.surv ? 30 : 24);
      if (this.waveT[side] > 0 && !low) continue;
      this.waveT[side] = this.surv ? 42 : 36;
      const cap = this.flock[side].cap - 4;
      const n = Math.min(this.res[side], Math.max(4, Math.round(this.n0[side] * 0.4)), cap - this.alive[side]);
      if (n <= 0) continue;
      this.res[side] -= n;
      const fromShip = this._ships(side).length > 0;
      this._wave(side, n);
      this.waveN[side]++;
      if (side) this._call(fromShip ? `적 기함에서 드론 편대 출격! ${n}기, ${this._sideOf(this.squads[this.squads.length - 1].anchor)}입니다!` : `${this.eName} 증원 ${n}기 접근 — ${this._sideOf(this.squads[this.squads.length - 1].anchor)}!`, "#ff8a7a");
      else this._call(fromShip ? `아군 기함에서 증원 편대 발진! ${n}기 합류합니다.` : `아군 증원 편대 ${n}기 도착. 전열에 합류합니다.`, "#9fd8ff");
    }
    // 1초마다: 기함 격침 → 증원 감소, 전력·전선 무전
    if ((this.checkT -= dt) > 0) return;
    this.checkT = 1;
    const sn = [this._ships(0).length, this._ships(1).length];
    if (this.shipsN && this.mode.fleet) for (const side of [0, 1]) if (sn[side] < this.shipsN[side]) {
      const lost = Math.round(this.res[side] * 0.35 * (this.shipsN[side] - sn[side]));
      this.res[side] = Math.max(0, this.res[side] - lost);
      this._call(side ? "적 기함 격침 — 적 증원 편대가 끊깁니다!" : "아군 기함 피격 침몰… 증원이 줄어듭니다!", side ? "#35ff7a" : "#ff8a7a");
    }
    this.shipsN = sn;
    const sa = this.strength(0), se = this.strength(1);
    if (se < 0.5 && !this.said.e50) { this.said.e50 = 1; this._call(`${this.eName} 전력 절반 아래로! 몰아붙여요!`, "#35ff7a"); }
    if (se < 0.2 && se > 0 && !this.said.e20) { this.said.e20 = 1; this._call(`${this.eName}가 무너집니다. 조금만 더!`, "#35ff7a"); }
    if (sa < 0.5 && !this.said.a50) { this.said.a50 = 1; this._call("아군 함대 전력 절반 이하! 전열을 지켜요!", "#ff8a7a"); }
    if (sa < 0.25 && sa > 0 && !this.said.a25) { this.said.a25 = 1; this._call("아군 함대 붕괴 직전! 버텨 주세요!", "#ff6b5a"); }
    if (this.t % 12 < 1) {
      const dl = this.line - this.lastLine; this.lastLine = this.line;
      if (dl > 14 && !this._recent("fwd", 40)) this._call("전선이 앞으로 밀립니다. 이대로 밀어붙여요!", "#9fd8ff", 1, "fwd");
      else if (dl < -14 && !this._recent("back", 40)) this._call("전선이 밀리고 있어요! 아군 함대를 엄호해 주세요!", "#ffb02e", 1, "back");
    }
  }
  _recent(tag, sec) { const t = this.said["t_" + tag]; return t !== undefined && this.t - t < sec; }
  _call(text, color = "#9fd8ff", delay = 0, tag = null) {
    if (tag) this.said["t_" + tag] = this.t;
    this.calls.push({ text, color });
    if (this.calls.length > 4) this.calls.splice(1, 1);
    if (this.calls.length === 1) this.callT = 3.4 + delay;
  }
  _sideOf(p) {
    const me = this.s.player.body.pos, hd = this.s.player.body.heading;
    const a = Math.atan2(-(p.x - me.x), -(p.z - me.z)) - hd, r = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(r) < 0.8 ? "정면" : Math.abs(r) > 2.35 ? "후방" : r > 0 ? "왼쪽" : "오른쪽";
  }
  _snd(name, pos, vol = 1, rate = 1) { const c = this.c; if (c.snd && c.volAt) c.snd.play(name, c.volAt(pos) * vol, c.panAt(pos), rate); }

  // ── 그리기 ──
  _draw(live) {
    for (const f of this.flock) f.begin();
    const cam = this.s.camera.position;
    // 승격된 액터: 카메라에 가장 가까운 몇 기(this.nearN, 65 m 안)만 진짜 모델, 나머지는 그 자세 그대로 인스턴스로 (그리기 호출 절약)
    const near = this._near || (this._near = []);
    near.length = 0;
    for (const side of [0, 1]) for (const a of this.pool[side]) if (a.alive && a.swarmU) { a._d2 = a.pos.distanceToSquared(cam); near.push(a); }
    near.sort((x, y) => x._d2 - y._d2);
    near.forEach((a, i) => { a.model.visible = i < this.nearN && a._d2 < (a.model.visible ? 75 * 75 : 65 * 65); });
    for (const u of this.units) {
      if (u.dead) continue;
      const f = this.flock[u.side];
      if (u.actor) {
        const a = u.actor;
        if (!a.model.visible) { _m.compose(a.pos, a.model.quaternion, _s.set(f.S, f.S, f.S)); f.put(_m); }
        continue;
      }
      _z.copy(u.vel); if (_z.lengthSq() < 0.01) _z.set(0, 0, -1); _z.normalize().negate();   // 모델 앞 = -Z
      _x.crossVectors(UP, _z); if (_x.lengthSq() < 1e-4) _x.set(1, 0, 0); _x.normalize();
      _y.crossVectors(_z, _x);
      const cb = Math.cos(u.bank), sb = Math.sin(u.bank);
      _a.copy(_x).multiplyScalar(cb).addScaledVector(_y, sb);
      _b.copy(_y).multiplyScalar(cb).addScaledVector(_x, -sb);
      _m.makeBasis(_a, _b, _z);
      const S = f.S * (u.st === 2 ? 0.9 : 1);
      _m.scale(_s.set(S, S, S)); _m.setPosition(u.pos);
      f.put(_m);
    }
    for (const f of this.flock) f.end();
    if (!live) return;
    const fx = this.fx, ec = COL[this.ail ? "ail" : "eia"];
    for (const s of this.shots) fx.bolt(s.p, s.d, 4.5, s.side ? ec : COL.ally, 0.26);
    for (const m of this.missiles) fx.bolt(m.p, _a.copy(m.v).normalize(), 1.8, 0xe8edf4, 0.32);
    fx.endBolts();
  }

  // 레이더: 승격되지 않은 함대 드론은 흐린 점
  radar(dot, u, range) {
    const me = this.s.player.body.pos, r2 = range * range;
    for (const x of this.units) {
      if (!x.alive || x.actor) continue;
      const dx = x.pos.x - me.x, dz = x.pos.z - me.z;
      if (dx * dx + dz * dz > r2) continue;
      dot(x.pos, x.side ? "rgba(255,110,110,0.55)" : "rgba(110,180,255,0.55)", 1.7 * u, 0);
    }
  }

  // ── HUD: 위 가운데 함대 전력 막대 + 무전 ──
  hud(h) {
    if (h.lvl === "off" || this.mode.cut || this.mode.state === "countdown" && this.mode.time < 0) return;
    const u = h.u, L = h.L, g = h.g, c = this.c;
    let nb = 0;
    for (const a of c.actors) if (a.alive && a.bossBar && a.targetable) nb++;
    const W = 330 * u, ph = 32 * u, x = L.cx - W / 2;
    const y = this.surv ? L.subY + 2 * u : L.subY + 30 * u + nb * 44 * u;
    const sa = this.strength(0), se = this.strength(1), pa = Math.round(sa * 100), pe = Math.round(se * 100);
    h.plate(x, y, W, ph, { fill: "rgba(10,16,30,0.8)", skew: 0.14, accent: "#5aa9ff" });
    h.text("함대 전력", x + 22 * u, y + 11 * u, { size: 11, base: "middle", color: "#ffd24a", shadow: false });
    h.text(`아군 ${pa}%`, L.cx - 8 * u, y + 11 * u, { size: 12, align: "right", base: "middle", color: "#8cc4ff", shadow: false });
    h.text("·", L.cx + 4 * u, y + 11 * u, { size: 12, align: "center", base: "middle", color: "#b4c2d4", shadow: false });
    h.text(`적 ${pe}%`, L.cx + 16 * u, y + 11 * u, { size: 12, base: "middle", color: "#ff8a94", shadow: false });
    if (h.lvl === "full") h.text(`${this.alive[0]} : ${this.alive[1]}기`, x + W - 16 * u, y + 11 * u, { size: 10.5, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
    // 줄다리기 막대: 왼쪽 아군(가운데에서 왼쪽으로), 오른쪽 적(가운데에서 오른쪽으로)
    const bw = (W - 44 * u) / 2, by = y + 21 * u, bh = 6 * u, cx = L.cx + 4 * u;
    g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(cx - bw - 1.5 * u, by - 1.5 * u, bw * 2 + 3 * u, bh + 3 * u);
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(cx - bw, by, bw * 2, bh);
    g.fillStyle = "#4aa0ff"; g.fillRect(cx - bw * sa, by, bw * sa, bh);
    g.fillStyle = "#ff4a5a"; g.fillRect(cx, by, bw * se, bh);
    g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(cx - bw * sa, by, bw * sa + bw * se, bh * 0.4);
    g.fillStyle = "#fff"; g.fillRect(cx - 1 * u, by - 2 * u, 2 * u, bh + 4 * u);
    // 무전 한 줄
    const cl = this.calls[0];
    if (cl) {
      const k = clamp(Math.min((3.4 - this.callT) * 4, this.callT * 2 + 1), 0, 1);
      g.save(); g.globalAlpha = k * h.opacity;
      h.text(`📡 ${this.who}`, L.cx, y + ph + 14 * u, { size: 11, align: "center", base: "middle", color: "#9fd8ff" });
      h.text(cl.text, L.cx, y + ph + 31 * u, { size: 13.5, align: "center", base: "middle", color: cl.color });
      g.restore();
    }
  }

  dispose() {
    for (const f of this.flock) f.dispose();
    if (this.c.swarm === this) this.c.swarm = null;
    this.units = []; this.shots = []; this.missiles = []; this.squads = [];
  }
}
