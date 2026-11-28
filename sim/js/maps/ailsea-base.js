// 빛 바다 바탕과 주인공: 지형·수면(목구멍 자리를 뚫은 바다)·바다빛 층(물 위에 얹는 발광 무늬)·소용돌이 '목구멍'과 노래 기둥,
// 그리고 가라앉은 합창당(조개문·계단 객석·어미 소라탑과 소라 첨탑·노래 관·가라앉은 돔)
import * as THREE from "../../vendor/three.module.min.js";
import { M, tube, bead, lump, V3, DEG, ring, lumpG, ribDomeG, capG, shard, curveTube, conch, sunkDome, lantern, barnacles,
  NACRE, NACRE2, INDIGO, INDIGO2, DEEP, AQUA, BLUE, BLUE2, ROSE, ROSE2, BONE, BONE2, PEARL, TEAL, AMBER,
  WY, CHOIR, APSE, CP, height, colorFn, funnelY } from "./ailsea-kit.js";

const TAIL = `#include <tonemapping_fragment>
  #include <colorspace_fragment>`;
const NOISE = `float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }`;

// 조개문(대합창당 남쪽 문): 평면 z = ARCH.z, 발 x = ±ARCH.a, 안쪽 높이 ARCH.b
export const ARCH = { z: 48, a: 27, b: 42 };
// 고리 위 소라 첨탑 [각도, 거리, 높이, 굵기]
export const SPIRES = [[-146, 64, 72, 6.4], [-118, 65, 54, 5.2], [-62, 65, 58, 5.4], [-34, 64, 76, 6.6], [176, 64, 48, 5], [4, 64, 50, 5], [128, 63, 40, 4.2], [52, 63, 42, 4.4]];
export const MOTHER = { x: APSE.x, z: APSE.z, H: 98, R: 11 };

// ── 지형과 바다 ──
export function sea(w) {
  w.terrain(height, colorFn, { flat: "grass", flatTint: "0.86, 1.02, 1.5", rockTint: "0.7, 0.8, 1.3", rockLo: 0.36, rockHi: 0.62 });
  w.water(WY, 0x0b3a62);
  // 목구멍 자리는 수면을 뚫는다: 큰 고리 판으로 바꾼다
  const g = new THREE.RingGeometry(CHOIR.tR - 0.4, 1500, 72, 1);
  g.rotateX(-Math.PI / 2); g.translate(CHOIR.x, 0, CHOIR.z);
  w.waterMesh.geometry.dispose();
  w.waterMesh.geometry = g;
  w.disposables.push(g);
}

// ── 바다빛: 수면 바로 위에 얹는 가산 발광 층. 얕은 물가의 빛 띠, 플랑크톤 얼룩, 합창당으로 흘러드는 노래 줄기, 퍼지는 빛 물결, 가스 행성의 물그림자 ──
// rip: [[x, z, 주기(초), 위상], ...] (최대 12)
export function seaGlow(w, rip, giantDir) {
  const hf = w.heightField, n = hf.seg + 1, data = new Uint8Array(n * n);
  for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(((hf.data[i] + 6) / 8) * 255)));
  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.unpackAlignment = 1; tex.needsUpdate = true;
  const R = Array.from({ length: 12 }, (_, i) => new THREE.Vector4(...(rip[i] || [0, 0, 0, 0])));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { t: { value: 0 }, tH: { value: tex }, hk: { value: new THREE.Vector2(hf.half + hf.step / 2, 1 / (hf.step * n)) }, ctr: { value: new THREE.Vector2(CHOIR.x, CHOIR.z) }, rip: { value: R }, gdir: { value: new THREE.Vector3(...giantDir).normalize() } },
    vertexShader: "varying vec3 vW; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); vW = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }",
    fragmentShader: `varying vec3 vW; uniform float t; uniform sampler2D tH; uniform vec2 hk, ctr; uniform vec4 rip[12]; uniform vec3 gdir;
      ${NOISE}
      void main(){
        vec2 p = vW.xz, uv = (p + hk.x) * hk.y;
        float hgt = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? -6.0 : texture2D(tH, uv).r * 8.0 - 6.0;
        float dep = -hgt;
        vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 V = toCam / dist;
        float n1 = vn(p * 0.03 + vec2(t * 0.008, -t * 0.005)), n2 = vn(p * 0.085 - vec2(t * 0.01, t * 0.007));
        float nn = n1 * 0.62 + n2 * 0.38;
        // 플랑크톤 얼룩: 두 단으로 끊는다
        float patc = smoothstep(0.40, 0.72, nn);   // 부드럽게 (딱 끊기던 경계가 깜빡이던 것을 없앴다)
        // 물가: 얕을수록 밝고, 등심선이 바깥으로 숨 쉬듯 흘러 나간다
        float sh = 1.0 - smoothstep(0.2, 4.6, dep);
        float cl = fract(dep * 0.5 - t * 0.09 + n2 * 0.3);
        float lines = 0.0;   // 등심선은 뺐다: 바다 밑 지형 윤곽이 드러났다 다시 그려져 눈이 아팠다
        // 노래 줄기: 합창당 한가운데로 모이는 빛 줄, 빛 마디가 안쪽으로 흘러든다
        vec2 q = p - ctr; float r = length(q), a = atan(q.y, q.x);
        float wob = vn(vec2(r * 0.018, a * 2.5)) * 1.3;
        float vv = abs(fract(a * 2.5465 + wob) - 0.5);
        float vein = (1.0 - smoothstep(0.0, 0.16, vv * min(r, 160.0) / 60.0)) * (1.0 - smoothstep(180.0, 700.0, dist)) * smoothstep(26.0, 40.0, r) * (1.0 - smoothstep(330.0, 470.0, r));
        float pulse = 0.5 + 0.5 * sin(6.2832 * (r * 0.011 + t * 0.04 + floor(a * 2.5465 + wob) * 0.37));
        // 퍼지는 빛 물결
        float rings = 0.0;
        for (int i = 0; i < 12; i++) {
          if (rip[i].z <= 0.0) continue;
          float ph = fract(t / rip[i].z + rip[i].w), d = length(p - rip[i].xy), rr = ph * 30.0;
          rings += ((1.0 - smoothstep(0.0, 0.8, abs(d - rr))) + (1.0 - smoothstep(0.0, 0.5, abs(d - rr * 0.55))) * 0.6) * (1.0 - ph) * (1.0 - ph);
        }
        // 가스 행성의 물그림자: 물결에 깨진 세로 띠
        vec3 Rf = normalize(vec3(-V.x + (n2 - 0.5) * 0.16, V.y * 1.0, -V.z + (n1 - 0.5) * 0.16));
        float gd = dot(Rf, gdir);
        float refl = smoothstep(0.95, 0.985, gd) * (0.3 + 0.7 * smoothstep(0.35, 0.75, n2));
        vec3 teal = vec3(0.10, 0.95, 0.85), blue = vec3(0.12, 0.42, 1.0), pink = vec3(1.0, 0.35, 0.8);
        vec3 c = mix(blue, teal, n1) * (0.06 + patc * 0.2) + teal * (sh * 0.22)
               + mix(teal, vec3(0.7, 1.0, 1.0), pulse) * vein * (0.14 + pulse * 0.4) + mix(teal, pink, 0.45) * min(rings, 1.5) * 0.7
               + vec3(0.35, 0.9, 0.95) * refl * 0.5;
        // 목구멍 둘레의 밝은 테
        c += vec3(0.6, 1.0, 0.95) * (1.0 - smoothstep(0.0, 9.0, r - ${CHOIR.tR.toFixed(1)})) * 0.7;
        float land = smoothstep(-0.05, 0.12, dep) * step(${(CHOIR.tR - 0.4).toFixed(1)}, r);
        float far = mix(0.3, 1.0, smoothstep(1000.0, 200.0, dist)) * smoothstep(1500.0, 1150.0, dist);
        gl_FragColor = vec4(c * land * far, 1.0);
        ${TAIL}
      }`,
  });
  const geo = new THREE.PlaneGeometry(3000, 3000, 1, 1); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = WY + 0.07; m.renderOrder = 4; m.frustumCulled = false;
  w.scene.add(m); w.disposables.push(geo, mat, tex);
  w.updaters.push((dt, t) => { mat.uniforms.t.value = t; });
}

// ── 소용돌이 '목구멍': 수면이 깔때기로 말려 내려가는 나선 빛, 바닥의 빛 심, 하늘로 오르는 노래 기둥 ──
export function throat(w, K) {
  const { x, z, tR, tD } = CHOIR, pts = [];
  for (let i = 0; i <= 26; i++) { const d = 1.4 + ((tR + 0.9 - 1.4) * i) / 26; pts.push(new THREE.Vector2(d, funnelY(d) - (d < tR ? 0.12 : 0) + (d >= tR ? 0.03 : 0))); }
  const geo = new THREE.LatheGeometry(pts, 72);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: { t: { value: 0 } }, fog: false,
    vertexShader: "varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vL; uniform float t;
      ${NOISE}
      void main(){
        float r = length(vL.xz) / ${tR.toFixed(1)}, a = atan(vL.z, vL.x) / 6.2832;
        float sp = fract(a * 3.0 + log(r + 0.04) * 1.35 - t * 0.16);
        float band = smoothstep(0.0, 0.05, sp) * (1.0 - smoothstep(0.42, 0.47, sp));
        float sp2 = fract(a * 9.0 + log(r + 0.04) * 4.0 - t * 0.33);
        float fine = (1.0 - smoothstep(0.03, 0.07, abs(sp2 - 0.5))) * (0.35 + 0.65 * vn(vec2(a * 40.0, r * 9.0 - t * 0.7)));
        vec3 c = mix(vec3(0.015, 0.09, 0.24), vec3(0.04, 0.42, 0.62), band);
        c = mix(c, vec3(0.1, 0.75, 0.8), band * smoothstep(0.75, 0.3, r) * 0.6);
        c += vec3(0.6, 1.0, 0.95) * fine * (0.5 + 0.7 * (1.0 - r));
        c += vec3(1.0, 0.55, 0.9) * pow(1.0 - min(r, 1.0), 3.0) * 2.2;                 // 목 깊은 곳의 분홍 빛
        c += vec3(0.7, 1.0, 1.0) * smoothstep(0.93, 1.0, r) * 0.8;                     // 가장자리 물마루
        gl_FragColor = vec4(c, 1.0);
        ${TAIL}
      }`,
  });
  const fn = new THREE.Mesh(geo, mat);
  fn.position.set(x, WY, z); fn.frustumCulled = false;
  w.scene.add(fn); w.disposables.push(geo, mat);
  // 목 바닥의 빛 심
  w.sph(x, -tD + 2.2, z, 2.6, 0xffb0f0, { mat: "glow", col: false });
  // 노래 기둥: 목구멍에서 하늘로 오르는 빛(가산). 숨 쉬듯 밝기가 일렁이고, 빛 고리가 타고 오른다
  const bg = new THREE.CylinderGeometry(2.2, 5.5, 1, 20, 1, true); bg.translate(0, 0.5, 0);
  const bm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { t: { value: 0 } },
    vertexShader: "varying vec2 vU; varying vec3 vN2; varying vec3 vV; void main(){ vU = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vN2 = normalize(mat3(modelMatrix) * vec3(normal.x, 0.0, normal.z)); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }",
    fragmentShader: `varying vec2 vU; varying vec3 vN2; varying vec3 vV; uniform float t;
      void main(){
        float y = vU.y, edge = pow(abs(dot(normalize(vN2), normalize(vec3(vV.x, 0.0, vV.z)))), 1.5);
        float rise = smoothstep(0.86, 1.0, fract(y * 7.0 - t * 0.22)), breath = 0.7 + 0.3 * sin(t * 0.9);
        float fade = (1.0 - smoothstep(0.25, 1.0, y)) * smoothstep(0.0, 0.03, y);
        vec3 c = mix(vec3(0.25, 1.0, 0.9), vec3(1.0, 0.5, 0.9), smoothstep(0.1, 0.8, y));
        gl_FragColor = vec4(c * (0.2 * breath + rise * 0.55) * fade * edge, 1.0);
        ${TAIL}
      }`,
  });
  const beam = new THREE.Mesh(bg, bm);
  beam.position.set(x, -tD + 3, z); beam.scale.set(1, 190, 1); beam.renderOrder = 6; beam.frustumCulled = false;
  w.scene.add(beam); w.disposables.push(bg, bm);
  // 목구멍 위에 떠서 천천히 도는 노래 고리 셋(충돌 없음)
  const rings = [];
  for (const [yy, R, c] of [[20, 13, AQUA], [34, 9, ROSE], [46, 6, BLUE2]]) {
    const rg = new THREE.TorusGeometry(R, 0.28, 6, 48), rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2) });
    const o = new THREE.Mesh(rg, rm); o.position.set(x, yy, z); o.rotation.x = Math.PI / 2; o.frustumCulled = false;
    w.scene.add(o); w.disposables.push(rg, rm); rings.push(o);
  }
  w.updaters.push((dt, t) => {
    mat.uniforms.t.value = t; bm.uniforms.t.value = t;
    rings.forEach((o, i) => { o.rotation.x = Math.PI / 2 + Math.sin(t * 0.3 + i * 2) * 0.22; o.rotation.y = Math.cos(t * 0.24 + i) * 0.22; o.position.y = [20, 34, 46][i] + Math.sin(t * 0.5 + i) * 1.2; });
  });
  w.pool(x, WY + 0.3, z, tR + 16, AQUA, 0.3);
  w.gap("목구멍 소용돌이 속", x, -7, z, 0, 18, 9, 600, 90);
}

// ── 조개문: 부채꼴 조개 껍데기에 뚫린 큰 문. 문틀(진주 뼈대) + 부챗살 + 살 사이 막 + 물결 테 ──
function shellArch(w, K) {
  const { z, a, b } = ARCH, y0 = CHOIR.top, N = 44, FAN = 13;
  const inner = (th) => [Math.cos(th) * a, y0 + Math.sin(th) * b];
  const flen = (th) => 11 + 17 * Math.pow(Math.sin(th), 1.5);
  const outer = (th, k = 1) => { const [ix, iy] = inner(th), sc = 1 - 0.1 * Math.abs(Math.cos(th * FAN)); return [ix + Math.cos(th) * flen(th) * sc * k, iy + Math.sin(th) * flen(th) * sc * k]; };
  // 문틀
  const frame = [];
  for (let i = 0; i <= 22; i++) { const [px, py] = inner((i / 22) * Math.PI); frame.push([px, py, z]); }
  curveTube(w, frame, 3.2, 3.2, NACRE, { col: true, color2: PEARL, seg: 10 });
  for (let i = 1; i < 22; i += 2) w.mesh(lumpG(), M(...frame[i], 4.1, 3.6, 4.1, 0, i * 31, 0), INDIGO2, "flat");
  // 안쪽 빛 테(문 통과 길잡이)
  for (let i = 0; i < 22; i++) { const [ax, ay] = inner((i / 22) * Math.PI), [bx, by] = inner(((i + 1) / 22) * Math.PI), k = 1 - 3.3 / a; tube(w, ax * k, y0 + (ay - y0) * k, z, bx * k, y0 + (by - y0) * k, z, 0.36, i % 2 ? AQUA : BLUE2, { mat: "glow" }); }
  // 막: 문틀에서 부채 끝까지(양면)
  const pos = [], idx = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) { const th = (i / N) * Math.PI, [ix, iy] = inner(th), [ox, oy] = outer(th, 0.94); pos.push(ix, iy, z + side * 0.5, ox, oy, z + side * 0.25); }
    for (let i = 0; i < N; i++) { const p = base + i * 2; if (side > 0) idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); else idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  mg.setIndex(idx); mg.computeVertexNormals();
  w.mesh(mg, new THREE.Matrix4(), INDIGO, "paint");
  // 부챗살: 문틀에서 바깥으로 뻗는 뼈대, 끝마다 빛 구슬
  for (let k = 0; k <= FAN; k++) {
    const th = ((k + 0.0) / FAN) * Math.PI * 0.94 + Math.PI * 0.03, [ix, iy] = inner(th), [ox, oy] = outer(th, 1.04);
    tube(w, ix, iy, z, ox, oy, z, 1.25, k % 2 ? NACRE : NACRE2, { seg: 6 });
    w.col.addCapsule(V3(ix, iy, z), V3(ox, oy, z), 1.6);
    tube(w, ix, iy, z + 1.3, ox, oy, z + 0.9, 0.2, k % 2 ? AQUA : ROSE, { mat: "glow" });
    tube(w, ix, iy, z - 1.3, ox, oy, z - 0.9, 0.2, k % 2 ? AQUA : ROSE, { mat: "glow" });
    bead(w, ox, oy, z, 1.5, k % 2 ? AQUA : ROSE);
    if (k % 3 === 0) K.blink.add(ox + Math.cos(th) * 2, oy + Math.sin(th) * 2, z, k % 2 ? AQUA : ROSE, 0.6, k & 1);
  }
  // 물결 테
  const rim = [];
  for (let i = 0; i <= N; i++) { const [ox, oy] = outer((i / N) * Math.PI * 0.94 + Math.PI * 0.03); rim.push([ox, oy, z]); }
  curveTube(w, rim, 0.9, 0.9, PEARL, { seg: 6 });
  // 발: 뿌리처럼 퍼진 받침과 따개비, 빛 웅덩이
  for (const s of [-1, 1]) {
    lump(w, s * a, y0 + 1, z, 6.5, 3.4, 6.5, INDIGO2, { mat: "paint" });
    lump(w, s * (a + 9), y0 + 0.6, z, 5, 2.4, 5, INDIGO, { mat: "paint" });
    w.col.addSphere(V3(s * (a + 9), y0 + 0.5, z), 4);
    barnacles(w, s * (a + 2), y0, z + 6, 1.4, w.rand, 6); barnacles(w, s * (a + 2), y0, z - 6, 1.4, w.rand, 6);
    w.pool(s * a, y0 + 0.1, z, 16, AQUA, 0.36);
    K.blink.add(s * a, y0 + 8, z + 3.6, ROSE, 0.5, s > 0);
  }
  // 문 꼭대기에서 늘어진 빛 가닥(충돌 없음)
  for (let k = -3; k <= 3; k++) {
    if (!k) continue;
    const th = Math.PI / 2 + k * 0.2, [ix, iy] = inner(th), L = 5 + (Math.abs(k) % 2) * 3;
    tube(w, ix * 0.9, iy - 3.2, z, ix * 0.9, iy - 3.2 - L, z, 0.12, BLUE2, { mat: "glow" });
    bead(w, ix * 0.9, iy - 3.6 - L, z, 0.55, k % 2 ? ROSE : AQUA);
  }
  w.gap("대합창당 조개문", 0, y0 + b * 0.48, z, 0, a * 2 - 10, b - 10, 420);
}

// ── 계단 객석: 석호로 내려가는 진주 계단 넷과 단마다의 빛 줄, 석호 가의 노래 관 ──
function tiers(w, K, ctx) {
  const { x, z, Rp, Ri, top } = CHOIR, pts = [], n = 4, dw = (Rp - Ri + 1) / n, dh = (top + 0.2) / n;
  pts.push(new THREE.Vector2(Ri - 2.5, -1.8));
  for (let i = 0; i <= n; i++) { const r = Ri - 1 + i * dw, y = -0.2 + i * dh + 0.25; pts.push(new THREE.Vector2(r, y - dh * (i ? 1 : 0.4)), new THREE.Vector2(r, y)); }
  pts.push(new THREE.Vector2(Rp + 1.5, top + 0.22));
  const g = new THREE.LatheGeometry(pts, 96);
  { const ng = g.toNonIndexed(); ng.computeVertexNormals(); w.mesh(ng, M(x, 0, z), 0xa9b6e6, "paint"); }
  for (let i = 0; i <= n; i++) ring(w, x, -0.2 + i * dh + 0.36, z, Ri - 1 + i * dw + 0.25, 0.16, i % 2 ? AQUA : BLUE2, { pitch: 90, col: false, mat: "glow", seg: 96 });
  ring(w, x, top + 0.34, z, 70, 0.14, AQUA, { pitch: 90, col: false, mat: "glow", seg: 96 });
  ring(w, x, top + 0.34, z, 80, 0.14, BLUE, { pitch: 90, col: false, mat: "glow", seg: 96 });
  // 방사 줄눈(객석 통로): 12 갈래 빛 줄
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13, c = Math.cos(a), s = Math.sin(a);
    for (let k = 0; k < n; k++) { const r0 = Ri - 1 + k * dw + 0.3, r1 = r0 + dw - 0.6, y = -0.2 + k * dh + 0.4; tube(w, x + c * r0, y, z + s * r0, x + c * r1, y, z + s * r1, 0.12, ROSE, { mat: "glow", seg: 3 }); }
  }
  // 노래 관: 석호 가에 선 뼈 피리 다발(입이 빛난다)
  const r = w.rand;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 360 + 20, [px, pz] = CP(a, Ri - 3.5);
    if (Math.abs(((a + 90) % 360) - 180) < 30 || !ctx.free(px, pz, 4)) continue;   // 조개문 앞은 비운다
    for (let k = 0; k < 5; k++) {
      const off = (k - 2) * 1.5, tx = px + Math.cos((a + 90) * DEG) * off, tz = pz + Math.sin((a + 90) * DEG) * off, H = 9 + (2 - Math.abs(k - 2)) * 4.5 + r() * 2, rr = 0.55 + (2 - Math.abs(k - 2)) * 0.12;
      const lean = 0.1, ex = tx - Math.cos(a * DEG) * H * lean, ez = tz - Math.sin(a * DEG) * H * lean;
      tube(w, tx, -2.5, tz, ex, H, ez, rr, k % 2 ? BONE : BONE2, { col: k === 2, seg: 7 });
      ring(w, ex, H, ez, rr * 1.15, 0.14, k % 2 ? AQUA : ROSE, { pitch: 90, col: false, mat: "glow", seg: 10 });
      w.mesh(lumpG(), M(ex, H - 0.2, ez, rr * 0.8, 0.3, rr * 0.8), k % 2 ? AQUA : ROSE, "glow");
    }
    lump(w, px, -0.4, pz, 4.4, 1.5, 2.2, INDIGO2, { mat: "paint", ry: -a + 90 });
    w.pool(px, 0.2, pz, 7, AQUA, 0.3);
  }
}

// ── 합창당: 조개문, 객석, 어미 소라탑과 첨탑, 첨탑을 잇는 노래 줄, 고리 밖 얕은 물에 가라앉은 돔 ──
export function choirHall(w, K, ctx) {
  const r = w.rand, y0 = CHOIR.top;
  shellArch(w, K);
  tiers(w, K, ctx);
  // 어미 소라탑(가장 높은 탑): 후진 한가운데, 밑동에 뿌리 받침과 빛 고리 셋
  {
    const { x, z, H, R } = MOTHER;
    conch(w, K, x, y0, z, H, R, { light: AQUA, ry: 30, turns: 5, color: NACRE });
    lump(w, x, y0 + 1, z, R * 1.5, 3, R * 1.5, INDIGO2, { mat: "paint" });
    for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28 + 0.3, L = R * 1.25 + 4; curveTube(w, [[x + Math.cos(a) * R * 0.7, y0 + 6, z + Math.sin(a) * R * 0.7], [x + Math.cos(a) * L * 0.8, y0 + 3, z + Math.sin(a) * L * 0.8], [x + Math.cos(a) * L, y0 - 0.5, z + Math.sin(a) * L]], 1.3, 0.7, k % 2 ? BONE : BONE2, { col: false, seg: 6 }); }
    for (const [hy, rr, c, p] of [[H * 0.4, R * 1.5, AQUA, 84], [H * 0.6, R * 1.1, ROSE, 98], [H * 0.78, R * 0.75, BLUE2, 80]]) ring(w, x, y0 + hy, z, rr, 0.32, c, { pitch: p, col: false, mat: "glow", seg: 40 });
    w.pool(x, y0 + 0.2, z, 30, AQUA, 0.4);
    // 꼭대기 노래 불꽃
    shard(w, x, y0 + H - 3, z, 1.4, 9, 0, 0, ROSE, { mat: "glow", col: false });
    K.blink.add(x, y0 + H + 7, z, ROSE, 1.0, 0);
    w.gap("어미 소라탑 빛 고리 사이", x + R * 1.25, y0 + H * 0.4 + 3, z, 0, R * 0.9, 9, 380, 90);
  }
  // 고리 위 소라 첨탑
  const tips = [];
  SPIRES.forEach(([deg, d, H, R], i) => {
    const [x, z] = CP(deg, d);
    const c = conch(w, K, x, y0, z, H, R, { light: i % 2 ? AQUA : BLUE2, light2: i % 2 ? BLUE2 : AQUA, tilt: (i % 3) * 1.5, az: deg + 180, color: i % 3 === 1 ? NACRE2 : NACRE });
    lump(w, x, y0 + 0.6, z, R * 1.5, 1.8, R * 1.5, INDIGO2, { mat: "paint" });
    ring(w, x, y0 + H * 0.52, z, R * 1.35, 0.22, i % 2 ? ROSE : AQUA, { pitch: 90 + (i % 3 - 1) * 9, col: false, mat: "glow", seg: 28 });
    w.pool(x, y0 + 0.15, z, R * 3.4, i % 2 ? AQUA : BLUE, 0.34);
    tips.push([c.P(0, 0.9, 0), deg]);
    ctx.taken.push([x, z, R * 1.7]);
  });
  // 노래 줄: 북쪽 반원의 첨탑 꼭대기와 어미 소라탑 허리를 잇는 늘어진 빛 줄(충돌 없음). 줄마다 빛 방울
  const mid = V3(MOTHER.x, y0 + MOTHER.H * 0.66, MOTHER.z);
  for (const [tp, deg] of tips) {
    if (deg > 0 && deg < 170) continue;
    let prev = tp;
    for (let k = 1; k <= 12; k++) {
      const t = k / 12, p = V3(tp.x + (mid.x - tp.x) * t, tp.y + (mid.y - tp.y) * t - Math.sin(t * Math.PI) * 9, tp.z + (mid.z - tp.z) * t);
      tube(w, prev.x, prev.y, prev.z, p.x, p.y, p.z, 0.14, BLUE2, { mat: "glow", seg: 3 });
      if (k % 3 === 0 && k < 12) { tube(w, p.x, p.y, p.z, p.x, p.y - 2.2, p.z, 0.06, AQUA, { mat: "glow", seg: 3 }); bead(w, p.x, p.y - 2.6, p.z, 0.5, k % 2 ? ROSE : AQUA); }
      prev = p;
    }
  }
  // 고리 바깥 테의 등불 기둥(길 양쪽)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 360 + 7.5, [x, z] = CP(a, 80.5);
    if (!ctx.free(x, z, 1.5)) continue;
    lantern(w, K, x, height(x, z), z, 5.5, a + 180, i % 3 ? AQUA : ROSE, { blink: i % 4 === 0 });
  }
  // 고리 밖 얕은 물에 가라앉은 돔 도시: 큰 돔은 정해 둔 자리에, 작은 돔은 그 곁에 무리 지어
  const DOMES = [[196, 108, 21, 9], [164, 103, 15, 14], [222, 106, 13, 6], [-16, 106, 19, 10], [20, 104, 14, 16], [-134, 110, 16, 12], [-66, 112, 14, 8], [112, 106, 13, 15], [146, 122, 10, 22], [-158, 124, 11, 18], [40, 122, 10, 20], [246, 118, 11, 12]];
  const placed = [], byIdx = [];
  for (const [deg, d, R, tilt] of DOMES) {
    const [x, z] = CP(deg, d);
    byIdx.push(null);
    if (!ctx.free(x, z, R + 3)) continue;
    byIdx[byIdx.length - 1] = [x, z, R];
    sunkDome(w, K, x, WY - R * 0.3, z, R, { tilt, az: deg + 40, light: placed.length % 2 ? BLUE2 : AQUA, mast: R > 12 ? 0.5 : 0.35 });
    w.pool(x, WY + 0.12, z, R * 1.7, AQUA, 0.3);
    ctx.taken.push([x, z, R + 2]); placed.push([x, z, R]);
  }
  for (let i = 0, k = 0; placed.length && i < 500 && k < 16; i++) {
    const b = placed[(r() * placed.length) | 0], a = r() * 6.28, R = 4 + r() * 4.5, d = b[2] + R + 2 + r() * 10, x = b[0] + Math.cos(a) * d, z = b[1] + Math.sin(a) * d;
    if (height(x, z) > 1.2 || !ctx.free(x, z, R + 2)) continue;
    sunkDome(w, K, x, WY - R * (0.2 + r() * 0.3), z, R, { tilt: 6 + r() * 22, az: r() * 360, light: k % 2 ? AQUA : BLUE2, mast: k % 3 ? 0.4 : 0 });
    ctx.taken.push([x, z, R + 1.5]); k++;
  }
  // 이웃한 큰 돔을 잇는 굽은 관(물 위 아치): 아래로 날 수 있다
  for (const [i, j] of [[0, 1], [3, 4], [0, 2]]) {
    const A = byIdx[i], B = byIdx[j];
    if (!A || !B) continue;
    const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, pts = [], top = Math.max(A[2], B[2]) * 0.62 + 7;
    for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([A[0] + ux * (A[2] * 0.7 + (L - A[2] * 0.7 - B[2] * 0.7) * t), WY + A[2] * 0.42 + (B[2] - A[2]) * 0.42 * t + Math.sin(t * Math.PI) * (top - A[2] * 0.42), A[1] + uz * (A[2] * 0.7 + (L - A[2] * 0.7 - B[2] * 0.7) * t)]); }
    curveTube(w, pts, 1.5, 1.5, NACRE2, { col: true, color2: NACRE, glow: AQUA, seg: 8 });
    const m = pts[5];
    if (L - A[2] - B[2] > 7) w.gap("가라앉은 돔 사이 관 아래", m[0], WY + (m[1] - WY) * 0.5, m[2], Math.atan2(-dz, dx) / DEG, Math.max(7, L - A[2] - B[2]), m[1] - 3.5, 240);
  }
  // 석호 안: 반쯤 잠긴 작은 돔과 쓰러진 소라 탑(합창당이 가라앉던 날의 흔적)
  for (const [deg, d, R, tilt] of [[200, 33, 6.5, 24], [22, 34, 5.5, 30], [150, 30, 4.5, 18]]) {
    const [x, z] = CP(deg, d);
    if (!ctx.free(x, z, R + 2)) continue;
    sunkDome(w, K, x, WY - R * 0.42, z, R, { tilt, az: deg, light: ROSE, mast: 0 }); ctx.taken.push([x, z, R + 1]);
  }
  for (const [deg, d, H, R, tilt, az] of [[232, 96, 34, 4, 52, 150], [72, 104, 30, 3.6, 60, 20], [-96, 118, 26, 3.2, 44, 250]]) {
    const [x, z] = CP(deg, d);
    if (!ctx.free(x, z, 8)) continue;
    conch(w, K, x, WY - 2, z, H, R, { tilt, az, light: BLUE2, color: NACRE2 });
    ctx.taken.push([x, z, 9]);
  }
  // 남쪽 앞마당: 참배 둑길이 닿는 곳의 빛 무늬와 진주 받침 한 쌍
  const [fx, fz] = CP(90, 75);
  for (const [R, c] of [[6, AQUA], [10, ROSE]]) ring(w, fx, y0 + 0.3, fz, R, 0.15, c, { pitch: 90, col: false, mat: "glow", seg: 40 });
  w.pool(fx, y0 + 0.1, fz, 14, AQUA, 0.3);
  for (const s of [-1, 1]) {
    const px = fx + s * 13, pz = fz + 6;
    w.cyl(px, height(px, pz) - 0.4, pz, 1.6, 3.4, NACRE2, { mat: "paint", rt: 1.1 });
    w.sph(px, height(px, pz) + 4.4, pz, 1.5, 0xf4f8ff, { mat: "glow", col: false });
    ring(w, px, height(px, pz) + 4.4, pz, 2.3, 0.14, ROSE, { pitch: 90, col: false, mat: "glow", seg: 20 });
    w.pool(px, height(px, pz), pz, 9, 0xd8f0ff, 0.4);
  }
  void AMBER; void TEAL; void ROSE2; void DEEP; void ribDomeG; void capG;
}
