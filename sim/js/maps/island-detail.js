// 맵: 화산섬 디테일 보강 — 바다 밑 깔개와 원경 섬, 길과 오솔길, 용암 불빛·불티, 해변·리조트·라군·활주로·어촌·신전·폭포·관측소의
// 소품과 움직이는 것들, 그리고 정글 식생 도구(island.js 의 식생 배치가 쓴다)
import * as THREE from "../../vendor/three.module.min.js";
import { makeTerrainMaterial } from "../env.js";
import { WY, VOLCANO, RIVER, LAGOON, STRIP, APRON, STACKS, LIGHT, REEF, VENT, flat, height, colorFn, lavaZone, lavaL, lava2L, tubeL, riverL, roadL, line, sm } from "./island-terrain.js";
import { M, frame, beam, prop, foamRings } from "./canyon-kit.js";
import { plume } from "./factory-zones.js";
import { lavaMaterial, boatParts, planeParts, palmGeo } from "./island-kit.js";

const DEG = Math.PI / 180, TAU = Math.PI * 2;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const qY = (deg) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * DEG);
const _c = new THREE.Color(), _c2 = new THREE.Color();
const mixC = (a, b, t) => _c.set(a).lerp(_c2.set(b), Math.min(1, Math.max(0, t))).getHex();
const WOOD = 0xa67c4e, WOOD2 = 0x6a4a2c, WHITE = 0xf2f0ea, STEEL = 0x59606a, RED = 0xe94f37, YEL = 0xffc23a, BLUE = 0x2f8fd0, GREEN = 0x35b06a, PINK = 0xff7ab0, ORANGE = 0xff7a1a, DARK = 0x2c3138;
const UC = [RED, YEL, BLUE, WHITE, PINK, GREEN];
const WO = { mat: "std:wood", tile: 2 };

// ── 저폴리 기본 도형 (월드 빌더의 구·원통은 삼각형이 많아 작은 소품에는 이것을 쓴다) ──
const up = (g) => { g.translate(0, 0.5, 0); return g; };
const G = {
  oct: new THREE.OctahedronGeometry(1, 0), ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1),
  cyl6: up(new THREE.CylinderGeometry(1, 1, 1, 6)), cone6: up(new THREE.ConeGeometry(1, 1, 6)), cone4: up(new THREE.ConeGeometry(1, 1, 4)), cone9: up(new THREE.ConeGeometry(1, 1, 9)),
  disc: (() => { const g = new THREE.CircleGeometry(1, 10); g.rotateX(-Math.PI / 2); return g; })(),
  box: new THREE.BoxGeometry(1, 1, 1),
};
// 양면 삼각형(돛·날개·깃발)
function triGeo(p) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...p, ...p.slice(6, 9), ...p.slice(3, 6), ...p.slice(0, 3)], 3));
  g.computeVertexNormals();
  return g;
}
// 작은 공(발광 전구·부표·열매). r 이 작으면 20면체
export function ball(w, x, y, z, r, color, mat = "glow", sy = 1) { w.mesh(r < 0.3 ? G.ico0 : G.ico1, M(x, y, z, r, r * sy, r), color, mat); }
const post = (w, x, y, z, r, h, color, mat = "paint") => w.mesh(G.cyl6, M(x, y, z, r, h, r), color, mat);
const cone = (w, x, y, z, r, h, color, mat = "paint") => w.mesh(G.cone6, M(x, y, z, r, h, r), color, mat);
const disc = (w, x, y, z, rx, rz, color, mat = "std", ry = 0) => w.mesh(G.disc, M(x, y, z, rx, 1, rz, 0, ry, 0), color, mat);
const bx = (w, x, y, z, sx, sy, sz, color, o = {}) => w.box(x, y, z, sx, sy, sz, color, { col: false, ...o });            // 충돌 없는 상자(y 는 바닥)
const dec = (w, x, z, sx, sz, color, ry = 0, lift = 0.05, mat = "std") => w.box(x, w.h(x, z) + lift - 0.03, z, sx, 0.03, sz, color, { col: false, ao: false, ry, mat, tile: 2 });
function place(w, parts, x, y, z, ry = 0, rx = 0, rz = 0, s = 1, key = "paint") {
  const base = M(x, y, z, s, s, s, rx, ry, rz);
  for (const [g, m, c] of parts) w.mesh(g, m ? base.clone().multiply(m) : base, c, key);
}

// ── 지형을 따라가는 띠(길·불빛). B: { pos, col, idx }, prof: [[옆 거리, 색(또는 (x,z)→색), 세기]] ──
const newB = () => ({ pos: [], col: [], idx: [] });
function strip(B, w, L, t0, t1, prof, o = {}) {
  const n = Math.max(2, Math.round(((t1 - t0) * L.len) / (o.step || 3))), m = prof.length, base = B.pos.length / 3, skip = [];
  for (let j = 0; j <= n; j++) {
    const t = t0 + ((t1 - t0) * j) / n, [x, z] = L.point(t), [dx, dz] = L.dir(t), fade = o.fade ? Math.min(1, j / o.fade, (n - j) / o.fade) : 1;
    skip.push(o.skip ? o.skip(x, z) : false);
    for (const [off, c, k = 1] of prof) {
      const px = x - dz * off, pz = z + dx * off, kk = k * fade;
      B.pos.push(px, Math.max(w.h(px, pz), o.minY ?? -99) + (o.lift ?? 0.3), pz);
      _c.set(typeof c === "function" ? c(px, pz) : c);
      B.col.push(_c.r * kk, _c.g * kk, _c.b * kk);
    }
  }
  for (let j = 0; j < n; j++) if (!skip[j] && !skip[j + 1]) for (let i = 0; i < m - 1; i++) { const a = base + j * m + i; B.idx.push(a, a + 1, a + m, a + 1, a + m + 1, a + m); }
}
// 동심 고리 띠. rings: [[반경, 세기, y(없으면 지면)]]
function rings(B, w, cx, cz, list, color, n = 28, lift = 0.3) {
  const base = B.pos.length / 3, m = list.length;
  for (let j = 0; j <= n; j++) {
    const a = (j / n) * TAU;
    for (const [rad, k, y] of list) { const px = cx + Math.cos(a) * rad, pz = cz + Math.sin(a) * rad; B.pos.push(px, y ?? w.h(px, pz) + lift, pz); _c.set(color); B.col.push(_c.r * k, _c.g * k, _c.b * k); }
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < m - 1; i++) { const a = base + j * m + i; B.idx.push(a, a + m, a + 1, a + 1, a + m, a + m + 1); }
}
function meshOf(B, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(B.pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(B.col, 3)); g.setIndex(B.idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.frustumCulled = false;
  return m;
}

// ── 바다: 지형 격자 밖 바다 밑 깔개(물 너머로 배경이 비치지 않게), 원경의 섬 ──
function sea(D) {
  const { w, K } = D, S = w.size * 2 + 1400, g = new THREE.PlaneGeometry(S, S, 20, 20);
  g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { _c.set(colorFn(P.getX(i), -4.2, P.getZ(i), 0)); col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const bed = new THREE.Mesh(g, makeTerrainMaterial({ flat: "dirt", flatTint: "1.3, 1.3, 1.22", rockTint: "1.05, 1.0, 1.0", rockLo: 0.26, rockHi: 0.46 }));
  bed.position.y = -4.55; bed.receiveShadow = false; w.scene.add(bed); w.disposables.push(g, bed.material);
  // 원경의 작은 섬들(충돌 없음): 바위 둔덕 + 숲 + 모래톱 + 야자수 몇 그루
  const P3 = palmGeo();
  [[-540, 330, 48, 30, 15, 5], [450, 480, 40, 27, 12, 4], [650, -250, 62, 40, 30, 3], [-760, 70, 52, 36, 24, 3], [575, 130, 26, 20, 8, 3], [90, -720, 80, 46, 40, 0], [-250, 640, 34, 24, 10, 4]].forEach(([x, z, rx, rz, h, np], i) => {
    const ry = i * 67;
    disc(w, x, WY + 0.22, z, rx * 1.16, rz * 1.16, 0xf3e2b4, "std", ry);
    w.mesh(K.T.rock[i % 4], M(x, WY - 1, z, rx * 0.92, h, rz * 0.92, 0, ry, 0), 0x77726a, "std:rock");
    w.mesh(K.T.crown[i % 3], M(x - rx * 0.1, WY + h * 0.62, z, rx * 0.72, h * 0.5, rz * 0.72, 0, ry, 0), [0x4a9a42, 0x3e8a44, 0x5aa648][i % 3], "std");
    w.mesh(K.T.puff[i % 2], M(x + rx * 0.4, WY + h * 0.5, z + rz * 0.2, rx * 0.4, h * 0.34, rz * 0.4, 0, ry, 0), 0x5fae4a, "std");
    for (let k = 0; k < np; k++) {
      const a = ry * DEG + k * 1.7, px = x + Math.cos(a) * rx * 0.95, pz = z + Math.sin(a) * rz * 0.95, t = P3[k % 3], m = M(px, WY, pz, 13, 13, 13, 0, k * 97, 0);
      w.mesh(t.trunkLite, m, 0x9a7b52, "std"); w.mesh(t.crownLite, m, 0x4fae3e, "std");
    }
  });
  // 이웃 화산섬(북서 수평선): 쌍봉과 숲 자락
  { const x = -610, z = -600;
    w.mesh(G.cone9, M(x, WY - 2, z, 190, 34, 150, 0, 20, 0), 0x4f9a48, "std");
    w.mesh(K.T.rock[1], M(x + 10, WY + 16, z, 96, 96, 84, 0, 40, 0), 0x5a5560, "std:rock");
    w.mesh(K.T.rock[2], M(x - 66, WY + 10, z + 34, 60, 58, 56, 0, 10, 0), 0x66606a, "std:rock");
    disc(w, x, WY + 0.2, z, 205, 164, 0xf3e2b4, "std", 20); }
  // 수평선의 돛단배
  const sail = (x, z, ry, c) => place(w, [[G.box, M(0, 0.4, 0, 2.4, 1.1, 8), WHITE], [G.cyl6, M(0, 0.9, -0.6, 0.12, 11, 0.12), WOOD2], [triGeo([0, 2, -0.3, 0, 11.6, -0.5, 0, 2, 4.6]), null, c], [triGeo([0, 1.8, -1, 0, 10, -0.8, 0, 1.6, -4.4]), null, WHITE]], x, WY, z, ry);
  sail(-90, 430, 70, RED); sail(400, -150, 20, YEL); sail(-430, -30, 150, BLUE); sail(300, 380, 110, WHITE);
}

// ── 길: 해안 도로의 흙길 띠와 말뚝, 정글 오솔길과 등산로 ──
function bridgeEnds() {
  const [x, z] = riverL.point(0.3), [rdx, rdz] = riverL.dir(0.3), ux = -rdz, uz = rdx;
  let a = 0, b = 0;
  while (height(x - ux * a, z - uz * a) < 16.5 && a < 70) a += 1;
  while (height(x + ux * b, z + uz * b) < 16.5 && b < 70) b += 1;
  return { S: [x - ux * (a + 4.5), z - uz * (a + 4.5)], N: [x + ux * (b + 4.5), z + uz * (b + 4.5)], ux, uz };
}
function roads(D) {
  const { w, KEEP } = D, inR = (x, z, q, m) => Math.abs(x - q.x) < q.hx + m && Math.abs(z - q.z) < q.hz + m;
  const lz = (x, z) => sm(0.3, 0.6, lavaZone(x, z)), body = (x, z) => mixC(0xdcc48e, 0x5c5654, lz(x, z)), rut = (x, z) => mixC(0xb89f6e, 0x3a3638, lz(x, z));
  strip(D.ground, w, roadL, 0, 1, [[-3.3, body], [-1.6, body], [-1.2, rut], [-0.8, body], [0.8, body], [1.2, rut], [1.6, body], [3.3, body]], { lift: 0.07, step: 3, skip: (x, z) => inR(x, z, APRON, 0.5) });
  for (let i = 0; i < 34; i++) {
    const t = 0.015 + i * 0.029, [x, z] = roadL.point(t), [dx, dz] = roadL.dir(t), s = i % 2 ? 1 : -1, px = x - dz * s * 4.6, pz = z + dx * s * 4.6;
    if (inR(px, pz, APRON, 3) || Math.hypot(px + 52, pz - 140.5) < 9) continue;
    const y = w.h(px, pz); post(w, px, y - 0.2, pz, 0.14, 1.05, WOOD2, "std"); post(w, px, y + 0.7, pz, 0.15, 0.16, WHITE);
  }
  // 오솔길: 신전 뒤 ↔ 흔들다리 ↔ 관측소, 관측소에서 분화구 전망 데크로 오르는 지그재그 등산로
  const [TX, TZ] = flat("temple"), [OX, OZ] = flat("obs"), [DX, DZ] = flat("deck"), E = bridgeEnds();
  const T1 = line([[TX - 1, TZ - 19], [(TX + E.S[0]) / 2 - 4, (TZ - 19 + E.S[1]) / 2], E.S], 20), T2 = line([E.N, [(E.N[0] + OX) / 2 - 5, (E.N[1] + OZ + 23) / 2], [OX, OZ + 23]], 20);
  const T3 = line([[OX + 23, OZ + 2], [-64, -24], [-52, -6], [-40, -22], [-28, -6], [-16, -18], [DX - 7, DZ + 3]], 20);
  const earth = (x, z) => mixC(0xc9a878, 0x7a5a4a, sm(40, 70, height(x, z))), edge = (x, z) => mixC(0xa98858, 0x5a4238, sm(40, 70, height(x, z)));
  for (const L of [T1, T2, T3]) {
    strip(D.ground, w, L, 0, 1, [[-1.25, edge], [-0.5, earth], [0.5, earth], [1.25, edge]], { lift: 0.16, step: 1.8 });
    for (let t = 0; t <= 1; t += 4 / L.len) { const [x, z] = L.point(t); KEEP.push([x, z, 2.6]); }
  }
  // 등산로의 밧줄 말뚝과 이정표
  for (let t = 0.04; t < 0.98; t += 0.07) { const [x, z] = T3.point(t), [dx, dz] = T3.dir(t), px = x - dz * 1.9, pz = z + dx * 1.9, y = w.h(px, pz); post(w, px, y - 0.2, pz, 0.08, 1.1, WOOD2, "std"); post(w, px, y + 0.82, pz, 0.09, 0.1, ORANGE); }
  for (const [L, t, c] of [[T1, 0.12, YEL], [T2, 0.9, BLUE], [T3, 0.03, RED], [T1, 0.92, GREEN], [T2, 0.1, GREEN]]) {
    const [x, z] = L.point(t), [dx, dz] = L.dir(t), px = x - dz * 2.3, pz = z + dx * 2.3, y = w.h(px, pz), ry = Math.atan2(dx, dz) / DEG;
    post(w, px, y - 0.2, pz, 0.07, 2.3, WOOD2, "std"); bx(w, px, y + 1.6, pz, 0.08, 0.34, 1.1, c, { mat: "paint", ry }); bx(w, px, y + 1.15, pz, 0.08, 0.3, 0.9, WHITE, { mat: "paint", ry: ry + 70 });
  }
  D.trailN = E.N; D.trailS = E.S;
}

// ── 용암: 강둑·분화구 벽을 물들이는 불빛, 갈라진 틈, 삼각주의 용암 웅덩이, 끓는 거품, 불티 ──
function lava(D) {
  const { w, r } = D, V = VOLCANO, HOT = 0xff5a14, lm = lavaMaterial(w);
  const prof = (s, k) => [[-16, 0], [-10, 0.16], [-6.4, 0.46], [-4.4, 0.12], [4.4, 0.12], [6.4, 0.46], [10, 0.16], [16, 0]].map(([o, i]) => [o * s, HOT, i * k]);
  strip(D.glow, w, lavaL, 0.02, 0.975, prof(1, 1), { lift: 0.34, step: 3, minY: WY - 0.2, fade: 5 });
  strip(D.glow, w, lava2L, 0.03, 1, prof(0.62, 0.85), { lift: 0.3, step: 2.6, fade: 4 });
  for (const [a, b] of [[0.14, 0.236], [0.767, 0.86]]) strip(D.glow, w, tubeL, a, b, prof(0.4, 0.6), { lift: 0.25, step: 2.2, fade: 3 });
  // 분화구: 호수 둘레의 벽을 비추는 고리와 위로 오르는 아지랑이 기둥
  rings(D.glow, w, V.x, V.z, [[17.5, 0.5], [22, 0.85], [28, 0.4], [36, 0]], 0xff6a1a, 32, 0.32);
  rings(D.glow, w, V.x, V.z, [[19, 0.3, V.lake + 0.4], [22, 0.12, V.lake + 12], [26, 0, V.lake + 30]], 0xff7a2a, 24);
  rings(D.glow, w, VENT.x, VENT.z, [[2.5, 0.8], [7, 0.45], [13, 0]], 0xff6a1a, 16, 0.3);
  { const [x, z] = lavaL.point(0.972); rings(D.glow, w, x, z, [[0.5, 0.5, WY + 0.14], [10, 0.3, WY + 0.14], [24, 0, WY + 0.14]], 0xff6a1a, 18); }
  // 달아오른 틈: 분화구 안벽과 용암 강 둑
  const crack = (pts) => { for (let i = 0; i < pts.length - 1; i++) beam(w, [pts[i][0], w.h(pts[i][0], pts[i][1]) + 0.1, pts[i][1]], [pts[i + 1][0], w.h(pts[i + 1][0], pts[i + 1][1]) + 0.1, pts[i + 1][1]], 0.2, i % 2 ? 0xff8a2a : 0xffb040, { mat: "glow", col: false }); };
  for (let i = 0; i < 11; i++) { const a = i * 0.571 + r() * 0.3, j = (r() - 0.5) * 0.25; crack([18.5, 23, 27.5, 31.5].map((d, k) => [V.x + Math.cos(a + j * k * 0.4) * d, V.z + Math.sin(a + j * k * 0.4) * d])); }
  for (let t = 0.08; t < 0.9; t += 0.036) {
    const [x, z] = lavaL.point(t), [dx, dz] = lavaL.dir(t), s = r() < 0.5 ? 1 : -1, k = (r() - 0.5) * 1.2, l = 3 + r() * 5;
    crack([[x - dz * s * 6.3, z + dx * s * 6.3], [x - dz * s * (6.3 + l * 0.5) + dx * k, z + dx * s * (6.3 + l * 0.5) + dz * k], [x - dz * s * (6.3 + l) + dx * k * 2.4, z + dx * s * (6.3 + l) + dz * k * 2.4]]);
  }
  // 삼각주의 용암 웅덩이(같은 흐르는 용암 재질, 메시 하나)
  { const pos = [], uv = [], idx = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.87 + (i % 5) * 0.02, [x, z] = lavaL.point(t), [dx, dz] = lavaL.dir(t), s = i % 2 ? 1 : -1, o = 8.5 + r() * 7, cx = x - dz * s * o + dx * (r() - 0.5) * 6, cz = z + dx * s * o + dz * (r() - 0.5) * 6, rad = 1.3 + r() * 2.2, y = w.h(cx, cz) + 0.14, b = pos.length / 3;
      if (y < WY + 0.4) continue;
      pos.push(cx, y, cz); uv.push(cx * 0.09, cz * 0.09);
      for (let k = 0; k <= 9; k++) { const a = (k / 9) * TAU, rr = rad * (0.75 + 0.25 * Math.sin(k * 2.3 + i)), px = cx + Math.cos(a) * rr, pz = cz + Math.sin(a) * rr * 0.8; pos.push(px, y, pz); uv.push(px * 0.09, pz * 0.09); if (k) idx.push(b, b + k + 1, b + k); }
      w.pool(cx, y, cz, rad * 3.2, 0xff6a1a, 0.4);
      w.mesh(D.K.T.slab[i % 2], M(cx + rad * 0.9, y - 0.1, cz - rad * 0.5, 0.7, 0.4, 0.6, 0, i * 50, 0), 0x2a2628, "std:rock");
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, lm); m.renderOrder = 1; w.scene.add(m); w.disposables.push(g); }
  // 용암 호수의 끓는 거품
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.35, 0.5) });
  const bub = [[5, 3, 1.5, 0], [-8, -6, 1.9, 1.7], [10, -4, 1.3, 3.1]].map(([dx, dz, s, ph]) => { const m = new THREE.Mesh(G.ico1, bm); m.position.set(V.x + dx, V.lake - 0.1, V.z + dz); w.scene.add(m); return [m, s, ph]; });
  w.disposables.push(bm);
  w.updaters.push((dt, t) => { for (const [m, s, ph] of bub) { const u = (t * 0.33 + ph) % 1; m.scale.set(s * (0.3 + u * 1.2), s * Math.max(0.02, Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.75), s * (0.3 + u * 1.2)); } });
  // 분기공의 김(분화구 테두리와 식은 용암 둔덕)
  plume(w, V.x + 30, w.h(V.x + 30, V.z + 14) + 1, V.z + 14, 2.2, 18, 2, 0xe8e4dc);
  { const [x, z] = tubeL.point(0.5); plume(w, x + 3, w.h(x, z) + 13, z, 2, 15, 2, 0xdedad4); }
  // 불티: 용암 강·분화구·분출구에서 떠오르는 점들(점 구름 하나)
  const N = 170, base = new Float32Array(N * 3), pp = new Float32Array(N * 3), ph = new Float32Array(N), rise = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < 100) { const t = 0.04 + r() * 0.92, p = lavaL.point(t), d = lavaL.dir(t), o = (r() - 0.5) * 7; x = p[0] - d[1] * o; z = p[1] + d[0] * o; y = Math.max(w.h(x, z), WY) + 0.6; }
    else if (i < 135) { const a = r() * TAU, d = r() * 17; x = V.x + Math.cos(a) * d; z = V.z + Math.sin(a) * d; y = V.lake + 0.5; }
    else if (i < 152) { const t = r(), p = lava2L.point(t); x = p[0] + (r() - 0.5) * 4; z = p[1] + (r() - 0.5) * 4; y = w.h(x, z) + 0.6; }
    else { x = VENT.x + (r() - 0.5) * 5; z = VENT.z + (r() - 0.5) * 5; y = w.h(VENT.x, VENT.z) + 1; }
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z; ph[i] = r() * 10; rise[i] = 5 + r() * 11;
  }
  const eg = new THREE.BufferGeometry(), ea = new THREE.BufferAttribute(pp, 3); eg.setAttribute("position", ea);
  const em = new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.1, 0.3), size: 0.34, sizeAttenuation: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(eg, em); pts.frustumCulled = false; pts.renderOrder = 6; w.scene.add(pts); w.disposables.push(eg, em);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) { const u = (t * 0.16 + ph[i]) % 1, s = ph[i] * 7 + t * 1.4; pp[i * 3] = base[i * 3] + Math.sin(s) * u * 2.2 + u * 1.5; pp[i * 3 + 1] = base[i * 3 + 1] + u * u * rise[i] + u * 2; pp[i * 3 + 2] = base[i * 3 + 2] + Math.cos(s * 0.8) * u * 2.2; }
    ea.needsUpdate = true;
  });
  // 관측 캠프: 용암 가의 계측 삼각대와 경고 표지
  for (const [t, s] of [[0.6, 1], [0.72, -1], [0.8, 1]]) {
    const [x, z] = lavaL.point(t), [dx, dz] = lavaL.dir(t), px = x - dz * s * 12.5, pz = z + dx * s * 12.5, y = w.h(px, pz);
    for (let k = 0; k < 3; k++) beam(w, [px + Math.cos(k * 2.1) * 0.7, y - 0.1, pz + Math.sin(k * 2.1) * 0.7], [px, y + 1.7, pz], 0.06, STEEL, { col: false });
    bx(w, px, y + 1.6, pz, 0.4, 0.3, 0.4, YEL, { mat: "paint" }); ball(w, px, y + 2.1, pz, 0.12, 0xff3030);
    const qx = px - dz * s * 3, qz = pz + dx * s * 3, qy = w.h(qx, qz); post(w, qx, qy - 0.2, qz, 0.05, 1.7, STEEL); bx(w, qx, qy + 1.2, qz, 0.7, 0.7, 0.06, YEL, { mat: "paint", ry: Math.atan2(dx, dz) / DEG + 90, rz: 45 });
  }
}

// ── 깃발·새 떼 같은 작은 움직임 ──
function flag(D, x, y, z, h, c1, c2 = WHITE, s = 1) {
  const { w } = D;
  post(w, x, y, z, 0.05, h, WHITE);
  const m = prop(w, [[G.box, M(0.8 * s, 0.22 * s, 0, 1.6 * s, 0.44 * s, 0.04), c1], [G.box, M(0.8 * s, -0.22 * s, 0, 1.6 * s, 0.44 * s, 0.04), c2]], "paint", false);
  m.position.set(x, y + h - 0.5 * s, z); w.rider(m, [[0.8 * s, 0, 0, 0.8 * s, 0.45 * s, 0.1]]);
  D.flags.push([m, D.r() * 6]);
}
// 앵무새 떼: 원을 그리며 도는 메시 하나
function flock(D, cx, y, cz, R, n, colors, speed) {
  const { w, r } = D, parts = [], boxes = [], body = new THREE.ConeGeometry(0.16, 1.0, 5); body.rotateX(-Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.5, rr = R * (0.75 + r() * 0.5), px = Math.cos(a) * rr, pz = Math.sin(a) * rr, py = (r() - 0.5) * 4, m = M(px, py, pz, 1.2, 1.2, 1.2, 0, -a / DEG, -18), c = colors[i % colors.length];
    parts.push([body, m, c[0]]);
    for (const s of [-1, 1]) parts.push([triGeo([0, 0.04, -0.3, s * 1.25, 0.3 + (i % 2) * 0.25, 0.05, 0, 0.04, 0.3]), m, c[1]]);
    parts.push([triGeo([0, 0, 0.4, -0.14, 0, 1.15, 0.14, 0, 1.15]), m, c[0]]);
    boxes.push([px, py, pz, 0.9, 0.3, 0.9]);
  }
  const mesh = prop(w, parts, "paint", false);
  mesh.position.set(cx, y, cz); w.rider(mesh, boxes);
  w.updaters.push((dt, t) => { mesh.rotation.y += (dt * speed) / R; mesh.position.y = y + Math.sin(t * 0.5 + cx) * 1.8; });
}

// ── 리조트·해변·라군 ──
function resort(D) {
  const { w, r, KEEP, kit } = D, y = 0.35, LX = -8, LZ = 145, PIER = 52, WALK = -30;
  // 파라솔마다: 두 번째 선베드, 수건, 탁자와 음료
  for (let i = 0; i < 8; i++) {
    const x = -18 + i * 8, z = 157.5, yy = w.h(x, z), c = UC[(i + 2) % 6];
    bx(w, x - 1.3, yy + 0.05, z + 1.0, 0.7, 0.3, 1.9, 0xf4f0e6, { mat: "paint", ry: -8 });
    bx(w, x + 1.3, yy + 0.35, z + 1.1, 0.6, 0.04, 1.2, c, { mat: "paint", ry: 8, ao: false });
    post(w, x, yy, z + 0.95, 0.22, 0.42, WOOD, "std"); ball(w, x + 0.05, yy + 0.52, z + 0.95, 0.09, i % 2 ? ORANGE : 0x7ad8ff, "paint");
    if (i % 3 === 1) dec(w, x - 3, z - 1.8, 0.9, 1.9, UC[(i + 4) % 6], 25, 0.06, "paint");
  }
  // 모래 위: 비치볼, 모래성, 발자국, 유목, 조개, 끌어올린 카누
  for (const [x, z, c] of [[5, 162.6, PINK], [13.5, 158.6, YEL], [-27, 161, BLUE]]) ball(w, x, w.h(x, z) + 0.33, z, 0.34, c, "paint");
  for (const [x, z] of [[-6.2, 161.8], [41, 161.4]]) {
    const yy = w.h(x, z), S = 0xe6cf98;
    bx(w, x, yy - 0.05, z, 1.3, 0.4, 1.3, S); cone(w, x, yy + 0.3, z, 0.34, 0.85, S, "std");
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { post(w, x + dx, yy - 0.05, z + dz, 0.2, 0.55, S, "std"); cone(w, x + dx, yy + 0.5, z + dz, 0.22, 0.3, S, "std"); }
    post(w, x, yy + 1.1, z, 0.015, 0.4, WOOD2); bx(w, x + 0.12, yy + 1.35, z, 0.24, 0.14, 0.02, RED, { mat: "paint" });
  }
  const steps = (x0, z0, x1, z1, n) => { const l = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0) / DEG, nx = (z1 - z0) / l, nz = -(x1 - x0) / l; for (let i = 0; i < n; i++) { const t = i / (n - 1), s = i % 2 ? 0.17 : -0.17, x = x0 + (x1 - x0) * t + nx * s, z = z0 + (z1 - z0) * t + nz * s; disc(w, x, w.h(x, z) + 0.035, z, 0.1, 0.17, 0xc4aa74, "std", ry); } };
  steps(-46, 162.6, -21, 163.2, 34); steps(27, 164.6, 30.5, 158.6, 9); steps(62, 161.5, 78, 158, 22);
  for (const [a, b] of [[[-57, 163.2], [-52.2, 164.4]], [[-54.6, 163.8], [-53.6, 161.9]], [[72, 160.6], [76.4, 162.4]], [[73.6, 161.3], [73, 159.6]]]) beam(w, [a[0], w.h(...a) + 0.2, a[1]], [b[0], w.h(...b) + 0.32, b[1]], 0.3, 0xcdbb9c, { mat: "std", col: false });
  for (let i = 0; i < 16; i++) { const x = -50 + r() * 126, z = 161.5 + r() * 2.6, yy = w.h(x, z); w.mesh(i % 3 ? G.oct : G.cone6, M(x, yy, z, 0.13, 0.07, 0.16, 0, r() * 360, 0), [0xffd9c8, 0xfff4e6, 0xff9a8a][i % 3], "paint"); }
  place(w, boatParts("canoe", 0x2a9d8f), -38, w.h(-38, 161) + 0.25, 161, 75, 0, 6); place(w, boatParts("canoe", PINK), -41.6, w.h(-41.6, 161.6) + 0.25, 161.6, 66, 0, -5);
  // 해먹
  { const hx = 66, hz = 146.5, hy = w.h(hx, hz);
    for (const d of [0, 3.8]) w.pipe(hx + d, hy - 0.3, hz, hx + d + (d ? 0.25 : -0.25), hy + 1.9, hz, 0.08, WOOD2, { mat: "std" });
    for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; bx(w, hx + 0.2 + 3.4 * t, hy + 1.55 - 2.6 * t * (1 - t), hz, 0.6, 0.05, 1.0, i % 2 ? WHITE : RED, { mat: "paint", rz: -(1 - 2 * t) * 34, ao: false }); }
    KEEP.push([hx + 1.9, hz, 3.5]); }
  // 나무 널길, 수영장 둘레
  dec(w, -6, 155.4, 2.2, 9.2, WOOD, 0, 0.07, "std:wood"); dec(w, PIER, 155.8, 2.6, 6.4, WOOD, 0, 0.07, "std:wood"); dec(w, -23.4, 146, 13.2, 2, WOOD, 0, 0.07, "std:wood"); dec(w, WALK, 155.2, 2.4, 9.6, WOOD, 0, 0.07, "std:wood");
  for (const dz of [-1.7, 0, 1.7]) bx(w, -36, y + 0.205, 146 + dz, 10.2, 0.02, 0.1, 0x1f9ab8, { mat: "paint", ao: false });
  for (let i = 0; i < 4; i++) { const z = 143.3 + i * 1.8; bx(w, -43.6, y + 0.05, z, 1.9, 0.3, 0.7, 0xf4f0e6, { mat: "paint" }); bx(w, -43.3, y + 0.35, z, 1.2, 0.04, 0.6, UC[i], { mat: "paint", ao: false }); }
  for (const z of [150.6]) { post(w, -44.6, y, z, 0.05, 2.5, 0xdadada); w.mesh(G.cone9, M(-44.6, y + 2.05, z, 1.9, 0.75, 1.9), BLUE, "paint"); w.col.addSphere(V3(-44.6, y + 2.3, z), 0.9); }
  bx(w, -29.6, y + 0.45, 146, 2.3, 0.08, 0.5, WHITE, { mat: "paint" }); post(w, -29, y, 146, 0.1, 0.45, STEEL);
  for (const dz of [-0.25, 0.25]) post(w, -30.3, y + 0.1, 143.6 + dz, 0.03, 0.75, 0xdadde2);
  ball(w, -38.5, y + 0.3, 147.2, 0.4, RED, "paint", 0.45); ball(w, -33.5, y + 0.3, 144.8, 0.4, YEL, "paint", 0.45);
  // 로비: 처마 등, 화분, 바의 병과 전구
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ball(w, LX + sx * 7.4, y + 4.3, LZ + sz * 4.4, 0.22, 0xffe2a8); post(w, LX + sx * 7.4, y + 4.45, LZ + sz * 4.4, 0.015, 0.4, DARK);
    post(w, LX + sx * 8.3, y, LZ + sz * 5.3, 0.45, 0.6, 0xc9683f, "std"); kit.flowers(LX + sx * 8.3, LZ + sz * 5.3, 0.6, [PINK, YEL, WHITE, RED][(sx + 1) + (sz + 1) / 2], y + 0.55);
  }
  for (let i = 0; i < 6; i++) { post(w, 41.8 + i * 0.85, y + 1.1, 144.4, 0.07, 0.3, [GREEN, 0x8a4a2c, WHITE, RED, GREEN, YEL][i], "glass"); ball(w, 41.4 + i * 1.05, y + 2.75, 143.9, 0.11, i % 2 ? 0xffe2a8 : 0xff9a6a); }
  // 대문과 구조대 망루의 깃발
  flag(D, -52 + 0.4 * 5.4, 6.6, 140.5 + 0.92 * 5.4, 3.2, RED, YEL); flag(D, -52 - 0.4 * 5.4, 6.6, 140.5 - 0.92 * 5.4, 3.2, BLUE, WHITE);
  flag(D, 61.8, w.h(60, 158) + 5.76, 159.8, 2.4, RED, YEL);
  // 방갈로: 테라스 의자와 화분, 문 옆 등, 물로 내려가는 사다리, 산책로·잔교 말뚝의 등
  [182, 200, 218].forEach((z, i) => {
    for (const s of [-1, 1]) {
      const hx = WALK + s * 11.5;
      bx(w, hx - 0.8, 1.2, z + 4.6, 0.6, 0.28, 1.5, WHITE, { mat: "paint" }); bx(w, hx - 0.8, 1.48, z + 5.1, 0.6, 0.4, 0.08, WHITE, { mat: "paint", rx: -20 });
      post(w, hx + 0.9, 1.2, z + 5.2, 0.24, 0.4, 0xc9683f, "std"); kit.flowers(hx + 0.9, z + 5.2, 0.42, UC[(i * 2 + (s > 0 ? 1 : 0)) % 6], 1.55);
      ball(w, hx - 1.4, 1.2 + 2.2, z + 3.3, 0.14, 0xffe2a8);
      if (z !== 200) { const lz = z + 5.95; for (const d of [-0.3, 0.3]) beam(w, [hx + 0.2 + d, 1.25, lz], [hx + 0.2 + d, WY - 0.3, lz + 0.3], 0.07, WOOD2, { mat: "std", col: false }); for (let k = 0; k < 4; k++) bx(w, hx + 0.2, 0.8 - k * 0.55, lz + 0.05 + k * 0.06, 0.6, 0.06, 0.08, WOOD); }
    }
  });
  for (let i = 0; i <= 12; i += 2) for (const s of [-1, 1]) ball(w, WALK + s * 1.1, 2.0, 160 + i * 6, 0.16, 0xffe2a8);
  for (let i = 0; i <= 9; i += 2) for (const s of [-1, 1]) ball(w, PIER + s * 1.5, 1.66, 159 + (55 * i) / 9, 0.16, 0xffe2a8);
  // 물놀이 발판의 미끄럼틀과 사다리, 물 위의 패들보드
  bx(w, 12.6, WY + 0.5, 196, 3.2, 0.1, 0.9, BLUE, { mat: "paint", rz: -24 }); for (const d of [-0.3, 0.3]) post(w, 7.6, WY - 0.4, 196 + d, 0.04, 1.3, 0xdadde2);
  for (const [x, z, ry, c] of [[-2, 170.5, 20, PINK], [16, 172, -35, YEL], [66, 176, 60, GREEN]]) { bx(w, x, WY - 0.02, z, 0.75, 0.1, 3, c, { mat: "paint", ry, ao: false }); bx(w, x, WY + 0.08, z, 0.14, 0.02, 2.2, WHITE, { mat: "paint", ry, ao: false }); }
  // 라군에 닻을 내린 쌍동선
  { const cx = -64, cz = 197, ry = 28, hull = [];
    for (const s of [-1.35, 1.35]) { hull.push([G.box, M(s, 0.2, 0, 0.75, 0.8, 6.2), WHITE]); hull.push([G.cone4, M(s, 0.2, -3.1, 0.52, 1.6, 0.56, -90, 0, 0), WHITE]); hull.push([G.box, M(s, 0.5, 0, 0.78, 0.1, 6.24), 0x2a9d8f]); }
    hull.push([G.box, M(0, 0.62, 0.4, 3.4, 0.14, 3.2), 0xdcd6c6], [G.box, M(0, 1.0, 0.9, 1.6, 0.7, 1.4), WHITE], [G.cyl6, M(0, 0.6, -0.5, 0.08, 9, 0.08), 0xdadde2], [G.box, M(0, 1.5, 1.4, 0.06, 0.06, 3.8), 0xdadde2]);
    hull.push([triGeo([0, 1.7, -0.3, 0, 9.3, -0.45, 0, 1.7, 3.2]), null, ORANGE], [triGeo([0, 1.3, -0.7, 0, 8, -0.6, 0, 1.2, -3.2]), null, WHITE]);
    place(w, hull, cx, WY, cz, ry);
    w.col.addBox(V3(cx, WY + 0.5, cz), V3(1.8, 0.7, 3.4), qY(ry)); w.col.addCapsule(V3(cx - 0.23, WY + 1, cz - 0.44), V3(cx - 0.23, WY + 9.4, cz - 0.44), 0.25); }
  // 산호와 해초: 라군 바닥과 난파선 암초(물 아래라 충돌 없음)
  const CORAL = [0xff7a8a, 0xffa24a, 0xb47aff, 0xffe27a, 0x3ad0c0, 0xff5aa8];
  for (let i = 0; i < 46; i++) {
    const a = r() * TAU, e = 0.2 + r() * 0.62, x = LAGOON.x + Math.cos(a) * LAGOON.rx * e, z = LAGOON.z + Math.sin(a) * LAGOON.rz * e;
    if (w.h(x, z) > -2.7) continue;
    for (let k = 0; k < 3; k++) { const s = 0.45 + r() * 0.75, px = x + (r() - 0.5) * 4, pz = z + (r() - 0.5) * 4; w.mesh(k ? G.ico0 : G.cone6, M(px, -3.0, pz, s, s * (k ? 0.6 : 1.2), s, 0, r() * 360, 0), CORAL[(i + k) % 6], "std"); }
  }
  for (let i = 0; i < 22; i++) { const a = r() * TAU, d = 16 + r() * 30, x = REEF.x + Math.cos(a) * d, z = REEF.z + Math.sin(a) * d, yy = w.h(x, z), s = 0.5 + r() * 0.7; if (yy < WY - 0.9) w.mesh(G.ico0, M(x, yy + s * 0.2, z, s, s * 0.6, s, 0, r() * 360, 0), CORAL[i % 6], "std"); }
  // 모래톱의 보물 상자
  { const x = LAGOON.x + 1, z = LAGOON.z + LAGOON.rz * 1.08, yy = w.h(x, z);
    if (yy > WY + 0.6) { bx(w, x, yy - 0.1, z, 1.3, 0.7, 0.8, 0x7a5230, { ...WO, ry: 20 }); bx(w, x, yy + 0.58, z, 1.34, 0.22, 0.84, 0x5a3a20, { ...WO, ry: 20, rx: -30 }); bx(w, x, yy + 0.2, z, 0.2, 0.3, 0.86, YEL, { mat: "paint", ry: 20 });
      for (let k = 0; k < 4; k++) ball(w, x + (k - 1.5) * 0.24, yy + 0.66, z + 0.1, 0.12, 0xffd24a); w.pool(x, yy + 0.1, z, 3, 0xffd24a, 0.4);
      beam(w, [x + 1.6, yy - 0.2, z + 0.4], [x + 1.9, yy + 1.2, z + 0.6], 0.07, WOOD2, { mat: "std", col: false }); } }
  KEEP.push([-44.6, 148, 4.5], [-39.5, 161.3, 4], [-6, 155, 2], [WALK, 155, 2]);
}

// ── 활주로: 표시선, 진입등, 계류장 소품, 격납고 안팎 ──
function airstrip(D) {
  const { w, KEEP } = D, y = 0.3, S = STRIP, A = APRON, fo = { col: false, ao: false };
  const mark = (x, z, sx, sz, c = WHITE, ry = 0, lift = 0.06) => w.box(x, y + lift, z, sx, 0.02, sz, c, { ...fo, ry });
  for (const e of [-1, 1]) {
    mark(S.x + e * 9.3, S.z, 0.3, 184);
    for (const s of [-1, 1]) { for (const zz of [46, 58]) for (const k of [0, 1.2]) mark(S.x + s * (3.2 + k), S.z + e * zz, 0.7, 5.4); mark(S.x + s * 4.4, S.z + e * 28, 2.4, 9); mark(S.x + s * 2.2, S.z + e * 52, 0.5, 22, 0x33353c, 0, 0.055); }
  }
  // 계류장: 콘크리트 줄눈, 유도선, 차량 통로, 주기 표시
  for (const z of [-38, -19, 0, 19, 38]) mark(A.x, A.z + z, 38, 0.1, 0x9a9588, 0, 0.04);
  for (const x of [-9.5, 9.5]) mark(A.x + x, A.z, 0.1, 114, 0x9a9588, 0, 0.04);
  mark(170.5, A.z, 0.26, 100, YEL); for (const z of [-38, 48]) mark(173.6, z, 6.4, 0.26, YEL);
  for (let z = -52; z <= 56; z += 8) for (const x of [160.3, 165.7]) mark(x, z, 0.2, 4, WHITE);
  for (const z of [30, -6]) { mark(167.2, z, 0.26, 6, YEL); mark(166, z, 2.4, 0.26, YEL); }
  // PAPI, 진입등(남쪽은 물 위 말뚝), 차례로 번쩍이는 섬광등
  for (let i = 0; i < 4; i++) { const x = S.x - 12.4 - i * 1.2; post(w, x, y - 0.1, S.z + 62, 0.05, 0.5, STEEL); bx(w, x, y + 0.4, S.z + 62, 0.6, 0.3, 0.4, i < 2 ? 0xff4030 : 0xfff4d8, { mat: "glow" }); }
  const AP = [];
  for (const e of [-1, 1]) for (let i = 1; i <= 4; i++) {
    const z = S.z + e * (96 + i * 6.5), g = Math.min(w.h(S.x, z), WY), top = Math.max(w.h(S.x, z), WY) + 1.4;
    post(w, S.x, g - 0.5, z, 0.07, top - g + 0.5, 0xdadde2); bx(w, S.x, top, z, 3.2 - i * 0.3, 0.08, 0.1, STEEL);
    for (const d of [-1, 0, 1]) ball(w, S.x + d * (1.3 - i * 0.12), top + 0.16, z, 0.13, 0xffd24a);
    if (e > 0) AP.push([S.x, top + 0.5, z]);
  }
  const sm0 = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.6) }), strobe = new THREE.Mesh(G.oct, sm0); strobe.scale.setScalar(0.3); w.scene.add(strobe); w.disposables.push(sm0);
  w.updaters.push((dt, t) => { const k = Math.floor((t * 5) % 9); strobe.visible = k < 4; if (k < 4) strobe.position.fromArray(AP[3 - k]); });
  // 연료 트럭(탱크 옆), 수하물 수레, 고깔, 상자
  { const tx = 134.2, tz = -45, ty = w.h(tx, tz);
    w.box(tx, ty + 0.45, tz, 2, 0.4, 6.6, DARK); w.box(tx, ty + 0.85, tz - 2.5, 2.1, 1.7, 1.7, YEL, { mat: "paint" }); bx(w, tx, ty + 1.75, tz - 3.0, 1.9, 0.6, 0.72, 0x27405c, { mat: "paint" });
    w.pipe(tx, ty + 1.75, tz - 1.3, tx, ty + 1.75, tz + 3, 0.95, WHITE); bx(w, tx, ty + 1.5, tz + 0.8, 2, 0.5, 0.5, RED, { mat: "paint" });
    for (const s of [-1, 1]) for (const d of [-2.5, 1.2, 2.4]) w.mesh(G.cyl6, M(tx + s * 0.86, ty + 0.45, tz + d, 0.45, 0.3, 0.45, 0, 0, s * 90), 0x1c1f26, "paint");
    KEEP.push([tx, tz, 6]); }
  { const cx = 155.4, cz = 37;
    w.box(cx, y, cz, 1.3, 1.1, 2.2, RED, { mat: "paint" }); bx(w, cx, y + 1.1, cz + 0.3, 1.2, 0.5, 1, 0x27405c, { mat: "paint" });
    for (let k = 1; k <= 2; k++) { const z = cz + k * 3; w.box(cx, y + 0.3, z, 1.4, 0.2, 2.4, STEEL); for (let j = 0; j < 4; j++) bx(w, cx + (j % 2 ? 0.32 : -0.32), y + 0.5, z + (j < 2 ? -0.55 : 0.55), 0.56, 0.4 + (j % 3) * 0.12, 0.9, [BLUE, 0x8a4a2c, GREEN, 0x39424e][(j + k) % 4], { mat: "paint" }); } }
  for (const [x, z] of [[166.4, 25], [166.4, 35], [177.6, 25], [177.6, 35], [166.4, -11], [166.4, -1], [138.6, -39.5], [147.5, -39.5]]) { cone(w, x, y, z, 0.2, 0.55, ORANGE); bx(w, x, y, z, 0.42, 0.05, 0.42, ORANGE, { mat: "paint" }); }
  for (const [x, z, c, s] of [[139.6, 13, 0xd9a441, 1.2], [140.9, 13.4, 0x3d8b5a, 1], [139.8, 14.4, 0x8a6a48, 0.9], [152.6, 39.4, 0x8a6a48, 0.9]]) w.box(x, y, z, s, s, s, c, { mat: "paint", ry: x * 7 });
  // 두 번째 경비행기
  place(w, planeParts(RED, WHITE), 172, y + 1.86, -6, 90);
  w.col.addBox(V3(172.4, y + 1.86, -6), V3(4.4, 0.85, 0.85)); w.col.addBox(V3(171.1, y + 2.86, -6), V3(0.9, 0.16, 5.8)); w.col.addBox(V3(175.7, y + 2.6, -6), V3(0.7, 1, 2.1));
  for (const d of [-0.5, 0.5]) bx(w, 170.6 + d * 0.9, y, -7.55, 0.25, 0.2, 0.3, YEL, { mat: "paint" });
  // 격납고: 바닥, 박공 트러스, 벽 쪽 공구함, 번호판
  const hx = 146, hz = -20;
  w.box(hx, y - 0.06, hz, 17, 0.1, 22, 0xb4afa2, { mat: "std:concrete", tile: 6, ...fo }); mark(hx, hz, 0.26, 21, YEL, 0, 0.05);
  for (const e of [-1, 1]) {
    mark(hx, hz + e * 12.3, 17, 0.5, YEL, 0, 0.05);
    const z = hz + e * 11.3; beam(w, [hx - 8.8, y + 6.75, z], [hx + 8.8, y + 6.75, z], 0.24, STEEL); beam(w, [hx, y + 6.75, z], [hx, y + 9.2, z], 0.18, STEEL, { col: false });
    for (const s of [-1, 1]) beam(w, [hx + s * 4.4, y + 6.75, z], [hx, y + 9.1, z], 0.14, STEEL, { col: false });
    bx(w, hx, y + 7.3, z + e * 0.2, 3.2, 1.2, 0.1, 0x27405c, { mat: "paint" }); bx(w, hx, y + 7.55, z + e * 0.27, 2.2, 0.16, 0.04, WHITE, { mat: "paint" }); bx(w, hx, y + 8.0, z + e * 0.27, 1.2, 0.16, 0.04, YEL, { mat: "paint" });
  }
  for (const s of [-1, 1]) for (const [d, c, h] of [[-7, RED, 1.1], [-4.6, 0x39424e, 1.6], [3, RED, 1.1], [6.4, 0x8a6a48, 0.9]]) bx(w, hx + s * 8.2, y, hz + d, 0.6, h, 1.8, c, { mat: "paint" });
  // 터미널: 벤치, 깃발, 조명 기둥
  for (const z of [43.5, 48.5]) { bx(w, 152.4, y + 0.3, z, 0.5, 0.1, 2, WOOD, WO); for (const d of [-0.8, 0.8]) bx(w, 152.4, y, z + d, 0.4, 0.3, 0.1, STEEL); }
  flag(D, 153, y, 52.5, 7, BLUE, WHITE, 1.3);
  for (const z of [6, 36]) { w.lamp(136.8, z, 8, 0xffe2a8, 90, 1.8); KEEP.push([136.8, z, 3]); }
  // 수상기 잔교의 짐과 등
  for (const [x, c] of [[211, 0xd9a441], [211.8, 0x3d8b5a], [226, 0x8a6a48]]) bx(w, x, 0.6, 52.9, 0.7, 0.7, 0.7, c, { mat: "paint", ry: x * 9 });
  for (let i = 0; i <= 6; i += 2) ball(w, 199 + (41 * i) / 6, 1.66, 53.3, 0.15, 0xffe2a8);
}

// ── 어촌: 화덕과 연기, 텃밭, 빨랫줄, 그물, 통발, 아우트리거 카누 ──
function village(D) {
  const { w, r, KEEP, kit } = D, [VX, VZ] = flat("village"), y = 0.35;
  // 화덕
  { const x = VX + 15, z = VZ - 3; for (let i = 0; i < 7; i++) w.mesh(D.K.T.slab[i % 2], M(x + Math.cos(i * 0.9) * 0.9, y + 0.05, z + Math.sin(i * 0.9) * 0.9, 0.34, 0.26, 0.3, 0, i * 40, 0), 0x6a655d, "std:rock");
    cone(w, x, y + 0.05, z, 0.42, 1.0, 0xff8a2a, "glow"); w.pool(x, y, z, 5, 0xff9a4a, 0.35); plume(w, x, y + 2, z, 1.5, 14, 2, 0xcfcac4);
    for (const a of [0.6, 2.6, 4.4]) bx(w, x + Math.cos(a) * 2.2, y, z + Math.sin(a) * 2.2, 1.5, 0.35, 0.4, WOOD2, { ...WO, ry: -a / DEG + 90 });
    KEEP.push([x, z, 4]); }
  // 텃밭과 울타리
  { const x = VX + 17, z = VZ + 4.6;
    for (let i = 0; i < 4; i++) { bx(w, x, y - 0.05, z - 1.8 + i * 1.2, 5, 0.2, 0.6, 0x6a4a34); for (let k = 0; k < 6; k++) w.mesh(G.cone4, M(x - 2.1 + k * 0.84, y + 0.12, z - 1.8 + i * 1.2, 0.26, 0.45 + (k % 2) * 0.2, 0.26, 0, k * 40, 0), i % 2 ? 0x6fbf4a : 0x4a9a3e, "foliage"); }
    for (let k = 0; k <= 5; k++) for (const s of [-1, 1]) post(w, x - 3 + k * 1.2, y - 0.1, z + s * 2.9, 0.06, 0.95, WOOD2, "std");
    for (const s of [-1, 1]) for (const hh of [0.4, 0.75]) beam(w, [x - 3, y + hh, z + s * 2.9], [x + 3, y + hh, z + s * 2.9], 0.05, WOOD, { mat: "std", col: false });
    KEEP.push([x, z, 5]); }
  // 빨랫줄
  { const ax = VX + 13.5, az = VZ + 17.5, bx2 = VX + 19, bz2 = VZ + 16;
    for (const [x, z] of [[ax, az], [bx2, bz2]]) post(w, x, y - 0.2, z, 0.06, 2.4, WOOD2, "std");
    beam(w, [ax, y + 2.1, az], [bx2, y + 2.1, bz2], 0.03, 0xdadada, { col: false });
    const ry = Math.atan2(bx2 - ax, bz2 - az) / DEG;
    [RED, WHITE, 0x2a9d8f, YEL, WHITE].forEach((c, i) => { const t = (i + 0.6) / 5.4; bx(w, ax + (bx2 - ax) * t, y + 1.25 + (i % 2) * 0.15, az + (bz2 - az) * t, 0.04, 0.85 - (i % 2) * 0.15, 0.7, c, { mat: "paint", ry, ao: false }); }); }
  // 말리는 그물과 부구, 통발·바구니·통
  { const x = VX - 9, z = VZ + 13;
    for (const d of [-2.4, 2.4]) post(w, x + d, w.h(x + d, z) - 0.2, z, 0.07, 2.5, WOOD2, "std");
    bx(w, x, w.h(x, z) + 0.7, z, 4.8, 1.5, 0.04, 0x9fd0d8, { mat: "glass", ao: false }); beam(w, [x - 2.4, w.h(x, z) + 2.2, z], [x + 2.4, w.h(x, z) + 2.2, z], 0.05, WOOD2, { mat: "std", col: false });
    for (let i = 0; i < 6; i++) ball(w, x - 2 + i * 0.8, w.h(x, z) + 2.12, z, 0.12, i % 2 ? ORANGE : WHITE, "paint"); }
  for (const [dx, dz, c, s] of [[0.5, 17.5, 0xb8964a, 0.5], [1.4, 18.2, 0x9a7446, 0.42], [6.5, -17.6, 0xb8964a, 0.5], [13, 8.5, 0x7a5a3a, 0.45], [13.9, 8, 0x8a4a2c, 0.4], [5, 9.4, 0x9a7446, 0.4]]) { post(w, VX + dx, y, VZ + dz, s, s * 1.4, c, "std"); disc(w, VX + dx, y + s * 1.41, VZ + dz, s * 0.8, s * 0.8, 0x4a3a28); }
  for (const [dx, dz] of [[-3, 19], [-4.2, 19.6], [8, -19.5]]) { bx(w, VX + dx, y, VZ + dz, 0.9, 0.6, 0.9, 0x8a7a5a, { mat: "glass", ry: dx * 20 }); bx(w, VX + dx, y, VZ + dz, 0.95, 0.06, 0.95, WOOD2, { ry: dx * 20 }); }
  // 잔교에서 마을로 이어지는 디딤돌
  for (let i = 0; i < 9; i++) { const x = -213 + i * 1.7, z = 46 + Math.sin(i * 0.9) * 0.5; w.mesh(D.K.T.slab[i % 2], M(x, w.h(x, z) - 0.03, z, 0.6, 0.09, 0.5, 0, i * 53, 0), 0x9a958a, "std:rock"); }
  // 수상 가옥 곁에 묶어 둔 아우트리거 카누
  for (const [x, z, ry, c] of [[-229, 39.4, 84, 0xffc23a], [-233, 52.6, 96, 0x2a9d8f]]) {
    place(w, boatParts("canoe", c), x, WY + 0.1, z, ry);
    const c0 = Math.cos(ry * DEG), s0 = Math.sin(ry * DEG), ox = x + c0 * 1.7, oz = z - s0 * 1.7;
    beam(w, [ox - s0 * 1.9, WY + 0.2, oz - c0 * 1.9], [ox + s0 * 1.9, WY + 0.2, oz + c0 * 1.9], 0.22, WOOD, { mat: "std", col: false });
    for (const d of [-1, 1]) beam(w, [x + s0 * d, WY + 0.5, z + c0 * d], [ox + s0 * d, WY + 0.3, oz + c0 * d], 0.07, WOOD2, { mat: "std", col: false });
    w.col.addBox(V3(x, WY + 0.25, z), V3(0.6, 0.4, 3), qY(ry));
  }
  flag(D, -262.4, 6.3, 46, 2.6, 0x2a9d8f, YEL);
  // 정자 처마의 등, 어촌의 꽃
  for (const [x, z] of [[-246, 46.9], [-230, 46.9], [-218, 46.9]]) ball(w, x, 1.95, z, 0.15, 0xffe2a8);
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = 15 + r() * 6, x = VX + Math.cos(a) * d, z = VZ + Math.sin(a) * d; if (w.h(x, z) > 0.2 && D.clearOf(x, z, 1)) kit.flowers(x, z, 0.7, UC[i % 6]); }
}

// ── 신전: 계단 단, 방첨탑, 덩굴과 이끼, 무너진 기둥, 돌길 ──
function temple(D) {
  const { w, r, KEEP } = D, [x, z] = flat("temple"), y0 = w.h(x, z), ST = 0xb9b09a, ST2 = 0x9c937e, so = { mat: "std:brick", tile: 3 };
  for (const s of [-1, 1]) {
    w.box(x + s * 8.1, y0 - 0.6, z, 1.6, 3.1, 12.4, ST2, so); w.box(x + s * 9.5, y0 - 0.6, z, 1.4, 1.8, 11, ST, so);
    w.box(x + s * 10.5, y0 - 0.6, z - 10, 1.2, 6.2, 1.2, ST, so); w.mesh(G.cone4, M(x + s * 10.5, y0 + 5.6, z - 10, 0.85, 1.3, 0.85, 0, 45, 0), ST2, "std:brick");
    ball(w, x + s * 10.5, y0 + 7.1, z - 10, 0.28, 0x7affd0); w.pool(x + s * 10.5, y0, z - 10, 3, 0x7affd0, 0.3);
    // 앞면 장식 띠와 돋을새김
    bx(w, x + s * 4.7, y0 + 3.3, z + 7.04, 4.6, 0.4, 0.12, ST2, so); for (let k = 0; k < 3; k++) bx(w, x + s * (3.2 + k * 1.5), y0 + 1.4, z + 7.04, 0.7, 0.9, 0.1, k % 2 ? 0x8a8270 : 0x7c7564, so);
  }
  for (const [dx, dy, dz, l] of [[-5.2, 6.2, 5.42, 2.4], [-3.6, 6.2, 5.42, 1.5], [4.4, 6.2, 5.42, 2.9], [2.6, 8.4, 3.42, 1.6], [-2, 8.4, 3.42, 2.2], [5.42, 6.2, -2, 2.6], [-5.42, 6.2, 1, 1.9], [7.32, 3.8, 3, 2.4], [-7.32, 3.8, -4, 1.7], [0.5, 12.1, 3.22, 1.3]]) {
    beam(w, [x + dx, y0 + dy, z + dz], [x + dx, y0 + dy - l, z + dz], 0.09, 0x3e8a3a, { mat: "foliage", col: false }); w.mesh(G.ico0, M(x + dx, y0 + dy - l, z + dz, 0.22, 0.3, 0.22), 0x56a84a, "foliage");
  }
  for (const [dx, dy, dz, s] of [[5.6, 3.9, 5.6, 1], [-6, 6.3, -3, 0.8], [3, 8.45, 3, 0.6], [-8.6, 2.6, 5, 0.7], [9.4, 1.3, -4, 0.8]]) ball(w, x + dx, y0 + dy, z + dz, s, 0x4a9a40, "foliage", 0.4);
  // 무너진 기둥과 돌무더기
  for (const [dx, dz, ry, n] of [[-13.5, 6, 30, 3], [13, 2.5, -60, 2]]) for (let k = 0; k < n; k++) { const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG); w.mesh(G.cyl6, M(x + dx + s * k * 1.75, y0 + 0.55, z + dz + c * k * 1.75, 0.6, 1.6, 0.6, 90, ry + (k ? 6 : 0), 0), k % 2 ? ST : ST2, "std:brick"); w.col.addSphere(V3(x + dx + s * (k * 1.75 + 0.8), y0 + 0.55, z + dz + c * (k * 1.75 + 0.8)), 0.6); }
  for (let i = 0; i < 8; i++) { const a = 2.2 + i * 0.35, d = 12.5 + (i % 3); w.mesh(D.K.T.slab[i % 2], M(x + Math.cos(a) * d, y0 + 0.2, z + Math.sin(a) * d, 0.7 + (i % 2) * 0.4, 0.5, 0.8, 0, i * 47, 0), i % 2 ? ST : ST2, "std:brick"); }
  // 문 앞 돌길과 화로
  for (let i = 0; i < 9; i++) { const pz = z + 16.5 + i * 1.9, px = x + Math.sin(i * 1.3) * 0.5; if (i > 1) w.mesh(D.K.T.slab[i % 2], M(px, w.h(px, pz) - 0.05, pz, 1.0, 0.12, 0.8, 0, i * 61, 0), 0xa39a86, "std:rock"); }
  for (const s of [-1, 1]) { const px = x + s * 5.6, pz = z + 9.5; post(w, px, y0, pz, 0.5, 0.9, ST2, "std:brick"); w.mesh(G.cyl6, M(px, y0 + 0.9, pz, 0.7, 0.25, 0.7), 0x6a665e, "std:rock"); cone(w, px, y0 + 1.1, pz, 0.36, 0.8, 0xff9a2a, "glow"); w.pool(px, y0, pz, 4, 0xff9a4a, 0.3); }
  flock(D, x, y0 + 19, z, 15, 6, [[RED, BLUE], [0x35c06a, YEL], [BLUE, YEL]], 7);
  KEEP.push([x - 12, z + 8, 4], [x + 13, z + 3, 4]);
  void r;
}

// ── 폭포와 골짜기: 물안개, 무지개, 용소의 바위, 흔들다리의 덩굴과 다리목 ──
function falls(D) {
  const { w, r, K } = D, [px, pz] = RIVER[0];
  let dx = VOLCANO.x - px, dz = VOLCANO.z - pz; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  let s = 12; while (height(px + dx * s, pz + dz * s) < 34 && s < 45) s += 0.5;
  const at = (d, side = 0) => [px + dx * d - dz * side, pz + dz * d + dx * side];
  { const [x, z] = at(s - 15.6); plume(w, x, WY + 1.2, z, 1.9, 8, 2, 0xffffff); }
  // 무지개(가산 혼합 띠): 용소 위를 가로지른다
  { const [cx, cz] = at(s - 21), B = D.glow, base = B.pos.length / 3, COL = [0x9a3cff, 0x3c6aff, 0x3cd0ff, 0x4cff6a, 0xfff04a, 0xff9a2a, 0xff3c3c], n = 22, m = COL.length + 2;
    for (let j = 0; j <= n; j++) {
      const a = (0.1 + 0.8 * (j / n)) * Math.PI, f = Math.min(1, j / 4, (n - j) / 4) * 0.2;
      for (let i = 0; i < m; i++) { const R = 12.2 + i * 0.28, c = i === 0 || i === m - 1 ? 0 : COL[i - 1]; B.pos.push(cx - dz * Math.cos(a) * R, WY + 0.5 + Math.sin(a) * R, cz + dx * Math.cos(a) * R); _c.set(c); B.col.push(_c.r * f, _c.g * f, _c.b * f); }
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < m - 1; i++) { const a = base + j * m + i; B.idx.push(a, a + m, a + 1, a + 1, a + m, a + m + 1); } }
  for (let i = 0; i < 7; i++) { const [x, z] = at(-2 - r() * 9, (r() - 0.5) * 22), yy = w.h(x, z); if (yy < WY - 0.4) w.mesh(K.T.rock[i % 4], M(x, WY - 0.5, z, 1.2 + r(), 0.9 + r() * 0.5, 1.1 + r(), 0, r() * 360, 0), 0x6a665e, "std:rock"); }
  // 흔들다리: 늘어진 덩굴, 다리목의 돌탑과 등
  const [bx0, bz0] = riverL.point(0.3), [rdx, rdz] = riverL.dir(0.3), ux = -rdz, uz = rdx;
  for (let i = -5; i <= 5; i++) { if (!i) continue; const d = i * 3.1, x = bx0 + ux * d + rdx * (i % 2 ? 1.3 : -1.3), z = bz0 + uz * d + rdz * (i % 2 ? 1.3 : -1.3), yy = 17.2 - 1.6 * Math.max(0, 1 - Math.abs(d) / 22), ll = 0.7 + r() * 0.7; beam(w, [x, yy, z], [x, yy - ll, z], 0.07, 0x3e8a3a, { mat: "foliage", col: false }); w.mesh(G.ico0, M(x, yy - ll, z, 0.2, 0.26, 0.2), 0x62b04c, "foliage"); }
  for (const [x, z] of [D.trailS, D.trailN]) {
    const yy = w.h(x, z);
    for (let k = 0; k < 4; k++) w.mesh(K.T.slab[k % 2], M(x - rdx * 2.2, yy + k * 0.42, z - rdz * 2.2, 0.62 - k * 0.12, 0.26, 0.56 - k * 0.1, 0, k * 50, 0), k % 2 ? 0x8a857a : 0x77726a, "std:rock");
    post(w, x + rdx * 2.2, yy - 0.2, z + rdz * 2.2, 0.07, 2.3, WOOD2, "std"); ball(w, x + rdx * 2.2, yy + 2.2, z + rdz * 2.2, 0.17, 0xffe2a8);
  }
  { const [x, z] = riverL.point(0.55); flock(D, x, 27, z, 13, 5, [[0x35c06a, YEL], [RED, YEL], [WHITE, 0xff9a6a]], -6); }
}

// ── 관측소: 포장 길, 태양광 판, 풍속계, 차량과 상자 ──
function observatory(D) {
  const { w, KEEP } = D, [OX, OZ] = flat("obs"), y0 = w.h(OX, OZ), co = { mat: "std:concrete", tile: 3, col: false, ao: false };
  w.box(OX - 3.4, y0 + 0.02, OZ + 4.5, 2, 0.05, 11, 0xbdb8aa, co); w.box(OX - 6.5, y0 + 0.02, OZ + 0.2, 8.4, 0.05, 2, 0xbdb8aa, co); w.box(OX + 8, y0 + 0.02, OZ + 8, 15, 0.05, 2, 0xbdb8aa, { ...co, ry: -8 });
  // 태양광 판
  for (let i = 0; i < 4; i++) { const x = OX + 2 + i * 3.2, z = OZ - 18.5; for (const d of [-1.1, 1.1]) post(w, x + d, y0 - 0.1, z, 0.05, 0.9, STEEL); bx(w, x, y0 + 0.75, z, 3, 0.1, 1.9, 0x27405c, { mat: "paint", rx: 26 }); bx(w, x, y0 + 0.83, z, 2.8, 0.02, 0.06, 0xdadde2, { mat: "paint", rx: 26 }); }
  // 기상 관측 기둥과 도는 풍속계
  { const x = OX - 19, z = OZ + 13;
    w.pipe(x, y0 - 0.3, z, x, y0 + 6, z, 0.07, WHITE); bx(w, x, y0 + 1.4, z, 0.5, 0.6, 0.4, WHITE, { mat: "paint" }); bx(w, x + 0.5, y0 + 4.4, z, 1, 0.04, 0.04, STEEL);
    const cups = [];
    for (let k = 0; k < 3; k++) { const a = k * 2.094; cups.push([G.box, M(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35, 0.7, 0.04, 0.04, 0, -a / DEG, 0), 0x59606a], [G.ico0, M(Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72, 0.16, 0.16, 0.16), 0xe94f37]); }
    const an = prop(w, cups, "paint", false); an.position.set(x, y0 + 6.1, z); w.updaters.push((dt) => { an.rotation.y += dt * 4.2; });
    KEEP.push([x, z, 3]); }
  // 탐사 차량과 장비 상자
  { const x = OX + 9, z = OZ + 15, F = frame(w, x, z, 25, y0);
    F.box(0, 0.5, 0, 1.9, 0.7, 3.6, 0x3d8b5a, { mat: "paint" }); F.box(0, 1.2, 0.5, 1.7, 0.75, 1.7, 0x27405c, { mat: "paint", col: false }); F.box(0, 1.95, 0.5, 1.8, 0.08, 1.8, 0x3d8b5a, { mat: "paint", col: false });
    for (const u of [-0.95, 0.95]) for (const v of [-1.15, 1.2]) w.mesh(G.cyl6, M(F.X(u, v), y0 + 0.45, F.Z(u, v), 0.45, 0.3, 0.45, 0, 25, u > 0 ? -90 : 90), 0x1c1f26, "paint");
    KEEP.push([x, z, 4]); }
  for (const [dx, dz, c, s] of [[-17.5, 9, 0xd9a441, 1], [-18.6, 8.4, WHITE, 0.8], [-17.6, 7.8, 0x3d8b5a, 0.7], [1, -13, 0xd9a441, 0.9], [-6, -3.2, STEEL, 0.8]]) w.box(OX + dx, y0, OZ + dz, s, s, s, c, { mat: "paint", ry: dx * 13 });
  for (let i = 0; i < 3; i++) post(w, OX - 8.6 + i * 0.9, y0, OZ - 3.6, 0.3, 0.9, [RED, BLUE, RED][i]);
  // 벼랑 쪽 난간과 깃발
  for (let i = 0; i <= 8; i++) { const a = 2.3 + i * 0.2, x = OX + Math.cos(a) * 25, z = OZ + Math.sin(a) * 25, x2 = OX + Math.cos(a + 0.2) * 25, z2 = OZ + Math.sin(a + 0.2) * 25, yy = w.h(x, z); post(w, x, yy - 0.2, z, 0.06, 1.2, WHITE); if (i < 8) beam(w, [x, yy + 0.9, z], [x2, w.h(x2, z2) + 0.9, z2], 0.05, ORANGE, { col: false }); }
  flag(D, OX - 16.5, y0 + 6.45, OZ + 3, 2.6, ORANGE, WHITE);
}

// ── 거석상 언덕·전망 데크·기지 주변의 작은 것들 ──
function small(D) {
  const { w, r, K, kit } = D, [IX, IZ] = flat("idols"), iy = w.h(IX, IZ), k = Math.SQRT1_2;
  w.box(IX, iy - 0.5, IZ, 4.4, 0.85, 36, 0x7c776e, { mat: "std:rock", tile: 4, ry: -45 });
  for (let i = 0; i < 7; i++) { const a = -0.4 + i * 0.5, d = 13.5, x = IX + Math.cos(a) * d, z = IZ + Math.sin(a) * d, hh = 1.4 + (i % 3) * 0.6; w.box(x, w.h(x, z) - 0.4, z, 0.8, hh + 0.4, 0.6, i % 2 ? 0x8f8a80 : 0x7c776e, { mat: "std:rock", tile: 3, ry: i * 37, rz: (i % 2 ? 5 : -4) }); }
  for (let i = 0; i < 5; i++) { const x = IX + (i - 2) * 6.6 * -k + k * 3.2, z = IZ + (i - 2) * 6.6 * k + k * 3.2; w.mesh(G.cyl6, M(x, iy - 0.05, z, 0.4, 0.25, 0.4), 0x6a665e, "std:rock"); for (let j = 0; j < 3; j++) w.mesh(G.oct, M(x + (j - 1) * 0.2, iy + 0.26, z + (j % 2) * 0.15, 0.13, 0.13, 0.13), [RED, YEL, PINK][(i + j) % 3], "paint"); }
  { const tx = IX - 9 * k, tz = IZ - 9 * k; for (const s of [-1, 1]) { const x = tx + s * 5.4 * -k, z = tz + s * 5.4 * k, yy = w.h(x, z); post(w, x, yy - 0.3, z, 0.07, 2.4, WOOD2, "std"); cone(w, x, yy + 2.1, z, 0.22, 0.6, 0xff9a2a, "glow"); w.pool(x, yy, z, 4, 0xff9a4a, 0.3); } }
  // 전망 데크: 망원경, 벤치, 경고 표지
  { const [DX, DZ] = flat("deck"), dy = w.h(DX, DZ), F = frame(w, DX, DZ, 0, dy);
    for (const u of [-2.4, 2.4]) { post(w, F.X(u, -18.6), dy + 0.8, F.Z(u, -18.6), 0.06, 1.0, STEEL); bx(w, F.X(u, -18.8), dy + 1.75, F.Z(u, -18.8), 0.22, 0.22, 0.6, 0x27405c, { mat: "paint", rx: 14 }); }
    bx(w, DX + 0.5, dy, DZ + 9, 2.2, 0.45, 0.5, WOOD, WO); bx(w, DX - 4.6, dy + 0.9, DZ - 1.5, 0.9, 0.9, 0.06, YEL, { mat: "paint", rz: 45 }); post(w, DX - 4.6, dy - 0.2, DZ - 1.5, 0.05, 1.3, STEEL);
    for (let i = 0; i < 5; i++) { const a = 0.4 + i * 0.5, x = DX + Math.cos(a) * 9, z = DZ + Math.sin(a) * 9; kit.rock(x, z, 0.5 + (i % 2) * 0.3, 0x3a3034); } }
  // 양쪽 기지 터의 표식 말뚝과 착륙 표시(가운데는 비워 둔다)
  for (const [name, c] of [["blue", 0x3a8cff], ["red", 0xff4a3a]]) {
    const [x, z, rad] = flat(name), [TX, TZ] = flat("temple");
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.26, px = x + Math.cos(a) * (rad + 1), pz = z + Math.sin(a) * (rad + 1), yy = w.h(px, pz); if (yy < 0.1 || Math.hypot(px - TX, pz - TZ) < 19) continue; post(w, px, yy - 0.2, pz, 0.09, 1.3, WOOD2, "std"); post(w, px, yy + 1.0, pz, 0.1, 0.22, c); if (i % 3 === 0) ball(w, px, yy + 1.4, pz, 0.14, c); }
  }
  // 보급 창고 터 주변의 상자 더미(터 한가운데는 비운다)
  for (const [x, z] of [[-30, 114], [-196, -32], [40, -192]]) for (let i = 0; i < 3; i++) { const a = 0.8 + i * 0.5 + x, d = 7.2; w.box(x + Math.cos(a) * d, w.h(x, z), z + Math.sin(a) * d, 1, 0.9 - i * 0.15, 1, [0x8a6a48, 0xd9a441, 0x3d8b5a][i], { mat: i ? "paint" : "std:wood", ry: i * 31 }); }
  void r; void K;
}

// ── 바다: 항로 표지, 시스택·등대의 물보라, 등대 선착장, 난파선 주변 ──
function offshore(D) {
  const { w, r } = D;
  // 배가 다니는 길의 항로 표지(붉은색·초록색)
  [[110, 260], [36, 296], [-44, 292], [-120, 266], [-186, 216], [-230, 160], [-262, 112], [262, 96], [236, -150], [-140, -296]].forEach(([x, z], i) => {
    const c = i % 2 ? 0x35b06a : RED;
    w.mesh(G.cyl6, M(x, WY - 0.3, z, 0.7, 0.8, 0.7), c, "paint"); w.mesh(G.cone6, M(x, WY + 0.5, z, 0.55, 2.2, 0.55), c, "paint"); post(w, x, WY + 2.5, z, 0.05, 0.7, DARK); ball(w, x, WY + 3.3, z, 0.18, i % 2 ? 0x7aff9a : 0xff5a4a);
    w.col.addCapsule(V3(x, WY, z), V3(x, WY + 2.6, z), 0.55);
  });
  foamRings(w, [[STACKS[2][0] + 11, WY + 0.08, STACKS[2][1] + 4, 7], [STACKS[5][0] - 9, WY + 0.08, STACKS[5][1] + 3, 6], [LIGHT.x - 17, WY + 0.08, LIGHT.z - 8, 7]]);
  // 등대: 난간, 작은 선착장과 배, 깃대
  { const { x, z } = LIGHT, y = w.h(x, z) - 0.4;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; post(w, x + Math.cos(a) * 3.3, y + 22.4, z + Math.sin(a) * 3.3, 0.04, 0.9, DARK); }
    w.mesh(new THREE.TorusGeometry(3.3, 0.05, 4, 20).rotateX(Math.PI / 2), M(x, y + 23.3, z), DARK, "paint");
    for (const hh of [6.5, 12, 17.5]) bx(w, x, y + hh, z + 3.2 - hh * 0.057, 0.7, 1.1, 0.2, 0x27405c, { mat: "paint" });
    const jx = x - 21, jz = z + 2; w.box(jx + 2, 0.2, jz, 12, 0.2, 2.2, WOOD, WO); for (const d of [-3, 2, 7]) for (const s of [-1, 1]) w.pipe(jx + d, WY - 2, jz + s * 0.9, jx + d, 0.9, jz + s * 0.9, 0.13, WOOD2, { mat: "std" });
    place(w, boatParts("canoe", BLUE), jx - 2, WY + 0.1, jz + 2.6, 84); w.col.addBox(V3(jx - 2, WY + 0.25, jz + 2.6), V3(3, 0.4, 0.6));
    for (let i = 0; i < 5; i++) { const a = r() * TAU, d = 8 + r() * 7, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (w.h(px, pz) > WY + 0.6) D.kit.bush(px, pz, 0.6 + r() * 0.4, i % 2 ? 0x4a9a3e : undefined); } }
  // 난파선: 떠다니는 컨테이너와 나무 상자, 암초 위의 갈매기
  { const o = { mat: "std:corrug", tile: 3 };
    for (const [dx, dz, ry, c, rz] of [[26, -6, 20, 0x2f8fd0, 12], [-22, 20, 70, 0xd9772f, -9], [2, 41, -40, 0x3d8b5a, 6]]) w.box(REEF.x + dx, WY - 1.5, REEF.z + dz, 2.44, 2.6, 6, c, { ...o, ry, rz, rx: rz * 0.6 });
    for (let i = 0; i < 6; i++) { const a = r() * TAU, d = 12 + r() * 24; bx(w, REEF.x + Math.cos(a) * d, WY - 0.35, REEF.z + Math.sin(a) * d, 0.9, 0.7, 0.9, 0x9a7446, { ...WO, ry: r() * 90, rz: r() * 20 }); }
    for (const [dx, dz] of [[4, 6], [-9, -3], [12, -14]]) { const x = REEF.x + dx, z = REEF.z + dz, yy = Math.max(w.h(x, z), WY) + 0.02; w.mesh(G.ico0, M(x, yy + 0.2, z, 0.16, 0.2, 0.3), 0xf6f6f2, "paint"); w.mesh(G.ico0, M(x, yy + 0.42, z - 0.2, 0.1, 0.1, 0.12), 0xf6f6f2, "paint"); } }
}

// ── 정글 식생 도구: 색과 모양이 다른 나무들 ──
function jungleKit(w, K) {
  const r = w.rand, T = K.T, P = palmGeo(), c3 = new THREE.Color(), hsl = (h, s, l) => c3.setHSL(h, s, l).getHex();
  const GREENS = [[0.27, 0.6, 0.3], [0.31, 0.56, 0.24], [0.36, 0.5, 0.22], [0.22, 0.62, 0.34], [0.4, 0.46, 0.26], [0.19, 0.6, 0.37], [0.29, 0.66, 0.36]];
  const green = (dl = 0) => { const g = GREENS[(r() * GREENS.length) | 0]; return hsl(g[0] + (r() - 0.5) * 0.03, g[1], g[2] + dl + (r() - 0.5) * 0.05); };
  const BLOOM = [0xff6a3a, 0xff4f7a, 0xffc93a, 0xa88cf0, 0xfff0e0, 0xff8ab8];
  const tone = (c, dh, dl) => c3.set(c).offsetHSL(dh, 0, dl).getHex();
  const kit = {
    BLOOM,
    // 활엽수: 줄기 + 둥근 수관(먼 곳은 곁가지 하나)
    round(x, z, s = 1, far = false) {
      const y = w.h(x, z) - 0.3, h = (3 + r() * 3) * s, cr = (2.3 + r() * 1.3) * s, c = green();
      w.mesh(T.trunk, M(x, y, z, 0.3 * s, h + cr * 0.4, 0.3 * s), 0x5b4129, "std");
      w.mesh(T.crown[(r() * 3) | 0], M(x, y + h + cr * 0.55, z, cr, cr * (0.72 + r() * 0.2), cr, 0, r() * 360, 0), c, "foliage");
      for (let i = 0; i < (far ? 1 : 2); i++) { const a = r() * 6.28, d = cr * (0.55 + r() * 0.2), br = cr * (0.5 + r() * 0.15); w.mesh(T.puff[i], M(x + Math.cos(a) * d, y + h + cr * (0.25 + r() * 0.3), z + Math.sin(a) * d, br, br * 0.85, br, 0, r() * 360, 0), tone(c, 0.012, i ? 0.06 : -0.05), "foliage"); }
      w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.35 * s); w.col.addSphere(V3(x, y + h + cr * 0.55, z), cr * 0.78);
    },
    // 우산 모양 큰키나무(숲 위로 솟는다). color 를 주면 꽃나무
    umbrella(x, z, s = 1, color) {
      const y = w.h(x, z) - 0.4, h = (color ? 5.5 + r() * 2.5 : 9.5 + r() * 5) * s, cr = (color ? 3.4 + r() * 1.2 : 4.4 + r() * 1.8) * s, c = color ?? green(-0.02), a = r() * 6.28;
      w.mesh(T.trunk, M(x, y, z, 0.5 * s, h + cr * 0.15, 0.5 * s), color ? 0x6a4a34 : 0x8a7458, "std");
      w.mesh(G.cone6, M(x, y, z, 1.15 * s, 1.7 * s, 1.15 * s, 0, a / DEG, 0), color ? 0x6a4a34 : 0x8a7458, "std");
      w.mesh(T.crown[(r() * 3) | 0], M(x, y + h + cr * 0.2, z, cr, cr * (color ? 0.6 : 0.46), cr, 0, r() * 360, 0), c, "foliage");
      w.mesh(T.puff[0], M(x + Math.cos(a) * cr * 0.45, y + h + cr * 0.46, z + Math.sin(a) * cr * 0.45, cr * 0.62, cr * 0.3, cr * 0.62, 0, r() * 360, 0), tone(c, 0.01, 0.07), "foliage");
      w.mesh(T.puff[1], M(x - Math.cos(a) * cr * 0.6, y + h + cr * 0.02, z - Math.sin(a) * cr * 0.6, cr * 0.55, cr * 0.28, cr * 0.55, 0, r() * 360, 0), tone(c, -0.01, -0.06), "foliage");
      w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.5 * s); w.col.addSphere(V3(x, y + h + cr * 0.2, z), cr * 0.5);
    },
    // 대나무 숲: 가늘고 긴 줄기 다발
    bamboo(x, z, s = 1) {
      const y = w.h(x, z) - 0.3, c = hsl(0.2 + r() * 0.05, 0.56, 0.36 + r() * 0.06);
      let top = 0;
      for (let i = 0; i < 9; i++) { const hh = (6.5 + r() * 5.5) * s, a = r() * 6.28, d = r() * 1.3 * s; top = Math.max(top, hh); w.mesh(T.blade, M(x + Math.cos(a) * d, y, z + Math.sin(a) * d, 0.3 * s, hh, 0.3 * s, (r() - 0.5) * 12, r() * 360, (r() - 0.5) * 12), i % 3 ? c : tone(c, -0.02, -0.07), "foliage"); }
      w.col.addCapsule(V3(x, y, z), V3(x, y + top * 0.7, z), 0.9 * s);
    },
    // 큰 잎 다발(고사리·바나나). 충돌 없음
    fern(x, z, s = 1, y = w.h(x, z)) { w.mesh(P.tuft, M(x, y + 0.15, z, 2.3 * s, 2.3 * s, 2.3 * s, 0, r() * 360, 0), hsl(0.24 + r() * 0.1, 0.6, 0.3 + r() * 0.1), "foliage"); },
    // 나무고사리: 줄기 위의 잎 다발
    treefern(x, z, s = 1) {
      const y = w.h(x, z) - 0.3, h = (2.6 + r() * 2.6) * s;
      w.mesh(T.trunk, M(x, y, z, 0.2 * s, h + 0.3, 0.2 * s), 0x4a3526, "std");
      w.mesh(P.tuft, M(x, y + h, z, 2.5 * s, 2.2 * s, 2.5 * s, 0, r() * 360, 0), hsl(0.27 + r() * 0.08, 0.58, 0.28 + r() * 0.08), "foliage");
      w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.3 * s);
    },
    // 가벼운 덤불
    bush(x, z, s = 1, color) {
      const y = w.h(x, z), c = color ?? green(), n = 1 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) { const br = (0.8 + r() * 0.5) * s; w.mesh(T.puff[i], M(x + (i ? (r() - 0.5) * 1.6 * s : 0), y + br * 0.42, z + (i ? (r() - 0.5) * 1.6 * s : 0), br, br * 0.7, br, 0, r() * 360, 0), c, "foliage"); }
    },
    // 꽃 덤불: 초록 덤불 위의 꽃송이
    flowers(x, z, s = 1, color = BLOOM[(r() * 6) | 0], y = w.h(x, z)) {
      const br = (0.8 + r() * 0.4) * s;
      w.mesh(T.puff[(r() * 2) | 0], M(x, y + br * 0.4, z, br, br * 0.7, br, 0, r() * 360, 0), green(-0.02), "foliage");
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + r(), e = 0.35 + r() * 0.9; w.mesh(G.oct, M(x + Math.cos(a) * Math.cos(e) * br * 0.9, y + br * 0.4 + Math.sin(e) * br * 0.66, z + Math.sin(a) * Math.cos(e) * br * 0.9, 0.17 * s, 0.14 * s, 0.17 * s, 0, r() * 360, 0), color, "foliage"); }
    },
    // 바위: 작은 것은 12면체(충돌 없음), 큰 것은 기존 바위
    rock(x, z, s = 1, color = 0x8a847a) {
      if (s > 1.25) return K.rock(x, z, s, color);
      const y = w.h(x, z), sx = s * (0.8 + r() * 0.5), sy = s * (0.75 + r() * 0.5), sz = s * (0.8 + r() * 0.5);
      w.mesh(T.slab[(r() * 2) | 0], M(x, y + sy * 0.35, z, sx, sy, sz, (r() - 0.5) * 30, r() * 360, (r() - 0.5) * 30), color, "std:rock");
      if (s > 0.9) w.col.addSphere(V3(x, y + sy * 0.3, z), Math.min(sx, sy, sz) * 0.85);
    },
  };
  return kit;
}

// 디테일 전체. ctx: { K, palm, KEEP, clearOf }. 반환: 정글 식생 도구
export function detail(w, ctx) {
  const kit = jungleKit(w, ctx.K), D = { w, r: w.rand, ...ctx, kit, glow: newB(), ground: newB(), flags: [] };
  sea(D); roads(D); lava(D); resort(D); airstrip(D); village(D); temple(D); falls(D); observatory(D); small(D); offshore(D);
  // 길(툰 재질)과 불빛(가산 혼합) 메시
  const gm = new THREE.MeshLambertMaterial({ vertexColors: true }), ground = meshOf(D.ground, gm);
  ground.receiveShadow = true; w.scene.add(ground);
  const lm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), glow = meshOf(D.glow, lm);
  glow.renderOrder = 2; w.scene.add(glow);
  w.disposables.push(ground.geometry, gm, glow.geometry, lm);
  const flags = D.flags;
  w.updaters.push((dt, t) => { for (const [m, ph] of flags) m.rotation.y = 0.7 + Math.sin(t * 1.1 + ph) * 0.32 + Math.sin(t * 3.7 + ph * 2) * 0.07; });
  return kit;
}
