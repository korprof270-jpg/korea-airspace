// 붉은 협곡 전초기지 지형: 높이 함수·색 함수와 지형에 새겨 넣은 지물 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 코스 높이 계산이 모두 같은 함수를 쓴다)
//  · 주 협곡: 서 → 동으로 굽이치는 깊이 30~54 m, 바닥 폭 40~60 m 의 붉은 사암 협곡. 가운데(|x| < 72)는 곧게 펴져 북벽에 절벽 요새가 박혀 있다
//  · 남쪽 곁협곡: 주 협곡(x ≈ 72)에서 남쪽으로 빠져 연합 고원(서)과 시추 메사(동)를 가른다
//  · 북서 바늘 협곡: 주 협곡(x ≈ -122)에서 북쪽으로 난 좁은 틈. 포대 메사(서)와 요새 메사(동)를 가른다
//  · 메사 높이: 남서 연합 고원 30, 남동 시추 메사 38, 북쪽 요새 메사 54, 북동 감시 뷰트 82

export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (w * w));

// ── 높이 기준 ──
export const FLOOR = 0, S_TOP = 30, SE_TOP = 38, N_TOP = 54;

// ── 주 협곡 중심선 (x → z). 가운데는 z = -14 로 곧고, 서쪽은 북으로, 동쪽은 남으로 한 번씩 굽는다 ──
export function canyonZ(x) {
  const a = Math.abs(x), k = sm(55, 120, a);
  return -14 + k * (x < 0 ? -46 * Math.sin((a - 55) * 0.019) : 42 * Math.sin((a - 55) * 0.02));
}
export const canyonSlope = (x) => (canyonZ(x + 1.5) - canyonZ(x - 1.5)) / 3;
// 암석 아치가 걸리는 좁은 목 (x 좌표)
export const NECKS = [-212, -92, 97, 212];
// 바닥 반폭: 요새 앞은 넓고(30), 아치 목은 좁다(20)
export function canyonHW(x) {
  let w = 25 + 5 * gauss(x, 0, 60);
  for (const n of NECKS) w -= 5 * gauss(x, n, 14);
  return w;
}
// 중심선 위의 점에서 옆으로 off 만큼 민 점 (off > 0 = 남쪽). [x, z]
export function canyonPoint(x, off = 0) {
  const s = canyonSlope(x), l = Math.sqrt(1 + s * s);
  return [x - (s * off) / l, canyonZ(x) + off / l];
}
// 협곡 방향의 yaw(도): w.box 의 ry 로 쓰면 긴 변(x 축)이 협곡을 따라 눕는다
export const canyonYaw = (x) => (-Math.atan(canyonSlope(x)) * 180) / Math.PI;

// ── 곁협곡 중심선 (z → x) ──
export const sideSX = (z) => 72 - 26 * Math.sin((z + 11) * 0.016);       // 남쪽 곁협곡 (z > -14)
export const sideNX = (z) => -122 - 20 * Math.sin((z + 58) * 0.018);     // 북서 바늘 협곡 (z < -58)
export const SIDE_S_HW = 13, SIDE_N_HW = 11;
export const sideSFloor = (z) => 5 * sm(20, 230, z);
export const sideNFloor = (z) => 8 * sm(-70, -230, z);

// ── 절벽 요새 터 (북벽, 정면은 남쪽) ──
// 단(테라스) 앞면 z 와 윗면 높이. 0단 윗면(14)이 격납고 바닥·안뜰 바닥 높이다
export const FORT = { x0: -72, x1: 72, front: [-44, -52, -58, -64], top: [14, 30, 42, 54], back: -94 };
export const COURT = { x0: -58, x1: 58, z0: -148, z1: -94, y: 14 };      // 요새 뒤 안뜰(하늘로 열린 구덩이)
export const HANGARS = [-38, 38], HANGAR_HW = 9, HANGAR_H = 12;            // 격납고 굴(남북으로 뚫려 협곡과 안뜰을 잇는다)
export const SPIRE = [0, -121];                                            // 지휘 첨탑(안뜰 한가운데)

// ── 뷰트·메사 [x, z, 꼭대기 반경, 밑동 반경, 꼭대기 높이] ──
export const DISH_BUTTE = [168, -146, 37, 60, 82];                         // 북동 감시 뷰트(접시 안테나 기지)
export const BUTTES = [
  DISH_BUTTE,
  [-214, 214, 9, 22, 56], [26, 218, 8, 19, 52], [218, -220, 11, 25, 88], [-74, -226, 8, 18, 80], [236, 238, 10, 24, 66], [-232, 30, 8, 18, 50],
  [-236, -236, 10, 22, 84], [88, -232, 6, 14, 74],
];

// ── 평평하게 다진 터 [x, z, 반경, 이름, 높이(없으면 그 자리 높이)] ──
export const FLATS = [
  [-112, 128, 46, "blue"], [0, -192, 40, "red"], [-178, -160, 46, "strike"],
  [-195, -67, 15, "pad1", 24], [165, -13, 15, "pad2", 28],                // 절벽 턱을 깎아 낸 착륙장
  [-30, 196, 14, "dep0"], [196, 112, 14, "dep1"], [102, -196, 14, "dep2"], [-143, -42, 10, "dep3", 0],
  [-178, 196, 14, "supply"], [-40, 60, 12, "camp0"], [206, 204, 12, "camp1"], [110, -70, 12, "camp2"], [-205, 84, 12, "camp3"],
  [150, 152, 56, "rigs"], [211, -58, 11, "ropeN"], [212, 58, 11, "ropeS"],
];
export const flat = (name) => FLATS.find((f) => f[3] === name);

// 협곡 벽: 0 = 바닥, 1 = 메사 윗면. 가운데쯤 한 번 턱이 진다(지층 테라스)
function wallK(d, hw, jit) {
  let k = sm(hw, hw + 12, d + jit);
  k += (Math.round(k * 2) / 2 - k) * 0.4;
  return k;
}

function raw(x, z) {
  const zc = canyonZ(x), s = canyonSlope(x), dm = Math.abs(z - zc) / Math.sqrt(1 + s * s);
  const n2 = fbm(x * 0.03 + 7, z * 0.03 + 3, 3), n3 = vnoise(x * 0.11, z * 0.11);
  const jit = (n2 - 0.5) * 7 + (n3 - 0.5) * 1.6;
  let k = wallK(dm, canyonHW(x), jit), floor = FLOOR;
  let sx = 1e9;
  if (z > zc - 8) {
    sx = sideSX(z);
    const ss = (sideSX(z + 1.5) - sideSX(z - 1.5)) / 3, ks = wallK(Math.abs(x - sx) / Math.sqrt(1 + ss * ss), SIDE_S_HW, jit * 0.7);
    if (ks < 1) { floor = Math.max(floor, (1 - ks) * sideSFloor(z)); k = Math.min(k, ks); }
  }
  if (z < zc + 8) {
    const nx = sideNX(z), ns = (sideNX(z + 1.5) - sideNX(z - 1.5)) / 3, kn = wallK(Math.abs(x - nx) / Math.sqrt(1 + ns * ns), SIDE_N_HW, jit * 0.6);
    if (kn < 1) { floor = Math.max(floor, (1 - kn) * sideNFloor(z)); k = Math.min(k, kn); }
  }
  // 메사 윗면 높이: 북 54 / 남서 30 / 남동 38, 맵 밖은 들쭉날쭉한 메사 지대, 맨 바깥은 사막 평원으로 떨어진다
  const south = sm(-12, 12, z - zc);
  let M = N_TOP + ((sx < 1e8 ? S_TOP + (SE_TOP - S_TOP) * sm(-10, 10, x - sx) : S_TOP) - N_TOP) * south;
  const far = sm(238, 300, Math.max(Math.abs(x), Math.abs(z)));
  if (far > 0) {
    const q = fbm(x * 0.0055 + 3, z * 0.0055 + 11, 3);
    M += far * (30 * sm(0.53, 0.56, q) + 26 * sm(0.63, 0.66, q) - 16 * sm(0.44, 0.4, q));
    const q2 = fbm(x * 0.004 + 50, z * 0.004 + 20, 2);
    M *= (1 - sm(400, 455, Math.hypot(x, z) + (q - 0.5) * 140 + (q2 - 0.5) * 260)) * (1 - sm(440, 482, Math.max(Math.abs(x), Math.abs(z))));
  }
  M += (fbm(x * 0.012 + 1, z * 0.012 + 5, 3) - 0.5) * 2.4;
  let h = floor + (M - floor) * Math.pow(k, 0.85);
  // 절벽의 바위 주름, 바닥의 잔 굴곡(길 둘레는 평평)
  const rg = 1 - Math.abs(vnoise(x * 0.06 + 3, z * 0.06 + 8) * 2 - 1);
  h += rg * rg * 5 * k * (1 - k) * 4 + (n2 - 0.5) * 1.6 * (1 - k) * sm(6, 15, dm) + (n3 - 0.5) * 0.5 * k;
  for (let i = 0; i < BUTTES.length; i++) {
    const b = BUTTES[i], db = Math.hypot(x - b[0], z - b[1]);
    if (db > b[3] + 8) continue;
    let kb = sm(b[3], b[2], db + (n3 - 0.5) * 4 + (n2 - 0.5) * 7);
    kb += (Math.round(kb * 3) / 3 - kb) * 0.55;                          // 층층이 깎인 사면
    if (kb > 0) h += (b[4] + (n3 - 0.5) * 1.2 * (i ? 1 : 0) - h) * kb;
  }
  return h;
}

const FLAT_H = FLATS.map((f) => f[4] ?? raw(f[0], f[1]));
export function height(x, z) {
  let h = raw(x, z);
  for (let i = 0; i < FLATS.length; i++) {
    const f = FLATS[i], r = f[2];
    if (!r) continue;
    const d = Math.hypot(x - f[0], z - f[1]);
    if (d < r * 1.5) h += (FLAT_H[i] - h) * sm(r * 1.5, r, d);
  }
  // 절벽 요새 터: 정면은 계단식 강철 단이 덮는 고른 비탈, 뒤는 평평한 메사, 안뜰과 격납고 굴은 14 m 까지 파낸다
  if (x > -84 && x < 84 && z < -40 && z > -162) {
    const ax = sm(84, 76, Math.abs(x));
    // (강철 단·바닥판 밑에 숨도록 요새 몸체 밑은 50, 파낸 바닥은 13.4 로 살짝 낮춘다)
    const body = z > FORT.back - 2 ? Math.min(50, Math.max(0, (-46 - z) * 2.08)) : N_TOP;
    h += (body - h) * ax * sm(-162, -154, z);
    if (x > COURT.x0 - 4 && x < COURT.x1 + 4 && z > COURT.z0 - 4 && z < COURT.z1 + 4) h = COURT.y - 0.6;
    else if (z > FORT.back - 4) for (const hx of HANGARS) if (Math.abs(x - hx) < HANGAR_HW + 4) h = Math.min(h, COURT.y - 0.6);
  }
  return h;
}

// 색 섞기 (0xRRGGBB)
export function mix(a, b, t) {
  t = Math.min(1, Math.max(0, t));
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
const STRATA = [0xd8926a, 0xc0623c, 0xecb88c, 0xa84c30, 0xd08860, 0x963c28, 0xe0a880];
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.02 + 3, z * 0.02 + 5, 3), zc = canyonZ(x), s = canyonSlope(x), dm = Math.abs(z - zc) / Math.sqrt(1 + s * s);
  // 안뜰·격납고 바닥: 검은 강철판
  if (x > COURT.x0 - 6 && x < COURT.x1 + 6 && z > COURT.z0 - 6 && z < FORT.front[0] && y < COURT.y + 1.5 && y > 8) return 0x3a3536;
  // 가파른 사면: 높이에 따른 지층 띠
  if (slope > 0.26) {
    const band = y * 0.17 + n * 2 + Math.sin(x * 0.03 + z * 0.02) * 0.6, i = Math.floor(band), f = band - i;
    const c = mix(STRATA[((i % 7) + 7) % 7], STRATA[(((i + 1) % 7) + 7) % 7], sm(0.7, 1, f));
    if (slope > 0.4) return c;
    return mix(colorFlat(x, y, z, n, dm), c, sm(0.26, 0.4, slope));
  }
  return colorFlat(x, y, z, n, dm);
}
function colorFlat(x, y, z, n, dm) {
  const n2 = fbm(x * 0.07 + 9, z * 0.07 + 2, 2);
  // 협곡 바닥: 고운 모래 + 가운데 다져진 길
  if (y < 9 && dm < 40) {
    const sand = mix(0xdca284, 0xc88868, n);
    return mix(mix(0x6a4c46, 0x7c5c54, n2), sand, sm(4.2, 6.4, dm));
  }
  let c = mix(mix(0xbe7850, 0xa65c3e, sm(0.4, 0.7, n)), 0xd09468, sm(0.55, 0.8, n2) * 0.6);
  // 제국이 다진 땅: 요새 메사·포대 메사는 그을린 잿빛, 시추 메사는 기름 얼룩
  if (z < canyonZ(x) && Math.abs(x) < 236 && z > -236) c = mix(c, 0x8a5c4a, 0.55 + 0.25 * n2);
  const dr = Math.hypot(x - 150, z - 150);
  if (dr < 95) c = mix(c, mix(0x5c4438, 0x7a5a48, n2), sm(95, 50, dr) * 0.75);
  const db = Math.hypot(x + 112, z - 128);
  if (db < 60) c = mix(c, 0xc8a078, sm(60, 36, db) * 0.6);                 // 연합 기지 터의 밝은 다짐흙
  return mix(c, 0xeec49a, sm(64, 90, y) * 0.5);                            // 높은 뷰트 꼭대기
}

// ── 지형 위에 얹는 지물 좌표(코스·경로·구조물이 함께 쓴다) ──
// 봉쇄 다리 셋: [x, 남쪽 끝 z, 북쪽 끝 z, 상판 높이]. 가운데 다리는 요새 정문(1단 윗면)에 닿고, 양옆 두 다리는 북쪽 절벽의 관문으로 들어간다
export const BRIDGES = [[-162, -15, -93, 30], [0, 31, -52, 30], [130, 67, -9, 38]];
// 시추 메사의 시추탑 다섯(오각형)과 플레어 스택
export const RIG_C = [150, 156];
export const DERRICKS = [[122, 138, 52], [158, 122, 60], [186, 156, 50], [160, 190, 56], [124, 180, 46]];
export const FLARES = [[196, 186, 34], [108, 204, 30], [204, 128, 26]];
// 감시 뷰트의 접시 안테나 [x, z, 반경, 기둥 높이]
export const DISHES = [[160, -152, 13, 13], [187, -160, 8.5, 9], [184, -128, 8.5, 9], [150, -128, 6, 7]];
// 삭도(케이블카): 남쪽 시추 메사 정거장 → 북쪽 메사 정거장
export const ROPE = { s: [212, 58], n: [211, -58], ys: 38 + 17, yn: 54 + 13 };
// 연료 탱크 단지(시추 메사 북서, 동쪽 다리 남쪽 끝 옆)
export const TANKS = { x0: 78, x1: 112, z0: 88, z1: 117 };
