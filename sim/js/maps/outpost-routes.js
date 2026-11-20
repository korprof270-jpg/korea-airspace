// 붉은 협곡 전초기지 경로 자료: 레이스 코스 셋, 추적 피사체 경로, 임무 지점 (three.js 에 의존하지 않는다)
import { canyonPoint, canyonZ, flat, sideSX, RIG_C, BRIDGES } from "./outpost-terrain.js";

const G = (t, p, o = {}) => ({ t, p, ...o });
// 협곡 중심선 위(옆으로 off)의 점
const C = (x, y, off = 0) => { const [px, pz] = canyonPoint(x, off); return [Math.round(px * 10) / 10, y, Math.round(pz * 10) / 10]; };
const F2 = (name) => { const f = flat(name); return [f[0], f[1]]; };

// 1. 협곡 바닥 잠입: 고원에서 서쪽 끝으로 내리꽂혀 협곡 바닥을 따라 암석 아치 둘과 봉쇄 다리 셋 밑을 지나고, 동쪽 끝에서 솟아 남쪽 벼랑 위로 돌아온다
const FLOOR = [
  G("square", [-30, 42, 46], { w: 12, h: 9 }), G("hoop", [-120, 42, 20], { r: 5.5 }), G("hoop", [-185, 34, -5], { r: 5.5 }), G("hoop", [-203, 18, -24], { r: 5.5 }),
  G("square", C(-184, 8), { w: 12, h: 9 }), G("square", C(-162, 8), { w: 12, h: 9 }), G("hoop", C(-128, 8), { r: 5.5 }), G("square", C(-92, 8), { w: 12, h: 9 }),
  G("hoop", C(-50, 8), { r: 5.5 }), G("square", C(0, 8), { w: 12, h: 9 }), G("hoop", C(50, 8), { r: 5.5 }), G("square", C(97, 8), { w: 12, h: 9 }), G("square", C(130, 8), { w: 12, h: 9 }),
  G("hoop", C(176, 11), { r: 5.5 }), G("hoop", [187, 30, 40], { r: 5.5 }), G("hoop", [165, 50, 64], { r: 5.5 }), G("hoop", [108, 50, 74], { r: 5.5 }), G("square", [52, 45, 60], { w: 12, h: 9 }),
];
// 2. 시추탑과 접시: 시추탑 숲을 꿰고 협곡을 건너 감시 뷰트의 접시 안테나를 돌아, 곁협곡으로 내리꽂혔다가 시추 메사로 솟아오른다
const RIGS = [
  G("square", [96, 49, 150], { w: 11, h: 8 }), G("hoop", [140, 50, 156], { r: 5 }), G("hoop", [174, 50, 138], { r: 5 }), G("hoop", [178, 54, 88], { r: 5 }),
  G("hoop", [168, 58, 30], { r: 5 }), G("hoop", [166, 62, -34], { r: 5 }), G("hoop", [184, 84, -98], { r: 5 }), G("hoop", [208, 96, -140], { r: 5 }),
  G("hoop", [190, 98, -188], { r: 5 }), G("hoop", [146, 96, -186], { r: 5 }), G("hoop", [122, 84, -142], { r: 5 }), G("hoop", [106, 72, -58], { r: 5 }),
  G("hoop", [90, 44, -14], { r: 5 }), G("square", [65, 14, 12], { w: 11, h: 8 }), G("square", [50, 12, 56], { w: 11, h: 8 }), G("hoop", [47, 15, 100], { r: 5 }), G("hoop", [68, 42, 134], { r: 5 }),
];
// 3. 요새 관통: 협곡에서 서쪽 격납고 굴로 뛰어들어 안뜰로 빠지고, 지휘 첨탑을 감아 올라 하늘다리 위로 넘은 뒤, 바늘 협곡 어귀로 내리꽂혀 암석 아치 밑으로 돌아온다
const FORTRESS = [
  G("hoop", [-70, 9, -15], { r: 5 }), G("hoop", [-47, 15, -33], { r: 4.6 }), G("square", [-38, 20, -57], { w: 12, h: 8 }), G("square", [-38, 20, -90], { w: 12, h: 8 }),
  G("hoop", [-37, 30, -120], { r: 4.6 }), G("ring", [-4, 46, -142], { r: 3.8 }), G("hoop", [34, 68, -124], { r: 4.6 }), G("hoop", [4, 84, -95], { r: 4.6 }),
  G("hoop", [-66, 80, -110], { r: 5 }), G("hoop", [-112, 38, -92], { r: 5 }), G("hoop", [-104, 12, -46], { r: 5 }),
];
export const TRACKS = [
  { id: "floor", name: "협곡 바닥 잠입", level: 1, laps: 2, desc: "고원에서 협곡으로 내리꽂혀 바닥을 따라 암석 아치와 봉쇄 다리 셋 밑을 낮게 지나고, 벼랑 위로 솟아 요새를 바라보며 돌아오는 코스", gates: FLOOR },
  { id: "rigs", name: "시추탑과 접시", level: 2, laps: 2, desc: "시추탑 숲을 꿰고 협곡을 건너 감시 뷰트의 접시 안테나를 돈 뒤, 곁협곡 바닥으로 내리꽂혔다가 시추 메사로 솟아오르는 코스", gates: RIGS, start: { pos: [85, 38.6, 147], yaw: -104 } },
  { id: "fortress", name: "요새 관통", level: 3, laps: 2, desc: "격납고 굴을 꿰어 안뜰로 빠지고, 지휘 첨탑을 감아 올라 하늘다리를 넘은 뒤 바늘 협곡 어귀로 내리꽂히는 고난도 코스", gates: FORTRESS },
];

// ── 임무 지점 ──
export const DEPOTS = [F2("dep0"), F2("dep1"), F2("dep2"), F2("dep3")];
export const COMBAT = { blue: F2("blue"), red: F2("red"), depots: DEPOTS };
export const STRIKE = { core: F2("strike"), turrets: [[-141, -152], [-158, -195], [-200, -196], [-216, -156], [-198, -122], [-152, -124]] };
export const SUPPLY = { depot: F2("supply"), camps: [F2("camp0"), F2("camp1"), F2("camp2"), F2("camp3")], turrets: [[-84, 44], [134, 92]] };
export const SPAWN = { pos: [-44, 31, 112], yaw: -14 };
export const BOSS = [-70, 96, 100];
export const PADS = [flat("pad1"), flat("pad2")];

// 협곡 바닥 길(보급로): 서쪽 끝 → 동쪽 끝. 호송 트럭이 봉쇄 다리 셋과 검문소를 지난다
export const ROAD = Array.from({ length: 45 }, (_, i) => { const x = -218 + i * (436 / 44); return [Math.round(x * 10) / 10, Math.round(canyonZ(x) * 10) / 10]; });
export const CONVOY = ROAD.map(([x, z]) => [x, 0, z]);
// 시추 메사 순환로(보급 트럭)
export const RIG_ROAD = Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * Math.PI * 2; return [RIG_C[0] + Math.cos(a) * 50, RIG_C[1] + Math.sin(a) * 47]; });

// 감시 드론 순찰로: 요새 정면 → 서쪽 다리 → 서쪽 착륙장 → 포대 메사 → 요새 뒤 → 접시 뷰트 → 동쪽 착륙장 → 동쪽 다리 → 요새 정면
export const PATROL = [
  [0, 62, 8], [-80, 60, -18], [-162, 58, -54], [-198, 48, -64], [-204, 78, -128], [-150, 86, -192], [-60, 92, -198], [10, 96, -212], [90, 104, -196],
  [168, 116, -194], [212, 104, -142], [192, 86, -82], [166, 54, -14], [131, 66, 28], [60, 62, 2],
];
// 제국 연락정: 협곡 바닥 가까이 다리 셋 밑을 지나 동쪽 착륙장에 들렀다가, 협곡 위로 돌아와 서쪽 착륙장에 들른다
export const COURIER = [
  C(-190, 16), C(-162, 16), C(-128, 16), C(-92, 14), C(-40, 18), C(0, 18), C(50, 18), C(97, 14), C(130, 19), C(150, 28), [165, 38, -11], [150, 60, -24],
  [118, 70, -2], C(60, 70), C(0, 68), C(-92, 66), [-150, 58, -62], [-181, 44, -64], [-196, 33, -66], [-213, 25, -47], [-208, 18, -27],
];
export const TRACKING = [
  { id: "patrol", name: "감시 드론", type: "scout", level: 2, desc: "요새와 다리, 접시 안테나, 착륙장을 차례로 도는 제국 감시 드론. 이 드론의 길이 곧 기지의 지도다 — 들키지 않게 따라붙으세요", duration: 90, path: PATROL.map((p) => [...p, 13]) },
  { id: "courier", name: "제국 연락정", type: "shuttle", level: 2, desc: "봉쇄 다리 밑으로 협곡을 낮게 날아 절벽 착륙장을 오가는 제국 연락정을 화면에 담으세요", duration: 85, path: COURIER.map((p) => [...p, 15]) },
  { id: "truck", name: "보급 트럭", type: "truck", level: 1, desc: "시추탑 사이 순환로를 도는 제국 보급 트럭을 따라가세요", duration: 75, color: 0x8a1018, path: RIG_ROAD.map(([x, z]) => [x, 0, z, 9]) },
  { id: "fpv", name: "협곡 레이서", type: "fpv", level: 3, desc: "시추탑 숲과 접시 안테나, 곁협곡을 꿰는 다른 레이싱 드론", duration: 75, path: RIGS.map((g) => [g.p[0], g.p[1], g.p[2], 19]) },
];
