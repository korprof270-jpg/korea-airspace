// 기계제국 수도의 공업 구역: 적층 공장 블록(터널), 용광로 구덩이와 쇳물 국자 갠트리, 굴뚝, 조립동과 오가는 갠트리 크레인,
// 드론 부품이 흐르는 거대 컨베이어 다리 둘, 케이블 숲, 첨탑에서 뻗는 에너지선 철탑
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, prop, merged, mat, ring, octa, lattice, V3, DEG, hash, local, height, lavaTexture, plume,
  BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ,
  SP, ROAD_R, AVE, PITS, PIT_D, HALL, CRANE_X, CRANE_Y, CONV_A, CONV_B, HIVES, CABLES, PYLONS,
} from "./empire-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 10), SPHG = new THREE.SphereGeometry(1, 10, 6);
const bx = (sx, sy, sz, x, y, z, c, ry = 0, rx = 0, rz = 0) => [BOXG, M(x, y, z, sx, sy, sz, rx, ry, rz), c];
const cy = (r, h, x, y, z, c, rx = 0, rz = 0) => [CYLG, M(x, y, z, r, h, r, rx, 0, rz), c];

// ── 적층 공장 블록: 3단 계단형. 1단을 동서로 꿰는 터널, 단마다 붉은 창 띠, 꼭대기 굴뚝 ──
export function hives(w, K) {
  HIVES.forEach(([x, z, S], i) => {
    const r = w.rand, P = { mat: "std:panel", tile: 8 }, TW = 14, TH = 10, H1 = 16;
    const half = (S - TW) / 2;
    for (const s of [-1, 1]) w.box(x, 0, z + s * (TW / 2 + half / 2), S, H1, half, BLK2, P);
    w.box(x, TH, z, S, H1 - TH, TW, BLK2, P);
    // 터널 안: 천장 발광 띠, 바닥 경고선, 입구 테
    w.box(x, TH - 0.2, z, S - 1, 0.2, 1.2, RED, { mat: "glow", col: false });
    for (const s of [-1, 1]) w.box(x, 0.03, z + s * (TW / 2 - 1), S, 0.05, 0.5, HAZ, { col: false, ao: false });
    for (const ex of [-1, 1]) {
      const fx = x + ex * (S / 2 + 0.3);
      w.box(fx, TH - 0.6, z, 0.6, 0.8, TW + 1, HAZ, { mat: "std:hazard", tile: 2, col: false });
      for (const s of [-1, 1]) w.box(fx, 0, z + s * (TW / 2 + 0.3), 0.6, TH, 0.6, HAZ, { mat: "std:hazard", tile: 2, col: false });
      w.pool(x + ex * (S / 2 - 4), 0.05, z, 9, RED, 0.35);
    }
    w.gap("적층 공장 터널", x, TH / 2, z, 90, TW - 2, TH - 1.5, 350);
    // 2단·3단
    const o2 = (r() - 0.5) * 4, o3 = (r() - 0.5) * 4, S2 = S - 12, S3 = S - 24;
    w.box(x + o2, H1, z - o2, S2, 14, S2, BLK, P);
    w.box(x + o3, H1 + 14, z + o3, S3, 12, S3, BLK2, P);
    // 창 띠·층 테
    for (const [y, s, ox, oz] of [[H1 - 3.4, S, 0, 0], [H1 + 9, S2, o2, -o2], [H1 + 21, S3, o3, o3]]) {
      w.box(x + ox, y, z + oz, s + 0.24, 1.1, s + 0.24, RED, { mat: "glow", col: false });
      w.box(x + ox, y + 3.2, z + oz, s + 0.8, 0.8, s + 0.8, IRON, { mat: "paint", col: false });
    }
    // 1단 벽 갈비뼈
    for (let k = -S / 2 + 4; k <= S / 2 - 4; k += 8) for (const s of [-1, 1]) {
      w.box(x + k, 0, z + s * (S / 2 + 0.3), 0.9, H1 - 4, 0.6, IRON, { mat: "paint", col: false });
      if (Math.abs(k) > TW / 2 + 1) w.box(x + s * (S / 2 + 0.3), 0, z + k, 0.6, H1 - 4, 0.9, IRON, { mat: "paint", col: false });
    }
    // 배기구: 주황 발광 격자
    for (let k = 0; k < 4; k++) { const a = k * 90 + 45, c = Math.cos(a * DEG), s2 = Math.sin(a * DEG); w.box(x + o2 + c * (S2 / 2 - 3), H1 + 14, z - o2 + s2 * (S2 / 2 - 3), 3, 0.4, 3, ORG, { mat: "glow", col: false }); }
    // 굴뚝 둘
    for (let k = 0; k < 2; k++) {
      const sx = x + o3 + (k ? 1 : -1) * S3 * 0.24, sz = z + o3 + (k ? -1 : 1) * S3 * 0.18, top = H1 + 26 + 16 + k * 6;
      w.cyl(sx, H1 + 26, sz, 2.2, top - H1 - 26, IRON, { mat: "paint", rt: 1.8 });
      w.cyl(sx, top - 4, sz, 2.05, 0.8, RED, { mat: "glow", col: false });
      w.cyl(sx, top, sz, 2.2, 0.6, STEEL, { mat: "paint", col: false });
      plume(w, sx, top + 1, sz, 4.5, 60, 4);
    }
    K.blink.add(x - S / 2, H1 + 0.6, z - S / 2, RED, 0.45, i); K.blink.add(x + S / 2, H1 + 0.6, z + S / 2, RED, 0.45, i + 1);
  });
}

// ── 용광로 구덩이: 낮은 경고 턱, 흐르는 쇳물, 위로 번지는 열기, 쇳물을 붓는 국자 갠트리, 불티 ──
const PIT_RY = [0, 30, -50];
export function foundry(w, K) {
  const lt = lavaTexture();
  const lavaMats = [];
  PITS.forEach(([cx, cz, R], i) => {
    // 턱(넘어 날 수 있게 낮게)
    const n = 28;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, L = 2 * Math.PI * (R + 0.7) / n;
      w.box(cx + Math.cos(a) * (R + 0.7), 0, cz + Math.sin(a) * (R + 0.7), L + 0.2, 1.1, 1.2, k % 2 ? HAZ : BLK2, { mat: k % 2 ? "std:hazard" : "paint", tile: 2, ry: -a / DEG + 90 });
    }
    // 쇳물
    const m = new THREE.MeshBasicMaterial({ map: lt.clone(), color: new THREE.Color(1.6, 1.3, 1.1) });
    m.map.needsUpdate = true; m.map.repeat.set(2.4, 2.4);
    const g = new THREE.CircleGeometry(R - 3.6, 48); g.rotateX(-Math.PI / 2);
    const lava = new THREE.Mesh(g, m); lava.position.set(cx, -PIT_D + 0.45, cz);
    w.scene.add(lava); w.disposables.push(g, m, m.map);
    lavaMats.push(m);
    w.pool(cx, -PIT_D + 0.6, cz, R * 1.15, ORG, 0.6);
    w.pool(cx, 0.06, cz, R * 2.1, ORG, 0.22);
    // 열기: 가산 원통
    const hm = new THREE.Mesh(new THREE.CylinderGeometry(R - 6, R - 3.5, 36, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    hm.position.set(cx, -PIT_D + 18, cz); hm.renderOrder = 6; w.scene.add(hm);
    // 국자 갠트리: 양쪽 A자 다리 + 거더, 국자(국자 입에서 쇳물이 떨어진다)
    const ry = PIT_RY[i] || 0, P = local(cx, cz, ry), U = R + 7, GY = 24;
    for (const su of [-1, 1]) {
      for (const sv of [-1, 1]) { const [ax, az] = P(su * U, sv * 5); const [tx, tz] = P(su * U, 0); beam(w, [ax, 0, az], [tx, GY, tz], 1.3, IRON); }
      const [mx, mz] = P(su * U, 0);
      const [b1x, b1z] = P(su * U, -3.1), [b2x, b2z] = P(su * U, 3.1);
      beam(w, [b1x, 9, b1z], [b2x, 9, b2z], 0.8, STEEL, { col: false });
      w.box(mx, 0, mz, 4, 1, 12, IRON, { mat: "paint", ry });
      K.blink.add(mx, GY + 2.4, mz, RED, 0.45, su > 0 ? 0 : 1);
    }
    const [g0x, g0z] = P(0, 0);
    w.box(g0x, GY, g0z, 2 * U + 4, 2.4, 2.6, IRON, { mat: "std:panel", ry });
    w.box(g0x, GY - 0.15, g0z, 2 * U, 0.2, 0.6, RED, { mat: "glow", col: false, ry });
    w.box(g0x, GY + 2.4, g0z, 2 * U + 4, 0.5, 3, HAZ, { mat: "std:hazard", tile: 2, ry, col: false });
    const cu = R * 0.42, [kx, kz] = P(cu, 0);
    w.box(kx, GY - 2.2, kz, 5, 2.2, 4, STEEL, { mat: "paint", ry });                     // 권상기
    for (const sv of [-1.2, 1.2]) { const [qx, qz] = P(cu + sv, 0); w.pipe(qx, GY - 2.2, qz, qx, 15.5, qz, 0.12, BLK, { col: false }); }
    w.cyl(kx, 10.5, kz, 3.1, 5, RUST, { mat: "metal", rt: 3.7 });
    w.cyl(kx, 15.3, kz, 3.75, 0.45, ORG, { mat: "glow", col: false });
    w.cyl(kx, 15.2, kz, 3.3, 0.2, EMB, { mat: "glow", col: false });
    w.col.addCapsule(V3(kx, 11.5, kz), V3(kx, 14.5, kz), 3.6);
    const [sx, sz] = P(cu + 4.2, 0), [ex, ez] = P(cu + 5.4, 0);
    w.pipe(sx, 15.2, sz, ex, -PIT_D + 0.5, ez, 0.75, EMB, { mat: "glow", col: false });
    w.pool(ex, -PIT_D + 0.7, ez, 6, EMB, 0.7);
    w.gap("용광로 구덩이 강하", cx, -3, cz, ry, 2 * (R - 6), 7, 450);
    w.gap("국자 갠트리 아래", g0x, 12, g0z, ry + 90, 2 * U - 4, 18, 200);
  });
  w.updaters.push((dt, t) => lavaMats.forEach((m, i) => {
    m.map.offset.set(t * 0.006 + i * 0.3, Math.sin(t * 0.05 + i) * 0.05);
    const k = 1.35 + Math.sin(t * 1.7 + i * 2) * 0.12 + Math.sin(t * 4.3 + i) * 0.06;
    m.color.setRGB(k, k * 0.85, k * 0.75);
  }));
  // 불티: 구덩이마다 위로 떠오르는 점
  const per = 70, N = per * PITS.length, pos = new Float32Array(N * 3), seed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const p = PITS[(i / per) | 0], a = hash(i, 1) * 6.28, d = Math.sqrt(hash(i, 2)) * (p[2] - 5); seed.set([p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d, hash(i, 3)], i * 3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffa040, size: 0.55, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; w.scene.add(pts); w.disposables.push(pg, pts.material);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const u = (t * 0.09 + seed[i * 3 + 2]) % 1;
      pos[i * 3] = seed[i * 3] + Math.sin(t * 0.7 + i) * 2 * u; pos[i * 3 + 1] = -PIT_D + 1 + u * 44; pos[i * 3 + 2] = seed[i * 3 + 1] + Math.cos(t * 0.5 + i) * 2 * u;
    }
    pg.attributes.position.needsUpdate = true;
  });
}

// ── 굴뚝: 붉은 띠를 두른 검은 원통과 연기 ──
export function stack(w, K, x, z, H, r = 3.4) {
  w.cyl(x, 0, z, r + 2.2, 6, IRON, { mat: "std:panel" });
  w.cyl(x, 6, z, r, H - 6, BLK, { mat: "std:panel", rt: r * 0.78 });
  for (let y = 18; y < H - 6; y += 16) { const k = r - (r * 0.22) * (y - 6) / (H - 6); w.cyl(x, y, z, k + 0.12, 1, RED, { mat: "glow", col: false }); }
  w.cyl(x, H, z, r * 0.78 + 0.4, 1.2, STEEL, { mat: "paint", col: false });
  w.cyl(x, H + 0.4, z, r * 0.62, 0.9, ORG, { mat: "glow", col: false });
  K.blink.add(x + r * 0.8, H + 1.6, z, RED, 0.45, 0);
  plume(w, x, H + 1.5, z, r * 2.2, 90, 5);
}

// ── 조립동: 남북으로 트인 긴 건물. 안에는 양쪽으로 로봇 팔과 조립 중인 제국 드론. 위로 갠트리 크레인 둘이 오간다 ──
export function hall(w, K) {
  const { x, z0, z1, w: W, h: H } = HALL, x0 = x - W / 2, x1 = x + W / 2, L = z1 - z0, zc = (z0 + z1) / 2, T = 1.6, P = { mat: "std:panel", tile: 8 };
  for (const xs of [x0, x1]) {
    w.box(xs, 0, zc, T, H, L, BLK2, P);
    for (const y of [6, 14]) w.box(xs + Math.sign(xs - x) * 0.9, y, zc, 0.2, 1.1, L - 6, RED, { mat: "glow", col: false });
    for (let k = z0 + 6; k < z1; k += 10) w.box(xs + Math.sign(xs - x) * 1.1, 0, k, 0.8, H, 1.2, IRON, { mat: "paint", col: false });
  }
  const DW = 18, DH = 15;
  for (const ze of [z0, z1]) {
    const sw = (W - DW) / 2;
    for (const s of [-1, 1]) w.box(x + s * (DW / 2 + sw / 2), 0, ze, sw, H, T, BLK2, P);
    w.box(x, DH, ze, DW, H - DH, T, BLK2, P);
    w.box(x, DH - 0.7, ze + Math.sign(ze - zc) * 0.9, DW + 1, 0.9, 0.4, HAZ, { mat: "std:hazard", tile: 2, col: false });
    for (const s of [-1, 1]) w.box(x + s * (DW / 2 + 0.3), 0, ze + Math.sign(ze - zc) * 0.9, 0.6, DH, 0.4, HAZ, { mat: "std:hazard", tile: 2, col: false });
    w.box(x, H - 4, ze + Math.sign(ze - zc) * 0.85, W, 1.4, 0.3, RED, { mat: "glow", col: false });
    w.gap("조립동 터널", x, DH / 2, ze, 0, DW - 3, DH - 2, 300);
  }
  w.box(x, H, zc, W + 2, 1.6, L + 2, IRON, P);
  for (let k = -2; k <= 2; k++) w.box(x + k * 5.5, H + 1.6, zc, 0.9, 1.2, L + 2, STEEL, { mat: "paint", col: false });
  w.box(x, H + 1.6, zc, 3, 0.3, L - 8, RED, { mat: "glow", col: false });
  // 실내: 천장 붉은 등, 바닥 유도선, 로봇 팔과 조립대
  w.box(x, 0.03, zc, 0.6, 0.05, L - 2, HAZ, { col: false, ao: false });
  for (let k = z0 + 8; k < z1 - 4; k += 12) {
    for (const s of [-1, 1]) {
      w.box(x + s * 8, H - 0.6, k, 1.2, 0.3, 6, RED, { mat: "glow", col: false }); w.pool(x + s * 8, 0.05, k, 7, RED, 0.3);
      const bx0 = x + s * (W / 2 - 3);
      w.cyl(bx0, 0, k, 1.3, 1.2, IRON, { mat: "paint" });
      beam(w, [bx0, 1.2, k], [bx0 - s * 2, 6.5, k], 0.9, GUN);
      beam(w, [bx0 - s * 2, 6.5, k], [bx0 - s * 4.5, 4.4, k + 1], 0.7, GUN);
      w.sph(bx0 - s * 4.6, 4.2, k + 1.1, 0.35, RED, { mat: "glow", col: false });
      // 조립대 위의 제국 드론 동체
      const dx = x + s * (W / 2 - 3), dz = k + 6;
      w.box(dx, 0, dz, 3, 1.4, 3, STEEL, { mat: "paint" });
      w.sph(dx, 2.8, dz, 1.4, BLK, { mat: "metal", col: false });
      w.sph(dx - s * 0.9, 3, dz, 0.45, RED, { mat: "glow", col: false });
      for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(w, [dx, 2.8, dz], [dx + ax * 2.2, 3, dz + az * 2.2], 0.3, IRON, { col: false });
    }
  }
  // 크레인 레일
  for (const rx of CRANE_X) {
    w.box(rx, 0, zc, 2.2, 0.9, L + 36, IRON, { mat: "paint" });
    w.box(rx, 0.9, zc, 0.5, 0.2, L + 36, GUN, { mat: "metal", col: false });
    for (const ze of [zc - L / 2 - 18, zc + L / 2 + 18]) { w.box(rx, 0, ze, 3, 2.4, 1.6, HAZ, { mat: "std:hazard", tile: 2 }); }
  }
  // 갠트리 크레인 둘: 각자 반쪽 구간을 오간다
  const span = CRANE_X[1] - CRANE_X[0], cxm = (CRANE_X[0] + CRANE_X[1]) / 2, Y = CRANE_Y;
  const legs = [];
  for (const s of [-1, 1]) for (const sz of [-1, 1]) legs.push(bx(1.2, Y, 1.2, s * span / 2, Y / 2, sz * 4, IRON));
  for (const s of [-1, 1]) { legs.push(bx(1.4, 1, 9.4, s * span / 2, Y * 0.45, 0, STEEL)); legs.push(bx(2.6, 1.6, 10, s * span / 2, 0.8, 0, BLK2)); legs.push(bx(0.2, Y - 4, 0.3, s * (span / 2 + 0.7), Y / 2, 0, RED)); }
  legs.push(bx(span + 4, 2.6, 3, 0, Y + 1.3, 0, IRON), bx(span + 4, 0.5, 3.2, 0, Y + 2.85, 0, HAZ), bx(4, 3, 5, -span / 2 + 3, Y + 3.5, 0, STEEL));
  const legGlow = [bx(span, 0.25, 0.4, 0, Y - 0.05, 1.3, RED), bx(span, 0.25, 0.4, 0, Y - 0.05, -1.3, RED)];
  const ranges = [[zc - L / 4 - 6, L / 4 - 2], [zc + L / 4 + 6, L / 4 - 2]];
  ranges.forEach(([zm, amp], i) => {
    const g = new THREE.Group(); g.position.set(cxm, 0, zm);
    g.add(prop(w, legs, "paint"), prop(w, legGlow, "glow", false));
    // 트롤리: 거더를 따라 좌우로, 아래에 매단 드론 동체
    const tr = new THREE.Group(); tr.position.y = Y;
    const hullParts = [bx(4, 2, 4, 0, 0.2, 0, STEEL), cy(0.12, 6, 0, -3, 0, BLK), bx(5, 2.2, 5, 0, -7, 0, BLK2), [SPHG, M(0, -7.6, 0, 2.2, 1.4, 2.2), BLK], bx(8, 0.5, 0.8, 0, -7.2, 0, IRON, 45), bx(8, 0.5, 0.8, 0, -7.2, 0, IRON, -45)];
    tr.add(prop(w, hullParts, "paint"));
    const eye = new THREE.Mesh(SPHG, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.3, 0.3) })); eye.scale.setScalar(0.6); eye.position.set(0, -7.6, 2); tr.add(eye);
    g.add(tr);
    w.scene.add(g);
    w.rider(g, [[-span / 2, Y / 2, 0, 1, Y / 2, 4.6], [span / 2, Y / 2, 0, 1, Y / 2, 4.6], [0, Y + 1.3, 0, span / 2 + 2, 1.3, 1.5]], "crane");
    w.rider(tr, [[0, -7, 0, 2.6, 1.6, 2.6]], "crane");
    const ph = i * 2.1;
    w.updaters.push((dt, t) => {
      g.position.z = zm + Math.sin(t * 0.16 + ph) * amp;
      tr.position.x = Math.sin(t * 0.27 + ph * 1.7) * (span / 2 - 6);
    });
  });
  w.gap("크레인 레일 사이", cxm, 28, zc, 0, span - 4, 8, 150);
}

// ── 드론 부품 모형(컨베이어 위를 흐르는 것) ──
function partGeo() {
  const parts = [bx(1.8, 0.6, 1.8, 0, 0.3, 0, GUN), [SPHG, M(0, 0.75, 0, 0.7, 0.45, 0.7), BLK], [SPHG, M(0, 0.6, 0.72, 0.22, 0.22, 0.22), RED]];
  for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { parts.push(bx(0.25, 0.2, 1.8, ax * 0.9, 0.35, az * 0.9, IRON, ax * az > 0 ? 45 : -45)); parts.push(cy(0.45, 0.3, ax * 1.5, 0.45, az * 1.5, BLK2)); }
  return merged(parts);
}
function crateGeo() { return merged([bx(2.4, 1.6, 2.4, 0, 0.8, 0, RUST), bx(2.5, 0.25, 2.5, 0, 1.45, 0, IRON), bx(2.5, 0.2, 0.3, 0, 0.9, 1.22, RED)]); }

// ── 컨베이어 다리: 갑판 + 옆벽 + 아래 트러스 + 다리(건너뛸 자리 제외) + 문틀, 흐르는 부품 ──
// axis "x": z 고정, s 는 x / axis "z": x 고정, s 는 z
function conveyor(w, K, axis, fixed, s0, s1, y, skip, name) {
  const L = s1 - s0, sm = (s0 + s1) / 2, ax = axis === "x";
  const P = (s, o, yy) => (ax ? [s, yy, fixed + o] : [fixed + o, yy, s]);
  const box = (s, o, yy, ls, lo, hy, c, op) => { const [px, py, pz] = P(s, o, yy); w.box(px, py, pz, ax ? ls : lo, hy, ax ? lo : ls, c, op); };
  box(sm, 0, y - 1.4, L, 8, 1.4, IRON, { mat: "std:panel", tile: 6 });
  box(sm, 0, y, L, 6, 0.15, 0x24262b, { mat: "std:corrug", tile: 2, col: false });
  for (const o of [-3.7, 3.7]) {
    box(sm, o, y, L, 0.6, 1.5, BLK2, { mat: "paint" });
    box(sm, o * 1.02, y + 1.5, L, 0.7, 0.22, RED, { mat: "glow", col: false });
  }
  box(sm, 0, y - 1.6, L, 0.6, 0.22, RED, { mat: "glow", col: false });
  // 트러스
  for (const o of [-3.6, 3.6]) { const a = P(s0, o, y - 5), b = P(s1, o, y - 5); beam(w, a, b, 0.7, STEEL, { col: false }); }
  for (let s = s0; s < s1 - 1; s += 10) for (const o of [-3.6, 3.6]) beam(w, P(s, o, y - 5), P(s + 10, o, y - 1.4), 0.32, STEEL, { col: false });
  w.col.addBox(V3(...P(sm, 0, y - 3.3)), ax ? V3(L / 2, 1.9, 3.8) : V3(3.8, 1.9, L / 2));
  // 다리
  for (let s = s0 + 12; s < s1 - 8; s += 30) {
    if (skip(s)) continue;
    for (const o of [-3.4, 3.4]) { const top = P(s, o, y - 5), bot = P(s, o * 1.5, 0); beam(w, bot, top, 1.2, IRON); }
    box(s, 0, y - 6.4, 1.2, 8, 1.4, STEEL, { mat: "paint", col: false });
    box(s, 0, 0, 3, 11, 1, BLK2, { mat: "paint" });
    K.blink.add(...P(s, 4.2, y + 1.9), RED, 0.32, ((s - s0) / 30) & 1);
  }
  // 문틀(덮개 고리): 위로 넘어갈 때 걸린다
  for (let s = s0 + 20; s < s1 - 10; s += 36) {
    for (const o of [-3.9, 3.9]) { const a = P(s, o, y + 1.5), b = P(s, o, y + 6.5); beam(w, a, b, 0.7, GUN); }
    beam(w, P(s, -3.9, y + 6.5), P(s, 3.9, y + 6.5), 0.7, GUN);
    beam(w, P(s, -3.3, y + 6.1), P(s, 3.3, y + 6.1), 0.18, RED, { mat: "glow", col: false });
  }
  // 끝 단말 건물
  for (const se of [s0, s1]) {
    const [px, , pz] = P(se, 0, 0), sx = ax ? 14 : 18, sz = ax ? 18 : 14;
    w.box(px, 0, pz, sx, y + 10, sz, BLK, { mat: "std:panel", tile: 8 });
    w.box(px, y + 2, pz, sx + 0.24, 1.2, sz + 0.24, RED, { mat: "glow", col: false });
    w.box(px, y + 10, pz, sx + 1, 1, sz + 1, IRON, { mat: "paint", col: false });
    K.blink.add(px, y + 12, pz, RED, 0.5, 1);
  }
  // 흐르는 부품
  const n = Math.floor(L / 9), g1 = partGeo(), g2 = crateGeo();
  const ims = [new THREE.InstancedMesh(g1, mat(w, "paint"), Math.ceil(n / 2)), new THREE.InstancedMesh(g2, mat(w, "paint"), Math.floor(n / 2))];
  for (const im of ims) { im.frustumCulled = false; im.castShadow = true; w.scene.add(im); }
  w.disposables.push(g1, g2);
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const dir = (fixed * 13) % 2 ? 1 : -1, sp = 4.2;
  w.updaters.push((dt, t) => {
    const c = [0, 0];
    for (let i = 0; i < n; i++) {
      const k = i & 1, u = ((i / n + (t * sp * dir) / L) % 1 + 1) % 1, s = s0 + 10 + u * (L - 20);
      pv.set(...P(s, Math.sin(i * 2.3) * 0.9, y + 0.15));
      e.set(0, (i * 0.7) + (ax ? 0 : Math.PI / 2), 0); q.setFromEuler(e);
      tm.compose(pv, q, one); ims[k].setMatrixAt(c[k]++, tm);
    }
    for (const im of ims) im.instanceMatrix.needsUpdate = true;
  });
  if (name) for (let s = s0 + 30; s < s1 - 20; s += 60) if (!skip(s)) { const [gx, , gz] = P(s, 0, 0); w.gap(name, gx, (y - 6) / 2, gz, ax ? 0 : 90, 20, y - 8, 160); }
}

export function conveyors(w, K, keep) {
  const nearRoad = (x, z) => Math.abs(Math.hypot(x, z) - ROAD_R) < 12;
  const A = CONV_A, B = CONV_B;
  conveyor(w, K, "x", A.z, A.x0, A.x1, A.y, (s) => Math.abs(s) < AVE + 4 || nearRoad(s, A.z) || keep(s, A.z), "컨베이어 다리 아래");
  conveyor(w, K, "z", B.x, B.z0, B.z1, B.y, (s) => nearRoad(B.x, s) || keep(B.x, s), "컨베이어 다리 아래");
  // 길과 만나는 자리: 다리 아래 통과 보너스
  for (const sx of [-1, 1]) w.gap("대로 위 컨베이어", sx * Math.sqrt(ROAD_R * ROAD_R - A.z * A.z), 9, A.z, 0, 16, 14, 250);
  w.gap("남쪽 대로 위 컨베이어", 0, 9, A.z, 0, 18, 14, 250);
}

// ── 케이블 숲: 격자탑이 받치는 머리 위 철골에서 수십 가닥 굵은 케이블이 바닥까지 늘어진다 ──
export function cableForest(w, K, free) {
  const { x0, x1, z0, z1, y } = CABLES, r = w.rand, XS = [x0, (x0 + x1) / 2, x1], ZS = [z0, (z0 + z1) / 2, z1];
  for (const x of XS) for (const z of ZS) {
    lattice(w, x, 0, z, 1.6, y, 6, IRON, { color2: STEEL, t: 0.5, open: "x" });
    w.box(x, 0, z, 5, 1.2, 5, BLK2, { mat: "paint" });
    K.blink.add(x, y + 1.6, z, RED, 0.45, (x + z) & 1);
  }
  for (const z of ZS) { beam(w, [x0, y, z], [x1, y, z], 1.4, IRON); beam(w, [x0, y - 0.9, z], [x1, y - 0.9, z], 0.25, RED, { mat: "glow", col: false }); }
  for (const x of XS) { beam(w, [x, y, z0], [x, y, z1], 1.4, IRON); }
  // 사이 보 (케이블이 매달릴 자리)
  for (let x = x0 + 9; x < x1 - 4; x += 9) beam(w, [x, y + 0.2, z0], [x, y + 0.2, z1], 0.6, STEEL, { col: false });
  // 늘어진 케이블
  const pts = [];
  for (let i = 0; i < 900 && pts.length < 84; i++) {
    const x = x0 + 4 + r() * (x1 - x0 - 8), z = z0 + 4 + r() * (z1 - z0 - 8);
    if (pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 6.6)) continue;
    if (XS.some((px) => ZS.some((pz) => Math.hypot(px - x, pz - z) < 5))) continue;
    if (!free(x, z)) continue;
    pts.push([x, z]);
  }
  for (const [x, z] of pts) {
    const top = [Math.round((x - x0) / 9) * 9 + x0, y, z], bx2 = x + (r() - 0.5) * 3, bz = z + (r() - 0.5) * 3, th = r() < 0.3 ? 0.42 : 0.22;
    // 위는 사이 보, 아래는 바닥 고정쇠. 살짝 처진 두 마디
    const mid = [(top[0] + bx2) / 2 + (r() - 0.5) * 1.5, y * 0.45, (top[2] + bz) / 2 + (r() - 0.5) * 1.5];
    w.pipe(top[0], top[1], top[2], mid[0], mid[1], mid[2], th, BLK, { col: false });
    w.pipe(mid[0], mid[1], mid[2], bx2, 0.6, bz, th, BLK, { col: false });
    w.col.addCapsule(V3(top[0], top[1], top[2]), V3(mid[0], mid[1], mid[2]), th + 0.18);
    w.col.addCapsule(V3(mid[0], mid[1], mid[2]), V3(bx2, 0.6, bz), th + 0.18);
    w.box(bx2, 0, bz, 1.6, 0.8, 1.6, IRON, { mat: "paint", col: false });
    if (th > 0.3) { for (const f of [0.3, 0.7]) w.sph(mid[0] + (bx2 - mid[0]) * f, mid[1] * (1 - f) + 0.6 * f, mid[2] + (bz - mid[2]) * f, 0.6, RED, { mat: "glow", col: false }); }
    else if (r() < 0.4) w.sph(mid[0], mid[1], mid[2], 0.45, RED2, { mat: "glow", col: false });
  }
  // 철골 사이를 가로질러 늘어진 굵은 현수 케이블
  for (let k = 0; k < 10; k++) {
    const za = z0 + 6 + r() * (z1 - z0 - 12), xa = x0 + r() * 20, xb = x1 - r() * 20, sag = 10 + r() * 10, N = 8;
    let prev = null;
    for (let j = 0; j <= N; j++) {
      const u = j / N, p = [xa + (xb - xa) * u, y - 1 - sag * 4 * u * (1 - u), za + Math.sin(u * 3 + k) * 2];
      if (prev) { w.pipe(...prev, ...p, 0.35, BLK, { col: false }); w.col.addCapsule(V3(...prev), V3(...p), 0.5); }
      prev = p;
    }
  }
  w.pool((x0 + x1) / 2, 0.06, (z0 + z1) / 2, 60, RED, 0.12);
  for (const z of [ZS[0] + 23, ZS[1] + 23]) w.gap("케이블 숲 통과", (x0 + x1) / 2, 18, z, 90, 60, 28, 260);
  for (const x of [x0 + 18, x1 - 18]) w.gap("케이블 숲 통과", x, 18, (z0 + z1) / 2, 0, 30, 28, 260);
}

// ── 에너지선: 첨탑 허리에서 네 철탑으로 늘어진 붉은 발광선. 선 아래 높이를 알려 준다(탑을 낮춘다) ──
export const ELINES = PYLONS.map(([px, pz, ph]) => {
  const dx = px - SP[0], dz = pz - SP[1], d = Math.hypot(dx, dz), a = [SP[0] + (dx / d) * 11, 106, SP[1] + (dz / d) * 11], b = [px, ph + 2, pz];
  return { a, b, sag: 22 };
});
export function lineY(x, z) {
  let best = Infinity;
  for (const { a, b, sag } of ELINES) {
    const vx = b[0] - a[0], vz = b[2] - a[2], L2 = vx * vx + vz * vz, u = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[2]) * vz) / L2));
    const d = Math.hypot(a[0] + vx * u - x, a[2] + vz * u - z);
    if (d < 18) best = Math.min(best, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u));
  }
  return best;
}
export function energyLines(w, K) {
  PYLONS.forEach(([x, z, H], i) => {
    w.box(x, 0, z, 10, 2, 10, IRON, { mat: "paint" });
    lattice(w, x, 2, z, 2.4, H - 2, Math.round(H / 8), BLK2, { color2: IRON, t: 0.6, open: i % 2 ? "x" : "z" });
    w.box(x, H, z, 9, 1.4, 9, STEEL, { mat: "paint" });
    w.sph(x, H + 2.4, z, 2.2, RED, { mat: "glow", col: false });
    ring(w, x, H + 2.4, z, 3.6, 0.3, GUN, { pitch: 90, col: false });
    for (const y of [H * 0.35, H * 0.7]) w.box(x, y, z, 5.6, 0.7, 5.6, RED, { mat: "glow", col: false });
    K.blink.add(x, H + 6, z, RED, 0.6, i & 1);
  });
  for (const { a, b, sag } of ELINES) {
    const N = 22;
    let prev = null;
    for (let j = 0; j <= N; j++) {
      const u = j / N, p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u];
      if (prev) { w.pipe(...prev, ...p, 0.55, RED, { mat: "glow", col: false }); w.pipe(...prev, ...p, 0.9, DRED, { mat: "paint", col: false }); }
      if (j % 5 === 2) w.cyl(p[0], p[1] - 1.2, p[2], 0.9, 2.4, GUN, { mat: "paint", col: false });
      prev = p;
    }
  }
  // 첨탑 쪽 고정 고리
  w.cyl(SP[0], 104.5, SP[1], 11.6, 3, IRON, { mat: "paint", col: false });
  w.cyl(SP[0], 105.6, SP[1], 11.9, 0.6, RED, { mat: "glow", col: false });
}
