// 맵: 화산섬 — 한낮의 열대 화산섬. 용암 호수가 끓는 분화구와 바다로 흘러드는 용암 강, 용암 동굴,
// 흰 모래 라군의 수상 방갈로와 리조트, 정글 폭포와 흔들다리, 신전·거석상, 활주로와 수상기, 시스택·난파선·등대
import * as THREE from "../../vendor/three.module.min.js";
import { WY, VOLCANO, RIVER, LAGOON, STRIP, APRON, ROAD, STACKS, LIGHT, REEF, FLATS, flat, height, colorFn, forest, lavaZone, lagE, lavaL, lava2L, tubeL, riverL, VENT } from "./island-terrain.js";
import { M, frame, beam, flora, rockArch, fallSheet, foamRings, prop } from "./canyon-kit.js";
import { plume } from "./factory-zones.js";
import { palmKit, hut, PYRAMID, lavaMaterial, ribbon, gulls, planeParts, boatParts } from "./island-kit.js";

export { height };

const DEG = Math.PI / 180;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const qY = (deg) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * DEG);
const yawOf = (dx, dz) => Math.atan2(dx, dz) / DEG;          // 법선이 (dx, dz) 를 향하는 갭·상자의 회전값
const KEEP = [];                                              // 식생을 비울 원 [x, z, r]
const WOOD = 0xa67c4e, WOOD2 = 0x6a4a2c, WHITE = 0xf2f0ea, BASALT = 0x38343a, STEEL = 0x59606a, RED = 0xe94f37;
const WO = { mat: "std:wood", tile: 2 };
let K = null, palm = null;

const [SPX, SPZ] = flat("spawn"), [OX, OZ] = flat("obs"), [TPX, TPZ] = flat("temple"), [VLX, VLZ] = flat("village"), [LCX, LCZ] = flat("lavacamp"), [IDX, IDZ] = flat("idols"), [DKX, DKZ] = flat("deck");
const LODGE = [-8, 145], PIER_X = 52, WALK_X = -30, HANGAR = [146, -20], TOWER = [146, 22], BRIDGE_T = 0.3;
// 폭포: 용소에서 화산 쪽으로 벽을 찾아 바위 턱의 위치를 정한다
const FALL = (() => {
  const [px, pz] = RIVER[0]; let dx = VOLCANO.x - px, dz = VOLCANO.z - pz; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  let s = 12; while (height(px + dx * s, pz + dz * s) < 34 && s < 45) s += 0.5;
  return { px, pz, dx, dz, s, y: 32, at: (d, side = 0) => [px + dx * d - dz * side, pz + dz * d + dx * side] };
})();
const BREACH = [VOLCANO.x + Math.cos(VOLCANO.breach) * 36, VOLCANO.z + Math.sin(VOLCANO.breach) * 36];

// 부품 목록을 정적 배치에 넣는다
function place(w, parts, x, y, z, ry = 0, rx = 0, rz = 0, s = 1, key = "paint") {
  const base = M(x, y, z, s, s, s, rx, ry, rz);
  for (const [g, m, c] of parts) w.mesh(g, m ? base.clone().multiply(m) : base, c, key);
}
// 네 다리 철탑(다리·수평재는 충돌, 대각재는 장식)
function lattice(w, x, y, z, h, r0, r1, levels, c1, c2 = c1) {
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let lv = 0; lv < levels; lv++) {
    const ya = y + (h * lv) / levels, yb = y + (h * (lv + 1)) / levels, ra = r0 + ((r1 - r0) * lv) / levels, rb = r0 + ((r1 - r0) * (lv + 1)) / levels, col = lv % 2 ? c2 : c1;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = C[i], [bx, bz] = C[(i + 1) % 4];
      beam(w, [x + ax * ra, ya, z + az * ra], [x + ax * rb, yb, z + az * rb], 0.26, col);
      beam(w, [x + ax * rb, yb, z + az * rb], [x + bx * rb, yb, z + bz * rb], 0.16, col);
      beam(w, [x + ax * ra, ya, z + az * ra], [x + bx * rb, yb, z + bz * rb], 0.1, col, { col: false });
    }
  }
}
// 횃불
function torch(w, x, z, h = 2.4, y = w.h(x, z)) {
  w.pipe(x, y - 0.3, z, x, y + h, z, 0.07, WOOD2, { mat: "std", col: false });
  w.cone(x, y + h, z, 0.22, 0.6, 0xff9a2a, { mat: "glow", col: false });
  w.pool(x, y, z, 4.5, 0xff9a4a, 0.3);
}
// 나무 말뚝 위의 잔교 a→b (축에 나란한 것만). 반환: 상판 윗면 높이
function jetty(w, ax, az, bx, bz, wd = 3, top = 0.6, step = 6) {
  const len = Math.hypot(bx - ax, bz - az), alongX = Math.abs(bx - ax) > Math.abs(bz - az);
  w.box((ax + bx) / 2, top - 0.22, (az + bz) / 2, alongX ? len : wd, 0.22, alongX ? wd : len, WOOD, WO);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) for (const s of [-1, 1]) {
    const x = ax + ((bx - ax) * i) / n + (alongX ? 0 : (s * wd) / 2 - s * 0.2), z = az + ((bz - az) * i) / n + (alongX ? (s * wd) / 2 - s * 0.2 : 0);
    w.pipe(x, Math.min(w.h(x, z), WY) - 0.6, z, x, top + (i % 2 ? 0.1 : 0.9), z, 0.16, WOOD2, { mat: "std" });
  }
  return top;
}

// ── 분화구: 용암 호수, 터진 화구벽, 테두리의 전망 데크 ──
function crater(w) {
  const V = VOLCANO, lm = lavaMaterial(w);
  const disc = new THREE.CircleGeometry(19.5, 30); disc.rotateX(-Math.PI / 2);
  const U = disc.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 3.2, U.getY(i) * 3.2);
  const lake = new THREE.Mesh(disc, lm); lake.position.set(V.x, V.lake, V.z); w.scene.add(lake);
  w.pool(V.x, V.lake + 0.1, V.z, 34, 0xff7a20, 0.55);
  for (const [dx, dz, s] of [[-7, 4, 3.2], [6, -8, 2.4], [9, 6, 1.8], [-3, -11, 1.5]]) w.blob(V.x + dx, V.lake - 0.2, V.z + dz, s * 1.5, s * 0.5, s, 0x241c1c, { mat: "std:rock", col: false });
  for (const [dx, dz] of [[3, 2], [-9, -5], [11, -2], [-2, 12]]) w.sph(V.x + dx, V.lake, V.z + dz, 0.9, 0xffd870, { mat: "glow", col: false, sy: 0.4 });
  plume(w, V.x - 3, V.lake + 6, V.z + 2, 10, 70, 3, 0x7a7478);
  w.gap("분화구 다이브", V.x, 103, V.z, 0, 46, 46, 600, -90);
  const bd = [Math.cos(V.breach), Math.sin(V.breach)];
  w.gap("터진 화구벽", BREACH[0], w.h(...BREACH) + 6.5, BREACH[1], yawOf(...bd), 17, 10, 500);
  // 남쪽 테두리의 전망 데크(분화구 위로 내민 발판)와 지진 관측 오두막
  const y0 = w.h(DKX, DKZ), F = frame(w, DKX, DKZ, 0, y0);
  F.box(0, 0.4, -12, 7, 0.4, 16, WOOD, WO);
  for (const s of [-1, 1]) {
    F.box(s * 3.4, 0.8, -12, 0.12, 1.0, 16, 0x7a5a3a, WO);
    F.pipe(s * 3.3, -0.5, -4.6, s * 3.3, 9, -4.6, 0.2, STEEL);
    F.beam(s * 3.3, 9, -4.6, s * 3.3, 1.0, -19.6, 0.1, 0x22262c, { col: false });
    F.beam(s * 3.3, 9, -4.6, s * 3.3, 0.2, 4, 0.1, 0x22262c, { col: false });
  }
  F.box(0, 0.8, -20, 7, 1.0, 0.12, 0x9fd0ff, { mat: "glass" });
  F.gap("전망 데크 아래", 0, -4.4, -15.5, 90, 9, 7.4, 700);
  hut(w, DKX + 5.5, y0 + 0.2, DKZ + 4.5, 3.6, 3.2, 0, { wall: 0xe9e2d2, roof: 0x9a3a2a, h: 2.4 });
  w.pipe(DKX - 6, y0, DKZ + 5, DKX - 6, y0 + 9, DKZ + 5, 0.1, WHITE); w.sph(DKX - 6, y0 + 9.3, DKZ + 5, 0.3, 0xff3030, { mat: "glow", col: false });
  KEEP.push([DKX, DKZ, 14]);
}

// ── 용암 강: 분화구에서 북동 해안까지. 돌아치, 주상절리 문, 바다와 만나는 곳의 수증기, 관측 캠프 ──
function lavaRiver(w) {
  const r = w.rand, lm = lavaMaterial(w);
  ribbon(w, lavaL, 0, 0.985, 4.3, 0.45, lm, { tile: 12, minY: WY - 0.6 });
  for (let t = 0.07; t < 0.96; t += 0.05) { const [x, z] = lavaL.point(t); w.pool(x, w.h(x, z) + 0.5, z, 9, 0xff6a1a, 0.42); }
  for (const [t, rise] of [[0.3, 12], [0.66, 11]]) {
    const [x, z] = lavaL.point(t), [dx, dz] = lavaL.dir(t), y = w.h(x, z);
    rockArch(w, x + dz * 14, z - dx * 14, x - dz * 14, z + dx * 14, y + 0.5, rise, 2.6, BASALT);
    w.gap("용암 위 돌아치", x, y + 5, z, yawOf(dx, dz), 15, 8, 500);
    KEEP.push([x + dz * 14, z - dx * 14, 6], [x - dz * 14, z + dx * 14, 6]);
  }
  // 남동 사면의 측면 분출구와 작은 용암 줄기
  ribbon(w, lava2L, 0.02, 1, 2.9, 0.42, lm, { tile: 10, tu: 0.7 });
  for (let t = 0.05; t < 1; t += 0.12) { const [x, z] = lava2L.point(t); w.pool(x, w.h(x, z) + 0.5, z, 7, 0xff6a1a, 0.42); }
  { const y = w.h(VENT.x, VENT.z); w.sph(VENT.x, y + 0.4, VENT.z, 3.4, 0xffb030, { mat: "glow", col: false, sy: 0.35 }); plume(w, VENT.x, y + 3, VENT.z, 4.5, 30, 3, 0x8a8488);
    w.gap("분출구 위 스치기", VENT.x, y + 9.5, VENT.z, yawOf(...lava2L.dir(0.1)), 16, 7, 450);
    const [x, z] = lava2L.point(0.62), [dx, dz] = lava2L.dir(0.62), ay = w.h(x, z);
    rockArch(w, x + dz * 11, z - dx * 11, x - dz * 11, z + dx * 11, ay + 0.5, 9.5, 2.2, BASALT);
    w.gap("용암 위 돌아치", x, ay + 4.2, z, yawOf(dx, dz), 11, 6.4, 550);
    const [ex, ez] = lava2L.point(1); for (let i = 0; i < 7; i++) K.rock(ex + (r() - 0.5) * 12, ez + 3 + r() * 7, 1.6 + r() * 2, 0x2e2a30);
    KEEP.push([VENT.x, VENT.z, 17]); }
  // 주상절리 기둥 무리가 만든 문
  { const [x, z] = lavaL.point(0.86), [dx, dz] = lavaL.dir(0.86);
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
      const cx = x - dz * s * (11 + r() * 6) + dx * (r() - 0.5) * 11, cz = z + dx * s * (11 + r() * 6) + dz * (r() - 0.5) * 11, hh = 4 + r() * 11, rad = 0.9 + r() * 0.5, y = w.h(cx, cz) - 0.6;
      w.mesh(K.T.col8, M(cx, y, cz, rad, hh, rad, 0, r() * 60, 0), [0x3a363c, 0x46424a, 0x2e2a30][i % 3], "std:rock");
      w.col.addCapsule(V3(cx, y, cz), V3(cx, y + hh - rad, cz), rad * 0.92);
    }
    w.gap("주상절리 문", x, w.h(x, z) + 6, z, yawOf(dx, dz), 14, 10, 450);
    KEEP.push([x, z, 20]); }
  // 바다와 만나는 곳
  { const [x, z] = lavaL.point(0.965), [dx, dz] = lavaL.dir(0.965);
    plume(w, x, WY + 1, z, 8, 42, 3, 0xffffff); plume(w, x + dx * 7 - dz * 5, WY + 1, z + dz * 7 + dx * 5, 6, 30, 3, 0xf4f8ff);
    foamRings(w, [[x + dx * 5, WY + 0.08, z + dz * 5, 9], [x + dx * 2 + dz * 6, WY + 0.08, z + dz * 2 - dx * 6, 6]]);
    w.pool(x, WY + 0.1, z, 16, 0xff7a20, 0.5); }
  // 관측 캠프: 흰 컨테이너 연구실, 돔 텐트, 안테나, 태양광 판
  const y0 = w.h(LCX, LCZ), F = frame(w, LCX, LCZ, 30, y0);
  for (const u of [-3.7, 3.7]) {
    F.box(u, 0.5, -12.5, 2.44, 2.6, 8, WHITE, { mat: "std:corrug", tile: 2 }); F.box(u, 1.5, -12.5, 2.5, 0.5, 8.06, 0xff7a1a, { col: false });
    for (const v of [-15.5, -9.5]) F.box(u, 0, v, 2, 0.5, 0.5, STEEL);
  }
  F.gap("관측 캠프 컨테이너 사이", 0, 2, -12.5, 0, 4.6, 3.4, 700);
  w.sph(F.X(10, 2), y0, F.Z(10, 2), 3, 0xff8a2a, { mat: "paint", sy: 0.85 });
  F.pipe(-10, 0, 4, -10, 12, 4, 0.12, WHITE); w.sph(F.X(-10, 4), y0 + 12.3, F.Z(-10, 4), 0.3, 0xff3030, { mat: "glow", col: false });
  w.mesh(K.T.col8, M(F.X(-10, 4), y0 + 8, F.Z(-10, 4) + 1, 1.2, 0.3, 1.2, 60, 0, 0), WHITE, "paint");
  for (const u of [6, 9.2]) F.box(u, 0.6, -5, 2.8, 0.12, 1.8, 0x27405c, { mat: "paint", rx: 28 });
  for (const [u, v, c] of [[-6, 9, 0xd9a441], [-4.6, 9.6, 0x3d8b5a], [-5.4, 8.6, 0xd9a441]]) F.box(u, 0, v, 1, 1, 1, c, { mat: "paint" });
  KEEP.push([LCX, LCZ, 18]);
}

// ── 용암 동굴: 식은 용암 둔덕 속의 굴. 양 끝은 열린 도랑, 가운데 지붕에 천창 두 곳 ──
function lavaTube(w) {
  const r = w.rand, lm = lavaMaterial(w), step = 4.3 / tubeL.len, ST = [];
  for (let t = 0.235; t <= 0.768; t += step) ST.push(t);
  const sky = new Set([Math.round(ST.length * 0.3), Math.round(ST.length * 0.3) + 1, Math.round(ST.length * 0.68), Math.round(ST.length * 0.68) + 1]);
  ST.forEach((t, i) => {
    const [x, z] = tubeL.point(t), [dx, dz] = tubeL.dir(t), fy = w.h(x, z), F = frame(w, x, z, yawOf(dx, dz), fy), c = [0x2e2a30, 0x38343a, 0x262228][i % 3];
    for (const s of [-1, 1]) F.box(s * 10.4, -2.5, 0, 3.6, 12, 4.8, c, { mat: "std:rock", tile: 5 });
    if (!sky.has(i)) {
      F.box(0, 8.6, 0, 24.4, 2.8, 4.8, c, { mat: "std:rock", tile: 5 });
      if (i % 2) w.blob(x + (r() - 0.5) * 12, fy + 11.6, z + (r() - 0.5) * 3, 5 + r() * 3, 1.6 + r(), 4 + r() * 2, 0x322e34, { mat: "std:rock", col: false });
    } else if (sky.has(i + 1)) {
      const mx = x + dx * 2.15, mz = z + dz * 2.15;
      w.gap("용암 동굴 천창 다이브", mx, fy + 9.8, mz, yawOf(dx, dz), 15, 7.6, 600, -90);
      w.pool(mx, fy + 0.3, mz, 8, 0xfff0c8, 0.5);
    }
    if (i % 4 === 1) { F.sph(-8.2, 5.2, 0, 0.32, 0xffc860, { mat: "glow", col: false }); w.pool(x, fy + 0.3, z, 7, 0xff8a3a, 0.36); }
  });
  ribbon(w, tubeL, 0.14, 0.86, 1.1, 0.22, lm, { tile: 6, tu: 0.4 });
  for (const [t, name, pts] of [[0.24, "용암 동굴 입구", 500], [0.5, "용암 동굴 관통", 900], [0.765, "용암 동굴 입구", 500]]) {
    const [x, z] = tubeL.point(t), [dx, dz] = tubeL.dir(t);
    w.gap(name, x, w.h(x, z) + 4.4, z, yawOf(dx, dz), 13, 7.6, pts);
  }
  // 입구 표지: 탐사대의 깃발과 등
  for (const t of [0.12, 0.88]) { const [x, z] = tubeL.point(t), [dx, dz] = tubeL.dir(t), px = x - dz * 9.5, pz = z + dx * 9.5, y = w.h(px, pz); w.pipe(px, y - 0.3, pz, px, y + 4, pz, 0.08, WHITE); w.box(px, y + 3.1, pz + 0.5, 0.05, 0.8, 1.1, 0xff7a1a, { col: false, ao: false }); w.sph(px, y + 4.2, pz, 0.25, 0xffc860, { mat: "glow", col: false }); }
}

// ── 화산 관측소 (서쪽 어깨): 돔 망원경, 연구동, 관측탑, 접시 안테나, 헬기장 ──
function observatory(w) {
  const y0 = w.h(OX, OZ), co = { mat: "std:concrete", tile: 4 };
  w.cyl(OX + 4, y0 - 1, OZ - 5, 6.5, 6, 0xe9e7e0, co); w.sph(OX + 4, y0 + 5, OZ - 5, 6.4, WHITE, { mat: "paint" });
  w.box(OX + 4, y0 + 7.6, OZ - 0.2, 1.7, 3.4, 3.4, 0x39424e, { col: false });
  w.cyl(OX - 13, y0 - 1, OZ - 12, 3.6, 4, 0xe9e7e0, co); w.sph(OX - 13, y0 + 3, OZ - 12, 3.5, 0xdfe6ee, { mat: "paint" });
  // 기둥 위의 연구동
  const lx = OX - 11, lz = OZ + 5;
  w.box(lx, y0 + 3.2, lz, 12, 3, 4.8, WHITE, { mat: "std:panel", tile: 3 }); w.box(lx, y0 + 4.3, lz + 2.42, 9, 1, 0.06, 0x27405c, { mat: "paint", col: false }); w.box(lx, y0 + 6.2, lz, 12.6, 0.25, 5.4, 0xff7a1a);
  for (const dx of [-5.6, 0, 5.6]) for (const dz of [-2, 2]) w.pipe(lx + dx, y0 - 0.5, lz + dz, lx + dx, y0 + 3.2, lz + dz, 0.16, STEEL);
  w.gap("연구동 아래", lx - 2.8, y0 + 1.6, lz, 0, 5, 2.9, 800); w.gap("연구동 아래", lx + 2.8, y0 + 1.6, lz, 0, 5, 2.9, 800);
  // 관측탑
  const tx = OX + 17, tz = OZ + 8;
  lattice(w, tx, y0 - 0.5, tz, 30, 3, 1.4, 5, 0xd9432f, WHITE);
  w.pipe(tx, y0 + 29.5, tz, tx, y0 + 36, tz, 0.1, WHITE); w.sph(tx, y0 + 36.3, tz, 0.35, 0xff3030, { mat: "glow", col: false });
  w.gap("관측탑 다리 사이", tx, y0 + 2.6, tz, 0, 4.6, 4.6, 700); w.gap("관측탑 다리 사이", tx, y0 + 2.6, tz, 90, 4.6, 4.6, 700);
  // 접시 안테나
  w.cyl(OX + 15, y0 - 0.5, OZ - 14, 0.5, 4.6, STEEL, { mat: "paint" });
  w.mesh(K.T.col8, M(OX + 15, y0 + 4.4, OZ - 14, 3.4, 0.5, 3.4, 55, 215, 0), WHITE, "paint"); w.col.addSphere(V3(OX + 15, y0 + 5.2, OZ - 14), 2.5);
  // 헬기장
  const hx = OX - 2, hz = OZ + 16;
  w.cyl(hx, y0 - 0.2, hz, 6.4, 0.3, 0x4a4d55, { mat: "std:asphalt", col: false, ao: false });
  for (const dx of [-1.5, 1.5]) w.box(hx + dx, y0 + 0.1, hz, 0.5, 0.03, 3.4, WHITE, { col: false, ao: false });
  w.box(hx, y0 + 0.1, hz, 3, 0.03, 0.5, WHITE, { col: false, ao: false });
  for (let i = 0; i < 8; i++) w.sph(hx + Math.cos(i * 0.785) * 6.2, y0 + 0.15, hz + Math.sin(i * 0.785) * 6.2, 0.16, 0x7aff9a, { mat: "glow", col: false });
  KEEP.push([OX, OZ, 28]);
}

// ── 정글 폭포: 바위 턱에서 용소로 떨어지는 물, 그 뒤의 통로. 골짜기의 흔들다리와 카누 ──
function falls(w) {
  const { px, pz, dx, dz, s, y, at } = FALL, ROCK = 0x5e5a52, side = [-dz, dx];
  for (const [d, a, b] of [[s - 1, 7, 6], [s - 6, 6.4, 5.4], [s - 10.5, 5, 4.6]]) { const [x, z] = at(d); w.blob(x, y - 1.6, z, a, 2.4, b, ROCK, { mat: "std:rock", grad: [0.55, 1.1], col: false, ry: 0 }); }
  const [lx, lz] = at(s - 5.6);
  w.col.addBox(V3(lx, y - 1.6, lz), V3(4.2, 2, 8), qY(yawOf(dx, dz)));
  const [cx, cz] = at(s - 0.5);
  w.box(cx, y + 0.4, cz, 4.6, 3.2, 5, 0x12161a, { ry: yawOf(dx, dz), col: false, ao: false });
  const P = (d, sd, yy) => { const [x, z] = at(d, sd); return [x, yy, z]; };
  fallSheet(w, P(s - 1.5, 2.2, y + 0.9), P(s - 1.5, -2.2, y + 0.9), P(s - 13.2, 2.6, y + 0.8), P(s - 13.2, -2.6, y + 0.8), { nv: 1, tileV: 8 });
  fallSheet(w, P(s - 13.2, 2.6, y + 0.82), P(s - 13.2, -2.6, y + 0.82), P(s - 14.8, 3.8, WY + 0.15), P(s - 14.8, -3.8, WY + 0.15), { nv: 8, nu: 3, bulge: 1.3 });
  for (let i = 0; i < 6; i++) { const [x, z] = at(s - 15 - w.rand() * 3, (i - 2.5) * 2); w.blob(x, WY + 0.8, z, 2.4 + w.rand() * 1.4, 1.6, 2.4 + w.rand() * 1.4, 0xffffff, { mat: "glass", col: false, grad: [1, 1] }); }
  { const f1 = at(s - 17), f2 = at(s - 20, 3); foamRings(w, [[f1[0], WY + 0.08, f1[1], 8], [f2[0], WY + 0.08, f2[1], 5]]); }
  { const [x, z] = at(s - 9.4); w.gap("폭포 뒤 통로", x, WY + 12.5, z, yawOf(...side), 6.4, 24, 800); }
  w.gap("폭포 다이브", px - dx * 2, 19, pz - dz * 2, 0, 16, 16, 500, -90);
  KEEP.push([px, pz, 30], [lx, lz, 14]);

  // 흔들다리
  const [bx, bz] = riverL.point(BRIDGE_T), [rdx, rdz] = riverL.dir(BRIDGE_T), ux = -rdz, uz = rdx, by = 17;
  let a = 0, b = 0;
  while (w.h(bx - ux * a, bz - uz * a) < by - 0.5 && a < 70) a += 1;
  while (w.h(bx + ux * b, bz + uz * b) < by - 0.5 && b < 70) b += 1;
  a += 2; b += 2;
  const F = frame(w, bx, bz, Math.atan2(-uz, ux) / DEG, 0), span = a + b, n = Math.round(span / 1.25), sag = 2.4, yAt = (t) => by + 0.4 - sag * 4 * t * (1 - t);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    F.box(-a + span * t, yAt(t), 0, 1.05, 0.12, 2.6, i % 7 === 3 ? 0x7a5a3a : WOOD, { ...WO, rz: -Math.atan((sag * 4 * (1 - 2 * t)) / span) / DEG, col: i % 2 === 0 });
  }
  for (const sd of [-1.3, 1.3]) {
    for (let i = 0; i < 16; i++) {
      const t0 = i / 16, t1 = (i + 1) / 16, u0 = -a + span * t0, u1 = -a + span * t1;
      F.beam(u0, yAt(t0) + 1.25, sd, u1, yAt(t1) + 1.25, sd, 0.09, 0x4a3a28, { col: false, mat: "std" });
      F.beam(u0, yAt(t0) + 0.08, sd, u1, yAt(t1) + 0.08, sd, 0.1, 0x4a3a28, { col: false, mat: "std" });
      if (i % 2) F.beam(u0, yAt(t0) + 0.08, sd, u0, yAt(t0) + 1.25, sd, 0.05, 0x4a3a28, { col: false, mat: "std" });
    }
    for (const u of [-a, b]) F.pipe(u, by - 1.5, sd, u, by + 2.4, sd, 0.22, 0x5a4026, { mat: "std" });
  }
  F.gap("흔들다리 아래", 0, 6.6, 0, 0, 15, 14, 350); F.gap("흔들다리 위 스치기", 0, by + 1.4, 0, 0, Math.min(30, span * 0.6), 3.4, 450);
  KEEP.push([F.X(-a, 0), F.Z(-a, 0), 6], [F.X(b, 0), F.Z(b, 0), 6]);
  // 강가에 묶어 둔 카누
  for (const [t, off, c] of [[0.63, 6, 0xe94f37], [0.7, -6, 0xffc23a]]) {
    const [x, z] = riverL.point(t), [ddx, ddz] = riverL.dir(t), qx = x - ddz * off, qz = z + ddx * off;
    place(w, boatParts("canoe", c), qx, WY + 0.1, qz, yawOf(ddx, ddz) + 12); w.col.addBox(V3(qx, WY + 0.25, qz), V3(0.6, 0.4, 3), qY(yawOf(ddx, ddz) + 12));
  }
}

// 돌 머리(거석상). ry 방향을 바라본다
function idol(w, x, y, z, h, ry, c = 0x8f8a80) {
  const o = { mat: "std:rock", tile: 4, ry }, fx = Math.sin(ry * DEG), fz = Math.cos(ry * DEG);
  w.box(x, y - 0.6, z, h * 0.4, h * 0.42 + 0.6, h * 0.3, c, o);
  w.box(x, y + h * 0.4, z, h * 0.34, h * 0.52, h * 0.36, c, o);
  w.box(x + fx * h * 0.17, y + h * 0.74, z + fz * h * 0.17, h * 0.37, h * 0.08, h * 0.12, 0x6a665e, { ...o, col: false });
  w.box(x + fx * h * 0.2, y + h * 0.5, z + fz * h * 0.2, h * 0.09, h * 0.24, h * 0.1, c, { ...o, col: false });
  w.box(x + fx * h * 0.19, y + h * 0.43, z + fz * h * 0.19, h * 0.2, h * 0.03, h * 0.04, 0x5a564e, { ...o, col: false });
  w.cyl(x, y + h * 0.92, z, h * 0.17, h * 0.15, 0x9a4a34, { mat: "std:rock" });
}

// ── 정글 신전: 가운데로 통로가 뚫린 계단 피라미드, 돌문, 돌 머리 ──
function temple(w) {
  const x = TPX, z = TPZ, y0 = w.h(x, z), ST = 0xb9b09a, ST2 = 0x9c937e, so = { mat: "std:brick", tile: 3 };
  for (const s of [-1, 1]) w.box(x + s * 4.7, y0 - 0.6, z, 5.2, 4.4, 14, ST, so);
  w.box(x, y0 + 3.8, z, 10.8, 2.4, 10.8, ST2, so); w.box(x, y0 + 6.2, z, 6.8, 2.2, 6.8, ST, so);
  for (const [dx, dz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) w.box(x + dx, y0 + 8.4, z + dz, 0.8, 3, 0.8, ST2, so);
  w.box(x, y0 + 11.4, z, 6.4, 0.7, 6.4, ST, so);
  w.cone(x, y0 + 8.5, z, 0.5, 1.2, 0x7affd0, { mat: "glow", col: false }); w.pool(x, y0 + 8.45, z, 4, 0x7affd0, 0.5);
  w.gap("신전 통로", x, y0 + 1.7, z, 0, 3.8, 3.4, 800);
  w.gap("신전 꼭대기", x, y0 + 9.9, z, 0, 3.6, 2.8, 800); w.gap("신전 꼭대기", x, y0 + 9.9, z, 90, 3.6, 2.8, 800);
  for (const s of [-1, 1]) { w.box(x + s * 3.5, y0 - 0.6, z + 13, 1.7, 7.6, 1.7, ST, so); idol(w, x + s * 9, y0, z + 11, 5.4, s * -14, 0x99927e); torch(w, x + s * 2, z + 16); }
  w.box(x, y0 + 6.6, z + 13, 10, 1.4, 2.1, ST2, so);
  w.gap("신전의 문", x, y0 + 3.3, z + 13, 0, 5.2, 6.2, 400);
  for (const [dx, dy, dz, s] of [[-5.6, 3.9, 5, 1.6], [5, 6.3, -2.6, 1.3], [-3, 8.5, -3, 1], [6.5, 3.9, -5.6, 1.5], [0, 12.2, 1, 1.2]]) w.blob(x + dx, y0 + dy, z + dz, s * 1.3, s * 0.6, s, 0x3e8a3a, { col: false });
  KEEP.push([x, z, 14], [x, z + 13, 8]);
}

// ── 거석상 언덕 (남동): 바다를 바라보는 돌 머리 다섯과 돌문 ──
function idols(w) {
  const y0 = w.h(IDX, IDZ), k = Math.SQRT1_2;
  [7, 8.6, 9.6, 8.2, 7.4].forEach((h, i) => idol(w, IDX + (i - 2) * 6.6 * -k, y0, IDZ + (i - 2) * 6.6 * k, h, 45));
  w.gap("거석상 사이", IDX - 3.3 * -k, y0 + 4, IDZ - 3.3 * k, 45, 3.4, 7, 700); w.gap("거석상 사이", IDX + 3.3 * -k, y0 + 4, IDZ + 3.3 * k, 45, 3.4, 7, 700);
  const tx = IDX - 9 * k, tz = IDZ - 9 * k, so = { mat: "std:rock", tile: 4, ry: 45 };
  for (const s of [-1, 1]) w.box(tx + s * 3.3 * -k, y0 - 0.6, tz + s * 3.3 * k, 1.6, 6.4, 1.6, 0x8f8a80, so);
  w.box(tx, y0 + 5.8, tz, 9.4, 1.3, 1.9, 0x7c776e, so);
  w.gap("거석 돌문", tx, y0 + 2.9, tz, 45, 4.8, 5.4, 500);
  KEEP.push([IDX, IDZ, 19]);
}

// ── 라군 리조트: 정자 로비, 수영장, 해변, 잔교, 수상 방갈로 ──
function resort(w) {
  const r = w.rand, y = 0.35;
  // 로비 정자(동서로 뚫려 있다)와 수영장, 바
  hut(w, LODGE[0], y + 0.25, LODGE[1], 16, 10, 0, { open: true, h: 4.5, roofH: 5.4 });
  w.gap("리조트 로비 관통", LODGE[0], y + 2.5, LODGE[1], 90, 8.4, 3.8, 600);
  for (const dx of [-4, 4]) w.box(LODGE[0] + dx, y + 0.25, LODGE[1] - 3.6, 2.4, 0.8, 1, 0xf4e9d0, { mat: "paint" });
  w.box(-36, y - 0.1, 146, 12, 0.3, 7.4, 0xf4f0e6, { col: false, ao: false }); w.box(-36, y - 0.08, 146, 10.4, 0.3, 5.8, 0x3fd3e0, { mat: "paint", col: false, ao: false });
  hut(w, 44, y + 0.2, 141, 5, 4, 0, { h: 2.6 }); w.box(44, y, 144.4, 5.6, 1.1, 0.7, WOOD, WO);
  for (const dx of [-2, 0, 2]) w.cyl(44 + dx, y, 145.6, 0.22, 0.75, 0xe94f37, { mat: "paint", col: false });
  // 대문(도로 위)
  { const gx = -52, gz = 140.5, nx = 0.4, nz = 0.92;
    for (const s of [-1, 1]) w.pipe(gx + nx * s * 5.4, 0, gz + nz * s * 5.4, gx + nx * s * 5.4, 6.4, gz + nz * s * 5.4, 0.3, WOOD2, { mat: "std" });
    beam(w, [gx - nx * 6.4, 6.4, gz - nz * 6.4], [gx + nx * 6.4, 6.4, gz + nz * 6.4], 0.5, WOOD, { mat: "std" });
    beam(w, [gx - nx * 5, 7.2, gz - nz * 5], [gx + nx * 5, 7.2, gz + nz * 5], 0.3, 0xe94f37);
    w.gap("리조트 대문", gx, 3.3, gz, yawOf(-nz, nx), 9.6, 5.6, 300); KEEP.push([gx, gz, 8]); }
  // 해변: 파라솔과 선베드, 배구 네트, 모닥불, 망루, 서프보드
  const UC = [0xe94f37, 0xffc23a, 0x2f8fd0, 0xf2f0ea, 0xff7ab0, 0x35b06a];
  for (let i = 0; i < 8; i++) {
    const x = -18 + i * 8, z = 157.5, yy = w.h(x, z);
    w.pipe(x, yy - 0.2, z, x, yy + 2.5, z, 0.05, 0xdadada, { col: false }); w.cone(x, yy + 2.1, z, 2, 0.8, UC[i % 6], { mat: "paint", col: false, grad: [0.85, 1.05] });
    w.col.addSphere(V3(x, yy + 2.3, z), 1);
    w.box(x + 1.3, yy + 0.05, z + 1.1, 0.7, 0.3, 1.9, 0xf4f0e6, { mat: "paint", col: false, ry: 8 });
  }
  for (const dx of [-4.5, 4.5]) w.pipe(8 + dx, -0.4, 160.6, 8 + dx, 2.5, 160.6, 0.08, 0xdadada);
  w.box(8, 1.5, 160.6, 9, 1, 0.05, 0xf4f4f4, { mat: "glass", ao: false });
  { const fx = 32, fz = 159.5, fy = w.h(fx, fz); for (let i = 0; i < 6; i++) w.blob(fx + Math.cos(i * 1.05) * 0.9, fy + 0.15, fz + Math.sin(i * 1.05) * 0.9, 0.3, 0.25, 0.3, 0x6a655d, { mat: "std:rock", col: false });
    w.cone(fx, fy + 0.1, fz, 0.5, 1.3, 0xff8a2a, { mat: "glow", col: false }); w.pool(fx, fy + 0.05, fz, 7, 0xff9a4a, 0.4); }
  { const tx = 60, tz = 158, ty = w.h(tx, tz);
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) w.pipe(tx + dx * 1.2, ty - 0.3, tz + dz * 1.2, tx + dx, ty + 3.4, tz + dz, 0.12, WHITE);
    w.box(tx, ty + 3.4, tz, 4, 0.2, 4, WOOD, WO); w.box(tx, ty + 3.6, tz - 0.6, 2.8, 2, 2.4, RED, { mat: "paint" }); w.box(tx, ty + 5.6, tz, 4.4, 0.16, 4.4, WHITE, { mat: "paint" });
    w.gap("구조대 망루 아래", tx, ty + 1.7, tz, 0, 2.6, 2.8, 900); w.gap("구조대 망루 아래", tx, ty + 1.7, tz, 90, 2.6, 2.8, 900); KEEP.push([tx, tz, 5]); }
  [0xff7ab0, 0x2f8fd0, 0xffc23a, 0x35b06a].forEach((c, i) => w.box(50 + i * 0.9, 0.2, 151, 0.12, 2.3, 0.55, c, { mat: "paint", col: false, rz: 8, ao: false }));
  w.box(51.4, 0.3, 151, 4, 1.2, 0.3, WOOD, { ...WO, col: false });
  for (const [x, z] of [[-22, 151], [4, 151.2], [18, 131.5], [36, 148], [-46, 152], [-26, 139]]) torch(w, x, z);
  // 잔교와 묶어 둔 배
  jetty(w, PIER_X, 159, PIER_X, 214, 3.4); jetty(w, PIER_X - 7, 216, PIER_X + 7, 216, 4, 0.6, 7);
  w.gap("잔교 아래", PIER_X, WY + 0.95, 180, 90, 5, 1.7, 900); w.gap("잔교 아래", PIER_X, WY + 0.95, 198, 90, 5, 1.7, 900);
  w.gap("잔교 스치기", PIER_X, 2.3, 190, 90, 34, 2.6, 300);
  place(w, boatParts("fish", 0x2f8fd0), PIER_X + 5.4, WY + 0.2, 204, 4); w.col.addBox(V3(PIER_X + 5.4, WY + 1.2, 203.5), V3(1.3, 1.5, 4.4));
  place(w, boatParts("canoe", 0xffc23a), PIER_X - 3.6, WY + 0.1, 196, -6); place(w, boatParts("ski", 0xe94f37), PIER_X - 3.4, WY + 0.1, 206, 10);
  w.pipe(PIER_X + 6.5, 0.6, 217.5, PIER_X + 6.5, 4, 217.5, 0.08, WHITE); w.sph(PIER_X + 6.5, 4.2, 217.5, 0.28, 0xffe2a8, { mat: "glow", col: false });
  // 수상 방갈로: 가운데 산책로 양쪽으로 세 쌍, 끝에는 정자
  const by = 1.2;
  jetty(w, WALK_X, 160, WALK_X, 232, 2.6, 0.95, 6);
  [182, 200, 218].forEach((z, i) => {
    for (const s of [-1, 1]) {
      hut(w, WALK_X + s * 11.5, by, z, 6.4, 6.4, 0, { stilt: 4.6, roof: i % 2 ? 0xb8964a : 0xa8863e });
      w.box(WALK_X + s * 4.4, 0.9, z, 6.2, 0.2, 1.6, WOOD, WO);
      w.box(WALK_X + s * 11.5, by - 0.2, z + 4.6, 3.4, 0.2, 2.6, 0x9a7446, WO);
    }
    w.gap("방갈로 골목", WALK_X, 3.6, z, 0, 12.5, 4.6, 350);
  });
  w.gap("방갈로 아래", WALK_X - 11.5, WY + 1.22, 200, 0, 5, 2.1, 900); w.gap("방갈로 아래", WALK_X + 11.5, WY + 1.22, 200, 90, 5, 2.1, 900);
  hut(w, WALK_X, by, 237, 6, 6, 45, { open: true, stilt: 4.6, h: 3 });
  w.gap("라군 정자 관통", WALK_X, by + 1.6, 237, 0, 3.4, 2.6, 800);
  // 물놀이 발판과 부표 줄
  w.box(10, WY - 0.2, 196, 5, 0.6, 5, 0xf4f0e6, { mat: "paint" }); w.box(10, WY + 0.4, 196, 1, 1.4, 1, 0xffc23a, { mat: "paint" });
  for (let i = 0; i < 12; i++) { const a = 0.45 + i * 0.2; w.sph(LAGOON.x + Math.cos(a) * 62, WY + 0.1, LAGOON.z + Math.sin(a) * 36, 0.5, i % 2 ? 0xff7a1a : WHITE, { mat: "paint", col: false }); }
  // 리조트의 야자수와 꽃 덤불
  for (const [x, z] of [[-48, 147], [-24, 142], [-22, 134], [6, 139], [12, 150], [36, 136], [52, 144], [64, 150], [70, 141], [-58, 156], [-44, 160], [22, 158], [48, 157], [-10, 160], [78, 156], [-66, 148]]) palm(x, z, 7 + r() * 4);
  for (let i = 0; i < 26; i++) { const x = -60 + r() * 130, z = 133 + r() * 18; if (clearOf(x, z, 2)) K.bush(x, z, 0.6 + r() * 0.5, [0xff5a8a, 0xffd23a, 0xf4f0e6, 0xe94f37][(r() * 4) | 0]); }
  KEEP.push([LODGE[0], LODGE[1], 13], [-36, 146, 9], [44, 142, 7], [8, 160.6, 6], [32, 159.5, 4], [PIER_X, 160, 6], [WALK_X, 161, 5], [51, 151, 4]);
  for (let i = 0; i < 8; i++) KEEP.push([-18 + i * 8, 158, 3.4]);
}
const clearOf = (x, z, m) => { for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false; return true; };

// ── 활주로 (동쪽 해안): 격납고, 관제탑, 경비행기, 수상기 잔교 ──
function airstrip(w) {
  const y = 0.3, S = STRIP, A = APRON, flatO = { col: false, ao: false };
  w.box(S.x, y - 0.07, S.z, 20, 0.12, 186, 0x4a4d55, { mat: "std:asphalt", tile: 8, ...flatO });
  for (let z = S.z - 78; z <= S.z + 78; z += 12) w.box(S.x, y + 0.06, z, 0.5, 0.02, 6, WHITE, flatO);
  for (const e of [-1, 1]) for (let i = -3; i <= 3; i++) w.box(S.x + i * 2.4, y + 0.06, S.z + e * 87, 1.2, 0.02, 7, WHITE, flatO);
  for (let z = S.z - 92; z <= S.z + 92; z += 23) for (const e of [-1, 1]) w.sph(S.x + e * 10.6, y + 0.25, z, 0.22, e > 0 ? 0x7ad8ff : 0xffe2a8, { mat: "glow", col: false });
  w.box(A.x, y - 0.07, A.z, 38, 0.1, 114, 0xbdb8aa, { mat: "std:concrete", tile: 8, ...flatO });
  w.gap("활주로 저공 통과", S.x, y + 1.7, S.z - 62, 0, 18, 2.6, 300); w.gap("활주로 저공 통과", S.x, y + 1.7, S.z + 62, 0, 18, 2.6, 300);
  // 격납고(남북으로 뚫려 있다)
  const [hx, hz] = HANGAR;
  for (const s of [-1, 1]) {
    w.box(hx + s * 8.8, y, hz, 0.5, 6, 22, 0xe4dfd0, { mat: "std:corrug", tile: 3 });
    w.box(hx + s * 4.5, y + 7.65, hz, 9.9, 0.3, 23, 0xd9532f, { mat: "std:corrug", tile: 3, rz: s * -22 });
  }
  w.box(hx, y + 9.3, hz, 1, 0.4, 23.4, 0x8a3a2a);
  w.gap("격납고 관통", hx, y + 3.2, hz, 0, 15, 5.8, 400);
  for (const [dx, c] of [[-7.4, 0xd9a441], [-7.4, 0x3d8b5a]]) w.box(hx + dx, y, hz + (c === 0xd9a441 ? -6 : 5), 1.2, 1.2, 1.2, c, { mat: "paint" });
  // 관제탑
  const [tx, tz] = TOWER;
  lattice(w, tx, y, tz, 12, 2.8, 2.3, 3, WHITE, 0xd9432f);
  w.box(tx, y + 12, tz, 6.4, 0.4, 6.4, STEEL); w.box(tx, y + 12.4, tz, 5.4, 1.1, 5.4, WHITE, { mat: "paint" }); w.box(tx, y + 13.5, tz, 5.6, 1.5, 5.6, 0x7fc8e8, { mat: "glass" });
  w.col.addBox(V3(tx, y + 14.2, tz), V3(2.8, 0.8, 2.8)); w.box(tx, y + 15, tz, 6.6, 0.3, 6.6, 0xd9532f, { mat: "paint" });
  w.pipe(tx + 2, y + 15.3, tz + 2, tx + 2, y + 20, tz + 2, 0.08, WHITE); w.sph(tx + 2, y + 20.2, tz + 2, 0.3, 0xff3030, { mat: "glow", col: false });
  w.gap("관제탑 다리 사이", tx, y + 2, tz, 0, 4.6, 3.3, 700); w.gap("관제탑 다리 사이", tx, y + 2, tz, 90, 4.6, 3.3, 700);
  const radar = prop(w, [[new THREE.BoxGeometry(3.2, 1.2, 0.2), M(0, 0.9, 0), 0xdadde2], [new THREE.BoxGeometry(0.2, 0.6, 0.2), null, 0x59606a]]);
  radar.position.set(tx - 1.2, y + 15.6, tz - 1.2); w.rider(radar, [[0, 0.9, 0, 1.6, 0.6, 0.3]]);
  w.updaters.push((dt) => { radar.rotation.y += dt * 1.6; });
  // 터미널, 연료 탱크, 풍향계
  hut(w, 148, y + 0.25, 46, 9, 6, 90, { h: 3 });
  for (const z of [-42, -48]) { w.pipe(138, y + 1.8, z, 146, y + 1.8, z, 1.4, WHITE); for (const x of [139.5, 144.5]) w.box(x, y, z, 0.5, 0.8, 2.4, STEEL); w.box(142, y + 1.5, z, 1.2, 0.7, 2.86, RED, { col: false }); }
  w.pipe(172, y, -44, 172, y + 7, -44, 0.08, WHITE); w.mesh(K.T.coneC, M(172.3, y + 6.8, -44, 0.5, 2.8, 0.5, 0, 0, -84), 0xff7a1a, "paint");
  // 계류장의 경비행기
  place(w, planeParts(WHITE, 0x2f8fd0), 172, y + 1.86, 30, 90);
  w.col.addBox(V3(172.4, y + 1.86, 30), V3(4.4, 0.85, 0.85)); w.col.addBox(V3(171.1, y + 2.86, 30), V3(0.9, 0.16, 5.8)); w.col.addBox(V3(175.7, y + 2.6, 30), V3(0.7, 1, 2.1));
  w.gap("날개 아래", 171.1, y + 1.3, 33.7, 90, 3.4, 2, 900);
  // 수상기 잔교
  jetty(w, 199, 52, 240, 52, 3, 0.6, 7);
  place(w, planeParts(0xffc23a, WHITE, true), 246.5, WY + 2.1, 52, 0);
  w.col.addBox(V3(246.5, WY + 2.1, 52.4), V3(0.85, 0.85, 4.4)); w.col.addBox(V3(246.5, WY + 3.1, 51.1), V3(5.8, 0.16, 0.9)); w.col.addBox(V3(246.5, WY + 0.4, 51.6), V3(2, 0.4, 2.9));
  w.gap("수상기 날개 아래", 250, WY + 1.7, 51.1, 0, 3.6, 2.2, 900);
  for (const [x, z] of [[136, 62], [134, 30], [136, -66], [152, 78], [176, 108], [200, 74], [204, -30], [200, -70]]) palm(x, z, 7 + w.rand() * 4);
  KEEP.push([hx, hz, 16], [tx, tz, 7], [148, 46, 9], [142, -45, 9], [172, 30, 8], [172, -44, 3]);
}

// ── 어촌 (서쪽 해안): 수상 가옥과 잔교, 카누, 건조대 ──
function village(w) {
  const y = 0.35;
  hut(w, VLX + 9, y + 0.25, VLZ - 13, 5, 4.4, 20, { roof: 0xa8863e }); hut(w, VLX + 11, y + 0.25, VLZ + 12, 5, 4.4, -30);
  jetty(w, -258, 46, -214, 46, 2.4, 0.95, 7);
  for (const [z, s] of [[35, 1], [57, -1]]) { hut(w, -247, 1.3, z, 5.4, 5.4, 0, { stilt: 5.6, roof: 0xb8964a, wall: 0xc9a468 }); w.box(-247, 0.9, z + s * 6.2, 1.8, 0.2, 7, WOOD, WO); }
  hut(w, -262.4, 1.3, 46, 5.4, 5.4, 0, { stilt: 5.6, open: true, h: 2.6 });
  w.gap("수상 가옥 아래", -247, WY + 1.25, 57, 0, 4.4, 2.2, 900); w.gap("수상 가옥 아래", -247, WY + 1.25, 35, 90, 4.4, 2.2, 900);
  w.gap("어촌 잔교 스치기", -238, 2.7, 46, 0, 20, 2.8, 300);
  place(w, boatParts("canoe", 0x2a9d8f), VLX - 6, w.h(VLX - 6, VLZ - 14) + 0.25, VLZ - 14, 70, 0, 7); place(w, boatParts("canoe", 0xe94f37), VLX - 7, w.h(VLX - 7, VLZ + 16) + 0.25, VLZ + 16, 100, 0, -6);
  place(w, boatParts("fish", 0xd9772f), -254.5, WY + 0.2, 41.3, 90); w.col.addBox(V3(-254.5, WY + 1.2, 41.3), V3(4.4, 1.5, 1.3));
  // 생선 건조대, 토템, 화덕
  for (const [x, z] of [[VLX + 2, VLZ + 15], [VLX + 4, VLZ - 16]]) {
    for (const d of [-2.2, 2.2]) { beam(w, [x + d, y - 0.2, z - 0.7], [x + d, y + 2.2, z], 0.1, WOOD2, { mat: "std", col: false }); beam(w, [x + d, y - 0.2, z + 0.7], [x + d, y + 2.2, z], 0.1, WOOD2, { mat: "std", col: false }); }
    beam(w, [x - 2.4, y + 2.2, z], [x + 2.4, y + 2.2, z], 0.1, WOOD2, { mat: "std" });
    for (let i = -3; i <= 3; i++) w.box(x + i * 0.6, y + 1.5, z, 0.16, 0.6, 0.06, 0xd9d4c8, { col: false, ao: false });
  }
  [0xe94f37, 0xffc23a, 0x2a9d8f, 0xf2f0ea].forEach((c, i) => w.box(VLX + 12, y + i * 1.3, VLZ + 1, 1.1 - i * 0.08, 1.3, 1.1 - i * 0.08, c, { mat: "paint", ry: i * 12 }));
  torch(w, VLX + 6, VLZ + 6); torch(w, VLX + 6, VLZ - 6);
  for (const [x, z] of [[VLX + 16, VLZ - 4], [VLX + 2, VLZ - 24], [VLX - 2, VLZ + 24], [VLX + 18, VLZ + 20], [VLX + 15, VLZ - 22]]) palm(x, z, 7 + w.rand() * 4);
  KEEP.push([VLX + 9, VLZ - 13, 6], [VLX + 11, VLZ + 12, 6], [VLX + 12, VLZ + 1, 3], [VLX + 2, VLZ + 15, 4], [VLX + 4, VLZ - 16, 4]);
}

// ── 바다: 시스택과 바다 아치, 등대 바위섬, 암초의 난파선 ──
function offshore(w) {
  const r = w.rand;
  { const [ax, az] = STACKS[0], [bx, bz] = STACKS[1], l = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / l, dz = (bz - az) / l;
    rockArch(w, ax + dx * 4, az + dz * 4, bx - dx * 3, bz - dz * 3, 15, 13, 3.3, 0x4e4a52);
    w.gap("바다 아치", (ax + bx) / 2, 9, (az + bz) / 2, yawOf(-dz, dx), 11, 17, 500);
    const [cx, cz] = STACKS[2], l2 = Math.hypot(cx - ax, cz - az);
    w.gap("시스택 사이", (ax + cx) / 2, 13, (az + cz) / 2, yawOf(-(cz - az) / l2, (cx - ax) / l2), 9, 22, 500); }
  for (const [x, z, rad, h] of STACKS) { K.bush(x + 1, z, 1.4, 0x4a9a3e); for (let i = 0; i < 3; i++) { const a = r() * 6.28, d = rad * (1.2 + r() * 0.6); K.rock(x + Math.cos(a) * d, z + Math.sin(a) * d, 2 + r() * 2, 0x4e4a52); } void h; }
  // 등대
  { const { x, z } = LIGHT, y = w.h(x, z) - 0.4;
    [[3.3, 2.9, WHITE], [2.9, 2.6, RED], [2.6, 2.3, WHITE], [2.3, 2.05, RED]].forEach(([r0, r1, c], i) => w.cyl(x, y + i * 5.5, z, r0, 5.5, c, { rt: r1, mat: "paint" }));
    w.cyl(x, y + 22, z, 3.4, 0.4, STEEL, { mat: "paint" }); w.cyl(x, y + 22.4, z, 1.7, 2.6, 0xbfe6f2, { mat: "glass" }); w.sph(x, y + 23.7, z, 0.8, 0xfff0b0, { mat: "glow", col: false });
    w.cone(x, y + 25, z, 2.3, 2, RED, { mat: "paint", col: false, grad: [0.8, 1.05] });
    hut(w, x - 8, y + 0.9, z + 5, 4, 3.4, 30, { wall: 0xe9e2d2, roof: 0x9a3a2a, h: 2.4 });
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 3.2, 70, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, -36), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    bm.position.set(x, y + 23.7, z); bm.renderOrder = 6; w.scene.add(bm);
    w.updaters.push((dt) => { bm.rotation.y += dt * 0.5; });
    w.gap("등대 스치기", x + 6.4, y + 14, z, 0, 5.6, 16, 400);
    palm(x + 7, z + 8, 7); palm(x - 4, z - 9, 8); }
  // 난파선: 둘로 부러진 선체. 선미는 갑판과 선교가 남았고 선수는 늑골만 남았다
  { const F = frame(w, REEF.x, REEF.z, 35, WY), RUST = 0x8a4a2c, RUST2 = 0x6a3a26, o = { mat: "std:corrug", tile: 3 };
    F.box(0, -2.6, 15, 9, 6, 22, RUST, { ...o, rz: 9, rx: -4 }); F.box(0.6, 3.2, 15, 8.4, 0.3, 21, 0x7a5a3a, { ...WO, rz: 9, rx: -4 });
    F.box(0.9, 3.4, 20, 6, 4.6, 7, 0xd9d0bc, { mat: "std:panel", tile: 3, rz: 9, rx: -4 }); F.box(0.2, 5.6, 16.4, 5.4, 1, 0.1, 0x27343e, { col: false, rz: 9, rx: -4 });
    F.pipe(1.6, 7.8, 21, 3.2, 13, 22, 1.1, 0x2c2a2a); F.pipe(1, 3.4, 9, 2.6, 13, 8, 0.16, RUST2);
    F.gap("난파선 틈", 0, 1.9, -0.4, 90, 7.4, 6.4, 500);
    for (let i = 0; i < 6; i++) {
      const v = -5 - i * 3.4, wd = 4.4 - i * 0.42;
      for (const s of [-1, 1]) { F.pipe(s * 1.2, -2.8, v, s * wd, 1.4, v, 0.2, RUST2); F.pipe(s * wd, 1.4, v, s * (wd - 0.2), 5.2 - i * 0.2, v, 0.2, RUST2); }
    }
    F.box(0, -3.2, -14.5, 1.6, 1, 22, RUST, o); F.pipe(0, -2.8, -25, 0, 7, -28, 0.3, RUST2); F.pipe(-5.4, -2, 9, -9, 1.2, -3, 0.18, RUST2);
    F.gap("난파선 늑골 터널", 0, 2.2, -13.5, 0, 5.4, 4.6, 700);
    for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 14 + r() * 22; K.rock(REEF.x + Math.cos(a) * d, REEF.z + Math.sin(a) * d, 1.4 + r() * 1.6, 0x6a6660); } }
  // 라군 모래톱의 무인도 야자수
  for (const a of [1.15, 1.9, 2.5]) { const x = LAGOON.x + Math.cos(a) * LAGOON.rx * 1.08, z = LAGOON.z + Math.sin(a) * LAGOON.rz * 1.08; if (w.h(x, z) > WY + 0.5) palm(x, z, 6 + r() * 3); }
}

// ── 움직이는 것들: 갈매기, 고깃배, 제트스키, 수상기 ──
function life(w) {
  gulls(w, [[20, 34, 220, 60, 9, 0], [-240, 52, -170, 46, -8, 2], [252, 44, 200, 40, 8, 4], [-250, 30, 160, 50, -9, 1], [150, 30, -210, 44, 8, 3]]);
  const loop = (mesh, cx, cz, rx, rz, sp, y, bob, box) => {
    w.rider(mesh, [box]);
    w.updaters.push((dt, t) => { const a = t * sp, x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz; mesh.position.set(x, y + Math.sin(t * 1.9 + cx) * bob, z); mesh.rotation.y = Math.atan2(Math.sin(a) * rx * Math.sign(sp), -Math.cos(a) * rz * Math.sign(sp)); });
  };
  loop(prop(w, boatParts("fish", 0x2a9d8f)), -150, -264, 58, 14, 0.07, WY + 0.2, 0.06, [0, 1.2, 0, 1.4, 1.6, 4.6]);
  loop(prop(w, boatParts("fish", 0xd9432f)), 124, 264, 48, 16, -0.08, WY + 0.2, 0.06, [0, 1.2, 0, 1.4, 1.6, 4.6]);
  loop(prop(w, boatParts("ski", 0x35c06a)), 12, 229, 22, 14, 0.5, WY + 0.12, 0.05, [0, 0.8, 0, 0.7, 1, 1.8]);
  const sp = prop(w, planeParts(WHITE, RED, true));
  sp.rotation.order = "YXZ";
  w.rider(sp, [[0, 0, 0.4, 0.9, 0.9, 4.4], [0, 1, -0.9, 5.8, 0.2, 0.9]]);
  w.updaters.push((dt, t) => { const a = t * 0.11; sp.position.set(262 + Math.cos(a) * 80, 58 + Math.sin(t * 0.3) * 4, -10 + Math.sin(a) * 120); sp.rotation.y = Math.atan2(Math.sin(a) * 80, -Math.cos(a) * 120); sp.rotation.z = 0.2; });
}

function build(w) {
  const r = w.rand, H = (x, z) => w.h(x, z);
  KEEP.length = 0;
  K = flora(w); palm = palmKit(w);
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.3, 1.3, 1.22", rockTint: "1.05, 1.0, 1.0", rockLo: 0.26, rockHi: 0.46 });
  w.water(WY, 0x0f93b2);
  const slope = (x, z) => Math.max(Math.abs(H(x + 2, z) - H(x - 2, z)), Math.abs(H(x, z + 2) - H(x, z - 2))) / 4;

  // 식생을 비울 곳: 터, 거점, 트랙·경로 주변
  for (const f of FLATS) KEEP.push([f[0], f[1], f[2] + 3]);
  for (const p of [...DEPOTS, ...SUPPLY.turrets, ...STRIKE.turrets]) KEEP.push([p[0], p[1], 7]);
  for (const t of TRACKS) if (t.start) KEEP.push([t.start.pos[0], t.start.pos[2], 7]);

  crater(w);
  lavaRiver(w);
  lavaTube(w);
  observatory(w);
  falls(w);
  temple(w);
  idols(w);
  resort(w);
  airstrip(w);
  village(w);
  offshore(w);
  life(w);

  // ── 식생·바위: 해안은 야자수, 언덕은 정글, 용암 지대는 바위와 고사목 ──
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => V3(q[0], 0, q[2])), loop, "centripetal").getPoints(pts.length * 8).map((v) => [v.x, v.z]);
  const LINES = [[sample(ROAD.map(([x, z]) => [x, 0, z]), false), 7, false], [sample(JEEP, true), 6, true], [sample(RUNNER, true), 4, true], ...TRACKS.map((t) => [sample(t.gates.map((g) => g.p), t.loop !== false), 8, t.loop !== false])];
  const inRect = (x, z, q, m) => Math.abs(x - q.x) < q.hx + m && Math.abs(z - q.z) < q.hz + m;
  const clear = (x, z, m = 0) => {
    if (inRect(x, z, STRIP, 5 + m) || inRect(x, z, APRON, 3 + m) || lavaL.at(x, z)[0] < 13 + m || lava2L.at(x, z)[0] < 12 + m || tubeL.at(x, z)[0] < 15 + m) return false;
    if (!clearOf(x, z, m)) return false;
    for (const [L, wd, loop] of LINES) for (let i = 0; i < L.length - (loop ? 0 : 1); i++) {
      const a = L[i], b = L[(i + 1) % L.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < wd + m) return false;
    }
    return true;
  };
  const scatter = (count, tries, fn) => { let n = 0; for (let i = 0; i < tries && n < count; i++) if (fn((r() * 2 - 1) * 300, (r() * 2 - 1) * 300)) n++; };
  // 해안 평지의 야자수 숲
  scatter(250, 9000, (x, z) => {
    const y = H(x, z);
    if (y < 0.3 || y > 5 || lavaZone(x, z) > 0.42 || slope(x, z) > 0.3 || !clear(x, z)) return false;
    if (forest(x + 90, z) < 0.46 && r() > 0.2) return false;
    palm(x, z, 6.5 + r() * 4.5); return true;
  });
  // 정글 언덕: 활엽수 사이로 키 큰 야자수
  scatter(470, 14000, (x, z) => {
    const y = H(x, z);
    if (y < 4 || y > 52 || lavaZone(x, z) > 0.32 || slope(x, z) > 0.75 || !clear(x, z)) return false;
    if (forest(x, z) < 0.4 && r() > 0.25) return false;
    if (r() < 0.13) palm(x, z, 9 + r() * 4, undefined, 0.02); else K.round(x, z, 0.9 + r() * 0.9, 0.29 + r() * 0.06, 0.62);
    return true;
  });
  // 덤불: 평지는 꽃, 언덕은 양치류
  const FLOWER = [0xff5a8a, 0xffd23a, 0xf4f0e6, 0xe94f37, 0xb48cff];
  scatter(300, 9000, (x, z) => {
    const y = H(x, z);
    if (y < 0.5 || y > 62 || lavaZone(x, z) > 0.5 || slope(x, z) > 0.8 || !clear(x, z, -3)) return false;
    K.bush(x, z, 0.6 + r() * 0.7, y < 5 && r() < 0.45 ? FLOWER[(r() * 5) | 0] : r() < 0.5 ? 0x3e9a44 : undefined); return true;
  });
  // 용암 지대: 현무암 바위와 불탄 나무
  scatter(230, 9000, (x, z) => {
    const y = H(x, z), s = slope(x, z);
    if (y < WY - 0.5 || y > 100 || !(lavaZone(x, z) > 0.45 || s > 0.5) || !clear(x, z, -2)) return false;
    K.rock(x, z, 0.7 + r() * r() * 3.2, [0x3a363c, 0x2e2a30, 0x4a4248][(r() * 3) | 0]); return true;
  });
  scatter(36, 5000, (x, z) => {
    const y = H(x, z), lz = lavaZone(x, z);
    if (y < 1.5 || y > 50 || lz < 0.4 || lz > 0.8 || slope(x, z) > 0.5 || !clear(x, z, 2)) return false;
    K.snag(x, z, 0.7 + r() * 0.5); return true;
  });
  // 해안의 바위와 강가의 갈대
  scatter(70, 6000, (x, z) => { const y = H(x, z); if (y < WY - 1.2 || y > WY + 0.6 || lagE(x, z) < 1.3 || !clear(x, z, -2)) return false; K.rock(x, z, 1 + r() * 1.8, lavaZone(x, z) > 0.4 ? 0x3a363c : 0x8a8478); return true; });
  scatter(110, 9000, (x, z) => { const y = H(x, z); if (y < WY - 0.2 || y > 0.5 || riverL.at(x, z)[0] > 26) return false; K.reed(x, z, 0.9 + r() * 0.7, r() < 0.5 ? 0x9ac45a : 0x6fae4c); return true; });
}

// ── 경로·트랙 데이터 (지형 함수로 높이를 계산한다) ──
const T = (x, z, up) => [x, height(x, z) + up, z];
const G = (t, p, o = {}) => ({ t, p, ...o });
const LV = (t, up) => { const [x, z] = lavaL.point(t); return [x, height(x, z) + up, z]; };
const TB = (t, up) => { const [x, z] = tubeL.point(t); return [x, height(x, z) + up, z]; };
const RV = (t, y) => { const [x, z] = riverL.point(t); return [x, y, z]; };
const BY = WY + 0.15;                                          // 배가 뜨는 높이

const DEPOTS = [[-30, 114], [171, -20], [-196, -32], [40, -192]];
const STRIKE = { turrets: [[98, 152], [-172, -82], [171, -20], [40, -192], [-30, 114], [-196, -32]], core: [-55, -197] };
const SUPPLY = { depot: [22, 136], camps: [[OX - 2, OZ + 16], [VLX, VLZ], [LCX, LCZ], [171, 6]], turrets: [[98, 152], [-172, -82]] };
const RUNNER = [[-20, 0, 153.5], [0, 0, 153.5], [26, 0, 153.2], [43, 0, 155.5], [45, 0, 162], [32, 0, 165.2], [0, 0, 165.4], [-16, 0, 164.6], [-23, 0, 159]].map((p) => [...p, 4.6]);
const JEEP = [[163, 0, 56, 13], [163, 0, -10, 14], [161, 0, -62, 12], [168, 0, -84, 9], [182, 0, -90, 8], [189, 0, -70, 12], [189, 0, 0, 18], [189, 0, 70, 16], [184, 0, 96, 9], [172, 0, 100, 8]];

const [FBX, FBZ] = FALL.at(FALL.s - 9.4), TY = height(TPX, TPZ);
const LAGOONRUN = [
  G("hoop", [30, 5, 151], { r: 4.5 }), G("hoop", [PIER_X, 5.5, 172], { r: 4.5 }), G("hoop", [PIER_X, 5.5, 202], { r: 4.5 }), G("hoop", [38, 5, 232], { r: 5 }), G("hoop", [10, 4.5, 244], { r: 5 }),
  G("hoop", [-16, 5, 240], { r: 4.5 }), G("hoop", [WALK_X, 5.4, 218], { r: 4 }), G("hoop", [WALK_X, 5.4, 190], { r: 4 }), G("hoop", [-29, 5, 163], { r: 4.5 }),
  G("square", [LODGE[0], 3.1, LODGE[1]], { w: 8, h: 3.5, yaw: -90 }),
];
const LAVARUN = [
  G("hoop", [DKX, height(DKX, DKZ) + 7.5, DKZ - 22], { r: 4.5 }), G("hoop", [-8, 96, -53], { r: 5 }), G("hoop", [BREACH[0], height(...BREACH) + 6.5, BREACH[1]], { r: 5 }), G("hoop", LV(0.2, 7), { r: 5 }), G("ring", LV(0.3, 4.8), { r: 3.4 }),
  G("hoop", LV(0.4, 7), { r: 5 }), G("hoop", LV(0.5, 7), { r: 5 }), G("hoop", LV(0.58, 6), { r: 4.5 }), G("ring", LV(0.66, 4.8), { r: 3.4 }), G("hoop", LV(0.76, 5.5), { r: 4.5 }),
  G("hoop", LV(0.86, 6), { r: 5 }), G("hoop", LV(0.94, 6.5), { r: 5 }),
];
const JUNGLE = [
  G("square", [TPX, TY + 3.3, TPZ + 13], { w: 4.8, h: 5.6, yaw: 0 }), G("square", [TPX, TY + 1.7, TPZ], { w: 3.6, h: 3.2, yaw: 0 }), G("hoop", [TPX - 1, TY + 3.2, TPZ - 17], { r: 4 }),
  G("hoop", T(-110, 70, 12), { r: 5 }), G("hoop", T(-90, 60, 12), { r: 5 }), G("hoop", T(-73, 47, 10), { r: 5 }),
  G("hoop", [FALL.px - FALL.dx * 3, 29, FALL.pz - FALL.dz * 3], { r: 6, pitch: -90, yaw: 60 }), G("hoop", RV(0.13, 6), { r: 4.5 }),
  G("ring", RV(BRIDGE_T, 6.6), { r: 4 }), G("hoop", RV(0.46, 5.5), { r: 4.5 }), G("hoop", RV(0.64, 5), { r: 4.5 }), G("hoop", RV(0.82, 5), { r: 4.5 }), G("hoop", RV(0.97, 5), { r: 5 }),
  G("hoop", [-214, 6, 130], { r: 5 }), G("hoop", [-176, 7, 146], { r: 5 }), G("hoop", [-134, 7.5, 142], { r: 5 }),
];
const ARCH = [(STACKS[0][0] + STACKS[1][0]) / 2, (STACKS[0][1] + STACKS[1][1]) / 2];
const SUMMIT = [
  G("square", [HANGAR[0], 3.5, HANGAR[1]], { w: 13, h: 5.4, yaw: 0 }), G("hoop", [160, 7, -64], { r: 5 }), G("hoop", T(166, -150, 8), { r: 5 }), G("hoop", [174, 6, -202], { r: 5 }), G("hoop", LV(0.985, 7.5), { r: 5 }),
  G("hoop", LV(0.86, 6), { r: 5 }), G("ring", LV(0.66, 4.8), { r: 3.4 }), G("hoop", LV(0.53, 7), { r: 5 }), G("hoop", LV(0.42, 7), { r: 5 }), G("ring", LV(0.3, 4.8), { r: 3.4 }), G("hoop", LV(0.2, 7), { r: 5 }), G("hoop", [BREACH[0], height(...BREACH) + 6.5, BREACH[1]], { r: 5 }),
  G("hoop", [VOLCANO.x, 94, VOLCANO.z], { r: 5 }), G("hoop", [VOLCANO.x - 25.5, height(VOLCANO.x - 25.5, VOLCANO.z - 25.5) + 9, VOLCANO.z - 25.5], { r: 6 }), G("hoop", T(-46, -106, 13), { r: 5 }),
  G("hoop", TB(0.07, 6), { r: 4.5 }), G("ring", TB(0.27, 4.4), { r: 3.2 }), G("ring", TB(0.5, 4.4), { r: 3.2 }), G("ring", TB(0.73, 4.4), { r: 3.2 }), G("hoop", TB(0.95, 6), { r: 4.5 }),
  G("hoop", [-190, 8, -160], { r: 5 }), G("hoop", [-207, 8, -197], { r: 5 }), G("hoop", [ARCH[0] + 27, 8.5, ARCH[1] - 19.5], { r: 5 }), G("hoop", [ARCH[0], 9, ARCH[1]], { r: 4.5 }),
];
const TRACKS = [
  { id: "lagoon", name: "라군 서킷", level: 1, laps: 3, desc: "잔교를 따라 라군으로 나가 수상 방갈로 골목을 지나고 리조트 로비를 꿰뚫는 쉬운 해변 코스", gates: LAGOONRUN },
  { id: "lava", name: "용암 강 하강", level: 2, loop: false, desc: "분화구 테두리에서 용암 호수로 뛰어들어 터진 화구벽을 빠져나온 뒤, 돌아치 밑으로 용암 강을 따라 바다까지 내려가는 구간 주행", start: { pos: [DKX - 2, 0, DKZ + 4], yaw: 0 }, gates: LAVARUN },
  { id: "jungle", name: "정글 폭포 순환", level: 2, laps: 2, desc: "신전의 문과 피라미드 통로를 지나 정글 언덕을 넘고, 폭포를 따라 용소로 뛰어내린 뒤 흔들다리 밑으로 강을 타고 하구까지 내려가는 코스", gates: JUNGLE },
  { id: "summit", name: "화산 종주", level: 3, loop: false, desc: "격납고에서 출발해 용암이 바다와 만나는 곳을 돌아 용암 강을 거슬러 분화구를 넘고, 용암 동굴을 관통해 바다 아치까지 섬을 가로지르는 고난도 구간 주행", start: { pos: [HANGAR[0], 0, HANGAR[1] + 22], yaw: 0 }, gates: SUMMIT },
];

export default {
  id: "island",
  name: "화산섬",
  desc: "한낮의 열대 화산섬. 용암 호수가 끓는 분화구와 바다로 흘러드는 용암 강, 용암 동굴, 흰 모래 라군의 수상 방갈로, 정글 폭포와 신전, 활주로와 난파선까지",
  size: 300,
  ceiling: 210,
  seed: 77,
  env: {
    sky: { top: 0x1f7ae0, horizon: 0xc4ecff, bottom: 0x7fd0e0 }, sunDir: [0.42, 0.82, 0.38], sunColor: 0xfffaf0, sun: 3.4,
    hemi: 0.5, hemiSky: 0xcfeaff, hemiGround: 0x8a9a6a, cloud: 0.42, cloudLit: 0xffffff, cloudDark: 0xa8c0d8,
    fog: { color: 0xcdeeff, near: 320, far: 2300 }, exposure: 1.0, glow: 2.0,
  },
  spawn: { pos: [SPX + 2, 0, SPZ + 8], yaw: 0 },
  thumb: { pos: [196, 74, 268], look: [-10, 40, -44] },
  build,
  tracks: TRACKS,
  tracking: [
    { id: "runner", name: "해변 조깅", type: "runner", level: 1, desc: "파라솔이 늘어선 리조트 해변을 달리는 러너를 가까이에서 따라가세요", duration: 70, color: 0xff7ab0, path: RUNNER },
    { id: "truck", name: "보급 트럭", type: "truck", level: 1, desc: "리조트에서 활주로를 지나 용암 전망대까지 해안 도로를 달리는 트럭을 따라가세요", duration: 56, closed: false, color: 0x2f8fd0, path: ROAD.map(([x, z]) => [x, 0, z, 9]) },
    { id: "jeep", name: "활주로 질주", type: "sportscar", level: 2, desc: "계류장을 돌아 활주로를 내달리는 지프 추적. 직선에서 놓치지 마세요", duration: 80, color: 0xff7a1a, path: JEEP },
    {
      id: "boat", name: "강을 거슬러 오르는 배", type: "boat", level: 2, desc: "라군을 빠져나와 서쪽 해안을 돌고, 정글 강을 거슬러 폭포까지 올라가는 배를 따라가세요", duration: 92, closed: false, color: 0xffc23a,
      path: [[24, 226], [52, 229], [80, 232.5], [102, 246], [86, 270], [30, 280], [-40, 276], [-110, 250], [-172, 204], [-214, 152], [-242, 112], ...[1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.03].map((t) => riverL.point(t))].map(([x, z], i) => [x, BY, z, i > 10 ? 7 : 10]),
    },
    {
      id: "drone", name: "화산 관측 드론", type: "drone", level: 3, desc: "용암 강과 분화구, 관측소와 용암 동굴 위를 누비는 관측 드론을 화면에 담으세요", duration: 90,
      path: [T(120, -150, 14), LV(0.62, 18), LV(0.45, 22), LV(0.3, 30), LV(0.22, 12), [BREACH[0], height(...BREACH) + 8, BREACH[1]], [-18, 96, -44], [-12, 126, -8], [-60, 114, -6], [OX, height(OX, OZ) + 44, OZ], T(-96, -70, 22), TB(0.5, 22), T(-104, -162, 16), T(-60, -172, 16), T(-10, -156, 22), T(50, -160, 18)].map((p) => [...p, 12]),
    },
  ],
  combat: { blue: [flat("blue")[0], flat("blue")[1]], red: [flat("red")[0], flat("red")[1]], depots: DEPOTS },
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7, path: ROAD.map(([x, z]) => [x, 0, z]) },
  boss: { pos: [VOLCANO.x, 152, VOLCANO.z] },
};
