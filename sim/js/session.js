// 한 판의 게임: 월드 + 플레이어 + 모드 + 효과를 묶고 프레임마다 갱신/렌더
import * as THREE from "../vendor/three.module.min.js";
import { settings, FLIGHT_MODES, FLIGHT_MODE_INFO } from "./config.js";
import { World } from "./world.js";
import { Player, CAMERA_NAMES } from "./player.js";
import { FX } from "./fx.js";
import { Feel } from "./feel.js";
import { MAPS } from "./maps/index.js";
import { RaceMode } from "./modes/race.js";
import { TrackingMode } from "./modes/tracking.js";
import { FreestyleMode } from "./modes/freestyle.js";
import { SurvivalMode } from "./modes/survival.js";
import { ChallengeMode } from "./modes/challenge.js";
import { TrainingMode } from "./modes/training.js";
import { ConquestMode } from "./modes/conquest.js";
import { portrait, hasArt } from "./portraits.js";
import { CAST } from "./story.js";
import * as GP from "./garage.js";
import { metrics, judge } from "./objectives.js";

const MODES = { race: RaceMode, tracking: TrackingMode, freestyle: FreestyleMode, survival: SurvivalMode, challenge: ChallengeMode, training: TrainingMode, conquest: ConquestMode };

export class Session {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    this.hud = game.hud;
    this.map = MAPS[cfg.map];
    this.world = new World(this.map, game.q || "med", game.renderer);
    this.camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 4000);
    this.fx = new FX(this.world.scene);
    this.applyQuality(game.q || "med");
    this.feel = new Feel(this);
    game.sound.onPlay = (name, vol) => this.feel.onSound(name, vol);
    this.player = new Player(this);
    this.time = 0;
    this.timeK = 1;                    // 시간 배율 (히트스톱·슬로모션). 입력·화면 효과는 실제 시간으로 돈다
    this._slow = null;
    this.result = null;
    this.resultTimer = 0;
    this.mode = new MODES[cfg.mode](this, cfg);
    if (cfg.title) this.mode.title = cfg.title;   // 스토리 단계 이름
    GP.setToast((t, c) => this.hud.toast(t, c, 2, 18));   // 퀘스트·업적 달성 알림
    if (!this.mode.combat && cfg.mode !== "training") this.player.body.boost = 1 + GP.loadout().thrust;   // 모터 업그레이드 (전투 없는 모드)
    this.mode.start();
    this.player.updateCamera(0, this.camera);
    game.input.flush();
  }

  // 히트스톱/슬로모션: dur 초 동안 시간을 min 배로 (hold 비율만큼 머물렀다가 부드럽게 원래대로)
  // '움직임 줄이기' 설정이면 하지 않는다. 더 강한(느린) 요청이 이미 진행 중이면 무시
  slowMo(dur, min, hold = 0.35) {
    if (settings.fx && settings.fx.reduceMotion) return;
    const s = this._slow;
    if (s && s.t < s.dur && s.min <= min) return;
    this._slow = { t: 0, dur, min, hold };
  }
  _timeScale(dt) {
    const s = this._slow;
    if (!s) return 1;
    s.t += dt;
    if (s.t >= s.dur || this.result) { this._slow = null; return 1; }
    const k = s.t / s.dur;
    if (k < s.hold) return s.min;
    const e = (k - s.hold) / (1 - s.hold);
    return s.min + (1 - s.min) * e * e;
  }

  update(dt0) {
    const g = this.game, inp = g.input, pl = this.player, mode = this.mode;
    this.timeK = this._timeScale(dt0);
    const dt = dt0 * this.timeK;
    this.time += dt;
    if (mode.state === "run" && !pl.crashed && !pl.body.onGround) GP.ev("fly", dt);
    // 지난 프레임의 화면 흔들림을 걷어낸다: 모드·판정 코드는 흔들리지 않은 카메라만 본다
    this.feel.restore(this.camera);

    // 공통 조작: 시점·비행 모드·리셋
    if (inp.take("camera")) this.hud.toast(`시점: ${CAMERA_NAMES[pl.cycleCamera()]}`, "#9fd8ff", 1.2, 20);
    let fm = null;
    for (let i = 0; i < FLIGHT_MODES.length; i++) if (inp.take(`mode${i + 1}`)) fm = FLIGHT_MODES[i];
    if (inp.take("modeNext")) fm = FLIGHT_MODES[(FLIGHT_MODES.indexOf(pl.flightMode) + 1) % FLIGHT_MODES.length];
    if (fm && pl.setFlightMode(fm)) { this.hud.toast(`${FLIGHT_MODE_INFO[fm].label} — ${FLIGHT_MODE_INFO[fm].ko}`, "#9fd8ff", 1.4, 22); g.sound.play("click"); }
    if (inp.take("reset") && mode.state === "run") mode.onReset();

    inp.enabled = !mode.locked || mode.state === "done";
    const ctl = inp.update(dt0);
    if (mode.state === "done") { ctl.throttle = pl.flightMode === "ACRO" ? -0.2 : 0; ctl.pitch = ctl.roll = ctl.yaw = 0; }

    pl.update(dt, ctl);
    mode.update(dt);
    this.world.update(dt);
    pl.updateCamera(dt, this.camera);
    if (this.debugCam) { this.camera.position.fromArray(this.debugCam.pos); this.camera.lookAt(...this.debugCam.look); this.camera.fov = this.debugCam.fov || 60; this.camera.updateProjectionMatrix(); }
    this.feel.update(dt0, this.camera);   // 컷신 카메라에도 흔들림이 얹히도록 그 뒤에
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.world.follow(this.camera, pl.body.pos);
    this.fx.update(dt, this.camera, this.hud.H);
    g.sound.motor(pl.body.disabled ? 0 : pl.body.thrust, pl.body.speed, true);

    if (this.result) {
      this.resultTimer += dt0;
      if (this.resultTimer > 1.4 && !this.resultShown) { this.resultShown = true; g.showResult(this.result); }
    }
  }

  render() {
    this.game.draw(this.world.scene, this.camera, this.world.bloom, this.world.exposure);
    const h = this.hud;
    h.clear();
    this.feel.draw(h);
    if (!this.mode.cut) h.drawFlight(this, this.game.dt);   // 보스 컷신 중에는 비행 계기를 숨긴다
    this.mode.hud(h);
    this._radio(h);
    this._objHud(h);
    h.drawToasts(this.game.dt);
  }

  // 스토리 목표 체크리스트 (오른쪽 가운데): ✔ 달성 · ● 유지 중 · ✖ 실패 · ○ 판정 대기
  _objHud(h) {
    const L = this.cfg.objectives, m0 = this.mode;
    if (!L || m0.cut || h.lvl === "off" || m0.state === "countdown" && m0.time < 0) return;
    const u = h.u, m = metrics(m0), w = 230 * u, lh = 19 * u, ph = 26 * u + L.length * lh, x = h.L.r - w, y = h.H * 0.36;
    h.plate(x, y, w, ph, { accent: "#ffd24a", side: "right", skew: 0.04 });
    const got = L.filter((o) => judge(o, m).ok && (judge(o, m).final || judge(o, m).keep)).length;
    h.text(`목표 ${this.cfg.need}개 이상 달성`, x + 12 * u, y + 13 * u, { size: 11.5, base: "middle", bold: true, color: "#ffd24a", shadow: false });
    L.forEach((o, i) => {
      const j = judge(o, m), yy = y + 30 * u + i * lh;
      const mark = j.ok && j.final ? "✔" : j.ok && j.keep ? "●" : !j.ok && j.final ? "✖" : "○";
      const col = mark === "✔" ? "#35ff7a" : mark === "●" ? "#9fe8b8" : mark === "✖" ? "#ff6b5a" : "#b4c2d4";
      h.text(mark, x + 14 * u, yy, { size: 12, base: "middle", color: col, shadow: false });
      h.text((o.req ? "★ " : "") + o.text, x + 30 * u, yy, { size: 12, base: "middle", color: mark === "✖" ? "#ff9a8a" : "#fff", shadow: false });
    });
    void got;
  }

  // 스토리 무전: 정해진 시각에 동료 얼굴과 한 줄 대사를 4.5초 띄운다
  _radio(h) {
    const R = this.cfg.radio, m = this.mode;
    if (!R || m.state !== "run" || m.cut || h.lvl === "off") return;
    const cur = R.find(([at]) => m.time >= at && m.time < at + 4.5);
    if (!cur) return;
    const [at, who, line] = cur, k = Math.min(1, (m.time - at) * 4, (at + 4.5 - m.time) * 3);
    const u = h.u, L = h.L, g = h.g, w = Math.min(460 * u, h.W - 32 * u), ph = 58 * u, x = L.cx - w / 2, y = L.conTop - ph - 70 * u;
    g.save(); g.globalAlpha = k;
    h.plate(x, y, w, ph, { accent: CAST[who] || "#9fb3c8", skew: 0.05 });
    const src = portrait(who, "normal");
    if (src) {
      this._rimg = this._rimg || {};
      let img = this._rimg[who];
      if (!img) { img = this._rimg[who] = new Image(); img.src = src; }
      if (img.complete && img.naturalWidth) { g.save(); g.beginPath(); g.rect(x + 8 * u, y + 5 * u, 48 * u, ph - 10 * u); g.clip(); if (hasArt(who)) { const k = img.naturalWidth / 1200; g.drawImage(img, 330 * k, 70 * k, 540 * k, 580 * k, x + 6 * u, y + 2 * u, 52 * u, 56 * u); } else g.drawImage(img, 90, 70, 220, 240, x + 6 * u, y + 2 * u, 52 * u, 56 * u); g.restore(); }
    }
    const tx = x + (src ? 66 : 16) * u;
    h.text(who, tx, y + 17 * u, { size: 12, base: "middle", bold: true, color: CAST[who] || "#9fb3c8", shadow: false });
    h.text(line, tx, y + 38 * u, { size: 14, base: "middle", color: "#fff", shadow: false });
    g.restore();
  }

  // 그래픽 단계에 따른 파티클 수·시야 거리. 안개가 완전히 덮는 거리 너머는 그리지 않는다(낮음은 안개 끝, 보통은 1.6배)
  applyQuality(q) {
    this.fx.density = q === "low" ? 0.45 : q === "med" ? 0.75 : 1;
    const fog = this.world.scene.fog, ff = fog && fog.far ? fog.far : 2000;
    const want = Math.max(q === "low" ? 600 : 900, ff * (q === "low" ? 1.05 : 1.6), this._skyFar());
    this.camera.far = q === "high" ? 4000 : Math.min(4000, want);
    this.camera.updateProjectionMatrix();
  }

  // 안개를 받지 않는 먼 배경(행성·달·오로라·별 등)까지는 잘리지 않도록: 그 물체들의 가장 먼 거리 + 맵 크기
  _skyFar() {
    if (this._sky !== undefined) return this._sky;
    let far = 0;
    const sp = new THREE.Sphere();
    this.world.scene.traverse((o) => {
      const m = o.material;
      if (!m || (Array.isArray(m) ? !m.some((x) => x.fog === false) : m.fog !== false)) return;
      o.updateWorldMatrix(true, false);
      if (o.isSprite) { const sc = o.getWorldScale(new THREE.Vector3()); far = Math.max(far, o.getWorldPosition(sp.center).length() + Math.max(sc.x, sc.y)); return; }
      const g = o.geometry;
      if (!g) return;
      if (!g.boundingSphere) g.computeBoundingSphere();
      sp.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
      far = Math.max(far, sp.center.length() + sp.radius);
    });
    return (this._sky = far > 0 ? far + this.world.size * 1.5 : 0);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onFinish(result) { this.result = result; this.resultTimer = 0; }

  dispose() {
    this.mode.dispose();
    this.player.dispose();
    this.fx.dispose();
    this.feel.dispose();
    this.game.sound.onPlay = null;
    this.world.dispose();
    this.game.sound.motor(0, 0, false);
  }
}
