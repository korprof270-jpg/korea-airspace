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
  async function shareRecord(rec) {
    const db = await getDb(); if (!db) return false;
    try { await db.collection("records").add(rec); return true; } catch (e) { return false; }
  }
  async function recordsOf(date) {
    const local = load(REC, []).filter((r) => r.date === date);
    const db = await getDb(); if (!db) return local;
    try {
      const snap = await db.collection("records").where("date", "==", date).get();
      const all = snap.docs.map((d) => d.data()), seen = new Set(all.map((r) => r.id));
      return all.concat(local.filter((r) => !seen.has(r.id))).sort((a, b) => (a.end < b.end ? -1 : 1));
    } catch (e) { return local; }
  }

  // ----- 엑셀(.xlsx) 만들기와 저장 -----
  const COLS = [["date", "날짜"], ["name", "이름"], ["time", "소요 시간"], ["seconds", "소요 시간(초)"], ["start", "시작 시각"], ["end", "완료 시각"], ["errors", "조립·배선 오류(건)"], ["prearm", "시동 전 점검"]];
  function workbook(date, rows) {
    const data = rows.map((r) => Object.fromEntries(COLS.map(([k, n]) => [n, r[k]])));
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(data, { header: COLS.map((c) => c[1]) });
      ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, date);
      return { filename: "드론정비_기록_" + date + ".xlsx", data: XLSX.write(wb, { type: "array", bookType: "xlsx" }) };
    }
    // 엑셀 라이브러리를 못 불러온 경우: 엑셀에서 열리는 CSV
    const csv = "﻿" + [COLS.map((c) => c[1])].concat(rows.map((r) => COLS.map(([k]) => '"' + String(r[k]).replace(/"/g, '""') + '"'))).map((l) => l.join(",")).join("\r\n");
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
    $("#finish-card").innerHTML = '<h2>정비를 마치고 기록할까요?</h2><p class="muted">' + esc(S.name) + " · " + dateStr(new Date()) + '</p><p class="bigtime">' + fmt(elapsed()) + '</p><ul class="checks"><li class="' + (errs ? "bad" : "ok") + '"><span class="mark">' + (errs ? "✕" : "✓") + "</span><div><b>조립·배선 오류 " + errs + "건</b></div></li><li class=\"" + (pre.length ? "bad" : "ok") + '"><span class="mark">' + (pre.length ? "✕" : "✓") + "</span><div><b>시동 전 점검 " + (pre.length ? "불가 " + pre.length + "건" : "통과") + '</b></div></li></ul><div class="btns">' +
      '<button type="button" class="btn primary" data-act="sessionConfirm">완료 기록 · 엑셀 저장</button><button type="button" class="btn ghost" data-act="sessionCancel">계속 작업하기</button></div>';
    $("#finish").hidden = false;
  };
  async function confirmFinish() {
    const end = new Date(), sec = Math.round(elapsed()), startD = new Date(S.startAt);
    const errs = SIM.hardwareCheck().filter((i) => i.lvl === "bad").length, pre = SIM.prearm(0);
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date: dateStr(end), name: S.name, seconds: sec, time: fmt(sec), start: timeStr(startD), end: timeStr(end), errors: errs, prearm: pre.length ? "불가 (" + pre.length + "건)" : "통과" };
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
    $("#finish-card").innerHTML = "<h2>기록되었습니다</h2><p>" + esc(rec.name) + " · " + rec.date + " · 소요 시간 <b>" + rec.time + '</b></p><p class="muted">' + esc(msg) + (shared ? " 공유 기록에도 저장했습니다." : "") + '</p><h4>' + rec.date + ' 기록</h4><div class="tblwrap"><table class="tbl"><thead><tr>' + COLS.filter(([k]) => k !== "date" && k !== "seconds").map(([, n]) => "<th>" + n + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + COLS.filter(([k]) => k !== "date" && k !== "seconds").map(([k]) => "<td>" + esc(r[k]) + "</td>").join("") + "</tr>").join("") + '</tbody></table></div><div class="btns"><button type="button" class="btn" data-act="sessionSaveAgain">엑셀 다시 저장</button><button type="button" class="btn primary" data-act="sessionNew">새 교육생 시작</button></div>';
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
