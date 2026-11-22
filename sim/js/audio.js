// 사운드: 외부 파일 없이 WebAudio 로 합성 (모터음·바람 + 효과음, 좌우 패닝, 신호 잡음·먹먹함 레이어)
import { settings } from "./config.js";

// 같은 소리가 한꺼번에 몰리지 않도록 이름별 최소 간격(초)
const GAP = { click: 0.04, vtick: 0.05, vblip: 0.06, chover: 0.045, hover: 0.04, elaser: 0.03, laser: 0.04, hit: 0.03, hitc: 0.035, explode: 0.04, zip: 0.07, scrape: 0.09, shield: 0.05, hurt: 0.05, whoosh: 0.12, lockbeep: 0.03 };
const MAX_VOICES = 44;   // 동시에 울리는 소리 상한 (넘으면 작은 소리부터 생략)
// 대사 음량을 따르는 소리 (대화 넘김·화자 바뀜). 나머지는 효과음 음량
const VOICE = new Set(["vtick", "vblip", "vblipr", "vblipm"]);
// 컨텍스트가 막 깨어나는 중에도 울려야 하는 메뉴 소리
const UI_NOW = new Set(["click", "confirm", "back"]);

// ElevenLabs 로 만든 녹음 효과음 (sim/audio/sfx/*.mp3). 없으면 합성음
const SAMPLE_NAMES = ["laser", "missile", "explode", "bigkill", "hurt", "shieldup", "pickup", "boost", "whoosh", "lock", "warn", "click", "beep", "emp", "gate"];
const SAMPLE_VOL = { laser: 0.45, click: 0.6, beep: 0.7, hurt: 0.85, explode: 0.9, bigkill: 1, warn: 0.6, lock: 0.6 };

export class Sound {
  constructor() {
    this.ctx = null;
    this.ok = false;
    this.ends = new Float32Array(64);   // 최근 소리들의 종료 예정 시각(동시 발음 수 계산용)
    this.ei = 0;
    this.last = {};          // 이름별 마지막 재생 시각
    this.onPlay = null;      // (name, vol, pan) → 화면 효과 관리자가 사건을 유추
    this._sp = { vol: 0, pan: 0, cut: 20000, d: 0, behind: 0 };   // spatial() 결과 (재사용)
    this._fb = { seen: new WeakSet(), ends: [-1, -1, -1], last: -1, lx: 0, ly: 0, lz: 0, vx: 0, vy: 0, vz: 0, lt: -1 };   // 스쳐 지나감 상태
    this._hb = { k: 0, next: 0, seen: 0, alarm: 0 };   // 빈사 심장 박동
    const unlock = () => this._init();
    addEventListener("pointerdown", unlock, { once: false });
    addEventListener("keydown", unlock, { once: false });
    // 탭이 가려지면 오디오 처리 자체를 멈춰 배터리·CPU 를 아낀다
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      try { document.hidden ? this.ctx.suspend() : this.ctx.resume(); } catch (_) { /* 무시 */ }
    });
  }

  _init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = (this.ctx = new AC());
      // 출력 경로: 효과음·모터 → bus → 먹먹함 필터 → 컴프레서 → sfx(효과음 음량) → master(음소거)
      //          대사 소리 → voice(대사 음량) → master,  음악 → (music.js) → master
      this.master = ctx.createGain();
      this.master.gain.value = settings.mute ? 0 : 1;
      this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = settings.volume; this.sfx.connect(this.master);
      this.voice = ctx.createGain(); this.voice.gain.value = settings.voiceVolume ?? 0.7; this.voice.connect(this.master);
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.knee.value = 18; this.comp.ratio.value = 5;
      this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
      this.comp.connect(this.sfx);
      this.muffle = ctx.createBiquadFilter(); this.muffle.type = "lowpass"; this.muffle.frequency.value = 20000; this.muffle.Q.value = 0.3;
      this.muffle.connect(this.comp);
      this.bus = ctx.createGain();
      this.bus.connect(this.muffle);
      // 노이즈 버퍼
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // 모터: 프로펠러 4개의 날개 통과음(배음이 있는 파형, 서로 조금씩 어긋난 음높이) + 프롭 바람 소리
      this.mGain = ctx.createGain(); this.mGain.gain.value = 0;
      this.mFilter = ctx.createBiquadFilter(); this.mFilter.type = "lowpass"; this.mFilter.frequency.value = 1500; this.mFilter.Q.value = 0.4;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 110;
      const H = [0, 1, 0.5, 0.42, 0.2, 0.22, 0.1, 0.1, 0.05, 0.05, 0.03], re = new Float32Array(H.length), im = new Float32Array(H);
      const wave = ctx.createPeriodicWave(re, im);
      this.DET = [1, 1.017, 0.985, 1.031];
      this.osc = this.DET.map((d, i) => {
        const o = ctx.createOscillator(); o.setPeriodicWave(wave); o.frequency.value = 120 * d;
        // 모터마다 회전수가 미세하게 흔들린다
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.6 + i * 0.47; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.detune); lfo.start();
        const g = ctx.createGain(); g.gain.value = 0.25;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        o.connect(g);
        if (pan) { pan.pan.value = [-0.5, 0.5, -0.25, 0.25][i]; g.connect(pan); pan.connect(hp); } else g.connect(hp);
        o.start();
        return o;
      });
      hp.connect(this.mFilter); this.mFilter.connect(this.mGain); this.mGain.connect(this.bus);
      this.pSrc = ctx.createBufferSource(); this.pSrc.buffer = this.noiseBuf; this.pSrc.loop = true;
      this.pFilter = ctx.createBiquadFilter(); this.pFilter.type = "bandpass"; this.pFilter.frequency.value = 900; this.pFilter.Q.value = 0.9;
      this.pGain = ctx.createGain(); this.pGain.gain.value = 0;
      this.pSrc.connect(this.pFilter); this.pFilter.connect(this.pGain); this.pGain.connect(this.bus); this.pSrc.start();
      this.mf = 120;
      this.wind = ctx.createBufferSource(); this.wind.buffer = this.noiseBuf; this.wind.loop = true;
      this.wFilter = ctx.createBiquadFilter(); this.wFilter.type = "bandpass"; this.wFilter.frequency.value = 500; this.wFilter.Q.value = 0.6;
      this.wGain = ctx.createGain(); this.wGain.gain.value = 0;
      this.wind.connect(this.wFilter); this.wFilter.connect(this.wGain); this.wGain.connect(this.bus);
      this.wind.start();
      // 영상 신호 잡음(추락·EMP): 고역 노이즈 루프. 먹먹함 필터를 거치지 않는다
      this.sSrc = ctx.createBufferSource(); this.sSrc.buffer = this.noiseBuf; this.sSrc.loop = true; this.sSrc.playbackRate.value = 1.7;
      this.sFilter = ctx.createBiquadFilter(); this.sFilter.type = "highpass"; this.sFilter.frequency.value = 2600;
      this.sGain = ctx.createGain(); this.sGain.gain.value = 0;
      this.sSrc.connect(this.sFilter); this.sFilter.connect(this.sGain); this.sGain.connect(this.comp);
      this.sSrc.start();
      this._mOn = true; this._motorIdle(true);   // 비행 전에는 지속음 경로를 떼어 둔다
      if (ctx.state === "suspended") ctx.resume();
      this.ok = true;
      this.loadSamples();   // 녹음 효과음(있으면)
    } catch (_) { this.ok = false; }
  }

  setVolume(v) { if (this.sfx) this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); }
  // 설정의 효과음·대사 음량과 음소거를 반영
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfx.gain.setTargetAtTime(settings.volume, t, 0.03);
    this.voice.gain.setTargetAtTime(settings.voiceVolume ?? 0.7, t, 0.03);
    this.master.gain.setTargetAtTime(settings.mute ? 0 : 1, t, 0.03);
  }

  // 모터·바람·신호 잡음 루프는 비행하지 않을 때 출력에서 떼어 낸다 (떼어진 노드는 렌더링되지 않아 CPU 를 쓰지 않는다)
  _motorIdle(idle) {
    clearTimeout(this._mT);
    if (!idle) {
      if (this._mOn) return;
      this._mOn = true;
      this.mGain.connect(this.bus); this.pGain.connect(this.bus); this.wGain.connect(this.bus); this.sGain.connect(this.comp);
      return;
    }
    if (!this._mOn) return;
    this._mT = setTimeout(() => {   // 소리가 다 줄어든 뒤 떼어 낸다
      if (!this._mOn) return;
      this._mOn = false;
      for (const g of [this.mGain, this.pGain, this.wGain, this.sGain]) try { g.disconnect(); } catch (_) { /* 이미 떨어짐 */ }
    }, 600);
  }

  // 매 프레임: 추력(0..1)과 속도(m/s)로 모터음·바람 갱신. on=false 면 지속음을 모두 끈다
  motor(thrust, speed, on = true) {
    if (!this.ok) return;
    if (on) this._motorIdle(false); else this._motorIdle(true);
    const t = this.ctx.currentTime;
    // 날개 통과 주파수: 공회전 ~125Hz → 전개 ~520Hz. 올릴 때는 빠르게, 내릴 때는 조금 느리게 따라간다
    const f = 125 + Math.pow(Math.max(0, thrust), 0.75) * 395, tc = f > this.mf ? 0.035 : 0.09;
    this.mf = f;
    this.osc.forEach((o, i) => o.frequency.setTargetAtTime(f * this.DET[i], t, tc));
    this.mFilter.frequency.setTargetAtTime(900 + thrust * 3800, t, 0.06);
    this.mGain.gain.setTargetAtTime(on ? 0.05 + thrust * 0.1 : 0, t, 0.05);
    this.pFilter.frequency.setTargetAtTime(700 + thrust * 2600, t, 0.08);
    this.pGain.gain.setTargetAtTime(on ? 0.012 + thrust * thrust * 0.09 : 0, t, 0.06);
    // 바람: 속도가 붙을수록 커지고 높아진다 (고속에서 확실히 들리게 제곱 항 추가)
    const sp = Math.min(speed, 60);
    this.wFilter.frequency.setTargetAtTime(280 + sp * 26, t, 0.1);
    this.wGain.gain.setTargetAtTime(on ? Math.min(0.3, sp * 0.004 + sp * sp * 0.00009) : 0, t, 0.1);
    if (!on) this.layers(0, 0);
  }

  // 화면 효과와 맞물리는 지속 레이어: 신호 잡음 세기(0..1), 먹먹함(0..1 — 격추·EMP·빈사 상태)
  layers(staticLevel, muffle) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.sGain.gain.setTargetAtTime(Math.min(0.16, staticLevel * 0.16), t, 0.04);
    this.muffle.frequency.setTargetAtTime(20000 * Math.pow(0.03, Math.min(1, Math.max(0, muffle))), t, 0.08);
  }

  // 효과음 한 번(play 한 번)이 쓰는 출력: 패닝·뒤쪽 먹먹함 노드를 소리 하나당 한 벌만 만들어 모든 부분음이 같이 쓴다
  _dest() { return this._out || this._route || this.bus; }
  _chain(base, pan, cut) {
    let out = base;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan < -1 ? -1 : pan > 1 ? 1 : pan;
      p.connect(out); out = p;
    }
    if (cut && cut < 18000) {
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cut; f.Q.value = 0.5;
      f.connect(out); out = f;
    }
    return out;
  }

  _voice(end) { this.ends[this.ei] = end; this.ei = (this.ei + 1) & 63; }
  // 지금 울리고 있는 소리 수
  get voices() { const now = this.ctx ? this.ctx.currentTime : 0; let n = 0; for (let i = 0; i < 64; i++) if (this.ends[i] > now) n++; return n; }

  _tone(type, f0, f1, dur, vol, delay = 0, pan = 0, atk = 0.003) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(atk, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._dest());
    this._voice(t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // ft: lowpass | highpass | bandpass
  _noise(dur, vol, f0, f1, delay = 0, pan = 0, ft = "lowpass", q = 0.7, atk = 0.003) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = ft; f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(40, f0), t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(atk, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this._dest());
    this._voice(t + dur);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  // 녹음 효과음 불러오기 (없는 파일은 조용히 건너뛰고 합성음을 계속 쓴다)
  loadSamples(names = SAMPLE_NAMES, base = "audio/sfx/") {
    if (!this.ok || this._samplesLoading) return;
    this._samplesLoading = true;
    this.samples = this.samples || {};
    for (const n of names) {
      fetch(base + n + ".mp3").then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((ab) => this.ctx.decodeAudioData(ab)).then((b) => { this.samples[n] = b; }).catch(() => { /* 파일 없음: 합성음 사용 */ });
    }
  }
  // 대사 녹음 재생 (무전 등). 대사 음량을 따른다. 반환: 재생했으면 true
  playVoiceClip(url, vol = 1) {
    if (!this.ok || settings.mute || (settings.voiceVolume ?? 0.7) <= 0.01 || !url) return false;
    const go = (b) => { try { const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = b; g.gain.value = vol; src.connect(g); g.connect(this.voice); src.start(); this._clipSrc = src; } catch (_) { /* 재생 실패 무시 */ } };
    this._clips = this._clips || {};
    const c = this._clips[url];
    if (c && c !== "loading" && c !== "fail") { go(c); return true; }
    if (!c) { this._clips[url] = "loading"; fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((ab) => this.ctx.decodeAudioData(ab)).then((b) => { this._clips[url] = b; go(b); }).catch(() => { this._clips[url] = "fail"; }); }
    return c !== "fail";
  }

  // 게임 코드가 부르는 효과음. vol: 거리 감쇠 등 상대 음량(0..1), pan: -1(왼쪽)..1(오른쪽), pitch: 음높이 배율
  play(name, vol = 1, pan = 0, pitch = 1) {
    if (this.onPlay) this.onPlay(name, vol, pan);
    this._synth(name, vol, pan, pitch);
  }

  // 화면 효과 관리자(feel.js)가 덧붙이는 효과음 — onPlay 를 다시 부르지 않는다
  cue(name, vol = 1, pan = 0, pitch = 1) { this._synth(name, vol, pan, pitch); }

  _synth(name, vol, pan, p, cut = 0) {
    // 컨텍스트가 멈춰 있는 동안 쌓인 소리가 한꺼번에 터지지 않게 건너뛴다 (메뉴 클릭음만 예외)
    if (!this.ok || vol <= 0.02 || settings.mute || (this.ctx.state !== "running" && !UI_NOW.has(name))) return;
    const voice = VOICE.has(name);
    if ((voice ? settings.voiceVolume ?? 0.7 : settings.volume) <= 0.01) return;   // 들리지 않을 소리는 만들지 않는다
    const now = this.ctx.currentTime, gap = GAP[name];
    if (gap) { if (now - (this.last[name] || -1) < gap) return; this.last[name] = now; }
    if (this.voices > MAX_VOICES && vol < 0.8) return;
    const T = (type, f0, f1, dur, v, delay, atk) => this._tone(type, f0 * p, f1 * p, dur, v * vol, delay, pan, atk);
    const N = (dur, v, f0, f1, delay, ft, q, atk) => this._noise(dur, v * vol, f0, f1, delay, pan, ft, q, atk);
    this._route = voice ? this.voice : null;
    this._out = this._chain(this._route || this.bus, pan, cut);
    // 녹음된 효과음(audio/sfx/이름.mp3)이 있으면 그것을, 없으면 합성음을 쓴다
    const sb = this.samples && this.samples[name];
    if (sb) {
      try {
        const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
        src.buffer = sb; src.playbackRate.value = p;
        g.gain.value = vol * (SAMPLE_VOL[name] ?? 0.8);
        src.connect(g); g.connect(this._out); src.start(now);
        this._voice(now + sb.duration / p);
      } finally { this._route = null; this._out = null; }
      return;
    }
    try { this._cases(name, T, N); } finally { this._route = null; this._out = null; }
  }

  // ── 공간 소리 ──
  // 월드 위치 → 카메라 기준 {vol(거리 감쇠 0..1), pan(-1..1), cut(뒤쪽 먹먹함 저역통과 Hz), d(거리), behind(0..1)}
  // range: 이 거리(m)쯤에서 거의 안 들린다. 0 이면 거리 감쇠 없이 방향만 (내 기체가 맞은 소리 등). out 객체는 재사용된다
  spatial(pos, camera, range = 140, out = this._sp) {
    const c = camera.position, q = camera.quaternion;
    const dx = pos.x - c.x, dy = pos.y - c.y, dz = pos.z - c.z, d = Math.hypot(dx, dy, dz);
    out.d = d;
    out.vol = range > 0 ? Math.min(1, Math.max(0, 1.15 - d / range)) : 1;
    if (d < 0.5) { out.pan = 0; out.cut = 20000; out.behind = 0; return out; }
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    // 카메라 오른쪽(+x)·앞쪽(-z) 단위벡터
    const rx = 1 - 2 * (qy * qy + qz * qz), ry = 2 * (qx * qy + qw * qz), rz = 2 * (qx * qz - qw * qy);
    const fx = -2 * (qx * qz + qw * qy), fy = -2 * (qy * qz - qw * qx), fz = -(1 - 2 * (qx * qx + qy * qy));
    const side = (dx * rx + dy * ry + dz * rz) / d, front = (dx * fx + dy * fy + dz * fz) / d;
    out.pan = Math.max(-1, Math.min(1, side)) * 0.85;
    out.behind = front < 0 ? -front : 0;
    out.cut = 20000 * Math.pow(0.16, out.behind);   // 정면 20k → 바로 뒤 ~3.2kHz
    if (range > 0) out.vol *= 1 - out.behind * 0.2;   // 뒤쪽은 조금 작게
    return out;
  }

  // 월드 위치에서 나는 효과음: 왼쪽에서 맞으면 왼쪽에서, 뒤에서 나면 살짝 먹먹하게 들린다
  playAt(name, pos, camera, vol = 1, pitch = 1, range = 140) {
    if (!pos || !camera) return this.play(name, vol, 0, pitch);
    const sp = this.spatial(pos, camera, range), v = vol * sp.vol;
    if (this.onPlay) this.onPlay(name, v, sp.pan);
    this._synth(name, v, sp.pan, pitch, sp.cut);
  }

  // 귀(카메라) 속도: 프레임마다 위치 차분으로 추정한다
  _ear(camera) {
    const F = this._fb, c = camera.position, t = performance.now() / 1000, dt = t - F.lt;
    if (F.lt < 0 || dt > 0.3) { F.vx = F.vy = F.vz = 0; }
    else if (dt > 0.004) { const k = Math.min(1, dt * 8); F.vx += ((c.x - F.lx) / dt - F.vx) * k; F.vy += ((c.y - F.ly) / dt - F.vy) * k; F.vz += ((c.z - F.lz) / dt - F.vz) * k; }
    else return;
    F.lx = c.x; F.ly = c.y; F.lz = c.z; F.lt = t;
  }

  // 탄·미사일 한 발이 곧 귀 옆을 스쳐 갈지 보고, 그렇다면 도플러가 걸린 휙 소리를 미리 예약한다
  // pos: 월드 위치, vel: 속도(m/s) 벡터, kind: "laser" | "missile", key: 같은 물체를 두 번 울리지 않게 하는 객체(선택)
  // 반환: 소리를 냈으면 true
  flyby(pos, vel, camera, kind = "laser", key = null, vol = 1) {
    if (!this.ok || settings.mute || settings.volume <= 0.01 || this.ctx.state !== "running") return false;
    if (key && this._fb.seen.has(key)) return false;
    this._ear(camera);
    const F = this._fb, c = camera.position, missile = kind === "missile";
    const px = pos.x - c.x, py = pos.y - c.y, pz = pos.z - c.z;
    const ux = vel.x - F.vx, uy = vel.y - F.vy, uz = vel.z - F.vz, uu = ux * ux + uy * uy + uz * uz;
    if (uu < 100) return false;   // 상대 속도 10m/s 미만은 "스침"이 아니다
    const tca = -(px * ux + py * uy + pz * uz) / uu;               // 가장 가까워지는 시각
    const LEAD = missile ? 0.5 : 0.3, R = missile ? 14 : 7;
    if (tca <= 0.02 || tca > LEAD) return false;
    const mx = px + ux * tca, my = py + uy * tca, mz = pz + uz * tca, miss = Math.hypot(mx, my, mz);
    if (miss > R || Math.hypot(px, py, pz) < 2.5) return false;
    // 동시 3음 + 최소 간격
    const now = this.ctx.currentTime;
    if (now - F.last < (missile ? 0.12 : 0.06)) return false;
    let slot = -1; for (let i = 0; i < F.ends.length; i++) if (F.ends[i] < now) { slot = i; break; }
    if (slot < 0) return false;
    if (key) F.seen.add(key);
    F.last = now;
    const tail = missile ? 0.55 : 0.3, dur = tca + tail;
    F.ends[slot] = now + dur + 0.05;
    this._voice(now + dur);
    this._flybyVoice(px, py, pz, ux, uy, uz, Math.sqrt(uu), tca, dur, miss / R, camera, missile, vol);
    return true;
  }

  // 프레임마다 탄 목록을 훑어 스쳐 가는 것에 소리를 붙인다. list 항목: {pos, vel} 또는 {pos, dir, speed}. skip(o) 가 true 면 건너뛴다
  updateFlybys(list, camera, kind = "laser", skip = null) {
    if (!this.ok || !list || !camera) return;
    this._ear(camera);
    if (!list.length) return;
    const v = this._fbV || (this._fbV = { x: 0, y: 0, z: 0 });
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!o || !o.pos || (skip && skip(o)) || this._fb.seen.has(o)) continue;
      if (o.vel) { v.x = o.vel.x; v.y = o.vel.y; v.z = o.vel.z; }
      else if (o.dir) { const sp = o.speed || 0; v.x = o.dir.x * sp; v.y = o.dir.y * sp; v.z = o.dir.z * sp; }
      else continue;
      this.flyby(o.pos, v, camera, kind, o);
    }
  }

  _flybyVoice(px, py, pz, ux, uy, uz, speed, tca, dur, near, camera, missile, vol) {
    const ctx = this.ctx, t0 = ctx.currentTime + 0.005, q = camera.quaternion;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const rx = 1 - 2 * (qy * qy + qz * qz), ry = 2 * (qx * qy + qw * qz), rz = 2 * (qx * qz - qw * qy);
    const fx = -2 * (qx * qz + qw * qy), fy = -2 * (qy * qz - qw * qx), fz = -(1 - 2 * (qx * qx + qy * qy));
    const C = 343, base = missile ? 620 : 1500, tone0 = missile ? 150 : 900;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = missile ? 1.1 : 2.2;
    const o = ctx.createOscillator(); o.type = missile ? "sawtooth" : "triangle";
    const og = ctx.createGain(); og.gain.value = missile ? 0.35 : 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.5;
    const g = ctx.createGain();
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(bp); o.connect(og); og.connect(bp); bp.connect(lp); lp.connect(g);
    if (pn) { g.connect(pn); pn.connect(this.bus); } else g.connect(this.bus);
    const peak = (missile ? 0.34 : 0.26) * vol * (1.25 - near * 0.5), N = 9;
    g.gain.setValueAtTime(0.0001, t0);
    for (let k = 0; k <= N; k++) {
      const tt = (dur * k) / N, x = px + ux * tt, y = py + uy * tt, z = pz + uz * tt, d = Math.max(1, Math.hypot(x, y, z));
      const vr = (x * ux + y * uy + z * uz) / d;                     // + 멀어짐, - 다가옴
      const dop = Math.min(2.2, Math.max(0.45, C / (C + vr)));
      const side = (x * rx + y * ry + z * rz) / d, front = (x * fx + y * fy + z * fz) / d;
      const at = t0 + tt;
      // 음량: 가까울수록 크게(거리 제곱 반비례 비슷하게), 끝은 0으로
      const env = k === N ? 0.0001 : Math.max(0.0001, peak * Math.min(1, 9 / (d * d * 0.35 + 9)) * (k === 0 ? 0.25 : 1));
      const fq = Math.min(12000, base * dop), ft = Math.min(8000, tone0 * dop), cut = 20000 * Math.pow(0.18, front < 0 ? -front : 0);
      if (k === 0) { bp.frequency.setValueAtTime(fq, at); o.frequency.setValueAtTime(ft, at); lp.frequency.setValueAtTime(cut, at); if (pn) pn.pan.setValueAtTime(side * 0.9, at); }
      else {
        bp.frequency.linearRampToValueAtTime(fq, at); o.frequency.linearRampToValueAtTime(ft, at); lp.frequency.linearRampToValueAtTime(cut, at);
        g.gain.linearRampToValueAtTime(env, at);
        if (pn) pn.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, side * 0.9)), at);
      }
    }
    src.start(t0, Math.random() * 0.4, dur + 0.05); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  // ── 빈사 상태 ──
  // k: 0(정상)..1(빈사). 프레임마다 부른다 — 부르지 않으면 박동이 저절로 멈춘다. 심장 박동은 k 에 따라 빨라지고 커지며,
  // k > 0.6 이면 조용한 경보음이 섞인다. 먹먹함 필터를 거치지 않고 귀 바로 앞에서 들린다
  lowHp(k) {
    const H = this._hb;
    H.k = k > 0 ? Math.min(1, k) : 0;
    if (!this.ok || H.k < 0.02 || settings.mute || settings.volume <= 0.01 || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    if (H.next < now - 0.5) H.next = now + 0.05;
    if (H.next > now + 0.15) return;
    const t = Math.max(H.next, now + 0.01), k2 = H.k, v = 0.1 + 0.22 * k2;
    this._thump(t, 66, 42, 0.13, v); this._thump(t + 0.19 - k2 * 0.04, 58, 38, 0.15, v * 0.7);
    H.next = t + 60 / (58 + 62 * k2);
    if (k2 > 0.6 && t >= H.alarm) {   // 2음 경보: 아주 작게, 박동 2~3번에 한 번
      const av = 0.018 + (k2 - 0.6) * 0.06;
      this._beep(t + 0.32, 1240, 0.09, av); this._beep(t + 0.44, 930, 0.11, av);
      H.alarm = t + 1.8 - k2 * 0.5;
    }
  }
  _thump(t, f0, f1, dur, vol) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.comp); this._voice(t + dur); o.start(t); o.stop(t + dur + 0.02);
  }
  _beep(t, f, dur, vol) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.comp); o.start(t); o.stop(t + dur + 0.02);
  }

  _cases(name, T, N) {
    switch (name) {
      // ── 무기 ──
      // 플레이어 레이저: 날카로운 방전 → 빠르게 떨어지는 "퓨" + 낮은 반동 + 공기를 가르는 꼬리
      case "laser": {
        const r = 0.94 + Math.random() * 0.12;
        N(0.012, 0.16, 9000, 5000, 0, "highpass");                       // 방전 클릭
        T("sawtooth", 3100 * r, 240, 0.17, 0.085);                        // 주 발사음
        T("square", 1550 * r, 120, 0.2, 0.05, 0.004);                     // 한 옥타브 아래 몸통
        T("sine", 190, 55, 0.11, 0.16);                                   // 반동
        N(0.16, 0.07, 5200, 700, 0.01, "bandpass", 4.5);                  // 휘익 하는 꼬리
        T("sine", 5200 * r, 1900, 0.06, 0.025, 0.002);                    // 고음 반짝임
        break;
      }
      // 적 레이저: 더 낮고 둔탁하게, 살짝 길게
      case "elaser": { const r = 0.92 + Math.random() * 0.16; N(0.01, 0.08, 6000, 3000, 0, "highpass"); T("sawtooth", 1500 * r, 150, 0.2, 0.06); T("square", 760 * r, 90, 0.22, 0.035); N(0.14, 0.045, 2800, 500, 0.01, "bandpass", 3.5); break; }
      case "missile": N(0.6, 0.24, 500, 3400, 0, "bandpass", 1.1, 0.05); T("sine", 190, 48, 0.14, 0.26); T("sawtooth", 150, 62, 0.4, 0.085); break;
      case "dry": T("square", 240, 170, 0.04, 0.06); N(0.025, 0.05, 3200, 1400); break;
      case "overheat": N(0.55, 0.15, 7500, 1600, 0, "highpass", 0.7, 0.02); T("sawtooth", 520, 110, 0.32, 0.075); break;
      case "cool": T("sine", 880, 1320, 0.08, 0.06); break;
      case "zip": T("sawtooth", 2500, 650, 0.09, 0.05); N(0.06, 0.08, 6500, 2200, 0, "bandpass", 3); break;
      // ── 명중·격파 ──
      case "hitc": T("triangle", 1150, 1440, 0.05, 0.15); T("sine", 2300, 2760, 0.03, 0.06); N(0.02, 0.06, 8500, 4500, 0, "highpass"); break;
      case "killc": T("triangle", 880, 880, 0.07, 0.15); T("triangle", 1320, 1320, 0.1, 0.15, 0.06); T("sine", 1760, 2100, 0.16, 0.1, 0.12); T("sine", 150, 48, 0.2, 0.22); break;
      case "bigkill": [523, 784, 1047, 1568].forEach((f, i) => T("triangle", f, f, 0.2, 0.13, i * 0.07)); T("sine", 95, 30, 0.85, 0.34); N(0.5, 0.14, 3000, 300, 0.02); break;
      case "explode": N(1.0, 0.5, 2300, 50); T("sine", 115, 28, 0.7, 0.38); N(0.25, 0.22, 5200, 800, 0.03, "bandpass", 0.8); break;
      // ── 피해 ──
      case "hit": N(0.07, 0.2, 3600, 900); T("triangle", 220, 90, 0.07, 0.11); break;
      case "hurt": N(0.17, 0.3, 1900, 170); T("square", 190, 70, 0.16, 0.095); T("sawtooth", 96, 44, 0.2, 0.11); break;
      case "shield": T("sine", 1900, 1380, 0.13, 0.12); T("sine", 2850, 2050, 0.09, 0.055); N(0.05, 0.05, 9000, 5000, 0, "highpass"); break;
      case "shieldbreak": N(0.38, 0.2, 9500, 1500, 0, "highpass"); T("sine", 2400, 600, 0.3, 0.1); T("sine", 1800, 420, 0.34, 0.08, 0.03); T("sine", 3100, 900, 0.22, 0.06, 0.05); break;
      case "shieldup": T("sine", 500, 1500, 0.3, 0.1, 0, 0.03); T("sine", 750, 2250, 0.3, 0.05, 0.04, 0.03); break;
      case "shielddown": T("sine", 1400, 500, 0.25, 0.07); break;
      case "heart": T("sine", 72, 44, 0.12, 0.34); T("sine", 62, 40, 0.14, 0.24, 0.17); break;
      case "stun": T("sawtooth", 2400, 50, 0.7, 0.14); T("square", 61, 58, 0.5, 0.09); N(0.6, 0.2, 7000, 400); break;
      case "death": T("sawtooth", 420, 40, 0.9, 0.15); N(0.8, 0.2, 5000, 100); break;
      case "respawn": T("sine", 300, 1200, 0.36, 0.1, 0, 0.04); T("triangle", 600, 2400, 0.3, 0.045, 0.05, 0.04); N(0.3, 0.05, 2000, 9000, 0, "bandpass", 1, 0.05); break;
      // ── 충돌·비행 ──
      case "crash": N(0.4, 0.48, 3000, 100); T("triangle", 170, 40, 0.35, 0.21); T("square", 743, 520, 0.18, 0.045, 0.02); T("square", 1187, 900, 0.12, 0.03, 0.03); N(0.5, 0.1, 9000, 5000, 0.05, "highpass"); break;
      case "scrape": N(0.13, 0.13, 2700, 1300, 0, "bandpass", 2.5); T("sawtooth", 130, 96, 0.1, 0.035); break;
      case "whoosh": N(0.3, 0.3, 2400, 480, 0, "bandpass", 1.4, 0.07); break;
      case "static": N(0.45, 0.16, 8000, 6000, 0, "highpass", 0.7, 0.01); break;
      case "boost": N(0.55, 0.2, 400, 4200, 0, "bandpass", 1.5, 0.06); T("sawtooth", 120, 480, 0.45, 0.09, 0, 0.05); break;
      // ── 조준 ──
      case "aim": T("sine", 1400, 1750, 0.035, 0.05); break;
      case "lockbeep": T("square", 1100, 1100, 0.035, 0.045); break;
      case "lock": T("square", 1500, 1500, 0.06, 0.07); T("square", 2000, 2000, 0.13, 0.07, 0.07); break;
      case "locktone": T("sine", 2000, 2000, 0.04, 0.03); break;
      case "warn": T("square", 980, 980, 0.085, 0.085); T("square", 740, 740, 0.085, 0.085, 0.1); break;
      // ── 진행·보상 ──
      case "gate": T("sine", 880, 1320, 0.12, 0.16); T("sine", 1320, 1760, 0.14, 0.12, 0.07); N(0.12, 0.05, 1200, 5000, 0, "bandpass", 1.2, 0.03); break;
      case "lap": [660, 880, 1100, 1320].forEach((f, i) => T("triangle", f, f, 0.14, 0.14, i * 0.08)); break;
      case "beep": T("square", 660, 660, 0.12, 0.1); break;
      case "go": T("square", 1320, 1320, 0.45, 0.12); T("sine", 660, 660, 0.45, 0.08); break;
      case "pickup": [520, 780, 1040].forEach((f, i) => T("sine", f, f * 1.02, 0.1, 0.14, i * 0.06)); break;
      case "item": T("sawtooth", 300, 1200, 0.3, 0.1); break;
      case "trick": T("triangle", 700, 1400, 0.16, 0.12); break;
      case "combo": [784, 988, 1175, 1568].forEach((f, i) => T("triangle", f, f, 0.12, 0.12, i * 0.05)); break;
      case "fail": T("sawtooth", 300, 80, 0.5, 0.14); break;
      case "win": [523, 659, 784, 1047, 1319].forEach((f, i) => T("triangle", f, f, 0.22, 0.14, i * 0.11)); break;
      case "emp": T("sawtooth", 2000, 60, 0.6, 0.16); N(0.5, 0.2, 6000, 300); break;
      case "skill": N(0.5, 0.22, 300, 6000, 0, "bandpass", 1.4, 0.25); T("sawtooth", 110, 440, 0.5, 0.1, 0, 0.3); [523, 659, 784, 1047].forEach((f, i) => T("triangle", f, f * 1.01, 0.35, 0.09, 0.28 + i * 0.05)); T("sine", 60, 40, 0.6, 0.3, 0.28); break;
      case "skillready": [880, 1175, 1568].forEach((f, i) => T("sine", f, f, 0.16, 0.09, i * 0.06)); T("triangle", 2349, 2349, 0.25, 0.04, 0.18); break;
      case "orbital": T("sawtooth", 1800, 90, 1.2, 0.14); N(1.4, 0.45, 4000, 60, 0.02); T("sine", 55, 28, 1.4, 0.4, 0.02); N(0.6, 0.2, 9000, 2500, 0, "highpass", 0.8); break;
      // ── 메뉴 ──
      case "click": T("sine", 900, 700, 0.04, 0.08); break;
      case "hover": T("sine", 1500, 1500, 0.022, 0.022); break;
      case "confirm": T("sine", 660, 660, 0.06, 0.08); T("sine", 990, 990, 0.1, 0.08, 0.05); T("triangle", 1980, 1980, 0.06, 0.02, 0.05); break;
      case "back": T("sine", 760, 440, 0.08, 0.08); T("triangle", 380, 300, 0.06, 0.03, 0.01); break;
      // ── 대화 ──
      case "vtick": T("sine", 1750, 1450, 0.022, 0.03); N(0.012, 0.018, 7000, 5000, 0, "highpass"); break;   // 대사 넘김
      case "vblip": T("triangle", 520, 560, 0.055, 0.07); T("sine", 1040, 1100, 0.035, 0.025, 0.012); break;   // 화자 바뀜 (pitch 로 인물마다 다르게)
      case "vblipr": N(0.05, 0.05, 2600, 2000, 0, "bandpass", 3); T("square", 880, 880, 0.035, 0.025, 0.035); break;   // 무전 화자
      case "vblipm": T("square", 440, 440, 0.04, 0.035); T("square", 660, 660, 0.04, 0.028, 0.045); break;   // 기계 화자
      case "chopen": T("triangle", 784, 784, 0.12, 0.05); T("triangle", 1175, 1175, 0.16, 0.045, 0.07); break;   // 선택지 등장
      case "chover": T("triangle", 1250, 1250, 0.03, 0.035); break;
      case "chpick": T("sine", 880, 1320, 0.09, 0.09); T("triangle", 1760, 1760, 0.14, 0.05, 0.06); N(0.08, 0.025, 2000, 6000, 0, "bandpass", 1.5); break;
      case "bond": [1047, 1319, 1568].forEach((f, i) => T("sine", f, f, 0.22, 0.05, 0.1 + i * 0.07)); break;   // 관계 상승 반짝임
      // ── 대본 장면 효과 ──
      case "door": N(0.42, 0.1, 1800, 500, 0, "bandpass", 1.2, 0.08); T("sine", 120, 60, 0.18, 0.22, 0.4); N(0.07, 0.12, 1400, 300, 0.4); break;   // 자동문 슉 → 쿵
      case "alarm": for (let i = 0; i < 3; i++) { T("triangle", 560, 900, 0.36, 0.09, i * 0.46, 0.03); T("square", 560, 900, 0.36, 0.025, i * 0.46, 0.03); } break;
      case "radio": N(0.012, 0.12, 4200, 4200, 0, "highpass"); N(0.32, 0.06, 2400, 1700, 0.012, "bandpass", 2.5, 0.01); T("square", 1250, 1250, 0.04, 0.03, 0.34); break;
      case "farboom": N(1.6, 0.3, 650, 40, 0, "lowpass", 0.7, 0.05); T("sine", 72, 30, 1.2, 0.28, 0.02, 0.03); N(1.3, 0.06, 300, 80, 0.3, "lowpass", 0.7, 0.2); break;   // 먼 폭발
      case "steps": for (let i = 0; i < 4; i++) { const d = i * 0.31 + (i % 2) * 0.02; N(0.06, 0.16, 900, 260, d); T("sine", 130, 70, 0.05, 0.1, d); } break;
      case "heartbeat": for (let i = 0; i < 3; i++) { T("sine", 64, 40, 0.14, 0.36, i * 0.82); T("sine", 56, 38, 0.16, 0.26, i * 0.82 + 0.21); } break;
      case "notify": T("sine", 1320, 1320, 0.09, 0.09); T("sine", 1760, 1760, 0.18, 0.08, 0.09); T("triangle", 2640, 2640, 0.12, 0.025, 0.09); break;
      case "rumble": N(1.8, 0.28, 220, 60, 0, "lowpass", 0.8, 0.35); T("sine", 46, 38, 1.6, 0.22, 0, 0.35); break;   // 땅울림
      case "keys": for (let i = 0; i < 7; i++) N(0.018, 0.07, 5000, 2500, i * 0.085 + ((i * 37) % 5) * 0.012, "bandpass", 2); break;   // 자판 두드림
    }
  }
}
