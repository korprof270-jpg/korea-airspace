// 메뉴 UI: 메인 · 모드 설정 · 정비소(외형) · 설정 · 조작법 · 일시정지 · 결과
import {
  settings, save, records, resetSettings, fmtTime, DRONE_CLASSES, RATE_PRESETS, FLIGHT_MODES, FLIGHT_MODE_INFO, STICK_MODES, DIFFICULTY,
  HUD_DENSITY, HUD_DENSITY_NAMES, HUD_ITEMS, HUD_PRESETS, applyHudPreset,
} from "./config.js";
import { MAPS, MAP_LIST } from "./maps/index.js";
import { FRAMES, CANOPIES, SKINS, LED_MODES, COLOR_PRESETS } from "./dronemodel.js";
import { VARIANTS } from "./modes/survival.js";
import { MISSIONS } from "./modes/challenge.js";
import { CAMERA_NAMES } from "./player.js";

const MODE_META = {
  race: { name: "레이싱", en: "RACE", icon: "🏁", c: "#ff5a1f", desc: "게이트와 경로를 순서대로 통과하며 기록과 순위에 도전",
    long: "네온 게이트와 공중 링을 순서대로 통과하세요. 통과할 때마다 다음 게이트로 가는 길이 화면과 공중에 표시됩니다.", tags: ["코스 13개", "AI 라이벌 최대 5기", "랩·구간 기록"] },
  tracking: { name: "트래킹", en: "TRACK", icon: "🎥", c: "#21d4fd", desc: "차량·사람·드론 등 움직이는 피사체를 화면에 담아 따라가기",
    long: "달리는 차, 강을 내려가는 보트, 곡예 드론을 화면 가운데에 담아 끝까지 따라가면 촬영 점수가 오릅니다.", tags: ["피사체 17종", "프레이밍 점수", "시네 비행 연습"] },
  freestyle: { name: "프리스타일", en: "FREESTYLE", icon: "🌀", c: "#b44cff", desc: "플립·롤·다이브·갭 통과로 콤보를 이어 묘기 점수 획득",
    long: "파워 루프, 배럴 롤, 다이브, 다리 밑과 건물 틈 통과를 끊기지 않게 이어 콤보 배율을 올리세요.", tags: ["통과 지점 190곳+", "콤보 최대 ×5", "자유 비행"] },
  survival: { name: "서바이벌", en: "SURVIVAL", icon: "⚔️", c: "#ff3d5a", desc: "레이저·미사일·아이템으로 겨루는 점수제 전투",
    long: "레이저와 유도 미사일, 실드·부스터·EMP 아이템으로 AI 드론과 점수를 겨룹니다. 격추되면 5초 뒤 다시 출격합니다.", tags: ["데스매치·거점전·운반전", "아이템 6종", "5초 재출격"] },
  challenge: { name: "챌린지", en: "MISSION", icon: "🎯", c: "#3dd68c", desc: "혼자 또는 편대를 이뤄 AI 적을 상대로 임무 수행",
    long: "기지 방어, 포탑 소탕, 호송, 긴급 보급, 모선 격추. 혼자 또는 AI 윙맨과 편대를 이뤄 임무를 완수하세요.", tags: ["임무 5종", "윙맨 최대 3기", "별 3개 평가"] },
};
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
    menu.setMode(this.screen === "main" || this.screen === "setup" ? this.sel.mode : null);
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
      <button class="primary go" data-a="mode" data-v="${id}">모드 설정 <span aria-hidden="true">→</span></button>`;
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
        <div class="brand"><div class="logo">하늘길 <b>FPV</b></div><p>3D 드론 비행 시뮬레이터</p></div>
        <nav class="mlist" aria-label="게임 모드">${items}</nav>
        <div class="dock">
          <button class="dk" data-a="go" data-v="hangar"><i aria-hidden="true">🛠</i><span><b>정비소</b><small>${esc(DRONE_CLASSES[d.cls].name)}</small></span></button>
          <button class="dk" data-a="go" data-v="settings"><i aria-hidden="true">⚙</i><span><b>설정</b><small>MODE ${settings.stickMode} · ${FLIGHT_MODE_INFO[settings.flightMode].label}</small></span></button>
          <button class="dk" data-a="go" data-v="help"><i aria-hidden="true">🎮</i><span><b>조작법</b><small>키보드·패드·터치</small></span></button>
          <a class="dk" href="../index.html"><i aria-hidden="true">🗺</i><span><b>공역 지도</b><small>비행 가능 구역</small></span></a>
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
  s_setup() {
    const s = this.sel, m = MODE_META[s.mode];
    let body = "";
    const mapCards = (filter = () => true) => `<h3>맵</h3><div class="grid">${MAP_LIST.filter(filter).map((mp) =>
      `<button class="card mapcard ${s.map === mp.id ? "sel" : ""}" data-a="sel" data-k="map" data-v="${mp.id}">${this._thumb("map", mp.id)}<div class="nm">${mp.name}</div><div class="ds">${mp.desc}</div></button>`).join("")}</div>`;
    const map = MAPS[s.map];
    let summary = map.name;

    if (s.mode === "race") {
      if (!map.tracks.find((t) => t.id === s.track)) s.track = map.tracks[0].id;
      const tr = map.tracks.find((t) => t.id === s.track);
      const loop = tr.loop !== false;
      body += mapCards();
      body += `<h3>코스</h3><div class="grid wide">${map.tracks.map((t) => {
        const best = records[`race:${map.id}:${t.id}:${t.loop === false ? 1 : s.laps}`];
        return `<button class="card ${s.track === t.id ? "sel" : ""}" data-a="sel" data-k="track" data-v="${t.id}">
          <div class="tag">${best ? "최고 " + fmtTime(best) : ""}</div><div class="nm">${t.name}</div>
          <div class="stars">${starStr(t.level)}</div><div class="ds">${t.desc} · ${t.loop === false ? "구간 주행" : `게이트 ${t.gates.length}개`}</div></button>`;
      }).join("")}</div>`;
      body += `<h3>옵션</h3>`;
      if (loop) body += `<div class="opt"><label>랩 수</label>${this.seg("laps", [[1, "1"], [2, "2"], [3, "3"], [5, "5"]], s.laps)}</div>`;
      body += `<div class="opt"><label>AI 라이벌</label>${this.seg("rivals", [[0, "없음"], [1, "1"], [3, "3"], [5, "5"]], s.rivals)}</div>`;
      body += this._diff();
      summary += ` · ${tr.name}`;
    } else if (s.mode === "tracking") {
      if (!map.tracking.find((t) => t.id === s.subject)) s.subject = map.tracking[0].id;
      body += mapCards();
      body += `<h3>피사체</h3><div class="grid wide">${map.tracking.map((t) => {
        const best = records[`tracking:${map.id}:${t.id}`];
        return `<button class="card ${s.subject === t.id ? "sel" : ""}" data-a="sel" data-k="subject" data-v="${t.id}">
          <div class="tag">${best ? "최고 " + best + "점" : ""}</div><div class="nm">${t.name}</div><div class="stars">${starStr(t.level)}</div><div class="ds">${t.desc}</div></button>`;
      }).join("")}</div>`;
      body += `<p class="muted" style="font-size:13px">피사체를 화면 중앙 가까이, 적당한 거리(3~14m)에서 놓치지 않고 따라갈수록 점수가 오릅니다. 시네우프 기체와 ANGLE 모드를 추천합니다.</p>`;
      summary += ` · ${map.tracking.find((t) => t.id === s.subject).name}`;
    } else if (s.mode === "freestyle") {
      body += mapCards();
      const best = records[`freestyle:${map.id}`];
      body += `<h3>세션</h3><div class="opt"><label>진행 방식</label>${this.seg("fs", [["timed", "2분 점수 도전"], ["free", "자유 비행"]], s.fs)}</div>`;
      body += `<p class="muted" style="font-size:13px">플립·롤·요 스핀·다이브·근접 비행·갭 통과로 점수를 얻고, 끊기지 않게 이어 콤보 배율을 올리세요. ACRO 모드에서 모든 묘기가 가능합니다.${best ? ` <b style="color:var(--gold)">최고 ${best}점</b>` : ""}</p>`;
      summary += ` · ${s.fs === "timed" ? "2분 점수 도전" : "자유 비행"}`;
    } else if (s.mode === "survival") {
      body += `<h3>방식</h3><div class="grid wide">${Object.entries(VARIANTS).map(([id, v]) => {
        const best = records[`survival:${id}:${map.id}`];
        return `<button class="card ${s.variant === id ? "sel" : ""}" data-a="sel" data-k="variant" data-v="${id}"><div class="tag">${best ? "최고 " + best + "점" : ""}</div>
          <div class="nm">${v.icon} ${v.name}</div><div class="ds">${v.desc}</div></button>`;
      }).join("")}</div>`;
      body += mapCards();
      body += `<h3>옵션</h3><div class="opt"><label>AI 드론 수</label>${this.seg("bots", [[3, "3"], [5, "5"], [7, "7"], [9, "9"]], s.bots)}</div>`;
      body += `<div class="opt"><label>제한 시간</label>${this.seg("time", [[120, "2분"], [180, "3분"], [300, "5분"]], s.time)}</div>`;
      body += this._diff();
      summary += ` · ${VARIANTS[s.variant].name}`;
    } else {
      body += `<h3>임무</h3><div class="grid wide">${MISSIONS.map((ms) => {
        const st = records[`challenge:${ms.id}`] || 0;
        return `<button class="card mapcard ${s.mission === ms.id ? "sel" : ""}" data-a="sel" data-k="mission" data-v="${ms.id}">
          ${this._thumb("map", ms.map)}<div class="tag stars">${starStr(st)}</div><div class="nm">${ms.icon} ${ms.name}</div>
          <div class="ds">${ms.desc}<br><span style="color:var(--accent2)">${MAPS[ms.map].name}</span> · 난이도 ${"●".repeat(ms.level)}</div></button>`;
      }).join("")}</div>`;
      body += `<h3>편대</h3><div class="opt"><label>팀 구성</label>${this.seg("team", [[0, "혼자"], [1, "2기 편대"], [3, "4기 편대"]], s.team)}<div class="hint">편대를 고르면 AI 윙맨이 함께 싸웁니다. 인원이 늘면 적도 강해집니다.</div></div>`;
      body += this._diff();
      const ms = MISSIONS.find((x) => x.id === s.mission) || MISSIONS[0];
      summary = `${ms.name} · ${MAPS[ms.map].name}`;
    }
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
  _diff() { return `<div class="opt"><label>난이도</label>${this.seg("difficulty", Object.entries(DIFFICULTY).map(([k, v]) => [k, v.name]), settings.difficulty, "set")}</div>`; }

  a_sel(v, el) {
    const k = el.dataset.k;
    this.sel[k] = ["laps", "rivals", "bots", "time", "team"].includes(k) ? +v : v;
    this._persist();
    this.redraw();
  }

  a_start() {
    const s = this.sel;
    const cfg = { mode: s.mode, map: s.map, difficulty: settings.difficulty };
    if (s.mode === "race") Object.assign(cfg, { track: s.track, laps: s.laps, rivals: s.rivals });
    else if (s.mode === "tracking") cfg.subject = s.subject;
    else if (s.mode === "freestyle") cfg.session = s.fs;
    else if (s.mode === "survival") Object.assign(cfg, { variant: s.variant, bots: s.bots, time: s.time });
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
    if (path === "quality") g.applyQuality();
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
          <div class="hint">그림자·해상도가 바뀝니다. 다음 비행부터 완전히 적용됩니다.</div></div>
        ${this.range("volume", "음량", 0, 1, 0.05)}
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
  a_reset() { resetSettings(); this.game.sound.setVolume(settings.volume); this.game.applyQuality(); this.redraw(); }

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
        <tr><td><kbd>Tab</kbd></td><td>점수판 보기 (전투 모드)</td></tr>
        <tr><td><kbd>H</kbd></td><td>HUD 표시 수준 전환: 전체 → 최소 → 끄기 <span class="muted">(계기별 표시는 설정 &gt; HUD·효과)</span></td></tr>
        <tr><td><kbd>Esc</kbd> / <kbd>P</kbd></td><td>일시정지</td></tr>
      </table>
      <p class="muted" style="font-size:13px;line-height:1.6">
        <b>게임패드</b>: 스틱 2개 = 좌/우 스틱, RB/RT 레이저, LB/LT 미사일, A 아이템, B 리셋, X 시점, Y 비행 모드, Start 일시정지.<br>
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
      <div class="list">
        <button class="primary" data-a="restart">다시 하기</button>
        <button data-a="quit">메인 메뉴로</button>
      </div></div></div>`;
  }
}
