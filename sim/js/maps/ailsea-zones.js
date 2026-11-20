// 빛 바다의 구역: 리바이어던 갈비 굴(남동 바다)·등불 나루(남)·등대 암초(남동)·뼈 여울(동)
// 진주 여울(남서)·산호 탑 숲(서)·빈 합창 가시 둥지(북, 적 진지)·물기둥 여울(북동, 적 본부)·둑길 꾸밈
import * as THREE from "../../vendor/three.module.min.js";
import { M, tube, bead, lump, V3, DEG, ring, lumpG, capG, shard, curveTube, conch, sunkDome, coralTower, lantern, anemone, urchin, barnacles, coralBush, scallopG, padG, starfish, seashell,
  NACRE, NACRE2, INDIGO, INDIGO2, DEEP, AQUA, BLUE, BLUE2, ROSE, ROSE2, CORAL, AMBER, VOID, VOID2, BLOOD, ASH, ALLY, ALLY2, ALLYO, BONE, BONE2, ROOT, ROOT2,
  WY, ISL, CHOIR, LEVI, LV, leviH, CAUSE, CAUSE_W, cwAt, causeDist, PEARLS, LILY, KELP, SHALLOW, GEYSERS, height, islandOf } from "./ailsea-kit.js";

const gy = (x, z) => Math.max(WY, height(x, z));

// ── 리바이어던: 얕은 물에 누운 두개골, 합창당 쪽으로 굽은 목, 50~60 m 높이의 등뼈와 갈비뼈 여덟 쌍이 만든 굴, 바다로 잠기는 꼬리 ──
export function leviathan(w, K, ctx) {
  const r = w.rand, { N, W, len, u, v } = LEVI;
  const yawAcross = Math.atan2(-v[1], v[0]) / DEG;
  // 등뼈
  const spine = [];
  for (let s = -8; s <= len + 8; s += 4) { const [x, z] = LV(s); spine.push([x, leviH(s / len), z]); }
  curveTube(w, spine, 2.6, 2.2, BONE, { col: true, color2: BONE2, seg: 9 });
  spine.forEach((p, i) => {
    if (i % 2) return;
    lump(w, p[0], p[1] + 0.4, p[2], 3.6, 2.6, 3.6, BONE2, { mat: "paint" });
    shard(w, p[0], p[1] + 2, p[2], 0.9, 5 + (i % 4) * 1.2, 0, 0, BONE, { mat: "paint", col: false });
    bead(w, p[0], p[1] - 2.6, p[2], 0.6, i % 4 ? AQUA : ROSE);
  });
  // 갈비뼈: 등뼈에서 양옆으로 내려와 물밑에 박힌다. 발이 둑길에 걸리면 그 쪽은 짧게 끊는다
  for (let k = 0; k < N; k++) {
    const s = 6 + (k * (len - 12)) / (N - 1), H = leviH(s / len) - 1, sc = 1 - Math.abs(k - (N - 1) / 2) / N * 0.35;
    for (const side of [-1, 1]) {
      const pts = [], Wk = W * (0.92 + sc * 0.16);
      let cut = 0.58 * Math.PI;
      { const [fx, fz] = LV(s + 4, side * Wk); if (causeDist(fx, fz) < CAUSE_W + 4) cut = 0.34 * Math.PI; }
      for (let i = 0; i <= 10; i++) {
        const th = (i / 10) * cut, off = side * Wk * Math.sin(th) * (1 + 0.08 * Math.sin(th * 2)), [x, z] = LV(s + Math.sin(th) * 4, off);
        pts.push([x, H * Math.cos(th) + (i / 10) * 0.5, z]);
      }
      curveTube(w, pts, 1.7 * sc + 0.3, 0.9, k % 2 ? BONE : BONE2, { col: true, seg: 7 });
      // 갈비뼈에 붙은 빛 따개비와 늘어진 빛 해초
      for (let i = 3; i <= 9; i += 2) { const p = pts[i]; bead(w, p[0], p[1] + 0.6, p[2], 0.5 + r() * 0.4, (i + k) % 3 ? AQUA : ROSE); }
      if (cut > 1.5) {
        const p = pts[10]; barnacles(w, p[0], WY, p[2], 1.4, r, 6);
        w.pool(p[0], WY + 0.1, p[2], 7, AQUA, 0.35);
      }
      const hp = pts[4];
      for (let j = 0; j < 3; j++) { const L = 4 + r() * 7; tube(w, hp[0], hp[1], hp[2], hp[0] + (r() - 0.5), hp[1] - L, hp[2] + (r() - 0.5), 0.09, j ? BLUE2 : AQUA, { mat: "glow", seg: 3 }); bead(w, hp[0], hp[1] - L - 0.4, hp[2], 0.35, ROSE); }
    }
  }
  // 굴 안 바닥의 빛 웅덩이와 등뼈에서 내리는 빛 줄기
  for (let s = 8; s < len; s += 18) { const [x, z] = LV(s); w.pool(x, WY + 0.1, z, 16, s % 36 ? AQUA : BLUE, 0.3); w.shaft(x, leviH(s / len) - 3, z, 2, 9, leviH(s / len) - 4, BLUE2, 0.06); }
  for (const s of [len * 0.22, len * 0.55, len * 0.86]) { const [x, z] = LV(s); w.gap("리바이어던 갈비 굴", x, 16, z, yawAcross, W * 1.3, 26, 260); }
  // 목: 등뼈 머리 쪽에서 두개골로 굽어 내려온다
  const [ax, az] = LV(-8), [sx, sz] = LEVI.skull, neck = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; neck.push([ax + (sx + u[0] * 10 - ax) * t, leviH(0) * (1 - t * t * t) + 4 * t, az + (sz + u[1] * 10 - az) * t]); }
  curveTube(w, neck, 2.3, 1.8, BONE2, { col: true, color2: BONE, seg: 8, knob: BONE });
  // 두개골: 얕은 물에 옆으로 누운 긴 머리뼈. 빈 눈구멍에 빛이 고였다
  {
    const yaw = Math.atan2(-u[0], -u[1]) / DEG + 180, c = Math.cos(yaw * DEG), s = Math.sin(yaw * DEG);
    const P = (f, l, y) => [sx + s * f + c * l, y, sz + c * f - s * l];   // f: 주둥이 쪽(−u) 거리, l: 옆
    const fwd = (k) => [sx - u[0] * k, sz - u[1] * k];
    w.mesh(lumpG(), M(sx, 2.2, sz, 8, 5.2, 11, 0, yaw, 0), BONE, "paint"); w.col.addSphere(V3(sx, 2.2, sz), 5);
    for (let k = 6; k <= 20; k += 4.5) { const [x, z] = fwd(k); w.mesh(lumpG(), M(x, 1.4 - k * 0.04, z, 5.4 - k * 0.15, 2.6, 5.8, 0, yaw + k * 3, 0), k % 2 ? BONE2 : BONE, "paint"); }
    for (const l of [-1, 1]) {
      const [ex, ez] = [sx - u[0] * 3 + v[0] * l * 5.4, sz - u[1] * 3 + v[1] * l * 5.4];
      w.sph(ex, 3.6, ez, 2.2, 0x2a1a3a, { col: false, mat: "paint" }); bead(w, ex, 3.6, ez, 1.3, l < 0 ? AQUA : ROSE); w.pool(ex, WY + 0.1, ez, 7, l < 0 ? AQUA : ROSE, 0.4);
      // 아래턱: 물속에서 솟은 긴 뼈 둘
      const j0 = [sx + v[0] * l * 6, sz + v[1] * l * 6], j1 = [sx - u[0] * 24 + v[0] * l * 3, sz - u[1] * 24 + v[1] * l * 3];
      tube(w, j0[0], 0.2, j0[1], j1[0], 1.2, j1[1], 1.1, BONE2, { col: true });
      for (let t = 0.2; t < 0.95; t += 0.16) { const x = j0[0] + (j1[0] - j0[0]) * t, z = j0[1] + (j1[1] - j0[1]) * t; shard(w, x, 1.4, z, 0.5, 2.6 + r() * 1.8, (r() - 0.5) * 20, r() * 360, BONE, { mat: "paint", col: false }); }
    }
    // 뿔 볏
    for (let k = 0; k < 5; k++) { const [x, z] = fwd(-2 + k * 2.5); shard(w, x, 6.6 - k * 0.5, z, 0.9, 6 - k * 0.7, -30, yaw, BONE2, { mat: "paint", col: false }); }
    void P;
    K.blink.add(sx, 9, sz, AQUA, 0.4, 0);
  }
  // 꼬리: 등뼈 끝에서 바다로 잠긴다
  const [bx, bz] = LV(len + 8), [tx, tz] = LEVI.tail, tail = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; tail.push([bx + (tx - bx) * t + v[0] * Math.sin(t * 3) * 6, leviH(1) * Math.pow(1 - t, 1.3) - 2 * t, bz + (tz - bz) * t + v[1] * Math.sin(t * 3) * 6]); }
  curveTube(w, tail, 2.2, 0.9, BONE, { col: true, color2: BONE2, seg: 8, knob: BONE2 });
  ctx.taken.push([...LV(len / 2), 0]);
  for (let s = -10; s <= len + 10; s += 12) for (const side of [-1, 1]) ctx.taken.push([...LV(s, side * W), 7]);
  ctx.taken.push([sx, sz, 14], [tx, tz, 8]);
}

// ── 등불 나루(남쪽 섬): 연합 전진 캠프(흰 컨테이너·주황 표지·안테나), 에일의 뼈 부두와 등불 문, 물가의 부교 ──
export function landing(w, K, ctx) {
  const I = ISL.landing, y = I.top, r = w.rand;
  // 연합 캠프(섬 동쪽)
  const camp = [[30, 168, 0], [36, 176, 90], [28, 158, 8]];
  for (const [x, z, ry] of camp) {
    if (!ctx.free(x, z, 3)) continue;
    w.box(x, y - 0.2, z, 6.2, 2.7, 2.5, ALLY, { mat: "panel", ry });
    w.box(x, y + 2.5, z, 6.3, 0.18, 2.6, ALLY2, { mat: "metal", ry, col: false });
    w.box(x + Math.cos(ry * DEG) * 3.12, y + 0.8, z - Math.sin(ry * DEG) * 3.12, 0.08, 1.2, 1.6, ALLYO, { mat: "paint", ry, col: false });
    ctx.taken.push([x, z, 4]);
  }
  if (ctx.free(-30, 160, 2)) {
    const x = -30, z = 160;
    w.cyl(x, y, z, 0.35, 18, ALLY2, { mat: "metal" });
    for (let k = 1; k < 4; k++) w.box(x, y + k * 4.2, z, 2.6 - k * 0.4, 0.14, 0.14, ALLY2, { mat: "metal", col: false });
    w.sph(x, y + 18.4, z, 0.55, ALLYO, { mat: "glow", col: false });
    K.blink.add(x, y + 19, z, 0xff4030, 0.4, 1);
    ctx.taken.push([x, z, 3]);
  }
  // 착륙장 표식(스폰 둘레의 빛 원)
  ring(w, 0, y + 0.05, 166, 9, 0.12, ALLYO, { pitch: 90, col: false, mat: "glow", seg: 40 });
  w.pool(0, y + 0.1, 166, 12, 0xffe0c0, 0.25);
  // 등불 문: 참배 둑길 들머리를 걸친 뼈 아치 둘(트럭이 지나간다)
  for (const t of [0.12, 0.62]) {
    const C = CAUSE.find((c) => c.from === "landing" && c.to === "choir"), p = cwAt(C, t), px = -p.uz, pz = p.ux, cy = gy(p.x, p.z);
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI, off = Math.cos(a) * (CAUSE_W + 5); pts.push([p.x + px * off, cy - 0.5 + Math.pow(Math.sin(a), 0.45) * 18, p.z + pz * off]); }
    curveTube(w, pts, 0.9, 0.9, i0(t) ? BONE : BONE2, { col: true, glow: AQUA, seg: 7 });
    bead(w, p.x, cy + 18.6, p.z, 0.9, ROSE);
    for (const sd of [-1, 1]) { const x = p.x + px * sd * (CAUSE_W + 5), z = p.z + pz * sd * (CAUSE_W + 5); lump(w, x, cy, z, 1.8, 1.2, 1.8, INDIGO2); w.pool(x, cy, z, 6, AQUA, 0.4); }
    // 아치에 매단 빛 꼬투리
    for (let i = 2; i <= 10; i += 2) { const q = pts[i]; tube(w, q[0], q[1], q[2], q[0], q[1] - 2, q[2], 0.05, ROOT2, { seg: 3 }); bead(w, q[0], q[1] - 2.4, q[2], 0.45, i % 4 ? AQUA : AMBER); }
    w.gap("등불 문 아래", p.x, cy + 8, p.z, Math.atan2(-pz, px) / DEG, CAUSE_W * 2 + 2, 14, 160);
  }
  // 뼈 부두: 남쪽·남서쪽 물가에서 바다로 뻗는 갈비뼈 잔교와 부교
  for (const [deg, L] of [[60, 26], [118, 24], [150, 20]]) {
    const a = deg * DEG, x0 = I.x + Math.cos(a) * (I.R - 6), z0 = I.z + Math.sin(a) * (I.R - 6), x1 = I.x + Math.cos(a) * (I.R + L), z1 = I.z + Math.sin(a) * (I.R + L);
    if (Math.abs(z1) > 226 || Math.abs(x1) > 226) continue;
    if (!ctx.free((x0 + x1) / 2, (z0 + z1) / 2, 2, true)) continue;
    const ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux;
    for (let k = 0; k <= L + 6; k += 3) {
      const x = x0 + ux * k, z = z0 + uz * k;
      w.box(x, 1.1, z, 4.2, 0.35, 2.4, k % 6 ? 0x6a5a8a : 0x7a6a9a, { mat: "paint", ry: -deg + 90, col: false });
      if (k % 6 === 0) for (const sd of [-1, 1]) { tube(w, x + px * sd * 2.2, -2, z + pz * sd * 2.2, x + px * sd * 2.4, 2.8, z + pz * sd * 2.4, 0.3, BONE2, { seg: 5 }); }
      if (k % 9 === 0 && k > 0) lantern(w, K, x + px * 2.6, 1.4, z + pz * 2.6, 4.2, deg + 90, k % 18 ? AQUA : AMBER, { col: false });
    }
    w.col.addBox(V3((x0 + x1) / 2, 1.25, (z0 + z1) / 2), V3(2.1, 0.2, (L + 6) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (-deg + 90) * DEG, 0)));
    // 끝에 매인 에일 쪽배(조개 껍데기 배)
    const ex = x1 + px * 4.5, ez = z1 + pz * 4.5;
    w.mesh(scallopG(), M(ex, 0.25, ez, 2.6, 1.1, 5.2, 180, -deg + 90, 0), NACRE2, "paint");
    bead(w, ex, 1.4, ez, 0.4, AQUA);
    ctx.taken.push([x1, z1, 5]);
  }
  // 섬 위 작은 소라 집과 연잎 화분
  for (let i = 0, k = 0; i < 80 && k < 6; i++) {
    const a = r() * 6.28, d = 12 + r() * (I.R - 18), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 5)) continue;
    conch(w, K, x, y, z, 7 + r() * 7, 2.2 + r() * 1.2, { light: k % 2 ? AQUA : AMBER, tilt: r() * 8, az: r() * 360 });
    ctx.taken.push([x, z, 5]); k++;
  }
}
const i0 = (t) => t < 0.5;

// ── 등대 암초: 나루 동쪽 바다 기둥 위의 소라 등대. 꼭대기 빛 꼬투리가 돌며 바다를 쓸어 간다 ──
export function islet(w, K, ctx) {
  const I = ISL.islet, r = w.rand;
  const x = 150, z = 182, H = 44;
  lump(w, x, -1, z, 9, 6, 9, INDIGO, { col: true });
  lump(w, x + 5, -2, z - 4, 6, 4, 6, INDIGO2, { col: true });
  w.cyl(x, 0, z, 5.5, 5, 0x3a3a7a, { mat: "paint", rt: 4.6 });
  conch(w, K, x, 5, z, H, 4.6, { light: AMBER, light2: AQUA, color: NACRE, turns: 4 });
  ring(w, x, 5 + H * 0.66, z, 4.4, 0.3, AQUA, { pitch: 90, col: false, mat: "glow" });
  const beamG = new THREE.ConeGeometry(4.5, 70, 18, 1, true); beamG.rotateZ(Math.PI / 2); beamG.translate(35, 0, 0);
  const bm = new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Group(), b1 = new THREE.Mesh(beamG, bm), b2 = new THREE.Mesh(beamG, bm);
  b2.rotation.y = Math.PI; beam.add(b1, b2); beam.position.set(x, 5 + H * 0.9, z); beam.frustumCulled = false; b1.frustumCulled = b2.frustumCulled = false;
  w.scene.add(beam); w.disposables.push(beamG, bm);
  bead(w, x, 5 + H * 0.9, z, 1.6, AMBER);
  w.updaters.push((dt, t) => { beam.rotation.y = t * 0.6; });
  w.pool(x, WY + 0.1, z, 18, AMBER, 0.3);
  ctx.taken.push([x, z, 12]);
  // 암초 섬 둘레의 바위·산호
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28, d = I.R + 3 + r() * 10, px = I.x + Math.cos(a) * d, pz = I.z + Math.sin(a) * d;
    if (!ctx.free(px, pz, 3)) continue;
    lump(w, px, height(px, pz) + 0.6, pz, 2 + r() * 2.5, 1.2 + r(), 2 + r() * 2.5, r() < 0.5 ? INDIGO2 : 0x4a3a8a);
    if (r() < 0.6) coralBush(w, px, Math.max(0, height(px, pz)) + 1, pz, 0.8 + r() * 0.5, r);
  }
}

// ── 뼈 여울(동쪽 섬): 모래에 박힌 거대 척추뼈·부러진 갈비·이빨 가시, 빛 해초가 감긴 아래턱 아치 ──
export function boneShoal(w, K, ctx) {
  const I = ISL.bone, y = I.top, r = w.rand;
  // 아래턱 아치(섬 남동쪽, 아래로 날 수 있다)
  {
    const a = 40 * DEG, cx = I.x + Math.cos(a) * 16, cz = I.z + Math.sin(a) * 16;
    if (ctx.free(cx, cz, 6)) {
      const ux = Math.cos(a + Math.PI / 2), uz = Math.sin(a + Math.PI / 2), pts = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12, ang = t * Math.PI; pts.push([cx + ux * Math.cos(ang) * 13, y - 0.6 + Math.sin(ang) * 18 * (1 - 0.25 * Math.sin(ang * 2)), cz + uz * Math.cos(ang) * 13]); }
      curveTube(w, pts, 1.6, 1.2, BONE, { col: true, color2: BONE2, seg: 8 });
      for (let i = 1; i < 12; i++) { const p = pts[i]; shard(w, p[0], p[1] - 1.2, p[2], 0.5, 2.4, 180, 0, BONE2, { mat: "paint", col: false }); }
      for (let i = 2; i < 11; i += 2) { const p = pts[i]; tube(w, p[0], p[1] - 1, p[2], p[0], p[1] - 4 - r() * 3, p[2], 0.08, AQUA, { mat: "glow", seg: 3 }); }
      w.gap("아래턱 아치", cx, y + 7, cz, Math.atan2(-uz, ux) / DEG, 22, 13, 200);
      ctx.taken.push([cx + ux * 13, cz + uz * 13, 4], [cx - ux * 13, cz - uz * 13, 4]);
    }
  }
  // 척추뼈 덩이와 기운 갈비 조각
  for (let i = 0, k = 0; i < 160 && k < 14; i++) {
    const a = r() * 6.28, d = 8 + r() * (I.R + 6), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 4)) continue;
    const g0 = gy(x, z);
    if (k % 3 === 0) {
      const s = 2.4 + r() * 2;
      w.mesh(lumpG(), M(x, g0 + s * 0.5, z, s * 1.5, s, s * 1.5, r() * 30, r() * 360, 0), BONE2, "paint"); w.col.addSphere(V3(x, g0 + s * 0.5, z), s * 0.9);
      for (let j = 0; j < 3; j++) shard(w, x, g0 + s * 0.9, z, s * 0.3, s * 1.6, (j - 1) * 40, a / DEG, BONE, { mat: "paint", col: false });
    } else {
      const L = 8 + r() * 10, b = r() * 6.28, lean = 0.4 + r() * 0.4;
      const pts = [[x, g0 - 1, z], [x + Math.cos(b) * L * 0.3 * lean, g0 + L * 0.5, z + Math.sin(b) * L * 0.3 * lean], [x + Math.cos(b) * L * 0.8 * lean, g0 + L * 0.8, z + Math.sin(b) * L * 0.8 * lean]];
      curveTube(w, pts, 0.7, 0.4, k % 2 ? BONE : BONE2, { col: true, seg: 6 });
      bead(w, pts[2][0], pts[2][1], pts[2][2], 0.45, k % 2 ? AQUA : ROSE);
    }
    if (r() < 0.5) w.pool(x, g0 + 0.05, z, 5, AQUA, 0.3);
    ctx.taken.push([x, z, 4]); k++;
  }
}

// ── 진주 여울(남서 섬 + 바다): 반쯤 벌어진 거대 조개 속 빛 진주, 진주 양식 부표 줄, 아군 본부 둘레의 노래 기둥 ──
export function pearlFarm(w, K, ctx) {
  const I = ISL.pearl, y = I.top, r = w.rand;
  // 거대 조개: 섬 가장자리 얕은 물과 바다 구역에
  const clams = [];
  for (let i = 0; i < 400 && clams.length < 9; i++) {
    const inSea = clams.length < 6, a = r() * 6.28, d = inSea ? r() * PEARLS[2] : I.R * (0.84 + r() * 0.22);
    const x = (inSea ? PEARLS[0] : I.x) + Math.cos(a) * d, z = (inSea ? PEARLS[1] : I.z) + Math.sin(a) * d, s = 3.2 + r() * 2.6;
    if (!ctx.free(x, z, s + 2) || clams.some((c) => Math.hypot(c[0] - x, c[1] - z) < c[2] + s + 4)) continue;
    clams.push([x, z, s]);
    const g0 = Math.max(-0.6, height(x, z)), ry = r() * 360;
    w.mesh(scallopG(), M(x, g0 + 0.2, z, s * 1.2, s * 0.7, s * 1.4, 180, ry, 0), NACRE2, "paint");
    w.mesh(scallopG(), M(x, g0 + 0.5, z, s * 1.2, s * 0.8, s * 1.4, 180 + 38 + r() * 20, ry, 0), NACRE, "paint");
    w.col.addSphere(V3(x, g0 + s * 0.3, z), s * 0.7);
    const px = x + Math.sin(ry * DEG) * s * 0.7, pz = z + Math.cos(ry * DEG) * s * 0.7;
    bead(w, px, g0 + 1 + s * 0.15, pz, s * 0.3, clams.length % 3 ? 0xf4f0ff : ROSE);
    w.pool(px, WY + 0.1, pz, s * 3, clams.length % 2 ? AQUA : ROSE, 0.4);
    if (clams.length % 3 === 0) K.blink.add(px, g0 + 2.4 + s * 0.3, pz, 0xffffff, 0.3, clams.length & 1);
  }
  // 양식 부표 줄: 물 위에 떠 있는 빛 부표를 늘어진 줄로 잇는다(낮아서 부딪히지 않는다)
  for (let row = 0; row < 4; row++) {
    const a = (row * 0.5 + 0.3), ux = Math.cos(a), uz = Math.sin(a), cx = PEARLS[0] + Math.cos(row * 1.7) * 10, cz = PEARLS[1] + Math.sin(row * 1.7) * 10;
    let prev = null;
    for (let k = -4; k <= 4; k++) {
      const x = cx + ux * k * 5, z = cz + uz * k * 5;
      if (height(x, z) > -0.3 || !ctx.free(x, z, 0, true)) { prev = null; continue; }
      w.sph(x, 0.15, z, 0.55, k % 2 ? AQUA : 0xf0e8ff, { mat: "glow", col: false });
      if (prev) tube(w, prev[0], 0.2, prev[1], x, 0.2, z, 0.05, ROOT2, { seg: 3 });
      prev = [x, z];
    }
  }
  // 아군 본부 둘레(36 m 밖)의 노래 기둥과 진주 받침
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28 + 0.2, d = 40 + (i % 2) * 6, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 3) || islandOf(x, z, 2) !== I) continue;
    if (i % 2) lantern(w, K, x, y, z, 6.5, a / DEG + 180, i % 4 === 1 ? AQUA : ROSE, { blink: true });
    else { conch(w, K, x, y, z, 12 + r() * 6, 2.4, { light: BLUE2, tilt: 4, az: a / DEG }); ctx.taken.push([x, z, 4]); }
  }
}

// ── 산호 탑 숲(서쪽 섬 + 얕은 여울 + 해초 숲): 30~50 m 산호 탑, 접시 산호 선반, 산호 덤불·말미잘 ──
export function reefForest(w, K, ctx) {
  const r = w.rand, I = ISL.coral;
  const PAL = [[0xe85aa8, 0xc0408e, 0xff86c4], [0x5a6aff, 0x4048c8, 0x8a9aff], [0xff8a6a, 0xd0604a, 0xffb08a], [0x3ad8c0, 0x2a9a9a, 0x8affee]];
  const TIP = [ROSE, AQUA, AMBER, BLUE2];
  const spots = [];
  const place = (cx, cz, R, n, hMin, hMax) => {
    for (let i = 0, k = 0; i < 260 && k < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, H = hMin + r() * (hMax - hMin), rad = 1.2 + H * 0.035;
      if (!ctx.free(x, z, rad * 2.6 + 2) || spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < s[2] + rad * 2.6 + 3)) continue;
      const pi = (k + spots.length) % 4;
      coralTower(w, K, x, gy(x, z), z, H, rad, r, { colors: PAL[pi], tip: TIP[pi], depth: H > 30 ? 3 : 2 });
      w.pool(x, gy(x, z) + 0.05, z, rad * 6, TIP[pi], 0.3);
      spots.push([x, z, rad * 2.6]); ctx.taken.push([x, z, rad * 2.6 + 1]); k++;
    }
  };
  place(I.x, I.z, I.R * 0.95, 12, 22, 48);
  place(SHALLOW[0], SHALLOW[1], SHALLOW[2], 5, 14, 30);
  place(KELP[0], KELP[1], KELP[2], 4, 16, 34);
  // 해초 숲: 물 위로 솟아 흔들리는 긴 빛 해초(정적 줄기 + 끝 빛)
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * KELP[2], x = KELP[0] + Math.cos(a) * d, z = KELP[1] + Math.sin(a) * d;
    if (height(x, z) > -0.4 || !ctx.free(x, z, 1, true)) continue;
    const H = 2 + r() * 5, b = r() * 6.28, bx = x + Math.cos(b) * H * 0.3, bz = z + Math.sin(b) * H * 0.3;
    tube(w, x, height(x, z), z, bx, H * 0.6, bz, 0.12, i % 3 ? 0x2a9a8a : 0x4a5ab0, { seg: 3 });
    tube(w, bx, H * 0.6, bz, bx + Math.cos(b) * 0.6, H, bz + Math.sin(b) * 0.6, 0.09, i % 3 ? AQUA : BLUE2, { mat: "glow", seg: 3 });
  }
  // 덤불·말미잘·성게
  for (const [cx, cz, R, n] of [[I.x, I.z, I.R, 40], [SHALLOW[0], SHALLOW[1], SHALLOW[2] + 8, 16]]) for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!ctx.free(x, z, 1.2, true)) continue;
    const g0 = gy(x, z), q = r();
    if (q < 0.45) coralBush(w, x, g0, z, 0.7 + r() * 0.8, r);
    else if (q < 0.75) anemone(w, x, g0, z, 0.8 + r() * 0.6, r);
    else urchin(w, x, g0, z, 0.6 + r() * 0.5, r);
  }
}

// ── 빈 합창 가시 둥지(북쪽 섬, 적 진지): 노래를 잃은 '빈 합창'의 검은 가시 숲과 핏빛 결정, 가시 아치 ──
export function nest(w, K, ctx) {
  const I = ISL.nest, y = I.top, r = w.rand;
  // 바깥 둘레의 거대 가시(안으로 휘었다)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.28 + 0.1, d = I.R * (0.86 + r() * 0.18), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 4)) continue;
    const H = 16 + r() * 18, g0 = gy(x, z), lean = 0.35 + r() * 0.2, pts = [];
    for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([x - Math.cos(a) * H * lean * t * t, g0 - 1 + H * t, z - Math.sin(a) * H * lean * t * t]); }
    curveTube(w, pts, 1.8, 0.35, i % 2 ? VOID : VOID2, { col: true, seg: 6 });
    const tp = pts[5]; shard(w, tp[0], tp[1], tp[2], 0.5, 3.2, 0, 0, BLOOD, { mat: "glow", col: false });
    for (let k = 1; k < 5; k++) { const p = pts[k]; shard(w, p[0], p[1], p[2], 0.3, 2.4, 60 + r() * 40, a / DEG + r() * 120, VOID2, { mat: "paint", col: false }); }
    w.pool(x, g0 + 0.05, z, 6, BLOOD, 0.3);
    ctx.taken.push([x, z, 4]);
  }
  // 가시 아치 둘(둑길이 섬에 드는 자리 근처, 아래로 날 수 있다)
  for (const deg of [150, 20]) {
    const a = deg * DEG, cx = I.x + Math.cos(a) * I.R * 0.5, cz = I.z + Math.sin(a) * I.R * 0.5, ux = Math.cos(a + Math.PI / 2), uz = Math.sin(a + Math.PI / 2);
    if (!ctx.free(cx + ux * 11, cz + uz * 11, 2) || !ctx.free(cx - ux * 11, cz - uz * 11, 2)) continue;
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, ang = t * Math.PI; pts.push([cx + ux * Math.cos(ang) * 11, y - 0.5 + Math.sin(ang) * 16 + Math.sin(ang * 3) * 1.5, cz + uz * Math.cos(ang) * 11]); }
    curveTube(w, pts, 1.3, 1.3, VOID2, { col: true, glow: BLOOD, seg: 6 });
    for (let i = 1; i < 10; i++) { const p = pts[i]; shard(w, p[0], p[1] + 0.8, p[2], 0.35, 2.6, (i - 5) * 14, a / DEG, VOID, { mat: "paint", col: false }); }
    w.gap("가시 아치", cx, y + 6, cz, Math.atan2(-uz, ux) / DEG, 18, 11, 200);
    ctx.taken.push([cx + ux * 11, cz + uz * 11, 3], [cx - ux * 11, cz - uz * 11, 3]);
  }
  // 핏빛 결정 무더기와 검은 껍질 혹
  for (let i = 0, k = 0; i < 200 && k < 16; i++) {
    const a = r() * 6.28, d = 20 + r() * (I.R - 18), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 3)) continue;
    const g0 = gy(x, z);
    lump(w, x, g0 + 0.3, z, 2.4 + r() * 1.5, 1.4, 2.4 + r() * 1.5, VOID2, { col: true });
    for (let j = 0; j < 3; j++) shard(w, x + (r() - 0.5) * 2, g0 + 0.6, z + (r() - 0.5) * 2, 0.5 + r() * 0.4, 3 + r() * 4, (r() - 0.5) * 50, r() * 360, j ? 0x8a1a3a : BLOOD, { mat: j ? "paint" : "glow", col: false });
    w.pool(x, g0 + 0.05, z, 5, BLOOD, 0.35);
    if (k % 4 === 0) K.blink.add(x, g0 + 5, z, BLOOD, 0.3, k & 1);
    ctx.taken.push([x, z, 3.5]); k++;
  }
  // 둥지 한가운데(지휘소 둘레)의 검은 고리 둘 — 바닥 빛만(지휘소 자리는 비운다)
  ring(w, I.x, y + 0.08, I.z, 21, 0.25, BLOOD, { pitch: 90, col: false, mat: "glow", seg: 48 });
  ring(w, I.x, y + 0.08, I.z, 30, 0.18, 0x8a1a3a, { pitch: 90, col: false, mat: "glow", seg: 56 });
  w.pool(I.x, y + 0.1, I.z, 26, BLOOD, 0.18);
}

// ── 물기둥 여울(북동 섬 + 바다): 바다 밑 숨구멍에서 주기적으로 치솟는 빛 물기둥, 섬 위 김 서린 분화구 ──
export function geysers(w, K, ctx) {
  const r = w.rand, I = ISL.geyser, list = [];
  const add = (x, z, s, ph) => {
    const g0 = height(x, z);
    w.mesh(lumpG(), M(x, Math.max(g0, -1.2) + 0.2, z, s * 2.6, s * 0.9, s * 2.6, 0, r() * 360, 0), 0x3a4a8a, "paint");
    ring(w, x, Math.max(WY, g0) + 0.35, z, s * 1.6, 0.16, AQUA, { pitch: 90, col: false, mat: "glow", seg: 24 });
    w.pool(x, Math.max(WY, g0) + 0.1, z, s * 5, AQUA, 0.4);
    list.push({ x, z, s, ph, y0: Math.max(WY, g0) });
  };
  // 바다 구역의 숨구멍(코스 선 바로 밑은 피한다)
  for (let i = 0, k = 0; i < 120 && k < 6; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * GEYSERS[2], x = GEYSERS[0] + Math.cos(a) * d, z = GEYSERS[1] + Math.sin(a) * d;
    if (!ctx.free(x, z, 3) || list.some((g) => Math.hypot(g.x - x, g.z - z) < 9)) continue;
    add(x, z, 1.4 + r() * 0.8, k * 1.9); k++;
  }
  // 섬 둘레(적 본부 36 m 밖)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 6.28, d = I.R * 0.86, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 3) || Math.abs(z) > 222) continue;
    add(x, z, 1.1 + r() * 0.5, i * 1.3 + 0.5);
  }
  // 물기둥: 원뿔 하나를 키웠다 줄였다(충돌 없음)
  const g = new THREE.CylinderGeometry(0.35, 1, 1, 12, 4, true); g.translate(0, 0.5, 0);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8afff0).multiplyScalar(1.3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const im = new THREE.InstancedMesh(g, mat, list.length * 2);
  im.frustumCulled = false; w.scene.add(im); w.disposables.push(g, mat);
  const m = new THREE.Matrix4();
  const tick = (dt, t) => {
    list.forEach((q, i) => {
      const c = ((t + q.ph) % 9) / 9, h = c < 0.28 ? Math.sin((c / 0.28) * Math.PI) : 0, H = 3 + h * (14 + q.s * 10);
      m.makeScale(q.s * (1.1 + h * 0.5), H, q.s * (1.1 + h * 0.5)); m.setPosition(q.x, q.y0, q.z); im.setMatrixAt(i * 2, m);
      m.makeScale(q.s * 2.6 * (0.6 + h), 0.6 + h * 2.4, q.s * 2.6 * (0.6 + h)); m.setPosition(q.x, q.y0 - 0.2, q.z); im.setMatrixAt(i * 2 + 1, m);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  tick(0, 0); w.updaters.push(tick);
  // 섬 위 낮은 껍질 둔덕과 수정
  for (let i = 0, k = 0; i < 120 && k < 8; i++) {
    const a = r() * 6.28, d = 38 + r() * (I.R - 38), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (!ctx.free(x, z, 4) || Math.abs(z) > 220) continue;
    sunkDome(w, K, x, gy(x, z) - 2.2, z, 4 + r() * 2.5, { tilt: r() * 18, light: AQUA, mast: 0.4 });
    ctx.taken.push([x, z, 6]); k++;
  }
}

// ── 둑길 꾸밈: 마루 양옆의 굵은 뿌리 난간(낮다), 줄지은 등불, 둑길 허리의 뼈 아치(트럭이 지나간다) ──
export function causewayDecor(w, K, ctx) {
  const r = w.rand;
  CAUSE.forEach((C, ci) => {
    const n = C.pts.length - 1;
    let L = 0;
    for (let i = 0; i < n; i++) L += Math.hypot(C.pts[i + 1][0] - C.pts[i][0], C.pts[i + 1][1] - C.pts[i][1]);
    const steps = Math.floor(L / 6);
    for (const sd of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= steps; k++) {
        const p = cwAt(C, k / steps), x = p.x - p.uz * sd * (CAUSE_W + 0.6), z = p.z + p.ux * sd * (CAUSE_W + 0.6);
        if (islandOf(x, z, 2) || Math.hypot(x - CHOIR.x, z - CHOIR.z) < CHOIR.Ro - 2) { if (pts.length > 1) curveTube(w, pts.splice(0), 0.55, 0.55, ROOT2, { col: false, seg: 5, glow: sd > 0 ? AQUA : BLUE2 }); pts.length = 0; continue; }
        pts.push([x, height(x, z) + 0.35, z]);
        if (k % 4 === 2 && (k / 4 + ci + (sd > 0 ? 1 : 0)) % 2 < 1) lantern(w, K, x, height(x, z), z, 4.8, Math.atan2(-p.ux * sd, p.uz * sd) / DEG, (k + ci) % 3 ? AQUA : ROSE, { blink: k % 8 === 2, col: false });
      }
      if (pts.length > 1) curveTube(w, pts, 0.55, 0.55, ROOT2, { col: false, seg: 5, glow: sd > 0 ? AQUA : BLUE2 });
    }
    // 허리 아치(긴 둑길만)
    if (L < 60 || C.to === "choir" && C.from === "landing") return;
    for (const t of [0.5]) {
      const p = cwAt(C, t), px = -p.uz, pz = p.ux, cy = height(p.x, p.z);
      const pts = [];
      for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI, off = Math.cos(a) * (CAUSE_W + 4); pts.push([p.x + px * off, cy - 0.5 + Math.pow(Math.sin(a), 0.45) * 14, p.z + pz * off]); }
      curveTube(w, pts, 0.85, 0.85, ci % 2 ? BONE : BONE2, { col: true, seg: 7, glow: ci % 2 ? AQUA : ROSE });
      bead(w, p.x, cy + 14.4, p.z, 0.7, ci % 2 ? ROSE : AQUA);
      w.gap("둑길 뼈 아치", p.x, cy + 6, p.z, Math.atan2(-pz, px) / DEG, CAUSE_W * 2 + 2, 11, 120);
    }
    void r;
  });
}
void capG; void padG; void starfish; void seashell; void DEEP; void ASH; void ROSE2; void CORAL; void NACRE; void INDIGO; void BLUE; void ROOT; void LILY;

// ── 섬 테두리와 섬 안 길: 각 섬 물가 둘레에 그 섬다운 중형 구조물(소라 집·껍질 돔·산호·결정 기둥)을 두르고,
//    섬 안을 도는 순환 길에는 진주 포석 빛 점선을 깐다 ──
export function islandRims(w, K, ctx) {
  const r = w.rand;
  const KIND = { landing: ["conch", "dome"], pearl: ["conch", "dome", "clam"], coral: ["coral"], nest: ["thorn"], geyser: ["dome", "crystal"], bone: ["conch", "bone"], islet: [] };
  for (const I of Object.values(ISL)) {
    const kinds = KIND[I.id];
    if (!kinds.length) continue;
    const n = Math.round(I.R * 0.42);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.2, d = I.R * (0.84 + r() * 0.1), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (Math.abs(x) > 224 || Math.abs(z) > 224) continue;
      const kind = kinds[i % kinds.length], g0 = gy(x, z);
      if (!ctx.free(x, z, 4)) continue;
      if (kind === "conch") { conch(w, K, x, g0, z, 10 + r() * 14, 2.2 + r() * 1.4, { light: i % 2 ? AQUA : AMBER, light2: BLUE2, tilt: r() * 10, az: a / DEG, color: i % 3 ? NACRE : NACRE2 }); lump(w, x, g0 + 0.3, z, 4, 1.2, 4, INDIGO2); }
      else if (kind === "dome") sunkDome(w, K, x, g0 - 1.6, z, 4.5 + r() * 3, { tilt: r() * 12, light: i % 2 ? AQUA : BLUE2, mast: 0.45 });
      else if (kind === "clam") { const s = 2.6 + r(); w.mesh(scallopG(), M(x, g0 + 0.2, z, s * 1.2, s * 0.7, s * 1.4, 180, a / DEG, 0), NACRE2, "paint"); w.mesh(scallopG(), M(x, g0 + 0.5, z, s * 1.2, s * 0.8, s * 1.4, 225, a / DEG, 0), NACRE, "paint"); bead(w, x, g0 + 1.2, z, s * 0.3, 0xf4f0ff); w.col.addSphere(V3(x, g0 + s * 0.3, z), s * 0.7); }
      else if (kind === "coral") coralTower(w, K, x, g0, z, 12 + r() * 10, 0.9, r, { colors: i % 2 ? [0xe85aa8, 0xc0408e, 0xff86c4] : [0x5a6aff, 0x4048c8, 0x8a9aff], tip: i % 2 ? ROSE : AQUA, depth: 2 });
      else if (kind === "thorn") { const H = 8 + r() * 8; tube(w, x, g0 - 1, z, x - Math.cos(a) * 2, g0 + H, z - Math.sin(a) * 2, 0.9, VOID2, { col: true, seg: 6 }); shard(w, x - Math.cos(a) * 2, g0 + H, z - Math.sin(a) * 2, 0.3, 2.4, 0, 0, BLOOD, { mat: "glow", col: false }); }
      else if (kind === "crystal") { for (let j = 0; j < 4; j++) shard(w, x + (r() - 0.5) * 3, g0, z + (r() - 0.5) * 3, 0.7 + r() * 0.5, 5 + r() * 7, (r() - 0.5) * 30, r() * 360, j % 2 ? 0x6affee : 0x7a8aff, { mat: j ? "paint" : "glow", col: j === 0 }); w.pool(x, g0 + 0.05, z, 6, AQUA, 0.4); }
      else if (kind === "bone") { const L = 9 + r() * 6; curveTube(w, [[x, g0 - 1, z], [x - Math.cos(a) * 2, g0 + L * 0.6, z - Math.sin(a) * 2], [x - Math.cos(a) * 5, g0 + L, z - Math.sin(a) * 5]], 0.8, 0.45, BONE2, { col: true, seg: 6 }); }
      ctx.taken.push([x, z, 4.5]);
    }
    // 섬 안 순환 길: 둑길과 이어지는 진주 포석 빛 점선(가장자리 두 줄)
    if (I.rho > 0.5) {
      const R0 = I.R * I.rho;
      for (let k = 0; k < 64; k++) {
        const a = (k / 64) * Math.PI * 2;
        for (const off of [-5.6, 5.6]) {
          const x = I.x + Math.cos(a) * (R0 + off), z = I.z + Math.sin(a) * (R0 + off);
          if (islandOf(x, z, 1) !== I || k % 2) continue;
          w.box(x, gy(x, z) - 0.05, z, 1.6, 0.14, 0.5, off < 0 ? AQUA : BLUE2, { mat: "glow", ry: -a / DEG, col: false });
        }
      }
    }
  }
}
