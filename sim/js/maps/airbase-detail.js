// 비행기지 세부: 레이더·레이돔, 유류고, 생활관·연병장·본부·급수탑·헬기장·정비고, 담장과 정문, 풍향계, 계류장의 기체와 지상 장비
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, ring, octa, ball, lattice, dish, V3, DEG, Parts, paint, gableRoof, hash,
  RWY, TWY, APRON, HANGARS, HF, TOWER, OPS, TANKS, TANK_R, TANK_H, RADAR, RADOME, BARRACKS, PARADE, HQ, WTOWER, HELI, MOTOR, FENCE, GATE_X, ROAD, SOCKS, JETS, JET_Z, TRANS,
  CONC, CONC2, ASPH, WH, YEL, ORG, RED, GREY, GREY2, DARK, INK, STEEL, NAVY, CREAM, SAND, OLIVE, OLIVE2, ROOF, ROOF2, TILE, GLASS, AMB, SILVER, SKY,
} from "./airbase-kit.js";
import { fighter, uav, transport, trainer, helicopter, fuelTruck, tug, car } from "./airbase-base.js";

const AT = 0.06;

// ── 레이더: 격자탑 위에서 도는 감시 레이더 + 장비 막사, 서쪽 끝의 흰 레이돔, 작은 위성 접시들 ──
export function radar(w, K) {
  const [x, z] = RADAR, H = 16;
  w.box(x, 0, z, 9, 1, 9, CONC2, { mat: "std:concrete" });
  lattice(w, x, 1, z, 3, H, 4, WH, { color2: ORG, t: 0.45, open: "x" });
  w.box(x, H + 1, z, 7.4, 0.6, 7.4, DARK, { mat: "paint" });
  w.box(x - 12, 0, z + 4, 8, 3.4, 6, CREAM, { mat: "std:concrete" });
  gableRoof(w, x - 12, 3.4, z + 4, 8.6, 6.6, 1.2, ROOF);
  // 도는 안테나: 휘어진 반사판 + 급전 뿔
  const P = new Parts();
  P.cyl(0, 0, 0, 0.9, 1.4, GREY2);
  for (let k = -5; k <= 5; k++) { const a = k * 6 * DEG, R = 7; P.box(Math.sin(a) * R, 1.4, Math.cos(a) * R - R + 0.6, 1.25, 2.6, 0.18, k % 2 ? 0xdfe3ea : 0xc9ced8, { ry: k * 6 }); }
  P.box(0, 1.2, 0, 11.6, 0.3, 0.4, STEEL);
  P.pipe([0, 1.6, 0.4], [0, 2.2, -2.6], 0.12, STEEL).box(0, 1.9, -2.9, 0.7, 0.7, 0.7, DARK);
  const ant = P.group(w); ant.position.set(x, H + 1.6, z); w.scene.add(ant);
  w.col.addSphere(V3(x, H + 3, z), 4.2);
  w.updaters.push((dt) => { ant.rotation.y += dt * 1.6; });
  K.blink.add(x + 3, H + 1.8, z + 3, RED, 0.3, 0);
  // 레이돔
  const [rx, rz] = RADOME;
  octa(w, rx, 0, rz, 8, 8, CREAM, { mat: "std:concrete" });
  w.box(rx, 0, rz + 8, 2.2, 2.6, 0.3, 0x3a3f48, { mat: "paint", col: false });
  w.sph(rx, 14.5, rz, 8.6, 0xf4f3ee, { mat: "std:panel" });
  w.pipe(rx, 22.8, rz, rx, 26, rz, 0.12, WH); K.blink.add(rx, 26.3, rz, RED, 0.35, 1);
  // 통신 접시
  for (const [dx, dz, R, az] of [[22, -30, 3.2, 200], [28, -14, 2.4, 150]]) dish(w, x + dx - 40, 0, z + dz - 8, R, az, 55, { ph: 3 });
}

// ── 유류고: 둑을 두른 기름 탱크 셋, 배관, 급유 패드와 급유차 ──
export function fuel(w, K, S) {
  const x0 = 184, x1 = 245, z0 = -32, z1 = -8;
  for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) w.wall(ax, az, bx, bz, 1.2, 0.8, CONC2, { mat: "std:concrete" });
  w.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 0.05, z1 - z0, 0x9a9384, { mat: "std:concrete", col: false, ao: false });
  TANKS.forEach(([x, z], i) => {
    w.cyl(x, 0, z, TANK_R, TANK_H, 0xeae6da, { mat: "std:panel", tile: 5 });
    w.cyl(x, TANK_H, z, TANK_R, 1.4, 0xdcd6c8, { mat: "paint", rt: TANK_R * 0.35 });
    w.cyl(x, TANK_H * 0.62, z, TANK_R + 0.05, 1.0, i === 1 ? RED : NAVY, { col: false });
    // 나선 사다리 대신 곧은 사다리 + 난간
    w.box(x, 0, z - TANK_R - 0.3, 0.8, TANK_H + 1.2, 0.4, STEEL, { col: false });
    w.pipe(x, 0.9, z + TANK_R, x, 0.9, z1 + 3, 0.35, GREY2, { col: false });
  });
  w.pipe(TANKS[0][0], 0.9, z1 + 3, TANKS[2][0], 0.9, z1 + 3, 0.4, YEL, { col: false });
  S.add("fuel", (x0 + x1) / 2, 1.2, z1 + 0.42, 7, { height: 1.0 });
  // 급유 패드 (유류고 앞)
  w.box(215, 0, 12, 52, AT, 22, CONC, { mat: "std:concrete", tile: 6, col: false, ao: false });
  fuelTruck(w, 190, 6, 90); fuelTruck(w, 224, 6, 90); fuelTruck(w, 236, 16, 100);
}

// ── 생활 구역: 생활관 넷, 연병장(사열대·깃대 셋), 본부, 급수탑, 헬기장, 정비고 ──
export function quarters(w, K, S) {
  BARRACKS.forEach(([x, z], i) => {
    const L = 34, D = 12, H = 9;
    w.box(x, 0, z, L, H, D, CREAM, { mat: "std:concrete", tile: 6 });
    w.box(x, 0, z, L + 0.4, 1.1, D + 0.4, 0x8f8a80, { col: false, mat: "std:concrete" });
    for (const s of [-1, 1]) for (let f = 0; f < 3; f++) for (let k = 0; k < 8; k++) {
      if (s > 0 && f === 0 && (k === 3 || k === 4)) continue;
      w.box(x - L / 2 + 2.6 + k * 4.1, 1.4 + f * 2.7, z + s * (D / 2 + 0.03), 1.6, 1.3, 0.1, 0x2d4152, { mat: "paint", col: false });
    }
    // 현관 (남쪽)
    w.box(x, 0, z + D / 2 + 1.4, 6, 3, 2.8, 0xd8d0bc, { mat: "std:concrete" });
    w.box(x, 3, z + D / 2 + 1.4, 6.6, 0.4, 3.2, 0x4f7a5a, { col: false });
    w.box(x, 0, z + D / 2 + 2.84, 2.4, 2.4, 0.08, 0x3a2a20, { mat: "paint", col: false });
    gableRoof(w, x, H, z, L + 1.2, D + 1.6, 3.2, 0x4f7a5a, { mat: "std:corrug" });
    S.add(`B${i + 1}`, x, 3.9, z + D / 2 + 2.86, 4.4, { height: 0.9 });
    // 앞마당 나무 두 그루 자리(생활 모듈에서 심는다), 벤치
    w.box(x - 12, 0, z + D / 2 + 4, 3, 0.45, 0.6, 0x7a5a3a, { col: false });
  });
  // 연병장
  const [px, pz] = PARADE, PW = 64, PD = 40;
  w.box(px, 0, pz, PW, AT, PD, 0xc9b48c, { mat: "std:dirt", tile: 6, col: false, ao: false });
  for (const s of [-1, 1]) { paint(w, px, pz + s * (PD / 2 - 1), PW - 2, 0.3, WH, AT); paint(w, px + s * (PW / 2 - 1), pz, 0.3, PD - 2, WH, AT); }
  for (let k = -2; k <= 2; k++) paint(w, px + k * 10, pz + 4, 0.25, 3, WH, AT);
  // 사열대: 단 + 지붕
  const sz = pz - PD / 2 - 5;
  w.box(px, 0, sz, 18, 1.4, 6, 0xd8d0bc, { mat: "std:concrete" });
  for (const s of [-1, 1]) for (const dz of [-2.4, 2.4]) w.box(px + s * 8, 1.4, sz + dz, 0.4, 3.2, 0.4, WH, { mat: "paint" });
  w.box(px, 4.6, sz, 19, 0.4, 7, 0x2f5a8a, { mat: "paint" });
  w.box(px, 1.4, sz - 2.6, 17, 1.6, 0.3, 0x2f5a8a, { mat: "paint", col: false });
  S.add("parade", px, 2.4, sz + 3.06, 9, { height: 1.1 });
  // 깃대 셋 (깃발은 움직이는 모듈)
  const poles = [[px - 10, sz - 6], [px, sz - 6.5], [px + 10, sz - 6]];
  for (const [fx, fz] of poles) { w.cyl(fx, 0, fz, 0.14, 15, SILVER, { mat: "metal", rt: 0.1 }); ball(w, fx, 15.1, fz, 0.25, 0xd9a441, "paint"); w.cyl(fx, 0, fz, 0.9, 0.5, CONC2, { col: false }); }
  // 본부
  const [hx, hz] = HQ;
  w.box(hx, 0, hz, 30, 8, 18, 0xe7e0cf, { mat: "std:concrete", tile: 6 });
  w.box(hx, 8, hz, 30.6, 0.8, 18.6, ROOF2, { col: false });
  for (const s of [-1, 1]) for (let f = 0; f < 2; f++) for (let k = 0; k < 7; k++) w.box(hx - 12 + k * 4, 1.4 + f * 3.4, hz + s * 9.03, 2.2, 1.6, 0.1, 0x2d4152, { mat: "paint", col: false });
  w.box(hx, 0, hz + 10.5, 8, 3.4, 3, 0xd8d0bc, { mat: "std:concrete" });
  S.add("hq", hx, 6.6, hz + 9.06, 12, { height: 1.4 });
  // 급수탑: 네 다리(동서 면은 가새 없이 열어 둔다) + 원통 물탱크
  const [tx, tz] = WTOWER, Hl = 20, hs = 6;
  for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) w.pipe(tx + sx * hs, 0, tz + sz2 * hs, tx + sx * (hs - 0.6), Hl, tz + sz2 * (hs - 0.6), 0.45, STEEL);
  for (const sz2 of [-1, 1]) { beam(w, [tx - hs, 6, tz + sz2 * hs], [tx + hs, 6, tz + sz2 * hs], 0.3, STEEL); beam(w, [tx - hs, 6, tz + sz2 * hs], [tx + hs - 0.3, 13.5, tz + sz2 * (hs - 0.3)], 0.22, STEEL, { col: false }); beam(w, [tx + hs, 6, tz + sz2 * hs], [tx - hs + 0.3, 13.5, tz + sz2 * (hs - 0.3)], 0.22, STEEL, { col: false }); }
  for (const sx of [-1, 1]) beam(w, [tx + sx * (hs - 0.3), 13.5, tz - hs + 0.3], [tx + sx * (hs - 0.3), 13.5, tz + hs - 0.3], 0.3, STEEL);
  w.cyl(tx, Hl, tz, 7, 8, 0xf2f0ea, { mat: "std:panel", tile: 5 });
  w.cyl(tx, Hl + 2.6, tz, 7.05, 1.4, 0x2f6fb0, { col: false });
  w.cyl(tx, Hl + 8, tz, 7.2, 3, 0xe6e3da, { mat: "paint", rt: 0.8 });
  ring(w, tx, Hl + 0.2, tz, 7.8, 0.12, STEEL, { pitch: 90, col: false, seg: 32 });
  w.pipe(tx, 0, tz + 4.8, tx, Hl, tz + 4.8, 0.45, GREY2, { col: false });
  K.blink.add(tx, Hl + 11.3, tz, RED, 0.35, 0);
  w.gap("급수탑 다리 사이", tx, 6.5, tz, 90, 10, 11, 350);
  // 헬기장
  const [lx, lz] = HELI;
  octa(w, lx, 0, lz, 13, 0.3, 0x4a4d52, { mat: "std:concrete", col: false });
  ring(w, lx, 0.32, lz, 10.5, 0.25, YEL, { pitch: 90, col: false, seg: 40 });
  w.box(lx - 2.6, 0.3, lz, 1.2, 0.05, 7, WH, { col: false, ao: false }); w.box(lx + 2.6, 0.3, lz, 1.2, 0.05, 7, WH, { col: false, ao: false }); w.box(lx, 0.3, lz, 4, 0.05, 1.2, WH, { col: false, ao: false });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; w.box(lx + Math.cos(a) * 12.5, 0, lz + Math.sin(a) * 12.5, 0.4, 0.35, 0.4, AMB, { mat: "glow", col: false }); }
  helicopter().place(w, lx - 24, 0, lz + 6, 200);
  // 정비고: 앞이 트인 긴 창고 + 군용 트럭
  const [mx, mz] = MOTOR, ML = 46, MD = 14;
  w.box(mx, 0, mz - MD / 2, ML, 7, 0.6, 0xc9c2b2, { mat: "std:corrug", tile: 3 });
  for (const s of [-1, 1]) w.box(mx + s * ML / 2, 0, mz, 0.6, 7, MD, 0xc9c2b2, { mat: "std:corrug", tile: 3 });
  for (let k = -2; k <= 2; k++) w.box(mx + k * 11.5, 0, mz + MD / 2 - 0.3, 0.5, 7, 0.5, STEEL, { mat: "paint" });
  gableRoof(w, mx, 7, mz, ML + 1.2, MD + 1.6, 2.4, 0x6d7a5e, { mat: "std:corrug" });
  for (let k = 0; k < 3; k++) armyTruck(w, mx - 14 + k * 14, mz + 1, 180);
  armyTruck(w, mx + 8, mz + 16, 160);
  S.add("motor", mx, 5.6, mz + MD / 2 + 0.1, 10, { height: 1.2 });
  return poles;
}

function armyTruck(w, x, z, ry) {
  const P = new Parts();
  P.box(0, 0.7, -2.6, 2.3, 1.9, 1.9, OLIVE, { col: true }).box(0, 1.9, -3.56, 2.0, 0.7, 0.1, 0x22303c);
  P.box(0, 0.7, 1.1, 2.4, 0.4, 5.4, OLIVE2).box(0, 1.1, 1.1, 2.4, 2.2, 5.4, OLIVE, { col: true, mat: "std:corrug" });
  for (const v of [-2.6, 0.6, 2.6]) for (const u of [-1.05, 1.05]) P.wheel(u, v, 0.55, 0.36);
  P.place(w, x, w.h(x, z), z, ry);
}

// ── 담장: 철망 + 기둥 + 윗줄 철조망, 정문(초소·차단기·간판 문) ──
export function fence(w, K, S) {
  const { x: X, z0, z1 } = FENCE;
  const run = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 8)), ry = Math.atan2(-(bz - az), bx - ax) / DEG;
    for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; w.box(x, 0, z, 0.16, 2.9, 0.16, 0x7d848c, { col: false, mat: "paint" }); }
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    w.box(mx, 0.05, mz, L, 2.5, 0.06, 0x9aa2aa, { ry, mat: "glass", col: false });
    for (const y of [2.6, 2.9]) w.box(mx, y, mz, L, 0.06, 0.06, 0x5a6068, { ry, col: false });
    w.col.addBox(V3(mx, 1.45, mz), V3(L / 2, 1.45, 0.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry * DEG, 0)));
  };
  const gw = 7;
  run(-X, z0, X, z0); run(-X, z0, -X, z1); run(X, z0, X, z1);
  run(-X, z1, GATE_X - gw, z1); run(GATE_X + gw, z1, X, z1);
  // 정문: 기둥 문 + 간판 + 초소 + 차단기(들어 올림)
  for (const s of [-1, 1]) { w.box(GATE_X + s * (gw + 0.8), 0, z1, 1.6, 7.2, 1.6, 0x8f8a80, { mat: "std:concrete" }); }
  w.box(GATE_X, 7.2, z1, 2 * gw + 3.2, 1.6, 1.2, NAVY, { mat: "paint" });
  S.add("gate", GATE_X, 8.0, z1 + 0.62, 13, { height: 1.4 });
  S.add("gate", GATE_X, 8.0, z1 - 0.62, 13, { height: 1.4, ry: 180 });
  w.box(GATE_X + gw + 5, 0, z1 - 5, 4, 3, 4, WH, { mat: "std:concrete" });
  w.box(GATE_X + gw + 5, 3, z1 - 5, 4.8, 0.4, 4.8, NAVY, { col: false });
  w.box(GATE_X + gw + 3, 1.2, z1 - 3, 0.08, 1.4, 2.6, 0x3a5a70, { mat: "glass", col: false });
  w.box(GATE_X - gw + 0.5, 0, z1 + 1.5, 0.6, 1.1, 0.6, RED, { col: false });
  w.pipe(GATE_X - gw + 0.5, 1.1, z1 + 1.5, GATE_X - gw + 2, 6.5, z1 + 1.5, 0.1, WH, { col: false });
  // 울타리 모서리 감시탑
  for (const [x, z] of [[-X + 4, z0 + 4], [X - 4, z0 + 4], [-X + 4, z1 - 4], [X - 4, z1 - 4]]) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) w.pipe(x + sx * 1.6, 0, z + sz * 1.6, x + sx * 1.2, 7, z + sz * 1.2, 0.14, OLIVE2, { col: false });
    w.box(x, 7, z, 3.6, 2.4, 3.6, OLIVE, { mat: "paint" });
    gableRoof(w, x, 9.4, z, 4.2, 4.2, 1, OLIVE2, { col: false });
  }
}

// ── 풍향계: 기둥 + 고리 + 주황·흰 줄무늬 자루(바람에 흔들림) ──
export function windsocks(w, K) {
  const socks = SOCKS.map(([x, z]) => {
    w.box(x, 0, z, 2.4, 0.3, 2.4, CONC2, { col: false });
    w.cyl(x, 0, z, 0.12, 7.2, WH, { mat: "paint", rt: 0.09 });
    const P = new Parts();
    for (let k = 0; k < 5; k++) { const r0 = 0.62 - k * 0.07; P.pipe([0, 0, k * 0.9], [0, 0, (k + 1) * 0.9], r0, k % 2 ? WH : ORG, { seg: 6 }); }
    P.cyl(0, -0.06, 0, 0.66, 0.12, STEEL, { rx: 90 });
    const g = P.group(w); g.position.set(x, 7.2, z); w.scene.add(g);
    K.blink.add(x, 7.5, z, RED, 0.22, 0);
    return g;
  });
  w.updaters.push((dt, t) => socks.forEach((g, i) => { g.rotation.set(-0.12 + Math.sin(t * 1.7 + i) * 0.06, -1.1 + Math.sin(t * 0.31 + i * 2) * 0.25, Math.sin(t * 2.3 + i) * 0.05, "YXZ"); }));
}

// ── 계류장: 수송기·전투기 줄·무인기·훈련기, 지상 장비, 투광등 마스트 ──
export function apron(w, K) {
  transport().place(w, TRANS[0], 0, TRANS[1], 180);
  JETS.forEach((x, i) => fighter(i === 1 ? 0x7f8996 : 0x8d96a3).place(w, x, 0, JET_Z, 180));
  // 전투기 앞 정비 장비: 전원 공급 카트와 사다리
  JETS.forEach((x, i) => { w.box(x + 4, 0, JET_Z - 4, 1.4, 1.1, 2.2, YEL, { mat: "paint" }); if (i !== 1) w.box(x - 1.8, 0, JET_Z + 3.6, 0.8, 2.4, 1.6, STEEL, { mat: "paint", col: false }); });
  // 수송기: 계단차·견인차·화물 팔레트
  tug(w, TRANS[0] - 6, TRANS[1] + 18, 0);
  w.box(TRANS[0] - 4.2, 0, TRANS[1] + 6, 2, 3.6, 4, WH, { mat: "paint" });
  for (let k = 0; k < 4; k++) w.box(TRANS[0] + 9 + (k % 2) * 2.4, 0, TRANS[1] + 26 + ((k / 2) | 0) * 2.4, 2.2, 1.4, 2.2, k % 2 ? 0x6d7a5e : 0x5d6b3c, { mat: "std:corrug", tile: 2 });
  // 1 격납고 앞 무인기 둘
  uav().place(w, -222, 0, -40, 180);
  uav().place(w, -178, 0, -44, 180);
  // 2 격납고 앞 훈련기, 4 격납고 옆 견인차·연료차
  trainer().place(w, -122, 0, -48, 160);
  tug(w, -55, -48, 90, 0x2f6fb0);
  fuelTruck(w, -12, -40, 200);
  // 계류장 가장자리 장비: 소화기 카트·화물 상자
  for (let k = 0; k < 5; k++) w.box(-232 + k * 2.5, 0, 20, 2, 1.6, 2, k % 2 ? ORG : NAVY, { mat: "std:corrug", tile: 2 });
  for (const [x, z] of [[-112, 22], [-60, -6], [8, 22]]) { w.box(x, 0, z, 0.8, 1.1, 0.8, RED, { mat: "paint", col: false }); }
  // 투광등 마스트
  for (const [x, z] of [[-234, 28], [-66, 28], [104, 28], [104, -60]]) {
    w.cyl(x, 0, z, 0.45, 20, 0xc9ced8, { mat: "paint", rt: 0.3 });
    w.box(x, 20, z, 4, 1.6, 0.8, DARK, { mat: "paint" });
    for (let k = -1; k <= 1; k++) w.box(x + k * 1.3, 20.2, z + 0.42, 1.0, 1.0, 0.1, 0xfff3d0, { mat: "glow", col: false });
    K.blink.add(x, 22.2, z, RED, 0.3, (x | 0) & 1);
  }
}

// ── 깃발 텍스처: 연합기·비행단기·은빛 편대기 ──
export function flagTexture(kind) {
  const cv = document.createElement("canvas"); cv.width = 192; cv.height = 128;
  const g = cv.getContext("2d");
  if (kind === 0) {
    g.fillStyle = "#1d3a7a"; g.fillRect(0, 0, 192, 128);
    g.fillStyle = "#f2f0ea"; g.fillRect(0, 54, 192, 20);
    g.beginPath(); g.arc(96, 64, 34, 0, Math.PI * 2); g.fillStyle = "#1d3a7a"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#f2f0ea"; g.stroke();
    g.fillStyle = "#f2c230"; g.beginPath(); g.moveTo(96, 38); g.lineTo(108, 70); g.lineTo(96, 62); g.lineTo(84, 70); g.closePath(); g.fill();
  } else if (kind === 1) {
    g.fillStyle = "#5aa9ff"; g.fillRect(0, 0, 192, 128);
    g.fillStyle = "#ffffff";
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(96, 70); g.quadraticCurveTo(96 + s * 40, 30, 96 + s * 80, 40); g.quadraticCurveTo(96 + s * 50, 60, 96, 84); g.closePath(); g.fill(); }
    g.fillStyle = "#ff8a3a"; g.beginPath(); g.arc(96, 72, 10, 0, Math.PI * 2); g.fill();
  } else {
    const gr = g.createLinearGradient(0, 0, 192, 128); gr.addColorStop(0, "#dfe4ec"); gr.addColorStop(1, "#8a94a3"); g.fillStyle = gr; g.fillRect(0, 0, 192, 128);
    g.fillStyle = "#2b3442"; g.beginPath(); g.moveTo(30, 96); g.lineTo(96, 24); g.lineTo(162, 96); g.lineTo(96, 70); g.closePath(); g.fill();
    g.fillStyle = "#ff8a3a"; g.fillRect(0, 112, 192, 16);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// 펄럭이는 깃발: 깃대 꼭대기 (x, top, z)
export function flags(w, poles) {
  const list = poles.map(([x, z], i) => {
    const tex = flagTexture(i), geo = new THREE.PlaneGeometry(4.2, 2.8, 12, 4);
    geo.translate(2.1, 0, 0);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    mesh.position.set(x, 13.4, z); mesh.rotation.y = 0.5;
    w.scene.add(mesh); w.disposables.push(tex, geo);
    return { mesh, base: Float32Array.from(geo.attributes.position.array), ph: i * 1.3 };
  });
  w.updaters.push((dt, t) => {
    for (const f of list) {
      const P = f.mesh.geometry.attributes.position, B = f.base;
      for (let i = 0; i < P.count; i++) { const u = B[i * 3]; P.setZ(i, Math.sin(u * 1.6 - t * 5.2 + f.ph) * 0.22 * (u / 4.2) + Math.sin(u * 0.7 - t * 2.1) * 0.12 * (u / 4.2)); }
      P.needsUpdate = true;
      f.mesh.rotation.y = 0.5 + Math.sin(t * 0.4 + f.ph) * 0.15;
    }
  });
}
