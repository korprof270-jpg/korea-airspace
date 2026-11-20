// 기계제국 수도의 하늘과 원경: 연기 낀 주황빛 하늘 아래 끝없이 이어지는 검은 탑의 지평선, 먼 거대 첨탑들, 하늘로 솟는 연기 기둥, 떠도는 재
import * as THREE from "../../vendor/three.module.min.js";
import { M, prop, merged, plume, hash, BLK, BLK2, IRON, RED, RED2, ORG } from "./empire-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1), CONEG = (() => { const g = new THREE.ConeGeometry(1, 1, 8, 1); g.translate(0, 0.5, 0); return g; })();

export function sky(w) {
  const r = w.rand, body = [], glow = [];
  // 원경 탑: 바깥으로 갈수록 높고 빽빽하게. 하나로 합친 메시 두 개(몸체·붉은 창)
  for (let i = 0; i < 300; i++) {
    const a = r() * Math.PI * 2, d = 300 + Math.pow(r(), 0.7) * 820, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const sx = 14 + r() * 34, sz = 14 + r() * 34, h = 40 + r() * 120 + (d - 300) * (0.15 + r() * 0.35);
    const ry = r() < 0.7 ? 0 : 45;
    body.push([BOXG, M(x, h / 2, z, sx, h, sz, 0, ry, 0), r() < 0.5 ? BLK : BLK2]);
    for (let k = 0, n = 1 + ((r() * 3) | 0); k < n; k++) { const y = h * (0.35 + r() * 0.6); glow.push([BOXG, M(x, y, z, sx + 0.6, 1.6 + r() * 1.5, sz + 0.6, 0, ry, 0), r() < 0.8 ? RED : ORG]); }
    if (r() < 0.35) { const th = 10 + r() * 40; body.push([BOXG, M(x, h + th / 2, z, sx * 0.4, th, sz * 0.4, 0, ry, 0), IRON]); glow.push([BOXG, M(x, h + th + 1, z, 1.6, 1.6, 1.6, 0, 0, 0), RED]); }
  }
  // 먼 거대 첨탑 다섯: 다른 노드의 에이아 코어 (끝에 붉은 점)
  for (const [a, d, h] of [[0.6, 760, 520], [2.1, 900, 640], [3.3, 700, 460], [4.4, 980, 700], [5.5, 820, 560]]) {
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    body.push([CONEG, M(x, 0, z, 46, h, 46, 0, 22.5, 0), BLK]);
    body.push([BOXG, M(x, h * 0.18, z, 120, h * 0.36, 120, 0, 0, 0), BLK2]);
    glow.push([BOXG, M(x, h * 0.36, z, 121, 3, 121, 0, 0, 0), RED]);
    for (const f of [0.5, 0.65, 0.8]) glow.push([BOXG, M(x, h * f, z, 46 * (1 - f) * 2 + 1, 2.4, 46 * (1 - f) * 2 + 1, 0, 22.5, 0), RED]);
    glow.push([BOXG, M(x, h + 6, z, 6, 12, 6, 0, 0, 0), RED2]);
  }
  const bm = prop(w, body, "std:panel", false); bm.frustumCulled = false;
  const gm = prop(w, glow, "glow", false); gm.frustumCulled = false;
  // 연기 기둥: 먼 공장 지대에서 하늘로
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.5, d = 360 + r() * 380;
    plume(w, Math.cos(a) * d, 60 + r() * 60, Math.sin(a) * d, 40 + r() * 30, 420, 6, 0x2a1814);
  }
  // 하늘 높이 깔린 연기 구름층: 아래에서 불빛을 받는 납작한 덩어리 (원경, 충돌 없음)
  const cl = [], ico = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 260 + r() * 900, s = 60 + r() * 120;
    cl.push([ico, M(Math.cos(a) * d, 230 + r() * 120, Math.sin(a) * d, s * 1.6, s * 0.3, s, 0, r() * 360, 0), r() < 0.5 ? 0x3a1a14 : 0x4a2216]);
  }
  const cm = new THREE.Mesh(merged(cl), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, fog: true }));
  cm.renderOrder = -2; cm.frustumCulled = false; w.scene.add(cm); w.disposables.push(cm.geometry, cm.material);
  w.updaters.push((dt) => { cm.rotation.y += dt * 0.0025; });
  // 떠도는 재: 카메라 둘레 큰 상자 안의 점들이 천천히 떠오른다
  const N = 900, pos = new Float32Array(N * 3), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) base.set([(hash(i, 11) * 2 - 1) * 260, hash(i, 12) * 160, (hash(i, 13) * 2 - 1) * 260], i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xff7a40, size: 0.35, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; w.scene.add(pts); w.disposables.push(pg, pts.material);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const y = (base[i * 3 + 1] + t * (1.2 + (i % 5) * 0.3)) % 160;
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.2 + i) * 6; pos[i * 3 + 1] = y; pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + i * 1.3) * 6;
    }
    pg.attributes.position.needsUpdate = true;
  });
}
