// 「노을의 날개」 장면 대본 모음. 단계 id → { pre: 출격 전 장면, post: 통과 후 장면 }
// 1부(1~4장) scenes1.js, 2부(5~8장)·무전 scenes2.js
import { SCENES1 } from "./scenes1.js";
import { SCENES2, RADIO as RADIO2 } from "./scenes2.js";
import { SCENES3, RADIO3 } from "./scenes3.js";   // 히든 「에이아 연대기」
import { SCENES4, RADIO4 } from "./scenes4.js";   // 히든 2 「별의 저편」
import { SCENES5, RADIO5 } from "./scenes5.js";   // 인연 이야기
export const SCENES = { ...SCENES1, ...SCENES2, ...SCENES3, ...SCENES4, ...SCENES5 };
export const RADIO = { ...RADIO2, ...RADIO3, ...RADIO4, ...RADIO5 };
