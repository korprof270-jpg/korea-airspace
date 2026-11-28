// 정비소 화면: 가운데 큰 3D 기체(드래그로 돌리고 휠·핀치로 확대) + 왼쪽 분류 + 오른쪽 아이템 목록·능력치 비교
// ui.js 의 UI 클래스에 메서드를 덧붙인다 (installHangar). 구매·장착·업그레이드는 garage.js, 미리보기는 ui.js 의 _pvApply 를 그대로 쓴다
import { settings, save, DRONE_CLASSES } from "./config.js";
import { FRAMES, CANOPIES, SKINS, LED_MODES, COLOR_PRESETS } from "./dronemodel.js";
import * as GP from "./garage.js";
import { story } from "./story.js";
import * as SY from "./story.js";
import { toGame } from "./rotate.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const P = (n) => `${Math.round(n).toLocaleString()}P`;
const TRAILS = { off: "끄기", "#ffffff": "흰색", "#ff5a1f": "주황", "#21d4fd": "하늘", "#ff2bd6": "분홍", "#3dff7c": "초록" };
// 분류: [id, 이름, 묶음]
const LOOK = [["frame", "프레임"], ["canopy", "덮개"], ["skin", "스킨"], ["preset", "색 조합"], ["paint", "페인트"], ["led", "LED"], ["trail", "꼬리빛"], ["cls", "기체 등급"]];
const SETS = [["theme", "테마"], ["fx", "무기 효과"]];
const KIND_NAME = { frame: "프레임", canopy: "덮개", skin: "스킨", led: "LED", trail: "꼬리빛", preset: "색 조합", paint: "페인트", theme: "테마", cls: "기체 등급" };
const LOOK_ICON = { frame: "✣", canopy: "🛸", skin: "🎨", preset: "🌈", paint: "🖌", led: "💡", trail: "☄", cls: "✈", theme: "★", fx: "✨", skill: "🌀", quest: "📜" };

// 외형 미리보기 조각 (ui.js 의 lookPatch 와 같다)
function patchOf(kind, v) {
  if (kind === "frame") return { frame: v };
  if (kind === "canopy") return { canopy: v };
  if (kind === "skin") return { skin: v };
  if (kind === "led") return { ledMode: v };
  if (kind === "trail") return { trail: v };
  if (kind === "cls") return { cls: v };
  if (kind === "preset") { const { name, desc, ...c } = COLOR_PRESETS[+v] || COLOR_PRESETS[0]; void name; void desc; return c; }
  if (kind === "theme") return { ...(GP.THEMES[v] ? GP.THEMES[v].look : {}) };
  return {};
}
// 능력치 계산용 외형 조각 (등급 보너스가 붙는 키만)
const statLook = (pt) => { const o = {}; for (const k of ["frame", "canopy", "skin", "ledMode", "trail"]) if (pt[k] !== undefined) o[k] = pt[k]; return o; };

// 아이템 이름 (보상 표시에도 쓴다)
export function itemName(kind, v) {
  if (kind.startsWith("part.")) { const Pt = GP.PARTS[kind.slice(5)]; return (Pt && Pt.variants[v] && Pt.variants[v].name) || v; }
  if (kind.startsWith("fx.")) { const F = GP.FX[kind.slice(3)]; return (F && F.items[v] && F.items[v].name) || v; }
  if (kind === "frame") return (FRAMES[v] || {}).name || v;
  if (kind === "canopy") return (CANOPIES[v] || {}).name || v;
  if (kind === "skin") return (SKINS[v] || {}).name || v;
  if (kind === "led") return LED_MODES[v] || v;
  if (kind === "trail") return TRAILS[v] || v;
  if (kind === "preset") return (COLOR_PRESETS[+v] || {}).name || v;
  if (kind === "theme") return (GP.THEMES[v] || {}).name || v;
  if (kind === "cls") return (DRONE_CLASSES[v] || {}).name || v;
  if (kind === "paint") return "커스텀 페인트";
  return v;
}
export const kindName = (kind) => (kind.startsWith("part.") ? (GP.PARTS[kind.slice(5)] || {}).name || "파츠" : kind.startsWith("fx.") ? (GP.FX[kind.slice(3)] || {}).name || "효과" : KIND_NAME[kind] || kind);
const gradeBadge = (g, cls = "") => { const G = GP.GRADES[g]; return G ? `<i class="hg-gb ${cls}" style="--gc:${G.c}">${G.name}</i>` : ""; };
const fmtVal = (k, v) => { const S = GP.STATS[k]; if (!S) return String(v); const n = S.pct ? Math.round(v * 1000) / 10 : Math.round(v * 10) / 10; return `${n > 0 ? "+" : ""}${n}${S.pct ? "%" : S.unit || ""}`; };
const chips = (e) => Object.entries(e || {}).filter(([, n]) => Math.abs(n) > 1e-9).map(([k, n]) => `<i class="${GP.statGood(k, n) ? "up" : "dn"}">${esc(GP.statText(k, n))}</i>`).join("");

// 결과 화면: 임무 보상 카드
export function dropCard(d) {
  if (!d) return "";
  const G = GP.GRADES[d.g] || GP.GRADES[0];
  if (d.kind === "pts") return `<div class="hgdrop" style="--gc:${G.c}"><span class="hgd-ic">◆</span><span class="hgd-tx"><small>임무 보상 · ${gradeBadge(d.g)}</small><b>+${P(d.pts)}</b><em>${G.name} 장비를 모두 가지고 있어 포인트로 받았습니다</em></span></div>`;
  const b = GP.gradeBonus(d.kind, d.v);
  return `<div class="hgdrop new g${d.g}" style="--gc:${G.c}"><span class="hgd-ic">${d.kind.startsWith("part.") ? GP.PARTS[d.kind.slice(5)].icon : LOOK_ICON[d.kind] || "★"}</span>
    <span class="hgd-tx"><small>임무 보상 획득 · ${gradeBadge(d.g)}</small><b>${esc(itemName(d.kind, d.v))}</b><em>${esc(kindName(d.kind))}${Object.keys(b).length ? ` · ${esc(GP.effText(b))}` : ""} · 정비소에서 장착</em></span></div>`;
}

// 화면 크기 클래스 (폰을 세로로 들면 rotate.js 가 화면을 돌리고 innerWidth/innerHeight 도 돌린 값을 준다)
const hgSize = () => (innerWidth <= 760 ? "nar" : innerHeight <= 560 ? "lo" : "");

const H = {
  // ── 화면 ──
  s_hangar() {
    this._hgInit();
    const cat = this._hgCat(), body = this._hgBody(cat);
    const nav = (id, label, extra = "") => `<button class="hg-c ${cat === id ? "on" : ""}" data-a="hgcat" data-v="${id}"><span class="ic">${extra.ic || LOOK_ICON[id] || "•"}</span><span class="nm">${label}</span>${extra.r || ""}</button>`;
    const cnt = (k) => { const ids = this._lids(k); return `<small>${ids.filter((v) => this._lown(k, v)).length}/${ids.length}</small>`; };
    const parts = GP.SLOTS.map((s) => { const c = GP.partOf(s), g = GP.gradeOf(`part.${s}`, c.v), G = GP.GRADES[g]; return nav(`part.${s}`, GP.PARTS[s].short, { ic: GP.PARTS[s].icon, r: `<small class="lv" style="--gc:${G.c}">Lv.${c.lv}${GP.oxLv(s, c.v) ? `+${GP.oxLv(s, c.v)}` : ""}</small>` }); }).join("");
    const q = GP.quests(), qn = [...q.daily, ...q.weekly].filter((x) => !x.done).length;
    const cls = DRONE_CLASSES[settings.drone.cls] || DRONE_CLASSES.freestyle;
    const msg = this._gmsg ? `<div class="hg-msg ${this._gmsg.bad ? "bad" : ""}" role="status">${esc(this._gmsg.t)}</div>` : "";
    return `<div class="screen hg ${hgSize()}">
      <header class="hg-top">
        <button class="back" data-a="back">← 뒤로</button>
        <div class="hg-ttl"><span class="en">GARAGE</span><h2>정비소</h2><small>${esc(cls.name)}</small></div>
        <span class="sp"></span>
        <span class="pts">◆ ${P(GP.points())}</span><span class="md" title="훈장 (한계 돌파)">🎖 ${GP.medals()}</span>
      </header>
      <nav class="hg-nav" data-scroll-x>
        <div class="hg-g"><h4>외형</h4>${LOOK.map(([k, l]) => nav(k, l, { r: k === "paint" || k === "cls" ? "" : cnt(k) })).join("")}</div>
        <div class="hg-g"><h4>세트 · 효과</h4>${SETS.map(([k, l]) => nav(k, l)).join("")}</div>
        <div class="hg-g"><h4>파츠</h4>${parts}</div>
        <div class="hg-g"><h4>기타</h4>${nav("skill", "스킬")}${nav("quest", "퀘스트", { r: qn ? `<small class="nb">${qn}</small>` : "" })}</div>
      </nav>
      <section class="hg-stage" data-stage data-hgstage>
        ${body.tag || ""}
        ${cat === "skill" ? "" : `<div class="hg-vc"><button class="hg-vb" data-a="hgview" data-v="in" aria-label="확대">＋</button><button class="hg-vb" data-a="hgview" data-v="out" aria-label="축소">－</button><button class="hg-vb" data-a="hgview" data-v="reset" aria-label="시점 초기화">⟲</button></div>`}
        <div class="hg-tip">${cat === "skill" ? "스킬 연출 미리보기 · 드래그로 돌리기" : "드래그로 돌리기 · 휠·두 손가락으로 확대"}</div>
        ${cat === "skill" ? "" : this._hgRate()}
      </section>
      <aside class="hg-side">
        ${msg}
        <div class="hg-lh"><h3>${esc(body.title)}</h3>${body.sub ? `<small>${body.sub}</small>` : ""}</div>
        <div class="hg-list" data-scroll>${body.list}</div>
        ${body.det !== undefined ? `<div class="hg-det">${body.det}</div>` : ""}
      </aside>
    </div>`;
  },

  // 처음 한 번: 3D 무대 드래그·확대, 카드에 올리면 미리보기
  _hgInit() {
    if (this._hgReady) return;
    this._hgReady = true;
    const root = this.root, menu = () => this.game.menu, pts = new Map();
    let pinch = 0;
    const onStage = (e) => this.screen === "hangar" && e.target.closest && e.target.closest("[data-hgstage]") && !e.target.closest("button");
    root.addEventListener("pointerdown", (e) => {
      if (!onStage(e)) return;
      e.stopPropagation();   // ui.js 의 기본 드래그(좌우만)와 겹치지 않게
      pts.set(e.pointerId, toGame(e.clientX, e.clientY, {}));   // 폰을 세로로 들어 화면을 돌렸으면 돌린 뒤 좌표로
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    }, true);
    addEventListener("pointermove", (e) => {
      const p = pts.get(e.pointerId);
      if (!p || this.screen !== "hangar") return;
      const q = toGame(e.clientX, e.clientY, {});
      if (pts.size >= 2) {
        p.x = q.x; p.y = q.y;
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) menu().studioZoom(pinch / d);
        pinch = d; return;
      }
      menu().studioDrag(q.x - p.x, q.y - p.y);
      p.x = q.x; p.y = q.y;
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
    addEventListener("pointerup", up); addEventListener("pointercancel", up);
    root.addEventListener("wheel", (e) => { if (!onStage(e)) return; e.preventDefault(); menu().studioZoom(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });
    // 카드에 마우스를 올리거나 패드·키보드로 초점을 주면 기체·비교 패널로 잠깐 미리 본다
    const hvOf = (e) => { const el = e.target.closest && e.target.closest("[data-hv]"); return el && root.contains(el) ? el.dataset.hv : null; };
    root.addEventListener("pointerover", (e) => { if (e.pointerType === "touch" || this.screen !== "hangar") return; const id = hvOf(e); if (id && id !== this._hgHov) this._hgHover((this._hgHov = id)); });
    root.addEventListener("pointerout", (e) => {
      if (!this._hgHov || this.screen !== "hangar") return;
      const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-hv]");
      if (to && to.dataset.hv === this._hgHov) return;
      if (hvOf(e) === this._hgHov) { this._hgHov = null; this._hgHover(null); }
    });
    root.addEventListener("focusin", (e) => { if (this.screen !== "hangar") return; const id = hvOf(e); if (id !== this._hgHov) { this._hgHov = id; this._hgHover(id); } });
  },

  // 지금 분류 (옛 탭 값에서 이어받는다)
  _hgCat() {
    const ok = (c) => c && (LOOK.some((x) => x[0] === c) || SETS.some((x) => x[0] === c) || c === "skill" || c === "quest" || (c.startsWith("part.") && GP.PARTS[c.slice(5)]));
    if (!ok(this._hc)) this._hc = this._gtab === "parts" ? `part.${this._pslot || GP.SLOTS[0]}` : this._gtab === "skill" || this._gtab === "quest" ? this._gtab : this._gtab === "theme" ? "theme" : this._gtab === "fx" ? "fx" : this._lcat && LOOK.some((x) => x[0] === this._lcat) ? this._lcat : "frame";
    const c = this._hc;
    this._gtab = c.startsWith("part.") ? "parts" : c === "skill" || c === "quest" ? c : c === "theme" || c === "fx" ? c : "look";
    if (c.startsWith("part.")) this._pslot = c.slice(5);
    if (LOOK.some((x) => x[0] === c)) this._lcat = c;
    return c;
  },
  // 고른 아이템 { kind, v } (없으면 지금 장착한 것)
  _hgEq(cat) {
    if (cat.startsWith("part.")) return GP.partOf(cat.slice(5)).v;
    if (cat === "fx") return null;
    if (cat === "theme") return Object.keys(GP.THEMES).find((id) => this._lon("theme", id)) || null;
    if (cat === "paint") return "on";
    return this._lids(cat).find((v) => this._lon(cat, v)) ?? null;
  },
  _hgSel(cat) {
    const s = this._hsel && this._hsel.cat === cat ? this._hsel : null;
    if (cat === "fx") { const k = s ? s.kind : `fx.${Object.keys(GP.FX)[0]}`, sl = k.slice(3); return { kind: k, v: s ? s.v : GP.fxEquipped(sl) }; }
    const kind = cat, v = s ? s.v : this._hgEq(cat);
    return { kind, v };
  },
  // 고른 아이템을 3D 기체에 반영 (미리보기 상태 정리)
  _hgSync(cat, sel) {
    const menu = this.game.menu;
    if (cat.startsWith("part.")) {
      const slot = cat.slice(5), cur = GP.partOf(slot).v;
      this._lpv = null; this._ppv = sel.v && sel.v !== cur ? { slot, v: sel.v } : null;
    } else if (cat === "skill" || cat === "quest" || cat === "fx" || !sel.v) { this._lpv = null; this._ppv = null; }
    else { this._ppv = null; this._lpv = cat !== "paint" && this._lon(cat, sel.v) ? null : { kind: cat, v: sel.v }; }
    if (this._hgHovKey) { this._hgHovKey = null; this._ptKey = "?"; }
    this._pvApply();
    menu.studioOn(true);
    menu.studioFocus(cat.startsWith("part.") ? cat.slice(5) : null);
  },

  // ── 분류별 목록 · 상세 ──
  _hgBody(cat) {
    if (cat === "quest") { this._hgSync(cat, {}); return { title: "퀘스트 · 업적", sub: "달성하면 바로 포인트", list: this._hgQuest() }; }
    if (cat === "skill") { this._hgSync(cat, {}); return this._hgSkill(); }
    const sel = this._hgSel(cat);
    this._hgSync(cat, sel);
    const items = this._hgItems(cat);
    const card = (it) => {
      const on = it.on, own = it.own, isSel = it.kind === sel.kind && it.v === sel.v, G = it.g !== null ? GP.GRADES[it.g] : null;
      const st = on ? `<i class="st eq">✔ 장착</i>` : own ? `<i class="st own">보유</i>` : it.lock ? `<i class="st lk">🔒</i>` : `<i class="st buy">◆ ${it.price.toLocaleString()}</i>`;
      return `<button class="hg-it ${isSel ? "sel" : ""} ${on ? "on" : ""} ${own ? "" : "lock"}" ${G ? `style="--gc:${G.c}"` : ""} data-a="hgsel" data-k="${it.kind}" data-v="${esc(it.v)}" data-hv="${it.kind}|${esc(it.v)}">
        <span class="tw">${it.thumb}${G ? gradeBadge(it.g, "c") : ""}${st}</span><b class="nm">${esc(it.name)}</b>${it.sub ? `<small class="sb">${esc(it.sub)}</small>` : ""}</button>`;
    };
    let list;
    if (cat === "fx") list = Object.entries(GP.FX).map(([slot, F]) => `<h5 class="hg-sh">${F.name}</h5><div class="hg-grid sm">${items.filter((x) => x.kind === `fx.${slot}`).map(card).join("")}</div>`).join("");
    else list = `<div class="hg-grid ${cat.startsWith("part.") ? "pt" : cat === "cls" || cat === "theme" ? "wide" : ""}">${items.map(card).join("")}</div>`;
    const title = cat.startsWith("part.") ? `${GP.PARTS[cat.slice(5)].icon} ${GP.PARTS[cat.slice(5)].name}` : (LOOK.concat(SETS).find((x) => x[0] === cat) || [0, cat])[1];
    const owned = items.filter((x) => x.own).length;
    const sub = cat === "cls" ? "비행 성능이 달라집니다" : cat === "fx" ? "전투 연출 · 능력치 없음" : `${owned}/${items.length} 보유`;
    const it = sel.v !== null && sel.v !== undefined ? items.find((x) => x.kind === sel.kind && x.v === sel.v) : null;
    // 무대 왼쪽 위: 고른 아이템 이름표
    const tag = it ? `<div class="hg-tag" ${it.g !== null ? `style="--gc:${GP.GRADES[it.g].c}"` : ""}><small>${it.on ? "장착 중" : "미리보기"} · ${esc(kindName(it.kind))}</small><b>${esc(it.name)}</b>${it.g !== null ? gradeBadge(it.g) : ""}</div>` : "";
    return { title, sub, list, det: it ? this._hgDet(it) : `<p class="hg-empty">아이템을 골라 보세요</p>`, tag };
  },
  // 분류의 아이템 목록 (등급 순)
  _hgItems(cat) {
    const out = [];
    const look = (kind, v) => {
      const own = this._lown(kind, v), on = this._lon(kind, v), g = kind === "cls" ? null : GP.gradeOf(kind, v);
      let sub = "", lock = false;
      if (kind === "frame") sub = (GP.LOOK_FX.frame[v] && GP.LOOK_FX.frame[v].tag) || "";
      if (kind === "cls") sub = (DRONE_CLASSES[v].desc || "").split(".")[0];
      if (kind === "theme") { const t = GP.THEMES[v]; lock = !own && t.need && !SY.chapterDone(story().chapters.find((c) => c.id === t.need) || { stages: [] }); sub = t.desc; }
      return { kind, v, name: itemName(kind, v), g, own, on: kind === "paint" ? own : on, price: this._lprice(kind, v), sub, lock, thumb: this._ithumb(kind, v) };
    };
    if (cat.startsWith("part.")) {
      const slot = cat.slice(5), Pt = GP.PARTS[slot], cur = GP.partOf(slot).v;
      const ids = Object.keys(Pt.variants);
      this.game.thumbs.want("part", ids.map((v) => `${slot}.${v}.${GP.partLv(slot, v)}`));
      for (const v of ids) {
        const V = Pt.variants[v], lv = GP.partLv(slot, v), key = `${slot}.${v}.${lv}`, url = this.game.thumbs.part[key];
        out.push({ kind: cat, v, name: V.name, g: GP.gradeOf(cat, v), own: GP.variantOwns(slot, v), on: cur === v, price: V.price, sub: `${V.tag} · Lv.${lv}${GP.oxLv(slot, v) ? `+${GP.oxLv(slot, v)}` : ""}`,
          thumb: `<span class="ith shot pt" data-thumb="part:${key}">${url ? `<img src="${url}" alt="">` : `<i class="ph"></i>`}</span>` });
      }
    } else if (cat === "fx") {
      for (const [slot, F] of Object.entries(GP.FX)) for (const [v, x] of Object.entries(F.items)) {
        const c = x.color ? "#" + x.color.toString(16).padStart(6, "0") : x.rainbow ? "conic-gradient(#f55,#fd5,#5f8,#5df,#a5f,#f55)" : "#3a4560";
        out.push({ kind: `fx.${slot}`, v, name: x.name, g: GP.gradeOf(`fx.${slot}`, v), own: GP.fxOwns(slot, v), on: GP.fxEquipped(slot) === v, price: x.price, thumb: `<span class="ith fxd" style="--c:${c}"><i></i></span>` });
      }
    } else if (cat === "theme") for (const id of Object.keys(GP.THEMES)) out.push(look("theme", id));
    else {
      if (cat === "frame" || cat === "canopy") this.game.thumbs.want(cat, this._lids(cat));
      for (const v of this._lids(cat)) out.push(look(cat, v));
    }
    if (cat !== "cls" && cat !== "fx") out.sort((a, b) => (a.g ?? 0) - (b.g ?? 0));
    return out;
  },

  // 상세: 등급 · 설명 · 능력치 비교(현재 → 이 아이템) · 구매/장착/업그레이드
  _hgDet(it) {
    const kind = it.kind, v = it.v, pts = GP.points(), G = it.g !== null ? GP.GRADES[it.g] : null;
    const isPart = kind.startsWith("part."), slot = isPart ? kind.slice(5) : null, V = isPart ? GP.PARTS[slot].variants[v] : null;
    let desc = "", tag = "";
    if (isPart) { desc = V.desc; tag = V.tag; }
    else if (kind === "frame") { desc = FRAMES[v].desc; tag = (GP.LOOK_FX.frame[v] && GP.LOOK_FX.frame[v].tag) || ""; }
    else if (kind === "canopy") desc = CANOPIES[v].desc;
    else if (kind === "skin") desc = SKINS[v].desc;
    else if (kind === "led") desc = { solid: "늘 같은 밝기로 켜 둔다", off: "LED 를 끈 은밀 비행", blink: "또렷하게 깜빡인다", rainbow: "무지개색이 천천히 흐른다", breathe: "숨 쉬듯 밝아졌다 어두워진다", strobe: "짧고 강하게 번쩍인다", police: "빨강·파랑이 번갈아 돈다" }[v] || "";
    else if (kind === "trail") desc = v === "off" ? "꼬리빛을 남기지 않는다" : "비행하는 동안 이 색의 꼬리빛을 남긴다";
    else if (kind === "preset") desc = COLOR_PRESETS[+v].desc || "프레임·포인트·프로펠러·LED 색을 한 번에 바꾼다";
    else if (kind === "theme") desc = `${GP.THEMES[v].desc} · 외형과 무기 효과를 한 번에`;
    else if (kind === "cls") desc = DRONE_CLASSES[v].desc;
    else if (kind === "paint") desc = "프레임·포인트·프로펠러·LED 색을 직접 칠한다";
    else if (kind.startsWith("fx.")) desc = "전투에서 보이는 연출만 바뀐다";

    // 능력치 비교
    let cmp = "", note = "";
    if (kind === "cls") {
      const A = DRONE_CLASSES[settings.drone.cls] || DRONE_CLASSES.freestyle, B = DRONE_CLASSES[v];
      const row = (nm, a, b, f, good = 1) => `<tr><th>${nm}</th><td>${f(a)}</td><td class="${Math.abs(b - a) < 1e-9 ? "" : (b - a) * good > 0 ? "up" : "dn"}">${f(b)}</td></tr>`;
      cmp = `<table class="hg-cmp"><thead><tr><th></th><th>현재</th><th>${it.on ? "현재" : "선택"}</th></tr></thead><tbody>${row("추력비", A.twr, B.twr, (x) => x.toFixed(1))}${row("최고 속도", A.pitchSpeed, B.pitchSpeed, (x) => `${x}m/s`)}${row("반응", A.rateTau, B.rateTau, (x) => `${Math.round(x * 1000)}ms`, -1)}${row("무게", A.mass, B.mass, (x) => `${Math.round(x * 1000)}g`, -1)}</tbody></table>`;
    } else if (isPart || GP.LOOK_KEY[kind] || kind === "theme") {
      const A = GP.loadout(), B = isPart ? GP.loadout({ slot, v }) : GP.loadout(null, statLook(patchOf(kind, v)));
      const keys = Object.keys(GP.STATS).filter((k) => Math.abs((B[k] || 0) - (A[k] || 0)) > 1e-9);
      if (keys.length) {
        cmp = `<table class="hg-cmp"><thead><tr><th>능력치</th><th>현재</th><th>바꾸면</th><th></th></tr></thead><tbody>${keys.map((k) => { const d = B[k] - A[k], good = GP.statGood(k, d); return `<tr><th>${GP.STATS[k].name}</th><td>${fmtVal(k, A[k])}</td><td class="${good ? "up" : "dn"}">${fmtVal(k, B[k])}</td><td class="d ${good ? "up" : "dn"}">${good ? "▲" : "▼"} ${fmtVal(k, d).replace(/^[+-]/, "")}</td></tr>`; }).join("")}</tbody></table>`;
      } else {
        // 바뀌는 것이 없으면(장착 중) 이 아이템이 주는 효과를 보여 준다
        const own = isPart ? (() => { const e = GP.partEffect(slot, v, GP.partLv(slot, v)); for (const [k, x] of Object.entries(GP.gradeBonus(kind, v))) e[k] = (e[k] || 0) + x; return e; })()
          : (() => { const e = {}; const pt = statLook(patchOf(kind, v)); for (const [lk, x] of Object.entries(pt)) { const kk = Object.keys(GP.LOOK_KEY).find((q) => GP.LOOK_KEY[q] === lk); for (const [k, n] of Object.entries(GP.gradeBonus(kk, x))) e[k] = (e[k] || 0) + n; if (kk === "frame") for (const [k, n] of Object.entries(GP.lookFx("frame", x) || {})) e[k] = (e[k] || 0) + n; } return e; })();
        const ks = Object.keys(own).filter((k) => GP.STATS[k] && Math.abs(own[k]) > 1e-9);
        cmp = ks.length ? `<table class="hg-cmp one"><thead><tr><th>장착 효과</th><th></th></tr></thead><tbody>${ks.map((k) => `<tr><th>${GP.STATS[k].name}</th><td class="${GP.statGood(k, own[k]) ? "up" : "dn"}">${fmtVal(k, own[k])}</td></tr>`).join("")}</tbody></table>` : `<p class="hg-nt">능력치 변화 없음</p>`;
      }
    } else note = kind === "paint" || kind === "preset" || kind.startsWith("fx.") ? "외형 전용 · 능력치 없음" : "";
    const gb = G && !kind.startsWith("fx.") && kind !== "preset" && kind !== "paint" && kind !== "theme" ? GP.gradeBonus(kind, v) : {};
    const gbx = G ? (Object.keys(gb).length ? `<div class="hg-gbx" style="--gc:${G.c}"><b>${G.name} 등급 보너스</b>${chips(gb)}</div>` : kind.startsWith("fx.") || kind === "preset" || kind === "paint" || kind === "theme" ? "" : it.g ? `<div class="hg-gbx" style="--gc:${G.c}"><b>${G.name} 등급</b><i class="nt">등급 보너스 없음</i></div>` : "") : "";

    // 버튼
    const btn = [];
    const lack = (p) => (pts >= p ? "" : `<span class="why">${(p - pts).toLocaleString()}P 부족</span>`);
    if (isPart) {
      const own = it.own, lv = GP.partLv(slot, v), ox = GP.oxLv(slot, v), id = `${slot}.${v}`;
      if (it.on) btn.push(`<span class="hg-st eq">✔ 장착 중</span>`);
      else if (own) btn.push(`<button class="primary small" data-a="gpart" data-v="${id}">장착</button>`);
      else btn.push(`<button class="primary small buy" data-a="gpart" data-v="${id}" ${pts >= V.price ? "" : "disabled"}>구매 · ${P(V.price)}</button>${lack(V.price)}`);
      const next = lv < 5 ? { ...V.per } : null;
      if (next && lv + 1 === 3) for (const [a, b] of Object.entries(V.b3)) next[a] = (next[a] || 0) + b;
      if (next && lv + 1 === 5) for (const [a, b] of Object.entries(V.b5)) next[a] = (next[a] || 0) + b;
      const cost = GP.upCost(slot, v, lv);
      const lvRow = `<div class="hg-lv"><span class="pips">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}${ox ? `<b class="ox">+${ox}</b>` : ""}</span><small>Lv.${lv}${ox ? ` · 돌파 +${ox}` : ""} · 단계마다 ${esc(GP.effText(V.per))}</small></div>
        <div class="hg-ms"><i class="${lv >= 3 ? "on" : ""}">${lv >= 3 ? "✔" : "🔒"} 3단계 · ${esc(GP.effText(V.b3))}</i><i class="${lv >= 5 ? "on" : ""}">${lv >= 5 ? "✔" : "🔒"} 5단계 · ${esc(GP.effText(V.b5))}</i></div>`;
      let up = "";
      if (!own) up = `<p class="hg-nt">구매하면 업그레이드할 수 있습니다</p>`;
      else if (lv < 5) up = `<div class="hg-up"><button class="primary small up" data-a="gup" data-v="${id}" ${pts < cost ? "disabled" : ""}>업그레이드 Lv.${lv + 1} · ${P(cost)}</button><small>다음: ${esc(GP.effText(next))}</small></div>`;
      else if (ox < GP.OX_MAX) up = `<div class="hg-up"><button class="primary small up ox" data-a="gox" data-v="${id}" ${GP.medals() < GP.OX_COST[ox] ? "disabled" : ""}>🎖 한계 돌파 +${ox + 1} · 훈장 ${GP.OX_COST[ox]}</button><small>돌파마다 ${esc(GP.effText(Object.fromEntries(Object.entries(V.per).map(([a, b]) => [a, b * GP.OX_K]))))}</small></div>`;
      else up = `<p class="hg-nt mx">★ 최대 단계 · 한계 돌파 +${GP.OX_MAX}</p>`;
      const base = V.base ? `<div class="hg-trait"><b>특성</b>${chips(V.base)}</div>` : "";
      return this._hgDetWrap(it, G, tag, desc, base + gbx + cmp + lvRow, btn.join("") + up);
    }
    if (kind.startsWith("fx.")) {
      const sl = kind.slice(3), x = GP.FX[sl].items[v];
      if (it.on) btn.push(`<span class="hg-st eq">✔ 장착 중</span>`);
      else if (it.own) btn.push(`<button class="primary small" data-a="hgfx" data-slot="${sl}" data-v="${v}">장착</button>`);
      else btn.push(`<button class="primary small buy" data-a="hgfx" data-slot="${sl}" data-v="${v}" ${pts >= x.price ? "" : "disabled"}>구매 · ${P(x.price)}</button>${lack(x.price)}`);
      return this._hgDetWrap(it, G, GP.FX[sl].name, desc, `<p class="hg-nt">${note}</p>`, btn.join(""));
    }
    // 외형 · 테마 · 기체 등급
    const chg = !it.on || kind === "paint";
    if (kind === "paint") {
      if (it.own) btn.push(`<div class="hg-paint">${[["frameColor", "프레임"], ["accentColor", "포인트"], ["propColor", "프로펠러"], ["ledColor", "LED"]].map(([k, l]) => `<label><input type="color" value="${settings.drone[k]}" data-set="drone.${k}"><span>${l}</span></label>`).join("")}</div>`);
      else btn.push(`<button class="primary small buy" data-a="glbuy" ${pts >= it.price ? "" : "disabled"}>구매 · ${P(it.price)}</button>${lack(it.price)}`);
    } else if (it.on) btn.push(`<span class="hg-st eq">✔ 장착 중</span>`);
    else if (it.lock) btn.push(`<span class="hg-st lk">🔒 ${GP.THEMES[v].need.startsWith("e") ? "에이아 연대기" : "별의 저편"} 클리어 필요</span>`);
    else if (it.own) btn.push(`<button class="primary small" data-a="glapply">${kind === "frame" || kind === "cls" || kind === "theme" ? "장착" : "적용"}</button>`);
    else btn.push(`<button class="primary small buy" data-a="glbuy" ${pts >= it.price ? "" : "disabled"}>구매 · ${P(it.price)}</button>${lack(it.price)}`);
    if (chg && kind !== "paint") btn.push(`<button class="ghost small" data-a="hgrevert">↺ 원래대로</button>`);
    if (kind === "canopy") btn.push(`<span class="hg-props">프로펠러 ${[["2", "2엽"], ["3", "3엽"]].map(([k, l]) => `<button class="chip ${String(settings.drone.props) === k ? "on" : ""}" data-a="set" data-k="drone.props" data-v="${k}">${l}</button>`).join("")}</span>`);
    return this._hgDetWrap(it, G, tag, desc, gbx + (cmp || (note ? `<p class="hg-nt">${note}</p>` : "")), btn.join(""));
  },
  _hgDetWrap(it, G, tag, desc, mid, btns) {
    return `<div class="hg-dh" ${G ? `style="--gc:${G.c}"` : ""}>
        <div class="hg-dn">${G ? gradeBadge(it.g) : ""}<b>${esc(it.name)}</b>${tag ? `<i class="tag">${esc(tag)}</i>` : ""}</div>
        ${desc ? `<p class="hg-ds">${esc(desc)}</p>` : ""}</div>
      <div class="hg-dm">${mid}</div>
      <div class="hg-da">${btns}</div>`;
  },

  // 무대 아래: 종합 성능 막대 (현재 → 미리보기)
  _hgRate(hover) {
    let pv = null, lo = null;
    const h = hover || null;
    if (h && h.kind.startsWith("part.")) pv = { slot: h.kind.slice(5), v: h.v };
    else if (h) lo = statLook(patchOf(h.kind, h.v));
    else if (this._ppv) pv = this._ppv;
    else if (this._lpv) lo = statLook(patchOf(this._lpv.kind, this._lpv.v));
    const R0 = GP.ratings(GP.loadout()), R1 = pv || lo ? GP.ratings(GP.loadout(pv, lo)) : R0;
    const w = (x) => Math.round(Math.max(0, Math.min(1, (x - 0.5) / 1.3)) * 1000) / 10, pc = (x) => `${x >= 1 ? "+" : ""}${Math.round((x - 1) * 100)}%`;
    return `<div class="hg-rate">${GP.RATINGS.map(([k, nm]) => {
      const a = w(R0[k]), b = w(R1[k]), d = Math.round((R1[k] - R0[k]) * 100);
      return `<div class="hg-r"><span>${nm}</span><div class="bar"><i class="cur" style="width:${Math.min(a, b)}%"></i><i class="dl ${b >= a ? "up" : "dn"}" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%"></i></div><em>${d ? `<b class="${d > 0 ? "up" : "dn"}">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</b>` : pc(R0[k])}</em></div>`;
    }).join("")}</div>`;
  },
  // 잠깐 올려 본 아이템: 기체 · 성능 막대 · 상세 패널을 그 아이템으로 (null 이면 고른 것으로 되돌린다)
  _hgHover(id) {
    if (this.screen !== "hangar") return;
    const cat = this._hc || "";
    let h = null;
    if (id) { const i = id.indexOf("|"); h = { kind: id.slice(0, i), v: id.slice(i + 1) }; }
    if (h && (h.kind === "cls" || h.kind === "paint")) h = null;
    const menu = this.game.menu;
    if (h && h.kind.startsWith("part.")) { this._pvApply({ slot: h.kind.slice(5), v: h.v }); }
    else if (h && !h.kind.startsWith("fx.")) {
      const key = `hv:${h.kind}:${h.v}`;
      if (this._ptKey !== key) { this._ptKey = key; this._hgHovKey = key; menu.setLook({ ...settings.drone, ...patchOf(h.kind, h.v) }, GP.partLook(this._ppv)); }
    } else { this._hgHovKey = null; this._pvApply(); }
    const rate = this.root.querySelector(".hg-rate");
    if (rate) rate.outerHTML = this._hgRate(h && !h.kind.startsWith("fx.") ? h : null);
    // 상세 패널
    const det = this.root.querySelector(".hg-det");
    if (det && cat !== "skill" && cat !== "quest") {
      const items = this._hgItems(cat), sel = this._hgSel(cat), want = h || sel, it = items.find((x) => x.kind === want.kind && x.v === want.v);
      if (it) { det.innerHTML = this._hgDet(it); det.classList.toggle("hov", !!h && !(h.kind === sel.kind && h.v === sel.v)); }
    }
  },

  // ── 스킬 ──
  _hgSkill() {
    const eq = GP.skillEquipped(), pv = this._skPv || eq, ck = (c) => "#" + c.toString(16).padStart(6, "0"), pts = GP.points();
    const list = `<div class="hg-sk">${Object.entries(GP.SKILLS).map(([id, k]) => {
      const own = GP.skillOwns(id), on = eq === id, lv = GP.skillLvEff(id);
      return `<button class="hg-ski ${pv === id ? "sel" : ""} ${on ? "on" : ""} ${own ? "" : "lock"}" style="--k:${ck(k.color)}" data-a="gskpv" data-v="${id}"><span class="ic">${k.icon}</span><span class="tx"><b>${k.name}</b><small>${k.tag}</small></span><span class="st">${on ? "✔ 장착" : own ? `Lv.${lv}` : `◆ ${k.price.toLocaleString()}`}</span></button>`;
    }).join("")}</div>`;
    const id = pv, k = GP.SKILLS[id], own = GP.skillOwns(id), on = eq === id, lv = GP.skillLv(id), st = GP.skillStat(id, GP.skillLvEff(id)), nx = lv < GP.SKILL_MAX ? GP.skillStat(id, lv + 1) : null, ms = GP.skillMilestone(id), cost = GP.SKILL_UP_COST[lv - 1], ox = GP.skillOx(id);
    const rows = GP.skillRows(id).map(([key, nm, un]) => `<tr><th>${nm}</th><td>${st[key]}${un}</td><td class="${nx && nx[key] !== st[key] ? "up" : ""}">${nx && nx[key] !== st[key] ? `${nx[key]}${un}` : "–"}</td></tr>`).join("");
    let act = on ? `<span class="hg-st eq">✔ 장착 중</span>` : own ? `<button class="primary small" data-a="gskill" data-v="${id}">장착</button>` : `<button class="primary small buy" data-a="gskill" data-v="${id}" ${pts < k.price ? "disabled" : ""}>구매 · ${P(k.price)}</button>`;
    if (own) act += nx ? `<button class="primary small up" data-a="gskup" data-v="${id}" ${pts < cost ? "disabled" : ""}>강화 Lv.${lv + 1} · ${P(cost)}</button>` : ox < GP.OX_MAX ? `<button class="primary small up ox" data-a="gskox" data-v="${id}" ${GP.medals() < GP.OX_COST[ox] ? "disabled" : ""}>🎖 한계 돌파 Lv.${6 + ox} · 훈장 ${GP.OX_COST[ox]}</button>` : `<span class="hg-nt mx">★ 한계 돌파 Lv.${5 + GP.OX_MAX}</span>`;
    const det = `<div class="hg-dh" style="--gc:${ck(k.color)}"><div class="hg-dn"><b>${k.icon} ${k.name}</b><i class="tag">Lv.${GP.skillLvEff(id)}</i></div><p class="hg-ds">${esc(GP.skillDesc(id, lv))} · 게이지 ${st.cost}%${st.dur ? ` · ${st.dur}초` : ""}</p></div>
      <div class="hg-dm"><table class="hg-cmp"><thead><tr><th></th><th>지금</th><th>다음 Lv</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="hg-ms"><i class="${lv >= 3 ? "on" : ""}">${lv >= 3 ? "✔" : "🔒"} Lv.3 · ${esc(ms.m3)}</i><i class="${lv >= 5 ? "on" : ""}">${lv >= 5 ? "✔" : "🔒"} Lv.5 · ${esc(ms.m5)}</i></div></div>
      <div class="hg-da">${act}</div>`;
    return { title: "스킬", sub: "하나만 장착 · 전투 중 게이지로 발동", list, det };
  },
  // ── 퀘스트 · 업적 · 최근 보상 ──
  _hgQuest() {
    const q = GP.quests(), rin = GP.resetIn(), hm = (ms) => `${Math.floor(ms / 3600000)}시간 ${Math.floor((ms % 3600000) / 60000)}분`;
    const qrow = (x) => { const cur = x.unit === "s" ? Math.floor(x.prog / 60) : x.prog, max = x.unit === "s" ? x.n / 60 : x.n; return `<div class="q ${x.done ? "done" : ""}"><div class="qt"><b>${esc(x.text)}</b><span>${x.done ? "✔ 완료" : `${cur} / ${max}`}</span></div><div class="b"><i style="width:${Math.round((x.prog / x.n) * 100)}%"></i></div><em>+${x.pts}P</em></div>`; };
    const dr = GP.drops().slice(-6).reverse();
    return `<h5 class="hg-sh">일일 퀘스트 <small>초기화까지 ${hm(rin.daily)}</small></h5>${q.daily.map(qrow).join("")}<div class="qb ${q.dailyBonus ? "done" : ""}">모두 달성 보너스 +${GP.DAILY_BONUS}P ${q.dailyBonus ? "✔" : ""}</div>
      <h5 class="hg-sh">주간 퀘스트 <small>초기화까지 ${hm(rin.weekly)}</small></h5>${q.weekly.map(qrow).join("")}<div class="qb ${q.weeklyBonus ? "done" : ""}">모두 달성 보너스 +${GP.WEEKLY_BONUS}P ${q.weeklyBonus ? "✔" : ""}</div>
      <h5 class="hg-sh">최근 임무 보상 <small>승리하면 무작위 등급 장비</small></h5>${dr.length ? `<div class="hg-drops">${dr.map(dropCard).join("")}</div>` : `<p class="hg-nt">아직 받은 보상이 없습니다. 임무에서 이기면 장비가 나옵니다.</p>`}
      <h5 class="hg-sh">업적</h5><div class="achs">${GP.ACH.map((a) => { const st = GP.achState(a), dv = a.div || 1; return `<div class="ach ${st.max ? "done" : ""}"><b>${a.name}</b><small>${st.max ? "모든 단계 달성" : `${Math.floor(st.v / dv)} / ${a.tiers[st.got] / dv}${a.unit} · 다음 +${a.pts[st.got]}P`}</small><span class="tiers">${a.tiers.map((_, n) => `<i class="${n < st.got ? "on" : ""}"></i>`).join("")}</span></div>`; }).join("")}</div>`;
  },

  // ── 동작 ──
  a_hgcat(v) {
    this._hc = v; this._hsel = null; this._skPv = null; this._hgHov = null;
    this._lpv = null; this._ppv = null;
    this._hgCat(); this.redraw();
    const l = this.root.querySelector(".hg-list"); if (l) l.scrollTop = 0;
  },
  a_hgsel(v, el) {
    const kind = el.dataset.k, cat = this._hc;
    this._hsel = { cat, kind, v };
    this._hgHov = null;
    this.redraw();
  },
  a_hgrevert() { this._hsel = null; this.redraw(); },
  a_hgview(v) { const m = this.game.menu; if (v === "in") m.studioZoom(1 / 1.25); else if (v === "out") m.studioZoom(1.25); else { m.studioReset(); m.studioFocus((this._hc || "").startsWith("part.") ? this._hc.slice(5) : null); } },
  a_hgfx(v, el) {
    const slot = el.dataset.slot, it = GP.FX[slot] && GP.FX[slot].items[v];
    if (!it) return;
    if (!GP.fxOwns(slot, v)) {
      if (!GP.fxBuy(slot, v)) return (this._gnote(`포인트가 부족합니다 (${it.price.toLocaleString()}P 필요)`, true), this.redraw());
      this._gnote(`「${it.name}」 구매 · -${it.price.toLocaleString()}P`);
    } else this._gnote(`「${it.name}」 장착`);
    GP.fxEquip(slot, v); this.redraw();
  },
  a_gq() { this._hc = "quest"; this.show("hangar"); },
  // 업그레이드 (등급별 비용)
  a_gup(v) {
    const [slot, k] = v.split("."), V = GP.PARTS[slot] && GP.PARTS[slot].variants[k];
    if (!V) return;
    const lv = GP.partLv(slot, k), cost = GP.upCost(slot, k, lv);
    if (!GP.upgrade(slot, k)) return (this._gnote(lv >= 5 ? "이미 최대 단계입니다" : `포인트가 부족합니다 (${cost.toLocaleString()}P 필요)`, true), this.redraw());
    const nl = lv + 1;
    this._gnote(`${V.name} Lv.${nl}${nl === 3 ? ` · 추가 효과: ${GP.effText(V.b3)}` : nl === 5 ? ` · 추가 효과: ${GP.effText(V.b5)}` : ""}`);
    this._ptKey = "?"; this.redraw();   // 단계가 오르면 기체 모습도 바뀐다
  },
};

export function installHangar(UI) {
  Object.assign(UI.prototype, H);
  // 화면이 바뀔 때마다: 정비소면 정비소 카메라를 켜고, 아니면 끈다
  const sync = UI.prototype._syncStage;
  UI.prototype._syncStage = function () {
    const scr = this.screen === "hangar" && this.root.querySelector(".screen.hg");
    if (scr) {
      const c = hgSize(); scr.classList.toggle("nar", c === "nar"); scr.classList.toggle("lo", c === "lo");
      // 다시 그리면 분류 목록 스크롤이 처음으로 돌아가므로, 고른 분류가 보이게 맞춘다
      const nav = scr.querySelector(".hg-nav"), on = nav && nav.querySelector(".hg-c.on");
      if (on) { if (c === "nar") nav.scrollLeft = on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2; else if (on.offsetTop + on.offsetHeight > nav.clientHeight) nav.scrollTop = on.offsetTop - nav.clientHeight / 2; }
    }
    // 들어올 때 한 번: 패널이 펼쳐지고 기체가 스캔되며 나타난다
    if (scr && !this._hgIn) {
      this._hgIn = true; scr.classList.add("enter");
      setTimeout(() => { if (this.game.menu.studioScan) this.game.menu.studioScan(); }, 0);
      this.game.sound.play("uiopen");
    } else if (!scr) this._hgIn = false;
    sync.call(this);
    const m = this.game.menu, on = this.screen === "hangar" && this._gtab !== "skill";
    if (m.studioOn) { m.studioOn(on); if (on) m.studioFocus((this._hc || "").startsWith("part.") ? this._hc.slice(5) : null); }
  };
  // 장착·구매·강화 알림이 뜰 때 무대에 등급 색 이펙트와 효과음 (알림 문구로 종류를 가린다)
  const note = UI.prototype._gnote;
  UI.prototype._gnote = function (t, bad = false) {
    note.call(this, t, bad);
    if (!bad && this.screen === "hangar") requestAnimationFrame(() => this._hgFx(String(t)));
  };
  UI.prototype._hgFx = function (t) {
    const scr = this.root.querySelector(".screen.hg"); if (!scr) return;
    const dh = scr.querySelector(".hg-dh"), gc = ((dh && getComputedStyle(dh).getPropertyValue("--gc")) || "#5ff0ff").trim() || "#5ff0ff";
    const buy = /구매/.test(t), lv = (t.match(/Lv\.(\d)/) || [])[1], hi = /#b86bff|#ffaa2b/i.test(gc);
    const ox = /한계 돌파/.test(t), big = (buy && hi) || lv === "5" || ox;
    const snd = this.game.sound;
    if (ox) { snd.play("upgrade"); setTimeout(() => snd.play("upmax"), 180); }
    else if (lv) snd.play(lv === "5" ? "upmax" : "upgrade");
    else if (buy) { snd.play("upgrade"); if (hi) setTimeout(() => snd.play("upmax"), 180); }
    else snd.play("uiopen");
    const slot = (this._hc || "").startsWith("part.") ? this._hc.slice(5) : null;
    const m = this.game.menu; if (m.studioBurst) m.studioBurst(gc, slot, big);
    const st = scr.querySelector(".hg-stage");
    if (st) { const b = document.createElement("div"); b.className = "hg-burst" + (big ? " big" : ""); b.style.setProperty("--gc", gc);
      if (buy || lv || ox) b.innerHTML = `<b>${ox ? "LIMIT BREAK" : lv ? (lv === "5" ? "MAX" : "UPGRADE") : "ACQUIRED"}</b>`;
      st.appendChild(b); setTimeout(() => b.remove(), 1300); }
  };
  // 부품 카드 썸네일은 data-thumb="part:슬롯.부품.단계" — ui.js 의 thumbs.onReady 가 같은 규칙으로 그림을 끼운다
}
