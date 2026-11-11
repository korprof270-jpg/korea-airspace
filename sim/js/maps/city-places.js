// 네온 시티의 구역과 랜드마크(정적 구조물). 배치는 city.js 가 한다
import * as THREE from "../../vendor/three.module.min.js";
import { DEG, MAG, CYA, YEL, GRN, ORG, VIO, RED, WARM, NEON, TRS, G, ring, bar, truss, gable, hip, tree, people } from "./city-kit.js";

const COOL = [0x6f7a8c, 0x5d6678, 0x66758a, 0x566a7a, 0x4f5a70, 0x7a8496];
const MID = [0x7a7384, 0x80796e, 0x6c7480, 0x77706a];
const BEIGE = [0xb9ad9a, 0xa89a88, 0xc4b8a6, 0x9c8f80];
const pick = (w, a) => a[(w.rand() * a.length) | 0];
const lit = (w, x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "lit:facadelit", tile: 24, ao: false, ...o });
const glow = (w, x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "glow", col: false, ...o });
const conc = (w, x, y, z, sx, sy, sz, c = 0x4a4f5a, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "std:concrete", tile: 6, ...o });
const dim = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

// 사각 네온 테두리
function trim(w, x, y, z, sx, sz, c, t = 0.25) {
  for (const s of [-1, 1]) { glow(w, x, y, z + (s * sz) / 2, sx, t, t, c); glow(w, x + (s * sx) / 2, y, z, t, t, sz, c); }
}

// 1층 상가: 쇼윈도 불빛·차양·간판 띠·보도에 번지는 조명
function shops(w, x, z, wd, dp, p = 0.62) {
  const r = w.rand;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (r() > p) continue;
    const sc = NEON[(r() * 6) | 0], warm = r() < 0.5 ? WARM : sc;
    const len = (dx ? dp : wd) * (0.5 + r() * 0.35), off = (r() - 0.5) * (dx ? dp : wd) * 0.2;
    const px = x + dx * (wd / 2 + 0.32) + (dx ? 0 : off), pz = z + dz * (dp / 2 + 0.32) + (dz ? 0 : off);
    glow(w, px, 0.5, pz, dx ? 0.12 : len, 2.5, dx ? len : 0.12, dim(warm, 0.42));
    w.box(px + dx * 0.5, 3.2, pz + dz * 0.5, dx ? 1.3 : len + 0.6, 0.16, dx ? len + 0.6 : 1.3, 0x1c1f27, { col: false, ao: false });
    glow(w, px + dx * 1.16, 3.0, pz + dz * 1.16, dx ? 0.1 : len * 0.7, 0.5, dx ? len * 0.7 : 0.1, sc);
    w.pool(px + dx * 3.2, 0.2, pz + dz * 3.2, 5.5 + len * 0.12, warm, 0.3);
  }
}

// 옥상 소품. y = 옥상 바닥
function roof(w, K, x, z, wd, dp, y, kind) {
  const r = w.rand;
  if (kind === "ac") {
    for (let i = 0; i < 3; i++) { const sx = 2 + r() * 3, sz = 2 + r() * 3; w.box(x + (r() - 0.5) * (wd - sx - 2), y, z + (r() - 0.5) * (dp - sz - 2), sx, 1.2 + r() * 1.6, sz, 0x5a616c, { mat: "std:panel", tile: 3 }); }
  } else if (kind === "tank") {
    const tx = x + (r() - 0.5) * (wd - 6), tz = z + (r() - 0.5) * (dp - 6);
    for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bar(w, tx + ax * 1.1, y, tz + az * 1.1, tx + ax * 1.1, y + 1.8, tz + az * 1.1, 0.1, 0x3a3f48);
    w.cyl(tx, y + 1.8, tz, 1.6, 2.4, 0x8a6a4a, { mat: "std:wood", tile: 2 });
    w.mesh(G.cone(10), TRS(tx, y + 4.2 + 0.5, tz, 0, 1.8, 1, 1.8), 0x3a3f48, "std");
  } else if (kind === "garden") {
    w.box(x, y, z, wd - 4, 0.25, dp - 4, 0x2f5a37, { col: false, mat: "std:grass", tile: 6 });
    for (let i = 0; i < 3; i++) tree(w, x + (r() - 0.5) * (wd - 8), y + 0.2, z + (r() - 0.5) * (dp - 8), 0.7);
  } else if (kind === "pool") {
    w.box(x, y, z, wd - 5, 0.3, dp - 5, 0x8a8f9a, { col: false });
    glow(w, x, y + 0.3, z, wd - 9, 0.06, dp - 11, dim(CYA, 0.75));
    w.pool(x, y + 0.3, z, Math.min(wd, dp) * 0.55, CYA, 0.4);
  } else if (kind === "mast") {
    w.pipe(x, y, z, x, y + 12, z, 0.15, 0x555b66);
    K.beacons.push([x, y + 12.4, z]);
  } else if (kind === "heli") {
    w.cyl(x, y - 0.2, z, 9, 0.3, 0x30343c, { col: false });
    glow(w, x, y + 0.12, z, 6, 0.02, 1, YEL); glow(w, x - 2.5, y + 0.12, z, 1, 0.02, 6, YEL); glow(w, x + 2.5, y + 0.12, z, 1, 0.02, 6, YEL);
    ring(w, x, y + 0.14, z, 8.4, 0.12, GRN, { col: false, seg: 32, sides: 4 });
  } else if (kind && kind.startsWith("bill")) {
    // 옥상 광고판: bill:<간판 id>:<방향 도>
    const [, id, a] = kind.split(":"), ry = +a || 0, s = Math.sin(ry * DEG), c = Math.cos(ry * DEG);
    const bx = x + s * (wd / 2 - 1.2), bz = z + c * (dp / 2 - 1.2), bw = 12;
    for (const k of [-4.5, 4.5]) bar(w, bx + c * k, y, bz - s * k, bx + c * k, y + 2.4, bz - s * k, 0.16, 0x3a3f48);
    w.box(bx, y + 2.2, bz, bw + 0.6, 6.6, 0.4, 0x161920, { ry });
    K.signs.add(id, bx + s * 0.32, y + 5.5, bz + c * 0.32, bw, { ry });
  }
}

// 일반 빌딩: 창문 몸체 + 저층부 + 난간 + 네온
export function tower(w, K, x, z, wd, dp, h, c, o = {}) {
  const r = w.rand, y0 = o.y || 0, nc = o.neon ?? NEON[(r() * 6) | 0];
  lit(w, x, y0, z, wd, h, dp, c);
  if (!y0) { w.box(x, 0, z, wd + 0.5, 3.6, dp + 0.5, 0x2a2e36, { col: false, mat: "std:concrete", tile: 6 }); if (o.shop !== false) shops(w, x, z, wd, dp); }
  w.box(x, y0 + h, z, wd + 0.6, 0.7, dp + 0.6, 0x343943, { col: false });
  if (o.trim ?? r() < 0.5) trim(w, x, y0 + h + 0.5, z, wd * 0.97, dp * 0.97, nc);
  if (o.sign ?? r() < 0.6) {
    const side = r() < 0.5 ? 1 : -1, sh = Math.min(h * 0.45, 16);
    if (r() < 0.5) glow(w, x + side * (wd / 2 + 0.25), y0 + h * 0.42, z + (r() - 0.5) * dp * 0.5, 0.4, sh, 2.2, nc);
    else glow(w, x + (r() - 0.5) * wd * 0.5, y0 + h * 0.42, z + side * (dp / 2 + 0.25), 2.2, sh, 0.4, nc);
  }
  roof(w, K, x, z, wd, dp, y0 + h + 0.7, o.roof ?? ["ac", "tank", "ac", "mast", "garden", "pool"][(r() * 6) | 0]);
}

// ── 블록 유형(가로 46m 패드 한 칸) ──
export const BLOCK = {
  plain(w, K, cx, cz, H, c) { tower(w, K, cx, cz, 36, 36, H, c ?? pick(w, COOL)); },
  pair(w, K, cx, cz, H, c, o = {}) {
    const r = w.rand, ns = o.ns ?? r() < 0.5;
    for (const s of [-1, 1]) tower(w, K, cx + (ns ? s * 11 : 0), cz + (ns ? 0 : s * 11), ns ? 17 : 38, ns ? 38 : 17, H * (0.75 + r() * 0.4), c ?? pick(w, MID));
  },
  quad(w, K, cx, cz, H, c) {
    const r = w.rand;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(w, K, cx + sx * 11, cz + sz * 11, 17, 17, H * (0.55 + r() * 0.6), c ?? pick(w, MID));
  },
  // 계단식 후퇴 타워
  setback(w, K, cx, cz, H, c, o = {}) {
    const col = c ?? pick(w, COOL), nc = o.neon ?? pick(w, NEON), tiers = [[34, 0.38], [25, 0.72], [16, 1]];
    let y = 0;
    tiers.forEach(([s, f], i) => {
      const top = H * f;
      tower(w, K, cx, cz, s, s, top - y, col, { y, neon: nc, trim: true, sign: i === 0, roof: i === 2 ? "mast" : "none", shop: i === 0 });
      if (i < 2 && o.green) for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tree(w, cx + ax * (s / 2 - 2), top + 0.7, cz + az * (s / 2 - 2), 0.75);
      y = top;
    });
  },
  // 넓은 저층 포디엄 + 한쪽으로 치우친 타워
  podium(w, K, cx, cz, H, c, o = {}) {
    const r = w.rand, col = c ?? pick(w, COOL), sx = o.sx ?? (r() < 0.5 ? 1 : -1), sz = o.sz ?? (r() < 0.5 ? 1 : -1);
    w.box(cx, 0, cz, 40, 9, 40, 0x3a3f4a, { mat: "std:concrete", tile: 6 });
    shops(w, cx, cz, 40, 40, 0.9);
    trim(w, cx, 9.1, cz, 40.2, 40.2, pick(w, NEON), 0.2);
    tower(w, K, cx + sx * 8, cz + sz * 8, 22, 22, H - 9, col, { y: 9 });
    roof(w, K, cx - sx * 10, cz - sz * 4, 18, 30, 9, r() < 0.5 ? "garden" : "pool");
  },
  // 나란한 판상형 두 동 + 중간 연결 다리
  twin(w, K, cx, cz, H, c) {
    const col = c ?? pick(w, COOL), nc = pick(w, NEON);
    tower(w, K, cx - 12, cz, 14, 36, H, col, { neon: nc, roof: "mast" }); tower(w, K, cx + 12, cz, 14, 36, H * 0.82, col, { neon: nc, roof: "ac" });
    lit(w, cx, H * 0.5, cz, 10, 6, 8, col); glow(w, cx, H * 0.5 - 0.3, cz, 10, 0.25, 8.4, nc);
    w.gap("쌍둥이 빌딩 다리 아래", cx, H * 0.25, cz, 0, 9, H * 0.42, 350);
  },
  // 원통 타워
  cyl(w, K, cx, cz, H, c, o = {}) {
    const col = c ?? pick(w, COOL), nc = o.neon ?? pick(w, NEON), R = o.R || 13;
    w.cyl(cx, 0, cz, R + 2, 4, 0x2a2e36, { mat: "std:concrete", tile: 6 });
    w.cyl(cx, 4, cz, R, H - 4, col, { mat: "lit:facadelit", tile: 24, ao: false });
    for (const y of [4.1, H * 0.5, H + 0.3]) ring(w, cx, y, cz, R + 0.25, 0.2, nc, { col: false, seg: 40, sides: 4 });
    w.pool(cx, 0.2, cz, R + 9, nc, 0.22);
  },
  // ㄱ자 건물과 안마당
  L(w, K, cx, cz, H, c) {
    const r = w.rand, col = c ?? pick(w, MID);
    tower(w, K, cx, cz - 12, 38, 14, H, col); tower(w, K, cx - 12, cz + 7, 14, 24, H * 0.7, col);
    for (let i = 0; i < 3; i++) tree(w, cx + 4 + r() * 12, 0.18, cz + 2 + r() * 14, 0.9);
    w.pool(cx + 9, 0.2, cz + 9, 9, WARM, 0.25);
  },
  // 저층 상가 줄(박공 지붕)
  rows(w, K, cx, cz, H, c) {
    const r = w.rand;
    for (const dz of [-14, 0, 14]) {
      let x = cx - 20;
      while (x < cx + 14) {
        const wd = 7 + r() * 6, hh = H * (0.6 + r() * 0.6), col = pick(w, [0x8a5a48, 0x7a6a5a, 0x6c7480, 0x9a8468]);
        const bx = x + wd / 2;
        if (bx + wd / 2 > cx + 20.5) break;
        w.box(bx, 0, cz + dz, wd - 0.4, hh, 9, col, { mat: r() < 0.5 ? "std:brick" : "std:concrete" });
        if (r() < 0.6) gable(w, bx, hh, cz + dz, 9.6, 2.2, wd - 0.2, 0x2c3138, { ry: 90 }); else w.box(bx, hh, cz + dz, wd - 0.2, 0.5, 9.2, 0x2c3138, { col: false });
        glow(w, bx, 0.5, cz + dz + 4.56, wd - 2, 2.2, 0.1, dim(pick(w, [WARM, ORG, YEL]), 0.4));
        glow(w, bx, 3.1, cz + dz + 4.7, wd - 1.5, 0.45, 0.1, pick(w, NEON));
        x += wd;
      }
      w.pool(cx, 0.2, cz + dz + 7, 13, WARM, 0.22);
    }
  },
  // 판상형 아파트 두 동 + 주차장·놀이터
  apt(w, K, cx, cz, H, c, o = {}) {
    const r = w.rand, ac = o.neon ?? GRN, ns = !!o.ns;
    for (const s of [-1, 1]) {
      const h = H * (s < 0 ? 1 : 0.86), col = pick(w, BEIGE), x = cx + (ns ? s * 12 : 0), z = cz + (ns ? 0 : s * 12), wd = ns ? 11 : 42, dp = ns ? 42 : 11;
      lit(w, x, 0, z, wd, h, dp, col);
      w.box(x, h, z, wd + 0.4, 0.6, dp + 0.4, 0x4a4640, { col: false });
      for (const k of [-0.3, 0.3]) w.box(x + (ns ? 0 : k * wd), h + 0.6, z + (ns ? k * dp : 0), 4, 2.6, 4, 0x8a8478, { mat: "std:concrete", tile: 4 });   // 승강기 기계실
      for (const e of [-1, 1]) {   // 측벽 색띠
        const ex = x + (ns ? 0 : e * (wd / 2 + 0.06)), ez = z + (ns ? e * (dp / 2 + 0.06) : 0);
        glow(w, ex, h * 0.12, ez, ns ? 2 : 0.1, h * 0.8, ns ? 0.1 : 2, dim(ac, 0.5));
      }
      K.beacons.push([x, h + 3.6, z]);
    }
    // 가운데 마당: 주차 차량과 나무
    for (let i = 0; i < 5; i++) { const t = (i - 2) * 5.2; w.box(cx + (ns ? -3 : t), 0.18, cz + (ns ? t : -3), ns ? 4.2 : 1.8, 1.2, ns ? 1.8 : 4.2, [0xb33a3a, 0x2f5fa0, 0xd9d9d9, 0x2b2b2b, 0xc9a23a][i]); }
    for (let i = 0; i < 4; i++) { const t = -18 + i * 12 + r() * 2; tree(w, cx + (ns ? 3.5 : t), 0.18, cz + (ns ? t : 3.5), 0.9, { hue: 0.27 }); }
    w.pool(cx, 0.2, cz, 11, WARM, 0.25);
  },
};

// ── 중앙 첨탑 "하늘탑" ──
export function spire(w, K) {
  const L = { mat: "lit:facadelit", tile: 24, ao: false };
  w.cyl(0, 0.18, 0, 21, 0.14, 0x565c6a, { col: false, mat: "std:concrete", tile: 5 });
  w.cyl(0, 0, 0, 10, 8, 0x4a505c, { rt: 8.4, mat: "std:concrete", tile: 6 });
  w.cyl(0, 8, 0, 7, 32, 0x8a93a8, { rt: 5.6, ...L });
  w.cyl(0, 40, 0, 5.6, 30, 0x929bb0, { rt: 4.2, ...L });
  w.cyl(0, 70, 0, 4.2, 15, 0x9aa3b8, { rt: 3.2, ...L });
  w.cyl(0, 85, 0, 3.2, 4, 0x3a4050, { rt: 8.6 });                       // 전망대 아래 접시
  w.cyl(0, 89, 0, 8.6, 3, 0x9fb4d8, { ...L });
  w.cyl(0, 92, 0, 8.6, 3, 0x3a4050, { rt: 2.6 });
  w.cyl(0, 95, 0, 2.2, 14, 0x8a93a5, { rt: 1.3 });
  w.pipe(0, 109, 0, 0, 128, 0, 0.3, 0x8a93a5);
  K.beacons.push([0, 128.8, 0, 1.4]);
  for (const [y, R, c] of [[26, 11.5, CYA], [46, 9.5, MAG], [66, 7.6, YEL], [90.5, 9.1, CYA]]) ring(w, 0, y, 0, R, 0.3, c, { seg: 44, col: y < 80 });
  // 버팀다리 4개 (다리와 탑 사이로 통과)
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    w.pipe(c * 19, 0, s * 19, c * 6.2, 30, s * 6.2, 0.8, 0x7a8398, { mat: "std" });
    glow(w, c * 19.4, 0.3, s * 19.4, 1.4, 0.5, 1.4, NEON[i]);
    w.gap("첨탑 버팀다리 사이", c * 9.6, 12.5, s * 9.6, -(a / DEG), 5, 8, 550);
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; glow(w, Math.cos(a) * 14.5, 0.3, Math.sin(a) * 14.5, 0.5, 0.9, 0.5, NEON[i % 6]); }
  w.pool(0, 0.3, 0, 26, CYA, 0.2);
}

// ── 관문 빌딩: 가운데가 뚫린 타워 (0,-60) ──
export function gateTower(w, K, cx, cz) {
  const col = 0x66758a;
  for (const s of [-1, 1]) lit(w, cx + s * 10.5, 0, cz, 9, 58, 22, col);
  lit(w, cx, 0, cz, 12, 18, 22, col); lit(w, cx, 36, cz, 12, 22, 22, col);
  w.box(cx, 0, cz, 30.5, 3.6, 22.5, 0x2a2e36, { col: false, mat: "std:concrete", tile: 6 });
  w.box(cx, 58, cz, 30.6, 0.7, 22.6, 0x343943, { col: false });
  for (const s of [-1, 1]) {
    const z = cz + s * 11.15;
    glow(w, cx, 17.8, z, 12.4, 0.3, 0.2, CYA); glow(w, cx, 35.9, z, 12.4, 0.3, 0.2, CYA);
    for (const k of [-1, 1]) glow(w, cx + k * 6.05, 18, z, 0.3, 18, 0.2, CYA);
    w.box(cx + s * 12, 58.7, cz, 3, 7, 22, 0x3a4050, { rx: 0 });                 // 옥상 날개벽
  }
  trim(w, cx, 58.9, cz, 30, 22, CYA);
  w.pipe(cx, 58.7, cz, cx, 72, cz, 0.18, 0x555b66); K.beacons.push([cx, 72.4, cz]);
  shops(w, cx, cz, 30, 22, 0.9);
  w.gap("관문 빌딩 관통", cx, 27, cz, 0, 11, 16.5, 800);
}

// ── 쌍둥이 타워와 2단 스카이브리지 (60,0)·(120,0) ──
export function twinTowers(w, K) {
  for (const [x, h, c] of [[60, 62, MAG], [120, 54, CYA]]) {
    tower(w, K, x, 0, 28, 28, h, 0x5d6678, { neon: c, trim: true, sign: false, roof: "none" });
    lit(w, x, h + 0.7, 0, 18, 6, 18, 0x66758a); lit(w, x, h + 6.7, 0, 9, 5, 9, 0x6f7a8c);
    trim(w, x, h + 6.9, 0, 18, 18, c); trim(w, x, h + 11.9, 0, 9, 9, c);
    w.pipe(x, h + 11.7, 0, x, h + 22, 0, 0.16, 0x555b66); K.beacons.push([x, h + 22.4, 0]);
    for (const s of [-1, 1]) glow(w, x + s * 14.2, h * 0.2, 0, 0.3, h * 0.7, 1.6, c);
  }
  for (const [y, c] of [[22, CYA], [40, MAG]]) {
    w.box(90, y, 0, 32, 0.5, 5, 0x596273); w.box(90, y + 3.5, 0, 32, 0.4, 5, 0x596273);
    for (const s of [-2.4, 2.4]) w.box(90, y + 0.5, s, 32, 3, 0.2, 0x8fd3ff, { mat: "glass" });
    glow(w, 90, y - 0.4, 0, 32, 0.25, 5.4, c);
  }
  w.gap("스카이브리지 아래", 90, 18.2, 0, 0, 24, 6.2, 450);
  w.gap("스카이브리지 사이", 90, 32.8, 0, 0, 28, 12.5, 350);
}

// ── 가든 터널: 도로 위 정원 덱 (x=30, z -82..-38) ──
export function gardenDeck(w, K) {
  const r = w.rand;
  conc(w, 30, 9, -60, 29.6, 1.2, 44, 0x4a505c);
  for (let i = 0; i < 6; i++) {
    const z = -80 + i * 8;
    for (const x of [22.6, 37.4]) { conc(w, x, 0, z, 1, 9, 1, 0x596273); glow(w, x + (x < 30 ? 0.52 : -0.52), 0.6, z, 0.08, 7.6, 0.3, i % 2 ? MAG : CYA); }
    glow(w, 30, 8.84, z, 13.8, 0.12, 0.3, i % 2 ? MAG : CYA);
  }
  w.box(30, 10.2, -60, 27.6, 0.25, 41, 0x2f5a37, { col: false, mat: "std:grass", tile: 6 });
  glow(w, 30, 10.46, -60, 1.2, 0.04, 40, dim(WARM, 0.5));
  for (const s of [-1, 1]) { w.box(30, 10.2, -60 + s * 21.8, 29.6, 1.2, 0.15, 0x8fd3ff, { mat: "glass" }); for (let i = 0; i < 4; i++) tree(w, 30 + s * (6 + r() * 5), 10.4, -76 + i * 10.5 + r() * 2, 0.8); }
  K.block.push([21, 39, -85, -35]);
  w.gap("가든 터널", 30, 4.6, -60, 0, 12.4, 7.8, 380);
}

// ── 왕관 타워와 대형 전광판 (120,-60) ──
export function crownTower(w, K, cx, cz) {
  tower(w, K, cx, cz, 30, 24, 56, 0x566a7a, { neon: YEL, trim: true, sign: false, roof: "none" });
  hip(w, cx, 56.7, cz, 22, 9, 16, 0x39404e, { top: 0.25 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { hip(w, cx + sx * 13, 56.7, cz + sz * 10, 3.6, 11, 3.6, 0x4a5262); K.beacons.push([cx + sx * 13, 68, cz + sz * 10, 0.5]); }
  trim(w, cx, 65.8, cz, 5.6, 4.2, YEL, 0.3);
  w.box(cx - 15.3, 28, cz, 0.5, 13, 23, 0x12151c, { col: false });
  K.signs.add("gp", cx - 15.72, 34.5, cz, 22, { ry: -90 });
}

// ── 원통 타워 꼭대기 받침(회전 간판 고리는 city-life 에서) ──
export function cylTower(w, K, cx, cz) {
  BLOCK.cyl(w, K, cx, cz, 60, 0x66758a, { neon: VIO });
  w.cyl(cx, 60, cz, 9, 6.4, 0x1a1d26);
  w.pipe(cx, 66.4, cz, cx, 76, cz, 0.16, 0x555b66); K.beacons.push([cx, 76.4, cz]);
}

// ── 공사장: 골조 빌딩 + 타워 크레인 (120,-120) ──
export function construction(w, K) {
  const r = w.rand, X = [104, 112, 120, 128, 136], Z = [-132, -124, -116, -108], C = 0x8a8d92, HZ = { mat: "std:hazard", tile: 2 };
  for (const x of X) for (const z of Z) {
    const h = x <= 120 ? 30 : x === 128 ? 23 : 16.5;
    conc(w, x, 0, z, 0.8, h, 0.8, C);
    if (r() < 0.6) for (const [dx, dz] of [[-0.25, -0.25], [0.25, 0.2]]) bar(w, x + dx, h, z + dz, x + dx, h + 1.2 + r(), z + dz, 0.035, 0x8a4a3a);
  }
  const slab = (y, x0, x1, hole) => {
    if (!hole || x1 <= 116) { conc(w, (x0 + x1) / 2, y, -120, x1 - x0 + 1, 0.5, 25, C); return; }
    conc(w, (x0 + 116) / 2, y, -120, 116 - x0 + 0.5, 0.5, 25, C);
    if (x1 > 124) conc(w, (124 + x1) / 2, y, -120, x1 - 124 + 0.5, 0.5, 25, C);
    for (const z of [-128.25, -111.75]) conc(w, 120, y, z, 8, 0.5, 8.5, C);
    trim(w, 120, y + 0.55, -120, 8, 8, ORG, 0.12);
  };
  slab(6, 104, 136, true); slab(12, 104, 136, true); slab(18, 104, 128, true); slab(24, 104, 116, false);
  // 남쪽 비계와 안전망, 호이스트
  w.box(112, 0, -106.6, 17, 25, 0.12, 0x46c070, { mat: "glass" });
  for (let x = 104; x <= 120; x += 4) bar(w, x, 0, -106.2, x, 26, -106.2, 0.06, 0x9aa0a8, "metal");
  for (let y = 2; y <= 26; y += 4) bar(w, 104, y, -106.2, 120, y, -106.2, 0.05, 0x9aa0a8, "metal");
  truss(w, 137.6, 0, -112, 137.6, 20, -112, 1.6, YEL); w.box(137.6, 9, -112, 1.5, 2.4, 1.5, ORG, { mat: "paint" });
  // 작업등
  for (const [x, y, z] of [[108, 11.6, -128], [132, 11.6, -112], [108, 17.6, -112], [124, 5.6, -128], [110, 23.6, -124]]) { glow(w, x, y, z, 1.4, 0.2, 0.5, 0xfff0c8); w.pool(x, y - 5.55, z, 9, WARM, 0.4); }
  // 타워 크레인
  const mx = 140, mz = -101, top = 78, a = Math.atan2(-123 - mz, 108 - mx), jx = Math.cos(a), jz = Math.sin(a);
  conc(w, mx, 0, mz, 5, 1, 5, 0x5a5f6a);
  truss(w, mx, 1, mz, mx, top, mz, 2.2, YEL, { bay: 3.6 });
  w.box(mx + jx * 1.5 - jz * 1.6, top - 3.2, mz + jz * 1.5 + jx * 1.6, 2, 2.4, 2, 0xdfe3ea, { mat: "paint" });                        // 운전실
  truss(w, mx - jx * 16, top + 1, mz - jz * 16, mx + jx * 50, top + 1, mz + jz * 50, 1.8, YEL, { bay: 3.4 });
  truss(w, mx, top, mz, mx, top + 9, mz, 1.4, YEL);
  bar(w, mx, top + 9, mz, mx + jx * 34, top + 2, mz + jz * 34, 0.06, 0x2c3138); bar(w, mx, top + 9, mz, mx - jx * 14, top + 2, mz - jz * 14, 0.06, 0x2c3138);
  w.box(mx - jx * 13, top - 2.4, mz - jz * 13, 5, 2.6, 2.4, 0x6a6e76, { ry: -a / DEG, mat: "std:concrete", tile: 3 });                  // 평형추
  K.beacons.push([mx, top + 9.5, mz], [mx + jx * 50, top + 2.2, mz + jz * 50], [mx - jx * 16, top + 2.2, mz - jz * 16]);
  // 매달린 컨테이너
  const hx = mx + jx * 34, hz = mz + jz * 34;
  w.pipe(hx, 44, hz, hx, top, hz, 0.05, 0x2c3138, { col: false });
  for (const [dx, dz] of [[-5, -1], [5, -1], [5, 1], [-5, 1]]) bar(w, hx, 44, hz, hx + dx, 41.6, hz + dz, 0.03, 0x2c3138);
  w.container(hx, 39, hz, 0, 0xc2562f);
  w.gap("크레인 화물 아래", hx, 35.5, hz, 0, 12, 6, 500);
  // 자재 야드
  w.container(108, 0.18, -101.5, 0, 0x2f6fa0); w.container(108, 2.78, -101.5, 0, 0xd9d9d9); w.container(122, 0.18, -101.5, 0, 0x3d8a5a);
  for (let i = 0; i < 4; i++) w.pipe(100 + i * 0.9, 0.6, -141, 100 + i * 0.9, 0.6, -133, 0.4, 0x7a7f88, { mat: "metal" });
  w.blob(131, 1.0, -139, 4, 1.6, 3.4, 0x8a7a5c, { mat: "std:dirt" });
  for (const [x, z, ry] of [[97.6, -120, 90], [120, -97.6, 0], [143, -124, 90]]) w.box(x, 0.18, z, 9, 1.1, 0.4, 0xdadada, { ry, ...HZ });
  for (const k of [-2.6, 2.6]) bar(w, 120 + k, 0.18, -97.2, 120 + k, 4.8, -97.2, 0.08, 0x3a3f48);
  K.signs.add("caution", 120, 3.4, -97.05, 6, { ry: 0, back: true });
  w.gap("골조 빌딩 관통", 120, 9.25, -128, 90, 7, 5, 500); w.gap("골조 빌딩 관통", 108, 9.25, -120, 0, 7, 5, 500);
  w.gap("골조 빌딩 관통", 108, 15.25, -120, 0, 7, 5, 500); w.gap("골조 빌딩 관통", 120, 21.25, -128, 90, 7, 5, 500);
  w.gap("골조 아트리움 낙하", 120, 12.2, -120, 0, 7, 7, 750, -90);
}

// ── 돔 경기장 (0,-180) ──
export function dome(w, K, cx, cz) {
  const R = 20;
  w.cyl(cx, 0, cz, R + 0.6, 7, 0x4a5262, { mat: "std:panel", tile: 4 });
  w.sph(cx, 7, cz, R, 0x8fa0bd, { mat: "paint" });
  ring(w, cx, 7.1, cz, R + 0.7, 0.35, CYA, { col: false, seg: 48 });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.TorusGeometry(R + 0.12, 0.16, 5, 28, Math.PI); g.rotateY((i * Math.PI) / 4);
    w.mesh(g, TRS(cx, 7, cz), i % 2 ? MAG : CYA, "glow"); g.dispose();
  }
  K.beacons.push([cx, 27.8, cz]);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; glow(w, cx + Math.cos(a) * (R + 0.7), 0.4, cz + Math.sin(a) * (R + 0.7), 0.3, 4.6, 0.3, i % 2 ? WARM : CYA); }
  w.pool(cx, 0.2, cz, R + 14, CYA, 0.22);
}

// ── 대관람차 받침(바퀴는 city-life 에서 회전, 축은 x 방향) (120,120) ──
export function ferrisBase(w, K, cx, cz, hubY, R) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.pipe(cx + sx * 7, 0, cz + sz * 15, cx + sx * 2.6, hubY, cz, 0.55, 0xdfe3ea, { mat: "paint" });
  w.pipe(cx - 3.2, hubY, cz, cx + 3.2, hubY, cz, 1.5, 0x3a4050, { mat: "metal" });
  for (const dx of [-1.5, 1.5]) for (let i = 0; i < 20; i++) {   // 림 충돌체(회전해도 같은 자리)
    const a0 = (i / 20) * 6.2832, a1 = ((i + 1) / 20) * 6.2832;
    w.col.addCapsule(new THREE.Vector3(cx + dx, hubY + Math.sin(a0) * R, cz + Math.cos(a0) * R), new THREE.Vector3(cx + dx, hubY + Math.sin(a1) * R, cz + Math.cos(a1) * R), 0.4);
  }
  conc(w, cx, 0.18, cz, 9, 5.6, 16, 0x4a505c);                                    // 승강장
  trim(w, cx, 5.9, cz, 9, 16, MAG, 0.2);
  K.signs.add("luna", cx + 4.62, 3.4, cz, 9, { ry: 90 }); K.signs.add("luna", cx - 4.62, 3.4, cz, 9, { ry: -90 });
  // 축제 천막과 사람들
  for (const [x, z, c] of [[-17, -15, RED], [-17, -5, YEL], [-17, 6, CYA], [-17, 16, MAG], [17, -15, GRN], [17, 15, ORG]]) {
    for (const [ax, az] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) bar(w, cx + x + ax, 0.18, cz + z + az, cx + x + ax, 2.6, cz + z + az, 0.07, 0xdfe3ea);
    hip(w, cx + x, 2.6, cz + z, 4.4, 1.6, 4.4, c, { mat: "paint" });
    glow(w, cx + x, 2.2, cz + z, 2.4, 0.12, 2.4, dim(WARM, 0.8)); w.pool(cx + x, 0.2, cz + z, 5, WARM, 0.4);
  }
  people(w, cx - 12, 0.18, cz, 2.2, 17, 22); people(w, cx + 12, 0.18, cz, 2.2, 16, 12);
  w.pool(cx, 0.2, cz, 24, MAG, 0.22);
  w.gap("대관람차 관통", cx, hubY + R * 0.52, cz, 90, 22, R * 0.8, 700); w.gap("대관람차 관통", cx, hubY - R * 0.52, cz, 90, 22, R * 0.8, 700);
}

// ── 야외 공연장: 트러스 아치 무대 (120,180) ──
export function stage(w, K, cx, cz) {
  conc(w, cx, 0.18, cz + 12, 30, 1.4, 12, 0x2a2e38);
  for (const s of [-1, 1]) { truss(w, cx + s * 16, 0.18, cz + 8, cx + s * 16, 15, cz + 8, 1.4, 0x9aa0a8, { mat: "metal" }); truss(w, cx + s * 16, 0.18, cz + 17, cx + s * 16, 15, cz + 17, 1.4, 0x9aa0a8, { mat: "metal" }); }
  for (const z of [8, 17]) truss(w, cx - 17, 15.6, cz + z, cx + 17, 15.6, cz + z, 1.4, 0x9aa0a8, { mat: "metal" });
  w.box(cx, 5, cz + 17.6, 24, 9, 0.5, 0x12151c);
  K.signs.add("neon", cx, 9.5, cz + 17.2, 18, { ry: 180 });
  for (let i = 0; i < 7; i++) { const x = cx - 15 + i * 5; glow(w, x, 14.6, cz + 8, 0.8, 0.4, 0.8, NEON[i % 6]); w.shaft(x, 14.6, cz + 9, 0.3, 3.2, 12.8, NEON[i % 6], 0.05); }
  people(w, cx, 0.18, cz - 4, 15, 8, 70);
  w.pool(cx, 0.2, cz - 2, 22, MAG, 0.3); w.pool(cx, 1.7, cz + 12, 16, CYA, 0.4);
  w.gap("공연장 트러스 아래", cx, 8.2, cz + 8, 0, 29, 12.6, 350);
}

// ── 야시장: 아케이드(-120,120) + 등불 골목(-60,120) ──
export function market(w, K) {
  const r = w.rand, SG = ["noodle", "cafe", "sing", "pharm", "mart", "fish", "arcade", "post"], TS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"];
  let si = 0, ti = 0;
  for (const cx of [-120, -60]) {
    const arcade = cx === -120;
    for (const s of [-1, 1]) {
      // 골목(z 116..124) 양쪽 상가 줄
      let x = cx - 23;
      while (x < cx + 22.9) {
        const wd = Math.min(cx + 23 - x, 6.5 + r() * 4.5), bx = x + wd / 2, h = arcade ? 9 + r() * 4 : 6.5 + r() * 6, col = pick(w, [0x8a5a48, 0x7a6a5a, 0x6c7480, 0x9a8468, 0x5d6678]);
        const z = 120 + s * 12, face = 120 + s * 4;
        w.box(bx, 0, z, wd - 0.3, h, 16, col, { mat: r() < 0.55 ? "std:brick" : "std:concrete" });
        if (!arcade && r() < 0.5) gable(w, bx, h, z, 16.4, 2.4, wd - 0.1, 0x2c3138, { ry: 90 }); else w.box(bx, h, z, wd, 0.5, 16.3, 0x2c3138, { col: false });
        glow(w, bx, 0.45, face - s * 0.06, wd - 1.6, 2.4, 0.1, dim(pick(w, [WARM, ORG, YEL, WARM]), 0.45));                     // 쇼윈도
        w.box(bx, 3.05, face - s * 0.7, wd - 0.6, 0.14, 1.5, pick(w, [0xb33a3a, 0xd98a2b, 0x2f8a7a, 0x8a3ab3]), { col: false, rx: -s * 12 });   // 차양
        K.signs.add(SG[si++ % SG.length], bx, 4.7, face - s * 0.12, Math.min(5.2, wd - 1), { ry: s > 0 ? 180 : 0 });
        if (r() < 0.6 && wd > 5) { const id = TS[ti++ % 8]; K.signs.add(id, x + 0.4, 7.4, face - s * 0.75, 1.15, { ry: 90, back: id }); }
        if (r() < 0.45) roof(w, K, bx, z, wd, 12, h + 0.5, "tank");
        glow(w, bx, 0.5, 120 + s * 20.06, wd - 2.5, 2, 0.1, dim(pick(w, NEON), 0.3));                                             // 바깥쪽 창
        x += wd;
      }
    }
    if (arcade) {
      // 반원 유리 지붕과 리브
      for (let k = 0; k < 6; k++) { const a = ((k + 0.5) / 6) * Math.PI; w.box(cx, 8.2 + 4.2 * Math.sin(a) - 0.04, 120 - 4.2 * Math.cos(a), 46, 0.08, 2.26, 0x9fd8ff, { mat: "glass", rx: a / DEG - 90 }); }
      for (let i = 0; i < 9; i++) ring(w, cx - 22 + i * 5.5, 8.2, 120, 4.1, 0.13, i % 2 ? MAG : CYA, { axis: "x", arc: Math.PI, seg: 16, sides: 4, cseg: 6 });
      w.gap("아케이드 시장", cx, 4.6, 120, 90, 7, 7.6, 550);
    } else {
      // 골목을 가로지르는 등불 줄
      for (let x = cx - 20; x <= cx + 20; x += 5) {
        bar(w, x, 7, 116, x, 6.2, 120, 0.025, 0x1c1f27); bar(w, x, 6.2, 120, x, 7, 124, 0.025, 0x1c1f27);
        for (let k = 0; k < 5; k++) { const z = 117 + k * 1.5; glow(w, x, 6.9 - Math.sin(((k + 0.5) / 5) * Math.PI) * 0.75 - 0.5, z, 0.42, 0.5, 0.42, [RED, YEL, ORG][(k + (x / 5)) & 1 ? 0 : 1 + (k % 2)]); }
        if ((x / 5) % 2 === 0) w.pool(x, 0.25, 120, 5.5, ORG, 0.3);
      }
      people(w, cx, 0.18, 120, 21, 2.6, 26);
      w.gap("등불 골목", cx, 3.4, 120, 90, 6.6, 5, 400);
    }
    w.box(cx, 0.18, 120, 46, 0.06, 8, 0x5a4a44, { col: false, mat: "std:brick", tile: 3 });
  }
  // 골목 입구 문(네온 아치)
  for (const x of [-142.4, -97.6, -82.4, -37.6]) {
    for (const s of [-1, 1]) { w.box(x, 0, 120 + s * 3.9, 0.6, 9.4, 0.6, 0x8a2f2a, { mat: "paint" }); glow(w, x, 0.4, 120 + s * 3.5, 0.2, 6, 0.16, RED); }
    w.box(x, 6.6, 120, 0.7, 2.8, 8.4, 0x1a1418);
    K.signs.add("market", x - 0.42, 8, 120, 7.4, { ry: -90 }); K.signs.add("market", x + 0.42, 8, 120, 7.4, { ry: 90 });
    w.pool(x, 0.2, 120, 7, RED, 0.3);
  }
  for (let x = -93; x <= -87; x += 3) for (let k = 0; k < 3; k++) glow(w, x, 8.6 + (k % 2) * 0.3, 117.5 + k * 2.5, 0.42, 0.5, 0.42, k % 2 ? YEL : RED);
}

// ── 성문 "서문" (-180,120): 아치 통로가 있는 석축 + 2층 누각 ──
export function cityGate(w, K, cx, cz) {
  const ST = { mat: "std:rock", tile: 6 }, stone = 0x8c8478, redw = 0x9a3a2e, tile = 0x2a3a40;
  for (const s of [-1, 1]) { w.box(cx, 0, cz + s * 8.25, 10, 9, 9.5, stone, ST); w.box(cx, 0, cz + s * 18, 5, 5.5, 10, stone, ST); }
  w.box(cx, 6.6, cz, 10, 2.4, 7.2, stone, ST);
  for (const s of [-1, 1]) ring(w, cx + s * 5.02, 3.4, cz, 3.45, 0.22, WARM, { axis: "x", arc: Math.PI, seg: 16, sides: 4, col: false });
  for (let k = -6; k <= 6; k++) for (const s of [-1, 1]) w.box(cx + s * 4.7, 9, cz + k * 2, 0.6, 0.9, 1.2, stone, { col: false, ...ST });   // 여장
  for (const sx of [-1, 1]) for (let k = -3; k <= 3; k++) w.box(cx + sx * 3, 9, cz + k * 3.4, 0.5, 4, 0.5, redw, { col: false, mat: "paint" });
  w.box(cx, 9, cz, 5, 4, 19, 0x5a2a24, { mat: "paint" });
  hip(w, cx, 13, cz, 13, 3, 30, tile, { top: 0.5, mat: "paint" });
  w.box(cx, 16, cz, 4.4, 3, 13, redw, { mat: "paint" });
  hip(w, cx, 19, cz, 9.5, 3.6, 21, tile, { top: 0.3, mat: "paint" });
  for (const s of [-1, 1]) { glow(w, cx + s * 6.5, 12.9, cz, 0.14, 0.14, 30, WARM); glow(w, cx + s * 4.75, 18.9, cz, 0.14, 0.14, 21, WARM); }
  for (const s of [-1, 1]) for (const k of [-1, 1]) { glow(w, cx + s * 5.4, 4.6, cz + k * 5.2, 0.5, 0.8, 0.5, ORG); w.pool(cx + s * 9, 0.2, cz + k * 6, 9, WARM, 0.4); }
  w.pool(cx, 0.1, cz, 6, WARM, 0.5);
  const r = w.rand;
  for (const [x, z] of [[-14, -14], [-15, 13], [14, -15], [13, 15]]) tree(w, cx + x + r() * 2, 0.18, cz + z, 1.1, { hue: 0.28 });
  w.gap("성문 통과", cx, 3.3, cz, 90, 6.2, 5.8, 600);
}

// ── 달빛 공원 (0,120) ──
export function park(w, K, cx, cz) {
  const r = w.rand;
  w.box(cx, 0.19, cz, 44, 0.04, 44, 0x2f5a37, { col: false, mat: "std:grass", tile: 6 });
  w.box(cx, 0.2, cz, 44, 0.05, 3, 0x6a6f7a, { col: false, mat: "std:concrete", tile: 4 });
  w.cyl(cx, 0.18, cz, 8.5, 0.5, 0x5a6270); w.cyl(cx, 0.4, cz, 7.8, 0.34, dim(CYA, 0.55), { mat: "glow", col: false });
  ring(w, cx, 5.4, cz, 5, 0.35, 0xfff0c0, { axis: "x", seg: 36 });                      // 연못 위 달 고리(동서로 통과)
  w.gap("공원 달 고리", cx, 5.4, cz, 90, 7, 7, 450);
    for (let i = 0; i < 18; i++) {
    const a = r() * 6.283, d = 12 + r() * 9, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (Math.abs(z - cz) < 4.5 || Math.max(Math.abs(x - cx), Math.abs(z - cz)) > 20.5 || (x - cx > 8 && z - cz > 8)) continue;
    tree(w, x, 0.18, z, 0.9 + r() * 0.5, { hue: 0.26 + r() * 0.06 });
  }
  // 정자
  const px = cx + 14, pz = cz + 14;
  w.cyl(px, 0.18, pz, 4.2, 0.5, 0x6a6f7a, { col: false });
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; w.pipe(px + Math.cos(a) * 3.4, 0.2, pz + Math.sin(a) * 3.4, px + Math.cos(a) * 3.4, 3.6, pz + Math.sin(a) * 3.4, 0.18, 0x9a3a2e); }
  hip(w, px, 3.6, pz, 8.4, 2.6, 8.4, 0x2a3a40, { mat: "paint" });
  glow(w, px, 3.2, pz, 0.5, 0.4, 0.5, WARM); w.pool(px, 0.3, pz, 7, WARM, 0.45);
  for (const [x, z] of [[-10, -19], [10, -19], [-19, 8], [-10, 19]]) { glow(w, cx + x, 0.2, cz + z, 0.25, 1, 0.25, WARM); w.pool(cx + x, 0.25, cz + z, 5, WARM, 0.35); }
}

// ── 호텔 달빛 (60,120): 동서로 긴 두 동, 그 사이 8m 틈으로 지나갈 수 있다 ──
export function hotel(w, K, cx, cz) {
  tower(w, K, cx, cz - 12, 40, 16, 36, 0x6c6480, { neon: VIO, trim: true, sign: false, roof: "pool" });
  tower(w, K, cx, cz + 12, 40, 16, 27, 0x6c6480, { neon: VIO, trim: true, sign: false, roof: "garden" });
  w.box(cx, 0, cz, 22, 5, 8, 0x3a3644, { mat: "std:concrete", tile: 6 });
  for (const y of [14, 22]) { w.box(cx, y, cz, 6, 0.5, 8, 0x596273); glow(w, cx, y - 0.2, cz, 6, 0.2, 8.2, VIO); }      // 두 동을 잇는 구름다리
  w.box(cx - 20.4, 5.2, cz, 0.4, 3.4, 9.6, 0x12151c, { col: false }); K.signs.add("hotel", cx - 20.72, 6.9, cz, 9, { ry: -90 });
  w.box(cx, 36.7, cz - 19.6, 14, 6, 0.4, 0x12151c); K.signs.add("hotel", cx, 39.8, cz - 19.92, 12.5, { ry: 180 });
  w.pool(cx - 24, 0.2, cz, 10, VIO, 0.4);
  w.gap("호텔 틈새", cx, 9.5, cz, 90, 7.4, 8, 500);
}

// ── 고가도로 (z = 150) ──
export function expressway(w, K) {
  w.box(0, 9, 150, 1040, 1, 12, 0x474c57, { mat: "std:concrete", tile: 6 });
  for (const s of [-1, 1]) { w.box(0, 10, 150 + s * 5.8, 1040, 0.9, 0.4, 0x6a7080); glow(w, 0, 10.9, 150 + s * 5.8, 470, 0.08, 0.12, dim(ORG, 0.8)); }
  for (let x = -480; x <= 480; x += 60) {
    if (Math.abs(x) > 240) { conc(w, x, 0, 150, 2, 9, 9, 0x5a606c, { col: false }); continue; }
    for (const z of [145.5, 154.5]) w.pipe(x, 0, z, x, 9, z, 1.0, 0x5a606c, { mat: "std" });
    glow(w, x, 8.8, 150, 0.3, 0.1, 8, dim(CYA, 0.7));
    K.block.push([x - 2.5, x + 2.5, 143, 157]);
  }
  for (let x = -225; x < 225; x += 12) glow(w, x, 10.02, 150, 5, 0.02, 0.2, 0x55501e);
  for (const x of [-150, -30, 30, 150]) w.gap("고가도로 아래", x, 4.5, 150, 0, 13, 8, 300);
}

// ── 원경: 외곽 스카이라인과 산 ──
export function backdrop(w, K) {
  const r = w.rand;
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * 6.283 + r() * 0.08, d = 330 + r() * 150, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 26 + r() * 22, h = 28 + r() * r() * 110;
    if (Math.abs(z - 60) < 34 || Math.abs(z - 150) < 22) continue;
    lit(w, x, 0, z, s, h, s * (0.7 + r() * 0.5), pick(w, COOL), { col: false, ry: r() * 30 });
    if (h > 70) K.beacons.push([x, h + 1.5, z, 1.2]);
    if (r() < 0.4) glow(w, x, h + 0.1, z, s * 0.9, 0.5, 0.5, pick(w, NEON), { ry: r() * 90 });
  }
  for (const [x, z, R, h] of [[-520, -430, 270, 120], [320, -660, 320, 95], [660, 230, 260, 85], [-620, 330, 240, 70]]) w.cone(x, 0, z, R, h, 0x10162a, { col: false, mat: "flat", grad: [0.7, 1.15] });
  w.pipe(-520, 118, -430, -520, 168, -430, 2.2, 0x3a4660, { col: false }); K.beacons.push([-520, 171, -430, 3]);
}
