// 전투 모드 공통 기반: 전투 시스템 연결, 충돌 피해, 기지 건설, 화물 운반
import * as THREE from "../../vendor/three.module.min.js";
import { Mode } from "./base.js";
import { Combat, TEAM_COLOR } from "../combat.js";

const _v = new THREE.Vector3();

export class CombatMode extends Mode {
  constructor(session, cfg) {
    super(session, cfg);
    this.respawnDelay = Infinity; // 재출격은 전투 시스템이 처리
  }

  initCombat(handlers = {}) {
    this.combat = new Combat(this.s, handlers);
    this.me = this.combat.addPlayer(0);
    return this.combat;
  }

  // 벽·지면 충돌은 추락 대신 피해
  onImpact(impact, hard) {
    // 세게 부딪히면 그대로 파괴, 가벼운 충돌은 피해만
    if (this.state === "run" && impact > 7.5) this.combat.damage(this.me, hard ? 9999 : (impact - 7.5) * 2.25, null, this.s.player.body.pos);
  }

  // R: 제자리에서 기체를 바로 세움
  onReset() {
    const pl = this.s.player, b = pl.body;
    if (!this.me.alive) return;
    _v.copy(b.pos); _v.y += 1.2;
    pl.respawn(_v, b.heading);
  }

  onOutOfBounds() { if (this.me.alive) { this.s.hud.toast("비행 구역 이탈", "#ff6b5a"); this.combat.damage(this.me, 9999, null); } }

  update(dt) {
    super.update(dt);
    if (this.state !== "countdown") this.combat.update(dt);
  }

  finish(result) {
    this.combat.frozen = true;
    super.finish(result);
  }

  dispose() { if (this.cargo) this.cargo.dispose(); this.combat.dispose(); }

  // HUD 목표: 조준·락온 중인 적이 우선, 없으면 임무 목표(각 모드의 missionObjective)
  hudObjective() {
    const c = this.combat, me = this.me;
    if (!c || !me || !me.alive || this.state === "done") return null;
    const o = this._ob || (this._ob = { pos: null, label: "", color: "", pill: true });
    const t = c.aim || (c.lock && c.lockT > 0.12 ? c.lock : null);
    if (t && t.alive) { o.pos = t.pos; o.label = t.name || "표적"; o.color = c.aim ? "#ff6a5a" : "#ffd24a"; return o; }
    return this.missionObjective(o);
  }
  // o 에 { pos, label, color } 를 채워 돌려준다. 없으면 null
  missionObjective() { return null; }

  // 팀 기지: 코어 + 주변 포탑 n개
  buildBase(x, z, team, turrets = 3, coreHp = 700) {
    const c = this.combat, core = c.spawnCore(x, z, team, { hp: coreHp, name: team === 0 ? "아군 코어" : "적 코어" });
    const list = [];
    for (let i = 0; i < turrets; i++) {
      const a = (i / turrets) * Math.PI * 2 + (team ? 0.5 : 1.6);
      list.push(c.spawnTurret(x + Math.cos(a) * 20, z + Math.sin(a) * 20, team, { name: team === 0 ? "아군 포탑" : "적 포탑" }));
    }
    return { core, turrets: list, pos: new THREE.Vector3(x, this.s.world.h(x, z), z) };
  }

  // 착륙장(운반 목적지) 표시
  buildPad(x, z, team, r = 7) {
    const w = this.s.world, y = w.h(x, z), col = team < 0 ? 0xffd24a : TEAM_COLOR[team];
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 28), new THREE.MeshLambertMaterial({ color: 0x2b313c }));
    disc.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.4, 0.22, 6, 40), new THREE.MeshBasicMaterial({ color: col }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.12;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 40, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 20;
    g.add(disc, ring, beam);
    g.position.set(x, y + 0.06, z);
    w.scene.add(g);
    return { pos: new THREE.Vector3(x, y, z), team, r, g, beam, done: false };
  }
}

// 화물 운반: 상자를 집어 착륙장으로 나른다
export class CargoSys {
  constructor(mode) {
    this.mode = mode; this.s = mode.s; this.combat = mode.combat;
    this.crates = [];
    this.geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    this.mat = new THREE.MeshLambertMaterial({ color: 0xd9a441, emissive: 0x4a2f00 });
    this.strap = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  }

  addCrate(x, z, lift = 1.2) {
    const w = this.s.world, home = new THREE.Vector3(x, w.h(x, z) + lift, z);
    const mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.2, 1.56), this.strap);
    mesh.add(band);
    mesh.position.copy(home);
    w.scene.add(mesh);
    const c = { home, pos: home.clone(), mesh, carrier: null, state: "idle", t: 0 };
    this.crates.push(c);
    return c;
  }

  carried(actor) { return this.crates.find((c) => c.carrier === actor) || null; }
  nearestIdle(pos) {
    let best = null, bd = 1e9;
    for (const c of this.crates) if (c.state === "idle") { const d = c.pos.distanceTo(pos); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  _release(c, respawn) {
    if (c.carrier && c.carrier.isPlayer) this.s.player.body.extraMass = 0;
    c.carrier = null;
    c.state = "respawn"; c.t = respawn; c.mesh.visible = false;
  }

  // pads: [{pos, team, r}], canCarry(actor) → bool, onDeliver(actor, pad, crate), 반환 없음
  update(dt, pads, canCarry, onDeliver) {
    const pl = this.s.player;
    for (const c of this.crates) {
      if (c.state === "respawn") {
        if ((c.t -= dt) <= 0) { c.state = "idle"; c.pos.copy(c.home); c.mesh.position.copy(c.home); c.mesh.visible = true; }
        continue;
      }
      if (c.state === "idle") {
        c.mesh.rotation.y += dt * 0.8;
        for (const a of this.combat.actors) {
          if (!a.alive || !canCarry(a) || this.carried(a)) continue;
          if (a.pos.distanceTo(c.pos) < 2.4 + a.radius) {
            c.carrier = a; c.state = "carried";
            if (a.isPlayer) { pl.body.extraMass = pl.body.spec.mass * 0.45; this.s.game.sound.play("pickup"); this.s.hud.toast("화물 적재 — 착륙장으로!", "#ffd24a", 1.4, 22); }
            break;
          }
        }
        continue;
      }
      const a = c.carrier;
      if (!a.alive) { this._release(c, 4); continue; }
      c.pos.copy(a.pos); c.pos.y -= a.radius + (a.isPlayer ? 0.55 : 0.9);
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = 0;
      for (const p of pads) {
        if (p.done || (p.team >= 0 && p.team !== a.team)) continue;
        if (Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < p.r && a.pos.y - p.pos.y < 9) {
          this._release(c, 6);
          onDeliver(a, p, c);
          break;
        }
      }
    }
  }

  dispose() {
    for (const c of this.crates) this.s.world.scene.remove(c.mesh);
    this.geo.dispose(); this.mat.dispose(); this.strap.dispose();
    this.s.player.body.extraMass = 0;
  }
}
