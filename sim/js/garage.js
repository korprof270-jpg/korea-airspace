// 격납고 경제: 포인트 · 퀘스트(일일/주간) · 업적 · 상점(외형·테마·효과) · 파츠(교체 + 단계 업그레이드)
// 저장: records.gp = { pts, earned, owned:{}, eq:{}, parts:{slot:{v,lv}}, own:{slot:[variants]}, stat:{}, ach:{}, daily:{key,list}, weekly:{key,list} }
import { records, save, settings } from "./config.js";

// ── 저장 상태 ──
function S() {
  if (!records.gp) {
    records.gp = { pts: 300, earned: 0, owned: {}, eq: {}, parts: {}, own: {}, stat: {}, ach: {}, daily: null, weekly: null };
    // 격납고 이전에 이미 쓰던 외형은 그대로 쓸 수 있게
    const d = settings.drone, o = records.gp.owned;
    o[`frame:${d.frame}`] = o[`canopy:${d.canopy}`] = o[`skin:${d.skin}`] = o[`led:${d.ledMode}`] = o[`trail:${d.trail}`] = 1;
  }
  return records.gp;
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
  frame: { name: "프레임", items: { x: 0, stretch: 300, deadcat: 300, tri: 450, whoop: 500, hexa: 700 } },
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

// ── 파츠: 슬롯마다 교체 가능한 변형 + 0~5단계 업그레이드. 3·5단계에서 추가 효과 ──
export const UP_COST = [200, 400, 700, 1100, 1600];
export const PARTS = {
  motor: { name: "모터", icon: "⚙", variants: {
    std: { name: "표준 모터", price: 0, desc: "단계마다 추력 +2.5%", per: { thrust: 0.025 }, b3: ["부스트 추력 +10%", { boost: 0.1 }], b5: ["추력 +5% 추가", { thrust: 0.05 }] },
    race: { name: "레이싱 모터", price: 900, desc: "단계마다 추력 +4%", per: { thrust: 0.04 }, b3: ["레이저 과열 -10%", { heat: -0.1 }], b5: ["부스트 추력 +20%", { boost: 0.2 }] } } },
  battery: { name: "배터리", icon: "🔋", variants: {
    std: { name: "리튬 배터리", price: 0, desc: "단계마다 아이템 지속 +6%", per: { itemDur: 0.06 }, b3: ["재출격 시 실드 +40", { spawnShield: 40 }], b5: ["부스트 지속 +30%", { boostDur: 0.3 }] },
    cell: { name: "고밀도 셀", price: 900, desc: "단계마다 아이템 지속 +9%", per: { itemDur: 0.09 }, b3: ["부스트 지속 +25%", { boostDur: 0.25 }], b5: ["체력 재생 초당 1.5", { regen: 1.5 }] } } },
  armor: { name: "기체 장갑", icon: "🛡", variants: {
    std: { name: "카본 장갑", price: 0, desc: "단계마다 내구도 +6%", per: { hp: 0.06 }, b3: ["충돌 피해 -20%", { crash: -0.2 }], b5: ["실드 아이템 +30%", { shieldK: 0.3 }] },
    ti: { name: "티타늄 장갑", price: 1000, desc: "단계마다 내구도 +9%", per: { hp: 0.09 }, b3: ["체력 재생 초당 1", { regen: 1 }], b5: ["충돌 피해 -35%", { crash: -0.35 }] } } },
  laser: { name: "레이저", icon: "⚡", variants: {
    std: { name: "펄스 레이저", price: 0, desc: "단계마다 레이저 피해 +5%", per: { laserDmg: 0.05 }, b3: ["과열 -15%", { heat: -0.15 }], b5: ["치명타 10% (피해 2배)", { crit: 0.1 }] },
    rail: { name: "고출력 레이저", price: 1100, desc: "단계마다 레이저 피해 +8%", per: { laserDmg: 0.08 }, b3: ["치명타 8% (피해 2배)", { crit: 0.08 }], b5: ["과충전 지속 +40%", { overDur: 0.4 }] } } },
  missile: { name: "미사일 포드", icon: "🚀", variants: {
    std: { name: "표준 포드", price: 0, desc: "단계마다 락온 시간 -5%", per: { lock: -0.05 }, b3: ["미사일 최대 +2", { mCap: 2 }], b5: ["미사일 피해 +25%", { mDmg: 0.25 }] },
    swarm: { name: "군집 포드", price: 1000, desc: "단계마다 미사일 피해 +6%", per: { mDmg: 0.06 }, b3: ["출격 시 미사일 +2", { mStart: 2 }], b5: ["락온 시간 -30%", { lock: -0.3 }] } } },
  module: { name: "아이템 모듈", icon: "✚", variants: {
    std: { name: "기본 모듈", price: 0, desc: "단계마다 수리량 +8%", per: { repair: 0.08 }, b3: ["EMP 범위 +25%", { emp: 0.25 }], b5: ["아이템 지속 +25%", { itemDur: 0.25 }] },
    tac: { name: "전술 모듈", price: 900, desc: "단계마다 실드 +7%", per: { shieldK: 0.07 }, b3: ["과충전 지속 +30%", { overDur: 0.3 }], b5: ["수리량 +60%", { repair: 0.6 }] } } },
};
export function partOf(slot) { const p = S().parts[slot] || { v: "std", lv: 0 }; return p; }
export const variantOwns = (slot, v) => PARTS[slot].variants[v].price === 0 || (S().own[slot] || []).includes(v);
export function variantBuy(slot, v) {
  if (variantOwns(slot, v)) return true;
  if (!spend(PARTS[slot].variants[v].price)) return false;
  const s = S(); (s.own[slot] = s.own[slot] || []).push(v); changed(); return true;
}
export function variantEquip(slot, v) {
  if (!variantOwns(slot, v)) return false;
  const s = S(), p = partOf(slot);
  s.parts[slot] = { v, lv: p.lv }; changed(); return true;
}
export function upgrade(slot) {
  const s = S(), p = partOf(slot);
  if (p.lv >= 5 || !spend(UP_COST[p.lv])) return false;
  s.parts[slot] = { v: p.v, lv: p.lv + 1 }; changed(); return true;
}

// 장착 상태 → 전투·비행 배율 (모두 0 기준의 가산치)
export function loadout() {
  const L = { thrust: 0, boost: 0, heat: 0, itemDur: 0, boostDur: 0, overDur: 0, spawnShield: 0, regen: 0, hp: 0, crash: 0, shieldK: 0, laserDmg: 0, crit: 0, lock: 0, mCap: 0, mDmg: 0, mStart: 0, repair: 0, emp: 0 };
  for (const slot of Object.keys(PARTS)) {
    const p = partOf(slot), V = PARTS[slot].variants[p.v] || PARTS[slot].variants.std;
    for (const [k, v] of Object.entries(V.per)) L[k] += v * p.lv;
    if (p.lv >= 3) for (const [k, v] of Object.entries(V.b3[1])) L[k] += v;
    if (p.lv >= 5) for (const [k, v] of Object.entries(V.b5[1])) L[k] += v;
  }
  const f = (slot) => FX[slot].items[fxEquipped(slot)] || FX[slot].items[FX[slot].def];
  L.fx = { laser: f("laser").color, beam: f("beam"), missile: f("missile").color, boost: f("boost"), item: f("item") };
  return L;
}
