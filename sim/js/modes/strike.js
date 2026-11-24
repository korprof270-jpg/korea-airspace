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
    this.gfx = []; this.gates = null; this.endT = -1; this.cleared = 0; this.kills = 0; this.bossDead = false; this.noHit = true;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat;
    const c = this.initCombat({ onKill: (a, k) => this._onKill(a, k), spawnPoint: (a) => this._spawn(a) });
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
  _spawnBoss(key, isBoss, final) {
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
    if (spec && !Array.isArray(spec)) { this.list = this._spawnBoss(spec.boss || spec.mid, !!spec.boss, !!spec.final); this.wave++; return; }
    for (let i = 0; i < spec.length; i += 2) {
      const kind = spec[i], n = spec[i + 1];
      for (let j = 0; j < n; j++) {
        const p = C.clone().addScaledVector(this.axis, rnd(25, 70)).add(new V3(rnd(-45, 45), 0, rnd(-45, 45)));
        let a = null;
        if (kind === "tank" || kind === "robot" || kind === "ship" || kind === "carrier" || kind === "mech") {
          const type = kind === "tank" ? c.units.pickKind("tank") : kind === "robot" ? c.units.pickKind("robot") : kind === "ship" ? c.units.pickKind("ship") : kind;
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
        if (a) this.list.push(a);
      }
    }
    this.wave++;
    if (this.wave > 1) this.s.hud.toast(`적 ${this.wave}파`, "#ff8a3a", 1.2, 22);
  }
  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (a === me) {
      this.lives--; this.noHit = false;
      h.toast(this.lives > 0 ? `격추! 남은 목숨 ${this.lives}` : "목숨을 모두 잃었습니다", "#ff6b5a", 2, 26);
      if (this.lives <= 0) { me.respawns = false; this.endT = 2.2; }
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
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (!st || this.endT > 0) return;
    const t = this.s.time;
    for (const m of this.gfx) if (m.geometry.type === "TorusGeometry") m.rotation.z += dt * 0.8;
    if (this.phase === "go") {
      if (me.alive && Math.hypot(me.pos.x - this.target.x, me.pos.z - this.target.z) < 38) this._enter(st);
    } else if (this.phase === "fork") {
      for (const g of this.gates) {
        g.ring.material.opacity = 0.6 + 0.3 * Math.sin(t * 4);
        if (me.alive && Math.hypot(me.pos.x - g.p.x, me.pos.z - g.p.z) < 17 && Math.abs(me.pos.y - g.p.y) < 30) {
          this.route.push(g.k);
          this.s.hud.toast(`루트 ${g.k} · ${ROUTE[g.k].name} 진입!`, ROUTE[g.k].css, 2.2, 28); this.s.game.sound.play("gate");
          this.gates = null; this._next(); return;
        }
      }
    } else if (this.phase === "fight") {
      const left = this.list.filter((a) => a.alive).length;
      this.left = left;
      if (!left && !this.cut) {
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

  dispose() { this._clearGfx(); super.dispose(); }
}

registerMode("strike", StrikeMode);
