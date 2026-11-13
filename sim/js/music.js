// 배경 음악: 외부 파일 없이 WebAudio 로 맵 테마별 곡을 즉석에서 연주한다
// 기본은 118 BPM 안팎의 브라스 펑크(정박 킥·슬랩 베이스·클라비/EP 엇박·관악 섹션 스탭과 리프). 힙합 틀(808·트랩 햇)도 남겨 둔다
// 둘 다 밝은 장조·믹솔리디안 계열. 맵마다 리드 악기(브라스·일렉 피아노·가야금·종·마림바)와 환경음만 바꿔 테마를 입힌다
import { settings } from "./config.js";

const MAJ = [0, 2, 4, 5, 7, 9, 11], MIX = [0, 2, 4, 5, 7, 9, 10], DOR = [0, 2, 3, 5, 7, 9, 10], PENT = [0, 2, 4, 7, 9];
const I = [0, 2, 4], ii = [1, 3, 5], iii = [2, 4, 6], IV = [3, 5, 7], V = [4, 6, 8], vi = [5, 7, 9], bVII = [6, 8, 10], I7 = [0, 2, 4, 6], IV7 = [3, 5, 7, 9];

// 리듬 틀(16칸). 힙합은 스윙, 펑크는 곧게
const HIPHOP = { swing: 0.18, kick: "x......x..x.....", kick2: "x.....x...x..x..", clap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", sub: "x......x..x....." };
const FUNK = { swing: 0.04, kick: "x...x...x...x...", kick2: "x...x..xx...x.x.", clap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", open: "..x...x...x...x.", slap: "x..x..x.x.xx.x.x" };

// style, bpm, root(MIDI), scale, chords, lead(리프 악기), brass(관악 스탭 유무), keys(코드 반주), amb(환경음)
const THEMES = {
  menu: { style: "funk", bpm: 118, root: 53, scale: MIX, chords: [I7, IV7, I7, bVII], lead: "brass", brass: true, keys: "ep" },
  city: { style: "funk", bpm: 118, root: 53, scale: MAJ, chords: [IV7, iii, ii, V], lead: "ep", brass: true, keys: "ep" },
  arena: { style: "funk", bpm: 122, root: 55, scale: MIX, chords: [I7, I7, IV7, bVII], lead: "brass", brass: true, keys: "clav" },
  factory: { style: "funk", bpm: 114, root: 51, scale: MAJ, chords: [IV7, iii, vi, V], lead: "brass", brass: true, keys: "ep", amb: "waves" },
  canyon: { style: "funk", bpm: 116, root: 50, scale: DOR, chords: [I, IV7, I, bVII], lead: "guitar", brass: true, keys: "clav", amb: "wind" },
  palace: { style: "funk", bpm: 118, root: 55, scale: PENT, chords: [[0, 2, 4], [0, 2, 4], [3, 5, 7], [1, 3, 5]], lead: "gaya", brass: true, keys: "clav", amb: "wind" },
  snow: { style: "funk", bpm: 120, root: 58, scale: MAJ, chords: [I, vi, IV, V], lead: "bell", brass: true, keys: "ep", amb: "wind" },
  island: { style: "funk", bpm: 116, root: 53, scale: MAJ, chords: [I, IV, V, IV], lead: "marimba", brass: true, keys: "clav", amb: "waves" },
  moon: { style: "funk", bpm: 114, root: 50, scale: DOR, chords: [I7, IV7, I7, bVII], lead: "ep", brass: true, keys: "ep", amb: "drone" },
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
    this.comp.threshold.value = -18; this.comp.ratio.value = 3; this.comp.attack.value = 0.006; this.comp.release.value = 0.15;
    this.comp.connect(this.out);
    this.drive = ctx.createGain(); this.drive.gain.value = 0.4;
    const sat = ctx.createWaveShaper(); sat.curve = this._curve(1.4); this.drive.connect(sat); sat.connect(this.comp);
    this.bus = ctx.createGain(); this.bus.connect(this.drive);
    // 공간감: 짧은 슬랩백 지연(관악·건반에만 보낸다)
    this.delay = ctx.createDelay(1.5); this.fb = ctx.createGain(); this.fb.gain.value = 0.22;
    const dl = ctx.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 3200;
    this.send = ctx.createGain(); this.send.gain.value = 0.35;
    this.send.connect(this.delay); this.delay.connect(dl); dl.connect(this.fb); this.fb.connect(this.delay); dl.connect(this.comp);
  }
  _curve(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  _start(id) {
    const ctx = this.sound.ctx, T = (this.T = THEMES[id]), now = ctx.currentTime;
    this.theme = id; this.R = T.style === "funk" ? FUNK : HIPHOP;
    const old = this.bus; old.gain.setTargetAtTime(0, now, 0.3); setTimeout(() => old.disconnect(), 2500);
    for (const a of this.amb) { a.g.gain.setTargetAtTime(0, now, 0.5); const n = a; setTimeout(() => { try { n.src.stop(); } catch (_) {} n.g.disconnect(); }, 3000); }
    this.amb = [];
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.gain.setTargetAtTime(1, now + 0.2, 0.4);
    this.bus.connect(this.drive);
    // 킥에 맞춰 살짝 눌리는 버스(과하지 않게)
    this.duck = ctx.createGain(); this.duck.connect(this.bus);
    this.bassDrive = ctx.createWaveShaper(); this.bassDrive.curve = this._curve(T.style === "hiphop" ? 2.2 : 3.5); this.bassDrive.connect(this.bus);
    this.spb = 60 / T.bpm / 4;
    this.delay.delayTime.value = this.spb * (T.style === "funk" ? 1.5 : 3);
    this.step = 0; this.next = now + 0.4;
    this.r = rng(id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    this.hook = this._compose(T);
    if (T.amb) this._ambience(T.amb);
  }

  // 리프: 2마디 동기를 A A' A B 로. 펑크는 짧게 끊는 당김음, 힙합은 여유 있게 긴 음
  _compose(T) {
    const r = this.r, n = T.scale.length, funk = T.style === "funk";
    const motif = (start) => {
      const out = []; let deg = start;
      for (let s = 0; s < 32; s++) {
        const w = funk ? [0.9, 0.2, 0.55, 0.7, 0.35, 0.2, 0.75, 0.3][s % 8] : [0.85, 0.1, 0.3, 0.45, 0.2, 0.1, 0.5, 0.15][s % 8];
        if (r() > w * (s >= 28 ? 0.4 : 1)) { out.push(null); continue; }
        const j = r();
        deg += j < 0.35 ? 1 : j < 0.7 ? -1 : j < 0.85 ? 2 : j < 0.93 ? -2 : (r() < 0.5 ? 4 : -4);
        deg = Math.max(n, Math.min(2 * n + 2, deg));
        out.push({ deg, len: funk ? (r() < 0.3 ? 2 : 0.8) : (r() < 0.4 ? 3 : 1.5) });
      }
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

  _play(step, t0) {
    const T = this.T, R = this.R, s16 = step % 16, bar = step >> 4, sec = bar % 16, ch = T.chords[bar % T.chords.length], n = T.scale.length, spb = this.spb;
    const funk = T.style === "funk", on = (p) => p && p[s16] === "x";
    const t = t0 + (s16 % 2 ? spb * R.swing : 0);            // 스윙: 엇박 16분을 늦춘다
    const intro = bar < 2, last = sec === 15, fill = last && s16 >= 12, alt = bar % 4 === 3;

    if (s16 === 0 && (bar === 2 || (sec % 8 === 0 && bar > 2))) this._crash(t, 0.3);
    // 킥
    if (on(alt ? R.kick2 : R.kick) && !fill) {
      funk ? this._kick(t, 150, 55, 0.22, 0.75) : this._kick(t, 130, 45, 0.32, 1.25);
      this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(0.6, t); this.duck.gain.linearRampToValueAtTime(1, t + spb * 2.2);
    }
    // 클랩·스네어 (필인: 마지막 마디 끝 연타)
    if (on(R.clap) || (fill && s16 % 1 === 0 && s16 >= 12)) this._clap(t, fill ? 0.18 + (s16 - 12) * 0.05 : 0.38, !funk);
    // 하이햇: 힙합은 마디 끝에 트랩 롤(32분·셋잇단)
    if (on(R.hat)) {
      const roll = !funk && (s16 === 14 || (s16 === 6 && bar % 2)) && !intro;
      if (roll) for (let k = 0; k < (s16 === 14 ? 4 : 3); k++) this._hat(t + k * spb / (s16 === 14 ? 2 : 1.5), 0.05 + k * 0.01);
      else this._hat(t, s16 % 4 === 0 ? 0.5 : 0.36);
    }
    if (funk && on(R.open)) this._noise(t, 0.24, 0.4, 6000, "highpass", 0.7);
    if (funk && s16 % 2 === 1 && !intro) this._noise(t, 0.03, 0.12, 8000, "highpass", 0.7);   // 셰이커 고스트

    // 베이스: 힙합 = 808 서브(킥에 붙고, 가끔 미끄러진다) / 펑크 = 슬랩 베이스 옥타브 패턴
    if (funk) {
      if (on(R.slap)) { const oct = s16 % 4 === 3 || s16 === 10; this._slap(this.note(T, ch[0] + (oct ? n : 0), -2), t, spb * (oct ? 0.9 : 1.6)); }
    } else if (on(alt ? R.kick2 : R.sub)) {
      const glide = s16 === 10 && bar % 2 ? this.note(T, ch[0] + 4, -2) : 0;
      this._808(this.note(T, ch[0], -2), t, spb * (s16 === 0 ? 6 : 3.5), glide);
    }

    // 코드 반주: 펑크 = 엇박 클라비·EP 스탭, 힙합 = 길게 누르는 EP
    if (!intro) {
      if (funk && (s16 === 3 || s16 === 6 || s16 === 11 || s16 === 14)) this._keys(T.keys, ch.map((d) => this.note(T, d, 1)), t, spb * 0.9, 0.12);
      if (!funk && s16 === 0) this._keys("ep", ch.map((d) => this.note(T, d, 0)), t, spb * 14, 0.045);
      if (!funk && s16 === 10 && bar % 2) this._keys("ep", ch.map((d) => this.note(T, d, 0)), t, spb * 5, 0.03);
    }
    // 관악 섹션 스탭: 마디 끝 당김음 히트 + 4마디마다 크게
    if (T.brass && !intro) {
      const hit = funk ? (s16 === 14 || s16 === 3 && bar % 2 === 1 || (alt && s16 === 6) || (bar % 2 === 0 && s16 === 0)) : (s16 === 0 && bar % 2 === 0) || (alt && s16 === 14);
      if (hit) this._brass(ch.map((d) => this.note(T, d, 1)).concat([this.note(T, ch[0], 2)]), t, spb * (s16 === 0 ? 3 : 1.4), s16 === 0 ? 0.26 : 0.22, alt && s16 === 14);
    }
    // 리프
    if (bar >= 4 || (bar >= 2 && funk)) {
      const nt = this.hook[step % this.hook.length];
      if (nt) this._lead(T.lead, this.note(T, nt.deg, 1), t, spb * nt.len, 0.3);
    }
  }

  _env(g, t, atk, dur, vol) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); }
  _tone(type, f, t, dur, vol, cut, atk = 0.004, send = 0, dest = this.duck, det = 0) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = det; lp.type = "lowpass"; lp.frequency.value = cut;
    this._env(g, t, atk, dur, vol);
    o.connect(lp); lp.connect(g); g.connect(dest);
    if (send) { const sg = this.sound.ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(this.send); }
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
  _kick(t, f0, f1, dur, vol) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.setValueAtTime(vol * 0.9, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
    this._noise(t, 0.012, vol * 0.25, 2800, "bandpass", 0.9);   // 비터 소리
  }
  // 클랩: 짧은 잡음 세 번 + 꼬리. 힙합은 스네어 몸통을 더한다
  _clap(t, vol, body) {
    for (let k = 0; k < 3; k++) this._noise(t + k * 0.011, 0.02, vol * 0.7, 1300, "bandpass", 1.6);
    this._noise(t + 0.03, 0.16, vol, 1500, "bandpass", 1.1);
    if (body) this._tone("triangle", 190, t, 0.09, vol * 0.45, 1600, 0.001, 0, this.bus);
  }
  _hat(t, vol) { this._noise(t, 0.075, vol, 7000, "highpass", 0.8); this._noise(t, 0.03, vol * 0.5, 10500, "bandpass", 1.5); }
  _crash(t, vol) { this._noise(t, 1.4, vol, 5500, "highpass", 0.5); }

  // ── 베이스 ──
  // 808: 사인 + 약한 왜곡, 첫 순간 피치가 떨어지며 들어오고 길게 남는다. glide 가 있으면 끝에서 미끄러진다
  _808(f, t, dur, glide = 0) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.9, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    if (glide) { o.frequency.setValueAtTime(f, t + dur * 0.55); o.frequency.exponentialRampToValueAtTime(glide, t + dur * 0.8); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.75, t + 0.004); g.gain.setTargetAtTime(0.0001, t + dur * 0.55, dur * 0.25);
    o.connect(g); g.connect(this.bassDrive); o.start(t); o.stop(t + dur * 1.4 + 0.1);
  }
  // 슬랩 베이스: 밝게 튕기는 어택 → 빠르게 닫히는 필터
  _slap(f, t, dur) {
    const ctx = this.sound.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 3; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.11);
    this._env(g, t, 0.002, dur, 0.17);
    for (const [type, det] of [["sawtooth", -5], ["square", 5]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    lp.connect(g); g.connect(this.bassDrive);
    this._tone("sine", f, t, dur, 0.12, 250, 0.003, 0, this.bus);
  }

  // ── 화음·선율 ──
  // 관악 섹션: 톱니 여러 겹을 필터 엔벨로프로 "빠밤" 열었다 닫고, 시작 음을 살짝 아래에서 밀어 올린다. fall=true 면 끝을 떨어뜨린다
  _brass(freqs, t, dur, vol, fall = false) {
    const ctx = this.sound.ctx;
    for (const f of freqs) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.Q.value = 1.2; lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(3400, t + 0.045); lp.frequency.exponentialRampToValueAtTime(1500, t + 0.16);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol / Math.sqrt(freqs.length), t + 0.025); g.gain.setValueAtTime(vol / Math.sqrt(freqs.length) * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.08);
      for (const d of [-8, 7]) {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.detune.value = d;
        o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
        if (fall) { o.frequency.setValueAtTime(f, t + dur * 0.5); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + dur + 0.08); }
        o.connect(lp); o.start(t); o.stop(t + dur + 0.12);
      }
      lp.connect(g); g.connect(this.duck);
      const sg = ctx.createGain(); sg.gain.value = 0.3; g.connect(sg); sg.connect(this.send);
    }
  }
  _keys(kind, freqs, t, dur, vol) {
    for (const f of freqs) {
      if (kind === "clav") { this._tone("square", f, t, Math.min(dur, 0.18), vol * 0.8, 2600, 0.002); this._tone("sawtooth", f * 2, t, 0.06, vol * 0.3, 4000, 0.001); }
      else { this._tone("sine", f, t, dur, vol * 1.2, 2400, 0.008, 0.25); this._tone("triangle", f * 2, t, dur * 0.4, vol * 0.25, 3000, 0.004); }
    }
  }
  _lead(kind, f, t, dur, vol) {
    switch (kind) {
      case "brass": this._brass([f, f * 2], t, Math.max(dur, 0.12), vol * 0.9); break;
      case "ep": this._tone("sine", f * 2, t, dur * 2, vol * 1.3, 3000, 0.005, 0.4); this._tone("triangle", f * 4, t, dur * 0.6, vol * 0.3, 4000, 0.003); break;
      case "guitar": this._tone("sawtooth", f, t, dur * 1.4, vol * 0.8, 2200, 0.002, 0.35); this._tone("square", f, t, dur, vol * 0.4, 1600, 0.002, 0, this.duck, 8); break;
      case "marimba": this._tone("sine", f * 2, t, 0.4, vol * 1.6, 4000, 0.002, 0.3); this._tone("triangle", f * 8, t, 0.05, vol * 0.5, 7000, 0.001); break;
      case "bell": this._tone("sine", f * 2, t, 1.1, vol * 1.1, 7000, 0.002, 0.5); this._tone("sine", f * 5.52, t, 0.4, vol * 0.35, 9000, 0.001, 0.3); break;
      case "gaya": {   // 가야금풍: 세게 뜯는 소리 + 농현
        const o = this._tone("triangle", f * 2, t, dur * 1.8, vol * 1.5, 3200, 0.002, 0.4);
        o.frequency.setValueAtTime(f * 2.08, t); o.frequency.exponentialRampToValueAtTime(f * 2, t + 0.05);
        for (let k = 1; k < 5; k++) o.frequency.setValueAtTime(f * 2 * (1 + (k % 2 ? 0.014 : -0.014)), t + 0.16 + k * 0.07);
        this._tone("sawtooth", f * 2, t, 0.08, vol * 0.7, 4600, 0.001);
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
    if (kind === "waves") { layer("lowpass", 520, 0.5, 0.05, 0.11, 0.85, 260); layer("bandpass", 1900, 0.7, 0.015, 0.17, 0.9); }
    else if (kind === "wind") { layer("bandpass", 420, 1.1, 0.04, 0.07, 0.7, 180); layer("bandpass", 950, 2.2, 0.015, 0.13, 0.9, 300); }
    else if (kind === "drone") { layer("lowpass", 140, 0.8, 0.06, 0.05, 0.5, 40); }
  }
}
