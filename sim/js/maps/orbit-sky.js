// 궤도 요새의 하늘: 발아래를 가득 채운 지구(구름·대기 테), 보랏빛 고리 행성 에일, 햇빛 번짐, 사방의 별
// 행성 표면은 셰이더에서 3D 잡음으로 그린다 → 가까이서도 경계가 또렷한 셀 화풍
import * as THREE from "../../vendor/three.module.min.js";

const NOISE3 = `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fb3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * n3(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
`;
const VERT = `varying vec3 vN; varying vec3 vW; varying vec3 vL;
  void main(){ vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const TAIL = `#include <tonemapping_fragment>
  #include <colorspace_fragment>`;

// 툰 밴드: 해를 받는 정도를 네 단으로
const BAND = `float band(float l){ return l > 0.32 ? 1.0 : l > 0.08 ? 0.78 : l > -0.06 ? 0.42 : 0.07; }`;

function earthMat(sun, R) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, spin: { value: 0 }, R: { value: R } }, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir; uniform float spin, R;
      ${NOISE3} ${BAND}
      void main(){
        vec3 n = normalize(vN), q = normalize(vL);
        float lat = abs(q.y);
        // 대륙: 잡음 등고선. 얕은 바다 → 깊은 바다 3단
        float land = fb3(q * 4.3 + 4.0) + 0.07 * n3(q * 30.0) - lat * lat * 0.05;
        vec3 c = land > 0.575 ? (fb3(q * 9.0 + 9.0) > 0.5 || lat > 0.62 ? vec3(0.2, 0.47, 0.22) : vec3(0.7, 0.58, 0.36))
               : land > 0.55 ? vec3(0.18, 0.52, 0.82) : land > 0.45 ? vec3(0.07, 0.31, 0.7) : vec3(0.04, 0.2, 0.55);
        if (land > 0.6 && fb3(q * 16.0 + 2.0) > 0.6) c = vec3(0.36, 0.34, 0.28);
        if (lat > 0.88 + (land - 0.5) * 0.4) c = vec3(0.85, 0.9, 0.95);
        // 구름: 천천히 도는 띠 + 소용돌이
        float a = spin; mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
        vec3 cq = q; cq.xz = rot * cq.xz;
        float cl = fb3(cq * vec3(7.0, 12.0, 7.0) + vec3(11.0, 3.0, 5.0)) + 0.08 * sin(cq.y * 26.0 + fb3(cq * 5.0) * 6.0);
        float ck = smoothstep(0.6, 0.612, cl), ck2 = smoothstep(0.56, 0.572, cl) * 0.4;
        c = mix(c, vec3(0.86, 0.89, 0.93), max(ck, ck2));
        float l = dot(n, sunDir), k = band(l);
        vec3 col = c * k;
        // 밤 쪽 도시 불빛
        if (l < -0.08 && land > 0.56 && n3(q * 90.0) > 0.78 && ck < 0.5) col += vec3(1.0, 0.75, 0.38) * 0.55;
        // 가장자리 대기: 시선과 비스듬할수록 파랗게
        vec3 v = normalize(cameraPosition - vW);
        float f = 1.0 - max(dot(n, v), 0.0), lit = smoothstep(-0.25, 0.35, l);
        col = mix(col, vec3(0.3, 0.55, 0.95) * (0.2 + 0.7 * lit), smoothstep(0.7, 0.97, f) * 0.7);
        col += vec3(0.2, 0.42, 0.9) * pow(f, 4.0) * 0.35 * lit;
        gl_FragColor = vec4(col, 1.0);
        ${TAIL}
      }`,
  });
}

// 대기 테: 행성보다 조금 큰 껍질의 안쪽 면만, 가장자리에서 가장 밝다
function haloMat(sun, color, R, Rs, power = 1) {
  const edge = Math.sqrt(1 - (R / Rs) * (R / Rs));
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, col: { value: new THREE.Color(color) }, edge: { value: edge }, pw: { value: power } },
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir, col; uniform float edge, pw;
      void main(){
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float d = -dot(n, v), t = clamp(d / edge, 0.0, 1.0);
        // 두 단으로 끊은 테
        float k = smoothstep(0.0, 0.5, t) * 0.55 + smoothstep(0.55, 0.85, t) * 0.45;
        float lit = smoothstep(-0.35, 0.3, dot(n, sunDir));
        gl_FragColor = vec4(col * k * (0.15 + lit) * pw, 1.0);
        ${TAIL}
      }`,
  });
}

function ailMat(sun) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, ringN: { value: new THREE.Vector3(0, 1, 0) } }, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir;
      ${NOISE3} ${BAND}
      void main(){
        vec3 n = normalize(vN), q = normalize(vL);
        // 가스 행성 띠 + 굽이치는 소용돌이
        float y = q.y + 0.08 * fb3(q * 4.0) + 0.03 * sin(q.x * 9.0 + q.z * 7.0);
        float b = floor((y * 0.5 + 0.5) * 9.0 + fb3(q * 2.0) * 1.2);
        float m = fract(b * 0.618);
        vec3 c = m < 0.25 ? vec3(0.36, 0.17, 0.62) : m < 0.5 ? vec3(0.62, 0.36, 0.86) : m < 0.75 ? vec3(0.83, 0.58, 0.95) : vec3(0.48, 0.24, 0.72);
        // 큰 폭풍 눈
        float e = length((q - normalize(vec3(0.6, -0.25, 0.75))) * vec3(1.0, 2.2, 1.0));
        if (e < 0.16) c = e < 0.09 ? vec3(1.0, 0.55, 0.85) : vec3(0.95, 0.75, 0.98);
        float l = dot(n, sunDir);
        vec3 col = c * band(l);
        vec3 v = normalize(cameraPosition - vW);
        float f = 1.0 - max(dot(n, v), 0.0);
        col += vec3(0.8, 0.45, 1.0) * pow(f, 2.5) * 0.5 * smoothstep(-0.2, 0.4, l);
        gl_FragColor = vec4(col, 1.0);
        ${TAIL}
      }`,
  });
}

function ringMat(sun, center, R) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, ctr: { value: center }, R: { value: R } }, fog: false,
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir, ctr; uniform float R;
      void main(){
        float r = length(vL.xy);
        float t = (r - 1.35) / (2.45 - 1.35);
        float b = floor(t * 14.0), m = fract(sin(b * 12.9898) * 43758.5453);
        float a = (m * 0.6 + 0.3) * smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t));
        if (t > 0.58 && t < 0.63) a = 0.04;   // 틈
        vec3 c = mix(vec3(0.55, 0.38, 0.8), vec3(0.95, 0.82, 1.0), m);
        // 행성 그림자: 해 반대쪽으로 행성 뒤에 있으면 어둡게
        vec3 p = vW - ctr; float s = dot(p, sunDir);
        float sh = (s < 0.0 && length(p - sunDir * s) < R) ? 0.18 : 1.0;
        gl_FragColor = vec4(c * sh, a);
        ${TAIL}
      }`,
  });
}

// 햇빛 번짐: 가산 스프라이트 두 장(둥근 빛 + 가로 줄무늬)
function glareTex(kind) {
  const S = 256, cv = document.createElement("canvas"); cv.width = S; cv.height = kind === "streak" ? 32 : S;
  const g = cv.getContext("2d");
  if (kind === "streak") {
    const gr = g.createLinearGradient(0, 0, S, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,250,235,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, 32);
    const v = g.createLinearGradient(0, 0, 0, 32); v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.5, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = v; g.fillRect(0, 0, S, 32);
  } else {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "rgba(255,255,250,1)"); gr.addColorStop(0.08, "rgba(255,248,225,0.95)"); gr.addColorStop(0.1, "rgba(255,240,210,0.5)");
    gr.addColorStop(0.3, "rgba(255,220,170,0.16)"); gr.addColorStop(0.34, "rgba(255,220,170,0.08)"); gr.addColorStop(1, "rgba(255,200,150,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const EARTH = { dir: [0.1, -0.74, 0.66], dist: 2900, R: 2300 };
export const AIL = { dir: [-0.72, 0.3, -0.62], dist: 3100, R: 300 };

export function sky(w) {
  const sun = w.sunDir.clone(), add = [];
  // ── 지구 ──
  const ep = new THREE.Vector3(...EARTH.dir).normalize().multiplyScalar(EARTH.dist);
  const em = earthMat(sun, EARTH.R);
  const body = new THREE.Mesh(new THREE.SphereGeometry(EARTH.R, 96, 64), em);
  body.position.copy(ep); body.rotation.z = 0.3;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(EARTH.R * 1.035, 96, 48), haloMat(sun, 0x4f9dff, EARTH.R, EARTH.R * 1.035, 1.3));
  halo.position.copy(ep);
  add.push(body, halo);
  w.updaters.push((dt) => { em.uniforms.spin.value += dt * 0.004; body.rotation.y += dt * 0.0015; });

  // ── 에일: 보라 고리 행성 ──
  const ap = new THREE.Vector3(...AIL.dir).normalize().multiplyScalar(AIL.dist);
  const ail = new THREE.Mesh(new THREE.SphereGeometry(AIL.R, 64, 40), ailMat(sun));
  ail.position.copy(ap); ail.rotation.set(0.25, 0.4, 0.35);
  const ahalo = new THREE.Mesh(new THREE.SphereGeometry(AIL.R * 1.06, 48, 24), haloMat(sun, 0xc070ff, AIL.R, AIL.R * 1.06, 0.6));
  ahalo.position.copy(ap);
  const rg = new THREE.RingGeometry(1.35, 2.45, 128, 1);
  const rng = new THREE.Mesh(rg, ringMat(sun, ap, AIL.R));
  rng.scale.setScalar(AIL.R); rng.position.copy(ap); rng.rotation.set(-1.18, 0.32, 0.5);
  add.push(ail, ahalo, rng);
  // 에일의 작은 위성
  const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: 0x8a7aa8, fog: false }));
  moon.position.copy(ap).add(new THREE.Vector3(520, -160, 300));
  add.push(moon);

  // ── 햇빛 번짐 ──
  const sp = sun.clone().multiplyScalar(3300);
  const gt = glareTex("glow"), st = glareTex("streak");
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xa89c88, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  glow.scale.setScalar(300); glow.position.copy(sp);
  const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: 0xffe2b0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.32 }));
  streak.scale.set(1700, 36, 1); streak.position.copy(sp);
  add.push(glow, streak);
  w.disposables.push(gt, st);

  // ── 별: 하늘 굽기는 위쪽 반구만 별을 그리므로 아래·옆을 채운다 ──
  const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r = w.rand, c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 3600;
    pos[i * 3] = Math.cos(a) * s * R; pos[i * 3 + 1] = u * R; pos[i * 3 + 2] = Math.sin(a) * s * R;
    c.setHSL(r() < 0.2 ? 0.08 : r() < 0.4 ? 0.75 : 0.6, 0.5, 0.55 + r() * 0.4).multiplyScalar(u < 0.05 ? 1 : 0.55);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  stars.renderOrder = -5;
  add.push(stars);

  // ── 은하수 띠: 기울어진 큰 원을 따라 흐린 별 구름 ──
  const M2 = 5200, mp = new Float32Array(M2 * 3), mc = new Float32Array(M2 * 3), ax = new THREE.Vector3(0.3, 0.85, 0.42).normalize(), e1 = new THREE.Vector3(1, 0, 0).cross(ax).normalize(), e2 = ax.clone().cross(e1), v = new THREE.Vector3();
  for (let i = 0; i < M2; i++) {
    const a = r() * Math.PI * 2, off = (r() + r() + r() - 1.5) * 0.16;
    v.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(ax, off).normalize().multiplyScalar(3550);
    mp.set([v.x, v.y, v.z], i * 3);
    c.setHSL(0.62 + r() * 0.2, 0.45, 0.3 + r() * 0.25);
    mc.set([c.r, c.g, c.b], i * 3);
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.BufferAttribute(mp, 3)); mg.setAttribute("color", new THREE.BufferAttribute(mc, 3));
  const milky = new THREE.Points(mg, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true, opacity: 0.8 }));
  milky.renderOrder = -6;
  add.push(milky);

  for (const m of add) { m.frustumCulled = false; w.scene.add(m); }
  return { earth: body, ail };
}
