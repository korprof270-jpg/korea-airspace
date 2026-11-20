// 달 기지 구역 짓기: 거주 구역·착륙장·발사대·태양광 단지·온실·매스 드라이버·전파 관측소·채굴 크레이터·릴·도로
import * as THREE from "../../vendor/three.module.min.js";
import { rockArch } from "./canyon-kit.js";
import { M, beam, prop, V3, yawAcross, ring, dome, octa, ball, lattice, dish, lane, WH, WH2, ORG, DK, GREY, GOLD, CYA, AMB, GRN, RED, CONC, NAVY } from "./moon-kit.js";
import { HUB, PADS, LAUNCH, SOLAR, GREEN, PLANT, DISH, OUTPOST, DRIVER, DRIVER_LEN, driverPoint, MINE, ROAD, RILLE_FLOOR, TUBE, rillePoint, rilleDir } from "./moon-terrain.js";

const DEG = Math.PI / 180;
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const bx = (sx, sy, sz, x, y, z, c, rx = 0, ry = 0, rz = 0) => [BOXG, M(x, y, z, sx, sy, sz, rx, ry, rz), c];

// ── 거주 구역: 중심 돔 + 기둥 위의 원통 모듈 4동 + 연결 통로 ──
export function habitat(w, K) {
  const [hx, hz] = HUB, yc = 9, R = 3.2;
  octa(w, hx, -0.4, hz, 17.5, 0.7, CONC, { mat: "std:concrete", col: false });
  dome(w, hx, 0.3, hz, 14, WH);
  ring(w, hx, 4.3, hz, 13.35, 0.42, ORG, { pitch: 90, col: false, seg: 32 });
  ring(w, hx, 9.9, hz, 10.0, 0.3, WH2, { pitch: 90, col: false, seg: 32 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; w.box(hx + Math.cos(a) * 12.25, 6.2, hz + Math.sin(a) * 12.25, 2.4, 1.1, 0.5, CYA, { mat: "glow", col: false, ry: a / DEG + 90 }); }
  w.cyl(hx, 13.9, hz, 2.6, 1.3, DK, { mat: "paint", col: false });
  w.pipe(hx, 14, hz, hx, 24, hz, 0.14, WH2); K.blink.add(hx, 24.3, hz, RED, 0.4, 0);
  w.pool(hx, 0.1, hz, 30, CYA, 0.2);

  const mods = [[1, 0], [-1, 0], [0, -1], [0, 1]];
  for (const [dx, dz] of mods) {
    const cx = hx + dx * 34, cz = hz + dz * 34, ax = dx ? [0, 1] : [1, 0], pp = dx ? [1, 0] : [0, 1];   // ax: 모듈 축, pp: 축과 직각
    const A = (s, p = 0) => [cx + ax[0] * s + pp[0] * p, cz + ax[1] * s + pp[1] * p];
    w.pipe(...A(-9).flatMap((v, i) => (i ? [v] : [v, yc])), ...A(9).flatMap((v, i) => (i ? [v] : [v, yc])), R, WH, { mat: "paint" });
    for (const s of [-9, 9]) { const [x, z] = A(s); w.sph(x, yc, z, R, WH, { mat: "paint", col: false }); }
    for (const s of [-5, 0, 5]) { const a = A(s - 0.5), b = A(s + 0.5); w.pipe(a[0], yc, a[1], b[0], yc, b[1], R + 0.07, s ? ORG : DK, { col: false }); }
    for (const s of [-7, -2.5, 2.5, 7]) for (const sd of [-1, 1]) { const [x, z] = A(s, sd * (R - 0.1)); w.box(x, yc + 0.3, z, dx ? 0.5 : 1.7, 0.9, dx ? 1.7 : 0.5, CYA, { mat: "glow", col: false }); }
    for (const s of [-6, 6]) for (const sd of [-1, 1]) { const f = A(s, sd * 3.6), t = A(s, sd * 1.9); w.pipe(f[0], 0, f[1], t[0], yc - 2.4, t[1], 0.26, GREY); w.cyl(f[0], 0, f[1], 0.9, 0.22, DK, { col: false }); }
    w.box(cx, yc - R - 0.16, cz, dx ? 0.5 : 8, 0.14, dx ? 8 : 0.5, CYA, { mat: "glow", col: false });
    w.pool(cx, 0.1, cz, 11, CYA, 0.34);
    w.gap("거주 모듈 아래", cx, 3, cz, dx ? 90 : 0, 10, 4.8, 350);
    // 중심 돔과 잇는 통로
    const sx = hx + dx * 10.4, sz = hz + dz * 10.4, ex = hx + dx * (34 - R + 0.4), ez = hz + dz * (34 - R + 0.4);
    w.pipe(sx, yc, sz, ex, yc, ez, 1.5, WH2, { mat: "paint" });
    w.pipe(hx + dx * 20, yc, hz + dz * 20, hx + dx * 22, yc, hz + dz * 22, 1.62, ORG, { col: false });
    w.gap("연결 통로 아래", hx + dx * 21, 3.6, hz + dz * 21, yawAcross(dx, dz), 16, 6.4, 300);
  }
  // 모듈 끝을 잇는 바깥 통로와 안뜰
  for (const [sx, sz] of [[1, -1], [-1, -1], [-1, 1], [1, 1]]) {
    const a = [hx + 34 * sx, hz + 9 * sz], b = [hx + 9 * sx, hz + 34 * sz];
    w.pipe(a[0], yc, a[1], b[0], yc, b[1], 1.25, WH2, { mat: "paint" });
    w.gap("외곽 통로 아래", hx + 21.5 * sx, 3.6, hz + 21.5 * sz, yawAcross(b[0] - a[0], b[1] - a[1]), 18, 6.4, 300);
    if (sx !== sz) w.gap("안뜰 수직 통과", hx + 16.5 * sx, yc, hz + 16.5 * sz, 0, 8, 8, 600, 90);
  }
  // 작은 돔 두 채
  for (const [x, z, r, fx, fz] of [[hx + 52, hz - 40, 9, hx + 34, hz - 9], [hx - 52, hz + 40, 10, hx - 34, hz + 9]]) {
    octa(w, x, -0.4, z, r + 1.5, 0.7, CONC, { mat: "std:concrete", col: false });
    dome(w, x, 0.3, z, r, WH); ring(w, x, 2.6, z, Math.sqrt(r * r - 5.3) + 0.05, 0.36, ORG, { pitch: 90, col: false });
    ball(w, x, r + 0.5, z, 0.7, CYA); w.pool(x, 0.1, z, r * 1.8, CYA, 0.25);
    const d = Math.hypot(fx - x, fz - z), ux = (fx - x) / d, uz = (fz - z) / d, rr = Math.sqrt(r * r - 36);
    w.pipe(fx, yc, fz, x + ux * rr, 6.3, z + uz * rr, 1.2, WH2, { mat: "paint" });
    w.gap("돔 연결관 아래", (fx + x + ux * rr) / 2, 3.2, (fz + z + uz * rr) / 2, yawAcross(ux, uz), 14, 5.4, 300);
  }
  // 연료 구·화물
  for (const z of [hz + 12, hz + 2]) { w.cyl(hx + 50, 0, z, 1.6, 1.2, GREY, { mat: "paint", col: false }); w.sph(hx + 50, 3.6, z, 3, GOLD, { mat: "metal" }); }
  const cc = [ORG, WH2, 0x2f6fb0, GOLD];
  for (let i = 0; i < 5; i++) w.container(hx - 30 + (i % 2) * 1.5, i > 2 ? 2.6 : 0, hz + 54 + (i % 3) * 3.2, i > 2 ? 4 : 0, cc[i % 4], 6);
  // 관제탑 (북서)
  const tx = hx - 40, tz = hz - 38;
  w.cyl(tx, 0, tz, 2.6, 30, WH, { mat: "paint" });
  for (const y of [8, 16, 24]) w.cyl(tx, y, tz, 2.68, 1.2, ORG, { col: false, mat: "paint" });
  octa(w, tx, 30, tz, 7.5, 3.6, DK); octa(w, tx, 31.2, tz, 7.58, 1.3, CYA, { mat: "glow", col: false }); octa(w, tx, 33.6, tz, 8.3, 0.5, WH, { col: false });
  ring(w, tx, 30, tz, 8.6, 0.16, ORG, { pitch: 90, col: false });
  w.pipe(tx, 34, tz, tx, 46, tz, 0.16, WH2); K.blink.add(tx, 46.3, tz, RED, 0.45, 1);
  w.pool(tx, 0.1, tz, 14, CYA, 0.3);
  const radar = prop(w, [bx(7, 1.7, 0.3, 0, 1.1, 0, WH), bx(0.4, 1, 0.4, 0, 0.1, 0, GREY), bx(7.2, 0.25, 0.36, 0, 1.9, 0, ORG)]);
  radar.position.set(tx + 3.2, 34.3, tz + 3.2); w.rider(radar, [[0, 1.1, 0, 3.5, 0.9, 0.4]]);
  w.updaters.push((dt, t) => { radar.rotation.y = t * 0.9; });
  // 관제탑 ↔ 서쪽 모듈 연결관
  w.pipe(tx + 1, 12, tz + 2.4, hx - 34, yc + 0.4, hz - 9.6, 1.1, WH2, { mat: "paint" });
  w.gap("관제탑 연결관 아래", (tx + 1 + hx - 34) / 2, 4.6, (tz + 2.4 + hz - 9.6) / 2, yawAcross(hx - 34 - tx - 1, hz - 9.6 - tz - 2.4), 12, 7, 350);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.2; w.lamp(hx + Math.cos(a) * 60, hz + Math.sin(a) * 58, 7, AMB, a / DEG + 90); }
}

// ── 착륙장 3곳, 착륙선, 오가는 화물 호퍼 ──
export function pads(w, K) {
  PADS.forEach(([x, z], i) => {
    const c = i === 2 ? CYA : AMB;
    octa(w, x, -0.3, z, 12, 0.65, 0x4a4f5a, { mat: "std:concrete" });
    ring(w, x, 0.4, z, 9.5, 0.14, c, { pitch: 90, col: false, mat: "glow", seg: 32 });
    w.box(x, 0.36, z, 6, 0.05, 0.9, WH, { col: false, ao: false }); w.box(x, 0.36, z, 0.9, 0.05, 6, WH, { col: false, ao: false });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; K.blink.add(x + Math.cos(a) * 12.4, 0.6, z + Math.sin(a) * 12.4, c, 0.3, k); }
    w.pool(x, 0.4, z, 13, c, 0.22);
  });
  // 착륙선(셋째 착륙장)
  {
    const [x, z] = PADS[2];
    octa(w, x, 4.2, z, 3.3, 2.4, GOLD, { mat: "metal" });
    w.cyl(x, 6.6, z, 2.3, 2.6, WH, { mat: "paint" }); w.box(x, 7.2, z + 2.2, 1.2, 1.1, 0.3, CYA, { mat: "glow", col: false });
    w.cyl(x, 3.0, z, 1.5, 1.2, DK, { rt: 0.7, col: false, mat: "metal" });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { w.pipe(x + sx * 2.5, 4.6, z + sz * 2.5, x + sx * 5.6, 0.5, z + sz * 5.6, 0.2, GREY); w.cyl(x + sx * 5.6, 0.35, z + sz * 5.6, 0.8, 0.15, GOLD, { col: false, mat: "metal" }); }
    w.pipe(x + 1.2, 9.2, z, x + 1.2, 12, z, 0.07, WH2, { col: false }); K.blink.add(x + 1.2, 12.1, z, RED, 0.25, 0);
    w.gap("착륙선 다리 사이", x, 1.7, z, 0, 6, 2.4, 800); w.gap("착륙선 다리 사이", x, 1.7, z, 90, 6, 2.4, 800);
  }
  // 화물 호퍼: 두 착륙장 사이를 뜨고 내린다
  const parts = [bx(4.4, 2, 4.4, 0, 2.7, 0, WH), bx(4.5, 0.5, 4.5, 0, 2.7, 0, ORG), bx(2.2, 0.9, 2.2, 0, 4.1, 0, WH2), bx(0.1, 1.6, 0.1, 1, 5.2, 1, GREY)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push([new THREE.SphereGeometry(0.95, 10, 6), M(sx * 2.1, 1.7, sz * 2.1), GOLD], bx(0.16, 2.2, 0.16, sx * 2.7, 0.95, sz * 2.7, GREY, sz * 14, 0, -sx * 14), bx(0.9, 0.1, 0.9, sx * 2.95, 0.05, sz * 2.95, DK));
  }
  parts.push([new THREE.CylinderGeometry(0.5, 1, 1.1, 10), M(0, 1.2, 0), DK]);
  const hop = prop(w, parts);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.4, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.5), transparent: true, opacity: 0.85 }));
  flame.rotation.x = Math.PI; flame.position.y = -1.0; hop.add(flame);
  w.rider(hop, [[0, 2.9, 0, 2.5, 1.7, 2.5], [0, 0.7, 0, 3.1, 0.7, 3.1]]);
  const A = PADS[0], B = PADS[1], s3 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  w.updaters.push((dt, t) => {
    const c = t % 44, fly = c >= 6 && c < 22 ? (c - 6) / 16 : c >= 28 ? (c - 28) / 16 : -1, back = c >= 22;
    let u = fly < 0 ? 0 : s3(0.2, 0.8, fly), h = fly < 0 ? 0 : 30 * (s3(0, 0.32, fly) - s3(0.68, 1, fly));
    if (back) u = c < 28 ? 1 : 1 - u;
    hop.position.set(A[0] + (B[0] - A[0]) * u, 0.36 + h, A[1] + (B[1] - A[1]) * u);
    hop.rotation.y = u * 1.6;
    flame.visible = fly >= 0; flame.scale.y = 0.7 + 0.3 * Math.sin(t * 31);
  });
}

// ── 발사대: 로켓과 갠트리 타워 ──
export function launch(w, K) {
  const [x0, z0] = LAUNCH, HZ = 0xf0c020;
  w.box(x0, -0.7, z0, 46, 1.0, 46, 0x70747e, { mat: "std:concrete", tile: 6 });
  for (const s of [-1, 1]) { w.box(x0, 0.3, z0 + s * 22, 46, 0.06, 1.4, HZ, { mat: "std:hazard", tile: 2, col: false, ao: false }); w.box(x0 + s * 22, 0.3, z0, 1.4, 0.06, 46, HZ, { mat: "std:hazard", tile: 2, col: false, ao: false }); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.box(x0 + sx * 5.4, 0.3, z0 + sz * 5.4, 3, 6, 3, 0x5a5f68, { mat: "std:concrete", tile: 3 });
  w.box(x0, 6.3, z0, 14.4, 1.5, 14.4, DK, { mat: "paint" });
  w.box(x0, 6.14, z0, 5, 0.15, 5, AMB, { mat: "glow", col: false }); w.pool(x0, 0.35, z0, 15, AMB, 0.55);
  w.gap("발사대 화염 통로", x0, 3.3, z0, 0, 7.4, 5.4, 600); w.gap("발사대 화염 통로", x0, 3.3, z0, 90, 7.4, 5.4, 600);
  // 로켓
  w.cyl(x0, 7.8, z0, 3.6, 46, WH, { mat: "paint" });
  for (const [y, c] of [[13, ORG], [29, DK], [45, ORG]]) w.cyl(x0, y, z0, 3.68, 2.2, c, { col: false, mat: "paint" });
  w.cyl(x0, 53.8, z0, 3.6, 9, WH, { rt: 0.7, mat: "paint" }); w.cyl(x0, 62.8, z0, 0.7, 2.6, ORG, { rt: 0.06, col: false, mat: "paint" });
  w.box(x0 + 3.5, 18, z0, 0.3, 9, 2.4, DK, { col: false, mat: "paint" }); w.box(x0, 36, z0 + 3.5, 2.4, 5, 0.3, ORG, { col: false, mat: "paint" });
  for (const s of [-1, 1]) {
    const z = z0 + s * 5.3;
    w.cyl(x0, 7.8, z, 1.7, 24, WH2, { mat: "paint" }); w.cyl(x0, 31.8, z, 1.7, 4.4, ORG, { rt: 0.25, col: false, mat: "paint" }); w.cyl(x0, 7.0, z, 2.0, 1.1, DK, { rt: 1.5, col: false, mat: "metal" });
    w.box(x0, 24, z - s * 2.6, 0.8, 0.6, 2.2, GREY, { col: false });
  }
  // 갠트리 타워 (z 방향으로 뚫려 있다)
  const tx = x0 - 15, H = 62, lh = H / 8;
  lattice(w, tx, 0.3, z0, 3.5, H, 8, 0xd9432f, { open: "z", t: 0.55, color2: WH });
  for (const lv of [2, 5]) w.gap("갠트리 관통", tx, 0.3 + (lv + 0.5) * lh, z0, 0, 6, lh - 1.2, 700);
  const ax0 = tx + 3.5, ax1 = x0 - 3.5, arms = [0.3 + 3 * lh, 0.3 + 5 * lh, 0.3 + 7 * lh];
  for (const ya of arms) { w.box((ax0 + ax1) / 2, ya - 0.6, z0, ax1 - ax0 + 0.4, 1.2, 1.9, WH2, { mat: "paint" }); w.box((ax0 + ax1) / 2, ya - 0.72, z0, ax1 - ax0 - 1, 0.12, 0.5, CYA, { mat: "glow", col: false }); }
  for (let i = 0; i < 2; i++) w.gap("갠트리 팔 사이", (ax0 + ax1) / 2, (arms[i] + arms[i + 1]) / 2 - 0.6, z0, 0, ax1 - ax0 - 1.2, arms[i + 1] - arms[i] - 2.2, 600);
  beam(w, [tx, 0.3 + H, z0], [x0 + 3, 0.3 + H + 3.5, z0], 0.8, 0xd9432f);
  w.pipe(tx, 0.3 + H, z0, tx, 76, z0, 0.16, WH2); K.blink.add(tx, 76.3, z0, RED, 0.5, 0);
  for (const y of [12, 30, 48]) for (const s of [-1, 1]) w.box(tx + 3.9, y, z0 + s * 2.4, 0.3, 1, 1.5, AMB, { mat: "glow", col: false });
  w.pool(x0 - 9, 0.35, z0, 18, AMB, 0.4);
  // 피뢰 마스트
  for (const s of [-1, 1]) { const x = x0 + 19, z = z0 + s * 19; w.box(x, 0.3, z, 1.6, 1, 1.6, DK); w.pipe(x, 0.3, z, x, 70, z, 0.2, WH2); K.blink.add(x, 70.3, z, RED, 0.4, s > 0 ? 1 : 0); }
  // 연료 구와 배관
  for (const s of [-1, 1]) {
    const x = x0 + 32, z = z0 + s * 10;
    w.cyl(x, -0.2, z, 3.2, 1.8, GREY, { mat: "paint", col: false }); w.sph(x, 6.2, z, 4.6, WH, { mat: "paint" }); ring(w, x, 6.2, z, 4.63, 0.3, ORG, { pitch: 90, col: false });
    w.pipe(x - 4, 5, z, x0 + 7.4, 5, z0 + s * 3, 0.45, GOLD, { mat: "metal" });
    for (const k of [0.3, 0.7]) { const px = x - 4 + (x0 + 7.4 - x + 4) * k, pz = z + (z0 + s * 3 - z) * k; w.pipe(px, 0.3, pz, px, 4.6, pz, 0.16, GREY, { col: false }); }
    w.gap("연료 배관 아래", (x - 4 + x0 + 7.4) / 2, 2.5, (z + z0 + s * 3) / 2, yawAcross(x0 + 7.4 - x + 4, s * 3 - s * 10), 7, 3.8, 500);
  }
}

// ── 태양광 단지와 집열탑 ──
export function solar(w, K) {
  const [x0, z0] = SOLAR;
  for (const dz of [-19.5, -6.5, 6.5, 19.5]) {
    for (const dx of [-22, -11, 0, 11, 22]) {
      const x = x0 + dx, z = z0 + dz;
      w.pipe(x, 0, z, x, 5, z, 0.3, GREY);
      w.box(x, 5.05, z, 9.8, 0.3, 6.2, NAVY, { rx: 28, mat: "metal", ao: false });
      w.box(x, 4.93, z, 10.3, 0.14, 6.7, WH2, { rx: 28, col: false, mat: "paint", ao: false });
      for (const k of [-1, 0, 1]) w.box(x + k * 3.2, 5.12, z, 0.1, 0.3, 6.2, 0x4f7fe0, { rx: 28, col: false, ao: false });
    }
    w.box(x0 + 30, 0, z0 + dz, 2.4, 2.2, 1.6, WH2, { mat: "paint" }); ball(w, x0 + 30, 2.4, z0 + dz, 0.25, AMB);
  }
  for (const dz of [-13, 0, 13]) w.gap("태양광 고랑", x0, 3.4, z0 + dz, 90, 7, 5.6, 250);
  // 변전소
  w.box(x0 + 38, 0, z0, 8, 5, 10, WH, { mat: "std:panel", tile: 3 }); w.box(x0 + 38, 5, z0, 8.6, 0.5, 10.6, ORG, { col: false, mat: "paint" });
  for (const s of [-3, 0, 3]) w.box(x0 + 33.9, 2.6, z0 + s, 0.2, 1.2, 1.8, CYA, { mat: "glow", col: false });
  w.pool(x0 + 30, 0.1, z0, 12, CYA, 0.3);
  // 집열탑: 꼭대기 수광부가 밝게 빛난다
  const tx = 58, tz = -116;
  w.cyl(tx, 0, tz, 2.0, 40, WH, { mat: "paint", rt: 1.2 });
  for (const y of [12, 26]) w.cyl(tx, y, tz, 1.9 - y * 0.02, 1.4, ORG, { col: false, mat: "paint" });
  w.sph(tx, 42.5, tz, 3, 0xffe9b0, { mat: "glow" }); ring(w, tx, 42.5, tz, 3.8, 0.25, DK, { pitch: 90, col: false });
  w.shaft(tx, 40, tz, 0.3, 10, 39, AMB, 0.05); w.pool(tx, 0.1, tz, 20, AMB, 0.45);
  K.blink.add(tx, 46.2, tz, RED, 0.4, 1);
}

// ── 온실 돔 세 채 (초록빛) ──
export function greenhouse(w, K) {
  const Rs = [11, 11, 9.5], r = w.rand;
  GREEN.forEach(([x, z], i) => {
    const R = Rs[i];
    octa(w, x, -0.3, z, R + 1.2, 1.0, CONC, { mat: "std:concrete", col: false });
    octa(w, x, 0.72, z, R - 0.5, 0.06, 0x1d6b3a, { mat: "glow", col: false });
    for (let k = -2; k <= 2; k++) w.box(x + k * 3.4, 0.76, z, 1.5, 0.7, Math.sqrt(R * R - k * k * 11.6) * 1.5, 0x2f8f4a, { col: false, mat: "leaf" });
    for (let j = 0; j < 6; j++) { const a = r() * 6.28, d = 1.5 + r() * (R - 5), s = 1 + r() * 0.8; w.blob(x + Math.cos(a) * d, 2 + s, z + Math.sin(a) * d, s * 1.2, s * 1.5, s * 1.2, [0x3fae52, 0x59c85e, 0x2f8f4a][j % 3], { col: false }); }
    w.cyl(x, 0.7, z, 0.25, R * 0.74, GRN, { mat: "glow", col: false });
    dome(w, x, 0.7, z, R, 0xc8ffe6, { mat: "glass" });
    for (const a of [0, 45, 90, 135]) ring(w, x, 0.7, z, R + 0.05, 0.16, WH, { yaw: a, arc: Math.PI, col: false, seg: 16 });
    ring(w, x, 0.9, z, R + 0.1, 0.32, WH, { pitch: 90, col: false });
    w.pool(x, 0.1, z, R * 2, GRN, 0.42);
  });
  let cx = 0, cz = 0;
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
    const a = GREEN[i], b = GREEN[j], d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uz = (b[1] - a[1]) / d;
    const ra = Math.sqrt(Rs[i] ** 2 - 39.7) - 0.3, rb = Math.sqrt(Rs[j] ** 2 - 39.7) - 0.3;
    w.pipe(a[0] + ux * ra, 7, a[1] + uz * ra, b[0] - ux * rb, 7, b[1] - uz * rb, 1.3, WH2, { mat: "paint" });
    const mx = (a[0] + ux * Rs[i] + b[0] - ux * Rs[j]) / 2, mz = (a[1] + uz * Rs[i] + b[1] - uz * Rs[j]) / 2;
    w.pipe(mx - ux, 7, mz - uz, mx + ux, 7, mz + uz, 1.4, GRN, { col: false, mat: "glow" });
    w.gap("온실 통로 아래", mx, 3, mz, yawAcross(ux, uz), d - Rs[i] - Rs[j] - 1, 5, 350);
    cx += (a[0] + b[0]) / 6; cz += (a[1] + b[1]) / 6;
  }
  w.gap("온실 삼각 안뜰", cx, 7, cz, 0, 9, 9, 500, 90);
  w.cyl(-92, 0, 62, 2.2, 5, WH2, { mat: "paint" }); w.cyl(-92, 5, 62, 2.3, 0.5, ORG, { col: false, mat: "paint" });
}

// ── 매스 드라이버: 가속 고리가 줄지은 레일과 쏘아 올려지는 화물 썰매 ──
export function driver(w, K) {
  const a = DRIVER.a, b = DRIVER.b, dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  const ux = dx / DRIVER_LEN, uz = dz / DRIVER_LEN, nx = -uz, nz = ux, yaw = Math.atan2(dx, dz) / DEG, pitch = -Math.asin(dy / L) / DEG;
  const N = 12;
  for (const s of [-1.1, 1.1]) beam(w, [a[0] + nx * s, a[1], a[2] + nz * s], [b[0] + nx * s, b[1], b[2] + nz * s], 0.5, GREY, { mat: "metal" });
  beam(w, [a[0], a[1] - 0.5, a[2]], [b[0], b[1] - 0.5, b[2]], 0.7, DK, { col: false, tw: 1.6 });
  for (let i = 0; i <= N; i++) {
    const p = driverPoint(i / N), g = w.h(p[0], p[2]), last = i === N, R = last ? 8.5 : 6.5, up = 2.6;
    if (i > 0) {
      ring(w, p[0], p[1] + up, p[2], R, last ? 0.8 : 0.55, last ? 0xd9432f : i % 2 ? ORG : WH, { yaw, pitch });
      ring(w, p[0], p[1] + up, p[2], R - 0.62, 0.12, CYA, { yaw, pitch, col: false, mat: "glow" });
      if (i % 2 === 0 || last) w.gap(last ? "포구 고리" : "가속 고리", p[0], p[1] + up + 1, p[2], yaw, R * 1.5, R * 1.25, last ? 600 : 350, pitch);
      K.blink.add(p[0], p[1] + up + R + 0.9, p[2], last ? RED : AMB, last ? 0.6 : 0.3, i);
    }
    // 고리 아래쪽에서 바닥으로 벌어지는 다리
    if (p[1] - g > 2.5) for (const s of [-1, 1]) {
      const fx = p[0] + nx * s * (5 + (p[1] - g) * 0.3), fz = p[2] + nz * s * (5 + (p[1] - g) * 0.3);
      beam(w, [fx, w.h(fx, fz) - 0.5, fz], [p[0] + nx * s * 1.4, p[1] - 0.4, p[2] + nz * s * 1.4], 0.6, i % 2 ? WH2 : GREY);
    }
    if (i < N && (i === 3 || i === 5 || i === 7 || i === 9)) { const q = driverPoint((i + 0.5) / N), gq = w.h(q[0], q[2]); if (q[1] - gq > 6) w.gap("레일 아래", q[0], (q[1] + gq) / 2 - 0.4, q[2], yaw + 90, 13, q[1] - gq - 2, 400); }
  }
  // 적재소
  const sx = a[0] - ux * 9, sz = a[2] - uz * 9;
  w.box(sx, 0, sz, 9, 3.6, 16, WH, { ry: yaw, mat: "std:panel", tile: 3 }); w.box(sx, 3.6, sz, 9.6, 0.5, 16.6, ORG, { ry: yaw, col: false, mat: "paint" });
  w.box(a[0] + ux * 4, 0, a[2] + uz * 4, 4, a[1] + 1.2, 14, CONC, { ry: yaw, mat: "std:concrete", tile: 4, rx: 0 });
  for (let i = 0; i < 4; i++) { const cx = sx + nx * 9 + ux * (i * 3.4 - 5), cz = sz + nz * 9 + uz * (i * 3.4 - 5); w.cyl(cx, 0, cz, 1.3, 3, i % 2 ? ORG : WH2, { mat: "paint" }); }
  w.pool(a[0], 0.1, a[2], 18, AMB, 0.4); w.lamp(sx - nx * 8, sz - nz * 8, 8, AMB, yaw);
  // 화물 썰매: 3초 대기 → 8초 가속 → 포구를 떠나 사라진다
  const sled = prop(w, [bx(2.4, 0.7, 5.2, 0, 0.5, 0, DK), bx(1.9, 1.3, 3.6, 0, 1.4, 0, ORG), bx(1.95, 0.4, 3.7, 0, 1.4, 0, WH), bx(0.3, 0.3, 5.6, 1.25, 0.5, 0, CYA), bx(0.3, 0.3, 5.6, -1.25, 0.5, 0, CYA)]);
  sled.rotation.set(pitch * DEG, yaw * DEG, 0, "YXZ");
  w.rider(sled, [[0, 1.1, 0, 1.3, 1.0, 2.7]]);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.4, 3), transparent: true, opacity: 0.8, depthWrite: false }));
  flash.position.set(b[0], b[1] + 2.6, b[2]); flash.visible = false; w.scene.add(flash);
  const acc = (2 * (L - 6)) / 64;
  w.updaters.push((dt, t) => {
    const c = t % 16, run = c - 3, s = run < 0 ? 3 : 3 + 0.5 * acc * run * run;
    sled.visible = c < 11;
    if (sled.visible) sled.position.set(a[0] + (dx * s) / L, a[1] + (dy * s) / L + 0.2, a[2] + (dz * s) / L);
    const f = c - 11; flash.visible = f >= 0 && f < 0.5;
    if (flash.visible) { flash.scale.setScalar(2 + f * 26); flash.material.opacity = 0.8 * (1 - f * 2); }
  });
}

// ── 전파 관측 고원: 접시 3기, 통제소, 통신 마스트 ──
export function observatory(w, K) {
  const [x0, z0] = DISH, y = w.h(x0, z0);
  for (const [dx, dz, az, tilt] of [[-32, -6, -60, 38], [32, -12, 40, 44], [0, 38, 170, 34]]) {
    const x = x0 + dx, z = z0 + dz;
    octa(w, x, y - 0.5, z, 5, 0.8, CONC, { mat: "std:concrete", col: false });
    dish(w, x, y, z, 15, az, tilt);
    const fx = Math.sin(az * DEG), fz = Math.cos(az * DEG);
    w.gap("전파 접시 아래", x - fx * 8.5, y + 6, z - fz * 8.5, az + 90, 9, 9, 450);
    w.pool(x, y + 0.1, z, 12, CYA, 0.25);
  }
  // 통제소
  w.box(x0 + 12, y, z0 - 30, 12, 4, 8, WH, { mat: "std:panel", tile: 3 }); w.box(x0 + 12, y + 4, z0 - 30, 12.6, 0.5, 8.6, ORG, { col: false, mat: "paint" });
  for (const s of [-3.5, 0, 3.5]) w.box(x0 + 12 + s, y + 2, z0 - 25.9, 2, 1.1, 0.2, CYA, { mat: "glow", col: false });
  w.pool(x0 + 12, y + 0.1, z0 - 23, 10, CYA, 0.35);
  // 통신 마스트와 버팀줄
  const mx = x0 + 40, mz = z0 + 6, H = 46;
  lattice(w, mx, y, mz, 1.5, H, 8, 0xd9432f, { open: "x", t: 0.3, color2: WH });
  w.pipe(mx, y + H, mz, mx, y + H + 7, mz, 0.1, WH2); K.blink.add(mx, y + H + 7.3, mz, RED, 0.45, 0); K.blink.add(mx, y + H * 0.5, mz + 1.9, RED, 0.3, 1);
  for (const a of [90, 210, 330]) { const gx = mx + Math.cos(a * DEG) * 17, gz = mz + Math.sin(a * DEG) * 17; beam(w, [gx, w.h(gx, gz), gz], [mx, y + H * 0.8, mz], 0.1, 0xb9c0c8); w.box(gx, w.h(gx, gz) - 0.2, gz, 1.2, 0.8, 1.2, DK, { col: false }); }
  w.gap("통신 마스트 버팀줄 사이", mx - 5, y + 14, mz - 2.5, 0, 8, 12, 500);
}

// ── 채굴 크레이터: 시추탑, 버킷 휠 굴착기, 컨베이어, 선광 공장 ──
export function mine(w, K) {
  const cx = MINE.x, cz = MINE.z, f = MINE.floor, RUST = 0xb5764a;
  // 시추탑 (z 방향으로 뚫려 있다)
  lattice(w, cx, f, cz, 4, 34, 5, 0xd9a441, { open: "z", t: 0.5, color2: DK });
  w.cyl(cx, f, cz, 0.45, 30, GREY, { mat: "metal" }); w.box(cx, f + 34, cz, 9, 1, 9, DK, { mat: "paint" });
  K.blink.add(cx, f + 36, cz, RED, 0.5, 0);
  w.gap("시추탑 관통", cx - 2.2, f + 10.2, cz, 0, 3.4, 5.6, 700); w.gap("시추탑 관통", cx + 2.2, f + 17, cz, 0, 3.4, 5.6, 700);
  w.pool(cx, f + 0.1, cz, 22, AMB, 0.5);
  // 버킷 휠 굴착기
  {
    const x = cx - 22, z = cz + 22, ry = 45, c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    for (const v of [-3, 3]) { const [px, pz] = P(0, v); w.box(px, f, pz, 9, 1.6, 2, DK, { ry, mat: "paint" }); }
    w.box(x, f + 1.6, z, 7, 4.2, 5.4, GOLD, { ry, mat: "paint" }); w.box(x, f + 5.8, z, 3, 2, 3, WH, { ry, mat: "paint" });
    const [cb, cbz] = P(1.6, 0); w.box(cb, f + 6.4, cbz, 0.2, 1, 2, CYA, { ry, mat: "glow", col: false });
    const [hx, hz] = P(-17, 0), [tx, tz] = P(9, 0), top = [x, f + 9.5, z];
    beam(w, [x, f + 6.5, z], [hx, f + 5.5, hz], 1.1, GOLD, { tw: 1.6 });
    beam(w, [x, f + 6.5, z], [tx, f + 8, tz], 0.9, GOLD); w.box(tx, f + 6.6, tz, 3, 2.6, 3, DK, { ry, mat: "paint" });
    beam(w, [x, f + 5.8, z], top, 0.5, DK); beam(w, top, [hx, f + 6.2, hz], 0.14, GREY, { col: false }); beam(w, top, [tx, f + 8.6, tz], 0.14, GREY, { col: false });
    const [gx, gz] = P(-8, 0); w.gap("굴착기 붐 아래", gx, f + 2.6, gz, ry, 11, 4.6, 500);
    const wp = [new THREE.TorusGeometry(4.2, 0.45, 6, 20), null, DK];
    const parts = [wp, bx(8, 0.4, 0.4, 0, 0, 0, GREY), bx(0.4, 8, 0.4, 0, 0, 0, GREY)];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; parts.push(bx(1.5, 1.2, 1.5, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 0, ORG, 0, 0, a / DEG)); }
    const wheel = prop(w, parts);
    const [wx, wz] = P(-17, 1.4); wheel.position.set(wx, f + 5.5, wz);
    w.rider(wheel, [[0, 0, 0, 5.2, 5.2, 0.8]]);
    w.updaters.push((dt, t) => { wheel.rotation.set(0, (ry + 0) * DEG, t * 0.6, "YXZ"); });
  }
  // 컨베이어: 바닥 → 진입로 → 선광 공장
  const A = [cx + 12, f + 1.5, cz - 16], B = [PLANT[0] - 3, w.h(PLANT[0], PLANT[1]) + 11, PLANT[1] + 3], dx = B[0] - A[0], dz = B[2] - A[2], hl = Math.hypot(dx, dz), ux = dx / hl, uz = dz / hl;
  beam(w, A, B, 0.6, DK, { tw: 2.4 });
  for (const s of [-1.25, 1.25]) beam(w, [A[0] - uz * s, A[1] + 0.5, A[2] + ux * s], [B[0] - uz * s, B[1] + 0.5, B[2] + ux * s], 0.25, ORG, { col: false });
  const at = (k, up = 0) => [A[0] + dx * k, A[1] + (B[1] - A[1]) * k + up, A[2] + dz * k];
  for (const k of [0.02, 0.26, 0.5, 0.74]) {
    const p = at(k), g = w.h(p[0], p[2]);
    for (const s of [-1, 1]) { const fx = p[0] - uz * s * 4.4, fz = p[2] + ux * s * 4.4; beam(w, [fx, w.h(fx, fz) - 0.4, fz], [p[0] - uz * s * 1, p[1] - 0.3, p[2] + ux * s * 1], 0.4, GREY); }
    void g;
  }
  for (const k of [0.38, 0.62]) { const p = at(k), g = w.h(p[0], p[2]); if (p[1] - g > 6) w.gap("컨베이어 아래", p[0], (p[1] + g) / 2 - 0.3, p[2], yawAcross(ux, uz), 10, p[1] - g - 2, 450); }
  const lumps = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshLambertMaterial({ color: RUST }), 10), lm = new THREE.Matrix4();
  lumps.frustumCulled = false; w.scene.add(lumps);
  w.updaters.push((dt, t) => { for (let i = 0; i < 10; i++) { const k = (t * 0.05 + i / 10) % 1, p = at(k, 0.75); lm.makeRotationY(i * 1.3).setPosition(p[0], p[1], p[2]); lumps.setMatrixAt(i, lm); } lumps.instanceMatrix.needsUpdate = true; });
  // 선광 공장
  {
    const [x, z] = PLANT, y = w.h(x, z);
    w.box(x - 3, y - 0.5, z + 3, 10, 10.5, 8, WH, { mat: "std:panel", tile: 3, ry: 45 }); w.box(x - 3, y + 10, z + 3, 10.6, 0.6, 8.6, ORG, { col: false, ry: 45, mat: "paint" });
    for (const [dx2, dz2, c] of [[7, -5, WH2], [9, 4, ORG]]) { w.cyl(x + dx2, y - 0.5, z + dz2, 3.6, 15, c, { mat: "paint" }); w.cyl(x + dx2, y + 14.5, z + dz2, 3.6, 2.4, DK, { rt: 1, col: false, mat: "paint" }); }
    w.pipe(x - 1, y + 8, z + 1, x + 7, y + 13, z - 5, 0.5, GREY, { col: false });
    w.pool(x + 2, y + 0.1, z - 8, 16, AMB, 0.45); w.lamp(x + 12, z - 10, 8, AMB, 200);
    K.blink.add(x + 7, y + 17.4, z - 5, RED, 0.4, 1);
  }
  // 투광등 타워와 광석 더미
  for (const a of [0.6, 2.5, 4.2]) {
    const x = cx + Math.cos(a) * 45, z = cz + Math.sin(a) * 45, y = w.h(x, z);
    w.pipe(x, y - 0.5, z, x, y + 15, z, 0.3, GREY); w.box(x, y + 14.4, z, 3.4, 1.6, 0.5, AMB, { mat: "glow", col: false, ry: -a / DEG + 90 });
    w.pool(cx + Math.cos(a) * 24, f + 0.1, cz + Math.sin(a) * 24, 24, AMB, 0.4);
  }
  for (const [dx2, dz2, r, c] of [[-10, -24, 6, RUST], [-26, -10, 7.5, 0x9a6a52], [8, 28, 5.5, 0xc98f5a], [-24, 22, 5, RUST]]) w.cone(cx + dx2, f - 0.3, cz + dz2, r, r * 0.7, c, { mat: "std:rock", grad: [0.7, 1.1] });
  for (const [dx2, dz2, ry] of [[-6, 22, 20], [18, -6, -50]]) {
    const x = cx + dx2, z = cz + dz2;
    w.box(x, f + 0.6, z, 3, 1.6, 6, GOLD, { ry, mat: "paint" }); w.box(x, f + 2.2, z, 3.2, 1.4, 3.4, RUST, { ry, mat: "std:rock", tile: 2 }); w.box(x, f, z, 3.4, 1.2, 1.4, DK, { ry, col: false });
  }
}

// ── 릴: 자연 다리, 배관 다리, 용암 동굴, 표지등 ──
export function rille(w, K) {
  const F = RILLE_FLOOR, ROCK = 0xa9a6a0;
  const N = (t, d) => { const [x, z] = rillePoint(t), a = rilleDir(t) * DEG; return [x + Math.sin(a) * d, z + Math.cos(a) * d]; };   // 중심선에서 옆으로 d
  for (const t of [0.17, 0.36, 0.5, 0.87]) {
    const a = N(t, 16), b = N(t, -16), p = rillePoint(t);
    rockArch(w, a[0], a[1], b[0], b[1], 1, 13, 3.1, ROCK, { n: 11 });
    w.gap("릴 자연 다리", p[0], F + 8.5, p[1], rilleDir(t) + 90, 16, 15, 400);
  }
  // 배관 다리
  {
    const t = 0.27, a = N(t, 17), b = N(t, -17), p = rillePoint(t);
    for (const s of [-0.8, 0.8]) { const o = N(t + s * 0.002, 0); w.pipe(a[0] + o[0] - p[0], 7, a[1] + o[1] - p[1], b[0] + o[0] - p[0], 7, b[1] + o[1] - p[1], 0.55, s < 0 ? GOLD : WH2, { mat: "metal" }); }
    beam(w, [a[0], 5.6, a[1]], [b[0], 5.6, b[1]], 0.5, 0xd9432f, { tw: 2.6 });
    w.gap("배관 다리 아래", p[0], F + 6, p[1], rilleDir(t) + 90, 15, 11, 400);
  }
  // 용암 동굴: 남은 지붕 바위 (가운데 한 칸은 천창)
  const n = 10;
  for (let i = 0; i < n; i++) {
    const t = TUBE[0] + ((TUBE[1] - TUBE[0]) * (i + 0.5)) / n, [x, z] = rillePoint(t), ry = rilleDir(t) + 90;
    if (i === 5) { w.gap("용암 동굴 천창", x, 9, z, ry, 15, 7.5, 800, 90); w.shaft(x, 10, z, 1, 7, 17, 0xdfe6ff, 0.06); continue; }
    w.blob(x, 9.6, z, 21, 5, 7, i % 2 ? ROCK : 0x8f8c88, { mat: "std:rock", grad: [0.55, 1.1], col: false, ry, k: i % 3 });
    const q = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry * DEG);
    w.col.addBox(V3(x, 9.8, z), V3(20, 3.5, 5.6), q);
    // 동굴 안의 수정과 불빛
    const sd = i % 2 ? 1 : -1, c = i % 3 === 0 ? 0xb48cff : CYA, [px, pz] = N(t, sd * 6.5), py = w.h(px, pz);
    for (let k = 0; k < 3; k++) w.cone(px + (k - 1) * 0.9, py - 0.2, pz + (k % 2) * 0.8, 0.5 + (k % 2) * 0.25, 1.6 + k * 0.7, c, { mat: "glow", col: false });
    w.pool(px, py + 0.1, pz, 9, c, 0.5);
  }
  for (const t of [TUBE[0] - 0.006, TUBE[1] + 0.006]) { const a = N(t, 15), b = N(t, -15), p = rillePoint(t); rockArch(w, a[0], a[1], b[0], b[1], 0, 12.5, 3, 0x8f8c88, { n: 10 }); w.gap("용암 동굴 관통", p[0], F + 6, p[1], rilleDir(t) + 90, 15, 11, 600); }
  // 릴 바닥의 표지등
  for (let i = 1; i < 30; i++) {
    const t = 0.06 + (0.88 * i) / 30; if (t > TUBE[0] - 0.01 && t < TUBE[1] + 0.01) continue;
    const [x, z] = N(t, i % 2 ? 7 : -7), y = w.h(x, z), c = i % 2 ? AMB : CYA;
    w.box(x, y - 0.2, z, 0.25, 1.6, 0.25, DK, { col: false }); ball(w, x, y + 1.6, z, 0.3, c); w.pool(x, y + 0.1, z, 7, c, 0.4);
  }
}

// ── 서쪽 관측 초소, 첫 착륙 기념지, 도로 표지와 로버 ──
export function outposts(w, K) {
  {
    const [x, z] = OUTPOST;
    dome(w, x, 0.1, z, 6, WH); ring(w, x, 1.8, z, 5.75, 0.3, ORG, { pitch: 90, col: false });
    w.box(x + 7, 0, z + 1, 3, 2.6, 3, WH2, { mat: "paint" }); w.box(x + 8.6, 1.2, z + 1, 0.2, 1, 1.4, CYA, { mat: "glow", col: false });
    w.pipe(x - 5, 0, z - 6, x - 5, 18, z - 6, 0.14, WH2); K.blink.add(x - 5, 18.3, z - 6, RED, 0.35, 0);
    w.pool(x, 0.1, z, 12, CYA, 0.3);
  }
  // 기념지: 옛 착륙선 하단부와 깃발
  {
    const x = -66, z = 132, y = w.h(x, z);
    octa(w, x, y + 3, z, 2.6, 1.8, GOLD, { mat: "metal" });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { w.pipe(x + sx * 2, y + 3.4, z + sz * 2, x + sx * 4.6, y + 0.3, z + sz * 4.6, 0.16, GREY); w.cyl(x + sx * 4.6, y, z + sz * 4.6, 0.7, 0.2, GOLD, { col: false, mat: "metal" }); }
    w.pipe(x + 8, y, z + 3, x + 8, y + 4.4, z + 3, 0.06, WH2, { col: false }); w.box(x + 9, y + 3.2, z + 3, 2, 1.2, 0.06, 0x2f6fb0, { col: false }); w.box(x + 9, y + 3.6, z + 3.02, 2, 0.4, 0.06, WH, { col: false });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; w.box(x + Math.cos(a) * 11, y, z + Math.sin(a) * 11, 0.2, 1, 0.2, WH2, { col: false }); ball(w, x + Math.cos(a) * 11, y + 1.1, z + Math.sin(a) * 11, 0.16, AMB); }
    w.gap("기념 착륙선 다리 사이", x, y + 1.6, z, 0, 5, 2.4, 800);
    w.pool(x, y + 0.1, z, 12, AMB, 0.3);
  }
  // 도로 표지등
  const L = lane(ROAD, 0, 64), R = lane(ROAD, 5.6, 64), I = lane(ROAD, -5.6, 64);
  for (let i = 0; i < L.length; i++) for (const [p, c] of [[R[i], AMB], [I[i], CYA]]) { w.box(p[0], 0, p[1], 0.18, 0.9, 0.18, DK, { col: false }); ball(w, p[0], 1.0, p[1], 0.2, c); }
  for (let i = 0; i < L.length; i += 8) w.pool(L[i][0], 0.1, L[i][1], 10, AMB, 0.16);
  // 로버: 안쪽 차선을 따라 도는 세 대
  const path = lane(ROAD, -2.9, 160), n = path.length, segL = [];
  let total = 0; for (let i = 0; i < n; i++) { const a = path[i], b = path[(i + 1) % n]; segL.push(Math.hypot(b[0] - a[0], b[1] - a[1])); total += segL[i]; }
  const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10); wheel.rotateZ(Math.PI / 2);
  const mk = (c) => {
    const parts = [bx(2.2, 0.5, 4.4, 0, 0.9, 0, GREY), bx(2.1, 1.3, 2.2, 0, 1.8, -0.8, WH), bx(2.14, 0.5, 1.2, 0, 2, -1.5, CYA), bx(1.9, 0.9, 1.6, 0, 1.6, 1.2, c), bx(0.06, 1.6, 0.06, 0.8, 3.2, 0.2, WH2), bx(2.2, 0.2, 0.3, 0, 1.3, -2.25, AMB)];
    for (const sx of [-1.25, 1.25]) for (const sz of [-1.6, 0, 1.6]) parts.push([wheel, M(sx, 0.55, sz), DK]);
    const m = prop(w, parts); w.rider(m, [[0, 1.3, 0, 1.4, 1.3, 2.3]]); return m;
  };
  const rovers = [mk(ORG), mk(GOLD), mk(0x2f6fb0)];
  w.updaters.push((dt, t) => {
    rovers.forEach((m, k) => {
      let s = (total - ((t * 5.5 + (k * total) / 3) % total)) % total, i = 0;
      while (s > segL[i]) { s -= segL[i]; i = (i + 1) % n; }
      const a = path[i], b = path[(i + 1) % n], u = s / segL[i], x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
      m.position.set(x, w.h(x, z), z); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    });
  });
}
