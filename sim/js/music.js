// 배경 음악: 외부 파일 없이 WebAudio 로 맵 테마별 곡을 즉석에서 연주한다
// 기본은 118 BPM 안팎의 브라스 펑크(정박 킥·슬랩 베이스·클라비/EP 엇박·관악 섹션 스탭과 리프). 힙합 틀(808·트랩 햇)도 남겨 둔다
// 둘 다 밝은 장조·믹솔리디안 계열. 맵마다 리드 악기(브라스·일렉 피아노·가야금·종·마림바)와 환경음만 바꿔 테마를 입힌다
// 대화 장면은 따로 "분위기 곡"(MOODS)을 쓴다: 느린 패드·아르페지오·베이스 위주로 노드를 적게 쓰고, 바꿀 때 몇 초에 걸쳐 교차한다
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
  // 제국 맵들: 수도와 같은 어두운 프리지안 힙합 틀을 조금씩 달리
  vault: { style: "hiphop", bpm: 92, root: 43, scale: [0, 1, 3, 5, 7, 8, 10], chords: [I, I, [1, 3, 5], bVII], lead: "bell", brass: true, keys: "ep", amb: "drone" },
  outpost: { style: "funk", bpm: 112, root: 48, scale: [0, 1, 3, 5, 7, 8, 10], chords: [I, bVII, I, [1, 3, 5]], lead: "guitar", brass: true, keys: "clav", amb: "wind" },
  foundry: { style: "hiphop", bpm: 100, root: 46, scale: [0, 1, 3, 5, 7, 8, 10], chords: [I, [1, 3, 5], bVII, I], lead: "brass", brass: true, keys: "clav", amb: "wind" },
  spaceport: { style: "funk", bpm: 120, root: 50, scale: DOR, chords: [I7, bVII, IV7, bVII], lead: "brass", brass: true, keys: "ep", amb: "waves" },
  // 어미별의 다른 지역
  aildune: { style: "funk", bpm: 108, root: 50, scale: DOR, chords: [I7, bVII, I7, IV7], lead: "bell", brass: false, keys: "ep", amb: "wind" },
  ailsea: { style: "funk", bpm: 104, root: 55, scale: DOR, chords: [I7, IV7, I7, bVII], lead: "marimba", brass: false, keys: "ep", amb: "waves" },
  ailwood: { style: "funk", bpm: 110, root: 53, scale: DOR, chords: [IV7, I7, bVII, I7], lead: "marimba", brass: false, keys: "clav", amb: "drone" },
  ailsky: { style: "hiphop", bpm: 98, root: 47, scale: DOR, chords: [I7, bVII, IV7, bVII], lead: "bell", brass: true, keys: "ep", amb: "wind" },
  snow: { style: "funk", bpm: 120, root: 58, scale: MAJ, chords: [I, vi, IV, V], lead: "bell", brass: true, keys: "ep", amb: "wind" },
  island: { style: "funk", bpm: 116, root: 53, scale: MAJ, chords: [I, IV, V, IV], lead: "marimba", brass: true, keys: "clav", amb: "waves" },
  moon: { style: "funk", bpm: 114, root: 50, scale: DOR, chords: [I7, IV7, I7, bVII], lead: "ep", brass: true, keys: "ep", amb: "drone" },
  orbit: { style: "funk", bpm: 120, root: 49, scale: DOR, chords: [I7, bVII, IV7, I7], lead: "brass", brass: true, keys: "ep", amb: "drone" },
  // 기계제국 수도: 묵직한 힙합 틀, 프리지안(반음 내린 2도)으로 어둡게. 관악 스탭과 낮은 기계 웅웅거림
  empire: { style: "hiphop", bpm: 96, root: 45, scale: [0, 1, 3, 5, 7, 8, 10], chords: [I, [1, 3, 5], I, bVII], lead: "brass", brass: true, keys: "ep", amb: "drone" },
  airbase: { style: "funk", bpm: 122, root: 52, scale: MAJ, chords: [I, V, vi, IV], lead: "brass", brass: true, keys: "clav", amb: "wind" },
  // 설원 통신기지: 느리고 차가운 힙합 틀, 에올리안 단조에 종소리 리프와 바람 소리
  frost: { style: "hiphop", bpm: 92, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], chords: [I, bVII, [5, 7, 9], bVII], lead: "bell", brass: true, keys: "ep", amb: "wind" },
  ail: { style: "funk", bpm: 112, root: 52, scale: DOR, chords: [I7, IV7, bVII, IV7], lead: "bell", brass: true, keys: "ep", amb: "drone" },
};

// ── 대화 분위기 곡 ──
const AEOL = [0, 2, 3, 5, 7, 8, 10], PHR = [0, 1, 3, 5, 7, 8, 10], PHRD = [0, 1, 4, 5, 7, 8, 10], LYD = [0, 2, 4, 6, 7, 9, 11];
const i_ = [0, 2, 4], VI = [5, 7, 9], III = [2, 4, 6], VII = [6, 8, 10], bII = [1, 3, 5], I9 = [0, 2, 4, 8], IVM7 = [3, 5, 7, 9], vi7 = [5, 7, 9, 11];
// bars: 화음 하나의 길이(마디) · pad: 패드 음색 · arp: 아르페지오(16칸, 숫자 = 화음 음 순서, +숫자 = 한 옥타브 위, rand = 드문드문) · inst: 아르페지오 악기
// bass: 베이스 패턴과 음색 · perc: 타악 패턴 · lead: 선율 악기와 밀도 · build: 이 마디부터 타악·선율이 들어온다 · fb: 지연 되먹임
const MOODS = {
  calm: { bpm: 76, root: 53, scale: MAJ, chords: [IVM7, I9, vi7, V], bars: 2, pad: "warm", padVol: 0.09,
    arp: "0...1...2...+0...", inst: "ep", arpVol: 0.13, bass: "x.......x.......", bassKind: "sine", lead: "ep", leadP: 0.22, build: 4, fb: 0.3 },
  daily: { bpm: 98, root: 55, scale: MAJ, chords: [IV7, I, ii, V], bars: 1, pad: "soft", padVol: 0.05,
    arp: "0.1.2.1.+0.2.1.2.", inst: "marimba", arpVol: 0.11, bass: "x..x..x.x.......", bassKind: "round",
    perc: { kick: "x.......x.......", rim: "....x.......x...", hat: "..x...x...x...x." }, lead: "marimba", leadP: 0.3, build: 2, fb: 0.18 },
  tense: { bpm: 104, root: 50, scale: PHR, chords: [i_, i_, bII, i_], bars: 2, pad: "dark", padVol: 0.07,
    arp: "", bass: "x.x.x.x.x.x.x.x.", bassKind: "pulse", perc: { kick: "x.....x.........", tick: "xxxxxxxxxxxxxxxx" }, lead: "bell", leadP: 0.08, build: 2, fb: 0.35 },
  sad: { bpm: 64, root: 57, scale: AEOL, chords: [i_, VI, III, VII], bars: 2, pad: "strings", padVol: 0.075,
    arp: "0...2...+0...2...", inst: "piano", arpVol: 0.12, bass: "x...............", bassKind: "sine", lead: "piano", leadP: 0.3, build: 2, fb: 0.32 },
  resolve: { bpm: 100, root: 50, scale: AEOL, chords: [i_, VI, III, VII], bars: 1, pad: "brass", padVol: 0.07,
    arp: "012+0012+0012+0012+0", inst: "pluck", arpVol: 0.07, bass: "x.x.x.x.x.x.x.x.", bassKind: "pulse",
    perc: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x." }, lead: "horn", leadP: 0.28, build: 4, fb: 0.25 },
  mystery: { bpm: 70, root: 52, scale: LYD, chords: [i_, bII, i_, VII], bars: 2, pad: "glass", padVol: 0.07,
    arp: "rand", inst: "bell", arpVol: 0.09, bass: "x...............", bassKind: "sine", lead: null, build: 2, fb: 0.45, amb: "drone" },
  eia: { bpm: 92, root: 49, scale: PHRD, chords: [i_, bII, i_, VII], bars: 1, pad: "metal", padVol: 0.05,
    arp: "0.0+0.0.1.0.0+0.2.", inst: "square", arpVol: 0.06, bass: "x.xx.x.xx.x.x.xx", bassKind: "pulse",
    perc: { kick: "x.....x...x.....", metal: "....x.......x...", tick: "x.x.x.x.x.x.x.x." }, lead: null, build: 2, fb: 0.3 },
  space: { bpm: 58, root: 50, scale: LYD, chords: [I9, bII, vi7, I9], bars: 4, pad: "air", padVol: 0.08,
    arp: "rand", inst: "bell", arpVol: 0.07, bass: "x...............", bassKind: "sub", lead: null, build: 1, fb: 0.5, amb: "drone" },
};
// 아르페지오 문자열을 16칸 배열로: 숫자 = 화음 음 순서, "+숫자" = 한 옥타브 위 (+ 는 칸을 차지하지 않는다)
for (const m of Object.values(MOODS)) {
  m.style = "mood";
  if (m.arp && m.arp !== "rand") { const cells = []; for (let i = 0; i < m.arp.length; i++) { const c = m.arp[i]; if (c === "+") { cells.push({ k: +m.arp[++i], up: 1 }); } else cells.push(c === "." ? null : { k: +c, up: 0 }); } m.arpCells = cells.slice(0, 16); }
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const LOOKAHEAD = 1.5;

// ElevenLabs 로 만든 테마 곡(sim/audio/bgm/*.mp3): 맵·모드·대화 분위기 → 곡. 파일이 없으면 지금처럼 합성 음악
const BGM = {
  menu: "menu", race: "race", boss: "boss",
  city: "city", airbase: "city", outpost: "city", arena: "race", stadium: "race",
  canyon: "canyon", island: "island", snow: "snow", frost: "snow", vault: "vault",
  empire: "empire", factory: "empire", foundry: "empire",
  moon: "space", orbit: "space", spaceport: "space",
  ail: "ail", aildune: "ail", ailsea: "ail", ailwood: "ail", ailsky: "ail",
  "m:calm": "vn_calm", "m:daily": "vn_calm", "m:tense": "vn_tense", "m:sad": "vn_sad", "m:resolve": "vn_resolve",
  "m:mystery": "vault", "m:eia": "empire", "m:space": "ail",
};   // 초: 미리 예약하는 길이

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.theme = null; this.want = "menu";
    this.step = 0; this.next = 0;
    this.amb = [];
    this.int = 0; this.iv = 0;   // 전투 긴장도: 목표값 · 부드럽게 따라가는 현재값 (0..1)
    // 음악 예약: 게임 프레임이 무거워 타이머가 늦게 와도 끊기지 않도록 약 1.5초 앞까지 미리 예약한다
    setInterval(() => this._tick(), 100);
  }

  setTheme(id) { this.want = THEMES[id] || BGM[id] ? id : "menu"; }
  // 보스전: 보스가 살아 있는 동안 보스 곡 (곡 파일이 있을 때만)
  setBoss(on) { this.boss = !!on; }
  // 전투 긴장도(0..1): 높아지면 추진 베이스·16분 하이햇·탐(0.25~), 두 배 킥·크래시·스네어 롤·상승음(0.6~)이 차례로 들어오고
  // 전체 음색 필터가 열린다. 오를 때는 1~2초, 가라앉을 때는 6초쯤 걸려 따라간다. 메뉴·대화 분위기 곡에서는 무시한다
  setIntensity(k) { this.int = k > 0 ? (k < 1 ? k : 1) : 0; }
  get intensity() { return this.iv; }
  // 대화 장면 분위기: null = 맵·메뉴 곡으로 복귀, "-" = 무음, 그 밖에는 MOODS 키
  setMood(k) { this.mood = k == null ? null : k === "-" || MOODS[k] ? k : null; }
  get moodPlaying() { return this.theme && this.theme.startsWith("m:") ? this.theme.slice(2) : null; }
  _target() { return this.mood == null ? this.want : this.mood === "-" ? "" : "m:" + this.mood; }
  setVolume() { if (this.out) this.out.gain.setTargetAtTime(settings.musicVolume * 0.66, this.sound.ctx.currentTime, 0.05); }

  _init() {
    const ctx = this.sound.ctx;
    this.out = ctx.createGain(); this.out.gain.value = settings.musicVolume * 0.66;   // 효과음 음량과 따로 (예전 master 0.6 배와 같은 크기)
    this.out.connect(this.sound.master);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18; this.comp.ratio.value = 3; this.comp.attack.value = 0.006; this.comp.release.value = 0.15;
    this.comp.connect(this.out);
    this.drive = ctx.createGain(); this.drive.gain.value = 0.4;
    const sat = ctx.createWaveShaper(); sat.curve = this._curve(1.4); this.drive.connect(sat);
    // 긴장도 음색 필터: 조용할 때 살짝 닫히고 격해질수록 열린다 (메뉴·대화 곡에서는 완전히 열린 상태)
    this.tone = ctx.createBiquadFilter(); this.tone.type = "lowpass"; this.tone.frequency.value = 20000; this.tone.Q.value = 0.4;
    sat.connect(this.tone); this.tone.connect(this.comp);
    this.bus = ctx.createGain(); this.bus.connect(this.drive);
    // 공간감: 짧은 슬랩백 지연(관악·건반에만 보낸다)
    this.delay = ctx.createDelay(1.5); this.fb = ctx.createGain(); this.fb.gain.value = 0.22;
    const dl = ctx.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 3200;
    this.send = ctx.createGain(); this.send.gain.value = 0.35;
    this.send.connect(this.delay); this.delay.connect(dl); dl.connect(this.fb); this.fb.connect(this.delay); dl.connect(this.comp);
  }
  _curve(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  _start(id) {
    const ctx = this.sound.ctx, mood = id.startsWith("m:"), T = (this.T = mood ? MOODS[id.slice(2)] : THEMES[id]), now = ctx.currentTime;
    // 분위기 곡이 끼면 천천히 교차한다 (나가는 곡 ~3초, 들어오는 곡 ~2초)
    const xf = mood || this._wasMood, outT = xf ? 0.9 : 0.3;
    this.theme = id; this._wasMood = mood; this.R = T.style === "funk" ? FUNK : HIPHOP;
    this._fadeOut(outT);
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.gain.setTargetAtTime(1, now + (xf ? 0.3 : 0.2), xf ? 0.7 : 0.4);
    this.bus.connect(this.drive);
    // 킥에 맞춰 살짝 눌리는 버스(과하지 않게)
    this.duck = ctx.createGain(); this.duck.connect(this.bus);
    // 긴장도 레이어 버스 (곡마다 새로 — 곡이 바뀌면 같이 사라진다)
    const [la, lb] = this._levels(mood ? 0 : this.iv);
    this.hypeA = ctx.createGain(); this.hypeA.gain.value = la; this.hypeA.connect(this.duck);
    this.hypeB = ctx.createGain(); this.hypeB.gain.value = lb; this.hypeB.connect(this.duck);
    this.bassDrive = ctx.createWaveShaper(); this.bassDrive.curve = this._curve(T.style === "hiphop" ? 2.2 : 3.5); this.bassDrive.connect(this.bus);
    this.spb = 60 / T.bpm / 4;
    this.delay.delayTime.setTargetAtTime(this.spb * (T.style === "funk" ? 1.5 : 3), now, 0.2);
    this.fb.gain.setTargetAtTime(T.fb ?? 0.22, now, 0.3);
    this.step = 0; this.next = now + 0.4;
    this.r = rng(id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    this.hook = mood ? this._melody(T) : this._compose(T);
    if (T.amb) this._ambience(T.amb);
  }
  // 지금 곡(버스·환경음)을 tc 시간상수로 줄이고, 다 줄면 떼어 낸다
  _fadeOut(tc) {
    const now = this.sound.ctx.currentTime;
    if (this.bus) { const old = this.bus; old.gain.cancelScheduledValues(now); old.gain.setValueAtTime(old.gain.value, now); old.gain.setTargetAtTime(0, now, tc); setTimeout(() => old.disconnect(), tc * 6000 + 300); }
    for (const a of this.amb) {
      const tt = Math.max(0.5, tc);
      a.g.gain.cancelScheduledValues(now); a.g.gain.setValueAtTime(a.g.gain.value, now); a.g.gain.setTargetAtTime(0, now, tt);
      setTimeout(() => { for (const n of [a.src, a.lfo]) try { n.stop(); } catch (_) { /* 이미 멈춤 */ } a.g.disconnect(); }, tt * 6000 + 300);
    }
    this.amb = [];
  }

  // 분위기 곡 선율: 4마디(64칸) 8분음 격자 위에 성기게. 음계 안에서 한두 칸씩 걷는다
  _melody(T) {
    const r = this.r, n = T.scale.length, out = new Array(64).fill(null);
    if (!T.lead) return out;
    let deg = n + 2;
    for (let s = 0; s < 64; s += 2) {
      const strong = s % 8 === 0, p = T.leadP * (strong ? 1.8 : s % 4 === 0 ? 1 : 0.45) * (s % 32 >= 28 ? 0.2 : 1);
      if (r() > p) continue;
      const j = r(); deg += j < 0.35 ? 1 : j < 0.7 ? -1 : j < 0.85 ? 2 : -2;
      deg = Math.max(n - 1, Math.min(2 * n + 1, deg));
      out[s] = { deg, len: strong ? 4 + Math.floor(r() * 4) : 2 + Math.floor(r() * 2) };
    }
    return out;
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
    const tgt = this._target();
    // 음량 0·음소거·"@bgm -" 이면 곡을 줄이고 아예 연주(노드 생성)를 멈춘다
    if (settings.musicVolume <= 0.01 || settings.mute || !tgt) { if (this.theme) { this._fadeOut(tgt ? 0.2 : 0.8); this.theme = null; } this._stopFile(tgt ? 0.2 : 0.8); return; }
    // 녹음 곡이 있으면 그것을 튼다 (보스가 있으면 보스 곡). 아직 불러오는 중이거나 없으면 합성 음악
    const ftgt = this.boss && !tgt.startsWith("m:") && tgt !== "menu" ? "boss" : tgt;
    const url = BGM[ftgt] ? `audio/bgm/${BGM[ftgt]}.mp3` : null, fb = url ? this._loadFile(url) : false;
    if (fb) { if (this.fileId !== ftgt) this._startFile(ftgt, fb, tgt); this._intensity(s.ctx.currentTime, tgt === "menu" || tgt.startsWith("m:")); return; }
    if (this.fileId) this._stopFile(0.8);
    if (tgt !== this.theme || this._fromFile) { this._fromFile = false; this._start(tgt); }
    const now = s.ctx.currentTime;
    this._intensity(now, tgt === "menu" || tgt.startsWith("m:"));
    if (this.next < now - 1.5) this.next = now + 0.05;          // 아주 오래 멈췄을 때(탭 숨김 등)만 건너뛴다
    else if (this.next < now) this.next = now + 0.02;            // 조금 늦었으면 박자를 잃지 않고 바로 이어서
    while (this.next < now + LOOKAHEAD) { this._play(this.step, this.next); this.step++; this.next += this.spb; }
  }

  // 곡 파일: undefined=아직, null=불러오는 중, false=없음, AudioBuffer=준비됨
  _loadFile(url) {
    const B = this.files || (this.files = {});
    if (B[url] === undefined) {
      B[url] = null;
      fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((ab) => this.sound.ctx.decodeAudioData(ab))
        .then((b) => { B[url] = b; }).catch(() => { B[url] = false; });
    }
    return B[url] || false;
  }
  _startFile(id, buf, tgt) {
    const ctx = this.sound.ctx, now = ctx.currentTime;
    if (this.theme) { this._fadeOut(0.6); this.theme = null; }   // 합성 음악은 줄여서 끈다
    this._stopFile(0.6);
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.9, now + 0.1, 0.5);
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.connect(g); g.connect(this.tone);   // 긴장도 음색 필터를 거친다
    src.start(now + 0.05);
    this.fileSrc = src; this.fileG = g; this.fileId = id; this._fromFile = true; this.theme = null;
    void tgt;
  }
  _stopFile(tc) {
    if (!this.fileSrc) return;
    const ctx = this.sound.ctx, now = ctx.currentTime, src = this.fileSrc, g = this.fileG;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.setTargetAtTime(0, now, tc);
    setTimeout(() => { try { src.stop(); } catch (_) { /* 이미 멈춤 */ } g.disconnect(); }, tc * 6000 + 300);
    this.fileSrc = null; this.fileG = null; this.fileId = null;
  }

  // 긴장도 → 레이어 음량 [A, B]
  _levels(k) { const ss = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); }; return [ss(0.2, 0.6, k), ss(0.55, 0.9, k)]; }
  // 100ms 마다: 현재 긴장도를 목표로 부드럽게 옮기고 레이어 음량·필터·드라이브에 반영
  _intensity(now, neutral) {
    const tgtK = neutral ? 0 : this.int, tc = tgtK > this.iv ? 1.2 : 6;
    this.iv += (tgtK - this.iv) * (1 - Math.exp(-0.1 / tc));
    if (Math.abs(this.iv - tgtK) < 0.002) this.iv = tgtK;
    const k = this.iv, [la, lb] = this._levels(k);
    if (this.hypeA) { this.hypeA.gain.setTargetAtTime(la, now, 0.25); this.hypeB.gain.setTargetAtTime(lb, now, 0.25); }
    this.tone.frequency.setTargetAtTime(neutral ? 20000 : 6500 * Math.pow(20000 / 6500, Math.min(1, k * 1.6)), now, 0.3);
    this.drive.gain.setTargetAtTime(0.4 + 0.12 * k, now, 0.3);
  }

  // 긴장도 레이어 연주 (맵 곡만). 음량이 거의 0 이면 노드를 만들지 않는다
  _hype(step, t, s16, bar, ch, funk) {
    if (bar < 2) return;
    const [la, lb] = this._levels(this.iv), spb = this.spb, A = this.hypeA, B = this.hypeB, T = this.T;
    if (la > 0.02) {
      if (s16 % 2 === 1) this._noise(t, 0.035, 0.11, 9500, "highpass", 0.8, 0, A);               // 16분 하이햇 채우기
      if (s16 % 2 === 0) this._tone("sawtooth", this.note(T, ch[0], -1), t, spb * 0.75, 0.05, 520 + 500 * la, 0.003, 0, A);   // 8분 추진 베이스
      if (s16 === 7 || s16 === 15) this._kick(t, 230, 120, 0.14, 0.16, A);                          // 탐
    }
    if (lb > 0.02) {
      if (s16 === 6 || s16 === 10 || (s16 === 14 && !funk)) this._kick(t, 140, 50, 0.18, 0.5, B);   // 두 배 킥
      if (s16 === 0 && bar % 4 === 0) this._noise(t, 1.1, 0.16, 6000, "highpass", 0.5, 0, B);       // 크래시
      if (bar % 4 === 3 && s16 === 0) this._noise(t, spb * 16, 0.07, 700, "bandpass", 1.3, 7000, B); // 4마디째 상승음
      if (bar % 4 === 3 && s16 >= 8) this._noise(t, 0.06, 0.06 + (s16 - 8) * 0.02, 1700, "bandpass", 1, 0, B);   // 스네어 롤
      if (s16 === 4 || s16 === 12) this._noise(t, 0.09, 0.12, 2200, "bandpass", 0.9, 0, B);         // 스네어 보강
    }
  }

  _play(step, t0) {
    if (this.T.style === "mood") return this._playMood(step, t0);
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
    this._hype(step, t, s16, bar, ch, funk);
  }

  // ── 분위기 곡 연주 ──
  _playMood(step, t) {
    const T = this.T, s16 = step % 16, bar = step >> 4, spb = this.spb, n = T.scale.length;
    const ch = T.chords[Math.floor(bar / T.bars) % T.chords.length], chordStart = bar % T.bars === 0 && s16 === 0;
    const full = bar >= T.build, P = T.perc, on = (p) => p && p[s16] === "x";
    // 패드: 화음이 바뀔 때마다 길게 누르고 다음 화음과 겹쳐 넘어간다
    if (chordStart) this._pad(T.pad, ch.map((d) => this.note(T, d, 0)), t, spb * 16 * T.bars, T.padVol);
    // 베이스 (8분 박동형은 둘째 마디부터)
    if (T.bass[s16] === "x" && (T.bassKind !== "pulse" || bar >= 1)) this._moodBass(T.bassKind, this.note(T, ch[0], -1), t, spb, T);
    // 아르페지오
    if (T.arp === "rand") {
      if (s16 % 2 === 0 && this.r() < 0.22) this._pluck(T.inst, this.note(T, ch[Math.floor(this.r() * ch.length)] + (this.r() < 0.5 ? n : 0), 1), t, spb * 6, T.arpVol);
    } else if (T.arpCells) {
      const c = T.arpCells[s16];
      if (c) this._pluck(T.inst, this.note(T, ch[c.k % ch.length] + (c.k >= ch.length ? n : 0), c.up), t, spb * 2.5, T.arpVol);
    }
    // 타악 (build 마디 이후)
    if (P && full) {
      if (on(P.kick)) this._kick(t, 120, 48, 0.28, 0.5);
      if (on(P.snare)) { this._noise(t, 0.18, 0.2, 1800, "bandpass", 0.9); this._tone("triangle", 180, t, 0.1, 0.12, 1400, 0.001, 0, this.bus); }
      if (on(P.rim)) this._tone("square", 1700, t, 0.025, 0.05, 3000, 0.001, 0, this.bus);
      if (on(P.hat)) this._noise(t, 0.05, 0.12, 8000, "highpass", 0.8);
      if (on(P.tick)) this._noise(t, 0.02, s16 % 4 === 0 ? 0.05 : 0.025, 9000, "highpass", 0.7);
      if (on(P.metal)) { this._noise(t, 0.22, 0.12, 3400, "bandpass", 9); this._tone("square", 1840, t, 0.05, 0.03, 4000, 0.001, 0.4, this.bus); }
      if (s16 === 0 && bar % 8 === 0 && P.snare) this._crash(t, 0.14);
    }
    // 선율
    if (full && T.lead) { const nt = this.hook[step % 64]; if (nt) this._pluck(T.lead, this.note(T, nt.deg, 1), t, spb * nt.len, 0.16); }
  }
  // 패드: 음마다 살짝 어긋난 오실레이터 2개 → 공용 필터 하나 → 느린 엔벨로프 (다음 화음과 겹쳐 사라진다)
  _pad(kind, freqs, t, dur, vol) {
    const ctx = this.sound.ctx, lp = ctx.createBiquadFilter(), g = ctx.createGain();
    const K = { warm: ["triangle", 1600, 1.2], soft: ["triangle", 1300, 0.5], dark: ["sawtooth", 520, 1.5], strings: ["sawtooth", 1500, 1.4],
      brass: ["sawtooth", 1900, 0.5], glass: ["sine", 3000, 1.6], metal: ["square", 800, 0.3], air: ["triangle", 1100, 2.5] }[kind] || ["triangle", 1400, 1];
    const [type, cut, atk] = K, rel = Math.min(2.5, dur * 0.35), end = t + dur + rel;
    lp.type = "lowpass"; lp.frequency.value = cut; lp.Q.value = kind === "dark" ? 4 : 0.6;
    if (kind === "dark" || kind === "air") { lp.frequency.setValueAtTime(cut * 0.6, t); lp.frequency.linearRampToValueAtTime(cut * 1.4, t + dur * 0.6); lp.frequency.linearRampToValueAtTime(cut * 0.8, end); }
    const v = vol / Math.sqrt(freqs.length);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + atk); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, end);
    for (const f of freqs) for (const d of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(end + 0.05);
    }
    if (kind === "glass" || kind === "air") { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freqs[0] * 2; o.connect(lp); o.start(t); o.stop(end + 0.05); }
    lp.connect(g); g.connect(this.bus);
    const sg = ctx.createGain(); sg.gain.value = kind === "air" || kind === "glass" ? 0.5 : 0.2; g.connect(sg); sg.connect(this.send);
  }
  _moodBass(kind, f, t, spb, T) {
    if (kind === "sine") this._tone("sine", f, t, spb * 14, 0.2, 400, 0.05, 0, this.bus);
    else if (kind === "sub") this._tone("sine", f / 2, t, spb * 30, 0.22, 300, 0.4, 0, this.bus);
    else if (kind === "round") { this._tone("sine", f, t, spb * 2.2, 0.2, 500, 0.004, 0, this.bus); this._tone("triangle", f * 2, t, spb * 0.8, 0.05, 900, 0.003, 0, this.bus); }
    else this._tone("sawtooth", f, t, spb * 0.85, T === MOODS.eia ? 0.11 : 0.09, T === MOODS.eia ? 700 : 420, 0.004, 0, this.bus);   // pulse: 8분 박동
  }
  _pluck(kind, f, t, dur, vol) {
    switch (kind) {
      case "piano": this._tone("sine", f, t, Math.max(dur, 1.6), vol * 1.2, 2400, 0.003, 0.3, this.bus); this._tone("triangle", f * 2, t, 0.5, vol * 0.35, 3200, 0.002, 0, this.bus); break;
      case "pluck": this._tone("sawtooth", f, t, 0.22, vol, 2200, 0.002, 0.3, this.bus); break;
      case "square": this._tone("square", f, t, 0.12, vol, 1800, 0.002, 0.35, this.bus); break;
      case "horn": this._tone("sawtooth", f, t, dur, vol * 0.6, 1500, 0.06, 0.3, this.bus, -6); this._tone("sawtooth", f, t, dur, vol * 0.5, 1500, 0.06, 0, this.bus, 6); break;
      default: this._lead(kind, f, t, dur, vol);   // ep · marimba · bell
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
  _noise(t, dur, vol, freq, type, q, f1 = 0, dest = this.bus) {
    const ctx = this.sound.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.sound.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, 0.002, dur, vol);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5, dur + 0.05);
    return g;
  }

  // ── 타악 ──
  _kick(t, f0, f1, dur, vol, dest = this.bus) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.setValueAtTime(vol * 0.9, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    this._noise(t, 0.012, vol * 0.25, 2800, "bandpass", 0.9, 0, dest);   // 비터 소리
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
      this.amb.push({ src, g, lfo });
    };
    if (kind === "waves") { layer("lowpass", 520, 0.5, 0.05, 0.11, 0.85, 260); layer("bandpass", 1900, 0.7, 0.015, 0.17, 0.9); }
    else if (kind === "wind") { layer("bandpass", 420, 1.1, 0.04, 0.07, 0.7, 180); layer("bandpass", 950, 2.2, 0.015, 0.13, 0.9, 300); }
    else if (kind === "drone") { layer("lowpass", 140, 0.8, 0.06, 0.05, 0.5, 40); }
  }
}
