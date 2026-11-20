// 설원 통신기지 본체: 얼어붙은 신호탑, 거대 접시 셋(레이더 회랑), 반지하 아치 격납고, 지휘 벙커, 활주로와 계류장
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, V3, frame, lattice, dome, octa, ball, Rig, G, icicle, icicles, drift, shardIce, gableGeo, archY, snowRoof, DEG,
  SNOW, SNOW_SH, ICE, ICE_D, CONC, CONC2, STEEL, DARK, INK, HULL, HULL2, OLIVE, WCAMO, ORG, RED, AMB, WARM, CYA, CYA2, GRN,
  RWY, HANGARS, HZ0, HZ1, HA, HWALL, HRISE, DOOR, DISHES, DISH_R, DISH_Y, DISH_LEG, BUNKER,
} from "./frost-kit.js";
import { SIG } from "./frost-terrain.js";

// ── 얼어붙은 신호탑: 네 다리 사이가 뚫린 125 m 격자탑. 꼭대기에서 ‘신호’가 맥박 친다 ──
export function signalTower(w, K) {
  const [x, z] = SIG, y0 = w.h(x, z) - 0.4, B = 16, r = w.rand;
  const half = (hh) => B + (5 - B) * Math.min(1, Math.max(0, (hh - 2) / 38));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    w.box(x + sx * B, y0 - 1.5, z + sz * B, 6, 3.6, 6, CONC, { mat: "std:concrete", tile: 3 });
    drift(w, x + sx * (B + 2), y0 + 1.6, z + sz * (B + 2), 4.5, 1.4, 4.5);
    beam(w, [x + sx * B, y0 + 2, z + sz * B], [x + sx * 5, y0 + 40, z + sz * 5], 1.5, HULL2);
    // 서북쪽(바람받이) 다리에는 서리 얼음이 두껍게 붙었다
    if (sx < 0) for (let i = 0; i < 7; i++) { const hh = 5 + i * 5 + r() * 2, hf = half(hh); shardIce(w, x + sx * hf - 0.9, y0 + hh, z + sz * hf - 0.5, 1.5 + r(), 2.4 + r() * 1.5, 1.3 + r(), i % 2 ? ICE : SNOW); }
  }
  // 다리 가로대와 가새: 18 m 위쪽만 (아래는 통과 공간)
  for (const [h0, h1] of [[18, 29], [29, 40]]) {
    const a = half(h0), b = half(h1);
    for (const s of [-1, 1]) {
      beam(w, [x - a, y0 + h0, z + s * a], [x + a, y0 + h0, z + s * a], 0.8, HULL);
      beam(w, [x + s * a, y0 + h0, z - a], [x + s * a, y0 + h0, z + a], 0.8, HULL);
      beam(w, [x - a, y0 + h0, z + s * a], [x + b, y0 + h1, z + s * b], 0.45, STEEL, { col: false });
      beam(w, [x + s * a, y0 + h0, z + a], [x + s * b, y0 + h1, z - b], 0.45, STEEL, { col: false });
      icicles(w, [x - a, y0 + h0 - 0.4, z + s * a], [x + a, y0 + h0 - 0.4, z + s * a], 9, h0 < 20 ? 3.2 : 2);
      icicles(w, [x + s * a, y0 + h0 - 0.4, z - a], [x + s * a, y0 + h0 - 0.4, z + a], 9, h0 < 20 ? 3.2 : 2);
    }
  }
  // 갑판 셋과 몸통 격자
  const deck = (hh, s) => {
    w.box(x, y0 + hh, z, s, 0.8, s, DARK, { mat: "paint" });
    w.box(x, y0 + hh + 0.8, z, s + 0.4, 0.3, s + 0.4, SNOW, { col: false, ao: false });
    for (const k of [-1, 1]) { icicles(w, [x - s / 2, y0 + hh, z + k * s / 2], [x + s / 2, y0 + hh, z + k * s / 2], 8, 3.4); icicles(w, [x + k * s / 2, y0 + hh, z - s / 2], [x + k * s / 2, y0 + hh, z + s / 2], 8, 3.4); }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.blink.add(x + sx * s / 2, y0 + hh + 1.2, z + sz * s / 2, RED, 0.45, hh > 50 ? 1 : 0);
  };
  deck(40, 15);
  lattice(w, x, y0 + 40.8, z, 4.2, 31, 4, HULL, { t: 0.7, open: "z", color2: ORG });
  deck(72, 12);
  lattice(w, x, y0 + 72.8, z, 3.2, 31, 4, HULL, { t: 0.6, open: "x", color2: ORG });
  deck(104, 8);
  // 중계 안테나: 갑판마다 북·동·남·서를 향한 드럼과 작은 접시
  for (const [hh, s] of [[44, 7.6], [76, 6.2]]) for (let i = 0; i < 4; i++) {
    const a = i * 90, px = x + Math.sin(a * DEG) * s, pz = z + Math.cos(a * DEG) * s;
    w.mesh(G.cyl, M(px, y0 + hh + 2.2, pz, 2.1, 0.9, 2.1, 90, a, 0), i % 2 ? HULL : 0xdfe6ee, "paint");
    w.mesh(G.cyl, M(px + Math.sin(a * DEG) * 0.5, y0 + hh + 2.2, pz + Math.cos(a * DEG) * 0.5, 1.9, 0.2, 1.9, 90, a, 0), SNOW, "std");
    w.col.addSphere(V3(px, y0 + hh + 2.2, pz), 2);
  }
  // 돛대와 신호 장치
  w.pipe(x, y0 + 104.8, z, x, y0 + 124, z, 0.6, HULL2, {});
  for (const hh of [110, 116]) { beam(w, [x - 3.5, y0 + hh, z], [x + 3.5, y0 + hh, z], 0.35, HULL, { col: false }); beam(w, [x, y0 + hh, z - 3.5], [x, y0 + hh, z + 3.5], 0.35, HULL, { col: false }); icicles(w, [x - 3.5, y0 + hh, z], [x + 3.5, y0 + hh, z], 6, 2.4); }
  ball(w, x, y0 + 125.5, z, 1.6, CYA2);
  K.blink.add(x, y0 + 128, z, RED, 0.6, 0);
  // 통과 지점: 다리 사이(남북·동서)
  w.gap("신호탑 다리 사이", x, y0 + 8, z, 0, 18, 11, 500);
  w.gap("신호탑 다리 사이", x, y0 + 8, z, 90, 18, 11, 500);
  // 발치: 발전기 컨테이너와 케이블 홈통 (탑 바깥 북동쪽)
  w.container(x + 26, y0 + 0.2, z - 14, 20, 0x56606e);
  w.box(x + 26, y0 + 2.8, z - 14, 12.4, 0.5, 2.6, SNOW, { ry: 20, col: false, ao: false });
  pulse(w, x, y0 + 125.5, z);
  return y0;
}

// 신호의 맥박: 꼭대기에서 퍼져 나가는 청록 고리 셋과 하늘로 선 빛기둥
function pulse(w, x, y, z) {
  const rg = new THREE.TorusGeometry(1, 0.035, 5, 48); rg.rotateX(Math.PI / 2);
  const rings = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: CYA, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set(x, y, z); m.frustumCulled = false; m.renderOrder = 6; w.scene.add(m); w.disposables.push(m.material);
    return m;
  });
  const bg = new THREE.CylinderGeometry(0.5, 1.6, 260, 10, 1, true); bg.translate(0, 130, 0);
  const beamM = new THREE.MeshBasicMaterial({ color: 0x66dcff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const bm = new THREE.Mesh(bg, beamM); bm.position.set(x, y, z); bm.renderOrder = 6; bm.frustumCulled = false; w.scene.add(bm);
  w.disposables.push(rg, bg, beamM);
  w.updaters.push((dt, t) => {
    rings.forEach((m, i) => { const u = (t * 0.22 + i / 3) % 1; m.scale.setScalar(2 + u * 46); m.material.opacity = 0.85 * (1 - u) * (1 - u); });
    beamM.opacity = 0.11 + 0.07 * Math.sin(t * 2.2) + (Math.sin(t * 0.7) > 0.96 ? 0.12 : 0);
  });
}

// ── 거대 접시: 남북으로 선 A 자 받침 둘 사이에 걸린 지름 40 m 포물면. 받침 사이(동서)로 밑을 지난다 ──
export function dishes(w, K) {
  const R = DISH_R, Y = DISH_Y, r = w.rand;
  DISHES.forEach(([x, z, tilt], idx) => {
    for (const s of [-1, 1]) {
      const zc = z + s * (DISH_LEG + 8.5);
      for (const k of [-1, 1]) {
        w.box(x + k * 9, -1, zc, 5, 2.6, 5, CONC, { mat: "std:concrete", tile: 3 });
        beam(w, [x + k * 9, 1.4, zc], [x, Y + 1, zc], 1.7, HULL2);
        drift(w, x + k * 10.5, 1.2, zc + s * 2, 4, 1.3, 4);
      }
      beam(w, [x - 5.4, 11, zc], [x + 5.4, 11, zc], 0.9, HULL);
      icicles(w, [x - 5.4, 10.5, zc], [x + 5.4, 10.5, zc], 7, 2.6);
      w.box(x, Y - 0.6, zc, 3.4, 3.4, 3, DARK, { mat: "paint" });
      K.blink.add(x, Y + 3.6, zc, RED, 0.45, idx + (s > 0 ? 1 : 0));
    }
    // 축과 요람
    w.pipe(x, Y + 1, z - DISH_LEG - 8.5, x, Y + 1, z + DISH_LEG + 8.5, 0.9, STEEL, {});
    const rig = new Rig(w, x, Y + 1, z, 0, 0, -tilt), dep = R * 0.28;
    w.mesh(G.dish(), rig.m.clone().multiply(M(0, -1.5, 0, R, R, R)), 0xe3e9f0, "paint");
    // 뒷면 갈비와 고리
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39, c = Math.cos(a), sn = Math.sin(a); rig.beam([c * 2, -3.2, sn * 2], [c * R * 0.92, dep * 0.846 - 1.9, sn * R * 0.92], 0.5, HULL2, { col: false }); }
    rig.box(0, -2.6, 0, 5, 3, 5, DARK, { col: false });
    const tor = new THREE.TorusGeometry(1, 0.016, 5, 36); tor.rotateX(Math.PI / 2);
    w.mesh(tor, rig.m.clone().multiply(M(0, dep - 1.5, 0, R, R, R)), ORG, "paint");
    // 급전기: 세 다리 끝의 수신기 (신호를 받는 청록 불빛)
    const fy = R * 0.86;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; rig.beam([Math.cos(a) * R * 0.9, dep * 0.81 - 1.5, Math.sin(a) * R * 0.9], [0, fy, 0], 0.35, HULL2, { col: false }); }
    rig.box(0, fy, 0, 2.2, 2.6, 2.2, DARK, { col: false });
    { const p = rig.P(0, fy - 1.8, 0); ball(w, p.x, p.y, p.z, 0.8, CYA); const q = rig.P(0, fy, 0); w.col.addSphere(q, 1.6); }
    // 그릇 안에 쌓인 눈(낮은 쪽), 테두리 고드름
    { const lo = tilt >= 0 ? 1 : -1, p = rig.P(lo * R * 0.5, -1.5 + dep * 0.3, 0); w.mesh(G.ico(), M(p.x, p.y + 0.4, p.z, R * 0.42, 1.2, R * 0.6, 0, 0, -tilt), SNOW, "std"); }
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, p = rig.P(Math.cos(a) * R * 0.99, dep - 1.6, Math.sin(a) * R * 0.99); icicle(w, p.x, p.y, p.z, 0.28, 1.6 + r() * 3.4, r() < 0.3 ? ICE_D : ICE); }
    // 충돌: 그릇은 기울인 납작 상자 + 테두리 캡슐
    rig.w.col.addBox(rig.P(0, dep * 0.3 - 1.5, 0), V3(R * 0.72, dep * 0.34, R * 0.72), rig.q);
    for (let i = 0; i < 12; i++) { const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2; w.col.addCapsule(rig.P(Math.cos(a0) * R, dep - 1.5, Math.sin(a0) * R), rig.P(Math.cos(a1) * R, dep - 1.5, Math.sin(a1) * R), 0.9); }
    w.gap("거대 접시 아래", x, 7, z, 90, 30, 11, 300);
    // 바닥: 정비 발판과 표시등
    w.box(x, -0.5, z, 12, 0.85, 8, CONC2, { mat: "std:concrete", tile: 4, col: false });
    for (const s of [-1, 1]) for (const k of [-1, 1]) w.box(x + k * 16, 0, z + s * (DISH_LEG + 4), 0.5, 0.9, 0.5, AMB, { mat: "glow", col: false });
  });
}

// ── 반지하 아치 격납고 둘: 양옆에 눈 둔덕을 덮은 골판 아치. 남북 문이 열려 있어 관통할 수 있다 ──
export function hangars(w, K, S) {
  const N = 12, L = HZ1 - HZ0, zc = (HZ0 + HZ1) / 2, r = w.rand;
  const gable = gableGeo(HA, HWALL, HRISE, DOOR);
  HANGARS.forEach((cx, i) => {
    for (const s of [-1, 1]) {
      w.box(cx + s * (HA - 0.4), -0.5, zc, 0.8, HWALL + 0.5, L, CONC2, { mat: "std:concrete", tile: 4 });
      // 눈 둔덕(흙을 덮은 방호 둔덕)
      w.box(cx + s * (HA + 4.2), -3.2, zc, 12, 6, L + 3, SNOW, { rz: s * -27, ao: false });
      for (let k = 0; k < 4; k++) drift(w, cx + s * (HA + 5 + r() * 3), 0.6 + r(), HZ0 + 4 + k * (L - 8) / 3, 5 + r() * 2, 1.6 + r(), 6 + r() * 2, k % 2 ? SNOW : SNOW_SH);
    }
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI, t1 = ((k + 1) / N) * Math.PI;
      const p0 = [Math.cos(t0) * HA, HWALL + Math.sin(t0) * HRISE], p1 = [Math.cos(t1) * HA, HWALL + Math.sin(t1) * HRISE];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.15, mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, rz = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) / DEG;
      w.box(cx + mx, my - 0.35, zc, len, 0.7, L + 1.2, k % 2 ? WCAMO : 0xb4bec9, { mat: "std:corrug", tile: 3, rz, ao: false });
      // 지붕 위쪽에는 눈이 얹혔다
      if (k >= 3 && k <= 8) w.box(cx + mx * 1.02, my + 0.3, zc + (r() - 0.5) * 2, len * (0.7 + r() * 0.3), 0.45, L * (0.72 + r() * 0.26), SNOW, { rz, col: false, ao: false });
    }
    for (const [zw, face] of [[HZ0, -1], [HZ1, 1]]) {
      w.mesh(gable, M(cx, -0.3, zw), CONC, "std:concrete");
      for (let u = -HA + 1; u <= HA - 1 + 0.01; u += 2) {
        const top = archY(u), inDoor = Math.abs(u) < DOOR.w / 2 - 0.2, y0 = inDoor ? DOOR.h : 0;
        if (top - y0 > 0.2) w.col.addBox(V3(cx + u, (y0 + top) / 2, zw), V3(1.05, (top - y0) / 2, 0.45));
      }
      // 문틀(경고 줄무늬)과 밀어 둔 방폭문, 처마 고드름
      w.box(cx, DOOR.h - 0.3, zw + face * 0.3, DOOR.w + 1.4, 0.9, 0.5, ORG, { mat: "std:hazard", tile: 2, col: false });
      for (const s of [-1, 1]) {
        w.box(cx + s * (DOOR.w / 2 + 0.35), -0.3, zw + face * 0.3, 0.7, DOOR.h, 0.5, ORG, { mat: "std:hazard", tile: 2, col: false });
        w.box(cx + s * (DOOR.w / 2 + 2.3), -0.3, zw + face * 0.8, 4.6, DOOR.h - 0.4, 0.5, STEEL, { mat: "std:corrug", tile: 2 });
      }
      icicles(w, [cx - DOOR.w / 2, DOOR.h - 0.3, zw + face * 0.4], [cx + DOOR.w / 2, DOOR.h - 0.3, zw + face * 0.4], 12, 1.5);
      w.gap(face > 0 ? "격납고 관통" : "격납고 뒷문", cx, DOOR.h * 0.5, zw, 0, DOOR.w - 5, DOOR.h - 2.5, face > 0 ? 250 : 350);
      K.blink.add(cx - HA + 1, HWALL + 1.5, zw + face * 0.6, RED, 0.3, i); K.blink.add(cx + HA - 1, HWALL + 1.5, zw + face * 0.6, RED, 0.3, i + 1);
    }
    S.add(`H${i + 1}`, cx, 10.4, HZ1 + 0.5, 6.2, { height: 1.6 });
    // 실내: 바닥·천장등·벽 쪽 장비 (가운데 폭 12 m 통로는 비운다)
    w.box(cx, -0.5, zc, HA * 2 - 1.6, 0.82, L - 1, 0x8f959c, { mat: "std:concrete", tile: 5, col: false, ao: false });
    w.box(cx, 0.33, zc, 0.35, 0.03, L - 4, AMB, { col: false, ao: false });
    for (const u of [-7, 7]) { w.box(cx + u, archY(u) - 1.3, zc, 0.9, 0.25, L - 8, 0xeaf4ff, { mat: "glow", col: false }); for (const dz of [-11, 0, 11]) w.pool(cx + u, 0.36, zc + dz, 7, 0xdcecff, 0.07); }
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const u = cx + s * (HA - 2.6), v = HZ0 + 6 + k * 9.2, kind = (i * 3 + k + (s > 0 ? 2 : 0)) % 4;
      if (kind === 0) { w.box(u, 0.3, v, 2.2, 2.2, 5, OLIVE, { mat: "paint" }); w.box(u, 2.5, v - 0.8, 2, 1.2, 2.4, 0x7a846c, { mat: "paint", col: false }); }
      else if (kind === 1) { w.cyl(u, 0.3, v - 1.4, 0.9, 2.2, ORG, { mat: "paint" }); w.cyl(u, 0.3, v + 1.2, 0.9, 2.2, 0x56606e, { mat: "paint" }); }
      else if (kind === 2) { w.box(u, 0.3, v, 2.4, 3.4, 4.4, STEEL, { mat: "std:panel", tile: 3 }); w.box(u - s * 1.25, 2.2, v, 0.1, 0.5, 2.6, GRN, { mat: "glow", col: false }); }
      else { w.box(u, 0.3, v, 2.2, 1.3, 3.2, 0x8a7350, { mat: "std:wood", tile: 2 }); w.box(u, 1.6, v + 0.4, 1.8, 1.1, 2, 0x9a8360, { mat: "std:wood", tile: 2, col: false }); }
    }
  });
  // 계류장 동쪽 끝: 컨테이너 더미와 발전기
  w.container(30, 0.2, -14, 6, 0x4f6a86); w.container(30.4, 2.8, -14.3, 2, 0x8a4a3a); w.container(31, 0.2, -20.5, -4, 0x5c6a54);
  w.box(30.4, 5.4, -14.3, 12.4, 0.45, 2.7, SNOW, { ry: 2, col: false, ao: false }); w.box(31, 2.8, -20.5, 12.4, 0.45, 2.7, SNOW, { ry: -4, col: false, ao: false });
  w.box(22, 0.2, -4, 4, 2.6, 6, OLIVE, { mat: "paint" }); w.cyl(23, 2.8, -5.5, 0.3, 2.4, DARK, { mat: "paint", col: false });
}

// ── 지휘 벙커: 눈에 반쯤 묻힌 콘크리트 블록. 가느다란 총안에서 난로 불빛이 샌다 ──
export function bunker(w, K, S) {
  const [x, z] = BUNKER, F = frame(w, x, z, 0, -0.6), r = w.rand;
  F.box(0, 0, 0, 26, 6.6, 16, CONC, { mat: "std:concrete", tile: 5 });
  F.box(-3, 6.6, -1, 14, 3.4, 10, CONC2, { mat: "std:concrete", tile: 5 });
  snowRoof(w, x, 6, z, 26, 16); snowRoof(w, x - 3, 9.4, z - 1, 14, 10);
  // 북·동·서쪽은 눈 둔덕에 묻혔다
  F.box(0, -3.4, -11.5, 30, 7, 10, SNOW, { rx: -30, ao: false });
  for (const s of [-1, 1]) F.box(s * 16.5, -3.4, -1, 10, 7, 18, SNOW, { rz: s * -30, ao: false });
  for (let i = 0; i < 6; i++) drift(w, x - 16 + i * 6.4, 1 + r(), z - 13 - r() * 2, 5, 1.6, 4, i % 2 ? SNOW : SNOW_SH);
  // 남쪽 정면: 총안 창과 방폭문, 처마 고드름
  for (const u of [-10, -6, 6, 10]) F.box(u, 3.6, 8.02, 2.6, 0.7, 0.1, WARM, { mat: "glow", col: false });
  for (const u of [-7, -3, 1]) F.box(u, 7.9, 4.02, 2.2, 0.6, 0.1, WARM, { mat: "glow", col: false });
  F.box(0, 0.6, 8.3, 4.4, 3.6, 0.7, DARK, { mat: "paint", col: false }); F.box(0, 4.2, 8.5, 5.4, 0.5, 1.4, CONC2, { col: false });
  F.box(0, 0.6, 8.7, 3.4, 3.2, 0.12, STEEL, { mat: "std:corrug", tile: 2, col: false });
  w.box(x, 4.6, z + 9.1, 0.8, 0.3, 0.3, AMB, { mat: "glow", col: false }); w.pool(x, 0.4, z + 11, 7, WARM, 0.35);
  icicles(w, [x - 13, 6, z + 8.2], [x + 13, 6, z + 8.2], 22, 1.6);
  S.add("cmd", x + 8.2, 2.2, z + 8.08, 6, { height: 1.2 });
  // 지붕: 작은 레이돔, 돛대, 환기구 김
  dome(w, x + 7, 6, z - 1, 3.4, 0xe6ecf2, {}); w.box(x + 7, 5.4, z - 1, 7.6, 0.9, 7.6, CONC2, { col: false });
  w.pipe(x - 8, 9.6, z - 3, x - 8, 16.5, z - 3, 0.22, HULL2, {}); beam(w, [x - 9.8, 14.5, z - 3], [x - 6.2, 14.5, z - 3], 0.2, HULL2, { col: false });
  K.blink.add(x - 8, 17, z - 3, RED, 0.35, 1);
  w.cyl(x + 1, 9.8, z + 2, 0.5, 1.4, DARK, { mat: "paint", col: false });
  return [x + 1, 11.4, z + 2];
}

// ── 활주로·계류장·착륙 패드: 눈을 밀어낸 포장면과 등화 ──
export function pavement(w, K, S) {
  const r = w.rand, cx = (RWY.x0 + RWY.x1) / 2, L = RWY.x1 - RWY.x0, T = 0.32;
  w.box(cx, -0.5, RWY.z, L, 0.5 + T, RWY.w, 0x474d57, { mat: "std:asphalt", tile: 6, ao: false });
  w.box(-49, -0.5, -6, 84, 0.5 + T - 0.02, 26, 0x858c95, { mat: "std:concrete", tile: 6, ao: false });       // 계류장
  // 중앙선·가장자리 선, 끝 표시
  for (let x = RWY.x0 + 8; x < RWY.x1 - 6; x += 11) w.box(x, T, RWY.z, 6, 0.03, 0.5, 0xe8edf2, { col: false, ao: false });
  for (const s of [-1, 1]) w.box(cx, T, RWY.z + s * (RWY.w / 2 - 0.8), L - 4, 0.03, 0.3, 0xe8edf2, { col: false, ao: false });
  for (let k = -3; k <= 3; k++) for (const e of [RWY.x0 + 3.5, RWY.x1 - 3.5]) w.box(e, T, RWY.z + k * 2.2, 4, 0.03, 1, 0xe8edf2, { col: false, ao: false });
  // 바람에 다시 덮인 눈 줄무늬와 밀어 쌓은 눈 둑
  for (let i = 0; i < 26; i++) { const x = RWY.x0 + 4 + r() * (L - 8); w.box(x, T, RWY.z + (r() - 0.5) * (RWY.w - 3), 3 + r() * 7, 0.035, 0.3 + r() * 0.7, SNOW_SH, { ry: 14 + r() * 10, col: false, ao: false }); }
  for (let x = RWY.x0; x <= RWY.x1; x += 7) for (const s of [-1, 1]) if (r() < 0.8) w.mesh(G.ico(), M(x + r() * 5, 0.2, RWY.z + s * (RWY.w / 2 + 2.8 + r() * 1.6), 4 + r() * 4, 0.5 + r() * 0.8, 1.3 + r() * 1.2, 0, (r() - 0.5) * 16, 0), r() < 0.5 ? SNOW : SNOW_SH, "std");
  // 활주로등: 가장자리 호박색, 끝은 초록·빨강
  for (let x = RWY.x0; x <= RWY.x1 + 0.1; x += 13) for (const s of [-1, 1]) { w.box(x, T, RWY.z + s * (RWY.w / 2 + 0.6), 0.35, 0.5, 0.35, AMB, { mat: "glow", col: false }); if ((x - RWY.x0) % 26 < 1) w.pool(x, T + 0.04, RWY.z + s * (RWY.w / 2 + 0.6), 3.2, AMB, 0.3); }
  for (let k = -3; k <= 3; k++) { w.box(RWY.x0 - 1.2, T, RWY.z + k * 2.4, 0.35, 0.5, 0.35, GRN, { mat: "glow", col: false }); w.box(RWY.x1 + 1.2, T, RWY.z + k * 2.4, 0.35, 0.5, 0.35, RED, { mat: "glow", col: false }); }
  S.add("rwy", RWY.x0 + 14, T + 0.03, RWY.z, 9, { pitch: -90, ry: 90 });
  // 착륙 패드와 수송정 한 대
  const px = 60, pz = -14;
  w.cyl(px, -0.5, pz, 10, 0.5 + T, 0x565d68, { mat: "std:asphalt", tile: 5, ao: false, col: false });
  w.col.addBox(V3(px, T - 0.4, pz), V3(9, 0.4, 9));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; w.box(px + Math.cos(a) * 9.4, T, pz + Math.sin(a) * 9.4, 0.3, 0.4, 0.3, CYA, { mat: "glow", col: false }); }
  S.add("pad", px, T + 0.03, pz, 7, { pitch: -90 });
  dropship(w, px, T, pz, 35);
}

// 아군 수송정(정적): 납작한 동체, 틸트 엔진 둘, 꼬리. 눈을 조금 뒤집어썼다
export function dropship(w, x, y, z, ry = 0, color = HULL) {
  const g = new Rig(w, x, y, z, 0, ry, 0);
  for (const s of [-1, 1]) { g.box(s * 1.5, 0.35, -1.5, 0.3, 0.7, 0.3, DARK, { col: false }); g.box(s * 1.5, 0.35, 2.5, 0.3, 0.7, 0.3, DARK, { col: false }); g.box(s * 1.5, 0.1, 0.5, 0.5, 0.2, 5.4, DARK, { col: false }); }
  g.box(0, 2, 0.5, 3.4, 2.6, 9, color).box(0, 1.9, -5, 2.6, 2, 2.4, color, { rx: -14 }).box(0, 2.6, -5.2, 2.2, 0.8, 1.6, 0x3a6a8c, { mat: "paint", col: false, rx: -24 });
  g.box(0, 2.7, 6.4, 1.6, 1.4, 4.4, HULL2, { rx: 10 }).box(0, 4.6, 7.8, 0.3, 2.6, 2.2, HULL2).box(0, 5.8, 8, 5, 0.25, 1.5, HULL2, { col: false });
  g.box(0, 3.2, 0, 11, 0.4, 2.6, HULL2);
  for (const s of [-1, 1]) { g.pipe([s * 5.6, 2.4, 0], [s * 5.6, 4.2, 0], 1.25, DARK).pipe([s * 5.6, 4.2, 0], [s * 5.6, 4.5, 0], 1.45, ORG, { col: false }); g.box(s * 1.72, 2, 0.5, 0.06, 0.5, 6, NAVYB, { col: false }); }
  g.box(0, 3.42, 0.8, 3, 0.2, 7.4, SNOW, { mat: "std", col: false }).box(0, 3.5, 0, 9, 0.16, 2, SNOW, { mat: "std", col: false });
}
const NAVYB = 0x2f6fb0;

// ── 기지 살림: 레이돔, 연료 탱크, 경계 초소와 방벽, 기상 관측 마스트 ──
export function facilities(w, K, S, ctx) {
  const r = w.rand;
  // 레이돔(다면체 구) — 팔각 받침 위
  for (const [x, z, R] of [[72, -72, 7], [-8, -78, 5]]) {
    octa(w, x, -0.5, z, R * 0.8, 4.6, CONC, {});
    w.mesh(G.ico0(), M(x, 4 + R * 0.86, z, R, R, R), 0xe8eef4, "paint"); w.col.addSphere(V3(x, 4 + R * 0.86, z), R);
    w.mesh(G.hemi(), M(x, 4 + R * 1.42, z, R * 0.86, R * 0.5, R * 0.86), SNOW, "std");
    K.blink.add(x, 4.4 + R * 1.9, z, RED, 0.35, 0);
  }
  // 연료 탱크 셋(누운 원통)과 방유 둑
  for (let i = 0; i < 3; i++) {
    const x = 10, z = -30 - i * 7.5;
    w.mesh(G.cyl, M(x, 2.6, z, 2.6, 13, 2.6, 0, 0, 90), i === 1 ? 0xd9dde2 : 0xc3c9d0, "paint"); w.col.addCapsule(V3(x - 5, 2.6, z), V3(x + 5, 2.6, z), 2.6);
    for (const u of [-4, 4]) w.box(x + u, -0.3, z, 0.8, 1.6, 4.4, CONC2, { col: false });
    w.box(x, 5, z, 11, 0.4, 2.4, SNOW, { col: false, ao: false });
    w.box(x + 6.6, 1.6, z, 0.12, 1.2, 1.2, ORG, { mat: "std:hazard", tile: 1, col: false });
  }
  w.wall(1, -25.5, 19, -25.5, 1.2, 0.6, CONC2, { y: -0.3 }); w.wall(1, -49.5, 19, -49.5, 1.2, 0.6, CONC2, { y: -0.3 });
  S.add("fuel", 10, 1.4, -25.1, 7, { height: 1 });
  // 방벽(흙 자루 블록)과 초소: 기지 둘레 군데군데
  const hesco = (x, z, len, ry) => {
    if (!ctx.free(x, z, 3)) return;
    w.box(x, -0.4, z, len, 2.4, 1.8, 0x8a8674, { ry, mat: "std:dirt", tile: 2.5 }); w.box(x, 2, z, len + 0.2, 0.4, 2, SNOW, { ry, col: false, ao: false });
  };
  for (const [x, z, len, ry] of [[58, -138, 30, -3], [120, -128, 24, -24], [88, 62, 24, 80], [92, 92, 22, 96], [-84, 70, 22, 84], [-78, 100, 20, 66], [40, 108, 26, 8], [-40, 112, 24, -6]]) hesco(x, z, len, ry);
  for (const [x, z, ry] of [[96, -132, 200], [-88, -124, 150], [96, 50, 290], [-86, 52, 60]]) if (ctx.free(x, z, 5)) {
    const F = frame(w, x, z, ry, -0.4);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) F.beam(su * 1.7, 0, sv * 1.7, su * 1.5, 8, sv * 1.5, 0.3, 0x5a4a3a, { mat: "std" });
    F.box(0, 8, 0, 4.4, 0.3, 4.4, 0x5a4a3a, { mat: "std:wood", tile: 2 }); F.box(0, 8.3, 0, 4, 1.1, 4, OLIVE, { mat: "paint", col: false });
    F.box(0, 10.8, 0, 5, 0.3, 5, 0x4a5246, { mat: "paint" }); F.box(0, 11.1, 0, 5.2, 0.4, 5.2, SNOW, { col: false, ao: false });
    for (const su of [-1, 1]) for (const sv of [-1, 1]) F.beam(su * 1.9, 8.3, sv * 1.9, su * 1.9, 10.8, sv * 1.9, 0.16, 0x5a4a3a, { col: false });
    F.box(0, 9.9, -2.1, 1.2, 0.6, 0.5, 0xeaf4ff, { mat: "glow", col: false });
    icicles(w, [F.X(-2.5, -2.6), 10.4, F.Z(-2.5, -2.6)], [F.X(2.5, -2.6), 10.4, F.Z(2.5, -2.6)], 6, 1.2);
  }
  // 기상 관측 마스트와 풍향 자루 (활주로 옆)
  for (const [x, z] of [[-88, 30], [70, 30]]) if (ctx.free(x, z, 2)) {
    w.pipe(x, 0, z, x, 7, z, 0.12, 0xd8dde4, {});
    w.mesh(G.cone8(), M(x + 1.9, 6.6, z + 0.9, 0.55, 3.6, 0.55, 0, 25, -98), ORG, "paint");
    w.box(x, 7, z, 0.3, 0.3, 0.3, RED, { mat: "glow", col: false });
  }
  // 보급품 야적장(계류장 남쪽 모서리): 방수포 덮은 상자 더미
  for (const [x, z] of [[-14, -2], [-16, 4], [2, -8]]) {
    w.box(x, 0.3, z, 3, 1.8 + r(), 2.4, 0x7a6a4a, { ry: r() * 30, mat: "std:wood", tile: 2 }); w.box(x + 0.2, 2 + r() * 0.3, z, 3.4, 0.3, 2.8, 0x5c6a54, { ry: r() * 30, col: false });
  }
  void INK; void HULL;
}
