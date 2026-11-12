// 맵: 네온 아레나 — 실내 드론 경기장 (200 x 128 x 48 m). 색으로 구분한 구역마다 다른 장애물
//  · 가운데(반경 28m): 코어 존 — 천장까지 비워 둔 결투 공간      · 서쪽: 블루 기지 / 동쪽: 레드 기지(격납고 문·대형 화면)
//  · 북쪽(자홍): S자 네온 터널, 그 위 관중석                      · 남쪽(노랑): 슬라럼 기둥과 리브 터널, 그 위 관중석
//  · 북서(청록): 큐브 정글   · 남서(초록): 메자닌(2단 덱·경사로·낙하 구멍)   · 북동(주황): 헬릭스 나선 계단   · 남동(보라): 행잉 블록
import * as THREE from "../../vendor/three.module.min.js";
import { DEG, MAG, CYA, YEL, GRN, ORG, VIO, RED, WARM, ring, bar, truss, Signs, Geo, icon, neonText, glowMat } from "./city-kit.js";

const HX = 100, HZ = 64, HH = 48, BLU = 0x2f8cff;
const WALL = 0x2a2f45, DARK = 0x1c2033, PANEL = 0x2d3350, STEEL = 0x4a5170;
const dim = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

// 사각 경로(바닥 카트용)
function loop(x0, x1, z0, z1, v, c = 9) {
  const vs = v * 0.55;
  return [
    [x0 + c, 0, z1, vs], [(x0 + x1) / 2, 0, z1, v], [x1 - c, 0, z1, vs], [x1, 0, z1 - c, vs], [x1, 0, 0, v], [x1, 0, z0 + c, vs],
    [x1 - c, 0, z0, vs], [(x0 + x1) / 2, 0, z0, v], [x0 + c, 0, z0, vs], [x0, 0, z0 + c, vs], [x0, 0, 0, v], [x0, 0, z1 - c, vs],
  ];
}

const S = (id, text, icn, fg, frame, kind) => ({ id, text, icon: icn, fg, frame, kind });
const SIGNS = [
  S("blue", ["블루 기지", "BLUE BASE"], "flag", 0x7ab8ff, BLU), S("red", ["레드 기지", "RED BASE"], "flag", 0xff8a94, RED), S("core", ["코어 존", "CORE ZONE"], "star", 0xffffff, CYA),
  S("tunnel", ["S 터널", "S-TUNNEL"], "arrow", MAG, MAG), S("slalom", ["슬라럼", "SLALOM"], "bolt", YEL, YEL), S("cube", ["큐브 정글", "CUBE GRID"], "drone", CYA, CYA),
  S("mezz", ["메자닌", "MEZZANINE"], "arrow", GRN, GRN), S("helix", ["헬릭스", "HELIX"], "wheel", ORG, ORG), S("hang", ["행잉 블록", "HANG BLOCKS"], "warn", VIO, VIO),
  S("tower", ["플랫폼 타워", "TOWER"], "arrow", 0xffffff, YEL),
  S("b0", ["청팀", "BLUE"], "drone", 0x7ab8ff, BLU, "tall"), S("b1", ["홍팀", "RED"], "drone", 0xff8a94, RED, "tall"), S("b2", ["하늘길", "SKY"], "star", YEL, MAG, "tall"), S("b3", ["FPV", "FPV"], "bolt", CYA, CYA, "tall"),
  {
    id: "score", kind: "big", draw(g, W, H, ko) {
      g.fillStyle = "#070a18"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#0e2a5a"; g.fillRect(0, 0, W / 2 - 4, 150); g.fillStyle = "#5a0e1c"; g.fillRect(W / 2 + 4, 0, W / 2 - 4, 150);
      neonText(g, ko ? "청팀" : "BLUE", 128, 40, 40, "#7ab8ff", 220); neonText(g, ko ? "홍팀" : "RED", 384, 40, 40, "#ff8a94", 220);
      neonText(g, "2", 128, 104, 76, "#ffffff", 120); neonText(g, "1", 384, 104, 76, "#ffffff", 120);
      neonText(g, "03:00", W / 2, 198, 62, "#ffe14a", 300);
      for (let i = 0; i < 24; i++) { g.fillStyle = i < 15 ? "#21d4fd" : "#26304a"; g.fillRect(16 + i * 20, 236, 15, 10); }
    },
  },
  {
    id: "vs", kind: "big", draw(g, W, H, ko) {
      const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "#0b2a66"); gr.addColorStop(0.5, "#160a30"); gr.addColorStop(1, "#66101e"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      icon(g, "drone", 84, 104, 120, "#7ab8ff"); icon(g, "drone", W - 84, 104, 120, "#ff8a94");
      neonText(g, ko ? "하늘길 아레나" : "SKYWAY ARENA", W / 2, 84, 46, "#ffffff", 300); neonText(g, "VS", W / 2, 146, 54, "#ffe14a", 120);
      for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#0a0c14"; g.fillRect(i * 20, 212, 20, 14); g.fillStyle = i % 2 ? "#0a0c14" : "#ffffff"; g.fillRect(i * 20, 226, 20, 14); }
    },
  },
];

function build(w) {
  const r = w.rand, K = new Signs(w, SIGNS, 0.9);
  const P = (x, y, z, sx, sy, sz, c = PANEL, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "std:panel", tile: 4, ...o });
  const glow = (x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "glow", col: false, ...o });
  const edge = (x, y, z, sx, sz, c, t = 0.12) => { for (const s of [-1, 1]) { glow(x, y, z + (s * sz) / 2, sx, t, t, c); glow(x + (s * sx) / 2, y, z, t, t, sz, c); } };
  const hang = (x, y, z) => bar(w, x, y, z, x, HH, z, 0.05, 0x555c78, "metal");
  w.ground(0x3a4060, "panel", 6, { vary: 0.06, env: 1.6 });

  // ── 외벽·지붕 (그림자를 드리우지 않는 껍데기) ──
  const SH = { mat: "shell:panel", tile: 8, ao: false };
  for (const s of [-1, 1]) { w.box(0, 0, s * (HZ + 1), HX * 2 + 4, HH, 2, WALL, SH); w.box(s * (HX + 1), 0, 0, 2, HH, HZ * 2, WALL, SH); }
  w.box(0, HH, 0, HX * 2 + 4, 2, HZ * 2 + 4, 0x141726, SH);
  [[5, MAG], [15, CYA], [29, MAG], [41, CYA]].forEach(([y, c]) => {
    for (const s of [-1, 1]) { glow(0, y, s * (HZ - 0.12), HX * 2 - 4, 0.28, 0.2, c); glow(s * (HX - 0.12), y, 0, 0.2, 0.28, HZ * 2 - 4, c); }
  });
  for (let x = -80; x <= 80; x += 40) for (const s of [-1, 1]) {
    w.box(x, 0, s * (HZ - 0.7), 2.4, HH, 1.4, DARK, { mat: "std:panel", tile: 4, ao: false });
    glow(x, 28, s * (HZ - 1.5), 0.3, HH - 30, 0.14, x % 80 ? CYA : MAG);
  }

  // ── 바닥: 구역 색과 선, 구역 이름 ──
  const zone = (x, z, sx, sz, c) => w.box(x, 0, z, sx, 0.06, sz, c, { col: false, ao: false, mat: "paint" });
  zone(-78, 0, 44, 76, 0x14284e); zone(78, 0, 44, 76, 0x4e1420); zone(0, -52, 112, 24, 0x3c1444); zone(0, 52, 112, 24, 0x3e3812);
  zone(-78, -51, 44, 26, 0x0e3a44); zone(-78, 51, 44, 26, 0x123c22); zone(78, -51, 44, 26, 0x4a2a0c); zone(78, 51, 44, 26, 0x2a1a50);
  for (const [R, c] of [[20, CYA], [28, MAG]]) { const g = new THREE.RingGeometry(R - 0.3, R + 0.3, 96); g.rotateX(-Math.PI / 2); w.mesh(g, new THREE.Matrix4().makeTranslation(0, 0.1, 0), c, "glow"); g.dispose(); }
  for (const s of [-1, 1]) {
    glow(0, 0.07, s * 40, 112, 0.03, 0.22, s < 0 ? MAG : YEL); glow(s * 56, 0.07, 0, 0.22, 0.03, 128, s < 0 ? BLU : RED);
    w.box(s * 74, 0.06, 0, 16, 0.03, 16, 0xdadada, { col: false, mat: "std:hazard", tile: 2 });
    w.pool(s * 74, 0.1, 0, 22, s < 0 ? BLU : RED, 0.25);
  }
  w.pool(0, 0.1, 0, 34, CYA, 0.1);
  const deco = (id, x, z, wd, ry = 0) => K.add(id, x, 0.13, z, wd, { pitch: -90, ry });
  deco("core", 0, 23.5, 12); deco("blue", -66, 0, 14, 90); deco("red", 66, 0, 14, -90); deco("tunnel", 0, -43, 12); deco("slalom", 0, 41.5, 12);
  deco("cube", -62, -51, 12, 90); deco("mezz", -44, 58.5, 10); deco("helix", 62, -44, 12, -90); deco("hang", 62, 60, 12);

  // ── 큰 기둥 4개 (바닥~천장) ──
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 40, z = sz * 36, c = sz < 0 ? MAG : YEL;
    w.cyl(x, 0, z, 2.4, HH, 0x3a4060, { mat: "std:panel", tile: 4, ao: false });
    for (const y of [3, 12, 24, 36]) ring(w, x, y, z, 2.62, 0.14, c, { col: false, sides: 5, seg: 24 });
    w.cyl(x, 0, z, 3.4, 0.8, DARK, { mat: "std:hazard", tile: 2 });
    w.pool(x, 0.1, z, 10, c, 0.16);
  }

  // ── 플랫폼 타워 2개 (x = ±40): 층마다 가운데가 뚫려 수직으로도 통과 ──
  for (const s of [-1, 1]) {
    const x = s * 40, c = s > 0 ? ORG : GRN;
    for (const dx of [-6, 6]) for (const dz of [-6, 6]) w.pipe(x + dx, 0, dz, x + dx, 31.5, dz, 0.4, STEEL, { mat: "metal" });
    for (const y of [7, 15, 23, 31]) {
      for (const k of [-1, 1]) { P(x, y, k * 5.15, 13.6, 0.6, 3.3); P(x + k * 5.15, y, 0, 3.3, 0.6, 7); }
      edge(x, y + 0.3, 0, 13.7, 13.7, c, 0.14); edge(x, y + 0.62, 0, 7, 7, YEL, 0.1);
      if (y < 31) { w.gap("플랫폼 타워", x, y + 4.3, 0, 0, 11, 7, 380); w.gap("플랫폼 타워", x, y + 4.3, 0, 90, 11, 7, 380); }
    }
    w.gap("플랫폼 타워", x, 3.5, 0, 0, 11, 6.6, 300); w.gap("플랫폼 타워", x, 3.5, 0, 90, 11, 6.6, 300);
    ring(w, x, 40, 0, 5, 0.26, YEL, { seg: 40 });
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785; hang(x + Math.cos(a) * 5, 40, Math.sin(a) * 5); }
    w.gap("타워 수직 샤프트", x, 19, 0, 0, 6.4, 6.4, 700, -90);
    K.add("tower", x - s * 6.95, 33.4, 0, 6, { ry: -s * 90, back: true });
    w.pool(x, 0.1, 0, 13, c, 0.16);
  }

  // ── 캣워크 (y = 30, z = ±32) ──
  for (const s of [-1, 1]) {
    const z = s * 32;
    for (const x of [-46.5, -15.5, 15.5, 46.5]) P(x, 30, z, 31, 0.3, 2.6, 0x30364f);
    for (const k of [-1.25, 1.25]) { bar(w, -62, 31.3, z + k, 62, 31.3, z + k, 0.06, 0x8088a8, "metal"); glow(0, 30.05, z + k * 1.05, 124, 0.12, 0.08, VIO); }
    for (let x = -60; x <= 60; x += 20) { hang(x, 30.3, z - 1.25); hang(x, 30.3, z + 1.25); }
    w.gap("캣워크 아래 스치기", 0, 27.6, z, 0, 110, 4.4, 280);
  }

  // ── 공중 네온 링과 후프 스택 ──
  for (const [x, z] of [[-20, 30], [20, -30]]) { ring(w, x, 13, z, 5, 0.22, YEL, { axis: "x", seg: 40 }); hang(x, 18, z); w.gap("네온 링", x, 13, z, 90, 8, 8, 420); }
  for (const [x, z, c] of [[-40, 19, GRN], [40, -19, ORG]]) {
    for (const y of [8, 16, 24]) ring(w, x, y, z, 4.5, 0.2, c, { seg: 36 });
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; hang(x + Math.cos(a) * 4.5, 8, z + Math.sin(a) * 4.5); }
    w.gap("후프 스택", x, 16, z, 0, 7, 7, 520, -90);
  }
  ring(w, 0, 45, 0, 28, 0.3, MAG, { seg: 72, cseg: 28 });        // 코어 존을 표시하는 천장 고리

  // ── 북쪽: S자 네온 터널 ──
  const TP = [[-44, -46], [-26, -46], [-10, -54], [10, -54], [26, -46], [44, -46]];
  for (let i = 0; i < 5; i++) {
    const [ax, az] = TP[i], [bx, bz] = TP[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx) / DEG, nx = -dz / L, nz = dx / L, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    for (const k of [-1, 1]) P(mx + nx * k * 4.3, 0, mz + nz * k * 4.3, L + 1.9, 5.6, 0.6, DARK, { ry });
    P(mx, 5.6, mz, L + 1.9, 0.6, 9.2, DARK, { ry });
    const c = i % 2 ? CYA : MAG;
    for (const t of [0.25, 0.75]) {
      const px = ax + dx * t, pz = az + dz * t;
      for (const k of [-1, 1]) glow(px + nx * k * 3.93, 0.3, pz + nz * k * 3.93, 0.3, 5.3, 0.1, c, { ry });
      glow(px, 5.44, pz, 0.3, 0.1, 7.8, c, { ry });
    }
    w.gap("S자 터널", mx, 2.9, mz, Math.atan2(dx, dz) / DEG, 7.4, 5, 420);
  }
  for (const x of [-45.1, 45.1]) { glow(x, 5.7, -46, 0.3, 0.5, 9.4, YEL); for (const k of [-1, 1]) glow(x, 0, -46 + k * 4.7, 0.3, 6.2, 0.3, YEL); }
  K.add("tunnel", -45.3, 8, -46, 7, { ry: -90, back: true }); K.add("tunnel", 45.3, 8, -46, 7, { ry: 90, back: true });

  // ── 남쪽: 슬라럼 기둥과 리브 터널 ──
  for (let i = -2; i <= 2; i++) {
    const x = i * 12, c = i % 2 ? CYA : YEL;
    w.cyl(x, 0, 47, 0.5, 12, 0x3a4060, { mat: "paint" });
    for (const y of [1, 4, 7, 10]) glow(x, y, 47, 1.06, 0.5, 1.06, c);
    w.pool(x, 0.1, 47, 5, c, 0.3);
  }
  for (let i = -2; i <= 2; i++) {
    const x = i * 12, c = i % 2 ? MAG : YEL;
    for (const k of [-1, 1]) w.box(x, 0, 57 + k * 3.7, 0.5, 6.6, 0.5, c, { mat: "glow" });
    w.box(x, 6.2, 57, 0.5, 0.5, 7.9, c, { mat: "glow" });
  }
  w.gap("리브 터널", 0, 3.2, 57, 90, 6.6, 5.8, 380); w.gap("슬라럼", -6, 5, 47, 0, 10, 9, 260); w.gap("슬라럼", 6, 5, 47, 0, 10, 9, 260);

  // ── 관중석(남·북 벽, 터널과 슬라럼 위) ──
  const tones = [0xd9d2c4, 0x7f95c9, 0xc97f8a, 0x86b89a, 0xe0c070, 0x9a86c9, 0x4a5170];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = s * (56.3 + k * 2.2), top = 14 + k * 2.2;
      for (const x of [-45, -15, 15, 45]) P(x, 13.4, z, 30, top - 13.4, 2.2, 0x262b44);
      for (let x = -59; x < 59; x += 1.15) {
        if (r() < 0.2) continue;
        const cz = z + s * 0.3, h = 0.75 + r() * 0.25;
        w.box(x, top, cz, 0.55, h, 0.45, tones[(r() * 7) | 0], { col: false });
        w.box(x, top + h, cz, 0.3, 0.3, 0.3, 0xe2b99a, { col: false, ao: false });
        if (r() < 0.12) glow(x + 0.3, top + h, cz, 0.08, 0.7, 0.08, [CYA, MAG, YEL, GRN][(r() * 4) | 0]);
      }
    }
    glow(0, 13.9, s * 55.1, 120, 0.2, 0.12, s < 0 ? MAG : YEL);
    for (let x = -60; x <= 60; x += 24) w.pipe(x, 0, s * 62.6, x, 13.4, s * 62.6, 0.35, STEEL, { mat: "metal" });
    w.box(0, 28.4, s * (HZ - 0.3), 31, 15.6, 0.4, 0x0a0d1c, { col: false });
    K.add("score", 0, 36.2, s * (HZ - 0.62), 30, { ry: s < 0 ? 0 : 180 });
    for (const [x, id] of [[-52, "b0"], [-26, "b2"], [26, "b3"], [52, "b1"]]) K.add(id, x, 33, s * (HZ - 0.5), 5, { ry: s < 0 ? 0 : 180 });
  }

  // ── 북서: 큐브 정글(층 사이·줄 사이로 통과) ──
  for (const x of [-92, -83, -74]) for (const z of [-56, -47]) {
    w.pipe(x, 0, z, x, 20, z, 0.25, STEEL, { mat: "metal" });
    for (const y of [2, 11, 20]) { P(x, y, z, 4, 4, 4, 0x24405a, { tile: 2 }); edge(x, y + 0.02, z, 4.06, 4.06, CYA, 0.1); edge(x, y + 3.9, z, 4.06, 4.06, CYA, 0.1); }
    w.pool(x, 0.1, z, 6, CYA, 0.22);
  }
  w.gap("큐브 정글", -83, 12, -51.5, 90, 4.6, 22, 380); w.gap("큐브 정글", -87.5, 12, -51.5, 0, 4.6, 22, 380); w.gap("큐브 정글", -78.5, 12, -51.5, 0, 4.6, 22, 380);
  w.gap("큐브 층 사이", -83, 8.5, -56, 90, 3.6, 4.6, 600); w.gap("큐브 층 사이", -83, 17.5, -47, 90, 3.6, 4.6, 600);

  // ── 남서: 메자닌(8m 덱 + 16m 덱, 경사로, 낙하 구멍) ──
  for (const [x, sx] of [[-91.75, 12.5], [-72.25, 12.5]]) P(x, 8, 51, sx, 0.6, 22);
  P(-82, 8, 43.75, 7, 0.6, 7.5); P(-82, 8, 58.25, 7, 0.6, 7.5);
  edge(-82, 8.62, 51, 7, 7, YEL, 0.12); edge(-82, 8.3, 51, 32.1, 22.1, GRN, 0.14);
  P(-93, 16, 53, 10, 0.6, 18); edge(-93, 16.3, 53, 10.1, 18.1, GRN, 0.14);
  for (const x of [-97, -89.5, -74.5, -67]) for (const z of [41, 61]) w.pipe(x, 0, z, x, x < -85 && z > 44 ? 16 : 8, z, 0.35, STEEL, { mat: "metal" });
  w.pipe(-89, 8.6, 45, -89, 16, 45, 0.3, STEEL, { mat: "metal" });
  P(-58, 3.75, 51, 17.9, 0.5, 6, 0x24402e, { rz: -26.57 }); glow(-58, 4.3, 51, 17.9, 0.06, 0.3, GRN, { rz: -26.57 });
  w.box(-93, 16.6, 44.1, 10, 1.1, 0.12, 0x8fd3ff, { mat: "glass" });
  w.pool(-82, 0.1, 51, 14, GRN, 0.2);
  w.gap("메자닌 아래", -82, 4, 51, 90, 20, 7, 300); w.gap("메자닌 구멍 낙하", -82, 8.3, 51, 0, 6.4, 6.4, 650, -90); w.gap("메자닌 층 사이", -93, 12.3, 53, 0, 9, 6.6, 420);

  // ── 북동: 헬릭스(기둥을 감아 오르는 나선 계단) ──
  w.cyl(80, 0, -50, 1.6, 40, 0x4a3a2a, { mat: "std:panel", tile: 3, ao: false });
  let prev = null;
  for (let i = 0; i <= 30; i++) {
    const a = (i * 30) * DEG, y = 2 + i, c = Math.cos(a), s = Math.sin(a);
    P(80 + c * 5.5, y, -50 + s * 5.5, 6.5, 0.5, 3.4, 0x4a3420, { ry: -i * 30, tile: 3 });
    glow(80 + c * 8.8, y + 0.1, -50 + s * 8.8, 0.16, 0.3, 3.4, ORG, { ry: -i * 30 });
    const p = [80 + c * 8.8, y + 0.9, -50 + s * 8.8];
    if (prev) bar(w, prev[0], prev[1], prev[2], p[0], p[1], p[2], 0.06, ORG, "glow", 4);
    prev = p;
  }
  ring(w, 80, 40, -50, 3, 0.2, ORG, { col: false, seg: 24 });
  for (const [x, y] of [[85.5, 8.2], [85.5, 20.2], [74.5, 14.2], [74.5, 26.2]]) w.gap("헬릭스 선회", x, y, -50, 0, 6.5, 10.5, 320);
  w.pool(80, 0.1, -50, 13, ORG, 0.25);

  // ── 남동: 행잉 블록(천장에 매달린 블록 숲, 아래로도 사이로도 통과) ──
  [[66, 43, 4, 12], [75, 43, 3, 9], [84, 43, 4, 17], [93, 43, 3.4, 10], [66, 54, 3, 9], [75, 54, 4, 21], [84, 54, 3.4, 11], [93, 54, 4, 15]].forEach(([x, z, sz, y], i) => {
    P(x, y, z, sz, sz, sz, 0x33285a, { tile: 2 }); edge(x, y + 0.02, z, sz + 0.06, sz + 0.06, VIO, 0.1); edge(x, y + sz - 0.1, z, sz + 0.06, sz + 0.06, i % 2 ? MAG : VIO, 0.1);
    hang(x, y + sz, z); w.pool(x, 0.1, z, 5, VIO, 0.2);
  });
  w.gap("행잉 블록 숲", 79.5, 14, 48.5, 90, 20, 22, 320); w.gap("행잉 블록 숲", 70.5, 14, 48.5, 90, 20, 22, 320); w.gap("행잉 블록 숲", 79.5, 14, 48.5, 0, 30, 22, 320);

  // ── 기지 옆 엄폐 경사대 ──
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P(sx * 62, -1.2, sz * 28, 10, 2.4, 8, 0x333a58, { rz: -sx * 14 });
    glow(sx * 57.2, 2.3, sz * 28, 0.14, 0.12, 8, sx < 0 ? BLU : RED);
  }

  // ── 양 끝 벽: 대형 화면, 격납고 문, 환풍기 ──
  const doors = [], fans = [];
  const fanG = new Geo();
  for (let i = 0; i < 4; i++) fanG.box(0, -0.45, 0, 0.16, 0.9, 3.9, 0x39405a, 0, i * 45, 0);
  const fanGeo = fanG.build(), fanMat = new THREE.MeshLambertMaterial({ vertexColors: true }), doorGeo = new THREE.BoxGeometry(0.36, 11.6, 12), doorMat = new THREE.MeshLambertMaterial({ color: 0x39405a });
  for (const s of [-1, 1]) {
    const c = s < 0 ? BLU : RED;
    w.box(s * (HX - 0.3), 16.6, 0, 0.4, 21.6, 42, 0x0a0d1c, { col: false });
    K.add("vs", s * (HX - 0.62), 27.4, 0, 40, { ry: -s * 90 });
    for (const y of [16.2, 38.2]) w.box(s * (HX - 0.6), y, 0, 1, 0.8, 43, DARK, { col: false });
    glow(s * (HX - 0.2), 0.2, 0, 0.2, 11.8, 23.6, dim(c, 0.5));
    for (const k of [-1, 1]) { w.box(s * (HX - 0.7), 0, k * 12.4, 1.2, 12.6, 0.8, DARK, { col: false }); glow(s * (HX - 1.32), 0.3, k * 12.4, 0.1, 11.8, 0.3, c); }
    w.box(s * (HX - 0.7), 12, 0, 1.2, 0.8, 25.6, DARK, { col: false });
    K.add(s < 0 ? "blue" : "red", s * (HX - 1.34), 13.9, 0, 9, { ry: -s * 90 });
    for (const k of [-1, 1]) {
      const d = new THREE.Mesh(doorGeo, doorMat); d.position.set(s * (HX - 0.72), 6, k * 6); w.scene.add(d); doors.push([d, k]); w.rider(d, [[0, 0, 0, 0.3, 5.8, 6]]);
      ring(w, s * (HX - 0.5), 40.5, k * 40, 4.4, 0.3, c, { axis: "x", col: false, seg: 28 });
      const f = new THREE.Mesh(fanGeo, fanMat); f.position.set(s * (HX - 0.55), 40.5, k * 40); w.scene.add(f); fans.push(f);
    }
  }
  w.disposables.push(fanGeo, doorGeo);

  // ── 천장 트러스와 조명 ──
  for (const x of [-75, -25, 25, 75]) {
    truss(w, x, 44, -HZ + 1, x, 44, HZ - 1, 1.8, STEEL, { mat: "metal", col: false, bay: 6, r: 0.14 });
    [-42, -14, 14, 42].forEach((z, i) => {
      const c = [0xcfd8ff, MAG, CYA, 0xcfd8ff][(i + (x > 0 ? 1 : 0)) % 4];
      w.box(x, 42.5, z, 2.2, 0.5, 2.2, 0x22263a, { col: false }); glow(x, 42.4, z, 1.7, 0.12, 1.7, c);
      w.shaft(x, 42.4, z, 0.6, 9, 42.2, c, 0.012); w.pool(x, 0.1, z, 15, c, 0.2);
    });
  }
  for (const z of [-44, 0, 44]) for (const dx of [-0.9, 0.9]) bar(w, -HX + 1, 45.6, z + dx, HX - 1, 45.6, z + dx, 0.14, STEEL, "metal");
  K.finish();

  // ── 움직이는 것(장식): 격납고 문, 환풍기, 바닥 홀로그램, 탐조등 ──
  const holo = [18, 24].map((R, i) => {
    const g = new THREE.BufferGeometry(), pos = [], idx = [];
    for (let k = 0; k < 6; k++) {   // 끊어진 호 6개
      const a0 = (k / 6) * 6.2832, n = 10, b = pos.length / 3;
      for (let j = 0; j <= n; j++) { const a = a0 + (j / n) * 0.7; pos.push(Math.cos(a) * (R - 0.5), 0, Math.sin(a) * (R - 0.5), Math.cos(a) * (R + 0.5), 0, Math.sin(a) * (R + 0.5)); }
      for (let j = 0; j < n; j++) idx.push(b + j * 2, b + j * 2 + 2, b + j * 2 + 1, b + j * 2 + 1, b + j * 2 + 2, b + j * 2 + 3);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(i ? MAG : CYA).multiplyScalar(1.2), side: THREE.DoubleSide }));
    m.position.y = 0.16 + i * 0.02; m.frustumCulled = false; w.scene.add(m);
    return m;
  });
  const beamG = new THREE.CylinderGeometry(0.5, 6.5, 43, 14, 1, true);
  beamG.translate(0, -21.5, 0);
  { const Pp = beamG.attributes.position, col = new Float32Array(Pp.count * 3); for (let i = 0; i < Pp.count; i++) { const k = 1 + Pp.getY(i) / 43; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k * k; } beamG.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
  const beams = [[-52, -20, CYA], [52, 20, MAG], [-52, 20, YEL], [52, -20, 0xcfd8ff]].map(([x, z, c]) => {
    const m = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.1), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, 43.5, z); m.renderOrder = 6; m.frustumCulled = false; m.rotation.order = "YXZ"; w.scene.add(m);
    return m;
  });
  w.updaters.push((dt, t) => {
    const open = 5.6 * (0.5 - 0.5 * Math.cos(Math.min(1, Math.max(0, Math.sin(t * 0.22) * 1.6 + 0.5)) * Math.PI));
    for (const [d, k] of doors) d.position.z = k * (6 + open);
    for (let i = 0; i < fans.length; i++) fans[i].rotation.x += dt * (2.2 + i * 0.4);
    holo[0].rotation.y = t * 0.3; holo[1].rotation.y = -t * 0.2;
    beams.forEach((m, i) => { m.rotation.y = t * 0.5 + i * 1.6; m.rotation.x = 0.22 + Math.sin(t * 0.4 + i) * 0.12; });
  });
}

const G = (t, x, y, z, o = {}) => ({ t, p: [x, y, z], ...o });

export default {
  id: "arena",
  name: "네온 아레나",
  desc: "실내 드론 경기장. S자 터널·큐브 정글·헬릭스·메자닌·행잉 블록이 색색의 구역을 이루는 근접 비행과 전투의 무대",
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
      id: "oval", name: "네온 오벌", level: 1, laps: 3, desc: "리브 터널을 지나 관중석 앞을 크게 도는 타원 코스",
      gates: [
        G("square", -36, 3.4, 57, { w: 6, h: 4.6, yaw: -90 }), G("ring", 0, 3.2, 57, { r: 2.3, yaw: -90 }), G("square", 36, 3.4, 57, { w: 6, h: 4.6, yaw: -90 }),
        G("ring", 60, 8, 22, { r: 3 }), G("ring", 60, 8, -22, { r: 3 }),
        G("hoop", 38, 9.5, -48, { r: 3.5 }), G("hoop", 0, 9.5, -50, { r: 3.5 }), G("hoop", -38, 9.5, -48, { r: 3.5 }),
        G("ring", -60, 8, -22, { r: 3 }), G("ring", -60, 8, 22, { r: 3 }),
      ],
    },
    {
      id: "tour", name: "서킷 투어", level: 2, laps: 2, desc: "S자 터널, 행잉 블록 아래, 슬라럼, 메자닌 경사로와 낙하 구멍을 잇는 구역 순회 코스",
      gates: [
        G("square", -52, 3.4, -46, { w: 6, h: 4.4, yaw: -90 }), G("ring", -35, 3.2, -46, { r: 2.3, yaw: -90 }), G("ring", -18, 3.2, -50, { r: 2.3, yaw: -63.4 }), G("ring", 0, 3.2, -54, { r: 2.3, yaw: -90 }), G("ring", 18, 3.2, -50, { r: 2.3, yaw: -116.6 }),
        G("ring", 35, 3.2, -46, { r: 2.3, yaw: -90 }), G("square", 54, 3.4, -46, { w: 6, h: 4.4, yaw: -90 }), G("hoop", 84, 10, -30, { r: 3.6 }), G("hoop", 90, 9, 6, { r: 3.6 }), G("hoop", 79.5, 5, 48.5, { r: 3.2 }),
        G("ring", 24, 4, 50.2, { r: 2 }), G("ring", 12, 4, 43.8, { r: 2 }), G("ring", 0, 4, 50.2, { r: 2 }), G("ring", -12, 4, 43.8, { r: 2 }), G("ring", -24, 4, 50.2, { r: 2 }),
        G("hoop", -58, 6.5, 51, { r: 3 }), G("hoop", -70, 11.4, 51, { r: 3 }), G("square", -82, 8.3, 51, { w: 6, h: 6, pitch: -90, yaw: 90 }), G("hoop", -82, 3.6, 34, { r: 3 }),
        G("hoop", -84, 6, 0, { r: 3.4 }),
      ],
    },
    {
      id: "towers", name: "타워 크로스", level: 3, laps: 2, desc: "플랫폼 타워를 층층이 관통하고 헬릭스를 감아 오른 뒤 타워 수직 샤프트로 급강하",
      gates: [
        G("square", -40, 11.3, 0, { w: 10, h: 6.4, yaw: -90 }), G("ring", -4, 15, -8, { r: 3 }), G("square", 40, 19.3, 0, { w: 10, h: 6.4, yaw: -90 }), G("hoop", 64, 15, -34, { r: 3.2 }),
        G("hoop", 74.5, 13.5, -50, { r: 3, yaw: 0 }), G("hoop", 80, 16.5, -55.5, { r: 3, yaw: -90 }), G("hoop", 85.5, 19.5, -50, { r: 3, yaw: 180 }), G("hoop", 80, 22.5, -44.5, { r: 3, yaw: 90 }),
        G("hoop", 30, 27, -29.5, { r: 3 }), G("hoop", -12, 33, -18, { r: 3.2 }), G("square", -40, 42, 0, { w: 6, h: 6, pitch: -90, yaw: 90 }), G("square", -40, 27, 0, { w: 5.6, h: 5.6, pitch: -90, yaw: 90 }),
        G("square", -40, 20.5, 0, { w: 5.6, h: 5.6, pitch: -90, yaw: 90 }), G("hoop", -56, 17.5, 0, { r: 3, yaw: 90 }), G("hoop", -70, 12, 10, { r: 3.4 }),
      ],
    },
  ],
  tracking: [
    { id: "cart", name: "정비 카트", type: "forklift", level: 1, desc: "경기장 바닥을 도는 정비 카트를 따라가세요", duration: 70, path: loop(-50, 50, -24, 24, 7) },
    {
      id: "camera", name: "중계 드론", type: "drone", level: 2, desc: "관중석 앞을 크게 도는 중계 드론을 부드럽게 따라가세요", duration: 70,
      path: [[0, 21, -50, 10], [48, 21, -46, 10], [66, 24, -20, 10], [66, 24, 20, 10], [48, 22, 46, 10], [0, 20, 50, 10], [-48, 22, 46, 10], [-66, 24, 20, 10], [-66, 24, -20, 10], [-48, 21, -46, 10]],
    },
    {
      id: "racer", name: "레이싱 드론", type: "drone", level: 3, desc: "S자 터널과 헬릭스, 타워를 넘나드는 레이싱 드론을 놓치지 마세요", duration: 75,
      path: [[-56, 4, -46, 12], [-35, 3.2, -46, 12], [-18, 3.2, -50, 12], [0, 3.2, -54, 13], [18, 3.2, -50, 12], [35, 3.2, -46, 12], [54, 4, -46, 12], [66, 11, -38, 11], [74.5, 13.5, -50, 10], [80, 16.5, -55.5, 10], [85.5, 19.5, -50, 10], [80, 22.5, -44.5, 10], [64, 23, -22, 12], [57, 20, -1, 11], [40, 19.3, 0, 11], [28, 17.5, 2, 11], [14, 11, 26, 12], [0, 7, 40, 12], [-36, 7, 42, 12], [-62, 9, 30, 11], [-70, 8, 0, 12], [-66, 6, -30, 12]],
    },
  ],
  combat: { blue: [-74, 0], red: [74, 0], startOffset: 22, depots: [[0, -30], [0, 30], [-18, 0], [18, 0]] },
  boss: { pos: [0, 24, 0] },
};
