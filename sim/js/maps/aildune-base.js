// 유리 사막의 주 구조물: 공명 숲(노래 굳은 기둥·소리굽쇠 결정·오르간 관 결정·굳은 물결)과 유리 협곡 꾸밈(벽 결정·빛 줄기·결정 다리)
import { THREE, M, V3, DEG, ring, shard, shardG, icoG, octG, hexG, hexTaperG, hexBeam, column, fork, pipes, crystals, lump, bead, ribArch,
  CT, CA, CP, CV, AMBER, ROSE, ICE, DEEP, TEAL, TEAL2, VIO2, PINK, BONE, BONE2 } from "./aildune-kit.js";
import { height, mix, FOREST, RIM, FLOOR, CANYON_LEN, canyonPoint, canyonS, canyonHalf, canyonAt } from "./aildune-terrain.js";
import { THREADED } from "./aildune-routes.js";

// 비틀린 별 단면 기둥 조각: 아래(반경 r0, 각 a0) → 위(반경 r1, 각 a1), 높이 h. 골(안쪽 꼭짓점)이 나선을 그린다
function twistG(lobes, r0, r1, a0, a1, h, inner = 0.56, steps = 2) {
  const n = lobes * 2, pos = [];
  const at = (k) => { const t = k / steps, r = r0 + (r1 - r0) * t, a = a0 + (a1 - a0) * t, out = []; for (let i = 0; i < n; i++) { const an = a + (i / n) * Math.PI * 2, rr = i % 2 ? r * inner : r; out.push([Math.cos(an) * rr, h * t, Math.sin(an) * rr]); } return out; };
  for (let k = 0; k < steps; k++) { const A = at(k), B = at(k + 1); for (let i = 0; i < n; i++) { const j = (i + 1) % n; pos.push(...A[i], ...B[i], ...A[j], ...A[j], ...B[i], ...B[j]); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.computeVertexNormals(); g.computeBoundingBox();
  return g;
}

// ── 노래 굳은 기둥: 나선으로 비틀린 결정 기둥. 가운데 우리 안에서 심이 맥박 친다 ──
export const MONO_H = 138;
export function monolith(w, K, V) {
  const x = FOREST.x, z = FOREST.z, y0 = height(x, z), yb = y0 + 2, TURN = 2.3 * Math.PI * 2, tw = (y) => (y / MONO_H) * TURN;
  // 기단: 육각 단 셋 + 모서리 빛 테
  for (const [R, h, c, ry] of [[23, 1.4, DEEP, 0], [17.5, 2.8, CV[0], 30], [13, 4.2, CV[1], 0]]) {
    w.mesh(hexG(), M(x, y0 - 0.8, z, R, h + 0.8, R, 0, ry, 0), c, "paint");
    ring(w, x, y0 + h + 0.06, z, R * 0.97, 0.2, R > 20 ? TEAL : R > 15 ? AMBER : PINK, { pitch: 90, col: false, mat: "glow", seg: 6, roll: ry + 30 });
  }
  w.col.addBox(V3(x, y0 + 0.5, z), V3(18, 1.4, 18)); w.col.addBox(V3(x, y0 + 2, z), V3(11, 2.4, 11));
  // 몸통(아래)과 첨탑(위): 별 단면이 비틀리며 좁아진다
  const rTrunk = (y) => 11 - (y / 40) * 3.6, rSpire = (y) => 0.5 + 6.6 * Math.pow(1 - (y - 68) / (MONO_H - 68), 0.85);
  for (let i = 0; i < 8; i++) { const a = i * 5, b = a + 5; w.mesh(twistG(3, rTrunk(a), rTrunk(b), tw(a), tw(b), 5), M(x, yb + a, z), mix(CV[0], CT[1], i / 7), "paint"); }
  const NS = 12, dS = (MONO_H - 68) / NS;
  for (let i = 0; i < NS; i++) { const a = 68 + i * dS, b = a + dS, u = i / (NS - 1); w.mesh(twistG(3, rSpire(a), rSpire(b), tw(a), tw(b), dS), M(x, yb + a, z), u < 0.55 ? mix(CT[1], ICE, u / 0.55) : mix(ICE, ROSE, (u - 0.55) / 0.45), "paint"); }
  w.col.addCapsule(V3(x, y0 + 6, z), V3(x, yb + 34, z), 8.6);
  w.col.addCapsule(V3(x, yb + 72, z), V3(x, yb + 98, z), 5.2); w.col.addCapsule(V3(x, yb + 98, z), V3(x, yb + MONO_H - 4, z), 2.6);
  // 우리: 세 가닥이 나선으로 부풀며 몸통과 첨탑을 잇는다. 위아래에서 결정 이빨이 심을 향한다
  for (let k = 0; k < 3; k++) {
    let prev = null;
    for (let i = 0; i <= 7; i++) {
      const y = 38 + (i / 7) * 32, a = tw(y) + k * (Math.PI * 2 / 3), R = 7 + 3.1 * Math.sin((i / 7) * Math.PI), p = [x + Math.cos(a) * R, yb + y, z + Math.sin(a) * R];
      if (prev) hexBeam(w, prev, p, 1.75, i % 2 ? CT[2] : ICE, { col: true });
      prev = p;
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = k * 60 + 20;
    shard(w, x + Math.cos(a * DEG) * 4.6, yb + 39, z + Math.sin(a * DEG) * 4.6, 1.5, 7.5, -24, -a + 90, CT[2], { col: false });
    shard(w, x + Math.cos(a * DEG) * 4.2, yb + 69.5, z + Math.sin(a * DEG) * 4.2, 1.4, 7, 204, -a + 90, ICE, { col: false });
  }
  // 골을 따라 오르는 세 줄기 빛(청록·호박·분홍): 기단에서 꼭대기까지
  [TEAL, AMBER, PINK].forEach((c, k) => {
    const pts = [];
    for (let y = 0; y <= 40; y += 2.5) { const a = tw(y) + (k * 2 + 1) * (Math.PI / 3), R = rTrunk(y) * 0.56 + 0.45; pts.push([x + Math.cos(a) * R, yb + y, z + Math.sin(a) * R]); }
    V.add(pts, 0.5, c, k * 0.33, 0.016);
    const up = [];
    for (let y = 68; y <= MONO_H - 3; y += 2.5) { const a = tw(y) + (k * 2 + 1) * (Math.PI / 3), R = rSpire(y) * 0.56 + 0.4; up.push([x + Math.cos(a) * R, yb + y, z + Math.sin(a) * R]); }
    V.add(up, 0.42, c, k * 0.33 + 0.7, 0.016);
    // 기단 위로 뻗어 나가는 뿌리 줄기
    const a0 = tw(0) + (k * 2 + 1) * (Math.PI / 3), root = [];
    for (let d = 6; d <= 44; d += 4) { const a = a0 + (d - 6) * 0.012, yy = d < 13 ? y0 + 4.5 : d < 17.5 ? y0 + 3.1 : d < 23 ? y0 + 1.7 : height(x + Math.cos(a) * d, z + Math.sin(a) * d) + 0.25; root.push([x + Math.cos(a) * d, yy, z + Math.sin(a) * d]); }
    V.add(root.reverse(), 0.32, c, k * 0.33 - 0.6, 0.016);
  });
  // 심: 우리 안에 뜬 결정(맥박 치며 부풀고 밝아진다) + 후광 + 둘레를 도는 조각들
  const cy = yb + 54;
  const coreM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 2.4, 2.2) });
  const core = new THREE.Mesh(octG(), coreM); core.position.set(x, cy, z); core.scale.set(3.6, 6.4, 3.6);
  const haloM = new THREE.MeshBasicMaterial({ color: 0x5ff0e0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), haloM); halo.position.set(x, cy, z); halo.scale.setScalar(8);
  const parts = [], r = w.rand;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 360 + r() * 14, R = 13 + r() * 5, s = 0.5 + r() * 0.9; parts.push([i % 3 ? shardG() : octG(), M(Math.cos(a * DEG) * R, (r() - 0.5) * 22, Math.sin(a * DEG) * R, s, s * (i % 3 ? 3.4 : 1.5), s, r() * 60 - 30, r() * 360, r() * 40), [0x86ecd8, 0xffd28a, 0xffa8d8][i % 3]]); }
  const orbitG = new THREE.BufferGeometry(); { const { merged } = { merged: null }; void merged; }
  const orbit = new THREE.Mesh(mergeParts(parts), w.material("paint")); orbit.position.set(x, cy, z); void orbitG;
  for (const m of [core, halo, orbit]) { m.frustumCulled = false; w.scene.add(m); }
  halo.renderOrder = 6;
  w.disposables.push(coreM, haloM, halo.geometry, orbit.geometry);
  w.col.addSphere(V3(x, cy, z), 4.2);
  const cA = new THREE.Color(1.1, 2.2, 2.0), cB = new THREE.Color(2.6, 1.9, 1.2);
  w.updaters.push((dt, t) => {
    const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 1.7), 3), slow = 0.5 + 0.5 * Math.sin(t * 0.23);
    core.scale.set(3.6 + beat * 0.7, 6.4 + beat * 1.1, 3.6 + beat * 0.7); core.rotation.y = t * 0.4;
    coreM.color.copy(cA).lerp(cB, slow).multiplyScalar(0.75 + beat * 0.6);
    halo.scale.setScalar(8 + beat * 5); haloM.opacity = 0.14 + beat * 0.22;
    orbit.rotation.y = -t * 0.12; orbit.position.y = cy + Math.sin(t * 0.5) * 1.2;
  });
  w.pool(x, y0 + 4.3, z, 16, TEAL, 0.5); w.pool(x, y0 + 0.2, z, 44, TEAL, 0.22);
  w.shaft(x, cy + 13, z, 0.5, 8.5, 26, TEAL, 0.1);
  // 첨탑을 두른 빛 고리와 꼭대기 별
  for (const [yy, R, c, p] of [[86, 12.5, TEAL, 78], [104, 9.5, AMBER, 100], [120, 6.5, PINK, 84]]) ring(w, x, yb + yy, z, R, 0.22, c, { pitch: p, yaw: yy * 3, col: false, mat: "glow", seg: 40 });
  w.mesh(octG(), M(x, yb + MONO_H + 1.2, z, 1.3, 3.2, 1.3), ICE, "glow");
  K.blink.add(x, yb + MONO_H + 5, z, ICE, 0.9, 0);
}
// parts: [geo, matrix, color][] → 정점 색을 가진 한 지오메트리
function mergeParts(parts) {
  let n = 0; for (const [g] of parts) n += g.index ? g.index.count : g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), v = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
  let o = 0;
  for (const [g, m, color] of parts) {
    const P = g.attributes.position, N = g.attributes.normal, I = g.index, cnt = I ? I.count : P.count;
    c.set(color); nm.getNormalMatrix(m);
    for (let i = 0; i < cnt; i++, o++) { const k = I ? I.getX(i) : i; v.fromBufferAttribute(P, k).applyMatrix4(m); pos.set([v.x, v.y, v.z], o * 3); v.fromBufferAttribute(N, k).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], o * 3); col.set([c.r, c.g, c.b], o * 3); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return out;
}
export { mergeParts };

// ── 공명 숲: 코스가 꿰는 소리굽쇠 넷 + 둘레의 소리굽쇠·오르간 관·홑 결정, 바닥의 굳은 물결 ──
export function forest(w, K, V, ctx) {
  const r = w.rand, F = FOREST, gy = (x, z) => height(x, z), P = (a, R) => [F.x + Math.cos(a * DEG) * R, F.z + Math.sin(a * DEG) * R];
  monolith(w, K, V);
  ctx.taken.push([F.x, F.z, 25]);
  const SETS = [[CT, TEAL], [CV, VIO2], [CT, TEAL2], [CA, AMBER], [CP, PINK]];
  THREADED.forEach(([x, z, lx, lz, yoke, H], i) => {
    const [cols, glow] = [SETS[0], SETS[1], SETS[2], SETS[3]][i];
    fork(w, K, V, x, z, gy(x, z), lx, lz, { H, yoke: yoke || -3, gap: 13, rt: 2.9, cols, glow, name: "공명 숲 소리굽쇠 사이", pts: 450 });
    for (const s of [-1, 0, 1]) ctx.taken.push([x + lx * 9.4 * s, z + lz * 9.4 * s, 7]);
  });
  // 한 소리굽쇠가 설 수 있는가: 두 가지·멍에·줄기가 모두 코스 선에서 떨어져 있어야 한다
  const forkOk = (x, z, lx, lz, H, yoke, D, rt) => {
    const y0 = gy(x, z);
    for (const s of [-1, 1]) if (!ctx.clear3(x + lx * D * s, z + lz * D * s, rt + 1.5, y0 + yoke - 4, y0 + H + 3)) return false;
    return ctx.clear3(x, z, D + rt, y0 + yoke - 5, y0 + yoke + 5) && ctx.clear3(x, z, rt * 2.6, y0 - 2, y0 + yoke) && ctx.free(x, z, D + rt + 1, true) && ctx.freeTaken(x, z, D + rt + 2);
  };
  // 큰 소리굽쇠: 안쪽 고리와 바깥 고리에 각도를 정해 세운다(자리가 막히면 조금씩 돌려 본다)
  let nf = 0;
  for (const [a0, R0, H, yk, gap, rt, set] of [[38, 62, 96, 34, 12, 2.7, 3], [150, 66, 78, 30, 11, 2.4, 0], [212, 64, 88, 44, 12, 2.6, 4], [322, 66, 108, 52, 12, 2.8, 2], [58, 30, 74, 22, 9, 2.0, 1], [118, 28, 52, 18, 9, 1.9, 3], [205, 27, 60, 26, 9, 2.0, 0], [292, 27, 84, 40, 9, 2.1, 4], [8, 70, 56, 16, 10, 2.2, 1], [248, 72, 62, 20, 10, 2.2, 3], [96, 74, 44, 12, 10, 2.1, 2]]) {
    for (let k = 0; k < 14; k++) {
      const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 5, R = R0 + (k > 6 ? 4 : 0), [x, z] = P(a, R), ta = (a + (nf % 2 ? 90 : 20)) * DEG, lx = Math.cos(ta), lz = Math.sin(ta), D = gap / 2 + rt;
      if (!forkOk(x, z, lx, lz, H, yk, D, rt)) continue;
      const [cols, glow] = SETS[set];
      fork(w, K, V, x, z, gy(x, z), lx, lz, { H, yoke: yk, gap, rt, cols, glow, name: "공명 숲 소리굽쇠 사이" });
      ctx.taken.push([x, z, D + rt + 2]); nf++;
      break;
    }
  }
  // 오르간 관: 바깥 둘레에 접선 방향으로 선 줄
  let np = 0;
  for (const [a0, R0, n, H, rr, set, rise] of [[22, 84, 7, 52, 2.3, 0, "arc"], [72, 86, 6, 40, 2.1, 4, "up"], [128, 84, 8, 58, 2.4, 2, "arc"], [176, 86, 6, 44, 2.2, 3, "up"], [232, 88, 7, 50, 2.3, 1, "arc"], [288, 84, 8, 62, 2.5, 0, "arc"], [338, 86, 6, 42, 2.1, 4, "up"], [262, 56, 5, 36, 1.9, 3, "arc"], [100, 54, 5, 30, 1.8, 0, "up"], [352, 56, 5, 34, 1.8, 1, "arc"]]) {
    for (let k = 0; k < 12; k++) {
      const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 4, [x, z] = P(a, R0), dx = -Math.sin(a * DEG), dz = Math.cos(a * DEG), sp = rr * 2.2, half = (n - 1) / 2 * sp;
      let ok = ctx.freeTaken(x, z, half + rr + 1);
      for (let i = 0; i < n && ok; i++) { const off = (i - (n - 1) / 2) * sp, px = x + dx * off, pz = z + dz * off; ok = ctx.clear3(px, pz, rr + 1.5, gy(px, pz) - 2, gy(px, pz) + H + 3) && ctx.free(px, pz, rr + 1, true); }
      if (!ok) continue;
      const [cols, glow] = SETS[set];
      pipes(w, K, V, x, z, gy(x, z), dx, dz, { n, r: rr, sp, H, cols, glow, rise });
      for (let i = 0; i < n; i += 2) { const off = (i - (n - 1) / 2) * sp; ctx.taken.push([x + dx * off, z + dz * off, sp + 1]); }
      np++;
      break;
    }
  }
  // 홑 결정 기둥: 빈자리마다 크고 작은 것
  let ns = 0;
  for (let i = 0; i < 1400 && ns < 46; i++) {
    const a = r() * 360, R = 24 + r() * 78, [x, z] = P(a, R), H = 12 + r() * r() * 46, rad = 1 + H * 0.035 + r() * 0.8, y0 = gy(x, z);
    if (!ctx.freeTaken(x, z, rad + 3) || !ctx.free(x, z, rad + 1, true) || !ctx.clear3(x, z, rad + 2, y0 - 2, y0 + H + 3)) continue;
    const [cols, glow] = SETS[(r() * 5) | 0], tilt = r() * 9, az = r() * 360;
    shard(w, x, y0 - 1, z, rad, H, tilt, az, cols[1]);
    shard(w, x, y0 - 1, z, rad * 1.04, H * 0.42, tilt, az, cols[0], { col: false });
    w.mesh(shardG(), M(x, y0 + H * 0.72, z, rad * 0.7, H * 0.3, rad * 0.7, tilt, az, 0), cols[2], "paint");
    for (let k = 0; k < 3; k++) { const b = r() * 360, d = rad * (1 + r() * 0.6); shard(w, x + Math.cos(b * DEG) * d, y0 - 0.5, z + Math.sin(b * DEG) * d, rad * (0.3 + r() * 0.25), H * (0.15 + r() * 0.25), 16 + r() * 24, -b + 90, cols[k % 3], { col: false }); }
    V.add([[x + rad * 0.8, y0 + 1, z], [x + rad * 0.72, y0 + H * 0.66, z]], 0.16 + rad * 0.04, glow, r(), 0.03);
    if (H > 26) K.blink.add(x, y0 + H + 0.3, z, glow, 0.4, ns & 1);
    w.pool(x, y0 + 0.1, z, rad * 4, glow, 0.24);
    ctx.taken.push([x, z, rad + 2.5]); ns++;
  }
  // 굳은 물결: 기둥에서 퍼져 나가다 멈춘 소리의 동심원(빛 테와 낮은 유리 둑)
  const y = F.y;
  for (const [R, c, t] of [[30, TEAL, 0.2], [39, AMBER, 0.16], [49, TEAL2, 0.2], [60, PINK, 0.16], [72, TEAL, 0.18]]) ring(w, F.x, gy(F.x + R, F.z) + 0.16, F.z, R, t, c, { pitch: 90, col: false, mat: "glow", seg: 72 });
  for (const [R, a0, arc] of [[34.5, 20, 1.5], [34.5, 200, 1.9], [44, 110, 1.3], [44, 290, 1.6], [54.5, 40, 1.2], [54.5, 170, 1.4], [66, 250, 1.5], [66, 80, 1.1]]) ring(w, F.x, y - 0.5, F.z, R, 1.25, a0 % 40 ? 0x7fdccc : 0x9fe8dc, { pitch: 90, roll: a0, arc, col: false, seg: 40 });
  void np; void lump; void bead; void crystals;
}

// ── 유리 협곡 꾸밈 ──
export const BRIDGE_X = [-188, -90, -26, 92], BEAM_X = [-146, 33];   // 턱 높이의 결정 다리 / 중턱에 걸린 쓰러진 결정
export function canyon(w, K, V, ctx) {
  const r = w.rand, s0 = canyonS(-268), s1 = CANYON_LEN - 34, PAL = [[CT, TEAL], [CT, TEAL2], [CV, VIO2], [CA, AMBER], [CP, PINK]];
  const lean = (lx, lz) => Math.atan2(lx, lz) / DEG;
  for (let s = s0; s < s1; s += 5.2) {
    const [cx, cz, tx, tz] = canyonPoint(s), nx = -tz, nz = tx, half = canyonHalf(s);
    for (const sd of [-1, 1]) {
      const ox = nx * sd, oz = nz * sd, q = r();
      // 바닥 가장자리에서 벽에 기대 선 큰 결정 (유리빛과 불투명한 것이 섞인다)
      if (q < 0.8) {
        const big = r() < 0.3, rad = big ? 2.6 + r() * 1.4 : 1.2 + r() * 1.3, d = half + (big ? 3.4 : 1.6) + r() * 2.2, j = (r() - 0.5) * 4, x = cx + ox * d + tx * j, z = cz + oz * d + tz * j, y = height(x, z) - 1.6;
        const h = (big ? 16 : 7) + r() * (big ? 16 : 12), [cols, glow] = PAL[r() < 0.62 ? (r() * 2) | 0 : 2 + ((r() * 3) | 0)], az = lean(ox + tx * (r() - 0.5) * 0.6, oz + tz * (r() - 0.5) * 0.6), tilt = 9 + r() * 12;
        const glassy = r() < 0.45;
        const okS = ctx.clear3(x, z, rad + h * Math.sin(tilt * DEG) + 1.5, y, y + h);
        if (okS) shard(w, x, y, z, rad, h, tilt, az, glassy ? cols[2] : cols[1], { mat: glassy ? "glass" : "paint", col: big });
        if (!okS) { /* 코스 선 가까이는 비운다 */ } else if (glassy) shard(w, x, y + h * 0.08, z, rad * 0.4, h * 0.84, tilt, az, glow, { mat: "glow", col: false });
        else w.mesh(shardG(), M(x, y, z, rad * 1.05, h * 0.36, rad * 1.05, tilt, az, 0), cols[0], "paint");
        if (big) w.pool(x - ox * 3, FLOOR + 0.5, z - oz * 3, 6, glow, 0.3);
      }
      // 중턱 턱에 돋은 작은 결정
      if (r() < 0.55) {
        const d = half + 4.6 + r() * 2.4, j = (r() - 0.5) * 5, x = cx + ox * d + tx * j, z = cz + oz * d + tz * j, y = height(x, z) - 0.8, [cols, glow] = PAL[(r() * 5) | 0], h = 3 + r() * 6;
        shard(w, x, y, z, 0.6 + r() * 0.9, h, 16 + r() * 26, lean(-ox, -oz) + (r() - 0.5) * 60, cols[1 + ((r() * 2) | 0)], { col: false });
        if (r() < 0.4) shard(w, x, y, z, 0.3, h * 0.7, 30, lean(-ox, -oz), glow, { mat: "glow", col: false });
      }
      // 턱의 이빨: 협곡 위로 기울어 내민 결정
      if (r() < 0.5) {
        const d = half + 12.5 + r() * 4, j = (r() - 0.5) * 5, x = cx + ox * d + tx * j, z = cz + oz * d + tz * j, y = height(x, z) - 1;
        const [cols, glow] = PAL[(r() * 5) | 0], h = 4 + r() * 9, rad = 0.8 + r() * 1.3;
        if (ctx.free(x, z, 1.5, true) && ctx.clear3(x, z, rad + h * 0.6 + 1, y, y + h)) {
          shard(w, x, y, z, rad, h, 14 + r() * 22, lean(-ox, -oz) + (r() - 0.5) * 50, cols[2], { mat: r() < 0.5 ? "glass" : "paint", col: h > 9 });
          shard(w, x, y + 0.5, z, rad * 0.36, h * 0.8, 14, lean(-ox, -oz), glow, { mat: "glow", col: false });
        }
      }
    }
  }
  // 벽을 타고 내려오는 빛 줄기(맥박이 턱에서 바닥으로 흐른다)와 바닥 가운데의 굽이치는 줄기
  let k = 0;
  for (let s = s0 + 6; s < s1; s += 13) {
    const [cx, cz, tx, tz] = canyonPoint(s), nx = -tz, nz = tx, half = canyonHalf(s), sd = k % 2 ? 1 : -1, c = [TEAL, AMBER, TEAL2, PINK, TEAL, VIO2][k % 6], pts = [];
    let j = (r() - 0.5) * 4;
    for (let i = 0; i <= 9; i++) { const d = half + 13.5 - i * 1.5, x = cx + nx * sd * d + tx * j, z = cz + nz * sd * d + tz * j; pts.push([x, height(x, z) + 0.3, z]); j += (r() - 0.5) * 3.4; }
    pts.push([cx + nx * sd * (half - 3.5) + tx * j, FLOOR + 0.5, cz + nz * sd * (half - 3.5) + tz * j]);
    V.add(pts, 0.3, c, r(), 0.02);
    k++;
  }
  const mid = [];
  for (let s = s0; s < s1 + 26; s += 5) { const [cx, cz, tx, tz] = canyonPoint(s), o = Math.sin(s * 0.09) * 3.2; const x = cx - tz * o, z = cz + tx * o; mid.push([x, height(x, z) + 0.28, z]); }
  V.add(mid, 0.34, ICE, 0, 0.012);
  for (let s = s0 + 10; s < s1; s += 24) { const [cx, cz] = canyonPoint(s); w.pool(cx, FLOOR + 0.6, cz, 13, k++ % 2 ? TEAL : TEAL2, 0.24); }

  // 결정 다리: 턱에서 턱으로 걸린 육각 결정 들보(유리 껍질 + 속의 빛 심). 밑으로 날아 지난다
  BRIDGE_X.forEach((bx, bi) => {
    const s = canyonS(bx), [cx, cz, tx, tz] = canyonPoint(s), nx = -tz, nz = tx, E = canyonHalf(s) + 16, [cols, glow] = PAL[[0, 3, 1, 4][bi]];
    const A = [cx - nx * E, 0, cz - nz * E], B = [cx + nx * E, 0, cz + nz * E]; A[1] = height(A[0], A[2]) + 1.2; B[1] = height(B[0], B[2]) + 1.2;
    const N = 4, pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; pts.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + Math.sin(u * Math.PI) * 3.4, A[2] + (B[2] - A[2]) * u]); }
    for (let i = 0; i < N; i++) {
      hexBeam(w, pts[i], pts[i + 1], 2.5, i % 2 ? cols[2] : cols[1], { col: true });
      hexBeam(w, pts[i], pts[i + 1], 3.3, cols[2], { mat: "glass" });
      // 위로 돋은 결정과 밑으로 늘어진 고드름 결정
      for (let q = 0; q < 3; q++) {
        const u = (q + 0.5) / 3, px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, pz = pts[i][2] + (pts[i + 1][2] - pts[i][2]) * u;
        shard(w, px + tx * (r() - 0.5) * 2, py + 1.6, pz + tz * (r() - 0.5) * 2, 0.5 + r() * 0.5, 2.5 + r() * 3.5, r() * 18, r() * 360, cols[1 + (q & 1)], { col: false });
        shard(w, px + tx * (r() - 0.5) * 2, py - 1.8, pz + tz * (r() - 0.5) * 2, 0.35 + r() * 0.35, 3 + r() * 5, 180, 0, q % 2 ? glow : cols[2], { mat: q % 2 ? "glow" : "paint", col: false });
      }
    }
    V.add(pts.map((p) => [p[0], p[1] - 2.7, p[2]]), 0.36, glow, bi * 0.3, 0.02);
    V.add(pts.map((p) => [p[0], p[1] + 2.7, p[2]]), 0.24, ICE, bi * 0.3 + 0.5, 0.02);
    for (const e of [A, B]) {
      for (let q = 0; q < 5; q++) { const a = r() * 360, d = 2 + r() * 4, sx = e[0] + Math.cos(a * DEG) * d, sz = e[2] + Math.sin(a * DEG) * d, sr = 0.8 + r() * 1.2, sh = 5 + r() * 7, st = 10 + r() * 20, saz = r() * 360; if (ctx.clear3(sx, sz, sr + 2, e[1] - 2.5, e[1] + sh)) shard(w, sx, e[1] - 2.5, sz, sr, sh, st, saz, cols[q % 3], { col: q < 2 }); }
      K.blink.add(e[0], e[1] + 4.5, e[2], glow, 0.4, bi & 1);
      ctx.taken.push([e[0], e[2], 7]);
    }
    w.gap("결정 다리 밑", cx, (RIM + FLOOR) / 2 + 2, cz, Math.atan2(-nz, nx) / DEG, canyonHalf(s) * 2 + 8, 26, 350);
  });
  // 쓰러진 결정: 중턱에 비스듬히 걸려 바닥 위로 낮은 문을 만든다
  BEAM_X.forEach((bx, bi) => {
    const s = canyonS(bx), [cx, cz, tx, tz] = canyonPoint(s), nx = -tz, nz = tx, half = canyonHalf(s), sd = bi ? -1 : 1, [cols, glow] = PAL[bi ? 4 : 2];
    const A = [cx - nx * sd * (half + 5.5), -3.5, cz - nz * sd * (half + 5.5)], B = [cx + nx * sd * (half + 4), -10.5, cz + nz * sd * (half + 4)], Mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    hexBeam(w, A, Mid, 2.1, cols[1], { col: true }); hexBeam(w, Mid, B, 2.1, cols[2], { col: true });
    hexBeam(w, A, B, 2.7, cols[2], { mat: "glass" });
    V.add([A, Mid, B].map((p) => [p[0], p[1] - 2.3, p[2]]), 0.3, glow, bi * 0.5, 0.025);
    for (let q = 0; q < 5; q++) { const u = 0.15 + q * 0.17, p = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u]; shard(w, p[0], p[1] - 1.6, p[2], 0.3 + r() * 0.3, 2 + r() * 3, 180, 0, q % 2 ? glow : cols[2], { mat: q % 2 ? "glow" : "paint", col: false }); }
    w.gap("쓰러진 결정 밑", cx, FLOOR + 6.5, cz, Math.atan2(-nz, nx) / DEG, half * 2 - 2, 11, 450);
  });
  // 동쪽 끝: 비탈 꼭대기의 뼈 아치(협곡을 빠져나오는 문)와 메아리 결정 무리
  {
    const [ex, ez, tx, tz] = canyonPoint(CANYON_LEN - 4), nx = -tz, nz = tx, a = [ex - nx * 15, 0, ez - nz * 15], b = [ex + nx * 15, 0, ez + nz * 15];
    a[1] = height(a[0], a[2]); b[1] = height(b[0], b[2]);
    ribArch(w, K, a[0], a[1], a[2], b[0], b[1], b[2], 17, { name: "협곡 끝 뼈 아치 아래", light: AMBER, t: 1.2 });
    ctx.taken.push([a[0], a[2], 6], [b[0], b[2], 6]);
    void tx;
  }
  void canyonAt; void BONE; void BONE2; void icoG; void hexTaperG; void column; void CP;
}
