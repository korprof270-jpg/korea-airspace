// 누리 대륙 (시안 A · 동서 대치) — 대륙 전체를 하나의 좌표계로 둔다
//  · 지도 단위(svg 1000×660)를 K m 로 키운 '대륙 좌표'(m). 구역 맵은 이 좌표에서 창 하나만 잘라 쓴다 → 나중에 창을 넓히면 그대로 합쳐진다
//  · 높이·색·거점 모두 대륙 좌표의 함수라 어느 구역 맵에서 계산해도 이음매가 같다
export const K = 8, OX = 500, OY = 330;
export const toW = (sx, sy) => [(sx - OX) * K, (sy - OY) * K];

// ── 해안선 · 섬 · 세력 · 전선 (지도 단위) ──
const LAND_S = [[120, 140], [200, 90], [320, 70], [450, 85], [560, 60], [690, 75], [800, 95], [880, 150], [905, 240], [870, 320], [900, 400], [860, 480], [770, 520], [660, 505], [560, 540], [470, 520], [380, 550], [290, 520], [200, 470], [150, 400], [100, 330], [85, 240]];
const ISL_S = [[300, 605, 42, 18], [372, 622, 30, 13], [236, 588, 22, 10]];
const REG_S = {
  bukseol: [[0, 0], [520, 0], [500, 230], [0, 250]], haerim: [[0, 250], [205, 242], [230, 425], [0, 430]], hanul: [[205, 242], [500, 230], [470, 420], [230, 425]],
  jeoksa: [[0, 430], [470, 420], [456, 562], [0, 562]], namdo: [[0, 562], [456, 562], [450, 700], [0, 700]],
  e1: [[520, 0], [610, 0], [590, 230], [570, 420], [560, 660], [450, 660], [470, 420], [500, 230]], e2: [[610, 0], [760, 0], [740, 230], [730, 420], [720, 660], [560, 660], [570, 420], [590, 230]],
  e3: [[760, 0], [1000, 0], [1000, 660], [720, 660], [730, 420], [740, 230]],
};
const FRONT_S = [[518, 62], [500, 230], [470, 420], [458, 535]];
// 강: 북설 산자락 → 한울 평원 → 해림 앞바다 · 적사 협곡 → 남해
const RIVER_S = [
  { pts: [[470, 214], [452, 252], [440, 290], [452, 340], [430, 352], [372, 358], [344, 372], [312, 360], [262, 345], [222, 362], [176, 375], [130, 372], [60, 372]], w: 26, d: 9 },
  { pts: [[470, 432], [420, 448], [372, 462], [334, 488], [300, 500], [262, 488], [230, 505], [205, 545]], w: 30, d: 0, canyon: 58 },
];

export const LAND = LAND_S.map(([x, y]) => toW(x, y));
export const ISLANDS = ISL_S.map(([x, y, rx, ry]) => ({ c: toW(x, y), rx: rx * K, ry: ry * K }));
export const REGIONS_POLY = Object.fromEntries(Object.entries(REG_S).map(([k, P]) => [k, P.map(([x, y]) => toW(x, y))]));
export const FRONT = FRONT_S.map(([x, y]) => toW(x, y));
export const RIVERS = RIVER_S.map((r) => ({ ...r, pts: r.pts.map(([x, y]) => toW(x, y)) }));

// ── 거점 ──  t: cap 수도 · city 도시 · port 항구 · fort 요새 · base 기지 / o: 소속 / r: 평탄 반경(m) / map: 지금 있는 단독 맵 id
const S = (id, n, t, o, sx, sy, r, extra = {}) => ({ id, n, t, o, p: toW(sx, sy), r, ...extra });
export const SITES = [
  S("airbase", "비행기지", "base", "hanul", 255, 285, 260, { map: "airbase" }),
  S("city", "네온 시티", "city", "hanul", 415, 305, 250, { map: "city" }),
  S("palace", "단풍 고궁", "city", "hanul", 295, 395, 190, { map: "palace" }),
  S("stadium", "드론 리그 스타디움", "city", "hanul", 380, 395, 170, { map: "stadium" }),
  S("hanulsi", "한울시", "cap", "hanul", 335, 315, 300),
  S("factory", "석양의 항만", "port", "haerim", 104, 325, 220, { map: "factory" }),
  S("haerimport", "해림 군항", "port", "haerim", 166, 413, 230),
  S("lighthouse", "등대곶 요새", "fort", "haerim", 96, 262, 170),
  S("frost", "설원 통신기지", "base", "bukseol", 430, 170, 220, { map: "frost" }),
  S("snow", "설국 산장", "city", "bukseol", 255, 150, 210, { map: "snow" }),
  S("seori", "서리성", "cap", "bukseol", 165, 190, 270),
  S("baekryeong", "백령 요새", "fort", "bukseol", 476, 108, 200),
  S("canyon", "붉은 협곡 댐", "city", "jeoksa", 334, 488, 0, { map: "canyon" }),
  S("minecity", "적사 광산 도시", "cap", "jeoksa", 215, 452, 260),
  S("outpost", "붉은 협곡 전초기지", "fort", "e2", 425, 485, 210, { map: "outpost" }),
  S("island", "화산섬", "city", "namdo", 300, 605, 0, { map: "island" }),
  S("coral", "산호항", "port", "namdo", 372, 622, 150),
  S("vault", "제국 코어 저장고", "fort", "e1", 532, 330, 220, { map: "vault" }),
  S("ashgate", "잿빛 관문시", "city", "e1", 548, 182, 250),
  S("hq", "옛 통합방위청 본부", "base", "e1", 522, 462, 220),
  S("foundry", "거신 공창", "fort", "e2", 680, 132, 240, { map: "foundry" }),
  S("spaceport", "제국 궤도 발사기지", "port", "e2", 632, 500, 250, { map: "spaceport" }),
  S("ironwall", "강철 방벽", "fort", "e2", 622, 300, 160),
  S("armory", "흑철 조병창", "base", "e2", 682, 418, 240),
  S("empire", "기계제국 수도", "cap", "e3", 842, 278, 330, { map: "empire" }),
  S("monolith", "모노리스 요새", "fort", "e3", 800, 172, 220),
  S("abyss", "심해 군항", "port", "e3", 845, 465, 230),
];
export const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]));
// 도로: 거점끼리 (같은 편끼리만 · 전선 너머는 끊긴 옛 도로)
export const ROADS = [
  ["airbase", "hanulsi"], ["hanulsi", "city"], ["hanulsi", "palace"], ["hanulsi", "stadium"], ["palace", "stadium"], ["airbase", "factory"], ["factory", "lighthouse"], ["factory", "haerimport"],
  ["haerimport", "palace"], ["airbase", "seori"], ["seori", "snow"], ["snow", "frost"], ["frost", "baekryeong"], ["city", "frost"], ["haerimport", "minecity"], ["minecity", "canyon"], ["palace", "minecity"],
  ["vault", "ashgate"], ["vault", "hq"], ["vault", "ironwall"], ["ironwall", "foundry"], ["ironwall", "armory"], ["armory", "spaceport"], ["armory", "empire"], ["empire", "monolith"], ["empire", "abyss"], ["outpost", "hq"],
].map(([a, b]) => [SITE[a].p, SITE[b].p, a, b]);

// ── 구역 맵 (창) ──  c: 중심(지도 단위) · half: 반경(m)
const R = (id, name, owner, sx, sy, half, extra) => ({ id, name, owner, c: toW(sx, sy), half, ...extra });
export const REGIONS = {
  hanul: R("hanul", "한울 공화국", "hanul", 335, 335, 1250),
  haerim: R("haerim", "해림 해양국", "haerim", 140, 335, 1100),
  bukseol: R("bukseol", "북설 연방", "bukseol", 320, 150, 1450),
  jeoksa: R("jeoksa", "적사 자치령", "jeoksa", 318, 478, 1250),
  namdo: R("namdo", "남도 군도 왕국", "namdo", 310, 605, 900),
  e1: R("e1", "제국 1세대 점령지", "e1", 535, 322, 1300),
  e2: R("e2", "제국 2세대 공창 지대", "e2", 655, 320, 1750),
  e3: R("e3", "제국 3세대 심장부", "e3", 825, 320, 1350),
};

// ── 잡음 ──
const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += vnoise(x * f + i * 17.3, y * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
export function ridged(x, y, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { const r = 1 - Math.abs(vnoise(x * f + i * 31.7, y * f + i * 4.3)); s += r * r * a; n += a; a *= 0.5; f *= 2.1; } return s / n; }
export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ── 거리 ──
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  const x = ax + dx * t, z = az + dz * t;
  return [Math.hypot(px - x, pz - z), t];
}
function polySigned(P, x, z) {   // 안쪽 +
  let inside = false, md = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    md = Math.min(md, segDist(x, z, xi, zi, xj, zj)[0]);
  }
  return inside ? md : -md;
}
export function lineDist(pts, x, z) { let md = 1e9, seg = 0, tt = 0; for (let i = 0; i < pts.length - 1; i++) { const [d, t] = segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (d < md) { md = d; seg = i; tt = t; } } return { d: md, s: seg + tt }; }

// 해안까지 거리(m, 땅 안쪽 +). 해안선은 잡음으로 들쭉날쭉
export function landD(x, z) {
  let d = polySigned(LAND, x, z) + fbm(x / 520, z / 520, 3) * 110 + fbm(x / 140, z / 140, 2) * 22;
  for (const I of ISLANDS) {
    const ex = (x - I.c[0]) / I.rx, ez = (z - I.c[1]) / I.ry, e = Math.hypot(ex, ez);
    d = Math.max(d, (1 - e) * Math.min(I.rx, I.ry) + fbm(x / 120, z / 120, 2) * 26);
  }
  return d;
}

// 세력 무게 (경계에서 부드럽게 섞인다)
const OWN = Object.keys(REGIONS_POLY);
export function weights(x, z) {
  const w = {}; let s = 0;
  for (const k of OWN) { const v = smooth(-200, 200, polySigned(REGIONS_POLY[k], x, z) + fbm(x / 300 + 7, z / 300, 2) * 70); w[k] = v; s += v; }
  if (s < 1e-4) { w.e3 = 1; s = 1; }
  for (const k of OWN) w[k] /= s;
  return w;
}

// ── 세력별 땅 모양 ──
const SHAPE = {
  hanul: (x, z) => 7 + fbm(x / 900, z / 900) * 16 + fbm(x / 230, z / 230, 3) * 4,
  haerim: (x, z) => 6 + Math.max(0, fbm(x / 600, z / 600)) * 38 + fbm(x / 180, z / 180, 3) * 5,
  bukseol: (x, z) => { const n = smooth(-500, -2300, z); return 24 + fbm(x / 800, z / 800) * 30 + ridged(x / 650, z / 650, 5) * (60 + 230 * n); },
  jeoksa: (x, z) => { const h = 34 + fbm(x / 700, z / 700) * 26 + ridged(x / 400, z / 400, 3) * 26; const t = Math.floor(h / 13) * 13; return t + smooth(0.55, 1, (h - t) / 13) * 13; },
  namdo: (x, z) => 4 + fbm(x / 200, z / 200, 3) * 8,
  e1: (x, z) => 10 + fbm(x / 600, z / 600) * 9 + fbm(x / 120, z / 120, 2) * 1.5,
  e2: (x, z) => { const n = smooth(-900, -1700, z); return 22 + fbm(x / 500, z / 500) * 22 + ridged(x / 450, z / 450, 4) * (25 + 170 * n); },
  e3: (x, z) => 12 + fbm(x / 700, z / 700) * 6 + Math.max(0, ridged(x / 260, z / 260, 2) - 0.72) * 90,
};

// 거점 평탄지 높이(거점 중심의 원래 높이, 바다 위로)
const padCache = new Map();
function rawH(x, z) {
  const w = weights(x, z); let h = 0;
  for (const k of OWN) if (w[k] > 0.002) h += w[k] * SHAPE[k](x, z);
  return h;
}
export function padH(s) {
  if (!padCache.has(s.id)) padCache.set(s.id, s.t === "port" ? 4 : Math.max(5, rawH(s.p[0], s.p[1]) * 0.9));
  return padCache.get(s.id);
}
const VOLC = SITE.island.p;

// ── 높이 (대륙 좌표) ──
export function height(x, z) {
  const d = landD(x, z);
  let h;
  if (d < 0) h = -2.5 - Math.min(-d, 500) * 0.055 + fbm(x / 90, z / 90, 2) * 1.2;
  else {
    const c = smooth(0, 260, d), body = rawH(x, z);
    h = lerp(1.6, body, c);
    if (d < 70 && body > 26) h = lerp(h, body * 0.7, smooth(60, 10, d) * 0.6);   // 높은 땅은 바닷가가 벼랑
  }
  // 전선: 포탄 구덩이 무인지대
  const fd = lineDist(FRONT, x, z).d;
  if (fd < 260 && d > 0) { const k = smooth(260, 60, fd), cr = Math.max(0, vnoise(x / 22, z / 22) - 0.35) * 9 + Math.max(0, vnoise(x / 9 + 50, z / 9) - 0.5) * 3; h -= cr * k; }
  // 강
  for (const r of RIVERS) {
    const L = lineDist(r.pts, x, z); if (L.d > r.w * 6) continue;
    const bed = -1.6, bank = r.canyon ? smooth(r.w * 0.6, r.w * 2.6, L.d) : smooth(r.w * 0.5, r.w * 3.2, L.d);
    const target = r.canyon ? lerp(bed, h, Math.pow(bank, 0.35)) : lerp(bed, h, bank);
    h = Math.min(h, target);
  }
  // 거점 평탄지
  for (const s of SITES) {
    if (!s.r) continue;
    const dd = Math.hypot(x - s.p[0], z - s.p[1]); if (dd > s.r + 160) continue;
    let f = 1 - smooth(s.r, s.r + 150, dd);
    if (s.t === "port") f *= smooth(-40, 40, d);
    h = lerp(h, padH(s), f);
  }
  // 화산섬
  const vd = Math.hypot(x - VOLC[0], z - VOLC[1]);
  if (vd < 330) { const cone = (1 - smooth(0, 330, vd)) * 150, crater = (1 - smooth(18, 52, vd)) * 40; h = Math.max(h, 2 + cone - crater + fbm(x / 40, z / 40, 2) * 4 * (vd / 330)); }
  return h;
}

// ── 색 (대륙 좌표) ──
const C = {
  hanul: [0x6f9a4a, 0x8aa858, 0x5d8a3e], haerim: [0x7a9a5a, 0x9aa870, 0x6a8a4a], bukseol: [0xdfe8ef, 0xc9d6e0, 0x93a2ae], jeoksa: [0xc0703c, 0xd48a50, 0x9a5432],
  namdo: [0x5fa04a, 0x7ab85a, 0x4a8a3a], e1: [0x7a7a72, 0x8a8880, 0x5e5e58], e2: [0x4a3e36, 0x5e4a3a, 0x3a302a], e3: [0x2a2228, 0x3a2a30, 0x1e181c],
};
const hex = (c) => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
const CH = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, v.map(hex)]));
const ROADC = hex(0x3e3e42), SAND = hex(0xd9c49a), SNOW = hex(0xf2f6fa), ROCK = hex(0x7a746c), MUD = hex(0x5a4a3a), ASH = hex(0x3a3634), BED = hex(0x6a6248), PAD = hex(0x8a8a86), LAVA = hex(0x4a2a22);
export function colorAt(x, y, z, slope) {
  const w = weights(x, z), n = fbm(x / 160, z / 160, 3), n2 = vnoise(x / 40, z / 40);
  let r = 0, g = 0, b = 0;
  for (const k of OWN) {
    if (w[k] < 0.002) continue;
    const P = CH[k], t = n * 0.5 + 0.5, a = t < 0.5 ? P[0] : P[1], c = lerp(0, 1, Math.abs(t - 0.5) * 2), q = n2 > 0.4 ? P[2] : null;
    let cr = lerp(a[0], P[2][0], c * 0.3), cg = lerp(a[1], P[2][1], c * 0.3), cb = lerp(a[2], P[2][2], c * 0.3);
    if (q) { cr = lerp(cr, q[0], 0.4); cg = lerp(cg, q[1], 0.4); cb = lerp(cb, q[2], 0.4); }
    r += cr * w[k]; g += cg * w[k]; b += cb * w[k];
  }
  let col = [r, g, b];
  const mix = (c2, t) => { col = [lerp(col[0], c2[0], t), lerp(col[1], c2[1], t), lerp(col[2], c2[2], t)]; };
  // 눈: 북쪽 높은 곳 (북설·2세대 북부)
  const snowLine = 70 + (z + 1500) * 0.04;
  if (y > snowLine) mix(SNOW, smooth(snowLine, snowLine + 30, y) * (slope < 0.5 ? 1 : 0.4));
  if (slope > 0.42) mix(ROCK, smooth(0.42, 0.7, slope) * 0.8);
  if (y < 2.4 && y > -1) mix(SAND, smooth(2.4, 1.2, y));
  if (y <= -1) mix(BED, 0.7);
  const fd = lineDist(FRONT, x, z).d; if (fd < 240) mix(MUD, smooth(240, 80, fd) * 0.75);
  for (const [a, bb] of ROADS) { const dd = lineDist([a, bb], x, z).d; if (dd < 7) { mix(ROADC, smooth(7, 3, dd) * 0.85); break; } }
  for (const s of SITES) { if (!s.r) continue; const dd = Math.hypot(x - s.p[0], z - s.p[1]); if (dd < s.r) mix(s.o.startsWith("e") ? ASH : PAD, smooth(s.r, s.r * 0.5, dd) * 0.45); }
  const vd = Math.hypot(x - VOLC[0], z - VOLC[1]); if (vd < 200) mix(LAVA, smooth(200, 60, vd) * 0.8);
  if (w.e3 > 0.3) { const vein = Math.abs(fbm(x / 260, z / 260, 2)); if (vein < 0.025) mix(hex(0xb81a2a), (1 - vein / 0.025) * w.e3 * 0.8); }   // 땅을 가르는 붉은 심장맥
  return (Math.round(Math.min(1, col[0]) * 255) << 16) | (Math.round(Math.min(1, col[1]) * 255) << 8) | Math.round(Math.min(1, col[2]) * 255);
}
export const ownerAt = (x, z) => { const w = weights(x, z); return OWN.reduce((a, k) => (w[k] > w[a] ? k : a), OWN[0]); };
export const isLand = (x, z) => landD(x, z) > 0;
