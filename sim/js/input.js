// 입력: 키보드 · 게임패드(RC 조종기 포함) · 터치 가상 스틱 → 좌/우 스틱 → 스틱 모드(1~4)별 채널
import { settings, STICK_MODES, clamp } from "./config.js";

const KEY_ACTIONS = {
  Space: "fire", KeyF: "missile", ControlLeft: "missile", KeyE: "item", KeyQ: "item",
  KeyC: "camera", KeyR: "reset", KeyM: "modeNext", Escape: "pause", KeyP: "pause", Tab: "score",
  Digit1: "mode1", Digit2: "mode2", Digit3: "mode3", Digit4: "mode4", Digit5: "mode5",
};
// 표준 게임패드 버튼 → 동작
const PAD_ACTIONS = { 0: "item", 1: "reset", 2: "camera", 3: "modeNext", 4: "missile", 5: "fire", 6: "missile", 7: "fire", 9: "pause" };
const HOLD = new Set(["fire", "score"]);

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
        const r = zone.getBoundingClientRect();
        ox = e.clientX; oy = e.clientY;
        base.style.left = `${ox - r.left}px`; base.style.top = `${oy - r.top}px`;
        base.classList.add("on");
        this.touch.active = true;
        e.preventDefault();
      });
      zone.addEventListener("pointermove", (e) => {
        if (e.pointerId !== id) return;
        set(clamp((e.clientX - ox) / R, -1, 1), clamp(-(e.clientY - oy) / R, -1, 1));
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
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected && p.axes.length >= 2) return p;
    return null;
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
    const pad = this._pad();
    this.padName = pad ? pad.id : "";
    this.padAxes = pad ? Array.from(pad.axes) : [];
    if (pad) {
      const g = settings.gamepad, dz = g.deadzone;
      let moved = false;
      const prev = this.padHeld;
      const now = new Set();
      pad.buttons.forEach((b, i) => {
        const a = PAD_ACTIONS[i];
        if (a && (b.pressed || b.value > 0.5)) { now.add(a); if (!prev.has(a)) this.queue.push(a); }
      });
      this.padHeld = now;
      const pv = {};
      for (const a of ["lx", "ly", "rx", "ry"]) {
        const m = g.axes[a];
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
