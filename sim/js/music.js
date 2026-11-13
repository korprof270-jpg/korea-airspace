// 배경 음악: 외부 파일 없이 WebAudio 로 즉석 연주하는 "경기장 음악"
// 경기장 응원곡처럼 — 발 구르기·박수(쿵쿵 짝) / 8분 음표로 밀어붙이는 록 베이스·파워코드 / 관악 팡파르 / 경기장 오르간 /
// 관중 함성·"헤이!" 구호 / 스네어 롤로 끌어올렸다 터뜨리는 구성. 맵마다 조성·템포·리드 악기만 바꿔 테마를 입힌다
import { settings } from "./config.js";

const MAJ = [0, 2, 4, 5, 7, 9, 11], MIX = [0, 2, 4, 5, 7, 9, 10], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], PENT = [0, 2, 4, 7, 9];
const I = [0, 2, 4], IV = [3, 5, 7], V = [4, 6, 8], vi = [5, 7, 9], bVI = [5, 7, 9], bVII = [6, 8, 10];

// bpm, root(MIDI), scale, chords(마디별), lead(팡파르·리프 악기), guitar(파워코드 유무), amb(맵 환경음)
const THEMES = {
  menu: { bpm: 118, root: 52, scale: MAJ, chords: [I, IV, V, IV], lead: "brass", guitar: true },
  city: { bpm: 120, root: 52, scale: MIX, chords: [I, bVII, IV, I], lead: "organ", guitar: true },
  arena: { bpm: 124, root: 50, scale: MIN, chords: [I, bVI, bVII, I], lead: "brass", guitar: true },
  factory: { bpm: 116, root: 53, scale: MIX, chords: [I, IV, bVII, IV], lead: "brass", guitar: true, amb: "waves" },
  canyon: { bpm: 118, root: 50, scale: DOR, chords: [I, bVII, IV, I], lead: "guitar", guitar: true, amb: "wind" },
  palace: { bpm: 118, root: 55, scale: PENT, chords: [[0, 2, 4], [0, 2, 4], [3, 5, 7], [1, 3, 5]], lead: "gaya", guitar: false, amb: "wind" },
  snow: { bpm: 120, root: 57, scale: MAJ, chords: [I, vi, IV, V], lead: "bell", guitar: true, amb: "wind" },
  island: { bpm: 118, root: 53, scale: MAJ, chords: [I, IV, V, IV], lead: "marimba", guitar: false, amb: "waves" },
  moon: { bpm: 116, root: 50, scale: MIN, chords: [I, bVI, I, bVII], lead: "synth", guitar: true, amb: "drone" },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.theme = null; this.want = "menu";
    this.step = 0; this.next = 0;
    this.amb = [];
    setInterval(() => this._tick(), 80);
  }

  setTheme(id) { this.want = THEMES[id] ? id : "menu"; }
  setVolume() { if (this.out) this.out.gain.setTargetAtTime(settings.musicVolume * 1.1, this.sound.ctx.currentTime, 0.05); }

  _init() {
    const ctx = this.sound.ctx;
    this.out = ctx.createGain(); this.out.gain.value = settings.musicVolume * 1.1;
    this.out.connect(this.sound.master);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18; this.comp.ratio.value = 3.5; this.comp.attack.value = 0.005; this.comp.release.value = 0.14;
    this.comp.connect(this.out);
    this.drive = ctx.createGain(); this.drive.gain.value = 0.42;
    const sat = ctx.createWaveShaper(); sat.curve = this._curve(1.4); this.drive.connect(sat); sat.connect(this.comp);
    this.bus = ctx.createGain(); this.bus.connect(this.drive);
    // 경기장 울림: 지연 세 갈래를 겹친 간이 잔향
    this.verb = ctx.createGain(); this.verb.gain.value = 0.5;
    for (const [d, fbk] of [[0.083, 0.45], [0.131, 0.4], [0.197, 0.35]]) {
      const dl = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
      dl.delayTime.value = d; fb.gain.value = fbk; lp.type = "lowpass"; lp.frequency.value = 2600;
      this.verb.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(this.comp);
    }
    // 기타 앰프: 강하게 찌그러뜨린 뒤 캐비닛처럼 고역을 깎는다
    this.amp = ctx.createWaveShaper(); this.amp.curve = this._curve(9); this.amp.oversample = "2x";
    const cab = ctx.createBiquadFilter(); cab.type = "lowpass"; cab.frequency.value = 3600; cab.Q.value = 0.8;
    const cab2 = ctx.createBiquadFilter(); cab2.type = "peaking"; cab2.frequency.value = 900; cab2.gain.value = 4;
    this.ampIn = ctx.createGain();
    this.ampOut = ctx.createGain(); this.ampOut.gain.value = 0.13;
    this.ampIn.connect(this.amp); this.amp.connect(cab); cab.connect(cab2); cab2.connect(this.ampOut);
  }
  _curve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  _start(id) {
    const ctx = this.sound.ctx, T = (this.T = THEMES[id]), now = ctx.currentTime;
    this.theme = id;
    const old = this.bus; old.gain.setTargetAtTime(0, now, 0.3); setTimeout(() => old.disconnect(), 2500);
    for (const a of this.amb) { a.g.gain.setTargetAtTime(0, now, 0.5); const n = a; setTimeout(() => { try { n.src.stop(); } catch (_) {} n.g.disconnect(); }, 3000); }
    this.amb = [];
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.gain.setTargetAtTime(1, now + 0.2, 0.4);
    this.bus.connect(this.drive);
    this.ampOut.disconnect(); this.ampOut.connect(this.bus);
    this.spb = 60 / T.bpm / 4;
    this.step = 0; this.next = now + 0.4;
    this.r = rng(id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    this.fanfare = this._compose(T);
    this._crowd();
    if (T.amb) this._ambience(T.amb);
  }

  // 팡파르: 화음 구성음 위주로 크게 도약하는 2마디 동기(A A' A B). 센박에 길게, 사이는 짧게 몰아친다
  _compose(T) {
    const r = this.r, n = T.scale.length;
    const motif = (start) => {
      const out = []; let deg = start;
      for (let s = 0; s < 32; s++) {
        const w = [1, 0.15, 0.5, 0.35, 0.8, 0.15, 0.55, 0.4][s % 8] * (s >= 26 ? 0.5 : 1);
        if (r() > w) { out.push(null); continue; }
        const j = r();
        deg += s % 4 === 0 ? (j < 0.4 ? 2 : j < 0.7 ? -2 : j < 0.85 ? 4 : -1) : (j < 0.5 ? 1 : -1);
        deg = Math.max(n, Math.min(2 * n + 2, deg));
        out.push({ deg, len: s % 4 === 0 ? 3 : 1.2 });
      }
      out[0] = { deg: start, len: 3 }; out[28] = { deg: start + 4, len: 4 };
      return out;
    };
    const A = motif(n + 2), B = motif(n + 4);
    const A2 = A.map((x, i) => (i >= 24 && x ? { deg: x.deg + 1, len: x.len } : x));
    return [...A, ...A2, ...A, ...B];
  }

  note(T, deg, oct = 0) { const n = T.scale.length; return mtof(T.root + T.scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n) + 12 * oct); }

  _tick() {
    const s = this.sound;
    if (!s.ok || s.ctx.state !== "running") return;
    if (!this.out) this._init();
    if (settings.musicVolume <= 0.01) { if (this.theme) { this.bus.gain.setTargetAtTime(0, s.ctx.currentTime, 0.2); for (const a of this.amb) a.g.gain.setTargetAtTime(0, s.ctx.currentTime, 0.2); this.theme = null; } return; }
    if (this.want !== this.theme) this._start(this.want);
    const now = s.ctx.currentTime;
    if (this.next < now - 0.5) this.next = now + 0.05;
    while (this.next < now + 0.25) { this._play(this.step, this.next); this.step++; this.next += this.spb; }
  }

  // 16마디 구성: 0~1 쿵쿵짝+함성 / 2~7 밴드 / 8~11 팡파르 / 12~14 고조(스네어 롤·라이저·오르간) / 15 탐 필인과 "헤이!"
  _play(step, t) {
    const T = this.T, s16 = step % 16, bar = step >> 4, sec = bar % 16, ch = T.chords[bar % T.chords.length], n = T.scale.length, spb = this.spb;
    const intro = bar < 2, build = sec >= 12 && sec <= 14, last = sec === 15, hook = sec >= 8 && sec <= 11;
    const beat = s16 % 4 === 0, b = s16 >> 2;

    if (s16 === 0 && bar > 0 && (bar === 2 || sec === 0 || sec === 8)) { this._crash(t, 0.32); this._crowdSwell(t, 0.6); }
    // 쿵쿵 짝: 1박·1박 반 발 구르기, 2·4박 박수 (경기장 응원 리듬)
    if (!last) {
      if (s16 === 0 || s16 === 2 || s16 === 8 || s16 === 10) this._stomp(t, s16 % 8 === 0 ? 1 : 0.85);
      if (!intro && !build && (s16 === 6 || s16 === 14) && bar % 2) this._kick(t, 0.6);
      if ((b === 1 || b === 3) && beat) { this._clap(t, 0.5); this._crowdClap(t, intro ? 0.35 : 0.22); }
    }
    // 하이햇(밴드 구간)·라이드(팡파르 구간): 8분
    if (!intro && !last && s16 % 2 === 0) this._hat(t, beat ? 0.26 : 0.18, hook);
    // 고조: 스네어가 4분 → 8분 → 16분으로 빨라지며 커진다
    if (build) {
      const dens = sec === 12 ? 4 : sec === 13 ? 2 : 1;
      if (s16 % dens === 0) this._snare(t, 0.12 + (((sec - 12) * 16 + s16) / 48) * 0.32);
      if (sec === 14 && s16 === 0) this._riser(t, spb * 32);
    }
    // 필인: 탐이 내려오고 → 마지막 박 "헤이!"
    if (last) {
      if (s16 < 12) this._tom(t, [196, 196, 165, 165, 147, 147, 123, 123, 110, 110, 98, 98][s16], 0.55);
      if (s16 === 12) { this._hey(t, 0.9); this._kick(t, 1); this._crash(t, 0.25); }
    }
    if (intro && s16 === 12 && bar === 1) this._hey(t, 0.8);

    // 베이스: 8분 음표로 근음을 밀어붙인다(두 마디마다 끝에서 5도·옥타브로 걸어 올라감)
    if (!intro && !last && s16 % 2 === 0) {
      const walk = s16 >= 12 && bar % 2 ? [0, 4, 7][((s16 - 12) / 2) | 0] || 0 : 0;
      this._bass(this.note(T, ch[0] + (walk === 7 ? n : walk === 4 ? 4 : 0), -2), t, spb * 1.8, beat ? 0.3 : 0.24);
    }
    // 파워코드 기타: 8분 뮤트 연타, 마디 첫 박(4마디마다·팡파르 구간)은 길게 울린다
    if (T.guitar && !intro && !last && s16 % 2 === 0) {
      const ring = s16 === 0 && (hook || bar % 4 === 0);
      this._power(this.note(T, ch[0], -1), t, ring ? spb * 7 : spb * 1.1, ring ? 0.9 : 0.55);
    }
    // 관악 팡파르 히트: 마디 첫 박 + 4마디마다 당김 히트
    if (!intro && ((s16 === 0 && (hook || bar % 2 === 0)) || (bar % 4 === 3 && s16 === 14))) {
      this._brass(ch.map((d) => this.note(T, d, 0)).concat([this.note(T, ch[0], 1)]), t, spb * (s16 === 0 ? 4 : 1.6), 0.24);
    }
    // 리드: 팡파르 구간에서 리프, 밴드 구간 뒷부분에서는 짧게 응수
    if (hook || (sec >= 4 && sec <= 7 && s16 >= 8)) {
      const nt = this.fanfare[step % this.fanfare.length];
      if (nt) this._lead(T.lead, this.note(T, nt.deg, 0), t, spb * nt.len, hook ? 0.28 : 0.2);
    }
    // 경기장 오르간: 고조 구간에서 화음을 타고 계속 올라가는 아르페지오
    if (build && s16 % 2 === 0) {
      const k = ((sec - 12) * 8 + s16 / 2) | 0;
      this._organ(this.note(T, ch[k % ch.length] + (((k / 3) | 0) % n), 1), t, spb * 1.6, 0.11);
    }
  }

  _env(g, t, atk, dur, vol) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); }
  _tone(type, f, t, dur, vol, cut, atk = 0.004, verb = 0, dest = this.bus, det = 0) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = det; lp.type = "lowpass"; lp.frequency.value = cut;
    this._env(g, t, atk, dur, vol);
    o.connect(lp); lp.connect(g); g.connect(dest);
    if (verb) { const sg = ctx.createGain(); sg.gain.value = verb; g.connect(sg); sg.connect(this.verb); }
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  _noise(t, dur, vol, freq, type, q, f1 = 0, verb = 0, atk = 0.002) {
    const ctx = this.sound.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.sound.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, atk, dur, vol);
    s.connect(f); f.connect(g); g.connect(this.bus);
    if (verb) { const sg = ctx.createGain(); sg.gain.value = verb; g.connect(sg); sg.connect(this.verb); }
    s.start(t, Math.random() * 0.5, dur + 0.05);
    return g;
  }

  // ── 타악 ──
  // 발 구르기: 낮게 퍼지는 킥 + 나무 바닥을 치는 둔탁한 잡음, 잔향을 넉넉히
  _stomp(t, vol) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.08);
    this._env(g, t, 0.003, 0.32, vol);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.4);
    const sg = ctx.createGain(); sg.gain.value = 0.25; g.connect(sg); sg.connect(this.verb);
    this._noise(t, 0.09, vol * 0.4, 380, "bandpass", 1.2, 0, 0.5);
  }
  _kick(t, vol) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.06);
    this._env(g, t, 0.002, 0.26, vol * 0.85);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.3);
    this._noise(t, 0.012, vol * 0.25, 3000, "bandpass", 0.9);
  }
  // 박수: 짧은 잡음 여러 번 + 경기장 잔향
  _clap(t, vol) {
    for (let k = 0; k < 4; k++) this._noise(t + k * 0.009, 0.018, vol * 0.7, 1250, "bandpass", 1.5);
    this._noise(t + 0.035, 0.2, vol, 1400, "bandpass", 1, 0, 0.6);
  }
  // 관중 박수: 여러 사람이 조금씩 어긋나게 친다
  _crowdClap(t, vol) {
    for (let k = 0; k < 9; k++) this._noise(t + (this.r() - 0.3) * 0.045, 0.03, vol * (0.4 + this.r() * 0.5), 900 + this.r() * 1400, "bandpass", 2, 0, 0.5);
  }
  _snare(t, vol) {
    this._noise(t, 0.14, vol, 2200, "bandpass", 0.7, 0, 0.3);
    this._noise(t, 0.07, vol * 0.5, 6000, "highpass", 0.7);
    this._tone("triangle", 200, t, 0.08, vol * 0.5, 1800, 0.001).frequency.exponentialRampToValueAtTime(150, t + 0.07);
  }
  _tom(t, f, vol) {
    const o = this._tone("sine", f * 1.5, t, 0.32, vol, 1200, 0.002, 0.35);
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    this._noise(t, 0.04, vol * 0.3, 900, "bandpass", 1.5);
  }
  _hat(t, vol, ride) {
    if (ride) { this._tone("square", 5200, t, 0.22, vol * 0.2, 9000, 0.001, 0.2); this._noise(t, 0.2, vol * 0.5, 7000, "highpass", 0.6); }
    else this._noise(t, 0.06, vol, 7500, "highpass", 0.8);
  }
  _crash(t, vol) { this._noise(t, 1.6, vol, 5000, "highpass", 0.5, 0, 0.4); this._noise(t, 0.8, vol * 0.5, 3200, "bandpass", 0.6); }
  _riser(t, dur) {
    const g = this._noise(t, dur, 0.001, 400, "bandpass", 2.5, 6000);
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.97); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }

  // ── 관중 ──
  // "헤이!": 여러 사람의 외침 — 잡음을 모음 "에" 포먼트(약 550·1800·2500Hz)로 걸러 짧게 끊고, 성대 울림을 섞는다
  _hey(t, vol) {
    const ctx = this.sound.ctx;
    for (let v = 0; v < 6; v++) {
      const d = (this.r() - 0.5) * 0.03, sh = 0.85 + this.r() * 0.35;
      const src = ctx.createBufferSource(); src.buffer = this.sound.noiseBuf;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(vol * 0.5, t + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + d + 0.32);
      for (const [f, q, k] of [[550, 6, 1], [1800, 8, 0.6], [2500, 9, 0.35]]) {
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(f * sh, t); bp.frequency.linearRampToValueAtTime(f * sh * 1.08, t + 0.2); bp.Q.value = q;
        const kg = ctx.createGain(); kg.gain.value = k * 3; src.connect(bp); bp.connect(kg); kg.connect(g);
      }
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = "sawtooth";
      o.frequency.setValueAtTime((150 + this.r() * 90) * sh, t + d); o.frequency.linearRampToValueAtTime((175 + this.r() * 90) * sh, t + d + 0.25);
      const obp = ctx.createBiquadFilter(); obp.type = "bandpass"; obp.frequency.value = 600 * sh; obp.Q.value = 2;
      og.gain.value = 0.25; o.connect(obp); obp.connect(og); og.connect(g); o.start(t + d); o.stop(t + d + 0.35);
      g.connect(this.bus); const sg = ctx.createGain(); sg.gain.value = 0.6; g.connect(sg); sg.connect(this.verb);
      src.start(t + d, this.r() * 0.5, 0.4);
    }
  }
  // 관중 함성(지속): 넓은 대역 잡음이 천천히 일렁이고, 크래시 때 확 커진다
  _crowd() {
    const ctx = this.sound.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.sound.noiseBuf; src.loop = true; src.playbackRate.value = 0.7;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.5;
    const pk = ctx.createBiquadFilter(); pk.type = "peaking"; pk.frequency.value = 1900; pk.gain.value = 5; pk.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.035, t + 0.3, 1.2);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(bp); bp.connect(pk); pk.connect(g); g.connect(this.out); src.start();
    this.crowdG = g;
    this.amb.push({ src, g });
  }
  _crowdSwell(t, k) {
    if (!this.crowdG) return;
    const g = this.crowdG.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.035, t); g.linearRampToValueAtTime(0.035 + 0.1 * k, t + 0.15); g.setTargetAtTime(0.035, t + 0.3, 0.9);
  }

  // ── 음정 악기 ──
  _bass(f, t, dur, vol) {
    const ctx = this.sound.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 2; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(420, t + 0.12);
    this._env(g, t, 0.003, dur, vol);
    for (const [type, det] of [["sawtooth", -4], ["square", 4]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    lp.connect(g); g.connect(this.bus);
    this._tone("sine", f, t, dur, vol * 0.6, 200, 0.003);
  }
  // 파워코드(근음·5도·옥타브)를 앰프로 찌그러뜨린다
  _power(f, t, dur, vol) {
    const ctx = this.sound.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.setTargetAtTime(0.0001, t + dur * 0.6, dur * 0.25);
    for (const [m, det] of [[1, -6], [1, 6], [1.5, 0], [2, 3]]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * m; o.detune.value = det; o.connect(g); o.start(t); o.stop(t + dur * 1.4 + 0.05); }
    g.connect(this.ampIn);
  }
  // 관악 섹션: 필터를 "빠밤" 열었다 닫고 음을 아래에서 밀어 올린다
  _brass(freqs, t, dur, vol) {
    const ctx = this.sound.ctx;
    for (const f of freqs) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(), v = vol / Math.sqrt(freqs.length);
      lp.type = "lowpass"; lp.Q.value = 1.2; lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(3600, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1700, t + 0.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.025); g.gain.setValueAtTime(v * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.1);
      for (const d of [-9, 0, 8]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.detune.value = d; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04); o.connect(lp); o.start(t); o.stop(t + dur + 0.15); }
      lp.connect(g); g.connect(this.bus);
      const sg = ctx.createGain(); sg.gain.value = 0.35; g.connect(sg); sg.connect(this.verb);
    }
  }
  // 경기장 오르간: 배음(드로바) 몇 개를 겹친 사인
  _organ(f, t, dur, vol) {
    for (const [m, k] of [[1, 1], [2, 0.7], [3, 0.4], [4, 0.3], [6, 0.15]]) this._tone("sine", f * m, t, dur, vol * k, 9000, 0.006, 0.25);
  }
  _lead(kind, f, t, dur, vol) {
    const ctx = this.sound.ctx;
    switch (kind) {
      case "brass": this._brass([f * 2, f * 4], t, Math.max(dur, 0.14), vol); break;
      case "organ": this._organ(f * 2, t, dur * 1.1, vol * 0.5); break;
      case "guitar": { const g = ctx.createGain(); this._env(g, t, 0.003, dur * 1.6, vol * 1.6); for (const d of [-5, 5]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * 2; o.detune.value = d; o.connect(g); o.start(t); o.stop(t + dur * 1.6 + 0.05); } g.connect(this.ampIn); break; }
      case "synth": for (const d of [-12, 0, 12]) this._tone("sawtooth", f * 2, t, dur * 1.2, vol * 0.4, 3200, 0.004, d ? 0 : 0.4, this.bus, d); break;
      case "marimba": this._tone("sine", f * 2, t, 0.4, vol * 1.5, 4000, 0.002, 0.3); this._tone("triangle", f * 8, t, 0.05, vol * 0.5, 7000, 0.001); this._brass([f * 2], t, 0.12, vol * 0.4); break;
      case "bell": this._tone("sine", f * 4, t, 1.1, vol * 0.9, 7000, 0.002, 0.5); this._tone("sine", f * 11, t, 0.4, vol * 0.25, 9000, 0.001, 0.3); this._brass([f * 2], t, Math.max(dur, 0.14), vol * 0.5); break;
      case "gaya": {   // 가야금풍 + 태평소풍 관악을 겹쳐 경기장에서도 들리게
        const o = this._tone("triangle", f * 2, t, dur * 1.8, vol * 1.4, 3200, 0.002, 0.4);
        o.frequency.setValueAtTime(f * 2.08, t); o.frequency.exponentialRampToValueAtTime(f * 2, t + 0.05);
        for (let k = 1; k < 5; k++) o.frequency.setValueAtTime(f * 2 * (1 + (k % 2 ? 0.014 : -0.014)), t + 0.16 + k * 0.07);
        const p = this._tone("square", f * 4, t, Math.max(dur, 0.16), vol * 0.35, 2600, 0.01, 0.3);
        p.frequency.setValueAtTime(f * 3.9, t); p.frequency.linearRampToValueAtTime(f * 4, t + 0.06);
        break;
      }
    }
  }

  // 맵 환경음(작게): 파도·바람·낮은 울림
  _ambience(kind) {
    const ctx = this.sound.ctx, t = ctx.currentTime;
    const layer = (type, freq, q, vol, lfoHz, depth, fDepth = 0) => {
      const src = ctx.createBufferSource(); src.buffer = this.sound.noiseBuf; src.loop = true; src.playbackRate.value = 0.6 + Math.random() * 0.3;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(vol, t + 0.5, 1.5);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = lfoHz; lg.gain.value = vol * depth; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      if (fDepth) { const lf = ctx.createGain(); lf.gain.value = fDepth; lfo.connect(lf); lf.connect(f.frequency); }
      src.connect(f); f.connect(g); g.connect(this.out); src.start();
      this.amb.push({ src, g });
    };
    if (kind === "waves") layer("lowpass", 520, 0.5, 0.03, 0.11, 0.85, 260);
    else if (kind === "wind") layer("bandpass", 420, 1.1, 0.025, 0.07, 0.7, 180);
    else if (kind === "drone") layer("lowpass", 140, 0.8, 0.04, 0.05, 0.5, 40);
  }
}
