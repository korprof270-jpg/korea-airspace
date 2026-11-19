// 인게임 스킬: 게이지 · 발동 연출 · 스킬별 효과
// 게이지(0~100): 적에게 준 피해와 격추로 찬다. 장착한 스킬의 cost 이상이면 [스킬] 입력으로 발동, cost 만큼 소모
// 발동하면: 짧은 슬로모션 + 화면 테두리 색 번쩍임 + 시야 조임 + 기체 둘레 빛 고리·기둥 + 화면 위아래 띠와 스킬 이름 배너
import * as THREE from "../vendor/three.module.min.js";
import { clamp } from "./config.js";
import { SKILLS, skillStat } from "./skilldefs.js";
import * as GP from "./garage.js";

const V3 = THREE.Vector3;
const _a = new V3(), _b = new V3(), _c = new V3(), _x = new V3(), _up = new V3(0, 1, 0);
const LASER_SPEED = 170;

// 가산 혼합 빛 재질
const glowMat = (color, op = 0.8, side = THREE.FrontSide) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side });

export class SkillSys {
  constructor(c) {
    this.c = c; this.s = c.s; this.w = c.w; this.fx = c.fx; this.snd = c.snd;
    this.id = GP.skillEquipped();
    // 강화 레벨: 수치(st)와 연출 배율(vk). m3·m5 = Lv.3·Lv.5 분기점 연출
    this.lv = GP.skillLv(this.id); this.st = skillStat(this.id, this.lv);
    this.def = { ...SKILLS[this.id], cost: this.st.cost, dur: this.st.dur ?? SKILLS[this.id].dur, lv: this.lv };
    this.vk = 1 + (this.lv - 1) * 0.12; this.m3 = this.lv >= 3; this.m5 = this.lv >= 5;
    this.acc = this.m5 ? 0xfff0b0 : 0xffffff;   // Lv.5: 금빛 강조색
    this.gauge = Math.min(100, 20 + ((c.L && c.L.gaugeStart) || 0));   // 시작할 때 조금 차 있다
    this.active = null;               // { id, t, dur, ... }
    this.objs = [];                   // 시간이 지나면 사라지는 3D 효과
    this.banner = null;               // 발동 배너 { t, dur }
    this.marks = [];                  // 락온: 지금 조준 중인 적들 (HUD 꺾쇠)
    this.boostMul = 1; this.dmgMul = 1;
    this.readyT = 0; this.wasReady = this.ready();
    this.denyT = 0;
  }

  get cost() { return this.def.cost; }
  ready() { return this.gauge >= this.def.cost && !this.active; }

  // 게이지 채우기: 피해량·격추. 발동 중에는 덜 찬다
  gain(n) {
    if (!(n > 0) || this.active) return;   // 발동 중에는 차지 않는다
    this.gauge = Math.min(100, this.gauge + n * (1 + ((this.c.L && this.c.L.gauge) || 0)));
  }
  onPlayerDeath() { this.gauge *= 0.6; this._end(); }

  update(dt) {
    const c = this.c, p = c.player, inp = this.s.game.input;
    if (this.denyT > 0) this.denyT -= dt;
    // 준비 완료 알림
    const r = this.ready();
    if (r && !this.wasReady) { this.readyT = 1; this.snd.play("skillready"); this.s.hud.toast(`${this.def.icon} ${this.def.name}${this.lv > 1 ? ` Lv.${this.lv}` : ""} 준비 완료`, css(this.def.color), 1.2, 20); this.s.feel.flash(rgb(this.def.color), 0.22, 3, "thin"); }
    this.wasReady = r;
    if (this.readyT > 0) this.readyT -= dt;
    if (inp.take("skill")) {
      if (r && p.alive && !(p.stunT > 0) && this.s.mode.state === "run") this.activate();
      else if (!this.active) { this.denyT = 0.5; this.s.feel.emit("dry"); }
    }
    if (this.banner) { this.banner.t += dt / Math.max(0.2, this.s.timeK || 1); if (this.banner.t >= this.banner.dur) this.banner = null; }   // 배너는 실제 시간으로
    this.boostMul = 1; this.dmgMul = 1; this.marks.length = 0;
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt * 1.6);
    if (this.glitchT > 0) this.glitchT = Math.max(0, this.glitchT - dt);
    if (this.hitPulse > 0) this.hitPulse = Math.max(0, this.hitPulse - dt * 4);
    const A = this.active;
    if (A) {
      if (!p.alive) this._end();
      else { A.t += dt; this["u_" + A.id](A, dt); if (A.done || (A.dur && A.t >= A.dur)) this._end(); }
    }
    this._touchBtn();
    for (let i = this.objs.length - 1; i >= 0; i--) {
      const o = this.objs[i];
      o.t += dt;
      const k = o.t / o.life;
      if (k >= 1) { this._drop(o); this.objs.splice(i, 1); continue; }
      o.upd(o, k, dt);
    }
  }

  // 터치 버튼: 스킬 아이콘·게이지 %, 준비되면 반짝
  _touchBtn() {
    const pct = Math.floor(this.gauge), key = `${pct}|${this.ready()}|${!!this.active}`;
    if (key === this._bk) return;
    this._bk = key;
    const b = this._btn || (this._btn = document.querySelector("#touch .b-skill"));
    if (!b) return;
    b.style.color = css(this.def.color); b.style.borderColor = css(this.def.color);
    b.classList.toggle("rdy", this.ready()); b.classList.toggle("act", !!this.active);
    b.innerHTML = `${this.def.icon} ${this.active ? "발동 중" : this.ready() ? this.def.name : pct + "%"}<small class="sklv">Lv${this.lv}</small><i style="width:${Math.min(100, (this.gauge / this.def.cost) * 100)}%"></i>`;
  }

  // ── 발동 ──
  activate() {
    const c = this.c, p = c.player, d = this.def, col = d.color;
    this.gauge -= d.cost;
    this.active = { id: this.id, t: 0, dur: d.dur || 0 };
    this.banner = { t: 0, dur: 1.25, name: d.name, icon: d.icon, color: css(col), tag: this.lv > 1 ? `${d.tag} · Lv.${this.lv}` : d.tag };
    // 연출: 슬로모션 · 화면 효과 · 소리 · 기체 둘레 빛
    this.s.slowMo(0.65, 0.22, 0.4);           // 정적(히트스톱) → 느리게 → 원래 속도
    this.s.feel.emit("skill", 1, col);
    this.snd.play("skill"); this.snd.play("explode", 0.5, 0, 1.6);
    this._aura(p.pos, col);
    this._burst(p.pos, col);
    this.flashT = 1;                           // 화면 효과(테두리 빛·집중선) 세기
    GP.ev("skill");
    this["s_" + this.id](this.active);
  }
  _end() {
    const A = this.active;
    if (!A) return;
    this.active = null;
    if (this["e_" + A.id]) this["e_" + A.id](A);
  }

  // 발동 순간 기체 둘레: 위로 솟는 빛 기둥, 퍼지는 고리 세 겹, 위로 흩날리는 빛 입자
  _aura(pos, col) {
    const fx = this.fx;
    fx.flash(pos, col, 10, 0.35);
    fx.ring(pos, col, 14, 0.5); fx.ring(pos, 0xffffff, 8, 0.35);
    const vk = this.vk, nR = 3 + (this.m3 ? 1 : 0) + (this.m5 ? 1 : 0);   // 레벨이 오르면 고리가 늘고 커진다
    fx.burst(pos, col, Math.round(46 * vk * vk), 16 * vk, 0.8, 0.35, -4);
    if (this.m3) fx.burst(pos, this.acc, 30, 22, 0.9, 0.28, -6);
    const ringG = new THREE.TorusGeometry(1, 0.06, 6, 48);
    for (let i = 0; i < nR; i++) {
      const m = new THREE.Mesh(ringG, glowMat(i >= 3 ? this.acc : col, 0.9)); m.rotation.x = Math.PI / 2;
      this._add(m, 0.7 + i * 0.12, (o, k) => { const e = 1 - (1 - k) * (1 - k); m.position.copy(this.c.player.pos).y += -1.2 + i * 1.2 + e * 2; m.scale.setScalar((2 + e * (9 + i * 4)) * vk); m.material.opacity = 0.9 * (1 - k); }, i === 0 ? [ringG] : []);
    }
    const pg = new THREE.CylinderGeometry(1.4, 2.4, 40, 20, 1, true);
    const pil = new THREE.Mesh(pg, glowMat(col, 0.5, THREE.DoubleSide));
    this._add(pil, 0.6, (o, k) => { pil.position.copy(this.c.player.pos).y += 14; pil.scale.set((1 + k * 2) * vk, 0.3 + k, (1 + k * 2) * vk); pil.material.opacity = 0.5 * (1 - k); }, [pg]);
    if (this.m5) {   // Lv.5: 금빛 속기둥 + 수직으로 선 고리 둘
      const ig = new THREE.CylinderGeometry(0.5, 0.9, 60, 12, 1, true), ip = new THREE.Mesh(ig, glowMat(this.acc, 0.5, THREE.DoubleSide));
      this._add(ip, 0.8, (o, k) => { ip.position.copy(this.c.player.pos).y += 22; ip.scale.set(1 + k, 0.4 + k, 1 + k); ip.material.opacity = 0.5 * (1 - k); }, [ig]);
      const vg = new THREE.TorusGeometry(1, 0.05, 6, 48);
      for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(vg, glowMat(this.acc, 0.9)); m.rotation.y = i * Math.PI / 2; this._add(m, 0.75, (o, k) => { const e = 1 - (1 - k) * (1 - k); m.position.copy(this.c.player.pos); m.rotation.z = k * 2; m.scale.setScalar(3 + e * 14); m.material.opacity = 0.7 * (1 - k); }, i ? [] : [vg]); }
    }
  }

  // 기체 둘레 폭발 (Lv.5 마무리 등): 플레이어는 다치지 않는다
  _nova(at, R, dmg, col) {
    const c = this.c, p = c.player, fx = this.fx;
    for (const o of c.actors) {
      if (!o.alive || !o.targetable || !c.hostile(p, o)) continue;
      const d = o.pos.distanceTo(at) - (o.radius || 1);
      if (d < R) c.damage(o, dmg * (1 - Math.max(0, d) / R * 0.6), p, o.pos);
    }
    fx.explosion(at, 2.2); fx.flash(at, 0xffffff, R * 0.6, 0.3);
    for (let i = 0; i < 3; i++) fx.ring(at, i ? col : this.acc, R * (0.6 + i * 0.3), 0.45 + i * 0.12);
    fx.burst(at, col, 90, R * 2.2, 0.7, 0.45, 2); fx.burst(at, this.acc, 40, R * 1.5, 0.9, 0.3, -2);
    const g = new THREE.SphereGeometry(1, 28, 18), sh = new THREE.Mesh(g, glowMat(col, 0.5, THREE.DoubleSide)), a0 = at.clone();
    this._add(sh, 0.55, (o, k) => { const e = 1 - Math.pow(1 - k, 3); sh.position.copy(a0); sh.scale.setScalar(1 + e * R); sh.material.opacity = 0.5 * (1 - k); }, [g]);
    this.snd.play("explode", 0.9, 0, 0.7); this.s.feel.addTrauma(0.35); this.s.feel.emit("blast", 0.6, a0);
    this.flashT = Math.max(this.flashT || 0, 0.6);
  }

  // 발동 순간 추가 폭발: 바닥을 훑는 충격파 벽 + 나선으로 솟는 빛 입자 + 사방으로 튀는 불꽃 줄기
  _burst(pos, col) {
    const fx = this.fx, at = pos.clone();
    const wg = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), wall = new THREE.Mesh(wg, glowMat(col, 0.5, THREE.DoubleSide));
    this._add(wall, 0.65, (o, k) => { const e = 1 - Math.pow(1 - k, 3); wall.position.copy(at); wall.scale.set(3 + e * 34, 5 * (1 - k) + 0.5, 3 + e * 34); wall.material.opacity = 0.5 * (1 - k); }, [wg]);
    const sg = new THREE.SphereGeometry(1, 20, 14), core = new THREE.Mesh(sg, glowMat(0xffffff, 0.9));
    this._add(core, 0.3, (o, k) => { core.position.copy(this.c.player.pos); core.scale.setScalar(1.5 + k * 6); core.material.opacity = 0.9 * (1 - k); }, [sg]);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, r = 2 + (i % 4);
      _a.set(Math.cos(a) * r, -1 + (i % 7) * 0.6, Math.sin(a) * r).add(at);
      fx.puff(_a, i % 3 ? col : 0xffffff, 0.5, 0.6 + (i % 5) * 0.08, 0.5);
    }
    for (let i = 0; i < 10; i++) { _a.set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).normalize(); fx.cone(at, _a, i % 2 ? col : 0xffffff, 10, 22, 0.35, 0.25, 0.3); }
  }

  // 스킬 발동 중 내가 맞힌 적: 스킬마다 다른 명중 연출 (combat.damage 에서 부른다)
  onHit(a, amount, point) {
    const A = this.active;
    if (!A || !a || !a.alive) return;
    const fx = this.fx, col = this.def.color, at = point || a.pos;
    this.hitPulse = 1;
    if (A.id === "lockon") {
      fx.spark(at, col, 10); fx.spark(at, 0xffffff, 4);
      if ((A.hits = (A.hits || 0) + 1) % 4 === 0) { fx.explosion(at, 0.6); fx.ring(at, col, 5, 0.25); this.s.feel.addTrauma(0.05); }
    } else if (A.id === "swarm") {
      fx.explosion(at, 1.3 * this.vk); fx.ring(at, col, 9 * this.vk, 0.4); fx.burst(at, 0xffb060, 24, 18, 0.5, 0.35, 6);
      if (this.m3) fx.ring(at, this.acc, 5, 0.3);
      this.s.feel.emit("impact", 14, null); this.s.feel.addTrauma(0.12);
      this.snd.play("explode", 0.6, 0, 1.15);
    } else if (A.id === "aegis") {
      fx.ring(at, col, 4, 0.3); fx.spark(at, 0xffffff, 8);
    } else if (A.id === "overdrive") {
      fx.burst(at, col, 30, 22, 0.5, 0.35, 0);
    }
  }
  // 스킬 발동 중 격추: 짧은 히트스톱 + 큰 빛 고리 + 조각 폭발
  onKill(a) {
    if (!this.active || !a || !a.pos) return;
    const fx = this.fx, col = this.def.color;
    fx.explosion(a.pos, 1.8); fx.ring(a.pos, col, 14, 0.5); fx.ring(a.pos, 0xffffff, 8, 0.3);
    fx.burst(a.pos, col, 50, 30, 0.8, 0.45, 4);
    this.s.slowMo(0.18, 0.15, 0.06);
    this.s.feel.addTrauma(0.22); this.s.feel.fovPunch -= 2.5;
    this.s.feel.flash(rgb(col), 0.35, 4, "vig");
    this.flashT = Math.max(this.flashT, 0.45);
    this.snd.play("explode", 0.9, 0, 0.8);
  }

  // 3D 효과 관리
  _add(mesh, life, upd, geos = []) {
    this.w.scene.add(mesh);
    const o = { mesh, t: 0, life, upd, geos };
    upd(o, 0, 0);
    this.objs.push(o);
    return o;
  }
  _drop(o) { this.w.scene.remove(o.mesh); o.mesh.traverse((m) => { if (m.material) m.material.dispose(); }); for (const g of o.geos) g.dispose(); }
  dispose() { for (const o of this.objs) this._drop(o); this.objs.length = 0; this._end(); }

  // 앞쪽 시야 안의 적 (거리·각도)
  _foes(range, cosMin, vis = true) {
    const c = this.c, pl = this.s.player, out = [];
    for (const o of c.actors) {
      if (!o.alive || !o.targetable || !c.hostile(c.player, o)) continue;
      _a.copy(o.pos).sub(pl.aimPos);
      const d = _a.length();
      if (d > range || d < 2) continue;
      const cs = _a.dot(pl.aimDir) / d;
      if (cs < cosMin) continue;
      if (vis && !c._vis(pl.aimPos, o)) continue;
      out.push({ o, d, cs });
    }
    return out;
  }

  // ── 1. 락온 일제사격: 시야 안 적을 번갈아 자동 조준, 열 없이 고속 연사 ──
  s_lockon(A) {
    A.fireT = 0; A.last = new Map(); A.scanT = 0; A.list = []; A.k = 0;
    // 조준 고리: Lv.3 부터 두 겹, Lv.5 는 금빛 세 번째 고리가 반대로 돈다
    const nR = 1 + (this.m3 ? 1 : 0) + (this.m5 ? 1 : 0);
    for (let i = 0; i < nR; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * 0.8, 0.05 + i * 0.015, 6, i === 1 ? 6 : 64), glowMat(i === 2 ? this.acc : this.def.color, 0.55));
      this._add(m, this.def.dur, (o, k) => { m.position.copy(this.c.player.pos); m.quaternion.copy(this.s.player.body.quat); m.rotateX(Math.PI / 2); m.rotateZ(this.s.time * (i % 2 ? -2.2 : 3)); m.material.opacity = 0.55 * Math.min(1, (1 - k) * 6); }, [m.geometry]);
    }
  }
  // Lv.5 마무리: 조준 중이던 적 모두에게 유도탄 한 발씩
  e_lockon(A) {
    const c = this.c, p = c.player, pl = this.s.player;
    if (!this.m5 || !p.alive || !A.list) return;
    const list = A.list.filter((o) => o.alive);
    if (!list.length) return;
    _c.set(0, 1, 0).applyQuaternion(pl.body.quat);
    list.forEach((t, i) => {
      _x.set(1, 0, 0).applyQuaternion(pl.body.quat);
      _b.copy(pl.aimPos).addScaledVector(_x, (i % 2 ? 1 : -1) * (0.5 + (i >> 1) * 0.2)).addScaledVector(_c, 0.4);
      _a.copy(pl.aimDir).addScaledVector(_x, (i % 2 ? 1 : -1) * 0.5).addScaledVector(_c, 0.6).normalize();
      c.fireMissile(p, _b, _a, t, 60, true);
      this.fx.ring(t.pos, this.acc, 6, 0.35);
    });
    this.fx.ring(p.pos, this.acc, 12, 0.4); this.fx.flash(p.pos, this.acc, 6, 0.2);
    this.snd.play("missile", 1, 0, 0.9); this.s.feel.addTrauma(0.2);
    this.s.hud.toast("마무리 일제 유도탄", css(this.def.color), 1, 20);
  }
  u_lockon(A, dt) {
    const c = this.c, p = c.player, pl = this.s.player, L = c.L;
    if ((A.scanT -= dt) <= 0) { A.scanT = 0.15; A.list = this._foes(this.st.range, Math.cos(1.15)).sort((a, b) => a.d - b.d).slice(0, this.st.targets).map((f) => f.o); }
    A.list = A.list.filter((o) => o.alive);
    for (const o of A.list) this.marks.push(o);
    if ((A.fireT -= dt) > 0) return;
    A.fireT = 0.055;
    if (!A.list.length) return;
    // 가장 오래 안 쏜 표적
    let t = A.list[0], old = Infinity;
    for (const o of A.list) { const l = A.last.get(o) ?? -1; if (l < old) { old = l; t = o; } }
    if (!A.last.has(t)) this.snd.play("lockbeep", 0.6);
    A.last.set(t, this.s.time);
    p.side = -(p.side || 1);
    _x.set(1, 0, 0).applyQuaternion(pl.body.quat);
    _b.copy(pl.aimPos).addScaledVector(_x, p.side * 0.3).addScaledVector(pl.aimDir, 0.6);
    c._lead(_b, t, LASER_SPEED, _a).sub(_b).normalize();
    c.fireLaser(p, _b, _a, this.st.dmg * (1 + L.laserDmg), this.m5 && A.k++ % 3 === 0 ? this.acc : this.def.color);
    const sh = c.shots[c.shots.length - 1]; sh.wk = 1.3 * this.vk; sh.sk = 1.3 * this.vk;
    this.snd.play("laser", 0.75, p.side * 0.3, 1.25);
    this.s.feel.emit("fire", 0.8, p.side);
    this.s.feel.kickRot(0.0025, (Math.random() - 0.5) * 0.002, p.side * 0.002);
    if (pl.camMode !== "fpv") this.fx.muzzle(_b, _a, this.def.color, 1.4);
    else this.fx.flash(_b.addScaledVector(_a, 1.2), this.def.color, 0.9, 0.05);
  }

  // ── 2. 오버드라이브: 추력·속도 2.5배, 피해 절반, 스치면 충돌 피해 ──
  s_overdrive(A) {
    A.ramT = 0; A.hit = new Map();
    const pl = this.s.player, col = this.def.color;
    this.snd.play("boost"); this.snd.play("whoosh");
    // 뒤로 터지는 음속 고리
    _a.copy(pl.aimDir).multiplyScalar(-1);
    this.fx.cone(pl.body.pos, _a, col, 40, 26, 0.5, 0.5, 0.4);
    const g = new THREE.TorusGeometry(1, 0.12, 6, 40), nR = 2 + (this.m3 ? 1 : 0) + (this.m5 ? 1 : 0);
    for (let i = 0; i < nR; i++) {
      const m = new THREE.Mesh(g, glowMat(i === 1 ? 0xffffff : i >= 2 ? this.acc : col, 0.85));
      const at = pl.body.pos.clone().addScaledVector(pl.aimDir, -2 - i * 3), q = pl.body.quat.clone();
      this._add(m, 0.55 + i * 0.1, (o, k) => { m.position.copy(at); m.quaternion.copy(q); m.scale.setScalar((2 + k * (10 + i * 6)) * this.vk); m.material.opacity = 0.85 * (1 - k); }, i ? [] : [g]);
    }
  }
  u_overdrive(A, dt) {
    const c = this.c, p = c.player, pl = this.s.player, left = A.dur - A.t;
    this.boostMul = 1.6; this.dmgMul = this.st.take;
    const fl = this.s.feel; fl.streakPulse = Math.max(fl.streakPulse, 1); fl.fovPunch = Math.max(fl.fovPunch, 5); fl.addTrauma(0.012);
    if ((A.boomT = (A.boomT ?? 0.9) - dt) <= 0) {   // 0.9초마다 음속 폭음 고리 (Lv.3 부터 더 자주, 두 겹)
      A.boomT = this.m3 ? 0.6 : 0.9;
      for (let i = 0; i < (this.m3 ? 2 : 1); i++) {
        const g = new THREE.TorusGeometry(1, 0.1, 6, 40), m = new THREE.Mesh(g, glowMat(i ? this.def.color : this.acc, 0.8)), at = pl.body.pos.clone().addScaledVector(pl.aimDir, -3 - i * 2.5), q = pl.body.quat.clone();
        this._add(m, 0.5 + i * 0.15, (o, k) => { m.position.copy(at); m.quaternion.copy(q); m.scale.setScalar((2 + k * (14 + i * 6)) * this.vk); m.material.opacity = 0.8 * (1 - k); }, [g]);
      }
      this.snd.play("whoosh", 0.8, 0, 0.8); fl.addTrauma(0.1);
    }
    p.boostT = Math.max(p.boostT || 0, Math.min(left, 0.3));    // 속도선·부스트 화면 효과를 함께 쓴다
    if ((A.puff = (A.puff || 0) - dt) <= 0) { A.puff = 0.02; this.fx.puff(pl.body.pos, this.def.color, 0.55 * this.vk, 0.45 * this.vk, 0.35); this.fx.puff(pl.body.pos, this.acc, 0.25 * this.vk, 0.2, 0.15); if (this.m5) this.fx.puff(pl.body.pos, 0xff7a2a, 0.4, 0.6, 0.7); }
    // 충돌 피해: 가까이 스친 적 (같은 적은 0.6초에 한 번)
    for (const o of c.actors) {
      if (!o.alive || !o.targetable || !c.hostile(p, o)) continue;
      const d = o.pos.distanceTo(p.pos);
      if (d > this.st.reach + (o.radius || 1)) continue;
      const l = A.hit.get(o) ?? -9;
      if (this.s.time - l < 0.6) continue;
      A.hit.set(o, this.s.time);
      c.damage(o, this.st.ram, p, o.pos);
      if (o.vel && !o.static) o.vel.addScaledVector(_a.copy(o.pos).sub(p.pos).normalize(), 18);
      this.fx.explosion(o.pos, 0.8); this.fx.ring(o.pos, this.def.color, 6, 0.35);
      this.snd.play("hit", 1, 0, 0.7);
      this.s.feel.emit("impact", 9, null);
    }
  }
  e_overdrive() {
    this.snd.play("shielddown");
    if (this.m5 && this.c.player.alive) this._nova(this.c.player.pos.clone(), 18, 150, this.def.color);   // Lv.5: 끝나는 순간 충격파
  }

  // ── 3. 스웜 미사일: 16발을 여러 적에게 나눠 연속 발사 ──
  s_swarm(A) {
    A.n = this.st.n; A.fireT = 0;
    A.list = this._foes(230, Math.cos(1.0), false).sort((a, b) => b.cs - a.cs).slice(0, this.st.targets).map((f) => f.o);
    A.k = 0;
    this.snd.play("missile", 1, 0, 0.8);
  }
  u_swarm(A, dt) {
    const c = this.c, p = c.player, pl = this.s.player;
    if ((A.fireT -= dt) > 0) return;
    A.fireT = 0.085;
    A.list = A.list.filter((o) => o.alive);
    if (!A.list.length && A.k % 4 === 0) A.list = this._foes(230, Math.cos(1.0), false).slice(0, this.st.targets).map((f) => f.o);
    // Lv.5 마무리: 일반탄을 다 쏜 뒤 대형 탄두 2발
    if (A.k >= A.n) {
      if (!this.m5 || (A.big = (A.big || 0) + 1) > 2) { A.done = true; return; }
      A.fireT = 0.22;
      const bt = A.list.length ? A.list[A.big % A.list.length] : null, bs = A.big % 2 ? 1 : -1;
      _x.set(1, 0, 0).applyQuaternion(pl.body.quat); _c.set(0, 1, 0).applyQuaternion(pl.body.quat);
      _b.copy(pl.aimPos).addScaledVector(_x, bs * 0.6).addScaledVector(_c, 0.3);
      _a.copy(pl.aimDir).addScaledVector(_x, bs * 0.25).addScaledVector(_c, 0.7).normalize();
      c.fireMissile(p, _b, _a, bt, this.st.dmg * 3, true);
      const mm = c.missiles[c.missiles.length - 1]; if (mm && mm.mesh) mm.mesh.scale.multiplyScalar(2);
      this.fx.flash(_b, this.acc, 3, 0.15); this.fx.ring(_b, this.acc, 5, 0.3); this.fx.cone(_b, _a.multiplyScalar(-1), this.acc, 24, 18, 0.5, 0.4, 0.3);
      this.snd.play("missile", 1, 0, 0.6); this.s.feel.addTrauma(0.18);
      return;
    }
    for (let rep = this.m3 ? 2 : 1; rep > 0 && A.k < A.n; rep--) this._swarmOne(A);   // Lv.3 부터 2발씩 동시에
  }
  _swarmOne(A) {
    const c = this.c, p = c.player, pl = this.s.player;
    const t = A.list.length ? A.list[A.k % A.list.length] : null;
    // 등 뒤 발사관에서 좌우로 번갈아 퍼지며 솟는다
    const side = A.k % 2 ? 1 : -1, ring = (A.k >> 1) % 4;
    _x.set(1, 0, 0).applyQuaternion(pl.body.quat);
    _c.set(0, 1, 0).applyQuaternion(pl.body.quat);
    _b.copy(pl.aimPos).addScaledVector(_x, side * (0.5 + ring * 0.25)).addScaledVector(_c, 0.4);
    _a.copy(pl.aimDir).addScaledVector(_x, side * (0.55 + ring * 0.15)).addScaledVector(_c, 0.5 + ring * 0.12).normalize();
    c.fireMissile(p, _b, _a, t, this.st.dmg, true);
    this.fx.flash(_b, A.k % 3 || !this.m3 ? this.def.color : this.acc, 1.4 * this.vk, 0.08);
    this.s.feel.addTrauma(0.05); this.s.feel.kickRot(0.004, 0, side * 0.003);
    A.k++;
    if (A.k >= A.n && !this.m5) A.done = true;
  }

  // ── 4. EMP 쇼크웨이브: 0.55초 충전 → 반경 85m 충격파 ──
  s_emp(A) {
    A.dur = this.st.stun; A.boom = false; A.wave = 0;   // 충격파 뒤에도 마비된 적 위로 전기 불꽃이 튄다
    const col = this.def.color, g = new THREE.SphereGeometry(1, 28, 18);
    // 충전: 빛 구가 기체로 빨려 들어온다
    const m = new THREE.Mesh(g, glowMat(col, 0.35, THREE.BackSide));
    this._add(m, 0.55, (o, k) => { m.position.copy(this.c.player.pos); m.scale.setScalar(18 * (1 - k) + 2); m.material.opacity = 0.15 + 0.4 * k; }, [g]);
    this.snd.play("stun", 0.5, 0, 1.6);
  }
  u_emp(A, dt) {
    const c = this.c, p = c.player, col = this.def.color;
    if (A.stunned) for (const o of A.stunned) if (o.alive && Math.random() < dt * 10) { this.fx.spark(o.pos, col, 3); if (Math.random() < 0.3) this._zap(o.pos, _c.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8).add(o.pos), col); }
    if (!A.boom) {
      if (Math.random() < dt * 30) { _a.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 8).add(p.pos); this.fx.spark(_a, col, 4); }
      if (A.t < 0.55) return;
      A.boom = true;
      const at = p.pos.clone(), R = this.st.radius, stun = this.st.stun;
      A.at = at; A.waveT = 0.45;
      this.snd.play("emp"); this.snd.play("explode", 0.8, 0, 0.6);
      this.s.feel.fullFlash("190,215,255", 0.45, 2.5);
      this.glitchT = 0.7; this.flashT = 1;
      for (let i = 0; i < Math.round(14 * this.vk * this.vk); i++) { _c.set(Math.random() - 0.5, Math.random() * 0.4 - 0.1, Math.random() - 0.5).normalize().multiplyScalar(R * (0.35 + Math.random() * 0.6)).add(at); this._zap(at, _c, i % 2 ? col : this.acc); }
      this.s.feel.emit("blast", 0.7, null);
      this.s.slowMo(0.35, 0.3, 0.4);
      for (let i = 0; i < 3; i++) this.fx.ring(at, i ? col : 0xffffff, 30 + i * 25, 0.5 + i * 0.15);
      this.fx.burst(at, col, Math.round(120 * this.vk), 60 * this.vk, 0.7, 0.5, 0);
      // 퍼지는 구 껍질 + 수평 고리
      const g = new THREE.SphereGeometry(1, 36, 22), sh = new THREE.Mesh(g, glowMat(col, 0.55, THREE.DoubleSide));
      this._add(sh, 0.8, (o, k) => { const e = 1 - Math.pow(1 - k, 3); sh.position.copy(at); sh.scale.setScalar(2 + e * R); sh.material.opacity = 0.55 * (1 - k); }, [g]);
      const tg = new THREE.TorusGeometry(1, 0.025, 6, 96), tr = new THREE.Mesh(tg, glowMat(0xffffff, 0.9));
      tr.rotation.x = Math.PI / 2;
      this._add(tr, 0.9, (o, k) => { const e = 1 - Math.pow(1 - k, 2); tr.position.copy(at); tr.scale.setScalar(2 + e * R * 1.05); tr.material.opacity = 0.9 * (1 - k); }, [tg]);
      // 효과: 마비 + 피해, 적 미사일 소멸
      for (const o of c.actors) {
        if (!o.alive || !c.hostile(p, o) || o.kind === "core" || o.kind === "prop") continue;
        if (o.pos.distanceTo(at) > R + (o.radius || 1)) continue;
        o.stunT = Math.max(o.stunT || 0, stun);
        if (o.unit && o.unit.cool) { const u = o.unit; u.stunT = stun; for (const k in u.cool) u.cool[k] = Math.max(u.cool[k] || 0, stun); u.cool.gun = Math.max(u.cool.gun || 0, stun); u.cool.msl = Math.max(u.cool.msl || 0, stun); }
        if (o.targetable) c.damage(o, this.st.dmg, p, o.pos);
        this.fx.spark(o.pos, col, 20); this.fx.ring(o.pos, col, 5, 0.35);
        this._zap(at, o.pos, col); this._zap(at, o.pos, 0xffffff);
        (A.stunned || (A.stunned = [])).push(o);
      }
      for (let i = c.missiles.length - 1; i >= 0; i--) {
        const m = c.missiles[i];
        if (m.owner === p || m.pos.distanceTo(at) > R) continue;
        this.fx.explosion(m.pos, 0.7);
        this.w.scene.remove(m.mesh); m.mesh.userData.glow.material.dispose(); c.missiles.splice(i, 1);
      }
    } else if (A.wave < (this.m5 ? 2 : this.m3 ? 1 : 0) && (A.waveT -= dt) <= 0) {
      // Lv.3: 2차 파동, Lv.5: 3차 파동 + 마비된 적끼리 연쇄 번개. 이미 마비된 적에게 추가 피해
      A.wave++; A.waveT = 0.45;
      const at = A.at, R = this.st.radius, wc = A.wave === 2 ? this.acc : col, live = (A.stunned || []).filter((o) => o.alive);
      const g = new THREE.SphereGeometry(1, 30, 18), sh = new THREE.Mesh(g, glowMat(wc, 0.45, THREE.DoubleSide));
      this._add(sh, 0.7, (o, k) => { const e = 1 - Math.pow(1 - k, 3); sh.position.copy(at); sh.scale.setScalar(2 + e * R); sh.material.opacity = 0.45 * (1 - k); }, [g]);
      const tg = new THREE.TorusGeometry(1, 0.03, 6, 96), tr = new THREE.Mesh(tg, glowMat(wc, 0.9)); tr.rotation.x = Math.PI / 2; tr.rotation.y = A.wave * 0.5;
      this._add(tr, 0.8, (o, k) => { const e = 1 - Math.pow(1 - k, 2); tr.position.copy(at); tr.scale.setScalar(2 + e * R * 1.05); tr.material.opacity = 0.9 * (1 - k); }, [tg]);
      this.fx.ring(at, wc, R * 0.6, 0.5); this.fx.burst(at, wc, 70, 70, 0.6, 0.4, 0);
      this.snd.play("emp", 0.7, 0, 1.2 + A.wave * 0.15); this.s.feel.addTrauma(0.2); this.glitchT = 0.35; this.flashT = Math.max(this.flashT || 0, 0.6);
      live.forEach((o, i) => {
        if (o.targetable) c.damage(o, this.st.dmg * 0.35, p, o.pos);
        this.fx.spark(o.pos, wc, 14); this.fx.ring(o.pos, wc, 4, 0.3);
        if (A.wave === 2 && live.length > 1) { const n = live[(i + 1) % live.length]; this._zap(o.pos, n.pos, this.acc); this._zap(o.pos, n.pos, col); }
      });
    }
  }
  // 번개 줄기 (충격파가 닿은 적까지)
  _zap(a, b, col) {
    const pts = [], n = 8;
    for (let i = 0; i <= n; i++) { const k = i / n; const q = a.clone().lerp(b, k); if (i && i < n) q.add(_c.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(4)); pts.push(q); }
    const g = new THREE.BufferGeometry().setFromPoints(pts), l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this._add(l, 0.3, (o, k) => { l.material.opacity = 1 - k; }, [g]);
  }

  // ── 5. 이지스 방벽: 강한 실드 + 적 레이저 반사 ──
  s_aegis(A) {
    const c = this.c, p = c.player, col = this.def.color;
    p.shield = Math.max(p.shield || 0, this.st.shield * (1 + (c.L.shieldK || 0)));
    p.shieldT = Math.max(p.shieldT || 0, this.def.dur);
    this.snd.play("shieldup");
    const g = new THREE.IcosahedronGeometry(3.4 * (this.st.reach / 5.5), 1);
    const shell = new THREE.Mesh(g, glowMat(col, 0.12, THREE.DoubleSide));
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    shell.add(wire);
    // Lv.3: 반대로 도는 바깥 방벽, Lv.5: 금빛 적도 고리
    let wire2 = null, band = null; const geos = [g, wire.geometry];
    if (this.m3) { const g2 = new THREE.IcosahedronGeometry(3.4 * (this.st.reach / 5.5) * 1.18, 0); wire2 = new THREE.LineSegments(new THREE.WireframeGeometry(g2), new THREE.LineBasicMaterial({ color: new THREE.Color(this.acc).multiplyScalar(1.4), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); shell.add(wire2); geos.push(g2, wire2.geometry); }
    if (this.m5) { const bg = new THREE.TorusGeometry(3.4 * (this.st.reach / 5.5) * 1.25, 0.06, 6, 64); band = new THREE.Mesh(bg, glowMat(this.acc, 0.8)); band.rotation.x = Math.PI / 2; shell.add(band); geos.push(bg); }
    A.dome = this._add(shell, this.def.dur, (o, k) => {
      shell.position.copy(this.c.player.pos);
      shell.rotation.y += 0.01; shell.rotation.x += 0.004;
      if (wire2) { wire2.rotation.y -= 0.03; wire2.material.opacity = 0.4 * Math.min(1, (1 - k) * 8); }
      if (band) { band.rotation.z += 0.05; band.material.opacity = 0.8 * Math.min(1, (1 - k) * 8); }
      const pulse = A.hitT > 0 ? A.hitT : 0, sIn = Math.min(1, o.t * 5), end = Math.min(1, (1 - k) * 8);
      shell.scale.setScalar((0.6 + 0.4 * sIn) * (1 + pulse * 0.08));
      shell.material.opacity = (0.1 + pulse * 0.25) * end; wire.material.opacity = (0.35 + pulse * 0.5) * end * (0.8 + Math.sin(this.s.time * 9) * 0.2);
    }, geos);
    A.hitT = 0;
  }
  u_aegis(A, dt) {
    const c = this.c, p = c.player, col = this.def.color;
    if (A.hitT > 0) A.hitT -= dt * 3;
    if (!(p.shield > 0)) { A.done = true; return; }
    for (const s of c.shots) {
      if (s.owner === p || s.refl || !c.hostile(s.owner, p)) continue;
      if (s.pos.distanceTo(p.pos) > this.st.reach) continue;
      // 되돌려 보내기: 쏜 적이 살아 있으면 그쪽으로
      s.refl = true;
      const src = s.owner;
      if (src && src.alive && src.pos) s.dir.copy(src.pos).sub(s.pos).normalize(); else s.dir.multiplyScalar(-1);
      s.owner = p; s.dmg *= this.st.refl; s.color = this.m5 ? this.acc : col; s.life = 0.9; s.speed = Math.max(s.speed, 150);
      this.fx.hitSpark(s.pos, s.dir, col, 12, true);
      this.fx.ring(s.pos, col, 3, 0.25); this.fx.flash(s.pos, 0xffffff, 1.5, 0.08);
      A.hitT = 1; this.hitPulse = 1; this.s.feel.addTrauma(0.04);
      this.snd.play("shield", 0.6, 0, 1.3);
    }
  }
  e_aegis(A) {
    if (A.dome) A.dome.life = Math.min(A.dome.life, A.dome.t + 0.25);
    if (this.m5 && this.c.player.alive) this._nova(this.c.player.pos.clone(), 20, 130, this.def.color);   // Lv.5: 방벽이 터지며 주변 폭발
  }

  // ── 6. 궤도 포격: 지점 표시 1.4초 → 위성 레이저 ──
  s_orbital(A) {
    const c = this.c, pl = this.s.player, w = this.w;
    A.dur = 1.7 + this.st.burn + (this.m5 ? 1.2 : 0); A.fired = false; A.tick = 0; A.beep = 0; A.sub = 0; A.subT = 0.35;
    // 표적 지점: 조준선 근처 적, 없으면 조준선 방향의 지형·건물
    const t = c._aimTarget(0.2, 260);
    const at = new V3();
    if (t) { at.copy(t.pos); at.y = Math.min(at.y, w.h(at.x, at.z) + 2); }
    else {
      at.copy(pl.aimPos);
      for (let d = 2; d < 260; d += 2) { _a.copy(pl.aimPos).addScaledVector(pl.aimDir, d); if (w.col.blocked(_a, 0.5)) { at.copy(_a); break; } at.copy(_a); }
      at.y = Math.max(w.h(at.x, at.z), Math.min(at.y, w.h(at.x, at.z) + 2));
      if (w.col.blocked(_a, 0.5)) at.copy(_a);
    }
    A.at = at; A.R = this.st.radius;
    const col = this.def.color;
    // 바닥 표시: 붉은 원 + 안쪽 회전 고리 + 하늘에서 내려오는 가는 유도선
    const grp = new THREE.Group(), tg = new THREE.TorusGeometry(1, 0.035, 6, 96), cg = new THREE.CircleGeometry(1, 64), lg = new THREE.CylinderGeometry(0.25, 0.25, 300, 8, 1, true);
    const o1 = new THREE.Mesh(tg, glowMat(col, 0.9)), o2 = new THREE.Mesh(tg, glowMat(0xffffff, 0.7)), disc = new THREE.Mesh(cg, glowMat(col, 0.18, THREE.DoubleSide)), line = new THREE.Mesh(lg, glowMat(col, 0.5));
    o1.rotation.x = o2.rotation.x = disc.rotation.x = -Math.PI / 2; line.position.y = 150;
    grp.add(o1, o2, disc, line);
    this._add(grp, 1.5, (o, k) => {
      grp.position.copy(at).y += 0.3;
      const blink = 0.6 + 0.4 * Math.sin(o.t * (10 + k * 30));
      o1.scale.setScalar(A.R); o2.scale.setScalar(A.R * (1 - k) + 1); o2.rotation.z = o.t * 3;
      disc.scale.setScalar(A.R); disc.material.opacity = 0.12 + 0.2 * k * blink; o1.material.opacity = 0.9 * blink;
      line.scale.set(1 + k * 2, 1, 1 + k * 2); line.material.opacity = 0.25 + 0.5 * k;
    }, [tg, cg, lg]);
    this.s.hud.toast("궤도 포격 좌표 지정", css(col), 1.1, 22);
  }
  u_orbital(A, dt) {
    const c = this.c, p = c.player, col = this.def.color, at = A.at;
    if (!A.fired) {
      if ((A.beep -= dt) <= 0) { A.beep = Math.max(0.08, 0.32 - A.t * 0.18); this.snd.play("lockbeep", 0.9); }
      if (A.t < 1.4) return;
      A.fired = true;
      const bw = (A.R / 24) * (this.m3 ? 1.3 : 1);   // 빔 굵기: 반경에 비례, Lv.3 부터 더 굵게
      // 빔: 하늘에서 꽂히는 두꺼운 기둥(바깥 붉은 빛 + 하얀 심)
      const og = new THREE.CylinderGeometry(1, 1, 420, 24, 1, true), ig = new THREE.CylinderGeometry(1, 1, 420, 16, 1, true);
      const outer = new THREE.Mesh(og, glowMat(col, 0.55, THREE.DoubleSide)), inner = new THREE.Mesh(ig, glowMat(0xffffff, 0.9, THREE.DoubleSide));
      const beam = new THREE.Group(); beam.add(outer, inner);
      this._add(beam, 1.0, (o, k) => {
        beam.position.copy(at).y += 210;
        const s = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
        outer.scale.set((10 * s + Math.sin(o.t * 50) * 0.6) * bw, 1, 10 * s * bw); inner.scale.set(3.5 * s * bw, 1, 3.5 * s * bw);
        outer.material.opacity = 0.55 * s;
      }, [og, ig]);
      this.snd.play("orbital");
      this.s.feel.fullFlash("255,220,225", 0.6, 1.8);
      this.s.slowMo(0.3, 0.06, 0.12);                                     // 꽂히는 순간 멈칫
      this.flashT = 1; this.s.feel.addTrauma(0.6); this.s.feel.fovPunch -= 4;
      // 빔을 따라 내려오는 고리 + 바닥 그을음 + 솟구치는 파편
      const rg = new THREE.TorusGeometry(1, 0.08, 6, 48);
      for (let i = 0; i < 4 + (this.m3 ? 2 : 0) + (this.m5 ? 2 : 0); i++) { const m = new THREE.Mesh(rg, glowMat(i % 2 ? this.acc : col, 0.85)); m.rotation.x = Math.PI / 2; this._add(m, 0.6 + i * 0.08, (o, k) => { m.position.copy(at); m.position.y += 120 * (1 - k) * (1 - i * 0.12); m.scale.setScalar((12 - k * 4) * bw); m.material.opacity = 0.85 * Math.min(1, (1 - k) * 3); }, i ? [] : [rg]); }
      const scg = new THREE.CircleGeometry(1, 40), scorch = new THREE.Mesh(scg, new THREE.MeshBasicMaterial({ color: 0x110806, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
      scorch.rotation.x = -Math.PI / 2;
      this._add(scorch, 7, (o, k) => { scorch.position.copy(at); scorch.position.y = this.w.h(at.x, at.z) + 0.15; scorch.scale.setScalar(A.R * 0.85); scorch.material.opacity = 0.75 * (1 - k * k); }, [scg]);
      const hg = new THREE.CircleGeometry(1, 40), heat = new THREE.Mesh(hg, glowMat(0xff6a20, 0.8, THREE.DoubleSide));
      heat.rotation.x = -Math.PI / 2;
      this._add(heat, 2.1 + this.st.burn, (o, k) => { heat.position.copy(at); heat.position.y = this.w.h(at.x, at.z) + 0.25; heat.scale.setScalar(A.R * 0.6 * (1 - k * 0.5)); heat.material.opacity = 0.8 * (1 - k); }, [hg]);
      for (let i = 0; i < 16; i++) { _a.set(Math.random() - 0.5, 0.8 + Math.random(), Math.random() - 0.5).normalize(); this.fx.cone(at, _a, i % 2 ? 0xffa050 : 0xffffff, 8, 40, 0.8, 0.5, 0.6); }
      this.s.feel.emit("blast", 1, at);
      c._blast(at, 6);
      this.s.slowMo(0.45, 0.25, 0.4);
      for (let i = 0; i < 5; i++) { _a.set((Math.random() - 0.5) * 30, Math.random() * 6, (Math.random() - 0.5) * 30).add(at); this.fx.explosion(_a, 2 + Math.random() * 1.5); }
      this.fx.explosion(at, 5);
      for (let i = 0; i < 3; i++) this.fx.ring(at, i ? col : 0xffffff, 30 + i * 18, 0.6 + i * 0.15);
      this.fx.burst(at, 0xffd0a0, 90, 40, 1, 0.6, 10);
      c.splash(at, A.R, this.st.dmg, p, null);
      A.tick = 0.15;
    } else {
      if (A.t < 1.4 + this.st.burn && (A.tick -= dt) <= 0) { A.tick = 0.15; c.splash(at, A.R * 0.6, 30, p, null); _a.set((Math.random() - 0.5) * A.R * 0.8, 0, (Math.random() - 0.5) * A.R * 0.8).add(at); this.fx.explosion(_a, 1.4 * this.vk); if (this.m3) this.fx.cone(_a, _up, 0xffa050, 8, 26, 0.5, 0.5, 0.4); }
      // Lv.5 마무리: 둘레에 보조 빔 3발이 잇따라 꽂힌다
      if (this.m5 && A.sub < 3 && (A.subT -= dt) <= 0) {
        A.subT = 0.3;
        const ang = A.sub * 2.094 + 0.5, sp = new V3(Math.cos(ang) * A.R * 0.75, 0, Math.sin(ang) * A.R * 0.75).add(at);
        sp.y = Math.max(sp.y, this.w.h(sp.x, sp.z));
        A.sub++;
        const sg = new THREE.CylinderGeometry(1, 1, 420, 16, 1, true), sb = new THREE.Mesh(sg, glowMat(this.acc, 0.8, THREE.DoubleSide));
        this._add(sb, 0.6, (o, k) => { sb.position.copy(sp).y += 210; const s = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.5) / 0.5); sb.scale.set(3.2 * s, 1, 3.2 * s); sb.material.opacity = 0.8 * s; }, [sg]);
        this.fx.explosion(sp, 3); this.fx.ring(sp, this.acc, A.R * 0.5, 0.5); this.fx.burst(sp, 0xffd0a0, 50, 30, 0.8, 0.5, 8);
        c.splash(sp, A.R * 0.5, this.st.dmg * 0.3, p, null);
        this.snd.play("orbital", 0.7, 0, 1.3); this.s.feel.addTrauma(0.3); this.s.slowMo(0.5, 0.04, 0.08);
      }
    }
  }
}

function css(c) { return "#" + c.toString(16).padStart(6, "0"); }
export function rgb(c) { return `${(c >> 16) & 255},${(c >> 8) & 255},${c & 255}`; }
