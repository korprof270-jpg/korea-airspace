// 거신 공창의 중공업 구역: 고로 셋과 굴뚝 · 주조동 · 수로 위 배관 다리 · 화물 철도와 터널 · 얼어붙은 냉각호 · 발전소와 송전 철탑
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, prop, ring, octa, ball, lattice, V3, DEG, hash, plume, BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ,
  SNOW, SNOW2, ICE, ICE2, CONC, CONC2, SOOT, C, PIT_R, PIT_D, ROAD_R, LAKE, FURN, CHAN, HALL, RAIL, SPUR, NGAN, PSTN, LAVA_Y, CH_D, polar, chanDist, snowCap,
} from "./foundry-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 14);
const bxp = (sx, sy, sz, x, y, z, c, ry = 0, rx = 0, rz = 0) => [BOXG, M(x, y, z, sx, sy, sz, rx, ry, rz), c];
const cyp = (r, h, x, y, z, c, rx = 0, rz = 0) => [CYLG, M(x, y, z, r, h, r, rx, 0, rz), c];
const COLD = 0xbfe8ff;                   // 전기·얼음의 찬 빛(강조색)

// ── 고로: 받침 · 배불뚝이 노체 · 꼭대기 장입 장치 · 하강관과 제진기 · 열풍로 셋 · 높은 굴뚝 · 출선구 ──
export function furnaces(w, K) {
  FURN.forEach(([x, z], i) => {
    octa(w, x, 0, z, 14, 5, CONC2, { mat: "std:concrete" });
    w.cyl(x, 5, z, 10.5, 8, BLK2, { mat: "std:panel", rt: 11.5 });
    w.cyl(x, 13, z, 11.5, 16, RUST, { mat: "std:panel", rt: 8.5 });
    w.cyl(x, 29, z, 8.5, 13, IRON, { mat: "std:panel", rt: 5 });
    w.cyl(x, 42, z, 5.6, 5, STEEL, { mat: "paint" });
    w.box(x, 47, z, 7, 3, 7, BLK2, { mat: "paint" });
    for (const [y, r, c] of [[8.2, 11.3, ORG], [12.6, 11.9, EMB], [28.6, 8.9, DRED]]) w.cyl(x, y, z, r, 0.8, c, { mat: "glow", col: false });
    // 송풍구 불빛(노체 둘레 점들)과 작업 발판 고리
    for (let k = 0; k < 10; k++) { const a = k * 0.628; ball(w, x + Math.cos(a) * 11.2, 10.4, z + Math.sin(a) * 11.2, 0.75, EMB); }
    for (const [y, r] of [[20, 12.6], [30, 10.4], [42.2, 7.6]]) { ring(w, x, y, z, r, 0.5, GUN, { pitch: 90, seg: 24, col: false }); ring(w, x, y + 1.4, z, r + 0.2, 0.14, HAZ, { pitch: 90, seg: 24, col: false }); }
    // 버팀 철골 넷
    for (const su of [-1, 1]) for (const sv of [-1, 1]) { beam(w, [x + su * 13, 0, z + sv * 13], [x + su * 6.5, 46, z + sv * 6.5], 1.1, STEEL); beam(w, [x + su * 13, 0, z + sv * 13], [x + su * 9.4, 20, z - sv * 9.4], 0.5, IRON, { col: false }); }
    // 하강관 → 제진기
    w.pipe(x + 3, 48, z + 3, x + 17, 40, z + 12, 1.7, RUST, { mat: "metal" });
    w.pipe(x + 17, 40, z + 12, x + 17, 20, z + 12, 1.7, RUST, { mat: "metal" });
    w.cyl(x + 17, 6, z + 12, 4.4, 14, IRON, { mat: "std:panel" });
    w.cyl(x + 17, 0, z + 12, 1.2, 6, STEEL, { mat: "paint", rt: 4.4, col: false });
    // 열풍로 셋(둥근 머리 원통)과 열풍 본관
    for (let k = 0; k < 3; k++) {
      const sx = x - 6 + k * 9.5, sz = z - 18;
      w.cyl(sx, 0, sz, 3.9, 25, k % 2 ? STEEL : IRON, { mat: "std:panel" });
      w.sph(sx, 25, sz, 3.9, RUST, { mat: "metal", col: false });
      w.cyl(sx, 8, sz, 4.1, 0.7, DRED, { mat: "glow", col: false });
      K.blink.add(sx, 29.4, sz, RED, 0.45, k);
      w.pipe(sx, 12, sz, sx, 12, sz + 6, 0.9, GUN, { col: false });
    }
    w.pipe(x - 8, 12, z - 12, x + 15, 12, z - 12, 1.1, GUN, { mat: "metal" });
    // 굴뚝: 붉은 띠, 꼭대기 표시등, 구름에 섞이는 검은 연기
    const cx = x + 20, cz = z - 16, H = 74 + i * 7;
    w.cyl(cx, 0, cz, 3.6, H, i % 2 ? 0x3a3d45 : 0x33363d, { mat: "std:concrete", rt: 2.3 });
    w.cyl(cx, 0, cz, 5, 4, CONC2, { mat: "std:concrete", col: false });
    for (const f of [0.55, 0.75, 0.95]) w.cyl(cx, H * f, cz, 3.6 - 1.3 * f + 0.15, 3, f > 0.9 ? HAZ : DRED, { mat: "paint", col: false });
    for (let k = 0; k < 3; k++) K.blink.add(cx + Math.cos(k * 2.09) * 2.6, H + 0.6, cz + Math.sin(k * 2.09) * 2.6, RED, 0.6, k + i);
    K.smoke.add(cx, H + 3, cz, 8, 230, 8, 0.4);
    // 출선구: 노체 서쪽에서 수로 머리로 흘러내리는 쇳물
    w.box(x - 12.5, 0, z, 5, 3.4, 9, BLK2, { mat: "paint" });
    w.box(x - 12.5, 3.4, z, 5.4, 0.5, 9.4, HAZ, { mat: "std:hazard", tile: 2, col: false });
    K.lava.quad([x - 10.2, 3.2, z - 2.2], [x - 10.2, 3.2, z + 2.2], [x - 15.2, 3.0, z + 2.2], [x - 15.2, 3.0, z - 2.2]);
    K.lava.quad([x - 15.2, 3.0, z - 2.2], [x - 15.2, 3.0, z + 2.2], [x - 16.4, LAVA_Y, z + 3.4], [x - 16.4, LAVA_Y, z - 3.4]);
    w.pool(x - 16, 0.1, z, 24, ORG, 0.6);
    K.sparks.push([x - 16, 0, z, 4, 1]);
    K.steam.add(x - 15, 2, z, 3.5, 22, 3, 0.15);
    // 지붕 없는 주상(출선구 위 크레인 보)
    for (const sv of [-1, 1]) { w.box(x - 20, 0, z + sv * 9.5, 1.2, 12, 1.2, STEEL, { mat: "paint" }); }
    w.box(x - 20, 12, z, 1.6, 1.6, 21, IRON, { mat: "paint" });
    w.box(x - 20, 11.6, z, 0.3, 0.3, 19, RED, { mat: "glow", col: false });
    w.gap("고로 출선구 보 밑", x - 20, 6.5, z, 90, 17, 9, 250);
  });
}

// ── 주조동: 가운데 쇳물 수로가 흐르는 동서로 뚫린 긴 건물. 박공지붕, 천장 크레인, 지붕 환기창의 불빛 ──
export function hall(w, K) {
  const { x0, x1, z, w: W, h: H } = HALL, L = x1 - x0, xm = (x0 + x1) / 2, hw = W / 2, EAVE = 16;
  for (const sv of [-1, 1]) {
    w.box(xm, 0, z + sv * (hw - 0.75), L, EAVE, 1.5, BLK2, { mat: "std:panel", tile: 8 });
    w.box(xm, 0, z + sv * (hw + 0.2), L + 1, 2.6, 1, CONC2, { mat: "std:concrete", col: false });
    // 바깥벽 세로 틈(안쪽 불빛)과 버팀벽
    for (let k = 0; k <= 6; k++) {
      const px = x0 + 2 + k * (L - 4) / 6;
      w.box(px, 0, z + sv * (hw + 0.4), 1.6, EAVE + 0.6, 1.4, IRON, { mat: "paint", col: false });
      if (k < 6) w.box(px + (L - 4) / 12, 5, z + sv * (hw + 0.05), 1.1, 8, 0.2, k % 2 ? ORG : EMB, { mat: "glow", col: false });
    }
    // 박공지붕(안쪽이 높다) + 처마 쪽에만 남은 눈
    const ang = Math.atan2(H - EAVE, hw) / DEG, sl = Math.hypot(hw, H - EAVE);
    w.box(xm, (EAVE + H) / 2 - 0.4, z + sv * hw / 2, L + 2, 0.8, sl + 0.6, IRON, { mat: "std:corrug", tile: 4, rx: sv * ang });
    w.box(xm, EAVE + (H - EAVE) * 0.24 + 0.45, z + sv * hw * 0.76, L + 2.2, 0.7, sl * 0.5, SNOW, { rx: sv * ang, col: false, ao: false });
    // 천장 크레인 레일
    w.box(xm, 13.2, z + sv * (hw - 2.4), L, 0.9, 0.9, STEEL, { mat: "paint", col: false });
  }
  // 용마루 환기창(아래로 주황빛이 샌다)과 배기통
  w.box(xm, H - 0.6, z, L - 6, 2.6, 5, BLK2, { mat: "std:panel", tile: 6 });
  w.box(xm, H + 2, z, L - 5, 0.5, 6, IRON, { mat: "paint", col: false });
  for (const sv of [-1, 1]) w.box(xm, H + 0.2, z + sv * 2.55, L - 8, 1.3, 0.2, ORG, { mat: "glow", col: false });
  for (const fx of [0.2, 0.5, 0.8]) { w.cyl(x0 + L * fx, H + 2, z + 8, 1.3, 8, STEEL, { mat: "paint", col: false }); K.steam.add(x0 + L * fx, H + 11, z + 8, 2.6, 30, 3, 0.2); }
  // 양 끝 입구: 머리보와 박공 삼각 벽, 경고 띠와 붉은 등
  for (const [ex, sg] of [[x0, -1], [x1, 1]]) {
    w.box(ex, EAVE, z, 1.6, 2.4, W, IRON, { mat: "paint" });
    w.box(ex, EAVE + 2.4, z, 1.4, 1.8, W * 0.55, IRON, { mat: "paint", col: false });
    w.box(ex + sg * 0.85, EAVE + 0.2, z, 0.2, 0.9, W - 4, RED, { mat: "glow", col: false });
    for (const sv of [-1, 1]) { w.box(ex, 0, z + sv * (hw - 1), 2.2, EAVE, 2.6, CONC2, { mat: "std:concrete", tile: 6 }); w.box(ex + sg * 1.15, 0, z + sv * (hw - 1), 0.2, 9, 2.2, HAZ, { mat: "std:hazard", tile: 2, col: false }); K.blink.add(ex + sg * 1.4, EAVE + 1.2, z + sv * (hw - 1), RED, 0.5, sv > 0 ? 0 : 1); }
  }
  // 안쪽: 수로 양쪽 주상 발판, 주형 틀과 식는 주괴, 빛 웅덩이
  for (let k = 0; k < 5; k++) {
    const px = x0 + 6 + k * (L - 12) / 4;
    for (const sv of [-1, 1]) {
      w.box(px, 0, z + sv * 9.6, 5, 1.1, 2.2, SOOT, { mat: "paint", col: false });
      w.box(px, 1.1, z + sv * 9.6, 3.6, 0.5, 1.2, k % 2 ? EMB : ORG, { mat: "glow", col: false });
    }
    w.pool(px, 0.2, z, 15, ORG, 0.5);
    w.shaft(px, H - 1, z, 0.5, 6, H - 2, ORG, 0.05);
  }
  // 천장 크레인과 쇳물 국자(천천히 오간다, 비행선보다 위)
  const parts = [bxp(2.2, 1.4, W - 5, 0, 0, 0, STEEL), bxp(3.4, 1.2, 3.4, 0, -0.9, 6.5, IRON), cyp(0.12, 2.6, -1, -2.6, 6.5, BLK), cyp(0.12, 2.6, 1, -2.6, 6.5, BLK), cyp(1.9, 2.6, 0, -4.6, 6.5, RUST), bxp(4.6, 0.3, 0.5, 0, -3.5, 6.5, GUN)];
  const g = new THREE.Group(); g.position.set(xm, 14.6, z);
  g.add(prop(w, parts, "paint"));
  const glow = prop(w, [cyp(1.6, 0.3, 0, -3.2, 6.5, EMB), bxp(0.3, 0.4, W - 6, 1.15, 0.2, 0, RED)], "glow", false); g.add(glow);
  w.scene.add(g);
  w.rider(g, [[0, 0, 0, 1.2, 0.8, hw - 2.5], [0, -4.2, 6.5, 2, 1.8, 2]], "crane");
  w.updaters.push((dt, t) => { g.position.x = xm + Math.sin(t * 0.13) * (L / 2 - 8); });
  w.gap("주조동 관통", xm, 6.5, z, 90, 18, 11, 500);
}

// ── 수로 위 배관 다리: 두 받침탑 사이의 보행 발판과 굵은 배관. 밑으로 수로를 따라 날 수 있다 ──
export function bridges(w, K, ctx) {
  // [x, z, 수로 방향("x" = 동서로 흐르는 수로를 남북으로 건넌다), 발판 높이]
  const list = [[72, -30, "x", 10.5], [35, -90, "z", 10], [70, -135, "x", 10], [102, -135, "x", 11], [20, 36, "z", 10], [62, 75, "x", 10], [100, 75, "x", 11], [152, 75, "x", 10]];
  for (const [x, z, ax, Y] of list) {
    const ew = ax === "x", P = (s, o = 0) => (ew ? [x + o, z + s] : [x + s, z + o]);
    let ok = true;
    for (let s = -11; s <= 11; s += 5.5) { const [px, pz] = P(s); if (!ctx.clear(px, Y + 1, pz, 5.2)) ok = false; }
    if (!ok) continue;
    for (const sd of [-1, 1]) {
      const [tx, tz] = P(sd * 11.5);
      w.box(tx, 0, tz, 2.6, Y, 2.6, STEEL, { mat: "paint" });
      w.box(tx, 0, tz, 3.6, 1.4, 3.6, CONC2, { mat: "std:concrete", col: false });
      w.box(tx, Y + 0.4, tz, 1, 2.6, 1, IRON, { mat: "paint", col: false });
      K.blink.add(tx, Y + 3.5, tz, RED, 0.45, sd > 0 ? 0 : 1);
      const [a0, a1] = P(sd * 11.5, 0), [b0, b1] = P(sd * 5, 0);
      beam(w, [a0, Y - 5, a1], [b0, Y, b1], 0.45, IRON, { col: false });
    }
    w.box(x, Y, z, ew ? 3 : 24, 0.5, ew ? 24 : 3, IRON, { mat: "std:panel", tile: 4 });
    for (const o of [-1.5, 1.5]) { const [a0, a1] = P(-12, o), [b0, b1] = P(12, o); beam(w, [a0, Y + 1.6, a1], [b0, Y + 1.6, b1], 0.16, HAZ, { col: false }); }
    for (const [o, r, c, dy] of [[-2.4, 0.75, RUST, -0.4], [2.5, 0.55, GUN, -0.2], [2.5, 0.4, COLD, 1.1]]) { const [a0, a1] = P(-13, o), [b0, b1] = P(13, o); w.pipe(a0, Y + dy, a1, b0, Y + dy, b1, r, c, { col: false, mat: c === COLD ? "glow" : "metal" }); }
    w.box(x, Y - 0.25, z, ew ? 0.5 : 20, 0.25, ew ? 20 : 0.5, ORG, { mat: "glow", col: false });
    w.gap("배관 다리 밑", x, Y / 2 - 0.5, z, ew ? 90 : 0, 14, Y - 1.5, 250);
  }
}

// ── 화물 철도: 복선 선로 · 눈 둔덕을 뚫은 터널 · 산으로 들어가는 양 끝 굴 · 부품을 싣고 오가는 열차 ──
export function railway(w, K) {
  const { z: RZ, zA, zB } = RAIL;
  for (const tz of [zA, zB]) {
    for (const o of [-0.75, 0.75]) w.box(0, 0.2, tz + o, 470, 0.22, 0.2, GUN, { mat: "metal", col: false, ao: false });
    for (let x = -232; x <= 232; x += 4) w.box(x, 0.12, tz, 0.7, 0.12, 2.9, 0x2a2420, { col: false, ao: false });
  }
  // 터널 단면: 안폭 18 m, 높이 10 m
  const HW = SPUR.half, TH = 10.5;
  const tube = (xa, xb, snow) => {
    const xm = (xa + xb) / 2, L = Math.abs(xb - xa);
    for (const sv of [-1, 1]) w.box(xm, 0, RZ + sv * (HW + 1), L, TH, 2, CONC2, { mat: "std:concrete", tile: 8 });
    w.box(xm, TH, RZ, L, 1.8, HW * 2 + 4, CONC, { mat: "std:concrete", tile: 8 });
    if (snow) w.box(xm, TH + 1.8, RZ, L - 3, 3.4, HW * 2 + 8, SNOW, { ao: false });
    // 안쪽 조명 띠
    for (const sv of [-1, 1]) w.box(xm, 6.2, RZ + sv * (HW - 0.06), L - 2, 0.35, 0.12, sv > 0 ? ORG : RED, { mat: "glow", col: false });
    w.box(xm, TH - 0.1, RZ, L - 2, 0.12, 0.5, EMB, { mat: "glow", col: false });
  };
  const portal = (x, sg) => {
    // 머리벽: 양쪽 기둥벽 + 윗보(가운데는 뚫려 있다) + 경고 띠 · 붉은 테 · 신호등
    for (const sv of [-1, 1]) {
      w.box(x, 0, RZ + sv * (HW + 5.5), 2.4, 16, 9, CONC, { mat: "std:concrete", tile: 8 });
      w.box(x + sg * 1.3, 0, RZ + sv * (HW + 0.6), 0.25, TH, 1.2, HAZ, { mat: "std:hazard", tile: 2, col: false });
      w.box(x + sg * 1.35, 3, RZ + sv * (HW + 5.5), 0.2, 9, 0.5, RED, { mat: "glow", col: false });
      K.blink.add(x + sg * 1.6, 13, RZ + sv * (HW + 2.5), RED, 0.5, sv > 0 ? 0 : 1);
    }
    w.box(x, TH, RZ, 2.4, 6.5, HW * 2 + 2, CONC, { mat: "std:concrete", tile: 8 });
    w.box(x + sg * 1.3, TH + 0.1, RZ, 0.25, 0.5, HW * 2, RED, { mat: "glow", col: false });
    w.box(x + sg * 1.3, TH + 2.4, RZ, 0.3, 2.6, 9, IRON, { mat: "paint", col: false });
    w.box(x + sg * 1.5, TH + 3.1, RZ, 0.15, 1.2, 7, RED2, { mat: "glow", col: false });
    snowCap(w, x, 16.5, RZ, 3.4, HW * 2 + 20, 0, 1);
    w.pool(x + sg * 8, 0.1, RZ, 16, RED, 0.3);
  };
  // 둔덕 터널(양쪽이 뚫려 있어 꿰뚫고 날 수 있다)
  tube(SPUR.x0, SPUR.x1, true); portal(SPUR.x0 - 1, -1); portal(SPUR.x1 + 1, 1);
  for (let x = SPUR.x0 + 8; x < SPUR.x1; x += 12) w.pool(x, 0.1, RZ, 10, ORG, 0.35);
  w.gap("철도 터널", SPUR.x, 5.3, RZ, 90, HW * 2 - 2, TH - 1.5, 500);
  // 산으로 들어가는 양 끝 굴: 안쪽은 검은 막으로 막혀 있다
  for (const sg of [-1, 1]) {
    tube(sg * 207, sg * 264, true); portal(sg * 206, -sg);
    w.box(sg * 224, 0, RZ, 1, TH, HW * 2, 0x050608, { col: true, ao: false });
  }
  // 열차: 기관차 + 화차 여섯(거신 부품을 싣고 있다). 서쪽 굴에서 나와 하역 갠트리 밑에 섰다가 동쪽 굴로 들어간다
  const body = [], glow = [], boxes = [];
  const car = (x0, len, loco) => {
    const xm = x0 + len / 2;
    body.push(bxp(len, 0.9, 3.4, xm, 1.25, 0, IRON));
    for (const o of [-len / 2 + 2.4, len / 2 - 2.4]) body.push(bxp(3.2, 0.9, 2.6, xm + o, 0.55, 0, BLK));
    if (loco) {
      body.push(bxp(len - 1, 3.6, 3.3, xm, 3.5, 0, BLK2), bxp(len - 6, 1.1, 2.6, xm, 5.6, 0, IRON), bxp(1.2, 2.2, 3.5, xm + len / 2 - 0.4, 2.4, 0, HAZ), bxp(1.2, 2.2, 3.5, xm - len / 2 + 0.4, 2.4, 0, HAZ));
      glow.push(bxp(len - 0.8, 0.5, 3.36, xm, 4.4, 0, RED), bxp(0.2, 0.9, 1.6, xm + len / 2 + 0.25, 3.4, 0, EMB), bxp(0.2, 0.9, 1.6, xm - len / 2 - 0.25, 3.4, 0, EMB));
      boxes.push([xm, 3.2, 0, len / 2, 3.1, 1.8]);
    } else boxes.push([xm, 2.6, 0, len / 2, 2.4, 1.8]);
    return xm;
  };
  let cx = 0;
  const lx = car(cx, 18, true); cx += 19.2; void lx;
  // 화차 1: 거대한 손가락 한 개
  let xm = car(cx, 16, false); cx += 17.2;
  body.push(bxp(6, 2.6, 2.6, xm - 4.4, 3, 0, BLK2), bxp(5, 2.3, 2.3, xm + 1.6, 2.9, 0, BLK2), bxp(3.6, 1.9, 1.9, xm + 6, 2.7, 0, IRON), cyp(1.5, 2.8, xm - 1.2, 3, 0, GUN, 90), cyp(1.3, 2.5, xm + 4.2, 2.9, 0, GUN, 90));
  glow.push(bxp(0.3, 1.6, 2.7, xm - 1.2, 3, 0, RED));
  // 화차 2: 장갑판 묶음
  xm = car(cx, 16, false); cx += 17.2;
  for (let k = 0; k < 4; k++) body.push(bxp(13, 0.7, 3 - k * 0.2, xm, 2.1 + k * 0.95, 0, k % 2 ? BLK2 : IRON));
  glow.push(bxp(11, 0.2, 0.15, xm, 5.4, 1.2, RED));
  // 화차 3: 관절 고리(눕힌 원통)
  xm = car(cx, 16, false); cx += 17.2;
  body.push(cyp(1.9, 3, xm - 3.6, 3.6, 0, STEEL, 90), cyp(1.9, 3, xm + 3.6, 3.6, 0, STEEL, 90), bxp(12, 0.6, 3.2, xm, 1.9, 0, RUST));
  glow.push(cyp(1.1, 3.1, xm - 3.6, 3.6, 0, ORG, 90), cyp(1.1, 3.1, xm + 3.6, 3.6, 0, ORG, 90));
  // 화차 4·5: 상자와 덮개 씌운 짐(눈이 얹혔다), 화차 6: 연료 탱크
  xm = car(cx, 16, false); cx += 17.2;
  for (let k = 0; k < 4; k++) body.push(bxp(3.2, 2.4 + (k % 2) * 0.6, 3, xm - 5.4 + k * 3.6, 2.9 + (k % 2) * 0.3, 0, k % 2 ? 0x4a2a22 : 0x3a3f48));
  xm = car(cx, 16, false); cx += 17.2;
  body.push(bxp(13, 3, 3.1, xm, 3.2, 0, 0x4b4f58), bxp(13.2, 0.4, 3.3, xm, 4.9, 0, SNOW));
  xm = car(cx, 16, false); cx += 17.2;
  body.push(cyp(1.7, 13, xm, 3.4, 0, IRON, 0, 90), bxp(0.6, 3.4, 3.4, xm - 5, 3.3, 0, HAZ), bxp(0.6, 3.4, 3.4, xm + 5, 3.3, 0, HAZ));
  const LEN = cx;
  const train = new THREE.Group();
  train.add(prop(w, body, "paint"), prop(w, glow, "glow", false));
  train.position.set(-400, 0, zA); w.scene.add(train);
  w.rider(train, boxes, "train");
  const ease = (u) => u * u * (3 - 2 * u), STOP = -36, A = -236 - 0, B = 236 + LEN;
  w.updaters.push((dt, t) => {
    const u = t % 92;
    // 기관차 앞머리 위치(동쪽으로 달린다): 열차는 앞머리에서 서쪽으로 늘어서 있다
    let head;
    if (u < 26) head = A + (STOP - A) * (1 - (1 - u / 26) * (1 - u / 26));
    else if (u < 44) head = STOP;
    else if (u < 72) { const k = (u - 44) / 28; head = STOP + (B - STOP) * k * k; }
    else head = A;
    train.position.x = head; train.rotation.y = Math.PI;        // 차량은 +x 로 쌓았으므로 뒤집어 앞머리가 동쪽
    void ease;
  });
  // 하역장: 선로 사이 승강장과 신호 기둥
  w.box(-80, 0, RZ, 200, 0.5, 2.2, CONC, { mat: "std:concrete", tile: 6, col: false });
  w.box(-80, 0, zB + 6.5, 200, 0.9, 5, CONC2, { mat: "std:concrete", tile: 6 });
  w.box(-80, 0.9, zB + 4.2, 200, 0.06, 0.5, HAZ, { col: false, ao: false });
  for (const x of [-190, -100, -10, 36, 162, 190]) {
    w.box(x, 0, RZ + 13.5, 0.6, 9, 0.6, STEEL, { mat: "paint" });
    w.box(x, 8.4, RZ + 12.2, 0.5, 0.5, 3, STEEL, { mat: "paint", col: false });
    w.box(x, 6.6, RZ + 11, 1, 2.2, 0.6, BLK, { mat: "paint", col: false });
    K.blink.add(x - 0.6, 7.7, RZ + 11, RED, 0.38, x > 0 ? 0 : 1); ball(w, x - 0.6, 6.9, RZ + 11, 0.3, ORG);
  }
}

// ── 얼어붙은 냉각호: 얼음판과 금 · 눈 더미 · 취수 펌프장 · 구덩이로 가는 냉각 본관 · 방열판 · 김이 오르는 배수구 ──
export function lake(w, K, ctx) {
  const { x, z, r } = LAKE;
  const disc = new THREE.CircleGeometry(1, 44); disc.rotateX(-Math.PI / 2);
  w.mesh(disc, M(x, -0.5, z, r - 2.2, 1, r - 2.2), ICE, "metal");
  w.mesh(disc, M(x - 6, -0.47, z + 4, r * 0.55, 1, r * 0.42, 0, 20), 0xc9e8f4, "metal");
  // 얼음의 금: 가운데에서 뻗는 짙은 선과 가로 금
  const rnd = w.rand;
  for (let k = 0; k < 16; k++) {
    const a = k * 0.42 + rnd() * 0.3, L = r * (0.35 + rnd() * 0.5), d = rnd() * 6;
    w.box(x + Math.cos(a) * (d + L / 2), -0.46, z + Math.sin(a) * (d + L / 2), L, 0.03, 0.22 + rnd() * 0.25, ICE2, { ry: -a / DEG, col: false, ao: false });
    if (k % 2) w.box(x + Math.cos(a) * (d + L * 0.6), -0.46, z + Math.sin(a) * (d + L * 0.6), L * 0.35, 0.03, 0.18, 0x4f8fb6, { ry: -a / DEG + 55, col: false, ao: false });
  }
  // 눈 더미와 기슭의 얼음 덩이·바위
  for (let k = 0; k < 9; k++) { const a = rnd() * 6.28, d = rnd() * (r - 10); w.sph(x + Math.cos(a) * d, -0.5, z + Math.sin(a) * d, 2.5 + rnd() * 4, SNOW, { sy: 0.16, col: false }); }
  for (let k = 0; k < 22; k++) {
    const a = k * 0.2856 + rnd() * 0.15, d = r - 1 + rnd() * 3, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (Math.cos(a) > 0.55 && Math.abs(Math.sin(a)) < 0.6) continue;         // 동쪽 기슭은 펌프장
    if (k % 3) w.box(px, -1, pz, 2 + rnd() * 3, 1.6 + rnd() * 2.4, 1.6 + rnd() * 2, k % 2 ? ICE : 0xd4eef8, { ry: rnd() * 180, rz: (rnd() - 0.5) * 30, mat: "metal", col: false });
    else w.blob(px, 0.2, pz, 2 + rnd() * 2, 1.2 + rnd(), 2 + rnd() * 2, ROCKC, { mat: "std:rock" });
  }
  // 취수 펌프장(동쪽 기슭): 건물 + 얼음 구멍으로 내려간 취수관 넷 + 배수구의 김
  const px = x + r + 6, pz = z + 4;
  w.box(px, 0, pz, 12, 8, 26, BLK2, { mat: "std:panel", tile: 6 });
  snowCap(w, px, 8, pz, 12.6, 26.6);
  w.box(px - 6.1, 2, pz, 0.2, 3.4, 20, COLD, { mat: "glow", col: false });
  w.box(px + 6.1, 4.6, pz, 0.2, 0.8, 22, RED, { mat: "glow", col: false });
  for (let k = 0; k < 4; k++) {
    const qz = pz - 9 + k * 6, hx = x + r - 12 - (k % 2) * 5;
    w.pipe(px - 6, 4.5, qz, hx, 4.5, qz, 0.8, GUN, { mat: "metal" });
    w.pipe(hx, 4.5, qz, hx, -0.6, qz, 0.8, GUN, { mat: "metal", col: false });
    w.mesh(disc, M(hx, -0.44, qz, 3, 1, 3), 0x16384e, "metal");
    w.box(hx, 0, qz + 1.4, 0.4, 5, 0.4, STEEL, { mat: "paint", col: false });
    K.steam.add(hx, 0, qz, 2.2, 16, 3, 0.12);
    K.blink.add(hx, 5.6, qz, RED, 0.4, k);
  }
  // 냉각 본관 둘: 펌프장 → 순환로를 넘어(높이 11.5 m) → 구덩이 옹벽을 타고 바닥으로
  const ex = C[0] - PIT_R + 2.5;
  for (const [dz, c, y] of [[-3, 0x3d6f8f, 11.5], [3, RUST, 12.6]]) {
    const z0 = pz + dz * 2, z1 = C[1] + dz * 2.4;
    w.pipe(px + 6, 5, z0, px + 12, y, z0, 1.25, c, { mat: "metal" });
    w.pipe(px + 12, y, z0, ex - 4, y, z1, 1.25, c, { mat: "metal" });
    w.pipe(ex - 4, y, z1, ex + 1.5, y, z1, 1.25, c, { mat: "metal" });
    w.pipe(ex + 1.5, y, z1, ex + 1.5, -PIT_D + 1, z1, 1.25, c, { mat: "metal" });
    for (let k = 1; k < 8; k++) { const f = k / 8, tx = px + 12 + (ex - 4 - px - 12) * f, tz = z0 + (z1 - z0) * f; ring(w, tx, y, tz, 1.5, 0.2, k % 2 ? HAZ : STEEL, { yaw: 90, seg: 12, col: false }); }
  }
  // 본관 받침대(도로 양옆에 세운다): 두 다리와 가로보
  for (const tx of [-102, -75, -63]) {
    const f = (tx - px - 12) / (ex - 4 - px - 12), tz = pz + (C[1] - pz) * f;
    for (const sv of [-1, 1]) w.box(tx, 0, tz + sv * 9, 1.4, 13.6, 1.4, STEEL, { mat: "paint" });
    w.box(tx, 9.8, tz, 1.6, 0.8, 19, IRON, { mat: "paint", col: false });
    K.blink.add(tx, 14.2, tz + 9, RED, 0.4, tx & 1);
  }
  w.gap("냉각 본관 밑", -88, 5.4, pz + (C[1] - pz) * 0.38, 0, 14, 9.5, 200);
  // 북쪽 기슭의 방열판 줄: 얼음빛 띠가 흐르는 높은 판
  for (let k = 0; k < 7; k++) {
    const a = (-150 + k * 14) * DEG, fx = x + Math.cos(a) * (r + 7), fz = z + Math.sin(a) * (r + 7);
    if (!ctx.free(fx, fz, 0, 16)) continue;
    w.box(fx, 0, fz, 9, 15, 1.2, IRON, { mat: "std:panel", tile: 5, ry: -a / DEG + 90 });
    w.box(fx, 2, fz, 9.3, 0.5, 1.5, COLD, { mat: "glow", col: false, ry: -a / DEG + 90 });
    w.box(fx, 9, fz, 9.3, 0.5, 1.5, COLD, { mat: "glow", col: false, ry: -a / DEG + 90 });
    snowCap(w, fx, 15, fz, 9.4, 1.8, -a / DEG + 90, 0.6);
  }
  w.pool(x, -0.3, z, r * 1.1, COLD, 0.14);
}
const ROCKC = 0x6a727e;

// ── 발전소: 터빈동 · 냉각탑 둘 · 변압기 마당 · 송전 철탑 줄과 늘어진 전선 ──
export function power(w, K, ctx) {
  const { x, z } = PSTN;
  w.box(x - 2, 0, z + 2, 36, 17, 22, BLK2, { mat: "std:panel", tile: 8 });
  w.box(x - 2, 17, z + 2, 30, 4, 14, IRON, { mat: "std:panel", tile: 6 });
  snowCap(w, x - 2, 21, z + 2, 30.6, 14.6); snowCap(w, x - 2, 17, z + 11.2, 36, 3.4); snowCap(w, x - 2, 17, z - 7.2, 36, 3.4);
  for (let k = 0; k < 6; k++) { w.box(x - 17 + k * 6, 4, z + 13.1, 3, 8, 0.2, k % 2 ? COLD : 0x8fd0f0, { mat: "glow", col: false }); w.box(x - 17 + k * 6, 4, z - 9.1, 3, 8, 0.2, COLD, { mat: "glow", col: false }); }
  w.box(x - 2, 13.4, z + 13.1, 34, 0.6, 0.2, RED, { mat: "glow", col: false });
  // 냉각탑 둘(허리가 잘록한 원통)과 김
  for (const [dx, dz] of [[-29, -8], [-29, 13]]) {
    w.cyl(x + dx, 0, z + dz, 7.6, 12, CONC, { mat: "std:concrete", rt: 5.2 });
    w.cyl(x + dx, 12, z + dz, 5.2, 13, CONC2, { mat: "std:concrete", rt: 6.4 });
    w.cyl(x + dx, 24.6, z + dz, 6.6, 0.8, HAZ, { mat: "paint", col: false });
    K.steam.add(x + dx, 26, z + dz, 6.5, 60, 5, 0.3);
    K.blink.add(x + dx + 6.4, 25.8, z + dz, RED, 0.5, dz > 0 ? 1 : 0);
  }
  // 변압기 마당(동쪽): 방열 핀 달린 변압기와 애자 기둥, 낮은 울타리
  for (let k = 0; k < 4; k++) {
    const tx = x + 22, tz = z - 10 + k * 8;
    w.box(tx, 0, tz, 5, 4.4, 4.6, IRON, { mat: "std:panel", tile: 3 });
    for (const o of [-1.6, 0, 1.6]) w.box(tx + 2.8, 0.6, tz + o, 0.8, 3.2, 0.5, STEEL, { mat: "paint", col: false });
    for (const o of [-1.2, 1.2]) { w.cyl(tx - 0.8, 4.4, tz + o, 0.28, 2.6, ASH, { col: false }); ball(w, tx - 0.8, 7.3, tz + o, 0.42, COLD); }
    snowCap(w, tx, 4.4, tz, 5.2, 4.8, 0, 0.4);
  }
  w.wall(x + 16, z - 16, x + 29, z - 16, 2.2, 0.3, GUN); w.wall(x + 29, z - 16, x + 29, z + 20, 2.2, 0.3, GUN); w.wall(x + 16, z + 20, x + 29, z + 20, 2.2, 0.3, GUN);
  w.pool(x + 22, 0.1, z + 2, 22, COLD, 0.25);
  // 송전 철탑: 격자 기둥 + 가로대 둘 + 애자, 탑 사이에 늘어진 전선 세 가닥
  const pyl = [];
  const pylon = (px, pz, H = 38) => {
    if (!ctx.clearCol(px, pz, 0, H + 4, 10)) return;
    lattice(w, px, 0, pz, 2.4, H, 5, GUN, { t: 0.42, color2: STEEL });
    w.box(px, 0, pz, 6.4, 1, 6.4, CONC2, { mat: "std:concrete", col: false });
    const arms = [];
    for (const [y, hw] of [[H - 9, 9.5], [H - 1.5, 7]]) for (const sd of [-1, 1]) arms.push([sd * hw, y]);
    pyl.push({ px, pz, H, arms });
    K.blink.add(px, H + 2.4, pz, RED, 0.55, pyl.length);
    w.box(px, H, pz, 0.5, 2, 0.5, STEEL, { mat: "paint", col: false });
    ctx.taken.push([px, pz, 7]);
  };
  const wire = (a, b) => {
    // 가로대는 두 탑을 잇는 방향에 수직으로 놓는다
    const dx = b.px - a.px, dz = b.pz - a.pz, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    for (const P of [a, b]) if (!P.done) {
      P.done = true;
      for (const [o, y] of P.arms) { beam(w, [P.px, y, P.pz], [P.px + nx * o, y, P.pz + nz * o], 0.36, STEEL, { col: false }); ball(w, P.px + nx * o, y - 1, P.pz + nz * o, 0.5, COLD); }
    }
    for (let i = 0; i < 4; i += i === 1 ? 2 : 1) {
      const [oa, ya] = a.arms[i], [ob, yb] = b.arms[Math.min(i, b.arms.length - 1)];
      let p = [a.px + nx * oa, ya - 1, a.pz + nz * oa];
      for (let s = 1; s <= 6; s++) { const f = s / 6, q = [a.px + nx * oa + (b.px + nx * ob - a.px - nx * oa) * f, ya - 1 + (yb - ya) * f - Math.sin(f * Math.PI) * L * 0.06, a.pz + nz * oa + (b.pz + nz * ob - a.pz - nz * oa) * f]; beam(w, p, q, 0.13, 0x14161a, { col: false }); p = q; }
    }
  };
  for (const [px, pz] of [[-132, 26], [-108, -34], [-98, -100], [24, -148]]) pylon(px, pz);
  if (pyl.length) for (const o of [-3, 3]) beam(w, [x + 21, 7.3, z + 2 + o], [pyl[0].px, pyl[0].H - 10, pyl[0].pz + o], 0.13, 0x14161a, { col: false });
  const west = pyl.length;
  for (const [px, pz] of [[213, 112], [213, 22], [213, -98]]) pylon(px, pz, 42);
  for (let i = 0; i + 1 < pyl.length; i++) if (i + 1 !== west) wire(pyl[i], pyl[i + 1]);
}
