// 플레이어 드론: 물리 본체 + 외형 + 카메라(1인칭 FPV / 3인칭 추적 / 지상 시점)
import * as THREE from "../vendor/three.module.min.js";
import { settings, DRONE_CLASSES, FLIGHT_MODES, clamp, save } from "./config.js";
import { DroneBody } from "./physics.js";
import { buildDrone } from "./dronemodel.js";

const STEP = 1 / 240;
const DEG = Math.PI / 180;
export const CAMERAS = ["fpv", "chase", "los"];
export const CAMERA_NAMES = { fpv: "1인칭 (FPV)", chase: "3인칭 (추적)", los: "지상 시점 (LOS)" };

const _v = new THREE.Vector3();
const _f = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _prev = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(session) {
    this.session = session;
    const cls = DRONE_CLASSES[settings.drone.cls] || DRONE_CLASSES.freestyle;
    this.cls = cls;
    this.body = new DroneBody(cls);
    this.model = buildDrone(settings.drone, cls.scale);
    session.world.scene.add(this.model);
    this.flightMode = settings.flightMode;
    this.camMode = settings.camera;
    this.acc = 0;
    this.crashed = false;
    this.crashTimer = 0;
    this.spawn = { pos: new THREE.Vector3(0, 0.3, 0), yaw: 0 };
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camInit = false;
    this.pilot = new THREE.Vector3();
    this.aimDir = new THREE.Vector3(0, 0, -1);  // 카메라(조준) 방향
    this.aimPos = new THREE.Vector3();
    this.time = 0;
    this.trailT = 0;
    this.maxImpact = 0;
    this.frozen = false;                         // 결과 화면 등에서 정지
    this.airTime = 0;
  }

  setSpawn(pos, yaw) {
    this.spawn.pos.copy(pos);
    this.spawn.yaw = yaw;
    _f.set(Math.sin(yaw), 0, Math.cos(yaw));     // 기체 뒤쪽
    this.pilot.copy(pos).addScaledVector(_f, 5);
    this.pilot.y = this.session.world.h(this.pilot.x, this.pilot.z) + 1.7;
  }

  respawn(pos = this.spawn.pos, yaw = this.spawn.yaw) {
    this.body.reset(pos, yaw);
    this.crashed = false;
    this.crashTimer = 0;
    this.camInit = false;
    this.model.visible = true;
  }

  cycleCamera() {
    this.camMode = CAMERAS[(CAMERAS.indexOf(this.camMode) + 1) % CAMERAS.length];
    settings.camera = this.camMode; save();
    this.camInit = false;
    return this.camMode;
  }

  setFlightMode(m) {
    if (!FLIGHT_MODES.includes(m) || m === this.flightMode) return false;
    this.flightMode = m;
    this.body.altTarget = null; this.body.holdPos = null;
    settings.flightMode = m; save();
    return true;
  }

  crash() {
    if (this.crashed) return;
    this.crashed = true;
    this.crashTimer = 0;
    this.body.disabled = true;
  }

  // ctl: 조종 입력. 고정 시간 간격으로 물리를 적분하고 모드에 통과 판정을 넘긴다
  update(dt, ctl) {
    const s = this.session, b = this.body, mode = s.mode;
    this.time += dt;
    if (this.frozen) { this._syncModel(dt); return; }
    this.acc = Math.min(this.acc + dt, 0.1);
    this.maxImpact = 0;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      _prev.copy(b.pos);
      b.step(STEP, ctl, this.flightMode, settings, s.world.col);
      if (b.lastImpact > this.maxImpact) this.maxImpact = b.lastImpact;
      mode.physicsStep(_prev, b.pos, STEP);
    }
    if (this.maxImpact > 1.2) {
      const limit = settings.crashAssist ? 11 : 6;
      s.fx.spark(b.pos, 0xffd27a, Math.min(14, 3 + this.maxImpact));
      s.game.sound.play(this.maxImpact > limit ? "crash" : "hit", clamp(this.maxImpact / 10, 0.2, 1));
      mode.onImpact(this.maxImpact, this.maxImpact > limit);
    }
    if (this.crashed) this.crashTimer += dt;
    this.airTime = b.onGround ? 0 : this.airTime + dt;
    this._syncModel(dt);

    // 연기 꼬리
    if (settings.drone.trail !== "off" && !b.onGround && b.speed > 3) {
      this.trailT -= dt;
      if (this.trailT <= 0) { this.trailT = 0.02; s.fx.puff(b.pos, settings.drone.trail, 0.22, 0.9, 0.3); }
    }
  }

  _syncModel(dt) {
    this.model.position.copy(this.body.pos);
    this.model.quaternion.copy(this.body.quat);
    this.model.userData.tick(dt, this.body.disabled ? 0 : this.body.thrust, this.time);
  }

  updateCamera(dt, cam) {
    const b = this.body, w = this.session.world;
    // 조준 방향 = 기체 자세 + 카메라 상향각
    _q.setFromAxisAngle(X, settings.camTilt * DEG);
    _q.premultiply(b.quat);
    this.aimDir.set(0, 0, -1).applyQuaternion(_q);
    this.aimPos.copy(b.pos);

    if (this.camMode === "fpv") {
      cam.position.copy(b.pos).addScaledVector(_v.set(0, 1, 0).applyQuaternion(b.quat), 0.04 * this.cls.scale);
      cam.quaternion.copy(_q);
      cam.fov = settings.fov;
      this.model.visible = false;
    } else if (this.camMode === "chase") {
      // 3인칭: 기수 방향 뒤쪽에서 수평을 유지하며 따라간다
      _f.set(-Math.sin(b.heading), 0, -Math.cos(b.heading));
      const back = 0.75 * this.cls.scale + 0.75, up = 0.3 + 0.16 * this.cls.scale;
      _v.copy(b.pos).addScaledVector(_f, -back).addScaledVector(Y, up);
      const gy = w.h(_v.x, _v.z) + 0.25;
      if (_v.y < gy) _v.y = gy;
      if (!this.camInit) this.camPos.copy(_v);
      else this.camPos.lerp(_v, 1 - Math.exp(-dt * 18));
      // 벽 뒤로 넘어가면 드론 쪽으로 당김
      _v.copy(this.camPos).sub(b.pos);
      const dist = _v.length();
      if (dist > 0.3) {
        _v.multiplyScalar(1 / dist);
        const hit = w.col.raycast(b.pos, _v, dist, 0.3, 0.12);
        if (hit > 0) this.camPos.copy(b.pos).addScaledVector(_v, Math.max(0.35, hit - 0.3));
      }
      cam.position.copy(this.camPos);
      this.camLook.copy(b.pos).addScaledVector(_f, 3).addScaledVector(Y, 0.1);
      cam.lookAt(this.camLook);
      cam.fov = clamp(settings.fov * 0.72, 50, 75);
      this.model.visible = true;
    } else {
      // 지상 시점: 조종사 위치에서 드론을 바라보며 거리에 따라 줌
      cam.position.copy(this.pilot);
      cam.lookAt(b.pos);
      const d = cam.position.distanceTo(b.pos);
      cam.fov = clamp((2 * Math.atan(5 / Math.max(d, 1))) / DEG, 9, 62);
      this.model.visible = true;
    }
    this.camInit = true;
    cam.updateProjectionMatrix();
  }

  dispose() {
    this.session.world.scene.remove(this.model);
    this.model.userData.dispose();
  }
}
