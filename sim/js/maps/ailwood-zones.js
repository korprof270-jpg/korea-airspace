// 포자 숲 구역: 서쪽 통나무 굴, 북쪽 쓰러진 거대 버섯, 북동 벼랑과 포자 폭포(선반 버섯 두 단·뒤 동굴), 갓 밑 새끼 둥지 넷,
// 남동 등불꽃 들판, 북서 제국 진지의 잔해, 빛 개울의 디딤 껍질
import * as THREE from "../../vendor/three.module.min.js";
import { M, tube, bead, lump, capG, ring, shellDome, V3, VIO, VIO2, PINK, TEAL, TEAL2, LIME, GOLD, FLESH, BONE, BONE2 } from "./ail-kit.js";
import { height, LOG, FALLEN, SHELF, POOL, POOL_R, N0, U, V, fallsPt, PLAT, SUPPLY, STRIKE, COMBAT, CAPS, SHELLS, DEG, vnoise } from "./ailwood-terrain.js";
import { BARK, BARK2, BARK3, MOSS } from "./ailwood-base.js";

const Q = new THREE.Quaternion(), E = new THREE.Euler();

// 속 빈 원통 껍질(축 a→b, 바닥 높이 위 cy 에 중심). holes(u, ang) → true 면 뚫린 곳. 조각마다 상자 충돌
function hollowLog(w, a, b, cy, Ri, Ro, color, holes = () => false, tag = "통나무") {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, NA = 24, NL = Math.ceil(L / 4);
  const P = (u, ang, rr) => { const s = u * L, c = Math.cos(ang), sn = Math.sin(ang); return [a[0] + ux * s - uz * c * rr, cy(u) + sn * rr, a[1] + uz * s + ux * c * rr]; };
  const pos = [], quad = (p, q, r, t) => pos.push(...p, ...q, ...r, ...p, ...r, ...t);
  const solid = (i, j) => j >= 0 && j < NL && !holes((j + 0.5) / NL, ((i + NA) % NA + 0.5) / NA * Math.PI * 2);
  const ro = (u, ang) => Ro + 0.5 * vnoise(u * 20, ang * 3);
  for (let i = 0; i < NA; i++) for (let j = 0; j < NL; j++) {
    if (!solid(i, j)) continue;
    const a0 = (i / NA) * Math.PI * 2, a1 = ((i + 1) / NA) * Math.PI * 2, u0 = j / NL, u1 = (j + 1) / NL;
    const o00 = P(u0, a0, ro(u0, a0)), o10 = P(u0, a1, ro(u0, a1)), o01 = P(u1, a0, ro(u1, a0)), o11 = P(u1, a1, ro(u1, a1));
    const n00 = P(u0, a0, Ri), n10 = P(u0, a1, Ri), n01 = P(u1, a0, Ri), n11 = P(u1, a1, Ri);
    quad(o00, o10, o11, o01); quad(n00, n01, n11, n10);
    if (!solid(i, j - 1)) quad(o00, n00, n10, o10);
    if (!solid(i, j + 1)) quad(o01, o11, n11, n01);
    if (!solid(i - 1, j)) quad(o00, o01, n01, n00);
    if (!solid(i + 1, j)) quad(o10, n10, n11, o11);
    const am = (a0 + a1) / 2, um = (u0 + u1) / 2, c = P(um, am, (Ri + Ro) / 2);
    // 상자: 로컬 x = 축 방향, y = 반경 방향, z = 둘레 방향
    const rad = new THREE.Vector3(-uz * Math.cos(am), Math.sin(am), ux * Math.cos(am)), ax = new THREE.Vector3(ux, 0, uz), tg = new THREE.Vector3().crossVectors(ax, rad);
    Q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, rad, tg));
    w.col.addBox(V3(...c), V3(L / NL / 2 + 0.1, (Ro - Ri) / 2 + 0.3, (Ri + Ro) / 2 * Math.PI / NA + 0.25), Q.clone(), tag);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  w.mesh(g, new THREE.Matrix4(), color, "flat");
  return P;
}

// ── 서: 속 빈 쓰러진 통나무 굴 ──
function logTunnel(w, K) {
  const r = w.rand, gm = height((LOG.a[0] + LOG.b[0]) / 2, (LOG.a[1] + LOG.b[1]) / 2), cy = () => gm + LOG.Ro - 1.5;
  const P = hollowLog(w, LOG.a, LOG.b, cy, LOG.Ri, LOG.Ro, BARK, (u, ang) => (ang > 1.2 && ang < 1.9 && ((u > 0.3 && u < 0.4) || (u > 0.62 && u < 0.7))) || ang > 4.2 && ang < 5.2);
  // 안쪽 바닥은 메운다(땅 밑 반원 대신 이끼 바닥) — 위 구멍으로 빛줄기
  for (const u of [0.35, 0.66]) { const p = P(u, Math.PI / 2, LOG.Ro); w.shaft(p[0], p[1] + 1, p[2], 1, 4, LOG.Ro * 2 - 2, 0xb0ffd0, 0.08); w.pool(p[0], gm + 0.2, p[2], 4, LIME, 0.5); }
  for (let k = 0; k < 12; k++) { const u = 0.05 + k * 0.08, p = P(u, Math.PI * 0.5 + (k % 2 ? 0.9 : -0.9), LOG.Ri - 0.3); bead(w, ...p, 0.5, k % 2 ? TEAL : LIME); }
  // 끝 테: 나이테와 발광 고리
  for (const u of [0, 1]) {
    const c = P(u, 0, 0), yaw = Math.atan2(-(LOG.b[1] - LOG.a[1]), LOG.b[0] - LOG.a[0]) / DEG;
    ring(w, c[0], c[1], c[2], LOG.Ri + 0.3, 0.35, TEAL, { yaw: yaw + 90, col: false, mat: "glow", seg: 32 });
    ring(w, c[0], c[1], c[2], LOG.Ro - 0.5, 0.5, 0x6a5a7e, { yaw: yaw + 90, col: false, seg: 32 });
    K.blink.add(c[0], c[1] + LOG.Ro + 0.6, c[2], TEAL, 0.5, u);
    w.gap("통나무 굴", c[0], c[1], c[2], yaw + 90, LOG.Ri * 1.4, LOG.Ri * 1.4, 350);
  }
  // 겉에 돋은 버섯과 이끼
  for (let k = 0; k < 16; k++) {
    const u = r(), ang = 0.3 + r() * 2.5, p = P(u, ang, LOG.Ro + 0.3), s = 1 + r() * 2.2;
    w.mesh(capG(), M(...p, s, s * 0.9, s, 0, r() * 360, 0), k % 2 ? 0x7a4ac8 : 0x2a8a9a, "paint");
    w.mesh(capG(), M(p[0], p[1] - 0.1, p[2], s * 0.85, s * 0.25, s * 0.85, 180, 0, 0), k % 3 ? TEAL : PINK, "glow");
  }
  for (let k = 0; k < 10; k++) { const u = r(), p = P(u, Math.PI / 2 + (r() - 0.5), LOG.Ro); lump(w, ...p, 2 + r() * 2, 0.8, 2 + r() * 2, MOSS, { mat: "flat" }); }
  // 부러진 가지 그루터기
  for (const [u, ang, L] of [[0.2, 2.2, 9], [0.55, 0.7, 12], [0.85, 2.0, 7]]) { const p = P(u, ang, LOG.Ro - 0.5), q = P(u + 0.04, ang, LOG.Ro + L); tube(w, ...p, ...q, 1.5, BARK2, { mat: "flat", col: true, tag: "통나무" }); }
}

// ── 북: 쓰러진 거대 버섯 — 뿌리 둔덕과 세운 갓 테에 걸쳐 아치처럼 누웠다(밑으로 날 수 있다) ──
function fallenShroom(w, K) {
  const r = w.rand, { a, b, R, cap } = FALLEN, ga = height(...a), gb = height(...b);
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const u = k / 12, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, y = ga + 6 + (gb + cap * 0.55 - ga - 6) * u + Math.sin(u * Math.PI) * 6;
    pts.push([x, y, z]);
  }
  for (let k = 0; k < 12; k++) {
    tube(w, ...pts[k], ...pts[k + 1], R * (1.15 - 0.25 * k / 12), k % 2 ? 0xd0c0ea : 0xbca8dc, { mat: "paint", col: true, tag: "버섯", seg: 12 });
    if (k % 2) ring(w, ...pts[k], R * 1.05, 0.3, k % 4 === 1 ? TEAL : VIO2, { yaw: 90, col: false, mat: "glow", seg: 20 });
  }
  // 뿌리 둔덕(뽑힌 뿌리 덩이)
  lump(w, a[0] - 4, ga + 4, a[1], 11, 9, 12, 0x5a4a6a, { mat: "flat", col: true });
  for (let k = 0; k < 9; k++) { const t = r() * Math.PI * 2, L = 10 + r() * 8; tube(w, a[0] - 6, ga + 6, a[1], a[0] - 6 - Math.abs(Math.cos(t)) * L, ga + 2 + Math.sin(t) * L * 0.6 + 4, a[1] + Math.sin(t * 1.3) * L, 1.2, BARK3, { mat: "flat" }); }
  // 세운 갓: 옆으로 누운 원반(테가 땅에 박혔다) + 빛 주름
  const e = pts[12], cx = e[0] + 3, cyy = gb + cap * 0.55;
  w.mesh(capG(), M(cx, cyy, e[2], cap, cap * 0.8, cap, 0, 0, -90), 0x6a3cc8, "paint");
  w.mesh(capG(), M(cx - 0.8, cyy, e[2], cap * 0.9, cap * 0.2, cap * 0.9, 0, 0, 90), PINK, "glow");
  for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; w.col.addSphere(V3(cx + 4, cyy + Math.sin(t) * cap * 0.62, e[2] + Math.cos(t) * cap * 0.62), cap * 0.36, "버섯"); }
  w.col.addSphere(V3(cx + 4, cyy, e[2]), cap * 0.4, "버섯");
  // 아치 밑 갭
  const m = pts[5], gy = height(m[0], m[2]);
  w.gap("쓰러진 버섯 밑", m[0], gy + (m[1] - R - gy) / 2, m[2], 90, 18, Math.max(4, m[1] - R - gy - 1), 300);
  w.pool(m[0], gy, m[2], 14, PINK, 0.35);
  K.blink.add(cx + 2, cyy + cap * 0.9, e[2], PINK, 0.7, 1);
}

// ── 북동: 벼랑·포자 폭포·선반 버섯 두 단·폭포 뒤 동굴 ──
function falls(w, K) {
  const r = w.rand;
  const yaw = Math.atan2(-U[1], U[0]) / DEG;
  for (const k of ["lo", "hi"]) {
    const S = SHELF[k], [cx, cz] = S.c, gy = 0;
    // 벼랑에 박힌 반원 선반: 갓을 납작하게 눌러 벽에 붙인다
    w.mesh(capG(), M(cx, S.y + gy, cz, S.R, S.t * 0.9, S.R, 0, r() * 360, 0), k === "lo" ? 0x8a6ab8 : 0x6a4aa8, "paint");
    for (const f of [0.45, 0.7, 0.92]) ring(w, cx, S.y + S.t * 0.9 * 0.55 * Math.cos(f * Math.PI / 2) + 0.15, cz, S.R * f, 0.22, k === "lo" ? GOLD : TEAL, { pitch: 90, col: false, mat: "glow", seg: 40 });
    w.mesh(capG(), M(cx, S.y + gy - 0.3, cz, S.R * 0.95, S.t * 0.4, S.R * 0.95, 180, 0, 0), k === "lo" ? GOLD : VIO2, "glow");
    for (const a of [0, 30, 60]) { Q.setFromEuler(E.set(0, a * DEG, 0)); w.col.addBox(V3(cx, S.y + S.t * 0.35, cz), V3(S.R * 0.7, S.t * 0.5, S.R * 0.7), Q.clone(), "선반 버섯"); }
    for (let i = 0; i < 6; i++) { const t = r() * Math.PI * 2, d = r() * S.R * 0.5; shellDome(w, K, cx + Math.cos(t) * d + U[0] * 6, cz + Math.sin(t) * d + U[1] * 6, S.y + S.t * 0.5 + 0.5, 1.6 + r() * 1.2, { light: k === "lo" ? GOLD : TEAL }); }
  }
  // 포자 폭포: 위 고원 끝에서 못으로 떨어지는 빛 장막(흐르는 셰이더)
  const [fx, fz] = fallsPt(-2, 0), H = PLAT + 4, Wd = 22;
  const geo = new THREE.PlaneGeometry(Wd, H, 1, 8); geo.translate(0, H / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vU; uniform float t;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ float x = vU.x * 18.0, s = floor(x), f = fract(x); float sp = 0.6 + h(vec2(s, 1.0)) * 0.8;
        float v = fract(vU.y * 3.0 + t * sp * 0.6 + h(vec2(s, 3.0))); float k = smoothstep(0.0, 0.2, f) * smoothstep(1.0, 0.8, f) * (0.35 + 0.65 * smoothstep(0.3, 1.0, v));
        float edge = smoothstep(0.0, 0.15, vU.x) * smoothstep(1.0, 0.85, vU.x);
        gl_FragColor = vec4(vec3(0.35, 1.0, 0.8) * k * edge * 0.75, 1.0); }`,
  });
  const fallM = new THREE.Mesh(geo, mat);
  fallM.position.set(fx + U[0] * 2, -2, fz + U[1] * 2); fallM.rotation.y = (yaw + 90) * DEG;
  w.scene.add(fallM); w.disposables.push(geo, mat);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
  w.shaft(POOL[0], 46, POOL[1], 4, POOL_R, 46, 0x7affd8, 0.06);
  w.pool(POOL[0], height(...POOL) + 0.3, POOL[1], POOL_R + 6, TEAL, 0.6);
  // 못 둘레 결정 바위와 빛 버섯
  for (let k = 0; k < 14; k++) {
    const t = r() * Math.PI * 2, d = POOL_R + 3 + r() * 8, x = POOL[0] + Math.cos(t) * d, z = POOL[1] + Math.sin(t) * d;
    lump(w, x, height(x, z) + 0.4, z, 2 + r() * 2.5, 1 + r() * 1.5, 2 + r() * 2.5, 0x2c5a5e, { mat: "flat", col: r() < 0.5 });
  }
  // 벼랑 면을 따라 늘어진 빛 덩굴
  for (let k = -6; k <= 6; k++) {
    if (Math.abs(k) < 2) continue;
    const [x, z] = fallsPt(-1, k * 9), L = 14 + r() * 18;
    tube(w, x, PLAT + 1, z, x + U[0] * 1.5, PLAT + 1 - L, z + U[1] * 1.5, 0.25, k % 2 ? LIME : TEAL, { mat: "glow" });
    bead(w, x + U[0] * 1.5, PLAT + 1 - L, z + U[1] * 1.5, 0.6, k % 2 ? LIME : TEAL);
  }
  K.blink.add(fx, PLAT + 3, fz, TEAL, 0.8, 0);
}

// ── 갓 밑 새끼 둥지(보급 캠프 넷): 엮은 뿌리 바구니 + 알 + 등불 ──
export function nests(w, K) {
  const r = w.rand;
  SUPPLY.camps.forEach(([x, z], i) => {
    const gy = height(x, z);
    // 착륙장 둘레 빛 고리(바닥) + 둥지 바구니는 패드 밖(12 m)에
    ring(w, x, gy + 0.15, z, 8, 0.25, TEAL, { pitch: 90, col: false, mat: "glow", seg: 32 });
    w.pool(x, gy, z, 9, TEAL, 0.4);
    for (let k = 0; k < 3; k++) {
      const t = (i * 70 + k * 120) * DEG, nx = x + Math.cos(t) * 13, nz = z + Math.sin(t) * 13, ny = height(nx, nz);
      for (let j = 0; j < 7; j++) { const b = (j / 7) * Math.PI * 2; tube(w, nx + Math.cos(b) * 2.6, ny, nz + Math.sin(b) * 2.6, nx + Math.cos(b + 1.2) * 2.9, ny + 2.2, nz + Math.sin(b + 1.2) * 2.9, 0.3, BARK2, { mat: "flat" }); }
      ring(w, nx, ny + 2.2, nz, 2.9, 0.35, BARK3, { pitch: 90, col: false, seg: 18 });
      w.col.addSphere(V3(nx, ny + 1, nz), 2.4, "둥지");
      for (let j = 0; j < 3; j++) bead(w, nx + (r() - 0.5) * 2, ny + 1.6, nz + (r() - 0.5) * 2, 0.9, j % 2 ? 0xffd0f0 : 0xd0fff0, "glow");
      K.blink.add(nx, ny + 3.4, nz, PINK, 0.4, k & 1);
    }
  });
}

// ── 개울의 디딤 껍질: 거대한 껍질 반쪽이 다리처럼 엎어져 있다 ──
function shells(w, K) {
  for (const [x, z] of SHELLS) {
    const gy = height(x, z);
    w.mesh(capG(), M(x, gy - 0.5, z, 9, 3.5, 9, 0, 30, 0), BONE, "paint");
    ring(w, x, gy + 0.3, z, 8.8, 0.4, BONE2, { pitch: 90, col: false, seg: 24 });
    for (let k = 0; k < 5; k++) tube(w, x - 8 + k * 4, gy + 0.4, z - 4, x - 8 + k * 4, gy + 2.8, z, 0.2, TEAL, { mat: "glow" });
  }
}

export function zones(w, K, ctx) {
  logTunnel(w, K);
  fallenShroom(w, K);
  falls(w, K);
  nests(w, K);
  shells(w, K);
}
