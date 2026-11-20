// 제국 궤도 발사기지 소품과 움직임: 조립동, 계류장 수송정과 바닥 문양, 둘레 성벽과 감시탑, 투광등 기둥, 야적 소품, 보안 감지망, 방파제 사석,
// 그리고 움직이는 것들 — 도는 레이더·크레인 화물·순찰 드론·감지 고리·부표·먼바다 경비정·갈매기
import {
  THREE, M, beam, prop, merged, ring, octa, ball, V3, DEG, hash, sm, local, paint, strip, mast, coast, madeD, southZ, eastX,
  BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, HAZ, CONC2, CONC3, ASPH2, WHT, HULL, HULL2,
  WY, SEA, ELEV, RING_R, SHAFT, PADS, PAD_R, PIERS, MOLE, MOLE_R, BASTION, TIP, PLATS, QUAY_Z,
} from "./spaceport-kit.js";
import { gulls } from "./island-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const WARM = 0xffc98a;
export const VAB = { x: -62, z: -136, w: 34, d: 30, h: 52, door: 14, dh: 38 };

// 공용 움직임: K.spin(도는 것), K.loads(크레인 화물)
export function movers(w, K) {
  w.updaters.push((dt, t) => {
    for (const [m, sp] of K.spin) m.rotation.y = t * sp;
    for (const l of K.loads) { const u = (Math.sin(t * 0.13 + l.ph) + 1) / 2, k = u * u * (3 - 2 * u); l.m.position.x = l.x0 + (l.x1 - l.x0) * k; }
  });
}

// ═══════════ 조립동: 세로로 긴 문이 남북으로 뚫린 검은 덩어리 ═══════════
export function assembly(w, K) {
  const { x, z, w: W, d: D, h: H, door, dh } = VAB, sw = (W - door) / 2;
  for (const s of [-1, 1]) {
    const bx = x + s * (door / 2 + sw / 2);
    w.box(bx, 0, z, sw, H, D, BLK, { mat: "std:panel", tile: 8 });
    w.box(bx, 0, z, sw + 1.6, 3, D + 1.6, IRON, { col: false, mat: "paint" });
    for (const e of [-1, 1]) {
      w.box(x + s * (door / 2 + 0.2), 2, z + e * (D / 2 + 0.06), 0.5, dh - 3, 0.2, RED, { mat: "glow", col: false });
      w.box(bx, 6, z + e * (D / 2 + 0.06), 0.5, H - 14, 0.2, RED, { mat: "glow", col: false });
      w.box(bx, H - 6, z + e * (D / 2 + 0.06), sw - 2, 0.6, 0.2, RED2, { mat: "glow", col: false });
    }
    w.box(x + s * (W / 2 + 0.06), 8, z, 0.2, H - 18, 0.5, RED, { mat: "glow", col: false });
    for (let y = 14; y < H - 4; y += 12) w.box(bx, y, z, sw + 0.5, 0.7, D + 0.5, IRON, { col: false });
    // 옆 부속동
    w.box(x + s * (W / 2 + 6), 0, z + s * 4, 12, 9, 18, BLK2, { mat: "std:panel", tile: 5 });
    w.box(x + s * (W / 2 + 6), 9, z + s * 4, 12.6, 0.5, 18.6, IRON, { col: false });
    w.box(x + s * (W / 2 + 12.05), 4, z + s * 4, 0.15, 0.7, 14, RED, { mat: "glow", col: false });
    K.blink.add(x + s * (W / 2 - 1), H + 1.2, z - D / 2 + 1, RED, 0.5, s > 0); K.blink.add(x + s * (W / 2 - 1), H + 1.2, z + D / 2 - 1, RED, 0.5, s < 0);
  }
  w.box(x, dh, z, door, H - dh, D, BLK2, { mat: "std:panel", tile: 8 });
  for (const e of [-1, 1]) w.box(x, dh + 0.3, z + e * (D / 2 + 0.06), door, 0.6, 0.2, RED, { mat: "glow", col: false });
  w.box(x, H, z, W + 1, 1, D + 1, IRON, { col: false });
  for (const [ox, oz, s] of [[-9, -6, 5], [8, 5, 4], [0, -2, 3]]) { w.box(x + ox, H + 1, z + oz, s, 2.2 + s * 0.4, s, BLK2, { col: false, mat: "std:panel", tile: 3 }); }
  w.pipe(x + 12, H + 1, z - 10, x + 12, H + 19, z - 10, 0.25, GUN, { col: false }); K.blink.add(x + 12, H + 19.6, z - 10, RED, 0.5, 0);
  for (let k = -1; k <= 1; k++) w.box(x, dh - 0.4, z + k * 10, door - 1, 0.3, 0.8, 0xffe6c0, { mat: "glow", col: false });
  paint(w, x, z, 0.5, D + 30, HAZ, 0.1); for (const s of [-1, 1]) paint(w, x + s * 5.5, z, 0.3, D + 30, WHT, 0.1);
  w.gap("조립동 문 관통", x, dh / 2, z, 0, door - 2, dh - 4, 500);
}

// ═══════════ 계류장: 세워 둔 제국 수송정, 바닥 문양 ═══════════
function parkedShuttle(w, x, z, ry) {
  const L = local(x, z, ry), B = (u, y, v, su, sy, sv, c, o = {}) => { const [px, pz] = L(u, v); return w.box(px, y, pz, su, sy, sv, c, { col: false, ...o, ry: ry + (o.ry || 0) }); };
  B(0, 1.2, 0, 4.2, 3, 12, BLK2, { mat: "std:panel", tile: 4, col: true });
  B(0, 1.5, -7.4, 3.2, 2.2, 3, BLK, {}); B(0, 1.9, -9.3, 2, 1.2, 1.2, IRON, {});
  B(0, 3.5, -6.2, 2.4, 0.5, 1.6, RED2, { mat: "glow" });
  for (const s of [-1, 1]) {
    B(s * 5, 1.9, 1.6, 6.6, 0.4, 5.2, IRON, { ry: -s * 16, mat: "paint" }); B(s * 8.1, 1.9, 3.2, 0.5, 1.6, 3.4, DRED, { ry: -s * 16 });
    B(s * 2.9, 1.3, 4.4, 1.9, 1.9, 4.6, IRON, { mat: "paint" }); B(s * 2.9, 1.65, 6.75, 1.3, 1.2, 0.12, ORG, { mat: "glow" });
    B(s * 1.5, 4.2, 4.4, 0.3, 2.8, 3, BLK, { rz: -s * 14 });
    B(s * 1.5, 0, -2.4, 0.5, 1.2, 0.5, GUN, {}); B(s * 1.5, 0, 3.2, 0.5, 1.2, 0.5, GUN, {}); B(s * 1.5, 0, 0.4, 0.6, 0.25, 7.4, GUN, {});
    B(s * 2.13, 2.4, -0.5, 0.06, 0.35, 9, RED, { mat: "glow" });
  }
  B(0, 4.2, 0, 4.3, 0.12, 9, DRED, {});
}
export function apron(w, K, ctx) {
  const stands = [[-124, 40, 0], [-102, 40, 0], [-80, 40, 0], [98, -6, 90], [74, 16, 180]];
  for (const [x, z, ry] of stands) {
    if (!ctx.free(x, z, 6)) continue;
    parkedShuttle(w, x, z, ry); ctx.taken.push([x, z, 10]);
    ring(w, x, 0.1, z, 10.5, 0.2, HAZ, { pitch: 90, col: false, seg: 32 });
    for (let k = 0; k < 4; k++) { const a = k * 90 + 45; K.blink.add(x + Math.cos(a * DEG) * 10.5, 0.4, z + Math.sin(a * DEG) * 10.5, RED, 0.25, k); }
  }
  // 출발 자리 앞 바닥 문양: 엘리베이터를 가리키는 갈매기 무늬와 제국 문장
  const [ex] = ELEV;
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) paint(w, ex + s * 3.4, 46 - k * 7, 7.6, 1.1, k % 2 ? HAZ : WHT, 0.09, s * 32);
  ring(w, ex, 0.09, 66, 7, 0.3, RED, { pitch: 90, col: false, mat: "glow", seg: 32 });
  ring(w, ex, 0.09, 66, 9, 0.25, HAZ, { pitch: 90, col: false, seg: 32 });
  for (const s of [-1, 1]) for (let z = 14; z < 60; z += 9) w.box(ex + s * 12, 0.08, z, 0.35, 0.06, 4.5, RED, { mat: "glow", col: false });
  // 계류장 가장자리 붉은 유도등
  for (let x = -126; x <= 78; x += 12) { w.box(x, 0, 60.5, 0.5, 0.35, 0.5, IRON, { col: false }); ball(w, x, 0.5, 60.5, 0.2, x % 24 ? RED : WHT); }
}

// ═══════════ 둘레 성벽과 감시탑 (맵 경계 바깥) ═══════════
export function perimeter(w, K) {
  const W0 = 238, seg = (ax, az, bx, bz) => {
    w.wall(ax, az, bx, bz, 7, 2.4, BLK2, { mat: "std:panel", tile: 7, y: 0 });
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx) / DEG, nx = -dz / L, nz = dx / L;
    w.box((ax + bx) / 2, 7, (az + bz) / 2, L, 0.7, 3, IRON, { ry, col: false });
    w.box((ax + bx) / 2 + nx * 1.25, 4.4, (az + bz) / 2 + nz * 1.25, L - 6, 0.4, 0.12, RED, { ry, mat: "glow", col: false });
    w.box((ax + bx) / 2 - nx * 1.25, 4.4, (az + bz) / 2 - nz * 1.25, L - 6, 0.4, 0.12, RED, { ry, mat: "glow", col: false });
  };
  const tower = (x, z, i) => {
    w.box(x, 0, z, 7, 15, 7, BLK, { mat: "std:panel", tile: 6 }); w.box(x, 15, z, 9, 3.4, 9, BLK2, { mat: "std:panel", tile: 4 });
    w.box(x, 16, z, 9.2, 1, 9.2, WARM, { mat: "glow", col: false }); w.box(x, 18.4, z, 9.6, 0.6, 9.6, IRON, { col: false });
    w.pipe(x, 19, z, x, 27, z, 0.2, GUN, { col: false }); K.blink.add(x, 27.5, z, RED, 0.5, i);
  };
  const xe = 252, zs = 90;
  for (let x = -W0; x < xe; x += 70) { seg(x, -W0, Math.min(xe, x + 70), -W0); tower(x, -W0, x / 70); }
  tower(xe, -W0, 1);
  for (let z = -W0; z < zs; z += 82) { seg(-W0, z, -W0, Math.min(zs, z + 82)); if (z > -W0) tower(-W0, z, z / 82); }
  tower(-W0, zs, 0);
}

// ═══════════ 투광등 기둥과 야적 소품 (빈 자리를 찾아 채운다) ═══════════
function floodMast(w, K, x, z, h, i) {
  w.box(x, 0, z, 2.2, 1, 2.2, CONC3, { col: false });
  mast(w, x, 1, z, 0.7, h - 1, Math.round(h / 5), IRON, { t: 0.22, taper: 0.5, col: false });
  w.col.addCapsule(V3(x, 0, z), V3(x, h, z), 0.7);
  w.box(x, h, z, 4.6, 0.3, 1.2, BLK2, { col: false, ry: i * 47 }); w.box(x, h + 0.3, z, 4.2, 1.1, 0.5, 0xfff2d6, { mat: "glow", col: false, ry: i * 47 });
  K.blink.add(x, h + 2, z, RED, 0.35, i);
}
export function yard(w, K, ctx) {
  const r = w.rand, { free, cap, taken } = ctx, COL = [DRED, 0x30343c, RUST, 0x4a4e57, BLK2, 0x6a2a22];
  let n = 0;
  // 투광등: 46 m 격자
  for (let gx = -207; gx <= 180; gx += 46) for (let gz = -207; gz <= 60; gz += 46) {
    const x = gx + (r() - 0.5) * 16, z = gz + (r() - 0.5) * 16;
    if (!free(x, z, 3) || cap(x, z, 3) < 26) continue;
    floodMast(w, K, x, z, 20 + ((r() * 3) | 0) * 2, n++); taken.push([x, z, 4]);
  }
  // 소품: 20 m 격자에서 확률로
  for (let gx = -222; gx <= 200; gx += 20) for (let gz = -222; gz <= 66; gz += 20) {
    if (r() < 0.42) continue;
    const x = gx + (r() - 0.5) * 12, z = gz + (r() - 0.5) * 12, k = r(), ry = ((r() * 4) | 0) * 90 + (r() < 0.3 ? 20 : 0);
    if (!free(x, z, 7)) continue;
    const hc = cap(x, z, 7), nearPad = PADS.some((p) => Math.hypot(x - p.x, z - p.z) < 80);
    if (k < 0.2) {            // 컨테이너 더미
      const m = 1 + ((r() * 2) | 0); for (let i = 0; i < m && (i + 1) * 2.6 < hc; i++) w.container(x, i * 2.6, z, ry, COL[(r() * COL.length) | 0]);
      if (r() < 0.5) w.container(x + Math.sin(ry * DEG) * 3, 0, z + Math.cos(ry * DEG) * 3, ry, COL[(r() * COL.length) | 0]);
    } else if (k < 0.38) {    // 상자 더미
      for (let i = 0; i < 4; i++) { const s = 1.2 + r() * 1.4; w.box(x + (r() - 0.5) * 5, 0, z + (r() - 0.5) * 5, s, s * (0.7 + r() * 0.5), s, i % 2 ? 0x4a4e57 : DRED, { ry: r() * 90, col: i === 0, mat: "std:corrug", tile: 2 }); }
    } else if (k < 0.52) {    // 누운 연료통(발사대 근처) 또는 드럼통
      if (nearPad) { const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG); w.pipe(x - c * 4.5, 2.4, z + s * 4.5, x + c * 4.5, 2.4, z - s * 4.5, 2, r() < 0.5 ? WHT : RUST, {}); for (const e of [-1, 1]) w.box(x + e * c * 3, 0, z - e * s * 3, 1, 1.4, 3.6, IRON, { ry, col: false }); ring(w, x, 2.4, z, 2.05, 0.2, DRED, { yaw: ry + 90, col: false, seg: 16 }); }
      else for (let i = 0; i < 6; i++) w.cyl(x + (i % 3) * 1.3 - 1.3, 0, z + ((i / 3) | 0) * 1.3, 0.55, 1.5, i % 2 ? DRED : 0x30343c, { col: i === 0 });
    } else if (k < 0.66) {    // 낮은 벙커
      w.box(x, 0, z, 9, 3.4, 6.5, BLK2, { ry, mat: "std:panel", tile: 4 }); w.box(x, 3.4, z, 9.6, 0.5, 7.1, IRON, { ry, col: false });
      const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG); w.box(x + s * 3.3, 1.6, z + c * 3.3, 6, 0.5, 0.15, RED, { ry, mat: "glow", col: false });
      if (hc > 12) { w.pipe(x, 3.9, z, x, 10, z, 0.12, GUN, { col: false }); K.blink.add(x, 10.4, z, RED, 0.3, n++); }
    } else if (k < 0.78) {    // 발전기와 배기통
      w.box(x, 0, z, 5, 2.6, 3, 0x30343c, { ry, mat: "std:corrug", tile: 2 }); w.box(x, 2.6, z, 1, 1.6, 1, IRON, { col: false }); w.box(x, 0.9, z, 5.1, 0.3, 3.1, HAZ, { ry, col: false });
      if (r() < 0.35) K.vap.add(x, 4.4, z, 0.9, 7, 2, [0.5, 0.2], 0.16);
    } else if (k < 0.9) {     // 세워 둔 연료 트럭
      const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
      w.box(x, 0.5, z, 7.4, 0.5, 2.5, IRON, { ry, col: false }); w.pipe(x - c * 0.6 - c * 2.6, 2.2, z + s * 0.6 + s * 2.6, x - c * 0.6 + c * 2.6, 2.2, z + s * 0.6 - s * 2.6, 1.2, WHT, {});
      w.box(x + c * 3, 1, z - s * 3, 2, 2.2, 2.4, DRED, { ry }); w.box(x + c * 4.02, 2.1, z - s * 4.02, 0.08, 0.7, 1.9, WARM, { ry, mat: "glow", col: false });
      for (const e of [-2.4, 0, 2.6]) for (const q of [-1, 1]) w.cyl(x + c * e + s * q * 1.15, 0, z - s * e + c * q * 1.15, 0.5, 1, 0x1a1c20, { col: false });
    } else if (hc > 20) {     // 안테나 기둥
      w.box(x, 0, z, 2, 1.2, 2, CONC3, { col: false }); w.pipe(x, 1.2, z, x, 16, z, 0.16, GUN, {});
      for (const y of [9, 12.5]) w.box(x, y, z, 2.6, 0.12, 0.12, GUN, { col: false, ry: y * 31 }); K.blink.add(x, 16.4, z, RED, 0.3, n++);
    }
    taken.push([x, z, 8]);
  }
}

// ═══════════ 보안 감지망: 항만의 감지 기둥(도는 붉은 부채살)과 엘리베이터 축 속을 오르내리는 감지 고리 ═══════════
export function sensorNet(w, K) {
  const fanG = new THREE.BufferGeometry();
  fanG.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 34, -14, 5, 34, -14, -5, 0, 0, 0, -34, -14, -5, -34, -14, 5], 3));
  const fanM = new THREE.MeshBasicMaterial({ color: 0xff3a30, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  w.disposables.push(fanG, fanM);
  const pylon = (x, z, h, i) => {
    w.cyl(x, 0, z, 0.9, h, BLK, { rt: 0.4, mat: "paint" });
    octa(w, x, h, z, 1.6, 1.4, IRON, { col: false }); ball(w, x, h + 2, z, 0.8, RED);
    ring(w, x, h * 0.55, z, 1.2, 0.14, RED, { pitch: 90, col: false, mat: "glow", seg: 12 });
    const f = new THREE.Mesh(fanG, fanM); f.position.set(x, h + 2, z); f.renderOrder = 6; f.frustumCulled = false; f.userData.toonDone = true; w.scene.add(f);
    K.spin.push([f, (i % 2 ? -1 : 1) * (0.5 + (i % 3) * 0.12)]);
  };
  [[-126, 72, 18], [-58, 76.5, 16], [90, 72, 16], [144, 131.3, 18], [176.5, 214, 14], [160, 16, 16], [-150, 86, 16], [134, -6, 16]].forEach(([x, z, h], i) => pylon(x, z, h, i));
  // 축 속 감지 고리: 네모난 붉은 테가 층 사이를 오르내린다 (가운데는 비어 있다)
  const [cx, cz] = ELEV, hf = SHAFT.half - 2.4, parts = [];
  for (const s of [-1, 1]) { parts.push([BOXG, M(0, 0, s * hf, hf * 2, 0.22, 0.22), RED]); parts.push([BOXG, M(s * hf, 0, 0, 0.22, 0.22, hf * 2), RED]); parts.push([BOXG, M(s * hf, 0, s * hf, 0.7, 0.7, 0.7), 0xffd0a0], [BOXG, M(-s * hf, 0, s * hf, 0.7, 0.7, 0.7), 0xffd0a0]); }
  const rings = [0, 1, 2, 3].map((i) => { const m = prop(w, parts, "glow", false); m.position.set(cx, 60, cz); return m; });
  w.updaters.push((dt, t) => rings.forEach((m, i) => { const u = (t * 0.045 + i / 4) % 1, k = u < 0.5 ? u * 2 : 2 - u * 2; m.position.y = 16 + k * 200; m.rotation.y = 0; }));
}

// ═══════════ 물가: 방파제 사석, 해변 바위, 부표 ═══════════
export function shore(w, K) {
  const r = w.rand, [a, b, c] = MOLE, dx = b[0] - a[0], dz = b[1] - a[1], L1 = Math.hypot(dx, dz), ux = dx / L1, uz = dz / L1, nx = uz, nz = -ux;
  const stone = (x, z) => w.blob(x, WY + 0.4 + r() * 1.2, z, 2 + r() * 1.6, 1.4 + r() * 1, 2 + r() * 1.6, r() < 0.5 ? 0x6a6c6e : 0x55585c, { col: false, mat: "std:rock", grad: [0.6, 1.08] });
  for (let d = 22; d < L1 - 30; d += 5.5) stone(a[0] + ux * d + nx * (MOLE_R + 6.5 + r() * 2), a[1] + uz * d + nz * (MOLE_R + 6.5 + r() * 2));
  for (let z = b[1] + 36; z < c[1] - 4; z += 5.5) stone(b[0] + MOLE_R + 6.5 + r() * 2, z);
  for (let an = -80; an < 60; an += 7) stone(BASTION[0] + Math.cos(an * DEG) * (BASTION[2] + 7 + r() * 2), BASTION[1] + Math.sin(an * DEG) * (BASTION[2] + 7 + r() * 2));
  // 서쪽 해변과 북동 자연 해안의 바위
  for (let x = -236; x < -150; x += 9) { const z = southZ(x) - 2 + r() * 10; if (r() < 0.6) w.rock(x + r() * 4, z, 1.2 + r() * 2.2, r() < 0.5 ? 0x8a847a : 0x77726a); }
  for (let z = -230; z < -60; z += 8) { const x = eastX(z) - 2 + r() * 9; if (r() < 0.6) w.rock(x, z + r() * 4, 1.4 + r() * 2.6, r() < 0.5 ? 0x7d7a74 : 0x6a6660); }
  // 부표: 항로 표지 (한 메시, 물결에 까딱인다)
  const cone = new THREE.ConeGeometry(0.9, 2.6, 8), cyl = new THREE.CylinderGeometry(1.1, 1.1, 0.9, 10), lamp = new THREE.SphereGeometry(0.35, 6, 5);
  const g = merged([[cyl, M(0, 0.2, 0), DRED], [cone, M(0, 1.9, 0), 0xd8d8d4], [lamp, M(0, 3.4, 0), 0xff5040]]);
  const SP = [[-166, 128], [-166, 186], [-95, 226], [-20, 228], [60, 226], [130, 214], [136, 150], [80, 170], [150, 82], [216, 92], [224, 0], [166, -20], [226, -100], [140, 60]];
  const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }), SP.length); im.frustumCulled = false; w.scene.add(im); w.disposables.push(g, im.material);
  const o = new THREE.Object3D();
  w.updaters.push((dt, t) => { SP.forEach(([x, z], i) => { o.position.set(x, WY + Math.sin(t * 1.3 + i * 1.7) * 0.18, z); o.rotation.set(Math.sin(t * 0.9 + i) * 0.12, 0, Math.cos(t * 1.1 + i * 2) * 0.12); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.instanceMatrix.needsUpdate = true; });
}

// ═══════════ 떠다니는 것: 순찰 드론(한 메시), 먼바다 경비정, 갈매기 ═══════════
export function life(w, K) {
  // 순찰 드론: 납작한 검은 몸통에 붉은 눈. 구역마다 타원을 돈다
  const body = new THREE.OctahedronGeometry(1, 0), arm = new THREE.BoxGeometry(1, 1, 1);
  const dg = merged([[body, M(0, 0, 0, 1.5, 0.5, 1.5), BLK2], [arm, M(0, 0, 0, 4.4, 0.18, 0.4), IRON], [arm, M(0, 0, 0, 0.4, 0.18, 4.4), IRON], [body, M(0, -0.35, -0.9, 0.35, 0.35, 0.35), 0xff4030],
    [arm, M(2.2, 0.2, 0, 1.1, 0.1, 1.1), 0x555a62], [arm, M(-2.2, 0.2, 0, 1.1, 0.1, 1.1), 0x555a62], [arm, M(0, 0.2, 2.2, 1.1, 0.1, 1.1), 0x555a62], [arm, M(0, 0.2, -2.2, 1.1, 0.1, 1.1), 0x555a62]]);
  const [ex, ez] = ELEV;
  const LOOPS = [[ex, ez, 62, 62, 24, 0.22], [ex, ez, 62, 62, 24, 0.22, Math.PI], [ex, ez, 44, 44, 52, -0.3], [-55, 140, 70, 46, 44, 0.2], [-55, 140, 70, 46, 44, 0.2, 2.6], [150, 150, 46, 60, 34, -0.24],
    [-150, -120, 70, 60, 110, 0.16], [-100, -160, 90, 40, 116, -0.15, 2], [110, -115, 52, 34, 36, 0.24], [190, 0, 34, 60, 30, -0.26], [-100, 30, 60, 30, 30, 0.25], [50, -180, 50, 26, 44, -0.22]];
  const im = new THREE.InstancedMesh(dg, new THREE.MeshLambertMaterial({ vertexColors: true }), LOOPS.length); im.frustumCulled = false; w.scene.add(im); w.disposables.push(dg, im.material);
  const o = new THREE.Object3D();
  w.updaters.push((dt, t) => {
    LOOPS.forEach(([cx, cz, rx, rz, y, sp, ph = 0], i) => {
      const a = t * sp + ph + i;
      o.position.set(cx + Math.cos(a) * rx, y + Math.sin(t * 0.5 + i) * 1.5, cz + Math.sin(a) * rz);
      o.rotation.set(0, -a + (sp > 0 ? Math.PI : 0), 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  // 먼바다 경비정: 맵 밖 바다를 오가는 작은 배 (한 메시)
  const hull = new THREE.BoxGeometry(1, 1, 1), bow = new THREE.ConeGeometry(1, 1, 4);
  const bg = merged([[hull, M(0, 0.9, 1, 5, 2.4, 14), HULL], [bow, M(0, 0.9, -9, 3.5, 6, 2.4, -90, 45, 0), HULL], [hull, M(0, 3.2, 2, 3.6, 2.6, 5), BLK2], [hull, M(0, 5, 2.4, 2.4, 1.4, 2.6), IRON], [hull, M(0, 7.5, 2.4, 0.25, 4, 0.25), IRON], [hull, M(0, 2.25, 1, 5.1, 0.3, 13), 0x8a1018], [hull, M(0, 0.2, 9, 7, 0.3, 6), 0xdfeaf0]]);
  const BOATS = [[300, -60, 300, 300, 9, 0], [420, 240, -200, 330, 8, 2], [-260, 300, 240, 330, 10, 4], [330, -240, 262, 60, 7, 1], [-80, 300, 150, 290, 9, 3]];
  const bm = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true }), BOATS.length); bm.frustumCulled = false; w.scene.add(bm); w.disposables.push(bg, bm.material);
  w.updaters.push((dt, t) => {
    BOATS.forEach(([ax, az, bx, bz, sp, ph], i) => {
      const L = Math.hypot(bx - ax, bz - az), u = ((t * sp + ph * 90) / L) % 2, k = u < 1 ? u : 2 - u, dir = u < 1 ? 1 : -1;
      o.position.set(ax + (bx - ax) * k, WY - 0.6 + Math.sin(t * 1.1 + i) * 0.15, az + (bz - az) * k);
      o.rotation.set(0, Math.atan2(-(bx - ax) * dir, -(bz - az) * dir), 0); o.updateMatrix(); bm.setMatrixAt(i, o.matrix);
    });
    bm.instanceMatrix.needsUpdate = true;
  });
  // 갈매기: 서쪽 해변과 바깥 바다 위
  gulls(w, [[-200, 34, 150, 30, 8, 0], [-60, 46, 250, 40, -8, 2], [120, 40, 250, 36, 8, 4], [250, 36, 60, 34, -9, 1], [-250, 30, 110, 26, 8, 3], [230, 44, -160, 30, 8, 5]]);
}

// 기지 곳곳의 증기 배출구와 경광등
export function vents(w, K, ctx) {
  const [ex, ez] = ELEV;
  for (const a of [22.5, 112.5, 202.5, 292.5]) { const x = ex + Math.cos(a * DEG) * 31, z = ez + Math.sin(a * DEG) * 31; w.cyl(x, 25, z, 1.3, 2.4, IRON, { col: false }); K.vap.add(x, 27.5, z, 1.8, 16, 3, [0.4, 0.2], 0.1); }
  for (const p of PADS) for (const a of [35, 145, 215, 325]) {
    const x = p.x + Math.cos((a + p.ta) * DEG) * (PAD_R + 5), z = p.z + Math.sin((a + p.ta) * DEG) * (PAD_R + 5);
    if (ctx.nearRoad(x, z, 7)) continue;
    w.cyl(x, 0, z, 0.25, 13, GUN, { col: false }); w.box(x, 13, z, 1.6, 0.9, 1.6, HAZ, { col: false }); ball(w, x, 14.4, z, 0.6, ORG);
    const bar = prop(w, [[BOXG, M(0, 0, 0, 3.2, 0.35, 0.5), 0xffb040]], "glow", false); bar.position.set(x, 14.4, z); K.spin.push([bar, 3 + (a % 7) * 0.2]);
  }
}

// ═══════════ 발사 통제소: 북서 모서리의 계단식 벙커와 큰 접시 ═══════════
export const LCC = [-208, -196];
export function control(w, K) {
  const [x, z] = LCC;
  w.box(x, 0, z, 30, 6, 22, BLK2, { mat: "std:panel", tile: 6 }); w.box(x, 6, z, 30.8, 0.6, 22.8, IRON, { col: false });
  w.box(x - 3, 6.6, z - 2, 20, 5, 14, BLK, { mat: "std:panel", tile: 5 }); w.box(x - 3, 11.6, z - 2, 20.8, 0.6, 14.8, IRON, { col: false });
  w.box(x - 3, 8.4, z + 5.05, 17, 1.6, 0.2, WARM, { mat: "glow", col: false }); w.box(x + 7.05, 8.4, z - 2, 0.2, 1.6, 11, WARM, { mat: "glow", col: false });
  w.box(x, 2.6, z + 11.05, 26, 0.6, 0.2, RED, { mat: "glow", col: false }); w.box(x + 15.05, 2.6, z, 0.2, 0.6, 18, RED, { mat: "glow", col: false });
  w.box(x - 7, 12.2, z - 4, 6, 4, 6, BLK2, { mat: "std:panel", tile: 4 }); w.box(x - 7, 13.4, z - 4, 6.2, 1.2, 6.2, WARM, { mat: "glow", col: false });
  mast(w, x + 6, 6.6, z - 5, 1.6, 30, 6, IRON, { t: 0.35, taper: 0.5, col: false }); w.col.addCapsule(V3(x + 6, 6, z - 5), V3(x + 6, 36, z - 5), 1.4);
  K.blink.add(x + 6, 37.4, z - 5, RED, 0.5, 0);
  const d = prop(w, [[new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2.4), M(0, 0, 0, 5, 2.2, 5, 180, 0, 0), WHT], [BOXG, M(0, 1.2, 0, 0.3, 3.4, 0.3), GUN], [BOXG, M(0, -1.4, 0, 1, 2.8, 1), IRON]], "paint");
  d.position.set(x - 7, 19.2, z - 4); d.rotation.x = 0.5; const pv = new THREE.Group(); pv.position.copy(d.position); d.position.set(0, 0, 0); pv.add(d); w.scene.add(pv); K.spin.push([pv, 0.25]);
}

// ═══════════ 궤도 운반차: 2번과 3번 발사대 사이 운반로를 부스터를 싣고 느릿느릿 오간다 ═══════════
export function crawler(w, K) {
  const a = PADS[1], b = PADS[2], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), CYL = new THREE.CylinderGeometry(1, 1, 1, 12), CN = new THREE.ConeGeometry(1, 1, 12);
  const parts = [[BOXG, M(0, 3.4, 0, 13, 1.6, 17), 0x4a4e57], [BOXG, M(0, 4.4, 0, 13.4, 0.4, 17.4), HAZ]];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { parts.push([BOXG, M(sx * 5.2, 1.3, sz * 5.8, 3.4, 2.6, 6.4), 0x1d2026], [BOXG, M(sx * 5.2, 2.75, sz * 5.8, 3.6, 0.3, 6.6), IRON]); }
  parts.push([CYL, M(0, 7.6, 0, 2.4, 20, 2.4, 90, 0, 0), BLK2], [CN, M(0, 7.6, -12.5, 2.4, 5, 2.4, -90, 0, 0), DRED], [CYL, M(0, 7.6, 9.4, 2.46, 1.2, 2.46, 90, 0, 0), WHT], [CYL, M(0, 7.6, 10.8, 1.9, 1.6, 1.9, 90, 0, 0), GUN]);
  for (const sz of [-6, 0, 6]) parts.push([BOXG, M(0, 5.2, sz, 6.4, 1.6, 1.2), IRON]);
  parts.push([BOXG, M(4.6, 5.4, -7, 2.6, 2.2, 2.6), DRED]);
  const m = prop(w, parts, "paint"), g = prop(w, [[BOXG, M(5.92, 5.9, -7, 0.1, 0.8, 2), WARM], [CYL, M(0, 7.6, -6, 2.47, 0.6, 2.47, 90, 0, 0), RED], [BOXG, M(-6.4, 4.9, 8.4, 0.4, 0.4, 0.4), 0xffb040], [BOXG, M(6.4, 4.9, 8.4, 0.4, 0.4, 0.4), 0xffb040]], "glow", false);
  m.add(g); m.rotation.y = Math.atan2(-dx, -dz);
  w.rider(m, [[0, 2.6, 0, 6.8, 2.6, 8.8], [0, 7.6, -1, 2.5, 2.5, 12]]);
  w.updaters.push((dt, t) => { const u = (t * 1.1 / L) % 0.9, k = 0.3 + Math.abs((u < 0.45 ? u : 0.9 - u)); m.position.set(a.x + dx * k, 0, a.z + dz * k); });
}

// ═══════════ 연료 배관로: 탱크 단지에서 북쪽 가장자리를 따라 발사대까지 이어지는 낮은 배관 ═══════════
export function pipeline(w, K, ctx) {
  const pts = [[60, -121], [36, -128], [10, -222], [-90, -224], [-170, -214], [-224, -150], [-224, -92]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 12)), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / DEG, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    [[-0.9, 0.5, WHT], [0.2, 0.36, RUST], [1.1, 0.42, 0x3a3d44]].forEach(([o, rr, c]) => w.pipe(a[0] + nx * o, 1.6, a[1] + nz * o, b[0] + nx * o, 1.6, b[1] + nz * o, rr, c, { col: false }));
    for (let k = 0; k <= n; k++) { const t = k / n; w.box(a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t, 0.5, 1.2, 3.4, CONC3, { ry, col: false }); }
    w.col.addCapsule(V3(a[0], 1.4, a[1]), V3(b[0], 1.4, b[1]), 1.2);
    w.cyl(b[0], 0, b[1], 1.4, 3, IRON, { col: false }); ring(w, b[0], 3, b[1], 1.1, 0.16, RED, { pitch: 90, col: false, mat: "glow", seg: 12 });
    if (i % 2) K.vap.add(b[0], 3.4, b[1], 1.1, 6, 2, [0.4, 0.2], 0.15);
    ctx.taken.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 4]);
  }
}

// ═══════════ 정박한 작은 배: 예인선 둘과 보급정 ═══════════
export function smallCraft(w, K) {
  const tug = (x, z, ry, c) => {
    const L = local(x, z, ry), B = (u, y, v, su, sy, sv, col, o = {}) => { const [px, pz] = L(u, v); return w.box(px, y, pz, su, sy, sv, col, { col: false, ...o, ry: ry + (o.ry || 0) }); };
    B(0, WY - 1, 0, 6, 3.4, 15, HULL, { col: true }); B(0, WY - 1, -9, 4.2, 3.4, 4.2, HULL, { ry: 45 }); B(0, WY + 2.4, 0, 6.3, 0.3, 15.3, c);
    B(0, WY + 2.4, -1, 4, 3, 5.6, BLK2, { mat: "std:panel", tile: 3 }); B(0, WY + 5.4, -1.6, 3, 2, 3, IRON); B(0, WY + 6, -3.15, 2.6, 0.9, 0.1, WARM, { mat: "glow" });
    const [fx, fz] = L(0, 2.4); w.cyl(fx, WY + 5.4, fz, 0.7, 3.4, c, { col: false }); K.blink.add(fx, WY + 9.6, fz, RED, 0.3, (x | 0) & 1);
    for (const s of [-1, 1]) B(s * 3.1, WY + 0.6, 1, 0.5, 1, 9, 0x1a1c20);
  };
  tug(-116, 92, 80, DRED); tug(36, 89, 100, HAZ); tug(158, 66, 30, DRED); tug(-170, 150, 10, 0x4a4e57);
}
