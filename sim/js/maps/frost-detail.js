// 설원 통신기지 둘레: 얼음 협곡(철교·얼음 다리·얼음 갈비), 호수에 처박힌 수송함, 북동 포대, 전방 캠프, 고갯길 소품, 바위·고사목·빙탑
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, V3, frame, Rig, G, icicle, icicles, drift, shardIce, iceArch, plume, DEG, hash,
  SNOW, SNOW_SH, ICE, ICE_D, ICE_K, CONC, CONC2, STEEL, DARK, INK, HULL, HULL2, OLIVE, WCAMO, ORG, RED, AMB, WARM, CYA, FIRE, RUST, BRIDGE, GUNS,
} from "./frost-kit.js";
import { CANYON, ROAD, SHELF, FLOOR, ART, WRECK, LAKE, lakeE, shelfK, canyonAt, flatK } from "./frost-terrain.js";

// 협곡 선 위에서 z 가 주어진 값에 가장 가까운 진행 비율
export function canyonT(z) { let bt = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const p = CANYON.point(i / 400), d = Math.abs(p[1] - z); if (d < bd) { bd = d; bt = i / 400; } } return bt; }
// 협곡 가운데 점 [x, y, z] (y 는 바닥에서 띄운 높이)
export const canyonP = (z, y = 9) => { const p = CANYON.point(canyonT(z)); return [Math.round(p[0] * 10) / 10, y, Math.round(p[1] * 10) / 10]; };
// 협곡의 볼거리 위치(z): 윗면을 잇는 얼음 다리, 바닥에서 솟은 얼음 갈비
export const ICE_BRIDGES = [-112, -52, 96], ICE_RIBS = [-150, -4, 66];

// 처박힌 수송함의 뒤쪽 동체(관통 가능) 좌표계: 원점 = 화물칸 바닥 가운데
export const WRECK_POSE = [WRECK[0] - 26, -1.6, WRECK[1], 0, -68, 5];
const _wm = M(WRECK_POSE[0], WRECK_POSE[1], WRECK_POSE[2], 1, 1, 1, WRECK_POSE[3], WRECK_POSE[4], WRECK_POSE[5]);
export const wreckP = (u, y, v) => { const p = new THREE.Vector3(u, y, v).applyMatrix4(_wm); return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, Math.round(p.z * 10) / 10]; };
export const WRECK_YAW = WRECK_POSE[4];

// ── 얼음 협곡 ──
export function canyon(w, K, ctx) {
  const r = w.rand;
  // 철교: 빙붕의 고갯길이 협곡을 건넌다 (아래로 통과)
  {
    const { x0, x1, z, y } = BRIDGE, cx = (x0 + x1) / 2, L = x1 - x0;
    w.box(cx, y - 0.9, z, L + 6, 0.9, 7.4, DARK, { mat: "paint" });
    w.box(cx, y, z, L + 6, 0.12, 6.4, 0xb9c4d2, { col: false, ao: false });
    for (const s of [-1, 1]) {
      const zz = z + s * 3.9;
      beam(w, [x0, y + 5.4, zz], [x1, y + 5.4, zz], 0.7, HULL2);
      beam(w, [x0 - 3, y, zz], [x0, y + 5.4, zz], 0.7, HULL2); beam(w, [x1 + 3, y, zz], [x1, y + 5.4, zz], 0.7, HULL2);
      for (let i = 0; i < 6; i++) {
        const a = x0 + (i / 6) * L, b = x0 + ((i + 1) / 6) * L;
        beam(w, [a, y, zz], [(a + b) / 2, y + 5.4, zz], 0.4, ORG, { col: false }); beam(w, [(a + b) / 2, y + 5.4, zz], [b, y, zz], 0.4, ORG, { col: false });
        if (i) K.blink.add(a, y + 6, zz, AMB, 0.28, i);
      }
      w.col.addBox(V3(cx, y + 2.7, zz), V3(L / 2, 2.7, 0.3));
      icicles(w, [x0, y - 0.9, zz], [x1, y - 0.9, zz], 26, 3.6);
      beam(w, [x0 + 6, y - 0.9, zz], [cx, y - 5.5, zz], 0.5, STEEL, { col: false }); beam(w, [x1 - 6, y - 0.9, zz], [cx, y - 5.5, zz], 0.5, STEEL, { col: false });
    }
    for (let i = 0; i <= 5; i++) beam(w, [x0 + (i / 5) * L, y + 5.4, z - 3.9], [x0 + (i / 5) * L, y + 5.4, z + 3.9], 0.35, HULL2, { col: false });
    for (const e of [x0 - 4, x1 + 4]) { w.box(e, y - 9, z, 5, 9, 10, CONC, { mat: "std:concrete", tile: 4 }); drift(w, e, y + 0.3, z + 5.5, 4, 1, 3); }
    w.gap("철교 아래", cx - 1, 11, z, 0, 22, 14, 450);
  }
  // 윗면을 잇는 천연 얼음 다리 셋
  for (const z of ICE_BRIDGES) {
    const t = canyonT(z), [cx, cz] = CANYON.point(t), [dx, dz] = CANYON.dir(t), px = -dz, pz = dx;
    iceArch(w, cx - px * 21, cz - pz * 21, cx + px * 21, cz + pz * 21, SHELF - 3.5, 5, 3.3);
    for (let i = 0; i < 12; i++) { const k = (r() - 0.5) * 22; icicle(w, cx + px * k + (r() - 0.5) * 3, SHELF - 2.2 + (1 - Math.abs(k) / 16) * 1.5, cz + pz * k + (r() - 0.5) * 3, 0.4 + r() * 0.3, 3 + r() * 5, r() < 0.4 ? ICE_D : ICE); }
    w.gap("얼음 다리 아래", cx, 10, cz, Math.atan2(-dx, -dz) / DEG, 16, 12, 400);
  }
  // 바닥에서 솟아 맞닿은 얼음 갈비(문처럼 지난다)
  for (const z of ICE_RIBS) {
    const t = canyonT(z), [cx, cz] = CANYON.point(t), [dx, dz] = CANYON.dir(t), px = -dz, pz = dx;
    iceArch(w, cx - px * 11.5, cz - pz * 11.5, cx + px * 11.5, cz + pz * 11.5, 4.5, 13.5, 1.9, { snow: false });
    w.gap("얼음 갈비", cx, 9, cz, Math.atan2(-dx, -dz) / DEG, 12, 10, 500);
  }
  // 벽에 매달린 고드름 장막과 바닥의 얼음 조각, 가장자리 빙탑
  for (let i = 0; i < 70; i++) {
    const t = 0.16 + r() * 0.8, [cx, cz] = CANYON.point(t), [dx, dz] = CANYON.dir(t), s = r() < 0.5 ? -1 : 1, px = -dz * s, pz = dx * s;
    if (cz > 118) continue;
    if (i % 3 === 0) { const d = 9.5 + r() * 3, x = cx + px * d, z = cz + pz * d; shardIce(w, x, w.h(x, z) + 0.6, z, 1 + r() * 1.4, 1.2 + r() * 2.2, 1 + r() * 1.2, r() < 0.5 ? ICE : ICE_D); }
    else { const d = 15 + r() * 3, x = cx + px * d, z = cz + pz * d, y = w.h(x, z); if (y > 9) for (let k = 0; k < 4; k++) icicle(w, x + (r() - 0.5) * 3, y - 0.5 - r() * 2, z + (r() - 0.5) * 3, 0.35 + r() * 0.35, 3 + r() * 5, k % 2 ? ICE : 0xc8eaf8); }
  }
  for (let i = 0; i < 34; i++) {
    const t = 0.12 + r() * 0.84, [cx, cz] = CANYON.point(t), [dx, dz] = CANYON.dir(t), s = r() < 0.5 ? -1 : 1, d = 24 + r() * 10, x = cx - dz * s * d, z = cz + dx * s * d;
    if (shelfK(x, z) < 0.95 || Math.abs(z - BRIDGE.z) < 14 || (ROAD.at(x, z) || [99])[0] < 9 || !ctx.free(x, z, 3)) continue;
    const y = w.h(x, z) - 0.5, hh = 4 + r() * 9, rr = 1.2 + r() * 1.6;
    w.mesh(G.spike(), M(x, y, z, rr, hh, rr, (r() - 0.5) * 14, r() * 360, (r() - 0.5) * 14), [ICE, 0xc4e8f8, ICE_D][i % 3], "paint");
    if (r() < 0.6) w.mesh(G.spike(), M(x + rr, y, z + rr * 0.6, rr * 0.6, hh * 0.55, rr * 0.6, 0, r() * 360, 10), ICE, "paint");
    w.col.addCapsule(V3(x, y, z), V3(x, y + hh * 0.7, z), rr * 0.6);
  }
}

// ── 호수에 처박힌 수송함: 두 동강 난 선체. 뒤쪽 화물칸은 앞뒤가 뚫려 관통할 수 있다 ──
export function wreck(w, K, S) {
  const r = w.rand, C1 = 0x8e99a8, C2 = 0x6f7b8a, g = new Rig(w, ...WRECK_POSE), L = 46, W = 16, H = 10;
  // 화물칸: 바닥·옆벽·찢긴 천장
  g.box(0, -0.5, 0, W, 1, L, C2);
  for (const s of [-1, 1]) {
    g.box(s * (W / 2 - 0.5), 4.6, 0, 1, 9.2, L, C1);
    g.box(s * (W / 2 + 0.4), 2.6, 0, 0.5, 1.2, L - 2, 0x2f6fb0, { col: false });
    g.box(s * (W / 2 + 1.6), 5.4, 3, 2.4, 1, 20, C2);                       // 날개 뿌리
    g.box(s * (W / 2 + 6.5), 5.5 + s * 0.2, 5, 8, 0.7, 9, C2, { rz: s * -14 });
  }
  g.box(-3.6, H - 0.3, -9, 8.8, 1, 24, C1).box(4.6, H - 0.3, 9, 6.8, 1, 26, C1).box(-4.4, H - 0.3, 15, 7.2, 1, 14, C1);
  g.box(-3.4, H + 0.4, -9, 8, 0.5, 22, SNOW, { mat: "std", col: false }).box(4.6, H + 0.4, 10, 6, 0.5, 23, SNOW, { mat: "std", col: false });
  // 갈비뼈(뼈대)와 실내 잔해, 비상등
  for (let v = -20; v <= 20; v += 8) {
    for (const s of [-1, 1]) g.box(s * (W / 2 - 1.2), 4.6, v, 0.5, 9, 0.6, DARK, { col: false });
    g.box(0, H - 1, v, W - 2, 0.5, 0.6, DARK, { col: false });
    g.box((v / 8) % 2 ? 6.4 : -6.4, 8.6, v + 1, 0.2, 0.3, 0.3, v % 16 ? AMB : RED, { mat: "glow", col: false });
  }
  for (const [u, v] of [[-5.6, -14], [5.4, -4], [-5.8, 8], [5.6, 17]]) { g.box(u, 1, v, 2.2, 2, 3, OLIVE, { ry: r() * 30 }); g.box(u, 2.1, v, 2.3, 0.2, 3.1, SNOW, { mat: "std", col: false, ry: 10 }); }
  g.gap("추락한 수송함 관통", 0, 4.6, -L / 2, 0, 10.5, 6.8, 600); g.gap("추락한 수송함 관통", 0, 4.6, L / 2, 0, 10.5, 6.8, 400);
  // 꼬리(뒤 = +v): 꺾인 수직 꼬리날개와 엔진 둘
  g.box(0, H + 4.8, 17, 1, 9, 9, C2, { rx: 14 }).box(0, H + 9, 19.5, 9, 0.6, 5, C2, { rx: 14, col: false });
  for (const s of [-1, 1]) { g.pipe([s * 11.5, 5, -3], [s * 11.5, 5, 11], 2.6, DARK).pipe([s * 11.5, 5, 11], [s * 11.5, 5, 12], 2.9, ORG, { col: false }).pipe([s * 11.5, 5, -3.6], [s * 11.5, 5, -3], 2.2, INK, { col: false }); }
  // 찢긴 앞 가장자리: 삐져나온 뼈대와 고드름
  for (let i = 0; i < 7; i++) { const u = -7 + i * 2.3; g.beam([u, H - 0.5, -L / 2], [u + (r() - 0.5) * 2, H - 1 - r() * 2, -L / 2 - 2 - r() * 3], 0.25, RUST, { col: false }); }
  { const a = g.P(-7, H - 0.9, L / 2), b = g.P(7, H - 0.9, L / 2); icicles(w, a.toArray(), b.toArray(), 12, 2.4); const c = g.P(-7, H - 0.9, -L / 2), d = g.P(7, H - 0.9, -L / 2); icicles(w, c.toArray(), d.toArray(), 12, 2.4); }
  // 앞 동체: 떨어져 나가 코를 얼음에 박았다
  const f = new Rig(w, ...wreckP(20, 1.5, -L / 2 - 34), -19, WRECK_POSE[4] + 16, -9);
  f.box(0, 5, 2, W, 10, 26, C1).box(0, 5, -15, 12, 8, 8, C1, { rx: 12 }).box(0, 6, -21, 7, 5, 6, C2, { rx: 22 });
  f.box(0, 9.4, -14, 9, 2, 5, 0x1d3550, { col: false, rx: 16 }).box(0, 10.4, 2, W - 2, 0.5, 24, SNOW, { mat: "std", col: false });
  for (const s of [-1, 1]) { f.box(s * (W / 2 + 0.2), 3, 2, 0.5, 1.2, 24, 0x2f6fb0, { col: false }); f.box(s * (W / 2 + 5), 6, 6, 9, 0.7, 8, C2, { rz: s * -8 }); }
  for (let i = 0; i < 7; i++) { const u = -7 + i * 2.3; f.beam([u, 9.5, 15], [u + (r() - 0.5) * 2, 8 - r() * 3, 18 + r() * 3], 0.25, RUST, { col: false }); }
  // 떨어져 나간 엔진 하나, 깨진 얼음판, 흩어진 화물
  { const e = new Rig(w, WRECK[0] - 44, 1.2, WRECK[1] - 22, 6, 35, 80); e.pipe([0, -6, 0], [0, 6, 0], 2.6, DARK).pipe([0, 6, 0], [0, 7, 0], 2.9, ORG, { col: false }); drift(w, WRECK[0] - 44, 2.6, WRECK[1] - 22, 5, 1.2, 3); }
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2, d = 0.7 + r() * 0.42, x = WRECK[0] + Math.cos(a) * 60 * d, z = WRECK[1] + Math.sin(a) * 25 * d, s = 2.5 + r() * 4;
    if (Math.abs(x - WRECK_POSE[0]) < 14 && Math.abs(z - WRECK_POSE[2]) < 26) continue;
    w.box(x, -0.3, z, s * 1.5, 0.7, s, i % 3 ? 0xd4ecf8 : ICE, { rx: (r() - 0.5) * 34, rz: (r() - 0.5) * 34, ry: r() * 180, mat: "paint", col: false, ao: false });
  }
  for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, x = WRECK[0] + Math.cos(a) * (64 + r() * 12), z = WRECK[1] + Math.sin(a) * (27 + r() * 8); if (lakeE(x, z) < 0.95) { w.box(x, 0, z, 2, 1.2 + r(), 2, i % 2 ? OLIVE : 0x7a6a4a, { ry: r() * 90, rz: (r() - 0.5) * 20, mat: "paint" }); drift(w, x + 0.6, 0.5, z + 0.8, 1.8, 0.5, 1.3); } }
  // 가라앉는 자리에서 오르는 김, 구조 표지등
  plume(w, WRECK[0] + 6, 2, WRECK[1] - 4, 1.3, 26, 3, 0xcfd8e2, [0.5, 0.2]);
  for (const [u, v] of [[-9, -24], [9, 24]]) { const p = g.P(u, 0.6, v); K.blink.add(p.x, p.y + 1.6, p.z, ORG, 0.4, u > 0 ? 1 : 0); }
}

// ── 북동 포대: 고지 남쪽 가장자리에 늘어선 야포 넷. 가운데(적 진지 터)는 비운다 ──
export function artillery(w, K, S, ctx) {
  const r = w.rand, [ax, az] = ART, y0 = w.h(ax, az);
  const flashes = [];
  GUNS.forEach(([deg, d], i) => {
    const x = ax + Math.cos(deg * DEG) * d, z = az + Math.sin(deg * DEG) * d, y = w.h(x, z) - 0.3;
    const [tx, tz] = i < 2 ? [175, 60] : [0, -20], aim = Math.atan2(-(tx - x), -(tz - z)) / DEG + (i % 2 ? 4 : -4);   // 앞의 둘은 도시, 뒤의 둘은 기지를 겨눈다
    // 흙 자루 둔덕: 뒤가 트인 말굽 모양
    for (let k = 0; k < 9; k++) {
      const a = (aim + 90 + (k - 4) * 30) * DEG, bx = x + Math.cos(a) * 7.4, bz = z - Math.sin(a) * 7.4;
      w.box(bx, y - 0.2, bz, 4.2, 1.9, 1.7, 0x8a8674, { ry: aim + (k - 4) * 30, mat: "std:dirt", tile: 2 }); w.box(bx, y + 1.7, bz, 4.3, 0.35, 1.9, SNOW, { ry: aim + (k - 4) * 30, col: false, ao: false });
    }
    const g = new Rig(w, x, y, z, 0, aim, 0);
    g.pipe([0, 0, 0], [0, 0.7, 0], 2.6, DARK).box(0, 1.5, 0.6, 2.6, 1.6, 4.4, OLIVE).box(0, 2.3, -1.6, 4.2, 2.6, 0.3, 0x5a644e);
    for (const s of [-1, 1]) g.box(s * 1.9, 0.5, 4.2, 0.5, 0.5, 6.4, DARK, { ry: s * -16, col: false });
    // 포신: 38도 올려 세웠다
    const el = 38 * DEG, c = Math.cos(el), sn = Math.sin(el), B = (t) => [0, 2.6 + sn * t, -1 - c * t];
    g.pipe(B(-1.5), B(4), 0.62, 0x4a5246).pipe(B(4), B(11.5), 0.36, DARK).pipe(B(11.5), B(12.6), 0.55, INK, { col: false });
    for (const s of [-1, 1]) g.pipe([s * 0.7, 2.9 + sn * 0.5, -1 - c * 0.5], [s * 0.7, 2.9 + sn * 3.6, -1 - c * 3.6], 0.2, STEEL, { col: false });
    g.box(0, 3.2, 0.4, 3.6, 0.3, 3.6, SNOW, { mat: "std", col: false });
    const mz = g.P(...B(13.4)); flashes.push(mz);
    // 탄약 상자와 세워 둔 포탄
    for (let k = 0; k < 3; k++) { const p = g.P(-4.4 + k * 0.3, 0, 3 + k * 1.7); w.box(p.x, y + (k === 2 ? 0.9 : 0), p.z, 1.8, 0.9, 1.1, 0x5c6a44, { ry: aim + r() * 20, mat: "paint", col: k < 2 }); }
    for (let k = 0; k < 5; k++) { const p = g.P(4 + (k % 3) * 0.6, 0, 2.6 + Math.floor(k / 3) * 0.7); w.cyl(p.x, y, p.z, 0.2, 1.1, 0xb8943a, { mat: "metal", col: false }); }
  });
  // 포구 섬광: 번갈아 이따금 쏜다 (빛과 연기 한 덩이)
  {
    const fm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const fl = new THREE.Mesh(G.ico(), fm); fl.frustumCulled = false; fl.renderOrder = 6; w.scene.add(fl); w.disposables.push(fm);
    w.updaters.push((dt, t) => { const k = Math.floor(t / 4.5), u = t / 4.5 - k, p = flashes[(k * 3) % flashes.length]; fl.position.copy(p); fl.scale.setScalar(2 + u * 60); fm.opacity = u < 0.05 ? 1 : Math.max(0, 0.5 - u * 2.4); });
  }
  // 고지 북쪽: 지휘 천막, 레이더 트레일러, 방벽, 깃대. 가운데는 콘크리트 판
  w.cyl(ax, y0 - 0.6, az, 9, 0.75, CONC2, { mat: "std:concrete", tile: 4, col: false, ao: false });
  const F = frame(w, ax, az, 0, y0 - 0.3);
  F.box(-6, 0, -33, 9, 2.4, 5, 0x77806a, { mat: "paint" }); w.mesh(G.cyl6, M(ax - 6, y0 + 2.2, az - 33, 1.6, 9.4, 2.9, 0, 0, 90), 0x8a9478, "paint"); w.mesh(G.cyl6, M(ax - 6, y0 + 2.8, az - 33, 1.2, 8.6, 2.4, 0, 0, 90), SNOW, "std");
  F.box(-6, 0.3, -30.44, 2, 1.8, 0.1, WARM, { mat: "glow", col: false }); w.pool(ax - 6, y0 + 0.1, az - 28, 6, WARM, 0.35);
  F.box(12, 0, -32, 7, 2.6, 2.8, OLIVE, { mat: "paint" }); F.box(12, 2.6, -32, 7.2, 0.3, 3, SNOW, { col: false, ao: false });
  F.pipe(12, 2.6, -32, 12, 6.4, -32, 0.2, DARK, { col: false });
  w.mesh(G.dish(), M(ax + 12, y0 + 6.2, az - 32, 3, 3, 3, 62, 200, 0), 0xdfe5ec, "paint"); w.col.addSphere(V3(ax + 12, y0 + 6.6, az - 32), 2.4);
  K.blink.add(ax + 12, y0 + 9.6, az - 32, RED, 0.3, 1);
  for (let k = 0; k < 7; k++) { const a = (200 + k * 23) * DEG, bx = ax + Math.cos(a) * 41, bz = az + Math.sin(a) * 41; w.box(bx, w.h(bx, bz) - 0.4, bz, 14, 2.4, 1.8, 0x8a8674, { ry: -(200 + k * 23) + 90, mat: "std:dirt", tile: 2.5 }); w.box(bx, w.h(bx, bz) + 2, bz, 14.2, 0.4, 2, SNOW, { ry: -(200 + k * 23) + 90, col: false, ao: false }); }
  F.pipe(-22, 0, -24, -22, 9, -24, 0.1, 0xd8dde4, { col: false }); F.box(-20.9, 7.4, -24, 2.2, 1.4, 0.06, 0x8a1018, { col: false, ao: false });
  S.add("battery", ax + 12, y0 + 1.6, az - 30.56, 5.6, { height: 1.1 });
  // 위장망: 탄약고 위에 비스듬히 친 그물
  { const nx = ax + 26, nz = az - 12, ny = w.h(nx, nz); for (const [u, v] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) w.pipe(nx + u, ny, nz + v, nx + u, ny + 3.6 + (u > 0 ? 1.2 : 0), nz + v, 0.1, 0x5a4a3a, { col: false });
    w.box(nx, ny + 4, nz, 11.4, 0.14, 9, WCAMO, { rz: 7, col: false, ao: false }); w.box(nx, ny + 4.1, nz + 1, 7, 0.12, 5, 0x9aa48a, { rz: 7, ry: 20, col: false, ao: false });
    for (let k = 0; k < 6; k++) w.box(nx - 3 + (k % 3) * 3, ny - 0.2, nz - 1.5 + Math.floor(k / 3) * 3, 2.2, 1.6, 1.6, 0x5c6a44, { mat: "paint" }); }
  void ctx;
}

// ── 전방 캠프(보급 착륙장 둘레): 천막 둘과 모닥불 통, 깃대 ──
export function camps(w, K, list) {
  const r = w.rand;
  list.forEach(([x, z], i) => {
    const a0 = r() * 360;
    for (let k = 0; k < 2; k++) {
      const a = (a0 + k * 130) * DEG, tx = x + Math.cos(a) * 13.5, tz = z + Math.sin(a) * 13.5, ty = w.h(tx, tz) - 0.3, ry = -(a0 + k * 130);
      const F = frame(w, tx, tz, ry, ty);
      F.box(0, 0, 0, 4, 1.6, 6, 0x77806a, { mat: "paint" });
      w.mesh(G.cyl6, M(tx, ty + 1.9, tz, 1.7, 6.2, 2.3, 0, ry + 90, 90), 0x8a9478, "paint"); w.mesh(G.cyl6, M(tx, ty + 2.4, tz, 1.35, 5.6, 1.9, 0, ry + 90, 90), SNOW, "std");
      w.col.addSphere(V3(tx, ty + 1.8, tz), 2.6);
      F.box(-2.02, 0.2, 0, 0.08, 1.2, 1.2, WARM, { mat: "glow", col: false });
    }
    const a = (a0 + 250) * DEG, bx = x + Math.cos(a) * 11, bz = z + Math.sin(a) * 11, by = w.h(bx, bz);
    w.cyl(bx, by - 0.2, bz, 0.5, 1.1, 0x3a3a40, { mat: "paint" }); w.box(bx, by + 0.9, bz, 0.6, 0.5, 0.6, FIRE, { mat: "glow", col: false }); w.pool(bx, by + 0.1, bz, 7, FIRE, 0.5);
    for (let k = 0; k < 3; k++) { const cx = bx + 2 + k * 1.6, cz = bz + 2.4 - k; w.box(cx, w.h(cx, cz) - 0.1, cz, 1.4, 1 + r() * 0.6, 1.4, k % 2 ? 0x7a6a4a : 0x5c6a54, { ry: r() * 40, mat: "paint" }); }
    const fa = (a0 + 190) * DEG, fx = x + Math.cos(fa) * 12, fz = z + Math.sin(fa) * 12, fy = w.h(fx, fz);
    w.pipe(fx, fy, fz, fx, fy + 7, fz, 0.09, 0xd8dde4, { col: false }); w.box(fx + 1, fy + 5.9, fz, 1.9, 1.2, 0.06, i % 2 ? ORG : 0x2f6fb0, { col: false, ao: false }); K.blink.add(fx, fy + 7.4, fz, AMB, 0.25, i);
  });
}

// ── 고갯길: 붉은 띠 표지 막대, 전신주, 버려진 수송 차량 ──
export function roadside(w, K, ctx) {
  const r = w.rand, n = Math.floor(ROAD.len / 20);
  for (let i = 0; i < n; i++) {
    const t = i / n, [x, z] = ROAD.point(t), [dx, dz] = ROAD.dir(t);
    if (Math.hypot(x, z) > 330 || flatK(x, z) > 0.5 && x > 96) continue;
    if (x > BRIDGE.x0 - 8 && x < BRIDGE.x1 + 8 && x < 0) continue;
    for (const s of [-1, 1]) { const px = x - dz * s * 5.4, pz = z + dx * s * 5.4, py = w.h(px, pz); w.box(px, py - 0.3, pz, 0.14, 2.3, 0.14, 0x2b313b, { col: false }); w.box(px, py + 1.5, pz, 0.2, 0.4, 0.2, i % 4 ? ORG : AMB, { mat: i % 4 ? "paint" : "glow", col: false }); }
    // 전신주: 고개 쪽 길 북편
    if (i % 2 === 0 && (x > 200 || x < -110)) { const px = x - dz * 8.5, pz = z + dx * 8.5, py = w.h(px, pz) - 0.4; if (canyonAt(px, pz)[0] > 0 || !ctx.free(px, pz, 2)) continue; w.pipe(px, py, pz, px + 0.4, py + 9, pz, 0.16, 0x4a3a2c, {}); beam(w, [px - dx * 1.3, py + 8.2, pz - dz * 1.3], [px + dx * 1.3, py + 8.2, pz + dz * 1.3], 0.14, 0x4a3a2c, { col: false }); drift(w, px, py + 0.5, pz, 1.2, 0.5, 1.2); }
  }
  // 버려진 수송 트럭(눈에 반쯤 묻혔다)과 뒤집힌 썰매
  for (const [x, z, ry, tilt] of [[228, -70, 40, 0], [262, -108, 20, 14], [-222, 24, 8, -12], [-96, 44, 100, 0]]) {
    if (!ctx.free(x, z, 3)) continue;
    const g = new Rig(w, x, w.h(x, z) + 0.2, z, 0, ry, tilt);
    g.box(0, 1.5, 1.6, 2.6, 2, 5.4, OLIVE).box(0, 1.4, -2.3, 2.5, 1.8, 2.2, 0x56604a).box(0, 2.3, -2.4, 2.3, 0.7, 1.6, 0x2a3440, { col: false }).box(0, 2.7, 1.6, 2.7, 0.3, 5.5, SNOW, { mat: "std", col: false }).box(0, 2.9, -2.3, 2.4, 0.25, 2, SNOW, { mat: "std", col: false });
    for (const s of [-1, 1]) for (const v of [-2.2, 0.6, 3]) g.pipe([s * 1.35, 0.5, v], [s * 1.0, 0.5, v], 0.6, INK, { col: false });
    drift(w, x + 1.6, w.h(x, z) + 0.5, z + 1, 3.4, 1, 2.4);
  }
  void hash;
}

// ── 바위·고사목·눈 덮인 소나무: 둘레 산자락과 빙붕 위 ──
export function scatter(w, K, T, ctx) {
  const r = w.rand, slope = (x, z) => Math.max(Math.abs(w.h(x + 2, z) - w.h(x - 2, z)), Math.abs(w.h(x, z + 2) - w.h(x, z - 2))) / 4;
  let n = 0;
  for (let i = 0; i < 3200 && n < 460; i++) {
    const a = r() * Math.PI * 2, d = 120 + Math.pow(r(), 0.8) * 330, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (flatK(x, z) > 0.2 || lakeE(x, z) < 1.12 || canyonAt(x, z)[0] > 0 || ROAD.at(x, z) && ROAD.at(x, z)[0] < 10 || !ctx.free(x, z, 3)) continue;
    const y = w.h(x, z), sl = slope(x, z), k = r();
    if (sl > 0.5) continue;
    if (Math.hypot(x, z) > 232 && y < 90 && sl < 0.42 && k < 0.8) {
      // 눈을 뒤집어쓴 소나무 (둘레 산자락에만)
      const s = 0.8 + r() * 0.7, h = (8 + r() * 7) * s, g = new THREE.Color().setHSL(0.42 + r() * 0.04, 0.36, 0.13 + r() * 0.04).getHex();
      w.mesh(T.trunk, M(x, y - 0.3, z, 0.3 * s, h * 0.5, 0.3 * s), 0x3f3026, "std");
      for (let j = 0; j < 3; j++) { const t = j / 2, rr = (2.8 - t * 1.8) * s, hh = h * (0.44 - t * 0.07), yy = y - 0.3 + h * (0.16 + t * 0.27); w.mesh(T.coneC, M(x, yy, z, rr, hh, rr, 0, r() * 360, 0), g, "foliage"); w.mesh(T.coneO, M(x, yy + hh * 0.42, z, rr * 0.66, hh * 0.6, rr * 0.66, 0, r() * 360, 0), SNOW, "foliage"); }
      w.col.addCapsule(V3(x, y, z), V3(x, y + h * 0.85, z), 0.7 * s); n++;
    } else if (k < 0.12) {
      // 고사목
      const s = 0.8 + r() * 0.6, h = (4 + r() * 4) * s;
      w.mesh(T.trunk, M(x, y - 0.3, z, 0.26 * s, h, 0.26 * s, (r() - 0.5) * 10, 0, (r() - 0.5) * 10), 0x4a4038, "std");
      for (let j = 0; j < 3; j++) { const b = r() * 6.28, yy = y + h * (0.45 + j * 0.16), l = (1.4 + r() * 1.2) * s; beam(w, [x, yy, z], [x + Math.cos(b) * l, yy + l * 0.6, z + Math.sin(b) * l], 0.12 * s, 0x4a4038, { mat: "std", col: false }); }
      w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.3 * s); n++;
    } else if (k < 0.26) {
      // 눈에 묻힌 바위
      const s = 1.2 + r() * 2.4; w.mesh(T.rock[(r() * 4) | 0], M(x, y + s * 0.15, z, s * 1.2, s * 0.7, s, 0, r() * 360, 0), 0x7a86a0, "std:rock"); drift(w, x, y + s * 0.5, z, s * 1.05, s * 0.4, s * 0.95);
      if (s > 2.2) w.col.addSphere(V3(x, y + s * 0.15, z), s * 0.65); n++;
    } else if (k < 0.6) { drift(w, x, y + 0.2, z, 3 + r() * 4, 0.7 + r() * 0.8, 2 + r() * 2.4, r() < 0.5 ? SNOW : SNOW_SH); n++; }
  }
  // 평지의 눈 더미: 건물과 코스를 피해 군데군데
  for (let i = 0; i < 150; i++) { const x = -90 + r() * 330, z = -134 + r() * 244; if (ctx.free(x, z, 5) && ctx.open(x, z)) drift(w, x, 0.1, z, 2.5 + r() * 4, 0.5 + r() * 0.7, 1.6 + r() * 2, r() < 0.5 ? SNOW : SNOW_SH); }
  void CONC; void HULL; void HULL2; void CYA; void LAKE; void FLOOR; void ICE_K; void icicle;
}
