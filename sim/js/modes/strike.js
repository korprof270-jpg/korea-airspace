// 돌파 작전: 구역을 하나씩 깨며 적 본진까지 전진하는 단계형 작전 (서바이벌 · 중간 이상 맵)
//  · 구역마다 적이 2~3파로 나온다. 모두 격추하면 다음 구역까지 빛 고리가 길을 안내한다
//  · 갈림길: 루트 A·B·C 입구(빛 기둥 원)가 나란히 뜨고, 들어가는 쪽으로 진행된다 (선택 창 없음)
//      A 지상 돌파(전차·로봇) · B 공중전(드론·전투기 편대) · C 함대 강습(구축함·항모)
//  · 구역마다 파 사이에 중간 보스, 마지막에 스테이지 보스(전차·로봇·함선·강습선 등 구역·루트마다 다름). 최종 구역은 최종 병기
//  · 목숨 3개. 격추한 적이 가끔 보급품을 떨어뜨린다
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { drawCombatHud } from "../combathud.js";
import { clamp, fmtTime, submitRecord, records } from "../config.js";
import { registerMode } from "../session.js";
import { NetGame } from "../netgame.js";
// 같은 씨앗이면 모두 같은 수열: 협동에서 모든 화면에 같은 적이 같은 자리에 나오게
const mul32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const KINDS = { tank: ["tank", "tank", "lighttank", "heavytank", "missiletank"], robot: ["aa", "sniperbot", "shieldbot", "mortarbot"], ship: ["frigate", "destroyer", "destroyer"] };

const V3 = THREE.Vector3, _v = new V3();
const rnd = (a, b) => a + Math.random() * (b - a), pick = (L) => L[Math.floor(Math.random() * L.length)];
const ROUTE = {
  A: { name: "지상 돌파", col: 0xff7a3a, css: "#ff7a3a", desc: "전차·로봇 지상 부대" },
  B: { name: "공중전", col: 0x5ab4ff, css: "#5ab4ff", desc: "드론·전투기 편대" },
  C: { name: "함대 강습", col: 0xffd24a, css: "#ffd24a", desc: "구축함·항모 전단" },
};
const LIVES = 3;
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

export class StrikeMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.duration = 3600; this.title = "서바이벌 · 돌파 작전";
    this.recKey = `strike:${session.map.id}`;
    this.lives = LIVES; this.si = -1; this.phase = "go"; this.list = []; this.wave = 0; this.route = [];
    // 협동: cfg.coop = { ids: [참가자 peer…], host, seed, name }. 방장이 진행(구역 진입·갈림길·다음 파)을 정하고 모두 따른다
    this.co = cfg.coop || null;
    this.ng = new NetGame(this, cfg.net || null);
    this.auth = !this.co || !this.ng.online || this.co.host === this.ng.myId;
    this.seed = this.co ? this.co.seed : Math.floor(Math.random() * 1e9);
    this.km = new Set(); this.bd = {}; this.myBossDmg = {}; this.out = false; this.wk = -1; this.syncT = 0;
    this.gfx = []; this.gates = null; this.endT = -1; this.cleared = 0; this.kills = 0; this.bossDead = false; this.noHit = true;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat;
    const c = this.initCombat({ onKill: (a, k) => this._onKill(a, k), onDamage: (a, amt, k) => this._onDmg(a, amt, k), spawnPoint: (a) => this._spawn(a) });
    this.ng.attach(c);
    if (this.co) this.me.name = this.co.name || "파일럿";
    const A = new V3(mc.blue[0], 0, mc.blue[1]), B = new V3(mc.red[0], 0, mc.red[1]), lim = w.size - 25;
    const axis = B.clone().sub(A).setY(0); const L = axis.length(); axis.normalize();
    const side = new V3(-axis.z, 0, axis.x), half = Math.min(w.size * 0.55, Math.max(60, L * 0.32));
    const at = (t, v) => { const p = A.clone().addScaledVector(axis, L * t).addScaledVector(side, v * half); p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim); p.y = w.h(p.x, p.z); return p; };
    this.at = at; this.axis = axis;
    // 단계 계획: 구역 2개 → 갈림길 → 루트 구역 → 구역 → 갈림길 → 루트 구역 → 최종 보스
    this.plan = [
      { kind: "zone", t: 0.14, v: 0, name: "제1 구역 · 전초선", waves: [["drone", 4], { mid: "gunMid" }, ["drone", 3, "ace", 1], { boss: "turtle" }] },
      { kind: "zone", t: 0.3, v: 0, name: "제2 구역 · 방어선", waves: [["tank", 1, "robot", 1, "drone", 3], { mid: "sniperK" }, ["drone", 3, "jet", 1], { boss: "giant" }] },
      { kind: "fork", t: 0.44, n: 1 },
      { kind: "route", t: 0.54, n: 1 },
      { kind: "zone", t: 0.68, v: 0, name: "제4 구역 · 중앙 관문", waves: [["drone", 4, "robot", 1], { mid: "shieldK" }, ["ace", 2, "tank", 1], { boss: "cruiser" }] },
      { kind: "fork", t: 0.78, n: 2 },
      { kind: "route", t: 0.86, n: 2 },
      { kind: "boss", t: 0.97, v: 0, name: "최종 구역 · 적 본진", waves: [{ mid: "twin" }, ["ace", 3, "drone", 2], { boss: "omega", final: true }] },
    ];
    const sp = this._spawn(this.me); this.placePlayer(sp.pos, sp.yaw);
    c.scatterPickups(4);
    // 혼자면 AI 윙맨 3기가 함께 (4기 편대)
    if (!this.co || this.co.ids.length <= 1) for (let i = 0; i < 3; i++) {
      const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.4, leader: this.me, slot: i, name: ["윙맨 매", "윙맨 송골", "윙맨 참매"][i] });
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
    this._next();
  }

  _spawn(a) {
    const w = this.s.world, st = this.plan && this.plan[Math.max(0, this.si)];
    const base = this.si <= 0 || !st ? this.at(0.02, 0) : this.at(Math.max(0.02, (st.t || 0.1) - 0.1), st.v || 0);
    const p = base.clone(); p.y += a.isPlayer ? 4 : 12;
    for (let i = 0; i < 12 && w.col.blocked(p, 1.8); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(-this.axis.x, -this.axis.z) };
  }

  // ── 진행 ──
  _next() {
    this.si++;
    this._clearGfx();
    const st = this.plan[this.si];
    if (!st) return;
    if (st.kind === "fork") return this._fork(st);
    if (st.kind === "route") { const r = this.route[st.n - 1]; st.v = r === "A" ? -0.62 : r === "C" ? 0.62 : 0; st.name = `루트 ${r} · ${ROUTE[r].name}`; st.waves = this._routeWaves(r, st.n); }
    this.target = this.at(st.t, st.v || 0);
    this.phase = "go";
    this._path(this.target, st.kind === "boss" ? 0xff3d4d : 0x35ff7a);
    if (this.si > 0) { this.s.hud.toast(st.kind === "boss" ? "최종 구역으로 — 적 본진!" : `다음: ${st.name}`, "#35ff7a", 2, 24); this.s.game.sound.play("lap"); }
  }
  // 루트마다 다른 중간 보스·스테이지 보스
  _routeWaves(r, n) {
    if (r === "A") return n === 1 ? [["tank", 2, "drone", 2], { mid: "msltank" }, ["robot", 2, "drone", 2], { boss: "twin" }] : [["tank", 2, "robot", 1], { mid: "mortarK" }, ["robot", 2, "tank", 1, "drone", 2], { boss: "titan" }];
    if (r === "B") return n === 1 ? [["drone", 5], { mid: "aceK" }, ["jet", 2, "drone", 3], { boss: "gunK" }] : [["ace", 3, "jet", 1], { mid: "gunMid" }, ["drone", 6], { boss: "fortress" }];
    return n === 1 ? [["ship", 1, "drone", 3], { mid: "destK" }, ["drone", 4], { boss: "carrier" }] : [["ship", 1, "drone", 2], { mid: "carrier" }, ["ship", 2], { boss: "flag" }];
  }
  // 갈림길: 루트 입구 셋. 들어가는 쪽으로 진행
  _fork(st) {
    this.phase = "fork";
    const w = this.s.world;
    this.gates = ["A", "B", "C"].map((k, i) => {
      const p = this.at(st.t, (i - 1) * 0.62), R = ROUTE[k];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 8, 40), new THREE.MeshBasicMaterial({ color: R.col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.position.set(p.x, p.y + 22, p.z); ring.lookAt(ring.position.clone().add(this.axis)); w.scene.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: R.col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(p.x, p.y + 45, p.z); w.scene.add(beam);
      this.gfx.push(ring, beam);
      return { k, p: p.clone().setY(p.y + 22), ring, beam };
    });
    this.s.hud.toast("갈림길 — 원하는 루트 입구로 들어가세요", "#ffd24a", 2.6, 26);
    this.s.game.sound.play("warn");
  }
  // 다음 구역까지 빛 고리
  _path(to, col) {
    const w = this.s.world, me = this.me, from = me.pos.clone();
    const n = Math.max(3, Math.min(9, Math.round(from.distanceTo(to) / 35)));
    for (let i = 1; i <= n; i++) {
      const p = from.clone().lerp(to, i / (n + 1)); p.y = Math.max(w.h(p.x, p.z) + 14, Math.min(from.y, 40));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 6, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.position.copy(p); ring.lookAt(to.clone().setY(p.y)); w.scene.add(ring); this.gfx.push(ring);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 120, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(to.x, to.y + 60, to.z); w.scene.add(beam); this.gfx.push(beam);
  }
  _clearGfx() { for (const m of this.gfx) { this.s.world.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } this.gfx = []; }

  // 구역 진입 → 적 투입
  _enter(st) {
    this._clearGfx();
    this.phase = "fight"; this.wave = 0; this.list = [];
    this.s.hud.toast(st.kind === "boss" ? "⚠ 최종 보스 출현" : `${st.name} — 교전 개시`, st.kind === "boss" ? "#ff3d4d" : "#ffd24a", 2.2, 28);
    this._spawnWave(st.waves[0]);
  }
  // 보스 한 마리(또는 n 마리): 스테이지 보스는 등장 연출, 중간 보스는 알림 + 체력 막대
  _rng() { this.R = mul32((this.seed ^ (this.si * 7919 + this.wave * 104729)) >>> 0); const r = this.R; this.rr = (a, b) => a + r() * (b - a); this.rp = (L) => L[Math.floor(r() * L.length)]; }
  _spawnBoss(key, isBoss, final) {
    this._rng(); const rnd = this.rr;
    const c = this.combat, C = this.target, B = BOSS[key], st = this.plan[this.si], lvl = 1 + this.si * 0.06;
    const n = B.n || 1, out = [];
    for (let i = 0; i < n; i++) {
      const p = C.clone().addScaledVector(this.axis, rnd(40, 60)).add(new V3((i - (n - 1) / 2) * 30, 0, rnd(-10, 10)));
      let a;
      if (B.unit) { p.y = this.s.world.h(p.x, p.z) + (B.unit === "flagship" || B.unit === "carrier" || B.unit === "cruiser" || B.unit === "destroyer" ? 38 : 0); a = c.units.spawn(B.unit, { pos: p, near: true, home: p.clone(), hp: B.hp * lvl, scale: B.scale, rank: isBoss ? 14 + this.si : 8 + this.si, name: B.name }); }
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
      if (isBoss) this.bossIntro(out[0], out[0].name, final ? "돌파 작전 · 최종 보스" : `${st.name} · 스테이지 보스`, false);
      else { out[0].bossBar = { name: out[0].name, mid: true }; this.s.hud.toast(`⚠ 중간 보스 · ${B.name}`, "#ff8a3a", 2, 26); this.s.game.sound.play("warn"); }
    }
    return out;
  }
  _spawnWave(spec) {
    const c = this.c || this.combat, C = this.target, st = this.plan[this.si], lvl = this.si * 0.08;
    this.wk = this.si * 100 + this.wave; this.km.clear();
    if (spec && !Array.isArray(spec)) { this.list = this._spawnBoss(spec.boss || spec.mid, !!spec.boss, !!spec.final); this.list.forEach((a, i) => { a.sx = i; a.wk = this.wk; }); this.wave++; return; }
    this._rng(); const rnd = this.rr, pick = this.rp;
    for (let i = 0; i < spec.length; i += 2) {
      const kind = spec[i], n = spec[i + 1];
      for (let j = 0; j < n; j++) {
        const p = C.clone().addScaledVector(this.axis, rnd(25, 70)).add(new V3(rnd(-45, 45), 0, rnd(-45, 45)));
        let a = null;
        if (kind === "tank" || kind === "robot" || kind === "ship" || kind === "carrier" || kind === "mech") {
          const type = KINDS[kind] ? pick(KINDS[kind]) : kind;
          p.y = this.s.world.h(p.x, p.z);
          a = c.units.spawn(type, { pos: p, near: true, home: p.clone(), hp: kind === "mech" ? 1.1 : 1 });
          if (kind === "mech") this.bossIntro(a, a.name, `${st.name} · 중간 보스`, true);
        } else {
          p.y = this.s.world.h(p.x, p.z) + rnd(16, 30);
          const bk = kind === "drone" ? pick(["grunt", "grunt", "kamikaze"]) : kind;
          a = c.spawnBot({ kind: bk, team: 1, pos: p, temp: true, hpScale: (bk === "gunship" ? 2.2 : 1) * (1 + lvl), name: bk === "gunship" ? "중간 보스 · 강습선" : undefined });
          if (a && a.ai) a.ai.home = C;
          if (bk === "gunship") this.bossIntro(a, a.name, st.name, true);
        }
        if (a) { a.sx = this.list.length; a.wk = this.wk; this.list.push(a); }
      }
    }
    this.wave++;
    if (this.wave > 1) this.s.hud.toast(`적 ${this.wave}파`, "#ff8a3a", 1.2, 22);
  }
  _onDmg(a, amt, k) {
    if (k === this.me && amt > 0 && a.wk === this.wk && (a.isStageBoss || a.isMidBoss || a.unit)) this.myBossDmg[a.sx] = (this.myBossDmg[a.sx] || 0) + amt;
  }
  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (a.wk === this.wk && a.sx !== undefined) this.km.add(a.sx);   // 협동: 이 적은 모두의 화면에서 사라진다
    if (a.remoteKill) { if (a.stBoss) { this.bossDead = true; this.endT = 3.5; h.toast("최종 보스 격파 — 작전 성공!", "#35ff7a", 3, 32); } return; }
    if (a === me) {
      this.lives--; this.noHit = false;
      h.toast(this.lives > 0 ? `격추! 남은 목숨 ${this.lives}` : "목숨을 모두 잃었습니다", "#ff6b5a", 2, 26);
      if (this.lives <= 0) {
        me.respawns = false;
        if (this.co && this.ng.online) { this.out = true; this.ng.setField("out", 1); h.toast("목숨 소진 — 팀원을 관전합니다", "#ff8a3a", 2.4, 22); }
        else this.endT = 2.2;
      }
      return;
    }
    if (k === me && a.team !== 0) {
      const pts = a.stBoss ? 5000 : a.isStageBoss ? 2000 : a.isMidBoss ? 800 : a.unit ? 300 : a.botKind === "gunship" ? 800 : 100;
      me.score += pts; this.kills++;
      h.toast(`${a.name} 격추  +${pts}`, "#ffd24a", 1, 18);
      if (a.isStageBoss || a.isMidBoss) { for (let i = 0; i < (a.isStageBoss ? 3 : 1); i++) this.combat.addPickup(a.pos.clone().add(new V3(rnd(-6, 6), 2, rnd(-6, 6))).setY(Math.max(a.pos.y, this.s.world.h(a.pos.x, a.pos.z) + 3))); }
      else if (Math.random() < (a.unit ? 0.6 : 0.22)) this.combat.addPickup(a.pos.clone().setY(Math.max(a.pos.y, this.s.world.h(a.pos.x, a.pos.z) + 3)));   // 보급품 떨어뜨림
    }
    if (a.stBoss) { this.bossDead = true; this.endT = 3.5; h.toast("최종 보스 격파 — 작전 성공!", "#35ff7a", 3, 32); this.s.game.sound.play("bigkill"); }
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run") return;
    const me = this.me, st = this.plan[this.si];
    this.ng.update(dt);
    if (this.co && this.ng.online && (this.syncT -= dt) <= 0) { this.syncT = 0.25; this._coop(); }
    if (this.out) this._spectate(dt);
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (!st || this.endT > 0) return;
    const t = this.s.time;
    for (const m of this.gfx) if (m.geometry.type === "TorusGeometry") m.rotation.z += dt * 0.8;
    if (this.phase === "go") {
      if (me.alive && Math.hypot(me.pos.x - this.target.x, me.pos.z - this.target.z) < 38) { if (this.auth) this._enter(st); else this.ng.setField("en", this.si); }
    } else if (this.phase === "fork") {
      for (const g of this.gates) {
        g.ring.material.opacity = 0.6 + 0.3 * Math.sin(t * 4);
        if (me.alive && Math.hypot(me.pos.x - g.p.x, me.pos.z - g.p.z) < 17 && Math.abs(me.pos.y - g.p.y) < 30) {
          if (!this.auth) { this.ng.setField("gk", [this.si, g.k]); continue; }
          this.route.push(g.k);
          this.s.hud.toast(`루트 ${g.k} · ${ROUTE[g.k].name} 진입!`, ROUTE[g.k].css, 2.2, 28); this.s.game.sound.play("gate");
          this.gates = null; this._next(); return;
        }
      }
    } else if (this.phase === "fight") {
      const left = this.list.filter((a) => a.alive).length;
      this.left = left;
      if (!left && !this.cut && this.auth) {
        if (st.waves && this.wave < st.waves.length) this._spawnWave(st.waves[this.wave]);
        else if (st.kind !== "boss") {
          this.cleared++; me.score += 500;
          this.s.hud.toast(`${st.name} 확보!  +500`, "#35ff7a", 2, 28);
          if (me.alive) me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.3);   // 구역 확보: 체력 30% 회복
          this._next();
        }
      }
    }
  }

  // ── 협동 동기화 (0.25초마다) ──
  _coop() {
    const ng = this.ng, me = this.me, c = this.combat, ids = this.co.ids, others = ng.players().filter((p) => !p.me);
    // 방장이 나가면 내가 이어서 진행
    if (!this.auth) { if (!others.some((p) => p.id === this.co.host)) { this.hostGone = (this.hostGone || 0) + 0.25; if (this.hostGone > 5) { this.auth = true; this.s.hud.toast("방장이 나가 이어서 진행합니다", "#ffb02e", 2.2, 20); } } else this.hostGone = 0; }
    // 내 상태 싣기
    ng.setField("kl", [this.wk, [...this.km]]);
    ng.setField("bd", [this.wk, this.myBossDmg]);
    ng.setField("sc", Math.round(me.score));
    // 다른 사람이 잡은 적은 내 화면에서도 격추 / 보스 체력은 모두가 준 피해를 합쳐서
    const tot = {};
    for (const [k, v] of Object.entries(this.myBossDmg)) tot[k] = v;
    for (const p of others) {
      const kl = ng.field(p.id, "kl");
      if (Array.isArray(kl) && kl[0] === this.wk && Array.isArray(kl[1])) for (const i of kl[1]) { const a = this.list[i | 0]; if (a && a.alive) { a.remoteKill = true; c.kill(a, null); } }
      const bd = ng.field(p.id, "bd");
      if (Array.isArray(bd) && bd[0] === this.wk && bd[1] && typeof bd[1] === "object") for (const [k, v] of Object.entries(bd[1])) tot[k] = (tot[k] || 0) + Math.max(0, Math.min(1e6, +v || 0));
    }
    for (const [k, d] of Object.entries(tot)) { const a = this.list[k | 0]; if (a && a.alive) { const want = a.maxHp - d; if (want < a.hp) a.hp = Math.max(0, want); if (a.hp <= 0.5) c.kill(a, null); } }
    if (this.auth) {
      // 방장: 다른 사람이 구역에 들어갔거나 갈림길 입구에 들어갔는지
      const st = this.plan[this.si];
      if (st && this.phase === "go" && others.some((p) => ng.field(p.id, "en") === this.si)) this._enter(st);
      if (st && this.phase === "fork") for (const p of others) { const gk = ng.field(p.id, "gk"); if (Array.isArray(gk) && gk[0] === this.si && ROUTE[gk[1]]) { this.route.push(gk[1]); this.s.hud.toast(`루트 ${gk[1]} · ${ROUTE[gk[1]].name} 진입!`, ROUTE[gk[1]].css, 2.2, 28); this.gates = null; this._next(); break; } }
      // 모두 목숨을 잃었으면 실패
      const live = [me, ...others.map((p) => p.actor)].filter((a, i) => (i === 0 ? !this.out : !ng.field(others[i - 1].id, "out"))).length;
      if (!live && this.endT < 0) this.endT = 2.5;
      ng.setField("pg", { si: this.si, w: this.wave, ph: this.phase, rt: this.route.slice(), fin: this.bossDead ? 1 : 0, fail: !live ? 1 : 0 });
      return;
    }
    // 손님: 방장 진행을 따라간다
    const pg = ng.field(this.co.host, "pg");
    if (!pg || typeof pg !== "object") return;
    if (Array.isArray(pg.rt)) this.route = pg.rt.filter((r) => ROUTE[r]).slice(0, 2);
    let guard = 0;
    while (pg.si > this.si && guard++ < 10) { if (this.phase === "fight") this.cleared++; this._next(); }
    const st = this.plan[this.si];
    if (st && pg.si === this.si && pg.ph === "fight" && this.phase !== "fight") this._enter(st);
    if (st && this.phase === "fight" && st.waves) while (pg.w > this.wave && this.wave < st.waves.length && guard++ < 10) this._spawnWave(st.waves[this.wave]);
    if (pg.fin && !this.bossDead) { this.bossDead = true; this.endT = 3.5; this.s.hud.toast("최종 보스 격파 — 작전 성공!", "#35ff7a", 3, 32); }
    if (pg.fail && this.endT < 0) this.endT = 2.5;
  }
  // 목숨을 다 쓴 사람: 살아 있는 팀원 뒤를 따라다니며 본다
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
    const m = new THREE.Matrix4().lookAt(b.pos, t.pos, new V3(0, 1, 0)); b.quat.setFromRotationMatrix(m);
  }

  missionObjective(o) {
    const me = this.me;
    if (this.phase === "go" && this.target) { o.pos = this.target; o.label = this.plan[this.si].kind === "boss" ? "적 본진" : this.plan[this.si].name; o.color = "#35ff7a"; return o; }
    if (this.phase === "fight") { let best = null, bd = 1e9; for (const a of this.list) if (a.alive) { const d = a.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = a; } } if (best) { o.pos = best.pos; o.label = best.name; o.color = "#ff6a5a"; return o; } }
    return null;
  }

  hud(h) {
    const u = h.u, L = h.L, me = this.me, s = this.s;
    drawCombatHud(this.combat, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const st = this.plan[this.si], cx = L.cx, y0 = L.t + 8 * u, total = this.plan.length;
    h.plate(cx - 190 * u, y0, 380 * u, 50 * u, { skew: 0.06, fill: "rgba(8,12,26,0.85)", accent: "#35ff7a" });
    const nm = !st ? "" : st.kind === "fork" ? "갈림길 — 루트를 고르세요" : st.name;
    h.text(`STAGE ${Math.min(total, this.si + 1)}/${total} · ${nm}`, cx, y0 + 15 * u, { size: 13, align: "center", base: "middle", bold: true, color: "#e8f4ff", shadow: false });
    const cw = st && st.waves ? st.waves[Math.max(0, this.wave - 1)] : null, tag = cw && !Array.isArray(cw) ? (cw.boss ? " · 스테이지 보스" : " · 중간 보스") : "";
    const sub = this.phase === "fight" ? `남은 적 ${this.left ?? 0}${st && st.waves ? ` · ${Math.min(this.wave, st.waves.length)}/${st.waves.length}파${tag}` : ""}` : this.phase === "go" ? "빛 고리를 따라 다음 구역으로" : "입구에 들어가면 그 루트로 진행";
    h.text(`${"❤".repeat(Math.max(0, this.lives))}${"♡".repeat(Math.max(0, LIVES - this.lives))}  ${sub}  ·  ${fmtTime(this.time).replace(/\.\d+$/, "")}  ·  ${Math.round(me.score)}점`, cx, y0 + 34 * u, { size: 11.5, align: "center", base: "middle", color: "#ffb4a8", shadow: false });
    if (this.co && this.ng.online) {
      const ps = this.ng.players();
      h.text(ps.map((p) => `${p.me ? "★" : "·"}${p.name}${this.ng.field(p.id, "out") || (p.me && this.out) ? "(관전)" : ""} ${p.me ? Math.round(me.score) : this.ng.field(p.id, "sc") || 0}`).join("   "), cx, y0 + 76 * u, { size: 11, align: "center", color: "#cfe8ff" });
    } else if (!this.co) h.text("혼자 · AI 윙맨 3기와 함께", cx, y0 + 76 * u, { size: 10.5, align: "center", color: "#9aa8bc" });
    if (this.out) h.text(`관전 중${this.specT ? ` · ${this.specT.name}` : ""} · [발사] 다른 팀원`, cx, h.H * 0.8, { size: 15, align: "center", bold: true, color: "#9fd8ff" });
    // 지나온 루트
    if (this.route.length) h.text(this.route.map((r) => `루트 ${r}`).join(" → "), cx, y0 + 62 * u, { size: 11, align: "center", color: "#9fd8ff" });
    // 갈림길 입구 표지
    if (this.phase === "fork" && this.gates && me.alive) for (const g of this.gates) { const R = ROUTE[g.k]; h.marker(g.p, s.camera, R.css, `루트 ${g.k} · ${R.name} (${R.desc})`, g.p.distanceTo(me.pos)); }
  }

  _end() {
    if (this.state === "done") return;
    const me = this.me, win = this.bossDead, sc = Math.round(me.score + (win ? this.lives * 1000 : 0));
    const rec = submitRecord(this.recKey, sc);
    this.finish({
      title: win ? "작전 성공!" : "작전 실패", sub: `돌파 작전 · ${this.route.length ? this.route.map((r) => "루트 " + r).join(" → ") : "루트 미선택"}`, win, record: rec,
      stars: win ? (this.lives >= 3 ? 3 : this.lives >= 2 ? 2 : 1) : 0,
      lines: [{ label: "점수", value: `${sc}${win ? ` (남은 목숨 보너스 +${this.lives * 1000})` : ""}` }, { label: "확보한 구역", value: `${this.cleared + (win ? 1 : 0)} / ${this.plan.filter((p) => p.kind !== "fork").length}` },
        { label: "격추", value: `${this.kills}` }, { label: "걸린 시간", value: fmtTime(this.time) }, { label: "최고 기록", value: `${records[this.recKey] || sc}` }],
    });
  }

  dispose() { this._clearGfx(); if (this.ng) this.ng.dispose(); super.dispose(); }
}

registerMode("strike", StrikeMode);
