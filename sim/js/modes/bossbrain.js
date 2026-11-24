// 보스 두뇌: 유닛·드론 보스 위에 얹는 이동·패턴·기믹 (돌파 작전)
//  이동: 교전 구역 안의 거점 4곳을 돌며 자리를 바꾼다. 지상 보스는 직접 옮겨 지형·건물에 끼지 않는다
//  패턴: barrage 원형 미사일 일제 사격 · sweep 레이저 휩쓸기 · slam 충격파(낮게 날면 맞는다) · rain 포격 비(경고 원)
//        summon 부하 소환 · charge 돌진 · shield 실드 발생기 기믹(체력 50%, 발생기를 다 부숴야 실드가 꺼진다)
//  체력 단계: 66% 아래 패턴이 잦아지고, 33% 아래 격노(포격 비 추가, 더 빠르게)
import * as THREE from "../../vendor/three.module.min.js";

const V3 = THREE.Vector3, _v = new V3(), _w = new V3();
const SETS = {
  ground: ["barrage", "slam", "rain", "charge", "summon", "sweep"],
  ship: ["barrage", "sweep", "rain", "summon"],
  air: ["barrage", "sweep", "rain", "summon"],
};
const NAME = { barrage: "미사일 일제 사격", sweep: "레이저 휩쓸기", slam: "충격파 — 높이 떠라!", rain: "포격 비 — 경고 원 밖으로!", summon: "부하 소환", charge: "돌진!", shield: "실드 전개 — 발생기를 부숴라!" };

export class BossBrain {
  // a: 보스 액터(유닛 root 또는 드론), type: ground | ship | air, o: { center, stage(스테이지 보스 여부), list(소환 부하를 넣을 배열) }
  constructor(mode, a, type, o = {}) {
    this.m = mode; this.c = mode.combat; this.w = mode.s.world; this.a = a; this.type = type;
    this.stage = !!o.stage; this.extras = o.extras || [];
    this.center = o.center.clone();
    const R = type === "ship" ? 55 : type === "air" ? 45 : 38;
    this.anchors = [0, 1, 2, 3].map((i) => {
      const ang = (i / 4) * Math.PI * 2 + 0.4, x = this.center.x + Math.cos(ang) * R, z = this.center.z + Math.sin(ang) * R;
      const p = type === "ground" && this.c.units ? this.c.units.groundSpot(x, z, 25, 8).clone() : new V3(x, this.w.h(x, z), z);
      return p;
    });
    this.ai = 0; this.moveT = 3; this.patT = 4; this.seq = (SETS[type] || SETS.air).slice(this.stage ? 0 : 0, this.stage ? 99 : 3);
    this.pi = 0; this.act = null; this.shieldDone = !this.stage; this.warn = null; this.warnT = 0; this.gens = []; this.shells = [];
    this.lastPos = this._pos().clone(); this.stuckT = 0;
  }
  get alive() { return this.a.alive; }
  _pos() { return this.a.unit ? this.a.unit.group.position : this.a.pos; }
  _target() {
    const me = this.m.me;
    if (me && me.alive && me.targetable !== false) return me;
    let best = null, bd = 1e9;
    for (const o of this.c.actors) if (o.alive && o.team === 0 && o.targetable !== false && !o.static) { const d = o.pos.distanceTo(this.a.pos); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  _say(k) { this.warn = NAME[k] || k; this.warnT = 1.8; }
  // 범위 피해: 우리 편(플레이어·윙맨)에게만
  _hurt(p, r, dmg, lowOnly = 0) {
    for (const o of this.c.actors) {
      if (!o.alive || o.team !== 0 || o.static || o.targetable === false) continue;
      const d = Math.hypot(o.pos.x - p.x, o.pos.z - p.z);
      if (d > r) continue;
      if (lowOnly && o.pos.y - this.w.h(o.pos.x, o.pos.z) > lowOnly) continue;
      this.c.damage(o, dmg * (1 - (d / r) * 0.6), this.a, p);
    }
  }

  update(dt) {
    const a = this.a, c = this.c;
    if (!a.alive) { this._cleanup(); return; }
    if (this.warnT > 0) this.warnT -= dt;
    if (this.m.cut) return;
    const f = a.hp / a.maxHp, ph = f < 0.33 ? 3 : f < 0.66 ? 2 : 1;
    if (ph !== this.ph) { if (this.ph && ph > this.ph) { this.m.s.hud.toast(ph === 3 ? `${a.name} 격노!` : `${a.name} 2단계`, "#ff3d4d", 1.8, 26); this.m.s.game.sound.play("warn"); } this.ph = ph; }
    // 실드 기믹 (스테이지 보스, 체력 50%)
    if (!this.shieldDone && f < 0.5) this._shieldOn();
    if (this.gens.length) this._shieldTick();
    this._move(dt);
    this._shellTick(dt);
    // 진행 중인 패턴
    if (this.act) { this.act.t += dt; if (this.act.step(dt) === false) this.act = null; return; }
    if ((this.patT -= dt) > 0) return;
    this.patT = (ph === 3 ? 3.2 : ph === 2 ? 4.6 : 6.2) * (this.stage ? 1 : 1.25);
    let list = this.seq;
    if (ph === 3 && !list.includes("rain")) list = list.concat(["rain"]);
    const k = list[this.pi++ % list.length];
    this._start(k);
  }

  // 이동: 거점을 차례로 (돌진 중에는 패턴이 직접 옮긴다)
  _move(dt) {
    const a = this.a, u = a.unit;
    if ((this.moveT -= dt) <= 0) { this.moveT = this.ph === 3 ? 6 : 9; this.ai = (this.ai + 1 + Math.floor(Math.random() * 2)) % this.anchors.length; }
    const goal = this.anchors[this.ai];
    if (this.act && this.act.k === "charge") return;
    if (this.type === "ground" && u) {
      const g = u.group; _v.copy(goal).sub(g.position).setY(0);
      const L = _v.length(), sp = (u.type === "titan" ? 5 : 6.5) * dt;
      if (L > 2) { g.position.addScaledVector(_v.normalize(), Math.min(sp, L)); g.position.y = this.w.h(g.position.x, g.position.z); const yaw = Math.atan2(-_v.x, -_v.z); if (u.yaw !== undefined) u.yaw = yaw; g.rotation.y = yaw; }
      if (u.home) u.home.copy(goal);
      u.goal = goal.clone();
    } else if (u && u.home) {   // 함선: 궤도 중심을 옮긴다
      u.home.x += (goal.x - u.home.x) * Math.min(1, dt * 0.25); u.home.z += (goal.z - u.home.z) * Math.min(1, dt * 0.25);
    } else if (a.ai) a.ai.home = goal;
  }

  _start(k) {
    const a = this.a, c = this.c, self = this;
    if (k === "charge" && this.type !== "ground") k = "rain";
    this._say(k);
    const t = this._target();
    if (k === "barrage") {
      const n = this.ph === 3 ? 14 : this.ph === 2 ? 11 : 8;
      this.act = { k, t: 0, n: 0, step() {
        if (this.t < 0.7) { if (Math.random() < 0.3) c.fx.flash(a.pos, 0xff5a3a, 4, 0.2); return true; }
        if (this.n >= n) return false;
        const i = this.n++, ang = (i / n) * Math.PI * 2, from = _v.copy(a.pos).add(_w.set(Math.cos(ang) * 3, 3, Math.sin(ang) * 3)).clone();
        const dir = new V3(Math.cos(ang), 0.8, Math.sin(ang)).normalize();
        if (t && t.alive) c.fireMissile(a, from, dir, t, 18, i % 2 === 1);
        return true;
      } };
    } else if (k === "sweep") {
      const base = t ? Math.atan2(t.pos.x - a.pos.x, t.pos.z - a.pos.z) : 0, dirS = Math.random() < 0.5 ? -1 : 1;
      this.act = { k, t: 0, fireT: 0, step(dt) {
        const tt = this.t;
        if (tt < 1) { if (Math.random() < 0.25) c.fx.flash(a.pos, 0xff3040, 5, 0.15); return true; }
        if (tt > 3.2) return false;
        if ((this.fireT -= dt) > 0) return true;
        this.fireT = 0.07;
        const ang = base + dirS * (-1.1 + (tt - 1) / 2.2 * 2.2), ty = t && t.alive ? t.pos.y : a.pos.y;
        const from = a.pos.clone().add(new V3(0, 2, 0)), d = new V3(Math.sin(ang) * 60, ty - from.y, Math.cos(ang) * 60).normalize();
        c.fireLaser(a, from, d, 8, 0xff3040, 170);
        return true;
      } };
    } else if (k === "slam") {
      const p = this._pos().clone(), R = this.ph >= 2 ? 40 : 32;
      this.act = { k, t: 0, step() {
        if (this.t < 1.3) { if (Math.random() < 0.4) c.fx.ring(p.clone().setY(self.w.h(p.x, p.z) + 1), 0xff5a3a, R, 0.3); return true; }
        c.fx.explosion(p, 3); c.fx.ring(p.clone().setY(self.w.h(p.x, p.z) + 1), 0xffb03a, R, 0.6); c._blast(p, 3); self.m.s.game.sound.play("explode");
        self._hurt(p, R, 42, 16);
        return false;
      } };
    } else if (k === "rain") {
      const n = this.ph === 3 ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const base = t && t.alive ? t.pos : this.center, p = new V3(base.x + (Math.random() - 0.5) * 30, 0, base.z + (Math.random() - 0.5) * 30);
        p.y = this.w.h(p.x, p.z) + 1;
        this.shells.push({ p, t: 1.4 + i * 0.18 });
      }
    } else if (k === "summon") {
      for (let i = 0; i < (this.ph === 3 ? 4 : 3); i++) {
        const p = a.pos.clone().add(new V3((Math.random() - 0.5) * 20, 6 + Math.random() * 8, (Math.random() - 0.5) * 20));
        const b = c.spawnBot({ kind: i % 2 ? "kamikaze" : "grunt", team: 1, pos: p, temp: true, name: "호위 드론" });
        if (b) { b.ai.home = this.center; this.extras.push(b); c.fx.ring(p, 0xff8a3a, 4, 0.4); }
      }
    } else if (k === "charge") {
      const g = a.unit ? a.unit.group : null;
      if (!g || !t) { this.act = null; return; }
      const from = g.position.clone(), to = t.pos.clone(); to.y = this.w.h(to.x, to.z);
      _v.copy(to).sub(from).setY(0); const L = Math.min(70, _v.length()); _v.normalize(); to.copy(from).addScaledVector(_v, L); to.y = this.w.h(to.x, to.z);
      this.act = { k, t: 0, hit: new Set(), step() {
        if (this.t < 1) { if (Math.random() < 0.5) c.fx.ring(to.clone().setY(to.y + 1), 0xff5a3a, 8, 0.25); return true; }
        const k2 = Math.min(1, (this.t - 1) / 1.1);
        g.position.lerpVectors(from, to, k2); g.position.y = self.w.h(g.position.x, g.position.z);
        g.rotation.y = Math.atan2(-_v.x, -_v.z); if (a.unit.yaw !== undefined) a.unit.yaw = g.rotation.y;
        if (Math.random() < 0.5) c.fx.smoke(g.position.clone().setY(g.position.y + 1), 1.4, 2, 0.1, 0.6);
        for (const o of c.actors) if (o.alive && o.team === 0 && !o.static && !this.hit.has(o) && o.pos.distanceTo(g.position) < 10 + (a.radius || 3)) { this.hit.add(o); c.damage(o, 38, a, o.pos); }
        if (k2 >= 1) { c.fx.explosion(g.position, 1.6); return false; }
        return true;
      } };
    }
  }
  _shellTick(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i]; s.t -= dt;
      if (s.t <= 0) { this.shells.splice(i, 1); this.c.fx.explosion(s.p, 1.3); this.c.snd.playAt ? this.c.snd.playAt("explode", s.p, this.m.s.camera, 0.6) : 0; this._hurt(s.p, 9, 30); }
      else if (Math.random() < dt * 7) this.c.fx.ring(s.p, 0xff4a3a, 9, 0.3);
    }
  }
  // 실드: 보스는 무적, 둘레에 발생기 3개. 다 부수면 꺼진다
  _shieldOn() {
    this.shieldDone = true;
    const a = this.a, c = this.c, P = this._pos();
    a.invulnerable = true; this._say("shield");
    this.m.s.hud.toast(`${a.name} 실드 전개 — 실드 발생기 3개를 부수세요!`, "#5ab4ff", 2.6, 26);
    const r = (a.radius || 4) * 2.2 + 6;
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: 0x5ab4ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.w.scene.add(this.bubble);
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2, x = this.center.x + Math.cos(ang) * 32, z = this.center.z + Math.sin(ang) * 32;
      const g = c.spawnTurret(x, z, 1, { name: "실드 발생기" });
      g.hp = g.maxHp = 260; g.shieldGen = true;
      this.gens.push(g);
    }
    void P;
  }
  _shieldTick() {
    const a = this.a;
    if (this.bubble) { this.bubble.position.copy(a.pos); this.bubble.material.opacity = 0.14 + 0.08 * Math.sin(this.m.s.time * 5); }
    if (this.gens.every((g) => !g.alive)) {
      this.gens = []; a.invulnerable = false;
      if (this.bubble) { this.w.scene.remove(this.bubble); this.bubble.geometry.dispose(); this.bubble.material.dispose(); this.bubble = null; }
      this.m.s.hud.toast("실드 해제 — 지금이 기회!", "#35ff7a", 2, 26); this.m.s.game.sound.play("lap");
    }
  }
  objective() { const g = this.gens.find((x) => x.alive); return g || null; }
  _cleanup() {
    if (this.bubble) { this.w.scene.remove(this.bubble); this.bubble = null; }
    for (const g of this.gens) if (g.alive) this.c.kill(g, null);
    this.gens = []; this.shells = []; this.act = null;
  }
}
