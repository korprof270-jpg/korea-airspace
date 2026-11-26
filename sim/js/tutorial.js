// 처음 하는 사람용 안내: 환영 → 메인 메뉴 둘러보기(조작법 포함) → 스토리 화면·격납고에 처음 들어갈 때 → 첫 비행 코치
//  화면 요소 위에 말풍선을 띄우는 코치마크. 언제든 건너뛸 수 있고, 설정 > 조종의 ‘안내 다시 보기’로 처음부터 다시 본다
//  진행은 localStorage("fpv-tutorial-v1") 에 { done: { welcome, main, story, hangar, flight } } 로 저장 (접근 실패는 무시)
import { settings, STICK_MODES } from "./config.js";

const KEY = "fpv-tutorial-v1";
const PARTS = ["welcome", "main", "story", "hangar", "flight"];
function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "{}"); return v && typeof v === "object" && v.done ? v : { done: {} }; } catch (_) { return { done: {} }; }
}
function store(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) { /* 저장 불가 환경: 이번 실행 동안만 기억 */ } }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// 지금 스틱 모드에서 각 축을 움직이는 키 · 게임패드 스틱 이름
export function controlNames() {
  const m = STICK_MODES[settings.stickMode] || STICK_MODES[2], out = {};
  const KEYS = { ly: ["W", "S", "왼쪽 스틱 위아래"], lx: ["A", "D", "왼쪽 스틱 좌우"], ry: ["↑", "↓", "오른쪽 스틱 위아래"], rx: ["←", "→", "오른쪽 스틱 좌우"] };
  for (const [slot, axis] of Object.entries({ ly: m.ly, lx: m.lx, ry: m.ry, rx: m.rx })) out[axis] = { k1: KEYS[slot][0], k2: KEYS[slot][1], pad: KEYS[slot][2] };
  return out;
}
const touch = () => matchMedia("(pointer: coarse)").matches;

export class Tutorial {
  constructor(ui) {
    this.ui = ui;
    this.st = load();
    this.el = null;
    this._key = (e) => {
      if (!this.el) return;
      if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); this.skip(); }
      else if (e.code === "Enter" || e.code === "ArrowRight" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); this.next(); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); this.prev(); }
      else e.stopPropagation();
    };
    addEventListener("keydown", this._key, true);
    addEventListener("resize", () => this.el && this._place());
  }
  done(part) { return !!this.st.done[part]; }
  mark(part) { this.st.done[part] = 1; store(this.st); }
  // 설정에서 다시 보기: 기록을 지우고 메인 메뉴에서 환영부터
  replay() {
    this.st = { done: {} }; store(this.st);
    this.close(); this.stopFlight();
    this.ui.show("main");
  }
  skipAll() { for (const p of PARTS) this.st.done[p] = 1; store(this.st); this.close(); this.stopFlight(); }

  // ui.show() 가 화면을 그린 직후 부른다
  onShow(name) {
    if (this.el && this.el.dataset.part !== "welcome") this.close();   // 화면이 바뀌면 진행 중이던 둘러보기는 닫는다(다음에 다시)
    requestAnimationFrame(() => {
      if (this.ui.screen !== name || this.el || this.ui.vn.el) return;
      if (name === "main") { if (!this.done("welcome")) this.welcome(); else if (!this.done("main")) this.tour("main"); }
      else if (name === "setup" && this.ui.sel.mode === "challenge" && (this.ui.sel.stab || "main") === "main" && !this.done("story")) this.tour("story");
      else if (name === "hangar" && !this.done("hangar")) this.tour("hangar");
    });
  }

  // ── 환영 카드 ──
  welcome() {
    this._open("welcome", [{ center: true, title: "FPV PROJECT에 오신 것을 환영합니다", html:
      `<p>드론을 1인칭으로 몰아 레이싱·추적·공중전, 그리고 이야기가 있는 스토리 임무를 날아 봅니다.</p>
       <p>처음이라면 1분짜리 안내로 메뉴, 조작법, 스토리 목표, 격납고, 퀘스트를 둘러보세요. 첫 비행에서는 이륙부터 차근차근 짚어 드립니다.</p>`,
      buttons: [["start", "안내 시작 →", true], ["skipall", "건너뛰기"]] }]);
  }

  // ── 둘러보기 단계 정의 ──
  _steps(part) {
    const c = controlNames(), thr = c.throttle, yaw = c.yaw, pit = c.pitch, rol = c.roll;
    const kb = `<table class="tutkeys">
        <tr><th>스로틀 (상승·하강)</th><td><kbd>${thr.k1}</kbd> <kbd>${thr.k2}</kbd></td><td>${thr.pad}</td></tr>
        <tr><th>요 (제자리 회전)</th><td><kbd>${yaw.k1}</kbd> <kbd>${yaw.k2}</kbd></td><td>${yaw.pad}</td></tr>
        <tr><th>피치 (전진·후진)</th><td><kbd>${pit.k1}</kbd> <kbd>${pit.k2}</kbd></td><td>${pit.pad}</td></tr>
        <tr><th>롤 (좌우 이동)</th><td><kbd>${rol.k1}</kbd> <kbd>${rol.k2}</kbd></td><td>${rol.pad}</td></tr></table>`;
    if (part === "main") return [
      { sel: ".hcards", title: "세 갈래 메뉴", html: "<p><b>연습 모드</b>에서 조작을 익히고, <b>스토리 모드</b>에서 이야기를 따라 임무를 깨고, <b>게임 모드</b>에서 기록과 점수를 겨룹니다.</p>" },
      { sel: '.hcard[data-v="practice"]', title: "처음이라면 여기부터", html: "<p><b>비행훈련</b>은 이륙부터 곡예까지 한 과목씩 과제를 주고, 시범 비행도 보여 줍니다. 몇 과목만 해 봐도 스토리 임무가 훨씬 쉬워집니다.</p>" },
      { center: true, title: "조작법 — 키보드 · 게임패드", html: `${kb}<p class="tutsmall">지금은 MODE ${settings.stickMode} 배치입니다. <kbd>Shift</kbd> 정밀 조종 · <kbd>C</kbd> 시점 · <kbd>R</kbd> 다시 세우기 · <kbd>Space</kbd> 레이저 · <kbd>F</kbd> 미사일 · <kbd>Esc</kbd> 일시정지. 게임패드는 두 스틱이 그대로 왼쪽·오른쪽 스틱입니다.</p>` },
      { center: true, title: "조작법 — 터치 화면", html: `<p>휴대폰·태블릿에서는 비행 중 화면 <b>왼쪽 절반</b>과 <b>오른쪽 절반</b>을 누르면 그 자리에 가상 스틱이 나타납니다. 누른 채 밀면 위 표의 스틱처럼 움직입니다.</p><p>전투 임무에서는 오른쪽 아래에 레이저·미사일·아이템 단추가 생깁니다. 자동 사격은 설정 &gt; 조종에서 켤 수 있습니다.</p>${touch() ? "<p><b>지금 기기는 터치 화면입니다.</b> 가상 스틱이 자동으로 켜집니다.</p>" : ""}<p class="tutsmall">처음에는 비행 모드 ANGLE(스틱을 놓으면 수평으로 돌아옴) + 3인칭 시점을 추천합니다.</p>` },
      { sel: '.hic[data-v="help"]', title: "조작법은 언제든", html: "<p>모든 키와 게임패드·RC 조종기 연결 방법은 여기 <b>조작법</b>에 있습니다. 스틱 모드·감도는 <b>설정</b>에서 바꿉니다.</p>" },
      { sel: '.hic[data-v="hangar"]', title: "격납고", html: "<p>비행을 마칠 때마다 <b>포인트(◆P)</b>가 쌓입니다. 격납고에서 포인트로 기체 외형·테마·효과를 사고, 슬롯 8개(장갑·모터·배터리·레이저·미사일·센서·실드·냉각)의 <b>파츠</b>를 갈아 끼우고 업그레이드하며, <b>스킬</b>도 강화합니다. 장착한 파츠는 기체 모습에도 그대로 보입니다.</p>" },
      { sel: ".hpts", title: "포인트 · 퀘스트", html: "<p>지금 가진 포인트와 남은 퀘스트 수입니다. <b>일일·주간 퀘스트</b>(예: 게이트 통과, 별 모으기)를 달성하면 자동으로 포인트가 들어오고, 모두 끝내면 보너스가 있습니다. 업적도 여기서 봅니다.</p>" },
      { sel: '.hcard[data-v="story"]', title: "스토리 모드", html: "<p>버려진 기체 ‘노을’과 함께하는 이야기. 장마다 임무를 깨고, 대화 속 선택으로 동료와의 관계와 작전이 바뀝니다. 처음 들어가면 임무 목표 읽는 법을 알려 드릴게요.</p>" },
      { center: true, title: "첫 비행을 해 볼까요?", html: "<p>비행훈련 첫 과목으로 바로 날아 봅니다. 비행 중에는 화면 위쪽에 할 일을 하나씩 띄워 드립니다.</p><p class=\"tutsmall\">이 안내는 <b>설정 &gt; 조종 &gt; 안내 다시 보기</b>에서 언제든 다시 볼 수 있습니다.</p>",
        buttons: [["fly", "첫 비행 시작 →", true], ["end", "나중에 할게요"]] },
    ];
    if (part === "story") return [
      { sel: ".stabs", title: "본편 · 인연 · 엔딩", html: "<p><b>본편</b>은 장과 단계, <b>인연</b>은 동료 한 사람씩의 개별 이야기와 전용 임무, <b>엔딩</b>은 지금까지 본 결말 목록입니다.</p>" },
      { sel: '[data-step="1"]', title: "장 고르기", html: "<p>장을 끝내면 다음 장이 열립니다. <b>⑂ 갈림길</b> 표시가 있는 장은 작전안을 골라 서로 다른 임무를 겪습니다.</p>" },
      { sel: ".objs", title: "임무 목표 읽는 법", html: "<p>단계마다 목표가 <b>3~4개</b> 있고, 그중 <b>2~3개</b>만 달성하면 통과입니다(위에 필요한 개수가 적혀 있어요).</p><p><b>★ 핵심</b> 목표는 반드시 달성해야 합니다. 핵심을 놓치면 나머지를 다 해도 실패예요.</p><p>비행 중에는 오른쪽 목록에 <b>✔</b> 달성 · <b>●</b> 유지 중 · <b>✖</b> 실패 · <b>○</b> 판정 대기로 표시됩니다.</p>" },
      { sel: ".brief .scenebtn, .brief", title: "출격 전 장면과 선택", html: "<p>출격 전 대화 장면에서 고른 선택지가 <b>작전을 바꾸기도</b> 합니다(⚑ 작전 변경: 윙맨·적 규모·목표). 동료 이름이 붙은 선택지는 그 동료와의 관계를 깊게 합니다.</p>" },
      { sel: ".startbar .primary", title: "출격", html: "<p>준비가 되면 출격! 실패해도 몇 번이든 다시 도전할 수 있고, 별 3개 평가를 노려 볼 수 있습니다.</p>" },
    ];
    if (part === "hangar") return [
      { sel: ".side .pts", title: "보유 포인트", html: "<p>비행을 마칠 때 기본 보상 + 별·승리 보상, 스토리 첫 클리어 +100P가 들어옵니다.</p>" },
      { sel: ".gtabs", title: "격납고 메뉴", html: "<p><b>외형</b> 프레임·스킨·색 · <b>테마</b> 한 번에 바꾸는 세트 · <b>효과</b> 레이저·부스트 모양 · <b>파츠</b> 성능 부품 · <b>스킬</b> 구매·장착·강화 · <b>퀘스트</b> 일일·주간 과제와 업적.</p>" },
      { sel: '.gtabs [data-v="parts"]', title: "파츠 장착 · 업그레이드", html: "<p>슬롯은 <b>8개</b>(장갑·모터·배터리·레이저·미사일·센서·실드·냉각). 슬롯마다 성격이 다른 부품 중 <b>하나</b>를 장착합니다 — 예를 들어 레이저는 속사형·고출력형·확산형처럼 장단점이 다릅니다.</p><p>부품마다 포인트로 <b>0~5단계</b> 업그레이드하고, 3단계와 5단계에서 추가 효과가 열립니다. 부품을 누르면 사기 전에 기체 모습과 성능 변화를 미리 볼 수 있습니다. 파츠 효과는 전투 모드(서바이벌·점령전·스토리 임무)에 적용됩니다.</p>" },
      { sel: '.gtabs [data-v="skill"]', title: "스킬 강화", html: "<p>스킬은 하나를 장착해 전투 중 게이지로 발동합니다. 포인트로 <b>Lv.5</b>까지 강화하면 피해·지속 시간·범위가 오르고 연출도 커집니다. <b>Lv.3</b>과 <b>Lv.5</b>에서는 새 효과가 더해집니다.</p>" },
      { sel: ".view", title: "기체 미리 보기", html: "<p>드래그해서 기체를 돌려 볼 수 있습니다. 바꾼 외형과 장착한 파츠는 바로 여기에 보입니다.</p>" },
      { sel: ".lsum", title: "장착 요약", html: "<p>기체 아래에 <b>기동·화력·방어·지원</b> 종합 성능 막대와 슬롯별 장착 부품·단계(●)·주요 효과가 늘 보입니다. 부품을 고르면 막대가 <b>현재 → 바꾼 뒤</b>로 움직입니다. 슬롯을 누르면 그 슬롯의 부품 목록으로 갑니다.</p>" },
    ];
    return [];
  }
  tour(part) { const steps = this._steps(part).filter((s) => s.center || document.querySelector(s.sel)); if (steps.length) this._open(part, steps); else this.mark(part); }

  // ── 코치마크 그리기 ──
  _open(part, steps) {
    this.close();
    this.part = part; this.steps = steps; this.i = 0;
    const el = (this.el = document.createElement("div"));
    el.className = "tut"; el.dataset.part = part;
    el.innerHTML = `<div class="tut-hole"></div><div class="tut-bub" role="dialog" aria-live="polite"></div>`;
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]");
      if (!b) return;
      const t = b.dataset.t;
      try { this.ui.game.sound.play("click"); } catch (_) { /* 소리 없음 */ }
      if (t === "next") this.next(); else if (t === "prev") this.prev(); else if (t === "skip") this.skip();
      else if (t === "skipall") this.skipAll();
      else if (t === "start") { this.mark("welcome"); this.close(); this.tour("main"); }
      else if (t === "end") { this.mark(this.part); this.close(); }
      else if (t === "fly") { this.mark("main"); this.close(); this.firstFlight(); }
    });
    document.body.appendChild(el);
    this._render();
    requestAnimationFrame(() => el.classList.add("in"));
  }
  _render() {
    const s = this.steps[this.i], n = this.steps.length, bub = this.el.querySelector(".tut-bub");
    const btns = s.buttons || [...(this.i ? [["prev", "← 이전"]] : []), ["next", this.i + 1 < n ? "다음 →" : "알겠어요", true], ["skip", "안내 건너뛰기"]];
    bub.innerHTML = `<div class="tut-h">${n > 1 ? `<small>${this.i + 1} / ${n}</small>` : ""}<b>${esc(s.title)}</b></div><div class="tut-b">${s.html}</div>
      <div class="tut-a">${btns.map(([t, l, pri]) => `<button data-t="${t}" class="${pri ? "primary" : "ghost"}">${l}</button>`).join("")}</div>`;
    this._place();
    const f = bub.querySelector(".primary"); if (f) f.focus({ preventScroll: true });
  }
  _place() {
    const s = this.steps[this.i], hole = this.el.querySelector(".tut-hole"), bub = this.el.querySelector(".tut-bub");
    const t = !s.center && document.querySelector(s.sel);
    if (t && t.scrollIntoView) t.scrollIntoView({ block: "nearest" });
    const r = t ? t.getBoundingClientRect() : null;
    if (!r || !r.width) { hole.style.cssText = "left:50%;top:50%;width:0;height:0"; bub.className = "tut-bub center"; bub.style.left = bub.style.top = ""; return; }
    const pad = 6, W = innerWidth, H = innerHeight;
    hole.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    bub.className = "tut-bub";
    const bw = Math.min(380, W - 32), bh = bub.offsetHeight || 200;
    let x = Math.max(16, Math.min(W - bw - 16, r.left + r.width / 2 - bw / 2));
    let y = r.bottom + 14;
    if (y + bh > H - 12) y = r.top - bh - 14;
    if (y < 12) { y = Math.max(12, Math.min(H - bh - 12, r.top + 12)); x = r.right + 14 + bw < W ? r.right + 14 : Math.max(16, r.left - bw - 14); }
    bub.style.left = `${x}px`; bub.style.top = `${y}px`; bub.style.width = `${bw}px`;
  }
  next() { if (!this.el) return; if (this.steps[this.i].buttons) return; if (this.i + 1 < this.steps.length) { this.i++; this._render(); } else { this.mark(this.part); this.close(); } }
  prev() { if (this.el && this.i > 0) { this.i--; this._render(); } }
  skip() { if (!this.el) return; if (this.part === "welcome") return this.skipAll(); this.mark(this.part); if (this.part === "main") this.mark("flight"); this.close(); }
  close() { if (!this.el) return; const el = this.el; this.el = null; el.classList.remove("in"); setTimeout(() => el.remove(), 200); }

  // ── 첫 비행: 비행훈련 첫 과목을 띄우고 코치를 켠다 ──
  firstFlight() {
    const u = this.ui;
    u.sel.mode = "training"; u.sel.course = null; u.sel.lesson = null; u._persist();
    u.show("setup");
    requestAnimationFrame(() => u.a_start());
  }
  // main.js 가 비행을 시작한 직후 부른다. 처음 한 번만, 할 일을 하나씩 띄우고 실제로 해내면 다음으로
  onFlight(session) {
    if (this.done("flight") || !session) return;
    this.stopFlight();
    const c = controlNames(), t = touch();
    const how = (ax, up) => (t ? `${c[ax].pad.replace("위아래", up ? "위로" : "아래로").replace("좌우", "좌우로")}` : `<kbd>${up ? c[ax].k1 : c[ax].k2}</kbd>`);
    const body = () => session.player && session.player.body;
    const alt = () => { const b = body(); return b ? b.pos.y - session.world.h(b.pos.x, b.pos.z) : 0; };
    const yaw0 = { v: null, sum: 0 };
    const heading = () => { const b = body(); if (!b) return 0; const q = b.quat; return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x)); };
    const steps = [
      { text: `<b>이륙</b> — ${how("throttle", true)} 스로틀을 올려 3m 위로 떠오르세요`, ok: () => alt() > 3 },
      { text: `<b>방향 바꾸기</b> — ${t ? c.yaw.pad.replace("좌우", "좌우로") : `<kbd>${c.yaw.k1}</kbd> <kbd>${c.yaw.k2}</kbd>`} 로 기수를 돌려 보세요`, ok: () => { const h = heading(); if (yaw0.v !== null) { let d = h - yaw0.v; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw0.sum += Math.abs(d); } yaw0.v = h; return yaw0.sum > 1.4; } },
      { text: `<b>앞으로</b> — ${how("pitch", true)} 로 기체를 앞으로 기울여 날아가세요`, ok: () => { const b = body(); return b && Math.hypot(b.vel.x, b.vel.z) > 6; } },
      { text: `<b>좋아요!</b> <kbd>C</kbd> 시점 전환 · <kbd>R</kbd> 뒤집히면 다시 세우기 · <kbd>Esc</kbd> 일시정지`, wait: 6 },
      ...(session.cfg && session.cfg.objectives ? [{ text: "<b>목표 확인</b> — 오른쪽 목록의 ★핵심 목표는 꼭, 나머지는 필요한 개수만 달성하면 됩니다", wait: 7 }] : []),
      ...(session.mode && session.mode.combat ? [{ text: "<b>전투</b> — <kbd>Space</kbd> 레이저 · <kbd>F</kbd> 미사일(조준선 근처 자동 락온) · <kbd>E</kbd> 아이템", wait: 7 }] : []),
    ];
    const el = (this.fl = document.createElement("div"));
    el.className = "tutfly holo";
    el.innerHTML = `<div class="tf-t"></div><div class="tf-p"></div><button data-t="off" class="ghost">안내 끄기</button>`;
    el.querySelector("button").addEventListener("click", () => { this.mark("flight"); this.stopFlight(); });
    document.body.appendChild(el);
    let i = -1, t0 = 0, hold = 0;
    const show = () => { el.querySelector(".tf-t").innerHTML = steps[i].text; el.querySelector(".tf-p").textContent = `첫 비행 안내 ${i + 1} / ${steps.length}`; el.classList.remove("ok"); };
    const go = () => { i++; t0 = performance.now(); hold = 0; if (i >= steps.length) { this.mark("flight"); return this.stopFlight(); } show(); };
    go();
    const tick = () => {
      if (!this.fl || this.fl !== el) return;
      const g = this.ui.game;
      if (g.session !== session) return this.stopFlight();   // 비행이 끝나면 다음 비행에서 이어서
      el.hidden = g.state !== "play";
      if (g.state === "play" && (!session.mode || session.mode.state === "run")) {   // 카운트다운·시범 중에는 기다린다
        const s = steps[i];
        const ok = s.wait ? performance.now() - t0 > s.wait * 1000 : s.ok();
        if (ok && !hold) { hold = performance.now(); el.classList.add("ok"); try { g.sound.play("gate", 0.5); } catch (_) { /* 소리 없음 */ } }
        if (hold && performance.now() - hold > 900) go();
      }
      this.flT = requestAnimationFrame(tick);
    };
    this.flT = requestAnimationFrame(tick);
  }
  stopFlight() { cancelAnimationFrame(this.flT); if (this.fl) { this.fl.remove(); this.fl = null; } }
}
