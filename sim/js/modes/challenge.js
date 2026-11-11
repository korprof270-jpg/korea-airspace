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
  { id: "boss", name: "모선 격추", icon: "👾", map: "arena", level: 3, desc: "거대 모선의 엔진 포드 네 개를 부숴 보호막을 벗기고 코어를 파괴하세요" },
];

const _v = new THREE.Vector3();

export class ChallengeMode extends CombatMode {
  constructor(session, cfg) {
    super(session, cfg);
    this.def = MISSIONS.find((m) => m.id === cfg.mission) || MISSIONS[0];
    this.id = this.def.id;
    this.title = `챌린지 · ${this.def.name}`;
    this.teamN = cfg.team || 0;
    this.scale = 1 + 0.3 * this.teamN;
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
    this[`setup_${this.id}`](c, this.s.map, this.s.world);
    for (let i = 0; i < this.teamN; i++) {
      const b = c.spawnBot({ kind: "grunt", team: 0, respawns: true, hpScale: 1.5, leader: this.me, slot: i, name: `윙맨 ${i + 1}` });
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
    for (const [kind, n, focus] of list) for (let i = 0; i < n; i++) {
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
    if (this.state !== "run") return;
    if (this.failT > 0) { if ((this.failT -= dt) <= 0) this.fail(this.failWhy); return; }
    if (this.winT > 0) { if ((this.winT -= dt) <= 0) this.winFn(); return; }
    this[`tick_${this.id}`](dt, this.combat);
    if (this.limit && this.time >= this.limit && this.failT < 0 && this.winT < 0) { this.failT = 0.01; this.failWhy = "제한 시간 초과"; }
  }

  hud(h) {
    const u = h.u, W = h.W;
    drawCombatHud(this.combat, h, { radarRange: 200 });
    this.hudCountdown(h);
    h.text(this.def.name, 18 * u, 30 * u, { size: 18 });
    h.text(this.objective, 18 * u, 52 * u, { size: 14, color: "#ffd24a" });
    h.text(`기체 ${"♥".repeat(Math.max(0, this.lives))}${"♡".repeat(3 - Math.max(0, this.lives))}`, 18 * u, 74 * u, { size: 14, color: "#ff8a8a" });
    if (this.limit) {
      const left = Math.max(0, this.limit - this.time);
      h.panel(W / 2 - 92 * u, 10 * u, 184 * u, 46 * u);
      h.text(fmtTime(left), W / 2, 44 * u, { size: 30, align: "center", mono: true, color: left < 30 ? "#ff6b5a" : "#fff" });
    }
    const f = this[`hud_${this.id}`];
    if (f) f.call(this, h, u, W);
  }

  topBar(h, label, frac, color, y = 70) {
    const u = h.u, W = h.W;
    h.text(label, W / 2, y * u, { size: 13, align: "center", color: "#dfe7f1" });
    h.bar(W / 2 - 150 * u, (y + 6) * u, 300 * u, 9 * u, frac, color);
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
    this.topBar(h, "아군 코어", core.hp / core.maxHp, "#5aa9ff", this.limit ? 70 : 28);
    if (core.alive && core.pos.distanceTo(this.me.pos) > 60) h.marker(core.pos, this.s.camera, "#5aa9ff", "코어", core.pos.distanceTo(this.me.pos));
  }

  // ── 2. 포탑 소탕 ──────────────────────────────────────────
  setup_strike(c, map) {
    const st = map.strike;
    this.targets = st.turrets.map(([x, z]) => c.spawnTurret(x, z, 1, { name: "방공 포탑", hp: 130 }));
    this.cmd = c.spawnCore(st.core[0], st.core[1], 1, { hp: 500, name: "지휘소" });
    this.targets.push(this.cmd);
    this.spawnGroup(st.core[0], st.core[1], 45, [["grunt", Math.round(3 * this.scale), null]], { home: this.cmd.pos });
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
    this.topBar(h, "수송 트럭", t.hp / t.maxHp, "#5aa9ff", 28);
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

  // ── 5. 모선 격추 ──────────────────────────────────────────
  setup_boss(c, map, w) {
    const bp = map.boss || { pos: [0, 30, 0] };
    const boss = (this.boss = c.spawnBot({ kind: "boss", team: 1, name: "모선", pos: new THREE.Vector3(...bp.pos), hpScale: 0.8 + 0.25 * this.scale }));
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
  hud_boss(h) {
    const b = this.boss;
    this.topBar(h, this.open ? "모선" : "모선 (보호막)", b.hp / b.maxHp, this.open ? "#ff5a66" : "#8a6bd6", 70);
  }

  dispose() {
    super.dispose();
    if (this.truckModel) this.s.world.scene.remove(this.truckModel);
    if (this.podGeo) this.podGeo.dispose();
  }
}
