// 맵: 제국 코어 저장고 — 기계제국 에이아가 빼앗은 에너지 코어를 쌓아 두는 요새 기지의 밤. 검은 강철과 붉은 탐조등 사이로 차가운 청록 코어 빛이 솟는다
//  · 한가운데: 코어 저장고(속이 빈 16각 원자로 돔, 열린 왕관에서 솟는 청록 빛기둥, 동서남북 관문) — 안으로 날아들 수 있다
//  · 저장고 둘레: 코어 사일로 여덟 기와 배관 다리(밑으로 순환로가 지난다), 순환 배관, 그 바깥을 도는 화물 모노레일
//  · 북쪽: 포로 감시탑(대로를 걸터앉은 검은 첨탑, 감시 고리와 탐조등)과 요새 마당 = 타격 임무의 적 진지
//  · 서쪽: 냉각탑 셋과 증기   · 동쪽: 두 층 배관 미로   · 남동: 착륙장과 수송정   · 남서: 코어 적치장과 갠트리 크레인
//  · 북서: 배전 구역(축전기 열과 레이더)   · 북동: 연병장   · 둘레: 팔각 성벽, 동서남북 성문 망루, 모서리 탐조등 탑
//  · 성 밖: 검은 황무지와 외곽로, 먼 제국 탑의 지평선과 연기 기둥, 하늘의 순찰함
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, lane, Beams, Steam, searchlights, height, polar, inside, DEG, WALL, WALL_H, ROAD_R, AVE, SILOS, SILO_R, RAIL_R, PRISON, YARD, COOL, MAZE, PADS, DEPOT, V_TOP } from "./vault-kit.js";
import { ground, markings, vault, silos, walls } from "./vault-base.js";
import { prison, cooling, maze, rail, pads, stockyard } from "./vault-zones.js";
import { powerField, parade, outskirts, blocks, props, drones } from "./vault-detail.js";
import { sky } from "./vault-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const at = (deg, y, r = ROAD_R) => { const [x, z] = polar(deg, r); return [x, y, z]; };
const TY = WALL_H + 6.7;   // 성벽 길(망루·탐조등 탑 통로) 비행 높이

// 1. 성벽 순찰: 팔각 성벽 위를 한 바퀴 — 성문 망루 넷과 모서리 탐조등 탑 넷의 통로를 꿰고, 꼭짓점 기둥 안쪽을 돈다
const RAMPART = [];
for (let i = 0; i < 8; i++) {
  const a = 67.5 + i * 45;
  RAMPART.push(G("hoop", at(a, TY + 2.6, 205.5), { r: 5.5 }), G("square", at(a + 22.5, TY, WALL), { w: 9.4, h: 9 }));
}
// 2. 배관 관통: 순환 배관과 배관 다리 밑을 누비고, 냉각탑 사이와 배전 구역을 돌아 배관 미로를 빠져나온다
const PIPES = [
  G("square", [0, 10, 90], { w: 11, h: 9 }), G("hoop", at(112.5, 12, 60), { r: 5 }), G("hoop", at(157.5, 13, 60), { r: 5 }), G("square", [-88, 12, 0], { w: 11, h: 9 }),
  G("hoop", [-128, 12, -4], { r: 5 }), G("hoop", [-180, 18, -44], { r: 5 }), G("hoop", [-152, 20, -96], { r: 5 }), G("hoop", [-98, 16, -100], { r: 5 }),
  G("hoop", [-44, 12.5, -100], { r: 5 }), G("square", [0, 11, -86], { w: 11, h: 9 }), G("hoop", at(292.5, 13, 60), { r: 5 }), G("hoop", at(337.5, 13, 60), { r: 5 }),
  G("square", [88, 12, 0], { w: 11, h: 9 }), G("hoop", [118, 10.5, 0], { r: 5 }), G("hoop", [137, 12, 32], { r: 5 }), G("hoop", [137, 12, 66], { r: 5 }),
  G("hoop", [112, 14, 104], { r: 5 }), G("hoop", [56, 13, 124], { r: 5 }),
];
// 3. 왕관 강하: 남쪽 대로에서 치솟아 저장고 왕관으로 뛰어들고, 주 코어 옆을 스쳐 북쪽 관문으로 빠져나가 감시탑을 감아 돈 뒤 냉각탑 옆으로 돌아온다
const DIVE = [
  G("square", [0, 14, 142], { w: 10, h: 8 }), G("hoop", [0, 46, 104], { r: 5 }), G("hoop", [0, 86, 62], { r: 5 }), G("hoop", [4, 121, 25], { r: 5 }),
  G("ring", [10, 98, 8], { r: 4 }), G("hoop", [12, 60, -4], { r: 5 }), G("ring", [8, 31, -20], { r: 4 }), G("square", [0, 9.5, -45], { w: 9, h: 8 }),
  G("hoop", [0, 10, -82], { r: 5 }), G("square", [0, 8, YARD.z1], { w: 10, h: 8.5 }), G("hoop", [31, 26, -150], { r: 5 }), G("hoop", [29, 52, -203], { r: 5 }),
  G("hoop", [-29, 62, -203], { r: 5 }), G("hoop", [-42, 50, -140], { r: 5 }), G("hoop", [-100, 30, -96], { r: 5 }), G("hoop", [-116, 14, -16], { r: 5 }),
  G("hoop", [-97, 12, 62], { r: 5 }), G("hoop", [-46, 12, 160], { r: 5 }),
];
const TRACKS = [
  { id: "wall", name: "성벽 순찰", level: 1, laps: 2, desc: "팔각 성벽 위를 한 바퀴 돌며 네 성문 망루와 네 모서리 탐조등 탑의 통로를 차례로 꿰는 입문 코스", gates: RAMPART },
  { id: "pipes", name: "배관 관통", level: 2, laps: 2, desc: "순환 배관과 사일로 배관 다리 밑을 누비고, 냉각탑 사이와 배전 구역을 돌아 동쪽 배관 미로를 빠져나오는 코스", gates: PIPES },
  { id: "dive", name: "왕관 강하", level: 3, laps: 2, desc: "저장고 왕관으로 치솟아 청록 빛기둥을 따라 안으로 뛰어들고, 주 코어 옆을 스쳐 북쪽 관문으로 빠져나가 포로 감시탑을 감아 도는 고난도 코스", gates: DIVE },
];

// ── 임무 지점 ──
const DEPOTS = [[-78, -148], [70, 152], [-62, 150], [88, -168]];
const STRIKE = { turrets: [[-48, -122], [48, -122], [-52, -162], [52, -162], [-30, -186], [30, -186]], core: [30, -140] };
const SUPPLY = { depot: [DEPOT.x, DEPOT.z], camps: [[-106, -140], [100, -84], [36, 150], [-116, 20]], turrets: [[-84, -84], [96, 60]] };
const COMBAT = { blue: [-174, 174], red: [125, -125], depots: DEPOTS };
const SPAWN = [0, 0.4, 170];
const BOSS = [206, 64, -206];

// 순환로 차선: 안쪽(코어 운반 트럭)·바깥쪽(호송)
const RING_IN = lane(Array.from({ length: 16 }, (_, i) => polar((i / 16) * 360, ROAD_R)), -3, 48);
// 호송: 순환로 북서에서 동쪽으로 돌아 남쪽 대로 → 남문 → 성 밖 외곽로를 따라 남서로
const CONVOY = [];
for (let a = 244; a <= 424; a += 12) CONVOY.push(at(a, 0, ROAD_R + 3));
CONVOY.push([8, 0, 60], [3.5, 0, 70], [3.5, 0, 96], [3.5, 0, 130], [3.5, 0, 165], [3.5, 0, 200], [2, 0, 214], [-8, 0, 222], [-30, 0, 223], [-64, 0, 223], [-88, 0, 219], [-104, 0, 208], [-122, 0, 191]);
// 포로 호송정: 남문 위에서 떠서 동쪽으로 저장고를 끼고 북상 → 감시탑을 한 바퀴 → 서쪽으로 돌아온다
const SHUTTLE = [[0, 40, 178], [62, 54, 132], [110, 62, 50], [108, 66, -50], [62, 70, -124], [40, 74, -172], [0, 76, -210], [-40, 74, -172], [-34, 72, -128], [-92, 66, -72], [-114, 62, 0], [-98, 58, 72], [-52, 46, 142]];
// 순찰 드론: 사일로 고리 바깥을 크게 돈다
const SCOUT = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [Math.cos(a) * 114, 51 + Math.sin(a * 3) * 6, Math.sin(a) * 114]; });

function build(w) {
  const K = { blink: new Blinkers(w), beams: new Beams(w), steam: new Steam(w), lights: [] };
  w.col.setTerrain(height);
  sky(w, K);
  ground(w); markings(w, K); vault(w, K); silos(w, K); walls(w, K);

  // ── 비워 둘 곳과 지나는 선 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 13]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 20], [SUPPLY.depot[0], SUPPLY.depot[1], 16], ...SUPPLY.camps.map((p) => [p[0], p[1], 13]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]),
    [COMBAT.blue[0], COMBAT.blue[1], 38], [COMBAT.red[0], COMBAT.red[1], 38], [BOSS[0] * 0.6, BOSS[2] * 0.6, 46], [SPAWN[0], SPAWN[2], 14], [0, 0, 98], [PRISON[0], PRISON[1], 26],
    ...COOL.map(([x, z, R]) => [x, z, R + 7]), ...PADS.map(([x, z]) => [x, z, 19]), [106, 127, 8], [DEPOT.x, DEPOT.z, 48], [DEPOT.x - 4, DEPOT.z - 30, 32]];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 12);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), true)).concat([sample(SCOUT, true), sample(SHUTTLE, true), sample(CONVOY, false)]);
  for (const t of TRACKS) { const g = t.gates, a = g[g.length - 1].p, b = g[1].p, L = Math.hypot(b[0] - a[0], b[2] - a[2]); KEEP.push([g[0].p[0] - (b[0] - a[0]) / L * 16, g[0].p[2] - (b[2] - a[2]) / L * 16, 10]); }
  const taken = [];
  const free = (x, z, m = 0) => {
    const d = Math.hypot(x, z);
    if (Math.abs(d - RAIL_R) < 7 + m) return false;
    if (Math.abs(x) < AVE + 3 + m || Math.abs(z) < AVE + 3 + m) return false;
    const oct = Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * Math.SQRT1_2);
    if (Math.abs(oct - WALL) < 12 + m || Math.abs(oct - 184) < 5 + m || Math.abs(oct - 222) < 6 + m) return false;
    if (x > YARD.x0 - 5 - m && x < YARD.x1 + 5 + m && z < YARD.z1 + 5 + m) return false;
    if (x > MAZE.x0 - 8 - m && z > MAZE.z0 - 8 - m && z < MAZE.z1 + 8 + m && oct < WALL) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const L of LINES) for (const p of L) if (p.y < 26 && Math.hypot(x - p.x, z - p.z) < 9 + m) return false;
    return true;
  };
  // 높이 상한: 근처를 지나는 비행선보다 14 m 아래
  const cap = (x, z, r) => { let h = Infinity; for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, z - p.z) < r + 5) h = Math.min(h, p.y - 14); return h; };
  // 모노레일 기둥을 세우면 안 되는 곳(낮게 지나는 선)
  const legBlocked = (x, z) => LINES.some((L) => L.some((p) => p.y < 26 && Math.hypot(x - p.x, z - p.z) < 9));

  prison(w, K); cooling(w, K); maze(w, K); rail(w, K, legBlocked); pads(w, K); stockyard(w, K);

  const t0 = performance.now(), ctx = { free, cap, taken, inside, KEEP, LINES, turrets: STRIKE.turrets };
  powerField(w, K, ctx); parade(w, K, ctx); outskirts(w, K, ctx); blocks(w, K, ctx); props(w, K, ctx); drones(w, K);
  searchlights(w, K.lights);
  K.beams.finish(); K.steam.finish(); K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "vault",
  name: "제국 코어 저장고",
  desc: "기계제국 에이아가 빼앗은 에너지 코어를 쌓아 둔 요새 기지의 밤. 청록 빛기둥이 솟는 코어 저장고와 사일로 고리, 북쪽의 포로 감시탑, 냉각탑과 배관 미로를 팔각 성벽과 붉은 탐조등이 에워싼다",
  size: 240,
  ceiling: 200,
  seed: 5127,
  env: {
    night: true, stars: true, lamps: true, noWind: true, cloud: 0.34, cloudLit: 0x1d3a4a, cloudDark: 0x070b12, horizonGlow: 0x0b3340,
    sky: { top: 0x02040a, horizon: 0x0e2230, bottom: 0x04070c }, sunDir: [0.42, 0.55, 0.62], sunColor: 0x9cc4e8, sun: 1.45, sunDisc: 2.5,
    hemi: 1.5, hemiSky: 0x5f86a8, hemiGround: 0x1c2630, fog: { color: 0x07121b, near: 130, far: 980 }, exposure: 1.08, glow: 2.0,
    bloom: { strength: 0.6, radius: 0.6, threshold: 0.84 }, outline: { color: 0x163040, mul: 0.5 }, look: { aoTint: 0x0c1c2c },
  },
  spawn: { pos: SPAWN, yaw: 0 },
  thumb: { pos: [-84, 66, 236], look: [0, 60, -40] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "truck", name: "코어 운반 트럭", type: "truck", level: 1, desc: "저장고 둘레 순환로를 돌며 사일로 배관 다리 밑을 지나는 코어 운반 트럭을 따라가세요", duration: 80, color: 0x1c2a30, path: RING_IN.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, 0, z, 9]) },
    { id: "prison", name: "포로 호송정", type: "shuttle", level: 2, desc: "남문 위에서 떠올라 북쪽 포로 감시탑을 한 바퀴 도는 제국 호송정을 놓치지 말고 따라가세요", duration: 90, path: SHUTTLE.map((p) => [...p, 13]) },
    { id: "scout", name: "순찰 드론", type: "scout", level: 2, desc: "사일로 고리 바깥을 크게 돌며 기지를 감시하는 제국 순찰 드론을 화면에 담으세요", duration: 80, path: SCOUT.map((p) => [...p, 12]) },
    { id: "fpv", name: "배관 레이서", type: "fpv", level: 3, desc: "배관 다리와 냉각탑 사이, 배관 미로를 꿰는 다른 레이싱 드론", duration: 75, path: PIPES.map((g) => [g.p[0], g.p[1], g.p[2], 19]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: BOSS },
};
