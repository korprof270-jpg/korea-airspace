// 빛 바다 제작 도구: 배치 상수(섬·둑길·합창당·리바이어던), 높이·색 함수, 순환 길, 그리고 이 맵만의 부품
// (기운 소라 탑, 가라앉은 돔, 산호 탑, 조개 껍데기, 연잎, 등불 기둥, 말미잘·불가사리·성게 같은 소품)
//  · 수면은 y = 0. 얕은 바다(바닥 −5 안팎)에 산호 섬 일곱과 가운데 합창당 환초가 떠 있고, 뿌리·뼈 둑길(땅 높이)이 섬을 잇는다
//  · 섬 윗면은 물 위 4 m 안팎의 평지. 둑길 마루는 폭 14 m — 트럭이 섬에서 섬으로 달린다
//  · 합창당 환초: 바깥 고리(윗면 4.4 m) 안쪽으로 계단 객석이 내려가 석호에 닿고, 한가운데가 '목구멍' 소용돌이(깊이 24 m 깔때기)
import * as THREE from "../../vendor/three.module.min.js";
import { M, tube, bead, lump, V3, DEG, ring, lumpG, ribDomeG, conchG, capG, shardG, shard, merged, Blinkers, lane,
  PEARL, PEARL2, SHELL, SHELL2, BONE, BONE2, ROOT, ROOT2, PINK, TEAL, TEAL2, LIME, GOLD } from "./ail-kit.js";

export { M, tube, bead, lump, V3, DEG, ring, lumpG, ribDomeG, conchG, capG, shardG, shard, merged, Blinkers, lane, PEARL, PEARL2, SHELL, SHELL2, BONE, BONE2, ROOT, ROOT2, PINK, TEAL, TEAL2, LIME, GOLD };

// ── 색: 밤바다의 진주·남색 껍질·청록/파랑 발광·분홍 산호, 빈 합창의 먹빛과 선홍 ──
export const NACRE = 0xcfe0f2, NACRE2 = 0x9fb4d8, INDIGO = 0x232a66, INDIGO2 = 0x34408c, DEEP = 0x141a44;
export const AQUA = 0x4fffe6, BLUE = 0x3aa0ff, BLUE2 = 0x6ad0ff, ROSE = 0xff6ab8, ROSE2 = 0xd04aa0, CORAL = 0xff8a6a, AMBER = 0xffc86a;
export const VOID = 0x15101e, VOID2 = 0x2a2034, BLOOD = 0xff2a66, ASH = 0x6a6478;
export const ALLY = 0xe9ebf0, ALLY2 = 0xb8bec8, ALLYO = 0xf07a1e;

export const WY = 0;   // 수면

// ── 결정론적 잡음 ──
export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

// ── 섬 (x, z, 반경, 윗면 높이, rho: 순환 길이 섬 안에서 도는 반경 비율) ──
export const ISL = {
  landing: { x: 0, z: 178, R: 50, top: 4.0, rho: 0.72 },      // 남: 등불 나루 (출발·연합 전진 캠프)
  pearl: { x: -154, z: 112, R: 58, top: 4.2, rho: 0.72 },     // 남서: 진주 여울 (아군 본부·진주 양식장)
  coral: { x: -176, z: -62, R: 54, top: 4.6, rho: 0.74 },     // 서: 산호 탑 숲
  nest: { x: -64, z: -176, R: 52, top: 4.4, rho: 0.7 },       // 북: 빈 합창 가시 둥지 (타격 목표)
  geyser: { x: 120, z: -150, R: 58, top: 4.2, rho: 0.72 },    // 북동: 물기둥 여울 (적 본부·간헐천)
  bone: { x: 182, z: 26, R: 46, top: 4.0, rho: 0.72 },        // 동: 뼈 여울 (리바이어던 꼬리 쪽)
  islet: { x: 122, z: 156, R: 17, top: 3.6, rho: 0.3 },       // 남동: 등대 암초
};
const LIST = Object.entries(ISL).map(([id, v], i) => Object.assign(v, { id, i, p: i * 1.7 + 0.6, w: v.R > 30 ? 0.07 : 0.04 }));
// 합창당 환초
export const CHOIR = { x: 0, z: -10, Ro: 84, Rp: 58, Ri: 42, top: 4.4, tR: 22, tD: 24, id: "choir", R: 84, rho: 75 / 84 };
// 북쪽 후진(어미 소라탑이 서는 둥근 곶)
export const APSE = { x: 0, z: -100, R: 21, top: 4.4, id: "apse", i: 9, p: 2.2, w: 0.03 };
// 합창당 중심 기준 극좌표 → [x, z] (각도: 0 동, 90 남, −90 북)
export const CP = (deg, d) => [CHOIR.x + Math.cos(deg * DEG) * d, CHOIR.z + Math.sin(deg * DEG) * d];

// 리바이어던: 갈비 굴은 A(머리 쪽) → B(꼬리 쪽). 목은 합창당 쪽으로 굽어 두개골이 얕은 물에 누워 있다
export const LEVI = { a: [62, 115], b: [126, 66], N: 8, W: 22, skull: [41, 105], tail: [125, 41] };
LEVI.len = Math.hypot(LEVI.b[0] - LEVI.a[0], LEVI.b[1] - LEVI.a[1]);
LEVI.u = [(LEVI.b[0] - LEVI.a[0]) / LEVI.len, (LEVI.b[1] - LEVI.a[1]) / LEVI.len];
LEVI.v = [-LEVI.u[1], LEVI.u[0]];
// 갈비 굴 축 위의 점(s: A 에서 잰 거리, off: 가로)
export const LV = (s, off = 0) => [LEVI.a[0] + LEVI.u[0] * s + LEVI.v[0] * off, LEVI.a[1] + LEVI.u[1] * s + LEVI.v[1] * off];
export const leviH = (t) => 50 + 10 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));   // 등뼈 높이

// 바다 구역 중심 [x, z, 반경]
export const PEARLS = [-100, 72, 24], LILY = [-44, 118, 30], KELP = [-92, -96, 34], SHALLOW = [-118, -46, 22], GEYSERS = [104, -52, 26];

// ── 둑길: 두 섬을 굽은 선으로 잇는다(가운데가 합창당 바깥쪽으로 bulge m 불룩). 끝점은 각 섬 안 rho·R 지점 ──
const RINGIDS = ["landing", "pearl", "coral", "nest", "geyser", "bone", "islet"];
function causeway(A, B, bulge) {
  const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const a = [A.x + ux * A.R * A.rho, A.z + uz * A.R * A.rho], b = [B.x - ux * B.R * B.rho, B.z - uz * B.R * B.rho];
  let px = -uz, pz = ux;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if (px * (mx - CHOIR.x) + pz * (mz - CHOIR.z) < 0) { px = -px; pz = -pz; }
  const c = [mx + px * bulge, mz + pz * bulge], N = 8, pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N, k = 1 - t; pts.push([k * k * a[0] + 2 * k * t * c[0] + t * t * b[0], k * k * a[1] + 2 * k * t * c[1] + t * t * b[1]]); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  return { from: A.id, to: B.id, pts, ha: A.top - 0.5, hb: B.top - 0.5, box: [x0 - 24, x1 + 24, z0 - 24, z1 + 24], aDeg: Math.atan2(uz, ux) / DEG, bDeg: Math.atan2(-uz, -ux) / DEG };
}
export const CAUSE = [
  ...RINGIDS.map((id, i) => causeway(ISL[id], ISL[RINGIDS[(i + 1) % RINGIDS.length]], id === "bone" || id === "islet" ? 8 : 14)),
  causeway(ISL.landing, CHOIR, 0),     // 남쪽 참배 둑길
  causeway(ISL.geyser, CHOIR, -10),    // 북동 둑길
];
export const CW = (from, to) => CAUSE.find((c) => c.from === from && c.to === to);
export const CAUSE_W = 7;   // 마루 절반 폭
// 둑길 위 비율 t 지점 [x, z]와 진행 방향
export function cwAt(C, t) {
  const f = Math.min(0.9999, Math.max(0, t)) * (C.pts.length - 1), i = f | 0, k = f - i, a = C.pts[i], b = C.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L };
}
// 점에서 둑길까지: [거리, 마루 높이]
function cwDist(C, x, z) {
  let best = 1e9, crest = 0;
  const P = C.pts, n = P.length - 1;
  for (let i = 0; i < n; i++) {
    const ax = P[i][0], az = P[i][1], dx = P[i + 1][0] - ax, dz = P[i + 1][1] - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; crest = C.ha + (C.hb - C.ha) * ((i + t) / n); }
  }
  return [best, crest];
}
export function causeDist(x, z) {
  let best = 1e9;
  for (const C of CAUSE) { if (x < C.box[0] || x > C.box[1] || z < C.box[2] || z > C.box[3]) continue; const d = cwDist(C, x, z)[0]; if (d < best) best = d; }
  return best;
}

// ── 섬 윤곽과 물가 단면 ──
// 가장자리에서 바깥으로 잰 거리(안쪽이면 음수)
function edge(I, x, z) {
  const dx = x - I.x, dz = z - I.z, d = Math.hypot(dx, dz);
  if (d > I.R * 1.2 + 40) return 1e9;
  const a = Math.atan2(dz, dx);
  return d - I.R * (1 + I.w * (Math.sin(a * 3 + I.p) * 0.6 + Math.sin(a * 5 - I.p * 2.3) * 0.4));
}
// 윗면 → 모래 턱 → 얕은 선반(−0.7) → 바닥
function shore(e, top) {
  if (e <= 0) return top - sm(-5, 0, e) * 0.45;
  if (e < 7) return top - 0.45 - sm(0, 7, e) * (top + 0.25);
  if (e < 18) return -0.7 - (e - 7) * 0.07;
  return -1.47 - sm(18, 36, e) * 3.6;
}
const funnel = (d) => -CHOIR.tD * Math.pow(1 - d / CHOIR.tR, 1.7);
export const funnelY = (d) => (d >= CHOIR.tR ? 0 : funnel(d));
function choirH(x, z) {
  const dx = x - CHOIR.x, dz = z - CHOIR.z, d = Math.hypot(dx, dz);
  if (d > 150) return -1e9;
  if (d >= CHOIR.Rp) { const a = Math.atan2(dz, dx); return shore(d - CHOIR.Ro * (1 + 0.035 * Math.sin(a * 4 + 1) + 0.025 * Math.sin(a * 7 + 2)), CHOIR.top); }
  if (d >= CHOIR.Ri) return -0.4 + ((d - CHOIR.Ri) / (CHOIR.Rp - CHOIR.Ri)) * (CHOIR.top + 0.4);   // 객석 비탈
  if (d >= CHOIR.tR) return -0.4 - sm(CHOIR.Ri, 34, d) * 2.6 + sm(30, CHOIR.tR, d) * 2.2;          // 석호 바닥 (목구멍 둘레는 얕다)
  return funnel(d) - 1.0;
}

export function height(x, z) {
  const r = Math.hypot(x, z);
  let h = -5.2 + (vnoise(x * 0.035 + 7, z * 0.035 + 3) - 0.5) * 2.2 + (vnoise(x * 0.13, z * 0.13) - 0.5) * 0.7 - sm(280, 460, r) * 7;
  for (const I of LIST) {
    const e = edge(I, x, z);
    if (e > 60) continue;
    let v = shore(e, I.top);
    if (e < 0) v += (vnoise(x * 0.07 + I.i * 9, z * 0.07) - 0.5) * 0.5 * sm(0, 10, -e);
    if (v > h) h = v;
  }
  { const e = edge(APSE, x, z); if (e < 60) { const v = shore(e, APSE.top); if (v > h) h = v; } }
  const c = choirH(x, z);
  if (c > h) h = c;
  // 목구멍 안은 깔때기 그대로(둑길·섬이 덮지 않는다)
  if (Math.hypot(x - CHOIR.x, z - CHOIR.z) < CHOIR.Ri) return c;
  for (const C of CAUSE) {
    if (x < C.box[0] || x > C.box[1] || z < C.box[2] || z > C.box[3]) continue;
    const [d, crest] = cwDist(C, x, z);
    if (d > 22) continue;
    const half = CAUSE_W + (vnoise(x * 0.11, z * 0.11) - 0.5) * 1.6;
    const v = d < half ? crest - sm(half - 3, half, d) * 0.5 : crest - 0.5 - (d - half) * 0.6;
    if (v > h) h = v;
  }
  return h;
}
// 발 딛을 땅인가(바다 위가 아니다): 지상 유닛의 무작위 지점 고르기에 쓴다
export const land = (x, z) => height(x, z) > 1.6;
// 어느 섬 위인가 (m: 가장자리에서 안쪽 여유)
export function islandOf(x, z, m = 0) {
  for (const I of LIST) if (edge(I, x, z) < -m) return I;
  return null;
}
export const onChoir = (x, z, m = 0) => { const d = Math.hypot(x - CHOIR.x, z - CHOIR.z); return d > CHOIR.Rp + m && d < CHOIR.Ro * 0.94 - m; };
export const depth = (x, z) => -height(x, z);

// ── 색: 물속은 남색에서 얕을수록 청록, 물가는 진주 모래, 윗면은 남빛 이끼에 청록·분홍 산호 얼룩 ──
export function colorFn(x, y, z, slope) {
  if (y < -0.25) return mix(0x0a2248, 0x1d7a86, sm(-5.5, -0.4, y));
  const n = vnoise(x * 0.028 + 40, z * 0.028 + 11), n2 = vnoise(x * 0.09, z * 0.09);
  if (y < 1.5) return mix(0x7fd8d8, 0xb9aede, sm(-0.25, 1.2, y));                   // 젖은 모래 턱
  let c = n > 0.62 ? 0x2a8f8a : n > 0.5 ? 0x34509a : n2 > 0.74 ? 0xa0528e : 0x3a3f8e;
  const dc = Math.hypot(x - CHOIR.x, z - CHOIR.z);
  if (dc < CHOIR.Ro + 4 || edge(APSE, x, z) < 2) {
    // 합창당: 진주 포석(동심 띠와 방사 줄눈)
    const a = Math.atan2(z - CHOIR.z, x - CHOIR.x), band = Math.floor(dc / 6.5) % 2, seg = Math.floor((a / (Math.PI * 2)) * 36 + band * 0.5) % 2;
    c = dc < CHOIR.Rp ? mix(0x8fa0d8, 0x6a78c0, band) : mix(seg ? 0x8a8fd0 : 0x7a80c4, 0x9aa6e0, n2 * 0.6);
  } else {
    const I = islandOf(x, z, -3);
    if (I && I.id === "nest") c = mix(c, n2 > 0.55 ? 0x3a1830 : 0x1c1626, 0.78);
    else if (I && I.id === "coral") c = mix(c, n2 > 0.5 ? 0xb85a9a : 0x6a4aa8, 0.42);
    else if (I && I.id === "bone") c = mix(c, 0x8a86a8, 0.4);
    else if (I && I.id === "geyser") c = mix(c, n2 > 0.6 ? 0x4ab0c0 : 0x3a5aa0, 0.4);
    else if (I && I.id === "pearl") c = mix(c, 0x6a78c8, 0.3);
    if (!I || causeDist(x, z) < CAUSE_W + 1.5 && !islandOf(x, z, 8)) c = mix(0x5a4a86, 0x7a6aa0, n2);   // 뿌리 둑길 마루
  }
  if (slope > 0.3) c = mix(c, 0x2a2c62, sm(0.3, 0.55, slope));
  return c;
}

// ── 순환 길: 일곱 섬을 둑길로 잇는 고리. 섬 안에서는 중심 둘레(rho·R)를 돌아 한가운데를 비운다 ──
export function arcPts(I, a0, a1, step = 22) {
  let d = ((a1 - a0 + 540) % 360) - 180;   // 짧은 쪽으로
  const n = Math.max(1, Math.round(Math.abs(d) / step)), out = [], R = I.R * I.rho;
  for (let i = 1; i < n; i++) { const a = (a0 + (d * i) / n) * DEG; out.push([I.x + Math.cos(a) * R, I.z + Math.sin(a) * R]); }
  return out;
}
export const ROAD = (() => {
  const out = [], ringC = CAUSE.slice(0, RINGIDS.length);
  ringC.forEach((C, i) => {
    const prev = ringC[(i + ringC.length - 1) % ringC.length];
    out.push(...arcPts(ISL[C.from], prev.bDeg, C.aDeg));
    for (let k = 0; k < C.pts.length; k += 2) out.push(C.pts[k]);
  });
  return out;
})();

const G = {};
const tp = (k, f) => G[k] || (G[k] = f());

// 굽은 관: 점열을 따라 굵기가 r0 → r1 로 줄어드는 관. o.col: 캡슐 충돌, o.glow: 아랫면 빛 줄 색
export function curveTube(w, pts, r0, r1, color, o = {}) {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const r = r0 + (r1 - r0) * (i / Math.max(1, n - 1)), a = pts[i], b = pts[i + 1];
    tube(w, a[0], a[1], a[2], b[0], b[1], b[2], r, o.color2 && i % 2 ? o.color2 : color, { mat: o.mat || "paint", col: !!o.col, seg: o.seg });
    if (o.knob && i > 0) w.mesh(lumpG(), M(a[0], a[1], a[2], r * 1.5, r * 1.3, r * 1.5, 0, i * 40, 0), o.knob, "flat");
    if (o.glow) tube(w, a[0], a[1] - r * 0.85, a[2], b[0], b[1] - r * 0.85, b[2], Math.max(0.1, r * 0.24), o.glow, { mat: "glow" });
  }
}

// ── 소라 탑(기울일 수 있다): 겹친 나선 껍질 + 나선 발광 띠 + 꼭대기 등. tilt(도)·az(기우는 방위, 도) ──
export function conch(w, K, x, y, z, H, R, o = {}) {
  const tilt = o.tilt || 0, az = o.az || 0, ry = o.ry ?? ((x * 13 + z * 7) % 360), light = o.light ?? AQUA;
  const m = M(x, y - 1.2, z, R, H, R, tilt, az, 0), rot = M(0, 0, 0, 1, 1, 1, 0, ry, 0);
  w.mesh(conchG(), m.clone().multiply(rot), o.color ?? NACRE, "paint");
  w.mesh(conchG(), M(x, y - 1.2, z, R * 1.06, H * 0.34, R * 1.06, tilt, az, 0).multiply(M(0, 0, 0, 1, 1, 1, 0, ry + 40, 0)), o.color2 ?? INDIGO2, "paint");
  const P = (lx, ly, lz) => V3(lx, ly, lz).applyMatrix4(m);
  if (o.col !== false) { w.col.addCapsule(P(0, 0.02, 0), P(0, 0.55, 0), R * 0.6); w.col.addCapsule(P(0, 0.55, 0), P(0, 0.92, 0), R * 0.24); }
  const N = o.turns ? o.turns * 8 : 24;
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const t = 0.06 + (i / N) * 0.84, a = t * Math.PI * 7 + ry * DEG, rr = Math.pow(1 - t, 1.25) * 1.03 + 0.25 / R;
    const p = P(Math.cos(a) * rr, t, Math.sin(a) * rr);
    if (prev) tube(w, prev.x, prev.y, prev.z, p.x, p.y, p.z, Math.max(0.14, R * 0.045), light, { mat: "glow" });
    prev = p;
  }
  // 창(빛 점) 몇 개와 꼭대기 등
  for (let k = 0; k < (H > 40 ? 9 : 5); k++) { const t = 0.12 + k * 0.07, a = k * 2.4 + ry, rr = Math.pow(1 - t, 1.25) * 1.02; const p = P(Math.cos(a) * rr, t, Math.sin(a) * rr); bead(w, p.x, p.y, p.z, 0.3 + R * 0.05, k % 3 ? o.light2 ?? BLUE2 : ROSE); }
  const tip = P(0, 1, 0);
  if (K) K.blink.add(tip.x, tip.y, tip.z, light, 0.4 + R * 0.05, (x | 0) & 1);
  return { tip, P };
}

// ── 가라앉은 껍질 돔: 기울어져 물에 반쯤 잠긴 갈비 돔 + 띠 + 빛 창 ──
export function sunkDome(w, K, x, y, z, R, o = {}) {
  const tilt = o.tilt ?? 8, az = o.az ?? ((x * 7 + z * 3) % 360), col = o.color ?? ((x + z) & 1 ? NACRE : NACRE2), light = o.light ?? AQUA, sy = o.sy ?? 1.02;
  const m = M(x, y, z, R, R * sy, R, tilt, az, 0), P = (lx, ly, lz) => V3(lx, ly, lz).applyMatrix4(m);
  w.mesh(ribDomeG(o.ribs || 12), m, col, "paint");
  if (o.col !== false) w.col.addSphere(P(0, 0.12, 0), R * 0.95);
  // 띠 둘: 짧은 관으로 둘러 준다(기운 평면)
  for (const [ly, c, t, glow] of [[0.2, INDIGO2, 0.045, 0], [0.56, INDIGO, 0.03, 0], [0.4, light, 0.012, 1]]) {
    const rr = Math.sqrt(Math.max(0.05, 1 - Math.pow(ly / (1 + 0.18 * ly), 2))) * 1.015, n = R > 12 ? 20 : 14;
    let prev = P(rr, ly, 0);
    for (let i = 1; i <= n; i++) { const a = (i / n) * Math.PI * 2, p = P(Math.cos(a) * rr, ly, Math.sin(a) * rr); tube(w, prev.x, prev.y, prev.z, p.x, p.y, p.z, Math.max(0.14, R * t), c, { mat: glow ? "glow" : "paint", seg: 5 }); prev = p; }
  }
  // 둥근 창
  const r = w.rand;
  for (let k = 0; k < (R > 12 ? 10 : 6); k++) {
    const a = r() * Math.PI * 2, e = 0.3 + r() * 0.45, cy = Math.sin(e * Math.PI / 2), cr = Math.cos(e * Math.PI / 2), p = P(Math.cos(a) * cr, cy * (1 + 0.18 * cy), Math.sin(a) * cr);
    if (p.y < WY + 0.6) continue;
    bead(w, p.x, p.y, p.z, 0.4 + R * 0.035, k % 3 === 0 ? ROSE : k % 3 === 1 ? light : BLUE2);
  }
  // 꼭대기 숨구멍: 빛 고리와 촉수 안테나
  const top = P(0, 1.2, 0), t2 = P(0, 1.2 + (o.mast ?? 0.5), 0);
  if (o.mast !== 0) {
    tube(w, top.x, top.y - R * 0.1, top.z, t2.x, t2.y, t2.z, Math.max(0.25, R * 0.04), INDIGO2);
    bead(w, t2.x, t2.y, t2.z, Math.max(0.5, R * 0.07), o.light2 ?? ROSE);
    if (K) K.blink.add(t2.x, t2.y + 0.9, t2.z, o.light2 ?? ROSE, 0.34, (x + z) & 1);
  }
  return { P };
}

// ── 산호 탑: 굽어 오르는 굵은 줄기, 두세 번 갈라지는 가지, 가지 끝의 빛 폴립, 줄기에 붙은 접시 산호 ──
export function coralTower(w, K, x, y, z, H, R, r, o = {}) {
  const cols = o.colors || [0xe85aa8, 0xc0408e, 0xff86c4], tip = o.tip ?? ROSE, maxD = o.depth ?? 3;
  const branch = (p, dir, len, rad, depth) => {
    // 한 마디를 두 토막으로 굽혀 올린다
    const bend = [dir[0] + (r() - 0.5) * 0.3, dir[1], dir[2] + (r() - 0.5) * 0.3];
    const mid = [p[0] + dir[0] * len * 0.5, p[1] + dir[1] * len * 0.5, p[2] + dir[2] * len * 0.5];
    const e = [mid[0] + bend[0] * len * 0.5, mid[1] + bend[1] * len * 0.5, mid[2] + bend[2] * len * 0.5];
    tube(w, ...p, ...mid, rad, cols[depth % cols.length], { col: depth < 2 && rad > 0.5 });
    tube(w, ...mid, ...e, rad * 0.86, cols[depth % cols.length], { col: depth < 2 && rad > 0.5 });
    if (depth === 0 || (depth === 1 && r() < 0.6)) {
      // 접시 산호(선반)
      const k = 1 + ((r() * 2) | 0);
      for (let i = 0; i < k; i++) { const t = 0.3 + r() * 0.6, a = r() * 6.28, q = [p[0] + (e[0] - p[0]) * t, p[1] + (e[1] - p[1]) * t, p[2] + (e[2] - p[2]) * t], s = rad * (2.2 + r() * 1.6); w.mesh(capG(), M(q[0] + Math.cos(a) * rad, q[1], q[2] + Math.sin(a) * rad, s, s * 0.5, s, 0, r() * 360, 0), cols[2], "paint"); w.mesh(capG(), M(q[0] + Math.cos(a) * rad, q[1] - s * 0.04, q[2] + Math.sin(a) * rad, s * 0.84, s * 0.14, s * 0.84, 180, 0, 0), tip, "glow"); }
    }
    if (depth >= maxD || rad < 0.22) { bead(w, e[0], e[1], e[2], rad * 2.1 + 0.25, tip); if (K && depth <= 2 && r() < 0.25) K.blink.add(e[0], e[1] + rad * 2.4, e[2], tip, 0.3, depth & 1); return; }
    const n = depth === 0 ? 3 : 2 + (r() < 0.35 ? 1 : 0), a0 = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * 6.28 + (r() - 0.5) * 0.7, sp = 0.42 + r() * 0.3;
      const d = [bend[0] * (1 - sp) + Math.cos(a) * sp, Math.max(0.35, bend[1]) * (1 - sp * 0.5) + 0.2, bend[2] * (1 - sp) + Math.sin(a) * sp], L = Math.hypot(...d);
      branch(e, d.map((q) => q / L), len * (0.56 + r() * 0.16), rad * 0.6, depth + 1);
    }
  };
  lump(w, x, y + 0.3, z, R * 2.4, R * 1.0, R * 2.4, cols[1], { mat: "paint" });
  branch([x, y - 1.5, z], [(r() - 0.5) * 0.16, 1, (r() - 0.5) * 0.16], H * 0.5, R, 0);
}

// ── 조개 껍데기 지오메트리: 경첩이 원점, +z 로 펼쳐진 부채(길이 1), 위로 볼록. 양면 ──
export const scallopG = () => tp("scallop", () => {
  const NU = 7, NV = 14, pos = [], idx = [];
  const P = (u, v, side) => {
    const th = v * 1.15, r = Math.pow(u, 0.8), fl = 1 + 0.07 * Math.cos(v * 22) * u;
    return [Math.sin(th) * r * fl * 0.95, (0.34 * Math.sin(Math.min(1, u * 1.08) * Math.PI * 0.86) * (1 - 0.35 * v * v) + 0.035 * Math.cos(v * 22) * u) * side, Math.cos(th) * r * fl];
  };
  for (const side of [1, 0.82]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) pos.push(...P(i / NU, (j / NV) * 2 - 1, side));
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = base + i * (NV + 1) + j, b = a + 1, c = a + NV + 1, d = c + 1;
      if (side === 1) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
});

// ── 연잎: 한쪽이 갈라진 둥근 잎(반경 1, 가장자리가 살짝 들렸다) ──
export const padG = () => tp("pad", () => {
  const N = 26, pos = [0, 0.02, 0], idx = [], a0 = 0.16, a1 = Math.PI * 2 - 0.16;
  for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N, k = 1 + 0.05 * Math.sin(a * 9); pos.push(Math.cos(a) * 0.72 * k, 0.0, Math.sin(a) * 0.72 * k); }
  for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N, k = 1 + 0.05 * Math.sin(a * 9); pos.push(Math.cos(a) * k, 0.1, Math.sin(a) * k); }
  for (let i = 0; i < N; i++) { idx.push(0, 2 + i, 1 + i); const a = 1 + i, b = 2 + i, c = a + N + 1, d = b + N + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
});

// ── 등불 기둥: 굽은 뼈 기둥 끝에 매달린 빛 꼬투리 ──
export function lantern(w, K, x, y, z, h, yawDeg, color = AQUA, o = {}) {
  const c = Math.cos(yawDeg * DEG), s = Math.sin(yawDeg * DEG), arm = h * 0.32;
  const pts = [[x, y - 0.4, z], [x - c * arm * 0.15, y + h * 0.55, z - s * arm * 0.15], [x + c * arm * 0.3, y + h * 0.92, z + s * arm * 0.3], [x + c * arm, y + h, z + s * arm]];
  curveTube(w, pts, 0.24 + h * 0.012, 0.12, o.post ?? BONE, { col: false });
  if (o.col !== false) w.col.addCapsule(V3(x, y, z), V3(x, y + h * 0.9, z), 0.35);
  const lx = x + c * arm, lz = z + s * arm;
  tube(w, lx, y + h, lz, lx, y + h - 0.9, lz, 0.05, ROOT2);
  w.mesh(lumpG(), M(lx, y + h - 1.5, lz, 0.5, 0.75, 0.5), color, "glow");
  w.pool(lx, y, lz, h * 1.1, color, 0.3);
  if (K && o.blink) K.blink.add(lx, y + h - 2.5, lz, color, 0.22, (x | 0) & 1);
}

// ── 작은 생물 소품 ──
export function anemone(w, x, y, z, s, r, o = {}) {
  const h = (1.6 + r() * 1.2) * s, body = o.body ?? (r() < 0.5 ? 0xd85a9c : 0x7a5ae0), n = 9;
  w.cyl(x, y - 0.3, z, 0.8 * s, h, body, { mat: "paint", rt: 0.62 * s, col: s > 1.6 });
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r(), c = Math.cos(a), sn = Math.sin(a), L = (1.1 + r() * 0.6) * s;
    tube(w, x + c * 0.5 * s, y + h - 0.2, z + sn * 0.5 * s, x + c * (0.5 * s + L * 0.75), y + h + L * 0.7, z + sn * (0.5 * s + L * 0.75), 0.13 * s, k % 2 ? 0xffa0d8 : 0xc8e8ff, { seg: 4 });
    bead(w, x + c * (0.5 * s + L * 0.75), y + h + L * 0.7, z + sn * (0.5 * s + L * 0.75), 0.2 * s, o.glow ?? (k % 2 ? AQUA : ROSE));
  }
  bead(w, x, y + h + 0.05, z, 0.5 * s, o.core ?? LIME);
}
export const starG = () => tp("star", () => {
  const pos = [0, 0.3, 0], idx = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, rr = i % 2 ? 0.42 : 1; pos.push(Math.cos(a) * rr, i % 2 ? 0.16 : 0.02, Math.sin(a) * rr); }
  for (let i = 0; i < 10; i++) idx.push(0, 1 + ((i + 1) % 10), 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(22), 2));
  g.setIndex(idx);
  const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
});
export function starfish(w, x, y, z, s, r) { w.mesh(starG(), M(x, y + 0.02, z, s, s, s, 0, r() * 360, 0), r() < 0.5 ? CORAL : r() < 0.5 ? 0xff9ad0 : 0xffd27a, "paint"); }
export function urchin(w, x, y, z, s, r, glow = BLUE2) {
  w.mesh(lumpG(), M(x, y + s * 0.55, z, s, s * 0.8, s, 0, r() * 360, 0), DEEP, "flat");
  for (let k = 0; k < 9; k++) {
    const a = r() * 6.28, e = 0.15 + r() * 1.2, c = Math.cos(e), dx = Math.cos(a) * c, dz = Math.sin(a) * c, dy = Math.sin(e), L = s * (1.4 + r() * 0.9);
    tube(w, x + dx * s * 0.7, y + s * 0.55 + dy * s * 0.6, z + dz * s * 0.7, x + dx * (s * 0.7 + L), y + s * 0.55 + dy * (s * 0.6 + L), z + dz * (s * 0.7 + L), 0.06 * s, INDIGO2, { seg: 3 });
    if (k % 3 === 0) bead(w, x + dx * (s * 0.7 + L), y + s * 0.55 + dy * (s * 0.6 + L), z + dz * (s * 0.7 + L), 0.11 * s + 0.05, glow);
  }
}
// 바닥에 놓인 작은 소라·조개
export function seashell(w, x, y, z, s, r) {
  if (r() < 0.5) w.mesh(conchG(), M(x, y + s * 0.3, z, s * 0.5, s * 1.5, s * 0.5, 78 + r() * 14, r() * 360, 0), r() < 0.5 ? NACRE : 0xe8c8e0, "paint");
  else { const ry = r() * 360; w.mesh(scallopG(), M(x, y + 0.05, z, s, s, s, 0, ry, 0), r() < 0.5 ? NACRE2 : 0xf0b8d8, "paint"); }
}
// 따개비 무리(기둥·뼈 밑동에 붙는다)
export function barnacles(w, x, y, z, s, r, n = 5) {
  for (let k = 0; k < n; k++) {
    const a = r() * 6.28, d = r() * s * 1.6, q = s * (0.35 + r() * 0.5), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    w.cyl(px, y - 0.1, pz, q, q * 1.1, 0x9aa4c8, { mat: "paint", rt: q * 0.55, col: false });
    if (k % 2 === 0) bead(w, px, y + q * 1.05, pz, q * 0.4, k % 4 ? AQUA : ROSE);
  }
}
// 산호 덤불(낮은 것): 부채꼴로 갈라지는 가는 가지
export function coralBush(w, x, y, z, s, r, o = {}) {
  const cols = o.colors || (r() < 0.5 ? [0xff6ab8, 0xd04aa8] : r() < 0.5 ? [0x5a8aff, 0x86b4ff] : [0xff9a6a, 0xffc08a]), tip = o.tip ?? (cols[0] === 0x5a8aff ? AQUA : ROSE);
  const go = (p, dir, len, rad, depth) => {
    const e = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    tube(w, ...p, ...e, rad, cols[depth % 2], { seg: depth ? 4 : 5, col: depth === 0 && rad > 0.4 });
    if (depth >= 2) { bead(w, e[0], e[1], e[2], rad * 2.4 + 0.1, tip); return; }
    for (let i = 0; i < 2 + (r() < 0.5 ? 1 : 0); i++) { const a = r() * 6.28, sp = 0.5 + r() * 0.3, d = [dir[0] * (1 - sp) + Math.cos(a) * sp, dir[1] * (1 - sp * 0.5) + 0.25, dir[2] * (1 - sp) + Math.sin(a) * sp], L = Math.hypot(...d); go(e, d.map((q) => q / L), len * 0.68, rad * 0.62, depth + 1); }
  };
  go([x, y - 0.3, z], [0, 1, 0], 2.4 * s, 0.42 * s, 0);
}
