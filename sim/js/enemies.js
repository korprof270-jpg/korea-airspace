// 대형·지상 적 유닛: 전차, 대공 로봇, 공중 전투함·순양함, 거대로봇 (전투기는 combat.js 의 AI 드론 종류 "jet")
// 유닛 = 본체 액터(root) + 부위 액터(parts). 부위는 따로 조준·파괴되고, 파괴되면 떨어져 나가거나 주저앉는 등 동작이 바뀐다
import * as THREE from "../vendor/three.module.min.js";
import { clamp } from "./config.js";
import { rollRank, rankStats, clampRank } from "./ranks.js";
import { decorateUnit } from "./factions.js";
import { armorMat, chamferBox } from "./unitskin.js";

const V3 = THREE.Vector3;
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _q = new THREE.Quaternion();
const UP = new V3(0, 1, 0);
const lam = (c) => armorMat(c);   // 패널 무늬 + 금속 광택 (툰 변환 뒤에도 유지)
const lamB = (c) => armorMat(c, 0.05);   // 거대 기체용: 판을 크게
const glow = (c, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
function box(p, w, h, d, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(chamferBox(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; p.add(me); return me; }
function cyl(p, r1, r2, h, m, x = 0, y = 0, z = 0, seg = 10) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); me.position.set(x, y, z); me.castShadow = true; p.add(me); return me; }
function grp(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; }
// 유압 실린더: 같은 그룹 안의 두 점 a→b 사이에 굵은 통 + 가는 막대
function piston(p, a, b, r, mOuter, mRod) {
  const A = new V3(...a), B = new V3(...b), mid = A.clone().lerp(B, 0.42), L = A.distanceTo(B);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize());
  const o = cyl(p, r, r, L * 0.55, mOuter, 0, 0, 0, 8); o.position.copy(A.clone().lerp(B, 0.27)); o.quaternion.copy(q);
  const i = cyl(p, r * 0.5, r * 0.5, L * 0.6, mRod, 0, 0, 0, 6); i.position.copy(A.clone().lerp(B, 0.7)); i.quaternion.copy(q);
  return mid;
}
// 환기 슬랫: 판 위에 어두운 가로살 n 개
function vents(p, w, h, n, m, x, y, z, depth = 0.12) { for (let k = 0; k < n; k++) box(p, w, h / n * 0.45, depth, m, x, y - h / 2 + (k + 0.5) * (h / n), z); }
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const turn = (cur, want, max) => cur + clamp(wrap(want - cur), -max, max);

export const UNIT_NAME = { tank: "전차", aa: "대공 로봇", frigate: "전투함", cruiser: "순양함", mech: "거대로봇" };
// 에일(외계) 진영 유닛 이름. 외피는 factions.js 의 decorateUnit
export const AIL_NAME = { tank: "갑각체", aa: "포자탑", frigate: "순항체", cruiser: "모함", mech: "거신체" };

export class Units {
  constructor(combat) {
    this.c = combat; this.w = combat.w; this.s = combat.s;
    this.list = []; this.debris = [];
  }

  // type: tank | aa | frigate | cruiser | mech.  o: { pos, name, hp(배율), scale, home, boss }
  spawn(type, o = {}) {
    // 계급: 포인트 색(o.tc)과 내구도·화력·조준 배율
    const rk = rankStats(o.rank !== undefined ? clampRank(o.rank) : rollRank(this.c.level, type));
    const ail = this.c.s.cfg.faction === "ail";
    o = Object.assign({}, o, { rk, tc: rk.color, hp: (o.hp || 1) * rk.hp, name: `${rk.name} ${o.name || (ail ? AIL_NAME[type] : UNIT_NAME[type])}` });
    const u = MAKE[type](this, o);
    if (this.c.s.cfg.faction) decorateUnit(u, type, this.c.s.cfg.faction);
    u.rk = rk; u.root.rk = rk; for (const p of u.parts) p.rk = rk;
    u.type = type; u.t = Math.random() * 10; u.cool = {};
    this.list.push(u);
    return u.root;
  }

  // 평평하고 비어 있는 지상 자리 (x,z 주변 rad 안)
  groundSpot(x, z, rad = 40, need = 6) {
    const w = this.w, p = new V3();
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * 6.283, r = i ? Math.random() * rad * (1 + i / 30) : 0;
      p.set(clamp(x + Math.cos(a) * r, -w.size + 20, w.size - 20), 0, clamp(z + Math.sin(a) * r, -w.size + 20, w.size - 20));
      if (w.def.land && i < 56 && !w.def.land(p.x, p.z)) continue;   // 섬 맵: 틈 위는 건너뛴다
      p.y = w.h(p.x, p.z);
      let flat = true;
      for (let k = 0; k < 6 && flat; k++) if (Math.abs(w.h(p.x + Math.cos(k * 1.047) * need, p.z + Math.sin(k * 1.047) * need) - p.y) > 2.2) flat = false;
      _a.copy(p); _a.y += need * 0.8 + 1;
      if (flat && !w.col.blocked(_a, need * 0.7)) return p;
    }
    return p;
  }

  // 몸체 충돌 상자에 주인을 붙인다: 그 상자에 맞은 탄·미사일은 주인 액터에게 피해를 준다
  own(cols, a) { for (const c of cols) c.owner = a; }

  actor(u, name, radius, hp, extra = {}) {
    const a = this.c.addProp(new THREE.Object3D(), Object.assign({ name, team: 1, radius, hp, maxHp: hp, static: true, unit: u }, extra));
    return a;
  }

  // 사거리 안에서 가장 가까운 적 (플레이어·드론)
  pick(u, from, range) {
    let best = null, bd = range;
    for (const o of this.c.actors) {
      if (!o.alive || o.static || !o.targetable || !this.c.hostile(u.root, o)) continue;
      const d = o.pos.distanceTo(from);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  laser(u, from, dir, dmg, color, speed) {
    const c = this.c;
    if (u.cut) return;
    c.fireLaser(u.root, from, dir, dmg * u.rk.dmg, color, speed);
    c.fx.muzzle(from, dir, color, 2.4);
    c.snd.play("elaser", c.volAt(from) * 0.9, c.panAt(from), 0.7);
  }
  // 조준: from → 목표 예상 위치. 흩어짐 포함한 발사 방향을 out 에
  aim(from, t, speed, spread, out, u) {
    this.c._lead(from, t, speed, out).sub(from).normalize();
    spread *= (u ? u.rk.aim : 1) * (1 + (1 - this.c.diff.aim) * 1.5);
    out.x += (Math.random() - 0.5) * spread; out.y += (Math.random() - 0.5) * spread; out.z += (Math.random() - 0.5) * spread;
    return out.normalize();
  }
  clear(from, t, u) { return this.w.col.visible(from, t.pos, 2, u || null); }   // 자기 몸체에는 가리지 않는다

  // 지상 이동: 목표점으로 몸을 돌리고 전진. 앞이 막히거나 턱이 높으면 다른 목표를 잡는다
  walk(u, dt, speed, turnRate, reach, probe) {
    const g = u.group, w = this.w;
    if (!u.goal || Math.hypot(u.goal.x - g.position.x, u.goal.z - g.position.z) < reach || u.stuck > 1.6 || (u.goalT -= dt) < 0) {
      const t = u.target, h = u.home;
      const cx = t && Math.random() < 0.6 ? (t.pos.x + h.x) / 2 : h.x, cz = t && Math.random() < 0.6 ? (t.pos.z + h.z) / 2 : h.z, a = Math.random() * 6.283, r = 10 + Math.random() * u.roam;
      u.goal = new V3(clamp(cx + Math.cos(a) * r, -w.size + 15, w.size - 15), 0, clamp(cz + Math.sin(a) * r, -w.size + 15, w.size - 15));
      u.stuck = 0; u.goalT = 14;
    }
    const want = Math.atan2(-(u.goal.x - g.position.x), -(u.goal.z - g.position.z));
    u.yaw = turn(u.yaw, want, turnRate * dt);
    g.rotation.y = u.yaw;
    if (speed <= 0 || Math.abs(wrap(want - u.yaw)) > 0.9) return 0;
    const fx = -Math.sin(u.yaw), fz = -Math.cos(u.yaw), nx = g.position.x + fx * speed * dt, nz = g.position.z + fz * speed * dt;
    const gy = w.h(nx, nz);
    _a.set(nx + fx * probe, gy + probe * 0.9 + 1, nz + fz * probe);
    if (Math.abs(gy - g.position.y) > probe * 0.25 + 0.4 || w.col.blocked(_a, probe * 0.45)) { u.stuck += dt; return 0; }
    g.position.set(nx, gy, nz); u.stuck = Math.max(0, u.stuck - dt * 0.5);
    return speed;
  }

  // 떨어져 나간 조각
  chunk(obj, vel, spin = 2) {
    obj.updateWorldMatrix(true, false);
    const p = new V3(), q = new THREE.Quaternion(), sc = new V3();
    obj.matrixWorld.decompose(p, q, sc);
    obj.removeFromParent();
    obj.position.copy(p); obj.quaternion.copy(q); obj.scale.copy(sc);
    this.w.scene.add(obj);
    this.debris.push({ obj, vel: vel.clone(), ax: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), spin, life: 9, down: false });
  }
  boom(pos, k = 1) { this.c.fx.explosion(pos, k); this.c.snd.play("explode", this.c.volAt(pos) * (0.5 + k * 0.15), this.c.panAt(pos)); this.c._blast(pos, k); }

  update(dt) {
    const c = this.c;
    for (const u of this.list) {
      u.t += dt;
      u.cut = !!this.s.mode.cut;
      for (const k in u.cool) u.cool[k] -= dt;
      if (!u.root.alive && !u.dead) { u.dead = true; u.deadT = 0; for (const p of u.parts) if (p.alive) c.kill(p, null); if (u.onDeath) u.onDeath(); }
      if (u.dead) { u.deadT += dt; if (u.dying) u.dying(dt); continue; }
      if (!u.root.targetable) continue;
      if ((u.think = (u.think || 0) - dt) <= 0) { u.think = 0.35; u.target = this.pick(u, u.root.pos, u.range); }
      u.update(dt);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (!d.down) {
        d.vel.y -= 16 * dt; d.obj.position.addScaledVector(d.vel, dt); d.obj.rotateOnAxis(d.ax, d.spin * dt);
        const gy = this.w.h(d.obj.position.x, d.obj.position.z);
        if (d.obj.position.y < gy + 0.4) { d.obj.position.y = gy + 0.4; d.down = true; c.fx.explosion(d.obj.position, 0.7); c.fx.smoke(d.obj.position, 1.6, 2, 0.12, 1.5); }
      } else if (Math.random() < dt * 3) c.fx.smoke(d.obj.position, 0.9, 1.6, 0.1, 0.6);
      if (d.life <= 0) { this.w.scene.remove(d.obj); this.debris.splice(i, 1); }
    }
  }

  dispose() {
    for (const u of this.list) this.w.scene.remove(u.group);
    for (const d of this.debris) this.w.scene.remove(d.obj);
  }
}

// ── 전차 ──────────────────────────────────────────────────
function makeTank(U, o) {
  const S = o.scale || 1, w = U.w, g = new THREE.Group(), body = lam(0x4a5a3a), dark = lam(0x23272f), red = glow(o.tc);
  const p = U.groundSpot(o.pos ? o.pos.x : 0, o.pos ? o.pos.z : 0, 30, 5 * S);
  g.position.copy(p); g.scale.setScalar(S); w.scene.add(g);
  box(g, 3.4, 1.0, 5.6, body, 0, 1.0, 0); box(g, 3.0, 0.5, 4.6, body, 0, 1.7, 0.2);
  for (const x of [-1.75, 1.75]) { box(g, 0.75, 1.0, 6.0, dark, x, 0.55, 0); for (let i = 0; i < 5; i++) cyl(g, 0.42, 0.42, 0.8, lam(0x15181e), x, 0.45, -2.3 + i * 1.15, 10).rotation.z = Math.PI / 2; }
  box(g, 3.42, 0.14, 0.3, red, 0, 1.25, -2.82);
  const tur = grp(g, 0, 2.0, 0.2); box(tur, 2.3, 0.9, 2.7, body, 0, 0.45, 0); box(tur, 0.5, 0.35, 0.7, dark, 0.6, 1.05, 0.4);
  const gun = grp(tur, 0, 0.5, -1.3); const br = cyl(gun, 0.17, 0.2, 3.8, dark, 0, 0, -1.9); br.rotation.x = Math.PI / 2; cyl(gun, 0.26, 0.26, 0.5, dark, 0, 0, -3.7).rotation.x = Math.PI / 2;
  // ── 세부: 궤도 링크·측면 치마·배기구·전조등, 포탑 해치·연막탄 발사기·센서·반응장갑·포구 제퇴기 ──
  {
    const steel = lam(0x7c8592), tr = lam(0x15181e), hz = lam(0xd9a21c), lamp = glow(0xfff0c0, 2), eye = glow(o.tc, 2.2);
    for (const x of [-1.75, 1.75]) {
      for (let i = 0; i < 12; i++) box(g, 0.8, 0.12, 0.32, tr, x, 1.08, -2.75 + i * 0.5);              // 궤도 윗면 링크
      box(g, 0.12, 0.6, 5.0, body, x * 1.1, 0.95, 0);                                                  // 측면 치마
      for (let i = 0; i < 4; i++) box(g, 0.14, 0.45, 1.05, steel, x * 1.12, 0.95, -1.8 + i * 1.2);     // 치마 판
      cyl(g, 0.5, 0.5, 0.8, tr, x, 0.5, -2.85, 10).rotation.z = Math.PI / 2; cyl(g, 0.5, 0.5, 0.8, tr, x, 0.5, 2.85, 10).rotation.z = Math.PI / 2;   // 기동륜·유동륜
    }
    for (const sx of [-1, 1]) { box(g, 0.35, 0.22, 0.12, lamp, sx * 1.25, 1.35, -2.83); box(g, 0.5, 0.35, 0.6, dark, sx * 1.1, 2.05, 2.5); cyl(g, 0.12, 0.12, 0.3, tr, sx * 1.1, 2.1, 2.85, 8).rotation.x = Math.PI / 2; }
    box(g, 2.6, 0.1, 0.4, hz, 0, 1.53, -2.6);
    vents(g, 2.0, 0.08, 4, dark, 0, 2.0, 1.8, 0.6);
    box(tur, 2.5, 0.25, 2.9, dark, 0, 0.0, 0.0);                                                       // 포탑 아랫단
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(tur, 0.25, 0.5, 0.55, steel, sx * 1.22, 0.45, -0.9 + i * 0.62);   // 반응장갑
    cyl(tur, 0.42, 0.45, 0.35, steel, -0.55, 1.05, 0.5, 12); cyl(tur, 0.36, 0.36, 0.08, dark, -0.55, 1.25, 0.5, 12);   // 해치
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) cyl(tur, 0.08, 0.08, 0.35, tr, sx * 1.05, 0.95, -1.0 + i * 0.16, 6).rotation.x = Math.PI / 2 - 0.5;   // 연막탄
    box(tur, 0.55, 0.45, 0.4, dark, 0.75, 1.2, -0.75); box(tur, 0.3, 0.18, 0.06, eye, 0.75, 1.22, -0.96);   // 조준 센서
    cyl(tur, 0.03, 0.03, 1.8, tr, -0.9, 1.8, 1.1, 4); box(tur, 0.08, 0.08, 0.08, eye, -0.9, 2.7, 1.1);       // 안테나
    box(tur, 1.0, 0.7, 0.5, dark, 0, 0.5, 1.5);                                                         // 뒤 바구니
    cyl(gun, 0.3, 0.3, 0.9, dark, 0, 0, -0.45, 10).rotation.x = Math.PI / 2;                            // 포 방순
    for (const sx of [-1, 1]) box(gun, 0.12, 0.22, 0.4, dark, sx * 0.22, 0, -3.85);                     // 제퇴기
  }
  const hit = grp(g), hitC = w.rider(hit, [[0, 1.2 * S, 0, 1.9 * S, 1.2 * S, 2.9 * S]], "enemy");
  const u = { group: g, parts: [], yaw: Math.random() * 6.28, home: p.clone(), roam: 35, range: 95, stuck: 0, goalT: 0, ty: 0, tp: 0 };
  u.root = U.actor(u, o.name || "전차", 2.9 * S, 300 * S * (o.hp || 1), { score: 250, cutR: 13 * S });
  U.own(hitC, u.root);
  const muzzle = new V3();
  u.update = (dt) => {
    U.walk(u, dt, 4.5, 0.8, 7, 3.2 * S);
    u.root.pos.copy(g.position); u.root.pos.y += 1.5 * S;
    const t = u.target;
    if (t) {
      _a.copy(t.pos).sub(u.root.pos);
      u.ty = turn(u.ty, Math.atan2(-_a.x, -_a.z) - u.yaw, 1.4 * dt); u.tp = clamp(Math.atan2(_a.y, Math.hypot(_a.x, _a.z)), -0.1, 1.0);
      tur.rotation.y = u.ty; gun.rotation.x = u.tp;
      if (!(u.cool.gun > 0) && Math.abs(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw - u.ty)) < 0.1) {
        gun.updateWorldMatrix(true, false); muzzle.set(0, 0, -4.2).applyMatrix4(gun.matrixWorld);
        if (U.clear(muzzle, t, u)) { u.cool.gun = 2.6; U.laser(u, muzzle, U.aim(muzzle, t, 75, 0.03, _b, u), 20, 0xffb84a, 75); U.c.fx.flash(muzzle, 0xffd9a0, 2.2, 0.15); }
      }
    }
  };
  u.onDeath = () => { U.chunk(tur, new V3((Math.random() - 0.5) * 6, 13, (Math.random() - 0.5) * 6), 3); g.traverse((m) => { if (m.isMesh && m.material.color) m.material = lam(0x1c1c1c); }); };
  u.dying = (dt) => { if (u.deadT < 14 && Math.random() < dt * 5) U.c.fx.smoke(_a.copy(g.position).setY(g.position.y + 1.6), 1.2, 2, 0.1, 0.8); };
  return u;
}

// ── 대공 로봇 (두 발 보행) ─────────────────────────────────
function makeAA(U, o) {
  const S = o.scale || 1, w = U.w, g = new THREE.Group(), body = lam(0x55607a), dark = lam(0x22262e), eye = glow(o.tc);
  const p = U.groundSpot(o.pos ? o.pos.x : 0, o.pos ? o.pos.z : 0, 30, 4 * S);
  g.position.copy(p); g.scale.setScalar(S); w.scene.add(g);
  const hip = grp(g, 0, 3.6, 0);
  const legs = [-1, 1].map((sx) => { const th = grp(hip, sx * 1.3, 0, 0); box(th, 0.7, 2.0, 0.9, dark, 0, -1.0, 0); const kn = grp(th, 0, -2.0, 0); box(kn, 0.55, 1.9, 0.7, body, 0, -0.85, 0.15); box(kn, 0.95, 0.3, 1.7, dark, 0, -1.75, -0.2); return { th, kn }; });
  const top = grp(hip, 0, 0.3, 0); box(top, 2.6, 1.6, 2.4, body, 0, 0.8, 0); box(top, 1.2, 0.5, 0.5, eye, 0, 1.0, -1.25); cyl(top, 0.06, 0.06, 1.6, dark, 0.9, 2.3, 0.6, 5);
  const pods = [-1, 1].map((sx) => { const pd = grp(top, sx * 1.9, 0.9, 0); box(pd, 0.8, 0.9, 1.5, dark, 0, 0, 0); for (const y of [-0.2, 0.2]) cyl(pd, 0.09, 0.09, 2.4, dark, 0, y, -1.6, 6).rotation.x = Math.PI / 2; return pd; });
  const rack = grp(top, 0, 1.9, 0.5); box(rack, 1.6, 0.6, 1.2, dark);
  // ── 세부: 관절 축, 유압 실린더, 발가락, 장갑 치마, 센서 돔, 배기구, 경고등 ──
  {
    const metal = lam(0x8a93a3), steel = lam(0x3a404c), hazard = lam(0xd9a21c);
    cyl(hip, 0.32, 0.32, 2.4, steel, 0, 0, 0, 12).rotation.z = Math.PI / 2;                 // 골반 축
    box(hip, 1.6, 0.8, 1.6, dark, 0, -0.35, 0);
    legs.forEach(({ th, kn }, i) => {
      const sx = i ? 1 : -1;
      cyl(th, 0.5, 0.5, 0.9, metal, 0, 0, 0, 12).rotation.z = Math.PI / 2;                  // 엉덩 관절 캡
      box(th, 0.85, 1.1, 0.25, body, 0, -0.9, -0.5);                                       // 허벅지 앞 장갑
      piston(th, [sx * 0.42, -0.3, 0.42], [sx * 0.42, -1.9, 0.3], 0.13, steel, metal);
      cyl(kn, 0.42, 0.42, 0.8, metal, 0, 0, 0, 12).rotation.z = Math.PI / 2;                // 무릎 축
      box(kn, 0.75, 0.55, 0.3, body, 0, -0.15, -0.4);                                      // 무릎 덮개
      piston(kn, [0, -0.3, 0.55], [0, -1.5, 0.45], 0.11, steel, metal);
      for (const tx of [-0.32, 0.32]) box(kn, 0.26, 0.22, 0.7, steel, tx, -1.82, -1.2);    // 앞 발가락
      box(kn, 0.4, 0.22, 0.5, steel, 0, -1.82, 0.75);                                      // 뒷꿈치
    });
    box(top, 2.8, 0.35, 2.6, dark, 0, 0.05, 0);                                            // 몸통 아랫단
    box(top, 2.2, 0.2, 2.0, metal, 0, 1.7, 0);                                             // 윗단 테
    vents(top, 1.6, 0.9, 4, dark, 0, 0.85, 1.22);                                          // 뒤 환기구
    for (const sx of [-1, 1]) { box(top, 0.3, 1.0, 1.9, body, sx * 1.38, 0.8, 0); box(top, 0.08, 0.5, 0.08, hazard, sx * 1.38, 1.45, -0.85); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel); dome.position.set(-0.7, 1.6, -0.6); top.add(dome);
    box(top, 0.5, 0.18, 0.1, eye, -0.7, 1.75, -0.98);
    cyl(top, 0.05, 0.05, 0.5, dark, 0.9, 3.2, 0.6, 5); box(top, 0.12, 0.12, 0.12, eye, 0.9, 3.45, 0.6);   // 안테나 끝 경고등
    for (const sx of [-1, 1]) cyl(top, 0.17, 0.22, 0.5, steel, sx * 0.55, 1.1, 1.38, 8).rotation.x = Math.PI / 2;   // 배기구
    pods.forEach((pd, i) => { box(pd, 0.9, 0.18, 1.1, metal, 0, 0.53, 0.1); box(pd, 0.06, 0.6, 1.2, hazard, (i ? 1 : -1) * 0.43, 0, 0.05); cyl(pd, 0.16, 0.16, 0.25, steel, 0, 0.05, -2.75, 8).rotation.x = Math.PI / 2; });
    for (let k = 0; k < 4; k++) cyl(rack, 0.17, 0.17, 0.06, steel, -0.55 + k * 0.37, 0.31, 0, 8);   // 미사일 덮개
  }
  const hit = grp(g), hitC = w.rider(hit, [[0, 4.4 * S, 0, 1.5 * S, 1.1 * S, 1.4 * S]], "enemy");
  const u = { group: g, parts: [], yaw: Math.random() * 6.28, home: p.clone(), roam: 30, range: 110, stuck: 0, goalT: 0, ty: 0, ph: 0, burst: 0 };
  u.root = U.actor(u, o.name || "대공 로봇", 2.5 * S, 230 * S * (o.hp || 1), { score: 250, cutR: 14 * S });
  U.own(hitC, u.root);
  const mz = new V3();
  u.update = (dt) => {
    const v = U.walk(u, dt, 3.2, 1.2, 6, 2.6 * S);
    u.ph += dt * (v > 0 ? 5 : 0);
    legs.forEach((l, i) => { const a = Math.sin(u.ph + i * Math.PI) * (v > 0 ? 0.5 : 0); l.th.rotation.x = a; l.kn.rotation.x = Math.max(0, -a) * 1.2; });
    hip.position.y = 3.6 + Math.abs(Math.sin(u.ph)) * 0.12;
    u.root.pos.copy(g.position); u.root.pos.y += 4.4 * S;
    const t = u.target;
    if (!t) return;
    _a.copy(t.pos).sub(u.root.pos);
    const want = Math.atan2(-_a.x, -_a.z) - u.yaw, pit = clamp(Math.atan2(_a.y, Math.hypot(_a.x, _a.z)), -0.3, 1.35);
    u.ty = turn(u.ty, want, 2.4 * dt); top.rotation.y = u.ty; for (const pd of pods) pd.rotation.x = pit;
    if (Math.abs(wrap(want - u.ty)) > 0.12) return;
    if (!(u.cool.gun > 0)) {
      if (u.burst <= 0) u.burst = 6;
      const pd = pods[u.burst % 2]; pd.updateWorldMatrix(true, false); mz.set(0, 0, -3).applyMatrix4(pd.matrixWorld);
      if (U.clear(mz, t, u)) { U.laser(u, mz, U.aim(mz, t, 110, 0.05, _b, u), 5, 0xff5a3a, 110); u.burst--; u.cool.gun = u.burst > 0 ? 0.1 : 2.2; } else { u.burst = 0; u.cool.gun = 0.6; }
    }
    if (!(u.cool.msl > 0) && _a.length() > 28) { u.cool.msl = 7.5; rack.updateWorldMatrix(true, false); mz.set(0, 0.8, 0).applyMatrix4(rack.matrixWorld); if (!u.cut) U.c.fireMissile(u.root, mz, _b.set(0, 1, 0).addScaledVector(_a.normalize(), 0.6).normalize(), t, 26); }
  };
  u.onDeath = () => { for (const pd of pods) U.chunk(pd, new V3((Math.random() - 0.5) * 8, 8, (Math.random() - 0.5) * 8)); hit.visible = false; };
  u.dying = (dt) => {   // 무릎이 꺾이며 앞으로 고꾸라진다
    const k = Math.min(1, u.deadT / 0.9), e = k * k;
    hip.position.y = 3.6 - 2.3 * e; hip.rotation.x = -1.1 * e; for (const l of legs) { l.th.rotation.x = 0.9 * e; l.kn.rotation.x = 1.5 * e; }
    if (k >= 1 && !u.fell) { u.fell = true; U.boom(_a.copy(g.position).setY(g.position.y + 1.5), 1.6); }
    if (u.deadT < 12 && Math.random() < dt * 4) U.c.fx.smoke(_a.copy(g.position).setY(g.position.y + 1.5), 1.1, 2, 0.1, 0.8);
  };
  return u;
}

// ── 공중 전투함 · 순양함 ───────────────────────────────────
// 전투함 선체: 뾰족한 이물의 압출 선체 + 용골 + 상갑판 + 함교(창문 띠) + 마스트·레이더 + 엔진 노즐 + 측면 장갑·발광선·항행등
function hullShape(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}
function shipSlab(g, outline, h, y, m, bevel = 0.35) {
  const geo = new THREE.ExtrudeGeometry(hullShape(outline), { depth: Math.max(0.05, h - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 6 });
  geo.translate(0, 0, -(h - 2 * bevel) / 2); geo.rotateX(-Math.PI / 2);
  const me = new THREE.Mesh(geo, m); me.position.y = y; g.add(me); return me;
}
function shipHull(g, Lh, Wd, Ht, big, hullM, dark, trim, eng, u) {
  const W2 = Wd / 2, steel = lam(0x8a93a3), deck = lam(big ? 0x2c3342 : 0x343b4a), win = glow(0xffe0a0, 1.8), red = glow(0xff3030, 2.4), hazard = lam(0xd9a21c);
  // 주 선체 (위에서 본 외곽선: 앞이 뾰족)
  const main = [[0, -Lh * 0.64], [W2 * 0.55, -Lh * 0.48], [W2, -Lh * 0.26], [W2, Lh * 0.4], [W2 * 0.85, Lh * 0.5], [-W2 * 0.85, Lh * 0.5], [-W2, Lh * 0.4], [-W2, -Lh * 0.26], [-W2 * 0.55, -Lh * 0.48]];
  shipSlab(g, main, Ht, 0, hullM);
  // 용골 (아래로 좁아지는 배)
  shipSlab(g, main.map(([x, z]) => [x * 0.7, z * 0.92]), Ht * 0.5, -Ht * 0.6, dark);
  shipSlab(g, main.map(([x, z]) => [x * 0.35, z * 0.8]), Ht * 0.35, -Ht * 0.95, hullM, 0.2);
  // 갑판 판 (살짝 어두운 색) + 이물 쪽 경사판
  shipSlab(g, main.map(([x, z]) => [x * 0.92, z * 0.95]), 0.25, Ht * 0.52, deck, 0.08);
  // 측면 발광선 두 줄 + 항행등 줄
  for (const sx of [-1, 1]) {
    box(g, 0.18, 0.28, Lh * 0.62, trim, sx * (W2 + 0.05), -Ht * 0.15, Lh * 0.06);
    box(g, 0.12, 0.14, Lh * 0.5, trim, sx * (W2 * 0.72 + 0.05), -Ht * 0.68, Lh * 0.05);
    for (let k = 0; k < (big ? 9 : 6); k++) box(g, 0.25, 0.25, 0.25, k % 3 ? win : red, sx * (W2 + 0.1), Ht * 0.25, -Lh * 0.2 + k * (Lh * 0.62) / (big ? 9 : 6));
    // 측면 장갑판(겹판) + 스폰슨
    for (let k = 0; k < 3; k++) box(g, 0.4, Ht * 0.55, Lh * 0.17, steel, sx * (W2 + 0.2), Ht * 0.05, -Lh * 0.12 + k * Lh * 0.19);
    const sp = box(g, Wd * 0.55, 0.6, Lh * 0.24, hullM, sx * (W2 + Wd * 0.2), -Ht * 0.35, Lh * 0.24); sp.rotation.z = sx * -0.2;
    box(g, Wd * 0.4, 0.15, Lh * 0.2, hazard, sx * (W2 + Wd * 0.22), -Ht * 0.18, Lh * 0.24).rotation.z = sx * -0.2;
  }
  // 이물 장식: 뾰족 장갑 + 센서 띠
  box(g, 0.25, 0.12, Lh * 0.14, trim, 0, Ht * 0.68, -Lh * 0.46);
  box(g, Wd * 0.5, Ht * 0.25, 0.3, dark, 0, Ht * 0.1, -Lh * 0.47);
  // 미사일 발사관 격자 (앞갑판)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) box(g, 0.7, 0.18, 0.7, dark, (i - 0.5) * 1.1, Ht * 0.68, -Lh * (big ? 0.2 : 0.12) + (j - 1.5) * 0.95);
  // 상부 구조물: 2단 데크 + 함교 (경사진 앞면 + 창문 띠)
  const sz = Lh * 0.12;
  box(g, Wd * 0.62, Ht * 0.7, Lh * 0.24, hullM, 0, Ht * 0.95, sz);
  box(g, Wd * 0.5, Ht * 0.6, Lh * 0.16, hullM, 0, Ht * 1.55, sz + Lh * 0.01);
  const br = box(g, Wd * 0.44, Ht * 0.5, Lh * 0.06, hullM, 0, Ht * 2.0, sz - Lh * 0.05); br.rotation.x = 0.35;
  box(g, Wd * 0.42, 0.28, 0.12, win, 0, Ht * 2.05, sz - Lh * 0.075).rotation.x = 0.35;          // 함교 창
  for (const sx of [-1, 1]) box(g, 0.12, 0.25, Lh * 0.18, win, sx * Wd * 0.31, Ht * 1.05, sz);       // 옆 창문 띠
  vents(g, Wd * 0.4, Ht * 0.4, 4, dark, 0, Ht * 1.5, sz + Lh * 0.09, 0.2);
  // 마스트 + 가로대 + 회전 레이더 + 경고등 + 안테나
  const mast = grp(g, 0, Ht * 2.2, sz + Lh * 0.03);
  cyl(mast, 0.18, 0.28, Ht * 1.4, steel, 0, Ht * 0.7, 0, 8);
  box(mast, Wd * 0.45, 0.14, 0.14, steel, 0, Ht * 1.0, 0); box(mast, Wd * 0.3, 0.12, 0.12, steel, 0, Ht * 1.3, 0);
  u.radar = grp(mast, 0, Ht * 1.45, 0);
  box(u.radar, Wd * 0.38, 0.5, 0.12, steel, 0, 0.25, 0); box(u.radar, Wd * 0.36, 0.15, 0.14, trim, 0, 0.45, -0.02);
  u.beacon = box(mast, 0.3, 0.3, 0.3, red, 0, Ht * 1.75, 0);
  for (const sx of [-1, 1]) { cyl(mast, 0.04, 0.04, 2.4, dark, sx * Wd * 0.2, Ht * 1.15, 0, 4).rotation.z = sx * 0.3; box(mast, 0.12, 0.12, 0.12, win, sx * Wd * 0.22, Ht * 1.0, 0); }
  // 뒷갑판: 착함 표시 + 격납고 문
  box(g, Wd * 0.7, Ht * 0.65, 0.2, dark, 0, Ht * 0.1, Lh * 0.505);
  for (let k = 0; k < 3; k++) box(g, Wd * 0.66, 0.06, 0.22, steel, 0, -Ht * 0.12 + k * Ht * 0.18, Lh * 0.51);
  // 엔진: 큰 노즐 셋(가운데) + 옆 포드 둘
  const nz = Lh * 0.5;
  for (const [ex, ey, r] of [[0, 0.2, Ht * 0.32], [-W2 * 0.5, -Ht * 0.2, Ht * 0.24], [W2 * 0.5, -Ht * 0.2, Ht * 0.24]]) {
    cyl(g, r * 1.15, r * 1.3, 2.2, dark, ex, ey, nz + 0.6, 12).rotation.x = Math.PI / 2;
    cyl(g, r * 1.32, r * 1.32, 0.3, steel, ex, ey, nz + 1.7, 12).rotation.x = Math.PI / 2;
    cyl(g, r * 0.9, r * 0.9, 0.2, eng, ex, ey, nz + 1.75, 12).rotation.x = Math.PI / 2;
    cyl(g, r * 0.45, r * 0.45, 0.25, glow(0xffffff, 2.2), ex, ey, nz + 1.8, 10).rotation.x = Math.PI / 2;
  }
  for (const sx of [-1, 1]) {
    const px = sx * (W2 + Wd * 0.38);
    cyl(g, 1.0, 1.15, Lh * 0.22, dark, px, -Ht * 0.45, Lh * 0.3, 12).rotation.x = Math.PI / 2;
    cyl(g, 1.05, 1.05, 0.3, trim, px, -Ht * 0.45, Lh * 0.2, 12).rotation.x = Math.PI / 2;
    cyl(g, 0.75, 0.75, 0.2, eng, px, -Ht * 0.45, Lh * 0.41 + 0.05, 12).rotation.x = Math.PI / 2;
  }
}

function makeShip(U, o, big) {
  const w = U.w, g = new THREE.Group(), hullM = lam(big ? 0x3a4458 : 0x4a5568), dark = lam(0x1f2430), trim = glow(o.tc, 1.8), eng = glow(0x5ad8ff, 2.6);
  const Lh = big ? 46 : 28, Wd = big ? 9 : 6.5, Ht = big ? 5 : 4;
  const home = o.home || o.pos || new V3(0, 0, 0), alt = Math.max(w.h(home.x, home.z) + (big ? 46 : 36), (o.pos ? o.pos.y : 0));
  const u = { group: g, parts: [], home: new V3(home.x, Math.min(alt, w.ceiling - 12), home.z), ang: Math.random() * 6.28, R: Math.min(w.size * 0.45, big ? 85 : 65), range: 130, yaw: 0 };
  w.scene.add(g);
  shipHull(g, Lh, Wd, Ht, big, hullM, dark, trim, eng, u);
  const hit = grp(g), hitC = w.rider(hit, [[0, 0, 0, Wd * 0.5, Ht * 0.5, Lh * 0.4], [0, Ht * 0.9, Lh * 0.12, Wd * 0.25, Ht * 0.5, Lh * 0.08], [0, 0, -Lh * 0.44, Wd * 0.36, Ht * 0.4, Lh * 0.11]], "enemy");
  u.root = U.actor(u, o.name || (big ? "순양함" : "전투함"), big ? 9 : 6.5, (big ? 1300 : 650) * (o.hp || 1), { score: big ? 1500 : 700, armor: 0.6, cutR: big ? 52 : 36 });
  U.own(hitC, u.root);   // 선체 어디를 맞혀도 본체 피해 (함포가 남아 있는 동안은 장갑 0.6배)
  // 포탑(부위): 갑판 위·아래
  const slots = big ? [[0, 1, -0.32], [0, 1, -0.1], [0, -1, -0.2], [0, -1, 0.15], [0, 1, 0.3]] : [[0, 1, -0.25], [0, -1, 0], [0, 1, 0.3]];
  u.turrets = slots.map(([x, sy, z], i) => {
    const tg = grp(g, x, sy * (Ht * 0.5 + 0.1), z * Lh); if (sy < 0) tg.rotation.z = Math.PI;
    const base = grp(tg); cyl(base, 1.3, 1.5, 0.7, dark, 0, 0.35, 0, 10);
    const head = grp(tg, 0, 0.9, 0); box(head, 1.7, 0.9, 1.9, hullM); const gun = grp(head, 0, 0, -0.8);
    for (const bx of [-0.35, 0.35]) cyl(gun, 0.11, 0.11, 2.6, dark, bx, 0, -1.3, 6).rotation.x = Math.PI / 2;
    const a = U.actor(u, "함포", 1.9, 130 * (o.hp || 1), { score: 120 });
    u.parts.push(a);
    return { a, tg, head, gun, yaw: 0, cool: 1 + i * 0.4, sy };
  });
  const mz = new V3(), tw = new V3(), inv = new THREE.Matrix4(), probe = new V3();
  // 지금 자리와 조금 앞 궤도에서 선체가 지형·건물에 닿지 않는 가장 낮은 고도 (자기 몸체 상자는 무시)
  const safeAlt = (ang) => {
    const px = u.home.x + Math.cos(ang) * u.R, pz = u.home.z + Math.sin(ang) * u.R, yaw = Math.atan2(Math.sin(ang), -Math.cos(ang));
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), top = w.ceiling - Ht - 6;
    let y = u.home.y;
    for (let k = -2; k <= 2; k++) {
      const sx = px + fx * k * Lh * 0.27, sz = pz + fz * k * Lh * 0.27;
      y = Math.max(y, w.h(sx, sz) + Ht * 1.6 + 6);
      w.col.skip = u;
      for (let n = 0; n < 24 && y < top; n++) { probe.set(sx, y, sz); if (!w.col.blocked(probe, Wd * 0.75 + Ht * 0.5)) break; y += 2.5; }
      w.col.skip = null;
    }
    return Math.min(y, top);
  };
  u.alt = safeAlt(u.ang);
  u.update = (dt) => {
    u.ang += (5.5 / u.R) * dt;
    const px = u.home.x + Math.cos(u.ang) * u.R, pz = u.home.z + Math.sin(u.ang) * u.R;
    if ((u.altT = (u.altT || 0) - dt) <= 0) { u.altT = 0.3; u.altWant = Math.max(safeAlt(u.ang), safeAlt(u.ang + 18 / u.R), safeAlt(u.ang + 36 / u.R)); }
    u.alt += clamp(u.altWant - u.alt, -6 * dt, 9 * dt);   // 앞에 산·건물이 있으면 미리 떠오르고, 지나가면 천천히 내려온다
    g.position.set(px, u.alt + Math.sin(u.t * 0.4) * 2, pz);
    u.yaw = Math.atan2(Math.sin(u.ang), -Math.cos(u.ang)); g.rotation.set(0, u.yaw, Math.sin(u.t * 0.5) * 0.04 - 0.06);
    if (u.radar) { u.radar.rotation.y += dt * 1.6; u.beacon.visible = Math.sin(u.t * 5) > 0.3; }
    u.root.pos.copy(g.position);
    const alive = u.turrets.filter((t) => t.a.alive).length;
    u.root.armor = alive ? 0.6 : 1;
    const t = u.target;
    g.updateWorldMatrix(true, true);
    for (const tr of u.turrets) {
      if (!tr.a.alive) { if (!tr.gone) { tr.gone = true; U.chunk(tr.head, new V3((Math.random() - 0.5) * 8, 4, (Math.random() - 0.5) * 8)); } if (Math.random() < dt * 2) U.c.fx.smoke(tr.a.pos, 0.9, 1.6, 0.1, 0.5); continue; }
      tr.a.pos.setFromMatrixPosition(tr.head.matrixWorld);
      tr.cool -= dt;
      if (!t) continue;
      // 포탑 기준 좌표로 목표 방향을 구해 돌린다
      inv.copy(tr.tg.matrixWorld).invert(); tw.copy(t.pos).applyMatrix4(inv);
      if (tw.y < -1.5) continue;                                   // 갑판 반대편은 못 쏜다
      tr.yaw = turn(tr.yaw, Math.atan2(-tw.x, -tw.z), 2.2 * dt); tr.head.rotation.y = tr.yaw;
      tr.gun.rotation.x = clamp(Math.atan2(tw.y - 0.9, Math.hypot(tw.x, tw.z)), -0.05, 1.3);
      if (tr.cool <= 0 && Math.abs(wrap(Math.atan2(-tw.x, -tw.z) - tr.yaw)) < 0.12) {
        tr.gun.updateWorldMatrix(true, false); mz.set(0, 0, -3).applyMatrix4(tr.gun.matrixWorld);
        if (U.clear(mz, t, u)) { tr.cool = 1.5; U.laser(u, mz, U.aim(mz, t, 100, 0.045, _b, u), 7, 0xff4a5a, 100); } else tr.cool = 0.5;
      }
    }
    if (big && t && !(u.cool.msl > 0)) { u.cool.msl = 6.5; for (const sx of [-1, 1]) { mz.set(sx * Wd * 0.4, Ht * 0.7, -Lh * 0.1).applyMatrix4(g.matrixWorld); if (!u.cut) U.c.fireMissile(u.root, mz, _b.set(sx * 0.4, 1, 0).normalize(), t, 28); } }
  };
  u.onDeath = () => { u.vy = 0; u.rollV = (Math.random() < 0.5 ? -1 : 1) * 0.35; U.boom(g.position, 3); };
  u.dying = (dt) => {   // 불타며 기울어 추락
    if (u.sunk) return;
    u.vy -= 7 * dt; g.position.y += u.vy * dt; g.rotation.z += u.rollV * dt; g.rotation.x -= 0.12 * dt;
    g.position.x += -Math.sin(u.yaw) * 4 * dt; g.position.z += -Math.cos(u.yaw) * 4 * dt;
    if (Math.random() < dt * 5) { _a.set((Math.random() - 0.5) * Wd, (Math.random() - 0.5) * Ht, (Math.random() - 0.5) * Lh * 0.8).applyQuaternion(g.quaternion).add(g.position); U.c.fx.explosion(_a, 1.2); U.c.fx.smoke(_a, 2.2, 2.4, 0.1, 2); }
    if (g.position.y < w.h(g.position.x, g.position.z) + Ht * 0.4) { u.sunk = true; U.boom(g.position, 5); g.visible = false; hit.visible = false; }
  };
  return u;
}

// ── 거대로봇 ───────────────────────────────────────────────
// 부위: 머리(센서) · 왼팔(레이저 포) · 오른팔(미사일 포드) · 양다리 · 몸통 코어(본체)
// 머리가 살아 있으면 코어가 단단하다. 팔을 부수면 그 무기가 사라지고, 다리를 부수면 무릎을 꿇어 느려지다 주저앉는다
function makeMech(U, o) {
  const S = o.scale || 1, w = U.w, c = U.c, g = new THREE.Group();
  const armor = lamB(0x5a6478), plate = lamB(0x7a869c), dark = lamB(0x20242c), red = glow(o.tc), core = glow(0xffb02e, 2.4), eye = glow(o.tc, 2.6);
  const p = U.groundSpot(o.pos ? o.pos.x : 0, o.pos ? o.pos.z : 0, 45, 9 * S);
  g.position.copy(p); g.scale.setScalar(S); w.scene.add(g);
  const HIP = 11;
  const pelvis = grp(g, 0, HIP, 0); box(pelvis, 5.2, 2.2, 3.4, dark, 0, 0, 0); box(pelvis, 2, 2.6, 1.2, armor, 0, -1.2, -1.6);
  const legs = [-1, 1].map((sx) => {
    const th = grp(pelvis, sx * 2.3, -0.4, 0); box(th, 2.0, 5.4, 2.4, armor, 0, -2.7, 0); box(th, 2.3, 1.6, 2.7, plate, 0, -1.2, -0.1);
    const kn = grp(th, 0, -5.4, 0); cyl(kn, 1.3, 1.3, 2.5, dark, 0, 0, 0, 10).rotation.z = Math.PI / 2;
    const shin = grp(kn); box(shin, 1.8, 4.8, 2.2, armor, 0, -2.6, 0.2); box(shin, 2.1, 2.4, 0.5, plate, 0, -2.2, -1.1); box(shin, 2.6, 0.9, 4.2, dark, 0, -5.0, -0.5);
    return { sx, th, kn, shin, down: false };
  });
  const waist = grp(pelvis, 0, 1.4, 0); cyl(waist, 1.5, 1.9, 1.4, dark, 0, 0.4, 0, 10);
  box(waist, 7.2, 6.4, 4.4, armor, 0, 4.6, 0); box(waist, 5.4, 3, 0.8, plate, 0, 5.6, -2.4); box(waist, 3.2, 3.4, 2.2, dark, 0, 5, 2.6);
  const coreM = box(waist, 2.2, 2.2, 0.5, core, 0, 3.4, -2.35);
  for (const sx of [-1, 1]) { box(waist, 2.6, 2.4, 3.6, plate, sx * 4.7, 6.6, 0); box(waist, 0.3, 0.3, 4.6, red, sx * 3.75, 7.9, 0); }
  const head = grp(waist, 0, 8.6, -0.3); box(head, 2.6, 2.2, 2.6, plate); box(head, 2.0, 0.5, 0.3, eye, 0, 0.2, -1.35); cyl(head, 0.06, 0.06, 2.2, dark, 0.9, 2, 0.6, 5);
  const arms = [-1, 1].map((sx) => {
    const sh = grp(waist, sx * 5.2, 6.4, 0); box(sh, 1.8, 4.6, 2.0, armor, 0, -2.3, 0);
    const fore = grp(sh, 0, -4.6, 0);
    if (sx < 0) { box(fore, 2.2, 2.4, 6.2, dark, 0, -0.6, -2.4); cyl(fore, 0.55, 0.7, 2.4, plate, 0, -0.6, -6.2, 8).rotation.x = Math.PI / 2; box(fore, 0.4, 0.4, 5.6, red, 1.15, -0.6, -2.4); }
    else { box(fore, 2.8, 2.8, 4.6, dark, 0, -0.6, -1.6); for (const mx of [-0.7, 0.7]) for (const my of [-1.2, 0]) cyl(fore, 0.42, 0.42, 0.5, red, mx, my, -4.0, 8).rotation.x = Math.PI / 2; }
    return { sx, sh, fore, pitch: 0 };
  });
  // ── 세부: 관절·유압·발가락·흉부 환기구·등 추진기·어깨 장갑·머리 바이저 ──
  {
    const metal = lamB(0x8f98a8), steel = lamB(0x343a45), hazard = lamB(0xd9a21c), thr = glow(0x7fd8ff, 2.0);
    cyl(pelvis, 1.0, 1.0, 5.6, steel, 0, -0.2, 0, 14).rotation.z = Math.PI / 2;              // 고관절 축
    for (const sx of [-1, 1]) box(pelvis, 1.4, 2.2, 3.0, armor, sx * 3.3, -0.9, 0).rotation.z = sx * 0.12;   // 허리 치마 장갑
    box(pelvis, 2.4, 1.6, 1.2, plate, 0, -0.9, 1.7);
    legs.forEach((l) => {
      const { th, kn, shin, sx } = l;
      cyl(th, 1.15, 1.15, 2.7, metal, 0, 0, 0, 14).rotation.z = Math.PI / 2;                 // 엉덩 관절 캡
      box(th, 2.5, 2.2, 0.5, plate, 0, -3.4, -1.25);                                         // 허벅지 앞판
      vents(th, 1.5, 1.4, 3, dark, 0, -4.2, 1.25, 0.2);
      piston(th, [sx * 1.15, -0.8, 1.1], [sx * 1.15, -5.0, 0.8], 0.32, steel, metal);
      cyl(kn, 1.45, 1.45, 0.4, metal, sx * 1.35, 0, 0, 14).rotation.z = Math.PI / 2;         // 무릎 축 덮개
      box(shin, 2.2, 1.6, 1.0, plate, 0, -0.5, -1.1).rotation.x = -0.25;                    // 무릎 보호대
      piston(shin, [0, -0.8, 1.4], [0, -4.0, 1.1], 0.3, steel, metal);
      box(shin, 2.3, 0.35, 2.5, hazard, 0, -4.35, 0.2);                                      // 발목 경고 띠
      for (const tx of [-0.85, 0, 0.85]) box(shin, 0.7, 0.75, 1.6, steel, tx, -5.15, -2.9);  // 발가락 셋
      box(shin, 1.4, 0.75, 1.2, steel, 0, -5.15, 1.9);                                        // 뒤꿈치
    });
    cyl(waist, 1.25, 1.25, 1.8, metal, 0, 1.2, 0, 14);                                       // 허리 회전부
    vents(waist, 3.6, 1.6, 4, dark, 0, 6.2, -2.4, 0.3);                                       // 흉부 환기구
    box(waist, 6.6, 0.4, 4.0, dark, 0, 1.5, 0); box(waist, 7.4, 0.5, 4.6, metal, 0, 7.9, 0);  // 몸통 위·아래 테
    for (const sx of [-1, 1]) { box(waist, 0.35, 4.6, 3.2, plate, sx * 3.75, 4.4, 0); box(waist, 0.15, 1.8, 0.15, hazard, sx * 3.0, 2.2, -2.3); }
    // 등 추진기 팩
    box(waist, 4.4, 4.2, 1.8, dark, 0, 5.2, 3.3);
    for (const sx of [-1, 1]) { cyl(waist, 0.7, 0.95, 1.6, steel, sx * 1.3, 3.0, 3.6, 12); cyl(waist, 0.55, 0.55, 0.15, thr, sx * 1.3, 2.15, 3.6, 12); }
    vents(waist, 3.2, 1.6, 3, steel, 0, 6.4, 4.25, 0.2);
    // 머리: 바이저 테·턱 장갑·볏·센서
    box(head, 2.9, 0.4, 2.9, armor, 0, 1.2, 0); box(head, 2.3, 0.9, 0.5, dark, 0, -0.7, -1.2);
    box(head, 0.35, 1.0, 2.4, armor, 0, 1.6, 0.1); box(head, 2.4, 0.7, 0.15, dark, 0, 0.2, -1.32);
    for (const sx of [-1, 1]) cyl(head, 0.35, 0.35, 0.5, steel, sx * 1.45, 0, 0.2, 10).rotation.z = Math.PI / 2;
    cyl(head, 0.04, 0.04, 1.2, dark, -0.9, 1.9, 0.6, 5); box(head, 0.14, 0.14, 0.14, eye, 0.9, 3.15, 0.6);
    // 어깨 장갑·팔 유압
    arms.forEach((a) => {
      const { sh, fore, sx } = a;
      cyl(sh, 1.2, 1.2, 2.3, metal, 0, 0, 0, 14).rotation.z = Math.PI / 2;
      box(sh, 2.6, 1.0, 3.0, armor, sx * 0.25, 1.15, 0).rotation.z = -sx * 0.18;           // 어깨 덮개 위
      box(sh, 0.5, 2.6, 2.6, plate, sx * 1.15, 0.0, 0);                                     // 어깨 옆판
      box(sh, 0.12, 2.0, 0.12, hazard, sx * 1.42, 0.2, -1.0);
      piston(sh, [0, -0.6, 1.15], [0, -4.0, 1.0], 0.26, steel, metal);
      cyl(fore, 0.95, 0.95, 2.5, metal, 0, 0, 0, 12).rotation.z = Math.PI / 2;               // 팔꿈치
      box(fore, 0.3, 1.8, 3.6, plate, sx * 1.35, -0.6, -2.0);
    });
    // 어깨 위 미사일 포드 + 몸통 발광선
    const seam = glow(o.tc, 2.0);
    for (const sx of [-1, 1]) {
      const px = sx * 3.0, py = 9.1, pz = 0.8;   // 그룹 대신 메시로 (진영 장식이 그룹 위치로 부위를 찾으므로)
      box(waist, 1.6, 1.2, 2.2, armor, px, py, pz); box(waist, 1.65, 0.12, 2.25, hazard, px, py + 0.62, pz);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) cyl(waist, 0.22, 0.22, 0.1, dark, px - 0.35 + i * 0.7, py + 0.2 - j * 0.45, pz - 1.12, 8).rotation.x = Math.PI / 2;
      box(waist, 0.12, 3.6, 0.12, seam, sx * 2.1, 4.6, -2.15);
    }
    box(waist, 3.0, 0.12, 0.12, seam, 0, 2.6, -2.2);
  }
  // 충돌 상자: 몸통·골반·다리 (도우미 물체가 보이는 동안만 유효)
  const hitT = grp(waist, 0, 4.6, 0), hitP = grp(pelvis), hitL = legs.map((l) => grp(l.th, 0, -5, 0));
  const colT = [...w.rider(hitT, [[0, 0, 0, 3.5 * S, 3.1 * S, 2.1 * S]], "enemy"), ...w.rider(hitP, [[0, 0, 0, 2.5 * S, 1.1 * S, 1.6 * S]], "enemy")];
  const colL = hitL.map((h) => w.rider(h, [[0, 0, 0, 1.0 * S, 5 * S, 1.2 * S]], "enemy"));

  const hp = (o.hp || 1) * S;
  const u = { group: g, parts: [], yaw: Math.random() * 6.28, home: p.clone(), roam: 50, range: 150, stuck: 0, goalT: 0, wy: 0, ph: 0, stag: 0, kneel: 0, lean: 0, burst: 0, legsDown: 0 };
  u.root = U.actor(u, o.name || "거대로봇", 4.2 * S, 900 * hp, { score: 3000, armor: 0.35, cutR: 34 * S });
  const P = {
    head: U.actor(u, "머리 센서", 2.3 * S, 220 * hp, { score: 200 }),
    armL: U.actor(u, "레이저 팔", 2.7 * S, 280 * hp, { score: 250 }), armR: U.actor(u, "미사일 팔", 2.7 * S, 280 * hp, { score: 250 }),
    legL: U.actor(u, "왼다리", 2.8 * S, 320 * hp, { score: 250 }), legR: U.actor(u, "오른다리", 2.8 * S, 320 * hp, { score: 250 }),
  };
  u.parts.push(P.head, P.armL, P.armR, P.legL, P.legR);
  U.own(colT, u.root); U.own(colL[0], P.legL); U.own(colL[1], P.legR);   // 몸통 상자 → 본체, 다리 상자 → 그 다리
  const mz = new V3(), wp = new V3();
  const stagger = (k = 1) => { u.stag = Math.max(u.stag, k); c.snd.play("bigkill", c.volAt(u.root.pos) * 0.7, c.panAt(u.root.pos), 0.6); };
  const broke = (part, fn) => { if (!part.alive && !part.gone) { part.gone = true; fn(); stagger(1); c.s.hud.toast(`${u.root.name} — ${part.name} 파괴!`, "#ffd24a", 1.6, 22); } };

  u.update = (dt) => {
    // 부위 파괴 → 동작 변화
    broke(P.head, () => { U.chunk(head, new V3((Math.random() - 0.5) * 6, 12, 6)); u.root.armor = 1; c.s.hud.toast("코어 노출 — 몸통을 공격하세요!", "#35ff7a", 2.2, 24); });
    arms.forEach((a, i) => broke(i ? P.armR : P.armL, () => U.chunk(a.fore, new V3(a.sx * 7, 5, (Math.random() - 0.5) * 5), 2.5)));
    legs.forEach((l, i) => broke(i ? P.legR : P.legL, () => { l.down = true; u.legsDown++; U.chunk(l.shin, new V3(l.sx * 4, 3, 3), 1.5); U.boom(_a.setFromMatrixPosition(l.kn.matrixWorld), 1.5); }));
    const n = u.legsDown, spd = n === 0 ? 4 : n === 1 ? 1.3 : 0;
    const v = U.walk(u, dt, spd, n === 2 ? 0.25 : 0.5, 12, 7 * S);
    // 걷기: 다리를 번갈아 내딛고 골반이 출렁인다. 발 디딜 때 땅이 울린다
    const pph = u.ph; u.ph += dt * (v > 0 ? (n ? 1.1 : 1.7) : 0);
    if (v > 0 && Math.floor(u.ph / Math.PI) !== Math.floor(pph / Math.PI)) { c._blast(g.position, 0.9); c.snd.play("explode", c.volAt(g.position) * 0.35, c.panAt(g.position), 0.5); c.fx.smoke(g.position, 2, 1.4, 0.3, 3); }
    legs.forEach((l, i) => {
      const sw = Math.sin(u.ph + i * Math.PI) * (v > 0 ? 0.42 : 0);
      l.th.rotation.x += ((l.down ? 1.25 : sw) - l.th.rotation.x) * Math.min(1, dt * 5);
      l.kn.rotation.x += ((l.down ? 0 : Math.max(0, -sw) * 1.3 + (n && !l.down ? 0.9 : 0)) - l.kn.rotation.x) * Math.min(1, dt * 5);
      if (l.down && Math.random() < dt * 5) c.fx.smoke(_a.setFromMatrixPosition(l.kn.matrixWorld), 1, 1.4, 0.1, 0.6);
    });
    // 무릎 꿇기: 한쪽이면 그쪽으로 기울고, 양쪽이면 주저앉는다
    u.kneel += ((n === 0 ? 0 : n === 1 ? 3.6 : 6.4) - u.kneel) * Math.min(1, dt * 1.6);
    const side = n === 1 ? (legs[0].down ? 1 : -1) : 0;
    u.lean += (side * 0.2 - u.lean) * Math.min(1, dt * 1.6);
    u.stag = Math.max(0, u.stag - dt * 0.9);
    const sg = Math.sin(u.stag * Math.PI) * 0.35;
    pelvis.position.y = HIP - u.kneel + Math.abs(Math.sin(u.ph)) * 0.35 + (u.stag > 0 ? Math.sin(u.t * 40) * 0.12 * u.stag : 0);
    pelvis.rotation.z = u.lean; pelvis.rotation.x = n === 2 ? 0.12 : 0;
    // 몸통: 목표를 향해 돌고, 맞으면 뒤로 젖혀진다
    const t = u.target;
    g.updateWorldMatrix(true, true);
    u.root.pos.setFromMatrixPosition(hitT.matrixWorld);
    if (t) { _a.copy(t.pos).sub(u.root.pos); u.wy = turn(u.wy, clamp(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw), -1.3, 1.3), 0.9 * dt); }
    waist.rotation.set(-sg + (n === 2 ? 0.1 : 0), u.wy, Math.sin(u.t * 0.7) * 0.015);
    // 부위 위치 갱신
    if (P.head.alive) P.head.pos.setFromMatrixPosition(head.matrixWorld);
    arms.forEach((a, i) => { const pa = i ? P.armR : P.armL; if (pa.alive) pa.pos.setFromMatrixPosition(a.fore.matrixWorld); else if (Math.random() < dt * 5) { c.fx.smoke(_b.setFromMatrixPosition(a.sh.matrixWorld).add(_c.set(0, -4 * S, 0)), 1.1, 1.4, 0.1, 0.5); if (Math.random() < 0.25) c.fx.spark(_b, 0x9fe7ff, 6); } });
    legs.forEach((l, i) => { const pl = i ? P.legR : P.legL; if (pl.alive) pl.pos.setFromMatrixPosition(l.kn.matrixWorld); });
    if (!P.head.alive && Math.random() < dt * 4) c.fx.smoke(_b.setFromMatrixPosition(waist.matrixWorld).add(_c.set(0, 8.5 * S, 0)), 1.2, 1.6, 0.1, 0.5);
    coreM.material.color.setScalar(1).multiplyScalar(P.head.alive ? 0.6 : 1.6 + Math.sin(u.t * 8) * 0.6).multiply(_col);
    if (!t || u.stag > 0.25) return;
    const dist = _a.length(), spread = P.head.alive ? 0.04 : 0.11;   // 머리(센서)를 잃으면 조준이 흐트러진다
    // 팔을 목표 높이로 든다
    arms.forEach((a, i) => { if (!(i ? P.armR : P.armL).alive) return; wp.setFromMatrixPosition(a.sh.matrixWorld); const want = clamp(Math.atan2(t.pos.y - wp.y, Math.hypot(t.pos.x - wp.x, t.pos.z - wp.z)), -1.2, 1.3) + Math.PI / 2; a.pitch += clamp(want - a.pitch, -1.5 * dt, 1.5 * dt); a.sh.rotation.x = a.pitch; });
    const aligned = Math.abs(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw - u.wy)) < 0.2;
    // 왼팔 레이저 포: 8연사
    if (P.armL.alive && aligned && !(u.cool.las > 0)) {
      if (u.burst <= 0) u.burst = 8;
      mz.set(0, -0.6, -7.6).applyMatrix4(arms[0].fore.matrixWorld);
      if (U.clear(mz, t, u)) { U.laser(u, mz, U.aim(mz, t, 105, spread, _b, u), 6, 0xff3d6a, 105); u.burst--; u.cool.las = u.burst > 0 ? 0.11 : 3.2; } else { u.burst = 0; u.cool.las = 0.7; }
    }
    // 오른팔 미사일: 3발
    if (P.armR.alive && aligned && dist > 25 && !(u.cool.msl > 0)) {
      u.cool.msl = 7;
      for (let k = 0; k < 3; k++) { mz.set((k - 1) * 0.7, -0.6, -4.6).applyMatrix4(arms[1].fore.matrixWorld); if (!u.cut) c.fireMissile(u.root, mz, _b.copy(_a).normalize().add(_c.set((k - 1) * 0.25, 0.35, 0)).normalize(), t, 30); }
    }
    // 머리 센서 광선: 강한 한 발
    if (P.head.alive && aligned && !(u.cool.eye > 0)) { u.cool.eye = 4.2; mz.set(0, 0.2, -1.6).applyMatrix4(head.matrixWorld); if (U.clear(mz, t, u)) U.laser(u, mz, U.aim(mz, t, 120, 0.03, _b, u), 16, 0x5ad8ff, 120); }
  };
  u.onDeath = () => { stagger(1); u.fall = 0; u.dir = Math.random() < 0.5 ? 1 : -1; };
  u.dying = (dt) => {   // 연쇄 폭발 → 무릎이 꺾이며 앞으로 쓰러진다
    if (u.deadT < 2.6) {
      waist.rotation.x = -0.25 + Math.sin(u.t * 30) * 0.03; pelvis.position.y += Math.sin(u.t * 45) * 0.05;
      if (Math.random() < dt * 7) { _a.set((Math.random() - 0.5) * 7, 2 + Math.random() * 8, (Math.random() - 0.5) * 4).multiplyScalar(S).applyMatrix4(waist.matrixWorld); c.fx.explosion(_a, 1.3); c.snd.play("explode", c.volAt(_a) * 0.5, c.panAt(_a)); }
      return;
    }
    if (u.fall < 1) {
      u.fall = Math.min(1, u.fall + dt / 1.7); const e = u.fall * u.fall;
      g.rotation.x = -1.45 * e; pelvis.position.y = HIP - u.kneel - 4 * e; for (const l of legs) { l.th.rotation.x = 1.0 * e + (l.down ? 1.25 : 0) * (1 - e); l.kn.rotation.x = 1.4 * e; }
      if (u.fall >= 1) { _a.set(0, 2, -14 * S).applyQuaternion(g.quaternion).add(g.position); U.boom(_a, 5); for (const h of [hitT, hitP, ...hitL]) h.visible = false; c.s.feel.emit("blast", 1, _a); }
      return;
    }
    if (u.deadT < 20 && Math.random() < dt * 6) { _a.set((Math.random() - 0.5) * 8, 2, -4 - Math.random() * 14).multiplyScalar(S).applyQuaternion(g.quaternion).add(g.position); c.fx.smoke(_a, 2, 2.6, 0.1, 1.5); }
  };
  return u;
}
const _col = new THREE.Color(0xffb02e);

const MAKE = { tank: makeTank, aa: makeAA, frigate: (U, o) => makeShip(U, o, false), cruiser: (U, o) => makeShip(U, o, true), mech: makeMech };

// ── 전투기 모델 (AI 드론 종류 "jet" 이 쓴다): 기수는 -Z ──
export function buildJet(color) {
  const g = new THREE.Group(), body = lam(0x596273), dark = lam(0x20242c), tc = glow(color, 2), fire = glow(0xffa040, 2.6);
  const f = cyl(g, 0.34, 0.5, 4.4, body, 0, 0, 0, 8); f.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.4, 8), body); nose.rotation.x = -Math.PI / 2; nose.position.z = -2.9; g.add(nose);
  box(g, 0.5, 0.36, 1.1, glow(0x7ec8ff, 0.9), 0, 0.3, -1.2);
  const wing = new THREE.Shape(); wing.moveTo(0, -0.6); wing.lineTo(2.6, 1.3); wing.lineTo(2.6, 1.9); wing.lineTo(0, 1.5); wing.closePath();
  for (const sx of [-1, 1]) {
    const wm = new THREE.Mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.08, bevelEnabled: false }), body); wm.rotation.x = Math.PI / 2; wm.scale.x = sx; wm.position.set(sx * 0.3, 0.05, 0); wm.castShadow = true; g.add(wm);
    box(g, 0.06, 0.9, 1.0, body, sx * 0.45, 0.55, 1.7).rotation.z = sx * -0.3;
    box(g, 1.2, 0.06, 0.7, body, sx * 0.8, 0, 2.0);
    box(g, 0.1, 0.1, 1.6, tc, sx * 2.85, 0.02, 1.55);
    cyl(g, 0.1, 0.1, 1.2, dark, sx * 1.4, -0.14, 0.7, 6).rotation.x = Math.PI / 2;
  }
  const fl = cyl(g, 0.3, 0.05, 1.4, fire, 0, 0, 2.9, 8); fl.rotation.x = -Math.PI / 2;
  g.scale.setScalar(1.25);
  g.userData.tick = (dt, thr, t) => { fl.scale.set(1, 0.7 + thr * 0.9 + Math.sin(t * 60) * 0.1, 1); };
  g.userData.anim = [fl];
  g.userData.dispose = () => {};
  return g;
}
