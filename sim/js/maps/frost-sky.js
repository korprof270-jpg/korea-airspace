// 설원 통신기지의 하늘: 북쪽 하늘의 오로라 커튼, 서북풍에 날리는 눈발, 하늘을 훑는 탐조등, 능선 너머 포격 섬광
import * as THREE from "../../vendor/three.module.min.js";
import { DEG, hash } from "./frost-kit.js";

// 오로라: 휘어진 띠 세 장(가산 혼합). 세로 빛줄기가 천천히 흐른다
export function aurora(w) {
  const u = { time: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `uniform float time; attribute float seed; varying vec2 vUv; varying float vS;
      void main(){ vUv = uv; vS = seed; vec3 p = position;
        p.x += sin(time * 0.11 + uv.x * 7.0 + seed * 3.0) * 26.0 * uv.y; p.z += cos(time * 0.09 + uv.x * 5.0 + seed) * 18.0 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float time; varying vec2 vUv; varying float vS;
      void main(){
        float x = vUv.x * (70.0 + vS * 30.0);
        float rays = 0.5 + 0.5 * sin(x + sin(vUv.x * 11.0 + time * 0.25 + vS * 5.0) * 5.0 + time * 0.35);
        rays = 0.35 + 0.65 * rays * (0.6 + 0.4 * sin(x * 0.37 - time * 0.2));
        float band = smoothstep(0.0, 0.06, vUv.y) * pow(1.0 - vUv.y, 1.7);
        float fade = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        vec3 c = mix(vec3(0.18, 1.0, 0.62), vec3(0.42, 0.34, 1.0), smoothstep(0.1, 0.8, vUv.y));
        c = mix(c, vec3(0.6, 1.0, 0.9), smoothstep(0.12, 0.0, vUv.y) * 0.6);
        float a = rays * band * fade * (0.5 + 0.12 * sin(time * 0.5 + vS * 9.0));
        gl_FragColor = vec4(c * a, a);
      }`,
  });
  const pos = [], uv = [], seed = [], idx = [];
  // [중심 각도(도, 0 = 북), 거리, 폭(도), 아래 높이, 세로 길이]
  [[-18, 900, 70, 230, 330], [22, 1150, 80, 300, 420], [-62, 1250, 60, 260, 360], [64, 1000, 50, 220, 280]].forEach(([deg, dist, span, y0, hh], k) => {
    const N = 64, base = pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = (deg + (t - 0.5) * span) * DEG, d = dist + Math.sin(t * 9 + k * 2) * 90 + Math.sin(t * 23 + k) * 30, x = Math.sin(a) * d, z = -Math.cos(a) * d;
      pos.push(x, y0 + Math.sin(t * 6 + k) * 30, z, x, y0 + hh, z); uv.push(t, 0, t, 1); seed.push(k * 0.37, k * 0.37);
    }
    for (let i = 0; i < N; i++) { const b = base + i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("seed", new THREE.Float32BufferAttribute(seed, 1)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -5; m.userData.toonDone = true;
  w.scene.add(m); w.disposables.push(g, mat);
  w.updaters.push((dt, t) => { u.time.value = t; });
}

// 날리는 눈: 카메라를 따라다니는 상자 안에서 되풀이되는 점 구름. 서북풍에 비스듬히 쓸린다
export function blizzard(w, count = 1500, box = 84) {
  const pos = new Float32Array(count * 3), r = w.rand;
  for (let i = 0; i < count * 3; i++) pos[i] = r() * box;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const u = { time: { value: 0 }, box: { value: box } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float time, box; varying float vA;
      void main(){
        vec3 p = position; float k = fract(position.x * 7.13);
        p.y -= time * (1.1 + k * 1.3);
        p.x += time * (5.5 + k * 3.0) + sin(time * 0.7 + position.z * 0.37) * 1.4;
        p.z += time * (2.4 + k) + cos(time * 0.5 + position.x * 0.41) * 1.2;
        p = mod(p - cameraPosition, box) - box * 0.5 + cameraPosition;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = clamp(140.0 / max(d, 1.0), 1.0, 6.0);
        vA = smoothstep(box * 0.5, box * 0.3, d) * smoothstep(1.5, 5.0, d);
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.2, length(c)) * vA * 0.8; if (a < 0.02) discard; gl_FragColor = vec4(0.94, 0.97, 1.0, a); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8; pts.userData.toonDone = true;
  w.scene.add(pts); w.disposables.push(g, m);
  w.updaters.push((dt, t) => { u.time.value = t; });
}

// 하늘을 훑는 탐조등: [x, y, z, 위상, 속도, 기울기(도)]
export function searchlights(w, list) {
  const L = 240, cone = new THREE.CylinderGeometry(7, 0.5, L, 14, 1, true); cone.translate(0, L / 2, 0);
  const cm = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const hm = new THREE.MeshBasicMaterial({ color: 0xe8f4ff }), hg = new THREE.CylinderGeometry(1.2, 0.9, 1.4, 10);
  const items = list.map(([x, y, z, ph, sp, tilt]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z);
    const arm = new THREE.Group(); arm.rotation.x = tilt * DEG; pivot.add(arm);
    const m = new THREE.Mesh(cone, cm); m.renderOrder = 6; m.frustumCulled = false; arm.add(m, new THREE.Mesh(hg, hm));
    pivot.userData.toonDone = true; w.scene.add(pivot);
    return { pivot, arm, ph, sp, tilt: tilt * DEG };
  });
  w.disposables.push(cone, cm, hm, hg);
  w.updaters.push((dt, t) => { for (const it of items) { it.pivot.rotation.y = it.ph + Math.sin(t * it.sp + it.ph) * 1.3; it.arm.rotation.x = it.tilt + Math.sin(t * it.sp * 0.7 + it.ph * 2) * 0.22; } });
}

// 능선 너머 포격 섬광: 먼 산 뒤에서 이따금 번쩍이는 빛 (가산 혼합 판 몇 장)
export function farFlashes(w) {
  const g = new THREE.PlaneGeometry(1, 1), list = [];
  for (const [deg, d, y] of [[70, 760, 60], [96, 820, 70], [120, 700, 50], [200, 780, 60], [305, 800, 70]]) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, map: null });
    const q = new THREE.Mesh(g, m), a = deg * DEG; q.position.set(Math.sin(a) * d, y, -Math.cos(a) * d); q.lookAt(0, y, 0); q.scale.set(260, 150, 1);
    q.frustumCulled = false; q.renderOrder = -4; q.userData.toonDone = true; w.scene.add(q); w.disposables.push(m);
    list.push({ m, ph: hash(deg, d) * 20, per: 5 + hash(d, deg) * 7 });
  }
  // 가장자리가 부드러운 빛: 정점 색 대신 방사형 텍스처
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const c = cv.getContext("2d"), gr = c.createRadialGradient(32, 40, 0, 32, 40, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  for (const it of list) it.m.map = tex;
  w.disposables.push(g, tex);
  w.updaters.push((dt, t) => { for (const it of list) { const u = ((t + it.ph) % it.per) / it.per; it.m.opacity = u < 0.02 ? 0.9 : u < 0.12 ? 0.5 * (1 - (u - 0.02) / 0.1) : (u > 0.3 && u < 0.32 ? 0.6 : 0); } });
}
