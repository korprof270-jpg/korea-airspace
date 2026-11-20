// 「노을의 날개」 장면 대본 모음. 단계 id → { pre: 출격 전 장면, post: 통과 후 장면 }
// 1부(1~4장) scenes1.js, 2부(5~8장)·무전 scenes2.js
import { SCENES1 } from "./scenes1.js";
import { SCENES2, RADIO as RADIO2 } from "./scenes2.js";
import { SCENES3, RADIO3 } from "./scenes3.js";   // 히든 「에이아 연대기」
import { SCENES4, RADIO4 } from "./scenes4.js";   // 히든 2 「별의 저편」
import { SCENES5, RADIO5 } from "./scenes5.js";   // 인연 이야기
import { SCENES6 } from "./scenes6.js";   // 엔딩 다시 보기
import { SCENES7, RADIO7 } from "./scenes7.js";   // 히든 2 에필로그 「어미별」
import { SCENES8, RADIO8 } from "./scenes8.js";   // 히든 2 어미별 순례 (유리 사막·빛 바다·포자 숲·폭풍 무덤)
import { easeText } from "./objectives.js";
export const SCENES = { ...SCENES1, ...SCENES2, ...SCENES3, ...SCENES4, ...SCENES5, ...SCENES6, ...SCENES7, ...SCENES8 };
export const RADIO = { ...RADIO2, ...RADIO3, ...RADIO4, ...RADIO5, ...RADIO7, ...RADIO8 };

// 목표 기준을 낮췄으므로(objectives.js easeN) 대사와 작전 메모 속 숫자도 맞춰 바꾼다
(function easeScenes(v) {
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { if (typeof v[i] === "string") { if (v[i][0] !== "@") v[i] = easeText(v[i]); } else easeScenes(v[i]); } return; }
  if (!v || typeof v !== "object") return;
  for (const k of Object.keys(v)) {
    if (k === "mod") { for (const m of Object.values(v.mod)) if (m && typeof m.note === "string") m.note = easeText(m.note); }
    else if (typeof v[k] === "string") { if (k === "t" || k === "q") v[k] = easeText(v[k]); }
    else easeScenes(v[k]);
  }
})(SCENES);
