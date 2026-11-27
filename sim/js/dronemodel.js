// 드론 외형: 프레임·캐노피·프로펠러·LED·스킨을 조합해 절차적으로 만든다 (전방 = -Z)
import * as THREE from "../vendor/three.module.min.js";
import { toonMat } from "./toon.js";
import { FIGHTER_FRAMES, isFighter, buildFighter } from "./fighters.js";
import { addParts } from "./partmodel.js";

export const FRAMES = {
  x: { name: "트루 X", desc: "대칭형 레이싱 프레임" },
  stretch: { name: "스트레치 X", desc: "앞뒤로 긴 고속형" },
  deadcat: { name: "데드캣", desc: "앞 암이 벌어진 촬영형" },
  whoop: { name: "덕트 우프", desc: "프로펠러 가드 일체형" },
  hexa: { name: "헥사콥터", desc: "모터 6개 대형 기체" },
  tri: { name: "트라이콥터", desc: "모터 3개 Y자 기체" },
  ...FIGHTER_FRAMES,
  // ── 추가 프레임 (성능 특성은 garage.js LOOK_FX.frame) ──
  hrace: { name: "H 레이서", desc: "평행한 두 레일에 모터를 단 H자 레이싱 프레임. 공기 저항이 적다" },
  squash: { name: "스쿼시드 X", desc: "옆으로 넓고 앞뒤가 짧은 프레임. 순간 가속이 날카롭다" },
  cinewhoop: { name: "시네우프 덕트", desc: "통 덕트가 프로펠러를 감싼 보호형 촬영 기체" },
  octo: { name: "옥토 X8", desc: "팔마다 위아래로 모터를 겹친 8모터 중량 기체" },
  wedge: { name: "스텔스 웨지", desc: "납작한 쐐기꼴 동체에 모터를 숨긴 저피탐 기체" },
  plus: { name: "플러스 콥터", desc: "앞·뒤·좌·우에 모터를 둔 + 자 정밀 기체" },
  y6: { name: "Y6 코액셜", desc: "Y자 세 팔에 모터 두 개씩, 고장에도 버티는 6모터" },
  lr7: { name: "롱레인지 7인치", desc: "긴 팔과 큰 프로펠러의 장거리 순항형" },
  micro: { name: "마이크로 2.5인치", desc: "작고 가벼운 손바닥 크기. 날래지만 약하다" },
  lowrider: { name: "로우라이더", desc: "모터를 팔 아래에 거꾸로 단 프레임. 프로펠러가 덜 부딪힌다" },
  vtail: { name: "V-테일", desc: "뒤쪽 팔을 V자로 세운 곡예형 프레임" },
};
export const CANOPIES = {
  pod: { name: "유선형 포드", desc: "둥글게 감싼 기본 덮개" },
  racer: { name: "레이싱 캐노피", desc: "뾰족한 오각 쐐기 모양의 레이싱 덮개" },
  battery: { name: "탑 배터리", desc: "배터리를 등에 얹은 실전형 구성" },
  cine: { name: "액션캠 마운트", desc: "앞쪽에 촬영용 액션캠을 단 구성" },
};
export const SKINS = {
  solid: { name: "단색", desc: "프레임색 한 가지로 깔끔하게" }, stripe: { name: "레이싱 스트라이프", desc: "가운데를 가르는 두 줄 레이싱 띠" }, camo: { name: "카모", desc: "얼룩덜룩한 숲 위장 무늬" },
  carbon: { name: "카본", desc: "카본 섬유 직조 무늬, 은은한 광택" }, hazard: { name: "경고 무늬", desc: "공사장 경고 테이프 같은 사선" }, flame: { name: "불꽃", desc: "아래에서 타오르는 핫로드 불꽃" },
  // ── 추가 스킨 ──
  matte: { name: "무광 코팅", desc: "빛 반사를 죽인 무광 도장. 윤곽이 차분하다" },
  chrome: { name: "크롬 미러", desc: "거울처럼 번쩍이는 금속 광택 도금" },
  gradient: { name: "그라데이션", desc: "프레임색에서 포인트색으로 번지는 페이드" },
  neon: { name: "네온 라인", desc: "어두운 차체 위에 스스로 빛나는 네온 줄" },
  digital: { name: "디지털 카모", desc: "픽셀 조각으로 윤곽을 흐리는 군용 위장" },
  checker: { name: "체커 플래그", desc: "결승선 깃발의 흑백 바둑판" },
  tiger: { name: "타이거", desc: "날카롭게 휘는 호랑이 줄무늬" },
  hex: { name: "허니콤", desc: "육각 벌집 구조가 비치는 복합재 무늬" },
  splatter: { name: "페인트 스플래터", desc: "물감을 흩뿌린 스트리트 아트" },
  circuit: { name: "서킷", desc: "기판 회로가 흐르는 사이버 무늬 (회로가 은은히 빛난다)" },
  dazzle: { name: "대즐 위장", desc: "옛 군함의 착시 위장. 방향을 읽기 어렵다" },
};
// 스킨마다 재질 느낌 (광택·림·발광)
const SKIN_MAT = {
  matte: { spec: 0.04, shine: 8, rim: 0.25 },
  chrome: { spec: 1, shine: 150, rim: 0.95, metal: true },
  neon: { glow: 1.6 },
  circuit: { glow: 0.9 },
  carbon: { spec: 0.6, shine: 70, rim: 0.6 },
};
export const LED_MODES = { solid: "항상 켜짐", blink: "점멸", rainbow: "무지개", off: "끄기", breathe: "숨쉬기", police: "경광등", strobe: "스트로브" };
export const COLOR_PRESETS = [
  { name: "오렌지 블레이즈", frameColor: "#1b1f27", accentColor: "#ff5a1f", propColor: "#21d4fd", ledColor: "#3dff7c" },
  { name: "네온 사이버", frameColor: "#14121f", accentColor: "#ff2bd6", propColor: "#00f0ff", ledColor: "#ff2bd6" },
  { name: "스텔스", frameColor: "#101114", accentColor: "#3a3f47", propColor: "#2b2e33", ledColor: "#ff3030" },
  { name: "태극", frameColor: "#f2f2f2", accentColor: "#cd2e3a", propColor: "#0047a0", ledColor: "#ffffff" },
  { name: "포레스트", frameColor: "#263322", accentColor: "#8bc34a", propColor: "#d4e157", ledColor: "#ffeb3b" },
  { name: "골드 러시", frameColor: "#1a1a1a", accentColor: "#ffc400", propColor: "#fff3c4", ledColor: "#ffc400" },
  // ── 추가 색 조합 (garage.js SHOP.preset 6~15) ──
  { name: "아이스 블루", desc: "서리 낀 흰 차체에 얼음빛 파랑", frameColor: "#e6f2ff", accentColor: "#2fa8ff", propColor: "#bfe6ff", ledColor: "#7fd6ff" },
  { name: "블러드 문", desc: "검붉은 차체와 핏빛 포인트", frameColor: "#1a0608", accentColor: "#d1121f", propColor: "#ff6b6b", ledColor: "#ff2020" },
  { name: "사막 폭풍", desc: "모래색 위장에 짙은 갈색 포인트", frameColor: "#c8a46a", accentColor: "#6b4a22", propColor: "#f1d9a6", ledColor: "#ffb347" },
  { name: "민트 초코", desc: "초콜릿 차체에 상큼한 민트", frameColor: "#3b2a20", accentColor: "#6fffd2", propColor: "#b9fff0", ledColor: "#6fffd2" },
  { name: "로열 퍼플", desc: "깊은 보라에 황금 장식", frameColor: "#1d0f33", accentColor: "#ffcc33", propColor: "#a77bff", ledColor: "#c08cff" },
  { name: "해군 회색", desc: "함정 도색의 차분한 회색", frameColor: "#4d5866", accentColor: "#c9d2dc", propColor: "#8a96a3", ledColor: "#ffffff" },
  { name: "선셋", desc: "보랏빛 저녁 하늘과 노을 주황", frameColor: "#2b1a3d", accentColor: "#ff7a59", propColor: "#ffc36b", ledColor: "#ff4fa0" },
  { name: "독성 라임", desc: "어둠 속에서 튀는 형광 라임", frameColor: "#111a0a", accentColor: "#b6ff00", propColor: "#e4ff7a", ledColor: "#b6ff00" },
  { name: "벚꽃", desc: "연분홍 차체에 진달래색 포인트", frameColor: "#fff0f5", accentColor: "#ff8fb8", propColor: "#ffd1e2", ledColor: "#ff6fa5" },
  { name: "구리 스팀펑크", desc: "그을린 가죽색과 구리 광택", frameColor: "#3a2416", accentColor: "#d98b4a", propColor: "#f2c09a", ledColor: "#ffb070" },
];

// 네온·서킷: 빛나는 줄 (발광 맵에도 같은 그림을 쓴다)
function lines(g, skin, col) {
  g.strokeStyle = col; g.fillStyle = col; g.globalAlpha = 1;
  if (skin === "neon") {
    g.lineWidth = 3; for (const x of [22, 64, 106]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
    g.lineWidth = 1.5; for (const x of [30, 98]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  } else {
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.lineWidth = 1.6;
    for (let i = 0; i < 14; i++) {
      let x = Math.floor(r() * 16) * 8, y = Math.floor(r() * 16) * 8;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (k % 2) y += (r() < 0.5 ? -1 : 1) * 16; else x += (r() < 0.5 ? -1 : 1) * 24; g.lineTo(x, y); }
      g.stroke(); g.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
  }
}
function glowTexture(skin, accent) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 128, 128);
  lines(g, skin, accent);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// 격납고 카드용 스킨 견본 (data URL)
export function skinSwatch(skin, base, accent) {
  const t = skinTexture(skin, base, accent);
  if (!t) return null;
  const url = t.image.toDataURL("image/png");
  t.dispose();
  return url;
}

function skinTexture(skin, base, accent) {
  if (skin === "solid") return null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.fillStyle = accent;
  if (skin === "stripe") { g.fillRect(48, 0, 12, 128); g.fillRect(68, 0, 12, 128); }
  else if (skin === "camo") {
    let s = 5;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.35 + r() * 0.5;
      g.beginPath(); g.ellipse(r() * 128, r() * 128, 8 + r() * 18, 5 + r() * 12, r() * 3, 0, 7); g.fill();
    }
  } else if (skin === "carbon") {
    g.globalAlpha = 0.35;
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) if (((x + y) / 8) % 2 === 0) g.fillRect(x, y, 8, 8);
  } else if (skin === "hazard") {
    for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i - 112, 128); g.lineTo(i - 128, 128); g.fill(); }
  } else if (skin === "flame") {
    for (let i = 0; i < 7; i++) {
      const x = i * 20 + 4;
      g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + 2, 70, x + 10, 34 + (i % 3) * 16); g.quadraticCurveTo(x + 16, 80, x + 20, 128); g.fill();
    }
  } else if (skin === "matte") {
    // 무광: 아주 옅은 결만
    g.globalAlpha = 0.06; for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 128, 1);
  } else if (skin === "chrome") {
    // 거울 반사: 밝은 띠가 비스듬히 흐르는 금속 그라데이션
    const gr = g.createLinearGradient(0, 0, 128, 128);
    gr.addColorStop(0, "#f4f8ff"); gr.addColorStop(0.28, base); gr.addColorStop(0.45, "#ffffff"); gr.addColorStop(0.6, base); gr.addColorStop(0.82, "#d6dde8"); gr.addColorStop(1, base);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.globalAlpha = 0.35; g.fillStyle = accent; g.fillRect(0, 60, 128, 4);
  } else if (skin === "gradient") {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, base); gr.addColorStop(1, accent);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  } else if (skin === "neon" || skin === "circuit") {
    g.fillStyle = "#0b0d14"; g.globalAlpha = 0.55; g.fillRect(0, 0, 128, 128); g.globalAlpha = 1;
    lines(g, skin, accent);
  } else if (skin === "digital") {
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { const v = r(); if (v < 0.3) { g.globalAlpha = 0.85; g.fillRect(x, y, 8, 8); } else if (v < 0.45) { g.globalAlpha = 0.4; g.fillRect(x, y, 8, 8); } }
  } else if (skin === "checker") {
    for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) if (((x + y) / 16) % 2 === 0) g.fillRect(x, y, 16, 16);
  } else if (skin === "tiger") {
    for (let i = 0; i < 9; i++) {
      const y = i * 15 + 2, w = 6 + (i % 3) * 3;
      g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(40, y + w * 1.6, 72, y + 2); g.quadraticCurveTo(96, y - 4, 128, y + w); g.lineTo(128, y + w + 3); g.quadraticCurveTo(90, y + 4, 70, y + w + 2); g.quadraticCurveTo(36, y + w * 2.4, 0, y + w); g.fill();
    }
  } else if (skin === "hex") {
    g.strokeStyle = accent; g.lineWidth = 2; g.globalAlpha = 0.7;
    const R = 9, H = R * Math.sqrt(3);
    for (let row = -1; row < 10; row++) for (let col = -1; col < 10; col++) {
      const cx = col * R * 1.5, cy = row * H + (col % 2 ? H / 2 : 0);
      g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2; g[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * R, cy + Math.sin(a) * R); } g.stroke();
    }
  } else if (skin === "splatter") {
    let s = 23;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const cols = [accent, "#ffffff", accent];
    for (let i = 0; i < 40; i++) { g.fillStyle = cols[i % 3]; g.globalAlpha = 0.6 + r() * 0.4; g.beginPath(); g.arc(r() * 128, r() * 128, 1 + r() * (i % 5 ? 4 : 11), 0, 7); g.fill(); }
  } else if (skin === "dazzle") {
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = "#f2f2f2"; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 3 === 2 ? accent : i % 2 ? "#111318" : base; g.beginPath(); g.moveTo(r() * 128, -10); g.lineTo(r() * 128, 140); g.lineTo(r() * 128 + 30, 140); g.lineTo(r() * 128 - 10, -10); g.fill(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 모터 위치(단위: m, 5인치 기준). [x, z]
function motorLayout(frame) {
  switch (frame) {
    case "stretch": return [[-0.075, -0.1], [0.075, -0.1], [-0.075, 0.1], [0.075, 0.1]];
    case "deadcat": return [[-0.115, -0.06], [0.115, -0.06], [-0.07, 0.1], [0.07, 0.1]];
    case "whoop": return [[-0.075, -0.075], [0.075, -0.075], [-0.075, 0.075], [0.075, 0.075]];
    case "hexa": return [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return [Math.cos(a) * 0.14, Math.sin(a) * 0.14]; });
    case "tri": return [[-0.1, -0.07], [0.1, -0.07], [0, 0.12]];
    // 추가 프레임: 세 번째 값 = { y: 모터 높이, inv: 팔 아래 거꾸로, coax: 위아래 겹침, tilt: 옆 기울기 }
    case "hrace": return [[-0.095, -0.09], [0.095, -0.09], [-0.095, 0.09], [0.095, 0.09]];
    case "squash": return [[-0.108, -0.066], [0.108, -0.066], [-0.108, 0.066], [0.108, 0.066]];
    case "cinewhoop": return [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]];
    case "octo": return [[-0.1, -0.1, { coax: 1 }], [0.1, -0.1, { coax: 1 }], [-0.1, 0.1, { coax: 1 }], [0.1, 0.1, { coax: 1 }]];
    case "wedge": return [[-0.078, -0.07], [0.078, -0.07], [-0.105, 0.085], [0.105, 0.085]];
    case "plus": return [[0, -0.13], [0.12, 0], [0, 0.13], [-0.12, 0]];
    case "y6": return [[-0.11, -0.065, { coax: 1 }], [0.11, -0.065, { coax: 1 }], [0, 0.13, { coax: 1 }]];
    case "lr7": return [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]];
    case "micro": return [[-0.062, -0.062], [0.062, -0.062], [-0.062, 0.062], [0.062, 0.062]];
    case "lowrider": return [[-0.09, -0.085, { inv: 1 }], [0.09, -0.085, { inv: 1 }], [-0.09, 0.085, { inv: 1 }], [0.09, 0.085, { inv: 1 }]];
    case "vtail": return [[-0.1, -0.08], [0.1, -0.08], [-0.07, 0.1, { y: 0.03, tilt: 0.45 }], [0.07, 0.1, { y: 0.03, tilt: -0.45 }]];
    default: return [[-0.085, -0.085], [0.085, -0.085], [-0.085, 0.085], [0.085, 0.085]];
  }
}

// 프레임별 프로펠러 반지름 · 중앙 동체 길이/폭
const PROP_R = { whoop: 0.05, hexa: 0.058, cinewhoop: 0.05, octo: 0.06, plus: 0.055, y6: 0.062, lr7: 0.085, micro: 0.038, squash: 0.06 };
const BODY = { stretch: [0.17, 0.045], hexa: [0.12, 0.1], hrace: [0.2, 0.05], squash: [0.12, 0.06], cinewhoop: [0.11, 0.05], octo: [0.14, 0.07], wedge: [0.16, 0.05], plus: [0.12, 0.05], y6: [0.13, 0.06], lr7: [0.17, 0.05], micro: [0.1, 0.034], vtail: [0.16, 0.045] };

// 전투기형 프레임의 파츠 부착점 (partmodel.js 참고). plates 는 [x, y, z, ry, len]
const FIGHTER_ANCHORS = {
  raptor: { laser: [0, -0.007, -0.1], pods: [0.06, -0.011, 0.03], belly: [0, -0.012, 0.05], sensor: [0, 0.029, 0], shield: [0.148, 0.009, 0.085], cooler: [0.016, 0.025, 0.09], plates: [[0.045, 0.0105, 0.085, 0, 0.05], [-0.045, 0.0105, 0.085, 0, 0.05]], nose: [0, 0.024, -0.13] },
  viper: { laser: [0, -0.006, -0.13], pods: [0.07, 0, 0.07], belly: [0, -0.011, 0.04], sensor: [0, 0.031, -0.035], shield: [0.076, 0.016, -0.078], cooler: [0.02, 0.014, 0.125], plates: [[0.05, 0.0135, 0.075, 0, 0.045], [-0.05, 0.0135, 0.075, 0, 0.045]], nose: [0, 0.026, -0.15] },
  phantom: { laser: [0, -0.004, -0.1], pods: [0.05, -0.005, 0.03], belly: [0, -0.005, 0], sensor: [0, 0.023, 0.03], shield: [0.176, 0.012, 0.055], cooler: [0.022, 0.013, 0.058], plates: [[0.04, 0.0145, -0.06, 0.76, 0.05], [-0.04, 0.0145, -0.06, -0.76, 0.05]], nose: [0, 0.016, -0.12] },
  cross: { laser: [0, -0.012, -0.1], pods: [0.032, 0.004, -0.03], belly: [0, -0.018, 0.03], sensor: [0, 0.033, -0.02], shield: [0.125, 0.012, 0.05], cooler: [0.02, 0.022, 0.06], plates: [[0.014, 0.03, -0.04, 0, 0.05], [-0.014, 0.03, -0.04, 0, 0.05]], nose: [0, 0.03, -0.12] },
};

// look: settings.drone 형태. 반환 Group 의 userData.tick(dt, thrust, time) 로 프로펠러·LED 를 움직인다
// opts.parts: 장착 파츠 { slot: { v, lv } } (garage.partLook) 를 주면 부품 형상을 붙인다 (플레이어 기체)
export function buildDrone(look, scale = 1, opts = {}) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  g.scale.setScalar(scale);
  root.add(g);

  const tex = skinTexture(look.skin, look.frameColor, look.accentColor);
  // 툰 재질: 또렷한 하이라이트와 림 라이트로 작은 기체도 윤곽이 읽히게 한다
  const SM = SKIN_MAT[look.skin] || {}, glowTex = SM.glow ? glowTexture(look.skin, look.accentColor) : null;
  const frameMat = toonMat({ color: tex ? 0xffffff : look.frameColor, map: tex, spec: SM.spec ?? 0.45, shine: SM.shine ?? 40, rim: SM.rim ?? 0.55, metal: !!SM.metal,
    ...(glowTex ? { emissive: new THREE.Color(1, 1, 1).multiplyScalar(SM.glow), emissiveMap: glowTex } : {}) });
  const accentMat = toonMat({ color: look.accentColor, spec: 0.65, shine: 60, rim: 0.6 });
  const darkMat = toonMat({ color: 0x242830, spec: 0.4, shine: 30, rim: 0.45 });
  const propMat = toonMat({ color: look.propColor, transparent: true, opacity: 0.95 });
  const discMat = new THREE.MeshBasicMaterial({ color: look.propColor, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
  const ledMat = new THREE.MeshBasicMaterial({ color: look.ledColor });
  const lensMat = toonMat({ color: 0x0c0c18, spec: 1, shine: 90 });
  const extraMats = [];
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };

  const frame = look.frame || "x";
  const fighter = isFighter(frame);
  let motors = motorLayout(frame), propR = PROP_R[frame] || 0.0635;
  const props = [];
  let F = null;
  if (fighter) {
    // 전투기형: 동체·날개·꼬리날개 + 덕트 팬
    const glassMat = toonMat({ color: new THREE.Color(0x7fd6ff).lerp(new THREE.Color(look.ledColor), 0.25).multiplyScalar(0.55), spec: 1, shine: 140, rim: 1 });
    const metalMat = toonMat({ color: 0x9aa3b2, spec: 0.9, shine: 80, rim: 0.5 });
    const frameIn = frameMat.clone(); frameIn.side = THREE.DoubleSide;
    const darkIn = darkMat.clone(); darkIn.side = THREE.DoubleSide;
    extraMats.push(glassMat, metalMat, frameIn, darkIn);
    F = buildFighter(frame, add, { frame: frameMat, frameIn, accent: accentMat, dark: darkMat, darkIn, metal: metalMat, led: ledMat, glass: glassMat });
    motors = F.motors; propR = F.propR;
    motors.forEach((m, i) => {
      const [mx, mz] = m, my = m[2] ?? F.motorY;
      // 덕트 + 모터 + 팬
      const r = propR;
      const wall = add(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.016, 22, 1, true), frameIn, mx, my, mz);
      const lip = add(new THREE.TorusGeometry(r + 0.004, 0.0035, 6, 26), accentMat, mx, my + 0.008, mz); lip.rotation.x = Math.PI / 2;
      const lo = add(new THREE.TorusGeometry(r + 0.004, 0.0025, 6, 26), darkMat, mx, my - 0.008, mz); lo.rotation.x = Math.PI / 2;
      for (let k = 0; k < 2; k++) { const st = add(new THREE.BoxGeometry(r * 2, 0.002, 0.003), darkMat, mx, my - 0.005, mz); st.rotation.y = k * Math.PI / 2 + Math.PI / 4; }
      add(new THREE.CylinderGeometry(0.009, 0.01, 0.01, 12), darkMat, mx, my - 0.002, mz);
      add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.002, 12), accentMat, mx, my + 0.004, mz);
      const hub = new THREE.Group(); hub.position.set(mx, my + 0.005, mz);
      const n = look.props === 2 ? 2 : 3, nb = n + 2;      // 덕트 팬은 날개를 더 촘촘히
      for (let b = 0; b < nb; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(r * 0.95, 0.0015, 0.009), propMat);
        blade.position.x = r * 0.48; blade.rotation.x = 0.3;
        const piv = new THREE.Group(); piv.rotation.y = (b / nb) * Math.PI * 2; piv.add(blade); hub.add(piv);
      }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 20), discMat); disc.rotation.x = -Math.PI / 2; disc.position.set(mx, my + 0.006, mz);
      g.add(hub, disc);
      props.push({ hub, dir: i % 2 ? 1 : -1 });
    });
  }

  // 중앙 플레이트
  const [bodyLen, bodyW] = BODY[frame] || [0.15, 0.045];
  if (!fighter) {
  if (frame === "wedge") {
    // 쐐기꼴 동체: 앞이 뾰족한 납작 삼각판 두 겹 + 등줄
    const sh = new THREE.Shape(); sh.moveTo(0, -0.12); sh.lineTo(0.1, 0.1); sh.lineTo(-0.1, 0.1); sh.closePath();
    const wg = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); wg.rotateX(Math.PI / 2); wg.translate(0, 0.003, 0);
    add(wg, frameMat, 0, 0, 0);
    const top = add(wg, frameMat, 0, 0.02, 0.01); top.scale.set(0.62, 1, 0.62);
    add(new THREE.BoxGeometry(0.006, 0.006, 0.17), accentMat, 0, 0.026, 0.0);
  } else {
    add(new THREE.BoxGeometry(bodyW, 0.006, bodyLen), frameMat, 0, 0, 0);
    add(new THREE.BoxGeometry(bodyW * 0.9, 0.005, bodyLen * 0.92), frameMat, 0, 0.026, 0);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.003, 0.003, 0.026, 6), accentMat, sx * bodyW * 0.38, 0.013, sz * bodyLen * 0.4);
  if (frame === "hrace") for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.008, 0.2), frameMat, sx * 0.042, 0, 0);   // H 레일
  const ductIn = frame === "cinewhoop" ? frameMat.clone() : null;
  if (ductIn) { ductIn.side = THREE.DoubleSide; extraMats.push(ductIn); }

  // 암 + 모터 + 프로펠러 (모터마다 작은 그룹: 높이·기울기·겹침을 그 안에서 처리)
  motors.forEach(([mx, mz, o = {}], i) => {
    const my = o.y || 0;
    // 팔: H 레일은 레일 끝에서, 나머지는 중심에서 모터까지
    const fx = frame === "hrace" ? Math.sign(mx) * 0.042 : 0, fz = frame === "hrace" ? mz : 0;
    const dx = mx - fx, dz = mz - fz, len = Math.hypot(dx, dz);
    const aw = frame === "lr7" ? 0.016 : frame === "micro" ? 0.009 : frame === "octo" ? 0.018 : 0.014;
    const arm = add(new THREE.BoxGeometry(aw, 0.005, Math.hypot(len, my)), frameMat, (mx + fx) / 2, my / 2, (mz + fz) / 2);
    arm.rotation.order = "YXZ"; arm.rotation.y = Math.atan2(dx, dz); arm.rotation.x = -Math.atan2(my, len);
    const mg = new THREE.Group(); mg.position.set(mx, my, mz); mg.rotation.z = o.tilt || 0; g.add(mg);
    const put = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; mg.add(m); return m; };
    const mr = frame === "micro" ? 0.009 : 0.013;
    // up = 1: 팔 위 정방향, -1: 팔 아래 거꾸로
    const unit = (up, k) => {
      put(new THREE.CylinderGeometry(mr, mr + 0.001, 0.018, 12), darkMat, 0, up * 0.012 - (up < 0 ? 0.004 : 0), 0);
      put(new THREE.CylinderGeometry(mr + 0.001, mr + 0.001, 0.004, 12), accentMat, 0, up > 0 ? 0.022 : -0.026, 0);
      const hub = new THREE.Group();
      hub.position.set(0, up > 0 ? 0.028 : -0.032, 0);
      const n = look.props === 2 ? 2 : 3;
      for (let b = 0; b < n; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(propR, 0.0015, propR > 0.07 ? 0.016 : 0.013), propMat);
        blade.position.x = propR / 2;
        const piv = new THREE.Group();
        piv.rotation.y = (b / n) * Math.PI * 2;
        blade.rotation.x = 0.25;
        piv.add(blade);
        hub.add(piv);
      }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(propR, 20), discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(0, up > 0 ? 0.029 : -0.031, 0);
      mg.add(hub, disc);
      props.push({ hub, dir: (i + k) % 2 ? 1 : -1 });
    };
    if (!o.inv || o.coax) unit(1, 0);
    if (o.inv || o.coax) unit(-1, 1);
    if (frame === "whoop") {
      const duct = put(new THREE.TorusGeometry(propR + 0.006, 0.006, 6, 20), accentMat, 0, 0.026, 0);
      duct.rotation.x = Math.PI / 2;
      const duct2 = put(new THREE.TorusGeometry(propR + 0.006, 0.004, 6, 20), frameMat, 0, 0.012, 0);
      duct2.rotation.x = Math.PI / 2;
    } else if (ductIn) {
      // 시네우프: 높은 통 덕트 + 위아래 테 + 십자 가드
      put(new THREE.CylinderGeometry(propR + 0.006, propR + 0.008, 0.03, 22, 1, true), ductIn, 0, 0.02, 0);
      for (const [y, t] of [[0.035, 0.004], [0.005, 0.005]]) { const r = put(new THREE.TorusGeometry(propR + 0.007, t, 6, 22), accentMat, 0, y, 0); r.rotation.x = Math.PI / 2; }
      for (let k = 0; k < 2; k++) { const st = put(new THREE.BoxGeometry((propR + 0.006) * 2, 0.002, 0.003), darkMat, 0, 0.036, 0); st.rotation.y = k * Math.PI / 2 + Math.PI / 4; }
    } else if (frame === "lowrider") {
      // 거꾸로 단 프로펠러 아래 보호 고리
      const r = put(new THREE.TorusGeometry(propR + 0.004, 0.0025, 5, 22), accentMat, 0, -0.036, 0); r.rotation.x = Math.PI / 2;
    }
    // 암 끝 LED
    add(new THREE.BoxGeometry(0.012, 0.004, 0.006), ledMat, mx * 0.82, my * 0.82 - 0.005, mz * 0.82);
  });
  if (frame === "tri") add(new THREE.BoxGeometry(0.01, 0.03, 0.04), accentMat, 0, 0.02, 0.15); // 꼬리 서보 핀
  if (frame === "squash") for (const sx of [-1, 1]) { const w = add(new THREE.BoxGeometry(0.05, 0.003, 0.02), accentMat, sx * 0.05, 0.004, -0.07); w.rotation.y = sx * 0.4; }   // 앞 스포일러
  if (frame === "octo") { add(new THREE.BoxGeometry(0.05, 0.01, 0.05), darkMat, 0, -0.012, 0.0); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.004, 0.03, 0.004), darkMat, sx * 0.03, -0.026, 0); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.004, 0.004, 0.12), accentMat, sx * 0.03, -0.041, 0); }   // 착륙 다리
  if (frame === "vtail") { const fin = add(new THREE.BoxGeometry(0.004, 0.03, 0.035), accentMat, 0, 0.03, 0.08); fin.rotation.x = -0.3; }
  if (frame === "lr7") { add(new THREE.CylinderGeometry(0.0012, 0.0012, 0.07, 5), darkMat, 0.02, 0.05, 0.07).rotation.z = -0.4; add(new THREE.BoxGeometry(0.03, 0.012, 0.04), darkMat, 0, -0.012, 0.03); }   // 장거리 안테나 · GPS
  if (frame === "micro") for (const [mx, mz] of motors) { const r = add(new THREE.TorusGeometry(propR + 0.004, 0.0025, 5, 18), frameMat, mx, 0.026, mz); r.rotation.x = Math.PI / 2; }

  // 캐노피
  const cy = 0.03;
  switch (look.canopy) {
    case "racer": {
      const c = add(new THREE.ConeGeometry(0.03, 0.11, 5), accentMat, 0, cy + 0.012, -0.01);
      c.rotation.x = -Math.PI / 2; c.scale.set(1, 1, 0.55);
      break;
    }
    case "battery": {
      add(new THREE.BoxGeometry(0.036, 0.03, 0.085), darkMat, 0, cy + 0.016, 0.01);
      add(new THREE.BoxGeometry(0.04, 0.004, 0.02), accentMat, 0, cy + 0.032, 0.01);
      break;
    }
    case "cine": {
      add(new THREE.BoxGeometry(0.04, 0.02, 0.07), frameMat, 0, cy + 0.01, 0.02);
      add(new THREE.BoxGeometry(0.045, 0.034, 0.03), darkMat, 0, cy + 0.03, -0.04);
      const l = add(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 12), lensMat, 0, cy + 0.032, -0.058);
      l.rotation.x = Math.PI / 2;
      break;
    }
    default: {
      const c = add(new THREE.SphereGeometry(0.03, 14, 10), accentMat, 0, cy + 0.004, 0);
      c.scale.set(0.8, 0.62, 2.1);
    }
  }
  }
  // FPV 카메라 + 안테나
  let tail;
  if (fighter) {
    // 기수 아래 FPV 카메라 렌즈, 등 안테나 둘
    const [nx, ny, nz] = F.nose;
    const lens = add(new THREE.CylinderGeometry(0.006, 0.006, 0.01, 10), lensMat, nx, ny - 0.006, nz + 0.03); lens.rotation.x = Math.PI / 2 - 0.3;
    for (const s of [-1, 1]) { const a = add(new THREE.CylinderGeometry(0.001, 0.001, 0.035, 4), darkMat, s * 0.01, 0.04, F.bodyLen * 0.2); a.rotation.x = -0.6; a.rotation.z = s * 0.3; }
    tail = F.tail;
  } else {
  const camBox = add(new THREE.BoxGeometry(0.02, 0.02, 0.016), darkMat, 0, 0.016, -bodyLen / 2 - 0.004);
  camBox.rotation.x = 0.45;
  const lens = add(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 10), lensMat, 0, 0.02, -bodyLen / 2 - 0.014);
  lens.rotation.x = Math.PI / 2 - 0.45;
  const ant = add(new THREE.CylinderGeometry(0.0012, 0.0012, 0.07, 5), darkMat, 0, 0.05, bodyLen / 2);
  ant.rotation.x = -0.5;
  add(new THREE.SphereGeometry(0.006, 8, 6), accentMat, 0, 0.082, bodyLen / 2 + 0.018);
  // 후방 LED 바
  tail = add(new THREE.BoxGeometry(bodyW * 0.9, 0.008, 0.004), ledMat, 0, 0.013, bodyLen / 2 + 0.002);
  }

  // 장착 파츠 형상 (플레이어 기체): 프레임마다 정해 둔 부착점에 붙인다
  let partTicks = [];
  if (opts.parts) {
    const metal = toonMat({ color: 0x9aa3b2, spec: 0.9, shine: 80, rim: 0.5 }), frameIn = frameMat.clone(), darkIn = darkMat.clone();
    frameIn.side = darkIn.side = THREE.DoubleSide;
    extraMats.push(metal, frameIn, darkIn);
    const A = fighter
      ? { ...(FIGHTER_ANCHORS[frame] || FIGHTER_ANCHORS.raptor), motors: motors.map((m) => [m[0], (m[2] ?? F.motorY) - 0.002, m[1]]), mr: 0.0095, bw: 0.04 }
      : { laser: [0, -0.011, -bodyLen / 2 + 0.012], pods: [bodyW / 2 + 0.014, -0.012, 0.012], belly: [0, -0.012, 0.035], sensor: [-(bodyW / 2 + 0.005), 0.0235, -bodyLen * 0.2],
        shield: [bodyW / 2 + 0.005, 0.013, 0], cooler: [bodyW / 2 + 0.005, 0.012, bodyLen / 2 - 0.014],
        plates: motors.map(([mx, mz]) => [mx * 0.55, 0.0045, mz * 0.55, Math.atan2(mx, mz), Math.hypot(mx, mz) * 0.4]), nose: [0, 0.006, -bodyLen / 2 - 0.002],
        motors: motors.map(([mx, mz, o = {}]) => [mx, (o.y || 0) + (o.inv ? -0.008 : 0.012), mz]), mr: frame === "micro" ? 0.0095 : 0.0135, bw: bodyW + 0.012 };
    partTicks = addParts(add, { frame: frameMat, accent: accentMat, dark: darkMat, led: ledMat, metal, frameIn, darkIn }, A, opts.parts);
  }

  // 적/아군 식별용 발광 고리(전투 모드)
  let halo = null;
  if (opts.halo) {
    halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.halo).multiplyScalar(2.2) }));
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  let spin = 0;
  const ledBase = new THREE.Color(look.ledColor).multiplyScalar(2.6);
  root.userData.tick = (dt, thrust = 0.3, time = 0) => {
    const w = 25 + thrust * 190;
    spin += w * dt;
    for (const p of props) p.hub.rotation.y = spin * p.dir;
    // 회전이 빠를수록 블레이드는 흐려지고 원판이 보인다
    const blur = Math.min(1, Math.max(0, (w - 40) / 90));
    propMat.opacity = 0.95 - blur * 0.75;
    propMat.depthWrite = blur < 0.5;   // 흐려진 블레이드에는 외곽선이 생기지 않게 깊이를 쓰지 않는다
    discMat.opacity = blur * 0.22;
    const mode = look.ledMode || "solid";
    if (mode === "off") ledMat.color.setRGB(0.03, 0.03, 0.03);
    else if (mode === "blink") ledMat.color.copy(ledBase).multiplyScalar(Math.sin(time * 9) > 0 ? 1 : 0.08);
    else if (mode === "rainbow") ledMat.color.setHSL((time * 0.4) % 1, 1, 0.55).multiplyScalar(2.6);
    else if (mode === "breathe") ledMat.color.copy(ledBase).multiplyScalar(0.12 + 0.88 * (0.5 + 0.5 * Math.sin(time * 2.6)) ** 2);
    else if (mode === "police") { const k = Math.floor(time * 6) % 4; ledMat.color.setRGB(k < 2 ? 2.6 : 0.05, 0.05, k < 2 ? 0.05 : 2.6); }
    else if (mode === "strobe") ledMat.color.copy(ledBase).multiplyScalar((time * 4) % 1 < 0.12 ? 1.6 : 0.04);
    else ledMat.color.copy(ledBase);
    for (const f of partTicks) f(dt, time);
  };
  root.userData.tail = tail;
  if (!opts.parts) root.userData.anim = props.map((p) => p.hub);   // 따로 움직이는 노드 (mergemodel.js 가 나머지 부품을 합친다)
  root.userData.dispose = () => {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of [frameMat, accentMat, darkMat, propMat, discMat, ledMat, lensMat, ...extraMats]) m.dispose();
    if (tex) tex.dispose();
    if (glowTex) glowTex.dispose();
    if (halo) halo.material.dispose();
  };
  return root;
}

// AI 드론용 외형(팀 색상별)
export function botLook(kind, team) {
  const red = team !== 0;
  const base = {
    frame: "x", canopy: "racer", props: 3, skin: "solid", ledMode: "blink",
    frameColor: red ? "#2a1114" : "#101b2e", accentColor: red ? "#ff2d3d" : "#2f8cff",
    propColor: red ? "#ff7a7a" : "#8ec5ff", ledColor: red ? "#ff2020" : "#40a0ff",
  };
  // 전투 드론은 전투기형 프레임: 일반=랩터, 자폭=크로스윙, 건쉽=팬텀, 보스=팬텀(보라), 레이서=바이퍼
  if (kind === "kamikaze") return { ...base, frame: "cross", canopy: "pod", accentColor: "#ffb300", ledColor: "#ffb300", ledMode: "blink" };
  if (kind === "gunship") return { ...base, frame: "phantom", canopy: "battery", skin: "hazard" };
  if (kind === "boss") return { ...base, frame: "phantom", canopy: "cine", skin: "carbon", accentColor: "#b000ff", ledColor: "#ff00d0", ledMode: "rainbow" };
  if (kind === "racer") return { ...base, frame: "viper", canopy: "racer" };
  if (kind === "grunt" || kind === "ace") return { ...base, frame: "raptor" };
  return base;
}
