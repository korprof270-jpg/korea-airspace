// 제국 궤도 발사기지 바다 구역: 함대 항만(정박한 전함 셋, 부두와 문형 크레인, 컨테이너 야적장), 해안포 방파제와 관제 첨탑, 해상 플랫폼과 둑길 다리
import {
  THREE, M, beam, prop, ring, octa, ball, V3, DEG, hash, local, paint, strip, slab, circle, truss, mast,
  BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, HAZ, CONC2, CONC3, ASPH2, WHT, HULL, HULL2, DECK,
  WY, SEA, QUAY_Z, PIERS, SHIPS, MOLE, MOLE_R, BASTION, TIP, PLATS, CAUSE, CAUSE2,
} from "./spaceport-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const WARM = 0xffc98a;

// ═══════════ 전함 ═══════════
// 포탑: 낮은 원통 받침 + 각진 포탑 + 포신. dir: +1 = 함수(북) 쪽을 본다
function turret(w, x, y, z, dir, n = 2, s = 1) {
  w.cyl(x, y, z, 3.5 * s, 1.1, IRON, { col: false });
  w.box(x, y + 1.1, z, 6.2 * s, 2.5 * s, 7 * s, BLK2, { mat: "std:panel", tile: 4 });
  w.box(x, y + 1.1 + 2.5 * s, z + dir * 0.6 * s, 4.4 * s, 0.7, 4.6 * s, IRON, { col: false });
  w.box(x, y + 2.2, z - dir * 3.55 * s, 4.6 * s, 0.35, 0.15, RED, { mat: "glow", col: false });
  for (let k = 0; k < n; k++) { const ox = (k - (n - 1) / 2) * 1.9 * s; w.pipe(x + ox, y + 2.3 * s, z - dir * 3 * s, x + ox, y + 3.6 * s, z - dir * 13 * s, 0.36 * s, GUN, { col: false }); w.pipe(x + ox, y + 2.3 * s, z - dir * 3 * s, x + ox, y + 2.75 * s, z - dir * 6.4 * s, 0.6 * s, IRON, { col: false }); }
}
function warship(w, K, S, idx) {
  const { x, z0, z1, bw } = S, L = z1 - z0, big = bw > 19, hb = bw / 2, D = 7, pierSide = idx === 0 ? -1 : idx === 1 ? 1 : -1;
  const out = (k) => [[x, z0 - (k - 1) * 12], [x + hb * 0.62 * k, z0 + 11], [x + hb * k, z0 + 28], [x + hb * k, z1 - 9], [x + hb * 0.8 * k, z1 + (k - 1) * 8], [x - hb * 0.8 * k, z1 + (k - 1) * 8], [x - hb * k, z1 - 9], [x - hb * k, z0 + 28], [x - hb * 0.62 * k, z0 + 11]];
  slab(w, out(1), WY - 2.5, 5, HULL, "paint");
  slab(w, out(1.012), WY - 0.4, WY + 0.9, DRED, "paint");
  slab(w, out(1.02), 5, D, DECK, "std:panel");
  w.col.addBox(V3(x, (WY - 2 + D) / 2, (z0 + 26 + z1) / 2), V3(hb, (D - WY + 2) / 2, (z1 - z0 - 26) / 2));
  w.col.addBox(V3(x, (WY - 2 + D) / 2, z0 + 19), V3(hb * 0.8, (D - WY + 2) / 2, 7));
  w.col.addBox(V3(x, (WY - 2 + D) / 2, z0 + 7), V3(hb * 0.36, (D - WY + 2) / 2, 5.5));
  // 뱃전: 붉은 항해등 띠, 현창, 닻
  for (const s of [-1, 1]) {
    w.box(x + s * (hb + 0.2), 5.6, (z0 + 28 + z1 - 9) / 2, 0.15, 0.3, L - 40, RED, { mat: "glow", col: false });
    for (let z = z0 + 32; z < z1 - 12; z += 6.5) w.box(x + s * (hb + 0.05), 2.4, z, 0.12, 0.5, 1.1, WARM, { mat: "glow", col: false });
    w.box(x + s * hb * 0.66, 2.5, z0 + 12, 0.6, 2.2, 1.8, IRON, { col: false, ry: s * 20 });
    for (let z = z0 + 30; z < z1 - 6; z += 4) w.box(x + s * (hb - 0.2), D, z, 0.12, 1, 0.12, GUN, { col: false });
    w.box(x + s * (hb - 0.2), D + 0.95, (z0 + 28 + z1 - 6) / 2, 0.1, 0.1, L - 34, GUN, { col: false });
  }
  ball(w, x, D + 1.2, z0 + 1.5, 0.5, RED); ball(w, x, D + 1.2, z1 - 0.5, 0.5, WHT);
  w.box(x, D + 0.02, z0 + 9, 1.6, 0.06, 4, RED, { mat: "glow", col: false, ry: 45 });
  // 상부 구조 (s = 함수에서 잰 거리)
  const Z = (s) => z0 + s, H = big ? 1.25 : 1;
  turret(w, x, D, Z(15), 1, big ? 3 : 2, big ? 1.15 : 1);
  w.cyl(x, D, Z(26.5), 4.2, 2.6, IRON, {});
  turret(w, x, D + 2.6, Z(26.5), 1, big ? 3 : 2, big ? 1.15 : 1);
  // 함교 탑: 세 단 + 창 띠 + 격자 돛대 + 도는 레이더
  const b0 = big ? 35 : 32, b1 = big ? 53 : 45, bl = b1 - b0, bz = Z((b0 + b1) / 2);
  w.box(x, D, bz, bw * 0.64, 6 * H, bl, BLK2, { mat: "std:panel", tile: 5 });
  w.box(x, D + 6 * H, bz - 1, bw * 0.48, 6 * H, bl * 0.72, BLK, { mat: "std:panel", tile: 5 });
  w.box(x, D + 12 * H, bz - 2, bw * 0.34, 5 * H, bl * 0.46, BLK2, { mat: "std:panel", tile: 4 });
  w.box(x, D + 17 * H, bz - 2, bw * 0.4, 0.6, bl * 0.52, IRON, { col: false });
  w.box(x, D + 13.6 * H, bz - 2 - bl * 0.235, bw * 0.3, 1.2, 0.2, WARM, { mat: "glow", col: false });
  for (const s of [-1, 1]) { w.box(x + s * bw * 0.172, D + 13.6 * H, bz - 2, 0.2, 1.2, bl * 0.4, WARM, { mat: "glow", col: false }); w.box(x + s * bw * 0.243, D + 8 * H, bz - 1, 0.2, 0.5, bl * 0.6, RED, { mat: "glow", col: false }); w.box(x + s * bw * 0.36, D + 6 * H, bz - bl * 0.3, bw * 0.24, 0.5, 3.4, IRON, { col: false }); }
  w.box(x, D + 3 * H, bz - bl / 2 - 0.1, bw * 0.4, 0.6, 0.2, RED, { mat: "glow", col: false });
  const my = D + 17 * H + 0.6, mh = big ? 16 : 12;
  mast(w, x, my, bz - 2, 1.3, mh, 4, IRON, { t: 0.3, taper: 0.5, col: false });
  w.col.addCapsule(V3(x, my, bz - 2), V3(x, my + mh, bz - 2), 1.2);
  w.box(x, my + mh * 0.55, bz - 2, bw * 0.5, 0.3, 0.3, GUN, { col: false });
  K.blink.add(x, my + mh + 1.2, bz - 2, RED, 0.5, idx); K.blink.add(x - bw * 0.25, my + mh * 0.55 + 0.5, bz - 2, RED, 0.3, idx + 1); K.blink.add(x + bw * 0.25, my + mh * 0.55 + 0.5, bz - 2, RED, 0.3, idx + 1);
  const rad = prop(w, [[BOXG, M(0, 0.9, 0, 7, 1.6, 0.4), BLK2], [BOXG, M(0, 0, 0, 0.6, 1, 0.6), IRON]], "paint");
  rad.position.set(x, my + mh + 0.2, bz - 2); K.spin.push([rad, 1.2 + idx * 0.3]);
  // 연돌: 뒤로 기운 굴뚝 둘 + 붉은 테 + 옅은 증기
  const f0 = big ? 61 : 60, f1 = big ? 77 : 74, fz = Z((f0 + f1) / 2), fl = f1 - f0;
  w.box(x, D, fz, bw * 0.5, 5 * H, fl, BLK2, { mat: "std:panel", tile: 5 });
  w.box(x, D + 5 * H, fz, bw * 0.54, 0.5, fl + 0.6, IRON, { col: false });
  for (const e of [-1, 1]) {
    const cz = fz + e * fl * 0.24, top = D + 5 * H + 11 * H;
    w.pipe(x, D + 5 * H, cz, x, top, cz + 2.6, 2.1, BLK, {});
    ring(w, x, top - 1, cz + 2.4, 2.25, 0.3, RED, { pitch: 90, col: false, mat: "glow", seg: 16 });
    K.vap.add(x, top + 1, cz + 2.6, 1.5, 9, 2, [0.4, 0.5], 0.1);
  }
  // 뒤쪽 낮은 구조물과 대공포, 함미 포탑, 착함 표식
  const a0 = big ? 79 : 76, a1 = big ? 85 : 86, az = Z((a0 + a1) / 2);
  w.box(x, D, az, bw * 0.46, 3.6, a1 - a0, BLK, { mat: "std:panel", tile: 5 });
  for (const s of [-1, 1]) { w.box(x + s * bw * 0.34, D, Z(a0 - 4), 2, 1.6, 2, IRON, { col: false }); w.pipe(x + s * bw * 0.34, D + 1.4, Z(a0 - 4), x + s * bw * 0.4, D + 3.6, Z(a0 - 6), 0.14, GUN, { col: false }); w.box(x + s * bw * 0.34, D, Z(b1 + 3), 2, 1.6, 2, IRON, { col: false }); w.pipe(x + s * bw * 0.34, D + 1.4, Z(b1 + 3), x + s * bw * 0.42, D + 3.4, Z(b1 + 3), 0.14, GUN, { col: false }); }
  turret(w, x, D, Z(big ? 107 : 95), -1, big ? 3 : 2, big ? 1.05 : 1);
  ring(w, x, D + 0.1, Z(big ? 92 : L - 6), big ? 6 : 3.4, 0.2, HAZ, { pitch: 90, col: false, seg: 28 });
  if (big) { paint(w, x, Z(92), 0.5, 7, HAZ, D + 0.04); paint(w, x, Z(92), 7, 0.5, HAZ, D + 0.04); }
  // 계류 줄과 현문 다리(부두 쪽)
  const px = x + pierSide * (hb + 10);
  for (const s of [20, L - 14]) { w.pipe(x + pierSide * (hb - 0.5), D + 0.3, Z(s), px + pierSide * 0.6, 0.9, Z(s + 5), 0.09, 0x8a8576, { col: false }); w.cyl(px + pierSide * 0.6, 0, Z(s + 5), 0.5, 0.9, IRON, { col: false, rt: 0.35 }); }
  beam(w, [x + pierSide * (hb - 0.4), D + 0.2, Z(56)], [px + pierSide * 1.5, 0.5, Z(56)], 0.4, GUN, { tw: 1.6 });
  w.gap(`${S.name} 과 부두 사이`, x + pierSide * (hb + 5), 1.6, Z(L * 0.36), 0, 9, 7.6, 450);
}
export function fleet(w, K) {
  SHIPS.forEach((S, i) => warship(w, K, S, i));
  w.gap("전함 사이 수로", (SHIPS[0].x + SHIPS[1].x) / 2, 2.4, 170, 0, 16, 9, 450);
}

// ═══════════ 부두: 문형 크레인, 계선주, 컨테이너 ═══════════
function portalCrane(w, K, px, zc, sd, load, idx) {
  const lx = 6.6, lz = 6, H = 26;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    w.box(px + sx * lx, 0, zc + sz * lz, 1.3, H, 1.3, IRON, { mat: "paint" });
    w.box(px + sx * lx, 0, zc + sz * lz, 2.2, 1.5, 3.6, HAZ, { col: false });
    beam(w, [px + sx * lx, 15, zc + sz * lz], [px + sx * (lx - 4), 22.4, zc + sz * lz], 0.5, STEEL, { col: false });
  }
  for (const s of [-1, 1]) { w.box(px, 22, zc + s * lz, lx * 2 + 1.3, 2, 1.2, IRON, { mat: "paint" }); w.box(px + s * lx, 22, zc, 1.2, 2, lz * 2 - 1.2, IRON, { mat: "paint" }); w.box(px + s * lx, 23.1, zc, 0.2, 0.5, lz * 2 - 2, HAZ, { col: false }); }
  w.box(px, H, zc, lx * 2 + 2, 1, lz * 2 + 2, BLK2, { mat: "std:panel", tile: 4 });
  w.box(px - sd * 2.5, H + 1, zc, 8, 5, 8.6, DRED, { mat: "std:panel", tile: 4 });
  w.box(px - sd * 2.5, H + 6, zc, 8.6, 0.5, 9.2, IRON, { col: false });
  w.box(px - sd * 2.5, H + 3, zc + 4.35, 5, 0.6, 0.15, RED, { mat: "glow", col: false }); w.box(px - sd * 2.5, H + 3, zc - 4.35, 5, 0.6, 0.15, RED, { mat: "glow", col: false });
  const by = H + 4;
  for (const s of [-1, 1]) truss(w, [px - sd * 13, by, zc + s * 1.9], [px + sd * 39, by, zc + s * 1.9], 2.6, 0.5, IRON, { color2: STEEL, n: 20, col: s > 0 });
  for (let k = -13; k <= 39; k += 6.5) beam(w, [px + sd * k, by, zc - 1.9], [px + sd * k, by, zc + 1.9], 0.35, STEEL, { col: false });
  w.box(px + sd * 39.4, by, zc, 1, 3, 5, HAZ, { col: false });
  w.box(px - sd * 12, by - 2.6, zc, 4, 3, 5, BLK, { col: false });                // 평형추
  // A 자 기둥과 당김줄
  const ap = [px - sd * 1, H + 22, zc];
  for (const s of [-1, 1]) { beam(w, [px - sd * 6, H + 6, zc + s * 3], ap, 0.6, IRON, { col: false }); beam(w, [px + sd * 4, by + 2.6, zc + s * 1.9], ap, 0.6, IRON, { col: false }); }
  w.col.addCapsule(V3(px - sd * 1, H + 6, zc), V3(...ap), 1.2);
  for (const k of [38, 20]) w.pipe(ap[0], ap[1], ap[2], px + sd * k, by + 2.7, zc, 0.11, GUN, { col: false });
  w.pipe(ap[0], ap[1], ap[2], px - sd * 12.5, by + 2.7, zc, 0.11, GUN, { col: false });
  K.blink.add(ap[0], ap[1] + 0.8, ap[2], RED, 0.5, idx); K.blink.add(px + sd * 39.6, by + 3.4, zc, RED, 0.4, idx + 1);
  // 운전실
  w.box(px + sd * 9, by - 3.4, zc + 3.2, 3, 3, 3, BLK2, { col: false }); w.box(px + sd * 10.55, by - 2.4, zc + 3.2, 0.12, 1.2, 2.4, WARM, { mat: "glow", col: false });
  // 매달린 화물: 대차 + 줄 + 컨테이너가 배와 부두 사이를 오간다
  if (load) {
    const drop = 11, m = prop(w, [
      [BOXG, M(0, 0, 0, 3.4, 1.2, 4.6), BLK2], [BOXG, M(0, -drop / 2, 1.6, 0.1, drop, 0.1), GUN], [BOXG, M(0, -drop / 2, -1.6, 0.1, drop, 0.1), GUN],
      [BOXG, M(0, -drop, 0, 2.8, 0.5, 6.6), HAZ], [BOXG, M(0, -drop - 1.6, 0, 2.44, 2.6, 12.2), [DRED, 0x30343c, RUST][idx % 3]],
    ], "paint");
    m.position.set(px + sd * 8, by - 0.7, zc);
    w.rider(m, [[0, -drop - 1.6, 0, 1.3, 1.4, 6.1]]);
    K.loads.push({ m, x0: px + sd * 3, x1: px + sd * 27, ph: idx * 1.7 });
  }
  w.gap("부두 크레인 다리 사이", px, 9, zc, 0, 11, 17, 300);
}
export function piers(w, K) {
  const SPEC = [[0, 112, 1, true], [0, 138, 1, false], [0, 166, 1, true], [1, 108, -1, true], [1, 142, -1, true], [1, 176, 1, false]];
  SPEC.forEach(([pi, z, sd, load], i) => portalCrane(w, K, PIERS[pi].x, z, sd, load, i));
  for (const p of PIERS) {
    for (let z = QUAY_Z + 8; z < p.z1; z += 11) for (const s of [-1, 1]) w.cyl(p.x + s * (p.hw + 1.4), 0.3, z, 0.45, 0.8, IRON, { col: false, rt: 0.3 });
    // 끝단 등대 기둥
    w.cyl(p.x, 0, p.z1 + 1, 1.1, 7, BLK2, { rt: 0.7 }); w.cyl(p.x, 7, p.z1 + 1, 0.9, 1.2, RED, { mat: "glow", col: false }); K.blink.add(p.x, 9, p.z1 + 1, RED, 0.5, 0);
    for (const s of [-1, 1]) for (let z = QUAY_Z + 20; z < p.z1 - 8; z += 30) { w.cyl(p.x + s * (p.hw - 0.4), 0, z + s * 7, 0.14, 9, GUN, { col: false }); w.box(p.x + s * (p.hw - 1.2), 8.9, z + s * 7, 1.8, 0.2, 0.5, 0xfff0d0, { mat: "glow", col: false }); }
  }
  // 안벽 컨테이너 야적장(두 부두 사이)
  const r = w.rand, COL = [DRED, 0x30343c, RUST, 0x4a4e57, BLK2, 0x6a2a22];
  for (let x = -80; x <= -26; x += 13.4) for (const z of [66.4, 70.6]) { const n = 1 + ((r() * 3) | 0); for (let k = 0; k < n; k++) w.container(x + (r() - 0.5) * 0.6, k * 2.6, z, 0, COL[(r() * COL.length) | 0]); }
  for (let x = -124; x <= -116; x += 4) w.container(x, 0, 66, 90, COL[(r() * COL.length) | 0]);
}

// ═══════════ 방파제 포대와 관제 첨탑 ═══════════
// 해안포: 둥근 포좌 + 장갑 포탑 + 긴 포신 둘. az: 포신이 향하는 방위(도, 0 = +x)
function coastGun(w, K, x, z, az, s = 1) {
  const c = Math.cos(az * DEG), sn = Math.sin(az * DEG), ry = -az;
  w.cyl(x, 0, z, 5.4 * s, 2.2, CONC3, { mat: "std:concrete" });
  w.cyl(x, 2.2, z, 4.6 * s, 0.6, IRON, { col: false });
  w.box(x - c * 0.8 * s, 2.8, z - sn * 0.8 * s, 8.4 * s, 3.4 * s, 7 * s, BLK2, { ry, mat: "std:panel", tile: 4 });
  w.box(x - c * 1.6 * s, 2.8 + 3.4 * s, z - sn * 1.6 * s, 5 * s, 0.9, 5 * s, IRON, { ry, col: false });
  w.box(x + c * 3.45 * s, 4.4 * s, z + sn * 3.45 * s, 0.15, 0.5, 5.6 * s, RED, { ry, mat: "glow", col: false });
  for (const k of [-1, 1]) {
    const ox = -sn * k * 1.5 * s, oz = c * k * 1.5 * s;
    w.pipe(x + ox + c * 3 * s, 4.6 * s, z + oz + sn * 3 * s, x + ox + c * 17 * s, 7.6 * s, z + oz + sn * 17 * s, 0.5 * s, GUN, {});
    w.pipe(x + ox + c * 3 * s, 4.6 * s, z + oz + sn * 3 * s, x + ox + c * 8 * s, 5.7 * s, z + oz + sn * 8 * s, 0.85 * s, IRON, { col: false });
  }
  K.blink.add(x - c * 3 * s, 2.8 + 3.4 * s + 1.4, z - sn * 3 * s, RED, 0.35, (x | 0) & 1);
}
export function mole(w, K, STRIKE) {
  const [a, b, c] = MOLE, dx = b[0] - a[0], dz = b[1] - a[1], L1 = Math.hypot(dx, dz), ux = dx / L1, uz = dz / L1, nx = uz, nz = -ux;   // n: 바다 쪽(북동)
  // 흉벽: 바다 쪽 가장자리의 낮은 벽 + 붉은 띠
  w.wall(a[0] + ux * 16 + nx * 13.6, a[1] + uz * 16 + nz * 13.6, b[0] - ux * 30 + nx * 13.6, b[1] - uz * 30 + nz * 13.6, 1.6, 1.2, CONC2, { mat: "std:concrete", y: 0 });
  w.wall(b[0] + 13.6, b[1] + 32, c[0] + 13.6, c[1] - 6, 1.6, 1.2, CONC2, { mat: "std:concrete", y: 0 });
  for (let i = 0; i < 28; i++) {
    const an = (i + 0.5) / 28 * 360, da = (t) => Math.abs(((an - t + 540) % 360) - 180);
    if (da(211.6) < 30 || da(93.5) < 30) continue;
    const R = BASTION[2] - 1.4, px = BASTION[0] + Math.cos(an * DEG) * R, pz = BASTION[1] + Math.sin(an * DEG) * R;
    w.box(px, 0, pz, 1.2, i % 2 ? 1.6 : 2.6, 2 * R * Math.tan(Math.PI / 28) + 0.2, i % 2 ? CONC2 : CONC3, { ry: -an, mat: "std:concrete" });
    if (i % 2 === 0) K.blink.add(px, 3.1, pz, RED, 0.3, i / 2);
  }
  // 방파제 길 가운데 선과 포좌 표식
  strip(w, [a[0] + ux * 6, a[1] + uz * 6], [b[0] - ux * 20, b[1] - uz * 20], 7, ASPH2, 0.05);
  strip(w, [b[0], b[1] + 20], [c[0], c[1] - 10], 7, ASPH2, 0.05);
  for (const [x, z] of STRIKE.turrets) { ring(w, x, 0.1, z, 5, 0.25, HAZ, { pitch: 90, col: false, seg: 24 }); }
  ring(w, STRIKE.core[0], 0.1, STRIKE.core[1], 16, 0.4, RED, { pitch: 90, col: false, mat: "glow", seg: 48 });
  ring(w, STRIKE.core[0], 0.1, STRIKE.core[1], 19, 0.5, HAZ, { pitch: 90, col: false, seg: 48 });
  // 해안포 넷
  coastGun(w, K, 128.7, 99.1, -58, 1);
  coastGun(w, K, 184, 109, -40, 1.1);
  coastGun(w, K, 172.5, 170, 0, 1);
  coastGun(w, K, 172.5, 190, 20, 1);
  // 보루 가장자리의 탄약고와 탐지 기둥
  for (const an of [20, 62, 150]) {
    const px = BASTION[0] + Math.cos(an * DEG) * 26.5, pz = BASTION[1] + Math.sin(an * DEG) * 26.5;
    w.box(px, 0, pz, 7, 3, 5, BLK2, { ry: -an, mat: "std:panel", tile: 4 }); w.box(px, 3, pz, 7.4, 0.4, 5.4, IRON, { ry: -an, col: false });
    w.box(px - Math.cos(an * DEG) * 2.6, 1.2, pz - Math.sin(an * DEG) * 2.6, 0.15, 0.5, 3.6, RED, { ry: -an, mat: "glow", col: false });
  }
  // 관제 첨탑: 팔각 받침 + 가는 탑 + 관제실 + 안테나 + 도는 레이더
  const [tx, tz] = TIP;
  octa(w, tx, 0, tz, 7.5, 9, BLK2, { mat: "std:panel" });
  octa(w, tx, 9, tz, 5.4, 3, IRON, { col: false });
  w.cyl(tx, 12, tz, 3.6, 50, BLK, { rt: 2.2, mat: "std:panel", tile: 5 });
  for (const y of [22, 34, 46]) ring(w, tx, y, tz, 3.4 - (y - 12) * 0.028 + 0.2, 0.25, RED, { pitch: 90, col: false, mat: "glow", seg: 20 });
  octa(w, tx, 62, tz, 6.6, 1.2, IRON, { col: false });
  octa(w, tx, 63.2, tz, 6, 4.4, BLK2, { mat: "std:panel" });
  octa(w, tx, 64.4, tz, 6.1, 1.6, WARM, { mat: "glow", col: false });
  octa(w, tx, 67.6, tz, 6.8, 0.8, IRON, { col: false });
  w.cyl(tx, 68.4, tz, 1.6, 6, IRON, { rt: 0.8, col: false });
  w.pipe(tx, 74, tz, tx, 96, tz, 0.3, GUN, { col: false });
  K.blink.add(tx, 97, tz, RED, 0.7, 0); K.blink.add(tx, 84, tz, RED, 0.4, 1);
  for (let k = 0; k < 4; k++) { const an = k * 90 + 45; K.blink.add(tx + Math.cos(an * DEG) * 7, 68.8, tz + Math.sin(an * DEG) * 7, RED, 0.35, k); }
  const rad = prop(w, [[BOXG, M(0, 1.2, 0, 9, 2, 0.4), BLK2], [BOXG, M(0, 0, 0, 0.7, 1, 0.7), IRON]], "paint");
  rad.position.set(tx, 74.4, tz); K.spin.push([rad, 0.8]);
}

// ═══════════ 해상 플랫폼과 둑길 다리 ═══════════
export function offshore(w, K) {
  // 1번 플랫폼: 가운데 착륙장, 가장자리에 관제동·연료통·포
  const [x, z, R] = PLATS[0];
  ring(w, x, 0.1, z, 11, 0.4, HAZ, { pitch: 90, col: false, seg: 36 });
  ring(w, x, 0.1, z, 13.5, 0.2, RED, { pitch: 90, col: false, mat: "glow", seg: 36 });
  paint(w, x, z, 1, 12, WHT, 0.08); paint(w, x - 4, z, 1, 12, WHT, 0.08, 0); paint(w, x + 4, z, 1, 12, WHT, 0.08); paint(w, x, z, 8, 1, WHT, 0.085);
  for (let k = 0; k < 16; k++) {
    const an = (k + 0.5) / 16 * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
    w.cyl(x + c * (R + 4.2), SEA, z + s * (R + 4.2), 1.5, -SEA - 0.4, IRON, { col: false });
    K.blink.add(x + c * (R + 1), 0.9, z + s * (R + 1), RED, 0.3, k);
    w.box(x + c * (R + 2.4), 0.3, z + s * (R + 2.4), 0.5, 1.2, 2 * (R + 2.4) * Math.tan(Math.PI / 16), BLK, { ry: -an / DEG, col: false });
  }
  const at = (an, d) => [x + Math.cos(an * DEG) * d, z + Math.sin(an * DEG) * d];
  { const [bx, bz] = at(-20, 22); w.box(bx, 0, bz, 9, 13, 9, BLK2, { mat: "std:panel", tile: 5, ry: 62 }); w.box(bx, 13, bz, 11, 3, 11, BLK, { ry: 62, mat: "std:panel", tile: 4 }); w.box(bx, 13.8, bz, 11.2, 1.3, 11.2, WARM, { ry: 62, mat: "glow", col: false }); w.box(bx, 16, bz, 11.6, 0.6, 11.6, IRON, { ry: 62, col: false }); w.pipe(bx, 16.6, bz, bx, 28, bz, 0.2, GUN, { col: false }); K.blink.add(bx, 28.6, bz, RED, 0.5, 0); }
  { const [bx, bz] = at(140, 22); for (const o of [-3.4, 3.4]) { w.cyl(bx + o, 0, bz + o, 3, 7, WHT, { mat: "paint" }); w.cyl(bx + o, 5, bz + o, 3.05, 0.6, DRED, { col: false }); } }
  { const [bx, bz] = at(58, 22); coastGun(w, K, bx, bz, 40, 0.8); }
  { const [bx, bz] = at(-150, 23); w.container(bx, 0, bz, 30, DRED); w.container(bx, 2.6, bz, 30, 0x30343c); w.container(bx + 1.6, 0, bz + 2.8, 30, RUST); }
  // 2번 플랫폼: 레이돔 탑
  const [x2, z2, R2] = PLATS[1];
  octa(w, x2, 0, z2, 7, 15, BLK2, { mat: "std:panel" });
  octa(w, x2, 15, z2, 8.4, 1, IRON, { col: false });
  w.sph(x2, 25, z2, 9.4, WHT, { mat: "paint" });
  ring(w, x2, 25, z2, 9.6, 0.3, DRED, { pitch: 90, col: false, seg: 28 });
  ring(w, x2, 15.6, z2, 8.2, 0.25, RED, { pitch: 90, col: false, mat: "glow", seg: 28 });
  K.blink.add(x2, 35.4, z2, RED, 0.5, 1);
  for (let k = 0; k < 10; k++) { const an = (k + 0.5) / 10 * Math.PI * 2; w.cyl(x2 + Math.cos(an) * (R2 + 4.2), SEA, z2 + Math.sin(an) * (R2 + 4.2), 1.3, -SEA - 0.4, IRON, { col: false }); K.blink.add(x2 + Math.cos(an) * (R2 + 1), 0.9, z2 + Math.sin(an) * (R2 + 1), RED, 0.3, k); }
  for (const an of [100, 200]) { const bx = x2 + Math.cos(an * DEG) * 14, bz = z2 + Math.sin(an * DEG) * 14; w.box(bx, 0, bz, 5, 3.4, 4, BLK, { ry: -an, mat: "std:panel", tile: 4 }); }
  // 둑길 다리: 뭍 → 1번 플랫폼. 교각 사이로 배와 드론이 지난다
  const C = CAUSE, len = C.x1 - C.x0, n = 3;
  w.box((C.x0 + C.x1) / 2, C.y - 1.2, C.z, len + 2, 1.2, C.w, BLK2, { mat: "std:panel", tile: 5 });
  w.box((C.x0 + C.x1) / 2, C.y - 0.02, C.z, len + 2, 0.06, C.w - 2.4, ASPH2, { col: false, ao: false, mat: "std:asphalt" });
  for (const s of [-1, 1]) {
    w.box((C.x0 + C.x1) / 2, C.y - 2.2, C.z + s * (C.w / 2 - 1), len, 1, 0.8, IRON, { col: false });
    w.box((C.x0 + C.x1) / 2, C.y, C.z + s * (C.w / 2 - 0.3), len + 2, 1, 0.3, IRON, { col: false });
    w.box((C.x0 + C.x1) / 2, C.y - 1.5, C.z + s * (C.w / 2 + 0.05), len, 0.3, 0.12, RED, { mat: "glow", col: false });
  }
  // 양 끝 오르막
  w.box(C.x0 - 10.4, C.y / 2 - 1.2, C.z, 22.4, 1.2, C.w, BLK2, { rz: Math.atan2(C.y, 20) / DEG, mat: "std:panel", tile: 5 });
  w.box(C.x1 + 8.4, C.y / 2 - 1.2, C.z, 18.4, 1.2, C.w, BLK2, { rz: -Math.atan2(C.y, 16) / DEG, mat: "std:panel", tile: 5 });
  for (let i = 0; i <= n; i++) {
    const px = C.x0 + (len * i) / n;
    w.box(px, SEA, C.z, 2.4, C.y - 1.2 - SEA, C.w - 2, CONC3, { mat: "std:concrete", tile: 5 });
    w.box(px, C.y - 2.6, C.z, 3.4, 1.4, C.w + 1, IRON, { col: false });
    for (const s of [-1, 1]) { w.cyl(px, C.y, C.z + s * (C.w / 2 - 0.3), 0.12, 6, GUN, { col: false }); K.blink.add(px, C.y + 6.3, C.z + s * (C.w / 2 - 0.3), RED, 0.3, i); }
  }
  for (let i = 0; i < n; i++) w.gap("둑길 다리 밑", C.x0 + (len * (i + 0.5)) / n, (C.y - 2.2 + WY) / 2, C.z, 0, len / n - 4, C.y - 2.2 - WY - 1, 400);
  // 플랫폼 사이 다리
  const A = CAUSE2.a, B2 = CAUSE2.b, dx = B2[0] - A[0], dz = B2[1] - A[1], L2 = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx) / DEG, mx = (A[0] + B2[0]) / 2, mz = (A[1] + B2[1]) / 2;
  w.box(mx, CAUSE2.y - 1, mz, L2 + 8, 1, CAUSE2.w, BLK2, { ry, mat: "std:panel", tile: 5 });
  for (const s of [-1, 1]) w.box(mx - (dz / L2) * s * (CAUSE2.w / 2 - 0.2), CAUSE2.y, mz + (dx / L2) * s * (CAUSE2.w / 2 - 0.2), L2 + 8, 0.9, 0.25, IRON, { ry, col: false });
  for (const t of [0.12, 0.88]) w.box(A[0] + dx * t, 0, A[1] + dz * t, 2, CAUSE2.y - 1, CAUSE2.w - 1.5, IRON, { ry, mat: "paint" });
  w.box(mx, SEA, mz, 2.2, CAUSE2.y - 1 - SEA, CAUSE2.w - 2, CONC3, { ry, mat: "std:concrete" });
  w.gap("플랫폼 사이 다리 밑", A[0] + dx * 0.3, 2.4, A[1] + dz * 0.3, ry, 9, 7, 400);
}
