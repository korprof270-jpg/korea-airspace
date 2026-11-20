// 제국 궤도 발사기지 뭍 구역: 세 발사대(발사 받침·화염 도랑·정비탑·움직이는 정비 팔·로켓/수송 궤도선), 격납고, 구형 연료 탱크 단지와 배관 다리, 레이더 밭, 함대 사령부 모노리스
import {
  THREE, M, beam, prop, ring, octa, ball, V3, DEG, hash, local, paint, strip, slab, circle, truss, mast, monolith,
  BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, HAZ, CONC2, CONC3, ASPH2, WHT, HULL2,
  PADS, PAD_R, TOWER_OFF, TRENCH, HANGARS, HG, TANKS, TANK_R, RADARS, HQ,
} from "./spaceport-kit.js";
import { dish } from "./moon-kit.js";

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const TH = 92, TW = 4.5, MY = 9;      // 정비탑 높이 · 반변 · 발사 받침 윗면 높이

// ═══════════ 발사대 ═══════════
export function pads(w, K) {
  PADS.forEach((p, i) => pad(w, K, p, i));
}
function pad(w, K, p, idx) {
  const ry = -p.ta, L = local(p.x, p.z, ry), B = (u, y, v, su, sy, sv, c, o = {}) => { const [x, z] = L(u, v); return w.box(x, y, z, su, sy, sv, c, { ...o, ry: ry + (o.ry || 0) }); };
  const C = (u, y, v, r, h, c, o) => { const [x, z] = L(u, v); w.cyl(x, y, z, r, h, c, o); };
  // 바닥 표식: 그을린 원판 둘레의 경고 고리, 번호
  ring(w, p.x, 0.12, p.z, PAD_R, 0.5, HAZ, { pitch: 90, col: false, seg: 48 });
  ring(w, p.x, 0.12, p.z, PAD_R - 3, 0.18, RED, { pitch: 90, col: false, mat: "glow", seg: 48 });
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, [x, z] = [p.x + Math.cos(a) * (PAD_R + 2.5), p.z + Math.sin(a) * (PAD_R + 2.5)]; K.blink.add(x, 0.6, z, RED, 0.35, k); w.box(x, 0, z, 0.5, 0.5, 0.5, IRON, { col: false }); }
  // 발사 받침: 도랑 위에 걸친 두꺼운 판 + 네 귀 받침 + 붉은 테
  B(0, MY - 2.6, 0, 24, 2.6, 20, BLK2, { mat: "std:panel", tile: 5 });
  B(0, MY, 0, 24.6, 0.3, 20.6, IRON, { col: false });
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    B(su * 10.4, 0, sv * 8.4, 3.2, MY - 2.6, 3.2, IRON, { mat: "std:panel", tile: 4 });
    B(su * 10.4, 0, sv * 8.4, 4.4, 1.2, 4.4, CONC3, { col: false });
    B(su * 6, MY, sv * 6, 1.6, 2.2, 1.6, STEEL, { col: false });
    B(su * 12.05, 1.5, sv * 8.4, 0.15, MY - 5.5, 0.6, RED, { mat: "glow", col: false });
  }
  for (const sv of [-1, 1]) { B(0, MY - 1.6, sv * 10.05, 18, 0.5, 0.15, ORG, { mat: "glow", col: false }); B(0, MY - 3.2, sv * 8.4, 17.6, 0.6, 1, IRON, { col: false }); }
  for (const su of [-1, 1]) B(su * 5.5, MY - 2.75, 0, 0.3, 0.15, 18, ORG, { mat: "glow", col: false });
  ring(w, p.x, MY + 0.35, p.z, 6.2, 0.3, RED, { pitch: 90, col: false, mat: "glow", seg: 32 });
  w.pool(p.x, -TRENCH.d + 0.1, p.z, 9, ORG, 0.5);
  w.gap(`${p.name} 받침 밑 화염 도랑`, p.x, 2, p.z, ry, 16, 7, 500);
  // 도랑 가장자리 턱과 배관
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    B(su * (TRENCH.hw + 0.8), 0, sv * 27, 0.8, 0.9, 30, CONC3, { col: false });
    const [x0, z0] = L(su * (TRENCH.hw + 2.2), sv * 12), [x1, z1] = L(su * (TRENCH.hw + 2.2), sv * 40);
    w.pipe(x0, 0.7, z0, x1, 0.7, z1, 0.45, su > 0 ? WHT : RUST, { col: false });
  }
  // 정비탑: 격자탑 + 승강 축 + 층 발판 + 망치 머리 크레인 + 피뢰침
  const [tx, tz] = L(TOWER_OFF, 0);
  mast(w, tx, 0, tz, TW, TH, 12, IRON, { color2: STEEL, t: 0.7 });
  w.box(tx, 0, tz, 3.2, TH + 4, 3.2, BLK, { mat: "std:panel", tile: 5, col: false });
  w.box(tx, 0, tz, TW * 2 + 3, 2.4, TW * 2 + 3, BLK2, { mat: "std:panel", tile: 5, col: false });
  for (let k = 4; k <= 12; k += 2) { const y = k * TH / 12; w.box(tx, y - 0.25, tz, TW * 2 + 2.4, 0.5, TW * 2 + 2.4, k % 4 ? GUN : DRED, { col: false }); }
  for (const s of [-1, 1]) w.box(tx + s * (TW + 0.2), 4, tz + s * (TW + 0.2), 0.35, TH - 6, 0.35, RED, { mat: "glow", col: false });
  const [hx, hz] = L(TOWER_OFF - 9, 0);
  B(TOWER_OFF - 7, TH + 1, 0, 30, 2.4, 3, IRON, { mat: "paint" });
  B(TOWER_OFF + 7, TH + 3.4, 0, 6, 3, 4, BLK2, { col: false });
  w.pipe(hx, TH + 1, hz, hx, TH - 14, hz, 0.12, GUN, { col: false });
  w.box(hx, TH - 16, hz, 1.6, 2, 1.6, HAZ, { col: false });
  w.pipe(tx, TH + 3, tz, tx, TH + 30, tz, 0.3, GUN, { col: false });
  K.blink.add(tx, TH + 31, tz, RED, 0.7, idx); K.blink.add(tx, TH + 16, tz, RED, 0.45, idx + 1);
  { const [gx, gz] = L(10.5, 0); w.gap(`${p.name} 정비 팔 밑`, gx, 22, gz, ry, 10, 22, 350); }
  // 움직이는 정비 팔 셋: 탑에서 로켓으로 뻗었다가 옆으로 젖혀진다
  const AL = 12.5, arms = [38, 56, 74].map((y, k) => {
    const m = prop(w, [
      [BOXG, M(AL / 2, 0, 0, AL, 1.2, 1.8), IRON], [BOXG, M(AL / 2, 1.3, 0.8, AL, 0.18, 0.18), STEEL], [BOXG, M(AL / 2, 1.3, -0.8, AL, 0.18, 0.18), STEEL],
      [BOXG, M(AL - 0.6, -0.3, 0, 1.6, 2.2, 2.6), DRED], [BOXG, M(0.6, 0, 0, 1.6, 2, 2.6), BLK2], [BOXG, M(AL * 0.5, -0.9, 0, AL * 0.7, 0.4, 0.5), k % 2 ? WHT : RUST],
    ], "paint");
    const [ax, az] = L(TOWER_OFF - TW - 0.4, 0);
    m.position.set(ax, y, az);
    w.rider(m, [[AL / 2, 0, 0, AL / 2, 0.9, 1.1]]);
    return { m, ph: k * 2.1 + idx * 1.3, stay: p.kind === "empty" };
  });
  const a0 = Math.PI - p.ta * DEG;
  w.updaters.push((dt, t) => { for (const a of arms) { const s = Math.sin(t * 0.16 + a.ph), k = a.stay ? 1 : Math.max(0, Math.min(1, s * 1.6 + 0.3)); a.m.rotation.y = a0 + k * k * (3 - 2 * k) * 1.25; } });
  // 발사체
  if (p.kind === "rocket") rocket(w, K, p, L, C, B);
  else if (p.kind === "shuttle") shuttleStack(w, K, p, L, C, B);
  else erector(w, K, p, L, C, B);
}

// 제국 중량 로켓: 검은 몸통 + 흰 서리 띠 + 붉은 띠 + 측면 부스터 둘 (높이 약 76 m)
function rocket(w, K, p, L, C, B) {
  const y0 = MY + 0.3;
  for (const a of [45, 135, 225, 315]) { const [x, z] = [p.x + Math.cos(a * DEG) * 2.2, p.z + Math.sin(a * DEG) * 2.2]; w.cyl(x, y0 - 0.2, z, 1.5, 2.4, GUN, { rt: 0.8, col: false }); }
  C(0, y0 + 2, 0, 4.2, 34, BLK, { mat: "std:panel", tile: 6 });
  C(0, y0 + 13, 0, 4.26, 7, WHT, { col: false });
  C(0, y0 + 36, 0, 4.3, 1.4, RED, { mat: "glow", col: false });
  C(0, y0 + 37.4, 0, 3.7, 19, BLK2, { mat: "std:panel", tile: 6, rt: 3.6 });
  C(0, y0 + 47, 0, 3.72, 3, WHT, { col: false });
  C(0, y0 + 56.4, 0, 3.75, 0.9, RED, { mat: "glow", col: false });
  C(0, y0 + 57.3, 0, 3.6, 5, IRON, { col: false });
  w.cone(p.x, y0 + 62.3, p.z, 3.6, 12, BLK, { mat: "paint", grad: [0.8, 1.1] });
  w.pipe(p.x, y0 + 74, p.z, p.x, y0 + 79, p.z, 0.15, RED, { mat: "glow", col: false });
  for (const sv of [-1, 1]) {
    C(0, y0 + 2, sv * 6, 1.9, 26, IRON, { mat: "std:panel", tile: 5 });
    const [x, z] = L(0, sv * 6);
    w.cone(x, y0 + 28, z, 1.9, 6, DRED, { mat: "paint", col: false, grad: [0.8, 1.1] });
    w.cyl(x, y0 - 0.4, z, 1.7, 2.6, GUN, { rt: 1, col: false });
    C(0, y0 + 20, sv * 6, 1.95, 1, RED, { mat: "glow", col: false });
    for (const yy of [8, 22]) B(0, y0 + yy, sv * 4.6, 1, 0.6, 1.6, STEEL, { col: false });
  }
  for (const a of [0, 90, 180, 270]) { const [x, z] = [p.x + Math.cos((a + 45) * DEG) * 4.3, p.z + Math.sin((a + 45) * DEG) * 4.3]; w.box(x, y0 + 3, z, 0.25, 30, 0.25, RED, { mat: "glow", col: false, ry: -(a + 45) }); }
  K.vap.add(p.x, y0 + 14, p.z, 2.2, 10, 3, [0.5, 0.2], 0.12);
}

// 수송 궤도선 묶음: 굵은 연료통 + 양옆 부스터 + 탑 반대쪽에 등을 댄 궤도선
function shuttleStack(w, K, p, L, C, B) {
  const y0 = MY + 0.3;
  C(0, y0 + 1, 0, 4.2, 44, RUST, { mat: "std:panel", tile: 6 });
  C(0, y0 + 18, 0, 4.26, 6, WHT, { col: false });
  C(0, y0 + 40, 0, 4.3, 1.2, RED, { mat: "glow", col: false });
  w.cone(p.x, y0 + 45, p.z, 4.2, 10, RUST, { mat: "paint", grad: [0.8, 1.1] });
  for (const sv of [-1, 1]) {
    C(0, y0, sv * 6.3, 2, 38, BLK, { mat: "std:panel", tile: 5 });
    const [x, z] = L(0, sv * 6.3);
    w.cone(x, y0 + 38, z, 2, 6, DRED, { mat: "paint", col: false, grad: [0.8, 1.1] });
    C(0, y0 + 30, sv * 6.3, 2.05, 1, RED, { mat: "glow", col: false });
    w.cyl(x, y0 - 2.2, z, 2.3, 2.6, GUN, { rt: 1.4, col: false });
  }
  // 궤도선: 세로로 선 검은 동체, 삼각 날개, 꼬리
  B(-6.6, y0 + 4, 0, 4.6, 30, 5.4, BLK2, { mat: "std:panel", tile: 5 });
  const [ox, oz] = L(-6.6, 0);
  w.cone(ox, y0 + 34, oz, 2.9, 7, BLK2, { mat: "paint", grad: [0.85, 1.1] });
  B(-8.2, y0 + 4, 0, 0.7, 15, 21, BLK, { mat: "paint" });
  B(-8.2, y0 + 19, 0, 0.7, 7, 12, BLK, { mat: "paint", col: false });
  B(-10.4, y0 + 3.4, 0, 5.4, 9, 0.7, IRON, { mat: "paint", col: false });
  B(-9.05, y0 + 28, 0, 0.2, 4, 3.4, RED, { mat: "glow", col: false });
  for (const sv of [-1, 1]) { B(-8.6, y0 + 6, sv * 8, 0.2, 9, 0.5, RED, { mat: "glow", col: false }); const [x, z] = L(-7, sv * 1.6); w.cyl(x, y0 + 1.4, z, 1.1, 2.8, GUN, { rt: 0.7, col: false }); }
  for (const yy of [10, 30]) B(-3.6, y0 + yy, 0, 2.4, 0.8, 1.4, STEEL, { col: false });
  // 발사 직전: 받침 옆과 도랑 끝에서 흰 증기가 솟는다
  for (const sv of [-1, 1]) { const [x, z] = L(0, sv * 13); K.vap.add(x, 1, z, 4.5, 26, 5, [0.35 * sv, 0.2], 0.1); const [x2, z2] = L(0, sv * 36); K.vap.add(x2, -1, z2, 5, 30, 5, [0.3, 0.3 * sv], 0.07); }
  K.vap.add(p.x, y0 + 30, p.z, 2, 9, 3, [0.6, 0.1], 0.14);
}

// 빈 발사대: 눕혀 둔 기립 장치(트러스)와 붙잡는 집게
function erector(w, K, p, L, C, B) {
  const P3 = (u, y, v) => { const [x, z] = L(u, v); return [x, y, z]; };
  for (const sv of [-1.6, 1.6]) truss(w, P3(-13, 3, sv), P3(-52, 8, sv), 2.6, 0.5, STEEL, { color2: GUN, col: sv > 0 });
  for (let u = -16; u > -52; u -= 9) beam(w, P3(u, 3 + (-u - 13) * 0.128 + 2.6, -1.6), P3(u, 3 + (-u - 13) * 0.128 + 2.6, 1.6), 0.4, GUN, { col: false });
  B(-34, 0, 0, 6, 5, 7, BLK2, { mat: "std:panel", tile: 4 });
  B(-52, 0, 0, 4, 7.6, 6, IRON, { mat: "paint" });
  for (const sv of [-1, 1]) { B(0, MY + 0.3, sv * 5.4, 3, 6, 1.2, DRED, { mat: "paint" }); B(0, MY + 6.3, sv * 4.4, 3.2, 1, 3, IRON, { col: false }); }
  ring(w, p.x, MY + 0.5, p.z, 4.4, 0.35, HAZ, { pitch: 90, col: false, seg: 28 });
  const [x, z] = L(0, 36); K.vap.add(x, -1, z, 3.5, 18, 4, [0.3, 0.2], 0.08);
}

// ═══════════ 격납고: 남북으로 뚫려 있어 그대로 꿰어 지난다 ═══════════
export function hangars(w, K) {
  HANGARS.forEach(([x, z], i) => {
    const { w: W, d: D, h: H } = HG, hw = W / 2, hd = D / 2;
    for (const s of [-1, 1]) {
      w.box(x + s * (hw - 0.8), 0, z, 1.6, H - 3, D, BLK2, { mat: "std:panel", tile: 6 });
      w.box(x + s * (hw - 3.4), H - 3.6, z, 7.4, 1.4, D, BLK, { mat: "std:panel", tile: 6, rz: -s * 24 });
      w.box(x + s * (hw + 0.1), 5, z, 0.2, 0.6, D - 4, RED, { mat: "glow", col: false });
      for (const e of [-1, 1]) {
        w.box(x + s * (hw - 2.4), 0, z + e * (hd - 1), 4.8, H - 2, 2, IRON, { mat: "std:panel", tile: 5 });
        w.box(x + s * (hw - 4.95), 1, z + e * (hd + 0.05), 0.3, H - 5, 0.3, RED, { mat: "glow", col: false });
      }
      // 벽 쪽 정비 선반과 상자
      for (let k = -1; k <= 1; k++) w.box(x + s * (hw - 3.2), 0, z + k * 9, 2.6, 2.2 + hash(i * 7 + k, s) * 1.6, 5, k ? GUN : DRED, { mat: "std:corrug", tile: 2, col: false });
    }
    w.box(x, H - 2, z, W - 9, 1.4, D, BLK, { mat: "std:panel", tile: 6 });
    w.box(x, H - 0.6, z, 8, 1.6, D - 4, IRON, { mat: "paint", col: false });
    for (const e of [-1, 1]) {
      w.box(x, H - 4.4, z + e * (hd - 1), W - 9, 2.6, 2, IRON, { mat: "std:panel", tile: 5 });
      w.box(x, H - 4.2, z + e * (hd + 0.05), W - 12, 0.5, 0.2, RED, { mat: "glow", col: false });
      K.blink.add(x - hw + 1, H + 0.6, z + e * hd, RED, 0.4, i + (e > 0)); K.blink.add(x + hw - 1, H + 0.6, z + e * hd, RED, 0.4, i + (e > 0) + 1);
    }
    for (let k = -1; k <= 1; k++) { w.box(x, H - 2.3, z + k * 10, W - 12, 0.25, 0.8, 0xffe6c0, { mat: "glow", col: false }); beam(w, [x - hw + 5, H - 2.6, z + k * 10 + 4], [x + hw - 5, H - 2.6, z + k * 10 + 4], 0.5, STEEL, { col: false }); }
    paint(w, x, z, 0.5, D + 16, HAZ, 0.1);
    for (const s of [-1, 1]) paint(w, x + s * 9, z, 0.3, D + 16, WHT, 0.1);
    w.gap(`${i + 1}번 격납고 관통`, x, 5.5, z, 0, W - 12, 10, 450);
  });
}

// ═══════════ 구형 연료 탱크 단지 ═══════════
export function tankFarm(w, K) {
  const R = TANK_R, cy = R + 3.5;
  TANKS.forEach(([x, z], i) => {
    w.sph(x, cy, z, R, i % 3 === 1 ? 0x3a3d44 : WHT, { mat: "paint" });
    ring(w, x, cy, z, R + 0.25, 0.4, i % 3 === 1 ? RED : DRED, { pitch: 90, col: false, seg: 32, mat: i % 3 === 1 ? "glow" : "paint" });
    ring(w, x, cy + R * 0.62, z, R * 0.8, 0.14, GUN, { pitch: 90, col: false, seg: 24 });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a); w.pipe(x + c * R * 0.82, cy - R * 0.5, z + s * R * 0.82, x + c * R * 0.86, 0, z + s * R * 0.86, 0.38, IRON, { col: k % 2 === 0 }); if (k % 2) beam(w, [x + c * R * 0.86, 0.4, z + s * R * 0.86], [x + Math.cos(a + 1.05) * R * 0.84, cy - R * 0.55, z + Math.sin(a + 1.05) * R * 0.84], 0.2, GUN, { col: false }); }
    w.cyl(x, cy + R - 0.2, z, 1.3, 1.6, GUN, { col: false }); K.blink.add(x, cy + R + 2, z, RED, 0.4, i);
    w.pipe(x + R * 0.7, cy + R * 0.7, z, x + R + 1.2, 0, z, 0.12, HAZ, { col: false });
    w.cyl(x, 0, z, R + 3, 0.5, CONC3, { col: false, mat: "std:concrete" });
  });
  // 배관 다리: 두 줄 사이를 동서로 지나 서쪽 펌프동까지 (밑으로 지날 수 있다)
  const zr = (TANKS[0][1] + TANKS[3][1]) / 2, x0 = 64, x1 = 162;
  for (let x = x0; x <= x1; x += 14) { for (const s of [-1, 1]) w.box(x, 0, zr + s * 3.2, 0.6, 9, 0.6, IRON, { mat: "paint" }); w.box(x, 8.4, zr, 0.6, 0.6, 7.4, IRON, { col: false }); w.box(x, 6, zr, 0.5, 0.5, 7, STEEL, { col: false }); }
  [[-2.4, 9.3, 0.55, WHT], [-0.8, 9.2, 0.42, RUST], [0.8, 9.3, 0.5, 0x3a3d44], [2.4, 9.2, 0.4, HAZ], [-1.4, 6.7, 0.36, WHT], [1.4, 6.7, 0.36, DRED]].forEach(([dz, y, r, c]) => w.pipe(x0, y, zr + dz, x1, y, zr + dz, r, c, { col: false }));
  w.col.addBox(V3((x0 + x1) / 2, 8, zr), V3((x1 - x0) / 2, 2.2, 3.6));
  TANKS.forEach(([x, z]) => { const s = Math.sign(zr - z); w.pipe(x, 4, z + s * (TANK_R - 2), x, 9.2, zr - s * 2.4, 0.4, WHT, { col: false }); });
  w.gap("연료 배관 다리 밑", 127, 3.2, zr, 0, 12, 5, 300);
  // 펌프동과 굴뚝
  w.box(x0 - 3, 0, zr, 10, 7, 12, BLK2, { mat: "std:panel", tile: 5 });
  w.box(x0 - 3, 7, zr, 10.6, 0.6, 12.6, IRON, { col: false });
  w.box(x0 - 8.1, 2.4, zr, 0.2, 0.8, 9, RED, { mat: "glow", col: false });
  w.cyl(x0 - 5, 7, zr - 3, 1, 9, IRON, { rt: 0.7 }); w.cyl(x0 - 5, 7, zr + 3, 1, 9, IRON, { rt: 0.7 });
  K.vap.add(x0 - 5, 16.5, zr - 3, 1.6, 12, 3, [0.5, 0.25], 0.11); K.vap.add(x0 - 5, 16.5, zr + 3, 1.6, 12, 3, [0.5, 0.25], 0.13);
  // 둘레 방유제(낮은 턱)
  const bx0 = 71, bx1 = 158, bz0 = -144, bz1 = -84;
  for (const [ax, az, bx, bz] of [[bx0, bz0, bx1, bz0], [bx1, bz0, bx1, bz1], [bx1, bz1, bx0, bz1], [bx0, bz1, bx0, zr + 8], [bx0, zr - 8, bx0, bz0]]) w.wall(ax, az, bx, bz, 1.1, 0.7, CONC3, { col: false, y: 0 });
}

// ═══════════ 레이더 밭 ═══════════
export function radars(w, K) {
  RADARS.forEach(([x, z], i) => {
    w.cyl(x, 0, z, 7, 0.6, CONC3, { col: false, mat: "std:concrete" });
    dish(w, x, 0.5, z, 11 + (i % 2) * 2, [200, 150, 230][i], [38, 52, 30][i], { ph: 10 });
    ring(w, x, 0.7, z, 6.4, 0.16, RED, { pitch: 90, col: false, mat: "glow", seg: 28 });
    K.blink.add(x, 13.5, z, RED, 0.4, i);
  });
  // 회전 탐색 레이더: 격자 기둥 위에서 도는 긴 판
  const [rx, rz] = [58, -196];
  mast(w, rx, 0, rz, 3, 24, 5, IRON, { color2: STEEL, t: 0.5, taper: 0.6 });
  w.box(rx, 24, rz, 4.4, 1, 4.4, BLK2, { col: false });
  const bar = prop(w, [[BOXG, M(0, 2.4, 0, 20, 4.2, 0.6), BLK2], [BOXG, M(0, 2.4, 0.4, 19, 3.4, 0.2), GUN], [BOXG, M(0, 0.4, 0, 1.4, 1.4, 1.4), IRON], [BOXG, M(0, 5, -0.6, 8, 0.5, 0.5), STEEL]], "paint");
  const bg = prop(w, [[BOXG, M(0, 4.7, 0.36, 19, 0.3, 0.2), RED], [BOXG, M(0, 0.4, 0.36, 19, 0.3, 0.2), RED]], "glow", false);
  bar.add(bg); bar.position.set(rx, 25, rz);
  w.updaters.push((dt, t) => { bar.rotation.y = t * 0.9; });
  // 위상 배열 판: 비스듬히 누운 큰 검은 판에 붉은 격자
  const [ax, az] = [16, -210];
  w.box(ax, 0, az, 26, 3, 5, BLK2, { mat: "std:panel", tile: 5 });
  w.box(ax, 2.2, az + 1.2, 24, 16, 1.4, BLK, { mat: "std:panel", tile: 4, rx: 24 });
  for (let k = 0; k < 5; k++) w.box(ax - 9.6 + k * 4.8, 3.4, az + 2.2, 0.25, 13.5, 0.2, RED, { mat: "glow", col: false, rx: 24 });
  for (let k = 0; k < 3; k++) w.box(ax, 5 + k * 4.2, az + 3.2 - k * 1.9, 22, 0.22, 0.2, RED2, { mat: "glow", col: false, rx: 24 });
}

// ═══════════ 함대 사령부: 검은 모노리스 셋 ═══════════
export function command(w, K) {
  for (const [x, z, s, h] of HQ) monolith(w, K, x, z, s, s, h, { eye: true, tier: h > 50 });
  const [x, z] = HQ[0];
  w.box(x - 12, 0, z + 14, 9, 5, 12, BLK2, { mat: "std:panel", tile: 5 });
  w.box(x - 12, 5, z + 14, 9.6, 0.5, 12.6, IRON, { col: false });
  w.box(x - 16.6, 2, z + 14, 0.2, 0.7, 10, RED, { mat: "glow", col: false });
}
