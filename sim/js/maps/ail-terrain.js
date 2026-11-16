// 에일 행성 지형: 높이 함수·색 함수와 섬·다리 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 트랙 높이 계산이 모두 같은 함수를 쓴다)
//  · 가운데: 하이브 섬(껍질 돔 도시와 합창당)   · 네 모서리: 첨탑 숲(북서)·요람(북동)·포자 들판(남서)·빛 늪(남동)
//  · 네 방위: 디딤 섬(북: 노래 바위, 동: 알 둥지, 남: 어미나무, 서: 숨구멍)
//  · 섬과 섬 사이는 안개가 차오른 깊은 틈. 살아 있는 뿌리로 덮인 좁은 등성이(다리)가 섬들을 잇는다

export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── 섬 [이름, x, z, 반경, 윗면 높이] ──
export const ISL = {
  hive: { x: 0, z: 0, R: 100, top: 0 },
  spire: { x: -160, z: -160, R: 82, top: 16 },
  cradle: { x: 160, z: -160, R: 82, top: 6 },
  spore: { x: -160, z: 160, R: 82, top: -4 },
  lagoon: { x: 160, z: 160, R: 82, top: 2 },
  north: { x: 0, z: -202, R: 46, top: 9 },
  east: { x: 202, z: 0, R: 46, top: 4 },
  south: { x: 0, z: 202, R: 46, top: -2 },
  west: { x: -202, z: 0, R: 46, top: 12 },
};
const LIST = Object.entries(ISL).map(([id, v], i) => ({ id, i, ...v }));
export const ABYSS = -150;   // 틈 바닥(안개에 잠겨 보이지 않는다)
export const MIST = [-26, -52, -88];   // 안개 층 높이

// 빛 늪: 남동 섬 안쪽의 얕은 분지(바닥이 고르지 않아 기지가 앉지 않는다), 수면은 LAKE_Y
export const LAKE = { x: 176, z: 178, R: 40 }, LAKE_Y = -2.2;

// ── 다리(등성이): 두 섬을 중심선으로 잇는다. 양 끝은 각 섬 안쪽 0.72R 지점, 높이는 두 섬 윗면 사이를 매끄럽게 ──
const RING = ["west", "spire", "north", "cradle", "east", "lagoon", "south", "spore"];
const PAIRS = [...RING.map((a, i) => [a, RING[(i + 1) % RING.length]]), ["hive", "north"], ["hive", "east"], ["hive", "south"], ["hive", "west"]];
export const BRIDGE_W = 18;
export const BRIDGES = PAIRS.map(([ia, ib]) => {
  const A = ISL[ia], B = ISL[ib], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const ka = ia === "hive" ? 0.82 : 0.72, kb = 0.72;
  const a = [A.x + ux * A.R * ka, A.z + uz * A.R * ka], b = [B.x - ux * B.R * kb, B.z - uz * B.R * kb];
  // 틈 위로 걸린 구간(양 섬 가장자리 사이)
  const s0 = A.R * (1 - ka), s1 = Math.hypot(b[0] - a[0], b[1] - a[1]) - B.R * (1 - kb);
  return { a, b, ha: A.top, hb: B.top, ux, uz, len: Math.hypot(b[0] - a[0], b[1] - a[1]), span: [s0, s1], from: ia, to: ib, ring: ia !== "hive" };
});

// 점에서 다리 중심선까지: [거리, 진행 비율 t, 마루 높이]
function bridgeAt(x, z, B) {
  const dx = B.b[0] - B.a[0], dz = B.b[1] - B.a[1], l2 = dx * dx + dz * dz;
  const t = Math.min(1, Math.max(0, ((x - B.a[0]) * dx + (z - B.a[1]) * dz) / l2));
  const d = Math.hypot(x - B.a[0] - dx * t, z - B.a[1] - dz * t);
  const k = t * t * (3 - 2 * t);
  return [d, t, B.ha + (B.hb - B.ha) * k];
}
export function bridgeInfo(x, z) {
  let best = null;
  for (const B of BRIDGES) { const r = bridgeAt(x, z, B); if (!best || r[0] < best[0]) best = [...r, B]; }
  return best;
}

// 섬 윤곽: 각도에 따라 반경이 들쭉날쭉하다
const edgeR = (I, x, z) => I.R * (0.9 + 0.2 * fbm(x * 0.022 + I.i * 13.1, z * 0.022 - I.i * 7.3, 3));
// 섬 안 표면: 낮은 둔덕과 잔물결
function surface(I, x, z) {
  let h = (fbm(x * 0.03 + 5, z * 0.03 + 3, 3) - 0.5) * 3.2 + (vnoise(x * 0.11, z * 0.11) - 0.5) * 0.7;
  if (I.id === "lagoon") {
    const d = Math.hypot(x - LAKE.x, z - LAKE.z);
    const bowl = 1 - sm(LAKE.R - 6, LAKE.R + 10, d);
    h = h * (1 - bowl) + bowl * (-I.top - 7 + (vnoise(x * 0.16, z * 0.16) - 0.5) * 6);   // 분지 바닥은 늪 수면보다 낮고 울퉁불퉁
  }
  if (I.id === "spire") h += (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 3;
  return h;
}

// 섬 하나의 높이(가장자리 밖은 가파른 절벽)
function islandH(I, x, z) {
  const d = Math.hypot(x - I.x, z - I.z);
  if (d > I.R * 1.15 + 60) return -1e9;
  const e = d - edgeR(I, x, z);
  if (e < 0) return I.top + surface(I, x, z) * sm(0, 10, -e) - sm(-7, 0, e) * 2.6;
  return I.top - 2.6 - e * 5.5 - (vnoise(x * 0.2, z * 0.2) - 0.5) * e * 0.6;
}

export function height(x, z) {
  let h = ABYSS + (vnoise(x * 0.31, z * 0.31) - 0.5) * 16 + (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 40;
  for (const I of LIST) { const v = islandH(I, x, z); if (v > h) h = v; }
  for (const B of BRIDGES) {
    const [d, t, crest] = bridgeAt(x, z, B), half = BRIDGE_W / 2 + (vnoise(x * 0.09, z * 0.09) - 0.5) * 3;
    if (d > half + 40) continue;
    const top = crest - 0.4 + (vnoise(x * 0.13 + 3, z * 0.13) - 0.5) * 0.8;
    const v = d < half ? top - sm(half - 4, half, d) * 1.2 : top - 1.2 - (d - half) * 4.2;
    if (v > h) h = v;
  }
  return h;
}

// 발 딛을 땅인가(틈·안개 위가 아니다): 무작위 지점 고르기에 쓴다
export const land = (x, z) => height(x, z) > -14;

// 어느 섬 위인가 (없으면 null)
export function islandOf(x, z, m = 0) {
  for (const I of LIST) if (Math.hypot(x - I.x, z - I.z) < edgeR(I, x, z) - m) return I;
  return null;
}

// 색: 윗면은 보라 이끼와 청록 이끼 얼룩, 섬 가장자리는 분홍 꽃가루, 절벽은 짙은 자주 바위, 틈 바닥은 먹빛
const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
export function colorFn(x, y, z, slope) {
  if (y < -40) return mix(0x1c1236, 0x2e1d52, sm(-150, -60, y));
  const n = fbm(x * 0.018 + 40, z * 0.018 + 11, 3), n2 = vnoise(x * 0.07, z * 0.07);
  let c = n > 0.56 ? 0x36b0a2 : n > 0.5 ? 0x4c8fb4 : n2 > 0.72 ? 0x9a5ad6 : 0x7a48c0;
  const I = islandOf(x, z, -4);
  if (I && I.id === "spore") c = mix(c, n2 > 0.5 ? 0xc2559e : 0x8a3f9e, 0.55);
  if (I && I.id === "spire") c = mix(c, 0x5a7ad6, 0.35);
  if (I && I.id === "lagoon" && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.R + 6) c = 0x1f5a6a;
  const bi = bridgeInfo(x, z);
  if (bi && bi[0] < BRIDGE_W / 2 + 1 && !islandOf(x, z, 6)) c = mix(0x5b3a7c, 0x6e4a8e, n2);   // 뿌리 다리 마루
  if (slope > 0.3) c = mix(c, y > -12 ? 0x5a3a80 : 0x3a2658, sm(0.3, 0.55, slope));
  return c;
}

// ── 순환 길: 바깥 여덟 섬을 다리로 잇는 고리(호송 트럭·견인 경로). 섬 위는 두 다리 끝을 곧게 잇는다 ──
export const ROAD = (() => {
  const out = [], ring = BRIDGES.filter((b) => b.ring);
  for (const B of ring) { out.push(B.a); out.push([(B.a[0] * 2 + B.b[0]) / 3, (B.a[1] * 2 + B.b[1]) / 3]); out.push([(B.a[0] + B.b[0] * 2) / 3, (B.a[1] + B.b[1] * 2) / 3]); out.push(B.b); }
  return out;
})();
