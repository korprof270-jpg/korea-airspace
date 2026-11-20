// 맵: 제국 궤도 발사기지 — 남쪽 바다에 면한 기계제국의 궤도 발사기지이자 함대 항만. 제국 맵 가운데 유일한 낮: 밝게 흐린 하늘이 바다 위에서 금빛 늦은 오후로 기운다
//  · 가운데: 궤도 엘리베이터(십자 터널이 뚫린 닻 기단과 성곽, 구름 속으로 사라지는 격자 축과 테더, 오르내리는 승강차)
//  · 북서: 세 발사대(1번 중량 로켓 · 2번 중앙 수송 궤도선 · 3번 빈 발사대)와 화염 도랑, 정비탑의 움직이는 팔   · 서: 격납고 둘과 계류장, 모래 해변
//  · 북: 레이더 밭   · 북동: 구형 연료 탱크 단지와 배관 다리   · 동: 함대 사령부 모노리스, 둑길 다리로 이어진 해상 플랫폼 둘
//  · 남: 함대 항만 — 부두 둘과 문형 크레인, 정박한 전함 셋   · 남동: 해안포 방파제와 보루, 끝단의 관제 첨탑
//  · 원경: 수평선의 함대 실루엣, 먼 곶, 솟구친 적운, 하늘로 사라지는 테더
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, Vapour, height, coast, madeD, DEG, ELEV, RING_R, PADS, PAD_R, TOWER_OFF, TRENCH, HANGARS, HG, PIERS, SHIPS, MOLE, MOLE_R, BASTION, TIP, PLATS, CAUSE, TANKS, TANK_R, RADARS, HQ, WY, SHAFT } from "./spaceport-kit.js";
import { ground, quays, roads, elevator } from "./spaceport-base.js";
import { pads, hangars, tankFarm, radars, command } from "./spaceport-zones.js";
import { fleet, piers, mole, offshore } from "./spaceport-harbour.js";
import { movers, assembly, apron, perimeter, yard, sensorNet, shore, life, vents, control, crawler, pipeline, smallCraft, VAB, LCC } from "./spaceport-detail.js";
import { sky } from "./spaceport-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const [EX, EZ] = ELEV;
// 발사대의 "정비탑과 발사체 사이" 자리
const slot = (i, y) => { const p = PADS[i]; return [p.x + Math.cos(p.ta * DEG) * 10.5, y, p.z + Math.sin(p.ta * DEG) * 10.5]; };

// 1. 궤도 발사: 세 발사대의 정비 팔 밑(탑과 발사체 사이)을 차례로 꿰고 레이더 밭 앞을 돌아오는 빠른 고리
const LAUNCH = [
  G("square", [-150, 9, -34], { w: 12, h: 8 }), G("hoop", [-186, 10, -36], { r: 5 }), G("square", slot(0, 17), { w: 10, h: 8 }), G("hoop", [-194, 16, -114], { r: 5 }),
  G("square", slot(1, 17), { w: 10, h: 8 }), G("hoop", [-104, 14, -188], { r: 5 }), G("square", slot(2, 17), { w: 10, h: 8 }), G("hoop", [-2, 14, -178], { r: 5 }),
  G("hoop", [16, 16, -142], { r: 5 }), G("hoop", [-8, 14, -104], { r: 5 }), G("hoop", [-52, 12, -76], { r: 5 }), G("hoop", [-100, 10, -52], { r: 5 }),
];
// 2. 보안망 돌파: 해변에서 항만으로 — 크레인 다리 사이, 전함 갑판 위, 전함 사이 수로, 함미 갑판, 방파제를 넘어 둑길 다리 밑으로, 그리고 엘리베이터 터널과 격납고
const SECURITY = [
  G("square", [-165, 6, 102], { w: 10, h: 7 }), G("square", [PIERS[0].x, 9, 138], { w: 10, h: 9 }), G("hoop", [SHIPS[0].x, 14, 140], { r: 4.5 }), G("hoop", [-55, 5, 160], { r: 4.5 }),
  G("square", [-55, 4, 188], { w: 10, h: 7 }), G("hoop", [-40, 6, 209], { r: 4.5 }), G("square", [SHIPS[2].x, 15, 176], { w: 12, h: 8 }), G("hoop", [62, 10, 144], { r: 5 }),
  G("hoop", [103, 9, 92], { r: 5 }), G("square", [129, 2.4, CAUSE.z], { w: 12, h: 6 }), G("hoop", [124, 7, -8], { r: 4.5 }), G("hoop", [84, 7, -42], { r: 4.5 }),
  G("square", [EX + 30, 6, EZ], { w: 10, h: 7 }), G("square", [EX - 32, 6, EZ], { w: 10, h: 7 }), G("hoop", [-60, 8, -60], { r: 4.5 }),
  G("square", [HANGARS[0][0], 6, HANGARS[0][1] - HG.d / 2 + 2], { w: 12, h: 8 }), G("square", [HANGARS[0][0], 6, HANGARS[0][1] + HG.d / 2], { w: 12, h: 8 }), G("hoop", [-135, 8, 50], { r: 5 }),
];
// 3. 엘리베이터 축: 동쪽 터널로 들어가 축 속을 수직으로 치솟고, 북쪽 큰 창으로 빠져나와 감아 돈 뒤 축을 동서로 꿰뚫고, 기단을 크게 돌아 내려온다
const SHAFT_T = [
  G("square", [EX + 40, 6, EZ], { w: 10, h: 7 }), G("hoop", [EX + 7, 8, EZ], { r: 4.5 }), G("hoop", [EX, 36, EZ], { r: 4.5, pitch: 90, yaw: 90 }), G("hoop", [EX, 90, EZ], { r: 4.5, pitch: 90, yaw: 90 }),
  G("hoop", [EX, 152, EZ - 27], { r: 5 }), G("hoop", [EX + 32, 142, EZ - 53], { r: 5 }), G("hoop", [EX + 54, 128, EZ - 25], { r: 5 }), G("hoop", [EX + 36, 116, EZ - 2], { r: 4.5 }),
  G("ring", [EX, 111, EZ], { r: 3.6 }), G("hoop", [EX - 42, 104, EZ + 3], { r: 5 }), G("hoop", [EX - 68, 88, EZ + 25], { r: 5 }), G("hoop", [EX - 50, 66, EZ + 59], { r: 5 }),
  G("hoop", [EX, 46, EZ + 69], { r: 5 }), G("hoop", [EX + 46, 30, EZ + 53], { r: 5 }), G("hoop", [EX + 84, 14, EZ + 19], { r: 5 }), G("hoop", [EX + 78, 8, EZ - 15], { r: 4.5 }),
];
const TRACKS = [
  { id: "launch", name: "궤도 발사", level: 1, laps: 3, desc: "세 발사대의 정비 팔 밑을 차례로 꿰고 레이더 밭 앞을 돌아오는 빠른 입문 코스", gates: LAUNCH },
  { id: "security", name: "보안망 돌파", level: 2, laps: 2, desc: "해변에서 항만으로 뛰어들어 크레인과 전함 사이를 누비고, 둑길 다리 밑을 지나 엘리베이터 터널과 격납고를 꿰는 코스", gates: SECURITY },
  { id: "shaft", name: "엘리베이터 축", level: 3, laps: 2, desc: "닻 기단 터널에서 격자 축 속을 수직으로 치솟아 큰 창으로 빠져나오고, 다시 축을 동서로 꿰뚫은 뒤 기단을 감아 내려오는 고난도 코스", gates: SHAFT_T },
];

// ── 임무 지점 ──
const DEPOTS = [[-30, 44], [48, -140], [-110, -95], [92, 8]];
const STRIKE = { turrets: [[112, 97], [138, 113], [196, 124], [160, 160], [160, 180], [160, 200]], core: [BASTION[0], BASTION[1]] };
const SUPPLY = { depot: [-62, 50], camps: [[-160, -10], [-94, -106], [158, -88], [PLATS[0][0], PLATS[0][1]]], turrets: [[0, -118], [112, 12]] };
const COMBAT = { blue: [-188, 40], red: [178, -186], depots: DEPOTS };
const SPAWN = [20, 0.3, 58];
const BOSS = [70, 64, 115];
// 보급 도로: 2번 부두 끝 → 안벽 → 계류장 북쪽 길 → 서쪽 길 → 중앙(2번) 발사대
const ROAD = [[-10, 185], [-10, 150], [-10, 112], [-10, 80], [-10, 48], [-22, 24], [-50, 16], [-90, 16], [-128, 16], [-146, 2], [-150, -30], [-150, -70], [-146, -100], [-130, -118], [-106, -130]];
// 경비정: 서쪽 정박지에서 함미를 돌아 동쪽 정박지를 한 바퀴 돌고 온다
const BOAT = [[-135, 104], [-128, 150], [-118, 196], [-70, 210], [-10, 209], [45, 208], [100, 196], [118, 160], [100, 122], [62, 102], [44, 122], [46, 168], [30, 214], [-30, 220], [-90, 220], [-140, 205], [-150, 150], [-148, 112]];
// 제국 수송정: 엘리베이터 축 둘레를 크게 돈다
const SHUTTLE = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [EX + Math.cos(a) * 78, 118 + Math.sin(a * 2) * 14, EZ + Math.sin(a) * 78]; });

function build(w) {
  const K = { blink: new Blinkers(w), vap: new Vapour(w), spin: [], loads: [] };
  sky(w);
  ground(w);
  quays(w); roads(w, ROAD);

  // ── 비워 둘 곳 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 12]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 19], [SUPPLY.depot[0], SUPPLY.depot[1], 12], ...SUPPLY.camps.map((p) => [p[0], p[1], 13]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]),
    [COMBAT.blue[0], COMBAT.blue[1], 36], [COMBAT.red[0], COMBAT.red[1], 36], [SPAWN[0], SPAWN[2], 14], [BOSS[0] * 0.6, BOSS[2] * 0.6, 20], [EX, EZ, RING_R + 14],
    ...PADS.map((p) => [p.x, p.z, PAD_R + 6]), ...PADS.map((p) => [p.x + Math.cos(p.ta * DEG) * TOWER_OFF, p.z + Math.sin(p.ta * DEG) * TOWER_OFF, 12]),
    ...TANKS.map(([x, z]) => [x, z, TANK_R + 5]), ...RADARS.map(([x, z]) => [x, z, 16]), [58, -196, 13], [16, -210, 16], [LCC[0], LCC[1], 22], ...HQ.map(([x, z, s]) => [x, z, s]), [112, -44, 10]];
  const BOXES = [
    ...HANGARS.map(([x, z]) => [x - HG.w / 2 - 3, x + HG.w / 2 + 3, z - HG.d / 2 - 12, z + HG.d / 2 + 12]),
    [60, 164, -122, -106], [-128, -20, 62, 76], [76, 102, 24, 36], [VAB.x - VAB.w / 2 - 14, VAB.x + VAB.w / 2 + 14, VAB.z - VAB.d / 2 - 16, VAB.z + VAB.d / 2 + 16],
  ];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 12);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), true)).concat([sample(SHUTTLE, true)]);
  const RD = sample(ROAD.map(([x, z]) => [x, 0, z]), false);
  for (const t of TRACKS) { const g = t.gates, a = g[g.length - 1].p, b = g[1].p, L = Math.hypot(b[0] - a[0], b[2] - a[2]); KEEP.push([g[0].p[0] - (b[0] - a[0]) / L * 16, g[0].p[2] - (b[2] - a[2]) / L * 16, 10]); }
  const taken = [];
  const trenchNear = (x, z, m) => PADS.some((p) => { const c = Math.cos(p.ta * DEG), s = Math.sin(p.ta * DEG), dx = x - p.x, dz = z - p.z; return Math.abs(dx * c + dz * s) < TRENCH.hw + 3 + m && Math.abs(-dx * s + dz * c) < TRENCH.hl + 3 + m; });
  const segD = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const crawlD = (x, z) => Math.min(segD(x, z, PADS[0], PADS[1]), segD(x, z, PADS[1], PADS[2]));
  // 뭍 위의 빈 자리인가 (m: 여유)
  const free = (x, z, m = 0) => {
    if (Math.abs(x) > 226 - m || Math.abs(z) > 226 - m) return false;
    if (coast(x, z) < 8 + m) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const B of BOXES) if (x > B[0] - m && x < B[1] + m && z > B[2] - m && z < B[3] + m) return false;
    if (trenchNear(x, z, m) || crawlD(x, z) < 13 + m) return false;
    for (const p of RD) if (Math.hypot(x - p.x, z - p.z) < 7.5 + m) return false;
    for (const L of LINES) for (const p of L) if (p.y < 26 && Math.hypot(x - p.x, z - p.z) < 9 + m) return false;
    return true;
  };
  // 높이 상한: 근처를 지나는 레이스 선·수송정 경로보다 14 m 아래
  const cap = (x, z, r) => { let h = Infinity; for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, z - p.z) < r + 4) h = Math.min(h, p.y - 14); return h; };

  elevator(w, K);
  pads(w, K); hangars(w, K); tankFarm(w, K); radars(w, K); command(w, K);
  fleet(w, K); piers(w, K); mole(w, K, STRIKE); offshore(w, K);

  const nearRoad = (x, z, m) => RD.some((p) => Math.hypot(x - p.x, z - p.z) < m);
  const t0 = performance.now(), ctx = { free, cap, taken, nearRoad, LINES, ROAD, BOAT, SPAWN, BOSS };
  assembly(w, K); perimeter(w, K); apron(w, K, ctx); vents(w, K, ctx); control(w, K); crawler(w, K); pipeline(w, K, ctx); smallCraft(w, K);
  yard(w, K, ctx);
  sensorNet(w, K); shore(w, K); life(w, K);
  movers(w, K, ctx);
  K.vap.finish();
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "spaceport",
  name: "제국 궤도 발사기지",
  desc: "남쪽 바다에 면한 기계제국의 궤도 발사기지이자 함대 항만. 구름 속으로 사라지는 궤도 엘리베이터, 증기를 뿜는 세 발사대, 전함이 정박한 부두와 해안포 방파제. 늦은 오후의 금빛 바다 위로 함대가 떠 있다",
  size: 230,
  ceiling: 220,
  seed: 733,
  env: {
    sky: { top: 0x4a82c4, horizon: 0xffe3b4, bottom: 0x8fa7ad }, sunDir: [-0.5, 0.4, 0.77], sunColor: 0xffdcae, sun: 3.3, sunDisc: 6,
    hemi: 0.55, hemiSky: 0xd4e2f2, hemiGround: 0x8f866c, cloud: 0.6, cloudLit: 0xfff3dc, cloudDark: 0xa7a3b0, horizonGlow: 0x7a5524,
    fog: { color: 0xead9bd, near: 300, far: 2300 }, exposure: 1.0, glow: 1.9,
  },
  spawn: { pos: SPAWN, yaw: 0 },
  thumb: { pos: [150, 52, 236], look: [10, 70, -40] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "truck", name: "보급 트럭", type: "truck", level: 1, desc: "부두 끝에서 크레인 밑을 지나 계류장을 가로질러 중앙 발사대까지 달리는 제국 보급 트럭을 따라가세요", duration: 60, closed: false, color: 0x8a1018, path: ROAD.map(([x, z]) => [x, 0, z, 8.5]) },
    { id: "boat", name: "경비정", type: "boat", level: 1, desc: "전함의 함미를 돌아 항만 수면을 순찰하는 제국 경비정을 따라가세요", duration: 90, color: 0x30343c, path: BOAT.map(([x, z]) => [x, WY, z, 9]) },
    { id: "shuttle", name: "제국 수송정", type: "shuttle", level: 2, desc: "궤도 엘리베이터 축 둘레를 크게 도는 제국 수송정을 화면에 담으세요", duration: 80, path: SHUTTLE.map((p) => [...p, 13]) },
    { id: "fpv", name: "보안망 침투기", type: "fpv", level: 3, desc: "항만의 크레인과 전함 사이를 누비고 엘리베이터 터널을 꿰는 다른 레이싱 드론", duration: 80, path: SECURITY.map((g) => [g.p[0], g.p[1], g.p[2], 19]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: ROAD.map(([x, z]) => [x, 0, z]) },
  boss: { pos: BOSS },
};
