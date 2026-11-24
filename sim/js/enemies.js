// 대형·지상 적 유닛: 전차, 대공 로봇, 공중 전투함·순양함, 거대로봇 (전투기는 combat.js 의 AI 드론 종류 "jet")
// 유닛 = 본체 액터(root) + 부위 액터(parts). 부위는 따로 조준·파괴되고, 파괴되면 떨어져 나가거나 주저앉는 등 동작이 바뀐다
import * as THREE from "../vendor/three.module.min.js";
import { clamp } from "./config.js";
import { rollRank, rankStats, clampRank } from "./ranks.js";
import { decorateUnit } from "./factions.js";
import { armorMat, chamferBox } from "./unitskin.js";
import { mergeStatic } from "./mergemodel.js";
import { makeMech } from "./titan.js";

const V3 = THREE.Vector3;
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _q = new THREE.Quaternion();
const UP = new V3(0, 1, 0);
const lam = (c) => armorMat(c);   // 패널 무늬 + 금속 광택 (툰 변환 뒤에도 유지)
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

export const UNIT_NAME = { tank: "전차", aa: "대공 로봇", frigate: "전투함", cruiser: "순양함", mech: "거대로봇", titan: "초거대로봇", siege: "아군 공성 로봇",
  lighttank: "경전차", heavytank: "중전차", missiletank: "미사일 전차", sniperbot: "저격 로봇", shieldbot: "방패 로봇", mortarbot: "포격 로봇",
  destroyer: "구축함", carrier: "항모", flagship: "기함" };
// 에일(외계) 진영 유닛 이름. 외피는 factions.js 의 decorateUnit
export const AIL_NAME = { tank: "갑각체", aa: "포자탑", frigate: "순항체", cruiser: "모함", mech: "거신체", titan: "거신", siege: "공성 거신체",
  lighttank: "질주 갑각체", heavytank: "철갑 갑각체", missiletank: "포자 발사체", sniperbot: "가시탑", shieldbot: "껍질탑", mortarbot: "포자 박격탑",
  destroyer: "쾌속 순항체", carrier: "둥지 모함", flagship: "여왕 모함" };
// 유닛 종류별 특징 (같은 몸체를 쓰되 크기·속도·화력·전술이 다르다)
export const UNIT_INFO = {
  tank: "균형형 주력 전차", lighttank: "빠르게 측면을 돌며 3연사", heavytank: "느리지만 전면 장갑이 두껍고 한 방이 크다", missiletank: "거리를 두고 미사일 4발 일제 사격",
  aa: "연사 대공포 + 미사일", sniperbot: "멀리서 충전 저격 — 빛줄기가 보이면 피하라", shieldbot: "정면 방패로 피해 대부분 차단 — 뒤나 옆을 노려라", mortarbot: "포격 경고 원 뒤 곡사 포탄",
  frigate: "균형형 전투함", destroyer: "빠르게 돌며 어뢰형 미사일 연사", cruiser: "포탑 다수 + 미사일", carrier: "자폭·소형 드론을 계속 띄운다", flagship: "주포 빔 · 근접 방공 · 두꺼운 장갑",
};
const VT = {   // 전차 변형
  tank: {},
  lighttank: { S: 0.8, speed: 8, turn: 1.6, hp: 0.55, color: 0x8a7a48, burst: 3, dmg: 8, cool: 2.2, score: 200 },
  heavytank: { S: 1.3, speed: 2.6, turn: 0.5, hp: 2.4, color: 0x3a3f46, dmg: 34, cool: 3.8, front: 0.35, score: 450 },
  missiletank: { S: 1.0, speed: 3.6, hp: 0.9, color: 0x584a6a, salvo: 4, cool: 9, score: 350, range: 150 },
};
const VR = {   // 두 발 보행 로봇 변형
  aa: {},
  sniperbot: { hp: 0.8, color: 0x3d5a4a, snipe: true, range: 175, score: 350 },
  shieldbot: { hp: 1.5, color: 0x4a4a62, shield: true, score: 350 },
  mortarbot: { hp: 1.1, color: 0x6a5a3a, mortar: true, range: 160, score: 350 },
};
const VS = {   // 함선 변형 (big: 큰 선체)
  frigate: {},
  destroyer: { L: 0.8, speed: 2.2, hp: 0.7, slots: 2, torp: true, score: 650 },
  cruiser: {},
  carrier: { big: true, L: 1.1, hp: 1.2, slots: 2, carrier: true, score: 1600 },
  flagship: { big: true, L: 1.45, hp: 2.6, slots: 7, beam: true, pd: true, armor: 0.45, score: 2500 },
};

export class Units {
  constructor(combat) {
    this.c = combat; this.w = combat.w; this.s = combat.s;
    this.list = []; this.debris = [];
  }

  // type: tank | aa | frigate | cruiser | mech | titan | siege
  // o: { pos, name, hp(배율), scale, home, boss, rank, team(기본 1, siege 는 0),
  //      march: [점...] (V3·[x,z]·{x,z}) — 경로를 따라 걷는다, target: 액터 — 경로 끝에서 다가가 큰 피해(dmg, 기본 최대 체력 34%/찍기),
  //      onReach(root, target), escort: m(siege: 플레이어가 이 거리 안에 있어야 전진), speed(배율), yaw }
  // 행진 상태: root.march = { eta(초), progress(0..1), remaining(m), reached, done, halted, text("로봇 도달까지 N초") }
  spawn(type, o = {}) {
    const base = BASE[type] || type;
    // 거대로봇·거신·공성기·전투함은 가까이 나타나지 않는다(중·원거리에서 등장)
    if (FAR[type] && o.pos && !o.near && this.c.farFrom) { o = Object.assign({}, o, { pos: this.c.farFrom(o.pos.clone(), FAR[type]) }); if (o.home && !o.march) o.home = o.pos; }
    // 계급: 포인트 색(o.tc)과 내구도·화력·조준 배율
    const rk = rankStats(o.rank !== undefined ? clampRank(o.rank) : rollRank(this.c.level, base));
    const ail = this.c.s.cfg.faction === "ail";
    const nm = o.name || (ail ? AIL_NAME[type] : UNIT_NAME[type]);
    o = Object.assign({}, o, { rk, tc: rk.color, hp: (o.hp || 1) * rk.hp, name: type === "siege" ? nm : `${rk.name} ${nm}` });
    const u = MAKE[type](this, o);
    if (this.c.s.cfg.faction) decorateUnit(u, base, this.c.s.cfg.faction);
    if (u.relink) u.relink();
    // 같은 재질 + 같이 움직이는 부품끼리 합쳐 그리기 호출을 줄인다 (움직이는 노드 = 모든 그룹)
    if (u.merge) u.merge();
    else { const L = []; u.group.traverse((q) => { if (!q.isMesh) L.push(q); }); u.group.userData.anim = L; mergeStatic(u.group); }
    u.rk = rk; u.root.rk = rk; for (const p of u.parts) p.rk = rk;
    u.type = type; u.t = Math.random() * 10; u.cool = {};
    this.list.push(u);
    // 처음 보는 종류: 특징을 전투 기록에 한 줄 (판마다 한 번)
    const seen = this.seen || (this.seen = new Set());
    if (UNIT_INFO[type] && !seen.has(type) && type !== "siege" && this.c.s.hud) { seen.add(type); this.c.s.hud.feed(`신규 적 · ${UNIT_NAME[type]} — ${UNIT_INFO[type]}`, "#ffb02e"); }
    return u.root;
  }

  // 무작위 변형: "tank" | "robot" | "ship" | "bigship"
  pickKind(cls) {
    const L = { tank: ["tank", "tank", "lighttank", "heavytank", "missiletank"], robot: ["aa", "sniperbot", "shieldbot", "mortarbot"], ship: ["frigate", "destroyer", "destroyer"], bigship: ["cruiser", "carrier", "flagship"] }[cls] || [cls];
    return L[Math.floor(Math.random() * L.length)];
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
      if ((u.think = (u.think || 0) - dt) <= 0) { u.think = 0.35; u.target = u.pickTarget ? u.pickTarget() : this.pick(u, u.root.pos, u.range); }
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
    if (this.tfx) this.tfx.update(dt);
  }

  dispose() {
    for (const u of this.list) this.w.scene.remove(u.group);
    for (const d of this.debris) this.w.scene.remove(d.obj);
    if (this.tfx) { this.tfx.dispose(); this.tfx = null; }
  }
}

// ── 전차 ──────────────────────────────────────────────────
function makeTank(U, o, vk = "tank") {
  const V = VT[vk] || {}, S = (o.scale || 1) * (V.S || 1), w = U.w, g = new THREE.Group(), body = lam(V.color || 0x4a5a3a), dark = lam(0x23272f), red = glow(o.tc);
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
  u.root = U.actor(u, o.name || "전차", 2.9 * S, 300 * S * (o.hp || 1) * (V.hp || 1), { score: V.score || 250, cutR: 13 * S });
  U.own(hitC, u.root);
  if (V.range) u.range = V.range;
  if (V.salvo) { gun.visible = false; const L = grp(tur, 0, 1.1, 0.1); box(L, 1.9, 0.9, 1.6, dark); for (let i = 0; i < 4; i++) cyl(L, 0.18, 0.18, 0.12, glow(o.tc, 1.6), -0.6 + (i % 2) * 1.2, 0.2 + Math.floor(i / 2) * 0.35 - 0.2, -0.82, 8).rotation.x = Math.PI / 2; u.launcher = L; }
  if (V.front) { const pl = lam(0x6a707a); box(g, 3.6, 1.3, 0.35, pl, 0, 1.2, -3.0); box(tur, 2.6, 1.0, 0.3, pl, 0, 0.5, -1.45); }   // 중전차: 앞 증가장갑
  if (vk === "lighttank") { box(tur, 0.2, 0.2, 1.4, lam(0x15181e), 0.5, 1.05, -0.3); }
  const muzzle = new V3();
  u.update = (dt) => {
    U.walk(u, dt, V.speed || 4.5, V.turn || 0.8, 7, 3.2 * S);
    if (V.front) {   // 정면에서 맞으면 장갑이 대부분 막는다
      const me = U.c.player; if (me) { _a.copy(me.pos).sub(g.position); const f = -Math.sin(u.yaw) * _a.x - Math.cos(u.yaw) * _a.z; u.root.armor = f > _a.length() * 0.5 ? V.front : 1; }
    }
    u.root.pos.copy(g.position); u.root.pos.y += 1.5 * S;
    const t = u.target;
    if (t) {
      _a.copy(t.pos).sub(u.root.pos);
      u.ty = turn(u.ty, Math.atan2(-_a.x, -_a.z) - u.yaw, 1.4 * dt); u.tp = clamp(Math.atan2(_a.y, Math.hypot(_a.x, _a.z)), -0.1, 1.0);
      tur.rotation.y = u.ty; gun.rotation.x = u.tp;
      if (!(u.cool.gun > 0) && Math.abs(wrap(Math.atan2(-_a.x, -_a.z) - u.yaw - u.ty)) < 0.1) {
        gun.updateWorldMatrix(true, false); muzzle.set(0, 0, -4.2).applyMatrix4(gun.matrixWorld);
        if (V.salvo) {   // 미사일 전차: 4발 일제 사격 (포 대신)
          if (!u.cut) { u.launcher.updateWorldMatrix(true, false); for (let i = 0; i < V.salvo; i++) { muzzle.set(-0.6 + (i % 2) * 1.2, 0.4, -0.9).applyMatrix4(u.launcher.matrixWorld); U.c.fireMissile(u.root, muzzle, _b.set(0, 0.6, 0).addScaledVector(_a.clone().normalize(), 1).normalize(), t, 24); } }
          u.cool.gun = V.cool;
        } else if (U.clear(muzzle, t, u)) {
          const n = V.burst || 1;
          u.burstN = u.burstN > 0 ? u.burstN - 1 : n - 1;
          u.cool.gun = u.burstN > 0 ? 0.22 : (V.cool || 2.6);
          U.laser(u, muzzle, U.aim(muzzle, t, 75, V.burst ? 0.05 : 0.03, _b, u), V.dmg || 20, vk === "heavytank" ? 0xff7a2a : 0xffb84a, vk === "heavytank" ? 60 : 75);
          U.c.fx.flash(muzzle, 0xffd9a0, vk === "heavytank" ? 3.4 : 2.2, 0.15);
        }
      }
    }
  };
  u.onDeath = () => { U.chunk(tur, new V3((Math.random() - 0.5) * 6, 13, (Math.random() - 0.5) * 6), 3); g.traverse((m) => { if (m.isMesh && m.material.color) m.material = lam(0x1c1c1c); }); };
  u.dying = (dt) => { if (u.deadT < 14 && Math.random() < dt * 5) U.c.fx.smoke(_a.copy(g.position).setY(g.position.y + 1.6), 1.2, 2, 0.1, 0.8); };
  return u;
}

// ── 대공 로봇 (두 발 보행) ─────────────────────────────────
function makeAA(U, o, vk = "aa") {
  const V = VR[vk] || {}, S = o.scale || 1, w = U.w, g = new THREE.Group(), body = lam(V.color || 0x55607a), dark = lam(0x22262e), eye = glow(o.tc);
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
  u.root = U.actor(u, o.name || "대공 로봇", 2.5 * S, 230 * S * (o.hp || 1) * (V.hp || 1), { score: V.score || 250, cutR: 14 * S });
  U.own(hitC, u.root);
  if (V.range) u.range = V.range;
  let shieldM = null;
  if (V.shield) {   // 방패 로봇: 몸 앞에 육각 에너지 방패
    shieldM = new THREE.Mesh(new THREE.CircleGeometry(2.6, 6), new THREE.MeshBasicMaterial({ color: 0x5ab4ff, transparent: true, opacity: 0.32, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    shieldM.position.set(0, 0.9, -2.2); top.add(shieldM);
  }
  if (V.snipe) { for (const pd of pods) pd.visible = false; const rail = grp(top, 0, 1.0, -0.4); box(rail, 0.5, 0.5, 1.6, dark); cyl(rail, 0.12, 0.12, 5.2, dark, 0, 0, -3.2, 6).rotation.x = Math.PI / 2; u.rail = rail; }
  if (V.mortar) { for (const pd of pods) pd.visible = false; const tube = grp(top, 0, 1.4, 0.3); cyl(tube, 0.5, 0.55, 2.2, dark, 0, 1.0, 0, 10); tube.rotation.x = -0.6; u.tube = tube; }
  const mz = new V3(), beamM = V.snipe ? new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })) : null;
  if (beamM) { beamM.visible = false; w.scene.add(beamM); }
  const shells = [];
  u.update = (dt) => {
    // 포격 탄: 경고 원 → 낙하 → 범위 피해
    for (let i = shells.length - 1; i >= 0; i--) {
      const sh = shells[i]; sh.t -= dt;
      if (sh.t <= 0) {
        shells.splice(i, 1); U.boom(sh.p, 1.4);
        for (const a of U.c.actors) if (a.alive && a.targetable && U.c.hostile(u.root, a)) { const d = a.pos.distanceTo(sh.p); if (d < 11) U.c.damage(a, 26 * (1 - d / 13), u.root, sh.p); }
      } else if (Math.random() < dt * 8) U.c.fx.ring(sh.p, 0xff5a3a, 11, 0.3);
    }
    if (shieldM) { const me = U.c.player; if (me) { _a.copy(me.pos).sub(u.root.pos); const fw = new V3(0, 0, -1).applyAxisAngle(new V3(0, 1, 0), u.yaw + u.ty); u.root.armor = fw.dot(_a.normalize()) > 0.35 ? 0.15 : 1; } shieldM.material.opacity = 0.25 + 0.12 * Math.sin(u.t * 6); }
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
    if (Math.abs(wrap(want - u.ty)) > 0.12) { if (beamM) beamM.visible = false; return; }
    if (V.snipe) {   // 충전 1.3초(빨간 조준선) → 강한 한 발
      u.rail.updateWorldMatrix(true, false); mz.set(0, 0, -5.8).applyMatrix4(u.rail.matrixWorld);
      if (!(u.cool.gun > 0) && U.clear(mz, t, u)) {
        u.charge = (u.charge || 0) + dt;
        beamM.visible = true; const L = mz.distanceTo(t.pos); beamM.scale.set(1, L, 1); beamM.position.copy(mz).lerp(t.pos, 0.5); beamM.lookAt(t.pos); beamM.rotateX(Math.PI / 2);
        beamM.material.opacity = 0.25 + 0.5 * Math.min(1, u.charge / 1.3);
        if (u.charge >= 1.3) { u.charge = 0; u.cool.gun = 5; beamM.visible = false; if (!(t.isPlayer && t.dodgeT > 0)) U.laser(u, mz, U.aim(mz, t, 220, 0.012, _b, u), 30, 0xff3040, 220); }
      } else { u.charge = 0; beamM.visible = false; }
      return;
    }
    if (V.mortar) {   // 목표 발밑에 경고 원 → 1.8초 뒤 낙하
      if (!(u.cool.gun > 0) && !u.cut) { u.cool.gun = 4.2; const p = t.pos.clone(); p.y = w.h(p.x, p.z) + 1; p.x += (Math.random() - 0.5) * 6; p.z += (Math.random() - 0.5) * 6; shells.push({ p, t: 1.8 }); U.c.fx.ring(p, 0xff5a3a, 11, 0.6); U.c.snd.play("warn", U.c.volAt(p) * 0.5, U.c.panAt(p)); }
      return;
    }
    if (!(u.cool.gun > 0)) {
      if (u.burst <= 0) u.burst = 6;
      const pd = pods[u.burst % 2]; pd.updateWorldMatrix(true, false); mz.set(0, 0, -3).applyMatrix4(pd.matrixWorld);
      if (U.clear(mz, t, u)) { U.laser(u, mz, U.aim(mz, t, 110, 0.05, _b, u), 5, 0xff5a3a, 110); u.burst--; u.cool.gun = u.burst > 0 ? 0.1 : 2.2; } else { u.burst = 0; u.cool.gun = 0.6; }
    }
    if (!(u.cool.msl > 0) && _a.length() > 28) { u.cool.msl = 7.5; rack.updateWorldMatrix(true, false); mz.set(0, 0.8, 0).applyMatrix4(rack.matrixWorld); if (!u.cut) U.c.fireMissile(u.root, mz, _b.set(0, 1, 0).addScaledVector(_a.normalize(), 0.6).normalize(), t, 26); }
  };
  u.onDeath = () => { for (const pd of pods) if (pd.visible) U.chunk(pd, new V3((Math.random() - 0.5) * 8, 8, (Math.random() - 0.5) * 8)); hit.visible = false; if (beamM) { beamM.visible = false; w.scene.remove(beamM); } if (shieldM) shieldM.visible = false; };
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
  u.beacon = box(mast, 0.3, 0.3, 0.3, red, 0, Ht * 1.75, 0); u.beacon.userData.keep = true;   // 깜박이므로 합치지 않는다
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

function makeShip(U, o, big, vk) {
  const V = VS[vk || (big ? "cruiser" : "frigate")] || {};
  const w = U.w, g = new THREE.Group(), hullM = lam(vk === "flagship" ? 0x2a2f3c : vk === "carrier" ? 0x40485a : big ? 0x3a4458 : 0x4a5568), dark = lam(0x1f2430), trim = glow(o.tc, 1.8), eng = glow(vk === "destroyer" ? 0xffb040 : 0x5ad8ff, 2.6);
  const kL = V.L || 1, Lh = (big ? 46 : 28) * kL, Wd = (big ? 9 : 6.5) * Math.sqrt(kL), Ht = (big ? 5 : 4) * Math.sqrt(kL);
  const home = o.home || o.pos || new V3(0, 0, 0), alt = Math.max(w.h(home.x, home.z) + (big ? 46 : 36), (o.pos ? o.pos.y : 0));
  const u = { group: g, parts: [], home: new V3(home.x, Math.min(alt, w.ceiling - 12), home.z), ang: Math.random() * 6.28, R: Math.min(w.size * 0.45, big ? 85 : 65), range: 130, yaw: 0 };
  w.scene.add(g);
  shipHull(g, Lh, Wd, Ht, big, hullM, dark, trim, eng, u);
  const hit = grp(g), hitC = w.rider(hit, [[0, 0, 0, Wd * 0.5, Ht * 0.5, Lh * 0.4], [0, Ht * 0.9, Lh * 0.12, Wd * 0.25, Ht * 0.5, Lh * 0.08], [0, 0, -Lh * 0.44, Wd * 0.36, Ht * 0.4, Lh * 0.11]], "enemy");
  u.root = U.actor(u, o.name || (big ? "순양함" : "전투함"), (big ? 9 : 6.5) * kL, (big ? 1300 : 650) * (o.hp || 1) * (V.hp || 1), { score: V.score || (big ? 1500 : 700), armor: V.armor || 0.6, cutR: (big ? 52 : 36) * kL });
  U.own(hitC, u.root);   // 선체 어디를 맞혀도 본체 피해 (함포가 남아 있는 동안은 장갑 0.6배)
  // 포탑(부위): 갑판 위·아래
  let slots = big ? [[0, 1, -0.32], [0, 1, -0.1], [0, -1, -0.2], [0, -1, 0.15], [0, 1, 0.3]] : [[0, 1, -0.25], [0, -1, 0], [0, 1, 0.3]];
  if (V.slots === 7) slots = [[0, 1, -0.38], [0, 1, -0.2], [0, 1, 0.05], [0, 1, 0.3], [0, -1, -0.25], [0, -1, 0.05], [0, -1, 0.3]];
  else if (V.slots) slots = slots.slice(0, V.slots);
  if (V.carrier) { const deckM = lam(0x2a303c); box(g, Wd * 1.25, 0.5, Lh * 0.8, deckM, 0, Ht * 0.55, 0.05 * Lh); for (let i = 0; i < 6; i++) box(g, 0.3, 0.06, 2.2, glow(0xffd24a, 1.4), 0, Ht * 0.55 + 0.3, -Lh * 0.32 + i * Lh * 0.12); }   // 비행갑판
  if (vk === "flagship") { box(g, Wd * 0.45, Ht * 1.2, Lh * 0.12, hullM, 0, Ht * 1.3, Lh * 0.12); const mainG = grp(g, 0, Ht * 0.75, -Lh * 0.44); cyl(mainG, 0.9, 1.1, 7, dark, 0, 0, -3.5, 10).rotation.x = Math.PI / 2; u.mainG = mainG; }   // 기함: 높은 함교 + 함수 주포
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
  const drones = [];
  u.update = (dt) => {
    u.ang += (5.5 * (V.speed || 1) / u.R) * dt;
    const px = u.home.x + Math.cos(u.ang) * u.R, pz = u.home.z + Math.sin(u.ang) * u.R;
    if ((u.altT = (u.altT || 0) - dt) <= 0) { u.altT = 0.3; u.altWant = Math.max(safeAlt(u.ang), safeAlt(u.ang + 18 / u.R), safeAlt(u.ang + 36 / u.R)); }
    u.alt += clamp(u.altWant - u.alt, -6 * dt, 9 * dt);   // 앞에 산·건물이 있으면 미리 떠오르고, 지나가면 천천히 내려온다
    g.position.set(px, u.alt + Math.sin(u.t * 0.4) * 2, pz);
    u.yaw = Math.atan2(Math.sin(u.ang), -Math.cos(u.ang)); g.rotation.set(0, u.yaw, Math.sin(u.t * 0.5) * 0.04 - 0.06);
    if (u.radar) { u.radar.rotation.y += dt * 1.6; u.beacon.visible = Math.sin(u.t * 5) > 0.3; }
    u.root.pos.copy(g.position);
    const alive = u.turrets.filter((t) => t.a.alive).length;
    u.root.armor = alive ? (V.armor || 0.6) : V.armor ? 0.8 : 1;   // 기함은 포탑이 다 부서져도 장갑이 남는다
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
    if (big && !V.carrier && t && !(u.cool.msl > 0)) { u.cool.msl = 6.5; for (const sx of [-1, 1]) { mz.set(sx * Wd * 0.4, Ht * 0.7, -Lh * 0.1).applyMatrix4(g.matrixWorld); if (!u.cut) U.c.fireMissile(u.root, mz, _b.set(sx * 0.4, 1, 0).normalize(), t, 28); } }
    // 구축함: 함수에서 어뢰형 미사일 2발 연사 (자주)
    if (V.torp && t && !(u.cool.torp > 0) && !u.cut) { u.cool.torp = 4; for (const sx of [-1, 1]) { mz.set(sx * 1.2, 0, -Lh * 0.55).applyMatrix4(g.matrixWorld); U.c.fireMissile(u.root, mz, _b.set(-Math.sin(u.yaw), -0.1, -Math.cos(u.yaw)).normalize(), t, 30); } }
    // 항모: 소형 드론을 띄운다 (동시에 최대 4기)
    if (V.carrier && !(u.cool.launch > 0) && !u.cut) {
      u.cool.launch = 9;
      for (let i = drones.length - 1; i >= 0; i--) if (!drones[i].alive) drones.splice(i, 1);
      if (drones.length < 4 && U.c.spawnBot) { mz.set(0, Ht * 0.8, Lh * 0.3).applyMatrix4(g.matrixWorld); const b = U.c.spawnBot({ kind: Math.random() < 0.5 ? "kamikaze" : "grunt", team: u.root.team, pos: mz.clone(), temp: true, name: "함재 드론" }); if (b) { drones.push(b); U.c.fx.ring(mz, 0xffd24a, 5, 0.4); } }
    }
    // 기함: 함수 주포 빔 (경고 1초 뒤 굵은 빔) + 근접 방공(가까운 미사일을 떨어뜨린다)
    if (V.beam && t && u.mainG && !u.cut) {
      u.mainG.updateWorldMatrix(true, false); mz.set(0, 0, -7.5).applyMatrix4(u.mainG.matrixWorld);
      if (!(u.cool.beam > 0) && !u.beamT && U.clear(mz, t, u)) { u.beamT = 1; U.c.fx.flash(mz, 0xff3040, 5, 1); U.c.snd.play("warn", U.c.volAt(mz) * 0.6, U.c.panAt(mz)); }
      if (u.beamT && (u.beamT -= dt) <= 0) { u.beamT = 0; u.cool.beam = 7; U.laser(u, mz, U.aim(mz, t, 260, 0.02, _b, u), 40, 0xff3040, 260); U.c.fx.flash(mz, 0xffb0b0, 6, 0.3); }
    }
    if (V.pd && !(u.cool.pd > 0)) {
      u.cool.pd = 0.6;
      for (const m of U.c.missiles || []) if (m.alive !== false && m.owner && m.owner.isPlayer && m.pos && m.pos.distanceTo(g.position) < Lh * 0.9 && Math.random() < 0.45) { m.life = 0; U.c.fx.explosion(m.pos, 0.6); break; }
    }
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

const MAKE = {
  tank: makeTank, aa: makeAA, frigate: (U, o) => makeShip(U, o, false), cruiser: (U, o) => makeShip(U, o, true), mech: makeMech,
  lighttank: (U, o) => makeTank(U, o, "lighttank"), heavytank: (U, o) => makeTank(U, o, "heavytank"), missiletank: (U, o) => makeTank(U, o, "missiletank"),
  sniperbot: (U, o) => makeAA(U, o, "sniperbot"), shieldbot: (U, o) => makeAA(U, o, "shieldbot"), mortarbot: (U, o) => makeAA(U, o, "mortarbot"),
  destroyer: (U, o) => makeShip(U, o, false, "destroyer"), carrier: (U, o) => makeShip(U, o, true, "carrier"), flagship: (U, o) => makeShip(U, o, true, "flagship"),
  titan: (U, o) => makeMech(U, Object.assign({ scale: 2.4, boss: true }, o)),                                   // 초거대로봇: 큰 거대로봇
  siege: (U, o) => makeMech(U, Object.assign({ scale: 1.5, team: 0, siege: true, speed: 1.4 }, o)),                        // 아군 공성 로봇 (호위하면 전진)
};
// 계급·이름·진영 외피는 같은 모델을 쓰는 기본 종류로
const BASE = { titan: "mech", siege: "mech", lighttank: "tank", heavytank: "tank", missiletank: "tank", sniperbot: "aa", shieldbot: "aa", mortarbot: "aa", destroyer: "frigate", carrier: "cruiser", flagship: "cruiser" };
const FAR = { titan: 230, mech: 190, frigate: 170, cruiser: 190, destroyer: 160, carrier: 200, flagship: 230 };   // 등장 최소 거리(m)

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
