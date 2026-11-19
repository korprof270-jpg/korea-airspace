// 조종석 효과 (1인칭 FPV 시점 전용): 캐노피 틀과 기둥, 유리 반사광, 속도선, G 포스 시야 흐림,
// 피격 유리 금, 낮은 체력 심장 박동, 미사일 경고등, 지면 접근 경고, 엔진 진동. HUD 캔버스 맨 아래층에 그린다
import { settings, clamp } from "./config.js";

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Cockpit {
  constructor() {
    this.lines = Array.from({ length: 34 }, () => ({ a: Math.random() * TAU, r: Math.random(), w: rnd(0.6, 1.6) }));
    this.cracks = [];         // { x, y, segs: [[x0,y0,x1,y1]...], t, life }
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
    const sp = clamp((kmh - 55) / 90, 0, 1);
    if (sp > 0) {
      const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
      g.save(); g.lineCap = "round";
      for (const L of this.lines) {
        if (!calm) { L.r += dt * (0.6 + sp * 2.2); if (L.r > 1) { L.r = 0.25; L.a = Math.random() * TAU; } }
        const r0 = R * (0.45 + L.r * 0.55), r1 = r0 + R * (0.06 + sp * 0.16);
        g.globalAlpha = sp * 0.32 * (1 - L.r * 0.6);
        g.strokeStyle = "#e8f4ff"; g.lineWidth = L.w * u;
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
    g.save(); g.translate(jx, jy);
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
    const yaw = b.heading || 0, roll = s.player.roll || 0;
    const gx = ((yaw * 0.9 + roll * 0.6) / TAU % 1 + 1) % 1 * (W * 1.6) - W * 0.3;
    const gl = g.createLinearGradient(gx - 90 * u, 0, gx + 90 * u, H);
    gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,255,255,0.055)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(0, 0, W, H);

    // 5) 유리 금: 맞을 때 생기고 서서히 옅어진다. 체력 25% 이하면 몇 줄은 남는다
    if (me) {
      if (this.hpPrev !== null && me.hp < this.hpPrev - 6 && this.cracks.length < 7) this._crack(W, H, u, cb);
      this.hpPrev = me.hp;
    }
    for (const c of this.cracks) c.t += dt;
    const keep = me && me.hp / me.maxHp <= 0.25 ? 2 : 0;
    this.cracks = this.cracks.filter((c, i) => c.t < c.life || i < keep);
    for (const c of this.cracks) {
      const a = c.t < c.life ? clamp(1 - (c.t - c.life * 0.5) / (c.life * 0.5), 0, 1) : 0.35;
      g.strokeStyle = `rgba(230,240,255,${0.55 * a})`; g.lineWidth = 1.2 * u;
      g.beginPath(); for (const q of c.segs) { g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); } g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.18 * a})`; g.beginPath(); g.arc(c.x, c.y, 5 * u, 0, TAU); g.fill();
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
    if (ground) {
      this.warnT -= dt;
      if (this.warnT <= 0) { this.warnT = 0.55; try { s.game.sound.play("warn", 0.45); } catch (e) { /* 소리 없음 */ } }
      if (blink) h.text("PULL UP", W / 2, H * 0.36, { size: 26, align: "center", color: "#ffb02e" });
    }
    if (mis) { g.fillStyle = `rgba(255,40,40,${blink ? 0.07 : 0.02})`; g.fillRect(0, 0, W, H); }
  }

  // 화면 가장자리 쪽에 방사형 금 하나
  _crack(W, H, u, cb) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = W / 2 + side * rnd(0.18, 0.4) * W, y = rnd(0.2, 0.75) * H, segs = [];
    const arms = 5 + (Math.random() * 3 | 0);
    for (let i = 0; i < arms; i++) {
      let a = (i / arms) * TAU + rnd(-0.3, 0.3), px = x, py = y;
      const n = 3 + (Math.random() * 3 | 0);
      for (let k = 0; k < n; k++) {
        const L = rnd(14, 34) * u * (1 - k * 0.15), nx = px + Math.cos(a) * L, ny = py + Math.sin(a) * L;
        segs.push([px, py, nx, ny]);
        if (Math.random() < 0.35) { const b = a + rnd(-1, 1); segs.push([nx, ny, nx + Math.cos(b) * L * 0.6, ny + Math.sin(b) * L * 0.6]); }
        px = nx; py = ny; a += rnd(-0.45, 0.45);
      }
    }
    this.cracks.push({ x, y, segs, t: 0, life: 6 });
  }

  reset() { this.cracks.length = 0; this.vPrev = null; this.hpPrev = null; this.g = 1; }
}
