// 드론 정비 시뮬레이터 — 시작
(function () {
  const SIM = window.SIM;
  if (!window.THREE) {
    document.getElementById("page").innerHTML = '<p class="note bad">3D 라이브러리(three.js)를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.</p>';
    return;
  }
  SIM.scene.init(document.getElementById("gl"));
  SIM.ui.init();
  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    SIM.tick(dt);
    SIM.scene.update(Math.min(dt, 0.05));
    SIM.ui.frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
