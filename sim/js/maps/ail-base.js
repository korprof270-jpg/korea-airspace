// 에일 행성 구역 짓기: 하이브 도시(껍질 돔·소라 탑·관 다리)와 합창당, 생체 요람과 정박한 모함,
// 첨탑 숲, 빛 늪, 디딤 섬 넷(노래 바위·알 둥지·어미나무·숨구멍), 뿌리 다리 장식
import * as THREE from "../../vendor/three.module.min.js";
import { M, ring, tube, bead, lump, crystals, V3, DEG, shard, lumpG, ribDomeG, capG, shellDome, conchTower, ribArch, coral, crystalSpire, glowShroom,
  PEARL, PEARL2, SHELL, SHELL2, FLESH, FLESH2, BONE, BONE2, ROOT, ROOT2, VIO, VIO2, PINK, TEAL, TEAL2, LIME, GOLD } from "./ail-kit.js";
import { height, ISL, BRIDGES, BRIDGE_W, LAKE, LAKE_Y, MIST, islandOf, sm } from "./ail-terrain.js";

export const PLAZA = [0, 24], HALL = [0, -46], HALL_R = 26, HALL_Y = 20;
export const CRADLE = [174, -174], SHIP_Y = 46, SHIP_YAW = 45, SHIP_L = 96;
export const HENGE = [0, -208], TREE = [0, 218], NEST = [220, 4], VENTS = [[-220, -14], [-222, 16], [-206, 26]];
const gy = (x, z) => height(x, z);

// ── 하이브 섬: 광장 둘레에 껍질 돔과 소라 탑, 그 사이를 잇는 굽은 관 ──
export function hive(w, K, ctx) {
  const r = w.rand, domes = [];
  const clearOf = (x, z, m) => {
    if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 34 + m || Math.hypot(x - HALL[0], z - HALL[1]) < HALL_R + 10 + m) return false;
    if (Math.abs(x) < 16 + m && z > -10) return false;                     // 남쪽 출발 길
    if (Math.hypot(x, z) > 30 && (Math.abs(x) < 13 + m || Math.abs(z) < 13 + m)) return false;   // 네 방위 다리로 가는 길
    if (!islandOf(x, z, 10 + m)) return false;
    return ctx.free(x, z, m);
  };
  // 큰 돔 먼저, 작은 돔은 빈자리에
  for (const [n, rmin, rmax] of [[9, 9, 15], [22, 4.5, 8]]) {
    let k = 0;
    for (let i = 0; i < 900 && k < n; i++) {
      const a = r() * Math.PI * 2, d = 40 + r() * 52, x = Math.cos(a) * d, z = Math.sin(a) * d, R = rmin + r() * (rmax - rmin);
      if (!clearOf(x, z, R + 2) || domes.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2] + R + 5)) continue;
      shellDome(w, K, x, z, gy(x, z), R, { ry: Math.atan2(-z, x) / DEG + 180 - 90 });
      domes.push([x, z, R]); ctx.taken.push([x, z, R + 3]); k++;
    }
  }
  // 소라 탑: 돔 무리 사이에 우뚝
  let nt = 0;
  for (let i = 0; i < 600 && nt < 7; i++) {
    const a = r() * Math.PI * 2, d = 46 + r() * 44, x = Math.cos(a) * d, z = Math.sin(a) * d, R = 3.5 + r() * 2.5;
    if (!clearOf(x, z, R + 2) || domes.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2] + R + 3)) continue;
    conchTower(w, K, x, z, gy(x, z), 26 + r() * 30, R, { light: nt % 2 ? TEAL : PINK });
    domes.push([x, z, R]); ctx.taken.push([x, z, R + 3]); nt++;
  }
  // 굽은 관: 이웃한 큰 돔끼리 공중에서 잇는다(관 아래로 날 수 있다)
  const big = domes.filter((d) => d[2] >= 8);
  const done = new Set();
  for (const a of big) {
    const b = big.filter((q) => q !== a).sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]))[0];
    if (!b) continue;
    const key = [a, b].map((q) => q[0].toFixed(1)).sort().join();
    if (done.has(key) || Math.hypot(b[0] - a[0], b[1] - a[1]) > 60) continue;
    done.add(key);
    hiveTube(w, K, a, b);
  }
  // 광장: 바닥 빛 무늬(동심원), 가운데 노래 샘
  const [px, pz] = PLAZA, py = gy(px, pz);
  for (const [R, c, k] of [[12, TEAL, 0.3], [21, VIO2, 0], [28, TEAL2, 0]]) { ring(w, px, py + 0.12, pz, R, 0.16, c, { pitch: 90, col: false, mat: "glow", seg: 48 }); if (k) w.pool(px, py + 0.1, pz, R * 0.9, c, k); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; w.box(px + Math.cos(a) * 16.5, py, pz + Math.sin(a) * 16.5, 0.5, 0.08, 7, i % 2 ? TEAL : VIO2, { mat: "glow", col: false, ry: -a / DEG + 90, ao: false }); }
  lump(w, px, py + 0.5, pz, 4, 1.4, 4, SHELL2, { mat: "paint" });
  w.mesh(capG(), M(px, py + 1.8, pz, 3.2, 1.6, 3.2), PEARL, "paint");
  bead(w, px, py + 3.9, pz, 1.1, TEAL);
  w.col.addSphere(V3(px, py + 1, pz), 3);
  w.shaft(px, py + 22, pz, 0.5, 3.4, 22, TEAL, 0.1);
}

function hiveTube(w, K, a, b) {
  const ya = gy(a[0], a[1]) + a[2] * 0.7, yb = gy(b[0], b[1]) + b[2] * 0.7, N = 10, pts = [];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const sx = a[0] + ux * a[2] * 0.6, sz = a[1] + uz * a[2] * 0.6, ex = b[0] - ux * b[2] * 0.6, ez = b[1] - uz * b[2] * 0.6;
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([sx + (ex - sx) * t, ya + (yb - ya) * t + Math.sin(t * Math.PI) * 5, sz + (ez - sz) * t]); }
  for (let i = 0; i < N; i++) {
    tube(w, ...pts[i], ...pts[i + 1], 1.5, i % 2 ? PEARL2 : PEARL, { mat: "paint", col: true });
    if (i % 2) ring(w, ...pts[i], 1.62, 0.2, SHELL2, { yaw: Math.atan2(ux, uz) / DEG, col: false, seg: 12 });
    tube(w, pts[i][0], pts[i][1] - 1.45, pts[i][2], pts[i + 1][0], pts[i + 1][1] - 1.45, pts[i + 1][2], 0.22, VIO2, { mat: "glow" });
  }
  const m = pts[N >> 1];
  const lo = Math.max(gy(m[0], m[2]), 0);
  if (m[1] - lo > 9) w.gap("하이브 관 아래", m[0], (m[1] + lo) / 2 - 1, m[2], Math.atan2(-dz, dx) / DEG, Math.max(8, L - a[2] - b[2]), m[1] - lo - 4, 220);
}

// ── 합창당: 기둥처럼 선 갈비뼈 열 개, 그 위의 둥근 껍질 지붕. 기둥 사이로 날아 들어가 지날 수 있다 ──
export function hall(w, K) {
  const [x, z] = HALL, y0 = gy(x, z), R = HALL_R, Hy = y0 + HALL_Y, N = 10;
  // 바닥: 진주빛 원판 + 발광 고리
  w.mesh(ribDomeG(10), M(x, y0 - 0.9, z, R + 3, 0.12, R + 3), SHELL, "paint");
  ring(w, x, y0 + 0.2, z, R - 2, 0.3, TEAL, { pitch: 90, col: false, mat: "glow", seg: 48 });
  ring(w, x, y0 + 0.2, z, 9, 0.25, PINK, { pitch: 90, col: false, mat: "glow", seg: 32 });
  w.pool(x, y0 + 0.1, z, R, VIO2, 0.25);
  // 기둥 갈비뼈: 바닥에서 살짝 바깥으로 부풀었다 지붕 테로 들어간다
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, rr = R - 1 + Math.sin(t * Math.PI) * 2.2; pts.push([x + c * rr, y0 + t * HALL_Y, z + s * rr]); }
    for (let k = 0; k < 6; k++) tube(w, ...pts[k], ...pts[k + 1], 1.25 - k * 0.06, BONE, { mat: "paint", col: true });
    lump(w, pts[0][0], y0 + 0.6, pts[0][2], 2.6, 1.4, 2.6, BONE2, { mat: "paint" });
    tube(w, pts[1][0] - c * 1.2, pts[1][1], pts[1][2] - s * 1.2, pts[5][0] - c * 1.2, pts[5][1], pts[5][2] - s * 1.2, 0.2, VIO2, { mat: "glow" });
    // 지붕 위로 이어지는 갈비(장식)
    for (let k = 0; k < 5; k++) {
      const t0 = k / 5, t1 = (k + 1) / 5, e0 = t0 * Math.PI / 2, e1 = t1 * Math.PI / 2;
      tube(w, x + c * R * Math.cos(e0), Hy + Math.sin(e0) * 22, z + s * R * Math.cos(e0), x + c * R * Math.cos(e1), Hy + Math.sin(e1) * 22, z + s * R * Math.cos(e1), 0.9, BONE2);
    }
    w.gap("합창당 기둥 사이", x + Math.cos(a + Math.PI / N) * R, y0 + 8, z + Math.sin(a + Math.PI / N) * R, -(a + Math.PI / N) / DEG + 90, 9, 12, 260);
  }
  // 천장: 빛나는 무늬판, 그 위로 껍질 지붕
  w.mesh(ribDomeG(10), M(x, Hy, z, R + 0.6, 22, R + 0.6), PEARL, "paint");
  ring(w, x, Hy + 0.3, z, R + 0.4, 1.1, SHELL2, { pitch: 90, col: false, seg: 40 });
  for (const [rr, c] of [[R - 1, VIO2], [18, TEAL], [10, PINK], [4, TEAL]]) ring(w, x, Hy - 0.15, z, rr, 0.35, c, { pitch: 90, col: false, mat: "glow", seg: 40 });
  {
    const g = new THREE.CircleGeometry(R - 0.5, 40); g.rotateX(Math.PI / 2);
    w.mesh(g, M(x, Hy - 0.1, z), 0x2a1650, "flat");
  }
  // 지붕 충돌: 층층이 쌓은 팔각판 (천장 아래 공간만 비운다)
  for (const [y, rr, h] of [[Hy, R + 0.4, 8], [Hy + 8, R * 0.84, 7], [Hy + 15, R * 0.6, 6], [Hy + 21, R * 0.25, 3]]) {
    for (const yaw of [0, 45]) w.col.addBox(V3(x, y + h / 2, z), V3(rr * 0.86, h / 2, rr * 0.86), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw * DEG, 0)));
  }
  // 천장에서 늘어진 빛 촉수(충돌 없음): 가운데 길은 비운다
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rr = 13 + (i % 3) * 3, L = 4 + (i % 4) * 1.5;
    const tx = x + Math.cos(a) * rr, tz = z + Math.sin(a) * rr;
    tube(w, tx, Hy, tz, tx + Math.cos(a) * 0.8, Hy - L, tz + Math.sin(a) * 0.8, 0.12, VIO2, { mat: "glow" });
    bead(w, tx + Math.cos(a) * 0.8, Hy - L - 0.3, tz + Math.sin(a) * 0.8, 0.45, i % 2 ? TEAL : PINK);
  }
  // 꼭대기: 노래 결정 + 하늘로 오르는 빛
  shard(w, x, Hy + 21.5, z, 2.2, 14, 0, 0, VIO2, { mat: "glow", col: true });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * 360; shard(w, x + Math.cos(a * DEG) * 2.4, Hy + 21, z + Math.sin(a * DEG) * 2.4, 0.8, 6, 30, -a + 90, k % 2 ? VIO : 0x7a3cf0); }
  w.shaft(x, Hy + 80, z, 0.5, 2.6, 46, VIO2, 0.09);
  K.blink.add(x, Hy + 36, z, PINK, 0.7, 0);
}

// ── 생체 요람과 정박한 모함: 땅에서 솟은 거대한 갈비뼈 우리 안에 모함이 떠 있다 ──
export function cradle(w, K) {
  const [cx, cz] = CRADLE, y0 = gy(cx, cz), yaw = SHIP_YAW * DEG, ux = Math.cos(yaw), uz = -Math.sin(yaw), px = -uz, pz = ux;   // u: 함선 축, p: 가로
  const P = (u, v) => [cx + ux * u + px * v, cz + uz * u + pz * v];
  // 갈비뼈 우리: 함선 축을 따라 다섯 쌍
  for (let i = -2; i <= 2; i++) {
    const u = i * 17, [ax, az] = P(u, -31), [bx, bz] = P(u, 31);
    ribArch(w, K, ax, gy(ax, az), az, bx, gy(bx, bz), bz, 64 - Math.abs(i) * 6, { t: 1.8, n: 16, name: "요람 갈비뼈 아래", pts: 280 });
  }
  // 척추: 갈비뼈 꼭대기를 잇는 등뼈
  const sp = [];
  for (let i = -2; i <= 2; i++) { const [x, z] = P(i * 17, 0); sp.push([x, y0 + 64 - Math.abs(i) * 6 + 1.6, z]); }
  for (let i = 0; i < sp.length - 1; i++) tube(w, ...sp[i], ...sp[i + 1], 1.6, BONE2, { col: true });
  for (const s of sp) w.mesh(lumpG(), M(s[0], s[1] + 1, s[2], 3, 2.2, 3), BONE, "flat");
  // 바닥: 발사 둥지(겹 고리와 빛 웅덩이), 탯줄 관
  ring(w, cx, y0 + 0.3, cz, 22, 0.6, FLESH2, { pitch: 90, col: false, seg: 48 });
  ring(w, cx, y0 + 0.35, cz, 16, 0.3, PINK, { pitch: 90, col: false, mat: "glow", seg: 40 });
  ring(w, cx, y0 + 0.35, cz, 8, 0.3, TEAL, { pitch: 90, col: false, mat: "glow", seg: 32 });
  w.pool(cx, y0 + 0.2, cz, 26, PINK, 0.26);
  w.shaft(cx, SHIP_Y - 10, cz, 2, 9, SHIP_Y - 12 - y0, PINK, 0.08);
  for (const s of [-1, 1]) {
    const [bx, bz] = P(s * 40, 0), [tx, tz] = P(s * 36, 0);
    lump(w, bx, gy(bx, bz) + 0.5, bz, 5, 2, 5, FLESH, { mat: "paint" });
    let prev = [bx, gy(bx, bz) + 1, bz];
    for (let k = 1; k <= 8; k++) {
      const t = k / 8, p = [bx + (tx - bx) * t + Math.sin(t * 5) * 1.5, prev[1] + (SHIP_Y - 8 - gy(bx, bz)) / 8, bz + (tz - bz) * t];
      tube(w, ...prev, ...p, 1.3 - t * 0.4, FLESH2, { col: k < 3 });
      tube(w, prev[0], prev[1], prev[2], p[0], p[1], p[2], 1.45 - t * 0.4, VIO2, { mat: "glow" });
      prev = p;
    }
  }
  mothership(w, K, cx, SHIP_Y, cz, SHIP_YAW);
}

// 에일 모함 '요람의 아이': 길쭉한 갑각 몸통, 겹친 껍질판, 등 지느러미, 꼬리 엔진 포드, 늘어진 촉수
export function mothership(w, K, x, y, z, yawDeg, s = 1) {
  const yaw = yawDeg * DEG, ux = Math.cos(yaw), uz = -Math.sin(yaw), px = -uz, pz = ux, L = SHIP_L * s;
  const P = (u, v, h) => [x + ux * u + px * v, y + h, z + uz * u + pz * v];
  const sph = new THREE.SphereGeometry(1, 28, 14);
  // 몸통: 겹친 타원체 판(앞 → 뒤로 짙어진다)
  w.mesh(sph, M(x, y, z, L * 0.5, 12 * s, 17 * s, 0, yawDeg, 0), 0x4a2c7a, "paint");
  for (let k = 0; k < 6; k++) {
    const u = L * (0.34 - k * 0.13), sc = 1 - Math.abs(k - 2.2) * 0.12;
    const [qx, qy, qz] = P(u, 0, 2.5 * s);
    w.mesh(sph, M(qx, qy, qz, L * 0.12, 11.5 * s * sc, 17.6 * s * sc, 0, yawDeg, 0), k % 2 ? 0x7a5ab8 : 0x5e3e9e, "paint");
    // 판 테두리 발광
    const [rx, ry, rz] = P(u - L * 0.1, 0, 2 * s);
    ring(w, rx, ry, rz, 15.5 * s * sc, 0.28, k % 2 ? VIO2 : PINK, { yaw: yawDeg + 90, col: false, mat: "glow", seg: 36 });
  }
  // 옆구리 빛 점 두 줄
  for (let k = 0; k < 14; k++) for (const sd of [-1, 1]) {
    const u = L * (-0.36 + k * 0.055), e = 1 - Math.pow(u / (L * 0.5), 2);
    if (e <= 0.05) continue;
    const [lx, ly, lz] = P(u, sd * 16.4 * s * Math.sqrt(e), 1.5 * s);
    bead(w, lx, ly, lz, 0.75 * s, k % 3 ? TEAL : PINK);
  }
  // 배: 연보라 살갗, 빛 혈관 세 줄
  const [bx, by, bz] = P(0, 0, -3 * s);
  w.mesh(sph, M(bx, by, bz, L * 0.46, 9 * s, 13 * s, 0, yawDeg, 0), FLESH2, "paint");
  for (const v of [-7, 0, 7]) {
    let prev = null;
    for (let k = 0; k <= 10; k++) { const u = L * (-0.42 + k * 0.084), e = 1 - Math.pow(u / (L * 0.46), 2); const p = P(u, v * s * Math.sqrt(Math.max(0, e)), -3 * s - 9 * s * Math.sqrt(Math.max(0, e - (v * v) / 169)) - 0.2); if (prev) tube(w, ...prev, ...p, 0.35 * s, v ? VIO2 : TEAL, { mat: "glow" }); prev = p; }
  }
  // 머리: 빛나는 입(겹 고리) + 감각 촉수
  const [hx, hy, hz] = P(L * 0.5, 0, 0);
  ring(w, hx, hy, hz, 6.5 * s, 0.9 * s, BONE2, { yaw: yawDeg + 90, col: false, seg: 28 });
  ring(w, hx + ux * 0.6, hy, hz + uz * 0.6, 4.6 * s, 0.5 * s, PINK, { yaw: yawDeg + 90, col: false, mat: "glow", seg: 24 });
  w.mesh(sph, M(hx - ux * 2, hy, hz - uz * 2, 2.2 * s, 4.2 * s, 4.2 * s, 0, yawDeg, 0), PINK, "glow");
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const a0 = P(L * 0.48, c * 7 * s, sn * 6 * s), a1 = P(L * 0.62, c * 11 * s, sn * 9 * s - 3 * s), a2 = P(L * 0.7, c * 13 * s, sn * 10 * s - 8 * s);
    tube(w, ...a0, ...a1, 0.7 * s, FLESH2); tube(w, ...a1, ...a2, 0.45 * s, FLESH2);
    bead(w, ...a2, 0.7 * s, k % 2 ? TEAL : PINK);
  }
  // 등 지느러미: 얇은 막 세 장
  for (let k = 0; k < 3; k++) {
    const u = L * (0.2 - k * 0.2), h = (16 - k * 3) * s, [fx, fy, fz] = P(u, 0, 10 * s);
    w.box(fx, fy, fz, L * 0.16, h, 0.8 * s, k % 2 ? SHELL2 : 0x4a2a78, { mat: "paint", ry: yawDeg, rz: 0, col: false });
    w.box(fx, fy + h - 0.6, fz, L * 0.16, 0.6, 1, VIO2, { mat: "glow", ry: yawDeg, col: false });
    K.blink.add(fx, fy + h + 0.8, fz, PINK, 0.6, k);
  }
  // 꼬리 엔진 포드 셋
  for (const [v, h] of [[-9, -2], [9, -2], [0, 7]]) {
    const a = P(-L * 0.44, v * s, h * s), b = P(-L * 0.6, v * s * 1.2, h * s * 1.1);
    tube(w, ...a, ...b, 3.6 * s, SHELL2, { mat: "paint" });
    w.sph(b[0], b[1], b[2], 3.4 * s, TEAL, { mat: "glow", col: false });
    w.shaft(b[0] - ux * 4, b[1] + 3.4, b[2] - uz * 4, 0.2, 3, 7, TEAL, 0.12);
  }
  // 늘어진 촉수(충돌 없음)
  for (let k = 0; k < 9; k++) {
    const u = L * (-0.3 + (k % 5) * 0.14), v = (k < 5 ? -5 : 5) * s;
    let prev = P(u, v, -10 * s);
    for (let j = 1; j <= 5; j++) { const p = [prev[0] + Math.sin(j + k) * 0.8, prev[1] - 2.6 * s, prev[2] + Math.cos(j * 1.3 + k) * 0.8]; tube(w, ...prev, ...p, (0.6 - j * 0.08) * s, j % 2 ? FLESH2 : VIO); prev = p; }
    bead(w, ...prev, 0.5 * s, k % 2 ? TEAL : VIO2);
  }
  // 충돌: 몸통을 따라 구 여러 개
  for (let k = -4; k <= 4; k++) { const u = k * L * 0.105, e = 1 - Math.pow(u / (L * 0.5), 2); const c = P(u, 0, 1 * s); w.col.addSphere(V3(...c), Math.max(4, 12.5 * s * Math.sqrt(Math.max(0.05, e)))); }
  for (let k = 0; k < 3; k++) { const c = P(L * (0.2 - k * 0.2), 0, 18 * s); w.col.addBox(V3(...c), V3(L * 0.08, 7 * s, 0.6 * s), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawDeg * DEG, 0))); }
  w.gap("모함 배 아래", x, y - 21 * s, z, yawDeg, 30, 14, 500);
}

// ── 첨탑 숲(북서): 결정 첨탑과 산호 첨탑, 빛 버섯. 가운데 공터는 비운다 ──
export function spires(w, K, ctx) {
  const r = w.rand, I = ISL.spire;
  const SPOTS = [[-200, -120, 92, 5.5], [-118, -206, 84, 5], [-196, -196, 74, 4.6], [-210, -160, 58, 4], [-160, -212, 64, 4.2], [-176, -118, 46, 3.4], [-140, -192, 40, 3.2], [-218, -128, 38, 3]];
  for (const [x, z, H, R] of SPOTS) {
    if (!ctx.free(x, z, R + 2)) continue;
    crystalSpire(w, K, x, z, gy(x, z), H, R, { colors: r() < 0.5 ? [0x7d6cff, 0x6a4ff0, 0x9c86ff] : [0x3fb8e8, 0x2a8ad0, 0x6ad8ff], glow: r() < 0.5 ? TEAL : VIO2 });
    ctx.taken.push([x, z, R * 2.6]);
  }
  // 산호 첨탑: 키 큰 분홍 산호
  let n = 0;
  for (let i = 0; i < 700 && n < 26; i++) {
    const a = r() * 6.28, d = 30 + r() * 52, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d, s = 1.4 + r() * 2.2;
    if (!islandOf(x, z, 6) || !ctx.free(x, z, 5 * s * 0.6)) continue;
    coral(w, x, gy(x, z), z, s, r, { colors: n % 3 ? [0xff6ab8, 0xd04aa8, 0xff8acf] : [0x6a8aff, 0x4a5ad8, 0x8ab0ff], tip: n % 3 ? PINK : TEAL });
    ctx.taken.push([x, z, 3 * s]); n++;
  }
  for (let i = 0, k = 0; i < 500 && k < 30; i++) {
    const a = r() * 6.28, d = 20 + r() * 60, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d, s = 0.8 + r() * 1.6;
    if (!islandOf(x, z, 4) || !ctx.free(x, z, 2.5 * s)) continue;
    glowShroom(w, x, z, gy(x, z), s, r);
    ctx.taken.push([x, z, 2 * s]); k++;
  }
}

// ── 빛 늪(남동): 분지에 고인 빛나는 물, 둘레의 말미잘 숲 ──
export function lagoon(w, K, ctx) {
  const r = w.rand, I = ISL.lagoon;
  // 수면: 물결무늬가 흐르는 반투명 발광 원판
  const geo = new THREE.CircleGeometry(LAKE.R + 12, 64); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
    vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vP; uniform float t;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
      void main(){
        float d = length(vP) / ${(LAKE.R + 12).toFixed(1)};
        float w1 = n(vP * 0.18 + vec2(t * 0.2, t * 0.07)), w2 = n(vP * 0.41 - vec2(t * 0.13, -t * 0.19));
        float line = smoothstep(0.035, 0.0, abs(w1 - w2));
        float ripple = smoothstep(0.85, 1.0, sin(length(vP) * 0.5 - t * 1.6) * 0.5 + 0.5) * 0.35;
        vec3 c = mix(vec3(0.05, 0.42, 0.5), vec3(0.12, 0.85, 0.82), w1 * 0.6) + vec3(0.55, 1.0, 0.95) * line * 0.7 + vec3(0.6, 0.4, 1.0) * ripple;
        float a = (0.82 - smoothstep(0.85, 1.0, d) * 0.82);
        gl_FragColor = vec4(c * 1.4, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const lake = new THREE.Mesh(geo, mat);
  lake.position.set(LAKE.x, LAKE_Y, LAKE.z); lake.renderOrder = 3;
  w.scene.add(lake); w.disposables.push(geo, mat);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
  w.pool(LAKE.x, LAKE_Y + 0.05, LAKE.z, LAKE.R + 14, TEAL, 0.3);
  // 말미잘: 굵은 살 기둥 + 촉수 왕관
  let n = 0;
  for (let i = 0; i < 800 && n < 30; i++) {
    const a = r() * 6.28, d = LAKE.R + 4 + r() * 30, x = LAKE.x + Math.cos(a) * d, z = LAKE.z + Math.sin(a) * d, s = 1 + r() * 1.5;
    if (!islandOf(x, z, 5) || !ctx.free(x, z, 3 * s)) continue;
    anemone(w, x, gy(x, z), z, s, r);
    ctx.taken.push([x, z, 2.5 * s]); n++;
  }
  // 물 위로 솟은 빛 결정 바위
  for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28 + 0.4, d = 10 + (k % 3) * 9, x = LAKE.x + Math.cos(a) * d, z = LAKE.z + Math.sin(a) * d; crystals(w, x, z, 0.7 + (k % 3) * 0.35, r, { y: Math.max(LAKE_Y - 0.6, gy(x, z)), colors: [0x3fd8e8, 0x2aa8d0, 0x8af0ff] }); }
}
function anemone(w, x, y, z, s, r) {
  const h = 2.4 * s;
  w.cyl(x, y - 0.3, z, 0.9 * s, h, r() < 0.5 ? 0xe05aa0 : 0x9a4ae0, { mat: "paint", rt: 0.7 * s, col: s > 1.4 });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const p0 = [x + c * 0.55 * s, y + h, z + sn * 0.55 * s], p1 = [x + c * 1.6 * s, y + h + 1.2 * s, z + sn * 1.6 * s];
    tube(w, ...p0, ...p1, 0.14 * s, k % 2 ? 0xff9ad8 : 0xffd0ff);
    bead(w, ...p1, 0.22 * s, k % 2 ? TEAL : PINK);
  }
  bead(w, x, y + h + 0.1, z, 0.6 * s, LIME);
}

// ── 노래 바위(북 디딤섬): 둥글게 선 결정 선돌과 가운데 공명 결정 ──
export function henge(w, K, ctx) {
  const [cx, cz] = HENGE, R = 22, N = 11, r = w.rand;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    if (!ctx.road(x, z, 7) || Math.abs(x - cx) < 9 && z > cz) continue;
    const H = 12 + (i % 3) * 4;
    shard(w, x, gy(x, z) - 0.5, z, 2.2, H, 4 + r() * 6, (-a / DEG) + 90, i % 2 ? 0x7d6cff : 0x5a8aff);
    shard(w, x, gy(x, z) + 1, z, 0.8, H * 0.8, 4, 0, i % 2 ? VIO2 : TEAL, { mat: "glow", col: false });
    w.pool(x, gy(x, z), z, 5, i % 2 ? VIO2 : TEAL, 0.3);
  }
  const y = gy(cx, cz - 6);
  shard(w, cx, y - 0.5, cz - 6, 3, 26, 0, 0, 0x8a6cff);
  shard(w, cx, y, cz - 6, 1.2, 22, 0, 0, PINK, { mat: "glow", col: false });
  ring(w, cx, y + 18, cz - 6, 6, 0.3, PINK, { pitch: 90, col: false, mat: "glow", seg: 32 });
  ring(w, cx, y + 24, cz - 6, 4, 0.25, TEAL, { pitch: 80, col: false, mat: "glow", seg: 28 });
  w.pool(cx, y, cz - 6, 16, PINK, 0.25);
  K.blink.add(cx, y + 27, cz - 6, PINK, 0.6, 1);
  ctx.taken.push([cx, cz, R + 4]);
}

// ── 알 둥지(동 디딤섬): 살 받침에 담긴 빛나는 알 무리, 그 위를 덮은 막 아치 ──
export function nest(w, K, ctx) {
  const [cx, cz] = NEST, r = w.rand;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3, d = 6 + (k % 3) * 5, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = gy(x, z);
    if (!ctx.road(x, z, 5)) continue;
    lump(w, x, y + 0.4, z, 2.6, 1.2, 2.6, FLESH, { mat: "paint" });
    for (let j = 0; j < 3; j++) { const b = r() * 6.28, e = r() * 1.2; w.sph(x + Math.cos(b) * e, y + 1.6 + r() * 0.6, z + Math.sin(b) * e, 0.9 + r() * 0.5, j % 2 ? PINK : TEAL, { mat: "glow", col: false }); }
    w.col.addSphere(V3(x, y + 1.2, z), 2.2);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + 0.5, c = Math.cos(a), s = Math.sin(a), ax = cx + c * 15, az = cz + s * 15, bx = cx - c * 15, bz = cz - s * 15;
    ribArch(w, K, ax, gy(ax, az), az, bx, gy(bx, bz), bz, 18 + i * 2, { t: 0.8, color: FLESH2, color2: FLESH, light: PINK, name: "알 둥지 아치 아래" });
  }
  w.pool(cx, gy(cx, cz), cz, 20, PINK, 0.22);
  ctx.taken.push([cx, cz, 20]);
}

// ── 어미나무(남 디딤섬): 비틀린 줄기, 넓게 퍼진 가지, 늘어진 빛 덩굴 ──
export function elderTree(w, K, ctx) {
  const [cx, cz] = TREE, y = gy(cx, cz), H = 34, r = w.rand;
  // 뿌리
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, L = 10 + r() * 6; tube(w, cx, y + 3, cz, cx + Math.cos(a) * L, gy(cx + Math.cos(a) * L, cz + Math.sin(a) * L) - 0.4, cz + Math.sin(a) * L, 1.4, ROOT); }
  // 줄기: 살짝 비튼 관 여러 마디
  let prev = [cx, y - 1, cz];
  for (let k = 1; k <= 6; k++) { const t = k / 6, p = [cx + Math.sin(t * 3) * 2, y + t * H, cz + Math.cos(t * 2.4) * 1.5]; tube(w, ...prev, ...p, 3.6 - t * 1.4, ROOT2, { col: true }); prev = p; }
  const top = prev;
  tube(w, cx + 1.2, y + 2, cz + 1, top[0] + 1, top[1] - 2, top[2] + 1, 0.3, TEAL, { mat: "glow" });
  // 가지와 빛 덩굴, 끝의 빛 덩어리
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + r() * 0.3, L = 18 + r() * 8, e = [top[0] + Math.cos(a) * L, top[1] + 4 + r() * 6, top[2] + Math.sin(a) * L];
    const m = [top[0] + Math.cos(a) * L * 0.5, top[1] + 6, top[2] + Math.sin(a) * L * 0.5];
    tube(w, ...top, ...m, 1.4, ROOT2, { col: true }); tube(w, ...m, ...e, 0.8, ROOT2, { col: true });
    lump(w, e[0], e[1] + 1, e[2], 6 + r() * 2, 3, 6 + r() * 2, k % 2 ? 0x6a3cd0 : 0x3a6ad8, { mat: "paint", col: true });
    lump(w, e[0], e[1] - 0.6, e[2], 5.2, 1.4, 5.2, k % 2 ? VIO2 : TEAL, { mat: "glow" });
    for (let j = 0; j < 5; j++) {
      const b = r() * 6.28, d = r() * 4.5, vx = e[0] + Math.cos(b) * d, vz = e[2] + Math.sin(b) * d, L2 = 6 + r() * 10;
      tube(w, vx, e[1] - 1, vz, vx, e[1] - 1 - L2, vz, 0.12, j % 2 ? TEAL : VIO2, { mat: "glow" });
      bead(w, vx, e[1] - 1.4 - L2, vz, 0.35, j % 2 ? LIME : PINK);
    }
  }
  lump(w, top[0], top[1] + 4, top[2], 9, 5, 9, 0x5a34c0, { mat: "paint", col: true });
  w.pool(cx, y + 0.1, cz, 34, TEAL, 0.18);
  w.gap("어미나무 가지 아래", cx, y + 14, cz - 14, 0, 18, 14, 300);
  K.blink.add(top[0], top[1] + 9.5, top[2], LIME, 0.6, 0);
  ctx.taken.push([cx, cz, 16]);
}

// ── 숨구멍(서 디딤섬): 땅이 숨 쉬듯 빛 기둥을 뿜는 화구 셋 ──
export function vents(w, K, ctx) {
  const r = w.rand;
  for (const [x, z] of VENTS) {
    const y = gy(x, z);
    w.cyl(x, y - 0.5, z, 6, 4, ROOT2, { mat: "paint", rt: 3.2 });
    w.cyl(x, y + 3.5, z, 3.2, 0.4, PINK, { mat: "glow", col: false, rt: 3 });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; shard(w, x + Math.cos(a) * 5.5, y, z + Math.sin(a) * 5.5, 0.8, 4 + r() * 4, 30, -a / DEG + 90, k % 2 ? 0xd05aa8 : VIO); }
    w.shaft(x, y + 60, z, 1, 3.4, 56, PINK, 0.11);
    w.pool(x, y + 0.1, z, 12, PINK, 0.3);
    ctx.taken.push([x, z, 9]);
  }
}

// ── 뿌리 다리 장식: 틈 위 구간에 뼈 아치, 양옆으로 안개 속까지 늘어진 뿌리, 마루를 따라 빛 혈관 ──
export function bridgeDecor(w, K) {
  const r = w.rand;
  for (const B of BRIDGES) {
    const [s0, s1] = B.span, px = -B.uz, pz = B.ux, len = s1 - s0;
    const at = (s) => [B.a[0] + B.ux * s, B.a[1] + B.uz * s];
    // 마루 빛 혈관: 가운데에서 비켜난 두 줄
    for (const off of [-5.5, 5.5]) {
      let prev = null;
      for (let s = s0 - 6; s <= s1 + 6; s += 4) {
        const [x, z] = at(s), wob = Math.sin(s * 0.21 + off) * 1.2, qx = x + px * (off + wob), qz = z + pz * (off + wob), p = [qx, height(qx, qz) + 0.18, qz];
        if (prev) tube(w, ...prev, ...p, 0.2, off < 0 ? VIO2 : TEAL, { mat: "glow" });
        prev = p;
      }
    }
    // 뼈 아치 (트럭이 지나는 길 위로 높게)
    const n = Math.max(1, Math.round(len / 26));
    for (let k = 0; k < n; k++) {
      const s = s0 + (k + 0.5) * (len / n), [x, z] = at(s), hw = BRIDGE_W / 2 - 0.5;
      const ax = x - px * hw, az = z - pz * hw, bx = x + px * hw, bz = z + pz * hw;
      ribArch(w, K, ax, height(ax, az) - 0.5, az, bx, height(bx, bz) - 0.5, bz, 15 + (k % 2) * 4, { t: 0.9, n: 12, name: "뿌리 다리 아치 아래", pts: 220 });
    }
    // 늘어진 뿌리: 다리 옆구리에서 아래 안개까지
    for (let s = s0 + 3; s < s1 - 3; s += 7 + r() * 5) {
      for (const sd of [-1, 1]) {
        const [x, z] = at(s), off = BRIDGE_W / 2 + 2 + r() * 3, qx = x + px * off * sd, qz = z + pz * off * sd, y = height(qx, qz);
        const L = 14 + r() * 30;
        let prev = [qx, y + 1.5, qz];
        for (let j = 1; j <= 4; j++) { const p = [prev[0] + px * sd * (0.8 + r()), prev[1] - L / 4, prev[2] + pz * sd * (0.8 + r())]; tube(w, ...prev, ...p, (1.1 - j * 0.2) * (0.7 + r() * 0.6), j % 2 ? ROOT : ROOT2); prev = p; }
        if (r() < 0.4) bead(w, ...prev, 0.5, r() < 0.5 ? TEAL : PINK);
      }
    }
  }
}

// 섬 둘레 절벽에 매달린 뿌리 커튼과 빛 이끼 (틈 쪽으로)
export function cliffRoots(w, K) {
  const r = w.rand;
  for (const [id, I] of Object.entries(ISL)) {
    const n = Math.round(I.R * 0.36);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.1;
      // 가장자리 찾기: 바깥으로 걸어가며 높이가 뚝 떨어지는 곳
      let d = I.R * 0.8, x = 0, z = 0;
      for (; d < I.R * 1.3; d += 1.5) { x = I.x + Math.cos(a) * d; z = I.z + Math.sin(a) * d; if (height(x, z) < I.top - 8) break; }
      const bi = BRIDGES.some((B) => { const t = ((x - B.a[0]) * B.ux + (z - B.a[1]) * B.uz); const dd = Math.abs((x - B.a[0]) * -B.uz + (z - B.a[1]) * B.ux); return t > -10 && t < B.len + 10 && dd < BRIDGE_W; });
      if (bi) continue;
      const y = I.top - 3, L = 18 + r() * 40, ox = Math.cos(a), oz = Math.sin(a);
      let prev = [x - ox * 2, y, z - oz * 2];
      for (let j = 1; j <= 4; j++) { const p = [prev[0] + ox * (0.6 + r() * 0.8), prev[1] - L / 4, prev[2] + oz * (0.6 + r() * 0.8)]; tube(w, ...prev, ...p, (1.3 - j * 0.24) * (0.7 + r() * 0.6), j % 2 ? ROOT : ROOT2); prev = p; }
      if (r() < 0.5) bead(w, ...prev, 0.55, r() < 0.5 ? TEAL : VIO2);
      if (k % 3 === 0) lump(w, x - ox * 1.5, y - 4 - r() * 8, z - oz * 1.5, 2.5, 3.5, 2.5, r() < 0.5 ? 0x2a8a8a : 0x6a3aa0, { mat: "paint" });
      void id;
    }
  }
}
