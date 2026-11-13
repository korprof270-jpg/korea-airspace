// 설국 산장 소품: 마을 거리, 호수 축제, 스키장 시설, 점프대, 정상, 골짜기, 야영지, 원경 능선과 작은 움직임(연기·불꽃·경광등·행인)
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged } from "./canyon-kit.js";
import { LAKE, POND, PISTE, GORGE, flat } from "./snow-terrain.js";
import { SNOW, ICE, ICE_D, STONE_D, TIMBER, TIMBER_D, WARM, PRISM, FAN, CHALETS, garland, polyPath } from "./snow-kit.js";
import { SITE } from "./snow-places.js";
import { local, person, bench, barrel, crate, potFir, lantern, signpost, flagpole, bunting, fence, lineAt, OCT, ICO, CYL6, CYL8, CONE5, WHEEL, STEEL, RED, BLUE, YEL, GREEN, DARK, ORANGE, COATS } from "./snow-detail.js";

const DEG = Math.PI / 180, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const SPH8 = (() => { const g = new THREE.SphereGeometry(1, 8, 6); g.computeBoundingBox(); return g; })();
const WREATH = (() => { const g = new THREE.TorusGeometry(1, 0.24, 5, 10); g.computeBoundingBox(); return g; })();
const PUFF = (() => { const g = new THREE.IcosahedronGeometry(1, 1); g.computeBoundingBox(); return g; })();

// ── 작은 구조물 ──
// 노점: 앞이 -v. 줄무늬 차양, 진열대, 상인
function stall(L, u, v, yaw, c1, c2 = 0xf2f0ea, goods = [0xd9772f, GREEN, 0xb44cff]) {
  const S = L.at(u, v, yaw);
  S.b(0, 0, 0, 2.8, 1, 1.1, TIMBER, { mat: "std:wood", tile: 2 });
  for (const a of [-1.35, 1.35]) for (const b of [-0.7, 0.7]) S.post(a, 0, b, b < 0 ? 2.3 : 2.7, 0.06, TIMBER_D, "std");
  for (let i = 0; i < 5; i++) S.b(-1.28 + i * 0.64, 2.36, 0, 0.64, 0.1, 2, i % 2 ? c2 : c1, { rx: -13, mat: "paint", ao: false });
  S.b(0, 2.62, 0.5, 3.2, 0.12, 0.9, SNOW, { rx: -13, ao: false });
  goods.forEach((c, i) => S.b(-0.85 + i * 0.85, 1, -0.1, 0.6, 0.3, 0.6, c, { mat: "paint", ao: false }));
  S.bulb(0, 2.1, -0.5, 0.14);
  person(S, 0.3, 0.95, 0, COATS[Math.abs(Math.round(u * 3 + v)) % 8]);
  return S;
}
// 화로(드럼통 불) / 모닥불
function brazier(L, u, v, S) {
  const w = L.w, x = L.X(u, v), z = L.Z(u, v), y = w.h(x, z);
  w.mesh(CYL8, M(x, y + 0.25, z, 0.42, 0.75, 0.42), 0x3a3f48, "std");
  for (let i = 0; i < 3; i++) { const a = i * 2.1; w.mesh(CYL6, M(x + Math.cos(a) * 0.3, y, z + Math.sin(a) * 0.3, 0.05, 0.3, 0.05), DARK, "std"); }
  S.flames.push([x, y + 0.95, z, 0.75]); S.smoke.push([x, y + 1.8, z, 5, 1.6, 0.6, 0.55, 5, 0xc9ccd2, 2]);
}
function campfire(L, u, v, S, seats = 4) {
  const w = L.w, x = L.X(u, v), z = L.Z(u, v), y = w.h(x, z);
  for (let i = 0; i < 3; i++) w.box(x, y + 0.05, z, 1.5, 0.22, 0.22, 0x4f3826, { ry: i * 60, rz: 10, col: false, ao: false });
  for (let i = 0; i < 7; i++) { const a = i * 0.9; w.mesh(ICO, M(x + Math.cos(a) * 0.95, y + 0.08, z + Math.sin(a) * 0.95, 0.2, 0.16, 0.2), STONE_D, "std"); }
  S.flames.push([x, y + 0.2, z, 1.1]); S.smoke.push([x, y + 1.6, z, 8, 2.4, 1, 0.8, 6.5, 0xb9bcc4, 3]);
  for (let i = 0; i < seats; i++) { const a = i * (6.283 / seats) + 0.5, px = x + Math.cos(a) * 2.5, pz = z + Math.sin(a) * 2.5; w.box(px, w.h(px, pz), pz, 1.7, 0.4, 0.42, 0x74482a, { ry: -a / DEG + 90, col: false, mat: "std:wood", tile: 1.5 }); }
}
function snowmanS(L, u, v, yaw = 0, s = 1) {
  const P = L.at(u, v, yaw);
  for (const [y, r] of [[0.45, 0.6], [1.25, 0.44], [1.85, 0.3]]) P.m(SPH8, 0, y * s, 0, r * s, r * s * 0.94, r * s, SNOW, "std");
  P.m(CONE5, 0, 1.85 * s, -0.28 * s, 0.07 * s, 0.4 * s, 0.07 * s, ORANGE, "paint", 0, -90); P.b(0, 2.1 * s, 0, 0.4 * s, 0.3 * s, 0.4 * s, DARK, { ao: false });
  P.b(0, 1.55 * s, 0, 0.66 * s, 0.14 * s, 0.66 * s, RED, { ao: false, mat: "paint" });
  for (const d of [-1, 1]) P.beam(d * 0.35 * s, 1.3 * s, 0, d * 1.0 * s, 1.7 * s, 0, 0.05, 0x4f3826, { mat: "std" });
}
// 스키 거치대: 가로대 + 색색 스키
function skiRack(L, u, v, yaw = 0, n = 6) {
  const R = L.at(u, v, yaw);
  for (const a of [-1.4, 1.4]) R.post(a, -0.2, 0, 1.5, 0.06, TIMBER_D, "std");
  R.b(0, 1.2, 0, 3, 0.1, 0.1, TIMBER_D, { ao: false });
  for (let i = 0; i < n; i++) R.b(-1.2 + i * (2.4 / (n - 1)), 0, -0.14, 0.1, 1.75, 0.04, COATS[(i * 3 + n) % 8], { rx: 9, mat: "paint", ao: false });
}
function sled(L, u, v, yaw, c = RED) { const P = L.at(u, v, yaw); P.b(0, 0.25, 0, 0.8, 0.12, 1.8, c, { mat: "paint", ao: false }); for (const s of [-0.34, 0.34]) P.b(s, 0, 0, 0.07, 0.25, 2.1, DARK, { ao: false }); }
function snowmobile(L, u, v, yaw, c = RED) {
  const P = L.at(u, v, yaw);
  P.b(0, 0.3, 0, 0.9, 0.5, 2.3, c, { mat: "paint", ao: false }); P.b(0, 0.8, 0.45, 0.6, 0.22, 1.1, DARK, { ao: false }); P.b(0, 0.8, -0.6, 0.7, 0.5, 0.08, 0x9fd8f0, { rx: 25, ao: false, mat: "paint" });
  P.b(0, 0, 0.5, 0.5, 0.3, 1.5, DARK, { ao: false }); for (const s of [-0.5, 0.5]) P.b(s, 0, -0.9, 0.14, 0.08, 1.1, 0xdfe3e8, { ao: false });
}
// 안내판: 기둥 둘 + 판 + 색 띠
function board(L, u, v, yaw, wd, ht, color, marks = [], o = {}) {
  const B = L.at(u, v, yaw), y = o.y ?? 1.1;
  for (const s of [-1, 1]) B.post(s * (wd / 2 - 0.15), -0.3, 0, y + ht + 0.3, 0.07, o.post ?? TIMBER_D, "std");
  B.b(0, y, 0, wd, ht, 0.1, color, { mat: "paint", ao: false }); B.b(0, y + ht, 0, wd + 0.2, 0.14, 0.3, SNOW, { ao: false });
  for (const [mu, my, mw, mh, c, glow] of marks) B.b(mu, y + my, -0.07, mw, mh, 0.04, c, { mat: glow ? "glow" : "paint", ao: false });
  return B;
}

// ── 마을 ──
function villageDetail(w, K, S, D) {
  const H = (x, z) => w.h(x, z), r = w.rand, G = local(w, 0, 0, 0, 0);
  // 산장마다: 굴뚝 연기, 처마 고드름, 현관 계단·등, 장작더미, 세워 둔 스키나 썰매
  CHALETS.forEach((c, i) => {
    const L = local(w, c.x, c.z, c.ry, c.F.y0), hz = c.sz / 2;
    S.smoke.push([c.chim[0], c.chim[1], c.chim[2], 6 + (i % 3), 2.2, 0.8, 0.62, 5.5 + (i % 4) * 0.6, 0xe6ebf2, 3]);
    for (const s of [-1, 1]) for (let v = -hz - 0.3; v <= hz + 0.31; v += 1.25) { const k = Math.abs(Math.sin(v * 3.1 + i)); L.m(K.T.coneO, s * (c.sx / 2 + 0.74), c.hw - 0.52, v, 0.09, 0.35 + k * 0.65, 0.09, 0xdff2fb, "paint", 0, 180); }
    L.b(c.du, 0, -hz - 0.95, 2, 0.5, 1.5, STONE_D); L.b(c.du, 0.5, -hz - 0.7, 2, 0.46, 1, STONE_D, { ao: false });
    L.b(c.du + 0.95, 2.5, -hz - 0.12, 0.2, 0.3, 0.2, WARM, { mat: "glow" });
    L.b(-c.sx / 2 - 0.55, 0, hz * 0.2, 0.7, 1.1, 2.6, 0x8a623c, { mat: "std:wood", tile: 0.7 }); L.b(-c.sx / 2 - 0.55, 1.1, hz * 0.2, 0.8, 0.14, 2.7, SNOW, { ao: false });
    if (i % 2) for (const k of [0, 0.24]) L.b(c.du - 1.7 - k, 0, -hz - 0.32, 0.1, 1.7, 0.04, COATS[(i + (k ? 3 : 0)) % 8], { rx: -11, mat: "paint", ao: false });
    else sled(L, c.du + 1.9, -hz - 1.3, 70, COATS[i % 8]);
    L.m(K.T.puff[i % 2], c.sx / 2 + 0.6, -0.1, -hz - 0.3, 1.3, 0.6, 1.1, 0xf6f9fd, "std", i * 50);
  });
  // 호텔 굴뚝 연기
  { const { x, z } = SITE.hotel, y = H(x, z) + 15.3; S.smoke.push([x - 18, y, z - 3.5, 9, 3, 1, 0.9, 7, 0xe6ebf2, 3], [x + 14, y, z + 2.5, 9, 3, 1, 0.9, 7.6, 0xe6ebf2, 3]); }
  // 큰길: 전구 줄, 길가 눈 둑, 벤치·화분·통·표지판, 사람들
  for (const s of [-1, 1]) for (let z = 142; z < 222; z += 16) { const x = 40 + s * 5.4; garland(w, [x, H(x, z) + 5.4, z], [x, H(x, z + 16) + 5.4, z + 16], 0.8, 10, [0xffd23a, 0xff5a4a, 0xfff2c8, 0x6aff8a]); }
  for (let z = 136; z < 226; z += 5.5) for (const s of [-1, 1]) { if (r() < 0.25) continue; const x = 40 + s * (4.7 + r() * 0.5), zz = z + r() * 3; w.mesh(K.T.puff[(r() * 2) | 0], M(x, H(x, zz) - 0.1, zz, 0.9 + r() * 0.5, 0.45 + r() * 0.3, 1.6 + r() * 1.2, 0, r() * 20 - 10, 0), r() < 0.5 ? 0xf6f9fd : 0xe4edf8, "std"); }
  bench(G, 33.2, 150, -90); potFir(G.at(33.2, 152.4), 0, 0, 1.1); bench(G, 33.2, 166, -90); bench(G, 46.8, 192, 90); potFir(G.at(46.8, 194.4), 0, 0, 1.1); bench(G, 33.2, 200, -90, 0x74482a);
  for (const [x, z] of [[33, 134.5], [47, 134.5]]) potFir(G.at(x, z), 0, 0, 1.6);
  { const L = G.at(46.9, 160.5); barrel(L, 0, 0); barrel(L, 0.8, 0.3, 0x74482a); crate(L, -0.2, 1, 0.8, 15); crate(L, 0.5, 1.2, 0.6, 40, 0xc9a25a); }
  { const L = G.at(33.4, 216); crate(L, 0, 0, 0.9, 10); crate(L, 0.1, 0, 0.6, 30, 0xc9a25a, 1); barrel(L, 1, 0.2, 0x3f6f9a); }
  signpost(G, 34.2, 139, 20); signpost(G, 45.9, 224.5, -70, [RED, 0xf2f0ea, GREEN]); signpost(G, 46.4, 181, 110, [BLUE, YEL]);
  for (const [x, z, yaw, c, o] of [[46.4, 160.2, 200, 0, {}], [47.4, 161.6, 20, 2, {}], [33.3, 172.4, 80, 4, {}], [33, 186, 150, 1, { arm: 1 }], [33.9, 186.9, -40, 5, {}], [46.9, 204, -100, 6, {}], [33.3, 150.2, -90, 3, { sit: 1, y: 0.02 }], [46.7, 192.3, 90, 7, { sit: 1, y: 0.02 }], [44.6, 141, 160, 2, {}], [36, 228, 10, 0, {}]]) person(G.at(x, z), 0, 0, yaw, COATS[c], o);
  sled(G, 31.2, 172.8, 30, YEL); sled(G, 47.6, 206, -20, GREEN);
  // 시계탑 문: 화환·등·삼각 깃발
  {
    const { x, z } = SITE.gate, y = H(x, z);
    for (const s of [-1, 1]) for (const f of [-1, 1]) {
      w.mesh(WREATH, M(x + s * 5, y + 5.6, z + f * 1.76, 0.9, 0.9, 0.9), 0x1f6a3c, "std"); w.box(x + s * 5, y + 4.5, z + f * 1.8, 0.4, 0.3, 0.1, RED, { col: false, mat: "paint", ao: false });
      w.box(x + s * 5, y + 2.9, z + f * 1.84, 0.3, 0.4, 0.3, WARM, { col: false, mat: "glow" });
      bunting(w, [x + s * 6.2, y + 11.3, z + f * 1.78], [x + s * 1.4, y + 11.3, z + f * 1.78], 0.35, 6);
    }
  }
  // 광장: 벤치 고리, 선물 상자, 노점, 화로, 구경꾼
  {
    const { x, z } = SITE.tree, L = local(w, x, z, 0);
    for (const a of [52, 115, 140, 220, 245, 318, 0]) bench(L, Math.cos(a * DEG) * 12.4, Math.sin(a * DEG) * 12.4, 90 - a, a % 2 ? TIMBER : 0x74482a);
    for (let i = 0; i < 11; i++) { const a = i * 0.59 + 0.3, d = 5.2 + (i % 3) * 1.1, s = 0.6 + (i % 4) * 0.16, c = COATS[i % 8], P = L.at(Math.cos(a) * d, Math.sin(a) * d, i * 37); P.b(0, 0, 0, s, s * 0.8, s, c, { mat: "paint" }); P.b(0, 0, 0, s * 1.03, s * 0.82, 0.12, i % 2 ? YEL : 0xf2f0ea, { mat: "paint", ao: false }); P.b(0, 0, 0, 0.12, s * 0.82, s * 1.03, i % 2 ? YEL : 0xf2f0ea, { mat: "paint", ao: false }); }
    stall(L, 13.6, 5.6, 68, RED); stall(L, 13.8, -5.4, 111, BLUE, 0xf2f0ea, [YEL, RED, 0xf2f0ea]); stall(L, 1.5, 14.6, 6, GREEN, YEL, [0xd9772f, 0xf2f0ea, RED]);
    brazier(L, 3.9, -11.9, S);
    for (const [u, v, yaw, c, o] of [[12.2, 4.6, -110, 1, {}], [11.4, 5.8, -100, 3, { arm: 1 }], [12.3, -4.6, -70, 5, {}], [2.6, -10.8, 200, 0, {}], [5.4, -12.6, 60, 6, {}], [2, 12.8, 180, 4, {}], [0.6, 13, 170, 7, {}], [-1.5, 9.5, 200, 2, { arm: 1 }], [-2.6, 9, 30, 0, {}], [6.2, 9.4, 220, 1, {}]]) person(L.at(u, v), 0, 0, yaw, COATS[c], o);
    for (const [a, c] of [[52, 2], [245, 5]]) person(L.at(Math.cos(a * DEG) * 12.4, Math.sin(a * DEG) * 12.4, 90 - a), 0.3, 0, 0, COATS[c], { sit: 1, y: 0.02 });
  }
  // 야시장: 손님, 상자 더미, 파는 나무, 화로
  {
    const { x, z } = SITE.canopy, L = local(w, x, z, 0);
    for (const [u, c, yaw] of [[-11, 0, 180], [-6.4, 4, 170], [-5.4, 2, 190], [0.6, 6, 180], [5.4, 1, 200], [10, 5, 175], [10.9, 3, 160]]) person(L.at(u, -6.6), 0, 0, yaw, COATS[c], { arm: u > 5 });
    { const P = L.at(-15.6, -5.6); crate(P, 0, 0, 0.9); crate(P, 1, 0.1, 0.8, 20, 0xc9a25a); crate(P, 0.4, 0, 0.7, 45, 0xb98a4a, 0.9); barrel(P, -1, 0.3); }
    { const P = L.at(15.5, 5.6); barrel(P, 0, 0, 0x3f6f9a); barrel(P, 0.85, 0.2); crate(P, 0.3, 1.1, 0.8, 10); for (let i = 0; i < 3; i++) P.m(ICO, -1 + i * 0.25, 0.25 + (i % 2) * 0.3, 1.2, 0.42, 0.3, 0.36, 0xc9b48a, "std", i * 40); }
    for (let i = 0; i < 7; i++) { const u = -10.5 + i * 3.4, s = 0.9 + (i % 3) * 0.25; L.m(FAN, u, 0, 5.4, 0.8 * s, 2.3 * s, 0.8 * s, 0x1f5a3a, "foliage", i * 31); L.m(FAN, u, 1 * s, 5.4, 0.5 * s, 1.4 * s, 0.5 * s, 0x24683f, "foliage", i * 31 + 20); L.m(FAN, u, 1.6 * s, 5.4, 0.34 * s, 0.9 * s, 0.34 * s, SNOW, "foliage", i * 50); }
    for (const u of [-12.4, 12.6]) L.post(u, 0, 5.4, 2.6, 0.06, TIMBER_D, "std");
    garland(w, [x - 12.4, H(x, z) + 2.5, z + 5.4], [x + 12.6, H(x, z) + 2.5, z + 5.4], 0.5, 12, [0xfff2c8, 0xffd23a]);
    person(L.at(12.6, 6.8), 0, 0, 200, COATS[2], { arm: 1 });
    brazier(L, -17, -8.4, S);
  }
  // 교회: 문 위 화환, 양옆 등과 화분
  { const { x, z } = SITE.church, y = H(x, z), fx = x - 14.82; w.mesh(WREATH, M(fx, y + 6.2, z, 1.1, 1.1, 1.1, 0, 90, 0), 0x1f6a3c, "std"); w.box(fx - 0.04, y + 4.9, z, 0.1, 0.36, 0.5, RED, { col: false, mat: "paint", ao: false });
    for (const s of [-1, 1]) { lantern(G.at(fx - 0.9, z + s * 2.2), 0, 0, 2.4); potFir(G.at(fx - 1, z + s * 4.2), 0, 0, 1.3); }
    for (const [px, pz, yaw, c] of [[fx - 3, z + 1, 80, 7], [fx - 3.6, z - 0.6, 110, 3]]) person(G.at(px, pz), 0, 0, yaw, COATS[c]); }
  // 호텔 앞: 붉은 양탄자, 화분, 벽등, 스키 거치대, 벤치, 손님, 썰매 마차
  {
    const { x, z } = SITE.hotel, L = local(w, x, z, 0);
    D.quad(x, z - 9.2, 3.2, 7, 0, 0xa83a3a, 0.09); D.quad(x, z - 9.2, 2.6, 7, 0, 0xc04a44, 0.1);
    for (const s of [-1, 1]) potFir(L.at(s * 5.2, -6.8), 0, 0, 1.6);
    for (const u of [-21.2, -14.1, -10.6, 10.7, 14.3, 21.4]) L.b(u, 3, -5.58, 0.24, 0.34, 0.2, WARM, { mat: "glow" });
    skiRack(L, 12, -7.6, 0, 7); bench(L, -14, -7.4, 0); bench(L, 18, -7.4, 0);
    for (const [u, v, yaw, c, o] of [[10.6, -8.8, 30, 2, {}], [13.4, -9, -20, 6, { ski: YEL }], [-14.2, -7.3, 0, 3, { sit: 1, y: 0.02 }], [-12.4, -11, 150, 0, {}], [-13.4, -10.2, -60, 7, {}], [5, -12.6, 100, 4, { arm: 1 }]]) person(L.at(u, v), 0, 0, yaw, COATS[c], o);
    const P = L.at(8.4, -14.8, 75);
    P.b(0, 0.45, 0, 1.5, 0.7, 2.8, 0x7a2f2a, { mat: "paint" }); P.b(0, 1.15, 0.95, 1.5, 0.6, 0.2, 0x7a2f2a, { mat: "paint", ao: false }); P.b(0, 0.95, 0.3, 1.2, 0.2, 0.7, 0x2a3340, { ao: false });
    for (const s of [-0.75, 0.75]) { P.b(s, 0, 0, 0.08, 0.14, 3.6, YEL, { mat: "paint", ao: false }); P.beam(s, 0.1, 0.9, s, 0.5, 0.9, 0.07, DARK); P.beam(s, 0.1, -0.9, s, 0.5, -0.9, 0.07, DARK); }
  }
  // 얼음 조각 정원: 빛나는 얼음 받침
  { const { x, z: zs } = SITE.ice; for (const z of [zs[0] + 4, (zs[0] + zs[1]) / 2, (zs[1] + zs[2]) / 2, zs[2] - 4]) for (const s of [-1, 1]) { const P = G.at(x + s * 7, z, 20 * s); P.b(0, 0, 0, 1.1, 1.3, 1.1, s > 0 ? ICE : ICE_D, { mat: "paint", ao: false }); P.b(0, 1.3, 0, 1.3, 0.14, 1.3, SNOW, { ao: false }); P.m(OCT, 0, 2.1, 0, 0.4, 0.6, 0.4, 0x9fe8ff, "glow", 45); } }
  // 아이들이 만든 작은 눈사람
  for (const [x, z, yaw, s] of [[-22, 147, 60, 1], [-7.5, 134, 120, 0.8], [96, 196, 200, 1.1], [61, 197, 250, 0.9], [12.5, 214, 20, 1], [124.6, 171, 270, 1.2], [70, 133.5, 180, 0.9]]) snowmanS(G, x, z, yaw, s);
  // 동쪽 길과 남쪽 길의 등불·울타리
  for (const [x, z] of [[122.6, 150], [113.4, 172], [122.6, 196], [110.9, 224.9], [78, 235.6], [58, 228.2], [84, 122.6], [99, 123.4]]) lantern(G.at(x, z), 0, 0, 2.8);
  fence(w, 123.8, 146, 123.8, 132); fence(w, 60, 240.4, 92, 238.2); fence(w, -40, 224, -28, 228);
}

// ── 호수: 빙상장 구경꾼, 정빙차, 컬링, 얼음 낚시, 이글루 모닥불, 선착장 ──
function lakeDetail(w, K, S, D, KEEP) {
  const G = local(w, 0, 0, 0, 0), R = SITE.rink, L = local(w, R.x, R.z, 0, 0);
  for (const s of [-1, 1]) for (const u of [-13, -5, 5, 13]) bench(L, u, s * 12.2, s > 0 ? 0 : 180, 0x74482a);
  for (const [u, v, yaw, c, o] of [[-13, -12.1, 180, 0, { sit: 1, y: 0.02 }], [-4.6, -12.1, 180, 4, { sit: 1, y: 0.02 }], [5.4, 12.1, 0, 2, { sit: 1, y: 0.02 }], [12.6, 12.1, 0, 6, { sit: 1, y: 0.02 }], [-9, -10.9, 180, 1, { arm: 1 }], [1, -10.9, 180, 5, {}], [2, -10.9, 170, 3, {}], [-2, 10.9, 0, 7, {}], [9, 10.9, 10, 0, { arm: 1 }], [-11, 10.9, -10, 2, {}]]) person(L, u, v, yaw, COATS[c], o);
  stall(L, 9, -17, 180, BLUE, 0xf2f0ea, [0x8a5a34, 0xf2f0ea, RED]); brazier(L, 13.6, -16, S);
  for (const [u, v, yaw, c] of [[8.4, -15.2, 0, 3], [10, -15.4, 20, 6], [14.6, -14.8, 200, 1]]) person(L, u, v, yaw, COATS[c]);
  // 정빙차 (링크 남동쪽 바깥)
  { const P = L.at(23, 13.4, -20); P.b(0, 0.35, 0, 2, 1.1, 3.6, 0x2f6fb0, { mat: "paint" }); P.b(0, 1.45, -0.9, 2, 0.7, 1.6, 0xf2f0ea, { mat: "paint" }); P.b(0, 1.45, 1, 1.2, 0.5, 0.9, DARK, { ao: false }); P.b(0, 0.1, 2.1, 2.2, 0.4, 0.5, STEEL, { mat: "paint", ao: false }); P.b(0.7, 2.15, -0.9, 0.24, 0.2, 0.24, 0xffa020, { mat: "glow" });
    for (const a of [-1, 1]) for (const b of [-1.1, 1.1]) P.m(WHEEL, a * 1.02, 0.42, b, 0.2, 0.42, 0.42, DARK, "std");
    person(P, 0, 0.9, 0, COATS[2], { sit: 1, y: 1.1 });
    w.col.addBox(V3(P.X(0, 0), 1.1, P.Z(0, 0)), V3(1.3, 1.1, 1.3)); }
  // 컬링장 (링크 북쪽)
  {
    const cx = -98, cz = 148.5;
    D.quad(cx, cz, 34.6, 5.2, 0, 0x4f7fb5, 0.07); D.quad(cx, cz, 34, 4.6, 0, 0xe2f4fc, 0.08);
    for (const s of [-1, 1]) { const hx = cx + s * 12.6; D.disc(hx, cz, 1.83, 0x2f6fb0, 0.09, { n: 18, r0: 1.22 }); D.disc(hx, cz, 0.61, 0xd9432f, 0.09, { n: 12, r0: 0.16 }); D.quad(cx + s * 7.4, cz, 0.14, 4.6, 0, 0xd9432f, 0.09); }
    D.quad(cx, cz, 34, 0.08, 0, 0x8fb8d8, 0.09);
    for (const [dx, dz, c] of [[11.8, 0.3, RED], [12.9, -0.5, YEL], [13.4, 0.8, RED], [11, -1.2, YEL], [14.6, -0.2, YEL], [6.5, 0.9, RED], [-3, -0.4, YEL]]) { w.mesh(CYL8, M(cx + dx, 0.05, cz + dz, 0.16, 0.13, 0.16), 0x9aa0ab, "std"); w.mesh(CYL8, M(cx + dx, 0.18, cz + dz, 0.11, 0.06, 0.11), c, "paint"); }
    for (const [dx, dz, yaw, c, o] of [[9.4, 1.5, -100, 1, { arm: 1 }], [4, -0.6, -80, 3, {}], [-12.6, 3.2, 100, 5, {}], [-13.6, -3.1, 60, 0, {}]]) { const P = person(G.sub(cx + dx, 0.05, cz + dz), 0, 0, yaw, COATS[c], o); if (o.arm) P.beam(0.36, 1.3, -0.3, 0.5, 0.06, -0.9, 0.05, YEL); }
    bench(G.sub(cx - 15, 0.05, cz + 4.4), 0, 0, 20);
  }
  // 얼음 낚시터: 구멍, 걸상에 앉은 낚시꾼, 깃발 찌, 물통과 잡은 고기
  [[-128, 160, 40, 0], [-132, 186, 150, 4], [-112, 192.5, 200, 2], [-74, 185.5, -60, 6], [-156, 180, 100, 3]].forEach(([x, z, yaw, c], i) => {
    const P = local(w, x, z, yaw, 0.05);
    D.disc(x, z, 1.05, 0xf4f9fd, 0.085, { n: 10, wob: 0.08 }); D.disc(x, z, 0.55, 0x16324a, 0.1, { n: 10 });
    P.b(0, 0, 1.15, 0.6, 0.42, 0.6, 0xb98a4a, { mat: "std:wood", tile: 1 }); person(P, 0, 1.1, 0, COATS[c], { sit: 1 });
    P.beam(0.3, 1.0, 0.8, 0.08, 1.55, -0.15, 0.035, DARK); P.beam(0.08, 1.55, -0.15, 0, 0.02, 0, 0.015, 0xe8e8e8);
    P.post(-1.1, 0, -0.5, 0.9, 0.025, DARK); P.b(-0.95, 0.68, -0.5, 0.3, 0.2, 0.03, ORANGE, { mat: "foliage", ao: false });
    P.m(CYL8, 0.9, 0, 0.5, 0.2, 0.34, 0.2, i % 2 ? BLUE : RED, "paint");
    for (let k = 0; k < 2 + (i % 2); k++) P.b(1.2 + k * 0.16, 0, -0.3 + k * 0.3, 0.42, 0.06, 0.13, 0xb9c6d2, { mat: "metal", ao: false, ry: 30 + k * 50 });
    if (i % 2 === 0) sled(P, -1.4, 1.6, 30, COATS[(c + 3) % 8]);
  });
  // 이글루 마을: 모닥불, 얼음 벽돌 더미, 생선 말리는 걸대, 썰매
  campfire(G, -51, 147.4, S, 4); KEEP.push([-51, 147.4, 5]);
  for (const [x, z, yaw, c, o] of [[-49.4, 149.6, -140, 1, {}], [-53.6, 148.2, 100, 5, { arm: 1 }], [-50.2, 144.6, -10, 3, {}]]) person(G.at(x, z), 0, 0, yaw, COATS[c], o);
  { const P = G.at(-39.4, 135.6, 25); for (let i = 0; i < 7; i++) P.b((i % 3) * 0.95 - 0.9, ((i / 3) | 0) * 0.52, (i % 2) * 0.2, 0.9, 0.5, 0.6, i % 2 ? ICE : 0xcfeaf7, { mat: "paint", ao: false, ry: i * 4 }); }
  { const P = G.at(-45.6, 141.4, -30); for (const s of [-1.3, 1.3]) { P.beam(s - 0.3, 0, 0, s, 1.9, 0, 0.07, TIMBER_D, { mat: "std" }); P.beam(s + 0.3, 0, 0, s, 1.9, 0, 0.07, TIMBER_D, { mat: "std" }); } P.beam(-1.5, 1.86, 0, 1.5, 1.86, 0, 0.06, TIMBER_D, { mat: "std" }); for (let i = 0; i < 6; i++) P.b(-1.1 + i * 0.44, 1.3, 0, 0.12, 0.5, 0.05, i % 2 ? 0xb9c6d2 : 0xd9a27a, { ao: false, mat: "paint" }); }
  sled(G, -57.5, 143.2, -50, BLUE);
  // 선착장: 등, 통, 상자, 낚시꾼
  { const P = local(w, -100, 209, 0, 0); for (const s of [-1.2, 1.2]) { P.post(s, 1.5, -4.5, 1.4, 0.05, DARK); P.b(s, 2.9, -4.5, 0.3, 0.36, 0.3, WARM, { mat: "glow" }); } const T = P.sub(0, 0.82, 0); barrel(T, 0.7, 3.2); barrel(T, -0.6, 3.6, 0x3f6f9a); crate(T, 0.6, 1.6, 0.7, 20); person(T, -0.4, -3.4, 10, COATS[6]);
    const B = G.at(-104.4, 214.6, 60); B.b(0, 0, 0, 1.3, 0.55, 4.2, 0x2a9d8f, { mat: "paint" }); B.b(0, 0.55, 0, 1.1, 0.16, 3.8, SNOW, { ao: false }); }
}

// ── 스키장: 곤돌라 기둥·승강장 주변, 슬로프 안전망·제설기·표지, 결승선 관중, 스노파크, 산장 테라스 ──
function skiDetail(w, K, S, D, KEEP) {
  const H = (x, z) => w.h(x, z), lift = SITE.lift, G = local(w, 0, 0, 0, 0);
  // 곤돌라 기둥: 충돌 보호대, 도르래, 사다리, 정비 발판
  (lift.nodes || []).forEach((n, i, all) => {
    if (i === 0 || i === all.length - 1) return;
    const L = local(w, n.x, n.z, lift.ry, 0);
    L.b(0, n.g - 0.3, 0, 1.5, 2.1, 1.5, ORANGE, { mat: "paint" }); L.b(0, n.g + 0.6, 0, 1.54, 0.4, 1.54, 0xf2f0ea, { mat: "paint", ao: false }); L.b(0, n.g + 1.8, 0, 1.6, 0.16, 1.6, SNOW, { ao: false });
    for (const s of [-2.4, 2.4]) for (const dv of [-0.75, 0.75]) L.m(WHEEL, s, n.y + 0.02, dv, 0.14, 0.4, 0.4, DARK, "paint");
    for (const s of [-0.2, 0.2]) L.beam(s, n.g + 2, 0.62, s, n.y - 1.1, 0.46, 0.06, STEEL);
    for (let yy = n.g + 2.6; yy < n.y - 1.2; yy += 1.7) L.b(0, yy, 0.56, 0.44, 0.05, 0.05, STEEL, { ao: false });
    L.b(0, n.y - 1.2, 0.95, 1.9, 0.08, 1.0, STEEL, { mat: "paint", ao: false }); L.b(0, n.y - 0.35, 1.42, 1.9, 0.06, 0.06, YEL, { mat: "paint", ao: false });
    for (const s of [-0.92, 0.92]) L.b(s, n.y - 1.2, 1.42, 0.06, 0.9, 0.06, YEL, { mat: "paint", ao: false });
  });
  // 아래 승강장: 대기 줄 난간, 스키 거치대, 슬로프 안내판, 줄 선 사람들, 스노모빌 (통과 갭 바깥쪽에만)
  {
    const L = local(w, lift.A[0], lift.A[1], lift.ry);
    for (const u of [-8.6, -10.4, -12.2]) fence(w, L.X(u, -15), L.Z(u, -15), L.X(u, -6.5), L.Z(u, -6.5), 0x2f6fb0, 1, 2.9);
    for (const [u, v, c, sk] of [[-9.5, -7.4, 0, YEL], [-9.5, -9.6, 4, 0xf2f0ea], [-9.5, -12.6, 2, RED], [-11.3, -8.6, 6, GREEN], [-11.3, -11.4, 1, YEL], [-11.3, -14, 5, 0xff7ad0]]) person(L.at(u, v, 0), 0, 0, 180, COATS[c], { ski: sk });
    skiRack(L, -15.6, -9, 90, 7); skiRack(L, -15.6, -13.4, 90, 5);
    board(L, -13.6, -17.6, 200, 4, 2.4, 0xf2f0ea, [[-1.1, 0.5, 0.14, 1.6, BLUE], [-0.5, 0.9, 0.9, 0.14, BLUE], [0.4, 0.4, 0.14, 1.5, RED], [1.1, 0.7, 0.14, 1.2, DARK], [0, 1.9, 3.4, 0.3, RED], [1.4, 0.3, 0.3, 0.3, YEL]], { y: 0.9 });
    bench(L, -17.4, -5.6, 90); L.at(-7.4, -16.4).m(CYL8, 0, 0, 0, 0.32, 0.95, 0.32, 0x2a9d8f, "paint");
    KEEP.push([L.X(-12, -11), L.Z(-12, -11), 10]);
    const C = local(w, 102, 86, 200); snowmobile(C, -7.6, -1.4, 20, RED); snowmobile(C, -7.8, 1.6, 5, YEL); signpost(C, -6.6, -5.2, 40, [BLUE, RED, 0xf2f0ea]);
  }
  // 정상 승강장: 안내판, 스키 거치대, 출발을 기다리는 스키어
  {
    const L = local(w, lift.B[0], lift.B[1], lift.ry);
    board(L, 4.6, 11.8, 20, 3, 1.5, BLUE, [[0, 0.5, 2.2, 0.5, 0xf2f0ea], [-1, 0.2, 0.3, 0.2, YEL]], { y: 1.3 }); skiRack(L, -1.6, 12, 0, 5);
    for (const [x, z, yaw, c, sk] of [[14, -168.4, 200, 0, YEL], [16.2, -167.2, 170, 4, 0xf2f0ea], [12.4, -166, 190, 3, RED]]) person(G.at(x, z), 0, 0, yaw, COATS[c], { ski: sk });
  }
  // 슬로프 가장자리 안전 테이프(폴대 사이), 난이도 표지, 감속 현수막
  { let prev = null, k = 0;
    for (let t = 0.05; t < 0.9; t += 0.045, k++) {
      const cur = [-1, 1].map((s) => { const [x, z] = lineAt(PISTE, t, s * 16); return [x, H(x, z), z]; });
      if (prev && k % 3 !== 0) for (const s of [0, 1]) for (const dy of [0.9, 1.7]) beam(w, [prev[s][0], prev[s][1] + dy, prev[s][2]], [cur[s][0], cur[s][1] + dy, cur[s][2]], 0.11, ORANGE, { col: false });
      prev = cur;
    }
    for (const [t, s, c] of [[0.1, -1, BLUE], [0.1, 1, BLUE], [0.42, 1, RED], [0.6, -1, RED], [0.76, 1, BLUE]]) { const [x, z] = lineAt(PISTE, t, s * 18), d = PISTE.dir(t), L = local(w, x, z, Math.atan2(d[0], d[1]) / DEG); L.post(0, -0.3, 0, 3, 0.06, 0xdfe3e8); L.b(0, 2, 0, 0.9, 0.9, 0.08, c, { mat: "paint", ao: false }); L.b(0, 2.25, -0.06, 0.5, 0.4, 0.04, 0xf2f0ea, { mat: "paint", ao: false }); L.b(0, 2.9, 0, 1, 0.12, 0.2, SNOW, { ao: false }); }
    { const [x, z] = lineAt(PISTE, 0.84, 18.5), d = PISTE.dir(0.84); board(G, x, z, Math.atan2(d[0], d[1]) / DEG, 3.4, 1, YEL, [[0, 0.3, 2.4, 0.4, DARK]], { y: 1.6, post: 0xdfe3e8 }); }
  }
  // 제설기: 삼각대 위의 노란 포신에서 눈안개가 뿜어져 나온다
  for (const [t, s, on] of [[0.16, -1, 1], [0.3, 1, 0], [0.44, -1, 1], [0.58, 1, 1], [0.72, -1, 0]]) {
    const [x, z] = lineAt(PISTE, t, s * 19.6), p = PISTE.point(t + 0.03), dx = p[0] - x, dz = p[1] - z, l = Math.hypot(dx, dz), L = local(w, x, z, Math.atan2(dx, dz) / DEG), y = L.y0;
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; L.beam(0, 2.3, 0, Math.cos(a) * 1.1, -0.2, Math.sin(a) * 1.1, 0.1, STEEL); }
    L.m(CYL8, 0, 2.5, -0.7, 0.5, 1.7, 0.5, YEL, "paint", 0, 72); L.m(CYL8, 0, 2.94, 0.66, 0.56, 0.2, 0.56, DARK, "paint", 0, 72); L.b(0, 1.6, -0.3, 0.5, 0.7, 0.5, 0x2f6fb0, { mat: "paint", ao: false }); L.b(0, 3.05, -0.3, 0.6, 0.12, 1, SNOW, { ao: false });
    w.col.addCapsule(V3(x, y, z), V3(x, y + 2.8, z), 0.55); KEEP.push([x, z, 3]);
    if (on) S.smoke.push([L.X(0, 1.4), y + 3.3, L.Z(0, 1.4), 3.5, (dx / l) * 10, (dz / l) * 10, 1.5, 3.4, 0xffffff, 4]);
  }
  // 결승선: 관중 울타리와 사람들, 기록판, 시상대, 깃대 (훈련 구역 바깥인 위쪽에만)
  {
    const f = SITE.finish, L = local(w, f.x, f.z, f.ry);
    for (const s of [-1, 1]) {
      fence(w, L.X(s * 9, -15), L.Z(s * 9, -15), L.X(s * 9, 1.5), L.Z(s * 9, 1.5), s > 0 ? 0x2f6fb0 : 0xd9432f, 1, 2.75);
      for (let i = 0; i < 6; i++) person(L.at(s * (10 + (i % 2) * 0.9), -13.4 + i * 2.7 + (i % 3) * 0.3, s * -90), 0, 0, (i % 3) * 20 - 20, COATS[(i * 3 + (s > 0 ? 1 : 4)) % 8], { arm: i % 3 === 0 });
      flagpole(L, s * 8.4, 3.2, 7, s > 0 ? BLUE : RED, { mid: 0xf2f0ea, yaw: f.ry + 90, col: true });
    }
    board(L, 11.4, -18.6, 0, 3, 1.7, DARK, [[-0.7, 0.9, 1.2, 0.5, 0xffd23a, 1], [0.8, 0.9, 0.7, 0.5, 0xff5a4a, 1], [-0.3, 0.25, 2, 0.4, 0x6aff8a, 1]], { y: 1.4, post: STEEL });
    const P = L.at(-13.6, -6, 90);
    for (const [u, hh, c, pc] of [[0, 0.8, YEL, 0], [-1.1, 0.55, 0xdfe3e8, 4], [1.1, 0.38, 0xc98a5a, 3]]) { P.b(u, 0, 0, 1.1, hh, 1.1, 0xf2f0ea, { mat: "paint" }); P.b(u, hh * 0.3, -0.57, 0.5, 0.3, 0.04, c, { mat: "paint", ao: false }); person(P, u, 0, 0, COATS[pc], { y: hh, arm: u === 0 }); }
  }
  // 스노파크: 지브 상자, 입구 현수막, 표시 원뿔, 보더들
  {
    const L = local(w, 2, 50, 0);
    for (const [u, v, yaw, c] of [[-1.5, 12, 8, 0xb44cff], [-13.5, -3, -10, YEL]]) { const P = L.at(u, v, yaw); P.b(0, 0, 0, 0.8, 0.6, 6, c, { mat: "paint" }); P.b(0, 0.6, 0, 0.5, 0.08, 6.1, STEEL, { mat: "metal", ao: false }); }
    for (const [u, v] of [[-5, -13.5], [-11, -13.5], [-6.4, 5.4], [-13.6, 5.4], [1.4, -4.6], [6.6, -4.6]]) L.at(u, v).m(CONE5, 0, 0, 0, 0.22, 0.6, 0.22, ORANGE, "paint");
    { const P = L.at(-4, -20, 0); for (const s of [-3, 3]) P.post(s, -0.3, 0, 4, 0.08, 0xdfe3e8); P.b(0, 2.8, 0, 6, 0.9, 0.08, 0xff4fa3, { mat: "paint", ao: false }); P.b(0, 3.05, -0.06, 4, 0.36, 0.04, 0xf2f0ea, { mat: "paint", ao: false }); P.b(0, 3.7, 0, 6.2, 0.12, 0.24, SNOW, { ao: false }); }
    for (const [u, v, yaw, c] of [[8.6, 6.4, -60, 4], [9.6, 5.2, -80, 6], [-16, 14, 150, 2]]) person(L.at(u, v), 0, 0, yaw, COATS[c], { ski: c % 2 ? RED : 0x2a9d8f });
  }
  // 중턱 산장 테라스 위: 난간, 탁자, 일광욕 의자, 손님, 깃발
  {
    const [mx, mz] = flat("mid"), x = mx + 16, z = mz - 2, L = local(w, x, z, 90, H(x, z)), ty = 4.8;
    for (let u = -5; u <= 5.01; u += 2.5) L.post(u, ty, -11.2, 1, 0.05, TIMBER_D, "std");
    for (const v of [-8.9, -6.6]) for (const u of [-5.05, 5.05]) L.post(u, ty, v, 1, 0.05, TIMBER_D, "std");
    L.b(0, ty + 0.95, -11.2, 10.2, 0.08, 0.1, TIMBER_D, { ao: false }); for (const u of [-5.05, 5.05]) L.b(u, ty + 0.95, -8.9, 0.1, 0.08, 4.7, TIMBER_D, { ao: false });
    for (const u of [-2.8, 2.4]) { L.m(CYL8, u, ty, -8.6, 0.08, 0.75, 0.08, DARK, "paint"); L.m(CYL8, u, ty + 0.75, -8.6, 0.65, 0.06, 0.65, TIMBER, "std"); }
    for (const u of [-0.6, 0.5]) { L.b(u, ty + 0.1, -10.2, 0.6, 0.1, 1.5, u < 0 ? RED : BLUE, { mat: "paint", ao: false, rx: -14 }); }
    for (const [u, v, yaw, c, o] of [[-2.8, -7.7, 0, 0, { sit: 1 }], [-1.9, -8.7, 90, 4, { sit: 1 }], [2.4, -9.6, 180, 2, {}], [3.4, -8.4, -90, 6, { arm: 1 }], [-4.4, -10.6, 200, 3, {}]]) person(L, u, v, yaw, COATS[c], { ...o, y: ty });
    flagpole(L, 4.9, -11.1, 3.6, RED, { mid: 0xf2f0ea, y: L.y0 + ty, fw: 1.6, fh: 0.9, yaw: 200 });
    skiRack(L, 8.6, -6.4, 90, 6);
  }
}

// ── 스키 점프대: 착지 사면 깃발, 전광판, 관중 ──
function jumpDetail(w, K, S, KEEP) {
  const J = SITE.jump, G = local(w, 0, 0, 0, 0);
  for (let z = 22, i = 0; z <= 64; z += 7, i++) for (const s of [-1, 1]) flagpole(G, J.x + s * 11.6, z, 3, i % 2 ? RED : BLUE, { fw: 1, fh: 0.6, yaw: 160 });
  fence(w, J.x - 11.6, 70, J.x + 11.6, 70, 0x2a9d8f, 1, 2.9);
  for (const [dx, c, o] of [[-9, 0, {}], [-7.4, 4, { arm: 1 }], [-3, 2, {}], [1.4, 6, {}], [2.6, 1, { arm: 1 }], [7.5, 5, {}], [9, 3, {}]]) person(G.at(J.x + dx, 71.3), 0, 0, 180 + dx * 2, COATS[c], o);
  const B = board(G, J.x - 18, 60, -80, 4.6, 2.5, DARK, [[-1.2, 1.5, 1.6, 0.7, 0xffd23a, 1], [1.2, 1.5, 1.2, 0.7, 0x6aff8a, 1], [-0.4, 0.4, 3.2, 0.6, 0xff5a4a, 1]], { y: 2.2, post: STEEL });
  w.col.addCapsule(V3(B.X(-2, 0), B.y0 + 3.4, B.Z(-2, 0)), V3(B.X(2, 0), B.y0 + 3.4, B.Z(2, 0)), 1.2); KEEP.push([J.x - 18, 60, 5]);
}

// ── 정상: 풍속계, 접시 안테나, 태양광판, 큰 깃발, 등산객, 경광등 ──
function summitDetail(w, K, S) {
  const [sx, sz] = flat("summit"), y = w.h(sx, sz), G = local(w, 0, 0, 0, 0), ax = sx + 2, az = sz + 1;
  w.mesh(CYL6, M(ax, y + 3.4, az, 0.05, 2.6, 0.05), 0xdfe3e8, "paint");
  const spin = prop(w, [[new THREE.BoxGeometry(1.9, 0.05, 0.07), null, DARK], [new THREE.BoxGeometry(0.07, 0.05, 1.9), null, DARK], ...[[0.95, 0], [-0.95, 0], [0, 0.95], [0, -0.95]].map(([a, b]) => [OCT, M(a, 0, b, 0.2, 0.2, 0.2), 0xf2f0ea])], "paint", false);
  spin.position.set(ax, y + 6.05, az); w.rider(spin, [[0, 0, 0, 1, 0.2, 1]]);
  w.updaters.push((dt, t) => { spin.rotation.y = t * 4.2; });
  w.mesh(CYL8, M(sx + 4.6, y + 1.6, sz + 1.6, 0.95, 0.14, 0.95, 0, 0, -62), 0xf2f0ea, "paint"); w.mesh(CYL6, M(sx + 4.5, y + 1.55, sz + 1.6, 0.05, 0.9, 0.05, 0, 0, -62), DARK, "paint");
  for (let i = 0; i < 3; i++) { const P = G.at(sx - 3 + i * 2.7, sz + 10.6); P.b(0, 0.5, 0, 2.3, 0.08, 1.5, 0x1f3a6a, { mat: "metal", rx: 32, ao: false }); P.b(0, 0.58, 0.3, 2.3, 0.06, 0.5, SNOW, { rx: 32, ao: false }); for (const s of [-0.9, 0.9]) P.post(s, -0.2, -0.3, 1.2, 0.04, STEEL); }
  const cx = sx + 9, cz = sz - 9;
  flagpole(G, cx, cz, 6.3, RED, { mid: 0xf2f0ea, fw: 2.6, fh: 1.5, yaw: 200 });
  board(G, cx - 3.4, cz - 1.4, 150, 2.4, 0.9, 0x74482a, [[0, 0.25, 1.8, 0.4, 0xf2f0ea]], { y: 0.9 });
  for (const [dx, dz, yaw, c, o] of [[-2.2, 1.6, -30, 1, { arm: 1 }], [-3.2, 2.6, 150, 5, {}], [-1, 3.4, 200, 2, {}]]) person(G.at(cx + dx, cz + dz), 0, 0, yaw, COATS[c], o);
  bench(G, sx + 1.5, sz - 11.6, 180);
  S.blink.push([sx + 6, y + 38.1, sz + 5, 0.34], [sx - 5, y + 10.75, sz - 4, 0.3], [SITE.lift.B[0], w.h(SITE.lift.B[0], SITE.lift.B[1]) + 14.7, SITE.lift.B[1], 0.3]);
}

// ── 얼음 골짜기: 다리 고드름, 골짜기를 가로지른 깃발 줄, 얼음 못 쉼터, 터널 고드름 ──
function gorgeDetail(w, K, S, KEEP) {
  const H = (x, z) => w.h(x, z), G = local(w, 0, 0, 0, 0), icicle = (L, u, y, v, len) => L.m(K.T.coneO, u, y, v, 0.07 + len * 0.06, len, 0.07 + len * 0.06, 0xdff2fb, "paint", 0, 180);
  { const T = SITE.trestle, L = local(w, T.x, T.z, T.ry, 0); for (const s of [-1.8, 1.8]) for (let u = -10; u <= 10.01; u += 1.25) icicle(L, u, T.deck - 2.2, s, 0.5 + Math.abs(Math.sin(u * 2.3 + s)) * 0.9); }
  { const B = SITE.stoneBridge, L = local(w, B.x, B.z, B.ry, B.floor); for (const s of [-1.82, 1.82]) for (let u = -2.5; u <= 2.51; u += 0.72) icicle(L, u, Math.sqrt(31.36 - u * u) + 0.02, s, 0.3 + Math.abs(Math.sin(u * 3 + s)) * 0.4); }
  for (const t of [0.44, 0.7]) {
    const p = GORGE.point(t), d = GORGE.dir(t), a = [p[0] - d[1] * 27, p[1] + d[0] * 27], b = [p[0] + d[1] * 27, p[1] - d[0] * 27], ya = H(a[0], a[1]), yb = H(b[0], b[1]);
    if (Math.min(ya, yb) - H(p[0], p[1]) < 26) continue;
    for (const [q, yq] of [[a, ya], [b, yb]]) { w.mesh(CYL6, M(q[0], yq - 0.4, q[1], 0.1, 3, 0.1), TIMBER_D, "std"); KEEP.push([q[0], q[1], 3]); }
    bunting(w, [a[0], ya + 2.5, a[1]], [b[0], yb + 2.5, b[1]], 2.4, 34, [RED, YEL, BLUE, 0xf2f0ea, GREEN]);
  }
  // 얼음 못 쉼터
  bench(G, 124.5, 109.5, 60); lantern(G.at(122.6, 107.4), 0, 0, 2.6); signpost(G, 126, 113.6, 30, [BLUE, 0xf2f0ea]); snowmanS(G, 121.4, 111.6, 100, 0.9);
  for (const [x, z, yaw, c, o] of [[146.4, 107.4, 150, 3, { arm: 1 }], [147.8, 105.8, -40, 0, {}], [124.8, 109.4, 60, 6, { sit: 1, y: 0.02 }]]) person(G.at(x, z), 0, 0, yaw, COATS[c], o);
  KEEP.push([124.5, 110, 5]);
  // 눈사태 방지 터널의 처마 고드름
  { const S_ = SITE.shed, L = local(w, S_.x, S_.z, S_.ry), up = L.Z(1, 0) < L.Z(0, 0) ? 1 : -1; for (let v = -20; v <= 20.01; v += 1.6) icicle(L, -up * 6.1, 6.2, v, 0.4 + Math.abs(Math.sin(v * 1.9)) * 0.8); }
}

// ── 야영지·전망대·빙하 탐사 캠프 ──
function campDetail(w, K, S, D, KEEP) {
  const H = (x, z) => w.h(x, z), G = local(w, 0, 0, 0, 0);
  // 통나무 야영지: 모닥불 연기, 통나무 걸상, 그루터기와 도끼, 등, 야영객
  {
    const [cx, cz] = flat("cabin"), fx = cx + 2, fz = cz + 9, y = H(fx, fz);
    S.flames.push([fx, y + 0.3, fz, 0.9]); S.smoke.push([fx, y + 1.6, fz, 9, 2.6, 1, 0.85, 6.4, 0xb9bcc4, 3]);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4, px = fx + Math.cos(a) * 2.6, pz = fz + Math.sin(a) * 2.6; w.box(px, H(px, pz), pz, 1.8, 0.42, 0.44, 0x74482a, { ry: -a / DEG + 90, col: false, mat: "std:wood", tile: 1.5 }); }
    for (const [dx, dz, yaw, c, o] of [[2.4, 1.2, -110, 3, { arm: 1 }], [-1.6, 2.4, 140, 0, {}]]) person(G.at(fx + dx, fz + dz), 0, 0, yaw, COATS[c], o);
    const P = G.at(cx - 4, cz + 4.6); P.m(CYL8, 0, 0, 0, 0.45, 0.5, 0.45, 0x8a623c, "std"); P.b(0.1, 0.5, 0, 0.08, 0.7, 0.08, TIMBER_D, { rz: 30, ao: false }); P.b(0.32, 1.02, 0, 0.3, 0.2, 0.05, STEEL, { mat: "metal", ao: false });
    lantern(G.at(cx - 5.4, cz - 1.4), 0, 0, 2.4); sled(G, cx + 6, cz + 5, 40, GREEN);
    D.steps([[cx - 6, cz - 2], [cx - 2, cz + 4], [fx - 1, fz - 1]], 0xb4c5dc, 0.8, 0.1);
  }
  // 전망 데크 끝의 구경꾼과 망원경
  {
    const [mx, mz] = flat("mesa"), y = H(mx, mz), z = mz - 14;
    let xe = mx; while (H(xe, z) > y - 3 && xe < -200) xe += 0.5;
    const x1 = xe + 17, P = local(w, x1 - 3, z, 0, y + 0.72);
    person(P, 0.6, -1.2, -90, COATS[1], { arm: 1 }); person(P, -0.8, 1.1, -80, COATS[5]); P.post(1.4, 0, 1.4, 1.2, 0.05, STEEL); P.b(1.4, 1.2, 1.4, 0.6, 0.2, 0.2, DARK, { ao: false, ry: 20 });
    lantern(G.at(mx + 3, mz - 10), 0, 0, 2.6); signpost(G, mx + 5, mz + 4, 60, [RED, 0xf2f0ea]);
  }
  // 빙하 탐사 캠프(북서 보급 지점 둘레): 천막, 깃발, 짐
  {
    const [dx, dz] = flat("dep2");
    for (const [u, v, yaw, c] of [[-6.6, -2.6, 20, YEL], [-5.4, 4.8, -30, ORANGE], [3.4, 7, 80, 0x2a9d8f]]) { const P = G.at(dx + u, dz + v, yaw); P.m(PRISM, 0, 0, 0, 1.3, 1.5, 2.8, c, "paint"); P.b(0, 1.42, 0, 0.5, 0.14, 2.9, SNOW, { ao: false }); P.b(0, 0, -1.42, 0.7, 1, 0.04, DARK, { ao: false }); }
    flagpole(G, dx + 6.4, dz - 5.4, 4.2, ORANGE, { fw: 1.5, fh: 0.9, yaw: 200 });
    { const P = G.at(dx - 2, dz + 7.4, 15); crate(P, 0, 0, 0.8); crate(P, 0.9, 0.1, 0.7, 25, 0x3f6f9a); barrel(P, -0.9, 0.2, 0xd9432f, 0.8); }
    sled(G, dx + 6, dz + 3.4, -40, ORANGE);
    for (const [u, v, yaw, c, o] of [[-4, 0.6, 100, 2, {}], [5.4, 5.6, -60, 4, { arm: 1 }]]) person(G.at(dx + u, dz + v), 0, 0, yaw, COATS[c], o);
  }
}

// ── 거점·보급 지점 바닥 표시 ──
function sitePaint(w, D, map) {
  for (const [p, c] of [[map.blue, 0x3f7fd0], [map.red, 0xd9432f]]) {
    D.disc(p[0], p[1], 28, c, 0.09, { n: 40, r0: 27.2 }); D.disc(p[0], p[1], 12.6, c, 0.09, { n: 28, r0: 12.1 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 + 0.39; D.ribbon([[p[0] + Math.cos(a) * 13.6, p[1] + Math.sin(a) * 13.6], [p[0] + Math.cos(a) * 20, p[1] + Math.sin(a) * 20], [p[0] + Math.cos(a) * 26.4, p[1] + Math.sin(a) * 26.4]], 0.5, c, 0.09); }
  }
  for (const d of map.depots) { D.disc(d[0], d[1], 5.2, ORANGE, 0.1, { n: 20, r0: 4.8 }); D.disc(d[0], d[1], 6.6, 0xd3dce8, 0.085, { n: 20, r0: 5.2 }); }
}

// ── 원경: 맵 바깥을 두르는 먼 설산 능선(충돌 없음) ──
function farRing(w) {
  const r = w.rand, peak = (x, z, rx, rz, h, ry, c) => { w.mesh(FAN, M(x, -40, z, rx, h, rz, 0, ry, 0), c, "std"); w.mesh(FAN, M(x, -40 + h * 0.6, z, rx * 0.42, h * 0.405, rz * 0.42, 0, ry + 12, 0), 0xe6eef8, "std"); };
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + r() * 0.2, d = 980 + r() * 320, x = Math.sin(a) * d, z = Math.cos(a) * d, rad = 240 + r() * 160, h = 150 + r() * 130, ry = r() * 360, c = [0xa7b9d6, 0xb1c2dc, 0x9db1d0][i % 3];
    peak(x, z, rad, rad * (0.7 + r() * 0.5), h, ry, c);
    for (const s of [-1, 1]) { const k = 0.5 + r() * 0.3, a2 = a + s * (0.1 + r() * 0.06), d2 = d - 40 - r() * 120; peak(Math.sin(a2) * d2, Math.cos(a2) * d2, rad * k * 1.2, rad * k * 0.9, h * k, ry + s * 40, c); }
  }
}

// ── 작은 움직임: 연기·눈안개(인스턴스 하나), 불꽃(인스턴스 하나), 경광등(메시 하나), 큰길의 행인 ──
function finishFx(w, S) {
  const list = [];
  for (const [x, y, z, rise, dx, dz, size, per, color, n] of S.smoke) for (let i = 0; i < n; i++) list.push({ x, y, z, rise, dx, dz, size, per, ph: i / n + list.length * 0.137, color });
  if (list.length) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    const im = new THREE.InstancedMesh(PUFF, mat, list.length), c = new THREE.Color();
    list.forEach((a, i) => im.setColorAt(i, c.set(a.color)));
    im.frustumCulled = false; im.renderOrder = 4; im.castShadow = false;
    w.scene.add(im); w.disposables.push(mat);
    w.updaters.push((dt, t) => {
      for (let i = 0; i < list.length; i++) {
        const a = list[i], u = (t / a.per + a.ph) % 1, sc = a.size * (0.35 + u * 1.2) * Math.min(1, u * 7) * Math.min(1, (1 - u) * 3);
        _m.compose(_p.set(a.x + a.dx * u * u + Math.sin(t * 0.6 + i) * 0.4 * u, a.y + a.rise * u, a.z + a.dz * u * u), _q.identity(), _s.set(sc, sc * 0.85, sc));
        im.setMatrixAt(i, _m);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
  if (S.flames.length) {
    const g = merged([[CONE5, null, 0xffffff]]);
    const im = new THREE.InstancedMesh(g, w.material("glow"), S.flames.length * 2), F = S.flames, c = new THREE.Color();
    for (let i = 0; i < F.length; i++) { im.setColorAt(i * 2, c.set(0xff8a2a)); im.setColorAt(i * 2 + 1, c.set(0xffd86a)); }
    im.frustumCulled = false; im.castShadow = false;
    w.scene.add(im); w.disposables.push(g);
    w.updaters.push((dt, t) => {
      for (let i = 0; i < F.length; i++) {
        const f = F[i], k = f[3], hy = 0.85 + 0.3 * Math.sin(t * 9 + i * 2.1) + 0.14 * Math.sin(t * 23 + i);
        _m.compose(_p.set(f[0] + Math.sin(t * 6 + i) * 0.04, f[1], f[2]), _q.identity(), _s.set(0.5 * k * (1 + 0.1 * Math.sin(t * 7 + i)), 1.35 * k * hy, 0.5 * k)); im.setMatrixAt(i * 2, _m);
        _m.compose(_p.set(f[0] + 0.1 * k, f[1], f[2] + 0.06 * k), _q.identity(), _s.set(0.28 * k, 0.9 * k * (1.7 - hy), 0.28 * k)); im.setMatrixAt(i * 2 + 1, _m);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
  if (S.blink.length) {
    const b = prop(w, S.blink.map(([x, y, z, rr]) => [OCT, M(x, y, z, rr, rr * 1.2, rr), 0xff3030]), "glow", false);
    w.updaters.push((dt, t) => { b.visible = t % 1.6 < 0.8; });
  }
}
// 큰길 가장자리를 오가는 행인 넷(닿으면 부딪힌다)
function walkers(w) {
  const path = polyPath([[44.3, 0, 134], [44.3, 0, 224], [35.7, 0, 224], [35.7, 0, 134]], true), box = (a, b, c) => new THREE.BoxGeometry(a, b, c);
  const list = [RED, 0x2a9d8f, YEL, 0xb44cff].map((c, i) => {
    const g = prop(w, [[box(0.42, 0.82, 0.3), M(0, 0.41, 0), 0x2a3340], [box(0.52, 0.8, 0.34), M(0, 1.22, 0), c], [ICO, M(0, 1.84, 0, 0.21, 0.23, 0.21), 0xf2c9a0], [box(0.44, 0.17, 0.44), M(0, 2.03, 0), i % 2 ? 0xf2f0ea : c]]);
    w.rider(g, [[0, 1, 0, 0.3, 1, 0.3]]);
    return { g, off: (i * path.len) / 4 + i * 7 };
  });
  w.updaters.push((dt, t) => { for (const a of list) { const p = path.at(t * 1.25 + a.off); a.g.position.set(p[0], w.h(p[0], p[2]) + Math.abs(Math.sin(t * 6 + a.off)) * 0.05, p[2]); a.g.rotation.y = p[3]; } });
}

// 구조물 디테일(식생을 심기 전에 부른다). D: 지면 그림 모음, map: { blue, red, depots }
export function props(w, K, KEEP, D, map) {
  const S = { smoke: [], flames: [], blink: [] };
  villageDetail(w, K, S, D);
  lakeDetail(w, K, S, D, KEEP);
  skiDetail(w, K, S, D, KEEP);
  jumpDetail(w, K, S, KEEP);
  summitDetail(w, K, S);
  gorgeDetail(w, K, S, KEEP);
  campDetail(w, K, S, D, KEEP);
  sitePaint(w, D, map);
  farRing(w);
  finishFx(w, S);
  walkers(w);
}
