// 챌린지: 혼자 또는 AI 윙맨과 편대를 이뤄 컴퓨터가 조종하는 적을 상대로 임무 수행
import * as THREE from "../../vendor/three.module.min.js";
import { CombatMode, CargoSys } from "./combatmode.js";
import { PathMover, makeTruck } from "../entities.js";
import { submitRecord, fmtTime, clamp } from "../config.js";
import { drawCombatHud } from "../combathud.js";

export const MISSIONS = [
  { id: "waves", name: "기지 방어", icon: "🛡", map: "canyon", level: 1, desc: "다섯 차례 몰려오는 적 드론 편대로부터 아군 코어를 지켜내세요" },
  { id: "strike", name: "포탑 소탕", icon: "🎯", map: "factory", level: 2, desc: "공장 지대의 적 방공 포탑과 지휘소를 제한 시간 안에 모두 파괴하세요" },
  { id: "escort", name: "호송 작전", icon: "🚚", map: "city", level: 2, desc: "도심을 지나는 수송 트럭을 매복한 적 드론으로부터 보호하세요" },
  { id: "supply", name: "긴급 보급", icon: "📦", map: "canyon", level: 2, desc: "협곡 곳곳의 캠프 네 곳에 보급 상자를 제한 시간 안에 전달하세요" },
  { id: "heist", name: "탈취 작전", icon: "🗝", map: "palace", level: 3, desc: "적 진지 세 곳에 보관된 에너지 코어를 훔쳐 아군 착륙장으로 가져오세요", hidden: true },
  { id: "titan", name: "초거대로봇 격파", icon: "🗿", map: "moon", level: 4, desc: "초거대로봇의 팔·포·다리를 부수고 동체를 파괴하세요", hidden: true },
  { id: "boss", name: "모선 격추", icon: "👾", map: "arena", level: 3, desc: "거대 모선의 엔진 포드 네 개를 부숴 보호막을 벗기고 코어를 파괴하세요" },
];

const _v = new THREE.Vector3();
const setOb = (o, pos, label, color) => { o.pos = pos; o.label = label; o.color = color; return o; };

export class ChallengeMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.def = MISSIONS.find((m) => m.id === cfg.mission) || MISSIONS[0];
    this.id = this.def.id;
    this.title = `스토리 · ${this.def.name}`;
    this.teamN = cfg.team || 0;
    this.scale = (1 + 0.3 * this.teamN) * (cfg.power || 1);   // power: 스토리 단계별 적 규모 배율
    this.lives = 3;
    this.limit = 0;
    this.objective = "";
    this.failT = -1; this.winT = -1;
    this.recKey = `challenge:${this.id}`;
  }

  start() {
    const c = this.initCombat({
      onKill: (a, k) => this._onKill(a, k),
      spawnPoint: (a) => this._spawn(a),
    });
    super.start();
    this.home = this.s.player.spawn.pos.clone();
    this.bossCfg = this.cfg.boss || null;   // 스토리 단계가 정한 보스 (등장 시각 at 초, 또는 목표 달성 직후)
    this[`setup_${this.id}`](c, this.s.map, this.s.world);
    for (let i = 0; i < this.teamN; i++) {
      const b = c.spawnBot({ kind: "grunt", team: 0, respawns: true, hpScale: 1.5, leader: this.me, slot: i, name: (this.cfg.wing && this.cfg.wing[i]) || `윙맨 ${i + 1}` });
      b.pos.copy(this._spawn(b).pos); b.model.position.copy(b.pos);
    }
  }

  _spawn(a) {
    const w = this.s.world, h = this.homeFn ? this.homeFn() : this.home;
    const ang = Math.random() * Math.PI * 2, r = a.isPlayer ? 0 : 8 + Math.random() * 6;
    const p = new THREE.Vector3(h.x + Math.cos(ang) * r, 0, h.z + Math.sin(ang) * r);
    p.y = Math.max(h.y, w.h(p.x, p.z)) + (a.isPlayer ? 1.2 : 7 + Math.random() * 4);
    for (let i = 0; i < 6 && w.col.blocked(p, 1.5); i++) p.y += 3;
    return { pos: p, yaw: this.s.player.spawn.yaw };
  }

  _onKill(a, k) {
    const h = this.s.hud, me = this.me;
    if (a === me) {
      this.lives--;
      if (this.lives < 0) { me.respawns = false; this.failT = 1.6; this.failWhy = "기체를 모두 잃었습니다"; }
      else h.toast(`격추됨 — 남은 기체 ${this.lives}`, "#ff6b5a", 1.8, 24);
      return;
    }
    if (k === me) { me.score += a.K ? a.K.score : 200; h.toast(`${a.name} 격파`, "#ffd24a", 1, 20); }
    else if (k && (a.kind === "bot" || a.kind === "turret")) h.feed(`${k.name} ▸ ${a.name}`, "#cfd8e3");
  }

  enemies() { return this.combat.actors.filter((a) => a.alive && a.team === 1 && a.kind === "bot"); }

  // 지점 주변 상공에 적 편대 투입
  spawnGroup(cx, cz, rad, list, opts = {}) {
    const c = this.combat, out = [];
    for (const [kind0, n, focus] of list) for (let i = 0; i < n; i++) {
      const kind = kind0 === "grunt" && i % 3 === 2 ? "jet" : kind0;   // 편대 셋 중 하나는 전투기
      const b = c.spawnBot({ kind, team: 1, focus: focus || null, ...opts });
      b.pos.copy(c.randomPoint(opts.lo ?? 14, opts.hi ?? 32, 0, cx, cz, rad)); b.model.position.copy(b.pos);
      out.push(b);
    }
    return out;
  }

  win(starN, lines = []) {
    const best = submitRecord(this.recKey, starN);
    this.finish({ title: "임무 성공", sub: this.def.name, win: true, stars: starN, record: best && starN === 3, lines: [...lines, { label: "격추", value: `${this.me.kills}` }, { label: "피격추", value: `${this.me.deaths}` }, { label: "소요 시간", value: fmtTime(this.time) }] });
  }
  fail(why) { this.finish({ title: "임무 실패", sub: why, win: false, stars: 0, lines: [{ label: "격추", value: `${this.me.kills}` }, { label: "소요 시간", value: fmtTime(this.time) }] }); }

  update(dt) {
    super.update(dt);
    if (this.state !== "run" || this.cut) return;
    if (this.introBoss) { const b = this.introBoss; this.introBoss = null; return this.bossIntro(b, b.name, "보스", false); }
    if (this.failT > 0) { if ((this.failT -= dt) <= 0) this.fail(this.failWhy); return; }
    // 정해진 시각이 되거나 목표를 먼저 끝내면 보스가 나타난다. 보스를 잡아야 임무 완료
    const bc = this.bossCfg;
    if (bc && !this.bossA && (this.time >= (bc.at ?? 60) || this.winT > 0)) {
      const me = this.me.pos, f = _v.set(-Math.sin(this.s.player.body.heading), 0, -Math.cos(this.s.player.body.heading));
      const p = this.combat.randomPoint(18, 30, 0, me.x + f.x * 70, me.z + f.z * 70, 30);
      this.bossA = this.spawnBoss({ ...bc, pos: p });
      return;
    }
    if (this.winT > 0) {
      if (this.bossA && this.bossA.alive) { this.objective = `${this.bossA.name} 격파`; return; }
      if ((this.winT -= dt) <= 0) this.winFn();
      return;
    }
    this[`tick_${this.id}`](dt, this.combat);
    if (this.limit && this.time >= this.limit && this.failT < 0 && this.winT < 0) { this.failT = 0.01; this.failWhy = "제한 시간 초과"; }
  }

  hud(h) {
    const u = h.u, L = h.L;
    drawCombatHud(this.combat, h, { radarRange: 200 });
    if (this.cut) return;
    this.hudCountdown(h);
    if (h.lvl === "off") return;
    const full = h.lvl === "full";
    // 왼쪽 위: 임무 · 목표 · 남은 기체
    const pw = 236 * u, ph = (full ? 66 : 42) * u, x = L.l, y = L.t, lives = Math.max(0, this.lives);
    h.plate(x, y, pw, ph, { accent: "#3dd68c", skew: full ? 0.08 : 0.14 });
    h.text(this.def.name, x + 18 * u, y + 17 * u, { size: 16, base: "middle", shadow: false });
    h.text(`${"♥".repeat(lives)}${"♡".repeat(3 - Math.min(3, lives))}`, x + pw - 14 * u, y + 17 * u, { size: 15, align: "right", base: "middle", color: "#ff8a8a", shadow: false });
    h.text(this.objective, x + 14 * u, y + 38 * u, { size: 13, base: "middle", color: "#ffd24a", shadow: false });
    if (full) h.text(`격추 ${this.me.kills}  ·  점수 ${Math.round(this.me.score)}`, x + 12 * u, y + 56 * u, { size: 11, base: "middle", color: "#b4c2d4", shadow: false });
    if (this.limit) {
      const left = Math.max(0, this.limit - this.time);
      h.timer(fmtTime(left), left < 30 ? "#ff6b5a" : "#fff", "#3dd68c");
    }
    const f = this[`hud_${this.id}`];
    if (f) f.call(this, h, u, h.W);
  }

  // 나침반 아래 가운데의 목표 내구도 막대
  topBar(h, label, frac, color) {
    const u = h.u, L = h.L, w = 260 * u, y = L.subY + 16 * u;
    h.text(label, L.cx, y - 5 * u, { size: 12, align: "center", color: "#dfe7f1" });
    h.bar(L.cx - w / 2, y, w, 9 * u, frac, color);
  }

  // 임무 목표(거리계·나침반·레이더용)
  missionObjective(o) {
    const me = this.me;
    switch (this.id) {
      case "waves": return this.base && this.base.core.alive ? setOb(o, this.base.core.pos, "아군 코어", "#5aa9ff") : null;
      case "strike": return this.near && this.near.alive ? setOb(o, this.near.pos, this.near.name, "#ff8a5a") : null;
      case "escort": return this.truck && this.truck.alive ? setOb(o, this.truck.pos, "수송 트럭", "#5aa9ff") : null;
      case "supply": {
        if (!this.cargo) return null;
        if (this.cargo.carried(me)) {
          let best = null, bd = 1e9;
          for (const p of this.pads) if (!p.done) { const d = p.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = p; } }
          return best ? setOb(o, best.pos, "캠프", "#35ff7a") : null;
        }
        const cr = this.cargo.nearestIdle(me.pos);
        return cr ? setOb(o, cr.pos, "보급 상자", "#ffd24a") : null;
      }
      case "heist": {
        if (!this.cargo) return null;
        if (this.cargo.carried(me)) return setOb(o, this.pad.pos, "아군 착륙장", "#35ff7a");
        const cr = this.cargo.nearestIdle(me.pos);
        return cr ? setOb(o, cr.pos, "에너지 코어", "#ffd24a") : null;
      }
      case "titan": return this.titan && this.titan.alive ? setOb(o, this.titan.pos, "거신", "#ff5a66") : null;
      case "boss": {
        if (!this.boss || !this.boss.alive) return null;
        if (!this.open) {
          let best = null, bd = 1e9;
          for (const p of this.pods) if (p.alive) { const d = p.pos.distanceTo(me.pos); if (d < bd) { bd = d; best = p; } }
          if (best) return setOb(o, best.pos, "엔진 포드", "#ff8a5a");
        }
        return setOb(o, this.boss.pos, "모선", "#ff5a66");
      }
    }
    return null;
  }

  // ── 1. 기지 방어 ──────────────────────────────────────────
  setup_waves(c, map) {
    const [bx, bz] = map.combat.blue;
    this.base = this.buildBase(bx, bz, 0, 2, 1200);
    this.base.core.armor = 0.75;
    const start = new THREE.Vector3(bx + 14, 0, bz - 10);
    this.placePlayer(start, Math.atan2(-(0 - bx), -(0 - bz)));
    this.home = this.s.player.spawn.pos.clone();
    for (let i = 0; i < 6; i++) c.addPickup(c.randomPoint(4, 12, 0, bx, bz, 55));
    this.wave = 0; this.waveT = 4; this.waves = 5; this.pending = true;
    this.objective = "코어를 지키세요";
  }
  tick_waves(dt, c) {
    if (!this.base.core.alive) { this.failT = 1.5; this.failWhy = "코어가 파괴되었습니다"; return; }
    const left = this.enemies().length;
    if (this.pending) {
      if ((this.waveT -= dt) <= 0) {
        this.pending = false; this.wave++;
        const k = this.wave, s = this.scale, p = this.base.pos, size = this.s.world.size - 25;
        const ang = Math.random() * Math.PI * 2;
        const cx = clamp(p.x + Math.cos(ang) * 170, -size, size), cz = clamp(p.z + Math.sin(ang) * 170, -size, size);
        this.spawnGroup(cx, cz, 30, [
          ["grunt", Math.round((1 + k) * s * 0.5), "core"], ["grunt", Math.round((1 + k) * s * 0.5), null],
          ["kamikaze", k >= 2 ? Math.round((k - 1) * s) : 0, "core"], ["gunship", k === 3 ? 1 : k === 5 ? Math.round(1.4 * s) : 0, "core"],
        ]);
        this.s.hud.toast(`웨이브 ${k} / ${this.waves}`, "#ff6b5a", 2, 34);
        this.s.game.sound.play("warn");
      }
    } else if (left === 0) {
      if (this.wave >= this.waves) {
        const hp = this.base.core.hp / this.base.core.maxHp;
        this.winT = 1.5; this.winFn = () => this.win(hp >= 0.8 && this.me.deaths <= 1 ? 3 : hp >= 0.5 ? 2 : 1, [{ label: "코어 내구도", value: `${Math.round(hp * 100)}%` }]);
      } else { this.pending = true; this.waveT = 6; this.s.hud.toast("웨이브 격퇴!", "#35ff7a", 1.6, 26); }
    }
    this.objective = this.pending ? (this.wave ? `다음 웨이브까지 ${Math.ceil(this.waveT)}초` : "적 접근 중…") : `웨이브 ${this.wave}/${this.waves} · 남은 적 ${left}`;
  }
  hud_waves(h) {
    const core = this.base.core;
    this.topBar(h, "아군 코어", core.hp / core.maxHp, "#5aa9ff");
    if (core.alive && core.pos.distanceTo(this.me.pos) > 60) h.marker(core.pos, this.s.camera, "#5aa9ff", "코어", core.pos.distanceTo(this.me.pos));
  }

  // ── 2. 포탑 소탕 ──────────────────────────────────────────
  setup_strike(c, map) {
    const st = map.strike;
    this.targets = st.turrets.map(([x, z]) => c.spawnTurret(x, z, 1, { name: "방공 포탑", hp: 130 }));
    this.cmd = c.spawnCore(st.core[0], st.core[1], 1, { hp: 500, name: "지휘소" });
    this.targets.push(this.cmd);
    this.spawnGroup(st.core[0], st.core[1], 45, [["grunt", Math.round(3 * this.scale), null]], { home: this.cmd.pos });
    // 지휘소 수비대: 전차와 대공 로봇
    c.units.spawn("tank", { pos: new THREE.Vector3(st.core[0] + 14, 0, st.core[1] + 10) });
    c.units.spawn("aa", { pos: new THREE.Vector3(st.core[0] - 14, 0, st.core[1] - 10) });
    c.scatterPickups(8);
    this.limit = 300; this.reinf = 35;
    this.total = this.targets.length;
  }
  tick_strike(dt, c) {
    const left = this.targets.filter((t) => t.alive);
    this.objective = `남은 목표 ${left.length}/${this.total}`;
    if (!left.length) { const rem = this.limit - this.time; this.winT = 1.5; this.winFn = () => this.win(rem > 120 ? 3 : rem > 50 ? 2 : 1, [{ label: "남은 시간", value: fmtTime(rem) }]); return; }
    if ((this.reinf -= dt) <= 0) {
      this.reinf = 35;
      if (this.cmd.alive && this.enemies().length < Math.round(4 * this.scale)) { this.spawnGroup(this.cmd.pos.x, this.cmd.pos.z, 40, [["grunt", 1, null]], { home: this.cmd.pos }); this.s.hud.feed("적 증원 도착", "#ff8a8a"); }
    }
    this.near = left.reduce((b, t) => (!b || t.pos.distanceTo(this.me.pos) < b.pos.distanceTo(this.me.pos) ? t : b), null);
  }
  hud_strike(h) {
    if (this.near && this.me.alive) h.marker(this.near.pos, this.s.camera, "#ff8a5a", this.near.name, this.near.pos.distanceTo(this.me.pos));
  }

  // ── 3. 호송 작전 ──────────────────────────────────────────
  setup_escort(c, map, w) {
    const cv = map.convoy;
    this.mover = new PathMover(cv.path, { closed: false, ground: w, speed: cv.speed || 7 });
    const model = makeTruck(0x2f6fb0);
    w.scene.add(model);
    this.truckModel = model;
    this.truck = c.addProp(model, { name: "수송 트럭", team: 0, tag: "truck", radius: 4, hp: 900, maxHp: 900, armor: 0.6, pos: this.mover.pos, vel: this.mover.vel, static: true });
    this.truckAim = this.truck.pos; // 지면 위치
    this.marks = [0.1, 0.27, 0.44, 0.61, 0.78, 0.9];
    this.mi = 0;
    this.homeFn = () => _v.copy(this.mover.pos).setY(this.mover.pos.y + 6);
    const p = this.mover.pos, q = this.mover.quat;
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    this.placePlayer(new THREE.Vector3(p.x + back.x * 10, p.y + 0.3, p.z + back.z * 10), Math.atan2(back.x, back.z));
    c.scatterPickups(8);
    this.objective = "트럭을 보호하세요";
  }
  tick_escort(dt, c) {
    const m = this.mover, t = this.truck;
    if (!t.alive) { this.failT = 1.5; this.failWhy = "수송 트럭이 파괴되었습니다"; return; }
    m.update(dt);
    this.truckModel.position.copy(m.pos); this.truckModel.quaternion.copy(m.quat);
    this.truckModel.userData.tick(dt, m.speed);
    const u = m.s / m.length;
    if (this.mi < this.marks.length && u >= this.marks[this.mi]) {
      const i = this.mi++;
      // 진행 방향 앞쪽에 매복조 투입
      m.curve.getPointAt(Math.min(1, u + 70 / m.length), _v);
      const s = this.scale;
      this.spawnGroup(_v.x, _v.z, 40, [["grunt", Math.round((1 + (i > 2 ? 1 : 0)) * s), "truck"], ["grunt", Math.round(1 * s), null], ["kamikaze", i >= 1 ? Math.round((i >= 4 ? 2 : 1) * s) : 0, "truck"]], { lo: 16, hi: 36 });
      this.s.hud.toast("매복! 적 드론 출현", "#ff6b5a", 1.8, 26);
      this.s.game.sound.play("warn");
    }
    if (m.done) { const hp = t.hp / t.maxHp; this.winT = 1.2; this.winFn = () => this.win(hp >= 0.75 ? 3 : hp >= 0.4 ? 2 : 1, [{ label: "트럭 내구도", value: `${Math.round(hp * 100)}%` }]); }
    this.objective = `목적지까지 ${Math.round((1 - u) * m.length)}m · 주변 적 ${this.enemies().length}`;
  }
  hud_escort(h) {
    const t = this.truck;
    this.topBar(h, "수송 트럭", t.hp / t.maxHp, "#5aa9ff");
    if (t.alive && t.pos.distanceTo(this.me.pos) > 40) h.marker(t.pos, this.s.camera, "#5aa9ff", "트럭", t.pos.distanceTo(this.me.pos));
  }

  // ── 4. 긴급 보급 ──────────────────────────────────────────
  setup_supply(c, map) {
    const sp = map.supply;
    this.cargo = new CargoSys(this);
    this.cargo.addCrate(sp.depot[0], sp.depot[1], 1.4);
    this.cargo.addCrate(sp.depot[0] + 5, sp.depot[1] + 3, 1.4);
    this.pads = sp.camps.map(([x, z]) => this.buildPad(x, z, -1, 8));
    for (const [x, z] of sp.turrets || []) c.spawnTurret(x, z, 1, { name: "적 포탑", hp: 110, range: 65 });
    const mid = sp.camps[sp.camps.length >> 1];
    this.spawnGroup(mid[0], mid[1], 60, [["grunt", Math.round(2 * this.scale), null]], { home: new THREE.Vector3(mid[0], 0, mid[1]), lo: 20, hi: 40 });
    c.scatterPickups(6);
    this.limit = 300; this.done = 0; this.patrol = 45;
  }
  tick_supply(dt, c) {
    this.cargo.update(dt, this.pads, (a) => a.isPlayer, (a, pad) => {
      pad.done = true; pad.beam.visible = false; this.done++;
      this.me.score += 300;
      this.s.hud.toast(`보급 완료 ${this.done}/${this.pads.length}`, "#35ff7a", 1.6, 26);
      this.s.game.sound.play("lap");
    });
    if (this.done >= this.pads.length) { const rem = this.limit - this.time; this.winT = 1.2; this.winFn = () => this.win(rem > 90 ? 3 : rem > 40 ? 2 : 1, [{ label: "남은 시간", value: fmtTime(rem) }]); return; }
    if ((this.patrol -= dt) <= 0) {
      this.patrol = 45;
      if (this.enemies().length < Math.round(3 * this.scale)) { const p = this.me.pos; this.spawnGroup(p.x, p.z, 90, [["grunt", 1, null], ["kamikaze", 1, null]], { lo: 25, hi: 45 }); }
    }
    this.objective = `보급 ${this.done}/${this.pads.length} — ${this.cargo.carried(this.me) ? "캠프로 운반하세요" : "보급 창고에서 상자를 집으세요"}`;
  }
  hud_supply(h) {
    const me = this.me, cam = this.s.camera;
    if (!me.alive) return;
    if (this.cargo.carried(me)) { for (const p of this.pads) if (!p.done) h.marker(_v.copy(p.pos).setY(p.pos.y + 3), cam, "#35ff7a", "캠프", p.pos.distanceTo(me.pos)); }
    else { const cr = this.cargo.nearestIdle(me.pos); if (cr) h.marker(cr.pos, cam, "#ffd24a", "보급 상자", cr.pos.distanceTo(me.pos)); }
  }

  // ── 6. 탈취 작전: 적 진지 세 곳의 에너지 코어를 훔쳐 아군 착륙장으로. 코어를 집으면 경보가 울려 추격대가 붙는다 ──
  setup_heist(c, map, w) {
    const home = this.home, sites = [];
    this.cargo = new CargoSys(this);
    this.cargo.mat.color.setHex(0x38e8ff); this.cargo.mat.emissive.setHex(0x0a6a88);
    for (let k = 0; sites.length < 3 && k < 80; k++) {
      const p = c.randomPoint(3, 5, 0.85);
      if (p.distanceTo(home) < w.size * 0.55 || sites.some((q) => q.distanceTo(p) < w.size * 0.4)) continue;
      sites.push(c.units.groundSpot(p.x, p.z, 30, 5));
    }
    while (sites.length < 3) sites.push(c.randomPoint(3, 5, 0.8));
    this.sites = sites;
    sites.forEach((p, i) => {
      this.cargo.addCrate(p.x, p.z, 1.4);
      for (let j = 0; j < 2; j++) { const a = (j / 2) * Math.PI * 2 + i; c.spawnTurret(p.x + Math.cos(a) * 12, p.z + Math.sin(a) * 12, 1, { name: "경비 포탑", hp: 120, range: 60 }); }
      if (i === 1) c.units.spawn("tank", { pos: new THREE.Vector3(p.x + 16, 0, p.z - 8) });
      if (i === 2) c.units.spawn("aa", { pos: new THREE.Vector3(p.x - 16, 0, p.z + 8) });
      this.spawnGroup(p.x, p.z, 30, [["grunt", Math.round(1 * this.scale), null]], { home: p, lo: 12, hi: 24 });
    });
    this.pad = this.buildPad(home.x, home.z, 0, 9);
    c.scatterPickups(8);
    this.limit = 360; this.done = 0; this.alarm = 0;
  }
  tick_heist(dt, c) {
    const carrying = this.cargo.carried(this.me);
    if (carrying && !carrying.alarmed) {
      carrying.alarmed = true; this.alarm++;
      const p = this.me.pos;
      this.spawnGroup(p.x, p.z, 50, [["grunt", Math.round((1 + (this.alarm > 1 ? 1 : 0)) * this.scale), "player"], ["kamikaze", Math.round(this.alarm * 0.7 * this.scale), "player"]], { lo: 20, hi: 40 });
      this.s.hud.toast("경보 발령! 추격대가 붙었습니다", "#ff6b5a", 1.8, 26); this.s.game.sound.play("warn");
    }
    this.cargo.update(dt, [this.pad], (a) => a.isPlayer, (a, pad, cr) => {
      cr.t = 1e9; this.done++; this.me.score += 500;
      this.s.hud.toast(`에너지 코어 확보 ${this.done}/3`, "#35ff7a", 1.6, 26); this.s.game.sound.play("lap");
    });
    for (const cr of this.cargo.crates) if (cr.state === "respawn" && cr.t < 1e8 && cr.t > 0) cr.alarmed = false;   // 떨어뜨린 코어는 제자리로
    if (this.done >= 3) { const rem = this.limit - this.time; this.winT = 1.2; this.winFn = () => this.win(rem > 150 ? 3 : rem > 70 ? 2 : 1, [{ label: "남은 시간", value: fmtTime(rem) }]); return; }
    this.objective = `에너지 코어 ${this.done}/3 — ${carrying ? "착륙장으로 운반하세요" : "적 진지에서 코어를 훔치세요"}`;
  }
  hud_heist(h) {
    const me = this.me, cam = this.s.camera;
    if (!me.alive) return;
    if (this.cargo.carried(me)) h.marker(_v.copy(this.pad.pos).setY(this.pad.pos.y + 3), cam, "#35ff7a", "착륙장", this.pad.pos.distanceTo(me.pos));
    else for (const cr of this.cargo.crates) if (cr.state === "idle") h.marker(cr.pos, cam, "#38e8ff", "코어", cr.pos.distanceTo(me.pos));
  }

  // ── 7. 초거대로봇: 부위(팔·어깨포·다리)를 부수며 동체를 노린다. 주기적으로 호위기를 쏟아낸다 ──
  setup_titan(c, map, w) {
    const bp = map.boss ? map.boss.pos : [0, 0, 0];
    const at = c.units.groundSpot(bp[0] * 0.6, bp[2] * 0.6, 60, 14);
    const b = this.cfg.boss || {};
    this.titan = c.units.spawn("mech", { pos: at, name: b.name || "초거대로봇", hp: (b.hp || 0.8) * (0.85 + 0.05 * this.teamN), scale: b.scale || 2.4, home: at, rank: b.rank ?? 17 });
    this.titan.bossBar = { name: this.titan.name, mid: false };
    this.introBoss = this.titan; this.bossCfg = null;
    this.spawnGroup(at.x, at.z, 50, [["grunt", Math.round(2 * this.scale), null]], { lo: 18, hi: 34 });
    c.scatterPickups(12);
    this.limit = 480; this.minion = 14;
  }
  tick_titan(dt, c) {
    const t = this.titan;
    if (!t.alive) { this.winT = 2.5; this.winFn = () => this.win(this.me.deaths === 0 ? 3 : this.me.deaths <= 1 ? 2 : 1); return; }
    if ((this.minion -= dt) <= 0) {
      this.minion = 16;
      if (this.enemies().length < Math.round(5 * this.scale)) { this.spawnGroup(t.pos.x, t.pos.z, 30, [["grunt", 1, null], ["kamikaze", Math.round(this.scale), "player"]], { lo: 20, hi: 36 }); this.s.hud.feed("거신이 호위기를 내보냈다", "#ff8a8a"); }
    }
    const parts = t.unit ? t.unit.parts.filter((p) => p !== t) : [];
    this.objective = parts.length ? `부위 파괴 ${parts.filter((p) => !p.alive).length}/${parts.length} · 동체를 노려라` : "동체를 파괴하세요";
  }
  hud_titan() {}

  // ── 5. 모선 격추 ──────────────────────────────────────────
  setup_boss(c, map, w) {
    const bp = map.boss || { pos: [0, 30, 0] };
    const bname = (this.cfg.boss && this.cfg.boss.name) || "모선";
    const boss = (this.boss = c.spawnBot({ kind: "boss", team: 1, name: bname, rank: this.cfg.boss && this.cfg.boss.rank, pos: new THREE.Vector3(...bp.pos), hpScale: 0.8 + 0.25 * this.scale }));
    this.introBoss = boss; this.bossCfg = null;   // 보스전: 출격하자마자 등장 컷신
    boss.armor = 0.12; boss.ai.altOff = 14;
    this.pods = [];
    const geo = (this.podGeo = new THREE.IcosahedronGeometry(1.5, 1));
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.16, 6, 24), new THREE.MeshLambertMaterial({ color: 0x3a3f4a }));
      g.add(core, ring);
      w.scene.add(g);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pod = c.addProp(g, { name: "엔진 포드", team: 1, radius: 1.9, hp: 150 * this.scale, maxHp: 150 * this.scale, static: true });
      pod.off = new THREE.Vector3(Math.cos(a) * 7.5, -1.2, Math.sin(a) * 7.5);
      pod.ring = ring;
      this.pods.push(pod);
    }
    this.spawnGroup(bp.pos[0], bp.pos[2], 40, [["grunt", Math.round(1 * this.scale), null]], { lo: 10, hi: 25 });
    c.scatterPickups(10);
    this.limit = 420; this.minion = 9; this.open = false;
    this.objective = "엔진 포드 4개를 파괴하세요";
  }
  tick_boss(dt, c) {
    const boss = this.boss;
    let alive = 0;
    for (const p of this.pods) {
      if (!p.alive) continue;
      alive++;
      p.pos.copy(p.off).applyAxisAngle(_v.set(0, 1, 0), this.time * 0.5).add(boss.pos);
      p.model.position.copy(p.pos);
      p.ring.rotation.x += dt * 2; p.ring.rotation.y += dt * 1.3;
      if (!boss.alive) c.kill(p, null);
    }
    if (!boss.alive) { this.winT = 2; this.winFn = () => this.win(this.me.deaths === 0 ? 3 : this.me.deaths <= 1 ? 2 : 1); return; }
    if (!alive && !this.open) { this.open = true; boss.armor = 1; this.s.hud.toast("보호막 해제 — 모선을 공격하세요!", "#35ff7a", 2.2, 28); this.s.game.sound.play("lap"); }
    this.objective = this.open ? "모선 코어를 파괴하세요" : `엔진 포드 ${4 - alive}/4 파괴`;
    if ((this.minion -= dt) <= 0) {
      this.minion = this.open ? 7 : 10;
      const kam = this.enemies().filter((e) => e.botKind === "kamikaze").length;
      if (kam < Math.round(2 * this.scale)) {
        const b = c.spawnBot({ kind: "kamikaze", team: 1 });
        b.pos.copy(boss.pos); b.pos.y -= 7; b.model.position.copy(b.pos);
      }
    }
  }
  hud_boss() {}   // 보스 체력바는 전투 HUD 가 위 가운데에 그린다

  dispose() {
    super.dispose();
    if (this.truckModel) this.s.world.scene.remove(this.truckModel);
    if (this.podGeo) this.podGeo.dispose();
  }
}
