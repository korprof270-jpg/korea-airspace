// 비행훈련: ACRO(수동) 모드 과정. 과목마다 수행 과제를 순서대로 해내면 다음 과목이 열린다
// 좌표는 훈련장 기준 [오른쪽, 높이, 앞] (m). 높이는 지면에서 잰다
import { records, save } from "./config.js";

const TAU = Math.PI * 2;
// 원형 링 코스: 중심 (cx, cf), 반지름 R, n 개, dir=1 왼쪽으로 도는 원 / -1 오른쪽. a0 = 시작 각(0 = 중심에서 내 쪽)
function circle(cx, cf, R, n, dir, h, a0 = 0, part = 1) {
  const out = [];
  for (let i = 1; i <= Math.round(n * part); i++) {
    const a = a0 + (i / n) * TAU * dir;
    out.push([cx - Math.sin(a) * R * dir, typeof h === "function" ? h(i / n) : h, cf - Math.cos(a) * R]);
  }
  return out;
}

export const COURSES = [
  { id: "basic", name: "기초 과정", en: "BASIC", desc: "이륙·호버링·고도·요 — ACRO 로 떠 있는 법" },
  { id: "move", name: "기동 과정", en: "MANEUVER", desc: "전진·정지·선회·8자 — 원하는 곳으로 가는 법" },
  { id: "acro", name: "곡예 과정", en: "AEROBATICS", desc: "롤·플립·루프·배면·다이브 — ACRO 만의 기동" },
];

// 과제 종류
//  alt   : 고도 min~max 를 hold 초 유지 (hold 0 이면 도달만)
//  hover : 지점 p 반경 r 안에서 속도 v 이하로 hold 초
//  rings : 링 pts 를 순서대로 통과 (반경 r)
//  yaw   : 떠 있는 채로 제자리 회전 turns 바퀴 (+ 왼쪽, - 오른쪽)
//  speed : 속도 kmh 이상
//  trick : rollL rollR flipB flipF loop spin 중 하나를 n 번
//  inv   : 배면 비행 hold 초
//  dive  : m 미터 이상 급강하 후 회복
//  land  : 착륙 (p·r 가 있으면 그 착륙장 안에)
const L = (id, course, name, brief, par, tasks, o = {}) => ({ id, course, name, brief, par, tasks, ...o });

export const LESSONS = [
  L("hover", "basic", "이륙과 호버링", "ACRO 모드는 스틱을 놓아도 기체가 수평으로 돌아오지 않습니다. 스로틀을 조금씩 움직여 떠오르고, 기울면 반대로 살짝 쳐서 바로 세우세요.", 40, [
    { type: "alt", min: 1.5, text: "이륙: 고도 1.5m 이상", tip: "스로틀을 천천히 올립니다. 확 올리면 튀어 오릅니다." },
    { type: "alt", min: 2, max: 7, hold: 5, text: "고도 2~7m 에서 5초 버티기", tip: "스로틀은 가운데 근처에서 아주 조금씩만. 기울면 반대쪽으로 짧게." },
    { type: "land", text: "부드럽게 착륙", tip: "스로틀을 조금씩 줄여 천천히 내려옵니다. 세게 닿으면 부서집니다." },
  ]),
  L("alt", "basic", "고도 조절", "스로틀만으로 원하는 높이에 머무는 연습입니다. 오르내릴 때 미리 스로틀을 되돌려 관성을 잡는 것이 요령입니다.", 60, [
    { type: "alt", min: 2, max: 5, hold: 4, text: "낮은 띠(2~5m) 4초 유지", tip: "목표 높이에 닿기 전에 스로틀을 미리 줄입니다." },
    { type: "alt", min: 10, max: 14, hold: 4, text: "높은 띠(10~14m) 4초 유지", tip: "올라가는 속도가 붙으면 스로틀을 미리 내려 멈춥니다." },
    { type: "alt", min: 2, max: 5, hold: 4, text: "다시 낮은 띠(2~5m) 4초 유지", tip: "내려올 때는 스로틀을 다 빼지 말고 받쳐 주며 내려옵니다." },
    { type: "land", text: "착륙" },
  ]),
  L("yaw", "basic", "제자리 회전", "요(Yaw)는 기수 방향을 돌립니다. 높이를 지키면서 제자리에서 한 바퀴씩 돌아 보세요.", 60, [
    { type: "alt", min: 2.5, text: "이륙: 고도 2.5m 이상" },
    { type: "yaw", turns: 1, text: "왼쪽으로 한 바퀴", tip: "요 스틱을 왼쪽으로. 도는 동안에도 스로틀로 높이를 지킵니다." },
    { type: "yaw", turns: -1, text: "오른쪽으로 한 바퀴", tip: "요 스틱을 오른쪽으로. 바닥에 닿으면 처음부터 다시 셉니다." },
    { type: "land", text: "착륙" },
  ]),
  L("spot", "basic", "정점 호버링", "표시된 공 안에 기체를 넣고 멈춰 있기. 피치와 롤을 아주 짧게 쳐서 밀려나는 것을 잡습니다.", 60, [
    { type: "hover", p: [0, 3, 8], r: 3.5, v: 2.5, hold: 4, text: "앞쪽 정점에서 4초 정지", tip: "앞으로 살짝 숙였다가 곧바로 되돌려 세웁니다. 기울인 만큼 계속 밀려갑니다." },
    { type: "land", p: [0, 0, 0], r: 5, text: "출발 지점으로 돌아와 착륙", tip: "기수를 돌리지 않고 피치를 뒤로 당겨 돌아와도 됩니다." },
  ]),

  L("fwd", "move", "전진과 정지", "앞으로 숙이면 가속하고, 수평으로 되돌려도 관성으로 계속 갑니다. 멈추려면 반대로 젖혀 속도를 지워야 합니다.", 70, [
    { type: "rings", pts: [[0, 3.5, 14], [0, 3.5, 28]], r: 3.5, text: "링 2개를 지나 전진", tip: "피치를 조금만 앞으로. 숙이면 추력이 줄어드니 스로틀을 더합니다." },
    { type: "hover", p: [0, 3.5, 42], r: 4, v: 2, hold: 2, text: "끝 지점에서 2초 정지", tip: "닿기 전에 피치를 뒤로 젖혀 속도를 줄이고, 멈추면 수평으로." },
    { type: "hover", p: [0, 3.5, 8], r: 4, v: 2, hold: 2, text: "돌아와서 2초 정지", tip: "요로 반 바퀴 돌아 기수를 이쪽으로 향하고 돌아옵니다." },
    { type: "land", text: "착륙" },
  ]),
  L("side", "move", "좌우 이동", "기수는 앞을 본 채 롤만으로 옆으로 미끄러집니다. 촬영과 정밀 비행의 기본입니다.", 70, [
    { type: "hover", p: [-11, 3.5, 14], r: 3.5, v: 2, hold: 1.5, text: "왼쪽 정점에서 정지", tip: "롤을 왼쪽으로 조금, 닿기 전에 오른쪽으로 쳐서 멈춥니다." },
    { type: "hover", p: [11, 3.5, 14], r: 3.5, v: 2, hold: 1.5, text: "오른쪽 정점에서 정지" },
    { type: "hover", p: [0, 3.5, 14], r: 3.5, v: 2, hold: 1.5, text: "가운데에서 정지" },
    { type: "land", text: "착륙" },
  ]),
  L("turn", "move", "협조 선회", "롤로 기울이고, 같은 쪽으로 요를 넣고, 피치를 당겨 원을 그립니다. 세 스틱을 함께 쓰는 첫 연습입니다.", 80, [
    { type: "rings", pts: [[0, 4, 12], ...circle(0, 28, 16, 8, 1, 4)], r: 3.8, text: "왼쪽으로 원 한 바퀴", tip: "왼쪽 롤 + 왼쪽 요를 같이, 피치는 살짝 당깁니다. 기울면 스로틀을 더합니다." },
    { type: "rings", pts: circle(0, 28, 16, 8, -1, 4), r: 3.8, text: "오른쪽으로 원 한 바퀴", tip: "이번에는 반대 방향입니다. 다음 링을 미리 봅니다." },
    { type: "land", text: "착륙" },
  ]),
  L("eight", "move", "8자 비행", "왼쪽 원과 오른쪽 원을 끊지 않고 이어 붙입니다. 가운데에서 기울기를 넘기는 타이밍이 핵심입니다.", 90, [
    { type: "rings", pts: [[0, 4, 12], [0, 4, 26], ...circle(-13, 26, 13, 6, 1, 4, Math.PI / 2), ...circle(13, 26, 13, 6, -1, 4, Math.PI / 2)], r: 3.8, text: "8자 한 번", tip: "가운데를 지날 때 롤과 요를 반대로 넘깁니다." },
    { type: "rings", pts: [...circle(-13, 26, 13, 6, 1, 4, Math.PI / 2), ...circle(13, 26, 13, 6, -1, 4, Math.PI / 2)], r: 3.8, text: "8자 한 번 더, 끊지 않고" },
    { type: "land", text: "착륙" },
  ]),
  L("wave", "move", "오르내리는 코스", "링마다 높이가 다릅니다. 스로틀과 피치를 함께 써서 물결처럼 오르내리세요.", 80, [
    { type: "rings", pts: [[0, 3, 12], [0, 9, 24], [0, 3.5, 36], [6, 9, 46], [14, 4, 38], [14, 10, 24], [8, 4, 12]], r: 3.8, text: "높낮이 링 7개 통과", tip: "올라갈 때는 스로틀을 먼저, 내려갈 때는 스로틀을 줄이고 기수를 숙입니다." },
    { type: "land", text: "착륙" },
  ]),
  L("brake", "move", "가속과 급정지", "빠르게 날다가 원하는 곳에 정확히 멈추는 연습입니다. ACRO 에서는 크게 젖혀야 빨리 섭니다.", 70, [
    { type: "alt", min: 3, text: "이륙: 고도 3m 이상" },
    { type: "speed", kmh: 55, text: "시속 55km 이상으로 가속", tip: "기수를 깊이 숙이고 스로틀을 올립니다." },
    { type: "hover", p: [0, 4, 30], r: 5, v: 2, hold: 2, text: "표시 정점에서 2초 정지", tip: "기수를 크게 뒤로 젖혀 속도를 지우고, 멈추는 순간 수평으로." },
    { type: "land", text: "착륙" },
  ]),

  L("roll", "acro", "롤", "앞뒤 축으로 한 바퀴 구르는 기동입니다. 충분히 올라가서, 스틱을 끝까지 치고, 한 바퀴가 되면 바로 중립으로.", 60, [
    { type: "alt", min: 12, text: "고도 12m 이상 확보", tip: "곡예는 항상 넉넉한 높이에서 시작합니다." },
    { type: "trick", trick: "rollR", text: "오른쪽 롤 1회", tip: "롤을 오른쪽 끝까지. 뒤집힌 동안 스로틀을 살짝 줄이면 덜 떨어집니다." },
    { type: "trick", trick: "rollL", text: "왼쪽 롤 1회", tip: "롤을 왼쪽 끝까지. 끝나면 스로틀로 높이를 되찾습니다." },
    { type: "land", text: "착륙" },
  ]),
  L("flip", "acro", "플립", "좌우 축으로 한 바퀴 넘는 기동입니다. 먼저 스로틀로 살짝 솟구친 뒤 피치를 끝까지 넣습니다.", 60, [
    { type: "alt", min: 14, text: "고도 14m 이상 확보" },
    { type: "trick", trick: "flipB", text: "백플립 1회", tip: "스로틀을 올려 솟구친 뒤 피치를 끝까지 당깁니다. 뒤집히면 스로틀을 줄입니다." },
    { type: "trick", trick: "flipF", text: "프론트 플립 1회", tip: "피치를 끝까지 밉니다. 한 바퀴가 되면 중립, 스로틀로 받칩니다." },
    { type: "land", text: "착륙" },
  ]),
  L("spin", "acro", "요 스핀", "제자리에서 빠르게 팽이처럼 도는 기동입니다. 도는 동안에도 높이를 놓치지 마세요.", 50, [
    { type: "alt", min: 8, text: "고도 8m 이상 확보" },
    { type: "trick", trick: "spin", n: 2, text: "요 스핀 2바퀴", tip: "요를 끝까지 넣고 유지합니다. 기체가 기울지 않게 롤·피치는 중립." },
    { type: "land", text: "착륙" },
  ]),
  L("loop", "acro", "파워 루프", "속도를 붙인 채 크게 솟구치며 뒤로 한 바퀴. 플립보다 큰 원을 그립니다.", 70, [
    { type: "alt", min: 6, text: "고도 6m 이상 확보" },
    { type: "speed", kmh: 35, text: "시속 35km 이상으로 전진" },
    { type: "trick", trick: "loop", text: "파워 루프 1회", tip: "스로틀을 크게 올리며 피치를 당깁니다. 꼭대기에서 스로틀을 줄이고, 내려오며 다시 올립니다." },
    { type: "land", text: "착륙" },
  ]),
  L("inv", "acro", "배면 비행", "반 바퀴만 굴러 뒤집힌 채 버팁니다. 뒤집히면 추력이 땅 쪽을 향하니 스로틀은 거의 빼야 합니다.", 70, [
    { type: "alt", min: 22, text: "고도 22m 이상 확보", tip: "배면에서는 계속 떨어집니다. 높이가 곧 시간입니다." },
    { type: "inv", hold: 1.5, text: "배면 자세 1.5초 유지", tip: "반 롤로 뒤집고 스로틀을 최소로. 스틱 방향이 헷갈리면 반 롤로 돌아옵니다." },
    { type: "alt", min: 3, max: 30, hold: 3, upright: true, text: "바로 세워 3초 안정", tip: "반 롤로 바로 세우고 스로틀로 낙하를 멈춥니다." },
    { type: "land", text: "착륙" },
  ]),
  L("dive", "acro", "다이브와 회복", "높은 곳에서 기수를 떨구어 급강하하고, 지면 전에 끌어올립니다. 회복은 생각보다 일찍 시작해야 합니다.", 70, [
    { type: "alt", min: 32, text: "고도 32m 이상 확보" },
    { type: "dive", m: 12, text: "12m 이상 급강하 후 회복", tip: "스로틀을 줄이고 기수를 숙여 떨어집니다. 절반쯤에서 피치를 당기고 스로틀을 올립니다." },
    { type: "land", text: "착륙" },
  ]),
  L("exam", "acro", "수료 비행", "지금까지 배운 것을 한 번에. 제한 시간 안에 모든 과제를 마치고 착륙장에 내리면 수료입니다.", 110, [
    { type: "rings", pts: [[0, 4, 12], ...circle(0, 28, 16, 8, 1, (k) => 5.5 + Math.sin(k * TAU) * 2.5)], r: 3.8, text: "링 코스 한 바퀴" },
    { type: "alt", min: 14, text: "고도 14m 이상 확보" },
    { type: "trick", trick: "rollR", text: "롤 1회 (어느 쪽이든)", any: ["rollL", "rollR"] },
    { type: "trick", trick: "flipB", text: "플립 1회 (어느 쪽이든)", any: ["flipB", "flipF", "loop"] },
    { type: "hover", p: [0, 4, 12], r: 4, v: 2, hold: 2, text: "정점에서 2초 정지" },
    { type: "land", p: [0, 0, 0], r: 4, text: "착륙장 안에 착륙" },
  ], { limit: 150 }),
];
LESSONS.forEach((l, i) => { l.index = i; l.no = LESSONS.filter((x, j) => j <= i && x.course === l.course).length; });

export const lessonsOf = (course) => LESSONS.filter((l) => l.course === course);
export const progress = () => Math.min(records.training || 0, LESSONS.length);   // 마친 과목 수
export const unlocked = (l) => l.index <= progress();
export const lessonStars = (l) => records[`training:${l.id}`] || 0;
export const lessonConfig = (l, map) => ({ mode: "training", map, lesson: l.id, training: l.id });

// 결과 판정·진행도 저장
export function complete(id, result) {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) return null;
  const passed = result.win === true;
  const info = { lesson: l, passed, next: null, done: false };
  if (passed) {
    if ((result.stars || 1) > lessonStars(l)) records[`training:${l.id}`] = Math.max(1, result.stars || 1);
    if (l.index === progress()) records.training = l.index + 1;
    save();
    info.next = LESSONS[l.index + 1] || null;
    info.done = !info.next;
  }
  return info;
}
