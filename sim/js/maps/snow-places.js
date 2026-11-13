// 설국 산장의 장소들: 마을·호수·스키장·점프대·정상 관측소·얼음 골짜기·빙하 크레바스·얼음 폭포
import * as THREE from "../../vendor/three.module.min.js";
import { M, frame, beam, prop, rockArch, birds, balloon, balloonParts } from "./canyon-kit.js";
import { height, LAKE, POND, MESA, PISTE, GORGE, CREV, ROAD, flat } from "./snow-terrain.js";
import { SNOW, SNOW_SH, ICE, ICE_D, STONE, STONE_D, TIMBER, TIMBER_D, WARM, PRISM, PYR, DOME, HALFTORUS, BALL, place, roof, win, chalet, garland, iceColumn, snowman, snowfall, polyPath } from "./snow-kit.js";

const DEG = Math.PI / 180, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const STEEL = 0x59606a, RED = 0xd9432f, BLUE = 0x2f6fb0, YEL = 0xffc23a, PLASTER = 0xece6d8, DARK = 0x23262e;

// ── 지형 함수로 미리 정해지는 지물 좌표 (트랙 데이터와 건물이 함께 쓴다) ──
export const SITE = (() => {
  const yaw = (d) => Math.atan2(d[0], d[1]) / DEG;
  // 곤돌라: 아래 승강장 → 정상 승강장
  const A = [84, 68], B = [34, -182], L = Math.hypot(B[0] - A[0], B[1] - A[1]), ld = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
  // 스키 점프대
  const JX = -58, zTop = -66, zLip = -2, yTop = height(JX, zTop) + 12, yLip = height(JX, zLip) + 10;
  const ramp = (s) => [JX, yTop + (yLip - yTop) * s + 2.6 * Math.max(0, (s - 0.68) / 0.32) ** 2, zTop + (zLip - zTop) * s];
  // 트레슬 다리(골짜기 t = 0.6), 눈 다리(t = 0.8), 돌다리(t = 0.93)
  const at = (L_, t) => { const p = L_.point(t), d = L_.dir(t); return { x: p[0], z: p[1], d, ry: yaw(d), floor: height(p[0], p[1]) }; };
  const tr = at(GORGE, 0.6), ux = Math.cos(tr.ry * DEG), uz = -Math.sin(tr.ry * DEG);
  tr.deck = Math.min(height(tr.x - ux * 32, tr.z - uz * 32), height(tr.x + ux * 32, tr.z + uz * 32)) - 1.5;
  const fin = at(PISTE, 0.94);
  return {
    lift: { A, B, L, d: ld, ry: yaw(ld) }, jump: { x: JX, zTop, zLip, yTop, yLip, ramp }, trestle: tr, snowBridge: at(GORGE, 0.8), stoneBridge: at(GORGE, 0.93), finish: fin,
    church: { x: 84, z: 186, bx: 72.5, by: 19.4 }, gate: { x: 40, z: 128 }, hotel: { x: -6, z: 206 }, ice: { x: -6, z: [192, 184, 176], tower: 166 }, canopy: { x: 64, z: 150 },
    tree: { x: 18, z: 178 }, man: { x: -14, z: 142 }, rink: { x: -95, z: 172 }, huts: { x: -140, z: 172.2 }, shed: (() => { const r = ROAD.at(-70, 114), d = ROAD.dir(r[1]); return { x: r[2], z: r[3], ry: yaw(d) }; })(),
  };
})();

// ── 마을 ──────────────────────────────────────────────────
function village(w, K, KEEP) {
  const H = (x, z) => w.h(x, z);
  // 시계탑 문 (큰길 북쪽 입구)
  {
    const { x, z } = SITE.gate, y = H(x, z), F = frame(w, x, z, 0, y), F2 = frame(w, x, z, 90, y);
    for (const s of [-1, 1]) { F.box(s * 5, -1, 0, 3, 10, 3.4, STONE, { mat: "std:brick", tile: 3 }); F.box(s * 5, 0, 0, 3.4, 1.2, 3.8, STONE_D, { col: false }); }
    F.box(0, 9, 0, 13, 2.6, 3.4, PLASTER, {}); F.box(0, 8.7, 0, 7.2, 0.4, 3.6, TIMBER_D, { col: false });
    for (const s of [-1, 1]) { F.box(0, 9.25, s * 1.72, 2.1, 2.1, 0.1, 0xfff2c8, { mat: "glow", col: false }); F.box(0, 10.2, s * 1.9, 0.12, 0.9, 0.1, DARK, { col: false }); F.box(0.3, 10.2, s * 1.9, 0.7, 0.12, 0.1, DARK, { col: false }); }
    roof(w, F2, 11.6, 2.2, 13.6, 40, { gable: PLASTER, gmat: "std" });
    F.gap("시계탑 문", 0, 4.6, 0, 0, 6.6, 8.4, 400);
    KEEP.push([x, z, 9]);
  }
  // 광장의 큰 트리와 전구 줄
  {
    const { x, z } = SITE.tree, y = H(x, z);
    w.cyl(x, y, z, 0.9, 5, 0x4f3826, { rt: 0.6 });
    for (let i = 0; i < 5; i++) {
      const t = i / 4, r = 7.4 - t * 5, hh = 7.4 - t * 2, yy = y + 3 + i * 4;
      w.cone(x, yy, z, r, hh, i % 2 ? 0x1f5a3a : 0x24683f, { col: i < 4 });
      w.mesh(K.T.coneO, M(x, yy + hh * 0.42, z, r * 0.66, hh * 0.6, r * 0.66, 0, i * 40, 0), SNOW, "leaf");
      for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.283 + i, rr = r * 0.8; w.box(x + Math.cos(a) * rr, yy + hh * 0.16, z + Math.sin(a) * rr, 0.5, 0.5, 0.5, [0xff5a4a, 0xffd23a, 0x4ad0ff, 0xff7ad0][(k + i) % 4], { mat: "glow", col: false }); }
    }
    w.mesh(PYR, M(x, y + 24.4, z, 0.9, 2.2, 0.9), 0xffe27a, "glow"); w.mesh(PYR, M(x, y + 25.6, z, 0.9, 2.2, 0.9, 180, 0, 0), 0xffe27a, "glow");
    for (const a of [60, 125, 180, 235, 300]) {
      const px = x + Math.cos(a * DEG) * 19, pz = z + Math.sin(a * DEG) * 19, py = H(px, pz);
      w.pipe(px, py, pz, px, py + 8.4, pz, 0.14, 0x2c3138); w.sph(px, py + 8.7, pz, 0.36, WARM, { mat: "glow", col: false });
      garland(w, [px, py + 8.3, pz], [x, y + 16, z], 1.6, 10);
      KEEP.push([px, pz, 3]);
    }
    w.gap("트리 전구 줄 아래", x - 9.5, y + 5.2, z, 0, 12, 8.6, 300);
    KEEP.push([x, z, 21]);
  }
  // 교회와 종탑 (서쪽을 바라본다)
  {
    const { x, z } = SITE.church, y = H(x, z), F = frame(w, x, z, 90, y);
    F.box(0, -1, 2.5, 11, 9, 22, PLASTER, {}); F.box(0, -1.4, 2.5, 11.5, 2.6, 22.5, STONE, { mat: "std:brick", tile: 3, col: false });
    roof(w, F, 8, 5.5, 22, 45, { v: 2.5, gable: PLASTER, gmat: "std", eave: 0x4a5a78 });
    for (const v of [-4, 1, 6, 11]) { win(F, -5.5, 2.6, v, 1.3, 3.6, 2, { color: 0x8fd0ff }); win(F, 5.5, 2.6, v, 1.3, 3.6, 3, { color: 0xffc070 }); }
    F.box(0, 3.6, 13.55, 2.6, 2.6, 0.1, 0xffd88a, { mat: "glow", col: false });
    // 종탑: 몸통 → 뚫린 종루 → 첨탑
    const tv = -11.5;
    F.box(0, -1, tv, 6.5, 18, 6.5, PLASTER, {}); F.box(0, -1.4, tv, 7, 2.6, 7, STONE, { mat: "std:brick", tile: 3, col: false });
    F.box(0, 1.2, tv - 3.3, 1.8, 3, 0.14, 0x6a4a2c, { col: false }); F.box(0, 12.4, tv - 3.3, 2.4, 2.4, 0.12, 0xfff2c8, { mat: "glow", col: false });
    for (const a of [-1, 1]) for (const b of [-1, 1]) F.box(a * 2.75, 17, tv + b * 2.75, 1, 4.6, 1, PLASTER, {});
    F.box(0, 21.6, tv, 7.1, 0.7, 7.1, PLASTER, {}); F.box(0, 22.3, tv, 7.5, 0.3, 7.5, SNOW, { col: false, ao: false });
    place(w, F, PYR, 0, 22.5, tv, 4.9, 13, 4.9, 0x4a5a78, "std"); place(w, F, PYR, 0, 28.4, tv, 2.3, 7.2, 2.3, SNOW, "std");
    w.col.addCapsule(V3(F.X(0, tv), y + 23.5, F.Z(0, tv)), V3(F.X(0, tv), y + 33, F.Z(0, tv)), 1.5); w.col.addSphere(V3(F.X(0, tv), y + 24.8, F.Z(0, tv)), 2.3);
    F.pipe(0, 35.4, tv, 0, 37.6, tv, 0.08, 0xffd88a, { col: false }); F.box(0, 36.6, tv, 0.9, 0.14, 0.14, 0xffd88a, { col: false, mat: "paint" });
    F.sph(0, 20.9, tv, 0.5, 0xd9a441, { mat: "metal", col: false });
    F.gap("종탑 통과", 0, 19.3, tv, 0, 4.2, 4, 700); F.gap("종탑 통과", 0, 19.3, tv, 90, 4.2, 4, 700);
    KEEP.push([x, z, 16], [x - 11.5, z, 8]);
  }
  // 산장 호텔: 두 동 사이의 통로 위로 건물이 이어진다
  {
    const { x, z } = SITE.hotel, y = H(x, z), F = frame(w, x, z, 0, y), F2 = frame(w, x, z, 90, y), W = 0x7a4e2c;
    for (const s of [-1, 1]) { F.box(s * 14.25, 1.2, 0, 21.5, 8.1, 11, W, { mat: "std:wood", tile: 2.4 }); F.box(s * 14.25, -1.6, 0, 21.9, 2.8, 11.4, STONE, { mat: "std:brick", tile: 3 }); }
    F.box(0, 5.6, 0, 7, 3.7, 10.6, W, { mat: "std:wood", tile: 2.4 }); F.box(0, 5.3, 0, 7, 0.3, 11, TIMBER_D, { col: false });
    roof(w, F2, 9.3, 5.5, 50, 34, { gable: W, ovz: 0.9 });
    for (let f = 0; f < 3; f++) for (let u = -23; u <= 23.1; u += 3.55) {
      if (Math.abs(u) < 4.2 && f < 2) continue;
      win(F, u, 1.9 + f * 2.55, -5.5, 1.2, 1.25, 0, { shutter: RED }); win(F, u, 1.9 + f * 2.55, 5.5, 1.2, 1.25, 1, { shutter: RED });
    }
    for (const f of [1, 2]) for (const s of [-1, 1]) { F.box(s * 14.25, 1.25 + f * 2.55, -6.2, 20.6, 0.14, 1.3, TIMBER_D, { col: false }); F.box(s * 14.25, 1.4 + f * 2.55, -6.82, 20.6, 0.8, 0.1, TIMBER_D, { col: false }); F.box(s * 14.25, 2.2 + f * 2.55, -6.82, 20.7, 0.12, 0.22, SNOW, { col: false, ao: false }); }
    F.box(0, 6.4, -5.36, 5.4, 1.1, 0.12, 0xffd88a, { mat: "glow", col: false });
    // 서쪽 끝의 둥근 탑
    F.cyl(-26.4, -1.5, 0, 3.6, 14.5, PLASTER, { rt: 3.4 }); w.cone(F.X(-26.4, 0), y + 13, F.Z(-26.4, 0), 4.5, 7, 0x4a5a78, { mat: "std", grad: [0.85, 1.05] });
    w.mesh(K.T.coneO, M(F.X(-26.4, 0), y + 16, F.Z(-26.4, 0), 2.9, 4.4, 2.9), SNOW, "std");
    for (const a of [0, 90, 180, 270]) F.box(-26.4 + Math.cos(a * DEG) * 3.5, 9.6, Math.sin(a * DEG) * 3.5, a % 180 ? 1 : 0.12, 1.5, a % 180 ? 0.12 : 1, WARM, { mat: "glow", col: false });
    for (const [u, v] of [[-18, -3.5], [14, 2.5]]) { F.box(u, 9.3, v, 1.1, 5.6, 1.1, 0x8d4a3a, { mat: "std:brick", tile: 2 }); F.box(u, 14.9, v, 1.4, 0.24, 1.4, SNOW, { col: false, ao: false }); }
    F.gap("산장 호텔 통로", 0, 3, 0, 0, 6.4, 5, 550);
    KEEP.push([x - 14, z, 15], [x + 14, z, 15], [x - 26, z, 8], [x, z, 12]);
  }
  // 얼음 조각 정원: 얼음 아치 세 개와 얼음 탑
  {
    const { x, z: zs, tower } = SITE.ice, y = H(x, zs[1]);
    for (const z of zs) {
      const F = frame(w, x, z, 0, y);
      for (const s of [-1, 1]) { F.box(s * 3.3, -0.5, 0, 1.5, 8, 1.7, ICE, { mat: "paint", ao: false }); F.box(s * 3.3, 0, 0, 1.9, 0.6, 2.1, 0xdff2fb, { mat: "paint", col: false }); }
      F.box(0, 7.3, 0, 9, 1.4, 1.7, ICE_D, { mat: "paint", ao: false }); F.box(0, 8.7, 0, 9.3, 0.3, 2, SNOW, { col: false, ao: false });
      for (let i = 0; i < 6; i++) place(w, F, K.T.coneO, -2 + i * 0.8, 7.3, 0, 0.22, 0.8 + (i % 3) * 0.4, 0.22, 0xdff2fb, "paint", 0, 180);
      F.gap("얼음 아치", 0, 3.7, 0, 0, 5, 7, 450);
      KEEP.push([x, z, 6]);
    }
    const F = frame(w, x, tower, 0, y);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { F.box(a * 3.6, -0.5, b * 3.6, 1.6, 12, 1.6, a * b > 0 ? ICE : ICE_D, { mat: "paint", ao: false }); place(w, F, PYR, a * 3.6, 13.6, b * 3.6, 1.2, 3, 1.2, 0xdff2fb, "paint"); }
    F.box(0, 11.5, 0, 9.2, 1.3, 9.2, ICE, { mat: "paint", ao: false });
    place(w, F, PYR, 0, 12.8, 0, 5.6, 9, 5.6, ICE_D, "paint"); w.col.addCapsule(V3(x, y + 13.5, tower), V3(x, y + 20, tower), 1.6);
    F.sph(0, 22.3, 0, 0.6, 0x9fe8ff, { mat: "glow", col: false });
    F.cone(0, 0, 0, 0.7, 2, 0x9fe8ff, { mat: "glow", col: false });
    F.gap("얼음 탑", 0, 5.6, 0, 0, 5.4, 10.4, 500); F.gap("얼음 탑", 0, 5.6, 0, 90, 5.4, 10.4, 500);
    KEEP.push([x, tower, 8]);
  }
  // 야시장 천막 터널
  {
    const { x, z } = SITE.canopy, y = H(x, z), F2 = frame(w, x, z, 90, y);
    roof(w, F2, 4.1, 3.1, 28, 20, { gable: RED, gmat: "paint", ov: 0.5, ovz: 0.4 });
    for (let v = -14; v <= 14.1; v += 4.667) for (const u of [-3, 3]) F2.pipe(u, 0, v, u, 4.1, v, 0.13, 0x3a2f28);
    for (let v = -11.7; v <= 12; v += 4.667) {
      F2.sph(0, 3.7, v, 0.26, WARM, { mat: "glow", col: false });
      F2.box(4.5, 0, v, 1.3, 1, 3.2, TIMBER, { mat: "std:wood", tile: 2 }); F2.box(4.6, 2.5, v, 1.9, 0.14, 3.6, (Math.round(v) & 1) ? 0xf2f0ea : YEL, { rz: 14, col: false });
      F2.box(4.5, 1, v, 0.9, 0.4, 2.4, [0xd9772f, 0x35b06a, 0xb44cff][Math.abs(Math.round(v)) % 3], { col: false, mat: "paint" });
    }
    F2.gap("야시장 천막 터널", 0, 2.2, 0, 0, 5, 3.6, 600);
    KEEP.push([x - 9, z, 9], [x + 9, z, 9], [x, z, 9]);
  }
  // 큰 눈사람 (동쪽을 바라본다. 팔 아래로 지나간다)
  {
    const F = snowman(w, SITE.man.x, SITE.man.z, 1, -90);
    for (const s of [-1, 1]) F.gap("눈사람 팔 아래", s * 6.3, 4.3, 0, 0, 4.2, 7.2, 500);
    KEEP.push([SITE.man.x, SITE.man.z, 10]);
  }
  // 산장들
  const acc = [0x3d7a4f, RED, BLUE, 0x8a5a1c], woods = [TIMBER, 0x9a6a3c, 0x74482a, 0xa67848];
  [[26, 132, -90, 9, 8, 2], [54, 136, 90, 9, 8, 2], [56, 168, 90, 9, 8, 2], [54, 183, 90, 9, 8, 2], [58, 208, 90, 10, 8, 3], [29, 210, -90, 9, 8, 2], [84, 140, 180, 10, 8, 2], [104, 166, 90, 9, 8, 2],
    [104, 206, 0, 9, 8, 2], [82, 212, 0, 9, 8, 2], [-24, 130, 180, 9, 8, 2], [132, 140, -90, 9, 8, 2], [-44, 216, 0, 8, 7, 1]].forEach(([x, z, ry, sx, sz, fl], i) => {
    chalet(w, x, z, ry, { sx, sz, floors: fl, accent: acc[i % 4], wood: woods[(i * 3) % 4] });
    KEEP.push([x, z, 8.5]);
  });
  w.gap("산장 골목", 56, H(56, 175.5) + 4, 175.5, 90, 4.2, 7, 500);
  w.gap("산장 골목", 22, H(22, 208) + 4, 208, 0, 4.2, 7, 500);
  // 가로등, 눈 더미, 썰매
  for (let z = 142; z <= 222; z += 16) for (const s of [-1, 1]) { w.lamp(40 + s * 5.4, z, 5.6, WARM, s > 0 ? -90 : 90, 1.1); KEEP.push([40 + s * 5.4, z, 2]); }
  for (const [x, z, s] of [[33, 160, 1.6], [47, 196, 1.3], [12, 160, 1.2], [70, 162, 1.5], [92, 200, 1.4], [-24, 160, 1.5]]) K.rock(x, z, s, SNOW, false);
  for (const [x, z, ry, c] of [[30, 150, 20, RED], [48, 214, -30, BLUE]]) { const F = frame(w, x, z, ry, H(x, z)); F.box(0, 0.25, 0, 0.9, 0.3, 2.2, c, { mat: "paint", col: false }); for (const s of [-0.4, 0.4]) F.box(s, 0, 0, 0.08, 0.25, 2.5, DARK, { col: false }); }
}

// ── 얼어붙은 호수: 얼음판·빙상장·얼음 낚시 오두막·이글루·선착장 ──
function lake(w, K, KEEP) {
  // 얼음판(광택 있는 덮개). 호수 타원을 따라 색이 얼룩진다
  {
    const nr = 9, na = 56, pos = [], col = [], idx = [], c = new THREE.Color();
    for (let j = 0; j <= nr; j++) for (let i = 0; i <= na; i++) {
      const a = (i / na) * Math.PI * 2, k = (j / nr) * 0.985, x = LAKE.x + Math.cos(a) * LAKE.rx * k, z = LAKE.z + Math.sin(a) * LAKE.rz * k;
      pos.push(x, 0.045, z);
      const n = Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.14 + 0.4) * 0.5 + Math.sin(x * 0.045 + z * 0.06) * 0.5;
      c.set(n > 0.25 ? 0xdcf0fa : n > -0.2 ? ICE : 0x86c6e6); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const k = j * (na + 1) + i; idx.push(k, k + 1, k + na + 1, k + 1, k + na + 2, k + na + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = w.material("paint"); m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1;
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; w.scene.add(mesh); w.disposables.push(g, m);
    const pg = new THREE.CircleGeometry(POND.r - 0.5, 20); pg.rotateX(-Math.PI / 2); w.mesh(pg, M(POND.x, 0.12, POND.z), ICE, "paint");
  }
  // 빙상장
  {
    const { x, z } = SITE.rink, F = frame(w, x, z, 0, 0);
    for (const s of [-1, 1]) {
      F.box(0, 0, s * 10, 36.3, 1.1, 0.3, 0xf4f6f8, { mat: "paint" }); F.box(0, 1.1, s * 10, 36.3, 0.14, 0.34, RED, { col: false, mat: "paint" });
      F.box(s * 18, 0, 0, 0.3, 1.1, 20, 0xf4f6f8, { mat: "paint" }); F.box(s * 18, 1.1, 0, 0.34, 0.14, 20, BLUE, { col: false, mat: "paint" });
      F.box(s * 6, 0.12, 0, 0.3, 0.02, 19.6, BLUE, { col: false, ao: false }); F.box(s * 15, 0.12, 0, 0.12, 0.02, 19.6, RED, { col: false, ao: false });
      // 골대
      for (const dv of [-0.9, 0.9]) F.pipe(s * 15.2, 0, dv, s * 15.2, 1.2, dv, 0.05, RED, { col: false }); F.pipe(s * 15.2, 1.2, -0.9, s * 15.2, 1.2, 0.9, 0.05, RED, { col: false }); F.box(s * 15.8, 0, 0, 0.1, 1.1, 1.8, 0xf2f2f2, { col: false });
      for (const t of [-1, 1]) { F.pipe(s * 18, 0, t * 10, s * 18, 8, t * 10, 0.13, 0x2c3138); F.sph(s * 18, 8.3, t * 10, 0.4, 0xfff2c8, { mat: "glow", col: false }); }
    }
    F.box(0, 0.12, 0, 0.3, 0.02, 19.6, RED, { col: false, ao: false });
    for (const u of [-12, 0, 12]) { F.pipe(u, 0, -10.4, u, 8, -10.4, 0.1, 0x2c3138); F.pipe(u, 0, 10.4, u, 8, 10.4, 0.1, 0x2c3138); garland(w, [x + u, 8, z - 10.4], [x + u, 8, z + 10.4], 1.3, 12); }
    for (const s of [-1, 1]) garland(w, [x - 18, 8, z + s * 10], [x + 18, 8, z + s * 10], 1, 16);
    F.gap("빙상장 전구 줄 아래", 0, 3.6, 0, 90, 17, 5, 300);
    // 스케이터 (작은 인형 네 개가 링크를 돈다)
    const sk = [RED, BLUE, YEL, 0x35b06a].map((c, i) => {
      const g = prop(w, [[new THREE.BoxGeometry(0.5, 0.9, 0.34), M(0, 1.25, 0), c], [new THREE.BoxGeometry(0.42, 0.8, 0.3), M(0, 0.42, 0), 0x2a3340], [BALL, M(0, 1.95, 0, 0.24, 0.24, 0.24), 0xf2c9a0], [new THREE.BoxGeometry(0.5, 0.16, 0.5), M(0, 2.16, 0), c]]);
      w.rider(g, [[0, 0.95, 0, 0.35, 0.95, 0.35]]);
      return { g, ph: i * 1.7, rx: 13 - (i % 2) * 5, rz: 7 - (i % 2) * 2.5, sp: (i % 2 ? -1 : 1) * (0.42 + i * 0.05) };
    });
    w.updaters.push((dt, t) => { for (const s of sk) { const a = s.ph + t * s.sp; s.g.position.set(x + Math.cos(a) * s.rx, 0.05, z + Math.sin(a) * s.rz); s.g.rotation.y = -a + (s.sp > 0 ? Math.PI : 0); } });
  }
  // 얼음 낚시 오두막
  const hut = (x, z, ry, c) => {
    const F = frame(w, x, z, ry, 0);
    F.box(0, 0, 0, 3.2, 2.4, 3.2, c, { mat: "paint" }); roof(w, F, 2.4, 1.6, 3.2, 34, { gable: c, gmat: "paint", ov: 0.3, ovz: 0.3, th: 0.3 });
    F.box(0, 0, -1.62, 0.9, 1.8, 0.08, TIMBER_D, { col: false }); win(F, 1.6, 1.1, 0, 0.8, 0.7, 3);
    F.pipe(1, 2.6, 0.9, 1, 4.3, 0.9, 0.1, DARK, { col: false });
    F.cyl(0.4, 0.09, -3.4, 0.55, 0.04, 0x16324a, { col: false, ao: false }); F.pipe(1.1, 0, -3.4, 1.1, 1.1, -3.4, 0.03, DARK, { col: false }); F.box(1.3, 0.9, -3.4, 0.4, 0.26, 0.03, RED, { col: false, ao: false });
  };
  const hx = SITE.huts.x, hz = SITE.huts.z;
  hut(hx, hz - 4.6, 90, RED); hut(hx, hz + 4.6, 90, 0x2a9d8f); hut(-124, 190, 30, YEL); hut(-152, 158, -40, BLUE); hut(-118, 152, 200, 0xb44cff);
  w.gap("얼음 낚시 오두막 사이", hx, 2.5, hz, 90, 5, 4.6, 600);
  // 이글루 마을 (북동 호숫가)
  for (const [x, z, r, a] of [[-52, 138, 3.2, 200], [-60, 131, 2.6, 160], [-45, 130, 2.8, 250]]) {
    const y = w.h(x, z);
    w.mesh(DOME, M(x, y - 0.1, z, r, r * 0.85, r), 0xf4f8fd, "std"); w.col.addSphere(V3(x, y, z), r * 0.92);
    w.box(x + Math.cos(a * DEG) * r, y - 0.1, z + Math.sin(a * DEG) * r, 1.6, 1.5, 1.6, SNOW_SH, { ry: -a, col: false }); w.box(x + Math.cos(a * DEG) * (r + 0.76), y, z + Math.sin(a * DEG) * (r + 0.76), 0.9, 1.1, 0.12, 0xffb060, { ry: -a + 90, mat: "glow", col: false });
    KEEP.push([x, z, r + 2.5]);
  }
  // 선착장과 보트 창고 (남쪽 호숫가)
  {
    const F = frame(w, -100, 209, 0, 0);
    F.box(0, 0.6, 0, 2.6, 0.22, 10, TIMBER, { mat: "std:wood", tile: 2 });
    for (const v of [-4.5, 0, 4.5]) for (const s of [-1.2, 1.2]) F.pipe(s, -0.5, v, s, 1.5, v, 0.13, TIMBER_D, { col: false });
    F.box(3.6, 0.05, -3.6, 1.4, 0.6, 4, RED, { mat: "paint", ry: 12 }); F.box(3.6, 0.6, -3.6, 1.5, 0.1, 4.1, SNOW, { col: false, ao: false, ry: 12 });
    chalet(w, -112, 214, 180, { sx: 6, sz: 7, floors: 1, accent: BLUE, wood: 0x9a6a3c });
    KEEP.push([-100, 211, 6], [-112, 214, 7]);
  }
}

// ── 스키장: 곤돌라·슬로프·결승 아치·스노파크·중턱 산장 ──
function hall(w, x, z, ry, color, out, name) {
  const g = w.h(x, z), F = frame(w, x, z, ry, g);
  for (const a of [-1, 1]) for (const b of [-1, 1]) F.box(a * 6.2, -1.5, b * 7, 0.9, 12.9, 0.9, STEEL, { mat: "paint" });
  roof(w, F, 11.4, 6.7, 15.6, 18, { gable: color, gmat: "paint" });
  F.box(0, -0.2, 0, 12, 0.3, 14.6, 0xaab0b8, { mat: "std:concrete", tile: 6, col: false });
  F.box(0, 0, out * 5.6, 5, 3.2, 3, color, { mat: "paint" }); win(F, 0, 1.2, out * 5.6 - out * 1.5, 3.4, 1.3, out > 0 ? 0 : 1);
  F.cyl(0, 9.5, out * 2.4, 2.5, 0.3, YEL, { mat: "paint", col: false }); F.pipe(0, 9.6, out * 2.4, 0, 11.4, out * 2.4, 0.25, STEEL, { col: false });
  F.box(0, 11.4, -out * 7.8, 6, 1.4, 0.2, 0xfff2c8, { mat: "glow", col: false });
  F.gap(name, 0, 2.5, -out * 2, 90, 9, 4.2, 500);
  return g;
}
function ski(w, K, KEEP) {
  const H = (x, z) => w.h(x, z);
  // 곤돌라
  {
    const { A, B, d, ry } = SITE.lift, N = 9, ux = Math.cos(ry * DEG), uz = -Math.sin(ry * DEG);
    hall(w, A[0], A[1], ry, BLUE, -1, "곤돌라 승강장 통과"); hall(w, B[0], B[1], ry, RED, 1, "정상 승강장 통과");
    KEEP.push([A[0], A[1], 13], [B[0], B[1], 13]);
    const nodes = [];
    for (let i = 0; i <= N; i++) { const t = i / N, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t, g = H(x, z); nodes.push({ x, z, g, y: g + (i === 0 || i === N ? 9.6 : 13) }); }
    // 줄이 땅에 너무 가까운 구간은 양쪽 기둥을 높인다
    for (let it = 0; it < 5; it++) for (let i = 0; i < N; i++) for (let k = 1; k < 6; k++) {
      const s = k / 6, a = nodes[i], b = nodes[i + 1], def = 9.5 - (a.y + (b.y - a.y) * s - H(a.x + (b.x - a.x) * s, a.z + (b.z - a.z) * s));
      if (def > 0) { if (i > 0) a.y += def * (i + 1 < N ? 0.6 : 1.1); if (i + 1 < N) b.y += def * (i > 0 ? 0.6 : 1.1); }
    }
    for (let i = 1; i < N; i++) {
      const n = nodes[i], F = frame(w, n.x, n.z, ry, 0);
      w.cyl(n.x, n.g - 1.5, n.z, 0.55, n.y - n.g + 1.5, 0xd8dde4, { rt: 0.34, mat: "paint" });
      F.box(0, n.y - 0.15, 0, 6.6, 0.42, 0.55, BLUE, { mat: "paint" }); F.box(0, n.y + 0.27, 0, 6.7, 0.16, 0.65, SNOW, { col: false, ao: false });
      for (const s of [-2.4, 2.4]) F.box(s, n.y - 0.42, 0, 0.3, 0.3, 2.4, DARK, { col: false });
      F.box(0, n.g + 2.2, -0.6, 0.9, 0.9, 0.06, YEL, { col: false, mat: "paint" });
      KEEP.push([n.x, n.z, 5]);
    }
    const side = (s) => nodes.map((n) => [n.x + ux * s * 2.4, n.y, n.z + uz * s * 2.4]);
    const up = side(1), down = side(-1);
    for (const L of [up, down]) for (let i = 0; i < N; i++) beam(w, L[i], L[i + 1], 0.09, 0x22262c, { col: false });
    const path = polyPath([...up, ...down.reverse()], true);
    const cabin = (c) => prop(w, [[new THREE.BoxGeometry(1.9, 2.2, 2.4), M(0, -3.45, 0), c], [new THREE.BoxGeometry(1.94, 0.85, 2.44), M(0, -3.1, 0), 0x2a3340], [new THREE.BoxGeometry(0.12, 2.3, 0.12), M(0, -1.15, 0), 0x2c3138], [new THREE.BoxGeometry(2.05, 0.18, 2.55), M(0, -2.28, 0), 0xf2f6fb], [new THREE.BoxGeometry(0.5, 0.22, 0.9), M(0, 0, 0), 0x2c3138]]);
    const cars = Array.from({ length: 8 }, (_, i) => { const g = cabin(i % 2 ? RED : YEL); w.rider(g, [[0, -3.4, 0, 0.98, 1.15, 1.25]]); return g; });
    w.updaters.push((dt, t) => { for (let i = 0; i < cars.length; i++) { const p = path.at(t * 4 + (i * path.len) / cars.length); cars[i].position.set(p[0], p[1], p[2]); cars[i].rotation.y = p[3]; } });
    for (const i of [2, 5]) {
      const a = nodes[i], b = nodes[i + 1], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, g = H(mx, mz), top = (a.y + b.y) / 2 - 5;
      w.gap("곤돌라 줄 아래", mx, (g + top) / 2 + 1.2, mz, ry + 90, 8, Math.max(3, top - g - 4.6), 350);
    }
    // 아래 승강장 옆 매표소 산장
    chalet(w, 102, 86, 200, { sx: 10, sz: 8, floors: 2, accent: BLUE, wood: 0x9a6a3c }); KEEP.push([102, 86, 9]);
  }
  // 슬로프 가장자리 폴대
  for (let t = 0.05; t < 0.9; t += 0.045) {
    const p = PISTE.point(t), d = PISTE.dir(t);
    for (const s of [-1, 1]) { const x = p[0] - d[1] * s * 16, z = p[1] + d[0] * s * 16, y = H(x, z); beam(w, [x, y - 0.3, z], [x, y + 2.4, z], 0.14, 0xff7a1a, { col: false }); w.box(x, y + 2.4, z, 0.5, 0.36, 0.06, s > 0 ? RED : BLUE, { col: false, ao: false, ry: Math.atan2(d[0], d[1]) / DEG }); }
  }
  // 결승 아치
  {
    const f = SITE.finish, y = H(f.x, f.z), F = frame(w, f.x, f.z, f.ry, y);
    for (const s of [-1, 1]) { F.box(s * 6.6, -1.5, 0, 1.7, 8, 1.7, RED, { mat: "paint" }); F.box(s * 6.6, 6.5, 0, 1.9, 0.3, 1.9, SNOW, { col: false, ao: false }); }
    F.box(0, 6.2, 0, 14.9, 1.8, 1.7, RED, { mat: "paint" }); F.box(0, 8, 0, 15, 0.3, 1.9, SNOW, { col: false, ao: false });
    for (const s of [-1, 1]) F.box(0, 5, s * 0.9, 11.4, 1.1, 0.08, 0xffffff, { mat: "std:checker", tile: 1.1, col: false });
    for (const s of [-1, 1]) for (let v = 4; v < 20; v += 4) { F.pipe(s * 8, -0.3, v, s * 8, 1.2, v, 0.06, BLUE, { col: false }); F.box(s * 8, 0.5, v + 2, 0.06, 0.6, 4, v % 8 ? YEL : 0xf2f2f2, { col: false, ao: false }); }
    F.gap("결승 아치", 0, 2.7, 0, 0, 11.2, 4.8, 400);
    KEEP.push([f.x, f.z, 12]);
  }
  // 스노파크 (슬로프 서쪽 아래): 키커 둘, 레인보우 레일, 월 라이드
  {
    const x0 = 2, z0 = 50, y = H(x0, z0), F = frame(w, x0, z0, 0, y);
    for (const [u, v, s] of [[-8, -10, 1], [-10, 10, 1.4]]) { F.box(u, -1.2 * s, v, 5 * s, 2.4 * s, 7 * s, SNOW, { rx: 16, ao: false }); F.box(u, 0.9 * s, v + 3.3 * s, 5 * s, 0.14, 0.4, BLUE, { col: false, ao: false }); }
    const ry_ = w.h(F.X(4, 0), F.Z(4, 0)) - y;
    w.mesh(HALFTORUS, M(F.X(4, 0), y + ry_ - 0.2, F.Z(4, 0), 4.2, 4.2, 4.2, 0, 90, 0), 0xff4fa3, "paint");
    for (let i = 0; i < 8; i++) { const a0 = (i / 8) * Math.PI, a1 = ((i + 1) / 8) * Math.PI; w.col.addCapsule(V3(F.X(4, Math.cos(a0) * 4.2), y + ry_ - 0.2 + Math.sin(a0) * 4.2, F.Z(4, Math.cos(a0) * 4.2)), V3(F.X(4, Math.cos(a1) * 4.2), y + ry_ - 0.2 + Math.sin(a1) * 4.2, F.Z(4, Math.cos(a1) * 4.2)), 0.3); }
    F.gap("레인보우 레일 아래", 4, ry_ + 1.9, 0, 90, 4.4, 2, 650);
    F.box(-17, -0.5, 0, 0.5, 5, 9, 0x2a9d8f, { mat: "paint", rz: -14 }); F.box(-17.6, 4.3, 0, 0.6, 0.3, 9.2, SNOW, { col: false, ao: false });
    KEEP.push([x0 - 8, z0, 16], [x0 + 4, z0, 7]);
  }
  // 중턱 산장 식당과 테라스
  {
    const [mx, mz] = flat("mid"), x = mx + 16, z = mz - 2, y = H(x, z);
    chalet(w, x, z, 90, { sx: 11, sz: 9, floors: 2, accent: RED, y });
    const F = frame(w, x, z, 90, y);
    F.box(0, 4.1, -8, 10, 0.3, 6.6, TIMBER_D, { mat: "std:wood", tile: 2 }); F.box(0, 4.4, -8, 10.3, 0.4, 6.9, SNOW, { col: false, ao: false });
    for (const u of [-4.6, 4.6]) F.pipe(u, -2, -10.9, u, 4.1, -10.9, 0.16, TIMBER_D);
    F.box(0, -1.6, -8, 10.4, 1.9, 6.8, STONE, { mat: "std:brick", tile: 3 });
    for (const u of [-2.6, 2.6]) { F.cyl(u, 0.3, -8, 0.7, 0.8, TIMBER, { col: false }); F.cone(u, 2.2, -8, 1.5, 0.9, u > 0 ? RED : YEL, { mat: "paint", col: false }); F.pipe(u, 1.1, -8, u, 2.3, -8, 0.04, DARK, { col: false }); }
    F.gap("산장 식당 테라스", 0, 2.3, -8, 90, 6, 3.2, 600);
    KEEP.push([x, z, 12], [mx, mz, 10]);
  }
  // 슬로프 위의 스키어와 설상차
  {
    const skier = (c) => prop(w, [[new THREE.BoxGeometry(0.5, 0.8, 0.4), M(0, 1.15, 0.1, 1, 1, 1, 18, 0, 0), c], [new THREE.BoxGeometry(0.4, 0.7, 0.34), M(0, 0.45, 0), 0x2a3340], [BALL, M(0, 1.8, 0.2, 0.22, 0.22, 0.22), 0xf2c9a0], [new THREE.BoxGeometry(0.12, 0.05, 1.7), M(-0.15, 0.04, 0), 0xffe27a], [new THREE.BoxGeometry(0.12, 0.05, 1.7), M(0.15, 0.04, 0), 0xffe27a]]);
    const sk = [RED, 0x35b06a, 0xb44cff].map((c, i) => { const g = skier(c); w.rider(g, [[0, 0.9, 0, 0.35, 0.9, 0.5]]); return { g, ph: i / 3 }; });
    const cat = prop(w, [[new THREE.BoxGeometry(2.6, 1.0, 4.6), M(0, 0.9, 0), RED], [new THREE.BoxGeometry(2.2, 1.3, 2), M(0, 2.0, -0.7), 0xf2f0ea], [new THREE.BoxGeometry(2.24, 0.7, 1.6), M(0, 2.2, -0.9), 0x2a3340], [new THREE.BoxGeometry(0.7, 0.8, 4.9), M(-1.25, 0.4, 0), DARK], [new THREE.BoxGeometry(0.7, 0.8, 4.9), M(1.25, 0.4, 0), DARK], [new THREE.BoxGeometry(3.6, 0.9, 0.3), M(0, 0.6, -2.9, 1, 1, 1, -20, 0, 0), YEL], [new THREE.BoxGeometry(0.3, 0.2, 0.3), M(0, 2.8, -0.2), 0xffa020]]);
    w.rider(cat, [[0, 1.3, 0, 1.6, 1.4, 2.6]]);
    const put = (g, t, off, fwd) => {
      const p = PISTE.point(t), d = PISTE.dir(t), x = p[0] - d[1] * off, z = p[1] + d[0] * off, y = H(x, z), e = 1.5, dy = (H(x + d[0] * e, z + d[1] * e) - y) / e;
      g.position.set(x, y, z); g.rotation.set(Math.atan(dy) * fwd, Math.atan2(d[0] * fwd, d[1] * fwd) + Math.PI, 0, "YXZ");
    };
    w.updaters.push((dt, t) => {
      for (const s of sk) { const u = (t / 46 + s.ph) % 1; put(s.g, 0.06 + u * 0.84, -13 + Math.sin(u * 40 + s.ph * 9) * 1.4, 1); }
      const u = (t / 90) % 2, k = u < 1 ? u : 2 - u; put(cat, 0.5 + k * 0.38, 13.6, u < 1 ? 1 : -1);
    });
  }
}

// ── 스키 점프대와 심판탑 ──
function skiJump(w, K, KEEP) {
  const J = SITE.jump, x = J.x, G = 0x2a9d8f, n = 12;
  // 출발 탑
  { const y = w.h(x, J.zTop - 4); w.box(x, y - 2, J.zTop - 4, 5.4, J.yTop - y + 2, 5.4, PLASTER, {}); const F = frame(w, x, J.zTop - 4, 0, 0); F.box(0, J.yTop, 0, 5.8, 3, 5.8, G, { mat: "paint" }); roof(w, F, J.yTop + 3, 2.9, 5.8, 28, { gable: G, gmat: "paint" }); win(F, 0, J.yTop + 0.9, 2.9, 2.4, 1.3, 1); F.box(0, J.yTop - 6, 2.74, 2.8, 2.8, 0.1, 0xffffff, { mat: "std:checker", tile: 1.4, col: false }); }
  // 활주로(인런)
  for (let i = 0; i < n; i++) {
    const a = J.ramp(i / n), b = J.ramp((i + 1) / n), dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dy, dz), rx = Math.atan2(-dy, dz) / DEG;
    w.box(x, (a[1] + b[1]) / 2 - 0.3, (a[2] + b[2]) / 2, 4.4, 0.5, len + 0.15, SNOW, { rx, ao: false });
    for (const s of [-1, 1]) { w.box(x + s * 2.3, (a[1] + b[1]) / 2 - 0.1, (a[2] + b[2]) / 2, 0.2, 1.0, len + 0.15, G, { rx, mat: "paint", col: false, ao: false }); w.box(x + s * 0.8, (a[1] + b[1]) / 2 + 0.2, (a[2] + b[2]) / 2, 0.14, 0.04, len, BLUE, { rx, col: false, ao: false }); }
  }
  // 받침 구조(벤트)와 가새
  const bents = [0.14, 0.36, 0.58, 0.8, 0.98];
  for (const s of bents) {
    const p = J.ramp(s);
    for (const sd of [-1, 1]) { const gy = w.h(x + sd * 4, p[2]), bx = x + sd * (2 + (p[1] - gy) * 0.13); beam(w, [x + sd * 2, p[1] - 0.4, p[2]], [bx, w.h(bx, p[2]) - 0.6, p[2]], 0.55, STEEL); }
    const g0 = w.h(x, p[2]), hh = p[1] - g0;
    for (let k = 1; k * 7 < hh - 2; k++) { const yy = p[1] - k * 7, wd = 2 + k * 7 * 0.13; beam(w, [x - wd, yy, p[2]], [x + wd, yy, p[2]], 0.32, STEEL, { col: false }); if (k > 0) beam(w, [x - wd, yy, p[2]], [x + wd - 0.9, yy + 7, p[2]], 0.2, STEEL, { col: false }); }
    KEEP.push([x, p[2], 6 + hh * 0.15]);
  }
  for (const s of [0.47, 0.69]) { const p = J.ramp(s), g = Math.max(w.h(x, p[2] - 3.5), w.h(x, p[2] + 3.5)) + 0.6, top = Math.min(p[1], J.ramp(s + 0.055)[1]) - 1.2; w.gap("스키 점프대 아래", x, (g + top) / 2, p[2], 90, 7, top - g, 500); }
  const lip = J.ramp(1);
  w.gap("점프대 도약", x, lip[1] + 2.5, lip[2] + 0.5, 0, 4, 4, 600);
  // 착지 사면의 기준선과 광고판
  for (const [z, c] of [[34, BLUE], [50, RED]]) for (let u = -9; u <= 9; u += 3) { const y = w.h(x + u, z); w.box(x + u, y + 0.05, z, 2.6, 0.08, 0.5, c, { col: false, ao: false, rx: 0 }); }
  KEEP.push([x, 34, 12], [x, 50, 12], [x, 12, 10], [x, J.zTop - 4, 8]);
  // 심판탑
  {
    const [fx, fz] = flat("judge"), tx = fx - 9, tz = fz - 6, y = w.h(tx, tz);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) w.pipe(tx + dx * 1.25, y - 0.6, tz + dz * 1.25, tx + dx, y + 12, tz + dz, 0.22, TIMBER_D);
    for (const dy of [4.2, 8.4]) for (const [a, b] of [[[-3, -3], [3, -3]], [[3, -3], [3, 3]], [[3, 3], [-3, 3]], [[-3, 3], [-3, -3]]]) { const k = 1.2 - dy * 0.016; beam(w, [tx + a[0] * k, y + dy, tz + a[1] * k], [tx + b[0] * k, y + dy, tz + b[1] * k], 0.2, TIMBER_D, { mat: "std" }); }
    const F = frame(w, tx, tz, 0, y);
    F.box(0, 12, 0, 8, 0.3, 8, TIMBER, { mat: "std:wood", tile: 2 }); F.box(0, 12.3, 0.6, 6.4, 2.8, 5.4, G, { mat: "paint" }); win(F, 0, 13.1, -2.1, 5, 1.3, 0);
    roof(w, F, 15.1, 3.6, 7, 24, { gable: G, gmat: "paint", v: 0.4 });
    w.gap("심판탑 다리 사이", tx, y + 6, tz, 0, 6, 11, 400); w.gap("심판탑 다리 사이", tx, y + 6, tz, 90, 6, 11, 400);
    KEEP.push([tx, tz, 10], [fx, fz, 10]);
  }
}

// ── 정상: 천문대 돔, 송신탑, 깃발 줄 ──
function summit(w, K, KEEP) {
  const [sx, sz] = flat("summit"), y = w.h(sx, sz), WH = 0xf2f0ea;
  // 천문대
  { const x = sx - 5, z = sz - 4; w.cyl(x, y - 3, z, 5, 8, PLASTER, { mat: "std" }); w.cyl(x, y + 5, z, 5.3, 0.5, STEEL, { col: false, mat: "paint" });
    w.mesh(DOME, M(x, y + 5.4, z, 5.1, 5.1, 5.1), 0xdfe6ee, "metal"); w.col.addSphere(V3(x, y + 5.6, z), 5);
    w.mesh(DOME, M(x, y + 5.45, z, 5.16, 5.16, 1.1, 0, 35, 0), 0x2a3340, "paint"); win({ box: (u, yy, v, a, b, c, col, o) => w.box(x + u, y + yy, z + v, a, b, c, col, o) }, 0, 1.4, 5, 1.6, 1.2, 1);
    w.box(x + 7, y - 2, z + 5, 4.5, 5, 4, 0x8d97a8, { mat: "std:corrug", tile: 2 }); w.box(x + 7, y + 3, z + 5, 4.9, 0.4, 4.4, SNOW, { col: false, ao: false }); }
  // 송신탑
  const mx = sx + 6, mz = sz + 5, Ht = 30, leg = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2 + 0.5; return [Math.cos(a), Math.sin(a)]; });
  for (let lv = 0; lv < 6; lv++) {
    const ya = y + lv * 5, yb = ya + 5, ra = 2 - lv * 0.28, rb = 2 - (lv + 1) * 0.28, col = lv % 2 ? WH : RED;
    for (let i = 0; i < 3; i++) {
      const [c0, s0] = leg[i], [c1, s1] = leg[(i + 1) % 3];
      beam(w, [mx + c0 * ra, ya, mz + s0 * ra], [mx + c0 * rb, yb, mz + s0 * rb], 0.24, col);
      beam(w, [mx + c0 * rb, yb, mz + s0 * rb], [mx + c1 * rb, yb, mz + s1 * rb], 0.14, col, { col: false });
      beam(w, [mx + c0 * ra, ya, mz + s0 * ra], [mx + c1 * rb, yb, mz + s1 * rb], 0.12, col, { col: false });
    }
  }
  w.pipe(mx, y + Ht, mz, mx, y + Ht + 7, mz, 0.1, WH); w.sph(mx, y + Ht + 7.3, mz, 0.4, 0xff3030, { mat: "glow", col: false }); w.sph(mx, y + 15.4, mz, 0.34, 0xff3030, { mat: "glow", col: false });
  for (const [dy, a] of [[21, 0.6], [25, 2.9]]) w.mesh(K.T.col8, M(mx + Math.cos(a) * 1.3, y + dy, mz + Math.sin(a) * 1.3, 1.1, 0.35, 1.1, 0, -a / DEG, 90), WH, "paint");
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 3 + 0.5, gx = mx + Math.cos(a) * 20, gz = mz + Math.sin(a) * 20; beam(w, [gx, w.h(gx, gz), gz], [mx, y + 24, mz], 0.1, 0xb9c0c8); KEEP.push([gx, gz, 3]); }
  w.gap("송신탑 버팀줄 사이", mx, y + 13, mz, 30 + 0.5 / DEG, 8, 12, 500);
  // 정상 표지와 오색 깃발 줄
  const cx = sx + 9, cz = sz - 9, cy = w.h(cx, cz);
  w.cone(cx, cy - 0.5, cz, 2, 2.6, STONE, { mat: "std:rock", grad: [0.8, 1.05] }); w.pipe(cx, cy + 1.5, cz, cx, cy + 6, cz, 0.1, TIMBER_D);
  garland(w, [cx, cy + 5.8, cz], [mx, y + 14, mz], 0.8, 14, [0x3f7fd0, 0xf2f2f2, RED, 0x35b06a, YEL]);
  garland(w, [cx, cy + 5.8, cz], [sx - 5, y + 10.4, sz - 4], 0.8, 12, [0x3f7fd0, 0xf2f2f2, RED, 0x35b06a, YEL]);
  w.gap("정상 깃발 줄 아래", (cx + mx) / 2, y + 5, (cz + mz) / 2, Math.atan2(mz - cz, -(mx - cx)) / DEG, 10, 7, 450);
  KEEP.push([sx, sz, 17]);
}

// ── 얼음 골짜기: 트레슬 다리, 눈 다리, 돌다리, 등불 ──
function gorge(w, K, KEEP) {
  const H = (x, z) => w.h(x, z);
  // 나무 트레슬 다리
  {
    const T = SITE.trestle, F = frame(w, T.x, T.z, T.ry, 0), dk = T.deck;
    let u0 = -8, u1 = 8;
    while (F.h(u0, 0) < dk - 0.4 && u0 > -70) u0 -= 1;
    while (F.h(u1, 0) < dk - 0.4 && u1 < 70) u1 += 1;
    u0 -= 2; u1 += 2;
    F.box((u0 + u1) / 2, dk - 0.45, 0, u1 - u0, 0.45, 4, TIMBER, { mat: "std:wood", tile: 2 }); F.box((u0 + u1) / 2, dk, 0, u1 - u0, 0.2, 3.4, SNOW, { col: false, ao: false });
    for (const s of [-1.9, 1.9]) { F.box((u0 + u1) / 2, dk + 1.05, s, u1 - u0, 0.14, 0.14, TIMBER_D, { col: false }); for (let u = u0 + 1; u < u1; u += 3) F.beam(u, dk, s, u, dk + 1.1, s, 0.12, TIMBER_D, { mat: "std", col: false }); }
    for (const s of [-1.8, 1.8]) F.box(0, dk - 2.2, s, 21, 1.8, 0.3, TIMBER_D, { mat: "std:wood", tile: 2 });      // 가운데 경간의 큰 보
    for (let u = u0 + 5; u < u1 - 3; u += 8) {
      if (Math.abs(u) < 9) continue;
      const hgt = dk - F.h(u, 0);
      if (hgt < 3) continue;
      for (const s of [-1, 1]) { const bv = s * (1.7 + hgt * 0.1); F.beam(u, dk - 0.5, s * 1.7, u, F.h(u, bv) - 0.8, bv, 0.5, TIMBER_D, { mat: "std" }); }
      for (let k = 1; k * 8 < hgt - 2; k++) { const yy = dk - k * 8, wd = 1.7 + k * 0.8; F.beam(u, yy, -wd, u, yy, wd, 0.3, TIMBER_D, { mat: "std", col: false }); F.beam(u, yy, -wd, u, yy + 8, wd - 0.8, 0.2, TIMBER_D, { mat: "std", col: false }); }
      KEEP.push([F.X(u, 0), F.Z(u, 0), 6]);
    }
    F.gap("트레슬 다리 아래", 0, (T.floor + dk) / 2, 0, 0, 15, dk - T.floor - 8, 400);
    F.gap("트레슬 다리 위 스치기", 0, dk + 2.6, 0, 0, 30, 3.4, 450);
    for (const u of [u0 + 2, u1 - 2]) { for (const s of [-2.2, 2.2]) { F.pipe(u, dk - 1, s, u, dk + 3.2, s, 0.16, TIMBER_D); F.sph(u, dk + 3.5, s, 0.34, WARM, { mat: "glow", col: false }); } KEEP.push([F.X(u, 0), F.Z(u, 0), 7]); }
  }
  // 눈 다리(얼음 아치)
  {
    const S = SITE.snowBridge, nx = S.d[1], nz = -S.d[0];
    rockArch(w, S.x - nx * 17, S.z - nz * 17, S.x + nx * 17, S.z + nz * 17, S.floor + 2, 22, 3.4, 0xe6f1fa);
    w.gap("눈 다리 아래", S.x, S.floor + 9.5, S.z, S.ry, 17, 14, 400);
    KEEP.push([S.x - nx * 17, S.z - nz * 17, 8], [S.x + nx * 17, S.z + nz * 17, 8]);
  }
  // 돌다리 (골짜기 어귀)
  {
    const B = SITE.stoneBridge, F = frame(w, B.x, B.z, B.ry, B.floor), deck = 6.4, bo = { mat: "std:brick", tile: 3 };
    for (let u = -15; u < 14.9; u += 1.5) {
      const uc = u + 0.75, d = Math.abs(uc), y0 = d < 5.6 ? Math.sqrt(5.6 * 5.6 - d * d) : Math.min(F.h(uc, 0) - B.floor, 0) - 1.5;
      F.box(uc, y0, 0, 1.5, deck - y0, 3.6, Math.round(u / 1.5) % 2 ? STONE : STONE_D, bo);
    }
    F.box(0, deck, 0, 31, 0.4, 4.2, STONE_D, bo); F.box(0, deck + 0.4, 0, 31, 0.25, 3.4, SNOW, { col: false, ao: false });
    for (const v of [-2, 2]) F.box(0, deck + 0.4, v, 31, 0.7, 0.36, STONE, bo);
    for (const s of [-1, 1]) for (const v of [-1.9, 1.9]) { F.pipe(s * 15, deck + 0.4, v, s * 15, deck + 3, v, 0.11, 0x3a3028); F.sph(s * 15, deck + 3.2, v, 0.3, WARM, { mat: "glow", col: false }); }
    F.gap("돌다리 아치", 0, 2.3, 0, 0, 6.4, 3.6, 500);
    KEEP.push([B.x, B.z, 17]);
  }
  // 골짜기 바닥의 등불과 벽의 고드름 다발
  for (let t = 0.12; t < 0.99; t += 0.085) {
    const p = GORGE.point(t), d = GORGE.dir(t), s = Math.round(t * 100) % 2 ? 1 : -1, x = p[0] - d[1] * s * 5, z = p[1] + d[0] * s * 5, y = H(x, z);
    w.pipe(x, y - 0.3, z, x, y + 2.6, z, 0.1, TIMBER_D, { col: false }); w.sph(x, y + 2.9, z, 0.34, WARM, { mat: "glow", col: false });
    const ix = p[0] + d[1] * s * 11, iz = p[1] - d[0] * s * 11, iy = H(ix, iz);
    for (let k = 0; k < 4; k++) iceColumn(w, K.T, ix + d[0] * (k - 1.5) * 1.6, iy + 9 + (k % 2) * 3, iz + d[1] * (k - 1.5) * 1.6, 0.7 + (k % 3) * 0.2, 9 + (k % 2) * 3 + 1, k % 2 ? ICE : 0xcfeaf7, false);
  }
}

// ── 빙하 크레바스: 끼인 얼음, 얼음 동굴(지붕 덮인 구간)과 얼음 기둥 ──
function crevasse(w, K, KEEP) {
  const H = (x, z) => w.h(x, z), at = (t) => { const p = CREV.point(t), d = CREV.dir(t); return { x: p[0], z: p[1], d, n: [-d[1], d[0]], f: H(p[0], p[1]), yaw: Math.atan2(d[0], d[1]) / DEG }; };
  for (const [t, up] of [[0.2, 13], [0.33, 14], [0.72, 13.5], [0.86, 12.5]]) {
    const c = at(t);
    w.mesh(K.T.slab[Math.round(t * 10) % 2], M(c.x, c.f + up, c.z, 7.6, 4.4, 6.4, 0, t * 500, 12), t > 0.5 ? ICE_D : ICE, "paint");
    w.col.addCapsule(V3(c.x - c.n[0] * 4, c.f + up, c.z - c.n[1] * 4), V3(c.x + c.n[0] * 4, c.f + up, c.z + c.n[1] * 4), 4);
    w.mesh(K.T.rock[1], M(c.x, c.f + up + 3.6, c.z, 5.4, 1.6, 4.8, 0, t * 300, 0), SNOW, "std");
    w.gap("끼인 얼음 아래", c.x, c.f + (up - 4.4) / 2 + 0.3, c.z, c.yaw, 7.4, up - 5.2, 550);
  }
  // 얼음 동굴: 지붕 얼음 덩어리를 줄지어 얹는다
  let i = 0;
  for (let t = 0.425; t <= 0.596; t += 0.019, i++) {
    const c = at(t), ry = Math.atan2(-c.n[1], c.n[0]) / DEG, y = c.f + 17.5;
    w.mesh(K.T.rock[i % 4], M(c.x, y, c.z, 14.5, 5.2, 4.6, 0, ry, 0), i % 2 ? ICE : 0xc4e6f6, "paint");
    w.col.addCapsule(V3(c.x - c.n[0] * 10, y, c.z - c.n[1] * 10), V3(c.x + c.n[0] * 10, y, c.z + c.n[1] * 10), 4.2);
    w.mesh(K.T.rock[(i + 2) % 4], M(c.x, y + 4.6, c.z, 13, 2.2, 5, 0, ry, 0), SNOW, "std");
    if (i % 3 === 1) for (const s of [-1, 1]) { const gx = c.x + c.n[0] * s * 6.4, gz = c.z + c.n[1] * s * 6.4, gy = H(gx, gz); w.cone(gx, gy - 0.2, gz, 0.6, 2.2, 0x7ae0ff, { mat: "glow", col: false }); w.cone(gx + 0.7, gy - 0.2, gz + 0.5, 0.4, 1.3, 0x9ff0ff, { mat: "glow", col: false }); w.pool(gx, gy + 0.1, gz, 6, 0x5ad0ff, 0.5); }
  }
  for (const t of [0.42, 0.6]) { const c = at(t); w.gap("얼음 동굴", c.x, c.f + 6.2, c.z, c.yaw, 9, 10.4, 700); }
  { const c = at(0.51);
    for (const s of [-1, 1]) iceColumn(w, K.T, c.x + c.n[0] * s * 5.6, c.f + 15, c.z + c.n[1] * s * 5.6, 1.3, 15.6, s > 0 ? ICE : ICE_D);
    w.gap("얼음 기둥 사이", c.x, c.f + 5.6, c.z, c.yaw, 7.6, 9.6, 600); }
  // 입구 표지 깃발
  for (const t of [0.01, 0.99]) { const c = at(t); for (const s of [-1, 1]) { const x = c.x + c.n[0] * s * 7, z = c.z + c.n[1] * s * 7, y = H(x, z); w.pipe(x, y - 0.3, z, x, y + 4, z, 0.08, 0xff7a1a, { col: false }); w.box(x, y + 3.2, z, 1.1, 0.7, 0.05, 0xff7a1a, { col: false, ao: false, ry: c.yaw + 90 }); KEEP.push([x, z, 3]); } }
}

// ── 얼음 폭포(서쪽 절벽)와 전망 데크 ──
function iceFalls(w, K, KEEP) {
  const H = (x, z) => w.h(x, z), z0 = 160, top = 47.5;
  let xb = -212; while (H(xb, z0) < 4 && xb > -250) xb -= 0.5;
  const cx = xb + 9, xl = xb - 13;
  // 절벽에서 튀어나온 바위 턱과 그 위의 눈
  for (const [dx, dz, rx, rz] of [[0, 0, 13, 13], [2, -7, 9, 7], [1, 7, 10, 7]]) w.blob((xl + cx) / 2 + dx, top - 0.6, z0 + dz, rx, 3.2, rz, 0x8b93a6, { mat: "std:rock", grad: [0.55, 1.1], col: false, ry: 0 });
  w.col.addBox(V3((xl + cx) / 2 + 0.5, top - 0.6, z0), V3((cx - xl) / 2 + 1, 2.7, 12.5));
  w.blob((xl + cx) / 2, top + 2.1, z0, 12, 1.3, 12.5, SNOW, { mat: "std", col: false, ry: 0 });
  // 얼음 장막: 가운데는 문처럼 비어 있다
  let k = 0;
  for (let z = z0 - 11; z <= z0 + 11.1; z += 2.2, k++) {
    const door = Math.abs(z - z0) < 2.4, x = cx + Math.sin(z * 1.7) * 0.8, r = 1.25 + (k % 3) * 0.3, yT = top - 1.5;
    if (door) iceColumn(w, K.T, x, yT, z, r, yT - 10.6 - (k % 2) * 1.6, k % 2 ? ICE : 0xcfeaf7);
    else iceColumn(w, K.T, x, yT, z, r, yT - H(x, z) + 0.6, k % 2 ? ICE : (k % 4 ? 0xcfeaf7 : ICE_D));
    if (!door && k % 2) w.blob(x + 0.6, H(x, z) + 0.6, z, 2.2, 1.3, 2, 0xe6f4fb, { mat: "paint", col: false });
  }
  { const pg = new THREE.CircleGeometry(12, 20); pg.rotateX(-Math.PI / 2); w.mesh(pg, M(cx + 7, H(cx + 7, z0) + 0.12, z0, 1, 1, 1.3), ICE, "paint"); }
  w.gap("얼음 폭포 뒤 통로", xb + 4.6, 12, z0, 0, 7, 22, 800);
  w.gap("얼음 폭포 문", cx, 5.4, z0, 90, 4, 9, 600);
  KEEP.push([cx, z0, 15], [cx + 8, z0, 13], [xb, z0 - 8, 8], [xb, z0 + 8, 8]);
  // 전망 데크(절벽 밖으로 내민 다리)
  {
    const [mx, mz] = flat("mesa"), y = H(mx, mz), z = mz - 14;
    let xe = mx; while (H(xe, z) > y - 3 && xe < -200) xe += 0.5;
    const x1 = xe + 17, F = frame(w, (mx + x1) / 2, z, 0, y);
    F.box(0, 0.2, 0, x1 - mx, 0.4, 5, TIMBER, { mat: "std:wood", tile: 2 }); F.box(0, 0.6, 0, x1 - mx, 0.12, 4.4, SNOW, { col: false, ao: false });
    for (const s of [-2.4, 2.4]) { F.box(0, 0.6, s, x1 - mx, 1.1, 0.12, STEEL, { mat: "paint" }); beam(w, [x1 - 1, y + 0.2, z + s * 0.8], [xe + 1.5, H(xe + 1.5, z + s * 0.8) - 14, z + s * 0.8], 0.4, STEEL); }
    w.box(x1 - 2.6, y + 0.24, z, 4.6, 0.4, 4.4, 0x9fd8f0, { mat: "glass", col: false });
    w.gap("전망 데크 아래", x1 - 4, y - 8, z, 0, 9, 13, 400);
    w.pipe(mx - 3, y, mz + 2, mx - 3, y + 7, mz + 2, 0.08, 0xdadada); w.box(mx - 2.1, y + 5.8, mz + 2, 1.8, 1.1, 0.04, RED, { col: false, ao: false });
    KEEP.push([mx, mz, 10]);
  }
}

// ── 숲속 통나무 야영지(서쪽)와 감시탑 ──
function cabinCamp(w, K, KEEP) {
  const [cx, cz] = flat("cabin"), y = w.h(cx, cz);
  chalet(w, cx - 11, cz - 6, 90, { sx: 8, sz: 7, floors: 1, accent: 0x3d7a4f, wood: 0x74482a });
  for (let i = 0; i < 5; i++) for (let k = 0; k < 3 - (i > 2 ? 1 : 0); k++) w.mesh(K.T.col8, M(cx - 9 + k * 0.7, y + 0.35 + (i % 3) * 0.6, cz + 7 + i * 0.1, 0.32, 3.4, 0.32, 90, 0, 0), i % 2 ? 0x8a623c : 0x74482a, "std");
  w.cone(cx + 2, y, cz + 9, 0.5, 1.2, 0xff8a2a, { mat: "glow", col: false }); w.pool(cx + 2, y + 0.05, cz + 9, 5, 0xff9a4a, 0.4);
  const tx = cx + 9, tz = cz - 8, ty = w.h(tx, tz);
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) w.pipe(tx + dx * 1.25, ty - 0.8, tz + dz * 1.25, tx + dx, ty + 13, tz + dz, 0.2, TIMBER_D);
  for (const dy of [4.5, 9]) for (const [a, b] of [[[-3, -3], [3, -3]], [[3, -3], [3, 3]], [[3, 3], [-3, 3]], [[-3, 3], [-3, -3]]]) { const k = 1.2 - dy * 0.015; beam(w, [tx + a[0] * k, ty + dy, tz + a[1] * k], [tx + b[0] * k, ty + dy, tz + b[1] * k], 0.2, TIMBER_D, { mat: "std" }); }
  const F = frame(w, tx, tz, 0, ty);
  F.box(0, 13, 0, 8, 0.25, 8, TIMBER, { mat: "std:wood", tile: 2 });
  for (const s of [-1, 1]) { F.box(s * 3.9, 13.25, 0, 0.12, 1.1, 8, TIMBER_D, {}); F.box(0, 13.25, s * 3.9, 8, 1.1, 0.12, TIMBER_D, {}); }
  for (const [dx, dz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) F.beam(dx, 13.2, dz, dx, 16.2, dz, 0.2, TIMBER_D, { mat: "std" });
  roof(w, F, 16.2, 4.4, 8.8, 26, { gable: TIMBER });
  w.gap("감시탑 다리 사이", tx, ty + 6.5, tz, 0, 6, 12, 400); w.gap("감시탑 다리 사이", tx, ty + 6.5, tz, 90, 6, 12, 400);
  w.gap("감시탑 난간 통과", tx, ty + 14.8, tz, 0, 7, 2.6, 800);
  KEEP.push([cx, cz, 16], [tx, tz, 9]);
}

// ── 눈사태 방지 터널 (북쪽 눈길) ──
function shed(w, KEEP) {
  const S = SITE.shed, F = frame(w, S.x, S.z, S.ry, w.h(S.x, S.z)), up = F.Z(1, 0) < F.Z(0, 0) ? 1 : -1, co = { mat: "std:concrete", tile: 6 }, len = 42;
  F.box(up * 5.4, -1, 0, 0.9, 7.4, len, 0xb9bec6, co);
  for (let v = -len / 2 + 1; v <= len / 2; v += 5) { F.box(-up * 5.2, -1, v, 0.8, 7.4, 0.8, 0xb9bec6, co); F.beam(-up * 5.2, 4.6, v, -up * 3.8, 6.2, v, 0.4, 0xa3a9b2, { col: false, mat: "std" }); }
  F.box(0, 6.2, 0, 12.4, 0.7, len, 0xa3a9b2, co); F.box(up * 0.6, 6.9, 0, 12.2, 0.7, len + 0.6, SNOW, { col: false, ao: false });
  place(w, F, PRISM, up * 8.6, -0.5, 0, 3.2, 7.6, len + 2, SNOW, "std");
  for (let v = -len / 2 + 3.5; v < len / 2; v += 5) F.box(up * 4.9, 3.4, v, 0.1, 0.3, 1.4, WARM, { mat: "glow", col: false });
  for (const s of [-1, 1]) F.box(-up * 5.2, 5, s * (len / 2 + 0.1), 1, 1.2, 0.12, 0xffd23a, { mat: "std:hazard", tile: 1, col: false });
  F.gap("눈사태 방지 터널", 0, 3.1, 0, 0, 8.4, 5.4, 400);
  for (let v = -len / 2; v <= len / 2; v += 7) KEEP.push([F.X(0, v), F.Z(0, v), 11], [F.X(up * 8, v), F.Z(up * 8, v), 6]);
}

// ── 움직이는 것들: 독수리, 열기구, 눈발 ──
function life(w) {
  birds(w, [[-10, 196, -225, 60, 9, 0], [160, 118, -60, 70, -8, 2.1], [-150, 132, -90, 60, 8, 4]]);
  balloon(w, 150, 62, 262, 7, [RED, 0xfff2d8, BLUE, 0xfff2d8], w.h(154, 265));
  const b = prop(w, balloonParts(8, [0x35b06a, 0xfff2d8, YEL, 0xfff2d8])); w.rider(b, [[0, 0, 0, 6, 7, 6]]);
  w.updaters.push((dt, t) => b.position.set(-330 + Math.cos(t * 0.012 + 1) * 60, 150 + Math.sin(t * 0.07) * 8, 80 + Math.sin(t * 0.012 + 1) * 60));
  snowfall(w);
}

export function places(w, K, KEEP) {
  village(w, K, KEEP); lake(w, K, KEEP); ski(w, K, KEEP); skiJump(w, K, KEEP); summit(w, K, KEEP);
  gorge(w, K, KEEP); crevasse(w, K, KEEP); iceFalls(w, K, KEEP); cabinCamp(w, K, KEEP); shed(w, KEEP); life(w);
}
