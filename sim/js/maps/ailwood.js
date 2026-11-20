// 맵: 포자 숲 — 에일 행성 '어미별' 동쪽의 거대 버섯 숲(해 질 녘). 노래가 곧 문화인 에일의 옛 숲
//  · 가운데: 쓰러진 어미나무의 속 빈 그루터기(높이 100~130 m) — 남쪽 뿌리 공동 굴 → 뿌리 아치 → 심장 옹이(노래 조각), 옹이구멍과 부러진 꼭대기
//  · 둘레: 거대 버섯 고리(안 96 m·바깥 120 m, 갓 높이 62~96 m) — 갓 사이를 잇는 빛 덩굴다리, 그루터기로 뻗은 덩굴 살
//  · 북동: 벼랑 고원과 포자 폭포(선반 버섯 두 단)   · 서: 속 빈 쓰러진 통나무 굴   · 북: 쓰러진 거대 버섯
//  · 북서: 제국 진지   · 남동: 등불꽃 들판·아군 본부   · 남: 출발 빈터   · 바깥 숲: 갓 밑 새끼 둥지 넷(보급 캠프)
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers } from "./ail-kit.js";
import { height, colorFn, MT, KNOT, trunkR, LANE, TRAIL, SPAWN, DEPOTS, STRIKE, SUPPLY, COMBAT, BOSS, LOG, DEG } from "./ailwood-terrain.js";
import { motherTree, shrooms, vines, GY0 } from "./ailwood-base.js";
import { zones } from "./ailwood-zones.js";
import { detail } from "./ailwood-detail.js";
import { skyAndFar } from "./ailwood-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const T = (x, z, up) => [x, Math.round((height(x, z) + up) * 10) / 10, z];
const WP = (deg, y, r) => [MT[0] + Math.cos(deg * DEG) * r, GY0 + y, MT[1] + Math.sin(deg * DEG) * r];

// 1. 버섯대 슬라럼: 거대 버섯 고리를 대 사이로 이리저리 꿰며 한 바퀴 (입문)
const STEMS = [];
for (let i = 0; i < 12; i++) { const [x, z] = LANE(i); STEMS.push(i % 2 ? G("hoop", T(x, z, 12), { r: 6 }) : G("square", T(x, z, 11), { w: 12, h: 9 })); }
// 2. 뿌리 공동 침투: 뿌리 갈비 굴 → 남쪽 뿌리 아치 → 심장 옹이 곁 → 북동 아치로 빠져 동쪽 숲을 돌아온다
const ROOTS = [
  G("square", T(4, 114, 6), { w: 11, h: 8 }), G("square", T(0, 90, 7), { w: 12, h: 9 }), G("hoop", T(0, 62, 7), { r: 5 }), G("square", [0, GY0 + 8, 24], { w: 11, h: 10 }),
  G("hoop", [10, GY0 + 8, -6], { r: 5 }), G("square", WP(315, 8, trunkR(8)), { w: 11, h: 10 }), G("hoop", T(65, -48, 10), { r: 5.5 }), G("hoop", T(110, -80, 12), { r: 5.5 }),
  G("square", T(150, -95, 9), { w: 11, h: 8 }), G("hoop", T(168, -30, 10), { r: 5.5 }), G("square", T(150, 40, 9), { w: 11, h: 8 }), G("hoop", T(100, 95, 8), { r: 5.5 }), G("square", T(48, 114, 7), { w: 11, h: 8 }),
];
// 3. 수관 다이브: 갓 밑을 지나 옹이구멍으로 뛰어들어 줄기 속을 치솟고, 부러진 꼭대기로 빠져 덩굴다리 밑으로 내리꽂힌 뒤 통나무 굴을 꿴다
const CANOPY = [
  G("square", [-108, 46, 108], { w: 10, h: 8 }), G("hoop", [-100, 48, 66], { r: 5.5 }), G("hoop", [-92, 54, 4], { r: 5.5 }), G("hoop", WP(200, 72, 58), { r: 5 }),
  G("ring", WP(KNOT.a, KNOT.y, trunkR(KNOT.y) - 2), { r: 4.2 }), G("hoop", [4, GY0 + 98, -8], { r: 5 }), G("square", [50, GY0 + 112, 2], { w: 10, h: 8 }), G("ring", [84, 62, -30], { r: 5 }),
  G("hoop", [100, 44, -112], { r: 5.5 }), G("hoop", [40, 30, -150], { r: 5.5 }), G("hoop", [-40, 48, -140], { r: 5.5 }), G("hoop", [-150, 40, -100], { r: 5.5 }),
  G("square", T(-196, -16, 9), { w: 10, h: 8 }), G("ring", T((LOG.a[0] + LOG.b[0]) / 2, (LOG.a[1] + LOG.b[1]) / 2, 9.6), { r: 4.5 }), G("square", T(-207, 80, 9), { w: 10, h: 8 }), G("hoop", [-160, 34, 122], { r: 5.5 }),
];
const TRACKS = [
  { id: "stems", name: "버섯대 슬라럼", level: 1, laps: 2, desc: "거대 버섯 고리의 대 사이를 안팎으로 꿰며 어미나무를 한 바퀴 도는 입문 코스. 갓 그늘 밑으로 넓게 난다", gates: STEMS },
  { id: "roots", name: "뿌리 공동 침투", level: 2, laps: 2, desc: "뿌리 갈비가 덮인 굴로 들어가 남쪽 뿌리 아치를 지나, 맥박 치는 심장 옹이 곁을 스쳐 북동 아치로 빠져나오는 코스", gates: ROOTS },
  { id: "canopy", name: "수관 다이브", level: 3, laps: 1, desc: "갓 밑을 지나 옹이구멍으로 뛰어들어 그루터기 속을 치솟고, 부러진 꼭대기에서 덩굴다리 밑으로 내리꽂힌 뒤 쓰러진 통나무 굴을 꿰는 고난도 코스", gates: CANOPY },
];

// 숲길(호송·탐사 트럭): 출발 빈터 → 서 → 북 → 북동
const CONVOY = TRAIL.slice(0, 162).filter((_, i) => i % 3 === 0).map(([x, z]) => [x, 0, z]);
const ROVER = TRAIL.filter((_, i) => i % 5 === 0).map(([x, z]) => [x, 0, z, 9]);
// 에일 가오리: 버섯 고리 바깥을 크게 너울거린다
const RAY = [];
for (let k = 0; k < 14; k++) { const a = k * (360 / 14) + 10, R = 165 + 12 * Math.sin(k * 1.7); RAY.push([MT[0] + Math.cos(a * DEG) * R, 42 + 10 * Math.sin(k * 0.9), MT[1] + Math.sin(a * DEG) * R, 13]); }
// 에일 비행정: 버섯대 사이(고리 반경 108 m)를 갓 그늘 밑으로 거꾸로 돈다
const SKIFF = [];
for (let k = 11; k >= 0; k--) { const a = 90 + 30 * k, x = MT[0] + Math.cos(a * DEG) * 108, z = MT[1] + Math.sin(a * DEG) * 108; SKIFF.push([x, height(x, z) + (k % 2 ? 22 : 30), z, 12]); }

function build(w) {
  const K = { blink: new Blinkers(w) };
  w.terrain(height, colorFn, { flat: "grass", flatTint: "0.9, 1.08, 1.12", rockTint: "0.8, 0.82, 1.05", rockLo: 0.34, rockHi: 0.6 });
  skyAndFar(w);
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 10);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), true)).concat([sample(RAY, true), sample(SKIFF, true)]);
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 10]), ...STRIKE.turrets.map((p) => [p[0], p[1], 7]), [STRIKE.core[0], STRIKE.core[1], 20], [SUPPLY.depot[0], SUPPLY.depot[1], 10],
    ...SUPPLY.camps.map((p) => [p[0], p[1], 10]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 7]), [COMBAT.blue[0], COMBAT.blue[1], 36], [COMBAT.red[0], COMBAT.red[1], 36],
    [SPAWN[0], SPAWN[1], 24], [BOSS[0] * 0.6, BOSS[2] * 0.6, 45], [MT[0], MT[1], 60]];
  const trail = TRAIL.filter((_, i) => i % 2 === 0);
  const t0 = performance.now();
  const ctx = { KEEP, LINES, trail, taken: [] };
  ctx.free = (x, z, m = 0, low = false) => {
    for (const [qx, qz] of trail) if (Math.hypot(x - qx, z - qz) < 6 + m) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    if (!low) for (const [fx, fz, fr] of ctx.taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    const gy = height(x, z);
    for (const L of LINES) for (const p of L) if (p.y - gy < (low ? 5 : 45) && Math.hypot(x - p.x, z - p.z) < (low ? 3 : 9) + m) return false;
    return true;
  };
  ctx.freeAir = (x, y, z, m) => { for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, y - p.y, z - p.z) < m + 6) return false; return true; };
  motherTree(w, K);
  shrooms(w, K);
  vines(w, K);
  zones(w, K, ctx);
  detail(w, K, ctx);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "ailwood",
  name: "포자 숲",
  desc: "어미별 동쪽, 해 질 녘의 거대 버섯 숲. 빛나는 갓 밑을 날아 쓰러진 어미나무의 뿌리 공동으로 들어가면, 노래 조각을 품은 심장 옹이가 맥박 친다",
  size: 235,
  ceiling: 190,
  seed: 811,
  env: {
    stars: true, cloud: 0.22, noWind: false, lamps: false,
    sky: { top: 0x120a36, horizon: 0x3a8a8a, bottom: 0x1a2a3a }, horizonGlow: 0x8a3a6a, cloudLit: 0xffa8d0, cloudDark: 0x4a3a88,
    sunDir: [0.62, 0.16, 0.55], sunColor: 0xffb8d8, sun: 2.4, sunDisc: 7,
    hemi: 0.7, hemiSky: 0x9a8aff, hemiGround: 0x1f6a5a, toon: { sun: 0.5, fill: 0.36 },
    fog: { color: 0x2c4a62, near: 170, far: 980 }, exposure: 1.05, glow: 2.2, bloom: { strength: 0.5, radius: 0.55, threshold: 0.86 }, look: { scatter: 0.2 },
  },
  spawn: { pos: [SPAWN[0], 0, SPAWN[1]], yaw: 0 },
  thumb: { pos: [70, 38, 150], look: [0, 48, -10] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "rover", name: "연합 탐사 트럭", type: "truck", level: 1, desc: "버섯 고리 바깥 이끼 숲길을 도는 탐사 트럭을 따라가세요", duration: 85, color: 0xe9ebf0, path: ROVER },
    { id: "ray", name: "에일 가오리", type: "ray", level: 2, desc: "거대 버섯 갓 너머를 크게 너울거리는 에일의 가오리를 화면에 담으세요", duration: 80, path: RAY },
    { id: "skiff", name: "에일 비행정", type: "skiff", level: 2, desc: "갓 그늘 밑 버섯대 사이를 낮게 누비는 에일 비행정을 놓치지 마세요", duration: 80, path: SKIFF },
    { id: "fpv", name: "수관 레이서", type: "fpv", level: 3, desc: "옹이구멍으로 뛰어들어 그루터기 꼭대기로 솟구치는 다른 레이싱 드론", duration: 75, path: CANOPY.filter((_, i) => i < 12 || i > 14).map((g) => [g.p[0], g.p[1], g.p[2], 20]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: BOSS },
};
