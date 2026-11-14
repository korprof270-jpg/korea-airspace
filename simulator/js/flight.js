// 드론 정비 시뮬레이터 — 송신기, 자세 추정, 믹서, 비행 물리, 모터 테스트
(function () {
  const SIM = window.SIM, T = THREE;
  // 2종급(약 12kg) 쿼드콥터 근사값
  const DEG = Math.PI / 180, G = 9.81, MASS = 12, K = 2.2, ARM = 0.159 * K, TMAX = 73.6, KQ = 0.05, CAP = 16000, CELLS = 6;
  const INERTIA = new T.Vector3(0.58, 1.06, 0.58);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------- 송신기 (모드 2) ----------
  const tx = (SIM.tx = { on: true, lx: 0, ly: -1, rx: 0, ry: 0, sw: 0, keys: {} });
  // 수신기가 FC로 보내는 원시 PWM
  SIM.rcRaw = function () {
    const c = SIM.TX, pwm = [0, 1500, 1500, 900, 1500, 1500, 1500, 1500, 1500];
    if (!SIM.rxOk()) return { present: false, pwm };
    if (tx.on) {
      pwm[1] = Math.round(c.c[1] + tx.rx * c.amp[1]);
      pwm[2] = Math.round(c.c[2] - tx.ry * c.amp[2]); // 스틱을 앞으로 밀면 PWM이 내려간다
      pwm[3] = Math.round(c.thrMin + ((tx.ly + 1) / 2) * (c.thrMax - c.thrMin));
      pwm[4] = Math.round(c.c[4] + tx.lx * c.amp[4]);
      pwm[5] = c.sw[tx.sw];
    } // 송신기가 꺼지면 수신기 페일세이프: 스로틀 900 출력
    return { present: true, pwm };
  };
  SIM.rcIn = function () {
    const raw = SIM.rcRaw(), p = SIM.state.params, pwm = raw.pwm;
    const axis = (ch) => {
      const v = pwm[ch], mn = p["RC" + ch + "_MIN"], mx = p["RC" + ch + "_MAX"], tr = p["RC" + ch + "_TRIM"];
      let o = v >= tr ? (v - tr) / Math.max(1, mx - tr) : (v - tr) / Math.max(1, tr - mn);
      o = clamp(o, -1, 1);
      if (Math.abs(o) < 0.04) o = 0;
      return p["RC" + ch + "_REVERSED"] ? -o : o;
    };
    const tc = p.RCMAP_THROTTLE;
    let thr = clamp((pwm[tc] - p["RC" + tc + "_MIN"]) / Math.max(1, p["RC" + tc + "_MAX"] - p["RC" + tc + "_MIN"]), 0, 1);
    if (p["RC" + tc + "_REVERSED"]) thr = 1 - thr;
    const lost = !raw.present || pwm[3] < p.FS_THR_VALUE;
    const out = { present: raw.present, pwm, lost, roll: axis(p.RCMAP_ROLL), pitch: axis(p.RCMAP_PITCH), yaw: axis(p.RCMAP_YAW), thr, modePwm: pwm[p.FLTMODE_CH] || 1500 };
    if (lost) { out.roll = out.pitch = out.yaw = 0; out.thr = 0; }
    return out;
  };
  SIM.modeSlot = (pwm) => (pwm <= 1230 ? 1 : pwm <= 1360 ? 2 : pwm <= 1490 ? 3 : pwm <= 1620 ? 4 : pwm <= 1749 ? 5 : 6);

  // ---------- 자세 추정 (FC가 인식하는 값) ----------
  const _qi = new T.Quaternion(), _up = new T.Vector3(), _f = new T.Vector3();
  SIM.estimate = function (q, w) {
    const st = SIM.state, e = SIM.mountErr();
    _up.set(0, 1, 0).applyQuaternion(_qi.copy(q).invert());
    const fx = Math.sin(e), fz = -Math.cos(e), rx = Math.cos(e), rz = Math.sin(e); // FC가 앞/오른쪽이라고 믿는 방향
    let roll = Math.atan2(-(_up.x * rx + _up.z * rz), _up.y), pitch = Math.atan2(_up.x * fx + _up.z * fz, _up.y);
    if (!st.cal.accel) roll += 4 * DEG; // 미교정 가속도계: 수평 기준이 틀어짐
    _f.set(0, 0, -1).applyQuaternion(q);
    let hdg = Math.atan2(_f.x, -_f.z) + SIM.headingErr();
    if (!st.cal.compass) hdg += 25 * DEG;
    const o = { roll, pitch, hdg: wrap(hdg), trueRoll: Math.atan2(-_up.x, _up.y), truePitch: Math.atan2(-_up.z, _up.y), p: 0, q: 0, r: 0 };
    if (w) { o.p = w.x * fx + w.z * fz; o.q = w.x * rx + w.z * rz; o.r = -w.y; }
    return o;
  };

  // ---------- 배터리 ----------
  function battVolt(used, cap, amps) {
    const dod = clamp(used / cap, 0, 1.05);
    const cell = 4.2 - 0.75 * dod - (dod > 0.82 ? (dod - 0.82) * 5 : 0) - amps * 0.0007;
    return CELLS * cell;
  }

  // ---------- 비행 상태 ----------
  const F = (SIM.flight = {
    active: false, armed: false, crashed: false, mode: 0, drain: 1,
    pos: new T.Vector3(), vel: new T.Vector3(), q: new T.Quaternion(), w: new T.Vector3(),
    used: 0, volt: 25.2, amps: 0, contact: 0, cap: CAP, lost: {},
  });
  const ESC_GAIN = { FR: 1, RR: 0.9, RL: 1, FL: 0.84 };
  const MOTOR_VAR = { FR: 1, RR: 0.975, RL: 1.015, FL: 0.985 }; // 모터·프로펠러 개체 차이
  const DELAY = 3, dbuf = [];
  const CONTACTS = [[0.12, -0.09, 0.12], [-0.12, -0.09, 0.12], [0.12, -0.09, -0.12], [-0.12, -0.09, -0.12], [0.25, 0.05, 0.25], [-0.25, 0.05, 0.25], [0.25, 0.05, -0.25], [-0.25, 0.05, -0.25], [0, 0.11, 0.06], [0, -0.05, 0]].map((a) => new T.Vector3(a[0] * K, a[1] * K, a[2] * K));

  function resetCtl() { F.iR = F.iP = F.iY = F.thrI = 0; F.dp = F.dq = 0; F.lastP = F.lastQ = 0; F.altT = F.pos.y; F.posT = F.pos.clone(); F.rtlPhase = 0; F.landT = 0; }
  F.start = function () {
    F.active = true; F.armed = false; F.crashed = false; F.drain = 1;
    F.pos.set(0, 0.092 * K, 0); F.lost = {}; F.looseT = {}; F.vel.set(0, 0, 0); F.q.identity(); F.w.set(0, 0, 0);
    F.used = 0; F.fsRadio = false; F.fsBatt = false; F.lowT = 0; F.gest = 0; F.lastSlot = 0; F.idleT = 0; F.tiltT = 0; F.hdgT = null;
    F.home = new T.Vector3(0, 0.092 * K, 0); dbuf.length = 0; F.gust = new T.Vector3();
    for (const id of SIM.POS_IDS) SIM.motorU[id] = 0;
    resetCtl();
    tx.ly = -1; tx.lx = tx.rx = tx.ry = 0;
    SIM.scene.setEnv("field");
    SIM.log("시험장 이동 완료. 스로틀을 내리고 시동을 거세요.");
  };
  F.stop = function () {
    F.active = false; F.armed = false;
    for (const id of SIM.POS_IDS) SIM.motorU[id] = 0;
    SIM.scene.setEnv("bench");
  };
  F.reset = function () { const d = F.drain; F.start(); F.drain = d; };

  F.arm = function () {
    if (F.armed) return true;
    const rc = SIM.rcIn(), fails = SIM.prearm(F.mode);
    if (F.crashed) fails.push("기체가 전복된 상태입니다. '기체 리셋'을 누르세요");
    if (SIM.state.params.ARMING_CHECK && rc.lost && !fails.length) fails.push("PreArm: Radio failsafe on (송신기 신호 없음)");
    if (F.mode === 6 || F.mode === 9) fails.push("Arm: Mode not armable (" + SIM.MODES[F.mode] + ")");
    if (rc.thr > 0.1) fails.push("Arm: Throttle too high (스로틀을 맨 아래로)");
    if (fails.length) { fails.forEach((f) => SIM.log(f, "bad")); return false; }
    F.armed = true; F.home.copy(F.pos); resetCtl(); F.idleT = 0;
    SIM.log("Armed · 시동 걸림", "ok");
    return true;
  };
  F.disarm = function (why) {
    if (!F.armed) return;
    F.armed = false;
    SIM.log("Disarmed" + (why ? " · " + why : ""), "info");
  };
  function setMode(m, why) {
    if (m === F.mode) return true;
    if ((m === 5 || m === 6) && !SIM.gpsOk()) { SIM.log("Flight mode change failed: " + SIM.MODES[m] + " requires position (GPS 없음)", "bad"); return false; }
    F.mode = m; F.altT = F.pos.y; F.posT = F.pos.clone(); F.rtlPhase = 0; F.landT = 0; F.thrI = clamp(F.thrI || 0, 0, 0.1);
    SIM.log("Mode " + SIM.MODES[m] + (why ? " (" + why + ")" : ""));
    return true;
  }

  const _a = new T.Vector3(), _b = new T.Vector3(), _fw = new T.Vector3(), _tq = new T.Vector3(), _force = new T.Vector3(), _dq = new T.Quaternion();

  function step(dt) {
    const p = SIM.state.params, rc = SIM.rcIn(), pw = SIM.power();
    const est = SIM.estimate(F.q, F.w), upY = _up.set(0, 1, 0).applyQuaternion(F.q).y;
    const landed = F.contact > 0;

    // 모드 스위치
    const slot = SIM.modeSlot(rc.modePwm);
    if (slot !== F.lastSlot && !rc.lost) { F.lastSlot = slot; if (!F.fsRadio && !F.fsBatt) setMode(p["FLTMODE" + slot], "모드 스위치"); }

    // 라디오 페일세이프
    if (rc.lost && p.FS_THR_ENABLE && !F.fsRadio) {
      F.fsRadio = true;
      if (F.armed) {
        SIM.log("Radio Failsafe · 송신기 신호 끊김", "bad");
        if (landed && F.idle) F.disarm("지상에서 신호 끊김");
        else if (!setMode(p.FS_THR_ENABLE === 1 ? 6 : 9, "페일세이프")) setMode(9, "페일세이프");
      }
    } else if (rc.lost && !p.FS_THR_ENABLE && !F.rcWarn) { F.rcWarn = true; if (F.armed) SIM.log("송신기 신호 끊김 — 페일세이프가 꺼져 있어 스로틀이 0으로 떨어집니다", "bad"); }
    if (!rc.lost) { if (F.fsRadio) { F.fsRadio = false; SIM.log("Radio Failsafe Cleared · 모드 스위치를 움직이면 조종권 회복"); F.lastSlot = 0; } F.rcWarn = false; }

    // 배터리
    const cap = CAP;
    F.amps = 1; for (const id of SIM.POS_IDS) F.amps += Math.pow(SIM.motorU[id], 1.5) * 60;
    F.used += ((F.amps * dt) / 3.6) * F.drain;
    F.volt = battVolt(F.used, cap, F.amps);
    const battK = clamp((F.volt - 17.7) / 1.5, 0, 1); // ESC 저전압 컷오프
    if (pw.battSense && p.BATT_LOW_VOLT > 0 && F.volt < p.BATT_LOW_VOLT) {
      F.lowT += dt;
      if (F.lowT > 1.5 && !F.fsBatt) {
        F.fsBatt = true; SIM.log("Battery Failsafe · " + F.volt.toFixed(1) + "V", "bad");
        if (F.armed && p.BATT_FS_LOW_ACT) { if (!setMode(p.BATT_FS_LOW_ACT === 2 ? 6 : 9, "배터리 페일세이프")) setMode(9, "배터리 페일세이프"); }
      }
    } else F.lowT = 0;

    // 스틱 시동 (스로틀 최하 + 요 오른쪽) / 시동 끄기 (요 왼쪽)
    if (!rc.lost && rc.thr < 0.05 && Math.abs(rc.yaw) > 0.9 && (landed || !F.armed)) {
      F.gest += dt * Math.sign(rc.yaw);
      if (F.gest > 1.2 && !F.armed) { F.arm(); F.gest = 0; }
      if (F.gest < -1.2 && F.armed) { F.disarm("스틱 조작"); F.gest = 0; }
    } else F.gest = 0;

    // ----- 제어기 -----
    const out = { 1: 0, 2: 0, 3: 0, 4: 0 };
    F.idle = true;
    if (F.armed) {
      const amax = (p.ANGLE_MAX / 100) * DEG, m = F.mode;
      let rollDes = 0, pitchDes = 0, thr = 0, idle = false;
      let yawRate = rc.yaw * 2.2;
      if (m === 0) { rollDes = rc.roll * amax; pitchDes = rc.pitch * amax; thr = rc.thr; idle = rc.thr < 0.02; }
      else {
        let climb = 0, hold = false, vf = 0, vr = 0;
        if (m === 2 || m === 5) {
          const s = (rc.thr - 0.5) * 2;
          climb = Math.abs(s) < 0.2 ? 0 : ((s - Math.sign(s) * 0.2) / 0.8) * (p.PILOT_SPEED_UP / 100);
          idle = landed && climb <= 0;
          if (m === 2) { rollDes = rc.roll * amax; pitchDes = rc.pitch * amax; }
          else { hold = true; vf = -rc.pitch * 5; vr = rc.roll * 5; }
        } else if (m === 6) {
          hold = true; yawRate = 0;
          const rtlAlt = F.home.y + p.RTL_ALT / 100;
          if (F.rtlPhase === 0) { F.rtlTop = Math.max(F.pos.y, rtlAlt); F.rtlPhase = 1; }
          if (F.rtlPhase === 1) { climb = clamp((F.rtlTop - F.pos.y) * 1.5, -1, 2.5); if (F.rtlTop - F.pos.y < 0.4) F.rtlPhase = 2; }
          if (F.rtlPhase === 2) {
            _a.set(F.home.x - F.posT.x, 0, F.home.z - F.posT.z);
            const d = _a.length();
            if (d > 0.05) F.posT.addScaledVector(_a, Math.min(1, (4 * dt) / d));
            climb = clamp((F.rtlTop - F.pos.y) * 1.5, -1, 1);
            if (Math.hypot(F.home.x - F.pos.x, F.home.z - F.pos.z) < 0.6 && d <= 0.05) { F.rtlPhase = 3; SIM.log("RTL: 홈 도착, 착륙 시작"); }
          }
          if (F.rtlPhase === 3) climb = F.pos.y - F.home.y > 3 ? -1.5 : -0.5;
        } else { // Land
          hold = SIM.gpsOk(); yawRate = 0;
          climb = F.pos.y > 3 ? -1.5 : -0.5;
        }
        if (hold) { // 위치 제어 (FC가 믿는 방위 기준)
          const h = est.hdg, fwx = Math.sin(h), fwz = -Math.cos(h), rwx = Math.cos(h), rwz = Math.sin(h);
          let vx = fwx * vf + rwx * vr, vz = fwz * vf + rwz * vr;
          if (vf || vr) { F.posT.copy(F.pos); F.posT.x += F.vel.x * 0.6; F.posT.z += F.vel.z * 0.6; }
          else { vx += clamp((F.posT.x - F.pos.x) * 1.0, -4, 4); vz += clamp((F.posT.z - F.pos.z) * 1.0, -4, 4); }
          let ax = (vx - F.vel.x) * 2.2, az = (vz - F.vel.z) * 2.2;
          const amx = G * Math.tan(Math.min(amax, 35 * DEG)), al = Math.hypot(ax, az);
          if (al > amx) { ax *= amx / al; az *= amx / al; }
          pitchDes = -Math.atan((ax * fwx + az * fwz) / G); rollDes = Math.atan((ax * rwx + az * rwz) / G);
        }
        if ((m === 6 && F.rtlPhase === 3) || m === 9) {
          if (landed) { F.landT += dt; if (F.landT > 0.8) { F.disarm("착륙 완료"); } } else F.landT = 0;
        }
        F.altT = clamp(F.altT + climb * dt, F.pos.y - 1, F.pos.y + 1);
        const vdes = climb + 1.5 * (F.altT - F.pos.y), err = vdes - F.vel.y;
        F.thrI = clamp(F.thrI + err * 0.15 * dt, -0.25, 0.4);
        thr = clamp((0.38 + 0.22 * err + F.thrI) / Math.max(0.6, upY), 0, 1);
        if (idle) { F.altT = F.pos.y; F.posT.copy(F.pos); }
      }
      F.idle = idle;
      if (idle) {
        F.iR = F.iP = F.iY = 0; F.thrI = 0; F.hdgT = null;
        for (let n = 1; n <= 4; n++) out[n] = p.MOT_SPIN_ARM;
        if (landed) { F.idleT += dt; if (F.idleT > 12) F.disarm("자동 시동 꺼짐 (대기 12초)"); }
      } else {
        F.idleT = 0;
        if (Math.abs(yawRate) < 0.01 && !landed) { if (F.hdgT === null) F.hdgT = est.hdg; yawRate = clamp(wrap(F.hdgT - est.hdg) * 2.5, -1.5, 1.5); } else F.hdgT = null;
        const pDes = clamp(p.ATC_ANG_RLL_P * (rollDes - est.roll), -4, 4), qDes = clamp(p.ATC_ANG_PIT_P * (pitchDes - est.pitch), -4, 4);
        const a = dt / (dt + 0.008);
        F.dp += a * ((est.p - F.lastP) / dt - F.dp); F.dq += a * ((est.q - F.lastQ) / dt - F.dq); F.lastP = est.p; F.lastQ = est.q;
        const eR = pDes - est.p, eP = qDes - est.q, eY = yawRate - est.r;
        F.iR = clamp(F.iR + eR * p.ATC_RAT_RLL_I * dt, -0.2, 0.2); F.iP = clamp(F.iP + eP * p.ATC_RAT_PIT_I * dt, -0.2, 0.2); F.iY = clamp(F.iY + eY * p.ATC_RAT_YAW_I * dt, -0.2, 0.2);
        const R = clamp(p.ATC_RAT_RLL_P * eR + F.iR - p.ATC_RAT_RLL_D * F.dp, -1, 1);
        const P = clamp(p.ATC_RAT_PIT_P * eP + F.iP - p.ATC_RAT_PIT_D * F.dq, -1, 1);
        const Y = clamp(p.ATC_RAT_YAW_P * eY + F.iY, -0.5, 0.5);
        const fr = SIM.frame().motors;
        for (let n = 1; n <= 4; n++) {
          const mm = fr[n];
          out[n] = clamp(thr - mm.x * 0.5 * R - mm.z * 0.5 * P + (mm.spin === "ccw" ? 0.5 : -0.5) * Y, p.MOT_SPIN_MIN, 1);
        }
      }
    }

    // 제어 주기·ESC 응답 지연
    dbuf.push(out); const dout = dbuf.length > DELAY ? dbuf.shift() : dbuf[0];

    // ----- 출력 → 실제 모터 -----
    _force.set(0, 0, 0); _tq.set(0, 0, 0);
    const escCal = SIM.state.cal.esc;
    for (const id of SIM.POS_IDS) {
      const ph = SIM.motorPhysical(id), num = SIM.motorNumForPos(id), ps = SIM.POS[id];
      let cmd = ph.canSpin && num && pw.fcBatt && SIM.safetyOff() ? dout[num] : 0;
      if (!escCal) cmd *= ESC_GAIN[id];
      let u = SIM.motorU[id]; u += (cmd * battK - u) * Math.min(1, dt / 0.06); SIM.motorU[id] = u;
      const thrust = TMAX * u * ph.thrust * MOTOR_VAR[id], s = ph.dir === "ccw" ? 1 : -1;
      _force.y += thrust;
      _tq.x += -ps.z * ARM * thrust; _tq.z += ps.x * ARM * thrust;
      _tq.y += -s * KQ * TMAX * u * (ph.prop ? 1 : 0.05);
      if (ph.loose && ph.prop && u > 0.2) { // 축 나사 방향이 반대인 모터: 너트가 서서히 풀린다
        F.looseT[id] = (F.looseT[id] || 0) + u * dt;
        if (F.looseT[id] > 3) { F.lost[id] = true; SIM.log(SIM.POS[id].name + " 프로펠러가 풀려 이탈했습니다", "bad"); }
      }
    }
    _force.applyQuaternion(F.q); // 월드 좌표 힘
    _force.y -= MASS * G;
    _force.addScaledVector(F.vel, -2.2);
    _tq.addScaledVector(F.w, -0.06);
    if (!F.contact) { // 약한 난류
      F.gust.x += ((Math.random() - 0.5) * 1.2 - F.gust.x) * dt * 4; F.gust.y += ((Math.random() - 0.5) * 0.4 - F.gust.y) * dt * 4; F.gust.z += ((Math.random() - 0.5) * 1.2 - F.gust.z) * dt * 4;
      _tq.add(F.gust);
    }

    // ----- 지면 접촉 -----
    _qi.copy(F.q).invert();
    let contact = 0, topHit = false;
    for (let i = 0; i < CONTACTS.length; i++) {
      _a.copy(CONTACTS[i]).applyQuaternion(F.q); // 월드 기준 팔
      const y = F.pos.y + _a.y;
      if (y >= 0) continue;
      contact++; if (i >= 4 && i < 9) topHit = true;
      _b.copy(F.w).applyQuaternion(F.q).cross(_a).add(F.vel); // 접촉점 속도
      const fn = Math.max(0, -y * 26000 - _b.y * 340);
      _fw.set(-_b.x * 90, fn, -_b.z * 90);
      const fl = Math.hypot(_fw.x, _fw.z), fmax = fn * 0.9 + 5;
      if (fl > fmax) { _fw.x *= fmax / fl; _fw.z *= fmax / fl; }
      _force.add(_fw);
      _tq.add(_a.cross(_fw).applyQuaternion(_qi));
    }
    F.contact = contact;
    if (F.armed && contact && (upY < 0.35 || (topHit && upY < 0.8))) { F.crashed = true; F.disarm("추락·전복 감지 (Crash)"); SIM.log("기체가 뒤집혔습니다. 조립·배선·설정을 다시 확인하세요.", "bad"); }
    if (F.armed && !contact) { // 제어 불능으로 계속 기울어진 경우
      if (upY < 0.2) { F.tiltT += dt; if (F.tiltT > 1.5) { F.crashed = true; F.disarm("자세 제어 상실 (Crash check)"); } } else F.tiltT = 0;
    }

    // ----- 적분 -----
    F.vel.addScaledVector(_force, dt / MASS);
    F.pos.addScaledVector(F.vel, dt);
    const w = F.w, I = INERTIA;
    const wx = w.x + ((_tq.x - (I.z - I.y) * w.y * w.z) / I.x) * dt;
    const wy = w.y + ((_tq.y - (I.x - I.z) * w.z * w.x) / I.y) * dt;
    const wz = w.z + ((_tq.z - (I.y - I.x) * w.x * w.y) / I.z) * dt;
    w.set(clamp(wx, -40, 40), clamp(wy, -40, 40), clamp(wz, -40, 40));
    const wl = w.length();
    if (wl > 1e-6) { _dq.setFromAxisAngle(_a.copy(w).divideScalar(wl), wl * dt); F.q.multiply(_dq).normalize(); }
    if (F.pos.length() > 180) { SIM.log("기체가 시야를 벗어났습니다. 위치를 되돌립니다.", "bad"); F.reset(); }
  }

  // ---------- 모터 테스트 (작업대) ----------
  const MT = (SIM.motorTest = { queue: [], cur: null, results: {} });
  MT.run = function (letters, pct, dur) {
    const pw = SIM.power();
    if (!pw.fc) return "FC가 연결되지 않았습니다.";
    if (!SIM.safetyOff()) return "Motor Test: Safety switch (안전 스위치가 해제되지 않음)";
    MT.queue = letters.map((l) => ({ l, pct, dur }));
    MT.cur = null;
    return "";
  };
  MT.runAll = function (pct, dur) { const e = MT.run([], pct, dur); if (e) return e; MT.cur = { l: "ALL", pct, t: dur }; MT.targets = allTargets(pct); return ""; };
  function targetFor(letter) {
    const f = SIM.frame(), num = f.order["ABCD".indexOf(letter)];
    for (const id of SIM.POS_IDS) if (SIM.motorNumForPos(id) === num) return { id, num };
    return { id: null, num };
  }
  function allTargets(pct) { const t = {}; for (const id of SIM.POS_IDS) if (SIM.motorNumForPos(id)) t[id] = pct / 100; return t; }
  function benchStep(dt) {
    if (!MT.cur && MT.queue.length) {
      const q = MT.queue.shift(), tg = targetFor(q.l);
      MT.cur = { l: q.l, pct: q.pct, t: q.dur };
      MT.targets = tg.id ? { [tg.id]: q.pct / 100 } : {};
      const ph = tg.id && SIM.motorPhysical(tg.id);
      MT.results[q.l] = { num: tg.num, pos: tg.id && ph.canSpin ? tg.id : null, dir: ph ? ph.dir : null, prop: ph ? ph.prop : null, thrust: ph ? ph.thrust : 0 };
      if (SIM.onMotorTest) SIM.onMotorTest();
    }
    if (MT.cur) { MT.cur.t -= dt; if (MT.cur.t <= 0) { MT.cur = null; MT.targets = {}; if (SIM.onMotorTest) SIM.onMotorTest(); } }
    const escCal = SIM.state.cal.esc;
    for (const id of SIM.POS_IDS) {
      let tgt = (MT.cur && MT.targets[id]) || 0;
      if (!SIM.motorPhysical(id).canSpin) tgt = 0;
      if (!escCal) tgt *= ESC_GAIN[id];
      SIM.motorU[id] += (tgt - SIM.motorU[id]) * Math.min(1, dt / 0.12);
    }
  }
  MT.stop = function () { MT.queue = []; MT.cur = null; MT.targets = {}; };

  // ---------- 키보드 ----------
  window.addEventListener("keydown", (e) => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; tx.keys[e.code] = true; if (SIM.txVisible && /^(Arrow|Key[WASD])/.test(e.code)) e.preventDefault(); });
  window.addEventListener("keyup", (e) => { tx.keys[e.code] = false; });
  function keyStep(dt) {
    const k = tx.keys; if (!SIM.txVisible) return;
    if (k.KeyW) tx.ly = clamp(tx.ly + dt * 1.1, -1, 1);
    if (k.KeyS) tx.ly = clamp(tx.ly - dt * 1.1, -1, 1);
    const ax = (neg, pos, cur, held) => { const t = (k[pos] ? 1 : 0) - (k[neg] ? 1 : 0); return t || held ? cur + (t - cur) * Math.min(1, dt * 10) : cur; };
    const any = (a, b) => k[a] || k[b];
    if (any("KeyA", "KeyD") || tx.kYaw) { tx.lx = ax("KeyA", "KeyD", tx.lx, true); tx.kYaw = any("KeyA", "KeyD") || Math.abs(tx.lx) > 0.01; }
    if (any("ArrowLeft", "ArrowRight") || tx.kRoll) { tx.rx = ax("ArrowLeft", "ArrowRight", tx.rx, true); tx.kRoll = any("ArrowLeft", "ArrowRight") || Math.abs(tx.rx) > 0.01; }
    if (any("ArrowDown", "ArrowUp") || tx.kPit) { tx.ry = ax("ArrowDown", "ArrowUp", tx.ry, true); tx.kPit = any("ArrowDown", "ArrowUp") || Math.abs(tx.ry) > 0.01; }
  }

  // ---------- 프레임 갱신 ----------
  SIM.tick = function (dt) {
    dt = Math.min(dt, 0.05);
    keyStep(dt);
    if (F.active) {
      const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (let i = 0; i < n; i++) step(h);
      const d = SIM.scene.drone;
      d.position.copy(F.pos); d.quaternion.copy(F.q);
      const est = SIM.estimate(F.q, F.w), pw = SIM.power();
      SIM.hud = { roll: est.roll, pitch: est.pitch, hdg: est.hdg, alt: F.pos.y - F.home.y, vs: F.vel.y, volt: pw.battSense ? F.volt : null, mode: SIM.MODES[F.mode], armed: F.armed, on: pw.fcBatt, est };
    } else {
      benchStep(dt);
      const est = SIM.estimate(SIM.scene.drone.quaternion, null), pw = SIM.power();
      SIM.hud = { roll: est.roll, pitch: est.pitch, hdg: est.hdg, alt: 0, vs: 0, volt: pw.battSense ? battVolt(0, CAP, 1) : null, mode: SIM.MODES[SIM.state.params["FLTMODE" + SIM.modeSlot(SIM.rcIn().modePwm)]], armed: false, on: pw.fc, est };
    }
  };
})();
