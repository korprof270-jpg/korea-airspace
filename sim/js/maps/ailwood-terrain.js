// 포자 숲 지형·배치: 높이 함수·색 함수와 모든 구역 좌표
// (three.js 에 의존하지 않는다 — 지형 메시, 충돌, 코스 높이 계산, 구조물 배치가 모두 같은 값을 쓴다)
//  · 가운데: 어미나무 그루터기(속이 빈 줄기, 뿌리 아치 넷, 버팀뿌리 일곱)
//  · 그 둘레 반경 96·120 m: 거대 버섯 고리(슬라럼 기둥) — 안쪽 고리는 높고(84~96 m) 바깥 고리는 낮다(62~72 m)
//  · 북동 모서리: 벼랑 위 고원과 포자 폭포(선반 버섯 두 단, 뒤쪽 동굴)   · 폭포 못에서 동쪽·남쪽을 돌아 남서로 빠지는 빛 개울
//  · 숲길(탐사 트럭·호송): 버섯 고리 바깥을 한 바퀴 도는 이끼 길, 개울을 두 번 건넌다(여울)
//  · 남: 출발 빈터   · 남서: 솜포자 숲(하늘이 트인 곳)   · 서: 속 빈 통나무 굴   · 북서: 적 진지와 쓰러진 거대 버섯
//  · 남동: 등불꽃 들판과 아군 본부   · 꺼진 구멍 셋
import { hash, vnoise, fbm, sm } from "./ail-terrain.js";

export { hash, vnoise, fbm, sm };
export const DEG = Math.PI / 180, SIZE = 235;
export const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
const angD = (a, b) => ((a - b) % 360 + 540) % 360 - 180;   // 두 각(도)의 차 −180..180

// ── 어미나무 ──
export const MT = [0, -10];
export const WALL = 5;                                        // 줄기 벽 두께
export const trunkR = (y) => (y < 30 ? 31 + 8 * Math.pow(1 - Math.max(0, y) / 30, 1.7) : 31 - (y - 30) * 0.015);   // 바깥 반경
// 부러진 꼭대기 높이(방위마다 다르다). 동쪽(10°)이 가장 크게 떨어져 나갔다
export const trunkTop = (deg) => { const a = deg * DEG; return 118 + 7 * Math.sin(2 * a + 2.2) + 4 * Math.sin(5 * a + 1.9) + 2.5 * Math.sin(11 * a + 0.4) - 20 * Math.exp(-((angD(deg, 10) / 28) ** 2)); };
// 뿌리 아치(줄기 밑동의 문) [방위, 반폭, 높이] — 남(출발 쪽)·서(뿌리 굴 쪽)·북동(폭포 쪽)·북북서(작은 틈)
export const OPEN = [{ a: 90, w: 9.5, h: 21 }, { a: 180, w: 9.5, h: 21 }, { a: 315, w: 9.5, h: 21 }, { a: 250, w: 7, h: 15 }];
export const KNOT = { a: 200, y: 72, r: 9 };                  // 옹이구멍
// 줄기 벽의 (방위, 높이)가 뚫린 곳인가. m: 여유
export function trunkHole(deg, y, m = 0) {
  for (const o of OPEN) if (y < o.h + m) {
    const s = Math.abs(angD(deg, o.a)) * DEG * 36, hw = o.w * Math.pow(Math.max(0, 1 - (Math.max(0, y) / (o.h + m)) ** 2), 0.42) + m;
    if (s < hw) return true;
  }
  return Math.hypot(angD(deg, KNOT.a) * DEG * 30.5, y - KNOT.y) < KNOT.r + m;
}
// 버팀뿌리 [방위, 땅에 닿는 반경, 줄기에서 갈라지는 높이, 굵기]
export const BUTTRESS = [[122, 74, 36, 4.2], [148, 66, 31, 3.6], [216, 78, 38, 4.4], [281, 70, 33, 3.8], [350, 76, 37, 4.2], [18, 64, 30, 3.6], [46, 72, 35, 4.0]];
export const HEART_Y = 19;                                    // 심장 옹이 높이(바닥에서)
export const ringPt = (deg, r) => [MT[0] + Math.cos(deg * DEG) * r, MT[1] + Math.sin(deg * DEG) * r];

// ── 거대 버섯 ──  { x, z, H(갓 밑 높이, 땅에서), R(갓 반경), hut(갓 위 집 수), tone }
// 고리: 방위 75° + 30°·i. 짝수 i 는 안쪽(96 m), 홀수 i 는 바깥(120 m)에 대가 서고, 코스는 그 반대쪽으로 지난다
export const RING_A = (i) => 75 + 30 * i;
export const POLE = (i) => ringPt(RING_A(i), i % 2 ? 120 : 96);
export const LANE = (i) => ringPt(RING_A(i), i % 2 ? 96 : 120);
const R1 = [null, null, [84, 24, 2], [64, 20, 1], [92, 27, 3], [70, 22, 1], [96, 28, 3], [62, 20, 1], [88, 25, 0], [72, 22, 1], [94, 26, 0], [66, 21, 1]];
export const CAPS = [];
for (let i = 2; i < 12; i++) { const [x, z] = POLE(i); CAPS.push({ id: "r" + i, x, z, H: R1[i][0], R: R1[i][1], hut: R1[i][2], tone: i % 4 }); }
export const capOf = (i) => CAPS[i - 2];                      // 고리 버섯 i (2..11)
// 바깥 숲(숲길 밖): 새끼 둥지 넷 곁, 본부 곁, 고원 위
[[45, -212, 55, 20, 1], [218, 36, 48, 18, 1], [-218, -84, 60, 22, 1], [126, 214, 45, 17, 1], [216, 206, 70, 24, 2], [-222, 25, 75, 22, 2], [-220, -222, 80, 26, 0],
  [-75, -182, 65, 20, 1], [88, -216, 52, 16, 0], [216, -58, 50, 18, 1], [-32, 216, 58, 18, 0], [42, 222, 44, 15, 0], [212, -208, 50, 22, 2], [228, -160, 44, 16, 0], [-225, 110, 56, 19, 1]]
  .forEach(([x, z, H, R, hut], k) => CAPS.push({ id: "o" + k, x, z, H, R, hut, tone: (k + 1) % 4 }));
// 남쪽 문기둥(중간 크기 버섯): 출발 빈터에서 어미나무가 보이도록 낮게
export const MID = [{ x: POLE(0)[0], z: POLE(0)[1], H: 40, R: 11 }, { x: POLE(1)[0], z: POLE(1)[1], H: 46, R: 12 }];
// 덩굴다리: 안쪽 고리 갓과 갓(현), 갓과 어미나무 줄기(살)
export const CHORDS = [[10, 8], [8, 6], [6, 4], [4, 2]];
export const SPOKES = [[6, 90], [4, 88], [10, 92]];           // [고리 버섯, 줄기에 닿는 높이]

// ── 벼랑·포자 폭포(북동) ──
export const P0 = [262, -262], RC = 152, PLAT = 38;           // 고원: P0 에서 반경 RC 안쪽
export const U = [-Math.SQRT1_2, Math.SQRT1_2], V = [-Math.SQRT1_2, -Math.SQRT1_2];   // U: 벼랑 밖(남서), V: 벼랑을 따라(북서)
export const N0 = [P0[0] + U[0] * RC, P0[1] + U[1] * RC];     // 폭포 자리(벼랑 선 위)
export const fallsPt = (u, v) => [N0[0] + U[0] * u + V[0] * v, N0[1] + U[1] * u + V[1] * v];
export const SHELF = { lo: { c: fallsPt(-3, 0), R: 36, y: 19, t: 5 }, hi: { c: fallsPt(-15, 0), R: 26, y: 34, t: 4.5 } };   // 선반 버섯 두 단(윗면 높이 y+t)
export const POOL = fallsPt(29, 0), POOL_R = 15;

// ── 선(개울·숲길) 도구: 균일 캣멀-롬으로 촘촘히 뽑고, 격자에 담아 거리 조회 ──
function crSample(pts, closed, step = 4) {
  const n = pts.length, out = [], P = (i) => (closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function lineIndex(line, closed, reach = 16) {
  const C = 16, map = new Map(), n = line.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = line[i], b = line[(i + 1) % n];
    for (let ix = Math.floor((Math.min(a[0], b[0]) - reach) / C); ix <= Math.floor((Math.max(a[0], b[0]) + reach) / C); ix++)
      for (let iz = Math.floor((Math.min(a[1], b[1]) - reach) / C); iz <= Math.floor((Math.max(a[1], b[1]) + reach) / C); iz++) {
        const k = ix * 4096 + iz; let c = map.get(k); if (!c) map.set(k, (c = [])); c.push(i);
      }
  }
  // 가장 가까운 선분까지의 거리 (reach 밖이면 99)
  return (x, z) => {
    const c = map.get(Math.floor(x / C) * 4096 + Math.floor(z / C));
    if (!c) return 99;
    let best = 99;
    for (const i of c) {
      const a = line[i], b = line[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
      if (d < best) best = d;
    }
    return best;
  };
}

// 빛 개울: 폭포 못 → 벼랑 발치 → 동쪽 → 남쪽(출발 빈터 앞 디딤 껍질) → 남서로 빠진다
export const STREAM = crSample([POOL, [140, -108], [163, -75], [186, -22], [180, 38], [142, 94], [72, 118], [10, 128], [-40, 150], [-62, 195], [-72, 262]], false, 4);
export const streamD = lineIndex(STREAM, false);
// 숲길(닫힌 고리): 남 → 서 → 북 → 동. 개울을 남서·동에서 건넌다
export const TRAIL = crSample([[10, 160], [-48, 166], [-100, 150], [-135, 100], [-143, 35], [-141, -45], [-118, -112], [-50, -150], [30, -152], [95, -118], [137, -60], [147, 10], [158, 72], [148, 120], [105, 150], [50, 163]], true, 4);
export const trailD = lineIndex(TRAIL, true);
export const SHELLS = [[4, 128.4], [150.5, 82]];              // 개울의 디딤 껍질 자리(출발 빈터 앞, 동쪽 여울 곁)

// ── 임무 지점 ──
export const SPAWN = [0, 196];
export const DEPOTS = [[-212, 142], [60, -185], [205, -85], [205, 95]];
export const STRIKE = { turrets: [[-125, -150], [-150, -118], [-195, -122], [-212, -160], [-205, -205], [-150, -205]], core: [-165, -165] };
export const SUPPLY = { depot: [48, 198], camps: [[20, -195], [208, 10], [-200, -62], [100, 205]], turrets: [[-100, -195], [110, 185]] };
export const COMBAT = { blue: [175, 165], red: [-165, -165], depots: DEPOTS };
export const BOSS = [-205, 72, 190];
export const TITAN = [BOSS[0] * 0.6, BOSS[2] * 0.6];          // 거신이 서는 자리(솜포자 숲 빈터)
// 통나무 굴(서): 남쪽 끝 A → 북쪽 끝 B
export const LOG = { a: [-205, 62], b: [-198, 0], Ri: 7.6, Ro: 9.6 };
// 쓰러진 거대 버섯(북): 뿌리 쪽 → 갓 쪽
export const FALLEN = { a: [-118, -214], b: [-38, -210], R: 5.5, cap: 24 };
// 꺼진 구멍 [x, z, 반경, 깊이]
export const SINKS = [];

// 평평하게 고를 자리 [x, z, 반경]
const FLAT = [[MT[0], MT[1], 54], [SPAWN[0], SPAWN[1], 22], [COMBAT.blue[0], COMBAT.blue[1], 38], [COMBAT.red[0], COMBAT.red[1], 38], [STRIKE.core[0], STRIKE.core[1], 20],
  ...STRIKE.turrets.map((p) => [p[0], p[1], 7]), ...DEPOTS.map((p) => [p[0], p[1], 13]), [SUPPLY.depot[0], SUPPLY.depot[1], 13], ...SUPPLY.camps.map((p) => [p[0], p[1], 15]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 7]),
  [TITAN[0], TITAN[1], 24], [(LOG.a[0] + LOG.b[0]) / 2, (LOG.a[1] + LOG.b[1]) / 2, 34]];

// 숲 바닥의 완만한 둔덕
const hills = (x, z) => (fbm(x * 0.011 + 3.1, z * 0.011 + 7.7, 3) - 0.5) * 9 + (vnoise(x * 0.05 + 1, z * 0.05 + 4) - 0.5) * 1.1;
for (const p of FLAT) p.push(hills(p[0], p[1]));

// 벼랑 선의 반경: 잡음으로 들쭉날쭉하고, 폭포 자리는 안으로 파였다(동굴)
const cliffR = (x, z) => RC + (fbm(x * 0.03 + 11, z * 0.03 + 5, 2) - 0.5) * 10 - 27 * (1 - sm(20, 40, Math.hypot(x - N0[0], z - N0[1])));
export function plateau(x, z) {
  const d = Math.hypot(x - P0[0], z - P0[1]);
  if (d > RC + 30) return 0;
  const rc = cliffR(x, z);
  return PLAT * sm(rc + 6, rc - 7, d);
}

export function height(x, z) {
  let h = hills(x, z);
  for (const p of FLAT) { const d = Math.hypot(x - p[0], z - p[1]); if (d < p[2] + 18) h += (p[3] - h) * (1 - sm(p[2], p[2] + 18, d)); }
  // 맵 밖은 차츰 솟는 둔덕(지평선을 가린다)
  const e = Math.max(Math.abs(x), Math.abs(z));
  if (e > 250) h += sm(250, 430, e) * (8 + 22 * fbm(x * 0.006 + 9, z * 0.006 + 2, 2));
  h += plateau(x, z);
  // 개울 바닥과 폭포 못
  const sd = streamD(x, z);
  if (sd < 8) h -= 1.1 * (1 - sm(2.2, 7, sd));
  const pd = Math.hypot(x - POOL[0], z - POOL[1]);
  if (pd < POOL_R + 3) h -= 1.5 * (1 - sm(POOL_R - 6, POOL_R + 3, pd));
  // 꺼진 구멍: 가운데는 평평한 바닥, 가장자리는 살짝 솟은 테
  for (const [sx, sz, R, D] of SINKS) {
    const d = Math.hypot(x - sx, z - sz);
    if (d < R + 8) h += -D * (1 - sm(R * 0.38, R, d)) + 0.9 * Math.max(0, 1 - Math.abs(d - R - 1.5) / 5);
  }
  return h;
}

// 색: 청록·이끼·올리브 얼룩에 보라 이끼, 숲길은 밝은 이끼, 개울가는 젖은 청록, 벼랑은 짙은 바위
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.016 + 40, z * 0.016 + 11, 3), n2 = vnoise(x * 0.07, z * 0.07), n3 = vnoise(x * 0.21 + 7, z * 0.21);
  let c = n > 0.6 ? 0x2f9a86 : n > 0.52 ? 0x3d9a62 : n > 0.44 ? 0x5a9a42 : 0x2c7a64;
  if (n2 > 0.72 && n < 0.54) c = n3 > 0.5 ? 0x7a56b8 : 0x6446a0;
  else if (n3 > 0.8) c = mix(c, 0x9ad060, 0.35);
  const dm = Math.hypot(x - MT[0], z - MT[1]);
  if (dm < 62) c = mix(c, 0x2a5a48, 0.75 * (1 - sm(34, 62, dm)));
  const td = trailD(x, z);
  if (td < 3.4) c = mix(c, 0x9ab86a, 0.7 * (1 - sm(1.6, 3.4, td)));
  const sd = streamD(x, z);
  if (sd < 9) c = mix(c, sd < 3.4 ? 0x2ad0a0 : 0x1f7a6a, 0.85 * (1 - sm(5, 9, sd)));
  const pd = Math.hypot(x - POOL[0], z - POOL[1]);
  if (pd < POOL_R + 6) c = mix(c, 0x2ad0a0, 0.85 * (1 - sm(POOL_R - 2, POOL_R + 6, pd)));
  for (const [sx, sz, R] of SINKS) { const d = Math.hypot(x - sx, z - sz); if (d < R + 6) c = mix(c, d < R * 0.5 ? 0x1c6a52 : 0x16403a, 1 - sm(R - 2, R + 6, d)); }
  if (slope > 0.3) c = mix(c, y > 30 ? 0x2c5a5e : 0x244a50, sm(0.3, 0.55, slope));
  const e = Math.max(Math.abs(x), Math.abs(z));
  if (e > 240) c = mix(c, 0x2a6a58, sm(240, 420, e) * 0.7);
  return c;
}
