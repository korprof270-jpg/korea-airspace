// 레이드 · 우주 전쟁: 매시 정각부터 1시간 동안 열리는 공동 보스전. 언제든 들어오고 나갈 수 있고, 관전도 된다
//
// 서버가 없다 → 모두가 같은 것을 계산한다
//  · 시계: 벽시계(매시 정각 = 0초)로 지금 몇 번째 웨이브인지 모두 같게 안다 (10분 웨이브 6개)
//  · 보스: 각자 자기 화면에서 보스를 시뮬레이션하고, "보스에게 준 누적 피해"만 프레즌스 필드로 나눈다
//    보스 체력 = 체력 풀 − (모든 참가자 누적 피해의 합, 다른 사람이 알려 준 합 중 큰 값) → 누가 들어오고 나가도 같은 값으로 모인다
//  · 다른 참가자 기체는 NetGame 원격 플레이어로 보인다. 관전자는 숨는다
//  · 온라인 방(claude.ai 아티팩트의 room 기능)을 쓸 수 없으면 AI 윙맨과 혼자 진행
// 재미 요소: ⓟ 업그레이드(AOS 와 같은 창), 연속 격추 궤도 폭격, 모함 정비 구역, 보급 캡슐, 보스 격노, 기여도 순위판·MVP
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { drawCombatHud } from "../combathud.js";
import { NetGame } from "../netgame.js";
import { clamp, fmtTime } from "../config.js";
import { PLAYER_HP } from "../combat.js";
import { UP, UP_KEYS, UP_MAX } from "./aos.js";
import { AosShop } from "./aos-hud.js";
import { registerMode } from "../session.js";

const V3 = THREE.Vector3, _v = new V3();
const HOUR = 3600, WAVE = 600, POOL = 14000;
const UP_COST = [80, 140, 220, 320, 450];
// 웨이브마다 보스: fleet 초거대 함대 · titan 초거대 로봇 · combo 둘 다 · omega 최종
const WAVES = ["fleet", "titan", "fleet", "titan", "combo", "omega"];
const WNAME = { fleet: "초거대 함대 '심판'", titan: "초거대 로봇 '골리앗'", combo: "합동 공세 — 골리앗 & 심판", omega: "최종 병기 '오메가'" };
const rnd = (a, b) => a + Math.random() * (b - a), pick = (L) => L[Math.floor(Math.random() * L.length)];
const WING = ["매 1", "매 2", "매 3"];

export class RaidMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.R = cfg.raid || {};
    this.spec = !!this.R.spectate;
    this.ng = new NetGame(this, cfg.net || null);
    const now = Date.now();
    this.hourId = Math.floor(now / (HOUR * 1000));
    this.t0 = (now % (HOUR * 1000)) / 1000;            // 이번 레이드에서 지난 시간(초)
    this.duration = Math.max(30, HOUR - this.t0);      // 정각까지 남은 시간
    this.title = this.spec ? "레이드 · 관전" : "레이드 · 우주 전쟁";
    this.waveI = -1; this.bossRoots = []; this.boss = null; this.myDmg = 0; this.known = 0; this.rec = new Map(); this.peak = 1;
    this.pts = 0; this.streak = 0; this.downs = 0; this.bossKills = 0; this.totalDmg = 0; this.capT = 40; this.escT = 8; this.enraged = false;
    this.hudN = 0; this.specI = 0;
  }
  get rt() { return this.t0 + this.time; }             // 레이드 시계(초)
  get online() { return this.ng.online; }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat;
    const c = this.initCombat({
      onKill: (a, k) => this._onKill(a, k),
      onDamage: (a, amt, k) => this._onDamage(a, amt, k),
      spawnPoint: (a) => this._spawn(a),
    });
    this.ng.attach(c);
    const me = this.me;
    me.name = this.R.name || "나";
    me.aos = { pts: 0, up: { fire: 0, armor: 0, move: 0, skill: 0 } };
    this.L0 = Object.assign({}, c.L);
    const A = new V3(mc.blue[0], 0, mc.blue[1]), B = new V3(mc.red[0], 0, mc.red[1]);
    this.home = A; this.center = A.clone().lerp(B, 0.62); this.center.y = w.h(this.center.x, this.center.z);
    // 아군 모함: 출격·정비 지점 (무적). 근처에서 체력이 빠르게 찬다
    const mp = A.clone(); mp.y = w.h(mp.x, mp.z) + 40;
    this.mother = c.units.spawn("flagship", { pos: mp, near: true, home: mp, name: "아군 모함 '한빛'" });
    this._lift(this.mother.unit.group);
    this.mother.team = 0; for (const q of this.mother.unit.parts) q.team = 0;
    this.mother.name = "아군 모함 '한빛'"; this.mother.invulnerable = true; this.mother.targetable = false;
    for (const q of this.mother.unit.parts) { q.invulnerable = true; q.targetable = false; }
    const sp = this._spawn(me); this.placePlayer(sp.pos, sp.yaw);
    if (this.spec) { me.invulnerable = true; me.targetable = false; me.respawns = false; this.s.player.frozen = true; }
    else this.shop = new AosShop(this);
    if (this.shop) { const t = this.shop.el.querySelector("b"); if (t) t.textContent = "레이드 업그레이드"; }
    // 혼자(또는 둘)일 때는 AI 윙맨이 함께
    const others = this.ng.players().filter((p) => !p.me).length;
    if (!this.spec) for (let i = 0; i < Math.max(0, 3 - others); i++) {
      const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.4, leader: me, slot: i, name: WING[i] });
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
    c.scatterPickups(6);
    this.ng.setField("sp", this.spec ? 1 : 0);
  }

  _spawn(a) {
    const w = this.s.world, p = this.home.clone();
    const ang = Math.random() * Math.PI * 2, r = 20 + Math.random() * 18;
    p.x += Math.cos(ang) * r; p.z += Math.sin(ang) * r; p.y = w.h(p.x, p.z) + (a.isPlayer ? 6 : 14);
    for (let i = 0; i < 12 && w.col.blocked(p, 1.8); i++) p.y += 3;
    _v.copy(this.center).sub(p).setY(0);
    return { pos: p, yaw: Math.atan2(-_v.x, -_v.z) };
  }

  // ── 업그레이드 (AosShop 이 부른다) ──
  inBase() { return true; }
  cost(a, key) { const lv = a.aos.up[key]; return lv >= UP_MAX ? Infinity : UP_COST[lv]; }
  wantBuy(key) {
    const me = this.me, D = me.aos, c = this.cost(me, key);
    if (!(D.pts >= c)) return false;
    D.pts -= c; D.up[key]++;
    this._applyStats();
    this.s.game.sound.play("pickup");
    this.s.hud.toast(`${UP[key].name} Lv${D.up[key]}`, UP[key].color, 1, 20);
    return true;
  }
  _applyStats() {
    const me = this.me, u = me.aos.up, L = this.combat.L, L0 = this.L0;
    L.laserDmg = L0.laserDmg + 0.15 * u.fire; L.mDmg = L0.mDmg + 0.15 * u.fire;
    L.thrust = (L0.thrust || 0) + 0.06 * u.move; L.gauge = (L0.gauge || 0) + 0.15 * u.skill; L.mCap = (L0.mCap || 0) + u.skill;
    const mh = PLAYER_HP * (1 + (L0.hp || 0)) * (1 + 0.15 * u.armor), d = mh - me.maxHp;
    me.maxHp = mh; me.hp = clamp(me.hp + Math.max(0, d), 0, mh);
  }
  _give(n) { if (this.spec) return; this.me.aos.pts += n; this.pts += n; this.me.score += n; }

  // ── 보스 ──
  _poolMax() { return POOL * (1 + 0.5 * (this.peak - 1)); }
  _wave(i) {
    // 지난 웨이브 정리
    for (const r of this.bossRoots) if (r.alive) { r.alive = false; r.unit.group.visible = false; r.targetable = false; this.combat.removeActor && this.combat.removeActor(r); }
    this.bossRoots = []; this.myDmg = 0; this.known = 0; this.rec.clear(); this.enraged = false; this.bossDown = false;
    this.waveI = i;
    const type = WAVES[i % WAVES.length], c = this.combat, P = this._poolMax(), C = this.center;
    const mk = (kind, share, o) => {
      const p = C.clone().add(new V3(rnd(-40, 40), 0, rnd(-40, 40)));
      const r = c.units.spawn(kind, Object.assign({ pos: p, near: true, home: p.clone() }, o));
      r.maxHp = r.hp = P * share; r.raidBoss = true; r.raidShare = share;
      this._lift(r.unit.group);
      this.bossRoots.push(r);
      return r;
    };
    if (type === "fleet" || type === "combo" || type === "omega") { const r = mk("flagship", type === "fleet" ? 1 : 0.45, { name: "초거대 기함 '심판'", rank: 18 }); r.name = "초거대 기함 '심판'"; }
    if (type === "titan" || type === "combo" || type === "omega") {
      const om = type === "omega";
      const r = mk("titan", type === "titan" ? 1 : om ? 0.55 : 0.55, { scale: om ? 3.6 : 3.1, rank: om ? 20 : 17, name: om ? "최종 병기 '오메가'" : "초거대 로봇 '골리앗'" });
      r.name = om ? "최종 병기 '오메가'" : "초거대 로봇 '골리앗'";
    }
    this.boss = { type, name: WNAME[type], t: 0 };
    if (type === "fleet" || type === "omega") for (const k of ["carrier", "destroyer", "destroyer"]) { const e = c.units.spawn(k, { pos: C.clone().add(new V3(rnd(-90, 90), 0, rnd(-90, 90))), near: true }); this._lift(e.unit.group); }
    this.s.game.sound.play("warn");
    const first = this.bossRoots[0];
    if (first && this.time > 1) this.bossIntro(first, this.boss.name, `웨이브 ${i % WAVES.length + 1} / ${WAVES.length}`, false);
    else this.s.hud.toast(`⚠ ${this.boss.name} 출현`, "#ff3d4d", 3, 30);
  }
  // 우주 맵은 조명이 어두워 큰 기체가 검은 덩어리로 보인다 → 재질마다 자체 발광을 더해 윤곽과 색이 보이게
  _lift(g) {
    const done = new Map();
    g.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const one = (m) => {
        if (!m || !m.emissive || m.blending === THREE.AdditiveBlending) return m;
        let c = done.get(m);
        if (!c) {
          c = m.clone();
          const base = m.vertexColors ? new THREE.Color(0x9aa6bc) : m.color.clone();
          c.emissive = base.multiplyScalar(0.42).add(new THREE.Color(0x1a2030));
          done.set(m, c);
        }
        return c;
      };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    });
  }
  _bossHp() { let h = 0, m = 0; for (const r of this.bossRoots) { m += r.maxHp; if (r.alive) h += r.hp; } return { h, m }; }

  _onDamage(a, amt, k) {
    if (!k || k !== this.me || !amt) return;
    if (a.team === 0) return;
    this._give(Math.min(amt, 150) * 0.12);       // 맞힐 때마다 ⓟ (한 번에 최대 18)
    if (a.raidBoss) { this.myDmg += amt; this.totalDmg += amt; }
  }
  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (a.raidBoss) {
      if (!this.bossRoots.some((r) => r !== a && r.alive) && !this.bossDown) this._bossDefeated();
      return;
    }
    if (k === me && a.team !== 0) {
      const pts = a.unit ? 60 : a.kind === "turret" ? 40 : 25;
      this._give(pts);
      h.toast(`${a.name} 격추  +${pts}ⓟ`, "#ffd24a", 1, 18);
      if (++this.streak % 5 === 0) this._orbital();
    }
    if (a === me) { this.streak = 0; this.downs++; }
    if (k && k !== a && (k.kind === "player" || k.kind === "bot" || k.remote)) h.feed(`${k.name} ▸ ${a.name}`, k === me ? "#ffd24a" : a === me ? "#ff6b5a" : "#cfd8e3");
  }
  _bossDefeated() {
    this.bossDown = true; this.bossKills++;
    for (const r of this.bossRoots) if (r.alive) this.combat.kill(r, null);
    const share = this.myDmg / Math.max(1, this._poolMax());
    const bonus = share >= 0.01 ? 300 + Math.round(share * 400) : 0;
    this._give(bonus);
    this.s.hud.toast(`보스 격파!${bonus ? `  기여 ${Math.round(share * 100)}% · +${bonus}ⓟ` : ""}`, "#35ff7a", 3, 32);
    this.s.game.sound.play("bigkill");
    // 보급 시간: 맵 가운데에 보급품
    for (let i = 0; i < 4; i++) this.combat.addPickup(this.combat.randomPoint(4, 14, 0, this.center.x, this.center.z, 60));
  }
  // 연속 5격추: 궤도 폭격 — 조준 중인 적(없으면 가장 가까운 적) 주변에 큰 폭발
  _orbital() {
    const c = this.combat, me = this.me;
    let t = c.lock && c.lock.alive ? c.lock : null, bd = 1e9;
    if (!t) for (const a of c.actors) if (a.alive && a.targetable && a.team !== 0 && !a.static) { const d = a.pos.distanceTo(me.pos); if (d < bd) { bd = d; t = a; } }
    if (!t) return;
    const p = t.pos.clone();
    this.s.hud.toast("연속 격추! 궤도 폭격 요청", "#ff8a3a", 1.8, 24);
    setTimeout(() => {
      if (this.state !== "run") return;
      c.fx.explosion(p, 4); c.fx.ring(p, 0xff8a3a, 28, 0.6); c._blast(p, 3);
      for (const a of c.actors) if (a.alive && a.team !== 0 && a.targetable) { const d = a.pos.distanceTo(p); if (d < 28) c.damage(a, (a.raidBoss ? 500 : 300) * (1 - d / 34), me, p); }
    }, 1200);
  }

  // ── 온라인: 보스 누적 피해 나누기 ──
  _sync() {
    const ng = this.ng, key = this.hourId * 10 + this.waveI;
    let n = 0, sum = 0, kmax = 0;
    for (const p of ng.players()) {
      const sp = ng.field(p.id, "sp");
      if (sp) { if (p.actor && !p.me) { if (p.actor.model) p.actor.model.visible = false; p.actor.targetable = false; } continue; }
      n++;
      const f = ng.field(p.id, "rd");
      if (Array.isArray(f) && f[0] === key) {
        const d = Math.max(0, Math.min(5e6, +f[1] || 0));
        this.rec.set(p.id, Math.max(this.rec.get(p.id) || 0, d));
        kmax = Math.max(kmax, +f[2] || 0);
        this.peak = Math.max(this.peak, Math.min(8, +f[3] || 1));
      }
    }
    this.rec.set(ng.myId, Math.max(this.rec.get(ng.myId) || 0, this.myDmg));
    for (const v of this.rec.values()) sum += v;
    this.peak = Math.max(this.peak, Math.min(8, n || 1));
    this.known = Math.max(sum, Math.min(kmax, this._poolMax()));
    ng.setField("rd", [key, Math.round(this.myDmg), Math.round(this.known), this.peak]);
    // 보스 체력을 모두가 아는 누적 피해에 맞춘다 (내려가기만)
    const P = this._poolMax();
    for (const r of this.bossRoots) {
      if (!r.alive) continue;
      const mh = P * r.raidShare;
      if (Math.abs(r.maxHp - mh) > 1) { const k = r.hp / r.maxHp; r.maxHp = mh; r.hp = mh * k; }
      const want = Math.max(0, mh - this.known * r.raidShare);
      if (want < r.hp) r.hp = want;
      if (r.hp <= 0.5) this.combat.kill(r, null);
    }
  }

  update(dt) {
    super.update(dt);
    this.ng.update(dt);
    this.hudN++;
    if (this.shop) this.shop.update(dt);
    const me = this.me, c = this.combat;
    if (this.spec) this._spectate(dt);
    if (this.state !== "run") return;
    const wi = Math.floor(this.rt / WAVE);
    if (wi !== this.waveI && wi < HOUR / WAVE) this._wave(wi);
    if ((this.syncT = (this.syncT || 0) - dt) <= 0) { this.syncT = 0.5; this._sync(); }
    // 보스 격노: 남은 체력 30%
    const { h, m } = this._bossHp();
    if (!this.enraged && m > 0 && h > 0 && h / m < 0.3) {
      this.enraged = true; this.s.hud.toast("보스 격노! 공격이 거세집니다", "#ff3d4d", 2.4, 28); this.s.game.sound.play("warn");
      c.diff = Object.assign({}, c.diff, { dmg: c.diff.dmg * 1.25 });
    }
    // 호위 드론
    if (!this.bossDown && (this.escT -= dt) <= 0) {
      this.escT = this.enraged ? 9 : 14;
      let alive = 0; for (const a of c.actors) if (a.alive && a.kind === "bot" && a.team === 1) alive++;
      const cap = this.s.game.q === "low" ? 6 : 9;
      for (let i = 0; i < Math.min(2, cap - alive); i++) {
        const p = this.center.clone().add(new V3(rnd(-60, 60), rnd(20, 40), rnd(-60, 60)));
        const b = c.spawnBot({ kind: pick(["grunt", "grunt", "ace", "kamikaze", "shield", "sniper"]), team: 1, pos: p, temp: true });
        if (b && b.ai) b.ai.home = this.center;
      }
    }
    // 보급 캡슐: 1분마다 내 근처에 하나
    if (!this.spec && (this.capT -= dt) <= 0) { this.capT = 60; c.addPickup(c.randomPoint(3, 10, 0, me.pos.x, me.pos.z, 40)); this.s.hud.feed("보급 캡슐 투하 — 근처를 살펴보세요", "#8cff4a"); }
    // 모함 정비 구역
    if (me.alive && !this.spec && this.mother && me.pos.distanceTo(this.mother.pos) < 55 && me.hp < me.maxHp) { me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.08 * dt); this.inDock = true; } else this.inDock = false;
    if (this.time >= this.duration) this._end();
  }

  // 관전: 보스 · 다른 참가자 · AI 사이를 [발사]로 돌아가며 뒤에서 따라간다
  _spectate(dt) {
    const s = this.s, pl = s.player, b = pl.body, inp = s.game.input, me = this.me;
    pl.frozen = true; if (pl.model) pl.model.visible = false;
    me.invulnerable = true; me.targetable = false;
    const list = [...this.bossRoots.filter((r) => r.alive), ...this.ng.players().filter((p) => !p.me && p.actor && !this.ng.field(p.id, "sp")).map((p) => p.actor), ...this.combat.actors.filter((a) => a.alive && a.kind === "bot" && a.team === 0)];
    if (inp.take("fire") || inp.take("missile")) { this.specI++; s.game.sound.play("click"); }
    const t = list.length ? list[this.specI % list.length] : null;
    this.specT = t;
    if (!t) return;
    const big = t.raidBoss ? 70 : 9;
    _v.copy(t.pos).sub(this.center).setY(0); if (_v.lengthSq() < 1) _v.set(0, 0, 1); _v.normalize();
    const want = t.pos.clone().addScaledVector(_v, big).add(new V3(0, big * 0.45, 0));
    b.pos.lerp(want, Math.min(1, dt * 2.5)); b.vel.set(0, 0, 0);
    const m = new THREE.Matrix4().lookAt(b.pos, t.pos, new V3(0, 1, 0)); b.quat.setFromRotationMatrix(m);
  }

  missionObjective(o) {
    const me = this.me; let best = null, bd = 1e9;
    for (const r of this.bossRoots) if (r.alive) { const d = r.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = r; } }
    if (!best) return null;
    o.pos = best.pos; o.label = best.name; o.color = "#ff3d4d";
    return o;
  }

  hud(h) {
    const u = h.u, L = h.L, me = this.me;
    drawCombatHud(this.combat, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const cx = L.cx, y0 = L.t + 8 * u;
    // 레이드 시계 · 웨이브 · 보스 체력
    const wv = this.waveI >= 0 ? this.waveI % WAVES.length + 1 : 1, left = Math.max(0, this.duration - this.time);
    h.plate(cx - 200 * u, y0, 400 * u, 56 * u, { skew: 0.06, fill: "rgba(8,12,26,0.85)", accent: "#ff3d4d" });
    h.text(`RAID · 웨이브 ${wv}/${WAVES.length} · 남은 시간 ${fmtTime(left).replace(/\.\d+$/, "")}${this.online ? ` · 참가 ${this.peak}명` : " · 오프라인(AI 윙맨)"}`, cx, y0 + 13 * u, { size: 11.5, align: "center", base: "middle", bold: true, color: "#ffb4a8", shadow: false });
    const { h: bh, m: bm } = this._bossHp();
    if (this.boss && bm > 0 && !this.bossDown) {
      h.text(`${this.boss.name}${this.enraged ? " · 격노" : ""}`, cx, y0 + 29 * u, { size: 12.5, align: "center", base: "middle", bold: true, color: this.enraged ? "#ff3d4d" : "#fff", shadow: false });
      h.bar(cx - 180 * u, y0 + 40 * u, 360 * u, 8 * u, clamp(bh / bm, 0, 1), this.enraged ? "#ff3d4d" : "#ff8a3a");
    } else {
      const nx = Math.max(0, (this.waveI + 1) * WAVE - this.rt);
      h.text(this.waveI + 1 >= HOUR / WAVE ? "레이드 마무리 — 정각에 새 레이드" : `보급 시간 · 다음 보스까지 ${Math.ceil(nx)}초`, cx, y0 + 34 * u, { size: 12.5, align: "center", base: "middle", bold: true, color: "#8cff4a", shadow: false });
    }
    // 왼쪽: ⓟ 판 (누르면 업그레이드 창)
    if (!this.spec) {
      const x = L.l, y = L.t + 100 * u, w = 214 * u, hh = 40 * u, D = me.aos;
      h.plate(x, y, w, hh, { skew: 0.08, fill: "rgba(8,12,26,0.86)", accent: "#ffd24a" });
      h.text(`ⓟ ${Math.floor(D.pts)}`, x + 14 * u, y + 13 * u, { size: 15, base: "middle", bold: true, color: "#ffd24a", shadow: false });
      h.text(UP_KEYS.map((k) => `${UP[k].icon}${D.up[k]}`).join(" "), x + w - 12 * u, y + 13 * u, { size: 11, align: "right", base: "middle", color: "#cfd8e6", shadow: false });
      h.text(this.combat.touchUI() ? "눌러서 업그레이드" : `업그레이드 [${h.keyName ? h.keyName("item", "E") : "E"}]`, x + 14 * u, y + 29 * u, { size: 10, base: "middle", color: "#9aa8bc", shadow: false });
      const dpr = 1; this.panelRect = { x: x / dpr, y: y / dpr, w, h: hh, f: this.hudN };
      if (this.streak > 0) h.text(`연속 격추 ${this.streak} · 5마다 궤도 폭격`, x + 6 * u, y + hh + 14 * u, { size: 11, color: "#ff8a3a" });
      if (this.inDock) h.text("모함 정비 구역 · 체력 회복 중 ✚", cx, h.H * 0.66, { size: 14, align: "center", color: "#8cff4a" });
    }
    // 오른쪽: 기여도 순위판 (이번 웨이브 보스 피해)
    const rows = [];
    for (const [id, d] of this.rec) if (d > 0) rows.push([id === this.ng.myId ? me.name + " (나)" : this.ng.nameOf ? this.ng.nameOf(id) : id, d]);
    rows.sort((a, b) => b[1] - a[1]);
    if (rows.length) {
      const x = L.r - 200 * u, y = h.H * 0.3;
      h.plate(x, y, 200 * u, (22 + rows.slice(0, 5).length * 17) * u, { side: "right", fill: "rgba(8,12,26,0.8)", accent: "#ff8a3a" });
      h.text("보스 피해 순위", x + 12 * u, y + 12 * u, { size: 11, base: "middle", bold: true, color: "#ff8a3a", shadow: false });
      rows.slice(0, 5).forEach(([n, d], i) => {
        h.text(`${i === 0 ? "★ " : `${i + 1}. `}${n}`, x + 12 * u, y + (29 + i * 17) * u, { size: 11, base: "middle", color: i === 0 ? "#ffd24a" : "#e8f4ff", shadow: false });
        h.text(`${Math.round(d)}`, x + 188 * u, y + (29 + i * 17) * u, { size: 11, align: "right", base: "middle", mono: true, color: "#cfd8e6", shadow: false });
      });
    }
    if (this.spec) {
      const t = this.specT;
      h.text(`관전 중${t ? ` · ${t.name}` : ""}`, cx, h.H * 0.8, { size: 16, align: "center", bold: true, color: "#9fd8ff" });
      h.text(`[${h.keyName ? h.keyName("fire", "발사") : "발사"}] 다음 대상 · Esc 메뉴`, cx, h.H * 0.8 + 20 * u, { size: 12, align: "center", color: "#cfd8e6" });
    }
  }

  _end() {
    if (this.state === "done") return;
    const me = this.me, rows = [...this.rec.entries()].sort((a, b) => b[1] - a[1]);
    const rank = rows.findIndex(([id]) => id === this.ng.myId) + 1;
    this.finish({
      title: this.spec ? "관전 종료" : "레이드 종료", sub: `보스 격파 ${this.bossKills}회 · 다음 레이드는 정각에 시작`, win: this.bossKills > 0, stars: Math.min(3, this.bossKills),
      lines: this.spec ? [{ label: "격파한 보스", value: `${this.bossKills}` }] : [
        { label: "보스에게 준 피해(누적)", value: `${Math.round(this.totalDmg)}` }, { label: "이번 웨이브 피해 순위", value: rank ? `${rank}위 / ${rows.length}명` : "-" },
        { label: "얻은 ⓟ", value: `${Math.round(this.pts)}` }, { label: "격추 / 피격추", value: `${me.kills} / ${me.deaths}` },
        { label: "업그레이드", value: UP_KEYS.map((k) => `${UP[k].name} ${me.aos.up[k]}`).join(" · ") }],
    });
  }

  dispose() { if (this.shop) this.shop.dispose(); if (this.ng) this.ng.dispose(); super.dispose(); }
}

registerMode("raid", RaidMode);
