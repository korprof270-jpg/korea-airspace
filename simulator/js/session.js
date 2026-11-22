// 드론 정비 시뮬레이터 — 시작 화면(이름·START), 타이머, 완료 기록과 엑셀 보고
(function () {
  const SIM = window.SIM, $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const KEY = "drone-sim-session", REC = "drone-sim-records";
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (sec) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(s); };
  const dateStr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const timeStr = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());

  const S = (SIM.session = load(KEY, { name: "", startAt: 0, running: false }));
  const persist = () => save(KEY, { name: S.name, startAt: S.startAt, running: S.running });
  const elapsed = () => (S.running ? (Date.now() - S.startAt) / 1000 : S.final || 0);

  // ----- 공유 기록 (게시 페이지에서만): 강사가 그날 교육생 전체 기록을 모아 받는다 -----
  let dbP = null;
  const getDb = () => (dbP = dbP || (window.claude && window.claude.use ? window.claude.use("db").catch(() => null) : Promise.resolve(null)));
  // 교육생마다 records/<자기 id> 문서 하나에 회차를 쌓고, 소유자(강사)는 records 전체를 읽는다
  async function myDoc() {
    const db = await getDb(); if (!db) return null;
    const user = await window.claude.use("user").catch(() => null); if (!user) return null;
    const id = await user.id().catch(() => null); return id ? db.doc("records/" + id) : null;
  }
  async function shareRecord(rec) {
    try { const d = await myDoc(); if (!d) return false; const snap = await d.get(); const runs = ((snap.data() || {}).runs || []).slice(-200); await d.set({ runs: runs.concat(rec) }); return true; } catch (e) { return false; }
  }
  async function recordsOf(date) {
    const local = load(REC, []).filter((r) => r.date === date);
    let shared = [];
    const db = await getDb();
    if (db) {
      try { const snap = await db.collection("records").get(); snap.docs.forEach((d) => (shared = shared.concat((d.data() || {}).runs || []))); }
      catch (e) { try { const d = await myDoc(); if (d) shared = ((await d.get()).data() || {}).runs || []; } catch (e2) {} }
    }
    const seen = new Set(), out = [];
    for (const r of shared.concat(local)) if (r && r.date === date && !seen.has(r.id)) { seen.add(r.id); out.push(r); }
    return out.sort((a, b) => (a.end < b.end ? -1 : 1));
  }

  // ----- 결과 항목: 무엇이 안 되었는지와 그때 생기는 문제 (엑셀에만 기록) -----
  const EFFECT = [
    [/나사/, (t) => (/모터|붐대|프로펠러/.test(t) ? "비행 중 진동으로 풀려 부품 이탈, 추락" : "진동·자세 오차, 기체 흐름")],
    [/모터 회전 방향|모터선|ESC 신호선|ESC 전원|프로펠러 종류|FC 장착 방향|프레임 타입/, () => "이륙 직후 기체가 뒤집힘(전복)"],
    [/프로펠러 방향/, () => "추력 부족, 한쪽으로 흐름"],
    [/모터 종류/, () => "비행 중 프로펠러 너트가 풀려 이탈, 추락"],
    [/프로펠러|모터 마운트|모터$/, () => "추력 부족 또는 비행 불가"],
    [/FC 위치/, () => "자세 오차로 기체가 흐름"],
    [/GPS|나침반/, () => "Loiter·RTL 불가 또는 위치가 원을 그리며 흐름"],
    [/수신기/, () => "RC 신호 없음, 시동 불가"],
    [/PMU|배터리/, () => "FC 전원·전압 정보 없음, 시동 불가 또는 저전압 경고 불가"],
    [/안전 스위치/, () => "시동 불가"],
    [/부저/, () => "시동·경고음을 들을 수 없음"],
    [/텔레메트리/, () => "지상국 연결 안 됨"],
    [/통신선|하네스/, () => "ESC 회전수·전류·온도를 받지 못함"],
    [/붐대 색/, () => "기수 방향을 헷갈려 조종 실수"],
    [/하판|상판|스키드|붐대|비행 컨트롤러/, () => "기체 구조 불완전, 비행 불가"],
  ];
  const effectOf = (t) => { for (const [re, f] of EFFECT) if (re.test(t)) return f(t); return ""; };
  function issueList() {
    const hw = SIM.hardwareCheck().filter((i) => i.lvl !== "ok").map((i) => ({ area: "하드웨어", item: i.t, detail: i.d, effect: effectOf(i.t), level: i.lvl === "bad" ? "오류" : "주의" }));
    const sw = SIM.softwareCheck().map((i) => ({ area: "소프트웨어", item: i.t, detail: i.d, effect: i.e, level: "오류" }));
    const pre = SIM.prearm(0).map((m) => ({ area: "시동 전 점검", item: "PreArm", detail: m, effect: "시동 불가", level: "오류" }));
    return hw.concat(sw, pre);
  }

  // ----- 엑셀(.xlsx) 만들기와 저장 -----
  const COLS = [["date", "날짜"], ["name", "이름"], ["time", "소요 시간"], ["seconds", "소요 시간(초)"], ["start", "시작 시각"], ["end", "완료 시각"], ["errors", "오류(건)"], ["prearm", "시동 전 점검"]];
  function workbook(date, rows) {
    const data = rows.map((r) => Object.fromEntries(COLS.map(([k, n]) => [n, r[k]])));
    const DCOLS = [["name", "이름"], ["area", "구분"], ["level", "등급"], ["item", "항목"], ["detail", "무엇이 문제인가"], ["effect", "발생하는 문제"]];
    const detail = [];
    rows.forEach((r) => { const list = r.issues || []; if (!list.length) detail.push({ name: r.name, area: "-", level: "-", item: "문제 없음", detail: "", effect: "" }); list.forEach((i) => detail.push(Object.assign({ name: r.name }, i))); });
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(data, { header: COLS.map((c) => c[1]) });
      ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
      const ws2 = XLSX.utils.json_to_sheet(detail.map((d) => Object.fromEntries(DCOLS.map(([k, n]) => [n, d[k] || ""]))), { header: DCOLS.map((c) => c[1]) });
      ws2["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 28 }, { wch: 60 }, { wch: 40 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, date); XLSX.utils.book_append_sheet(wb, ws2, "상세 " + date);
      return { filename: "드론정비_기록_" + date + ".xlsx", data: XLSX.write(wb, { type: "array", bookType: "xlsx" }) };
    }
    // 엑셀 라이브러리를 못 불러온 경우: 엑셀에서 열리는 CSV
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const csv = "\ufeff" + [COLS.map((c) => c[1])].concat(rows.map((r) => COLS.map(([k]) => q(r[k])))).map((l) => l.join(",")).join("\r\n") + "\r\n\r\n" + [DCOLS.map((c) => c[1])].concat(detail.map((d) => DCOLS.map(([k]) => q(d[k])))).map((l) => l.join(",")).join("\r\n");
    return { filename: "드론정비_기록_" + date + ".csv", data: csv };
  }
  async function offerFile(file) {
    const dl = window.claude && window.claude.use ? await window.claude.use("downloads").catch(() => null) : null;
    if (dl) {
      try { await dl.save(file); return "saved"; } catch (e) { return e && e.code === "declined" ? "declined" : "failed"; }
    }
    if (window.claude) return "failed";
    const blob = file.data instanceof ArrayBuffer ? new Blob([file.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }) : new Blob([file.data], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return "saved";
  }

  // ----- 시작 화면 -----
  function showIntro(step) {
    $("#intro").hidden = false;
    const ready = step === "ready";
    $("#intro-form").hidden = ready; $("#intro-ready").hidden = !ready;
    if (ready) $("#intro-hello").textContent = S.name + "님, 준비되면 START를 누르세요. 누르는 순간 시간이 올라갑니다.";
    else { $("#trainee-name").value = S.name || ""; setTimeout(() => $("#trainee-name").focus(), 50); }
  }
  $("#intro-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#trainee-name").value.trim();
    if (!n) return;
    S.name = n; persist(); showIntro("ready");
  });
  function start() {
    SIM.resetAll(); // 모든 부품을 나누어 작업대에 정렬한 상태에서 시작
    if (SIM.flight.active) SIM.flight.stop();
    S.startAt = Date.now(); S.running = true; S.final = 0; persist();
    $("#intro").hidden = true; $("#finish").hidden = true;
    $("#trainee").textContent = S.name;
    if (SIM.ui && SIM.ui.ACT_go) SIM.ui.ACT_go("hw");
  }

  // ----- 완료 -----
  S.finish = function () {
    if (!S.running) return;
    const errs = SIM.hardwareCheck().filter((i) => i.lvl === "bad").length, pre = SIM.prearm(0);
    $("#finish-card").innerHTML = '<h2>정비를 마치고 기록할까요?</h2><p class="muted">' + esc(S.name) + " · " + dateStr(new Date()) + '</p><p class="bigtime">' + fmt(elapsed()) + '</p><p class="muted">기록하면 결과는 엑셀 파일로만 확인할 수 있습니다.</p><div class="btns">' +
      '<button type="button" class="btn primary" data-act="sessionConfirm">완료 기록 · 엑셀 저장</button><button type="button" class="btn ghost" data-act="sessionCancel">계속 작업하기</button></div>';
    $("#finish").hidden = false;
  };
  async function confirmFinish() {
    const end = new Date(), sec = Math.round(elapsed()), startD = new Date(S.startAt);
    const issues = issueList(), errs = issues.filter((i) => i.level === "오류").length, pre = SIM.prearm(0);
    const rec = { issues, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date: dateStr(end), name: S.name, seconds: sec, time: fmt(sec), start: timeStr(startD), end: timeStr(end), errors: errs, prearm: pre.length ? "불가 (" + pre.length + "건)" : "통과" };
    S.running = false; S.final = sec; persist();
    const recs = load(REC, []); recs.push(rec); save(REC, recs);
    const shared = await shareRecord(rec);
    const rows = await recordsOf(rec.date);
    S.lastFile = workbook(rec.date, rows);
    const how = await offerFile(S.lastFile);
    renderResult(rec, rows, shared, how);
  }
  function renderResult(rec, rows, shared, how) {
    const msg = how === "saved" ? S.lastFile.filename + " 파일을 저장했습니다." : how === "declined" ? "파일 저장을 취소했습니다. 아래 버튼으로 다시 저장할 수 있습니다." : "이 화면에서는 파일을 저장할 수 없습니다.";
    $("#finish-card").innerHTML = "<h2>기록되었습니다</h2><p>" + esc(rec.name) + " · " + rec.date + " · 소요 시간 <b>" + rec.time + '</b></p><p class="muted">' + esc(msg) + (shared ? " 공유 기록에도 저장했습니다." : "") + '</p><h4>' + rec.date + ' 기록</h4><div class="tblwrap"><table class="tbl"><thead><tr>' + COLS.filter(([k]) => ["name", "time", "start", "end"].includes(k)).map(([, n]) => "<th>" + n + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + COLS.filter(([k]) => ["name", "time", "start", "end"].includes(k)).map(([k]) => "<td>" + esc(r[k]) + "</td>").join("") + "</tr>").join("") + '</tbody></table></div><div class="btns"><button type="button" class="btn" data-act="sessionSaveAgain">엑셀 다시 저장</button><button type="button" class="btn primary" data-act="sessionNew">새 교육생 시작</button></div>';
  }

  // ----- 버튼 -----
  document.body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act;
    if (a === "sessionStart") start();
    else if (a === "sessionRename") showIntro("name");
    else if (a === "sessionCancel") $("#finish").hidden = true;
    else if (a === "sessionConfirm") { b.disabled = true; b.textContent = "기록 중…"; confirmFinish(); }
    else if (a === "sessionSaveAgain" && S.lastFile) { const how = await offerFile(S.lastFile); if (how !== "saved") SIM.toast("파일을 저장하지 못했습니다.", "bad"); }
    else if (a === "sessionNew") { $("#finish").hidden = true; S.name = ""; S.running = false; S.final = 0; persist(); showIntro("name"); }
  });

  // ----- 타이머 -----
  setInterval(() => { const t = $("#timer"); if (t) t.textContent = fmt(elapsed()); }, 250);
  $("#trainee").textContent = S.name || "";
  if (S.running && S.name) $("#intro").hidden = true; // 새로고침해도 진행 중이던 시간은 이어진다
  else if (S.name) showIntro("ready");
  else showIntro("name");
})();
