// 유리 사막의 움직임
//  · 모래 가오리 떼: 사구 위를 낮게, 하늘 높이 크게 건너가는 이주 무리(날개를 퍼덕인다)
//  · 에일 기수 가오리: 공명 숲 위를 도는 큰 날짐승 넷
//  · 순례자 야영지의 뼈 풍차, 노래 기둥·야영지의 풍경(흔들린다)
//  · 빈 합창 둥지의 심: 핏빛으로 맥박 치며 둘레에 가시 고리가 돈다
//  · 공중에 떠도는 유리 가루(반짝이는 점)
import * as THREE from "../../vendor/three.module.min.js";
import { factionModel } from "../factions.js";
import { merged, rotorG, chimeG } from "./aildune-kit.js";
import { height, FOREST } from "./aildune-terrain.js";

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

// 가오리 몸·왼날개·오른날개(날개 뿌리가 원점, 머리 -z)
function rayParts() {
  const body = new THREE.SphereGeometry(1, 10, 6); body.scale(1.1, 0.34, 1.9);
  const tail = new THREE.CylinderGeometry(0.03, 0.14, 4, 4); tail.rotateX(Math.PI / 2); tail.translate(0, 0, 3.6);
  const eyes = [-1, 1].map((s) => { const e = new THREE.SphereGeometry(0.16, 5, 4); e.translate(0.42 * s, 0.22, -1.3); return [e, null, 0x9ffff0]; });
  const B = merged([[body, null, 0xe8b06a], [tail, null, 0xc8854a], ...eyes]);
  const wing = (s) => {
    const g = new THREE.BufferGeometry(), P = [];
    // 날개: 뿌리(앞 -1.3 ~ 뒤 1.2) → 끝(4.2, 뒤로 0.6). 위·아래 두 면
    const root0 = [0, 0, -1.3], root1 = [0, 0, 1.2], tip = [4.2 * s, 0.2, 0.6], mid = [2.2 * s, 0.1, -0.9];
    const tri = (a, b, c) => P.push(...a, ...b, ...c);
    if (s > 0) { tri(root0, root1, mid); tri(mid, root1, tip); tri(root0, mid, root1); tri(mid, tip, root1); }
    else { tri(root0, mid, root1); tri(mid, tip, root1); tri(root0, root1, mid); tri(mid, root1, tip); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(P.length / 3 * 2), 2));
    g.computeVertexNormals();
    const tipFin = new THREE.ConeGeometry(0.12, 0.6, 4); tipFin.rotateZ(-s * Math.PI / 2); tipFin.translate(4.4 * s, 0.2, 0.6);
    return merged([[g, null, 0xd99a5a], [tipFin, null, 0x5fd8c8]]);
  };
  return [B, wing(1), wing(-1)];
}

export function life(w, K, ctx) {
  const r = w.rand, mat = w.material("paint");

  // ── 모래 가오리 떼 ──
  // 무리: [중심 x, z, 반경 x, 반경 z, 높이(땅 위), 수, 속도, 크기]
  const flocks = [[-40, 40, 190, 120, 22, 8, 0.05, 1.5], [60, -40, 260, 210, 95, 10, -0.032, 3.2], [-160, -120, 70, 60, 60, 5, 0.07, 2.2], [150, 120, 80, 50, 34, 5, -0.06, 1.8]];
  const list = [];
  for (const [cx, cz, rx, rz, up, n, sp, sc] of flocks) for (let k = 0; k < n; k++) list.push({ cx, cz, rx, rz, up: up + (r() - 0.5) * 10, sp, sc: sc * (0.8 + r() * 0.45), ph: k * 0.09 + r() * 0.04, off: (r() - 0.5) * 14, fl: r() * 6.28 });
  const [gB, gL, gR] = rayParts(), N = list.length;
  const imB = new THREE.InstancedMesh(gB, mat, N), imL = new THREE.InstancedMesh(gL, mat, N), imR = new THREE.InstancedMesh(gR, mat, N);
  for (const im of [imB, imL, imR]) { im.frustumCulled = false; w.scene.add(im); }
  w.disposables.push(gB, gL, gR);
  const wq = new THREE.Quaternion(), wm = new THREE.Matrix4(), wl = new THREE.Matrix4(), ax = new THREE.Vector3(0, 0, 1);
  const tickRays = (dt, t) => {
    for (let i = 0; i < N; i++) {
      const f = list[i], a = f.ph * 6.28 + t * f.sp, ca = Math.cos(a), sa = Math.sin(a);
      const x = f.cx + ca * (f.rx + f.off), z = f.cz + sa * (f.rz + f.off);
      const tx = -sa * f.rx * Math.sign(f.sp), tz = ca * f.rz * Math.sign(f.sp);
      const g = Math.max(height(x, z), 0) , y = g + f.up + Math.sin(t * 0.7 + f.fl) * 2.5;
      _e.set(Math.sin(t * 0.9 + f.fl) * 0.08, Math.atan2(-tx, -tz), -0.25 * Math.sign(f.sp), "YXZ");
      _q.setFromEuler(_e); _p.set(x, y, z); _s.setScalar(f.sc);
      _m.compose(_p, _q, _s); imB.setMatrixAt(i, _m);
      const flap = Math.sin(t * 2.4 + f.fl) * 0.55;
      wq.setFromAxisAngle(ax, flap); wl.makeRotationFromQuaternion(wq); wm.multiplyMatrices(_m, wl); imL.setMatrixAt(i, wm);
      wq.setFromAxisAngle(ax, -flap); wl.makeRotationFromQuaternion(wq); wm.multiplyMatrices(_m, wl); imR.setMatrixAt(i, wm);
    }
    imB.instanceMatrix.needsUpdate = imL.instanceMatrix.needsUpdate = imR.instanceMatrix.needsUpdate = true;
  };
  tickRays(0, 0); w.updaters.push(tickRays);

  // ── 에일 기수 가오리(큰 날짐승): 공명 숲 위를 크게 돈다 ──
  const big = [];
  for (let k = 0; k < 4; k++) {
    const mdl = factionModel("ail", "grunt", k % 2 ? 0xffb24a : 0x3ff0d8);
    if (!mdl) break;
    mdl.scale.setScalar(2.6 + r() * 1.2); w.scene.add(mdl);
    big.push({ mdl, R: 120 + k * 14, y: 150 + k * 9, ph: k * 1.57, sp: 0.045 + k * 0.006 });
  }
  w.updaters.push((dt, t) => {
    for (const f of big) {
      const a = f.ph + t * f.sp, x = FOREST.x + Math.cos(a) * f.R, z = FOREST.z + 20 + Math.sin(a) * f.R;
      f.mdl.position.set(x, f.y + Math.sin(t * 0.5 + f.ph) * 5, z);
      f.mdl.rotation.set(0, Math.atan2(Math.sin(a), -Math.cos(a)), 0.3, "YXZ");
      f.mdl.userData.tick(dt, 0.5, t);
    }
  });

  // ── 뼈 풍차 ──
  const RO = ctx.rotors || [];
  if (RO.length) {
    const im = new THREE.InstancedMesh(rotorG(), mat, RO.length); im.frustumCulled = false; w.scene.add(im);
    w.updaters.push((dt, t) => {
      RO.forEach(([x, y, z, yaw], i) => { _e.set(0, yaw * Math.PI / 180, t * (1.1 + (i % 3) * 0.3), "YXZ"); _q.setFromEuler(_e); im.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.setScalar(1))); });
      im.instanceMatrix.needsUpdate = true;
    });
  }
  // ── 풍경 ──
  const CH = ctx.chimes || [];
  if (CH.length) {
    const im = new THREE.InstancedMesh(chimeG(), mat, CH.length); im.frustumCulled = false; w.scene.add(im);
    w.updaters.push((dt, t) => {
      CH.forEach(([x, y, z], i) => { _e.set(Math.sin(t * 1.3 + i) * 0.22, i * 0.7, Math.sin(t * 1.7 + i * 2.1) * 0.18, "YXZ"); _q.setFromEuler(_e); im.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.setScalar(1.3))); });
      im.instanceMatrix.needsUpdate = true;
    });
  }

  // ── 빈 합창 둥지의 심: 맥박 치는 핏빛 알과 도는 가시 고리 ──
  if (ctx.nestHeart) {
    const [x, y, z] = ctx.nestHeart;
    const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.3, 0.6) }), heart = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), hm);
    heart.position.set(x, y - 4.5, z);
    const ringG = new THREE.TorusGeometry(9, 0.35, 5, 36), crown = new THREE.Mesh(ringG, w.material("glow"));
    crown.position.set(x, y - 9, z); crown.rotation.x = Math.PI / 2;
    // 고리에 박힌 가시
    const spikes = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, c = new THREE.ConeGeometry(0.5, 3, 4); c.rotateZ(-Math.PI / 2); c.translate(10.2, 0, 0); c.rotateY(a); spikes.push([c, null, 0x3a1c3c]); }
    const crownS = new THREE.Mesh(merged(spikes), mat); crownS.position.copy(crown.position);
    for (const m of [heart, crown, crownS]) { m.frustumCulled = false; w.scene.add(m); }
    w.disposables.push(hm, heart.geometry, ringG, crownS.geometry);
    w.updaters.push((dt, t) => {
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 2.6), 4);
      heart.scale.set(2 + beat * 0.8, 2.6 + beat, 2 + beat * 0.8);
      hm.color.setRGB(1.6 + beat * 1.6, 0.2 + beat * 0.2, 0.45 + beat * 0.4);
      crown.rotation.z = t * 0.3; crownS.rotation.y = t * 0.3; crown.position.y = crownS.position.y = y - 9 + Math.sin(t * 0.8) * 1.2;
    });
  }

  // ── 유리 가루: 바람에 실려 떠도는 반짝이 ──
  {
    const n = 900, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (r() * 2 - 1) * 260, z = (r() * 2 - 1) * 260; pos[i * 3] = x; pos[i * 3 + 1] = Math.max(height(x, z), -20) + 1 + r() * 26; pos[i * 3 + 2] = z; seed[i] = r() * 100; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    const pm = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float seed; uniform float t; varying float vA; varying float vS;
        void main(){ vec3 p = position; p.x += mod(t * 3.0 + seed * 7.0, 40.0) - 20.0; p.y += sin(t * 0.7 + seed) * 1.5; p.z += sin(t * 0.3 + seed * 3.0) * 4.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vA = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t * 3.0 + seed * 11.0), 6.0); vS = fract(seed * 0.37);
          gl_PointSize = clamp(260.0 / -mv.z, 1.0, 5.0); }`,
      fragmentShader: `varying float vA; varying float vS; void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard;
          vec3 col = vS < 0.4 ? vec3(0.6, 1.0, 0.92) : vS < 0.7 ? vec3(1.0, 0.85, 0.55) : vec3(1.0, 0.6, 0.85);
          gl_FragColor = vec4(col * vA, vA); }`,
    });
    const pts = new THREE.Points(g, pm); pts.frustumCulled = false; w.scene.add(pts);
    w.disposables.push(g, pm);
    w.updaters.push((dt, t) => { pm.uniforms.t.value = t; });
  }
  void K;
}
