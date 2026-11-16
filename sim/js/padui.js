// 게임패드용 메뉴 보조: 연결 표시 칩 · 연결/해제 알림 · 십자키/스틱으로 메뉴 이동 + 확인/뒤로
// 메뉴(#ui)와 대화 장면(.vn)의 버튼을 화면 위치 기준으로 옮겨 다닌다 (가장 가까운 방향의 요소로)
const FOCUSABLE = "button:not([disabled]), select, input[type=range], input[type=checkbox], [data-a]";

export class PadUI {
  constructor(game) {
    this.game = game;
    this.chip = document.createElement("div");
    this.chip.id = "padchip";
    this.chip.hidden = true;
    this.chip.setAttribute("role", "status");
    document.body.appendChild(this.chip);
    this.toastEl = document.createElement("div");
    this.toastEl.id = "padtoast";
    document.body.appendChild(this.toastEl);
    this.cur = null;                               // 패드로 고른 요소
    // 마우스·터치를 쓰면 패드 강조를 걷어낸다
    addEventListener("pointerdown", () => this._clear(), true);
  }

  // 연결/해제 (input.onPad)
  onPad(kind, info, wasActive) {
    const g = this.game;
    this._refresh();
    if (kind === "connect") {
      this._chip(info);
      this.toast(`🎮 ${info.name} 연결됨`, "#7dffb0");
      if (info.type === "rc") setTimeout(() => this.toast("RC 조종기는 설정 › 입력장치에서 축을 확인하고, 스로틀이 고정식이면 ‘스로틀 중앙 = 호버’를 끄세요", "#ffd24a", 4200), 1400);
    } else {
      this._chip(null);
      this.toast("🎮 컨트롤러 연결이 끊겼습니다", "#ff8a7a");
      if (wasActive && g.state === "play") g.pause();     // 비행 중 끊기면 일시정지
    }
  }

  _refresh() { const ui = this.game.ui; if (ui.screen === "settings" || ui.screen === "help") ui.redraw(); }

  _chip(info) {
    if (!info) { this.chip.hidden = true; return; }
    this.chip.innerHTML = `<span class="pi" aria-hidden="true">🎮</span><b>${info.name}</b><span class="pk">연결됨</span>`;
    this.chip.dataset.type = info.type;
    this.chip.hidden = false;
  }

  // 메뉴용 알림 (비행 중에는 HUD 알림을 쓴다)
  toast(text, color = "#fff", ms = 2400) {
    const g = this.game;
    if (g.state === "play" && g.session) { g.hud.toast(text, color, ms / 1000, 18); return; }
    const el = document.createElement("div");
    el.className = "pt";
    el.style.setProperty("--c", color);
    el.textContent = text;
    this.toastEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => { el.classList.remove("in"); setTimeout(() => el.remove(), 400); }, ms);
  }

  // 매 프레임: 상태에 따라 칩 위치를 바꾸고 메뉴 입력을 처리
  update() {
    const g = this.game, inp = g.input;
    // 비행 중에는 HUD 가 따로 표시하므로 칩을 숨긴다
    this.chip.classList.toggle("off", g.state === "play" || (g.state === "pause" && !g.ui.screen) || !!document.querySelector(".vn"));
    this.chip.classList.toggle("mini", !["title", "main", "group"].includes(g.ui.screen));
    const list = [];
    let n;
    while ((n = inp.takeNav())) list.push(n);
    // '아무 버튼'은 다른 메뉴 입력이 없는 프레임에만 (뒤로 → 타이틀 직후 다시 들어가지 않도록)
    for (const x of list) if (x !== "any" || list.length === 1) this._nav(x);
  }

  _scope() {
    const vn = document.querySelector(".vn");
    if (vn) {
      const log = vn.querySelector(".vn-log");
      if (log && getComputedStyle(log).display !== "none" && log.offsetParent) return { el: log, vn };
      const ch = vn.querySelector(".vn-choices");
      return { el: ch && ch.querySelector("button") ? ch : null, vn };
    }
    const root = this.game.ui.root;
    return { el: root.querySelector("[data-ovl]") || root, vn: null };
  }

  _items(scope) {
    return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => {
      if (el.closest("[hidden]")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden";
    }).filter((el, i, a) => !a.some((o) => o !== el && o.contains(el)));   // 버튼 안의 버튼은 바깥 것만
  }

  _nav(n) {
    const g = this.game, ui = g.ui, sc = this._scope();
    if (n === "any") { if (ui.screen === "title") ui.a_enter(); return; }
    // 대화 장면: 선택지가 없으면 확인 = 다음 대사, 뒤로 = 건너뛰기
    if (sc.vn && !sc.el) {
      if (n === "ok") this._key("Enter");
      else if (n === "back") this._key("Escape");
      return;
    }
    if (!sc.el) return;
    if (ui.screen === "title" && !sc.vn) { if (n === "ok") ui.a_enter(); return; }
    if (n === "back") return this._back(sc);
    const items = this._items(sc.el);
    if (!items.length) return;
    // 아직 고른 것이 없으면 첫 입력은 기본 요소(주 버튼·선택된 카드)를 강조만 한다
    if (!this.cur || !items.includes(this.cur)) {
      const has = (c) => items.find((el) => el.classList.contains(c));
      this._focus(has("primary") || has("hcard") || has("sel") || has("dcard") || items.find((el) => !el.classList.contains("back")) || items[0]);
      return;
    }
    const el = this.cur;
    if (n === "ok") {
      if (el.tagName === "SELECT") { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event("change", { bubbles: true })); return; }
      if (el.type === "checkbox") { el.checked = !el.checked; el.dispatchEvent(new Event("change", { bubbles: true })); return; }
      if (el.type === "range") return;
      if (sc.vn) { el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); return; }
      const keep = this._path(el);
      el.click();
      this._restore(keep);
      return;
    }
    // 슬라이더는 좌우로 값 조절
    if (el.type === "range" && (n === "left" || n === "right")) {
      const st = +el.step || 0.01, v = Math.min(+el.max, Math.max(+el.min, +el.value + (n === "right" ? st : -st)));
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const next = this._near(el, items, n);
    if (next) this._focus(next);
  }

  // 방향으로 가장 가까운 요소: 진행 방향 거리 + 옆으로 벗어난 정도(가중)
  _near(el, items, dir) {
    const a = el.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const o of items) {
      if (o === el) continue;
      const b = o.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      let main, side;
      if (dir === "up") { main = a.top - b.bottom; side = Math.abs(bx - ax); if (by >= ay - 2) continue; }
      else if (dir === "down") { main = b.top - a.bottom; side = Math.abs(bx - ax); if (by <= ay + 2) continue; }
      else if (dir === "left") { main = a.left - b.right; side = Math.abs(by - ay); if (bx >= ax - 2) continue; }
      else { main = b.left - a.right; side = Math.abs(by - ay); if (bx <= ax + 2) continue; }
      const s = Math.max(0, main) + side * 2.2 + (main < -4 ? 400 : 0);
      if (s < bs) { bs = s; best = o; }
    }
    return best;
  }

  _focus(el) {
    if (this.cur) this.cur.classList.remove("padfocus");
    this.cur = el;
    if (!el) return;
    el.classList.add("padfocus");
    try { el.focus({ preventScroll: true }); } catch (_) { /* 포커스 불가 요소 */ }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  _clear() { if (this.cur) this.cur.classList.remove("padfocus"); this.cur = null; }

  // 화면을 다시 그린 뒤에도 같은 자리(같은 동작·값)의 요소를 다시 고른다
  _path(el) { return { a: el.dataset.a, v: el.dataset.v, k: el.dataset.k, screen: this.game.ui.screen }; }
  _restore(p) {
    requestAnimationFrame(() => {
      if (this.cur && document.contains(this.cur)) { this.cur.classList.add("padfocus"); return; }
      const ui = this.game.ui, sc = this._scope();
      if (!sc.el) { this.cur = null; return; }
      const items = this._items(sc.el);
      const same = p.screen === ui.screen ? items.find((o) => o.dataset.a === p.a && o.dataset.v === p.v && o.dataset.k === p.k) : null;
      this.cur = null;
      if (same) this._focus(same);
    });
  }

  _back(sc) {
    const g = this.game, ui = g.ui;
    if (sc.vn) { this._key("Escape"); return; }
    if (sc.el.matches && sc.el.matches("[data-ovl]")) { ui.a_ovclose(); this.cur = null; return; }
    if (ui.screen === "pause") { g.resume(); return; }
    if (ui.screen === "main") { ui.show("title"); this.cur = null; return; }
    if (["setup", "hangar", "settings", "help", "group", "story", "training"].includes(ui.screen)) { ui.a_back(); this.cur = null; }
  }

  _key(code) {
    const key = code === "Enter" ? "Enter" : code === "Escape" ? "Escape" : code;
    window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }));
  }
}
