// 거신 공창의 야적장과 주둔지: 거인의 팔다리가 널린 부품 야적장 · 부품을 나르는 갠트리 크레인 넷 · 병영 · 격납고 · 검문소
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, prop, ring, octa, ball, lattice, arch, V3, DEG, hash, BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ,
  SNOW, SNOW2, ICE, CONC, CONC2, SOOT, YARD, NGAN, RAIL, PARADE, snowCap,
} from "./foundry-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 14), SPHG = new THREE.SphereGeometry(1, 14, 10);
const OCTG = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.rotateY(Math.PI / 8); return g; })();
const bxp = (sx, sy, sz, x, y, z, c, rx = 0, ry = 0, rz = 0) => [BOXG, M(x, y, z, sx, sy, sz, rx, ry, rz), c];
const cyp = (r, h, x, y, z, c, rx = 0, rz = 0) => [CYLG, M(x, y, z, r, h, r, rx, 0, rz), c];
const spp = (r, x, y, z, c, sy = 1) => [SPHG, M(x, y, z, r, r * sy, r), c];

// 거대한 손가락: 마디 셋을 a → b → c → d 로 잇는다(굵기 t). 관절마다 구와 붉은 고리
function finger(w, pts, t, o = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const tt = t * (1 - i * 0.12);
    beam(w, pts[i], pts[i + 1], tt, i % 2 ? BLK2 : (o.color ?? IRON), { mat: "std:panel", col: o.col });
    if (i > 0) { w.sph(pts[i][0], pts[i][1], pts[i][2], tt * 0.68, GUN, { mat: "metal", col: false }); ball(w, pts[i][0], pts[i][1], pts[i][2], tt * 0.3, RED); }
  }
  const e = pts[pts.length - 1], p = pts[pts.length - 2], L = Math.hypot(e[0] - p[0], e[1] - p[1], e[2] - p[2]);
  // 손끝의 발톱(주황 경고색)
  beam(w, e, [e[0] + (e[0] - p[0]) / L * t * 0.7, e[1] + (e[1] - p[1]) / L * t * 0.7, e[2] + (e[2] - p[2]) / L * t * 0.7], t * 0.5, HAZ, { col: false });
}

// ── 부품 야적장: 장갑판 천막 · 무릎 관절 고리 · 손가락 아치 · 예비 발 · 선 손가락 기둥 · 장갑판 거치대 · 흩어진 관절과 볼트 ──
export function yard(w, K, ctx) {
  const ZL = 107;                               // 갠트리 주행로 한가운데의 비행 통로
  // 고정 부품이 차지한 네모(흩어 놓는 소품이 피한다) [x0, x1, z0, z1]
  const occ = [[-92, -64, 90, 124], [-117, -107, 92, 122], [-156, -144, 88, 124], [-161, -139, 38, 80], [-114, -102, 48, 76], [-78, -54, 40, 80]];
  // 1) 장갑판 천막: 거대한 흉갑판 두 장을 맞대어 세운 ㅅ자 통로 (x −90 … −66)
  {
    const x = -78, base = 14, apex = 22, sl = Math.hypot(base, apex), ang = Math.atan2(base, apex) / DEG;
    for (const sv of [-1, 1]) {
      w.box(x, apex / 2 - sl / 2, ZL + sv * base / 2, 24, sl, 2.4, sv > 0 ? BLK2 : IRON, { mat: "std:panel", tile: 8, rx: -sv * ang });
      w.box(x, apex / 2 - sl / 2 + 0.1, ZL + sv * (base / 2 + 1.5), 20, sl * 0.55, 0.5, SNOW, { rx: -sv * ang, col: false, ao: false });
      w.box(x, 0, ZL + sv * (base + 0.6), 25, 1.6, 2.4, CONC2, { mat: "std:concrete" });
      for (const ex of [-12.2, 12.2]) w.box(x + ex, apex / 2 - sl / 2, ZL + sv * (base / 2 - 0.2), 0.3, sl - 1, 2.7, RED, { mat: "glow", rx: -sv * ang, col: false });
      for (let k = 0; k < 3; k++) w.box(x - 8 + k * 8, apex / 2 - sl / 2 + 2, ZL + sv * (base / 2 - 1.5), 1.2, sl - 6, 0.6, STEEL, { mat: "paint", rx: -sv * ang, col: false });
    }
    w.box(x, apex - 0.6, ZL, 25, 1.6, 3, STEEL, { mat: "paint" });
    for (const ex of [-12, 0, 12]) K.blink.add(x + ex, apex + 1.4, ZL, RED, 0.45, ex > 0 ? 1 : 0);
    w.pool(x, 0.1, ZL, 16, RED, 0.25);
    w.gap("장갑판 천막", x, 6.5, ZL, 90, 16, 11, 300);
  }
  // 2) 무릎 관절 고리: 세워 둔 지름 19 m 고리와 양옆 물림쇠
  {
    const x = -112, y = 9.5;
    ring(w, x, y, ZL, 9.5, 1.7, IRON, { yaw: 90, seg: 32, mat: "std:panel" });
    ring(w, x, y, ZL, 7.9, 0.28, ORG, { yaw: 90, seg: 32, mat: "glow", col: false });
    ring(w, x + 1.8, y, ZL, 9.9, 0.5, HAZ, { yaw: 90, seg: 32, col: false });
    for (const sv of [-1, 1]) {
      w.box(x, 0, ZL + sv * 12.2, 7, 13, 3.4, BLK2, { mat: "std:panel", tile: 6 });
      w.pipe(x, y, ZL + sv * 10.4, x, y, ZL + sv * 14.2, 2.2, STEEL, { mat: "metal", col: false });
      w.box(x, 9.2, ZL + sv * 14.3, 3, 0.6, 0.25, RED, { mat: "glow", col: false });
      snowCap(w, x, 13, ZL + sv * 12.2, 7.4, 3.8, 0, 0.6);
    }
    w.gap("무릎 관절 고리", x, 8.5, ZL, 90, 13, 13, 350);
  }
  // 3) 손가락 아치: 통로 위로 굽은 거대한 손가락
  {
    const x = -150;
    finger(w, [[x, -1, ZL - 15.5], [x, 13.5, ZL - 10.5], [x, 18.5, ZL + 5.5], [x, 7, ZL + 13.5]], 5.2);
    w.box(x, 0, ZL - 15.5, 9, 3, 9, CONC2, { mat: "std:concrete" });
    w.box(x, 3, ZL - 15.5, 9.4, 0.5, 9.4, HAZ, { mat: "std:hazard", tile: 2, col: false });
    w.box(x, 20.9, ZL - 2.5, 4.4, 0.5, 13, SNOW, { rx: -17, col: false, ao: false });
    w.gap("손가락 아치", x, 7, ZL, 90, 15, 13, 300);
  }
  // 4) 예비 발: 뒤꿈치 덩이와 발가락 셋 사이 아치 밑을 지난다. 위에는 잘린 발목
  {
    const x = -150, zc = 58;
    w.box(x, 0, zc - 12, 19, 10, 10, BLK2, { mat: "std:panel", tile: 8 });
    w.box(x, 0, zc - 17.6, 15, 6, 2, IRON, { mat: "std:panel", rx: 14 });
    for (const dx of [-6.6, 0, 6.6]) {
      w.box(x + dx, 0, zc + 12.5, 5.2, 8.5, 11, dx ? IRON : BLK2, { mat: "std:panel", tile: 6 });
      w.box(x + dx, 0, zc + 19.2, 4.4, 4.4, 4, HAZ, { mat: "std:hazard", tile: 2, rx: -20 });
      w.box(x + dx, 5, zc + 18.05, 4, 0.5, 0.3, RED, { mat: "glow", col: false });
      snowCap(w, x + dx, 8.5, zc + 12.5, 5.4, 11.2, 0, 0.5);
    }
    w.box(x, 13, zc, 17, 7.5, 31, IRON, { mat: "std:panel", tile: 8, rx: 3 });        // 발등(아치)
    w.box(x, 12.7, zc, 12, 0.35, 12, ORG, { mat: "glow", col: false });
    for (const sx of [-1, 1]) { w.box(x + sx * 8.8, 14.5, zc, 0.3, 0.7, 27, RED, { mat: "glow", col: false }); w.pipe(x + sx * 7, 9.5, zc - 9, x + sx * 7, 14, zc - 2, 0.8, GUN, { col: false }); }
    w.sph(x, 24.5, zc - 6, 7.2, BLK2, { mat: "std:panel" });
    ring(w, x, 24.5, zc - 6, 7.6, 0.5, RED, { pitch: 90, seg: 28, mat: "glow", col: false });
    w.cyl(x, 29, zc - 6, 5.4, 6.5, IRON, { mat: "std:panel" });
    w.cyl(x, 35.5, zc - 6, 5.9, 1.2, HAZ, { mat: "std:hazard", col: false });
    w.cyl(x, 36.7, zc - 6, 3.6, 0.4, RED, { mat: "glow", col: false });
    snowCap(w, x, 20.6, zc + 8, 17.2, 14, 0, 0.6);
    K.blink.add(x, 38, zc - 6, RED, 0.6, 0);
    w.gap("예비 발 아치", x, 6.5, zc, 90, 13, 11.5, 350);
  }
  // 5) 선 손가락 기둥 둘(사이를 지난다)과 누운 손가락들
  {
    const x = -108, zc = 62;
    for (const sv of [-1, 1]) {
      finger(w, [[x, -1, zc + sv * 10.5], [x + 0.5, 10, zc + sv * 10.2], [x - 0.5, 19, zc + sv * 9.8], [x + 1.5 * sv, 26, zc + sv * 8.2]], 5);
      w.box(x, 0, zc + sv * 10.5, 8, 2, 8, CONC2, { mat: "std:concrete", col: false });
      K.blink.add(x + 1.5 * sv, 29.6, zc + sv * 7.6, RED, 0.5, sv > 0 ? 0 : 1);
    }
    w.gap("손가락 기둥 사이", x, 9, zc, 90, 14, 16, 300);
  }
  for (const [x0, z0, ry, t] of [[-182, 122, 2, 4.6], [-194, 91.5, -2, 4.2], [-144, 91, 0, 4.4], [-122, 123, -3, 4.8]]) {
    const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), P = (u, y) => [x0 + u * c, y, z0 - u * s];
    if (!ctx.clear(x0 + 12 * c, 4, z0 - 12 * s, 9)) continue;
    finger(w, [P(0, t * 0.5), P(10, t * 0.52), P(19, t * 0.5), P(26, t * 0.75)], t);
    occ.push([x0 - 2, x0 + 30, z0 - 5, z0 + 5]);
    for (const u of [4, 15]) w.box(...P(u, 0), 1.4, 0.8, t + 2, 0x4a3524, { mat: "std:wood", ry, col: false });
    w.box(...P(9, t), 13, 0.35, t * 0.7, SNOW, { ry, col: false, ao: false });
  }
  // 6) 장갑판 거치대 두 줄(사이를 지난다): ㅅ자 틀에 기대 세운 판
  {
    const x = -66, zc = 60;
    for (const sv of [-1, 1]) {
      for (let k = 0; k < 3; k++) w.box(x, -0.5, zc + sv * (9.4 + k * 1.9), 20 - k * 2, 15 - k, 1.1, k % 2 ? IRON : BLK2, { mat: "std:panel", tile: 6, rx: sv * 13 });
      for (const ex of [-8, 8]) { beam(w, [x + ex, 0, zc + sv * 17.5], [x + ex, 13, zc + sv * 13.2], 0.6, STEEL, { col: false }); }
      w.box(x, 12.2, zc + sv * 7.3, 17, 0.35, 0.3, RED, { mat: "glow", col: false });
      w.box(x, 14.3, zc + sv * 8.4, 20, 0.4, 2.2, SNOW, { rx: sv * 13, col: false, ao: false });
    }
    w.gap("장갑판 거치대 사이", x, 7, zc, 90, 13, 12, 250);
  }
  // 7) 흩어진 부품: 어깨 구 관절, 눕힌 고리 더미, 볼트, 전선 드럼, 덮개 씌운 상자
  const r = w.rand;
  for (const [x, z, s] of [[-99, 92, 5.2], [-60, 92, 5.2], [-190, 124, 5]]) {
    if (!ctx.clear(x, s, z, s + 7)) continue;
    occ.push([x - s - 1, x + s + 1, z - s - 1, z + s + 1]);
    w.box(x, 0, z, s * 2.2, 1.4, s * 2.2, CONC2, { mat: "std:concrete" });
    w.sph(x, s + 1.2, z, s, r() < 0.5 ? BLK2 : IRON, { mat: "std:panel" });
    ring(w, x, s + 1.2, z, s + 0.25, 0.45, r() < 0.5 ? RED : ORG, { pitch: 90, seg: 24, mat: "glow", col: false });
    w.cyl(x, s * 2 + 0.6, z, s * 0.45, 1.6, HAZ, { mat: "std:hazard", col: false });
    w.sph(x, s * 2 + 1.5, z, s * 0.6, SNOW, { sy: 0.3, col: false });
  }
  for (const [x, z] of [[-132, 123], [-60, 123], [-90, 46]]) {
    if (!ctx.clear(x, 3, z, 11)) continue;
    occ.push([x - 7, x + 7, z - 7, z + 7]);
    for (let k = 0; k < 3; k++) { ring(w, x + k * 0.4, 1.1 + k * 2.1, z - k * 0.3, 5.4 - k * 0.3, 1.05, k % 2 ? STEEL : IRON, { pitch: 90, seg: 24 }); }
    ring(w, x + 0.8, 6.5, z - 0.6, 4.6, 0.2, ORG, { pitch: 90, seg: 24, mat: "glow", col: false });
  }
  let n = 0;
  for (let i = 0; i < 400 && n < 46; i++) {
    const x = YARD.x0 + 4 + r() * (YARD.x1 - YARD.x0 + 2), z = 46 + r() * 94;
    if (Math.abs(z - YARD.z0) < 5 || Math.abs(z - YARD.z1) < 5 || !ctx.clear(x, 3, z, 9.5) || !ctx.clearCol(x, z, 0, 8, 9)) continue;
    if (ctx.taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr + 3) || ctx.KEEP.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr + 3)) continue;
    if (occ.some((b) => x > b[0] - 5 && x < b[1] + 5 && z > b[2] - 4 && z < b[3] + 4)) continue;
    const k = (r() * 5) | 0, ry = r() * 180;
    if (k === 0) { w.cyl(x, 0, z, 1.1, 5 + r() * 3, GUN, { mat: "metal" }); octa(w, x, 5 + r(), z, 2, 1.6, STEEL, { col: false }); }              // 볼트
    else if (k === 1) { w.pipe(x - 2.4, 2.6, z, x + 2.4, 2.6, z, 2.6, 0x4a3524, { mat: "std:wood" }); w.pipe(x - 2.7, 2.6, z, x + 2.7, 2.6, z, 1.3, BLK, { col: false }); }  // 전선 드럼
    else if (k === 2) { w.box(x, 0, z, 6, 3.2, 4, 0x454a54, { ry }); w.box(x, 3.2, z, 6.3, 0.4, 4.3, SNOW, { ry, col: false, ao: false }); }
    else if (k === 3) { for (let q = 0; q < 3; q++) w.box(x, q * 1.1, z, 9 - q, 1, 6 - q * 0.6, q % 2 ? IRON : BLK2, { mat: "std:panel", tile: 4, ry: ry + q * 7 }); w.box(x, 3.3, z, 6.6, 0.3, 4.4, SNOW, { ry: ry + 14, col: false, ao: false }); }
    else { w.container(x, 0, z, ry, r() < 0.5 ? 0x5a2420 : 0x30343c); w.box(x, 2.6, z, 12.3, 0.3, 2.5, SNOW, { ry, col: false, ao: false }); }
    ctx.taken.push([x, z, 6]); n++;
  }
}

// ── 갠트리 크레인 넷: 야적장 둘(손 · 다리 마디)과 철도 하역장 둘(붉은 눈띠의 머리 · 흉갑판). 레일 위를 오가고 트롤리가 좌우로 움직인다 ──
export function cranes(w, K) {
  const rails = (R) => {
    for (const z of [R.z0, R.z1]) {
      const xm = (R.x0 + R.x1) / 2, L = R.x1 - R.x0;
      w.box(xm, 0, z, L, 0.8, 2.6, CONC2, { mat: "std:concrete", tile: 4 });
      for (const o of [-0.7, 0.7]) w.box(xm, 0.8, z + o, L, 0.22, 0.3, GUN, { mat: "metal", col: false });
      for (const ex of [R.x0 - 1, R.x1 + 1]) { w.box(ex, 0, z, 2, 2.8, 3.2, HAZ, { mat: "std:hazard", tile: 2 }); K.blink.add(ex, 3.4, z, RED, 0.45, ex > xm ? 1 : 0); }
      for (let x = R.x0 + 10; x < R.x1; x += 20) w.box(x, 0.8, z, 0.5, 0.03, 2.6, HAZ, { col: false, ao: false });
    }
  };
  rails(YARD); rails(NGAN);
  // 매달린 부품(트롤리 원점 = 거더 밑. 아래로 −y)
  const LOADS = {
    // 거대한 손: 손바닥은 남쪽을 보고 손가락은 아래로 늘어졌다
    hand: () => {
      const b = [cyp(2.6, 2.6, 0, -6, 0, GUN), bxp(6.2, 0.9, 6.2, 0, -7.6, 0, HAZ), bxp(8.4, 8.6, 3.2, 0, -12.3, 0, BLK2), bxp(7.4, 3, 3.6, 0, -9.6, 0.2, IRON)];
      const g = [bxp(6, 0.4, 0.3, 0, -10.5, 2.05, RED), spp(1.3, 0, -12.6, 1.5, ORG, 0.5)];
      for (let k = 0; k < 4; k++) {
        const x = -3.15 + k * 2.1, cur = 10 + k * 5;
        b.push(bxp(1.8, 4.4, 2.1, x, -18.6, 0.5, IRON, cur), bxp(1.6, 3.4, 1.9, x, -22, 1.6, BLK2, cur + 22), bxp(1.2, 1.4, 1.3, x, -24, 2.6, HAZ, cur + 30), spp(1.05, x, -16.6, 0.1, GUN));
        g.push(spp(0.45, x, -16.6, 1.1, RED));
      }
      b.push(bxp(2, 4.4, 2.2, 5.1, -14, 0.8, IRON, 10, 0, 32), bxp(1.6, 3, 1.8, 6.8, -17.4, 1.4, BLK2, 20, 0, 18), spp(1.2, 4.4, -11.4, 0.4, GUN));
      return { b, g, cab: 4, box: [0, -15, 0.6, 5.5, 10, 2.6] };
    },
    // 다리 마디(정강이): 무릎 덮개와 발목 밑동
    leg: () => {
      const b = [cyp(2.4, 2, 0, -5.4, 0, GUN), bxp(5.6, 1, 5.6, 0, -6.8, 0, HAZ), bxp(6.4, 13, 6.4, 0, -13.8, 0, BLK2), bxp(7.6, 6, 7.4, 0, -11.2, 0, IRON), bxp(4.6, 5, 2, 0, -9, 4, IRON, -12), cyp(2.7, 2.6, 0, -21.4, 0, STEEL), cyp(3.1, 0.8, 0, -22.6, 0, HAZ)];
      const g = [bxp(6.6, 0.5, 6.6, 0, -15, 0, RED), bxp(0.4, 8, 0.3, 0, -15, 3.3, ORG), cyp(2, 0.3, 0, -23.1, 0, RED)];
      return { b, g, cab: 4, box: [0, -14, 0, 4, 9.6, 4] };
    },
    // 거신의 머리: 팔각 투구, 한 줄 붉은 눈띠, 양옆 깃, 아래 목 꽂이
    head: () => {
      const b = [bxp(13.4, 9, 13, 0, -12, 0, BLK2), [OCTG, M(0, -6.6, 0, 6.4, 2.4, 6.4), IRON], bxp(11, 3.4, 5, 0, -15.4, 4.4, IRON, 10), bxp(9, 2.6, 2.4, 0, -8.6, 6.4, IRON, -24), bxp(4, 2.2, 2.2, 0, -5, 0, HAZ),
        bxp(1.2, 9, 8, 7.4, -11, -1.5, IRON, 0, 0, -8), bxp(1.2, 9, 8, -7.4, -11, -1.5, IRON, 0, 0, 8), bxp(0.8, 6, 3, 8.2, -5, -3, STEEL, -20), bxp(0.8, 6, 3, -8.2, -5, -3, STEEL, -20), cyp(3, 2.6, 0, -17.8, 0, STEEL), cyp(1.6, 1.6, 0, -19.6, 0, GUN)];
      const g = [bxp(13.9, 1.5, 0.5, 0, -11.2, 6.5, RED), bxp(0.5, 1.5, 5, 6.95, -11.2, 4.5, RED), bxp(0.5, 1.5, 5, -6.95, -11.2, 4.5, RED), cyp(1.2, 0.3, 0, -20.5, 0, ORG), bxp(0.3, 4, 0.3, 0, -14.5, 7.2, DRED)];
      return { b, g, cab: 5, box: [0, -12.5, 0.5, 8, 8.5, 7.5] };
    },
    // 흉갑판: 갈비 보강대가 붙은 넓은 판을 세워 매달았다
    plate: () => {
      const b = [bxp(15, 0.8, 1.2, 0, -5.2, 0, HAZ), bxp(17, 12, 1.8, 0, -12, 0, BLK2), bxp(13, 4, 2.6, 0, -9, 0.2, IRON), bxp(15.4, 1.2, 2.4, 0, -17.6, 0, IRON)];
      for (const x of [-6, -2, 2, 6]) b.push(bxp(1, 10.4, 2.6, x, -12, 0, STEEL));
      const g = [bxp(16, 0.4, 0.3, 0, -6.6, 0.95, RED), bxp(16, 0.4, 0.3, 0, -17, 1.25, RED)];
      return { b, g, cab: 6.5, box: [0, -12, 0, 8.6, 6.5, 1.6] };
    },
  };
  const list = [
    { R: YARD, x: -172, amp: 13, load: "hand", ph: 0.4 }, { R: YARD, x: -114, amp: 13, load: "leg", ph: 2.3 },
    { R: NGAN, x: -124, amp: 28, load: "head", ph: 1.1 }, { R: NGAN, x: -30, amp: 24, load: "plate", ph: 3.6 },
  ];
  for (const c of list) {
    const { R } = c, Y = R.y, span = R.z1 - R.z0, zc = (R.z0 + R.z1) / 2, hs = span / 2;
    // 문틀: 다리 넷(ㅅ자) + 대차 + 쌍 거더 + 운전실
    const b = [], gl = [];
    for (const sv of [-1, 1]) {
      for (const su of [-1, 1]) b.push(bxp(1.5, Math.hypot(Y, 3.4), 1.7, su * 3.3, Y / 2, sv * hs, IRON, 0, 0, su * Math.atan2(3.4, Y) / DEG));
      b.push(bxp(11.5, 1.8, 3, 0, 1.7, sv * hs, BLK2), bxp(12, 0.5, 3.2, 0, 2.85, sv * hs, HAZ), bxp(6, 1, 1.4, 0, Y * 0.5, sv * hs, STEEL), bxp(3.4, 1, 1.4, 0, Y * 0.78, sv * hs, STEEL));
      gl.push(bxp(0.25, Y - 8, 0.3, 0, Y / 2, sv * (hs + 0.95), RED), spp(0.6, 0, Y + 5.6, sv * hs, RED));
    }
    for (const su of [-1, 1]) {
      b.push(bxp(1.6, 3.6, span + 8, su * 2.6, Y + 1.8, 0, IRON), bxp(1.7, 0.5, span + 8.2, su * 2.6, Y + 3.85, 0, HAZ), bxp(1.9, 0.35, span + 8.4, su * 2.6, Y + 4.25, 0, SNOW));
      gl.push(bxp(0.25, 0.3, span - 2, su * 3.5, Y + 0.4, 0, su > 0 ? RED : ORG));
    }
    for (let k = -2; k <= 2; k++) b.push(bxp(6.8, 0.8, 0.8, 0, Y + 3, k * span / 5, STEEL));
    b.push(bxp(4.2, 3.4, 4.6, 5.4, Y - 2.2, -hs + 5, BLK2), bxp(1, 6, 1, 4, Y + 1, -hs + 5, STEEL));
    gl.push(bxp(0.2, 1.4, 3.6, 7.55, Y - 1.6, -hs + 5, 0xbfe8ff));
    const g = new THREE.Group(); g.position.set(c.x, 0, zc);
    g.add(prop(w, b, "paint"), prop(w, gl, "glow", false));
    // 트롤리와 짐
    const tr = new THREE.Group(); tr.position.y = Y;
    const L = LOADS[c.load]();
    const tb = [bxp(6.6, 1.8, 6, 0, 0.5, 0, STEEL), bxp(3, 1.4, 3, 0, -0.9, 0, BLK2)];
    for (const [cx, cz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) tb.push(cyp(0.14, L.cab, cx, -1.4 - L.cab / 2, cz, BLK));
    const sway = new THREE.Group();
    sway.add(prop(w, L.b, "std:panel"), prop(w, L.g, "glow", false));
    tr.add(prop(w, tb, "paint"), sway);
    g.add(tr); w.scene.add(g);
    w.rider(g, [[0, Y / 2, -hs, 4.6, Y / 2, 1.2], [0, Y / 2, hs, 4.6, Y / 2, 1.2], [0, Y + 2, 0, 3.6, 2.2, hs + 4]], "crane");
    w.rider(tr, [L.box], "crane");
    w.updaters.push((dt, t) => {
      g.position.x = c.x + Math.sin(t * 0.11 + c.ph) * c.amp;
      tr.position.z = Math.sin(t * 0.19 + c.ph * 1.7) * (hs - 13);
      sway.rotation.x = Math.sin(t * 0.8 + c.ph) * 0.025; sway.rotation.z = Math.cos(t * 0.63 + c.ph) * 0.02;
    });
  }
  w.gap("야적장 갠트리 밑", -143, 12, 107, 90, 30, 20, 150);
  w.gap("하역 갠트리 밑", -78, 9, RAIL.zB, 90, 12, 8, 200);
}

// ── 주둔지: 병영 세 동 · 격납고 둘(앞뒤로 뚫림) · 남쪽 검문 아치와 감시탑 · 연료 탱크 · 수비대 진지의 낮은 방벽 ──
export function garrison(w, K, ctx) {
  // 병영: 긴 막사에 눈 덮인 박공지붕, 붉은 틈창, 굴뚝 김
  for (let k = 0; k < 3; k++) {
    const x = 82, z = 102 + k * 20, L = 58, D = 11;
    w.box(x, 0, z, L, 6, D, k % 2 ? 0x30343c : 0x2a2d34, { mat: "std:panel", tile: 6 });
    w.box(x, 0, z, L + 1, 1.4, D + 1, CONC2, { mat: "std:concrete", col: false });
    for (const sv of [-1, 1]) { w.box(x, 6.9, z + sv * D * 0.26, L + 1.4, 0.7, D * 0.62, SNOW, { rx: sv * 20, ao: false }); for (let q = 0; q < 8; q++) w.box(x - L / 2 + 5 + q * 6.9, 3, z + sv * (D / 2 + 0.06), 2.6, 0.9, 0.15, q % 3 ? RED : ORG, { mat: "glow", col: false }); }
    w.box(x, 6, z, L + 0.4, 2.2, 1, IRON, { mat: "paint", col: false });
    for (const ex of [-18, 6]) { w.cyl(x + ex, 6, z + 2.6, 0.5, 4, STEEL, { mat: "paint", col: false }); K.steam.add(x + ex, 10.4, z + 2.6, 1.2, 12, 2, 0.3); }
    w.box(x - L / 2 - 0.1, 0, z, 0.3, 3.4, 3, HAZ, { mat: "std:hazard", tile: 2, col: false });
  }
  // 격납고 둘: 다각 아치 지붕, 남북으로 뚫려 있어 꿰뚫고 날 수 있다. 한 동에는 수송정이 서 있다
  [[68, 193], [101, 193]].forEach(([x, z], hi) => {
    const HW = 14, D = 36, N = 7, R = HW, pts = [];
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI; pts.push([-Math.cos(a) * R, 4 + Math.sin(a) * 10]); }
    for (let i = 0; i < N; i++) {
      const [u0, y0] = pts[i], [u1, y1] = pts[i + 1], sl = Math.hypot(u1 - u0, y1 - y0), rz = Math.atan2(y1 - y0, u1 - u0) / DEG;
      w.box(x + (u0 + u1) / 2, (y0 + y1) / 2 - 0.4, z, sl + 0.5, 0.8, D, i % 2 ? IRON : BLK2, { mat: "std:corrug", tile: 4, rz });
      if (i > 0 && i < N - 1) w.box(x + (u0 + u1) / 2, (y0 + y1) / 2 + 0.25, z, sl * 0.8, 0.6, D - 1, SNOW, { rz, col: false, ao: false });
    }
    for (const su of [-1, 1]) { w.box(x + su * HW, 0, z, 1.4, 4.4, D, CONC2, { mat: "std:concrete", tile: 6 }); w.box(x + su * (HW - 0.8), 2.2, z, 0.15, 0.5, D - 2, hi ? ORG : RED, { mat: "glow", col: false }); }
    for (const sv of [-1, 1]) {
      // 입구 테두리: 아치 리브와 붉은 등
      for (let i = 0; i < N; i++) beam(w, [x + pts[i][0], pts[i][1], z + sv * D / 2], [x + pts[i + 1][0], pts[i + 1][1], z + sv * D / 2], 0.9, i % 2 ? HAZ : STEEL, { col: false });
      K.blink.add(x, 15.2, z + sv * D / 2, RED, 0.5, sv > 0 ? 1 : 0);
    }
    w.box(x, 0.02, z, HW * 2 - 3, 0.06, D + 16, 0x3a3e46, { mat: "std:concrete", tile: 8, col: false, ao: false });
    w.box(x, 0.1, z - D / 2 - 5, 16, 0.03, 0.6, HAZ, { col: false, ao: false });
    w.pool(x, 0.15, z, 15, hi ? ORG : RED, 0.3);
    w.gap("격납고 관통", x, 6, z, 0, 22, 10, 350);
    if (hi) return;
    // 격납고 안쪽 벽가의 수송정(낮은 쐐기 동체) — 가운데 통로는 비운다
    w.box(x - 8.4, 0.6, z + 2, 5, 2.6, 16, BLK2, { mat: "std:panel", tile: 4 });
    w.box(x - 8.4, 3.2, z + 4, 3.4, 1.2, 8, IRON, { mat: "paint", col: false });
    w.box(x - 8.4, 1.6, z - 6.2, 4, 0.5, 0.3, RED, { mat: "glow", col: false });
    for (const o of [-6, 8]) w.box(x - 8.4, 0, z + o, 6.4, 0.6, 1, STEEL, { mat: "paint", col: false });
  });
  // 남쪽 검문 아치(진입로 위)와 감시탑 둘
  arch(w, K, 0, 222, 24, 15, 0, { name: "검문 아치 아래", color: BLK2, accent: HAZ, light: RED, pts: 200 });
  for (const sx of [-1, 1]) {
    const x = sx * 22, z = 216;
    lattice(w, x, 0, z, 2.2, 15, 3, GUN, { t: 0.4 });
    w.box(x, 15, z, 6.4, 0.5, 6.4, IRON, { mat: "paint" });
    w.box(x, 15.5, z, 5, 3, 5, BLK2, { mat: "std:panel", tile: 3 });
    w.box(x, 16.6, z - 2.55, 4.2, 0.8, 0.15, RED, { mat: "glow", col: false });
    snowCap(w, x, 18.5, z, 6, 6, 0, 0.6);
    w.wall(sx * 14, 222, sx * 60, 222, 3, 0.6, CONC2, { mat: "std:concrete" });
    K.search.push([x, 19.6, z, sx > 0 ? 0 : 3, 0.22 * sx, 58]);
  }
  // 연료 탱크 밭(남서)과 배관
  for (let k = 0; k < 5; k++) {
    const x = -112 + (k % 3) * 14 + (k > 2 ? 7 : 0), z = k > 2 ? 208 : 196;
    if (!ctx.free(x, z, 2)) continue;
    w.cyl(x, 0, z, 5.2, 7.5, k % 2 ? 0x3a3f48 : 0x30343c, { mat: "std:panel" });
    w.cyl(x, 5, z, 5.35, 0.6, k % 2 ? HAZ : DRED, { mat: "paint", col: false });
    w.sph(x, 7.5, z, 5.2, SNOW, { sy: 0.22, col: false });
    w.pipe(x, 1.2, z - 5, x, 1.2, z - 9.5, 0.4, GUN, { col: false });
    ctx.taken.push([x, z, 7]);
  }
  w.pipe(-116, 1.2, 186.5, -76, 1.2, 186.5, 0.4, GUN, { col: false });
  // 수비대 진지 둘레의 낮은 방벽과 용치(전차 장애물): 본부 자리는 비운다
  const r = w.rand;
  for (let k = 0; k < 26; k++) {
    const a = k * 0.2417 + 0.1, d = 43 + (k % 2) * 4, x = 160 + Math.cos(a) * d, z = 170 + Math.sin(a) * d;
    if (!ctx.free(x, z, 1.5) || k % 4 === 3) continue;
    w.box(x, 0, z, 7.5, 1.9, 1.5, CONC2, { mat: "std:concrete", tile: 3, ry: -a / DEG + 90 });
    w.box(x, 1.9, z, 7.7, 0.35, 1.7, SNOW, { ry: -a / DEG + 90, col: false, ao: false });
    if (k % 3 === 0) K.blink.add(x, 2.7, z, RED, 0.3, k);
  }
  for (let k = 0; k < 40; k++) {
    const x = 108 + r() * 108, z = 106 + r() * 8;
    if (ctx.free(x, z, 1)) { w.box(x, -0.4, z, 2, 2.2, 2, CONC, { mat: "std:concrete", rx: 35, rz: 35, ry: r() * 90, col: false }); }
  }
}
