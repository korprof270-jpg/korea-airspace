// 네온 아레나 디테일: 바닥 표시, 벽 리브·벽화·배관, 관중석 띠 전광판·중계석, 천장 전광 큐브·조명 리그, 기지 조종석·정비대, 움직이는 불빛
// 구조·트랙·임무 좌표는 건드리지 않는다. 충돌체는 벽 쪽 큰 덩어리에만 준다(작은 소품은 장식).
// 비행 연습 코스 영역(x -28..22, z -24..16, 높이 40m 까지)에는 바닥 칠 말고는 아무것도 놓지 않는다.
import * as THREE from "../../vendor/three.module.min.js";
import { DEG, MAG, CYA, YEL, GRN, ORG, VIO, RED, WARM, WHT, ring, bar, truss, Geo, glowMat, neonText, hangulOK } from "./city-kit.js";

const HX = 100, HZ = 64, HH = 48, BLU = 0x2f8cff;
const DARK = 0x1c2033, PANEL = 0x2d3350, STEEL = 0x4a5170, INK = 0x0c0e18;
const dim = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const S = (id, text, icn, fg, frame, kind) => ({ id, text, icon: icn, fg, frame, kind });

// 간판 추가분 (wide 4, tall 4) — 아틀라스 남은 칸을 채운다
export const SIGNS_EXTRA = [
  S("exit", ["비상구", "EXIT"], "arrow", 0x8dffb0, GRN), S("pit", ["정비 구역", "PIT AREA"], "wheel", YEL, YEL),
  S("live", ["생중계", "ON AIR"], "star", 0xff8a94, RED), S("cup", ["네온 컵", "NEON CUP"], "bolt", 0xffffff, MAG),
  S("pilot", ["파일럿", "PILOT"], "drone", 0xffffff, CYA, "tall"), S("charge", ["충전", "CHARGE"], "bolt", GRN, GRN, "tall"),
  S("speed", ["질주", "SPEED"], "arrow", ORG, ORG, "tall"), S("fly", ["비행", "FLY"], "star", VIO, VIO, "tall"),
];
export const AISLES = [-30, 0, 30];   // 관중석 통로(x)

export function detail(w, K) {
  const r = w.rand, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const D = (x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { col: false, ...o });               // 장식 상자
  const P = (x, y, z, sx, sy, sz, c = PANEL, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "std:panel", tile: 4, ...o });
  const glow = (x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "glow", col: false, ...o });
  // 바닥 선: 두 점을 잇는 얇은 띠
  const line = (ax, az, bx, bz, wd, c, y = 0.06, mat = "paint") => {
    const dx = bx - ax, dz = bz - az;
    w.box((ax + bx) / 2, y, (az + bz) / 2, Math.hypot(dx, dz), 0.03, wd, c, { col: false, ao: false, mat, ry: -Math.atan2(dz, dx) / DEG });
  };
  const dash = (ax, az, bx, bz, wd, c, on, off, y) => {
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let s = 0; s + on <= L + 0.01; s += on + off) line(ax + ux * s, az + uz * s, ax + ux * (s + on), az + uz * (s + on), wd, c, y);
  };
  const chev = (x, z, a, s, wd, c, y, mat) => { for (const k of [-0.62, 0.62]) line(x, z, x - Math.cos(a + k) * s, z - Math.sin(a + k) * s, wd, c, y, mat); };
  const square = (x, z, sx, sz, wd, c, y) => { for (const k of [-1, 1]) { line(x - sx / 2, z + (k * sz) / 2, x + sx / 2, z + (k * sz) / 2, wd, c, y); line(x + (k * sx) / 2, z - sz / 2, x + (k * sx) / 2, z + sz / 2, wd, c, y); } };
  const edge = (x, y, z, sx, sz, c, t = 0.12) => { for (const s of [-1, 1]) { glow(x, y, z + (s * sz) / 2, sx, t, t, c); glow(x + (s * sx) / 2, y, z, t, t, sz, c); } };
  // 늘어진 케이블
  const sag = (a, b, drop, n = 8, rad = 0.05, c = INK) => {
    let p = a;
    for (let i = 1; i <= n; i++) {
      const t = i / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - drop * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
      bar(w, p[0], p[1], p[2], q[0], q[1], q[2], rad, c, "paint", 4); p = q;
    }
  };
  const zoneOf = (sx, sz) => (sx < 0 ? (sz < 0 ? ["cube", CYA, "fly"] : ["mezz", GRN, "speed"]) : sz < 0 ? ["helix", ORG, "speed"] : ["hang", VIO, "fly"]);
  // 깜박이는 불빛 두 묶음(A: 느린 숨쉬기 경광등, B: 충전 표시·방송 표시)
  const bkA = new Geo(), bkB = new Geo();

  // ════ 바닥 ════
  // 구역 바닥의 색 얼룩(4m 판 단위로 밝기가 조금씩 다른 패널)
  for (const [x, z, sx, sz, c] of [[-78, 0, 44, 76, 0x14284e], [78, 0, 44, 76, 0x4e1420], [0, -52, 112, 24, 0x3c1444], [0, 52, 112, 24, 0x3e3812],
    [-78, -51, 44, 26, 0x0e3a44], [-78, 51, 44, 26, 0x123c22], [78, -51, 44, 26, 0x4a2a0c], [78, 51, 44, 26, 0x2a1a50]]) {
    const nx = Math.floor(sx / 4), nz = Math.floor(sz / 4), x0 = x - nx * 2 + 2, z0 = z - nz * 2 + 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (r() > 0.3) continue;
      w.box(x0 + i * 4, 0.06, z0 + j * 4, 3.84, 0.012, 3.84, dim(c, r() < 0.5 ? 0.7 + r() * 0.2 : 1.15 + r() * 0.3), { col: false, ao: false, mat: "paint" });
    }
  }
  // 가운데 바닥: 코어 눈금, 격자 십자 표시, 보급소·타워·기둥 테두리
  const LO = 0.012;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 6.2832, len = i % 4 ? 0.9 : 2.2, c = Math.cos(a), s = Math.sin(a);
    line(c * 29.2, s * 29.2, c * (29.2 + len), s * (29.2 + len), i % 4 ? 0.18 : 0.3, i % 12 ? 0x7c86b0 : YEL, LO);
  }
  for (let gx = -52; gx <= 52; gx += 8) for (let gz = -36; gz <= 36; gz += 8) {
    if (Math.hypot(gx, gz) < 33 || (Math.abs(Math.abs(gx) - 40) < 10 && Math.abs(gz) < 10) || (Math.abs(Math.abs(gx) - 40) < 5 && Math.abs(Math.abs(gz) - 36) < 5)) continue;
    line(gx - 0.7, gz, gx + 0.7, gz, 0.14, 0x3a6f96, LO); line(gx, gz - 0.7, gx, gz + 0.7, 0.14, 0x3a6f96, LO);
  }
  for (const [x, z] of [[0, -30], [0, 30], [-18, 0], [18, 0]]) {
    square(x, z, 7, 7, 0.16, 0x9aa3c8, LO);
    for (const kx of [-1, 1]) for (const kz of [-1, 1]) line(x + kx * 2.2, z + kz * 3.5, x + kx * 3.5, z + kz * 2.2, 0.16, 0x9aa3c8, LO);
  }
  for (const s of [-1, 1]) {
    const c = s > 0 ? ORG : GRN;
    square(s * 40, 0, 17, 17, 0.28, dim(c, 0.55), LO);
    for (const kx of [-1, 1]) for (const kz of [-1, 1]) w.box(s * 40 + kx * 8.5, LO, kz * 8.5, 2, 0.03, 2, 0xdadada, { col: false, ao: false, mat: "std:hazard", tile: 1 });
  }
  { const g = new THREE.RingGeometry(4.3, 4.75, 32); g.rotateX(-Math.PI / 2); for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.mesh(g, new THREE.Matrix4().makeTranslation(sx * 40, 0.035, sz * 36), dim(sz < 0 ? MAG : YEL, 0.55), "paint"); g.dispose(); }
  // 기지 → 코어 유도로(점선 테두리. 가운데 흐르는 화살표는 아래 움직이는 것에서)
  for (const s of [-1, 1]) for (const kz of [-1, 1]) for (const e of [-1.5, 1.5]) dash(s * 30.5, kz * 12 + e, s * 55, kz * 12 + e, 0.14, 0x8f98c0, 2.2, 1.6, LO);
  // 구역 경계 점선, 기지 이륙 패드
  for (const s of [-1, 1]) for (const kz of [-1, 1]) dash(s * 57, kz * 38, s * 99, kz * 38, 0.2, 0xb8c0e0, 3, 2, 0.062);
  for (const s of [-1, 1]) {
    const c = s < 0 ? BLU : RED;
    for (const x of [60.5, 88]) for (const z of [-16, -8, 8, 16]) {
      square(s * x, z, 3.2, 3.2, 0.14, dim(c, 0.9), 0.075); glow(s * x, 0.075, z, 0.5, 0.04, 0.5, c);
      line(s * x - 0.9, z, s * x + 0.9, z, 0.1, dim(c, 0.6), 0.075); line(s * x, z - 0.9, s * x, z + 0.9, 0.1, dim(c, 0.6), 0.075);
    }
  }
  // 슬라럼: 기둥 받침과 지그재그 화살표(서킷 투어 진행 방향 = -x)
  for (let i = -2; i <= 2; i++) w.cyl(i * 12, 0, 47, 1.25, 0.14, 0xdadada, { mat: "std:hazard", tile: 1, col: false });
  for (let i = -2; i < 2; i++) for (const t of [0.35, 0.65]) chev(i * 12 + 12 * t, 47 + (i % 2 ? 1 : -1) * (t < 0.5 ? -1.6 : 1.6) * 0.9, Math.PI, 1.3, 0.2, dim(YEL, 0.8), 0.075);
  // S자 터널: 지붕 위 발광 화살표, 바깥 벽의 줄 조명과 작은 창
  const TP = [[-44, -46], [-26, -46], [-10, -54], [10, -54], [26, -46], [44, -46]];
  for (let i = 0; i < 5; i++) {
    const [ax, az] = TP[i], [bx, bz] = TP[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx) / DEG, nx = -dz / L, nz = dx / L, c = i % 2 ? CYA : MAG;
    for (const t of [0.22, 0.5, 0.78]) chev(ax + dx * t + (dx / L) * 1.1, az + dz * t + (dz / L) * 1.1, Math.atan2(dz, dx), 2.4, 0.22, c, 6.2, "glow");
    for (const k of [-1, 1]) {
      const mx = (ax + bx) / 2 + nx * k * 4.63, mz = (az + bz) / 2 + nz * k * 4.63;
      glow(mx, 4.95, mz, L + 1.2, 0.1, 0.06, dim(c, 0.8), { ry }); glow(mx, 0.5, mz, L + 1.2, 0.08, 0.06, dim(c, 0.5), { ry });
      for (let s = -L / 2 + 1.6; s < L / 2 - 1; s += 3.2) glow(mx + (dx / L) * s, 2.5, mz + (dz / L) * s, 1.1, 0.5, 0.05, dim(i % 2 ? MAG : CYA, 0.45), { ry });
    }
  }

  // ════ 남·북 벽 (z = ±64) ════
  for (const s of [-1, 1]) {
    const ry = s < 0 ? 0 : 180, lc = s < 0 ? MAG : YEL;
    for (const sx of [-1, 1]) {
      const [zid, zc] = zoneOf(sx, s);
      // 모서리 구역 벽: 리브, 허리 벽과 경고 띠, 사선 벽화, 구역 네온 간판, 배관
      for (const x of [64, 72, 88, 96]) { D(sx * x, 0, s * 62.75, 0.7, HH, 0.5, DARK, { mat: "std:panel", tile: 4, ao: false }); glow(sx * x, 13, s * 62.46, 0.12, 22, 0.08, dim(zc, 0.6)); }
      D(sx * 80.2, 0, s * 62.82, 39.4, 3.2, 0.36, 0x202540, { mat: "std:panel", tile: 4 });
      w.box(sx * 80.2, 3.2, s * 62.82, 39.4, 0.36, 0.4, 0xdadada, { col: false, mat: "std:hazard", tile: 2 });
      w.box(sx * 80, 15.5, s * 62.93, 34, 2.8, 0.08, dim(zc, 0.38), { col: false, ao: false, mat: "paint", rz: sx * 16 });
      w.box(sx * 80, 20.3, s * 62.93, 34, 0.9, 0.08, dim(zc, 0.7), { col: false, ao: false, mat: "paint", rz: sx * 16 });
      w.box(sx * 80, 11.8, s * 62.93, 34, 0.5, 0.08, 0x59618a, { col: false, ao: false, mat: "paint", rz: sx * 16 });
      K.add(zid, sx * 72, 28, s * 62.3, 13, { ry });
      for (const [y, rad, c] of [[10.3, 0.16, 0x6a7296], [10.75, 0.16, 0x6a7296], [9.85, 0.1, ORG]]) bar(w, sx * 60.8, y, s * 62.3, sx * 99, y, s * 62.3, rad, c, "metal", 6);
      for (const x of [68, 76, 84, 92]) { D(sx * x, 9.6, s * 62.4, 0.5, 1.5, 0.4, 0x30364f); bar(w, sx * x, 3.5, s * 62.5, sx * x, 9.7, s * 62.5, 0.07, 0x6a7296, "metal", 5); }
      // 비상구
      for (const x of [70, 90]) door(sx * x, s * 62.55, 0, s);
      // 관중석 옆막이(끝 벽)와 대회 간판
      P(sx * 60.3, 13.4, s * 59.6, 0.5, 8.6, 8.8, 0x262b44);
      glow(sx * 60.3, 22, s * 59.6, 0.2, 0.14, 8.8, lc);
      K.add("cup", sx * 60.62, 17.7, s * 59.6, 6.6, { ry: sx * 90 });
      // 중계석(관중석 위 벽에 붙은 유리 부스)
      const bx = sx * 39;
      P(bx, 23.5, s * 62.5, 22, 4, 2.6, 0x232845);
      glow(bx, 24.5, s * 61.17, 20.8, 2, 0.06, dim(WARM, 0.5));
      for (const i of [-1, 1]) D(bx + i * 3.5, 24.4, s * 61.1, 0.14, 2.2, 0.12, DARK, { ao: false });
      for (let i = 0; i < 7; i++) { const px = bx - 8.6 + i * 2.9 + (r() - 0.5) * 1.2, h = 0.4 + r() * 0.2; D(px, 24.5, s * 61.12, 0.44, h, 0.05, INK, { ao: false }); D(px, 24.52 + h, s * 61.12, 0.24, 0.26, 0.05, INK, { ao: false }); }
      D(bx, 24.5, s * 61.12, 20.8, 0.22, 0.05, INK, { ao: false });   // 책상 선
      glow(bx, 27.5, s * 61.2, 22, 0.12, 0.12, lc); glow(bx, 23.42, s * 61.2, 22, 0.08, 0.1, dim(lc, 0.6));
      for (const k of [-9, 0, 9]) bar(w, bx + k, 21.6, s * 63.6, bx + k, 23.5, s * 61.4, 0.1, STEEL, "metal", 5);
      K.add("live", bx, 28.7, s * 61.3, 4.4, { ry });
      bkB.sph(bx - 2.9, 28.7, s * 61.3, 0.26, 0.26, 0.26, RED);
    }
    // 관중석 앞 띠 전광판 자리(판만. 글자는 아래 움직이는 것에서), 유리 난간, 통로 계단
    w.box(0, 12.1, s * 55.26, 120, 1.3, 0.3, 0x10131f, { ao: false });
    w.box(0, 14, s * 55.3, 120, 0.9, 0.08, 0x8fd3ff, { mat: "glass", col: false });
    for (let x = -60; x <= 60; x += 6) D(x, 14, s * 55.3, 0.1, 0.95, 0.12, STEEL, { ao: false });
    for (const ax of AISLES) for (let k = 0; k < 4; k++) {
      const z = s * (56.3 + k * 2.2), top = 14 + k * 2.2;
      D(ax, top, z, 1.6, 0.05, 2.2, 0x3d4570, { ao: false }); D(ax, top - 1.1, z - s * 0.55, 1.6, 1.1, 1.1, 0x333a5c, { ao: false });
      for (const e of [-0.8, 0.8]) glow(ax + e, top + 0.05, z, 0.07, 0.04, 2.2, lc);
    }
    // 관중석 아래: 보, 받침대, 내림 조명, 출입문
    D(0, 12.9, s * 59, 120, 0.5, 0.5, DARK, { ao: false });
    for (let x = -60; x <= 60; x += 24) bar(w, x, 8, s * 62.5, x, 13.3, s * 56, 0.16, STEEL, "metal", 6);
    for (const x of [-54, -24, 0, 24, 54]) {
      glow(x, 12.82, s * 59, 1.8, 0.08, 0.5, WHT);
      if (s > 0 || Math.abs(x) > 46) w.pool(x, 0.1, s * 59.5, 6, 0xcfd8ff, 0.13);
    }
    for (const x of [-36, 0, 36]) door(x, s * 62.55, 0, s);
    // 벽 위쪽 환기 덕트
    w.pipe(-98, 45.8, s * 61.4, 98, 45.8, s * 61.4, 0.9, 0x565e80, { mat: "metal" });
    for (let x = -91; x <= 91; x += 14) {
      ring(w, x, 45.8, s * 61.4, 1, 0.1, DARK, { axis: "x", col: false, seg: 12, sides: 4, mat: "paint" });
      bar(w, x, 46.7, s * 61.4, x, 48, s * 61.4, 0.06, STEEL, "metal", 4);
      D(x + 7, 44.55, s * 61.4, 1.8, 0.45, 1.3, 0x30364f, { ao: false }); glow(x + 7, 44.5, s * 61.4, 1.3, 0.06, 0.8, dim(WHT, 0.35));
    }
  }
  // 문: 벽에 붙은 문틀 + 문짝 + 비상구 표시 (ax: 0 = 남·북 벽, 1 = 동·서 벽)
  function door(x, z, ax, s) {
    if (ax) {
      D(x, 0, z, 0.3, 3.5, 3, DARK); D(x - s * 0.12, 0, z, 0.12, 3, 2.2, 0x39405a); glow(x - s * 0.2, 1.9, z - 0.5, 0.04, 0.5, 0.45, dim(WARM, 0.6));
      K.add("exit", x - s * 0.22, 4.15, z, 2.4, { ry: -s * 90 }); w.pool(x - s * 2.2, 0.1, z, 3, GRN, 0.16);
    } else {
      D(x, 0, z, 3, 3.5, 0.3, DARK); D(x, 0, z - s * 0.12, 2.2, 3, 0.12, 0x39405a); glow(x - 0.5, 1.9, z - s * 0.2, 0.45, 0.5, 0.04, dim(WARM, 0.6));
      K.add("exit", x, 4.15, z - s * 0.22, 2.4, { ry: s < 0 ? 0 : 180 }); w.pool(x, 0.1, z - s * 2.2, 3, GRN, 0.16);
    }
  }

  // ════ 동·서 벽 (x = ±100) 과 기지 ════
  for (const s of [-1, 1]) {
    const c = s < 0 ? BLU : RED, ry = -s * 90, X = (d) => s * (HX - d);   // X(d): 벽에서 d 만큼 안쪽
    for (const sz of [-1, 1]) {
      const [, zc, tid] = zoneOf(s, sz);
      for (const z of [27, 52, 60]) { D(X(1.25), 0, sz * z, 0.5, HH, 0.7, DARK, { mat: "std:panel", tile: 4, ao: false }); glow(X(1.54), 13, sz * z, 0.08, 22, 0.12, dim(zc, 0.6)); }
      D(X(1.18), 0, sz * 38.6, 0.36, 3.2, 50.4, 0x202540, { mat: "std:panel", tile: 4 });
      w.box(X(1.18), 3.2, sz * 38.6, 0.4, 0.36, 50.4, 0xdadada, { col: false, mat: "std:hazard", tile: 2 });
      w.box(X(1.07), 17, sz * 45, 0.08, 2.8, 30, dim(zc, 0.38), { col: false, ao: false, mat: "paint", rx: sz * 16 });
      w.box(X(1.07), 21.8, sz * 45, 0.08, 0.9, 30, dim(zc, 0.7), { col: false, ao: false, mat: "paint", rx: sz * 16 });
      K.add(tid, X(1.5), 30.5, sz * 52, 4.4, { ry });
      for (const [y, rad, pc] of [[13.3, 0.16, 0x6a7296], [13.75, 0.16, 0x6a7296], [12.85, 0.1, ORG]]) bar(w, X(1.5), y, sz * 13.4, X(1.5), y, sz * 63, rad, pc, "metal", 6);
      door(X(1.45), sz * 58, 1, s);
      // 격납고 문 옆 스피커 탑
      P(X(1.6), 0, sz * 15.2, 2.2, 5, 2.6, 0x161929, { tile: 2 });
      for (const y of [1.3, 3.6]) ring(w, X(2.74), y, sz * 15.2, 0.82, 0.07, dim(c, 0.8), { axis: "x", col: false, seg: 16, sides: 4 });
      glow(X(2.72), 2.38, sz * 15.2, 0.04, 0.12, 2, dim(c, 0.6));
    }
    // 조종석 단(북쪽): 고글 쓴 파일럿 4명, 모니터, 수신 안테나, 차양
    P(X(2.9), 0, -26, 4.6, 0.5, 16, 0x2a3050);
    glow(X(5.2), 0.42, -26, 0.1, 0.1, 16, c); D(X(5.6), 0, -26, 0.8, 0.25, 3, PANEL);
    for (const z of [-32, -28, -24, -20]) {
      D(X(2), 0.5, z, 0.7, 0.5, 0.7, 0x1a1d30); D(X(1.6), 1, z, 0.12, 0.9, 0.7, 0x1a1d30);
      D(X(2.1), 1, z, 0.5, 0.75, 0.52, [0xd9d2c4, 0x7f95c9, 0xc97f8a, 0x86b89a][(r() * 4) | 0]); D(X(2.1), 1.75, z, 0.3, 0.3, 0.3, 0xe2b99a, { ao: false });
      glow(X(2.27), 1.84, z, 0.06, 0.13, 0.32, c);
      D(X(3.6), 0.5, z, 0.8, 0.8, 2.2, 0x30364f); D(X(3.7), 1.3, z, 0.1, 0.7, 1.1, 0x0a0d1c, { ao: false }); glow(X(3.77), 1.45, z, 0.04, 0.4, 0.7, dim(c, 0.7));
      bar(w, X(3.8), 0.5, z + 1.5, X(3.8), 3.3, z + 1.5, 0.04, STEEL, "metal", 4); D(X(3.8), 3.2, z + 1.5, 0.08, 0.5, 0.5, 0xd8dcec, { ao: false });
    }
    for (const z of [-33.7, -18.3]) { bar(w, X(5), 0.5, z, X(5), 3.7, z, 0.08, STEEL, "metal", 5); bar(w, X(5), 3.7, z, X(0.9), 3.7, z, 0.08, STEEL, "metal", 5); }
    D(X(2.95), 3.7, -26, 4.3, 0.1, 15.6, 0x222742, { ao: false }); glow(X(3), 3.62, -26, 0.2, 0.06, 15, dim(WHT, 0.8)); glow(X(5.1), 3.72, -26, 0.1, 0.1, 15.6, c);
    w.pool(X(5), 0.1, -26, 7, c, 0.16);
    K.add("pilot", X(1.42), 8.4, -26, 2.8, { ry });
    // 정비대(남쪽): 작업대, 공구함, 충전 랙, 기체, 운반 상자
    P(X(1.8), 0, 26, 2.2, 1, 15, 0x30364f, { tile: 2 });
    D(X(1.5), 1, 20, 1.2, 1.3, 2.4, dim(c, 0.45)); for (const y of [1.35, 1.75, 2.05]) D(X(2.12), y, 20, 0.04, 0.06, 2, 0xd8dcec, { ao: false });
    D(X(1.4), 1, 27, 0.9, 1.6, 4.2, 0x161929);
    for (let i = 0; i < 8; i++) for (const y of [1.4, 2.05]) (i % 3 ? bkB : bkA).box(X(1.87), y, 25.25 + i * 0.5, 0.06, 0.14, 0.14, i % 3 ? GRN : YEL);
    for (const [z, a] of [[22.6, 20], [31, -15], [33, 40]]) {
      for (const k of [45, -45]) D(X(2), 1.06, z, 0.62, 0.05, 0.09, 0x1b1f27, { ry: a + k, ao: false });
      D(X(2), 1, z, 0.2, 0.14, 0.3, c, { ry: a, ao: false });
    }
    for (const [z, sx, sy, sz, cc] of [[19.3, 1.4, 0.9, 0.9, 0x22263a], [18.6, 1, 0.7, 0.8, 0x39405a], [33.2, 1.4, 0.9, 1, 0x22263a]]) { D(X(4.2), 0, z, sx, sy, sz, cc); glow(X(4.2), sy - 0.14, z, sx + 0.02, 0.05, sz + 0.02, dim(c, 0.6)); }
    D(X(4.2), 0.9, 19.3, 1, 0.6, 0.7, 0x39405a);
    for (const z of [17.2, 24, 30, 34.8]) w.cone(X(5.3), 0, z, 0.22, 0.6, ORG, { mat: "paint", col: false });
    w.pool(X(4.5), 0.1, 26, 7, YEL, 0.1);
    K.add("pit", X(1.42), 5.4, 30, 5, { ry }); K.add("charge", X(1.42), 7.6, 21.5, 2.6, { ry });
  }

  // ════ 천장 ════
  for (const z of [-56, -28, 28, 56]) D(0, 46.9, z, 198, 1.1, 0.7, 0x1a1e30, { ao: false });
  for (let x = -90; x <= 90; x += 20) for (const z of [-49, -35, -21, -7, 7, 21, 35, 49]) glow(x, 47.72, z, 5, 0.08, 0.3, dim(0xcfd8ff, 0.42));
  for (const z of [-20, 20]) truss(w, -75, 44, z, 75, 44, z, 1.8, STEEL, { mat: "metal", col: false, bay: 6, r: 0.14 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    D(sx * 52, 42.65, sz * 20, 1.3, 0.9, 1.3, 0x22263a, { ao: false });                       // 기존 탐조등 몸체
    D(sx * 75, 42.65, sz * 28, 1.3, 0.9, 1.3, 0x22263a, { ao: false });                       // 새 탐조등 몸체
    // 줄 스피커(가로 트러스에 매달림)
    for (let i = 0; i < 5; i++) D(sx * (62 - i * i * 0.07), 42.1 - i * 1.02, sz * 20, 1.4, 0.92, 1.9, i % 2 ? 0x161929 : 0x1f2338, { ao: false });
    glow(sx * 62 - sx * 0.74, 37.9, sz * 20, 0.05, 5.1, 0.12, dim(sx < 0 ? BLU : RED, 0.7));
    w.col.addBox(V(sx * 61.7, 40.5, sz * 20), V(0.9, 2.6, 1));
    // 늘어진 케이블
    sag([sx * 75, 43.2, sz * 50], [sx * 25, 43.2, sz * 50], 2.4); sag([sx * 75, 43.2, sz * 8], [sx * 25, 43.2, sz * 8], 2);
    sag([sx * 75, 43.2, sz * 36], [sx * 25, 43.2, sz * 36], 2.8, 8, 0.07);
  }
  for (const sz of [-1, 1]) sag([-25, 43.2, sz * 50], [25, 43.2, sz * 50], 2.2);
  // 가운데 천장 전광 큐브(코어 존 위, 높이 40.8m 부터)
  w.box(0, 40.8, 0, 10, 5.8, 10, 0x0a0d1c, { ao: false });
  for (const s of [-1, 1]) { K.add("vs", 0, 43.7, s * 5.06, 9.4, { ry: s < 0 ? 180 : 0 }); K.add("score", s * 5.06, 43.7, 0, 9.4, { ry: s * 90 }); }
  edge(0, 40.8, 0, 10.1, 10.1, CYA, 0.18); edge(0, 46.5, 0, 10.1, 10.1, MAG, 0.18);
  for (const kx of [-1, 1]) for (const kz of [-1, 1]) { glow(kx * 5.03, 40.9, kz * 5.03, 0.14, 5.6, 0.14, WHT); bar(w, kx * 4.4, 46.6, kz * 4.4, kx * 4.4, 48, kz * 4.4, 0.12, STEEL, "metal", 5); bkA.sph(kx * 5.05, 40.6, kz * 5.05, 0.3, 0.3, 0.3, YEL); }
  glow(0, 40.72, 0, 6.4, 0.08, 6.4, dim(CYA, 0.5)); glow(0, 40.66, 0, 3, 0.06, 3, dim(WHT, 0.8));
  ring(w, 0, 40.45, 0, 6.6, 0.14, CYA, { col: false, seg: 36 });
  for (const s of [-1, 1]) sag([s * 5, 46.6, 0], [s * 25, 44.9, 0], 0.9, 6);

  // ════ 구역 소품 ════
  // 큰 기둥: 세로 줄 조명과 투광등
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 40, z = sz * 36, c = sz < 0 ? MAG : YEL;
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785; glow(x + Math.cos(a) * 2.42, 12.3, z + Math.sin(a) * 2.42, 0.1, 11.5, 0.1, dim(c, 0.55), { ry: -a / DEG }); }
    for (let i = 0; i < 4; i++) { const a = i * 1.5708; D(x + Math.cos(a) * 2.6, 23.2, z + Math.sin(a) * 2.6, 0.5, 0.5, 0.9, 0x22263a, { ry: -a / DEG, ao: false }); glow(x + Math.cos(a) * 2.88, 23.25, z + Math.sin(a) * 2.88, 0.06, 0.4, 0.7, WHT, { ry: -a / DEG }); }
  }
  // 플랫폼 타워: 덱 아래 줄 조명, 기둥 머리 경광등
  for (const s of [-1, 1]) {
    const x = s * 40, c = s > 0 ? ORG : GRN;
    for (const y of [7, 15, 23, 31]) for (const k of [-1, 1]) glow(x, y - 0.07, k * 5.15, 10.5, 0.05, 0.22, dim(c, 0.7));
    for (const dx of [-6, 6]) for (const dz of [-6, 6]) { D(x + dx, 31.5, dz, 1, 0.3, 1, DARK, { ao: false }); bkA.sph(x + dx, 32.1, dz, 0.28, 0.28, 0.28, c); }
  }
  // 큐브 정글: 기둥 머리를 잇는 가는 보
  for (const z of [-56, -47]) bar(w, -92, 24.15, z, -74, 24.15, z, 0.08, STEEL, "metal", 5);
  for (const x of [-92, -83, -74]) { bar(w, x, 24.15, -56, x, 24.15, -47, 0.08, STEEL, "metal", 5); for (const z of [-56, -47]) bkA.sph(x, 24.4, z, 0.2, 0.2, 0.2, CYA); }
  // 메자닌: 덱 아래 줄 조명, 위 덱 난간, 덱 구석 짐
  for (const x of [-91.75, -72.25]) glow(x, 7.9, 51, 0.3, 0.06, 18, dim(GRN, 0.7));
  glow(-93, 15.9, 53, 0.3, 0.06, 14, dim(GRN, 0.7));
  for (const y of [17.1, 17.7]) bar(w, -88.1, y, 44.2, -88.1, y, 61.8, 0.05, 0x8088a8, "metal", 5);
  for (let z = 44.2; z <= 61.9; z += 2.93) bar(w, -88.1, 16.6, z, -88.1, 17.7, z, 0.05, 0x8088a8, "metal", 4);
  for (const z of [42.2, 59.8]) {
    const k = z < 50 ? 1 : -1;
    D(-68.4, 8.6, z, 1.3, 1, 1.2, 0x3a4a3a); D(-70, 8.6, z + k * 0.1, 1.1, 0.7, 1.1, 0x30364f); D(-68.5, 9.6, z, 0.9, 0.6, 0.9, 0x4a4030, { ry: 20 });
    glow(-68.4, 9.2, z + k * 0.62, 0.5, 0.2, 0.03, dim(GRN, 0.8));
  }
  // 헬릭스: 꼭대기 덮개와 경광등, 바닥 경고 받침
  w.cyl(80, 40, -50, 2.2, 0.4, DARK, { col: false, ao: false }); bkA.sph(80, 41, -50, 0.6, 0.6, 0.6, ORG);
  w.cyl(80, 0, -50, 3.1, 0.3, 0xdadada, { mat: "std:hazard", tile: 2, col: false });
  // 행잉 블록: 블록 밑면 조명과 빛기둥
  for (const [x, z, sz, y] of [[66, 43, 4, 12], [75, 43, 3, 9], [84, 43, 4, 17], [93, 43, 3.4, 10], [66, 54, 3, 9], [75, 54, 4, 21], [84, 54, 3.4, 11], [93, 54, 4, 15]]) {
    glow(x, y - 0.07, z, sz * 0.55, 0.06, sz * 0.55, dim(VIO, 0.9)); w.shaft(x, y - 0.1, z, 0.3, sz * 1.15, y - 0.2, VIO, 0.03);
  }

  // ════ 움직이는 것 ════
  const glowK = w.env.glow ?? 2.4;
  // ① 관중 응원봉: 구간별로 묶어 파도타기
  const NG = 8, sg = []; for (let i = 0; i < NG; i++) sg.push(new Geo());
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const z = s * (56.3 + k * 2.2 + 0.3), top = 14 + k * 2.2;
    for (let x = -58.6; x < 59; x += 1.15) {
      if (r() > 0.2 || AISLES.some((a) => Math.abs(x - a) < 1.3)) continue;
      sg[Math.min(NG - 1, ((x + 60) / 15) | 0)].box(x + 0.3, top + 0.75 + r() * 0.2, z, 0.09, 0.75, 0.09, [CYA, MAG, YEL, GRN][(r() * 4) | 0]);
    }
  }
  const stickMat = glowMat(w, 0.85), sticks = sg.map((g) => { const geo = g.build(), m = new THREE.Mesh(geo, stickMat); m.frustumCulled = false; w.scene.add(m); w.disposables.push(geo); return m; });
  // ② 경광등·충전 표시
  const matA = glowMat(w, 1), matB = glowMat(w, 1), geoA = bkA.build(), geoB = bkB.build();
  for (const [g, m] of [[geoA, matA], [geoB, matB]]) { const o = new THREE.Mesh(g, m); o.frustumCulled = false; w.scene.add(o); }
  // ③ 관중석 띠 전광판(글자가 흐른다)
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 64;
  {
    const g = cv.getContext("2d"), ko = hangulOK();
    g.fillStyle = "#070a18"; g.fillRect(0, 0, 1024, 64);
    [[ko ? "하늘길 아레나" : "SKYWAY ARENA", "#21d4fd"], ["NEON CUP", "#ff2bd6"], [ko ? "청팀 2 : 1 홍팀" : "BLUE 2 : 1 RED", "#ffe14a"], ["FPV DRONE RACE", "#ffffff"]].forEach(([t, c], i) => {
      neonText(g, t, 128 + i * 256, 34, 38, c, 210); g.fillStyle = "#35ff7a"; g.fillRect(i * 256 - 5, 26, 10, 10);
    });
    g.fillStyle = "rgba(0,0,0,0.35)"; for (let y = 0; y < 64; y += 4) g.fillRect(0, y, 1024, 1);
  }
  const tick = new THREE.CanvasTexture(cv); tick.colorSpace = THREE.SRGBColorSpace; tick.wrapS = THREE.RepeatWrapping; tick.repeat.set(3, 1); tick.anisotropy = 4;
  const tickMat = new THREE.MeshBasicMaterial({ map: tick }); tickMat.color.setScalar(glowK * 0.5);
  const tickGeo = new THREE.PlaneGeometry(120, 1.06);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(tickGeo, tickMat); m.position.set(0, 12.75, s * 55.09); if (s > 0) m.rotation.y = Math.PI; w.scene.add(m); }
  // ④ 유도로 화살표(기지 → 코어로 흐른다)
  const cc = document.createElement("canvas"); cc.width = cc.height = 64;
  { const g = cc.getContext("2d"); g.strokeStyle = "#fff"; g.lineWidth = 9; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(16, 10); g.lineTo(42, 32); g.lineTo(16, 54); g.stroke(); }
  const arrow = new THREE.CanvasTexture(cc); arrow.wrapS = THREE.RepeatWrapping;
  for (const s of [-1, 1]) {
    const pos = [], uv = [], idx = [];
    [-12, 12].forEach((z, k) => {
      const b = k * 4, xa = s * 55, xb = s * 30.5;          // u 는 기지(0) → 코어(11)
      pos.push(xa, 0.05, z - 1.1, xb, 0.05, z - 1.1, xb, 0.05, z + 1.1, xa, 0.05, z + 1.1); uv.push(0, 0, 11, 0, 11, 1, 0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: arrow, color: new THREE.Color(s < 0 ? BLU : RED).multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 2; w.scene.add(m); w.disposables.push(g, m.material);
  }
  // ⑤ 모서리 구역을 훑는 가는 탐조등 4개
  const beamG = new THREE.CylinderGeometry(0.35, 4.2, 43, 12, 1, true);
  beamG.translate(0, -21.5, 0);
  { const Pp = beamG.attributes.position, col = new Float32Array(Pp.count * 3); for (let i = 0; i < Pp.count; i++) { const k = 1 + Pp.getY(i) / 43; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k * k; } beamG.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
  const beams = [[-75, -28, CYA], [75, 28, VIO], [-75, 28, GRN], [75, -28, ORG]].map(([x, z, c]) => {
    const m = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.085), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, 42.7, z); m.renderOrder = 6; m.frustumCulled = false; m.rotation.order = "YXZ"; w.scene.add(m); w.disposables.push(m.material);
    return m;
  });
  w.disposables.push(stickMat, matA, matB, geoA, geoB, tick, tickMat, tickGeo, arrow, beamG);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < NG; i++) sticks[i].position.y = Math.max(0, Math.sin(t * 2.4 - i * 0.8)) * 0.32;
    matA.color.setScalar(glowK * (0.55 + 0.45 * Math.sin(t * 2.6)));
    matB.color.setScalar(glowK * (Math.sin(t * 5) > -0.3 ? 1 : 0.15));
    tick.offset.x = (t * 0.035) % 1;
    arrow.offset.x = -(t * 1.6) % 1;
    for (let i = 0; i < 4; i++) { const m = beams[i]; m.rotation.y = -t * 0.4 + i * 1.6; m.rotation.x = 0.2 + Math.sin(t * 0.5 + i * 2) * 0.1; }
  });
}
