// 구운 지도 격자: 지형 범위(맵 반경 + 여백)와 칸 수. tools/bake-nuri.mjs 와 region.js 가 함께 쓴다
import { REGIONS } from "./geo.js";
export const MARGIN = 900;
export const BAKE = (id) => { const h = REGIONS[id].half; return { half: h + MARGIN, seg: h > 1400 ? 440 : 400 }; };
// 대륙 전체 입체 지형도 (지역 선택 화면 지도): 범위(대륙 좌표 m)와 그림 크기
export const CONT = { x0: -3600, x1: 3500, z0: -2450, z1: 2750, w: 1420, h: 1040 };
