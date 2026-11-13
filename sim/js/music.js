// 배경 음악: 외부 파일 없이 WebAudio 로 맵 테마별 곡을 즉석에서 연주한다
// 구성: 킥·스네어·하이햇·크래시 / 찌그러뜨린 베이스 + 서브 / 화음 스탭 / 슈퍼소 리드 훅 / 아르페지오 / 라이저, 킥에 맞춰 눌리는 사이드체인
import { settings } from "./config.js";

const MIN = [0, 2, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], PHR = [0, 1, 3, 5, 7, 8, 10], PENT = [0, 3, 5, 7, 10];
const I = [0, 2, 4], III = [2, 4, 6], IV = [3, 5, 7], V = [4, 6, 8], VI = [5, 7, 9], VII = [6, 8, 10];
// bpm, root(MIDI), scale, chords(마디별 음계 도수), lead·arp 음색, 리듬 패턴(16칸), amb(환경음)
const THEMES = {
  menu: { bpm: 104, root: 57, scale: MIN, chords: [I, VI, III, VII], lead: "super", arp: "pluck", bass: "x.xx.xx.x.xx.xxx", kick: "x...x...x...x.x.", snare: "....x.......x...", hat: "..x...x...x...x.", shak: "x.xxx.xxx.xxx.xx", stab: "...x..x....x..x." },
  city: { bpm: 108, root: 57, scale: MIN, chords: [I, VI, III, VII], lead: "super", arp: "pluck", bass: "x.xxx.xxx.xxx.xx", kick: "x...x...x...x.x.", snare: "....x.......x...", hat: "..x...x...x...x.", shak: "x.xxx.xxx.xxx.xx", stab: "..x..x....x..x.." },
  arena: { bpm: 118, root: 53, scale: PHR, chords: [I, I, VI, VII], lead: "super", arp: "pluck", bass: "xxxxxxxxxxxxxxxx", kick: "x...x..xx...x.x.", snare: "....x.......x..x", hat: "..x...x...x...x.", shak: "xxxxxxxxxxxxxxxx", stab: "x..x..x.x..x..x." },
  factory: { bpm: 100, root: 55, scale: DOR, chords: [I, IV, I, VII], lead: "super", arp: "ep", bass: "x..x.xx.x..x.x.x", kick: "x...x..xx...x...", snare: "....x.......x...", hat: "..x...x...x...x.", shak: "x.x.xxx.x.x.xxx.", stab: "..x...x..x....x.", amb: "waves" },
  canyon: { bpm: 106, root: 52, scale: MIN, chords: [I, VII, VI, VII], lead: "guitar", arp: "guitar", bass: "x.xxx.xxx.xxx.xx", kick: "x...x.x.x...x.x.", snare: "....x.......x.x.", hat: "..x...x...x...x.", shak: "x.xxx.xxx.xxx.xx", stab: "x.....x...x.....", amb: "wind" },
  palace: { bpm: 104, root: 55, scale: PENT, chords: [[0, 2, 3], [0, 2, 3], [3, 5, 7], [2, 4, 5]], lead: "gaya", arp: "gaya", bass: "x..x..x.x..x.x..", kick: "x..xx...x..xx.x.", snare: "......x.......x.", hat: "", shak: "x.xx.xx.x.xx.xxx", stab: "x.......x.......", drum: "samul", amb: "wind" },
  snow: { bpm: 108, root: 62, scale: MAJ, chords: [I, V, VI, IV], lead: "bell", arp: "marimba", bass: "x.x.x.x.x.x.x.xx", kick: "x...x...x...x.x.", snare: "....x.......x...", hat: "..x...x...x...x.", shak: "x.xxx.xxx.xxx.xx", stab: "..x...x...x...x.", amb: "wind" },
  island: { bpm: 104, root: 60, scale: MAJ, chords: [I, IV, V, IV], lead: "marimba", arp: "marimba", bass: "x..x..x.x..x..x.", kick: "x...x..xx...x.x.", snare: "....x..x....x...", hat: "..x...x...x...x.", shak: "x.xxx.xxx.xxx.xx", stab: "..x..x....x..x..", amb: "waves" },
  moon: { bpm: 100, root: 52, scale: PHR, chords: [I, VI, I, VII], lead: "super", arp: "pluck", bass: "x.xx.xx.x.xx.xx.", kick: "x...x...x...x..x", snare: "....x.......x...", hat: "..x...x...x...x.", shak: "..xx..xx..xx..xx", stab: "x.....x......x..", amb: "drone" },
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
  setVolume() { if (this.out) this.out.gain.setTargetAtTime(settings.musicVolume * 1.0, this.sound.ctx.currentTime, 0.05); }

  _init() {
    const ctx = this.sound.ctx;
    this.out = ctx.createGain(); this.out.gain.value = settings.musicVolume * 1.0;
    this.out.connect(this.sound.master);
    // 마스터: 살짝 찌그러뜨린 뒤 컴프레서로 묶어 단단하게
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -20; this.comp.ratio.value = 3.5; this.comp.attack.value = 0.005; this.comp.release.value = 0.12;
    this.comp.connect(this.out);
    this.drive = ctx.createGain(); this.drive.gain.value = 0.34;   // 버스 입력을 낮춰 컴프레서가 숨 쉴 여유를 준다
    const sat = ctx.createWaveShaper(); sat.curve = this._curve(1.5); this.drive.connect(sat); sat.connect(this.comp);
    this.bus = ctx.createGain(); this.bus.connect(this.drive);
    // 공간감: 되먹임 지연
    this.delay = ctx.createDelay(1.5); this.fb = ctx.createGain(); this.fb.gain.value = 0.3;
    const dl = ctx.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 2800;
    this.send = ctx.createGain(); this.send.gain.value = 0.45;
    this.send.connect(this.delay); this.delay.connect(dl); dl.connect(this.fb); this.fb.connect(this.delay); dl.connect(this.comp);
  }
  _curve(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  _start(id) {
    const ctx = this.sound.ctx, T = (this.T = THEMES[id]), now = ctx.currentTime;
    this.theme = id;
    // 이전 곡은 버스째로 서서히 내리고 새 버스로 갈아탄다
    const old = this.bus; old.gain.setTargetAtTime(0, now, 0.3); setTimeout(() => old.disconnect(), 2500);
    for (const a of this.amb) { a.g.gain.setTargetAtTime(0, now, 0.5); const n = a; setTimeout(() => { try { n.src.stop(); } catch (_) {} n.g.disconnect(); }, 3000); }
    this.amb = [];
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.gain.setTargetAtTime(1, now + 0.2, 0.4);
    this.bus.connect(this.drive);
    // 사이드체인: 킥이 칠 때마다 선율·베이스 쪽이 눌렸다 올라온다
    this.duck = ctx.createGain(); this.duck.connect(this.bus);
    this.bassDrive = ctx.createWaveShaper(); this.bassDrive.curve = this._curve(7); this.bassDrive.connect(this.duck);
    this.spb = 60 / T.bpm / 4;
    this.delay.delayTime.value = this.spb * 3;
    this.step = 0; this.next = now + 0.4;
    this.r = rng(id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    this.hook = this._compose(T);
    if (T.amb) this._ambience(T.amb);
  }

  // 훅: 2마디 동기를 A A' A B 로 되풀이해 귀에 박히게 한다 (씨앗 고정 → 테마마다 늘 같은 곡)
  _compose(T) {
    const r = this.r, n = T.scale.length;
    const motif = (start) => {
      const out = []; let deg = start;
      for (let s = 0; s < 32; s++) {
        const strong = s % 4 === 0 ? 1 : s % 4 === 2 ? 0.75 : s % 2 === 0 ? 0.5 : 0.28;
        if (r() > strong * 0.95) { out.push(null); continue; }
        const j = r();
        deg += j < 0.38 ? 1 : j < 0.72 ? -1 : j < 0.86 ? 2 : j < 0.94 ? -2 : (r() < 0.5 ? 4 : -3);
        deg = Math.max(n - 1, Math.min(2 * n + 3, deg));
        out.push({ deg, len: r() < 0.25 ? 3 : 1.5 });
      }
      return out;
    };
    const A = motif(n + 2), B = motif(n + 4);
    const A2 = A.map((x, i) => (i >= 24 && x ? { deg: x.deg + 2, len: x.len } : x));
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
    if (this.next < now - 0.5) this.next = now + 0.05;   // 탭이 쉬었다 돌아오면 밀린 박을 버린다
    while (this.next < now + 0.25) { this._play(this.step, this.next); this.step++; this.next += this.spb; }
  }

  _play(step, t) {
    const T = this.T, s16 = step % 16, bar = step >> 4, sec = bar % 16, ch = T.chords[bar % T.chords.length], n = T.scale.length, spb = this.spb;
    const on = (p) => p && p[s16] === "x";
    // 구성: 처음 2마디는 리듬+베이스로 달구고, 3마디부터 훅. 16마디째는 필인과 라이저로 다음 바퀴에 넘긴다
    const intro = bar < 2, last = sec === 15, fill = last && s16 >= 8;
    const samul = T.drum === "samul";

    if (s16 === 0 && (bar === 2 || (sec % 8 === 0 && bar > 2))) this._crash(t, sec === 0 ? 0.3 : 0.2);
    if (s16 === 0 && last) this._riser(t, spb * 16);
    if (on(T.kick) && !(fill && s16 >= 12)) {
      const main = s16 % 4 === 0;   // 정박 킥은 크게, 사이 킥은 조금 작게
      samul ? this._kick(t, 130, 42, 0.42, main ? 1.5 : 1.0) : this._kick(t, 170, 40, 0.4, main ? 1.6 : 1.05);
      this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(main ? 0.25 : 0.45, t); this.duck.gain.linearRampToValueAtTime(1, t + spb * 3);
    }
    if (on(T.snare) || (fill && (s16 % 2 === 0 || s16 >= 13))) this._snare(t, fill ? 0.2 + (s16 - 8) * 0.03 : 0.42, samul);
    if (on(T.hat)) this._noise(t, 0.16, 0.13, 7000, "highpass", 0.7);                                    // 오픈 햇(엇박)
    if (on(T.shak)) samul ? this._metal(t, 0.08) : this._noise(t, 0.028, s16 % 4 === 0 ? 0.06 : 0.04, 9000, "highpass", 0.7);
    if (on(T.bass)) this._bass(this.note(T, ch[0] + (s16 % 8 === 7 ? n : s16 === 10 ? 4 : 0), -2), t, spb * 1.5);
    if (on(T.stab) && !intro) this._stab(ch.map((d) => this.note(T, d, 0)), t, spb * 1.4);
    if (T.arp && bar >= 1) {
      const k = s16 % 8, pat = [0, 1, 2, 1, 0, 2, 1, 2][k];
      this._lead(T.arp, this.note(T, ch[pat % ch.length] + (k >= 4 ? n : 0), 1), t, spb * 1.1, 0.04);
    }
    if (!intro) {
      const nt = this.hook[step % this.hook.length];
      if (nt) this._lead(T.lead, this.note(T, nt.deg, 0), t, spb * nt.len, 0.16);
    }
  }

  _env(g, t, atk, dur, vol) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); }
  _tone(type, f, t, dur, vol, cut, atk = 0.004, send = 0, dest = this.duck, det = 0) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = det; lp.type = "lowpass"; lp.frequency.value = cut;
    this._env(g, t, atk, dur, vol);
    o.connect(lp); lp.connect(g); g.connect(dest);
    if (send) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(this.send); }
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  _noise(t, dur, vol, freq, type, q, f1 = 0) {
    const ctx = this.sound.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.sound.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, 0.002, dur, vol);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t, Math.random() * 0.5, dur + 0.05);
    return g;
  }

  // ── 타악 ──
  // 킥: 빠르게 떨어지는 몸통 + 길게 남는 서브 저음 + 어택 클릭. 살짝 찌그러뜨려 단단하게
  _kick(t, f0, f1, dur, vol) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain(), ws = ctx.createWaveShaper();
    ws.curve = this.kickCurve || (this.kickCurve = this._curve(3));
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1 * 1.25, t + 0.07); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.setValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(ws); ws.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
    this._tone("sine", f1 * 1.15, t, dur * 1.25, vol * 0.55, 200, 0.004, 0, this.bus);   // 서브
    this._noise(t, 0.018, vol * 0.3, 3200, "bandpass", 0.8);                              // 어택 클릭
  }
  _snare(t, vol, low) {
    this._noise(t, low ? 0.16 : 0.19, vol, low ? 1100 : 2400, "bandpass", low ? 2.5 : 0.7);
    this._noise(t, 0.09, vol * 0.5, 6500, "highpass", 0.7);
    this._tone("triangle", low ? 150 : 215, t, 0.1, vol * 0.5, 1800, 0.001, 0, this.bus).frequency.exponentialRampToValueAtTime(low ? 110 : 150, t + 0.09);
  }
  _metal(t, vol) { for (const f of [2150, 3290, 4870]) this._tone("square", f, t, 0.07, vol * 0.3, 9000, 0.001, 0, this.bus); }   // 꽹과리풍 쇳소리
  _crash(t, vol) { this._noise(t, 1.5, vol, 5500, "highpass", 0.5); this._noise(t, 0.6, vol * 0.6, 3000, "bandpass", 0.6); }
  _riser(t, dur) {
    const g = this._noise(t, dur, 0.001, 500, "bandpass", 2.2, 7000);
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + dur * 0.97); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }

  // ── 음정 악기 ──
  _bass(f, t, dur) {
    // 톱니 + 사각을 필터 엔벨로프로 벌렸다 닫고 찌그러뜨린다. 아래에 사인 서브
    const ctx = this.sound.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 5; lp.frequency.setValueAtTime(1700, t); lp.frequency.exponentialRampToValueAtTime(240, t + dur * 0.9);
    this._env(g, t, 0.003, dur, 0.5);
    for (const [type, det] of [["sawtooth", -7], ["square", 6]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    lp.connect(g); g.connect(this.bassDrive);
    this._tone("sine", f, t, dur * 1.1, 0.3, 300, 0.003);
  }
  _stab(freqs, t, dur) {
    for (const f of freqs) for (const d of [-9, 9]) this._tone("sawtooth", f, t, dur, 0.05, 2600, 0.003, 0.25, this.duck, d);
  }
  _lead(kind, f, t, dur, vol) {
    switch (kind) {
      case "super": for (const d of [-14, 0, 14]) this._tone("sawtooth", f, t, dur * 1.2, vol * 0.5, 3800, 0.004, d ? 0 : 0.6, this.duck, d); this._tone("square", f * 2, t, dur * 0.6, vol * 0.14, 5000); break;
      case "pluck": this._tone("sawtooth", f, t, Math.min(dur, 0.32), vol, 3200, 0.002, 0.45); break;
      case "ep": this._tone("triangle", f, t, dur * 1.3, vol * 1.4, 3200, 0.003, 0.4); this._tone("square", f * 2, t, 0.08, vol * 0.3, 4000); break;
      case "guitar": this._tone("sawtooth", f, t, dur * 1.3, vol * 0.9, 2400, 0.002, 0.4); this._tone("square", f, t, dur * 0.9, vol * 0.5, 1800, 0.002, 0, this.duck, 8); this._tone("sawtooth", f * 1.5, t, dur, vol * 0.3, 2000); break;
      case "marimba": this._tone("sine", f, t, 0.45, vol * 1.7, 4000, 0.002, 0.3); this._tone("triangle", f * 4, t, 0.06, vol * 0.6, 7000, 0.001); this._tone("sine", f * 2, t, 0.2, vol * 0.5, 5000); break;
      case "bell": this._tone("sine", f, t, 1.2, vol * 1.2, 7000, 0.002, 0.6); this._tone("sine", f * 2.76, t, 0.5, vol * 0.4, 9000, 0.001, 0.4); this._tone("triangle", f, t, 0.12, vol * 0.8, 5000, 0.001); break;
      case "gaya": {   // 가야금풍: 세게 뜯는 소리 + 농현
        const o = this._tone("triangle", f, t, dur * 1.8, vol * 1.6, 3200, 0.002, 0.4);
        o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
        for (let k = 1; k < 5; k++) o.frequency.setValueAtTime(f * (1 + (k % 2 ? 0.014 : -0.014)), t + 0.16 + k * 0.07);
        this._tone("sawtooth", f, t, 0.09, vol * 0.8, 4600, 0.001);
        break;
      }
    }
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
    if (kind === "waves") { layer("lowpass", 520, 0.5, 0.07, 0.11, 0.85, 260); layer("bandpass", 1900, 0.7, 0.02, 0.17, 0.9); }
    else if (kind === "wind") { layer("bandpass", 420, 1.1, 0.06, 0.07, 0.7, 180); layer("bandpass", 950, 2.2, 0.02, 0.13, 0.9, 300); }
    else if (kind === "drone") { layer("lowpass", 140, 0.8, 0.1, 0.05, 0.5, 40); }
  }
}
