// 배경 음악: 외부 파일 없이 WebAudio 로 맵 테마별 곡을 즉석에서 연주한다 (패드·베이스·리드·타악 + 바람/파도 같은 환경음)
import { settings } from "./config.js";

const MIN = [0, 2, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11], PENT = [0, 2, 5, 7, 9];
// bpm, root(MIDI), scale, chords(마디별 음계 도수), pad·lead 음색, lead 밀도, arp(16분 아르페지오), 베이스·타악 패턴(16칸), amb(환경음)
const THEMES = {
  menu: { bpm: 120, root: 57, scale: MIN, chords: [[0, 2, 4], [5, 7, 9], [2, 4, 6], [6, 8, 10]], pad: "sawtooth", lead: "pluck", dens: 0.34, oct: 1, arp: "pluck", bassType: "sawtooth", bass: "x.x.x.x.x.x.x.xx", kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", open: "..x...x...x...x." },
  city: { bpm: 128, root: 57, scale: MIN, chords: [[0, 2, 4], [5, 7, 9], [2, 4, 6], [6, 8, 10]], pad: "sawtooth", lead: "pluck", dens: 0.4, oct: 1, arp: "pluck", bassType: "sawtooth", bass: "x.xxx.xxx.xxx.xx", kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", open: "..x...x...x...x." },
  arena: { bpm: 142, root: 55, scale: MIN, chords: [[0, 2, 4], [0, 2, 4], [5, 7, 9], [6, 8, 10]], pad: "sawtooth", lead: "pluck", dens: 0.45, oct: 1, arp: "pluck", bassType: "sawtooth", bass: "xxxxxxxxxxxxxxxx", kick: "x...x...x...x.x.", snare: "....x.......x..x", hat: "x.xxx.xxx.xxx.xx", open: "..x...x...x...x." },
  factory: { bpm: 114, root: 60, scale: MAJ, chords: [[0, 2, 4, 6], [5, 7, 9, 11], [3, 5, 7, 9], [4, 6, 8]], pad: "triangle", lead: "ep", dens: 0.42, oct: 1, arp: "ep", bass: "x..x..x.x..x.x..", kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", open: "......x.......x.", amb: "waves" },
  canyon: { bpm: 126, root: 50, scale: DOR, chords: [[0, 2, 4], [3, 5, 7], [0, 2, 4], [6, 8, 10]], pad: "triangle", lead: "guitar", dens: 0.45, oct: 1, arp: "guitar", bass: "x.xxx.xxx.xxx.xx", kick: "x.....x.x.....x.", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx", amb: "wind" },
  palace: { bpm: 120, root: 55, scale: PENT, chords: [[0, 3], [0, 3], [1, 4], [0, 3]], pad: "sine", lead: "gaya", dens: 0.55, oct: 1, arp: "gaya", arpStep: 4, bass: "x.....x...x.....", kick: "x..x..x..x.x..x.", snare: "", hat: "..x..x..x.x..x.x", drum: "janggu", amb: "wind" },
  snow: { bpm: 132, root: 62, scale: MAJ, chords: [[0, 2, 4], [4, 6, 8], [5, 7, 9], [3, 5, 7]], pad: "triangle", lead: "bell", dens: 0.42, oct: 2, arp: "marimba", bass: "x.x.x.x.x.x.x.x.", kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", open: "..x...x...x...x.", amb: "wind" },
  island: { bpm: 126, root: 60, scale: MAJ, chords: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [3, 5, 7]], pad: "triangle", lead: "marimba", dens: 0.6, oct: 1, arp: "marimba", bass: "x..x..x.x..x..x.", kick: "x..x..x.x..x..x.", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx", open: "..x...x...x...x.", amb: "waves" },
  moon: { bpm: 118, root: 53, scale: LYD, chords: [[0, 2, 4, 6], [1, 3, 5], [0, 2, 4, 6], [4, 6, 8]], pad: "sine", lead: "bell", dens: 0.3, oct: 2, arp: "pluck", bassType: "sawtooth", bass: "x.x.x.x.x.x.x.x.", kick: "x...x...x...x...", snare: "............x...", hat: "..x...x...x...x.", amb: "drone" },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.theme = null; this.want = "menu";
    this.step = 0; this.next = 0;
    this.amb = [];
    setInterval(() => this._tick(), 90);
  }

  setTheme(id) { this.want = THEMES[id] ? id : "menu"; }
  setVolume() { if (this.out) this.out.gain.setTargetAtTime(settings.musicVolume * 1.2, this.sound.ctx.currentTime, 0.05); }

  _init() {
    const ctx = this.sound.ctx;
    this.out = ctx.createGain(); this.out.gain.value = settings.musicVolume * 1.2;
    this.out.connect(this.sound.master);
    this.bus = ctx.createGain(); this.bus.connect(this.out);
    // 공간감: 되먹임 지연
    this.delay = ctx.createDelay(1.5); this.fb = ctx.createGain(); this.fb.gain.value = 0.34;
    const dl = ctx.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 2400;
    this.send = ctx.createGain(); this.send.gain.value = 0.5;
    this.send.connect(this.delay); this.delay.connect(dl); dl.connect(this.fb); this.fb.connect(this.delay); dl.connect(this.out);
  }

  _start(id) {
    const ctx = this.sound.ctx, T = (this.T = THEMES[id]);
    this.theme = id;
    // 이전 곡은 버스째로 서서히 내리고 새 버스로 갈아탄다
    const old = this.bus; old.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => old.disconnect(), 2500);
    for (const a of this.amb) { a.g.gain.setTargetAtTime(0, ctx.currentTime, 0.5); const n = a; setTimeout(() => { try { n.src.stop(); } catch (_) {} n.g.disconnect(); }, 3000); }
    this.amb = [];
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.gain.setTargetAtTime(T.vol || 1, ctx.currentTime + 0.3, 0.8);
    this.bus.connect(this.out);
    this.spb = 60 / T.bpm / 4;
    this.delay.delayTime.value = this.spb * 3;
    this.step = 0; this.next = ctx.currentTime + 0.5;
    // 8마디 선율을 미리 짓는다 (씨앗 고정 → 테마마다 늘 같은 곡, 두 번째 반복에서 살짝 변주)
    this.r = rng(id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    this.phrase = this._compose(T);
    if (T.amb) this._ambience(T.amb);
  }

  _compose(T) {
    const r = this.r, out = [], n = T.scale.length;
    let deg = T.chords[0][0] + n;
    for (let bar = 0; bar < 8; bar++) {
      const ch = T.chords[bar % T.chords.length];
      for (let s = 0; s < 16; s++) {
        const strong = s % 4 === 0 ? 1.7 : s % 2 === 0 ? 1 : 0.45;
        if (r() > T.dens * strong) { out.push(null); continue; }
        // 센박은 화음 구성음으로, 나머지는 한두 도 걸음으로
        if (s % 8 === 0 || r() < 0.3) { const c = ch[(r() * ch.length) | 0] + n; deg = Math.abs(c - deg) > 5 ? c + (deg > c ? n : 0) : c; }
        else deg += r() < 0.5 ? 1 : -1;
        deg = Math.max(n - 2, Math.min(2 * n + 2, deg));
        out.push({ deg, len: r() < 0.3 ? 4 : 2 });
      }
    }
    return out;
  }

  note(T, deg, oct = 0) { const n = T.scale.length; return mtof(T.root + T.scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n) + 12 * oct); }

  _tick() {
    const s = this.sound;
    if (!s.ok || s.ctx.state !== "running") return;
    if (!this.out) this._init();
    if (settings.musicVolume <= 0.01) { if (this.theme) { this.bus.gain.setTargetAtTime(0, s.ctx.currentTime, 0.2); for (const a of this.amb) a.g.gain.setTargetAtTime(0, s.ctx.currentTime, 0.2); this.theme = null; } return; }
    if (this.want !== this.theme) this._start(this.want);
    const now = s.ctx.currentTime;
    if (this.next < now - 0.5) this.next = now + 0.05;   // 탭이 쉬었다 돌아오면 밀린 박을 버린다
    while (this.next < now + 0.25) { this._play(this.step, this.next); this.step++; this.next += this.spb; }
  }

  _play(step, t) {
    const T = this.T, s16 = step % 16, bar = (step >> 4), ch = T.chords[bar % T.chords.length], barLen = this.spb * 16, n = T.scale.length;
    const on = (p) => p && p[s16] === "x";
    const fill = bar % 8 === 7 && s16 >= 12;              // 8마디마다 끝에 필인
    if (s16 === 0) this._pad(ch.map((d) => this.note(T, d, 0)), t, barLen * 1.05, T.pad);
    if (on(T.bass)) this._tone(T.bassType || "triangle", this.note(T, ch[0] + (s16 % 8 === 6 ? n : 0), -2), t, this.spb * 1.7, T.bassType ? 0.14 : 0.24, T.bassType ? 420 : 600, 0.006);
    if (on(T.kick)) T.drum === "janggu" ? this._drum(t, 100, 52, 0.26, 0.42) : this._drum(t, 150, 44, 0.2, 0.5);
    if (on(T.snare) || (fill && T.snare)) { this._noise(t, 0.12, fill ? 0.11 : 0.16, 1900, "bandpass", 0.9); this._tone("triangle", 190, t, 0.07, 0.08, 1500); }
    if (on(T.hat)) T.drum === "janggu" ? this._noise(t, 0.045, 0.17, 1200, "bandpass", 5) : this._noise(t, 0.03, 0.055, 8000, "highpass", 0.7);
    if (on(T.open)) this._noise(t, 0.11, 0.04, 6500, "highpass", 0.7);
    if (T.arp && s16 % (T.arpStep || 2) === 0) {
      const k = (s16 / (T.arpStep || 2)) % 4, up = [0, 1, 2, 1][k];
      this._lead(T.arp, this.note(T, ch[up % ch.length] + (k === 2 ? n : 0), 1), t, this.spb * 1.5, 0.05);
    }
    const pi = step % this.phrase.length, nt = this.phrase[pi];
    // 두 번째 돌 때는 몇 음을 쉬어 변주한다
    if (nt && !((step / this.phrase.length | 0) % 2 === 1 && pi % 7 === 3)) this._lead(T.lead, this.note(T, nt.deg, T.oct - 1), t, this.spb * nt.len * 1.5, 0.12);
  }

  _env(g, t, atk, dur, vol) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  }
  _tone(type, f, t, dur, vol, cut, atk = 0.005, send = 0) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = cut;
    this._env(g, t, atk, dur, vol);
    o.connect(lp); lp.connect(g); g.connect(this.bus);
    if (send) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(this.send); }
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  _pad(freqs, t, dur, type) {
    const ctx = this.sound.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = type === "sawtooth" ? 900 : 1800;
    const v = (type === "sawtooth" ? 0.036 : type === "sine" ? 0.08 : 0.06) / Math.sqrt(freqs.length);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.3); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(this.bus);
    for (const f of freqs) for (const d of [-6, 6]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
  }
  _lead(kind, f, t, dur, vol) {
    switch (kind) {
      case "pluck": this._tone("sawtooth", f, t, Math.min(dur, 0.45), vol * 0.75, 2600, 0.004, 0.5); break;
      case "ep": this._tone("sine", f, t, dur * 1.4, vol * 1.3, 3000, 0.006, 0.4); this._tone("triangle", f * 2, t, dur * 0.5, vol * 0.3, 3000); break;
      case "guitar": this._tone("triangle", f, t, dur * 1.3, vol * 1.3, 2200, 0.003, 0.35); this._tone("sawtooth", f, t, 0.09, vol * 0.4, 3500); break;
      case "marimba": this._tone("sine", f, t, 0.5, vol * 1.5, 4000, 0.002, 0.3); this._tone("sine", f * 4, t, 0.07, vol * 0.45, 6000, 0.001); break;
      case "bell": this._tone("sine", f, t, 2.2, vol, 6000, 0.003, 0.7); this._tone("sine", f * 2.76, t, 0.9, vol * 0.28, 8000, 0.002, 0.5); this._tone("sine", f * 5.4, t, 0.3, vol * 0.1, 9000, 0.001); break;
      case "gaya": {   // 가야금풍: 빠른 뜯는 소리 + 농현(음 끝을 떠는 흔들림)
        const o = this._tone("triangle", f, t, dur * 1.6, vol * 1.5, 2800, 0.002, 0.45);
        o.frequency.setValueAtTime(f * 1.03, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
        for (let k = 1; k < 7; k++) o.frequency.setValueAtTime(f * (1 + (k % 2 ? 0.012 : -0.012)), t + 0.25 + k * 0.09);
        this._tone("sawtooth", f, t, 0.07, vol * 0.5, 4200, 0.001);
        break;
      }
    }
  }
  _drum(t, f0, f1, dur, vol) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    this._env(g, t, 0.002, dur, vol);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  _noise(t, dur, vol, freq, type, q) {
    const ctx = this.sound.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.sound.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    this._env(g, t, 0.002, dur, vol);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  // 환경음: 노이즈를 걸러 천천히 일렁이게 한다
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
    if (kind === "waves") { layer("lowpass", 520, 0.5, 0.11, 0.11, 0.85, 260); layer("bandpass", 1900, 0.7, 0.03, 0.17, 0.9); }
    else if (kind === "wind") { layer("bandpass", 420, 1.1, 0.09, 0.07, 0.7, 180); layer("bandpass", 950, 2.2, 0.03, 0.13, 0.9, 300); }
    else if (kind === "drone") { layer("lowpass", 140, 0.8, 0.16, 0.05, 0.5, 40); }
  }
}
