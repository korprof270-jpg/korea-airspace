// 맵: 궤도 요새 아크라이트 — 지구 궤도에 떠 있는 거대한 방위 요새. 인공 중력이 걸린 팔각 갑판 위에서 싸우고 달린다
//  · 가운데 북쪽: 반응로 탑(자이로 고리·에너지 구·하늘로 솟는 빛기둥)   · 북: 격납고 세 동(옆문을 꿰는 터널)
//  · 동: 도킹 관제탑과 갑판 밖으로 뻗은 도킹 암, 정박한 수송선   · 서: 방열판 숲, 갑판 밖 날개 방열판
//  · 남: 주포대 넷   · 북동: 에일 생체 결정에 감염된 구역   · 둘레: 순환 도로와 네 개의 캣워크 아치, 고리문
//  · 갑판 밖은 허공 — 발아래 지구, 하늘 높이 에일 행성, 떠다니는 소행성
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, lane, arch, ringGate, height, onDeck, HALF, DEG, CYA, VIO2, AMB, ORG, NAVY } from "./orbit-kit.js";
import { deck, hull, markings, reactor, hangars, docks, radiators, guns, masts, bridges, conduits, REACTOR, HANGARS, HZ, HW, HD, DOCKS, DOCK_X, RAD_X, RAD_Z, GUNS, MASTS, ROAD_R, PAD, shuttle } from "./orbit-base.js";
import { infestation, asteroids, props } from "./orbit-detail.js";
import { sky } from "./orbit-sky.js";

export { height };

// ── 순환 도로 위의 점과 진행 방향(도로를 시계 반대: 남 → 서 → 북 → 동) ──
const RP = (deg, r = ROAD_R) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
const RYAW = (deg) => Math.atan2(Math.sin(deg * DEG), -Math.cos(deg * DEG)) / DEG;   // 진행 방향 (-sinφ, cosφ) 의 yaw
const ARCHES = [90, 180, 270, 0].map((d) => ({ d, p: RP(d), yaw: d % 180 === 0 ? 0 : 90 }));
const RINGS = [
  { p: [...RP(207, ROAD_R)], y: 14, R: 9, yaw: RYAW(207) },
  { p: [...RP(27, ROAD_R)], y: 14, R: 9, yaw: RYAW(27) },
];

const G = (t, p, o = {}) => ({ t, p, ...o });
const yawTo = (a, b) => Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])) * 180 / Math.PI;
const at = (deg, y, r = ROAD_R) => { const [x, z] = RP(deg, r); return [x, y, z]; };

// 1. 갑판 순환: 도로를 따라 네 아치 밑과 두 고리문을 지난다
const DECKRUN = [
  G("square", at(90, 4.6), { w: 9, h: 6 }), G("hoop", at(135, 7, 128), { r: 5 }), G("square", at(180, 4.6), { w: 9, h: 6 }), G("ring", [RINGS[0].p[0], RINGS[0].y, RINGS[0].p[1]], { r: 6.5, yaw: RINGS[0].yaw }),
  G("hoop", at(238, 8, 126), { r: 5 }), G("square", at(270, 4.6), { w: 9, h: 6 }), G("hoop", at(315, 9, 128), { r: 5 }), G("square", at(360, 4.6), { w: 9, h: 6 }),
  G("ring", [RINGS[1].p[0], RINGS[1].y, RINGS[1].p[1]], { r: 6.5, yaw: RINGS[1].yaw }), G("hoop", at(58, 7, 128), { r: 5 }),
];
// 2. 요새 일주: 방열판 골목 → 격납고 세 동을 꿰는 터널 → 감염 구역 → 도킹 암 아래 → 주포대 앞
const FORT = [
  G("hoop", [-170, 9, 40], { r: 4.5 }), G("hoop", [-170, 9, -60], { r: 4.5 }), G("hoop", [-170, 10, -118], { r: 4.5 }), G("hoop", [-212, 9, -182], { r: 4.5 }),
  G("square", [-182, 5.2, HZ], { w: 9, h: 7.5, yaw: -90 }), G("square", [-112.5, 5.2, HZ], { w: 9, h: 7.5, yaw: -90 }), G("square", [-37.5, 5.2, HZ], { w: 9, h: 7.5, yaw: -90 }), G("square", [31, 5.2, HZ], { w: 9, h: 7.5, yaw: -90 }),
  G("hoop", [82, 14, -168], { r: 5 }), G("hoop", [168, 22, -78], { r: 5 }), G("hoop", [195, 12, 10], { r: 5 }), G("square", [236, 7, DOCKS[1]], { w: 10, h: 8, yaw: 180 }),
  G("square", [236, 7, DOCKS[2]], { w: 10, h: 8, yaw: 180 }), G("hoop", [211, 9, 140], { r: 5 }),
  G("square", [0, 6, 178], { w: 10, h: 7 }), G("hoop", [-100, 8, 160], { r: 5 }),
];
// 3. 소행성대 다이브: 반응로 옆을 감아 올라 소행성대를 돌고 남쪽 아치로 내리꽂는다
const ROCKRUN = [
  G("hoop", [40, 12, 30], { r: 5 }), G("hoop", [56, 38, -30], { r: 5 }), G("hoop", [34, 70, -100], { r: 5.5 }), G("ring", [-58, 112, -150], { r: 6.5 }),
  G("hoop", [-150, 136, -70], { r: 5.5 }), G("hoop", [-168, 112, 50], { r: 5.5 }), G("hoop", [-80, 66, 130], { r: 5.5 }), G("square", [...at(90, 4.6)], { w: 9, h: 6, yaw: -90 }),
  G("hoop", [72, 8, 104], { r: 5 }),
];
const TRACKS = [
  { id: "deck", name: "갑판 순환", level: 1, laps: 3, desc: "순환 도로를 따라 네 개의 캣워크 아치 밑과 두 고리문을 차례로 지나는 입문 코스", gates: DECKRUN },
  { id: "fortress", name: "요새 일주", level: 2, laps: 2, desc: "방열판 골목을 빠져나가 격납고 세 동을 옆문으로 꿰고, 감염 구역과 도킹 암 아래를 지나 주포대 앞으로 돌아오는 코스", gates: FORT },
  { id: "rocks", name: "소행성대 다이브", level: 3, laps: 2, desc: "반응로 탑을 감아 올라 떠다니는 소행성 사이를 돌고, 남쪽 아치로 내리꽂는 고난도 코스", gates: ROCKRUN },
];

// 떠 있는 고리문 (소행성대 코스의 넷째 게이트 자리, 진행 방향으로 세운다)
const FLOATRING = (() => { const t = ROCKRUN, i = 3, a = t[i - 1].p, b = t[i + 1].p; return { p: t[i].p, yaw: yawTo(a, b) }; })();

// ── 임무 지점 ──
const DEPOTS = [[-85, 55], [90, 72], [-60, -100], [95, -12]];
const STRIKE = { turrets: [[90, -160], [120, -214], [192, -194], [204, -112], [150, -104], [100, -82]], core: [150, -162] };
const SUPPLY = { depot: [24, 96], camps: [[-120, -96], [150, -168], [172, 122], [-100, 200]], turrets: [[100, -100], [60, 164]] };
const COMBAT = { blue: [-140, 100], red: [150, -150], depots: DEPOTS };

// 도로 바깥 차선(보급 견인차·호송 트럭)
const OUTER = lane(Array.from({ length: 16 }, (_, i) => RP((i / 16) * 360)), 2.6, 96);
const near = (deg) => { const [x, z] = RP(deg); return OUTER.reduce((b, q, i) => (Math.hypot(q[0] - x, q[1] - z) < Math.hypot(OUTER[b][0] - x, OUTER[b][1] - z) ? i : b), 0); };
const CONVOY = (() => { const out = [], N = OUTER.length, i0 = near(100), i1 = near(30); const dir = ((near(110) - i0 + N) % N) < N / 2 ? 1 : -1; for (let i = i0; ; i = (i + dir + N) % N) { out.push([OUTER[i][0], 0, OUTER[i][1]]); if (i === i1 || out.length > N) break; } return out; })();
const DRONE = [[0, 10, 100], [70, 12, 100], [RINGS[1].p[0], 12, RINGS[1].p[1]], [135, 8, 0], [92, 9, -45], [62, 14, -66], [45, 30, -45], [0, 34, 0], [-45, 30, -52], [-75, 12, -64], [-125, 11, -75], [-155, 10, -75], [-185, 10, -75], [-200, 10, -64], [-200, 10, 20], [-120, 12, 70], [-60, 10, 110]];

function build(w) {
  const K = { blink: new Blinkers(w) };
  w.col.setTerrain(height);
  sky(w);
  deck(w); hull(w, K); markings(w, K);
  reactor(w, K); hangars(w, K); docks(w, K); radiators(w, K); guns(w, K); masts(w, K); bridges(w, K); conduits(w, K);
  for (const a of ARCHES) arch(w, K, a.p[0], a.p[1], 30, 22, a.yaw, { name: "도로 아치 아래" });
  for (const g of RINGS) ringGate(w, K, g.p[0], g.y, g.p[1], g.R, g.yaw, { legs: true });
  ringGate(w, K, FLOATRING.p[0], FLOATRING.p[1], FLOATRING.p[2], 9.5, FLOATRING.yaw, { stand: false, light: VIO2, accent: NAVY, name: "소행성대 고리문" });
  shuttle(w, PAD[0], PAD[1], 35);

  // ── 비워 둘 곳: 임무 지점·기지·트랙·도로 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 10]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 14], [SUPPLY.depot[0], SUPPLY.depot[1], 10], ...SUPPLY.camps.map((p) => [p[0], p[1], 12]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]),
    [COMBAT.blue[0], COMBAT.blue[1], 34], [COMBAT.red[0], COMBAT.red[1], 30], [REACTOR[0], REACTOR[1], 66], [PAD[0], PAD[1], 20], ...GUNS.map((g) => [g[0], g[1] + 10, 24]), ...MASTS.map((m) => [m[0], m[1], 12])];
  const BOXES = [
    ...HANGARS.map((x) => [x - HW / 2 - 6, x + HW / 2 + 6, HZ - HD / 2 - 4, HZ + HD / 2 + 10]),
    [RAD_X[0] - 8, RAD_X[2] + 8, RAD_Z[0] - 16, RAD_Z[RAD_Z.length - 1] + 24], [DOCK_X - 14, 250, DOCKS[0] - 12, DOCKS[2] + 12], [170, 250, -100, -40], [170, 250, 125, 155],
    [-150, 210, -50, -40], [-6, 6, -120, 45],
  ];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 10);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat([sample(DRONE, true)]);
  const roadD = (x, z) => Math.abs(Math.hypot(x, z) - ROAD_R);
  const taken = [];
  const free = (x, z, m = 0) => {
    if (roadD(x, z) < 9 + m) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [x0, x1, z0, z1] of BOXES) if (x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m) return false;
    for (const L of LINES) for (const p of L) if (p.y < 24 && Math.hypot(x - p.x, z - p.z) < 9 + m) return false;
    return true;
  };
  const air = [];
  const freeAir = (x, y, z, m) => {
    for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, y - p.y, z - p.z) < m + 6) return false;
    for (const [ax, ay, az, s] of air) if (Math.hypot(x - ax, y - ay, z - az) < m + s) return false;
    return true;
  };
  const t0 = performance.now(), ctx = { free, freeAir, taken, air };
  infestation(w, K, ctx);
  asteroids(w, K, ctx);
  props(w, K, ctx);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "orbit",
  name: "궤도 요새 아크라이트",
  desc: "지구 궤도에 떠 있는 거대한 방위 요새. 반응로 탑과 격납고 터널, 도킹 암, 방열판 숲, 주포대, 그리고 갑판을 잠식한 에일의 보랏빛 결정. 갑판 밖은 허공이다",
  size: 230,
  ceiling: 190,
  seed: 211,
  env: {
    stars: true, lamps: true, cloud: 0, noWind: true,
    sky: { top: 0x000004, horizon: 0x03040c, bottom: 0x000000 }, sunDir: [0.62, 0.4, -0.67], sunColor: 0xfff4e4, sun: 3.5, sunDisc: 10,
    hemi: 0.55, hemiSky: 0x9fb8ff, hemiGround: 0x3d5a8a, toon: { sun: 0.66, fill: 0.22 },
    fog: { color: 0x05070f, near: 700, far: 3200 }, exposure: 1.0, glow: 2.0, bloom: { strength: 0.45, radius: 0.5, threshold: 0.92 }, look: { scatter: 0.1 },
  },
  spawn: { pos: [0, 0, 100], yaw: 0 },
  thumb: { pos: [190, 70, 210], look: [0, 20, -40] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "tug", name: "견인 트럭", type: "truck", level: 1, desc: "순환 도로를 따라 네 아치 밑을 지나는 화물 견인 트럭을 따라가세요", duration: 80, color: 0xf07a1e, path: OUTER.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, 0, z, 9]) },
    { id: "drone", name: "정비 드론", type: "drone", level: 2, desc: "고리문을 지나 다리 밑과 반응로 고리 사이를 누비는 정비 드론을 화면에 담으세요", duration: 85, path: DRONE.map((p) => [...p, 11]) },
    { id: "fpv", name: "요새 레이서", type: "fpv", level: 3, desc: "격납고 터널과 도킹 암 아래를 꿰는 다른 레이싱 드론", duration: 75, path: FORT.map((g) => [g.p[0], g.p[1], g.p[2], 19]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: [0, 56, 70] },
};
