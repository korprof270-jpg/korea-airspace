// 맵: 에일 행성 '어미별' — 히든 스토리 「별의 저편」 에일 종족의 고향. 보랏빛·청록 하늘에 고리 가스 행성과 두 위성이 걸려 있다
//  · 가운데: 하이브 섬 — 껍질 돔과 소라 탑이 모인 살아 있는 도시, 기둥 사이로 날아드는 합창당
//  · 북서: 결정·산호 첨탑 숲   · 북동: 갈비뼈 요람에 정박한 에일 모함   · 남서: 빛나는 포자 들판   · 남동: 해파리가 떠도는 빛 늪
//  · 네 방위 디딤 섬: 노래 바위(북)·알 둥지(동)·어미나무(남)·숨구멍(서)
//  · 섬 사이는 안개가 차오른 깊은 틈. 뼈 아치를 얹은 뿌리 등성이가 섬들을 잇고, 하늘엔 바위섬이 떠 있다
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, lane } from "./ail-kit.js";
import { height, colorFn, land, BRIDGES, ROAD, LAKE } from "./ail-terrain.js";
import { hive, hall, cradle, spires, lagoon, henge, nest, elderTree, vents, bridgeDecor, cliffRoots, PLAZA, HALL, HALL_R, CRADLE, SHIP_YAW, HENGE, TREE, NEST, VENTS } from "./ail-base.js";
import { floaters, sporeField, flora, mist, spores, jellies, rays, farIslands } from "./ail-detail.js";
import { sky } from "./ail-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const T = (x, z, up) => [x, height(x, z) + up, z];
// 다리 위 한 점 (from → to 다리의 틈 구간 비율 f), 마루에서 up m 위
const BR = (from, to, f = 0.5, up = 4.5) => {
  const B = BRIDGES.find((b) => b.from === from && b.to === to), s = B.span[0] + (B.span[1] - B.span[0]) * f, x = B.a[0] + B.ux * s, z = B.a[1] + B.uz * s;
  return [x, height(x, z) + up, z];
};
const HY = height(HALL[0], HALL[1]);
// 요람 안의 한 점: 함선 축을 따라 갈비뼈 사이(u = 8.5)에서 가로 v, 땅에서 up m 위
const CR = (v, up) => { const a = SHIP_YAW * Math.PI / 180, x = CRADLE[0] + Math.cos(a) * 8.5 + Math.sin(a) * v, z = CRADLE[1] - Math.sin(a) * 8.5 + Math.cos(a) * v; return [x, height(x, z) + up, z]; };

// 1. 하이브 순환: 남쪽 길 → 광장 → 합창당 기둥 사이로 관통 → 북쪽 → 동쪽 돔 골목을 돌아 남쪽으로
const HIVERUN = [
  G("square", T(0, 72, 4), { w: 9, h: 6 }), G("hoop", T(-12, 34, 5.5), { r: 5 }), G("square", [HALL[0], HY + 7, HALL[1]], { w: 10, h: 9 }),
  G("hoop", T(0, -96, 6), { r: 5 }), G("hoop", T(50, -70, 8), { r: 5 }), G("square", T(84, -4, 5), { w: 9, h: 7 }), G("hoop", T(58, 48, 7), { r: 5 }),
];
// 2. 섬 고리 일주: 바깥 여덟 섬을 다리로 돌며 첨탑 숲·노래 바위·모함 배 아래·빛 늪·어미나무·포자 들판을 지난다
const RINGRUN = [
  G("square", T(-194, 0, 6), { w: 10, h: 7 }), G("square", BR("west", "spire"), { w: 10, h: 7 }), G("hoop", T(-150, -122, 9), { r: 5.5 }), G("ring", T(-186, -176, 12), { r: 6 }),
  G("hoop", T(-118, -184, 10), { r: 5.5 }), G("square", BR("spire", "north"), { w: 10, h: 7 }), G("hoop", T(0, -200, 6), { r: 6 }), G("square", BR("north", "cradle"), { w: 10, h: 7 }),
  G("hoop", T(141, -219, 12), { r: 5.5 }), G("square", CR(0, 10), { w: 12, h: 10 }), G("hoop", T(212, -148, 9), { r: 5.5 }), G("square", BR("cradle", "east"), { w: 10, h: 7 }),
  G("square", T(194, 0, 5), { w: 10, h: 7 }), G("square", BR("east", "lagoon"), { w: 10, h: 7 }), G("hoop", [LAKE.x - 8, 6, LAKE.z - 8], { r: 6 }), G("square", BR("lagoon", "south"), { w: 10, h: 7 }),
  G("square", T(0, 196, 5.5), { w: 10, h: 7 }), G("square", BR("south", "spore"), { w: 10, h: 7 }), G("hoop", T(-172, 116, 7), { r: 5.5 }), G("square", BR("spore", "west", 0.5, 6), { w: 10, h: 7 }),
];
// 3. 부유섬 다이브: 합창당을 꿰고 바위섬 사이로 치솟아 모함 배 밑을 지나고, 안개 낀 틈으로 내리꽂았다가 다리를 넘어 솟구친다
const DIVE = [
  G("hoop", T(0, 64, 6), { r: 5 }), G("square", [HALL[0], HY + 7, HALL[1]], { w: 10, h: 9 }), G("hoop", [20, 40, -120], { r: 5.5 }), G("ring", [60, 78, -150], { r: 6 }),
  G("hoop", [141, 40, -219], { r: 5.5 }), G("square", CR(0, 10), { w: 12, h: 9 }), G("hoop", T(212, -148, 12), { r: 5.5 }), G("hoop", [228, 16, -116], { r: 5.5 }), G("hoop", [242, -14, -70], { r: 6 }), G("hoop", [198, 36, -64], { r: 6 }), G("hoop", [150, 34, -58], { r: 5.5 }),
  G("ring", [100, 100, -36], { r: 6 }), G("hoop", [36, 132, 36], { r: 6 }), G("ring", [-60, 112, 64], { r: 6 }), G("hoop", [-118, 74, 104], { r: 5.5 }),
  G("hoop", [-88, 8, 88], { r: 6 }), G("hoop", T(-44, 40, 9), { r: 5.5 }),
];
const TRACKS = [
  { id: "hive", name: "하이브 순환", level: 1, laps: 3, desc: "껍질 돔 도시의 광장에서 출발해 합창당 기둥 사이를 꿰뚫고, 돔 골목을 한 바퀴 도는 입문 코스", gates: HIVERUN },
  { id: "isles", name: "섬 고리 일주", level: 2, laps: 2, desc: "뿌리 다리의 뼈 아치 밑을 따라 바깥 여덟 섬을 도는 코스. 첨탑 숲, 노래 바위, 모함 배 아래, 빛 늪, 어미나무를 차례로 지난다", gates: RINGRUN },
  { id: "dive", name: "부유섬 다이브", level: 3, laps: 2, desc: "합창당을 꿰고 떠 있는 바위섬 사이로 치솟아 모함 배 밑을 지난 뒤, 안개 낀 섬 틈으로 내리꽂았다 솟구치는 고난도 코스", gates: DIVE },
];

// ── 임무 지점 ──
const DEPOTS = [[-62, 48], [66, -52], [-14, -196], [14, 196]];
const STRIKE = { turrets: [[150, -112], [212, -140], [190, -100], [120, -150], [150, -210], [120, -195]], core: [190, -128] };
const SUPPLY = { depot: [24, 50], camps: [[-150, -150], [194, -10], [-14, 200], [-150, 175]], turrets: [[-120, -180], [175, 130]] };
const COMBAT = { blue: [-150, 150], red: [128, -122], depots: DEPOTS };

// 순환 길 바깥 차선(호송 트럭·탐사 트럭)
const OUTER = lane(ROAD, 2.6, 160);
const near = (p) => OUTER.reduce((b, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(OUTER[b][0] - p[0], OUTER[b][1] - p[1]) ? i : b), 0);
const CONVOY = (() => {
  const out = [], N = OUTER.length, i0 = near([0, 194]), i1 = near([0, -194]);
  const dir = ((near([-100, 180]) - i0 + N) % N) < N / 2 ? 1 : -1;
  for (let i = i0; ; i = (i + dir + N) % N) { out.push([OUTER[i][0], 0, OUTER[i][1]]); if (i === i1 || out.length > N) break; }
  return out;
})();
const DRONE = [[0, 9, 72], [-14, 7, 30], [0, 8, -46], [0, 10, -100], [0, 13, -160], [-12, 12, -198], [22, 16, -212], [34, 18, -168], [62, 22, -112], [86, 15, -40], [92, 11, 12], [62, 13, 60], [24, 10, 82]];
// 에일 가오리: 첨탑 숲과 하이브 사이를 크게 너울거리며 난다
const RAY = [[-60, 40, -40], [-110, 52, -90], [-150, 60, -150], [-200, 50, -170], [-200, 44, -110], [-150, 36, -60], [-100, 30, -10], [-60, 34, 40], [-20, 42, 20]];

function build(w) {
  const K = { blink: new Blinkers(w) };
  w.terrain(height, colorFn, { flat: "grass", flatTint: "1.08, 1.0, 1.5", rockTint: "0.86, 0.8, 1.12", rockLo: 0.34, rockHi: 0.6 });
  sky(w);
  mist(w);

  // ── 비워 둘 곳: 임무 지점·기지·트랙·길 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 9]), ...STRIKE.turrets.map((p) => [p[0], p[1], 7]), [STRIKE.core[0], STRIKE.core[1], 12], [SUPPLY.depot[0], SUPPLY.depot[1], 10], ...SUPPLY.camps.map((p) => [p[0], p[1], 11]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 7]),
    [COMBAT.blue[0], COMBAT.blue[1], 34], [COMBAT.red[0], COMBAT.red[1], 30], [PLAZA[0], PLAZA[1], 30], [HALL[0], HALL[1], HALL_R + 6], [CRADLE[0], CRADLE[1], 48], [HENGE[0], HENGE[1], 26], [TREE[0], TREE[1], 18], [NEST[0], NEST[1], 20], ...VENTS.map((v) => [v[0], v[1], 9]),
    [-150, -150, 24], [150, 150, 20], [LAKE.x, LAKE.z, LAKE.R + 2]];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 10);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat([sample(DRONE, true), sample(RAY, true)]);
  const roadPts = OUTER.map(([x, z]) => [x, z]);
  const road = (x, z, m = 0) => { for (const [qx, qz] of roadPts) if (Math.hypot(x - qx, z - qz) < 8 + m) return false; return true; };
  const onBridge = (x, z, m = 0) => BRIDGES.some((B) => { const t = (x - B.a[0]) * B.ux + (z - B.a[1]) * B.uz, d = Math.abs((x - B.a[0]) * -B.uz + (z - B.a[1]) * B.ux); return t > B.span[0] - 4 && t < B.span[1] + 4 && d < 12 + m; });
  const taken = [];
  // low: 낮은 풀·포자처럼 부딪히지 않는 것 (트랙 선 검사를 느슨하게)
  const free = (x, z, m = 0, low = false) => {
    if (!road(x, z, m) || onBridge(x, z, m)) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    if (!low) for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    const gy = height(x, z);
    for (const L of LINES) for (const p of L) if (p.y - gy < (low ? 4 : 40) && Math.hypot(x - p.x, z - p.z) < (low ? 3 : 9) + m) return false;
    return true;
  };
  const air = [];
  const freeAir = (x, y, z, m) => {
    for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, y - p.y, z - p.z) < m + 6) return false;
    for (const [ax, ay, az, s] of air) if (Math.hypot(x - ax, y - ay, z - az) < m + s) return false;
    return true;
  };
  const t0 = performance.now(), ctx = { free, freeAir, taken, air, road };
  hall(w, K); cradle(w, K);
  henge(w, K, ctx); nest(w, K, ctx); elderTree(w, K, ctx); vents(w, K, ctx);
  hive(w, K, ctx); spires(w, K, ctx); lagoon(w, K, ctx);
  bridgeDecor(w, K); cliffRoots(w, K);
  sporeField(w, K, ctx); flora(w, K, ctx);
  floaters(w, K, ctx);
  farIslands(w);
  spores(w); jellies(w, ctx); rays(w);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "ail",
  name: "에일 행성 어미별",
  desc: "에일 종족의 고향. 고리 가스 행성이 걸린 보랏빛 하늘 아래 떠 있는 섬들 — 껍질 돔 도시와 합창당, 결정 첨탑 숲, 갈비뼈 요람의 모함, 포자 들판과 해파리 늪. 섬 사이는 안개 낀 틈이다",
  size: 240,
  ceiling: 200,
  seed: 307,
  land,
  env: {
    stars: true, cloud: 0.28, noWind: false, lamps: false,
    sky: { top: 0x1c0c4a, horizon: 0x3aa8b8, bottom: 0x2a1a5a }, horizonGlow: 0x3a2060, cloudLit: 0xffc8f0, cloudDark: 0x6a4aa8,
    sunDir: [0.55, 0.36, 0.6], sunColor: 0xffe4f6, sun: 3.0, sunDisc: 6,
    hemi: 0.62, hemiSky: 0xb8a0ff, hemiGround: 0x2a6a70, toon: { sun: 0.58, fill: 0.3 },
    fog: { color: 0x5a5aa8, near: 260, far: 1500 }, exposure: 1.02, glow: 2.0, bloom: { strength: 0.42, radius: 0.55, threshold: 0.9 }, look: { scatter: 0.16 },
  },
  spawn: { pos: [0, 0, 64], yaw: 0 },
  thumb: { pos: [96, 64, 236], look: [-30, 26, -60] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "rover", name: "연합 탐사 트럭", type: "truck", level: 1, desc: "뿌리 다리를 건너 바깥 섬들을 도는 탐사 트럭을 따라가세요", duration: 85, color: 0xe9ebf0, path: OUTER.filter((_, i) => i % 4 === 0).map(([x, z]) => [x, 0, z, 9]) },
    { id: "drone", name: "정찰 드론", type: "drone", level: 2, desc: "합창당을 꿰고 노래 바위를 돌아오는 정찰 드론을 화면에 담으세요", duration: 85, path: DRONE.map((p) => [...p, 11]) },
    { id: "ray", name: "에일 가오리", type: "ray", level: 2, desc: "첨탑 숲 위를 너울거리며 나는 에일의 날짐승을 놓치지 마세요", duration: 80, path: RAY.map((p) => [...p, 13]) },
    { id: "fpv", name: "섬 레이서", type: "fpv", level: 3, desc: "뼈 아치 밑으로 바깥 섬들을 도는 다른 레이싱 드론", duration: 75, path: RINGRUN.map((g) => [g.p[0], g.p[1], g.p[2], 20]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: [0, 70, 40] },
};
