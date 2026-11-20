// 제국 궤도 발사기지의 하늘과 원경: 수평선의 함대 실루엣, 먼 곶과 산줄기, 솟구친 적운, 테더를 감싼 구름 고리, 하늘을 도는 순양함 편대, 먼 발사 구름 기둥
import { THREE, M, prop, merged, hash, BLK, BLK2, IRON, STEEL, RED, RED2, ELEV } from "./spaceport-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const ICO = new THREE.IcosahedronGeometry(1, 1);
const CONE = (() => { const g = new THREE.ConeGeometry(1, 1, 7, 1); g.translate(0, 0.5, 0); return g; })();

export function sky(w) {
  const r = w.rand;
  // ── 적운: 수평선 위로 솟은 흰 뭉게구름 탑 (원경, 충돌 없음) ──
  const cl = [];
  const tower = (x, z, s, h) => {
    const n = 6 + ((r() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), rad = s * (1 - t * 0.6) * (0.8 + r() * 0.4), k = 1 - t * 0.5;
      cl.push([ICO, M(x + (r() - 0.5) * s * 1.6 * k, 150 + t * h, z + (r() - 0.5) * s * 1.6 * k, rad * 1.5, rad * 0.72, rad * 1.25, 0, r() * 360, 0), t > 0.55 ? 0xffffff : t > 0.2 ? 0xf4efe6 : 0xcfc9c4]);
    }
    cl.push([ICO, M(x, 132, z, s * 2.3, s * 0.22, s * 1.9, 0, r() * 360, 0), 0xb9b4b6]);   // 납작한 밑면
  };
  for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + r() * 0.35, d = 1350 + r() * 550; tower(Math.cos(a) * d, Math.sin(a) * d, 85 + r() * 70, 240 + r() * 320); }
  // 테더를 감싼 구름 고리: 축이 구름 속으로 사라진다
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, d = 40 + r() * 110, s = 46 + r() * 44; cl.push([ICO, M(ELEV[0] + Math.cos(a) * d, 600 + r() * 150, ELEV[1] + Math.sin(a) * d, s * 1.7, s * 0.5, s * 1.3, 0, r() * 360, 0), r() < 0.5 ? 0xffffff : 0xece6da]); }
  // 먼 발사 구름 기둥: 북서쪽 하늘로 휘어 오르는 흰 줄기
  for (let i = 0; i < 26; i++) { const t = i / 25, s = 14 + t * 30; cl.push([ICO, M(-1000 + t * t * 260 + (r() - 0.5) * 10, 60 + t * 900, -900 - t * 120, s, s * 1.3, s, 0, r() * 360, 0), 0xffffff]); }
  const cm = new THREE.Mesh(merged(cl), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x777370, flatShading: true, fog: true }));
  cm.frustumCulled = false; cm.userData.toonDone = true; w.scene.add(cm); w.disposables.push(cm.geometry, cm.material);

  // ── 먼 땅: 북·서쪽 산줄기와 바다 건너 곶 (안개에 푸르게 잠긴다) ──
  const land = [];
  const ridge = (a0, a1, d0, d1, n, hh, col) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + r() * 0.8) / n, d = d0 + r() * (d1 - d0), h = hh * (0.5 + r() * 0.8), s = h * (1.1 + r() * 0.9); land.push([CONE, M(Math.cos(a) * d, -4, Math.sin(a) * d, s, h, s * (0.7 + r() * 0.6), 0, r() * 360, 0), col]); } };
  ridge(Math.PI * 0.72, Math.PI * 1.75, 900, 1350, 60, 200, 0x6f7d86);     // 서 → 북 → 북동 뭍의 산줄기
  ridge(Math.PI * 0.8, Math.PI * 1.7, 640, 800, 44, 70, 0x8a8f78);         // 앞산
  ridge(Math.PI * 0.52, Math.PI * 0.7, 1200, 1600, 18, 130, 0x77858f);     // 남서 바다 건너 곶
  ridge(-0.36, -0.1, 1300, 1700, 12, 110, 0x77858f);                        // 동쪽 먼 섬
  const lm = prop(w, land, "std", false); lm.frustumCulled = false;

  // ── 수평선의 함대: 남·동쪽 바다에 늘어선 전함 실루엣 ──
  const body = [], glow = [];
  const ship = (x, z, L, ry) => {
    const c = r() < 0.5 ? BLK : BLK2, T = (lx, y, lz, sx, sy, sz, col, arr = body) => { const cs = Math.cos(ry * Math.PI / 180), sn = Math.sin(ry * Math.PI / 180); arr.push([BOXG, M(x + lx * cs + lz * sn, y, z - lx * sn + lz * cs, sx, sy, sz, 0, ry, 0), col]); };
    T(0, 3, 0, L, 12, L * 0.15, c); T(L * 0.53, 5, 0, L * 0.1, 8, L * 0.1, c); T(-L * 0.05, 15, 0, L * 0.34, 12, L * 0.11, c);
    T(-L * 0.08, 27, 0, L * 0.13, 13, L * 0.07, IRON); T(-L * 0.08, 42, 0, 1.6, 18, 1.6, IRON); T(L * 0.12, 24, 0, L * 0.06, 9, L * 0.05, c);
    T(L * 0.3, 11, 0, L * 0.1, 5, L * 0.08, IRON); T(L * 0.38, 13, 0, L * 0.12, 1.4, 1.4, IRON); T(-L * 0.32, 11, 0, L * 0.1, 5, L * 0.08, IRON); T(-L * 0.4, 13, 0, L * 0.12, 1.4, 1.4, IRON);
    T(0, 8.4, 0, L * 0.92, 0.9, L * 0.155, RED, glow); T(-L * 0.08, 30, 0, L * 0.135, 1.2, L * 0.072, RED2, glow);
    glow.push([BOXG, M(x, 52, z, 2.6, 2.6, 2.6), RED]);
  };
  for (let i = 0; i < 18; i++) {
    const a = -0.55 + (i / 17) * 2.75 + (r() - 0.5) * 0.08, d = 560 + r() * 520;   // 동 → 남 → 남서
    ship(Math.cos(a) * d, Math.sin(a) * d, 130 + r() * 150, r() * 180);
  }
  const bm = prop(w, body, "paint", false); bm.frustumCulled = false;
  const gm = prop(w, glow, "glow", false); gm.frustumCulled = false;

  // ── 하늘의 순양함 편대: 바다 위 높은 곳을 천천히 돈다 ──
  const fb = [], fg = [];
  const cruiser = (a, d, y, L) => {
    const x = Math.cos(a) * d, z = Math.sin(a) * d, ry = -a * 180 / Math.PI, T = (lx, ly, lz, sx, sy, sz, col, arr = fb) => { const cs = Math.cos(a), sn = Math.sin(a); arr.push([BOXG, M(x + lx * cs - lz * sn, y + ly, z + lx * sn + lz * cs, sx, sy, sz, 0, ry, 0), col]); };
    // 진행 방향은 접선(lz)
    T(0, 0, 0, L * 0.2, L * 0.09, L, BLK); T(0, -L * 0.05, L * 0.1, L * 0.13, L * 0.06, L * 0.7, BLK2); T(0, L * 0.07, -L * 0.1, L * 0.1, L * 0.07, L * 0.3, BLK2); T(0, L * 0.13, -L * 0.14, L * 0.05, L * 0.06, L * 0.1, IRON);
    T(L * 0.14, -L * 0.01, -L * 0.2, L * 0.12, L * 0.02, L * 0.4, IRON); T(-L * 0.14, -L * 0.01, -L * 0.2, L * 0.12, L * 0.02, L * 0.4, IRON);
    T(0, 0, 0, L * 0.203, L * 0.012, L * 0.9, RED, fg); T(0, -L * 0.082, L * 0.1, L * 0.06, L * 0.008, L * 0.6, RED2, fg); T(0, 0, -L * 0.505, L * 0.12, L * 0.05, 1, 0xffb070, fg);
  };
  cruiser(0.5, 760, 300, 220); cruiser(0.62, 860, 340, 160); cruiser(0.42, 880, 270, 150); cruiser(1.6, 700, 250, 200); cruiser(1.74, 800, 290, 140); cruiser(2.5, 900, 330, 240); cruiser(-0.5, 820, 310, 180);
  const fleet = new THREE.Group(); fleet.add(new THREE.Mesh(merged(fb), new THREE.MeshLambertMaterial({ vertexColors: true })), new THREE.Mesh(merged(fg), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2, 2, 2) })));
  fleet.children.forEach((m) => { m.frustumCulled = false; });
  w.scene.add(fleet);
  w.updaters.push((dt, t) => { fleet.rotation.y = -t * 0.004; fleet.position.y = Math.sin(t * 0.1) * 6; });
}
