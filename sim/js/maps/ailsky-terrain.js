// 폭풍 무덤 지형: 높이 함수·색 함수, 고원(메사)·뼈 다리·순환 길 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 코스 높이 계산이 모두 같은 함수를 쓴다)
//  · 가운데 두 고원: 서쪽 고원(기함의 꼬리)·동쪽 고원(기함의 머리). 둘 사이 협곡 위로 기함 '별삼킴'의 등뼈가 걸려 있다
//  · 남: 연합 전진 캠프 고원(출발)   · 남서: 빈 합창 둥지 고원   · 남동: 등대 고원
//  · 북: 번개 첨탑 고원   · 북동: 폐허 전초 고원
//  · 고원 사이는 폭풍 구름 바다로 떨어지는 깊은 틈. 바위 등성이 위에 등뼈를 얹은 '뼈 다리' 일곱 개가 고원을 고리로 잇는다

export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export function fbm(x, y, o = 3) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── 고원 [중심 x, z, 반경, 윗면 높이, 윤곽 모서리 수 k·위상 ph] ──
export const PLT = {
  south: { x: 0, z: 168, R: 72, top: 0, k: 5, ph: 0.6 },
  west: { x: -120, z: -38, R: 88, top: 6, k: 6, ph: 1.9 },
  east: { x: 105, z: -52, R: 78, top: 2, k: 5, ph: 3.1 },
  north: { x: -25, z: -180, R: 56, top: 12, k: 4, ph: 0.3 },
  ne: { x: 174, z: -188, R: 52, top: 8, k: 5, ph: 2.2 },
  sw: { x: -165, z: 140, R: 60, top: -3, k: 6, ph: 4.0 },
  se: { x: 165, z: 120, R: 52, top: 4, k: 4, ph: 1.1 },
};
const LIST = Object.entries(PLT).map(([id, v], i) => { v.id = id; v.i = i; return v; });
export const ABYSS = -190;              // 틈 바닥(구름 바다에 잠겨 보이지 않는다)
export const SEA = [-52, -76, -104];    // 구름 바다 층 높이(위 → 아래)

// 고원 윤곽: 잡음 + 각진 모서리(메사답게 반듯한 변이 생긴다). 음수면 안쪽
function edge(I, x, z) {
  const dx = x - I.x, dz = z - I.z, d = Math.sqrt(dx * dx + dz * dz);
  return d - I.R * (0.9 + 0.2 * fbm(x * 0.021 + I.i * 13.1, z * 0.021 - I.i * 7.3, 3) + 0.045 * Math.cos(Math.atan2(dz, dx) * I.k + I.ph));
}
// 윗면: 낮은 둔덕과 잔물결
const surf = (x, z) => (fbm(x * 0.028 + 5, z * 0.028 + 3, 3) - 0.5) * 2.6 + (vnoise(x * 0.12, z * 0.12) - 0.5) * 0.5;
// 고원 하나의 높이: 가장자리 밖은 가파른 벽 → 좁은 선반 → 다시 벽(층진 메사 절벽)
function plateauH(I, x, z) {
  const dx = x - I.x, dz = z - I.z, lim = I.R * 1.2 + 50;
  if (dx * dx + dz * dz > lim * lim) return -1e9;
  const e = edge(I, x, z);
  if (e < 0) return I.top + surf(x, z) * sm(0, 12, -e) - sm(-6, 0, e) * 1.4;
  const q = Math.max(0, e + (vnoise(x * 0.17, z * 0.17) - 0.5) * 2.6);
  return I.top - 1.4 - (q < 7 ? q * 6.4 : q < 13 ? 44.8 + (q - 7) * 0.9 : 50.2 + (q - 13) * 5.4);
}
function plateausH(x, z) { let h = -1e9; for (const I of LIST) { const v = plateauH(I, x, z); if (v > h) h = v; } return h; }

// 어느 고원 위인가 (가장자리에서 m 안쪽까지, 없으면 null)
export function plateauOf(x, z, m = 0) {
  for (const I of LIST) { const dx = x - I.x, dz = z - I.z; if (dx * dx + dz * dz < I.R * I.R * 1.5 && edge(I, x, z) < -m) return I; }
  return null;
}

// ── 뼈 다리: 두 고원 안쪽의 정해 둔 점을 잇는 등성이. 높이는 두 고원 윗면 사이를 매끄럽게 ──
export const BRIDGE_W = 17;
const SPANS = [
  ["south", "se", [48, 160], [128, 128]],
  ["se", "east", [152, 88], [128, 2]],
  ["east", "ne", [126, -116], [152, -162]],
  ["ne", "north", [134, -196], [10, -184]],
  ["north", "west", [-48, -152], [-82, -96]],
  ["west", "sw", [-140, 22], [-162, 98]],
  ["sw", "south", [-128, 172], [-50, 190]],
];
export const BRIDGES = SPANS.map(([from, to, a, b]) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, A = PLT[from], B = PLT[to];
  // 틈 위에 걸린 구간: 고원만의 높이가 윗면보다 뚝 떨어지는 곳
  let s0 = 0, s1 = len;
  for (let s = 0; s <= len; s += 1) { if (plateausH(a[0] + ux * s, a[1] + uz * s) < Math.min(A.top, B.top) - 9) { s0 = s; break; } }
  for (let s = len; s >= 0; s -= 1) { if (plateausH(a[0] + ux * s, a[1] + uz * s) < Math.min(A.top, B.top) - 9) { s1 = s; break; } }
  return { a, b, ha: A.top, hb: B.top, ux, uz, len, span: [s0, s1], from, to };
});
// 점에서 다리 중심선까지: [거리, 진행 비율 t, 마루 높이]
function bridgeAt(x, z, B) {
  const t = Math.min(1, Math.max(0, ((x - B.a[0]) * B.ux + (z - B.a[1]) * B.uz) / B.len));
  const d = Math.hypot(x - B.a[0] - B.ux * B.len * t, z - B.a[1] - B.uz * B.len * t);
  return [d, t, B.ha + (B.hb - B.ha) * (t * t * (3 - 2 * t))];
}
// 다리 위(틈 구간)인가: 구조물·식생 배치에서 길을 비울 때 쓴다
export const onBridge = (x, z, m = 0) => BRIDGES.some((B) => { const t = (x - B.a[0]) * B.ux + (z - B.a[1]) * B.uz, d = Math.abs((x - B.a[0]) * -B.uz + (z - B.a[1]) * B.ux); return t > B.span[0] - 6 && t < B.span[1] + 6 && d < BRIDGE_W / 2 + 3 + m; });

export function height(x, z) {
  let h = ABYSS + (vnoise(x * 0.045, z * 0.045) - 0.5) * 36;
  const p = plateausH(x, z);
  if (p > h) h = p;
  for (const B of BRIDGES) {
    const bx = x - B.a[0], bz = z - B.a[1], t = bx * B.ux + bz * B.uz;
    if (t < -60 || t > B.len + 60) continue;
    const dl = Math.abs(bx * -B.uz + bz * B.ux);
    if (dl > 60) continue;
    const [d, , crest] = bridgeAt(x, z, B), half = BRIDGE_W / 2 + (vnoise(x * 0.09, z * 0.09) - 0.5) * 2.4;
    const top = crest - 0.5 + (vnoise(x * 0.13 + 3, z * 0.13) - 0.5) * 0.6;
    const v = d < half ? top - sm(half - 3.5, half, d) * 1.1 : top - 1.1 - (d - half) * 4.6;
    if (v > h) h = v;
  }
  return h;
}

// 발 딛을 땅인가(틈·구름 바다 위가 아니다): 무작위 지점 고르기에 쓴다
export const land = (x, z) => height(x, z) > -16;

// 번개 맞은 자리(그을음 원): 색 함수와 첨탑 배치가 함께 쓴다 [x, z, 반경]
export const SCORCH = [[-56, -196, 15], [-22, -214, 13], [8, -208, 12], [-62, -166, 10], [-110, 36, 9], [150, -24, 9], [40, 196, 8], [-196, 168, 8]];

// 색: 윗면은 잿빛 남색 이끼와 청록 이끼 얼룩, 가장자리는 창백한 재, 절벽은 먹남색 바위, 다리 마루는 오래된 뼈빛
const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
export function colorFn(x, y, z, slope) {
  if (y < -44) return mix(0x0b0c1c, 0x1c1e3c, sm(-190, -50, y));
  const n = fbm(x * 0.017 + 40, z * 0.017 + 11, 3), n2 = vnoise(x * 0.075, z * 0.075);
  let c = n > 0.58 ? 0x3f6670 : n > 0.51 ? 0x4b5a86 : n2 > 0.72 ? 0x6a5a96 : 0x444a78;
  const I = plateauOf(x, z, -5);
  if (I) {
    if (I.id === "north") c = mix(c, n2 > 0.55 ? 0x2a2838 : 0x4a4050, 0.6);        // 번개에 그을린 땅
    else if (I.id === "sw") c = mix(c, n2 > 0.5 ? 0x6a5a7e : 0x4a3a66, 0.6);        // 둥지의 병든 보랏빛
    else if (I.id === "south") c = mix(c, 0x3f7078, 0.3);
    else if (I.id === "se" || I.id === "ne") c = mix(c, 0x4a5f9a, 0.3);
    const e = edge(I, x, z);
    if (e > -7) c = mix(c, 0x7a7a9c, sm(-7, -1, e) * 0.7);                             // 가장자리의 재
  }
  for (const [sx, sz, sr] of SCORCH) {
    const d = Math.hypot(x - sx, z - sz);
    if (d < sr) c = d > sr * 0.72 ? mix(c, 0x9a6a2a, 0.6) : mix(0x1c1a26, 0x2e2630, n2);   // 그을음 원: 안은 숯빛, 테는 호박빛
  }
  if (!plateauOf(x, z, 5)) for (const B of BRIDGES) { const r = bridgeAt(x, z, B); if (r[0] < BRIDGE_W / 2 + 0.5) { c = mix(0x8d8474, 0xa59a86, n2); break; } }
  if (slope > 0.3) c = mix(c, y > -14 ? 0x34365c : 0x22233f, sm(0.3, 0.55, slope));
  return c;
}

// ── 순환 길: 일곱 고원을 뼈 다리로 잇는 고리(탐사 트럭·호송 경로). 기지·둥지·기함 뼈대를 비켜 간다 ──
// 서쪽 고원에서는 기함의 치솟는 꼬리뼈 밑을, 동쪽 고원에서는 목뼈 밑을 지난다
export const ROAD = [
  [-28, 138], [0, 131], [30, 139], [48, 160], [88, 144], [128, 128],          // 남 고원 → 남동 다리
  [146, 112], [152, 88], [140, 45], [128, 2],                                  // 남동 고원 → 동 다리
  [116, -36], [103, -64], [100.6, -82], [102, -100], [113, -112], [126, -116], // 동 고원: 목뼈 밑
  [139, -139], [152, -162],                                                     // 북동 다리
  [146, -180], [134, -196], [92, -192], [52, -188], [10, -184],                // 북동 고원 → 북 다리(가장 긴 다리)
  [-20, -168], [-48, -152], [-65, -124], [-82, -96],                           // 북 고원 → 서 다리
  [-83, -74], [-83.4, -55], [-88, -30], [-112, -2], [-140, 22],                // 서 고원: 꼬리뼈 밑
  [-151, 60], [-162, 98], [-173, 126], [-166, 158], [-146, 172], [-128, 172],  // 남서 다리 → 남서 고원
  [-89, 181], [-50, 190], [-45, 160],                                           // 남 다리 → 남 고원
];
