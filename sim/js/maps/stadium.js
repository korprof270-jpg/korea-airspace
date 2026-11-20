// 맵: 드론 리그 스타디움 — 미래의 야외 드론 경기장. 밤하늘 아래 네온이 번지는 넓은 경기장(보통 맵의 4배 넓이)
//  · 남서: 청팀 기지 (기지 문 셋·정비 패드, 맨 안쪽 높은 단 위 코어 반응로 — 방벽과 진입로, 방어 포탑 받침) / 북동: 홍팀 기지 (원점 대칭)
//  · 세 라인: 위(서쪽·북쪽 가장자리) · 가운데(대각선) · 아래(남쪽·동쪽 가장자리). 바닥 빛 트랙과 120 m 마다 빛 고리
//  · 라인 사이 정글: 기둥·LED 탑·떠 있는 판·고리·아치·터널, 정글 캠프 여덟 자리, 숨은 상자 여덟 자리
//  · 엄폐물(stadium-cover.js): 라인 옆 에너지 방벽 · 장갑 격벽 · 타워 곁 블록 · 캠프 벽 · 높은 기둥 · 고가 다리
//  · 가운데: 보랏빛 보스 구덩이 / 둘레: 광고판 담장, 계단식 관중석과 대형 전광판, 모서리 조명탑, 먼 미래 도시
// 기지전(AOS) 모드가 쓰는 배치는 aos 필드로 내보낸다 (modes/aos.js)
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers } from "./moon-kit.js";
import { NeonSigns, height, colorFn, BASES, BASE_R, PAD_R, REACTOR, corePos, defensePos, gateAngles, LANES, TOWERS, TOWER_H, CAMPS, CACHES, BOSS, PIT, HALF, RING_R, laneHoops } from "./stadium-kit.js";
import { bases, lanes, towers, bossPit, campPads, cacheHides, jungle, padPos } from "./stadium-field.js";
import { stands, floodlights, skyline, blimps } from "./stadium-arena.js";
import { cover, COVER } from "./stadium-cover.js";

export { height };

const G = (t, p, o = {}) => ({ t, p, ...o });
const SIGNS = [
  { id: "pad", text: ["정비", "PIT"], fg: "#cfff9a", bg: "#0c1a08", glow: "#8cff4a", w: 256, h: 128 },
  { id: "padB", text: ["청팀 정비 패드\n업그레이드 · 회복", "BLUE PIT\nUPGRADE · REPAIR"], fg: "#e8fff0", bg: "#061a2e", glow: "#8cff4a", w: 512, h: 192 },
  { id: "padR", text: ["홍팀 정비 패드\n업그레이드 · 회복", "RED PIT\nUPGRADE · REPAIR"], fg: "#e8fff0", bg: "#2e0610", glow: "#8cff4a", w: 512, h: 192 },
  { id: "gateB", text: ["청팀 기지", "BLUE BASE"], fg: "#bfe0ff", bg: "#061636", glow: "#5aa9ff", w: 512, h: 72 },
  { id: "gateR", text: ["홍팀 기지", "RED BASE"], fg: "#ffd0d4", bg: "#360610", glow: "#ff5a66", w: 512, h: 72 },
  { id: "pit", text: ["보스 구덩이", "BOSS PIT"], fg: "#ffc8f4", bg: "#1e0626", glow: "#ff3ad6", w: 512, h: 128 },
  { id: "ad1", text: ["드론 리그 2087", "DRONE LEAGUE 2087"], fg: "#3ff0ff", bg: "#05101c", w: 512, h: 64 },
  { id: "ad2", text: ["네온 모터스", "NEON MOTORS"], fg: "#ff5ad6", bg: "#14051a", w: 512, h: 64 },
  { id: "ad3", text: ["초고속 배터리 · 볼트", "VOLT BATTERIES"], fg: "#ffe14a", bg: "#1a1405", w: 512, h: 64 },
  { id: "ad4", text: ["하늘 통신 6G", "SKYNET 6G"], fg: "#8cff4a", bg: "#081a05", w: 512, h: 64 },
  { id: "ad5", text: ["프로펠러 라멘", "PROP RAMEN"], fg: "#ff9a3a", bg: "#1a0c05", w: 512, h: 64 },
  { id: "league", text: ["기지전 · 결승", "BASE WARS · FINAL"], fg: "#ffffff", bg: "#101832", glow: "#3ff0ff", w: 512, h: 64 },
  { id: "fpv", text: "FPV PROJECT", fg: "#ffffff", bg: "#200a30", glow: "#ff3ad6", w: 512, h: 64 },
  {
    id: "screenA", text: ["청팀  VS  홍팀", "BLUE  VS  RED"], fg: "#ffffff", bg: "#060a1c", bg2: "#140620", grid: "#3ff0ff", glow: "#3ff0ff", w: 768, h: 368, ty: 0.42,
    draw: (g, w, h) => { g.fillStyle = "#2f8cff"; g.fillRect(0, h * 0.78, w / 2, h * 0.12); g.fillStyle = "#ff2d3d"; g.fillRect(w / 2, h * 0.78, w / 2, h * 0.12); },
  },
  {
    id: "screenB", text: ["드론 리그\n기지전", "DRONE LEAGUE\nBASE WARS"], fg: "#ffffff", bg: "#14061e", bg2: "#060a1c", grid: "#ff3ad6", glow: "#ff3ad6", w: 768, h: 368,
  },
];

// ── 경주 코스 ──
// 1. 센터 서킷: 보스 구덩이 둘레를 도는 고리 길 (높낮이를 번갈아)
const CENTER = Array.from({ length: 10 }, (_, i) => { const a = -(i / 10) * Math.PI * 2 + 0.3; return G(i % 3 === 1 ? "square" : "hoop", [Math.cos(a) * RING_R, i % 2 ? 22 : 9, Math.sin(a) * RING_R], i % 3 === 1 ? { w: 10, h: 7 } : { r: 5 }); });
// 2. 그랜드 투어: 청 기지 → 가운데 라인 빛 고리 → 홍 기지 한가운데 관통 → 위 라인을 되짚어 → 청 기지 한가운데 관통
const baseGate = (t, id) => { const [bx, bz] = BASES[t], pts = LANES[id], p = t ? pts[pts.length - 2] : pts[1], a = Math.atan2(p[1] - bz, p[0] - bx); return [bx + Math.cos(a) * (BASE_R - 2), 13, bz + Math.sin(a) * (BASE_R - 2)]; };
const hoopsOf = (id, rev) => { const h = laneHoops(id).map((q) => G("hoop", [q.p[0], 13, q.p[1]], { r: 5.5 })); return rev ? h.reverse() : h; };
const TOUR = [
  G("square", baseGate(0, "mid"), { w: 14, h: 9 }), ...hoopsOf("mid"), G("square", baseGate(1, "mid"), { w: 14, h: 9 }),
  G("ring", [BASES[1][0], 15, BASES[1][1]], { r: 5 }),
  G("square", baseGate(1, "top"), { w: 14, h: 9 }), ...hoopsOf("top", true), G("square", baseGate(0, "top"), { w: 14, h: 9 }),
  G("ring", [BASES[0][0], 15, BASES[0][1]], { r: 5 }),
];
const TRACKS = [
  { id: "center", name: "센터 서킷", level: 1, laps: 3, desc: "보스 구덩이 둘레를 높고 낮게 번갈아 도는 입문 코스. 정글 탑 사이로 경기장 전체가 보인다", gates: CENTER },
  { id: "tour", name: "그랜드 투어", level: 3, laps: 1, desc: "가운데 라인의 빛 고리를 꿰어 홍팀 기지 한가운데를 관통하고, 위 라인을 따라 경기장 가장자리를 돌아오는 긴 코스", gates: TOUR },
];

// 트래킹: 하늘을 도는 중계 드론
const oval = (cx, cz, rx, rz, y, n, v, wob = 3) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, y + Math.sin(a * 3) * wob, cz + Math.sin(a) * rz, v]; });
const TRACKING = [
  { id: "cam", name: "중계 드론", type: "drone", level: 1, desc: "경기장 위를 크게 도는 중계 카메라 드론을 화면에 담으세요", duration: 80, path: oval(0, 0, 260, 260, 60, 20, 16, 8) },
  { id: "racer", name: "센터 서킷 레이서", type: "fpv", level: 3, desc: "보스 구덩이 둘레를 질주하는 리그 레이서", duration: 75, path: CENTER.map((g) => [g.p[0], g.p[1], g.p[2], 20]) },
];

const [PX, PZ] = padPos(0);
const SPAWN = [PX, 0.6, PZ];

function build(w) {
  const K = { blink: new Blinkers(w) };
  const S = new NeonSigns(w, SIGNS);
  w.terrain(height, colorFn, { flat: "asphalt", flatTint: "0.7, 0.85, 1.0", rockTint: "0.55, 0.6, 0.75", rockLo: 0.35, rockHi: 0.6 });
  const t0 = performance.now();
  bases(w, K, S); lanes(w, K); towers(w, K); bossPit(w, K, S); campPads(w, K); cacheHides(w, K); cover(w, K);
  const tourKeep = new THREE.CatmullRomCurve3(TOUR.map((g) => new THREE.Vector3(...g.p)), true, "centripetal").getSpacedPoints(300).map((v) => [v.x, v.z]);
  jungle(w, K, S, tourKeep);
  stands(w, K, S); floodlights(w, K); skyline(w, K); blimps(w, S);
  S.finish(); K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "stadium",
  name: "드론 리그 스타디움",
  desc: "밤하늘 아래 네온이 번지는 미래의 야외 드론 경기장. 보통 맵의 네 배 넓이에 두 팀 기지와 세 라인, 정글과 보스 구덩이, 관중석과 대형 전광판이 둘러싼다",
  size: HALF,
  ceiling: 220,
  seed: 2087,
  env: {
    night: true, stars: true, cloud: 0.2, cloudLit: 0x8a5aff, cloudDark: 0x120c2a, horizonGlow: 0x7a2a8a,
    sky: { top: 0x04061a, horizon: 0x3a2470, bottom: 0x120c2a }, sunDir: [0.4, 0.62, -0.5], sunColor: 0xb8c4ff, sun: 1.2, sunDisc: 0,
    hemi: 1.0, hemiSky: 0x7a84d8, hemiGround: 0x3a3060, fog: { color: 0x1c1640, near: 320, far: 1500 },
    glow: 2.0, windowGlow: 1.2, exposure: 1.12, bloom: { strength: 0.5, radius: 0.55, threshold: 0.86 },
    look: { aoTint: 0x221a50 },
  },
  spawn: { pos: SPAWN, yaw: -45 },
  thumb: { pos: [-470, 150, 470], look: [0, 0, 0] },
  build,
  tracks: TRACKS,
  tracking: TRACKING,
  combat: { blue: BASES[0], red: BASES[1], depots: CAMPS.filter((c) => c.big).map((c) => c.p), startOffset: 40 },
  // 기지전(AOS) 배치
  aos: { hoops: Object.fromEntries(Object.keys(LANES).map((id) => [id, laneHoops(id)])), bases: BASES, baseR: BASE_R, padR: PAD_R, pads: [padPos(0), padPos(1)], cores: [corePos(0), corePos(1)], reactor: REACTOR, defenses: [defensePos(0), defensePos(1)], gates: [gateAngles(0), gateAngles(1)], lanes: LANES, towers: TOWERS, towerH: TOWER_H, camps: CAMPS, caches: CACHES, boss: BOSS, pit: PIT, cover: COVER },
};
