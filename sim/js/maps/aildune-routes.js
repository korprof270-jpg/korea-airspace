// 유리 사막의 길과 임무: 레이스 코스 셋, 추적 피사체 경로, 임무 지점 (three.js 에 의존하지 않는다)
import { height, canyonPoint, canyonS, FOREST, RAYST, SINGERS, LAKE, LAKE_Y, FLOOR, ROAD, CONVOY, DEPOTS, STRIKE, SUPPLY, BLUE, RED, SPAWN } from "./aildune-terrain.js";

const G = (t, p, o = {}) => ({ t, p, ...o });
const T = (x, z, up) => [x, height(x, z) + up, z];
const DEG = Math.PI / 180;
// 공명 숲 가운데(노래 굳은 기둥)에서 각도 a(도, 90 = 남쪽)·거리 R 인 점
export const FP = (a, R, y) => [FOREST.x + Math.cos(a * DEG) * R, y, FOREST.z + Math.sin(a * DEG) * R];
// 협곡 중심선 위 x 좌표의 점, 높이 y
const CY = (x, y) => { const p = canyonPoint(canyonS(x)); return [p[0], y, p[1]]; };
const LOW = FLOOR + 8.5;

// 순례상 자리: 가오리상의 두 날개 밑(동·서), 노래꾼 둘이 맞잡은 팔 밑
export const WING_E = [RAYST.x + 25, RAYST.z + 2], WING_W = [RAYST.x - 25, RAYST.z + 2];

// 1. 사구 물결: 출발 판 → 가오리 순례상 날개 밑 → 협곡 남쪽 턱의 사구 마루 → 노래꾼 순례상 팔 밑 → 오아시스 샘 위 → 출발 판
const DUNERUN = [
  G("square", T(-22, 170, 5), { w: 11, h: 7 }), G("hoop", T(-58, 150, 7), { r: 5.5 }), G("square", [WING_E[0], height(WING_E[0], WING_E[1]) + 6.2, WING_E[1]], { w: 12, h: 8 }),
  G("hoop", T(-86, 97, 7.5), { r: 5.5 }), G("hoop", [-50, 17.5, 82], { r: 5.5 }), G("square", T(0, 70, 7.5), { w: 11, h: 7 }), G("hoop", T(46, 74, 8.5), { r: 5.5 }),
  G("square", [SINGERS.x, height(SINGERS.x, SINGERS.z) + 7, SINGERS.z], { w: 12, h: 8 }), G("hoop", T(128, 130, 7.5), { r: 5.5 }), G("hoop", [LAKE.x + 6, LAKE_Y + 6, LAKE.z + 3], { r: 5.5 }),
  G("hoop", T(136, 198, 8), { r: 5.5 }), G("square", T(62, 190, 6.5), { w: 11, h: 7 }),
];
// 2. 유리 협곡: 북쪽 턱을 따라 서쪽으로 → 서쪽 끝에서 협곡으로 내리꽂아 → 결정 다리 밑으로 바닥을 따라 동쪽으로 → 동쪽 끝 비탈로 솟구친다
const CANYONRUN = [
  G("hoop", [194, 20, 30], { r: 5.5 }), G("hoop", [190, 23, -22], { r: 5.5 }), G("hoop", [132, 23, -34], { r: 5.5 }), G("square", [70, 21, -12], { w: 11, h: 8 }),
  G("hoop", [8, 20, -2], { r: 5.5 }), G("hoop", [-56, 21, 8], { r: 5.5 }), G("hoop", [-116, 23, -6], { r: 5.5 }), G("hoop", [-176, 24, -22], { r: 5.5 }), G("hoop", [-220, 22, -4], { r: 5.5 }),
  G("hoop", [-226, 9, 31], { r: 5.5 }), G("square", CY(-200, -9), { w: 12, h: 9 }),
  ...[-176, -116, -56, 4, 62, 120].map((x) => G("square", CY(x, LOW), { w: 12, h: 9 })),
  G("hoop", CY(151, 6.5), { r: 5.5 }),
];
// 3. 공명 숲 나선: 소리굽쇠 가지 사이를 꿰며 노래 굳은 기둥을 감아 오르고(안쪽 나선), 오르간 관 위로 크게 돌아 내려온다(바깥 나선)
// thread: 이 문에 소리굽쇠 결정이 걸터선다 [멍에 높이(땅 기준), 가지 끝 높이(땅 기준)]
const RING = [
  [90, 52, 13, [0, 70]], [135, 48, 20], [180, 46, 30, [16, 64]], [225, 44, 40], [270, 42, 52, [38, 116]], [315, 40, 62], [360, 38, 72, [58, 102]], [405, 34, 82], [450, 30, 90],
  [495, 44, 82], [540, 68, 64], [585, 78, 52], [630, 86, 40], [675, 86, 28], [720, 80, 18], [765, 66, 13],
];
const FORKRUN = RING.map(([a, R, y, th]) => G(th ? "ring" : "hoop", FP(a, R, y), { r: th ? 4.6 : a === 450 ? 5 : 5.5 }));
// 코스가 꿰는 소리굽쇠 결정: [x, z, 축 x, 축 z(가지가 놓인 방향 = 기둥에서 바깥쪽), 멍에 높이, 가지 끝 높이]
export const THREADED = RING.filter((q) => q[3]).map(([a, R, , th]) => { const p = FP(a, R, 0); return [p[0], p[2], Math.cos(a * DEG), Math.sin(a * DEG), th[0], th[1]]; });

export const TRACKS = [
  { id: "dunes", name: "사구 물결", level: 1, laps: 3, desc: "출발 판에서 사구 마루를 넘어 반쯤 묻힌 가오리 순례상의 날개 밑, 협곡 턱, 노래꾼 순례상의 맞잡은 팔 밑, 오아시스 빛 샘 위를 도는 입문 코스", gates: DUNERUN },
  { id: "canyon", name: "유리 협곡", level: 2, laps: 2, desc: "북쪽 턱을 따라 달리다 서쪽 끝에서 유리 협곡으로 내리꽂아, 결정 다리 밑으로 굽이치는 바닥을 훑고 동쪽 비탈로 솟구치는 코스", gates: CANYONRUN },
  { id: "forks", name: "공명 숲 나선", level: 3, laps: 2, desc: "거대한 소리굽쇠 결정의 가지 사이를 꿰며 노래 굳은 기둥을 감아 오르고, 오르간 관 결정 위로 크게 돌아 내려오는 고난도 코스", gates: FORKRUN },
];

// ── 추적 피사체 경로 ──
// 꺾은선을 step m 간격으로 잘게 나눈다
function resample(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  out.push(pts[pts.length - 1]);
  return out;
}
// 모래 가오리: 남쪽 사구에서 가오리 순례상 곁을 지나 협곡을 건너고, 공명 숲을 감아 돌아 노래 굳은 기둥 밑에 닿는다(열린 길)
const RAY2D = [[66, 206], [14, 176], [-36, 152], [-60, 126], [-70, 98], [-62, 74], [-52, 40], [-42, 6], [-36, -32], [-56, -72], [-67, -110], [-47, -151], [0, -173], [45, -151], [57, -110], [38, -80], [20, -90]];
export const RAYPATH = resample(RAY2D, 15).map(([x, z]) => {
  let h = -1e9; for (let dx = -8; dx <= 8; dx += 4) for (let dz = -8; dz <= 8; dz += 4) h = Math.max(h, height(x + dx, z + dz));
  return [x, Math.max(h, z > -10 && z < 80 ? 9 : -99) + 5.5, z];
});
// 에일 순례정: 공명 숲 둘레를 크게 돈다
export const SKIFF = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * 360; return FP(a, 102, 46 + Math.sin(a * DEG * 3) * 5); });
export const ROVER = ROAD.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, 0, z, 9]);

export const COMBAT = { blue: BLUE, red: RED, depots: DEPOTS };
export const BOSS = [0, 72, 150];
export const TRACKING = [
  { id: "sandray", name: "모래 가오리", type: "ray", level: 1, desc: "사구를 낮게 스치는 모래 가오리를 따라 협곡을 건너, 노래 굳은 기둥 밑 — 자장가 조각이 잠든 곳까지 가세요", duration: 76, closed: false, color: 0xffb060, path: RAYPATH.map((p) => [...p, 12]) },
  { id: "rover", name: "연합 탐사 트럭", type: "truck", level: 1, desc: "다진 모래 길을 따라 남쪽 판들을 도는 연합 탐사 트럭을 따라가세요", duration: 85, color: 0xe9ebf0, path: ROVER },
  { id: "skiff", name: "에일 순례정", type: "skiff", level: 2, desc: "공명 숲의 소리굽쇠 결정 둘레를 크게 도는 에일 순례정을 화면에 담으세요", duration: 80, path: SKIFF.map((p) => [...p, 13]) },
  { id: "fpv", name: "협곡 레이서", type: "fpv", level: 3, desc: "유리 협곡 바닥을 결정 다리 밑으로 훑는 다른 레이싱 드론", duration: 75, path: CANYONRUN.map((g) => [g.p[0], g.p[1], g.p[2], 20]) },
];
export { CONVOY, STRIKE, SUPPLY, DEPOTS, SPAWN };
