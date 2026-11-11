// 한 판의 게임: 월드 + 플레이어 + 모드 + 효과를 묶고 프레임마다 갱신/렌더
import * as THREE from "../vendor/three.module.min.js";
import { settings, FLIGHT_MODES, FLIGHT_MODE_INFO } from "./config.js";
import { World } from "./world.js";
import { Player, CAMERA_NAMES } from "./player.js";
import { FX } from "./fx.js";
import { MAPS } from "./maps/index.js";
import { RaceMode } from "./modes/race.js";
import { TrackingMode } from "./modes/tracking.js";
import { FreestyleMode } from "./modes/freestyle.js";
import { SurvivalMode } from "./modes/survival.js";
import { ChallengeMode } from "./modes/challenge.js";

const MODES = { race: RaceMode, tracking: TrackingMode, freestyle: FreestyleMode, survival: SurvivalMode, challenge: ChallengeMode };

export class Session {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    this.hud = game.hud;
    this.map = MAPS[cfg.map];
    this.world = new World(this.map, settings.quality, game.renderer);
    this.camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 4000);
    this.fx = new FX(this.world.scene);
    this.player = new Player(this);
    this.time = 0;
    this.result = null;
    this.resultTimer = 0;
    this.mode = new MODES[cfg.mode](this, cfg);
    this.mode.start();
    this.player.updateCamera(0, this.camera);
    game.input.flush();
  }

  update(dt) {
    const g = this.game, inp = g.input, pl = this.player, mode = this.mode;
    this.time += dt;

    // 공통 조작: 시점·비행 모드·리셋
    if (inp.take("camera")) this.hud.toast(`시점: ${CAMERA_NAMES[pl.cycleCamera()]}`, "#9fd8ff", 1.2, 20);
    let fm = null;
    for (let i = 0; i < FLIGHT_MODES.length; i++) if (inp.take(`mode${i + 1}`)) fm = FLIGHT_MODES[i];
    if (inp.take("modeNext")) fm = FLIGHT_MODES[(FLIGHT_MODES.indexOf(pl.flightMode) + 1) % FLIGHT_MODES.length];
    if (fm && pl.setFlightMode(fm)) { this.hud.toast(`${FLIGHT_MODE_INFO[fm].label} — ${FLIGHT_MODE_INFO[fm].ko}`, "#9fd8ff", 1.4, 22); g.sound.play("click"); }
    if (inp.take("reset") && mode.state === "run") mode.onReset();

    inp.enabled = !mode.locked || mode.state === "done";
    const ctl = inp.update(dt);
    if (mode.state === "done") { ctl.throttle = pl.flightMode === "ACRO" ? -0.2 : 0; ctl.pitch = ctl.roll = ctl.yaw = 0; }

    pl.update(dt, ctl);
    mode.update(dt);
    this.world.update(dt);
    pl.updateCamera(dt, this.camera);
    if (this.debugCam) { this.camera.position.fromArray(this.debugCam.pos); this.camera.lookAt(...this.debugCam.look); this.camera.fov = this.debugCam.fov || 60; this.camera.updateProjectionMatrix(); }
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.world.follow(this.camera, pl.body.pos);
    this.fx.update(dt, this.camera, this.hud.H);
    g.sound.motor(pl.body.disabled ? 0 : pl.body.thrust, pl.body.speed, true);

    if (this.result) {
      this.resultTimer += dt;
      if (this.resultTimer > 1.4 && !this.resultShown) { this.resultShown = true; g.showResult(this.result); }
    }
  }

  render() {
    this.game.draw(this.world.scene, this.camera, this.world.bloom, this.world.exposure);
    const h = this.hud;
    h.clear();
    h.drawFlight(this, this.game.dt);
    this.mode.hud(h);
    h.drawToasts(this.game.dt);
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
    this.world.dispose();
    this.game.sound.motor(0, 0, false);
  }
}
