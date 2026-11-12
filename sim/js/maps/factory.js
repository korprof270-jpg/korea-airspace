// 맵 2: 석양의 항만 — 부두·창고·야적장을 중심으로 조선소(서), 정유 단지와 수로·사장교(동), 조차장(남), 방파제와 등대(바다)
import * as THREE from "../../vendor/three.module.min.js";
import { QUAY, CH0, CH1, BRIDGE_Z, TOWER, HULL, TUG_PATH, channel, refinery, conveyor, shipyard, fishMarket, railYard, site, reefers, seaside, stockyard, plume } from "./factory-zones.js";

// 축에 나란한 벽에 구멍(문·창)을 뚫어 만든다. axis: "x"(동서 방향 벽) | "z"(남북 방향 벽)
// holes: [{ at: 벽 시작점부터의 중심 거리, w, y0, y1 }]
function wall(w, axis, x, z, len, h, holes, color, t = 0.5) {
  const hs = [...holes].sort((a, b) => a.at - b.at);
  const seg = (from, to, y0, y1) => {
    if (to - from < 0.05 || y1 - y0 < 0.05) return;
    const c = (from + to) / 2, l = to - from;
    if (axis === "x") w.box(x + c, y0, z, l, y1 - y0, t, color, { mat: "std:corrug", tile: 3 });
    else w.box(x, y0, z + c, t, y1 - y0, l, color, { mat: "std:corrug", tile: 3 });
  };
  let cur = 0;
  for (const o of hs) {
    seg(cur, o.at - o.w / 2, 0, h);
    seg(o.at - o.w / 2, o.at + o.w / 2, 0, o.y0);
    seg(o.at - o.w / 2, o.at + o.w / 2, o.y1, h);
    cur = o.at + o.w / 2;
  }
  seg(cur, len, 0, h);
}


// 부두·화물선·크레인
function harbor(w) {
  const r = w.rand, CONC = 0xa9a9a4;
  for (const [x0, x1] of [[-450, CH0], [CH1, 450]]) {
    w.box((x0 + x1) / 2, -4, QUAY - 0.8, x1 - x0, 4.1, 1.6, CONC, { mat: "std:concrete", tile: 6 });
    w.box((x0 + x1) / 2, 0.02, QUAY + 3, x1 - x0, 0.03, 0.5, 0xe0b52a, { col: false, ao: false });
  }
  for (let x = -190; x <= 190; x += 19) { w.cyl(x, 0, QUAY + 1.2, 0.35, 0.8, 0x2c2f35, { mat: "paint" }); w.cyl(x, 0.7, QUAY + 1.2, 0.5, 0.18, 0x2c2f35, { mat: "paint", col: false }); }
  // 레일
  for (const z of [-112, -124]) w.box(10, 0.02, z, 200, 0.1, 0.18, 0x5a5f68, { col: false, mat: "metal", ao: false });

  // 화물선 (x -70..90, z -164..-140)
  const SX = 10, SZ = -152, L = 164, B = 24;
  w.box(SX, -1.4, SZ, L, 4.4, B, 0x8a2f26, { mat: "paint" });                    // 선체 하부
  w.box(SX, 3, SZ, L, 5.4, B, 0x20262f, { mat: "paint" });                       // 선체 상부
  w.box(SX, 8.4, SZ, L - 2, 0.3, B - 1, 0x6d3a2e, { mat: "std:panel", tile: 4 }); // 갑판
  w.box(SX + L / 2 + 5, -1.4, SZ, 12, 9.6, 15, 0x20262f, { mat: "paint", ry: 45 }); // 선수
  w.box(SX, 8.7, SZ - B / 2 + 0.2, L, 1.1, 0.2, 0xdadada, { mat: "paint" }); w.box(SX, 8.7, SZ + B / 2 - 0.2, L, 1.1, 0.2, 0xdadada, { mat: "paint" });
  // 선교
  const bx = SX - L / 2 + 16;
  w.box(bx, 8.7, SZ, 18, 14, 20, 0xe9e7e0, { mat: "std:facade", tile: 24, ao: false });
  w.box(bx + 1, 22.7, SZ, 12, 3.4, 26, 0xf2f0ea, { mat: "paint" });
  w.box(bx + 7.1, 23.4, SZ, 0.2, 1.6, 24, 0x9fd0ff, { mat: "glass", col: false });
  w.cyl(bx - 5, 22.7, SZ, 2.4, 9, 0xd9772f, { mat: "paint", rt: 2 }); w.cyl(bx - 5, 31.2, SZ, 2.05, 0.9, 0x1a1a1a, { col: false, rt: 2 });
  w.pipe(bx + 2, 26, SZ, bx + 2, 38, SZ, 0.18, 0xdadada); w.sph(bx + 2, 38.4, SZ, 0.35, 0xff3030, { mat: "glow", col: false });
  // 갑판 컨테이너
  const cc = [0xb5452f, 0x2f6fb0, 0x3d8b5a, 0xd9a441, 0x8a8f99, 0x7a3fa0, 0xc96a2b, 0x2a9d8f];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
    const x = SX - L / 2 + 44 + i * 12.8, z = SZ - 8.1 + j * 5.4, st = 1 + ((i * 5 + j * 3) % 4);
    if (i === 4) continue;                                                       // 통과 통로
    for (let k = 0; k < st; k++) w.container(x, 8.7 + k * 2.6, z, 0, cc[(i * 3 + j + k) % cc.length]);
  }
  w.gap("화물선 컨테이너 사이", SX - L / 2 + 44 + 4 * 12.8, 13, SZ, 0, 12, 8, 500);
  w.gap("선교와 굴뚝 사이", bx - 1.5, 28.5, SZ, 90, 3.6, 9, 800);

  // 부두 크레인 2기: 레일(-112, -124)을 딛고 배 위로 붐을 뻗는다
  for (const cx of [-30, 62]) {
    const C = 0x2f6fb0, Hh = 40;
    for (const dx of [-9, 9]) for (const z of [-112, -124]) w.box(cx + dx, 0, z, 1.4, Hh, 1.4, C, { mat: "paint" });
    for (const dx of [-9, 9]) { w.box(cx + dx, 12, -118, 1, 1, 12, C, { mat: "paint" }); w.pipe(cx + dx, 13, -112, cx + dx, Hh, -124, 0.3, C); w.pipe(cx + dx, 13, -124, cx + dx, 26, -112, 0.3, C); }
    for (const z of [-112, -124]) { w.box(cx, 12, z, 18, 1, 1, C, { mat: "paint" }); w.box(cx, Hh - 1, z, 18, 1.2, 1.2, C, { mat: "paint" }); }
    w.box(cx, Hh, -138, 4, 2.4, 96, C, { mat: "paint" });                          // 붐 (z -186..-90)
    w.box(cx, Hh + 2.4, -112, 9, 6, 12, 0xe9e7e0, { mat: "std:panel", tile: 4 });   // 기계실
    w.pipe(cx, Hh + 8.4, -118, cx, Hh + 22, -118, 0.5, C); w.pipe(cx, Hh + 22, -118, cx, Hh + 2.4, -184, 0.14, 0x30343a, { col: false }); w.pipe(cx, Hh + 22, -118, cx, Hh + 2.4, -92, 0.14, 0x30343a, { col: false });
    w.sph(cx, Hh + 22.5, -118, 0.4, 0xff3030, { mat: "glow", col: false });
    w.box(cx, Hh - 3.6, -150, 3, 3, 4, 0xf2f0ea, { mat: "paint" });               // 운전실
    w.pipe(cx - 1, Hh - 3.6, -160, cx - 1, 26, -160, 0.06, 0x22262c, { col: false }); w.pipe(cx + 1, Hh - 3.6, -160, cx + 1, 26, -160, 0.06, 0x22262c, { col: false });
    w.container(cx, 23.4, -160, 0, cc[(cx + 40) % 5]);
    w.box(cx, 0.02, -118, 20, 0.03, 14, 0xdadada, { col: false, mat: "std:hazard", tile: 5, ao: false });
    w.gap("크레인 다리 사이", cx, 6, -118, 90, 10.6, 11, 350); w.gap("크레인 다리 사이", cx, 6, -118, 0, 16.6, 11, 300);
    w.gap("크레인 붐 아래", cx, 31, -140, 90, 18, 14, 380);
  }
  // 먼 바다의 섬 (방파제와 등대는 factory-zones.js)
  for (const [x, z, s] of [[-520, -620, 90], [300, -760, 130], [640, -560, 100], [0, -900, 160]]) for (let i = 0; i < 5; i++) w.blob(x + (r() - 0.5) * s * 1.8, -4, z + (r() - 0.5) * s, s * (0.5 + r() * 0.6), s * (0.16 + r() * 0.14), s * (0.5 + r() * 0.5), 0x4a5560, { col: false, grad: [0.7, 1.05] });
}

// 빈 공간을 채우는 부속 시설: 사일로, 사무동, 가로등, 식생, 원경
function extras(w) {
  const r = w.rand;
  // 사일로 단지 (남동쪽)
  for (let i = 0; i < 4; i++) {
    const x = 150 + (i % 2) * 13, z = 150 + Math.floor(i / 2) * 13;
    w.cyl(x, 0, z, 5.6, 30, 0xcfd3d8, { mat: "std:corrug", tile: 2 }); w.cone(x, 30, z, 5.8, 3.4, 0xa9afb8, { mat: "metal", col: false, grad: [0.8, 1.05] });
  }
  w.box(156.5, 33.6, 156.5, 22, 1.4, 3, 0x8a8f99, { mat: "paint" }); w.box(138, 16, 156.5, 32, 1.2, 2.2, 0xd9a441, { mat: "paint", rz: 48 });
  w.box(120, 0, 156.5, 8, 5, 8, 0x6d7683, { mat: "std:corrug", tile: 2 });
  // 사무동과 주차장 (남서쪽)
  w.building(-150, 150, 34, 16, 13, 0xb9b3a8);
  w.box(-150, 0.02, 128, 44, 0.03, 16, 0x50545c, { col: false, mat: "std:asphalt", tile: 6, ao: false });
  for (let i = 0; i < 9; i++) { w.box(-168 + i * 4.6, 0.04, 128, 0.14, 0.02, 5, 0xe8e8e8, { col: false, ao: false }); if (i % 3 !== 1) w.box(-165.7 + i * 4.6, 0.3, 128, 1.9, 1.3, 4.3, [0xb33a3a, 0x2f5fa0, 0xd9d9d9, 0x2b2b2b][i % 4], { mat: "paint" }); }
  // 정비동 (서쪽)
  w.box(-160, 0, 0, 22, 8, 30, 0x8b6f5a, { mat: "std:brick", tile: 3 }); w.box(-160, 8, 0, 23, 0.5, 31, 0x4a4f58, { mat: "std:corrug", tile: 2 });
  for (const z of [-9, 0, 9]) w.box(-148.8, 0, z, 0.3, 5, 6.4, 0x3d6b8c, { mat: "std:corrug", tile: 2, col: false });
  // 야적장 북쪽 컨테이너 열 (부두 쪽)
  const cc = [0xb5452f, 0x2f6fb0, 0x3d8b5a, 0xd9a441, 0x8a8f99, 0xc96a2b];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const st = 1 + ((i + j * 2) % 3); for (let k = 0; k < st; k++) w.container(-170 + i * 13, k * 2.6, -100 + j * 6, 0, cc[(i + j + k) % 6]); }
  for (let i = 0; i < 4; i++) for (let k = 0; k < 2 + (i % 2); k++) w.container(150 + (i % 2) * 3, k * 2.6, -100 + i * 6, 90, cc[(i + k * 2) % 6]);
  // 가로등 (석양 무렵 켜짐)
  for (let x = -180; x <= 180; x += 40) { w.lamp(x, -106, 10, 0xffd9a0, 0, 2); w.lamp(x, 192, 9, 0xffd9a0, 180, 2); }
  for (const [x, z, ry] of [[-110, -4, 90], [-20, 30, 90], [0, 100, -90], [22, -20, 90], [150, 40, -90], [-100, 110, 90], [60, 130, 180], [-20, -92, 0], [120, -96, 0]]) w.lamp(x, z, 9, 0xffd9a0, ry, 2);
  // 팔레트·드럼통·타이어 더미
  for (let i = 0; i < 46; i++) {
    const x = (r() * 2 - 1) * 185, z = -100 + r() * 280;
    if (w.col.blocked(new THREE.Vector3(x, 1.2, z), 4) || (Math.abs(x) < 26 && Math.abs(z - 130) < 26)) continue;
    if (Math.hypot(x + 70, z - 130) < 34 || Math.hypot(x - 150, z + 30) < 34 || Math.hypot(x - 164, z + 74) < 12) continue;   // 기지 터는 비움
    const t = r();
    if (t < 0.35) for (let k = 0; k < 1 + ((r() * 4) | 0); k++) w.box(x, k * 0.16, z, 1.2, 0.14, 1.0, 0xb08a52, { mat: "std:wood", tile: 2, ry: r() * 30 });
    else if (t < 0.7) for (let k = 0; k < 3; k++) w.cyl(x + (k % 2) * 0.95, 0, z + (k > 1 ? 0.9 : 0), 0.44, 1.15, [0x2f6fb0, 0xc94a3a, 0xd9c23a, 0x3d8b5a][(i + k) % 4], { mat: "paint" });
    else w.box(x, 0, z, 1.4 + r(), 1 + r() * 1.4, 1.4 + r(), 0x9b6b3d, { mat: "std:wood", tile: 2, ry: r() * 90 });
  }
  // 담장 안쪽 나무와 잡초
  for (let i = 0; i < 70; i++) {
    const side = (r() * 3) | 0, t = (r() * 2 - 1) * 196;
    const x = side === 0 ? -296 + r() * 4 : side === 1 ? 297 + r() * 3 : t, z = side === 2 ? 202 - r() * 4 : side === 0 ? Math.abs(t) + 2 : Math.max(-80, t);
    if (side === 1 && Math.abs(z - TOWER[1]) < 26) continue;
    w.tree(x, z, 0.9 + r() * 0.6, r() < 0.3 ? "bush" : "round");
  }
  // 원경: 이웃 공장 실루엣
  for (let i = 0; i < 26; i++) {
    const a = 0.35 + (i / 26) * 2.45, d = 440 + r() * 240, x = Math.cos(a) * d * (i % 2 ? 1 : -1), z = Math.abs(Math.sin(a)) * d * 0.9 + 60;
    const h = 14 + r() * 36;
    if (r() < 0.3) { w.cyl(x, 0, z, 4 + r() * 3, h * 2, 0x6a6470, { rt: 3, col: false }); w.sph(x, h * 2 + 1, z, 0.9, 0xff3030, { mat: "glow", col: false }); }
    else w.box(x, 0, z, 30 + r() * 50, h, 24 + r() * 40, [0x5a5f6c, 0x6b6470, 0x4f5562][i % 3], { col: false, mat: "std:corrug", tile: 3, ry: r() * 30 });
  }
}

function build(w) {
  const r = w.rand;
  // 부두(z < -128) 북쪽은 바다, 동쪽에는 정유 단지 섬을 가르는 수로(x 198..230)
  w.col.setTerrain((x, z) => (z < QUAY || (x > CH0 && x < CH1) ? -3.2 : 0));
  w.ground(0x858a92, "wetasphalt", 10, { bounds: [-900, CH0, QUAY, 900], env: 1.25 });
  w.ground(0x8d8a86, "wetasphalt", 10, { bounds: [CH1, 900, QUAY, 900], env: 1.25 });
  w.water(-1.2, 0x1c4658);
  harbor(w);
  channel(w); refinery(w); conveyor(w); shipyard(w); fishMarket(w); railYard(w); site(w); reefers(w); stockyard(w); seaside(w);
  extras(w);
  // 바닥 표시선
  for (let i = -3; i <= 3; i++) w.box(i * 60, 0.02, 38, 0.3, 0.02, 330, 0xc9a93a, { col: false, ao: false });
  for (const z of [-96, 12, 122]) w.box(0, 0.02, z, 400, 0.02, 0.3, 0xc9a93a, { col: false, ao: false });
  w.box(0, 0.03, 130, 14, 0.03, 10, 0xd8d8d8, { col: false, mat: "std:checker", tile: 2 });

  // ── 대형 창고 (x -95..-25, z -60..-20, 높이 14) ──
  const C = 0x7f8b99;
  wall(w, "x", -95, -20, 70, 14, [{ at: 15, w: 9, y0: 0, y1: 6.5 }, { at: 55, w: 9, y0: 0, y1: 6.5 }, { at: 35, w: 6, y0: 8, y1: 11.5 }], C);
  wall(w, "x", -95, -60, 70, 14, [{ at: 35, w: 11, y0: 0, y1: 7.5 }, { at: 12, w: 5, y0: 7.5, y1: 10.5 }, { at: 58, w: 5, y0: 7.5, y1: 10.5 }], C);
  wall(w, "z", -25, -60, 40, 14, [{ at: 20, w: 13, y0: 0, y1: 8.5 }], C);
  wall(w, "z", -95, -60, 40, 14, [{ at: 20, w: 6, y0: 6, y1: 10 }], C);
  // 지붕: 채광창 두 곳이 뚫려 있다
  w.box(-85, 14, -40, 20, 0.5, 41, 0x566170, { mat: "std:corrug", tile: 3 });
  w.box(-60, 14, -40, 16, 0.5, 41, 0x566170, { mat: "std:corrug", tile: 3 });
  w.box(-35, 14, -40, 20, 0.5, 41, 0x566170, { mat: "std:corrug", tile: 3 });
  for (const x of [-72, -48]) { w.box(x, 14, -54, 8, 0.5, 13, 0x566170); w.box(x, 14, -26, 8, 0.5, 13, 0x566170); }
  w.box(-60, 0.02, -40, 69, 0.03, 39, 0x9a9da2, { col: false, mat: "std:concrete", tile: 5 });
  for (const x of [-56, -36]) for (const z of [-50, -30]) w.box(x, 0, z, 0.7, 14, 0.7, 0xc9a23a, { mat: "paint" });
  for (let i = 0; i < 7; i++) w.box(-91 + r() * 4, 0, -57 + i * 5.2, 2.2, 1.6 + r() * 1.6, 2.2, 0x9b6b3d);
  w.box(-34, 0, -52, 9, 4, 5, 0x4d5a6b);                       // 사무실 박스
  w.gap("창고 남문", -80, 3.2, -20, 0, 8.6, 6.2, 300); w.gap("창고 남문", -40, 3.2, -20, 0, 8.6, 6.2, 300);
  w.gap("창고 북문", -60, 3.7, -60, 0, 10.6, 7.2, 300);
  w.gap("창고 동쪽 개구부", -25, 4.2, -40, 90, 12.6, 8.2, 300);
  w.gap("창고 고창", -60, 9.7, -20, 0, 5.6, 3.2, 600); w.gap("창고 고창", -83, 9, -60, 0, 4.6, 2.7, 650); w.gap("창고 고창", -37, 9, -60, 0, 4.6, 2.7, 650);
  w.gap("서쪽 창", -95, 8, -40, 90, 5.6, 3.7, 600);
  w.gap("채광창 다이브", -72, 14.2, -40, 0, 7.6, 14.6, 700, -90); w.gap("채광창 다이브", -48, 14.2, -40, 0, 7.6, 14.6, 700, -90);

  // ── 컨테이너 야적장 (x 30..130, z 20..110) ──
  const cols = [0xb5452f, 0x2f6fb0, 0x3d8b5a, 0xd9a441, 0x8a8f99, 0x7a3fa0, 0xc96a2b];
  for (let row = 0; row < 5; row++) {
    const z = 26 + row * 19;
    for (let i = 0; i < 6; i++) {
      const x = 42 + i * 15.5;
      if ((row === 2 && (i === 2 || i === 3)) || (row === 4 && i === 0)) continue; // 통로
      const stack = 1 + ((row * 7 + i * 3) % 3);
      for (let k = 0; k < stack; k++) w.container(x, k * 2.6, z + (k % 2 ? 0.3 : 0), 0, cols[(row * 3 + i + k * 2) % cols.length]);
    }
  }
  // 컨테이너 터널: 양쪽 컨테이너 위에 다리처럼 얹힘
  w.container(73, 0, 64, 90, 0xb5452f); w.container(88.5, 0, 64, 90, 0x2f6fb0);
  w.container(80.7, 2.6, 64, 0, 0xd9a441, 18);
  w.gap("컨테이너 터널", 80.7, 1.4, 64, 0, 12, 2.5, 500);
  // 갠트리 크레인
  for (const x of [24, 136]) for (const z of [52, 78]) w.pipe(x, 0, z, x, 24, z, 0.6, 0xe0a52a);
  w.box(80, 24, 52, 116, 1.6, 1.6, 0xe0a52a); w.box(80, 24, 78, 116, 1.6, 1.6, 0xe0a52a);
  w.box(96, 22, 65, 6, 3, 27, 0x3a4250); w.pipe(96, 22, 65, 96, 13, 65, 0.12, 0x22262c);
  w.box(96, 10.4, 65, 12.2, 2.6, 2.44, 0x3d8b5a, { mat: "std:corrug", tile: 2.6 });
  w.gap("크레인 화물 아래", 96, 6.6, 65, 0, 11, 7, 350);

  // ── 저장 탱크와 파이프 랙 ──
  for (const [x, c] of [[58, 0xd9dde2], [84, 0xc9ced6], [110, 0xd9dde2]]) {
    w.cyl(x, 0, -70, 9.5, 16, c, { mat: "metal" });
    w.cone(x, 16, -70, 9.5, 2.2, 0xaab1ba, { col: false, mat: "std" });
    w.box(x, 15.6, -60.3, 1.2, 0.2, 1.6, 0xe0a52a, { col: false });
  }
  for (let x = 36; x <= 132; x += 16) {
    w.pipe(x, 0, -46, x, 8, -46, 0.22, 0x6b727c); w.pipe(x, 0, -40, x, 8, -40, 0.22, 0x6b727c);
    w.box(x, 7.4, -43, 0.4, 0.4, 6.6, 0x6b727c);
  }
  for (const [dz, c, rad] of [[-45, 0xc94a3a, 0.45], [-43.2, 0x3d7fc9, 0.35], [-41.2, 0xd9c23a, 0.4]]) w.pipe(34, 8.3, dz, 134, 8.3, dz, rad, c);
  w.gap("파이프 랙 아래", 68, 3.6, -43, 90, 5.4, 6.6, 350); w.gap("파이프 랙 아래", 100, 3.6, -43, 90, 5.4, 6.6, 350);
  w.gap("탱크 사이", 71, 8, -70, 90, 6, 15, 300); w.gap("탱크 사이", 97, 8, -70, 90, 6, 15, 300);

  // ── 굴뚝 ──
  for (const [x, z, h] of [[-130, 70, 58], [-150, 92, 48]]) {
    w.cyl(x, 0, z, 3.4, h, 0xb9b3a8, { rt: 2.2 });
    w.cyl(x, h - 9, z, 2.5, 3, 0xc94a3a, { rt: 2.35, col: false }); w.cyl(x, h - 3, z, 2.3, 3, 0xc94a3a, { rt: 2.2, col: false });
    w.sph(x, h + 0.6, z, 0.5, 0xff3030, { mat: "glow", col: false });
    plume(w, x, h + 2, z, 4.5, 34, 2, 0xfff0e2, 0.5);
  }
  w.box(-140, 0, 58, 26, 9, 14, 0x6d7683, { mat: "std:corrug", tile: 3 });

  // ── 철골 타워 (20 x 20, 4층) ──
  const TX = -40, TZ = 70, S = 10;
  for (const sx of [-S, S]) for (const sz of [-S, S]) w.pipe(TX + sx, 0, TZ + sz, TX + sx, 34, TZ + sz, 0.45, 0x8c3b2e);
  for (let lv = 1; lv <= 4; lv++) {
    const y = lv * 8.5;
    for (const s of [-S, S]) {
      w.pipe(TX - S, y, TZ + s, TX + S, y, TZ + s, 0.3, 0x8c3b2e);
      w.pipe(TX + s, y, TZ - S, TX + s, y, TZ + S, 0.3, 0x8c3b2e);
    }
    if (lv < 4) { w.gap(`철골 타워 ${lv}층`, TX, y + 4.2, TZ, 0, 18, 7, 320); w.gap(`철골 타워 ${lv}층`, TX, y + 4.2, TZ, 90, 18, 7, 320); }
  }
  w.pipe(TX - S, 0, TZ - S, TX + S, 8.5, TZ - S, 0.2, 0x8c3b2e); w.pipe(TX + S, 0, TZ + S, TX - S, 8.5, TZ + S, 0.2, 0x8c3b2e);
  w.box(TX, 34, TZ, 9, 0.4, 9, 0x4a525c);
  w.gap("철골 타워 1층", TX, 4.2, TZ, 90, 18, 7.6, 250);

  // ── 화물 열차·트럭·잡동사니 ──
  for (const [x, z, ry] of [[-104, -6, 0], [-128, 22, 0], [10, -30, 90], [-24, 172, 90]]) { w.box(x, 0.5, z, 2.5, 2.8, 7, 0x3d6b4f, { ry }); w.box(x, 0.5, z - (ry ? 0 : 5), 2.4, 2.2, 2.4, 0xdadada, { ry }); }
  for (let i = 0; i < 26; i++) {
    const x = (r() * 2 - 1) * 190, z = (r() * 2 - 1) * 190;
    if (w.col.blocked(new THREE.Vector3(x, 1.5, z), 5) || (Math.abs(x) < 30 && Math.abs(z - 130) < 30)) continue;
    if (r() < 0.5) w.cyl(x, 0, z, 0.45, 1.1, [0x2f6fb0, 0xc94a3a, 0xd9c23a][i % 3]);
    else w.box(x, 0, z, 1.2, 1.0 + r(), 1.2, 0x9b6b3d, { ry: r() * 90 });
  }
  // 조명탑과 외곽 담장
  for (const [x, z] of [[-10, -90], [150, -10], [150, 120], [-110, 140], [0, 20]]) {
    w.pipe(x, 0, z, x, 24, z, 0.3, 0x59606a);
    w.box(x, 24, z, 4, 0.5, 1.6, 0x3a3f47, { col: false });
    for (const dx of [-1.3, 0, 1.3]) w.box(x + dx, 23.8, z, 0.9, 0.2, 1.2, 0xfff0c8, { mat: "glow", col: false });
    w.pool(x, 0, z, 26, 0xffe2b0, 0.42); w.shaft(x, 23.8, z, 0.5, 9, 23.6, 0xffe2b0, 0.014);
  }
}

const G = (t, x, y, z, o = {}) => ({ t, p: [x, y, z], ...o });

export default {
  id: "factory",
  name: "석양의 항만",
  desc: "화물선과 부두 크레인, 창고·야적장을 중심으로 조선소의 선체 늑골과 골리앗 크레인, 사장교 너머 정유 단지의 냉각탑, 조차장과 등대까지. 통과할 틈이 많은 프리스타일 명소",
  size: 260,
  seed: 23,
  env: {
    sky: { top: 0x27407e, horizon: 0xff9a58, bottom: 0x5c4a52 }, sunDir: [-0.62, 0.17, -0.77], sunColor: 0xffae6a, sun: 3.5,
    hemi: 0.5, hemiSky: 0x8fa8e8, hemiGround: 0x5a4038, cloud: 0.6, cloudLit: 0xffc296, cloudDark: 0x63547c, horizonGlow: 0x5a2410,
    fog: { color: 0xdfa786, near: 200, far: 1500 }, lamps: true, exposure: 1.05,
  },
  spawn: { pos: [0, 0.3, 130], yaw: 0 },
  build,
  tracks: [
    {
      id: "yard", name: "야적장 서킷", level: 1, laps: 3, desc: "컨테이너 사이 통로와 크레인 아래를 도는 코스",
      gates: [
        G("square", 20, 3, 116, { w: 5, h: 4 }), G("flag", 80, 0, 119, { w: 7 }), G("square", 140, 3.5, 100, { w: 5, h: 4 }),
        G("square", 141, 4, 40, { w: 5, h: 4 }), G("ring", 111, 9, 12, { r: 2.6 }), G("ring", 82, 11.5, 36, { r: 2.8 }),
        G("square", 80.7, 1.5, 64, { w: 8, h: 2.3, yaw: 180 }), G("ring", 46, 7, 92, { r: 2.6 }),
      ],
    },
    {
      id: "warehouse", name: "창고 관통", level: 2, laps: 2, desc: "창고 문과 개구부를 지나 탱크·파이프 랙을 도는 기술 코스",
      gates: [
        G("square", -60, 3.5, 20, { w: 5, h: 4 }), G("square", -80, 3.2, -20, { w: 8, h: 5.6, yaw: 0 }), G("square", -60, 3.7, -60, { w: 10, h: 6.6, yaw: 0 }),
        G("ring", -20, 6, -84, { r: 2.6 }), G("square", 30, 4.5, -94, { w: 5, h: 4 }), G("ring", 70, 6, -98, { r: 2.6 }), G("square", 71, 7, -70, { w: 5, h: 6, yaw: 180 }),
        G("square", 76, 3.6, -43, { w: 9, h: 5.6, yaw: 180 }), G("ring", 40, 5, -20, { r: 2.4 }), G("square", -25, 4.2, -40, { w: 11, h: 7, yaw: 90 }),
        G("square", -80, 3.2, -20, { w: 8, h: 5.6, yaw: 180 }), G("flag", -84, 0, 14, { w: 7 }),
      ],
    },
    {
      id: "tower", name: "철골 타워", level: 3, laps: 2, desc: "철골 타워를 층층이 오른 뒤 창고 채광창으로 다이브",
      gates: [
        G("square", 4, 3.6, 71, { w: 5, h: 4, yaw: 90 }), G("square", -40, 4.2, 70, { w: 16, h: 6.6, yaw: 90 }), G("ring", -72, 9, 70, { r: 2.6 }),
        G("square", -40, 12.7, 70, { w: 16, h: 6.6, yaw: -90 }), G("ring", -8, 18, 70, { r: 2.6 }), G("square", -40, 21.2, 70, { w: 16, h: 6.6, yaw: 90 }),
        G("ring", -76, 25, 64, { r: 3 }), G("ring", -86, 24, 6, { r: 3 }), G("square", -71.5, 15, -40, { w: 6.4, h: 13, pitch: -90, yaw: 0 }), G("square", -80, 3.2, -20, { w: 8, h: 5.6, yaw: 180 }),
        G("ring", -52, 5, 8, { r: 2.6 }), G("ring", 2, 6, 34, { r: 2.6 }), G("flag", 16, 0, 54, { w: 7 }),
      ],
    },
    {
      id: "dock", name: "조선소 스프린트", level: 2, laps: 2, desc: "선체 늑골 터널을 꿰뚫고 바다로 나갔다가 어시장 부두를 돌아오는 코스",
      gates: [
        G("square", -190, 4, 44, { w: 5.4, h: 4 }), G("ring", -212, 9, -6, { r: 3 }), G("square", HULL[0], 6.8, HULL[2] - 4, { w: 8, h: 8, yaw: 0 }), G("square", HULL[0], 7, -86, { w: 12, h: 8.6, yaw: 0 }),
        G("ring", HULL[0], 7, HULL[1] - 2, { r: 3, yaw: 0 }), G("ring", -226, 8, -152, { r: 3.4 }), G("ring", -170, 7, -147, { r: 3.2 }), G("square", -108, 6, -131, { w: 6, h: 4.6 }),
        G("ring", -92, 7, -100, { r: 3 }), G("square", -118, 4.4, -6, { w: 6, h: 4.4 }), G("flag", -160, 0, 28, { w: 8 }),
      ],
    },
    {
      id: "refinery", name: "정유 단지", level: 3, laps: 1, desc: "사장교 주탑 사이를 지나 냉각탑 속으로 다이브, 구형 탱크와 증류탑을 누비고 수로를 따라 돌아오는 고난도 코스",
      gates: [
        G("ring", 176, 10.4, BRIDGE_Z, { r: 3 }), G("square", CH0 - 5, 19, BRIDGE_Z, { w: 6.2, h: 9, yaw: -90 }), G("square", CH1 + 5, 19, BRIDGE_Z, { w: 6.2, h: 9, yaw: -90 }), G("ring", 251, 18, BRIDGE_Z, { r: 3, yaw: -90 }), G("ring", 262, 60, 122, { r: 4 }),
        G("square", TOWER[0], 54, TOWER[1], { w: 14, h: 14, pitch: -90, yaw: 0 }), G("ring", TOWER[0] - 2, 13, TOWER[1], { r: 4, pitch: -90, yaw: 0 }), G("square", TOWER[0] - 21, 3, TOWER[1], { w: 5, h: 4.2, yaw: 90 }),
        G("ring", 266, 9, BRIDGE_Z, { r: 3 }), G("square", 264, 10.5, 50, { w: 6, h: 10, yaw: 0 }), G("square", 264, 10.5, 24, { w: 6, h: 10, yaw: 0 }), G("ring", 274, 16, -56, { r: 3.4 }),
        G("ring", 270, 12, -98, { r: 3.4 }), G("ring", 246, 7, -148, { r: 3.6 }), G("ring", 214, 5, -110, { r: 3.4 }), G("square", 214, 5.6, -60, { w: 16, h: 7, yaw: 180 }),
        G("square", 214, 4.4, BRIDGE_Z, { w: 18, h: 5.6, yaw: 180 }), G("ring", 196, 9, 128, { r: 3.4 }), G("ring", 160, 8, 114, { r: 3 }),
      ],
    },
  ],
  tracking: [
    {
      id: "forklift", name: "지게차", type: "forklift", level: 1, desc: "창고와 야적장을 오가는 지게차를 따라가세요", duration: 80,
      path: [[0, 0, 118, 5], [20, 0, 20, 6], [-12, 0, -12, 5], [-40, 0, -8, 4], [-40, 0, -32, 3.5], [-60, 0, -40, 4], [-80, 0, -32, 3.5], [-80, 0, -8, 4.5], [-100, 0, 20, 6], [-60, 0, 110, 6]],
    },
    {
      id: "truck", name: "화물 트럭", type: "truck", level: 2, desc: "단지 외곽 도로를 도는 트럭 추적", duration: 85,
      path: [[-166, 0, 180, 11], [-60, 0, 186, 14], [40, 0, 187, 13], [110, 0, 187, 11], [131, 0, 170, 8], [134, 0, 140, 9], [143, 0, 100, 12], [143, 0, 20, 13], [140, 0, -50, 11], [128, 0, -100, 9], [62, 0, -118, 12], [-30, 0, -118, 12], [-88, 0, -116, 9], [-92, 0, -84, 8], [-184, 0, -84, 11], [-190, 0, 40, 13]],
    },
    {
      id: "patrol", name: "정유 단지 순찰", type: "runner", level: 1, desc: "구형 탱크 둘레를 도는 순찰 요원을 가까이에서 따라가세요", duration: 70, color: 0xffd400,
      path: [[236, 0, 8, 4.4], [264, 0, 6, 4.8], [290, 0, 8, 4.4], [291.5, 0, 37, 4.8], [290, 0, 66, 4.4], [264, 0, 68, 4.8], [236, 0, 66, 4.4], [234, 0, 37, 4.8]],
    },
    { id: "tug", name: "만 안의 어선", type: "boat", level: 2, desc: "방파제 안쪽을 도는 어선을 수면 가까이에서 추적하세요", duration: 80, color: 0x2a9d8f, path: TUG_PATH },
    {
      id: "drone", name: "점검 드론", type: "drone", level: 3, desc: "구조물 사이를 누비는 점검 드론을 놓치지 마세요", duration: 75,
      path: [[0, 6, 110, 11], [-22, 12.7, 70, 9], [-40, 12.7, 70, 9], [-62, 14, 68, 10], [-90, 18, 30, 12], [-60, 22, -40, 13], [0, 14, -30, 12], [58, 22, -42, 11], [110, 24, -40, 13], [150, 16, 20, 13], [100, 30, 65, 11], [50, 12, 118, 12]],
    },
  ],
  combat: { blue: [-70, 130], red: [150, -30], depots: [[0, 0], [-110, 20], [150, 20], [20, -104]] },
  strike: { turrets: [[-10, -100], [20, 14], [-110, 20], [268, -12], [84, -100], [-224, -54]], core: [164, -74] },
};
