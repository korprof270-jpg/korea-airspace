// 부트스트랩: 렌더러·입력·사운드·UI 를 만들고 메뉴 ↔ 게임 상태를 관리
import "./rotate.js";
import * as THREE from "../vendor/three.module.min.js";
import { settings, DRONE_CLASSES } from "./config.js";
import { Input } from "./input.js";
import { Sound } from "./audio.js";
import { Hud } from "./hud.js";
import { Session } from "./session.js";
import { UI } from "./ui.js";
import { buildDrone } from "./dronemodel.js";
import { toonMat } from "./toon.js";
import { PostFX } from "./post.js";

const MENU_BLOOM = { strength: 0.42, radius: 0.55, threshold: 0.92 };

// 정비소 바닥 무늬: 동심원 + 눈금
function floorTexture() {
  const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"), c = S / 2;
  g.fillStyle = "#101736"; g.fillRect(0, 0, S, S);
  const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.5);
  gr.addColorStop(0, "#2c3d80"); gr.addColorStop(0.45, "#1d2a62"); gr.addColorStop(0.46, "#162050"); gr.addColorStop(1, "#101736");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = "#2c3f8c"; g.lineWidth = 3;
  for (const r of [0.1, 0.2, 0.34, 0.5, 0.7, 0.94]) { g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); }
  g.lineWidth = 2;
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r0 = c * (i % 4 ? 0.2 : 0.17), r1 = c * 0.225; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// 메뉴·정비소 배경: 받침대 위에서 도는 드론
class MenuScene {
  constructor() {
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(0x121a40);
    sc.fog = new THREE.Fog(0x121a40, 3.5, 11);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    // 만화풍 쇼룸: 흰 주광 + 청록·주황 림 라이트가 툰 밴드와 림을 또렷하게 만든다
    sc.add(new THREE.HemisphereLight(0xc4d2ff, 0x2a2350, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(2, 4, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: 0.5, far: 12 });
    sc.add(key);
    const rim = new THREE.DirectionalLight(0x21d4fd, 1.5); rim.position.set(-3, 1.5, -2.5); sc.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff5a1f, 1.2); rim2.position.set(3, 0.8, -2); sc.add(rim2);
    const padMat = toonMat({ color: 0x2a3566 }), baseMat = toonMat({ color: 0x1b2248 });   // 평평한 윗면에는 광택을 주지 않는다(하이라이트가 큰 얼룩으로 번짐)
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.03, 48), padMat);
    pad.position.y = -0.015; pad.receiveShadow = true; sc.add(pad);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.03, 48), baseMat);
    base.position.y = -0.045; base.receiveShadow = true; sc.add(base);
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x21d4fd).multiplyScalar(2.2) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.007, 8, 64), glow);
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.028; sc.add(ring);
    for (let i = 0; i < 8; i++) {   // 받침대 둘레의 표시등
      const a = (i / 8) * Math.PI * 2, dot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.016), i % 2 ? glow : padMat);
      dot.position.set(Math.cos(a) * 0.5, -0.028, Math.sin(a) * 0.5); dot.rotation.y = -a + Math.PI / 2; sc.add(dot);
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), toonMat({ color: 0xffffff, map: floorTexture() }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.06; floor.receiveShadow = true; sc.add(floor);
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
    // 안티에일리어싱은 후처리(FXAA)가 맡는다. 톤매핑은 toon.js 가 넣은 평면 색용 함수(낮음 품질의 직접 렌더링에도 적용)
    this.renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, powerPreference: "high-performance" });
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.CustomToneMapping;
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
