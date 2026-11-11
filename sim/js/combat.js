// 전투 시스템: 액터(플레이어·AI 드론·포탑·코어·호송 차량), 레이저·미사일, 아이템, 피해·격추, 전투 HUD
import * as THREE from "../vendor/three.module.min.js";
import { buildDrone, botLook } from "./dronemodel.js";
import { DIFFICULTY, settings, clamp } from "./config.js";

export const ITEMS = {
  repair: { name: "수리 키트", color: 0x35ff7a, instant: true },
  missiles: { name: "미사일 팩", color: 0xff8a1f, instant: true },
  shield: { name: "실드", color: 0x21d4fd },
  boost: { name: "부스터", color: 0xffe14a },
  overcharge: { name: "과충전", color: 0xff4ad6 },
  emp: { name: "EMP", color: 0xb8c8ff },
};
const ITEM_POOL = ["repair", "repair", "repair", "missiles", "missiles", "missiles", "shield", "shield", "boost", "overcharge", "emp"];
const CALLSIGNS = ["독수리", "송골매", "까치", "올빼미", "참매", "황조롱이", "두루미", "갈매기", "부엉이", "제비", "물수리", "직박구리", "말똥가리", "솔부엉이"];
export const TEAM_COLOR = [0x2f8cff, 0xff2d3d];
const TEAM_CSS = ["#5aa9ff", "#ff5a66"];

// AI 드론 종류
export const KINDS = {
  grunt: { hp: 70, radius: 0.9, scale: 2.6, speed: 19, accel: 15, dmg: 6, rate: 4, range: 26, missiles: 1, score: 100 },
  ace: { hp: 100, radius: 0.9, scale: 2.6, speed: 25, accel: 21, dmg: 7, rate: 5, range: 30, missiles: 2, score: 150 },
  kamikaze: { hp: 34, radius: 0.8, scale: 2.2, speed: 27, accel: 24, dmg: 0, rate: 0, range: 0, missiles: 0, score: 80, boom: 38 },
  gunship: { hp: 240, radius: 1.7, scale: 5, speed: 12, accel: 8, dmg: 8, rate: 6, range: 38, missiles: 6, score: 300 },
  boss: { hp: 1500, radius: 5.5, scale: 17, speed: 8, accel: 4, dmg: 9, rate: 7, range: 55, missiles: 99, score: 2000 },
};

const LASER_SPEED = 260;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _des = new THREE.Vector3(), _aim = new THREE.Vector3();
const _hit = { depth: 0, normal: new THREE.Vector3(), collider: null };
const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const _s = {};

export class Combat {
  // handlers: { ffa, onKill(victim, killer), onDamage(victim, amount, attacker), spawnPoint(actor), items(개수) }
  constructor(session, handlers = {}) {
    this.s = session; this.w = session.world; this.fx = session.fx; this.snd = session.game.sound;
    this.h = handlers;
    this.ffa = !!handlers.ffa;
    this.diff = DIFFICULTY[session.cfg.difficulty || settings.difficulty] || DIFFICULTY.normal;
    this.actors = []; this.shots = []; this.missiles = []; this.pickups = [];
    this.id = 1;
    this.hurtT = 0; this.hurtDir = new THREE.Vector3(); this.warn = 0; this.hitMark = 0;
    this.lock = null; this.lockT = 0;
    this.missileGeo = new THREE.CylinderGeometry(0.09, 0.14, 1.1, 8);
    this.missileGeo.rotateX(Math.PI / 2);
    this.missileMat = new THREE.MeshLambertMaterial({ color: 0xe9edf2, emissive: 0x552200 });
    this.pickGeo = new THREE.OctahedronGeometry(0.8, 0);
    this.ringGeo = new THREE.TorusGeometry(1.25, 0.05, 6, 28);
    this.beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 30, 6, 1, true);
    this.extra = [];
    this.botN = 0;
  }

  hostile(a, b) { return a !== b && a.alive && b.alive && (this.ffa || a.team !== b.team); }
  volAt(p) { return clamp(1.15 - this.s.camera.position.distanceTo(p) / 140, 0, 1); }

  _actor(o) {
    const a = Object.assign({
      id: this.id++, name: "", kind: "bot", team: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), quat: new THREE.Quaternion(),
      radius: 0.9, hp: 100, maxHp: 100, shield: 0, shieldT: 0, alive: true, respawns: false, respawnT: 0, score: 0, kills: 0, deaths: 0,
      heat: 0, overheated: false, fireT: 0, missiles: 0, missileT: 0, item: null, boostT: 0, overT: 0, stunT: 0,
      model: null, ai: null, static: false, targetable: true, invulnerable: false, flash: 0,
    }, o);
    this.actors.push(a);
    return a;
  }

  // ── 액터 생성 ──
  addPlayer(team = 0, name = "나") {
    const pl = this.s.player, b = pl.body;
    this.player = this._actor({ name, kind: "player", team, pos: b.pos, vel: b.vel, quat: b.quat, radius: Math.max(0.45, b.radius * 2), missiles: 4, respawns: true, isPlayer: true });
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.42 * pl.cls.scale + 0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0x21d4fd, transparent: true, opacity: 0.25, depthWrite: false }));
    sm.visible = false;
    pl.model.add(sm);
    this.shieldMesh = sm;
    return this.player;
  }

  spawnBot(o = {}) {
    const kind = o.kind || "grunt", K = KINDS[kind], team = o.team ?? 1;
    const col = this.ffa ? [0xff2d3d, 0xffc400, 0xb44cff, 0x35ff7a, 0xff7a1a, 0x21d4fd, 0xff5ad6, 0xffffff, 0x9be15d][this.botN % 9] : TEAM_COLOR[team];
    const model = buildDrone(botLook(kind, this.ffa ? 1 : team), K.scale, { halo: col });
    this.w.scene.add(model);
    const skill = this.diff.bot * (o.skill || 1);
    const a = this._actor({
      name: o.name || CALLSIGNS[this.botN % CALLSIGNS.length], kind: "bot", botKind: kind, team, model, color: col,
      radius: K.radius, hp: K.hp * (o.hpScale || 1), maxHp: K.hp * (o.hpScale || 1), missiles: K.missiles, respawns: !!o.respawns, K,
      ai: {
        think: Math.random() * 0.3, target: null, los: false, goal: null, roam: null, orbit: Math.random() < 0.5 ? 1 : -1, altOff: Math.random() * 6 - 1,
        yaw: 0, burst: 0, cool: Math.random() * 1.5, skill, focus: o.focus || null, leader: o.leader || null, slot: o.slot || 0, home: o.home || null,
        range: K.range * (0.85 + Math.random() * 0.3), lastHit: null, lastHitT: 0, stuck: 0, mcool: 3 + Math.random() * 5,
      },
    });
    this.botN++;
    a.pos.copy(o.pos || this.randomPoint());
    model.position.copy(a.pos);
    return a;
  }

  // 고정 포탑: 사거리 안의 적을 조준 사격
  spawnTurret(x, z, team = 1, o = {}) {
    const y = this.w.h(x, z), g = new THREE.Group(), col = TEAM_COLOR[team];
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.5, metalness: 0.6 }), tc = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2) });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 2.2, 10), dark); base.position.y = 1.1; base.castShadow = true; g.add(base);
    const head = new THREE.Group(); head.position.y = 2.7; g.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.9), dark); hb.castShadow = true; head.add(hb);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 1.96), tc); strip.position.y = 0.2; head.add(strip);
    for (const sx of [-0.4, 0.4]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 8), dark); br.rotation.x = Math.PI / 2; br.position.set(sx, 0, -1.6); head.add(br); }
    g.position.set(x, y, z);
    this.w.scene.add(g);
    const collider = this.w.col.addCapsule(new THREE.Vector3(x, y + 1, z), new THREE.Vector3(x, y + 2.6, z), 1.3, "turret");
    const a = this._actor({
      name: o.name || "포탑", kind: "turret", team, model: g, head, static: true, radius: 1.9, hp: o.hp || 150, maxHp: o.hp || 150, collider,
      ai: { think: 0, target: null, burst: 0, cool: 1 + Math.random(), yaw: 0, pitch: 0, range: o.range || 80, skill: this.diff.bot },
    });
    a.pos.set(x, y + 2.7, z);
    return a;
  }

  // 기지 코어(목표물)
  spawnCore(x, z, team = 0, o = {}) {
    const y = this.w.h(x, z), g = new THREE.Group(), col = TEAM_COLOR[team];
    const dark = new THREE.MeshStandardMaterial({ color: 0x2f3643, roughness: 0.5, metalness: 0.6 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.4) });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5, 1.2, 12), dark); base.position.y = 0.6; base.receiveShadow = true; g.add(base);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 4, 8), dark); pil.position.y = 3; pil.castShadow = true; g.add(pil);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 1), glow); orb.position.y = 6.6; g.add(orb);
    const rings = [];
    for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3.3 + i * 0.5, 0.12, 6, 36), dark); r.position.y = 6.6; g.add(r); rings.push(r); }
    g.position.set(x, y, z);
    this.w.scene.add(g);
    const c1 = this.w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 4.5, z), 1.4, "core");
    const c2 = this.w.col.addSphere(new THREE.Vector3(x, y + 6.6, z), 2.3, "core");
    const a = this._actor({ name: o.name || "코어", kind: "core", team, model: g, static: true, radius: 3, hp: o.hp || 700, maxHp: o.hp || 700, collider: c1, collider2: c2, orb, rings });
    a.pos.set(x, y + 6.6, z);
    return a;
  }

  // 외부에서 움직이는 액터(호송 트럭 등). pos/vel 은 호출자가 갱신한다
  addProp(model, o) {
    const a = this._actor(Object.assign({ kind: "prop", model, static: true }, o));
    return a;
  }

  // ── 아이템 ──
  addPickup(pos, type) {
    type = type || ITEM_POOL[(Math.random() * ITEM_POOL.length) | 0];
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ITEMS[type].color).multiplyScalar(2.2) });
    const gem = new THREE.Mesh(this.pickGeo, mat), ring = new THREE.Mesh(this.ringGeo, mat);
    const beam = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: ITEMS[type].color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 15;
    g.add(gem, ring, beam);
    g.position.copy(pos);
    this.w.scene.add(g);
    const p = { pos: pos.clone(), type, g, gem, ring, mat, beamMat: beam.material, active: true, t: 0, fixed: false };
    this.pickups.push(p);
    return p;
  }

  scatterPickups(n) { for (let i = 0; i < n; i++) this.addPickup(this.randomPoint(4, 16, 0.62)); }

  _retype(p) {
    p.type = ITEM_POOL[(Math.random() * ITEM_POOL.length) | 0];
    p.mat.color.setHex(ITEMS[p.type].color).multiplyScalar(2.2); p.beamMat.color.setHex(ITEMS[p.type].color);
  }

  // 막히지 않은 임의 지점 (지면 위 lo~hi m)
  randomPoint(lo = 6, hi = 28, frac = 0.7, cx = 0, cz = 0, rad = null) {
    const R = rad ?? this.w.size * frac, p = new THREE.Vector3();
    for (let i = 0; i < 40; i++) {
      p.set(cx + (Math.random() * 2 - 1) * R, 0, cz + (Math.random() * 2 - 1) * R);
      p.x = clamp(p.x, -this.w.size + 10, this.w.size - 10); p.z = clamp(p.z, -this.w.size + 10, this.w.size - 10);
      p.y = this.w.h(p.x, p.z) + lo + Math.random() * (hi - lo);
      if (p.y > this.w.ceiling - 8) p.y = this.w.ceiling - 8;
      if (!this.w.col.blocked(p, 3)) return p;
    }
    return p;
  }

  give(a, type) {
    const it = ITEMS[type];
    if (type === "repair") a.hp = Math.min(a.maxHp, a.hp + 50);
    else if (type === "missiles") a.missiles = Math.min(8, a.missiles + 3);
    else if (a.isPlayer) a.item = type;
    else this.useItem(a, type);
    if (a.isPlayer) { this.snd.play("pickup"); this.s.hud.toast(`${it.name} 획득${it.instant ? "" : "  [E] 사용"}`, "#" + it.color.toString(16).padStart(6, "0"), 1.3, 20); }
    if (this.h.onPickup) this.h.onPickup(a, type);
  }

  useItem(a, type = a.item) {
    if (!type) return;
    if (a.isPlayer) { a.item = null; this.snd.play(type === "emp" ? "emp" : "item"); }
    if (type === "shield") { a.shield = 80; a.shieldT = 10; }
    else if (type === "boost") a.boostT = 6;
    else if (type === "overcharge") a.overT = 10;
    else if (type === "emp") {
      this.fx.flash(a.pos, 0x9fc0ff, 30, 0.5);
      this.fx.burst(a.pos, 0xb8c8ff, 60, 40, 0.5, 0.4, 0);
      for (const o of this.actors) if (this.hostile(a, o) && o.pos.distanceTo(a.pos) < 45 && o.kind !== "core" && o.kind !== "prop") { o.stunT = 3.5; if (o.isPlayer) this.s.hud.toast("EMP 피격 — 조종 불능!", "#b8c8ff", 1.5, 24); }
      if (!a.isPlayer) this.snd.play("emp", this.volAt(a.pos));
    }
  }

  // ── 무기 ──
  fireLaser(a, origin, dir, dmg, color, speed = LASER_SPEED) {
    this.shots.push({ pos: origin.clone(), dir: dir.clone(), speed, life: 0.85, dmg, owner: a, color });
  }

  fireMissile(a, origin, dir, target, dmg = 55) {
    const mesh = new THREE.Mesh(this.missileGeo, this.missileMat);
    mesh.position.copy(origin);
    this.w.scene.add(mesh);
    this.missiles.push({ pos: origin.clone(), vel: dir.clone().multiplyScalar(45).add(a.vel), target, life: 5.5, owner: a, dmg, mesh, speed: 50, lost: 0 });
    this.snd.play("missile", a.isPlayer ? 1 : this.volAt(origin));
    if (target && target.isPlayer) this.warn = 1.2;
  }

  // 사거리·각도 안에서 조준선에 가장 가까운 적
  _aimTarget(maxAng, maxDist) {
    const pl = this.s.player;
    let best = null, bestAng = maxAng;
    for (const o of this.actors) {
      if (!this.hostile(this.player, o) || !o.targetable) continue;
      _a.copy(o.pos).sub(pl.aimPos);
      const d = _a.length();
      if (d > maxDist || d < 1) continue;
      const ang = Math.acos(clamp(_a.dot(pl.aimDir) / d, -1, 1)) - Math.atan(o.radius / d) * 0.5;
      if (ang < bestAng) { bestAng = ang; best = o; }
    }
    return best;
  }

  // 표적의 이동을 감안한 예상 위치
  _lead(from, target, speed, out) {
    const d = from.distanceTo(target.pos);
    return out.copy(target.pos).addScaledVector(target.vel, d / speed);
  }

  _playerWeapons(dt) {
    const p = this.player, pl = this.s.player, inp = this.s.game.input;
    if (!p.alive || p.stunT > 0 || this.s.mode.state !== "run") { this.lock = null; this.lockT = 0; return; }
    const over = p.overT > 0;
    p.fireT -= dt; p.missileT -= dt;
    if (inp.isHeld("fire") && p.fireT <= 0 && !p.overheated) {
      p.fireT = 0.105;
      _d.copy(pl.aimDir);
      // 조준 보정: 조준선 근처의 적에게는 예상 위치로 살짝 끌어당김
      const t = this._aimTarget(0.075, 170);
      if (t && this.w.col.visible(pl.aimPos, t.pos)) {
        this._lead(pl.aimPos, t, LASER_SPEED, _a).sub(pl.aimPos).normalize();
        _d.lerp(_a, 0.8).normalize();
      }
      p.side = -(p.side || 1);
      _x.set(1, 0, 0).applyQuaternion(pl.body.quat);
      _b.copy(pl.aimPos).addScaledVector(_x, p.side * 0.12).addScaledVector(_d, 0.5);
      this.fireLaser(p, _b, _d, over ? 18 : 9, over ? 0xff4ad6 : 0x4dd8ff);
      this.snd.play("laser");
      if (!over) { p.heat += 0.055; if (p.heat >= 1) { p.overheated = true; this.s.hud.toast("과열!", "#ff6b5a", 0.8, 22); } }
    }
    // 락온
    const cand = this._aimTarget(0.17, 170);
    if (cand && cand === this.lock && this.w.col.visible(pl.aimPos, cand.pos)) {
      const was = this.lockT < 0.7;
      this.lockT += dt;
      if (was && this.lockT >= 0.7) this.snd.play("lock");
    } else { this.lock = cand; this.lockT = 0; }
    if (inp.take("missile") && p.missiles > 0 && p.missileT <= 0) {
      p.missiles--; p.missileT = 0.7;
      _b.copy(pl.aimPos).addScaledVector(pl.aimDir, 0.6);
      this.fireMissile(p, _b, pl.aimDir, this.lockT >= 0.7 ? this.lock : null);
    }
    if (inp.take("item") && p.item) this.useItem(p);
  }

  // ── 피해 ──
  damage(a, amount, attacker, point) {
    if (!a.alive || a.invulnerable || amount <= 0 || this.frozen) return;
    if (a.armor) amount *= a.armor;
    if (attacker && attacker.kind !== "player" && a.isPlayer) amount *= this.diff.dmg;
    if (a.shield > 0) { const s = Math.min(a.shield, amount); a.shield -= s; amount -= s; if (a.isPlayer) this.snd.play("hit", 0.6); }
    if (amount <= 0) return;
    a.hp -= amount;
    a.flash = 0.12;
    if (a.ai && attacker) { a.ai.lastHit = attacker; a.ai.lastHitT = 4; }
    if (a.isPlayer) {
      this.hurtT = 0.5;
      if (attacker) this.hurtDir.copy(attacker.pos); else if (point) this.hurtDir.copy(point);
      this.snd.play("hurt", clamp(amount / 20, 0.3, 1));
    } else if (attacker && attacker.isPlayer) { this.hitMark = 0.18; this.snd.play("hit", 0.5); }
    if (this.h.onDamage) this.h.onDamage(a, amount, attacker);
    if (a.hp <= 0) this.kill(a, attacker);
  }

  kill(a, killer) {
    if (!a.alive) return;
    a.alive = false; a.hp = 0; a.deaths++;
    if (killer && killer !== a) killer.kills++;
    const big = a.kind === "core" || a.botKind === "boss" ? 4 : a.kind === "turret" || a.botKind === "gunship" ? 2 : 1;
    this.fx.explosion(a.pos, big);
    this.snd.play("explode", a.isPlayer ? 1 : this.volAt(a.pos) * (0.6 + big * 0.2));
    if (a.isPlayer) {
      const pl = this.s.player;
      pl.crash(); pl.model.visible = false;
      pl.body.vel.multiplyScalar(0.3);
      a.respawnT = 3;
    } else {
      if (a.model) a.model.visible = false;
      if (a.collider) a.collider.off = true;
      if (a.collider2) a.collider2.off = true;
      if (a.respawns) a.respawnT = 3.5 + Math.random() * 2;
    }
    if (this.h.onKill) this.h.onKill(a, killer);
  }

  _respawn(a) {
    const sp = this.h.spawnPoint ? this.h.spawnPoint(a) : null;
    const pos = sp ? sp.pos : this.randomPoint(8, 24);
    a.alive = true; a.hp = a.maxHp; a.shield = 0; a.heat = 0; a.overheated = false; a.stunT = 0; a.boostT = 0; a.overT = 0;
    if (a.isPlayer) {
      a.missiles = Math.max(a.missiles, 3); a.shield = 40; a.shieldT = 3;
      this.s.player.respawn(pos, sp ? sp.yaw || 0 : Math.atan2(pos.x, pos.z));
    } else {
      a.pos.copy(pos); a.vel.set(0, 0, 0); a.missiles = a.K.missiles;
      if (a.model) a.model.visible = true;
      a.ai.target = null;
    }
  }

  // 반경 피해(미사일·자폭)
  splash(pos, radius, dmg, owner, direct) {
    for (const o of this.actors) {
      if (!o.alive || o === direct) continue;
      if (owner && !this.hostile(owner, o) && o !== owner) continue;
      const d = o.pos.distanceTo(pos) - o.radius;
      if (d < radius) this.damage(o, dmg * (1 - Math.max(0, d) / radius) * (o === owner ? 0.5 : 1), owner, pos);
    }
  }

  // ── 매 프레임 ──
  update(dt) {
    const pl = this.s.player, p = this.player;
    this._playerWeapons(dt);

    // 플레이어 상태 반영
    if (p) {
      p.heat = Math.max(0, p.heat - dt * 0.42);
      if (p.overheated && p.heat < 0.45) p.overheated = false;
      pl.body.boost = p.boostT > 0 ? 1.6 : 1;
      if (p.alive) pl.body.disabled = p.stunT > 0 || pl.crashed;
      this.shieldMesh.visible = p.alive && p.shield > 0;
    }

    for (const a of this.actors) {
      if (a.flash > 0) a.flash -= dt;
      if (a.stunT > 0) a.stunT -= dt;
      if (a.boostT > 0) a.boostT -= dt;
      if (a.overT > 0) a.overT -= dt;
      if (a.shieldT > 0) { a.shieldT -= dt; if (a.shieldT <= 0) a.shield = 0; }
      if (!a.alive) {
        if (a.respawns && (a.respawnT -= dt) <= 0) this._respawn(a);
        continue;
      }
      if (a.kind === "bot") this._bot(a, dt);
      else if (a.kind === "turret") this._turret(a, dt);
      else if (a.kind === "core") { a.orb.rotation.y += dt * 0.8; a.rings[0].rotation.x += dt * 0.9; a.rings[1].rotation.y += dt * 0.7; a.rings[1].rotation.x = 1.2; }
    }

    this._shots(dt);
    this._missiles(dt);
    this._pickups(dt);
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.hitMark > 0) this.hitMark -= dt;
    if (this.warn > 0) this.warn -= dt;
  }

  _shots(dt) {
    const fx = this.fx, col = this.w.col;
    fx.beginBolts();
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const len = s.speed * dt;
      // 액터 명중 검사 (선분-구)
      let bestT = len + 1, victim = null;
      for (const o of this.actors) {
        if (!o.alive || o === s.owner || !o.targetable || !this.hostile(s.owner, o)) continue;
        _a.copy(o.pos).sub(s.pos);
        const t = _a.dot(s.dir);
        const r = o.radius + (s.owner.isPlayer ? 0.35 : 0);
        if (t < -r || t > len + r) continue;
        const perp2 = _a.lengthSq() - t * t;
        if (perp2 > r * r) continue;
        const th = Math.max(0, t - Math.sqrt(r * r - perp2));
        if (th < bestT) { bestT = th; victim = o; }
      }
      // 지형·구조물
      let wall = -1;
      for (let d = 0.7; d <= len; d += 0.7) { _b.copy(s.pos).addScaledVector(s.dir, d); if (col.blocked(_b, 0.03)) { wall = d; break; } }
      if (victim && (wall < 0 || bestT <= wall)) {
        _b.copy(s.pos).addScaledVector(s.dir, bestT);
        fx.spark(_b, s.color, 6);
        this.damage(victim, s.dmg, s.owner, _b);
        this.shots.splice(i, 1); continue;
      }
      if (wall >= 0) { fx.spark(_b, 0xffd27a, 4); this.shots.splice(i, 1); continue; }
      s.pos.addScaledVector(s.dir, len);
      s.life -= dt;
      if (s.life <= 0) { this.shots.splice(i, 1); continue; }
      fx.bolt(_b.copy(s.pos).addScaledVector(s.dir, -1.6), s.dir, 3.2, s.color);
    }
    fx.endBolts();
  }

  _missiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      m.speed = Math.min(88, m.speed + 40 * dt);
      _a.copy(m.vel).normalize();
      const t = m.target;
      if (t && t.alive && m.lost < 0.35) {
        this._lead(m.pos, t, m.speed, _b).sub(m.pos);
        const d = _b.length();
        _b.multiplyScalar(1 / Math.max(d, 1e-3));
        if (_a.dot(_b) < 0.15) m.lost += dt; else m.lost = 0;
        // 선회율 제한
        const ang = Math.acos(clamp(_a.dot(_b), -1, 1)), maxTurn = 2.3 * dt;
        if (ang > 1e-4) _a.lerp(_b, Math.min(1, maxTurn / ang)).normalize();
        if (t.isPlayer) this.warn = Math.max(this.warn, 0.3);
      }
      m.vel.copy(_a).multiplyScalar(m.speed);
      m.pos.addScaledVector(m.vel, dt);
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(_z.set(0, 0, 1), _a);
      this.fx.puff(m.pos, 0xffb060, 0.45, 0.5, 0.2);
      let boom = m.life <= 0 || this.w.col.blocked(m.pos, 0.12), direct = null;
      for (const o of this.actors) {
        if (!o.alive || !o.targetable || !this.hostile(m.owner, o)) continue;
        if (o.pos.distanceTo(m.pos) < o.radius + 1.6) { boom = true; direct = o; break; }
      }
      if (boom) {
        this.fx.explosion(m.pos, 1.3);
        this.snd.play("explode", this.volAt(m.pos) * 0.8);
        if (direct) this.damage(direct, m.dmg, m.owner, m.pos);
        this.splash(m.pos, 7, m.dmg * 0.5, m.owner, direct);
        this.w.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
  }

  _pickups(dt) {
    for (const p of this.pickups) {
      if (!p.active) {
        p.t -= dt;
        if (p.t <= 0) { p.active = true; p.g.visible = true; if (!p.fixed) this._retype(p); }
        continue;
      }
      p.gem.rotation.y += dt * 2; p.ring.rotation.x += dt * 1.3; p.ring.rotation.y += dt * 0.7;
      for (const a of this.actors) {
        if (!a.alive || a.static || (a.kind !== "player" && a.kind !== "bot")) continue;
        if (a.botKind === "boss" || a.botKind === "kamikaze") continue;
        if (a.pos.distanceTo(p.pos) < 2.6 + a.radius) {
          this.give(a, p.type);
          p.active = false; p.g.visible = false; p.t = 16;
          break;
        }
      }
    }
  }

  // ── AI 드론 ──
  _think(a) {
    const ai = a.ai;
    ai.think = 0.22 + Math.random() * 0.16;
    if (ai.lastHitT > 0) ai.lastHitT -= 0.3; else ai.lastHit = null;
    // 표적 선정: 가까운 적 우선, 목표물(focus)·방금 나를 쏜 적에 가중
    let best = null, bs = 1e9;
    for (const o of this.actors) {
      if (!this.hostile(a, o) || !o.targetable) continue;
      let d = a.pos.distanceTo(o.pos);
      if (d > 260 && o.kind !== ai.focus) continue;
      if (ai.focus && (o.kind === ai.focus || o.tag === ai.focus)) d *= 0.35;
      if (o === ai.lastHit) d *= 0.5;
      if (o.kind === "turret" && ai.focus !== "turret") d *= 1.6;
      if (d < bs) { bs = d; best = o; }
    }
    ai.target = best;
    ai.los = best ? this.w.col.visible(a.pos, best.pos, 1.5) : false;
    ai.goal = null;
    // 체력이 낮으면 수리 키트를 찾는다
    if (a.hp < a.maxHp * 0.4 && a.botKind !== "kamikaze" && a.botKind !== "boss") {
      let bp = null, bd = 130;
      for (const p of this.pickups) if (p.active && p.type === "repair") { const d = p.pos.distanceTo(a.pos); if (d < bd) { bd = d; bp = p; } }
      if (bp) ai.goal = bp.pos;
    }
    if (!ai.goal && !best) {
      if (ai.leader && ai.leader.alive) ai.goal = null; // 편대 비행은 _bot 에서 처리
      else if (!ai.roam || ai.roam.distanceTo(a.pos) < 12 || Math.random() < 0.03) ai.roam = ai.home ? this.randomPoint(8, 22, 0, ai.home.x, ai.home.z, 50) : this.randomPoint(8, 26);
    }
    if (this.h.botGoal) { const g = this.h.botGoal(a); if (g) ai.goal = g; }
  }

  _bot(a, dt) {
    const ai = a.ai, K = a.K, w = this.w, col = w.col;
    if (a.stunT > 0) { // EMP: 조종 불능, 서서히 떨어짐
      a.vel.y -= 5 * dt; a.vel.multiplyScalar(1 - dt * 0.8);
      a.pos.addScaledVector(a.vel, dt);
      const gy = w.h(a.pos.x, a.pos.z) + a.radius; if (a.pos.y < gy) { a.pos.y = gy; a.vel.y = 0; }
      a.model.position.copy(a.pos); a.model.rotation.z += dt * 3; a.model.userData.tick(dt, 0, this.s.time);
      return;
    }
    if ((ai.think -= dt) <= 0) this._think(a);
    const speed = K.speed * (0.75 + ai.skill * 0.3) * (a.boostT > 0 ? 1.35 : 1);
    const t = ai.target;
    let face = null;
    _des.set(0, 0, 0);

    if (ai.goal) {
      _des.copy(ai.goal).sub(a.pos); const d = _des.length(); _des.multiplyScalar(speed / Math.max(d, 1));
    } else if (t) {
      _a.copy(t.pos).sub(a.pos);
      const d = _a.length();
      face = t;
      if (K.boom) { // 자폭 드론: 예상 위치로 돌진
        this._lead(a.pos, t, speed, _b).sub(a.pos).normalize();
        _des.copy(_b).multiplyScalar(speed);
        if (d < a.radius + t.radius + 1.6) { this.splash(a.pos, 7, K.boom, a, null); this.kill(a, null); return; }
      } else {
        _a.multiplyScalar(1 / Math.max(d, 1e-3));
        const R = ai.range + (t.static ? 12 : 0);
        _c.crossVectors(_a, UP).normalize().multiplyScalar(ai.orbit);
        if (d > R + 10 || !ai.los) _des.copy(_a).multiplyScalar(speed).addScaledVector(_c, speed * 0.25);
        else if (d < R - 8) _des.copy(_a).multiplyScalar(-speed * 0.7).addScaledVector(_c, speed * 0.6);
        else _des.copy(_c).multiplyScalar(speed * 0.65).addScaledVector(_a, (d - R) * 0.4);
        _des.y += (t.pos.y + ai.altOff + (t.static ? 6 : 0) - a.pos.y) * 0.9;
        if (Math.random() < dt * 0.25) ai.orbit = -ai.orbit;
      }
    } else if (ai.leader && ai.leader.alive) {
      // 편대 비행: 리더 뒤 좌우에 붙는다
      const L = ai.leader;
      _z.set(0, 0, 1).applyQuaternion(L.quat); _z.y = 0; if (_z.lengthSq() < 0.01) _z.set(0, 0, 1); _z.normalize();
      _x.set(_z.z, 0, -_z.x);
      const side = ai.slot % 2 ? 1 : -1, row = 1 + Math.floor(ai.slot / 2);
      _b.copy(L.pos).addScaledVector(_z, 5 * row).addScaledVector(_x, side * 5 * row); _b.y += 1.5;
      _des.copy(_b).sub(a.pos).multiplyScalar(1.4).add(L.vel);
      if (_des.length() > speed * 1.3) _des.setLength(speed * 1.3);
    } else if (ai.roam) {
      _des.copy(ai.roam).sub(a.pos); const d = _des.length(); _des.multiplyScalar(speed * 0.7 / Math.max(d, 1));
    }

    // 회피: 지면·천장·경계·장애물
    const gy = w.h(a.pos.x, a.pos.z) + 2.5 + a.radius;
    if (a.pos.y < gy + 3) _des.y += (gy + 3 - a.pos.y) * 2.5;
    if (a.pos.y > w.ceiling - 12) _des.y -= (a.pos.y - (w.ceiling - 12)) * 2;
    const lim = w.size - 12;
    if (Math.abs(a.pos.x) > lim) _des.x -= Math.sign(a.pos.x) * (Math.abs(a.pos.x) - lim) * 2;
    if (Math.abs(a.pos.z) > lim) _des.z -= Math.sign(a.pos.z) * (Math.abs(a.pos.z) - lim) * 2;
    _b.copy(a.pos).addScaledVector(a.vel, 0.55);
    if (col.querySphere(_b, a.radius + 2.2, _hit) && _hit.collider) {
      _des.addScaledVector(_hit.normal, speed * 1.1); _des.y += speed * 0.45;
      ai.stuck += dt; if (ai.stuck > 1.2) { ai.orbit = -ai.orbit; ai.stuck = 0; ai.roam = null; }
    } else ai.stuck = Math.max(0, ai.stuck - dt);
    // 서로 겹치지 않게
    for (const o of this.actors) {
      if (o === a || !o.alive || o.kind !== "bot") continue;
      const d = a.pos.distanceTo(o.pos), min = a.radius + o.radius + 2.5;
      if (d < min && d > 0.01) _des.addScaledVector(_a.copy(a.pos).sub(o.pos), (min - d) * 3 / d);
    }

    // 속도 적분
    _a.copy(_des).sub(a.vel);
    const am = K.accel * (0.8 + ai.skill * 0.3) * dt, al = _a.length();
    if (al > am) _a.multiplyScalar(am / al);
    a.vel.add(_a);
    a.pos.addScaledVector(a.vel, dt);
    if (col.querySphere(a.pos, a.radius, _hit)) {
      a.pos.addScaledVector(_hit.normal, _hit.depth);
      const vn = a.vel.dot(_hit.normal); if (vn < 0) a.vel.addScaledVector(_hit.normal, -1.4 * vn);
    }

    // 자세: 표적(또는 진행 방향)을 향하고 가속 방향으로 기운다
    if (face) _b.copy(face.pos).sub(a.pos); else _b.copy(a.vel);
    if (_b.x * _b.x + _b.z * _b.z > 0.5) {
      const want = Math.atan2(-_b.x, -_b.z);
      let dy = want - ai.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      ai.yaw += clamp(dy, -4 * dt, 4 * dt);
      ai.yawErr = Math.abs(dy);
    }
    _y.copy(UP).addScaledVector(_a, 0.5 / Math.max(am, 1e-3) * 0.55).addScaledVector(a.vel, 0.012).normalize();
    _z.set(Math.sin(ai.yaw), 0, Math.cos(ai.yaw));
    _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
    _m.makeBasis(_x, _y, _z);
    a.quat.setFromRotationMatrix(_m);
    a.model.position.copy(a.pos);
    a.model.quaternion.slerp(a.quat, Math.min(1, dt * 8));
    a.model.userData.tick(dt, 0.4 + a.vel.length() / 50, this.s.time);

    // 사격
    ai.cool -= dt; ai.mcool -= dt;
    if (t && !K.boom && ai.los && !ai.goal) {
      const d = a.pos.distanceTo(t.pos);
      if (d < K.range * 3.2 && (ai.yawErr || 0) < 0.45) {
        if (ai.burst <= 0 && ai.cool <= 0) { ai.burst = 3 + ((Math.random() * 4) | 0); ai.cool = 0; }
        if (ai.burst > 0 && ai.cool <= 0) {
          ai.burst--; ai.cool = ai.burst > 0 ? 1 / K.rate : 0.9 + Math.random() * 1.2 - ai.skill * 0.4;
          this._lead(a.pos, t, 150, _aim).sub(a.pos).normalize();
          const spread = 0.012 + (1 - this.diff.aim) * 0.075;
          _aim.x += (Math.random() - 0.5) * spread; _aim.y += (Math.random() - 0.5) * spread; _aim.z += (Math.random() - 0.5) * spread;
          _aim.normalize();
          _b.copy(a.pos).addScaledVector(_aim, a.radius + 0.4);
          this.fireLaser(a, _b, _aim, K.dmg * (a.overT > 0 ? 2 : 1), this.ffa ? 0xff6a4d : a.team === 0 ? 0x66b8ff : 0xff5040, 150);
          this.snd.play("elaser", this.volAt(a.pos) * 0.7);
        }
        if (a.missiles > 0 && ai.mcool <= 0 && d > 28 && d < 130 && !t.static) {
          a.missiles--; ai.mcool = (a.botKind === "boss" ? 3 : 7) + Math.random() * 5;
          _aim.copy(t.pos).sub(a.pos).normalize();
          _b.copy(a.pos).addScaledVector(_aim, a.radius + 1);
          this.fireMissile(a, _b, _aim, t, 30);
        }
      }
    }
  }

  _turret(a, dt) {
    const ai = a.ai;
    if (a.stunT > 0) return;
    if ((ai.think -= dt) <= 0) {
      ai.think = 0.3;
      let best = null, bd = ai.range;
      for (const o of this.actors) {
        if (!this.hostile(a, o) || o.static) continue;
        const d = o.pos.distanceTo(a.pos);
        if (d < bd && this.w.col.visible(a.pos, o.pos, 1.5)) { bd = d; best = o; }
      }
      ai.target = best;
    }
    const t = ai.target;
    ai.cool -= dt;
    if (!t || !t.alive) { a.head.rotation.y += dt * 0.4; return; }
    this._lead(a.pos, t, 140, _aim).sub(a.pos);
    const want = Math.atan2(-_aim.x, -_aim.z), wp = Math.atan2(_aim.y, Math.hypot(_aim.x, _aim.z));
    let dy = want - ai.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    ai.yaw += clamp(dy, -2.6 * dt, 2.6 * dt);
    ai.pitch += clamp(wp - ai.pitch, -2 * dt, 2 * dt);
    a.head.rotation.set(ai.pitch, ai.yaw, 0, "YXZ");
    if (Math.abs(dy) < 0.12 && ai.cool <= 0) {
      if (ai.burst <= 0) ai.burst = 3;
      ai.burst--; ai.cool = ai.burst > 0 ? 0.13 : 1.5 - ai.skill * 0.5;
      _aim.normalize();
      const spread = 0.015 + (1 - this.diff.aim) * 0.07;
      _aim.x += (Math.random() - 0.5) * spread; _aim.y += (Math.random() - 0.5) * spread; _aim.z += (Math.random() - 0.5) * spread;
      _aim.normalize();
      _b.copy(a.pos).addScaledVector(_aim, 2.6);
      this.fireLaser(a, _b, _aim, 7, a.team === 0 ? 0x66b8ff : 0xffa040, 140);
      this.snd.play("elaser", this.volAt(a.pos) * 0.6);
    }
  }

  // ── 전투 HUD ──
  hud(h, o = {}) {
    const g = h.g, u = h.u, W = h.W, H = h.H, s = this.s, cam = s.camera, pl = s.player, p = this.player;
    // 피격 붉은 테두리
    if (this.hurtT > 0) {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      gr.addColorStop(0, "rgba(255,0,0,0)"); gr.addColorStop(1, `rgba(255,30,30,${0.5 * this.hurtT / 0.5})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      h.project(this.hurtDir, cam, _s);
      let dx = _s.x - W / 2, dy = _s.y - H / 2; if (!_s.front) { dx = -dx; dy = -dy; }
      const ang = Math.atan2(dy, dx);
      g.strokeStyle = `rgba(255,70,70,${this.hurtT * 2})`; g.lineWidth = 6 * u;
      g.beginPath(); g.arc(W / 2, H / 2, 110 * u, ang - 0.3, ang + 0.3); g.stroke();
    }
    if (p.shield > 0) { g.strokeStyle = "rgba(33,212,253,0.35)"; g.lineWidth = 10 * u; g.strokeRect(0, 0, W, H); }
    if (p.stunT > 0) h.text("EMP — 조종 불능", W / 2, H * 0.45, { size: 26, align: "center", color: "#b8c8ff" });

    // 적·아군 표시
    for (const a of this.actors) {
      if (!a.alive || a === p || !a.targetable) continue;
      const d = a.pos.distanceTo(cam.position);
      const enemy = this.hostile(p, a) || !p.alive && (this.ffa || a.team !== p.team);
      if (d > (enemy ? 320 : 160)) continue;
      const big = a.kind === "core" || a.kind === "turret" || a.botKind === "boss" || a.botKind === "gunship" || a.kind === "prop";
      const col = enemy ? (a === this.lock && this.lockT >= 0.7 ? "#ff3030" : "rgba(255,90,90,0.9)") : "rgba(90,170,255,0.8)";
      const b = h.bracket(a.pos, cam, a.radius * 1.15, col, d < 150 || big ? a.name : null);
      if (b && (enemy || big)) h.bar(b.x - b.px, b.y + b.px + 4 * u, b.px * 2, 3 * u, a.hp / a.maxHp, enemy ? "#ff5a5a" : "#5aa9ff");
      if (b && a === this.lock) {
        const k = Math.min(1, this.lockT / 0.7);
        g.strokeStyle = k >= 1 ? "#ff3030" : "#ffd24a"; g.lineWidth = 2 * u;
        g.beginPath(); g.arc(b.x, b.y, b.px * (1.9 - k * 0.6), -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
        if (k >= 1) h.text("LOCK", b.x, b.y + b.px + 22 * u, { size: 12, align: "center", color: "#ff3030" });
      }
    }

    // 조준선
    _a.copy(pl.aimPos).addScaledVector(pl.aimDir, 80);
    h.project(_a, cam, _s);
    if (_s.front && p.alive) {
      const x = _s.x, y = _s.y, c = this.hitMark > 0 ? "#ff5050" : p.overheated ? "#ff9a3a" : "#ffffff";
      g.strokeStyle = c; g.lineWidth = 2 * u;
      g.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(x + dx * 6 * u, y + dy * 6 * u); g.lineTo(x + dx * 16 * u, y + dy * 16 * u); }
      g.stroke();
      g.fillStyle = c; g.fillRect(x - 1.2 * u, y - 1.2 * u, 2.4 * u, 2.4 * u);
      h.bar(x - 26 * u, y + 26 * u, 52 * u, 4 * u, p.heat, p.overheated ? "#ff5a3a" : p.overT > 0 ? "#ff4ad6" : "#ffb347");
    }

    // 체력·무장
    const touch = s.game.input.device === "touch";
    const bx = (settings.showSticks && !touch ? 170 : 18) * u, by = H - (touch ? 150 : 34) * u;
    h.text("HP", bx, by - 22 * u, { size: 12, color: "#b8c7d6" });
    h.bar(bx + 28 * u, by - 32 * u, 150 * u, 11 * u, p.hp / p.maxHp, p.hp > 50 ? "#3dd68c" : p.hp > 25 ? "#ffd24a" : "#ff5a5a");
    if (p.shield > 0) h.bar(bx + 28 * u, by - 38 * u, 150 * u, 4 * u, p.shield / 80, "#21d4fd", "rgba(0,0,0,0)");
    h.text(`${Math.ceil(p.hp)}`, bx + 186 * u, by - 22 * u, { size: 14, mono: true });
    h.text(`미사일 ${"▮".repeat(p.missiles)}${"▯".repeat(Math.max(0, 4 - p.missiles))}`, bx, by, { size: 14, color: "#ffb86b" });
    if (p.item) h.text(`[E] ${ITEMS[p.item].name}`, bx + 150 * u, by, { size: 14, color: "#" + ITEMS[p.item].color.toString(16).padStart(6, "0") });
    const buffs = [];
    if (p.boostT > 0) buffs.push(`부스터 ${p.boostT.toFixed(0)}s`);
    if (p.overT > 0) buffs.push(`과충전 ${p.overT.toFixed(0)}s`);
    if (p.shieldT > 0 && p.shield > 0) buffs.push(`실드 ${p.shieldT.toFixed(0)}s`);
    if (buffs.length) h.text(buffs.join("  ·  "), bx, by - 46 * u, { size: 13, color: "#ffe14a" });

    if (this.warn > 0 && Math.floor(s.time * 8) % 2) h.text("⚠ 미사일 접근", W / 2, H * 0.72, { size: 22, align: "center", color: "#ff3030" });
    if (this.warn > 0 && Math.floor(s.time * 8) % 4 === 0 && !this._wb) { this._wb = true; this.snd.play("warn"); } else if (Math.floor(s.time * 8) % 4 !== 0) this._wb = false;
    if (!p.alive) h.text(`격추됨 — ${Math.max(0, p.respawnT).toFixed(1)}초 후 재출격`, W / 2, H * 0.4, { size: 26, align: "center", color: "#ff6b5a" });

    this._radar(h, o.radarRange || 160);
    if (s.game.input.isHeld("score")) this._board(h);
  }

  _radar(h, range) {
    const g = h.g, u = h.u, R = 62 * u, cx = h.W - R - 16 * u, cy = h.H - R - 16 * u, p = this.player, yaw = this.s.player.body.heading;
    g.fillStyle = "rgba(8,12,20,0.5)"; g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(cx, cy, R / 2, 0, 7); g.strokeStyle = "rgba(255,255,255,0.12)"; g.stroke();
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const dot = (pos, col, size, sq) => {
      const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
      let rx = dx * c - dz * s, ry = dx * s + dz * c;
      const d = Math.hypot(rx, ry), k = d > range ? range / d : 1;
      rx = rx * k / range * R; ry = ry * k / range * R;
      g.fillStyle = col;
      if (sq) g.fillRect(cx + rx - size, cy + ry - size, size * 2, size * 2);
      else { g.beginPath(); g.arc(cx + rx, cy + ry, size, 0, 7); g.fill(); }
    };
    for (const pk of this.pickups) if (pk.active) dot(pk.pos, "rgba(255,225,74,0.8)", 1.8 * u, true);
    for (const a of this.actors) {
      if (!a.alive || a === p || !a.targetable) continue;
      const enemy = this.ffa || a.team !== p.team;
      dot(a.pos, enemy ? "#ff5a5a" : "#5aa9ff", (a.static ? 3.6 : 2.8) * u, a.static);
    }
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(cx, cy - 6 * u); g.lineTo(cx + 4 * u, cy + 4 * u); g.lineTo(cx - 4 * u, cy + 4 * u); g.fill();
  }

  // 점수판 행: 드론(플레이어·AI)만
  board() {
    return this.actors.filter((a) => a.kind === "player" || (a.kind === "bot" && a.respawns)).sort((a, b) => b.score - a.score);
  }

  _board(h) {
    const rows = this.board(), u = h.u, w = 380 * u, x = h.W / 2 - w / 2;
    let y = h.H * 0.2;
    h.panel(x, y, w, (rows.length + 1.6) * 24 * u, "rgba(8,12,20,0.82)");
    y += 26 * u;
    h.text("이름", x + 16 * u, y, { size: 13, color: "#9fb4c8" });
    h.text("점수", x + w - 150 * u, y, { size: 13, align: "right", color: "#9fb4c8" });
    h.text("격추", x + w - 84 * u, y, { size: 13, align: "right", color: "#9fb4c8" });
    h.text("피격추", x + w - 16 * u, y, { size: 13, align: "right", color: "#9fb4c8" });
    for (const a of rows) {
      y += 24 * u;
      const col = a.isPlayer ? "#ffd24a" : this.ffa ? "#fff" : TEAM_CSS[a.team];
      h.text(a.name, x + 16 * u, y, { size: 14, color: col });
      h.text(`${Math.round(a.score)}`, x + w - 150 * u, y, { size: 14, align: "right", mono: true, color: col });
      h.text(`${a.kills}`, x + w - 84 * u, y, { size: 14, align: "right", mono: true, color: col });
      h.text(`${a.deaths}`, x + w - 16 * u, y, { size: 14, align: "right", mono: true, color: col });
    }
  }

  dispose() {
    const sc = this.w.scene;
    for (const a of this.actors) if (a.model && a.kind !== "player") { sc.remove(a.model); if (a.model.userData.dispose) a.model.userData.dispose(); }
    for (const m of this.missiles) sc.remove(m.mesh);
    for (const p of this.pickups) { sc.remove(p.g); p.mat.dispose(); p.beamMat.dispose(); }
    this.missileGeo.dispose(); this.missileMat.dispose(); this.pickGeo.dispose(); this.ringGeo.dispose(); this.beamGeo.dispose();
    this.s.player.body.boost = 1;
  }
}
