// 격납고 경제: 포인트 · 퀘스트(일일/주간) · 업적 · 상점(외형·테마·효과) · 파츠(슬롯별 부품 교체 + 부품별 단계 업그레이드) · 스킬 강화
// 저장: records.gp = { pts, earned, owned:{}, eq:{}, parts:{slot:{v, lv:{부품:단계}}}, own:{slot:[부품]}, sk:{스킬:레벨}, stat:{}, ach:{}, daily:{key,list}, weekly:{key,list} }
import { records, save, settings } from "./config.js";
import { SKILLS, SKILL_DEF, SKILL_MAX, skillStat, skillRows, skillMilestone, skillDesc } from "./skilldefs.js";

// ── 저장 상태 ──
let checked = null;   // 마지막으로 점검한 저장 객체 (옛 형식은 한 번만 고친다)
function S() {
  if (!records.gp || typeof records.gp !== "object" || Array.isArray(records.gp)) {
    records.gp = { pts: 300, earned: 0, owned: {}, eq: {}, parts: {}, own: {}, sk: {}, stat: {}, ach: {}, daily: null, weekly: null };
    // 격납고 이전에 이미 쓰던 외형은 그대로 쓸 수 있게
    const d = settings.drone, o = records.gp.owned;
    o[`frame:${d.frame}`] = o[`canopy:${d.canopy}`] = o[`skin:${d.skin}`] = o[`led:${d.ledMode}`] = o[`trail:${d.trail}`] = 1;
  }
  if (checked !== records.gp) { checked = records.gp; try { migrate(checked); } catch (_) { checked.parts = {}; checked.own = {}; checked.sk = {}; } }
  return records.gp;
}
// 옛 저장 → 지금 형식. 옛 파츠는 슬롯마다 단계가 하나({v, lv:숫자}) 였다: 그 단계를 같은 슬롯의 기본 부품(과 쓰던 부품)에 넘긴다.
// 옛 "아이템 모듈" 슬롯은 "실드 발생기" 로 이어진다. 어떤 값이 와도 던지지 않는다
function migrate(s) {
  const obj = (v) => v && typeof v === "object" && !Array.isArray(v);
  for (const k of ["owned", "eq", "parts", "own", "sk", "stat", "ach"]) if (!obj(s[k])) s[k] = {};
  if (!(s.pts >= 0)) s.pts = 0;
  if (!(s.earned >= 0)) s.earned = 0;
  if (s.parts.module !== undefined) { if (s.parts.shield === undefined) s.parts.shield = s.parts.module; delete s.parts.module; }
  if (s.own.module !== undefined) { s.own.shield = [...(Array.isArray(s.own.shield) ? s.own.shield : []), ...(Array.isArray(s.own.module) ? s.own.module : [])]; delete s.own.module; }
  for (const slot of Object.keys(s.own)) if (!Array.isArray(s.own[slot])) s.own[slot] = [];
  for (const slot of Object.keys(s.parts)) {
    const p = s.parts[slot], Pt = PARTS[slot];
    if (!Pt || !obj(p)) { delete s.parts[slot]; continue; }
    const v = Pt.variants[p.v] ? p.v : "std", lv = {};
    if (obj(p.lv)) { for (const [k, n] of Object.entries(p.lv)) if (Pt.variants[k]) lv[k] = Math.max(0, Math.min(5, Math.floor(+n) || 0)); }
    else { const n = Math.max(0, Math.min(5, Math.floor(+p.lv) || 0)); if (n) { lv.std = n; if (v !== "std") lv[v] = n; } }
    s.parts[slot] = { v, lv };
  }
  for (const id of Object.keys(s.sk)) { const n = Math.floor(+s.sk[id]) || 1; s.sk[id] = Math.max(1, Math.min(SKILL_MAX, n)); }
}
export const points = () => S().pts;
let listeners = [];
export const onChange = (f) => listeners.push(f);
function changed() { save(); for (const f of listeners) f(); }
let toastFn = null;   // 비행 중 알림 (세션 HUD)
export const setToast = (f) => (toastFn = f);
function notify(text, color = "#ffd24a") { if (toastFn) toastFn(text, color); pending.push({ text, color }); if (pending.length > 12) pending.shift(); }
const pending = [];
export const takeNotices = () => pending.splice(0);

export function addPoints(n, why) {
  const s = S();
  s.pts += n; s.earned += n;
  changed();
  if (why) notify(`+${n}P  ${why}`);
}
export function spend(n) {
  const s = S();
  if (s.pts < n) return false;
  s.pts -= n; changed();
  return true;
}

// ── 퀘스트 ──
// ev: 이벤트 이름, n: 목표치. 진행은 ev() 로 쌓인다
const DAILY_POOL = [
  { id: "d_kill", ev: "kill", n: 12, pts: 120, text: "적 기체 12대 격추" },
  { id: "d_gate", ev: "gate", n: 40, pts: 100, text: "레이스 게이트 40개 통과" },
  { id: "d_trick", ev: "trick", n: 15, pts: 100, text: "트릭 15회 성공" },
  { id: "d_fly", ev: "fly", n: 300, pts: 80, text: "비행 5분", unit: "s" },
  { id: "d_item", ev: "item", n: 6, pts: 90, text: "아이템 6회 사용" },
  { id: "d_missile", ev: "missileHit", n: 6, pts: 110, text: "미사일 6발 명중" },
  { id: "d_stars", ev: "stars", n: 5, pts: 120, text: "별 5개 획득" },
  { id: "d_finish", ev: "finish", n: 3, pts: 90, text: "게임 3판 완료" },
  { id: "d_win", ev: "win", n: 2, pts: 120, text: "2번 승리(1위·임무 성공)" },
  { id: "d_turret", ev: "turret", n: 4, pts: 100, text: "포탑·지상 유닛 4개 파괴" },
  { id: "d_capture", ev: "capture", n: 3, pts: 120, text: "점령전 거점 3회 점령" },
  { id: "d_track", ev: "trackGood", n: 1, pts: 90, text: "트래킹 별 2개 이상 1회" },
];
const WEEKLY_POOL = [
  { id: "w_kill", ev: "kill", n: 80, pts: 600, text: "적 기체 80대 격추" },
  { id: "w_boss", ev: "boss", n: 3, pts: 600, text: "보스·중간 보스 3기 격파" },
  { id: "w_story", ev: "story", n: 4, pts: 700, text: "스토리 단계 4개 클리어" },
  { id: "w_gate", ev: "gate", n: 250, pts: 500, text: "레이스 게이트 250개 통과" },
  { id: "w_trick", ev: "trick", n: 100, pts: 500, text: "트릭 100회 성공" },
  { id: "w_fly", ev: "fly", n: 2400, pts: 500, text: "비행 40분", unit: "s" },
  { id: "w_stars", ev: "stars", n: 30, pts: 600, text: "별 30개 획득" },
  { id: "w_lesson", ev: "lesson", n: 3, pts: 500, text: "비행훈련 과목 3개 통과" },
  { id: "w_win", ev: "win", n: 10, pts: 650, text: "10번 승리" },
];
export const DAILY_BONUS = 150, WEEKLY_BONUS = 800;

function dayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function weekKey(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()), dow = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - dow);   // 그 주 월요일
  return "W" + dayKey(t);
}
function seeded(key) { let h = 2166136261; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
function pick(pool, n, key) {
  const r = seeded(key), a = [...pool];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n).map((q) => ({ id: q.id, prog: 0, done: false }));
}
export function quests() {
  const s = S(), dk = dayKey(), wk = weekKey();
  let dirty = false;
  if (!s.daily || s.daily.key !== dk) { s.daily = { key: dk, list: pick(DAILY_POOL, 3, dk), bonus: false }; dirty = true; }
  if (!s.weekly || s.weekly.key !== wk) { s.weekly = { key: wk, list: pick(WEEKLY_POOL, 3, wk), bonus: false }; dirty = true; }
  if (dirty) save();
  const full = (q, pool) => Object.assign({}, pool.find((p) => p.id === q.id), q);
  return { daily: s.daily.list.map((q) => full(q, DAILY_POOL)), weekly: s.weekly.list.map((q) => full(q, WEEKLY_POOL)), dailyBonus: s.daily.bonus, weeklyBonus: s.weekly.bonus };
}
// 다음 초기화까지 남은 시간(ms)
export function resetIn() {
  const now = new Date(), tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (8 - ((now.getDay() + 6) % 7 + 1)));
  return { daily: tom - now, weekly: mon - now };
}

// ── 업적: 누적 기록이 단계를 넘을 때마다 포인트 ──
export const ACH = [
  { id: "kill", name: "격추왕", ev: "kill", tiers: [10, 50, 200, 600, 1500], pts: [100, 250, 500, 900, 1500], unit: "대" },
  { id: "gate", name: "게이트 러너", ev: "gate", tiers: [50, 300, 1000, 3000], pts: [100, 250, 500, 1000], unit: "개" },
  { id: "trick", name: "곡예사", ev: "trick", tiers: [30, 200, 800, 2500], pts: [100, 250, 500, 1000], unit: "회" },
  { id: "fly", name: "하늘의 시간", ev: "fly", tiers: [600, 3600, 14400, 36000], pts: [100, 300, 600, 1200], unit: "분", div: 60 },
  { id: "stars", name: "별 수집가", ev: "stars", tiers: [10, 50, 150, 400], pts: [150, 300, 600, 1200], unit: "개" },
  { id: "boss", name: "거인 사냥꾼", ev: "boss", tiers: [1, 5, 15, 40], pts: [150, 300, 600, 1200], unit: "기" },
  { id: "story", name: "이야기꾼", ev: "story", tiers: [5, 15, 30, 55], pts: [200, 400, 800, 1500], unit: "단계" },
  { id: "missile", name: "명사수", ev: "missileHit", tiers: [10, 60, 250, 800], pts: [100, 250, 500, 1000], unit: "발" },
  { id: "capture", name: "정복자", ev: "capture", tiers: [5, 30, 120], pts: [150, 400, 900], unit: "회" },
  { id: "item", name: "아이템 장인", ev: "item", tiers: [10, 80, 300], pts: [100, 250, 600], unit: "회" },
];
export function achState(a) {
  const s = S(), v = s.stat[a.ev] || 0, got = s.ach[a.id] || 0;
  return { v, got, next: a.tiers[got], max: got >= a.tiers.length };
}

// ── 이벤트: 게임 곳곳에서 호출 ──
export function ev(name, n = 1) {
  if (!n) return;
  const s = S();
  s.stat[name] = (s.stat[name] || 0) + n;
  const q = quests();
  let any = false;
  for (const [key, bonus, label, pool, list] of [["daily", DAILY_BONUS, "일일", DAILY_POOL, s.daily.list], ["weekly", WEEKLY_BONUS, "주간", WEEKLY_POOL, s.weekly.list]]) {
    for (const it of list) {
      if (it.done) continue;
      const def = pool.find((p) => p.id === it.id);
      if (def.ev !== name) continue;
      it.prog = Math.min(def.n, it.prog + n); any = true;
      if (it.prog >= def.n) { it.done = true; addPoints(def.pts, `${label} 퀘스트 달성 · ${def.text}`); }
    }
    const box = s[key];
    if (!box.bonus && list.every((x) => x.done)) { box.bonus = true; addPoints(bonus, `${label} 퀘스트 모두 달성 보너스`); }
  }
  for (const a of ACH) {
    if (a.ev !== name) continue;
    let got = s.ach[a.id] || 0;
    while (got < a.tiers.length && s.stat[name] >= a.tiers[got]) { addPoints(a.pts[got], `업적 「${a.name}」 ${got + 1}단계`); got++; s.ach[a.id] = got; any = true; }
  }
  if (any) save();
  else if (Math.random() < 0.05) save();   // 비행 시간 같은 잦은 이벤트는 가끔만 저장
  void q;
}

// 게임 한 판이 끝났을 때: 결과 보상
export function onResult(cfg, r) {
  const stars = r.stars || 0, win = r.win !== false && (r.win === true || stars > 0);
  let pts = 25 + stars * 15 + (r.win ? 25 : 0);
  if (cfg.mode === "training") pts = 20 + stars * 10;
  const lines = [{ label: "기본 보상", value: `+${25 + (cfg.mode === "training" ? -5 : 0)}P` }];
  if (stars) lines.push({ label: `별 ${stars}개`, value: `+${stars * (cfg.mode === "training" ? 10 : 15)}P` });
  if (r.win && cfg.mode !== "training") lines.push({ label: "승리", value: "+25P" });
  if (r.story && r.story.passed && r.story.first) { pts += 100; lines.push({ label: "스토리 첫 클리어", value: "+100P" }); }
  addPoints(pts);
  ev("finish");
  if (win) ev("win");
  if (stars) ev("stars", stars);
  if (cfg.mode === "tracking" && stars >= 2) ev("trackGood");
  if (r.story && r.story.passed && r.story.first) ev("story");
  if (r.training && r.training.passed) ev("lesson");
  return { pts, lines, notices: takeNotices() };
}

// ── 상점: 외형 · 테마 · 효과 ──
// key: "frame:hexa" 처럼 종류:값. price 0 = 기본 제공
export const SHOP = {
  frame: { name: "프레임", items: { x: 0, stretch: 300, deadcat: 300, tri: 450, whoop: 500, hexa: 700, cross: 600, raptor: 750, viper: 800, phantom: 1000 } },
  canopy: { name: "캐노피", items: { pod: 0, racer: 200, battery: 200, cine: 250 } },
  skin: { name: "스킨", items: { solid: 0, stripe: 250, camo: 300, hazard: 350, carbon: 400, flame: 500 } },
  led: { name: "LED", items: { solid: 0, off: 0, blink: 120, rainbow: 450 } },
  trail: { name: "연기 꼬리", items: { off: 0, "#ffffff": 100, "#ff5a1f": 200, "#21d4fd": 200, "#ff2bd6": 200, "#3dff7c": 200 } },
  preset: { name: "색 조합", items: { 0: 0, 1: 150, 2: 150, 3: 200, 4: 150, 5: 250 } },
  paint: { name: "커스텀 페인트", items: { on: 600 } },
};
// 효과: 레이저(색·형태), 미사일, 부스트, 아이템 사용
export const FX = {
  laser: { name: "레이저 색", def: "sky", items: {
    sky: { name: "하늘", price: 0, color: 0x4dd8ff }, lime: { name: "라임", price: 250, color: 0x7dff4a }, gold: { name: "금빛", price: 350, color: 0xffd24a },
    rose: { name: "장미", price: 300, color: 0xff4a8a }, violet: { name: "보라", price: 350, color: 0xb36bff }, white: { name: "백광", price: 400, color: 0xf4f8ff }, red: { name: "진홍", price: 400, color: 0xff2d3d } } },
  beam: { name: "레이저 형태", def: "pulse", items: {
    pulse: { name: "펄스", price: 0, wk: 1, spark: 1 }, heavy: { name: "헤비 빔", price: 500, wk: 1.7, spark: 1.4 }, needle: { name: "니들", price: 400, wk: 0.65, spark: 0.8 }, nova: { name: "노바", price: 800, wk: 1.25, spark: 2.2 } } },
  missile: { name: "미사일 불꽃", def: "amber", items: {
    amber: { name: "앰버", price: 0, color: 0xffa030 }, ice: { name: "아이스", price: 250, color: 0x6ad8ff }, toxic: { name: "톡식", price: 250, color: 0x8dff4a }, plasma: { name: "플라즈마", price: 400, color: 0xd06bff }, white: { name: "화이트", price: 300, color: 0xffffff } } },
  boost: { name: "부스트 효과", def: "none", items: {
    none: { name: "없음", price: 0 }, flame: { name: "화염", price: 300, color: 0xff7a2a }, plasma: { name: "플라즈마", price: 400, color: 0x6ad8ff }, aurora: { name: "오로라", price: 600, rainbow: true }, void: { name: "보이드", price: 500, color: 0xa040ff } } },
  item: { name: "아이템 사용 효과", def: "none", items: {
    none: { name: "없음", price: 0 }, gold: { name: "금빛 고리", price: 250, color: 0xffd24a }, neon: { name: "네온 고리", price: 300, color: 0x21d4fd }, star: { name: "별가루", price: 450, color: 0xfff0a0, burst: true } } },
};
// 테마: 외형·효과를 한 번에 바꾸는 세트
export const THEMES = {
  silver: { name: "은빛 편대", price: 900, desc: "은빛 편대장 기체를 본뜬 냉철한 은청색", look: { frame: "x", canopy: "racer", skin: "stripe", frameColor: "#cfd9e6", accentColor: "#4aa3ff", propColor: "#9fd2ff", ledColor: "#4aa3ff", ledMode: "solid" }, fx: { laser: "sky", beam: "needle", missile: "ice", boost: "plasma", item: "neon" } },
  baekya: { name: "백야", price: 1100, desc: "라이벌의 순백 최신예기", look: { frame: "stretch", canopy: "racer", skin: "solid", frameColor: "#eef2f8", accentColor: "#e0b84a", propColor: "#ffffff", ledColor: "#ffffff", ledMode: "solid" }, fx: { laser: "white", beam: "pulse", missile: "white", boost: "flame", item: "gold" } },
  noeul: { name: "노을", price: 1200, desc: "버려졌던 시제기 XN-0 의 석양빛", look: { frame: "x", canopy: "cine", skin: "carbon", frameColor: "#2b2f39", accentColor: "#ff8a2a", propColor: "#ffc89a", ledColor: "#ffb060", ledMode: "blink" }, fx: { laser: "gold", beam: "heavy", missile: "amber", boost: "flame", item: "star" } },
  eia: { name: "에이아 레드", price: 1500, desc: "기계제국의 붉은 눈", need: "e5", look: { frame: "hexa", canopy: "battery", skin: "hazard", frameColor: "#141016", accentColor: "#ff2d3d", propColor: "#ff6b78", ledColor: "#ff2d3d", ledMode: "blink" }, fx: { laser: "red", beam: "nova", missile: "toxic", boost: "void", item: "neon" } },
  ail: { name: "에일 바이올렛", price: 1800, desc: "별의 저편에서 온 생체 결정", need: "s4", look: { frame: "tri", canopy: "pod", skin: "flame", frameColor: "#1c0d33", accentColor: "#c060ff", propColor: "#e0b0ff", ledColor: "#c060ff", ledMode: "rainbow" }, fx: { laser: "violet", beam: "nova", missile: "plasma", boost: "aurora", item: "star" } },
};

export const owns = (kind, v) => { const it = SHOP[kind] && SHOP[kind].items[v]; return it === 0 || !!S().owned[`${kind}:${v}`]; };
export const priceOf = (kind, v) => SHOP[kind].items[v];
export function buy(kind, v) {
  const p = priceOf(kind, v);
  if (owns(kind, v)) return true;
  if (!spend(p)) return false;
  S().owned[`${kind}:${v}`] = 1; changed();
  return true;
}
export const fxOwns = (slot, v) => FX[slot].items[v].price === 0 || !!S().owned[`fx.${slot}:${v}`];
export function fxBuy(slot, v) {
  if (fxOwns(slot, v)) return true;
  if (!spend(FX[slot].items[v].price)) return false;
  S().owned[`fx.${slot}:${v}`] = 1; changed(); return true;
}
export const fxEquipped = (slot) => S().eq[slot] || FX[slot].def;
export function fxEquip(slot, v) { if (!fxOwns(slot, v)) return false; S().eq[slot] = v; changed(); return true; }
export const themeOwns = (id) => !!S().owned[`theme:${id}`];
export function themeBuy(id) {
  if (themeOwns(id)) return true;
  if (!spend(THEMES[id].price)) return false;
  S().owned[`theme:${id}`] = 1; changed(); return true;
}
// 테마 장착: 외형과 효과를 테마 값으로 (그 테마로 쓰는 부품은 따로 사지 않아도 쓸 수 있게 소유 처리)
export function themeEquip(id) {
  const t = THEMES[id];
  if (!themeOwns(id)) return false;
  const s = S();
  for (const [k, v] of Object.entries(t.fx)) { s.owned[`fx.${k}:${v}`] = 1; s.eq[k] = v; }
  s.owned[`frame:${t.look.frame}`] = 1; s.owned[`canopy:${t.look.canopy}`] = 1; s.owned[`skin:${t.look.skin}`] = 1; s.owned[`led:${t.look.ledMode}`] = 1;
  Object.assign(settings.drone, t.look);
  s.eq.theme = id;
  changed();
  return true;
}

// ── 파츠: 슬롯 8개. 슬롯마다 성격이 다른 부품 3종 중 하나를 장착하고, 부품마다 0~5단계 업그레이드. 3·5단계에서 추가 효과 ──
// base: 장착만 해도 붙는 특성(장단점) · per: 단계마다 · b3/b5: 3·5단계 추가 효과. 모두 0 기준 가산치
export const UP_COST = [200, 400, 700, 1100, 1600];
// 수치 표기: pct 는 %, good -1 은 낮을수록 좋은 값
export const STATS = {
  hp: { name: "내구도", pct: 1 }, guard: { name: "받는 피해", pct: 1, good: -1 }, crash: { name: "충돌 피해", pct: 1, good: -1 }, regen: { name: "체력 재생", unit: "/초" },
  thrust: { name: "추력", pct: 1 }, boost: { name: "부스트 추력", pct: 1 }, boostDur: { name: "부스트 지속", pct: 1 },
  itemDur: { name: "아이템 지속", pct: 1 }, overDur: { name: "과충전 지속", pct: 1 }, gauge: { name: "스킬 충전", pct: 1 }, gaugeStart: { name: "시작 스킬 게이지", unit: "" },
  laserDmg: { name: "레이저 피해", pct: 1 }, rate: { name: "연사 속도", pct: 1 }, spread: { name: "확산 보조탄", unit: "발" }, spreadK: { name: "보조탄 피해", pct: 1 },
  crit: { name: "치명타 확률", pct: 1 }, critK: { name: "치명타 피해", pct: 1 }, heat: { name: "과열 누적", pct: 1, good: -1 }, cool: { name: "냉각 속도", pct: 1 },
  mDmg: { name: "미사일 피해", pct: 1 }, mStart: { name: "출격 미사일", unit: "발" }, mCap: { name: "미사일 최대", unit: "발" }, lock: { name: "락온 시간", pct: 1, good: -1 }, range: { name: "조준·락온 거리", pct: 1 },
  shieldK: { name: "실드량", pct: 1 }, spawnShield: { name: "출격 실드", unit: "" }, repair: { name: "수리량", pct: 1 }, emp: { name: "EMP 범위", pct: 1 },
};
export function statText(k, v) {
  const S0 = STATS[k]; if (!S0) return "";
  const n = S0.pct ? Math.round(v * 1000) / 10 : Math.round(v * 10) / 10;
  return `${S0.name} ${n > 0 ? "+" : ""}${n}${S0.pct ? "%" : S0.unit || ""}`;
}
export const statGood = (k, v) => (v * ((STATS[k] && STATS[k].good) || 1) >= 0);
export const effText = (e) => Object.entries(e || {}).map(([k, v]) => statText(k, v)).join(" · ");
export const PARTS = {
  armor: { name: "프레임·장갑", short: "장갑", icon: "🛡", variants: {
    std: { name: "카본 장갑", price: 0, tag: "균형형", desc: "가볍고 무난한 기본 장갑판.", per: { hp: 0.06 }, b3: { crash: -0.2 }, b5: { shieldK: 0.3 } },
    ti: { name: "티타늄 중장갑", price: 1000, tag: "중장갑", desc: "두꺼운 판으로 버티지만 그만큼 무겁다.", base: { hp: 0.08, thrust: -0.04 }, per: { hp: 0.09 }, b3: { regen: 1 }, b5: { guard: -0.1 } },
    light: { name: "경량 골조", price: 900, tag: "경량", desc: "장갑을 덜어 내 가볍다. 맞으면 아프다.", base: { thrust: 0.05, hp: -0.1 }, per: { thrust: 0.015, hp: 0.03 }, b3: { crash: -0.3 }, b5: { boost: 0.15 } } } },
  motor: { name: "모터·추진", short: "모터", icon: "⚙", variants: {
    std: { name: "표준 모터", price: 0, tag: "균형형", desc: "어디에나 무난한 기본 모터.", per: { thrust: 0.025 }, b3: { boost: 0.1 }, b5: { thrust: 0.05 } },
    race: { name: "레이싱 모터", price: 900, tag: "최고 속도", desc: "높은 회전수로 빠르지만 열이 많이 난다.", base: { thrust: 0.03, heat: 0.08 }, per: { thrust: 0.035 }, b3: { boost: 0.12 }, b5: { thrust: 0.06 } },
    torque: { name: "고토크 덕트", price: 1000, tag: "부스트 특화", desc: "큰 덕트로 순간 가속이 강하다. 평소엔 조금 둔하다.", base: { boost: 0.15, thrust: -0.03 }, per: { boost: 0.06, thrust: 0.01 }, b3: { boostDur: 0.25 }, b5: { crash: -0.25 } } } },
  battery: { name: "배터리·동력", short: "배터리", icon: "🔋", variants: {
    std: { name: "리튬 배터리", price: 0, tag: "균형형", desc: "아이템 효과를 오래 유지하는 기본 전원.", per: { itemDur: 0.06 }, b3: { spawnShield: 40 }, b5: { boostDur: 0.3 } },
    cell: { name: "고밀도 셀", price: 900, tag: "대용량", desc: "용량이 큰 대신 무겁다.", base: { itemDur: 0.08, thrust: -0.03 }, per: { itemDur: 0.08 }, b3: { boostDur: 0.25 }, b5: { regen: 1.5 } },
    cap: { name: "축전기 뱅크", price: 1000, tag: "스킬 특화", desc: "순간 방전으로 스킬 게이지가 빨리 찬다. 아이템 지속은 짧다.", base: { gauge: 0.1, itemDur: -0.12 }, per: { gauge: 0.05 }, b3: { overDur: 0.3 }, b5: { gaugeStart: 25 } } } },
  laser: { name: "레이저 포", short: "레이저", icon: "⚡", variants: {
    std: { name: "펄스 레이저", price: 0, tag: "균형형", desc: "연사와 위력이 고른 기본 포.", per: { laserDmg: 0.05 }, b3: { heat: -0.15 }, b5: { crit: 0.1 } },
    rapid: { name: "속사형 개틀링", price: 1000, tag: "속사", desc: "세 포신이 돌며 빠르게 쏜다. 한 발은 약하고 금방 달아오른다.", base: { rate: 0.35, laserDmg: -0.22 }, per: { laserDmg: 0.04 }, b3: { rate: 0.1 }, b5: { crit: 0.08 } },
    rail: { name: "고출력 레일", price: 1100, tag: "고출력", desc: "긴 포신에서 묵직한 한 발. 연사가 느리다.", base: { laserDmg: 0.3, rate: -0.22, heat: 0.15 }, per: { laserDmg: 0.07 }, b3: { crit: 0.08 }, b5: { critK: 0.5 } },
    scatter: { name: "확산형 트라이빔", price: 1200, tag: "확산", desc: "좌우로 보조탄 두 발을 함께 쏜다. 가까울수록 강하고 주탄은 약하다.", base: { spread: 2, laserDmg: -0.25, heat: 0.1 }, per: { laserDmg: 0.05 }, b3: { spreadK: 0.15 }, b5: { crit: 0.06, spreadK: 0.1 } } } },
  missile: { name: "미사일 포드", short: "미사일", icon: "🚀", variants: {
    std: { name: "표준 포드", price: 0, tag: "균형형", desc: "락온이 빠른 기본 포드.", per: { lock: -0.05 }, b3: { mCap: 2 }, b5: { mDmg: 0.25 } },
    swarm: { name: "다연장 포드", price: 1000, tag: "물량", desc: "작은 탄을 많이 싣는다. 한 발은 약하다.", base: { mStart: 2, mCap: 2, mDmg: -0.2 }, per: { mDmg: 0.05 }, b3: { mStart: 2 }, b5: { lock: -0.3 } },
    heavy: { name: "대형 탄두 포드", price: 1100, tag: "한 방", desc: "큰 탄두 두 발. 강력하지만 적게 싣고 락온이 느리다.", base: { mDmg: 0.35, mStart: -1, lock: 0.15 }, per: { mDmg: 0.07 }, b3: { mCap: 1 }, b5: { mDmg: 0.2, lock: -0.15 } } } },
  sensor: { name: "센서·조준", short: "센서", icon: "📡", variants: {
    std: { name: "기본 센서", price: 0, tag: "균형형", desc: "조준 보조 거리를 넓히는 기본 센서.", per: { range: 0.04 }, b3: { lock: -0.1 }, b5: { crit: 0.05 } },
    scope: { name: "정밀 조준경", price: 900, tag: "치명타", desc: "약점을 짚어 치명타를 노린다. 탐지 범위는 좁다.", base: { crit: 0.04, range: -0.1 }, per: { crit: 0.015 }, b3: { laserDmg: 0.06 }, b5: { critK: 0.5 } },
    radar: { name: "광역 레이더", price: 900, tag: "탐지", desc: "멀리서 먼저 잡는다. 회전 안테나가 무겁다.", base: { range: 0.15, thrust: -0.02 }, per: { range: 0.06, lock: -0.03 }, b3: { gauge: 0.12 }, b5: { mCap: 2 } } } },
  shield: { name: "실드 발생기", short: "실드", icon: "⬢", variants: {
    std: { name: "표준 발생기", price: 0, tag: "균형형", desc: "실드와 수리 효율을 고르게 올린다.", per: { shieldK: 0.05, repair: 0.04 }, b3: { emp: 0.25 }, b5: { spawnShield: 40 } },
    tac: { name: "반응형 방벽", price: 900, tag: "실드 특화", desc: "두꺼운 실드를 두르지만 수리 효율이 떨어진다.", base: { shieldK: 0.12, repair: -0.15 }, per: { shieldK: 0.08 }, b3: { spawnShield: 60 }, b5: { guard: -0.08 } },
    nano: { name: "나노 수리기", price: 1000, tag: "회복", desc: "실드 대신 기체를 스스로 고친다.", base: { regen: 0.5, shieldK: -0.15 }, per: { repair: 0.1 }, b3: { regen: 1 }, b5: { regen: 1, hp: 0.08 } } } },
  cooler: { name: "냉각기", short: "냉각", icon: "❄", variants: {
    std: { name: "방열판", price: 0, tag: "균형형", desc: "레이저 열을 빨리 식히는 기본 방열판.", per: { cool: 0.05 }, b3: { heat: -0.08 }, b5: { overDur: 0.2 } },
    cryo: { name: "극저온 냉각기", price: 900, tag: "지속 사격", desc: "냉매 탱크로 과열을 크게 늦춘다. 탱크가 무겁다.", base: { heat: -0.12, thrust: -0.03 }, per: { heat: -0.04 }, b3: { cool: 0.25 }, b5: { laserDmg: 0.08 } },
    vent: { name: "터보 벤트", price: 900, tag: "가속 보조", desc: "배기열을 뒤로 뿜어 부스트를 돕는다. 식히는 힘은 약하다.", base: { boostDur: 0.12, cool: -0.08 }, per: { boostDur: 0.05, cool: 0.03 }, b3: { overDur: 0.3 }, b5: { boost: 0.12 } } } },
};
export const SLOTS = Object.keys(PARTS);
const clampLv = (n) => Math.max(0, Math.min(5, Math.floor(+n) || 0));
// 장착 부품과 그 단계. 저장값이 이상하면 기본 부품으로
export function partOf(slot) {
  const p = S().parts[slot], Pt = PARTS[slot];
  const v = p && Pt.variants[p.v] && variantOwns(slot, p.v) ? p.v : "std";
  return { v, lv: partLv(slot, v) };
}
export function partLv(slot, v) { const p = S().parts[slot]; return clampLv(p && p.lv && p.lv[v]); }
export const variantOwns = (slot, v) => !!PARTS[slot].variants[v] && (PARTS[slot].variants[v].price === 0 || (S().own[slot] || []).includes(v));
export function variantBuy(slot, v) {
  if (!PARTS[slot] || !PARTS[slot].variants[v]) return false;
  if (variantOwns(slot, v)) return true;
  if (!spend(PARTS[slot].variants[v].price)) return false;
  const s = S(); (s.own[slot] = Array.isArray(s.own[slot]) ? s.own[slot] : []).push(v); changed(); return true;
}
function slotRec(slot) { const s = S(); let p = s.parts[slot]; if (!p || typeof p !== "object" || typeof p.lv !== "object" || !p.lv) p = s.parts[slot] = { v: (p && p.v) || "std", lv: {} }; return p; }
export function variantEquip(slot, v) {
  if (!PARTS[slot] || !variantOwns(slot, v)) return false;
  slotRec(slot).v = v; changed(); return true;
}
// 업그레이드: 부품마다 단계가 따로 있다 (v 를 주지 않으면 장착 중인 부품)
export function upgrade(slot, v) {
  if (!PARTS[slot]) return false;
  v = v || partOf(slot).v;
  if (!variantOwns(slot, v)) return false;
  const lv = partLv(slot, v);
  if (lv >= 5 || !spend(UP_COST[lv])) return false;
  slotRec(slot).lv[v] = lv + 1; changed(); return true;
}
// 부품 하나가 주는 효과 합 (단계 lv)
export function partEffect(slot, v, lv) {
  const V = PARTS[slot].variants[v] || PARTS[slot].variants.std, e = {};
  const add = (o, k = 1) => { for (const [key, val] of Object.entries(o || {})) e[key] = (e[key] || 0) + val * k; };
  add(V.base); add(V.per, lv);
  if (lv >= 3) add(V.b3);
  if (lv >= 5) add(V.b5);
  return e;
}
// 기체 외형용: 슬롯별 장착 부품 { slot: { v, lv } }. over = { slot, v } 를 주면 그 슬롯만 바꿔 본다(미리보기)
export function partLook(over) {
  const o = {};
  for (const slot of SLOTS) o[slot] = over && over.slot === slot && PARTS[slot].variants[over.v] ? { v: over.v, lv: over.lv ?? partLv(slot, over.v) } : partOf(slot);
  return o;
}

// 장착 상태 → 전투·비행 배율 (모두 0 기준의 가산치). over: 미리보기용 { slot, v, lv }
export function loadout(over) {
  const L = { thrust: 0, boost: 0, heat: 0, cool: 0, itemDur: 0, boostDur: 0, overDur: 0, spawnShield: 0, regen: 0, hp: 0, guard: 0, crash: 0, shieldK: 0, laserDmg: 0, rate: 0, spread: 0, spreadK: 0, crit: 0, critK: 0, lock: 0, range: 0, mCap: 0, mDmg: 0, mStart: 0, repair: 0, emp: 0, gauge: 0, gaugeStart: 0 };
  const look = partLook(over);
  for (const slot of SLOTS) for (const [k, v] of Object.entries(partEffect(slot, look[slot].v, look[slot].lv))) L[k] = (L[k] || 0) + v;
  const f = (slot) => FX[slot].items[fxEquipped(slot)] || FX[slot].items[FX[slot].def];
  L.fx = { laser: f("laser").color, beam: f("beam"), missile: f("missile").color, boost: f("boost"), item: f("item") };
  return L;
}
// PvP: 파츠 능력치를 모두 뺀 기본(0단계 기본 부품) 수치. 외형 효과(레이저·미사일·부스트 색)는 그대로
export function baseLoadout() {
  const L = loadout();
  for (const k of Object.keys(L)) if (k !== "fx") L[k] = 0;
  for (const [k, v] of Object.entries(Object.assign({}, ...SLOTS.map((slot) => partEffect(slot, "std", 0))))) L[k] = v;
  return L;
}
// 종합 성능 (1 = 기본 기체). 격납고 요약 막대용
export const RATINGS = [["speed", "기동"], ["fire", "화력"], ["def", "방어"], ["util", "지원"]];
export function ratings(L = loadout()) {
  const laser = Math.max(0.1, 1 + L.laserDmg) * Math.max(0.2, 1 + L.rate) * (1 + L.crit * (1 + L.critK)) * (1 + L.spread * (0.4 + L.spreadK) * 0.5);
  const msl = Math.max(0.1, 1 + L.mDmg) * (1 + (L.mStart + L.mCap * 0.5) / 8);
  return {
    speed: (1 + L.thrust) * (1 + L.boost * 0.3 + L.boostDur * 0.12),
    fire: laser * 0.7 + msl * 0.3,
    def: ((1 + L.hp) / Math.max(0.4, 1 + L.guard)) * (1 + L.shieldK * 0.2 + L.spawnShield / 400 + L.regen * 0.06 + L.repair * 0.1 - L.crash * 0.1),
    util: 1 - L.heat * 0.4 + L.cool * 0.4 + L.itemDur * 0.3 + L.overDur * 0.2 + L.gauge * 0.6 + L.gaugeStart / 100 - L.lock * 0.3 + L.range * 0.3 + L.emp * 0.1,
  };
}

// ── 스킬: 상점에서 사서 격납고에서 하나 장착. 스킬마다 Lv.1~5 강화 ──
export { SKILLS, SKILL_MAX, skillStat, skillRows, skillMilestone, skillDesc };
export const SKILL_UP_COST = [300, 500, 800, 1200];   // Lv.n → n+1
export const skillOwns = (id) => !!SKILLS[id] && (SKILLS[id].price === 0 || !!S().owned[`skill:${id}`]);
export function skillBuy(id) {
  if (!SKILLS[id]) return false;
  if (skillOwns(id)) return true;
  if (!spend(SKILLS[id].price)) return false;
  S().owned[`skill:${id}`] = 1; changed(); return true;
}
export const skillEquipped = () => (skillOwns(S().eq.skill) ? S().eq.skill : SKILL_DEF);
export function skillEquip(id) { if (!skillOwns(id)) return false; S().eq.skill = id; changed(); return true; }
export const skillLv = (id) => Math.max(1, Math.min(SKILL_MAX, Math.floor(+(S().sk || {})[id]) || 1));
export function skillUp(id) {
  if (!skillOwns(id)) return false;
  const lv = skillLv(id);
  if (lv >= SKILL_MAX || !spend(SKILL_UP_COST[lv - 1])) return false;
  const s = S(); (s.sk = s.sk && typeof s.sk === "object" ? s.sk : {})[id] = lv + 1; changed(); return true;
}
