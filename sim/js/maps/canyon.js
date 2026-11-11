// 맵: 붉은 협곡 — 댐에서 호수까지 강이 굽이치는 사암 협곡. 폭포 골짜기·바늘귀 협곡·광산·유적·풍력 단지
import * as THREE from "../../vendor/three.module.min.js";
import { riverX, height, colorFn, forest, dryness, lakeE, slotAt, slotPoint, DAM, LAKE, ISLE, FALLS, TARN, STREAM, FLATS, flat } from "./canyon-terrain.js";
import { M, frame, beam, flora, rockArch, hoodoo, waterPatch, fallSheet, foamRings, birds, balloon, balloonParts, prop } from "./canyon-kit.js";

export { riverX, height };

const ROCK = 0xc98a5a, WOOD = 0x9a7446, WOOD2 = 0x6a4a2c, CONC = 0xd4cdbd, DARK = 0x8f8a80;
const KEEP = [];                               // 식생을 비울 원 [x, z, r]
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const [SPX, SPZ] = flat("spawn"), [MX, MZ] = flat("mine"), [RUX, RUZ] = flat("ruins"), [RGX, RGZ] = flat("ranger"), [TWX, TWZ] = flat("tower");
const TURBINES = [[244, -60, 0], [266, -6, 1.2], [278, 46, 2.1], [270, 104, 0.6]];
const HOODOOS = [[148, -52, 14, 2.6], [172, -62, 22, 3.2], [190, -58, 11, 2.2], [182, -76, 17, 2.8], [164, -78, 9, 2], [198, -80, 20, 3], [176, -94, 13, 2.4], [154, -68, 8, 1.8], [206, -64, 9, 2], [192, -98, 10, 2.2], [168, -88, 16, 2.6], [214, -84, 13, 2.4]];

// 수평 사각형 수면 (꼭짓점 4개, 위를 향하도록 감는다)
function quadGeo(pts, y) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap(([x, z]) => [x, y, z]), 3));
  const up = (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) > 0;
  g.setIndex(up ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
}

// ── 댐과 저수지 (상류 끝) ──
function dam(w) {
  const F = frame(w, DAM.x, DAM.z, DAM.ry), top = DAM.crest, c = -2, co = { mat: "std:concrete", tile: 8 };
  const lift = (u0, u1, y0, y1, t, col = CONC) => F.box((u0 + u1) / 2, y0, 3 - t / 2, u1 - u0, y1 - y0, t, col, co);
  for (const [u0, u1] of [[-62, -18.4], [14.4, 52]]) { lift(u0, u1, -4, 12, 18); lift(u0, u1, 12, 24, 14.5); lift(u0, u1, 24, 35, 11); lift(u0, u1, 35, top - 1, 8); }
  lift(-18.4, 14.4, -4, 3, 27); lift(-18.4, 14.4, 3, 12, 22); lift(-18.4, 14.4, 12, 24, 15.3); lift(-18.4, 14.4, 24, 34.4, 9.6);
  // 여수로 미끄럼면과 양쪽 유도벽
  F.box(c, 17, -15.75, 32.8, 1.6, 38.4, 0xe6e0d0, { ...co, rx: -61.2 });
  for (const u of [-19.1, 15.1]) F.box(u, 16.2, -17.3, 1.4, 5, 39.5, DARK, { ...co, rx: -61.2 });
  // 수문 교각 4개, 수문 3칸 (가운데 칸으로 물이 넘친다)
  for (let i = 0; i < 4; i++) F.box(-17.3 + i * 10.2, 34.4, -2, 2.2, top - 35.4, 11, CONC, co);
  for (const [i, bu] of [[0, -12.2], [1, -2], [2, 8.2]]) {
    if (i !== 1) { F.box(bu, 34.4, -1.8, 8, 1.1, 9.6, DARK, co); F.box(bu, 42.4, 2, 8, 2.6, 0.5, 0x3d6b8c, { mat: "paint" }); }
    F.gap("댐 수문", bu, i === 1 ? 39.7 : 39, -2, 0, 7.6, i === 1 ? 9.4 : 6.4, 500);
  }
  F.gap("여수로 다이브", c, 18, -21, 0, 30, 14, 600, -90);
  // 마루 도로·난간·가로등·관리탑
  F.box(-5, top - 1, -2, 114, 1.2, 12, DARK, co);
  for (const v of [-7.8, 3.8]) F.box(-5, top + 0.2, v, 114, 1, 0.4, CONC, co);
  for (let u = -56; u <= 48; u += 13) { F.pipe(u, top + 0.2, 3.4, u, top + 5.2, 3.4, 0.09, 0x2c3138); F.box(u, top + 5.2, 2.5, 0.5, 0.12, 1.8, 0xffe2a8, { mat: "glow", col: false }); }
  for (const u of [-21.5, 17.5]) {
    F.box(u, top + 0.2, -4.6, 4.4, 5.5, 5, 0xe9e2d2, co); F.box(u, top + 5.7, -4.6, 5.4, 0.4, 6, 0x8a4a34);
    F.box(u, top + 3, -7.15, 3, 1.3, 0.1, 0xffd9a0, { mat: "glow", col: false });
  }
  // 취수탑과 연결 다리
  const tx = F.X(22, 24), tz = F.Z(22, 24), ty = Math.min(w.h(tx, tz), 33) - 1;
  w.cyl(tx, ty, tz, 3.6, 51 - ty, CONC, co); w.cone(tx, 51, tz, 4.6, 3, 0x8a4a34, { mat: "std", col: false, grad: [0.8, 1.05] });
  F.box(22, top - 0.6, 12.4, 2.6, 0.5, 17, DARK, co);
  for (const du of [-1.2, 1.2]) F.beam(22 + du, top + 0.9, 4, 22 + du, top + 0.9, 20.6, 0.12, 0x3a3f47, { col: false });
  F.gap("취수탑 다리 아래", 22, 40.4, 12.4, 90, 16, 9.6, 450);
  // 저수지 수면, 넘치는 물, 물보라
  waterPatch(w, quadGeo([[-170, 3.2], [270, 3.2], [270, 440], [-170, 440]].map(([u, v]) => [F.X(u, v), F.Z(u, v)]), 35));
  const P = (u, y, v) => [F.X(u, v), y, F.Z(u, v)];
  fallSheet(w, P(-6, 35.06, 4), P(2, 35.06, 4), P(-5.8, 35.7, -7), P(1.8, 35.7, -7), { nv: 1, tileV: 9 });
  fallSheet(w, P(-5.8, 35.75, -7), P(1.8, 35.75, -7), P(-10, 2, -26.4), P(6, 2, -26.4), { nv: 3 });
  for (let i = 0; i < 5; i++) w.blob(F.X(c + (i - 2) * 3.4, -28), 0.8, F.Z(c + (i - 2) * 3.4, -28), 3.4, 1.8, 3.2, 0xffffff, { mat: "glass", col: false, grad: [1, 1] });
  // 부표 줄
  for (let i = 0; i < 9; i++) w.sph(F.X(-22 + i * 5.5, 40 + Math.sin(i) * 2), 35.2, F.Z(-22 + i * 5.5, 40 + Math.sin(i) * 2), 0.55, 0xff7a1a, { mat: "paint", col: false });
  for (const u of [-50, -25, 0, 25, 48]) KEEP.push([F.X(u, -4), F.Z(u, -4), 24]);
  return [[F.X(c, -30), 0.15, F.Z(c, -30), 8], [F.X(c - 5, -27), 0.15, F.Z(c - 5, -27), 5]];
}

// ── 흔들다리 (z = -70) ──
function ropeBridge(w) {
  const H = (x, z) => w.h(x, z), bz = -70, cx = riverX(bz), y = 27;
  let xl = cx, xr = cx;
  while (H(xl, bz) < y - 0.5 && xl > cx - 120) xl -= 1;
  while (H(xr, bz) < y - 0.5 && xr < cx + 120) xr += 1;
  xl -= 2; xr += 2;
  const span = xr - xl, n = Math.round(span / 1.25), sag = 2.6, yAt = (t) => y + 0.4 - sag * 4 * t * (1 - t);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    w.box(xl + span * t, yAt(t), bz, 1.05, 0.12, 2.6, i % 7 === 3 ? 0x7a5a3a : WOOD, { mat: "std:wood", tile: 2, rz: -Math.atan(sag * 4 * (1 - 2 * t) / span) * 57.3, col: i % 2 === 0 });
  }
  for (const s of [-1.3, 1.3]) {
    for (let i = 0; i < 16; i++) {
      const t0 = i / 16, t1 = (i + 1) / 16, a = [xl + span * t0, yAt(t0), bz + s], b = [xl + span * t1, yAt(t1), bz + s];
      beam(w, [a[0], a[1] + 1.25, a[2]], [b[0], b[1] + 1.25, b[2]], 0.09, 0x4a3a28, { col: false, mat: "std" });
      beam(w, [a[0], a[1] + 0.08, a[2]], [b[0], b[1] + 0.08, b[2]], 0.1, 0x4a3a28, { col: false, mat: "std" });
      if (i % 2) beam(w, [a[0], a[1] + 0.08, a[2]], [a[0], a[1] + 1.25, a[2]], 0.05, 0x4a3a28, { col: false, mat: "std" });
    }
    for (const [x, yy] of [[xl, y], [xr, y]]) w.pipe(x, yy - 1.5, bz + s, x, yy + 2.4, bz + s, 0.22, 0x5a4026);
  }
  w.gap("흔들다리 아래", cx, 12, bz, 0, Math.min(34, span * 0.5), 22, 350);
  w.gap("흔들다리 위 스치기", cx, y + 2.6, bz, 0, 30, 3.4, 450);
  KEEP.push([xl, bz, 6], [xr, bz, 6]);
}

// ── 돌다리 (골짜기 가운데, 아치 아래로 강이 흐른다) ──
function stoneBridge(w) {
  const z0 = -4, F = frame(w, riverX(z0), z0, 46), ST = 0xc9b79c, ST2 = 0xae9c84, deck = 7.6, bo = { mat: "std:brick", tile: 3 };
  for (let u = -21; u < 20.9; u += 1.5) {
    const uc = u + 0.75, d = Math.abs(uc), y0 = d < 7 ? Math.sqrt(49 - d * d) : Math.min(F.h(uc, 0), 0) - 1.5;
    F.box(uc, y0, 0, 1.5, deck - y0, 4.6, Math.round(u / 1.5) % 2 ? ST : ST2, bo);
  }
  F.box(0, deck, 0, 43, 0.5, 5.4, ST2, bo);
  for (const v of [-2.5, 2.5]) F.box(0, deck + 0.5, v, 43, 0.8, 0.4, ST, bo);
  for (const s of [-1, 1]) {
    const yg = F.h(s * 35, 0), dy = deck + 0.25 - yg, len = Math.hypot(14, dy);
    F.box(s * 28, (deck + 0.25 + yg) / 2 - 0.25, 0, len, 0.5, 4.6, ST2, { ...bo, rz: -s * Math.atan(dy / 14) * 57.3 });
    for (const v of [-2.2, 2.2]) { F.pipe(s * 21, deck + 0.5, v, s * 21, deck + 3, v, 0.12, 0x3a3028); F.sph(s * 21, deck + 3.2, v, 0.3, 0xffc878, { mat: "glow", col: false }); }
    KEEP.push([F.X(s * 26, 0), F.Z(s * 26, 0), 11]);
  }
  F.gap("돌다리 아치", 0, 3.4, 0, 0, 12, 5.4, 450);
  KEEP.push([F.X(0, 0), F.Z(0, 0), 13]);
}

// ── 폭포 골짜기: 바위 턱에서 떨어지는 폭포와 그 뒤의 통로, 고원의 타른과 개울 ──
function falls(w, foam) {
  const { x: fx, z: fz, lip, edge } = FALLS;
  for (const [dx, dz, rx, rz] of [[0, 0, 11.5, 9], [3, -5, 8, 6], [2, 6, 8.5, 6.5]]) w.blob((fx + edge) / 2 + dx - 1, lip - 3.1, fz + dz, rx, 3.3, rz, 0xb9744a, { mat: "std:rock", grad: [0.55, 1.1], col: false, ry: 0 });
  w.col.addBox(V3((fx + edge) / 2 - 1, lip - 3.1, fz), V3(10.5, 2.9, 8.6));
  // 타른 수면, 개울, 턱 위의 물, 떨어지는 물
  const disc = new THREE.CircleGeometry(TARN.r + 1, 28); disc.rotateX(-Math.PI / 2); disc.translate(TARN.x, TARN.y, TARN.z);
  waterPatch(w, disc);
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], l = Math.hypot(bx - ax, bz - az), nx = (-(bz - az) / l) * 2.6, nz = ((bx - ax) / l) * 2.6;
    const ya = i ? TARN.y - 0.5 - (i / (STREAM.length - 1)) * 1.6 : TARN.y - 0.05, yb = TARN.y - 0.5 - ((i + 1) / (STREAM.length - 1)) * 1.6;
    fallSheet(w, [ax - nx, ya, az - nz], [ax + nx, ya, az + nz], [bx - nx, yb, bz - nz], [bx + nx, yb, bz + nz], { nv: 1, tileV: 8 });
  }
  const ye = lip + 0.75;
  fallSheet(w, [edge, ye, fz - 2.6], [edge, ye, fz + 2.6], [fx + 2.8, lip + 0.8, fz - 4.4], [fx + 2.8, lip + 0.8, fz + 4.4], { nv: 1, tileV: 8 });
  fallSheet(w, [fx + 2.8, lip + 0.8, fz - 4.4], [fx + 2.8, lip + 0.8, fz + 4.4], [fx + 4.6, 0.2, fz - 5.4], [fx + 4.6, 0.2, fz + 5.4], { nv: 8, nu: 3, bulge: 1.6 });
  for (let i = 0; i < 6; i++) w.blob(fx + 4 + w.rand() * 5, 0.9, fz + (i - 2.5) * 2.6, 2.6 + w.rand() * 1.6, 1.7, 2.6 + w.rand() * 1.6, 0xffffff, { mat: "glass", col: false, grad: [1, 1] });
  foam.push([fx + 6, 0.15, fz, 8], [fx + 10, 0.15, fz + 3, 5]);
  w.gap("폭포 뒤 통로", fx - 3.5, 32, fz, 0, 9, 38, 800);
  w.gap("폭포 다이브", fx + 11.5, 30, fz, 0, 13, 16, 500, -90);
  KEEP.push([(fx + edge) / 2, fz, 16], [TARN.x, TARN.z, TARN.r + 3]);
  for (const [x, z] of STREAM) KEEP.push([x, z, 8]);
}

// ── 바늘귀 협곡: 끼인 바위, 대성당 방의 돌기둥과 천연 다리, 입구 등불 ──
function slotDeco(w) {
  const H = (x, z) => w.h(x, z), dir = (t) => { const a = slotPoint(t - 0.01), b = slotPoint(t + 0.01), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  for (const [t, up, rr] of [[0.17, 21, 8.6], [0.36, 23, 8], [0.8, 22, 8.8], [0.93, 19, 8.4]]) {
    const [x, z] = slotPoint(t), [dx, dz] = dir(t), y = H(x, z) + up;
    w.blob(x, y, z, rr, rr * 0.82, rr, 0xb9744a, { mat: "std:rock", grad: [0.55, 1.1] });
    w.gap("끼인 바위 아래", x, y - rr * 0.8 - 6.5, z, Math.atan2(dx, dz) * 57.3, 9, 11, 550);
  }
  // 대성당 방
  const [cx, cz] = slotPoint(0.56), [dx, dz] = dir(0.56), nx = -dz, nz = dx, y0 = H(cx, cz);
  hoodoo(w, cx + nx * 5, cz + nz * 5, 21, 2.6);
  rockArch(w, cx - nx * 15 + dx * 13, cz - nz * 15 + dz * 13, cx + nx * 15 + dx * 13, cz + nz * 15 + dz * 13, y0 + 1, 17, 3, 0xc98a5a);
  w.gap("대성당 천연 다리", cx + dx * 13, y0 + 7.5, cz + dz * 13, Math.atan2(dx, dz) * 57.3, 18, 11, 500);
  for (const t of [0.02, 0.985]) {
    const [x, z] = slotPoint(t), [ex, ez] = dir(t);
    for (const s of [-1, 1]) { const px = x - ez * s * 7.5, pz = z + ex * s * 7.5, py = H(px, pz); w.pipe(px, py - 0.3, pz, px, py + 3.4, pz, 0.14, WOOD2); w.sph(px, py + 3.7, pz, 0.42, 0xffb04a, { mat: "glow", col: false }); KEEP.push([px, pz, 4]); }
  }
}

// ── 전망대 (동쪽 고원 가장자리) ──
function watchtower(w) {
  const tx = TWX, tz = TWZ, y = w.h(tx, tz);
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) w.pipe(tx + dx * 1.25, y - 0.5, tz + dz * 1.25, tx + dx, y + 13, tz + dz, 0.2, WOOD2);
  for (const dy of [4.5, 9]) for (const [a, b] of [[[-3, -3], [3, -3]], [[3, -3], [3, 3]], [[3, 3], [-3, 3]], [[-3, 3], [-3, -3]]]) { const k = 1.2 - dy * 0.015; beam(w, [tx + a[0] * k, y + dy, tz + a[1] * k], [tx + b[0] * k, y + dy, tz + b[1] * k], 0.2, WOOD2, { mat: "std" }); }
  w.box(tx, y + 13, tz, 8, 0.25, 8, WOOD, { mat: "std:wood", tile: 2 });
  for (const s of [-1, 1]) { w.box(tx + s * 3.9, y + 13.25, tz, 0.12, 1.1, 8, 0x7a5a3a, { mat: "std:wood", tile: 2 }); w.box(tx, y + 13.25, tz + s * 3.9, 8, 1.1, 0.12, 0x7a5a3a, { mat: "std:wood", tile: 2 }); }
  for (const [dx, dz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) beam(w, [tx + dx, y + 13.2, tz + dz], [tx + dx, y + 16.2, tz + dz], 0.2, WOOD2, { mat: "std" });
  w.box(tx, y + 16.2, tz, 9.4, 0.25, 9.4, 0x5a3d28, { mat: "std:wood", tile: 2 });
  w.cone(tx, y + 16.4, tz, 6.2, 2.4, 0x9a3a2a, { mat: "std", col: false, grad: [0.8, 1.05] });
  w.gap("전망대 다리 사이", tx, y + 6.5, tz, 0, 6, 12, 400); w.gap("전망대 다리 사이", tx, y + 6.5, tz, 90, 6, 12, 400);
  w.gap("전망대 난간 통과", tx, y + 14.8, tz, 0, 7, 2.6, 800);
  KEEP.push([tx, tz, 10]);
}

// ── 풍력 단지 (동쪽 능선) ──
function windFarm(w) {
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.5 });
  const bg = new THREE.BoxGeometry(1.5, 21, 0.3); bg.translate(0, 11, 0);
  const p = bg.attributes.position;
  for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) * (1 - (p.getY(k) / 21) * 0.72));
  const nose = new THREE.SphereGeometry(1.3, 12, 8); nose.scale(1, 1, 1.5);
  for (const [x, z, ph] of TURBINES) {
    const y = w.h(x, z), th = 46;
    w.cyl(x, y - 1, z, 1.7, th + 1, 0xf2f0ea, { rt: 0.95, mat: "paint" });
    w.box(x, y + th - 0.4, z + 1.2, 2.4, 2.2, 6.4, 0xe9e7e0, { mat: "paint", ao: false });
    w.cyl(x, y + 16, z, 1.5, 3, 0xd9532f, { rt: 1.36, mat: "paint", col: false });
    const hub = new THREE.Group();
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(bg, bladeMat); b.rotation.z = (i / 3) * Math.PI * 2; b.castShadow = true; hub.add(b); }
    hub.add(new THREE.Mesh(nose, bladeMat));
    hub.position.set(x, y + th + 0.7, z - 2.4); hub.rotation.z = ph;
    w.scene.add(hub);
    w.updaters.push((dt) => { hub.rotation.z += dt * 0.9; });
    w.sph(x, y + th + 2.2, z + 3.6, 0.3, 0xff3030, { mat: "glow", col: false });
    KEEP.push([x, z, 7]);
  }
}

// ── 캠프(오두막·텐트·모닥불·깃발) ──
function camp(w, x, z, ry, tents = [0xd9772f, 0x3f7fb5]) {
  const y = w.h(x, z);
  w.box(x - 8, y - 0.3, z - 5, 6, 3.4, 5, 0x8a623c, { mat: "std:wood", tile: 2, ry });
  w.box(x - 8, y + 3, z - 5, 7, 0.3, 6, 0x4f3423, { mat: "std:wood", tile: 2, ry });
  w.cone(x - 8, y + 3.2, z - 5, 4.8, 2.2, 0x9a3a2a, { mat: "std", col: false, grad: [0.8, 1.05] });
  [[6, -4], [8.5, 2.5]].forEach(([dx, dz], i) => w.cone(x + dx, y - 0.1, z + dz, 2.1, 2.3, tents[i], { mat: "std", grad: [0.7, 1.05] }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; w.blob(x + Math.cos(a) * 0.9, y + 0.15, z + 4 + Math.sin(a) * 0.9, 0.3, 0.25, 0.3, 0x6a655d, { mat: "std:rock", col: false }); }
  w.cone(x, y + 0.1, z + 4, 0.45, 1.1, 0xff8a2a, { mat: "glow", col: false });
  w.pool(x, y + 0.05, z + 4, 6, 0xff9a4a, 0.5);
  w.pipe(x + 10, y, z - 7, x + 10, y + 6, z - 7, 0.06, 0xdadada);
  w.box(x + 10.8, y + 4.8, z - 7, 1.6, 1.0, 0.04, 0xe94f37, { col: false, ao: false });
}

// ── 광산 (북동 고원): 권양탑, 갱도에서 선광장까지의 트레슬 궤도와 광차, 컨베이어, 광석 더미 ──
function mine(w) {
  const y0 = w.h(MX, MZ), F = frame(w, MX, MZ, 45, y0), RUST = 0xa4532f, STEEL = 0x4a4f58, ty = 5.2;
  // 트레슬 궤도: 선광장(v=-22) → 뷰트 기슭의 갱도 입구
  let vP = 34;
  while (vP < 72 && w.h(F.X(8, vP), F.Z(8, vP)) < y0 + ty + 1.2) vP += 1;
  const v0 = -22, len = vP - v0;
  F.box(8, ty - 0.35, (v0 + vP) / 2, 3, 0.35, len, WOOD, { mat: "std:wood", tile: 2 });
  for (const du of [-0.7, 0.7]) F.box(8 + du, ty, (v0 + vP) / 2, 0.14, 0.14, len, 0x3a3f47, { mat: "metal", col: false });
  for (let v = v0 + 5; v < vP - 2; v += 6.5) {
    for (const du of [-1.5, 1.5]) { const x = F.X(8 + du, v), z = F.Z(8 + du, v); beam(w, [x, w.h(x, z) - 0.4, z], [x, y0 + ty - 0.3, z], 0.32, WOOD2, { mat: "std" }); }
    F.beam(6.3, ty - 0.55, v, 9.7, ty - 0.55, v, 0.3, WOOD2, { mat: "std", col: false });
    F.beam(6.5, 0.4, v, 9.5, ty - 0.8, v, 0.16, WOOD2, { mat: "std", col: false });
  }
  F.gap("광산 트레슬 아래", 8, 2.3, v0 + 8.25, 90, 5.6, 4.2, 600); F.gap("광산 트레슬 아래", 8, 2.3, v0 + 21.25, 90, 5.6, 4.2, 600);
  for (const du of [-2.3, 2.3]) F.beam(8 + du, ty - 0.4, vP, 8 + du, ty + 4.2, vP, 0.45, WOOD2, { mat: "std" });
  F.beam(5.4, ty + 4.2, vP, 10.6, ty + 4.2, vP, 0.5, WOOD2, { mat: "std" });
  F.box(8, ty - 0.3, vP + 2.6, 4.2, 4.2, 5, 0x17120e, { ao: false });
  // 선광장과 컨베이어, 광석 더미
  F.box(8, 0, v0 - 5, 9, 10, 10, RUST, { mat: "std:corrug", tile: 3 });
  F.box(8, 10, v0 - 5, 10, 0.4, 11, 0x5a3a2c, { mat: "std:corrug", tile: 3, rz: 8 });
  F.box(-6, 6.4, v0 - 5, 21, 1.1, 1.8, 0xd9a441, { mat: "paint", rz: -24 });
  for (const u of [-2, -10]) F.beam(u, 0, v0 - 5, u, 6.4 - (u + 6) * 0.44, v0 - 5, 0.3, STEEL);
  w.cone(F.X(-17, v0 - 5), y0 - 0.2, F.Z(-17, v0 - 5), 8, 6.5, 0x8d8378, { mat: "std:rock", grad: [0.75, 1.05] });
  w.cone(F.X(24, 28), y0 - 0.2, F.Z(24, 28), 6.5, 5, 0xb5673c, { mat: "std:rock", grad: [0.75, 1.05] });
  // 권양탑(수갱)과 권양기실
  const hu = -12, hv = 16, hh = 21;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) F.beam(hu + a * 3.4, 0, hv + b * 3.4, hu + a * 1.5, hh, hv + b * 1.5, 0.4, 0xb23a2a);
  for (const yy of [7, 14]) for (const [a, b, c, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) { const k = 3.4 - yy * 0.09; F.beam(hu + a * k, yy, hv + b * k, hu + c * k, yy, hv + d * k, 0.26, 0xb23a2a, { col: false }); }
  for (const a of [-1.5, 1.5]) F.beam(hu + a, hh, hv, hu + a, 0, hv + 15, 0.36, 0xb23a2a);
  F.box(hu, hh, hv, 4.6, 0.5, 4.6, STEEL);
  for (const a of [-0.8, 0.8]) w.mesh(K.T.col8, M(F.X(hu + a - 0.2, hv), y0 + hh + 2.4, F.Z(hu + a - 0.2, hv), 1.9, 0.4, 1.9, 0, 45, 90), 0x2c3138, "paint");
  F.gap("권양탑 다리 사이", hu, 5, hv, 0, 6, 9, 450); F.gap("권양탑 다리 사이", hu, 5, hv, 90, 6, 9, 450);
  F.box(hu, 0, hv + 19, 8, 5, 7, 0x6d7683, { mat: "std:corrug", tile: 3 });
  F.box(hu, 5, hv + 19, 9, 0.4, 8, 0x5a3a2c, { mat: "std:corrug", tile: 3, rz: -7 });
  F.beam(hu, hh + 2.4, hv, hu, 4.6, hv + 16, 0.07, 0x22262c, { col: false });
  // 연료 탱크, 덤프트럭, 조명
  F.pipe(-22, 2, 30, -15, 2, 30, 1.5, 0xe9e7e0, { mat: "paint" }); for (const u of [-20.5, -16.5]) F.box(u, 0, 30, 0.5, 1, 2.6, STEEL);
  F.box(22, 0.5, -8, 2.6, 2.4, 6.4, 0xe0a52a, { mat: "paint", ry: 20 }); F.box(22.9, 0.5, -12.3, 2.5, 3, 2.2, 0xe9e7e0, { mat: "paint", ry: 20 });
  for (const [u, v] of [[-2, 2], [22, 18], [-24, -8]]) { F.pipe(u, 0, v, u, 8, v, 0.12, 0x2c3138); F.box(u, 8, v, 1.4, 0.2, 0.6, 0xffe2a8, { mat: "glow", col: false }); w.pool(F.X(u, v), y0, F.Z(u, v), 9, 0xffd9a0, 0.3); }
  // 광차 열차: 갱도와 선광장 사이를 오간다 (보이기만 한다)
  const parts = [[new THREE.BoxGeometry(1.5, 1.5, 2.8), M(0, 0.95, 0), 0xe0a52a], [new THREE.BoxGeometry(1.3, 0.7, 1.2), M(0, 1.9, 0.5), 0x2c3138]];
  for (let i = 1; i <= 4; i++) { parts.push([new THREE.BoxGeometry(1.5, 1.0, 2.2), M(0, 0.7, i * 2.9), 0x6b4a3a]); parts.push([new THREE.ConeGeometry(0.8, 0.7, 5), M(0, 1.5, i * 2.9), i % 2 ? 0x8d8378 : 0xb5673c]); }
  const train = prop(w, parts);
  train.rotation.y = 45 * Math.PI / 180;
  w.updaters.push((dt, t) => { const u = (t / 24) % 2, k = u < 1 ? u : 2 - u, e = k * k * (3 - 2 * k), v = v0 + 3 + (len - 15) * e; train.position.set(F.X(8, v), y0 + ty + 0.05, F.Z(8, v)); });
  KEEP.push([MX, MZ, 40]);
  for (let v = 30; v <= vP + 4; v += 6) KEEP.push([F.X(8, v), F.Z(8, v), 7]);
}

// ── 케이블카: 출발 캠프 → 서쪽 벼랑 위 ──
function cableCar(w) {
  const ax = SPX - 10, az = SPZ - 16, bx = -8, bz = 209, ay = w.h(ax, az), by = w.h(bx, bz), A = [ax, ay + 7.2, az], B = [bx, by + 7.2, bz];
  const station = (x, y, z, col) => {
    for (const [dx, dz] of [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]]) w.pipe(x + dx, y - 0.5, z + dz, x + dx, y + 8, z + dz, 0.2, 0x59606a);
    w.box(x, y + 8, z, 8, 0.4, 6.6, col, { mat: "std:corrug", tile: 2 }); w.box(x, y - 0.2, z, 7, 0.5, 5.6, 0x9a9488, { mat: "std:concrete", tile: 4 });
    w.mesh(K.T.col8, M(x, y + 6.9, z, 1.6, 0.3, 1.6), 0xd9a441, "paint");
    KEEP.push([x, z, 9]);
  };
  station(ax, ay, az, 0x2f6fb0); station(bx, by, bz, 0x2f6fb0);
  const mx = ax + (bx - ax) * 0.62, mz = az + (bz - az) * 0.62, my = A[1] + (B[1] - A[1]) * 0.62, mg = w.h(mx, mz);
  for (const s of [-1, 1]) beam(w, [mx + 2 * s, mg - 0.5, mz + 3 * s], [mx, my + 0.6, mz], 0.4, 0x59606a);
  beam(w, [mx - 0.3, my + 0.6, mz - 1.6], [mx + 0.3, my + 0.6, mz + 1.6], 0.3, 0x59606a, { col: false });
  KEEP.push([mx, mz, 6]);
  const l = Math.hypot(bx - ax, bz - az), ox = (-(bz - az) / l) * 1.3, oz = ((bx - ax) / l) * 1.3;
  for (const s of [-1, 1]) beam(w, [A[0] + ox * s, A[1], A[2] + oz * s], [B[0] + ox * s, B[1], B[2] + oz * s], 0.1, 0x22262c);
  const cars = [-1, 1].map((s, i) => {
    const g = prop(w, [[new THREE.BoxGeometry(1.8, 1.9, 2.6), M(0, -2.6, 0), i ? 0xe94f37 : 0xffc23a], [new THREE.BoxGeometry(1.84, 0.7, 2.64), M(0, -2.3, 0), 0x2a3340], [new THREE.BoxGeometry(0.12, 1.7, 0.12), M(0, -0.85, 0), 0x2c3138], [new THREE.BoxGeometry(2, 0.14, 2.8), M(0, -1.62, 0), 0xf2f0ea]]);
    g.rotation.y = Math.atan2(bx - ax, bz - az);
    return { g, s };
  });
  w.updaters.push((dt, t) => {
    const u = (t / 38) % 2, k0 = u < 1 ? u : 2 - u, e0 = 0.04 + 0.92 * (k0 * k0 * (3 - 2 * k0));
    for (const c of cars) { const e = c.s > 0 ? e0 : 1 - e0; c.g.position.set(A[0] + (B[0] - A[0]) * e + ox * c.s, A[1] + (B[1] - A[1]) * e, A[2] + (B[2] - A[2]) * e + oz * c.s); }
  });
  w.gap("케이블카 아래", (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 8, (A[2] + B[2]) / 2, 0, 14, 12, 300);
}

// ── 고대 유적 (호수를 내려다보는 벼랑): 돌기둥 고리와 문 ──
function ruins(w) {
  const x0 = RUX, z0 = RUZ, y = w.h(x0, z0), ST = 0xe2cfa8, ST2 = 0xc9b48c, so = { mat: "std:concrete", tile: 4 };
  w.cyl(x0, y - 0.6, z0, 15, 0.9, ST2, so); w.cyl(x0, y + 0.3, z0, 5, 0.5, ST, so);
  const n = 10, R = 12, top = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, h = i === 3 ? 4.5 : i === 7 ? 6.5 : 10, px = x0 + Math.cos(a) * R, pz = z0 + Math.sin(a) * R;
    w.cyl(px, y, pz, 1.05, h, i % 2 ? ST : ST2, { ...so, rt: 0.9 }); w.box(px, y + h, pz, 2.6, 0.6, 2.6, ST2, { ...so, ry: -a * 57.3 });
    top.push(h === 10 ? [px, pz] : null);
  }
  for (let i = 0; i < n; i++) { const a = top[i], b = top[(i + 1) % n]; if (a && b && i !== 0 && i !== 5) w.box((a[0] + b[0]) / 2, y + 10.6, (a[1] + b[1]) / 2, Math.hypot(b[0] - a[0], b[1] - a[1]) + 1.6, 1, 1.8, ST, { ...so, ry: Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 57.3 }); }
  w.box(x0 + 7, y, z0 - 9.5, 1.6, 1.4, 6, ST2, { ...so, ry: 34 }); w.box(x0 - 3.5, y, z0 + 3, 1.3, 1.2, 4.4, ST, { ...so, ry: -20 });
  // 호수 쪽 문
  for (const s of [-1, 1]) w.box(x0 + 19, y - 1, z0 + s * 5, 3, 15, 3, ST, so);
  w.box(x0 + 19, y + 14, z0, 3.6, 2, 15, ST2, so);
  w.gap("유적의 문", x0 + 19, y + 7, z0, 90, 6.6, 13, 450);
  w.gap("유적 돌기둥 고리", x0, y + 5.5, z0, 0, 21, 9.4, 350); w.gap("유적 돌기둥 고리", x0, y + 5.5, z0, 90, 21, 9.4, 350);
  w.cone(x0, y + 0.8, z0, 0.6, 1.5, 0x7ad8ff, { mat: "glow", col: false }); w.pool(x0, y + 0.85, z0, 7, 0x7ad8ff, 0.4);
  KEEP.push([x0, z0, 19], [x0 + 19, z0, 9]);
}

// ── 산림 감시소와 통신탑 (북서 고원) ──
function ranger(w) {
  const x0 = RGX, z0 = RGZ, y = w.h(x0, z0), RED = 0xd9432f, WH = 0xf2f0ea, H = 56;
  w.box(x0 + 9, y - 0.3, z0 + 6, 8, 3.6, 6, 0x7a5a3a, { mat: "std:wood", tile: 2 });
  for (const s of [-1, 1]) w.box(x0 + 9, y + 3.9, z0 + 6 + s * 1.8, 9, 0.3, 4.4, 0x3d6b4f, { mat: "std:corrug", tile: 2, rx: s * 28 });
  w.box(x0 + 9, y + 1.2, z0 + 2.95, 1.6, 1.2, 0.1, 0xffd9a0, { mat: "glow", col: false });
  const leg = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
  for (let lv = 0; lv < 8; lv++) {
    const ya = y + lv * 7, yb = ya + 7, ra = 3.2 - lv * 0.33, rb = 3.2 - (lv + 1) * 0.33, col = lv % 2 ? WH : RED;
    for (let i = 0; i < 3; i++) {
      const [c0, s0] = leg[i], [c1, s1] = leg[(i + 1) % 3];
      beam(w, [x0 + c0 * ra, ya, z0 + s0 * ra], [x0 + c0 * rb, yb, z0 + s0 * rb], 0.28, col);
      beam(w, [x0 + c0 * rb, yb, z0 + s0 * rb], [x0 + c1 * rb, yb, z0 + s1 * rb], 0.16, col, { col: false });
      beam(w, [x0 + c0 * ra, ya, z0 + s0 * ra], [x0 + c1 * rb, yb, z0 + s1 * rb], 0.14, col, { col: false });
    }
    if (lv === 3 || lv === 7) w.sph(x0, yb + 0.5, z0, 0.45, 0xff3030, { mat: "glow", col: false });
  }
  w.pipe(x0, y + H, z0, x0, y + H + 8, z0, 0.12, WH);
  for (const [dy, a] of [[40, 0.6], [46, 2.7]]) w.mesh(K.T.col8, M(x0 + Math.cos(a) * 1.6, y + dy, z0 + Math.sin(a) * 1.6, 1.3, 0.4, 1.3, 0, -a * 57.3, 90), WH, "paint");
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 3, gx = x0 + Math.cos(a) * 26, gz = z0 + Math.sin(a) * 26; beam(w, [gx, w.h(gx, gz), gz], [x0, y + 40, z0], 0.1, 0xb9c0c8); beam(w, [gx, w.h(gx, gz), gz], [x0, y + 21, z0], 0.1, 0xb9c0c8); KEEP.push([gx, gz, 4]); }
  w.gap("통신탑 버팀줄 사이", x0, y + 30, z0, 30, 9, 16, 500);
  KEEP.push([x0, z0, 9], [x0 + 9, z0 + 6, 8]);
}

// ── 호숫가: 잔교·보트 창고·조각배, 섬 위의 작은 아치 ──
function lakeside(w) {
  const [cx, cz] = flat("camp2"), px = cx + 14, z1 = LAKE.z + LAKE.rz * 0.42;
  let z0 = cz - 12; while (w.h(px, z0) > 0.7 && z0 > cz - 40) z0 -= 1;
  const len = z0 + 4 - z1;
  w.box(px, 0.75, (z0 + 4 + z1) / 2, 3, 0.25, len, WOOD, { mat: "std:wood", tile: 2 });
  for (let z = z1 + 1; z < z0 + 4; z += 5) for (const s of [-1.3, 1.3]) w.pipe(px + s, -3, z, px + s, 1.6, z, 0.14, WOOD2, { col: false });
  w.gap("잔교 스치기", px, 2.4, (z0 + z1) / 2, 90, len * 0.6, 2.4, 300);
  w.box(px + 8, 0.6, z0 + 2, 7, 3.6, 8, 0x3f7fb5, { mat: "std:wood", tile: 2 });
  for (const s of [-1, 1]) w.box(px + 8 + s * 2, 4.3, z0 + 2, 4.6, 0.3, 9, 0xf2f0ea, { mat: "std:corrug", tile: 2, rz: -s * 26 });
  for (const [dx, dz, c, ry] of [[-3.2, -6, 0xe94f37, 8], [3.4, -12, 0xffc23a, -12], [-3.4, -17, 0x3d8b5a, 4]]) { w.box(px + dx, 0.05, z0 + dz, 1.4, 0.6, 4, c, { mat: "paint", ry }); w.box(px + dx, 0.5, z0 + dz, 1.1, 0.12, 0.3, WOOD, { ry, col: false }); }
  KEEP.push([px, z0, 8], [px + 8, z0 + 2, 8]);
  rockArch(w, ISLE.x - 6.5, ISLE.z - 1, ISLE.x + 6.5, ISLE.z + 1, w.h(ISLE.x, ISLE.z) - 2.5, 10.5, 2.1, 0xd9a070, { n: 8 });
  w.gap("섬 아치", ISLE.x, w.h(ISLE.x, ISLE.z) + 3.4, ISLE.z, -9, 7, 5.6, 700);
  KEEP.push([ISLE.x, ISLE.z, 10]);
}

// ── 움직이는 것들: 독수리, 열기구, 뗏목 ──
function life(w) {
  birds(w, [[10, 104, 30, 85, 9, 0], [-10, 116, 10, 62, -8, 2.1], [LAKE.x, 74, LAKE.z, 58, 8, 1], [215, 124, -210, 80, 9, 4], [-170, 128, 130, 85, -9, 3], [120, 110, 150, 70, 8, 5.2]]);
  balloon(w, riverX(214) + 6, 64, 214, 7, [0xe94f37, 0xffe9c4, 0xffb020, 0xffe9c4], w.h(SPX - 4, SPZ - 6));
  balloon(w, TARN.x - 34, TARN.y + 44, TARN.z + 30, 7, [0x2f8fd0, 0xfff2d8, 0x35b06a, 0xfff2d8], w.h(TARN.x - 30, TARN.z + 33));
  [[390, 150, -40, 60, 0.011, 0, [0xb44cff, 0xffe9c4]], [-380, 165, -210, 70, -0.009, 2, [0xff5a8a, 0xfff2d8, 0xffc23a]], [40, 178, 420, 50, 0.012, 4, [0x2a9d8f, 0xffe9c4]]].forEach(([x, y, z, R, sp, ph, cols]) => {
    const b = prop(w, balloonParts(8, cols));
    w.updaters.push((dt, t) => b.position.set(x + Math.cos(t * sp + ph) * R, y + Math.sin(t * 0.07 + ph) * 8, z + Math.sin(t * sp + ph) * R));
  });
  // 강을 따라 떠내려가는 뗏목
  const parts = [];
  for (let i = -2; i <= 2; i++) parts.push([new THREE.BoxGeometry(0.62, 0.5, 5.2), M(i * 0.66, 0.1, 0), i % 2 ? 0x9a7446 : 0x8a623c]);
  parts.push([new THREE.ConeGeometry(1.25, 1.5, 4), M(0, 1.1, 0.6, 1, 1, 1, 0, 45, 0), 0xe94f37], [new THREE.BoxGeometry(0.08, 2.6, 0.08), M(0, 1.6, -1.9), 0x4a3a28], [new THREE.BoxGeometry(0.9, 0.5, 0.04), M(0.45, 2.6, -1.9), 0xffc23a]);
  const raft = prop(w, parts);
  w.updaters.push((dt, t) => { const z = 258 - ((t * 2.4 + 120) % 450), x = riverX(z) + 4; raft.position.set(x, 0.12 + Math.sin(t * 1.7) * 0.05, z); raft.rotation.y = Math.atan2(-(riverX(z - 2) + 4 - x), 2) + Math.sin(t * 0.5) * 0.08; });
}

let K = null;

function build(w) {
  const r = w.rand, H = (x, z) => w.h(x, z);
  KEEP.length = 0;
  K = flora(w);
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.4, 1.36, 1.2", rockTint: "1.32, 0.8, 0.55", rockLo: 0.2, rockHi: 0.4 });
  w.water(0, 0x1e6a70);
  const slope = (x, z) => Math.max(Math.abs(H(x + 2, z) - H(x - 2, z)), Math.abs(H(x, z + 2) - H(x, z - 2))) / 4;

  const foam = dam(w);
  ropeBridge(w);
  stoneBridge(w);
  falls(w, foam);
  foamRings(w, foam);
  slotDeco(w);
  watchtower(w);
  windFarm(w);
  mine(w);
  cableCar(w);
  ruins(w);
  ranger(w);
  lakeside(w);
  life(w);

  // 강을 가로지르는 암석 아치 (z = 112)
  { const az = 112, cx = riverX(az); rockArch(w, cx - 17, az, cx + 17, az, 0.5, 25, 4.9, ROCK); w.gap("암석 아치", cx, 10.5, az, 0, 20, 17, 400); KEEP.push([cx - 17, az, 9], [cx + 17, az, 9]); }
  // 후두 정원 (동쪽 고원)과 창 바위
  for (const [x, z, h, rad] of HOODOOS) { hoodoo(w, x, z, h, rad); KEEP.push([x, z, rad + 2.5]); }
  { const x = 200, z = -36, y = H(x, z); rockArch(w, x - 9, z - 4, x + 9, z + 4, y - 1, 14, 2.7, 0xd98a58); w.gap("창 바위", x, y + 5.5, z, 66, 10, 8.6, 500); KEEP.push([x, z, 12]); }

  // 캠프
  camp(w, SPX, SPZ, 10); camp(w, ...flat("camp0").slice(0, 2), -20, [0x35b06a, 0xffc23a]); camp(w, ...flat("camp1").slice(0, 2), 0, [0xe94f37, 0xf2f0ea]);
  camp(w, ...flat("camp2").slice(0, 2), 30, [0x3f7fb5, 0xffc23a]); camp(w, ...flat("camp3").slice(0, 2), 60, [0xb44cff, 0xd9772f]);

  // ── 식생·바위: 구역마다 다르게 (트랙·차량 경로·거점 주변은 비운다) ──
  for (const f of FLATS) KEEP.push([f[0], f[1], f[2] + 4]);
  for (const p of [...DEPOTS, ...SUPPLY.turrets]) KEEP.push([p[0], p[1], 6]);
  for (const t of TRACKS) if (t.start) KEEP.push([t.start.pos[0], t.start.pos[2], 7]);
  // 레이싱 라인(캣멀-롬 곡선)과 차량 경로를 잘게 나눈 꺾은선으로 만들어 그 주변을 비운다
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => V3(q[0], 0, q[2])), loop, "centripetal").getPoints(pts.length * 8).map((v) => [v.x, v.z]);
  const LINES = [...GROUND_PATHS.map((p) => [sample(p, true), 7, true]), ...TRACKS.map((t) => [sample(t.gates.map((g) => g.p), t.loop !== false), t.id === "falls" ? 11 : 9, t.loop !== false])];
  const dc = Math.cos(DAM.ry * Math.PI / 180), ds = Math.sin(DAM.ry * Math.PI / 180);
  const clear = (x, z, m = 0) => {
    if ((x - DAM.x) * ds + (z - DAM.z) * dc > -6 && H(x, z) < 37) return false;      // 저수지 물속
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [L, wd, loop] of LINES) for (let i = 0; i < L.length - (loop ? 0 : 1); i++) {
      const a = L[i], b = L[(i + 1) % L.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < wd + m) return false;
    }
    return true;
  };
  const valley = (x, z, y) => y < 15 && (Math.abs(x - riverX(z)) < 80 || lakeE(x, z) < 1.25);
  const scatter = (count, tries, fn) => { let n = 0; for (let i = 0; i < tries && n < count; i++) if (fn((r() * 2 - 1) * 400, (r() * 2 - 1) * 400)) n++; };
  // 서쪽 고원: 소나무 숲 군락
  scatter(900, 9000, (x, z) => {
    const y = H(x, z);
    if (x > 40 || y < 30 || dryness(x) > 0.45 || slope(x, z) > 0.4 || !clear(x, z)) return false;
    const f = forest(x, z); if (f < 0.44 && r() > 0.12) return false;
    K.pine(x, z, 0.8 + r() * 0.8 + (f > 0.6 ? 0.2 : 0)); return true;
  });
  // 동쪽 고원: 드문드문한 향나무·고사목
  scatter(210, 5000, (x, z) => {
    const y = H(x, z);
    if (y < 30 || dryness(x) < 0.5 || slope(x, z) > 0.35 || !clear(x, z) || forest(x + 300, z) < 0.5) return false;
    if (r() < 0.22) K.snag(x, z, 0.8 + r() * 0.5); else if (r() < 0.4) K.pine(x, z, 0.6 + r() * 0.4, -0.06); else K.round(x, z, 0.55 + r() * 0.4, 0.2, 0.4);
    return true;
  });
  // 골짜기 바닥·호숫가: 활엽수 띠
  scatter(380, 9000, (x, z) => {
    const y = H(x, z);
    if (y < 1.5 || !valley(x, z, y) || slope(x, z) > 0.4 || slotAt(x, z)[0] > 0.2 || !clear(x, z)) return false;
    K.round(x, z, 0.8 + r() * 0.7, r() < 0.2 ? 0.16 : 0.27); return true;
  });
  // 타른 주변 자작나무 풀밭
  for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = TARN.r + 6 + r() * 26, x = TARN.x + Math.cos(a) * d, z = TARN.z + Math.sin(a) * d; if (slope(x, z) < 0.35 && clear(x, z) && H(x, z) > 40) K.round(x, z, 0.7 + r() * 0.5, 0.2 + r() * 0.04, 0.6); }
  // 물가의 갈대
  scatter(300, 12000, (x, z) => { const y = H(x, z); if (y < -0.1 || y > 1.5 || !clear(x, z, -4)) return false; K.reed(x, z, 0.9 + r() * 0.7, r() < 0.5 ? 0xb7b45a : 0x8fae4c); return true; });
  // 덤불: 골짜기는 꽃 덤불, 서쪽은 초록, 동쪽은 누런 덤불
  const FLOWER = [0xf06a9a, 0xffd23a, 0xf4f0e6, 0xb48cff];
  scatter(560, 9000, (x, z) => {
    const y = H(x, z);
    if (y < 1.2 || slope(x, z) > 0.55 || !clear(x, z, -3)) return false;
    if (valley(x, z, y)) K.bush(x, z, 0.6 + r() * 0.6, r() < 0.55 ? FLOWER[(r() * 4) | 0] : undefined);
    else K.bush(x, z, 0.7 + r() * 0.8, dryness(x) > 0.5 ? (r() < 0.3 ? 0xd9b23a : 0x9a9a4a) : undefined);
    return true;
  });
  // 바위: 고원에 흩어진 것과 절벽 아래 너덜
  scatter(400, 7000, (x, z) => {
    const y = H(x, z), s = slope(x, z);
    if (y < -0.4 || s > 0.9 || !clear(x, z, -2) || (s < 0.12 && r() < 0.6)) return false;
    K.rock(x, z, 0.7 + r() * r() * 3.4, [ROCK, 0xd98a58, 0xb9744a][(r() * 3) | 0]); return true;
  });
  // 강 위의 바위
  for (let z = -180; z < 250; z += 26 + r() * 30) { const x = riverX(z) + (r() < 0.5 ? -1 : 1) * (6.5 + r() * 3); if (clear(x, z, -6)) K.rock(x, z, 1.6 + r() * 1.2, 0xb08a68); }
}

// ── 경로·트랙 데이터 (지형 함수로 높이를 계산한다) ──
const T = (x, z, up) => [x, height(x, z) + up, z];
const G = (t, p, o = {}) => ({ t, p, ...o });
const RV = (z, y, dx = 0) => [riverX(z) + dx, y, z];
const SL = (t, up = 5) => { const [x, z] = slotPoint(t); return [x, height(x, z) + up, z]; };

const DEPOTS = [[riverX(0) + 22, 6], [-150, -120], [170, 60], [riverX(-140) - 20, -140]];
const SUPPLY = {
  depot: [SPX - 13, SPZ + 8],
  camps: [[flat("camp0")[0], 64], [flat("camp1")[0], -48], [flat("camp2")[0], -186], [flat("camp3")[0], 104]],
  turrets: [[-150, -78], [166, 134]],
};
const BUGGY = [[156, 0, 150, 12], [186, 0, 128, 11], [218, 0, 112, 12], [236, 0, 70, 13], [232, 0, 20, 14], [228, 0, -34, 13], [230, 0, -100, 12], [198, 0, -118, 11], [166, 0, -112, 10], [142, 0, -94, 9], [139, 0, -58, 10], [152, 0, -6, 12], [150, 0, 60, 13], [146, 0, 112, 12]];
const RUNNER = [[SPX + 2, 0, SPZ - 22, 4.2], RV(190, 0, 22), RV(160, 0, 21), RV(132, 0, 26), RV(104, 0, 28), RV(80, 0, 22), RV(58, 0, 19), RV(34, 0, 19), RV(12, 0, 25), RV(34, 0, 19), RV(58, 0, 19), RV(80, 0, 22), RV(104, 0, 28), RV(132, 0, 26), RV(160, 0, 21), RV(190, 0, 22)].map((p) => [p[0], 0, p[2], p[3] || 4.6]);
const GROUND_PATHS = [BUGGY, RUNNER];

const RUN = [
  G("hoop", RV(236, 9)), G("hoop", RV(200, 11)), G("hoop", RV(160, 9)), G("hoop", RV(112, 10.5), { r: 6 }), G("hoop", RV(74, 9)), G("hoop", RV(36, 11, -8)),
  G("hoop", RV(-4, 15)), G("hoop", RV(-38, 10)), G("hoop", RV(-70, 12), { r: 6 }), G("hoop", RV(-108, 9)), G("hoop", RV(-146, 12, 10)), G("hoop", RV(-184, 9)),
  G("hoop", [-22, 9, -222]), G("hoop", [-22, 10, -256], { r: 6 }), G("hoop", [-8, 12, -292]),
];
// 광산 트레슬 아래를 지나는 지점 (광산 좌표계: 45도 회전)
const TRESTLE = [MX + (8 - 13.75) * 0.7071, height(MX, MZ) + 2.4, MZ - (8 + 13.75) * 0.7071];
const MESA = [
  G("square", T(150, 12, 11), { w: 6, h: 4.6 }), G("ring", T(146, -34, 10), { r: 3 }), G("square", T(164, -66, 9), { w: 6, h: 5 }), G("ring", T(186, -88, 10), { r: 3 }),
  G("square", T(222, -100, 12), { w: 7, h: 5 }), G("ring", T(256, -34, 16), { r: 3.2 }), G("square", T(250, 24, 14), { w: 7, h: 5 }), G("ring", T(236, 78, 12), { r: 3 }),
  G("square", T(224, 136, 11), { w: 7, h: 5 }), G("square", TRESTLE, { w: 5.2, h: 3.8, yaw: 135 }), G("ring", T(178, 212, 9), { r: 3 }), G("square", T(150, 126, 11), { w: 7, h: 5 }), G("ring", T(152, 62, 11), { r: 3 }),
];
const SLOTRUN = [
  G("square", RV(-50, 12), { w: 8, h: 6 }), G("ring", RV(-70, 12), { r: 4 }), G("ring", RV(-112, 10), { r: 3.6 }), G("ring", RV(-150, 12, 12), { r: 3.4 }), G("ring", RV(-190, 9), { r: 3.4 }),
  G("ring", [0, 9, -228], { r: 3.6 }), G("square", [44, 8, -246], { w: 8, h: 6 }),
  ...[0.97, 0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.18, 0.11, 0.04].map((t) => G("ring", SL(t, 5.2), { r: t > 0.95 || t < 0.05 ? 3.4 : 3 })),
];
const FALLSRUN = [
  G("hoop", RV(112, 10.5), { r: 5.5 }), G("ring", RV(60, 10, 4), { r: 3.6 }), G("ring", RV(22, 10, -6), { r: 3.4 }), G("ring", [-22, 12, 24], { r: 3.4 }), G("ring", [-66, 22, 32], { r: 3.4 }),
  G("square", [FALLS.x - 3.5, 30, FALLS.z + 1], { w: 7, h: 8, yaw: 0 }), G("ring", [-78, 44, -2], { r: 3.6 }), G("ring", [-44, 60, 4], { r: 3.8 }), G("ring", [-36, 70, 26], { r: 3.8 }), G("ring", [-66, 75, 30], { r: 3.8 }),
  G("square", [-104, 72, 16], { w: 8, h: 6 }), G("ring", [TARN.x, TARN.y + 3.6, TARN.z], { r: 3.4 }), G("square", T(-214, 96, 16), { w: 7, h: 5 }), G("ring", T(-150, 152, 16), { r: 3.2 }),
  G("square", T(-62, 196, 14), { w: 7, h: 5 }), G("ring", T(-6, 188, 12), { r: 3.6 }), G("ring", [30, 48, 178], { r: 4 }), G("ring", RV(160, 22), { r: 3.8 }),
];
const TRACKS = [
  { id: "run", name: "협곡 런", level: 1, loop: false, desc: "댐 아래에서 출발해 암석 아치와 흔들다리 밑을 지나 호수까지 강을 따라 내려가는 구간 주행", start: { pos: [riverX(260) + 15, 0, 260], yaw: -6 }, gates: RUN },
  { id: "mesa", name: "고원 슬라럼", level: 2, laps: 2, desc: "전망대에서 후두 정원과 풍력 단지를 지나 광산까지 도는 동쪽 고원 코스", gates: MESA },
  { id: "falls", name: "폭포 순환", level: 2, laps: 1, desc: "암석 아치와 폭포 뒤 통로를 지나 절벽 위 타른과 숲을 돌고 협곡으로 다시 뛰어드는 일주 코스", start: { pos: [riverX(134) + 18, 0, 134], yaw: 44 }, gates: FALLSRUN },
  { id: "slot", name: "바늘귀 협곡", level: 3, laps: 2, desc: "흔들다리 밑으로 호수까지 내려간 뒤 좁은 슬롯 캐니언을 꿰어 돌아오는 고난도 코스", start: { pos: [riverX(-40) + 20, 0, -40], yaw: 74 }, gates: SLOTRUN },
];

export default {
  id: "canyon",
  name: "붉은 협곡",
  desc: "댐에서 호수까지 강이 굽이치는 사암 협곡. 폭포 뒤 통로와 바늘귀 협곡, 돌다리·흔들다리, 광산·유적·풍력 단지까지",
  size: 300,
  ceiling: 190,
  seed: 51,
  env: {
    sky: { top: 0x3a66b0, horizon: 0xffd2a0, bottom: 0xc79a78 }, sunDir: [0.62, 0.36, -0.55], sunColor: 0xffc890, sun: 3.6,
    hemi: 0.4, hemiSky: 0xbcd0ff, hemiGround: 0x8a5a3a, cloud: 0.52, cloudLit: 0xfff0dc, cloudDark: 0xb08a90,
    fog: { color: 0xeccaa2, near: 220, far: 1700 }, exposure: 1.0,
  },
  spawn: { pos: [SPX + 2, 0, SPZ - 10], yaw: 12 },
  build,
  tracks: TRACKS,
  tracking: [
    {
      id: "boat", name: "강 위의 보트", type: "boat", level: 1, desc: "댐 아래에서 호수까지 굽이치는 강을 내려가는 보트를 따라가세요", duration: 80, closed: false,
      path: [...Array.from({ length: 24 }, (_, i) => { const z = 252 - i * 20; return [riverX(z), 0.15, z, 7]; }), [-30, 0.15, -230, 7], [-40, 0.15, -256, 6], [-20, 0.15, -280, 6], [10, 0.15, -286, 5]],
    },
    { id: "runner", name: "강변 러너", type: "runner", level: 1, desc: "강변 오솔길을 달리는 러너를 가까이에서 따라가세요", duration: 70, path: RUNNER },
    { id: "buggy", name: "오프로드 버기", type: "sportscar", level: 2, desc: "풍력 단지와 후두 정원을 도는 버기 추적. 언덕 뒤로 숨는 순간을 조심하세요", duration: 85, color: 0xd9772f, path: BUGGY },
    {
      id: "drone", name: "협곡 드론", type: "drone", level: 3, desc: "폭포 골짜기와 바늘귀 협곡을 드나드는 드론을 화면에 담으세요", duration: 85,
      path: [RV(200, 14), RV(150, 20, 10), RV(112, 10.5), RV(60, 22, -14), [-40, 22, 18], [-76, 30, 16], [-40, 40, 20], RV(10, 30, 10), SL(0.04, 8), SL(0.16, 7), SL(0.28, 7), SL(0.4, 8), SL(0.52, 12), [118, 96, -84], [80, 92, -20], RV(40, 60, 30), RV(120, 40, -16)].map((p) => [...p, 11]),
    },
  ],
  combat: { blue: [-190, 160], red: [200, -150], depots: DEPOTS },
  supply: SUPPLY,
};
