// 부트스트랩: 렌더러·입력·사운드·UI 를 만들고 메뉴 ↔ 게임 상태를 관리
import "./rotate.js";
import "./nativepad.js";   // 안드로이드 앱: 앱이 넘겨주는 패드 입력을 Gamepad API 로
import * as THREE from "../vendor/three.module.min.js";
import { settings, save, QUALITY_NAMES } from "./config.js";
import { Input } from "./input.js";
import { Sound } from "./audio.js";
import { Music } from "./music.js";
import { Hud } from "./hud.js";
import { Session } from "./session.js";
import { MAPS } from "./maps/index.js";
import "./modes/aos.js";   // 기지전(AOS) 모드: 서바이벌 · 매우 큰 맵
import "./modes/strike.js";   // 서바이벌 · 돌파 작전 (맵마다 작전 1~5, 침투·교전·탈취·공성)
import "./modes/raid.js";   // 레이드 · 우주 전쟁 (1시간 공동 보스전, 참가·관전)
import { UI } from "./ui.js";
import { PadUI } from "./padui.js";
import { Perf } from "./perf.js";
import { PostFX } from "./post.js";
import { MenuScene, Thumbs } from "./menu3d.js";
import { complete as completeStage } from "./story.js";
import { completeBond } from "./bonds.js";
import * as GP from "./garage.js";
import { metrics, evaluate } from "./objectives.js";
import { complete as completeLesson } from "./training.js";

const TIERS = ["low", "med", "high"];
const MENU_BLOOM = { strength: 0.42, radius: 0.55, threshold: 0.92 };

// 기기 화면 갱신 제한(ms) 기억: 품질을 낮춰도 빨라지지 않던 속도
function qcapLoad() { try { const v = +localStorage.getItem("fpv.qcap2"); return v > 0 && v < 100 ? v : 0; } catch (_) { return 0; } }
function qcapSave(v) { try { localStorage.setItem("fpv.qcap2", String(Math.round(v * 10) / 10)); } catch (_) { /* 저장 불가 환경 */ } }

class Game {
  constructor() {
    const glc = document.getElementById("gl");
    // 안티에일리어싱은 후처리(FXAA)가 맡는다. 톤매핑은 toon.js 가 넣은 평면 색용 함수(낮음 품질의 직접 렌더링에도 적용)
    this.renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, powerPreference: "high-performance" });
    // 휴대폰에서 그래픽 메모리가 모자라 WebGL 이 끊기면 화면이 통째로 검게 된다 → 되살려 달라고 하고, 돌아오면 품질 설정을 다시 적용
    glc.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this._ctxLost = true; if (this.hud) this.hud.toast("그래픽 재시작 중…", "#ffb02e", 2.5, 20); });
    glc.addEventListener("webglcontextrestored", () => { this._ctxLost = false; if (this._autoTier === "high" || this._autoTier === "med") this._autoTier = "low"; try { this.applyQuality(); } catch (_) { /* 다음 프레임에 다시 */ } });
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.CustomToneMapping;
    this.composer = null;
    this.hud = new Hud(document.getElementById("hud"));
    this.input = new Input();
    this.sound = new Sound();
    this.music = new Music(this.sound);
    this.menu = new MenuScene();
    this.thumbs = new Thumbs();
    this.session = null;
    this.state = "menu";   // menu | play | pause | result
    this.dt = 0.016;
    this.last = performance.now();
    this.fps = 60;
    this.ui = new UI(this);
    this.padui = new PadUI(this);
    this.perf = new Perf(this);   // 성능 표시·측정 (F3)
    this._capAvg = qcapLoad();   // 지난번에 알아낸 이 기기의 화면 갱신 제한(ms)
    this.input.onPad = (kind, info, was) => { this.padui.onPad(kind, info, was); this._touchLayer(); };   // 연결·해제 때 화면 스틱 다시 판단
    this.applyQuality();
    addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => { if (document.hidden && this.state === "play") this.pause(); });
    this.resize();
    this.ui.show("title");
    requestAnimationFrame((t) => this.frame(t));
  }

  // ── 그래픽 품질 ──
  // settings.quality: auto | low | med | high. 실제로 쓰는 단계(this.q)는 low | med | high
  // 자동: 기기에 맞춰 시작 단계를 고르고, 프레임 시간을 계속 재며 해상도(픽셀 비율) → 단계(그림자·후처리·파티클·시야 거리) 순으로 낮춘다
  _guessTier() {
    const coarse = matchMedia("(pointer: coarse)").matches, cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    if (coarse) return cores <= 4 || mem <= 3 ? "low" : "med";
    return cores >= 8 && mem >= 8 ? "high" : "med";
  }
  get autoQ() { return settings.quality === "auto"; }

  applyQuality() {
    if (this.autoQ) { this.q = this._autoTier || (this._autoTier = this._guessTier()); this.dprScale = this.dprScale || 1; }
    else { this.q = TIERS.includes(settings.quality) ? settings.quality : "med"; this.dprScale = 1; }
    const q = this.q;
    this.renderer.shadowMap.enabled = q !== "low";
    this.renderer.shadowMap.type = q === "high" || !matchMedia("(pointer: coarse)").matches ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;   // 휴대폰 보통: 가벼운 그림자 필터
    // 후처리(외곽선 + 블룸 + 톤매핑 + FXAA): 낮음 품질에서는 끄고 툰 음영만 남긴다. 휴대폰의 보통 품질은 화면 공간 음영(AO)을 뺀 가벼운 후처리
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (q !== "low") {
      try {
        const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
        // 계단 현상 제거(MSAA): 높음 4배, 보통 2배 (WebGL2 가 아니면 0)
        const coarseQ = matchMedia("(pointer: coarse)").matches, samples = this.renderer.capabilities.isWebGL2 ? (q === "high" ? 4 : coarseQ ? 0 : 2) : 0;   // 휴대폰 보통 품질은 MSAA 끔(후처리 FXAA 로 충분)
        this.composer = new PostFX(this.renderer, Math.max(2, size.x), Math.max(2, size.y), { samples });
        this.composer.setLite(q === "med" && matchMedia("(pointer: coarse)").matches);
      } catch (e) { console.warn("후처리를 사용할 수 없어 기본 렌더링으로 전환합니다", e); this.composer = null; }
    }
    if (this.session) this.session.applyQuality(q);
    this._pixelRatio();
    this._aq = null;                                   // 자동 조절 측정을 처음부터 (셰이더 컴파일 끊김은 재지 않는다)
  }

  // 픽셀 비율 = 단계별 상한 × 자동 해상도 배율
  _pixelRatio() {
    const q = this.q, dpr = window.devicePixelRatio || 1, coarse = matchMedia("(pointer: coarse)").matches;
    const cap = q === "low" ? Math.min(dpr, 1) : q === "med" ? Math.min(dpr, coarse ? 1.5 : 1.75) : Math.min(dpr, coarse ? 1.75 : 2);   // 먼 곳을 덜 그리는 만큼 해상도를 올림 (높음: 휴대폰은 1.75배)
    const pr = Math.max(0.5, cap * (this.dprScale || 1));
    if (Math.abs(this.renderer.getPixelRatio() - pr) > 0.01) { this.renderer.setPixelRatio(pr); this.resize(); }
  }

  // 설정 화면에 보여 줄 현재 상태
  qinfo() { return { setting: settings.quality, tier: this.q, scale: Math.round((this.dprScale || 1) * 100), pr: +this.renderer.getPixelRatio().toFixed(2), ft: this._aq ? +this._aq.ema.toFixed(1) : null }; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.composer.setSize(Math.max(2, size.x), Math.max(2, size.y));
    }
    this.hud.resize();
    if (this.session) this.session.resize(w, h);
  }

  // 장면 그리기 (후처리 경유)
  draw(scene, camera, bloom = MENU_BLOOM, exposure = 1) {
    this.renderer.toneMappingExposure = exposure;
    const pf = this.perf;
    if (pf) pf.gpuBegin();
    if (!this.composer) this.renderer.render(scene, camera);
    else this.composer.render(scene, camera, bloom, exposure);
    if (pf) pf.gpuEnd();
  }

  touchWanted() {
    const t = settings.touchSticks;
    // 자동: 터치 화면이고 게임패드·조종기가 연결되어 있지 않을 때만 화면 스틱을 보인다
    return t === "on" || (t === "auto" && matchMedia("(pointer: coarse)").matches && !this.input.padInfo);
  }

  _touchLayer() {
    const el = document.getElementById("touch"), on = this.state === "play" && this.touchWanted();
    el.hidden = !on;
    if (on) el.querySelectorAll(".combat").forEach((b) => (b.hidden = !(this.session && this.session.mode.combat)));
  }

  // cfg: { mode, map, ... } — 모드별 옵션은 ui.js 참고
  startSession(cfg) {
    const loading = document.getElementById("loading");
    loading.hidden = false;
    this.ui.hide();
    // 대형 맵: 미리 구운 지도(그림 한 장)를 먼저 읽고 시작한다. 못 읽으면 예전처럼 계산해서 만든다
    const mp = MAPS[cfg.map];
    if (mp && mp.preload && !cfg._pre) { mp.preload().catch((e) => console.warn(e)).finally(() => this.startSession({ ...cfg, _pre: true })); return; }
    setTimeout(() => {
      try {
        if (this.session) { this.session.dispose(); this.session = null; }
        this._autoTierUp();
        this.lastCfg = cfg;
        this.session = new Session(this, cfg);
        this.music.setTheme(cfg.mode === "race" ? "race" : cfg.map);   // 레이싱은 레이싱 곡, 나머지는 맵 테마 곡
        this.music.setBoss(false);
        this.session.resize(innerWidth, innerHeight);
        this.state = "play";
        this.hud.toasts.length = 0; this.hud.feedLines.length = 0;
        this.input.flush();
        this._aq = null;                               // 맵 생성 직후의 끊김은 재지 않는다
        if (!cfg.pvp) this.ui.tut.onFlight(this.session);   // 첫 비행이면 할 일을 하나씩 띄운다 (PvP 경기 중에는 띄우지 않는다)
      } catch (e) {
        console.error(e);
        this.state = "menu";
        this.ui.show("main");
        alert("게임을 시작하지 못했습니다: " + e.message);
      }
      loading.hidden = true;
      this._touchLayer();
    }, 30);
  }

  restart() { if (this.lastCfg) this.startSession(this.lastCfg); }

  pause() {
    if (this.state !== "play") return;
    this.state = "pause";
    this.sound.motor(0, 0, false);
    this.ui.show("pause");
    this._touchLayer();
  }

  resume() {
    if (this.state !== "pause") return;
    this.state = "play";
    this.ui.hide();
    this.input.flush();
    this.last = performance.now();
    this._touchLayer();
  }

  showResult(result) {
    const cf = this.lastCfg;
    if (cf && cf.story && cf.objectives && this.session) result.obj = evaluate(cf.objectives, cf.need, metrics(this.session.mode, result));   // 스토리 목표 판정
    if (this.lastCfg && this.lastCfg.story) result.story = this.lastCfg.bond ? completeBond(this.lastCfg.bond, result) : completeStage(this.lastCfg.story, result);   // 스토리 단계(인연 임무 포함) 판정·진행도 저장
    if (this.lastCfg && this.lastCfg.training) result.training = completeLesson(this.lastCfg.training, result);   // 비행훈련 과목 판정
    if (this.lastCfg) result.reward = GP.onResult(this.lastCfg, result);   // 포인트·퀘스트·업적
    this.state = "result";
    this.ui.show("result", result);
    this._touchLayer();
  }

  quit() {
    const pvp = this.session && this.session.cfg.pvp;
    if (this.session) { this.session.dispose(); this.session = null; }
    this.state = "menu";
    this.music.setTheme("menu");
    this.hud.clear();
    if (pvp) this.ui.pvpAfterMatch(); else this.ui.show("main");
    this._touchLayer();
  }

  // 자동 품질: 1.5초 묶음마다 평균 프레임 시간을 보고 조절. 시작·단계 변경 직후 2초는 재지 않는다
  // 느림(> 22ms ≈ 45fps 미만): 해상도 15% 낮춤 → 해상도가 바닥(60%)이면 단계 하나 내림
  // 빠름(< 17.5ms, 세 번 연속): 해상도를 10%씩 되돌림. 단계를 올리는 것은 다음 비행부터(맵 세부 묘사가 단계에 따라 만들어지므로)
  _autoQuality(dtMs) {
    if (!this.autoQ || document.hidden || this._benching) return;   // 성능 측정 중에는 자동 조절을 멈춘다
    const a = this._aq || (this._aq = { skip: 2000, sum: 0, n: 0, ema: 16.7, good: 0 });
    if (!(dtMs > 0) || dtMs > 250) return;             // 탭 전환·멈춤 등은 제외
    if (a.skip > 0) { a.skip -= dtMs; return; }
    a.sum += dtMs; a.n++;
    a.ema += (dtMs - a.ema) * 0.05;
    if (a.sum < 1500) return;
    const avg = a.sum / a.n;
    a.sum = 0; a.n = 0;
    // 방금 낮춘 효과 확인: 낮췄는데도 10% 넘게 빨라지지 않았다면 기기가 화면 갱신을 묶어 둔 것(예: 30fps 제한·절전)이지
    // 그래픽이 무거운 게 아니다 → 원래대로 되돌리고, 이 기기에서는 그 속도를 기준으로 삼아 더 낮추지 않는다
    const tr = this._trial;
    if (tr) {
      this._trial = null;
      if (avg > tr.prev * 0.9) {
        // 해상도를 낮춰도 그대로면 → 해상도 대신 품질 단계(후처리·그림자)를 낮춰 한 번 더 본다
        const i = TIERS.indexOf(tr.tier);
        if (tr.kind === "dpr" && i > 0) {
          this.dprScale = tr.dpr;
          this._autoTier = TIERS[i - 1]; this.applyQuality();
          this._trial = { prev: tr.prev, dpr: tr.dpr, tier: tr.tier, kind: "tier" };
          if (this.state === "play") this.hud.toast(`성능에 맞춰 그래픽을 '${QUALITY_NAMES[this.q]}'(으)로 낮췄습니다`, "#ffd24a", 2.4, 16);
          return;
        }
        // 품질 단계까지 낮춰도 그대로면 기기 쪽 제한(30fps 고정 등) → 원래대로 되돌리고 그 속도를 기억
        this.dprScale = tr.dpr;
        if (this._autoTier !== tr.tier) { this._autoTier = tr.tier; this.applyQuality(); } else this._pixelRatio();
        this._capAvg = Math.max(this._capAvg || 0, tr.prev); qcapSave(this._capAvg);
        a.skip = 600; return;
      }
    }
    const capped = this._capAvg && avg < this._capAvg * 1.25;   // 기기 제한 속도 근처면 '느림'이 아니다
    if (avg > 22 && !capped) {
      a.good = 0; this._fastRuns = 0;
      this._trial = { prev: avg, dpr: this.dprScale, tier: this._autoTier || this.q, kind: "dpr" };
      if (this._capAvg) this._tierUpFail = true;
      if (this.dprScale > 0.62) { this.dprScale = Math.max(0.6, this.dprScale * 0.85); this._pixelRatio(); a.skip = 600; return; }
      this._trial.kind = "tier";
      const i = TIERS.indexOf(this.q);
      if (i > 0) {
        this._autoTier = TIERS[i - 1]; this.dprScale = 0.85;
        this.applyQuality();
        if (this.state === "play") this.hud.toast(`성능에 맞춰 그래픽을 '${QUALITY_NAMES[this.q]}'(으)로 낮췄습니다`, "#ffd24a", 2.4, 16);
      } else this._trial = null;
    } else if (capped && this.state === "play") {
      // 제한 속도로 묶인 기기: 그래픽을 낮춰도 소용없으니, 비행이 끝날 때 품질을 한 단계 올려 볼 수 있게 센다
      if (this.dprScale < 1) { this.dprScale = Math.min(1, this.dprScale / 0.85); this._pixelRatio(); a.skip = 600; }
      else this._fastRuns = (this._fastRuns || 0) + 1;
    } else if (avg < 17.5) {
      if (++a.good >= 3 && this.dprScale < 1) { this.dprScale = Math.min(1, this.dprScale * 1.1); this._pixelRatio(); a.good = 0; a.skip = 600; }
      else if (a.good >= 3 && this.state === "play") { this._fastRuns = (this._fastRuns || 0) + 1; a.good = 0; }
    } else a.good = 0;
  }

  // 새 비행을 시작할 때: 지난 비행 내내 여유가 있었으면(해상도 100% + 빠른 구간이 충분) 단계 하나 올려 본다
  _autoTierUp() {
    if (!this.autoQ || !this._fastRuns || this._fastRuns < 6) return;   // 지난 비행 내내 60fps 근처였으면 다음 비행에서 한 단계 올려 본다
    if (this._capAvg && this._tierUpFail) return;   // 제한 기기에서 올렸다가 느려진 적이 있으면 그만
    const i = TIERS.indexOf(this._autoTier);
    if (i >= 0 && i < TIERS.length - 1 && this.dprScale >= 1) { this._autoTier = TIERS[i + 1]; this.applyQuality(); }
    this._fastRuns = 0;
  }

  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    const dt = Math.min(0.05, Math.max(0.001, (t - this.last) / 1000));
    this._lastT = this.last;
    this.last = t;
    this.dt = dt;
    this.fps += (1 / dt - this.fps) * 0.05;
    const s = this.session, pf = this.perf;
    pf.frameStart();
    if (s && (this.state === "play" || this.state === "result")) {
      if (this.state === "play" && this.input.take("pause")) { this.pause(); return; }
      let t0 = performance.now();
      s.update(dt);
      const t1 = performance.now(); pf.mark("upd", t1 - t0);
      s.render();
      pf.mark("ren", performance.now() - t1);
      if (this.state === "play") this._autoQuality(t - this._lastT);
    } else if (s && this.state === "pause" && s.cfg.net) {
      // 온라인 경기: 일시정지 메뉴가 떠 있어도 세계는 계속 돈다 (기체는 제자리 비행)
      s.update(dt);
      s.render();
      if (this.input.take("pause")) this.resume();
    } else if (s && this.state === "pause") {
      this.input.update(dt);                             // 게임패드 메뉴 입력·일시정지 버튼
      if (this.input.take("pause")) this.resume();
      this.input.flush();
      this.draw(s.world.scene, s.camera, s.world.bloom, s.world.exposure);
    } else {
      this.input.update(dt);
      this.input.flush();
      if (!["title", "main", "group", "pvp"].includes(this.ui.screen)) {   // 사진 배경 화면(타이틀·메인·하위 메뉴)에서는 3D 를 그리지 않는다
        this.menu.update(dt, innerWidth / innerHeight);
        this.draw(this.menu.scene, this.menu.camera);
        this._autoQuality(t - this._lastT);
      }
    }
    this.ui.update(dt);
    this.padui.update();
    pf.frameEnd(t, t - this._lastT);
  }
}

function boot() {
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) throw new Error("WebGL 미지원");
    window.__game = new Game();
  } catch (e) {
    console.error(e);
    const f = document.getElementById("fatal");
    f.hidden = false;
    f.innerHTML = `<div><h2>실행할 수 없습니다</h2><p>이 브라우저/기기에서 WebGL(3D 그래픽)을 사용할 수 없습니다.<br>최신 Chrome·Edge·Safari 에서 다시 열어 주세요.</p><p class="muted">${e.message}</p></div>`;
  }
}
boot();
