// HUD(OSD): 2D 캔버스에 비행 정보·마커·메시지를 그린다
import * as THREE from "../vendor/three.module.min.js";
import { settings, FLIGHT_MODE_INFO, clamp } from "./config.js";
import { CAMERA_NAMES } from "./player.js";

const _v = new THREE.Vector3();
const _e = new THREE.Euler();
const FONT = `"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
const MONO = `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`;

export class Hud {
  constructor(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext("2d");
    this.toasts = [];
    this.feedLines = [];
    this.W = 1; this.H = 1; this.u = 1;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = this.cv.clientWidth || innerWidth; this.H = this.cv.clientHeight || innerHeight;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.dpr = dpr;
    this.u = clamp(Math.min(this.H / 720, this.W / 900), 0.62, 1.7);
  }

  clear() { this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.g.clearRect(0, 0, this.W, this.H); }

  // ── 그리기 도구 ──
  text(s, x, y, o = {}) {
    const g = this.g;
    g.font = `${o.bold === false ? 500 : 700} ${(o.size || 16) * this.u}px ${o.mono ? MONO : FONT}`;
    g.textAlign = o.align || "left";
    g.textBaseline = o.base || "alphabetic";
    if (o.shadow !== false) { g.fillStyle = "rgba(0,0,0,0.65)"; g.fillText(s, x + 1.5, y + 1.5); }
    g.fillStyle = o.color || "#fff";
    g.fillText(s, x, y);
  }

  panel(x, y, w, h, color = "rgba(8,12,20,0.55)", r = 8) {
    const g = this.g;
    g.fillStyle = color;
    g.beginPath(); g.roundRect(x, y, w, h, r * this.u); g.fill();
  }

  bar(x, y, w, h, frac, color, bg = "rgba(255,255,255,0.14)") {
    const g = this.g;
    g.fillStyle = bg; g.fillRect(x, y, w, h);
    g.fillStyle = color; g.fillRect(x, y, w * clamp(frac, 0, 1), h);
  }

  toast(text, color = "#fff", dur = 1.6, size = 30) { this.toasts.push({ text, color, t: 0, dur, size }); if (this.toasts.length > 3) this.toasts.shift(); }
  feed(text, color = "#fff") { this.feedLines.push({ text, color, t: 0 }); if (this.feedLines.length > 6) this.feedLines.shift(); }

  // 월드 좌표 → 화면 좌표. 뒤쪽이면 front=false
  project(p, cam, out) {
    _v.copy(p).applyMatrix4(cam.matrixWorldInverse);
    const front = _v.z < 0;
    _v.applyMatrix4(cam.projectionMatrix);
    out.x = (_v.x * 0.5 + 0.5) * this.W; out.y = (-_v.y * 0.5 + 0.5) * this.H; out.front = front;
    out.on = front && out.x > 0 && out.x < this.W && out.y > 0 && out.y < this.H;
    return out;
  }

  // 목표 마커: 화면 안이면 마름모+거리, 밖이면 가장자리 화살표
  marker(p, cam, color, label, dist) {
    const g = this.g, u = this.u, s = this._s || (this._s = {});
    this.project(p, cam, s);
    if (s.on) {
      const r = 9 * u;
      g.strokeStyle = color; g.lineWidth = 2.5 * u;
      g.beginPath(); g.moveTo(s.x, s.y - r); g.lineTo(s.x + r, s.y); g.lineTo(s.x, s.y + r); g.lineTo(s.x - r, s.y); g.closePath(); g.stroke();
      if (label) this.text(label, s.x, s.y - r - 6 * u, { size: 13, align: "center", color });
      if (dist !== undefined) this.text(`${dist.toFixed(0)}m`, s.x, s.y + r + 15 * u, { size: 12, align: "center", color, mono: true });
    } else {
      let dx = s.x - this.W / 2, dy = s.y - this.H / 2;
      if (!s.front) { dx = -dx; dy = -dy; }
      const a = Math.atan2(dy, dx), m = 46 * u;
      const k = Math.min((this.W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (this.H / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const x = this.W / 2 + Math.cos(a) * k, y = this.H / 2 + Math.sin(a) * k;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = color;
      g.beginPath(); g.moveTo(16 * u, 0); g.lineTo(-10 * u, -11 * u); g.lineTo(-4 * u, 0); g.lineTo(-10 * u, 11 * u); g.closePath(); g.fill();
      g.restore();
      if (label) this.text(label, clamp(x, 60, this.W - 60), clamp(y + 28 * u, 20, this.H - 8), { size: 12, align: "center", color });
    }
    return s;
  }

  // 대상 주위 사각 브래킷
  bracket(p, cam, radius, color, label) {
    const s = this._s2 || (this._s2 = {});
    this.project(p, cam, s);
    if (!s.on) return null;
    const d = cam.position.distanceTo(p);
    const px = clamp((radius / Math.max(d, 0.5)) * (this.H / (2 * Math.tan((cam.fov * Math.PI) / 360))), 10 * this.u, this.H * 0.4);
    const g = this.g, c = px * 0.4;
    g.strokeStyle = color; g.lineWidth = 2 * this.u;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      g.moveTo(s.x + sx * px, s.y + sy * (px - c)); g.lineTo(s.x + sx * px, s.y + sy * px); g.lineTo(s.x + sx * (px - c), s.y + sy * px);
    }
    g.stroke();
    if (label) this.text(label, s.x, s.y - px - 6 * this.u, { size: 12, align: "center", color });
    s.px = px;
    return s;
  }

  // ── 공통 비행 OSD ──
  drawFlight(session, dt) {
    const g = this.g, u = this.u, W = this.W, H = this.H;
    const pl = session.player, b = pl.body, cam = session.camera, inp = session.game.input;
    const touch = inp.device === "touch";

    // 인공 수평선 (FPV)
    if (pl.camMode === "fpv") {
      _e.setFromQuaternion(cam.quaternion, "YXZ");
      const ppr = (H / 2) / Math.tan((cam.fov * Math.PI) / 360);
      g.save();
      g.translate(W / 2, H / 2); g.rotate(-_e.z);
      const y = _e.x * ppr;
      g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1.5 * u;
      g.beginPath(); g.moveTo(-150 * u, y); g.lineTo(-40 * u, y); g.moveTo(40 * u, y); g.lineTo(150 * u, y); g.stroke();
      g.restore();
    }

    // 속도·고도
    const spd = b.speed * 3.6, alt = b.pos.y - session.world.h(b.pos.x, b.pos.z);
    const by = H - (touch ? 150 : 34) * u;
    this.text(`${spd.toFixed(0)}`, W / 2 - 92 * u, by, { size: 34, align: "right", mono: true });
    this.text("km/h", W / 2 - 86 * u, by, { size: 12, color: "#9fb4c8" });
    this.text(`${Math.max(0, alt).toFixed(1)}`, W / 2 + 150 * u, by, { size: 34, align: "right", mono: true });
    this.text("m", W / 2 + 156 * u, by, { size: 12, color: "#9fb4c8" });

    // 비행 모드·시점 배지
    const info = FLIGHT_MODE_INFO[pl.flightMode];
    const label = info.label;
    g.font = `700 ${15 * u}px ${FONT}`;
    const tw = g.measureText(label).width + 20 * u;
    this.panel(W / 2 - tw / 2, by - 58 * u, tw, 24 * u, pl.flightMode === "ACRO" ? "rgba(255,90,31,0.85)" : pl.flightMode === "LOITER" ? "rgba(47,140,255,0.85)" : "rgba(61,200,120,0.85)", 6);
    this.text(label, W / 2, by - 41 * u, { size: 15, align: "center", shadow: false });
    this.text(`MODE ${settings.stickMode} · ${CAMERA_NAMES[pl.camMode]}`, W / 2, by - 66 * u, { size: 11, align: "center", color: "#b8c7d6", bold: false });

    // 스로틀 바
    const tx = W / 2 - 14 * u;
    g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(tx, by - 26 * u, 28 * u, 5 * u);
    g.fillStyle = "#ffd24a"; g.fillRect(tx, by - 26 * u, 28 * u * clamp(b.thrust, 0, 1), 5 * u);
    this.text("THR", W / 2, by - 4 * u, { size: 10, align: "center", color: "#9fb4c8", bold: false });

    // 스틱 표시
    if (settings.showSticks && !touch) {
      const s = inp.sticks, sz = 62 * u, y0 = H - sz - 18 * u;
      for (const [i, sx, sy] of [[0, s.lx, s.ly], [1, s.rx, s.ry]]) {
        const x0 = 18 * u + i * (sz + 12 * u);
        g.fillStyle = "rgba(8,12,20,0.45)"; g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1;
        g.beginPath(); g.roundRect(x0, y0, sz, sz, 6 * u); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(x0 + sz / 2, y0 + 4); g.lineTo(x0 + sz / 2, y0 + sz - 4); g.moveTo(x0 + 4, y0 + sz / 2); g.lineTo(x0 + sz - 4, y0 + sz / 2);
        g.strokeStyle = "rgba(255,255,255,0.15)"; g.stroke();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(x0 + sz / 2 + sx * (sz / 2 - 6 * u), y0 + sz / 2 - sy * (sz / 2 - 6 * u), 5 * u, 0, 7); g.fill();
      }
    }

    // 경고
    const R = session.world.size;
    const out = Math.max(Math.abs(b.pos.x), Math.abs(b.pos.z)) - R;
    if (pl.crashed) this.text("추락! 재배치 중…", W / 2, H * 0.36, { size: 26, align: "center", color: "#ff6b5a" });
    else if (b.flipped && b.onGround) this.text("뒤집혔습니다 — R 키로 다시 세우기", W / 2, H * 0.36, { size: 20, align: "center", color: "#ffd24a" });
    else if (out > 0 || b.pos.y > session.world.ceiling) {
      if (Math.floor(session.time * 4) % 2) this.text("⚠ 비행 구역 이탈 — 돌아가세요", W / 2, H * 0.3, { size: 22, align: "center", color: "#ff6b5a" });
    }
  }

  drawToasts(dt) {
    const u = this.u, W = this.W, H = this.H;
    let y = H * 0.24;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t += dt;
      if (t.t > t.dur) { this.toasts.splice(i, 1); continue; }
    }
    for (const t of this.toasts) {
      const k = Math.min(1, t.t * 8) * Math.min(1, (t.dur - t.t) * 4);
      this.g.globalAlpha = k;
      this.text(t.text, W / 2, y, { size: t.size, align: "center", color: t.color });
      this.g.globalAlpha = 1;
      y += (t.size + 10) * u;
    }
    let fy = 96 * u;
    for (let i = this.feedLines.length - 1; i >= 0; i--) {
      const f = this.feedLines[i];
      f.t += dt;
      if (f.t > 5) { this.feedLines.splice(i, 1); continue; }
    }
    for (const f of this.feedLines) {
      this.g.globalAlpha = Math.min(1, (5 - f.t) * 2);
      this.text(f.text, W - 16 * u, fy, { size: 13, align: "right", color: f.color });
      this.g.globalAlpha = 1;
      fy += 19 * u;
    }
  }
}
