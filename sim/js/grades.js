// 장비 등급: 일반 · 고급 · 희귀 · 영웅 · 전설 (외형 아이템 + 파츠 부품)
//  - 등급마다 가격이 가파르게 오르고, 장착하면 작은 능력치 보너스가 붙는다 (loadout 의 키를 그대로 쓴다)
//  - 외형: 종류마다 정해 둔 능력치 묶음에서 아이템마다 주 능력치(+등급 희귀 이상이면 보조 능력치)를 고른다
//  - 파츠: 그 부품의 '단계마다' 효과를 등급만큼 더 (전설 = 1.6단계분)
//  - 임무 보상: 승리하면 등급을 굴려 아직 없는 아이템을 준다
// 이 파일은 순수 데이터·계산만 둔다 (garage.js 가 불러 쓴다)

export const GRADES = [
  { id: "common", name: "일반", en: "COMMON", c: "#a3adbd" },
  { id: "uncommon", name: "고급", en: "UNCOMMON", c: "#43d97e" },
  { id: "rare", name: "희귀", en: "RARE", c: "#4aa8ff" },
  { id: "epic", name: "영웅", en: "EPIC", c: "#b86bff" },
  { id: "legend", name: "전설", en: "LEGENDARY", c: "#ffaa2b" },
];
export const gradeOf = (g) => GRADES[Math.max(0, Math.min(4, g | 0))];

// ── 등급표 ──
// 외형 (정해 두지 않은 것은 일반)
const LOOK_GRADE = {
  frame: {
    x: 0, stretch: 0, deadcat: 0, micro: 0,
    plus: 1, tri: 1, squash: 1, whoop: 1, lowrider: 1,
    vtail: 2, cinewhoop: 2, hrace: 2, hexa: 2, lr7: 2, cross: 2,
    raptor: 3, y6: 3, wedge: 3, viper: 3,
    octo: 4, phantom: 4,
  },
  canopy: { pod: 0, battery: 1, racer: 2, cine: 3 },
  skin: {
    solid: 0, matte: 0, gradient: 0, checker: 0, stripe: 0,
    camo: 1, digital: 1, tiger: 1,
    hazard: 2, splatter: 2, carbon: 2, hex: 2,
    dazzle: 3, flame: 3, neon: 3,
    circuit: 4, chrome: 4,
  },
  led: { solid: 0, off: 0, blink: 0, breathe: 1, strobe: 1, police: 2, rainbow: 3 },
  trail: { off: 0, "#ffffff": 0, "#ff5a1f": 1, "#21d4fd": 1, "#3dff7c": 2, "#ff2bd6": 3 },
  paint: { on: 2 },
};
// 파츠 부품 (기본 부품 std 는 일반)
const PART_GRADE = {
  armor: { std: 0, light: 1, bumper: 2, ti: 3, reactive: 4 },
  motor: { std: 0, race: 1, eco: 2, torque: 3, jet: 4 },
  battery: { std: 0, cell: 1, solar: 2, cap: 3, reactor: 4 },
  laser: { std: 0, rapid: 1, rail: 2, ion: 3, scatter: 4 },
  missile: { std: 0, swarm: 2, seeker: 3, heavy: 4 },
  sensor: { std: 0, scope: 2, radar: 3, ew: 4 },
  shield: { std: 0, tac: 2, nano: 3, cap: 4 },
  cooler: { std: 0, vent: 2, cryo: 3, liquid: 4 },
};
// 옛 가격으로 등급을 매기는 것 (색 조합 · 효과 · 테마)
const byPrice = (p, cut) => { let g = 0; for (const c of cut) if (p >= c) g++; return Math.min(4, g); };
export function lookGrade(kind, v, oldPrice = 0) {
  const t = LOOK_GRADE[kind];
  if (t && t[v] !== undefined) return t[v];
  if (kind === "preset") return byPrice(oldPrice, [200, 250, 300, 9999]);
  if (kind === "theme") return oldPrice >= 1500 ? 4 : 3;
  if (kind.startsWith("fx.")) return byPrice(oldPrice, [250, 350, 500, 700]);
  return 0;
}
export const partGrade = (slot, v) => ((PART_GRADE[slot] || {})[v] ?? 0);

// ── 가격 ──
// 외형: 등급 기본가 × 종류 배율 (값 0 이던 기본 제공 아이템은 그대로 무료)
export const LOOK_PRICE = [300, 900, 2000, 4200, 8000];
const KIND_K = { frame: 1, canopy: 0.8, skin: 0.9, led: 0.6, trail: 0.55, preset: 0.5, paint: 1.2, theme: 1.25, fx: 0.7 };
const r50 = (n) => Math.round(n / 50) * 50;
export const lookPrice = (kind, g) => r50(LOOK_PRICE[g] * (KIND_K[kind.startsWith("fx.") ? "fx" : kind] || 1));
// 파츠 구매가 (기본 부품은 무료)
export const PART_PRICE = [0, 2200, 3800, 6200, 9800];
// 파츠 업그레이드: Lv.n → n+1 기본값 × 등급 배율 (예전 200·400·700·1100·1600 보다 단계마다 훨씬 가파르다)
export const UP_BASE = [300, 750, 1500, 2800, 4800];
export const UP_GRADE_K = [1, 1.15, 1.3, 1.5, 1.75];
export const upCostOf = (g, lv) => (lv >= 5 ? Infinity : r50(UP_BASE[lv] * UP_GRADE_K[g]));

// ── 능력치 보너스 ──
// 외형: 종류별 능력치 묶음 [키, 전설일 때 값]. 등급 배율 GK 를 곱한다
export const GK = [0, 0.25, 0.5, 0.75, 1];
export const LOOK_POOL = {
  frame: [["hp", 0.05], ["thrust", 0.025], ["boost", 0.06]],
  canopy: [["crit", 0.025], ["range", 0.06], ["lock", -0.08]],
  skin: [["laserDmg", 0.04], ["mDmg", 0.05], ["critK", 0.1]],
  led: [["gauge", 0.05], ["cool", 0.07], ["regen", 0.6]],
  trail: [["boostDur", 0.07], ["itemDur", 0.06], ["overDur", 0.08]],
};
export const LOOK_BONUS_KINDS = Object.keys(LOOK_POOL);
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const rnd3 = (x) => Math.round(x * 1000) / 1000;
// 외형 아이템 하나가 주는 보너스 { 키: 값 }
export function lookBonus(kind, v) {
  const pool = LOOK_POOL[kind];
  if (!pool) return {};
  const g = lookGrade(kind, v), k = GK[g];
  if (!k) return {};
  const h = hash(`${kind}:${v}`), a = h % pool.length, b = (a + 1 + ((h >>> 5) % (pool.length - 1))) % pool.length;
  const e = { [pool[a][0]]: rnd3(pool[a][1] * k) };
  if (g >= 2) e[pool[b][0]] = rnd3(pool[b][1] * k * 0.5);
  return e;
}
// 파츠: 단계마다 효과 × PGK
export const PGK = [0, 0.4, 0.8, 1.2, 1.6];
export function partBonus(slot, v, per) {
  const k = PGK[partGrade(slot, v)], e = {};
  if (!k) return e;
  for (const [key, val] of Object.entries(per || {})) e[key] = rnd3(val * k);
  return e;
}

// ── 임무 보상 ──
// 승리하면 DROP_CHANCE 확률로 보상. 등급은 기본 가중치에 (1+운)^등급 을 곱해 고른다
// 운: 난이도 · 돌파 작전 단계 · 별 · 스토리 첫 클리어 (최대 LUCK_MAX)
export const DROP_BASE = [55, 28, 12, 4, 1];
export const LUCK_MAX = 1.2;
export function dropLuck(cfg = {}, r = {}) {
  let L = { easy: 0, normal: 0.15, hard: 0.4 }[cfg.difficulty] ?? 0.15;
  const strike = cfg.variant === "strike" || !!r.strike;
  if (strike) L += 0.15 * Math.max(1, Math.min(5, +cfg.op || (r.strike && r.strike.op) || 1));
  L += Math.min(3, r.stars || 0) * 0.05;
  if (r.story && r.story.passed && r.story.first) L += 0.25;
  return Math.max(0, Math.min(LUCK_MAX, L));
}
export const dropChance = (L) => Math.min(0.9, 0.5 + L * 0.25);
export function dropWeights(L) {
  const w = DROP_BASE.map((b, g) => b * (1 + L) ** g), s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / s);
}
export function rollGrade(L, rand = Math.random) {
  const w = dropWeights(L);
  let x = rand();
  for (let g = 0; g < w.length; g++) { if ((x -= w[g]) < 0) return g; }
  return 0;
}
// 이미 모두 가진 등급이 나오면 그 등급 외형 가격의 일부를 포인트로 돌려준다
export const REFUND_K = 0.35;
