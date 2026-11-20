// 폭풍 무덤의 하늘: 먹보라 폭풍 구름 벽과 소용돌이 구름 천장, 고원 밑을 채운 구름 바다(세 층),
// 멀리 떠 있는 메사 실루엣과 추락한 함대의 잔해, 그리고 금빛 번개(구름 속 섬광 + 이따금 첨탑에 내리꽂히는 낙뢰)
import * as THREE from "../../vendor/three.module.min.js";
import { M, hulk, frame3, GOLD, GOLD2, HULL, HULL2 } from "./ailsky-kit.js";
import { SEA } from "./ailsky-terrain.js";

const NOISE2 = `
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1,0)), f.x), mix(h2(i + vec2(0,1)), h2(i + vec2(1,1)), f.x), f.y); }
  float fb(vec2 p){ float s = 0.0, m = 0.5; for (int i = 0; i < 5; i++){ s += m * n2(p); p = p * 2.07 + 3.1; m *= 0.5; } return s; }
`;
const TAIL = `#include <tonemapping_fragment>
  #include <colorspace_fragment>`;

// 섬광 상태(모든 구름 셰이더가 같이 쓴다): fl 세기, fp 섬광이 난 방향(수평 단위)
const U = { t: { value: 0 }, fl: { value: 0 }, fp: { value: new THREE.Vector2(0, -1) } };

// ── 구름 바다: 고원 밑 세 층. 아래로 갈수록 짙고, 섬광 때 속에서 금빛으로 달아오른다 ──
function cloudSea(w) {
  SEA.forEach((y, i) => {
    const S = 3400, geo = new THREE.PlaneGeometry(S, S, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      uniforms: { ...U, a: { value: [0.6, 0.85, 0.98][i] }, k: { value: i }, cA: { value: new THREE.Color([0x4a3488, 0x342466, 0x1a1238][i]) }, cB: { value: new THREE.Color([0x1e1446, 0x160f36, 0x0c0820][i]) } },
      vertexShader: "varying vec3 vW; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }",
      fragmentShader: `varying vec3 vW; uniform float t, a, k, fl; uniform vec2 fp; uniform vec3 cA, cB;
        ${NOISE2}
        void main(){
          vec2 p = vW.xz * (0.011 + k * 0.004) + vec2(t * 0.02 * (1.0 + k), -t * 0.011);
          float c = fb(p + fb(p * 0.5 - t * 0.015) * 1.4);
          float m = smoothstep(0.4 - k * 0.06, 0.45 - k * 0.06, c) * 0.6 + smoothstep(0.56, 0.6, c) * 0.4;
          float d = length(vW.xz - cameraPosition.xz), far = smoothstep(2300.0, 1300.0, d);
          vec3 col = mix(cB, cA, smoothstep(0.5, 0.64, c));
          // 섬광: 구름 덩이 속에서 번지는 금빛 (방향 fp 쪽이 더 밝다)
          float dir = 0.5 + 0.5 * dot(normalize(vW.xz + vec2(0.001)), fp);
          col += vec3(1.0, 0.72, 0.3) * fl * (0.25 + 0.75 * dir) * smoothstep(0.45, 0.7, c) * (1.0 - k * 0.3);
          gl_FragColor = vec4(col, clamp(m * a + (k > 1.5 ? 0.9 : k * 0.25), 0.0, 1.0) * far);
          ${TAIL}
        }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y; m.renderOrder = 4 - i; m.frustumCulled = false;
    w.scene.add(m); w.disposables.push(geo, mat);
  });
}

// ── 폭풍 구름 벽(원통 안쪽 면)과 소용돌이 천장 ──
function stormWall(w) {
  const wall = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
    vertexShader: "varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }",
    fragmentShader: `varying vec2 vU; varying vec3 vW; uniform float t, fl; uniform vec2 fp;
      ${NOISE2}
      void main(){
        vec2 p = vec2(vU.x * 26.0 + t * 0.004, vU.y * 4.0);
        float c = fb(p + vec2(fb(p * 0.7 + t * 0.01) * 1.6, 0.0));
        // 구름 덩이: 아래는 짙고 위로 갈수록 성기다, 위쪽 가장자리는 해에 금빛 테
        float top = 0.35 + 0.35 * fb(vec2(vU.x * 9.0, 3.0));
        float body = smoothstep(top + 0.05, top - 0.1, vU.y + (c - 0.5) * 0.4);
        float rim = smoothstep(0.05, 0.0, abs(vU.y + (c - 0.5) * 0.4 - top + 0.02));
        vec3 col = mix(vec3(0.05, 0.03, 0.13), vec3(0.2, 0.12, 0.36), smoothstep(0.3, 0.7, c));
        col += vec3(0.9, 0.55, 0.3) * rim * 0.35;
        float dir = 0.5 + 0.5 * dot(normalize(vW.xz), fp);
        col += vec3(1.0, 0.75, 0.35) * fl * pow(dir, 6.0) * smoothstep(0.35, 0.7, c) * 1.4;
        gl_FragColor = vec4(col, body * 0.96);
        ${TAIL}
      }`,
  });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1500, 1500, 700, 96, 1, true), wall);
  cyl.position.y = 180;
  const ceil = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    vertexShader: "varying vec3 vW; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }",
    fragmentShader: `varying vec3 vW; uniform float t, fl; uniform vec2 fp;
      ${NOISE2}
      void main(){
        vec2 q = vW.xz; float r = length(q), a = atan(q.y, q.x);
        // 소용돌이: 반지름에 따라 비틀린 극좌표 잡음 (가운데는 뚫린 폭풍의 눈)
        vec2 p = vec2(a * 3.0 + r * 0.0032 + t * 0.006, r * 0.004 - t * 0.002);
        float c = fb(p * 2.0 + fb(p * 3.0) * 0.8);
        float eye = smoothstep(380.0, 620.0, r);
        float m = smoothstep(0.38, 0.55, c) * eye;
        vec3 col = mix(vec3(0.06, 0.04, 0.16), vec3(0.26, 0.16, 0.44), smoothstep(0.45, 0.75, c));
        col += vec3(0.95, 0.62, 0.3) * smoothstep(0.52, 0.56, c) * smoothstep(0.62, 0.56, c) * 0.25;
        float dir = 0.5 + 0.5 * dot(normalize(q), fp);
        col += vec3(1.0, 0.78, 0.4) * fl * pow(dir, 3.0) * smoothstep(0.4, 0.8, c) * 1.2;
        float far = smoothstep(2400.0, 1500.0, r);
        gl_FragColor = vec4(col, m * 0.9 * far);
        ${TAIL}
      }`,
  });
  const g = new THREE.PlaneGeometry(4000, 4000, 1, 1); g.rotateX(Math.PI / 2);
  const pl = new THREE.Mesh(g, ceil); pl.position.y = 520;
  for (const m of [cyl, pl]) { m.frustumCulled = false; m.renderOrder = -3; w.scene.add(m); w.disposables.push(m.geometry, m.material); }
}

// ── 먼 메사: 구름 바다 위로 솟은 고원 실루엣(위는 평평, 아래는 구름에 잠긴다) ──
const mesaG = (() => {
  let g = null;
  return () => {
    if (g) return g;
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.max(0.05, 1.0 + 0.1 * Math.sin(t * 13) - t * 0.35 + (i % 3 === 1 ? 0.06 : 0)), -t * 2.2)); }
    pts.reverse(); pts.push(new THREE.Vector2(0.9, 0.04), new THREE.Vector2(0.02, 0.08));
    g = new THREE.LatheGeometry(pts, 9);
    const P = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const a = Math.atan2(v.z, v.x), k = 1 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 5); P.setXYZ(i, v.x * k, v.y, v.z * k); }
    g = g.toNonIndexed(); g.computeVertexNormals();
    return g;
  };
})();
function farMesas(w, K) {
  const r = w.rand, sg = new THREE.ConeGeometry(1, 1, 5); sg.translate(0, 0.5, 0);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.15, d = 420 + r() * 620, s = 40 + r() * 90, y = -40 + r() * 70 + (d > 700 ? 30 : 0);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    w.mesh(mesaG(), M(x, y, z, s, s * (0.7 + r() * 0.5), s, 0, r() * 360, 0), r() < 0.5 ? 0x1e1c3c : 0x262448, "flat");
    w.mesh(mesaG(), M(x, y + 0.6, z, s * 0.96, 0.05, s * 0.96, 0, r() * 360, 0), r() < 0.5 ? 0x3c4a78 : 0x4a3a6e, "flat");
    for (let k = 0; k < 3; k++) {
      const b = r() * 6.28, e = r() * s * 0.6, H = s * (0.4 + r() * 1.1);
      w.mesh(sg, M(x + Math.cos(b) * e, y, z + Math.sin(b) * e, s * 0.05, H, s * 0.05, (r() - 0.5) * 10, 0, 0), k ? 0x2c2e58 : 0x3a3c70, "flat");
      if (k === 0 && K && r() < 0.6) K.rods.push([x + Math.cos(b) * e, y + H, z + Math.sin(b) * e]);
    }
  }
  // 추락한 함대: 먼 메사에 처박히거나 구름 위로 기운 함선 잔해
  for (let i = 0; i < 7; i++) {
    const a = 0.4 + i * 0.86 + r() * 0.3, d = 360 + r() * 300, x = Math.cos(a) * d, z = Math.sin(a) * d, L = 60 + r() * 70;
    const F = frame3(x, -20 + r() * 50, z, r() * 360, -14 - r() * 22, (r() - 0.5) * 50);
    hulk(w, null, F, { L, R: L * 0.15, t0: 0.15 + r() * 0.25, t1: 1, skin: 0.5, colors: [HULL, HULL2, 0x24183e], seam: 0.08, pods: 2, fins: 2, eye: 0x6a2a50 });
  }
}

// ── 번개: 구름 속 섬광(셰이더·반구광) + 낙뢰 줄기(미리 만든 지그재그 줄기 몇 개를 번갈아 켠다) ──
export function storm(w, K) {
  const r = w.rand, hemi = w.scene.children.find((o) => o.isHemisphereLight), h0 = hemi ? hemi.intensity : 1, hc0 = hemi ? hemi.color.clone() : null;
  const gold = new THREE.Color(0xffd27a);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD2).multiplyScalar(2.4), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const mat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(1.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  // 지그재그 줄기: 위에서 아래로 갈래를 친다. 리본 두 장(십자)으로 어느 쪽에서도 보이게
  const ribbon = (pts, wd, out) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      for (const [ox, oz] of [[wd, 0], [0, wd]]) out.push(a.x - ox, a.y, a.z - oz, a.x + ox, a.y, a.z + oz, b.x + ox, b.y, b.z + oz, a.x - ox, a.y, a.z - oz, b.x + ox, b.y, b.z + oz, b.x - ox, b.y, b.z - oz);
    }
  };
  const bolt = (target) => {
    const tg = new THREE.Vector3(...target), top = new THREE.Vector3(tg.x + (r() - 0.5) * 140, 430, tg.z + (r() - 0.5) * 140);
    const main = [], arr = [], glow = [], N = 22;
    for (let i = 0; i <= N; i++) { const t = i / N, p = top.clone().lerp(tg, t); if (i && i < N) { const j = 26 * Math.sin(t * Math.PI); p.x += (r() - 0.5) * j; p.z += (r() - 0.5) * j; p.y += (r() - 0.5) * 8; } main.push(p); }
    ribbon(main, 1.1, arr); ribbon(main, 5.5, glow);
    for (let b = 0; b < 4; b++) {
      let p = main[3 + ((r() * (N - 8)) | 0)].clone(); const br = [p.clone()], dx = (r() - 0.5) * 2, dz = (r() - 0.5) * 2;
      for (let k = 0; k < 6; k++) { p = p.clone().add(new THREE.Vector3(dx * 12 + (r() - 0.5) * 10, -12 - r() * 12, dz * 12 + (r() - 0.5) * 10)); br.push(p); }
      ribbon(br, 0.55, arr);
    }
    const g1 = new THREE.BufferGeometry(); g1.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(glow, 3));
    const grp = new THREE.Group(); grp.add(new THREE.Mesh(g1, mat), new THREE.Mesh(g2, mat2)); grp.visible = false;
    grp.children.forEach((m) => { m.frustumCulled = false; m.renderOrder = 7; });
    w.scene.add(grp); w.disposables.push(g1, g2);
    return { grp, tg };
  };
  const rods = K.rods.length ? K.rods : [[0, 0, -200]];
  const bolts = [];
  for (let i = 0; i < 9; i++) bolts.push(bolt(rods[(i * 7 + 3) % rods.length]));
  // 낙뢰 자리의 번쩍임: 땅에 깔리는 빛 웅덩이 + 점광원 하나
  const pt = new THREE.PointLight(0xffd890, 0, 160, 1.4); w.scene.add(pt);
  const flashPool = new THREE.Mesh(new THREE.CircleGeometry(16, 20), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  flashPool.rotation.x = -Math.PI / 2; w.scene.add(flashPool); w.disposables.push(flashPool.geometry, flashPool.material, mat, mat2);
  let next = 2.5, cur = null, life = 0, cloudT = 4, fl = 0;
  w.updaters.push((dt, t) => {
    U.t.value = t;
    // 구름 속 섬광: 자주, 짧게, 두세 번 깜박인다
    cloudT -= dt;
    if (cloudT <= 0) { cloudT = 1.2 + Math.random() * 3.5; fl = 0.7 + Math.random() * 0.6; const a = Math.random() * 6.28; U.fp.value.set(Math.cos(a), Math.sin(a)); }
    // 낙뢰: 4~9초마다 하나
    next -= dt;
    if (next <= 0 && !cur) {
      next = 4 + Math.random() * 5; cur = bolts[(Math.random() * bolts.length) | 0]; life = 0.55; cur.grp.visible = true; fl = 1.6;
      const d = Math.hypot(cur.tg.x, cur.tg.z) || 1; U.fp.value.set(cur.tg.x / d, cur.tg.z / d);
      pt.position.set(cur.tg.x, cur.tg.y + 8, cur.tg.z); flashPool.position.set(cur.tg.x, cur.tg.y + 0.3, cur.tg.z);
    }
    if (cur) {
      life -= dt;
      const on = life > 0.38 || (life > 0.2 && life < 0.3) || (life > 0.06 && life < 0.12);
      cur.grp.visible = on; pt.intensity = on ? 14 : 2; flashPool.material.opacity = on ? 0.6 : 0.15;
      if (life <= 0) { cur.grp.visible = false; cur = null; pt.intensity = 0; flashPool.material.opacity = 0; }
    }
    fl = Math.max(0, fl - dt * 3.2);
    const flick = fl * (0.6 + 0.4 * Math.sin(t * 60));
    U.fl.value = flick;
    if (hemi) { hemi.intensity = h0 * (1 + flick * 0.5); hemi.color.copy(hc0).lerp(gold, Math.min(1, flick * 0.4)); }
  });
}

export function sky(w, K) {
  cloudSea(w);
  stormWall(w);
  farMesas(w, K);
}
