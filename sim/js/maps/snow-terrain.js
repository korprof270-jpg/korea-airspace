// 설국 산장 지형: 높이 함수·색 함수와 지형에 새겨 넣은 지물 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 트랙 높이 계산이 모두 같은 함수를 쓴다)
// 좌표: -z 가 북쪽(주봉), +z 가 남쪽(마을 분지). 분지 바닥은 y ≈ 0.25, 얼어붙은 호수는 y = 0

function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// 조절점을 부드러운 곡선(캣멀-롬)으로 잘게 나눈다
function smooth(pts, sub = 5) {
  const out = [], f = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) out.push([f(p0[0], p1[0], p2[0], p3[0], k / sub), f(p0[1], p1[1], p2[1], p3[1], k / sub)]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const polyLen = (pts) => { let s = 0; for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; };
// 꺾은선 묶음: 거리·진행 비율·가장 가까운 점을 빠르게 구한다
function line(cp, margin, sub = 5) {
  const pts = smooth(cp, sub), len = polyLen(pts);
  const bb = [Math.min(...pts.map((p) => p[0])) - margin, Math.max(...pts.map((p) => p[0])) + margin, Math.min(...pts.map((p) => p[1])) - margin, Math.max(...pts.map((p) => p[1])) + margin];
  const L = {
    pts, len, bb,
    // [거리, 진행 비율 0..1, 가까운 점 x, z] — 범위 밖이면 null
    at(px, pz) {
      if (px < bb[0] || px > bb[1] || pz < bb[2] || pz > bb[3]) return null;
      let best = 1e9, bt = 0, bx = 0, bz = 0, acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az, l2 = dx * dx + dz * dz;
        const t = clamp01(((px - ax) * dx + (pz - az) * dz) / l2), qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(px - qx, pz - qz), l = Math.sqrt(l2);
        if (d < best) { best = d; bt = acc + l * t; bx = qx; bz = qz; }
        acc += l;
      }
      return [best, bt / len, bx, bz];
    },
    // 진행 비율 t 의 점 [x, z]
    point(t) {
      let acc = 0; const target = clamp01(t) * len;
      for (let i = 0; i < pts.length - 1; i++) {
        const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
        if (acc + l >= target) { const k = (target - acc) / l; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
        acc += l;
      }
      return pts[pts.length - 1];
    },
    // 진행 방향 단위 벡터 [dx, dz]
    dir(t) { const a = L.point(t - 0.01), b = L.point(t + 0.01), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; },
  };
  return L;
}

// ── 지형에 새긴 지물 ──────────────────────────────────────
export const VAL = { x: -10, z: 165, rx: 235, rz: 100 };          // 마을 분지(타원)
export const LAKE = { x: -105, z: 172, rx: 60, rz: 38 };          // 얼어붙은 호수
export const POND = { x: 139, z: 101, r: 13 };                    // 골짜기 어귀의 얼음 못
// 봉우리 [x, z, 반경, 높이] — 주봉(천문대), 서봉(빙하), 동쪽 어깨, 원경
export const PEAKS = [[-10, -225, 190, 92], [-232, -105, 170, 66], [262, -30, 120, 26], [-60, -470, 220, 120], [-430, -300, 200, 90], [430, -330, 210, 100], [-470, 120, 180, 70], [460, 150, 190, 80], [80, 470, 200, 60], [-250, 440, 170, 52]];
// 폭포 절벽(탁상지) [x, z, 꼭대기 반경, 밑동 반경, 높이]
export const MESA = { x: -276, z: 158, rt: 32, rb: 46, top: 50 };
// 스키 슬로프(주봉 어깨 → 마을), 얼음 골짜기(북동 → 분지), 빙하 크레바스(서봉과 주봉 사이)
export const PISTE = line([[0, -172], [12, -110], [35, -40], [30, 20], [50, 72]], 40);
export const GORGE = line([[176, -330], [162, -215], [178, -150], [150, -85], [165, -25], [150, 35], [142, 84]], 46);
export const CREV = line([[-116, -6], [-150, -40], [-140, -80], [-170, -112], [-150, -150], [-110, -172]], 30);
// 분지를 한 바퀴 도는 눈길(호송 경로이기도 하다)
export const ROAD_CP = [[150, 140], [100, 118], [40, 112], [-30, 112], [-110, 116], [-170, 135], [-188, 172], [-165, 212], [-100, 226], [-30, 232], [40, 236], [110, 226]];
export const ROAD = line(ROAD_CP, 8);
// 평평하게 다진 터 [x, z, 반경, 이름]
export const FLATS = [
  [178, 172, 36, "blue"], [240, -190, 36, "red"], [16, -178, 24, "top"], [-10, -226, 15, "summit"], [78, 76, 20, "base"], [95, -22, 13, "mid"],
  [-214, 36, 14, "cabin"], [116, -88, 12, "bridgeW"], [-58, -66, 9, "jumpTop"], [-96, 34, 12, "judge"], [-100, -122, 9, "dep2"], [236, -62, 9, "dep3"], [-262, 150, 14, "mesa"],
];
export const flat = (name) => FLATS.find((f) => f[3] === name);

export const valE = (x, z) => Math.hypot((x - VAL.x) / VAL.rx, (z - VAL.z) / VAL.rz);
export const lakeE = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
const GORGE_Y0 = 46;
export const gorgeFloor = (t) => 0.25 + GORGE_Y0 * Math.pow(1 - clamp01(t * 1.04), 1.15);
export const crevDepth = (t) => 1 + 23 * Math.pow(Math.sin(Math.PI * clamp01(t)), 0.55);
// 골짜기·크레바스가 깎인 정도 [0..1, t, 거리]
export function gorgeAt(x, z) {
  const g = GORGE.at(x, z); if (!g) return [0, 0, 99];
  const n = vnoise(x * 0.07 + 5, z * 0.07 + 2) - 0.5, wide = 1 + 0.5 * sm(0.8, 1, g[1]);
  return [1 - sm(7 * wide, 21 * wide, g[0] + n * 5), g[1], g[0]];
}
export function crevAt(x, z) {
  const g = CREV.at(x, z); if (!g) return [0, 0, 99, 0, 0];
  const n = vnoise(x * 0.11 + 31, z * 0.11 + 7) - 0.5, wide = 1 + 0.7 * Math.exp(-((g[1] - 0.5) ** 2) / 0.006);       // 가운데 '얼음 방'
  return [1 - sm(4.6 * wide, 10.5 * wide + 1, g[0] + n * 2), g[1], g[0], g[2], g[3]];
}

// 매끈한 산 모양(잔주름 없음): 슬로프·크레바스 바닥의 기준 높이
function smoothH(x, z) {
  const e = valE(x, z) * (1 + (fbm(x * 0.012 + 3, z * 0.012 + 8, 2) - 0.5) * 0.16);
  const rise = Math.pow(sm(0.93, 2.3, e), 1.4);
  let m = 26 + 30 * fbm(x * 0.006, z * 0.006, 3) + 38 * sm(120, -150, z);
  for (const [px, pz, R, H] of PEAKS) { const d = Math.hypot(x - px, z - pz); if (d < R) m += H * Math.pow(1 - d / R, 1.4); }
  return [0.25 + rise * m, rise];
}
function raw(x, z) {
  let [h, rise] = smoothH(x, z);
  const n3 = vnoise(x * 0.11, z * 0.11);
  // 슬로프 위는 다져서 매끈하게, 그 밖은 능선 주름과 바위 턱
  const ps = PISTE.at(x, z), pk = ps ? 1 - sm(13, 30, ps[0]) : 0;
  const rg = 1 - Math.abs(vnoise(x * 0.021 + 3, z * 0.021 + 8) * 2 - 1), rg2 = 1 - Math.abs(vnoise(x * 0.06, z * 0.06 + 5) * 2 - 1);
  h += (rg * rg * 15 + rg2 * 3.4 - 5) * rise * (1 - pk) + (n3 - 0.5) * 0.5 * Math.min(1, rise * 6) + (n3 - 0.5) * 0.12;
  // 폭포 절벽
  { const d = Math.hypot(x - MESA.x, z - MESA.z); if (d < MESA.rb + 10) { const k = sm(MESA.rb, MESA.rt, d + (n3 - 0.5) * 4); if (k > 0) h = Math.max(h, h + (MESA.top + (n3 - 0.5) * 2 - h) * k); } }
  // 얼음 골짜기
  const g = gorgeAt(x, z);
  if (g[0] > 0) h = Math.min(h, h + (gorgeFloor(g[1]) + (n3 - 0.5) * 0.3 - h) * g[0]);
  // 빙하 크레바스: 바닥은 매끈한 산 높이에서 일정 깊이만큼 아래
  const c = crevAt(x, z);
  if (c[0] > 0) { const fl = smoothH(c[3], c[4])[0] - crevDepth(c[1]); h = Math.min(h, h + (fl - h) * c[0]); }
  // 호수·못은 완전히 평평한 얼음판
  const le = lakeE(x, z);
  if (le < 1.25) h += (0 - h) * (1 - sm(0.94, 1.2, le));
  const dp = Math.hypot(x - POND.x, z - POND.z);
  if (dp < POND.r * 1.5) h += (0 - h) * (1 - sm(POND.r, POND.r * 1.5, dp));
  // 눈길은 살짝 다진다
  const rd = ROAD.at(x, z);
  if (rd && rd[0] < 8) h += (0.2 - h) * (1 - sm(4, 8, rd[0]));
  return h;
}
const FLAT_H = FLATS.map(([x, z]) => raw(x, z));
export function height(x, z) {
  let h = raw(x, z);
  for (let i = 0; i < FLATS.length; i++) {
    const [fx, fz, r] = FLATS[i], d = Math.hypot(x - fx, z - fz);
    if (d < r * 1.7) h += (FLAT_H[i] - h) * sm(r * 1.7, r, d);
  }
  return h;
}

// 숲 밀도 (색과 식생 배치가 함께 쓴다)
export const forest = (x, z) => fbm(x * 0.013 + 40, z * 0.013 + 11, 2);

// 색 섞기 (0xRRGGBB)
export function mix(a, b, t) {
  t = clamp01(t);
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
const SNOW = 0xe9f0f8, SNOW_B = 0xd2e0f2, ICE = 0xa9dcf2, ICE_D = 0x6fb9e2, ROCK = 0x8b93a6, ROCK_D = 0x6d778c;
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.02 + 3, z * 0.02 + 5, 3);
  if (lakeE(x, z) < 1 || Math.hypot(x - POND.x, z - POND.z) < POND.r) return mix(ICE, 0xd6eef8, n);
  const c = crevAt(x, z);
  if (c[0] > 0.04) {
    // 빙하 얼음: 높이에 따라 푸른 띠가 번갈아 나온다
    const band = y * 0.2 + n * 2, f = band - Math.floor(band);
    const ice = mix(ICE_D, ICE, sm(0.35, 0.65, f));
    return c[0] > 0.97 && slope < 0.2 ? mix(0xdff2fb, ice, 0.25) : mix(SNOW, ice, sm(0.04, 0.3, c[0]));
  }
  const g = gorgeAt(x, z);
  if (g[0] > 0.93 && slope < 0.25) return mix(ICE, 0xcdeaf7, n);                                  // 얼어붙은 개울
  if (slope > 0.34) {
    const band = y * 0.11 + n * 2.4, f = band - Math.floor(band);
    const rock = mix(ROCK_D, ROCK, sm(0.3, 0.7, f));
    return mix(mix(SNOW_B, SNOW, n), rock, sm(0.34, 0.46, slope + (n - 0.5) * 0.08));
  }
  const ps = PISTE.at(x, z);
  if (ps && ps[0] < 15) return mix(0xf6fafe, 0xe4eefa, sm(0.3, 0.7, vnoise(x * 0.4, z * 0.05)) * 0.6);   // 다진 슬로프
  const rd = ROAD.at(x, z);
  if (rd && rd[0] < 4.2) return mix(0xc9d2dc, 0xdbe3ec, n);                                       // 눈길
  const f = forest(x, z);
  let col = mix(SNOW, SNOW_B, sm(0.4, 0.62, n) * 0.8);                                            // 바람결 무늬
  col = mix(col, 0xcfdcee, sm(0.5, 0.66, f) * 0.5 * sm(150, 110, y));                             // 숲 바닥의 푸른 그늘
  return mix(col, 0xf4f8fd, sm(110, 150, y));                                                     // 높은 곳은 더 희게
}
