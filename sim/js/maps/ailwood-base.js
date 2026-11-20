// 포자 숲 주 구조물: 어미나무(부러져 쓰러진 거목의 속 빈 그루터기 + 뿌리 공동 + 심장 옹이), 거대 버섯, 덩굴다리
//  · 그루터기 벽은 극좌표 격자(방위 5°·높이 3 m)로 직접 짓는다 — 뿌리 아치·옹이구멍 자리는 비우고, 벽 조각마다 상자 충돌체
//  · 남쪽 뿌리 아치 앞으로 굵은 뿌리 갈비가 겹겹이 휘어 덮인 "뿌리 공동" 굴이 이어진다
import * as THREE from "../../vendor/three.module.min.js";
import { M, tube, bead, lump, lumpG, capG, shellDome, ring, V3, ROOT, ROOT2, VIO, VIO2, PINK, TEAL, TEAL2, LIME, GOLD, FLESH, FLESH2 } from "./ail-kit.js";
import { height, MT, WALL, trunkR, trunkTop, trunkHole, OPEN, KNOT, BUTTRESS, HEART_Y, ringPt, CAPS, MID, CHORDS, SPOKES, capOf, vnoise, hash, DEG } from "./ailwood-terrain.js";

export const BARK = 0x3a2a4e, BARK2 = 0x4c3466, BARK3 = 0x2a2040, MOSS = 0x2f8a72;
export const CAP_COL = [0x6a3cc8, 0x2a7e96, 0x8a3cae, 0x3a5ad0], GILL = [TEAL, LIME, PINK, VIO2];
export const GY0 = height(MT[0], MT[1]);
const wp = (deg, y, r) => [MT[0] + Math.cos(deg * DEG) * r, GY0 + y, MT[1] + Math.sin(deg * DEG) * r];
const rOut = (deg, y) => trunkR(y) + 1.3 * vnoise(deg * 0.21, y * 0.09 + 3) + 0.7 * Math.abs(Math.sin(deg * DEG * 26 + y * 0.015));
const rIn = (deg, y) => trunkR(y) - WALL + 0.8 * vnoise(deg * 0.3 + 9, y * 0.11);

// ── 어미나무 그루터기 벽 ──
function trunkWall(w) {
  const NA = 72, DA = 5, DY = 3, top = [], rows = Math.ceil(140 / DY), Y0 = -3;
  for (let i = 0; i < NA; i++) top.push(trunkTop((i + 0.5) * DA));
  const solid = (i, j) => {
    i = (i + NA) % NA;
    if (j < 0) return true;
    const yc = Y0 + (j + 0.5) * DY, d = (i + 0.5) * DA;
    return yc < top[i] && !trunkHole(d, yc);
  };
  const pos = [], tri = (a, b, c) => pos.push(...a, ...b, ...c), quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < NA; i++) {
    const a0 = i * DA, a1 = a0 + DA, am = a0 + DA / 2;
    let run = -1;
    for (let j = 0; j <= rows; j++) {
      const s = j < rows && solid(i, j);
      if (s) {
        const y0 = Y0 + j * DY, y1 = Math.min(Y0 + (j + 1) * DY, top[i]);
        const o00 = wp(a0, y0, rOut(a0, y0)), o10 = wp(a1, y0, rOut(a1, y0)), o01 = wp(a0, y1, rOut(a0, y1)), o11 = wp(a1, y1, rOut(a1, y1));
        const n00 = wp(a0, y0, rIn(a0, y0)), n10 = wp(a1, y0, rIn(a1, y0)), n01 = wp(a0, y1, rIn(a0, y1)), n11 = wp(a1, y1, rIn(a1, y1));
        quad(o00, o01, o11, o10);              // 바깥
        quad(n00, n10, n11, n01);              // 안
        if (!solid(i - 1, j)) quad(o00, n00, n01, o01);
        if (!solid(i + 1, j)) quad(o10, o11, n11, n10);
        if (!solid(i, j + 1) || y1 >= top[i]) quad(o01, n01, n11, o11);
        if (!solid(i, j - 1)) quad(o00, o10, n10, n00);
        if (run < 0) run = j;
      }
      // 충돌 상자: 이어진 벽 조각(아래 30 m 는 반경이 변하므로 6 m 씩 끊는다)
      const yTop = Y0 + j * DY;
      if (run >= 0 && (!s || (yTop < 33 && j - run >= 2) || j === rows)) {
        const ya = Y0 + run * DY, yb = Math.min(Y0 + (s ? j : j) * DY, top[i]);
        if (yb - ya > 0.5) {
          const ym = (ya + yb) / 2, rm = (rOut(am, ym) + rIn(am, ym)) / 2 + 0.3, [cx, cy, cz] = wp(am, ym, rm);
          e.set(0, -(am + 90) * DEG, 0); q.setFromEuler(e);
          w.col.addBox(V3(cx, cy, cz), V3(rm * DA * DEG * 0.56, (yb - ya) / 2, WALL / 2 + 0.8), q, "어미나무");
        }
        run = s ? j : -1;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  w.mesh(g, new THREE.Matrix4(), BARK, "flat");
  return top;
}

// 줄기 겉면을 따라 오르는 굵은 껍질 골(세로 능선)과 발광 혈관
function trunkSkin(w, K, top) {
  const r = w.rand;
  for (let k = 0; k < 30; k++) {
    const a = k * 12 + r() * 6, h = top[Math.floor(((a % 360) / 5)) % 72] - 4;
    let prev = null;
    for (let y = 0; y <= h; y += 8) {
      const aa = a + Math.sin(y * 0.05 + k) * 3;
      if (trunkHole(aa, y, 3)) { prev = null; continue; }
      const p = wp(aa, y, rOut(aa, y) + 0.4);
      if (prev) tube(w, ...prev, ...p, 1.1 - y / 300, k % 3 ? BARK2 : BARK3, { mat: "flat" });
      prev = p;
    }
  }
  // 발광 혈관: 나선으로 감아 오른다
  for (let k = 0; k < 9; k++) {
    let prev = null, a = k * 40 + 7;
    const col = k % 3 === 0 ? TEAL : k % 3 === 1 ? VIO2 : LIME;
    for (let y = 1; y < 100; y += 3) {
      a += 2.2 + Math.sin(y * 0.1 + k) * 1.5;
      if (y > top[Math.floor(((a % 360 + 360) % 360) / 5) % 72] - 3 || trunkHole(a, y, 2)) { prev = null; continue; }
      const p = wp(a, y, rOut(a, y) + 0.6);
      if (prev) tube(w, ...prev, ...p, 0.32, col, { mat: "glow" });
      prev = p;
    }
  }
  // 부러진 꼭대기 이빨: 위로 삐죽한 쪼개진 나뭇결
  for (let i = 0; i < 72; i += 2) {
    const a = i * 5 + 2.5, t = top[i];
    if (r() < 0.55) tube(w, ...wp(a, t - 2, trunkR(t) - WALL / 2), ...wp(a + (r() - 0.5) * 6, t + 3 + r() * 9, trunkR(t) - WALL / 2 + (r() - 0.5) * 3), 1 + r() * 1.2, r() < 0.5 ? BARK2 : 0x6a5a7e, { mat: "flat", seg: 4 });
  }
  // 이끼 띠·빛 버섯 선반이 줄기에 붙어 있다
  for (let k = 0; k < 26; k++) {
    const a = r() * 360, y = 10 + r() * 90;
    if (trunkHole(a, y, 6) || y > top[Math.floor(a / 5) % 72] - 6) continue;
    const s = 2 + r() * 3, R0 = rOut(a, y) + s * 0.4, [x, yy, z] = wp(a, y, R0);
    w.mesh(capG(), M(x, yy, z, s, s * 0.35, s, 0, r() * 360, 0), k % 2 ? 0x7a4ac8 : 0x2a8a9a, "paint");
    w.mesh(capG(), M(x, yy - 0.1, z, s * 0.85, s * 0.12, s * 0.85, 180, 0, 0), k % 3 ? TEAL : PINK, "glow");
  }
  // 줄기 밑동 이끼 둔덕
  for (let k = 0; k < 40; k++) {
    const a = r() * 360;
    if (trunkHole(a, 1, 6)) continue;
    const [x, , z] = wp(a, 0, trunkR(0) + 1 + r() * 3);
    lump(w, x, GY0 + 0.3, z, 3 + r() * 3, 1 + r() * 1.4, 3 + r() * 3, r() < 0.5 ? MOSS : 0x3a7a5a, { mat: "flat" });
  }
}

// 뿌리 아치 둘레의 굵은 뿌리 테와 옹이구멍 테
function openings(w, K) {
  for (const o of OPEN) {
    const n = 12, pts = [];
    for (let k = 0; k <= n; k++) {
      const u = -1 + (2 * k) / n, yy = o.h * Math.sqrt(Math.max(0, 1 - u * u)) + 0.6;
      const s = u * (o.w + 1.6) / (36 * DEG);
      pts.push(wp(o.a + s, Math.max(0, yy), trunkR(Math.max(0, yy)) + 1.4));
    }
    for (let k = 0; k < n; k++) tube(w, ...pts[k], ...pts[k + 1], 2.1, BARK2, { mat: "flat", col: false });
    for (let k = 1; k < n; k++) tube(w, pts[k][0], pts[k][1] - 1.8, pts[k][2], pts[k + 1][0], pts[k + 1][1] - 1.8, pts[k + 1][2], 0.35, o.a === 90 ? TEAL : VIO2, { mat: "glow" });
    for (const p of [pts[0], pts[n]]) { lump(w, p[0], p[1] + 1, p[2], 4, 3, 4, BARK2, { mat: "flat" }); K.blink.add(p[0], p[1] + 4, p[2], TEAL, 0.5, 1); }
    const [px, , pz] = wp(o.a, 0, trunkR(0) + 6);
    w.pool(px, GY0, pz, o.w * 1.4, TEAL, 0.4);
  }
  // 옹이구멍: 혹진 테 + 빛
  const N = 14;
  for (let k = 0; k < N; k++) {
    const t = (k / N) * Math.PI * 2, s = Math.cos(t) * (KNOT.r + 1.4) / (30.5 * DEG), y = KNOT.y + Math.sin(t) * (KNOT.r + 1.4);
    const p = wp(KNOT.a + s, y, trunkR(y) + 0.8);
    lump(w, ...p, 2.2, 2.2, 2.2, k % 2 ? BARK2 : BARK3, { mat: "flat" });
    if (k % 2) bead(w, p[0], p[1], p[2] + 0.1, 0.45, PINK);
  }
}

// 버팀뿌리: 줄기 허리에서 갈라져 땅으로 내리꽂힌다(굵은 관 사슬 + 갈래 뿌리)
function buttresses(w, K) {
  const r = w.rand;
  for (const [a, R, h, t] of BUTTRESS) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10, rr = trunkR(h) - 1 + (R - trunkR(h) + 1) * u, y = h * Math.pow(1 - u, 1.6) - 1.5 * u;
      pts.push(wp(a + Math.sin(u * 3) * 2, y, rr));
    }
    for (let k = 0; k < 10; k++) {
      const tt = t * (1.3 - 0.6 * (k / 10));
      tube(w, ...pts[k], ...pts[k + 1], tt, k % 2 ? BARK : BARK2, { mat: "flat", col: true, tag: "어미나무" });
      lump(w, ...pts[k], tt * 1.15, tt * 1.15, tt * 1.15, BARK2, { mat: "flat" });
      if (k % 2 === 0) tube(w, pts[k][0], pts[k][1] + tt * 0.85, pts[k][2], pts[k + 1][0], pts[k + 1][1] + tt * 0.85, pts[k + 1][2], tt * 0.25, MOSS, { mat: "flat" });
    }
    const e = pts[10];
    for (let k = 0; k < 4; k++) {
      const b = a + (r() - 0.5) * 70, L = 8 + r() * 10;
      const q = [e[0] + Math.cos(b * DEG) * L, height(e[0] + Math.cos(b * DEG) * L, e[2] + Math.sin(b * DEG) * L) - 0.6, e[2] + Math.sin(b * DEG) * L];
      tube(w, ...e, ...q, t * 0.45, BARK3, { mat: "flat" });
    }
    // 뿌리 위에 핀 빛 버섯 무리
    for (let k = 2; k < 9; k += 3) { const p = pts[k]; w.mesh(capG(), M(p[0], p[1] + t, p[2], 1.6, 1.4, 1.6, 0, k * 40, 0), 0x7a4ac8, "paint"); w.mesh(capG(), M(p[0], p[1] + t - 0.1, p[2], 1.3, 0.3, 1.3, 180, 0, 0), LIME, "glow"); }
    K.blink.add(e[0], e[1] + t * 1.6, e[2], LIME, 0.45, a & 1);
  }
}

// ── 뿌리 공동: 남쪽 아치 앞 굵은 뿌리 갈비가 겹겹이 덮은 굴(길이 약 44 m) → 그루터기 안 → 심장 옹이 ──
export const CAVE = { z0: MT[1] + 44, z1: MT[1] + 92, hw: 13, h: 20 };
function rootCavern(w, K) {
  const r = w.rand, n = 7;
  for (let k = 0; k < n; k++) {
    const z = CAVE.z0 + (k / (n - 1)) * (CAVE.z1 - CAVE.z0), hw = CAVE.hw + k * 0.8 + r() * 1.5, H = CAVE.h - k * 0.6 + r() * 2;
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12, a = Math.PI * u, x = MT[0] - Math.cos(a) * hw, y = Math.sin(a) * H;
      pts.push([x + (r() - 0.5) * 0.6, height(x, z) + y - 0.5, z + Math.sin(u * 6 + k) * 1.5]);
    }
    for (let i = 0; i < 12; i++) {
      const t = 1.9 - 0.5 * Math.sin((i + 0.5) / 12 * Math.PI);
      tube(w, ...pts[i], ...pts[i + 1], t, i % 2 ? BARK : BARK2, { mat: "flat", col: true, tag: "뿌리" });
      if (i % 3 === 1) lump(w, ...pts[i], t * 1.4, t * 1.2, t * 1.4, BARK3, { mat: "flat" });
      tube(w, pts[i][0], pts[i][1] - t * 0.8, pts[i][2], pts[i + 1][0], pts[i + 1][1] - t * 0.8, pts[i + 1][2], t * 0.22, k % 2 ? TEAL : VIO2, { mat: "glow" });
    }
    // 갈비 사이를 덮는 세로 뿌리(지붕 그물)
    if (k > 0) {
      const z0 = CAVE.z0 + ((k - 1) / (n - 1)) * (CAVE.z1 - CAVE.z0);
      for (const i of [3, 5, 7, 9]) { const p = pts[i], x = p[0]; tube(w, x, p[1] + 0.5, z0, x, p[1] + 0.5, z, 1.1, BARK3, { mat: "flat" }); }
    }
    // 늘어진 빛 실뿌리(충돌 없음)
    for (let i = 3; i < 10; i += 2) { const p = pts[i], L = 3 + r() * 5; tube(w, p[0], p[1] - 1, p[2], p[0] + (r() - 0.5), p[1] - 1 - L, p[2], 0.12, LIME, { mat: "glow" }); bead(w, p[0], p[1] - 1 - L, p[2], 0.4, LIME); }
    K.blink.add(pts[1][0], pts[1][1] + 2, pts[1][2], TEAL, 0.5, k & 1);
    K.blink.add(pts[11][0], pts[11][1] + 2, pts[11][2], TEAL, 0.5, (k + 1) & 1);
  }
  // 굴 바닥: 빛 웅덩이와 이끼 혹
  for (let k = 0; k < 6; k++) { const z = CAVE.z0 + k * 9 + 4, x = (r() - 0.5) * 10; w.pool(x, height(x, z), z, 6, k % 2 ? TEAL : VIO, 0.45); }
  for (let k = 0; k < 14; k++) { const z = CAVE.z0 + r() * (CAVE.z1 - CAVE.z0), x = MT[0] + (r() < 0.5 ? -1 : 1) * (CAVE.hw - 2 + r() * 2); lump(w, x, height(x, z), z, 2 + r() * 2, 1 + r(), 2 + r() * 2, MOSS, { mat: "flat" }); }
  w.gap("뿌리 공동", MT[0], GY0 + 8, (CAVE.z0 + CAVE.z1) / 2, 0, CAVE.hw * 1.4, 12, 400, 0);
}

// 그루터기 안: 심장 옹이(맥박 치는 빛 덩어리)와 그것을 매단 뿌리 줄, 벽에 늘어진 빛 실
export const HEART = [MT[0], GY0 + HEART_Y, MT[1]];
function heartKnot(w, K) {
  const r = w.rand, [hx, hy, hz] = HEART;
  // 매단 뿌리: 위로 벽까지(코스보다 높이), 아래로 바닥까지(코스를 피해 서·북서·동)
  for (let k = 0; k < 7; k++) {
    const a = k * 51 + 20, y = 40 + r() * 16, p = wp(a, y, trunkR(y) - WALL + 0.5);
    const m = [(hx + p[0]) / 2, (hy + p[1]) / 2 + 4, (hz + p[2]) / 2];
    tube(w, hx, hy + 3, hz, ...m, 1.4, BARK2, { mat: "flat", col: true, tag: "어미나무" });
    tube(w, ...m, ...p, 1.1, BARK2, { mat: "flat", col: true, tag: "어미나무" });
    tube(w, hx, hy + 3, hz, ...m, 0.3, TEAL, { mat: "glow" });
  }
  for (const a of [135, 200, 245, 280]) {
    const p = wp(a, -0.5, 20);
    tube(w, hx, hy - 3, hz, (hx + p[0]) / 2, hy - 9, (hz + p[2]) / 2, 1.5, BARK, { mat: "flat", col: true, tag: "어미나무" });
    tube(w, (hx + p[0]) / 2, hy - 9, (hz + p[2]) / 2, ...p, 1.8, BARK, { mat: "flat", col: true, tag: "어미나무" });
    lump(w, ...p, 3.5, 1.5, 3.5, BARK2, { mat: "flat" });
  }
  // 옹이 껍질: 얽힌 혹(빛이 틈으로 새어 나온다)
  for (let k = 0; k < 9; k++) {
    const t = k * 2.4, e = Math.sin(k * 1.7) * 0.8;
    lump(w, hx + Math.cos(t) * 4.2 * Math.cos(e), hy + Math.sin(e) * 4, hz + Math.sin(t) * 4.2 * Math.cos(e), 2.4, 2, 2.4, k % 2 ? BARK2 : FLESH, { mat: "flat" });
  }
  w.col.addSphere(V3(hx, hy, hz), 4.6, "심장 옹이");
  // 맥박 치는 심(움직임): 빛 구 + 바깥 후광
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.2, 1.9) }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(6.5, 20, 12), new THREE.MeshBasicMaterial({ color: 0x3ff0d8, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.position.set(hx, hy, hz); halo.position.copy(core.position);
  w.scene.add(core, halo); w.disposables.push(core.geometry, core.material, halo.geometry, halo.material);
  w.updaters.push((dt, t) => {
    const b = Math.pow(Math.max(0, Math.sin(t * 2.4)), 6) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 2.4 - 0.7)), 8);
    core.scale.setScalar(1 + b * 0.16); halo.scale.setScalar(1 + b * 0.35); halo.material.opacity = 0.14 + b * 0.2;
  });
  // 노래 조각: 옹이 위를 도는 빛 고리 둘
  const rings = [];
  for (let k = 0; k < 2; k++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(7 + k * 2, 0.18, 4, 40), new THREE.MeshBasicMaterial({ color: k ? new THREE.Color(1.8, 0.8, 2.2) : new THREE.Color(0.6, 2.2, 1.8) }));
    m.position.set(hx, hy, hz); w.scene.add(m); w.disposables.push(m.geometry, m.material); rings.push(m);
  }
  w.updaters.push((dt, t) => { rings[0].rotation.set(t * 0.5, t * 0.3, 0); rings[1].rotation.set(-t * 0.35, 0, t * 0.45); });
  w.pool(hx, GY0, hz, 22, TEAL, 0.55);
  w.shaft(hx, GY0 + 130, hz, 4, 22, 130, 0x7affe0, 0.05);
  // 안벽에 늘어진 빛 실과 버섯 선반
  for (let k = 0; k < 40; k++) {
    const a = r() * 360, y = 30 + r() * 70;
    if (trunkHole(a, y, 4)) continue;
    const p = wp(a, y, rIn(a, y) - 0.4), L = 4 + r() * 10;
    tube(w, ...p, p[0], p[1] - L, p[2], 0.1, k % 3 ? LIME : PINK, { mat: "glow" });
    bead(w, p[0], p[1] - L, p[2], 0.35, k % 3 ? LIME : PINK);
  }
  for (let k = 0; k < 18; k++) {
    const a = r() * 360, y = 14 + r() * 80;
    if (trunkHole(a, y, 5)) continue;
    const s = 2.4 + r() * 2.5, p = wp(a, y, rIn(a, y) - s * 0.5);
    w.mesh(capG(), M(...p, s, s * 0.3, s, 0, r() * 360, 0), 0x5a3a9a, "paint");
    w.mesh(capG(), M(p[0], p[1] - 0.1, p[2], s * 0.85, s * 0.12, s * 0.85, 180, 0, 0), TEAL, "glow");
  }
  // 안벽 발광 혈관: 나선으로 감아 오르며 공동을 밝힌다
  for (let k = 0; k < 8; k++) {
    let prev = null, a = k * 45 + 20;
    const col = [TEAL, VIO2, LIME, PINK][k % 4];
    for (let y = 2; y < 104; y += 3) {
      a -= 2.6 + Math.sin(y * 0.08 + k) * 1.2;
      if (trunkHole(a, y, 2)) { prev = null; continue; }
      const p = wp(a, y, rIn(a, y) - 0.5);
      if (prev) tube(w, ...prev, ...p, 0.4, col, { mat: "glow" });
      prev = p;
    }
  }
  // 안벽 빛 띠(나이테처럼 둘러진 발광 이끼): 아치 자리는 건너뛴다
  for (const y of [26, 46, 66, 86]) {
    let prev = null;
    for (let a = 0; a <= 360; a += 6) {
      if (trunkHole(a, y, 2)) { prev = null; continue; }
      const p = wp(a, y + Math.sin(a * DEG * 3) * 1.5, rIn(a, y) - 0.4);
      if (prev) tube(w, ...prev, ...p, 0.3, y % 40 === 26 ? TEAL : VIO2, { mat: "glow" });
      prev = p;
    }
  }
  for (const [a, y] of [[60, 40], [150, 60], [240, 34], [330, 70], [20, 90], [200, 96]]) w.shaft(...wp(a, y + 30, 14), 2, 7, 36, k2c(a), 0.05);
  // 바닥 이끼와 빛 웅덩이
  for (let k = 0; k < 20; k++) { const a = r() * 360, d = 8 + r() * 22, x = MT[0] + Math.cos(a * DEG) * d, z = MT[1] + Math.sin(a * DEG) * d; lump(w, x, GY0, z, 1.5 + r() * 2, 0.6 + r() * 0.6, 1.5 + r() * 2, r() < 0.5 ? MOSS : 0x5a3a8a, { mat: "flat" }); }
}

const k2c = (a) => [TEAL, VIO2, LIME, PINK][Math.floor(a / 90) % 4];
export function motherTree(w, K) {
  const top = trunkWall(w);
  trunkSkin(w, K, top);
  openings(w, K);
  buttresses(w, K);
  rootCavern(w, K);
  heartKnot(w, K);
  w.gap("남쪽 뿌리 아치", ...wp(90, 8, trunkR(8)).filter((_, i) => i !== 1).slice(0, 1), GY0 + 8, wp(90, 8, trunkR(8))[2], 0, 14, 14, 300);
  { const p = wp(315, 8, trunkR(8)); w.gap("북동 뿌리 아치", p[0], p[1], p[2], -45, 14, 14, 300); }
  { const p = wp(180, 8, trunkR(8)); w.gap("서쪽 뿌리 아치", p[0], p[1], p[2], 90, 14, 14, 300); }
  { const p = wp(KNOT.a, KNOT.y, trunkR(KNOT.y)); w.gap("옹이구멍", p[0], p[1], p[2], 70, 12, 12, 450); }
  K.blink.add(...wp(10, trunkTop(10) + 2, trunkR(100) - 2), PINK, 0.8, 0);
}

// ── 거대 버섯: 굽은 대 + 갓 + 빛 주름 + 갓 위 둥지 집 ──
export function giantShroom(w, K, c) {
  const r = w.rand, gy = height(c.x, c.z), sr = c.sr ?? 1.6 + c.H * 0.038, tone = c.tone ?? 0;
  const la = hash(Math.round(c.x * 7), Math.round(c.z * 7)) * Math.PI * 2, lean = c.lean ?? c.R * 0.18;
  const tx = c.x + Math.cos(la) * lean, tz = c.z + Math.sin(la) * lean, ty = gy + c.H;
  const N = Math.max(4, Math.round(c.H / 12));
  let prev = [c.x, gy - 1, c.z];
  for (let k = 1; k <= N; k++) {
    const u = k / N, e = Math.sin(u * Math.PI / 2);
    const p = [c.x + (tx - c.x) * e, gy + c.H * u, c.z + (tz - c.z) * e], rr = sr * (1.35 - 0.4 * u);
    tube(w, ...prev, ...p, rr, k % 2 ? 0xd8c8f0 : 0xc4b0e4, { mat: "paint", col: true, tag: "버섯", seg: 12 });
    if (k < N) ring(w, p[0], p[1], p[2], rr * 1.03, 0.25, k % 2 ? TEAL : VIO2, { pitch: 90, col: false, mat: "glow", seg: 18 });
    prev = p;
  }
  // 밑동 혹뿌리
  for (let k = 0; k < 5; k++) { const a = k * 72 + r() * 30; lump(w, c.x + Math.cos(a * DEG) * sr * 1.6, gy + 0.4, c.z + Math.sin(a * DEG) * sr * 1.6, sr * 1.1, sr * 0.6, sr * 1.1, 0xb8a4d8, { mat: "flat" }); }
  // 턱받이(대 허리의 치마)
  if (c.H > 40) w.mesh(capG(), M(c.x + (tx - c.x) * 0.5, gy + c.H * 0.62, c.z + (tz - c.z) * 0.5, sr * 3, -sr * 1.2, sr * 3, 0, 0, 0), 0xe0d0f8, "paint");
  // 갓
  const ry = r() * 360;
  w.mesh(capG(), M(tx, ty, tz, c.R, c.R * 0.85, c.R, 0, ry, 0), c.cap ?? CAP_COL[tone], "paint");
  w.mesh(capG(), M(tx, ty - c.R * 0.05, tz, c.R * 0.9, c.R * 0.22, c.R * 0.9, 180, 0, 0), GILL[tone], "glow");
  w.mesh(capG(), M(tx, ty - 0.2, tz, c.R * 1.02, c.R * 0.12, c.R * 1.02, 0, ry, 0), 0x2a1a48, "flat");
  const q = new THREE.Quaternion();
  for (const a of [0, 45]) { q.setFromEuler(new THREE.Euler(0, a * DEG, 0)); w.col.addBox(V3(tx, ty + c.R * 0.18, tz), V3(c.R * 0.74, c.R * 0.24, c.R * 0.74), q, "버섯"); }
  // 갓 무늬: 밝은 반점
  for (let k = 0; k < 10; k++) {
    const a = r() * Math.PI * 2, d = 0.25 + r() * 0.6, yy = Math.cos(d * Math.PI / 2) * 0.55 * 0.85;
    bead(w, tx + Math.cos(a) * d * c.R * 0.98, ty + yy * c.R + 0.2, tz + Math.sin(a) * d * c.R * 0.98, c.R * (0.05 + r() * 0.05), tone === 1 ? 0xb0fff0 : 0xffb0f0, "paint");
  }
  // 갓 가장자리에 늘어진 빛 실
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + r() * 0.3, x = tx + Math.cos(a) * c.R * 0.92, z = tz + Math.sin(a) * c.R * 0.92, L = 3 + r() * 7;
    tube(w, x, ty - 0.5, z, x, ty - 0.5 - L, z, 0.09, GILL[tone], { mat: "glow" });
    bead(w, x, ty - 0.5 - L, z, 0.3, GILL[tone]);
  }
  // 갓 위 에일 둥지 집
  for (let k = 0; k < (c.hut || 0); k++) {
    const a = r() * Math.PI * 2, d = k === 0 ? 0 : c.R * 0.42, x = tx + Math.cos(a) * d, z = tz + Math.sin(a) * d;
    const yy = ty + c.R * 0.85 * 0.55 * Math.cos((d / c.R) * Math.PI / 2) - 0.6;
    shellDome(w, K, x, z, yy, 2.4 + r() * 1.6, { light: GILL[tone] });
  }
  w.pool(c.x, gy, c.z, c.R * 0.8, GILL[tone], 0.3);
  K.blink.add(tx, ty + c.R * 0.52, tz, GILL[tone], 0.7, tone & 1);
  return [tx, ty, tz];
}

export const CAPTOP = {};
export function shrooms(w, K) {
  for (const c of CAPS) CAPTOP[c.id] = giantShroom(w, K, c);
  for (const [k, c] of MID.entries()) CAPTOP["m" + k] = giantShroom(w, K, { ...c, tone: k + 1, hut: 0, lean: 1.5 });
}

// ── 덩굴다리: 갓과 갓 사이·갓과 줄기 사이에 늘어진 빛 덩굴 ──
function vine(w, K, a, b, sag, col, o = {}) {
  const n = 14, pts = [];
  for (let k = 0; k <= n; k++) { const u = k / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]); }
  for (let k = 0; k < n; k++) {
    tube(w, ...pts[k], ...pts[k + 1], 0.7, 0x3a5a4a, { mat: "flat", col: true, tag: "덩굴" });
    tube(w, pts[k][0], pts[k][1] + 0.9, pts[k][2], pts[k + 1][0], pts[k + 1][1] + 0.9, pts[k + 1][2], 0.35, 0x2a4a3a, { mat: "flat" });
    if (k % 2) { bead(w, ...pts[k], 0.8, col); const L = 2 + (k % 3) * 2; tube(w, ...pts[k], pts[k][0], pts[k][1] - L, pts[k][2], 0.08, col, { mat: "glow" }); }
    // 이파리
    if (k % 3 === 0) w.mesh(capG(), M(pts[k][0], pts[k][1] + 0.6, pts[k][2], 1.4, 0.4, 1.4, 0, k * 30, 0), 0x2a9a6a, "paint");
  }
  K.blink.add(...pts[n >> 1], col, 0.55, 1);
  if (o.gap) { const m = pts[n >> 1], yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]) / DEG; w.gap(o.gap, m[0], m[1] - 6, m[2], yaw, Math.hypot(b[0] - a[0], b[2] - a[2]) * 0.5, 10, 250); }
  return pts;
}
export function vines(w, K) {
  for (const [i, j] of CHORDS) {
    const A = CAPTOP["r" + i], B = CAPTOP["r" + j], ca = capOf(i), cb = capOf(j);
    const d = [B[0] - A[0], B[2] - A[2]], L = Math.hypot(...d), ux = d[0] / L, uz = d[1] / L;
    vine(w, K, [A[0] + ux * ca.R * 0.8, A[1] - 1, A[2] + uz * ca.R * 0.8], [B[0] - ux * cb.R * 0.8, B[1] - 1, B[2] - uz * cb.R * 0.8], 12, i % 4 ? TEAL : LIME, { gap: "덩굴다리 밑" });
  }
  for (const [i, y] of SPOKES) {
    const A = CAPTOP["r" + i], c = capOf(i), dx = MT[0] - A[0], dz = MT[1] - A[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const tr = trunkR(y) + 0.5;
    vine(w, K, [A[0] + ux * c.R * 0.8, A[1] - 1, A[2] + uz * c.R * 0.8], [MT[0] - ux * tr, GY0 + y, MT[1] - uz * tr], 10, PINK);
  }
}
