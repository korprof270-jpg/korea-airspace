// 설원 통신기지 지형: 높이 함수·색 함수와 지형에 새겨 넣은 지물 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 코스 높이 계산이 모두 같은 함수를 쓴다)
// 좌표: -z 가 북쪽(신호탑 언덕), +z 가 남쪽(얼음 호수), +x 가 동쪽(백설 시와 고갯길), -x 가 서쪽(빙붕과 얼음 협곡)
import { fbm, sm, mix } from "./snow-terrain.js";

export { fbm, sm, mix };
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;

// 조절점을 캣멀-롬 곡선으로 잘게 나눈 꺾은선: 거리·진행 비율·가장 가까운 점
function line(cp, margin, sub = 6) {
  const pts = [], f = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let i = 0; i < cp.length - 1; i++) {
    const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) pts.push([f(p0[0], p1[0], p2[0], p3[0], k / sub), f(p0[1], p1[1], p2[1], p3[1], k / sub)]);
  }
  pts.push(cp[cp.length - 1]);
  const seg = []; let len = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); len += l; }
  const bb = [Math.min(...pts.map((p) => p[0])) - margin, Math.max(...pts.map((p) => p[0])) + margin, Math.min(...pts.map((p) => p[1])) - margin, Math.max(...pts.map((p) => p[1])) + margin];
  const L = {
    pts, len, bb,
    // [거리, 진행 비율 0..1, 가까운 점 x, z] — 범위 밖이면 null
    at(px, pz) {
      if (px < bb[0] || px > bb[1] || pz < bb[2] || pz > bb[3]) return null;
      let best = 1e9, bt = 0, bx = 0, bz = 0, acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az;
        const t = clamp01(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)), qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(px - qx, pz - qz);
        if (d < best) { best = d; bt = acc + seg[i] * t; bx = qx; bz = qz; }
        acc += seg[i];
      }
      return [best, bt / len, bx, bz];
    },
    // 진행 비율 t 의 점 [x, z]
    point(t) {
      let acc = 0; const target = clamp01(t) * len;
      for (let i = 0; i < seg.length; i++) {
        if (acc + seg[i] >= target) { const k = (target - acc) / seg[i]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; }
        acc += seg[i];
      }
      return pts[pts.length - 1];
    },
    dir(t) { const a = L.point(t - 0.01), b = L.point(t + 0.01), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; },
  };
  return L;
}

// ── 지형에 새긴 지물 ──────────────────────────────────────
export const SHELF = 22;                                         // 서쪽 빙붕 윗면 높이
export const SIG = [0, -185], SIG_Y = 16;                        // 신호탑 언덕
export const ART = [185, -165], ART_Y = 12;                      // 북동 포대 고지
export const LAKE = { x: -10, z: 178, rx: 120, rz: 52 };         // 얼음 호수
export const WRECK = [0, 178];                                 // 호수에 처박힌 수송함
export const FLOOR = 2;                                          // 협곡 바닥 높이
// 얼음 협곡(북 → 남, 호수로 빠진다)
export const CANYON = line([[-212, -300], [-178, -205], [-150, -140], [-172, -80], [-146, -25], [-160, 38], [-132, 88], [-112, 122], [-90, 142]], 40);
// 고갯길: 서쪽 빙붕 → 철교 → 기지 → 백설 시 큰길 → 북동 고개
export const ROAD_CP = [[-340, 30], [-250, 26], [-200, 36], [-160, 40], [-128, 37], [-70, 31], [0, 31], [95, 31], [118, 38], [190, 38], [205, 24], [205, -20], [214, -58], [246, -96], [300, -112], [380, -135], [540, -160]];
export const ROAD = line(ROAD_CP, 70);
// 봉우리 [x, z, 반경, 높이]
const PEAKS = [[10, -360, 190, 120], [-260, -330, 190, 96], [270, -330, 170, 84], [-400, -60, 180, 80], [-380, 220, 190, 70], [400, 90, 170, 76], [330, 300, 180, 66], [-60, 400, 200, 74], [470, -260, 190, 90]];
// 포탄 구덩이 [x, z, 반경]
export const CRATERS = [[127, 121, 9], [100, -62, 7], [142, -52, 8], [72, 62, 7], [36, 108, 6], [238, 152, 8], [86, 170, 7], [-58, -128, 6], [-96, 96, 7], [150, 178, 7], [118, -150, 8], [-226, -40, 8], [-232, 112, 7], [246, -40, 7]];

const inRect = (x, z, x0, x1, z0, z1, soft) => sm(-soft, 0, Math.min(x - x0, x1 - x, z - z0, z1 - z));
export const lakeE = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
// 빙붕(서쪽 고지대)에 올라선 정도 0..1
export function shelfK(x, z) {
  const e = -104 + 10 * Math.sin(z * 0.02) + (fbm(x * 0.03 + 7, z * 0.03 + 2, 2) - 0.5) * 10;
  return sm(e, e - 20, x);
}
// 협곡이 깎인 정도 [0..1, t, 거리]
export function canyonAt(x, z) {
  const g = CANYON.at(x, z); if (!g) return [0, 0, 99];
  const n = fbm(x * 0.07 + 5, z * 0.07 + 2, 2) - 0.5;
  return [1 - sm(8, 19, g[0] + n * 5), g[1], g[0]];
}
// 다져 놓은 평지(기지·시가지)인 정도 0..1
export const flatK = (x, z) => Math.max(inRect(x, z, -92, 246, -138, 112, 16), 1 - sm(0.95, 1.2, lakeE(x, z)));

export function height(x, z) {
  const R = Math.hypot(x, z), n = fbm(x * 0.006 + 3, z * 0.006 + 8, 3);
  const rd = ROAD.at(x, z), rk = rd ? 1 - sm(5, 15, rd[0]) : 0;
  // 서쪽 빙붕 (길은 비탈을 깎은 오르막)
  let sk = shelfK(x, z);
  if (rk > 0 && x > -150 && x < -50) sk = lerp(sk, sm(-74, -132, x), rk);
  let h = SHELF * sk;
  // 둘레 산: 바깥으로 갈수록 솟는다. 북동 고갯길은 골짜기로 남긴다
  const rr = R * (1 + (n - 0.5) * 0.22);
  let m = Math.pow(sm(258, 520, rr), 1.2) * (64 + 70 * n);
  const pm = sm(228, 300, R);
  if (pm > 0) for (const [px, pz, pr, ph] of PEAKS) { const d = Math.hypot(x - px, z - pz); if (d < pr) m += ph * Math.pow(1 - d / pr, 1.5) * pm; }
  const rg = 1 - Math.abs(fbm(x * 0.012 + 3, z * 0.012 + 8, 2) * 2 - 1);
  m += rg * rg * 20 * sm(258, 380, rr);
  if (rd && x > 190) m = m * sm(12, 64, rd[0]) + 7 * sm(250, 460, x) * (1 - sm(12, 64, rd[0]));
  h += m;
  // 눈 언덕과 바람 결 (평지·길 위에서는 잔잔하게)
  const wild = 1 - Math.max(flatK(x, z), rk * 0.85);
  h += (fbm(x * 0.03 + 11, z * 0.03 + 4, 3) - 0.5) * (0.5 + 2.6 * wild) + (fbm(x * 0.009, z * 0.009 + 20, 2) - 0.5) * 7 * wild * (1 - sk * 0.5);
  // 신호탑 언덕, 포대 고지
  { const d = Math.hypot(x - SIG[0], z - SIG[1]); if (d < 54) h = lerp(h, SIG_Y, sm(54, 21, d)); }
  { const d = Math.hypot(x - ART[0], z - ART[1]); if (d < 82) h = lerp(h, ART_Y, sm(82, 42, d)); }
  // 포탄 구덩이: 오목한 바닥과 솟은 둘레
  for (const [cx, cz, cr] of CRATERS) {
    const d = Math.hypot(x - cx, z - cz); if (d > cr * 1.7) continue;
    const t = d / cr; h += cr * (-0.3 * Math.max(0, 1 - t * t) + 0.1 * Math.exp(-(((t - 1.08) / 0.22) ** 2)));
  }
  // 얼음 협곡
  const c = canyonAt(x, z);
  if (c[0] > 0) { const fl = FLOOR + (fbm(x * 0.11, z * 0.11, 2) - 0.5) * 0.7; if (h > fl) h = lerp(h, fl, c[0]); }
  // 호수는 완전히 평평한 얼음판
  const le = lakeE(x, z);
  if (le < 1.2) h = lerp(h, 0, 1 - sm(0.94, 1.2, le));
  return h;
}

const SNOW = 0xe6eef8, SNOW_B = 0xccdcf0, ICE = 0xa6d8f0, ICE_D = 0x5fa9d8, ICE_K = 0x3c7fb8, ROCK = 0x9aa6bc, ROCK_D = 0x7a86a2;
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.02 + 3, z * 0.02 + 5, 3);
  const le = lakeE(x, z);
  if (le < 1) {
    // 얼음판: 푸른 얼음 위에 금 간 흰 줄, 수송함이 깨고 들어간 자리는 검푸른 물
    const dw = Math.hypot((x - WRECK[0]) / 62, (z - WRECK[1]) / 26);
    if (dw < 1) return mix(0x16304e, 0x2a5a80, sm(0.55, 1, dw + (n - 0.5) * 0.3));
    const cr = 1 - Math.abs(fbm(x * 0.045 + 9, z * 0.045 + 1, 2) * 2 - 1), cr2 = 1 - Math.abs(fbm(x * 0.11 + 2, z * 0.11 + 7, 2) * 2 - 1);
    let col = mix(ICE_D, ICE, sm(0.3, 0.7, n));
    col = mix(col, 0xe8f6ff, sm(0.9, 0.97, cr) * 0.9 + sm(0.93, 0.99, cr2) * 0.5);
    return mix(col, SNOW, sm(0.86, 1, le) * 0.8 + sm(0.6, 0.78, fbm(x * 0.03, z * 0.03 + 30, 2)) * 0.45);   // 가장자리와 바람에 쌓인 눈 얼룩
  }
  const c = canyonAt(x, z), icy = x < -78 && y < SHELF + 5;
  if (c[0] > 0.96 && slope < 0.2) return mix(ICE, 0xd2ecf8, n);                                    // 협곡 바닥의 얼어붙은 물길
  if (icy && slope > 0.26) {
    // 빙벽: 높이에 따라 푸른 띠가 번갈아 나온다
    const band = y * 0.22 + n * 2.2, f = band - Math.floor(band);
    return mix(mix(SNOW, SNOW_B, n), mix(ICE_K, mix(ICE_D, ICE, sm(0.3, 0.7, f)), sm(1, 9, y)), sm(0.26, 0.4, slope + (n - 0.5) * 0.08));
  }
  if (slope > 0.34) {
    const band = y * 0.1 + n * 2.4, f = band - Math.floor(band);
    return mix(mix(SNOW_B, SNOW, n), mix(ROCK_D, ROCK, sm(0.3, 0.7, f)), sm(0.34, 0.47, slope + (n - 0.5) * 0.08));
  }
  let col = mix(SNOW, SNOW_B, sm(0.4, 0.62, n) * 0.8);
  // 바람에 쓸린 긴 줄무늬(서북풍)와 완만한 비탈의 푸른 그늘
  const wx = x * 0.9 + z * 0.44, wz = z * 0.9 - x * 0.44, st = fbm(wx * 0.014 + 9, wz * 0.1 + 4, 2);
  col = mix(col, 0xbccfea, sm(0.58, 0.8, st) * 0.6);
  col = mix(col, 0xf8fbff, sm(0.34, 0.14, st) * 0.6);
  col = mix(col, 0xc2d4ee, sm(0.08, 0.3, slope) * 0.5);
  // 포탄 구덩이: 그을린 흙과 흩어진 재
  for (const [cx, cz, cr] of CRATERS) { const d = Math.hypot(x - cx, z - cz) / cr; if (d < 2.2) col = mix(col, d < 0.9 ? 0x3a3a44 : 0x6a6c78, sm(2.2, 0.6, d + (n - 0.5) * 0.8) * 0.85); }
  const rd = ROAD.at(x, z);
  if (rd && rd[0] < 4.6) col = mix(col, mix(0xaab6c8, 0xc6d0de, n), sm(4.6, 3.2, rd[0]) * 0.9);     // 다져진 눈길 (바퀴 자국)
  if (rd && Math.abs(rd[0] - 1.6) < 0.5) col = mix(col, 0x8f9cb2, 0.5);
  return mix(col, 0xf2f6fc, sm(60, 120, y));
}
