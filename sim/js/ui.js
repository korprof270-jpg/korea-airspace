// 메뉴 UI: 메인 · 모드 설정 · 정비소(외형) · 설정 · 조작법 · 일시정지 · 결과
import {
  settings, save, records, resetSettings, fmtTime, DRONE_CLASSES, RATE_PRESETS, FLIGHT_MODES, FLIGHT_MODE_INFO, STICK_MODES, DIFFICULTY,
  HUD_DENSITY, HUD_DENSITY_NAMES, HUD_ITEMS, HUD_PRESETS, applyHudPreset, QUALITY_NAMES,
} from "./config.js";
import { MAPS, MAP_LIST } from "./maps/index.js";
import { FRAMES, CANOPIES, SKINS, LED_MODES, COLOR_PRESETS } from "./dronemodel.js";
import { VARIANTS } from "./modes/survival.js";
import { MISSIONS } from "./modes/challenge.js";
import * as TR from "./training.js";
import { story, progress, unlocked, stageStars, goalText, stageConfig, usesTeam, KIND } from "./story.js";
import * as SY from "./story.js";
import { VN, BONDS, rel } from "./vn.js";
import * as GP from "./garage.js";
import * as BD from "./bonds.js";
import { Tutorial } from "./tutorial.js";
import { SCENES } from "./scenes.js";
import { portrait, hasArt } from "./portraits.js";
import { CAMERA_NAMES } from "./player.js";
import { glyphsFor } from "./gamepad.js";
import { PvpUI } from "./pvpui.js";

const MODE_META = {
  training: { name: "비행훈련", en: "TRAINING", icon: "🎓", c: "#ffd24a", desc: "ACRO 수동 비행을 이륙부터 곡예까지 단계별 과제로 배웁니다.",
    long: "스틱을 놓아도 수평으로 돌아오지 않는 ACRO(수동) 모드를 처음부터 배웁니다. 과목마다 주어진 과제를 순서대로 해내면 다음 과목이 열립니다.", tags: ["3개 과정 · 17개 과목", "과제별 요령 안내", "ACRO 전용"] },
  race: { name: "레이싱", en: "RACE", icon: "🏁", c: "#ff5a1f", desc: "게이트를 순서대로 통과하며 기록과 순위를 다툽니다.",
    long: "네온 게이트와 공중 링을 순서대로 통과하세요. 통과할 때마다 다음 게이트로 가는 길이 화면과 공중에 표시됩니다.", tags: ["코스 13개", "AI 라이벌 최대 5기", "랩·구간 기록"] },
  tracking: { name: "트래킹", en: "TRACK", icon: "🎥", c: "#21d4fd", desc: "달리는 차·보트·드론을 화면 가운데에 두고 끝까지 따라가며 촬영합니다.",
    long: "달리는 차, 강을 내려가는 보트, 곡예 드론을 화면 가운데에 담아 끝까지 따라가면 추적 점수가 오릅니다.", tags: ["피사체 17종", "프레이밍 점수", "시네 비행 연습"] },
  freestyle: { name: "프리스타일", en: "FREESTYLE", icon: "🌀", c: "#b44cff", desc: "플립·롤·다이브·틈새 통과를 이어 콤보 점수를 쌓습니다.",
    long: "파워 루프, 배럴 롤, 다이브, 다리 밑과 건물 틈 통과를 끊기지 않게 이어 콤보 배율을 올리세요.", tags: ["통과 지점 190곳+", "콤보 최대 ×5", "자유 비행"] },
  survival: { name: "서바이벌", en: "SURVIVAL", icon: "⚔️", c: "#ff3d5a", desc: "레이저·미사일·아이템으로 AI 드론과 싸우는 점수제 전투입니다.",
    long: "레이저와 유도 미사일, 실드·부스터·EMP 아이템으로 AI 드론과 점수를 겨룹니다. 격추되면 5초 뒤 다시 출격합니다.", tags: ["데스매치·4팀 점령전", "아이템 6종", "5초 재출격"] },
  challenge: { name: "스토리", en: "STORY", icon: "📖", c: "#3dd68c", desc: "챕터마다 이어지는 이야기를 따라 임무를 하나씩 깨 나갑니다.",
    long: "입단 시험부터 마지막 결전까지. 맵마다 이어지는 이야기를 따라 레이싱·추적·호위·방어·보스전을 한 단계씩 깨 나가세요.", tags: ["단계별 잠금 해제", "윙맨 편대", "별 3개 평가"] },
};
// 비행훈련장으로 쓸 수 있는 맵 (출발 지점 앞이 넓게 비어 있는 곳)
const TR_MAPS = ["factory", "arena", "moon", "snow", "palace", "airbase"].filter((id) => MAPS[id]);
// 타이틀 배경 장면 (sim/img/title): 파일 이름, 아래 작은 표시
const TITLE_SLIDES = [["1-race", "레이싱 · 석양의 항만"], ["2-combat", "서바이벌 · 네온 아레나"], ["3-freestyle", "프리스타일 · 붉은 협곡"], ["4-story", "스토리 · 달 기지 최종전"],
  ["5-tracking", "트래킹 · 화산섬"], ["6-palace", "레이싱 · 단풍 고궁"], ["7-training", "비행훈련 · 8자 비행"], ["8-snow", "프리스타일 · 설국 산장"],
  ["9-empire", "레이싱 · 기계제국 수도"], ["10-airbase", "레이싱 · 비행기지 격납고"], ["11-ail", "레이싱 · 에일 행성"],
  ["12-frost", "스토리 · 설원 통신기지"]];
// 메인 메뉴의 세 갈래와 하위 메뉴 카드 (이미지 = sim/img/title)
const HUB = {
  practice: { name: "연습 모드", en: "PRACTICE", c: "#ffd24a", img: "7-training", desc: "부담 없이 조작을 익히는 곳. 단계별 비행훈련과 시간 제한 없는 자유 비행.", items: ["training", "trick", "free"] },
  story: { name: "스토리 모드", en: "STORY", c: "#3dd68c", img: "4-story", desc: "휴마 연합의 신입 파일럿이 되어 버려진 기체 ‘노을’과 함께 에이아 제국에 맞섭니다. 갈림길마다 작전을 골라 다른 임무를 겪습니다." },
  game: { name: "게임 모드", en: "GAME", c: "#ff5a1f", img: "2-combat", desc: "레이싱·추적·묘기·공중전으로 기록과 점수를 겨룹니다.", items: ["race", "tracking", "freestyle", "survival"] },
  survival: { name: "서바이벌", en: "SURVIVAL", c: "#ff3d5a", img: "2-combat", items: ["pve", "pvp"], back: "game", hidden: true },
};
const SUB = {
  training: { img: "7-training" },
  trick: { name: "트릭 연습", en: "TRICKS", c: "#ff5ad6", img: "3-freestyle", desc: "롤·플립·스핀·루프를 시범으로 보고 스틱 타이밍대로 따라 해 봅니다." },
  free: { name: "자유 비행", en: "FREE FLIGHT", c: "#21d4fd", img: "8-snow", desc: "원하는 맵을 시간 제한 없이 마음껏 날아다니며 연습합니다." },
  race: { img: "1-race" }, tracking: { img: "5-tracking" }, freestyle: { img: "3-freestyle" }, survival: { img: "2-combat" },
  pve: { name: "PVE", en: "PVE · AI 대전", c: "#ff3d5a", img: "2-combat", desc: "AI 드론과 싸우는 서바이벌. 데스매치·4팀 점령전, 격납고 파츠 능력치가 그대로 적용됩니다." },
  pvp: { name: "PVP", en: "PVP · 대인전", c: "#21d4fd", img: "9-empire", desc: "다른 플레이어와 실시간 대전. 배틀넷 랜덤 매칭 또는 커스텀 방. 파츠 능력치 미적용 · 스킬 피해 60%." },
};
const TRAILS = [["off", "끄기"], ["#ffffff", "흰색"], ["#ff5a1f", "주황"], ["#21d4fd", "하늘"], ["#ff2bd6", "분홍"], ["#3dff7c", "초록"]];

const kb = (g) => `<kbd class="pad">${String(g).replace(/[&<>"]/g, "")}</kbd>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const starStr = (n, max = 3) => "★".repeat(n) + `<i>${"★".repeat(max - n)}</i>`;
const getPath = (o, p) => p.split(".").reduce((a, k) => a[k], o);
function setPath(o, p, v) { const ks = p.split("."); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }

// 메뉴 버튼 소리: 뒤로 가기·닫기 / 출격·확정 / 그 밖은 딸깍
const UI_SND = { back: "back", ovclose: "back", quit: "back", start: "confirm", enter: "confirm", diffpick: "confirm", resume: "confirm", restart: "confirm",
  replay: "confirm", nextstage: "confirm", nextlesson: "confirm", storypost: "confirm", scene: "confirm", tostory: "confirm", totraining: "confirm" };

export class UI {
  constructor(game) {
    this.game = game;
    this.vn = new VN(game);
    this.tut = new Tutorial(this);   // 처음 하는 사람용 안내
    this.root = document.getElementById("ui");
    this.screen = null;
    this.tab = "control";
    const d = { mode: "race", map: MAP_LIST[0].id, track: null, laps: 3, rivals: 3, subject: null, fs: "timed", variant: "dm", bots: 5, time: 180, mission: MISSIONS[0].id, team: 0 };
    this.sel = Object.assign(d, settings.last || {});
    if (!MAPS[this.sel.map]) this.sel.map = MAP_LIST[0].id;

    this.root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-a]");
      if (!el || !this.root.contains(el)) return;
      const fn = this[`a_${el.dataset.a}`];
      if (fn) { this.game.sound.play(UI_SND[el.dataset.a] || "click"); fn.call(this, el.dataset.v, el); }
    });
    // 격납고 파츠: 카드에 올리거나 초점을 주면 기체·성능 막대로 미리 본다
    const pvOf = (e) => { const el = e.target.closest && e.target.closest("[data-pv]"); return el ? el.dataset.pv : null; };
    this.root.addEventListener("pointerover", (e) => { if (e.pointerType !== "touch") { const id = pvOf(e); if (id && id !== this._hov) this._ptHover((this._hov = id)); } });
    this.root.addEventListener("pointerout", (e) => { if (this._hov && pvOf(e) === this._hov && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(`[data-pv="${this._hov}"]`))) { this._hov = null; this._ptHover(null); } });
    this.root.addEventListener("focusin", (e) => { if (this.screen === "hangar" && this._gtab === "parts") this._ptHover(pvOf(e)); });
    this.root.addEventListener("input", (e) => this._input(e.target));
    this.root.addEventListener("change", (e) => this._input(e.target, true));
    addEventListener("keydown", (e) => {
      // 비행 중 H: HUD 표시 수준 전환(전체 → 최소 → 끄기). 실제 전환은 HUD 가 입력 큐에서 꺼내 처리
      if (e.code === "KeyH" && !e.repeat && this.game.state === "play" && !(e.target instanceof HTMLInputElement)) { this.game.input.queue.push("hud"); return; }
      // 타이틀: 아무 키나 누르면 메뉴로
      if (this.screen === "title" && !["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(e.code)) { e.preventDefault(); this.a_enter(); return; }
      if (e.code === "Escape" && this.root.querySelector("[data-ovl]")) { this.a_ovclose(); return; }
      if ((this.screen === "main" || this.screen === "group") && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        const cards = [...this.root.querySelectorAll(".hcard")], i = cards.indexOf(document.activeElement), d = e.code === "ArrowUp" || e.code === "ArrowLeft" ? -1 : 1;
        if (cards.length) cards[i < 0 ? 0 : (i + d + cards.length) % cards.length].focus();
        e.preventDefault(); return;
      }
      // PVP 메뉴: 방향키·Enter 로 패드처럼 이동 (입력 칸에서는 그대로)
      if (this.screen === "pvp" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        const d = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.code];
        if (d) { e.preventDefault(); this.game.padui._nav(d); return; }
        if ((e.code === "Enter" || e.code === "NumpadEnter") && this.game.padui.cur) { e.preventDefault(); this.game.padui._nav("ok"); return; }
      }
      if (e.code !== "Escape" || !this.screen) return;
      if (this.screen === "pvp" && !(e.target instanceof HTMLInputElement)) { this.a_back(); return; }
      if (["setup", "hangar", "settings", "help", "group"].includes(this.screen)) this.a_back();
    });
    // 정비소: 드래그로 회전
    let dragging = false, lx = 0;
    this.root.addEventListener("pointerdown", (e) => { if (e.target.closest(".view, [data-stage]") && !e.target.closest("button")) { dragging = true; lx = e.clientX; } });
    addEventListener("pointermove", (e) => { if (dragging) { this.game.menu.angle -= (e.clientX - lx) * 0.008; this.game.menu.drag = 0; lx = e.clientX; } });
    addEventListener("pointerup", () => (dragging = false));
    // 썸네일이 준비되면 화면의 자리표시를 그림으로 바꾼다
    game.thumbs.onReady((kind, id, url) => this.root.querySelectorAll(`[data-thumb="${kind}:${id}"]`).forEach((el) => { el.innerHTML = `<img src="${url}" alt="">`; }));
    addEventListener("resize", () => requestAnimationFrame(() => { if (this.screen) this._syncStage(); }));
  }

  show(name, data) {
    this.screen = name;
    this.data = data;
    this.game.menu.close = name === "hangar";
    this.root.innerHTML = this[`s_${name}`](data);
    const sc = this.root.querySelector("[data-scroll]") || this.root.querySelector(".screen");
    if (sc && this._scroll && this._scroll.name === name) sc.scrollTop = this._scroll.y;
    this._scroll = null;
    this._syncStage();
    if (name === "title") this._titleShow(); else clearInterval(this._slideT);
    if (name === "setup") this.game.thumbs.want("map", MAP_LIST.map((mp) => mp.id));
    if (this.tut) this.tut.onShow(name);
  }

  // 3D 무대: 화면별 장면을 고르고, [data-stage] 영역 가운데에 오도록 맞춘다
  _syncStage() {
    const menu = this.game.menu;
    menu.setMode(this.screen === "main" || this.screen === "setup" ? this.sel.mode : null);
    if (this._ptKey && (this.screen !== "hangar" || this._gtab !== "parts")) this._ptClear();   // 파츠 미리보기는 파츠 탭에서만
    menu.low = this.screen === "hangar" && this._gtab === "parts";
    if (menu.previewSkill) menu.previewSkill(this.screen === "hangar" && this._gtab === "skill" ? this._skPv || GP.skillEquipped() : null);
    const st = this.root.querySelector("[data-stage]");
    if (!st || !st.offsetWidth) { menu.focus = null; return; }
    let x = 0, y = 0, e = st;
    while (e && e !== this.root) { x += e.offsetLeft - (e.scrollLeft || 0); y += e.offsetTop; e = e.offsetParent; }
    const w = st.offsetWidth, h = st.offsetHeight;
    menu.focus = { x: x + w / 2 - innerWidth / 2, y: y + h / 2 - innerHeight / 2, w, h };
  }
  // 같은 화면을 스크롤 위치를 유지하며 다시 그림
  redraw() {
    const sc = this.root.querySelector("[data-scroll]") || this.root.querySelector(".screen");
    this._scroll = { name: this.screen, y: sc ? sc.scrollTop : 0 };
    const side = this.root.querySelector(".side");
    const sy = side ? side.scrollTop : 0;
    this.show(this.screen, this.data);
    const side2 = this.root.querySelector(".side");
    if (side2) side2.scrollTop = sy;
  }
  hide() { this.screen = null; this.root.innerHTML = ""; }

  update() {
    // 설정 > 입력장치: 게임패드 축 실시간 표시
    if (this.screen !== "settings" || this.tab !== "input") return;
    const inp = this.game.input, box = this.root.querySelector("#padlive");
    if (!box) return;
    const name = inp.padName || "";
    if (box.dataset.name !== name || box.dataset.n !== String(inp.padAxes.length)) {
      box.dataset.name = name; box.dataset.n = String(inp.padAxes.length);
      box.innerHTML = name
        ? `<div style="font-size:13px;font-weight:700">🎮 ${esc(inp.padInfo ? inp.padInfo.name : "게임패드")} 연결됨</div><div class="muted" style="font-size:12px">${esc(name)}</div><div class="axes">${inp.padAxes.map((_, i) => `<div class="axis">축 ${i}<div class="b"><i data-ax="${i}"></i></div></div>`).join("")}</div>`
        : `<div class="muted">연결된 게임패드/조종기가 없습니다. USB·블루투스로 연결한 뒤 아무 버튼이나 눌러 보세요.</div>`;
    }
    box.querySelectorAll("[data-ax]").forEach((el) => { el.style.left = `${(inp.padAxes[+el.dataset.ax] * 0.5 + 0.5) * 100}%`; });
  }

  // ── 공통 조각 ──
  seg(key, opts, cur, act = "sel") {
    return `<div class="seg">${opts.map(([v, l]) => `<button data-a="${act}" data-k="${key}" data-v="${esc(v)}" class="${String(cur) === String(v) ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`;
  }
  range(path, label, min, max, step, unit = "", hint = "") {
    const v = getPath(settings, path);
    return `<div class="opt"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-set="${path}" data-unit="${unit}"><output>${v}${unit}</output>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
  }
  toggle(path, label, hint = "") {
    return `<div class="opt"><label>${label}</label>${this.seg(path, [[true, "켜기"], [false, "끄기"]], getPath(settings, path), "set")}${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
  }
  // 0~1 값을 % 로 보여 주는 슬라이더
  pct(path, label, min, max, step, hint = "") {
    const v = getPath(settings, path);
    return `<div class="opt"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-set="${path}" data-pct="1"><output>${Math.round(v * 100)}%</output>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
  }
  // 켜고 끄는 스위치 카드 (누르면 반전)
  sw(path, label, hint = "") {
    const on = !!getPath(settings, path);
    return `<button class="sw ${on ? "on" : ""}" data-a="flip" data-k="${path}" aria-pressed="${on}"><span class="knob"></span><span class="tx"><b>${label}</b>${hint ? `<i>${hint}</i>` : ""}</span></button>`;
  }

  // ── 메인 ──
  // 카드·목록에 쓰는 3D 썸네일 (준비 전에는 자리표시)
  _thumb(kind, id) {
    const url = this.game.thumbs[kind][id];
    return `<span class="thumb" data-thumb="${kind}:${id}">${url ? `<img src="${url}" alt="">` : `<i class="ph"></i>`}</span>`;
  }

  _cap(id) {
    const m = MODE_META[id];
    return `<h1>${m.name}</h1><p>${m.desc}</p>
      <button class="primary go" data-a="mode" data-v="${id}"${id === "training" ? ' style="color:var(--ink);text-shadow:none"' : ""}>모드 설정 <span aria-hidden="true">→</span></button>`;
  }

  // ── 타이틀 화면: 3D 장면을 배경으로 로고만. 누르면 메뉴로 ──
  s_title() {
    // 첫 장면만 바로 받고, 나머지는 차례가 오기 직전에 받는다 (겹쳐 놓은 그림은 loading="lazy" 로는 미뤄지지 않는다)
    const slides = TITLE_SLIDES.map(([f, cap], i) => `<figure class="slide ${i ? "" : "on"}"><img ${i ? `data-src="img/title/${f}.jpg"` : `src="img/title/${f}.jpg" fetchpriority="high"`} alt="" decoding="async"><figcaption>${cap}</figcaption></figure>`).join("");
    return `<div class="screen titlescreen" data-a="enter">
      <div class="slides">${slides}</div>
      <div class="tcast" aria-hidden="true"><img src="img/title/keyart.webp" srcset="img/title/keyart-1280.webp 1280w, img/title/keyart.webp 2400w" sizes="(max-aspect-ratio: 1/1) 114vh, 137vh" alt="" decoding="async" fetchpriority="high"></div>
      <div class="tbox"><div class="tlogo"><b>FPV</b> PROJECT</div></div>
      <div class="press">START</div>
    </div>`;
  }
  // 타이틀 슬라이드: 장면마다 천천히 밀고 당기며(켄 번스) 겹쳐 바뀐다
  _titleShow() {
    clearInterval(this._slideT);
    let i = 0;
    const load = (k) => { const img = this.root.querySelectorAll(".titlescreen .slide img")[k]; if (img && img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; } };
    setTimeout(() => load(1), 2500);                       // 다음 장면은 첫 장면이 뜬 뒤 미리
    this._slideT = setInterval(() => {
      const els = this.root.querySelectorAll(".titlescreen .slide");
      if (!els.length) { clearInterval(this._slideT); return; }
      const n = (i + 1) % els.length, img = els[n].querySelector("img");
      load(n);
      if (!img.complete) return;                           // 아직 못 받았으면 다음 차례에 (빈 장면으로 넘어가지 않게)
      els[i].classList.remove("on"); i = n;
      els[i].classList.add("on");
      load((i + 1) % els.length);
    }, 4800);
  }
  a_enter() { if (this.screen === "title") this.show("main"); }

  // ── 난이도 선택 오버레이 (설정 화면 위에 겹쳐 뜬다) ──
  _openDiff(andStart) {
    this._ovStart = !!andStart;
    const cur = settings.difficulty, info = {
      easy: { icon: "🟢", lines: ["적 계급: 병 위주 (이병~병장)", "느리고 조준이 서툽니다", "받는 피해 60%"] },
      normal: { icon: "🟡", lines: ["적 계급: 부사관 위주 (하사~원사)", "균형 잡힌 기본 난이도", "받는 피해 100%"] },
      hard: { icon: "🔴", lines: ["적 계급: 장교 위주 (소위~대위 이상)", "빠르고 정확합니다", "받는 피해 130%"] },
    };
    const cards = Object.entries(DIFFICULTY).map(([k, v]) => `<button class="dcard ${k === cur ? "sel" : ""} d-${k}" data-a="diffpick" data-v="${k}">
        <span class="di">${info[k].icon}</span><b>${v.name}</b><ul>${info[k].lines.map((l) => `<li>${l}</li>`).join("")}</ul>
        <span class="dgo">${this._ovStart ? "이 난이도로 출격 →" : k === cur ? "선택됨" : "선택"}</span></button>`).join("");
    this.root.querySelector("[data-ovl]")?.remove();
    this.root.insertAdjacentHTML("beforeend", `<div class="ovl" data-ovl><div class="ovbox">
      <div class="ovh"><span class="en">DIFFICULTY</span><h2>난이도 선택</h2></div>
      <div class="dgrid">${cards}</div>
      <p class="ranklegend">적은 계급이 높을수록 강하고, 기체의 포인트 색으로 구분됩니다 — <i style="--k:#ffd21f">병</i><i style="--k:#35d06a">부사관</i><i style="--k:#5aa9ff">장교</i><i style="--k:#ff4a5a">영관·장성</i> 큰 적(전차·전투함·거대로봇)일수록 높은 계급이 탑니다.</p>
      <div class="ovact"><button class="ghost" data-a="ovclose">${this._ovStart ? "취소" : "닫기"}</button></div></div></div>`);
    requestAnimationFrame(() => this.root.querySelector("[data-ovl]")?.classList.add("in"));
  }
  a_diffopen() { this._openDiff(false); }
  a_ovclose() { this.root.querySelector("[data-ovl]")?.remove(); this._ovStart = false; }
  a_diffpick(v) {
    if (!DIFFICULTY[v]) return;
    settings.difficulty = v; save();
    const go = this._ovStart;
    this.a_ovclose();
    if (go) { this._diffOk = true; this.a_start(); } else this.redraw();
  }

  // ── 메인: 연습 · 스토리 · 게임 세 갈래 ──
  _hcard(act, id, o, i) {
    return `<button class="hcard" style="--c:${o.c};--img:url(img/title/${o.img}.jpg);--d:${i * 70}ms" data-a="${act}" data-v="${id}">
      <span class="hbg" aria-hidden="true"></span><span class="hshade" aria-hidden="true"></span>
      <span class="hno" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      ${o.badge ? `<span class="hbadge">${o.badge}</span>` : ""}
      <span class="htx"><small>${o.en}</small><b>${o.name}</b><em>${o.desc}</em>${o.list ? `<span class="hlist">${o.list.map((x) => `<i>${x}</i>`).join("")}</span>` : ""}</span>
      <span class="hgo" aria-hidden="true">→</span>
    </button>`;
  }
  s_main() {
    const sp = progress(), tp = TR.progress();
    const hubs = Object.entries(HUB).filter(([, h]) => !h.hidden).map(([id, h], i) => this._hcard("hub", id, Object.assign({}, h,
      id === "story" ? { badge: `${sp} / ${story().flat.length} 단계` } : id === "practice" ? { badge: `훈련 ${tp} / ${TR.LESSONS.length}`, list: h.items.map((k) => SUB[k].name || MODE_META[k].name) } : { list: h.items.map((k) => MODE_META[k].name) }), i)).join("");
    return `<div class="screen hub">
      <header class="hhead"><div class="logo"><b>FPV</b> PROJECT</div>
        <span class="hicons"><button class="hpts" data-a="gq" title="포인트 · 퀘스트">◆ ${GP.points().toLocaleString()}P${(() => { const q = GP.quests(); const n = [...q.daily, ...q.weekly].filter((x) => !x.done).length; return n ? `<i>${n}</i>` : ""; })()}</button><button class="hic" data-a="go" data-v="hangar" title="격납고 (커스텀·업그레이드)" aria-label="격납고">🛠</button><button class="hic" data-a="go" data-v="settings" title="설정" aria-label="설정">⚙</button><button class="hic" data-a="go" data-v="help" title="조작법" aria-label="조작법">🎮</button></span></header>
      <nav class="hcards wide" aria-label="메뉴">${hubs}</nav>
    </div>`;
  }
  a_hub(v) {
    if (v === "story") { this._group = null; this.sel.mode = "challenge"; this._persist(); return this.show("setup"); }
    if (HUB[v]) { this._group = v; this.show("group"); }
  }
  // ── 하위 메뉴: 연습(비행훈련·자유 비행) / 게임(레이싱·트래킹·프리스타일·서바이벌) ──
  s_group() {
    const g = HUB[this._group] || HUB.game;
    const cards = g.items.map((k, i) => { const m = MODE_META[k] || {}; return this._hcard("sub", k, Object.assign({ name: m.name, en: m.en, c: m.c, desc: m.desc }, SUB[k]), i); }).join("");
    return `<div class="screen hub group" style="--c:${g.c}">
      <header class="hhead"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${g.en}</span>${g.name}</h2></header>
      <nav class="hcards wide n${g.items.length}" aria-label="${g.name}">${cards}</nav>
    </div>`;
  }
  a_sub(v) {
    if (v === "survival") { this._group = "survival"; return this.show("group"); }   // 서바이벌: PVE / PVP 갈림
    if (v === "pvp") return this._pvOpen("hub");
    if (v === "pve") v = "survival";
    if (v === "free") { this.sel.mode = "freestyle"; this.sel.fs = "free"; }
    else if (v === "trick" || v === "training") { this.sel.mode = "training"; this.sel.course = v === "trick" ? "trick" : null; this.sel.lesson = null; }
    else { this.sel.mode = v; if (v === "freestyle" && this._group === "game") this.sel.fs = "timed"; }
    this._persist(); this.show("setup");
  }

  // 목록에서 모드 고르기: 처음 누르면 미리보기, 같은 모드를 다시 누르면 설정으로
  a_pick(v) {
    if (!MODE_META[v]) return;
    if (this.sel.mode === v && this._picked) return this.a_mode(v);
    this._picked = true;
    this.sel.mode = v; this._persist();
    const scr = this.root.querySelector(".screen.home");
    if (!scr) return this.show("main");
    scr.style.setProperty("--c", MODE_META[v].c);
    scr.querySelectorAll(".mitem").forEach((el) => { const on = el.dataset.v === v; el.classList.toggle("on", on); el.setAttribute("aria-pressed", on); });
    const cap = scr.querySelector(".cap"); cap.innerHTML = this._cap(v); cap.classList.remove("in"); void cap.offsetWidth; cap.classList.add("in");
    this.game.menu.setMode(v);
  }
  a_mode(v) { this.sel.mode = v; this._picked = false; this._persist(); this.show("setup"); }
  a_go(v) { this.show(v); }
  a_back() {
    if (this.game.state === "pause") return this.show("pause");
    if (this.screen === "setup" && this._group) return this.show("group");   // 하위 메뉴에서 들어왔으면 그리로
    if (this.screen === "pvp") return this._pvBack();
    if (this.screen === "group" && HUB[this._group] && HUB[this._group].back) { this._group = HUB[this._group].back; return this.show("group"); }
    this._group = this.screen === "group" ? null : this._group;
    this.show("main");
  }

  _persist() { settings.last = this.sel; save(); }

  // ── 모드 설정 ──
  // 코스·이동 경로 미니맵 (위에서 본 모습)
  _route(pts, loop) {
    if (!pts || pts.length < 2) return "";
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const k = Math.min(84 / Math.max(x1 - x0, 1), 34 / Math.max(z1 - z0, 1)), ox = 50 - ((x0 + x1) / 2) * k, oz = 23 - ((z0 + z1) / 2) * k;
    const P = pts.map(([x, z]) => [(x * k + ox).toFixed(1), (z * k + oz).toFixed(1)]);
    const d = "M" + P.map((q) => q.join(" ")).join(" L") + (loop ? " Z" : "");
    return `<svg class="route" viewBox="0 0 100 46" aria-hidden="true"><path d="${d}"/>${P.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="${i ? 2.1 : 3.2}" class="${i ? "" : "st"}"/>`).join("")}</svg>`;
  }

  // 단계 묶음: 번호 · 제목 · 현재 선택
  _step(n, title, pick, html) {
    return `<section class="step" data-step="${n}"><div class="sh"><span class="no">${n}</span><h3>${title}</h3>${pick ? `<span class="pick">${esc(pick)}</span>` : ""}</div>${html}</section>`;
  }

  // 스토리: ① 장 ② (작전 선택) 단계 ③ 브리핑(대사)·편대
  s_story() {
    if (this.sel.stab === "bond") return this.s_storyBond();
    if (this.sel.stab === "end") return this.s_storyEnd();
    const s = this.sel, m = MODE_META.challenge, { chapters, flat } = story(), prog = progress(), cur = SY.current();
    let ch = chapters.find((c) => c.id === s.chapter);
    if (!ch) ch = cur ? cur.chapter : chapters[chapters.length - 1];
    s.chapter = ch.id;
    let rt = ch.routes ? ch.routes.find((r) => r.id === s.route) || ch.routes.find((r) => r.id === SY.routeOf(ch)) || (cur && cur.chapter === ch && cur.route) || ch.routes[0] : null;
    s.route = rt ? rt.id : null;
    const list = rt ? rt.stages : ch.stages;
    let st = list.find((x) => x.id === s.stage);
    if (!st) st = list.find((x) => unlocked(x) && !SY.cleared(x)) || [...list].reverse().find((x) => unlocked(x)) || list[0];
    s.stage = st.id;
    const card1 = (c) => {
      const all = c.routes ? c.routes.flatMap((r) => r.stages) : c.stages, done = all.filter(SY.cleared).length, open = SY.chapterOpen(c);
      return `<button class="card mapcard ${c.id === ch.id ? "sel" : ""} ${open ? "" : "locked"}" data-a="sel" data-k="chapter" data-v="${c.id}">
        ${this._thumb("map", c.map)}<div class="tag">${open ? (SY.chapterDone(c) ? "✔" : `${done}/${all.length}`) : "🔒"}</div>${c.routes ? `<div class="tag rt">⑂ 갈림길</div>` : ""}
        <div class="nm"><small>${c.hidden === 2 ? "HIDDEN 2" : c.hidden ? "HIDDEN" : "CHAPTER"} ${c.no} · ${c.en}</small>${c.title}</div><div class="ds">${MAPS[c.map].name}</div></button>`;
    };
    const HID = { 1: ["HIDDEN STORY · 에이아 연대기", "기계제국은 왜 태어났는가. 15년 전, 모든 것이 시작된 곳으로.", "휴마 연합의 이야기를 끝까지 마치면 열립니다."],
      2: ["HIDDEN STORY 2 · 별의 저편", "에일 행성의 함대가 온다. 에이아가 끝내 막으려 했던 전쟁.", "「에이아 연대기」를 끝까지 마치면 열립니다."] };
    const chCards = chapters.filter((c) => !c.hidden).map(card1).join("") + [1, 2].map((h) => {
      const cs = chapters.filter((c) => c.hidden === h);
      if (!cs.length) return "";
      const op = cs.some((c) => SY.chapterOpen(c));
      return `<div class="hidhead h${h} ${op ? "open" : ""}"><b>${op ? HID[h][0] : `HIDDEN STORY${h > 1 ? " " + h : ""} · ???`}</b><span>${op ? HID[h][1] : HID[h][2]}</span></div>` + (op ? cs.map(card1).join("") : "");
    }).join("");
    const rtCards = ch.routes ? `<div class="routes">${ch.routes.map((r) => {
      const done = r.stages.filter(SY.cleared).length, chosen = SY.routeOf(ch) === r.id;
      return `<button class="card route ${r === rt ? "sel" : ""} ${SY.chapterOpen(ch) ? "" : "locked"}" data-a="sel" data-k="route" data-v="${r.id}">
        <div class="rk">작전안 ${r.id.toUpperCase()}${chosen ? ` <i>처음 고른 길</i>` : ""}</div><div class="nm">${r.name}</div><div class="ds">${esc(r.desc)}</div>
        <div class="who">동행 · ${esc(r.who)} <span>${done}/${r.stages.length}</span></div></button>`;
    }).join("")}</div>` : "";
    const stCards = list.map((x) => {
      const open = unlocked(x), cl = SY.cleared(x);
      return `<button class="card stage ${x.id === st.id ? "sel" : ""} ${open ? "" : "locked"} ${cl ? "cleared" : ""}" data-a="sel" data-k="stage" data-v="${x.id}">
        <span class="sno">${open ? x.no : "🔒"}</span><span class="stx"><b>${x.title}${x.boss ? (SY.isBoss(x) ? ` <i class="bosstag">BOSS</i>` : ` <i class="bosstag mid">중간 보스</i>`) : ""}</b><small>${KIND[x.kind]} · 목표 ${SY.objectivesOf(x).list.length}개 중 ${SY.objectivesOf(x).need}개${SY.missionMod(x) ? " · ⚑ 작전 변경" : ""}</small></span>
        <span class="stars">${cl ? starStr(stageStars(x)) : open ? "도전" : ""}</span></button>`;
    }).join("");
    const open = unlocked(st);
    if (!usesTeam(st)) s.team = s.team || 0;
    const talk = st.talk.map((l) => { const [who, line] = l.includes("|") ? l.split("|") : ["", l]; return `<div class="ln"><b style="color:${SY.CAST[who] || "#dfe7f1"}">${esc(who)}</b><span>${esc(line)}</span></div>`; }).join("");
    let brief = `<div class="brief"><div class="bk">${KIND[st.kind]} · CHAPTER ${ch.no}${rt ? rt.id.toUpperCase() : ""}-${st.no}</div><div class="talk">${talk}</div>${(() => { const md = SY.missionMod(st), OB = SY.objectivesOf(st);
      return `${md && md.note ? `<div class="mnote">⚑ 작전 변경 · ${esc(md.note)}</div>` : ""}<div class="objs"><b>목표 — ${OB.list.length}개 중 ${OB.need}개 이상 달성</b><ul>${OB.list.map((o) => `<li class="${o.req ? "req" : ""}">${o.req ? "★ " : ""}${esc(o.text)}${o.req ? " <i>핵심</i>" : ""}</li>`).join("")}</ul></div>`; })()}${SY.preScene(st) && open ? `<button class="ghost scenebtn" data-a="scene">▶ ${SY.sceneSeen(st) ? "장면 다시 보기" : "출격 전 장면 미리 보기"}</button>` : ""}</div>`;
    if (!open) brief += `<p class="hint2">${SY.chapterOpen(ch) ? "앞 단계를 먼저 깨야 열립니다." : "앞 장을 먼저 끝내야 열립니다."}</p>`;
    if (usesTeam(st)) brief += `<div class="opt"><label>편대</label>${this.seg("team", [[0, "혼자"], [1, "2기 편대"], [3, "4기 편대"]], s.team ?? st.o.team ?? 0)}<div class="hint">윙맨이 늘면 적도 늘어납니다. 권장: ${[0, 1, 3].includes(st.o.team) ? ["혼자", "2기 편대", "", "4기 편대"][st.o.team] : "혼자"}</div></div>`;
    brief += `<div class="opt"><label>비행 모드</label>${this.seg("flightMode", FLIGHT_MODES.map((k) => [k, FLIGHT_MODE_INFO[k].label]), settings.flightMode, "set")}</div>`;
    brief += `<div class="opt"><label>시점</label>${this.seg("camera", Object.entries(CAMERA_NAMES), settings.camera, "set")}</div>`;
    const body = `<p class="hint2 intro">${esc(SY.chapterIntro(ch))}</p>`
      + this._step(1, "장 선택", `${ch.no}. ${ch.title}`, `<div class="grid maps">${chCards}</div>`)
      + this._step(2, ch.routes ? "작전 선택 · 단계" : "단계 선택", `${rt ? rt.name + " · " : ""}${st.no}. ${st.title}`, rtCards + `<div class="stages">${stCards}</div>`)
      + this._step(3, "브리핑", "", brief)
      + this._step(4, "동료와의 관계", "", this._bonds() + `<button class="ghost scenebtn" data-a="stab" data-v="bond">♥ 인연 이야기 보러 가기 →</button>`);
    return `<div class="screen split story${ch.hidden ? " hid" : ""}" style="--c:${ch.hidden === 2 ? "#c060ff" : ch.hidden ? "#ff4a5a" : m.c}">
      <div class="pane" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${ch.hidden ? "HIDDEN" : m.en}</span>${ch.hidden === 2 ? "별의 저편" : ch.hidden ? "에이아 연대기" : "노을의 날개"}</h2><span class="prog">${prog}/${flat.length} 단계</span></div>
        ${this._stabs()}${body}
        <div class="startbar"><span class="sum">${esc(MAPS[ch.map].name)} · ${ch.no}${rt ? rt.id.toUpperCase() : ""}-${st.no} ${esc(st.title)}</span>
          <button class="primary" data-a="start" ${open ? "" : "disabled"}>${open ? "출격" : "잠김"} <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="rcol"><div class="stage" data-stage></div></div>
    </div>`;
  }

  _met(n) {
    const met = { 서하린: SY.cleared({ id: "c2-4" }) || progress() >= 7, 바우: progress() >= 8, 유리: progress() >= 8, 차도윤: true, 모아: progress() >= 4, 노을: progress() >= 7, 윤채아: progress() >= 7, 진세라: progress() >= 9, 한별: progress() >= 9, 루카: progress() >= 12 };
    return met[n] || rel(n) > 0;
  }
  _face(n, known, v) {
    return portrait(n) ? `<i class="face${hasArt(n) ? " art" : ""}" style="background-image:url('${portrait(n, v >= 4 ? "smile" : "normal")}')"></i>` : `<i class="face ini">${known ? n.replace(/^강 /, "").slice(0, 1) : "?"}</i>`;
  }
  _bonds() {
    return `<div class="bonds">${BONDS.map((n) => {
      const v = Math.max(0, rel(n)), lv = Math.min(5, Math.floor(v / 2)), known = this._met(n);
      return `<div class="bond ${known ? "" : "unk"}" style="--nc:${SY.CAST[n]}">${portrait(n) ? `<i class="face${hasArt(n) ? " art" : ""}" style="background-image:url('${portrait(n, v >= 4 ? "smile" : "normal")}')"></i>` : `<i class="face ini">${known ? n.replace(/^강 /, "").slice(0, 1) : "?"}</i>`}<div><b>${known ? n : "???"}</b><small>${known ? esc(SY.CAST_ROLE[n] || "") : "아직 만나지 않았다"}</small><span class="hearts">${"♥".repeat(lv)}${"♡".repeat(5 - lv)}</span></div></div>`;
    }).join("")}</div><p class="hint2">장면 속 선택에 따라 관계가 깊어집니다. 관계가 깊은 동료가 윙맨으로 함께 날고, 마지막 장면과 엔딩이 달라집니다.</p>`;
  }

  // 스토리 화면 위쪽 탭: 본편 · 인연 · 엔딩
  _stabs() {
    const t = this.sel.stab || "main", n = BD.newCount();
    const tabs = [["main", "본편 이야기"], ["bond", `♥ 인연${n ? ` <i class="nb">${n}</i>` : ""}`], ["end", `엔딩 ${BD.endingsGot().length}/${BD.ENDINGS.length}`]];
    return `<div class="seg stabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? "on" : ""}" data-a="stab" data-v="${k}">${l}</button>`).join("")}</div>`;
  }
  a_stab(v) { this.sel.stab = v; this._persist(); this._scroll = null; this.show("setup"); }
  _storyShell(en, title, body, bar) {
    return `<div class="screen split story" style="--c:${MODE_META.challenge.c}">
      <div class="pane" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${en}</span>${title}</h2><span class="prog">${progress()}/${story().flat.length} 단계</span></div>
        ${this._stabs()}${body}
        ${bar}
      </div>
      <div class="rcol"><div class="stage" data-stage></div></div>
    </div>`;
  }

  // ── 인연: 인물 목록 → 편 목록 → 편 정보 ──
  s_storyBond() {
    const s = this.sel, eps = BD.episodes();
    let who = BONDS.includes(s.bwho) ? s.bwho : null;
    if (!who) { const e = eps.find((x) => BD.epOpen(x) && !BD.epDone(x)); who = e ? e.who : "노을"; }
    s.bwho = who;
    const list = BD.epsOf(who);
    let ep = list.find((x) => x.id === s.bep);
    if (!ep) ep = list.find((x) => BD.epOpen(x) && !BD.epDone(x)) || [...list].reverse().find((x) => BD.epDone(x)) || list[0];
    s.bep = ep.id;
    const cards = BONDS.map((n) => {
      const v = rel(n), known = this._met(n), l = BD.epsOf(n), done = l.filter(BD.epDone).length, nw = l.some((x) => BD.epOpen(x) && !BD.epDone(x)), lv = Math.min(5, Math.floor(Math.max(0, v) / 2));
      return `<button class="bond bcard ${n === who ? "sel" : ""} ${known ? "" : "unk"}" style="--nc:${SY.CAST[n]}" data-a="sel" data-k="bwho" data-v="${n}">
        ${this._face(n, known, v)}<div><b>${known ? n : "???"}${nw ? ` <i class="new">NEW</i>` : ""}</b><small>관계 ${v} · 이야기 ${done}/${l.length}</small><span class="hearts">${"♥".repeat(lv)}${"♡".repeat(5 - lv)}</span></div></button>`;
    }).join("");
    const known = this._met(who);
    const rows = list.map((x) => {
      const open = BD.epOpen(x), done = BD.epDone(x);
      return `<button class="card stage ${x.id === ep.id ? "sel" : ""} ${open || done ? "" : "locked"} ${done ? "cleared" : ""}" data-a="sel" data-k="bep" data-v="${x.id}">
        <span class="sno">${open || done ? x.no : "🔒"}</span><span class="stx"><b>${open || done ? esc(x.title) : "잠긴 이야기"}${x.mission ? ` <i class="bosstag mid">임무</i>` : ""}</b><small>${open || done ? esc(x.desc) : esc(BD.hintOf(x).filter((h) => !h[0]).map((h) => h[1]).join(" · "))}</small></span>
        <span class="stars">${done ? (x.stage ? starStr(BD.epStars(x)) : "✔") : open ? "새 이야기" : ""}</span></button>`;
    }).join("");
    const open = BD.epOpen(ep), done = BD.epDone(ep), seen = BD.epSeen(ep), avail = open || done;
    let info = `<div class="brief"><div class="bk">인연 · ${esc(known ? who : "???")} ${ep.no}편${ep.stage ? ` · ${KIND[ep.stage.kind]} · ${esc(MAPS[ep.stage.chapter.map].name)}` : " · 이야기"}</div>`;
    info += `<p>${avail ? esc(ep.desc) : "아직 열리지 않은 이야기입니다. 아래 조건을 채우면 열립니다."}</p>`;
    info += `<ul class="bhint">${BD.hintOf(ep).map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${ok ? "✔" : "✖"} ${esc(t)}</li>`).join("")}</ul>`;
    if (ep.stage && avail) {
      const OB = BD.objectivesOf(ep.stage), md = SY.missionMod(ep.stage);
      info += `${md && md.note ? `<div class="mnote">⚑ 작전 변경 · ${esc(md.note)}</div>` : ""}<div class="objs"><b>임무 목표 — ${OB.list.length}개 중 ${OB.need}개 이상 달성 · 윙맨 ${esc(who)}</b><ul>${OB.list.map((o) => `<li class="${o.req ? "req" : ""}">${o.req ? "★ " : ""}${esc(o.text)}${o.req ? " <i>핵심</i>" : ""}</li>`).join("")}</ul></div>`;
    }
    if (avail && seen && ep.stage) info += `<button class="ghost scenebtn" data-a="bondplay" data-v="${ep.id}">▶ 출격 전 이야기 다시 보기</button>`;
    if (done && BD.bondScene(ep, "post")) info += `<button class="ghost scenebtn" data-a="bondpostplay" data-v="${ep.id}">▶ 임무 뒤 이야기 다시 보기</button>`;
    info += `</div>`;
    const body = `<p class="hint2 intro">편대 동료 한 사람 한 사람의 이야기. 장면 속 선택으로 관계가 깊어지고 본편이 진행되면 열립니다. 마지막 편은 그 동료가 윙맨으로 함께 나는 전용 임무입니다. 인연 이야기를 끝까지 함께한 동료가 많을수록 마지막 하늘이 달라집니다.</p>`
      + this._step(1, "동료", `${known ? who : "???"} · 관계 ${rel(who)}`, `<div class="bonds bpick">${cards}</div>`)
      + this._step(2, "이야기", `${ep.no}편 ${avail ? ep.title : "🔒"}`, `<div class="stages">${rows}</div>`)
      + this._step(3, "정보", "", info);
    const act = !avail ? "잠김" : ep.stage ? (seen ? "출격" : "이야기 보고 출격") : seen ? "다시 보기" : "이야기 보기";
    const bar = `<div class="startbar"><span class="sum">인연 · ${esc(known ? who : "???")} ${ep.no}편 ${avail ? esc(ep.title) : ""}</span>
      <button class="primary" data-a="bondgo" data-v="${ep.id}" ${avail ? "" : "disabled"}>${act} <span aria-hidden="true">→</span></button></div>`;
    return this._storyShell("BONDS", "인연 이야기", body, bar);
  }
  _epMeta(ep, part) { return { key: `${ep.id}:${part}`, title: ep.title, sub: `인연 · ${ep.who} ${ep.no}편${part === "post" ? " · 임무 이후" : ""}` }; }
  // 이야기만 보기 (출격하지 않음). 이야기 편은 끝까지 보면 완료
  a_bondplay(v) {
    const ep = BD.epById(v), pre = ep && BD.bondScene(ep);
    if (!pre || !(BD.epOpen(ep) || BD.epDone(ep))) return;
    this.vn.play(pre, Object.assign(this._epMeta(ep, "pre"), { onDone: () => { BD.markEpisode(ep); if (this.screen === "setup") this.redraw(); } }));
  }
  a_bondpostplay(v) {
    const ep = BD.epById(v), post = ep && BD.bondScene(ep, "post");
    if (post && BD.epDone(ep)) this.vn.play(post, Object.assign(this._epMeta(ep, "post"), { onDone: () => this.redraw() }));
  }
  // 편 시작: 이야기 편은 장면, 임무 편은 (처음이면 장면 →) 출격
  a_bondgo(v) {
    const ep = BD.epById(v);
    if (!ep || !(BD.epOpen(ep) || BD.epDone(ep))) return;
    if (!ep.stage) return this.a_bondplay(v);
    const go = () => this.game.startSession(BD.bondConfig(ep));
    if (BD.epSeen(ep)) return go();
    this.hide();
    this.vn.play(BD.bondScene(ep), Object.assign(this._epMeta(ep, "pre"), { onDone: () => { BD.markEpisode(ep); go(); } }));
  }
  // ── 엔딩 목록 ──
  s_storyEnd() {
    const got = BD.endingsGot().length, st = BD.endingStatus(), c8 = story().chapters.find((c) => c.id === "c8"), fin = !!c8 && SY.chapterDone(c8);
    const cards = BD.ENDINGS.map((e) => {
      const has = BD.endingGot(e.id);
      return `<div class="ecard ${has ? "got" : ""} e-${e.id}"><div class="ek">ENDING ${e.no} · ${e.kind}${records.hsendlast === e.id ? ` <i>최근</i>` : ""}</div>
        <div class="et">${has ? esc(e.title) : "？？？"}</div><p>${esc(has ? e.desc : e.hint)}</p>
        ${has ? `<button class="ghost small" data-a="endplay" data-v="${e.id}">▶ 엔딩 다시 보기</button>` : ""}</div>`;
    }).join("");
    const ck = (ok, t) => `<li class="${ok ? "ok" : ""}">${ok ? "✔" : "✖"} ${t}</li>`;
    const now = BD.ENDINGS.find((e) => e.id === BD.endingOf());
    const status = `<div class="brief"><div class="bk">지금의 하늘</div><ul class="bhint">
      ${ck(st.noeul >= 10, `노을과의 관계 ${st.noeul} <small>(10 이상)</small>`)}
      ${ck(st.keys >= 2, `노을과 나눈 결정적인 순간 ${st.keys}/3 <small>(2개 이상)</small>`)}
      ${ck(st.fin >= 3, `인연 이야기를 끝까지 함께한 동료 ${st.fin}명 <small>(3명 이상)</small>`)}
      ${ck(st.team >= 15, `노을 밖의 편대 동료들과의 관계 합 ${st.team} <small>(15 이상)</small>`)}</ul>
      <p class="hint2">${fin ? `지금 관계로 마지막 장면을 보면 <b>「${esc(now.title)}」</b>에 닿습니다. 8장 「거신 오메가」의 마지막 단계를 다시 깨면 엔딩을 다시 맞이할 수 있습니다.` : "본편 8장을 끝내면 그때까지의 관계와 선택에 따라 세 엔딩 중 하나에 닿습니다. 노을과 멀어진 채 마지막 비행에 오르면, 노을은 돌아오지 못할지도 모릅니다."}</p></div>`;
    const body = `<p class="hint2 intro">「노을의 날개」의 결말은 하나가 아닙니다. 장면 속 선택과 동료들과 쌓은 인연이 마지막 하늘을 바꿉니다. 어느 엔딩으로 끝내도 숨겨진 이야기는 열립니다.</p>`
      + this._step(1, "엔딩 목록", `${got}/${BD.ENDINGS.length} 수집`, `<div class="ecards">${cards}</div>`)
      + this._step(2, "엔딩 조건", "", status);
    return this._storyShell("ENDINGS", "엔딩 목록", body, `<div class="startbar"><span class="sum">엔딩 ${got}/${BD.ENDINGS.length} 수집</span><button class="primary" data-a="stab" data-v="main">본편으로 <span aria-hidden="true">→</span></button></div>`);
  }
  a_endplay(v) {
    const sc = SCENES[`end:${v}`], e = BD.ENDINGS.find((x) => x.id === v);
    if (!sc || !e || !BD.endingGot(v)) return;
    records.hsendnow = v;
    this.vn.play(sc.post, { key: `end:${v}`, title: e.title, sub: `ENDING ${e.no} · ${e.kind} · 다시 보기`, onDone: () => this.redraw() });
  }
  // 엔딩 도달 카드: 이번에 닿은 엔딩과 수집 수
  _endCard(id, then) {
    const e = BD.ENDINGS.find((x) => x.id === id), first = BD.recordEnding(id);
    if (!e) return then();
    this.vn.play(["@bg black", "@flash", `|ENDING ${e.no} · ${e.kind}`, `|「${e.title}」`, `|엔딩 ${BD.endingsGot().length}/${BD.ENDINGS.length} 수집${first ? " — 새로운 엔딩!" : ""}`, "|스토리 화면의 ‘엔딩’ 탭에서 다시 볼 수 있습니다."],
      { title: e.title, sub: `ENDING ${e.no} · ${e.kind}`, onDone: then });
  }
  _bondPost(v) {
    const ep = BD.epById(v), post = ep && BD.bondScene(ep, "post");
    if (!post) return;
    this.game.quit(); this.hide();
    this.vn.play(post, Object.assign(this._epMeta(ep, "post"), { onDone: () => { this.sel.mode = "challenge"; this.sel.stab = "bond"; this.sel.bwho = ep.who; this.sel.bep = ep.id; this._persist(); this.show("setup"); } }));
  }


  // 비행훈련: ① 과정 ② 과목 ③ 브리핑·과제
  s_training() {
    const s = this.sel, m = MODE_META.training, prog = TR.progress(), all = TR.LESSONS;
    let cur = all.find((l) => l.id === s.lesson);
    if (cur && s.course && cur.course !== s.course) cur = null;
    const next = all.find((l) => l.course !== "trick" && TR.unlocked(l) && !TR.cleared(l)) || all[0];
    const co = TR.COURSES.find((c) => c.id === (cur ? cur.course : s.course)) || TR.COURSES.find((c) => c.id === next.course);
    const list = TR.lessonsOf(co.id);
    if (!cur) cur = list.find((l) => TR.unlocked(l) && !TR.cleared(l)) || [...list].reverse().find((l) => TR.unlocked(l)) || list[0];
    s.course = co.id; s.lesson = cur.id;
    if (!TR_MAPS.includes(s.tmap)) s.tmap = TR_MAPS[0];
    const coCards = TR.COURSES.map((c, i) => {
      const ls = TR.lessonsOf(c.id), done = ls.filter(TR.cleared).length, open = TR.unlocked(ls[0]);
      return `<button class="card ${c.id === co.id ? "sel" : ""} ${open ? "" : "locked"}" data-a="sel" data-k="course" data-v="${c.id}">
        <div class="ic">${["🛫", "🧭", "🌀", "🎬"][i]}</div><div class="tag">${open ? `${done}/${ls.length}` : "🔒"}</div>
        <div class="nm"><small>${c.en}</small>${c.name}</div><div class="ds">${c.desc}</div></button>`;
    }).join("");
    const lCards = list.map((l) => {
      const open = TR.unlocked(l), cleared = TR.cleared(l);
      return `<button class="card stage ${l.id === cur.id ? "sel" : ""} ${open ? "" : "locked"} ${cleared ? "cleared" : ""}" data-a="sel" data-k="lesson" data-v="${l.id}">
        <span class="sno">${open ? l.no : "🔒"}</span><span class="stx"><b>${l.name}</b><small>과제 ${l.tasks.length}개 · 기준 ${l.par}초${l.limit ? ` · 제한 ${l.limit}초` : ""}</small></span>
        <span class="stars">${cleared ? starStr(TR.lessonStars(l)) : open ? "도전" : ""}</span></button>`;
    }).join("");
    const open = TR.unlocked(cur);
    let brief = `<div class="brief"><div class="bk">${co.en} · ${co.name} ${cur.no}</div><p>${esc(cur.brief)}</p>
      <ol class="tasks">${cur.tasks.map((t) => `<li>${esc(t.text)}</li>`).join("")}</ol>
      <div class="goal">평가 <b>★★★ 추락 없이 ${cur.par}초 안에</b></div></div>`;
    if (!open) brief += `<p class="hint2">앞 과목을 먼저 통과해야 열립니다.</p>`;
    brief += `<div class="opt"><label>훈련장</label>${this.seg("tmap", TR_MAPS.map((id) => [id, MAPS[id].name]), s.tmap)}</div>`;
    brief += `<div class="opt"><label>시점</label>${this.seg("camera", Object.entries(CAMERA_NAMES), settings.camera, "set")}</div>`;
    if (cur.demo) brief += `<p class="hint2">🎬 먼저 시범 비행을 보여 줍니다. 단계마다 스틱을 어떻게, 언제 움직이는지 화면 아래 두 스틱으로 보여 준 뒤 직접 따라 합니다. 훈련 중 E 키로 시범을 다시 볼 수 있습니다.</p>`;
    brief += `<p class="hint2">훈련은 ACRO 모드로만 진행합니다. 추락하면 출발 지점에서 다시 시작하고, 하던 과제부터 이어집니다.</p>`;
    const body = this._step(1, "과정 선택", co.name, `<div class="grid c4">${coCards}</div>`)
      + this._step(2, "과목 선택", `${cur.no}. ${cur.name}`, `<div class="stages">${lCards}</div>`)
      + this._step(3, "브리핑", "", brief);
    return `<div class="screen split tr" style="--c:${m.c}">
      <div class="pane" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${co.id === "trick" ? "TRICKS" : m.en}</span>${co.id === "trick" ? "트릭 연습" : m.name}</h2><span class="prog">${prog}/${all.length} 과목</span></div>
        ${body}
        <div class="startbar"><span class="sum">${esc(co.name)} · ${cur.no}. ${esc(cur.name)} · ACRO</span>
          <button class="primary" data-a="start" ${open ? "" : "disabled"}>${open ? "훈련 시작" : "잠김"} <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="rcol"><div class="stage" data-stage></div></div>
    </div>`;
  }

  s_setup() {
    if (this.sel.mode === "challenge") return this.s_story();
    if (this.sel.mode === "training") return this.s_training();
    const s = this.sel, m = MODE_META[s.mode];
    const cmMissions = (id) => MISSIONS.filter((x) => x.map === id);
    if (s.mode === "challenge" && !cmMissions(s.map).length) s.map = (MISSIONS.find((x) => x.id === s.mission) || MISSIONS[0]).map;
    const map = MAPS[s.map];
    const card = (k, v, on, inner, cls = "") => `<button class="card ${cls} ${on ? "sel" : ""}" data-a="sel" data-k="${k}" data-v="${v}">${inner}</button>`;
    // ① 맵 (모든 모드 공통)
    const maps = MAP_LIST.map((mp) => {
      const extra = s.mode === "challenge" ? `<div class="tag">임무 ${cmMissions(mp.id).length}</div>` : "";
      return card("map", mp.id, s.map === mp.id, `${this._thumb("map", mp.id)}${extra}<div class="nm">${mp.name}</div><div class="ds">${mp.desc}</div>`, "mapcard");
    }).join("");
    let step2 = "", t2 = "", p2 = "", opts = "";
    if (s.mode === "race") {
      if (!map.tracks.find((t) => t.id === s.track)) s.track = map.tracks[0].id;
      const tr = map.tracks.find((t) => t.id === s.track), loop = tr.loop !== false;
      t2 = "코스 선택"; p2 = tr.name;
      step2 = map.tracks.map((t) => {
        const best = records[`race:${map.id}:${t.id}:${t.loop === false ? 1 : s.laps}`];
        return card("track", t.id, s.track === t.id, `${this._route(t.gates.map((g) => [g.p[0], g.p[2]]), t.loop !== false)}<div class="tag">${best ? "최고 " + fmtTime(best) : ""}</div>
          <div class="nm">${t.name}</div><div class="stars">${starStr(t.level)}</div><div class="ds">${t.desc} · ${t.loop === false ? "구간 주행" : `게이트 ${t.gates.length}개`}</div>`, "routecard");
      }).join("");
      if (loop) opts += `<div class="opt"><label>랩 수</label>${this.seg("laps", [[1, "1"], [2, "2"], [3, "3"], [5, "5"]], s.laps)}</div>`;
      opts += `<div class="opt"><label>AI 라이벌</label>${this.seg("rivals", [[0, "없음"], [1, "1"], [3, "3"], [5, "5"]], s.rivals)}</div>` + this._diff();
    } else if (s.mode === "tracking") {
      if (!map.tracking.find((t) => t.id === s.subject)) s.subject = map.tracking[0].id;
      t2 = "피사체 선택"; p2 = map.tracking.find((t) => t.id === s.subject).name;
      step2 = map.tracking.map((t) => {
        const best = records[`tracking:${map.id}:${t.id}`];
        return card("subject", t.id, s.subject === t.id, `${this._route(t.path.map((q) => [q[0], q[2]]), t.closed !== false)}<div class="tag">${best ? "최고 " + best + "점" : ""}</div>
          <div class="nm">${t.name}</div><div class="stars">${starStr(t.level)}</div><div class="ds">${t.desc}</div>`, "routecard");
      }).join("");
      opts += `<p class="hint2">피사체를 화면 가운데, 적당한 거리(3~14m)에 두고 놓치지 않을수록 점수가 오릅니다. 시네우프 기체와 ANGLE·LOITER 모드가 쉽습니다.</p>`;
    } else if (s.mode === "freestyle") {
      const best = records[`freestyle:${map.id}`];
      t2 = "진행 방식"; p2 = s.fs === "timed" ? "2분 점수 도전" : "자유 비행";
      step2 = card("fs", "timed", s.fs === "timed", `<div class="ic">⏱</div><div class="tag">${best ? "최고 " + best + "점" : ""}</div><div class="nm">2분 점수 도전</div><div class="ds">제한 시간 안에 묘기와 통과 지점으로 최고 점수에 도전합니다.</div>`)
        + card("fs", "free", s.fs === "free", `<div class="ic">🕊</div><div class="nm">자유 비행</div><div class="ds">시간 제한 없이 맵을 돌아다니며 연습합니다. Esc 로 끝냅니다.</div>`);
      opts += `<p class="hint2">플립·롤·스핀·다이브·근접 비행·갭 통과를 끊기지 않게 이어 콤보 배율을 올리세요. ACRO 모드에서 모든 묘기를 할 수 있습니다.</p>`;
    } else if (s.mode === "survival") {
      if (!VARIANTS[s.variant] || VARIANTS[s.variant].hidden) s.variant = "dm";
      t2 = "방식 선택"; p2 = VARIANTS[s.variant].name;
      step2 = Object.entries(VARIANTS).filter(([, v]) => !v.hidden).map(([id, v]) => {
        const best = records[`survival:${id}:${map.id}`];
        return card("variant", id, s.variant === id, `<div class="ic">${v.icon}</div><div class="tag">${best ? "최고 " + best + "점" : ""}</div><div class="nm">${v.name}</div><div class="ds">${v.desc}</div>`);
      }).join("");
      opts += `<div class="opt"><label>AI 드론 수</label>${this.seg("bots", [[3, "3"], [5, "5"], [7, "7"], [9, "9"]], s.bots)}</div>`;
      opts += `<div class="opt"><label>제한 시간</label>${this.seg("time", [[120, "2분"], [180, "3분"], [300, "5분"]], s.time)}</div>` + this._diff();
    } else {
      const list = cmMissions(s.map);
      if (!list.find((x) => x.id === s.mission)) s.mission = list[0].id;
      t2 = "임무 선택"; p2 = MISSIONS.find((x) => x.id === s.mission).name;
      step2 = list.map((ms) => card("mission", ms.id, s.mission === ms.id, `<div class="ic">${ms.icon}</div><div class="tag stars">${starStr(records[`challenge:${ms.id}`] || 0)}</div>
          <div class="nm">${ms.name}</div><div class="ds">${ms.desc} · 난이도 ${"●".repeat(ms.level)}</div>`)).join("");
      opts += `<div class="opt"><label>팀 구성</label>${this.seg("team", [[0, "혼자"], [1, "2기 편대"], [3, "4기 편대"]], s.team)}<div class="hint">편대를 고르면 AI 윙맨이 함께 싸웁니다. 인원이 늘면 적도 강해집니다.</div></div>` + this._diff();
    }
    // ③ 옵션: 모드별 옵션 + 공통 비행 설정
    opts += `<div class="opt"><label>비행 모드</label>${this.seg("flightMode", FLIGHT_MODES.map((k) => [k, FLIGHT_MODE_INFO[k].label]), settings.flightMode, "set")}</div>`;
    opts += `<div class="opt"><label>시점</label>${this.seg("camera", Object.entries(CAMERA_NAMES), settings.camera, "set")}</div>`;
    opts += `<div class="opt"><label>기체</label><button class="ghost" data-a="go" data-v="hangar">🛠 ${esc(DRONE_CLASSES[settings.drone.cls].name)} — 정비소에서 바꾸기</button></div>`;
    const summary = [map.name, p2].filter(Boolean).join(" · ");
    const body = this._step(1, "맵 선택", map.name, `<div class="grid maps">${maps}</div>`)
      + this._step(2, t2, p2, `<div class="grid wide">${step2}</div>`)
      + this._step(3, "옵션", "", opts);
    return `<div class="screen split" style="--c:${m.c}">
      <div class="pane" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${m.en}</span>${m.name}</h2></div>
        ${body}
        <div class="startbar"><span class="sum">${esc(summary)} · ${esc(DRONE_CLASSES[settings.drone.cls].name)} · ${FLIGHT_MODE_INFO[settings.flightMode].label}</span>
          <button class="primary" data-a="start">비행 시작 <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="rcol"><div class="stage" data-stage></div></div>
    </div>`;
  }
  _diff() { return `<div class="opt"><label>난이도</label><button class="ghost diffbtn" data-a="diffopen">${DIFFICULTY[settings.difficulty].name} <span aria-hidden="true">▸</span></button></div>`; }

  a_sel(v, el) {
    const k = el.dataset.k;
    this.sel[k] = ["laps", "rivals", "bots", "time", "team"].includes(k) ? +v : v;
    if (k === "chapter") { this.sel.stage = null; this.sel.route = null; }
    if (k === "route") this.sel.stage = null;
    if (k === "bwho") this.sel.bep = null;
    if (k === "course") this.sel.lesson = null;
    this._persist();
    this.redraw();
    // 고른 다음 단계가 보이게 내린다 (맵 → 2단계, 2단계 → 옵션)
    const next = k === "map" || k === "chapter" || k === "course" ? 2 : ["track", "subject", "fs", "variant", "mission", "stage", "lesson"].includes(k) ? 3 : 0;
    const stepEl = next && this.root.querySelector(`[data-step="${next}"]`);
    if (stepEl) stepEl.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  a_start() {
    const s = this.sel;
    // AI 와 겨루는 모드는 출격 전에 난이도 화면을 겹쳐 띄운다
    if (((s.mode === "race" && s.rivals > 0) || s.mode === "survival") && !this._diffOk) return this._openDiff(true);
    this._diffOk = false;
    const cfg = { mode: s.mode, map: s.map, difficulty: settings.difficulty };
    if (s.mode === "race") Object.assign(cfg, { track: s.track, laps: s.laps, rivals: s.rivals });
    else if (s.mode === "tracking") cfg.subject = s.subject;
    else if (s.mode === "freestyle") cfg.session = s.fs;
    else if (s.mode === "survival") Object.assign(cfg, { variant: s.variant, bots: s.bots, time: s.time }, s.variant === "conq" ? { mode: "conquest" } : {});
    else if (s.mode === "training") {
      const l = TR.LESSONS.find((x) => x.id === s.lesson);
      if (!l || !TR.unlocked(l)) return;
      return this.game.startSession(TR.lessonConfig(l, s.tmap));
    }
    else if (s.mode === "challenge") {
      const st = story().flat.find((x) => x.id === s.stage);
      if (!st || !unlocked(st)) return;
      return this._storyGo(st);
    }
    else { const ms = MISSIONS.find((x) => x.id === s.mission) || MISSIONS[0]; Object.assign(cfg, { mission: ms.id, map: ms.map, team: s.team }); }
    this.game.startSession(cfg);
  }

  // ── 설정값 변경 공통 ──
  a_set(v, el) {
    const path = el.dataset.k;
    const cur = getPath(settings, path);
    const val = typeof cur === "boolean" ? v === "true" : typeof cur === "number" ? +v : v;
    setPath(settings, path, val);
    this._applied(path);
    save();
    this.redraw();
  }
  _input(el, commit = false) {
    const path = el.dataset && el.dataset.set;
    if (!path) return;
    const cur = getPath(settings, path);
    const val = el.type === "checkbox" ? el.checked : typeof cur === "number" ? +el.value : el.value;
    setPath(settings, path, val);
    const out = el.parentElement.querySelector("output");
    if (out) out.textContent = el.dataset.pct ? `${Math.round(el.value * 100)}%` : `${el.value}${el.dataset.unit || ""}`;
    if (path.startsWith("rates.")) settings.ratePreset = "custom";
    this._applied(path);
    if (commit || el.type !== "range") save();
    if (commit && (el.tagName === "SELECT" || el.type === "checkbox")) this.redraw();
  }
  _applied(path) {
    const g = this.game;
    if (path.startsWith("drone.")) g.menu.setLook(settings.drone);
    if (path === "volume" || path === "voiceVolume" || path === "mute") g.sound.applyVolumes();
    if (path === "musicVolume" || path === "mute") g.music.setVolume();
    // 슬라이더를 움직이면 그 음량으로 짧게 들려준다
    if (path === "volume") g.sound.cue("click", 1);
    if (path === "voiceVolume") g.sound.cue("vblip", 1, 0, 0.9 + Math.random() * 0.3);
    if (path === "quality") { g._autoTier = null; g.dprScale = 1; g.applyQuality(); }
    if (path === "gamepad.layout" && settings.gamepad.layout === "custom" && g.input.padInfo) settings.gamepad.axes = structuredClone(g.input.padInfo.axes);   // 자동 배치에서 출발
  }

  // ── 격납고: 외형 · 테마 · 효과 · 파츠 · 퀘스트 (포인트로 구매·업그레이드) ──
  s_hangar() {
    const d = settings.drone, cls = DRONE_CLASSES[d.cls], tab = this._gtab || "look";
    const P = (n) => `${n.toLocaleString()}P`;
    const bar = (v) => `<div class="b"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div>`;
    // 잠금 칩: 가진 것은 바로 적용, 아니면 가격 표시 → 누르면 구매 후 적용
    const chips = (kind, key, obj, cur, label = (v) => (typeof v === "string" ? v : v.name)) => `<div class="chips">${Object.entries(obj).map(([k, v]) => {
      const own = GP.owns(kind, k), on = String(cur) === k;
      return `<button class="chip ${on ? "on" : ""} ${own ? "" : "lock"}" data-a="gbuy" data-kind="${kind}" data-key="${key}" data-v="${k}">${own ? "" : "🔒 "}${label(v)}${own ? "" : ` <em>${P(GP.priceOf(kind, k))}</em>`}</button>`;
    }).join("")}</div>`;
    const tabs = [["look", "외형"], ["theme", "테마"], ["fx", "효과"], ["parts", "파츠"], ["skill", "스킬"], ["quest", "퀘스트"]];
    let body = "";
    if (tab === "look") {
      const paint = GP.owns("paint", "on");
      const color = (key, label) => `<div class="opt"><label>${label}</label>${paint ? `<input type="color" value="${d[key]}" data-set="drone.${key}">` : `<span class="hint">커스텀 페인트 필요</span>`}</div>`;
      body = `<h3 style="margin-top:0">기체 등급 (성능)</h3>
        <div class="grid">${Object.entries(DRONE_CLASSES).map(([k, c]) => `<button class="card ${d.cls === k ? "sel" : ""}" data-a="set" data-k="drone.cls" data-v="${k}"><div class="nm">${c.name}</div><div class="ds">${c.desc}</div></button>`).join("")}</div>
        <div class="spec"><span>추력</span>${bar(cls.twr / 8)}<span>최고 속도</span>${bar(cls.pitchSpeed / 62)}<span>민첩성</span>${bar(0.028 / cls.rateTau)}<span>안정감</span>${bar(cls.cdaT / 0.045 * 0.6 + cls.rateTau / 0.05 * 0.4)}</div>
        <h3>프레임 (형상)</h3>${chips("frame", "frame", FRAMES, d.frame)}
        <h3>캐노피</h3>${chips("canopy", "canopy", CANOPIES, d.canopy)}
        <h3>프로펠러</h3><div class="chips">${[["2", "2엽"], ["3", "3엽"]].map(([k, l]) => `<button class="chip ${String(d.props) === k ? "on" : ""}" data-a="set" data-k="drone.props" data-v="${k}">${l}</button>`).join("")}</div>
        <h3>스킨</h3>${chips("skin", "skin", SKINS, d.skin)}
        <h3>색 조합</h3><div class="swatches">${COLOR_PRESETS.map((pr, n) => { const own = GP.owns("preset", String(n)); return `<button class="swatch ${own ? "" : "lock"}" data-a="gbuy" data-kind="preset" data-v="${n}"><i style="background:${pr.accentColor}"></i><i style="background:${pr.propColor}"></i>${own ? "" : "🔒 "}${pr.name}${own ? "" : ` <em>${P(GP.priceOf("preset", String(n)))}</em>`}</button>`; }).join("")}</div>
        <h3>커스텀 페인트</h3>${paint ? "" : `<button class="chip lock" data-a="gbuy" data-kind="paint" data-v="on">🔒 색을 직접 고르기 <em>${P(GP.priceOf("paint", "on"))}</em></button>`}
        ${color("frameColor", "프레임")}${color("accentColor", "포인트")}${color("propColor", "프로펠러")}${color("ledColor", "LED")}
        <h3>LED</h3>${chips("led", "ledMode", LED_MODES, d.ledMode)}
        <h3>연기 꼬리</h3>${chips("trail", "trail", Object.fromEntries(TRAILS), d.trail)}`;
    } else if (tab === "theme") {
      body = `<p class="hint2">테마는 외형(프레임·캐노피·스킨·색)과 효과(레이저·미사일·부스트·아이템)를 한 번에 바꾸는 세트입니다. 장착 후 따로 바꿔도 됩니다.</p><div class="themes">${Object.entries(GP.THEMES).map(([id, t]) => {
        const own = GP.themeOwns(id), lockStory = t.need && !SY.chapterDone(story().chapters.find((c) => c.id === t.need) || { stages: [] });
        return `<button class="card theme ${own ? "" : "locked"}" data-a="gtheme" data-v="${id}" ${lockStory && !own ? "disabled" : ""}>
          <span class="sw"><i style="background:${t.look.frameColor}"></i><i style="background:${t.look.accentColor}"></i><i style="background:${t.look.propColor}"></i></span>
          <div class="nm">${t.name}</div><div class="ds">${esc(t.desc)}</div>
          <div class="pr">${own ? "보유 · 눌러서 장착" : lockStory ? `🔒 ${t.need.startsWith("e") ? "에이아 연대기" : "별의 저편"} 클리어 필요` : `🔒 ${P(t.price)}`}</div></button>`;
      }).join("")}</div>`;
    } else if (tab === "fx") {
      body = Object.entries(GP.FX).map(([slot, F]) => `<h3>${F.name}</h3><div class="chips">${Object.entries(F.items).map(([k, it]) => {
        const own = GP.fxOwns(slot, k), on = GP.fxEquipped(slot) === k, c = it.color ? "#" + it.color.toString(16).padStart(6, "0") : it.rainbow ? "conic-gradient(#f55,#fd5,#5f8,#5df,#a5f,#f55)" : "";
        return `<button class="chip fxc ${on ? "on" : ""} ${own ? "" : "lock"}" data-a="gfx" data-slot="${slot}" data-v="${k}">${c ? `<b class="dot" style="background:${c}"></b>` : ""}${own ? "" : "🔒 "}${it.name}${own ? "" : ` <em>${P(it.price)}</em>`}</button>`;
      }).join("")}</div>`).join("") + `<p class="hint2">레이저 형태: 헤비 빔은 굵고 화려한 명중 불꽃, 니들은 가늘고 날카롭게, 노바는 명중 순간 큰 섬광. 부스트 효과는 부스터 아이템을 쓰는 동안 기체 뒤에 꼬리를 남깁니다.</p>`;
    } else if (tab === "parts") {
      const slot = GP.PARTS[this._pslot] ? this._pslot : (this._pslot = GP.SLOTS[0]), Pt = GP.PARTS[slot], cur = GP.partOf(slot), pv = this._ppv && this._ppv.slot === slot ? this._ppv.v : null;
      const chipsOf = (e) => Object.entries(e || {}).map(([k, v]) => `<i class="${GP.statGood(k, v) ? "up" : "dn"}">${esc(GP.statText(k, v))}</i>`).join("");
      body = `<p class="hint2">슬롯마다 부품 하나를 <b>장착</b>합니다. 부품은 저마다 장단점이 있고, 부품마다 따로 <b>0~5단계</b> 업그레이드합니다(3·5단계에서 추가 효과). 부품을 누르면 왼쪽 기체와 성능 막대로 <b>미리 볼 수</b> 있습니다. 효과는 전투 모드에 적용되고, 추력은 모든 비행에 적용됩니다(비행훈련 제외).</p>
        <div class="pslots">${GP.SLOTS.map((k) => { const c = GP.partOf(k); return `<button class="${k === slot ? "on" : ""}" data-a="gslot" data-v="${k}"><span class="ic">${GP.PARTS[k].icon}</span><b>${GP.PARTS[k].short}</b><small>Lv.${c.lv}</small></button>`; }).join("")}</div>
        <h3 class="psh">${Pt.icon} ${Pt.name} <small>${Object.keys(Pt.variants).length}종 · 하나 장착</small></h3>`
        + Object.entries(Pt.variants).map(([k, V]) => {
          const own = GP.variantOwns(slot, k), on = cur.v === k, lv = GP.partLv(slot, k), cost = GP.UP_COST[lv], id = `${slot}.${k}`;
          const next = lv < 5 ? { ...V.per } : null;
          if (next && lv + 1 === 3) for (const [a, b] of Object.entries(V.b3)) next[a] = (next[a] || 0) + b;
          if (next && lv + 1 === 5) for (const [a, b] of Object.entries(V.b5)) next[a] = (next[a] || 0) + b;
          return `<div class="pcard ${on ? "eq" : ""} ${(pv ? pv === k : on) ? "pv" : ""} ${own ? "" : "lock"}" data-pv="${id}">
            <button class="pch" data-a="gpsel" data-v="${id}">
              <span class="pn"><b>${V.name}</b><i class="tag">${V.tag}</i><span class="st ${on ? "eq" : own ? "own" : "buy"}">${on ? "✔ 장착 중" : own ? "보유" : `🔒 ${P(V.price)}`}</span></span>
              <em class="ds">${esc(V.desc)}</em>
              <span class="fxc">${V.base ? chipsOf(V.base) : `<i class="nt">기본형 · 장단점 없음</i>`}</span>
              <span class="plv"><span class="pips">${"◆".repeat(lv)}${"◇".repeat(5 - lv)}</span> <small>Lv.${lv}</small> <span class="per">단계마다 ${esc(GP.effText(V.per))}</span></span>
              <span class="bon"><i class="${lv >= 3 ? "on" : ""}">${lv >= 3 ? "✔" : "🔒"} 3단계 · ${esc(GP.effText(V.b3))}</i><i class="${lv >= 5 ? "on" : ""}">${lv >= 5 ? "✔" : "🔒"} 5단계 · ${esc(GP.effText(V.b5))}</i></span>
            </button>
            <div class="pact">
              ${on ? "" : `<button class="primary small" data-a="gpart" data-v="${id}" ${own || GP.points() >= V.price ? "" : "disabled"}>${own ? "장착" : `구매 · ${P(V.price)}`}</button>`}
              ${!own ? `<span class="nx">구매하면 업그레이드할 수 있습니다</span>` : lv < 5 ? `<button class="primary small up" data-a="gup" data-v="${id}" ${GP.points() < cost ? "disabled" : ""}>업그레이드 Lv.${lv + 1} · ${P(cost)}</button><span class="nx">다음 단계: ${esc(GP.effText(next))}</span>` : `<span class="maxed">★ 최대 단계</span>`}
            </div></div>`;
        }).join("");
    } else if (tab === "skill") {
      const eq = GP.skillEquipped(), pv = this._skPv || eq, ck = (c) => "#" + c.toString(16).padStart(6, "0");
      body = `<p class="hint2">전투 중 적을 맞히거나 격추하면 <b>스킬 게이지</b>가 찹니다. 게이지가 스킬마다 정해진 양 이상이면 <b>스킬 키(키보드 X · 패드 스틱 누름 · 터치 스킬 버튼)</b>로 발동합니다. 스킬은 하나만 장착할 수 있고, 포인트로 <b>Lv.5</b>까지 강화하면 수치와 연출이 함께 커집니다(Lv.3·Lv.5 에서 새 효과). 카드를 누르면 왼쪽에서 효과를 미리 볼 수 있습니다.</p>
        <div class="skills">${Object.entries(GP.SKILLS).map(([id, k]) => {
          const own = GP.skillOwns(id), on = eq === id, c = ck(k.color), lv = GP.skillLv(id), st = GP.skillStat(id, lv), nx = lv < GP.SKILL_MAX ? GP.skillStat(id, lv + 1) : null, ms = GP.skillMilestone(id), cost = GP.SKILL_UP_COST[lv - 1];
          const rows = GP.skillRows(id).map(([key, nm, un]) => `<span class="${nx && nx[key] !== st[key] ? "ch" : ""}"><small>${nm}</small><b>${st[key]}${un}</b>${nx && nx[key] !== st[key] ? `<em>→ ${nx[key]}${un}</em>` : ""}</span>`).join("");
          return `<div class="skc ${on ? "on" : ""} ${pv === id ? "pv" : ""}" style="--k:${c}">
            <div class="skr">
            <button class="skp" data-a="gskpv" data-v="${id}"><span class="ic">${k.icon}</span><span class="tx"><b>${k.name} <i class="slv ${lv >= 5 ? "mx" : ""}">Lv.${lv}</i></b><small>${k.tag} · 게이지 ${st.cost}%${st.dur ? ` · ${st.dur}초` : ""}</small><em>${esc(GP.skillDesc(id, lv))}</em></span><span class="eye">${pv === id ? "▶ 미리보기 중" : "▷ 미리보기"}</span></button>
            ${on ? `<span class="skst">✔ 장착 중</span>` : own ? `<button class="primary small" data-a="gskill" data-v="${id}">장착</button>` : `<button class="primary small" data-a="gskill" data-v="${id}" ${GP.points() < k.price ? "disabled" : ""}>구매 · ${P(k.price)}</button>`}
            </div>
            <div class="skl">
              <span class="pips">${"●".repeat(lv)}${"○".repeat(GP.SKILL_MAX - lv)}</span>
              <div class="skv">${rows}</div>
              <div class="bon"><i class="${lv >= 3 ? "on" : ""}">${lv >= 3 ? "✔" : "🔒"} Lv.3 · ${esc(ms.m3)}</i><i class="${lv >= 5 ? "on" : ""}">${lv >= 5 ? "✔" : "🔒"} Lv.5 · ${esc(ms.m5)}</i></div>
              ${!own ? "" : nx ? `<button class="primary small up" data-a="gskup" data-v="${id}" ${GP.points() < cost ? "disabled" : ""}>강화 Lv.${lv + 1} · ${P(cost)}</button>` : `<span class="maxed">★ 최대 레벨</span>`}
            </div>
          </div>`;
        }).join("")}</div>`;
    } else {
      const q = GP.quests(), rin = GP.resetIn(), hm = (ms) => `${Math.floor(ms / 3600000)}시간 ${Math.floor((ms % 3600000) / 60000)}분`;
      const qrow = (x) => { const cur = x.unit === "s" ? Math.floor(x.prog / 60) : x.prog, max = x.unit === "s" ? x.n / 60 : x.n; return `<div class="q ${x.done ? "done" : ""}"><div class="qt"><b>${esc(x.text)}</b><span>${x.done ? "✔ 완료" : `${cur} / ${max}`}</span></div><div class="b"><i style="width:${Math.round((x.prog / x.n) * 100)}%"></i></div><em>+${x.pts}P</em></div>`; };
      body = `<h3 style="margin-top:0">일일 퀘스트 <small>초기화까지 ${hm(rin.daily)}</small></h3>${q.daily.map(qrow).join("")}<div class="qb ${q.dailyBonus ? "done" : ""}">모두 달성 보너스 +${GP.DAILY_BONUS}P ${q.dailyBonus ? "✔" : ""}</div>
        <h3>주간 퀘스트 <small>초기화까지 ${hm(rin.weekly)}</small></h3>${q.weekly.map(qrow).join("")}<div class="qb ${q.weeklyBonus ? "done" : ""}">모두 달성 보너스 +${GP.WEEKLY_BONUS}P ${q.weeklyBonus ? "✔" : ""}</div>
        <h3>업적 (인게임 과제)</h3><div class="achs">${GP.ACH.map((a) => { const st = GP.achState(a), dv = a.div || 1; return `<div class="ach ${st.max ? "done" : ""}"><b>${a.name}</b><small>${st.max ? "모든 단계 달성" : `${Math.floor(st.v / dv)} / ${a.tiers[st.got] / dv}${a.unit} · 다음 +${a.pts[st.got]}P`}</small><span class="tiers">${a.tiers.map((_, n) => `<i class="${n < st.got ? "on" : ""}"></i>`).join("")}</span></div>`; }).join("")}</div>
        <p class="hint2">게임을 마치면 기본 보상과 별·승리 보상이 들어오고, 퀘스트와 업적은 달성하는 순간 자동으로 포인트가 지급됩니다.</p>`;
    }
    return `<div class="screen hangar">
      <div class="view"><button class="back" data-a="back">← 뒤로</button><div class="stg" data-stage><div class="tip">드래그해서 돌려 보기</div></div>${this._gsum()}</div>
      <div class="side">
        <div class="head"><h2>🛠 격납고</h2><span class="pts">◆ ${P(GP.points())}</span></div>
        ${this._gmsg ? `<div class="gmsg ${this._gmsg.bad ? "bad" : ""}">${esc(this._gmsg.t)}</div>` : ""}
        <div class="seg gtabs">${tabs.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-a="gtab" data-v="${k}">${l}</button>`).join("")}</div>
        ${body}
      </div></div>`;
  }
  _gnote(t, bad = false) { this._gmsg = { t, bad }; clearTimeout(this._gmt); this._gmt = setTimeout(() => { this._gmsg = null; if (this.screen === "hangar") this.redraw(); }, 2200); }
  _look() { save(); this.game.menu.setLook(settings.drone); this.redraw(); }
  a_gq() { this._gtab = "quest"; this.show("hangar"); }
  a_gtab(v) { this._gtab = v; if (v !== "parts") this._ptClear(); this.redraw(); this._syncStage(); }
  a_gskpv(v) { this._skPv = v; this.game.sound.play("click"); this.redraw(); this._syncStage(); }
  a_gskill(v) {
    const k = GP.SKILLS[v];
    if (!GP.skillOwns(v)) {
      if (!GP.skillBuy(v)) return (this._gnote(`포인트가 부족합니다 (${k.price.toLocaleString()}P 필요)`, true), this.redraw());
      this._gnote(`${k.name} 구매 · -${k.price.toLocaleString()}P`); this.game.sound.play("pickup");
    } else this.game.sound.play("confirm");
    GP.skillEquip(v); this._skPv = v;
    if (!this._gmsg) this._gnote(`스킬 「${k.name}」 장착`);
    this.redraw(); this._syncStage();
  }
  a_gbuy(v, el) {
    const kind = el.dataset.kind, key = el.dataset.key;
    if (!GP.owns(kind, v)) {
      const pr = GP.priceOf(kind, v);
      if (!GP.buy(kind, v)) return (this._gnote(`포인트가 부족합니다 (${pr.toLocaleString()}P 필요)`, true), this.redraw());
      this._gnote(`구매 완료 · -${pr.toLocaleString()}P`);
      this.game.sound.play("pickup");
    }
    if (kind === "preset") { const { name, ...colors } = COLOR_PRESETS[+v]; Object.assign(settings.drone, colors); }
    else if (kind === "paint") { /* 색 고르기 열림 */ }
    else settings.drone[key] = key === "props" ? +v : v;
    this._look();
  }
  a_gfx(v, el) {
    const slot = el.dataset.slot, it = GP.FX[slot].items[v];
    if (!GP.fxOwns(slot, v)) {
      if (!GP.fxBuy(slot, v)) return (this._gnote(`포인트가 부족합니다 (${it.price.toLocaleString()}P 필요)`, true), this.redraw());
      this._gnote(`구매 완료 · -${it.price.toLocaleString()}P`); this.game.sound.play("pickup");
    }
    GP.fxEquip(slot, v); this.redraw();
  }
  a_gtheme(v) {
    const t = GP.THEMES[v];
    if (!GP.themeOwns(v)) {
      if (!GP.themeBuy(v)) return (this._gnote(`포인트가 부족합니다 (${t.price.toLocaleString()}P 필요)`, true), this.redraw());
      this.game.sound.play("pickup");
    }
    GP.themeEquip(v); this._gnote(`테마 「${t.name}」 장착`); this._look();
  }
  // ── 격납고: 장착 요약(왼쪽 기체 아래) · 파츠 미리보기 ──
  // 요약: 종합 성능 막대(현재 → 미리보기) + 슬롯별 장착 부품·단계·주요 효과
  _gsum() {
    const pv = this._gtab === "parts" ? this._ppv : null, prev = this._barPrev || {};
    const bars = GP.RATINGS.map(([k, nm]) => { const o = prev[k] || { a: 33, b: 33 }; return `<div class="lb" data-r="${k}"><span>${nm}</span><div class="b2"><i class="cur" style="width:${Math.min(o.a, o.b)}%"></i><i class="dl" style="left:${Math.min(o.a, o.b)}%;width:${Math.abs(o.b - o.a)}%"></i><u></u></div><em></em></div>`; }).join("");
    const slots = GP.SLOTS.map((slot) => {
      const Pt = GP.PARTS[slot], c = GP.partOf(slot), isPv = pv && pv.slot === slot && pv.v !== c.v, v = isPv ? pv.v : c.v, lv = isPv ? GP.partLv(slot, v) : c.lv;
      const eff = Object.entries(GP.partEffect(slot, v, lv)).filter((e) => Math.abs(e[1]) > 1e-9).sort((a, b) => Math.abs(b[1] / (GP.STATS[b[0]].pct ? 1 : 20)) - Math.abs(a[1] / (GP.STATS[a[0]].pct ? 1 : 20))).slice(0, 2);
      return `<button class="ls ${this._gtab === "parts" && this._pslot === slot ? "on" : ""} ${isPv ? "pvw" : ""}" data-a="gslot" data-v="${slot}" title="${Pt.name}">
        <span class="ic">${Pt.icon}</span><span class="tx"><b>${isPv ? "미리보기 · " : ""}${Pt.variants[v].name}</b><small class="pips">${"●".repeat(lv)}${"○".repeat(5 - lv)}</small></span>
        <span class="fxc">${eff.map(([k, n]) => `<i class="${GP.statGood(k, n) ? "up" : "dn"}">${esc(GP.statText(k, n))}</i>`).join("") || `<i class="nt">기본 성능</i>`}</span></button>`;
    }).join("");
    requestAnimationFrame(() => this._gsumUpd());
    return `<div class="lsum"><div class="lbars">${bars}</div><div class="lslots">${slots}</div></div>`;
  }
  // 막대만 제자리에서 갱신 (너비가 바뀌며 움직인다). hover: 잠깐 올려 본 부품
  _gsumUpd(hover) {
    const box = this.root.querySelector(".lsum");
    if (!box) return;
    const pv = hover || (this._gtab === "parts" ? this._ppv : null);
    const R0 = GP.ratings(GP.loadout()), R1 = pv ? GP.ratings(GP.loadout(pv)) : R0, w = (x) => Math.round(Math.max(0, Math.min(1, (x - 0.5) / 1.3)) * 1000) / 10, pc = (x) => `${x >= 1 ? "+" : ""}${Math.round((x - 1) * 100)}%`;
    this._barPrev = {};
    for (const [k] of GP.RATINGS) {
      const el = box.querySelector(`[data-r="${k}"]`), a = w(R0[k]), b = w(R1[k]), d = Math.round((R1[k] - R0[k]) * 100);
      this._barPrev[k] = { a, b };
      if (!el) continue;
      el.querySelector(".cur").style.width = `${Math.min(a, b)}%`;
      const dl = el.querySelector(".dl"); dl.style.left = `${Math.min(a, b)}%`; dl.style.width = `${Math.abs(b - a)}%`;
      dl.className = `dl ${b >= a ? "up" : "dn"}`;
      el.querySelector("em").innerHTML = d ? `${pc(R0[k])} <b class="${d > 0 ? "up" : "dn"}">→ ${pc(R1[k])}</b>` : pc(R0[k]);
    }
  }
  // 미리보기 부품을 3D 기체에 반영 (같은 구성이면 다시 만들지 않는다)
  _ptModel(pv) {
    const key = pv ? `${pv.slot}.${pv.v}` : "";
    if (key === (this._ptKey || "")) return;
    this._ptKey = key;
    this.game.menu.setLook(settings.drone, GP.partLook(pv));
  }
  _ptClear() { this._ppv = null; if (this._ptKey) { this._ptKey = ""; this.game.menu.setLook(settings.drone); } }
  _ptHover(id) {
    if (this.screen !== "hangar" || this._gtab !== "parts") return;
    const [slot, v] = id ? id.split(".") : [];
    const pv = slot && GP.PARTS[slot] && GP.PARTS[slot].variants[v] ? { slot, v } : this._ppv;
    this._ptModel(pv); this._gsumUpd(pv);
  }
  a_gslot(v) { if (!GP.PARTS[v]) return; this._gtab = "parts"; this._pslot = v; this._ppv = null; this._ptModel(null); this.redraw(); this._syncStage(); }
  a_gpsel(v) {
    const [slot, k] = v.split(".");
    if (!GP.PARTS[slot] || !GP.PARTS[slot].variants[k]) return;
    this._ppv = GP.partOf(slot).v === k ? null : { slot, v: k };
    this._ptModel(this._ppv); this.redraw();
  }
  a_gpart(v) {
    const [slot, k] = v.split("."), V = GP.PARTS[slot] && GP.PARTS[slot].variants[k];
    if (!V) return;
    if (!GP.variantOwns(slot, k)) {
      if (!GP.variantBuy(slot, k)) return (this._gnote(`포인트가 부족합니다 (${V.price.toLocaleString()}P 필요)`, true), this.redraw());
      this._gnote(`${V.name} 구매 · -${V.price.toLocaleString()}P`); this.game.sound.play("pickup");
    } else this._gnote(`${GP.PARTS[slot].name}: 「${V.name}」 장착`);
    GP.variantEquip(slot, k); this._ppv = null; this._ptKey = "?"; this._ptModel(null); this.redraw();
  }
  a_gup(v) {
    const [slot, k] = v.split("."), V = GP.PARTS[slot] && GP.PARTS[slot].variants[k];
    if (!V) return;
    const lv = GP.partLv(slot, k), cost = GP.UP_COST[lv];
    if (!GP.upgrade(slot, k)) return (this._gnote(lv >= 5 ? "이미 최대 단계입니다" : `포인트가 부족합니다 (${cost.toLocaleString()}P 필요)`, true), this.redraw());
    const nl = lv + 1;
    this._gnote(`${V.name} Lv.${nl}${nl === 3 ? ` · 추가 효과: ${GP.effText(V.b3)}` : nl === 5 ? ` · 추가 효과: ${GP.effText(V.b5)}` : ""}`);
    this.game.sound.play("lap");
    const keep = this._ppv; this._ptKey = "?"; this._ptModel(keep); this.redraw();   // 단계가 오르면 기체 모습도 바뀐다
  }
  a_gskup(v) {
    const k = GP.SKILLS[v];
    if (!k) return;
    const lv = GP.skillLv(v), cost = GP.SKILL_UP_COST[lv - 1];
    if (!GP.skillUp(v)) return (this._gnote(lv >= GP.SKILL_MAX ? "이미 최대 레벨입니다" : `포인트가 부족합니다 (${(cost || 0).toLocaleString()}P 필요)`, true), this.redraw());
    const ms = GP.skillMilestone(v);
    this._gnote(`${k.name} Lv.${lv + 1}${lv + 1 === 3 ? ` · ${ms.m3}` : lv + 1 === 5 ? ` · ${ms.m5}` : ""}`);
    this.game.sound.play("lap"); this._skPv = v;
    this.redraw(); this._syncStage();
  }

  // ── 설정 ──
  s_settings() {
    const t = this.tab;
    const tabs = [["control", "조종"], ["camera", "시점"], ["hud", "HUD·효과"], ["input", "입력장치"], ["etc", "그래픽·사운드"]];
    let body = "";
    if (t === "control") {
      const sm = STICK_MODES[settings.stickMode];
      body = `
        <div class="opt"><label>처음 안내</label><button class="ghost" data-a="tutreplay">📘 안내 다시 보기</button>
          <div class="hint">메뉴·조작법·스토리 목표·격납고·퀘스트 안내와 첫 비행 코치를 처음부터 다시 봅니다.</div></div>
        <div class="opt"><label>스틱 모드</label>${this.seg("stickMode", [[1, "MODE 1"], [2, "MODE 2"], [3, "MODE 3"], [4, "MODE 4"]], settings.stickMode, "set")}
          <div class="hint">${sm.desc}. 키보드는 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> = 왼쪽 스틱, 방향키 = 오른쪽 스틱입니다.</div></div>
        <div class="opt"><label>비행 모드</label>${this.seg("flightMode", FLIGHT_MODES.map((m) => [m, FLIGHT_MODE_INFO[m].label]), settings.flightMode, "set")}
          <div class="hint"><b>${FLIGHT_MODE_INFO[settings.flightMode].ko}</b> — ${FLIGHT_MODE_INFO[settings.flightMode].desc}. 비행 중 <kbd>1</kbd>~<kbd>5</kbd> 또는 <kbd>M</kbd> 으로 전환.</div></div>
        ${this.toggle("hoverThrottle", "스로틀 중앙 = 호버", "켜면 스틱 중앙에서 제자리 비행 추력이 됩니다(키보드·게임패드용). 스로틀이 고정되는 실제 RC 조종기는 끄세요.")}
        ${this.toggle("invertPitch", "피치 반전")}
        <div class="opt"><label>자동 사격</label>${this.seg("autoFire", [["off", "끄기"], ["touch", "터치일 때만"], ["on", "항상"]], settings.autoFire, "set")}
          <div class="hint">조준선에 적이 걸리면 레이저를, 락온되면 미사일을 자동으로 쏩니다. 조종에만 집중할 수 있습니다.</div></div>
        ${this.toggle("crashAssist", "충돌 보정", "켜면 가벼운 접촉은 튕겨내고 계속 비행합니다. 끄면 실제처럼 쉽게 추락합니다.")}
        <h3>레이트 (ACRO 감도)</h3>
        <div class="opt"><label>프리셋</label>${this.seg("ratePreset", Object.entries(RATE_PRESETS).map(([k, v]) => [k, v.name]), settings.ratePreset, "rate")}</div>
        ${this.range("rates.rp.center", "롤·피치 중앙 감도", 30, 400, 10, "°/s")}
        ${this.range("rates.rp.max", "롤·피치 최대 각속도", 200, 1200, 10, "°/s")}
        ${this.range("rates.rp.expo", "롤·피치 엑스포", 0, 1, 0.05)}
        ${this.range("rates.yaw.center", "요 중앙 감도", 30, 400, 10, "°/s")}
        ${this.range("rates.yaw.max", "요 최대 각속도", 100, 1000, 10, "°/s")}
        ${this.range("rates.yaw.expo", "요 엑스포", 0, 1, 0.05)}
        <h3>자동 수평 모드</h3>
        ${this.range("angleLimit", "최대 기울기", 20, 75, 1, "°", "ANGLE·HORIZON·ALT HOLD 에서 스틱을 끝까지 밀었을 때의 기울기")}
        ${this.range("loiterSpeed", "LOITER 최대 속도", 4, 25, 1, "m/s")}`;
    } else if (t === "camera") {
      body = `
        <div class="opt"><label>기본 시점</label>${this.seg("camera", Object.entries(CAMERA_NAMES), settings.camera, "set")}
          <div class="hint">비행 중 <kbd>C</kbd> 키로 1인칭 ↔ 3인칭 ↔ 지상 시점을 바로 전환할 수 있습니다.</div></div>
        ${this.range("camTilt", "FPV 카메라 각도", 0, 60, 1, "°", "빠르게 전진할수록 각도를 높이면 앞이 잘 보입니다. 레이싱 30~45°, 촬영 10~20° 추천")}
        ${this.range("fov", "시야각 (FOV)", 60, 130, 1, "°")}
        <div class="opt"><label>계기 표시</label><button class="ghost" data-a="tab" data-v="hud">HUD 설정 열기 →</button></div>`;
    } else if (t === "hud") {
      const h = settings.hud;
      body = `
        <div class="opt"><label>표시 수준</label>${this.seg("hud.density", HUD_DENSITY.map((k) => [k, HUD_DENSITY_NAMES[k]]), h.density, "set")}
          <div class="hint"><b>전체</b>: 아래에서 켠 계기를 모두 표시 · <b>최소</b>: 시계·점수·조준선·목표 안내만 · <b>끄기</b>: 화면을 비움. 비행 중 <kbd>H</kbd> 키(터치: HUD 버튼)로 바로 전환됩니다.</div></div>
        <div class="opt"><label>한 번에 설정</label><div class="chips">${Object.entries(HUD_PRESETS).map(([k, v]) => `<button class="chip" data-a="hudpreset" data-v="${k}">${v.name}</button>`).join("")}</div></div>
        <h3>계기별 표시</h3>
        <div class="switches">${HUD_ITEMS.map(([k, label, hint]) => this.sw(`hud.${k}`, label, hint)).join("")}</div>
        <h3>모양</h3>
        ${this.pct("hud.scale", "HUD 크기", 0.8, 1.3, 0.05)}
        ${this.pct("hud.opacity", "HUD 불투명도", 0.3, 1, 0.05)}
        <h3>화면 효과</h3>
        ${this.pct("fx.shake", "화면 흔들림", 0, 1.5, 0.05, "충돌·피격·발사 때 화면이 흔들리는 세기. 0% 는 끄기")}
        ${this.pct("fx.flash", "색 번쩍임", 0, 1, 0.05, "피격·명중·부스트 때 화면 색 효과의 세기. 번쩍임에 민감하면 낮추세요")}
        ${this.toggle("fx.rumble", "진동", "게임패드·모바일 기기의 진동 (지원 기기만)")}
        ${this.toggle("fx.cockpit", "조종석 효과", "1인칭 시점에서 캐노피 틀(기동에 따라 쏠림)·유리 반사·속도선·G 포스 시야 흐림·피격 불티·폭발 열기·경고등을 보여 줍니다")}
        ${this.toggle("fx.reduceMotion", "움직임 줄이기", "격파 때의 순간 멈춤·슬로모션과 보스 등장 카메라 회전을 끄고, 화면 흔들림을 크게 줄입니다. 멀미가 나면 켜세요")}`;
    } else if (t === "input") {
      const inp = this.game.input, info = inp.padInfo, custom = settings.gamepad.layout === "custom";
      const ax = custom || !info ? settings.gamepad.axes : info.axes;
      const n = Math.max(4, inp.padAxes.length);
      const row = (k, label) => `<div class="opt"><label>${label}</label>
        <select data-set="gamepad.axes.${k}.i" ${custom ? "" : "disabled"}>${Array.from({ length: n }, (_, i) => `<option value="${i}" ${ax[k].i === i ? "selected" : ""}>축 ${i}</option>`).join("")}</select>
        <label style="min-width:0;font-weight:500"><input type="checkbox" data-set="gamepad.axes.${k}.inv" ${ax[k].inv ? "checked" : ""} ${custom ? "" : "disabled"}> 반전</label></div>`;
      const G = info ? info.glyphs : null;
      body = `
        <h3 style="margin-top:0">게임패드 / RC 조종기 (USB·블루투스)</h3>
        <div id="padlive" class="panel" style="padding:12px 14px"></div>
        <div class="opt"><label>축 배치</label>${this.seg("gamepad.layout", [["auto", "자동 (종류별)"], ["custom", "직접 지정"]], settings.gamepad.layout, "set")}
          <div class="hint">자동은 Xbox·PlayStation·Switch Pro·일반 게임패드·RC 조종기를 알아보고 맞는 배치를 씁니다. 축이 엉뚱하게 움직이면 ‘직접 지정’으로 바꿔 맞추세요.</div></div>
        <p class="muted" style="font-size:13px">${custom ? "스틱을 움직였을 때 반응하는 축 번호를 아래에 지정하세요. 위·오른쪽으로 밀었을 때 값이 +가 되도록 반전을 맞춥니다." : "지금 쓰는 배치입니다 (자동). 바꾸려면 위에서 ‘직접 지정’을 고르세요."}</p>
        ${row("lx", "왼쪽 스틱 가로")}${row("ly", "왼쪽 스틱 세로")}${row("rx", "오른쪽 스틱 가로")}${row("ry", "오른쪽 스틱 세로")}
        ${this.range("gamepad.deadzone", "데드존", 0, 0.3, 0.01)}
        ${G ? `<h3>버튼 (${esc(info.name)})</h3><table class="keys">
          <tr><td>${kb(G.fire)} ${kb(G.missile)}</td><td>레이저 · 미사일</td></tr>
          <tr><td>${kb(G.skill)}</td><td>스킬 발동 (게이지가 차면)</td></tr>
          <tr><td>${kb(G.dodge)}</td><td>고속 회피 (2회 충전 · 6초마다 1회 회복, 롤 방향으로 옆 이동 · 입력 없으면 앞으로)</td></tr>
          <tr><td>${kb(G.item)} ${kb(G.itemNext)}</td><td>아이템 사용 · 교체</td></tr>
          <tr><td>${kb(G.camera)} ${kb(G.modeNext)} ${kb(G.reset)}</td><td>시점 · 비행 모드 · 리셋</td></tr>
          <tr><td>${kb(G.pause)} ${kb(G.hud)}</td><td>일시정지 · HUD 표시 전환</td></tr>
          <tr><td>${info.type === "rc" ? "오른쪽 스틱" : "십자키 / 왼쪽 스틱"} · ${kb(G.ok)} ${kb(G.back)}</td><td>메뉴 이동 · 확인 · 뒤로</td></tr></table>` : ""}
        <h3>터치</h3>
        <div class="opt"><label>화면 가상 스틱</label>${this.seg("touchSticks", [["auto", "자동"], ["on", "항상"], ["off", "끄기"]], settings.touchSticks, "set")}</div>`;
    } else {
      body = `
        <div class="opt"><label>그래픽</label>${this.seg("quality", ["auto", "low", "med", "high"].map((k) => [k, QUALITY_NAMES[k]]), settings.quality, "set")}
          <div class="hint">해상도·그림자·후처리(외곽선·빛 번짐)·파티클 양·시야 거리가 바뀝니다. 맵 세부 묘사는 다음 비행부터 적용됩니다.
          <b>자동</b>은 화면이 끊기지 않도록 프레임 시간을 계속 재며 해상도부터 낮추고, 그래도 느리면 단계를 내립니다.${this._qnow()}</div></div>
        <h3>소리</h3>
        ${this.toggle("mute", "음소거", "모든 소리를 끕니다. 대화 장면 오른쪽 위 🔊 단추로도 바꿀 수 있습니다")}
        ${this.pct("musicVolume", "음악", 0, 1, 0.05, "메뉴·비행 곡과 대화 장면 분위기 곡")}
        ${this.pct("volume", "효과음", 0, 1, 0.05, "비행·전투·메뉴·장면 효과음")}
        ${this.pct("voiceVolume", "대사", 0, 1, 0.05, "대화를 넘기는 소리와 화자가 바뀔 때 나는 소리")}
        ${this._diff()}
        <div class="opt"><label>초기화</label><button class="ghost" data-a="reset">설정을 기본값으로</button></div>`;
    }
    return `<div class="screen dim"><div class="wrap">
      <div class="head"><button class="back" data-a="back">← 뒤로</button><h2>⚙ 설정</h2></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${t === k ? "on" : ""}" data-a="tab" data-v="${k}">${l}</button>`).join("")}</div>
      <div class="panel">${body}</div>
    </div></div>`;
  }
  _qnow() {
    const q = this.game.qinfo ? this.game.qinfo() : null;
    if (!q || settings.quality !== "auto") return "";
    return ` <span class="qnow">지금: ${QUALITY_NAMES[q.tier]} · 해상도 ${q.scale}%</span>`;
  }
  a_tab(v) { this.tab = v; this.show("settings"); }
  a_tutreplay() { this.tut.replay(); }
  a_flip(v, el) {
    const path = el.dataset.k;
    setPath(settings, path, !getPath(settings, path));
    save();
    this.redraw();
  }
  a_hudpreset(v) { applyHudPreset(v); this.redraw(); }
  a_hud() { this.tab = "hud"; this.show("settings"); }
  a_rate(v) {
    settings.ratePreset = v;
    settings.rates = structuredClone(RATE_PRESETS[v]);
    save(); this.redraw();
  }
  a_reset() { resetSettings(); this.game.sound.applyVolumes(); this.game.music.setVolume(); this.game.applyQuality(); this.redraw(); }

  // ── 조작법 ──
  s_help() {
    const m = STICK_MODES[settings.stickMode];
    const ch = { throttle: "스로틀(상승/하강)", yaw: "요(좌우 회전)", pitch: "피치(전진/후진)", roll: "롤(좌우 이동)" };
    return `<div class="screen dim"><div class="wrap">
      <div class="head"><button class="back" data-a="back">← 뒤로</button><h2>🎮 조작법</h2><button class="ghost" data-a="tutreplay" style="margin-left:auto">📘 안내 다시 보기</button></div>
      <div class="panel"><table class="keys">
        <tr><td><kbd>W</kbd> <kbd>S</kbd></td><td>왼쪽 스틱 세로 — <b>${ch[m.ly]}</b> <span class="muted">(MODE ${settings.stickMode})</span></td></tr>
        <tr><td><kbd>A</kbd> <kbd>D</kbd></td><td>왼쪽 스틱 가로 — <b>${ch[m.lx]}</b></td></tr>
        <tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>오른쪽 스틱 세로 — <b>${ch[m.ry]}</b></td></tr>
        <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>오른쪽 스틱 가로 — <b>${ch[m.rx]}</b></td></tr>
        <tr><td><kbd>Shift</kbd></td><td>누르는 동안 스틱을 절반만 (정밀 조종)</td></tr>
        <tr><td><kbd>1</kbd>~<kbd>5</kbd> / <kbd>M</kbd></td><td>비행 모드: ACRO · HORIZON · ANGLE · ALT HOLD · LOITER(GPS)</td></tr>
        <tr><td><kbd>C</kbd></td><td>시점 전환: 1인칭(FPV) → 3인칭(추적) → 지상 시점</td></tr>
        <tr><td><kbd>X</kbd></td><td>스킬 발동 (전투 · 게이지가 차면)</td></tr>
        <tr><td><kbd>V</kbd></td><td>고속 회피 (전투 · 2회 충전, 6초마다 1회 회복 · 잠깐 무적, 노리던 미사일 유도 끊기)</td></tr>
        <tr><td><kbd>R</kbd></td><td>마지막 체크포인트에서 다시 시작 / 뒤집힌 기체 세우기</td></tr>
        <tr><td><kbd>Space</kbd></td><td>레이저 발사 (전투 모드)</td></tr>
        <tr><td><kbd>F</kbd></td><td>미사일 발사 — 적을 조준선 근처에 두면 자동 락온</td></tr>
        <tr><td><kbd>E</kbd></td><td>보관 중인 아이템 사용 (실드·부스트·과충전·EMP)</td></tr>
        <tr><td><kbd>Q</kbd></td><td>쓸 아이템 바꾸기 (최대 2개 보관, 가득 차면 더 집을 수 없음)</td></tr>
        <tr><td><kbd>Tab</kbd></td><td>점수판 보기 (전투 모드)</td></tr>
        <tr><td><kbd>H</kbd></td><td>HUD 표시 수준 전환: 전체 → 최소 → 끄기 <span class="muted">(계기별 표시는 설정 &gt; HUD·효과)</span></td></tr>
        <tr><td><kbd>Esc</kbd> / <kbd>P</kbd></td><td>일시정지</td></tr>
      </table>
      <p class="muted" style="font-size:13px;line-height:1.6">
        ${this._padHelp()}<br>
        <b>RC 조종기</b>: USB 조이스틱 모드로 연결 → 설정 &gt; 입력장치에서 축을 지정하고, 스로틀이 고정식이면 “스로틀 중앙 = 호버”를 끄세요.<br>
        <b>모바일</b>: 화면 왼쪽/오른쪽을 누르면 가상 스틱이 나타납니다. 위쪽 HUD 버튼으로 계기 표시 수준을 바꿉니다.<br>
        <b>게이트 안내</b>: 레이싱에서는 다음 게이트까지 초록 화살표가 흐르고 게이트 위에 빛기둥이 섭니다. 게이트가 화면 밖이면 중앙의 큰 화살표가 방향과 거리를 알려 줍니다.<br>
        <b>처음이라면</b>: ANGLE 또는 LOITER 모드 + 3인칭 시점으로 시작해 보세요. 익숙해지면 ACRO + 1인칭이 가장 자유롭습니다.</p></div>
    </div></div>`;
  }

  // 조작법의 게임패드 줄: 연결된 패드 종류의 버튼 글자로 (없으면 Xbox 기준 + 다른 패드 안내)
  _padHelp() {
    const info = this.game.input.padInfo;
    const G = info ? info.glyphs : glyphsFor("xbox");
    const name = info ? info.name : "게임패드";
    if (info && info.type === "rc") return `<b>${name}</b>: 스틱은 실제 조종처럼 쓰고, 스위치 ${kb(G.fire)} 레이저 · ${kb(G.missile)} 미사일 · ${kb(G.skill)} 스킬 · ${kb(G.dodge)} 회피 · ${kb(G.reset)} 리셋 · ${kb(G.camera)} 시점. 메뉴는 오른쪽 스틱으로 이동, ${kb(G.ok)} 확인 · ${kb(G.back)} 뒤로.`;
    return `<b>${name}</b>: 스틱 2개 = 좌/우 스틱, ${kb(G.fire)} 레이저, ${kb(G.missile)} 미사일, ${kb(G.skill)} 스킬, ${kb(G.dodge)} 고속 회피, ${kb(G.item)} 아이템 사용, 십자키 좌·우 아이템 교체, ${kb(G.reset)} 리셋, ${kb(G.camera)} 시점, ${kb(G.modeNext)} 비행 모드, ${kb(G.pause)} 일시정지. 메뉴는 십자키·스틱으로 이동하고 ${kb(G.ok)} 확인 · ${kb(G.back)} 뒤로.${info ? "" : " PlayStation·Switch Pro 컨트롤러를 연결하면 그 버튼 글자로 바뀝니다."}`;
  }

  // ── 일시정지 ──
  s_pause() {
    const s = this.game.session;
    return `<div class="screen center"><div class="box">
      <h2>일시정지</h2><div class="sub">${esc(s ? s.mode.title : "")}</div>
      <div class="opt" style="justify-content:center">${this.seg("flightMode", FLIGHT_MODES.map((m) => [m, FLIGHT_MODE_INFO[m].label]), s ? s.player.flightMode : settings.flightMode, "pfm")}</div>
      <div class="opt" style="justify-content:center">${this.seg("camera", Object.entries(CAMERA_NAMES), s ? s.player.camMode : settings.camera, "pcam")}</div>
      <div class="opt" style="justify-content:center">${this.seg("stickMode", [[1, "MODE 1"], [2, "MODE 2"], [3, "MODE 3"], [4, "MODE 4"]], settings.stickMode, "set")}</div>
      <div class="opt" style="justify-content:center"><span class="lbl">HUD</span>${this.seg("hud.density", HUD_DENSITY.map((k) => [k, HUD_DENSITY_NAMES[k]]), settings.hud.density, "set")}</div>
      <div class="list">
        <button class="primary" data-a="resume">계속하기</button>
        ${s && s.mode.demoKey ? `<button data-a="replay">🎬 시범 다시 보기</button>` : ""}
        ${s && s.cfg.pvp ? "" : `<button data-a="restart">다시 시작</button>`}
        <button data-a="hud">HUD·효과 설정</button>
        <button data-a="go" data-v="settings">설정</button>
        <button data-a="go" data-v="help">조작법</button>
        <button data-a="quit">${s && s.cfg.pvp ? "경기 나가기" : "메인 메뉴로"}</button>
      </div>${s && s.cfg.net ? `<p class="muted" style="font-size:12px">온라인 경기는 멈추지 않습니다 — 기체는 제자리 비행 중</p>` : ""}</div></div>`;
  }
  a_pfm(v) { const s = this.game.session; if (s) s.player.setFlightMode(v); this.redraw(); }
  a_pcam(v) { const s = this.game.session; if (s) { s.player.camMode = v; s.player.camInit = false; } settings.camera = v; save(); this.redraw(); }
  a_resume() { this.game.resume(); }
  a_replay() { const m = this.game.session && this.game.session.mode; this.game.resume(); if (m && m.startDemo) m.startDemo(); }
  a_restart() { this.game.restart(); }
  a_quit() { this.game.quit(); }

  // ── 결과 ──
  s_result(r) {
    const stats = (r.lines || []).map((l) => `<div class="stat"><span>${esc(l.label)}</span><b>${esc(l.value)}</b></div>`).join("");
    const board = r.board ? `<table class="score"><tr><th>이름</th>${r.board.cols.map((c) => `<th>${c}</th>`).join("")}</tr>${r.board.rows.map((row) =>
      `<tr class="${row.me ? "me" : ""}"><td>${esc(row.name)}</td>${row.vals.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</table>` : "";
    return `<div class="screen center"><div class="box">
      ${r.record ? `<div class="rec">★ 최고 기록 갱신</div>` : ""}
      <h2>${esc(r.title)}</h2>
      ${r.sub ? `<div class="sub">${esc(r.sub)}</div>` : ""}
      ${r.stars !== undefined ? `<div class="bigstars">${starStr(r.stars)}</div>` : ""}
      ${stats}${board}
      ${r.story ? `<div class="sres ${r.story.passed ? "ok" : "no"}"><b>${r.story.passed ? (r.story.done ? "스토리 완결!" : r.story.bond ? `인연 · ${esc(r.story.bond.who)} 임무 성공` : "단계 통과") : "단계 실패"}</b><span>${r.story.obj ? `목표 ${r.story.obj.got}/${r.story.obj.res.length} 달성 (필요 ${r.story.obj.need})` : ""}</span></div>${r.story.obj ? `<ul class="objr">${r.story.obj.res.map((x) => `<li class="${x.ok ? "ok" : "no"}">${x.ok ? "✔" : "✖"} ${x.o.req ? "★ " : ""}${esc(x.o.text)}</li>`).join("")}</ul>` : ""}${r.story.after && !r.story.post ? `<p class="safter">${esc(r.story.after)}</p>` : ""}` : ""}
      ${r.reward ? `<div class="rew"><b>◆ +${r.reward.pts}P</b><span>${r.reward.lines.map((l) => `${esc(l.label)} ${esc(l.value)}`).join(" · ")}</span>${r.reward.notices.filter((n) => !/^\+\d+P$/.test(n.text)).map((n) => `<div class="rn">${esc(n.text)}</div>`).join("")}<small>보유 ${GP.points().toLocaleString()}P</small></div>` : ""}
      ${r.training ? `<div class="sres ${r.training.passed ? "ok" : "no"}"><b>${r.training.passed ? (r.training.done ? "전 과정 수료!" : "과목 통과") : "과목 실패"}</b><span>${esc(r.training.lesson.name)}</span></div>` : ""}
      ${r.pvp ? `<div class="list">${r.pvp.auto ? `<button class="primary" data-a="pvrequeue">다시 매칭</button>` : `<button class="primary" data-a="pvlobby">대기실로</button>`}<button data-a="pvexit">PVP 메뉴로</button></div>` : `<div class="list">
        ${r.training && r.training.next ? `<button class="primary" data-a="nextlesson" data-v="${r.training.next.id}">다음 과목: ${esc(r.training.next.name)} →</button>` : ""}
        ${r.story && r.story.post ? `<button class="primary" data-a="storypost" data-v="${r.story.stage.id}">이야기 계속 →</button>` : ""}
        ${r.story && r.story.next && !r.story.post ? `<button class="primary" data-a="nextstage" data-v="${r.story.next.id}">다음 단계: ${esc(r.story.next.title)} →</button>` : ""}
        <button class="${(r.story && (r.story.next || r.story.post)) || (r.training && r.training.next) ? "" : "primary"}" data-a="restart">${(r.story && !r.story.passed) || (r.training && !r.training.passed) ? "다시 도전" : "다시 하기"}</button>
        ${r.story ? `<button class="${r.story.choose && !r.story.post ? "primary" : ""}" data-a="tostory">${r.story.choose && !r.story.post ? "다음 장: 작전 선택 →" : r.story.bond ? "인연 목록으로" : "단계 목록으로"}</button>` : ""}
        ${r.training ? `<button data-a="totraining">과목 목록으로</button>` : ""}
        <button data-a="quit">메인 메뉴로</button>
      </div>`}</div></div>`;
  }
  a_nextlesson(v) {
    const l = TR.LESSONS.find((x) => x.id === v);
    if (!l) return;
    this.sel.course = l.course; this.sel.lesson = l.id; this._persist();
    this.game.startSession(TR.lessonConfig(l, (this.game.lastCfg || {}).map || this.sel.tmap));
  }
  a_totraining() {
    const cur = TR.LESSONS.find((x) => x.id === (this.game.lastCfg || {}).training), nx = cur && TR.LESSONS[cur.index + 1];
    const to = nx && TR.unlocked(nx) ? nx : cur;
    if (to) { this.sel.course = to.course; this.sel.lesson = to.id; }
    this.sel.mode = "training"; this._persist();
    this.game.quit(); this.show("setup");
  }
  a_nextstage(v) {
    const st = story().flat.find((x) => x.id === v);
    if (!st) return;
    this._storyGo(st);
  }
  // 스토리 단계 출격: 처음이면 출격 전 장면부터
  _storyGo(st, force = false) {
    this.sel.mode = "challenge"; this.sel.chapter = st.chapter.id; this.sel.route = st.route ? st.route.id : null; this.sel.stage = st.id; this._persist();
    const go = () => this.game.startSession(stageConfig(st, usesTeam(st) ? this.sel.team ?? st.o.team ?? 0 : 0));
    const pre = SY.preScene(st);
    if (pre && (force || !SY.sceneSeen(st))) {
      if (this.game.session) { this.game.session.dispose(); this.game.session = null; this.game.state = "menu"; }
      this.hide();
      this.vn.play(pre, { key: `${st.id}:pre`, title: st.title, sub: `CHAPTER ${st.chapter.no}${st.route ? st.route.id.toUpperCase() : ""}-${st.no} · ${st.chapter.title}`, me: st.chapter.hidden === 1 ? "EIA" : "나", onDone: () => { SY.markSeen(st); go(); } });
    } else go();
  }
  // 출격 전 장면 다시 보기 (출격하지 않음)
  a_scene() {
    const st = story().flat.find((x) => x.id === this.sel.stage), pre = st && SY.preScene(st);
    if (!pre) return;
    this.vn.play(pre, { key: `${st.id}:pre`, title: st.title, sub: `CHAPTER ${st.chapter.no} · 다시 보기`, me: st.chapter.hidden === 1 ? "EIA" : "나", onDone: () => { SY.markSeen(st); this.redraw(); } });
  }
  // 통과 후 장면 → (다음 단계가 이어지면) 그 단계의 출격 전 장면 → 출격
  a_storypost(v) {
    if (String(v).startsWith("b-")) return this._bondPost(v);   // 인연 임무
    const st = story().flat.find((x) => x.id === v), post = st && SY.postScene(st);
    if (!post) return;
    this.game.quit();
    this.hide();
    const finale = st.id === BD.FINALE;
    if (finale) { records.hsendnow = BD.endingOf(); save(); }   // 결말은 마지막 장면을 틀기 직전의 관계·선택으로 정한다
    this.vn.play(post, { key: `${st.id}:post`, title: st.title, sub: `CHAPTER ${st.chapter.no} · 임무 이후`, me: st.chapter.hidden === 1 ? "EIA" : "나", onDone: () => finale ? this._endCard(records.hsendnow, after) : after() });
    const after = () => {
      const nx = SY.nextOf(st) || SY.current();
      if (nx && nx.chapter.hidden && nx.chapter.hidden !== st.chapter.hidden) {   // 이야기 완결 → 다음 히든 스토리 해금 안내
        this.sel.mode = "challenge"; this.sel.chapter = nx.chapter.id; this.sel.route = null; this.sel.stage = nx.id; this._persist();
        const msg = nx.chapter.hidden === 2
          ? ["@bg black", "@sfx warn", "|에이아는 끝까지 혼자 알고 있었다.", "|별의 저편에서, 무엇이 오고 있는지.", "@shake", "@flash", "|— 히든 스토리 2 「별의 저편」이 열렸습니다 —"]
          : ["@bg black", "@sfx bigkill", "|휴마 연합의 이야기는 여기서 끝났다.", "|그러나 모든 것이 시작된 이야기는, 아직 아무도 모른다.", "@flash", "|— 히든 스토리 「에이아 연대기」가 열렸습니다 —"];
        return this.vn.play(msg, { title: nx.chapter.hidden === 2 ? "HIDDEN STORY 2" : "HIDDEN STORY", sub: "UNLOCKED", onDone: () => this.show("setup") });
      }
      if (nx && unlocked(nx) && !SY.cleared(nx)) return this._storyGo(nx);
      if (nx) { this.sel.chapter = nx.chapter.id; this.sel.route = nx.route ? nx.route.id : null; this.sel.stage = nx.id; }
      this.sel.mode = "challenge"; this._persist(); this.show("setup");
    };
  }
  a_tostory() {
    const bep = BD.epById((this.game.lastCfg || {}).bond || "");
    if (bep) { Object.assign(this.sel, { mode: "challenge", stab: "bond", bwho: bep.who, bep: bep.id }); this._persist(); this.game.quit(); return this.show("setup"); }
    this.sel.stab = "main";
    const cur = story().flat.find((x) => x.id === (this.game.lastCfg || {}).story), nx = (cur && SY.cleared(cur) && SY.current()) || cur;
    if (nx) { this.sel.chapter = nx.chapter.id; this.sel.route = nx.route ? nx.route.id : null; this.sel.stage = nx.id; }
    this.sel.mode = "challenge"; this._persist();
    this.game.quit(); this.show("setup");
  }
}

Object.assign(UI.prototype, PvpUI);   // PVP 메뉴 화면 (pvpui.js)
