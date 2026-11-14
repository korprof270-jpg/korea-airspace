// HUD(OSD): 2D 캔버스에 게임풍 파일럿 계기·마커·메시지를 그린다
// 굵은 먹선 외곽 + 선명한 색 판으로 밤(네온)·낮(노을) 어느 배경에서도 읽히게 한다
import * as THREE from "../vendor/three.module.min.js";
import { settings, save, FLIGHT_MODE_INFO, HUD_DENSITY, HUD_DENSITY_NAMES, clamp } from "./config.js";

const _v = new THREE.Vector3();
const _e = new THREE.Euler();
const FONT = `"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
const MONO = `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`;
const DEG = Math.PI / 180;

export const INK = "#0a0f1c";                    // 먹선(외곽선)
const INK_A = "rgba(8,12,22,0.92)";
const PLATE = "rgba(12,18,32,0.68)";            // 계기판 바탕
const PLATE_HI = "rgba(12,18,32,0.86)";
// HUD 공통 색
export const HC = {
  white: "#ffffff", dim: "#b4c2d4", gold: "#ffd24a", ok: "#35ff7a", cyan: "#3ad8ff", warn: "#ff5a4a",
  orange: "#ff8a2a", pink: "#ff5ad6", blue: "#5aa9ff", red: "#ff5a66",
};
const MODE_COLOR = { ACRO: "#ff5a1f", HORIZON: "#22b573", ANGLE: "#22b573", ALTHOLD: "#16a3a3", LOITER: "#2f7dff" };
const CAM_SHORT = { fpv: "FPV", chase: "3인칭", los: "지상" };
const COMPASS = { 0: "북", 90: "동", 180: "남", 270: "서" };
// 최소 표시 수준에서도 남기는 항목
const MINIMAL = new Set(["distance", "gateArrow", "reticle", "panels", "markers"]);
const TRAIL = 6;

export class Hud {
  constructor(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext("2d");
    if (!this.g.roundRect) this.g.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); }; // 구형 브라우저 대비
    this.toasts = [];
    this.feedLines = [];
    this.W = 1; this.H = 1; this.u = 1; this.u0 = 1; this.dpr = 1;
    this.safe = { l: 0, r: 0, t: 0, b: 0 };     // 노치·둥근 모서리 여백(px)
    this.lvl = "full";                           // 표시 수준: full | minimal | off
    this.opacity = 1;
    this.t = 0;                                  // 애니메이션 시계
    this.L = { cx: 0, cy: 0, l: 0, r: 0, t: 0, b: 0, trY: 0, touch: false, combat: false };
    this.obj = null;                             // 이번 프레임의 목표 { pos, label, color, dist?, pill? }
    this.objDist = 0;
    this._spd = 0; this._alt = 0; this._vs = 0;
    this._trail = [new Float32Array(TRAIL * 2), new Float32Array(TRAIL * 2)];
    this._trailT = 0;
    this._s = {}; this._s2 = {}; this._s3 = {};
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = this.cv.clientWidth || innerWidth; this.H = this.cv.clientHeight || innerHeight;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.dpr = dpr;
    this.u0 = clamp(Math.min(this.H / 720, this.W / 900), 0.62, 1.7);
    this.u = this.u0 * clamp(settings.hud.scale || 1, 0.7, 1.4);
    this._safeArea();
    this._layout(null);
  }

  // CSS safe-area(노치) 여백을 px 로 읽는다
  _safeArea() {
    try {
      let el = this._probe;
      if (!el) {
        el = this._probe = document.createElement("div");
        el.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
          "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
        document.body.appendChild(el);
      }
      const cs = getComputedStyle(el);
      this.safe.t = parseFloat(cs.paddingTop) || 0; this.safe.r = parseFloat(cs.paddingRight) || 0;
      this.safe.b = parseFloat(cs.paddingBottom) || 0; this.safe.l = parseFloat(cs.paddingLeft) || 0;
    } catch (_) { /* 측정 불가 환경 무시 */ }
  }

  clear() {
    const g = this.g, o = settings.hud;
    this.u = this.u0 * clamp(o.scale || 1, 0.7, 1.4);
    this.lvl = HUD_DENSITY.includes(o.density) ? o.density : "full";
    this.opacity = clamp(o.opacity ?? 1, 0.2, 1);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, this.W, this.H);
  }

  // 표시 여부: 표시 수준 + 개별 토글
  vis(key) {
    if (this.lvl === "off") return false;
    if (this.lvl === "minimal" && !MINIMAL.has(key)) return false;
    return settings.hud[key] !== false;
  }
  // 불투명도(HUD 전체 설정값이 곱해짐)
  fade(k = 1) { this.g.globalAlpha = this.opacity * clamp(k, 0, 1); }

  cycleDensity() {
    const i = HUD_DENSITY.indexOf(this.lvl);
    this.lvl = settings.hud.density = HUD_DENSITY[(i + 1) % HUD_DENSITY.length];
    save();
    this.toast(`HUD 표시: ${HUD_DENSITY_NAMES[this.lvl]}`, "#9fd8ff", 1.1, 20);
  }

  // ── 그리기 도구 ──
  text(s, x, y, o = {}) {
    const g = this.g, px = Math.max((o.size || 16) * this.u, 8.5);
    g.font = `${o.bold === false ? 600 : 800} ${px}px ${o.mono ? MONO : FONT}`;
    g.textAlign = o.align || "left";
    g.textBaseline = o.base || "alphabetic";
    if (o.shadow !== false) {
      // 만화풍 먹선 외곽 (큰 글자는 아래로 살짝 두껍게)
      g.lineJoin = "round"; g.strokeStyle = INK_A;
      g.lineWidth = Math.max(2.4, px * 0.2);
      if (px >= 24) g.strokeText(s, x, y + px * 0.06);
      g.strokeText(s, x, y);
    }
    g.fillStyle = o.color || "#fff";
    g.fillText(s, x, y);
  }

  // 현재 경로를 먹선 + 색선 이중으로 그린다
  stroke2(color, lw) {
    const g = this.g;
    g.lineJoin = "round"; g.lineCap = "round";
    g.lineWidth = lw + 3 * this.u; g.strokeStyle = INK_A; g.stroke();
    g.lineWidth = lw; g.strokeStyle = color; g.stroke();
  }
  // 현재 경로를 색으로 채우고 먹선을 두른다
  fill2(color, lw = 2.5) {
    const g = this.g;
    g.fillStyle = color; g.fill();
    g.lineJoin = "round"; g.lineWidth = lw * this.u; g.strokeStyle = INK; g.stroke();
  }

  panel(x, y, w, h, color = PLATE, r = 8) {
    const g = this.g;
    g.beginPath(); g.roundRect(x, y, w, h, r * this.u);
    g.fillStyle = color; g.fill();
    g.lineJoin = "round"; g.lineWidth = 2 * this.u; g.strokeStyle = INK; g.stroke();
  }

  // 기울어진 계기판(평행사변형). o: { accent, fill, skew, r, side }
  plate(x, y, w, h, o = {}) {
    const g = this.g, u = this.u, k = (o.skew ?? 0.22) * h, r = (o.r ?? 6) * u;
    const path = () => {
      g.beginPath();
      g.moveTo(x + k + r, y);
      g.arcTo(x + w, y, x + w - k, y + h, r);
      g.arcTo(x + w - k, y + h, x, y + h, r);
      g.arcTo(x, y + h, x + k, y, r);
      g.arcTo(x + k, y, x + w, y, r);
      g.closePath();
    };
    path();
    g.fillStyle = o.fill || PLATE; g.fill();
    if (o.accent) {
      // 한쪽 가장자리의 색 띠
      const aw = (o.aw ?? 5) * u, right = o.side === "right";
      g.save(); g.clip();
      g.fillStyle = o.accent;
      g.beginPath();
      if (right) { g.moveTo(x + w - k - aw, y + h); g.lineTo(x + w - aw, y); g.lineTo(x + w + 2, y); g.lineTo(x + w + 2, y + h); }
      else { g.moveTo(x - 2, y + h); g.lineTo(x - 2, y); g.lineTo(x + k + aw, y); g.lineTo(x + aw, y + h); }
      g.closePath(); g.fill();
      g.restore();
      path();
    }
    g.lineJoin = "round"; g.lineWidth = (o.lw ?? 2.5) * u; g.strokeStyle = o.stroke || INK; g.stroke();
  }

  bar(x, y, w, h, frac, color, bg = "rgba(10,15,28,0.62)") {
    const g = this.g, u = this.u, f = clamp(frac || 0, 0, 1), thick = h >= 5 * u;
    if (thick) { g.fillStyle = INK; g.fillRect(x - 1.5 * u, y - 1.5 * u, w + 3 * u, h + 3 * u); }
    g.fillStyle = bg; g.fillRect(x, y, w, h);
    g.fillStyle = color; g.fillRect(x, y, w * f, h);
    if (thick) { g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(x, y, w * f, h * 0.36); }
  }

  // 칸으로 나뉜 게이지(스로틀·체력 등)
  segbar(x, y, w, h, frac, n, color, o = {}) {
    const g = this.g, u = this.u, gap = 2 * u, sw = (w - gap * (n - 1)) / n, f = clamp(frac || 0, 0, 1) * n, sk = (o.skew ?? 0.3) * h;
    for (let i = 0; i < n; i++) {
      const x0 = x + i * (sw + gap), k = clamp(f - i, 0, 1);
      g.beginPath();
      g.moveTo(x0 + sk, y); g.lineTo(x0 + sw + sk, y); g.lineTo(x0 + sw, y + h); g.lineTo(x0, y + h); g.closePath();
      g.fillStyle = INK; g.lineWidth = 2.5 * u; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke();
      g.fillStyle = "rgba(255,255,255,0.13)"; g.fill();
      if (k > 0) {
        g.save(); g.clip();
        g.fillStyle = typeof color === "function" ? color(i / n) : color;
        g.fillRect(x0, y, (sw + sk) * k, h);
        g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(x0, y, (sw + sk) * k, h * 0.38);
        g.restore();
      }
    }
  }

  toast(text, color = "#fff", dur = 1.6, size = 30) { this.toasts.push({ text, color, t: 0, dur, size }); if (this.toasts.length > 3) this.toasts.shift(); }
  feed(text, color = "#fff") { this.feedLines.push({ text, color, t: 0 }); if (this.feedLines.length > 6) this.feedLines.shift(); }

  // 월드 좌표 → 화면 좌표. 뒤쪽이면 front=false. (vx, vy, vz: 카메라 기준 방향)
  project(p, cam, out) {
    _v.copy(p).applyMatrix4(cam.matrixWorldInverse);
    const front = _v.z < 0;
    out.vx = _v.x; out.vy = _v.y; out.vz = _v.z;
    _v.applyMatrix4(cam.projectionMatrix);
    out.x = (_v.x * 0.5 + 0.5) * this.W; out.y = (-_v.y * 0.5 + 0.5) * this.H; out.front = front;
    out.on = front && out.x > 0 && out.x < this.W && out.y > 0 && out.y < this.H;
    return out;
  }

  // 화면 밖 목표의 방향각(화면 좌표계). 뒤쪽 목표는 좌우로 돌도록 수직 성분을 줄인다
  _dirAngle(s) {
    let vx = s.vx, vy = s.vy;
    if (!s.front) { vy *= 0.35; if (Math.abs(vx) < 1e-3 && Math.abs(vy) < 1e-3) vx = 1; }
    return Math.atan2(-vy, vx);
  }

  // 굵은 갈매기 화살표(＞) 하나. (x, y) 중심, a 방향
  chevron(x, y, a, size, color, lw = 0) {
    const g = this.g, u = this.u, s = size;
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath();
    g.moveTo(-s * 0.55, -s * 0.8); g.lineTo(s * 0.1, -s * 0.8); g.lineTo(s * 0.75, 0); g.lineTo(s * 0.1, s * 0.8); g.lineTo(-s * 0.55, s * 0.8); g.lineTo(s * 0.1, 0);
    g.closePath();
    g.fillStyle = color; g.fill();
    g.lineJoin = "round"; g.lineWidth = (lw || 2.5) * u; g.strokeStyle = INK; g.stroke();
    g.restore();
  }

  // 목표 마커: 화면 안이면 마름모+거리, 밖이면 가장자리 화살표
  marker(p, cam, color, label, dist) {
    const g = this.g, u = this.u, s = this._s, L = this.L;
    this.project(p, cam, s);
    if (this.lvl === "off") return s;
    const showDist = dist !== undefined && settings.hud.distance !== false;
    if (s.on) {
      const r = 9 * u;
      g.beginPath(); g.moveTo(s.x, s.y - r); g.lineTo(s.x + r, s.y); g.lineTo(s.x, s.y + r); g.lineTo(s.x - r, s.y); g.closePath();
      this.stroke2(color, 2.5 * u);
      if (label) this.text(label, s.x, s.y - r - 7 * u, { size: 13, align: "center", color });
      if (showDist) this.text(`${dist.toFixed(0)}m`, s.x, s.y + r + 16 * u, { size: 13, align: "center", color, mono: true });
    } else {
      const a = this._dirAngle(s);
      const mx = 54 * u, top = L.t + 104 * u, bot = this.H - L.b + 96 * u;
      const cx = this.W / 2, cy = (top + this.H - bot) / 2;
      const hw = this.W / 2 - mx - Math.max(this.safe.l, this.safe.r), hh = (this.H - bot - top) / 2;
      const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
      const x = cx + Math.cos(a) * k, y = cy + Math.sin(a) * k;
      this.chevron(x, y, a, 13 * u, color);
      const tx = clamp(x - Math.cos(a) * 30 * u, 70 * u, this.W - 70 * u), ty = clamp(y - Math.sin(a) * 26 * u + 4 * u, top, this.H - bot);
      const txt = label && showDist ? `${label} ${dist.toFixed(0)}m` : label || (showDist ? `${dist.toFixed(0)}m` : "");
      if (txt) this.text(txt, tx, ty, { size: 12, align: "center", color });
    }
    return s;
  }

  // 대상 주위 사각 브래킷
  bracket(p, cam, radius, color, label) {
    const s = this._s2;
    this.project(p, cam, s);
    if (!s.on || this.lvl === "off") return null;
    const d = cam.position.distanceTo(p);
    const px = clamp((radius / Math.max(d, 0.5)) * (this.H / (2 * Math.tan((cam.fov * Math.PI) / 360))), 10 * this.u, this.H * 0.4);
    const g = this.g, c = px * 0.4;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const sx = i === 0 || i === 3 ? -1 : 1, sy = i < 2 ? -1 : 1;
      g.moveTo(s.x + sx * px, s.y + sy * (px - c)); g.lineTo(s.x + sx * px, s.y + sy * px); g.lineTo(s.x + sx * (px - c), s.y + sy * px);
    }
    this.stroke2(color, 2 * this.u);
    if (label) this.text(label, s.x, s.y - px - 7 * this.u, { size: 12, align: "center", color });
    s.px = px;
    return s;
  }

  // 방향 안내: 화면 중심 둘레에서 목표 쪽으로 흐르는 큰 화살표(＞＞＞) + 방향·거리.
  // o: { color, label, dist, pop(0..1 통과 직후 강조), force(화면 안이어도 표시) }  → 투영 결과 반환
  cue(p, cam, o = {}) {
    const g = this.g, u = this.u, W = this.W, H = this.H, s = this._s3, L = this.L;
    this.project(p, cam, s);
    if (this.lvl === "off") return s;
    const color = o.color || HC.ok, pop = o.pop || 0;
    const cx = L.cx, cy = L.cy;
    const R = Math.min(H * 0.27, 132 * u);
    if (s.on) {
      // 화면 안: 강조 중일 때만 중심 → 목표로 흐르는 화살표
      const dx = s.x - cx, dy = s.y - cy, d = Math.hypot(dx, dy);
      if (!o.force || d < 96 * u) return s;
      const a = Math.atan2(dy, dx), n = Math.min(4, Math.floor((d - 60 * u) / (26 * u)));
      const ph = (this.t * 2.2) % 1;
      for (let i = 0; i < n; i++) {
        const r = 44 * u + (i + ph) * (d - 74 * u) / Math.max(1, n);
        this.fade((0.35 + 0.65 * ((i + ph) / n)) * Math.min(1, pop * 3 + 0.25));
        this.chevron(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, 9 * u, color, 2);
      }
      this.fade(1);
      return s;
    }
    const a = this._dirAngle(s);
    // 방향 낱말
    const len = Math.hypot(s.vx, s.vy, s.vz) || 1, fwd = -s.vz / len;
    let word;
    if (fwd < -0.15) word = s.vx < 0 ? "뒤 ↶ 왼쪽으로" : "뒤 ↷ 오른쪽으로";
    else if (Math.abs(s.vx) >= Math.abs(s.vy)) word = s.vx < 0 ? "왼쪽" : "오른쪽";
    else word = s.vy > 0 ? "위쪽" : "아래쪽";
    const ca = Math.cos(a), sa = Math.sin(a);
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 9), big = 1 + pop * 0.5;
    const ph = (this.t * 2.4) % 1;
    for (let i = 0; i < 3; i++) {
      const r = R + (i - 1 + ph) * 20 * u * big;
      const k = i + ph;                                  // 0..3 바깥으로 흐름
      this.fade(clamp(k < 1 ? k : 3 - k, 0.15, 1));
      this.chevron(cx + ca * r, cy + sa * r, a, (15 + pulse * 2) * u * big, i === 1 ? "#ffffff" : color, 3);
    }
    this.fade(1);
    // 방향·거리 표지
    const showDist = o.dist !== undefined && settings.hud.distance !== false;
    const txt = `${o.label ? o.label + " · " : ""}${word}${showDist ? ` · ${o.dist.toFixed(0)}m` : ""}`;
    g.font = `800 ${Math.max(13 * u, 8.5)}px ${FONT}`;
    const tw = g.measureText(txt).width + 26 * u, th = 24 * u;
    const lr = R + 54 * u * big;
    const lx = clamp(cx + ca * lr * 0.86, L.l + tw / 2, L.r - tw / 2), ly = clamp(cy + sa * lr * 0.86 + (Math.abs(sa) < 0.5 ? 34 * u : 0), L.t + 96 * u, H - 110 * u);
    this.plate(lx - tw / 2, ly - th / 2, tw, th, { fill: PLATE_HI, accent: color, skew: 0.3 });
    this.text(txt, lx + 3 * u, ly + 1 * u, { size: 13, align: "center", base: "middle", color: "#fff", shadow: false });
    return s;
  }

  // 위 가운데 시계판
  timer(str, color = "#fff", accent = null) {
    const u = this.u, L = this.L, w = 172 * u, h = 40 * u;
    this.plate(L.cx - w / 2, L.t, w, h, { fill: PLATE_HI, skew: 0.16, accent });
    this.text(str, L.cx, L.t + 21 * u, { size: 28, align: "center", base: "middle", mono: true, color, shadow: false });
  }

  // ── 프레임별 배치 ──
  _layout(session) {
    const u = this.u, W = this.W, H = this.H, sf = this.safe, L = this.L;
    const game = session && session.game;
    const touch = !!game && (game.input.device === "touch" || !!(game.touchWanted && game.touchWanted()));
    L.touch = touch; L.combat = !!(session && session.mode.combat);
    L.cx = W / 2; L.cy = H / 2;
    L.l = sf.l + 14 * u; L.r = W - sf.r - 14 * u; L.t = sf.t + 8 * u; L.b = H - sf.b - 10 * u;
    L.batH = this.vis("battery") || this.vis("mode") ? 22 * u : 0; L.t += L.batH;   // 배터리 줄만큼 위쪽 판들을 내린다
    L.roW = 94 * u;                                              // 속도·고도 판 너비
    L.trY = touch ? Math.max(L.t, sf.t + 52) : L.t;          // 오른쪽 위: 터치 버튼 아래부터
    L.compassY = L.t + 46 * u; L.subY = L.t + 74 * u;        // 나침반 / 그 아래 모드별 표시줄
    L.tapeX = (touch ? 176 : 248) * u; L.tapeH = (touch ? 150 : 190) * u;
    // 아래 가운데 조종 콘솔: [왼 스틱][모드·스로틀][오른 스틱]
    L.conM = (L.combat ? 230 : 128) * u; L.stick = 52 * u; L.conGap = 10 * u;   // 전투 중에는 가운데에 큰 체력바
    L.sticks = this.vis("sticks") && !touch;                  // 터치 중에는 화면 스틱이 대신 보인다
    L.conHalf = L.conM / 2 + (L.sticks ? L.conGap + L.stick : 0);
    L.conTop = L.b - 52 * u;
    // 전투 상태판·레이더 자리 (터치: 엄지를 피해 가운데·오른쪽 위로)
    if (touch) {
      L.statusX = L.cx - L.conHalf - L.conGap * 1.8 - L.roW - 12 * u; L.statusRight = true; L.statusW = 168 * u;
      L.radarR = clamp(60 * u, 38, 66);
      L.radarX = W - sf.r - 108 - L.radarR; L.radarY = sf.t + 54 + L.radarR;
      L.feedX = L.radarX - L.radarR - 12; L.feedY = sf.t + 62;
    } else {
      L.statusX = L.l; L.statusRight = false; L.statusW = 196 * u;
      L.radarR = 60 * u; L.radarX = L.r - L.radarR; L.radarY = L.b - L.radarR;
      L.feedX = L.r; L.feedY = L.t + 112 * u;
    }
    return L;
  }

  // ── 공통 비행 계기 ──
  drawFlight(session, dt) {
    const pl = session.player, b = pl.body, cam = session.camera, inp = session.game.input;
    this.t += dt;
    // HUD 표시 수준 전환 요청 (H 키·터치 버튼)
    let cyc = false;
    while (inp.take("hud")) cyc = true;
    if (cyc) this.cycleDensity();
    this._layout(session);
    this.fade(1);
    this.obj = null;
    if (this.lvl === "off") { this._warnings(session); return; }

    const mode = session.mode;
    const ob = mode.hudObjective ? mode.hudObjective() : null;
    if (ob && ob.pos) { this.obj = ob; this.objDist = ob.dist !== undefined ? ob.dist : ob.pos.distanceTo(b.pos); }

    const k = Math.min(1, dt * 12);
    const alt = Math.max(0, b.pos.y - session.world.h(b.pos.x, b.pos.z));
    this._spd += (b.speed * 3.6 - this._spd) * k;
    this._alt += (alt - this._alt) * k;
    this._vs += (b.vel.y - this._vs) * Math.min(1, dt * 6);

    const fpv = pl.camMode === "fpv";
    if (this.vis("horizon")) { if (fpv) this._ladder(cam); else this._attitude(b); }
    if (fpv && !mode.combat && this.vis("reticle")) this._boresight();
    if (this.vis("speed")) this._tape(-1, this._spd, SPEED_TAPE);
    if (this.vis("altitude")) { ALT_TAPE.max = session.world.ceiling - (b.pos.y - alt); this._tape(1, this._alt, ALT_TAPE, this._vs); }
    if (this.vis("compass")) this._compass(b);
    if (this.vis("battery")) this._battery(pl);
    if (this.vis("mode")) this._modeBadge(pl);
    this._console(session, dt);
    if (this.obj && this.obj.pill !== false && this.vis("distance")) this._distance(this.obj, this.objDist);
    this._warnings(session);
  }

  // 속도·고도 판: 화면을 가리지 않게 아래쪽 조종 콘솔 양옆에 나란히 둔다. side: -1 왼쪽 / +1 오른쪽
  _tape(side, value, o, trend) {
    const u = this.u, L = this.L, w = L.roW, h = 44 * u;
    const gap = L.conGap * 1.8, x0 = side < 0 ? L.cx - L.conHalf - gap - w : L.cx + L.conHalf + gap, y0 = L.b - h;
    this.plate(x0, y0, w, h, { fill: PLATE, accent: o.color, skew: 0.12 });
    const txt = value >= 99.5 || o.int ? value.toFixed(0) : value.toFixed(1);
    this.text(o.label, x0 + 10 * u, y0 + 11 * u, { size: 9, base: "middle", color: o.color });
    this.text(txt, x0 + w - 30 * u, y0 + 30 * u, { size: 19, align: "right", base: "middle", mono: true });
    this.text(o.unit, x0 + w - 27 * u, y0 + 32 * u, { size: 10, base: "middle", color: HC.dim });
    if (trend !== undefined && Math.abs(trend) > 0.6) {
      const up = trend > 0;
      this.text(`${up ? "▲" : "▼"}${Math.abs(trend).toFixed(1)}`, x0 + w - 8 * u, y0 + 13 * u, { size: 9, align: "right", base: "middle", color: up ? HC.ok : HC.orange, mono: true });
    }
  }

  // 배터리 잔량 (왼쪽 위)
  _battery(pl) {
    const g = this.g, u = this.u, L = this.L, k = clamp(pl.battery ?? 1, 0, 1);
    const x = L.l, y = L.t - L.batH, w = 54 * u, h = 15 * u;
    const col = k > 0.4 ? HC.ok : k > 0.18 ? HC.gold : HC.warn;
    if (k <= 0.18 && Math.floor(this.t * 3) % 2) return;       // 부족하면 깜빡임
    g.beginPath(); g.roundRect(x, y, w, h, 3 * u); g.roundRect(x + w, y + h * 0.28, 4 * u, h * 0.44, 1.5 * u);
    g.fillStyle = PLATE; g.fill(); g.lineWidth = 2.5 * u; g.strokeStyle = INK; g.stroke();
    g.fillStyle = col; g.fillRect(x + 3 * u, y + 3 * u, (w - 6 * u) * k, h - 6 * u);
    this.text(`${Math.round(k * 100)}%`, x + w + 10 * u, y + h / 2 + 0.5 * u, { size: 12, base: "middle", mono: true, color: col });
  }

  // 비행 모드 배지: 배터리 오른쪽 (배터리를 끄면 그 자리)
  _modeBadge(pl) {
    const u = this.u, L = this.L, info = FLIGHT_MODE_INFO[pl.flightMode] || FLIGHT_MODE_INFO.ANGLE;
    const x = L.l + (this.vis("battery") ? 108 * u : 0), y = L.t - L.batH - (L.batH ? 0 : 0), w = 70 * u, h = 16 * u;
    this.plate(x, y, w, h, { fill: MODE_COLOR[pl.flightMode] || MODE_COLOR.ANGLE, skew: 0.3, lw: 2 });
    this.text(info.label, x + w / 2, y + h / 2 + 0.5 * u, { size: 11, align: "center", base: "middle", shadow: false });
    if (this.lvl === "full") this.text(`MODE ${settings.stickMode} · ${CAM_SHORT[pl.camMode] || ""}`, x + w + 8 * u, y + h / 2 + 0.5 * u, { size: 10, base: "middle", color: HC.dim });
  }

  // 나침반 띠 + 목표 방위
  _compass(b) {
    const g = this.g, u = this.u, L = this.L, w = 236 * u, h = 20 * u, x0 = L.cx - w / 2, y0 = L.compassY, ym = y0 + h / 2;
    const deg = ((-b.heading / DEG) % 360 + 360) % 360, span = 120, ppd = w / span;
    g.beginPath(); g.roundRect(x0, y0, w, h, 6 * u);
    g.fillStyle = PLATE; g.fill();
    g.save(); g.clip();
    g.lineCap = "butt"; g.lineWidth = 2 * u; g.strokeStyle = "rgba(255,255,255,0.7)";
    g.beginPath();
    const a0 = Math.ceil((deg - span / 2) / 15) * 15;
    for (let a = a0; a <= deg + span / 2; a += 15) {
      const aa = ((a % 360) + 360) % 360;
      if (aa % 45 === 0) continue;
      const x = L.cx + (a - deg) * ppd;
      g.moveTo(x, y0 + h); g.lineTo(x, y0 + h - 6 * u);
    }
    g.stroke();
    for (let a = Math.ceil((deg - span / 2) / 45) * 45; a <= deg + span / 2; a += 45) {
      const aa = ((a % 360) + 360) % 360, x = L.cx + (a - deg) * ppd, c = COMPASS[aa];
      this.text(c || String(aa), x, ym + 1 * u, { size: c ? 13 : 10, align: "center", base: "middle", color: aa === 0 ? "#ff7a6a" : c ? "#fff" : "#aab8cc", shadow: false, mono: !c });
    }
    g.restore();
    g.beginPath(); g.roundRect(x0, y0, w, h, 6 * u);
    g.lineJoin = "round"; g.lineWidth = 2.5 * u; g.strokeStyle = INK; g.stroke();
    // 기수 표시(가운데 쐐기)
    g.beginPath(); g.moveTo(L.cx - 6 * u, y0 - 4 * u); g.lineTo(L.cx + 6 * u, y0 - 4 * u); g.lineTo(L.cx, y0 + 5 * u); g.closePath();
    this.fill2(HC.gold, 2);
    // 목표 방위 표시
    const ob = this.obj;
    if (ob) {
      const brg = Math.atan2(ob.pos.x - b.pos.x, -(ob.pos.z - b.pos.z)) / DEG;
      let rel = ((brg - deg) % 360 + 540) % 360 - 180;
      const edge = Math.abs(rel) > span / 2 - 4;
      rel = clamp(rel, -span / 2 + 4, span / 2 - 4);
      const x = L.cx + rel * ppd, y = y0 + h + 2 * u, s = 6 * u;
      g.beginPath();
      if (edge) { const d = Math.sign(rel); g.moveTo(x + d * s, y + s * 0.2); g.lineTo(x - d * s * 0.6, y - s * 0.8); g.lineTo(x - d * s * 0.6, y + s * 1.2); }
      else { g.moveTo(x, y - s); g.lineTo(x + s * 0.85, y + s * 0.5); g.lineTo(x - s * 0.85, y + s * 0.5); }
      g.closePath();
      this.fill2(ob.color || HC.ok, 2);
    }
  }

  // FPV: 수평선 + 피치 사다리 + 기울기 눈금
  _ladder(cam) {
    const g = this.g, u = this.u, L = this.L;
    _e.setFromQuaternion(cam.quaternion, "YXZ");
    const ppr = (this.H / 2) / Math.tan((cam.fov * Math.PI) / 360), pitch = _e.x, roll = _e.z;
    const R = Math.min(L.tapeX - 62 * u, 122 * u);
    g.save();
    g.translate(L.cx, L.cy);
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.clip();
    g.rotate(-roll);
    const yAt = (a) => Math.tan(clamp(pitch - a, -1.4, 1.4)) * ppr;
    // 사다리(10° 간격)
    g.beginPath();
    const kc = Math.round(pitch / DEG / 10);
    for (let k = kc - 2; k <= kc + 2; k++) {
      if (k === 0 || Math.abs(k) > 8) continue;
      const y = yAt(k * 10 * DEG);
      if (Math.abs(y) > R - 6 * u) continue;
      const tick = (k > 0 ? 6 : -6) * u;
      g.moveTo(-58 * u, y + tick); g.lineTo(-58 * u, y); g.lineTo(-26 * u, y);
      g.moveTo(58 * u, y + tick); g.lineTo(58 * u, y); g.lineTo(26 * u, y);
    }
    this.stroke2("rgba(255,255,255,0.85)", 1.8 * u);
    for (let k = kc - 2; k <= kc + 2; k++) {
      if (k === 0 || Math.abs(k) > 8) continue;
      const y = yAt(k * 10 * DEG);
      if (Math.hypot(84 * u, y) > R) continue;
      this.text(String(Math.abs(k * 10)), 64 * u, y, { size: 10, base: "middle", mono: true, color: k > 0 ? "#dff3ff" : "#ffd9b0" });
    }
    // 수평선
    const y0 = yAt(0);
    if (Math.abs(y0) < R) {
      g.beginPath(); g.moveTo(-R, y0); g.lineTo(-30 * u, y0); g.moveTo(30 * u, y0); g.lineTo(R, y0);
      this.stroke2(HC.cyan, 2.5 * u);
    }
    g.restore();
    // 기울기 눈금(고정) + 하늘 지시 삼각형
    g.save();
    g.translate(L.cx, L.cy);
    const Rb = R + 8 * u;
    g.beginPath();
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 15 * DEG, r1 = Rb, r2 = Rb + (i % 2 === 0 ? 9 : 5) * u;
      g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    this.stroke2("rgba(255,255,255,0.9)", 2 * u);
    g.rotate(-clamp(roll, -Math.PI / 4 - 0.1, Math.PI / 4 + 0.1));
    g.beginPath(); g.moveTo(0, -Rb + 2 * u); g.lineTo(-6 * u, -Rb + 13 * u); g.lineTo(6 * u, -Rb + 13 * u); g.closePath();
    this.fill2(Math.abs(roll) > 50 * DEG ? HC.orange : HC.gold, 2);
    g.restore();
  }

  // 3인칭·지상 시점: 작은 자세계(기체의 피치·롤)
  _attitude(b) {
    const g = this.g, u = this.u, L = this.L, r = 21 * u, cx = L.cx, cy = L.conTop - r - 24 * u;
    _e.setFromQuaternion(b.quat, "YXZ");
    g.save();
    g.translate(cx, cy);
    g.beginPath(); g.arc(0, 0, r, 0, 7);
    g.save(); g.clip();
    g.rotate(-_e.z);
    const y = clamp(_e.x / (50 * DEG), -1, 1) * r;
    g.fillStyle = "rgba(58,160,255,0.85)"; g.fillRect(-r * 2, -r * 2, r * 4, r * 2 + y);
    g.fillStyle = "rgba(150,92,48,0.9)"; g.fillRect(-r * 2, y, r * 4, r * 2);
    g.fillStyle = "#fff"; g.fillRect(-r * 2, y - 1 * u, r * 4, 2 * u);
    g.restore();
    g.beginPath(); g.arc(0, 0, r, 0, 7);
    g.lineWidth = 3 * u; g.strokeStyle = INK; g.stroke();
    // 기체 기준선
    g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(-r * 0.25, 0); g.moveTo(r * 0.25, 0); g.lineTo(r * 0.7, 0);
    this.stroke2(HC.gold, 2.5 * u);
    g.fillStyle = HC.gold; g.beginPath(); g.arc(0, 0, 2.2 * u, 0, 7); g.fill();
    g.restore();
  }

  // FPV 중심 조준 표시(비전투)
  _boresight() {
    const g = this.g, u = this.u, L = this.L;
    g.beginPath();
    g.moveTo(L.cx - 22 * u, L.cy); g.lineTo(L.cx - 9 * u, L.cy);
    g.moveTo(L.cx + 9 * u, L.cy); g.lineTo(L.cx + 22 * u, L.cy);
    g.moveTo(L.cx, L.cy - 9 * u); g.lineTo(L.cx, L.cy - 15 * u);
    g.moveTo(L.cx + 5 * u, L.cy); g.arc(L.cx, L.cy, 5 * u, 0, Math.PI * 2);
    this.stroke2(HC.gold, 2.2 * u);
  }

  // 아래 가운데 콘솔: 스틱 모니터 + 비행 모드 배지 + 스로틀 게이지
  _console(session, dt) {
    const g = this.g, u = this.u, L = this.L, pl = session.player, b = pl.body;
    const cb = session.mode.combat, me = cb && cb.player;
    if (me) {
      // 체력바: 아래 가운데에 크게. 실드는 하늘색 띠로 겹치고, 25% 이하면 빨갛게 깜빡인다
      const k = clamp(me.hp / me.maxHp, 0, 1), low = k <= 0.25, col = k > 0.5 ? "#3dff8c" : k > 0.25 ? "#ffd24a" : "#ff4a3a";
      const w = L.conM, h = 40 * u, x = L.cx - w / 2, y = L.b - h;
      this.plate(x, y, w, h, { fill: low && Math.floor(this.t * 5) % 2 ? "rgba(90,12,12,0.92)" : "rgba(10,14,28,0.94)", accent: col, skew: 0.18, lw: 3 });
      this.text("HP", x + 22 * u, y + h / 2 + 1 * u, { size: 14, align: "center", base: "middle", color: col, shadow: false });
      const bx = x + 40 * u, bw = w - 100 * u, bh = 18 * u, by = y + (h - bh) / 2;
      this.segbar(bx, by, bw, bh, k, 12, col);
      if (me.shield > 0) { g.fillStyle = INK; g.fillRect(bx - 1 * u, by - 7 * u, bw + 2 * u, 6 * u); g.fillStyle = HC.cyan; g.fillRect(bx, by - 6 * u, bw * clamp(me.shield / 120, 0, 1), 4 * u); }
      this.text(`${Math.max(0, Math.ceil(me.hp))}`, x + w - 12 * u, y + h / 2 + 1 * u, { size: 22, align: "right", base: "middle", mono: true, color: low ? "#ff6b5a" : "#fff" });
    }
    if (!L.sticks) return;
    // 스틱 모니터(궤적 포함)
    const s = session.game.input.sticks, S = L.stick, y0 = L.b - S;
    this._trailT -= dt;
    const push = this._trailT <= 0;
    if (push) this._trailT = 0.03;
    for (let i = 0; i < 2; i++) {
      const sx = i ? s.rx : s.lx, sy = i ? s.ry : s.ly;
      const bx = i ? L.cx + L.conM / 2 + L.conGap : L.cx - L.conM / 2 - L.conGap - S, cx = bx + S / 2, cy = y0 + S / 2, r = S / 2 - 7 * u;
      g.beginPath(); g.roundRect(bx, y0, S, S, 9 * u);
      g.fillStyle = PLATE; g.fill();
      g.lineJoin = "round"; g.lineWidth = 2.5 * u; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(cx, y0 + 6 * u); g.lineTo(cx, y0 + S - 6 * u); g.moveTo(bx + 6 * u, cy); g.lineTo(bx + S - 6 * u, cy);
      g.lineWidth = 1.5 * u; g.strokeStyle = "rgba(255,255,255,0.22)"; g.stroke();
      // 궤적
      const tr = this._trail[i];
      if (push) { tr.copyWithin(2, 0, TRAIL * 2 - 2); tr[0] = sx; tr[1] = sy; }
      g.beginPath(); g.moveTo(cx + sx * r, cy - sy * r);
      for (let k = 0; k < TRAIL; k++) g.lineTo(cx + tr[k * 2] * r, cy - tr[k * 2 + 1] * r);
      g.lineCap = "round"; g.lineWidth = 3 * u; g.strokeStyle = i ? "rgba(58,216,255,0.45)" : "rgba(255,210,74,0.45)"; g.stroke();
      g.beginPath(); g.arc(cx + sx * r, cy - sy * r, 5.5 * u, 0, 7);
      this.fill2(i ? HC.cyan : HC.gold, 2.5);
    }
  }

  // 조준선 아래 목표 거리
  _distance(ob, d) {
    const g = this.g, u = this.u, L = this.L, color = ob.color || HC.ok;
    const num = d >= 1000 ? `${(d / 1000).toFixed(2)}` : d >= 100 ? d.toFixed(0) : d.toFixed(1), unit = d >= 1000 ? "km" : "m";
    const label = ob.label || "목표";
    g.font = `800 ${Math.max(11 * u, 8.5)}px ${FONT}`;
    const lw = g.measureText(label).width;
    g.font = `800 ${Math.max(19 * u, 8.5)}px ${MONO}`;
    const nw = g.measureText(num).width;
    const w = lw + nw + 52 * u, h = 26 * u, x = L.cx - w / 2, y = L.cy + (L.touch ? 62 : 80) * u;
    this.plate(x, y, w, h, { fill: PLATE_HI, accent: color, skew: 0.3 });
    this.text(label, x + 18 * u, y + h / 2 + 1 * u, { size: 11, base: "middle", color, shadow: false });
    this.text(num, x + w - 26 * u, y + h / 2 + 1 * u, { size: 19, align: "right", base: "middle", mono: true, shadow: false });
    this.text(unit, x + w - 23 * u, y + h / 2 + 3 * u, { size: 10, base: "middle", color: HC.dim, shadow: false });
  }

  // 경고 띠(추락·뒤집힘·구역 이탈)
  banner(txt, y, color = HC.warn, size = 20) {
    const g = this.g, u = this.u, L = this.L;
    g.font = `800 ${Math.max(size * u, 8.5)}px ${FONT}`;
    const w = g.measureText(txt).width + 44 * u, h = (size + 16) * u;
    this.plate(L.cx - w / 2, y - h / 2, w, h, { fill: PLATE_HI, accent: color, skew: 0.3, aw: 8 });
    this.text(txt, L.cx + 4 * u, y + 1 * u, { size, align: "center", base: "middle", color, shadow: false });
  }

  _warnings(session) {
    const pl = session.player, b = pl.body, H = this.H;
    const R = session.world.size;
    const out = Math.max(Math.abs(b.pos.x), Math.abs(b.pos.z)) - R;
    if (pl.crashed) this.banner("추락! 재배치 중…", H * 0.36, HC.warn, 24);
    else if (b.flipped && b.onGround) this.banner("뒤집혔습니다 — R 키로 다시 세우기", H * 0.36, HC.gold, 18);
    else if (out > 0 || b.pos.y > session.world.ceiling) {
      if (Math.floor(session.time * 4) % 2) this.banner("⚠ 비행 구역 이탈 — 돌아가세요", H * 0.3, HC.warn, 20);
    }
  }

  drawToasts(dt) {
    const g = this.g, u = this.u, W = this.W, H = this.H, L = this.L;
    this.fade(1);
    let y = H * 0.24;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t += dt;
      if (t.t > t.dur) { this.toasts.splice(i, 1); continue; }
    }
    for (const t of this.toasts) {
      // 튀어나오며 등장 → 서서히 사라짐
      const a = Math.min(1, t.t * 8) * Math.min(1, (t.dur - t.t) * 4), p = Math.min(1, t.t / 0.18), sc = 1 + (1 - p) * (1 - p) * 0.55;
      this.fade(a);
      g.save(); g.translate(W / 2, y); g.scale(sc, sc);
      this.text(t.text, 0, 0, { size: t.size, align: "center", color: t.color });
      g.restore();
      y += (t.size + 12) * u;
    }
    this.fade(1);
    for (let i = this.feedLines.length - 1; i >= 0; i--) {
      const f = this.feedLines[i];
      f.t += dt;
      if (f.t > 5) { this.feedLines.splice(i, 1); continue; }
    }
    if (this.lvl === "full") {
      let fy = L.feedY;
      for (const f of this.feedLines) {
        this.fade(Math.min(1, (5 - f.t) * 2) * Math.min(1, f.t * 6));
        this.text(f.text, L.feedX, fy, { size: 13, align: "right", color: f.color });
        fy += 19 * u;
      }
    }
    g.globalAlpha = 1;
  }
}

const SPEED_TAPE = { range: 70, step: 5, major: 20, min: 0, int: true, label: "속도", unit: "km/h", color: HC.gold };
const ALT_TAPE = { range: 28, step: 2, major: 10, min: 0, max: undefined, label: "고도", unit: "m", color: HC.cyan };
