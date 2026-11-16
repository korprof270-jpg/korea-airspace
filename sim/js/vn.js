// 스토리 대화 장면: 배경·CG 일러스트 위에 인물 초상화와 대사, 선택지. 관계도·분기 기록
//  장면 대본 = 배열. 항목:
//   "@bg 키" 배경 · "@cg 키" 일러스트(인물 숨김) · "@cg -" 일러스트 끝 · "@sfx 소리" · "@shake" · "@flash" · "@clear" 인물 퇴장
//   "@bgm 분위기" 음악 (cues.js MOODS: calm daily tense sad resolve mystery eia space) · "@bgm -" 음악 끄기 · "@bgm auto" 배경 기본값으로
//     정하지 않으면 @bg 마다 BG_MOOD 기본 분위기. 바로 뒤(대사 전)에 @bgm 이 오면 그쪽이 이긴다
//   "화자:표정|대사"  "|지문"   (표정: normal smile angry sad surprise serious)
//   { choice: [{ t: "선택지", rel: { 서하린: 1 }, route: "c4:a", flag: "이름", then: [...] }], q: "질문(선택)" }
//   { if: "rel 서하린>=2" | "flag 이름" | "route c4=a" | "top 서하린", then: [...], else: [...] }
import { records, save, settings } from "./config.js";
import { MOODS, BG_MOOD } from "./cues.js";
import { portrait, HAS_PORTRAIT, hasArt, artScale } from "./portraits.js";
import { CAST } from "./story.js";

const IMG = "img/story/";
// 단계 작전 변경 = 장면별 조각을 순서대로 합친 것
function remod(sid) {
  const parts = records[`hsmodp:${sid}`] || {}, vals = Object.values(parts);
  if (!vals.length) delete records[`hsmod:${sid}`];
  else records[`hsmod:${sid}`] = vals.reduce((a, m) => Object.assign(a, m, m.boss && a.boss ? { boss: Object.assign({}, a.boss, m.boss) } : {}), {});
}
export function clearSceneMods(key) {
  if (!key) return;
  for (const k of Object.keys(records)) if (k.startsWith("hsmodp:") && records[k][key]) { delete records[k][key]; remod(k.slice(7)); }
}
export const BONDS = ["서하린", "바우", "유리", "차도윤", "모아", "노을", "윤채아", "진세라", "한별", "루카"];
export const rel = (n) => records[`hsrel:${n}`] || 0;
export const flag = (k) => !!records[`hsflag:${k}`];
export function topBond(exclude = []) {
  let best = null, bv = 0;
  for (const n of BONDS) if (!exclude.includes(n) && rel(n) > bv) { bv = rel(n); best = n; }
  return best;
}
function test(cond) {
  const [op, arg] = [cond.slice(0, cond.indexOf(" ")), cond.slice(cond.indexOf(" ") + 1).trim()];
  if (op === "flag") return flag(arg);
  if (op === "top") return topBond() === arg;
  if (op === "route") { const [ch, id] = arg.split("="); return records[`hspick:${ch}`] === id || (!records[`hspick:${ch}`] && records[`hsroute:${ch}`] === id); }
  if (op === "rel") { const m = arg.match(/^(.+?)(>=|<=|>|<|=)(-?\d+)$/); if (!m) return false; const v = rel(m[1]), n = +m[3]; return { ">=": v >= n, "<=": v <= n, ">": v > n, "<": v < n, "=": v === n }[m[2]]; }
  return false;
}

// 실내 배경은 그림 파일 없이 CSS로
const ROOMS = { briefing: "vn-room briefing", hangarin: "vn-room hangarin", black: "vn-room black", night: "vn-room night", lab: "vn-room lab", control: "vn-room control" };

// 화자가 바뀔 때 나는 짧은 소리: 인물마다 음높이를 조금씩 다르게 (없는 인물은 이름으로 정한다)
const VOICE_PITCH = { "나": 1, "강 교관": 0.74, "모아": 1.32, "서하린": 1.16, "바우": 0.8, "유리": 1.24, "차도윤": 0.92, "노을": 1.2,
  "한서윤": 1.1, "차 장군": 0.7, "강도현": 0.9, "아샤": 1.18, "니르바": 1.05, "카르타": 0.82, "윤채아": 1.14, "진세라": 1.02, "한별": 1.28, "루카": 0.96, "구철": 0.76 };
const MACHINE = new Set(["에이아", "EIA", "XN-0", "바르가", "여명"]), RADIO_V = new Set(["관제"]);
function voiceOf(who) {
  if (RADIO_V.has(who)) return ["vblipr", 1];
  let p = VOICE_PITCH[who];
  if (p === undefined) { let h = 0; for (const c of who) h = (h * 31 + c.charCodeAt(0)) >>> 0; p = 0.82 + (h % 40) / 100; }
  return [MACHINE.has(who) ? "vblipm" : "vblip", p];
}

export class VN {
  constructor(game) {
    this.game = game;
    this.el = null;
  }

  // lines: 대본, opts: { title, sub, onDone }
  play(lines, opts = {}) {
    if (this.el) this.close(false);
    this.opts = opts;
    clearSceneMods(opts.key);   // 다시 보는 장면이면 그 장면이 남긴 작전 변경부터 지운다
    this.stack = [{ list: lines, i: 0 }];
    this.slots = [null, null]; this.last = null; this.auto = false; this.ff = false; this.log = [];
    this.voiced = null; this.hover = -1;
    this.bgm = "calm"; this.bgmSet = undefined; this.bgmNow = undefined;   // 대본이 배경을 정하지 않아도 평온한 곡으로 시작
    const el = (this.el = document.createElement("div"));
    el.className = "vn";
    el.innerHTML = `<div class="vn-bg"><div class="vn-img a"></div><div class="vn-img b"></div></div><div class="vn-cg"></div>
      <div class="vn-chars"><img class="vn-ch l" alt=""><img class="vn-ch r" alt=""></div>
      <div class="vn-top">${opts.title ? `<div class="vn-title"><small>${esc(opts.sub || "")}</small>${esc(opts.title)}</div>` : "<div></div>"}
        <div class="vn-btns"><button data-v="auto"><span class="ic">⟳</span>AUTO</button><button data-v="log"><span class="ic">☰</span>LOG</button><button data-v="skip"><span class="ic">▶▶</span>SKIP</button><button data-v="mute" class="vn-mute" aria-label="소리 끄기/켜기"><span class="ic"></span></button></div></div>
      <div class="vn-box"><i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i><div class="vn-name"></div><div class="vn-text"></div><div class="vn-next">▼</div></div>
      <div class="vn-log"><div class="vn-logh"><b>대화 기록</b><button data-v="logx">닫기 ✕</button></div><div class="vn-logl"></div></div>
      <div class="vn-choices"></div><div class="vn-toast"></div><div class="vn-flash"></div>`;
    document.body.appendChild(el);
    this.$ = (q) => el.querySelector(q);
    this.bgFlip = 0;
    this._muteIcon();
    // 선택지 위에 올리거나(마우스) 키보드로 옮기면 작게 딸깍
    const hov = (e) => { const b = e.target.closest && e.target.closest(".vn-choices button"); const i = b ? +b.dataset.c : -1; if (i !== this.hover) { this.hover = i; if (i >= 0 && this.choosing) this._cue("chover", 0.8, 0.9 + i * 0.06); } };
    el.addEventListener("pointerover", hov); el.addEventListener("focusin", hov);
    el.addEventListener("pointerdown", (e) => {
      const b = e.target.closest("button");
      if (b && b.dataset.v === "mute") { settings.mute = !settings.mute; save(); try { this.game.sound.applyVolumes(); } catch (_) { /* 소리 없음 */ } this._muteIcon(); if (!settings.mute) this._cue("click"); return; }
      if (b && b.dataset.v) this._cue("click", 0.7);
      if (b && b.dataset.v === "auto") { this.auto = !this.auto; b.classList.toggle("on", this.auto); if (this.auto && !this.typing) this._autoNext(); return; }
      if (b && b.dataset.v === "skip") { this.ff = true; this._advance(); return; }
      if (b && b.dataset.v === "log") { this._showLog(true); return; }
      if (b && b.dataset.v === "logx") { this._showLog(false); return; }
      if (e.target.closest(".vn-log")) return;
      if (b && b.dataset.c !== undefined) return this._pick(+b.dataset.c);
      if (e.target.closest(".vn-choices") || b) return;
      this._advance(true);
    });
    this._key = (e) => {
      if (!this.el) return;
      e.stopPropagation();
      if (e.repeat) return;
      if (this.logOpen) { if (e.code === "Escape" || e.code === "KeyL") this._showLog(false); return; }
      if (e.code === "KeyL") { this._showLog(true); return; }
      if (this.choosing) { const n = +e.key; if (n >= 1 && n <= this.choosing.length) { e.preventDefault(); this._pick(n - 1); } return; }
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") { e.preventDefault(); this._advance(true); }
      else if (e.code === "Escape") { e.preventDefault(); this.ff = true; this._advance(); }
    };
    window.addEventListener("keydown", this._key, true);
    requestAnimationFrame(() => el.classList.add("in"));
    this._step();
  }

  close(done = true) {
    if (!this.el) return;
    clearTimeout(this.tt); clearTimeout(this.at); clearTimeout(this.fft);
    window.removeEventListener("keydown", this._key, true);
    try { this.game.music && this.game.music.setMood(null); } catch (_) { /* 음악 없음 */ }   // 맵·메뉴 곡으로 돌아간다 (onDone 이 곧 새 곡을 정할 수 있다)
    const el = this.el; this.el = null;
    el.classList.remove("in"); setTimeout(() => el.remove(), 350);
    if (done && this.opts.onDone) this.opts.onDone();
  }

  _next() {
    while (this.stack.length) {
      const top = this.stack[this.stack.length - 1];
      if (top.i < top.list.length) return top.list[top.i++];
      this.stack.pop();
    }
    return null;
  }
  _push(list) { if (list && list.length) this.stack.push({ list, i: 0 }); }

  _step() {
    if (!this.el) return;
    for (;;) {
      const it = this._next();
      if (it === null) return this.close(true);
      if (typeof it === "object") {
        if (it.if !== undefined) { this._push(test(it.if) ? it.then : it.else); continue; }
        if (it.choice) return this._choice(it);
        continue;
      }
      if (it[0] === "@") { this._cmd(it); continue; }
      return this._say(it);
    }
  }

  _cmd(s) {
    const [c, ...rest] = s.slice(1).split(" "), a = rest.join(" ");
    if (c === "bg") this._bg(a);
    else if (c === "cg") {
      const cg = this.$(".vn-cg");
      if (a === "-") { cg.classList.remove("on"); this.el.classList.remove("cgmode"); }
      else { cg.style.backgroundImage = `url(${IMG}${a}.jpg)`; cg.classList.remove("on"); void cg.offsetWidth; cg.classList.add("on"); this.el.classList.add("cgmode"); }
    }
    else if (c === "sfx") { if (!this.ff) try { this.game.sound.play(a); } catch (e) { /* 소리 없음 */ } }
    else if (c === "bgm") { this.bgmSet = a === "auto" ? this.bgm : a === "-" || MOODS[a] ? a : undefined; }
    else if (c === "shake") { this.el.classList.remove("shake"); void this.el.offsetWidth; this.el.classList.add("shake"); }
    else if (c === "flash") { const f = this.$(".vn-flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }
    else if (c === "clear") { this.slots = [null, null]; this._chars(null); }
  }
  _bg(k) {
    const a = this.$(this.bgFlip ? ".vn-img.a" : ".vn-img.b"), b = this.$(this.bgFlip ? ".vn-img.b" : ".vn-img.a");
    this.bgFlip ^= 1;
    a.className = `vn-img ${this.bgFlip ? "b" : "a"} ${ROOMS[k] || ""}`;
    a.style.backgroundImage = ROOMS[k] ? "" : `url(${IMG}${k}.jpg)`;
    a.classList.add("on"); b.classList.remove("on");
    if (BG_MOOD[k]) { this.bgm = BG_MOOD[k]; this.bgmSet = undefined; }   // 배경이 바뀌면 그 배경의 기본 분위기 (바로 뒤 @bgm 이 덮어쓴다)
  }
  // 쌓인 음악 지시를 대사가 나올 때 한 번에 반영 (배경과 @bgm 이 연달아 와도 곡이 한 번만 바뀐다)
  _music() {
    const m = this.bgmSet !== undefined ? this.bgmSet : this.bgm;
    if (m === this.bgmNow) return;
    this.bgmNow = m;
    try { this.game.music && this.game.music.setMood(m); } catch (_) { /* 음악 없음 */ }
  }
  _cue(name, vol = 1, pitch = 1) { try { this.game.sound && this.game.sound.cue(name, vol, 0, pitch); } catch (_) { /* 소리 없음 */ } }
  _muteIcon() { const b = this.el && this.$(".vn-mute"); if (b) { b.querySelector(".ic").textContent = settings.mute ? "🔇" : "🔊"; b.classList.toggle("on", !!settings.mute); } }

  // 화자를 왼쪽/오른쪽 자리에 세운다. 새 인물은 직전 화자가 아닌 쪽 자리로
  _place(who) {
    if (!HAS_PORTRAIT.has(who)) return -1;
    let i = this.slots.findIndex((x) => x && x.who === who);
    if (i < 0) {
      i = this.slots.findIndex((x) => !x);
      if (i < 0) i = this.slots[0] && this.slots[0].who === this.last ? 1 : 0;
      this.slots[i] = { who, expr: "normal", fresh: true };
    }
    return i;
  }
  _chars(active) {
    ["l", "r"].forEach((side, i) => {
      const img = this.$(`.vn-ch.${side}`), sl = this.slots[i];
      if (!sl) { img.classList.remove("on"); return; }
      const src = portrait(sl.who, sl.expr);
      if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
      if (sl.fresh) { sl.fresh = false; img.classList.remove("on", "pop"); void img.offsetWidth; }
      img.classList.add("on");
      img.classList.toggle("dim", active !== i);
      img.classList.toggle("holo", !hasArt(sl.who) && (sl.who === "노을" || sl.who === "에이아"));
      img.classList.toggle("art", hasArt(sl.who));
      img.style.setProperty("--sc", artScale(sl.who));
      if (active === i) { img.classList.remove("pop"); void img.offsetWidth; img.classList.add("pop"); }
    });
  }

  _say(line) {
    const bar = line.indexOf("|"), head = bar >= 0 ? line.slice(0, bar) : "", text = bar >= 0 ? line.slice(bar + 1) : line;
    const [who, expr] = head.split(":");
    const name = this.$(".vn-name"), box = this.$(".vn-box");
    let active = null;
    if (!this.ff) this._music();   // 빨리 넘기는 동안에는 곡을 바꾸지 않고, 멈춘 곳(선택지)에서 맞춘다
    // 화자가 바뀌면 인물마다 음높이가 다른 짧은 소리 (빨리 넘기기 중에는 생략)
    if (who && who !== this.voiced && !this.ff) { const [snd, p] = voiceOf(who); this._cue(snd, 0.9, p); }
    this.voiced = who || null;
    if (who) {
      const i = this._place(who);
      if (i >= 0) { this.slots[i].expr = expr || "normal"; active = i; }
      this.last = who;
      name.textContent = who === "나" ? "나 (새벽)" : who;
      name.style.setProperty("--nc", CAST[who] || (who === "나" ? "#ffd24a" : "#9fb3c8"));
      name.classList.add("on");
      box.classList.remove("narr");
      box.classList.toggle("radio", who === "관제");
    } else { name.classList.remove("on"); box.classList.add("narr"); box.classList.remove("radio"); }
    this._chars(active);
    this.log.push([who === "나" ? "나 (새벽)" : who || "", text, CAST[who] || (who === "나" ? "#ffd24a" : "")]);
    this._type(text);
  }
  _type(text) {
    const t = this.$(".vn-text"), nx = this.$(".vn-next");
    clearTimeout(this.tt); clearTimeout(this.at);
    nx.classList.remove("on");
    this.full = text; this.typing = true;
    if (this.ff) { t.textContent = text; return this._typed(); }
    let n = 0;
    const tick = () => {
      if (!this.el) return;
      n = Math.min(text.length, n + 2);
      t.textContent = text.slice(0, n);
      if (n >= text.length) return this._typed();
      this.tt = setTimeout(tick, 28);
    };
    tick();
  }
  _typed() {
    this.typing = false;
    this.$(".vn-next").classList.add("on");
    if (this.ff) { this.fft = setTimeout(() => this._step(), 40); return; }
    if (this.auto) this._autoNext();
  }
  _autoNext() { clearTimeout(this.at); this.at = setTimeout(() => { if (this.el && !this.typing && !this.choosing && !this.logOpen) this._step(); }, 1100 + this.full.length * 45); }
  _advance(user = false) {
    if (!this.el || this.choosing || this.logOpen) return;
    if (user && !this.ff) this._cue("vtick", this.typing ? 0.6 : 1);
    if (this.typing) { clearTimeout(this.tt); this.$(".vn-text").textContent = this.full; this._typed(); return; }
    clearTimeout(this.at);
    this._step();
  }

  _choice(it) {
    this.ff = false; clearTimeout(this.fft);
    this._music();
    this.choosing = it.choice; this.hover = -1;
    const box = this.$(".vn-choices");
    if (it.q) { this.$(".vn-name").classList.remove("on"); this.$(".vn-box").classList.add("narr"); this.$(".vn-text").textContent = it.q; this.$(".vn-next").classList.remove("on"); }
    box.innerHTML = it.choice.map((c, i) => {
      const hint = c.route ? `<i class="rt">작전 결정</i>` : c.rel ? `<i>${Object.keys(c.rel).map((n) => esc(n)).join(" · ")}</i>` : "";
      return `<button data-c="${i}"><span class="k">${i + 1}</span><span class="t">${esc(c.t)}</span>${hint}</button>`;
    }).join("");
    box.classList.add("on");
    this._cue("chopen", 0.8);
  }
  _pick(i) {
    const c = this.choosing && this.choosing[i];
    if (!c) return;
    this.choosing = null;
    this.$(".vn-choices").classList.remove("on");
    const msg = [];
    if (c.rel) for (const [n, v] of Object.entries(c.rel)) { records[`hsrel:${n}`] = rel(n) + v; msg.push(`${n} ${v > 0 ? "♥ +" + v : v}`); }
    if (c.flag) records[`hsflag:${c.flag}`] = 1;
    // 작전 변경: { 단계id: { team, wing, power, diff, bots, time, boss, objAdd, objDel, note } }
    // 장면별로 따로 보관해 합친다: 같은 장면을 다시 보며 다르게 고르면 그 장면의 이전 선택은 지워진다
    if (c.mod) for (const [sid, m] of Object.entries(c.mod)) {
      const pk = `hsmodp:${sid}`, src = this.opts.key || "?", parts = records[pk] || {};
      parts[src] = Object.assign({}, parts[src] || {}, m); records[pk] = parts; remod(sid);
      if (m.note) msg.push("작전 변경");
    }
    if (c.route) { const [ch, id] = c.route.split(":"); records[`hspick:${ch}`] = id; msg.push("작전 결정"); }
    save();
    if (msg.length) this._toast(msg.join("   "));
    this._cue("chpick", 0.9);
    if (c.rel && Object.values(c.rel).some((v) => v > 0)) this._cue("bond", 0.8);
    else if (c.route || c.mod) this._cue("lock", 0.45);
    this.log.push(["선택", c.t, "#3dd68c"]);
    this._push(c.then);
    this._push([(this.opts.me || "나") + "|" + c.t]);   // 선택한 말은 주인공(히든 스토리는 EIA)이 한다
    this._step();
  }
  _showLog(on) {
    this.logOpen = on; clearTimeout(this.at);
    const el = this.$(".vn-log");
    if (on) {
      const l = this.$(".vn-logl");
      l.innerHTML = this.log.map(([w, t, c]) => `<div class="li${w ? "" : " narr"}">${w ? `<b style="color:${c || "#9fb3c8"}">${esc(w)}</b>` : ""}<span>${esc(t)}</span></div>`).join("");
      requestAnimationFrame(() => (l.scrollTop = l.scrollHeight));
    } else if (this.auto && !this.typing && !this.choosing) this._autoNext();
    el.classList.toggle("on", on);
  }
  _toast(s) {
    const t = this.$(".vn-toast");
    t.textContent = s; t.classList.remove("on"); void t.offsetWidth; t.classList.add("on");
  }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
