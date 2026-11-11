// 맵: 네온 시티 — 밤의 도심. 60m 격자 위에 구역별로 성격이 다른 거리와 랜드마크를 놓는다
//  · 가운데: 하늘탑(첨탑)과 금융가 타워들, 그 둘레를 도는 모노레일 순환선(±90 도로 위)
//  · z 49..71: 도로보다 낮은 천변 물길과 다리 10개      · 북서: 아파트 단지   · 북동: 공사장(골조 빌딩·타워 크레인)
//  · 남서: 성문과 야시장(아케이드·등불 골목)            · 남: 달빛 공원·호텔   · 남동: 대관람차와 야외 공연장, 고가도로
import { MAG, CYA, YEL, GRN, ORG, VIO, RED, ring, Signs, icon, neonText } from "./city-kit.js";
import { BLOCK, tower, spire, gateTower, twinTowers, gardenDeck, crownTower, cylTower, construction, dome, ferrisBase, stage, market, cityGate, park, hotel, expressway, backdrop } from "./city-places.js";
import { stream, monorail, station, streets, padTrees } from "./city-infra.js";
import { life } from "./city-life.js";

// 도로를 따라 도는 둥근 사각 경로(지상 피사체용)
function loop(x0, x1, z0, z1, v, c = 14) {
  const vs = v * 0.45;
  return [
    [x0 + c, 0, z0, vs], [(x0 + x1) / 2, 0, z0, v], [x1 - c, 0, z0, vs], [x1, 0, z0 + c, vs], [x1, 0, (z0 + z1) / 2, v], [x1, 0, z1 - c, vs],
    [x1 - c, 0, z1, vs], [(x0 + x1) / 2, 0, z1, v], [x0 + c, 0, z1, vs], [x0, 0, z1 - c, vs], [x0, 0, (z0 + z1) / 2, v], [x0, 0, z0 + c, vs],
  ];
}

// 네온 간판 도안 (한글 글꼴이 없으면 영문 표기)
const S = (id, text, icn, fg, frame, kind) => ({ id, text, icon: icn, fg, frame, kind });
const SIGNS = [
  S("market", ["야시장", "NIGHT MKT"], "bowl", YEL, RED), S("noodle", ["국수", "NOODLE"], "bowl", 0xffd9a0, ORG), S("cafe", ["카페", "CAFE"], "cup", 0xffffff, CYA),
  S("sing", ["노래방", "KARAOKE"], "note", MAG, VIO), S("pharm", ["약국", "PHARMACY"], "cross", GRN, GRN), S("mart", ["24시 마트", "24H MART"], "bolt", YEL, CYA),
  S("fish", ["횟집", "SEAFOOD"], "fish", CYA, 0xffffff), S("arcade", ["게임랜드", "ARCADE"], "star", MAG, CYA), S("post", ["드론 택배", "DRONE POST"], "drone", ORG, YEL),
  S("hotel", ["호텔 달빛", "HOTEL LUNA"], "moon", 0xffe9b0, VIO), S("luna", ["달빛 랜드", "LUNA PARK"], "wheel", MAG, YEL), S("caution", ["공사중", "CAUTION"], "warn", YEL, ORG),
  S("stnN", ["하늘역", "SKY STN"], "train", 0xffffff, CYA), S("stnS", ["천변역", "RIVERSIDE"], "train", 0xffffff, YEL),
  S("t0", ["분식", "SNACK"], "bowl", YEL, ORG, "tall"), S("t1", ["서점", "BOOKS"], "star", CYA, CYA, "tall"), S("t2", ["사진관", "PHOTO"], "heart", MAG, MAG, "tall"), S("t3", ["당구", "POOL"], "bolt", GRN, GRN, "tall"),
  S("t4", ["만화방", "COMIC"], "star", ORG, YEL, "tall"), S("t5", ["꽃집", "FLOWER"], "heart", 0xff8ad0, GRN, "tall"), S("t6", ["찻집", "TEA"], "cup", 0xffd9a0, RED, "tall"), S("t7", ["PC방", "PC"], "bolt", CYA, VIO, "tall"),
  {
    id: "gp", kind: "big", draw(g, W, H, ko) {
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#1c0b3e"); gr.addColorStop(1, "#06203e"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(33,212,253,0.55)"; g.lineWidth = 3;
      for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, 28 + i * 27); g.lineTo(36 + ((i * 53) % 90), 28 + i * 27); g.stroke(); }
      icon(g, "drone", 118, 118, 150, "#ffe14a");
      neonText(g, ko ? "하늘길 FPV" : "SKYWAY FPV", 350, 84, 60, "#ffffff", 300);
      neonText(g, ko ? "그랑프리" : "GRAND PRIX", 350, 158, 52, "#ff2bd6", 300);
      for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#0a0c14"; g.fillRect(i * 20, 220, 20, 14); g.fillStyle = i % 2 ? "#0a0c14" : "#ffffff"; g.fillRect(i * 20, 234, 20, 14); }
    },
  },
  {
    id: "neon", kind: "big", draw(g, W, H, ko) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#07102c"); gr.addColorStop(1, "#2a0b34"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 22; i++) { const h = 30 + ((i * 97) % 110), x = 10 + i * 23; g.fillStyle = ["#21d4fd", "#ff2bd6", "#ffe14a", "#35ff7a"][i % 4]; g.globalAlpha = 0.75; g.fillRect(x, H - 14 - h, 15, h); }
      g.globalAlpha = 1;
      neonText(g, ko ? "네온 시티" : "NEON CITY", W / 2, 70, 68, "#ffffff", 460);
      neonText(g, ko ? "생중계" : "LIVE", 444, 122, 26, "#ff3040", 110);
    },
  },
];

// 구역 배치: [열 i, 행 j, 짓는 함수]. 블록 중심은 (60i, 60j)
const gen = (kind, H, c, o) => (w, K, x, z) => { BLOCK[kind](w, K, x, z, H, c, o); padTrees(w, K, x, z); };
const basePad = (c) => (w, K, x, z) => {
  ring(w, x, 0.24, z, 13, 0.2, c, { col: false, seg: 48, sides: 4 }); ring(w, x, 0.24, z, 20.5, 0.12, c, { col: false, seg: 56, sides: 4 });
  w.pool(x, 0.2, z, 22, c, 0.3);
};
const CELLS = [
  [-3, -3, gen("apt", 48, null, { neon: GRN })], [-2, -3, gen("apt", 56, null, { neon: CYA, ns: true })], [-1, -3, gen("L", 26)], [0, -3, dome], [1, -3, gen("pair", 28)], [2, -3, gen("cyl", 22, 0x6a6e76, { R: 15, neon: ORG })], [3, -3, basePad(RED)],
  [-3, -2, gen("apt", 44, null, { neon: YEL, ns: true })], [-2, -2, gen("apt", 40, null, { neon: GRN })], [-1, -2, gen("podium", 46)], [0, -2, gen("twin", 52)], [1, -2, gen("setback", 48)], [3, -2, gen("quad", 26)],
  [-3, -1, gen("apt", 52, null, { neon: CYA })], [-2, -1, gen("podium", 40)], [-1, -1, gen("setback", 66, 0x566a7a, { neon: GRN, green: true })], [0, -1, gateTower],
  [1, -1, (w, K, x, z) => tower(w, K, x, z, 30, 30, 52, 0x5d6678, { roof: "heli", trim: true, neon: GRN })], [2, -1, crownTower], [3, -1, gen("pair", 30)],
  [-3, 0, gen("quad", 22)], [-2, 0, gen("setback", 42)], [-1, 0, cylTower], [3, 0, gen("L", 28)],
  [-3, 2, cityGate], [0, 2, park], [1, 2, hotel], [2, 2, (w, K, x, z) => ferrisBase(w, K, x, z, 38, 27)], [3, 2, gen("rows", 11)],
  [-3, 3, basePad(0x2f8cff)], [-2, 3, gen("rows", 9)], [-1, 3, gen("quad", 15)], [0, 3, gen("pair", 20)], [1, 3, gen("L", 22)], [2, 3, stage], [3, 3, gen("rows", 10)],
];

function build(w) {
  const K = { signs: new Signs(w, SIGNS), beacons: [], block: [] };
  stream(w, K);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (j !== 1) w.box(i * 60, 0, j * 60, 46, 0.18, 46, 0x4a4e58, { col: false, mat: "std:concrete", tile: 5 });
  const rail = monorail(w, K);
  station(w, K, 0, -90, "stnN", CYA, -1); station(w, K, 0, 90, "stnS", YEL, -1);
  spire(w, K); twinTowers(w, K); gardenDeck(w, K); construction(w, K); market(w, K); expressway(w, K);
  for (const [i, j, fn] of CELLS) fn(w, K, i * 60, j * 60);
  backdrop(w, K);
  streets(w, K);
  K.signs.finish();
  life(w, K, rail);
}

const G = (t, x, y, z, o = {}) => ({ t, p: [x, y, z], ...o });

export default {
  id: "city",
  name: "네온 시티",
  desc: "밤의 도심. 모노레일이 도는 금융가, 다리 아래로 흐르는 천변, 야시장과 대관람차까지 구역마다 다른 비행",
  size: 230,
  ceiling: 170,
  seed: 37,
  env: {
    night: true, stars: true, sky: { top: 0x060918, horizon: 0x3a2a66, bottom: 0x0d1020 }, sunDir: [-0.35, 0.72, 0.42], sunColor: 0xa8baff, sun: 1.0,
    hemi: 1.05, hemiSky: 0x6a74c0, hemiGround: 0x3a3050, fog: { color: 0x1d1838, near: 90, far: 760 }, glow: 1.9, windowGlow: 1.15,
  },
  spawn: { pos: [30, 0.4, 100], yaw: 0 },
  build,
  tracks: [
    {
      id: "downtown", name: "다운타운 스프린트", level: 1, laps: 3, desc: "모노레일 교각 아래 도심 블록을 한 바퀴 도는 직선 위주의 도로 코스",
      gates: [
        G("square", 0, 4, 30, { w: 6, h: 4.4 }), G("flag", 60, 0, 30, { w: 8 }), G("square", 90, 5, 0, { w: 7, h: 5 }), G("ring", 90, 5, -60, { r: 2.8 }),
        G("square", 60, 4.5, -90, { w: 6, h: 4.4 }), G("ring", 0, 5, -90, { r: 2.8 }), G("square", -30, 5, -60, { w: 7, h: 5 }), G("flag", -30, 0, 0, { w: 8 }),
      ],
    },
    {
      id: "stream", name: "천변 스트림 런", level: 2, laps: 2, desc: "물길로 내려가 다리 아래를 연달아 지나고, 달맞이 고리와 무지개 아치를 꿰어 돌아오는 코스",
      gates: [
        G("ring", -120, -3.2, 60), G("ring", -45, -3.2, 60), G("ring", 15, -3.2, 60), G("ring", 75, -3.2, 60), G("ring", 135, -3.2, 60), G("ring", 168, -3, 60),
        G("hoop", 194, 4, 52, { r: 4.5 }), G("hoop", 180, 9, 30, { r: 4.5 }), G("square", 90, 6.5, 30, { w: 7, h: 5 }), G("hoop", 38, 9.5, 32, { r: 4 }),
        G("hoop", 0, 7.3, 60, { r: 5.4, yaw: 180 }), G("hoop", -28, 7, 73, { r: 4 }), G("hoop", -60, 5.2, 60, { r: 4.5, yaw: 90 }), G("hoop", -112, 6, 60, { r: 4 }),
        G("hoop", -168, 5, 60, { r: 4 }), G("square", -193, 1.5, 60, { w: 8, h: 8, pitch: -90, yaw: -90 }), G("ring", -171, -3.2, 60, { yaw: -90 }),
      ],
    },
    {
      id: "market", name: "야시장 대시", level: 2, loop: false, desc: "성문을 지나 아케이드와 등불 골목, 공원의 달 고리, 대관람차 바퀴살 사이를 꿰는 구간 주행",
      start: { pos: [-212, 0.4, 120], yaw: -90 },
      gates: [
        G("square", -180, 3.3, 120, { w: 5.6, h: 5.2 }), G("hoop", -150, 4.5, 120, { r: 3.4 }), G("ring", -120, 4.5, 120, { r: 2.2 }), G("hoop", -90, 4.8, 120, { r: 3.2 }),
        G("ring", -60, 3.6, 120, { r: 2.1 }), G("hoop", -30, 5, 120, { r: 3.4 }), G("ring", 0, 5.4, 120, { r: 3 }), G("hoop", 30, 7, 120, { r: 3.6 }),
        G("ring", 60, 9.5, 120, { r: 2.6 }), G("hoop", 90, 14, 120, { r: 4 }), G("hoop", 120, 18, 120, { r: 4.5 }), G("hoop", 150, 12, 132, { r: 4 }),
        G("square", 150, 4.6, 150, { w: 8, h: 6 }), G("hoop", 146, 7, 172, { r: 4 }), G("hoop", 120, 6.5, 178, { r: 4.5 }), G("hoop", 90, 8, 180, { r: 4.5 }),
      ],
    },
    {
      id: "rooftop", name: "루프탑 런", level: 3, laps: 2, desc: "가든 터널, 골조 빌딩과 크레인 화물 아래, 헬기장, 관문 빌딩 관통, 스카이브리지 사이를 잇는 고난도 코스",
      gates: [
        G("square", 30, 6, 8, { w: 6, h: 4.4, yaw: 0 }), G("ring", 30, 5, -40, { r: 2.8 }), G("ring", 30, 4.8, -80, { r: 2.6 }), G("square", 62, 6, -90, { w: 7, h: 5 }), G("hoop", 88, 11, -102, { r: 4 }), G("hoop", 94, 9.6, -124, { r: 3.6 }),
        G("square", 112, 9.25, -128, { w: 6.4, h: 4.6, yaw: -90 }), G("ring", 141, 9.4, -128, { r: 2.6, yaw: -90 }), G("hoop", 152, 26, -124, { r: 4.5 }), G("square", 112, 35.6, -120.2, { w: 8, h: 5, yaw: 90 }),
        G("hoop", 60, 57.5, -60, { r: 4.5 }), G("hoop", 16, 38, -92, { r: 4.5 }), G("square", 0, 27, -60, { w: 9, h: 9, yaw: 180 }), G("hoop", 24, 22, -22, { r: 4 }),
        G("hoop", 72, 30, -26, { r: 4 }), G("square", 90, 32.6, 0, { w: 10, h: 9, yaw: 180 }), G("hoop", 72, 16, 30, { r: 4.5 }),
      ],
    },
  ],
  tracking: [
    { id: "sportscar", name: "스포츠카", type: "sportscar", level: 2, desc: "금융가 북쪽 도로를 질주하는 스포츠카 추적", duration: 80, path: loop(-146.5, 146.5, -146.5, -33.5, 24) },
    { id: "truck", name: "배달 트럭", type: "truck", level: 1, desc: "대관람차와 공연장 둘레를 천천히 도는 배달 트럭", duration: 75, path: loop(33.5, 146.5, 93.5, 206.5, 11) },
    {
      id: "runner", name: "천변 러너", type: "runner", level: 1, desc: "다리 아래 천변 산책로를 달리는 러너를 따라가세요", duration: 75,
      path: [[-110, 0, 50.8, 5], [-40, 0, 50.8, 5.4], [40, 0, 50.8, 5], [120, 0, 50.8, 5.4], [160, 0, 50.8, 5], [172.5, 0, 50.9, 4.4], [174, 0, 53, 4.2], [174, 0, 67, 4.2], [172.5, 0, 69.1, 4.4], [160, 0, 69.2, 5], [120, 0, 69.2, 5.4], [40, 0, 69.2, 5], [-40, 0, 69.2, 5.4], [-110, 0, 69.2, 5], [-122.5, 0, 69.1, 4.4], [-124, 0, 67, 4.2], [-124, 0, 53, 4.2], [-122.5, 0, 50.9, 4.4]],
    },
    {
      id: "boat", name: "천변 유람선", type: "boat", level: 1, desc: "등불 아래 물길을 오가는 유람선을 따라가세요", duration: 80,
      path: [[-100, -5.35, 58.2, 6], [-40, -5.35, 58.2, 6.5], [30, -5.35, 58.2, 6], [100, -5.35, 58.2, 6.5], [150, -5.35, 58.2, 5], [158, -5.35, 60, 3], [150, -5.35, 61.8, 5], [100, -5.35, 61.8, 6.5], [30, -5.35, 61.8, 6], [-40, -5.35, 61.8, 6.5], [-100, -5.35, 61.8, 5], [-108, -5.35, 60, 3]],
    },
    {
      id: "drone", name: "순찰 드론", type: "drone", level: 3, desc: "터널과 스카이브리지, 달맞이 고리를 누비는 순찰 드론을 화면에 담으세요", duration: 80,
      path: [[30, 10, 40, 13], [30, 5.5, -28, 12], [30, 4.6, -60, 12], [33, 7, -89, 10], [70, 7, -93, 13], [99, 10, -80, 12], [98, 24, -34, 11], [90, 32.8, 0, 11], [86, 22, 30, 12], [62, 9, 54, 12], [22, 7.3, 50, 10], [0, 7.3, 60, 9], [4, 7.5, 74, 10], [26, 8.5, 70, 11]],
    },
  ],
  combat: { blue: [-180, 180], red: [180, -180], depots: [[-90, -90], [90, 90], [30, -30], [-30, 30]] },
  convoy: {
    speed: 7.5,
    path: [[-212, 0, 33], [-120, 0, 33], [-42, 0, 33], [-27, 0, 20], [-27, 0, -40], [-27, 0, -80], [-20, 0, -87], [40, 0, -87], [80, 0, -87], [87, 0, -80], [87, 0, -20], [87, 0, 20], [98, 0, 33], [160, 0, 33], [214, 0, 33]],
  },
};
