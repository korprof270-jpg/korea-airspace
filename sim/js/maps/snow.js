// 맵: 설국 산장 — 맑게 갠 겨울 낮의 알프스 마을. 스키 슬로프와 곤돌라, 스키 점프대, 얼어붙은 호수와 얼음 폭포,
// 얼음 골짜기의 트레슬 다리, 빙하 크레바스와 얼음 동굴, 정상 천문대
import * as THREE from "../../vendor/three.module.min.js";
import { M, flora } from "./canyon-kit.js";
import { height, colorFn, forest, valE, lakeE, gorgeAt, crevAt, LAKE, POND, MESA, PISTE, GORGE, CREV, ROAD, ROAD_CP, FLATS, flat } from "./snow-terrain.js";
import { SNOW, snowPine } from "./snow-kit.js";
import { places, SITE } from "./snow-places.js";

export { height };

const KEEP = [];                               // 식생을 비울 원 [x, z, r]
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// 서리 낀 활엽수: 줄기 + 흰 수관
function frostTree(w, K, x, z, s = 1) {
  const r = w.rand, T = K.T, y = w.h(x, z) - 0.3, h = (3.4 + r() * 2.2) * s, cr = (2.3 + r() * 1.0) * s, c = [0xe9f1fa, 0xd6e6f6, 0xf4f8fd][(r() * 3) | 0];
  w.mesh(T.trunk, M(x, y, z, 0.3 * s, h + cr * 0.4, 0.3 * s), 0x5b4a3c, "std");
  w.mesh(T.crown[(r() * 3) | 0], M(x, y + h + cr * 0.55, z, cr, cr * 0.82, cr, 0, r() * 360, 0), c, "foliage");
  for (let i = 0; i < 2; i++) { const a = r() * 6.28, d = cr * (0.55 + r() * 0.2), br = cr * (0.5 + r() * 0.15); w.mesh(T.puff[i], M(x + Math.cos(a) * d, y + h + cr * (0.25 + r() * 0.3), z + Math.sin(a) * d, br, br * 0.85, br, 0, r() * 360, 0), i ? 0xcfe0f2 : 0xf4f8fd, "foliage"); }
  w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.35 * s);
  w.col.addSphere(V3(x, y + h + cr * 0.55, z), cr * 0.78);
}

function build(w) {
  const r = w.rand, H = (x, z) => w.h(x, z);
  KEEP.length = 0;
  const K = flora(w);
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.06, 1.11, 1.24", rockTint: "0.86, 0.92, 1.08", rockLo: 0.3, rockHi: 0.5 });
  const slope = (x, z) => Math.max(Math.abs(H(x + 2, z) - H(x - 2, z)), Math.abs(H(x, z + 2) - H(x, z - 2))) / 4;

  places(w, K, KEEP);

  // ── 식생·바위 (트랙·차량 경로·거점 주변은 비운다) ──
  for (const f of FLATS) KEEP.push([f[0], f[1], f[2] + 4]);
  for (const p of [...DEPOTS, ...SUPPLY.turrets, ...STRIKE.turrets, SUPPLY.depot]) KEEP.push([p[0], p[1], 7]);
  for (const t of TRACKS) if (t.start) KEEP.push([t.start.pos[0], t.start.pos[2], 8]);
  KEEP.push([SPAWN[0], SPAWN[2], 10], [BOSS[0], BOSS[2], 20]);
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => V3(q[0], 0, q[2])), loop, "centripetal").getPoints(pts.length * 8).map((v) => [v.x, v.z]);
  const LINES = [...GROUND_PATHS.map((p) => [sample(p, true), 7, true]), ...TRACKS.map((t) => [sample(t.gates.map((g) => g.p), t.loop !== false), 9, t.loop !== false]), [sample(DRONE, true), 6, true]];
  const clear = (x, z, m = 0) => {
    if (lakeE(x, z) < 1.1 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 3) return false;
    if (x > -52 && x < 126 && z > 120 && z < 228) return false;                           // 마을 안은 손으로 심는다
    const ps = PISTE.at(x, z); if (ps && ps[0] < 19 + m) return false;
    { const A = LIFT.A, dx = LIFT.B[0] - A[0], dz = LIFT.B[1] - A[1], t = Math.min(1, Math.max(0, ((x - A[0]) * dx + (z - A[1]) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - A[0] - dx * t, z - A[1] - dz * t) < 9 + m) return false; }   // 곤돌라 줄 아래
    const rd = ROAD.at(x, z); if (rd && rd[0] < 8 + m) return false;
    if (gorgeAt(x, z)[0] > 0.04 || crevAt(x, z)[0] > 0.02) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [L, wd, loop] of LINES) for (let i = 0; i < L.length - (loop ? 0 : 1); i++) {
      const a = L[i], b = L[(i + 1) % L.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < wd + m) return false;
    }
    return true;
  };
  const scatter = (count, tries, fn, R = 345) => { let n = 0; for (let i = 0; i < tries && n < count; i++) if (fn((r() * 2 - 1) * R, (r() * 2 - 1) * R)) n++; };
  // 산자락의 눈 덮인 소나무 숲 (수목 한계선 아래)
  scatter(1750, 26000, (x, z) => {
    const y = H(x, z);
    if (y < 0.7 || y > 128 || slope(x, z) > 0.46 || !clear(x, z)) return false;
    const f = forest(x, z); if (f < 0.42 && r() > 0.22) return false;
    snowPine(w, K.T, x, z, 0.75 + r() * 0.8 + (f > 0.6 ? 0.2 : 0) - Math.max(0, y - 90) * 0.008); return true;
  });
  // 분지 가장자리: 서리 낀 나무와 소나무가 드문드문
  scatter(110, 5000, (x, z) => {
    if (H(x, z) > 0.7 || valE(x, z) < 0.45 || !clear(x, z, 2)) return false;
    if (r() < 0.55) frostTree(w, K, x, z, 0.8 + r() * 0.6); else snowPine(w, K.T, x, z, 0.7 + r() * 0.5); return true;
  }, 260);
  // 마을 안의 나무
  for (const [x, z, k] of [[14, 124, 0], [-26, 126, 1], [66, 126, 0], [70, 200, 1], [94, 131, 0], [112, 186, 1], [-30, 172, 0], [-38, 196, 1], [10, 150, 0], [92, 222, 0], [-22, 222, 1], [122, 160, 0], [-48, 160, 1], [50, 222, 0], [110, 134, 1]]) k ? snowPine(w, K.T, x, z, 0.75) : frostTree(w, K, x, z, 0.95);
  // 수목 한계선 근처의 고사목
  scatter(60, 4000, (x, z) => { const y = H(x, z); if (y < 96 || y > 140 || slope(x, z) > 0.4 || !clear(x, z)) return false; K.snag(x, z, 0.8 + r() * 0.5); return true; });
  // 눈 쌓인 덤불
  scatter(240, 9000, (x, z) => {
    const y = H(x, z);
    if (y > 120 || slope(x, z) > 0.5 || !clear(x, z, -3)) return false;
    K.bush(x, z, 0.6 + r() * 0.7, r() < 0.7 ? [0xe9f1fa, 0xd6e6f6, 0xf4f8fd][(r() * 3) | 0] : 0x5f7f6a); return true;
  });
  // 바위(잿빛)와 눈 더미
  scatter(270, 9000, (x, z) => {
    const y = H(x, z), s = slope(x, z);
    if (y < 1 || s > 0.95 || !clear(x, z, -2) || (s < 0.14 && r() < 0.7)) return false;
    K.rock(x, z, 0.8 + r() * r() * 3.6, [0x8b93a6, 0x6d778c, 0xa3aab8][(r() * 3) | 0]); return true;
  });
  scatter(110, 5000, (x, z) => { if (slope(x, z) > 0.2 || !clear(x, z, -2)) return false; K.rock(x, z, 0.8 + r() * 1.4, r() < 0.5 ? SNOW : 0xdfe9f5, false); return true; });
  // 얼음 골짜기 바닥의 얼음 덩어리
  for (let t = 0.1; t < 0.98; t += 0.05 + r() * 0.05) { const p = GORGE.point(t), d = GORGE.dir(t), s = r() < 0.5 ? -1 : 1, x = p[0] - d[1] * s * (5 + r() * 2), z = p[1] + d[0] * s * (5 + r() * 2); K.rock(x, z, 1 + r() * 1.2, r() < 0.5 ? 0xcfeaf7 : 0x9fb0c4, false); }
}

// ── 경로·트랙 데이터 (지형 함수로 높이를 계산한다) ──
const T = (x, z, up) => [x, height(x, z) + up, z];
const G = (t, p, o = {}) => ({ t, p, ...o });
const LP = (L, t, up, off = 0) => { const p = L.point(t), d = L.dir(t), x = p[0] - d[1] * off, z = p[1] + d[0] * off; return [x, height(x, z) + up, z]; };
const { jump: JP, trestle: TR, snowBridge: SB, stoneBridge: STB, finish: FIN, lift: LIFT, church: CH, hotel: HO, ice: IG, canopy: CN, rink: RK, huts: HT } = SITE;

const SPAWN = [40, 0.5, 152];
const BOSS = [LAKE.x, 60, LAKE.z];
const DEPOTS = [[-66, 100], [70, 250], [flat("dep2")[0], flat("dep2")[1]], [flat("dep3")[0], flat("dep3")[1]]];
const SUPPLY = { depot: [30, 160], camps: [[10, -188], [flat("mid")[0], flat("mid")[1]], [flat("judge")[0], flat("judge")[1]], [flat("cabin")[0], flat("cabin")[1]]], turrets: [[-150, 70], [86, -98]] };
const STRIKE = { turrets: [[208, -212], [270, -160], [226, -130], [250, -84], [104, -84], [206, -150]], core: [flat("red")[0], flat("red")[1]] };

// 지상 경로: 눈길 한 바퀴(스노모빌), 마을 길(제설차), 호수 위(스케이터)
const SLED = [...ROAD_CP, [146, 190]].map(([x, z]) => [x, 0, z, 13]);
const PLOUGH = [[40, 118], [40, 150], [40, 190], [40, 220], [54, 233], [98, 228], [115, 216], [118, 190], [118, 150], [116, 128], [102, 118], [56, 113]].map(([x, z]) => [x, 0, z, 7.5]);
const SKATER = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [LAKE.x + Math.cos(a) * LAKE.rx * 0.76, 0, LAKE.z + Math.sin(a) * LAKE.rz * 0.76, 5.4]; });
const GROUND_PATHS = [SLED, PLOUGH, SKATER];
const DRONE = [T(120, 96, 10), LP(GORGE, 0.95, 12), LP(GORGE, 0.87, 9), LP(GORGE, 0.8, 9), LP(GORGE, 0.72, 10), LP(GORGE, 0.66, 14), [TR.x, (TR.floor + TR.deck) / 2, TR.z], LP(GORGE, 0.53, 34), T(126, -126, 18), T(70, -160, 26), [14, 196, -206], [-40, 200, -236], T(-84, -196, 16),
  ...[0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15, 0.05].map((t) => LP(CREV, t, 6.5)), T(-96, 14, 14), T(-56, 72, 14), [-20, 16, 104], [50, 14, 100]].map((p) => [...p, 11]);

// 1. 활강 슬라럼 (구간 주행): 정상 승강장 → 슬로프 → 결승 아치 → 마을 어귀
const DOWNHILL = [
  ...Array.from({ length: 12 }, (_, i) => { const p = LP(PISTE, 0.07 + i * 0.072, 0, (i % 2 ? 1 : -1) * 5); return G("flag", p, { w: 8, h: 6 }); }),
  G("square", [FIN.x, FIN.floor + 2.7, FIN.z], { w: 9, h: 4.4, yaw: FIN.ry + 180 }), G("hoop", T(46, 96, 8), { r: 5 }),
];
// 2. 마을 한 바퀴
const VILLAGE = [
  G("square", T(40, 128, 4.4), { w: 5.6, h: 5, yaw: 0 }), G("ring", T(14, 110, 7), { r: 3 }), G("ring", T(-34, 118, 8), { r: 3 }), G("ring", T(-62, 160, 6), { r: 3 }),
  G("square", [RK.x, 3.6, RK.z], { w: 8, h: 4.4, yaw: 90 }), G("square", [HT.x, 2.7, HT.z], { w: 4.4, h: 4, yaw: 90 }), G("ring", T(-162, 194, 6), { r: 3 }), G("ring", T(-122, 222, 6), { r: 3 }), G("ring", T(-44, 236, 6), { r: 3 }), G("ring", T(-6, 223, 4.2), { r: 2.8, yaw: 0 }),
  G("square", T(HO.x, HO.z, 2.9), { w: 5.4, h: 4.2, yaw: 0 }), G("square", T(IG.x, IG.z[1], 3.7), { w: 4.2, h: 5, yaw: 0 }), G("ring", T(IG.x, IG.tower, 5.6), { r: 2.5, yaw: 0 }),
  G("ring", T(-6, 154, 8.5), { r: 3, yaw: 0 }), G("ring", T(22, 145, 10), { r: 3 }), G("square", T(CN.x - 13.5, CN.z, 2.3), { w: 4.2, h: 3.2, yaw: -90 }), G("square", T(CN.x + 13.5, CN.z, 2.3), { w: 4.2, h: 3.2, yaw: -90 }),
  G("ring", T(98, 150, 9), { r: 3 }), G("ring", T(110, 176, 17), { r: 3 }), G("ring", T(102, 186, 19.8), { r: 2.8, yaw: 90 }), G("square", T(CH.bx, CH.z, CH.by - 0.2), { w: 4, h: 3.8, yaw: 90 }),
  G("ring", T(48, 195, 11), { r: 3 }), G("ring", T(40, 170, 6), { r: 3, yaw: 0 }),
];
// 3. 얼음 골짜기 순환
const GORGERUN = [
  G("hoop", T(112, 100, 7), { r: 5 }), G("ring", LP(GORGE, 0.975, 3.4), { r: 3.2 }), G("square", [STB.x, STB.floor + 2.4, STB.z], { w: 5, h: 3.4, yaw: STB.ry }), G("ring", LP(GORGE, 0.87, 5.5), { r: 3.4 }),
  G("ring", [SB.x, SB.floor + 9.5, SB.z], { r: 4, yaw: SB.ry }), G("ring", LP(GORGE, 0.73, 9), { r: 3.4 }), G("ring", LP(GORGE, 0.665, 14), { r: 3.4 }),
  G("square", [TR.x, (TR.floor + TR.deck) / 2 - 4, TR.z], { w: 10, h: 10, yaw: TR.ry }), G("ring", LP(GORGE, 0.54, 34), { r: 3.6 }), G("ring", LP(GORGE, 0.49, 62), { r: 3.8 }),
  G("ring", T(126, -116, 13), { r: 3.6 }), G("ring", T(88, -106, 13), { r: 3.4 }), G("hoop", T(50, -100, 28), { r: 5 }), G("ring", T(14, -96, 9), { r: 3.4 }), G("ring", T(-28, -84, 11), { r: 3.4 }),
  G("hoop", [JP.x, JP.yTop + 4, JP.zTop + 7], { r: 4.5, yaw: 180 }), G("square", [JP.x, JP.ramp(1)[1] + 2.5, JP.zLip + 0.5], { w: 4, h: 3.6, yaw: 180 }), G("hoop", T(JP.x, 34, 10), { r: 5 }),
  G("ring", T(-42, 86, 7), { r: 3.4 }), G("ring", T(6, 103, 7), { r: 3.4 }), G("ring", T(60, 99, 7), { r: 3.4 }),
];
// 4. 빙하 크레바스
const HALL_B = (() => { const ry = LIFT.ry * Math.PI / 180, v = -2; return [LIFT.B[0] + v * Math.sin(ry), LIFT.B[1] + v * Math.cos(ry)]; })();
const GLACIER = [
  G("ring", T(-100, 6, 8), { r: 3.4 }),
  ...[0.04, 0.11, 0.18, 0.25, 0.32, 0.39, 0.46, 0.53, 0.6, 0.67, 0.74, 0.81, 0.88, 0.95].map((t) => G("ring", LP(CREV, t, 5), { r: t < 0.06 || t > 0.94 ? 3.4 : 3 })),
  G("ring", T(-84, -192, 11), { r: 3.6 }), G("ring", T(-38, -204, 12), { r: 3.6 }), G("ring", T(-14, -201, 13), { r: 3.6 }), G("ring", T(8, -194, 9), { r: 3.4 }),
  G("ring", [HALL_B[0], height(LIFT.B[0], LIFT.B[1]) + 2.5, HALL_B[1]], { r: 2, yaw: LIFT.ry + 90 }),
  G("ring", T(47, -176, 5.5), { r: 3 }), G("ring", T(66, -152, 15), { r: 3.6 }), G("ring", T(80, -96, 13), { r: 3.6 }), G("hoop", T(44, -44, 30), { r: 5 }), G("ring", T(-8, -18, 11), { r: 3.6 }), G("ring", T(-52, 26, 12), { r: 3.6 }), G("ring", T(-82, 36, 9), { r: 3.4 }),
];
const TRACKS = [
  { id: "village", name: "마을 한 바퀴", level: 1, laps: 2, desc: "시계탑 문에서 출발해 빙상장과 얼음 낚시 오두막, 호텔 통로와 얼음 아치, 야시장 천막, 교회 종탑을 꿰는 마을 순환 코스", start: { pos: [40, 0, 146], yaw: 0 }, gates: VILLAGE },
  { id: "downhill", name: "활강 슬라럼", level: 2, loop: false, desc: "정상 승강장에서 깃발 사이를 지그재그로 내려와 결승 아치를 통과하는 스키 슬로프 구간 주행", start: { pos: [3, 0, -186], yaw: 180 }, gates: DOWNHILL },
  { id: "gorge", name: "얼음 골짜기 순환", level: 2, laps: 1, desc: "돌다리 아치와 눈 다리, 트레슬 다리 밑을 지나 골짜기를 거슬러 오른 뒤 스키 점프대를 타고 마을로 돌아오는 일주 코스", start: { pos: [92, 0, 100], yaw: -90 }, gates: GORGERUN },
  { id: "glacier", name: "빙하 크레바스", level: 3, laps: 2, desc: "좁은 크레바스와 얼음 동굴을 꿰어 정상에 오른 뒤 승강장을 뚫고 내려오는 고난도 코스", start: { pos: [-82, 0, 26], yaw: 42 }, gates: GLACIER },
];

export default {
  id: "snow",
  name: "설국 산장",
  desc: "맑게 갠 겨울 낮의 알프스 마을. 스키 슬로프와 곤돌라, 스키 점프대, 얼어붙은 호수와 얼음 폭포, 빙하 크레바스의 얼음 동굴, 정상 천문대까지",
  size: 300,
  ceiling: 230,
  seed: 73,
  env: {
    sky: { top: 0x2f72d8, horizon: 0xcfe6fb, bottom: 0xe8f1fa }, sunDir: [0.42, 0.5, 0.76], sunColor: 0xfff1dc, sun: 3.1,
    hemi: 0.5, hemiSky: 0x9cc0ff, hemiGround: 0xcfdcf0, cloud: 0.34, cloudLit: 0xffffff, cloudDark: 0xa9bfdc,
    fog: { color: 0xd4e6f8, near: 260, far: 1900 }, exposure: 0.94, glow: 2.2,
  },
  spawn: { pos: SPAWN, yaw: 0 },
  thumb: { pos: [-150, 46, 262], look: [10, 44, 0] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "sled", name: "스노모빌 일주", type: "sportscar", level: 1, desc: "호수와 마을을 감싸는 눈길을 한 바퀴 도는 스노모빌. 눈사태 방지 터널에 들어가는 순간을 놓치지 마세요", duration: 80, color: 0xd9432f, path: SLED },
    { id: "skater", name: "호수 위의 스케이터", type: "runner", level: 1, desc: "얼어붙은 호수 가장자리를 도는 스케이터를 가까이에서 따라가세요", duration: 70, path: SKATER },
    { id: "plough", name: "마을 제설차", type: "truck", level: 2, desc: "시계탑 문을 지나 마을 길을 도는 제설차 추적. 산장 지붕에 가려지지 않게 고도를 잡으세요", duration: 80, path: PLOUGH },
    { id: "drone", name: "빙하 드론", type: "drone", level: 3, desc: "얼음 골짜기의 다리 밑을 지나 정상을 넘고 크레바스로 내려가는 드론을 화면에 담으세요", duration: 95, path: DRONE },
  ],
  combat: { blue: [flat("blue")[0], flat("blue")[1]], red: [flat("red")[0], flat("red")[1]], depots: DEPOTS },
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7, path: ROAD_CP.map(([x, z]) => [x, 0, z]) },
  boss: { pos: BOSS },
};
