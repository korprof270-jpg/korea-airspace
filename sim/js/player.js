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
const _hit = { depth: 0, normal: new THREE.Vector3(), collider: null };
const _imp = { hard: false, n: null };          // 충돌 효과에 넘기는 정보 (재사용)
const LOW = () => -1e9;

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
    this.scrapeT = 0;                            // 긁힘 효과 간격
    this.nearArm = true; this.nearIn = false; this.nearMin = 9; this.sinceImpact = 9;   // 근접 통과(스침) 감지
    this.nearN = new THREE.Vector3();            // 가장 가까웠던 순간의 장애물 면 법선
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
    this.nearArm = false; this.nearIn = false;
    this.session.feel.emit("respawn");
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
    this.session.feel.emit("crash");
  }

  // 지면을 뺀 장애물 표면까지의 거리(R 이내). collide.js 의 nearest 는 지면도 재므로 잠시 높이 함수를 내려 둔다
  _nearObstacle(R) {
    const col = this.session.world.col, hf = col.heightFn;
    let d = R;
    col.heightFn = LOW;
    try {
      d = col.nearest(this.body.pos, R);
      if (d < R && col.querySphere(this.body.pos, d + 0.3, _hit)) _v.copy(_hit.normal); else _v.set(0, 0, 0);
    } finally { col.heightFn = hf; }
    return d;
  }

  // 긁힘·근접 통과 같은 접촉 효과 (비행에는 영향 없음)
  _contactFx(dt) {
    const s = this.session, b = this.body, sp = b.speed;
    this.sinceImpact += dt;
    // 표면에 닿은 채 미끄러짐
    if (b.touching && this.maxImpact <= 1.2 && !this.crashed && sp > 3.5) {
      if ((this.scrapeT -= dt) <= 0) {
        this.scrapeT = 0.11;
        s.feel.emit("scrape", clamp(sp / 18, 0, 1));
        s.fx.spark(b.pos, 0xffc070, 2);
      }
    } else this.scrapeT = 0;
    // 빠르게 날며 장애물을 아슬아슬하게 스치고 지나가면 바람 가르는 소리
    if (b.onGround || this.crashed || sp < 13) { this.nearIn = false; return; }
    const d = this._nearObstacle(3.2);
    if (!this.nearArm) { if (d > 2.8) { this.nearArm = true; this.nearMin = 9; } return; }
    if (d < 1.7) { this.nearIn = true; if (d < this.nearMin) { this.nearMin = d; this.nearN.copy(_v); } }
    if (this.nearIn && d > this.nearMin + 0.8) {
      this.nearArm = false; this.nearIn = false;
      if (this.sinceImpact > 0.6) {
        // 장애물이 있던 쪽(법선 반대)으로 소리를 보낸다
        const pan = -this.nearN.dot(_v.set(1, 0, 0).applyQuaternion(s.camera.quaternion));
        s.feel.emit("nearmiss", clamp((1.9 - this.nearMin) / 1.4, 0.2, 1) * clamp(sp / 30, 0.45, 1), clamp(pan, -1, 1) * 0.8);
      }
    }
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
      const limit = settings.crashAssist ? 11 : 6, hard = this.maxImpact > limit;
      s.fx.spark(b.pos, 0xffd27a, Math.min(14, 3 + this.maxImpact));
      if (this.maxImpact > 6) s.fx.ring(b.pos, 0xffe2a8, 0.5 + this.maxImpact * 0.06, 0.25);
      s.game.sound.play(hard ? "crash" : "hit", clamp(this.maxImpact / 10, 0.2, 1));
      _imp.hard = hard; _imp.n = b.impactN;
      s.feel.emit("impact", this.maxImpact, _imp);
      this.sinceImpact = 0;
      mode.onImpact(this.maxImpact, hard);
    }
    this._contactFx(dt);
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
