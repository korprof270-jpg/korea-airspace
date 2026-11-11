// 부트스트랩: 렌더러·입력·사운드·UI 를 만들고 메뉴 ↔ 게임 상태를 관리
import * as THREE from "../vendor/three.module.min.js";
import { settings, DRONE_CLASSES } from "./config.js";
import { Input } from "./input.js";
import { Sound } from "./audio.js";
import { Hud } from "./hud.js";
import { Session } from "./session.js";
import { UI } from "./ui.js";
import { buildDrone } from "./dronemodel.js";
import { EffectComposer } from "../vendor/pp/postprocessing/EffectComposer.js";
import { RenderPass } from "../vendor/pp/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../vendor/pp/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../vendor/pp/postprocessing/OutputPass.js";

const MENU_BLOOM = { strength: 0.55, radius: 0.6, threshold: 0.9 };

// 메뉴·정비소 배경: 받침대 위에서 도는 드론
class MenuScene {
  constructor() {
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(0x0b1020);
    sc.fog = new THREE.Fog(0x0b1020, 4, 14);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    sc.add(new THREE.HemisphereLight(0xbfd9ff, 0x1a1420, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(2, 4, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: 0.5, far: 12 });
    sc.add(key);
    const rim = new THREE.DirectionalLight(0x21d4fd, 2.2); rim.position.set(-3, 1.5, -2.5); sc.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff5a1f, 1.6); rim2.position.set(3, 0.8, -2); sc.add(rim2);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.04, 48), new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 0.5, metalness: 0.6 }));
    pad.position.y = -0.02; pad.receiveShadow = true; sc.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x21d4fd).multiplyScalar(2.2) }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; sc.add(ring);
    const grid = new THREE.GridHelper(30, 60, 0x2a3a5c, 0x18223a); grid.position.y = -0.04; sc.add(grid);
    this.pivot = new THREE.Group(); sc.add(this.pivot);
    this.angle = 0.6; this.spin = 0.35; this.t = 0; this.close = false; this.drag = 0;
    this.setLook(settings.drone);
  }

  setLook(look) {
    if (this.model) { this.pivot.remove(this.model); this.model.userData.dispose(); }
    const cls = DRONE_CLASSES[look.cls] || DRONE_CLASSES.freestyle;
    this.model = buildDrone(look, cls.scale);
    this.model.position.y = 0.16;
    this.pivot.add(this.model);
    this.size = cls.scale;
  }

  update(dt, aspect) {
    this.t += dt;
    this.angle += (this.spin + this.drag) * dt;
    this.drag *= Math.exp(-dt * 5);
    const d = (this.close ? 0.62 : 0.95) * (0.55 + this.size * 0.5) / Math.min(1, aspect * 0.9);
    this.camera.aspect = aspect;
    // 정비소에서는 옆(또는 아래) 패널만큼 화면 중심을 옮겨 드론이 빈 영역 가운데 오게 한다
    const W = innerWidth, H = innerHeight;
    if (this.close) { if (W > 760) this.camera.setViewOffset(W, H, Math.min(430, W * 0.46) / 2, 0, W, H); else this.camera.setViewOffset(W, H, 0, H * 0.31, W, H); }
    else this.camera.clearViewOffset();
    this.camera.position.set(Math.sin(this.angle) * d, 0.16 + d * 0.42, Math.cos(this.angle) * d);
    this.camera.lookAt(0, this.close ? 0.15 : 0.15 + d * 0.3, 0);
    this.camera.updateProjectionMatrix();
    this.model.position.y = 0.16 + Math.sin(this.t * 1.6) * 0.012;
    this.model.rotation.z = Math.sin(this.t * 1.1) * 0.05;
    this.model.rotation.x = Math.cos(this.t * 0.9) * 0.04;
    this.model.userData.tick(dt, 0.35, this.t);
  }
}

class Game {
  constructor() {
    const glc = document.getElementById("gl");
    this.renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: settings.quality !== "low", powerPreference: "high-performance" });
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.composer = null;
    this.hud = new Hud(document.getElementById("hud"));
    this.input = new Input();
    this.sound = new Sound();
    this.menu = new MenuScene();
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
    // 후처리(블룸 + 톤매핑): 낮음 품질에서는 끈다
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (q !== "low") {
      try {
        const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
        const rt = new THREE.WebGLRenderTarget(Math.max(2, size.x), Math.max(2, size.y), { type: THREE.HalfFloatType, samples: q === "high" ? 4 : 2 });
        this.composer = new EffectComposer(this.renderer, rt);
        this.renderPass = new RenderPass(this.menu.scene, this.menu.camera);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.6, 0.9);
        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new OutputPass());
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
    this.renderPass.scene = scene; this.renderPass.camera = camera;
    this.bloomPass.strength = bloom.strength; this.bloomPass.radius = bloom.radius; this.bloomPass.threshold = bloom.threshold;
    this.composer.render();
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
