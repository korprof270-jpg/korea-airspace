// 맵: 에일 행성 '어미별' 북쪽 — 「폭풍 무덤」. 여제의 함대가 추락한 폭풍의 땅. 먹보라 하늘에 금빛 번개가 친다
//  · 가운데: 추락한 기함 '별삼킴' — 서쪽 고원에 누운 꼬리, 협곡 위 90 m 에 걸린 등뼈(척수관 터널), 심장방, 동쪽 고원에 처박힌 머리뼈
//  · 남: 연합 전진 캠프 고원(출발·아군 본부)        · 남서: 빈 합창 가시 둥지 — 추락한 순양함 위에 자란 적 진지
//  · 남동: 노래 등대 고원(금빛 빛줄기가 도는 탑)     · 북: 번개 첨탑 숲(그을린 땅, 낙뢰)
//  · 북동: 무너진 에일 전초(적 본부)                · 고원 사이: 구름 바다로 떨어지는 틈, 바위 등성이 위 뼈 다리 일곱, 틈에 걸린 난파선들
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, lane, FS_Y0 } from "./ailsky-kit.js";
import { height, colorFn, land, BRIDGES, ROAD } from "./ailsky-terrain.js";
import { flagship, SP, CY, HEART, shipZone } from "./ailsky-base.js";
import { zones } from "./ailsky-zones.js";
import { detail } from "./ailsky-detail.js";
import { sky, storm } from "./ailsky-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const T = (x, z, up) => [x, Math.max(height(x, z), FS_Y0 - 2) + up, z];
const BR = (from, to, f = 0.5, up = 5) => {
  const B = BRIDGES.find((b) => b.from === from && b.to === to), s = B.span[0] + (B.span[1] - B.span[0]) * f, x = B.a[0] + B.ux * s, z = B.a[1] + B.uz * s;
  return [x, height(x, z) + up, z];
};
const AX = (s, v, y) => SP(s, v, y);
const HS = 240.45;   // 심장방 옆 통로(갈비 6·7 사이)의 축 위치

// 1. 고원 순환: 캠프 → 남동 다리 → 등대 → 동 고원 → 기함 갈비 속으로 들어가 심장 밑을 지나 → 서 고원 → 둥지 → 캠프
const PLATEAUS = [
  G("square", T(0, 140, 5), { w: 12, h: 8 }), G("square", BR("south", "se"), { w: 12, h: 8 }), G("hoop", T(165, 92, 8.5), { r: 6.5 }), G("square", BR("se", "east"), { w: 12, h: 8 }),
  G("square", T(118, -12, 6), { w: 12, h: 8 }), G("square", AX(296, 0, 22), { w: 14, h: 11 }), G("hoop", AX(215, 0, 30), { r: 7.5 }), G("square", AX(150, 0, 26), { w: 14, h: 11 }),
  G("square", T(-110, -8, 8), { w: 12, h: 8 }), G("square", BR("west", "sw", 0.5, 7), { w: 12, h: 8 }), G("hoop", T(-122, 160, 7), { r: 6.5 }), G("square", BR("sw", "south"), { w: 12, h: 8 }),
];
// 2. 등뼈 꿰기: 누운 꼬리 위에서 척수관으로 들어가 고리 터널을 따라 90 m 높이까지 오른 뒤 목 옆으로 빠져, 협곡으로 내리꽂고 서 고원을 돌아온다
const SPINE = [
  G("square", AX(88, 0, 27), { w: 12, h: 9 }), G("hoop", AX(160, 0, CY(160)), { r: 4.6 }), G("hoop", AX(190, 0, CY(190)), { r: 4.6 }), G("hoop", AX(220, 0, CY(220)), { r: 4.6 }),
  G("hoop", AX(250, 0, CY(250)), { r: 4.6 }), G("hoop", AX(279, 0, CY(279)), { r: 4.6 }), G("hoop", AX(304, 4, 91), { r: 5 }), G("hoop", AX(330, 40, 70), { r: 6 }), G("hoop", T(150, -28, 24), { r: 6 }),
  G("square", [40, 10, 14], { w: 12, h: 9 }), G("square", [0, -8, 6], { w: 12, h: 9 }), G("hoop", [-22, 14, 14], { r: 6 }), G("hoop", T(-90, 18, 8), { r: 6 }), G("hoop", T(-185, 15, 10), { r: 6 }), G("square", AX(20, -6, 22), { w: 12, h: 9 }),
];
// 3. 폭풍 비행: 번개 첨탑 사이 슬랄롬 → 북 다리 → 무너진 전초 → 동 다리 → 갈비 찢긴 틈으로 들어가 심장 옆을 꿰뚫고 → 북쪽 틈으로 내리꽂아 다시 첨탑으로
const STORM = [
  G("hoop", T(-62, -160, 10), { r: 5 }), G("ring", T(-40, -205, 14), { r: 4.5 }), G("hoop", T(10, -200, 12), { r: 5 }), G("square", BR("ne", "north"), { w: 10, h: 7 }),
  G("hoop", T(160, -168, 10), { r: 5 }), G("square", BR("east", "ne"), { w: 10, h: 7 }), G("hoop", [194, 18, -104], { r: 5.5 }), G("hoop", [168, 16, -30], { r: 5 }),
  G("ring", AX(HS, 62, 66), { r: 4.5 }), G("ring", AX(HS, 0, HEART[1]), { r: 3.4 }), G("hoop", AX(HS, -58, 50), { r: 5 }),
];
const TRACKS = [
  { id: "plateaus", name: "고원 순환", level: 1, laps: 2, desc: "연합 캠프에서 출발해 뼈 다리로 고원들을 잇고, 기함 별삼킴의 갈비뼈 속으로 들어가 맥박 치는 심장 밑을 지나는 입문 코스", gates: PLATEAUS },
  { id: "spine", name: "등뼈 꿰기", level: 2, laps: 2, desc: "누운 꼬리 위에서 척수관 고리 속으로 들어가 90 m 높이의 등뼈 터널을 끝까지 꿰고, 목 옆으로 빠져 협곡으로 내리꽂는 코스", gates: SPINE },
  { id: "storm", name: "폭풍 비행", level: 3, laps: 2, desc: "낙뢰가 치는 첨탑 사이를 누비고, 갈비뼈의 찢긴 틈으로 들어가 심장 옆을 꿰뚫은 뒤 구름 틈으로 내리꽂는 고난도 코스", gates: STORM },
];

// ── 임무 지점 ──
const DEPOTS = [[-128, -2], [96, -20], [-30, -165], [176, 112]];
const STRIKE = { turrets: [[-135, 125], [-140, 165], [-168, 172], [-186, 148], [-178, 112], [-150, 105]], core: [-160, 140] };
const SUPPLY = { depot: [24, 150], camps: [[-150, -95], [130, -36], [-12, -190], [176, 132]], turrets: [[-150, 112], [176, -176]] };
const COMBAT = { blue: [0, 178], red: [180, -186], depots: DEPOTS };

// 순환 길 바깥 차선(호송 트럭·탐사 트럭)
const OUTER = lane(ROAD, 2.6, 160);
const near = (p) => OUTER.reduce((b, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(OUTER[b][0] - p[0], OUTER[b][1] - p[1]) ? i : b), 0);
const CONVOY = (() => {
  const out = [], N = OUTER.length, i0 = near([0, 131]), i1 = near([52, -188]);
  const dir = ((near([88, 144]) - i0 + N) % N) < N / 2 ? 1 : -1;
  for (let i = i0; ; i = (i + dir + N) % N) { out.push([OUTER[i][0], 0, OUTER[i][1]]); if (i === i1 || out.length > N) break; }
  return out;
})();
// 에일 가오리: 기함의 갈비 둘레를 크게 돈다
const RAY = [[-120, 70, 30], [-40, 84, 50], [60, 92, 40], [150, 80, 0], [190, 70, -80], [150, 86, -150], [40, 110, -150], [-60, 100, -140], [-150, 86, -110], [-190, 74, -30]];
// 에일 비행정: 고원 사이 틈을 낮게 누빈다
const SKIFF = [[0, 26, 110], [60, 18, 70], [30, 4, 20], [-10, -4, 14], [-60, 16, 40], [-120, 24, 66], [-150, 30, 140], [-90, 26, 150], [-40, 24, 120]];
// 다른 레이서: 고원 순환을 따라 난다

function build(w) {
  const K = { blink: new Blinkers(w), flags: [], rods: [] };
  w.terrain(height, colorFn, { flat: "grass", flatTint: "0.9, 0.9, 1.3", rockTint: "0.78, 0.74, 1.05", rockLo: 0.3, rockHi: 0.56 });
  sky(w, K);

  // ── 비워 둘 곳: 임무 지점·기지·트랙·길 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 12]), ...STRIKE.turrets.map((p) => [p[0], p[1], 6]), [STRIKE.core[0], STRIKE.core[1], 18], [SUPPLY.depot[0], SUPPLY.depot[1], 10], ...SUPPLY.camps.map((p) => [p[0], p[1], 10]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 6]),
    [COMBAT.blue[0], COMBAT.blue[1], 36], [COMBAT.red[0], COMBAT.red[1], 36], [0, 130, 14]];
  const sample = (pts, loop, k = 10) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * k);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat([sample(RAY, true), sample(SKIFF, true)]);
  const DENSE = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false, 60)).concat([sample(RAY, true, 40), sample(SKIFF, true, 40)]);
  const roadPts = OUTER.map(([x, z]) => [x, z]);
  const road = (x, z, m = 0) => { for (const [qx, qz] of roadPts) if (Math.hypot(x - qx, z - qz) < 7 + m) return false; return true; };
  const onBr = (x, z, m = 0) => BRIDGES.some((B) => { const t = (x - B.a[0]) * B.ux + (z - B.a[1]) * B.uz, d = Math.abs((x - B.a[0]) * -B.uz + (z - B.a[1]) * B.ux); return t > B.span[0] - 4 && t < B.span[1] + 4 && d < 11 + m; });
  const roadD = (x, z) => { let b = 1e9; for (let i = 0; i < roadPts.length; i++) { const [ax, az] = roadPts[i], [bx, bz] = roadPts[(i + 1) % roadPts.length], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return b; };
  const taken = [];
  const free = (x, z, m = 0, low = false) => {
    if (!road(x, z, m) || onBr(x, z, m) || shipZone(x, z, m)) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    if (!low) for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    const gy = height(x, z);
    for (const L of LINES) for (const p of L) if (p.y - gy < (low ? 4 : 40) && Math.hypot(x - p.x, z - p.z) < (low ? 3 : 9) + m) return false;
    return true;
  };
  const freeAir = (x, y, z, m) => { for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, y - p.y, z - p.z) < m + 6) return false; return true; };
  const t0 = performance.now(), ctx = { free, freeAir, taken, road, roadD, onBr, LINES: DENSE, KEEP };
  flagship(w, K, ctx);
  zones(w, K, ctx);
  detail(w, K, ctx);
  storm(w, K);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "ailsky",
  name: "폭풍 무덤",
  desc: "에일 행성 어미별의 북쪽, 여제의 함대가 추락한 폭풍의 땅. 먹보라 구름 위로 솟은 고원 사이에 기함 '별삼킴'의 등뼈가 걸려 있고, 금빛 번개가 난파선과 빈 합창의 가시 둥지를 비춘다",
  size: 235,
  ceiling: 180,
  seed: 919,
  land,
  env: {
    stars: true, cloud: 0.5, noWind: false, lamps: false,
    sky: { top: 0x0c0626, horizon: 0x4a2a7a, bottom: 0x160c36 }, horizonGlow: 0x8a4a3a, cloudLit: 0xe0a070, cloudDark: 0x2a1a50,
    sunDir: [-0.5, 0.42, 0.62], sunColor: 0xffd8a8, sun: 2.4, sunDisc: 3,
    hemi: 0.7, hemiSky: 0x9080e0, hemiGround: 0x2a2050, toon: { sun: 0.56, fill: 0.32 },
    fog: { color: 0x2c2058, near: 200, far: 1200 }, exposure: 1.08, glow: 2.2, bloom: { strength: 0.5, radius: 0.6, threshold: 0.86 }, look: { scatter: 0.12 },
  },
  spawn: { pos: [0, 0, 132], yaw: 0 },
  thumb: { pos: [96, 52, 46], look: [0, 62, -72] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "rover", name: "연합 탐사 트럭", type: "truck", level: 1, desc: "뼈 다리를 건너 일곱 고원을 도는 탐사 트럭을 따라가세요. 기함의 꼬리뼈와 목뼈 밑을 지난다", duration: 90, color: 0xe9ebf0, path: OUTER.filter((_, i) => i % 4 === 0).map(([x, z]) => [x, 0, z, 9]) },
    { id: "ray", name: "에일 가오리", type: "ray", level: 2, desc: "기함 별삼킴의 갈비 둘레를 크게 도는 거대한 가오리를 화면에 담으세요", duration: 85, path: RAY.map((p) => [...p, 14]) },
    { id: "skiff", name: "에일 비행정", type: "skiff", level: 2, desc: "고원 사이 구름 틈을 낮게 누비는 에일 비행정을 놓치지 마세요", duration: 80, path: SKIFF.map((p) => [...p, 16]) },
    { id: "fpv", name: "폭풍 레이서", type: "fpv", level: 3, desc: "갈비뼈 속으로 고원을 도는 다른 레이싱 드론", duration: 75, path: PLATEAUS.map((g) => [g.p[0], g.p[1], g.p[2], 20]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: [6, 68, 6] },
};
