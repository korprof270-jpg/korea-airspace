// 맵: 단풍 고궁 — 가을 한낮의 옛 궁궐과 한옥 마을 (가상의 장소)
//  · 가운데 축: 마을 어귀 → 해오름문(남문) → 금천 돌다리 → 밝음문 → 조정 마당 → 정전 하늘마루전 → 침전 → 북문 → 홍살문 → 뒷산 노을정
//  · 서쪽: 연못과 달못루(돌기둥 누각), 생활 구역     · 동쪽: 숨은뜰(월문·시내·정자), 탑마당(오층석탑·새벽종각·천 년 은행나무)
//  · 성 밖: 순환로, 서쪽 활터(청), 동쪽 큰북 마당(홍), 남쪽 한옥 마을과 장터, 황금 들녘
import * as THREE from "../../vendor/three.module.min.js";
import { sm } from "./palace-kit.js";
import { walls, court, throne, quarters, living } from "./palace-court.js";
import { pond, outer, garden, temple, hill, fields } from "./palace-garden.js";
import { village } from "./palace-village.js";
import { life } from "./palace-life.js";

// ── 지형: 평지 + 뒷산 세 봉우리 + 먼 산, 연못·수로·시내는 파낸다 ──
const segD = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineD = (x, z, P) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segD(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); return d; };
const GS = [[100, -126], [100, -112], [96, -95], [104, -78], [98, -62], [93, -50]];     // 숨은뜰 시내
const ES = [[150, 89], [190, 100], [246, 106]];                                          // 성 밖 동쪽 냇물
export function height(x, z) {
  const b = (cx, cz, rx, rz, H) => { const u = (x - cx) / rx, v = (z - cz) / rz, r2 = u * u + v * v; return r2 < 1 ? H * (1 - r2) * (1 - r2) : 0; };
  let h = b(10, -205, 150, 65, 42) + b(-150, -185, 80, 48, 22) + b(160, -175, 70, 40, 18);
  if (h > 0) h += (Math.sin(x * 0.09 + 1) * Math.sin(z * 0.11) + 0.5 * Math.sin(x * 0.21 + z * 0.17)) * Math.min(1.5, h * 0.1);
  const d = Math.max(Math.abs(x), Math.abs(z));
  if (d > 248) h += 82 * sm(248, 440, d) * (0.6 + 0.4 * Math.sin(x * 0.013 + 1.3) * Math.sin(z * 0.011 + 0.4)) + 6 * sm(248, 300, d) * (1 + Math.sin(x * 0.05) * Math.sin(z * 0.045));
  if (h > 0.4) return h;
  // 연못(네모)과 섬
  const px = Math.abs(x + 90) - 24, pz = Math.abs(z - 38) - 32, sd = px > 0 && pz > 0 ? Math.hypot(px, pz) : Math.max(px, pz);
  h += (-3.2 - h) * (1 - sm(0.5, 3.8, sd));
  // 금천(돌 수로): 어도 둑다리 자리는 메운다
  if (!(Math.abs(x) < 7.5 && Math.abs(z - 88) < 12)) h = Math.min(h, -2.6 * (1 - sm(3.8, 7.0, Math.min(segD(x, z, -90, 88, 131, 88), segD(x, z, -90, 70, -90, 88)))));
  h += (0.45 - h) * (1 - sm(4.5, 7.5, Math.hypot(x + 90, z - 56)));
  // 숨은뜰 못과 시내, 성 밖 냇물
  h = Math.min(h, -2.4 * (1 - sm(9.5, 13.5, Math.hypot(x - 92, z + 42))), -2.2 * (1 - sm(2.2, 5.5, lineD(x, z, GS))), -2.4 * (1 - sm(2.6, 6.5, lineD(x, z, ES))));
  return h;
}
const _c = new THREE.Color(), _c2 = new THREE.Color();
function colorFn(x, y, z, slope) {
  const n = Math.sin(x * 0.05 + z * 0.03) * Math.sin(z * 0.045 - x * 0.02), n2 = Math.sin(x * 0.19 + 2) * Math.sin(z * 0.17 + 1);
  if (y < -0.9) return _c.set(0x6a7458);
  if (y > 1.2) {
    // 산: 단풍 든 숲 바닥(주황·황토·붉은 갈색 얼룩)
    const k = Math.floor((n * 0.5 + 0.5) * 3.99), far = Math.max(Math.abs(x), Math.abs(z)) > 250;
    _c.set([0xb9772c, 0xa8903a, 0xc0562a, 0xcf9a2e][k]).lerp(_c2.set(far ? 0x9a5a2a : 0x8f8a3c), 0.35 + n2 * 0.2);
    if (slope > 0.3) _c.lerp(_c2.set(0xb0a48e), 0.7);
    return _c;
  }
  _c.set(0xa7a04c).lerp(_c2.set(0xc2a548), 0.5 + n * 0.5).multiplyScalar(0.96 + n2 * 0.07);
  if (slope > 0.2) _c.lerp(_c2.set(0xb9b09c), 0.8);
  return _c;
}

function build(w) {
  w.terrain(height, colorFn, { flat: "grass", flatTint: "1.06, 1.0, 0.86", rockTint: "1.02, 0.95, 0.84", rockLo: 0.3, rockHi: 0.55 });
  w.water(-1.0, 0x2f6f6c);
  walls(w); court(w); throne(w); quarters(w); living(w);
  pond(w); outer(w); garden(w); temple(w);
  hill(w); fields(w); village(w);
  life(w);
}

const G = (t, x, y, z, o = {}) => ({ t, p: [x, y, z], ...o });
const PY = height(10, -205), BY = height(-150, -185);
// 도로를 따라 도는 둥근 사각 경로(지상 피사체용)
function loop(x0, x1, z0, z1, v, c = 12) {
  const vs = v * 0.5;
  return [
    [x0 + c, 0, z0, vs], [(x0 + x1) / 2, 0, z0, v], [x1 - c, 0, z0, vs], [x1, 0, z0 + c, vs], [x1, 0, (z0 + z1) / 2, v], [x1, 0, z1 - c, vs],
    [x1 - c, 0, z1, vs], [(x0 + x1) / 2, 0, z1, v], [x0 + c, 0, z1, vs], [x0, 0, z1 - c, vs], [x0, 0, (z0 + z1) / 2, v], [x0, 0, z0 + c, vs],
  ];
}

export default {
  id: "palace",
  name: "단풍 고궁",
  desc: "가을 한낮의 옛 궁궐. 성문 홍예와 회랑, 연못 위 돌기둥 누각, 월문 정원과 석탑, 단풍 든 뒷산과 한옥 골목을 누비는 비행",
  size: 230,
  ceiling: 150,
  seed: 1392,
  env: {
    sky: { top: 0x3f86d8, horizon: 0xf8e2bc, bottom: 0xc9b48c }, sunDir: [-0.5, 0.56, 0.52], sunColor: 0xffe6b8, sun: 3.2,
    hemi: 0.5, hemiSky: 0xcfe0ff, hemiGround: 0xa58a5c, cloud: 0.42, cloudLit: 0xfffaf0, cloudDark: 0xb8b4c4,
    fog: { color: 0xf0dfc2, near: 260, far: 1700 }, glow: 1.6, exposure: 1.0,
  },
  spawn: { pos: [0, 0.4, 160], yaw: 0 },
  thumb: { pos: [-64, 34, 176], look: [0, 9, -10] },
  build,
  tracks: [
    {
      id: "royal", name: "어도 순례", level: 1, laps: 3, desc: "해오름문 홍예를 지나 돌다리와 밝음문, 조정 마당을 거쳐 동문으로 나와 성 밖 길로 돌아오는 넓고 쉬운 코스",
      gates: [
        G("flag", 5, 0, 127, { w: 8 }), G("square", 0, 3.4, 103, { w: 6, h: 5, yaw: 0 }), G("ring", 0, 3.3, 88, { r: 2.8, yaw: 0 }), G("square", 0, 2.9, 76, { w: 5.6, h: 4, yaw: 0 }),
        G("hoop", 0, 4.6, 40, { r: 4.5 }), G("square", 55, 2.6, 40, { w: 7, h: 3.4, yaw: -90 }), G("ring", 92, 3.4, 40, { r: 3, yaw: -90 }), G("square", 125, 3.0, 40, { w: 4.8, h: 4.2, yaw: -90 }),
        G("hoop", 147, 5, 60, { r: 4.5 }), G("hoop", 142, 6, 108, { r: 4.5 }), G("square", 84, 4, 129, { w: 7, h: 5 }), G("ring", 36, 4, 130, { r: 3 }),
      ],
    },
    {
      id: "pond", name: "회랑과 달못", level: 2, laps: 2, desc: "서회랑 터널을 끝까지 달리고 복도각 아래를 지나, 달못루 돌기둥 사이와 무지개다리 밑 수로를 꿰는 기술 코스",
      gates: [
        G("square", -40, 3, 44, { w: 6, h: 4 }), G("ring", -55, 2.5, 30, { r: 1.9, yaw: 0 }), G("ring", -55, 2.5, 10, { r: 1.9, yaw: 0 }), G("ring", -55, 2.5, -20, { r: 1.9, yaw: 0 }),
        G("ring", -55, 2.5, -50, { r: 1.9, yaw: 0 }), G("hoop", -50, 4.5, -72, { r: 3.5 }), G("hoop", -47, 4.5, -97, { r: 3.2 }), G("hoop", -30, 3.6, -99, { r: 3 }),
        G("square", -23.5, 1.85, -82, { w: 5.4, h: 2.4, yaw: 180 }), G("hoop", -36, 7, -56, { r: 4 }), G("hoop", -42, 5, -20, { r: 4 }), G("hoop", -56, 10.5, -6, { r: 4 }),
        G("hoop", -78, 6.5, 3, { r: 3.5 }), G("square", -87, 2.0, 30, { w: 4, h: 4.6, yaw: 180 }), G("hoop", -80, 4, 56, { r: 3.2 }), G("hoop", -70, 3.5, 74, { r: 3 }),
        G("ring", -52, 0.7, 88, { r: 1.7, yaw: -90 }), G("square", -32, 0.5, 88, { w: 5.2, h: 2.2, yaw: -90 }), G("hoop", -14, 4.6, 84, { r: 3.5 }), G("square", 7.33, 2.7, 66, { w: 4.4, h: 3.4, yaw: 0 }),
        G("hoop", -8, 5, 48, { r: 4.5 }),
      ],
    },
    {
      id: "village", name: "한옥 골목 대시", level: 2, loop: false, desc: "등불 큰길과 좁은 골목을 빠져나와 해오름문 서협과 밝음문을 지나 정전을 관통하는 구간 주행",
      start: { pos: [-212, 0.4, 180], yaw: -90 },
      gates: [
        G("hoop", -190, 3, 180, { r: 3 }), G("ring", -154, 3, 180, { r: 2.2 }), G("hoop", -118, 3, 180, { r: 3 }), G("hoop", -78, 4, 180, { r: 3 }),
        G("ring", -73.6, 3.2, 169, { r: 1.9, yaw: 0 }), G("ring", -73.5, 2.6, 148, { r: 1.9, yaw: 0 }), G("hoop", -66, 4, 131.5, { r: 3.5 }), G("hoop", -36, 4, 128.5, { r: 3.5 }),
        G("hoop", -11, 3.5, 123, { r: 3 }), G("square", -10.5, 2.7, 110, { w: 3.8, h: 4.2, yaw: 0 }), G("hoop", -10, 4.5, 88, { r: 3.5 }), G("square", -7.33, 2.7, 66, { w: 4.4, h: 3.4, yaw: 0 }),
        G("hoop", -16, 6, 30, { r: 4.5 }), G("square", -6.8, 7.1, -20.5, { w: 4.6, h: 5, yaw: 0 }), G("square", -6.8, 7.1, -40, { w: 4.6, h: 5, yaw: 0 }), G("hoop", -12, 8, -64, { r: 4 }),
      ],
    },
    {
      id: "rampart", name: "성곽 일주", level: 3, laps: 2, desc: "문루와 각루를 꿰며 성벽 위를 한 바퀴 돌고, 봉수대와 뒷산 능선의 노을정까지 올랐다 내리꽂는 고난도 코스",
      start: { pos: [40, 0.4, 123], yaw: 80 },
      gates: [
        G("square", 0, 11.0, 110, { w: 4.6, h: 2.4, yaw: 90 }), G("hoop", -30, 10.6, 109.8, { r: 2.4 }), G("hoop", -72, 9.3, 109.4, { r: 2.4 }), G("hoop", -102, 9.3, 109.3, { r: 2.4 }), G("square", -125, 9.0, 110, { w: 3.8, h: 2.0, yaw: 90 }),
        G("hoop", -140, 10, 97, { r: 3.5 }), G("hoop", -124.6, 9.3, 64, { r: 2.4 }), G("hoop", -124.6, 9.3, -6, { r: 2.4 }), G("square", -125, 9.2, -40, { w: 4.0, h: 2.2, yaw: 0 }),
        G("hoop", -124.6, 9.3, -88, { r: 2.4 }), G("square", -125, 9.0, -120, { w: 3.8, h: 2.0, yaw: 0 }), G("hoop", -129, 11, -137, { r: 3 }), G("hoop", -146, BY + 12, -172, { r: 4.5 }),
        G("hoop", -70, 38, -202, { r: 4.5 }), G("hoop", -28, height(-28, -205) + 5, -205, { r: 3.5 }), G("ring", 10, PY + 2.45, -205, { r: 1.5, yaw: -90 }), G("hoop", 48, height(48, -205) + 5, -205, { r: 3.5 }),
        G("hoop", 90, 34, -186, { r: 4.5 }), G("hoop", 126, 14, -140, { r: 3.5 }), G("square", 125, 9.0, -120, { w: 3.8, h: 2.0, yaw: 180 }), G("hoop", 124.6, 9.3, -52, { r: 2.4 }),
        G("hoop", 124.6, 9.3, 8, { r: 2.4 }), G("square", 125, 9.2, 40, { w: 4.0, h: 2.2, yaw: 180 }), G("hoop", 124.6, 9.3, 80, { r: 2.4 }), G("square", 125, 9.0, 110, { w: 3.8, h: 2.0, yaw: 180 }),
        G("hoop", 113, 10, 124.5, { r: 3.5 }), G("hoop", 72, 9.3, 109.4, { r: 2.4 }), G("hoop", 30, 10.6, 109.8, { r: 2.4 }),
      ],
    },
  ],
  tracking: [
    { id: "truck", name: "관리소 트럭", type: "truck", level: 1, desc: "성벽 바깥 순환로를 도는 문화재 관리소 트럭을 따라가세요", duration: 80, path: loop(-140.4, 140.4, -129.6, 127.2, 11) },
    {
      id: "runner", name: "파발꾼", type: "runner", level: 2, desc: "성문 앞길에서 좁은 골목으로, 등불 큰길로 내달리는 파발꾼을 놓치지 마세요", duration: 80,
      path: [[-181.5, 136], [-181.5, 150], [-181.5, 165], [-181.5, 174], [-177, 180], [-150, 180], [-100, 180], [-40, 180], [0, 180], [40, 180], [100, 180], [105, 180], [109.5, 175], [109.5, 160], [109.5, 140], [109.5, 134], [104, 129.5], [60, 129.5], [0, 129.5], [-100, 129.5], [-176, 129.5]].map(([x, z]) => [x, 0, z, 5.4]),
    },
    {
      id: "boat", name: "연못 나룻배", type: "boat", level: 1, desc: "달못루 앞 연못의 소나무 섬을 도는 나룻배를 화면에 담으세요", duration: 70,
      path: [[-108, -0.85, 46.5, 3], [-90, -0.85, 44.6, 3.4], [-72, -0.85, 46.5, 3], [-70, -0.85, 56, 2.6], [-72, -0.85, 65.5, 3], [-90, -0.85, 67.2, 3.4], [-108, -0.85, 65.5, 3], [-110, -0.85, 56, 2.6]],
    },
    {
      id: "drone", name: "순라 드론", type: "drone", level: 3, desc: "성문 홍예와 밝음문, 정전 속, 달못루 돌기둥 사이를 누비는 순라 드론을 쫓으세요", duration: 85,
      path: [[0, 9, 126, 12], [0, 3.6, 108, 11], [0, 4, 88, 12], [7.33, 2.8, 66, 10], [24, 6, 32, 12], [6.8, 7.2, -17, 9], [6.8, 7.2, -42, 9], [8, 10.5, -62, 11], [-30, 11.5, -64, 12], [-56, 11, -30, 12], [-80, 8, 2, 10], [-87, 2.2, 22, 8], [-87, 2.2, 40, 8], [-84, 4, 54, 10], [-56, 8, 82, 12], [-40, 15.5, 100, 12], [-30, 13, 114, 12]],
    },
  ],
  combat: { blue: [-185, 10], red: [185, 10], depots: [[0, 28], [0, 186], [-76, -40], [90, 68]] },
  strike: { turrets: [[-35, 50], [35, 50], [-35, 8], [35, 8], [-20, 98], [20, 98]], core: [0, 28] },
  supply: { depot: [0, 150], camps: [[26, -198], [-186, -34], [186, 62], [-90, -33]], turrets: [[0, -100], [-150, 100]] },
  convoy: {
    speed: 6.5,
    path: [[-215, 0, 129], [-120, 0, 129], [-30, 0, 129], [-8, 0, 127], [0, 0, 118], [0, 0, 90], [0, 0, 66], [0, 0, 52], [6, 0, 42], [20, 0, 40], [55, 0, 40], [100, 0, 40], [125, 0, 40], [136, 0, 40], [142, 0, 32], [142, 0, 0], [142, 0, -60]],
  },
  boss: { pos: [0, 46, 30] },
};
