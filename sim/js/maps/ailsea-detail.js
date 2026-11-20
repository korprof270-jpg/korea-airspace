// 빛 바다의 소품과 움직임: 떠다니는 해파리 등불, 하늘을 도는 가오리 떼, 석호의 흔들리는 부교, 목구멍으로 쏟아지는 폭포,
// 연잎 밭·말미잘·불가사리·조개, 수면 위를 튀어 오르는 빛 물고기 떼
import * as THREE from "../../vendor/three.module.min.js";
import { jellyGeo } from "./ail-kit.js";
import { rays as ailRays } from "./ail-detail.js";
import { M, tube, bead, lump, V3, DEG, ring, padG, scallopG, anemone, starfish, urchin, seashell, coralBush, lantern,
  NACRE, NACRE2, INDIGO, INDIGO2, AQUA, BLUE, BLUE2, ROSE, AMBER, BONE2, ROOT2,
  WY, ISL, CHOIR, LILY, PEARLS, height, islandOf, funnelY } from "./ailsea-kit.js";

export const rays = (w) => ailRays(w);

// ── 해파리 등불: 바다 위 10~60 m 에 떠서 천천히 맥박 친다(가까운 것은 부딪힌다) ──
export function jellies(w, ctx) {
  const r = w.rand, list = [];
  const add = (x, y, z, s, R) => list.push({ x, y, z, s, ph: r() * 6.28, R, sp: 0.05 + r() * 0.1 });
  // 석호 위: 목구멍 둘레를 도는 무리
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 24 + r() * 16, x = CHOIR.x + Math.cos(a) * d, z = CHOIR.z + Math.sin(a) * d, y = 24 + r() * 26; if (ctx.freeAir(x, y, z, 8)) add(x, y, z, 1 + r() * 1.4, 2 + r() * 3); }
  for (let i = 0; i < 500 && list.length < 60; i++) {
    const x = (r() * 2 - 1) * 225, z = (r() * 2 - 1) * 225, y = 9 + r() * 52, R = 2 + r() * 5;
    if (y < Math.max(0, height(x, z)) + 14 || !ctx.freeAir(x, y, z, 6 + R)) continue;
    add(x, y, z, 1 + r() * 1.9, R);
  }
  for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = 300 + r() * 500; add(Math.cos(a) * d, 50 + r() * 160, Math.sin(a) * d, 10 + r() * 14, 10 + r() * 20); }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1.2, 1.7, 1.8) });
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
  list.forEach((j, i) => { if (j.s < 5) w.rider([im, i], [[0, -0.1, 0, j.s * 0.85, j.s * 0.55, j.s * 0.85]], "creature"); });
}

// ── 석호의 부교: 목구멍 둘레에 떠서 출렁이는 진주 판 부교(합창 때 에일이 서는 자리) ──
export function pontoons(w, K, ctx, BOAT) {
  const r = w.rand, grp = [], geo = new THREE.CylinderGeometry(1, 1, 1, 8), mats = {};
  w.disposables.push(geo);
  const mk = (c, glow) => mats[c] || (mats[c] = glow ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6) }) : new THREE.MeshLambertMaterial({ color: c }));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.17, d = 40, x = CHOIR.x + Math.cos(a) * d, z = CHOIR.z + Math.sin(a) * d;
    if (z > CHOIR.z + 34 && Math.abs(x) < 20) continue;
    const g = new THREE.Group();
    const deck = new THREE.Mesh(geo, mk(i % 2 ? NACRE : NACRE2)); deck.scale.set(3.2, 0.5, 3.2); g.add(deck);
    const rim = new THREE.Mesh(geo, mk(i % 2 ? AQUA : ROSE, true)); rim.scale.set(3.3, 0.12, 3.3); rim.position.y = 0.2; g.add(rim);
    const post = new THREE.Mesh(geo, mk(BONE2)); post.scale.set(0.12, 3, 0.12); post.position.set(2.2, 1.7, 0); g.add(post);
    const pod = new THREE.Mesh(geo, mk(AMBER, true)); pod.scale.set(0.35, 0.7, 0.35); pod.position.set(2.2, 3.4, 0); g.add(pod);
    g.position.set(x, 0.1, z); g.rotation.y = r() * 6.28;
    w.scene.add(g); grp.push({ g, ph: r() * 6.28 });
    w.pool(x, 0.05, z, 6, i % 2 ? AQUA : ROSE, 0.3);
  }
  Object.values(mats).forEach((m) => w.disposables.push(m));
  w.updaters.push((dt, t) => { for (const p of grp) { p.g.position.y = 0.1 + Math.sin(t * 0.9 + p.ph) * 0.18; p.g.rotation.x = Math.sin(t * 0.7 + p.ph) * 0.04; p.g.rotation.z = Math.cos(t * 0.6 + p.ph) * 0.04; } });
  void BOAT; void K; void ctx;
}

// ── 폭포: 석호 물이 목구멍 가장자리에서 깔때기 속으로 쏟아진다 + 북쪽 후진의 노래 관에서 석호로 떨어지는 물줄기 ──
export function falls(w, K, ctx) {
  const { x: cx, z: cz, tR } = CHOIR;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, uniforms: { t: { value: 0 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float t; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ float y = vU.y * 6.0 + t * 1.8; float s = h(vec2(floor(vU.x * 40.0), floor(y)));
        float streak = smoothstep(0.35, 1.0, s) * (0.55 + 0.45 * sin(vU.x * 90.0 + t * 3.0));
        float fade = smoothstep(0.0, 0.15, vU.y) * smoothstep(1.0, 0.75, vU.y);
        vec3 c = mix(vec3(0.2, 0.9, 1.0), vec3(0.7, 0.6, 1.0), vU.y);
        gl_FragColor = vec4(c * (0.35 + streak) * fade, 1.0); }`,
  });
  // 깔때기 안쪽 벽을 따라 내려가는 물 장막 여섯(목구멍 가장자리 → 깊이 10 m)
  const pts = [];
  for (let i = 0; i <= 10; i++) { const d = tR - 0.6 - i * 0.9; pts.push(new THREE.Vector2(d, funnelY(d) + 0.6)); }
  for (let k = 0; k < 6; k++) {
    const g = new THREE.LatheGeometry(pts, 8, (k / 6) * Math.PI * 2, Math.PI / 5);
    const o = new THREE.Mesh(g, mat); o.position.set(cx, 0, cz); o.frustumCulled = false; o.renderOrder = 7;
    w.scene.add(o); w.disposables.push(g);
  }
  // 후진 노래 관의 물줄기: 고리 북쪽 마루(높이 4.4)에서 석호로 떨어지는 띠 넷
  for (const deg of [-120, -100, -80, -60]) {
    const a = deg * DEG, d0 = CHOIR.Rp - 1, x = cx + Math.cos(a) * d0, z = cz + Math.sin(a) * d0;
    const g = new THREE.PlaneGeometry(4.2, 5.6, 1, 1); g.translate(0, -2.8 + CHOIR.top + 0.4, 0);
    const o = new THREE.Mesh(g, mat); o.position.set(x, 0, z); o.rotation.y = -a + Math.PI / 2; o.frustumCulled = false; o.renderOrder = 7;
    w.scene.add(o); w.disposables.push(g);
    w.pool(cx + Math.cos(a) * (d0 - 4), 0.05, cz + Math.sin(a) * (d0 - 4), 6, AQUA, 0.45);
  }
  w.disposables.push(mat);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
  void K; void ctx;
}

// ── 바닥 소품: 연잎 밭, 섬 위 말미잘·불가사리·조개·성게, 물가의 산호 덤불 ──
export function flora(w, K, ctx) {
  const r = w.rand;
  // 연잎 밭: 물 위에 뜬 큰 잎과 빛 꽃 봉오리
  for (let i = 0, k = 0; i < 260 && k < 46; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * LILY[2] * 1.3, x = LILY[0] + Math.cos(a) * d, z = LILY[1] + Math.sin(a) * d;
    if (height(x, z) > -0.3 || !ctx.free(x, z, 0.5, true)) continue;
    const s = 1.6 + r() * 3.2;
    w.mesh(padG(), M(x, 0.06 + (k % 3) * 0.01, z, s, s, s, 0, r() * 360, 0), k % 4 ? 0x2a8a7a : 0x3a6ab0, "paint");
    if (k % 3 === 0) { bead(w, x, 0.6, z, 0.35 + s * 0.08, k % 2 ? ROSE : AQUA); w.pool(x, 0.08, z, s * 1.6, k % 2 ? ROSE : AQUA, 0.35); }
    k++;
  }
  // 거대 연꽃 셋(빛 꽃잎)
  for (const [ox, oz] of [[6, -8], [-14, 10], [16, 14]]) {
    const x = LILY[0] + ox, z = LILY[1] + oz;
    if (!ctx.free(x, z, 3, true)) continue;
    w.mesh(padG(), M(x, 0.05, z, 6, 6, 6, 0, ox * 20, 0), 0x2a8a7a, "paint");
    for (let p = 0; p < 7; p++) w.mesh(scallopG(), M(x, 0.3, z, 1.4, 1.2, 2.6, -40, (p / 7) * 360, 0), p % 2 ? 0xff9ad8 : 0xffc8f0, "glow");
    bead(w, x, 1.2, z, 0.7, 0xfff0a0);
  }
  // 섬 위 작은 생물
  for (const I of Object.values(ISL)) {
    const n = Math.round(I.R * 0.9);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * I.R * 1.05, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (!ctx.free(x, z, 1, true)) continue;
      const y = Math.max(WY, height(x, z)), q = r();
      if (I.id === "nest") { if (q < 0.4) urchin(w, x, y, z, 0.7 + r() * 0.5, r, 0xff2a66); continue; }
      if (q < 0.28) starfish(w, x, y, z, 0.5 + r() * 0.5, r);
      else if (q < 0.5) seashell(w, x, y, z, 0.5 + r() * 0.6, r);
      else if (q < 0.72) anemone(w, x, y, z, 0.6 + r() * 0.5, r);
      else if (q < 0.86) urchin(w, x, y, z, 0.5 + r() * 0.4, r);
      else coralBush(w, x, y, z, 0.6 + r() * 0.6, r);
    }
  }
  void PEARLS; void lantern; void tube; void lump; void V3; void ring; void NACRE; void NACRE2; void INDIGO; void INDIGO2; void BLUE; void BLUE2; void AMBER; void ROOT2; void islandOf;
}

// ── 빛 물고기 떼: 수면 위로 포물선을 그리며 튀어 오르는 작은 빛 물고기(InstancedMesh) ──
export function schools(w) {
  const r = w.rand, fish = [], C = [[-60, 40], [-120, -10], [60, -90], [150, -40], [-40, -120], [80, 150], [-90, 150], [170, 110]];
  for (const [cx, cz] of C) for (let k = 0; k < 9; k++) {
    const x = cx + (r() - 0.5) * 30, z = cz + (r() - 0.5) * 30;
    if (height(x, z) > -0.6) continue;
    fish.push({ x, z, a: r() * 6.28, L: 5 + r() * 5, H: 1.5 + r() * 2, T: 2.6 + r() * 2, ph: r() * 10 });
  }
  const g = new THREE.ConeGeometry(0.22, 1.2, 5); g.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8afff0).multiplyScalar(1.8) });
  const im = new THREE.InstancedMesh(g, mat, fish.length);
  im.frustumCulled = false; w.scene.add(im); w.disposables.push(g, mat);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  w.updaters.push((dt, t) => {
    fish.forEach((f, i) => {
      const c = ((t + f.ph) % (f.T * 2.5)) / f.T;
      if (c > 1) { p.set(f.x, -3, f.z); s.setScalar(0.01); }
      else {
        const d = (c - 0.5) * f.L, y = f.H * (1 - (2 * c - 1) * (2 * c - 1)) - 0.2;
        p.set(f.x + Math.cos(f.a) * d, y, f.z + Math.sin(f.a) * d); s.setScalar(1);
        e.set(-(1 - 2 * c) * 1.1, -f.a + Math.PI / 2, 0, "YXZ"); q.setFromEuler(e);
      }
      im.setMatrixAt(i, m.compose(p, q, s));
    });
    im.instanceMatrix.needsUpdate = true;
  });
}
