/**
 * 드론 조립과 정비 시뮬레이터 — 관리자 기록 받기 (Google Apps Script)
 * 교육생이 '종료'를 누르면 시뮬레이터가 이 웹 앱으로 기록을 보내고, 이 스크립트가 시트에 한 줄씩 적는다.
 *   - "기록" 시트: 날짜, 이름, 소요 시간, 시작·완료 시각, 오류 건수, 시동 전 점검
 *   - "상세" 시트: 무엇이 잘못됐는지(항목·내용)와 그때 발생하는 문제
 */
function doPost(e) {
  var r = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sum = ss.getSheetByName("기록") || ss.insertSheet("기록");
    if (sum.getLastRow() === 0) sum.appendRow(["날짜", "이름", "소요 시간", "소요 시간(초)", "시작", "완료", "오류(건)", "시동 전 점검", "기록 ID"]);
    sum.appendRow([r.date, r.name, r.time, r.seconds, r.start, r.end, r.errors, r.prearm, r.id]);

    var det = ss.getSheetByName("상세") || ss.insertSheet("상세");
    if (det.getLastRow() === 0) det.appendRow(["날짜", "이름", "구분", "등급", "항목", "무엇이 문제인가", "발생하는 문제", "기록 ID"]);
    var issues = r.issues || [];
    if (!issues.length) det.appendRow([r.date, r.name, "-", "-", "문제 없음", "", "", r.id]);
    for (var i = 0; i < issues.length; i++) {
      var it = issues[i];
      det.appendRow([r.date, r.name, it.area, it.level, it.item, it.detail, it.effect, r.id]);
    }
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput("ok");
}
