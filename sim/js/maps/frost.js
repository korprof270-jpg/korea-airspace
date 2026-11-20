// 맵: 설원 통신기지 — 에이아의 신호를 처음 붙잡은 휴마 연합의 얼어붙은 전초기지. 해 진 뒤의 푸른 설원, 북쪽 하늘의 오로라 (가상의 장소)
//  · 북: 신호탑 언덕(다리 사이가 뚫린 125 m 격자탑, 꼭대기에서 청록 ‘신호’가 맥박 친다)
//  · 가운데: 통신기지 — 거대 접시 셋이 늘어선 레이더 회랑, 반지하 아치 격납고 둘(남북 관통), 지휘 벙커, 활주로와 착륙 패드
//  · 서: 빙붕과 얼음 협곡(철교·천연 얼음 다리 셋·얼음 갈비 셋), 협곡은 남쪽 얼음 호수로 빠진다
//  · 남: 얼음 호수에 두 동강 나 처박힌 수송함(뒤쪽 화물칸 관통)
//  · 동: 포격을 맞은 백설 시 — 통신탑과 학교(‘우리는 춥다’), 난방소 굴뚝, 길을 걸친 뚫린 건물, 대피소 돔
//  · 북동: 야포 넷이 늘어선 포대 고지와 고갯길
import * as THREE from "../../vendor/three.module.min.js";
import { flora } from "./canyon-kit.js";
import { snowGround } from "./snow-detail.js";
import { Blinkers, PaintSigns, RWY, HANGARS, HZ0, HZ1, HA, DISHES, BUNKER, BLUE, TOWN, TTOWER, STACKS, SHELTERS, BRIDGE } from "./frost-kit.js";
import { height, colorFn, SIG, ART, WRECK, LAKE, CANYON } from "./frost-terrain.js";
import { signalTower, dishes, hangars, bunker, pavement, facilities } from "./frost-base.js";
import { town } from "./frost-town.js";
import { canyon, wreck, artillery, camps, roadside, scatter, canyonP, wreckP, WRECK_YAW } from "./frost-detail.js";
import { aurora, blizzard, searchlights, farFlashes } from "./frost-sky.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const DX = DISHES.map((d) => d[0]), DZ = DISHES[0][1], HY = 4.8;

// 1. 레이더 회랑: 활주로를 동쪽으로 달리고, 거대 접시 셋 밑을 서쪽으로 꿰어 돌아오는 넓은 입문 코스
const ALLEY = [
  G("hoop", [-50, 6, RWY.z], { r: 5 }), G("square", [15, 5.2, RWY.z], { w: 10, h: 6 }), G("hoop", [76, 7, RWY.z], { r: 5 }), G("hoop", [112, 10, -32], { r: 5 }),
  G("hoop", [134, 11, -84], { r: 5 }), G("square", [DX[2], 7, DZ], { w: 14, h: 9 }), G("square", [DX[1], 7, DZ], { w: 14, h: 9 }), G("square", [DX[0], 7, DZ], { w: 14, h: 9 }),
  G("hoop", [-90, 10, -86], { r: 5 }), G("hoop", [-101, 9, -36], { r: 4.5 }), G("hoop", [-92, 6.5, 0], { r: 5 }),
];
// 2. 빙하 협곡: 격납고를 남으로 꿰고 호수의 수송함을 관통한 뒤, 얼음 협곡을 거슬러 올라 빙붕 위로 솟구친다
const GLACIER = [
  G("square", [HANGARS[0], HY, HZ0 + 1], { w: 10, h: 6.5, yaw: 180 }), G("square", [HANGARS[0], HY, HZ1 - 1], { w: 10, h: 6.5, yaw: 180 }), G("hoop", [-58, 7, 14], { r: 5 }), G("hoop", [-42, 9, 96], { r: 5 }),
  G("hoop", wreckP(-12, 9, -50), { r: 5 }), G("square", wreckP(0, 5, -21), { w: 9, h: 6, yaw: WRECK_YAW + 180 }), G("square", wreckP(0, 5, 21), { w: 9, h: 6, yaw: WRECK_YAW + 180 }), G("hoop", [-76, 7, 180], { r: 5 }),
  G("hoop", canyonP(126, 8), { r: 5 }), G("hoop", canyonP(96), { r: 4.5 }), G("ring", canyonP(66), { r: 4 }), G("square", canyonP(BRIDGE.z, 10), { w: 12, h: 9 }),
  G("ring", canyonP(-4), { r: 4 }), G("hoop", canyonP(-52), { r: 4.5 }), G("hoop", canyonP(-112), { r: 4.5 }), G("ring", canyonP(-150), { r: 4 }),
  G("hoop", [-160, 24, -180], { r: 5 }), G("hoop", [-122, 32, -168], { r: 5 }), G("hoop", [-92, 17, -112], { r: 5 }),
];
// 3. 얼어붙은 신호: 격납고를 북으로 꿰고 접시 사이로 솟아 신호탑을 한 바퀴 감은 뒤, 백설 시로 내리꽂아 굴뚝 사이와 큰길을 지난다
const SIGNAL = [
  G("hoop", [34, 5, 16], { r: 4.5 }), G("hoop", [-18, 5, 8], { r: 4.5 }), G("square", [HANGARS[1], HY, HZ1 - 1], { w: 10, h: 6.5, yaw: 0 }), G("square", [HANGARS[1], HY, HZ0 + 1], { w: 10, h: 6.5, yaw: 0 }),
  G("hoop", [-6, 16, DZ + 1], { r: 5 }), G("hoop", [18, 34, -150], { r: 5 }), G("hoop", [SIG[0] + 27, 48, SIG[1] + 3], { r: 5 }), G("hoop", [SIG[0] + 4, 60, SIG[1] - 27], { r: 5 }),
  G("hoop", [SIG[0] - 27, 72, SIG[1] - 5], { r: 5 }), G("hoop", [SIG[0] - 6, 84, SIG[1] + 27], { r: 5 }), G("hoop", [60, 62, -142], { r: 5.5 }), G("hoop", [150, 36, -92], { r: 5.5 }),
  G("hoop", [212, 30, -42], { r: 5 }), G("square", [(STACKS[0][0] + STACKS[1][0]) / 2, 26, STACKS[0][1]], { w: 7.6, h: 12, yaw: 180 }), G("hoop", [219, 13, 30], { r: 4.5 }), G("hoop", [180, 8, TOWN.main], { r: 4.5 }),
  G("square", [122, 7, TOWN.main], { w: 10, h: 7 }), G("hoop", [84, 6, 27], { r: 4.5 }),
];
const TRACKS = [
  { id: "alley", name: "레이더 회랑", level: 1, laps: 3, desc: "활주로를 동쪽으로 달린 뒤 거대 접시 셋 밑을 서쪽으로 꿰어 돌아오는 넓은 입문 코스", gates: ALLEY },
  { id: "glacier", name: "빙하 협곡", level: 2, laps: 2, desc: "격납고를 꿰고 얼음 호수에 처박힌 수송함을 관통한 뒤, 철교와 얼음 다리 밑으로 협곡을 거슬러 올라 빙붕 위로 솟구치는 기술 코스", gates: GLACIER },
  { id: "signal", name: "얼어붙은 신호", level: 3, laps: 2, desc: "격납고를 북으로 꿰고 접시 사이로 솟아 신호탑을 한 바퀴 감은 뒤, 백설 시로 내리꽂아 난방소 굴뚝 사이와 큰길을 지나 돌아오는 고난도 코스", gates: SIGNAL },
];

// ── 임무 지점 ──
const DEPOTS = [[-52, -90], [92, -48], [70, 96], [-190, -40]];
const COMBAT = { blue: BLUE, red: ART, depots: DEPOTS };
const STRIKE = { turrets: [[150, -34], [212, -30], [244, 38], [150, 95], [205, 96], [104, 60]], core: [176, 4] };
const SUPPLY = { depot: [-50, -2], camps: [[-205, 70], [66, -150], [177.5, 127], [62, 124]], turrets: [[100, 95], [-176, 84]] };
// 호송(피난 수송함): 대피소 → 동쪽 길 → 큰길 → 기지 앞 눈길 → 철교 → 빙붕 서쪽 경계
const CONVOY = [[205, 0, 142], [205, 0, 96], [205, 0, 54], [196, 0, 41], [170, 0, 38], [118, 0, 38], [95, 0, 31], [0, 0, 31], [-70, 0, 31], [-128, 0, 37], [-160, 0, 40], [-200, 0, 36], [-246, 0, 26]];
const SPAWN = [-64, 0.8, RWY.z];

// ── 트래킹 경로 ──
const oval = (cx, cz, rx, rz, y, n, v, wob = 3) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, y + Math.sin(a * 3) * wob, cz + Math.sin(a) * rz, v]; });
// 지형을 따라 일정 높이로 뜬 경로: 앞뒤 점의 지면 중 높은 쪽 + lift
const hover = (pts, lift, v) => pts.map((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length]; return [p[0], Math.max(height(p[0], p[1]), height(a[0], a[1]), height(b[0], b[1])) + lift, p[1], v]; });
// 제국 수송정: 고갯길에서 넘어와 접시와 신호탑 사이, 빙붕과 협곡 위, 얼음 호수, 백설 시 동쪽을 크게 돈다
const SHUTTLE = hover([[236, -78], [170, -112], [100, -148], [40, -146], [-40, -146], [-110, -150], [-190, -120], [-222, -40], [-210, 50], [-170, 120], [-100, 176], [-10, 200], [80, 188], [150, 176], [226, 168], [252, 100], [252, 20], [250, -40]], 25, 15);
const gatePath = (gates, v) => gates.map((g) => [g.p[0], g.p[1], g.p[2], v]);

const SIGNS = [
  { id: "H1", text: ["제1 격납고", "HANGAR 1"], fg: "#f2f4f8", bg: "#3f4a58", w: 256, h: 66 },
  { id: "H2", text: ["제2 격납고", "HANGAR 2"], fg: "#f2f4f8", bg: "#3f4a58", w: 256, h: 66 },
  { id: "cmd", text: ["설원 통신기지 지휘소", "FROST RELAY COMMAND"], fg: "#f2f4f8", bg: "#23407e", w: 400, h: 80 },
  { id: "rwy", text: "09", fg: "#e8edf2", bg: "#474d57", w: 128, h: 128 },
  { id: "pad", text: "H", fg: "#f3c22c", bg: "#565d68", w: 128, h: 128 },
  { id: "fuel", text: ["유류 · 화기엄금", "FUEL · NO FIRE"], fg: "#c0282a", bg: "#f3c22c", w: 256, h: 37 },
  { id: "cold", text: ["우리는 춥다", "WE ARE COLD"], fg: "#f4f6fa", bg: "#4f443c", w: 512, h: 172, scale: 1.25 },
  { id: "school", text: ["백설 초등학교", "BAEKSEOL SCHOOL"], fg: "#3a2a20", bg: "#e7e0cf", w: 320, h: 65 },
  { id: "evac", text: ["대피소 ➜", "SHELTER ➜"], fg: "#ffffff", bg: "#2f9e5a", w: 256, h: 112 },
  ...[1, 2, 3, 4].map((n) => ({ id: `S${n}`, text: [`대피소 ${n}`, `SHELTER ${n}`], fg: "#ffffff", bg: "#d05a1e", w: 224, h: 67 })),
  { id: "depot", text: ["백설 시 공동 창고", "BAEKSEOL DEPOT"], fg: "#f2f4f8", bg: "#3f4a58", w: 400, h: 70 },
  { id: "battery", text: ["제3 포대", "BATTERY 3"], fg: "#f2f0ea", bg: "#4a5631", w: 256, h: 50 },
];

function build(w) {
  const K = { blink: new Blinkers(w) }, T = flora(w).T;
  const S = new PaintSigns(w, SIGNS);
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.04, 1.1, 1.26", rockTint: "0.8, 0.9, 1.12", rockLo: 0.3, rockHi: 0.5 });
  snowGround(w);
  aurora(w); farFlashes(w);

  // ── 비워 둘 곳: 임무 지점·진지·코스 선 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 10]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 20], [SUPPLY.depot[0], SUPPLY.depot[1], 10],
    ...SUPPLY.camps.map((p) => [p[0], p[1], 10]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]), [BLUE[0], BLUE[1], 36], [ART[0], ART[1], 28], [SIG[0], SIG[1], 30], [SPAWN[0], SPAWN[2], 12], [18, 90, 22]];
  // 구조물이 선 자리 [x0, x1, z0, z1]
  const BOXES = [[RWY.x0 - 4, RWY.x1 + 4, RWY.z - 13, RWY.z + 13], [-98, 34, HZ0 - 6, 8], [BUNKER[0] - 24, BUNKER[0] + 24, BUNKER[1] - 20, BUNKER[1] + 14], [46, 74, -28, 0], [-2, 22, -52, -22],
    ...DISHES.map(([x, z]) => [x - 24, x + 24, z - 27, z + 27]), [TOWN.x0 - 4, TOWN.x1 + 6, TOWN.z0 - 4, TOWN.z1 + 4]];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 12);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat(TRACKING.filter((t) => t.type !== "fpv" && t.type !== "scout").map((t) => sample(t.path, true)));
  // 출발 지점(첫 게이트 앞 16 m)도 비운다
  for (const t of TRACKS) { const g = t.gates, a = g[g.length - 1].p, b = g[1].p, L = Math.hypot(b[0] - a[0], b[2] - a[2]); KEEP.push([g[0].p[0] - (b[0] - a[0]) / L * 16, g[0].p[2] - (b[2] - a[2]) / L * 16, 10]); }
  const open = (x, z, m = 0) => !BOXES.some(([x0, x1, z0, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  const free = (x, z, m = 0) => {
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const L of LINES) for (const p of L) if (p.y - w.h(p.x, p.z) < 26 && Math.hypot(x - p.x, z - p.z) < 9 + m) return false;
    return true;
  };
  const ctx = { free, open };

  const sy = signalTower(w, K);
  dishes(w, K); hangars(w, K, S);
  const vent = bunker(w, K, S);
  pavement(w, K, S); facilities(w, K, S, ctx);
  town(w, K, S);
  canyon(w, K, ctx); wreck(w, K, S); artillery(w, K, S, ctx);
  camps(w, K, [SUPPLY.camps[0], SUPPLY.camps[1], SUPPLY.camps[3]]);

  const t0 = performance.now();
  roadside(w, K, ctx); scatter(w, K, T, ctx);
  // 기지와 계류장의 조명
  for (const [x, z, ry] of [[-88, -12, 90], [-50, -17, 0], [-10, -12, 270], [-88, 4, 90], [36, -4, 180], [72, -4, 180], [30, -62, 0], [-48, -64, 180]]) if (free(x, z, 2)) w.lamp(x, z, 8, 0xdcecff, ry, 2);
  searchlights(w, [[BUNKER[0] - 3, 10.4, BUNKER[1] - 1, 0.4, 0.21, 38], [ART[0] - 24, w.h(ART[0] - 24, ART[1] - 26) + 1, ART[1] - 26, 2.6, 0.17, 46], [TTOWER[0] + 9, 3.4, TTOWER[1] - 1, 4.4, 0.19, 34], [SIG[0] + 26, sy + 3.2, SIG[1] - 14, 1.3, 0.14, 30]]);
  blizzard(w, w.quality === "low" ? 800 : 1500);
  S.finish();
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
  void vent; void HA; void SHELTERS; void WRECK; void LAKE; void CANYON;
}

const TRACKING = [
  { id: "recon", name: "기지 정찰 드론", type: "drone", level: 1, desc: "활주로와 격납고, 지휘 벙커 위를 크게 도는 아군 정찰 드론을 화면에 담으세요", duration: 80, path: oval(-12, -24, 100, 56, 21, 16, 11) },
  { id: "heli", name: "구조 헬기", type: "heli", level: 2, desc: "얼음 호수와 백설 시 대피소 위를 오가는 구조 헬기를 쫓으세요", duration: 75, path: oval(72, 96, 150, 76, 42, 18, 20, 5) },
  { id: "convoy", name: "제국 수송정", type: "shuttle", clear: 5, level: 2, desc: "거대한 기계 부품을 싣고 설원을 가로지르는 제국 수송정. 접시와 신호탑 사이, 빙붕과 협곡 위, 얼음 호수와 백설 시를 돈다", duration: 85, path: SHUTTLE },
  { id: "fpv", name: "협곡 레이서", type: "fpv", level: 3, desc: "수송함 잔해를 꿰고 얼음 협곡을 거슬러 오르는 다른 레이싱 드론", duration: 75, path: gatePath(GLACIER, 19) },
  { id: "scout", name: "제국 정찰 드론", type: "scout", level: 3, desc: "신호탑을 감아 돌고 백설 시 굴뚝 사이로 빠져나가는 제국 정찰 드론을 놓치지 마세요", duration: 85, path: gatePath(SIGNAL, 14) },
];

export default {
  id: "frost",
  name: "설원 통신기지",
  desc: "에이아의 신호를 붙잡은 얼어붙은 전초기지. 맥박 치는 신호탑과 거대 접시 셋, 반지하 격납고, 얼음 협곡의 철교와 얼음 다리, 호수에 처박힌 수송함, 포격 맞은 백설 시와 대피소 돔. 북쪽 하늘엔 오로라가 걸렸다",
  size: 250,
  ceiling: 190,
  seed: 631,
  env: {
    lamps: true, stars: true, cloud: 0.3, cloudLit: 0xf0a0a0, cloudDark: 0x2c3566, horizonGlow: 0xb0503c,
    sky: { top: 0x050b24, horizon: 0x5d68ac, bottom: 0x4a5684 }, sunDir: [-0.74, 0.17, 0.5], sunColor: 0xffb88e, sun: 2.7, sunDisc: 5,
    hemi: 0.66, hemiSky: 0x9ab8ff, hemiGround: 0x596a94, toon: { sun: 0.62, fill: 0.36 },
    fog: { color: 0x6f7cb0, near: 220, far: 1500 }, exposure: 1.04, glow: 2.0, windowGlow: 1.2, bloom: { strength: 0.42, radius: 0.55, threshold: 0.9 },
    look: { aoTint: 0x34447c },
  },
  spawn: { pos: SPAWN, yaw: 270 },
  thumb: { pos: [-150, 78, 150], look: [20, 26, -90] },
  build,
  tracks: TRACKS,
  tracking: TRACKING,
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7, path: CONVOY },
  boss: { pos: [30, 64, 150] },
};
