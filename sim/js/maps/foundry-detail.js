// 거신 공창의 소품과 효과: 가로등 · 투광 기둥 · 상자와 통 · 가장자리의 눈 더미·바위·침엽수 · 회전 레이더 · 탐조등 · 용접 불꽃과 쇳물 불티 · 눈발
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, prop, ring, octa, ball, lattice, V3, DEG, hash, searchlights, BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, EMB, HAZ,
  SNOW, SNOW2, CONC, CONC2, C, PIT_R, PIT_D, ROAD_R, RIM, HALL, PSTN, PARADE, polar, height, chanDist, inCause, edge, industry, snowCap,
} from "./foundry-kit.js";
import { snowfall } from "./snow-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 12);
const COLD = 0xbfe8ff, LAMP = 0xffb070;

export function props(w, K, ctx) {
  const r = w.rand, F = -PIT_D;
  // 순환로 바깥 가로등(주황)과 진입로 가로등
  for (let th = 8; th < 360; th += 24) {
    const [x, z] = polar(th, ROAD_R + 8.2);
    if (chanDist(x, z) < 11 || inCause(x, z, 4) || !ctx.clearCol(x, z, 0, 9, 5)) continue;
    w.lamp(x, z, 8, LAMP, th + 180, 2);
  }
  for (let z = 76; z < 212; z += 22) for (const sx of [-1, 1]) w.lamp(sx * 9.4, z, 8, LAMP, sx > 0 ? -90 : 90, 2);
  // 구덩이 가장자리의 투광 기둥: 거신을 비추는 찬 빛
  for (let k = 0; k < 10; k++) {
    const th = k * 36 + 6, [x, z] = polar(th, PIT_R + 10.5);
    if (chanDist(x, z) < 12 || !ctx.clearCol(x, z, 0, 22, 8)) continue;
    w.box(x, 0.3, z, 0.9, 19, 0.9, STEEL, { mat: "paint" });
    w.box(x, 0.3, z, 2.4, 1.2, 2.4, CONC2, { mat: "std:concrete", col: false });
    const [hx, hz] = polar(th, PIT_R + 9.6);
    w.box(hx, 18.4, hz, 4.2, 2.2, 0.5, BLK, { ry: th, rx: 0, col: false });
    w.box(hx - Math.sin(th * DEG) * 0.3, 18.6, hz - Math.cos(th * DEG) * 0.3, 3.6, 1.7, 0.2, COLD, { mat: "glow", ry: th, col: false });
    K.blink.add(x, 20.6, z, RED, 0.4, k);
    w.pool(...polar(th, PIT_R + 3), 0.4, 9, COLD, 0.22);
  }
  // 구덩이 바닥의 작업 소품: 용접기 수레, 전선 드럼, 발판 더미, 바닥 투광기
  for (let k = 0; k < 26; k++) {
    const th = r() * 360, d = 27 + r() * 26, [x, z] = polar(th, d);
    if (!ctx.clear(x, F + 3, z, 8) || Math.abs(Math.hypot(x - C[0], z - C[1]) - 53) < 6 || chanDist(x, z) < 12) continue;
    const q = k % 4;
    if (q === 0) { w.box(x, F, z, 3.4, 2.2, 2.2, HAZ, { mat: "std:hazard", tile: 2, ry: th }); ball(w, x, F + 2.6, z, 0.35, RED); }
    else if (q === 1) w.pipe(x - 1.6, F + 1.8, z, x + 1.6, F + 1.8, z, 1.8, 0x4a3524, { mat: "std:wood" });
    else if (q === 2) { for (let i = 0; i < 3; i++) w.box(x, F + i * 0.5, z, 6, 0.4, 2.6, i % 2 ? IRON : STEEL, { ry: th + i * 6, col: i === 0 }); }
    else { w.box(x, F, z, 1.4, 3, 1.4, BLK2, { ry: th }); w.box(x, F + 3, z, 2.6, 1.4, 0.4, COLD, { mat: "glow", ry: th + 180, col: false }); w.pool(x, F + 0.2, z, 7, COLD, 0.3); }
  }
  // 공장 바닥 곳곳의 상자·통·배관 더미(빈 자리에만)
  let n = 0;
  for (let i = 0; i < 900 && n < 120; i++) {
    const x = (r() * 2 - 1) * 215, z = (r() * 2 - 1) * 215;
    if (industry(x, z) < 0.5 || !ctx.free(x, z, 2.5, 7)) continue;
    const k = (r() * 6) | 0, ry = r() * 180;
    if (k === 0) { w.container(x, 0, z, ry, r() < 0.5 ? 0x5a2420 : 0x2e323a); if (r() < 0.5) w.container(x, 2.6, z, ry + 4, 0x3c4048); w.box(x, r() < 2 ? 2.6 : 5.2, z, 12.3, 0.25, 2.5, SNOW, { ry, col: false, ao: false }); }
    else if (k === 1) { for (let q = 0; q < 3; q++) w.cyl(x + Math.cos(q * 2.1) * 1.1, 0, z + Math.sin(q * 2.1) * 1.1, 0.7, 1.8, q ? RUST : DRED, { mat: "metal", col: q === 0 }); }
    else if (k === 2) { w.box(x, 0, z, 3, 2.4, 3, 0x40454e, { ry }); w.box(x, 2.4, z, 3.2, 0.3, 3.2, SNOW, { ry, col: false, ao: false }); }
    else if (k === 3) { for (let q = 0; q < 4; q++) w.pipe(x - 4, 0.6 + (q > 1 ? 1 : 0), z + (q % 2) * 1.1 - 0.5 + (q > 1 ? 0.5 : 0), x + 4, 0.6 + (q > 1 ? 1 : 0), z + (q % 2) * 1.1 - 0.5 + (q > 1 ? 0.5 : 0), 0.52, q % 2 ? GUN : RUST, { col: q === 0, mat: "metal" }); }
    else if (k === 4) { w.box(x, 0, z, 5, 3.6, 3, BLK2, { mat: "std:panel", tile: 3, ry }); w.box(x, 1.8, z, 5.2, 0.4, 3.2, r() < 0.5 ? RED : ORG, { mat: "glow", ry, col: false }); w.box(x, 3.6, z, 1, 3, 1, STEEL, { ry, col: false }); K.blink.add(x, 7, z, RED, 0.35, n); }
    else { w.box(x, 0, z, 2.2, 1.4, 6, HAZ, { mat: "std:hazard", tile: 2, ry }); }
    ctx.taken.push([x, z, 9]); n++;
  }
  // 눈밭의 눈 더미와 바위, 침엽수(가장자리 산자락에 무리 지어)
  n = 0;
  for (let i = 0; i < 700 && n < 70; i++) {
    const x = (r() * 2 - 1) * 222, z = (r() * 2 - 1) * 222;
    if (industry(x, z) > 0.15 || !ctx.free(x, z, 3, 5)) continue;
    if (r() < 0.6) w.sph(x, 0, z, 3 + r() * 5, SNOW, { sy: 0.22 + r() * 0.12, col: false });
    else { w.blob(x, 0.6, z, 1.6 + r() * 2.4, 1.2 + r() * 1.4, 1.6 + r() * 2.4, 0x6a727e, { mat: "std:rock" }); w.sph(x, 1.5, z, 1.8, SNOW, { sy: 0.3, col: false }); }
    ctx.taken.push([x, z, 5]); n++;
  }
  n = 0;
  for (let i = 0; i < 2600 && n < 230; i++) {
    const a = r() * 6.283, d = 214 + r() * 150, x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d * 1.05, e = edge(x, z);
    if (e < RIM - 10 || e > RIM + 120 || Math.abs(z + 180) < 16 || (e < RIM && !ctx.free(x, z, 3, 16))) continue;
    if (hash(Math.round(x / 40), Math.round(z / 40)) < 0.35) continue;      // 무리 사이 빈터
    const y = height(x, z) - 0.4, s = 0.8 + r() * 0.9, col = e < RIM + 12;
    w.cyl(x, y, z, 0.35 * s, 3 * s, 0x3a2c22, { col: false, rt: 0.2 * s });
    for (let q = 0; q < 3; q++) {
      w.cone(x, y + (2 + q * 3.2) * s, z, (3.6 - q * 0.95) * s, 5.2 * s, q % 2 ? 0x1f3b33 : 0x24443a, { col: col && q === 0, mat: "leaf" });
      w.cone(x, y + (4.1 + q * 3.2) * s, z, (2.5 - q * 0.75) * s, 3.2 * s, SNOW, { col: false, mat: "leaf", grad: [0.86, 1.05] });
    }
    n++;
  }
  // 회전 레이더(병영 옆 탑)와 발전소 지붕의 환풍기
  {
    const x = 122, z = 158;
    if (ctx.clearCol(x, z, 0, 30, 8)) {
      lattice(w, x, 0, z, 2.2, 20, 4, GUN, { t: 0.4 });
      w.box(x, 20, z, 6, 0.6, 6, IRON, { mat: "paint" });
      const dish = prop(w, [[BOXG, M(0, 2.4, 0, 9, 3.6, 0.5, -12, 0, 0), BLK2], [BOXG, M(0, 2.4, 0.6, 7, 0.4, 0.3, -12, 0, 0), STEEL], [CYLG, M(0, 0.6, 0, 0.5, 1.4, 0.5), STEEL], [BOXG, M(0, 2.4, 1.4, 0.3, 0.3, 2.4), STEEL]], "paint");
      const lit = prop(w, [[BOXG, M(0, 4.4, 0.1, 8.6, 0.25, 0.3, -12, 0, 0), RED]], "glow", false);
      const g = new THREE.Group(); g.position.set(x, 20.6, z); g.add(dish, lit); w.scene.add(g);
      w.updaters.push((dt) => { g.rotation.y += dt * 0.7; });
      K.blink.add(x, 26, z, RED, 0.5, 0);
    }
    const fans = [];
    for (let k = 0; k < 4; k++) fans.push([PSTN.x - 14 + k * 8, 21.9, PSTN.z + 2]);
    for (let k = 0; k < 3; k++) fans.push([HALL.x0 + 9 + k * 14, HALL.h + 2.7, HALL.z - 0]);
    const blade = [[BOXG, M(0, 0, 0, 5.4, 0.16, 0.9), STEEL], [BOXG, M(0, 0, 0, 0.9, 0.16, 5.4), STEEL], [CYLG, M(0, 0, 0, 0.7, 0.5, 0.7), BLK]];
    const im = new THREE.InstancedMesh(new THREE.BufferGeometry().copy(prop(w, blade, "paint").geometry), w.material("paint"), fans.length);
    im.frustumCulled = false; w.scene.add(im);
    for (const [x, y, z] of fans) { ring(w, x, y - 0.2, z, 3, 0.3, IRON, { pitch: 90, seg: 16, col: false }); }
    const mm = new THREE.Matrix4();
    w.updaters.push((dt, t) => { fans.forEach(([x, y, z], i) => { mm.makeRotationY(t * (2.4 + i * 0.3)).setPosition(x, y, z); im.setMatrixAt(i, mm); }); im.instanceMatrix.needsUpdate = true; });
  }
  // 둘레 울타리(가장자리 산자락 앞)와 경고 표지
  for (const [ax, az, bx, bz] of [[-214, -140, -214, -100], [-214, 60, -214, 130], [214, -60, 214, 0], [214, 40, 214, 100], [-120, 222, -60, 222], [-200, 214, -128, 222], [128, 222, 196, 216]]) {
    w.wall(ax, az, bx, bz, 3.2, 0.3, 0x30343c, { col: false });
    w.wall(ax, az, bx, bz, 0.35, 0.5, RED, { mat: "glow", col: false, y: 2.6 });
  }
}

export function lights(w, K, ctx) {
  // 탐조등: 검문 감시탑(주둔지에서 등록) + 주조동 지붕 · 발전소 지붕 · 터널 머리벽 · 야적장
  for (const [x, y, z, ph, sp, tilt] of [[HALL.x0 + 6, HALL.h + 4, HALL.z + 9, 1, 0.18, 62], [PSTN.x + 10, 22.6, PSTN.z + 2, 2.4, -0.2, 60], [60, 18.2, -164, 4, 0.16, 56], [-128, 24, 142, 0.6, -0.17, 60]]) {
    if (!ctx.clearCol(x, z, 0, y + 3, 6)) continue;
    if (y > 23.5 && z > 100) { lattice(w, x, 0, z, 1.8, y - 1.2, 3, GUN, { t: 0.36 }); w.box(x, y - 1.2, z, 5, 0.5, 5, IRON, { mat: "paint", col: false }); }
    K.search.push([x, y, z, ph, sp, tilt]);
  }
  searchlights(w, K.search);
  // 거신을 올려 비추는 빛 기둥(가슴 노심 아래)과 구덩이 속 붉은 등
  w.shaft(C[0], 100, C[1], 2, 13, 14, RED, 0.05);
  for (let k = 0; k < 6; k++) { const [x, z] = polar(k * 60 + 30, 30); w.pool(x, -PIT_D + 0.2, z, 12, k % 2 ? RED : ORG, 0.35); }
  // 연병장 모서리 등과 착륙 표식 불빛
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = PARADE[0] + sx * 40, z = PARADE[1] + sz * 37; w.box(x, 0, z, 0.6, 5, 0.6, STEEL, { mat: "paint" }); w.box(x, 5, z, 1.2, 0.5, 1.2, RED, { mat: "glow", col: false }); w.pool(x, 0.1, z, 8, RED, 0.3); }
  for (let k = 0; k < 12; k++) K.blink.add(PARADE[0] + Math.sin(k * 0.5236) * 30, 0.5, PARADE[1] + Math.cos(k * 0.5236) * 30, RED, 0.32, k);
}

export function effects(w, K) {
  // 불꽃: 용접 자리(kind 0, 간헐적으로 튄다)와 쇳물이 떨어지는 자리(kind 1, 계속 튄다). 점 구름 하나
  const src = K.sparks, per = src.map((s) => (s[4] ? 42 : 22)), N = per.reduce((a, b) => a + b, 0);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), meta = [];
  src.forEach((s, si) => { for (let i = 0; i < per[si]; i++) meta.push([si, hash(si * 31 + i, 5), hash(si * 17 + i, 9) * 6.283, 0.3 + hash(si + i * 7, 3) * 0.7, hash(i, si) * 2 - 1]); });
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; pts.renderOrder = 7; w.scene.add(pts); w.disposables.push(pg, pts.material);
  // 용접 섬광: 자리마다 번쩍이는 흰 구
  const weld = src.filter((s) => !s[4]);
  const fg = new THREE.SphereGeometry(1, 8, 6), fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.7, 3.2) });
  const flash = new THREE.InstancedMesh(fg, fm, Math.max(1, weld.length)); flash.frustumCulled = false; w.scene.add(flash); w.disposables.push(fg, fm);
  const mm = new THREE.Matrix4();
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const [si, seed, ang, spd, up] = meta[i], s = src[si];
      const lava = s[4], on = lava || Math.sin(t * (0.9 + (si % 5) * 0.23) + si * 1.9) > 0.15;
      const u = (t * (lava ? 0.7 : 1.5) + seed) % 1, R = s[3] * spd;
      if (!on) { pos[i * 3 + 1] = -500; continue; }
      const vy = lava ? 9 + up * 3 : 2.5 + up * 3.5, g = lava ? 13 : 14;
      pos[i * 3] = s[0] + Math.cos(ang) * R * u * 1.6; pos[i * 3 + 1] = s[1] + vy * u - g * u * u; pos[i * 3 + 2] = s[2] + Math.sin(ang) * R * u * 1.6;
      const k = 1 - u * 0.75; col[i * 3] = 1.6 * k; col[i * 3 + 1] = (lava ? 0.7 : 1.0) * k * k; col[i * 3 + 2] = (lava ? 0.2 : 0.5) * k * k * k;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    weld.forEach((s, i) => {
      const si = src.indexOf(s), on = Math.sin(t * (0.9 + (si % 5) * 0.23) + si * 1.9) > 0.15, f = on ? 0.5 + 0.5 * Math.abs(Math.sin(t * 37 + i * 3)) : 0.0001;
      mm.makeScale(f, f, f).setPosition(s[0], s[1], s[2]); flash.setMatrixAt(i, mm);
    });
    flash.instanceMatrix.needsUpdate = true;
  });
  // 눈발
  snowfall(w, 1700, 100);
}
