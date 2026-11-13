// 화산섬 지형: 높이 함수·색 함수와 지형에 새겨 넣은 지물 좌표
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
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ── 기준 높이 ──
export const WY = -1.5;          // 해수면
const SEA = -4.2, PLAIN = 0.25;  // 바다 바닥, 해안 평지

// ── 지형에 새긴 지물 ──────────────────────────────────────
// 화산: 중심, 분화구 테두리 반경·높이, 분화구 바닥, 용암이 넘치는 터진 곳의 방향
export const VOLCANO = { x: -10, z: -50, rim: 34, top: 114, floor: 85, lake: 87.5, breach: Math.atan2(-30, 24) };
// 용암 강: 분화구 → 북동 해안
export const LAVA = [[2, -66], [14, -80], [34, -102], [60, -120], [84, -148], [110, -170], [134, -194], [152, -214]];
// 남동 사면의 측면 분출구에서 흘러내리는 작은 용암 줄기 (리조트에서 올려다보인다)
export const VENT = { x: 28, z: -18, a: 0.69 };
export const LAVA2 = [[28, -18], [44, -6], [58, 2], [70, 14], [80, 27]];
// 용암 동굴(식은 용암 둔덕 속의 굴): 북서 사면
export const TUBE = [[-66, -132], [-90, -137], [-112, -127], [-128, -112], [-146, -103]];
// 정글 강: 폭포 용소 → 서쪽 하구
export const RIVER = [[-62, 22], [-90, 40], [-120, 48], [-150, 70], [-185, 78], [-226, 98]];
// 남쪽 라군(타원)과 모래톱
export const LAGOON = { x: 5, z: 208, rx: 78, rz: 46, open: 0.5 };
// 활주로·계류장 (동쪽 해안)
export const STRIP = { x: 186, z: 10, hx: 11, hz: 96 }, APRON = { x: 158, z: 2, hx: 20, hz: 58 };
// 해안 도로(호송 경로): 리조트 서쪽 → 리조트 → 활주로 → 용암 전망대
export const ROAD = [[-104, 172], [-74, 150], [-30, 131], [22, 127], [72, 134], [118, 140], [150, 114], [162, 62], [163, -8], [160, -70], [148, -116], [140, -142]];
// 바다 위의 바위 기둥(시스택) [x, z, 반경, 높이]
export const STACKS = [[-250, -152, 10, 34], [-270, -180, 8.5, 27], [-222, -172, 10, 44], [-296, -116, 7, 17], [-262, -214, 7, 21], [10, -272, 8, 25], [268, 142, 7, 19]];
// 등대 바위섬, 난파선 암초
export const LIGHT = { x: 252, z: 210, r: 17, h: 4.2 };
export const REEF = { x: -262, z: 174, r: 42 };
// 평평하게 다진 터 [x, z, 반경, 이름, 높이(없으면 원래 높이)]
export const FLATS = [
  [-150, 128, 34, "blue", 0.35], [-55, -197, 34, "red", 0.35], [20, 142, 22, "spawn", 0.35], [-100, -14, 24, "obs"], [-120, 102, 15, "temple"], [-205, 44, 19, "village", 0.35],
  [112, -126, 14, "lavacamp"], [96, 72, 15, "idols"], [-30, 114, 9, "dep0", 0.35], [-196, -32, 10, "dep2", 0.35], [40, -192, 10, "dep3", 0.35], [98, 152, 9, "tur0", 0.35], [-172, -82, 9, "tur1", 0.35],
  [-4, -14, 9, "deck"],
];
export const flat = (name) => FLATS.find((f) => f[3] === name);

// ── 꺾은선 도구 ──
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
const bbox = (pts, m) => [Math.min(...pts.map((p) => p[0])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[1])) + m];
const inBB = (x, z, b) => x > b[0] && x < b[1] && z > b[2] && z < b[3];
function line(cp, margin, sub = 5) {
  const pts = smooth(cp, sub), len = polyLen(pts), bb = bbox(pts, margin);
  return {
    pts, len,
    // [거리, 진행 비율] (범위 밖이면 거리 999)
    at: (x, z) => (inBB(x, z, bb) ? polyDist(x, z, pts, len) : [999, 0]),
    // 진행 비율 t 의 점
    point(t) {
      let acc = 0; const target = Math.min(1, Math.max(0, t)) * len;
      for (let i = 0; i < pts.length - 1; i++) {
        const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
        if (acc + l >= target) { const k = (target - acc) / l; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
        acc += l;
      }
      return pts[pts.length - 1];
    },
    // 진행 방향 단위 벡터
    dir(t) { const a = this.point(t - 0.01), b = this.point(t + 0.01), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; },
  };
}
export const lavaL = line(LAVA, 40), lava2L = line(LAVA2, 30), tubeL = line(TUBE, 34), riverL = line(RIVER, 34), roadL = line(ROAD, 16, 4);

// 라군: 타원 정규 거리
export const lagE = (x, z) => Math.hypot((x - LAGOON.x) / LAGOON.rx, (z - LAGOON.z) / LAGOON.rz);
const rectD = (x, z, r) => Math.hypot(Math.max(0, Math.abs(x - r.x) - r.hx), Math.max(0, Math.abs(z - r.z) - r.hz));
// 용암 동굴의 깊이 분포(양 끝은 열린 도랑, 가운데는 굴)
export const tubeK = (t) => sm(0, 0.22, t) * sm(1, 0.78, t);
// 용암 지대 정도(0..1): 북동(흐르는 용암)과 북서(식은 용암 둔덕)
export function lavaZone(x, z) {
  const a = Math.atan2(z - VOLCANO.z, x - VOLCANO.x), dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
  const k = Math.max(gauss(angDiff(a, -0.82), 0, 0.62), 0.8 * gauss(angDiff(a, -2.55), 0, 0.5), 0.95 * gauss(angDiff(a, VENT.a), 0, 0.2) * sm(150, 118, dv));
  return Math.min(1, k * sm(10, 60, dv) + sm(92, 40, dv) * 0.9);
}

// 해안까지의 거리(안쪽이 +)
function coast(x, z, n) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const R = 222 + 10 * Math.sin(2 * th + 0.9) + 8 * Math.sin(3 * th - 1.2) + 5 * Math.sin(5 * th + 0.5) + (n - 0.5) * 30;
  return Math.min(R - r, (lagE(x, z) - 1) * LAGOON.rz);
}

function raw(x, z) {
  const n = fbm(x * 0.008 + 3, z * 0.008 + 7), n2 = fbm(x * 0.03 + 11, z * 0.03 + 5, 3), n3 = vnoise(x * 0.12, z * 0.12);
  const d = coast(x, z, n);
  // 해변 → 평지 → 정글 언덕
  let h = SEA + (PLAIN - SEA) * sm(-22, 6, d);
  h += sm(6, 34, d) * (0.3 + n2 * 1.5);
  const V = VOLCANO, dv = Math.hypot(x - V.x, z - V.z), ang = Math.atan2(z - V.z, x - V.x);
  h += sm(40, 88, d) * sm(55, 125, dv) * (1 - 0.92 * gauss(angDiff(ang, -0.82), 0, 0.55)) * (1 - 0.85 * gauss(angDiff(ang, VENT.a), 0, 0.3)) * (5 + 30 * sm(0.3, 0.72, n) + 7 * n2 + (1 - Math.abs(vnoise(x * 0.045 + 5, z * 0.045 + 1) * 2 - 1)) * 5);
  // 화산체와 분화구
  if (dv < 172) {
    const rimH = V.top + 4 * Math.sin(3 * ang + 1) + 3 * Math.sin(7 * ang) - 24 * gauss(angDiff(ang, V.breach), 0, 0.3);
    let c;
    if (dv >= V.rim) {
      c = 160 * Math.pow(Math.max(0, 1 - dv / 170), 1.5);
      c *= 1 + (rimH / 114.5 - 1) * sm(100, V.rim, dv);
      const gully = 1 - Math.abs(Math.sin(ang * 8 + n * 7));
      c *= 1 + (gully - 0.5) * 0.16 * sm(40, 74, dv) * sm(170, 120, dv);
      c += (n3 - 0.5) * 1.6 * sm(150, 90, dv);
    } else c = V.floor + (rimH - V.floor) * Math.pow(sm(13, V.rim, dv + (n3 - 0.5) * 3), 1.2);
    h += c * sm(-6, 34, d);
  }
  // 용암 삼각주(바다로 뻗은 검은 혀)와 용암이 흐르는 고랑
  const [dl, tl] = lavaL.at(x, z);
  if (dl < 40) {
    if (tl > 0.78) h = Math.max(h, 2.3 * sm(30 + n2 * 6, 13, dl) * sm(0.78, 0.86, tl) * sm(1.0, 0.92, tl));
    const k = sm(12, 6, dl) * sm(0.02, 0.1, tl);
    if (k > 0) h = Math.max(h - 3.2 * k, Math.min(h, 0.7));
  }
  // 측면 분출구: 작은 분석구와 용암 고랑
  const [d2, t2] = lava2L.at(x, z);
  if (d2 < 30) {
    const dvn = Math.hypot(x - VENT.x, z - VENT.z);
    if (dvn < 17) h += 6.5 * sm(17, 9, dvn) - 7 * sm(7.5, 3, dvn);
    h -= 2.6 * sm(11, 5.5, d2) * sm(0.04, 0.16, t2);
  }
  // 용암 동굴: 둔덕을 올리고 그 속을 판다
  const [dt, tt] = tubeL.at(x, z);
  if (dt < 30) {
    const s = tubeK(tt);
    h += 7.5 * s * sm(27, 11, dt);
    h -= 10 * s * sm(10.5, 7, dt);
  }
  // 정글 강(바다와 이어진 깊은 골짜기)과 폭포 용소
  const [dr] = riverL.at(x, z);
  if (dr < 30) h += (WY - 2.3 - h) * sm(19, 9, dr + (n3 - 0.5) * 4);
  const dp = Math.hypot(x - RIVER[0][0], z - RIVER[0][1]);
  if (dp < 26) h += (WY - 2.6 - h) * sm(24, 15, dp + (n3 - 0.5) * 3);
  // 라군: 얕은 바닥과 남쪽 모래톱
  const e = lagE(x, z);
  if (e < 1.5) {
    if (e < 1) h = Math.max(Math.min(h, -2.96 + 3.2 * sm(0.82, 1, e)), -2.96);
    const a = Math.atan2(z - LAGOON.z, x - LAGOON.x), south = sm(0.12, 0.45, Math.sin(a));
    const bar = SEA + 4.9 * gauss(e + (n2 - 0.5) * 0.08, 1.08, 0.085) * south * (1 - gauss(angDiff(a, LAGOON.open), 0, 0.2));
    h = Math.max(h, bar);
  }
  // 활주로·계류장·해안 도로
  for (const r of [STRIP, APRON]) { const k = sm(14, 1, rectD(x, z, r)); if (k > 0) h += (0.3 - h) * k; }
  const [dd] = roadL.at(x, z);
  if (dd < 13) h += (PLAIN - h) * sm(12, 5.5, dd);
  // 시스택·등대 바위섬·암초
  for (const [sx, sz, r, sh] of STACKS) { const ds = Math.hypot(x - sx, z - sz); if (ds < r * 1.5) h = Math.max(h, SEA + (sh - SEA) * sm(r * 1.35, r * 0.55, ds + (n3 - 0.5) * 2.5)); }
  const dli = Math.hypot(x - LIGHT.x, z - LIGHT.z);
  if (dli < LIGHT.r * 1.6) h = Math.max(h, SEA + (LIGHT.h - SEA) * sm(LIGHT.r * 1.5, LIGHT.r * 0.6, dli + (n3 - 0.5) * 3));
  const dre = Math.hypot(x - REEF.x, z - REEF.z);
  if (dre < REEF.r) h = Math.max(h, SEA + 2.1 * sm(REEF.r, REEF.r * 0.4, dre) + (n3 - 0.5) * 0.5);
  return h;
}
const FLAT_H = FLATS.map(([x, z, , , fh]) => fh ?? raw(x, z));
export function height(x, z) {
  let h = raw(x, z);
  for (let i = 0; i < FLATS.length; i++) {
    const [fx, fz, r] = FLATS[i], d = Math.hypot(x - fx, z - fz);
    if (d < r * 1.6) h += (FLAT_H[i] - h) * sm(r * 1.6, r, d);
  }
  return h;
}

// 숲 밀도 (색과 식생 배치가 함께 쓴다)
export const forest = (x, z) => fbm(x * 0.014 + 40, z * 0.014 + 11, 2);

// 색 섞기 (0xRRGGBB)
function mix(a, b, t) {
  t = Math.min(1, Math.max(0, t));
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
export function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.02 + 3, z * 0.02 + 5, 3), n2 = fbm(x * 0.07 + 9, z * 0.07 + 2, 2);
  const lz = lavaZone(x, z), V = VOLCANO, dv = Math.hypot(x - V.x, z - V.z);
  const basalt = mix(0x2c2a30, 0x4a4248, n2);
  // 용암 고랑 가장자리: 달아오른 검붉은 돌
  const [dl, tl] = lavaL.at(x, z);
  if (dl < 16 && tl > 0.03) return mix(mix(0x7a2410, 0x2a2024, sm(5, 12, dl)), basalt, sm(11, 16, dl));
  const d2 = lava2L.at(x, z)[0];
  if (d2 < 14) return mix(mix(0x7a2410, 0x2a2024, sm(4.5, 10, d2)), basalt, sm(10, 14, d2));
  // 분화구 안쪽: 유황 얼룩
  if (dv < V.rim + 4) return mix(mix(0x4a3630, 0x6a4034, n), 0xc9b24a, sm(0.56, 0.7, n2) * sm(V.rim, 18, dv) * 0.8);
  // 모래: 남·서는 흰 모래, 용암 지대는 검은 모래
  const sandC = mix(mix(0xfff4d6, 0xf3e2b4, n), 0x3c3a3c, sm(0.25, 0.6, lz));
  if (y < 0.05) return mix(mix(0xd9cfa0, 0x35343a, sm(0.25, 0.6, lz)), sandC, sm(-2.2, -0.6, y));
  const [dt, tt] = tubeL.at(x, z);
  const [dd] = roadL.at(x, z);
  // 화산 사면: 높을수록 붉은 화산재, 용암 지대는 현무암, 나머지는 풀
  const scoria = mix(mix(0x5a3a30, 0x7a4632, n), 0x3a3034, sm(0.4, 0.7, n2));
  const grassC = mix(mix(0x86cc4c, 0x5fae3e, n), 0x3e9440, sm(0.42, 0.6, forest(x, z)) * sm(6, 20, y));
  let c = mix(grassC, mix(0x74a844, scoria, sm(46, 76, y)), sm(34, 62, y));
  c = mix(c, basalt, Math.max(sm(0.3, 0.7, lz) * sm(1.0, 2.5, y), sm(86, 104, y) * 0.6));
  if (dt < 30) c = mix(c, mix(0x38343a, 0x1c1a20, sm(13, 8, dt)), sm(30, 16, dt) * sm(0.0, 0.12, tubeK(tt) + 0.02));
  if (slope > 0.34) c = mix(c, mix(mix(0x6a6258, 0x4c4850, n2), basalt, Math.max(lz, sm(60, 90, y))), sm(0.34, 0.46, slope));
  if (y < 2.2) c = mix(sandC, c, sm(0.9, 2.2, y) * (dd < 9 ? 0 : 1));
  if (dd < 9) c = mix(mix(0xe9d8a8, 0x4a4648, sm(0.3, 0.6, lz)), c, sm(4.5, 9, dd));
  return c;
}
