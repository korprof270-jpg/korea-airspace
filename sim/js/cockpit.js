// 조종석 효과 (1인칭 FPV 시점 전용): 캐노피 틀과 기둥(기동에 따라 관성으로 쏠린다), 유리 반사광, 속도선·회피 터널,
// G 포스 시야 흐림, 피격 충격(틀이 튀고 맞은 쪽에서 불티), 가까운 폭발의 열기와 흔들림, 낮은 체력 심장 박동,
// 미사일 경고등, 지면 접근 경고, 엔진 진동, 고속 바람 줄기. HUD 캔버스 맨 아래층에 그린다
import { settings, clamp } from "./config.js";

import * as THREE from "../vendor/three.module.min.js";

const TAU = Math.PI * 2, _v = new THREE.Vector3();
const rnd = (a, b) => a + Math.random() * (b - a);

export class Cockpit {
  constructor() {
    this.lines = Array.from({ length: 34 }, () => ({ a: Math.random() * TAU, r: Math.random(), w: rnd(0.6, 1.6) }));
    this.sparks = [];         // 피격 불티 { x, y, vx, vy, t }
    this.sway = { x: 0, y: 0, r: 0 }; this.jolt = 0; this.joltDir = 1; this.heat = 0; this.heatX = 0.5;
    this.g = 1; this.vPrev = null; this.hpPrev = null; this.heartT = 0; this.warnT = 0; this.t = 0;
  }

  // h = HUD (2D 캔버스 도우미), s = 세션
  draw(h, s, dt) {
    if (settings.fx && settings.fx.cockpit === false) return;
    const g = h.g, W = h.W, H = h.H, u = h.u, b = s.player.body, calm = settings.fx && settings.fx.reduceMotion;
    this.t += dt;
    const kmh = b.speed * 3.6, agl = Math.max(0, b.pos.y - s.world.h(b.pos.x, b.pos.z));
    const cb = s.mode.combat, me = cb && cb.player;

    // ── G 포스: 속도 변화(중력 제외)로 추정, 부드럽게 ──
    if (this.vPrev && dt > 0) {
      const ax = (b.vel.x - this.vPrev.x) / dt, ay = (b.vel.y - this.vPrev.y) / dt + 9.81, az = (b.vel.z - this.vPrev.z) / dt;
      const gNow = Math.min(12, Math.hypot(ax, ay, az) / 9.81);
      this.g += (gNow - this.g) * Math.min(1, dt * 3);
    }
    this.vPrev = this.vPrev || b.vel.clone(); this.vPrev.copy(b.vel);

    // ── 엔진 진동: 스로틀·속도에 비례하는 아주 작은 떨림 (틀만 흔든다) ──
    const thr = clamp((s.game.input.ctl.throttle + 1) / 2, 0, 1);
    const vib = calm ? 0 : (0.4 + thr * 1.2 + kmh / 120) * u;
    const jx = Math.sin(this.t * 71) * vib, jy = Math.cos(this.t * 89) * vib;

    // 1) 속도선: 시속 55km 이상에서 화면 가장자리로 흐르는 선
    const dash = me && me.dodgeT > 0, bst = me && me.boostT > 0;
    const sp = dash ? 1 : clamp((kmh - 55) / 90 + (bst ? 0.35 : 0), 0, 1);
    if (sp > 0) {
      const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
      g.save(); g.lineCap = "round";
      for (const L of this.lines) {
        if (!calm) { L.r += dt * (0.6 + sp * 2.2); if (L.r > 1) { L.r = 0.25; L.a = Math.random() * TAU; } }
        const r0 = R * (0.45 + L.r * 0.55), r1 = r0 + R * (0.06 + sp * 0.16);
        g.globalAlpha = sp * (dash ? 0.7 : 0.32) * (1 - L.r * 0.6);
        g.strokeStyle = dash ? "#7fe6ff" : bst ? "#ffe9a0" : "#e8f4ff"; g.lineWidth = L.w * u * (dash ? 2.2 : 1);
        g.beginPath(); g.moveTo(cx + Math.cos(L.a) * r0, cy + Math.sin(L.a) * r0); g.lineTo(cx + Math.cos(L.a) * r1, cy + Math.sin(L.a) * r1); g.stroke();
      }
      g.restore();
    }

    // 2) 기본 비네트 + G 포스 흐림(양의 G: 회색, 낮은 체력: 빨강)
    const grey = clamp((this.g - 3.2) / 4.5, 0, 0.75), lowHp = me ? clamp(1 - me.hp / me.maxHp / 0.35, 0, 1) : 0;
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.42 - grey * 0.18), W / 2, H / 2, Math.hypot(W, H) * 0.56);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(${lowHp > 0 ? Math.round(40 + 80 * lowHp) : 4},6,10,${0.38 + grey * 0.55})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (lowHp > 0) {   // 낮은 체력: 심장 박동에 맞춘 붉은 맥박 + 박동음
      const rate = 0.95 - lowHp * 0.35; this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = rate; try { s.game.sound.play("heart", 0.35 + lowHp * 0.4); } catch (e) { /* 소리 없음 */ } }
      const pulse = Math.max(0, 1 - (rate - this.heartT) / 0.25);
      g.fillStyle = `rgba(255,30,30,${0.12 * lowHp * pulse})`; g.fillRect(0, 0, W, H);
    }

    // 3) 캐노피 틀: 위쪽 아치 + 양옆 기둥 (진동 반영)
    // 관성: 선회·상승·롤에 틀이 반대로 쏠렸다 돌아온다 + 피격·폭발 때 튄다
    const om = b.omega || { x: 0, y: 0, z: 0 }, sw = this.sway, kS = Math.min(1, dt * 5);
    if (!calm) {
      sw.x += (clamp(om.y * 9, -22, 22) * u - sw.x) * kS;
      sw.y += (clamp(-b.vel.y * 0.9 + (this.g - 1) * 3, -16, 20) * u - sw.y) * kS;
      sw.r += (clamp(om.z * 0.012 + om.y * 0.006, -0.035, 0.035) - sw.r) * kS;
    }
    this.jolt = Math.max(0, this.jolt - dt * 4.5);
    const jo = calm ? 0 : this.jolt * this.jolt * 14 * u;
    g.save(); g.translate(W / 2, H / 2); g.rotate(sw.r + Math.sin(this.t * 43) * jo * 0.0012); g.translate(-W / 2 + jx + sw.x + this.joltDir * jo, -H / 2 + jy + sw.y + Math.sin(this.t * 57) * jo * 0.5);
    const fw = 16 * u, top = 22 * u;
    g.fillStyle = "rgba(14,18,26,0.82)";
    // 위 아치
    g.beginPath(); g.moveTo(-10, -10); g.lineTo(W + 10, -10); g.lineTo(W + 10, top * 0.4);
    g.quadraticCurveTo(W / 2, top * 1.6, -10, top * 0.4); g.closePath(); g.fill();
    // 왼쪽·오른쪽 기둥 (아래로 갈수록 바깥으로 벌어진다)
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? 0 : W;
      g.beginPath();
      g.moveTo(x0, top * 0.3); g.lineTo(x0 + sd * -W * 0.075, top * 0.9);
      g.lineTo(x0 + sd * -W * 0.025, H * 0.62); g.lineTo(x0 + sd * -fw * 0.4, H + 10); g.lineTo(x0 + sd * 10, H + 10); g.closePath();
      g.fill();
      // 기둥 안쪽 모서리 빛
      g.strokeStyle = "rgba(120,200,255,0.22)"; g.lineWidth = 1.5 * u;
      g.beginPath(); g.moveTo(x0 + sd * -W * 0.075, top * 0.9); g.lineTo(x0 + sd * -W * 0.025, H * 0.62); g.lineTo(x0 + sd * -fw * 0.4, H); g.stroke();
      // 리벳
      g.fillStyle = "rgba(160,180,200,0.35)";
      for (let i = 1; i < 6; i++) { const k = i / 6, x = x0 + sd * -(W * 0.075 * (1 - k) + W * 0.025 * k) * 0.55, y = top * 0.9 + (H * 0.62 - top * 0.9) * k; g.beginPath(); g.arc(x, y, 1.6 * u, 0, TAU); g.fill(); }
      g.fillStyle = "rgba(14,18,26,0.82)";
    }
    g.strokeStyle = "rgba(120,200,255,0.18)"; g.lineWidth = 1.5 * u;
    g.beginPath(); g.moveTo(W * 0.075, top * 0.9); g.quadraticCurveTo(W / 2, top * 1.6 + 1, W * 0.925, top * 0.9); g.stroke();

    // 4) 유리 반사광: 기수 방향·롤에 따라 미끄러지는 사선 빛
    const yaw = b.heading || 0, roll = this.sway.r * 20;
    const gx = ((yaw * 0.9 + roll * 0.6) / TAU % 1 + 1) % 1 * (W * 1.6) - W * 0.3;
    const gl = g.createLinearGradient(gx - 90 * u, 0, gx + 90 * u, H);
    gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,255,255,0.055)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(0, 0, W, H);

    // 5) 피격 충격: 틀이 맞은 쪽으로 튀고, 그쪽 기둥에서 불티가 쏟아진다 (유리는 깨지지 않는다)
    if (me) {
      if (this.hpPrev !== null && me.hp < this.hpPrev - 3) {
        const amt = this.hpPrev - me.hp;
        let side = Math.random() < 0.5 ? -1 : 1;
        if (cb.hurtDir && s.camera) { _v.copy(cb.hurtDir).project(s.camera); side = (_v.z > 1 ? -_v.x : _v.x) < 0 ? -1 : 1; }
        this.joltDir = -side; this.jolt = Math.min(1, this.jolt + 0.35 + amt / 40);
        const n = Math.min(26, 8 + Math.round(amt * 0.8)), sx = side < 0 ? W * 0.05 : W * 0.95, sy = H * rnd(0.3, 0.6);
        for (let i = 0; i < n && this.sparks.length < 80; i++) this.sparks.push({ x: sx, y: sy + rnd(-30, 30) * u, vx: -side * rnd(120, 520) * u, vy: rnd(-260, 120) * u, t: 0, life: rnd(0.35, 0.8) });
      }
      this.hpPrev = me.hp;
    }
    if (this.sparks.length) {
      g.lineCap = "round";
      for (const q of this.sparks) {
        q.t += dt; q.vy += 900 * u * dt; const px = q.x, py = q.y; q.x += q.vx * dt; q.y += q.vy * dt;
        const a = clamp(1 - q.t / q.life, 0, 1);
        g.strokeStyle = `rgba(255,${Math.round(150 + 90 * a)},${Math.round(60 * a)},${a})`; g.lineWidth = 2.2 * u * a + 0.5;
        g.beginPath(); g.moveTo(px, py); g.lineTo(q.x, q.y); g.stroke();
      }
      this.sparks = this.sparks.filter((q) => q.t < q.life);
    }

    // 6) 경고등: 위 아치에 붙은 램프. 미사일 추적(빨강) · 지면 접근(주황) · 회피/부스터(파랑)
    const mis = cb && cb.missiles && cb.missiles.some((m) => m.target === me && m.pos.distanceTo(me.pos) < 140);
    const ground = agl < 3.5 && b.vel.y < -4.5 && !b.onGround;
    const boost = me && (me.dodgeT > 0 || me.boostT > 0);
    const blink = Math.floor(this.t * 6) % 2 === 0;
    const lamp = (x, col, on, label) => {
      g.fillStyle = on ? col : "rgba(60,66,78,0.9)";
      g.beginPath(); g.arc(x, top * 0.75, 4.5 * u, 0, TAU); g.fill();
      if (on) { g.globalAlpha = 0.35; g.beginPath(); g.arc(x, top * 0.75, 11 * u, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (on && label) h.text(label, x, top * 0.75 + 17 * u, { size: 10, align: "center", color: col, shadow: false });
    };
    lamp(W * 0.38, "#ff3b3b", mis && blink, mis ? "MISSILE" : "");
    lamp(W * 0.46, "#ffb02e", ground && blink, ground ? "PULL UP" : "");
    lamp(W * 0.54, "#5ab4ff", !!boost, "");
    lamp(W * 0.62, thr > 0.92 ? "#ffe14a" : "#3dff8c", true, "");
    g.restore();
    // 7) 가까운 폭발: 그 방향에서 주황 열기가 유리를 덮고 틀이 흔들린다
    const bl = s.fx && s.fx.lastBlast;
    if (bl && bl !== this._bl && bl.t < 0.2) {
      this._bl = bl;
      const d = bl.pos.distanceTo(b.pos), pw = clamp(bl.scale * 46 / Math.max(8, d), 0, 1);
      if (pw > 0.08) { _v.copy(bl.pos).project(s.camera); this.heatX = _v.z > 1 ? 0.5 : clamp(_v.x * 0.5 + 0.5, 0, 1); this.heat = Math.max(this.heat, pw); this.jolt = Math.min(1, this.jolt + pw * 0.6); this.joltDir = this.heatX < 0.5 ? 1 : -1; }
    }
    if (this.heat > 0.01) {
      const hx = this.heatX * W, hg = g.createRadialGradient(hx, H * 0.5, 0, hx, H * 0.5, W * (0.5 + this.heat * 0.5));
      hg.addColorStop(0, `rgba(255,190,90,${0.42 * this.heat})`); hg.addColorStop(0.5, `rgba(255,110,30,${0.2 * this.heat})`); hg.addColorStop(1, "rgba(255,80,20,0)");
      g.fillStyle = hg; g.fillRect(0, 0, W, H);
      this.heat = Math.max(0, this.heat - dt * 1.4);
    }
    if (ground) {
      this.warnT -= dt;
      if (this.warnT <= 0) { this.warnT = 0.55; try { s.game.sound.play("warn", 0.45); } catch (e) { /* 소리 없음 */ } }
      if (blink) h.text("PULL UP", W / 2, H * 0.36, { size: 26, align: "center", color: "#ffb02e" });
    }
    if (mis) { g.fillStyle = `rgba(255,40,40,${blink ? 0.07 : 0.02})`; g.fillRect(0, 0, W, H); }
  }

  reset() { this.sparks.length = 0; this.vPrev = null; this.hpPrev = null; this.g = 1; this.heat = 0; this.jolt = 0; }
}
