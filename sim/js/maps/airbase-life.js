// 비행기지 둘레와 움직임: 정문 밖 마을(한옥·아파트·가게)과 논, 전봇대, 소나무 능선과 기지 안 가로수, 가로등, 장주 비행하는 전투기 편대·순찰 지프·새
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, flora, birds, Parts, V3, DEG, gableRoof, hash, paint, RWY, FENCE, GATE_X, ROAD, BARRACKS, PARADE, HQ, CREAM, WH, DARK, INK, STEEL, OLIVE, OLIVE2, TILE, GREY, GREY2, RED, ORG, YEL, NAVY, CONC2, AMB } from "./airbase-kit.js";
import { fighter } from "./airbase-base.js";

// ── 마을: 정문 남쪽 길가 ──
export function village(w, K, S) {
  const r = w.rand;
  // 한옥 (길 서쪽): 돌 기단, 흰 벽과 나무 기둥, 짙은 기와 지붕, 낮은 담장
  const HOUSES = [[150, 192, 0], [128, 196, 0], [152, 216, 90], [126, 222, 0], [150, 240, 0], [104, 206, 0], [104, 236, 90]];
  for (const [x, z, ry] of HOUSES) {
    const L = 12, D = 7, c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
    w.box(x, 0, z, L + 1.6, 0.6, D + 1.6, 0xb5ada0, { mat: "std:rock", tile: 2, ry });
    w.box(x, 0.6, z, L, 2.8, D, 0xf0ebe0, { mat: "std:concrete", ry });
    for (let k = -3; k <= 3; k++) { const u = k * (L / 6); w.box(x + u * c + (D / 2 + 0.05) * s, 0.6, z - u * s + (D / 2 + 0.05) * c, 0.28, 2.8, 0.12, 0x6a4a30, { ry, col: false }); }
    w.box(x + (D / 2 + 0.08) * s, 1.2, z + (D / 2 + 0.08) * c, 3, 1.8, 0.1, 0xd8c8a0, { ry, col: false, mat: "paint" });
    gableRoof(w, x, 3.4, z, L + 3, D + 4, 2.4, TILE, { ry, mat: "std:corrug" });
    w.box(x, 5.75, z, L + 3.4, 0.35, 0.7, 0x2c3036, { ry, col: false });
    // 담장
    const yw = 11, yd = 10;
    for (const [ax, az, bx, bz] of [[-yw, -yd, yw, -yd], [-yw, -yd, -yw, yd], [yw, -yd, yw, yd], [-yw, yd, -2.5, yd], [2.5, yd, yw, yd]]) {
      const X = (u, v) => x + u * c + v * s, Z = (u, v) => z - u * s + v * c;
      w.wall(X(ax, az), Z(ax, az), X(bx, bz), Z(bx, bz), 1.4, 0.5, 0xc9bfae, { mat: "std:rock" });
    }
    if (r() < 0.7) flora(w).round(x + (r() - 0.5) * 14, z - 8, 0.7, 0.08, 0.6);
  }
  // 아파트 두 동 (길 동쪽)
  for (const [x, z, n] of [[220, 200, 1], [222, 236, 2]]) {
    const L = 36, D = 11, H = 18;
    w.box(x, 0, z, L, H, D, 0xece6d8, { mat: "std:concrete", tile: 6 });
    for (let f = 0; f < 6; f++) {
      w.box(x, 0.6 + f * 3, z + D / 2 + 0.6, L - 1, 0.25, 1.2, 0xd8d0c0, { col: false });
      w.box(x, 1.0 + f * 3, z + D / 2 + 1.15, L - 1, 1.0, 0.1, 0xc8d8e0, { mat: "glass", col: false });
      for (let k = 0; k < 9; k++) w.box(x - L / 2 + 2 + k * 4, 1.2 + f * 3, z + D / 2 + 0.03, 3, 1.5, 0.1, 0x3a4c5c, { mat: "paint", col: false });
    }
    w.box(x, H, z, L + 0.4, 0.8, D + 0.4, 0xb8312f, { col: false });
    w.box(x + 12, H + 0.8, z, 4, 3, 4, 0xd8d0c0, { mat: "std:concrete" });
    S.add(`apt${n}`, x - L / 2 - 0.06, H - 3, z, 6, { height: 2.4, ry: -90 });
  }
  // 길가 가게: 편의점·통닭·식당·PC방
  ["shop1", "shop2", "shop3", "shop4"].forEach((id, k) => {
    const x = 194, z = 182 + k * 13;
    w.box(x, 0, z, 9, 4.2, 11, [0xe8e2d6, 0xd9cdb8, 0xe3dccc, 0xcfd6dc][k], { mat: "std:concrete" });
    w.box(x - 4.6, 3.0, z, 0.3, 1.4, 10, [0x2f9e5a, 0xf0a020, 0xb8312f, 0x2f6fb0][k], { col: false, mat: "paint" });
    S.add(id, x - 4.8, 3.7, z, 9, { height: 1.2, ry: -90 });
    w.box(x - 4.6, 0.3, z, 0.1, 2.3, 7, 0x2a3a48, { mat: "glass", col: false });
    w.box(x - 5.6, 2.7, z, 2, 0.15, 10.5, [0x2f9e5a, 0xf0a020, 0xb8312f, 0x2f6fb0][k], { col: false });
  });
  // 버스 정류장
  w.box(172, 0, 172, 1.6, 2.6, 4, 0x2f6fb0, { mat: "paint", col: false }); w.box(172.6, 2.6, 172, 2.6, 0.2, 4.6, 0xdfe3ea, { col: false });
  S.add("bus", 171.15, 1.9, 172, 1.8, { height: 1.2, ry: -90 });
  // 전봇대와 전깃줄 (길 서쪽을 따라)
  const tops = [];
  for (let z = 170; z <= 252; z += 20) { const x = 175; w.cyl(x, 0, z, 0.18, 9, 0x9a958c, { rt: 0.13 }); w.box(x, 8.4, z, 2.2, 0.16, 0.16, 0x5a554c, { col: false }); tops.push([x, 8.6, z]); }
  for (let k = 0; k < tops.length - 1; k++) for (const du of [-0.9, 0.9]) beam(w, [tops[k][0] + du, tops[k][1], tops[k][2]], [tops[k + 1][0] + du, tops[k + 1][1], tops[k + 1][2]], 0.04, INK, { col: false });
  // 논의 허수아비와 원두막
  for (const [x, z] of [[-60, 200], [10, 228], [-160, 214]]) {
    w.pipe(x, 0, z, x, 2.4, z, 0.06, 0x6a4a30, { col: false }); w.pipe(x - 0.9, 1.8, z, x + 0.9, 1.8, z, 0.05, 0x6a4a30, { col: false });
    w.box(x, 1.4, z, 0.6, 0.7, 0.3, [RED, 0x2f6fb0, YEL][(x & 3) % 3], { col: false }); w.sph(x, 2.5, z, 0.25, 0xe8d8a8, { col: false });
  }
  { const x = -100, z = 238; for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.pipe(x + sx * 1.8, 0, z + sz * 1.8, x + sx * 1.8, 3.4, z + sz * 1.8, 0.12, 0x6a4a30); w.box(x, 1.4, z, 4, 0.2, 4, 0x8a6a40, { col: false }); gableRoof(w, x, 3.4, z, 4.8, 4.8, 1.6, 0xb8a070, { col: false }); }
  // 논둑길
  w.box(-80, 0, 205, 340, 0.05, 3, 0xb8a878, { col: false, ao: false });
}

// ── 나무: 능선의 소나무 숲, 기지 안 가로수(은행나무·느티나무), 마을 둘레 ──
export function trees(w, K, ctx) {
  const F = flora(w), r = w.rand;
  const inBase = (x, z, m = 0) => Math.abs(x) < FENCE.x + m && z > FENCE.z0 - m && z < FENCE.z1 + m;
  const villageZone = (x, z) => x > 92 && x < 260 && z > FENCE.z1 && z < 258;
  const approach = (x, z) => x < RWY.x0 && Math.abs(z - RWY.z) < 18;
  let n = 0;
  // 능선 숲: 격자 + 흔들림
  for (let gx = -450; gx <= 450; gx += 17) for (let gz = -450; gz <= 450; gz += 17) {
    const x = gx + (hash(gx, gz) - 0.5) * 14, z = gz + (hash(gz + 7, gx - 3) - 0.5) * 14;
    if (inBase(x, z, 8) || villageZone(x, z) || approach(x, z)) continue;
    const y = w.h(x, z), d = Math.max(Math.abs(x), Math.abs(z));
    const dense = y > 3 ? 0.62 : (z > FENCE.z1 && z < 262 && x < 92) ? 0.0 : d > 280 ? 0.28 : 0.06;
    if (hash(gx * 3 + 1, gz * 5 + 2) > dense) continue;
    if (!ctx.free(x, z, 3)) continue;
    const s = 0.8 + hash(gx, gz * 2) * 0.6;
    if (y > 3 && hash(gx + 11, gz) > 0.22) F.pine(x, z, s * (y > 25 ? 1.15 : 1)); else F.round(x, z, s, hash(gx, gz + 9) > 0.6 ? 0.09 : 0.25, 0.55);
    n++;
  }
  // 기지 안: 생활 구역 길가 은행나무(노랗게 물든), 생활관 앞, 본부 앞
  const plant = (x, z, s, hue) => { if (ctx.free(x, z, 2)) { F.round(x, z, s, hue, 0.62); n++; } };
  for (let z = -136; z >= -196; z -= 10) { plant(-122, z, 0.85, 0.13); plant(131, z, 0.85, 0.13); }
  for (const [x, z] of BARRACKS) { plant(x - 15, z + 9.5, 0.8, 0.26); plant(x + 15, z + 9.5, 0.8, 0.26); }
  for (let x = -230; x <= 230; x += 16) plant(x, -195.5 + (hash(x, 3) - 0.5) * 1.5, 0.9, 0.24 + hash(x, 5) * 0.05);
  for (const [x, z] of [[HQ[0] - 20, HQ[1] + 2], [HQ[0] + 20, HQ[1] + 2], [PARADE[0] - 38, PARADE[1]], [PARADE[0] + 38, PARADE[1]]]) plant(x, z, 1.0, 0.25);
  // 남쪽 잔디 띠의 작은 덤불
  for (let k = 0; k < 40; k++) { const x = -240 + r() * 480, z = 124 + r() * 20; if (ctx.free(x, z, 1)) F.bush(x, z, 0.9); }
  w.treeCount = n;
}

// ── 가로등 ──
export function lamps(w) {
  for (let x = -230; x <= 230; x += 46) w.lamp(x, ROAD.z1 - 5.5, 7, 0xffe2a8, 180, 1.4);
  for (let x = -230; x <= 230; x += 46) w.lamp(x + 23, -127, 7, 0xffe2a8, 0, 1.4);
  for (let z = -190; z <= -130; z += 30) { w.lamp(-104.5, z, 6, 0xffe2a8, 90, 1.2); w.lamp(129.5, z, 6, 0xffe2a8, -90, 1.2); }
  for (let z = 175; z <= 245; z += 24) w.lamp(185.5, z, 7, 0xffe2a8, -90, 1.4);
}

// ── 움직이는 것: 장주 비행 편대, 순찰 지프, 새 ──
export function life(w, K) {
  // 전투기 두 대가 기지 상공 장주를 돈다 (경기장 모양, 충돌 없음)
  const jets = [0, 1].map((i) => { const g = fighter(i ? 0x7f8996 : 0x8d96a3).group(w); w.scene.add(g); return g; });
  const R = 120, Lh = 220, Y = 115, per = 2 * Lh * 2 + 2 * Math.PI * R;
  const at = (s, out) => {
    s = ((s % per) + per) % per;
    if (s < 2 * Lh) return out.set(-Lh + s, 0, -R - 40);
    s -= 2 * Lh; if (s < Math.PI * R) { const a = -Math.PI / 2 + s / R; return out.set(Lh + Math.cos(a) * R, 1, -40 + Math.sin(a) * R); }
    s -= Math.PI * R; if (s < 2 * Lh) return out.set(Lh - s, 0, R - 40);
    s -= 2 * Lh; const a = Math.PI / 2 + s / R; return out.set(-Lh + Math.cos(a) * R, 1, -40 + Math.sin(a) * R);
  };
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  w.updaters.push((dt, t) => jets.forEach((g, i) => {
    const s = t * 62 - i * 26;
    at(s, p); const turn = p.y; at(s + 2, q); p.y = q.y = Y + i * 3;
    g.position.copy(p);
    g.lookAt(2 * p.x - q.x, p.y, 2 * p.z - q.z);
    g.rotateZ(turn ? -0.75 : 0);
  }));
  // 순찰 지프: 담장 안 순환 도로를 시계 방향으로
  const jp = new Parts();
  jp.box(0, 0.4, 0, 1.9, 0.9, 3.8, OLIVE).box(0, 1.3, 0.5, 1.8, 0.8, 2.0, OLIVE2).box(0, 1.3, -0.65, 1.7, 0.6, 0.08, 0x22303c, { mat: "glass" });
  for (const u of [-0.85, 0.85]) for (const v of [-1.2, 1.2]) jp.wheel(u, v, 0.38, 0.28);
  jp.box(0, 2.1, 0.4, 0.8, 0.15, 0.3, 0xff3030, { mat: "glow" });
  const jeep = jp.group(w); w.scene.add(jeep);
  const X = ROAD.x - 1.8, z0 = ROAD.z0 + 1.8, z1 = ROAD.z1 - 1.8, P4 = [[-X, z1], [X, z1], [X, z0], [-X, z0]];
  const segs = P4.map((a, i) => { const b = P4[(i + 1) % 4]; return { a, b, L: Math.hypot(b[0] - a[0], b[1] - a[1]) }; }), tot = segs.reduce((s, g) => s + g.L, 0);
  w.rider(jeep, [[0, 1, 0, 1, 1, 2]], "mover");
  w.updaters.push((dt, t) => {
    let s = (t * 9) % tot, g = segs[0];
    for (const sg of segs) { if (s <= sg.L) { g = sg; break; } s -= sg.L; }
    const k = s / g.L, x = g.a[0] + (g.b[0] - g.a[0]) * k, z = g.a[1] + (g.b[1] - g.a[1]) * k;
    jeep.position.set(x, w.h(x, z), z);
    jeep.rotation.y = Math.atan2(-(g.b[0] - g.a[0]), -(g.b[1] - g.a[1]));
  });
  // 새 (능선 위)
  birds(w, [[-120, 58, -300, 55, 8, 0], [160, 52, -290, 45, -7, 1.3], [-260, 40, 220, 50, 6, 2.1]]);
}
