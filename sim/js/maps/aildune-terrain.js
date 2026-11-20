// 유리 사막 지형: 높이 함수·색 함수와 구역 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 트랙 높이 계산이 모두 같은 함수를 쓴다)
//  · 온 땅: 호박빛·청록 유리 모래의 굽이치는 사구(북서 → 남동으로 흐르는 마루). 경계 밖은 더 큰 사구의 바다
//  · 가운데를 가로지르는 유리 협곡: 서쪽 경계 밖에서 들어와 동쪽(x ≈ 172)에서 비탈로 끝난다. 깊이 35 m
//  · 평평한 다짐 모래 판: 공명 숲 바닥(북), 빈 합창 둥지(북서), 프리즘 밭(북서 끝), 오아시스(남동), 출발 판(남), 두 본부, 보급 자리
//  · 다진 모래 길: 남쪽 고리(탐사 트럭) + 협곡 동쪽 끝을 돌아 북동으로 가는 가지(호송)
import { vnoise, fbm, sm, hash } from "./ail-terrain.js";

export { vnoise, fbm, sm, hash };

export const SIZE = 240;
export const RIM = 9, FLOOR = -26;                 // 협곡 턱·바닥 높이
export const FOREST = { x: 0, z: -110, R: 76, y: 6 };   // 공명 숲(가운데: 노래 굳은 기둥)
export const NEST = { x: -140, z: -48, R: 54, y: 7 };   // 빈 합창 가시 둥지
export const PRISM = { x: -168, z: -168, R: 42, y: 5 }; // 깨진 결정의 프리즘 밭
export const OASIS = { x: 150, z: 160, R: 44, y: 3.2 }, LAKE = { x: 152, z: 158, R: 18 }, LAKE_Y = 1.9;   // 순례자 야영지와 빛 샘
export const SPAWN = { x: 0, z: 192, R: 26, y: 5 };
export const BLUE = [-165, 172], RED = [165, -168];
export const RAYST = { x: -104, z: 126 };          // 반쯤 묻힌 가오리 순례상
export const SINGERS = { x: 88, z: 110 };          // 마주 선 노래꾼 순례상

// ── 임무 지점(평평하게 다진다) ──
export const DEPOTS = [[-40, 124], [50, 116], [-74, -28], [98, -42]];
export const STRIKE = { turrets: [[-182, -30], [-172, -84], [-128, -96], [-96, -62], [-104, -16], [-146, -3]], core: [NEST.x, NEST.z] };
export const SUPPLY = { depot: [118, 174], camps: [[-202, 84], [128, -80], [-62, -192], [214, 126]], turrets: [[-198, -72], [62, 168]] };

// ── 평평한 판 [x, z, 반경, 가장자리 폭, 높이, 세기] ──
const PANS = [
  [FOREST.x, FOREST.z, FOREST.R, 24, FOREST.y, 0.94],
  [NEST.x, NEST.z, NEST.R, 20, NEST.y, 1],
  [PRISM.x, PRISM.z, PRISM.R, 20, PRISM.y, 0.9],
  [OASIS.x, OASIS.z, OASIS.R, 18, OASIS.y, 1],
  [SPAWN.x, SPAWN.z, SPAWN.R, 18, SPAWN.y, 1],
  [BLUE[0], BLUE[1], 38, 16, 6, 1], [RED[0], RED[1], 38, 16, 6, 1],
  [RAYST.x, RAYST.z, 26, 26, 8, 0.6], [SINGERS.x, SINGERS.z, 20, 22, 8, 0.65],
  [0, 90, 20, 26, 8, 0.5],                           // 거신이 서는 자리
  ...DEPOTS.map(([x, z]) => [x, z, 14, 14, null, 1]),
  ...SUPPLY.camps.map(([x, z]) => [x, z, 12, 12, null, 1]),
  ...SUPPLY.turrets.map(([x, z]) => [x, z, 7, 10, null, 1]),
];

// 균일 캣멀-롬으로 꺾은선을 부드럽게 (per: 구간당 표본 수)
function smoothLine(pts, per, closed) {
  const n = pts.length, out = [], P = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]), segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t, f = (j) => 0.5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
// 꺾은선을 구간 배열로 (가장 가까운 점 찾기용)
function segs(line, closed) {
  const n = closed ? line.length : line.length - 1, S = { n, ax: new Float64Array(n), az: new Float64Array(n), dx: new Float64Array(n), dz: new Float64Array(n), il: new Float64Array(n), s0: new Float64Array(n), len: new Float64Array(n), L: 0, box: [1e9, -1e9, 1e9, -1e9] };
  for (let i = 0; i < n; i++) {
    const a = line[i], b = line[(i + 1) % line.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
    S.ax[i] = a[0]; S.az[i] = a[1]; S.dx[i] = dx; S.dz[i] = dz; S.il[i] = 1 / l2; S.s0[i] = S.L; S.len[i] = Math.sqrt(l2); S.L += S.len[i];
    S.box[0] = Math.min(S.box[0], a[0], b[0]); S.box[1] = Math.max(S.box[1], a[0], b[0]); S.box[2] = Math.min(S.box[2], a[1], b[1]); S.box[3] = Math.max(S.box[3], a[1], b[1]);
  }
  return S;
}
// 가장 가까운 구간: [거리, 구간 번호, 구간 안 비율] 을 _n 에 담는다
const _n = [0, 0, 0];
function nearest(S, x, z) {
  let best = 1e18, bi = 0, bt = 0;
  for (let i = 0; i < S.n; i++) {
    let t = ((x - S.ax[i]) * S.dx[i] + (z - S.az[i]) * S.dz[i]) * S.il[i];
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - S.ax[i] - S.dx[i] * t, ez = z - S.az[i] - S.dz[i] * t, d = ex * ex + ez * ez;
    if (d < best) { best = d; bi = i; bt = t; }
  }
  _n[0] = Math.sqrt(best); _n[1] = bi; _n[2] = bt;
  return _n;
}

// ── 유리 협곡 중심선(서 → 동). 서쪽 두 점은 맵 밖(원경으로 이어진다) ──
const CANYON_PTS = [[-520, 74], [-400, 40], [-300, 58], [-236, 46], [-176, 22], [-116, 44], [-56, 58], [4, 36], [62, 22], [120, 42], [172, 36]];
export const CANYON = smoothLine(CANYON_PTS, 7, false);
const CS = segs(CANYON, false);
export const CANYON_LEN = CS.L;
// 협곡 정보: { d: 중심선까지 거리, s: 서쪽 끝에서 잰 길이, k: 깊이 비율(양 끝에서 0 으로) }
export function canyonAt(x, z) {
  const q = nearest(CS, x, z), i = q[1], s = CS.s0[i] + CS.len[i] * q[2];
  return { d: q[0], s, k: sm(40, 190, s) * (1 - sm(CS.L - 56, CS.L - 6, s)) };
}
// 중심선 위의 점: 길이 s → [x, z, 접선 x, 접선 z]
export function canyonPoint(s) {
  s = Math.max(0, Math.min(CS.L - 1e-3, s));
  let i = 0; while (i < CS.n - 1 && CS.s0[i + 1] <= s) i++;
  const t = (s - CS.s0[i]) / CS.len[i];
  return [CS.ax[i] + CS.dx[i] * t, CS.az[i] + CS.dz[i] * t, CS.dx[i] / CS.len[i], CS.dz[i] / CS.len[i]];
}
// x 좌표로 중심선 위의 길이 s 찾기(중심선은 x 에 대해 단조 증가)
export function canyonS(x) {
  for (let i = 0; i < CS.n; i++) if (x <= CS.ax[i] + CS.dx[i]) return CS.s0[i] + CS.len[i] * Math.max(0, (x - CS.ax[i]) / CS.dx[i]);
  return CS.L;
}
// 협곡 바닥 반폭(굽이마다 넓어졌다 좁아진다)
export const canyonHalf = (s) => 10.5 + 2.2 * Math.sin(s * 0.043 + 1.2);

// ── 다진 모래 길 ──
const LOOP_PTS = [[-150, 150], [-96, 160], [-40, 152], [20, 146], [80, 142], [130, 126], [176, 112], [198, 92], [180, 75], [140, 78], [90, 84], [30, 82], [-30, 88], [-90, 95], [-150, 100], [-196, 118], [-190, 146]];
const SPUR_PTS = [[198, 92], [213, 60], [215, 20], [207, -24], [188, -70], [172, -108], [168, -124]];
export const ROAD = smoothLine(LOOP_PTS, 6, true);           // 닫힌 고리 (탐사 트럭)
export const SPUR = smoothLine(SPUR_PTS, 6, false);          // 북동 가지
const RS = segs(ROAD, true), PS = segs(SPUR, false);
// 호송 경로: 고리의 남쪽 변(파란 본부 → 동쪽 갈림목) + 북동 가지
export const CONVOY = [...ROAD.slice(0, 7 * 6 + 1), ...SPUR.slice(1)];

// ── 사구 ──
// 마루가 날카롭고 바람받이가 완만한 사구 단면 (f: 0~1 위상)
const dune = (f) => (f < 0.7 ? Math.pow(Math.sin((f / 0.7) * 1.5708), 1.5) : Math.pow(Math.cos(((f - 0.7) / 0.3) * 1.5708), 1.25));
function dunes(x, z) {
  const r = Math.hypot(x, z), far = sm(250, 520, r);
  const p = (x * 0.74 + z * 0.67) / 88 + 0.5 * Math.sin((x * 0.67 - z * 0.74) * 0.0145 + 0.7) + 0.18 * Math.sin(x * 0.031 + 2.1);
  const q = (z * 0.9 - x * 0.44) / 41 + 0.6 * Math.sin(x * 0.018 + 1.3);
  let h = 16.5 * dune(p - Math.floor(p)) * (0.66 + 0.34 * Math.sin((x * 0.67 - z * 0.74) * 0.023 + 1.9)) + 1.5 * Math.sin(q * 6.2832) + 3.4 * vnoise(x * 0.027 + 9, z * 0.027 + 4);
  if (far > 0) h = h * (1 + far * 1.5) + far * 16 * Math.sin(x * 0.0062 + 1.1) * Math.sin(z * 0.0054 + 2.3) + far * 8;
  return h + 0.8;
}
// 길 높이: 사구를 낮게 누른 값을 길 따라 고르게 편다
function profile(line, closed, pin) {
  const n = line.length, raw = line.map(([x, z]) => 3.6 + dunes(x, z) * 0.34), out = new Float64Array(n), W = 5;
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -W; k <= W; k++) { const j = closed ? ((i + k) % n + n) % n : Math.max(0, Math.min(n - 1, i + k)); s += raw[j]; c++; } out[i] = s / c; }
  if (pin !== undefined) for (let i = 0; i < n; i++) { const k = Math.max(0, 1 - i / 8); out[i] = out[i] * (1 - k) + pin * k; }
  return out;
}
const RH = profile(ROAD, true), PH = profile(SPUR, false, RH[7 * 6]);
// 길 정보: [거리, 길 높이]
const _r = [0, 0];
export function roadAt(x, z) {
  let d = 1e9, h = 0;
  if (x > RS.box[0] - 20 && x < RS.box[1] + 20 && z > RS.box[2] - 20 && z < RS.box[3] + 20) {
    const q = nearest(RS, x, z), i = q[1];
    d = q[0]; h = RH[i] + (RH[(i + 1) % RH.length] - RH[i]) * q[2];
  }
  if (x > PS.box[0] - 20 && z < PS.box[3] + 20 && z > PS.box[2] - 20) {
    const q = nearest(PS, x, z), i = q[1];
    if (q[0] < d) { d = q[0]; h = PH[i] + (PH[i + 1] - PH[i]) * q[2]; }
  }
  _r[0] = d; _r[1] = h;
  return _r;
}

// 판 높이를 정해지지 않은 곳은 그 자리 사구 높이를 눌러서 정한다
for (const P of PANS) if (P[4] === null) P[4] = 3.8 + dunes(P[0], P[1]) * 0.36;

export function height(x, z) {
  let h = dunes(x, z);
  // 길: 폭 9 m 를 고르게 다지고 양옆 12 m 에 걸쳐 사구로 이어진다
  const rd = roadAt(x, z);
  if (rd[0] < 17) h += (rd[1] - h) * (1 - sm(4.5, 17, rd[0]));
  // 판
  for (let i = 0; i < PANS.length; i++) {
    const P = PANS[i], dx = x - P[0], dz = z - P[1], R = P[2] + P[3];
    if (dx > R || dx < -R || dz > R || dz < -R) continue;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < R) h += (P[4] - h) * (1 - sm(P[2], R, d)) * P[5];
  }
  // 오아시스 샘: 얕은 그릇
  { const dx = x - LAKE.x, dz = z - LAKE.z, d2 = dx * dx + dz * dz; if (d2 < 900) h -= 3.4 * (1 - sm(LAKE.R - 7, LAKE.R + 6, Math.sqrt(d2))); }
  // 협곡: 턱은 고른 선반, 벽은 가파른 유리 절벽(중턱에 얕은 턱 하나), 바닥은 잔물결
  if (z > -70 && z < 150 && x < 260) {
    const c = canyonAt(x, z);
    if (c.d < 74 && c.k > 0) {
      const shelf = RIM + (h - RIM) * 0.3 + (vnoise(x * 0.09, z * 0.09) - 0.5) * 1.4;
      h += (shelf - h) * (1 - sm(24, 74, c.d)) * c.k;
      const half = canyonHalf(c.s) * (0.55 + 0.45 * c.k), top = half + 8.5 + 2.5 * vnoise(x * 0.06 + 3, z * 0.06);
      if (c.d < top) {
        let w = (c.d - half) / (top - half); w = w < 0 ? 0 : w;
        const wall = w < 0.42 ? w * 1.45 : w < 0.56 ? 0.609 + (w - 0.42) * 0.25 : 0.644 + (w - 0.56) * 0.809;   // 중턱의 얕은 턱
        const fl = FLOOR + (vnoise(x * 0.14, z * 0.14) - 0.5) * 1.2 + 0.5 * Math.sin(c.s * 0.21);
        h += (fl + (h - fl) * Math.min(1, wall) - h) * c.k;
      }
    }
  }
  return h;
}

// 지상 유닛이 설 수 있는 땅인가(협곡 안·샘은 뺀다)
export const land = (x, z) => { if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.R + 4) return false; const c = canyonAt(x, z); return !(c.k > 0.05 && c.d < 30); };

// ── 색: 호박빛 모래에 청록 유리 모래 얼룩, 마루는 밝은 금빛, 골은 장밋빛 그늘. 판은 다져진 연한 모래, 협곡 벽은 청록 → 남보라 유리 ──
const mix = (a, b, t) => {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
export { mix };
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.011 + 31, z * 0.011 + 7, 3), n2 = vnoise(x * 0.06 + 2, z * 0.06);
  // 사구: 높이에 따라 골(장밋빛) → 비탈(호박) → 마루(금빛)
  let c = y < 4 ? 0xb8745e : y < 8 ? 0xd9965a : y < 12.5 ? 0xe9b068 : 0xf6d08a;
  if (n > 0.62) c = mix(c, y > 10 ? 0x7fe0cc : 0x46b8a8, n > 0.66 ? 0.8 : 0.45);      // 청록 유리 모래 띠
  else if (n < 0.36) c = mix(c, 0xc86a8a, 0.4);                                          // 분홍 모래
  if (n2 > 0.78) c = mix(c, 0xfff0c0, 0.35);                                             // 반짝이는 유리 가루 얼룩
  if (slope > 0.12) c = mix(c, 0x8a5a78, sm(0.12, 0.3, slope) * 0.55);                   // 미끄럼면 그늘
  // 판: 다져진 연한 모래에 동심원 물결
  for (let i = 0; i < 7; i++) {
    const P = PANS[i], d = Math.hypot(x - P[0], z - P[1]);
    if (d < P[2] + 8) { const ring = Math.sin(d * 0.42) > 0.72 ? 0.16 : 0; c = mix(c, i === 1 ? 0x6a4a6e : i === 0 ? 0x9adfd0 : 0xe6c79a, (1 - sm(P[2] - 4, P[2] + 8, d)) * (0.62 + ring)); }
  }
  const rd = roadAt(x, z);
  if (rd[0] < 6.5) c = mix(c, 0xa97a5e, 0.7 * (1 - sm(3.5, 6.5, rd[0])));
  { const d = Math.hypot(x - LAKE.x, z - LAKE.z); if (d < LAKE.R + 9) c = mix(c, 0x2fa8a0, 1 - sm(LAKE.R - 2, LAKE.R + 9, d)); }
  if (z > -70 && z < 150 && x < 260) {
    const cy = canyonAt(x, z);
    if (cy.k > 0) {
      if (cy.d < 34) c = mix(c, 0x8fe6d6, (1 - sm(20, 34, cy.d)) * 0.75 * cy.k);          // 턱의 유리 가루
      if (y < RIM - 2.5) {
        const t = (RIM - y) / (RIM - FLOOR);
        const wallC = t < 0.3 ? mix(0x86ecdc, 0x3fc2c4, t / 0.3) : t < 0.62 ? mix(0x3fc2c4, 0x2a7fb8, (t - 0.3) / 0.32) : mix(0x2a7fb8, 0x3a3f9a, (t - 0.62) / 0.38);
        c = mix(c, wallC, cy.k);
        if (y < FLOOR + 1.6) c = mix(c, n2 > 0.5 ? 0x9ff0e4 : 0x5fcfd0, 0.8);            // 바닥: 빛 머금은 유리 모래
      }
    }
  }
  return c;
}
