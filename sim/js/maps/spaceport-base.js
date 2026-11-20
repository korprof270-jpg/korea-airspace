// 제국 궤도 발사기지 바탕: 해안 지형과 바다, 안벽, 도로·바닥 표식, 그리고 주인공 구조물 — 궤도 엘리베이터(닻 기단·격자 축·테더·승강차)
import {
  THREE, M, beam, prop, ring, V3, DEG, hash, sm, height, colorFn, coast, madeD, local, paint, strip, slab, circle, ringCol, truss,
  BLK, BLK2, IRON, STEEL, GUN, RED, RED2, DRED, HAZ, CONC2, CONC3, ASPH, ASPH2, WHT,
  WY, SEA, ELEV, DRUM_R, WELL_R, RING_R, TUN, SHAFT, PADS, PAD_R, QUAY_Z, PIERS, MOLE, MOLE_R, BASTION, TIP, PLATS, eastX,
} from "./spaceport-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);

// ── 지형과 바다 ──
export function ground(w) {
  w.terrain(height, colorFn, { flat: "concrete", flatTint: "1.12, 1.12, 1.1", rockTint: "0.9, 0.9, 0.92", rockLo: 0.3, rockHi: 0.55 });
  w.water(WY, 0x1d5f78);
}

// ── 안벽: 인공 지반 가장자리를 따라 수직 콘크리트 벽(경사면을 가린다). 다른 지반과 겹치는 구간은 건너뛴다 ──
const solid = (x, z) => Math.max(coast(x, z), madeD(x, z));
function wallRun(w, a, b, color) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = dz / L, nz = -dx / L, n = Math.max(1, Math.round(L / 6)), ry = Math.atan2(-dz, dx) / DEG;
  let s0 = -1;
  const flush = (i) => {
    if (s0 < 0) return;
    const t0 = s0 / n, t1 = i / n, mx = a[0] + dx * (t0 + t1) / 2 + nx * 2.3, mz = a[1] + dz * (t0 + t1) / 2 + nz * 2.3, len = L * (t1 - t0);
    w.box(mx, SEA, mz, len + 0.6, -SEA + 0.3, 4.6, color, { ry, mat: "std:concrete", tile: 7, col: false });
    w.box(mx + nx * 1.9, 0.3, mz + nz * 1.9, len + 0.6, 0.12, 0.8, HAZ, { ry, col: false, ao: false });
    s0 = -1;
  };
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, px = a[0] + dx * t + nx * 2.6, pz = a[1] + dz * t + nz * 2.6;
    if (solid(px, pz) < -1.6) { if (s0 < 0) s0 = i; } else flush(i);
  }
  flush(n);
}
function wallRing(w, cx, cz, R, n, color) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    if (solid(cx + Math.cos(am) * (R + 2.8), cz + Math.sin(am) * (R + 2.8)) > -1.6) continue;
    const k = R / Math.cos(Math.PI / n);
    wallRun(w, [cx + Math.cos(a0) * k, cz + Math.sin(a0) * k], [cx + Math.cos(a1) * k, cz + Math.sin(a1) * k], color);
  }
}
export function quays(w) {
  wallRun(w, [84, QUAY_Z], [-130, QUAY_Z], CONC2);                                  // 남쪽 안벽 (바깥 = +z)
  wallRun(w, [eastX(-18), -18], [eastX(QUAY_Z), QUAY_Z], CONC2);                    // 동쪽 안벽 (바깥 = +x)
  for (const p of PIERS) {
    wallRun(w, [p.x - p.hw, p.z1], [p.x - p.hw, QUAY_Z], CONC2);
    wallRun(w, [p.x + p.hw, QUAY_Z], [p.x + p.hw, p.z1], CONC2);
    wallRun(w, [p.x + p.hw + 4.6, p.z1], [p.x - p.hw - 4.6, p.z1], CONC2);
  }
  for (let i = 0; i < 2; i++) {
    const a = MOLE[i], b = MOLE[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = dz / L * MOLE_R, nz = -dx / L * MOLE_R;
    wallRun(w, [a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], CONC3);
    wallRun(w, [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz], CONC3);
  }
  wallRing(w, BASTION[0], BASTION[1], BASTION[2], 20, CONC3);
  wallRing(w, TIP[0], TIP[1], TIP[2], 12, CONC3);
  wallRing(w, MOLE[0][0], MOLE[0][1], MOLE_R, 12, CONC3);
  for (const [x, z, R] of PLATS) wallRing(w, x, z, R, 16, BLK2);
}

// ── 도로와 바닥 표식 ──
export function roads(w, ROAD) {
  // 보급 도로(부두 → 중앙 발사대): 아스팔트 띠 + 가운데 점선
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i], b = ROAD[i + 1];
    strip(w, a, b, 9, ASPH, 0.06);
    w.cyl(b[0], 0.01, b[1], 4.5, 0.1, ASPH, { col: false, ao: false, mat: "std:asphalt" });
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(L / 8), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / DEG;
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; paint(w, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 3, 0.3, WHT, 0.12, ry); }
  }
  // 발사대를 잇는 궤도 운반로(넓은 자갈 길 두 줄)
  for (let i = 0; i < PADS.length - 1; i++) {
    const a = PADS[i], b = PADS[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), nx = dz / L, nz = -dx / L, k0 = (PAD_R + 2) / L;
    for (const s of [-6, 6]) strip(w, [a.x + dx * k0 + nx * s, a.z + dz * k0 + nz * s], [b.x - dx * k0 + nx * s, b.z - dz * k0 + nz * s], 5, 0x77736a, 0.05, "std:concrete");
  }
  // 엘리베이터 둘레 순환로와 네 방향 진입로
  const [ex, ez] = ELEV;
  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2, R = RING_R + 10;
    strip(w, [ex + Math.cos(a0) * R, ez + Math.sin(a0) * R], [ex + Math.cos(a1) * R, ez + Math.sin(a1) * R], 7, ASPH2, 0.055);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    strip(w, [ex + dx * 8, ez + dz * 8], [ex + dx * (RING_R + 10), ez + dz * (RING_R + 10)], 12, ASPH2, 0.05);
    for (let k = 0; k < 6; k++) { const d = DRUM_R + 3 + k * 4; paint(w, ex + dx * d, ez + dz * d, dx ? 1.6 : 9, dx ? 9 : 1.6, k % 2 ? HAZ : BLK, 0.11); }
    for (const s of [-1, 1]) w.box(ex + dx * (DRUM_R + 14) + dz * s * 6.4, 0.1, ez + dz * (DRUM_R + 14) + dx * s * 6.4, dx ? 26 : 0.35, 0.06, dx ? 0.35 : 26, RED, { mat: "glow", col: false });
  }
  // 계류장 유도선과 정지 표식
  for (const z of [22, 58]) for (let x = -120; x < 70; x += 10) paint(w, x, z, 5, 0.4, HAZ, 0.1);
  for (const p of PIERS) {
    for (let z = QUAY_Z + 6; z < p.z1 - 4; z += 9) paint(w, p.x, z, 0.35, 4, WHT, 0.1);
    for (const s of [-1, 1]) w.box(p.x + s * (p.hw - 1.4), 0.08, (QUAY_Z + p.z1) / 2, 0.5, 0.05, p.z1 - QUAY_Z - 6, HAZ, { col: false, ao: false });
  }
  // 안벽 가장자리 안전선
  w.box(-25, 0.08, QUAY_Z - 3, 205, 0.05, 0.6, HAZ, { col: false, ao: false });
}

// ═══════════ 궤도 엘리베이터 ═══════════
const OPEN = { 1: "NS", 3: "EWN", 4: "NE", 5: "NE", 7: "NSEW" };   // 층별로 가새를 비운 면(관통 비행로)
export function elevator(w, K) {
  const [cx, cz] = ELEV, hw = TUN.hw, R = DRUM_R, r = WELL_R;
  const P = (u, v) => [cx + u, cz + v];
  // 바닥 판과 우물 바닥의 붉은 문양
  w.cyl(cx, 0.02, cz, R + 6, 0.12, 0x3a3c42, { col: false, ao: false, mat: "std:panel", tile: 8 });
  for (const [rr, c] of [[r - 1, RED], [7, RED2], [3, RED]]) ring(w, cx, 0.2, cz, rr, 0.22, c, { pitch: 90, col: false, mat: "glow", seg: 40 });
  w.pool(cx, 0.1, cz, 16, RED, 0.5);
  // 기단 1단: 십자 터널이 뚫린 네 덩어리 (0 → 터널 높이)
  const ai = Math.asin(hw / r), ao = Math.asin(hw / R), arc = (rad, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [Math.cos(a) * rad, Math.sin(a) * rad]; });
  const quad = [...arc(r, ai, Math.PI / 2 - ai, 3), ...arc(R, Math.PI / 2 - ao, ao, 8)];
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) slab(w, quad.map(([x, z]) => [cx + x * sx, cz + z * sz]), 0, TUN.h, BLK, "std:panel");
  for (let x = hw + 2; x < R; x += 4) {
    const zo = Math.sqrt(Math.max(0, R * R - x * x)), zi = Math.max(hw, x < r ? Math.sqrt(r * r - x * x) : 0);
    if (zo - zi < 0.8) continue;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.col.addBox(V3(cx + sx * x, TUN.h / 2, cz + sz * (zi + zo) / 2), V3(2, TUN.h / 2, (zo - zi) / 2));
  }
  // 기단 2단(뚜껑): 가운데 우물만 뚫린 고리, 그 위 3단
  const T1 = 25, T2 = SHAFT.y0;
  slab(w, circle(cx, cz, R, 40), TUN.h, T1, BLK2, "std:panel", [circle(cx, cz, r, 24)]);
  ringCol(w, cx, cz, r, R, TUN.h, T1, 4);
  slab(w, circle(cx, cz, R - 8, 40), T1, T2, BLK, "std:panel", [circle(cx, cz, r, 24)]);
  ringCol(w, cx, cz, r, R - 8, T1, T2, 4);
  // 띠 장식: 붉은 틈, 흉벽, 난간
  ring(w, cx, TUN.h + 0.6, cz, R + 0.3, 0.5, IRON, { pitch: 90, col: false, seg: 48 });
  ring(w, cx, T1 - 4, cz, R + 0.15, 0.35, RED, { pitch: 90, col: false, mat: "glow", seg: 48 });
  ring(w, cx, T1 + 0.4, cz, R - 0.4, 0.6, STEEL, { pitch: 90, col: false, seg: 48 });
  ring(w, cx, T2 - 3, cz, R - 7.85, 0.3, RED, { pitch: 90, col: false, mat: "glow", seg: 48 });
  ring(w, cx, T2 + 0.3, cz, R - 8.4, 0.6, STEEL, { pitch: 90, col: false, seg: 48 });
  ring(w, cx, T2 + 0.5, cz, r + 0.6, 0.5, RED, { pitch: 90, col: false, mat: "glow", seg: 40 });
  for (let i = 0; i < 32; i++) {
    const a = (i + 0.5) / 32 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), ry = -a / DEG;
    w.box(cx + c * (R - 1.2), T1, cz + s * (R - 1.2), 2.2, 2.2, 4.2, i % 2 ? IRON : BLK2, { ry, col: false, mat: "paint" });
    if (i % 2) w.box(cx + c * (R + 0.1), 3, cz + s * (R + 0.1), 0.2, TUN.h - 5, 0.7, RED, { ry, col: false, mat: "glow" });
    if (i % 4 === 0) K.blink.add(cx + c * (R - 1.2), T1 + 3, cz + s * (R - 1.2), RED, 0.45, i / 4);
  }
  // 터널 문틀과 안쪽 붉은 유도등
  for (const [dx, dz, nm] of [[1, 0, "동문"], [-1, 0, "서문"], [0, 1, "남문"], [0, -1, "북문"]]) {
    const ox = cx + dx * (R + 0.6), oz = cz + dz * (R + 0.6), ry = dx ? 90 : 0;
    for (const s of [-1, 1]) {
      w.box(ox + dz * s * (hw + 2), 0, oz + dx * s * (hw + 2), 4, TUN.h + 5, 4, IRON, { ry, mat: "std:panel", tile: 5 });
      w.box(ox + dz * s * (hw + 0.2) + dx * 2.1, 1, oz + dx * s * (hw + 0.2) + dz * 2.1, 0.3, TUN.h - 2, 0.3, RED, { mat: "glow", col: false });
    }
    w.box(ox, TUN.h, oz, hw * 2 + 8, 5, 4, IRON, { ry, mat: "std:panel", tile: 5 });
    w.box(ox + dx * 2.1, TUN.h + 1.6, oz + dz * 2.1, hw * 2 - 2, 1.2, 0.3, RED, { ry, mat: "glow", col: false });
    for (let d = r + 3; d < R; d += 5) for (const s of [-1, 1]) w.box(cx + dx * d + dz * s * (hw - 0.15), TUN.h - 1.6, cz + dz * d + dx * s * (hw - 0.15), dx ? 2.4 : 0.2, 0.35, dx ? 0.2 : 2.4, RED2, { mat: "glow", col: false });
    w.gap(`엘리베이터 ${nm} 터널`, cx + dx * (R - 8), TUN.h / 2, cz + dz * (R - 8), ry, hw * 2 - 2, TUN.h - 2, 400);
  }
  // 버팀 날개: 2단 위에서 축으로 기대는 여덟 장
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    beam(w, [cx + c * (R - 10), T2, cz + s * (R - 10)], [cx + c * 17, T2 + 18, cz + s * 17], 1.8, IRON, { tw: 1.2 });
    beam(w, [cx + c * (R - 10), T2 + 0.4, cz + s * (R - 10)], [cx + c * 17, T2 + 18.4, cz + s * 17], 0.5, RED, { mat: "glow", col: false, tw: 1.3 });
  }
  // 바깥 성곽: 네 문이 난 고리 벽 + 문탑
  const N = 48, gateA = Math.asin(12 / RING_R);
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * Math.PI * 2, q = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    if (Math.min(q, Math.PI / 2 - q) < gateA + Math.PI / N) continue;
    const c = Math.cos(a), s = Math.sin(a), len = 2 * RING_R * Math.tan(Math.PI / N) + 0.3, ry = -a / DEG;
    w.box(cx + c * RING_R, 0, cz + s * RING_R, 3.4, 8, len, BLK2, { ry, mat: "std:panel", tile: 6 });
    w.box(cx + c * RING_R, 8, cz + s * RING_R, 4.2, 0.8, len, IRON, { ry, col: false });
    w.box(cx + c * (RING_R + 1.75), 5.2, cz + s * (RING_R + 1.75), 0.15, 0.5, len * 0.7, RED, { ry, col: false, mat: "glow" });
    if (i % 3 === 0) w.box(cx + c * RING_R, 8.8, cz + s * RING_R, 4.2, 1.4, 2.4, BLK, { ry, col: false });
  }
  for (const [dx, dz, nm] of [[1, 0, "동"], [-1, 0, "서"], [0, 1, "남"], [0, -1, "북"]]) {
    const gx = cx + dx * RING_R, gz = cz + dz * RING_R, ry = dx ? 90 : 0;
    for (const s of [-1, 1]) {
      const px = gx + dz * s * 13.5, pz = gz + dx * s * 13.5;
      w.box(px, 0, pz, 5.5, 18, 5.5, BLK, { mat: "std:panel", tile: 6 });
      w.box(px, 18, pz, 6.3, 1, 6.3, STEEL, { col: false });
      w.box(px + dx * 2.8, 3, pz + dz * 2.8, dx ? 0.2 : 0.8, 12, dx ? 0.8 : 0.2, RED, { mat: "glow", col: false });
      w.box(px - dx * 2.8, 3, pz - dz * 2.8, dx ? 0.2 : 0.8, 12, dx ? 0.8 : 0.2, RED, { mat: "glow", col: false });
      K.blink.add(px, 20, pz, RED, 0.5, s > 0 ? 0 : 1);
    }
    w.box(gx, 14, gz, 27, 3, 3.2, IRON, { ry, mat: "std:panel", tile: 5 });
    w.box(gx + dx * 1.7, 14.8, gz + dz * 1.7, 20, 0.9, 0.2, RED, { ry, mat: "glow", col: false });
    w.gap(`성곽 ${nm}문`, gx, 7, gz, ry, 20, 13, 300);
  }
  shaft(w, K);
}

// 격자 축: 네 귀 기둥 + 층마다 고리 들보 + 가새. OPEN 에 적힌 면은 비워 관통할 수 있다. 위로는 구름 속까지 이어진다
function shaft(w, K) {
  const [cx, cz] = ELEV, { half, y0, lh, levels } = SHAFT, top = y0 + lh * levels;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    w.box(cx + sx * half, y0, cz + sz * half, 3, top - y0, 3, BLK, { mat: "std:panel", tile: 6 });
    w.box(cx + sx * (half + 1.55), y0 + 2, cz + sz * (half + 1.55), 0.3, top - y0 - 4, 0.3, RED, { mat: "glow", col: false });
  }
  const FACE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  for (let k = 0; k <= levels; k++) {
    const y = y0 + k * lh;
    for (const f of "NSEW") {
      const [dx, dz] = FACE[f], fx = cx + dx * half, fz = cz + dz * half, ax = dz ? 1 : 0, az = dx ? 1 : 0;   // 면을 따라가는 축
      const tall = (OPEN[k - 1] || "").includes(f) && (OPEN[k] || "").includes(f);                         // 두 층을 튼 큰 창: 사이 들보를 뺀다
      if (!tall && k > 0) {
        w.box(fx, y - 1, fz, ax ? half * 2 - 3 : 1.6, 2, az ? half * 2 - 3 : 1.6, IRON, { mat: "paint" });
        if (k % 2 === 0) w.box(fx + dx * 0.85, y - 0.5, fz + dz * 0.85, ax ? half * 2 - 5 : 0.15, 0.5, az ? half * 2 - 5 : 0.15, RED, { mat: "glow", col: false });
      }
      if (k === levels) continue;
      if ((OPEN[k] || "").includes(f)) {
        // 열린 면: 창틀 불빛
        for (const s of [-1, 1]) w.box(fx + ax * s * (half - 1.7), y + 1, fz + az * s * (half - 1.7), 0.25, lh - 3, 0.25, HAZ, { mat: "glow", col: false });
        continue;
      }
      const a = [fx - ax * (half - 1.5), y, fz - az * (half - 1.5)], b = [fx + ax * (half - 1.5), y + lh - 2, fz + az * (half - 1.5)];
      beam(w, a, b, 0.7, STEEL, { col: false }); beam(w, [a[0], b[1], a[2]], [b[0], a[1], b[2]], 0.7, STEEL, { col: false });
      w.col.addBox(V3(fx, y + lh / 2 - 1, fz), V3(ax ? half - 1.5 : 0.5, lh / 2 - 1, az ? half - 1.5 : 0.5));
    }
    if (k % 2 === 0 && k < levels) for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.blink.add(cx + sx * (half + 2), y + lh, cz + sz * (half + 2), RED, 0.5, k / 2);
  }
  w.gap("엘리베이터 축 남북 관통", cx, y0 + lh * 1.5, cz, 0, half * 2 - 4, lh - 3, 700);
  w.gap("엘리베이터 축 동서 관통", cx, y0 + lh * 3.5, cz, 90, half * 2 - 4, lh - 3, 700);
  w.gap("엘리베이터 축 꼭대기 창", cx, y0 + lh * 7.5, cz, 0, half * 2 - 4, lh - 3, 900);
  // 천장 위: 구름까지 이어지는 격자(충돌 없음) → 한 줄 테더
  const parts = [], glow = [], T = 1040;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push([BOXG, M(cx + sx * half, (top + T) / 2, cz + sz * half, 3, T - top, 3), BLK]);
  for (let y = top + lh; y < T; y += lh) {
    for (const s of [-1, 1]) { parts.push([BOXG, M(cx, y, cz + s * half, half * 2, 2, 1.6), IRON]); parts.push([BOXG, M(cx + s * half, y, cz, 1.6, 2, half * 2), IRON]); }
    if (Math.round((y - top) / lh) % 3 === 0) for (const s of [-1, 1]) glow.push([BOXG, M(cx, y, cz + s * (half + 0.9), half * 2 - 4, 0.8, 0.3), RED], [BOXG, M(cx + s * (half + 0.9), y, cz, 0.3, 0.8, half * 2 - 4), RED]);
    const d = Math.round((y - top) / lh) % 2 ? 1 : -1;
    for (const s of [-1, 1]) {
      parts.push([BOXG, M(cx, y - lh / 2, cz + s * half, 0.7, Math.hypot(lh, half * 2), 0.7, 0, 0, d * s * Math.atan2(half * 2, lh) / DEG), STEEL]);
      parts.push([BOXG, M(cx + s * half, y - lh / 2, cz, 0.7, Math.hypot(lh, half * 2), 0.7, d * s * Math.atan2(half * 2, lh) / DEG, 0, 0), STEEL]);
    }
  }
  parts.push([BOXG, M(cx, T + 30, cz, half * 2 + 6, 60, half * 2 + 6), BLK2]);
  parts.push([BOXG, M(cx, T + 60 + 1500, cz, 5, 3000, 1.6), BLK]);
  for (let y = T + 100; y < T + 2600; y += 120) glow.push([BOXG, M(cx, y, cz, 5.4, 6, 2), RED]);
  glow.push([BOXG, M(cx, T + 30, cz, half * 2 + 6.4, 3, half * 2 + 6.4), RED]);
  const hi = prop(w, parts, "paint", false); hi.frustumCulled = false;
  const hg = prop(w, glow, "glow", false); hg.frustumCulled = false;
  climbers(w);
}

// 승강차: 축의 북동·남서 모서리 바깥을 타고 오르내린다 (낮은 구간에서는 충돌체가 따라다닌다)
function climbers(w) {
  const [cx, cz] = ELEV, { half, y0 } = SHAFT, cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
  const mk = () => {
    const m = prop(w, [
      [BOXG, M(0, 0, 0, 6, 9, 6), BLK2], [BOXG, M(0, 5.2, 0, 4.4, 1.4, 4.4), IRON], [BOXG, M(0, -5.2, 0, 4.4, 1.4, 4.4), IRON],
      [cyl, M(0, 7.6, 0, 1.2, 3.4, 1.2), STEEL], [BOXG, M(0, 0, 0, 6.3, 0.5, 6.3), DRED], [BOXG, M(0, 2.6, 0, 6.3, 0.3, 6.3), DRED],
    ], "paint");
    const g = prop(w, [[BOXG, M(0, -2.2, 0, 6.2, 0.9, 6.2), RED], [BOXG, M(0, 3.6, 0, 6.2, 0.4, 6.2), RED2], [BOXG, M(0, -6.2, 0, 3, 0.5, 3), 0xffd0a0]], "glow", false);
    m.add(g); g.position.set(0, 0, 0);
    return m;
  };
  const cars = [[1, -1, 0], [-1, 1, 0.5]].map(([sx, sz, ph]) => {
    const m = mk(); m.position.set(cx + sx * (half + 4.6), y0 + 20, cz + sz * (half + 4.6));
    w.rider(m, [[0, 0, 0, 3.1, 5.6, 3.1]]);
    return { m, ph };
  });
  w.updaters.push((dt, t) => { for (const c of cars) { const u = (t / 70 + c.ph) % 1, k = u < 0.5 ? u * 2 : 2 - u * 2, e = k * k * (3 - 2 * k); c.m.position.y = y0 + 12 + e * 560; } });
}
