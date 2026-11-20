// 맵: 거신 공창 — 설산 빙하 골짜기에 숨은 기계제국의 조립 공창. 흰 눈 · 검은 강철 · 주황 쇳물
//  · 가운데 북쪽: 조립 구덩이(지름 120 m)와 미완성 거신 오메가(머리 없는 몸통 + 오른팔, 지면 위 100 m), 둘레 비계와 순환로
//  · 동쪽: 고로 셋과 굴뚝, 구덩이로 흘러드는 쇳물 수로 셋, 수로 위에 걸친 주조동, 둑길과 배관 다리
//  · 북쪽: 화물 철도(복선)와 하역 갠트리 크레인 둘(머리·흉갑판), 북동쪽 눈 둔덕을 뚫은 철도 터널
//  · 남서: 부품 야적장(거대한 손가락·관절 고리·장갑판·예비 발)과 갠트리 크레인 둘(손·다리 마디)
//  · 서쪽: 얼어붙은 냉각호와 냉각관·증기, 발전소와 송전 철탑   · 남쪽: 진입로와 연병장, 병영, 격납고, 남동쪽 수비대 진지
//  · 둘레: 눈 덮인 산 능선과 먼 봉우리, 내리는 눈, 구름에 섞이는 연기, 탐조등
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, Lava, Steam, height, polar, C, ROAD_R, CHAN, CAUSE, HALL, RAIL, SPUR, YARD, NGAN, LAKE, FURN, PARADE, PSTN, PIT_R, chanDist, inCause, edge, RIM } from "./foundry-kit.js";
import { ground, pit, channels, titan, scaffold } from "./foundry-base.js";
import { furnaces, hall, bridges, railway, lake, power } from "./foundry-works.js";
import { yard, cranes, garrison } from "./foundry-yard.js";
import { props, lights, effects } from "./foundry-detail.js";
import { sky } from "./foundry-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const tp = (th, r, y) => { const [x, z] = polar(th, r); return [Math.round(x * 10) / 10, y, Math.round(z * 10) / 10]; };

// 1. 야적장 순회: 갠트리 크레인 둘 밑으로 거대 부품 사이를 지나고, 예비 발과 손가락 기둥을 돌아오는 입문 코스
const YARD_G = [
  G("square", [-44, 6, 107], { w: 11, h: 8 }), G("square", [-78, 6.5, 107], { w: 11, h: 8 }), G("hoop", [-112, 8, 107], { r: 5.5 }), G("square", [-150, 7, 107], { w: 11, h: 8 }),
  G("hoop", [-192, 9, 104], { r: 5.5 }), G("hoop", [-206, 10, 72], { r: 5.5 }), G("hoop", [-186, 9, 52], { r: 5.5 }), G("square", [-150, 7.5, 58], { w: 11, h: 8 }),
  G("hoop", [-108, 7, 62], { r: 5.5 }), G("square", [-66, 7, 60], { w: 11, h: 8 }), G("hoop", [-20, 7, 63], { r: 5.5 }), G("hoop", [10, 7, 73], { r: 5.5 }),
  G("hoop", [14, 7, 100], { r: 5.5 }), G("hoop", [-12, 7, 112], { r: 5.5 }),
];
// 2. 쇳물 수로: 수로를 스치며 둑길을 넘고, 철도 터널을 꿰뚫어 고로 옆을 돌아 주조동을 지나 구덩이 가장자리로 돌아온다
const FORGE_G = [
  G("hoop", [35, 3, -92], { r: 4.6 }), G("square", [35, 7, -111], { w: 10, h: 7 }), G("hoop", [36, 4.5, -134], { r: 4.6 }), G("hoop", [44, 8, -158], { r: 5 }),
  G("square", [60, 5.6, RAIL.zB], { w: 9, h: 7.4 }), G("hoop", [88, 5.6, RAIL.zB], { r: 4.2 }), G("square", [116, 5.6, RAIL.zB], { w: 9, h: 7.4 }), G("hoop", [146, 11, -160], { r: 5 }),
  G("hoop", [150, 12, -108], { r: 5 }), G("hoop", [160, 10, -62], { r: 5 }), G("square", [148.5, 6.5, HALL.z], { w: 12, h: 9 }), G("hoop", [123, 6.5, HALL.z], { r: 4.6 }),
  G("square", [98.5, 6.5, HALL.z], { w: 12, h: 9 }), G("hoop", [70, 4, -30], { r: 4.6 }), G("hoop", [50, 9, -60], { r: 5 }),
];
// 3. 거신 등정: 비계 사이를 나선으로 감아 올라 몸통과 팔 사이를 지나고, 목 고리를 꿰뚫어 구덩이 바닥으로 내리꽂은 뒤 팔 밑을 돈다
const TITAN_G = [
  G("hoop", tp(352, 44, 8), { r: 5 }), G("hoop", tp(45, 42, 15), { r: 5 }), G("hoop", tp(100, 42, 24), { r: 5 }), G("hoop", tp(160, 42, 36), { r: 5 }),
  G("hoop", tp(222, 44, 46), { r: 5 }), G("square", [C[0] - 29.3, 52, C[1]], { w: 8, h: 9 }), G("hoop", tp(318, 42, 62), { r: 5 }), G("hoop", tp(20, 40, 74), { r: 5 }),
  G("hoop", tp(95, 42, 90), { r: 5 }), G("hoop", [C[0] + 24, 104, C[1] - 40], { r: 5 }), G("hoop", [C[0] + 2, 116, C[1] - 26], { r: 5, pitch: -20 }), G("ring", [C[0], 100, C[1]], { r: 4.2, pitch: -34 }),
  G("hoop", tp(0, 34, 76), { r: 5, pitch: -45 }), G("hoop", tp(28, 48, 30), { r: 5, pitch: -55 }), G("hoop", tp(75, 38, -12), { r: 5 }), G("hoop", tp(150, 38, -14), { r: 5 }),
  G("hoop", tp(225, 38, -13), { r: 5 }), G("square", tp(272, 40, -9), { w: 10, h: 9 }), G("hoop", tp(318, 42, 0), { r: 5 }),
];
const TRACKS = [
  { id: "yard", name: "야적장 순회", level: 1, laps: 3, desc: "갠트리 크레인 둘 밑으로 거대한 손가락과 관절 고리, 장갑판 사이를 지나고 예비 발의 아치를 돌아오는 입문 코스", gates: YARD_G },
  { id: "forge", name: "쇳물 수로", level: 2, laps: 2, desc: "주황빛 쇳물 수로를 스치며 둑길을 넘고, 철도 터널을 꿰뚫어 고로 옆을 돌아 주조동을 지나는 코스", gates: FORGE_G, start: { pos: [48, 0.9, -76], yaw: 39 } },
  { id: "titan", name: "거신 등정", level: 3, laps: 2, desc: "비계 사이를 나선으로 감아 올라 몸통과 팔 사이, 열린 목 고리를 꿰뚫고 조립 구덩이 바닥으로 내리꽂아 매달린 팔 밑을 도는 고난도 코스", gates: TITAN_G, start: { pos: [-20, 0.4, 44], yaw: -28 } },
];

// ── 임무 지점 ──
const DEPOTS = [[-120, -118], [112, 8], [-112, -2], [70, -100]];
const STRIKE = { turrets: [[122, 140], [165, 122], [206, 145], [206, 198], [165, 214], [122, 205]], core: [160, 170] };
const SUPPLY = { depot: [-95, 172], camps: [[-200, -128], [196, -84], [150, 25], [-108, -140]], turrets: [[100, -70], [-128, 48]] };
const COMBAT = { blue: [-165, 180], red: [160, 170], depots: DEPOTS };
const SPAWN = [0, 0, 165];
const BOSS = [0, 66, 208];

// 순환로를 도는 부품 운반차, 호송 경로(남쪽 진입로 → 순환로 동쪽 → 북쪽 하역장)
const RING = Array.from({ length: 18 }, (_, i) => polar(i * 20, ROAD_R));
const CONVOY = [[0, 0, 218], [0, 0, 180], [0, 0, 140], [0, 0, 100], [0, 0, 70], ...[14, 32, 50, 70, 90, 110, 130, 150, 168].map((th) => { const [x, z] = polar(th, ROAD_R + 1.5); return [x, 0, z]; }), [-8, 0, -122], [-36, 0, -134], [-70, 0, -142]];
// 제국 수송정: 거신 둘레를 도는 궤도, 감시 드론: 야적장 → 냉각호 → 철도 → 제철 지대를 크게 도는 순찰
const SHUTTLE = Array.from({ length: 14 }, (_, i) => { const [x, z] = polar(i * (360 / 14), 78); return [x, 60 + Math.sin(i * 0.9) * 9, z]; });
const SCOUT = [[-120, 60, 112], [-198, 53, 70], [-204, 50, -20], [-178, 52, -112], [-110, 58, -180], [-20, 58, -184], [46, 52, -150], [118, 50, -92], [124, 48, -10], [118, 48, 62], [70, 52, 140], [-30, 56, 152]];

function build(w) {
  const K = { blink: new Blinkers(w), lava: new Lava(), steam: new Steam(), smoke: new Steam(), sparks: [], search: [] };
  w.col.setTerrain(height);
  sky(w, K);
  ground(w, K);

  // ── 비워 둘 곳과 비행선 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 13]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 36], [SUPPLY.depot[0], SUPPLY.depot[1], 12], ...SUPPLY.camps.map((p) => [p[0], p[1], 12]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]),
    [COMBAT.blue[0], COMBAT.blue[1], 37], [SPAWN[0], SPAWN[2], 14], [PARADE[0], PARADE[1], 46], [C[0], C[1], PIT_R + 14], ...TRACKS.filter((t) => t.start).map((t) => [t.start.pos[0], t.start.pos[2], 8])];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 22);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), true)).concat([sample(SHUTTLE, true), sample(SCOUT, true)]);
  const GROUNDL = [sample(CONVOY, false), sample(RING.map(([x, z]) => [x, 0, z]), true)];
  { const g = YARD_G, a = g[g.length - 1].p, b = g[1].p, L = Math.hypot(b[0] - a[0], b[2] - a[2]); KEEP.push([g[0].p[0] - (b[0] - a[0]) / L * 16, g[0].p[2] - (b[2] - a[2]) / L * 16, 10]); }
  // 고정 구조물이 차지한 네모 [x0, x1, z0, z1]
  const BOXES = [
    [HALL.x0 - 6, HALL.x1 + 6, HALL.z - HALL.w / 2 - 6, HALL.z + HALL.w / 2 + 6],
    ...FURN.map(([x, z]) => [x - 26, x + 30, z - 24, z + 24]),
    [YARD.x0 - 6, YARD.x1 + 6, YARD.z0 - 6, YARD.z1 + 6], [-210, -52, 44, YARD.z0],
    [NGAN.x0 - 6, NGAN.x1 + 6, NGAN.z0 - 6, NGAN.z1 + 6], [-236, 236, RAIL.z - 11, RAIL.z + 11],
    [SPUR.x0 - 6, SPUR.x1 + 6, -236, -146], [PSTN.x - 40, PSTN.x + 32, PSTN.z - 22, PSTN.z + 24],
    [48, 116, 92, 152], [48, 116, 168, 216], [121, 135, -156, 112],
  ];
  const inBox = (x, z, m, B) => x > B[0] - m && x < B[1] + m && z > B[2] - m && z < B[3] + m;
  const taken = [];
  // 3 차원으로 비행선에서 r 이상 떨어져 있는가
  const clear = (x, y, z, r) => { const r2 = r * r; for (const L of LINES) for (const p of L) { const dx = p.x - x, dy = p.y - y, dz = p.z - z; if (dx * dx + dy * dy + dz * dz < r2) return false; } return true; };
  // 세로 기둥(높이 y0~y1) 둘레 r 안으로 비행선이 지나지 않는가
  const clearCol = (x, z, y0, y1, r) => { for (const L of LINES) for (const p of L) if (p.y > y0 - r && p.y < y1 + r && Math.hypot(p.x - x, p.z - z) < r) return false; return true; };
  const onRoad = (x, z, m) => {
    if (Math.abs(Math.hypot(x - C[0], z - C[1]) - ROAD_R) < 8 + m) return true;
    if (Math.abs(x) < 9 + m && z > 56) return true;
    for (const L of GROUNDL) for (const p of L) if (Math.hypot(p.x - x, p.z - z) < 5 + m) return true;
    return false;
  };
  const free = (x, z, m = 0, h = 6) => {
    if (edge(x, z) > RIM - 6 - m) return false;
    if (onRoad(x, z, m)) return false;
    if (chanDist(x, z) < 10 + m || inCause(x, z, 3 + m)) return false;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2 + m) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const B of BOXES) if (inBox(x, z, m, B)) return false;
    return clearCol(x, z, 0, h, 8 + m);
  };
  const ctx = { free, clear, clearCol, taken, KEEP, LINES };

  pit(w, K); channels(w, K); titan(w, K); scaffold(w, K, ctx);
  furnaces(w, K, ctx); hall(w, K, ctx); bridges(w, K, ctx); railway(w, K, ctx); lake(w, K, ctx); power(w, K, ctx);
  yard(w, K, ctx); cranes(w, K, ctx); garrison(w, K, ctx);
  const t0 = performance.now();
  props(w, K, ctx); lights(w, K, ctx); effects(w, K, ctx);
  K.lava.build(w); K.steam.finish(w); K.smoke.finish(w, 0x5a5f6b, 0.78); K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "foundry",
  name: "거신 공창",
  desc: "설산 빙하 골짜기에 숨은 기계제국의 조립 공창. 지름 120 m 구덩이에 선 미완성 거신 오메가, 눈밭을 가르는 주황빛 쇳물 수로와 고로, 거대한 손과 머리를 나르는 갠트리 크레인, 거인의 팔다리가 널린 야적장",
  size: 235,
  ceiling: 200,
  seed: 6117,
  env: {
    lamps: true, cloud: 0.86, cloudLit: 0xe2e8f0, cloudDark: 0x66748a,
    sky: { top: 0x566c88, horizon: 0xbcc8d6, bottom: 0xcfd8e2 }, sunDir: [-0.42, 0.46, 0.68], sunColor: 0xe6edf8, sun: 2.1, sunDisc: 2.5,
    hemi: 0.78, hemiSky: 0xc2d2ea, hemiGround: 0x93a3ba, toon: { sun: 0.6, fill: 0.4 },
    fog: { color: 0xb4c1d2, near: 170, far: 1250 }, exposure: 0.93, glow: 2.2, bloom: { strength: 0.42, radius: 0.5, threshold: 0.92 },
    outline: { color: 0x0a0d14, mul: 0.8 }, look: { scatter: 0.3, aoTint: 0x1c2a44 },
  },
  spawn: { pos: SPAWN, yaw: 0 },
  thumb: { pos: [-92, 34, 118], look: [-4, 44, -30] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "hauler", name: "부품 운반차", type: "truck", level: 1, desc: "조립 구덩이를 도는 순환로에서 거신의 부품을 실어 나르는 운반차를 따라가세요", duration: 80, color: 0x8a1018, path: RING.map(([x, z]) => [x, 0, z, 9]) },
    { id: "shuttle", name: "제국 수송정", type: "shuttle", level: 2, desc: "미완성 거신의 둘레를 천천히 도는 제국 수송정을 화면에 담으세요", duration: 85, path: SHUTTLE.map((p) => [...p, 12]) },
    { id: "scout", name: "감시 드론", type: "scout", level: 2, desc: "야적장과 냉각호, 철도, 제철 지대 위를 크게 돌며 공창을 지키는 감시 드론", duration: 90, path: SCOUT.map((p) => [...p, 14]) },
    { id: "fpv", name: "수로 레이서", type: "fpv", level: 3, desc: "쇳물 수로와 철도 터널, 주조동을 꿰는 다른 레이싱 드론", duration: 75, path: FORGE_G.map((g) => [g.p[0], g.p[1], g.p[2], 19]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: BOSS },
};
