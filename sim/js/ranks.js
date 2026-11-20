// 적 계급: 한국군 체계 18단계. 계급이 높을수록 내구도·조준·화력·기동이 올라간다. 같은 기체라도 계급에 따라 강함이 다르다
// 색 구분(기체의 포인트 색·불빛·고리): 병 = 노랑, 부사관 = 초록, 위관 장교 = 파랑, 영관·장성 = 빨강
export const RANKS = ["이병", "일병", "상병", "병장", "하사", "중사", "상사", "원사", "소위", "중위", "대위", "소령", "중령", "대령", "준장", "소장", "중장", "대장"];
export const TIER_NAME = ["병", "부사관", "장교", "고위 장교"];
export const TIER_COLOR = [0xffd21f, 0x35d06a, 0x2f8cff, 0xff2d3d];
export const TIER_CSS = ["#ffd21f", "#35d06a", "#5aa9ff", "#ff4a5a"];
export const tierOf = (r) => (r < 4 ? 0 : r < 8 ? 1 : r < 11 ? 2 : 3);
// 종류별 계급 가산: 큰 적일수록 높은 계급이 탄다
const BONUS = { kamikaze: -1, grunt: 0, jet: 1, ace: 3, tank: 2, aa: 2, gunship: 5, frigate: 6, cruiser: 8, boss: 9, mech: 10 };
const BASE = { easy: 1, normal: 4, hard: 8 };   // 난이도별 기준 계급 (일병 / 하사 / 소위)

export const clampRank = (r) => Math.max(0, Math.min(RANKS.length - 1, Math.round(r)));
// level: 판의 기준 계급. 종류 가산과 ±1.5 흩어짐을 더한다
export function rollRank(level, kind, spread = 1.5) { return clampRank(level + (BONUS[kind] || 0) + (Math.random() * 2 - 1) * spread); }
export const baseLevel = (cfg, difficulty) => cfg.level ?? BASE[difficulty] ?? 4;
// 계급 → 능력 배율 (하사 = 1 기준)
export function rankStats(r) {
  return { rank: r, name: RANKS[r], tier: tierOf(r), color: TIER_COLOR[tierOf(r)], css: TIER_CSS[tierOf(r)], hp: 0.76 + 0.06 * r, skill: 0.8 + 0.03 * r, dmg: 0.8 + 0.05 * r, aim: Math.max(0.35, 1.3 - 0.055 * r) };
}
