// 에일 행성의 하늘: 북쪽 하늘을 가득 채운 청록 띠 가스 행성과 고리, 두 위성(연보라·호박), 일렁이는 오로라 장막
// 행성 표면은 셰이더에서 3D 잡음으로 그린다(셀 화풍으로 밴드를 끊는다). 하늘 바탕·별·구름은 env.sky 가 굽는다
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
const BAND = `float band(float l){ return l > 0.3 ? 1.0 : l > 0.06 ? 0.8 : l > -0.08 ? 0.5 : 0.22; }`;

// 가스 행성: 굽이치는 청록·남·보라 띠, 분홍 폭풍 눈 둘. 밤 쪽도 하늘빛에 은은히 보인다
function giantMat(sun) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, t: { value: 0 } }, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir; uniform float t;
      ${NOISE3} ${BAND}
      void main(){
        vec3 n = normalize(vN), q = normalize(vL);
        float y = q.y + 0.07 * fb3(q * 3.6 + vec3(t * 0.002, 0.0, 0.0)) + 0.025 * sin(q.x * 11.0 + q.z * 8.0 + t * 0.01);
        float b = floor((y * 0.5 + 0.5) * 13.0 + fb3(q * 1.6) * 1.4), m = fract(b * 0.618);
        vec3 c = m < 0.2 ? vec3(0.16, 0.62, 0.66) : m < 0.4 ? vec3(0.42, 0.86, 0.82) : m < 0.6 ? vec3(0.22, 0.38, 0.72) : m < 0.8 ? vec3(0.55, 0.42, 0.86) : vec3(0.78, 0.94, 0.9);
        // 띠 경계의 가는 소용돌이 선
        float edge = fract((y * 0.5 + 0.5) * 13.0 + fb3(q * 1.6) * 1.4);
        c *= 0.9 + 0.1 * smoothstep(0.0, 0.08, edge);
        for (int k = 0; k < 2; k++){
          vec3 ec = k == 0 ? normalize(vec3(0.5, -0.22, 0.83)) : normalize(vec3(-0.3, 0.35, 0.89));
          float e = length((q - ec) * vec3(1.0, 2.4, 1.0)) * (k == 0 ? 1.0 : 1.6);
          if (e < 0.17) c = e < 0.08 ? vec3(1.0, 0.5, 0.82) : e < 0.13 ? vec3(0.96, 0.72, 0.95) : vec3(0.7, 0.5, 0.92);
        }
        float l = dot(n, sunDir);
        vec3 col = c * band(l);
        vec3 v = normalize(cameraPosition - vW);
        float f = 1.0 - max(dot(n, v), 0.0);
        col += vec3(0.5, 1.0, 0.95) * pow(f, 2.2) * 0.45 * smoothstep(-0.3, 0.4, l);
        col = mix(col, vec3(0.45, 0.5, 0.85), 0.18);   // 대기 너머로 본다: 하늘빛이 살짝 섞인다
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
        float r = length(vL.xy), t = (r - 1.3) / (2.5 - 1.3);
        float b = floor(t * 18.0), m = fract(sin(b * 12.9898) * 43758.5453);
        float a = (m * 0.55 + 0.3) * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.96, 1.0, t));
        if (t > 0.44 && t < 0.5) a = 0.05;
        vec3 c = mix(vec3(0.62, 0.86, 0.9), vec3(0.95, 0.8, 1.0), m);
        vec3 p = vW - ctr; float s = dot(p, sunDir);
        float sh = (s < 0.0 && length(p - sunDir * s) < R) ? 0.25 : 1.0;
        gl_FragColor = vec4(c * sh, a * 0.85);
        ${TAIL}
      }`,
  });
}

// 위성: 셀 음영 + 잡음 얼룩(크레이터 바다)
function moonMat(sun, c1, c2) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) } }, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir, c1, c2;
      ${NOISE3} ${BAND}
      void main(){
        vec3 n = normalize(vN), q = normalize(vL);
        float s = fb3(q * 3.2 + 5.0), cr = n3(q * 14.0);
        vec3 c = mix(c1, c2, smoothstep(0.5, 0.53, s));
        if (cr > 0.78) c *= 0.82;
        float l = dot(n, sunDir);
        gl_FragColor = vec4(c * band(l) + c * 0.12, 1.0);
        ${TAIL}
      }`,
  });
}

// 오로라 장막: 하늘을 둘러싼 원통 안쪽 면에 일렁이는 세로 줄 (가산)
function auroraMat() {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vU; uniform float t;
      float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
      float n(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.0), f * f * (3.0 - 2.0 * f)); }
      void main(){
        float x = vU.x * 40.0, wav = n(x * 0.35 + t * 0.05) * 2.0 + sin(vU.x * 60.0 + t * 0.2) * 0.3;
        float curtain = n(x * 3.0 + wav * 4.0 + t * 0.12);
        float zone = smoothstep(0.35, 0.6, n(vU.x * 7.0 + 3.0 + t * 0.01));
        float v = vU.y, bot = 0.15 + 0.15 * n(x * 0.8 + 9.0);
        float k = smoothstep(bot, bot + 0.06, v) * (1.0 - smoothstep(0.4, 1.0, v)) * zone * (0.35 + 0.65 * curtain);
        vec3 c = mix(vec3(0.25, 1.0, 0.78), vec3(1.0, 0.4, 0.85), smoothstep(0.25, 0.75, v));
        gl_FragColor = vec4(c * k * 0.4, 1.0);
        ${TAIL}
      }`,
  });
}

export const GIANT = { dir: [-0.34, 0.4, -0.85], dist: 2300, R: 600 };

export function sky(w) {
  const sun = w.sunDir.clone(), add = [];
  // ── 가스 행성과 고리 ──
  const gp = new THREE.Vector3(...GIANT.dir).normalize().multiplyScalar(GIANT.dist);
  const gm = giantMat(sun);
  const giant = new THREE.Mesh(new THREE.SphereGeometry(GIANT.R, 96, 56), gm);
  giant.position.copy(gp); giant.rotation.set(0.32, 0.6, 0.28);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(GIANT.R * 1.05, 64, 32), new THREE.MeshBasicMaterial({ color: 0x5ae8e0, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.copy(gp);
  const rng = new THREE.Mesh(new THREE.RingGeometry(1.3, 2.5, 160, 1), ringMat(sun, gp, GIANT.R));
  rng.scale.setScalar(GIANT.R); rng.position.copy(gp); rng.rotation.set(-1.25, 0.28, 0.42);
  add.push(giant, halo, rng);
  w.updaters.push((dt, t) => { gm.uniforms.t.value = t; giant.rotation.y += dt * 0.0012; });

  // ── 두 위성 ──
  const M1 = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 20), moonMat(sun, 0xd8c8f4, 0x9a86c8));
  M1.position.copy(new THREE.Vector3(0.66, 0.5, -0.36).normalize().multiplyScalar(2500));
  const M2 = new THREE.Mesh(new THREE.SphereGeometry(48, 24, 16), moonMat(sun, 0xffc890, 0xd08a5a));
  M2.position.copy(new THREE.Vector3(-0.7, 0.3, 0.42).normalize().multiplyScalar(2450));
  add.push(M1, M2);

  // ── 오로라 ──
  const am = auroraMat();
  const aur = new THREE.Mesh(new THREE.CylinderGeometry(2300, 2300, 900, 96, 1, true), am);
  aur.position.y = 520;
  add.push(aur);
  w.updaters.push((dt, t) => { am.uniforms.t.value = t; });

  for (const m of add) { m.frustumCulled = false; m.renderOrder = -4; w.scene.add(m); }
  aur.renderOrder = -3;
  return { giant };
}
