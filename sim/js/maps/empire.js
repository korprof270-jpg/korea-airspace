// 맵: 기계제국 수도 — AI 에이아가 다스리는 기계제국의 심장. 연기 낀 주황빛 하늘 아래 검은 강철 도시
//  · 가운데 북쪽: 에이아의 첨탑(기둥 사이로 트인 심장실, 맥박 치는 붉은 심장, 190 m 바늘)과 광장
//  · 북서: 검은 모노리스 숲, 남북 컨베이어 다리   · 북동: 조립동(남북 터널)과 위를 오가는 갠트리 크레인, 케이블 숲
//  · 남동: 쇳물이 끓는 용광로 구덩이 셋과 국자 갠트리, 굴뚝   · 남서: 적층 공장 블록(동서 터널)
//  · 남쪽을 가로지르는 동서 컨베이어 다리, 둘레: 순환 대로와 철골 아치 넷, 대로의 감시 거상, 성벽과 모서리 탐조등
//  · 첨탑에서 네 철탑으로 늘어진 붉은 에너지선, 원경은 끝없는 탑의 지평선과 연기 기둥
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, lane, arch, height, DEG, RED, RED2, GUN, BLK2, SP, PLAZA, ROAD_R, AVE, PITS, HIVES, HALL, CRANE_X, CONV_A, CONV_B, CABLES, PYLONS, WALL } from "./empire-kit.js";
import { ground, markings, spire, walls } from "./empire-base.js";
import { hives, foundry, hall, conveyors, cableForest, energyLines } from "./empire-works.js";
import { towers, rimBlocks, stacks, sentinels, props, lightsAll } from "./empire-detail.js";
import { sky } from "./empire-sky.js";

export { height };

// ── 순환 대로 위의 점(각도 증가 방향: 남 → 서 → 북 → 동) ──
const RP = (deg, r = ROAD_R) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
const at = (deg, y, r = ROAD_R) => { const [x, z] = RP(deg, r); return [x, y, z]; };
const ARCHES = [90, 180, 270, 0].map((d) => ({ d, p: RP(d), yaw: d % 180 === 0 ? 0 : 90 }));
const XA = Math.asin(CONV_A.z / ROAD_R) / DEG, XB = 180 + Math.acos(-CONV_B.x / ROAD_R) / DEG;   // 컨베이어와 대로가 만나는 각

const G = (t, p, o = {}) => ({ t, p, ...o });

// 1. 제국 대로: 순환 대로를 따라 네 철골 아치와 세 번의 컨베이어 다리 밑을 지난다
const RING = [
  G("square", at(90, 4.6), { w: 9, h: 6 }), G("square", at(180 - XA, 7), { w: 12, h: 9 }),
  G("hoop", at(158, 7, 133), { r: 5 }), G("square", at(180, 4.6), { w: 9, h: 6 }), G("square", at(XB, 8), { w: 12, h: 9 }),
  G("hoop", at(244, 8, 133), { r: 5 }), G("square", at(270, 4.6), { w: 9, h: 6 }), G("hoop", at(315, 9, 137), { r: 5 }), G("square", at(360, 4.6), { w: 9, h: 6 }),
  G("hoop", at(28, 7, 133), { r: 5 }), G("square", at(XA, 7), { w: 12, h: 9 }),
];
// 2. 제련소 관통: 적층 공장 터널 → 모노리스 숲 → 컨베이어 다리 밑 → 조립동 터널 → 용광로 구덩이 강하
const FORGE = [
  G("hoop", [-20, 6, 62], { r: 4.5 }), G("square", [-44, 5.5, 62], { w: 10, h: 7.5 }), G("square", [-96, 5.5, 62], { w: 10, h: 7.5 }), G("hoop", [-150, 10, 20], { r: 5 }),
  G("hoop", [-160, 12, -60], { r: 5 }), G("hoop", [-150, 14, -130], { r: 5 }), G("square", [CONV_B.x, 14, -165], { w: 12, h: 10 }), G("hoop", [-50, 10, -150], { r: 5 }),
  G("hoop", [40, 12, -124], { r: 5 }), G("square", [HALL.x, 7.5, HALL.z0 - 6], { w: 12, h: 9 }), G("square", [HALL.x, 7.5, HALL.z1 + 6], { w: 12, h: 9 }),
  G("hoop", [62, 8, 24], { r: 5 }), G("hoop", [PITS[0][0], -1.5, PITS[0][1]], { r: 5 }), G("hoop", [28, 10, 96], { r: 5 }),
];
// 3. 심장 강하: 첨탑을 감아 올라 에이아의 심장실을 꿰뚫고, 모노리스 숲 위로 돌아 컨베이어 다리 밑으로 내리꽂는다
const HEART = [
  G("hoop", [0, 10, 30], { r: 5 }), G("hoop", [40, 34, -10], { r: 5 }), G("hoop", [40, 74, SP[1] - 12], { r: 5 }), G("ring", [0, 77, SP[1] - 12], { r: 3.6 }),
  G("hoop", [-40, 74, SP[1] - 12], { r: 5 }), G("hoop", [-95, 64, -120], { r: 5.5 }), G("hoop", [-160, 40, -175], { r: 5.5 }), G("hoop", [-200, 22, -110], { r: 5 }),
  G("square", [CONV_B.x, 13, -50], { w: 12, h: 10 }), G("hoop", [-45, 7, 20], { r: 5 }),
];
const TRACKS = [
  { id: "ring", name: "제국 대로", level: 1, laps: 3, desc: "순환 대로를 따라 네 개의 철골 아치와 세 번의 컨베이어 다리 밑을 지나는 입문 코스", gates: RING },
  { id: "forge", name: "제련소 관통", level: 2, laps: 2, desc: "적층 공장 터널을 빠져나가 모노리스 숲과 컨베이어 다리 밑을 지나고, 조립동 터널을 꿰어 쇳물이 끓는 용광로 구덩이로 뛰어드는 코스", gates: FORGE },
  { id: "heart", name: "심장 강하", level: 3, laps: 2, desc: "에이아의 첨탑을 감아 올라 붉은 심장 옆을 스쳐 지나고, 모노리스 숲 위를 돌아 컨베이어 다리 밑으로 내리꽂는 고난도 코스", gates: HEART },
];

// ── 임무 지점 ──
const DEPOTS = [[-115, 25], [120, 6], [-55, -160], [35, 155]];
const STRIKE = { turrets: [[120, -150], [135, -205], [195, -200], [205, -140], [165, -120], [110, -185]], core: [160, -170] };
const SUPPLY = { depot: [-125, 140], camps: [[-175, -55], [55, -165], [205, 22], [30, 205]], turrets: [[-75, -150], [140, 130]] };
const COMBAT = { blue: [-165, 165], red: [160, -170], depots: DEPOTS };
const SPAWN = [0, 0, 95];

// 대로 바깥 차선(운반 트럭·호송)
const OUTER = lane(Array.from({ length: 16 }, (_, i) => RP((i / 16) * 360)), 3, 96);
const near = (deg) => { const [x, z] = RP(deg); return OUTER.reduce((b, q, i) => (Math.hypot(q[0] - x, q[1] - z) < Math.hypot(OUTER[b][0] - x, OUTER[b][1] - z) ? i : b), 0); };
const CONVOY = (() => { const out = [], N = OUTER.length, i0 = near(100), i1 = near(30); const dir = ((near(110) - i0 + N) % N) < N / 2 ? 1 : -1; for (let i = i0; ; i = (i + dir + N) % N) { out.push([OUTER[i][0], 0, OUTER[i][1]]); if (i === i1 || out.length > N) break; } return out; })();
// 감시 드론: 첨탑 둘레를 크게 도는 순찰 경로 (공장 지붕·크레인보다 높게)
const DRONE = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [Math.cos(a) * 110, 54 + Math.sin(a * 3) * 8, Math.sin(a) * 110]; });

function build(w) {
  const K = { blink: new Blinkers(w) };
  w.col.setTerrain(height);
  sky(w);
  ground(w); markings(w, K); spire(w, K); walls(w, K);

  // ── 비워 둘 곳 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 12]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 18], [SUPPLY.depot[0], SUPPLY.depot[1], 12], ...SUPPLY.camps.map((p) => [p[0], p[1], 13]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]),
    [COMBAT.blue[0], COMBAT.blue[1], 36], [COMBAT.red[0], COMBAT.red[1], 34], [160, 158, 28], [-166, -162, 28],[SP[0], SP[1], PLAZA + 4], [SPAWN[0], SPAWN[2], 12], ...PITS.map(([x, z, R]) => [x, z, R + 8]), ...PYLONS.map(([x, z]) => [x, z, 9])];
  const BOXES = [
    ...HIVES.map(([x, z, S]) => [x - S / 2 - 4, x + S / 2 + 4, z - S / 2 - 4, z + S / 2 + 4]),
    [CRANE_X[0] - 6, CRANE_X[1] + 6, HALL.z0 - 22, HALL.z1 + 22],
    [CONV_A.x0 - 10, CONV_A.x1 + 10, CONV_A.z - 10, CONV_A.z + 10], [CONV_B.x - 11, CONV_B.x + 11, CONV_B.z0 - 10, CONV_B.z1 + 10],
  ];
  const CBOX = [CABLES.x0 - 5, CABLES.x1 + 5, CABLES.z0 - 5, CABLES.z1 + 5];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 12);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat([sample(DRONE, true)]);
  // 출발 지점(첫 게이트 앞 16 m)도 비운다
  for (const t of TRACKS) { const g = t.gates, a = g[g.length - 1].p, b = g[1].p, L = Math.hypot(b[0] - a[0], b[2] - a[2]); KEEP.push([g[0].p[0] - (b[0] - a[0]) / L * 16, g[0].p[2] - (b[2] - a[2]) / L * 16, 10]); }
  const roadD = (x, z) => Math.abs(Math.hypot(x, z) - ROAD_R);
  const taken = [];
  const inBox = (x, z, m, B) => x > B[0] - m && x < B[1] + m && z > B[2] - m && z < B[3] + m;
  const free = (x, z, m = 0, cables = false) => {
    if (roadD(x, z) < 9 + m) return false;
    if (Math.abs(x) < AVE + 2 + m && (z > SP[1] || z < SP[1] - PLAZA)) return false;
    if (Math.abs(z) < AVE + 2 + m) return false;
    if (Math.abs(x) > WALL - 4 - m || Math.abs(z) > WALL - 4 - m) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const B of BOXES) if (inBox(x, z, m, B)) return false;
    if (!cables && inBox(x, z, m, CBOX)) return false;
    for (const L of LINES) for (const p of L) if (p.y < 24 && Math.hypot(x - p.x, z - p.z) < 9 + m) return false;
    return true;
  };
  // 높이 상한: 근처를 지나는 레이스 선·드론 경로보다 14 m 아래
  const cap = (x, z, r) => { let h = Infinity; for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, z - p.z) < r + 4) h = Math.min(h, p.y - 14); return h; };
  // 컨베이어 다리 기둥을 세우면 안 되는 곳(레이스 선이 낮게 지나는 자리)
  const legBlocked = (x, z) => LINES.some((L) => L.some((p) => p.y < 26 && Math.hypot(x - p.x, z - p.z) < 10));

  hives(w, K); foundry(w, K); hall(w, K); conveyors(w, K, legBlocked);
  cableForest(w, K, (x, z) => free(x, z, 1, true)); energyLines(w, K);
  for (const a of ARCHES) arch(w, K, a.p[0], a.p[1], 30, 22, a.yaw, { name: "제국 대로 아치 아래", color: GUN, accent: RED, light: RED });

  const t0 = performance.now(), ctx = { free, cap, taken };
  sentinels(w, K, ctx);
  stacks(w, K, ctx);
  rimBlocks(w, K, ctx);
  const tl = towers(w, K, ctx);
  props(w, K, ctx);
  lightsAll(w, tl);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "empire",
  name: "기계제국 수도",
  desc: "AI 에이아가 다스리는 기계제국의 심장. 붉은 심장이 뛰는 첨탑, 검은 모노리스 숲, 용광로 구덩이와 조립동, 드론 부품이 흐르는 거대 컨베이어, 케이블 숲. 하늘은 연기로 붉다",
  size: 230,
  ceiling: 200,
  seed: 307,
  env: {
    lamps: true, noWind: true, cloud: 0.7, cloudLit: 0xff7a3a, cloudDark: 0x3a1410, horizonGlow: 0x8a2408,
    sky: { top: 0x1a0807, horizon: 0xb8461c, bottom: 0x2a0c08 }, sunDir: [-0.35, 0.2, -0.92], sunColor: 0xff8a52, sun: 2.6, sunDisc: 4,
    hemi: 0.62, hemiSky: 0xff9a6a, hemiGround: 0x3a1a14, toon: { sun: 0.6, fill: 0.32 },
    fog: { color: 0x4a1c10, near: 110, far: 900 }, exposure: 1.06, glow: 2.1, bloom: { strength: 0.5, radius: 0.55, threshold: 0.88 },
    outline: { color: 0x0a0404, mul: 0.8 }, look: { scatter: 0.35, aoTint: 0x2a0c0c },
  },
  spawn: { pos: SPAWN, yaw: 0 },
  thumb: { pos: [-150, 96, 236], look: [0, 60, -50] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "truck", name: "부품 운반 트럭", type: "truck", level: 1, desc: "순환 대로를 따라 네 철골 아치 밑을 지나는 제국 부품 운반 트럭을 따라가세요", duration: 80, color: 0x8a1018, path: OUTER.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, 0, z, 9]) },
    { id: "drone", name: "감시 드론", type: "drone", level: 2, desc: "첨탑 둘레를 크게 돌며 도시를 감시하는 제국 드론을 화면에 담으세요", duration: 85, path: DRONE.map((p) => [...p, 11]) },
    { id: "fpv", name: "공장 레이서", type: "fpv", level: 3, desc: "공장 터널과 조립동, 용광로 구덩이를 꿰는 다른 레이싱 드론", duration: 75, path: FORGE.map((g) => [g.p[0], g.p[1], g.p[2], 19]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: [0, 62, 40] },
};
