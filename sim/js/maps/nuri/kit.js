// 누리 대륙 공용 건축 부품: 세력별 색·재질, 회전 좌표계(frame), 도시 격자·항구·요새·공장·첨탑 등
//  좌표는 모두 '구역 맵 로컬'(world 좌표). 높이는 w.h 로 지형에서 읽는다
import * as THREE from "../../../vendor/three.module.min.js";
const D = Math.PI / 180;

// 세력 스타일
export const ST = {
  hanul: { wall: 0xd8d4c8, dark: 0x5a6270, acc: 0x3fb39c, glass: 0x8fd4ff, roof: 0x3a4a5a, lite: 0xffe2a8 },
  haerim: { wall: 0xe8e4da, dark: 0x2c3c58, acc: 0x4a7fd0, glass: 0x9ac8ff, roof: 0x2c4a7a, lite: 0xffe2a8 },
  bukseol: { wall: 0xb8b0a4, dark: 0x5a5048, acc: 0x8fd8ff, glass: 0xbfe8ff, roof: 0x4a5a6a, lite: 0xfff0c8 },
  jeoksa: { wall: 0xc89a6a, dark: 0x6a4a34, acc: 0xffa040, glass: 0xffd8a0, roof: 0x8a4a2a, lite: 0xffd090 },
  namdo: { wall: 0xf2efe6, dark: 0x4a6a5a, acc: 0x74b356, glass: 0xa8f0e0, roof: 0x3a8a6a, lite: 0xfff0c8 },
  e1: { wall: 0x8a8a84, dark: 0x4a4a48, acc: 0xff3a2a, glass: 0x5a6a70, roof: 0x3a3a3a, lite: 0xff4a3a },
  e2: { wall: 0x2e3036, dark: 0x1c1e22, acc: 0xff7a1a, glass: 0xffa040, roof: 0x24262a, lite: 0xff8a2a },
  e3: { wall: 0x141218, dark: 0x0a080c, acc: 0xff2a3a, glass: 0xff4a5a, roof: 0x0e0c10, lite: 0xff2a3a },
};

// 회전 좌표계: (u, v) 로컬 → 세계. ry 도
export function frame(w, x, z, ry = 0) {
  const c = Math.cos(ry * D), s = Math.sin(ry * D);
  const X = (u, v) => x + u * c + v * s, Z = (u, v) => z - u * s + v * c;
  const H = (u, v) => w.h(X(u, v), Z(u, v));
  return {
    X, Z, H, ry,
    box: (u, y, v, sx, sy, sz, col, o = {}) => w.box(X(u, v), y, Z(u, v), sx, sy, sz, col, { ...o, ry: (o.ry || 0) + ry }),
    cyl: (u, y, v, r, h, col, o) => w.cyl(X(u, v), y, Z(u, v), r, h, col, o),
    cone: (u, y, v, r, h, col, o) => w.cone(X(u, v), y, Z(u, v), r, h, col, o),
    sph: (u, y, v, r, col, o) => w.sph(X(u, v), y, Z(u, v), r, col, o),
    pipe: (u0, y0, v0, u1, y1, v1, r, col, o) => w.pipe(X(u0, v0), y0, Z(u0, v0), X(u1, v1), y1, Z(u1, v1), r, col, o),
  };
}
// 바닥 높이: 네 귀퉁이 중 가장 낮은 곳 (경사에서도 뜨지 않게)
export const floorAt = (w, x, z, r) => Math.min(w.h(x - r, z - r), w.h(x + r, z - r), w.h(x - r, z + r), w.h(x + r, z + r), w.h(x, z));

// ── 건물 하나 ── kind: glass 유리탑 · office 사무동 · neon 네온 · house 집 · ruin 폐허 · e1 · e2 · e3
export function tower(w, x, z, wd, dp, h, st, kind = "office", ry = 0) {
  const y = floorAt(w, x, z, Math.max(wd, dp) * 0.5) - 0.5, r = w.rand;
  if (kind === "glass") {
    w.box(x, y, z, wd, h, dp, st.glass, { ry, mat: "lit:facadelit", tile: 22, ao: false });
    w.box(x, y + h, z, wd * 0.7, 3, dp * 0.7, st.dark, { ry, col: false });
    if (h > 60) w.cyl(x, y + h + 3, z, 0.35, h * 0.12, 0xdde4ec, { col: false });
    w.box(x, y, z, wd + 0.6, 4, dp + 0.6, st.dark, { ry, col: false, mat: "std:concrete", tile: 6 });
  } else if (kind === "neon") {
    w.box(x, y, z, wd, h, dp, 0x3a3f58, { ry, mat: "lit:facadelit", tile: 20, ao: false });
    const nc = [0xff3ad8, 0x3af0ff, 0xffd23a, 0x7a5aff][(r() * 4) | 0];
    for (let k = 1; k < 4; k++) w.box(x, y + (h * k) / 4, z, wd + 0.4, 0.5, dp + 0.4, nc, { ry, mat: "glow", col: false });
    w.box(x + (Math.cos(ry * D) * wd) / 2 + 0.3, y + h * 0.55, z - (Math.sin(ry * D) * wd) / 2, 0.4, h * 0.3, 3, nc, { ry, mat: "glow", col: false });
  } else if (kind === "house") {
    w.box(x, y, z, wd, h, dp, st.wall, { ry, mat: "std:brick", tile: 3 });
    w.box(x, y + h, z, wd * 0.58, 0.4, dp + 0.8, st.roof, { ry, rz: 30, col: false });
    w.box(x, y + h, z, wd * 0.58, 0.4, dp + 0.8, st.roof, { ry, rz: -30, col: false });
    w.box(x, y + h - 0.2, z, wd + 0.4, 0.4, dp + 0.6, st.roof, { ry, col: false });
  } else if (kind === "ruin") {
    const hh = h * (0.35 + r() * 0.5);
    w.box(x, y, z, wd, hh, dp, st.wall, { ry, mat: "std:concrete", tile: 6 });
    w.box(x + (r() - 0.5) * wd * 0.4, y + hh, z + (r() - 0.5) * dp * 0.4, wd * 0.5, h * 0.12, dp * 0.6, st.wall, { ry: ry + (r() - 0.5) * 20, rz: (r() - 0.5) * 18, mat: "std:concrete", tile: 6 });
    for (let i = 0; i < 3; i++) w.box(x + (r() - 0.5) * wd * 1.6, y, z + (r() - 0.5) * dp * 1.6, 2 + r() * 3, 1 + r() * 2, 2 + r() * 3, 0x6a6862, { ry: r() * 90, col: false, mat: "std:rock" });
    for (let i = 0; i < 2; i++) w.cyl(x + (r() - 0.5) * wd, y + hh, z + (r() - 0.5) * dp, 0.12, 2 + r() * 4, 0x5a4a3a, { col: false });   // 드러난 철근
  } else if (kind === "e1") {
    w.box(x, y, z, wd, h, dp, st.wall, { ry, mat: "std:concrete", tile: 6 });
    w.box(x, y + h, z, wd + 0.8, 1.2, dp + 0.8, 0x3a3a38, { ry, col: false });
    w.box(x, y + h * 0.66, z, wd + 0.3, 0.6, dp + 0.3, st.acc, { ry, mat: "glow", col: false });
    if (h > 18) { w.cyl(x, y + h + 1.2, z, 0.18, 6, 0x4a4a48, { col: false }); w.sph(x, y + h + 7.4, z, 0.6, st.acc, { mat: "glow", col: false }); }
  } else if (kind === "e2") {
    w.box(x, y, z, wd, h, dp, st.wall, { ry, mat: "std:panel", tile: 4 });
    w.box(x, y + h * 0.5, z, wd + 0.6, h * 0.08, dp + 0.6, 0x3c3e44, { ry, mat: "std:hazard", tile: 3, col: false });
    w.box(x, y + h, z, wd * 0.6, 2, dp * 0.6, st.dark, { ry, col: false });
    w.box(x, y + h * 0.82, z, wd + 0.2, 0.5, dp + 0.2, st.acc, { ry, mat: "glow", col: false });
  } else if (kind === "e3") {
    w.box(x, y, z, wd, h, dp, st.wall, { ry, mat: "paint" });
    w.box(x, y, z, wd * 0.12, h * 1.002, dp + 0.2, st.acc, { ry, mat: "glow", col: false });   // 붉은 심장선
    w.box(x, y + h * (0.3 + r() * 0.5), z, wd + 0.2, 0.35, dp + 0.2, st.acc, { ry, mat: "glow", col: false });
  } else {
    w.box(x, y, z, wd, h, dp, st.wall, { ry, mat: w.night ? "lit:facadelit" : "std:facade", tile: 24, ao: false });
    w.box(x, y, z, wd + 0.5, 3.6, dp + 0.5, st.dark, { ry, col: false, mat: "std:concrete", tile: 6 });
    w.box(x, y + h, z, wd + 0.6, 0.8, dp + 0.6, st.dark, { ry, col: false });
    if (r() < 0.5) w.box(x + (r() - 0.5) * wd * 0.4, y + h + 0.8, z + (r() - 0.5) * dp * 0.4, 3, 2, 3, 0x5a616c, { ry, col: false, mat: "std:panel", tile: 3 });
  }
}

// ── 도시 격자 ── R 반경 안에 블록(cell)마다 건물. hMax 중심 높이, kinds 건물 종류 목록, skip(u,v) 비울 곳
export function cityGrid(w, F, R, st, o = {}) {
  const cell = o.cell || 34, road = o.road || 10, r = w.rand, kinds = o.kinds || ["office"], hMax = o.hMax || 60, hMin = o.hMin || 8;
  const n = Math.ceil(R / cell), gy = F.H(0, 0);
  // 바닥: 도시 전체 아스팔트 + 블록마다 보도 판 (풀밭 위에 건물이 그냥 서지 않게)
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const u = i * cell, v = j * cell, d = Math.hypot(u, v);
    if (d > R - cell * 0.5) continue;
    if (o.slab !== false) { const gh = F.H(u, v); F.box(u, gh - 0.3, v, cell + 0.4, 0.4, cell + 0.4, 0x55585e, { col: false, mat: "std:asphalt", tile: 8 }); F.box(u, gh - 0.15, v, cell - road + 3, 0.4, cell - road + 3, 0x9a9a92, { col: false, mat: "std:concrete", tile: 4 }); }
    if (o.skip && o.skip(u, v)) continue;
    if (r() < (o.empty ?? 0.08)) { if (r() < 0.5) for (let t = 0; t < 3; t++) w.tree(F.X(u + (r() - 0.5) * 18, v), F.Z(u, v + (r() - 0.5) * 18), 0.8, "round"); continue; }
    const fall = 1 - d / R, h = hMin + (hMax - hMin) * Math.pow(fall, o.pow ?? 1.6) * (0.55 + r() * 0.6);
    const kind = kinds[(r() * kinds.length) | 0], bw = cell - road;
    if (h > hMax * 0.45 || kind === "house") tower(w, F.X(u, v), F.Z(u, v), bw * (0.7 + r() * 0.25), bw * (0.7 + r() * 0.25), h, st, kind, F.ry);
    else { const q = bw / 2; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (r() < 0.85) tower(w, F.X(u + (a * q) / 2, v + (b * q) / 2), F.Z(u + (a * q) / 2, v + (b * q) / 2), q * 0.85, q * 0.85, h * (0.5 + r() * 0.7), st, kind, F.ry); }
  }
  // 가로등 줄 (큰길 둘)
  if (o.lamps !== false) for (let t = -R + 20; t < R - 20; t += 32) { w.lamp(F.X(t, road * 0.4 - cell / 2), F.Z(t, road * 0.4 - cell / 2), 8, st.lite); w.lamp(F.X(cell / 2 - road * 0.4, t), F.Z(cell / 2 - road * 0.4, t), 8, st.lite); }
}

// ── 활주로 · 격납고 · 관제탑 ──
export function airfield(w, x, z, ry, st, o = {}) {
  const F = frame(w, x, z, ry), y = F.H(0, 0) + 0.05, L = o.len || 420, r = w.rand;
  F.box(0, y, 0, L, 0.12, 30, 0x34363a, { mat: "std:asphalt", tile: 8, col: false });
  for (let u = -L / 2 + 20; u < L / 2 - 20; u += 24) F.box(u, y + 0.13, 0, 10, 0.04, 0.8, 0xf2f2ea, { col: false });
  for (const s of [-1, 1]) for (let u = -L / 2; u <= L / 2; u += 20) F.box(u, y + 0.13, s * 14, 0.5, 0.2, 0.5, s > 0 ? 0x3af0ff : 0xffd23a, { mat: "glow", col: false });
  F.box(0, y, 46, L * 0.8, 0.1, 14, 0x3e4044, { mat: "std:asphalt", tile: 8, col: false });   // 유도로
  const nH = o.hangars ?? 4;
  for (let i = 0; i < nH; i++) {
    const u = -L * 0.32 + i * ((L * 0.64) / Math.max(1, nH - 1)), v = 82;
    F.box(u, y, v, 34, 12, 28, st.wall, { mat: "std:corrug", tile: 4 });
    F.cyl(u, y + 9, v, 1, 1, st.wall, { col: false });
    F.box(u, y + 12, v, 34.6, 3.5, 28.6, st.roof, { col: false, mat: "std:corrug", tile: 4 });
    F.box(u, y, v - 14.1, 26, 10, 0.3, st.dark, { col: false, mat: "std:panel", tile: 3 });
    F.box(u, y + 10.2, v - 14.3, 6, 1.2, 0.2, st.acc, { mat: "glow", col: false });
  }
  // 관제탑
  const tu = L * 0.42, tv = 70;
  F.cyl(tu, y, tv, 3.2, 26, st.wall, { mat: "std:concrete" });
  F.cyl(tu, y + 26, tv, 6.5, 5, st.glass, { mat: "glass", col: false });
  F.cyl(tu, y + 26, tv, 6.6, 0.5, st.dark, { col: false });
  F.cyl(tu, y + 31, tv, 7, 0.8, st.dark, {});
  F.cyl(tu, y + 31.8, tv, 0.2, 6, 0xdddddd, { col: false }); F.sph(tu, y + 38, tv, 0.6, 0xff3a2a, { mat: "glow", col: false });
  // 연료 탱크 · 대공포
  for (let i = 0; i < 3; i++) F.cyl(-L * 0.45 + i * 14, y, 110, 5, 7, 0xd8d8d0, { mat: "paint" });
  for (const u of [-L * 0.5, L * 0.5]) aaGun(w, F.X(u, -40), F.Z(u, -40), st);
  if (o.parked !== false) for (let i = 0; i < 5; i++) jet(w, F.X(-L * 0.3 + i * 30, 52), F.Z(-L * 0.3 + i * 30, 52), ry + 90, st);
}
export function jet(w, x, z, ry, st) {
  const F = frame(w, x, z, ry), y = F.H(0, 0) + 1.2;
  F.box(0, y, 0, 2, 1.6, 12, 0x9aa4b0, { mat: "paint" });
  F.box(0, y + 0.4, -1, 11, 0.25, 4, 0x8a94a0, { mat: "paint", col: false });
  F.box(0, y + 1.2, 5, 0.25, 2.6, 2, 0x8a94a0, { col: false });
  F.box(0, y + 1.2, -3, 1.1, 0.7, 2.4, st.glass, { mat: "glass", col: false });
}
export function aaGun(w, x, z, st) {
  const y = floorAt(w, x, z, 4);
  w.cyl(x, y, z, 4, 1.4, st.dark, { mat: "std:concrete" });
  w.box(x, y + 1.4, z, 3, 2.2, 3.4, st.wall, { mat: "std:panel", tile: 3 });
  for (const s of [-0.7, 0.7]) w.box(x + s, y + 3.2, z - 2.5, 0.35, 0.35, 5, 0x3a3c40, { rx: -30, col: false });
}

// ── 배 ── kind: cargo 화물선 · war 전함 · e2 제국 구축함 · e3 제국 기함
export function ship(w, x, z, ry, L, st, kind = "cargo") {
  const F = frame(w, x, z, ry), y = -1.2, B = L * 0.16, r = w.rand;
  const hull = kind === "e3" ? 0x121014 : kind === "e2" ? 0x2a2c30 : kind === "war" ? 0x6a7684 : 0x8a3a2a;
  F.box(0, y, 0, B, 6, L * 0.86, hull, { mat: "paint" });
  F.box(0, y, L * 0.46, B * 0.62, 6, L * 0.1, hull, { mat: "paint", col: false });
  F.box(0, y + 5.6, 0, B * 1.02, 0.5, L * 0.86, kind === "cargo" ? 0x5a5a5a : 0x7a828c, { col: false });
  if (kind === "cargo") {
    F.box(0, y + 6, -L * 0.36, B * 0.9, 9, L * 0.1, 0xf0f0e8, { mat: "paint" });
    for (let t = -L * 0.25; t < L * 0.36; t += 13.5) for (let k = 0; k < 2; k++) F.box(0, y + 6 + k * 2.6, t, B * 0.8, 2.6, 12.2, [0xb5452f, 0x2f6ab5, 0x3a9a5a, 0xd8a02a][(r() * 4) | 0], { mat: "std:corrug", tile: 2, col: k === 0 });
  } else {
    F.box(0, y + 6, -L * 0.08, B * 0.6, 8, L * 0.22, hull, { mat: "std:panel", tile: 3 });
    F.box(0, y + 14, -L * 0.1, B * 0.36, 5, L * 0.1, hull, { mat: "std:panel", tile: 3 });
    F.cyl(0, y + 19, -L * 0.1, 0.4, 8, 0x5a5e66, { col: false });
    for (const t of [L * 0.22, L * 0.34, -L * 0.3]) { F.cyl(0, y + 6, t, B * 0.22, 2, hull, { col: false }); F.box(0, y + 7.2, t + 2.5, 0.8, 0.8, 7, 0x3a3c40, { col: false }); }
    if (kind === "e2" || kind === "e3") F.box(0, y + 6.2, 0, B * 1.04, 0.4, L * 0.7, st.acc, { mat: "glow", col: false });
    if (kind === "e3") { F.box(0, y + 6, 0, B * 0.3, 22, L * 0.06, hull, { mat: "paint" }); F.box(0, y + 28, 0, B * 0.12, 0.6, L * 0.5, st.acc, { mat: "glow", col: false }); }
  }
}

// ── 항구 ── 바다 쪽(sea: 라디안 방향)으로 부두를 낸다
export function port(w, x, z, sea, st, o = {}) {
  const ry = -sea / D + 90, F = frame(w, x, z, ry), r = w.rand, piers = o.piers || 4, pl = o.pierLen || 140;
  // 부두: v+ 가 바다
  for (let i = 0; i < piers; i++) {
    const u = (i - (piers - 1) / 2) * (o.gap || 60);
    F.box(u, -3, pl / 2 + 10, 14, 6.6, pl, 0x8a8a84, { mat: "std:concrete", tile: 6 });
    for (let t = 30; t < pl; t += 26) F.box(u + 6.4, 3.6, t, 0.6, 0.6, 0.6, 0x3a3a3a, { col: false });
    if (o.cranes !== false && i % 2 === 0) crane(w, F.X(u - 4, pl * 0.55), F.Z(u - 4, pl * 0.55), ry, o.craneCol || 0xe87a22);
    if (o.ships !== false && r() < 0.8) ship(w, F.X(u + 24, pl * 0.55 + 10), F.Z(u + 24, pl * 0.55 + 10), ry, 80 + r() * 50, st, o.shipKind || "cargo");
  }
  // 방파제
  const bw = (piers * (o.gap || 60)) / 2 + 60;
  F.box(-bw, -4, pl + 60, 10, 8, 120, 0x7a766e, { mat: "std:rock", rx: 0, ry: 20 });
  F.box(bw * 0.2, -4, pl + 110, bw * 1.5, 8, 10, 0x7a766e, { mat: "std:rock" });
  // 창고 · 컨테이너 마당
  for (let i = 0; i < (o.sheds ?? 4); i++) { const u = (i - 1.5) * 46, h = 10 + r() * 6; F.box(u, F.H(u, -40) - 0.3, -40, 38, h, 26, st.wall, { mat: "std:corrug", tile: 4 }); F.box(u, F.H(u, -40) + h - 0.3, -40, 38.4, 1.2, 26.4, st.roof, { col: false }); }
  for (let k = 0; k < (o.containers ?? 40); k++) { const u = -100 + r() * 200, v = -10 + r() * 14; w.container(F.X(u, v), F.H(u, v) + ((r() * 2) | 0) * 2.6, F.Z(u, v), ry + (r() < 0.5 ? 0 : 90), [0xb5452f, 0x2f6ab5, 0x3a9a5a, 0xd8a02a, 0x8a8a8a][(r() * 5) | 0]); }
  return F;
}
export function crane(w, x, z, ry, col = 0xe87a22) {
  const F = frame(w, x, z, ry), y = F.H(0, 0);
  for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) F.box(a, y, b, 1.2, 34, 1.2, col, { mat: "paint" });
  F.box(0, y + 34, 0, 12, 4, 12, col, { mat: "paint" });
  F.box(0, y + 38, 18, 3, 3, 60, col, { mat: "paint", col: false });
  F.box(0, y + 38, -10, 3, 3, 16, col, { mat: "paint", col: false });
  F.box(0, y + 30, 36, 0.2, 8, 0.2, 0x333333, { col: false });
  F.box(0, y + 41, 0, 4, 4, 5, 0xf0f0e8, { col: false });
}

// ── 성벽 고리 ── R 반경, n 변, 탑. kind: stone · e1 · e2 · e3 · ice
export function wallRing(w, x, z, R, st, o = {}) {
  const n = o.sides || 12, H = o.h || 16, T = o.thick || 5, gates = o.gates ?? [0];
  const col = o.col || (o.kind === "ice" ? 0xcfe4ef : st.wall), mat = o.kind === "e3" ? "paint" : o.kind === "e2" ? "std:panel" : o.kind === "stone" || o.kind === "ice" ? "std:rock" : "std:concrete";
  const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + (o.rot || 0); return [x + Math.cos(a) * R, z + Math.sin(a) * R]; });
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], mx = (ax + bx) / 2, mz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax) / D;
    const y = Math.min(w.h(ax, az), w.h(bx, bz), w.h(mx, mz)) - 6;
    if (gates.includes(i)) {
      for (const s of [-1, 1]) w.box(mx + ((bx - ax) / L) * s * L * 0.33, y, mz + ((bz - az) / L) * s * L * 0.33, L * 0.34, H + 6, T, col, { ry, mat, tile: 6 });
      w.box(mx, y + H + 6 - 5, mz, L * 0.36, 5, T, col, { ry, mat, tile: 6 });
    } else w.box(mx, y, mz, L + 1, H + 6, T, col, { ry, mat, tile: 6 });
    if (o.kind === "e2" || o.kind === "e1") w.box(mx, y + H + 6, mz, L, 0.5, T + 0.4, st.acc, { ry, mat: "glow", col: false });
    if (o.kind === "e3") w.box(mx, y + (H + 6) * 0.5, mz, L, 0.6, T + 0.3, st.acc, { ry, mat: "glow", col: false });
    if (o.kind === "stone" || o.kind === "ice") for (let t = -L / 2 + 2; t < L / 2; t += 4) w.box(mx + ((bx - ax) / L) * t, y + H + 6, mz + ((bz - az) / L) * t, 1.8, 1.6, T + 0.2, col, { ry, mat, col: false });
  }
  for (const [px, pz] of pts) {
    const y = w.h(px, pz) - 6, tr = o.towerR || T * 1.3, th = H + 14;
    if (o.kind === "e3") { w.box(px, y, pz, tr * 1.6, th + 16, tr * 1.6, st.wall, { mat: "paint", ry: 45 }); w.box(px, y + th + 10, pz, tr * 1.7, 0.6, tr * 1.7, st.acc, { mat: "glow", col: false, ry: 45 }); }
    else {
      w.cyl(px, y, pz, tr, th, col, { mat, tile: 6 });
      if (o.kind === "stone" || o.kind === "ice") w.cone(px, y + th, pz, tr * 1.25, tr * 1.8, st.roof, { mat: "std", col: false });
      else { w.cyl(px, y + th, pz, tr * 1.15, 1.2, st.dark, { col: false }); w.box(px, y + th + 1.2, pz, 1.4, 1.4, 4.5, 0x3a3c40, { col: false }); w.sph(px, y + th + 3, pz, 0.6, st.acc, { mat: "glow", col: false }); }
    }
  }
  return pts;
}

// ── 공장 (2세대 공창) ── 긴 공장동 + 굴뚝(쇳물빛) + 배관 + 컨베이어
export function factoryBlock(w, F, u, v, st, o = {}) {
  const r = w.rand, L = o.len || 90, W = o.wid || 36, H = o.h || 22, y = F.H(u, v) - 0.6;
  F.box(u, y, v, W, H, L, st.wall, { mat: "std:panel", tile: 4 });
  F.box(u, y + H, v, W * 0.3, 4, L, st.dark, { col: false, mat: "std:corrug", tile: 3 });
  F.box(u + W / 2 + 0.2, y + H * 0.2, v, 0.3, H * 0.4, L * 0.8, st.acc, { mat: "glow", col: false });
  for (let k = 0; k < (o.stacks ?? 3); k++) {
    const sv = v - L / 2 + 14 + k * ((L - 28) / Math.max(1, (o.stacks ?? 3) - 1)), su = u - W / 2 - 6, sh = H + 26 + r() * 20;
    F.cyl(su, y, sv, 3.4, sh, st.dark, { mat: "std:panel", tile: 3, rt: 2.6 });
    F.cyl(su, y + sh, sv, 2.8, 1, st.acc, { mat: "glow", col: false });
    F.cyl(su, y + sh * 0.6, sv, 3.6, 0.8, 0x5a5048, { mat: "std:hazard", col: false });
  }
  F.pipe(u - W / 2 - 3, y + H * 0.7, v - L / 2, u - W / 2 - 3, y + H * 0.7, v + L / 2, 1.1, 0x5a5e66, { col: false });
  F.pipe(u + W / 2 + 3, y + 3, v - L / 2, u + W / 2 + 3, y + 3, v + L / 2, 0.8, 0x6a5040, { col: false });
}

// 빛 고리 (수평 원환) — 원판이 아니라 가는 고리
const _rm = new THREE.Matrix4();
export function glowRing(w, x, y, z, R, t = 0.5, col = 0xff2a3a) {
  const g = new THREE.TorusGeometry(R, t, 6, Math.max(24, Math.round(R * 1.2)));
  g.rotateX(Math.PI / 2);
  w.mesh(g, _rm.makeTranslation(x, y, z), col, "glow");
}
// ── 3세대 첨탑 ── 검은 모노리스 + 붉은 심장선 + 떠 있는 고리
export function monolith(w, x, z, h, st, o = {}) {
  const y = floorAt(w, x, z, 6) - 1, wd = o.w || h * 0.12, r = w.rand;
  w.box(x, y, z, wd, h, wd * (o.thin ? 0.5 : 1), st.wall, { mat: "paint", ry: o.ry || 0 });
  w.box(x, y, z, wd * 0.14, h * 1.004, wd * (o.thin ? 0.52 : 1.02), st.acc, { mat: "glow", col: false, ry: o.ry || 0 });
  if (o.ring !== false && h > 50) for (let k = 0; k < 2; k++) glowRing(w, x, y + h * (0.55 + k * 0.2), z, wd * 1.1 + k * 3, 0.35, st.acc);
  if (o.top) { w.cone(x, y + h, z, wd * 0.5, h * 0.2, st.wall, { mat: "paint", col: false }); w.sph(x, y + h * 1.2 + 2, z, wd * 0.25, st.acc, { mat: "glow", col: false }); }
  void r;
}

// ── 레이더 접시 · 통신 격자탑 ──
export function dish(w, x, z, R, st, ry = 0) {
  const y = floorAt(w, x, z, R * 0.5);
  w.cyl(x, y, z, R * 0.18, R * 0.6, st.wall, { mat: "std:concrete" });
  w.blob(x, y + R * 0.75, z, R, R * 0.28, R, 0xe8ecef, { mat: "paint", rx: 0, ry });
  w.cyl(x, y + R * 0.8, z, 0.15, R * 0.6, 0x9aa0a8, { col: false });
}
export function lattice(w, x, z, h, col = 0xc8ccd0, lite = 0xff3a2a) {
  const y = floorAt(w, x, z, 3), n = Math.max(3, Math.round(h / 12));
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) w.pipe(x + a * 3, y, z + b * 3, x + a * 0.5, y + h, z + b * 0.5, 0.25, col, { col: false });
  for (let k = 1; k < n; k++) { const t = k / n, s = 3 - 2.5 * t; w.box(x, y + h * t, z, s * 2, 0.3, s * 2, col, { col: false }); }
  w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 2.4);
  w.sph(x, y + h + 0.6, z, 0.7, lite, { mat: "glow", col: false });
}

// ── 들판 · 숲 · 마을 · 풍차 · 송전탑 ──
export function forest(w, x, z, R, n, kind = "round", test) {
  const r = w.rand;
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (test && !test(px, pz)) continue; w.tree(px, pz, 0.8 + r() * 0.7, kind); }
}
export function village(w, x, z, n, st, test, kind = "house") {   // 마을: 골목 하나를 따라 양쪽에 집 (평평한 곳만)
  const r = w.rand, a = r() * Math.PI, dx = Math.cos(a), dz = Math.sin(a), L = 16 + n * 7, ry = Math.atan2(-dz, dx) / D;
  const y0 = w.h(x, z); if (y0 < 2 || Math.abs(w.h(x + dx * L / 2, z + dz * L / 2) - w.h(x - dx * L / 2, z - dz * L / 2)) > 4) return;
  w.box(x, y0 - 0.15, z, L + 8, 0.35, 5, 0x7a7466, { ry, col: false, mat: "std:dirt", tile: 4 });
  for (let i = 0; i < n; i++) {
    const t = -L / 2 + 8 + (i >> 1) * 14 + r() * 3, sd = i % 2 ? 1 : -1, px = x + dx * t - dz * sd * 9, pz = z + dz * t + dx * sd * 9;
    if (test && !test(px, pz)) continue;
    tower(w, px, pz, 7 + r() * 3, 8 + r() * 3, 4 + r() * 2.5, st, kind, ry + (sd > 0 ? 0 : 180));
    if (r() < 0.4) w.tree(px - dz * sd * 7, pz + dx * sd * 7, 0.7, "round");
  }
}
export function turbine(w, x, z, h = 46, ry = 0) {
  const y = floorAt(w, x, z, 2);
  w.cyl(x, y, z, 1.6, h, 0xeeeeea, { rt: 0.9, mat: "paint" });
  const F = frame(w, x, z, ry);
  F.box(0, y + h, 0.6, 2.2, 2.4, 5, 0xeeeeea, { col: false });
  for (let k = 0; k < 3; k++) { const a = k * 120 + 15; F.box(0, y + h + 1.2 + Math.cos(a * D) * 10, -2.2 + 0, 1.2, 20, 0.3, 0xf4f4f0, { rz: a, col: false }); void a; }
}
export function pylonLine(w, ax, az, bx, bz, step = 110) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / step);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / Math.max(1, n), x = ax + (bx - ax) * t + (bz - az) / L * 18, z = az + (bz - az) * t - (bx - ax) / L * 18, y = w.h(x, z);
    if (y < 1) { prev = null; continue; }
    for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) w.pipe(x + a, y, z + b, x + a * 0.3, y + 26, z + b * 0.3, 0.18, 0x8a8e94, { col: false });
    w.box(x, y + 22, z, 14, 0.5, 0.8, 0x8a8e94, { ry: Math.atan2(-(bz - az), bx - ax) / D + 90, col: false });
    if (prev) w.pipe(prev[0], prev[1] + 21.5, prev[2], x, y + 21.5, z, 0.06, 0x2a2a2a, { col: false });
    prev = [x, y, z];
  }
}
// 밭: 얇은 색판 (평평한 곳만)
export function fields(w, x, z, R, n, cols = [0xb8a84a, 0x8aa84a, 0x6a8a3a, 0xc8b060]) {
  const r = w.rand;
  for (let i = 0; i < n; i++) {
    const px = x + (r() - 0.5) * R * 2, pz = z + (r() - 0.5) * R * 2, a = w.h(px - 20, pz - 14), b = w.h(px + 20, pz + 14);
    if (Math.abs(a - b) > 1.5 || Math.min(a, b) < 1.5) continue;
    w.box(px, (a + b) / 2 - 0.1, pz, 36 + r() * 16, 0.35, 24 + r() * 10, cols[(r() * cols.length) | 0], { col: false, mat: "std:grass", tile: 6, ry: (r() - 0.5) * 12 });
  }
}

// ── 전선 장비 ── 철조망 말뚝 · 대전차 장애물 · 벙커 · 부서진 전차
export function tankTrap(w, x, z) { const y = w.h(x, z); for (const a of [0, 60, 120]) w.box(x, y, z, 0.5, 0.5, 4, 0x4a4a48, { rx: 35, ry: a, col: a === 0 }); }
export function bunker(w, x, z, ry, st) {
  const F = frame(w, x, z, ry), y = F.H(0, 0) - 1.2;
  F.box(0, y, 0, 12, 4.4, 9, st.wall, { mat: "std:concrete", tile: 4 });
  F.box(0, y + 2.4, -4.6, 7, 0.9, 0.4, 0x111111, { col: false });
  F.box(0, y + 4.4, 0, 13, 0.8, 10, st.dark, { col: false });
}
export function wreck(w, x, z, ry) {
  const F = frame(w, x, z, ry), y = F.H(0, 0);
  F.box(0, y, 0, 3.6, 1.6, 7, 0x3a3630, { mat: "std:panel", rz: 6 });
  F.box(0.4, y + 1.6, -0.6, 2.6, 1.1, 3, 0x2e2a26, { ry: 25, col: false });
  F.box(0.4, y + 2.1, 1.6, 0.3, 0.3, 4, 0x2a2622, { ry: 25, rx: 8, col: false });
}
// 긴 방벽 (점들을 따라)
export function longWall(w, pts, st, o = {}) {
  const H = o.h || 18, T = o.thick || 6, every = o.towerEvery || 120;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 40), ry = Math.atan2(-(bz - az), bx - ax) / D;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const y = Math.min(w.h(x0, z0), w.h(x1, z1), w.h(mx, mz));
      if (y < 0.5) continue;
      w.box(mx, y - 8, mz, L / n + 0.8, H + 8, T, st.wall, { ry, mat: o.mat || "std:panel", tile: 5 });
      w.box(mx, y + H, mz, L / n, 0.6, T + 0.6, st.acc, { ry, mat: "glow", col: false });
      acc += L / n;
      if (acc >= every) { acc = 0; w.box(mx, y - 8, mz, T * 2.2, H + 24, T * 2.2, st.dark, { ry, mat: "std:panel", tile: 4 }); w.box(mx, y + H + 16, mz, T * 2.4, 1.2, T * 2.4, st.acc, { ry, mat: "glow", col: false }); w.box(mx, y + H + 17.2, mz, 1.6, 1.6, 7, 0x2a2c30, { ry: ry + 90, col: false }); }
    }
  }
}

// ── 도로: 지형을 따라 깔리는 아스팔트 띠 + 중앙선 + 가로등, 강·골짜기 위는 다리 ──
export function road(w, ax, az, bx, bz, o = {}) {
  const L = Math.hypot(bx - ax, bz - az); if (L < 20) return;
  const W = o.w || 10, step = 14, n = Math.ceil(L / step), ry = Math.atan2(-(bz - az), bx - ax) / D, dx = (bx - ax) / L, dz = (bz - az) / L;
  const col = o.col || 0x34363c, lamp = o.lamp, rail = o.rail ?? 0x9aa0a8;
  const pts = []; for (let k = 0; k <= n; k++) { const t = (k / n) * L; pts.push([ax + dx * t, az + dz * t, w.h(ax + dx * t, az + dz * t)]); }
  // 다리: 지면이 물 근처(1.5m 아래)거나 이웃보다 크게 꺼지면 양쪽 둑 높이로 덮는다
  const deck = pts.map((p) => p[2]);
  for (let k = 0; k <= n; k++) if (pts[k][2] < 1.5) {
    let a = k; while (a > 0 && pts[a][2] < 1.5) a--; let b = k; while (b < n && pts[b][2] < 1.5) b++;
    const top = Math.max(pts[a][2], pts[b][2], 4) + 2;
    for (let q = a; q <= b; q++) deck[q] = top;
    k = b;
  }
  for (let k = 0; k < n; k++) {
    if (o.skip && o.skip(pts[k][0], pts[k][1])) continue;
    const [x0, z0] = pts[k], [x1, z1] = pts[k + 1], y0 = deck[k], y1 = deck[k + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, my = (y0 + y1) / 2, seg = Math.hypot(x1 - x0, z1 - z0, y1 - y0);
    const pitch = Math.atan2(y1 - y0, step) / D, bridge = deck[k] > pts[k][2] + 1.5 || deck[k + 1] > pts[k + 1][2] + 1.5;
    w.box(mx, my - 0.35, mz, seg + 0.6, bridge ? 1.4 : 0.55, W, col, { ry, rz: pitch, col: bridge, mat: "std:asphalt", tile: 8 });
    if (k % 2 === 0) w.box(mx, my + 0.21, mz, 5, 0.04, 0.4, 0xf2f0e6, { ry, rz: pitch, col: false });
    if (bridge) {
      for (const s2 of [-1, 1]) w.box(mx - dz * s2 * (W / 2 - 0.2), my + 0.2, mz + dx * s2 * (W / 2 - 0.2), seg, 1.1, 0.3, rail, { ry, rz: pitch, col: false, mat: "paint" });
      if (k % 3 === 0) { const gy = Math.min(pts[k][2], 0) - 2; w.box(mx, gy, mz, 2.2, my - 0.8 - gy, W * 0.7, 0x8a8a84, { ry, mat: "std:concrete" }); }
    } else if (lamp && k % 5 === 2) w.lamp(mx - dz * (W / 2 + 1.2), mz + dx * (W / 2 + 1.2), 8, lamp, ry - 90);
  }
}
// 길가 주택가: 도로 양쪽에 집과 마당 (도시 바깥 → 교외)
export function roadside(w, ax, az, bx, bz, st, o = {}) {
  const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, r = w.rand, ry = Math.atan2(-(bz - az), bx - ax) / D;
  for (let t = o.t0 || 0; t < (o.t1 ?? L); t += o.gap || 26) for (const s2 of [-1, 1]) {
    if (r() < (o.empty ?? 0.25)) continue;
    const off = 16 + r() * 6, x = ax + dx * t - dz * s2 * off, z = az + dz * t + dx * s2 * off, y = w.h(x, z);
    if (y < 2 || Math.abs(w.h(x + 6, z) - w.h(x - 6, z)) > 2.5 || (o.skip && o.skip(x, z))) continue;
    tower(w, x, z, 8 + r() * 3, 9 + r() * 3, 4 + r() * 3.5, st, "house", ry + (s2 > 0 ? 0 : 180));
    w.box(x - dz * s2 * 7, y - 0.1, z + dx * s2 * 7, 10, 0.25, 9, 0x6a9a4a, { ry, col: false, mat: "std:grass", tile: 4 });
    if (r() < 0.5) w.tree(x - dz * s2 * 10 + dx * 4, z + dx * s2 * 10 + dz * 4, 0.7, "round");
  }
}

// ── 먼 나무: 평면 그림(빌보드) ── 가까이(near 안)는 진짜 나무가, 멀리는 그림 한 장짜리 점이 그린다
function treeSprite(kind, snow) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const g = cv.getContext("2d");
  g.fillStyle = "#4a3524"; g.fillRect(29, 44, 6, 18);
  if (kind === 1) {   // 침엽수: 층층 삼각형
    for (let k = 0; k < 4; k++) { const y = 8 + k * 11, w2 = 9 + k * 6; g.fillStyle = snow ? (k % 2 ? "#dfe8ef" : "#5d7a66") : k % 2 ? "#2f5e3a" : "#3c7046"; g.beginPath(); g.moveTo(32, y - 6); g.lineTo(32 + w2, y + 12); g.lineTo(32 - w2, y + 12); g.closePath(); g.fill(); }
  } else {            // 활엽수: 둥근 수관 + 밝은 면
    const gr = g.createRadialGradient(26, 18, 4, 32, 26, 26); gr.addColorStop(0, "#8fc25a"); gr.addColorStop(0.6, "#4f8a36"); gr.addColorStop(1, "#2f5e24");
    g.fillStyle = gr; g.beginPath(); g.arc(32, 26, 22, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function treeImpostors(w, list, o = {}) {
  const near = o.near || 700;
  for (const kind of [0, 1]) {
    const pts = []; for (let i = 0; i < list.length; i += 5) if (list[i + 4] === kind) pts.push(list[i], list[i + 1] + 5.5 * list[i + 3], list[i + 2]);
    if (!pts.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const tex = treeSprite(kind, o.snow), mat = new THREE.PointsMaterial({ map: tex, size: 13, sizeAttenuation: true, alphaTest: 0.5, transparent: false, fog: true });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uNear = { value: near };
      sh.vertexShader = "varying float vDist;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvDist = -mvPosition.z;");
      sh.fragmentShader = "uniform float uNear; varying float vDist;\n" + sh.fragmentShader.replace("void main() {", "void main() {\n  if (vDist < uNear) discard;");
    };
    const p = new THREE.Points(g, mat); p.frustumCulled = false; p.userData.lod = false;
    w.scene.add(p); w.disposables.push(g, mat, tex);
  }
}
