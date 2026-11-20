// 맵: 에일 행성 '어미별'의 남쪽 「빛 바다」 — 노래가 문화인 에일 종족의 바다. 해 질 녘에서 밤으로 넘어가는 하늘 아래 얕은 바다 전체가 빛난다
//  · 가운데: 합창당 환초 — 진주 고리 위의 소라 첨탑 여덟, 북쪽 후진의 어미 소라탑(98 m), 남쪽 조개문, 석호 한가운데의 소용돌이 '목구멍'
//  · 남: 등불 나루(출발·연합 전진 캠프)  · 남서: 진주 여울(아군 본부·진주 양식장)  · 서: 산호 탑 숲  · 북: 빈 합창 가시 둥지(적 진지)
//  · 북동: 물기둥 여울(적 본부·간헐천)  · 동: 뼈 여울 — 죽은 리바이어던의 갈비뼈가 아치로 선 굴  · 남동: 등대 암초
//  · 일곱 섬은 뿌리·뼈 둑길로 고리처럼 이어지고, 남쪽 참배 둑길과 북동 둑길이 합창당으로 들어간다. 고리 밖 얕은 물엔 가라앉은 돔 도시
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers } from "./ail-kit.js";
import { height, colorFn, land, ISL, CHOIR, APSE, CP, LV, LEVI, CW, CAUSE, ROAD, arcPts, causeDist, PEARLS, LILY, KELP, SHALLOW, GEYSERS } from "./ailsea-kit.js";
import { sea, seaGlow, throat, choirHall, ARCH } from "./ailsea-base.js";
import { leviathan, reefForest, pearlFarm, nest, geysers, landing, islet, boneShoal, causewayDecor, islandRims } from "./ailsea-zones.js";
import { jellies, rays, pontoons, flora, falls, schools } from "./ailsea-detail.js";
import { sky, GIANT } from "./ailsea-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
// 지면(물 위면 수면) 위 up m
const T = (x, z, up) => [x, Math.max(0, height(x, z)) + up, z];
const LVT = (s, off, up) => { const [x, z] = LV(s, off); return T(x, z, up); };

// 1. 산호 여울 순환: 참배 둑길 위에서 조개문을 지나 석호를 가로지르고, 첨탑 사이로 빠져 서쪽 산호 탑 숲과 진주 여울·연잎 밭을 도는 입문 코스
const REEF = [
  G("square", T(0, 100, 8), { w: 12, h: 9 }), G("square", [0, 18, ARCH.z], { w: 14, h: 12 }), G("hoop", [-26, 20, 8], { r: 6.5 }),
  G("square", [CP(195, 64)[0], 22, CP(195, 64)[1]], { w: 12, h: 10 }), G("hoop", [SHALLOW[0], 10, SHALLOW[1]], { r: 6.5 }),
  G("square", [-150, 12, -8], { w: 12, h: 9 }), G("hoop", [-126, 9, 40], { r: 6.5 }), G("hoop", [PEARLS[0] + 4, 8, PEARLS[1] + 6], { r: 6.5 }),
  G("square", [LILY[0] - 4, 9, LILY[1] - 4], { w: 12, h: 8 }), G("hoop", [-20, 10, 128], { r: 6.5 }),
];
// 2. 갈비 굴 관통: 조개문을 나와 리바이어던 두개골을 넘고 갈비뼈 굴을 통째로 꿰뚫은 뒤, 뼈 여울·물기둥 여울을 돌아 첨탑 사이로 목구멍에 뛰어든다
const RIBS = [
  G("square", [0, 18, ARCH.z], { w: 13, h: 11 }), G("hoop", T(6, 96, 8), { r: 6 }), G("square", T(22, 128, 9), { w: 11, h: 8 }),
  G("hoop", T(LEVI.skull[0] + 3, LEVI.skull[1] + 7, 13), { r: 6 }), G("square", LVT(12, 0, 13), { w: 12, h: 10 }), G("square", LVT(44, 0, 17), { w: 12, h: 10 }),
  G("square", LVT(76, 0, 13), { w: 12, h: 10 }), G("hoop", LVT(LEVI.len + 22, 14, 10), { r: 6 }), G("square", T(176, -12, 10), { w: 11, h: 8 }),
  G("hoop", [142, 11, -72], { r: 6 }), G("hoop", [GEYSERS[0] - 4, 12, GEYSERS[1] + 4], { r: 6 }), G("square", [...[CP(-15, 64)].map((q) => [q[0], 14, q[1]])[0]], { w: 11, h: 9 }),
  G("hoop", [0, -4, CHOIR.z], { r: 7 }),
];
// 3. 합창 다이브: 조개문 옆구리 밑을 낮게 지나 목구멍으로 내리꽂고, 어미 소라탑을 감아 오른 뒤 첨탑 사이·가라앉은 돔 관 밑·갈비 굴을 거꾸로 꿰는 고난도 코스
const CHOIRRUN = [
  G("hoop", T(-1, 100, 8), { r: 5 }), G("square", [-15, 9, ARCH.z], { w: 8, h: 7 }), G("hoop", [-4, 6, 26], { r: 5 }), G("ring", [0, -3, CHOIR.z], { r: 5.5 }),
  G("hoop", [0, 26, -72], { r: 5 }), G("ring", [28, 40, -102], { r: 5 }), G("ring", [0, 46, -128], { r: 5 }), G("ring", [-28, 40, -104], { r: 5 }),
  G("hoop", [CP(-132, 64)[0], 22, CP(-132, 64)[1]], { r: 5 }), G("hoop", [0, 20, CHOIR.z], { r: 5 }),
  G("hoop", [CP(-15, 64)[0], 15, CP(-15, 64)[1]], { r: 5 }), G("square", [CP(2, 106)[0], 7, CP(2, 106)[1]], { w: 8, h: 6 }),
  G("hoop", T(146, 30, 8), { r: 5 }), G("hoop", T(156, 64, 8), { r: 5 }), G("ring", LVT(66, 0, 12), { r: 5.5 }), G("ring", LVT(26, 0, 15), { r: 5.5 }),
  G("hoop", T(LEVI.skull[0] - 10, LEVI.skull[1] + 4, 14), { r: 5 }),
];
const TRACKS = [
  { id: "reef", name: "산호 여울 순환", level: 1, laps: 3, desc: "참배 둑길에서 조개문을 지나 석호를 가로지르고, 소라 첨탑 사이로 빠져 산호 탑 숲과 진주 여울·연잎 밭을 도는 입문 코스", gates: REEF },
  { id: "ribs", name: "갈비 굴 관통", level: 2, laps: 2, desc: "죽은 리바이어던의 두개골을 넘어 갈비뼈 굴을 통째로 꿰뚫고, 뼈 여울과 물기둥 여울을 돌아 소용돌이 목구멍으로 뛰어드는 코스", gates: RIBS },
  { id: "choir", name: "합창 다이브", level: 3, laps: 2, desc: "조개문 옆구리 밑을 낮게 지나 목구멍으로 내리꽂고, 어미 소라탑을 감아 오른 뒤 가라앉은 돔 관 밑과 갈비 굴을 거꾸로 꿰는 고난도 코스", gates: CHOIRRUN },
];

// ── 임무 지점 ──
const NC = [ISL.nest.x, ISL.nest.z];
const COMBAT = { blue: [ISL.pearl.x, ISL.pearl.z], red: [ISL.geyser.x, ISL.geyser.z], depots: [[22, 190], [ISL.coral.x, ISL.coral.z], [ISL.bone.x, ISL.bone.z], [ISL.islet.x, ISL.islet.z]] };
const STRIKE = { turrets: [0, 60, 120, 180, 240, 300].map((a) => [Math.round(NC[0] + Math.cos(a * Math.PI / 180) * 25), Math.round(NC[1] + Math.sin(a * Math.PI / 180) * 25)]), core: NC };
const SUPPLY = { depot: [-20, 186], camps: [[-166, -80], [176, 42], [128, 150], [-140, 94]], turrets: [[-40, -160], [104, -140]] };

// 호송: 진주 여울 → 서남 둑길 → 등불 나루 → 참배 둑길 → 합창당 고리 동쪽 반을 돌아 북동 문 앞까지
const CONVOY = (() => {
  const LP = CW("landing", "pearl"), LC = CW("landing", "choir"), out = [];
  const P = ISL.pearl, pr = P.R * P.rho;
  out.push([P.x + Math.cos(-62 * Math.PI / 180) * pr, P.z + Math.sin(-62 * Math.PI / 180) * pr]);
  out.push(...arcPts(P, -62, LP.bDeg, 16));
  for (let k = LP.pts.length - 1; k >= 0; k--) out.push(LP.pts[k]);
  out.push(...arcPts(ISL.landing, LP.aDeg, LC.aDeg, 16));
  for (const p of LC.pts) out.push(p);
  for (let a = 80; a >= -66; a -= 12) out.push(CP(a, 75));
  return out.map(([x, z]) => [x, 0, z]);
})();
const BOAT = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [CHOIR.x + Math.cos(a) * 34, 0, CHOIR.z + Math.sin(a) * 34, 5]; });
const SKIFF = Array.from({ length: 14 }, (_, i) => { const a = -(i / 14) * Math.PI * 2; return [CHOIR.x + Math.cos(a) * 124, 62 + Math.sin(a * 3) * 7, CHOIR.z + Math.sin(a) * 124, 15]; });
const RAY = [[-60, 38, 150], [-128, 44, 158], [-200, 50, 64], [-212, 54, -40], [-150, 46, -128], [-84, 40, -124], [-110, 32, -20], [-96, 30, 60]];

function build(w) {
  w.col.setTerrain(height);
  const K = { blink: new Blinkers(w) };
  sea(w);
  sky(w);

  // ── 비워 둘 곳: 임무 지점·기지·트랙·길 ──
  const KEEP = [...COMBAT.depots.map((p) => [p[0], p[1], 12]), ...STRIKE.turrets.map((p) => [p[0], p[1], 6]), [STRIKE.core[0], STRIKE.core[1], 18], [SUPPLY.depot[0], SUPPLY.depot[1], 10], ...SUPPLY.camps.map((p) => [p[0], p[1], 9]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 6]),
    [COMBAT.blue[0], COMBAT.blue[1], 36], [COMBAT.red[0], COMBAT.red[1], 36], [0, 172, 16]];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 12);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), true)).concat([sample(SKIFF, true), sample(RAY, true)]);
  const LOW = [sample(BOAT, true)];
  const roadPts = [...ROAD, ...CONVOY.map((p) => [p[0], p[2]]), ...Array.from({ length: 48 }, (_, i) => CP(i * 7.5, 75))];
  const road = (x, z, m = 0) => { for (const [qx, qz] of roadPts) if (Math.hypot(x - qx, z - qz) < 8.5 + m) return false; return causeDist(x, z) > 8.5 + m; };
  const taken = [];
  // low: 낮은 것(물풀·소품)은 트랙 선 검사를 느슨하게
  const free = (x, z, m = 0, low = false) => {
    if (!road(x, z, m)) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    if (!low) for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    const gy = Math.max(0, height(x, z));
    for (const L of LINES) for (const p of L) if (p.y - gy < (low ? 4 : 40) && Math.hypot(x - p.x, z - p.z) < (low ? 3 : 9) + m) return false;
    for (const L of LOW) for (const p of L) if (Math.hypot(x - p.x, z - p.z) < 6 + m) return false;
    return true;
  };
  // 길이 아닌 곳만 막는 검사(트랙 선 위로 솟는 큰 것은 각자 따로 피한다)
  const air = [];
  const freeAir = (x, y, z, m) => {
    for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, y - p.y, z - p.z) < m + 6) return false;
    for (const [ax, ay, az, s] of air) if (Math.hypot(x - ax, y - ay, z - az) < m + s) return false;
    return true;
  };
  const t0 = performance.now(), ctx = { free, freeAir, taken, air, road, LINES, KEEP };
  const rip = [[CHOIR.x, CHOIR.z, 6, 0], [ISL.landing.x, ISL.landing.z, 9, 1], [ISL.pearl.x, ISL.pearl.z, 11, 2], [ISL.coral.x, ISL.coral.z, 10, 3], [ISL.nest.x, ISL.nest.z, 13, 4], [ISL.geyser.x, ISL.geyser.z, 8, 5],
    [ISL.bone.x, ISL.bone.z, 12, 0.5], [ISL.islet.x, ISL.islet.z, 7, 1.5], [APSE.x, APSE.z, 9, 2.5], [GEYSERS[0], GEYSERS[1], 5, 3.5], [KELP[0], KELP[1], 10, 4.5], [LEVI.skull[0], LEVI.skull[1], 8, 5.5]];
  seaGlow(w, rip, GIANT.dir);
  const Z = (n, f) => f();   // 구역 단위로 짓는다
  Z("throat", () => throat(w, K));
  Z("choir", () => choirHall(w, K, ctx));
  Z("levi", () => leviathan(w, K, ctx));
  Z("landing", () => landing(w, K, ctx)); Z("pearl", () => pearlFarm(w, K, ctx)); Z("reef", () => reefForest(w, K, ctx)); Z("nest", () => nest(w, K, ctx)); Z("geyser", () => geysers(w, K, ctx)); Z("bone", () => boneShoal(w, K, ctx)); Z("islet", () => islet(w, K, ctx));
  Z("cause", () => causewayDecor(w, K, ctx));
  Z("rim", () => islandRims(w, K, ctx));
  Z("falls", () => { falls(w, K, ctx); pontoons(w, K, ctx, BOAT); });
  Z("flora", () => flora(w, K, ctx));
  jellies(w, ctx); rays(w); schools(w);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "ailsea",
  name: "빛 바다",
  desc: "에일 행성 어미별의 남쪽 바다. 온 바다가 빛나는 얕은 물에 산호 섬과 가라앉은 합창 도시가 잠겨 있고, 한가운데 합창당 환초의 소용돌이 '목구멍'이 바닷물을 삼킨다",
  size: 232,
  ceiling: 190,
  seed: 471,
  land,
  env: {
    stars: true, cloud: 0.22, noWind: false, lamps: false,
    sky: { top: 0x0a0a32, horizon: 0x6a3a8a, bottom: 0x0c1c40 }, horizonGlow: 0xff6a8a, cloudLit: 0xff9ac8, cloudDark: 0x2a2a6a,
    sunDir: [0.62, 0.12, 0.5], sunColor: 0xffb0c8, sun: 2.2, sunDisc: 7,
    hemi: 0.7, hemiSky: 0x8a90ff, hemiGround: 0x1a6a80, toon: { sun: 0.5, fill: 0.36 },
    fog: { color: 0x2a2a68, near: 240, far: 1400 }, exposure: 1.06, glow: 2.3, bloom: { strength: 0.5, radius: 0.6, threshold: 0.86 }, look: { scatter: 0.14 },
  },
  spawn: { pos: [0, 4, 166], yaw: 0 },
  thumb: { pos: [70, 46, 150], look: [-6, 30, -30] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "pontoon", name: "합창 부교선", type: "boat", level: 1, desc: "목구멍 둘레 석호를 천천히 도는 에일 부교선을 따라가세요", duration: 80, path: BOAT },
    { id: "skiff", name: "에일 비행정", type: "skiff", level: 2, desc: "합창당 환초 바깥을 크게 도는 에일 비행정을 화면에 담으세요", duration: 80, path: SKIFF },
    { id: "ray", name: "바다 가오리", type: "ray", level: 2, desc: "진주 여울과 산호 탑 숲 위를 너울거리며 나는 거대 가오리를 놓치지 마세요", duration: 80, path: RAY.map((p) => [...p, 13]) },
    { id: "fpv", name: "합창 레이서", type: "fpv", level: 3, desc: "목구멍에 뛰어들고 갈비 굴을 꿰는 다른 레이싱 드론", duration: 75, path: CHOIRRUN.map((g) => [g.p[0], g.p[1], g.p[2], 20]) },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: [0, 66, 182] },
};
