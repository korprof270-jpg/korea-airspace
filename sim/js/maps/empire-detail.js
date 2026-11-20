// 기계제국 수도 디테일: 검은 모노리스 숲, 성벽 안쪽에 겹겹이 쌓인 공장 블록, 대로의 감시 거상, 굴뚝, 부품 더미·붉은 말뚝, 가로등, 탐조등 자리
import * as THREE from "../../vendor/three.module.min.js";
import {
  monolith, searchlights, V3, DEG, hash,
  BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, EMB, HAZ,
  SP, ROAD_R, AVE, WALL, CONV_B,
} from "./empire-kit.js";
import { stack, lineY } from "./empire-works.js";
import { CORNERS } from "./empire-base.js";

// ── 모노리스 숲: 북서 구역은 빽빽하게, 나머지는 드문드문. 레이스 선·에너지선 아래로는 낮춘다 ──
export function towers(w, K, ctx) {
  const r = w.rand, lights = [];
  const zones = [
    { x0: -236, x1: -16, z0: -236, z1: -16, n: 70, tries: 2600, hmin: 34, hmax: 128 },   // 북서: 모노리스 숲
    { x0: 16, x1: 140, z0: -236, z1: -130, n: 9, tries: 500, hmin: 30, hmax: 90 },        // 북동 바깥
    { x0: 140, x1: 236, z0: 10, z1: 236, n: 10, tries: 700, hmin: 26, hmax: 80 },         // 남동 바깥
    { x0: -236, x1: -16, z0: 16, z1: 236, n: 12, tries: 900, hmin: 26, hmax: 86 },        // 남서
    { x0: 16, x1: 236, z0: -130, z1: -16, n: 6, tries: 500, hmin: 24, hmax: 70 },         // 동쪽 가장자리
  ];
  for (const Z of zones) {
    let n = 0;
    for (let i = 0; i < Z.tries && n < Z.n; i++) {
      const x = Z.x0 + r() * (Z.x1 - Z.x0), z = Z.z0 + r() * (Z.z1 - Z.z0);
      const sx = 10 + r() * 10, sz = 10 + r() * 10, R = Math.hypot(sx, sz) / 2;
      if (Math.abs(x) > WALL - 26 - R || Math.abs(z) > WALL - 26 - R) continue;
      if (!ctx.free(x, z, R + 3)) continue;
      const far = Math.min(1, Math.hypot(x - SP[0], z - SP[1]) / 260);
      let h = Z.hmin + (Z.hmax - Z.hmin) * (0.35 + 0.65 * r()) * (1 - far * 0.35);
      h = Math.min(h, lineY(x, z) - 12, ctx.cap(x, z, R + 6));
      if (h < 20) continue;
      const top = monolith(w, K, x, z, sx, sz, h, { r });
      ctx.taken.push([x, z, R + 2]);
      if (top > 90 && lights.length < 6 && lights.every((l) => Math.hypot(l[0] - x, l[2] - z) > 70)) lights.push([x, top + 4, z, r() * 6, 0.12 + r() * 0.1, 40 + r() * 8]);
      n++;
    }
  }
  return lights;
}

// ── 성벽 안쪽 공장 블록 줄: 벽에 붙어 2단으로 쌓인 상자들, 붉은 창 띠, 배기구 ──
export function rimBlocks(w, K, ctx) {
  const r = w.rand;
  const sides = [[1, 0, -1], [1, 0, 1], [0, 1, -1], [0, 1, 1]];   // [축이 x 인가, z 인가, 부호]
  for (const [ax, , sg] of sides) {
    for (let s = -WALL + 22; s < WALL - 22;) {
      const L = 16 + r() * 20, D = 12 + r() * 8, c = s + L / 2;
      const inner = sg * (WALL - 3 - D / 2), x = ax ? c : inner, z = ax ? inner : c, sx = ax ? L : D, sz = ax ? D : L;
      s += L + 2 + r() * 6;
      if (!ctx.free(x, z, Math.max(sx, sz) / 2 - 2)) continue;
      const h1 = 18 + r() * 26, h2 = r() < 0.6 ? 8 + r() * 22 : 0;
      w.box(x, 0, z, sx, h1, sz, r() < 0.5 ? BLK : BLK2, { mat: "std:panel", tile: 8 });
      w.box(x, h1 - 5, z, sx + 0.24, 1.1, sz + 0.24, RED, { mat: "glow", col: false });
      w.box(x, h1, z, sx + 0.8, 0.8, sz + 0.8, IRON, { mat: "paint", col: false });
      if (h2) {
        const k = 0.55 + r() * 0.25, ox = ax ? (r() - 0.5) * L * 0.3 : sg * D * 0.15, oz = ax ? sg * D * 0.15 : (r() - 0.5) * L * 0.3;
        w.box(x + ox, h1, z + oz, sx * (ax ? k : 0.6), h2, sz * (ax ? 0.6 : k), IRON, { mat: "std:panel", tile: 8 });
        w.box(x + ox, h1 + h2 - 3, z + oz, sx * (ax ? k : 0.6) + 0.24, 0.8, sz * (ax ? 0.6 : k) + 0.24, RED2, { mat: "glow", col: false });
      }
      // 앞면 배기구
      const fx = ax ? x : x - sg * (D / 2 + 0.1), fz = ax ? z - sg * (D / 2 + 0.1) : z;
      w.box(fx, 3, fz, ax ? 4 : 0.2, 2.4, ax ? 0.2 : 4, ORG, { mat: "glow", col: false });
      ctx.taken.push([x, z, Math.max(sx, sz) / 2]);
    }
  }
}

// ── 굴뚝 무리 (남동·북동 구석) ──
export function stacks(w, K, ctx) {
  const list = [[212, 206, 86], [192, 222, 72], [222, 182, 64], [-214, -214, 78], [150, 214, 70]];
  for (const [x, z, H] of list) {
    if (!H || !ctx.free(x, z, 7)) continue;
    stack(w, K, x, z, H);
    ctx.taken.push([x, z, 8]);
  }
}

// ── 감시 거상: 대로를 내려다보는 거대한 기계 병사 조각상(붉은 눈) ──
function sentinel(w, K, x, z, ry) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
  w.box(x, 0, z, 7, 2.4, 7, IRON, { mat: "paint", ry });
  for (const su of [-1, 1]) { const [lx, lz] = P(su * 1.6, 0); w.box(lx, 2.4, lz, 1.6, 9, 2, BLK2, { mat: "paint", ry }); }
  w.box(x, 11.4, z, 6, 7, 3.4, BLK, { mat: "std:panel", ry });
  for (const su of [-1, 1]) {
    const [sx, sz] = P(su * 3.7, 0); w.box(sx, 15, sz, 2.4, 3, 3, IRON, { mat: "paint", ry });
    const [hx, hz] = P(su * 3.8, 0.8); w.box(hx, 6, hz, 1.4, 9, 1.6, BLK2, { mat: "paint", ry, col: false });
  }
  w.box(x, 18.4, z, 3, 3, 3, BLK, { mat: "paint", ry });
  const [ex, ez] = P(0, 1.55); w.box(ex, 19.4, ez, 2.4, 0.6, 0.2, RED, { mat: "glow", ry, col: false });
  const [cx2, cz2] = P(0, 1.75); w.box(cx2, 12.5, cz2, 0.5, 4.5, 0.12, RED, { mat: "glow", ry, col: false });
  K.blink.add(x, 22, z, RED, 0.35, 0);
}
export function sentinels(w, K, ctx) {
  const spots = [];
  for (let zz = SP[1] - 80; zz > -WALL + 30; zz -= 30) spots.push([-(AVE + 7), zz, -90], [AVE + 7, zz, 90]);
  for (let zz = 28; zz < 90; zz += 28) spots.push([-(AVE + 7), zz, -90], [AVE + 7, zz, 90]);
  for (const [x, z, ry] of spots) {
    if (!ctx.free(x, z, 5)) continue;
    sentinel(w, K, x, z, ry);
    ctx.taken.push([x, z, 6]);
  }
}

// ── 바닥 소품: 부품 상자 더미, 붉은 말뚝 줄, 바닥 배기 격자, 부서진 연합 드론 잔해 ──
export function props(w, K, ctx) {
  const r = w.rand;
  let n = 0;
  for (let i = 0; i < 2400 && n < 70; i++) {
    const x = (r() * 2 - 1) * 225, z = (r() * 2 - 1) * 225;
    if (!ctx.free(x, z, 5)) continue;
    const k = r();
    if (k < 0.4) {
      const ry = ((r() * 4) | 0) * 90;
      for (let j = 0; j < 2 + ((r() * 3) | 0); j++) w.box(x + (j % 2) * 2.6, j > 1 ? 1.8 : 0, z + ((j / 2) | 0) * 0.2, 2.4, 1.8, 2.4, j % 3 ? RUST : IRON, { mat: "std:corrug", tile: 2, ry });
      w.box(x + 1.3, 0.9, z + 1.22, 2, 0.2, 0.05, RED, { mat: "glow", col: false });
    } else if (k < 0.62) {
      // 바닥 배기 격자: 주황빛이 새어 나온다
      w.box(x, 0, z, 5, 0.3, 5, IRON, { mat: "paint", col: false });
      w.box(x, 0.3, z, 4, 0.05, 4, ORG, { mat: "glow", col: false });
      w.pool(x, 0.1, z, 7, ORG, 0.35);
    } else if (k < 0.8) {
      // 붉은 말뚝 넷
      for (let j = 0; j < 4; j++) { const a = j * 1.57 + r(); w.cyl(x + Math.cos(a) * 2.5, 0, z + Math.sin(a) * 2.5, 0.25, 2.2, BLK2, { mat: "paint" }); w.box(x + Math.cos(a) * 2.5, 2.2, z + Math.sin(a) * 2.5, 0.4, 0.4, 0.4, RED, { mat: "glow", col: false }); }
    } else {
      // 추락한 연합 드론 잔해(주황 띠)
      const ry = r() * 360;
      w.box(x, 0, z, 3.2, 0.9, 2.4, 0x6c6f74, { mat: "paint", ry, rz: 8 });
      w.box(x, 0.5, z, 3.3, 0.25, 0.5, 0xff8a1e, { mat: "paint", ry, col: false });
      for (let j = 0; j < 3; j++) { const a = r() * 6.28; w.pipe(x, 0.5, z, x + Math.cos(a) * 2.6, 0.2 + r() * 0.8, z + Math.sin(a) * 2.6, 0.12, 0x3a3d44, { col: false }); }
      w.box(x + 2, 0, z - 1, 1.4, 0.3, 1.2, BLK, { col: false, ry: r() * 90 });
    }
    ctx.taken.push([x, z, 5]);
    n++;
  }
  // 순환 대로 가로등 (붉은 빛)
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.16, x = Math.cos(a) * (ROAD_R + 11), z = Math.sin(a) * (ROAD_R + 11);
    if (ctx.free(x, z, 1)) w.lamp(x, z, 9, i % 4 ? 0xff5a48 : 0xffa060, -a / DEG + 90 + 180, 2);
  }
}

// ── 탐조등: 첨탑 허리 셋 + 높은 모노리스 + 성벽 모서리 탑 ──
export function lightsAll(w, extra) {
  const list = [];
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.4; list.push([SP[0] + Math.cos(a) * 13.5, 109, SP[1] + Math.sin(a) * 13.5, a, 0.16 + i * 0.04, 44]); }
  for (const [x, z] of CORNERS) list.push([x - Math.sign(x) * 4, 68, z - Math.sign(z) * 4, hash(x, z) * 6, 0.2, 38]);
  searchlights(w, list.concat(extra));
}
