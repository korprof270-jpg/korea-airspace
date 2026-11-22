// 서바이벌(점수제 전투): 데스매치(개인전) / 팀 데스매치(편대전 — 스토리 공중전도 이것) / 함대전 / 거점 공략전 (화물 운반전은 스토리 전용)
//  팀 데스매치: 나 + 아군 편대(cfg.allies 기, 이름은 cfg.wing) 대 적 편대(cfg.bots 기 + 보스 cfg.boss + 지상 전차). 끝날 때 팀 점수가 높은 쪽 승리
//  함대전: 아군 드론 함대와 함께 적 드론 함대와 맞붙는다(swarmwar.js). 적 함대 전력(남은 드론 + 증원)을 0으로 만들거나, 시간이 끝날 때 전력이 앞서면 승리
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode, CargoSys } from "./combatmode.js";
import { submitRecord, records, fmtTime, DIFFICULTY, clamp } from "../config.js";
import { drawCombatHud } from "../combathud.js";
import { rankStats, clampRank } from "../ranks.js";
import { Director, directorWanted } from "../director.js";

export const VARIANTS = {
  assault: { name: "공방전", icon: "🛡️", desc: "전반 5분은 공격, 후반 5분은 수비. 구역마다 침투·격파·점령·침투 저지 임무를 이어 가며, 적 본진 코어를 부수거나 공격 점수 6000을 먼저 모으면 공격 성공. 승수가 같으면 총점이 높은 쪽이 최종 승리" },
  dm: { name: "데스매치", icon: "💥", desc: "모두가 적! 레이저·미사일·아이템으로 제한 시간 동안 가장 높은 점수를 얻으세요", hidden: true },
  tdm: { name: "팀 파이트", icon: "⚔️", desc: "아군 편대와 함께 적 편대와 맞붙는 팀전. 제한 시간이 끝날 때 팀 점수(격추·피해)가 높은 쪽이 이깁니다", hidden: true },
  fleet: { name: "함대전", icon: "🛸", desc: "하늘을 메운 아군 드론 함대와 함께 적 드론 함대와 맞붙는 대규모 공중전. 증원까지 모두 꺾어 적 함대 전력을 0으로 만들거나, 시간이 끝날 때 함대 전력이 앞서면 승리", hidden: true },   // 메뉴에서 뺌 (스토리 결전의 드론 함대는 그대로)
  aos: { name: "기지전 (AOS)", icon: "🏯", desc: "드론 리그 스타디움 5:5 팀전. 상대 본진 파괴 · 목표 전장 점수 달성 · 시간 종료 때 점수 우세 — 셋 중 하나로 승리. 미니언·타워·감시자·보스, 경기 내 업그레이드", hidden: true },   // 메뉴에서 뺌
  conq: { name: "점령전", icon: "🚩", desc: "4개 팀이 지역 거점을 땅따먹기처럼 차지하는 팀전. 상대 본부를 부수면 그 팀은 탈락, 격추·점령·본부 파괴로 점수를 쌓아 순위를 겨룹니다", hidden: true },
  base: { name: "거점 공략전", icon: "🏰", desc: "숨은 적 거점 5곳을 찾아 부수는 팀전", hidden: true },
  cargo: { name: "화물 운반전", icon: "📦", desc: "보급 상자를 집어 아군 착륙장으로 운반. 적 운반 드론을 막으면 더 유리합니다", hidden: true },   // 스토리 단계에서만 쓴다
};
const TEAM_NAME = ["청팀", "홍팀"], TDM_NAME = ["아군", "적군"];
const _v = new THREE.Vector3();
const c0 = (m, t) => m.combat.kill(t, null);
const POINTS = 5, REVEAL_R = 90;   // 적 거점 수, 드러나는 거리(m)

export class SurvivalMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    if (cfg.variant === "assault" || cfg.assault) {   // 공방전: 팀전(아군 편대 대 적 편대) 위에 공격/수비 역할을 얹는다
      cfg.assault = cfg.assault || { half: 1, role: "atk", wins: [0, 0], total: [0, 0], halves: [] };
      cfg.variant = "tdm";
    }
    this.variant = VARIANTS[cfg.variant] ? cfg.variant : "dm";
    this.duration = cfg.time || 180;
    this.title = `서바이벌 · ${VARIANTS[this.variant].name}`;
    if (this.variant === "fleet") { this.duration = cfg.time || 300; if (!cfg.faction) cfg.faction = "eia"; }   // 함대전: 적은 에이아 기계 함대
    this.team = [0, 0];
    this.recKey = `survival:${this.variant}:${session.map.id}`;
    if (cfg.assault) { this.title = `서바이벌 · 공방전 (${cfg.assault.half === 1 ? "전반 공격" : "후반 수비"})`; this.recKey = `survival:assault:${session.map.id}`; this.duration = cfg.time || 300; }
    this.delivered = [0, 0];
    this.endT = -1;
  }

  start() {
    const s = this.s, w = s.world, mc = s.map.combat, v = this.variant;
    const c = this.initCombat({
      ffa: v === "dm",
      onKill: (a, k) => this._onKill(a, k),
      onDamage: (a, amt, k) => { if (k && k !== a && (k.kind === "player" || k.kind === "bot")) this._add(k, Math.min(amt, a.hp + amt) * (a.static ? 0.5 : 1)); },
      spawnPoint: (a) => this._spawn(a),
      botGoal: (a) => this._botGoal(a),
      canSpawn: (k) => (this.director ? this.director.canSpawn(k) : k),   // 모함기 새끼 등 추가 투입 상한
    });
    const n = this.cfg.bots || 5, hard = (this.cfg.difficulty || "normal") === "hard";

    if (v === "dm") {
      super.start();
      for (let i = 0; i < n; i++) {
        const kind = i % 4 === 3 ? "jet" : hard && i % 3 === 0 ? "ace" : "grunt";   // 넷 중 하나는 전투기
        const b = c.spawnBot({ kind, team: 1, respawns: true, hpScale: kind === "grunt" ? 100 / 70 : 1 });
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      }
      c.scatterPickups(11);
      // 지상 위협: 전차와 대공 로봇이 맵 어딘가를 돌아다닌다 (모두의 적)
      for (const type of n >= 7 ? ["tank", "aa", "tank"] : ["tank", "aa"]) c.units.spawn(type, { pos: c.randomPoint(3, 5, 0.6) });
      this._direct();
      return;
    }

    // 팀전: 기지 위치
    const B = (this.basePos = [new THREE.Vector3(mc.blue[0], 0, mc.blue[1]), new THREE.Vector3(mc.red[0], 0, mc.red[1])]);
    for (const p of B) p.y = w.h(p.x, p.z);
    const dir = _v.copy(B[1]).sub(B[0]).setY(0).normalize();
    const start = B[0].clone().addScaledVector(dir, mc.startOffset ?? 34);
    start.y = w.h(start.x, start.z) + 0.3;
    this.placePlayer(start, Math.atan2(-dir.x, -dir.z));
    const allies = Math.floor((n - 1) / 2), enemies = n - allies;

    if (v === "fleet") {   // 함대전: 두 드론 함대는 첫 갱신 때 swarmwar.js 가 띄운다. 맵에는 아이템과 지상 대공 로봇 하나
      c.scatterPickups(10);
      c.units.spawn("aa", { pos: c.randomPoint(3, 5, 0.6) });
      return;
    }

    if (v === "tdm") {
      // 아군 편대: 이름 있는 동료(에이스)가 나를 따라 날다 적을 만나면 교전. 적 편대: 데스매치와 같은 구성 + 지상 전차
      const na = this.cfg.allies ?? Math.max(1, n - 2), wing = this.cfg.wing || [];
      for (let i = 0; i < na; i++) {
        const b = c.spawnBot({ kind: "ace", team: 0, respawns: true, hpScale: 1.3, leader: this.me, slot: i, name: wing[i] || `윙맨 ${i + 1}` });
        const rk = rankStats(clampRank(c.level));   // 동료도 그 단계 적과 같은 급의 실력 (계급 표시는 없이 능력만)
        b.hp = b.maxHp = b.maxHp * rk.hp; b.ai.skill *= rk.skill; b.K = Object.assign({}, b.K, { dmg: b.K.dmg * rk.dmg });
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      }
      for (let i = 0; i < n; i++) {
        const kind = i % 4 === 3 ? "jet" : hard && i % 3 === 0 ? "ace" : "grunt";
        const b = c.spawnBot({ kind, team: 1, respawns: true, hpScale: kind === "grunt" ? 100 / 70 : 1 });
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      }
      c.scatterPickups(11);
      c.units.spawn("tank", { pos: c.randomPoint(3, 5, 0.6) });
      this._direct();
      return;
    }

    if (v === "base") {
      this.home = this.buildBase(B[0].x, B[0].z, 0, 3, 6000);   // 코어 체력 3배 (사용자 요청)
      this._makeOutposts(B);
      const mk = (team, i) => {
        // 아군: 코어·포탑 공략과 기지 방어를 나눠 맡는다. 적: 절반은 우리 기지를 치고 절반은 자기 거점을 지킨다
        const def = team === 0 ? i % 3 === 2 : i % 2 === 1, op = this.outposts[i % Math.max(1, this.outposts.length)] || { pos: B[1] };
        const b = c.spawnBot({ kind: hard && team === 1 && i === 0 ? "ace" : "grunt", team, respawns: true, focus: def ? null : i % 2 ? "turret" : "core", home: def ? (team === 0 ? B[0] : op.pos) : null });
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      };
      for (let i = 0; i < allies; i++) mk(0, i);
      for (let i = 0; i < enemies; i++) mk(1, i);
      c.scatterPickups(9);
    } else {
      this.cargo = new CargoSys(this);
      this.pads = [this.buildPad(B[0].x, B[0].z, 0), this.buildPad(B[1].x, B[1].z, 1)];
      this.padGoal = this.pads.map((p) => p.pos.clone().setY(p.pos.y + 4));
      for (const [x, z] of mc.depots) this.cargo.addCrate(x, z, 1.4);
      const mk = (team, i) => {
        const b = c.spawnBot({ kind: "grunt", team, respawns: true });
        b.ai.role = i % 2 === 0 ? "courier" : "hunter";
        b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
      };
      for (let i = 0; i < allies; i++) mk(0, i + 1);
      for (let i = 0; i < enemies; i++) mk(1, i);
      c.scatterPickups(8);
    }
  }

  // 적 거점 5곳(코어 + 포탑 2)을 매 판 다른 자리에 세운다. 발견 전에는 보이지 않고, 쏘지도 맞지도 않는다
  _makeOutposts(B) {
    const c = this.combat, w = this.s.world, ops = (this.outposts = []), p = new THREE.Vector3();
    const flat = (x, z) => { const h0 = w.h(x, z); for (let k = 0; k < 6; k++) { const a = k * 1.047; if (Math.abs(w.h(x + Math.cos(a) * 14, z + Math.sin(a) * 14) - h0) > 3) return false; } return true; };
    const ok = (x, z, gap) => ops.every((q) => Math.hypot(q.pos.x - x, q.pos.z - z) > gap) && Math.hypot(B[0].x - x, B[0].z - z) > Math.min(120, w.size * 0.55);
    for (let gap = Math.min(110, w.size * 0.5), strict = true; ops.length < POINTS && gap > 15; gap *= 0.8, strict = gap > 40) {
      for (let i = 0; i < 80 && ops.length < POINTS; i++) {
        const q = c.randomPoint(3, 5, 0.78);
        p.set(q.x, w.h(q.x, q.z) + 7, q.z);
        if (!ok(p.x, p.z, gap) || w.col.blocked(p, 5) || (strict && !flat(p.x, p.z))) continue;
        const b = this.buildBase(p.x, p.z, 1, 2, 1140);   // 코어 체력 3배
        b.name = "적 거점 " + "ABCDE"[ops.length]; b.found = false; b.core.name = b.name;
        ops.push(b);
        // 거점마다 수비대: 전차·대공 로봇이 번갈아, 세 번째 거점 상공에는 전투함
        b.guards = [c.units.spawn(ops.length % 2 ? "tank" : "aa", { pos: p.clone() })];
        if (ops.length === 3) b.guards.push(c.units.spawn("frigate", { pos: new THREE.Vector3(p.x, 0, p.z), near: true }));
        for (const a of [b.core, ...b.turrets, ...b.guards.flatMap((r) => [r, ...r.unit.parts])]) this._hide(a, true);
      }
    }
  }
  // 전선전 연출가 (director.js): 오프라인 데스매치·팀 데스매치(스토리 제외)
  _direct() {
    if (!directorWanted(this)) return;
    this.director = new Director(this);
    this.director.start();
    // 플레이어는 제1 구역 뒤쪽에서 출발
    const sp = this.director.spawnPoint(this.me);
    this.placePlayer(sp.pos, sp.yaw);
  }
  dispose() { if (this.director) this.director.dispose(); super.dispose(); }

  _hide(a, hide) {
    a.targetable = !hide; a.invulnerable = hide; a.model.visible = !hide;
    if (a.unit && a === a.unit.root) a.unit.group.visible = !hide;
    for (const k of ["collider", "collider2"]) if (a[k]) a[k].off = hide;
  }

  // 아군이 가까이 가면 적 거점이 드러난다
  _outposts() {
    const c = this.combat, h = this.s.hud;
    for (const b of this.outposts) {
      if (b.found) continue;
      for (const a of c.actors) {
        if (!a.alive || a.team !== 0 || (a.kind !== "player" && a.kind !== "bot")) continue;
        if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > REVEAL_R) continue;
        b.found = true;
        for (const x of [b.core, ...b.turrets, ...b.guards.flatMap((r) => [r, ...r.unit.parts])]) this._hide(x, false);
        h.toast(`${b.name} 발견!`, "#ffd24a", 1.6, 24); h.feed(`${a.name} ▸ ${b.name} 발견`, "#ffd24a"); this.s.game.sound.play("lock");
        break;
      }
    }
  }

  _add(a, pts) {
    a.score += pts;
    if (this.variant !== "dm") this.team[a.team] += pts;
  }

  _spawn(a) {
    const c = this.combat, w = this.s.world;
    if (this.director) { const sp = this.director.spawnPoint(a); if (sp) return sp; }
    if (this.variant === "dm") {
      // 적들과 가장 먼 후보 지점
      let best = null, bd = -1;
      for (let i = 0; i < 8; i++) {
        const p = c.randomPoint(a.isPlayer ? 1.2 : 8, a.isPlayer ? 2.5 : 24);
        let d = 1e9;
        for (const o of c.actors) if (o !== a && o.alive) d = Math.min(d, o.pos.distanceTo(p));
        if (d > bd) { bd = d; best = p; }
      }
      return { pos: best, yaw: Math.atan2(best.x, best.z) };
    }
    let B = this.basePos[a.team]; const O = this.basePos[1 - a.team];
    if (this.outposts && a.team === 1) { const live = this.outposts.filter((b) => b.core.alive); if (live.length) B = live[(Math.random() * live.length) | 0].pos; }
    const dir = _v.copy(O).sub(B).setY(0).normalize();
    const ang = Math.random() * Math.PI * 2, r = 26 + Math.random() * 10;
    const p = new THREE.Vector3(B.x + Math.cos(ang) * r + dir.x * 8, 0, B.z + Math.sin(ang) * r + dir.z * 8);
    p.y = w.h(p.x, p.z) + (a.isPlayer ? 1.5 : 10 + Math.random() * 8);
    // 구조물 안에서 재출격하지 않도록 막힌 자리면 위로 올린다
    for (let i = 0; i < 12 && w.col.blocked(p, 1.6); i++) p.y += 3;
    return { pos: p, yaw: Math.atan2(-dir.x, -dir.z) };
  }

  _botGoal(a) {
    if (this.director) { const g = this.director.botGoal(a); if (g) return g; if (a.ai.path || a.dormant) return null; }
    if (this.variant === "tdm") return this._hunt(a);
    if (this.variant !== "cargo" || a.ai.role !== "courier") return null;
    if (this.cargo.carried(a)) return this.padGoal[a.team];
    const cr = this.cargo.nearestIdle(a.pos);
    return cr ? cr.pos : null;
  }

  // 팀 데스매치: 표적이 없으면 가장 가까운 적 드론 쪽으로 (아군 편대는 내 곁을 따른다)
  _hunt(a) {
    const c = this.combat;
    if (a.ai.target || (a.team === 0 && a.ai.leader && a.ai.leader.alive && a.ai.leader.pos.distanceTo(a.pos) < 160)) return null;
    let best = null, bd = 1e9;
    for (const o of c.actors) if ((o.kind === "bot" || o.kind === "player") && o.targetable && c.hostile(a, o)) { const d = o.pos.distanceTo(a.pos); if (d < bd) { bd = d; best = o; } }
    return best ? best.pos : null;
  }
  // 팀전 승패 (목표 판정): 진행 중엔 앞서는지, 끝나면 이겼는지. 개인전은 없음
  get teamWin() {
    if (this.variant === "dm") return undefined;
    if (this.state === "done") return this.won === true;
    return this.variant === "fleet" && this.swarm ? this.swarm.strength(0) > this.swarm.strength(1) : this.team[0] > this.team[1];
  }

  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    const drone = a.kind === "player" || a.kind === "bot";
    const dir = this.director ? this.director.onKill(a, k) : false;   // 전선전 목표물(방어 지점·본진 코어 등)
    if (k && k !== a && (k.kind === "player" || k.kind === "bot")) {
      const pts = a.pts ? a.pts : a.kind === "core" ? (dir && a.team === 0 ? 300 : 1500) : a.kind === "turret" ? 300 : this.cargo && this.cargo.carried(a) ? 150 : a.K && a.K.base ? a.K.score : 100;
      this._add(k, pts);
      h.feed(`${k.name} ▸ ${a.name}`, k === me ? "#ffd24a" : a === me ? "#ff6b5a" : "#cfd8e3");
      if (k === me) h.toast(`${a.name} 격파  +${pts}`, "#ffd24a", 1.2, 22);
    } else if (drone) h.feed(`${a.name} 추락`, "#9fb4c8");
    if (a.kind === "core" && !dir) {
      if (!this.outposts || a.team === 0) { this.coreDown = a.team; this.endT = 2; }
      else {
        const left = this.outposts.filter((b) => b.core.alive).length;
        for (const b of this.outposts) if (b.core === a) for (const t of b.turrets) if (t.alive) c0(this, t);   // 코어가 터지면 딸린 포탑도 멈춘다
        h.toast(left ? `${a.name} 파괴 — 남은 거점 ${left}` : "적 거점 전멸!", "#35ff7a", 1.8, 26);
        if (!left) { this.coreDown = 1; this.endT = 2; }
      }
    }
  }

  update(dt) {
    super.update(dt);
    if (this.state !== "run") return;
    if (this.cargo) {
      this.cargo.update(dt, this.pads, (a) => a.isPlayer || (a.ai && a.ai.role === "courier"), (a, pad) => {
        this._add(a, 300); this.delivered[a.team]++;
        this.s.hud.feed(`${a.name} 화물 배달 (${TEAM_NAME[a.team]})`, a.team === 0 ? "#5aa9ff" : "#ff5a66");
        if (a.isPlayer) { this.s.hud.toast("배달 완료  +300", "#35ff7a", 1.4, 24); this.s.game.sound.play("lap"); }
      });
    }
    if (this.outposts) this._outposts();
    if (this.director) this.director.update(dt);
    if (this.cfg.dda) this._dda(dt);
    const bc = this.cfg.boss;
    if (bc && !this.bossA && !this.cut && this.time >= (bc.at ?? 60)) {
      const live = this.outposts ? this.outposts.filter((b) => b.core.alive) : [], c = this.combat;
      const at = live.length ? live[0].pos : this.variant === "tdm" ? _v.copy(this.me.pos).lerp(this.basePos[1], 0.5) : this.basePos ? this.basePos[1] : c.randomPoint(20, 30);
      this.bossA = this.spawnBoss({ ...bc, pos: c.randomPoint(18, 28, 0, at.x, at.z, 30) });
    }
    const sw = this.swarm;
    if (this.variant === "fleet" && sw && this.endT < 0) {   // 함대전: 어느 한쪽 함대 전력이 바닥나면 끝
      if (sw.strength(1) <= 0) { this.fleetEnd = 1; this.endT = 2.5; this.s.hud.toast(`${sw.eName} 전멸!`, "#35ff7a", 2.2, 30); }
      else if (sw.strength(0) <= 0) { this.fleetEnd = 0; this.endT = 2.5; this.s.hud.toast("아군 함대 전멸…", "#ff6b5a", 2.2, 30); }
    }
    if (this.endT > 0 && (this.endT -= dt) <= 0) return this._end();
    if (this.time >= this.duration) this._end();
  }

  // 자동 난이도: 20초마다 조종자의 격추·피격추·받은 피해를 보고 적의 실력·화력·동시 투입 수를 조금씩 맞춘다 (0.6 ~ 1.5)
  _dda(dt) {
    const c = this.combat, me = this.me; if (!c || !me) return;
    const D = this.ddaS || (this.ddaS = { k: (this.cfg.assault && this.cfg.assault.ddaK) || 0.9, t: 0, kills: me.kills, deaths: me.deaths, hurt: 0, hp: me.hp, cap0: this.director ? this.director.cap : 0 });
    if (me.alive && me.hp < D.hp) D.hurt += D.hp - me.hp;
    D.hp = me.hp;
    if (!D.applied) { D.applied = true; this._ddaApply(D); }
    if ((D.t += dt) < 20) return;
    D.t = 0;
    const kills = me.kills - D.kills, deaths = me.deaths - D.deaths, hurt = D.hurt / (me.maxHp || 100);
    D.kills = me.kills; D.deaths = me.deaths; D.hurt = 0;
    // 20초에 1.5기 격추가 '보통' 기준. 죽거나 크게 다치면 쉬워지고, 다치지 않고 잘 잡으면 어려워진다
    const perf = (kills - 1.5) * 0.5 - deaths * 1.4 - Math.max(0, hurt - 0.5) * 0.6 + (me.alive ? (me.hp / me.maxHp - 0.5) * 0.4 : 0);
    D.k = clamp(D.k + clamp(perf * 0.08, -0.18, 0.1), 0.6, 1.5);
    this._ddaApply(D);
  }
  _ddaApply(D) {
    const c = this.combat, k = D.k, B = DIFFICULTY.normal, old = c.diff.bot;
    c.diff = { bot: clamp(B.bot * (0.55 + 0.45 * k), 0.45, 1.1), aim: clamp(B.aim + (k - 1) * 0.45, 0.3, 0.9), dmg: B.dmg * (0.55 + 0.45 * k) };
    const r = c.diff.bot / old;
    if (Math.abs(r - 1) > 1e-3) for (const a of c.actors) if (a.kind === "bot" && a.ai && a.team !== this.me.team) a.ai.skill *= r;   // 이미 나와 있는 적에게도
    if (this.director && D.cap0) this.director.cap = Math.round(clamp(D.cap0 * (0.6 + 0.4 * k), 5, D.cap0 + 4));
  }

  // 임무 막바지: 남은 시간 25초 (동료 무전용)
  nearEnd() { return this.endT < 0 && this.duration - this.time < 25 && this.duration - this.time > 3; }

  // 공방전: 한 판(전·후반)이 끝날 때. 전반이면 공수 교대해 후반을 시작, 후반이면 최종 결과
  _endAssault() {
    if (this._halfDone) return; this._halfDone = true;
    const A = this.cfg.assault, D = this.director, me = this.me;
    const win = A.role === "atk" ? !!(D && D.victory) : !(D && D.lost);   // 공격: 본진 파괴·점수 달성해야 승 / 수비: 본진을 지키면 승
    const pts = this.team.map(Math.round);
    const wins = A.wins.slice(), total = A.total.map((v, i) => v + pts[i]);
    wins[win ? 0 : 1]++;
    const halves = (A.halves || []).concat([{ role: A.role, win, pts, how: D ? (D.byScore ? "점수" : A.role === "atk" ? (D.victory ? "본진 파괴" : "") : D.lost ? "본진 함락" : "") : "", score: Math.round(me.score), kills: me.kills, deaths: me.deaths, done: D ? D.done : 0, tot: D ? D.total : 0 }]);
    if (A.half === 1) {
      this.state = "half"; this.combat.frozen = true;
      const h = this.s.hud;
      h.toast(`전반 종료 — 공격 ${win ? "성공" : "실패"}  ·  공수 교대!`, win ? "#35ff7a" : "#ff6b5a", 3, 30);
      this.s.game.sound.play(win ? "lap" : "warn");
      const cfg2 = Object.assign({}, this.cfg, { variant: "assault", assault: { half: 2, role: "def", wins, total, halves, ddaK: this.ddaS ? this.ddaS.k : 0.9 } });
      setTimeout(() => { if (this.s.game.session === this.s) this.s.game.startSession(cfg2); }, 3000);
      return;
    }
    const again = Object.assign({}, this.cfg, { variant: "assault" }); delete again.assault;
    this.s.game.lastCfg = again;   // '다시 하기'는 전반부터
    const rec = submitRecord(this.recKey, total[0]);
    const fin = wins[0] !== wins[1] ? wins[0] > wins[1] : total[0] > total[1], draw = wins[0] === wins[1] && total[0] === total[1];
    this.won = fin;
    const H = (x) => `${x.role === "atk" ? "공격" : "수비"} ${x.win ? "성공" : "실패"}${x.how ? ` (${x.how})` : ""} · ${x.pts[0]} : ${x.pts[1]}`;
    this.finish({
      title: draw ? "무승부" : fin ? "최종 승리!" : "패배", sub: `공방전 · 승 ${wins[0]} : ${wins[1]}${wins[0] === wins[1] ? ` · 총점 ${total[0]} : ${total[1]}` : ""}`,
      win: fin, record: rec, stars: fin ? (wins[0] === 2 ? 3 : 2) : wins[0] ? 1 : 0,
      lines: [{ label: "전반", value: H(halves[0]) }, { label: "후반", value: H(halves[1]) }, { label: "승수 (아군 : 적군)", value: `${wins[0]} : ${wins[1]}` }, { label: "총점 (아군 : 적군)", value: `${total[0]} : ${total[1]}` },
        { label: "내 격추 / 피격추", value: `${halves.reduce((q, x) => q + x.kills, 0)} / ${halves.reduce((q, x) => q + x.deaths, 0)}` }, { label: "완료한 임무", value: `${halves.reduce((q, x) => q + x.done, 0)} / ${halves.reduce((q, x) => q + x.tot, 0)}` }, { label: "최고 기록", value: `${records[this.recKey] || total[0]}` }],
    });
  }

  _end() {
    if (this.cfg.assault) return this._endAssault();
    const c = this.combat, me = this.me, sc = Math.round(me.score);
    const rec = submitRecord(this.recKey, sc);
    const TN = this.variant === "tdm" ? TDM_NAME : TEAM_NAME;
    const rows = c.board().sort((x, y) => (this.variant === "tdm" ? x.team - y.team : 0) || y.score - x.score).map((a) => ({ name: a.name + (this.variant === "dm" ? "" : ` · ${TN[a.team]}`), me: a === me, vals: [Math.round(a.score), a.kills, a.deaths] }));
    const board = { cols: ["점수", "격추", "피격추"], rows };
    if (this.variant === "fleet") return this._endFleet(rec, board);
    if (this.variant === "dm") {
      const rank = (this.rank = 1 + c.board().filter((a) => a !== me && a.score > me.score).length);
      const D = this.director;
      this.finish({
        title: rank === 1 ? "승리!" : `${rank}위`, sub: VARIANTS.dm.name + (D && D.victory ? " · 적 본진 돌파" : ""), win: rank === 1, record: rec, stars: Math.max(0, 4 - rank), board,
        lines: [{ label: "내 점수", value: `${sc}` }, { label: "최고 기록", value: `${records[this.recKey]}` }, ...(D ? D.resultLines() : [])],
      });
    } else {
      const [a, b] = this.team.map(Math.round);
      const D = this.director;
      const win = D && D.victory ? true : this.coreDown !== undefined ? this.coreDown === 1 : a > b;
      this.won = win;
      const tk = [0, 1].map((t) => c.actors.filter((x) => x.team === t && (x.kind === "bot" || x.kind === "player")).reduce((q, x) => q + x.kills, 0));
      this.finish({
        title: win ? "승리!" : a === b && this.coreDown === undefined ? "무승부" : "패배", sub: `${VARIANTS[this.variant].name} · ${TN[0]} ${a} : ${b} ${TN[1]}`,
        win, record: rec, stars: win ? (a > b * 1.5 ? 3 : 2) : a > b * 0.7 ? 1 : 0, board,
        lines: [{ label: "내 점수", value: `${sc}` }, ...(this.variant === "tdm" ? [{ label: "팀 격추 (아군 : 적군)", value: `${tk[0]} : ${tk[1]}` }] : []), ...(this.outposts ? [{ label: "부순 적 거점", value: `${this.outposts.filter((b) => !b.core.alive).length} / ${this.outposts.length}` }] : []), ...(this.cargo ? [{ label: "배달 (청 : 홍)", value: `${this.delivered[0]} : ${this.delivered[1]}` }] : []), ...(D ? D.resultLines() : [])],
      });
    }
  }

  // 함대전 결과: 함대 전력 · 함대 격추 · 내 격추
  _endFleet(rec, board) {
    const sw = this.swarm, me = this.me, sc = Math.round(me.score);
    const a = sw ? Math.round(sw.strength(0) * 100) : 0, b = sw ? Math.round(sw.strength(1) * 100) : 0;
    const win = this.fleetEnd !== undefined ? this.fleetEnd === 1 : a > b, draw = this.fleetEnd === undefined && a === b;
    this.won = win;
    this.finish({
      title: win ? "승리!" : draw ? "무승부" : "패배", sub: `${VARIANTS.fleet.name} · 함대 전력 아군 ${a}% : 적 ${b}%`,
      win, record: rec, stars: win ? (a >= 60 ? 3 : 2) : a > b * 0.7 ? 1 : 0, board,
      lines: [{ label: "함대 전력 (아군 : 적)", value: `${a}% : ${b}%` }, { label: "함대 격추 (아군 : 적)", value: sw ? `${sw.kills[0]} : ${sw.kills[1]}` : "-" },
        { label: "내 격추", value: `${me.kills}` }, { label: "내 점수", value: `${sc}` }, { label: "최고 기록", value: `${records[this.recKey] || sc}` }],
    });
  }

  // 임무 목표: 거점 / 화물 / 착륙장
  missionObjective(o) {
    const me = this.me;
    if (this.director) return this.director.objective(o);
    if (this.outposts) {
      // 발견한 적 거점 가운데 아직 살아 있는 가장 가까운 코어
      let best = null, bd = 1e9;
      for (const b of this.outposts) { if (!b.found || !b.core.alive) continue; const d = b.core.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = b; } }
      if (!best) return null;
      o.pos = best.core.pos; o.label = best.name; o.color = "#ff5a66";
      return o;
    }
    if (this.cargo && this.state === "run") {
      if (this.cargo.carried(me)) { o.pos = this.padGoal[0]; o.label = "아군 착륙장"; o.color = "#35ff7a"; return o; }
      const cr = this.cargo.nearestIdle(me.pos);
      if (cr) { o.pos = cr.pos; o.label = "화물"; o.color = "#ffd24a"; return o; }
    }
    return null;
  }

  hud(h) {
    const u = h.u, L = h.L, s = this.s, c = this.combat, me = this.me;
    drawCombatHud(c, h);
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    if (this.director) this.director.hud(h);
    const full = h.lvl === "full", dm = this.variant === "dm";
    const left = Math.max(0, this.duration - this.time);
    h.timer(fmtTime(left), left < 20 ? "#ff6b5a" : "#fff", "#ff3d5a");

    // 왼쪽 위: 내 점수
    const pw = 184 * u, ph = (full ? 60 : 36) * u, x = L.l, y = L.t;
    h.plate(x, y, pw, ph, { accent: "#ff3d5a", skew: full ? 0.1 : 0.2 });
    h.text("점수", x + 20 * u, y + 20 * u, { size: 12, base: "middle", color: "#b4c2d4", shadow: false });
    h.text(`${Math.round(me.score)}`, x + pw - 14 * u, y + 19 * u, { size: 26, align: "right", base: "middle", mono: true, shadow: false });
    if (dm) {
      const board = c.board(), rank = 1 + board.filter((a) => a !== me && a.score > me.score).length;
      if (full) {
        h.text(`${rank}위 / ${board.length}`, x + 14 * u, y + 46 * u, { size: 14, base: "middle", color: rank === 1 ? "#ffd24a" : "#fff", shadow: false });
        h.text(`격추 ${me.kills}`, x + pw - 14 * u, y + 46 * u, { size: 13, align: "right", base: "middle", color: "#ffd24a", shadow: false });
        if (board[0] && board[0] !== me) h.text(`1위 ${board[0].name} ${Math.round(board[0].score)}`, x + 6 * u, y + ph + 18 * u, { size: 12, color: "#b4c2d4" });
      }
    } else if (this.variant === "fleet") {
      // 함대전: 위 가운데 함대 전력 막대는 swarmwar.js 가 그린다
      if (full) h.text(`격추 ${me.kills}`, x + 14 * u, y + 46 * u, { size: 13, base: "middle", color: "#ffd24a", shadow: false });
      if (full && this.swarm) h.text(`함대 격추 ${this.swarm.kills[0]}`, x + pw - 14 * u, y + 46 * u, { size: 12, align: "right", base: "middle", color: "#8cc4ff", shadow: false });
    } else {
      // 팀 점수: 시계 양옆
      const tw = 78 * u, th = 32 * u, ty = L.t + 4 * u;
      h.plate(L.cx - 92 * u - tw, ty, tw, th, { accent: "#5aa9ff", skew: 0.16 });
      h.text(`${Math.round(this.team[0])}`, L.cx - 100 * u, ty + 17 * u, { size: 20, align: "right", base: "middle", mono: true, color: "#8cc4ff", shadow: false });
      h.plate(L.cx + 92 * u, ty, tw, th, { accent: "#ff5a66", side: "right", skew: 0.16 });
      h.text(`${Math.round(this.team[1])}`, L.cx + 104 * u, ty + 17 * u, { size: 20, base: "middle", mono: true, color: "#ff8a94", shadow: false });
      if (this.variant === "tdm") {
        h.text("아군 편대", L.cx - 92 * u - tw / 2, ty + th + 10 * u, { size: 10.5, align: "center", base: "middle", color: "#8cc4ff" });
        h.text("적 편대", L.cx + 92 * u + tw / 2, ty + th + 10 * u, { size: 10.5, align: "center", base: "middle", color: "#ff8a94" });
      }
      if (full) {
        h.text(`격추 ${me.kills}`, x + 14 * u, y + 46 * u, { size: 13, base: "middle", color: "#ffd24a", shadow: false });
        if (this.cargo) h.text(`배달 ${this.delivered[0]} : ${this.delivered[1]}`, x + pw - 14 * u, y + 46 * u, { size: 13, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
      }
      if (this.outposts) {
        // 적 거점 현황: 나침반 아래 다섯 칸 (미발견 ?, 발견 = 코어 내구도, 파괴 = ✕) + 아군 코어 내구도
        const n = this.outposts.length, bw = 32 * u, gap = 6 * u, x0 = L.cx - (n * bw + (n - 1) * gap) / 2, by = L.subY + 6 * u;
        this.outposts.forEach((b, i) => {
          const bx = x0 + i * (bw + gap), dead = !b.core.alive, col = !b.found ? "#5b6880" : dead ? "#6b7890" : "#ff8a94";
          h.plate(bx, by, bw, 20 * u, { skew: 0.2, fill: "rgba(12,18,34,0.85)" });
          h.text(!b.found ? "?" : dead ? "✕" : "ABCDE"[i], bx + bw / 2, by + 11 * u, { size: 12, align: "center", base: "middle", color: col, shadow: false });
          if (b.found && !dead) {
            h.bar(bx + 3 * u, by + 22 * u, bw - 6 * u, 3 * u, b.core.hp / b.core.maxHp, "#ff5a66");
            const bd = b.core.pos.distanceTo(me.pos); if (me.alive && bd > 90) h.marker(b.core.pos, s.camera, "rgba(255,90,102,0.95)", b.name, bd);   // 가까우면 조준 틀이 대신 보인다
          }
        });
        const unk = this.outposts.filter((b) => !b.found).length;
        if (unk && full) h.text(`숨은 적 거점 ${unk}곳 — 맵을 탐색하세요`, L.cx, by + 42 * u, { size: 12, align: "center", color: "#ffd24a" });
        const hc = this.home.core, hk = hc.hp / hc.maxHp, hw = 150 * u, hy = y + ph + 16 * u;
        h.text(`아군 코어 · 포탑 ${this.home.turrets.filter((t) => t.alive).length}`, x + 4 * u, hy + 4 * u, { size: 11, color: hk < 0.35 ? "#ff8a7a" : "#8cc4ff" });
        h.bar(x + 4 * u, hy + 9 * u, hw, 7 * u, hk, hk < 0.35 ? "#ff6b5a" : "#5aa9ff");
      }
      if (this.cargo && me.alive && this.state === "run") {
        if (this.cargo.carried(me)) {
          h.marker(this.padGoal[0], s.camera, "#35ff7a", "아군 착륙장", this.padGoal[0].distanceTo(me.pos));
          h.banner("화물 운반 중 — 기체가 무겁습니다", L.subY + 20 * u, "#ffd24a", 14);
        } else {
          const cr = this.cargo.nearestIdle(me.pos);
          if (cr) h.marker(cr.pos, s.camera, "#ffd24a", "화물", cr.pos.distanceTo(me.pos));
        }
      }
    }
  }
}
