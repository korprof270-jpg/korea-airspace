// 포자 숲 소품·움직임: 숲 바닥 빛 버섯·결정·이끼 돌·고사리, 남동 등불꽃 들판(흔들리는 꽃등), 북서 제국 포자 채굴 진지(도는 탐지기),
// 떠오르는 포자, 갓 사이를 떠도는 포자 구름, 하늘을 도는 가오리 떼
import * as THREE from "../../vendor/three.module.min.js";
import { factionModel } from "../factions.js";
import { M, tube, bead, lump, lumpG, capG, glowShroom, crystals, ring, V3, VIO, VIO2, PINK, TEAL, LIME, GOLD } from "./ail-kit.js";
import { height, DEG, MT, COMBAT, STRIKE, fbm } from "./ailwood-terrain.js";
import { MOSS, BARK2, BARK3 } from "./ailwood-base.js";

// ── 숲 바닥: 빛 버섯 무리·결정·이끼 돌·고사리 ──
function flora(w, K, ctx) {
  const r = w.rand;
  for (let i = 0; i < 1400 && ctx.taken.length < 170; i++) {
    const x = (r() * 2 - 1) * 228, z = (r() * 2 - 1) * 228, s = 0.8 + r() * 2.6;
    if (!ctx.free(x, z, s * 1.2, s < 1.5)) continue;
    const gy = height(x, z), k = r();
    if (k < 0.5) {
      glowShroom(w, x, z, gy, s, r, { glow: [TEAL, LIME, PINK, VIO2][i % 4] });
      for (let j = 0; j < 3; j++) glowShroom(w, x + (r() - 0.5) * s * 4, z + (r() - 0.5) * s * 4, gy, s * (0.3 + r() * 0.3), r, { glow: [TEAL, LIME, PINK, VIO2][(i + j) % 4] });
    } else if (k < 0.7) crystals(w, x, z, s * 0.6, r, { y: gy });
    else if (k < 0.85) {
      // 이끼 돌
      lump(w, x, gy + s * 0.3, z, s * 1.4, s * 0.8, s * 1.2, 0x34505a, { mat: "flat", col: s > 1.6 });
      lump(w, x, gy + s * 0.9, z, s * 1.1, s * 0.3, s * 0.9, MOSS, { mat: "flat" });
      if (s > 1.5) bead(w, x + s * 0.6, gy + s, z, 0.3, LIME);
    } else {
      // 고사리 다발: 휘어진 잎(가는 관 + 끝 방울)
      for (let j = 0; j < 7; j++) {
        const a = j / 7 * Math.PI * 2 + r(), L = s * (1.6 + r()), ex = x + Math.cos(a) * L, ez = z + Math.sin(a) * L;
        tube(w, x, gy, z, (x + ex) / 2, gy + L * 0.8, (z + ez) / 2, 0.12 * s, 0x2a8a6a, { mat: "flat" });
        tube(w, (x + ex) / 2, gy + L * 0.8, (z + ez) / 2, ex, gy + L * 0.4, ez, 0.08 * s, 0x3aa87a, { mat: "flat" });
        bead(w, ex, gy + L * 0.4, ez, 0.12 * s + 0.08, j % 2 ? TEAL : LIME);
      }
    }
    ctx.taken.push([x, z, s * 2]);
  }
  // 바닥 빛 이끼 웅덩이(충돌 없음, 낮다)
  for (let i = 0; i < 140; i++) {
    const x = (r() * 2 - 1) * 230, z = (r() * 2 - 1) * 230;
    if (fbm(x * 0.02 + 5, z * 0.02 + 1, 2) < 0.52) continue;
    w.pool(x, height(x, z), z, 5 + r() * 9, [TEAL, LIME, VIO][i % 3], 0.22);
  }
}

// ── 남동: 등불꽃 들판 — 키 큰 꽃대 끝의 빛 봉오리가 바람에 흔들린다(InstancedMesh) ──
function lanterns(w, K, ctx) {
  const r = w.rand, list = [], [bx, bz] = COMBAT.blue;
  for (let i = 0; i < 500 && list.length < 120; i++) {
    const a = r() * Math.PI * 2, d = 38 + r() * 46, x = bx + Math.cos(a) * d, z = bz + Math.sin(a) * d;
    if (Math.abs(x) > 228 || Math.abs(z) > 228 || !ctx.free(x, z, 0.5, true)) continue;
    const gy = height(x, z), h = 3 + r() * 6;
    tube(w, x, gy, z, x, gy + h, z, 0.1, 0x3a7a5a, { mat: "flat" });
    for (let j = 0; j < 2; j++) { const b = r() * 6.28; tube(w, x, gy + h * 0.3, z, x + Math.cos(b) * 0.9, gy + h * 0.45, z + Math.sin(b) * 0.9, 0.06, 0x3aa87a, { mat: "flat" }); }
    list.push({ x, y: gy + h, z, s: 0.5 + r() * 0.5, ph: r() * 6.28, c: [GOLD, PINK, TEAL][list.length % 3] });
  }
  for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = 40 + r() * 40; w.pool(bx + Math.cos(a) * d, height(bx + Math.cos(a) * d, bz + Math.sin(a) * d), bz + Math.sin(a) * d, 8 + r() * 6, GOLD, 0.25); }
  const geo = new THREE.SphereGeometry(1, 8, 6); geo.scale(0.8, 1.2, 0.8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) });
  const im = new THREE.InstancedMesh(geo, mat, list.length), c = new THREE.Color();
  list.forEach((l, i) => im.setColorAt(i, c.set(l.c)));
  w.scene.add(im); w.disposables.push(geo, mat);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const tick = (dt, t) => {
    list.forEach((l, i) => {
      const sw = Math.sin(t * 1.1 + l.ph) * 0.35, k = 1 + 0.15 * Math.sin(t * 2.3 + l.ph * 3);
      im.setMatrixAt(i, m.compose(p.set(l.x + sw, l.y + 0.4, l.z + Math.cos(t * 0.9 + l.ph) * 0.25), q, s.setScalar(l.s * k)));
    });
    im.instanceMatrix.needsUpdate = true;
  };
  tick(0, 0); w.updaters.push(tick);
}

// ── 북서: 제국 포자 채굴 진지 — 버섯을 베어 낸 그루터기, 채굴 탑과 도는 탐지기, 철책·상자 ──
const STL = 0x3b4049, IRN = 0x272a31, RED = 0xff2a36, HAZ = 0xe8b01a;
function camp(w, K, ctx) {
  const r = w.rand, [cx, cz] = STRIKE.core;
  // 베어 낸 버섯 그루터기(잘린 단면이 빛난다)
  for (let i = 0; i < 40 && ctx.taken.length < 400; i++) {
    const a = r() * 6.28, d = 25 + r() * 60, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, s = 1.5 + r() * 2.5;
    if (Math.abs(x) > 226 || Math.abs(z) > 226 || !ctx.free(x, z, s + 1)) continue;
    const gy = height(x, z), h = 1 + r() * 2.5;
    w.cyl(x, gy - 0.3, z, s, h, 0xc8b8e0, { mat: "paint", rt: s * 0.9 });
    w.cyl(x, gy + h - 0.25, z, s * 0.88, 0.3, PINK, { mat: "glow", col: false });
    ctx.taken.push([x, z, s + 2]);
  }
  // 채굴 탑: 격자 다리 + 굴착 관 + 위에서 도는 탐지기
  const tw = [-100, -185];
  if (ctx.free(tw[0], tw[1], 8)) {
    const gy = height(...tw), H = 34;
    for (const [dx, dz] of [[-4, -4], [4, -4], [4, 4], [-4, 4]]) w.pipe(tw[0] + dx * 1.6, gy, tw[1] + dz * 1.6, tw[0] + dx * 0.4, gy + H, tw[1] + dz * 0.4, 0.45, STL, { mat: "metal" });
    for (let y = 6; y < H; y += 7) { const k = 1.6 - (y / H) * 1.2; for (const [a, b] of [[[-4, -4], [4, -4]], [[4, -4], [4, 4]], [[4, 4], [-4, 4]], [[-4, 4], [-4, -4]]]) w.pipe(tw[0] + a[0] * k, gy + y, tw[1] + a[1] * k, tw[0] + b[0] * k, gy + y, tw[1] + b[1] * k, 0.22, IRN, { mat: "metal", col: false }); }
    w.cyl(tw[0], gy - 1, tw[1], 1.4, H - 4, 0x545a64, { mat: "metal" });
    w.box(tw[0], gy + H, tw[1], 5, 2, 5, IRN, { mat: "metal" });
    w.box(tw[0], gy, tw[1], 14, 1.2, 14, 0x1d2026, { mat: "std:panel", tile: 3 });
    for (const [dx, dz] of [[-7, -7], [7, -7], [7, 7], [-7, 7]]) { w.box(tw[0] + dx, gy + 1.2, tw[1] + dz, 0.6, 0.6, 0.6, RED, { mat: "glow", col: false }); K.blink.add(tw[0] + dx, gy + 2, tw[1] + dz, RED, 0.35, (dx > 0) & 1); }
    K.blink.add(tw[0], gy + H + 6.5, tw[1], RED, 0.6, 0);
    const dish = new THREE.Group(), dm = new THREE.MeshLambertMaterial({ color: 0x8a909a }), em = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.3, 0.3) });
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 0.6, 1.2, 16, 1, true), dm); pan.rotation.x = Math.PI / 2.4; pan.position.set(0, 2, 1.2);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), em); eye.position.set(0, 2.6, 3);
    dish.add(pan, eye); dish.position.set(tw[0], gy + H + 2, tw[1]);
    w.scene.add(dish); w.disposables.push(pan.geometry, dm, eye.geometry, em);
    w.updaters.push((dt) => { dish.rotation.y += dt * 0.8; });
    w.shaft(tw[0], gy + H, tw[1], 1, 6, H, 0xff5a40, 0.04);
    ctx.taken.push([tw[0], tw[1], 14]);
  }
  // 철책(띄엄띄엄)과 탄약 상자·연료통
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, d = 72, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (i % 4 === 3 || Math.abs(x) > 226 || Math.abs(z) > 226 || !ctx.free(x, z, 2)) continue;
    const gy = height(x, z);
    w.box(x, gy, z, 0.4, 3, 0.4, IRN, { mat: "metal" });
    const x2 = cx + Math.cos(a + 0.18) * d, z2 = cz + Math.sin(a + 0.18) * d;
    if (ctx.free(x2, z2, 2)) w.box((x + x2) / 2, gy + 0.8, (z + z2) / 2, Math.hypot(x2 - x, z2 - z), 1.6, 0.15, 0x3b4049, { ry: Math.atan2(-(z2 - z), x2 - x) / DEG, mat: "std:panel", tile: 2 });
    w.box(x, gy + 3, z, 0.5, 0.25, 0.5, HAZ, { mat: "glow", col: false });
  }
  for (let i = 0; i < 24; i++) {
    const a = r() * 6.28, d = 24 + r() * 40, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (Math.abs(x) > 226 || Math.abs(z) > 226 || !ctx.free(x, z, 2.5)) continue;
    const gy = height(x, z), ry = r() * 90;
    if (i % 3) { w.box(x, gy, z, 2.4, 1.6, 1.6, i % 2 ? 0x4a5040 : IRN, { ry, mat: "std:panel", tile: 2 }); w.box(x, gy + 1.6, z, 1.6, 1, 1.2, 0x545a64, { ry, mat: "std:panel", tile: 2, col: false }); }
    else for (let j = 0; j < 3; j++) w.cyl(x + j * 1.1 - 1.1, gy, z, 0.5, 1.5, j % 2 ? RED : 0x8a2a20, { mat: "paint" });
    ctx.taken.push([x, z, 3]);
  }
}

// ── 떠오르는 포자 알갱이(정점 셰이더로 움직인다) ──
function spores(w) {
  const N = w.quality === "low" ? 900 : 2200, r = w.rand, pos = new Float32Array(N * 3), seed = new Float32Array(N * 2), col = new Float32Array(N * 3), c = new THREE.Color();
  const PAL = [0x7af0ff, 0xb0ff8a, 0xff7ae0, 0xc890ff];
  for (let i = 0; i < N; i++) {
    let x, z;
    if (i % 3 === 0) { const a = r() * 6.28, d = r() * 26; x = MT[0] + Math.cos(a) * d; z = MT[1] + Math.sin(a) * d; }   // 그루터기 속에서 솟는 포자
    else { x = (r() * 2 - 1) * 240; z = (r() * 2 - 1) * 240; }
    pos.set([x, height(x, z), z], i * 3); seed.set([r(), 0.6 + r() * 1.4], i * 2);
    c.set(PAL[i % 4]); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 2));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, px: { value: Math.min(2, window.devicePixelRatio || 1) } },
    vertexShader: `attribute vec2 seed; attribute vec3 color; varying vec3 vC; varying float vA; uniform float t, px;
      void main(){ float life = fract(seed.x + t * 0.014 * seed.y);
        vec3 p = position + vec3(sin(t * 0.3 + seed.x * 40.0) * 5.0, life * 110.0, cos(t * 0.25 + seed.x * 31.0) * 5.0);
        vA = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.7, 1.0, life)); vC = color;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(110.0 * px / -mv.z, 1.0, 10.0) * (0.7 + seed.y * 0.3); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard; gl_FragColor = vec4(vC * 1.6 * smoothstep(0.5, 0.15, d) * vA, 1.0); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.renderOrder = 7;
  w.scene.add(pts); w.disposables.push(g, mat);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
}

// ── 포자 구름: 갓 높이를 천천히 떠도는 부드러운 빛 안개 덩이(큰 점 스프라이트) ──
function sporeClouds(w) {
  const r = w.rand, N = 70, pos = new Float32Array(N * 3), seed = new Float32Array(N * 2), col = new Float32Array(N * 3), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = r() * 6.28, d = 40 + r() * 200, x = MT[0] + Math.cos(a) * d, z = MT[1] + Math.sin(a) * d;
    pos.set([x, height(x, z) + 20 + r() * 70, z], i * 3); seed.set([r() * 6.28, 0.5 + r()], i * 2);
    c.set([0x5ae8c8, 0xa070ff, 0x80ff9a, 0xff70d0][i % 4]); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 2));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, px: { value: Math.min(2, window.devicePixelRatio || 1) } },
    vertexShader: `attribute vec2 seed; attribute vec3 color; varying vec3 vC; varying float vS; uniform float t, px;
      void main(){ vec3 p = position + vec3(sin(t * 0.05 * seed.y + seed.x) * 18.0, sin(t * 0.2 + seed.x) * 3.0, cos(t * 0.04 * seed.y + seed.x) * 18.0);
        vC = color; vS = seed.x; vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(2600.0 * px * seed.y / -mv.z, 2.0, 220.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vS; uniform float t;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard;
        float k = smoothstep(0.5, 0.0, d); k = k * k * (0.7 + 0.3 * sin(t * 0.8 + vS * 5.0));
        gl_FragColor = vec4(vC * k * 0.22, 1.0); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.renderOrder = 6;
  w.scene.add(pts); w.disposables.push(g, mat);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
}

// ── 가오리 떼: 갓 너머 하늘을 크게 돌고, 한 무리는 고리 밖 숲 위를 낮게 돈다(충돌 없음) ──
function rays(w) {
  const r = w.rand, flock = [];
  const groups = [[MT[0], 150, MT[1], 140, 1, 4], [-120, 125, 120, 70, -1, 3], [140, 135, -60, 60, 1, 3]];
  for (const [cx, y, cz, R, dir, n] of groups) for (let k = 0; k < n; k++) {
    const mdl = factionModel("ail", "grunt", k === 0 ? 0xff5ed8 : 0x3ff0d8);
    if (!mdl) return;
    mdl.scale.setScalar(2.4 + r() * 1.8);
    w.scene.add(mdl);
    flock.push({ mdl, cx, y: y + (r() - 0.5) * 14, cz, R: R + (r() - 0.5) * 20, dir, ph: k * 0.2 + r() * 0.05, sp: 0.07 + r() * 0.015 });
  }
  w.updaters.push((dt, t) => {
    for (const f of flock) {
      const a = f.ph + t * f.sp * f.dir, x = f.cx + Math.cos(a) * f.R, z = f.cz + Math.sin(a) * f.R;
      f.mdl.position.set(x, f.y + Math.sin(t * 0.6 + f.ph * 9) * 4, z);
      const tx = -Math.sin(a) * f.dir, tz = Math.cos(a) * f.dir;
      f.mdl.rotation.set(0, Math.atan2(-tx, -tz), 0.35 * f.dir, "YXZ");
      f.mdl.userData.tick(dt, 0.5, t);
    }
  });
}

export function detail(w, K, ctx) {
  camp(w, K, ctx);
  lanterns(w, K, ctx);
  flora(w, K, ctx);
  spores(w);
  sporeClouds(w);
  rays(w);
}
