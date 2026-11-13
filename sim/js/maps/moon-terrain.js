// 달 기지 지형: 높이 함수·색 함수와 지형에 새긴 지물 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 트랙 높이 계산이 모두 같은 함수를 쓴다)
//  · 가운데: 평평한 '고요의 평원'(기지·도로)   · 둘레: 밝은 고지대와 크레이터
//  · 남서: 깊은 채굴 크레이터   · 남~동: 굽이치는 릴(골짜기)   · 북: 전파 관측 고원   · 북서: 매스 드라이버가 오르는 산

function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));

// ── 구역 좌표 ─────────────────────────────────────────────
export const HUB = [0, -10];                                   // 거주 구역 중심 돔
export const PADS = [[66, 44], [24, 88], [-34, 78]];           // 착륙장 (셋째는 착륙선이 서 있다)
export const LAUNCH = [120, 92];                               // 발사대
export const SOLAR = [100, -100];                              // 태양광 단지
export const GREEN = [[-112, 58], [-140, 80], [-100, 92]];     // 온실 돔
export const PLANT = [-140, 126];                              // 선광 공장(채굴 크레이터 진입로 앞)
export const DISH = [40, -246];                                // 전파 관측 고원
export const OUTPOST = [-150, -70];                            // 서쪽 관측 초소
// 매스 드라이버: 평원의 적재소에서 북서쪽 산마루까지 곧게 오르는 레일
export const DRIVER = { a: [-56, 4, -118], b: [-232, 82, -262] };
export const DRIVER_LEN = Math.hypot(DRIVER.b[0] - DRIVER.a[0], DRIVER.b[2] - DRIVER.a[2]);
export const driverPoint = (t, up = 0) => [DRIVER.a[0] + (DRIVER.b[0] - DRIVER.a[0]) * t, DRIVER.a[1] + (DRIVER.b[1] - DRIVER.a[1]) * t + up, DRIVER.a[2] + (DRIVER.b[2] - DRIVER.a[2]) * t];
// 채굴 크레이터: 바닥은 평평하고, 평원 쪽(북동) 테두리가 터져 진입로가 된다
export const MINE = { x: -196, z: 176, R: 78, floor: -22, rim: 17, notch: -0.72 };
// 큰 크레이터 [x, z, 반경, 바닥 높이, 테두리 높이] — 뒤쪽은 원경용
export const BIG = [
  [236, -232, 52, 6, 38], [-268, -120, 46, 10, 40], [-90, -292, 34, 22, 46],
  [450, 60, 95, 2, 60], [-480, 40, 100, 4, 62], [20, 490, 90, 4, 58], [340, -430, 80, 8, 60], [-330, 420, 85, 6, 56], [-430, -330, 70, 30, 84],
];
// 평평하게 다진 터 [x, z, 반경, 이름]
export const FLATS = [[DISH[0], DISH[1], 48, "dish"], [PLANT[0], PLANT[1], 15, "plant"], [LAUNCH[0], LAUNCH[1], 34, "launch"], [-96, -204, 12, "t1"], [150, -176, 12, "t2"]];

// 순환 도로(닫힌 고리)와 호송 경로
export const ROAD = [[-128, -8], [-96, -66], [-40, -92], [20, -88], [56, -76], [100, -52], [134, -14], [128, 36], [84, 62], [56, 100], [0, 118], [-58, 104], [-84, 40], [-120, 20]];

// ── 릴(굽이치는 골짜기) ───────────────────────────────────
const RILLE_CP = [[-36, 170], [-20, 214], [16, 244], [62, 226], [104, 250], [150, 228], [196, 240], [238, 204], [226, 160], [262, 122], [244, 76], [270, 28], [248, -22], [268, -70], [236, -112], [200, -100], [174, -84]];
function smooth(pts, sub = 5) {
  const out = [], f = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) out.push([f(p0[0], p1[0], p2[0], p3[0], k / sub), f(p0[1], p1[1], p2[1], p3[1], k / sub)]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const RILLE = smooth(RILLE_CP);
const polyLen = (pts) => { let s = 0; for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; };
export const RILLE_LEN = polyLen(RILLE);
// 점에서 꺾은선까지의 거리와 진행 비율(0..1)
export function polyDist(px, pz, pts, len) {
  let best = 1e9, bt = 0, acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az, l2 = dx * dx + dz * dz;
    const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / l2)), d = Math.hypot(px - ax - dx * t, pz - az - dz * t), l = Math.sqrt(l2);
    if (d < best) { best = d; bt = acc + l * t; }
    acc += l;
  }
  return [best, len ? bt / len : 0];
}
const bbox = (pts, m) => [Math.min(...pts.map((p) => p[0])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[1])) + m];
const RILLE_BB = bbox(RILLE, 34);
export const RILLE_FLOOR = -7;
// 양 끝은 평원 높이에서 시작해 가운데로 갈수록 깊어진다
export const rilleFloor = (t) => RILLE_FLOOR * sm(0, 0.08, t) * sm(1, 0.92, t);
// 용암 동굴(지붕이 남은 구간)의 진행 비율
export const TUBE = [0.6, 0.71];
// 릴: [깎임 정도 0..1, 진행 비율, 중심선 거리]
export function rilleAt(x, z) {
  if (x < RILLE_BB[0] || x > RILLE_BB[1] || z < RILLE_BB[2] || z > RILLE_BB[3]) return [0, 0, 99];
  const [d, t] = polyDist(x, z, RILLE, RILLE_LEN);
  if (d > 32) return [0, t, d];
  const n = vnoise(x * 0.08 + 31, z * 0.08 + 7) - 0.5;
  return [1 - sm(8.5, 19, d + n * 3), t, d];
}
// 릴 중심선 위의 점
export function rillePoint(t) {
  let acc = 0; const target = Math.min(1, Math.max(0, t)) * RILLE_LEN;
  for (let i = 0; i < RILLE.length - 1; i++) {
    const l = Math.hypot(RILLE[i + 1][0] - RILLE[i][0], RILLE[i + 1][1] - RILLE[i][1]);
    if (acc + l >= target) { const k = (target - acc) / l; return [RILLE[i][0] + (RILLE[i + 1][0] - RILLE[i][0]) * k, RILLE[i][1] + (RILLE[i + 1][1] - RILLE[i][1]) * k]; }
    acc += l;
  }
  return RILLE[RILLE.length - 1];
}
// 릴의 진행 방향(도, w.box 의 ry 와 같은 기준: 진행 방향이 로컬 +x)
export function rilleDir(t) { const a = rillePoint(t - 0.004), b = rillePoint(t + 0.004); return Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI; }

// ── 평원과 고지대 ─────────────────────────────────────────
export const basinE = (x, z) => Math.hypot(x / 228, z / 196);

// 비워 둘 곳 [x, z, 반경] — 작은 크레이터·바위를 놓지 않는다 (맵 파일이 임무 지점을 더 넣는다)
export const RESERVED = [
  [HUB[0], HUB[1], 74], ...PADS.map((p) => [p[0], p[1], 20]), [LAUNCH[0], LAUNCH[1], 58], [SOLAR[0], SOLAR[1], 46], ...GREEN.map((p) => [p[0], p[1], 20]),
  [PLANT[0], PLANT[1], 26], [DISH[0], DISH[1], 84], [OUTPOST[0], OUTPOST[1], 16], [-178, -10, 44], [180, -8, 44], [DRIVER.a[0], DRIVER.a[2], 24], [20, 140, 34], [8, 62, 12],
  [-66, 132, 16], [-96, -204, 20], [58, -116, 13], [150, -176, 20],
];
const distSeg = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
export function roadDist(x, z) { let b = 1e9; for (let i = 0; i < ROAD.length; i++) { const p = ROAD[i], q = ROAD[(i + 1) % ROAD.length]; b = Math.min(b, distSeg(x, z, p[0], p[1], q[0], q[1])); } return b; }
export const driverDist = (x, z) => distSeg(x, z, DRIVER.a[0], DRIVER.a[2], DRIVER.b[0], DRIVER.b[2]);
// 구조물·도로·트랙에서 m 미터 안쪽인가
export function reserved(x, z, m = 0) {
  for (const [rx, rz, rr] of RESERVED) if (Math.hypot(x - rx, z - rz) < rr + m) return true;
  if (roadDist(x, z) < 9 + m || driverDist(x, z) < 22 + m) return true;
  if (Math.hypot(x - MINE.x, z - MINE.z) < MINE.R * 1.4 + m) return true;
  for (const [bx, bz, br] of BIG) if (Math.hypot(x - bx, z - bz) < br * 1.4 + m) return true;
  if (x > RILLE_BB[0] - m && x < RILLE_BB[1] + m && z > RILLE_BB[2] - m && z < RILLE_BB[3] + m && polyDist(x, z, RILLE, RILLE_LEN)[0] < 30 + m) return true;
  return false;
}

// 작은 크레이터 [x, z, 반경, 깊이]: 씨앗 고정 난수로 뿌린다
export const POCKS = [];
export function seedPocks() {
  POCKS.length = 0;
  for (let i = 0; i < 420 && POCKS.length < 64; i++) {
    const x = (hash(i, 11) * 2 - 1) * 520, z = (hash(i, 23) * 2 - 1) * 520, e = basinE(x, z);
    const R = e < 0.9 ? 9 + hash(i, 37) * 8 : 11 + hash(i, 37) * hash(i, 41) * 30;
    if (reserved(x, z, R * 1.5 + 4)) continue;
    if (POCKS.some((p) => Math.hypot(x - p[0], z - p[1]) < (R + p[2]) * 1.25)) continue;
    POCKS.push([x, z, R, R * (e < 0.9 ? 0.2 : 0.3)]);
  }
}
seedPocks();

function raw(x, z) {
  const n = fbm(x * 0.0058 + 3, z * 0.0058 + 8), n2 = fbm(x * 0.021 + 7, z * 0.021 + 3, 3), n3 = vnoise(x * 0.09, z * 0.09);
  const e = basinE(x, z) + (n2 - 0.5) * 0.24, r = Math.hypot(x, z);
  const m = sm(0.9, 1.22, e);
  const rg = 1 - Math.abs(vnoise(x * 0.016 + 3, z * 0.016 + 8) * 2 - 1);
  let high = 15 + n * 46 + rg * rg * 11 + n2 * 7 + sm(300, 540, r) * 34;
  // 서쪽 봉우리(매스 드라이버 레일 옆)
  high += 46 * gauss(Math.hypot(x + 318, z + 196), 100);
  let h = Math.pow(m, 1.35) * high + (n3 - 0.5) * 0.16 + (n2 - 0.5) * 1.6 * sm(0.55, 0.9, e) + (n3 - 0.5) * 1.3 * m;

  // 릴
  const rl = rilleAt(x, z);
  if (rl[0] > 0) h += (rilleFloor(rl[1]) + (n3 - 0.5) * 0.8 - h) * rl[0];
  // 채굴 크레이터와 큰 크레이터: 정해진 단면으로 바꿔 넣는다
  {
    const dx = x - MINE.x, dz = z - MINE.z, d = Math.hypot(dx, dz) / MINE.R;
    if (d < 1.4) {
      const a = Math.atan2(dz, dx), da = Math.abs(Math.atan2(Math.sin(a - MINE.notch), Math.cos(a - MINE.notch)));
      const gate = 1 - sm(0.16, 0.42, da);                                    // 진입로 쪽은 테두리가 낮다
      const rim = MINE.rim + (2.5 - MINE.rim) * gate + (n2 - 0.5) * 5 * (1 - gate);
      const dd = d + (n3 - 0.5) * 0.03, bench = sm(0.5, 0.64, dd) * 0.42 + sm(0.74, 1, dd) * 0.58;   // 계단식 벤치
      h = dd < 1 ? MINE.floor + (rim - MINE.floor) * bench : rim + (h - rim) * sm(1, 1.4, dd);
    }
  }
  for (const [bx, bz, R, fl, rim] of BIG) {
    const d = Math.hypot(x - bx, z - bz) / R;
    if (d > 1.5) continue;
    const dd = d + (n3 - 0.5) * 0.05, rr = rim + (n2 - 0.5) * 8;
    h = dd < 1 ? fl + (rr - fl) * Math.pow(sm(0.3, 1, dd), 1.25) + 5 * gauss(dd, 0.13) : rr + (h - rr) * sm(1, 1.5, dd);   // 가운데 봉우리
  }
  for (const [px, pz, R, dep] of POCKS) {
    const d = Math.hypot(x - px, z - pz) / R;
    if (d > 1.7) continue;
    const k = 1 - Math.min(1, d * d);
    h += -dep * k * k + dep * 0.28 * gauss(d - 1, 0.28);
  }
  // 매스 드라이버가 지나는 곳은 레일보다 낮은 넓은 골짜기로 깎는다(레일이 옆에서도 보이게)
  const dd = driverDist(x, z);
  if (dd < 80) {
    const dx = DRIVER.b[0] - DRIVER.a[0], dz = DRIVER.b[2] - DRIVER.a[2];
    const t = ((x - DRIVER.a[0]) * dx + (z - DRIVER.a[2]) * dz) / (dx * dx + dz * dz);
    if (t > -0.05 && t < 1.4) { const lim = Math.max(0, DRIVER.a[1] + (DRIVER.b[1] - DRIVER.a[1]) * Math.min(1, t) - 9) + Math.max(0, dd - 14) * 0.5 + Math.max(0, t - 1.15) * 120; if (h > lim) h = lim + (n3 - 0.5) * 1.2 * sm(14, 30, dd); }
  }
  return h;
}
const FLAT_H = FLATS.map(([x, z]) => raw(x, z));
export function height(x, z) {
  let h = raw(x, z);
  for (let i = 0; i < FLATS.length; i++) {
    const [fx, fz, r] = FLATS[i], d = Math.hypot(x - fx, z - fz);
    if (d < r * 1.6) h += (FLAT_H[i] - h) * sm(r * 1.6, r, d);
  }
  return h;
}

// ── 색 ────────────────────────────────────────────────────
function mix(a, b, t) {
  t = Math.min(1, Math.max(0, t));
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.018 + 3, z * 0.018 + 5, 3), n2 = fbm(x * 0.06 + 9, z * 0.06 + 2, 2), e = basinE(x, z);
  // 평원(어두운 현무암 바다) ↔ 고지대(밝은 회색)
  let c = mix(mix(0x8a8d97, 0x777b88, sm(0.35, 0.7, n)), mix(0xc9c6bf, 0xaeaba6, sm(0.4, 0.75, n)), sm(0.86, 1.2, e + (n - 0.5) * 0.2));
  c = mix(c, 0xdedbd2, sm(52, 96, y) * 0.7);                                    // 높은 봉우리는 더 밝다
  c = mix(c, 0x6a6d78, sm(0.6, 0.8, n2) * 0.25);                                // 잔 얼룩
  // 채굴 크레이터: 녹슨 광석 빛
  const dm = Math.hypot(x - MINE.x, z - MINE.z) / MINE.R;
  if (dm < 1.35) {
    const band = Math.floor((y - MINE.floor) / 5.5 + n * 1.5);
    const ore = [0xb5764a, 0x9a6a52, 0xc98f5a, 0x8a7468][((band % 4) + 4) % 4];
    c = mix(c, y < MINE.floor + 1.2 ? 0x8f7a6c : ore, sm(1.3, 0.96, dm) * 0.85);
  }
  // 큰 크레이터와 작은 크레이터: 안쪽은 어둡고 테두리와 분출물은 밝다
  for (const [bx, bz, R] of BIG) { const d = Math.hypot(x - bx, z - bz) / R; if (d < 1.6) c = mix(mix(c, 0x8f9098, sm(0.75, 0.2, d) * 0.6), 0xe6e3da, gauss(d - 1, 0.16) * 0.6); }
  for (const [px, pz, R] of POCKS) {
    const d = Math.hypot(x - px, z - pz) / R;
    if (d > 2.6) continue;
    // 분출물 줄무늬(광조)
    const a = Math.atan2(z - pz, x - px), ray = sm(0.55, 0.9, vnoise(a * 5 + px, R)) * sm(2.6, 1.1, d);
    c = mix(mix(c, 0x70737e, sm(0.8, 0.2, d) * 0.55), 0xe9e6dd, Math.max(gauss(d - 1, 0.2) * 0.7, ray * 0.5));
  }
  const rl = rilleAt(x, z);
  if (rl[0] > 0.02) {
    if (rl[0] > 0.9) c = mix(0x6f7280, 0x82848e, n2);                           // 릴 바닥의 고운 먼지
    else { const band = Math.floor(y * 0.2 + n * 2); c = mix(c, [0xa7a39c, 0x8d8a88, 0xbdb9b0][((band % 3) + 3) % 3], 0.8); }
  }
  // 도로: 바퀴 자국으로 다져진 어두운 띠
  if (e < 1) { const rd = roadDist(x, z); if (rd < 7) c = mix(c, 0x5c5f6a, sm(7, 3.5, rd) * 0.75); }
  if (slope > 0.35) c = mix(c, 0x9c9891, sm(0.35, 0.5, slope) * 0.5);
  return c;
}
