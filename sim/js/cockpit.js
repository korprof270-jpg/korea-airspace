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
    const fw = 16 * u, top = 30 * u;
    this._dash(h, s, W, H, u, thr, kmh, agl, me);   // 계기판(글레어 실드): 아래쪽 HUD 계기가 이 위에 얹힌다
    g.fillStyle = "rgba(14,18,26,0.86)";
    // 위 아치
    g.beginPath(); g.moveTo(-10, -10); g.lineTo(W + 10, -10); g.lineTo(W + 10, top * 0.4);
    g.quadraticCurveTo(W / 2, top * 1.6, -10, top * 0.4); g.closePath(); g.fill();
    // 왼쪽·오른쪽 기둥 (아래로 갈수록 바깥으로 벌어진다)
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? 0 : W;
      g.beginPath();
      g.moveTo(x0, top * 0.3); g.lineTo(x0 + sd * -W * 0.085, top * 0.9);
      g.lineTo(x0 + sd * -W * 0.034, H * 0.62); g.lineTo(x0 + sd * -fw * 0.9, H + 10); g.lineTo(x0 + sd * 10, H + 10); g.closePath();
      g.fill();
      // 기둥 안쪽 모서리 빛
      g.strokeStyle = "rgba(120,200,255,0.22)"; g.lineWidth = 1.5 * u;
      g.beginPath(); g.moveTo(x0 + sd * -W * 0.085, top * 0.9); g.lineTo(x0 + sd * -W * 0.034, H * 0.62); g.lineTo(x0 + sd * -fw * 0.9, H); g.stroke();
      // 기둥 손잡이(그립 바)
      g.strokeStyle = "rgba(40,46,58,0.95)"; g.lineWidth = 5 * u; g.lineCap = "round";
      g.beginPath(); g.moveTo(x0 + sd * -W * 0.062, H * 0.2); g.lineTo(x0 + sd * -W * 0.045, H * 0.44); g.stroke();
      g.strokeStyle = "rgba(150,170,195,0.25)"; g.lineWidth = 1.2 * u;
      g.beginPath(); g.moveTo(x0 + sd * -W * 0.062 - sd * 1.5 * u, H * 0.2); g.lineTo(x0 + sd * -W * 0.045 - sd * 1.5 * u, H * 0.44); g.stroke(); g.lineCap = "butt";
      // 리벳
      g.fillStyle = "rgba(160,180,200,0.35)";
      for (let i = 1; i < 6; i++) { const k = i / 6, x = x0 + sd * -(W * 0.085 * (1 - k) + W * 0.034 * k) * 0.55, y = top * 0.9 + (H * 0.62 - top * 0.9) * k; g.beginPath(); g.arc(x, y, 1.6 * u, 0, TAU); g.fill(); }
      g.fillStyle = "rgba(14,18,26,0.86)";
    }
    g.strokeStyle = "rgba(120,200,255,0.18)"; g.lineWidth = 1.5 * u;
    g.beginPath(); g.moveTo(W * 0.085, top * 0.9); g.quadraticCurveTo(W / 2, top * 1.6 + 1, W * 0.915, top * 0.9); g.stroke();
    // 캐노피 앞 기둥(가운데 위 프레임 연결부) + 백미러 자리
    g.fillStyle = "rgba(14,18,26,0.9)";
    g.beginPath(); g.moveTo(W / 2 - 34 * u, top * 1.1); g.lineTo(W / 2 + 34 * u, top * 1.1); g.lineTo(W / 2 + 22 * u, top * 1.62); g.lineTo(W / 2 - 22 * u, top * 1.62); g.closePath(); g.fill();
    g.strokeStyle = "rgba(120,200,255,0.2)"; g.lineWidth = 1 * u; g.stroke();

    // 유리: 가장자리 옅은 청록 틴트 + 얼룩·잔기스 (한 번 그려 둔 그림을 얹는다)
    g.drawImage(this._glass(W, H, u), 0, 0);
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

  // 계기판: 화면 아래를 가로지르는 글레어 실드. 가운데가 솟은 덮개, 윗면 테두리 빛, 상태등, 스위치, 유리에 비친 계기 불빛
  _dash(h, s, W, H, u, thr, kmh, agl, me) {
    const g = h.g, cy = H - Math.min(132 * u, H * 0.2), sy = H - Math.min(86 * u, H * 0.13), t = this.t;
    // 유리에 비친 계기 불빛 (덮개 위로 번지는 청록 반사)
    const rf = g.createLinearGradient(0, cy - 70 * u, 0, cy + 6 * u);
    rf.addColorStop(0, "rgba(60,200,255,0)"); rf.addColorStop(1, "rgba(60,200,255,0.07)");
    g.fillStyle = rf; g.fillRect(W * 0.2, cy - 70 * u, W * 0.6, 76 * u);
    // 몸체
    const path = () => {
      g.beginPath(); g.moveTo(-10, H + 10); g.lineTo(-10, sy + 14 * u); g.lineTo(W * 0.16, sy);
      g.bezierCurveTo(W * 0.3, sy - 4 * u, W * 0.32, cy, W * 0.4, cy);
      g.lineTo(W * 0.6, cy); g.bezierCurveTo(W * 0.68, cy, W * 0.7, sy - 4 * u, W * 0.84, sy);
      g.lineTo(W + 10, sy + 14 * u); g.lineTo(W + 10, H + 10); g.closePath();
    };
    const pg = g.createLinearGradient(0, cy, 0, H);
    pg.addColorStop(0, "rgba(30,36,48,0.97)"); pg.addColorStop(0.18, "rgba(16,20,28,0.97)"); pg.addColorStop(1, "rgba(8,10,15,0.98)");
    path(); g.fillStyle = pg; g.fill();
    // 윗면 테두리: 가는 빛줄 + 아래 그림자
    g.save(); path(); g.clip();
    g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineWidth = 6 * u; path(); g.stroke();
    // 덮개 안쪽 무늬(가로 홈)
    g.strokeStyle = "rgba(255,255,255,0.035)"; g.lineWidth = 1 * u;
    for (let i = 1; i < 5; i++) { const y = cy + i * 9 * u; g.beginPath(); g.moveTo(W * 0.41, y); g.lineTo(W * 0.59, y); g.stroke(); }
    g.restore();
    // 윗면(두께감): 테두리 바로 아래 밝은 띠 → 앞면으로 꺾이는 모서리
    g.save(); path(); g.clip();
    const tb = g.createLinearGradient(0, cy, 0, cy + 22 * u);
    tb.addColorStop(0, "rgba(70,82,104,0.9)"); tb.addColorStop(0.7, "rgba(40,48,62,0.6)"); tb.addColorStop(1, "rgba(0,0,0,0)");
    g.translate(0, 0); g.fillStyle = tb; g.fillRect(0, cy - 2, W, 24 * u + (sy - cy));
    g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 2 * u; g.translate(0, 18 * u); path(); g.stroke();
    g.restore();
    path(); g.strokeStyle = "rgba(110,210,255,0.55)"; g.lineWidth = 1.6 * u; g.stroke();
    // 덮개 위 상태등 줄: 스로틀만큼 차는 막대 + 깜빡이는 점
    const n = 14, x0 = W * 0.42, dx = (W * 0.16) / (n - 1), lit = Math.round(thr * n);
    for (let i = 0; i < n; i++) {
      const on = i < lit, col = i > n * 0.85 ? "#ffb02e" : "#3dff8c";
      g.fillStyle = on ? col : "rgba(60,70,84,0.9)";
      g.fillRect(x0 + i * dx - 2.2 * u, cy + 6 * u, 4.4 * u, 3 * u);
    }
    h.text("THR", x0 - 12 * u, cy + 8 * u, { size: 8, align: "right", base: "middle", color: "rgba(150,170,195,0.7)", shadow: false });
    h.text(`${Math.round(kmh)}`, W * 0.6 + 12 * u, cy + 8 * u, { size: 8, base: "middle", mono: true, color: "rgba(150,210,255,0.75)", shadow: false });
    // 양옆 날개: 토글 스위치 · 작은 표시등 (깜빡임은 느리게)
    for (const sd of [-1, 1]) {
      const bx = sd < 0 ? W * 0.205 : W * 0.795;
      for (let i = 0; i < 4; i++) {
        const x = bx + sd * (i - 1.5) * 13 * u, y = sy - 4 * u + Math.abs(i - 1.5) * 0.8 * u;
        g.fillStyle = "rgba(70,78,92,0.95)"; g.fillRect(x - 3 * u, y - 1 * u, 6 * u, 5 * u);
        g.fillStyle = "rgba(190,200,215,0.8)"; g.fillRect(x - 1 * u, y - 5 * u, 2 * u, 5 * u);
        const on = ((i + (sd > 0 ? 2 : 0)) % 3 !== 0) || Math.floor(t * 1.3 + i) % 2 === 0;
        g.fillStyle = on ? (i === 3 && me && me.hp < me.maxHp * 0.35 ? "#ff4a4a" : "#5ab4ff") : "rgba(50,60,74,0.9)";
        g.beginPath(); g.arc(x, y + 9 * u, 1.6 * u, 0, TAU); g.fill();
      }
    }
    // 낮은 고도면 덮개 끝에 주황 띠
    if (agl < 6) { g.fillStyle = `rgba(255,170,40,${0.25 + 0.2 * Math.sin(t * 10)})`; g.fillRect(W * 0.4, cy - 1 * u, W * 0.2, 2 * u); }
  }

  // 유리 얼룩: 화면 크기가 바뀔 때만 새로 그린다
  _glass(W, H, u) {
    if (this._gl && this._gl.width === W && this._gl.height === H) return this._gl;
    const c = this._gl || (this._gl = document.createElement("canvas"));
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.clearRect(0, 0, W, H);
    const tg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
    tg.addColorStop(0, "rgba(80,200,220,0)"); tg.addColorStop(1, "rgba(80,200,220,0.07)");
    g.fillStyle = tg; g.fillRect(0, 0, W, H);
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // 잔기스: 가장자리 쪽에 짧고 흐린 선
    g.lineCap = "round";
    for (let i = 0; i < 70; i++) {
      const edge = r() < 0.5, x = edge ? (r() < 0.5 ? r() * W * 0.18 : W - r() * W * 0.18) : r() * W, y = edge ? r() * H : (r() < 0.6 ? r() * H * 0.2 : H * 0.62 + r() * H * 0.2);
      const a = r() * TAU, L = (6 + r() * 22) * u;
      g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.lineWidth = 0.6 * u + r() * 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    // 물방울·먼지 얼룩
    for (let i = 0; i < 26; i++) {
      const x = r() < 0.5 ? r() * W * 0.22 : W - r() * W * 0.22, y = r() * H * 0.85, rr = (3 + r() * 10) * u;
      const sg = g.createRadialGradient(x, y, 0, x, y, rr);
      sg.addColorStop(0, "rgba(255,255,255,0.05)"); sg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = sg; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    return c;
  }

  reset() { this.sparks.length = 0; this.vPrev = null; this.hpPrev = null; this.g = 1; this.heat = 0; this.jolt = 0; }
}
