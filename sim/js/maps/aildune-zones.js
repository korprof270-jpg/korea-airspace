// 유리 사막의 구역들
//  · 북서: 빈 합창의 가시 둥지 — 먹빛 가시 탑이 둘러선 둥지 마당, 가운데 핏빛 심(지휘소) 위로 가시 우리가 오므린다
//  · 남서: 반쯤 묻힌 가오리 순례상(두 날개 밑으로 코스가 지난다)
//  · 남: 마주 선 노래꾼 순례상(맞잡은 팔이 문이 된다)
//  · 북서 끝: 깨진 결정의 프리즘 밭 — 쓰러진 프리즘, 기대 선 프리즘 아치
//  · 남동: 오아시스 빛 샘과 순례자 야영지(뼈 장막·풍차·풍경)
//  · 북동·서쪽 끝: 반쯤 묻힌 함선 껍데기 / 사구 위의 바람 깎인 유리 아치와 노래하는 유리 기둥 줄
import { THREE, M, V3, DEG, ring, shard, shardG, hexG, hexTaperG, hexBeam, column, lump, bead, tube, ribArch, shellDome,
  CT, CA, CP, CV, AMBER, AMBER2, ROSE, ICE, DEEP, TEAL, TEAL2, VIO2, PINK, BONE, BONE2, PEARL, PEARL2, STONE, STONE2, STONE3, SAND, SAND2, VOID, VOID2, BLOOD } from "./aildune-kit.js";
import { height, NEST, PRISM, OASIS, LAKE, LAKE_Y, RAYST, SINGERS, STRIKE, SUPPLY } from "./aildune-terrain.js";
import { TRACKS, RAYPATH } from "./aildune-routes.js";

const gy = (x, z) => height(x, z);
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

// ── 가시: 밑동에서 휘어 오르며 가늘어지는 먹빛 가시. 등을 따라 핏빛 줄기, 끝에 빛 방울 ──
// (x, z) 밑동, H 높이, bend: 휘는 정도(m), az: 휘는 방향(도), r0: 밑동 굵기
export function thorn(w, K, V, x, z, y0, H, bend, az, r0, o = {}) {
  const N = o.n || 6, dx = Math.cos(az * DEG), dz = Math.sin(az * DEG), pts = [];
  for (let i = 0; i <= N; i++) { const u = i / N, b = bend * u * u; pts.push([x + dx * b, y0 - 1.5 + H * (u * (1 - 0.18 * u)) / 0.82, z + dz * b]); }
  for (let i = 0; i < N; i++) {
    const u = i / N, rr = r0 * (1 - u * 0.86);
    hexBeam(w, pts[i], pts[i + 1], rr, i % 2 ? (o.c2 ?? VOID2) : (o.c1 ?? VOID), { col: o.col !== false && i < N - 1, geo: hexTaperG(0.86) });
    // 옆 가시
    if (i > 0 && i < N - 1 && (i + (x | 0)) % 2 === 0) {
      const p = pts[i], sa = az + 90 + ((i * 97) % 180), sx = Math.cos(sa * DEG), sz = Math.sin(sa * DEG), L = rr * 3.4;
      hexBeam(w, p, [p[0] + sx * L, p[1] + L * 0.7, p[2] + sz * L], rr * 0.42, o.c2 ?? VOID2, { geo: hexTaperG(0.05) });
    }
  }
  w.mesh(hexTaperG(0.05), M(...pts[N], r0 * 0.16, H * 0.08, r0 * 0.16, 0, 0, 0), o.c1 ?? VOID, "paint");
  V.add(pts.slice(0, N).map((p, i) => [p[0] - dx * r0 * (1 - i / N) * 0.9, p[1], p[2] - dz * r0 * (1 - i / N) * 0.9]), 0.18 + r0 * 0.05, o.glow ?? BLOOD, (x * 0.013) % 1, 0.025);
  bead(w, pts[N][0], pts[N][1] + 0.4, pts[N][2], 0.45 + r0 * 0.08, o.glow ?? BLOOD);
  if (K && H > 22) K.blink.add(pts[N][0], pts[N][1] + 1.4, pts[N][2], o.glow ?? BLOOD, 0.45, (x | 0) & 1);
  // 밑동 혹
  lump(w, x, y0 + 0.2, z, r0 * 2, r0 * 1.1, r0 * 2, o.c2 ?? VOID2);
  return pts;
}
// 가시 하나가 놓일 수 있는가 (모든 마디가 선에서 떨어져 있다)
function thornOk(ctx, x, z, y0, H, bend, az, r0) {
  const dx = Math.cos(az * DEG), dz = Math.sin(az * DEG);
  for (let u = 0; u <= 1.001; u += 0.25) { const b = bend * u * u; if (!ctx.clear3(x + dx * b, z + dz * b, r0 * (1 - u * 0.8) + 3.5, y0 + H * u - 4, y0 + H * u + 4)) return false; }
  return ctx.free(x, z, r0 * 2 + 1, true);
}

// ── 빈 합창의 가시 둥지 ──
export function nest(w, K, V, ctx) {
  const r = w.rand, N = NEST, y0 = N.y;
  // 둥지 마당: 먹빛 결정 바닥 판과 핏빛 동심 테
  for (const [R, c, t] of [[12, BLOOD, 0.22], [19, 0xff6a8a, 0.14], [34, BLOOD, 0.18], [50, 0xb04a8a, 0.14]]) ring(w, N.x, y0 + 0.12, N.z, R, t, c, { pitch: 90, col: false, mat: "glow", seg: 64 });
  for (let i = 0; i < 12; i++) { const a = i * 30 + 15, R = 14.5; w.mesh(hexG(), M(N.x + Math.cos(a * DEG) * R, y0 - 0.6, N.z + Math.sin(a * DEG) * R, 2.2, 0.85, 1.2, 0, -a, 0), i % 2 ? VOID : VOID2, "paint"); }
  // 가시 우리: 다섯 가시가 둘레에서 솟아 심 위로 오므린다 (지휘소 위 높이 34 m 부근에서 만난다)
  let cage = 0;
  for (let k = 0; k < 5; k++) {
    for (let j = 0; j < 6; j++) {
      const a = k * 72 + 10 + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 7, R = 27, x = N.x + Math.cos(a * DEG) * R, z = N.z + Math.sin(a * DEG) * R, y = gy(x, z);
      if (!thornOk(ctx, x, z, y, 40, 21, a + 180, 2.4)) continue;
      thorn(w, K, V, x, z, y, 40, 21, a + 180, 2.4, { n: 7 }); ctx.taken.push([x, z, 6]); cage++;
      break;
    }
  }
  // 우리 꼭대기의 빈 합창 심(먹빛 껍질 속 핏빛 알) — 매달린 공명체
  const top = [N.x, y0 + 40, N.z];
  if (cage >= 3 && ctx.clear3(N.x, N.z, 8, top[1] - 6, top[1] + 6)) {
    lump(w, top[0], top[1], top[2], 4.2, 5.4, 4.2, VOID, { col: true });
    for (let i = 0; i < 6; i++) { const a = i * 60; hexBeam(w, [top[0] + Math.cos(a * DEG) * 3, top[1] - 3, top[2] + Math.sin(a * DEG) * 3], [top[0] + Math.cos(a * DEG) * 7, top[1] - 9, top[2] + Math.sin(a * DEG) * 7], 0.6, VOID2, { geo: hexTaperG(0.05) }); }
    ctx.nestHeart = top;
  }
  // 바깥 가시 탑: 마당 둘레에 높고 낮은 가시가 무리 지어 선다
  let n = 0;
  for (let i = 0; i < 600 && n < 34; i++) {
    const a = r() * 360, R = 22 + r() * 46, x = N.x + Math.cos(a * DEG) * R, z = N.z + Math.sin(a * DEG) * R, y = gy(x, z);
    const H = R > 40 ? 18 + r() * 30 : 8 + r() * 14, r0 = 1 + H * 0.045 + r() * 0.5, bend = H * (0.1 + r() * 0.25), az = a + 180 + (r() - 0.5) * 80;
    if (!ctx.freeTaken(x, z, r0 * 2 + 2) || !thornOk(ctx, x, z, y, H, bend, az, r0)) continue;
    thorn(w, K, V, x, z, y, H, bend, az, r0, { n: H > 20 ? 6 : 4, col: H > 10 });
    ctx.taken.push([x, z, r0 * 2 + 1.5]); n++;
    // 탑 발치의 작은 가시
    for (let q = 0; q < 3; q++) { const b = r() * 360, d = r0 * 2.6 + r() * 2, sx = x + Math.cos(b * DEG) * d, sz = z + Math.sin(b * DEG) * d; if (ctx.free(sx, sz, 1, true)) hexBeam(w, [sx, gy(sx, sz) - 0.5, sz], [sx + Math.cos(b * DEG) * 1.5, gy(sx, sz) + 2 + r() * 3, sz + Math.sin(b * DEG) * 1.5], 0.5, VOID2, { geo: hexTaperG(0.05) }); }
  }
  // 빈 합창 껍질: 속이 빈 먹빛 소라 껍질 셋(입이 둥지 심을 향한다)
  for (const a of [130, 250, 10]) {
    for (let j = 0; j < 6; j++) {
      const aa = a + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 8, R = 44, x = N.x + Math.cos(aa * DEG) * R, z = N.z + Math.sin(aa * DEG) * R, y = gy(x, z);
      if (!ctx.freeTaken(x, z, 9) || !ctx.free(x, z, 7, true) || !ctx.clear3(x, z, 9, y, y + 16)) continue;
      w.mesh(hexTaperG(0.2), M(x, y - 1, z, 6.5, 15, 6.5, 0, aa, 0), VOID2, "paint");
      w.col.addCapsule(V3(x, y + 2, z), V3(x, y + 10, z), 5);
      lump(w, x - Math.cos(aa * DEG) * 4.5, y + 5, z - Math.sin(aa * DEG) * 4.5, 3, 4, 3, 0x120810, {});
      ring(w, x - Math.cos(aa * DEG) * 5.4, y + 5, z - Math.sin(aa * DEG) * 5.4, 3.1, 0.3, BLOOD, { yaw: 90 - aa, col: false, mat: "glow", seg: 20 });
      w.pool(x, y + 0.1, z, 12, BLOOD, 0.3);
      ctx.taken.push([x, z, 9]);
      break;
    }
  }
  w.pool(N.x, y0 + 0.1, N.z, 30, BLOOD, 0.28);
  w.shaft(N.x, y0, N.z, 4, 10, 40, BLOOD, 0.1);
  // 포탑 자리: 가시 받침 고리
  for (const [x, z] of STRIKE.turrets) { const y = gy(x, z); ring(w, x, y + 0.1, z, 5.4, 0.18, BLOOD, { pitch: 90, col: false, mat: "glow", seg: 24 }); }
}

// 위·아래 격자 면을 닫힌 판 하나로 (s: 좌우에 따라 면 감김을 맞춘다)
function sheetG(top, bot, ND, NC, s) {
  const P = [], W = NC + 1, tri = (a, b, c) => P.push(...a, ...b, ...c);
  const quad = (A, i, j, flip) => { const a = A[i * W + j], b = A[(i + 1) * W + j], c = A[(i + 1) * W + j + 1], d = A[i * W + j + 1]; if (flip) { tri(a, c, b); tri(a, d, c); } else { tri(a, b, c); tri(a, c, d); } };
  for (let i = 0; i < ND; i++) for (let j = 0; j < NC; j++) { quad(top, i, j, s > 0); quad(bot, i, j, s < 0); }
  for (let i = 0; i < ND; i++) for (const j of [0, NC]) { const a = top[i * W + j], b = top[(i + 1) * W + j], c = bot[(i + 1) * W + j], d = bot[i * W + j]; tri(a, c, b); tri(a, d, c); tri(a, b, c); tri(a, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(P.length / 3 * 2), 2));
  g.computeVertexNormals();
  return g;
}

// ── 반쯤 묻힌 가오리 순례상 ──
export function rayStatue(w, K, V, ctx) {
  const S = RAYST, y0 = gy(S.x, S.z), C = [S.x, S.z];
  // 몸통: 납작한 돌 등판(반쯤 묻혀 있다)과 등줄기 마루
  lump(w, C[0], y0 + 3, C[1], 13, 7.5, 17, STONE, { col: true });
  lump(w, C[0], y0 + 7.5, C[1] - 2, 9, 4.5, 12, STONE2, {});
  hexBeam(w, [C[0], y0 + 10, C[1] + 9], [C[0], y0 + 12.5, C[1] - 10], 1.4, STONE3, { geo: hexTaperG(0.4) });
  for (let i = 0; i < 6; i++) { const z = C[1] + 8 - i * 3.4; shard(w, C[0], y0 + 11.2 + i * 0.3, z, 0.7, 2.2 + (i % 2) * 1.2, 0, 0, i % 2 ? TEAL : AMBER, { mat: "glow", col: false }); }
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8, a = -0.5 + u * 2.2; pts.push([C[0] + s * (5 + Math.sin(u * 3) * 6), y0 + 8 + Math.sin(u * Math.PI) * 2, C[1] - 12 + u * 22]); } V.add(pts, 0.2, s > 0 ? TEAL : AMBER, 0.3, 0.03); }
  // 머리 지느러미(앞으로 말린 두 뿔): 북쪽
  for (const s of [-1, 1]) {
    const a = [C[0] + s * 5, y0 + 6, C[1] - 15], b = [C[0] + s * 7.5, y0 + 10, C[1] - 24], c = [C[0] + s * 4.5, y0 + 13, C[1] - 28];
    hexBeam(w, a, b, 1.9, STONE2, { col: true, geo: hexTaperG(0.7) }); hexBeam(w, b, c, 1.3, STONE, { geo: hexTaperG(0.4) });
    bead(w, C[0] + s * 4.2, y0 + 9.5, C[1] - 14.5, 1.1, TEAL);
  }
  // 꼬리: 남쪽으로 사구에 파묻히며 끝이 다시 솟는다
  const tl = (dx, dz, up) => [C[0] + dx, gy(C[0] + dx, C[1] + dz) + up, C[1] + dz];
  const tail = [[C[0], y0 + 5, C[1] + 15], tl(4, 20, 1.5), tl(12, 23, -0.5), tl(22, 22, 0.5), tl(29, 18, 5)];
  for (let i = 0; i < tail.length - 1; i++) hexBeam(w, tail[i], tail[i + 1], 1.8 - i * 0.35, i % 2 ? STONE2 : STONE, { col: i < 1, geo: hexTaperG(0.75) });
  V.add(tail, 0.22, AMBER, 0.2, 0.03);
  // 두 날개: 몸통 가장자리(12 m)에서 사구 속(46 m)으로 내려앉는 활 모양. 날개 밑(25 m)이 문이 된다
  const hU = (d) => 17 * (1 - Math.pow((d - 12) / 34, 2));
  for (const s of [-1, 1]) {
    // 날개 판: 폭(날개 길이) 방향 격자 × 시위 방향 격자, 위·아래 면(가운데가 두껍고 끝이 얇다)
    const spine = [], ND = 16, NC = 6, top = [], bot = [];
    for (let i = 0; i <= ND; i++) {
      const d = 10 + (i / ND) * 37, chord = 21 * (1 - ((d - 10) / 37) * 0.66), yy = y0 + Math.max(hU(d), -3) + 1.6, th = 2.4 * (1 - (i / ND) * 0.75), sweep = ((d - 10) / 37) * 5;
      for (let j = 0; j <= NC; j++) {
        const f = j / NC - 0.5, zz = C[1] - chord * 0.06 + chord * f + sweep, camber = (1 - 4 * f * f) * th;
        top.push([C[0] + s * d, yy + camber + Math.sin(i * 0.9) * 0.15, zz]); bot.push([C[0] + s * d, yy - camber * 0.5, zz]);
      }
      spine.push([C[0] + s * d, yy + th + 0.15, C[1] - chord * 0.06 + sweep]);
      if (i % 3 === 1 && i < ND - 1) shard(w, C[0] + s * d, yy - 0.8, C[1] - chord * 0.06 + sweep, 0.5, 2.2, 180, 0, s > 0 ? TEAL : AMBER, { mat: "glow", col: false });
    }
    w.mesh(sheetG(top, bot, ND, NC, s), new THREE.Matrix4(), 0xd2bfa4, "paint");    // 충돌: 앞날·가운데·뒷날 세 줄
    for (const f of [-0.38, 0, 0.36]) {
      const pts = [];
      for (let d = 12; d <= 36; d += 6) { const chord = 21 * (1 - ((d - 10) / 37) * 0.66); pts.push(V3(C[0] + s * d, y0 + Math.max(hU(d), -3) + 1.6, C[1] - chord * 0.06 + chord * f)); }
      for (let i = 0; i < pts.length - 1; i++) w.col.addCapsule(pts[i], pts[i + 1], 1.3);
    }
    V.add(spine, 0.26, s > 0 ? TEAL : AMBER, 0, 0.02);
    const gx = C[0] + s * 25;
    w.gap("가오리 순례상 날개 밑", gx, gy(gx, C[1]) + 6.5, C[1], 90, 18, 11, 300);
    w.pool(gx, gy(gx, C[1]) + 0.1, C[1], 12, s > 0 ? TEAL : AMBER, 0.25);
  }
  // 순례자의 공물: 몸통 앞 결정 등잔 줄
  for (let i = 0; i < 7; i++) { const x = C[0] - 9 + i * 3, z = C[1] - 34, y = gy(x, z); if (!ctx.free(x, z, 1, true)) continue; column(w, x, y - 0.4, z, 0.45, 1.6 + (i % 3) * 0.6, [STONE3, STONE2, STONE], { tip: "flat", col: false }); bead(w, x, y + 2.2 + (i % 3) * 0.6, z, 0.36, i % 2 ? AMBER : TEAL); }
  ctx.taken.push([C[0], C[1], 20], [C[0] - 30, C[1], 10], [C[0] + 30, C[1], 10], [C[0] + 16, C[1] + 22, 6]);
}

// ── 마주 선 노래꾼 순례상: 길쭉한 소라 몸, 고리 머리, 맞잡은 팔이 코스 위로 문을 만든다 ──
export function singers(w, K, V, ctx) {
  const S = SINGERS, y0 = gy(S.x, S.z), px = -0.564, pz = 0.826, D = 17;
  const heads = [];
  for (const s of [-1, 1]) {
    const x = S.x + px * D * s, z = S.z + pz * D * s, y = gy(x, z), face = Math.atan2(-pz * s, -px * s);
    // 받침과 몸(위로 좁아지는 육각 소라 셋)
    w.mesh(hexTaperG(0.8), M(x, y - 1, z, 6, 3, 6, 0, 0, 0), STONE3, "paint");
    w.mesh(hexTaperG(0.62), M(x, y + 2, z, 4.6, 14, 4.6, 0, 30, 0), STONE, "paint");
    w.mesh(hexTaperG(0.55), M(x, y + 16, z, 2.9, 8, 2.9, 0, 0, 0), 0xc9b8a0, "paint");
    w.col.addCapsule(V3(x, y + 1, z), V3(x, y + 22, z), 3.6);
    // 목과 고리 머리(입이 하늘을 향해 노래한다)
    const hx = x + Math.cos(face) * 1.5, hz = z + Math.sin(face) * 1.5, hy = y + 28.5;
    hexBeam(w, [x, y + 23, z], [hx, hy - 3, hz], 1.1, STONE2);
    ring(w, hx, hy, hz, 3.4, 0.9, STONE, { yaw: -face / DEG, pitch: 20, seg: 18 });
    ring(w, hx, hy, hz, 2.3, 0.25, s > 0 ? ROSE : TEAL, { yaw: -face / DEG, pitch: 20, seg: 18, mat: "glow", col: false });
    heads.push([hx, hy, hz]);
    // 몸에 감긴 빛 줄기
    const sp = []; for (let i = 0; i <= 14; i++) { const u = i / 14, a = u * 12, rr = 4.7 - u * 2.2; sp.push([x + Math.cos(a) * rr, y + 1 + u * 21, z + Math.sin(a) * rr]); }
    V.add(sp, 0.2, s > 0 ? ROSE : TEAL, 0, 0.03);
    K.blink.add(hx, hy + 4, hz, s > 0 ? ROSE : TEAL, 0.5, s > 0 ? 1 : 0);
    w.pool(x, y + 0.1, z, 10, s > 0 ? ROSE : TEAL, 0.3);
  }
  // 맞잡은 팔: 어깨(높이 19)에서 가운데 위(높이 24)로 휘어 만난다
  const A = [S.x - px * D + px * 0, 0, 0];
  void A;
  const sh = (s) => { const x = S.x + px * (D - 3.5) * s, z = S.z + pz * (D - 3.5) * s; return [x, gy(x, z) + 19.5, z]; };
  const top = [S.x, y0 + 24, S.z], L = sh(-1), R = sh(1);
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8, p = lerp3(L, R, u); p[1] += Math.sin(u * Math.PI) * (top[1] - (L[1] + R[1]) / 2); pts.push(p); }
  for (let i = 0; i < 8; i++) hexBeam(w, pts[i], pts[i + 1], 1.25 - Math.sin((i + 0.5) / 8 * Math.PI) * 0.3, i % 2 ? STONE2 : STONE, { col: true });
  lump(w, top[0], top[1] + 0.5, top[2], 2.2, 1.8, 2.2, 0xc9b8a0, {});
  V.add(pts.map((p) => [p[0], p[1] - 1.1, p[2]]), 0.22, AMBER, 0, 0.02);
  // 맞잡은 손에서 내려오는 노래 실(빛 줄기, 충돌 없음)
  for (const off of [-1.5, 1.5]) tube(w, top[0] + off * px, top[1] - 1, top[2] + off * pz, top[0] + off * px, top[1] - 6, top[2] + off * pz, 0.12, ICE, { mat: "glow" });
  w.gap("노래꾼의 맞잡은 팔 아래", S.x, y0 + 9, S.z, Math.atan2(-pz, px) / DEG, 26, 16, 300);
  ctx.taken.push([S.x + px * D, S.z + pz * D, 9], [S.x - px * D, S.z - pz * D, 9]);
  void heads;
}

// ── 깨진 결정의 프리즘 밭: 쓰러진 거대 프리즘, 서로 기대 선 프리즘 아치, 밑동만 남은 그루터기 ──
export function prismField(w, K, V, ctx) {
  const r = w.rand, P = PRISM, PAL = [[CT, TEAL], [CV, VIO2], [CP, PINK], [CA, AMBER]];
  // 기대 선 아치: 두 프리즘이 위에서 엇갈려 기댄다(사이로 날아 지난다)
  let na = 0;
  for (let i = 0; i < 80 && na < 4; i++) {
    const a = r() * 360, R = 8 + r() * 34, x = P.x + Math.cos(a * DEG) * R, z = P.z + Math.sin(a * DEG) * R, yaw = r() * 180, ux = Math.cos(yaw * DEG), uz = Math.sin(yaw * DEG), half = 9 + r() * 4, H = 22 + r() * 10;
    const A = [x - ux * half, gy(x - ux * half, z - uz * half) - 1, z - uz * half], B = [x + ux * half, gy(x + ux * half, z + uz * half) - 1, z + uz * half], T = [x, gy(x, z) + H, z];
    if (!ctx.freeTaken(x, z, half + 5) || !ctx.free(A[0], A[2], 4, true) || !ctx.free(B[0], B[2], 4, true) || !ctx.clear3(x, z, half + 3, gy(x, z), gy(x, z) + H + 4)) continue;
    const [cols, glow] = PAL[na % 4];
    hexBeam(w, A, [T[0] + ux * 2, T[1] + 3, T[2] + uz * 2], 2.6, cols[1], { col: true, geo: hexTaperG(0.7) });
    hexBeam(w, B, [T[0] - ux * 2, T[1] + 3, T[2] - uz * 2], 2.3, cols[2], { col: true, geo: hexTaperG(0.7), mat: "glass" });
    hexBeam(w, lerp3(A, T, 0.1), lerp3(A, T, 0.9), 0.5, glow, { mat: "glow" });
    for (const E of [A, B]) for (let q = 0; q < 4; q++) { const b = r() * 360; shard(w, E[0] + Math.cos(b * DEG) * 3.5, E[1], E[2] + Math.sin(b * DEG) * 3.5, 0.7 + r(), 3 + r() * 5, 20 + r() * 20, -b + 90, cols[q % 3], { col: false }); }
    w.gap("기대 선 프리즘 사이", x, gy(x, z) + H * 0.4, z, yaw, half * 1.3, H * 0.6, 300);
    w.pool(x, gy(x, z) + 0.1, z, half + 4, glow, 0.28);
    ctx.taken.push([x, z, half + 4]); na++;
  }
  // 쓰러진 프리즘: 비스듬히 누워 반쯤 묻혔다. 깨진 끝에서 빛이 샌다
  let nf = 0;
  for (let i = 0; i < 160 && nf < 9; i++) {
    const a = r() * 360, R = r() * (P.R + 16), x = P.x + Math.cos(a * DEG) * R, z = P.z + Math.sin(a * DEG) * R, yaw = r() * 360, L = 14 + r() * 22, rr = 1.8 + r() * 1.8, ux = Math.cos(yaw * DEG), uz = Math.sin(yaw * DEG);
    const A = [x - ux * L / 2, gy(x - ux * L / 2, z - uz * L / 2) - rr * 0.4, z - uz * L / 2], B = [x + ux * L / 2, gy(x + ux * L / 2, z + uz * L / 2) + rr * 0.6 + r() * 5, z + uz * L / 2];
    if (!ctx.freeTaken(x, z, L / 2 + 2) || !ctx.free(x, z, L / 2, true) || !ctx.clear3(x, z, L / 2 + 2, gy(x, z) - 2, B[1] + 3)) continue;
    const [cols, glow] = PAL[(r() * 4) | 0];
    hexBeam(w, A, B, rr, cols[1 + (nf & 1)], { col: true, mat: nf % 3 ? "paint" : "glass" });
    hexBeam(w, lerp3(A, B, 0.94), lerp3(A, B, 1.02), rr * 0.7, glow, { mat: "glow" });
    for (let q = 0; q < 5; q++) { const u = r(), p = lerp3(A, B, u); shard(w, p[0] + (r() - 0.5) * 6, gy(p[0], p[2]) - 0.3, p[2] + (r() - 0.5) * 6, 0.4 + r() * 0.6, 1 + r() * 2.5, 50 + r() * 30, r() * 360, cols[q % 3], { col: false }); }
    ctx.taken.push([x, z, L / 2 + 1]); nf++;
  }
  // 그루터기: 위가 비스듬히 잘린 굵은 육각 밑동 무리
  let ns = 0;
  for (let i = 0; i < 300 && ns < 22; i++) {
    const a = r() * 360, R = r() * (P.R + 30), x = P.x + Math.cos(a * DEG) * R, z = P.z + Math.sin(a * DEG) * R, rr = 1.2 + r() * 2.4, H = 2 + r() * 9, y = gy(x, z);
    if (!ctx.freeTaken(x, z, rr + 1.5) || !ctx.free(x, z, rr + 1, true) || !ctx.clear3(x, z, rr + 1, y, y + H)) continue;
    const [cols, glow] = PAL[(r() * 4) | 0];
    column(w, x, y - 1, z, rr, H + 1, [cols[0], cols[1], cols[2]], { tip: "cut", ry: r() * 60, cutYaw: r() * 360, col: H > 3 });
    if (r() < 0.5) bead(w, x, y + H + 0.4, z, rr * 0.3, glow);
    ctx.taken.push([x, z, rr + 1]); ns++;
  }
  // 무지개 빛 웅덩이(갈라진 빛이 바닥에 떨어진다)
  for (const [dx, dz, c] of [[-10, 6, ROSE], [8, -12, TEAL], [14, 10, AMBER], [-6, -20, VIO2]]) w.pool(P.x + dx, gy(P.x + dx, P.z + dz) + 0.1, P.z + dz, 9, c, 0.22);
}

// ── 오아시스 빛 샘과 순례자 야영지 ──
export function oasis(w, K, V, ctx) {
  const r = w.rand, O = OASIS, L = LAKE;
  // 샘: 빛 머금은 청록 수면과 결정 둑
  w.mesh(hexG(), M(L.x, LAKE_Y - 2, L.z, L.R + 3, 2, L.R + 3, 0, 0, 0), 0x3ad8c8, "glass");
  w.pool(L.x, LAKE_Y + 0.05, L.z, L.R + 2, 0x6ff0e0, 0.5);
  ring(w, L.x, LAKE_Y + 0.1, L.z, L.R + 1.5, 0.3, TEAL, { pitch: 90, col: false, mat: "glow", seg: 48 });
  for (let i = 0; i < 22; i++) {
    const a = i * (360 / 22) + r() * 8, d = L.R + 4 + r() * 4, x = L.x + Math.cos(a * DEG) * d, z = L.z + Math.sin(a * DEG) * d;
    if (!ctx.free(x, z, 1.5, true)) continue;
    shard(w, x, gy(x, z) - 0.5, z, 0.8 + r() * 0.9, 2.5 + r() * 5, 14 + r() * 20, -a + 90 + 180, [CT[1], CT[2], CP[2]][i % 3], { col: false });
  }
  // 순례자 장막: 뼈 갈비 돔(진주 껍질)과 그 앞 등잔
  let nt = 0;
  for (let i = 0; i < 120 && nt < 6; i++) {
    const a = r() * 360, R = L.R + 12 + r() * 16, x = O.x + Math.cos(a * DEG) * R, z = O.z + Math.sin(a * DEG) * R, Rd = 4 + r() * 2.5, y = gy(x, z);
    if (!ctx.freeTaken(x, z, Rd + 3) || !ctx.free(x, z, Rd + 1) || !ctx.clear3(x, z, Rd + 2, y, y + Rd + 3)) continue;
    shellDome(w, K, x, z, y, Rd, { ry: -a + 90, color: nt % 2 ? PEARL : 0xf0d8c0 });
    bead(w, x + Math.cos(a * DEG) * -(Rd + 1.5), y + 1.2, z + Math.sin(a * DEG) * -(Rd + 1.5), 0.35, AMBER);
    ctx.taken.push([x, z, Rd + 2]); nt++;
  }
  // 풍차(뼈 날개, 돌아가는 부분은 life 에서): 기둥만 세우고 자리를 남긴다
  ctx.rotors = ctx.rotors || [];
  for (let i = 0; i < 80 && ctx.rotors.length < 5; i++) {
    const a = r() * 360, R = L.R + 10 + r() * 26, x = O.x + Math.cos(a * DEG) * R, z = O.z + Math.sin(a * DEG) * R, y = gy(x, z), H = 9 + r() * 5;
    if (!ctx.freeTaken(x, z, 4) || !ctx.free(x, z, 3) || !ctx.clear3(x, z, 6.5, y, y + H + 6)) continue;
    hexBeam(w, [x, y - 0.5, z], [x, y + H, z], 0.4, BONE2, { col: true });
    for (const s of [-1, 1]) hexBeam(w, [x + s * 2, y - 0.3, z], [x, y + H * 0.5, z], 0.18, BONE);
    ctx.rotors.push([x, y + H + 0.3, z, r() * 360]); ctx.taken.push([x, z, 4]);
  }
  // 풍경 매다는 대: 기둥 위 가로대
  ctx.chimes = ctx.chimes || [];
  for (let i = 0; i < 100 && ctx.chimes.length < 18; i++) {
    const a = r() * 360, R = L.R + 6 + r() * 30, x = O.x + Math.cos(a * DEG) * R, z = O.z + Math.sin(a * DEG) * R, y = gy(x, z);
    if (!ctx.freeTaken(x, z, 2.5) || !ctx.free(x, z, 1.5) || !ctx.clear3(x, z, 3, y, y + 8)) continue;
    hexBeam(w, [x, y - 0.3, z], [x, y + 6.5, z], 0.2, BONE2, { col: true });
    hexBeam(w, [x - 1.4, y + 6.5, z], [x + 1.4, y + 6.5, z], 0.12, BONE);
    ctx.chimes.push([x, y + 6.4, z]); ctx.taken.push([x, z, 2]);
  }
  // 정박한 에일 순례정 둘(조개 배 모양, 받침 위)
  for (const [dx, dz, ry] of [[-34, 14, 30], [26, -32, 120]]) {
    const x = O.x + dx, z = O.z + dz, y = gy(x, z);
    if (!ctx.free(x, z, 5) || !ctx.freeTaken(x, z, 7)) continue;
    lump(w, x, y + 2.6, z, 2.6, 1.3, 6.2, PEARL2, { col: true, ry });
    lump(w, x, y + 3.6, z, 1.8, 1, 3.6, 0x86ecd8, { ry, mat: "glass" });
    for (const s of [-1, 1]) hexBeam(w, [x + Math.cos(ry * DEG) * 3 * s, y - 0.3, z - Math.sin(ry * DEG) * 3 * s], [x + Math.cos(ry * DEG) * 1.5 * s, y + 2, z - Math.sin(ry * DEG) * 1.5 * s], 0.3, BONE2);
    bead(w, x, y + 1.2, z, 0.6, TEAL);
    ctx.taken.push([x, z, 7]);
  }
}

// ── 반쯤 묻힌 함선 껍데기: 비스듬히 박힌 고대 에일 함선의 갈비와 껍질 조각. 갈비 사이로 날아 지난다 ──
export function hull(w, K, V, ctx, x0, z0, yaw, L, Hh, tilt) {
  const r = w.rand, ux = Math.cos(yaw * DEG), uz = -Math.sin(yaw * DEG), nx = -uz, nz = ux, ribs = [], NR = 9;
  for (let k = 0; k < NR; k++) {
    const u = k / (NR - 1) - 0.5, cx = x0 + ux * u * L, cz = z0 + uz * u * L, g = gy(cx, cz) - 3 - (u + 0.5) * tilt, H = Hh * (0.55 + 0.45 * Math.sin((u + 0.5) * Math.PI)), Wd = H * 0.55;
    if (!ctx.clear3(cx, cz, Wd + 3, g, g + H + 2)) continue;
    const pts = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI, R = Wd * (1 - 0.08 * Math.sin(a * 2)); pts.push([cx + nx * Math.cos(a) * R, g + Math.sin(a) * H, cz + nz * Math.cos(a) * R]); }
    if (k === 2 || k === 5) pts.splice(5);       // 부러진 갈비
    for (let i = 0; i < pts.length - 1; i++) hexBeam(w, pts[i], pts[i + 1], 1.1 + (i < 2 || i > 5 ? 0.4 : 0), k % 2 ? BONE : BONE2, { col: true });
    V.add(pts.map((p) => [p[0], p[1] - 1, p[2]]), 0.14, k % 2 ? AMBER : TEAL, k * 0.13, 0.02);
    ribs.push([cx, cz, g, H, Wd]);
  }
  // 용골과 등줄기
  if (ribs.length > 1) {
    const a = ribs[0], b = ribs[ribs.length - 1];
    hexBeam(w, [a[0], a[2] + a[3], a[1]], [b[0], b[2] + b[3], b[1]], 0.9, BONE2, { col: true });
    for (const s of [-1, 1]) hexBeam(w, [a[0] + nx * a[4] * 0.7 * s, a[2] + a[3] * 0.72, a[1] + nz * a[4] * 0.7 * s], [b[0] + nx * b[4] * 0.7 * s, b[2] + b[3] * 0.72, b[1] + nz * b[4] * 0.7 * s], 0.5, BONE);
  }
  // 껍질 판: 앞쪽 갈비 몇 칸에만 남았다(진주빛 판 조각)
  for (let k = 0; k < ribs.length - 1; k++) {
    if (k % 3 === 1) continue;
    const a = ribs[k], b = ribs[k + 1];
    for (const s of [-1, 1]) {
      const ang = 0.32 * Math.PI + r() * 0.1, pa = [a[0] + nx * Math.cos(ang) * a[4] * s, a[2] + Math.sin(ang) * a[3], a[1] + nz * Math.cos(ang) * a[4] * s], pb = [b[0] + nx * Math.cos(ang) * b[4] * s, b[2] + Math.sin(ang) * b[3], b[1] + nz * Math.cos(ang) * b[4] * s];
      hexBeam(w, pa, pb, 1, s > 0 ? PEARL : PEARL2, { rz: 3.2, col: true });
    }
  }
  // 묻힌 쪽 모래 둔덕의 결정
  for (let q = 0; q < 8; q++) { const u = r() - 0.5, cx = x0 + ux * u * L + nx * (r() - 0.5) * 30, cz = z0 + uz * u * L + nz * (r() - 0.5) * 30; if (ctx.free(cx, cz, 2, true)) shard(w, cx, gy(cx, cz) - 0.5, cz, 0.6 + r(), 2 + r() * 5, 20 + r() * 20, r() * 360, [CT[1], CA[2], CP[1]][q % 3], { col: false }); }
  const m = ribs[(ribs.length / 2) | 0];
  if (m) w.gap("묻힌 함선 갈비 속", m[0], m[2] + m[3] * 0.45, m[1], yaw, m[4] * 1.4, m[3] * 0.6, 400);
  ctx.taken.push([x0, z0, L * 0.55]);
}

// ── 바람 깎인 유리 아치: 코스 문 위에 걸치는 투명한 활 ──
function glassArch(w, K, V, ctx, x, z, yaw, span, H, cols, glow, name) {
  const ux = Math.cos(yaw * DEG), uz = -Math.sin(yaw * DEG);
  const A = [x - ux * span / 2, 0, z - uz * span / 2], B = [x + ux * span / 2, 0, z + uz * span / 2];
  A[1] = gy(A[0], A[2]) - 1.5; B[1] = gy(B[0], B[2]) - 1.5;
  const N = 12, pts = [];
  for (let i = 0; i <= N; i++) { const u = i / N, p = lerp3(A, B, u); p[1] += Math.pow(Math.sin(u * Math.PI), 0.7) * (H - (A[1] + B[1]) / 2 + Math.min(A[1], B[1]) + 1.5); pts.push(p); }
  for (let i = 0; i < N; i++) { const t = 1 - Math.sin((i + 0.5) / N * Math.PI) * 0.4; hexBeam(w, pts[i], pts[i + 1], 2.4 * t, i % 3 === 1 ? cols[2] : cols[1], { col: true, mat: i % 2 ? "glass" : "paint" }); }
  V.add(pts.map((p) => [p[0], p[1] - 1.8, p[2]]), 0.2, glow, 0, 0.02);
  for (const E of [A, B]) for (let q = 0; q < 4; q++) { const b = q * 90 + 20; shard(w, E[0] + Math.cos(b * DEG) * 3.6, E[1] + 1, E[2] + Math.sin(b * DEG) * 3.6, 0.9, 4 + q * 1.5, 18, -b + 90, cols[q % 3], { col: false }); }
  w.gap(name, x, gy(x, z) + H * 0.4, z, yaw, span - 6, H * 0.7, 300);
  ctx.taken.push([A[0], A[2], 5], [B[0], B[2], 5]);
}

// ── 구역 모음 ──
export function zones(w, K, V, ctx) {
  nest(w, K, V, ctx);
  rayStatue(w, K, V, ctx);
  singers(w, K, V, ctx);
  prismField(w, K, V, ctx);
  oasis(w, K, V, ctx);
  hull(w, K, V, ctx, 82, -206, 18, 64, 26, 8);
  hull(w, K, V, ctx, -214, -112, 100, 56, 22, 6);
  hull(w, K, V, ctx, 208, 168, -40, 48, 18, 5);
  // 사구 코스 문 위의 유리 아치: 문의 진행 방향에 직각으로 걸친다
  const D = TRACKS[0].gates, ARCH = [[1, [CT, TEAL]], [8, [CP, PINK]], [10, [CV, VIO2]], [11, [CA, AMBER]], [5, [CT, TEAL2]]];
  for (const [gi, [cols, glow]] of ARCH) {
    const g = D[gi], a = D[(gi + D.length - 1) % D.length].p, b = D[(gi + 1) % D.length].p, dx = b[0] - a[0], dz = b[2] - a[2], yaw = Math.atan2(dz, dx) / DEG + 90;
    const span = 26, H = 20, ux = Math.cos(yaw * DEG), uz = -Math.sin(yaw * DEG);
    // 다리가 다른 선에 닿으면 놓지 않는다
    let ok = true;
    for (const s of [-1, 1]) { const x = g.p[0] + ux * span / 2 * s, z = g.p[2] + uz * span / 2 * s; if (!ctx.free(x, z, 3, true) || !ctx.freeTaken(x, z, 3) || !ctx.clear3(x, z, 3, gy(x, z) - 2, gy(x, z) + H * 0.6)) ok = false; }
    if (ok) glassArch(w, K, V, ctx, g.p[0], g.p[2], yaw, span, H, cols, glow, "바람 깎인 유리 아치 아래");
  }
  // 노래하는 유리 기둥: 모래 가오리 길 양옆에 짝지어 선 기둥(꼭대기에 풍경)
  ctx.chimes = ctx.chimes || [];
  const PAL = [[CT, TEAL], [CA, AMBER], [CP, PINK], [CV, VIO2]];
  let np = 0;
  for (let i = 2; i < RAYPATH.length - 2 && np < 40; i += 2) {
    const p = RAYPATH[i], q = RAYPATH[i + 1], dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    for (const s of [-1, 1]) {
      const d = 11 + (i % 3) * 2, x = p[0] + nx * d * s, z = p[2] + nz * d * s, y = gy(x, z), H = 16 + ((i * 7 + (s > 0 ? 3 : 0)) % 11) * 1.6, rr = 1.2 + (H - 16) * 0.04;
      if (!ctx.freeTaken(x, z, rr + 2) || !ctx.free(x, z, rr + 1, true) || !ctx.clear3(x, z, rr + 5, y - 2, y + H + 3)) continue;
      const [cols, glow] = PAL[(i / 2 + (s > 0 ? 1 : 0)) % 4];
      column(w, x, y - 1, z, rr, H + 1, [cols[0], cols[1], cols[2]], { tip: "point", ry: i * 13 });
      hexBeam(w, [x, y + H * 0.2, z], [x, y + H * 0.8, z], rr * 0.35, glow, { mat: "glow", geo: hexG() });
      for (const k of [0.45, 0.7]) ring(w, x, y + H * k, z, rr * 1.15, 0.12, glow, { pitch: 90, col: false, mat: "glow", seg: 6 });
      w.pool(x, y + 0.1, z, 5, glow, 0.24);
      if (H > 26) K.blink.add(x, y + H + 0.4, z, glow, 0.35, np & 1);
      ctx.chimes.push([x + rr * 1.2, y + H * 0.62, z]);
      ctx.taken.push([x, z, rr + 1.5]); np++;
    }
  }
  // 출발 판: 동심 빛 테와 둘레의 결정 등잔(출발 자리 앞 30 m 는 비운다)
  {
    const SX = 0, SZ = 192, y = gy(SX, SZ);
    for (const [R, c] of [[6, TEAL], [10, AMBER], [16, TEAL2]]) ring(w, SX, y + 0.08, SZ, R, 0.14, c, { pitch: 90, col: false, mat: "glow", seg: 48 });
    for (let i = 0; i < 14; i++) { const a = 200 + i * (140 / 13), x = SX + Math.cos(a * DEG) * 22, z = SZ - Math.sin(a * DEG) * 22; if (!ctx.free(x, z, 1, true)) continue; column(w, x, gy(x, z) - 0.5, z, 0.5, 2.6, [STONE3, STONE2, CT[2]], { tip: "point", col: false }); bead(w, x, gy(x, z) + 2.8, z, 0.3, i % 2 ? AMBER : TEAL); }
  }
  void SUPPLY; void AMBER2; void DEEP; void CV; void ribArch; void shardG; void SAND; void SAND2; void ICE;
}
