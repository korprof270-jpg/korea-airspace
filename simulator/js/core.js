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

  // ---------- 부품 (화면에는 규격을 드러내지 않는다) ----------
  const parts = [];
  // thread: 모터 축 나사 방향 종류 (cw형은 시계 방향으로 돌 때 너트가 조여진다)
  ["cw", "ccw", "ccw", "cw"].forEach((t, i) => parts.push({ id: "motor" + (i + 1), type: "motor", thread: t, name: "모터 " + "ABCD"[i] }));
  for (let i = 1; i <= 4; i++) parts.push({ id: "esc" + i, type: "esc", name: "ESC " + "ABCD"[i - 1] });
  ["ccw", "cw", "cw", "ccw"].forEach((d, i) => parts.push({ id: "prop" + (i + 1), type: "prop", dir: d, name: "프로펠러 " + "ABCD"[i] }));
  parts.push({ id: "fc", type: "fc", name: "비행 컨트롤러" });
  parts.push({ id: "pm", type: "pm", name: "파워 모듈" });
  parts.push({ id: "battery", type: "battery", name: "배터리" });
  parts.push({ id: "gps", type: "gps", name: "GPS · 나침반 모듈" });
  parts.push({ id: "rx", type: "rx", name: "수신기" });
  parts.push({ id: "telem", type: "telem", name: "텔레메트리" });
  parts.push({ id: "buzzer", type: "buzzer", name: "부저" });
  parts.push({ id: "switch", type: "switch", name: "안전 스위치" });
  SIM.PARTS = parts;
  SIM.part = (id) => parts.find((p) => p.id === id);

  SIM.SLOT_NAMES = { fc: "상판 중앙", pm: "하판 중앙", battery: "하판 아래", gps: "상판 뒤 마스트", rx: "상판 왼쪽", telem: "상판 오른쪽", buzzer: "상판 왼쪽 뒤", switch: "상판 오른쪽 뒤" };
  SIM.slotName = (s) => {
    const [t, pos] = s.split("@");
    if (pos) return SIM.POS[pos].name + (t === "prop" ? " 모터 축" : " 암");
    return SIM.SLOT_NAMES[s];
  };
  SIM.slotsFor = (part) => (["motor", "esc", "prop"].includes(part.type) ? SIM.POS_IDS.map((p) => part.type + "@" + p) : [part.type]);

  // ---------- 커넥터와 포트: 모양이 같은 것끼리만 꽂힌다 ----------
  const servoPorts = ["RC IN", "SBUS OUT"];
  for (let i = 1; i <= 8; i++) servoPorts.push("MAIN OUT " + i);
  for (let i = 1; i <= 6; i++) servoPorts.push("AUX OUT " + i);
  // Pixhawk 기준 포트. 커넥터 종류: DF13 2·3·4·6·7핀, 마이크로 USB, 뒤쪽 서보 레일(3핀 헤더)
  SIM.PORTS = {
    df6: ["TELEM1", "TELEM2", "POWER", "SERIAL 4/5", "GPS"],
    df4: ["CAN", "I2C"],
    df3: ["SPKT/DSM", "ADC 3.3V", "SWITCH", "ADC 6.6V"],
    df2: ["BUZZER"],
    df7: ["SPI"],
    usb: ["USB"],
    servo: servoPorts,
  };
  SIM.CONN_NAMES = { df6: "DF13 6핀", df4: "DF13 4핀", df3: "DF13 3핀", df2: "DF13 2핀", df7: "DF13 7핀", usb: "마이크로 USB", servo: "3핀 서보" };
  SIM.CONN_PINS = { df6: 6, df4: 4, df3: 3, df2: 2, df7: 7, usb: 5, servo: 3 };
  SIM.portType = (port) => Object.keys(SIM.PORTS).find((t) => SIM.PORTS[t].includes(port));
  SIM.CABLES = {
    pm: { name: "파워 모듈 케이블", conn: "df6", need: ["pm"] },
    gps: { name: "GPS 모듈 케이블 (굵은 쪽)", conn: "df6", need: ["gps"] },
    compass: { name: "GPS 모듈 케이블 (가는 쪽)", conn: "df4", need: ["gps"] },
    telem: { name: "텔레메트리 케이블", conn: "df6", need: ["telem"] },
    buzzer: { name: "부저 케이블", conn: "df2", need: ["buzzer"] },
    switch: { name: "안전 스위치 케이블", conn: "df3", need: ["switch"] },
    rx: { name: "수신기 신호선", conn: "servo", need: ["rx"] },
  };
  for (const id of SIM.POS_IDS) SIM.CABLES["esc" + id] = { name: SIM.POS[id].name + " ESC 신호선", conn: "servo", need: ["esc@" + id] };
  SIM.WIRE_PERMS = ["123", "132", "213", "231", "312", "321"];
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
    BRD_SAFETYENABLE: { d: 1, desc: "안전 스위치 사용", opts: { 1: "사용", 0: "사용 안 함" } },
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
    BATT_CAPACITY: { d: 16000, desc: "배터리 용량 (mAh)", min: 100, max: 30000 },
    BATT_LOW_VOLT: { d: 0, desc: "저전압 기준 (V, 0=끔)", min: 0, max: 30, step: 0.1 },
    BATT_FS_LOW_ACT: { d: 0, desc: "저전압 시 동작", opts: { 0: "없음", 1: "Land", 2: "RTL" } },
  });
  for (let i = 1; i <= 8; i++) D["SERVO" + i + "_FUNCTION"] = { d: i <= 4 ? 32 + i : 0, desc: "MAIN OUT " + i + " 출력 기능", opts: { 0: "Disabled", 33: "Motor1", 34: "Motor2", 35: "Motor3", 36: "Motor4" } };
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
    ATC_RAT_YAW_P: { d: 0.4, desc: "요 각속도 P", min: 0.01, max: 1, step: 0.01 },
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
      flip: { prop1: false, prop2: false, prop3: false, prop4: false }, // 프로펠러를 뒤집어 끼웠는지
      wiring: {
        plug: Object.fromEntries(Object.keys(SIM.CABLES).map((k) => [k, ""])), // 케이블 → FC 포트
        escPwr: { FR: "", RR: "", RL: "", FL: "" }, // ESC 전원선 → PDB 패드: "", "ok", "rev"
        motorWires: { FR: "", RR: "", RL: "", FL: "" }, // 모터선 ①②③이 꽂힌 ESC 단자 순서
        batt: "", // 배터리 커넥터: "", "pm", "pdb"
        pmOut: "", // 파워 모듈 출력선 → PDB 배터리 패드: "", "ok", "rev"
      },
      params,
      cal: { accel: false, compass: false, radio: false, esc: false },
    };
  }

  const KEY = "drone-maint-sim-v2";
  function load() {
    const s = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && raw.install) {
        Object.assign(s.install, raw.install);
        Object.assign(s.rot, raw.rot); Object.assign(s.flip, raw.flip);
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
    const st = SIM.state, w = st.wiring, slot = st.install[id];
    if (!slot) return;
    const part = SIM.part(id), pos = slot.split("@")[1];
    st.install[id] = null;
    if (part.type === "motor") { const pr = SIM.partAt("prop@" + pos); if (pr) st.install[pr.id] = null; w.motorWires[pos] = ""; }
    if (part.type === "esc") { w.plug["esc" + pos] = ""; w.escPwr[pos] = ""; w.motorWires[pos] = ""; }
    if (id === "fc") for (const k in w.plug) w.plug[k] = "";
    if (id === "pm") { w.plug.pm = ""; w.pmOut = ""; if (w.batt === "pm") w.batt = ""; }
    if (id === "battery") w.batt = "";
    if (id === "gps") w.plug.gps = w.plug.compass = "";
    if (w.plug[id] !== undefined && id !== "pm" && id !== "gps") w.plug[id] = "";
    SIM.emit();
  };
  SIM.select = (id) => { SIM.selected = id; SIM.emit(); };
  SIM.rotate = (id) => { SIM.state.rot[id] = (SIM.state.rot[id] + 1) % 4; SIM.emit(); };

  SIM.flipProp = (id) => { SIM.state.flip[id] = !SIM.state.flip[id]; SIM.emit(); };
  SIM.cableReady = (c) => SIM.has("fc") && SIM.CABLES[c].need.every((n) => SIM.has(n));
  SIM.setPlug = (cable, port) => {
    const w = SIM.state.wiring;
    if (port && !SIM.PORTS[SIM.CABLES[cable].conn].includes(port)) return;
    if (port) for (const k in w.plug) if (w.plug[k] === port) w.plug[k] = "";
    w.plug[cable] = port; SIM.emit();
  };
  SIM.setParam = (k, v) => {
    const d = D[k]; v = +v;
    if (!d || isNaN(v)) return;
    if (d.min !== undefined) v = Math.min(d.max, Math.max(d.min, v));
    SIM.state.params[k] = v; SIM.emit();
  };

  // ---------- 전원·신호 경로 ----------
  SIM.power = () => {
    const st = SIM.state, w = st.wiring, batt = SIM.has("battery"), pm = SIM.has("pm"), fc = SIM.has("fc");
    const viaPm = batt && pm && w.batt === "pm";
    const reverse = viaPm && w.pmOut === "rev";
    const pdb = (viaPm && w.pmOut === "ok") || (batt && w.batt === "pdb");
    const fcBatt = fc && viaPm && w.plug.pm === "POWER";
    return { pdb, main: pdb, reverse, fc, fcBatt, battSense: fcBatt && st.params.BATT_MONITOR !== 0 };
  };
  SIM.gpsOk = () => SIM.has("gps") && SIM.state.wiring.plug.gps === "GPS";
  SIM.compassExt = () => SIM.has("gps") && SIM.state.wiring.plug.compass === "I2C";
  SIM.rxOk = () => SIM.has("rx") && SIM.state.wiring.plug.rx === "RC IN";
  // 안전 스위치: 눌러서 해제해야 모터 출력이 나간다 (BRD_SAFETYENABLE=0이면 불필요)
  SIM.switchOk = () => SIM.has("switch") && SIM.state.wiring.plug.switch === "SWITCH";
  SIM.safetyPressed = false;
  SIM.safetyOff = () => !SIM.state.params.BRD_SAFETYENABLE || (SIM.safetyPressed && SIM.switchOk());

  // 이 위치의 ESC가 받는 신호가 몇 번 모터 신호인지 (0=신호 없음)
  SIM.motorNumForPos = (pos) => {
    const m = /^MAIN OUT (\d)$/.exec(SIM.state.wiring.plug["esc" + pos] || "");
    if (!m) return 0;
    const fn = SIM.state.params["SERVO" + m[1] + "_FUNCTION"];
    return fn >= 33 && fn <= 36 ? fn - 32 : 0;
  };
  // 모터선 세 가닥의 순서가 회전 방향을 정한다 (두 가닥을 바꾸면 반대로 돈다)
  SIM.motorDir = (pos) => { const o = SIM.state.wiring.motorWires[pos]; return !o ? null : ["123", "231", "312"].includes(o) ? "ccw" : "cw"; };
  // 물리적 구동 상태: 돌 수 있는지, 실제 회전 방향, 추력 계수(+1 정상, 음수=바람이 위로)
  SIM.motorPhysical = (pos) => {
    const st = SIM.state, motor = SIM.partAt("motor@" + pos), prop = SIM.partAt("prop@" + pos), dir = SIM.motorDir(pos);
    const lost = SIM.flight && SIM.flight.active && SIM.flight.lost[pos];
    const canSpin = !!motor && SIM.has("esc@" + pos) && SIM.power().pdb && st.wiring.escPwr[pos] === "ok" && !!dir;
    let thrust = 0;
    if (prop && !lost && dir) { thrust = prop.dir === dir ? 1 : -0.5; if (st.flip[prop.id]) thrust *= 0.55; }
    return { canSpin, dir: dir || "cw", prop: prop && !lost ? prop.dir : null, thrust, loose: !!motor && !!dir && motor.thread !== dir };
  };

  const ROT_DEG = (n) => n * 90;
  // FC 장착 방향과 AHRS_ORIENTATION 설정의 차이 (rad, 오른쪽 회전 +)
  SIM.mountErr = () => ((ROT_DEG(SIM.state.rot.fc) - SIM.state.params.AHRS_ORIENTATION * 45) * Math.PI) / 180;
  SIM.headingErr = () => {
    if (SIM.compassExt()) return ((ROT_DEG(SIM.state.rot.gps) - SIM.state.params.COMPASS_ORIENT * 45) * Math.PI) / 180;
    return SIM.mountErr(); // 내장 나침반은 FC와 함께 돈다
  };

  // ---------- 검사 (정답 확인용) ----------
  SIM.hardwareCheck = () => {
    const st = SIM.state, w = st.wiring, out = [], exp = SIM.expected();
    const add = (lvl, t, d) => out.push({ lvl, t, d });
    const dirKo = (d) => (d === "cw" ? "시계(CW)" : "반시계(CCW)");
    if (st.params.FRAME_TYPE === 0) add("bad", "프레임 타입", "기체는 X형 암 배치인데 FRAME_TYPE이 Plus로 설정되어 있습니다.");
    for (const id of SIM.POS_IDS) {
      const n = SIM.POS[id].name, e = exp[id], motor = SIM.partAt("motor@" + id);
      if (!motor) { add("bad", n + " 모터", "모터가 장착되지 않았습니다."); continue; }
      if (!SIM.has("esc@" + id)) { add("bad", n + " ESC", "ESC가 장착되지 않았습니다."); continue; }
      if (motor.thread !== e.spin) add("bad", n + " 모터 종류", "축 나사 방향이 반대인 모터입니다. 이 위치는 " + dirKo(e.spin) + " 회전용 모터가 필요합니다. 비행 중 프로펠러 너트가 풀립니다.");
      else add("ok", n + " 모터 종류", dirKo(e.spin) + " 회전용");
      const num = SIM.motorNumForPos(id), port = w.plug["esc" + id];
      if (!port) add("bad", n + " ESC 신호선", "FC에 연결되지 않았습니다.");
      else if (num !== e.num) add("bad", n + " ESC 신호선", port + " → " + (num ? "Motor" + num : "모터 출력 없음") + ". 이 위치는 Motor" + e.num + " 신호가 필요합니다.");
      else add("ok", n + " ESC 신호선", port + " (Motor" + num + ")");
      if (w.escPwr[id] === "rev") add("bad", n + " ESC 전원선", "극성이 반대로 납땜되어 있습니다 (빨강선이 − 패드).");
      else if (!w.escPwr[id]) add("bad", n + " ESC 전원선", "PDB 패드에 연결되지 않았습니다.");
      else add("ok", n + " ESC 전원선", "PDB 패드, 극성 일치");
      const dir = SIM.motorDir(id);
      if (!dir) add("bad", n + " 모터선", "모터 3상 선이 ESC에 연결되지 않았습니다.");
      else if (dir !== e.spin) add("bad", n + " 모터 회전 방향", "현재 " + dirKo(dir) + ". 이 위치는 " + dirKo(e.spin) + " 방향이어야 합니다. 모터선 두 가닥을 바꾸세요.");
      else add("ok", n + " 모터 회전 방향", dirKo(e.spin));
      const pr = SIM.partAt("prop@" + id);
      if (!pr) add("bad", n + " 프로펠러", "프로펠러가 없습니다.");
      else {
        if (pr.dir !== e.spin) add("bad", n + " 프로펠러 종류", pr.dir.toUpperCase() + "용 프로펠러가 달려 있습니다. 이 위치는 " + e.spin.toUpperCase() + "용이 필요합니다.");
        else add("ok", n + " 프로펠러 종류", e.spin.toUpperCase() + "용");
        if (st.flip[pr.id]) add("bad", n + " 프로펠러 방향", "위아래가 뒤집혀 끼워져 있습니다.");
      }
    }
    if (!SIM.has("fc")) add("bad", "비행 컨트롤러", "FC가 장착되지 않았습니다.");
    else if (Math.abs(Math.sin(SIM.mountErr() / 2)) > 0.01) add("bad", "FC 장착 방향", "화살표가 앞에서 오른쪽으로 " + ROT_DEG(st.rot.fc) + "° 돌아가 있고 AHRS_ORIENTATION은 " + ORI[st.params.AHRS_ORIENTATION] + "입니다.");
    else add("ok", "FC 장착 방향", st.rot.fc ? "돌려 달았지만 AHRS_ORIENTATION으로 보정됨" : "화살표가 앞쪽");
    if (!SIM.has("battery")) add("bad", "배터리", "장착되지 않았습니다.");
    else if (!w.batt) add("bad", "배터리 커넥터", "연결되지 않았습니다.");
    else if (w.batt === "pdb") add("bad", "배터리 커넥터", "PDB에 직접 연결되어 파워 모듈을 거치지 않습니다. FC에 전원과 전압 정보가 가지 않습니다.");
    else add("ok", "배터리 커넥터", "파워 모듈 입력");
    if (!SIM.has("pm")) add("bad", "파워 모듈", "장착되지 않았습니다.");
    else {
      if (w.pmOut === "rev") add("bad", "파워 모듈 출력선", "PDB 배터리 패드에 극성이 반대로 연결되어 있습니다.");
      else if (!w.pmOut) add("bad", "파워 모듈 출력선", "PDB 배터리 패드에 연결되지 않았습니다.");
      else add("ok", "파워 모듈 출력선", "PDB 배터리 패드, 극성 일치");
      if (w.plug.pm !== "POWER") add("bad", "파워 모듈 케이블", w.plug.pm ? w.plug.pm + " 포트에 꽂혀 있습니다. POWER 포트여야 합니다." : "FC에 연결되지 않았습니다.");
      else add("ok", "파워 모듈 케이블", "POWER 포트");
    }
    if (!SIM.has("rx")) add("bad", "수신기", "장착되지 않았습니다.");
    else if (w.plug.rx !== "RC IN") add("bad", "수신기 신호선", w.plug.rx ? w.plug.rx + " 포트에 꽂혀 있습니다. RC IN이어야 합니다." : "FC에 연결되지 않았습니다.");
    else add("ok", "수신기 신호선", "RC IN 포트");
    if (!SIM.has("gps")) add("bad", "GPS · 나침반", "장착되지 않았습니다.");
    else {
      if (w.plug.gps !== "GPS") add("bad", "GPS 케이블 (6핀)", w.plug.gps ? w.plug.gps + " 포트에 꽂혀 있습니다. GPS 포트여야 합니다." : "FC에 연결되지 않았습니다.");
      else add("ok", "GPS 케이블 (6핀)", "GPS 포트");
      if (w.plug.compass !== "I2C") add("bad", "나침반 케이블 (4핀)", w.plug.compass ? w.plug.compass + " 포트에 꽂혀 있습니다. I2C 포트여야 합니다." : "FC에 연결되지 않았습니다. 외장 나침반을 쓰지 못합니다.");
      else if (Math.abs(Math.sin(SIM.headingErr() / 2)) > 0.01) add("bad", "GPS 장착 방향", "화살표가 앞에서 오른쪽으로 " + ROT_DEG(st.rot.gps) + "° 돌아가 있습니다 (COMPASS_ORIENT " + ORI[st.params.COMPASS_ORIENT] + ").");
      else add("ok", "나침반 케이블 (4핀)", "I2C 포트, 방향 일치");
    }
    if (!SIM.has("switch")) add(st.params.BRD_SAFETYENABLE ? "bad" : "warn", "안전 스위치", "장착되지 않았습니다." + (st.params.BRD_SAFETYENABLE ? " BRD_SAFETYENABLE=1이면 시동을 걸 수 없습니다." : ""));
    else if (w.plug.switch !== "SWITCH") add(st.params.BRD_SAFETYENABLE ? "bad" : "warn", "안전 스위치 케이블", w.plug.switch ? w.plug.switch + " 포트에 꽂혀 있습니다. SWITCH 포트여야 합니다." : "FC에 연결되지 않았습니다.");
    else add("ok", "안전 스위치", "SWITCH 포트");
    if (!SIM.has("buzzer")) add("warn", "부저", "장착되지 않았습니다. 시동·경고음을 들을 수 없습니다.");
    else if (w.plug.buzzer !== "BUZZER") add("warn", "부저 케이블", "BUZZER 포트에 연결되지 않았습니다.");
    else add("ok", "부저", "BUZZER 포트");
    if (!SIM.has("telem")) add("warn", "텔레메트리", "장착되지 않았습니다. (선택 장비)");
    else if (!/^TELEM/.test(w.plug.telem)) add("warn", "텔레메트리 케이블", "TELEM1 또는 TELEM2 포트여야 합니다. (선택 장비)");
    else add("ok", "텔레메트리", w.plug.telem + " 포트");
    return out;
  };

  // 시동 전 점검 (FC가 스스로 알아낼 수 있는 것만)
  SIM.prearm = (mode) => {
    const st = SIM.state, p = st.params, pw = SIM.power(), f = [];
    if (!pw.fc) return ["비행 컨트롤러가 없습니다"];
    if (!pw.fcBatt) return ["FC에 배터리 전원이 들어오지 않습니다"];
    if (p.FRAME_CLASS !== 1) f.push("PreArm: Check frame class and type (FRAME_CLASS가 Quad가 아님)");
    if (![33, 34, 35, 36].every((fn) => [1, 2, 3, 4, 5, 6, 7, 8].some((n) => p["SERVO" + n + "_FUNCTION"] === fn))) f.push("PreArm: Check SERVOx_FUNCTION (모터 출력 4개가 모두 지정되지 않음)");
    if (!SIM.safetyOff()) f.push("PreArm: Hardware safety switch (안전 스위치가 해제되지 않음)");
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
    st.install = fresh.install; st.rot = { fc: 0, gps: 0 }; st.flip = fresh.flip; st.wiring = fresh.wiring;
    for (let i = 1; i <= 8; i++) st.params["SERVO" + i + "_FUNCTION"] = i <= 4 ? 32 + i : 0;
    const exp = SIM.expected(), w = st.wiring;
    const take = (type, key, val) => parts.find((p) => p.type === type && p[key] === val && !st.install[p.id]);
    SIM.POS_IDS.forEach((id, i) => {
      st.install[take("motor", "thread", exp[id].spin).id] = "motor@" + id;
      st.install["esc" + (i + 1)] = "esc@" + id;
      st.install[take("prop", "dir", exp[id].spin).id] = "prop@" + id;
      w.plug["esc" + id] = "MAIN OUT " + exp[id].num;
      w.escPwr[id] = "ok";
      w.motorWires[id] = exp[id].spin === "ccw" ? "123" : "132";
    });
    for (const id of ["fc", "pm", "battery", "gps", "rx", "telem", "buzzer", "switch"]) st.install[id] = id;
    Object.assign(w.plug, { pm: "POWER", gps: "GPS", compass: "I2C", rx: "RC IN", telem: "TELEM1", buzzer: "BUZZER", switch: "SWITCH" });
    w.batt = "pm"; w.pmOut = "ok";
    SIM.selected = null;
    SIM.emit();
  };
  SIM.autoConfigure = () => {
    const st = SIM.state, p = st.params, tx = SIM.TX;
    Object.assign(p, { FRAME_CLASS: 1, FRAME_TYPE: 1, AHRS_ORIENTATION: 0, COMPASS_ORIENT: 0, ARMING_CHECK: 1, BRD_SAFETYENABLE: 1 });
    for (const c of [1, 2, 4]) { p["RC" + c + "_MIN"] = tx.c[c] - tx.amp[c]; p["RC" + c + "_MAX"] = tx.c[c] + tx.amp[c]; p["RC" + c + "_TRIM"] = tx.c[c]; p["RC" + c + "_REVERSED"] = 0; }
    Object.assign(p, { RC3_MIN: tx.thrMin, RC3_MAX: tx.thrMax, RC3_TRIM: tx.thrMin, RC3_REVERSED: 0, RCMAP_ROLL: 1, RCMAP_PITCH: 2, RCMAP_THROTTLE: 3, RCMAP_YAW: 4, FLTMODE_CH: 5 });
    Object.assign(p, { FLTMODE1: 0, FLTMODE2: 0, FLTMODE3: 0, FLTMODE4: 2, FLTMODE5: 2, FLTMODE6: 5 });
    Object.assign(p, { FS_THR_ENABLE: 1, FS_THR_VALUE: 975, BATT_MONITOR: 4, BATT_CAPACITY: 16000, BATT_LOW_VOLT: 21, BATT_FS_LOW_ACT: 2 });
    Object.assign(p, { COMPASS_OFS_X: -42, COMPASS_OFS_Y: 118, COMPASS_OFS_Z: 63 });
    for (const k in D) if (/^(ATC_|MOT_|ANGLE|PILOT|RTL)/.test(k)) p[k] = D[k].d;
    st.cal = { accel: true, compass: true, radio: true, esc: true };
    SIM.emit();
  };
  SIM.resetAll = () => { SIM.state = defaults(); SIM.selected = null; SIM.faults = null; SIM.emit(); };

  // ---------- 고장 진단 훈련 ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const adj = () => { const a = pick(["FR", "RL"]), b = pick(["RR", "FL"]); return [a, b]; };
  const swapSlots = (ta, tb) => { const i = SIM.state.install, pa = SIM.partAt(ta), pb = SIM.partAt(tb); i[pa.id] = tb; i[pb.id] = ta; };
  const FAULTS = [
    () => { const a = pick(SIM.POS_IDS), w = SIM.state.wiring; w.motorWires[a] = w.motorWires[a] === "123" ? "213" : w.motorWires[a] === "132" ? "123" : "132"; return { desc: SIM.POS[a].name + " 모터선 두 가닥이 바뀌어 반대로 돕니다.", present: () => SIM.motorDir(a) !== SIM.expected()[a].spin }; },
    () => { const [a, b] = adj(), w = SIM.state.wiring, t = w.plug["esc" + a]; w.plug["esc" + a] = w.plug["esc" + b]; w.plug["esc" + b] = t; return { desc: SIM.POS[a].name + "과 " + SIM.POS[b].name + " ESC 신호선이 서로 바뀌어 꽂혀 있습니다.", present: () => [a, b].some((x) => SIM.motorNumForPos(x) !== SIM.expected()[x].num) }; },
    () => { const [a, b] = adj(); swapSlots("prop@" + a, "prop@" + b); return { desc: SIM.POS[a].name + "과 " + SIM.POS[b].name + "의 프로펠러 종류가 서로 바뀌어 달려 있습니다.", present: () => [a, b].some((x) => { const p = SIM.partAt("prop@" + x); return !p || p.dir !== SIM.expected()[x].spin; }) }; },
    () => { const a = pick(SIM.POS_IDS), pr = SIM.partAt("prop@" + a); SIM.state.flip[pr.id] = true; return { desc: SIM.POS[a].name + " 프로펠러가 뒤집혀 끼워져 있습니다.", present: () => { const p = SIM.partAt("prop@" + a); return !!p && SIM.state.flip[p.id]; } }; },
    () => { const [a, b] = adj(); swapSlots("motor@" + a, "motor@" + b); return { desc: SIM.POS[a].name + "과 " + SIM.POS[b].name + "의 모터 종류(축 나사 방향)가 바뀌어 있습니다. 비행 중 프로펠러가 풀려 나갑니다.", present: () => [a, b].some((x) => { const m = SIM.partAt("motor@" + x); return !m || m.thread !== SIM.expected()[x].spin; }) }; },
    () => { const a = pick(SIM.POS_IDS); SIM.state.wiring.escPwr[a] = "rev"; return { desc: SIM.POS[a].name + " ESC 전원선의 극성이 반대로 납땜되어 있습니다.", present: () => SIM.state.wiring.escPwr[a] !== "ok" }; },
    () => { SIM.state.rot.fc = pick([1, 2, 3]); return { desc: "FC가 돌아간 방향으로 장착되어 있는데 AHRS_ORIENTATION 보정이 없습니다.", present: () => Math.abs(Math.sin(SIM.mountErr() / 2)) > 0.01 }; },
    () => { SIM.state.rot.gps = 2; return { desc: "GPS·나침반 모듈이 뒤를 향해 장착되어 있습니다.", present: () => Math.abs(Math.sin(SIM.headingErr() / 2)) > 0.01 }; },
    () => { SIM.state.wiring.plug.rx = "SBUS OUT"; return { desc: "수신기 신호선이 RC IN이 아닌 SBUS OUT 포트에 꽂혀 있습니다.", present: () => !SIM.rxOk() }; },
    () => { const w = SIM.state.wiring; w.plug.gps = w.plug.telem === "TELEM2" ? "TELEM1" : "TELEM2"; return { desc: "GPS 케이블이 TELEM 포트에 꽂혀 있습니다.", present: () => !SIM.gpsOk() }; },
    () => { SIM.state.wiring.plug.switch = "ADC 3.3V"; return { desc: "안전 스위치 케이블이 SWITCH가 아닌 ADC 3.3V 포트에 꽂혀 있습니다.", present: () => SIM.state.params.BRD_SAFETYENABLE === 1 && !SIM.switchOk() }; },
    () => { SIM.state.wiring.plug.pm = "SERIAL 4/5"; return { desc: "파워 모듈 케이블이 SERIAL 4/5 포트에 꽂혀 있습니다.", present: () => SIM.state.wiring.plug.pm !== "POWER" }; },
    () => { SIM.state.params.RC2_REVERSED = 1; return { desc: "RC2(피치) 채널이 반전되어 있습니다 (RC2_REVERSED=1).", present: () => SIM.state.params.RC2_REVERSED === 1 }; },
    () => { SIM.state.params.FS_THR_ENABLE = 0; return { desc: "라디오 페일세이프가 꺼져 있습니다 (FS_THR_ENABLE=0).", present: () => SIM.state.params.FS_THR_ENABLE === 0 }; },
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
