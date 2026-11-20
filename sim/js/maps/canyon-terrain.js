// 붉은 협곡 지형: 높이 함수·색 함수와 지형에 새겨 넣은 지물 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 트랙 높이 계산이 모두 같은 함수를 쓴다)

function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (w * w));

// 강 중심선 (z → x). 상류는 +z(댐), 하류는 -z(호수)
export const riverX = (z) => 70 * Math.sin(z * 0.011) + 28 * Math.sin(z * 0.027 + 1.3);

// ── 지형에 새긴 지물 ──────────────────────────────────────
// 댐: 강과 직각이 되도록 돌려 놓는다 (ry 는 w.box 의 회전값, crest 는 마루 높이)
export const DAM = { x: riverX(288), z: 288, ry: -56, crest: 46 };
// 하류의 호수 분지와 섬
export const LAKE = { x: -14, z: -252, rx: 86, rz: 54 };
export const ISLE = { x: 12, z: -262, r: 12, h: 13 };
// 서쪽 절벽의 폭포 골짜기: 입구 → 안쪽, 낙수 지점과 용소
export const ALCOVE = { a: [2, 24], b: [-74, 16], r: 27 };
// x: 물줄기가 떨어지는 면(절벽에서 튀어나온 바위 턱의 끝), lip: 턱 위 수면 높이, edge: 절벽 끝
export const FALLS = { x: -91, z: 15, lip: 63, edge: -108, pool: [-86, 15, 13] };
// 고원의 작은 호수(타른)와 폭포로 흘러드는 개울
export const TARN = { x: -176, z: 24, r: 25, y: 65 };
export const STREAM = [[-152, 23], [-130, 17], [-108, 15]];
// 동쪽 고원을 가르는 바늘귀 협곡(슬롯 캐니언): 본류 → 호수
const SLOT_CP = [[18, -30], [50, -46], [82, -36], [112, -56], [110, -92], [132, -118], [126, -152], [102, -172], [90, -204], [66, -236]];
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
export const SLOT = smooth(SLOT_CP);
// 협곡 안의 바위 기둥 [x, z, 반경, 높이]
export const SPIRES = [[riverX(40) + 30, 40, 9, 34], [riverX(-150) - 34, -150, 12, 50], [riverX(186) - 28, 186, 9, 32], [riverX(-232) + 44, -224, 8, 26]];
// 고원 위의 뷰트·메사 [x, z, 꼭대기 반경, 밑동 반경, 꼭대기 높이] — 뒤쪽은 원경용
export const BUTTES = [
  [262, -238, 20, 40, 128], [158, -262, 12, 25, 112], [292, -118, 15, 30, 120], [-236, -262, 17, 34, 124], [-288, -150, 13, 27, 116], [262, 262, 16, 32, 118],
  [-292, 258, 18, 36, 126], [118, -302, 9, 19, 100], [228, -300, 8, 17, 104],
  [450, -90, 60, 100, 150], [-455, 130, 70, 110, 146], [400, 380, 60, 95, 140], [-400, -380, 66, 105, 152], [-90, -480, 50, 85, 138], [130, 480, 55, 90, 142], [470, 180, 34, 60, 132], [-470, -120, 30, 56, 136],
];
// 평평하게 다진 터 [x, z, 반경, 이름]
export const FLATS = [
  [-190, 160, 40, "blue"], [200, -150, 40, "red"], [riverX(230) + 34, 230, 16, "spawn"], [riverX(60) - 31, 60, 13, "camp0"], [-192, -52, 16, "camp1"],
  [riverX(-190) + 34, -190, 13, "camp2"], [192, 100, 16, "camp3"], [134, -20, 13, "tower"], [206, 206, 36, "mine"], [-142, -230, 22, "ruins"], [-252, 96, 15, "ranger"],
  [-150, -120, 9, "dep1"], [170, 60, 9, "dep2"],
];
export const flat = (name) => FLATS.find((f) => f[3] === name);

// 점에서 꺾은선까지의 거리와 진행 비율(0..1)
function polyDist(px, pz, pts, len) {
  let best = 1e9, bt = 0, acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az, l2 = dx * dx + dz * dz;
    const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / l2)), d = Math.hypot(px - ax - dx * t, pz - az - dz * t), l = Math.sqrt(l2);
    if (d < best) { best = d; bt = acc + l * t; }
    acc += l;
  }
  return [best, bt / len];
}
const polyLen = (pts) => { let s = 0; for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; };
const SLOT_LEN = polyLen(SLOT), STREAM_LEN = polyLen(STREAM);
const bbox = (pts, m) => [Math.min(...pts.map((p) => p[0])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[1])) + m];
const SLOT_BB = bbox(SLOT, 24), STREAM_BB = bbox(STREAM, 22);
const inBB = (x, z, b) => x > b[0] && x < b[1] && z > b[2] && z < b[3];

// 슬롯 협곡: [깎임 정도 0..1, 진행 비율, 중심선 거리]
export function slotAt(x, z) {
  if (!inBB(x, z, SLOT_BB)) return [0, 0, 99];
  const [d, t] = polyDist(x, z, SLOT, SLOT_LEN);
  const wide = 1 + 0.9 * gauss(t, 0.56, 0.07) - 0.12 * gauss(t, 0.3, 0.06);        // 가운데 '대성당' 방, 좁은 목
  const n = vnoise(x * 0.09 + 31, z * 0.09 + 7) - 0.5;
  return [1 - sm(5.2 * wide, 12.5 * wide + 1.5, d + n * 2.4), t, d];
}
// 슬롯 중심선 위의 점 (t: 0 = 본류 쪽 입구, 1 = 호수 쪽 입구)
export function slotPoint(t) {
  let acc = 0; const target = Math.min(1, Math.max(0, t)) * SLOT_LEN;
  for (let i = 0; i < SLOT.length - 1; i++) {
    const l = Math.hypot(SLOT[i + 1][0] - SLOT[i][0], SLOT[i + 1][1] - SLOT[i][1]);
    if (acc + l >= target) { const k = (target - acc) / l; return [SLOT[i][0] + (SLOT[i + 1][0] - SLOT[i][0]) * k, SLOT[i][1] + (SLOT[i + 1][1] - SLOT[i][1]) * k]; }
    acc += l;
  }
  return SLOT[SLOT.length - 1];
}
export const slotFloor = (t) => 2.2 + 15 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 1.3;
// 호수 분지: 타원 정규 거리
export const lakeE = (x, z) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
function alcoveAt(x, z) {
  const [ax, az] = ALCOVE.a, [bx, bz] = ALCOVE.b, dx = bx - ax, dz = bz - az;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return [Math.hypot(x - ax - dx * t, z - az - dz * t), t];
}

function raw(x, z) {
  const rx = riverX(z), d = Math.abs(x - rx);
  const n = fbm(x * 0.007, z * 0.007), n2 = fbm(x * 0.028 + 7, z * 0.028 + 3, 3), n3 = vnoise(x * 0.11, z * 0.11);
  // 골짜기 폭: 가운데 초지 구간은 넓고 흔들다리 부근은 좁다
  const wf = 1 + 0.3 * gauss(z, 62, 60) - 0.24 * gauss(z, -92, 46) - 0.1 * gauss(z, 190, 40);
  let wall = sm(15 * wf, (62 + n2 * 34) * wf, d);
  let plateau = 44 + n * 46 + n2 * 9 - Math.max(-7, Math.min(7, x * 0.03));
  const dDam = Math.hypot(x - DAM.x, z - DAM.z);
  if (dDam < 130) plateau = Math.max(plateau, plateau + (60 - plateau) * sm(130, 70, dDam));     // 댐 양안은 마루보다 높게
  plateau += (Math.round(plateau / 10) * 10 - plateau) * 0.5;                                    // 계단식 지층

  // 골짜기를 넓히는 지물들: 폭포 골짜기, 슬롯 협곡, 호수 분지
  let cut = 0, floorAdd = 0;
  const [da, ta] = alcoveAt(x, z);
  if (da < 60) cut = 1 - sm(ALCOVE.r - 9 + ta * 3, ALCOVE.r + 4 + ta * 3, da + (n2 - 0.5) * 9);
  const sl = slotAt(x, z);
  if (sl[0] > 0) { floorAdd = slotFloor(sl[1]) * sl[0]; cut = Math.max(cut, sl[0]); }
  const le = lakeE(x, z);
  if (le < 1.6) cut = Math.max(cut, 1 - sm(0.84, 1.3, le * (1 + (n2 - 0.5) * 0.34)));
  wall *= 1 - cut;

  const rg = 1 - Math.abs(vnoise(x * 0.05 + 3, z * 0.05 + 8) * 2 - 1), rg2 = 1 - Math.abs(vnoise(x * 0.13, z * 0.13 + 5) * 2 - 1);
  let h = Math.pow(wall, 1.7) * plateau + (rg * rg * 8 + rg2 * 2.4) * Math.min(1, wall * (1 - wall) * 5 + wall * 0.12);   // 절벽의 능선·바위 주름
  h += (n2 - 0.5) * 3.2 * (1 - wall) + 1.7 + (n3 - 0.5) * 0.7 + floorAdd * (1 - wall);
  h -= 5.4 * (1 - sm(0, 13, d)) * (1 - sl[0]);                          // 강바닥
  if (le < 1) h -= 6.5 * (1 - sm(0.42, 0.82, le));                       // 호수 바닥
  const dp = Math.hypot(x - FALLS.pool[0], z - FALLS.pool[1]);
  if (dp < 22) h -= 6 * (1 - sm(7, FALLS.pool[2] + 4, dp));              // 용소

  for (const [sx, sz, r, sh] of SPIRES) { const k = sm(r, r * 0.5, Math.hypot(x - sx, z - sz)); if (k > 0) h = Math.max(h, k * (sh + (n3 - 0.5) * 3)); }
  const di = Math.hypot(x - ISLE.x, z - ISLE.z);
  if (di < ISLE.r * 1.6) h = Math.max(h, ISLE.h * sm(ISLE.r * 1.6, ISLE.r * 0.55, di + (n3 - 0.5) * 3));
  for (const [bx, bz, rt, rb, top] of BUTTES) {
    const db = Math.hypot(x - bx, z - bz);
    if (db > rb + 8) continue;
    let k = sm(rb, rt, db + (n3 - 0.5) * 5 + (n2 - 0.5) * 8);
    k += (Math.round(k * 3) / 3 - k) * 0.55;                             // 층층이 깎인 사면
    if (k > 0) h = Math.max(h, h + (top + (n3 - 0.5) * 2 - h) * k);
  }
  // 타른과 개울
  const dt = Math.hypot(x - TARN.x, z - TARN.z);
  if (dt < TARN.r * 2.2) h += (TARN.y - 2.8 * sm(TARN.r, TARN.r * 0.45, dt) + 0.5 - h) * sm(TARN.r * 2.2, TARN.r * 1.05, dt + (n3 - 0.5) * 4);
  if (inBB(x, z, STREAM_BB)) {
    const [ds, ts] = polyDist(x, z, STREAM, STREAM_LEN);
    if (ds < 16) h += (TARN.y - 1.2 - ts * 1.6 + sm(2.5, 6, ds) * 2 - h) * sm(16, 5, ds) * sm(FALLS.edge + 4, FALLS.edge, x);
  }
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

// 숲·덤불 밀도 (색과 식생 배치가 함께 쓴다)
export const forest = (x, z) => fbm(x * 0.013 + 40, z * 0.013 + 11, 2);
// 구역: 서쪽 고원은 숲, 동쪽 고원은 메마른 붉은 땅
export const dryness = (x) => sm(-60, 90, x);

// 색 섞기 (0xRRGGBB)
function mix(a, b, t) {
  t = Math.min(1, Math.max(0, t));
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
const STRATA = [0xe9b98a, 0xd98a58, 0xf2d2a6, 0xc9703f, 0xe6a878, 0xb85f38, 0xf0c79a];
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.02 + 3, z * 0.02 + 5, 3), d = Math.abs(x - riverX(z));
  const le = lakeE(x, z), sl = slotAt(x, z);
  const wet = y < 1.2 && (d < 24 || le < 1 || Math.hypot(x - FALLS.pool[0], z - FALLS.pool[1]) < 24);
  if (wet) return mix(0xecd9a8, 0x9b8a62, sm(0.9, -1.5, y));                                   // 물가 모래
  // 가파른 사면: 높이에 따른 지층 띠
  if (slope > 0.3 || (sl[0] > 0.05 && sl[0] < 0.97)) {
    const band = y * 0.16 + n * 2.2 + Math.sin(x * 0.03 + z * 0.02) * 0.6, i = Math.floor(band), f = band - i;
    const c = mix(STRATA[((i % 7) + 7) % 7], STRATA[(((i + 1) % 7) + 7) % 7], sm(0.7, 1, f));
    if (slope > 0.42 || sl[0] > 0.05) return c;
    return mix(colorFlat(x, y, z, n, d, le, sl), c, sm(0.3, 0.42, slope));
  }
  return colorFlat(x, y, z, n, d, le, sl);
}
function colorFlat(x, y, z, n, d, le, sl) {
  if (sl[0] > 0.9) return mix(0xf0c890, 0xe0a070, n);                                           // 슬롯 바닥의 고운 모래
  if (y < 14 && (d < 70 || le < 1.25)) return mix(mix(0x9ccc4e, 0xc6bd62, n * 0.8), 0x7fb844, sm(9, 2, y) * 0.5);   // 골짜기 초지
  const dry = dryness(x), f = forest(x, z), n2 = fbm(x * 0.07 + 9, z * 0.07 + 2, 2);
  const dm = Math.hypot(x - 206, z - 206);
  let c = mix(mix(mix(0x8fae4c, 0xc2b266, sm(0.55, 0.8, n2) * 0.7), 0x5f8a3c, sm(0.42, 0.62, f)), mix(0xdba768, 0xc98552, sm(0.45, 0.75, n2)), dry);   // 서: 풀·숲 바닥 / 동: 붉은 흙
  c = mix(c, 0xa7ad5a, sm(0.5, 0.7, n) * 0.45 * dry);                                           // 메마른 풀밭 얼룩
  if (dm < 70) c = mix(c, 0x9a8f86, sm(70, 34, dm) * 0.8);                                      // 광산 터의 잿빛 자갈
  const dt = Math.hypot(x - TARN.x, z - TARN.z);
  if (dt < 62) c = mix(c, y < TARN.y + 0.3 ? 0xd9cf9a : 0x8fc452, sm(62, 30, dt) * 0.8);         // 타른 주변 풀밭
  return mix(c, 0xf0d6ab, sm(92, 122, y) * 0.6);                                                // 높은 메사 꼭대기
}
