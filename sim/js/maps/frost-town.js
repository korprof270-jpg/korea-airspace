// 백설 시: 포격을 맞은 설원의 도시. 통신탑과 그 아래 학교, 난방소 굴뚝, 길을 걸친 뚫린 건물, 대피소 돔, 무너진 구역
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, V3, frame, lattice, dome, ball, Rig, G, icicles, drift, snowRoof, plume, DEG,
  SNOW, SNOW_SH, ICE, CONC, CONC2, STEEL, DARK, INK, HULL, HULL2, OLIVE, ORG, RED, AMB, WARM, CYA, FIRE, BRICK, RUST,
  TOWN, TTOWER, SCHOOL, PLAZA, STACKS, SHELTERS,
} from "./frost-kit.js";

const WALLS = [0x8f98a6, 0xa39a8e, 0x7f8a94, 0x9a8f86, 0x868c9c];
// 건물 터 [x, z, 폭(x), 깊이(z), 높이, 종류] — 0: 불 켜진 집, 1: 불 꺼진 집, 2: 포격 맞은 폐허
const LOTS = [
  [120, 60, 14, 16, 18, 0], [135, 58, 12, 12, 12, 2], [127, 79, 28, 12, 15, 0],
  [166, 61, 14, 18, 22, 0], [185, 58, 14, 12, 14, 2], [177, 80, 30, 12, 17, 1],
  [230, 66, 12, 12, 20, 2], [227, 80, 18, 12, 12, 0],
  [118, 108, 12, 10, 10, 2], [137, 137, 10, 10, 8, 2], [116, 139, 10, 8, 9, 1],
  [165, -17, 14, 8, 11, 0], [188, -17, 12, 8, 14, 2],
];

// 멀쩡한 건물: 창이 난 몸통, 눈 얹힌 옥상, 옥상 설비, 북쪽 처마 고드름
function house(w, x, z, sx, sz, h, lit, color) {
  const r = w.rand;
  w.box(x, -0.5, z, sx, h + 0.5, sz, color, { mat: lit ? "lit:facadelit" : "std:facade", tile: 24, ao: false });
  w.box(x, -0.5, z, sx + 0.5, 3.6, sz + 0.5, 0x4a4f5a, { mat: "std:concrete", tile: 6, col: false });
  w.box(x, h, z, sx + 0.6, 0.7, sz + 0.6, 0x4c525e, { col: false });
  snowRoof(w, x, h + 0.7, z, sx, sz, 0, 0.45);
  for (let i = 0; i < 2; i++) { const bx = 1.6 + r() * 2.4, bz = 1.6 + r() * 2.4, px = x + (r() - 0.5) * (sx - bx - 2), pz = z + (r() - 0.5) * (sz - bz - 2), bh = 1.2 + r() * 1.4; w.box(px, h + 0.7, pz, bx, bh, bz, 0x5f6672, { mat: "std:panel", tile: 3 }); w.box(px, h + 0.7 + bh, pz, bx + 0.3, 0.35, bz + 0.3, SNOW, { col: false, ao: false }); }
  icicles(w, [x - sx / 2, h, z - sz / 2 - 0.3], [x + sx / 2, h, z - sz / 2 - 0.3], Math.round(sx / 1.6), 1.6);
  if (lit) w.pool(x, 0.3, z + sz / 2 + 3, Math.min(9, sx * 0.5), WARM, 0.22);
}

// 폐허: 아래층만 남은 몸통, 들쭉날쭉 남은 벽, 드러난 바닥판과 철근, 잔해 더미. burn: 안에서 불이 탄다
function ruin(w, x, z, sx, sz, h, color, burn) {
  const r = w.rand, h0 = h * (0.42 + r() * 0.16);
  w.box(x, -0.5, z, sx, h0 + 0.5, sz, color, { mat: "std:facade", tile: 24, ao: false });
  w.box(x, -0.5, z, sx + 0.5, 3.4, sz + 0.5, 0x444852, { mat: "std:concrete", tile: 6, col: false });
  // 남은 벽 조각: 둘레를 따라 높이가 제각각
  const seg = (px, pz, lx, lz) => { const hh = (h - h0) * (0.15 + r() * 0.95); if (hh > 1) w.box(px, h0, pz, lx, hh, lz, r() < 0.5 ? color : BRICK, { mat: "std:brick", tile: 3 }); return hh; };
  const nx = Math.max(2, Math.round(sx / 4.5)), nz = Math.max(2, Math.round(sz / 4.5));
  for (let i = 0; i < nx; i++) { const px = x - sx / 2 + (i + 0.5) * (sx / nx); seg(px, z - sz / 2 + 0.35, sx / nx - 0.2, 0.7); if (r() < 0.6) seg(px, z + sz / 2 - 0.35, sx / nx - 0.2, 0.7); }
  for (let i = 0; i < nz; i++) { const pz = z - sz / 2 + (i + 0.5) * (sz / nz); seg(x - sx / 2 + 0.35, pz, 0.7, sz / nz - 0.2); if (r() < 0.5) seg(x + sx / 2 - 0.35, pz, 0.7, sz / nz - 0.2); }
  // 기운 바닥판, 삐져나온 철근, 그을음
  w.box(x + (r() - 0.5) * 2, h0 + 0.2, z + (r() - 0.5) * 2, sx * 0.7, 0.4, sz * 0.6, 0x5a5e68, { rz: (r() - 0.5) * 26, rx: (r() - 0.5) * 16, col: false });
  for (let i = 0; i < 4; i++) { const px = x + (r() - 0.5) * sx * 0.8, pz = z + (r() - 0.5) * sz * 0.8; beam(w, [px, h0, pz], [px + (r() - 0.5) * 3, h0 + 2 + r() * 3.5, pz + (r() - 0.5) * 3], 0.14, RUST, { col: false }); }
  w.box(x, h0 * 0.55, z + sz / 2 + 0.04, sx * 0.34, h0 * 0.4, 0.1, INK, { col: false, ao: false });
  // 잔해 더미(한쪽 길가로 쏟아졌다)와 그 위에 쌓인 눈
  const side = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < 5; i++) {
    const px = x + side * (sx / 2 + 0.5 + r() * 2.4), pz = z + (r() - 0.5) * sz * 0.8, s = 1.2 + r() * 1.6;
    w.mesh(G.ico0(), M(px, s * 0.3, pz, s * 1.3, s * 0.7, s * 1.1, r() * 30, r() * 360, r() * 30), i % 2 ? 0x5a5e68 : BRICK, "std");
    if (i % 2) drift(w, px, s * 0.8, pz, s, s * 0.3, s * 0.9);
  }
  w.col.addBox(V3(x + side * (sx / 2 + 1.6), 0.8, z), V3(1.8, 1, sz * 0.4));
  drift(w, x - sx * 0.2, h0 + 0.5, z, sx * 0.3, 0.6, sz * 0.3);
  if (burn) {
    w.box(x + sx * 0.1, h0 + 0.3, z, sx * 0.4, 1.4, sz * 0.4, FIRE, { mat: "glow", col: false });
    w.pool(x + side * (sx / 2 + 4), 0.3, z, 11, FIRE, 0.5);
    plume(w, x + sx * 0.1, h0 + 2, z, 2.2, 52, 5, 0x5a5c68);
  }
}

export function town(w, K, S) {
  const r = w.rand, T = TOWN;
  // ── 길: 눈을 밀어낸 검은 포장과 길가 눈 둑 ──
  const street = (x, z, sx, sz) => w.box(x, -0.5, z, sx, 0.74, sz, 0x4b515b, { mat: "std:asphalt", tile: 7, ao: false, col: false });
  street((T.x0 + T.x1) / 2 + 2, T.main, T.x1 - T.x0 + 8, 12); street(T.east, 62, 11, 190); street(T.mid, 92, 8, 118); street((T.x0 + T.x1) / 2, T.south, T.x1 - T.x0 - 6, 8);
  for (let x = T.x0; x < T.x1; x += 7) for (const s of [-1, 1]) if (Math.abs(x - T.east) > 9 && Math.abs(x - T.mid) > 7 && r() < 0.8) w.mesh(G.ico(), M(x + r() * 4, 0.2, T.main + s * (7.8 + r()), 3.4 + r() * 3, 0.5 + r() * 0.7, 1.2 + r(), 0, (r() - 0.5) * 16, 0), r() < 0.5 ? SNOW : SNOW_SH, "std");
  for (let i = 0; i < 22; i++) w.box(T.x0 + r() * (T.x1 - T.x0), 0.24, T.main + (r() - 0.5) * 10, 4 + r() * 9, 0.03, 0.5 + r() * 1.4, SNOW, { ry: 14 + r() * 10, col: false, ao: false });
  // 가로등(큰길·동쪽 길): 몇 개는 꺼지고 기울었다
  for (let x = T.x0 + 6; x < T.x1; x += 22) for (const s of [-1, 1]) if (Math.abs(x - T.east) > 12 && Math.abs(x - T.mid) > 9) {
    if (r() < 0.25) { beam(w, [x, 0, T.main + s * 9.6], [x + 2.4, 6.2, T.main + s * 9.6 + 0.8], 0.2, DARK, { col: false }); continue; }
    w.lamp(x, T.main + s * 9.6, 7.5, WARM, s > 0 ? 180 : 0, 2);
  }
  for (let z = 60; z < 150; z += 24) w.lamp(T.east + 8.6, z, 7.5, WARM, 270, 2);

  // ── 건물 ──
  LOTS.forEach(([x, z, sx, sz, h, kind], i) => {
    const color = WALLS[i % WALLS.length];
    if (kind === 2) ruin(w, x, z, sx, sz, h, color, i % 3 === 0); else house(w, x, z, sx, sz, h, kind === 0, color);
  });

  // ── 통신탑과 학교 ──
  {
    const [x, z] = TTOWER;
    lattice(w, x, -0.4, z, 4.5, 48, 6, 0xc8ced6, { t: 0.55, open: "x", color2: RED });
    w.box(x, 47.6, z, 11, 0.6, 11, DARK, { mat: "paint" }); w.box(x, 48.2, z, 11.3, 0.3, 11.3, SNOW, { col: false, ao: false });
    for (let i = 0; i < 4; i++) { const a = i * 90 + 45, px = x + Math.sin(a * DEG) * 6.4, pz = z + Math.cos(a * DEG) * 6.4; w.mesh(G.cyl, M(px, 44.5, pz, 1.6, 0.7, 1.6, 90, a, 0), 0xe6ebf1, "paint"); }
    w.pipe(x, 48.2, z, x, 60, z, 0.3, HULL2, {});
    for (const hh of [24, 36, 48.6]) for (const [sx, sz] of [[-1, -1], [1, 1]]) K.blink.add(x + sx * 4.8, hh, z + sz * 4.8, RED, 0.4, hh > 30 ? 1 : 0);
    K.blink.add(x, 60.6, z, RED, 0.5, 0);
    for (const k of [-1, 1]) { icicles(w, [x - 5.5, 47.6, z + k * 5.5], [x + 5.5, 47.6, z + k * 5.5], 8, 2.6); icicles(w, [x - 4.5, 7.6, z + k * 4.5], [x + 4.5, 7.6, z + k * 4.5], 6, 1.6); }
    w.gap("통신탑 밑", x, 3.7, z, 90, 6.6, 6, 600);
    w.box(x + 9, -0.4, z - 1, 5, 3, 4, 0x56606e, { mat: "std:panel", tile: 3 }); snowRoof(w, x + 9, 2.6, z - 1, 5, 4);
  }
  {
    const [x, z] = SCHOOL, sx = 30, sz = 12, h = 9;
    w.box(x, -0.5, z, sx, h + 0.5, sz, 0xb9a88e, { mat: "lit:facadelit", tile: 24, ao: false });
    w.box(x, -0.5, z, sx + 0.5, 1.6, sz + 0.5, 0x6a5a4a, { mat: "std:brick", tile: 3, col: false });
    w.box(x, h, z, sx + 0.8, 0.5, sz + 0.8, 0x5a4a40, { col: false });
    w.box(x, h + 0.5, z, sx + 0.4, 0.3, sz + 0.4, SNOW_SH, { col: false, ao: false });
    // 지붕에 페인트로 쓴 글씨 (눈을 쓸어 내고 썼다)
    S.add("cold", x, h + 0.84, z, 25, { pitch: -90, height: 8.4 });
    w.box(x - 8, -0.3, z + sz / 2 + 1.4, 6, 3.4, 2.8, 0x8a7a66, { mat: "std:brick", tile: 3 }); snowRoof(w, x - 8, 3.1, z + sz / 2 + 1.4, 6, 2.8);
    S.add("school", x - 8, 4.2, z + sz / 2 + 2.86, 5.4, { height: 1.1 });
    icicles(w, [x - sx / 2, h, z + sz / 2 + 0.4], [x + sx / 2, h, z + sz / 2 + 0.4], 18, 1.4);
    // 운동장: 눈 덮인 미끄럼틀과 골대, 깃대
    const F = frame(w, x + 6, z + sz / 2 + 7, 0, 0);
    F.beam(-1.2, 0, 0, -1.2, 2.6, 0, 0.14, 0x3a7bd0, { col: false }); F.beam(-1.2, 2.6, 0, 2.4, 0.2, 0, 0.5, 0xd9432f, { col: false, tw: 0.9 }); F.box(-1.2, 2.6, 0, 1.2, 0.3, 1, SNOW, { col: false, ao: false });
    for (const u of [5, 8.6]) F.beam(u, 0, 1, u, 2.2, 1, 0.12, 0xe8edf2, { col: false }); F.beam(5, 2.2, 1, 8.6, 2.2, 1, 0.12, 0xe8edf2, { col: false });
    w.pipe(x + 12, 0, z + sz / 2 + 2.5, x + 12, 9, z + sz / 2 + 2.5, 0.09, 0xd8dde4, { col: false }); w.box(x + 13, 7.6, z + sz / 2 + 2.5, 1.9, 1.2, 0.06, 0xe8edf2, { col: false, ao: false });
  }

  // ── 광장: 얼어붙은 분수와 대피 안내 탑 ──
  {
    const [x, z] = PLAZA;
    w.box(x, -0.5, z + 1, 34, 0.72, 30, 0x7a808a, { mat: "std:concrete", tile: 6, ao: false, col: false });
    const fx = x + 13, fz = z - 9;
    w.cyl(fx, -0.2, fz, 4.2, 1, CONC, { mat: "std:concrete", tile: 3 }); w.cyl(fx, 0.8, fz, 3.8, 0.12, ICE, { mat: "paint", col: false, ao: false });
    w.cyl(fx, 0.8, fz, 0.6, 2.6, CONC2, {}); w.mesh(G.spike(), M(fx, 3.2, fz, 1.5, 2.4, 1.5, 180, 0, 0), ICE, "paint"); w.mesh(G.spike(), M(fx, 3.4, fz, 0.7, 2.6, 0.7), ICE, "paint");
    S.add("evac", x - 14, 3.2, z + 15.2, 5, { height: 2.2 }); w.box(x - 14, 0, z + 15, 0.3, 4.4, 0.3, DARK, { col: false }); w.box(x - 14, 2, z + 15.05, 5.3, 2.5, 0.16, DARK, { col: false });
  }

  // ── 난방소: 굴뚝 둘 사이로 지날 수 있다 ──
  {
    const cx = (STACKS[0][0] + STACKS[1][0]) / 2;
    w.box(cx, -0.5, 9, 20, 13.5, 14, 0x7a6a5e, { mat: "std:brick", tile: 4 }); snowRoof(w, cx, 13, 9, 20, 14);
    for (const u of [-6, 0, 6]) w.box(cx + u, 3, 16.04, 3, 6, 0.1, WARM, { mat: "glow", col: false });
    w.pool(cx, 0.3, 21, 12, WARM, 0.3);
    icicles(w, [cx - 10, 13, 16.3], [cx + 10, 13, 16.3], 14, 2);
    STACKS.forEach(([x, z], i) => {
      for (let k = 0; k < 6; k++) w.cyl(x, -0.5 + k * 7.8, z, 2.5 - k * 0.14, 7.8, k % 2 ? 0xd9dde2 : 0xb04a3a, { rt: 2.5 - (k + 1) * 0.14, mat: "paint", col: false, ao: false });
      w.col.addCapsule(V3(x, 2, z), V3(x, 44, z), 2.5);
      w.cyl(x, 46.3, z, 1.9, 0.5, DARK, { col: false }); K.blink.add(x, 47.4, z, RED, 0.45, i);
      w.pipe(x, 5, z, x, 5, 3, 1, STEEL, { col: false });
      plume(w, x, 48, z, 3.2, 70, 5, i ? 0x9aa2ae : 0x8a929e);
    });
    w.gap("난방소 굴뚝 사이", cx, 26, STACKS[0][1], 0, 8.6, 34, 450);
  }

  // ── 길을 걸친 뚫린 건물: 포탄이 뚫고 나간 자리로 가운데 길이 지난다 ──
  {
    const x = T.mid, z = 70, F = frame(w, x, z, 0, -0.5);
    for (const s of [-1, 1]) { F.box(s * 5.5, 0, 0, 3, 16, 10, 0x8a8f9c, { mat: "std:facade", tile: 24, ao: false }); for (let i = 0; i < 3; i++) w.mesh(G.ico0(), M(x + s * (3.4 - r()), 7.6 + r() * 1.6, z - 4 + i * 4, 1.1, 1.3, 1.5, r() * 40, r() * 360, 0), BRICK, "std"); }
    F.box(0, 9.2, 0, 8, 6.8, 10, 0x8a8f9c, { mat: "std:facade", tile: 24, ao: false });
    F.box(0, 16, 0, 14.6, 0.6, 10.6, 0x4c525e, { col: false }); snowRoof(w, x, 16.1, z, 14, 10);
    for (const k of [-1, 1]) { icicles(w, [x - 4, 8.7, z + k * 5], [x + 4, 8.7, z + k * 5], 7, 1.6); for (let i = 0; i < 3; i++) beam(w, [x - 3 + i * 3, 8.7, z + k * 4.6], [x - 3.6 + i * 3 + r(), 6.6 + r(), z + k * 5.4], 0.12, RUST, { col: false }); }
    w.gap("뚫린 건물", x, 4.2, z, 0, 6.6, 7, 500);
  }

  // ── 대피소 돔 넷과 천막, 가운데 보급 착륙장 ──
  SHELTERS.forEach(([x, z], i) => {
    const R = 9;
    w.cyl(x, -0.5, z, R + 0.6, 1.3, CONC2, { mat: "std:concrete", tile: 4, col: false });
    dome(w, x, 0.6, z, R, i % 2 ? 0xdfe5ec : 0xcdd6c8, { sy: 0.78 });
    w.mesh(G.hemi(), M(x, 0.9, z, R * 0.86, R * 0.74, R * 0.86), SNOW, "std");
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; beam(w, [x + Math.cos(a) * R, 0.8, z + Math.sin(a) * R], [x + Math.cos(a) * R * 0.5, 0.6 + R * 0.68, z + Math.sin(a) * R * 0.5], 0.3, STEEL, { col: false }); w.box(x + Math.cos(a + 0.39) * (R + 0.1), 1.2, z + Math.sin(a + 0.39) * (R + 0.1), 0.3, 0.3, 0.3, ORG, { mat: "glow", col: false }); }
    // 출입 통로: 가운데 착륙장 쪽으로
    const d = Math.atan2(127 - z, 177.5 - x), F = frame(w, x + Math.cos(d) * (R + 1.5), z + Math.sin(d) * (R + 1.5), -d / DEG, -0.4);
    F.box(0, 0, 0, 5, 3.4, 3.6, OLIVE, { mat: "paint" }); F.box(0, 3.4, 0, 5.2, 0.35, 3.8, SNOW, { col: false, ao: false }); F.box(2.52, 0.6, 0, 0.1, 2.4, 2, WARM, { mat: "glow", col: false });
    w.pool(F.X(5, 0), 0.3, F.Z(5, 0), 6, WARM, 0.35);
    S.add(`S${i + 1}`, F.X(2.58, 0), 3.9, F.Z(2.58, 0), 3, { ry: -d / DEG + 90, height: 0.9 });
    w.pipe(x, R * 0.78, z, x, R * 0.78 + 4, z, 0.1, HULL2, { col: false }); K.blink.add(x, R * 0.78 + 4.6, z, i % 2 ? AMB : RED, 0.3, i);
  });
  // 천막(구호소)과 난로 연기
  for (const [x, z, ry] of [[177.5, 108, 0], [177.5, 147, 0], [162, 127, 90], [193, 127, 90]]) {
    const F = frame(w, x, z, ry, -0.2);
    F.box(0, 0, 0, 6, 1.6, 4, 0x77806a, { mat: "paint" });
    w.mesh(G.cyl6, M(x, 1.7, z, 1.7, 6.2, 2.3, 0, ry, 90), 0x8a9478, "paint"); w.mesh(G.cyl6, M(x, 2.2, z, 1.35, 5.6, 1.9, 0, ry, 90), SNOW, "std");
    w.col.addBox(V3(x, 2.4, z), V3(ry ? 2 : 3, 1.2, ry ? 3 : 2));
    F.box(3.02, 0.2, 0, 0.08, 1.2, 1.2, WARM, { mat: "glow", col: false });
  }
  // 구호 물자와 적십자 깃발
  w.box(177.5, 0, 127, 0.2, 0.2, 0.2, RED, { mat: "glow", col: false });
  for (const [x, z] of [[170, 121], [185, 133], [171, 134]]) { w.box(x, -0.1, z, 1.8, 1.3, 1.8, 0xd9dde2, { ry: r() * 40, mat: "paint" }); w.box(x, 1.2, z, 0.9, 0.02, 0.28, RED, { col: false, ao: false }); w.box(x, 1.2, z, 0.28, 0.02, 0.9, RED, { col: false, ao: false }); }

  // ── 창고(남동): 눈 얹힌 박공지붕 ──
  {
    const x = 227, z = 121, F = frame(w, x, z, 0, -0.5);
    F.box(0, 0, 0, 20, 8, 30, 0x6f7a86, { mat: "std:corrug", tile: 3 });
    for (const s of [-1, 1]) { F.box(s * 5.2, 8.4, 0, 11.4, 0.6, 31, 0x56606e, { rz: s * -20, mat: "std:corrug", tile: 3, ao: false }); F.box(s * 5.2, 9, 0, 10.6, 0.4, 30.4, SNOW, { rz: s * -20, col: false, ao: false }); }
    F.box(-10.06, 0.4, 4, 0.12, 5.6, 7, STEEL, { mat: "std:corrug", tile: 2, col: false }); F.box(-10.1, 6.6, 4, 0.1, 0.5, 2, AMB, { mat: "glow", col: false });
    S.add("depot", x - 10.14, 6.9, z - 8, 8, { ry: 270, height: 1.4 });
    for (let i = 0; i < 5; i++) w.box(x - 13.5 - r() * 3, -0.1, z - 10 + i * 4.4, 2 + r(), 1.4 + r() * 1.2, 2 + r(), i % 2 ? 0x7a6a4a : 0x5c6a54, { ry: r() * 30, mat: i % 2 ? "std:wood" : "paint", tile: 2 });
  }

  // ── 길 위의 흔적: 눈 덮인 버려진 차, 바리케이드 ──
  for (const [x, z, ry, c] of [[118, 34, 4, 0x8a3a30], [232, 42, 176, 0x3a5a8a], [201, 78, 92, 0x6a6e76], [147, 112, 84, 0x7a8a5a], [209, 128, 268, 0x8a8a8a], [222, 98, 12, 0x3a3a44]]) {
    const F = frame(w, x, z, ry, 0.2);
    F.box(0, 0.25, 0, 4.4, 1, 1.9, c, { mat: "paint" }); F.box(-0.2, 1.25, 0, 2.4, 0.8, 1.7, 0x2a3440, { mat: "paint", col: false }); F.box(-0.2, 2.05, 0, 2.6, 0.4, 1.9, SNOW, { col: false, ao: false }); F.box(1.5, 1.25, 0, 1.3, 0.25, 1.9, SNOW, { col: false, ao: false });
    drift(w, x, 0.4, z + 1.4, 2.6, 0.7, 1.2);
  }
  for (const [x, z, ry] of [[110, 44, 80], [110, 32, 100], [243, 38, 90], [198, 152, 0], [150, 154, 0]]) { const F = frame(w, x, z, ry, 0.2); F.box(0, 0, 0, 6, 1.1, 0.9, CONC, { mat: "std:concrete", tile: 2 }); F.box(0, 1.1, 0, 6.1, 0.3, 1, SNOW, { col: false, ao: false }); F.box(0, 0.4, 0.47, 6, 0.3, 0.04, ORG, { mat: "std:hazard", tile: 1, col: false }); }
  void ball; void HULL; void CYA; void Rig; void THREE;
}
