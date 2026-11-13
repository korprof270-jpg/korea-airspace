// 부트스트랩: 렌더러·입력·사운드·UI 를 만들고 메뉴 ↔ 게임 상태를 관리
import "./rotate.js";
import * as THREE from "../vendor/three.module.min.js";
import { settings } from "./config.js";
import { Input } from "./input.js";
import { Sound } from "./audio.js";
import { Hud } from "./hud.js";
import { Session } from "./session.js";
import { UI } from "./ui.js";
import { PostFX } from "./post.js";
import { MenuScene, Thumbs } from "./menu3d.js";
import { complete as completeStage } from "./story.js";
import { complete as completeLesson } from "./training.js";

const MENU_BLOOM = { strength: 0.42, radius: 0.55, threshold: 0.92 };

class Game {
  constructor() {
    const glc = document.getElementById("gl");
    // 안티에일리어싱은 후처리(FXAA)가 맡는다. 톤매핑은 toon.js 가 넣은 평면 색용 함수(낮음 품질의 직접 렌더링에도 적용)
    this.renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, powerPreference: "high-performance" });
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.CustomToneMapping;
    this.composer = null;
    this.hud = new Hud(document.getElementById("hud"));
    this.input = new Input();
    this.sound = new Sound();
    this.menu = new MenuScene();
    this.thumbs = new Thumbs();
    this.session = null;
    this.state = "menu";   // menu | play | pause | result
    this.dt = 0.016;
    this.last = performance.now();
    this.fps = 60;
    this.ui = new UI(this);
    this.applyQuality();
    addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => { if (document.hidden && this.state === "play") this.pause(); });
    this.resize();
    this.ui.show("main");
    requestAnimationFrame((t) => this.frame(t));
  }

  applyQuality() {
    const q = settings.quality, dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === "low" ? Math.min(dpr, 1) : q === "med" ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
    this.renderer.shadowMap.enabled = q !== "low";
    // 후처리(외곽선 + 블룸 + 톤매핑 + FXAA): 낮음 품질에서는 끄고 툰 음영만 남긴다
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (q !== "low") {
      try {
        const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
        this.composer = new PostFX(this.renderer, Math.max(2, size.x), Math.max(2, size.y));
      } catch (e) { console.warn("후처리를 사용할 수 없어 기본 렌더링으로 전환합니다", e); this.composer = null; }
    }
    this.resize();
  }

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
    if (!this.composer) { this.renderer.render(scene, camera); return; }
    this.composer.render(scene, camera, bloom, exposure);
  }

  touchWanted() {
    const t = settings.touchSticks;
    return t === "on" || (t === "auto" && matchMedia("(pointer: coarse)").matches);
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
    setTimeout(() => {
      try {
        if (this.session) { this.session.dispose(); this.session = null; }
        this.lastCfg = cfg;
        this.session = new Session(this, cfg);
        this.session.resize(innerWidth, innerHeight);
        this.state = "play";
        this.hud.toasts.length = 0; this.hud.feedLines.length = 0;
        this.input.flush();
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
    if (this.lastCfg && this.lastCfg.story) result.story = completeStage(this.lastCfg.story, result);   // 스토리 단계 판정·진행도 저장
    if (this.lastCfg && this.lastCfg.training) result.training = completeLesson(this.lastCfg.training, result);   // 비행훈련 과목 판정
    this.state = "result";
    this.ui.show("result", result);
    this._touchLayer();
  }

  quit() {
    if (this.session) { this.session.dispose(); this.session = null; }
    this.state = "menu";
    this.hud.clear();
    this.ui.show("main");
    this._touchLayer();
  }

  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    const dt = Math.min(0.05, Math.max(0.001, (t - this.last) / 1000));
    this.last = t;
    this.dt = dt;
    this.fps += (1 / dt - this.fps) * 0.05;
    const s = this.session;
    if (s && (this.state === "play" || this.state === "result")) {
      if (this.state === "play" && this.input.take("pause")) { this.pause(); return; }
      s.update(dt);
      s.render();
    } else if (s && this.state === "pause") {
      if (this.input.take("pause")) this.resume();
      this.input.flush();
      this.draw(s.world.scene, s.camera, s.world.bloom, s.world.exposure);
    } else {
      this.input.update(dt);
      this.input.flush();
      this.menu.update(dt, innerWidth / innerHeight);
      this.draw(this.menu.scene, this.menu.camera);
    }
    this.ui.update(dt);
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
