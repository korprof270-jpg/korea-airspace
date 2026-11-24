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
    this._coarse = matchMedia("(pointer: coarse)").matches;
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
    if (grey < 0.01 && lowHp <= 0) {   // 평소 비네트는 고정 그림으로 (전체 화면 그라데이션을 매 프레임 만들지 않는다)
      const key = `${W}x${H}`;
      if (!this._vgC || this._vgK !== key) {
        const c = this._vgC || (this._vgC = document.createElement("canvas")), sc = 0.5; c.width = Math.round(W * sc); c.height = Math.round(H * sc); this._vgK = key;
        const q = c.getContext("2d"), r = q.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.42, c.width / 2, c.height / 2, Math.hypot(c.width, c.height) * 0.56);
        r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(4,6,10,0.38)"); q.fillStyle = r; q.fillRect(0, 0, c.width, c.height);
      }
      g.drawImage(this._vgC, 0, 0, W, H);
    } else {
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.42 - grey * 0.18), W / 2, H / 2, Math.hypot(W, H) * 0.56);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(${lowHp > 0 ? Math.round(40 + 80 * lowHp) : 4},6,10,${0.38 + grey * 0.55})`);
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
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
    const top = 30 * u;
    // 바이저 틀·홀로 계기판·유리 무늬처럼 움직이지 않는 부분은 한 장으로 그려 두고 붙인다 (휴대폰 2D 캔버스 부담 ↓)
    g.drawImage(this._layer(h, W, H, u), 0, 0, W, H);
    this._dyn(h, s, W, H, u, thr, kmh, agl, me);
    // 4) 유리 반사광: 기수 방향·롤에 따라 미끄러지는 사선 빛
    const yaw = b.heading || 0, roll = this.sway.r * 20;
    const gx = ((yaw * 0.9 + roll * 0.6) / TAU % 1 + 1) % 1 * (W * 1.6) - W * 0.3;
    const gl = g.createLinearGradient(gx - 90 * u, 0, gx + 90 * u, H);
    gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,255,255,0.055)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    if (!this._coarse) { g.fillStyle = gl; g.fillRect(0, 0, W, H); }   // 휴대폰에서는 유리 반사광을 생략 (전체 화면 칠하기 1회 절약)

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
    const lamp = (x, col, on, label) => {   // 홀로그램 표시등: 작은 사다리꼴 칩
      const y = top * 0.62, w2 = 9 * u, hh = 3.2 * u;
      g.beginPath(); g.moveTo(x - w2, y - hh); g.lineTo(x + w2, y - hh); g.lineTo(x + w2 - 2.5 * u, y + hh); g.lineTo(x - w2 + 2.5 * u, y + hh); g.closePath();
      g.fillStyle = on ? col : "rgba(90,200,255,0.10)"; g.fill();
      g.strokeStyle = on ? col : "rgba(90,200,255,0.35)"; g.lineWidth = 1 * u; g.stroke();
      if (on) { g.save(); g.globalAlpha = 0.25; g.lineWidth = 5 * u; g.strokeStyle = col; g.stroke(); g.restore(); }
      if (on && label) h.text(label, x, y + 15 * u, { size: 10, align: "center", color: col, shadow: false });
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

  // 고정 그림(화면 크기·배율이 바뀔 때만 새로): 가장자리 어둠, 바이저 호, 모서리 브래킷, 옆 눈금줄, 계기판 몸체·육각 무늬·윤곽, 유리 무늬
  _layer(h, W, H, u) {
    const dpr = Math.min(h.dpr || 1, 1.5), key = `${W}x${H}x${u.toFixed(3)}x${dpr}`;
    if (this._ly && this._lyK === key) return this._ly;
    const c = this._ly || (this._ly = document.createElement("canvas"));
    this._lyK = key; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const C = "rgba(90,220,255,", top = 30 * u;
    const glow = (path, col, w) => { g.strokeStyle = col.replace(/[\d.]+\)$/, "0.18)"); g.lineWidth = w * 4; path(); g.stroke(); g.strokeStyle = col; g.lineWidth = w; path(); g.stroke(); };
    // 가장자리 어둠
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? 0 : W, eg = g.createLinearGradient(x0, 0, x0 - sd * W * 0.1, 0);
      eg.addColorStop(0, "rgba(4,10,20,0.55)"); eg.addColorStop(1, "rgba(4,10,20,0)");
      g.fillStyle = eg; g.fillRect(sd < 0 ? 0 : W - W * 0.1, 0, W * 0.1, H);
    }
    const tg = g.createLinearGradient(0, 0, 0, top * 2.2); tg.addColorStop(0, "rgba(4,10,20,0.6)"); tg.addColorStop(1, "rgba(4,10,20,0)");
    g.fillStyle = tg; g.fillRect(0, 0, W, top * 2.2);
    // 바이저 호
    glow(() => { g.beginPath(); g.moveTo(W * 0.04, top * 0.55); g.quadraticCurveTo(W / 2, top * 1.7, W * 0.96, top * 0.55); }, C + "0.75)", 1.6 * u);
    g.strokeStyle = C + "0.25)"; g.lineWidth = 1 * u;
    g.beginPath(); g.moveTo(W * 0.1, top * 0.95); g.quadraticCurveTo(W / 2, top * 2.05, W * 0.9, top * 0.95); g.stroke();
    // 모서리 브래킷
    const m = 14 * u, L = 34 * u;
    g.strokeStyle = C + "0.55)"; g.lineWidth = 2 * u; g.fillStyle = C + "0.45)";
    for (const [x, y, sx, sy] of [[m, top * 1.3, 1, 1], [W - m, top * 1.3, -1, 1], [m, H * 0.74, 1, -1], [W - m, H * 0.74, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
      g.fillRect(x + sx * 4 * u - (sx < 0 ? 3 * u : 0), y + sy * 4 * u - (sy < 0 ? 3 * u : 0), 3 * u, 3 * u);
    }
    // 옆 눈금줄
    g.strokeStyle = C + "0.22)"; g.lineWidth = 1 * u;
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? W * 0.035 : W * 0.965, y0 = H * 0.3, y1 = H * 0.62;
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1);
      for (let y = y0; y < y1; y += 12 * u) { g.moveTo(x, y); g.lineTo(x - sd * 5 * u, y); }
      g.stroke();
    }
    // 계기판 몸체
    const cy = H - Math.min(124 * u, H * 0.19), sy = H - Math.min(80 * u, H * 0.12);
    this._dy = { cy, sy };
    const path = () => {
      g.beginPath(); g.moveTo(-10, sy + 18 * u); g.lineTo(W * 0.14, sy);
      g.lineTo(W * 0.33, sy); g.lineTo(W * 0.39, cy); g.lineTo(W * 0.61, cy); g.lineTo(W * 0.67, sy);
      g.lineTo(W * 0.86, sy); g.lineTo(W + 10, sy + 18 * u); g.lineTo(W + 10, H + 10); g.lineTo(-10, H + 10); g.closePath();
    };
    const pg = g.createLinearGradient(0, cy, 0, H);
    pg.addColorStop(0, "rgba(20,60,90,0.42)"); pg.addColorStop(0.25, "rgba(6,16,30,0.62)"); pg.addColorStop(1, "rgba(3,8,16,0.78)");
    path(); g.fillStyle = pg; g.fill();
    // 육각 무늬 (계기판 안)
    g.save(); path(); g.clip();
    const r = 9 * u, dx = r * 1.732, dyy = r * 1.5;
    g.strokeStyle = "rgba(90,220,255,0.07)"; g.lineWidth = Math.max(0.6, 0.8 * u); g.beginPath();
    for (let row = 0, y = cy - r; y < H + r; row++, y += dyy) for (let x = (row % 2) * dx / 2; x < W + dx; x += dx)
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke(); g.restore();
    glow(path, C + "0.85)", 1.5 * u);
    g.beginPath(); g.moveTo(W * 0.335, sy + 6 * u); g.lineTo(W * 0.392, cy + 6 * u); g.lineTo(W * 0.608, cy + 6 * u); g.lineTo(W * 0.665, sy + 6 * u);
    g.strokeStyle = C + "0.3)"; g.lineWidth = 1 * u; g.stroke();
    // 유리: 가장자리 틴트, 구석 육각 격자, 색수차 테
    const gt = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.38, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
    gt.addColorStop(0, "rgba(60,180,255,0)"); gt.addColorStop(1, "rgba(60,180,255,0.08)");
    g.fillStyle = gt; g.fillRect(0, 0, W, H);
    const R = 11 * u, DX = R * 1.732, DY = R * 1.5;
    for (const [cx0, cy0] of [[0, 0], [W, 0], [0, H * 0.8], [W, H * 0.8]]) for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
      const x = cx0 + col * DX + (row % 2) * DX / 2, y = cy0 + row * DY, d = Math.hypot(x - cx0, y - cy0) / (R * 9);
      if (d > 1 || x < -R || x > W + R || y < -R || y > H + R) continue;
      g.strokeStyle = `rgba(90,220,255,${0.1 * (1 - d)})`; g.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.stroke();
    }
    g.lineWidth = 1 * u;
    g.strokeStyle = "rgba(255,80,200,0.12)"; g.strokeRect(5 * u, 5 * u, W - 10 * u, H - 10 * u);
    g.strokeStyle = "rgba(80,240,255,0.12)"; g.strokeRect(7 * u, 7 * u, W - 14 * u, H - 14 * u);
    return c;
  }

  // 매 프레임 바뀌는 것만: 눈금 호(스로틀), 계기판 빛줄기, PWR 칸, 글자
  _dyn(h, s, W, H, u, thr, kmh, agl, me) {
    const g = h.g, t = this.t, C = "rgba(90,220,255,", top = 30 * u, D = this._dy || { cy: H * 0.81, sy: H * 0.88 }, cy = D.cy, sy = D.sy;
    // 눈금 호: 켜진 것·꺼진 것을 각각 한 번에 긋는다
    const n = 31, on = [], off = [];
    for (let i = 0; i < n; i++) { const k = i / (n - 1); (k <= thr ? on : off).push([W * (0.3 + 0.4 * k), top * 0.55 + (top * 1.15) * (1 - Math.pow(2 * k - 1, 2)) * 0.5 + 5 * u, i % 5 === 0]); }
    for (const [L, col] of [[on, "rgba(120,255,200,0.85)"], [off, C + "0.3)"]]) {
      if (!L.length) continue;
      g.strokeStyle = col; g.lineWidth = 1.2 * u; g.beginPath();
      for (const [x, y, big] of L) { g.moveTo(x, y); g.lineTo(x, y + (big ? 7 : 4) * u); }
      g.stroke();
    }
    // 계기판 위 빛줄기 (계기판 높이만큼만 칠한다)
    if (!(settings.fx && settings.fx.reduceMotion)) {
      const sx = ((t * 0.25) % 1.4 - 0.2) * W, sg = g.createLinearGradient(sx - 60 * u, 0, sx + 60 * u, 0);
      sg.addColorStop(0, "rgba(120,240,255,0)"); sg.addColorStop(0.5, "rgba(120,240,255,0.07)"); sg.addColorStop(1, "rgba(120,240,255,0)");
      g.fillStyle = sg; g.fillRect(sx - 60 * u, cy, 120 * u, H - cy);
    }
    // PWR 칸
    const m = 18, x0 = W * 0.41, dx = (W * 0.18) / m, lit = Math.round(thr * m);
    for (const [a, b2, col] of [[0, Math.min(lit, m - 3), "rgba(110,255,210,0.9)"], [m - 3, lit, "rgba(255,190,80,0.9)"], [lit, m, C + "0.12)"]]) {
      if (b2 <= a) continue;
      g.fillStyle = col; g.beginPath();
      for (let i = a; i < b2; i++) { g.moveTo(x0 + i * dx + 1.5 * u, cy + 9 * u); g.lineTo(x0 + (i + 1) * dx - 0.5 * u, cy + 9 * u); g.lineTo(x0 + (i + 1) * dx - 2 * u, cy + 14 * u); g.lineTo(x0 + i * dx, cy + 14 * u); g.closePath(); }
      g.fill();
    }
    h.text("PWR", x0 - 8 * u, cy + 11.5 * u, { size: 8, align: "right", base: "middle", color: C + "0.75)", shadow: false });
    h.text(`${Math.round(thr * 100)}%`, W * 0.59 + 8 * u, cy + 11.5 * u, { size: 8, base: "middle", mono: true, color: C + "0.85)", shadow: false });
    const hp = me ? me.hp / me.maxHp : 1, st = hp < 0.35 ? ["HULL CRIT", "#ff5a5a"] : agl < 6 ? ["ALT LOW", "#ffb02e"] : ["SYS NOMINAL", "rgba(110,255,210,0.85)"];
    h.text(`${st[0]}${Math.floor(t * 2) % 2 ? "_" : " "}`, W * 0.16, sy + 10 * u, { size: 9, base: "middle", mono: true, color: st[1], shadow: false });
    h.text(`SPD ${String(Math.round(kmh)).padStart(3, "0")}  ALT ${String(Math.round(agl)).padStart(3, "0")}`, W * 0.84, sy + 10 * u, { size: 9, align: "right", base: "middle", mono: true, color: C + "0.75)", shadow: false });
  }

  reset() { this.sparks.length = 0; this.vPrev = null; this.hpPrev = null; this.g = 1; this.heat = 0; this.jolt = 0; }
}
