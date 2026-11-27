// 서바이벌 · 전면전 (누리 대륙 지역맵 전용)
//  · 연합(0)과 제국(1)의 드론 편대·지상 부대·함대가 지역 전체에서 한꺼번에 싸운다
//  · 구역은 본진에서 본진까지 이어진 사슬: 내 편 구역(또는 본진)에 맞닿은 구역만 점령할 수 있다
//  · 적 본진에 맞닿은 구역을 빼앗으면 본진 실드가 꺼진다. 핵심을 부수면 승리, 15분이 끝나면 구역을 더 가진 쪽이 승리
//  · 구역 테마 효과: 기지 → 공중 증원 · 공창/광산 → 지상 부대 · 항구 → 함선 · 요새/해안 → 포대 · 통신 → 적 표시 · 도시/마을 → 시민 구출 ⓟ
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode } from "./combatmode.js";
import { TEAM_COLOR, TEAM_CSS, PLAYER_HP } from "../combat.js";
import { submitRecord, records, fmtTime, clamp } from "../config.js";
import { drawCombatHud } from "../combathud.js";
import { registerMode } from "../session.js";
import { AosShop } from "./aos-hud.js";
import { SUP, UP_COST } from "./strike.js";
import * as GP from "../garage.js";

const V3 = THREE.Vector3, _v = new V3();
const CAP_H = 160, CAP_TIME = 14;
const PTS = { drone: 20, unit: 45, ship: 90, turret: 40, capture: 160, civil: 120, hq: 900 };
const UP_KEYS = Object.keys(SUP), UP_MAX = 5;
// 제국 세대: 연합 땅 = 침공군(1~2세대 섞임), 제국 땅 = 그 세대
const GEN = { hanul: 1.5, haerim: 1.5, bukseol: 1.5, jeoksa: 2, namdo: 1.5, e1: 1, e2: 2, e3: 3 };
const AIR_E = { 1: ["grunt", "grunt", "jet"], 2: ["grunt", "jet", "jet", "gunship"], 3: ["ace", "ace", "jet", "gunship"] };
const GROUND_E = { 1: ["tank", "lighttank", "aa", "tank"], 2: ["missiletank", "heavytank", "shieldbot", "sniperbot", "tank"], 3: ["mech", "heavytank", "missiletank", "shieldbot"] };
const GROUND_U = ["tank", "lighttank", "heavytank", "tank"];
const THEME_FX = { base: "air", radar: "radar", factory: "ground", mine: "ground", port: "ship", flagship: "ship", launch: "air", fort: "turret", coast: "turret", city: "civil", rural: "civil", ruin: "civil" };
const FX_NAME = { air: "공중 증원", radar: "적 탐지", ground: "지상 부대", ship: "함선 출격", turret: "포대", civil: "시민 구출" };

export class AllOutMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.duration = cfg.time || 900;
    const R = session.map.nuri ? session.map.nuri.region : "hanul";
    this.region = R; this.gen = GEN[R] || 1.5;
    this.title = `서바이벌 · 전면전 · ${session.map.name.replace("누리 대륙 · ", "")}`;
    this.recKey = `survival:allout:${session.map.id}`;
    this.zones = []; this.endT = -1; this.groundT = [6, 4]; this.shipT = [14, 10]; this.saidT = 0;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat, MS = s.map.strike;
    const c = this.initCombat({ baseStats: true, onKill: (a, k) => this._onKill(a, k), spawnPoint: (a) => this._spawn(a), botGoal: (a) => this._botGoal(a) });
    const me = this.me;
    me.aos = { pts: 300, up: Object.fromEntries(UP_KEYS.map((k) => [k, 0])) };
    this.upTable = { UP: SUP, KEYS: UP_KEYS, MAX: UP_MAX };
    this.L0 = Object.assign({}, c.L);
    this._applyStats(true);
    // 본진: 연합 = 출발 기지, 제국 = 지역의 적 요새 자리
    const RF = (s.map.allout && s.map.allout.red) || MS.fin;
    const A = c.units.groundSpot(mc.blue[0], mc.blue[1], 60, 14).clone(), B = c.units.groundSpot(RF[0], RF[1], 60, 14).clone();
    this.hq = [this.buildBase(A.x, A.z, 0, 4, 9000), this.buildBase(B.x, B.z, 1, 5, 8000)];
    this.hq[0].core.name = "연합 본진"; this.hq[1].core.name = "제국 본진";
    for (const h of this.hq) h.core.invulnerable = true;
    this.axis = B.clone().sub(A).setY(0); this.D0 = this.axis.length(); this.axis.normalize(); this.A = A; this.B = B;
    // 구역: 지역 구역 중 땅 위, 본진과 겹치지 않는 곳. 축 위치(0=연합 본진, 1=제국 본진)로 처음 주인을 정한다
    const Z = (MS.zones || []).filter((z) => Math.hypot(z.x - A.x, z.z - A.z) > 160 && Math.hypot(z.x - B.x, z.z - B.z) > 160);
    for (const z of Z) {
      const p = c.units.groundSpot(z.x, z.z, 30, 8).clone(), tt = _v.copy(p).sub(A).setY(0).dot(this.axis) / this.D0, t = clamp(tt, 0, 1);
      this.zones.push({ ...z, pos: p, t, tt, r: clamp((z.R || 80) * 0.45, 40, 70), owner: t < 0.24 ? 0 : t > 0.8 ? 1 : -1, cap: -1, v: 1, n: [0, 0], fx: THEME_FX[z.theme] || null, turrets: [], links: [] });
    }
    this.zones.sort((a, b) => a.tt - b.tt);
    if (!this.zones.some((z) => z.owner === 1) && this.zones.length) this.zones[this.zones.length - 1].owner = 1;
    if (!this.zones.some((z) => z.owner === 0) && this.zones.length > 2) this.zones[0].owner = 0;
    for (const z of this.zones) if (z.owner < 0) z.v = 0;
    // 사슬 잇기: 구역마다 가까운 구역 둘 + 본진에서 가장 가까운 구역 둘
    const D = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
    for (const z of this.zones) for (const o of [...this.zones].filter((q) => q !== z).sort((a, b) => D(z, a) - D(z, b)).slice(0, 2)) { if (!z.links.includes(o)) z.links.push(o); if (!o.links.includes(z)) o.links.push(z); }
    const near = (t, pool) => [...pool].sort((a, b) => Math.hypot(a.pos.x - this.hq[t].pos.x, a.pos.z - this.hq[t].pos.z) - Math.hypot(b.pos.x - this.hq[t].pos.x, b.pos.z - this.hq[t].pos.z)).slice(0, 2);
    const red = near(1, this.zones);
    this.hqLinks = [near(0, this.zones.filter((z) => !red.includes(z))), red];   // 두 본진이 같은 구역에 맞닿지 않게
    // 본진에 맞닿은 구역은 처음엔 그 본진 편 (시작부터 실드가 꺼지지 않게)
    for (const z of this.hqLinks[1]) { z.owner = 1; z.v = 1; }
    for (const z of this.hqLinks[0]) if (!this.hqLinks[1].includes(z)) { z.owner = 0; z.v = 1; }
    this._shields();
    this._buildZoneGfx();
    for (const z of this.zones) if (z.fx === "turret" && z.owner >= 0) this._zoneTurrets(z, z.owner);
    // 출격: 플레이어 + 윙맨 셋, 양쪽 공중 편대
    const sp = this._spawn(me); this.placePlayer(sp.pos, sp.yaw);
    for (let i = 0; i < 3; i++) { const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.3, leader: me, slot: i, name: ["윙맨 매", "윙맨 송골", "윙맨 참매"][i] }); b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos); }
    this._airFill(true);
    c.scatterPickups(6);
    this.shop = new AosShop(this);
    { const t = this.shop.el.querySelector("b"); if (t) t.textContent = "전면전 · 업그레이드"; }
    this.gauge = 30; this._supportUI();
    const L = s.map.strike.lore || {};
    this._say([`전면전 개시. ${L.war || ""}`, "맞닿은 구역부터 점령해 전선을 밀어라. 적 본진 앞 구역을 빼앗으면 본진 실드가 꺼진다."]);
  }

  // ── 구역 표시 ──
  _buildZoneGfx() {
    const w = this.s.world;
    for (const z of this.zones) {
      const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xe8ecf4, fog: false });
      const soft = new THREE.MeshBasicMaterial({ color: 0xe8ecf4, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(z.r, 0.5, 6, 64), mat); ring.rotation.x = Math.PI / 2; ring.position.y = 1;
      const fill = new THREE.Mesh(new THREE.RingGeometry(0.1, z.r, 56), soft); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.6;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 220, 10, 1, true), soft); beam.position.y = 110;
      const flag = new THREE.Mesh(new THREE.OctahedronGeometry(4, 0), mat); flag.position.y = 22;
      g.add(ring, fill, beam, flag); g.position.copy(z.pos);
      w.scene.add(g); Object.assign(z, { g, mat, soft, fill, flag });
    }
  }
  _paint(z, dt) {
    const col = z.owner >= 0 ? TEAM_COLOR[z.owner] : 0xe8ecf4;
    z.mat.color.setHex(col).multiplyScalar(1.6);
    z.soft.color.setHex(z.owner < 0 && z.cap >= 0 ? TEAM_COLOR[z.cap] : col);
    z.fill.scale.setScalar(Math.max(0.02, z.v)); z.flag.rotation.y += dt * 1.4;
  }

  // 팀 t 가 이 구역을 점령할 수 있나: 맞닿은 구역이나 본진이 t 편
  canCap(z, t) { return z.owner === t || this.hqLinks[t].includes(z) || z.links.some((o) => o.owner === t); }
  // 본진 실드: 상대 본진에 맞닿은 구역 중 하나라도 가지면 꺼진다
  _shields() {
    for (const t of [0, 1]) { const o = 1 - t, open = this.hqLinks[t].some((z) => z.owner === o); this.hq[t].core.invulnerable = !open || (t === 1 && this.guard && this.guard.alive); }
    // 처음 제국 본진이 열리는 순간: 지역 수호자(보스) 등장. 쓰러뜨려야 본진 핵심이 드러난다
    if (!this.guardDone && this.hqLinks[1].some((z) => z.owner === 0)) this._spawnGuard();
  }
  _spawnGuard() {
    this.guardDone = true;
    const B = { e3: ["titan", "에이아 수호 거신", 1.6], e2: ["titan", "공창 거신", 1.3], e1: ["mech", "점령군 거대로봇", 1.4], jeoksa: ["titan", "협곡 거신", 1.1] }[this.region] || ["mech", "제국 침공 거대로봇", 1.2];
    const p = this.B.clone().addScaledVector(this.axis, -90), c = this.combat;
    const g = c.units.groundSpot(p.x, p.z, 50, 14).clone();
    this.guard = this.spawnBoss({ unit: B[0], pos: g, name: B[1], hp: B[2] * (0.8 + this.gen * 0.25), sub: "제국 본진 수호자", rank: 14 });
    if (this.guard) this._team(this.guard, 1);
    this.hq[1].core.invulnerable = true;
    this._say([`${B[1]}이 본진 앞을 막아선다! 쓰러뜨려야 본진 핵심이 드러난다.`]);
  }

  // ── 출격 자리: 내 편 구역 중 적 본진에 가장 가까운 곳 (없으면 본진) ──
  _front(team) {
    const tgt = this.hq[1 - team].pos;
    let best = null, bd = 1e9;
    for (const z of this.zones) if (z.owner === team) { const d = Math.hypot(z.pos.x - tgt.x, z.pos.z - tgt.z); if (d < bd) { bd = d; best = z; } }
    return best ? best.pos : this.hq[team].pos;
  }
  _spawn(a) {
    const w = this.s.world, base = this._front(a.team || 0), back = a.team ? this.axis.clone() : this.axis.clone().negate();
    const p = base.clone().addScaledVector(back, 50); p.x += (Math.random() - 0.5) * 40; p.z += (Math.random() - 0.5) * 40;
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 4 : 14 + Math.random() * 10);
    for (let i = 0; i < 14 && w.col.blocked(p, 1.8); i++) p.y += 3;
    const d = this.hq[1 - (a.team || 0)].pos.clone().sub(p).setY(0);
    return { pos: p, yaw: Math.atan2(-d.x, -d.z) };
  }

  // ── 공중 편대: 팀마다 정원을 채운다 (기지 구역마다 +1) ──
  _airCap(t) { const base = t === 0 ? 6 : 10 + Math.round(this.gen * 2); return base + this.zones.filter((z) => z.owner === t && z.fx === "air").length + (this._behind(t) ? 3 : 0); }
  // 역전 장치: 구역을 3분의 1 이하로 가진 쪽은 증원이 강해진다
  _behind(t) { return this.zones.filter((z) => z.owner === t).length <= this.zones.length / 3; }
  _airFill(first) {
    const c = this.combat;
    for (const t of [0, 1]) {
      const have = c.actors.filter((a) => a.kind === "bot" && a.team === t && !a.ai.leader && a.respawns).length;   // 재출격 대기 중인 기체도 센다
      for (let i = have; i < this._airCap(t); i++) {
        const kinds = t === 0 ? ["grunt", "grunt", "ace"] : AIR_E[Math.round(this.gen)] || AIR_E[2], kind = kinds[i % kinds.length];
        const b = c.spawnBot({ kind, team: t, respawns: true, hpScale: t ? 0.9 + this.gen * 0.15 : 1, name: t === 0 ? ["연합 편대", "은빛 편대", "해림 편대"][i % 3] : undefined });
        if (!b) continue;
        b.ai.role = i % 4 === 3 ? "attack" : "capture"; b.ai.slot = i;
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
        if (!first) break;   // 경기 중에는 하나씩
      }
    }
  }

  // ── 지상 부대: 앞 구역에서 나와 다음 구역으로 행진 ──
  _groundTick(dt) {
    const c = this.combat;
    for (const t of [0, 1]) {
      const fac = this.zones.filter((z) => z.owner === t && z.fx === "ground").length;
      if ((this.groundT[t] -= dt * (1 + fac * 0.35) * (this._behind(t) ? 1.6 : 1)) > 0) continue;
      this.groundT[t] = t ? 26 - this.gen * 3 : 30;
      const alive = c.units.list.filter((u) => u.root.alive && u.root.team === t && u.root.allout).length;
      if (alive >= (t ? 8 : 6) + fac * 2) continue;
      const from = this._front(t), tg = this._target(t, from);
      if (!tg) continue;
      const L = t ? GROUND_E[Math.round(this.gen)] || GROUND_E[2] : GROUND_U, type = L[Math.floor(Math.random() * L.length)];
      for (let k = 0; k < (t && this.gen >= 2 ? 2 : 1); k++) {
        const g = c.units.groundSpot(from.x + (Math.random() - 0.5) * 60, from.z + (Math.random() - 0.5) * 60, 40, 8).clone();
        const path = [g.clone()]; for (let i = 1; i <= 4; i++) path.push(g.clone().lerp(tg.pos, i / 4));
        const a = c.units.spawn(type, { pos: g, near: true, home: tg.pos.clone(), march: path, hp: t ? 0.9 + this.gen * 0.2 : 1.1, name: t === 0 ? `연합 ${["전차", "경전차", "중전차", "전차"][L.indexOf(type)] || "전차"}` : undefined });
        if (!a) continue;
        a.allout = true; this._team(a, t);
      }
    }
  }
  _team(a, t) { a.team = t; if (a.unit) for (const p of a.unit.parts || []) p.team = t; }
  // 팀 t 가 다음에 노릴 구역: 점령 가능한 남의 구역 중 가장 가까운 곳
  _target(t, from) {
    let best = null, bd = 1e9;
    for (const z of this.zones) { if (z.owner === t || !this.canCap(z, t)) continue; const d = Math.hypot(z.pos.x - from.x, z.pos.z - from.z); if (d < bd) { bd = d; best = z; } }
    return best || (this.hq[1 - t].core.invulnerable ? null : { pos: this.hq[1 - t].pos });
  }

  // ── 함대: 항구 구역을 가진 쪽이 바다로 함선을 띄운다 ──
  _shipTick(dt) {
    const c = this.combat, w = this.s.world, land = w.def.land;
    for (const t of [0, 1]) {
      const ports = this.zones.filter((z) => z.owner === t && z.fx === "ship");
      if (!ports.length || (this.shipT[t] -= dt) > 0) continue;
      this.shipT[t] = 45;
      if (c.units.list.filter((u) => u.root.alive && u.root.team === t && u.root.allout && u.root.ship).length >= 3) continue;
      const z = ports[Math.floor(Math.random() * ports.length)];
      let p = null;   // 구역에서 바다 쪽으로 나가며 물이 충분히 깊은 곳
      for (let k = 0; k < 16 && !p; k++) { const a = (k / 16) * Math.PI * 2; for (let r = 120; r < 520; r += 60) { const x = z.pos.x + Math.cos(a) * r, zz = z.pos.z + Math.sin(a) * r; if (!land(x, zz) && w.h(x, zz) < -6) { p = new V3(x, 0, zz); break; } } }
      if (!p) continue;
      const type = t ? (this.gen >= 3 ? "cruiser" : "destroyer") : "frigate";
      const a = c.units.spawn(type, { pos: p, near: true, home: p.clone(), hp: t ? 0.8 + this.gen * 0.2 : 1, name: t === 0 ? "연합 전투함" : undefined });
      if (a) { a.allout = true; a.ship = true; this._team(a, t); }
    }
  }

  // 요새·해안 구역: 주인 편 포대 둘
  _zoneTurrets(z, t) {
    const c = this.combat;
    for (const tr of z.turrets) if (tr.alive) c.kill(tr, null);
    z.turrets = [0, 1].map((i) => { const a = (i / 2) * Math.PI * 2 + 0.6, g = c.units.groundSpot(z.pos.x + Math.cos(a) * z.r * 0.6, z.pos.z + Math.sin(a) * z.r * 0.6, 20, 5); return c.spawnTurret(g.x, g.z, t, { name: t === 0 ? "연합 포대" : "제국 포대" }); }).filter(Boolean);
  }

  // ── 점령 ──
  _capTick(dt) {
    const c = this.combat, me = this.me, h = this.s.hud;
    this.inZ = null;
    for (const z of this.zones) {
      z.n[0] = z.n[1] = 0;
      for (const a of c.actors) {
        if (!a.alive || a.team < 0 || a.team > 1) continue;
        const air = a.kind === "player" || a.kind === "bot", ground = a.unit && a === a.unit.root;
        if (!air && !ground) continue;
        const dy = a.pos.y - z.pos.y;
        if (Math.hypot(a.pos.x - z.pos.x, a.pos.z - z.pos.z) < z.r && dy > -10 && dy < CAP_H) { z.n[a.team] += a === me ? 3 : ground ? 2 : 1; if (a === me) this.inZ = z; }
      }
      const has0 = z.n[0] > 0, has1 = z.n[1] > 0;
      if (has0 !== has1) {
        const t = has0 ? 0 : 1, rate = (dt / CAP_TIME) * Math.min(2.6, 0.5 + z.n[t] * 0.35);
        if (this.canCap(z, t)) {
          if (z.owner === t) z.v = Math.min(1, z.v + rate);
          else if (z.owner >= 0) { z.v -= rate; if (z.v <= 0) { z.owner = -1; z.cap = t; z.v = 0; h.feed(`${z.name} 중립화`, TEAM_CSS[t]); } }
          else if (z.cap !== t) { z.v -= rate; if (z.v <= 0) { z.cap = t; z.v = 0; } }
          else { z.v += rate; if (z.v >= 1) { z.owner = t; z.v = 1; this._captured(z, t); } }
        }
      }
      this._paint(z, dt);
    }
  }
  _captured(z, t) {
    const h = this.s.hud, me = this.me;
    h.feed(`${t === 0 ? "연합" : "제국"} ▸ ${z.name} 점령`, TEAM_CSS[t]);
    if (z.fx === "turret") this._zoneTurrets(z, t);
    if (t === 0) {
      const mine = this.inZ === z || (this.mis && this.mis.z === z);
      this.gauge = Math.min(100, (this.gauge || 0) + 25);
      if (this.time - (this.lastCap || -99) < 75) { this.streak = (this.streak || 1) + 1; this._give(80 * Math.min(5, this.streak), `연속 점령 ×${this.streak}`); } else this.streak = 1;
      this.lastCap = this.time;
      this._give(PTS.capture + (z.fx === "civil" ? PTS.civil : 0), mine ? `${z.name} 점령${z.fx === "civil" ? " · 시민 구출" : ""}` : null);
      this._say([`${z.name} 확보. ${z.role ? z.role + "." : ""}${z.fx ? ` ${FX_NAME[z.fx]} 효과가 우리 편으로.` : ""}`]);
      if (mine) { GP.ev("capture"); this.s.game.sound.play("lap"); }
    } else this._say([`${z.name}을 빼앗겼다! 되찾아라.`]);
    this._shields();
    const open = this.hq[1].core.invulnerable === false;
    if (open && !this.saidOpen) { this.saidOpen = true; this._say(["제국 본진 실드가 꺼졌다! 본진 핵심을 공격하라!"]); h.toast("제국 본진 실드 해제", "#35ff7a", 2.4, 28); this.s.game.sound.play("bigkill"); }
    if (this.hq[0].core.invulnerable === false && !this.saidWarn) { this.saidWarn = true; this._say(["경고. 적이 본진 앞까지 왔다. 본진을 지켜라!"]); }
  }

  // ── 봇 목표: 점령 담당은 점령할 수 있는 가까운 구역, 공격 담당은 열린 적 본진 또는 맞닿은 적 구역 ──
  _botGoal(a) {
    const t = a.team, tg = a.ai.target;
    if (t === 0 && this.focus && (!tg || tg.pos.distanceTo(a.pos) > 50)) return this.focus.z.pos.clone().setY(this.focus.z.pos.y + 22 + ((a.ai.slot || 0) % 4) * 6);
    if (tg && tg.pos.distanceTo(a.pos) < 60) return null;
    if (a.ai.role === "attack" && !this.hq[1 - t].core.invulnerable) return this.hq[1 - t].pos.clone().setY(this.hq[1 - t].pos.y + 18);
    let best = null, bs = 1e9;
    this.zones.forEach((z, i) => {
      const contested = z.n[1 - t] > 0;
      if (z.owner === t && !contested) return;
      if (!this.canCap(z, t) && !(z.owner === t && contested)) return;
      const d = Math.hypot(z.pos.x - a.pos.x, z.pos.z - a.pos.z) * ((i + (a.ai.slot || 0)) % 3 === 0 ? 0.6 : 1);
      if (d < bs) { bs = d; best = z; }
    });
    return best ? best.pos.clone().setY(best.pos.y + 20 + ((a.ai.slot || 0) % 4) * 6) : null;
  }

  // ── ⓟ 업그레이드 (AosShop) ──
  inBase() { return true; }
  cost(a, key) { const lv = a.aos.up[key]; return lv >= UP_MAX ? Infinity : UP_COST[lv]; }
  wantBuy(key) {
    const me = this.me, D = me.aos, c = this.cost(me, key);
    if (!(D.pts >= c)) return false;
    D.pts -= c; D.up[key]++; this._applyStats();
    this.s.game.sound.play("pickup"); this.s.hud.toast(`${SUP[key].name} Lv${D.up[key] + 1}`, SUP[key].color, 1, 20);
    return true;
  }
  _applyStats(init) {
    const me = this.me, u = me.aos.up, L = this.combat.L, L0 = this.L0;
    L.laserDmg = L0.laserDmg + 0.12 * u.fire; L.mDmg = L0.mDmg + 0.15 * u.missile; L.mCap = (L0.mCap || 0) + u.missile; L.mStart = (L0.mStart || 0) + Math.floor(u.missile / 2);
    L.thrust = (L0.thrust || 0) + 0.06 * u.move; L.gauge = (L0.gauge || 0) + 0.15 * u.skill;
    L.regen = (L0.regen || 0) + 1.5 * u.regen; L.spawnShield = (L0.spawnShield || 0) + 25 * u.shield;
    L.heat = (L0.heat || 0) - 0.08 * u.cool; L.cool = (L0.cool || 0) + 0.12 * u.cool;
    const mh = PLAYER_HP * (1 + (L0.hp || 0)) * (1 + 0.15 * u.armor), d = mh - me.maxHp;
    me.maxHp = mh; me.hp = init ? mh : clamp(me.hp + Math.max(0, d), 0, mh);
  }
  _give(n, why) { this.me.aos.pts += n; if (why) this.s.hud.toast(`${why}  +${n}ⓟ`, "#ffd24a", 1.2, 20); }

  _onKill(a, k) {
    const me = this.me, h = this.s.hud;
    if (a.kind === "core") { this.endT = 3; this.win = a.team === 1; h.toast(this.win ? "제국 본진 함락 — 전면전 승리!" : "연합 본진이 무너졌다…", this.win ? "#35ff7a" : "#ff6b5a", 3, 32); this.s.game.sound.play(this.win ? "bigkill" : "fail"); return; }
    if (!k || k.team !== 0 || a.team !== 1) return;
    const pt = a.kind === "turret" ? PTS.turret : a.ship ? PTS.ship : a.unit ? (a === a.unit.root ? PTS.unit : 0) : PTS.drone;
    if (k === me && pt) { this._give(pt); h.feed(`${me.name} ▸ ${a.name}`, "#ffd24a"); }
    if (k === me && pt) this.gauge = Math.min(100, (this.gauge || 0) + (a.unit || a.kind === "turret" ? 10 : 6));
    if (this.mis && this.mis.list.includes(a)) this._missionCheck();
  }

  // 홀로그램 무전 (전면전 사령부)
  _say(lines) {
    const cfg = this.s.cfg, now = this.time || 0;
    const R = (cfg.radio = (cfg.radio || []).filter(([at]) => at + 4.6 > now));
    let t = Math.max(now + 0.5, R.length ? R[R.length - 1][0] + 4.6 : 0);
    for (const L of lines) for (const part of String(L).match(/.{1,30}(\s|$)/g) || [L]) { R.push([t, "전면전 사령부", part.trim()]); t += 4.6; }
    this.s.game.sound.play("radio", 0.4);
  }

  // ── 구역 임무: 점령할 수 있는 구역에 다가가면 테마에 맞는 목표가 생기고, 다 깨면 그 구역을 바로 점령 ──
  _missionTick(dt) {
    const me = this.me;
    if (this.mis) {
      const M = this.mis;
      for (const p of M.pods) if (!p.got && me.alive && p.pos.distanceTo(me.pos) < 9) { p.got = true; p.m.visible = false; this.s.game.sound.play("pickup"); this.s.hud.toast("시민 구출", "#35ff7a", 0.8, 18); this._missionCheck(); }
      for (const p of M.pods) if (!p.got) p.m.rotation.y += dt * 2;
      if (M.z.owner === 0 || !this.canCap(M.z, 0) || (M.age += dt) > 150) this._missionClear();
      return;
    }
    if ((this.misCd = (this.misCd || 0) - dt) > 0 || !me.alive) return;
    const z = this.zones.find((q) => q.owner !== 0 && this.canCap(q, 0) && Math.hypot(q.pos.x - me.pos.x, q.pos.z - me.pos.z) < q.r + 220);
    if (z) this._missionStart(z);
  }
  _missionStart(z) {
    const c = this.combat, w = this.s.world, th = z.theme, M = { z, list: [], pods: [], gfx: [], age: 0, total: 0, name: "", tag: "" };
    const ring = (n, rr) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + Math.random(); return c.units.groundSpot(z.pos.x + Math.cos(a) * rr, z.pos.z + Math.sin(a) * rr, 18, 5).clone(); });
    if (["city", "rural", "ruin", "heritage"].includes(th)) {
      M.name = "갇힌 시민 구출"; M.tag = "시민";
      for (const p of ring(4, z.r * 0.7)) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), new THREE.MeshBasicMaterial({ color: 0x35ff7a, fog: false })); m.position.copy(p).setY(p.y + 4); w.scene.add(m); M.gfx.push(m); M.pods.push({ pos: m.position.clone(), m, got: false }); }
      for (let i = 0; i < 3; i++) { const b = c.spawnBot({ kind: "grunt", team: 1, pos: z.pos.clone().setY(z.pos.y + 30), temp: true, name: "제국 감시 드론" }); if (b) { b.ai.home = z.pos.clone(); M.list.push(b); } }
    } else if (["port", "flagship", "coast"].includes(th) && w.def.land) {
      M.name = "구축함 격침"; M.tag = "구축함";
      let p = null; for (let k = 0; k < 16 && !p; k++) { const a = (k / 16) * Math.PI * 2; for (let r = 90; r < 420; r += 50) { const x = z.pos.x + Math.cos(a) * r, zz = z.pos.z + Math.sin(a) * r; if (!w.def.land(x, zz) && w.h(x, zz) < -6) { p = new V3(x, 0, zz); break; } } }
      if (p) { const a = c.units.spawn("destroyer", { pos: p, near: true, home: p.clone(), hp: 0.7 + this.gen * 0.2 }); if (a) { this._team(a, 1); M.list.push(a); } }
      else { M.name = "해안 포대 파괴"; M.tag = "포대"; for (const g of ring(3, z.r * 0.6)) M.list.push(c.spawnTurret(g.x, g.z, 1, { name: "제국 포대", hp: 220 })); }
    } else if (["fort", "front", "mesa"].includes(th)) {
      M.name = "포대 3기 파괴"; M.tag = "포대";
      for (const g of ring(3, z.r * 0.6)) M.list.push(c.spawnTurret(g.x, g.z, 1, { name: "제국 포대", hp: 220 }));
    } else if (["radar", "lab", "launch", "monolith", "heart"].includes(th)) {
      M.name = th === "launch" ? "발사 관제탑 파괴" : "송신탑 파괴"; M.tag = "송신탑";
      M.list.push(this._objTarget(z.pos, 46, 900, 0xff3a3a, M.name.replace(" 파괴", "")));
    } else if (["factory", "mine"].includes(th)) {
      M.name = "생산 시설 폭파"; M.tag = "시설";
      for (const g of ring(3, z.r * 0.55)) M.list.push(this._objTarget(g, 30, 420, 0xff8a2a, "생산 굴뚝"));
    } else {
      M.name = "적 주력 섬멸"; M.tag = "적";
      const L = GROUND_E[Math.round(this.gen)] || GROUND_E[2];
      for (const g of ring(2, z.r * 0.5)) { const a = c.units.spawn(L[Math.floor(Math.random() * L.length)], { pos: g, near: true, home: z.pos.clone(), hp: 0.8 + this.gen * 0.2 }); if (a) { this._team(a, 1); M.list.push(a); } }
      for (let i = 0; i < 3; i++) { const b = c.spawnBot({ kind: this.gen >= 3 ? "ace" : "grunt", team: 1, pos: z.pos.clone().setY(z.pos.y + 35), temp: true }); if (b) { b.ai.home = z.pos.clone(); M.list.push(b); } }
    }
    M.list = M.list.filter(Boolean); M.total = M.list.filter((a) => !a.temp || M.tag !== "시민").length + M.pods.length;
    if (M.tag === "시민") M.total = M.pods.length, M.list.forEach((b) => (b.escort = true));
    if (!M.total) return;
    this.mis = M;
    this._say([`구역 임무: ${z.name} — ${M.name}. 끝내면 그 구역을 바로 점령한다.`]);
    this.s.game.sound.play("warn");
  }
  // 목표 시설(송신탑·굴뚝): 부술 수 있는 붉은 기둥
  _objTarget(p, h, hp, col, name) {
    const c = this.combat, w = this.s.world, y = w.h(p.x, p.z), g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.6, metalness: 0.5 }), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2) });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3, h, 8), dark); m.position.y = h / 2; g.add(m);
    for (let k = 1; k <= 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.25, 6, 20), glow); r.rotation.x = Math.PI / 2; r.position.y = (h * k) / 4; g.add(r); }
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), glow); top.position.y = h + 1.5; g.add(top);
    g.position.set(p.x, y, p.z); w.scene.add(g);
    const col1 = w.col.addCapsule(new V3(p.x, y, p.z), new V3(p.x, y + h, p.z), 2.6, "target");
    const a = c.addProp(g, { name, team: 1, radius: 3, hp: hp * (0.8 + this.gen * 0.2), maxHp: hp * (0.8 + this.gen * 0.2), collider: col1 });
    a.pos.set(p.x, y + h * 0.6, p.z); col1.owner = a;
    return a;
  }
  _missionCheck() {
    const M = this.mis; if (!M) return;
    const need = M.tag === "시민" ? M.pods.some((p) => !p.got) : M.list.some((a) => a.alive);
    if (need) return;
    const z = M.z; this._missionClear(true);
    z.owner = 0; z.v = 1; z.cap = -1; this._give(120, `${M.name} 완료`); this.gauge = Math.min(100, (this.gauge || 0) + 15);
    this._captured(z, 0);
  }
  _missionClear(done) {
    const M = this.mis; if (!M) return;
    for (const m of M.gfx) { this.s.world.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    if (!done) for (const a of M.list) if (a.alive && a.kind === "bot") a.respawns = false;
    this.mis = null; this.misCd = done ? 6 : 20;
  }

  // ── 편대장 지원: 격추·점령으로 게이지를 채워 함포·공습·증원·편대 명령 ──
  _supportUI() {
    const el = (this.supEl = document.createElement("div"));
    el.className = "holo";
    el.style.cssText = "--hc:#ffd24a;--ht:none;right:12px;bottom:18%;z-index:31;padding:8px;display:flex;flex-direction:column;gap:5px;pointer-events:auto;font:700 12px/1.3 'Noto Sans KR',sans-serif;width:150px";
    const B = [["naval", "Z", "함포 사격", 60], ["air", "T", "공습", 80], ["drop", "G", "증원 투하", 50], ["order", "Y", "편대 집결", 20]];
    el.innerHTML = `<div class="holo-h">◢ 지원 <span data-g>0</span>%</div><div style="height:5px;background:#0006;border-radius:3px;overflow:hidden"><i data-bar style="display:block;height:100%;width:0;background:#ffd24a"></i></div>` + B.map(([k, key, n, cost]) => `<button data-s="${k}" style="all:unset;cursor:pointer;padding:5px 7px;border:1px solid #ffd24a55;border-radius:4px;display:flex;justify-content:space-between"><span>${key}. ${n}</span><span style="opacity:.75">${cost}</span></button>`).join("");
    el.addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; e.preventDefault(); e.stopPropagation(); this._support(b.dataset.s); });
    document.body.appendChild(el);
    this.supCost = Object.fromEntries(B.map(([k, , , c]) => [k, c]));
    this._supKey = (e) => { const k = { KeyZ: "naval", KeyT: "air", KeyG: "drop", KeyY: "order" }[e.code]; if (k && this.state === "run") { e.preventDefault(); this._support(k); } };
    addEventListener("keydown", this._supKey);
  }
  // 조준점: 카메라 앞쪽 지면 (최대 700m)
  _aimGround() {
    const cam = this.s.camera, w = this.s.world, d = new V3(); cam.getWorldDirection(d);
    const p = cam.position.clone();
    for (let t = 20; t < 700; t += 10) { p.copy(cam.position).addScaledVector(d, t); if (p.y <= w.h(p.x, p.z) + 1) return p.setY(w.h(p.x, p.z)); }
    return cam.position.clone().addScaledVector(d.setY(0).normalize(), 220).setY(0);
  }
  _support(k) {
    const cost = this.supCost[k], h = this.s.hud, c = this.combat, me = this.me;
    if (!me.alive) return;
    if ((this.gauge || 0) < cost) { h.toast(`지원 게이지 부족 (${cost} 필요)`, "#ffb02e", 1, 18); this.s.game.sound.play("click"); return; }
    this.gauge -= cost;
    if (k === "naval" || k === "air") {
      const p = this._aimGround(), d = new V3(); this.s.camera.getWorldDirection(d); d.setY(0).normalize();
      const pts = k === "naval" ? [p] : Array.from({ length: 6 }, (_, i) => p.clone().addScaledVector(d, (i - 2.5) * 34));
      for (const [i, q] of pts.entries()) { q.y = this.s.world.h(q.x, q.z); (this.strikes || (this.strikes = [])).push({ p: q, t: (k === "naval" ? 3 : 2.2) + i * 0.25, r: k === "naval" ? 48 : 28, dmg: k === "naval" ? 900 : 380, name: k === "naval" ? "함포" : "공습" }); }
      this._say([k === "naval" ? "좌표 수신. 함포 일제 사격, 탄착 3초!" : "공습 편대 진입. 표시 지점에서 떨어져라!"]);
    } else if (k === "drop") {
      const base = me.pos.clone();
      for (let i = 0; i < 3; i++) { const g = c.units.groundSpot(base.x + (Math.random() - 0.5) * 60, base.z + (Math.random() - 0.5) * 60, 30, 8).clone(); const tg = this._target(0, g); const a = c.units.spawn(["tank", "heavytank", "tank"][i], { pos: g, near: true, home: tg ? tg.pos.clone() : g.clone(), march: tg ? [g.clone(), g.clone().lerp(tg.pos, 0.5), tg.pos.clone()] : undefined, hp: 1.3, name: "연합 투하 전차" }); if (a) { a.allout = true; this._team(a, 0); c.fx.ring(g, 0x35a8ff, 8, 0.5); } }
      for (let i = 0; i < 2; i++) { const b = c.spawnBot({ kind: "ace", team: 0, temp: true, pos: base.clone().add(new V3((Math.random() - 0.5) * 30, 25, (Math.random() - 0.5) * 30)), name: "투하 편대" }); if (b) b.ai.role = "capture"; }
      this._say(["증원 투하 완료. 전차 3대, 편대 2기 합류."]);
    } else if (k === "order") {
      const tg = this.mis ? this.mis.z : this._target(0, me.pos);
      if (tg && tg.name) { this.focus = { z: tg, t: 40 }; this._say([`전 편대, ${tg.name}으로 집결하라!`]); }
      else { this.gauge += cost; return; }
    }
    this.s.game.sound.play("gate");
  }
  _supportTick(dt) {
    const c = this.combat;
    if (this.focus && (this.focus.t -= dt) <= 0) this.focus = null;
    if (this.strikes) for (const k of this.strikes) if ((k.t -= dt) <= 0 && !k.done) {
      k.done = true; c.fx.explosion(k.p.clone().setY(k.p.y + 2), k.r / 14); c.fx.ring(k.p, 0xffa040, k.r, 0.6); this.s.game.sound.playAt("explode", k.p, this.s.camera, 1);
      for (const a of c.actors) if (a.alive && a.team === 1 && !a.invulnerable && a.pos.distanceTo(k.p) < k.r + (a.radius || 1)) c.damage(a, k.dmg * (1 - a.pos.distanceTo(k.p) / (k.r * 1.6)), this.me, a.pos);
    }
    if (this.strikes) this.strikes = this.strikes.filter((k) => !k.done);
    if (this.supEl) { const g = Math.floor(this.gauge || 0); this.supEl.querySelector("[data-g]").textContent = g; this.supEl.querySelector("[data-bar]").style.width = g + "%"; this.supEl.querySelectorAll("[data-s]").forEach((b) => (b.style.opacity = g >= this.supCost[b.dataset.s] ? "1" : "0.45")); }
    this.gauge = Math.min(100, (this.gauge || 0) + dt * 0.4);   // 천천히 저절로도 찬다
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run" || this.cut) return;
    const me = this.me;
    { const lv = me.aos.up.shield; if (lv > 0 && me.alive && (this.shT = (this.shT ?? 0) - dt) <= 0) { this.shT = 22 - lv * 2; me.shield = Math.max(me.shield || 0, 25 * lv); me.shieldT = Math.max(me.shieldT || 0, 8); } }
    this._capTick(dt);
    this._groundTick(dt);
    this._shipTick(dt);
    this._missionTick(dt);
    this._supportTick(dt);
    if (this.guard && !this.guard.alive && !this.guardDead) { this.guardDead = true; this._shields(); this._say(["수호자 격파! 제국 본진 핵심이 드러났다. 지금이다!"]); this.s.hud.toast("제국 본진 노출", "#35ff7a", 2.4, 28); }
    if ((this.airT = (this.airT ?? 3) - dt) <= 0) { this.airT = 4; this._airFill(false); }
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.endT < 0 && this.time >= this.duration) this._end();
  }

  _end() {
    if (this.state === "done") return;
    const mine = this.zones.filter((z) => z.owner === 0).length, theirs = this.zones.filter((z) => z.owner === 1).length;
    const win = this.win ?? (this.endT > 0 ? false : mine > theirs), me = this.me;
    const sc = Math.round(me.score + mine * 500 + (win ? 3000 : 0)), rec = submitRecord(this.recKey, sc);
    this.finish({
      title: win ? "전면전 승리!" : "전면전 패배", sub: `${this.s.map.name} · 구역 ${mine} : ${theirs}`, win, record: rec, stars: win ? (this.win ? 3 : mine >= this.zones.length * 0.7 ? 2 : 1) : 0,
      lines: [{ label: "점령 구역", value: `${mine} / ${this.zones.length}` }, { label: "격추", value: `${me.kills}` }, { label: "점수", value: `${sc}` }, { label: "최고 기록", value: `${records[this.recKey]}` }],
    });
  }

  missionObjective(o) {
    const me = this.me;
    if (!this.hq[1].core.invulnerable) { o.pos = this.hq[1].core.pos; o.label = "제국 본진"; o.color = "#ff3d5a"; return o; }
    const tg = this._target(0, me.pos); if (!tg || !tg.name) return null;
    o.pos = tg.pos; o.label = tg.name; o.color = tg.owner === 1 ? "#ff6b5a" : "#e8ecf4";
    return o;
  }

  hud(h) {
    const u = h.u, L = h.L, s = this.s, me = this.me;
    drawCombatHud(this.combat, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const left = Math.max(0, this.duration - this.time);
    h.timer(fmtTime(left), left < 60 ? "#ff6b5a" : "#fff", "#ff3d5a");
    // 구역 사슬 (연합 → 제국 순)
    const n = this.zones.length, bw = 26 * u, gap = 4 * u, x0 = L.cx - (n * bw + (n - 1) * gap) / 2, by = L.subY + 6 * u;
    this.zones.forEach((z, i) => {
      const bx = x0 + i * (bw + gap), col = z.owner >= 0 ? TEAM_CSS[z.owner] : "#e8ecf4", can = this.canCap(z, 0) && z.owner !== 0;
      h.plate(bx, by, bw, 18 * u, { skew: 0.2, fill: z.owner >= 0 ? col : "rgba(12,18,34,0.85)", stroke: z === this.inZ ? "#ffd24a" : can ? "#ffffff" : undefined });
      h.text(String(i + 1), bx + bw / 2, by + 10 * u, { size: 11, align: "center", base: "middle", color: z.owner >= 0 ? "#0b0f24" : col, shadow: false });
      if (z.v > 0.02 && z.v < 1) h.bar(bx + 3 * u, by + 20 * u, bw - 6 * u, 3 * u, z.v, TEAM_CSS[z.owner >= 0 ? z.owner : Math.max(0, z.cap)]);
      if (me.alive && (can || z.owner === 0 && z.n[1] > 0)) { const d = z.pos.distanceTo(me.pos); if (d > z.r) h.marker(z.pos.clone().setY(z.pos.y + 24), s.camera, col, `${z.name}${z.fx ? ` · ${FX_NAME[z.fx]}` : ""}`, d); }
    });
    const mine = this.zones.filter((z) => z.owner === 0).length, theirs = this.zones.filter((z) => z.owner === 1).length;
    h.text(`연합 ${mine}  ·  제국 ${theirs}   ⓟ ${Math.floor(me.aos.pts)}`, L.cx, by + 34 * u, { size: 12, align: "center", base: "middle", color: "#ffd24a" });
    // 본진
    if (me.alive) for (const t of [0, 1]) { const c = this.hq[t].core; if (c.alive) h.marker(c.pos.clone().setY(c.pos.y + 30), s.camera, TEAM_CSS[t], `${t ? "제국" : "연합"} 본진${c.invulnerable ? " (실드)" : ""}`, c.pos.distanceTo(me.pos)); }
    // 통신 구역을 가지면 적 지상 부대·함선 표시
    if (me.alive && this.zones.some((z) => z.owner === 0 && z.fx === "radar")) for (const un of this.combat.units.list) { const a = un.root; if (a.alive && a.team === 1 && a.allout) { const d = a.pos.distanceTo(me.pos); if (d < 1400) h.marker(a.pos, s.camera, "#ff8a7a", a.name, d); } }
    if (this.mis && me.alive) {
      const M = this.mis, left = M.list.filter((a) => a.alive).length + M.pods.filter((p) => !p.got).length;
      h.text(`구역 임무 · ${M.z.name} — ${M.name} (${M.total - left}/${M.total})`, L.cx, h.H * 0.27, { size: 16, align: "center", color: "#ffd24a" });
      for (const a of M.list) if (a.alive) h.marker(a.pos, s.camera, "#ff8a3a", M.tag, a.pos.distanceTo(me.pos));
      for (const p of M.pods) if (!p.got) h.marker(p.pos, s.camera, "#35ff7a", "시민", p.pos.distanceTo(me.pos));
    }
    for (const k of this.strikes || []) h.marker(k.p, s.camera, "#ff3d5a", `${k.name} ${Math.max(0, k.t).toFixed(1)}초`, k.p.distanceTo(me.pos));
    if (this.inZ && me.alive) {
      const z = this.inZ, contested = z.n[0] > 0 && z.n[1] > 0, can = this.canCap(z, 0);
      const txt = !can ? `${z.name} — 맞닿은 구역을 먼저 점령하세요` : contested ? `${z.name} 교전 중 — 적을 몰아내세요` : z.owner === 0 ? (z.v >= 1 ? `${z.name} 확보` : `${z.name} 강화 중`) : `${z.name} 점령 중`;
      h.text(txt, L.cx, h.H * 0.3, { size: 18, align: "center", color: !can || contested ? "#ff8a7a" : "#35ff7a" });
      if (can) h.bar(L.cx - 90 * u, h.H * 0.3 + 8 * u, 180 * u, 7 * u, z.v, z.owner === 0 || z.cap === 0 ? TEAM_CSS[0] : "#ff8a7a");
    }
  }

  dispose() {
    if (this.shop) this.shop.dispose();
    if (this.supEl) this.supEl.remove(); if (this._supKey) removeEventListener("keydown", this._supKey);
    if (this.mis) this._missionClear();
    for (const z of this.zones) if (z.g) { this.s.world.scene.remove(z.g); z.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); z.mat.dispose(); z.soft.dispose(); }
    super.dispose();
  }
}
registerMode("allout", AllOutMode);
