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
    for (const t of [0, 1]) { const o = 1 - t, open = this.hqLinks[t].some((z) => z.owner === o); this.hq[t].core.invulnerable = !open; }
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
  _airCap(t) { const base = t === 0 ? 6 : 10 + Math.round(this.gen * 2); return base + this.zones.filter((z) => z.owner === t && z.fx === "air").length; }
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
      if ((this.groundT[t] -= dt * (1 + fac * 0.35)) > 0) continue;
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
      const mine = this.inZ === z;
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
  }

  // 홀로그램 무전 (전면전 사령부)
  _say(lines) {
    const cfg = this.s.cfg, now = this.time || 0;
    const R = (cfg.radio = (cfg.radio || []).filter(([at]) => at + 4.6 > now));
    let t = Math.max(now + 0.5, R.length ? R[R.length - 1][0] + 4.6 : 0);
    for (const L of lines) for (const part of String(L).match(/.{1,30}(\s|$)/g) || [L]) { R.push([t, "전면전 사령부", part.trim()]); t += 4.6; }
    this.s.game.sound.play("radio", 0.4);
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run" || this.cut) return;
    const me = this.me;
    { const lv = me.aos.up.shield; if (lv > 0 && me.alive && (this.shT = (this.shT ?? 0) - dt) <= 0) { this.shT = 22 - lv * 2; me.shield = Math.max(me.shield || 0, 25 * lv); me.shieldT = Math.max(me.shieldT || 0, 8); } }
    this._capTick(dt);
    this._groundTick(dt);
    this._shipTick(dt);
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
    if (this.inZ && me.alive) {
      const z = this.inZ, contested = z.n[0] > 0 && z.n[1] > 0, can = this.canCap(z, 0);
      const txt = !can ? `${z.name} — 맞닿은 구역을 먼저 점령하세요` : contested ? `${z.name} 교전 중 — 적을 몰아내세요` : z.owner === 0 ? (z.v >= 1 ? `${z.name} 확보` : `${z.name} 강화 중`) : `${z.name} 점령 중`;
      h.text(txt, L.cx, h.H * 0.3, { size: 18, align: "center", color: !can || contested ? "#ff8a7a" : "#35ff7a" });
      if (can) h.bar(L.cx - 90 * u, h.H * 0.3 + 8 * u, 180 * u, 7 * u, z.v, z.owner === 0 || z.cap === 0 ? TEAM_CSS[0] : "#ff8a7a");
    }
  }

  dispose() {
    if (this.shop) this.shop.dispose();
    for (const z of this.zones) if (z.g) { this.s.world.scene.remove(z.g); z.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); z.mat.dispose(); z.soft.dispose(); }
    super.dispose();
  }
}
registerMode("allout", AllOutMode);
