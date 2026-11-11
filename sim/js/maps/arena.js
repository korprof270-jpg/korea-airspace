// 맵: 네온 아레나 — 실내 드론 경기장 (200 x 128 x 48 m). 터널·플랫폼 타워·조명 트러스
import * as THREE from "../../vendor/three.module.min.js";

const HX = 100, HZ = 64, HH = 48;
const MAG = 0xff2bd6, CYA = 0x21d4fd, YEL = 0xffe14a, GRN = 0x35ff7a, ORG = 0xff7a1a, VIO = 0x9b6bff;

// 사각 경로(바닥 카트용)
function loop(x0, x1, z0, z1, v, c = 9) {
  const vs = v * 0.55;
  return [
    [x0 + c, 0, z1, vs], [(x0 + x1) / 2, 0, z1, v], [x1 - c, 0, z1, vs], [x1, 0, z1 - c, vs], [x1, 0, 0, v], [x1, 0, z0 + c, vs],
    [x1 - c, 0, z0, vs], [(x0 + x1) / 2, 0, z0, v], [x0 + c, 0, z0, vs], [x0, 0, z0 + c, vs], [x0, 0, 0, v], [x0, 0, z1 - c, vs],
  ];
}

function torus(w, x, y, z, R, tube, color, axis = "x", collide = true) {
  const g = new THREE.TorusGeometry(R, tube, 10, 48);
  if (axis === "x") g.rotateY(Math.PI / 2); else if (axis === "y") g.rotateX(Math.PI / 2);
  w.mesh(g, new THREE.Matrix4().makeTranslation(x, y, z), color, "glow");
  g.dispose();
  if (!collide) return;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832;
    const p = (a) => (axis === "x" ? new THREE.Vector3(x, y + Math.sin(a) * R, z + Math.cos(a) * R) : axis === "z" ? new THREE.Vector3(x + Math.cos(a) * R, y + Math.sin(a) * R, z) : new THREE.Vector3(x + Math.cos(a) * R, y, z + Math.sin(a) * R));
    w.col.addCapsule(p(a0), p(a1), tube);
  }
}

function build(w) {
  const WALL = 0x2a2f45, DARK = 0x1c2033;
  w.ground(0x3a4060, "panel", 6, { vary: 0.06, env: 1.6 });

  // ── 외벽·지붕 (그림자를 드리우지 않는 껍데기) ──
  w.box(0, 0, -HZ - 1, HX * 2 + 4, HH, 2, WALL, { mat: "shell:panel", tile: 8, ao: false }); w.box(0, 0, HZ + 1, HX * 2 + 4, HH, 2, WALL, { mat: "shell:panel", tile: 8, ao: false });
  w.box(-HX - 1, 0, 0, 2, HH, HZ * 2, WALL, { mat: "shell:panel", tile: 8, ao: false }); w.box(HX + 1, 0, 0, 2, HH, HZ * 2, WALL, { mat: "shell:panel", tile: 8, ao: false });
  w.box(0, HH, 0, HX * 2 + 4, 2, HZ * 2 + 4, 0x141726, { mat: "shell:panel", tile: 8, ao: false });
  // 벽 LED 띠
  [[5, MAG], [15, CYA], [29, MAG], [41, CYA]].forEach(([y, c]) => {
    for (const s of [-1, 1]) {
      w.box(0, y, s * (HZ - 0.12), HX * 2 - 4, 0.28, 0.2, c, { mat: "glow", col: false });
      w.box(s * (HX - 0.12), y, 0, 0.2, 0.28, HZ * 2 - 4, c, { mat: "glow", col: false });
    }
  });
  // 벽 기둥(세로 조명)
  for (let x = -80; x <= 80; x += 40) for (const s of [-1, 1]) {
    w.box(x, 0, s * (HZ - 0.7), 2.4, HH, 1.4, DARK, { mat: "std:panel", tile: 4, ao: false });
    w.box(x, 1, s * (HZ - 1.5), 0.3, HH - 6, 0.14, x % 80 ? CYA : MAG, { mat: "glow", col: false });
  }
  // 양 끝 대형 전광판
  for (const s of [-1, 1]) {
    w.box(s * (HX - 0.3), 19, 0, 0.4, 16, 44, 0x0a1230, { mat: "glow", col: false });
    for (let i = 0; i < 9; i++) w.box(s * (HX - 0.55), 20 + (i % 3) * 5, -18 + i * 4.5, 0.12, 3.6, 3.2, [MAG, CYA, YEL][i % 3], { mat: "glow", col: false });
    w.box(s * (HX - 0.6), 36, 0, 1, 1.2, 48, DARK, { col: false }); w.box(s * (HX - 0.6), 18, 0, 1, 1.2, 48, DARK, { col: false });
  }

  // ── 바닥 무늬: 중앙 원, 레인 ──
  { const g = new THREE.RingGeometry(19.4, 20, 96); g.rotateX(-Math.PI / 2); w.mesh(g, new THREE.Matrix4().makeTranslation(0, 0.04, 0), CYA, "glow"); g.dispose(); }
  { const g = new THREE.RingGeometry(27.6, 28, 96); g.rotateX(-Math.PI / 2); w.mesh(g, new THREE.Matrix4().makeTranslation(0, 0.04, 0), MAG, "glow"); g.dispose(); }
  for (const s of [-1, 1]) {
    w.box(0, 0.03, s * 44, 150, 0.02, 0.22, MAG, { mat: "glow", col: false }); w.box(0, 0.03, s * 60, 190, 0.02, 0.22, CYA, { mat: "glow", col: false });
    w.box(s * 72, 0.03, 0, 0.22, 0.02, 70, CYA, { mat: "glow", col: false });
    w.box(s * 72, 0.02, 0, 16, 0.03, 16, 0xdadada, { col: false, mat: "std:hazard", tile: 2 });
  }
  w.pool(0, 0, 0, 34, CYA, 0.08);

  // ── 기둥 4개 (바닥~천장) ──
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 40, z = sz * 36;
    w.cyl(x, 0, z, 2.4, HH, 0x3a4060, { mat: "std:panel", tile: 4, ao: false });
    for (const y of [3, 12, 24, 36]) torus(w, x, y, z, 2.62, 0.14, sx * sz > 0 ? MAG : CYA, "y", false);
    w.cyl(x, 0, z, 3.4, 0.8, DARK, { mat: "std:hazard", tile: 2 });
    w.pool(x, 0, z, 10, sx * sz > 0 ? MAG : CYA, 0.16);
  }

  // ── 터널 2개 (z = ±52, x -30..30) ──
  for (const s of [-1, 1]) {
    const z = s * 52;
    w.box(0, 0, z - 3.5, 60, 5.6, 0.6, DARK, { mat: "std:panel", tile: 4 }); w.box(0, 0, z + 3.5, 60, 5.6, 0.6, DARK, { mat: "std:panel", tile: 4 });
    w.box(0, 5.6, z, 60, 0.6, 7.6, DARK, { mat: "std:panel", tile: 4 });
    for (let x = -30; x <= 30; x += 10) {
      const c = (x / 10) % 2 ? CYA : MAG;
      w.box(x, 0.3, z - 3.12, 0.3, 5.3, 0.1, c, { mat: "glow", col: false }); w.box(x, 0.3, z + 3.12, 0.3, 5.3, 0.1, c, { mat: "glow", col: false });
      w.box(x, 5.42, z, 0.3, 0.1, 6.2, c, { mat: "glow", col: false });
    }
    for (const x of [-30.4, 30.4]) { w.box(x, 5.7, z, 0.3, 0.5, 7.8, YEL, { mat: "glow", col: false }); }
    w.gap("네온 터널", 0, 2.9, z, 90, 6.2, 5, 450);
  }

  // ── 플랫폼 타워 2개 (x = ±40, z = 0) ──
  for (const s of [-1, 1]) {
    const x = s * 40, c = s > 0 ? ORG : GRN;
    for (const dx of [-6, 6]) for (const dz of [-6, 6]) w.pipe(x + dx, 0, dz, x + dx, 31.5, dz, 0.4, 0x4a5170, { mat: "metal" });
    for (const y of [7, 15, 23, 31]) {
      w.box(x, y, 0, 13.6, 0.6, 13.6, 0x2d3350, { mat: "std:panel", tile: 4 });
      for (const k of [-1, 1]) { w.box(x, y + 0.05, k * 6.86, 13.8, 0.5, 0.12, c, { mat: "glow", col: false }); w.box(x + k * 6.86, y + 0.05, 0, 0.12, 0.5, 13.8, c, { mat: "glow", col: false }); }
      if (y < 31) { w.gap("플랫폼 타워", x, y + 4.3, 0, 0, 11, 7, 380); w.gap("플랫폼 타워", x, y + 4.3, 0, 90, 11, 7, 380); }
    }
    w.gap("플랫폼 타워", x, 3.5, 0, 0, 11, 6.6, 300); w.gap("플랫폼 타워", x, 3.5, 0, 90, 11, 6.6, 300);
    w.pool(x, 0, 0, 13, c, 0.16);
  }

  // ── 캣워크 (y = 30, z = ±22) ──
  for (const s of [-1, 1]) {
    const z = s * 22;
    w.box(0, 30, z, 124, 0.3, 2.6, 0x30364f, { mat: "std:panel", tile: 4 });
    for (const k of [-1.25, 1.25]) { w.pipe(-62, 31.3, z + k, 62, 31.3, z + k, 0.06, 0x8088a8, { mat: "metal" }); w.box(0, 30.05, z + k * 1.05, 124, 0.12, 0.08, VIO, { mat: "glow", col: false }); }
    for (let x = -60; x <= 60; x += 20) { w.pipe(x, 30.3, z - 1.25, x, HH, z - 1.25, 0.07, 0x555c78, { mat: "metal" }); w.pipe(x, 30.3, z + 1.25, x, HH, z + 1.25, 0.07, 0x555c78, { mat: "metal" }); }
    w.gap("캣워크 아래 스치기", 0, 27.6, z, 0, 110, 4.4, 280);
  }

  // ── 공중 네온 링 ──
  torus(w, -20, 13, 30, 5, 0.22, YEL, "x"); w.gap("네온 링", -20, 13, 30, 90, 8, 8, 420);
  torus(w, 20, 13, -30, 5, 0.22, YEL, "x"); w.gap("네온 링", 20, 13, -30, 90, 8, 8, 420);
  torus(w, 0, 38, 0, 9, 0.3, MAG, "y"); w.gap("천장 링 다이브", 0, 38, 0, 0, 15, 15, 520, -90);
  for (const [x, z] of [[-20, 30], [20, -30]]) { w.pipe(x, 18, z, x, HH, z, 0.06, 0x555c78, { mat: "metal", col: false }); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.785; w.pipe(Math.cos(a) * 9, 38, Math.sin(a) * 9, Math.cos(a) * 9, HH, Math.sin(a) * 9, 0.06, 0x555c78, { mat: "metal", col: false }); }

  // ── 점프대·장애물 블록 ──
  for (const s of [-1, 1]) {
    w.box(0, -0.6, s * 13, 9, 2.4, 7, 0x333a58, { mat: "std:panel", tile: 4, rx: s * 16 });
    w.box(0, 1.5, s * 15.2, 9, 0.12, 0.14, YEL, { mat: "glow", col: false });
    for (const sx of [-1, 1]) {
      const x = sx * 76, z = s * 40;
      w.box(x, 0, z, 6, 6, 6, 0x2d3350, { mat: "std:panel", tile: 3 });
      for (const k of [-1, 1]) { w.box(x, 5.9, z + k * 3.02, 6.1, 0.14, 0.08, sx * s > 0 ? GRN : ORG, { mat: "glow", col: false }); w.box(x + k * 3.02, 5.9, z, 0.08, 0.14, 6.1, sx * s > 0 ? GRN : ORG, { mat: "glow", col: false }); }
      w.box(x - sx * 7, 0, z, 5, 3, 5, 0x333a58, { mat: "std:panel", tile: 3 });
      w.box(x, 12, z, 4, 4, 4, 0x3a4060, { mat: "std:panel", tile: 2 }); w.pipe(x, 16, z, x, HH, z, 0.07, 0x555c78, { mat: "metal", col: false });
      w.gap("블록 사이", x, 9, z, 0, 5.4, 5.6, 500); w.gap("블록 사이", x, 9, z, 90, 5.4, 5.6, 500);
    }
  }

  // ── 천장 트러스와 조명 ──
  for (const x of [-75, -25, 25, 75]) {
    for (const dz of [-0.9, 0.9]) w.pipe(x + dz, 44, -HZ + 1, x + dz, 44, HZ - 1, 0.16, 0x4a5170, { mat: "metal", col: false });
    for (let z = -54; z < 54; z += 6) { w.pipe(x - 0.9, 44, z, x + 0.9, 44, z + 3, 0.07, 0x4a5170, { mat: "metal", col: false }); w.pipe(x + 0.9, 44, z + 3, x - 0.9, 44, z + 6, 0.07, 0x4a5170, { mat: "metal", col: false }); }
    [-42, -14, 14, 42].forEach((z, i) => {
      const c = [0xcfd8ff, MAG, CYA, 0xcfd8ff][(i + (x > 0 ? 1 : 0)) % 4];
      w.box(x, 42.9, z, 2.2, 0.5, 2.2, 0x22263a, { col: false }); w.box(x, 42.8, z, 1.7, 0.12, 1.7, c, { mat: "glow", col: false });
      w.shaft(x, 42.8, z, 0.6, 9, 42.6, c, 0.012); w.pool(x, 0, z, 15, c, 0.2);
    });
  }
  for (const z of [-44, 0, 44]) for (const dx of [-0.9, 0.9]) w.pipe(-HX + 1, 45.4, z + dx, HX - 1, 45.4, z + dx, 0.14, 0x4a5170, { mat: "metal", col: false });
}

const G = (t, x, y, z, o = {}) => ({ t, p: [x, y, z], ...o });

export default {
  id: "arena",
  name: "네온 아레나",
  desc: "실내 드론 경기장. 네온 터널·플랫폼 타워·공중 링이 있는 근접 비행과 전투의 무대",
  size: 104,
  ceiling: 58,
  seed: 71,
  env: {
    night: true, noStars: true, cloud: 0, sky: { top: 0x241a5a, horizon: 0x40308a, bottom: 0x0c0a1c }, sunDir: [0.22, 1, 0.16], sunColor: 0xd0d8ff, sun: 1.5, sunDisc: 0,
    hemi: 1.15, hemiSky: 0x9aa0ff, hemiGround: 0x4a3a80, fog: { color: 0x0c0a1e, near: 80, far: 420 }, envIntensity: 0.8,
    glow: 1.55, bloom: { strength: 0.42, radius: 0.5, threshold: 0.95 }, exposure: 1.2,
  },
  spawn: { pos: [-72, 0.4, 0], yaw: -90 },
  build,
  tracks: [
    {
      id: "oval", name: "네온 오벌", level: 1, laps: 3, desc: "양쪽 네온 터널을 관통하는 타원 코스",
      gates: [
        G("square", -42, 3, 52, { w: 6.4, h: 4.6, yaw: -90 }), G("ring", 0, 2.9, 52, { r: 2.2, yaw: -90 }), G("square", 42, 3, 52, { w: 6.4, h: 4.6, yaw: -90 }),
        G("ring", 84, 8, 22, { r: 3 }), G("ring", 84, 9, -22, { r: 3 }),
        G("square", 42, 3, -52, { w: 6.4, h: 4.6, yaw: 90 }), G("ring", 0, 2.9, -52, { r: 2.2, yaw: 90 }), G("square", -42, 3, -52, { w: 6.4, h: 4.6, yaw: 90 }),
        G("ring", -84, 8, -22, { r: 3 }), G("ring", -84, 9, 22, { r: 3 }),
      ],
    },
    {
      id: "towers", name: "타워 크로스", level: 3, laps: 2, desc: "플랫폼 타워를 층층이 관통하고 천장 링에서 급강하",
      gates: [
        G("square", -66, 4, 14, { w: 6, h: 4.4 }), G("square", -40, 11.3, 0, { w: 10, h: 6.4, yaw: -90 }), G("ring", -4, 15, -8, { r: 3 }), G("square", 40, 19.3, 0, { w: 10, h: 6.4, yaw: -90 }),
        G("ring", 70, 27, 8, { r: 3 }), G("ring", 60, 37, 40, { r: 3 }), G("square", 22, 40, 34, { w: 7, h: 5 }), G("square", 0, 38, 0, { w: 12, h: 12, pitch: -90, yaw: 135 }),
        G("ring", -20, 13, 30, { r: 4, yaw: 90 }), G("ring", -50, 6, 26, { r: 3 }),
      ],
    },
  ],
  tracking: [
    { id: "cart", name: "정비 카트", type: "forklift", level: 1, desc: "경기장 바닥을 도는 정비 카트를 따라가세요", duration: 70, path: loop(-58, 58, -29, 29, 7) },
    {
      id: "racer", name: "레이싱 드론", type: "drone", level: 3, desc: "터널과 타워를 넘나드는 레이싱 드론을 놓치지 마세요", duration: 70,
      path: [[-60, 5, 30, 12], [-20, 13, 30, 13], [20, 8, 4, 12], [40, 11.3, 0, 10], [56, 13, -2, 11], [74, 16, -30, 13], [40, 3, -52, 12], [0, 2.9, -52, 14], [-40, 3, -52, 12], [-80, 12, -26, 12], [-66, 22, 8, 11], [-40, 19.3, 0, 10], [-10, 26, 6, 12], [0, 36, 0, 9], [-12, 23, 16, 11], [-34, 16, 44, 13]],
    },
  ],
  combat: { blue: [-74, 0], red: [74, 0], startOffset: 22, depots: [[0, -30], [0, 30], [-18, 0], [18, 0]] },
  boss: { pos: [0, 24, 0] },
};
