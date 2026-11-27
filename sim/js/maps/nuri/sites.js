// 누리 대륙 거점 27곳의 모습. 각 거점은 자기 대륙 좌표에 지어지므로 어느 구역 맵(창)에 들어와도 같은 자리에 같은 모습
import { SITE, landD, padH, RIVERS, lineDist } from "./geo.js";
import { ST, frame, tower, cityGrid, airfield, port, ship, wallRing, factoryBlock, monolith, dish, lattice, forest, village, aaGun, bunker, wreck, longWall, crane, turbine, jet, floorAt, glowRing } from "./kit.js";

const D = Math.PI / 180;
// 바다 쪽 방향(라디안, 대륙 좌표): 둘레 24곳 중 해안 거리가 가장 작은 쪽
function seaDir(X, Z) { let best = 0, bd = 1e9; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, d = landD(X + Math.cos(a) * 260, Z + Math.sin(a) * 260); if (d < bd) { bd = d; best = a; } } return best; }

// b(w, x, z, s, ctx): x,z 는 로컬 중심, ctx.G(x,z) 로컬→대륙
export const BUILD = {
  // ── 한울 공화국 ──
  hanulsi(w, x, z, s) {   // 연합 수도: 유리탑 중심가 + 의회 돔 + 방사형 대로
    const st = ST.hanul, F = frame(w, x, z, 12), y = F.H(0, 0);
    cityGrid(w, F, 280, st, { kinds: ["glass", "office", "office"], hMax: 140, hMin: 10, skip: (u, v) => Math.hypot(u, v) < 70 || Math.abs(v) < 6 || Math.abs(u) < 6 });
    // 의회: 기단 + 열주 + 돔
    F.box(0, y - 0.5, 0, 70, 3, 50, 0xeae6dc, { mat: "std:concrete" });
    F.box(0, y + 2.5, 0, 56, 16, 36, 0xf2efe6, { mat: "std:concrete" });
    for (let i = -6; i <= 6; i++) F.cyl(i * 4.2, y + 2.5, -19.5, 0.9, 15, 0xf6f4ee, { col: false });
    F.cyl(0, y + 18.5, 0, 14, 6, 0xf2efe6, {}); w.sph(F.X(0, 0), y + 24, F.Z(0, 0), 14, 0xbfe6dc, { mat: "paint" });
    F.cyl(0, y + 37, 0, 0.3, 10, 0xdddddd, { col: false }); F.box(0, y + 44, 0.8, 0.1, 2.6, 4, st.acc, { col: false, mat: "paint" });
    for (const [u, v] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) forest(w, F.X(u, v), F.Z(u, v), 14, 5, "round");
    // 연합 사령부 송신탑
    lattice(w, F.X(110, -120), F.Z(110, -120), 120, 0xd8dce0, st.acc);
  },
  city(w, x, z) {   // 네온 시티: 네온 고층 숲
    const st = ST.hanul, F = frame(w, x, z, -8);
    cityGrid(w, F, 240, st, { kinds: ["neon", "glass", "neon", "office"], hMax: 120, hMin: 12, cell: 32 });
    lattice(w, F.X(0, 0), F.Z(0, 0), 150, 0xe8e8f0, 0xff3ad8);
  },
  airbase(w, x, z) {   // 비행기지: 활주로 둘 + 격납고 + 관제탑
    const st = ST.hanul;
    airfield(w, x, z - 40, 8, st, { len: 460, hangars: 5 });
    airfield(w, x - 30, z + 150, 8, st, { len: 320, hangars: 3, parked: false });
    for (let i = 0; i < 4; i++) aaGun(w, x - 220 + i * 140, z - 200, st);
    dish(w, x + 210, z + 60, 12, st);
  },
  palace(w, x, z) {   // 단풍 고궁: 성곽 + 전각 + 단풍 숲
    const st = { ...ST.hanul, wall: 0xd8ccb8, roof: 0x3a4250 }, F = frame(w, x, z, 0), y = F.H(0, 0);
    wallRing(w, x, z, 120, st, { sides: 4, rot: Math.PI / 4, h: 7, thick: 3, kind: "stone", gates: [1, 3], towerR: 5 });
    const hall = (u, v, W, Dp, H) => {
      F.box(u, y - 0.3, v, W + 6, 2, Dp + 6, 0xc8c0b0, { mat: "std:rock" });
      for (let i = 0; i < 6; i++) F.cyl(u - W / 2 + (i * W) / 5, y + 1.7, v - Dp / 2, 0.5, H, 0x9a3a2a, { col: false });
      F.box(u, y + 1.7, v, W, H, Dp, 0xe8dcc4, { mat: "std:wood" });
      F.box(u, y + 1.7 + H, v - Dp * 0.25, W + 6, 0.6, Dp * 0.62, st.roof, { rx: -22, col: false });
      F.box(u, y + 1.7 + H, v + Dp * 0.25, W + 6, 0.6, Dp * 0.62, st.roof, { rx: 22, col: false });
      F.box(u, y + 1.7 + H + Dp * 0.22, v, W + 4, 1.2, 1.2, st.roof, { col: false });
    };
    hall(0, -20, 40, 18, 9); hall(0, 40, 26, 14, 7); hall(-60, 30, 18, 12, 6); hall(60, 30, 18, 12, 6);
    F.box(0, y - 0.2, -70, 10, 0.3, 50, 0xd8d0c0, { col: false, mat: "std:rock" });
    for (let i = 0; i < 70; i++) { const a = w.rand() * 6.28, d = 130 + w.rand() * 50; w.tree(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.9, "round"); }
    for (let i = 0; i < 40; i++) w.blob(x + Math.cos(i) * (140 + (i % 5) * 9), F.H(0, 0) + 6, z + Math.sin(i) * (140 + (i % 5) * 9), 3.5, 2.6, 3.5, [0xe8562a, 0xf0a02a, 0xd8382a][i % 3], { mat: "foliage", col: false });
  },
  stadium(w, x, z) {   // 드론 리그 스타디움: 타원 관중석 + 지붕 링 + 경기장 게이트
    const st = ST.hanul, y = floorAt(w, x, z, 40);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, ex = Math.cos(a) * 95, ez = Math.sin(a) * 70, ry = -a / D + 90;
      w.box(x + ex, y, z + ez, 16, 18, 14, st.wall, { ry, mat: "std:concrete", tile: 4 });
      w.box(x + ex * 1.04, y + 18, z + ez * 1.04, 16, 2, 24, st.acc, { ry, col: false, mat: "paint" });
      if (i % 5 === 0) { w.cyl(x + ex * 1.12, y, z + ez * 1.12, 0.6, 40, 0xd8dce0, { col: false }); w.box(x + ex * 1.1, y + 40, z + ez * 1.1, 4, 2, 1, 0xffffff, { ry, mat: "glow", col: false }); }
    }
    w.box(x, y + 0.05, z, 150, 0.1, 100, 0x4a8a3a, { col: false, mat: "std:grass", tile: 6 });
    for (let k = -2; k <= 2; k++) w.cyl(x + k * 28, y, z, 0.6, 10 + Math.abs(k) * 4, 0xff6a12, { col: false });
    for (const u of [-150, 150]) tower(w, x + u, z - 20, 26, 22, 14, st, "office");
  },
  // ── 해림 해양국 ──
  factory(w, x, z, s) {   // 석양의 항만: 조선소 + 화물 부두
    const st = ST.haerim, a = seaDir(s.p[0], s.p[1]);
    const F = port(w, x, z, a, st, { piers: 4, pierLen: 150, shipKind: "cargo" });
    // 조선 독 + 골리앗 크레인
    const y = F.H(-170, 20);
    F.box(-170, y - 8, 40, 40, 8.4, 120, 0x6a6a64, { mat: "std:concrete", col: false });
    ship(w, F.X(-170, 40), F.Z(-170, 40), F.ry, 100, st, "war");
    for (const s2 of [-24, 24]) F.box(-170 + s2, y, 40, 3, 50, 3, 0xd8382a, { mat: "paint" });
    F.box(-170, y + 50, 40, 52, 6, 6, 0xd8382a, { mat: "paint" });
    for (let i = 0; i < 6; i++) tower(w, F.X(80 + (i % 3) * 30, -90 - ((i / 3) | 0) * 30), F.Z(80 + (i % 3) * 30, -90 - ((i / 3) | 0) * 30), 18, 18, 10 + w.rand() * 14, st, "office", F.ry);
  },
  haerimport(w, x, z, s) {   // 해림 군항: 연합 함대 모항
    const st = ST.haerim, a = seaDir(s.p[0], s.p[1]);
    const F = port(w, x, z, a, st, { piers: 5, pierLen: 170, gap: 70, shipKind: "war", craneCol: 0x4a7fd0, containers: 10 });
    for (let i = 0; i < 3; i++) ship(w, F.X(-120 + i * 120, 290), F.Z(-120 + i * 120, 290), F.ry + 10, 150, st, "war");
    for (let i = 0; i < 4; i++) aaGun(w, F.X(-180 + i * 120, -90), F.Z(-180 + i * 120, -90), st);
    tower(w, F.X(0, -110), F.Z(0, -110), 40, 26, 28, st, "office", F.ry);
    lattice(w, F.X(30, -110), F.Z(30, -110), 70, 0xe0e4e8, 0x4a7fd0);
  },
  lighthouse(w, x, z, s) {   // 등대곶 요새: 해안 포대 + 등대
    const st = ST.haerim, a = seaDir(s.p[0], s.p[1]), F = frame(w, x, z, -a / D + 90), y = F.H(0, 60);
    F.cyl(0, y, 60, 6, 42, 0xf2f0ea, { rt: 4.4, mat: "paint" });
    for (let k = 0; k < 4; k++) F.cyl(0, y + 6 + k * 9, 60, 6.1 - k * 0.4, 3, 0xd8382a, { col: false, mat: "paint" });
    F.cyl(0, y + 42, 60, 4.6, 5, 0xfff2b0, { mat: "glass", col: false }); F.cyl(0, y + 47, 60, 5, 1.6, 0x2a2a2a, { col: false });
    w.shaft(F.X(0, 60), y + 46, F.Z(0, 60), 1, 30, 46, 0xfff2b0, 0.05);
    wallRing(w, x, z, 110, st, { sides: 6, h: 9, thick: 6, kind: "e1", col: 0xb8b4aa, gates: [3] });
    for (const u of [-70, -25, 25, 70]) { const yy = F.H(u, 70); F.cyl(u, yy, 70, 7, 2.6, 0x7a7a72, { mat: "std:concrete" }); F.box(u, yy + 2.6, 70, 5, 2.4, 6, 0x5a6470, { mat: "std:panel" }); F.box(u, yy + 3.6, 76, 0.8, 0.8, 10, 0x2a2c30, { col: false }); }
    for (let i = 0; i < 3; i++) bunker(w, F.X(-60 + i * 60, -40), F.Z(-60 + i * 60, -40), F.ry, st);
  },
  // ── 북설 연방 ──
  seori(w, x, z) {   // 서리성: 얼음 성곽 도시
    const st = ST.bukseol, F = frame(w, x, z, 0), y = F.H(0, 0);
    wallRing(w, x, z, 240, st, { sides: 14, h: 18, thick: 7, kind: "ice", gates: [0, 7], towerR: 9 });
    wallRing(w, x, z, 80, st, { sides: 8, h: 26, thick: 6, kind: "stone", gates: [2], towerR: 7 });
    cityGrid(w, F, 220, st, { kinds: ["house", "house", "office"], hMax: 22, hMin: 6, cell: 26, road: 8, skip: (u, v) => Math.hypot(u, v) < 95, lamps: false, empty: 0.12 });
    F.box(0, y, 0, 40, 34, 40, 0xd8dce2, { mat: "std:rock" });
    for (const [u, v] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) { F.cyl(u, y, v, 6, 52, 0xd8dce2, { mat: "std:rock" }); F.cone(u, y + 52, v, 7.6, 16, 0x5a7a9a, { col: false }); }
    F.cyl(0, y + 34, 0, 9, 22, 0xe8ecf0, { mat: "std:rock" }); F.cone(0, y + 56, 0, 11, 24, 0x5a7a9a, { col: false });
    w.sph(F.X(0, 0), y + 84, F.Z(0, 0), 2.4, 0x8fd8ff, { mat: "glow", col: false });
  },
  snow(w, x, z) {   // 설국 산장: 샬레 마을 + 곤돌라
    const st = ST.bukseol;
    village(w, x, z, 40, st, null, "house");
    const F = frame(w, x, z, 30), y0 = F.H(0, 0);
    F.box(0, y0 - 0.5, 0, 50, 16, 30, 0x8a6a4a, { mat: "std:wood" }); F.box(0, y0 + 15.5, -8, 54, 0.8, 22, 0x4a5a6a, { rx: -25, col: false }); F.box(0, y0 + 15.5, 8, 54, 0.8, 22, 0x4a5a6a, { rx: 25, col: false });
    let prev = null;
    for (let k = 0; k <= 6; k++) { const v = 60 + k * 60, yy = F.H(0, v); F.box(0, yy, v, 2, 18, 2, 0x7a7e84, { mat: "paint" }); F.box(0, yy + 18, v, 8, 1, 1, 0x7a7e84, { col: false }); if (prev) for (const s2 of [-3.6, 3.6]) w.pipe(F.X(s2, prev[0]), prev[1] + 17.5, F.Z(s2, prev[0]), F.X(s2, v), yy + 17.5, F.Z(s2, v), 0.06, 0x222222, { col: false }); prev = [v, yy]; if (k % 2 === 1) F.box(3.6, yy + 13, v - 30, 2.4, 2.6, 2.4, 0xd8382a, { col: false, mat: "paint" }); }
    forest(w, x, z, 260, 180, "pine", (px, pz) => Math.hypot(px - x, pz - z) > 90);
  },
  frost(w, x, z) {   // 설원 통신기지: 레이더 접시 + 격자탑 + 활주로
    const st = ST.bukseol;
    dish(w, x - 60, z - 40, 22, st, 20); dish(w, x, z - 70, 26, st, 0); dish(w, x + 60, z - 40, 22, st, -20);
    lattice(w, x, z + 60, 125, 0xc8ccd0, 0x8fd8ff);
    airfield(w, x + 40, z + 150, 0, st, { len: 300, hangars: 2, parked: false });
    for (let i = 0; i < 6; i++) tower(w, x - 120 + i * 40, z + 20, 16, 12, 6, st, "office");
    for (let i = 0; i < 4; i++) w.blob(x + 140 + i * 18, floorAt(w, x + 140 + i * 18, z - 60, 6) + 2, z - 60, 7, 6, 7, 0xe8ecf0, { mat: "paint" });
  },
  baekryeong(w, x, z) {   // 백령 요새: 산마루 성채 + 포대
    const st = ST.bukseol;
    wallRing(w, x, z, 170, st, { sides: 9, h: 20, thick: 8, kind: "stone", gates: [4], towerR: 10 });
    wallRing(w, x, z, 60, st, { sides: 6, h: 30, thick: 6, kind: "stone", gates: [1], towerR: 8 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; aaGun(w, x + Math.cos(a) * 120, z + Math.sin(a) * 120, st); }
    for (let i = 0; i < 5; i++) bunker(w, x + 190 + i * 6, z - 80 + i * 40, 90, st);
    lattice(w, x, z, 70, 0xb8bcc0, 0x8fd8ff);
  },
  // ── 적사 자치령 ──
  minecity(w, x, z) {   // 적사 광산 도시: 계단식 절벽 도시 + 갱구 탑
    const st = ST.jeoksa, F = frame(w, x, z, 0), y = F.H(0, 0), r = w.rand;
    for (let ring = 0; ring < 4; ring++) {
      const R = 60 + ring * 50, hh = 6 + ring * 7, n = 10 + ring * 6;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + ring * 0.3, u = Math.cos(a) * R, v = Math.sin(a) * R; F.box(u, y - 2, v, 22, hh + r() * 6, 16, st.wall, { ry: -a / D, mat: "std:brick", tile: 4 }); F.box(u, y - 2 + hh + 5, v, 23, 0.8, 17, st.roof, { ry: -a / D, col: false }); }
    }
    for (const [u, v] of [[-30, -20], [30, 30], [0, -40]]) { F.box(u - 4, y, v, 1.2, 36, 1.2, 0x6a4a34, { col: false }); F.box(u + 4, y, v, 1.2, 36, 1.2, 0x6a4a34, { col: false }); F.box(u, y + 36, v, 10, 2, 3, 0x6a4a34, {}); F.cyl(u, y + 30, v + 1.8, 3, 0.8, 0x3a2a20, { col: false }); }
    for (let i = 0; i < 8; i++) w.cone(F.X(-200 + i * 18, 150), y - 1, F.Z(-200 + i * 18, 150), 10 + r() * 6, 8 + r() * 6, 0x8a5a3a, { mat: "std:rock" });
  },
  canyon(w, x, z, s) {   // 붉은 협곡 댐: 강을 가로지르는 댐
    const st = ST.jeoksa, R = RIVERS[1], L = lineDist(R.pts, s.p[0], s.p[1]), i = Math.min(R.pts.length - 2, Math.floor(L.s));
    const dx = R.pts[i + 1][0] - R.pts[i][0], dz = R.pts[i + 1][1] - R.pts[i][1], ry = Math.atan2(-dz, dx) / D + 90;
    const F = frame(w, x, z, ry), top = Math.max(F.H(-90, 0), F.H(90, 0)) - 2;
    F.box(0, -4, 0, 200, top + 4, 22, 0xd4cdbd, { mat: "std:concrete", tile: 8 });
    F.box(0, top, 0, 200, 1.2, 14, 0x8f8a80, { col: false });
    for (let k = -2; k <= 2; k++) F.box(k * 16, top - 14, -11.5, 8, 12, 1, 0x3d6b8c, { col: false, mat: "paint" });
    for (const u of [-70, 70]) { F.box(u, top + 1.2, 0, 8, 10, 8, 0xe9e2d2, {}); F.box(u, top + 11, 0, 9, 0.6, 9, 0x8a4a34, { col: false }); }
    for (let k = 0; k < 4; k++) turbine(w, F.X(-140 + k * 30, 160), F.Z(-140 + k * 30, 160), 46, ry);
    village(w, F.X(140, 120), F.Z(140, 120), 16, st, null, "house");
  },
  outpost(w, x, z) {   // 붉은 협곡 전초기지 (제국 2세대)
    const st = ST.e2, F = frame(w, x, z, 20);
    wallRing(w, x, z, 170, st, { sides: 8, h: 14, thick: 6, kind: "e2", gates: [5], towerR: 7 });
    factoryBlock(w, F, -40, 0, st, { len: 100, wid: 34, h: 20 });
    factoryBlock(w, F, 50, 30, st, { len: 70, wid: 30, h: 16, stacks: 2 });
    for (let i = 0; i < 6; i++) tower(w, F.X(-100 + i * 36, -110), F.Z(-100 + i * 36, -110), 18, 14, 10 + (i % 3) * 6, st, "e2", F.ry);
    for (let i = 0; i < 4; i++) aaGun(w, F.X(-120 + i * 80, 120), F.Z(-120 + i * 80, 120), st);
  },
  // ── 남도 군도 ──
  island(w, x, z) {   // 화산섬: 지열 발전소 + 냉각탑 + 수상 방갈로
    const st = ST.namdo, r = w.rand;
    for (let k = 0; k < 3; k++) { const a = 2.4 + k * 0.5, px = x + Math.cos(a) * 200, pz = z + Math.sin(a) * 120; const y = floorAt(w, px, pz, 14); w.cyl(px, y, pz, 12, 30, 0xe8e4dc, { rt: 8, mat: "std:concrete" }); w.cyl(px, y + 30, pz, 9, 0.4, 0xaaaaaa, { col: false }); }
    w.pool(x, w.h(x, z) + 2, z, 50, 0xff6a2a, 0.9);
    for (let i = 0; i < 12; i++) { const px = x + 240 + (i % 6) * 14, pz = z + 80 + ((i / 6) | 0) * 22; w.box(px, -1, pz, 0.6, 3.4, 0.6, 0x6a4a34, { col: false }); w.box(px, 2.2, pz, 9, 3.2, 9, 0xf0e8d8, { mat: "std:wood" }); w.cone(px, 5.4, pz, 7, 4, 0x8a6a3a, { col: false }); }
    forest(w, x, z, 300, 160, "round", (px, pz) => { const d = Math.hypot(px - x, pz - z); return d > 140 && w.h(px, pz) > 2 && w.h(px, pz) < 60; });
    void r;
  },
  coral(w, x, z, s) {   // 산호항: 수상기 부두 + 흰 마을
    const st = ST.namdo, a = seaDir(s.p[0], s.p[1]);
    const F = port(w, x, z, a, st, { piers: 3, pierLen: 110, gap: 50, cranes: false, shipKind: "war", containers: 6, sheds: 2 });
    village(w, F.X(0, -60), F.Z(0, -60), 30, st, (px, pz) => w.h(px, pz) > 2, "house");
    for (let i = 0; i < 3; i++) jet(w, F.X(-50 + i * 50, 140), F.Z(-50 + i * 50, 140), F.ry, st);
    tower(w, F.X(60, -90), F.Z(60, -90), 20, 20, 24, st, "office", F.ry);
  },
  // ── 제국 1세대 (점령형) ──
  vault(w, x, z) {   // 제국 코어 저장고: 옛 에너지 저장 기지 + 코어 탱크
    const st = ST.e1, F = frame(w, x, z, 0), y = F.H(0, 0);
    wallRing(w, x, z, 190, st, { sides: 10, h: 12, thick: 5, kind: "e1", gates: [2, 7], towerR: 6 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, u = Math.cos(a) * 80, v = Math.sin(a) * 80; F.cyl(u, y, v, 14, 22, 0x9a9a94, { mat: "std:concrete" }); F.cyl(u, y + 22, v, 12, 1, 0xff3a2a, { mat: "glow", col: false }); }
    F.cyl(0, y, 0, 24, 34, 0x6a6a66, { mat: "std:panel" }); F.sph(0, y + 34, 0, 20, 0x5a5a58, { mat: "paint" }); w.sph(F.X(0, 0), y + 52, F.Z(0, 0), 4, 0xff3a2a, { mat: "glow", col: false });
    for (let i = 0; i < 8; i++) tower(w, F.X(-150 + i * 40, 140), F.Z(-150 + i * 40, 140), 20, 14, 8 + (i % 3) * 5, st, "e1");
  },
  ashgate(w, x, z) {   // 잿빛 관문시: 빼앗긴 인간 도시 — 폐허 + 제국 개조
    const st = ST.e1, F = frame(w, x, z, -5);
    cityGrid(w, F, 240, st, { kinds: ["ruin", "ruin", "e1", "office"], hMax: 70, hMin: 8, empty: 0.14 });
    wallRing(w, x, z, 250, st, { sides: 16, h: 10, thick: 4, kind: "e1", gates: [0, 4, 8, 12], towerR: 5 });
    for (let i = 0; i < 20; i++) wreck(w, x + (w.rand() - 0.5) * 380, z + (w.rand() - 0.5) * 380, w.rand() * 360);
  },
  hq(w, x, z) {   // 옛 통합방위청 본부: 연구동 + 위성 접시 + 지하 입구
    const st = ST.e1, F = frame(w, x, z, 15), y = F.H(0, 0);
    F.box(0, y - 0.5, 0, 90, 30, 50, 0xb8b8b2, { mat: "std:concrete", tile: 6 });
    F.box(0, y + 29.5, 0, 60, 14, 34, 0xa8a8a2, { mat: "std:concrete", tile: 6 });
    F.box(0, y + 18, -25.3, 70, 6, 0.3, 0x5a6a70, { mat: "glass", col: false });
    F.cyl(0, y + 43.5, 0, 12, 4, 0x8a8a84, {}); w.sph(F.X(0, 0), y + 50, F.Z(0, 0), 9, 0xff3a2a, { mat: "glow", col: false });
    dish(w, F.X(-110, -60), F.Z(-110, -60), 18, st, 30); dish(w, F.X(110, -60), F.Z(110, -60), 18, st, -30);
    for (let i = 0; i < 5; i++) tower(w, F.X(-120 + i * 60, 100), F.Z(-120 + i * 60, 100), 30, 22, 12 + i * 3, st, i % 2 ? "ruin" : "e1", F.ry);
    F.box(0, y - 4, 70, 24, 5, 30, 0x2a2a28, { col: false }); F.box(0, y, 56, 20, 0.6, 2, 0xff3a2a, { mat: "glow", col: false });
  },
  // ── 제국 2세대 (공창형) ──
  foundry(w, x, z) {   // 거신 공창: 거대 조립동 + 조립 중인 거신 골격
    const st = ST.e2, F = frame(w, x, z, 0), y = F.H(0, 0);
    factoryBlock(w, F, -90, 0, st, { len: 200, wid: 60, h: 48, stacks: 5 });
    factoryBlock(w, F, 90, -40, st, { len: 140, wid: 46, h: 36, stacks: 3 });
    // 거신 골격 (조립 크레인 사이)
    F.box(40, y, 100, 14, 60, 10, 0x3a3c42, { mat: "std:panel" }); F.box(40, y + 60, 100, 40, 16, 16, 0x3a3c42, { mat: "std:panel" }); F.box(40, y + 76, 100, 14, 14, 12, 0x2a2c30, {});
    w.sph(F.X(40, 94), y + 84, F.Z(40, 94), 2.4, st.acc, { mat: "glow", col: false });
    for (const u of [10, 70]) F.box(u, y, 100, 4, 100, 4, st.acc, { mat: "paint" });
    F.box(40, y + 100, 100, 70, 5, 6, st.acc, { mat: "paint" });
    wallRing(w, x, z, 230, st, { sides: 10, h: 16, thick: 7, kind: "e2", gates: [5], towerR: 8 });
  },
  ironwall(w, x, z, s, ctx) {   // 강철 방벽: 2세대 땅을 남북으로 가르는 요새선
    const st = ST.e2, pts = [[-40, -1100], [-10, -600], [0, -200], [10, 200], [-20, 700], [-50, 1100]].map(([u, v]) => [x + u, z + v]);
    longWall(w, pts, st, { h: 22, thick: 8, towerEvery: 130 });
    const F = frame(w, x, z, 0);
    for (let i = 0; i < 4; i++) bunker(w, F.X(-40, -150 + i * 100), F.Z(-40, -150 + i * 100), 90, st);
    factoryBlock(w, F, 70, 0, st, { len: 80, wid: 30, h: 18, stacks: 2 });
    void ctx;
  },
  armory(w, x, z) {   // 흑철 조병창: 공장 도시
    const st = ST.e2, F = frame(w, x, z, -10);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) factoryBlock(w, F, -110 + i * 110, -60 + j * 130, st, { len: 100, wid: 40, h: 22 + (i + j) * 4 });
    for (let i = 0; i < 12; i++) tower(w, F.X(-180 + (i % 6) * 70, 170 + ((i / 6) | 0) * 36), F.Z(-180 + (i % 6) * 70, 170 + ((i / 6) | 0) * 36), 20, 16, 14 + (i % 4) * 6, st, "e2", F.ry);
    for (let i = 0; i < 4; i++) crane(w, F.X(-160 + i * 110, 5), F.Z(-160 + i * 110, 5), F.ry, 0x4a4c50);
  },
  spaceport(w, x, z, s) {   // 제국 궤도 발사기지: 발사대 + 함대 항만
    const st = ST.e2, a = seaDir(s.p[0], s.p[1]);
    const F = port(w, x, z, a, st, { piers: 3, pierLen: 160, gap: 80, shipKind: "e2", craneCol: 0x4a4c50, containers: 12 });
    for (let k = 0; k < 3; k++) {
      const u = -150 + k * 150, v = -140, y = F.H(u, v);
      F.cyl(u, y, v, 22, 2, 0x3a3c42, { mat: "std:concrete" });
      F.cyl(u, y + 2, v, 3.4, 52, 0xe8e8e2, { mat: "paint" }); F.cone(u, y + 54, v, 3.4, 9, 0xe8e8e2, { col: false });
      for (const s2 of [-4.5, 4.5]) F.cyl(u + s2, y + 2, v, 1.4, 16, 0xe8e8e2, { col: false });
      F.box(u + 10, y + 2, v, 4, 64, 4, 0x4a4c50, { mat: "paint" }); F.box(u + 6, y + 40, v, 6, 1, 1.4, 0x4a4c50, { col: false });
    }
    lattice(w, F.X(200, -100), F.Z(200, -100), 90, 0x4a4c50, st.acc);
  },
  // ── 제국 3세대 (심장형) ──
  empire(w, x, z) {   // 기계제국 수도: 심장 첨탑 + 모노리스 숲
    const st = ST.e3, r = w.rand;
    monolith(w, x, z, 260, st, { w: 30, top: true });
    for (let k = 0; k < 3; k++) glowRing(w, x, floorAt(w, x, z, 20) + 120 + k * 40, z, 40 + k * 16, 0.9, st.acc);
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 60 + Math.sqrt(r()) * 260, h = 40 + (1 - d / 330) * 150 * (0.4 + r() * 0.6); monolith(w, x + Math.cos(a) * d, z + Math.sin(a) * d, h, st, { w: 8 + r() * 12, thin: r() < 0.4, ry: r() * 90, ring: r() < 0.3 }); }
  },
  monolith(w, x, z) {   // 모노리스 요새: 문 없는 검은 성채
    const st = ST.e3;
    wallRing(w, x, z, 180, st, { sides: 8, h: 30, thick: 10, kind: "e3", gates: [], towerR: 8 });
    monolith(w, x, z, 140, st, { w: 50, ring: true });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; monolith(w, x + Math.cos(a) * 100, z + Math.sin(a) * 100, 60, st, { w: 10, thin: true, ry: -a / D }); }
  },
  abyss(w, x, z, s) {   // 심해 군항: 기함 정박지
    const st = ST.e3, a = seaDir(s.p[0], s.p[1]);
    const F = port(w, x, z, a, st, { piers: 3, pierLen: 200, gap: 110, cranes: false, ships: false, containers: 0, sheds: 0 });
    for (let i = 0; i < 3; i++) ship(w, F.X(-110 + i * 110 + 40, 130), F.Z(-110 + i * 110 + 40, 130), F.ry, 170 + i * 20, st, "e3");
    for (let i = 0; i < 6; i++) monolith(w, F.X(-160 + i * 64, -60), F.Z(-160 + i * 64, -60), 50 + (i % 3) * 20, st, { w: 10, thin: true });
  },
};
export { padH };
