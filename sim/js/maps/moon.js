// 맵: 달 기지 — 별이 가득한 검은 하늘과 커다란 지구 아래, 잿빛 평원에 세운 기지
//  · 가운데: 거주 구역(돔·기둥 위 모듈·연결 통로)과 착륙장   · 남동: 로켓 발사대와 갠트리   · 북동: 태양광 단지·집열탑
//  · 남서: 온실 돔과 깊은 채굴 크레이터   · 북서: 산마루로 오르는 매스 드라이버   · 북: 전파 관측 고원   · 남~동: 굽이치는 릴과 용암 동굴
import * as THREE from "../../vendor/three.module.min.js";
import { flora } from "./canyon-kit.js";
import { height, colorFn, fbm, reserved, POCKS, ROAD, HUB, PADS, DISH, MINE, driverPoint, rillePoint } from "./moon-terrain.js";
import { Blinkers, earth, lane } from "./moon-kit.js";
import { regolith, Paint, groundPaint, pebbles, horizon } from "./moon-ground.js";
import { detail } from "./moon-detail.js";
import { habitat, pads, launch, solar, greenhouse, driver, observatory, mine, rille, outposts } from "./moon-base.js";

export { height };

const EARTH_DIR = [-0.28, 0.4, -0.87];

function build(w) {
  const r = w.rand, K = { blink: new Blinkers(w) };
  w.terrain(height, colorFn, { flat: "dirt", seg: 260, flatTint: "1.04, 1.1, 1.27", rockTint: "0.98, 0.98, 1.03", rockLo: 0.45, rockHi: 0.72 });
  regolith(w);
  earth(w, EARTH_DIR);
  habitat(w, K); pads(w, K); launch(w, K); solar(w, K); greenhouse(w, K); driver(w, K); observatory(w, K); mine(w, K); rille(w, K); outposts(w, K);

  // ── 바위밭: 구조물·도로·트랙·임무 지점 주변은 비운다 ──
  const KEEP = [...DEPOTS, ...STRIKE.turrets, STRIKE.core, SUPPLY.depot, ...SUPPLY.camps, ...SUPPLY.turrets].map((p) => [p[0], p[1], 8]);
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], 0, q[2])), loop, "centripetal").getPoints(pts.length * 8).map((v) => [v.x, v.z]);
  const LINES = [...TRACKS.map((t) => [sample(t.gates.map((g) => g.p), t.loop !== false), 8]), [sample(BUGGY, true), 6], [sample(LOADER, true), 5]];
  for (const t of TRACKS) if (t.start) KEEP.push([t.start.pos[0], t.start.pos[2], 8]);
  const clear = (x, z, m = 0, keep = KEEP, lines = LINES) => {
    for (const [fx, fz, fr] of keep) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [L, wd] of lines) for (let i = 0; i < L.length - 1; i++) {
      const a = L[i], b = L[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz + 1e-9)));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < wd + m) return false;
    }
    return true;
  };
  const F = flora(w), GREYS = [0xa8a6a2, 0x8d8c8a, 0xc2bfb8], rocks = [];
  let n = 0;
  for (let i = 0; i < 9000 && n < 520; i++) {
    const x = (r() * 2 - 1) * 345, z = (r() * 2 - 1) * 345, dens = fbm(x * 0.02 + 50, z * 0.02 + 20, 2), s = 0.6 + r() * r() * 3.2;
    if ((dens < 0.52 && r() > 0.12) || reserved(x, z, 3) || !clear(x, z)) continue;
    F.rock(x, z, s, GREYS[i % 3]); rocks.push([x, z, s]); n++;
  }
  // 크레이터 테두리에 튕겨 나온 바위
  for (const [px, pz, R] of POCKS) {
    if (R < 13 || Math.abs(px) > 340 || Math.abs(pz) > 340) continue;
    for (let k = 0; k < 4; k++) { const a = r() * 6.28, d = R * (1.05 + r() * 0.5), x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d; if (!reserved(x, z, 3) && clear(x, z)) { const s = 0.8 + r() * 1.8; F.rock(x, z, s, GREYS[k % 3]); rocks.push([x, z, s]); } }
  }

  // ── 디테일: 바닥 그림, 구역별 소품, 자갈, 원경 (트랙·피사체·기지·임무 지점에서 떨어진 곳에만 충돌을 둔다) ──
  const KEEP2 = [...KEEP, [COMBAT.blue[0], COMBAT.blue[1], 34], [COMBAT.red[0], COMBAT.red[1], 34]], LINES2 = [...LINES, [sample(DRONE, true), 7]];
  const t0 = performance.now();
  const P = new Paint(w), ctx = { rocks, buggy: BUGGY, free: (x, z, m = 0) => clear(x, z, m, KEEP2, LINES2) };
  groundPaint(w, P, ctx);
  detail(w, K, P, ctx);
  P.finish();
  pebbles(w, rocks);
  horizon(w);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

// ── 경로·트랙 데이터 (지형 함수로 높이를 계산한다) ──
const T = (x, z, up) => [x, height(x, z) + up, z];
const G = (t, p, o = {}) => ({ t, p, ...o });
const RL = (t, up = 5) => { const [x, z] = rillePoint(t); return [x, height(x, z) + up, z]; };
const DR = (t, up = 4) => driverPoint(t, up);
const yawTo = (a, b) => Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])) * 180 / Math.PI;

const DEPOTS = [[-90, -24], [92, -20], [-6, -122], [34, 132]];
const STRIKE = { turrets: [[18, -272], [66, -226], [-96, -204], [150, -176], [-20, -150], [104, -150]], core: [DISH[0], DISH[1] + 2] };
const SUPPLY = { depot: [-14, 46], camps: [[MINE.x + 16, MINE.z + 20], [DISH[0], DISH[1] + 2], [92, 112], [-150, -56]], turrets: [[-112, 128], [110, -170]] };

// 순환 도로의 바깥 차선(보급 로버·호송 트럭)
const OUTER = lane(ROAD, 2.9, 84);
const near = (p) => OUTER.reduce((b, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(OUTER[b][0] - p[0], OUTER[b][1] - p[1]) ? i : b), 0);
const CONVOY = (() => { const out = [], N = OUTER.length, i1 = near(ROAD[9]); for (let i = near(ROAD[6]); ; i = (i - 3 + N) % N) { out.push([OUTER[i][0], 0, OUTER[i][1]]); if (((i - i1 + N) % N) < 3) break; } return out; })();
const BUGGY = [[-84, -100], [-128, -106], [-170, -70], [-198, -28], [-190, 22], [-158, 40], [-134, 8], [-104, -38]].map(([x, z], i) => [x, 0, z, i % 2 ? 13 : 11]);
const LOADER = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [PADS[0][0] + Math.cos(a) * 18, 0, PADS[0][1] + Math.sin(a) * 18, 4.2]; });

const DRONE = [[30, 10, 60], [21, 4.5, 14], [21, 4, -10], [14, 7, -58], [-30, 10, -100], DR(0.12), DR(0.3), DR(0.5), [-150, 60, -170], [-78, 30, -66], [-60, 14, 20], [-80, 10, 70], [-30, 12, 110], [20, 14, 110]];
const COMBAT = { blue: [-178, -10], red: [180, -8], depots: DEPOTS };

const [HX, HZ] = HUB;
const BASE = [
  G("square", [HX + 21, 4, HZ + 46], { w: 7, h: 5 }), G("square", [HX + 21, 3.8, HZ], { w: 8, h: 5, yaw: 0 }), G("hoop", [HX + 18, 5, HZ - 46], { r: 4 }), G("hoop", [HX - 18, 5, HZ - 46], { r: 4 }),
  G("square", [HX - 21, 3.8, HZ], { w: 8, h: 5, yaw: 180 }), G("flag", [HX - 24, 0, HZ + 46], { w: 8 }), G("ring", [HX - 6, 5, HZ + 70], { r: 3.2 }), G("hoop", [HX + 44, 6, HZ + 76], { r: 4.5 }),
];
const RILLERUN = [0.04, 0.09, 0.14, 0.2, 0.25, 0.31, 0.37, 0.43, 0.48, 0.53, 0.58, 0.62, 0.655, 0.69, 0.74, 0.79, 0.84, 0.89, 0.94, 0.985].map((t, i) => G(i % 4 === 0 ? "hoop" : "ring", RL(t, 5.2), { r: t > 0.59 && t < 0.72 ? 3.2 : i % 4 === 0 ? 4.4 : 3.6 }));
const DRIVERRUN = [
  G("hoop", DR(0.06), { r: 4 }), G("hoop", DR(0.25), { r: 4 }), G("hoop", DR(0.5), { r: 4 }), G("hoop", DR(0.75), { r: 4 }), G("hoop", DR(1, 3.6), { r: 5 }),
  G("hoop", [-256, 99, -282], { r: 5 }), G("hoop", [-244, 108, -312], { r: 5.5 }), G("hoop", [-204, 106, -318], { r: 5.5 }), G("hoop", [-150, 96, -296], { r: 5.5 }), G("hoop", [-60, 90, -250], { r: 5.5 }),
  G("hoop", [44, 64, -236], { r: 5 }), G("ring", T(100, -196, 16), { r: 3.6 }), G("hoop", T(156, -128, 12), { r: 4.5 }), G("ring", [146, 6, -87], { r: 3.2 }),
  G("square", [126, 3.6, -87], { w: 6, h: 4.6, yaw: 90 }), G("square", [74, 3.6, -87], { w: 6, h: 4.6, yaw: 90 }), G("hoop", [30, 7, -72], { r: 4 }), G("hoop", [-16, 9, -86], { r: 4 }),
];
const DIVE = [
  G("hoop", [60, 8, 78], { r: 4.5 }), G("hoop", [96, 22, 60], { r: 4.5 }), G("square", [112.5, 30.7, 92], { w: 5.6, h: 9, yaw: 180 }), G("hoop", [104, 20, 128], { r: 4.5 }), G("hoop", [40, 10, 136], { r: 4.5 }),
  G("ring", [-20, 7, 128], { r: 3.4 }), G("hoop", T(-126, 148, 9), { r: 4.5 }), G("hoop", [-172, MINE.floor + 9, 172], { r: 4.5 }), G("hoop", [-190, MINE.floor + 9, 201], { r: 4.5 }), G("hoop", [-213, MINE.floor + 12, 171], { r: 4.5 }),
  G("hoop", T(-214, 112, 12), { r: 5 }), G("hoop", [-150, 14, 52], { r: 4.5 }), G("ring", [-112, 6, 26], { r: 3.4 }), G("hoop", [-72, 6, 10], { r: 4 }), G("square", [HX, 3.8, HZ + 21.5], { w: 8, h: 4.6, yaw: -90 }),
];
const TRACKS = [
  { id: "base", name: "기지 순환", level: 1, laps: 3, desc: "거주 모듈을 잇는 통로 아래를 차례로 지나 중심 돔을 한 바퀴 도는 입문 코스", gates: BASE },
  { id: "rille", name: "릴 협곡 런", level: 2, loop: false, desc: "평원 남쪽 입구에서 자연 다리와 배관 다리 밑, 용암 동굴을 지나 동쪽 출구까지 달리는 구간 주행", start: { pos: [-40, 0, 150], yaw: yawTo([-40, 0, 150], RL(0.04)) }, gates: RILLERUN },
  { id: "dive", name: "크레이터 다이브", level: 2, laps: 2, desc: "갠트리와 로켓 사이를 꿰고 채굴 크레이터 바닥까지 내리꽂은 뒤 온실과 거주 구역으로 돌아오는 코스", gates: DIVE },
  { id: "driver", name: "매스 드라이버", level: 3, laps: 2, desc: "가속 고리를 타고 산마루까지 치솟아 전파 관측소를 넘고, 태양광 고랑으로 내리꽂는 고난도 코스", start: { pos: [-22, 0, -104], yaw: yawTo([-22, 0, -104], DR(0.06)) }, gates: DRIVERRUN },
];

export default {
  id: "moon",
  name: "달 기지",
  desc: "검은 하늘에 지구가 떠 있는 월면 기지. 돔과 모듈 사이 통로, 로켓 갠트리, 매스 드라이버의 가속 고리, 채굴 크레이터와 용암 동굴까지",
  size: 300,
  ceiling: 200,
  seed: 73,
  env: {
    stars: true, lamps: true, cloud: 0, noWind: true,
    sky: { top: 0x000003, horizon: 0x04050b, bottom: 0x000000 }, sunDir: [0.74, 0.44, 0.36], sunColor: 0xfff6e8, sun: 3.4, sunDisc: 9,
    hemi: 0.5, hemiSky: 0x9fb4e0, hemiGround: 0x5a5c66, toon: { sun: 0.66, fill: 0.2 },
    fog: { color: 0x04050a, near: 500, far: 2600 }, exposure: 1.0, glow: 2.0, bloom: { strength: 0.42, radius: 0.5, threshold: 0.92 },
  },
  spawn: { pos: [8, 0, 62], yaw: 0 },
  thumb: { pos: [196, 40, 176], look: [10, 30, -40] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "rover", name: "보급 로버", type: "truck", level: 1, desc: "표지등이 늘어선 순환 도로를 도는 보급 로버를 따라가세요", duration: 80, color: 0xe9ebf0, path: OUTER.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, 0, z, 9]) },
    { id: "loader", name: "하역 로더", type: "forklift", level: 1, desc: "화물 호퍼가 오르내리는 착륙장 둘레를 도는 하역 로더", duration: 70, path: LOADER },
    { id: "buggy", name: "월면 버기", type: "sportscar", level: 2, desc: "서쪽 평원의 크레이터 사이를 튀어 오르며 달리는 버기 추적", duration: 80, color: 0xf07a1e, path: BUGGY },
    {
      id: "drone", name: "탐사 드론", type: "drone", level: 3, desc: "모듈 통로 아래와 매스 드라이버의 가속 고리를 누비는 탐사 드론을 화면에 담으세요", duration: 85,
      path: DRONE.map((p) => [...p, 12]),
    },
  ],
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: [20, 46, 140] },
};
