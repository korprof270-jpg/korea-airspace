// 에일 행성 디테일: 떠 있는 바위섬, 포자 들판, 섬마다 흩뿌린 빛 식물, 안개 바다, 떠오르는 포자,
// 떠다니는 해파리와 하늘을 도는 가오리 떼(움직이는 생물은 InstancedMesh·공유 모델로 가볍게)
import * as THREE from "../../vendor/three.module.min.js";
import { factionModel } from "../factions.js";
import { M, tube, bead, lump, crystals, V3, coral, glowShroom, jellyGeo,
  ROOT, ROOT2, VIO2, PINK, TEAL, LIME } from "./ail-kit.js";
import { height, ISL, MIST, LAKE, LAKE_Y, islandOf, fbm, vnoise } from "./ail-terrain.js";

const G = {};
const tp = (k, f) => G[k] || (G[k] = f());
// 떠 있는 바위: 위는 평평하고 아래로 뾰족한 울퉁불퉁 고깔(윗면 중심이 원점, 반경 1, 깊이 1.6)
const floatG = () => tp("float", () => {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.max(0.02, Math.pow(1 - t, 0.8) * (1 + 0.08 * Math.sin(t * 17))), -t * 1.6)); }
  pts.reverse(); pts.push(new THREE.Vector2(0.96, 0.08), new THREE.Vector2(0.6, 0.16), new THREE.Vector2(0.01, 0.18));
  const g = new THREE.LatheGeometry(pts, 11), P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = 1 + 0.16 * Math.sin(Math.atan2(v.z, v.x) * 3 + v.y * 2.3) + 0.08 * Math.sin(Math.atan2(v.z, v.x) * 7); P.setXYZ(i, v.x * k, v.y, v.z * k); }
  const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
});

// ── 떠 있는 바위섬: 하늘 곳곳에 (트랙 근처는 비움). 윗면에 빛 식물, 아래로 뿌리 ──
export function floaters(w, K, ctx) {
  const r = w.rand, out = [];
  // 고정 배치(코스가 지나는 큰 섬) + 무작위
  const FIX = [[-60, 96, -120, 16], [70, 112, -100, 13], [-120, 128, 40, 15], [110, 86, 70, 12], [0, 150, 0, 18], [-40, 70, 150, 11]];
  const list = [...FIX];
  for (let i = 0; i < 900 && list.length < 26; i++) {
    const x = (r() * 2 - 1) * 230, z = (r() * 2 - 1) * 230, y = 48 + r() * 110, s = 5 + r() * r() * 14;
    list.push([x, y, z, s, true]);
  }
  for (const [x, y, z, s, rnd] of list) {
    if (!ctx.freeAir(x, y, z, s * 1.5 + 6) || y - height(x, z) < s * 1.6 + 18) continue;
    floatRock(w, K, x, y, z, s, r);
    ctx.air.push([x, y, z, s * 1.3]);
    out.push([x, y, z, s]);
    void rnd;
  }
  // 이웃한 바위섬 사이를 잇는 늘어진 덩굴(충돌 없음)
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = out.filter((q) => q !== a).sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) - Math.hypot(q[0] - a[0], q[1] - a[1], q[2] - a[2]))[0];
    if (!b || Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > 80 || i % 2) continue;
    let prev = [a[0], a[1] - a[3] * 0.3, a[2]];
    for (let k = 1; k <= 10; k++) { const t = k / 10, p = [a[0] + (b[0] - a[0]) * t, a[1] - a[3] * 0.3 + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 9, a[2] + (b[2] - a[2]) * t]; tube(w, ...prev, ...p, 0.35, k % 2 ? ROOT : ROOT2); if (k % 3 === 0) bead(w, ...p, 0.4, k % 2 ? TEAL : PINK); prev = p; }
  }
  return out;
}
function floatRock(w, K, x, y, z, s, r) {
  w.mesh(floatG(), M(x, y, z, s, s * (0.9 + r() * 0.4), s, 0, r() * 360, 0), r() < 0.5 ? 0x5a3a80 : 0x4a3070, "std:rock");
  w.mesh(floatG(), M(x, y + 0.05, z, s * 0.98, 0.12, s * 0.98, 0, r() * 360, 0), r() < 0.5 ? 0x3fb0a0 : 0x7a4ac8, "paint");
  w.col.addSphere(V3(x, y - s * 0.35, z), s * 0.78);
  w.col.addSphere(V3(x, y - s * 1.05, z), s * 0.38);
  // 윗면: 결정·버섯·산호 몇 개
  const n = 1 + ((s / 5) | 0);
  for (let k = 0; k < n; k++) {
    const a = r() * 6.28, d = r() * s * 0.55, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, q = r();
    if (q < 0.4) crystals(w, px, pz, 0.4 + s * 0.04, r, { y: y + 0.1, colors: [0x7d6cff, 0x9c86ff, 0x3fb8e8] });
    else if (q < 0.75) glowShroom(w, px, pz, y + 0.1, 0.8 + r() * 0.8, r);
    else coral(w, px, y + 0.1, pz, 0.6 + r() * 0.5, r, { depth: 2 });
  }
  // 아래로 늘어진 뿌리와 빛 방울
  for (let k = 0; k < 3 + (s / 4 | 0); k++) {
    const a = r() * 6.28, d = s * (0.3 + r() * 0.4), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, L = s * (0.8 + r() * 1.4);
    const top = y - s * 0.25 - (1 - d / s) * s * 0.6;
    tube(w, px, top, pz, px + (r() - 0.5) * 2, top - L, pz + (r() - 0.5) * 2, 0.18 + s * 0.015, ROOT2);
    bead(w, px, top - L - 0.3, pz, 0.35 + s * 0.02, r() < 0.5 ? TEAL : VIO2);
  }
  K.blink.add(x, y - s * 1.6, z, VIO2, 0.4 + s * 0.02, (x | 0) & 1);
}

// ── 포자 들판(남서): 빛나는 포자 꼬투리 밭(낮은 것은 충돌 없음)과 큰 버섯 숲 ──
export function sporeField(w, K, ctx) {
  const r = w.rand, I = ISL.spore;
  let n = 0;
  for (let i = 0; i < 5000 && n < 420; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * I.R, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (fbm(x * 0.04, z * 0.04, 2) < 0.45 || !islandOf(x, z, 3) || !ctx.free(x, z, 0, true)) continue;
    const y = height(x, z), h = 0.6 + r() * 1.6;
    tube(w, x, y - 0.1, z, x + (r() - 0.5) * 0.4, y + h, z + (r() - 0.5) * 0.4, 0.07, r() < 0.5 ? 0x9a5ac8 : 0x5a8a9a);
    bead(w, x, y + h + 0.15, z, 0.22 + r() * 0.2, r() < 0.33 ? PINK : r() < 0.5 ? LIME : TEAL);
    n++;
  }
  for (let i = 0, k = 0; i < 900 && k < 34; i++) {
    const a = r() * 6.28, d = 20 + r() * 62, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d, s = 1.4 + r() * r() * 4.5;
    if (!islandOf(x, z, 4) || !ctx.free(x, z, 2.5 * s)) continue;
    glowShroom(w, x, z, height(x, z), s, r, { cap: k % 3 ? 0xa04ac8 : 0xd05aa0, glow: k % 2 ? PINK : LIME });
    ctx.taken.push([x, z, 2 * s]); k++;
  }
}

// ── 섬마다 흩뿌린 식물: 작은 결정 무리·산호·빛 버섯·풀 덤불 ──
export function flora(w, K, ctx) {
  const r = w.rand;
  let n = 0;
  for (let i = 0; i < 6000 && n < 190; i++) {
    const x = (r() * 2 - 1) * 240, z = (r() * 2 - 1) * 240, I = islandOf(x, z, 5);
    if (!I || I.id === "spore" || !ctx.free(x, z, 3)) continue;
    const y = height(x, z), q = r();
    if (q < 0.25) crystals(w, x, z, 0.35 + r() * 0.45, r, { y: y - 0.2, colors: r() < 0.5 ? [0x7d6cff, 0x9c86ff, 0x6a4ff0] : [0x3fb8e8, 0x6ad8ff, 0x2a8ad0] });
    else if (q < 0.45) coral(w, x, y, z, 0.5 + r() * 0.7, r, { depth: 2, colors: r() < 0.5 ? [0xff6ab8, 0xd04aa8] : [0x6a8aff, 0x8ab0ff], tip: r() < 0.5 ? PINK : TEAL });
    else if (q < 0.65) glowShroom(w, x, z, y, 0.5 + r() * 0.8, r);
    else {
      // 빛 풀 덤불: 가는 잎 다발
      const c = r() < 0.5 ? 0x5ad8c8 : 0xb07ae8;
      for (let k = 0; k < 6; k++) { const a = r() * 6.28, L = 0.8 + r() * 1.2; tube(w, x, y - 0.1, z, x + Math.cos(a) * L * 0.5, y + L, z + Math.sin(a) * L * 0.5, 0.06, c); }
      bead(w, x, y + 0.3, z, 0.25, c === 0x5ad8c8 ? TEAL : VIO2);
    }
    ctx.taken.push([x, z, 3]); n++;
  }
  // 바닥 빛 웅덩이 얼룩(가산)
  for (let i = 0, k = 0; i < 2000 && k < 70; i++) {
    const x = (r() * 2 - 1) * 240, z = (r() * 2 - 1) * 240;
    if (!islandOf(x, z, 8) || vnoise(x * 0.05, z * 0.05) < 0.6) continue;
    w.pool(x, height(x, z), z, 4 + r() * 8, r() < 0.5 ? TEAL : VIO2, 0.14); k++;
  }
}

// ── 안개 바다: 틈을 채운 세 겹의 흐르는 안개(셰이더, 충돌 없음) ──
export function mist(w) {
  const mats = [];
  MIST.forEach((y, i) => {
    const S = 3200, geo = new THREE.PlaneGeometry(S, S, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      uniforms: { t: { value: 0 }, a: { value: [0.55, 0.8, 0.97][i] }, k: { value: i }, cA: { value: new THREE.Color([0x9a86e8, 0x6a5ac8, 0x3a2e88][i]) }, cB: { value: new THREE.Color([0x7ae8e0, 0x4a8ad8, 0x2a2a70][i]) } },
      vertexShader: "varying vec3 vW; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }",
      fragmentShader: `varying vec3 vW; uniform float t, a, k; uniform vec3 cA, cB;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
        float fb(vec2 p){ float s = 0.0, m = 0.5; for (int i = 0; i < 4; i++){ s += m * n(p); p = p * 2.1 + 3.7; m *= 0.5; } return s; }
        void main(){
          vec2 p = vW.xz * (0.012 + k * 0.004) + vec2(t * 0.012 * (1.0 + k), t * 0.007);
          float c = fb(p + fb(p * 0.6 - t * 0.01) * 1.3);
          // 만화풍: 덩어리 경계를 두 단으로 끊는다
          float m = smoothstep(0.42 - k * 0.06, 0.46 - k * 0.06, c) * 0.6 + smoothstep(0.56, 0.6, c) * 0.4;
          float d = length(vW.xz - cameraPosition.xz), far = smoothstep(2200.0, 1300.0, d);
          vec3 col = mix(cB, cA, smoothstep(0.5, 0.62, c));
          gl_FragColor = vec4(col, clamp(m * a + (k > 1.5 ? 0.85 : k * 0.25), 0.0, 1.0) * far);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y; m.renderOrder = 4 - i; m.frustumCulled = false;
    w.scene.add(m); w.disposables.push(geo, mat); mats.push(mat);
  });
  w.updaters.push((dt, t) => { for (const m of mats) m.uniforms.t.value = t; });
}

// ── 떠오르는 포자: 섬 위로 천천히 오르다 사라지는 빛 알갱이(정점 셰이더로 움직인다) ──
export function spores(w) {
  const N = w.quality === "low" ? 700 : 1500, r = w.rand, pos = new Float32Array(N * 3), seed = new Float32Array(N * 2), col = new Float32Array(N * 3), c = new THREE.Color();
  const PAL = [0xff7ae0, 0x7af0ff, 0xc890ff, 0xb0ff8a];
  for (let i = 0; i < N; i++) {
    let x = 0, z = 0;
    for (let k = 0; k < 12; k++) { x = (r() * 2 - 1) * 250; z = (r() * 2 - 1) * 250; if (islandOf(x, z, 0) || k === 11) break; }
    pos.set([x, Math.max(-20, height(x, z)), z], i * 3);
    seed.set([r(), 0.6 + r() * 1.4], i * 2);
    c.set(PAL[i % 4]); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 2));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, px: { value: Math.min(2, window.devicePixelRatio || 1) } },
    vertexShader: `attribute vec2 seed; attribute vec3 color; varying vec3 vC; varying float vA; uniform float t, px;
      void main(){
        float life = fract(seed.x + t * 0.018 * seed.y);
        vec3 p = position + vec3(sin(t * 0.3 + seed.x * 40.0) * 4.0, life * 60.0, cos(t * 0.25 + seed.x * 31.0) * 4.0);
        vA = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.7, 1.0, life));
        vC = color;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(90.0 * px / -mv.z, 1.0, 9.0) * (0.7 + seed.y * 0.3);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard; float k = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(vC * 1.6 * k * vA, 1.0); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.renderOrder = 7;
  w.scene.add(pts); w.disposables.push(g, mat);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
}

// ── 해파리: 늪 위의 무리 + 섬 사이를 떠도는 것 + 하늘 높이 큰 것. 한 InstancedMesh, 매 프레임 종이 오므라든다 ──
export function jellies(w, ctx) {
  const r = w.rand, list = [];
  const add = (x, y, z, s, R) => list.push({ x, y, z, s, ph: r() * 6.28, R, sp: 0.05 + r() * 0.1 });
  // 늪 위: 코스(수면 위 6 m)보다 높이 떠 있다
  for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = r() * LAKE.R, x = LAKE.x + Math.cos(a) * d, z = LAKE.z + Math.sin(a) * d, y = LAKE_Y + 17 + r() * 14; if (ctx.freeAir(x, y, z, 9)) add(x, y, z, 0.9 + r() * 1.2, 2 + r() * 4); }
  for (let i = 0; i < 400 && list.length < 46; i++) {
    const x = (r() * 2 - 1) * 240, z = (r() * 2 - 1) * 240, y = 10 + r() * 60, R = 2 + r() * 5;
    if (y < height(x, z) + 8 || !ctx.freeAir(x, y, z, 6 + R)) continue;
    add(x, y, z, 1 + r() * 1.8, R);
  }
  for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 300 + r() * 500; add(Math.cos(a) * d, 60 + r() * 160, Math.sin(a) * d, 10 + r() * 14, 10 + r() * 20); }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1.5, 1.5, 1.5) });
  const im = new THREE.InstancedMesh(jellyGeo(), mat, list.length);
  im.frustumCulled = false; im.renderOrder = 5;
  w.scene.add(im); w.disposables.push(mat);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
  const tick = (dt, t) => {
    for (let i = 0; i < list.length; i++) {
      const j = list[i], a = j.ph + t * j.sp, pulse = Math.sin(t * 1.6 + j.ph * 3);
      p.set(j.x + Math.cos(a) * j.R, j.y + Math.sin(t * 0.5 + j.ph) * 2.5 + Math.max(0, pulse) * 0.6, j.z + Math.sin(a) * j.R);
      e.set(Math.sin(t * 0.4 + j.ph) * 0.15, a, Math.cos(t * 0.35 + j.ph) * 0.15);
      q.setFromEuler(e);
      sc.set(j.s * (1 + pulse * 0.1), j.s * (1 - pulse * 0.14), j.s * (1 + pulse * 0.1));
      im.setMatrixAt(i, m.compose(p, q, sc));
    }
    im.instanceMatrix.needsUpdate = true;
  };
  tick(0, 0);
  w.updaters.push(tick);
  // 가까운 해파리는 부딪힌다(움직이는 충돌 상자)
  list.forEach((j, i) => { if (j.s < 5) w.rider([im, i], [[0, -0.1, 0, j.s * 0.85, j.s * 0.55, j.s * 0.85]], "creature"); });
}

// ── 가오리 떼: 에일의 날짐승이 하늘을 크게 돈다(공유 모델, 충돌 없음) ──
export function rays(w) {
  const r = w.rand, flock = [];
  const groups = [[0, 70, 0, 150, 1], [-150, 95, 150, 70, -1], [160, 110, -160, 80, 1]];
  for (const [cx, y, cz, R, dir] of groups) for (let k = 0; k < 4; k++) {
    const mdl = factionModel("ail", "grunt", k === 0 ? 0xff5ed8 : 0xc060ff);
    if (!mdl) return;
    mdl.scale.setScalar(2.2 + r() * 1.6);
    w.scene.add(mdl);
    flock.push({ mdl, cx, y: y + (r() - 0.5) * 16, cz, R: R + (r() - 0.5) * 24, dir, ph: k * 0.22 + r() * 0.05, sp: 0.08 + r() * 0.015 });
  }
  w.updaters.push((dt, t) => {
    for (const f of flock) {
      const a = f.ph + t * f.sp * f.dir, x = f.cx + Math.cos(a) * f.R, z = f.cz + Math.sin(a) * f.R;
      f.mdl.position.set(x, f.y + Math.sin(t * 0.6 + f.ph * 9) * 4, z);
      // 진행 방향(접선)을 바라보고 안쪽으로 기운다
      const tx = -Math.sin(a) * f.dir, tz = Math.cos(a) * f.dir;
      f.mdl.rotation.set(0, Math.atan2(-tx, -tz), 0.35 * f.dir, "YXZ");
      f.mdl.userData.tick(dt, 0.5, t);
    }
  });
}

// ── 먼 섬들: 시야 끝에 떠 있는 커다란 섬 실루엣(충돌 없음) ──
export function farIslands(w) {
  const r = w.rand, parts = [], G0 = floatG();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + r() * 0.2, d = 420 + r() * 700, s = 30 + r() * 70, y = -30 + r() * 140;
    parts.push([G0, M(Math.cos(a) * d, y, Math.sin(a) * d, s, s * (0.8 + r() * 0.6), s, 0, r() * 360, 0), r() < 0.5 ? 0x4a3070 : 0x3a2a64]);
    parts.push([G0, M(Math.cos(a) * d, y + 0.5, Math.sin(a) * d, s * 0.97, 0.1, s * 0.97, 0, r() * 360, 0), r() < 0.5 ? 0x3a9a90 : 0x6a42b0]);
    // 위에 선 첨탑 실루엣
    for (let k = 0; k < 2; k++) {
      const b = r() * 6.28, e = r() * s * 0.5, H = s * (0.6 + r() * 1.2);
      const sg = new THREE.ConeGeometry(1, 1, 5); sg.translate(0, 0.5, 0);
      parts.push([sg, M(Math.cos(a) * d + Math.cos(b) * e, y, Math.sin(a) * d + Math.sin(b) * e, s * 0.06, H, s * 0.06, 0, 0, 0), k ? 0x8a6cff : 0x5a8aff]);
    }
  }
  for (const [g, m, c] of parts) w.mesh(g, m, c, "flat");
}
