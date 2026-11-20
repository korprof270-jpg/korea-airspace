// 붉은 협곡 전초기지 구역: 시추 메사(시추탑 다섯 · 펌프잭 · 플레어 스택 · 순환로 · 연료 탱크 단지), 감시 뷰트(접시 안테나),
// 절벽 착륙장 둘, 협곡을 건너는 삭도, 협곡 바닥 보급로와 검문소, 연합 고원(전진 기지 터), 포대 메사, 요새 뒤 적 본부 터
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, merged, mat, ring, octa, ball, dome, V3, local, plume, slab, turret, shuttle, fuelTank, gasSphere, mast, post, hedgehog, monolith, hoodoo, boulder, yawOf, DEG, BOXG, CYLG,
  BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ, WH, WH2, NAVY, SKY, OLIVE,
} from "./outpost-kit.js";
import { height, canyonPoint, canyonYaw, canyonHW, RIG_C, DERRICKS, FLARES, DISHES, DISH_BUTTE, ROPE, TANKS, N_TOP, COURT, flat } from "./outpost-terrain.js";
import { ROAD, RIG_ROAD, PADS, COMBAT, STRIKE, SUPPLY, DEPOTS } from "./outpost-routes.js";

const PANEL = { mat: "std:panel", tile: 6 };
const NC = { col: false }, GL = { mat: "glow", col: false }, FLATM = { col: false, ao: false };
// 정점 색 지오메트리 하나를 여러 번 그리는 움직이는 부품
function instanced(w, parts, n, key = "paint") {
  const g = merged(parts), im = new THREE.InstancedMesh(g, mat(w, key), n);
  im.frustumCulled = false; im.castShadow = true; w.scene.add(im); w.disposables.push(g);
  return im;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

// ── 시추 메사 ──
function derrick(w, K, x, z, H, i) {
  const y = height(x, z), b = 6.2, t = 1.6, F = 5.2, n = Math.max(5, Math.round((H - F) / 6.5));
  // 하부 구조(시추 바닥): 네 기둥 위의 강판 — 밑이 뚫려 있다
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.box(x + sx * 6.4, y, z + sz * 6.4, 1.5, F, 1.5, BLK2, { mat: "paint" });
  w.box(x, y + F - 0.9, z, 15.4, 0.9, 15.4, IRON, PANEL);
  w.box(x, y + F - 1.3, z, 15.6, 0.3, 15.6, RED, GL);
  for (const s of [-1, 1]) { w.box(x + s * 7.5, y + F, z, 0.2, 1.1, 15, GUN, NC); w.box(x, y + F, z + s * 7.5, 15, 1.1, 0.2, GUN, NC); }
  // 격자 탑: 위로 좁아지는 네 다리 + 층마다 가로대와 가새
  const hw = (k) => b + (t - b) * k, yy = (k) => y + F + (H - F) * k;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(w, [x + sx * b, y + F, z + sz * b], [x + sx * t, y + H, z + sz * t], 0.55, STEEL);
  for (let k = 1; k <= n; k++) {
    const a = hw((k - 1) / n), c = hw(k / n), y0 = yy((k - 1) / n), y1 = yy(k / n), d = k % 2 ? 1 : -1;
    for (const s of [-1, 1]) {
      beam(w, [x - c, y1, z + s * c], [x + c, y1, z + s * c], 0.3, GUN, NC); beam(w, [x + s * c, y1, z - c], [x + s * c, y1, z + c], 0.3, GUN, NC);
      beam(w, [x - a * d, y0, z + s * a], [x + c * d, y1, z + s * c], 0.24, k % 3 ? GUN : DRED, NC); beam(w, [x + s * a, y0, z - a * d], [x + s * c, y1, z + c * d], 0.24, GUN, NC);
    }
  }
  // 왕관 블록과 꼭대기 장치
  w.box(x, y + H, z, t * 2 + 1.6, 1.4, t * 2 + 1.6, BLK, { mat: "paint" });
  w.box(x, y + H + 0.5, z, t * 2 + 1.8, 0.35, t * 2 + 1.8, RED, GL);
  w.pipe(x, y + H + 1.4, z, x, y + H + 7, z, 0.22, GUN, NC);
  K.blink.add(x, y + H + 7.4, z, RED, 0.5, i);
  // 시추관(돌아가는 부분은 따로) · 조종실 · 관 받침대 · 진흙 탱크 · 계단
  const RY = Math.atan2(x - RIG_C[0], z - RIG_C[1]) / DEG, P = local(x, z, RY);   // +v 가 바깥(순환로 쪽) — 그쪽은 비워 둔다
  const [cx, cz] = P(10.6, 3), [rx, rz] = P(0, -12.5), [mx, mz] = P(-11.5, 0);
  w.box(cx, y, cz, 5, 4.2, 6, BLK2, { mat: "std:panel", tile: 3, ry: RY });
  w.box(cx, y + 2.6, cz, 5.1, 0.7, 6.1, ORG, { ...GL, ry: RY });
  for (let k = 0; k < 5; k++) { const [ax, az] = P(-6, -11 - k * 0.75), [bx, bz] = P(6, -11 - k * 0.75); w.pipe(ax, y + 1.2 + (k % 2) * 0.6, az, bx, y + 1.2 + (k % 2) * 0.6, bz, 0.3, k % 2 ? RUST : GUN, NC); }
  w.box(rx, y, rz, 13, 0.9, 5, IRON, { ry: RY, col: false });
  w.col.addBox(V3(rx, y + 1, rz), V3(6.5, 1.1, 2.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, RY * DEG, 0)));
  for (const v of [-3, 3]) { const [tx, tz] = P(-11.5, v); w.cyl(tx, y, tz, 2.3, 3.4, STEEL, { mat: "paint" }); w.cyl(tx, y + 3.4, tz, 2.4, 0.3, DRED, NC); }
  void mx; void mz;
  w.pool(x, y + 0.05, z, 17, EMB, 0.42);
  for (const [u, v] of [[9.5, -8.5], [-9.5, -8.5]]) { const [lx, lz] = P(u, v); post(w, lx, y, lz, 5, EMB, 7); }
  return [x, y + F + 2, z, y + F + 2 + (H - F) * 0.7, i];
}
function rigs(w, K, ctx) {
  const [cx, cz] = RIG_C, y = height(cx, cz);
  // 순환로: 다진 흙길 + 붉은 표시못
  const N = RIG_ROAD.length;
  for (let i = 0; i < N; i++) {
    const a = RIG_ROAD[i], b = RIG_ROAD[(i + 1) % N], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = yawOf(b[0] - a[0], b[1] - a[1]);
    w.box((a[0] + b[0]) / 2, y + 0.06, (a[1] + b[1]) / 2, L + 1.2, 0.06, 8, 0x3c3230, { ...FLATM, ry });
    w.box((a[0] + b[0]) / 2, y + 0.13, (a[1] + b[1]) / 2, L * 0.45, 0.04, 0.3, HAZ, { ...FLATM, ry });
    const k = Math.hypot(a[0] - cx, a[1] - cz);
    if (i % 2 === 0) w.box(cx + (a[0] - cx) * (1 + 4.9 / k), y, cz + (a[1] - cz) * (1 + 4.9 / k), 0.4, 0.7, 0.4, RED, GL);
  }
  // 시추탑 다섯: 탑 속을 오르내리는 이동 블록과 돌아가는 시추관
  const lifts = DERRICKS.map(([x, z, H], i) => derrick(w, K, x, z, H, i));
  const blocks = instanced(w, [[BOXG, M(0, 0, 0, 2, 2.6, 2), HAZ], [BOXG, M(0, -2, 0, 0.7, 1.6, 0.7), GUN], [BOXG, M(0, 1.7, 0, 1.2, 0.8, 1.2), BLK2]], lifts.length);
  const pipes = instanced(w, [[CYLG, M(0, 0.5, 0, 0.32, 1, 0.32), ASH], [BOXG, M(0, 0.3, 0, 1.3, 0.5, 1.3), DRED], [BOXG, M(0, 0.7, 0, 0.9, 0.24, 1.5), HAZ]], lifts.length);
  w.updaters.push((dt, t) => {
    lifts.forEach(([x, y0, z, y1, i], k) => {
      const u = 0.5 - 0.5 * Math.cos(t * 0.5 + i * 1.7), yb = y0 + (y1 - y0) * u;
      _m.compose(_p.set(x, yb + 3, z), _q.identity(), _s.set(1, 1, 1)); blocks.setMatrixAt(k, _m);
      _e.set(0, t * 3 + i, 0); _m.compose(_p.set(x, y0 - 2, z), _q.setFromEuler(_e), _s.set(1, yb - y0 + 3, 1)); pipes.setMatrixAt(k, _m);
    });
    blocks.instanceMatrix.needsUpdate = true; pipes.instanceMatrix.needsUpdate = true;
  });
  // 가운데 분기 집합소(매니폴드)와 둘레의 펌프잭 여섯
  octa(w, cx, y, cz, 5.5, 3.2, BLK2, { mat: "std:panel" }); octa(w, cx, y + 3.2, cz, 5.8, 0.4, RED, GL); octa(w, cx, y + 3.6, cz, 3, 1.6, IRON, NC);
  w.pool(cx, y + 0.05, cz, 16, RED, 0.4);
  const jacks = [];
  for (let k = 0; k < 6; k++) {
    const a = k * 60 * DEG + 0.5, jx = cx + Math.cos(a) * 15, jz = cz + Math.sin(a) * 15, ry = -a / DEG, P = local(jx, jz, ry);
    w.box(jx, y, jz, 7.5, 0.5, 2.4, IRON, { ry });
    for (const v of [-0.9, 0.9]) { const [ax, az] = P(-1.4, v), [bx, bz] = P(0.2, v * 0.3), [ex, ez] = P(1.6, v); beam(w, [ax, y + 0.5, az], [bx, y + 4.6, bz], 0.34, STEEL, NC); beam(w, [ex, y + 0.5, ez], [bx, y + 4.6, bz], 0.34, STEEL, NC); }
    const [wx, wz] = P(3.6, 0), [gx, gz] = P(-3, 0);
    w.cyl(wx, y, wz, 0.5, 1.6, DRED, NC); w.box(wx, y + 1.6, wz, 0.9, 0.3, 0.9, RED, GL);
    w.box(gx, y + 0.5, gz, 1.8, 1.7, 1.6, BLK2, { ry, col: false });
    w.col.addSphere(V3(jx, y + 2.6, jz), 2.6);
    w.pipe(wx, y + 0.5, wz, cx + Math.cos(a) * 5.4, y + 0.5, cz + Math.sin(a) * 5.4, 0.28, RUST, NC);
    jacks.push([P(0.2, 0), ry * DEG, k]);
  }
  const jm = instanced(w, [[BOXG, M(0, 0, 0, 7.4, 0.55, 0.55), HAZ], [BOXG, M(3.9, -0.8, 0, 1, 2.6, 0.7), BLK2], [BOXG, M(-3.3, -0.5, 0, 1.5, 1.5, 1), DRED]], jacks.length);
  w.updaters.push((dt, t) => { jacks.forEach(([p, ry, k], i) => { _e.set(0, ry, Math.sin(t * 1.5 + k * 1.1) * 0.3, "YXZ"); _m.compose(_p.set(p[0], y + 4.9, p[1]), _q.setFromEuler(_e), _s.set(1, 1, 1)); jm.setMatrixAt(i, _m); }); jm.instanceMatrix.needsUpdate = true; });
  // 시추탑 → 집합소 배관(바닥을 긴다)
  for (const [x, z] of DERRICKS) { const d = Math.hypot(x - cx, z - cz); w.pipe(x + (cx - x) * 8 / d, y + 0.45, z + (cz - z) * 8 / d, x + (cx - x) * (d - 21) / d, y + 0.45, z + (cz - z) * (d - 21) / d, 0.4, 0x4a2c24, NC); }
  // 플레어 스택: 가는 굴뚝 + 받침 격자 + 꼭대기 불꽃과 연기
  for (const [x, z, H] of FLARES) {
    const fy = height(x, z);
    w.box(x, fy, z, 4, 1, 4, IRON, { mat: "paint" });
    w.pipe(x, fy + 1, z, x, fy + H, z, 0.7, BLK2);
    for (const k of [0.3, 0.55, 0.8]) w.cyl(x, fy + H * k, z, 1.0, 0.5, k === 0.55 ? DRED : GUN, NC);
    for (let k = 0; k < 3; k++) { const a = k * 120 * DEG + 0.4; beam(w, [x + Math.cos(a) * 7, fy, z + Math.sin(a) * 7], [x, fy + H * 0.62, z], 0.2, GUN, NC); }
    w.cyl(x, fy + H, z, 1.3, 1.6, IRON, { rt: 0.9, col: false });
    K.flames.push([x, fy + H + 1.4, z, 2.3]);
    K.smoke.push([x + 1.5, fy + H + 7, z, 2.6, 64, 13, 0x3a2a26]);
    w.pool(x, fy + 0.05, z, 24, ORG, 0.5);
  }
  // 집합소 → 탱크 단지로 가는 배관 다리(순환로 위를 넘는다 — 밑으로 트럭이 지난다)
  const pa = [cx - 7, cz - 6], pb = [TANKS.x1 - 2, TANKS.z1 - 6], pd = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), ux = (pb[0] - pa[0]) / pd, uz = (pb[1] - pa[1]) / pd, pry = yawOf(ux, uz);
  for (const v of [-0.8, 0.8]) w.pipe(pa[0] - uz * v, y + 12, pa[1] + ux * v, pb[0] - uz * v, y + 12, pb[1] + ux * v, 0.45, v > 0 ? 0x4a2c24 : GUN, NC);
  w.col.addCapsule(V3(pa[0], y + 12, pa[1]), V3(pb[0], y + 12, pb[1]), 1.2);
  for (let s = 0; s <= pd; s += pd / 5) {
    const px = pa[0] + ux * s, pz = pa[1] + uz * s;
    if (ctx.roadD(px, pz) < 6.5) continue;
    for (const v of [-2.2, 2.2]) w.box(px - uz * v, y, pz + ux * v, 0.5, 11.4, 0.5, STEEL, { ry: pry, col: false });
    w.box(px, y + 11.1, pz, 0.5, 0.4, 5, STEEL, { ry: pry, col: false });
  }
  for (const e of [pa, pb]) w.pipe(e[0], y + 0.4, e[1], e[0], y + 12, e[1], 0.5, GUN, NC);
  w.gap("배관 다리 밑", (pa[0] + pb[0]) / 2, y + 5.5, (pa[1] + pb[1]) / 2, pry, 14, 9, 400);
}

// ── 연료 탱크 단지 ──
function tankFarm(w, K, ctx) {
  const { x0, x1, z0, z1 } = TANKS, y = height((x0 + x1) / 2, (z0 + z1) / 2);
  const spots = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) spots.push([x0 + 8 + i * 13, z0 + 8 + j * 15, 6 + ((i + j) % 2) * 0.6, 9 + ((i * 2 + j) % 3) * 1.6]);
  let n = 0;
  for (const [x, z, r, h] of spots) {
    if (!ctx.free(x, z, r + 1, y + h + 3)) continue;
    const ty = height(x, z) - 0.3;
    fuelTank(w, K, x, ty, z, r, h, n % 3 === 1 ? 0x3a1c1e : IRON); ctx.taken.push([x, z, r + 1.5]); n++;
    w.pool(x, ty + 0.4, z, r + 5, RED, 0.25);
  }
  for (const [x, z] of [[x0 - 3, z0 + 24], [x1 + 5, z0 + 2]]) if (ctx.free(x, z, 5, y + 12)) { gasSphere(w, K, x, height(x, z), z, 4.2); ctx.taken.push([x, z, 5.5]); }
  // 방유제(낮은 둑)와 배관 받침
  for (const [ax, az, bx, bz] of [[x0 - 1, z0 - 1, x1 + 1, z0 - 1], [x0 - 1, z1 + 1, x1 - 14, z1 + 1], [x0 - 1, z0 - 1, x0 - 1, z1 + 1]]) {
    const L = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (ctx.free(mx, mz, 1, y + 2)) w.box(mx, y - 0.3, mz, bx === ax ? 0.8 : L, 1.5, bx === ax ? L : 0.8, 0x4a4442, { mat: "std:concrete" });
  }
  w.pipe(x0 + 4, y + 2.2, (z0 + z1) / 2, x1 - 2, y + 2.2, (z0 + z1) / 2, 0.4, 0x4a2c24, NC);
  for (let x = x0 + 6; x < x1; x += 7.5) w.box(x, y, (z0 + z1) / 2, 0.4, 2, 1.6, STEEL, NC);
}

// ── 감시 뷰트: 기울며 도는 접시 안테나 ──
function dishParts(R) {
  const pts = [];
  for (let i = 8; i >= 0; i--) { const r = i / 8; pts.push(new THREE.Vector2(r * R, r * r * R * 0.3)); }
  for (let i = 0; i <= 8; i++) { const r = i / 8; pts.push(new THREE.Vector2(r * R * 0.985, r * r * R * 0.3 - R * 0.04)); }
  const bowl = new THREE.LatheGeometry(pts, 20), parts = [[bowl, null, ASH]];
  const f = R * 0.66;
  for (let k = 0; k < 3; k++) { const a = k * 120 * DEG, g = new THREE.CylinderGeometry(R * 0.012 + 0.08, R * 0.012 + 0.08, 1, 5), A = V3(Math.cos(a) * R * 0.9, R * 0.25, Math.sin(a) * R * 0.9), B = V3(0, f, 0), d = B.clone().sub(A); parts.push([g, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()), V3(1, d.length(), 1)), GUN]); }
  parts.push([BOXG, M(0, f, 0, R * 0.14, R * 0.2, R * 0.14), BLK2]);
  parts.push([BOXG, M(0, -R * 0.1, 0, R * 0.5, R * 0.22, R * 0.5), BLK2]);
  for (let k = 0; k < 4; k++) parts.push([BOXG, M(0, R * 0.06, 0, R * 1.7, R * 0.05, R * 0.06, 0, k * 45, 0), STEEL]);
  return parts;
}
function dishes(w, K, ctx) {
  const [bx, bz, , , top] = DISH_BUTTE, items = [];
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.35, 0.3) }), tg = new THREE.TorusGeometry(1, 0.012, 5, 36); tg.rotateX(Math.PI / 2);
  w.disposables.push(glowM, tg);
  DISHES.forEach(([x, z, R, ph], i) => {
    const y = height(x, z);
    octa(w, x, y, z, R * 0.42 + 1.4, 1.6, IRON, { mat: "std:panel" });
    octa(w, x, y + 1.6, z, R * 0.42 + 1.6, 0.3, RED, GL);
    w.cyl(x, y + 1.6, z, R * 0.2 + 0.6, ph - 1.6, BLK2, { mat: "paint", rt: R * 0.13 + 0.5 });
    w.cyl(x, y + ph - 0.6, z, R * 0.24 + 0.9, 1.2, STEEL, NC);
    for (let k = 0; k < 4; k++) { const a = k * 90 * DEG + 0.78; beam(w, [x + Math.cos(a) * (R * 0.42 + 1), y + 1.6, z + Math.sin(a) * (R * 0.42 + 1)], [x + Math.cos(a) * (R * 0.16 + 0.5), y + ph * 0.72, z + Math.sin(a) * (R * 0.16 + 0.5)], 0.3, GUN, NC); }
    w.pool(x, y + 0.05, z, R + 5, RED, 0.36);
    const piv = new THREE.Group(), tilt = new THREE.Group(), g = merged(dishParts(R)), me = new THREE.Mesh(g, mat(w, "paint"));
    me.castShadow = true; me.position.y = R * 0.2;
    const rim = new THREE.Mesh(tg, glowM); rim.scale.setScalar(R); rim.position.y = R * 0.5 + 0.06;
    const tip = new THREE.Mesh(BOXG, glowM); tip.scale.set(R * 0.1, R * 0.07, R * 0.1); tip.position.y = R * 0.86 + R * 0.12;
    tilt.add(me, rim, tip); piv.add(tilt); piv.position.set(x, y + ph + R * 0.3, z); w.scene.add(piv); w.disposables.push(g);
    w.col.addSphere(V3(x, y + ph + R * 0.45, z), R * 0.72);
    ctx.taken.push([x, z, R + 2]);
    items.push([piv, tilt, i]);
    K.blink.add(x + R * 0.42 + 1.6, y + 2.3, z, RED, 0.3, i);
  });
  w.updaters.push((dt, t) => { for (const [piv, tilt, i] of items) { piv.rotation.y = i * 1.9 + t * (i % 2 ? -0.07 : 0.05) + Math.sin(t * 0.13 + i) * 0.5; tilt.rotation.x = 0.62 + 0.3 * Math.sin(t * 0.17 + i * 2.2); } });
  // 관제 벙커 · 수신 철탑 · 전력선 · 꼭대기 둘레 경고등
  const cx = bx + 6, cz = bz + 4;
  if (ctx.free(cx, cz, 8, top + 8)) {
    w.box(cx, top - 0.3, cz, 13, 5.3, 9, BLK, { mat: "std:panel", tile: 4, ry: 20 });
    w.box(cx, top + 3.2, cz, 13.2, 0.7, 9.2, RED, { ...GL, ry: 20 });
    w.box(cx, top + 5, cz, 6, 1.6, 5, IRON, { ry: 20, col: false });
    ctx.taken.push([cx, cz, 9]);
  }
  for (const [mx, mz, h] of [[bx + 24, bz + 2, 22], [bx - 4, bz + 26, 16], [bx + 10, bz - 28, 18]]) if (ctx.free(mx, mz, 3, top + h)) { mast(w, K, mx, height(mx, mz), mz, h); ctx.taken.push([mx, mz, 3]); }
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + 0.2, px = bx + Math.cos(a) * 33.5, pz = bz + Math.sin(a) * 33.5; post(w, px, height(px, pz), pz, 1.8, RED, 0); }
  // 뷰트 남쪽 벼랑의 승강기 탑(북쪽 메사 윗면 → 꼭대기)
  const ex = bx - 14, ez = bz + 42;
  if (ctx.free(ex, ez, 5, top + 8)) {
    const ey = height(ex, ez + 6) - 1;
    w.box(ex, ey, ez, 6, top + 6 - ey, 6, BLK2, PANEL);
    for (const sx of [-1, 1]) w.box(ex + sx * 3.06, ey + 3, ez, 0.1, top - ey - 2, 0.5, RED, GL);
    w.box(ex, top + 6, ez, 7, 0.6, 7, RED, GL); w.box(ex, top + 6.6, ez, 4, 2, 4, IRON, NC);
    slab(w, ex - 2, ex + 2, top - 0.2, top + 0.4, ez - 16, ez - 3, IRON, PANEL);
    K.blink.add(ex, top + 9.2, ez, RED, 0.45, 1);
  }
}

// ── 절벽 착륙장: 벼랑 턱을 깎은 팔각 갑판 + 절벽 속으로 난 문 + 세워 둔 수송정 ──
function pads(w, K, ctx) {
  PADS.forEach(([x, z, , , y], i) => {
    octa(w, x, y - 0.5, z, 10.5, 0.7, IRON, { mat: "std:panel", col: false });
    ring(w, x, y + 0.26, z, 8, 0.17, RED, { pitch: 90, mat: "glow", col: false, seg: 36 });
    ring(w, x, y + 0.26, z, 3, 0.12, HAZ, { pitch: 90, col: false, seg: 20 });
    for (const a of [0, 90]) w.box(x, y + 0.22, z, 9, 0.05, 0.7, HAZ, { ...FLATM, ry: a + 45 });
    for (let k = 0; k < 8; k++) { const a = k * 45 * DEG + 0.39; K.blink.add(x + Math.cos(a) * 10.2, y + 0.6, z + Math.sin(a) * 10.2, RED, 0.3, k); }
    w.pool(x, y + 0.3, z, 14, RED, 0.34);
    // 절벽 문: 검은 문틀과 붉게 빛나는 속
    const dz = z - 15.5;
    for (const sx of [-1, 1]) w.box(x + sx * 7.6, y - 1, dz, 3, 12, 6, BLK, PANEL);
    w.box(x, y + 8.2, dz, 18.2, 3.6, 6, BLK, PANEL);
    w.box(x, y, dz - 1.6, 12.4, 8.3, 0.6, 0x2a0b0d, {});
    for (const v of [-4, -1.4, 1.4, 4]) w.box(x + v, y + 0.3, dz - 1.2, 0.24, 7.6, 0.1, RED, GL);
    w.box(x, y + 8.5, dz + 3.06, 10, 0.5, 0.1, ORG, GL);
    for (const sx of [-1, 1]) K.blink.add(x + sx * 7.6, y + 11.5, dz + 2, RED, 0.4, sx > 0 ? 0 : 1);
    w.pool(x, y + 0.3, dz + 5, 9, ORG, 0.45);
    // 세워 둔 수송정 · 관제 초소 · 연료 수레 · 상자 · 벼랑 끝 난간등
    shuttle(w, x + 9.5, y, z - 5.5, i ? 200 : 160, 0.95);
    w.box(x - 12, y, z - 7, 4.4, 4.6, 4.4, BLK2, { mat: "std:panel", tile: 3 });
    w.box(x - 12, y + 2.8, z - 7, 4.5, 0.8, 4.5, ORG, GL);
    mast(w, K, x - 12, y + 4.6, z - 7, 7, { group: i });
    w.cyl(x - 11, y, z + 2.5, 1.3, 2.2, DRED, { mat: "paint", col: false }); w.box(x - 8.6, y, z + 3.4, 1.6, 1.4, 1.6, STEEL, { mat: "std:corrug", tile: 2, col: false });
    for (let k = 0; k < 7; k++) { const a = (20 + k * 23.3) * DEG, px = x + Math.cos(a) * 13.6, pz = z + Math.sin(a) * 13.6; post(w, px, height(px, pz), pz, 1.4, RED, 0); }
    ctx.taken.push([x, z, 17]);
  });
}

// ── 삭도: 두 정거장과 처진 케이블 두 줄, 오가는 곤돌라 넷 ──
function ropeway(w, K, ctx) {
  const { s, n, ys, yn } = ROPE, SAG = 7;
  const station = (x, z, top, dir) => {
    const y = height(x, z);
    w.box(x, y, z, 9, 5.5, 8, BLK, { mat: "std:panel", tile: 4 });
    w.box(x, y + 3.6, z, 9.2, 0.8, 8.2, RED, GL);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.box(x + sx * 3.6, y + 5.5, z + sz * 3, 0.8, top - y - 5.5, 0.8, STEEL, { mat: "paint" });
    for (const sx of [-1, 1]) { beam(w, [x + sx * 3.6, y + 5.5, z - 3], [x + sx * 3.6, top, z + 3], 0.3, GUN, NC); beam(w, [x + sx * 3.6, top, z - 3], [x + sx * 3.6, y + 5.5, z + 3], 0.3, GUN, NC); }
    w.box(x, top, z, 10, 0.8, 9, IRON, { mat: "std:panel", tile: 4 });
    ring(w, x, top - 0.7, z + dir * 1.5, 2.2, 0.3, HAZ, { pitch: 90, col: false, seg: 20 });
    w.box(x, top + 0.8, z - dir * 2, 5, 2.4, 4, BLK2, NC); w.box(x, top + 2, z - dir * 2, 5.1, 0.5, 4.1, ORG, GL);
    w.box(x, top - 1.4, z + dir * 5.5, 8, 0.4, 3, IRON, NC);
    K.blink.add(x, top + 3.8, z - dir * 2, RED, 0.45, dir > 0 ? 0 : 1);
    w.pool(x, y + 0.05, z, 13, RED, 0.36);
    ctx.taken.push([x, z, 9]);
  };
  station(s[0], s[1], ys, -1); station(n[0], n[1], yn, 1);
  const pt = (u, off) => [s[0] + (n[0] - s[0]) * u + off, ys + (yn - ys) * u - SAG * 4 * u * (1 - u) - 0.9, s[1] + (n[1] - s[1]) * u];
  for (const off of [-2.2, 2.2]) for (let k = 0; k < 14; k++) { const a = pt(k / 14, off), b = pt((k + 1) / 14, off); w.pipe(a[0], a[1], a[2], b[0], b[1], b[2], 0.12, 0x15171b, NC); }
  const N = 4, L = Math.hypot(n[0] - s[0], n[1] - s[1]);
  const cab = instanced(w, [[BOXG, M(0, -4.2, 0, 2.6, 2.6, 3.8), BLK2], [BOXG, M(0, -2.9, 0, 3, 0.25, 4.2), IRON], [BOXG, M(0, -5.6, 0, 2.2, 0.3, 3.4), IRON], [BOXG, M(0, -1.5, 0, 0.22, 2.9, 0.22), GUN], [BOXG, M(0, 0, 0, 0.5, 0.5, 1.6), STEEL]], N);
  const lit = instanced(w, [[BOXG, M(0, -4.0, 0, 2.66, 0.7, 3.86), RED], [BOXG, M(0, -5.75, 0, 1, 0.1, 1), ORG]], N, "glow");
  w.updaters.push((dt, t) => {
    for (let k = 0; k < N; k++) {
      const q = ((t * 5) / (L * 2) + k / N) % 1, out = q < 0.5, u = out ? q * 2 : 2 - q * 2, p = pt(u, out ? 2.2 : -2.2);
      _e.set(Math.sin(t * 1.1 + k) * 0.05, 0, 0); _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e), _s.set(1, 1, 1));
      cab.setMatrixAt(k, _m); lit.setMatrixAt(k, _m);
    }
    cab.instanceMatrix.needsUpdate = true; lit.instanceMatrix.needsUpdate = true;
  });
  w.gap("삭도 케이블 밑", s[0], 40, (s[1] + n[1]) / 2, 0, 60, 36, 300);
}

// ── 협곡 바닥 보급로와 검문소: 양옆 감시탑 · 들어 올린 차단봉 · 붉은 감지선 · 장벽 ──
export const CHECKPOINTS = [-214, -26, 26, 198];
function road(w, K, ctx) {
  ROAD.forEach(([x, z], i) => {
    if (i % 2) for (const o of [-5.3, 5.3]) { const p = canyonPoint(x, o); w.box(p[0], height(p[0], p[1]), p[1], 0.36, 0.5, 0.36, RED, GL); }
    if (i % 5 === 2) { const p = canyonPoint(x, i % 2 ? 7.2 : -7.2); if (ctx.free(p[0], p[1], 1, 6)) post(w, p[0], height(p[0], p[1]), p[1], 4.6, ORG, 9); }
  });
  CHECKPOINTS.forEach((x, i) => {
    const c = canyonPoint(x, 0), ry = canyonYaw(x), P = local(c[0], c[1], ry), outer = i === 0 || i === 3, hw = canyonHW(x);
    w.box(c[0], 0.1, c[1], 0.36, 0.06, 12.6, RED, { ...GL, ry, ao: false });
    for (const sv of [-1, 1]) {
      const [tx, tz] = P(0, sv * 8.8), ty = height(tx, tz) - 0.4;
      w.box(tx, ty, tz, 4.6, 13.4, 4.6, BLK, { mat: "std:panel", tile: 4, ry });
      w.box(tx, ty + 10.4, tz, 4.8, 1, 4.8, RED, { ...GL, ry });
      w.box(tx, ty + 13.4, tz, 5.4, 0.6, 5.4, IRON, { ry, col: false }); w.box(tx, ty + 14, tz, 2.4, 1.6, 2.4, BLK2, { ry, col: false });
      K.blink.add(tx, ty + 16.2, tz, RED, 0.45, sv > 0 ? i : i + 1);
      // 들어 올린 차단봉(열려 있다)과 붉은 끝등
      const [ax, az] = P(0, sv * 6.3), [bx, bz] = P(0, sv * 4.6);
      beam(w, [ax, 3.2, az], [bx, 12.6, bz], 0.36, HAZ, NC); ball(w, bx, 12.9, bz, 0.34, RED);
      w.pool(tx, 0.1, tz, 11, RED, 0.4);
      // 장벽: 탑에서 협곡 벽까지(바깥 두 검문소) 또는 짧은 날개벽(안쪽 둘)
      const L = outer ? hw + 5 - 11.1 : 6.5, [wx, wz] = P(0, sv * (11.1 + L / 2));
      w.box(wx, height(wx, wz) - 0.6, wz, 2, outer ? 8.6 : 5.6, L, BLK2, { mat: "std:panel", tile: 4, ry });
      w.box(wx, height(wx, wz) + (outer ? 6.6 : 3.8), wz, 2.1, 0.4, L, RED, { ...GL, ry });
      // 콘크리트 블록과 강철 고슴도치
      for (const su of [-1, 1]) { const [qx, qz] = P(su * 6.5, sv * 7.6); w.box(qx, 0, qz, 3.2, 1.2, 0.9, 0x5a5350, { mat: "std:concrete", ry }); const [hx, hz] = P(su * 11, sv * (9.5 + i)); hedgehog(w, hx, height(hx, hz), hz, 0.9, i * 31); }
      ctx.taken.push([tx, tz, 6]);
    }
    // 초소(남쪽)와 포탑
    const [gx, gz] = P(outer ? (i ? -9 : 9) : 9, 15.5), gy = height(gx, gz) - 0.3;
    w.box(gx, gy, gz, 7, 4.2, 5.4, BLK2, { mat: "std:panel", tile: 3, ry });
    w.box(gx, gy + 2.6, gz, 7.1, 0.6, 5.5, ORG, { ...GL, ry });
    turret(w, K, gx, gy + 4.2, gz, ry + (i < 2 ? 180 : 0), 0.62);
    ctx.taken.push([gx, gz, 6]);
  });
}

// ── 연합 고원: 전진 기지 둘레(가운데 반경 37 m 는 임무용으로 비운다) ──
function allied(w, K, ctx) {
  const [bx, bz] = COMBAT.blue, H = (x, z) => height(x, z);
  // 고원의 흙길: 보급 창고 → 전진 기지 → 정문 다리 남쪽 끝
  const R = [[-160, 184], [-112, 174], [-74, 152], [-40, 116], [-14, 76], [0, 38]];
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 9), ry = yawOf(b[0] - a[0], b[1] - a[1]);
    for (let k = 0; k < n; k++) { const x = a[0] + (b[0] - a[0]) * (k + 0.5) / n, z = a[1] + (b[1] - a[1]) * (k + 0.5) / n; w.box(x, H(x, z) + 0.04, z, L / n + 0.3, 0.07, 5.6, 0x96684a, { ...FLATM, ry }); }
  }
  // 기지 터 표시: 다진 바닥의 팔각 테두리와 둘레 표시등(가운데는 임무용으로 비어 있다)
  for (let k = 0; k < 8; k++) {
    const a = k * 45 * DEG, x = bx + Math.cos(a) * 31, z = bz + Math.sin(a) * 31;
    w.box(x, H(x, z) + 0.05, z, 0.7, 0.07, 25.6, 0xd8c8a8, { ...FLATM, ry: -a / DEG });
    const px = bx + Math.cos(a + 0.39) * 39, pz = bz + Math.sin(a + 0.39) * 39; post(w, px, H(px, pz), pz, 1.6, SKY, 6);
  }
  for (const a of [0, 90]) w.box(bx, H(bx, bz) + 0.05, bz, 0.6, 0.07, 18, 0xd8c8a8, { ...FLATM, ry: a + 45 });
  // 북쪽(요새 쪽)을 막는 흙자루 방벽 — 군데군데 트여 있다
  for (let k = 0; k < 30; k++) {
    const a = (200 + k * 4.7) * DEG, x = bx + Math.cos(a) * 44, z = bz + Math.sin(a) * 44;
    if (k % 7 === 5 || !ctx.free(x, z, 1.5, H(x, z) + 3)) continue;
    w.box(x, H(x, z) - 0.2, z, 3.5, 2 + (k % 2) * 0.5, 1.6, k % 3 ? 0xb89468 : 0xa8845c, { mat: "std:concrete", tile: 2, ry: -a / DEG + 90 });
  }
  // 남쪽: 지휘 모듈 · 막사 천막 · 통신 철탑 · 탐지 접시
  const put = (x, z, r, top, fn) => { if (ctx.free(x, z, r, H(x, z) + top)) { fn(x, H(x, z), z); ctx.taken.push([x, z, r]); } };
  put(bx + 8, bz + 52, 9, 8, (x, y, z) => {
    w.box(x, y - 0.2, z, 15, 4.4, 6.5, WH, { mat: "std:panel", tile: 4, ry: 8 }); w.box(x, y + 1.7, z, 15.1, 0.9, 6.6, NAVY, { ry: 8, col: false }); w.box(x, y + 2.9, z, 15.15, 0.4, 6.65, SKY, { ...GL, ry: 8 });
    w.box(x - 3, y + 4.2, z, 5, 1.4, 4, WH2, { ry: 8, col: false }); dome(w, x + 4, y + 4.2, z, 2, WH, { col: false });
    w.pool(x, y + 0.05, z - 5, 10, SKY, 0.34);
  });
  for (const [dx, dz, ry] of [[-18, 50, -12], [-34, 44, -28], [30, 46, 24]]) put(bx + dx, bz + dz, 6.5, 5, (x, y, z) => {
    const P = local(x, z, ry);
    w.box(x, y - 0.2, z, 9, 2.2, 5.4, OLIVE, { ry }); w.box(x, y + 2, z, 9, 1.5, 3.4, 0x666c52, { ry, col: false }); w.box(x, y + 3.5, z, 9, 0.7, 1.3, 0x70765a, { ry, col: false });
    const [lx, lz] = P(5.6, 0); post(w, lx, y, lz, 2.6, SKY, 5);
  });
  put(bx + 46, bz + 26, 4, 26, (x, y, z) => mast(w, K, x, y, z, 24, { color: WH2, base: WH, light: SKY }));
  put(bx - 50, bz + 22, 6, 12, (x, y, z) => {
    w.cyl(x, y, z, 1.6, 6, WH2, { mat: "paint" }); w.box(x, y + 6, z, 3.4, 1.4, 2.4, NAVY, NC);
    w.sph(x, y + 9.4, z, 3.6, WH, { mat: "paint", sy: 0.5 }); w.box(x, y + 9.4, z, 0.5, 2.6, 0.5, SKY, GL); K.blink.add(x, y + 12.3, z, SKY, 0.4, 1);
  });
  // 서쪽: 연합 강하정 둘이 선 착륙 표시
  for (const [dx, dz, ry] of [[-58, -8, 20], [-62, 34, -15]]) put(bx + dx, bz + dz, 9, 6, (x, y, z) => {
    w.box(x, y + 0.04, z, 15, 0.08, 15, 0x8c8478, { ...FLATM, ry });
    ring(w, x, y + 0.14, z, 6.4, 0.14, SKY, { pitch: 90, mat: "glow", col: false, seg: 28 });
    shuttle(w, x, y + 0.1, z, ry + 90, 0.9, { color: WH, color2: NAVY, glow: SKY, engine: SKY });
    w.pool(x, y + 0.1, z, 11, SKY, 0.3);
  });
  // 보급 상자 더미(보급 창고 둘레와 기지 남쪽)
  const [sx, sz] = SUPPLY.depot;
  for (const [x, z, ry] of [[sx + 17, sz + 4, 10], [sx - 16, sz - 8, 80], [sx + 6, sz + 18, -20], [bx + 24, bz + 60, 30], [bx - 6, bz + 62, 100]]) put(x, z, 5, 6, (px, y, pz) => {
    w.container(px, y, pz, ry, NAVY, 7); w.container(px + 0.4, y + 2.6, pz + 0.3, ry + 6, 0xc9ced8, 7);
    w.box(px + 4.6, y, pz + 3.4, 1.8, 1.5, 1.8, OLIVE, { mat: "std:corrug", tile: 2, ry: ry + 30 });
  });
}

// ── 포대 메사(타격 임무 진지)와 요새 뒤 적 본부 터 ──
function gunMesa(w, K, ctx) {
  const [cx, cz] = STRIKE.core, y = height(cx, cz);
  const put = (x, z, r, top, fn) => { if (ctx.free(x, z, r, height(x, z) + top)) { fn(x, height(x, z), z); ctx.taken.push([x, z, r]); return true; } return false; };
  // 진지 둘레 방벽(팔각, 군데군데 트임)과 모서리 등
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + 0.2, x = cx + Math.cos(a) * 56, z = cz + Math.sin(a) * 56;
    if (k % 4 === 1 || Math.abs(x) > 221 || Math.abs(z) > 221) continue;
    put(x, z, 2, 5, (px, py, pz) => { w.box(px, py - 0.5, pz, 19, 4.4, 1.8, BLK2, { mat: "std:panel", tile: 4, ry: -a / DEG + 90 }); w.box(px, py + 2.6, pz, 19.1, 0.4, 1.9, RED, { ...GL, ry: -a / DEG + 90 }); });
  }
  // 벙커 넷 · 탄약 더미 · 탐지 철탑 · 탐조등 탑
  for (let k = 0; k < 4; k++) {
    const a = k * 90 * DEG + 0.95, x = cx + Math.cos(a) * 27, z = cz + Math.sin(a) * 27, ry = -a / DEG;
    put(x, z, 7, 6, (px, py, pz) => {
      w.box(px, py - 0.3, pz, 9, 4.3, 11, BLK, { mat: "std:panel", tile: 4, ry }); w.box(px, py + 2.3, pz, 9.1, 0.7, 11.1, RED, { ...GL, ry });
      w.box(px, py + 4, pz, 5, 1.2, 6, IRON, { ry, col: false }); K.blink.add(px, py + 5.8, pz, RED, 0.36, k);
    });
  }
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4 + 0.3, r = 14 + (k % 4) * 9, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    put(x, z, 3, 3, (px, py, pz) => { w.box(px, py, pz, 2.6, 1.6 + (k % 3) * 0.6, 3.8, k % 2 ? DRED : STEEL, { mat: "std:corrug", tile: 2, ry: k * 37 }); if (k % 3 === 0) w.box(px + 2.6, py, pz + 1, 1.4, 1.2, 1.4, HAZ, { ry: k * 20, col: false }); });
  }
  put(cx + 34, cz + 34, 4, 30, (x, py, z) => mast(w, K, x, py, z, 28));
  for (const [x, z, ph] of [[cx + 42, cz - 30, 1.2], [cx - 30, cz + 50, 4.0]]) put(x, z, 6, 30, (px, py, pz) => {
    w.box(px, py - 0.5, pz, 6, 24.5, 6, BLK, { mat: "std:panel", tile: 6 }); w.box(px, py + 19, pz, 6.2, 1.1, 6.2, RED, GL); w.box(px, py + 24, pz, 7.2, 0.7, 7.2, IRON, NC);
    K.blink.add(px, py + 26.6, pz, RED, 0.45, 0); K.lights.push([px, py + 25.6, pz, ph, 0.14, 50, 120]);
  });
  for (let k = 0; k < 10; k++) { const a = k * 0.63 + 0.1, x = cx + Math.cos(a) * 66, z = cz + Math.sin(a) * 66; if (Math.abs(x) < 222 && Math.abs(z) < 222 && ctx.free(x, z, 2, height(x, z) + 3)) hedgehog(w, x, height(x, z), z, 1, k * 40); }
  w.pool(cx, y + 0.05, cz, 30, RED, 0.12);

  // 적 본부 터(요새 뒤): 안뜰 북벽에서 이어지는 포장 터, 둘레 기둥과 방벽
  const [rx, rz] = COMBAT.red, ry0 = height(rx, rz);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.26, x = rx + Math.cos(a) * 45, z = rz + Math.sin(a) * 45;
    if (z > COURT.z0 - 12 || z < -222) continue;
    put(x, z, 2.5, 14, (px, py, pz) => {
      w.box(px, py - 0.4, pz, 3, 12, 3, BLK, { mat: "std:panel", tile: 4, ry: -a / DEG }); w.box(px, py + 9, pz, 3.2, 0.8, 3.2, RED, { ...GL, ry: -a / DEG });
      K.blink.add(px, py + 12.4, pz, RED, 0.4, k);
    });
  }
  for (const sx of [-1, 1]) { w.box(rx + sx * 20, ry0 + 0.05, rz + 22, 0.5, 0.06, 26, RED, { ...GL, ao: false }); w.box(rx + sx * 52, ry0 - 0.4, rz + 8, 1.8, 4, 40, BLK2, { mat: "std:panel", tile: 4 }); w.box(rx + sx * 52, ry0 + 2.4, rz + 8, 1.9, 0.4, 40, RED, GL); }
  w.pool(rx, ry0 + 0.05, rz, 30, RED, 0.12);
}

// ── 바위: 메사 위의 후두, 협곡 벽 밑의 낙석, 곁협곡의 암석 아치 ──
function rocks(w, K, ctx) {
  const r = w.rand, COL = [0xc9703f, 0xe0a070, 0xb85a36];
  let n = 0;
  for (let t = 0; t < 400 && n < 28; t++) {
    const x = (r() * 2 - 1) * 222, z = (r() * 2 - 1) * 222, y = height(x, z), h = 7 + r() * 11, rad = 1.5 + r() * 1.6;
    if (y < 20 || y > 60 || Math.abs(height(x + 6, z) - y) + Math.abs(height(x, z + 6) - y) > 1.5) continue;
    if (!ctx.free(x, z, rad + 3, y + h + 4)) continue;
    hoodoo(w, x, z, h, rad, [COL[n % 3], COL[(n + 1) % 3], 0xf0c79a]); ctx.taken.push([x, z, rad + 4]); n++;
  }
  // 협곡 벽 밑 낙석
  for (let x = -224; x <= 224; x += 9) {
    for (const sd of [-1, 1]) {
      if (r() < 0.35) continue;
      const o = sd * (canyonHW(x) - 1 + r() * 5), p = canyonPoint(x + r() * 6, o), s = 1.4 + r() * 2.6;
      if (p[1] < -40 && p[1] > -100 && Math.abs(p[0]) < 86) continue;
      if (!ctx.free(p[0], p[1], s + 1, height(p[0], p[1]) + s * 2)) continue;
      boulder(w, p[0], height(p[0], p[1]) + s * 0.25, p[1], s * (1 + r() * 0.5), s * 0.8, s, COL[(x & 255) % 3], { ry: r() * 180 });
    }
  }
}

export function zones(w, K, ctx) {
  rigs(w, K, ctx); tankFarm(w, K, ctx); dishes(w, K, ctx);
  pads(w, K, ctx); ropeway(w, K, ctx); road(w, K, ctx);
  allied(w, K, ctx); gunMesa(w, K, ctx); rocks(w, K, ctx);
}
