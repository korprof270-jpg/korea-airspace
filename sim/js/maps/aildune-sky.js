// 유리 사막의 하늘과 원경
//  · 북동 하늘: 비스듬히 누운 고리를 두른 호박·남보라 띠 가스 행성(어미별의 하늘 거인). 해 질 녘 빛을 받아 가장자리가 붉다
//  · 두 위성: 남동의 창백한 청록 위성, 북서의 작은 장밋빛 위성
//  · 하늘 높이 일렁이는 노래 띠(옅은 오로라)와, 지평선의 유리 모래 먼지 장막
//  · 원경: 경계 밖 사구 바다 위로 솟은 거대한 유리 첨탑 무리·탁자 바위·반쯤 묻힌 고대 함선의 뼈대
import * as THREE from "../../vendor/three.module.min.js";
import { M, shard, shardG, hexG, hexTaperG, hexBeam, CT, CV, CA, CP, TEAL, AMBER, PINK, VIO2, ICE, BONE, BONE2 } from "./aildune-kit.js";

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
const BAND = `float band(float l){ return l > 0.3 ? 1.0 : l > 0.06 ? 0.8 : l > -0.08 ? 0.52 : 0.26; }`;

// 가스 행성: 호박·장밋빛·남보라 띠, 청록 폭풍 눈 하나
function giantMat(sun) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, t: { value: 0 } }, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir; uniform float t;
      ${NOISE3} ${BAND}
      void main(){
        vec3 n = normalize(vN), q = normalize(vL);
        float y = q.y + 0.08 * fb3(q * 3.2 + vec3(t * 0.002, 0.0, 0.0)) + 0.03 * sin(q.x * 9.0 + q.z * 7.0 + t * 0.01);
        float bb = (y * 0.5 + 0.5) * 11.0 + fb3(q * 1.5) * 1.2, b = floor(bb), m = fract(b * 0.618);
        vec3 c = m < 0.2 ? vec3(0.86, 0.5, 0.26) : m < 0.4 ? vec3(0.72, 0.28, 0.42) : m < 0.6 ? vec3(0.3, 0.22, 0.6) : m < 0.8 ? vec3(0.95, 0.72, 0.46) : vec3(0.5, 0.36, 0.72);
        c *= 0.9 + 0.1 * smoothstep(0.0, 0.08, fract(bb));
        vec3 ec = normalize(vec3(-0.4, -0.25, 0.88));
        float e = length((q - ec) * vec3(1.0, 2.3, 1.0));
        if (e < 0.2) c = e < 0.09 ? vec3(0.4, 0.95, 0.9) : e < 0.15 ? vec3(0.7, 0.98, 0.92) : vec3(0.95, 0.75, 0.7);
        float l = dot(n, sunDir);
        vec3 col = c * band(l);
        vec3 v = normalize(cameraPosition - vW);
        float f = 1.0 - max(dot(n, v), 0.0);
        col += vec3(1.0, 0.55, 0.5) * pow(f, 2.0) * 0.5 * smoothstep(-0.3, 0.4, l);
        col = mix(col, vec3(0.62, 0.42, 0.7), 0.12) * 0.86;
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
        float r = length(vL.xy), t = (r - 1.35) / (2.25 - 1.35);
        float b = floor(t * 22.0), m = fract(sin(b * 12.9898) * 43758.5453);
        float a = (m * 0.6 + 0.25) * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.95, 1.0, t));
        if (t > 0.58 && t < 0.63) a = 0.04;
        vec3 c = mix(vec3(0.55, 0.95, 0.88), vec3(1.0, 0.82, 0.6), m);
        vec3 p = vW - ctr; float s = dot(p, sunDir);
        float sh = (s < 0.0 && length(p - sunDir * s) < R) ? 0.25 : 1.0;
        gl_FragColor = vec4(c * sh, a * 0.8);
        ${TAIL}
      }`,
  });
}
function moonMat(sun, c1, c2) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) } }, fog: false,
    vertexShader: VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; uniform vec3 sunDir, c1, c2;
      ${NOISE3} ${BAND}
      void main(){
        vec3 n = normalize(vN), q = normalize(vL);
        float s = fb3(q * 3.0 + 2.0), cr = n3(q * 13.0);
        vec3 c = mix(c1, c2, smoothstep(0.5, 0.53, s));
        if (cr > 0.78) c *= 0.82;
        gl_FragColor = vec4(c * band(dot(n, sunDir)) + c * 0.14, 1.0);
        ${TAIL}
      }`,
  });
}
// 노래 띠: 하늘 높이 굽이치는 옅은 빛 장막(가산). 아래 끝이 박자처럼 출렁인다
function songMat() {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vU; uniform float t;
      float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
      float n(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.0), f * f * (3.0 - 2.0 * f)); }
      void main(){
        float x = vU.x * 36.0, wav = n(x * 0.3 + t * 0.04) * 2.0;
        float curtain = n(x * 2.6 + wav * 3.0 + t * 0.1);
        float zone = smoothstep(0.45, 0.7, n(vU.x * 6.0 + 11.0 + t * 0.008));
        float v = vU.y, bot = 0.2 + 0.12 * n(x * 0.7 + 4.0) + 0.04 * sin(vU.x * 140.0 + t * 1.2);
        float k = smoothstep(bot, bot + 0.05, v) * (1.0 - smoothstep(0.35, 0.9, v)) * zone * (0.3 + 0.7 * curtain);
        vec3 c = mix(vec3(1.0, 0.7, 0.4), vec3(0.6, 0.45, 1.0), smoothstep(0.2, 0.7, v));
        gl_FragColor = vec4(c * k * 0.3, 1.0);
        ${TAIL}
      }`,
  });
}
// 먼지 장막: 지평선을 두른 원통. 아래가 짙고 위로 사라진다(유리 가루가 반짝인다)
function dustMat() {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vU; uniform float t;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vec2(vU.x * 60.0 + t * 0.15, vU.y * 4.0);
        float d = n(p) * 0.6 + n(p * 2.3 + 7.0) * 0.4;
        float a = (1.0 - smoothstep(0.05, 0.75, vU.y + d * 0.25)) * 0.55;
        vec3 c = mix(vec3(0.86, 0.52, 0.5), vec3(0.62, 0.42, 0.66), vU.y * 1.4);
        gl_FragColor = vec4(c, a);
        ${TAIL}
      }`,
  });
}

export const GIANT = { dir: [0.52, 0.42, -0.74], dist: 2500, R: 520 };

export function sky(w) {
  const sun = w.sunDir.clone(), add = [];
  const gp = new THREE.Vector3(...GIANT.dir).normalize().multiplyScalar(GIANT.dist);
  const gm = giantMat(sun);
  const giant = new THREE.Mesh(new THREE.SphereGeometry(GIANT.R, 96, 56), gm);
  giant.position.copy(gp); giant.rotation.set(-0.4, 0.3, -0.5);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(GIANT.R * 1.05, 64, 32), new THREE.MeshBasicMaterial({ color: 0xff9a7a, transparent: true, opacity: 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.copy(gp);
  const rng = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.25, 180, 1), ringMat(sun, gp, GIANT.R));
  rng.scale.setScalar(GIANT.R); rng.position.copy(gp); rng.rotation.set(-1.05, -0.5, -0.62);
  add.push(giant, halo, rng);
  w.updaters.push((dt, t) => { gm.uniforms.t.value = t; giant.rotation.y += dt * 0.001; });

  const M1 = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 20), moonMat(sun, 0xbff0e6, 0x6ab8b8));
  M1.position.copy(new THREE.Vector3(0.62, 0.42, 0.66).normalize().multiplyScalar(2500));
  const M2 = new THREE.Mesh(new THREE.SphereGeometry(52, 24, 16), moonMat(sun, 0xffb8d0, 0xc06a8a));
  M2.position.copy(new THREE.Vector3(-0.55, 0.52, -0.66).normalize().multiplyScalar(2450));
  add.push(M1, M2);
  // 위성이 하늘을 아주 천천히 건너간다
  const p1 = M1.position.clone(), p2 = M2.position.clone();
  w.updaters.push((dt, t) => { M1.position.copy(p1).applyAxisAngle(new THREE.Vector3(0, 1, 0), t * 0.0015); M2.position.copy(p2).applyAxisAngle(new THREE.Vector3(0, 1, 0), -t * 0.0025); });

  const sm = songMat();
  const song = new THREE.Mesh(new THREE.CylinderGeometry(2200, 2200, 900, 96, 1, true), sm);
  song.position.y = 560;
  const dm = dustMat();
  const dust = new THREE.Mesh(new THREE.CylinderGeometry(900, 900, 160, 96, 1, true), dm);
  dust.position.y = 60;
  add.push(song, dust);
  w.updaters.push((dt, t) => { sm.uniforms.t.value = t; dm.uniforms.t.value = t; });
  for (const m of add) { m.frustumCulled = false; m.renderOrder = -4; w.scene.add(m); }
  song.renderOrder = -3;
  dust.renderOrder = 2;
}

// ── 원경: 경계 밖의 첨탑 무리·탁자 바위·고대 함선 뼈대 ──
export function farland(w) {
  const r = w.rand, S = w.size, h = (x, z) => w.h ? w.h(x, z) : 0;
  const PAL = [[CT, TEAL], [CV, VIO2], [CA, AMBER], [CP, PINK]];
  // 첨탑 무리: 맵 둘레 바깥 고리 위에, 큰 것은 멀리
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.15, R = S + 70 + r() * 180, cx = Math.cos(a) * R, cz = Math.sin(a) * R, [cols, glow] = PAL[i % 4], gy = h(cx, cz);
    const n = 3 + ((r() * 4) | 0), big = 30 + r() * 70 * (R - S) / 250;
    for (let k = 0; k < n; k++) {
      const b = r() * 6.28, d = k ? 4 + r() * 14 : 0, H = big * (k ? 0.35 + r() * 0.5 : 1), rad = 2 + H * 0.06;
      shard(w, cx + Math.cos(b) * d, gy - 3, cz + Math.sin(b) * d, rad, H, k ? 6 + r() * 18 : r() * 5, r() * 360, cols[k % 3], { col: false });
    }
    if (big > 60) shard(w, cx, gy + big * 0.1, cz, 0.7, big * 0.8, 0, 0, glow, { mat: "glow", col: false });
  }
  // 탁자 바위: 켜켜이 쌓인 사암 층(층마다 조금씩 좁아지고 비틀린다)에 유리 갓
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.3 + r() * 0.25, R = S + 190 + r() * 150, x = Math.cos(a) * R, z = Math.sin(a) * R, gy = h(x, z) - 6, H = 34 + r() * 46, rad = 14 + r() * 16;
    let y = gy, rr = rad, k = 0;
    while (y < gy + H) { const hh = 5 + r() * 9, nk = 0.82 + r() * 0.14; w.mesh(hexTaperG(nk), M(x + (r() - 0.5) * 2, y, z + (r() - 0.5) * 2, rr, hh, rr * (0.85 + r() * 0.2), 0, r() * 60, 0), [0xb07a5a, 0x9a6458, 0xc89068, 0x8a5a60][(k++) % 4], "paint"); y += hh; rr *= nk * 1.02; }
    w.mesh(hexTaperG(0.6), M(x, y, z, rr * 0.9, 3 + r() * 3, rr * 0.8, 0, r() * 60, 0), [0x7fd8c8, 0x9a8af0, 0xe0a0c8][i % 3], "paint");
    for (let q = 0; q < 3; q++) shard(w, x + (r() - 0.5) * rr, y + 1, z + (r() - 0.5) * rr, 1.5 + r() * 2, 8 + r() * 14, r() * 15, r() * 360, [CT[2], CP[2], CV[2]][q], { col: false });
  }
  // 고대 함선 뼈대: 남서 원경에 비스듬히 묻힌 거대한 갈비
  {
    const x0 = -380, z0 = 300, yaw = 0.7, L = 220;
    for (let k = 0; k < 11; k++) {
      const u = k / 10 - 0.5, cx = x0 + Math.cos(yaw) * u * L, cz = z0 - Math.sin(yaw) * u * L, H = 70 * Math.sin((k / 10) * Math.PI * 0.9 + 0.15) + 14, gy = h(cx, cz) - 6;
      const sx = Math.sin(yaw) * 28, sz = Math.cos(yaw) * 28;
      for (const s of [-1, 1]) {
        const a = [cx + sx * s, gy, cz + sz * s], m = [cx + sx * s * 0.8, gy + H * 0.75, cz + sz * s * 0.8], b = [cx + sx * s * 0.15, gy + H, cz + sz * s * 0.15];
        hexBeam(w, a, m, 2.4, k % 2 ? BONE : BONE2); hexBeam(w, m, b, 1.9, BONE2);
      }
    }
    hexBeam(w, [x0 - Math.cos(yaw) * L * 0.55, h(x0, z0) + 4, z0 + Math.sin(yaw) * L * 0.55], [x0 + Math.cos(yaw) * L * 0.55, h(x0, z0) + 50, z0 - Math.sin(yaw) * L * 0.55], 3.2, BONE2);
  }
  void shardG; void hexG; void ICE;
}
