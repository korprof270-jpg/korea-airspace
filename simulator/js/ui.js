// 드론 정비 시뮬레이터 — 화면(메뉴·패널·HUD·송신기)
(function () {
  const SIM = window.SIM, $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ui = (SIM.ui = { tab: "hw", page: { hw: "parts", sw: "frame", test: "preflight" }, accel: null, compass: null, radio: null, paramFilter: "", mt: { pct: 12, dur: 2 } });
  const P = () => SIM.state.params;

  const NAV = {
    hw: [["parts", "부품·조립"], ["wiring", "배선"], ["inspect", "정답 확인"]],
    sw: [["frame", "프레임 타입"], ["accel", "가속도계 교정"], ["compass", "나침반 교정"], ["radio", "라디오 교정"], ["esccal", "ESC 교정"], ["modes", "비행 모드"], ["failsafe", "페일세이프"], ["battery", "배터리 모니터"], ["servo", "서보 출력"], ["orient", "보드 방향"], ["tuning", "튜닝"], ["params", "전체 파라미터"]],
    test: [["preflight", "시동 전 점검"], ["motor", "모터 테스트"], ["sensor", "자세 센서"], ["flight", "비행 테스트"], ["fault", "고장 진단 훈련"]],
  };

  SIM.toast = function (msg, kind) {
    const t = $("#toast");
    t.textContent = msg; t.className = "toast show " + (kind || "");
    clearTimeout(SIM.toast.h); SIM.toast.h = setTimeout(() => (t.className = "toast"), 3200);
  };
  SIM.onLog = (text, kind) => { SIM.toast(text, kind); const l = $("#msglog"); if (l) l.innerHTML = logHtml(); };
  const logHtml = () => SIM.msgs.slice(0, 8).map((m) => '<li class="' + m.kind + '">' + esc(m.text) + "</li>").join("") || '<li class="muted">메시지가 없습니다.</li>';

  // ---------- 작은 조각들 ----------
  const sel = (id, act, opts, val, arg) => '<select id="' + id + '" data-change="' + act + '" data-arg="' + (arg || "") + '">' + Object.entries(opts).map(([k, v]) => '<option value="' + k + '"' + (String(k) === String(val) ? " selected" : "") + ">" + esc(v) + "</option>").join("") + "</select>";
  const paramSel = (k) => sel("p-" + k, "param", SIM.PARAM_DEFS[k].opts, P()[k], k);
  const paramNum = (k) => { const d = SIM.PARAM_DEFS[k]; return '<input id="p-' + k + '" type="number" data-change="param" data-arg="' + k + '" value="' + P()[k] + '" step="' + (d.step || 1) + '" min="' + d.min + '" max="' + d.max + '">'; };
  const prow = (k, label) => '<label class="row" for="p-' + k + '"><span><b>' + esc(label || SIM.PARAM_DEFS[k].desc) + "</b><code>" + k + "</code></span>" + (SIM.PARAM_DEFS[k].opts ? paramSel(k) : paramNum(k)) + "</label>";
  const btn = (act, label, cls, arg, dis) => '<button type="button" class="btn ' + (cls || "") + '" data-act="' + act + '" data-arg="' + (arg === undefined ? "" : arg) + '"' + (dis ? " disabled" : "") + ">" + label + "</button>";
  const note = (t, cls) => '<p class="note ' + (cls || "") + '">' + t + "</p>";
  const checks = (items) => '<ul class="checks">' + items.map((i) => '<li class="' + i.lvl + '"><span class="mark">' + (i.lvl === "ok" ? "✓" : i.lvl === "warn" ? "!" : "✕") + "</span><div><b>" + esc(i.t) + "</b><span>" + esc(i.d) + "</span></div></li>").join("") + "</ul>";
  const calChip = (ok) => '<span class="chip ' + (ok ? "ok" : "bad") + '">' + (ok ? "교정됨" : "미교정") + "</span>";

  // ---------- 하드웨어 ----------
  function pgParts() {
    const st = SIM.state, s = SIM.selected && SIM.part(SIM.selected);
    let h = "";
    if (s) {
      const slot = st.install[s.id];
      h += '<div class="card sel"><h3>' + esc(s.name) + "</h3>";
      if (slot) {
        h += '<p class="where">' + SIM.slotName(slot) + '</p><div class="btns">';
        if (s.type === "fc" || s.type === "gps") h += btn("rotate", "90° 돌려 달기", "", s.id);
        if (s.type === "prop") h += btn("flip", "뒤집어 끼우기", "", s.id);
        h += btn("remove", "분리", "", s.id) + "</div>";
      } else {
        h += '<div class="btns">';
        for (const sl of SIM.slotsFor(s)) { const err = SIM.canInstall(s, sl); h += btn("install", SIM.slotName(sl), "", sl, !!err); }
        if (s.type === "prop") h += btn("flip", "뒤집기", "", s.id);
        h += "</div>";
      }
      h += "</div>";
    }
    const groups = [["구동부", ["motor", "esc", "prop"]], ["제어·전원", ["fc", "pm", "battery"]], ["주변장치", ["gps", "rx", "telem"]]];
    for (const [g, types] of groups) {
      h += "<h4>" + g + '</h4><div class="partlist">';
      for (const p of SIM.PARTS.filter((x) => types.includes(x.type))) {
        const slot = st.install[p.id];
        h += '<button type="button" class="part' + (SIM.selected === p.id ? " on" : "") + '" data-act="select" data-arg="' + p.id + '"><span>' + esc(p.name) + '</span><span class="chip ' + (slot ? "ok" : "") + '">' + (slot ? SIM.slotName(slot) : "작업대") + "</span></button>";
      }
      h += "</div>";
    }
    h += '<div class="btns foot">' + btn("autoAssemble", "정답대로 자동 조립") + btn("resetAll", "전체 분해·초기화", "ghost") + "</div>";
    return h;
  }
  const off = (t) => '<span class="muted">' + t + "</span>";
  function pgWiring() {
    const st = SIM.state, w = st.wiring, fc = SIM.has("fc");
    let h = "<h4>배터리 · 파워 모듈 · PDB</h4>";
    h += '<label class="row" for="w-batt"><span><b>배터리 커넥터</b></span>' + (SIM.has("battery") ? sel("w-batt", "wire", Object.assign({ "": "분리됨" }, SIM.has("pm") ? { pm: "파워 모듈 입력 커넥터" } : {}, { pdb: "PDB 배터리 패드에 직접" }), w.batt, "batt") : off("배터리 없음")) + "</label>";
    const pol = { "": "미연결", ok: "빨강→＋ / 검정→－", rev: "빨강→－ / 검정→＋" };
    h += '<label class="row" for="w-pmOut"><span><b>파워 모듈 출력선</b><code>→ PDB 배터리 패드</code></span>' + (SIM.has("pm") ? sel("w-pmOut", "wire", pol, w.pmOut, "pmOut") : off("파워 모듈 없음")) + "</label>";
    h += "<h4>ESC 전원선 → PDB 패드</h4>";
    for (const id of SIM.POS_IDS) h += '<label class="row" for="w-pwr-' + id + '"><span><b>' + SIM.POS[id].name + " ESC</b></span>" + (SIM.has("esc@" + id) ? sel("w-pwr-" + id, "escPwr", pol, w.escPwr[id], id) : off("ESC 없음")) + "</label>";
    h += "<h4>모터선 ①②③ → ESC 단자 순서</h4>";
    const perms = { "": "미연결" }; SIM.WIRE_PERMS.forEach((p) => (perms[p] = p.split("").join(" - ")));
    for (const id of SIM.POS_IDS) h += '<label class="row" for="w-mw-' + id + '"><span><b>' + SIM.POS[id].name + " 모터</b></span>" + (SIM.has("esc@" + id) && SIM.has("motor@" + id) ? sel("w-mw-" + id, "motorWires", perms, w.motorWires[id], id) : off("모터·ESC 필요")) + "</label>";
    h += "<h4>FC 포트에 꽂는 케이블</h4>";
    for (const c in SIM.CABLES) {
      const cb = SIM.CABLES[c], ports = { "": "미연결" };
      SIM.PORTS[cb.conn].forEach((p) => (ports[p] = p));
      h += '<label class="row" for="w-plug-' + c + '"><span><b>' + cb.name + "</b><code>" + SIM.CONN_NAMES[cb.conn] + " 커넥터</code></span>" + (SIM.cableReady(c) ? sel("w-plug-" + c, "plug", ports, w.plug[c], c) : off(fc ? "부품 없음" : "FC 없음")) + "</label>";
    }
    return h;
  }
  function pgInspect() {
    if (!ui.showAnswer) return '<div class="btns">' + btn("answer", "조립·배선 정답 확인", "primary") + "</div>";
    const items = SIM.hardwareCheck(), bad = items.filter((i) => i.lvl === "bad").length;
    return '<div class="verdict ' + (bad ? "bad" : "ok") + '">' + (bad ? "조립·배선 오류 " + bad + "건" : "조립·배선 이상 없음") + "</div>" + checks(items) + '<div class="btns">' + btn("answerHide", "가리기", "ghost") + "</div>";
  }

  // ---------- 소프트웨어 ----------
  function pgFrame() {
    const f = SIM.frame();
    let h = prow("FRAME_CLASS") + prow("FRAME_TYPE");
    h += '<label class="row" for="expect"><span><b>3D 화면에 모터 배치도 표시</b></span><input id="expect" type="checkbox" data-change="expect"' + (SIM.scene.showExpect ? " checked" : "") + "></label>";
    h += '<table class="tbl"><thead><tr><th>모터</th><th>테스트 순서</th><th>위치</th><th>회전</th></tr></thead><tbody>';
    f.order.forEach((n, i) => { const m = f.motors[n]; h += "<tr><td>Motor" + n + "</td><td>" + "ABCD"[i] + "</td><td>" + (m.z < 0 ? "앞" : m.z > 0 ? "뒤" : "") + (m.x && m.z ? "-" : "") + (m.x > 0 ? "오른쪽" : m.x < 0 ? "왼쪽" : "") + "</td><td>" + (m.spin === "cw" ? "↻ CW" : "↺ CCW") + "</td></tr>"; });
    h += "</tbody></table>";
    return h;
  }
  const ACCEL = [["level", "기체를 수평으로 놓으세요 (LEVEL)"], ["left", "왼쪽 면이 바닥을 향하게 세우세요 (LEFT)"], ["right", "오른쪽 면이 바닥을 향하게 세우세요 (RIGHT)"], ["nosedown", "기수를 아래로 세우세요 (NOSE DOWN)"], ["noseup", "기수를 위로 세우세요 (NOSE UP)"], ["back", "뒤집어 놓으세요 (BACK)"]];
  const POSE_KO = { level: "수평", left: "왼쪽 면", right: "오른쪽 면", nosedown: "기수 아래", noseup: "기수 위", back: "뒤집기" };
  function pgAccel() {
    const a = ui.accel;
    let h = "<p>상태 " + calChip(SIM.state.cal.accel) + "</p>";
    if (!a) return h + '<div class="btns">' + btn("accelStart", "가속도계 교정 시작", "primary") + "</div>";
    h += '<div class="card"><p class="muted small">단계 ' + (a.step + 1) + " / 6</p><h3>" + ACCEL[a.step][1] + "</h3><p>현재 기체 자세: <b>" + (POSE_KO[SIM.scene.poseName] || "임의 자세") + "</b></p>";
    h += '<div class="btns">' + ACCEL.map(([k]) => btn("pose", POSE_KO[k], SIM.scene.poseName === k ? "on" : "", k)).join("") + "</div>";
    h += '<div class="btns">' + btn("accelNext", "이 자세로 놓았음 (Click when Done)", "primary") + btn("accelCancel", "취소", "ghost") + "</div></div>";
    return h;
  }
  function pgCompass() {
    const c = ui.compass;
    let h = "<p>상태 " + calChip(SIM.state.cal.compass) + ' <span class="muted small">' + (SIM.compassExt() ? "외장 나침반 사용" : "내장 나침반 사용") + "</span></p>";
    if (!c) {
      h += '<div class="btns">' + btn("compassStart", "나침반 교정 시작", "primary") + "</div>";
      if (SIM.state.cal.compass) h += '<p class="mono small">OFS X ' + P().COMPASS_OFS_X + " · Y " + P().COMPASS_OFS_Y + " · Z " + P().COMPASS_OFS_Z + "</p>";
      return h;
    }
    h += '<div class="card"><h3>기체를 모든 방향으로 돌리세요</h3><div class="bar"><i id="compass-bar"></i></div><p id="compass-pct" class="mono">0%</p>';
    h += '<div class="btns">' + btn("compassAuto", "자동으로 돌리기") + btn("compassCancel", "취소", "ghost") + "</div></div>";
    return h;
  }
  const CH = [[1, "Roll"], [2, "Pitch"], [3, "Throttle"], [4, "Yaw"], [5, "Mode (CH5)"]];
  function pgRadio() {
    const r = ui.radio;
    let h = "<p>상태 " + calChip(SIM.state.cal.radio) + "</p>";
    if (!SIM.rxOk()) h += note("수신기 신호가 없습니다 (No RC).", "bad");
    h += '<div class="rcbars">' + CH.map(([c, n]) => '<div class="rc"><span>' + n + '</span><div class="bar"><i id="rc' + c + '"></i></div><code id="rcv' + c + '">----</code></div>').join("") + "</div>";
    h += r ? note("모든 스틱과 스위치를 끝에서 끝까지 움직인 다음, 스틱을 가운데(스로틀은 맨 아래)에 두고 완료를 누르세요.") + '<div class="btns">' + btn("radioDone", "Click when Done", "primary") + btn("radioCancel", "취소", "ghost") + "</div>"
      : '<div class="btns">' + btn("radioStart", "Calibrate Radio", "primary") + "</div>";
    h += '<table class="tbl"><thead><tr><th>채널</th><th>MIN</th><th>TRIM</th><th>MAX</th><th>반전</th></tr></thead><tbody>';
    for (let c = 1; c <= 4; c++) h += "<tr><td>RC" + c + "</td><td>" + P()["RC" + c + "_MIN"] + "</td><td>" + P()["RC" + c + "_TRIM"] + "</td><td>" + P()["RC" + c + "_MAX"] + '</td><td><input id="rev' + c + '" aria-label="RC' + c + ' 반전" type="checkbox" data-change="rev" data-arg="' + c + '"' + (P()["RC" + c + "_REVERSED"] ? " checked" : "") + "></td></tr>";
    h += "</tbody></table>";
    return h;
  }
  function pgEscCal() {
    const pw = SIM.power();
    let h = "<p>상태 " + calChip(SIM.state.cal.esc) + "</p>";
    h += "<ol class=\"steps\"><li>프로펠러를 모두 분리합니다.</li><li>송신기 스로틀을 최대로 올리고 배터리를 연결합니다.</li><li>ESC 비프음이 나면 스로틀을 최저로 내립니다.</li><li>긴 비프음이 끝나면 배터리를 분리합니다.</li></ol>";
    const props = SIM.POS_IDS.some((id) => SIM.has("prop@" + id));
    h += '<div class="btns">' + btn("escCal", "ESC 교정 실행", "primary") + "</div>";
    if (!pw.main)
    if (props)
    return h;
  }
  function pgModes() {
    let h = '<p>현재 CH' + P().FLTMODE_CH + ' PWM <code id="mode-pwm">----</code> → <b id="mode-cur"></b></p>';
    const rng = ["0–1230", "1231–1360", "1361–1490", "1491–1620", "1621–1749", "1750+"];
    for (let i = 1; i <= 6; i++) h += '<label class="row moderow" id="mrow' + i + '" for="p-FLTMODE' + i + '"><span><b>비행 모드 ' + i + "</b><code>PWM " + rng[i - 1] + "</code></span>" + paramSel("FLTMODE" + i) + "</label>";
    return h;
  }
  function pgFailsafe() {
    let h = "<h4>라디오 (스로틀) 페일세이프</h4>" + prow("FS_THR_ENABLE") + prow("FS_THR_VALUE");
    h += '<p>현재 스로틀 PWM <code id="fs-pwm">----</code> <span id="fs-state" class="chip"></span></p>';
    h += "<h4>배터리 페일세이프</h4>" + prow("BATT_LOW_VOLT") + prow("BATT_FS_LOW_ACT");
    if (!P().BATT_MONITOR)
    return h;
  }
  function pgBattery() {
    const pw = SIM.power();
    let h = prow("BATT_MONITOR") + prow("BATT_CAPACITY");
    h += '<p>측정 전압 <code id="batt-v">--</code></p>';
    if (P().BATT_MONITOR && !pw.battSense)
    return h;
  }
  function pgServo() {
    let h = "";
    for (let i = 1; i <= 8; i++) h += prow("SERVO" + i + "_FUNCTION", "MAIN OUT " + i);
    return h;
  }
  function pgOrient() {
    let h = prow("AHRS_ORIENTATION") + prow("COMPASS_ORIENT");
    h += "<p>FC 화살표: 앞에서 오른쪽으로 <b>" + SIM.state.rot.fc * 90 + "°</b> · GPS 화살표: <b>" + SIM.state.rot.gps * 90 + "°</b></p>";
    return h;
  }
  function pgTuning() {
    const ks = ["ATC_RAT_RLL_P", "ATC_RAT_RLL_I", "ATC_RAT_RLL_D", "ATC_RAT_PIT_P", "ATC_RAT_PIT_I", "ATC_RAT_PIT_D", "ATC_RAT_YAW_P", "ATC_RAT_YAW_I", "ATC_ANG_RLL_P", "ATC_ANG_PIT_P", "ANGLE_MAX", "PILOT_SPEED_UP", "RTL_ALT", "MOT_SPIN_ARM", "MOT_SPIN_MIN"];
    return ks.map((k) => prow(k)).join("") + '<div class="btns">' + btn("tuneReset", "튜닝 값 기본으로", "ghost") + "</div>";
  }
  function pgParams() {
    const f = ui.paramFilter.toUpperCase();
    let h = '<input id="pfilter" type="search" placeholder="파라미터 검색 (예: RC3, FS_, BATT)" data-input="pfilter" value="' + esc(ui.paramFilter) + '"><div id="plist">';
    for (const k in SIM.PARAM_DEFS) if (!f || k.includes(f)) h += prow(k);
    return h + "</div>";
  }

  // ---------- 테스트 ----------
  function pgPreflight() {
    const fails = SIM.prearm(0);
    let h = '<div class="verdict ' + (fails.length ? "bad" : "ok") + '">' + (fails.length ? "시동 불가 · " + fails.length + "건" : "시동 가능 (Ready to Arm)") + "</div>";
    h += fails.length ? checks(fails.map((f) => ({ lvl: "bad", t: f, d: "" }))) : checks([{ lvl: "ok", t: "모든 PreArm 점검 통과", d: P().ARMING_CHECK ? "" : "ARMING_CHECK=0" }]);
    return h + '<div class="btns foot">' + btn("autoConfigure", "소프트웨어 설정 자동 완료") + "</div>";
  }
  function pgMotor() {
    let h = '<label class="row" for="mt-pct"><span><b>스로틀 %</b></span><input id="mt-pct" type="number" min="5" max="40" value="' + ui.mt.pct + '" data-change="mtPct"></label>';
    h += '<label class="row" for="mt-dur"><span><b>시간 (초)</b></span><input id="mt-dur" type="number" min="1" max="10" value="' + ui.mt.dur + '" data-change="mtDur"></label>';
    h += '<div class="btns">' + ["A", "B", "C", "D"].map((l) => btn("mt", "Test motor " + l, "", l)).join("") + "</div>";
    h += '<div class="btns">' + btn("mtSeq", "Test all in Sequence") + btn("mtAll", "Test all motors") + btn("mtStop", "Stop", "ghost") + "</div>";
    return h;
  }
  function pgSensor() {
    return '<div class="btns">' + btn("tilt", "수평", "", "0,0") + btn("tilt", "오른쪽으로 25°", "", "25,0") + btn("tilt", "왼쪽으로 25°", "", "-25,0") + btn("tilt", "기수 들기 25°", "", "0,25") + btn("tilt", "기수 숙이기 25°", "", "0,-25") + "</div>";
  }
  function pgFlight() {
    const F = SIM.flight;
    if (!F.active) {
      const fails = SIM.prearm(0);
      let h = "";
      h += '<div class="btns">' + btn("flightStart", "시험장으로 이동", "primary") + "</div>";
      if (fails.length) h += "<h4>현재 시동을 막는 항목</h4>" + checks(fails.map((f) => ({ lvl: "bad", t: f, d: "" })));
      h += '<h4>조종 방법</h4><ul class="plain"><li>왼쪽 스틱: 스로틀(상하) · 요(좌우) — 키보드 W/S · A/D</li><li>오른쪽 스틱: 피치(상하) · 롤(좌우) — 방향키</li><li>시동: 스로틀 최하 + 요 오른쪽 유지, 또는 ARM 버튼</li></ul>';
      return h;
    }
    let h = '<div class="stat"><div><span>모드</span><b id="f-mode"></b></div><div><span>상태</span><b id="f-arm"></b></div><div><span>고도</span><b id="f-alt" class="mono"></b></div><div><span>배터리</span><b id="f-batt" class="mono"></b></div></div>';
    h += '<div class="btns">' + btn("arm", "시동 (ARM)", "primary") + btn("disarm", "시동 끄기") + btn("flightReset", "기체 리셋") + "</div>";
    h += '<div class="btns">' + btn("drain", F.drain > 1 ? "배터리 소모 ×40 켜짐" : "배터리 빨리 소모시키기", F.drain > 1 ? "on" : "") + btn("flightStop", "작업대로 복귀", "ghost") + "</div>";
    h += '<h4>메시지</h4><ul class="log" id="msglog">' + logHtml() + "</ul>";
    return h;
  }
  function pgFault() {
    const fl = SIM.faults;
    let h = "";
    h += '<div class="btns">' + btn("drill", "고장 1개 심기", "primary", 1) + btn("drill", "고장 2개", "", 2) + btn("drill", "고장 3개", "", 3) + "</div>";
    if (fl) {
      const left = fl.list.filter((f) => f.present()).length;
      h += '<div class="verdict ' + (left ? "bad" : "ok") + '">' + (left ? "남은 고장 " + left + " / " + fl.list.length + "개" : "모든 고장을 고쳤습니다") + "</div>";
      if (fl.revealed) h += checks(fl.list.map((f) => ({ lvl: f.present() ? "bad" : "ok", t: f.present() ? "미해결" : "해결", d: f.desc })));
      else h += '<div class="btns">' + btn("reveal", "정답 보기", "ghost") + "</div>";
    }
    return h;
  }

  const PAGES = { parts: pgParts, wiring: pgWiring, inspect: pgInspect, frame: pgFrame, accel: pgAccel, compass: pgCompass, radio: pgRadio, esccal: pgEscCal, modes: pgModes, failsafe: pgFailsafe, battery: pgBattery, servo: pgServo, orient: pgOrient, tuning: pgTuning, params: pgParams, preflight: pgPreflight, motor: pgMotor, sensor: pgSensor, flight: pgFlight, fault: pgFault };

  // ---------- 렌더 ----------
  function render() {
    const tab = ui.tab, page = ui.page[tab], pw = SIM.power(), F = SIM.flight;
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.arg === tab));
    $("#subnav").innerHTML = NAV[tab].map(([k, n]) => '<button type="button" data-act="page" data-arg="' + k + '"' + (k === page ? ' aria-current="true"' : "") + ">" + n + "</button>").join("");
    const body = $("#page"), keep = body.scrollTop, focus = document.activeElement && document.activeElement.id;
    let html = "<h2>" + NAV[tab].find((n) => n[0] === page)[1] + "</h2>";
    if (tab === "sw" && !pw.fc) html += note("비행 컨트롤러가 장착되지 않아 연결할 수 없습니다 (No Heartbeat). 하드웨어 메뉴에서 FC를 먼저 장착하세요.", "bad");
    else html += PAGES[page]();
    body.innerHTML = html; body.scrollTop = keep;
    if (focus && document.getElementById(focus) && focus === "pfilter") { const el = document.getElementById(focus); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    $("#st-power").className = "chip " + (pw.main ? "ok" : ""); $("#st-power").textContent = pw.main ? "배터리 연결" : "전원 없음";
    $("#st-fc").className = "chip " + (pw.fc ? "ok" : ""); $("#st-fc").textContent = pw.fc ? "FC 연결됨" : "FC 없음";
    $("#st-arm").className = "chip " + (F.armed ? "bad" : ""); $("#st-arm").textContent = F.armed ? "ARMED" : "DISARMED";
    const showTx = (tab === "sw" && ["radio", "modes", "failsafe"].includes(page) && pw.fc) || (tab === "test" && page === "flight" && F.active);
    const showHud = pw.fc && ((tab === "sw" && ["accel", "compass", "orient"].includes(page)) || (tab === "test" && ["sensor", "flight"].includes(page)));
    $("#tx").hidden = !showTx; $("#hud").hidden = !showHud; SIM.txVisible = showTx;
    $("#tx-power").textContent = SIM.tx.on ? "송신기 켜짐" : "송신기 꺼짐"; $("#tx-power").className = "btn " + (SIM.tx.on ? "on" : "bad");
    document.querySelectorAll("#tx-sw button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.arg === SIM.tx.sw));
    SIM.scene.dragDrone = (tab === "test" && page === "sensor") || (tab === "sw" && page === "compass" && !!ui.compass);
    $("#hint").textContent = F.active ? "드래그: 시점 · 휠/핀치: 거리" : SIM.scene.dragDrone ? "드래그: 기체를 손으로 돌리기" : "드래그: 360° 회전 · 휠/핀치: 확대 · 부품 클릭: 선택";
  }
  function go(tab, page) {
    const leaving = ui.tab + "/" + ui.page[ui.tab];
    ui.tab = tab; if (page) ui.page[tab] = page;
    const now = tab + "/" + ui.page[tab];
    if (leaving !== now) {
      if (SIM.flight.active && now !== "test/flight") SIM.flight.stop();
      ui.accel = ui.compass = ui.radio = null; SIM.motorTest.stop(); SIM.scene.tumble = 0;
      if (!SIM.flight.active) SIM.scene.setPose("level");
      ui.showAnswer = false;
      if (now !== "sw/frame") SIM.scene.showExpect = false;
      SIM.scene.sync();
    }
    render();
  }

  // ---------- 동작 ----------
  const ACT = {
    tab: (a) => go(a), page: (a) => go(ui.tab, a),
    select: (a) => SIM.select(SIM.selected === a ? null : a),
    install: (a) => { const e = SIM.install(SIM.selected, a); if (e) SIM.toast(e, "bad"); },
    remove: (a) => SIM.remove(a), rotate: (a) => SIM.rotate(a), flip: (a) => SIM.flipProp(a),
    answer: () => { ui.showAnswer = true; render(); }, answerHide: () => { ui.showAnswer = false; render(); },
    autoAssemble: () => { SIM.autoAssemble(); SIM.toast("정답대로 조립하고 배선했습니다.", "ok"); },
    autoConfigure: () => { SIM.autoConfigure(); SIM.toast("프레임·교정·모드·페일세이프 설정을 완료했습니다.", "ok"); },
    resetAll: () => { SIM.resetAll(); SIM.toast("모든 부품을 분해하고 설정을 초기화했습니다."); },
    accelStart: () => { ui.accel = { step: 0, ok: true }; render(); },
    accelCancel: () => { ui.accel = null; SIM.scene.setPose("level"); render(); },
    pose: (a) => { SIM.scene.setPose(a); render(); },
    accelNext: () => {
      const a = ui.accel;
      if (SIM.scene.poseName !== ACCEL[a.step][0]) a.ok = false;
      if (++a.step < 6) return render();
      ui.accel = null; SIM.scene.setPose("level");
      if (a.ok) { SIM.state.cal.accel = true; SIM.toast("Calibration successful · 가속도계 교정 완료", "ok"); }
      else { SIM.state.cal.accel = false; SIM.toast("Calibration FAILED · 지시와 다른 자세가 있었습니다", "bad"); }
      SIM.emit();
    },
    compassStart: () => { ui.compass = { seen: new Set() }; render(); },
    compassAuto: () => { SIM.scene.tumble = 7; },
    compassCancel: () => { ui.compass = null; SIM.scene.tumble = 0; SIM.scene.setPose("level"); render(); },
    radioStart: () => { if (!SIM.rxOk()) return SIM.toast("수신기 신호가 없습니다.", "bad"); ui.radio = { min: [0, 9999, 9999, 9999, 9999], max: [0, 0, 0, 0, 0] }; render(); },
    radioCancel: () => { ui.radio = null; render(); },
    radioDone: () => {
      const r = ui.radio, raw = SIM.rcRaw().pwm, p = P();
      ui.radio = null;
      for (let c = 1; c <= 4; c++) if (r.max[c] - r.min[c] < 600) { SIM.state.cal.radio = false; SIM.emit(); return SIM.toast("교정 실패: RC" + c + " 스틱을 끝까지 움직이지 않았습니다", "bad"); }
      for (let c = 1; c <= 4; c++) { p["RC" + c + "_MIN"] = r.min[c]; p["RC" + c + "_MAX"] = r.max[c]; p["RC" + c + "_TRIM"] = c === 3 ? r.min[c] : raw[c]; }
      SIM.state.cal.radio = true; SIM.toast("라디오 교정 완료", "ok"); SIM.emit();
    },
    escCal: () => { if (SIM.POS_IDS.some((id) => !SIM.has("esc@" + id) || SIM.state.wiring.escPwr[id] !== "ok" || !SIM.motorNumForPos(id)) || !SIM.power().pdb) return SIM.toast("ESC 교정 실패 · ESC가 응답하지 않습니다", "bad"); SIM.state.cal.esc = true; SIM.toast("ESC 교정 완료 · 네 개의 스로틀 범위가 같아졌습니다", "ok"); SIM.emit(); },
    tuneReset: () => { for (const k in SIM.PARAM_DEFS) if (/^(ATC_|MOT_|ANGLE|PILOT|RTL)/.test(k)) P()[k] = SIM.PARAM_DEFS[k].d; SIM.emit(); },
    mt: (a) => mtRun(SIM.motorTest.run([a], ui.mt.pct, ui.mt.dur)),
    mtSeq: () => mtRun(SIM.motorTest.run(["A", "B", "C", "D"], ui.mt.pct, ui.mt.dur)),
    mtAll: () => mtRun(SIM.motorTest.runAll(ui.mt.pct, ui.mt.dur)),
    mtStop: () => SIM.motorTest.stop(),
    tilt: (a) => { const [r, p] = a.split(",").map(Number); SIM.scene.setTilt(r, p); },
    flightStart: () => { SIM.flight.start(); render(); },
    flightStop: () => { SIM.flight.stop(); render(); },
    flightReset: () => { SIM.flight.reset(); render(); },
    arm: () => { SIM.flight.arm(); }, disarm: () => SIM.flight.disarm("버튼"),
    drain: () => { SIM.flight.drain = SIM.flight.drain > 1 ? 1 : 40; render(); },
    drill: (a) => { if (SIM.flight.active) SIM.flight.stop(); SIM.startFaultDrill(+a); SIM.motorTest.results = {}; SIM.toast("고장 " + a + "개를 심었습니다."); },
    reveal: () => { SIM.faults.revealed = true; render(); },
    txPower: () => { SIM.tx.on = !SIM.tx.on; render(); },
    txSw: (a) => { SIM.tx.sw = +a; render(); },
    zoomIn: () => SIM.scene.zoom(0.8), zoomOut: () => SIM.scene.zoom(1.25), view: (a) => SIM.scene.view(a),
  };
  function mtRun(err) { if (err) SIM.toast(err, "bad"); }
  const CHG = {
    param: (v, a) => SIM.setParam(a, v),
    plug: (v, a) => SIM.setPlug(a, v),
    wire: (v, a) => { SIM.state.wiring[a] = v; SIM.emit(); },
    escPwr: (v, a) => { SIM.state.wiring.escPwr[a] = v; SIM.emit(); },
    motorWires: (v, a) => { SIM.state.wiring.motorWires[a] = v; SIM.emit(); },
    expect: (v, a, el) => { SIM.scene.showExpect = el.checked; SIM.scene.sync(); },
    rev: (v, a, el) => SIM.setParam("RC" + a + "_REVERSED", el.checked ? 1 : 0),
    mtPct: (v) => { ui.mt.pct = Math.min(40, Math.max(5, +v || 12)); },
    mtDur: (v) => { ui.mt.dur = Math.min(10, Math.max(1, +v || 2)); },
  };

  // ---------- 가상 송신기 스틱 ----------
  function bindStick(el, onMove, springY) {
    const knob = el.querySelector("i"); let id = null;
    const set = (e) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(-1, ((e.clientX - r.left) / r.width) * 2 - 1)), y = Math.min(1, Math.max(-1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
      onMove(x, y);
    };
    el.addEventListener("pointerdown", (e) => { id = e.pointerId; el.setPointerCapture(id); set(e); e.preventDefault(); });
    el.addEventListener("pointermove", (e) => { if (e.pointerId === id) set(e); });
    const up = (e) => { if (e.pointerId !== id) return; id = null; onMove(0, springY ? 0 : null); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    return (x, y) => { knob.style.left = 50 + x * 38 + "%"; knob.style.top = 50 - y * 38 + "%"; };
  }

  // ---------- HUD ----------
  function drawHud() {
    const c = $("#hud"), h = SIM.hud; if (c.hidden || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!h.on) { g.fillStyle = "#11181a"; g.fillRect(0, 0, W, H); g.fillStyle = "#9fb0ad"; g.font = "13px sans-serif"; g.textAlign = "center"; g.fillText("FC 전원 없음", W / 2, H / 2); return; }
    const k = H / 70; // px per degree
    g.save(); g.translate(W / 2, H / 2); g.rotate(-h.roll); g.translate(0, (h.pitch * 180) / Math.PI * k);
    g.fillStyle = "#3f8fd0"; g.fillRect(-W * 2, -H * 4, W * 4, H * 4);
    g.fillStyle = "#7a5a34"; g.fillRect(-W * 2, 0, W * 4, H * 4);
    g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-W * 2, 0); g.lineTo(W * 2, 0); g.stroke();
    g.font = "10px sans-serif"; g.fillStyle = "#fff"; g.textAlign = "left"; g.lineWidth = 1;
    for (let d = -60; d <= 60; d += 10) { if (!d) continue; const y = -d * k, w = d % 20 ? 14 : 26; g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke(); if (d % 20 === 0) g.fillText(d, w + 4, y + 3); }
    g.restore();
    g.strokeStyle = "#ffd45e"; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2 - 46, H / 2); g.lineTo(W / 2 - 16, H / 2); g.lineTo(W / 2, H / 2 + 9); g.lineTo(W / 2 + 16, H / 2); g.lineTo(W / 2 + 46, H / 2); g.stroke();
    g.fillStyle = "rgba(8,14,13,0.62)"; g.fillRect(0, 0, W, 20); g.fillRect(0, H - 22, W, 22);
    g.fillStyle = "#fff"; g.font = "bold 12px sans-serif"; g.textAlign = "center";
    const hd = Math.round((h.hdg * 180) / Math.PI + 360) % 360;
    g.fillText("방위 " + String(hd).padStart(3, "0") + "°", W / 2, 14);
    g.textAlign = "left"; g.fillText(h.mode || "", 6, H - 7);
    g.textAlign = "right"; g.fillStyle = h.armed ? "#ff8a7a" : "#b9c8c5"; g.fillText(h.armed ? "ARMED" : "DISARMED", W - 6, H - 7);
    g.fillStyle = "#fff"; g.textAlign = "left"; g.font = "11px sans-serif";
    g.fillText("고도 " + h.alt.toFixed(1) + "m", 6, 14);
    g.textAlign = "right"; g.fillText(h.volt === null ? "전압 --" : h.volt.toFixed(1) + "V", W - 6, 14);
  }

  const DIRS = [];
  for (const v of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) DIRS.push(v);
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) DIRS.push([x * 0.577, y * 0.577, z * 0.577]);
  const txt = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  const deg = (r) => (Math.round((r * 180) / Math.PI) % 360 || 0) + "°";

  // 매 프레임 갱신되는 값들
  let setL, setR;
  ui.frame = function () {
    const tx = SIM.tx, F = SIM.flight, raw = SIM.rcRaw(), h = SIM.hud;
    if (!$("#tx").hidden) { setL(tx.lx, tx.ly); setR(tx.rx, tx.ry); }
    drawHud();
    const page = ui.tab + "/" + ui.page[ui.tab];
    if (page === "sw/radio") {
      for (const [c] of CH) {
        const v = raw.present ? raw.pwm[c] : 0, el = document.getElementById("rc" + c);
        if (el) el.style.width = (v ? Math.min(100, Math.max(0, (v - 900) / 12)) : 0) + "%";
        txt("rcv" + c, v ? String(v) : "----");
        if (ui.radio && v && c <= 4) { ui.radio.min[c] = Math.min(ui.radio.min[c], v); ui.radio.max[c] = Math.max(ui.radio.max[c], v); }
      }
    } else if (page === "sw/modes") {
      const rc = SIM.rcIn(), slot = SIM.modeSlot(rc.modePwm);
      txt("mode-pwm", raw.present ? String(rc.modePwm) : "----"); txt("mode-cur", "모드 " + slot + " · " + SIM.MODES[P()["FLTMODE" + slot]]);
      for (let i = 1; i <= 6; i++) { const e = document.getElementById("mrow" + i); if (e) e.classList.toggle("active", i === slot); }
    } else if (page === "sw/failsafe") {
      const lost = SIM.rcIn().lost, e = document.getElementById("fs-state");
      txt("fs-pwm", raw.present ? String(raw.pwm[3]) : "신호 없음");
      if (e) { const on = lost && P().FS_THR_ENABLE; e.className = "chip " + (on ? "bad" : lost ? "warn" : "ok"); e.textContent = on ? "페일세이프 발동 → " + (P().FS_THR_ENABLE === 1 ? "RTL" : "Land") : lost ? "신호 끊김 · 페일세이프 꺼짐" : "신호 정상"; }
    } else if (page === "sw/battery") txt("batt-v", h && h.volt !== null ? h.volt.toFixed(2) + " V" : "--");
    else if (page === "sw/compass" && ui.compass) {
      const q = SIM.scene.drone.quaternion.clone().invert(), n = new THREE.Vector3(0.3, -0.75, -0.59).normalize().applyQuaternion(q);
      let best = 0, bd = -2; DIRS.forEach((d, i) => { const dot = d[0] * n.x + d[1] * n.y + d[2] * n.z; if (dot > bd) { bd = dot; best = i; } });
      ui.compass.seen.add(best);
      const pct = Math.min(100, Math.round((ui.compass.seen.size / 12) * 100)), bar = document.getElementById("compass-bar");
      if (bar) bar.style.width = pct + "%"; txt("compass-pct", pct + "%");
      if (pct >= 100) {
        ui.compass = null; SIM.scene.tumble = 0; SIM.scene.setPose("level");
        const p = P(); p.COMPASS_OFS_X = Math.round(-80 + Math.random() * 160); p.COMPASS_OFS_Y = Math.round(40 + Math.random() * 120); p.COMPASS_OFS_Z = Math.round(-60 + Math.random() * 160);
        SIM.state.cal.compass = true; SIM.toast("나침반 교정 완료 · 오프셋 저장됨", "ok"); SIM.emit();
      }
    } else if (page === "test/flight" && F.active) {
      txt("f-mode", SIM.MODES[F.mode] + (F.fsRadio ? " (FS)" : "")); txt("f-arm", F.crashed ? "전복" : F.armed ? "ARMED" : "DISARMED");
      txt("f-alt", (F.pos.y - F.home.y).toFixed(1) + " m"); txt("f-batt", F.volt.toFixed(1) + " V · " + Math.max(0, 100 - (F.used / F.cap) * 100).toFixed(0) + "%");
    }
    const armChip = $("#st-arm"); if ((armChip.textContent === "ARMED") !== F.armed) { armChip.className = "chip " + (F.armed ? "bad" : ""); armChip.textContent = F.armed ? "ARMED" : "DISARMED"; }
  };

  ui.init = function () {
    document.body.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && !b.disabled && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset.arg); });
    document.body.addEventListener("change", (e) => { const t = e.target; if (t.dataset.change && CHG[t.dataset.change]) CHG[t.dataset.change](t.value, t.dataset.arg, t); });
    document.body.addEventListener("input", (e) => { if (e.target.dataset.input === "pfilter") { ui.paramFilter = e.target.value; render(); } });
    setL = bindStick($("#stickL"), (x, y) => { SIM.tx.lx = x; if (y !== null) SIM.tx.ly = y; }, false);
    setR = bindStick($("#stickR"), (x, y) => { SIM.tx.rx = x; SIM.tx.ry = y === null ? 0 : y; }, true);
    SIM.scene.onPick = (id) => { if (id !== SIM.selected) { if (id && ui.tab !== "hw") return; if (id) ui.page.hw = "parts"; SIM.select(id); } };
    SIM.on(render);
    render();
  };
})();
