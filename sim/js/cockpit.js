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
    const top = 30 * u;
    this._visor(h, W, H, u, thr);                    // 미래형 바이저: 얇게 빛나는 틀선 · 모서리 브래킷 · 눈금 호
    this._dash(h, s, W, H, u, thr, kmh, agl, me);   // 홀로그램 계기판: 아래쪽 HUD 계기가 이 위에 뜬다
    // 유리: 가장자리 육각 격자 · 색수차 테 (한 번 그려 둔 그림) + 위아래로 지나가는 주사선
    g.drawImage(this._glass(W, H, u), 0, 0);
    if (!calm) { const sy = ((this.t * 0.18) % 1) * H; const sl = g.createLinearGradient(0, sy - 30 * u, 0, sy + 30 * u); sl.addColorStop(0, "rgba(90,220,255,0)"); sl.addColorStop(0.5, "rgba(90,220,255,0.035)"); sl.addColorStop(1, "rgba(90,220,255,0)"); g.fillStyle = sl; g.fillRect(0, sy - 30 * u, W, 60 * u); }
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
    const lamp = (x, col, on, label) => {   // 홀로그램 표시등: 작은 사다리꼴 칩
      const y = top * 0.62, w2 = 9 * u, hh = 3.2 * u;
      g.beginPath(); g.moveTo(x - w2, y - hh); g.lineTo(x + w2, y - hh); g.lineTo(x + w2 - 2.5 * u, y + hh); g.lineTo(x - w2 + 2.5 * u, y + hh); g.closePath();
      g.fillStyle = on ? col : "rgba(90,200,255,0.10)"; g.fill();
      g.strokeStyle = on ? col : "rgba(90,200,255,0.35)"; g.lineWidth = 1 * u; g.stroke();
      if (on) { g.save(); g.globalAlpha = 0.3; g.shadowColor = col; g.shadowBlur = 12 * u; g.fill(); g.restore(); }
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

  // 바이저 틀: 위아래 가장자리를 따라 휘어진 얇은 빛줄, 네 모서리 브래킷, 위쪽 눈금 호. 가장자리는 옅게 어두워져 깊이감
  _visor(h, W, H, u, thr) {
    const g = h.g, t = this.t, C = "rgba(90,220,255,", top = 30 * u;
    // 가장자리 어둠 (양옆·위)
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? 0 : W, eg = g.createLinearGradient(x0, 0, x0 - sd * W * 0.1, 0);
      eg.addColorStop(0, "rgba(4,10,20,0.55)"); eg.addColorStop(1, "rgba(4,10,20,0)");
      g.fillStyle = eg; g.fillRect(sd < 0 ? 0 : W - W * 0.1, 0, W * 0.1, H);
    }
    const tg = g.createLinearGradient(0, 0, 0, top * 2.2); tg.addColorStop(0, "rgba(4,10,20,0.6)"); tg.addColorStop(1, "rgba(4,10,20,0)");
    g.fillStyle = tg; g.fillRect(0, 0, W, top * 2.2);
    // 위쪽 바이저 선: 가운데가 처진 호 + 겹선
    g.save(); g.shadowColor = "rgba(90,220,255,0.8)"; g.shadowBlur = 8 * u;
    g.strokeStyle = C + "0.75)"; g.lineWidth = 1.6 * u;
    g.beginPath(); g.moveTo(W * 0.04, top * 0.55); g.quadraticCurveTo(W / 2, top * 1.7, W * 0.96, top * 0.55); g.stroke();
    g.restore();
    g.strokeStyle = C + "0.25)"; g.lineWidth = 1 * u;
    g.beginPath(); g.moveTo(W * 0.1, top * 0.95); g.quadraticCurveTo(W / 2, top * 2.05, W * 0.9, top * 0.95); g.stroke();
    // 눈금 호: 가운데 위, 스로틀만큼 밝아지는 짧은 눈금
    const n = 31;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), x = W * (0.3 + 0.4 * k), y = top * 0.55 + (top * 1.15) * (1 - Math.pow(2 * k - 1, 2)) * 0.5 + 5 * u;
      const on = k <= thr, big = i % 5 === 0;
      g.strokeStyle = on ? "rgba(120,255,200,0.85)" : C + "0.3)"; g.lineWidth = (big ? 1.6 : 1) * u;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (big ? 7 : 4) * u); g.stroke();
    }
    // 네 모서리 브래킷 (숨 쉬듯 밝기 변화)
    const br = 0.45 + 0.2 * Math.sin(t * 2), m = 14 * u, L = 34 * u;
    g.strokeStyle = C + br + ")"; g.lineWidth = 2 * u;
    for (const [x, y, sx, sy] of [[m, top * 1.3, 1, 1], [W - m, top * 1.3, -1, 1], [m, H * 0.74, 1, -1], [W - m, H * 0.74, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
      g.fillStyle = C + (br * 0.8) + ")"; g.fillRect(x + sx * 4 * u - (sx < 0 ? 3 * u : 0), y + sy * 4 * u - (sy < 0 ? 3 * u : 0), 3 * u, 3 * u);
    }
    // 양옆 세로 눈금줄 (고도·속도 느낌의 장식)
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? W * 0.035 : W * 0.965, y0 = H * 0.3, y1 = H * 0.62, off = (t * 18 * u) % (12 * u);
      g.strokeStyle = C + "0.22)"; g.lineWidth = 1 * u;
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
      for (let y = y0 + off; y < y1; y += 12 * u) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - sd * 5 * u, y); g.stroke(); }
    }
  }

  // 홀로그램 계기판: 아래를 가로지르는 반투명 빛 패널(윤곽선 + 옅은 육각 무늬 + 위로 번지는 빛). 가운데 스로틀 호, 양옆 시스템 표시
  _dash(h, s, W, H, u, thr, kmh, agl, me) {
    const g = h.g, cy = H - Math.min(124 * u, H * 0.19), sy = H - Math.min(80 * u, H * 0.12), t = this.t, C = "rgba(90,220,255,";
    const path = () => {
      g.beginPath(); g.moveTo(-10, sy + 18 * u); g.lineTo(W * 0.14, sy);
      g.lineTo(W * 0.33, sy); g.lineTo(W * 0.39, cy); g.lineTo(W * 0.61, cy); g.lineTo(W * 0.67, sy);
      g.lineTo(W * 0.86, sy); g.lineTo(W + 10, sy + 18 * u); g.lineTo(W + 10, H + 10); g.lineTo(-10, H + 10); g.closePath();
    };
    // 패널: 짙은 남색 반투명 + 위쪽으로 번지는 청록 빛
    const pg = g.createLinearGradient(0, cy, 0, H);
    pg.addColorStop(0, "rgba(20,60,90,0.42)"); pg.addColorStop(0.25, "rgba(6,16,30,0.62)"); pg.addColorStop(1, "rgba(3,8,16,0.78)");
    path(); g.fillStyle = pg; g.fill();
    g.save(); path(); g.clip();
    g.globalAlpha = 0.5; g.drawImage(this._hex(W, H, u), 0, 0); g.globalAlpha = 1;
    // 패널 위를 가로지르는 빛줄기
    const sx = ((t * 0.25) % 1.4 - 0.2) * W, sg = g.createLinearGradient(sx - 60 * u, 0, sx + 60 * u, 0);
    sg.addColorStop(0, "rgba(120,240,255,0)"); sg.addColorStop(0.5, "rgba(120,240,255,0.08)"); sg.addColorStop(1, "rgba(120,240,255,0)");
    g.fillStyle = sg; g.fillRect(0, cy, W, H - cy);
    g.restore();
    // 윤곽선: 빛나는 테 + 안쪽 겹선
    g.save(); g.shadowColor = "rgba(90,220,255,0.9)"; g.shadowBlur = 10 * u;
    path(); g.strokeStyle = C + "0.85)"; g.lineWidth = 1.5 * u; g.stroke(); g.restore();
    g.save(); g.translate(0, 6 * u); g.beginPath(); g.moveTo(W * 0.335, sy); g.lineTo(W * 0.392, cy); g.lineTo(W * 0.608, cy); g.lineTo(W * 0.665, sy);
    g.strokeStyle = C + "0.3)"; g.lineWidth = 1 * u; g.stroke(); g.restore();
    // 가운데: 스로틀 막대(빛 칸) + 속도 숫자
    const n = 18, x0 = W * 0.41, dx = (W * 0.18) / n, lit = Math.round(thr * n);
    for (let i = 0; i < n; i++) {
      const on = i < lit, col = i >= n - 3 ? "rgba(255,190,80," : "rgba(110,255,210,";
      g.fillStyle = on ? col + "0.9)" : C + "0.12)";
      g.beginPath(); g.moveTo(x0 + i * dx + 1.5 * u, cy + 9 * u); g.lineTo(x0 + (i + 1) * dx - 0.5 * u, cy + 9 * u); g.lineTo(x0 + (i + 1) * dx - 2 * u, cy + 14 * u); g.lineTo(x0 + i * dx, cy + 14 * u); g.closePath(); g.fill();
    }
    h.text("PWR", x0 - 8 * u, cy + 11.5 * u, { size: 8, align: "right", base: "middle", color: C + "0.75)", shadow: false });
    h.text(`${Math.round(thr * 100)}%`, W * 0.59 + 8 * u, cy + 11.5 * u, { size: 8, base: "middle", mono: true, color: C + "0.85)", shadow: false });
    // 양옆: 시스템 상태 글자 (깜빡이는 커서)
    const hp = me ? me.hp / me.maxHp : 1, st = hp < 0.35 ? ["HULL CRIT", "#ff5a5a"] : agl < 6 ? ["ALT LOW", "#ffb02e"] : ["SYS NOMINAL", "rgba(110,255,210,0.85)"];
    const cur = Math.floor(t * 2) % 2 ? "_" : " ";
    h.text(`${st[0]}${cur}`, W * 0.16, sy + 10 * u, { size: 9, base: "middle", mono: true, color: st[1], shadow: false });
    h.text(`SPD ${String(Math.round(kmh)).padStart(3, "0")}  ALT ${String(Math.round(agl)).padStart(3, "0")}`, W * 0.84, sy + 10 * u, { size: 9, align: "right", base: "middle", mono: true, color: C + "0.75)", shadow: false });
  }

  // 육각 격자 무늬 (계기판 안쪽용, 화면 크기가 바뀔 때만)
  _hex(W, H, u) {
    if (this._hx && this._hx.width === W && this._hx.height === H) return this._hx;
    const c = this._hx || (this._hx = document.createElement("canvas")); c.width = W; c.height = H;
    const g = c.getContext("2d"), r = 9 * u, dx = r * 1.732, dy = r * 1.5;
    g.clearRect(0, 0, W, H); g.strokeStyle = "rgba(90,220,255,0.12)"; g.lineWidth = Math.max(0.6, 0.8 * u);
    for (let row = 0, y = H * 0.75; y < H + r; row++, y += dy) for (let x = (row % 2) * dx / 2; x < W + dx; x += dx) {
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.stroke();
    }
    return c;
  }

  // 바이저 유리: 가장자리 옅은 청록 틴트 · 구석의 육각 격자 · 가장자리 색수차(분홍/청록 얇은 테)
  _glass(W, H, u) {
    if (this._gl && this._gl.width === W && this._gl.height === H) return this._gl;
    const c = this._gl || (this._gl = document.createElement("canvas"));
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.clearRect(0, 0, W, H);
    const tg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.38, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
    tg.addColorStop(0, "rgba(60,180,255,0)"); tg.addColorStop(1, "rgba(60,180,255,0.08)");
    g.fillStyle = tg; g.fillRect(0, 0, W, H);
    // 구석 육각 격자: 모서리에서 멀어질수록 사라진다
    const r = 11 * u, dx = r * 1.732, dy = r * 1.5;
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H * 0.8], [W, H * 0.8]]) {
      for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
        const x = cx + col * dx + (row % 2) * dx / 2, y = cy + row * dy, d = Math.hypot(x - cx, y - cy) / (r * 9);
        if (d > 1 || x < -r || x > W + r || y < -r || y > H + r) continue;
        g.strokeStyle = `rgba(90,220,255,${0.1 * (1 - d)})`; g.lineWidth = Math.max(0.6, 0.8 * u);
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.stroke();
      }
    }
    // 색수차 테: 화면 가장자리 안쪽으로 분홍·청록 얇은 선
    g.lineWidth = 1 * u;
    g.strokeStyle = "rgba(255,80,200,0.12)"; g.strokeRect(5 * u, 5 * u, W - 10 * u, H - 10 * u);
    g.strokeStyle = "rgba(80,240,255,0.12)"; g.strokeRect(7 * u, 7 * u, W - 14 * u, H - 14 * u);
    return c;
  }

  reset() { this.sparks.length = 0; this.vPrev = null; this.hpPrev = null; this.g = 1; this.heat = 0; this.jolt = 0; }
}
