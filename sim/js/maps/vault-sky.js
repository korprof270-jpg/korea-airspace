// 제국 코어 저장고의 하늘과 원경: 남색 밤하늘 아래 끝없이 이어지는 제국 탑의 지평선(붉은 창과 드문 청록 창), 먼 다른 저장고들의 청록 빛기둥,
// 지평선을 막는 검은 능선, 연기 기둥, 낮게 깔린 밤구름, 하늘을 천천히 도는 제국 순찰함 넷과 그 탐조 불빛
import * as THREE from "../../vendor/three.module.min.js";
import { M, prop, merged, mat, hash, Steam, BLK, BLK2, IRON, STEEL, GUN, RED, RED2, CYA, CYA2, CYA3, DEG } from "./vault-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const CONEG = (() => { const g = new THREE.ConeGeometry(1, 1, 6, 1); g.translate(0, 0.5, 0); return g; })();
const OCTG = (() => { const g = new THREE.CylinderGeometry(0.72, 1, 1, 8, 1); g.translate(0, 0.5, 0); return g; })();

// 제국 순찰함: 길쭉한 쐐기 선체, 함교, 아래로 늘어진 용골 날개, 붉은 현창 줄과 엔진 불빛. 길이 L(로컬 -z 가 뱃머리)
function shipParts(L) {
  const W = L * 0.16, H = L * 0.07, body = [], glow = [];
  body.push([BOXG, M(0, 0, 0, W, H, L * 0.62), BLK2], [BOXG, M(0, -H * 0.1, -L * 0.42, W * 0.62, H * 0.7, L * 0.26), BLK], [BOXG, M(0, -H * 0.15, -L * 0.6, W * 0.3, H * 0.45, L * 0.14), IRON]);
  body.push([BOXG, M(0, H * 0.9, L * 0.12, W * 0.42, H * 0.9, L * 0.2), IRON], [BOXG, M(0, H * 1.6, L * 0.16, W * 0.24, H * 0.6, L * 0.1), BLK2], [BOXG, M(0, -H * 0.9, L * 0.05, W * 0.12, H * 1.2, L * 0.4), BLK]);
  for (const s of [-1, 1]) {
    body.push([BOXG, M(s * W * 0.75, -H * 0.2, L * 0.16, W * 0.6, H * 0.3, L * 0.3, 0, 0, -s * 12), BLK], [BOXG, M(s * W * 0.42, 0, L * 0.34, W * 0.24, H * 0.8, L * 0.14), GUN]);
    glow.push([BOXG, M(s * W * 0.505, H * 0.1, -L * 0.02, 0.4, H * 0.12, L * 0.5), RED], [BOXG, M(s * W * 0.42, 0, L * 0.412, W * 0.18, H * 0.5, 0.5), RED2]);
    glow.push([BOXG, M(s * W * 0.32, -H * 0.12, -L * 0.42, 0.4, H * 0.1, L * 0.2), RED]);
  }
  glow.push([BOXG, M(0, H * 1.66, L * 0.108, W * 0.2, H * 0.14, 0.4), RED2], [BOXG, M(0, -H * 1.52, L * 0.05, W * 0.13, H * 0.1, L * 0.3), CYA2], [BOXG, M(0, H * 0.5, -L * 0.3, W * 0.1, 0.4, L * 0.3), RED]);
  return [body, glow];
}

export function sky(w, K) {
  const r = w.rand, body = [], glow = [];
  // 원경 탑: 성 밖 황무지 너머, 멀수록 높고 빽빽하게. 창은 대개 붉고 드물게 청록
  for (let i = 0; i < 280; i++) {
    const a = r() * Math.PI * 2, d = 330 + Math.pow(r(), 0.75) * 820, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const sx = 14 + r() * 30, sz = 14 + r() * 30, h = 30 + r() * 90 + (d - 330) * (0.12 + r() * 0.3), ry = r() < 0.65 ? 0 : 45;
    body.push([BOXG, M(x, h / 2, z, sx, h, sz, 0, ry, 0), r() < 0.5 ? BLK : BLK2]);
    const cy = r() < 0.16;
    for (let k = 0, n = 1 + ((r() * 3) | 0); k < n; k++) glow.push([BOXG, M(x, h * (0.3 + r() * 0.65), z, sx + 0.6, 1.4 + r() * 1.4, sz + 0.6, 0, ry, 0), cy ? CYA2 : r() < 0.85 ? RED : RED2]);
    if (r() < 0.4) { const th = 10 + r() * 46; body.push([BOXG, M(x, h + th / 2, z, sx * 0.36, th, sz * 0.36, 0, ry, 0), IRON]); glow.push([BOXG, M(x, h + th + 1, z, 1.8, 1.8, 1.8), cy ? CYA : RED]); }
    if (r() < 0.25) glow.push([BOXG, M(x, h * 0.5, z, 0.8, h * 0.7, sz + 0.7, 0, ry, 0), cy ? CYA3 : RED]);
  }
  // 먼 저장고 넷: 다른 구역의 코어 저장고. 왕관에서 청록 빛기둥이 솟는다
  for (const [a, d, h] of [[0.5, 720, 300], [2.0, 860, 360], [3.5, 660, 260], [5.1, 940, 400]]) {
    const x = Math.cos(a) * d, z = Math.sin(a) * d, R = h * 0.32;
    body.push([OCTG, M(x, 0, z, R, h * 0.55, R, 0, 22.5, 0), BLK], [OCTG, M(x, h * 0.55, z, R * 0.72, h * 0.3, R * 0.72, 0, 22.5, 0), BLK2], [OCTG, M(x, h * 0.85, z, R * 0.52, h * 0.15, R * 0.52, 0, 22.5, 0), BLK]);
    body.push([BOXG, M(x, h * 0.1, z, R * 3.2, h * 0.2, R * 3.2), BLK2]);
    for (const f of [0.2, 0.55, 0.85]) glow.push([OCTG, M(x, h * f, z, R * (f < 0.3 ? 1.01 : f < 0.6 ? 0.73 : 0.53), 2.6, R * (f < 0.3 ? 1.01 : f < 0.6 ? 0.73 : 0.53), 0, 22.5, 0), f > 0.8 ? CYA : CYA2]);
    glow.push([BOXG, M(x, h * 0.2, z, R * 3.22, 2.4, R * 3.22), RED]);
    K.beams.add(x, h * 0.96, z, R * 0.2, 900, CYA, 0.5, R * 0.12);
  }
  // 검은 능선: 지평선을 톱니처럼 막는다
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + r() * 0.05, d = 1150 + r() * 260, s = 150 + r() * 200;
    body.push([CONEG, M(Math.cos(a) * d, -10, Math.sin(a) * d, s * (1 + r() * 0.8), 70 + r() * 150, s, 0, r() * 360, 0), 0x0a0d12]);
  }
  const bm = prop(w, body, "std:panel", false); bm.frustumCulled = false;
  const gm = prop(w, glow, "glow", false); gm.frustumCulled = false;
  // 연기 기둥: 먼 제련 구역에서 밤하늘로
  const smoke = new Steam(w, 0x26303c, 0x04080c, 0.9, 0.022);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4 + r() * 0.5, d = 400 + r() * 380; smoke.add(Math.cos(a) * d, 50 + r() * 60, Math.sin(a) * d, 30 + r() * 22, 380, 7); }
  smoke.finish();
  // 낮게 깔린 밤구름: 아래에서 기지 불빛을 받는 납작한 덩어리
  const cl = [], ico = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, d = 300 + r() * 900, s = 70 + r() * 130;
    cl.push([ico, M(Math.cos(a) * d, 260 + r() * 140, Math.sin(a) * d, s * 1.7, s * 0.26, s, 0, r() * 360, 0), r() < 0.5 ? 0x0b1620 : 0x10222e]);
  }
  const cm = new THREE.Mesh(merged(cl), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, fog: true }));
  cm.renderOrder = -2; cm.frustumCulled = false; w.scene.add(cm); w.disposables.push(cm.geometry, cm.material, ico);
  w.updaters.push((dt) => { cm.rotation.y += dt * 0.002; });

  // 순찰함 넷: 저마다 다른 반경·높이로 기지 둘레를 천천히 돈다. 배 밑에서 붉은 탐조 빛줄기가 내려온다
  const coneG = new THREE.CylinderGeometry(1.5, 20, 1, 14, 1, true); coneG.translate(0, -0.5, 0);
  const coneM = new THREE.MeshBasicMaterial({ color: 0xff3a30, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  w.disposables.push(coneG, coneM);
  const ships = [[340, 236, 150, 0.4, 0.016, 1], [520, 250, 210, 2.3, -0.011, -1], [700, 300, 260, 4.2, 0.008, 1], [440, 170, 120, 5.4, -0.02, -1]].map(([R, y, L, ph, sp, dir]) => {
    const [b, g] = shipParts(L), pivot = new THREE.Group(), hull = new THREE.Mesh(merged(b), mat(w, "paint")), lit = new THREE.Mesh(merged(g), mat(w, "glow"));
    const ship = new THREE.Group(); ship.add(hull, lit); ship.position.set(R, y, 0); ship.rotation.y = dir > 0 ? Math.PI : 0;
    const cone = new THREE.Mesh(coneG, coneM); cone.scale.set(1, y * 0.92, 1); cone.position.set(0, -L * 0.1, -L * 0.2); cone.renderOrder = 6; ship.add(cone);
    for (const m of [hull, lit, cone]) m.frustumCulled = false;
    pivot.add(ship); pivot.rotation.y = ph; w.scene.add(pivot); w.disposables.push(hull.geometry, lit.geometry);
    return { pivot, ship, cone, sp, ph };
  });
  w.updaters.push((dt, t) => {
    for (const s of ships) { s.pivot.rotation.y = s.ph + t * s.sp; s.ship.position.y += Math.sin(t * 0.4 + s.ph) * dt * 0.6; s.cone.rotation.z = Math.sin(t * 0.23 + s.ph * 2) * 0.22; s.cone.rotation.x = Math.cos(t * 0.19 + s.ph) * 0.2; }
  });
  // 떠도는 잔광: 기지 위로 천천히 솟는 청록 점들
  const N = 700, pos = new Float32Array(N * 3), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) base.set([(hash(i, 21) * 2 - 1) * 250, hash(i, 22) * 170, (hash(i, 23) * 2 - 1) * 250], i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x48dcf4, size: 0.34, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; w.scene.add(pts); w.disposables.push(pg, pts.material);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.2 + i) * 5; pos[i * 3 + 1] = (base[i * 3 + 1] + t * (1 + (i % 5) * 0.3)) % 170; pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + i * 1.3) * 5;
    }
    pg.attributes.position.needsUpdate = true;
  });
}
