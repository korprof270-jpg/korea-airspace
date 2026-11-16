// 입력: 키보드 · 게임패드(RC 조종기 포함) · 터치 가상 스틱 → 좌/우 스틱 → 스틱 모드(1~4)별 채널
// 게임패드는 종류(Xbox·PS·Switch·일반·RC)를 판별해 종류별 배치를 쓴다 (gamepad.js). 메뉴용 방향·확인·뒤로 입력도 여기서 만든다
import { toGame } from "./rotate.js";
import { settings, STICK_MODES, clamp } from "./config.js";
import { detectPad, glyphsFor, readHat, findHat } from "./gamepad.js";

const KEY_ACTIONS = {
  Space: "fire", KeyF: "missile", ControlLeft: "missile", KeyE: "item", KeyQ: "itemNext",
  KeyC: "camera", KeyR: "reset", KeyM: "modeNext", Escape: "pause", KeyP: "pause", Tab: "score",
  Digit1: "mode1", Digit2: "mode2", Digit3: "mode3", Digit4: "mode4", Digit5: "mode5",
};
const HOLD = new Set(["fire", "score"]);

const _tp = { x: 0, y: 0 };

export class Input {
  constructor() {
    this.keys = new Set();
    this.sticks = { lx: 0, ly: 0, rx: 0, ry: 0 };       // 최종 스틱 값 (-1..1, 위/오른쪽이 +)
    this.kb = { lx: 0, ly: 0, rx: 0, ry: 0 };           // 키보드 스틱(부드럽게 보간)
    this.touch = { lx: 0, ly: 0, rx: 0, ry: 0, active: false };
    this.ctl = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
    this.held = new Set();
    this.queue = [];
    this.padHeld = new Set();
    this.padName = "";
    this.padAxes = [];
    this.device = "keyboard";
    this.enabled = true;
    // 게임패드 상태: padInfo = detectPad() 결과(종류·배치·글리프), onPad(kind, info) = 연결/해제 알림
    this.padIndex = -1;
    this.padInfo = null;
    this.onPad = null;
    this.nav = [];                                      // 메뉴 입력: up | down | left | right | ok | back | any (매 프레임 새로 채움)
    this._navHeld = {}; this._navT = {};
    addEventListener("gamepadconnected", (e) => this._padSeen(e.gamepad));
    addEventListener("gamepaddisconnected", (e) => { if (e.gamepad.index === this.padIndex) this._padGone(); });

    addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (!this.keys.has(e.code)) {
        const a = KEY_ACTIONS[e.code];
        if (a) { this.queue.push(a); this.held.add(a); }
      }
      this.keys.add(e.code);
      if (/^(Arrow|Space|Tab)/.test(e.code)) e.preventDefault();
    });
    addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      const a = KEY_ACTIONS[e.code];
      if (a) this.held.delete(a);
    });
    addEventListener("blur", () => { this.keys.clear(); this.held.clear(); });
    this._initTouch();
  }

  // 한 번 눌림(엣지) 소비
  take(action) {
    const i = this.queue.indexOf(action);
    if (i < 0) return false;
    this.queue.splice(i, 1);
    return true;
  }
  isHeld(action) { return this.held.has(action) || this.padHeld.has(action); }
  flush() { this.queue.length = 0; }

  _initTouch() {
    const layer = document.getElementById("touch");
    if (!layer) return;
    const zones = { L: layer.querySelector(".tz-left"), R: layer.querySelector(".tz-right") };
    const make = (zone, kx, ky) => {
      const knob = zone.querySelector(".knob"), base = zone.querySelector(".base");
      let id = null, ox = 0, oy = 0;
      const R = 64;
      const set = (x, y) => { this.touch[kx] = x; this.touch[ky] = y; knob.style.transform = `translate(${x * R}px, ${-y * R}px)`; };
      zone.addEventListener("pointerdown", (e) => {
        if (id !== null) return;
        id = e.pointerId; zone.setPointerCapture(id);
        toGame(e.clientX, e.clientY, _tp); ox = _tp.x; oy = _tp.y;
        // 구역의 게임 좌표 원점(돌린 화면에서도 맞도록 offset 기준)
        base.style.left = `${ox - zone.offsetLeft}px`; base.style.top = `${oy - zone.offsetTop}px`;
        base.classList.add("on");
        this.touch.active = true;
        e.preventDefault();
      });
      zone.addEventListener("pointermove", (e) => {
        if (e.pointerId !== id) return;
        toGame(e.clientX, e.clientY, _tp);
        set(clamp((_tp.x - ox) / R, -1, 1), clamp(-(_tp.y - oy) / R, -1, 1));
      });
      const end = (e) => { if (e.pointerId !== id) return; id = null; set(0, 0); base.classList.remove("on"); };
      zone.addEventListener("pointerup", end);
      zone.addEventListener("pointercancel", end);
    };
    make(zones.L, "lx", "ly");
    make(zones.R, "rx", "ry");
    layer.querySelectorAll("[data-act]").forEach((b) => {
      const a = b.dataset.act;
      b.addEventListener("pointerdown", (e) => { this.queue.push(a); if (HOLD.has(a)) this.held.add(a); e.preventDefault(); e.stopPropagation(); });
      const up = () => this.held.delete(a);
      b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
    });
  }

  _pad() {
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (_) { /* 권한 정책으로 막힌 환경 */ }
    const cur = this.padIndex >= 0 ? pads[this.padIndex] : null;
    if (cur && cur.connected) return cur;
    for (const p of pads) if (p && p.connected && (p.axes.length >= 2 || p.buttons.length >= 4)) { this._padSeen(p); return p; }
    if (this.padIndex >= 0) this._padGone();
    return null;
  }
  // 새 패드 발견(연결 이벤트 또는 폴링)
  _padSeen(gp) {
    if (!gp || (this.padIndex === gp.index && this.padInfo && this.padInfo.id === gp.id)) return;
    if (this.padIndex >= 0 && this.padIndex !== gp.index) {      // 이미 쓰는 패드가 살아 있으면 그대로
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (pads[this.padIndex] && pads[this.padIndex].connected) return;
    }
    this.padIndex = gp.index;
    this.padInfo = Object.assign(detectPad(gp), { id: gp.id, hat: -2 });
    this._padRef = null;
    this.padHeld = new Set();
    this._navHeld = {};
    if (this.onPad) this.onPad("connect", this.padInfo);
  }
  _padGone() {
    const info = this.padInfo;
    this.padIndex = -1; this.padInfo = null; this.padHeld = new Set(); this.padName = ""; this.padAxes = [];
    const was = this.device === "gamepad";
    if (was) this.device = "keyboard";
    if (info && this.onPad) this.onPad("disconnect", info, was);
  }
  // 지금 입력 장치 기준 버튼 글자 (게임패드면 종류에 맞게, 아니면 키보드)
  glyph(action) {
    const G = this.device === "gamepad" && this.padInfo ? this.padInfo.glyphs : glyphsFor("keyboard");
    return G[action] || "";
  }
  // 이번 프레임의 메뉴 입력 하나 꺼내기
  takeNav() { return this.nav.shift() || null; }

  // 메뉴 입력: 십자키·스틱(방향, 누르고 있으면 반복) + 확인·뒤로
  _menuNav(pad, dt) {
    const info = this.padInfo, b = pad.buttons, pr = (i) => !!(b[i] && (b[i].pressed || b[i].value > 0.5));
    const dir = { up: false, down: false, left: false, right: false };
    if (info.std) { dir.up = pr(12); dir.down = pr(13); dir.left = pr(14); dir.right = pr(15); }
    else {
      if (info.hat < 0) info.hat = findHat(pad);
      if (info.hat >= 0) Object.assign(dir, readHat(pad.axes[info.hat]));
    }
    // 스틱: 표준 패드는 왼쪽 스틱, RC 는 오른쪽 스틱(스로틀이 고정식이라)
    const ax = info.type === "rc" ? info.axes : { lx: { i: 0 }, ly: { i: 1, inv: true } };
    const sx = info.type === "rc" ? (pad.axes[ax.rx.i] || 0) * (ax.rx.inv ? -1 : 1) : pad.axes[0] || 0;
    const sy = info.type === "rc" ? (pad.axes[ax.ry.i] || 0) * (ax.ry.inv ? -1 : 1) : -(pad.axes[1] || 0);
    if (sx < -0.6) dir.left = true; if (sx > 0.6) dir.right = true;
    if (sy > 0.6) dir.up = true; if (sy < -0.6) dir.down = true;
    const H = this._navHeld, T = this._navT;
    for (const k of ["up", "down", "left", "right"]) {
      if (dir[k]) {
        if (!H[k]) { this.nav.push(k); T[k] = 0.38; }
        else if ((T[k] -= dt) <= 0) { this.nav.push(k); T[k] = 0.11; }
      }
      H[k] = dir[k];
    }
    const ok = pr(info.menu.ok), back = pr(info.menu.back);
    if (ok && !H.ok) this.nav.push("ok");
    if (back && !H.back) this.nav.push("back");
    H.ok = ok; H.back = back;
    let anyB = false;
    for (let i = 0; i < b.length; i++) if (pr(i)) { anyB = true; break; }
    if (anyB && !H.any) this.nav.push("any");
    H.any = anyB;
  }

  // 진동: 게임패드(듀얼 럼블) 또는 터치 기기(짧은 진동). strong/weak 0..1, ms 지속 시간. ms<=0 이면 정지
  // 지금 쓰는 입력 장치에만 보낸다. 보냈으면 true
  rumble(strong, weak, ms) {
    if (!settings.fx || !settings.fx.rumble) return false;
    try {
      if (this.device === "gamepad") {
        const pad = this._pad(), act = pad && (pad.vibrationActuator || (pad.hapticActuators && pad.hapticActuators[0]));
        if (!act) return false;
        if (ms <= 0) { if (act.reset) { const r = act.reset(); if (r && r.catch) r.catch(() => {}); } return true; }
        if (act.playEffect) {
          const r = act.playEffect("dual-rumble", { startDelay: 0, duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) });
          if (r && r.catch) r.catch(() => {});
        } else if (act.pulse) {
          const r = act.pulse(clamp(Math.max(strong, weak), 0, 1), ms);
          if (r && r.catch) r.catch(() => {});
        } else return false;
        return true;
      }
      if (this.device === "touch" && navigator.vibrate) {
        if (ms <= 0) { navigator.vibrate(0); return true; }
        const k = clamp(Math.max(strong, weak), 0, 1);
        if (k < 0.12) return false;                    // 아주 약한 진동은 휴대폰에서 생략
        navigator.vibrate(Math.round(clamp(ms * (0.35 + 0.65 * k), 8, 400)));
        return true;
      }
    } catch (_) { /* 진동 미지원 환경 무시 */ }
    return false;
  }

  update(dt) {
    const k = this.keys, kb = this.kb;
    const scale = k.has("ShiftLeft") || k.has("ShiftRight") ? 0.5 : 1;
    const tgt = {
      lx: ((k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0)) * scale,
      ly: ((k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0)) * scale,
      rx: ((k.has("ArrowRight") || k.has("KeyL") ? 1 : 0) - (k.has("ArrowLeft") || k.has("KeyJ") ? 1 : 0)) * scale,
      ry: ((k.has("ArrowUp") || k.has("KeyI") ? 1 : 0) - (k.has("ArrowDown") || k.has("KeyK") ? 1 : 0)) * scale,
    };
    let kbActive = false;
    for (const a of ["lx", "ly", "rx", "ry"]) {
      const rate = (Math.abs(tgt[a]) > Math.abs(kb[a]) ? 5.5 : 9) * dt;
      kb[a] += clamp(tgt[a] - kb[a], -rate, rate);
      if (tgt[a] !== 0) kbActive = true;
    }

    const s = this.sticks;
    s.lx = kb.lx; s.ly = kb.ly; s.rx = kb.rx; s.ry = kb.ry;
    if (kbActive) this.device = "keyboard";

    // 게임패드 / RC 조종기
    this.nav.length = 0;
    const pad = this._pad();
    this.padName = pad ? pad.id : "";
    this.padAxes = pad ? Array.from(pad.axes) : [];
    if (pad && this.padInfo) {
      const g = settings.gamepad, dz = g.deadzone, info = this.padInfo;
      const axes = g.layout === "custom" ? g.axes : info.axes;
      this._menuNav(pad, dt);
      let moved = false;
      const prev = this.padHeld;
      const now = new Set();
      pad.buttons.forEach((b, i) => {
        const a = info.actions[i];
        if (a && (b.pressed || b.value > 0.5)) { now.add(a); if (!prev.has(a)) this.queue.push(a); }
      });
      this.padHeld = now;
      const pv = {};
      for (const a of ["lx", "ly", "rx", "ry"]) {
        const m = axes[a] || g.axes[a];
        let v = pad.axes[m.i] || 0;
        if (m.inv) v = -v;
        v = Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz);
        pv[a] = v;
      }
      // 스로틀이 내려가 있는(-1) RC 조종기도 있으므로, 다른 장치 사용 중에는 기준값 대비 변화로 전환 판단
      if (this.device !== "gamepad") {
        if (!this._padRef || kbActive) this._padRef = pv;
        else for (const a in pv) if (Math.abs(pv[a] - this._padRef[a]) > 0.2) moved = true;
      }
      if (now.size) moved = true;
      if (moved) { this.device = "gamepad"; this._padRef = null; }
      if (this.device === "gamepad") for (const a of ["lx", "ly", "rx", "ry"]) s[a] = clamp(pv[a] + kb[a], -1, 1);
    } else {
      this.padHeld = new Set();
      if (this.device === "gamepad") this.device = "keyboard";
    }
    // 일반 패드의 십자키(햇 스위치)로 아이템 교체
    if (pad && this.padInfo && !this.padInfo.std && this.padInfo.hat >= 0) {
      const h = readHat(pad.axes[this.padInfo.hat]), lr = h.left || h.right;
      if (lr && !this._hatLR) this.queue.push("itemNext");
      this._hatLR = lr;
    }

    if (this.touch.active) {
      const t = this.touch;
      if (t.lx || t.ly || t.rx || t.ry) this.device = "touch";
      if (this.device === "touch") { s.lx = t.lx; s.ly = t.ly; s.rx = t.rx; s.ry = t.ry; }
    }

    // 스틱 모드 → 채널
    const map = STICK_MODES[settings.stickMode] || STICK_MODES[2];
    const c = this.ctl;
    c[map.lx] = s.lx; c[map.ly] = s.ly; c[map.rx] = s.rx; c[map.ry] = s.ry;
    if (settings.invertPitch) c.pitch = -c.pitch;
    if (!this.enabled) { c.throttle = -1; c.yaw = 0; c.pitch = 0; c.roll = 0; }
    return c;
  }
}
