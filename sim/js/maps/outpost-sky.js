// 붉은 협곡 전초기지 하늘·원경: 먼 제국 감시탑과 봉화 불빛, 연기 기둥, 떠도는 먼지 회오리, 하늘에 뜬 제국 순양함 둘, 독수리, 바람에 날리는 모래
import * as THREE from "../../vendor/three.module.min.js";
import { M, merged, plume, dustDevils, birds, hash, BOXG, BLK, BLK2, IRON, STEEL, RED, RED2, DRED, ORG } from "./outpost-kit.js";
import { height } from "./outpost-terrain.js";

export function sky(w, K) {
  const r = w.rand;
  // 먼 제국 탑: 맵 밖 메사 위에 선 검은 기둥 — 붉은 눈 띠와 깜박이
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3, d = 335 + r() * 120, x = Math.cos(a) * d, z = Math.sin(a) * d, y = height(x, z), h = 46 + r() * 70, s = 9 + r() * 9;
    w.box(x, y - 2, z, s, h, s, BLK, { mat: "std:panel", tile: 8, col: false });
    w.box(x, y + h * 0.62, z, s * 0.66, h * 0.5, s * 0.66, BLK2, { mat: "std:panel", tile: 8, col: false });
    w.box(x, y + h * 1.0, z, s * 0.7, 1.6, s * 0.7, RED, { mat: "glow", col: false });
    w.box(x, y + h * 0.4, z, s + 0.3, 1.2, s + 0.3, DRED, { mat: "glow", col: false });
    w.pipe(x, y + h * 1.12, z, x, y + h * 1.12 + 14, z, 0.4, STEEL, { col: false });
    K.blink.add(x, y + h * 1.12 + 15, z, RED, 1.1, i);
  }
  // 연기 기둥(원경)과 맵 안팎의 먼지 회오리
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.7 + r() * 0.4, d = 330 + r() * 130, x = Math.cos(a) * d, z = Math.sin(a) * d; K.smoke.push([x, height(x, z) + 14, z, 12 + r() * 6, 220, 16, 0x6e4a3a]); }
  dustDevils(w, [[-196, 150, 22, 40, 4.5, 0.5], [130, -212, 24, 36, 4, 2.1], [30, 176, 30, 44, 5, 4.0], [-330, -120, 60, 90, 16, 1.0], [340, 200, 70, 100, 18, 3.3], [120, 360, 60, 80, 14, 5.1], [-260, 330, 50, 84, 15, 2.6]]);
  // 하늘의 제국 순양함: 길쭉한 검은 선체가 먼 하늘을 천천히 돈다
  const hull = merged([
    [BOXG, M(0, 0, 0, 150, 12, 26), 0x1b1a20], [BOXG, M(-16, 9, 0, 80, 8, 18), 0x23222a], [BOXG, M(-34, 17, 0, 26, 9, 12), 0x1b1a20], [BOXG, M(84, -1, 0, 30, 7, 14), 0x23222a],
    [BOXG, M(-60, -2, 20, 40, 4, 16), 0x23222a], [BOXG, M(-60, -2, -20, 40, 4, 16), 0x23222a], [BOXG, M(-78, 4, 0, 8, 22, 4), 0x1b1a20],
  ]);
  const lights = merged([[BOXG, M(0, 2, 13.2, 120, 0.8, 0.3), RED], [BOXG, M(0, 2, -13.2, 120, 0.8, 0.3), RED], [BOXG, M(-34, 19, 0, 26.4, 1.2, 12.4), RED2], [BOXG, M(-76, 0, 8, 2, 5, 5), ORG], [BOXG, M(-76, 0, -8, 2, 5, 5), ORG]]);
  const hm = new THREE.MeshLambertMaterial({ vertexColors: true }), lm = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.8, 1.8, 1.8) });
  w.disposables.push(hull, lights, hm, lm);
  const ships = [[620, 190, 0.012, 0.4, 1.5], [760, 250, -0.008, 3.4, 1.1]].map(([R, y, sp, ph, s]) => { const g = new THREE.Group(); g.add(new THREE.Mesh(hull, hm), new THREE.Mesh(lights, lm)); g.scale.setScalar(s); w.scene.add(g); return { g, R, y, sp, ph }; });
  w.updaters.push((dt, t) => { for (const s of ships) { const a = s.ph + t * s.sp; s.g.position.set(Math.cos(a) * s.R, s.y + Math.sin(t * 0.1 + s.ph) * 6, Math.sin(a) * s.R); s.g.rotation.y = -a + (s.sp > 0 ? -Math.PI / 2 : Math.PI / 2); } });
  // 독수리: 고원과 메사 위를 높이 맴돈다
  birds(w, [[-120, 150, 120, 60, 9, 0.3], [-90, 162, 150, 80, -8, 2.2], [150, 156, 150, 70, 9, 4.1], [40, 170, 60, 110, -10, 1.3], [-170, 158, -40, 50, 8, 5.0]]);
  // 바람에 날리는 모래알
  const N = 800, pos = new Float32Array(N * 3), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) base.set([(hash(i, 21) * 2 - 1) * 270, 2 + hash(i, 22) * 110, (hash(i, 23) * 2 - 1) * 270], i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffc890, size: 0.3, transparent: true, opacity: 0.6, depthWrite: false }));
  pts.frustumCulled = false; w.scene.add(pts); w.disposables.push(pg, pts.material);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      pos[i * 3] = ((base[i * 3] + t * (5 + (i % 7)) + 270) % 540) - 270; pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.6 + i) * 1.5; pos[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.23 + i * 1.7) * 5;
    }
    pg.attributes.position.needsUpdate = true;
  });
}
