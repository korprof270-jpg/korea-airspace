// 사운드: 외부 파일 없이 WebAudio 로 합성 (모터음 + 효과음)
import { settings } from "./config.js";

export class Sound {
  constructor() {
    this.ctx = null;
    this.ok = false;
    const unlock = () => this._init();
    addEventListener("pointerdown", unlock, { once: false });
    addEventListener("keydown", unlock, { once: false });
  }

  _init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.gain.value = settings.volume;
      this.master.connect(ctx.destination);
      // 노이즈 버퍼
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // 모터: 톱니파 2개 + 저역 필터, 바람 소리: 노이즈 + 대역 필터
      this.mGain = ctx.createGain(); this.mGain.gain.value = 0;
      this.mFilter = ctx.createBiquadFilter(); this.mFilter.type = "lowpass"; this.mFilter.frequency.value = 900;
      this.osc = [ctx.createOscillator(), ctx.createOscillator()];
      this.osc[0].type = "sawtooth"; this.osc[1].type = "square";
      for (const o of this.osc) { o.frequency.value = 90; o.connect(this.mFilter); o.start(); }
      this.mFilter.connect(this.mGain); this.mGain.connect(this.master);
      this.wind = ctx.createBufferSource(); this.wind.buffer = this.noiseBuf; this.wind.loop = true;
      this.wFilter = ctx.createBiquadFilter(); this.wFilter.type = "bandpass"; this.wFilter.frequency.value = 500; this.wFilter.Q.value = 0.6;
      this.wGain = ctx.createGain(); this.wGain.gain.value = 0;
      this.wind.connect(this.wFilter); this.wFilter.connect(this.wGain); this.wGain.connect(this.master);
      this.wind.start();
      this.ok = true;
    } catch (_) { this.ok = false; }
  }

  setVolume(v) { if (this.master) this.master.gain.value = v; }

  // 매 프레임: 추력(0..1)과 속도(m/s)로 모터음 갱신
  motor(thrust, speed, on = true) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    const f = 85 + thrust * 330;
    this.osc[0].frequency.setTargetAtTime(f, t, 0.03);
    this.osc[1].frequency.setTargetAtTime(f * 2.02, t, 0.03);
    this.mFilter.frequency.setTargetAtTime(500 + thrust * 2600, t, 0.05);
    this.mGain.gain.setTargetAtTime(on ? 0.035 + thrust * 0.09 : 0, t, 0.05);
    this.wFilter.frequency.setTargetAtTime(300 + speed * 22, t, 0.1);
    this.wGain.gain.setTargetAtTime(on ? Math.min(0.22, speed * 0.005) : 0, t, 0.1);
  }

  _tone(type, f0, f1, dur, vol, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, f0, f1, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  // vol: 거리 감쇠 등 상대 음량(0..1)
  play(name, vol = 1) {
    if (!this.ok || vol <= 0.02) return;
    switch (name) {
      case "laser": this._tone("sawtooth", 1500, 320, 0.11, 0.09 * vol); break;
      case "elaser": this._tone("square", 900, 220, 0.12, 0.05 * vol); break;
      case "missile": this._noise(0.5, 0.25 * vol, 3000, 400); this._tone("sawtooth", 200, 90, 0.4, 0.08 * vol); break;
      case "explode": this._noise(0.9, 0.5 * vol, 1800, 60); this._tone("sine", 120, 35, 0.6, 0.35 * vol); break;
      case "hit": this._noise(0.08, 0.2 * vol, 4000, 1200); break;
      case "hurt": this._noise(0.15, 0.3 * vol, 1500, 200); this._tone("square", 180, 90, 0.15, 0.1 * vol); break;
      case "crash": this._noise(0.35, 0.45 * vol, 2500, 120); this._tone("triangle", 160, 50, 0.3, 0.2 * vol); break;
      case "gate": this._tone("sine", 880, 1320, 0.12, 0.16 * vol); this._tone("sine", 1320, 1760, 0.14, 0.12 * vol, 0.07); break;
      case "lap": [660, 880, 1100, 1320].forEach((f, i) => this._tone("triangle", f, f, 0.14, 0.14 * vol, i * 0.08)); break;
      case "beep": this._tone("square", 660, 660, 0.12, 0.1 * vol); break;
      case "go": this._tone("square", 1320, 1320, 0.45, 0.12 * vol); break;
      case "pickup": [520, 780, 1040].forEach((f, i) => this._tone("sine", f, f * 1.02, 0.1, 0.14 * vol, i * 0.06)); break;
      case "item": this._tone("sawtooth", 300, 1200, 0.3, 0.1 * vol); break;
      case "lock": this._tone("square", 1500, 1500, 0.05, 0.07 * vol); break;
      case "warn": this._tone("square", 980, 980, 0.09, 0.09 * vol); this._tone("square", 980, 980, 0.09, 0.09 * vol, 0.14); break;
      case "trick": this._tone("triangle", 700, 1400, 0.16, 0.12 * vol); break;
      case "combo": [784, 988, 1175, 1568].forEach((f, i) => this._tone("triangle", f, f, 0.12, 0.12 * vol, i * 0.05)); break;
      case "fail": this._tone("sawtooth", 300, 80, 0.5, 0.14 * vol); break;
      case "win": [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone("triangle", f, f, 0.22, 0.14 * vol, i * 0.11)); break;
      case "click": this._tone("sine", 900, 700, 0.04, 0.08 * vol); break;
      case "emp": this._tone("sawtooth", 2000, 60, 0.6, 0.16 * vol); this._noise(0.5, 0.2 * vol, 6000, 300); break;
    }
  }
}
