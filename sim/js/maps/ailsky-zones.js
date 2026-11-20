// 폭풍 무덤의 구역들
//  · 남: 연합 전진 캠프 — 착륙판·조립식 막사·안테나·폭풍막이 아치·보급 상자
//  · 남서: 빈 합창 가시 둥지 — 절벽에 처박힌 순양함 '울음꼬리'와 그 위를 덮은 창백한 가시·살덩이
//  · 남동: 노래 등대 — 뼈 고리 셋을 두른 결정 탑, 꼭대기에서 금빛 빛줄기가 돈다
//  · 북: 번개 첨탑 숲 — 섬전암 줄기가 흐르는 바위 바늘과 그을린 땅
//  · 북동: 무너진 에일 전초 — 깨진 껍질 돔·부러진 소라 탑·찢긴 깃발
//  · 고원 사이: 뼈 다리 아치, 틈에 걸린 난파선 둘, 구름 속에서 솟은 바늘 바위
import * as THREE from "../../vendor/three.module.min.js";
import { shellDome, conchTower, crystals, crystalSpire, PEARL, PEARL2, SHELL, SHELL2 } from "./ail-kit.js";
import {
  M, tube, bead, lump, V3, DEG, lumpG, ring, ribArch, Surf, frame3, hoop, needle, hulk, spineTurret, stump, rock, spikeG, bannerPole, podVine,
  INK, SLATE, SLATE2, ASH, CRYS, CRYS2, BONE, BONE2, BONE3, HULL, HULL2, HULL3, FLESH, FLESH2, GOLD, GOLD2, AMBER, VIO, VIO2, PINK, DIMV, DIMP, CHOR, CHOR2, TEAL, WH, ORG, DK,
} from "./ailsky-kit.js";
import { height, PLT, BRIDGES, BRIDGE_W, SCORCH, plateauOf } from "./ailsky-terrain.js";

// 고원 위 아무 데나 고르기(가장자리에서 m 안쪽)
function pick(w, I, m, f) { const r = w.rand; for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * I.R, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d; if (plateauOf(x, z, m) === I && f(x, z)) return [x, z]; } return null; }
// 선(코스·경로)에서 떨어졌는가: 3D 구 R
const lineFree = (ctx, x, y, z, R) => !ctx.LINES.some((L) => L.some((p) => Math.hypot(p.x - x, p.y - y, p.z - z) < R + 5));

// ── 남: 연합 전진 캠프 ──
function camp(w, K, ctx) {
  const r = w.rand, I = PLT.south;
  // 조립식 막사(흰 판 + 주황 띠 + 창 빛)
  const huts = [[-46, 150, 0], [-52, 172, 90], [44, 196, 0], [52, 172, 90], [-30, 214, 20], [30, 120, -15]];
  for (const [x, z, ry] of huts) {
    if (!ctx.free(x, z, 6)) continue;
    const y = height(x, z);
    w.box(x, y + 1.6, z, 10, 3.2, 5, WH, { ry, mat: "paint" });
    w.box(x, y + 3.35, z, 10.4, 0.3, 5.4, 0x9aa0b0, { ry, mat: "paint", col: false });
    w.box(x, y + 2.2, z, 10.05, 0.35, 5.05, ORG, { ry, col: false });
    const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
    for (const k of [-3, 0, 3]) w.box(x + c * k + s * 2.55, y + 1.5, z - s * k + c * 2.55, 1.4, 0.8, 0.1, 0xffd890, { ry, mat: "glow", col: false });
    w.pool(x, y, z, 9, 0xffd890, 0.25);
    ctx.taken.push([x, z, 9]);
  }
  // 착륙판 넷: 원판 + 테두리 빛 + 기둥등
  for (const [x, z] of [[-24, 108], [26, 230], [-60, 200], [62, 140]]) {
    if (!ctx.free(x, z, 7, true)) continue;
    const y = height(x, z);
    w.cyl(x, y + 0.1, z, 7, 0.3, 0x3a3f50, { mat: "paint", col: false, seg: 16 });
    ring(w, x, y + 0.32, z, 6.2, 0.18, ORG, { pitch: 90, col: false, mat: "glow", seg: 20 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; K.blink.add(x + Math.cos(a) * 7.3, y + 0.6, z + Math.sin(a) * 7.3, ORG, 0.3, k & 1); }
    w.pool(x, y, z, 8, ORG, 0.2);
  }
  // 안테나 탑과 기상 관측 기둥
  for (const [x, z, H] of [[-62, 130, 22], [66, 210, 18], [12, 232, 26]]) {
    if (!ctx.free(x, z, 3)) continue;
    const y = height(x, z);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tube(w, x + dx * 1.6, y, z + dz * 1.6, x + dx * 0.3, y + H, z + dz * 0.3, 0.14, 0xc8ccd6, { seg: 4, mat: "metal" });
    for (let h = 4; h < H; h += 4) ring(w, x, y + h, z, 1.6 - h / H * 1.2, 0.08, 0xc8ccd6, { pitch: 90, col: false, seg: 4 });
    w.col.addCapsule(V3(x, y, z), V3(x, y + H, z), 1.2);
    w.cyl(x, y + H, z, 0.12, 4, 0xdde0e8, { col: false });
    K.blink.add(x, y + H + 4.2, z, 0xff4030, 0.5, 0);
    w.box(x + 1.2, y + H - 2, z, 2.6, 1.4, 0.2, 0xdde0e8, { col: false });
  }
  // 폭풍막이 아치(통과 가능): 캠프 북쪽 입구의 강철 반원 둘
  for (const [x, z, yaw] of [[-36, 198, 10], [40, 214, -20]]) {
    if (!ctx.free(x, z, 9)) continue;
    const y = height(x, z), c = Math.cos(yaw * DEG), s = -Math.sin(yaw * DEG), hw = 8;
    const pts = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10; pts.push([x + c * Math.cos(a) * hw, y + Math.sin(a) * 9, z + s * Math.cos(a) * hw]); }
    for (let i = 0; i < 10; i++) tube(w, ...pts[i], ...pts[i + 1], 0.45, i % 2 ? WH : ORG, { col: true, seg: 6, mat: "paint" });
    K.blink.add(x, y + 9.6, z, ORG, 0.4, 1);
    w.gap("폭풍막이 아치", x, y + 4, z, yaw, hw * 2 - 2, 8, 150);
  }
  // 보급 상자 무더기와 연료통
  for (let i = 0; i < 26; i++) {
    const p = pick(w, I, 8, (x, z) => ctx.free(x, z, 2)); if (!p) continue;
    const [x, z] = p, y = height(x, z), n = 1 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) w.box(x + (k % 2) * 1.5, y + 0.6 + (k > 1 ? 1.2 : 0), z + (k === 1 ? 1.4 : 0), 1.4, 1.2, 1.4, k % 2 ? 0x4a5a3a : 0x6a6040, { ry: r() * 90, col: k === 0 });
    if (i % 3 === 0) w.cyl(x + 3, y + 0.8, z, 0.6, 1.6, ORG, { seg: 10 });
  }
  // 캠프 둘레 낮은 방벽(모래주머니 줄) — 절벽 쪽 가장자리를 따라
  for (let a = 0; a < 6.28; a += 0.16) {
    const d = I.R * 0.84, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    if (plateauOf(x, z, 3) !== I || !ctx.free(x, z, 1, true) || !ctx.road(x, z, 3)) continue;
    rock(w, x, height(x, z), z, 0.9, 0.5, 0.7, 0x3a3858);
  }
}

// ── 남서: 빈 합창 가시 둥지 (추락한 순양함 '울음꼬리' 위) ──
function nest(w, K, ctx) {
  const r = w.rand, I = PLT.sw;
  // 순양함: 동쪽 절벽에 머리를 걸치고 꼬리를 고원에 묻었다. 옆구리가 찢겨 속을 지나갈 수 있다
  const cx = -214, cz = 128, F = frame3(cx, height(cx, cz) + 8, cz, 80, -6, 18);
  hulk(w, K, F, { L: 84, R: 14, t0: 0.02, t1: 0.92, skin: 0.6, col: true, seam: 0.3, pods: 7, fins: 3, eye: CHOR,
    open: (t, a) => (a > 2.4 && a < 4.0) || (t > 0.3 && t < 0.62 && a > 5.0) });
  ctx.taken.push([cx, cz, 34]);
  w.gap("울음꼬리의 찢긴 배", ...F.P(0, 0, 0), 80, 16, 12, 350);
  // 가시 덩굴: 선체 등에서 솟아 땅으로 휘어 내린 창백한 가시 줄기
  for (let k = 0; k < 10; k++) {
    const u = -36 + k * 7.5, a = F.P(u, (k % 2 ? 1 : -1) * 6, 11), x2 = a[0] + (r() - 0.5) * 30, z2 = a[2] + (r() - 0.5) * 30, b = [x2, height(x2, z2) - 0.5, z2];
    if (b[1] < -10) continue;
    const m = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 6, (a[2] + b[2]) / 2];
    tube(w, ...a, ...m, 0.9, 0x2a1c36, { seg: 5 }); tube(w, ...m, ...b, 0.7, 0x2a1c36, { seg: 5 });
    for (let j = 0; j < 4; j++) { const t = j / 4, q = [a[0] + (m[0] - a[0]) * t * 2, a[1] + (m[1] - a[1]) * t * 2, a[2] + (m[2] - a[2]) * t * 2]; w.mesh(spikeG(), M(q[0], q[1], q[2], 0.25, 2.4, 0.25, r() * 80 - 40, r() * 360, 0), 0xd8d4e8, "flat"); }
  }
  // 둥지 마당: 가시 포탑 모양의 장식(실제 포탑은 임무에서 선다), 살덩이 둔덕, 차갑게 빛나는 목구멍
  for (let i = 0; i < 16; i++) {
    const p = pick(w, I, 6, (x, z) => ctx.free(x, z, 4)); if (!p) continue;
    const [x, z] = p, y = height(x, z);
    if (i % 3 === 0) spineTurret(w, K, x, y, z, 0.7 + r() * 0.5);
    else { lump(w, x, y + 0.5, z, 3 + r() * 2, 1.2 + r(), 3 + r() * 2, i % 2 ? 0x1e1628 : 0x2a1c36, { col: true });
      for (let k = 0; k < 5; k++) w.mesh(spikeG(), M(x + (r() - 0.5) * 5, y, z + (r() - 0.5) * 5, 0.3 + r() * 0.3, 3 + r() * 5, 0.3 + r() * 0.3, r() * 50 - 25, r() * 360, 0), k % 2 ? 0xbcb6d0 : 0xe6e2f2, "flat");
      bead(w, x, y + 1.6, z, 0.6, CHOR); }
    ctx.taken.push([x, z, 7]);
  }
  // 창백한 빛의 웅덩이(빈 합창이 고인 자리)
  for (const [x, z] of [[-160, 140], [-150, 152], [-176, 128]]) w.pool(x, height(x, z), z, 14, CHOR, 0.22);
  // 키 큰 가시 첨탑: 둥지의 경계표
  for (const [x, z, H] of [[-196, 96, 26], [-130, 192, 22], [-200, 180, 30]]) {
    if (!ctx.free(x, z, 4)) continue;
    const y = height(x, z);
    w.mesh(spikeG(), M(x, y - 1, z, 2.2, H, 2.2, 4, r() * 360, 0), 0xd8d4e8, "flat");
    w.col.addCapsule(V3(x, y, z), V3(x, y + H * 0.7, z), 1.4);
    for (let k = 0; k < 6; k++) { const h = H * (0.2 + k * 0.12), a = k * 2.3; w.mesh(spikeG(), M(x + Math.cos(a), y + h, z + Math.sin(a), 0.5, 5 - k * 0.5, 0.5, 60, -a / DEG, 0), 0xbcb6d0, "flat"); }
    ring(w, x, y + H * 0.55, z, 2.6, 0.25, CHOR, { pitch: 90, col: false, mat: "glow", seg: 12 });
    K.blink.add(x, y + H + 0.5, z, CHOR, 0.5, 1);
    ctx.taken.push([x, z, 5]);
  }
}

// ── 남동: 노래 등대 ──
export const BEACON = [190, 132];
function beacon(w, K, ctx) {
  const [x, z] = BEACON, y = height(x, z), H = 58;
  // 몸통: 결정 첨탑 + 소라 탑 밑동
  conchTower(w, K, x, z, y, 20, 7, { color: PEARL2 });
  needle(w, K, x, z, y + 12, y + H, 5.5, { n: 10, crystal: 0.4, color: 0x3a3670, color2: 0x4a4680, crys: CRYS2, veins: 4, lean: 0.01, colFrom: y });
  // 뼈 고리 셋(기울어진 띠) — 고리와 탑 사이를 날아 지날 수 있다
  for (const [h, R, tl] of [[22, 15, 12], [36, 12, -16], [48, 9, 8]]) {
    ring(w, x, y + h, z, R, 0.8, BONE2, { pitch: 90 - tl, yaw: h * 7, col: true, seg: 28 });
    ring(w, x, y + h, z, R - 0.9, 0.22, GOLD, { pitch: 90 - tl, yaw: h * 7, col: false, mat: "glow", seg: 28 });
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + h; tube(w, x + Math.cos(a) * 4.5, y + h - 4, z + Math.sin(a) * 4.5, x + Math.cos(a) * (R - 0.5), y + h + Math.sin(a) * Math.tan(tl * DEG) * R * 0.5, z + Math.sin(a) * (R - 0.5), 0.35, BONE3, { seg: 4 }); }
  }
  w.gap("등대 고리", x + 11, y + 22, z, 90, 7, 8, 220);
  // 꼭대기: 금빛 등불 + 도는 빛줄기 두 줄
  const top = y + H + 6;
  bead(w, x, top, z, 2.4, GOLD2);
  w.pool(x, y, z, 26, GOLD, 0.3);
  const beamG = new THREE.CylinderGeometry(0.3, 3.2, 90, 10, 1, true); beamG.translate(0, 45, 0); beamG.rotateZ(-Math.PI / 2);
  const beamM = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const grp = new THREE.Group(); grp.position.set(x, top, z);
  for (const a of [0, Math.PI]) { const m = new THREE.Mesh(beamG, beamM); m.rotation.y = a; m.rotation.z = -0.06; m.frustumCulled = false; grp.add(m); }
  w.scene.add(grp); w.disposables.push(beamG, beamM);
  w.updaters.push((dt, t) => { grp.rotation.y = t * 0.55; beamM.opacity = 0.04 + 0.02 * Math.sin(t * 3.1); });
  ctx.taken.push([x, z, 18]);
  // 둘레의 노래 돌: 작은 결정 기둥과 껍질 의자
  const I = PLT.se, r = w.rand;
  for (let i = 0; i < 12; i++) {
    const p = pick(w, I, 5, (px, pz) => ctx.free(px, pz, 3)); if (!p) continue;
    if (i % 2) crystals(w, p[0], p[1], 1 + r() * 0.8, r, { y: height(...p), colors: [CRYS, CRYS2, 0x9c86ff] });
    else crystalSpire(w, K, p[0], p[1], height(...p), 8 + r() * 10, 0.9 + r() * 0.5, { colors: [0x6a74c8, 0x8f9cf0, 0x5a5ab0] });
    ctx.taken.push([p[0], p[1], 4]);
  }
}

// ── 북: 번개 첨탑 숲 ──
function spires(w, K, ctx) {
  const r = w.rand, I = PLT.north;
  const list = [[-56, -196, 52], [-22, -214, 46], [8, -208, 38], [-62, -166, 34], [-36, -182, 28], [20, -176, 30], [-8, -230, 26], [-80, -210, 30], [36, -200, 24], [-6, -160, 20]];
  let n = 0;
  for (const [x0, z0, H] of list) {
    let p = null;
    for (let k = 0; k < 10 && !p; k++) { const x = x0 + (k ? (r() - 0.5) * 16 : 0), z = z0 + (k ? (r() - 0.5) * 16 : 0); if (ctx.free(x, z, 5) && plateauOf(x, z, 2)) p = [x, z]; }
    if (!p) continue;
    const y = height(...p), nd = needle(w, K, p[0], p[1], y - 1, y + H, 3 + H * 0.09, { veins: 3 + (n % 2) });
    K.rods.push(nd.tip); ctx.taken.push([p[0], p[1], 6 + H * 0.1]); n++;
    // 밑동의 무너진 바위
    for (let k = 0; k < 4; k++) { const a = r() * 6.28, d = 4 + r() * 4; rock(w, p[0] + Math.cos(a) * d, y, p[1] + Math.sin(a) * d, 1 + r() * 1.5, 0.8 + r(), 1 + r() * 1.5, k % 2 ? SLATE : INK); }
  }
  // 그을린 자리마다 녹아 굳은 유리 결정과 금빛 잔불
  for (const [x, z, R] of SCORCH) {
    const y = height(x, z);
    if (y < -5) continue;
    for (let k = 0; k < 5; k++) { const a = k * 1.26 + x, d = R * 0.75; if (ctx.free(x + Math.cos(a) * d, z + Math.sin(a) * d, 0, true)) w.mesh(spikeG(), M(x + Math.cos(a) * d, y - 0.2, z + Math.sin(a) * d, 0.4, 1.5 + r() * 2, 0.4, r() * 40, r() * 360, 0), k % 2 ? GOLD : AMBER, "glow"); }
    w.pool(x, y, z, R * 0.8, AMBER, 0.22);
  }
  // 다른 고원 가장자리의 바람에 깎인 바늘들
  for (const id of ["west", "east", "ne", "se", "south", "sw"]) {
    const J = PLT[id];
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.28, x = J.x + Math.cos(a) * J.R * 0.86, z = J.z + Math.sin(a) * J.R * 0.86;
      if (!plateauOf(x, z, 1) || !ctx.free(x, z, 5)) continue;
      const y = height(x, z), H = 14 + r() * 18, nd = needle(w, K, x, z, y - 1, y + H, 2.2 + r() * 1.5, { veins: 2, lean: 0.12 });
      if (i === 0) K.rods.push(nd.tip);
      ctx.taken.push([x, z, 6]);
    }
  }
  // 구름 바다에서 솟은 바늘 바위(틈 속): 꼭대기는 고원 높이 언저리
  for (let i = 0; i < 26; i++) {
    const x = (r() * 2 - 1) * 225, z = (r() * 2 - 1) * 225, gy = height(x, z);
    if (gy > -60 || !ctx.free(x, z, 12) || ctx.onBr(x, z, 10)) continue;
    const top = -30 + r() * 50;
    if (!lineFree(ctx, x, top - 10, z, 10) || !lineFree(ctx, x, top, z, 10)) continue;
    const nd = needle(w, K, x, z, -80, top, 6 + r() * 4, { n: 8, veins: 2, crystal: 0.75, lean: 0.012 });
    if (top > 0) K.rods.push(nd.tip);
    ctx.taken.push([x, z, 10]);
  }
}

// ── 북동: 무너진 에일 전초 ──
function outpost(w, K, ctx) {
  const r = w.rand, I = PLT.ne;
  for (let i = 0; i < 9; i++) {
    const p = pick(w, I, 6, (x, z) => ctx.free(x, z, 8)); if (!p) continue;
    const [x, z] = p, y = height(x, z);
    if (i % 3 === 0) {
      // 깨진 껍질 돔: 반쯤 무너진 돔 + 흩어진 껍질 조각
      shellDome(w, K, x, z, y, 6 + r() * 3, { sy: 0.5 + r() * 0.3, color: r() < 0.5 ? PEARL2 : 0x9a88c0 });
      for (let k = 0; k < 5; k++) { const a = r() * 6.28, d = 8 + r() * 4; w.mesh(lumpG(), M(x + Math.cos(a) * d, y + 0.3, z + Math.sin(a) * d, 1.6, 0.4, 1.1, r() * 30, r() * 360, 0), PEARL2, "flat"); }
    } else if (i % 3 === 1) {
      // 부러진 소라 탑
      conchTower(w, K, x, z, y, 10 + r() * 12, 2.6 + r(), { color: r() < 0.5 ? PEARL : PEARL2 });
      stump(w, x + 6, y, z + 3, 2, 8, 70, r() * 360, { color: PEARL2 });
    } else {
      bannerPole(w, K, x, y, z, 10 + r() * 6, 200 + r() * 30, r() < 0.5 ? VIO : PINK);
      bannerPole(w, K, x + 4, y, z - 3, 8 + r() * 4, 200 + r() * 30, GOLD);
    }
    ctx.taken.push([x, z, 12]);
  }
  // 전초의 문: 쓰러져 아치가 된 거대 뼈 두 개 (통과 가능)
  for (const [x, z, yaw] of [[150, -160, 60], [200, -205, 150], [150, -212, 110]]) {
    if (!lineFree(ctx, x, height(x, z) + 8, z, 9) || ctx.roadD(x, z) < 12) continue;
    const c = Math.cos(yaw * DEG) * 9, s = -Math.sin(yaw * DEG) * 9;
    ribArch(w, K, x - c, height(x - c, z - s), z - s, x + c, height(x + c, z + s), z + s, 14, { t: 1.2, name: "전초의 문", light: GOLD });
  }
  // 바닥에 남은 노래 문양(금빛 동심원)
  for (const [x, z] of [[160, -200], [190, -165]]) { const y = height(x, z); for (const R of [5, 8.5]) ring(w, x, y + 0.12, z, R, 0.16, R > 6 ? DIMV : GOLD, { pitch: 90, col: false, mat: "glow", seg: 28 }); }
}

// 뾰족 뼈 아치: 다리가 거의 곧게 서는 아치(측면이 높아 밑으로 트럭과 드론이 지난다). 높이 프로필 sin^0.45
function boneArch(w, K, ax, ay, az, bx, by, bz, H, o = {}) {
  const N = 14, pts = [], prof = (u) => Math.pow(Math.sin(u * Math.PI), 0.45);
  for (let i = 0; i <= N; i++) { const u = i / N; pts.push([ax + (bx - ax) * u, ay + (by - ay) * u + prof(u) * H, az + (bz - az) * u]); }
  for (let i = 0; i < N; i++) {
    const tt = 1.0 * (1.3 - 0.5 * Math.sin((i + 0.5) / N * Math.PI));
    tube(w, ...pts[i], ...pts[i + 1], tt, i % 2 ? BONE : BONE2, { col: true, seg: 6 });
    if (i % 2 === 0 && i > 0) w.mesh(lumpG(), M(...pts[i], tt * 1.7, tt * 1.4, tt * 1.7, 0, i * 40, 0), BONE3, "flat");
    tube(w, pts[i][0], pts[i][1] - tt * 0.8, pts[i][2], pts[i + 1][0], pts[i + 1][1] - tt * 0.8, pts[i + 1][2], tt * 0.28, o.light ?? GOLD, { mat: "glow", seg: 3 });
  }
  // 꼭대기 가시 왕관
  const c = pts[N / 2];
  w.mesh(spikeG(), M(c[0], c[1] + 0.6, c[2], 0.6, 5, 0.6), BONE, "flat");
  for (const p of [pts[0], pts[N]]) { lump(w, p[0], p[1] + 0.4, p[2], 2.6, 1.4, 2.6, BONE3, { mat: "flat" }); if (K) K.blink.add(p[0], p[1] + 3, p[2], o.light ?? GOLD, 0.34, (p[0] | 0) & 1); }
  const yaw = Math.atan2(-(bz - az), bx - ax) / DEG;
  w.gap(o.name || "뼈 아치 아래", (ax + bx) / 2, Math.min(ay, by) + H * 0.45, (az + bz) / 2, yaw, Math.hypot(bx - ax, bz - az) - 4, H * 0.75, o.pts || 220);
  return pts;
}
export const archProf = (u) => Math.pow(Math.sin(u * Math.PI), 0.45);

// ── 뼈 다리: 마루의 금빛 혈관, 아치, 옆구리로 늘어진 뿌리 ──
function bridges(w, K, ctx) {
  const r = w.rand;
  for (const B of BRIDGES) {
    const [s0, s1] = B.span, px = -B.uz, pz = B.ux, len = s1 - s0, at = (s) => [B.a[0] + B.ux * s, B.a[1] + B.uz * s];
    for (const off of [-5.5, 5.5]) {
      let prev = null;
      for (let s = s0 - 6; s <= s1 + 6; s += 4) { const [x, z] = at(s), qx = x + px * off, qz = z + pz * off, p = [qx, height(qx, qz) + 0.16, qz]; if (prev) tube(w, ...prev, ...p, 0.18, off < 0 ? GOLD : DIMV, { mat: "glow", seg: 3 }); prev = p; }
    }
    const n = Math.max(1, Math.round(len / 30));
    for (let k = 0; k < n; k++) {
      const s = s0 + (k + 0.5) * (len / n), [x, z] = at(s), hw = BRIDGE_W / 2 - 0.8, ax = x - px * hw, az = z - pz * hw, bx = x + px * hw, bz = z + pz * hw;
      const ay = height(ax, az) - 0.4, by = height(bx, bz) - 0.4, H = 16 + (k % 2) * 4;
      let ok = true;
      for (let i = 0; i <= 24 && ok; i++) { const u = i / 24, px2 = ax + (bx - ax) * u, py = ay + (by - ay) * u + archProf(u) * H, pz2 = az + (bz - az) * u; if (!lineFree(ctx, px2, py, pz2, -1.5) || (py < height(x, z) + 6 && ctx.roadD(px2, pz2) < 3.5)) ok = false; }
      if (ok) boneArch(w, K, ax, ay, az, bx, by, bz, H, { name: "뼈 다리 아치 아래" });
    }
    for (let s = s0 + 3; s < s1 - 3; s += 8 + r() * 6) for (const sd of [-1, 1]) {
      const [x, z] = at(s), off = BRIDGE_W / 2 + 2 + r() * 3, qx = x + px * off * sd, qz = z + pz * off * sd, y = height(qx, qz);
      podVine(w, qx, y + 1, qz, 12 + r() * 26, { r: 0.5, n: 4, pod: r() < 0.3 ? 1.2 : 0 });
    }
  }
}

// ── 틈에 걸린 난파선: 두 고원 사이에 끼어 걸린 호위함들 ──
function wrecks(w, K, ctx) {
  const list = [
    { x: -82, z: 132, y: -14, yaw: 70, pitch: 8, roll: -30, L: 64, R: 10 },     // 남–남서 틈
    { x: 40, z: -150, y: -18, yaw: 160, pitch: -12, roll: 40, L: 70, R: 11 },   // 북–동 틈
    { x: 212, z: 40, y: -26, yaw: 100, pitch: 20, roll: 20, L: 56, R: 9 },      // 남동 고원 밖
    { x: -215, z: -150, y: -10, yaw: 30, pitch: -24, roll: -14, L: 60, R: 10 }, // 서북 모서리
  ];
  for (const o of list) {
    const F = frame3(o.x, o.y, o.z, o.yaw, o.pitch, o.roll);
    let ok = true;
    for (let u = -o.L / 2; u <= o.L / 2 && ok; u += 6) { const p = F.P(u, 0, 0); if (!lineFree(ctx, p[0], p[1], p[2], o.R + 2)) ok = false; }
    if (!ok) continue;
    hulk(w, K, F, { L: o.L, R: o.R, t0: 0.05, t1: 0.95, skin: 0.55, col: true, seam: 0.22, pods: 4, fins: 2 });
    const e = F.P(o.L * 0.4, 0, o.R * 0.6);
    K.blink.add(e[0], e[1] + 2, e[2], AMBER, 0.6, 1);
  }
}

export function zones(w, K, ctx) {
  camp(w, K, ctx); beacon(w, K, ctx); nest(w, K, ctx); outpost(w, K, ctx);
  bridges(w, K, ctx); spires(w, K, ctx); wrecks(w, K, ctx);
}
