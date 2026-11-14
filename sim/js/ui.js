// 메뉴 UI: 메인 · 모드 설정 · 정비소(외형) · 설정 · 조작법 · 일시정지 · 결과
import {
  settings, save, records, resetSettings, fmtTime, DRONE_CLASSES, RATE_PRESETS, FLIGHT_MODES, FLIGHT_MODE_INFO, STICK_MODES, DIFFICULTY,
  HUD_DENSITY, HUD_DENSITY_NAMES, HUD_ITEMS, HUD_PRESETS, applyHudPreset,
} from "./config.js";
import { MAPS, MAP_LIST } from "./maps/index.js";
import { FRAMES, CANOPIES, SKINS, LED_MODES, COLOR_PRESETS } from "./dronemodel.js";
import { VARIANTS } from "./modes/survival.js";
import { MISSIONS } from "./modes/challenge.js";
import * as TR from "./training.js";
import { story, progress, unlocked, stageStars, goalText, stageConfig, usesTeam, KIND } from "./story.js";
import { CAMERA_NAMES } from "./player.js";

const MODE_META = {
  training: { name: "비행훈련", en: "TRAINING", icon: "🎓", c: "#ffd24a", desc: "ACRO 모드를 이륙부터 곡예까지 과목별 과제로 익히는 훈련 과정",
    long: "스틱을 놓아도 수평으로 돌아오지 않는 ACRO(수동) 모드를 처음부터 배웁니다. 과목마다 주어진 과제를 순서대로 해내면 다음 과목이 열립니다.", tags: ["3개 과정 · 17개 과목", "과제별 요령 안내", "ACRO 전용"] },
  race: { name: "레이싱", en: "RACE", icon: "🏁", c: "#ff5a1f", desc: "게이트와 경로를 순서대로 통과하며 기록과 순위에 도전",
    long: "네온 게이트와 공중 링을 순서대로 통과하세요. 통과할 때마다 다음 게이트로 가는 길이 화면과 공중에 표시됩니다.", tags: ["코스 13개", "AI 라이벌 최대 5기", "랩·구간 기록"] },
  tracking: { name: "트래킹", en: "TRACK", icon: "🎥", c: "#21d4fd", desc: "차량·사람·드론 등 움직이는 피사체를 화면에 담아 따라가기",
    long: "달리는 차, 강을 내려가는 보트, 곡예 드론을 화면 가운데에 담아 끝까지 따라가면 촬영 점수가 오릅니다.", tags: ["피사체 17종", "프레이밍 점수", "시네 비행 연습"] },
  freestyle: { name: "프리스타일", en: "FREESTYLE", icon: "🌀", c: "#b44cff", desc: "플립·롤·다이브·갭 통과로 콤보를 이어 묘기 점수 획득",
    long: "파워 루프, 배럴 롤, 다이브, 다리 밑과 건물 틈 통과를 끊기지 않게 이어 콤보 배율을 올리세요.", tags: ["통과 지점 190곳+", "콤보 최대 ×5", "자유 비행"] },
  survival: { name: "서바이벌", en: "SURVIVAL", icon: "⚔️", c: "#ff3d5a", desc: "레이저·미사일·아이템으로 겨루는 점수제 전투",
    long: "레이저와 유도 미사일, 실드·부스터·EMP 아이템으로 AI 드론과 점수를 겨룹니다. 격추되면 5초 뒤 다시 출격합니다.", tags: ["데스매치·거점 공략전", "아이템 6종", "5초 재출격"] },
  challenge: { name: "스토리", en: "STORY", icon: "📖", c: "#3dd68c", desc: "신입 파일럿이 되어 챕터마다 단계를 하나씩 깨 나가는 이야기",
    long: "입단 시험부터 마지막 결전까지. 맵마다 이어지는 이야기를 따라 레이싱·촬영·호송·방어·보스전을 한 단계씩 깨 나가세요.", tags: ["단계별 잠금 해제", "윙맨 편대", "별 3개 평가"] },
};
// 비행훈련장으로 쓸 수 있는 맵 (출발 지점 앞이 넓게 비어 있는 곳)
const TR_MAPS = ["factory", "arena", "moon", "snow", "palace"].filter((id) => MAPS[id]);
const TRAILS = [["off", "끄기"], ["#ffffff", "흰색"], ["#ff5a1f", "주황"], ["#21d4fd", "하늘"], ["#ff2bd6", "분홍"], ["#3dff7c", "초록"]];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const starStr = (n, max = 3) => "★".repeat(n) + `<i>${"★".repeat(max - n)}</i>`;
const getPath = (o, p) => p.split(".").reduce((a, k) => a[k], o);
function setPath(o, p, v) { const ks = p.split("."); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }

export class UI {
  constructor(game) {
    this.game = game;
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
      if (fn) { this.game.sound.play("click"); fn.call(this, el.dataset.v, el); }
    });
    this.root.addEventListener("input", (e) => this._input(e.target));
    this.root.addEventListener("change", (e) => this._input(e.target, true));
    addEventListener("keydown", (e) => {
      // 비행 중 H: HUD 표시 수준 전환(전체 → 최소 → 끄기). 실제 전환은 HUD 가 입력 큐에서 꺼내 처리
      if (e.code === "KeyH" && !e.repeat && this.game.state === "play" && !(e.target instanceof HTMLInputElement)) { this.game.input.queue.push("hud"); return; }
      // 타이틀: 아무 키나 누르면 메뉴로
      if (this.screen === "title" && !["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(e.code)) { e.preventDefault(); this.a_enter(); return; }
      if (e.code === "Escape" && this.root.querySelector("[data-ovl]")) { this.a_ovclose(); return; }
      if (this.screen === "main" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        const ids = Object.keys(MODE_META), i = ids.indexOf(this.sel.mode), d = e.code === "ArrowUp" || e.code === "ArrowLeft" ? -1 : 1;
        this._picked = false; this.a_pick(ids[(i + d + ids.length) % ids.length]); this._picked = true;
        const on = this.root.querySelector(".mitem.on"); if (on) on.focus({ preventScroll: true });
        e.preventDefault(); return;
      }
      if (this.screen === "main" && e.code === "Enter" && !(e.target instanceof HTMLButtonElement)) { this.a_mode(this.sel.mode); return; }
      if (e.code !== "Escape" || !this.screen) return;
      if (["setup", "hangar", "settings", "help"].includes(this.screen)) this.a_back();
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
    if (name === "main") this.game.thumbs.want("mode", Object.keys(MODE_META));
    if (name === "setup") this.game.thumbs.want("map", MAP_LIST.map((mp) => mp.id));
  }

  // 3D 무대: 화면별 장면을 고르고, [data-stage] 영역 가운데에 오도록 맞춘다
  _syncStage() {
    const menu = this.game.menu;
    menu.setMode(this.screen === "main" || this.screen === "setup" ? this.sel.mode : this.screen === "title" ? "freestyle" : null);
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
        ? `<div class="muted" style="font-size:12px">연결됨: ${esc(name)}</div><div class="axes">${inp.padAxes.map((_, i) => `<div class="axis">축 ${i}<div class="b"><i data-ax="${i}"></i></div></div>`).join("")}</div>`
        : `<div class="muted">연결된 게임패드/조종기가 없습니다. USB 로 연결한 뒤 스틱을 움직여 보세요.</div>`;
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
    return `<div class="kick"><span>${m.en}</span>게임 모드</div><h1>${m.name}</h1><p>${m.long}</p>
      <ul class="tags">${m.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
      <button class="primary go" data-a="mode" data-v="${id}"${id === "training" ? ' style="color:var(--ink);text-shadow:none"' : ""}>모드 설정 <span aria-hidden="true">→</span></button>`;
  }

  // ── 타이틀 화면: 3D 장면을 배경으로 로고만. 누르면 메뉴로 ──
  s_title() {
    return `<div class="screen titlescreen" data-a="enter">
      <div class="tstage" data-stage></div>
      <div class="tbox">
        <div class="tkick">3D DRONE FLIGHT SIMULATOR</div>
        <div class="tlogo"><b>FPV</b> PROJECT</div>
        <p>레이싱 · 촬영 · 묘기 · 공중전 · 스토리 · 비행훈련</p>
      </div>
      <div class="press">화면을 눌러 시작</div>
      <div class="tfoot"><span>맵 ${MAP_LIST.length}종</span><span>키보드 · 게임패드 · 터치</span><span>MODE ${settings.stickMode}</span></div>
    </div>`;
  }
  a_enter() { if (this.screen === "title") this.show("main"); }

  // ── 난이도 선택 오버레이 (설정 화면 위에 겹쳐 뜬다) ──
  _openDiff(andStart) {
    this._ovStart = !!andStart;
    const cur = settings.difficulty, info = {
      easy: { icon: "🟢", lines: ["AI 드론이 느리고 조준이 서툽니다", "받는 피해 60%", "처음 하는 분께 추천"] },
      normal: { icon: "🟡", lines: ["균형 잡힌 기본 난이도", "받는 피해 100%", "AI 가 적당히 따라붙습니다"] },
      hard: { icon: "🔴", lines: ["AI 가 빠르고 정확합니다", "받는 피해 130%", "숙련자용 · 정예 기체 등장"] },
    };
    const cards = Object.entries(DIFFICULTY).map(([k, v]) => `<button class="dcard ${k === cur ? "sel" : ""} d-${k}" data-a="diffpick" data-v="${k}">
        <span class="di">${info[k].icon}</span><b>${v.name}</b><ul>${info[k].lines.map((l) => `<li>${l}</li>`).join("")}</ul>
        <span class="dgo">${this._ovStart ? "이 난이도로 출격 →" : k === cur ? "선택됨" : "선택"}</span></button>`).join("");
    this.root.querySelector("[data-ovl]")?.remove();
    this.root.insertAdjacentHTML("beforeend", `<div class="ovl" data-ovl><div class="ovbox">
      <div class="ovh"><span class="en">DIFFICULTY</span><h2>난이도 선택</h2></div>
      <div class="dgrid">${cards}</div>
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

  s_main() {
    const cur = MODE_META[this.sel.mode] ? this.sel.mode : "race";
    const items = Object.entries(MODE_META).map(([id, m]) => `
      <button class="mitem ${id === cur ? "on" : ""}" style="--c:${m.c}" data-a="pick" data-v="${id}" aria-pressed="${id === cur}">
        ${this._thumb("mode", id)}<span class="mtxt"><b>${m.name}</b><small>${m.desc}</small></span><span class="chev" aria-hidden="true">›</span>
      </button>`).join("");
    const d = settings.drone;
    return `<div class="screen home" style="--c:${MODE_META[cur].c}">
      <div class="lcol">
        <div class="brand"><div class="logo"><b>FPV</b> PROJECT</div><p>3D 드론 비행 시뮬레이터</p></div>
        <nav class="mlist" aria-label="게임 모드">${items}</nav>
        <div class="dock">
          <button class="dk" data-a="go" data-v="hangar"><i aria-hidden="true">🛠</i><span><b>정비소</b><small>${esc(DRONE_CLASSES[d.cls].name)}</small></span></button>
          <button class="dk" data-a="go" data-v="settings"><i aria-hidden="true">⚙</i><span><b>설정</b><small>MODE ${settings.stickMode} · ${FLIGHT_MODE_INFO[settings.flightMode].label}</small></span></button>
          <button class="dk" data-a="go" data-v="help"><i aria-hidden="true">🎮</i><span><b>조작법</b><small>키보드·패드·터치</small></span></button>
        </div>
      </div>
      <div class="rcol"><div class="stage" data-stage></div><section class="cap">${this._cap(cur)}</section></div>
    </div>`;
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
  a_back() { if (this.game.state === "pause") this.show("pause"); else this.show("main"); }

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

  // 스토리: ① 챕터 ② 단계 ③ 브리핑·편대
  s_story() {
    const s = this.sel, m = MODE_META.challenge, { chapters, flat } = story(), prog = progress();
    let ch = chapters.find((c) => c.id === s.chapter);
    if (!ch) ch = (flat[Math.min(prog, flat.length - 1)] || flat[0]).chapter;
    s.chapter = ch.id;
    let st = ch.stages.find((x) => x.id === s.stage);
    if (!st) st = ch.stages.find((x) => x.index === prog) || [...ch.stages].reverse().find((x) => unlocked(x)) || ch.stages[0];
    s.stage = st.id;
    const chCards = chapters.map((c) => {
      const done = c.stages.filter((x) => x.index < prog).length, open = unlocked(c.stages[0]);
      return `<button class="card mapcard ${c.id === ch.id ? "sel" : ""} ${open ? "" : "locked"}" data-a="sel" data-k="chapter" data-v="${c.id}">
        ${this._thumb("map", c.map)}<div class="tag">${open ? `${done}/${c.stages.length}` : "🔒"}</div>
        <div class="nm"><small>CHAPTER ${c.no}</small>${c.title}</div><div class="ds">${MAPS[c.map].name}</div></button>`;
    }).join("");
    const stCards = ch.stages.map((x) => {
      const open = unlocked(x), cleared = x.index < prog;
      return `<button class="card stage ${x.id === st.id ? "sel" : ""} ${open ? "" : "locked"} ${cleared ? "cleared" : ""}" data-a="sel" data-k="stage" data-v="${x.id}">
        <span class="sno">${open ? x.no : "🔒"}</span><span class="stx"><b>${x.title}</b><small>${KIND[x.kind]} · ${goalText(x)}</small></span>
        <span class="stars">${cleared ? starStr(stageStars(x)) : open ? "도전" : ""}</span></button>`;
    }).join("");
    const open = unlocked(st);
    if (!usesTeam(st)) s.team = s.team || 0;
    let brief = `<div class="brief"><div class="bk">${KIND[st.kind]} · CHAPTER ${ch.no}-${st.no}</div><p>${esc(st.brief)}</p><div class="goal">목표 <b>${goalText(st)}</b></div></div>`;
    if (!open) brief += `<p class="hint2">앞 단계를 먼저 깨야 열립니다.</p>`;
    if (usesTeam(st)) brief += `<div class="opt"><label>편대</label>${this.seg("team", [[0, "혼자"], [1, "2기 편대"], [3, "4기 편대"]], s.team ?? st.o.team ?? 0)}<div class="hint">윙맨이 늘면 적도 늘어납니다. 권장: ${[0, 1, 3].includes(st.o.team) ? ["혼자", "2기 편대", "", "4기 편대"][st.o.team] : "혼자"}</div></div>`;
    brief += `<div class="opt"><label>비행 모드</label>${this.seg("flightMode", FLIGHT_MODES.map((k) => [k, FLIGHT_MODE_INFO[k].label]), settings.flightMode, "set")}</div>`;
    brief += `<div class="opt"><label>시점</label>${this.seg("camera", Object.entries(CAMERA_NAMES), settings.camera, "set")}</div>`;
    const body = `<p class="hint2 intro">${esc(ch.intro)}</p>`
      + this._step(1, "챕터 선택", `${ch.no}. ${ch.title}`, `<div class="grid maps">${chCards}</div>`)
      + this._step(2, "단계 선택", `${ch.no}-${st.no} ${st.title}`, `<div class="stages">${stCards}</div>`)
      + this._step(3, "브리핑", "", brief);
    return `<div class="screen split" style="--c:${m.c}">
      <div class="pane" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${m.en}</span>${m.name}</h2><span class="prog">${prog}/${flat.length} 단계</span></div>
        ${body}
        <div class="startbar"><span class="sum">${esc(MAPS[ch.map].name)} · ${ch.no}-${st.no} ${esc(st.title)}</span>
          <button class="primary" data-a="start" ${open ? "" : "disabled"}>${open ? "출격" : "잠김"} <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="rcol"><div class="stage" data-stage></div></div>
    </div>`;
  }

  // 비행훈련: ① 과정 ② 과목 ③ 브리핑·과제
  s_training() {
    const s = this.sel, m = MODE_META.training, prog = TR.progress(), all = TR.LESSONS;
    let cur = all.find((l) => l.id === s.lesson);
    if (cur && s.course && cur.course !== s.course) cur = null;
    const co = TR.COURSES.find((c) => c.id === (cur ? cur.course : s.course)) || TR.COURSES.find((c) => c.id === all[Math.min(prog, all.length - 1)].course);
    const list = TR.lessonsOf(co.id);
    if (!cur) cur = list.find((l) => l.index === prog) || [...list].reverse().find((l) => TR.unlocked(l)) || list[0];
    s.course = co.id; s.lesson = cur.id;
    if (!TR_MAPS.includes(s.tmap)) s.tmap = TR_MAPS[0];
    const coCards = TR.COURSES.map((c, i) => {
      const ls = TR.lessonsOf(c.id), done = ls.filter((l) => l.index < prog).length, open = TR.unlocked(ls[0]);
      return `<button class="card ${c.id === co.id ? "sel" : ""} ${open ? "" : "locked"}" data-a="sel" data-k="course" data-v="${c.id}">
        <div class="ic">${["🛫", "🧭", "🌀"][i]}</div><div class="tag">${open ? `${done}/${ls.length}` : "🔒"}</div>
        <div class="nm"><small>${c.en}</small>${c.name}</div><div class="ds">${c.desc}</div></button>`;
    }).join("");
    const lCards = list.map((l) => {
      const open = TR.unlocked(l), cleared = l.index < prog;
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
    brief += `<p class="hint2">훈련은 ACRO 모드로만 진행합니다. 추락하면 출발 지점에서 다시 시작하고, 하던 과제부터 이어집니다.</p>`;
    const body = this._step(1, "과정 선택", co.name, `<div class="grid c3">${coCards}</div>`)
      + this._step(2, "과목 선택", `${cur.no}. ${cur.name}`, `<div class="stages">${lCards}</div>`)
      + this._step(3, "브리핑", "", brief);
    return `<div class="screen split tr" style="--c:${m.c}">
      <div class="pane" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${m.en}</span>${m.name}</h2><span class="prog">${prog}/${all.length} 과목</span></div>
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
    if (k === "chapter") this.sel.stage = null;
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
    else if (s.mode === "survival") Object.assign(cfg, { variant: s.variant, bots: s.bots, time: s.time });
    else if (s.mode === "training") {
      const l = TR.LESSONS.find((x) => x.id === s.lesson);
      if (!l || !TR.unlocked(l)) return;
      return this.game.startSession(TR.lessonConfig(l, s.tmap));
    }
    else if (s.mode === "challenge") {
      const st = story().flat.find((x) => x.id === s.stage);
      if (!st || !unlocked(st)) return;
      return this.game.startSession(stageConfig(st, usesTeam(st) ? s.team ?? st.o.team ?? 0 : 0));
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
    if (path === "volume") g.sound.setVolume(settings.volume);
    if (path === "musicVolume") g.music.setVolume();
    if (path === "quality") { settings.qualityAuto = false; save(); g.applyQuality(); }
  }

  // ── 정비소 ──
  s_hangar() {
    const d = settings.drone, cls = DRONE_CLASSES[d.cls];
    const chips = (key, obj, cur) => `<div class="chips">${Object.entries(obj).map(([k, v]) =>
      `<button class="chip ${String(cur) === k ? "on" : ""}" data-a="set" data-k="drone.${key}" data-v="${k}">${typeof v === "string" ? v : v.name}</button>`).join("")}</div>`;
    const bar = (v) => `<div class="b"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div>`;
    const color = (key, label) => `<div class="opt"><label>${label}</label><input type="color" value="${d[key]}" data-set="drone.${key}"></div>`;
    return `<div class="screen hangar">
      <div class="view" data-stage><button class="back" data-a="back">← 뒤로</button><div class="tip">드래그해서 돌려 보기</div></div>
      <div class="side">
        <div class="head"><h2>🛠 정비소</h2></div>
        <h3 style="margin-top:0">기체 등급 (성능)</h3>
        <div class="grid">${Object.entries(DRONE_CLASSES).map(([k, c]) =>
          `<button class="card ${d.cls === k ? "sel" : ""}" data-a="set" data-k="drone.cls" data-v="${k}"><div class="nm">${c.name}</div><div class="ds">${c.desc}</div></button>`).join("")}</div>
        <div class="spec">
          <span>추력</span>${bar(cls.twr / 8)}<span>최고 속도</span>${bar(cls.pitchSpeed / 62)}
          <span>민첩성</span>${bar(0.028 / cls.rateTau)}<span>안정감</span>${bar(cls.cdaT / 0.045 * 0.6 + cls.rateTau / 0.05 * 0.4)}
        </div>
        <h3>프레임</h3>${chips("frame", FRAMES, d.frame)}
        <h3>캐노피</h3>${chips("canopy", CANOPIES, d.canopy)}
        <h3>프로펠러</h3>${chips("props", { 2: "2엽", 3: "3엽" }, d.props)}
        <h3>스킨</h3>${chips("skin", SKINS, d.skin)}
        <h3>색상</h3>
        <div class="swatches">${COLOR_PRESETS.map((p, i) => `<button class="swatch" data-a="preset" data-v="${i}"><i style="background:${p.accentColor}"></i><i style="background:${p.propColor}"></i>${p.name}</button>`).join("")}</div>
        ${color("frameColor", "프레임")}${color("accentColor", "포인트")}${color("propColor", "프로펠러")}${color("ledColor", "LED")}
        <h3>LED</h3>${chips("ledMode", LED_MODES, d.ledMode)}
        <h3>연기 꼬리</h3><div class="chips">${TRAILS.map(([v, l]) => `<button class="chip ${d.trail === v ? "on" : ""}" data-a="set" data-k="drone.trail" data-v="${v}">${l}</button>`).join("")}</div>
      </div></div>`;
  }
  a_preset(v) {
    const { name, ...colors } = COLOR_PRESETS[+v];
    Object.assign(settings.drone, colors);
    save();
    this.game.menu.setLook(settings.drone);
    this.redraw();
  }

  // ── 설정 ──
  s_settings() {
    const t = this.tab;
    const tabs = [["control", "조종"], ["camera", "시점"], ["hud", "HUD·효과"], ["input", "입력장치"], ["etc", "그래픽·사운드"]];
    let body = "";
    if (t === "control") {
      const sm = STICK_MODES[settings.stickMode];
      body = `
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
        ${this.toggle("fx.rumble", "진동", "게임패드·모바일 기기의 진동 (지원 기기만)")}`;
    } else if (t === "input") {
      const ax = settings.gamepad.axes;
      const n = Math.max(4, this.game.input.padAxes.length);
      const row = (k, label) => `<div class="opt"><label>${label}</label>
        <select data-set="gamepad.axes.${k}.i">${Array.from({ length: n }, (_, i) => `<option value="${i}" ${ax[k].i === i ? "selected" : ""}>축 ${i}</option>`).join("")}</select>
        <label style="min-width:0;font-weight:500"><input type="checkbox" data-set="gamepad.axes.${k}.inv" ${ax[k].inv ? "checked" : ""}> 반전</label></div>`;
      body = `
        <h3 style="margin-top:0">게임패드 / RC 조종기 (USB)</h3>
        <div id="padlive" class="panel" style="padding:12px 14px"></div>
        <p class="muted" style="font-size:13px">스틱을 움직였을 때 반응하는 축 번호를 아래에 지정하세요. 위·오른쪽으로 밀었을 때 값이 +가 되도록 반전을 맞춥니다.</p>
        ${row("lx", "왼쪽 스틱 가로")}${row("ly", "왼쪽 스틱 세로")}${row("rx", "오른쪽 스틱 가로")}${row("ry", "오른쪽 스틱 세로")}
        ${this.range("gamepad.deadzone", "데드존", 0, 0.3, 0.01)}
        <h3>터치</h3>
        <div class="opt"><label>화면 가상 스틱</label>${this.seg("touchSticks", [["auto", "자동"], ["on", "항상"], ["off", "끄기"]], settings.touchSticks, "set")}</div>`;
    } else {
      body = `
        <div class="opt"><label>그래픽 품질</label>${this.seg("quality", [["low", "낮음"], ["med", "보통"], ["high", "높음"]], settings.quality, "set")}
          <div class="hint">그림자·외곽선·해상도가 바뀝니다. 다음 비행부터 완전히 적용됩니다. 직접 고르기 전에는 기기 성능에 맞춰 자동으로 낮아집니다.</div></div>
        ${this.range("volume", "효과음 음량", 0, 1, 0.05)}
        ${this.range("musicVolume", "배경 음악 음량", 0, 1, 0.05)}
        ${this._diff()}
        <div class="opt"><label>초기화</label><button class="ghost" data-a="reset">설정을 기본값으로</button></div>`;
    }
    return `<div class="screen dim"><div class="wrap">
      <div class="head"><button class="back" data-a="back">← 뒤로</button><h2>⚙ 설정</h2></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${t === k ? "on" : ""}" data-a="tab" data-v="${k}">${l}</button>`).join("")}</div>
      <div class="panel">${body}</div>
    </div></div>`;
  }
  a_tab(v) { this.tab = v; this.show("settings"); }
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
  a_reset() { resetSettings(); this.game.sound.setVolume(settings.volume); this.game.music.setVolume(); this.game.applyQuality(); this.redraw(); }

  // ── 조작법 ──
  s_help() {
    const m = STICK_MODES[settings.stickMode];
    const ch = { throttle: "스로틀(상승/하강)", yaw: "요(좌우 회전)", pitch: "피치(전진/후진)", roll: "롤(좌우 이동)" };
    return `<div class="screen dim"><div class="wrap">
      <div class="head"><button class="back" data-a="back">← 뒤로</button><h2>🎮 조작법</h2></div>
      <div class="panel"><table class="keys">
        <tr><td><kbd>W</kbd> <kbd>S</kbd></td><td>왼쪽 스틱 세로 — <b>${ch[m.ly]}</b> <span class="muted">(MODE ${settings.stickMode})</span></td></tr>
        <tr><td><kbd>A</kbd> <kbd>D</kbd></td><td>왼쪽 스틱 가로 — <b>${ch[m.lx]}</b></td></tr>
        <tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>오른쪽 스틱 세로 — <b>${ch[m.ry]}</b></td></tr>
        <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>오른쪽 스틱 가로 — <b>${ch[m.rx]}</b></td></tr>
        <tr><td><kbd>Shift</kbd></td><td>누르는 동안 스틱을 절반만 (정밀 조종)</td></tr>
        <tr><td><kbd>1</kbd>~<kbd>5</kbd> / <kbd>M</kbd></td><td>비행 모드: ACRO · HORIZON · ANGLE · ALT HOLD · LOITER(GPS)</td></tr>
        <tr><td><kbd>C</kbd></td><td>시점 전환: 1인칭(FPV) → 3인칭(추적) → 지상 시점</td></tr>
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
        <b>게임패드</b>: 스틱 2개 = 좌/우 스틱, RB/RT 레이저, LB/LT 미사일, A 아이템 사용, 십자키 좌·우 아이템 교체, B 리셋, X 시점, Y 비행 모드, Start 일시정지.<br>
        <b>RC 조종기</b>: USB 조이스틱 모드로 연결 → 설정 &gt; 입력장치에서 축을 지정하고, 스로틀이 고정식이면 “스로틀 중앙 = 호버”를 끄세요.<br>
        <b>모바일</b>: 화면 왼쪽/오른쪽을 누르면 가상 스틱이 나타납니다. 위쪽 HUD 버튼으로 계기 표시 수준을 바꿉니다.<br>
        <b>게이트 안내</b>: 레이싱에서는 다음 게이트까지 초록 화살표가 흐르고 게이트 위에 빛기둥이 섭니다. 게이트가 화면 밖이면 중앙의 큰 화살표가 방향과 거리를 알려 줍니다.<br>
        <b>처음이라면</b>: ANGLE 또는 LOITER 모드 + 3인칭 시점으로 시작해 보세요. 익숙해지면 ACRO + 1인칭이 가장 자유롭습니다.</p></div>
    </div></div>`;
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
        <button data-a="restart">다시 시작</button>
        <button data-a="hud">HUD·효과 설정</button>
        <button data-a="go" data-v="settings">설정</button>
        <button data-a="go" data-v="help">조작법</button>
        <button data-a="quit">메인 메뉴로</button>
      </div></div></div>`;
  }
  a_pfm(v) { const s = this.game.session; if (s) s.player.setFlightMode(v); this.redraw(); }
  a_pcam(v) { const s = this.game.session; if (s) { s.player.camMode = v; s.player.camInit = false; } settings.camera = v; save(); this.redraw(); }
  a_resume() { this.game.resume(); }
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
      ${r.story ? `<div class="sres ${r.story.passed ? "ok" : "no"}"><b>${r.story.passed ? (r.story.done ? "스토리 완결!" : "단계 통과") : "단계 실패"}</b><span>목표: ${esc(r.story.goal)}</span></div>` : ""}
      ${r.training ? `<div class="sres ${r.training.passed ? "ok" : "no"}"><b>${r.training.passed ? (r.training.done ? "전 과정 수료!" : "과목 통과") : "과목 실패"}</b><span>${esc(r.training.lesson.name)}</span></div>` : ""}
      <div class="list">
        ${r.training && r.training.next ? `<button class="primary" data-a="nextlesson" data-v="${r.training.next.id}">다음 과목: ${esc(r.training.next.name)} →</button>` : ""}
        ${r.story && r.story.next ? `<button class="primary" data-a="nextstage" data-v="${r.story.next.id}">다음 단계: ${esc(r.story.next.title)} →</button>` : ""}
        <button class="${(r.story && r.story.next) || (r.training && r.training.next) ? "" : "primary"}" data-a="restart">${(r.story && !r.story.passed) || (r.training && !r.training.passed) ? "다시 도전" : "다시 하기"}</button>
        ${r.story ? `<button data-a="tostory">단계 목록으로</button>` : ""}
        ${r.training ? `<button data-a="totraining">과목 목록으로</button>` : ""}
        <button data-a="quit">메인 메뉴로</button>
      </div></div></div>`;
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
    this.sel.chapter = st.chapter.id; this.sel.stage = st.id; this._persist();
    this.game.startSession(stageConfig(st, usesTeam(st) ? this.sel.team ?? st.o.team ?? 0 : 0));
  }
  a_tostory() {
    const cur = story().flat.find((x) => x.id === (this.game.lastCfg || {}).story), nx = cur && story().flat[cur.index + 1];
    const to = nx && unlocked(nx) ? nx : cur;
    if (to) { this.sel.chapter = to.chapter.id; this.sel.stage = to.id; }
    this.sel.mode = "challenge"; this._persist();
    this.game.quit(); this.show("setup");
  }
}
