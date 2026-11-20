// 거신 공창의 하늘과 원경: 골짜기를 두른 먼 설산 봉우리 · 낮게 깔린 눈구름 · 산자락의 눈안개 · 먼 골짜기의 연기 · 구름 사이에 뜬 제국 함대
import * as THREE from "../../vendor/three.module.min.js";
import { M, prop, merged, plume, hash, BLK, BLK2, IRON, RED, ORG, SNOW, SNOW2 } from "./foundry-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const PEAK = (() => { const g = new THREE.ConeGeometry(1, 1, 7, 1); g.translate(0, 0.5, 0); return g; })();

export function sky(w, K) {
  const r = w.rand, rock = [], snow = [];
  // 먼 봉우리: 바위 원뿔 위에 눈 모자. 두 겹(가까운 낮은 능선 · 먼 높은 봉우리)
  const peak = (x, z, R, h, ry) => {
    rock.push([PEAK, M(x, -20, z, R, h + 20, R, 0, ry, 0), r() < 0.5 ? 0x78859a : 0x6b778b]);
    const k = 0.5 + r() * 0.16;
    snow.push([PEAK, M(x, h * (1 - k) - 2, z, R * k * 1.08, h * k + 4, R * k * 1.08, 0, ry + 20, 0), r() < 0.5 ? 0xf2f6fb : 0xdfe8f3]);
    // 어깨 봉우리
    if (r() < 0.7) { const a = r() * 6.28, d = R * 0.55, hh = h * (0.45 + r() * 0.25); rock.push([PEAK, M(x + Math.cos(a) * d, -20, z + Math.sin(a) * d, R * 0.6, hh + 20, R * 0.6, 0, ry * 2, 0), 0x74819a]); snow.push([PEAK, M(x + Math.cos(a) * d, hh * 0.5 - 2, z + Math.sin(a) * d, R * 0.33, hh * 0.5 + 4, R * 0.33, 0, ry, 0), 0xe6edf6]); }
  };
  for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.283 + r() * 0.12, d = 560 + r() * 90; peak(Math.cos(a) * d, Math.sin(a) * d, 130 + r() * 70, 170 + r() * 110, r() * 360); }
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.283 + r() * 0.2, d = 800 + r() * 260; peak(Math.cos(a) * d, Math.sin(a) * d, 200 + r() * 150, 320 + r() * 260, r() * 360); }
  // 북쪽 뒤의 가장 높은 쌍봉(거신 뒤에 걸린다)
  peak(-140, -900, 330, 640, 12); peak(190, -980, 300, 560, 40);
  const rm = prop(w, rock, "flat", false); rm.frustumCulled = false;
  const sm = prop(w, snow, "flat", false); sm.frustumCulled = false;

  // 눈구름층: 납작한 덩어리가 천천히 돈다 + 산자락의 눈안개 띠
  const cl = [], ico = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 80; i++) {
    const a = r() * 6.283, d = 200 + r() * 950, s = 70 + r() * 130;
    cl.push([ico, M(Math.cos(a) * d, 320 + r() * 110, Math.sin(a) * d, s * 1.7, s * 0.26, s, 0, r() * 360, 0), r() < 0.5 ? 0x8f9db2 : 0xa9b6c8]);
  }
  const cm = new THREE.Mesh(merged(cl), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, fog: true }));
  cm.renderOrder = -2; cm.frustumCulled = false; w.scene.add(cm); w.disposables.push(cm.geometry, cm.material);
  const mist = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * 6.283 + r() * 0.1, d = 400 + r() * 170, s = 50 + r() * 60;
    mist.push([ico, M(Math.cos(a) * d, 30 + r() * 40, Math.sin(a) * d, s * 1.6, s * 0.16, s, 0, r() * 360, 0), 0xe4ebf4]);
  }
  const mm = new THREE.Mesh(merged(mist), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.24, depthWrite: false, fog: true }));
  mm.renderOrder = 3; mm.frustumCulled = false; w.scene.add(mm); w.disposables.push(mm.geometry, mm.material);
  w.updaters.push((dt) => { cm.rotation.y += dt * 0.003; mm.rotation.y -= dt * 0.0016; });

  // 먼 골짜기의 다른 공창에서 오르는 연기
  for (const [a, d] of [[0.5, 520], [2.5, 600], [3.9, 540], [5.4, 640]]) K.smoke.add(Math.cos(a) * d, 70 + r() * 40, Math.sin(a) * d, 26 + r() * 14, 300, 6, 0.35);

  // 제국 함대: 구름 밑에 뜬 검은 함선 셋(붉은 등줄). 천천히 떠돈다
  const hull = [], lit = [];
  const ship = (x, y, z, L, ry) => {
    const c = Math.cos(ry * Math.PI / 180), s = Math.sin(ry * Math.PI / 180), P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    hull.push([BOXG, M(x, y, z, L, L * 0.09, L * 0.2, 0, ry, 0), BLK], [BOXG, M(x, y + L * 0.06, z, L * 0.6, L * 0.06, L * 0.12, 0, ry, 0), BLK2], [BOXG, M(x, y - L * 0.07, z, L * 0.5, L * 0.06, L * 0.1, 0, ry, 0), IRON]);
    const [tx, tz] = P(-L * 0.28, 0), [bx, bz] = P(L * 0.52, 0);
    hull.push([BOXG, M(tx, y + L * 0.14, tz, L * 0.12, L * 0.12, L * 0.05, 0, ry, 0), BLK2], [BOXG, M(bx, y, bz, L * 0.16, L * 0.05, L * 0.1, 0, ry, 0), IRON]);
    for (const sv of [-1, 1]) { const [fx, fz] = P(-L * 0.2, sv * L * 0.16); hull.push([BOXG, M(fx, y - L * 0.02, fz, L * 0.3, L * 0.02, L * 0.14, 0, ry, 0), BLK2]); lit.push([BOXG, M(...[P(0, sv * L * 0.101)[0], y, P(0, sv * L * 0.101)[1]], L * 0.9, L * 0.008, 0.6, 0, ry, 0), RED]); }
    const [ex, ez] = P(-L * 0.5, 0); lit.push([BOXG, M(ex, y, ez, 1, L * 0.05, L * 0.12, 0, ry, 0), ORG]);
  };
  ship(-330, 205, -520, 190, 18); ship(420, 230, -260, 140, -35); ship(120, 190, 640, 160, 60);
  const fleet = new THREE.Group();
  fleet.add(prop(w, hull, "paint", false), prop(w, lit, "glow", false));
  fleet.traverse((o) => { o.frustumCulled = false; });
  w.scene.add(fleet);
  w.updaters.push((dt, t) => { fleet.position.y = Math.sin(t * 0.07) * 6; fleet.rotation.y = Math.sin(t * 0.011) * 0.05; });
  void hash; void SNOW; void SNOW2;
}
