// 구운 지도 격자: 지형 범위(맵 반경 + 여백)와 칸 수. tools/bake-nuri.mjs 와 region.js 가 함께 쓴다
import { REGIONS } from "./geo.js";
export const MARGIN = 900;
export const BAKE = (id) => { const h = REGIONS[id].half; return { half: h + MARGIN, seg: h > 1400 ? 440 : 400 }; };
