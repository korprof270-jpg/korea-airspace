// 맵 3: 네온 시티 — 밤의 도심. 60m 격자 블록과 16m 폭 도로, 빌딩 숲
import * as THREE from "../../vendor/three.module.min.js";
import { PathMover, makeCar } from "../entities.js";

const NEON = [0xff2bd6, 0x21d4fd, 0xffe14a, 0x35ff7a, 0xff5a1f, 0x9b6bff];
const TONE = [0x6f7a8c, 0x5d6678, 0x7a7384, 0x566a7a, 0x80796e, 0x4f5a70];
// 높이가 정해진 랜드마크 빌딩: "i,j" → [가로, 세로, 높이]
const FIXED = { "1,0": [28, 28, 36], "1,-1": [30, 30, 52], "0,-1": [26, 26, 44], "-1,-1": [30, 30, 30], "-1,0": [24, 24, 60], "2,0": [28, 28, 40] };
const EMPTY = new Set(["0,0", "-1,1", "-3,3", "3,-3", "2,2"]);

// 도로를 따라 도는 둥근 사각 경로
function loop(x0, x1, z0, z1, v, c = 14) {
  const vs = v * 0.45;
  return [
    [x0 + c, 0, z1, vs], [(x0 + x1) / 2, 0, z1, v], [x1 - c, 0, z1, vs], [x1, 0, z1 - c, vs], [x1, 0, (z0 + z1) / 2, v], [x1, 0, z0 + c, vs],
    [x1 - c, 0, z0, vs], [(x0 + x1) / 2, 0, z0, v], [x0 + c, 0, z0, vs], [x0, 0, z0 + c, vs], [x0, 0, (z0 + z1) / 2, v], [x0, 0, z1 - c, vs],
  ];
}

function tower(w, x, z, wd, dp, h, color, plain = false) {
  const r = w.rand;
  w.building(x, z, wd, dp, h, color, { roof: !plain });
  const c = NEON[(r() * NEON.length) | 0];
  if (r() < 0.65) { // 세로 네온 간판
    const side = r() < 0.5 ? 1 : -1, sh = Math.min(h * 0.45, 16);
    if (r() < 0.5) w.box(x + side * (wd / 2 + 0.25), h * 0.42, z + (r() - 0.5) * dp * 0.5, 0.4, sh, 2.2, c, { mat: "glow", col: false });
    else w.box(x + (r() - 0.5) * wd * 0.5, h * 0.42, z + side * (dp / 2 + 0.25), 2.2, sh, 0.4, c, { mat: "glow", col: false });
  }
  if (r() < 0.45) { // 옥상 테두리 조명
    for (const s of [-1, 1]) {
      w.box(x, h + 0.5, z + s * dp * 0.48, wd * 0.96, 0.25, 0.25, c, { mat: "glow", col: false });
      w.box(x + s * wd * 0.48, h + 0.5, z, 0.25, 0.25, dp * 0.96, c, { mat: "glow", col: false });
    }
  }
  // 1층 상가: 쇼윈도 불빛과 보도에 번지는 조명
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (r() < 0.38) continue;
    const sc = NEON[(r() * NEON.length) | 0], warm = r() < 0.5 ? 0xffd9a0 : sc;
    const len = (dx ? dp : wd) * (0.5 + r() * 0.35), off = (r() - 0.5) * (dx ? dp : wd) * 0.2;
    const px = x + dx * (wd / 2 + 0.32) + (dx ? 0 : off), pz = z + dz * (dp / 2 + 0.32) + (dz ? 0 : off);
    w.box(px, 0.5, pz, dx ? 0.12 : len, 2.5, dx ? len : 0.12, new THREE.Color(warm).multiplyScalar(0.42).getHex(), { mat: "glow", col: false });
    w.box(px + dx * 0.5, 3.2, pz + dz * 0.5, dx ? 1.3 : len + 0.6, 0.16, dx ? len + 0.6 : 1.3, 0x1c1f27, { col: false, ao: false });
    w.box(px + dx * 1.16, 3.0, pz + dz * 1.16, dx ? 0.1 : len * 0.7, 0.5, dx ? len * 0.7 : 0.1, sc, { mat: "glow", col: false });
    w.pool(px + dx * 3.2, 0.2, pz + dz * 3.2, 5.5 + len * 0.12, warm, 0.3);
  }
  if (h > 45 && !plain && r() < 0.6) { w.pipe(x, h + 0.5, z, x, h + 12, z, 0.15, 0x555b66); w.sph(x, h + 12.4, z, 0.4, 0xff3030, { mat: "glow", col: false }); }
}

function build(w) {
  const r = w.rand;
  w.ground(0x3a3d46, "wetasphalt", 9, { vary: 0.08, env: 1.4 });

  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const cx = i * 60, cz = j * 60, key = `${i},${j}`;
    w.box(cx, 0, cz, 46, 0.18, 46, 0x4a4e58, { col: false, mat: "std:concrete", tile: 5 });
    if (EMPTY.has(key)) continue;
    if (FIXED[key]) { const [a, b, h] = FIXED[key]; tower(w, cx, cz, a, b, h, TONE[(i + j + 12) % TONE.length], true); continue; }
    const dist = Math.hypot(cx, cz), hh = () => 12 + Math.max(8, 74 - dist * 0.26) * (0.35 + r() * 0.65);
    const t = r();
    if (t < 0.3) tower(w, cx, cz, 36, 36, hh(), TONE[(r() * 6) | 0]);
    else if (t < 0.65) {
      if (r() < 0.5) { tower(w, cx - 11, cz, 17, 38, hh(), TONE[(r() * 6) | 0]); tower(w, cx + 11, cz, 17, 38, hh(), TONE[(r() * 6) | 0]); }
      else { tower(w, cx, cz - 11, 38, 17, hh(), TONE[(r() * 6) | 0]); tower(w, cx, cz + 11, 38, 17, hh(), TONE[(r() * 6) | 0]); }
    } else for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(w, cx + sx * 11, cz + sz * 11, 17, 17, hh() * (0.6 + r() * 0.5), TONE[(r() * 6) | 0]);
  }

  // 차선·가로등
  for (let k = -3; k <= 2; k++) {
    const p = k * 60 + 30;
    for (let s = -225; s < 225; s += 10) {
      if (Math.abs(((s + 230) % 60) - 30) > 21) continue; // 교차로 구간은 비움
      w.box(p, 0.03, s + 5, 0.2, 0.02, 4, 0x3c4048, { col: false, mat: "glow" });
      w.box(s + 5, 0.03, p, 4, 0.02, 0.2, 0x3c4048, { col: false, mat: "glow" });
    }
    for (let m = -3; m <= 3; m++) {
      w.lamp(p - 7.7, m * 60 + 9, 7, 0xffd9a0, 90); w.lamp(p + 7.7, m * 60 - 9, 7, 0xffd9a0, -90);
    }
  }

  // 중앙 광장: 첨탑
  w.box(0, 0, 0, 16, 30, 16, 0x8a93a8, { mat: "lit:facadelit", tile: 24, ao: false });
  w.box(0, 30, 0, 8, 66, 8, 0x9aa3b8, { mat: "lit:facadelit", tile: 24, ao: false });
  w.pipe(0, 96, 0, 0, 118, 0, 0.3, 0x8a93a5);
  w.sph(0, 118.6, 0, 0.8, 0xff2bd6, { mat: "glow", col: false });
  for (const [y, R, c] of [[42, 13, 0x21d4fd], [62, 10.5, 0xff2bd6], [82, 8, 0xffe14a]]) {
    const g = new THREE.TorusGeometry(R, 0.3, 6, 40); g.rotateX(Math.PI / 2);
    w.mesh(g, new THREE.Matrix4().makeTranslation(0, y, 0), c, "glow");
    g.dispose();
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; w.box(Math.cos(a) * 19, 0.18, Math.sin(a) * 19, 1.2, 0.6, 1.2, NEON[i % 6], { mat: "glow" }); }

  // 공원 (-60, 60)
  w.box(-60, 0.19, 60, 44, 0.03, 44, 0x2f5a37, { col: false, mat: "std:grass", tile: 6 });
  for (let i = 0; i < 16; i++) { const x = -60 + (r() - 0.5) * 38, z = 60 + (r() - 0.5) * 38; if (Math.hypot(x + 60, z - 60) > 9 && Math.abs(Math.hypot(x + 60, z - 60) - 15.5) > 3 && !(x > -52 && z < 58)) w.tree(x, z, 0.8 + r() * 0.5, "round"); }
  w.cyl(-60, 0.18, 60, 4, 0.6, 0x5a6270); w.cyl(-60, 0.5, 60, 3.4, 0.35, 0x21d4fd, { mat: "glow", col: false });
  w.pipe(-60, 0.6, 60, -60, 3.2, 60, 0.25, 0x8a93a5);
  // 스타디움형 광장 (120, 120)
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; w.pipe(120 + Math.cos(a) * 19, 0, 120 + Math.sin(a) * 19, 120 + Math.cos(a) * 19, 11, 120 + Math.sin(a) * 19, 0.4, 0x5a6270); w.box(120 + Math.cos(a) * 19, 11, 120 + Math.sin(a) * 19, 1.6, 0.5, 1.6, NEON[i % 6], { mat: "glow", col: false }); }
  { const g = new THREE.TorusGeometry(19, 0.5, 6, 48); g.rotateX(Math.PI / 2); w.mesh(g, new THREE.Matrix4().makeTranslation(120, 11.5, 120), 0x21d4fd, "glow"); g.dispose(); }
  w.gap("광장 기둥 사이", 120, 5.5, 101, 0, 10, 10, 250); w.gap("광장 기둥 사이", 120, 5.5, 139, 0, 10, 10, 250);

  // 스카이브리지 (도로 x=90 위, 빌딩 A ↔ F)
  w.box(90, 22, 0, 32, 0.5, 5, 0x596273); w.box(90, 25.5, 0, 32, 0.4, 5, 0x596273);
  w.box(90, 22.5, -2.4, 32, 3, 0.2, 0x8fd3ff, { mat: "glass" }); w.box(90, 22.5, 2.4, 32, 3, 0.2, 0x8fd3ff, { mat: "glass" });
  w.box(90, 21.6, 0, 32, 0.25, 5.4, 0x21d4fd, { mat: "glow", col: false });
  w.gap("스카이브리지 아래", 90, 11, 0, 0, 15, 20, 300);
  // 두 번째 브리지 (도로 z=-30 위, 빌딩 C ↔ 첨탑 블록 쪽)
  w.box(-30, 26, -60, 14, 0.5, 4.5, 0x596273, { ry: 0 }); w.box(-30, 29.4, -60, 14, 0.4, 4.5, 0x596273);
  w.box(-30, 25.6, -60, 14, 0.25, 4.9, 0xff2bd6, { mat: "glow", col: false });
  w.gap("브리지 아래", -30, 13, -60, 0, 15, 24, 300); w.gap("브리지 틈새", -30, 28, -60, 0, 13, 2.6, 900);

  // 고가도로 (z = 150)
  w.box(0, 9, 150, 470, 1, 12, 0x474c57, { mat: "std:concrete", tile: 6 });
  w.box(0, 10, 144.2, 470, 0.9, 0.4, 0x6a7080); w.box(0, 10, 155.8, 470, 0.9, 0.4, 0x6a7080);
  for (let x = -180; x <= 180; x += 60) { w.pipe(x, 0, 145.5, x, 9, 145.5, 1.0, 0x5a606c, { mat: "std" }); w.pipe(x, 0, 154.5, x, 9, 154.5, 1.0, 0x5a606c, { mat: "std" }); }
  for (let x = -225; x < 225; x += 12) w.box(x, 10.02, 150, 5, 0.02, 0.2, 0x55501e, { col: false, mat: "glow" });
  for (const x of [-90, 30, 90]) w.gap("고가도로 아래", x, 4.5, 150, 0, 15, 8, 300);

  // 옥상 헬기장 (빌딩 B)
  w.cyl(60, 52.5, -60, 9, 0.3, 0x30343c, { col: false }); w.box(60, 52.82, -60, 6, 0.02, 1, 0xffe14a, { col: false, mat: "glow" });
  w.box(57.5, 52.82, -60, 1, 0.02, 6, 0xffe14a, { col: false, mat: "glow" }); w.box(62.5, 52.82, -60, 1, 0.02, 6, 0xffe14a, { col: false, mat: "glow" });
  // 대형 전광판
  w.box(60, 36.5, 14.4, 20, 8, 0.4, 0x21d4fd, { mat: "glow" }); w.pipe(52, 36.5, 14, 52, 36.5, 14.2, 0.2, 0x333);
  w.box(-73, 40, 0, 0.4, 12, 16, 0xff2bd6, { mat: "glow" });

  // 주차된 차량
  for (let i = 0; i < 26; i++) {
    const k = ((r() * 6) | 0) * 60 - 150, s = (r() - 0.5) * 400, side = r() < 0.5 ? -6.7 : 6.7, c = [0xb33a3a, 0x2f5fa0, 0xd9d9d9, 0x2b2b2b, 0xc9a23a][i % 5];
    if (Math.abs((((s + 240) % 60) + 60) % 60 - 30) < 15) continue;   // 교차로 근처는 비움
    if (i % 2) { w.box(k + side, 0.3, s, 1.8, 1.25, 4.3, c); } else { w.box(s, 0.3, k + side, 4.3, 1.25, 1.8, c); }
  }

  // 달리는 차량(장식)
  const lanes = [loop(-150, 150, -150, -90, 15), loop(-90, 90, -30, 90, 13), loop(-150, -30, -90, 150 - 60, 12), loop(30, 150, -90, 90, 14), loop(-150, 150, 90, 90 + 0.01, 0)];
  lanes.slice(0, 4).forEach((pts, i) => {
    for (let k = 0; k < 2; k++) {
      const mv = new PathMover(pts.map(([x, y, z, v]) => [x + 3.5, y, z + 3.5, v]), { closed: true });
      mv.s = (k * 0.5 + i * 0.13) * mv.length;
      const car = makeCar([0xd13b3b, 0xf2f2f2, 0x2f8cff, 0xffc400, 0x35c46a, 0xb44cff, 0x222831, 0xff7a1a][(i * 2 + k) % 8], k === 1);
      w.scene.add(car);
      w.updaters.push((dt) => { mv.update(dt); car.position.copy(mv.pos); car.quaternion.copy(mv.quat); car.userData.tick(dt, mv.speed); });
    }
  });
}

const G = (t, x, y, z, o = {}) => ({ t, p: [x, y, z], ...o });

export default {
  id: "city",
  name: "네온 시티",
  desc: "밤의 도심. 빌딩 숲 사이 도로와 옥상, 브리지 아래를 누비는 맵",
  size: 230,
  ceiling: 170,
  seed: 37,
  env: {
    night: true, stars: true, sky: { top: 0x060918, horizon: 0x3a2a66, bottom: 0x0d1020 }, sunDir: [-0.35, 0.72, 0.42], sunColor: 0xa8baff, sun: 1.0,
    hemi: 1.05, hemiSky: 0x6a74c0, hemiGround: 0x3a3050, fog: { color: 0x1d1838, near: 90, far: 760 }, glow: 1.9, windowGlow: 1.15,
  },
  spawn: { pos: [30, 0.4, 100], yaw: 0 },
  build,
  tracks: [
    {
      id: "downtown", name: "다운타운 스프린트", level: 1, laps: 3, desc: "도심 블록을 한 바퀴 도는 직선 위주의 도로 코스",
      gates: [
        G("square", 0, 4, 30, { w: 6, h: 4.4 }), G("flag", 60, 0, 30, { w: 8 }), G("square", 90, 5, 0, { w: 7, h: 5 }), G("ring", 90, 5, -60, { r: 2.8 }),
        G("square", 60, 4, -90, { w: 6, h: 4.4 }), G("flag", 0, 0, -90, { w: 8 }), G("square", -30, 5, -60, { w: 7, h: 5 }), G("ring", -30, 5, 0, { r: 2.8 }),
      ],
    },
    {
      id: "highway", name: "네온 하이웨이", level: 2, loop: false, desc: "도시를 가로지르는 구간 주행. 브리지와 고가 아래를 통과",
      start: { pos: [-205, 0.4, 30], yaw: -90 },
      gates: [
        G("hoop", -160, 7, 30), G("hoop", -100, 9, 30), G("hoop", -46, 8, 28), G("hoop", -30, 9, -20, { r: 4.5 }), G("hoop", -30, 13, -60, { r: 4.5 }),
        G("hoop", -22, 9, -88), G("hoop", 40, 8, -90), G("hoop", 82, 9, -84), G("hoop", 90, 11, -30, { r: 4.5 }), G("hoop", 90, 11, 0, { r: 4.5 }),
        G("hoop", 90, 8, 60), G("hoop", 90, 5, 120, { r: 4 }), G("hoop", 90, 4.5, 150, { r: 3.6 }), G("hoop", 84, 8, 200), G("hoop", 40, 10, 211), G("hoop", -20, 12, 211),
      ],
    },
    {
      id: "rooftop", name: "루프탑 런", level: 3, laps: 2, desc: "옥상에서 옥상으로 건너뛰고 빌딩 사이로 다이브하는 고난도 코스",
      gates: [
        G("square", 30, 6, 18, { w: 6, h: 4.4, yaw: 0 }), G("ring", 34, 39, -5, { r: 3 }), G("square", 60, 41, 0, { w: 6, h: 4.4 }), G("square", 60, 58, -60, { w: 6, h: 4.4 }),
        G("ring", 30, 54, -74, { r: 3 }), G("square", 0, 49.5, -60, { w: 6, h: 4.4 }), G("ring", -30, 60, -34, { r: 3 }), G("square", -53, 67, 7, { w: 6, h: 4.4 }),
        G("square", -30, 34, 30, { w: 7, h: 7, pitch: -90, yaw: -90 }), G("square", 2, 5, 30, { w: 6, h: 4.4, yaw: -90 }),
      ],
    },
  ],
  tracking: [
    { id: "sportscar", name: "스포츠카", type: "sportscar", level: 2, desc: "도심 도로를 질주하는 스포츠카 추적", duration: 80, path: loop(-90, 90, -90, 90, 24) },
    {
      id: "runner", name: "공원 러너", type: "runner", level: 1, desc: "공원과 광장을 달리는 러너를 따라가세요", duration: 70,
      lift: 0.18, path: [[-60, 0, 75.5, 4.6], [-75.5, 0, 60, 5], [-60, 0, 44.5, 4.6], [-45, 0, 50, 5], [-31, 0, 33, 5.6], [-18, 0, 12, 5], [-15.5, 0, -4, 4.6], [0, 0, -15.5, 5], [15.5, 0, 0, 5], [4, 0, 15.5, 4.6], [-14, 0, 20, 5], [-34, 0, 40, 5.4], [-44.5, 0, 62, 5]],
    },
    {
      id: "drone", name: "순찰 드론", type: "drone", level: 3, desc: "빌딩 사이를 오르내리는 순찰 드론을 화면에 담으세요", duration: 75,
      path: [[30, 10, 90, 13], [30, 22, 30, 12], [30, 34, -30, 12], [30, 40, -86, 11], [-26, 34, -90, 13], [-30, 16, -60, 11], [-30, 12, -10, 13], [-26, 18, 28, 11], [30, 14, 30, 13], [86, 18, 30, 11], [90, 12, 0, 12], [90, 22, -60, 13], [84, 30, -88, 11], [36, 46, -94, 12]],
    },
  ],
  combat: { blue: [-180, 180], red: [180, -180], depots: [[-90, -90], [90, 90], [30, -30], [-30, 30]] },
  convoy: {
    speed: 7.5,
    path: [[-205, 0, 33], [-120, 0, 33], [-46, 0, 33], [-33, 0, 18], [-33, 0, -40], [-33, 0, -76], [-18, 0, -93], [40, 0, -93], [76, 0, -93], [93, 0, -76], [93, 0, 0], [93, 0, 74], [108, 0, 93], [160, 0, 93], [212, 0, 93]],
  },
};
