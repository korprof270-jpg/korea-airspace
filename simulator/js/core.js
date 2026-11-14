// 드론 정비 시뮬레이터 — 상태·부품·파라미터·검사 로직
(function () {
  const SIM = (window.SIM = {});

  // 기체 좌표: x=오른쪽, z=뒤쪽(앞은 -z), y=위
  SIM.POS = {
    FR: { id: "FR", name: "앞-오른쪽", x: 1, z: -1 },
    RR: { id: "RR", name: "뒤-오른쪽", x: 1, z: 1 },
    RL: { id: "RL", name: "뒤-왼쪽", x: -1, z: 1 },
    FL: { id: "FL", name: "앞-왼쪽", x: -1, z: -1 },
  };
  SIM.POS_IDS = ["FR", "RR", "RL", "FL"];

  // ArduCopter 프레임 배치 (모터 번호 → 위치·회전방향). order = 모터 테스트 A,B,C,D 순서
  const X = {
    1: { x: 1, z: -1, spin: "ccw" }, 2: { x: -1, z: 1, spin: "ccw" },
    3: { x: -1, z: -1, spin: "cw" }, 4: { x: 1, z: 1, spin: "cw" },
  };
  const inv = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, spin: v.spin === "cw" ? "ccw" : "cw" }]));
  SIM.FRAMES = {
    1: { name: "X", motors: X, order: [1, 4, 2, 3] },
    3: { name: "H", motors: inv(X), order: [1, 4, 2, 3] },
    0: {
      name: "Plus", order: [3, 1, 4, 2],
      motors: {
        1: { x: 1, z: 0, spin: "ccw" }, 2: { x: -1, z: 0, spin: "ccw" },
        3: { x: 0, z: -1, spin: "cw" }, 4: { x: 0, z: 1, spin: "cw" },
      },
    },
  };
  SIM.frame = () => SIM.FRAMES[SIM.state.params.FRAME_TYPE] || SIM.FRAMES[1];

  // 실제 기체(X형 암)에서 위치별로 필요한 모터 번호·회전방향
  SIM.expected = () => {
    const f = SIM.FRAMES[SIM.state.params.FRAME_TYPE === 3 ? 3 : 1];
    const out = {};
    for (const id of SIM.POS_IDS) {
      const p = SIM.POS[id];
      for (const n in f.motors) if (f.motors[n].x === p.x && f.motors[n].z === p.z) out[id] = { num: +n, spin: f.motors[n].spin };
    }
    return out;
  };

  // ---------- 부품 ----------
  const parts = [];
  for (let i = 1; i <= 4; i++) parts.push({ id: "motor" + i, type: "motor", name: "BLDC 모터 2212 920KV #" + i, desc: "암 끝 모터 마운트에 장착. 회전 방향은 ESC와의 3상 배선 순서로 결정됩니다." });
  for (let i = 1; i <= 4; i++) parts.push({ id: "esc" + i, type: "esc", name: "ESC 30A #" + i, desc: "암 위에 장착. 신호선을 FC의 MAIN OUT 포트에 꽂습니다." });
  parts.push({ id: "propCW1", type: "prop", dir: "cw", name: "프로펠러 1045R (CW) #1", desc: "위에서 볼 때 시계 방향으로 돌아야 아래로 바람을 미는 프로펠러. 허브가 은색입니다." });
  parts.push({ id: "propCW2", type: "prop", dir: "cw", name: "프로펠러 1045R (CW) #2", desc: "위에서 볼 때 시계 방향으로 돌아야 아래로 바람을 미는 프로펠러. 허브가 은색입니다." });
  parts.push({ id: "propCCW1", type: "prop", dir: "ccw", name: "프로펠러 1045 (CCW) #1", desc: "위에서 볼 때 반시계 방향으로 돌아야 아래로 바람을 미는 프로펠러. 허브가 검정색입니다." });
  parts.push({ id: "propCCW2", type: "prop", dir: "ccw", name: "프로펠러 1045 (CCW) #2", desc: "위에서 볼 때 반시계 방향으로 돌아야 아래로 바람을 미는 프로펠러. 허브가 검정색입니다." });
  parts.push({ id: "fc", type: "fc", name: "비행 컨트롤러 (Pixhawk)", desc: "상판 중앙에 장착. 윗면 화살표가 기체 앞쪽을 향해야 합니다. 다르게 달았다면 AHRS_ORIENTATION으로 보정합니다." });
  parts.push({ id: "pm", type: "pm", name: "파워 모듈", desc: "배터리와 배전판 사이에 연결. 6핀 케이블은 FC의 POWER 포트로 갑니다." });
  parts.push({ id: "battery", type: "battery", name: "리튬폴리머 배터리 4S 3300mAh", desc: "하판 아래에 벨크로로 고정하고 XT60 커넥터를 파워 모듈에 연결합니다." });
  parts.push({ id: "gps", type: "gps", name: "GPS / 나침반 모듈", desc: "상판 뒤쪽 마스트에 장착. 화살표가 기체 앞쪽을 향해야 합니다." });
  parts.push({ id: "rx", type: "rx", name: "RC 수신기", desc: "상판 왼쪽에 장착. SBUS/PPM 신호선을 FC의 RCIN 포트에 꽂습니다." });
  parts.push({ id: "telem", type: "telem", name: "텔레메트리 라디오", desc: "상판 오른쪽에 장착. FC의 TELEM1 또는 TELEM2 포트에 연결합니다. (선택 장비)" });
  SIM.PARTS = parts;
  SIM.part = (id) => parts.find((p) => p.id === id);

  SIM.SLOT_NAMES = { fc: "상판 중앙", pm: "하판 중앙", battery: "하판 아래", gps: "상판 뒤 마스트", rx: "상판 왼쪽", telem: "상판 오른쪽" };
  SIM.slotName = (s) => {
    const [t, pos] = s.split("@");
    if (pos) return SIM.POS[pos].name + (t === "prop" ? " 모터 축" : " 암");
    return SIM.SLOT_NAMES[s];
  };
  SIM.slotsFor = (part) => (["motor", "esc", "prop"].includes(part.type) ? SIM.POS_IDS.map((p) => part.type + "@" + p) : [part.type]);

  SIM.FC_PORTS = ["POWER", "RCIN", "GPS", "TELEM1", "TELEM2"];
  SIM.MODES = { 0: "Stabilize", 2: "AltHold", 5: "Loiter", 6: "RTL", 9: "Land" };

  // 송신기 실제 출력 (교정으로 찾아야 하는 값)
  SIM.TX = { c: { 1: 1506, 2: 1498, 4: 1502 }, amp: { 1: 478, 2: 470, 4: 482 }, thrMin: 1024, thrMax: 1976, sw: [1165, 1500, 1815] };

  // ---------- 파라미터 ----------
  const ORI = { 0: "None (0°)", 1: "Yaw45", 2: "Yaw90", 3: "Yaw135", 4: "Yaw180", 5: "Yaw225", 6: "Yaw270", 7: "Yaw315" };
  const D = (SIM.PARAM_DEFS = {
    FRAME_CLASS: { d: 0, desc: "프레임 클래스", opts: { 0: "미설정", 1: "Quad", 2: "Hexa", 3: "Octa", 5: "Y6" } },
    FRAME_TYPE: { d: 1, desc: "프레임 타입", opts: { 0: "Plus (+)", 1: "X", 3: "H" } },
    AHRS_ORIENTATION: { d: 0, desc: "FC 보드 장착 방향", opts: ORI },
    COMPASS_ORIENT: { d: 0, desc: "외장 나침반 장착 방향", opts: ORI },
    ARMING_CHECK: { d: 1, desc: "시동 전 점검 (1=전체, 0=끔)", opts: { 1: "전체 점검", 0: "점검 안 함" } },
  });
  for (let i = 1; i <= 4; i++) {
    D["RC" + i + "_MIN"] = { d: 1100, desc: "RC" + i + " 최소 PWM", min: 800, max: 2200 };
    D["RC" + i + "_TRIM"] = { d: 1500, desc: "RC" + i + " 중립 PWM", min: 800, max: 2200 };
    D["RC" + i + "_MAX"] = { d: 1900, desc: "RC" + i + " 최대 PWM", min: 800, max: 2200 };
    D["RC" + i + "_REVERSED"] = { d: 0, desc: "RC" + i + " 반전", opts: { 0: "정상", 1: "반전" } };
  }
  Object.assign(D, {
    RCMAP_ROLL: { d: 1, desc: "롤 입력 채널", min: 1, max: 4 },
    RCMAP_PITCH: { d: 2, desc: "피치 입력 채널", min: 1, max: 4 },
    RCMAP_THROTTLE: { d: 3, desc: "스로틀 입력 채널", min: 1, max: 4 },
    RCMAP_YAW: { d: 4, desc: "요 입력 채널", min: 1, max: 4 },
    FLTMODE_CH: { d: 5, desc: "비행 모드 채널", min: 5, max: 8 },
  });
  for (let i = 1; i <= 6; i++) D["FLTMODE" + i] = { d: 0, desc: "비행 모드 " + i, opts: SIM.MODES };
  Object.assign(D, {
    FS_THR_ENABLE: { d: 1, desc: "스로틀(라디오) 페일세이프", opts: { 0: "사용 안 함", 1: "항상 RTL", 3: "항상 Land" } },
    FS_THR_VALUE: { d: 975, desc: "페일세이프 판정 PWM", min: 900, max: 1100 },
    BATT_MONITOR: { d: 0, desc: "배터리 모니터", opts: { 0: "사용 안 함", 3: "전압만", 4: "전압 + 전류" } },
    BATT_CAPACITY: { d: 3300, desc: "배터리 용량 (mAh)", min: 100, max: 30000 },
    BATT_LOW_VOLT: { d: 0, desc: "저전압 기준 (V, 0=끔)", min: 0, max: 30, step: 0.1 },
    BATT_FS_LOW_ACT: { d: 0, desc: "저전압 시 동작", opts: { 0: "없음", 1: "Land", 2: "RTL" } },
  });
  for (let i = 1; i <= 4; i++) D["SERVO" + i + "_FUNCTION"] = { d: 32 + i, desc: "MAIN OUT " + i + " 출력 기능", opts: { 0: "Disabled", 33: "Motor1", 34: "Motor2", 35: "Motor3", 36: "Motor4" } };
  Object.assign(D, {
    MOT_SPIN_ARM: { d: 0.1, desc: "시동 시 모터 회전량", min: 0, max: 0.3, step: 0.01 },
    MOT_SPIN_MIN: { d: 0.15, desc: "비행 중 최소 회전량", min: 0, max: 0.3, step: 0.01 },
    ANGLE_MAX: { d: 3000, desc: "최대 기울기 (centi-deg)", min: 1000, max: 8000, step: 100 },
    PILOT_SPEED_UP: { d: 250, desc: "최대 상승 속도 (cm/s)", min: 50, max: 500, step: 10 },
    RTL_ALT: { d: 1500, desc: "RTL 복귀 고도 (cm)", min: 200, max: 8000, step: 100 },
    ATC_ANG_RLL_P: { d: 4.5, desc: "롤 각도 P", min: 1, max: 12, step: 0.1 },
    ATC_ANG_PIT_P: { d: 4.5, desc: "피치 각도 P", min: 1, max: 12, step: 0.1 },
    ATC_RAT_RLL_P: { d: 0.135, desc: "롤 각속도 P", min: 0.01, max: 0.6, step: 0.005 },
    ATC_RAT_RLL_I: { d: 0.135, desc: "롤 각속도 I", min: 0, max: 2, step: 0.005 },
    ATC_RAT_RLL_D: { d: 0.0036, desc: "롤 각속도 D", min: 0, max: 0.05, step: 0.0002 },
    ATC_RAT_PIT_P: { d: 0.135, desc: "피치 각속도 P", min: 0.01, max: 0.6, step: 0.005 },
    ATC_RAT_PIT_I: { d: 0.135, desc: "피치 각속도 I", min: 0, max: 2, step: 0.005 },
    ATC_RAT_PIT_D: { d: 0.0036, desc: "피치 각속도 D", min: 0, max: 0.05, step: 0.0002 },
    ATC_RAT_YAW_P: { d: 0.18, desc: "요 각속도 P", min: 0.01, max: 1, step: 0.01 },
    ATC_RAT_YAW_I: { d: 0.018, desc: "요 각속도 I", min: 0, max: 1, step: 0.002 },
    COMPASS_OFS_X: { d: 0, desc: "나침반 오프셋 X", min: -2000, max: 2000 },
    COMPASS_OFS_Y: { d: 0, desc: "나침반 오프셋 Y", min: -2000, max: 2000 },
    COMPASS_OFS_Z: { d: 0, desc: "나침반 오프셋 Z", min: -2000, max: 2000 },
  });

  function defaults() {
    const params = {};
    for (const k in D) params[k] = D[k].d;
    const install = {};
    for (const p of parts) install[p.id] = null;
    return {
      install,
      rot: { fc: 0, gps: 0 }, // 오른쪽으로 90°씩 돌린 횟수
      wiring: {
        escPort: { FR: 0, RR: 0, RL: 0, FL: 0 },
        motorDir: { FR: "cw", RR: "cw", RL: "cw", FL: "cw" },
        devPort: { pm: "", gps: "", rx: "", telem: "" },
        battPlug: false,
      },
      params,
      cal: { accel: false, compass: false, radio: false, esc: false },
    };
  }

  const KEY = "drone-maint-sim-v1";
  function load() {
    const s = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && raw.install) {
        Object.assign(s.install, raw.install);
        Object.assign(s.rot, raw.rot);
        for (const k in s.wiring) if (raw.wiring && raw.wiring[k] !== undefined) s.wiring[k] = typeof s.wiring[k] === "object" ? Object.assign(s.wiring[k], raw.wiring[k]) : raw.wiring[k];
        Object.assign(s.params, raw.params);
        Object.assign(s.cal, raw.cal);
      }
    } catch (e) {}
    return s;
  }
  SIM.state = load();
  SIM.selected = null;
  SIM.motorU = { FR: 0, RR: 0, RL: 0, FL: 0 };
  SIM.msgs = [];

  const listeners = [];
  SIM.on = (fn) => listeners.push(fn);
  SIM.emit = () => {
    try { localStorage.setItem(KEY, JSON.stringify(SIM.state)); } catch (e) {}
    listeners.forEach((f) => f());
  };
  SIM.log = (text, kind) => {
    SIM.msgs.unshift({ text, kind: kind || "info", t: Date.now() });
    if (SIM.msgs.length > 40) SIM.msgs.pop();
    if (SIM.onLog) SIM.onLog(text, kind);
  };

  // ---------- 조립 ----------
  SIM.partAt = (slot) => { for (const id in SIM.state.install) if (SIM.state.install[id] === slot) return SIM.part(id); return null; };
  SIM.has = (slot) => !!SIM.partAt(slot);
  SIM.canInstall = (part, slot) => {
    if (!SIM.slotsFor(part).includes(slot)) return "이 부품은 그 자리에 맞지 않습니다.";
    if (SIM.partAt(slot)) return "이미 다른 부품이 장착된 자리입니다.";
    if (part.type === "prop" && !SIM.has("motor@" + slot.split("@")[1])) return "먼저 그 암에 모터를 장착하세요.";
    return "";
  };
  SIM.install = (id, slot) => {
    const part = SIM.part(id), err = SIM.canInstall(part, slot);
    if (err) return err;
    SIM.state.install[id] = slot;
    SIM.emit();
    return "";
  };
  SIM.remove = (id) => {
    const st = SIM.state, slot = st.install[id];
    if (!slot) return;
    const part = SIM.part(id), pos = slot.split("@")[1];
    st.install[id] = null;
    if (part.type === "motor") { const pr = SIM.partAt("prop@" + pos); if (pr) st.install[pr.id] = null; }
    if (part.type === "esc") st.wiring.escPort[pos] = 0;
    if (st.wiring.devPort[id] !== undefined) st.wiring.devPort[id] = "";
    if (id === "battery") st.wiring.battPlug = false;
    if (id === "fc") { for (const k in st.wiring.devPort) st.wiring.devPort[k] = ""; for (const p of SIM.POS_IDS) st.wiring.escPort[p] = 0; }
    SIM.emit();
  };
  SIM.select = (id) => { SIM.selected = id; SIM.emit(); };
  SIM.rotate = (id) => { SIM.state.rot[id] = (SIM.state.rot[id] + 1) % 4; SIM.emit(); };

  SIM.setEscPort = (pos, port) => {
    const w = SIM.state.wiring;
    if (port) for (const p of SIM.POS_IDS) if (w.escPort[p] === port) w.escPort[p] = 0;
    w.escPort[pos] = port; SIM.emit();
  };
  SIM.setDevPort = (dev, port) => {
    const w = SIM.state.wiring;
    if (port) for (const k in w.devPort) if (w.devPort[k] === port) w.devPort[k] = "";
    w.devPort[dev] = port; SIM.emit();
  };
  SIM.setParam = (k, v) => {
    const d = D[k]; v = +v;
    if (!d || isNaN(v)) return;
    if (d.min !== undefined) v = Math.min(d.max, Math.max(d.min, v));
    SIM.state.params[k] = v; SIM.emit();
  };

  // ---------- 전원·신호 경로 ----------
  SIM.power = () => {
    const st = SIM.state, w = st.wiring;
    const main = SIM.has("battery") && SIM.has("pm") && w.battPlug;
    const fc = SIM.has("fc");
    return { main, fc, fcBatt: fc && main && w.devPort.pm === "POWER", battSense: fc && main && w.devPort.pm === "POWER" && st.params.BATT_MONITOR !== 0 };
  };
  SIM.gpsOk = () => SIM.has("gps") && SIM.state.wiring.devPort.gps === "GPS";
  SIM.rxOk = () => SIM.has("rx") && SIM.state.wiring.devPort.rx === "RCIN";

  // 이 위치의 ESC가 받는 신호가 몇 번 모터 신호인지 (0=신호 없음)
  SIM.motorNumForPos = (pos) => {
    const port = SIM.state.wiring.escPort[pos];
    if (!port) return 0;
    const fn = SIM.state.params["SERVO" + port + "_FUNCTION"];
    return fn >= 33 && fn <= 36 ? fn - 32 : 0;
  };
  // 물리적 구동 상태: 돌 수 있는지, 실제 회전 방향, 추력 계수(+1 정상, 음수=바람이 위로)
  SIM.motorPhysical = (pos) => {
    const st = SIM.state, prop = SIM.partAt("prop@" + pos), dir = st.wiring.motorDir[pos];
    const canSpin = SIM.has("motor@" + pos) && SIM.has("esc@" + pos) && SIM.power().main;
    return { canSpin, dir, prop: prop ? prop.dir : null, thrust: !prop ? 0 : prop.dir === dir ? 1 : -0.5 };
  };

  const ROT_DEG = (n) => n * 90;
  // FC 장착 방향과 AHRS_ORIENTATION 설정의 차이 (rad, 오른쪽 회전 +)
  SIM.mountErr = () => ((ROT_DEG(SIM.state.rot.fc) - SIM.state.params.AHRS_ORIENTATION * 45) * Math.PI) / 180;
  SIM.headingErr = () => {
    if (SIM.gpsOk()) return ((ROT_DEG(SIM.state.rot.gps) - SIM.state.params.COMPASS_ORIENT * 45) * Math.PI) / 180;
    return SIM.mountErr(); // 내장 나침반은 FC와 함께 돈다
  };

  // ---------- 검사 ----------
  SIM.hardwareCheck = () => {
    const st = SIM.state, w = st.wiring, out = [], exp = SIM.expected();
    const add = (lvl, t, d) => out.push({ lvl, t, d });
    const dirKo = (d) => (d === "cw" ? "시계(CW)" : "반시계(CCW)");
    if (st.params.FRAME_TYPE === 0) add("bad", "프레임 타입", "기체는 X형 암 배치인데 FRAME_TYPE이 Plus로 설정되어 있습니다.");
    for (const id of SIM.POS_IDS) {
      const n = SIM.POS[id].name, e = exp[id];
      if (!SIM.has("motor@" + id)) { add("bad", n + " 모터", "모터가 장착되지 않았습니다."); continue; }
      if (!SIM.has("esc@" + id)) { add("bad", n + " ESC", "ESC가 장착되지 않았습니다."); continue; }
      const num = SIM.motorNumForPos(id);
      if (!w.escPort[id]) add("bad", n + " ESC 신호선", "FC 출력 포트에 연결되지 않았습니다.");
      else if (num !== e.num) add("bad", n + " ESC 신호선", "MAIN OUT " + w.escPort[id] + " → " + (num ? "Motor" + num : "출력 없음") + " 신호를 받고 있습니다. 이 위치는 Motor" + e.num + " 신호가 필요합니다.");
      else add("ok", n + " ESC 신호선", "MAIN OUT " + w.escPort[id] + " (Motor" + num + ")");
      if (w.motorDir[id] !== e.spin) add("bad", n + " 모터 회전 방향", "현재 " + dirKo(w.motorDir[id]) + ". 이 위치는 " + dirKo(e.spin) + " 방향이어야 합니다. 3상 선 중 두 가닥을 바꾸세요.");
      else add("ok", n + " 모터 회전 방향", dirKo(e.spin));
      const pr = SIM.partAt("prop@" + id);
      if (!pr) add("bad", n + " 프로펠러", "프로펠러가 없습니다.");
      else if (pr.dir !== e.spin) add("bad", n + " 프로펠러", pr.dir.toUpperCase() + " 프로펠러가 달려 있습니다. 이 위치는 " + e.spin.toUpperCase() + " 프로펠러가 필요합니다.");
      else add("ok", n + " 프로펠러", e.spin.toUpperCase() + " 프로펠러");
    }
    if (!SIM.has("fc")) add("bad", "비행 컨트롤러", "FC가 장착되지 않았습니다.");
    else if (Math.abs(Math.sin(SIM.mountErr() / 2)) > 0.01) add("bad", "FC 장착 방향", "화살표가 앞에서 오른쪽으로 " + ROT_DEG(st.rot.fc) + "° 돌아가 있고 AHRS_ORIENTATION은 " + ORI[st.params.AHRS_ORIENTATION] + "입니다. 방향을 바로잡거나 파라미터로 보정하세요.");
    else add("ok", "FC 장착 방향", st.rot.fc ? "돌려 달았지만 AHRS_ORIENTATION으로 보정됨" : "화살표가 앞쪽");
    if (!SIM.has("pm")) add("bad", "파워 모듈", "장착되지 않았습니다.");
    else if (w.devPort.pm !== "POWER") add("bad", "파워 모듈 케이블", w.devPort.pm ? w.devPort.pm + " 포트에 꽂혀 있습니다. POWER 포트에 연결하세요." : "FC의 POWER 포트에 연결되지 않았습니다.");
    else add("ok", "파워 모듈 케이블", "POWER 포트");
    if (!SIM.has("battery")) add("bad", "배터리", "장착되지 않았습니다.");
    else if (!w.battPlug) add("bad", "배터리 커넥터", "XT60 커넥터가 연결되지 않았습니다.");
    else add("ok", "배터리", "장착 및 커넥터 연결");
    if (!SIM.has("rx")) add("bad", "RC 수신기", "장착되지 않았습니다.");
    else if (w.devPort.rx !== "RCIN") add("bad", "RC 수신기 신호선", w.devPort.rx ? w.devPort.rx + " 포트에 꽂혀 있습니다. RCIN에 연결하세요." : "RCIN 포트에 연결되지 않았습니다.");
    else add("ok", "RC 수신기", "RCIN 포트");
    if (!SIM.has("gps")) add("bad", "GPS / 나침반", "장착되지 않았습니다. Loiter·RTL 모드를 쓸 수 없습니다.");
    else if (w.devPort.gps !== "GPS") add("bad", "GPS 케이블", w.devPort.gps ? w.devPort.gps + " 포트에 꽂혀 있습니다. GPS 포트에 연결하세요." : "GPS 포트에 연결되지 않았습니다.");
    else if (Math.abs(Math.sin(SIM.headingErr() / 2)) > 0.01) add("bad", "GPS 장착 방향", "화살표가 앞에서 오른쪽으로 " + ROT_DEG(st.rot.gps) + "° 돌아가 있습니다 (COMPASS_ORIENT " + ORI[st.params.COMPASS_ORIENT] + ").");
    else add("ok", "GPS / 나침반", "GPS 포트, 방향 일치");
    if (!SIM.has("telem")) add("warn", "텔레메트리", "장착되지 않았습니다. (선택 장비)");
    else if (!/^TELEM/.test(w.devPort.telem)) add("warn", "텔레메트리 케이블", "TELEM1 또는 TELEM2 포트에 연결하세요. (선택 장비)");
    else add("ok", "텔레메트리", w.devPort.telem + " 포트");
    return out;
  };

  // 시동 전 점검 (FC가 스스로 알아낼 수 있는 것만)
  SIM.prearm = (mode) => {
    const st = SIM.state, p = st.params, pw = SIM.power(), f = [];
    if (!pw.fc) return ["비행 컨트롤러가 없습니다"];
    if (!pw.fcBatt) return ["FC에 배터리 전원이 들어오지 않습니다 (배터리 → 파워 모듈 → POWER 포트)"];
    if (p.FRAME_CLASS !== 1) f.push("PreArm: Check frame class and type (FRAME_CLASS가 Quad가 아님)");
    if (![33, 34, 35, 36].every((fn) => [1, 2, 3, 4].some((n) => p["SERVO" + n + "_FUNCTION"] === fn))) f.push("PreArm: Check SERVOx_FUNCTION (모터 출력 4개가 모두 지정되지 않음)");
    if (p.ARMING_CHECK) {
      if (!st.cal.accel) f.push("PreArm: 3D Accel calibration needed");
      if (!st.cal.compass) f.push("PreArm: Compass not calibrated");
      if (!SIM.rxOk()) f.push("PreArm: RC not found (수신기 신호 없음)");
      else if (!st.cal.radio) f.push("PreArm: RC not calibrated");
      if ((mode === 5 || mode === 6) && !SIM.gpsOk()) f.push("PreArm: GPS: need 3D fix (이 모드는 GPS 필요)");
    }
    return f;
  };

  // ---------- 일괄 작업 ----------
  SIM.autoAssemble = () => {
    const st = SIM.state, fresh = defaults();
    st.install = fresh.install; st.rot = { fc: 0, gps: 0 };
    for (let i = 1; i <= 4; i++) st.params["SERVO" + i + "_FUNCTION"] = 32 + i;
    const exp = SIM.expected(), props = { cw: ["propCW1", "propCW2"], ccw: ["propCCW1", "propCCW2"] };
    SIM.POS_IDS.forEach((id, i) => {
      st.install["motor" + (i + 1)] = "motor@" + id;
      st.install["esc" + (i + 1)] = "esc@" + id;
      st.install[props[exp[id].spin].shift()] = "prop@" + id;
      st.wiring.escPort[id] = exp[id].num;
      st.wiring.motorDir[id] = exp[id].spin;
    });
    for (const id of ["fc", "pm", "battery", "gps", "rx", "telem"]) st.install[id] = id;
    st.wiring.devPort = { pm: "POWER", gps: "GPS", rx: "RCIN", telem: "TELEM1" };
    st.wiring.battPlug = true;
    SIM.selected = null;
    SIM.emit();
  };
  SIM.autoConfigure = () => {
    const st = SIM.state, p = st.params, tx = SIM.TX;
    Object.assign(p, { FRAME_CLASS: 1, FRAME_TYPE: 1, AHRS_ORIENTATION: 0, COMPASS_ORIENT: 0, ARMING_CHECK: 1 });
    for (const c of [1, 2, 4]) { p["RC" + c + "_MIN"] = tx.c[c] - tx.amp[c]; p["RC" + c + "_MAX"] = tx.c[c] + tx.amp[c]; p["RC" + c + "_TRIM"] = tx.c[c]; p["RC" + c + "_REVERSED"] = 0; }
    Object.assign(p, { RC3_MIN: tx.thrMin, RC3_MAX: tx.thrMax, RC3_TRIM: tx.thrMin, RC3_REVERSED: 0, RCMAP_ROLL: 1, RCMAP_PITCH: 2, RCMAP_THROTTLE: 3, RCMAP_YAW: 4, FLTMODE_CH: 5 });
    Object.assign(p, { FLTMODE1: 0, FLTMODE2: 0, FLTMODE3: 0, FLTMODE4: 2, FLTMODE5: 2, FLTMODE6: 5 });
    Object.assign(p, { FS_THR_ENABLE: 1, FS_THR_VALUE: 975, BATT_MONITOR: 4, BATT_CAPACITY: 3300, BATT_LOW_VOLT: 14, BATT_FS_LOW_ACT: 2 });
    Object.assign(p, { COMPASS_OFS_X: -42, COMPASS_OFS_Y: 118, COMPASS_OFS_Z: 63 });
    for (const k in D) if (/^(ATC_|MOT_|ANGLE|PILOT|RTL)/.test(k)) p[k] = D[k].d;
    st.cal = { accel: true, compass: true, radio: true, esc: true };
    SIM.emit();
  };
  SIM.resetAll = () => { SIM.state = defaults(); SIM.selected = null; SIM.faults = null; SIM.emit(); };

  // ---------- 고장 진단 훈련 ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const FAULTS = [
    () => { const a = pick(SIM.POS_IDS), w = SIM.state.wiring, good = w.motorDir[a]; w.motorDir[a] = good === "cw" ? "ccw" : "cw"; return { desc: SIM.POS[a].name + " 모터의 회전 방향이 반대입니다 (3상 배선).", present: () => w.motorDir[a] !== SIM.expected()[a].spin }; },
    () => { const a = pick(["FR", "RL"]), b = pick(["RR", "FL"]), w = SIM.state.wiring, t = w.escPort[a]; w.escPort[a] = w.escPort[b]; w.escPort[b] = t; return { desc: SIM.POS[a].name + "과 " + SIM.POS[b].name + " ESC 신호선이 서로 바뀌어 꽂혀 있습니다.", present: () => [a, b].some((x) => SIM.motorNumForPos(x) !== SIM.expected()[x].num) }; },
    () => { const a = pick(["FR", "RL"]), b = pick(["RR", "FL"]), i = SIM.state.install, pa = SIM.partAt("prop@" + a), pb = SIM.partAt("prop@" + b); i[pa.id] = "prop@" + b; i[pb.id] = "prop@" + a; return { desc: SIM.POS[a].name + "과 " + SIM.POS[b].name + "의 프로펠러(CW/CCW)가 서로 바뀌어 달려 있습니다.", present: () => [a, b].some((x) => { const p = SIM.partAt("prop@" + x); return !p || p.dir !== SIM.expected()[x].spin; }) }; },
    () => { SIM.state.rot.fc = pick([1, 2, 3]); return { desc: "FC가 돌아간 방향으로 장착되어 있는데 AHRS_ORIENTATION 보정이 없습니다.", present: () => Math.abs(Math.sin(SIM.mountErr() / 2)) > 0.01 }; },
    () => { SIM.state.rot.gps = 2; return { desc: "GPS/나침반 모듈이 뒤를 향해 장착되어 있습니다. (Loiter에서 원을 그리며 흐름)", present: () => Math.abs(Math.sin(SIM.headingErr() / 2)) > 0.01 }; },
    () => { SIM.state.wiring.devPort.rx = ""; return { desc: "수신기 신호선이 RCIN 포트에서 빠져 있습니다.", present: () => !SIM.rxOk() }; },
    () => { SIM.state.params.RC2_REVERSED = 1; return { desc: "RC2(피치) 채널이 반전되어 있습니다 (RC2_REVERSED=1).", present: () => SIM.state.params.RC2_REVERSED === 1 }; },
    () => { SIM.state.params.FS_THR_ENABLE = 0; return { desc: "라디오 페일세이프가 꺼져 있습니다 (FS_THR_ENABLE=0). 송신기 신호가 끊기면 추락합니다.", present: () => SIM.state.params.FS_THR_ENABLE === 0 }; },
    () => { const p = SIM.state.params; p.SERVO1_FUNCTION = 34; p.SERVO2_FUNCTION = 33; return { desc: "SERVO1_FUNCTION과 SERVO2_FUNCTION이 서로 바뀌어 있습니다.", present: () => SIM.POS_IDS.some((x) => SIM.motorNumForPos(x) !== SIM.expected()[x].num) }; },
    () => { SIM.state.params.FRAME_TYPE = 0; return { desc: "FRAME_TYPE이 Plus로 설정되어 있습니다 (기체는 X형).", present: () => SIM.state.params.FRAME_TYPE === 0 }; },
    () => { SIM.state.params.BATT_LOW_VOLT = 0; return { desc: "배터리 저전압 페일세이프가 꺼져 있습니다 (BATT_LOW_VOLT=0).", present: () => !(SIM.state.params.BATT_LOW_VOLT > 0 && SIM.state.params.BATT_FS_LOW_ACT) }; },
  ];
  SIM.startFaultDrill = (n) => {
    SIM.autoAssemble(); SIM.autoConfigure();
    const pool = FAULTS.slice(), list = [];
    while (list.length < n && pool.length) list.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]());
    SIM.faults = { list, revealed: false };
    SIM.emit();
  };
})();
