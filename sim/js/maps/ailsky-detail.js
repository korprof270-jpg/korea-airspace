// 폭풍 무덤 디테일: 고원 바닥의 잔돌·뼈 조각·빛 이끼, 절벽에 늘어진 촉수, 기함에 자란 빈 합창 가시,
// 움직이는 것들 — 바람에 찢긴 깃발, 틈의 상승 기류에 떠도는 선체 파편, 금빛 불티, 바람 줄기, 기함을 도는 가오리 떼와 비행정
import * as THREE from "../../vendor/three.module.min.js";
import { factionModel } from "../factions.js";
import { crystals } from "./ail-kit.js";
import {
  M, tube, bead, lump, V3, DEG, lumpG, spikeG, rock, stump, podVine, spineTurret, Surf,
  INK, SLATE, SLATE2, ASH, CRYS, CRYS2, BONE, BONE2, BONE3, HULL2, HULL3, FLESH, FLESH2, GOLD, AMBER, VIO, VIO2, PINK, DIMV, DIMP, CHOR, TEAL, RIBS,
} from "./ailsky-kit.js";
import { height, PLT, plateauOf, fbm, vnoise } from "./ailsky-terrain.js";
import { SP, SY, HEART } from "./ailsky-base.js";

// ── 고원 바닥: 잔돌, 쓰러진 뼈, 빛 이끼 무늬, 결정 무리 ──
function ground(w, K, ctx) {
  const r = w.rand;
  for (const I of Object.values(PLT)) {
    const n = Math.round(I.R * I.R / 120);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * I.R, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (plateauOf(x, z, 2) !== I || !ctx.free(x, z, 1.5, true)) continue;
      const y = height(x, z), k = r();
      if (k < 0.4) rock(w, x, y, z, 0.6 + r() * 1.6, 0.4 + r() * 0.9, 0.6 + r() * 1.4, r() < 0.5 ? SLATE : SLATE2);
      else if (k < 0.55) stump(w, x, y, z, 0.4 + r() * 0.4, 2 + r() * 3, 30 + r() * 40, r() * 360, { col: false, color: r() < 0.5 ? BONE2 : BONE3 });
      else if (k < 0.75) {
        // 빛 이끼: 땅에 붙은 납작한 혹 + 작은 빛 방울
        const c = I.id === "sw" ? CHOR : I.id === "north" ? AMBER : r() < 0.5 ? TEAL : VIO2;
        w.mesh(lumpG(), M(x, y + 0.05, z, 1.2 + r(), 0.18, 1 + r(), 0, r() * 360, 0), I.id === "sw" ? 0x2a1c36 : 0x2a4a5a, "flat");
        bead(w, x, y + 0.25, z, 0.22, c);
        if (r() < 0.3) w.pool(x, y, z, 3, c, 0.25);
      } else if (k < 0.85 && ctx.free(x, z, 3)) crystals(w, x, z, 0.5 + r() * 0.5, r, { y, colors: [CRYS, CRYS2, 0x5a5ab0] });
      else rock(w, x, y, z, 0.3 + r() * 0.4, 0.2 + r() * 0.3, 0.3 + r() * 0.4, ASH);
    }
  }
}

// ── 절벽 촉수: 고원 가장자리에서 구름 바다로 늘어진 살덩이 줄기와 빛 주머니 ──
function cliffs(w, K, ctx) {
  const r = w.rand;
  for (const I of Object.values(PLT)) {
    for (let a = r(); a < 6.28; a += 0.32 + r() * 0.3) {
      let x = I.x + Math.cos(a) * I.R, z = I.z + Math.sin(a) * I.R;
      for (let k = 0; k < 6 && plateauOf(x, z, 0) === I; k++) { x += Math.cos(a) * 3; z += Math.sin(a) * 3; }
      for (let k = 0; k < 8 && plateauOf(x, z, 0) !== I; k++) { x -= Math.cos(a) * 2; z -= Math.sin(a) * 2; }
      const y = height(x, z);
      if (y < -8 || ctx.onBr(x, z, 4) || ctx.roadD(x, z) < 5) continue;
      podVine(w, x + Math.cos(a) * 1.5, y, z + Math.sin(a) * 1.5, 10 + r() * 30, { r: 0.45 + r() * 0.3, n: 5, sway: 1.4, pod: r() < 0.35 ? 1 + r() : 0, glow: r() < 0.5 ? DIMV : DIMP });
      // 절벽 면의 금빛 섬전암 줄
      if (r() < 0.4) { let p = [x + Math.cos(a) * 2, y - 2, z + Math.sin(a) * 2]; for (let j = 0; j < 4; j++) { const q = [p[0] + Math.cos(a) * 1.2 + (r() - 0.5) * 2, p[1] - 4 - r() * 3, p[2] + Math.sin(a) * 1.2 + (r() - 0.5) * 2]; tube(w, ...p, ...q, 0.2, j % 2 ? AMBER : GOLD, { mat: "glow", seg: 3 }); p = q; } }
    }
  }
}

// ── 기함에 자란 빈 합창 가시: 갈비 밑동과 등뼈 아래에 엉겨 붙은 창백한 가시 무리 ──
function thorns(w, K, ctx) {
  const r = w.rand;
  for (const [i, R] of RIBS.entries()) {
    if (i % 2) continue;
    for (const sd of [-1, 1]) {
      const p = SP(R.s + 4, sd * R.w * 0.9), gy = height(p[0], p[2]);
      if (gy < -10 || ctx.roadD(p[0], p[2]) < 8) continue;
      const ok = !ctx.LINES.some((L) => L.some((q) => Math.hypot(q.x - p[0], q.y - gy, q.z - p[2]) < 12));
      if (!ok) continue;
      if (i % 4 === 0) spineTurret(w, K, p[0], gy, p[2], 0.8 + r() * 0.3, { col: true });
      else for (let k = 0; k < 7; k++) w.mesh(spikeG(), M(p[0] + (r() - 0.5) * 6, gy - 0.2, p[2] + (r() - 0.5) * 6, 0.3 + r() * 0.3, 3 + r() * 6, 0.3 + r() * 0.3, r() * 60 - 30, r() * 360, 0), k % 2 ? 0xbcb6d0 : 0xe6e2f2, "flat");
      lump(w, p[0], gy + 0.4, p[2], 4, 1.2, 4, 0x1e1628, { mat: "paint" });
    }
  }
  // 등뼈 아래로 늘어진 가시 고드름(빛나는 끝)
  for (let s = 160; s < 290; s += 9) {
    if (Math.abs(s - 232) < 18) continue;
    const p = SP(s, (r() - 0.5) * 6), y = SY(s) - 4, L = 6 + r() * 8;
    w.mesh(spikeG(), M(p[0], y, p[2], 0.5, -L, 0.5, (r() - 0.5) * 20, r() * 360, 0), 0xd8d4e8, "flat");
    bead(w, p[0], y - L + 0.6, p[2], 0.35, CHOR);
  }
}


// ── 땅의 균열(금빛으로 달아오른 갈라진 틈), 바람에 깎인 작은 바위 언덕, 흩어진 선체 판 ──
function fissures(w, K, ctx) {
  const r = w.rand;
  for (const I of Object.values(PLT)) {
    const n = Math.round(I.R / 9);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * I.R * 0.85;
      let x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d, dir = r() * 6.28, prev = null;
      if (!ctx.free(x, z, 2, true)) continue;
      const hot = I.id === "north" || I.id === "east" || r() < 0.3;
      for (let k = 0; k < 7; k++) {
        if (plateauOf(x, z, 2) !== I || !ctx.free(x, z, 0.5, true)) break;
        const p = [x, height(x, z) + 0.06, z];
        if (prev) { tube(w, ...prev, ...p, 0.22, hot ? (k % 2 ? AMBER : GOLD) : (k % 2 ? DIMV : VIO2), { mat: "glow", seg: 3 }); tube(w, prev[0], prev[1] - 0.05, prev[2], p[0], p[1] - 0.05, p[2], 0.75, 0x14122a, { seg: 3, mat: "flat" }); }
        prev = p; dir += (r() - 0.5) * 1.3; x += Math.cos(dir) * (3 + r() * 3); z += Math.sin(dir) * (3 + r() * 3);
      }
    }
    // 바위 언덕: 층진 납작 바위를 겹쳐 쌓은 작은 메사
    for (let i = 0; i < Math.round(I.R / 20); i++) {
      const a = r() * 6.28, d = (0.3 + r() * 0.6) * I.R, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (plateauOf(x, z, 6) !== I || !ctx.free(x, z, 7)) continue;
      const y = height(x, z), R = 4 + r() * 4, H = 4 + r() * 7;
      for (let k = 0; k < 3; k++) rock(w, x + (r() - 0.5) * 2, y + H * (k / 3), z + (r() - 0.5) * 2, R * (1 - k * 0.22), H * 0.3, R * (0.8 - k * 0.15), k % 2 ? SLATE2 : SLATE);
      w.col.addCapsule(V3(x, y, z), V3(x, y + H * 0.7, z), R * 0.6);
      bead(w, x, y + H + 0.2, z, 0.3, GOLD);
      ctx.taken.push([x, z, R + 2]);
    }
    // 흩어진 선체 판: 비스듬히 박힌 검보라 판 + 뼈 테
    for (let i = 0; i < Math.round(I.R / 14); i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * I.R * 0.85, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (plateauOf(x, z, 3) !== I || !ctx.free(x, z, 4)) continue;
      const y = height(x, z), L = 3 + r() * 4, H = 2 + r() * 3, yaw = r() * 360, tl = 20 + r() * 40, S = new Surf();
      const m = M(x, y - 0.4, z, 1, 1, 1, tl, yaw, 0), P = (u, h) => { const v = new THREE.Vector3(u, h, 0).applyMatrix4(m); return [v.x, v.y, v.z]; };
      S.quad(P(-L, 0), P(L, 0), P(L * 0.8, H), P(-L * 0.7, H * 1.2)); S.flush(w, r() < 0.5 ? HULL2 : HULL3, "paint");
      tube(w, ...P(-L * 0.7, H * 1.2), ...P(L * 0.8, H), 0.18, BONE3, { seg: 3 });
      ctx.taken.push([x, z, L]);
    }
  }
}

// ── 깃발: 모아 둔 천을 한 메시로 만들어 정점 셰이더 대신 매 프레임 정점을 흔든다(조각이 적어 가볍다) ──
function flags(w, K) {
  const F = K.flags; if (!F.length) return;
  const NU = 6, NV = 3, pos = [], col = [], idx = [], base = [];
  const c = new THREE.Color();
  for (const f of F) {
    const o = pos.length / 3;
    c.set(f.color);
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU, v = j / NV, tear = u > 0.6 && (i + j) % 2 && f.tear > 0.4 ? 0.7 : 1;
      const x = f.base[0] + f.dir[0] * f.len * u, y = f.base[1] - f.hgt * v * (1 - u * 0.35 * tear), z = f.base[2] + f.dir[1] * f.len * u;
      pos.push(x, y, z); base.push(x, y, z, u, f.ph, f.dir[0], f.dir[1]); col.push(c.r * (1 - v * 0.3), c.g * (1 - v * 0.3), c.b * (1 - v * 0.3));
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = o + j * (NU + 1) + i, b = a + 1, d = a + NU + 1, e = d + 1; if (i === NU - 1 && j === NV - 1 && f.tear > 0.4) continue; idx.push(a, b, e, a, e, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x201030 }));
  m.frustumCulled = false; w.scene.add(m); w.disposables.push(g, m.material);
  const P = g.attributes.position;
  let acc = 0;
  w.updaters.push((dt, t) => {
    if ((acc += dt) < 1 / 30) return; acc = 0;
    for (let i = 0; i < P.count; i++) {
      const b = i * 7, u = base[b + 3], ph = base[b + 4], wv = Math.sin(t * 7 + u * 6 + ph) * u * 0.9 + Math.sin(t * 13 + u * 11 + ph) * u * 0.25;
      P.setXYZ(i, base[b] - base[b + 6] * wv, base[b + 1] + Math.sin(t * 5 + u * 4 + ph) * u * 0.25, base[b + 2] + base[b + 5] * wv);
    }
    P.needsUpdate = true;
  });
}

// ── 상승 기류에 떠도는 선체 파편: 틈 위로 천천히 돌며 오르내린다(InstancedMesh 하나) ──
function debris(w, ctx) {
  const r = w.rand, N = 70, g = new THREE.IcosahedronGeometry(1, 0), P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); P.setXYZ(i, v.x * 1.6, v.y * 0.25, v.z); }
  g.computeVertexNormals();
  const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0x3e2a64, flatShading: true }), N);
  const D = [];
  for (let i = 0; i < N; i++) {
    let x, z, ok = false;
    for (let k = 0; k < 30 && !ok; k++) { x = (r() * 2 - 1) * 220; z = (r() * 2 - 1) * 220; ok = height(x, z) < -40; }
    const y = -30 + r() * 60, s = 0.8 + r() * 3;
    if (!ctx.freeAir(x, y, z, s + 4)) { D.push(null); continue; }
    D.push({ x, y, z, s, ph: r() * 6.28, sp: 0.2 + r() * 0.4, rx: r(), rz: r() });
    im.setColorAt(i, new THREE.Color(r() < 0.3 ? BONE3 : r() < 0.5 ? HULL3 : HULL2));
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const set = (t) => {
    D.forEach((d, i) => {
      if (!d) { m.makeScale(0, 0, 0); im.setMatrixAt(i, m); return; }
      p.set(d.x + Math.sin(t * 0.07 + d.ph) * 6, d.y + Math.sin(t * d.sp + d.ph) * 3, d.z + Math.cos(t * 0.06 + d.ph) * 6);
      e.set(t * d.rx * 0.4, t * 0.2 + d.ph, t * d.rz * 0.3); q.setFromEuler(e); m.compose(p, q, sc.set(d.s, d.s, d.s)); im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  set(0); im.frustumCulled = false; w.scene.add(im); w.disposables.push(g, im.material);
  let acc = 0;
  w.updaters.push((dt, t) => { if ((acc += dt) < 1 / 30) return; acc = 0; set(t); });
}

// ── 금빛 불티(그을린 땅·심장·첨탑에서 바람에 날린다)와 바람 줄기: 정점 셰이더로 움직이는 점·선 ──
function sparks(w) {
  const r = w.rand, N = 900, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  const src = [[-30, 14, -195, 50], [HEART[0], HEART[1] - 10, HEART[2], 30], [-160, 0, 140, 40], [130, 20, -86, 30], [0, 10, 0, 220]];
  for (let i = 0; i < N; i++) { const s = src[i % src.length], a = r() * 6.28, d = Math.sqrt(r()) * s[3]; pos[i * 3] = s[0] + Math.cos(a) * d; pos[i * 3 + 1] = s[1]; pos[i * 3 + 2] = s[2] + Math.sin(a) * d; seed[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float seed; uniform float t; varying float vA; varying float vS;
      void main(){ float k = fract(t * (0.05 + seed * 0.07) + seed * 7.0); vec3 p = position;
        p.y += k * (40.0 + seed * 50.0); p.x += k * 60.0 * (0.6 + seed) + sin(t * 1.3 + seed * 30.0) * 3.0; p.z += k * 25.0 + cos(t * 1.1 + seed * 20.0) * 3.0;
        vA = sin(k * 3.14159) * (0.5 + 0.5 * sin(t * 9.0 + seed * 50.0)); vS = seed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = min(9.0, (2.0 + seed * 3.0) * 160.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      vec3 c = mix(vec3(1.0, 0.75, 0.3), vec3(1.0, 0.92, 0.6), vS); gl_FragColor = vec4(c * 1.6, vA * 0.8 * (1.0 - d * 2.0));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; w.scene.add(pts); w.disposables.push(g, mat);
  // 바람 줄기: 고원 위를 빠르게 스치는 희미한 선
  const M2 = 160, lp = new Float32Array(M2 * 6), ls = new Float32Array(M2 * 2);
  for (let i = 0; i < M2; i++) {
    const x = (r() * 2 - 1) * 260, y = -10 + r() * 90, z = (r() * 2 - 1) * 260, L = 8 + r() * 14, sd = r();
    lp.set([x, y, z, x + L, y + L * 0.05, z + L * 0.3], i * 6); ls[i * 2] = sd; ls[i * 2 + 1] = sd;
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("seed", new THREE.BufferAttribute(ls, 1));
  const lm = new THREE.ShaderMaterial({
    uniforms: mat.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float seed; uniform float t; varying float vA;
      void main(){ float k = fract(t * (0.12 + seed * 0.1) + seed * 13.0); vec3 p = position; p.x += (k - 0.5) * 520.0; p.z += (k - 0.5) * 160.0;
        vA = sin(k * 3.14159); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.7, 0.62, 1.0) * 0.5, vA * 0.35);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const ls2 = new THREE.LineSegments(lg, lm); ls2.frustumCulled = false; w.scene.add(ls2); w.disposables.push(lg, lm);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
}

// ── 가오리 떼와 비행정: 기함 둘레를 크게 돈다 ──
function flyers(w) {
  const r = w.rand, flock = [];
  const groups = [[10, 118, -70, 150, 1, 4, "grunt"], [-120, 70, 120, 90, -1, 3, "grunt"], [150, 60, -130, 70, 1, 2, "gunship"]];
  for (const [cx, y, cz, R, dir, n, kind] of groups) for (let k = 0; k < n; k++) {
    const mdl = factionModel("ail", kind, k === 0 ? PINK : 0xc060ff);
    if (!mdl) return;
    mdl.scale.setScalar(kind === "gunship" ? 1.6 : 2.4 + r() * 1.4);
    w.scene.add(mdl);
    flock.push({ mdl, cx, y: y + (r() - 0.5) * 14, cz, R: R + (r() - 0.5) * 20, dir, ph: k * 0.25 + r() * 0.06, sp: kind === "gunship" ? 0.12 : 0.07 + r() * 0.015 });
  }
  w.updaters.push((dt, t) => {
    for (const f of flock) {
      const a = f.ph + t * f.sp * f.dir, x = f.cx + Math.cos(a) * f.R, z = f.cz + Math.sin(a) * f.R;
      f.mdl.position.set(x, f.y + Math.sin(t * 0.5 + f.ph * 9) * 5, z);
      const tx = -Math.sin(a) * f.dir, tz = Math.cos(a) * f.dir;
      f.mdl.rotation.set(0, Math.atan2(-tx, -tz), 0.3 * f.dir, "YXZ");
      if (f.mdl.userData.tick) f.mdl.userData.tick(dt, 0.5, t);
    }
  });
}

export function detail(w, K, ctx) {
  fissures(w, K, ctx); ground(w, K, ctx); cliffs(w, K, ctx); thorns(w, K, ctx);
  flags(w, K); debris(w, ctx); sparks(w); flyers(w);
}
