// 드론 정비 시뮬레이터 — 화면(메뉴·패널·HUD·송신기)
(function () {
  const SIM = window.SIM, $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ui = (SIM.ui = { open: false, hover: "", tab: "hw", page: { hw: "parts", sw: "frame", test: "preflight" }, accel: null, compass: null, radio: null, paramFilter: "", mt: { pct: 12, dur: 2 } });
  const P = () => SIM.state.params;

  const NAV = {
    hw: [["parts", "하드웨어 설정"]], // 시험: 하드웨어 단계에는 메뉴(부품 목록·배선표·정답)를 띄우지 않는다
    sw: [["frame", "프레임 타입"], ["accel", "가속도계 교정"], ["compass", "나침반 교정"], ["radio", "라디오 교정"], ["esccal", "ESC 교정"], ["modes", "비행 모드"], ["failsafe", "페일세이프"], ["battery", "배터리 모니터"], ["servo", "서보 출력"], ["serial", "시리얼 포트"], ["orient", "보드 방향"], ["tuning", "튜닝"], ["params", "전체 파라미터"]],
    test: [["preflight", "시동 전 점검"], ["motor", "모터 테스트"], ["sensor", "자세 센서"], ["flight", "비행 테스트"]],
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
    const st = SIM.state;
    let h = "";
    const groups = [["프레임", ["bottom", "top", "arm", "skid"]], ["구동부", ["motor", "esc", "prop"]], ["제어·전원", ["fc", "pm", "battery"]], ["주변장치", ["gps", "rx", "telem", "buzzer", "switch"]]];
    for (const [g, types] of groups) {
      h += "<h4>" + g + '</h4><div class="partlist">';
      for (const p of SIM.PARTS.filter((x) => types.includes(x.type))) {
        const slot = st.install[p.id];
        h += '<button type="button" class="part' + (SIM.selected === p.id ? " on" : "") + '" data-act="focusPart" data-arg="' + p.id + '"><span>' + esc(p.name) + '</span><span class="chip ' + (slot ? "ok" : "") + '">' + (slot ? SIM.slotName(slot) : "작업대") + "</span></button>";
      }
      h += "</div>";
    }
    h += '<div class="btns foot">' + btn("autoAssemble", "정답대로 자동 조립") + btn("resetAll", "전체 분해·초기화", "ghost") + "</div>";
    return h;
  }
  // 3D에서 부품을 눌렀을 때 뜨는 정보창
  function popHtml(id) {
    const st = SIM.state, w = st.wiring, p = SIM.part(id), slot = st.install[id], pos = slot && slot.split("@")[1];
    const row = (k, v) => '<li class="' + (v ? "on" : "") + '"><span>' + k + "</span><span>" + (v || "미연결") + "</span></li>";
    const pol = (v) => (v === "ok" ? "빨강→＋ 패드" : v === "rev" ? "빨강→－ 패드" : "");
    let leads = "";
    if (slot) {
      if (p.type === "motor") for (let k = 1; k <= 3; k++) leads += row("선 " + "①②③"[k - 1], w.motorWires[pos][k] && SIM.has("esc@" + pos) ? "ESC 단자 " + w.motorWires[pos][k] : "");
      if (p.type === "esc") leads += row("전원 커넥터", SIM.escPowered(pos) ? "PDB " + SIM.xtName(w.escPwr[pos]) : "") + row("신호선", w.plug["esc" + pos]) + row("통신선", w.escTelem[pos] ? "하네스" : "");
      if (p.type === "pm") leads += row("FC 케이블", w.plug.pm) + row("출력 XT60", w.pmOut ? "PDB 주전원" : "") + row("입력", w.batt === "pm" && SIM.has("battery") ? "배터리" : "");
      if (p.type === "battery") leads += row("커넥터", w.batt === "pm" ? "PMU 입력" : w.batt === "pdb" ? "PDB 패드" : "");
      if (p.type === "gps") leads += row("굵은 선", w.plug.gps) + row("가는 선", w.plug.compass);
      if (["telem", "buzzer", "switch"].includes(p.type)) leads += row("케이블", w.plug[id]);
      if (p.type === "rx") {
        const ledKo = { off: "꺼짐", blink: "빨강 깜빡임", fast: "빨강 빠르게 깜빡임", green: "초록" }[SIM.rxLed()];
        leads += row("수신기 쪽 핀", w.rxEnd ? (w.rxEnd === "SB" ? "SBUS" : "CH" + w.rxEnd) + (w.rxRevRx ? " · 반대 방향" : "") : "") + row("FC 쪽", w.plug.rx ? w.plug.rx + (w.rxRevFc ? " · 반대 방향" : "") : "") + row("LED", ledKo);
      }
    }
    let b = "";
    if (slot && p.type === "fc") b += btn("fcView", "세부 보기 · 포트", "primary");
    if (slot && (p.type === "fc" || p.type === "gps")) b += btn("rotate", "90° 돌리기", "", id);
    if (p.type === "prop") b += btn("flip", "뒤집기", "", id);
    if (slot && p.type === "rx") {
      b += sel("pop-rxend", "rxEnd", { "": "수신기 쪽 핀 선택", 1: "CH1", 2: "CH2", 3: "CH3", 4: "CH4", 5: "CH5", 6: "CH6", 7: "CH7", 8: "CH8", SB: "SBUS" }, w.rxEnd);
      b += btn("rxFlip", "수신기 쪽 뒤집어 꽂기", "", "rxRevRx") + btn("rxFlip", "FC 쪽 뒤집어 꽂기", "", "rxRevFc") + btn("bind", "바인딩 버튼 누르기", "primary");
    }
    const nh = SIM.SCREW_HOLES[p.type];
    if (slot && nh) { let tight = 0; for (let i = 0; i < nh; i++) if (SIM.screwTight(SIM.state.screws[id + ":" + i])) tight++; leads = '<li class="' + (SIM.screwCount(id) ? "on" : "") + '"><span>나사</span><span>' + SIM.screwCount(id) + " / " + nh + " (조임 " + tight + ")</span></li>" + leads; }
    if (slot) b += btn("remove", "분리", "", id);
    b += btn("select", "닫기", "ghost", "");
    return "<h3>" + esc(p.name) + '</h3><p class="where">' + (slot ? SIM.slotName(slot) : "작업대") + "</p>" + (leads ? "<ul>" + leads + "</ul>" : "") + '<div class="btns">' + b + "</div>";
  }
  const off = (t) => '<span class="muted">' + t + "</span>";
  function pgWiring() {
    const st = SIM.state, w = st.wiring, fc = SIM.has("fc");
    let h = "<h4>배터리 · PMU · PDB</h4>";
    h += '<label class="row" for="w-batt"><span><b>배터리 커넥터</b></span>' + (SIM.has("battery") ? sel("w-batt", "wire", Object.assign({ "": "분리됨" }, SIM.has("pm") ? { pm: "PMU 입력 커넥터" } : {}, { pdb: "PDB 배터리 패드에 직접" }), w.batt, "batt") : off("배터리 없음")) + "</label>";
    const pol = { "": "미연결", ok: "빨강→＋ / 검정→－", rev: "빨강→－ / 검정→＋" };
    h += '<label class="row" for="w-pmOut"><span><b>PMU 출력선</b><code>→ PDB 배터리 패드</code></span>' + (SIM.has("pm") ? sel("w-pmOut", "wire", pol, w.pmOut, "pmOut") : off("PMU 없음")) + "</label>";
    const pads = { "": "미연결", A: "단자 A", B: "단자 B", C: "단자 C" }, sigPorts = { "": "미연결" };
    SIM.PORTS.servo.forEach((p) => (sigPorts[p] = p));
    for (const id of SIM.POS_IDS) {
      const e = SIM.has("esc@" + id), m = SIM.has("motor@" + id);
      h += "<h4>" + SIM.POS[id].name + "</h4>";
      for (let k = 1; k <= 3; k++) h += '<label class="row" for="w-mw-' + id + k + '"><span><b>모터선 ' + "①②③"[k - 1] + "</b><code>→ ESC 3상 단자</code></span>" + (e && m ? sel("w-mw-" + id + k, "motorWire", pads, w.motorWires[id][k], id + k) : off("모터·ESC 필요")) + "</label>";
      h += '<label class="row" for="w-pwr-' + id + '"><span><b>ESC 전원 커넥터</b><code>XT60M → PDB XT60F</code></span>' + (e && SIM.has("frameBot") ? sel("w-pwr-" + id, "escPwr", Object.fromEntries([["", "미연결"], ...SIM.XT_OF[id].map((x) => [x, SIM.xtName(x)])]), w.escPwr[id], id) : off("ESC 없음")) + "</label>";
      h += '<label class="row" for="w-plug-esc' + id + '"><span><b>ESC 신호선</b><code>3핀 서보 → FC</code></span>' + (SIM.cableReady("esc" + id) ? sel("w-plug-esc" + id, "plug", sigPorts, w.plug["esc" + id], "esc" + id) : off(fc ? "ESC 없음" : "FC 없음")) + "</label>";
      h += '<label class="row" for="w-tl-' + id + '"><span><b>ESC 통신선</b><code>단선</code></span>' + (e ? sel("w-tl-" + id, "escTelem", { "": "미연결", harness: "통신선 하네스" }, w.escTelem[id], id) : off("ESC 없음")) + "</label>";
    }
    h += "<h4>FC 포트에 꽂는 케이블</h4>";
    if (fc) h += '<div class="btns">' + btn("fcView", "FC 세부 보기에서 직접 꽂기") + "</div>";
    for (const c in SIM.CABLES) {
      if (/^esc[A-Z]/.test(c)) continue;
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

  // ---------- FC 세부 보기 (Pixhawk 포트 배치) ----------
  const PITCH = 9;
  const connW = (t) => (t === "usb" ? 30 : SIM.CONN_PINS[t] * PITCH + 8);
  // 커넥터 종류별 모양: DF13은 핀 수만큼 넓은 사각 하우징, USB는 사다리꼴, 서보는 세로 3핀
  function plugGlyph(t) {
    const w = connW(t);
    if (t === "servo") return '<svg class="glyph" viewBox="0 0 16 34" width="12" height="26"><rect class="sock" x="1" y="1" width="14" height="32" rx="2"/><circle class="pin" cx="8" cy="7" r="2.2"/><circle class="pin" cx="8" cy="17" r="2.2"/><circle class="pin" cx="8" cy="27" r="2.2"/></svg>';
    let g = '<svg class="glyph" viewBox="0 0 ' + (w + 2) + ' 20" width="' + (w + 2) * 0.62 + '" height="12.4">';
    if (t === "usb") g += '<path class="sock" d="M1 3h30v9l-4 6H5l-4-6z"/>';
    else { g += '<rect class="sock" x="1" y="1" width="' + w + '" height="18" rx="2"/>'; for (let i = 0; i < SIM.CONN_PINS[t]; i++) g += '<circle class="pin" cx="' + (5 + PITCH / 2 + i * PITCH) + '" cy="10" r="2.2"/>'; }
    return g + "</svg>";
  }
  const FC_ROWS = [[46, ["SPKT/DSM", "TELEM1", "TELEM2", "USB", "ADC 3.3V"]], [108, ["SPI", "POWER", "SWITCH", "BUZZER", "ADC 6.6V"]], [170, ["SERIAL 4/5", "GPS", "CAN", "I2C"]]];
  function fcViewHtml() {
    const w = SIM.state.wiring, used = {};
    for (const c in w.plug) if (w.plug[c] && SIM.cableReady(c)) used[w.plug[c]] = c;
    const short = (c) => SIM.CABLES[c].name.replace(" 케이블", "").replace(" 신호선", "").replace("GPS 모듈 (굵은 쪽)", "GPS 굵은선").replace("GPS 모듈 (가는 쪽)", "GPS 가는선");
    let s = '<svg class="fcsvg" viewBox="0 0 400 580" role="img" aria-label="비행 컨트롤러 포트 배치">';
    s += '<rect class="board" x="30" y="10" width="340" height="560" rx="18"/>';
    for (const [y, ports] of FC_ROWS) {
      const total = ports.reduce((a, p) => a + connW(SIM.portType(p)), 0) + (ports.length - 1) * 12;
      let x = 200 - total / 2;
      for (const p of ports) {
        const t = SIM.portType(p), cw = connW(t), c = used[p];
        s += '<g class="port' + (c ? " used" : "") + '" data-act="port" data-arg="' + p + '" tabindex="0" role="button" aria-label="' + p + " 포트" + (c ? ", " + SIM.CABLES[c].name + " 연결됨" : "") + '">';
        s += '<text class="plabel" x="' + (x + cw / 2) + '" y="' + (y - 5) + '">' + p + "</text>";
        s += t === "usb" ? '<path class="sock" d="M' + x + " " + y + "h" + cw + "v10l-4 8H" + (x + 4) + "l-4-8z" + '"/>' : '<rect class="sock" x="' + x + '" y="' + y + '" width="' + cw + '" height="20" rx="2"/>';
        if (t !== "usb") for (let i = 0; i < SIM.CONN_PINS[t]; i++) s += '<circle class="pin" cx="' + (x + 4 + PITCH / 2 + i * PITCH) + '" cy="' + (y + 10) + '" r="2.2"/>';
        if (c) s += '<text class="pcable" x="' + (x + cw / 2) + '" y="' + (y + 33) + '">' + esc(short(c)) + "</text>";
        s += "</g>"; x += cw + 12;
      }
    }
    s += '<path class="arrow" d="M200 232l34 44h-20v44h-28v-44h-20z"/>';
    // 뒤쪽 서보 레일
    const rail = SIM.PORTS.servo, x0 = 200 - (rail.length * 20) / 2;
    s += '<text class="plabel" x="' + (x0 + 20) + '" y="368">RC · SB</text><text class="plabel" x="' + (x0 + 40 + 80) + '" y="368">MAIN OUT 1 – 8</text><text class="plabel" x="' + (x0 + 200 + 60) + '" y="368">AUX OUT 1 – 6</text>';
    s += '<path class="brk" d="M' + (x0 + 42) + " 373h156M" + (x0 + 202) + ' 373h116"/>';
    rail.forEach((p, i) => {
      const x = x0 + i * 20 + 2, c = used[p], lab = p === "RC IN" ? "RC" : p === "SBUS OUT" ? "SB" : p.replace(/\D/g, "");
      s += '<g class="port' + (c ? " used" : "") + '" data-act="port" data-arg="' + p + '" tabindex="0" role="button" aria-label="' + p + " 포트" + (c ? ", " + SIM.CABLES[c].name + " 연결됨" : "") + '">';
      s += '<rect class="sock" x="' + x + '" y="380" width="16" height="50" rx="2"/>';
      for (let k = 0; k < 3; k++) s += '<circle class="pin" cx="' + (x + 8) + '" cy="' + (391 + k * 14) + '" r="2.4"/>';
      s += '<text class="plabel" x="' + (x + 8) + '" y="446">' + lab + "</text>";
      if (c) s += '<text class="pcable v" transform="translate(' + (x + 11) + ' 456) rotate(90)">' + esc(short(c)) + "</text>";
      s += "</g>";
    });
    s += "</svg>";
    let tray = '<div class="tray"><h3>케이블</h3>';
    for (const c in SIM.CABLES) {
      const cb = SIM.CABLES[c], ready = SIM.cableReady(c);
      tray += '<button type="button" class="cable' + (ui.cable === c ? " on" : "") + '" data-act="cable" data-arg="' + c + '"' + (ready ? "" : " disabled") + ">" + plugGlyph(cb.conn) + "<span>" + esc(cb.name) + '</span><span class="chip ' + (w.plug[c] && ready ? "ok" : "") + '">' + (!ready ? "부품 없음" : w.plug[c] || "미연결") + "</span></button>";
    }
    tray += "</div>";
    return '<div class="fchead"><h2>비행 컨트롤러 · Pixhawk 포트 배치</h2>' + btn("fcClose", "닫기") + '</div><div class="fcbody">' + s + tray + "</div>";
  }

  // ---------- 조종기 (TX12) 화면 ----------
  const tx12 = (ui.tx12 = { scr: "main", page: 0, row: 0, edit: false });
  const TX_NAMES = ["MODEL01", "QUAD", "DRONE", "TRAINER"];
  function txRows() {
    const m = SIM.state.txm, multi = m.rf === "MULTI";
    if (tx12.scr === "mdl" && tx12.page === 0) return { title: "MODEL SETUP 1/3", rows: [
      { k: "Name", v: m.name, opts: TX_NAMES, set: (v) => (m.name = v) },
      { k: "Internal RF", v: m.rf, opts: ["OFF", "MULTI"], set: (v) => (m.rf = v) },
      { k: "Protocol", v: multi ? m.proto : "---", opts: multi ? SIM.TX_PROTOS : null, set: (v) => (m.proto = v) },
      { k: "Receiver", v: multi ? (SIM.txBinding ? "[Bind]" : "Bind") : "---", act: multi ? "bind" : null },
      { k: "Failsafe", v: m.failsafe, opts: ["Not set", "Hold", "Custom", "No pulses"], set: (v) => (m.failsafe = v) },
    ] };
    if (tx12.scr === "mdl" && tx12.page === 2) return { title: "OUTPUTS 3/3", rows: [1, 2, 3, 4, 5, 6, 7, 8].map((ch) => ({ k: "CH" + ch, v: m.inv[ch] ? "INV" : "---", opts: ["---", "INV"], set: (v) => (m.inv[ch] = v === "INV") })) };
    if (tx12.scr === "mdl") return { title: "MIXES 2/3", rows: [1, 2, 3, 4, 5, 6, 7, 8].map((ch) => ({ k: "CH" + ch, v: m.mix[ch] || "---", opts: SIM.TX_SOURCES.map((x) => x || "---"), set: (v) => (m.mix[ch] = v === "---" ? "" : v) })) };
    if (tx12.scr === "sys" && tx12.cal) return { title: "CALIBRATION", rows: tx12.cal === 1 ? [{ k: "스틱을 가운데에 두고", v: "" }, { k: "[ENT] 누르기", v: "" }] : [{ k: "스틱을 끝까지 돌리고", v: "" }, { k: "[ENT] 누르기", v: calLeft() }], cal: true };
    if (tx12.scr === "sys") return { title: "RADIO SETUP", rows: [{ k: "Stick mode", v: "Mode " + m.mode, opts: ["Mode 1", "Mode 2", "Mode 3", "Mode 4"], set: (v) => (m.mode = +v.slice(-1)) }, { k: "Calibration", v: SIM.state.txCal ? "OK" : "[Start]", act: "cal" }] };
    if (tx12.scr === "tel") { const link = SIM.txLink(); return { title: "TELEMETRY", rows: [{ k: "RSSI", v: link ? "92 dB" : "---" }, { k: "RxBt", v: link && SIM.power().fcBatt ? "5.1V" : "---" }] }; }
    return null;
  }
  function lcdHtml() {
    if (!SIM.tx.on) return '<div class="lcd off"></div>';
    const r = txRows();
    if (!r) { // 메인 화면
      const m = SIM.state.txm, link = SIM.txLink();
      return '<div class="lcd"><div class="lcd-top"><span>' + esc(m.name) + "</span><span>7.6V</span></div><div class=\"lcd-big\">" + esc(m.name) + '</div><div class="lcd-row"><span>Mode ' + m.mode + "</span><span>" + (m.rf === "MULTI" ? m.proto : "RF OFF") + '</span></div><div class="lcd-row"><span>RSSI ' + (link ? "92" : "---") + "</span><span>" + (SIM.txBinding ? "BIND…" : "") + "</span></div></div>";
    }
    return '<div class="lcd"><div class="lcd-top"><span>' + r.title + "</span><span>" + (tx12.scr === "mdl" ? "MDL" : tx12.scr.toUpperCase()) + "</span></div>" + r.rows.map((x, i) => '<div class="lcd-row' + (i === tx12.row ? (tx12.edit ? " edit" : " sel") : "") + (x.k === "Receiver" && SIM.txBinding ? " blink" : "") + '"><span>' + x.k + "</span><span>" + esc(x.v) + "</span></div>").join("") + "</div>";
  }
  function txHtml() {
    const t = SIM.tx, m = SIM.state.txm, b = (a, label, cls) => '<button type="button" class="txb ' + (cls || "") + '" data-act="txKey" data-arg="' + a + '">' + label + "</button>";
    const sw = (k, label, n) => '<button type="button" class="txsw" data-act="txKey" data-arg="' + k + '">' + label + "<i>" + ["▲", "■", "▼"][n] + "</i></button>";
    const gim = (x, y) => '<div class="gimbal"><i style="left:' + (50 + x * 40) + "%;top:" + (50 - y * 40) + '%"></i></div>';
    return '<div class="tx12"><button type="button" class="btn ghost txclose" data-act="txClose">닫기</button>' +
      '<div class="tx12-sw">' + sw("sa", "SA", t.sa ? 2 : 0) + sw("sb", "SB", t.sb || 0) + '<span class="tx12-brand">TX12</span>' + sw("sc", "SC", t.sw) + sw("sd", "SD", t.sd ? 2 : 0) + "</div>" +
      '<div class="tx12-mid"><div class="txcol">' + b("sys", "SYS") + b("mdl", "MDL") + b("tel", "TEL") + "</div>" + lcdHtml() + '<div class="txcol">' + b("page", "PAGE") + b("rtn", "RTN") + '<div class="roller">' + b("up", "▲") + b("enter", "ENT") + b("down", "▼") + "</div></div></div>" +
      '<div class="tx12-bot">' + gim(t.lx, t.ly) + b("power", t.on ? "전원 끄기" : "전원 켜기", "pwr" + (t.on ? " on" : "")) + gim(t.rx, t.ry) + "</div></div>";
  }
  function txKey(k) {
    const t = SIM.tx, m = SIM.state.txm;
    if (k === "power") { t.on = !t.on; if (!t.on) SIM.txBinding = false; tx12.scr = "main"; tx12.edit = false; SIM.emit(); return; }
    if (k === "sa") { t.sa = t.sa ? 0 : 1; return render(); }
    if (k === "sb") { t.sb = ((t.sb || 0) + 1) % 3; return render(); }
    if (k === "sc") { t.sw = (t.sw + 1) % 3; return render(); }
    if (k === "sd") { t.sd = t.sd ? 0 : 1; return render(); }
    if (!t.on) return;
    if (k === "sys" || k === "mdl" || k === "tel") { tx12.scr = k; tx12.page = 0; tx12.row = 0; tx12.edit = false; return render(); }
    if (k === "rtn") { if (tx12.cal) tx12.cal = 0; else if (tx12.edit) tx12.edit = false; else { tx12.scr = "main"; SIM.txBinding = false; } return render(); }
    if (k === "page") { if (tx12.scr === "mdl") { tx12.page = (tx12.page + 1) % 3; tx12.row = 0; tx12.edit = false; } return render(); }
    const r = txRows(); if (!r) return;
    if (r.cal) { // 스틱 캘리브레이션: 가운데 → 끝까지 → 완료
      if (k !== "enter") return;
      const t2 = SIM.tx;
      if (tx12.cal === 1) { tx12.cal = 2; tx12.ext = { lx: [0, 0], ly: [0, 0], rx: [0, 0], ry: [0, 0] }; }
      else if (calLeft() === "") { tx12.cal = 0; SIM.state.txCal = true; SIM.emit(); SIM.toast("조종기 캘리브레이션 완료", "ok"); }
      return render();
    }
    const row = r.rows[tx12.row];
    if (k === "up" || k === "down") {
      const d = k === "up" ? -1 : 1;
      if (tx12.edit && row.opts) { const i = row.opts.indexOf(row.v); row.set(row.opts[(i + d + row.opts.length) % row.opts.length]); SIM.emit(); }
      else tx12.row = (tx12.row + d + r.rows.length) % r.rows.length;
      return render();
    }
    if (k === "enter") {
      if (row.act === "bind") { SIM.txBinding = !SIM.txBinding; render(); return; }
      if (row.act === "cal") { tx12.cal = 1; tx12.row = 0; render(); return; }
      if (row.opts) tx12.edit = !tx12.edit;
      return render();
    }
  }
  // 캘리브레이션 중 아직 끝까지 움직이지 않은 축
  function calLeft() { const e = tx12.ext; if (!e) return ""; const left = Object.keys(e).filter((a) => e[a][0] > -0.95 || e[a][1] < 0.95); return left.length ? "남은 축 " + left.length : ""; }
  // 바인드 모드 신호음
  let actx = null, lastBeep = 0;
  // 체결 효과음 (합성): mount 부품 장착, plug 커넥터, xt XT60, bind 바인딩, err 실패
  SIM.sfx = (type) => {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime, out = actx.createGain(); out.gain.value = 0.22; out.connect(actx.destination);
      const tone = (f, at, dur, wave, vol) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = wave || "sine"; o.frequency.setValueAtTime(f, t0 + at); g.gain.setValueAtTime(vol || 0.6, t0 + at); g.gain.exponentialRampToValueAtTime(0.001, t0 + at + dur); o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.02); return o; };
      const click = (at, freq, dur, vol) => { const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2; g.gain.value = vol || 1; s.connect(f); f.connect(g); g.connect(out); s.start(t0 + at); };
      if (type === "mount") { tone(150, 0, 0.14, "sine", 0.9).frequency.exponentialRampToValueAtTime(70, t0 + 0.12); click(0, 900, 0.05, 0.8); }
      else if (type === "plug") { click(0, 3200, 0.025, 1.2); tone(2200, 0.004, 0.03, "triangle", 0.25); }
      else if (type === "xt") { click(0, 2000, 0.03, 1.2); click(0.06, 2600, 0.035, 1.3); tone(420, 0.06, 0.06, "square", 0.08); }
      else if (type === "powerup") { [880, 1109, 1319].forEach((f, i) => tone(f, i * 0.14, 0.12, "triangle", 0.3)); tone(1319, 0.8, 0.09, "triangle", 0.25); tone(1319, 1.0, 0.09, "triangle", 0.25); }
      else if (type === "bind") { tone(1400, 0, 0.09, "sine", 0.4); tone(2100, 0.11, 0.14, "sine", 0.4); }
    } catch (e) {}
  };
  function beep() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 2300; g.gain.value = 0.06; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.09); } catch (e) {} }

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
    h += '<div class="btns">' + btn("escCal", "ESC 교정 실행", "primary") + "</div>";
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
    return h;
  }
  function pgBattery() {
    const pw = SIM.power();
    let h = prow("BATT_MONITOR") + prow("BATT_CAPACITY");
    h += '<p>측정 전압 <code id="batt-v">--</code></p>';
    return h;
  }
  function pgServo() {
    let h = "";
    for (let i = 1; i <= 8; i++) h += prow("SERVO" + i + "_FUNCTION", "MAIN OUT " + i);
    h += "<h4>모터 방향 반전 (SERVO_BLH_RVMASK)</h4>";
    for (let i = 1; i <= 4; i++) h += '<label class="row" for="rv' + i + '"><span><b>MAIN OUT ' + i + ' 반대로 회전</b></span><input id="rv' + i + '" type="checkbox" data-change="rvmask" data-arg="' + i + '"' + (P().SERVO_BLH_RVMASK & (1 << (i - 1)) ? " checked" : "") + "></label>";
    return h;
  }
  function pgSerial() { return [1, 2, 3, 4].map((n) => prow("SERIAL" + n + "_PROTOCOL")).join(""); }
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
    return h + '<div class="btns foot">' + safetyBtn() + "</div>";
  }
  const safetyBtn = () => (P().BRD_SAFETYENABLE ? btn("safety", SIM.safetyOff() ? "안전 스위치 해제됨" : "안전 스위치 누르기", SIM.safetyOff() ? "on" : "") : "");
  function pgMotor() {
    let h = '<label class="row" for="mt-pct"><span><b>스로틀 %</b></span><input id="mt-pct" type="number" min="5" max="40" value="' + ui.mt.pct + '" data-change="mtPct"></label>';
    h += '<label class="row" for="mt-dur"><span><b>시간 (초)</b></span><input id="mt-dur" type="number" min="1" max="10" value="' + ui.mt.dur + '" data-change="mtDur"></label>';
    h += '<div class="btns">' + ["A", "B", "C", "D"].map((l) => btn("mt", "Test motor " + l, "", l)).join("") + "</div>";
    h += '<div class="btns">' + btn("mtSeq", "Test all in Sequence") + btn("mtAll", "Test all motors") + btn("mtStop", "Stop", "ghost") + "</div>";
    const res = SIM.motorTest.results, posKo = (p) => (p ? SIM.POS[p].name : "돌지 않음");
    h += '<h4>테스트 결과 (돌아간 모터)</h4><table class="tbl"><thead><tr><th>테스트</th><th>돌아간 위치</th><th>회전 방향</th></tr></thead><tbody>' + ["A", "B", "C", "D"].map((l) => { const r = res[l]; return "<tr><td>" + l + "</td><td>" + (r ? posKo(r.pos) : "—") + "</td><td>" + (r && r.pos ? (r.dir === "cw" ? "↻ 시계 (CW)" : "↺ 반시계 (CCW)") : "—") + "</td></tr>"; }).join("") + "</tbody></table>";
    return h + '<div class="btns">' + safetyBtn() + "</div>" + escTelemHtml();
  }
  const escTelemHtml = () => '<h4>ESC 텔레메트리</h4><table class="tbl"><thead><tr><th>ESC</th><th>RPM</th><th>전류</th><th>온도</th><th>전압</th></tr></thead><tbody>' + [1, 2, 3, 4].map((n) => '<tr><td>' + n + '</td><td id="et-r' + n + '" class="mono">—</td><td id="et-a' + n + '" class="mono">—</td><td id="et-t' + n + '" class="mono">—</td><td id="et-v' + n + '" class="mono">—</td></tr>').join("") + "</tbody></table>";
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
    h += '<div class="btns">' + safetyBtn() + btn("arm", "시동 (ARM)", "primary") + btn("disarm", "시동 끄기") + btn("flightReset", "기체 리셋") + "</div>";
    h += '<div class="btns">' + btn("drain", F.drain > 1 ? "배터리 소모 ×40 켜짐" : "배터리 빨리 소모시키기", F.drain > 1 ? "on" : "") + btn("flightStop", "작업대로 복귀", "ghost") + "</div>";
    h += '<h4>메시지</h4><ul class="log" id="msglog">' + logHtml() + "</ul>" + escTelemHtml();
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

  const PAGES = { parts: pgParts, wiring: pgWiring, inspect: pgInspect, frame: pgFrame, accel: pgAccel, compass: pgCompass, radio: pgRadio, esccal: pgEscCal, modes: pgModes, failsafe: pgFailsafe, battery: pgBattery, servo: pgServo, serial: pgSerial, orient: pgOrient, tuning: pgTuning, params: pgParams, preflight: pgPreflight, motor: pgMotor, sensor: pgSensor, flight: pgFlight, fault: pgFault };

  // ---------- 렌더 ----------
  function render() {
    const tab = ui.tab, page = ui.page[tab], pw = SIM.power(), F = SIM.flight;
    const si = STEPS.indexOf(tab);
    $("#step-title b").textContent = STEP_NAME[tab]; $("#step-title small").textContent = (si + 1) + " / " + STEPS.length + (tab === "hw" || (tab === "sw" && innerWidth > 760) ? "" : ui.open ? " · 메뉴 닫기" : " · 메뉴 열기");
    $("#step-title").setAttribute("aria-expanded", ui.open);
    $("#step-prev").hidden = si === 0; $("#step-prev span").textContent = si > 0 ? STEP_NAME[STEPS[si - 1]] : "";
    const last = si === STEPS.length - 1;
    $("#step-next span").textContent = last ? "완료" : STEP_NAME[STEPS[si + 1]]; $("#step-next").classList.toggle("done", last);
    $("#panel").hidden = !ui.open || tab === "hw"; $("#panel-title").textContent = STEP_NAME[tab]; $("#reboot-btn").hidden = tab !== "sw";
    if (SIM.selected) ui.wire = null;
    const pop = $("#pop"), showPop = (!!SIM.selected || !!ui.wire) && !F.active && SIM.scene.env === "bench" && !ui.fcView;
    pop.hidden = !showPop; if (showPop) pop.innerHTML = ui.wire ? "<h3>배선</h3><p class=\"where\">" + esc(ui.wire.label) + '</p><div class="btns">' + btn("wireCut", "분리") + btn("wireClose", "닫기", "ghost") + "</div>" : popHtml(SIM.selected);
    const doneMark = { accel: SIM.state.cal.accel, compass: SIM.state.cal.compass, radio: SIM.state.cal.radio, esccal: SIM.state.cal.esc, frame: P().FRAME_CLASS === 1 };
    $("#subnav").innerHTML = NAV[tab].map(([k, n], i) => (tab === "sw" && i === 0 ? '<p class="navgroup">필수 설정</p>' : "") + (tab === "sw" && k === "battery" ? '<p class="navgroup">선택 설정</p>' : "") + '<button type="button" data-act="page" data-arg="' + k + '"' + (k === page ? ' aria-current="true"' : "") + ">" + (tab === "sw" ? '<span class="navnum">' + (i + 1) + "</span>" : "") + "<span>" + n + "</span>" + (tab === "sw" && doneMark[k] ? '<span class="navok" aria-label="완료">✓</span>' : "") + "</button>").join("");
    const body = $("#page"), keep = body.scrollTop, focus = document.activeElement && document.activeElement.id;
    let html = "<h2>" + NAV[tab].find((n) => n[0] === page)[1] + "</h2>";
    if (tab === "sw" && !pw.fc) html += note("비행 컨트롤러가 장착되지 않아 연결할 수 없습니다 (No Heartbeat). 하드웨어 메뉴에서 FC를 먼저 장착하세요.", "bad");
    else html += PAGES[page]();
    body.innerHTML = html; body.scrollTop = keep;
    if (focus && document.getElementById(focus) && focus === "pfilter") { const el = document.getElementById(focus); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    if (ui.fcView && !(pw.fc && !F.active)) ui.fcView = false;
    const fv = $("#fcview"); fv.hidden = !ui.fcView; if (ui.fcView) fv.innerHTML = fcViewHtml();
    const tv = $("#txview"); tv.hidden = !ui.txView || F.active; if (!tv.hidden) tv.innerHTML = txHtml();
    if (!SIM.switchOk()) SIM.safetyPressed = false;
    // 소프트웨어 설정 단계: 왼쪽 3D, 오른쪽에 미션플래너식 설정 메뉴를 고정
    const dock = tab === "sw" && innerWidth > 760; document.body.classList.toggle("dock", dock);
    if (dock) { $("#panel").hidden = false; $("#panel").style.left = ""; $("#panel").style.top = ""; $("#panel").style.right = ""; }
    if (dock !== ui.wasDock) { ui.wasDock = dock; requestAnimationFrame(() => window.dispatchEvent(new Event("resize"))); }
    const showTx = (tab === "sw" && ["radio", "modes", "failsafe"].includes(page) && pw.fc) || (tab === "test" && page === "flight" && F.active);
    const showHud = pw.fc && ((tab === "sw" && ["accel", "compass", "orient"].includes(page)) || (tab === "test" && ["sensor", "flight"].includes(page)));
    $("#tx").hidden = !showTx; $("#hud").hidden = !showHud; SIM.txVisible = showTx;
    $("#tx-power").textContent = SIM.tx.on ? "송신기 켜짐" : "송신기 꺼짐"; $("#tx-power").className = "btn " + (SIM.tx.on ? "on" : "bad");
    document.querySelectorAll("#tx-sw button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.arg === SIM.tx.sw));
    SIM.scene.dragDrone = (tab === "test" && page === "sensor") || (tab === "sw" && page === "compass" && !!ui.compass);
    setHint();
  }
  function setHint() {}
  const STEPS = ["hw", "sw", "test"], STEP_NAME = { hw: "하드웨어 설정", sw: "소프트웨어 설정", test: "테스트" };
  ui.ACT_go = (t) => { ui.open = true; go(t); };
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
    tab: (a) => { if (ui.open && ui.tab === a) { ui.open = false; render(); } else { ui.open = true; go(a); } },
    closePanel: () => { ui.open = false; render(); },
    menu: () => { if (ui.tab === "hw") return; ui.open = !ui.open; render(); },
    stepPrev: () => { const i = STEPS.indexOf(ui.tab); if (i > 0) { ui.open = true; go(STEPS[i - 1]); } },
    stepNext: () => { const i = STEPS.indexOf(ui.tab); if (i < STEPS.length - 1) { ui.open = true; go(STEPS[i + 1]); } else if (SIM.session) SIM.session.finish(); },
    page: (a) => go(ui.tab, a),
    home: () => SIM.scene.home(),
    xray: () => { SIM.scene.xray = !SIM.scene.xray; $("#xray").setAttribute("aria-pressed", SIM.scene.xray); },
    txKey: (a) => txKey(a),
    txClose: () => { ui.txView = false; render(); },
    wireCut: () => { const m = ui.wire; ui.wire = null; if (m) SIM.scene.disconnectTip(m.tip); else render(); },
    wireClose: () => { ui.wire = null; render(); },
    rxFlip: (a) => { SIM.state.wiring[a] = !SIM.state.wiring[a]; SIM.emit(); },
    bind: () => { const r = SIM.bindRx(), M = { held: "바인드 버튼을 누르고 있습니다. 이 상태로 수신기에 전원을 넣으세요.", released: "바인드 버튼에서 손을 뗐습니다.", "": "수신기 바인드 대기 중 (LED 빠르게 깜빡임)" }; SIM.toast(M[r] !== undefined ? M[r] : r, M[r] !== undefined ? "" : "bad"); },
    reboot: () => { const e = SIM.reboot(); SIM.toast(e || "FC 재부팅 완료", e ? "bad" : "ok"); },
    focusPart: (a) => { SIM.select(a); SIM.scene.focus(a); },
    select: (a) => SIM.select(a && SIM.selected !== a ? a : null),
    install: (a) => { const e = SIM.install(SIM.selected, a); if (e) SIM.toast(e, "bad"); },
    remove: (a) => SIM.remove(a), rotate: (a) => SIM.rotate(a), flip: (a) => SIM.flipProp(a),
    fcView: () => { ui.fcView = true; ui.cable = null; render(); }, fcClose: () => { ui.fcView = false; render(); },
    cable: (a) => { ui.cable = ui.cable === a ? null : a; render(); },
    port: (a) => {
      const w = SIM.state.wiring, cur = Object.keys(w.plug).find((c) => w.plug[c] === a && SIM.cableReady(c));
      if (!ui.cable) { if (cur) SIM.setPlug(cur, ""); else SIM.toast("먼저 꽂을 케이블을 고르세요."); return; }
      if (SIM.CABLES[ui.cable].conn !== SIM.portType(a)) return SIM.toast("커넥터 모양이 맞지 않아 들어가지 않습니다.", "bad");
      const c = ui.cable; ui.cable = null; SIM.setPlug(c, a); SIM.sfx("plug");
    },
    safety: () => { if (!SIM.switchOk()) return SIM.toast("안전 스위치가 반응하지 않습니다.", "bad"); SIM.safetyPressed = !SIM.safetyPressed; render(); },
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
    compassAuto: () => { SIM.scene.tumble = 60; },
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
    escCal: () => { if (SIM.POS_IDS.some((id) => !SIM.has("esc@" + id) || !SIM.escPowered(id) || !SIM.motorNumForPos(id)) || !SIM.power().pdb) return SIM.toast("ESC 교정 실패 · ESC가 응답하지 않습니다", "bad"); SIM.state.cal.esc = true; SIM.toast("ESC 교정 완료 · 네 개의 스로틀 범위가 같아졌습니다", "ok"); SIM.emit(); },
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
    escPwr: (v, a) => SIM.setEscXt(a, v),
    motorWire: (v, a) => { SIM.state.wiring.motorWires[a.slice(0, 2)][a[2]] = v; SIM.emit(); },
    rvmask: (v, a, el) => { const b = 1 << (a - 1); SIM.setParam("SERVO_BLH_RVMASK", el.checked ? P().SERVO_BLH_RVMASK | b : P().SERVO_BLH_RVMASK & ~b); },
    rxEnd: (v) => { SIM.state.wiring.rxEnd = v; SIM.emit(); },
    escTelem: (v, a) => { SIM.state.wiring.escTelem[a] = v; SIM.emit(); },
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
        SIM.state.cal.compass = true; SIM.state.needReboot = true; SIM.toast("나침반 교정 완료 · 재부팅하세요 (Please reboot the autopilot)", "ok"); SIM.emit();
      }
    } else if (page === "test/flight" && F.active) {
      txt("f-mode", SIM.MODES[F.mode] + (F.fsRadio ? " (FS)" : "")); txt("f-arm", F.crashed ? "전복" : F.armed ? "ARMED" : "DISARMED");
      txt("f-alt", (F.pos.y - F.home.y).toFixed(1) + " m"); txt("f-batt", F.volt.toFixed(1) + " V · " + Math.max(0, 100 - (F.used / F.cap) * 100).toFixed(0) + "%");
    }
    if (page === "test/motor" || (page === "test/flight" && F.active)) {
      const et = SIM.escTelemetry();
      for (let n = 1; n <= 4; n++) { const d = et[n]; txt("et-r" + n, d ? String(d.rpm) : "—"); txt("et-a" + n, d ? d.amps.toFixed(1) + " A" : "—"); txt("et-t" + n, d ? d.temp + " °C" : "—"); txt("et-v" + n, d ? d.volt.toFixed(1) + " V" : "—"); }
    }
    if (SIM.txBinding && SIM.tx.on && performance.now() - lastBeep > 700) { lastBeep = performance.now(); beep(); }
    if (tx12.cal === 2 && tx12.ext) { const t = SIM.tx, e = tx12.ext; for (const a of ["lx", "ly", "rx", "ry"]) { e[a][0] = Math.min(e[a][0], t[a]); e[a][1] = Math.max(e[a][1], t[a]); } const lr = document.querySelector("#txview .lcd-row:last-child span:last-child"); if (lr) lr.textContent = calLeft() || "OK → [ENT]"; }
    if (ui.txView && !$("#txview").hidden) { const gs = document.querySelectorAll("#txview .gimbal i"), t = SIM.tx; if (gs.length === 2) { gs[0].style.left = 50 + t.lx * 40 + "%"; gs[0].style.top = 50 - t.ly * 40 + "%"; gs[1].style.left = 50 + t.rx * 40 + "%"; gs[1].style.top = 50 - t.ry * 40 + "%"; } }
    const pop = $("#pop");
    if (!pop.hidden && ui.wire) { const st = pop.parentElement.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(st.width - pop.offsetWidth - 8, ui.wireAt[0] - st.left + 12)) + "px"; pop.style.top = Math.max(8, Math.min(st.height - pop.offsetHeight - 8, ui.wireAt[1] - st.top - 20)) + "px"; }
    else if (!pop.hidden && SIM.selected) {
      const s = SIM.scene.screenOf(SIM.selected), st = pop.parentElement, W = st.clientWidth, H = st.clientHeight;
      pop.style.left = Math.max(8, Math.min(W - pop.offsetWidth - 8, s.x + 16)) + "px";
      pop.style.top = Math.max(8, Math.min(H - pop.offsetHeight - 8, s.y - 24)) + "px";
    }

  };

  ui.ACT = null;
  ui.init = function () {
    document.body.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("g.port")) { e.preventDefault(); ACT.port(e.target.dataset.arg); } });
    document.body.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && !b.disabled && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset.arg); });
    document.body.addEventListener("change", (e) => { const t = e.target; if (t.dataset.change && CHG[t.dataset.change]) CHG[t.dataset.change](t.value, t.dataset.arg, t); });
    document.body.addEventListener("input", (e) => { if (e.target.dataset.input === "pfilter") { ui.paramFilter = e.target.value; render(); } });
    setL = bindStick($("#stickL"), (x, y) => { SIM.tx.lx = x; if (y !== null) SIM.tx.ly = y; }, false);
    setR = bindStick($("#stickR"), (x, y) => { SIM.tx.rx = x; SIM.tx.ry = y === null ? 0 : y; }, true);
    SIM.scene.onPick = (id) => { ui.wire = null; SIM.select(id && id !== SIM.selected ? id : null); };
    SIM.scene.onTx = () => { ui.txView = true; render(); };
    SIM.onMotorTest = () => { if (ui.tab === "test" && ui.page.test === "motor") render(); };
    // 조종기 창의 스틱(짐벌)을 직접 끌어 움직인다 (왼쪽: 요·스로틀, 오른쪽: 롤·피치 — Mode 2 기준 실제 스틱 위치)
    let gd = null;
    document.body.addEventListener("pointerdown", (e) => { const gEl = e.target.closest("#txview .gimbal"); if (!gEl) return; const all = [...document.querySelectorAll("#txview .gimbal")]; gd = { side: all.indexOf(gEl), el: gEl, id: e.pointerId }; gEl.setPointerCapture(e.pointerId); moveG(e); e.preventDefault(); });
    const moveG = (e) => { if (!gd) return; const r = gd.el.getBoundingClientRect(), x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1))); if (gd.side === 0) { SIM.tx.lx = x; SIM.tx.ly = y; } else { SIM.tx.rx = x; SIM.tx.ry = y; } };
    document.body.addEventListener("pointermove", (e) => { if (gd && e.pointerId === gd.id) moveG(e); });
    document.body.addEventListener("pointerup", (e) => { if (!gd || e.pointerId !== gd.id) return; if (gd.side === 1) { SIM.tx.rx = 0; SIM.tx.ry = 0; } else SIM.tx.lx = 0; gd = null; });
    SIM.scene.onWire = (meta, x, y) => { ui.wire = meta; ui.wireAt = [x, y]; if (SIM.selected) SIM.select(null); else render(); };
    SIM.scene.onFcCable = (c) => { ui.fcView = true; ui.cable = SIM.cableReady(c) ? c : null; render(); };
    // 끌기·연결 중 커서 옆 이름표
    SIM.scene.onHover = (t, x, y) => {
      const tip = $("#hovertip"); ui.hover = t;
      if (!t) { tip.hidden = true; return; }
      const r = tip.parentElement.getBoundingClientRect();
      tip.textContent = t; tip.hidden = false;
      if (x !== undefined) { tip.style.left = x - r.left + "px"; tip.style.top = y - r.top + "px"; }
    };
    // 메뉴 창 끌어서 옮기기 (넓은 화면)
    const panel = $("#panel"), head = $("#panel-head"); let pd = null;
    head.addEventListener("pointerdown", (e) => { if (e.target.closest("button") || innerWidth <= 760) return; const r = panel.getBoundingClientRect(), s = panel.parentElement.getBoundingClientRect(); pd = { dx: e.clientX - r.left, dy: e.clientY - r.top, s }; head.setPointerCapture(e.pointerId); });
    head.addEventListener("pointermove", (e) => { if (!pd) return; const x = Math.max(0, Math.min(pd.s.width - panel.offsetWidth, e.clientX - pd.s.left - pd.dx)), y = Math.max(0, Math.min(pd.s.height - 60, e.clientY - pd.s.top - pd.dy)); panel.style.left = x + "px"; panel.style.top = y + "px"; panel.style.right = "auto"; });
    head.addEventListener("pointerup", () => (pd = null));
    SIM.on(render);
    render();
  };
})();
