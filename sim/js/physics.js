// 쿼드콥터 비행 역학 + 비행 컨트롤러(ACRO / HORIZON / ANGLE / ALT HOLD / LOITER)
// 좌표계: Y 위, 기체 전방 = -Z, 오른쪽 = +X. 각속도는 기체 좌표계(rad/s).
import * as THREE from "../vendor/three.module.min.js";
import { clamp } from "./config.js";

const G = 9.81;
const RHO = 1.2;
const DEG = Math.PI / 180;

const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _vb = new THREE.Vector3();
const _f = new THREE.Vector3();
const _a = new THREE.Vector3();
const _t = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _hit = { depth: 0, normal: new THREE.Vector3(), collider: null };
const Y = new THREE.Vector3(0, 1, 0);

// Betaflight "Actual" 레이트 곡선: 스틱(-1..1) → 각속도(°/s)
export function rateCurve(s, r) {
  const a = Math.abs(s);
  const expof = a * (Math.pow(s, 5) * r.expo + s * (1 - r.expo));
  return s * r.center + Math.max(0, r.max - r.center) * expof;
}

export class DroneBody {
  constructor(spec) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.omega = new THREE.Vector3(); // 기체 좌표계 각속도
    this.thrust = 0;                  // 실제 추력 비율 0..1
    this.throttleOut = 0;             // HUD 표시용 스로틀 명령
    this.setSpec(spec);
    this.extraMass = 0;               // 화물 무게
    this.boost = 1;                   // 부스트 아이템 배율
    this.disabled = false;            // 추락/EMP 중 조종 불가
    this.onGround = false;
    this.flipped = false;
    this.altTarget = null;
    this.holdPos = null;
    this.lastImpact = 0;
    this.heading = 0;
    this.accel = new THREE.Vector3();
  }

  setSpec(spec) {
    this.spec = spec;
    this.radius = spec.radius;
  }

  reset(pos, yaw = 0) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.quat.setFromAxisAngle(Y, yaw);
    this.omega.set(0, 0, 0);
    this.thrust = 0;
    this.disabled = false;
    this.onGround = false;
    this.flipped = false;
    this.altTarget = null;
    this.holdPos = null;
    this.heading = yaw;
  }

  get speed() { return this.vel.length(); }

  // 수평면에 투영한 기수 방향 (수직에 가까우면 기체 윗면 방향으로 대체)
  _headingBasis() {
    _fwd.set(0, 0, -1).applyQuaternion(this.quat);
    _up.set(0, 1, 0).applyQuaternion(this.quat);
    if (Math.abs(_fwd.y) > 0.92) _fwd.copy(_up).multiplyScalar(_fwd.y > 0 ? -1 : 1);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
    _fwd.normalize();
    _right.set(-_fwd.z, 0, _fwd.x);
    this.heading = Math.atan2(-_fwd.x, -_fwd.z);
  }

  // 원하는 "윗면 방향" upDes 로 기체를 기울이는 롤/피치 각속도 명령을 out 에 기록
  _levelRates(upDes, gain, maxRate, out) {
    _up.set(0, 1, 0).applyQuaternion(this.quat);
    _a.crossVectors(_up, upDes);
    const s = _a.length();
    const c = _up.dot(upDes);
    let ang = Math.atan2(s, c);
    if (s < 1e-5) {
      if (c > 0) { out.x = 0; out.z = 0; return; }
      _a.set(0, 0, -1).applyQuaternion(this.quat); // 완전히 뒤집힘: 롤 축으로 복귀
      ang = Math.PI;
    } else _a.multiplyScalar(1 / s);
    _qi.copy(this.quat).invert();
    _a.applyQuaternion(_qi);
    out.x = clamp(_a.x * ang * gain, -maxRate, maxRate);
    out.z = clamp(_a.z * ang * gain, -maxRate, maxRate);
  }

  // ctl: {throttle, yaw, pitch, roll} 각 -1..1 (pitch + = 전진, roll + = 오른쪽, yaw + = 오른쪽)
  step(dt, ctl, mode, cfg, world) {
    const sp = this.spec;
    const mass = sp.mass + this.extraMass;
    const maxThrust = sp.twr * sp.mass * G * this.boost;
    const hover = clamp((mass * G) / maxThrust, 0.05, 0.95);
    const rates = cfg.rates;
    const cmd = _cmd;
    let thr = 0;

    this._headingBasis();
    const hf = _hf.copy(_fwd), hr = _hr.copy(_right);

    if (this.disabled) {
      cmd.set(this.omega.x, this.omega.y, this.omega.z);
      thr = 0;
      this.altTarget = null; this.holdPos = null;
    } else {
      const yawRate = -rateCurve(ctl.yaw, rates.yaw) * DEG;
      const acroX = -rateCurve(ctl.pitch, rates.rp) * DEG;
      const acroZ = -rateCurve(ctl.roll, rates.rp) * DEG;
      const maxTilt = cfg.angleLimit * DEG;
      const t = ctl.throttle;
      // 수동 스로틀: 중앙=호버 곡선 또는 선형(실제 조종기)
      const manualThr = cfg.hoverThrottle
        ? (t >= 0 ? hover + t * (1 - hover) : hover * (1 + t))
        : (t + 1) / 2;

      if (mode === "ACRO") {
        cmd.set(acroX, yawRate, acroZ);
        thr = manualThr;
        this.altTarget = null; this.holdPos = null;
      } else if (mode === "ANGLE" || mode === "HORIZON" || mode === "ALTHOLD") {
        // 목표 기울기: 전진(pitch)·우측(roll) 스틱에 비례
        let tx = ctl.roll * maxTilt, tz = ctl.pitch * maxTilt;
        const mag = Math.hypot(tx, tz);
        if (mag > maxTilt) { tx *= maxTilt / mag; tz *= maxTilt / mag; }
        const th = Math.min(mag, maxTilt);
        _t.set(0, 0, 0);
        if (th > 1e-4) _t.addScaledVector(hf, tz / mag).addScaledVector(hr, tx / mag);
        _upDes.copy(Y).multiplyScalar(Math.cos(th)).addScaledVector(_t, Math.sin(th));
        this._levelRates(_upDes, 9, 12, cmd);
        cmd.y = yawRate;
        if (mode === "HORIZON") {
          // 스틱을 크게 밀수록 수평 복원력이 줄고 아크로 레이트가 섞인다
          const d = Math.max(Math.abs(ctl.roll), Math.abs(ctl.pitch));
          const k = clamp((d - 0.55) / 0.35, 0, 1);
          cmd.x = cmd.x * (1 - k) + acroX * k;
          cmd.z = cmd.z * (1 - k) + acroZ * k;
        }
        if (mode === "ALTHOLD") thr = this._altHold(dt, t, mass, maxThrust);
        else {
          thr = manualThr; this.altTarget = null;
          // 호버 보조가 켜져 있으면 기울인 만큼 추력을 보태 고도가 급히 떨어지지 않게 한다
          if (cfg.hoverThrottle) { _up.set(0, 1, 0).applyQuaternion(this.quat); if (_up.y > 0.3) thr = Math.min(1, thr / Math.max(_up.y, 0.5)); }
        }
        this.holdPos = null;
      } else { // LOITER (GPS): 스틱 = 수평 속도, 놓으면 위치 고정
        const vmax = cfg.loiterSpeed;
        const stick = Math.hypot(ctl.pitch, ctl.roll);
        _t.set(0, 0, 0);
        if (stick > 0.03) {
          _t.addScaledVector(hf, ctl.pitch * vmax).addScaledVector(hr, ctl.roll * vmax);
          this.holdPos = null;
        } else {
          const hs = Math.hypot(this.vel.x, this.vel.z);
          if (!this.holdPos && hs < 1.5) this.holdPos = this.pos.clone();
          if (this.holdPos) {
            _t.set(this.holdPos.x - this.pos.x, 0, this.holdPos.z - this.pos.z).multiplyScalar(1.6);
            if (_t.length() > 5) _t.setLength(5);
          }
        }
        // 속도 오차 → 수평 가속 → 기울기
        _a.set((_t.x - this.vel.x) * 2.6, 0, (_t.z - this.vel.z) * 2.6);
        const amax = G * Math.tan(Math.min(maxTilt, 38 * DEG));
        if (_a.length() > amax) _a.setLength(amax);
        _upDes.set(_a.x, G, _a.z).normalize();
        this._levelRates(_upDes, 9, 10, cmd);
        cmd.y = yawRate;
        thr = this._altHold(dt, t, mass, maxThrust);
      }
    }
    this.throttleOut = thr;

    // 각속도 응답 (PID + 모터 지연을 1차 지연으로 근사)
    const kr = 1 - Math.exp(-dt / sp.rateTau);
    if (!this.disabled) {
      this.omega.x += (cmd.x - this.omega.x) * kr;
      this.omega.y += (cmd.y - this.omega.y) * kr;
      this.omega.z += (cmd.z - this.omega.z) * kr;
    } else this.omega.multiplyScalar(Math.exp(-dt * 0.6));

    // 자세 적분
    const wl = this.omega.length();
    if (wl > 1e-6) {
      _a.copy(this.omega).multiplyScalar(1 / wl);
      _q.setFromAxisAngle(_a, wl * dt);
      this.quat.multiply(_q).normalize();
    }

    // 추력: 모터 지연 + 유입 속도에 따른 추력 감소(프로펠러 피치 속도)
    this.thrust += (thr - this.thrust) * (1 - Math.exp(-dt / sp.motorTau));
    _up.set(0, 1, 0).applyQuaternion(this.quat);
    const inflow = this.vel.dot(_up);
    const tf = clamp(1 - inflow / (sp.pitchSpeed * this.boost), 0, 1.15);
    _f.copy(_up).multiplyScalar(this.thrust * maxThrust * tf);

    // 공기 저항: 기체 좌표계에서 축별 2차 항력
    _qi.copy(this.quat).invert();
    _vb.copy(this.vel).applyQuaternion(_qi);
    const kF = 0.5 * RHO * sp.cdaF, kT = 0.5 * RHO * sp.cdaT;
    const sv = _vb.length();
    _vb.set(-kF * _vb.x * sv, -kT * _vb.y * sv, -kF * _vb.z * sv).applyQuaternion(this.quat);
    _f.add(_vb);
    _f.y -= mass * G;

    this.accel.copy(_f).multiplyScalar(1 / mass);
    this.vel.addScaledVector(this.accel, dt);
    this.pos.addScaledVector(this.vel, dt);

    // 충돌
    this.onGround = false;
    this.lastImpact = 0;
    if (world && world.querySphere(this.pos, this.radius, _hit)) {
      const n = _hit.normal;
      this.pos.addScaledVector(n, _hit.depth);
      const vn = this.vel.dot(n);
      if (vn < 0) {
        this.lastImpact = -vn;
        const e = -vn > 2.5 ? 0.35 : 0;
        this.vel.addScaledVector(n, -(1 + e) * vn);
        // 접선 마찰
        const fr = n.y > 0.6 ? Math.exp(-dt * 7) : Math.exp(-dt * 2);
        _t.copy(this.vel).addScaledVector(n, -this.vel.dot(n));
        this.vel.addScaledVector(_t, fr - 1);
        if (-vn > 3) { // 세게 부딪히면 회전이 흐트러짐
          this.omega.x += (Math.random() - 0.5) * vn * 1.2;
          this.omega.z += (Math.random() - 0.5) * vn * 1.2;
        }
      }
      if (n.y > 0.6) {
        this.onGround = true;
        _up.set(0, 1, 0).applyQuaternion(this.quat);
        this.flipped = _up.dot(n) < 0.15;
        // 착지 상태에서는 바닥 법선에 맞춰 기체가 눕는다
        if (!this.flipped && (this.thrust < hover * 0.9 || this.disabled)) {
          this._levelRates(n, 14, 10, _lv);
          this.omega.x += (_lv.x - this.omega.x) * 0.25;
          this.omega.z += (_lv.z - this.omega.z) * 0.25;
          this.omega.y *= 0.8;
        }
      }
    }
  }

  // 고도 유지: 스로틀 중앙(±8%)이면 고도 고정, 벗어나면 상승/하강 속도 명령
  _altHold(dt, t, mass, maxThrust) {
    let vzDes;
    if (Math.abs(t) < 0.08) {
      if (this.altTarget === null) this.altTarget = this.pos.y + this.vel.y * 0.25;
      vzDes = clamp((this.altTarget - this.pos.y) * 2.2, -4, 4);
    } else {
      this.altTarget = null;
      const s = (Math.abs(t) - 0.08) / 0.92 * Math.sign(t);
      vzDes = s * (s > 0 ? 9 : 6);
    }
    const az = clamp((vzDes - this.vel.y) * 4.5, -G * 0.85, G * 2.2);
    _up.set(0, 1, 0).applyQuaternion(this.quat);
    const tilt = Math.max(_up.y, 0.35);
    return clamp((mass * (G + az)) / (maxThrust * tilt), 0, 1);
  }
}

const _cmd = new THREE.Vector3();
const _lv = new THREE.Vector3();
const _hf = new THREE.Vector3();
const _hr = new THREE.Vector3();
const _upDes = new THREE.Vector3();
