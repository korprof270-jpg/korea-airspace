// 맵: 비행기지 — 휴마 연합 비행단(은빛 편대)의 본거지. 늦은 오후 황금빛 햇살 아래의 공군 기지 (가상의 장소)
//  · 남: 동서로 놓인 활주로 09/27 (피아노 건반·번호·접지대·가장자리 등화·진입각 지시등), 서쪽 밖으로 뻗은 진입등과 섬광등
//  · 가운데: 평행 유도로 A 와 연결로 다섯, 넓은 계류장(수송기·전투기 줄·무인기·훈련기·급유차)
//  · 북: 아치형 격납고 넷 (1·3·4 격납고는 앞뒤 문이 열려 관통 비행 가능, 4 격납고는 은빛 편대와 노을의 집), 소방대
//  · 동: 관제탑과 작전본부(브리핑실), 주차장, 유류고와 급유 패드, 회전 감시 레이더
//  · 북쪽 생활 구역: 생활관 넷, 연병장과 사열대·깃발, 비행단 본부, 급수탑, 헬기장, 정비고 / 서북: 레이돔
//  · 담장과 정문, 그 밖은 황금 논과 한옥·아파트 마을, 소나무 능선
import * as THREE from "../../vendor/three.module.min.js";
import {
  Blinkers, PaintSigns, height, colorFn, RWY, TWY, HANGARS, HF, HD, HW, TOWER, OPS, TANKS, RADAR, RADOME, BARRACKS, PARADE, HQ, WTOWER, HELI, MOTOR, FENCE, ROAD, JETS, JET_Z, TRANS, GATE_X,
} from "./airbase-kit.js";
import { runway, approach, ils, pavement, hangars, tower, ops } from "./airbase-base.js";
import { radar, fuel, quarters, fence, windsocks, apron, flags } from "./airbase-detail.js";
import { village, trees, lamps, life } from "./airbase-life.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });

// 1. 활주로 일주: 활주로를 따라 동쪽으로, 유도로를 따라 서쪽으로 도는 입문 코스
const RUNWAY = [
  G("hoop", [-160, 6, 100], { r: 5 }), G("square", [-40, 5, 100], { w: 10, h: 6 }), G("hoop", [80, 7, 100], { r: 5 }), G("ring", [190, 8, 100], { r: 4 }),
  G("hoop", [236, 10, 66], { r: 5 }), G("square", [200, 5.5, 40], { w: 10, h: 6 }), G("hoop", [110, 8, 40], { r: 5 }), G("ring", [0, 7, 40], { r: 4 }),
  G("square", [-110, 5.5, 40], { w: 10, h: 6 }), G("hoop", [-200, 8, 30], { r: 5 }), G("hoop", [-240, 9, 70], { r: 5 }),
];
// 2. 격납고 관통: 1 격납고를 북으로 꿰고 생활관 사이를 돌아 3 격납고를 남으로 꿴 뒤, 관제탑 옆과 유류고 위를 지나 활주로로 돌아온다
const HANGAR = [
  G("square", [-200, 6.5, -60], { w: 14, h: 9, yaw: 0 }), G("square", [-200, 5.2, -114], { w: 10, h: 6.5, yaw: 0 }), G("hoop", [-172, 6, -125], { r: 4 }), G("hoop", [-170, 7, -160], { r: 4.5 }),
  G("hoop", [-100, 8, -150], { r: 4.5 }), G("square", [-90, 5.2, -114], { w: 10, h: 6.5, yaw: 180 }), G("square", [-90, 6.5, -60], { w: 14, h: 9, yaw: 180 }), G("hoop", [-30, 7, 12], { r: 5 }),
  G("hoop", [60, 9, 22], { r: 5 }), G("hoop", [130, 12, 30], { r: 5 }), G("hoop", [180, 28, -40], { r: 5 }), G("hoop", [225, 16, -20], { r: 4.5 }),
  G("hoop", [238, 9, 70], { r: 5 }), G("square", [150, 4.5, 100], { w: 10, h: 6 }), G("hoop", [20, 5, 100], { r: 5 }), G("ring", [-110, 5, 66], { r: 4 }),
  G("hoop", [-178, 7, 4], { r: 5 }),
];
// 3. 관제탑 스파이럴: 4 격납고를 꿰고 급수탑 다리 사이와 레이더 위를 지나, 관제실을 한 바퀴 감아 내리꽂은 뒤 기름 탱크 틈을 빠져나가는 고난도 코스
const TOWERRUN = [
  G("ring", [-35, 4.5, -61], { r: 3.2, yaw: 0 }), G("ring", [-35, 4.5, -113.5], { r: 3, yaw: 0 }), G("hoop", [-20, 9, -128], { r: 4.5 }), G("hoop", [-22, 8, -178], { r: 4.5 }),
  G("ring", [WTOWER[0], 8, WTOWER[1]], { r: 3, yaw: -90 }), G("hoop", [125, 11, -150], { r: 4.5 }), G("hoop", [212, 29, -128], { r: 4.5 }), G("hoop", [172, 33, -28], { r: 4.5 }),
  G("hoop", [150, 36, -52], { r: 4 }), G("hoop", [128, 33, -26], { r: 4.5 }), G("ring", [150, 6, 0], { r: 3.2 }), G("hoop", [205, 6, 26], { r: 4 }),
  G("square", [205, 3.8, -20], { w: 5, h: 4, yaw: 0 }), G("hoop", [206, 8, -50], { r: 4.5 }), G("hoop", [250, 12, -64], { r: 4.5 }), G("hoop", [240, 10, 60], { r: 5 }), G("square", [150, 4, 100], { w: 8, h: 5 }),
  G("hoop", [40, 4.5, 100], { r: 4 }), G("ring", [-35, 4, 44], { r: 3.2 }),
];
// 4. 긴급 출격: 4 격납고 안에서 출발해 유도로·활주로를 달려 이륙, 레이더와 급수탑 위를 돌아 연병장에 내려앉는 구간 주행
const SCRAMBLE = [
  G("ring", [-35, 4.5, -61], { r: 3.5, yaw: 180 }), G("hoop", [-35, 5, -5], { r: 4.5 }), G("square", [-35, 4.5, 40], { w: 8, h: 5, yaw: 180 }), G("hoop", [0, 4, 86], { r: 4.5 }),
  G("hoop", [80, 5, 100], { r: 5 }), G("hoop", [170, 9, 100], { r: 5 }), G("hoop", [234, 20, 92], { r: 5.5 }), G("hoop", [238, 34, 20], { r: 5.5 }),
  G("hoop", [212, 34, -128], { r: 5 }), G("hoop", [125, 26, -180], { r: 5 }), G("hoop", [45, 38, -185], { r: 5 }), G("hoop", [-65, 22, -175], { r: 5 }),
  G("square", [-65, 4, -150], { w: 10, h: 5, yaw: 180 }),
];
const TRACKS = [
  { id: "runway", name: "활주로 일주", level: 1, laps: 3, desc: "활주로를 따라 동쪽으로 달리고 평행 유도로를 따라 서쪽으로 돌아오는 넓고 쉬운 입문 코스", gates: RUNWAY },
  { id: "hangar", name: "격납고 관통", level: 2, laps: 2, desc: "1 격납고를 북으로 꿰고 생활관 사이를 돌아 3 격납고를 남으로 꿴 뒤, 관제탑 옆과 유류고 위를 지나 활주로로 돌아오는 기술 코스", gates: HANGAR },
  { id: "scramble", name: "긴급 출격", level: 2, loop: false, desc: "4 격납고 안에서 출발해 유도로와 활주로를 달려 이륙하고, 레이더와 급수탑 위를 돌아 연병장에 내려앉는 구간 주행", start: { pos: [-35, 0.3, -100], yaw: 180 }, gates: SCRAMBLE },
  { id: "tower", name: "관제탑 스파이럴", level: 3, laps: 2, desc: "4 격납고를 꿰고 급수탑 다리 사이와 레이더 위를 지나, 관제실을 한 바퀴 감아 내리꽂은 뒤 기름 탱크 틈을 빠져나가는 고난도 코스", gates: TOWERRUN },
];

// ── 임무 지점 ──
const DEPOTS = [[-130, 134], [130, 134], [-65, -160], [0, 20]];
const COMBAT = { blue: [-150, -28], red: [180, 134], depots: DEPOTS };
const STRIKE = { turrets: [[100, -135], [205, -95], [238, 34], [160, 30], [110, 135], [210, 140]], core: [178, -102] };
const SUPPLY = { depot: [-60, 0], camps: [[-65, -160], [232, -180], [130, 134], [-232, 134]], turrets: [[100, -100], [0, 134]] };
// 호송: 마을에서 정문으로 들어와 남쪽 순환 도로 → 서쪽 도로 → 유도로를 따라 계류장까지
const CONVOY = [[180, 0, 232], [180, 0, 205], [180, 0, 168], [178, 0, 152], [150, 0, 151.5], [60, 0, 151.5], [-40, 0, 151.5], [-140, 0, 151.5], [-236, 0, 151.5], [-246, 0, 142], [-246.5, 0, 100], [-246.5, 0, 56], [-238, 0, 42], [-200, 0, 40], [-160, 0, 38], [-150, 0, 20], [-150, 0, 4]];
// 정찰 드론: 1·3 격납고를 꿰고 관제탑 옆, 유류고 위, 활주로를 도는 3차원 경로
const DRONE = [[-200, 7, -20], [-200, 6.5, -62], [-200, 6, -88], [-200, 5, -113], [-174, 7, -126], [-170, 7, -160], [-100, 8, -150], [-90, 5, -113], [-90, 6, -62], [-60, 8, -10], [0, 9, 15], [60, 10, 22], [130, 12, 30], [180, 28, -40], [226, 15, -20], [238, 10, 60], [150, 6, 100], [0, 6, 100], [-110, 6, 66], [-180, 8, 20]];
// 담장 안 순환 도로를 도는 둥근 사각 경로 (지상 피사체)
function loop(x0, x1, z0, z1, v, c = 10) {
  const vs = v * 0.55;
  return [
    [x0 + c, 0, z1, vs], [(x0 + x1) / 2, 0, z1, v], [x1 - c, 0, z1, vs], [x1, 0, z1 - c, vs], [x1, 0, (z0 + z1) / 2, v], [x1, 0, z0 + c, vs],
    [x1 - c, 0, z0, vs], [(x0 + x1) / 2, 0, z0, v], [x0 + c, 0, z0, vs], [x0, 0, z0 + c, vs], [x0, 0, (z0 + z1) / 2, v], [x0, 0, z1 - c, vs],
  ];
}
const ringPath = (cx, cz, r, y, n, v) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, y + Math.sin(a * 3) * 5, cz + Math.sin(a) * r, v]; });

const SIGNS = [
  { id: "hold", text: "09-27", fg: "#ffffff", bg: "#c0282a", w: 160, h: 64 },
  ...[1, 2, 3, 4, 5].map((n) => ({ id: `A${n}`, text: `A${n}`, fg: "#111111", bg: "#f3c22c", w: 112, h: 64 })),
  ...[1, 2, 3, 4].map((n) => ({ id: `H${n}`, text: `${n}`, fg: "#ffffff", bg: "#23407e", w: 96, h: 96, border: "#f2f0ea" })),
  ...[1, 2, 3, 4].map((n) => ({ id: `HN${n}`, text: [`제${n} 격납고`, `HANGAR ${n}`], fg: "#23407e", bg: "#f2f0ea", w: 256, h: 58 })),
  { id: "silver", text: ["은빛 편대", "SILVER FLIGHT"], fg: "#f2f4f8", bg: "#56606e", w: 256, h: 58, border: "#ff8a3a" },
  { id: "tower", text: ["관제탑 · CONTROL", "CONTROL TOWER"], fg: "#23407e", bg: "#f2f0ea", w: 320, h: 46 },
  { id: "ops", text: ["휴마 연합 비행단 작전본부", "HUMA ALLIANCE WING OPS"], fg: "#1d3a7a", bg: "#ebe1c8", w: 512, h: 48 },
  { id: "brief", text: ["브리핑실", "BRIEFING"], fg: "#ffffff", bg: "#23407e", w: 192, h: 32 },
  { id: "fire", text: ["소방구조대 119", "FIRE · RESCUE"], fg: "#ffffff", bg: "#c0282a", w: 288, h: 34 },
  { id: "fuel", text: ["유류고 · 화기엄금", "FUEL · NO FIRE"], fg: "#c0282a", bg: "#f3c22c", w: 256, h: 37 },
  ...[1, 2, 3, 4].map((n) => ({ id: `B${n}`, text: [`생활관 ${n}`, `BARRACKS ${n}`], fg: "#ffffff", bg: "#4f7a5a", w: 208, h: 42 })),
  { id: "parade", text: ["충성 · 연병장", "PARADE GROUND"], fg: "#ffffff", bg: "#2f5a8a", w: 256, h: 32 },
  { id: "hq", text: ["비행단 본부", "WING HQ"], fg: "#7a3a2c", bg: "#e7e0cf", w: 256, h: 30 },
  { id: "motor", text: ["정비고", "MOTOR POOL"], fg: "#ffffff", bg: "#4a5631", w: 224, h: 27 },
  { id: "gate", text: ["휴마 연합 비행단", "HUMA ALLIANCE AIR WING"], fg: "#ffffff", bg: "#23407e", w: 384, h: 42 },
  { id: "apt1", text: ["101동", "101"], fg: "#b8312f", bg: "#ece6d8", w: 128, h: 51 },
  { id: "apt2", text: ["102동", "102"], fg: "#b8312f", bg: "#ece6d8", w: 128, h: 51 },
  { id: "shop1", text: ["편의점 24", "MART 24"], fg: "#ffffff", bg: "#2f9e5a", w: 240, h: 32 },
  { id: "shop2", text: ["옛날통닭", "CHICKEN"], fg: "#5a2a10", bg: "#f0a020", w: 240, h: 32 },
  { id: "shop3", text: ["기사식당", "DINER"], fg: "#ffffff", bg: "#b8312f", w: 240, h: 32 },
  { id: "shop4", text: ["PC방", "PC ROOM"], fg: "#ffffff", bg: "#2f6fb0", w: 240, h: 32 },
  { id: "bus", text: ["버스", "BUS"], fg: "#ffffff", bg: "#2f6fb0", w: 96, h: 64 },
];

function build(w) {
  const K = { blink: new Blinkers(w) };
  const S = new PaintSigns(w, SIGNS);
  w.terrain(height, colorFn, { flat: "grass", flatTint: "1.04, 1.0, 0.9", rockTint: "1.0, 0.96, 0.9", rockLo: 0.3, rockHi: 0.55 });
  runway(w, K); approach(w, K); ils(w, K); pavement(w, K, S);
  hangars(w, K, S); tower(w, K, S); ops(w, K, S);
  radar(w, K); fuel(w, K, S);
  const poles = quarters(w, K, S);
  fence(w, K, S); windsocks(w, K); apron(w, K); flags(w, poles);

  // ── 나무를 심지 않을 곳: 임무 지점·기지·코스 선 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 10]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 18], [SUPPLY.depot[0], SUPPLY.depot[1], 10],
    ...SUPPLY.camps.map((p) => [p[0], p[1], 12]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]), [COMBAT.blue[0], COMBAT.blue[1], 34], [COMBAT.red[0], COMBAT.red[1], 30], [WTOWER[0], WTOWER[1], 10], [RADOME[0], RADOME[1], 12], [HELI[0], HELI[1], 16]];
  const BOXES = [[-260, 260, 60, 121], [GATE_X - 6, GATE_X + 6, 140, 260], [-260, 260, ROAD.z0 - 4, ROAD.z0 + 4], [-260, 260, ROAD.z1 - 4, ROAD.z1 + 4], [-118, -102, -210, -118], [120, 130, -210, -118],
    ...BARRACKS.map(([x, z]) => [x - 18, x + 18, z - 7, z + 9]), [HQ[0] - 16, HQ[0] + 16, HQ[1] - 10, HQ[1] + 13], [PARADE[0] - 33, PARADE[0] + 33, PARADE[1] - 30, PARADE[1] + 21], [MOTOR[0] - 24, MOTOR[0] + 24, MOTOR[1] - 8, MOTOR[1] + 22]];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 10);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat([sample(DRONE, true)]);
  const free = (x, z, m = 0) => {
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [x0, x1, z0, z1] of BOXES) if (x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m) return false;
    for (const L of LINES) for (let i = 0; i < L.length; i += 2) { const p = L[i]; if (p.y < 24 && Math.abs(x - p.x) < 12 + m && Math.hypot(x - p.x, z - p.z) < 9 + m) return false; }
    return true;
  };
  const t0 = performance.now(), ctx = { free };
  village(w, K, S); trees(w, K, ctx); lamps(w); life(w, K);
  S.finish();
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "airbase",
  name: "비행기지",
  desc: "휴마 연합 비행단과 은빛 편대의 본거지. 활주로와 진입등, 문이 열린 아치형 격납고, 관제탑과 작전본부, 레이더와 유류고, 생활관과 연병장 너머로 황금 논과 소나무 능선이 펼쳐진다",
  size: 250,
  ceiling: 170,
  seed: 909,
  env: {
    sky: { top: 0x3a74c8, horizon: 0xffcf98, bottom: 0xb59a78 }, sunDir: [-0.66, 0.32, 0.36], sunColor: 0xffd7a0, sun: 3.4,
    hemi: 0.5, hemiSky: 0xbcd2ff, hemiGround: 0x9a8058, cloud: 0.46, cloudLit: 0xffe6c4, cloudDark: 0xa496ac, horizonGlow: 0x7a4a20,
    fog: { color: 0xf1d2a8, near: 280, far: 1750 }, glow: 1.7, exposure: 1.02,
  },
  spawn: { pos: [-35, 0.3, -30], yaw: 0 },
  thumb: { pos: [-170, 70, 236], look: [-40, 4, -40] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "fuel", name: "급유차", type: "truck", level: 1, desc: "담장 안 순환 도로를 따라 기지를 한 바퀴 도는 급유차를 따라가세요", duration: 80, color: 0xe8e3d4, path: loop(-ROAD.x + 1.8, ROAD.x - 1.8, ROAD.z0 + 1.8, ROAD.z1 - 1.8, 10) },
    { id: "runner", name: "구보 병사", type: "runner", level: 1, desc: "아침 점호 뒤 연병장을 도는 구보 병사를 화면에 담으세요", duration: 70, path: loop(PARADE[0] - 29, PARADE[0] + 29, PARADE[1] - 17, PARADE[1] + 17, 4.8, 6) },
    {
      id: "tug", name: "견인차", type: "forklift", level: 1, desc: "계류장 사이를 누비는 항공기 견인차를 따라가세요", duration: 70,
      path: [[-225, 0, 22, 5], [-120, 0, 22, 7], [-10, 0, 22, 6], [-4, 0, -4, 4], [-30, 0, -26, 5], [-120, 0, -32, 7], [-205, 0, -22, 5], [-230, 0, 0, 4]],
    },
    { id: "heli", name: "기지 헬기", type: "heli", level: 2, desc: "기지 상공을 크게 도는 수송 헬기를 쫓으세요", duration: 75, path: ringPath(0, -40, 170, 42, 18, 20) },
    { id: "drone", name: "정찰 드론", type: "drone", level: 3, desc: "1·3 격납고를 관통하고 관제탑 옆과 유류고 위를 누비는 정찰 드론을 화면에 담으세요", duration: 85, path: DRONE.map((p) => [...p, 11]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7, path: CONVOY },
  boss: { pos: [0, 50, 40] },
};
