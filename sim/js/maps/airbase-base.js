// 비행기지 구역 짓기: 활주로(표지·등화·진입등), 유도로, 계류장, 도로, 아치형 격납고 넷, 관제탑, 작전본부(브리핑실), 소방대
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, octa, ball, V3, DEG, digit, paint, Parts,
  RWY, TWY, CONN, JETS, TRANS, APRON, HANGARS, HF, HD, HW, HWALL, HRISE, OPEN, DOOR, BDOOR, TOWER, OPS, ROAD, FENCE, GATE_X,
  CONC, CONC2, ASPH, ASPH2, WH, YEL, ORG, RED, GREY, GREY2, DARK, INK, STEEL, NAVY, CREAM, GLASS, GRN, BLUE, AMB, SAND, SILVER, OLIVE,
} from "./airbase-kit.js";

const RT = 0.1, TT = 0.08, AT = 0.06;   // 활주로·유도로·계류장 윗면 높이

// ── 활주로: 포장·갓길·피아노 건반·번호·중심선·접지대·조준점·가장자리 등화·진입각 지시등 ──
export function runway(w, K) {
  const { z, x0, x1, w: W } = RWY, L = x1 - x0, cx = (x0 + x1) / 2;
  w.box(cx, 0, z, L, RT, W, ASPH, { mat: "std:asphalt", tile: 8, col: false, ao: false });
  for (const s of [-1, 1]) w.box(cx, 0, z + s * (W / 2 + 2.5), L + 24, RT - 0.02, 5, 0x5a5c60, { mat: "std:asphalt", tile: 8, col: false, ao: false });
  // 활주로 끝 과주대: 노란 갈매기 무늬
  for (const [e, d] of [[x0, -1], [x1, 1]]) {
    w.box(e + d * 6, 0, z, 12, RT - 0.01, W, ASPH2, { mat: "std:asphalt", tile: 8, col: false, ao: false });
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) paint(w, e + d * (2.5 + k * 3.6), z + s * 6.5, 1.0, 14, YEL, RT, s * d * 40);
  }
  // 가장자리 선
  for (const s of [-1, 1]) paint(w, cx, z + s * (W / 2 - 0.9), L, 0.9, WH, RT);
  for (const [e, d] of [[x0, 1], [x1, -1]]) {
    // 피아노 건반 (문턱 표지)
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) paint(w, e + d * 16, z + s * (2.4 + k * 2.3), 24, 1.6, WH, RT);
    paint(w, e + d * 1.5, z, 1.4, W - 2, WH, RT);
    // 번호: 서쪽 끝 09, 동쪽 끝 27 (착륙하며 읽는 방향)
    const [a, b] = d > 0 ? [0, 9] : [2, 7], fx = d, fz = 0, nx = e + d * 44;
    digit(w, nx, z - d * 4.2, a, fx, fz, 5, 17, 1.2, RT);
    digit(w, nx, z + d * 4.2, b, fx, fz, 5, 17, 1.2, RT);
    // 접지대 표지와 조준점
    for (const [off, n] of [[68, 3], [92, 2], [150, 1]]) for (const s of [-1, 1]) for (let k = 0; k < n; k++) paint(w, e + d * off, z + s * (5.5 + k * 1.9), 16, 1.1, WH, RT);
    for (const s of [-1, 1]) paint(w, e + d * 118, z + s * 6.5, 30, 4.2, WH, RT);
  }
  // 중심선 점선
  for (let x = x0 + 62; x < x1 - 62; x += 34) paint(w, x + 10, z, 20, 0.9, WH, RT);
  // 가장자리 등화(흰색) + 문턱등(녹색) + 끝등(빨강)
  for (let x = x0; x <= x1 + 0.1; x += 29) for (const s of [-1, 1]) {
    const lz = z + s * (W / 2 + 1.2);
    w.box(x, 0, lz, 0.25, 0.5, 0.25, DARK, { col: false });
    w.box(x, 0.5, lz, 0.45, 0.22, 0.45, 0xfff6d8, { mat: "glow", col: false });
  }
  for (const [e, d] of [[x0, -1], [x1, 1]]) for (let k = -6; k <= 6; k++) {
    w.box(e + d * 0.8, 0.1, z + k * 2.5, 0.5, 0.25, 0.5, GRN, { mat: "glow", col: false });
    w.box(e + d * 12.6, 0.1, z + k * 2.5, 0.5, 0.25, 0.5, RED, { mat: "glow", col: false });
  }
  // 진입각 지시등(PAPI): 서쪽은 북쪽 가, 동쪽은 남쪽 가 — 흰 둘·빨강 둘
  for (const [px, s] of [[x0 + 70, -1], [x1 - 70, 1]]) for (let k = 0; k < 4; k++) {
    const pz = z + s * (W / 2 + 7 + k * 3.2);
    w.box(px, 0, pz, 1.6, 0.9, 1.4, GREY2, { mat: "paint" });
    w.box(px - s * 0, 0.45, pz, 1.7, 0.36, 1.0, k < 2 ? 0xfff6e0 : RED, { mat: "glow", col: false });
  }
}

// ── 계기 착륙 장치: 동쪽 끝 밖의 방위각 안테나 줄, 서쪽 접지대 옆 활공각 안테나 ──
export function ils(w, K) {
  const x = RWY.x1 + 45, z = RWY.z;
  w.box(x, 0, z, 2, 0.3, 30, CONC2, { col: false });
  for (let k = -7; k <= 7; k++) { const zz = z + k * 2; w.box(x, 0.3, zz, 0.16, 1.8, 0.16, WH, { col: false }); w.box(x, 2.1, zz, 0.9, 0.16, 0.16, k % 2 ? ORG : WH, { col: false }); }
  K.blink.add(x, 2.5, z - 15, RED, 0.25, 0); K.blink.add(x, 2.5, z + 15, RED, 0.25, 1);
  const gx = RWY.x0 + 60, gz = RWY.z + RWY.w / 2 + 16;
  w.box(gx + 4, 0, gz, 3, 2.4, 2.4, CREAM, { mat: "std:concrete" });
  w.box(gx, 0, gz, 0.6, 14, 0.6, ORG, { mat: "paint" });
  for (const y of [5, 9, 12.5]) w.box(gx, y, gz - 0.5, 1.4, 1.2, 0.3, WH, { mat: "paint", col: false });
  K.blink.add(gx, 14.3, gz, RED, 0.3, 1);
}

// ── 진입등: 서쪽 활주로 밖으로 뻗은 등주 줄 + 가로대, 연속 섬광등(토끼)이 문턱으로 달려온다 ──
export function approach(w, K) {
  const z = RWY.z, pts = [];
  const bar = (x, half, n, color = 0xfff2cc) => {
    const gy = w.h(x, z), H = 1.2 + Math.max(0, -gy) + Math.min(9, (RWY.x0 - x) * 0.035);
    w.box(x, gy, z, 0.5, H, 0.5, 0xd8d2c4, { mat: "paint" });
    w.box(x, gy + H, z, 0.5, 0.35, half * 2 + 0.6, 0xd8d2c4, { col: false });
    for (let k = 0; k < n; k++) { const zz = z - half + (k * 2 * half) / Math.max(1, n - 1); w.box(x, gy + H + 0.35, zz, 0.5, 0.35, 0.5, color, { mat: "glow", col: false }); }
    pts.push([x, gy + H + 0.9, z]);
  };
  for (let x = RWY.x0 - 34; x > RWY.x0 - 220; x -= 22) bar(x, 2.2, 5);
  bar(RWY.x0 - 122, 15, 13);   // 가로대
  for (let x = RWY.x1 + 34; x < RWY.x1 + 110; x += 22) bar(x, 2.2, 5);
  // 섬광등: 서쪽 끝에서 문턱까지 0.5초에 달린다
  const west = pts.filter((p) => p[0] < RWY.x0 && Math.abs(p[0] - (RWY.x0 - 122)) > 1).sort((a, b) => a[0] - b[0]);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3.2), fog: false }));
  w.scene.add(flash); w.disposables.push(flash.geometry, flash.material);
  w.updaters.push((dt, t) => { const k = (t * 2) % 1.6; if (k >= 1) { flash.visible = false; return; } flash.visible = true; const p = west[Math.min(west.length - 1, Math.floor(k * west.length))]; flash.position.set(p[0], p[1], p[2]); });
}

// ── 유도로·연결로·계류장·도로 ──
export function pavement(w, K, S) {
  const { z, w: W, x0, x1 } = TWY;
  w.box((x0 + x1) / 2, 0, z, x1 - x0 + W, TT, W, ASPH2, { mat: "std:asphalt", tile: 8, col: false, ao: false });
  paint(w, (x0 + x1) / 2, z, x1 - x0, 0.4, YEL, TT);
  for (const s of [-1, 1]) paint(w, (x0 + x1) / 2, z + s * (W / 2 - 0.5), x1 - x0 + W - 1, 0.25, YEL, TT);
  // 유도로 가장자리 청색등
  for (let x = x0 - 8; x <= x1 + 8; x += 16) for (const s of [-1, 1]) {
    if (s > 0 && CONN.some((c) => Math.abs(c - x) < 10)) continue;
    w.box(x, 0, z + s * (W / 2 + 0.8), 0.3, 0.42, 0.3, BLUE, { mat: "glow", col: false });
  }
  // 연결 유도로: 정지선(실선 둘·점선 둘)과 활주로 경고 표지판
  const z0 = z + W / 2, z1 = RWY.z - RWY.w / 2, L = z1 - z0;
  CONN.forEach((cx, i) => {
    w.box(cx, 0, (z0 + z1) / 2, W, TT, L, ASPH2, { mat: "std:asphalt", tile: 8, col: false, ao: false });
    paint(w, cx, (z0 + z1) / 2, 0.4, L, YEL, TT);
    const hz = z1 - 7;
    for (const dz of [0, 0.7]) paint(w, cx, hz - dz, W - 2, 0.3, YEL, TT);
    for (const dz of [1.8, 2.5]) for (let k = -4; k <= 4; k++) paint(w, cx + k * 2, hz - dz, 1.1, 0.3, YEL, TT);
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) w.box(cx + s * (W / 2 + 0.8), 0, z0 + 6 + k * 10, 0.3, 0.42, 0.3, BLUE, { mat: "glow", col: false });
    // 표지판: 활주로 진입 경고(빨강) + 유도로 이름(노랑)
    const sx = cx + (cx > 0 ? -1 : 1) * (W / 2 + 4);
    w.box(sx, 0, hz - 2, 0.3, 0.8, 0.3, DARK, { col: false });
    w.box(sx, 0.8, hz - 2, 3.2, 1.1, 0.5, DARK, { mat: "paint", col: false });
    S.add("hold", sx, 1.35, hz - 2 + 0.26, 3.0, { height: 1.0 });
    S.add("hold", sx, 1.35, hz - 2 - 0.26, 3.0, { height: 1.0, ry: 180 });
    const tx = cx + (cx > 0 ? 1 : -1) * (W / 2 + 4);
    w.box(tx, 0, z0 + 3, 0.3, 0.8, 0.3, DARK, { col: false });
    w.box(tx, 0.8, z0 + 3, 2, 1.1, 0.5, DARK, { mat: "paint", col: false });
    S.add(`A${i + 1}`, tx, 1.35, z0 + 3.26, 1.8, { height: 1.0 });
    S.add(`A${i + 1}`, tx, 1.35, z0 + 2.74, 1.8, { height: 1.0, ry: 180 });
  });
  // 계류장: 콘크리트 판 + 줄눈
  const { x0: ax0, x1: ax1, z0: az0, z1: az1 } = APRON, acx = (ax0 + ax1) / 2, acz = (az0 + az1) / 2;
  w.box(acx, 0, acz, ax1 - ax0, AT, az1 - az0, CONC, { mat: "std:concrete", tile: 6, col: false, ao: false });
  for (let x = ax0 + 10; x < ax1; x += 10) paint(w, x, acz, 0.18, az1 - az0, CONC2, AT);
  for (let zz = az0 + 10; zz < az1; zz += 10) paint(w, acx, zz, ax1 - ax0, 0.18, CONC2, AT);
  // 격납고 앞 유도선
  for (const hx of HANGARS) { paint(w, hx, (HF + az1) / 2, 0.35, az1 - HF, YEL, AT + 0.01); paint(w, hx, HF + 6, 12, 0.5, YEL, AT + 0.01); }
  // 전투기 주기 구역: 유도선 + 정지 막대
  for (const jx of JETS) { paint(w, jx, 15.5, 0.35, 31, YEL, AT + 0.01); paint(w, jx, 1.2, 5, 0.5, YEL, AT + 0.01); }
  paint(w, TRANS[0], 12, 0.35, 38, YEL, AT + 0.01);
  // 계류장 안전선: 붉은 테두리 (격납고 앞 비행기 대기 구역)
  paint(w, acx, az0 + 12, ax1 - ax0 - 4, 0.3, RED, AT + 0.01);

  // ── 도로: 담장 안 순환 도로 + 격납고 뒤 도로 + 생활 구역 길 ──
  const RW = 7;
  let ri = 0;
  const road = (ax, az, bx, bz, dash = true) => {
    const L2 = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, ry = Math.atan2(-(bz - az), bx - ax) / DEG, top = 0.05 + (ri++ % 3) * 0.008;
    w.box(mx, 0, mz, L2 + RW, top, RW, 0x55575c, { mat: "std:asphalt", tile: 8, col: false, ao: false, ry });
    if (dash) for (let d = -L2 / 2 + 3; d < L2 / 2 - 3; d += 8) { const t = d / L2; paint(w, mx + (bx - ax) * t, mz + (bz - az) * t, 3.2, 0.25, WH, 0.08, ry); }
  };
  const R = ROAD;
  road(-R.x, R.z1, R.x, R.z1); road(-R.x, R.z0, R.x, R.z0); road(-R.x, R.z0, -R.x, R.z1); road(R.x, R.z0, R.x, R.z1);
  road(-R.x, -122, R.x, -122);                         // 격납고 뒤
  road(-110, -122, -110, R.z0); road(125, -122, 125, R.z0);   // 생활 구역 남북 길
  road(GATE_X, R.z1, GATE_X, FENCE.z1 + 2, false);     // 정문
  road(200, -122, 200, -44); road(200, -44, R.x, -44); // 작전본부·유류고 길
  road(104, -100, 200, -100);
  // 정문 밖 마을 길
  road(GATE_X, FENCE.z1 + 2, GATE_X, 250);
}

// ── 아치형 격납고 넷: 반타원 지붕(골판), 앞뒤 박공벽에 큰 문(열린 셋은 관통 비행 가능), 안에는 기체와 정비 장비 ──
const archY = (u) => HWALL + HRISE * Math.sqrt(Math.max(0, 1 - (u / (HW / 2)) ** 2));
function gable(door) {
  const a = HW / 2, s = new THREE.Shape(), N = 18;
  s.moveTo(-a, 0);
  if (door) { s.lineTo(-door.w / 2, 0); s.lineTo(-door.w / 2, door.h); s.lineTo(door.w / 2, door.h); s.lineTo(door.w / 2, 0); }
  s.lineTo(a, 0); s.lineTo(a, HWALL);
  for (let i = 1; i < N; i++) { const t = (i / N) * Math.PI; s.lineTo(Math.cos(t) * a, HWALL + Math.sin(t) * HRISE); }
  s.lineTo(-a, HWALL); s.lineTo(-a, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false });
  const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) / 4, U.getY(i) / 4);
  return g;
}
const GABLE = {};
export function hangars(w, K, S) {
  const a = HW / 2, N = 14, HULLC = 0x8e9b86, WALLC = 0xd9d4c6;
  HANGARS.forEach((cx, i) => {
    const zf = HF, zb = HF - HD, zc = (zf + zb) / 2, open = OPEN[i];
    // 옆벽 + 반타원 지붕 (조각마다 기울인 골판)
    for (const s of [-1, 1]) w.box(cx + s * (a - 0.4), 0, zc, 0.8, HWALL, HD, HULLC, { mat: "std:corrug", tile: 3 });
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI, t1 = ((k + 1) / N) * Math.PI;
      const p0 = [Math.cos(t0) * a, HWALL + Math.sin(t0) * HRISE], p1 = [Math.cos(t1) * a, HWALL + Math.sin(t1) * HRISE];
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.15, mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, rz = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) / DEG;
      w.box(cx + mx, my - 0.35, zc, L, 0.7, HD + 1.6, k % 2 ? HULLC : 0x95a28c, { mat: "std:corrug", tile: 3, rz, ao: false });
    }
    // 지붕 꼭대기 환기 띠, 채광창
    w.box(cx, HWALL + HRISE + 0.2, zc, 3, 0.8, HD - 4, STEEL, { mat: "paint", col: false });
    for (const s of [-1, 1]) w.box(cx + s * 9, archY(9) + 0.25, zc, 2.2, 0.25, HD - 10, 0xcfe6ef, { mat: "glass", col: false, rz: -s * 24 });
    // 박공벽 앞(남)·뒤(북)
    for (const [zw, door] of [[zf - 0.8, open ? DOOR : null], [zb, open ? BDOOR : null]]) {
      const key = door ? `${door.w}x${door.h}` : "solid";
      const g = GABLE[key] || (GABLE[key] = gable(door));
      w.mesh(g, M(cx, 0, zw), WALLC, "std:panel");
      // 충돌: 2 m 폭 기둥으로 근사
      for (let u = -a + 1; u <= a - 1 + 0.01; u += 2) {
        const top = archY(u), inDoor = door && Math.abs(u) < door.w / 2 - 0.2, y0 = inDoor ? door.h : 0;
        if (top - y0 > 0.2) w.col.addBox(V3(cx + u, (y0 + top) / 2, zw + 0.4), V3(1.05, (top - y0) / 2, 0.45));
      }
      const face = zw === zb ? -1 : 1, fz = zw + (face > 0 ? 0.8 : 0);
      if (door) {
        // 문틀: 경고 줄무늬 상인방과 기둥
        w.box(cx, door.h, fz + face * 0.25, door.w + 1.2, 0.9, 0.5, YEL, { mat: "std:hazard", tile: 2, col: false });
        for (const s of [-1, 1]) w.box(cx + s * (door.w / 2 + 0.3), 0, fz + face * 0.25, 0.6, door.h, 0.5, YEL, { mat: "std:hazard", tile: 2, col: false });
        // 옆으로 밀어 둔 문짝
        const lw = door.w / 4 + 0.4;
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) w.box(cx + s * (door.w / 2 + lw / 2 - 1.5 + k * 1.2), 0, fz + face * (0.6 + k * 0.55), lw, door.h - 0.3, 0.4, k ? 0x9aa592 : 0x8a967f, { mat: "std:corrug", tile: 2 });
        w.gap(face > 0 ? "격납고 관통" : "격납고 뒷문", cx, door.h * 0.45, fz, 0, door.w - 6, door.h - 3, face > 0 ? 250 : 400);
      } else {
        // 닫힌 문: 문짝 네 장
        const dw = (face > 0 ? DOOR : BDOOR).w, dh = (face > 0 ? DOOR : BDOOR).h;
        for (let k = 0; k < 4; k++) w.box(cx - dw / 2 + dw / 8 + (k * dw) / 4, 0, fz + face * (0.3 + (k % 2) * 0.35), dw / 4 + 0.3, dh, 0.4, k % 2 ? 0x9aa592 : 0x8a967f, { mat: "std:corrug", tile: 2, col: false });
        w.box(cx, dh, fz + face * 0.4, dw + 1, 0.6, 0.6, DARK, { mat: "paint", col: false });
      }
    }
    // 번호와 이름 (정면 위)
    S.add(`H${i + 1}`, cx, 18.2, zf + 0.06, 3.6, { height: 3.6 });
    S.add(`HN${i + 1}`, cx - 9.6, 17.0, zf + 0.06, 6.6, { height: 1.5 });
    if (i === 3) S.add("silver", cx + 9.6, 17.0, zf + 0.06, 6.6, { height: 1.5 });
    K.blink.add(cx - a, HWALL + 0.6, zf + 0.5, RED, 0.3, i); K.blink.add(cx + a, HWALL + 0.6, zf + 0.5, RED, 0.3, i + 1);
    if (!open) return;
    // 실내: 바닥, 천장등, 바닥 유도선
    w.box(cx, 0, zc, HW - 1.6, AT + 0.02, HD - 1.6, 0xa8a49a, { mat: "std:concrete", tile: 5, col: false, ao: false });
    paint(w, cx, zc, 0.35, HD - 4, YEL, AT + 0.02);
    for (const u of [-12, 0, 12]) {
      w.box(cx + u, archY(u) - 1.6, zc, 1.2, 0.3, HD - 8, 0xf4f8ff, { mat: "glow", col: false });
      for (const dz of [-14, 0, 14]) w.pool(cx + u, AT + 0.04, zc + dz, 8, 0xeaf2ff, 0.06);
    }
    hangarContents(w, K, S, cx, zc, i);
  });
}

// 격납고 안 기체·장비 (가운데 폭 16 m · 높이 12 m 통로는 비워 둔다)
function hangarContents(w, K, S, cx, zc, i) {
  const a = HW / 2;
  // 벽을 따라 공구장·작업대
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const zz = zc - 18 + k * 12;
    w.box(cx + s * (a - 1.6), 0, zz, 1.6, 2.1, 4.2, k % 2 ? RED : 0x2f6fb0, { mat: "paint" });
    w.box(cx + s * (a - 1.6), 2.1, zz, 1.7, 0.12, 4.4, STEEL, { col: false });
  }
  if (i === 0) {
    // 1 격납고: 중고도 무인기 두 대 + 레이싱 드론 거치대
    uav().place(w, cx - 13, 0, zc - 6, 180);
    uav().place(w, cx + 13, 0, zc + 8, 180);
    for (let k = 0; k < 3; k++) { const zz = zc - 16 + k * 8; w.box(cx + 15, 0, zz, 4, 1.0, 2.2, GREY2, { mat: "paint" }); for (let j = 0; j < 3; j++) quad(w, cx + 13.8 + j * 1.2, 1.0, zz, j ? 0x2b2f38 : ORG); }
  } else if (i === 2) {
    // 3 격납고: 정비 중인 전투기 (한쪽으로 비켜 세움) + 정비 발판
    fighter(GREY).place(w, cx - 12, 0, zc + 2, 180);
    for (const dz of [-4, 6]) { w.box(cx - 18.5, 0, zc + dz, 2.4, 2.6, 3, YEL, { mat: "paint" }); }
    w.box(cx + 14, 0, zc - 10, 3, 1.6, 6, 0x2f6fb0, { mat: "paint" });
  } else if (i === 3) {
    // 4 격납고 (은빛 편대): 노을 기체 거치대, 머리 위 정비 크레인, 편대 드론 줄
    for (const s of [-1, 1]) { w.box(cx + s * (a - 3), 0, zc - 16, 0.8, archY(a - 3) - 1, 0.8, YEL, { mat: "paint" }); }
    beam(w, [cx - a + 3, 13.4, zc - 16], [cx + a - 3, 13.4, zc - 16], 0.9, YEL);
    w.box(cx + 6, 12.2, zc - 16, 2.2, 1.2, 1.6, DARK, { mat: "paint", col: false });
    w.pipe(cx + 6, 12.2, zc - 16, cx + 6, 6.2, zc - 16, 0.06, INK, { col: false });
    // 노을: 주황 대형 드론
    w.box(cx - 14, 0, zc + 4, 6, 1.2, 6, DARK, { mat: "paint" });
    const ng = new Parts();
    ng.box(0, 1.2, 0, 2.2, 0.8, 3.0, ORG).box(0, 2.0, -0.4, 1.4, 0.6, 1.6, 0xffb36a).sph(0, 1.7, -1.6, 0.55, INK, { mat: "glass" });
    for (const [u, v] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { ng.pipe([0, 1.5, 0], [u, 1.5, v], 0.16, DARK); ng.cyl(u, 1.5, v, 0.36, 0.5, STEEL); ng.cyl(u, 2.0, v, 1.3, 0.06, 0x30343c); }
    ng.place(w, cx - 14, 0, zc + 4, 180);
    for (let k = 0; k < 4; k++) { const zz = zc - 6 + k * 6; w.box(cx + 15, 0, zz, 4.5, 0.9, 3, GREY2, { mat: "paint" }); quad(w, cx + 15, 0.9, zz, [SILVER, 0x5aa9ff, 0xff8a5a, 0xc77dff][k], 1.4); }
    w.pool(cx - 14, AT + 0.05, zc + 4, 9, 0xffb36a, 0.25);
  }
}
// 작은 쿼드콥터 모형
function quad(w, x, y, z, color, s = 1) {
  w.box(x, y, z, 0.5 * s, 0.18 * s, 0.6 * s, color, { mat: "paint", col: false });
  for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { w.box(x + u * 0.32 * s, y + 0.05 * s, z + v * 0.32 * s, 0.38 * s, 0.05 * s, 0.38 * s, 0x30343c, { col: false }); }
}

// ── 항공기 부품 묶음 (기수 = -v) ──
export function fighter(color = GREY) {
  const P = new Parts(), y = 2.2;
  P.pipe([0, y, 7.5], [0, y, -4.5], 0.95, color, { col: true }).pipe([0, y, -4.5], [0, y - 0.1, -7.2], 0.6, color).sph(0, y - 0.1, -7.3, 0.48, color, { sz: 1.6 });
  P.sph(0, y + 0.75, -3.4, 0.7, 0x1f3a52, { sy: 0.55, sz: 1.7, mat: "glass" });
  for (const s of [-1, 1]) {
    P.box(s * 1.25, y - 0.9, -1.5, 1.0, 1.1, 3.2, color);   // 공기 흡입구
    P.box(s * 3.3, y - 0.15, 1.8, 4.6, 0.22, 4.2, color, { ry: s * -14 });
    P.box(s * 5.6, y - 0.15, 3.0, 1.2, 0.18, 1.8, color);
    P.box(s * 1.2, y + 0.5, 6.2, 0.22, 2.8, 2.4, color, { rz: s * -16 });
    P.box(s * 2.4, y - 0.1, 7.2, 2.6, 0.18, 1.6, color, { ry: s * -12 });
    P.pipe([s * 0.55, y - 0.15, 7.4], [s * 0.55, y - 0.15, 8.4], 0.5, DARK);
    P.cyl(s * 1.6, 0, 1.2, 0.08, y - 0.6, DARK).wheel(s * 1.6, 1.2, 0.45, 0.3);
  }
  P.cyl(0, 0, -4.6, 0.08, y - 0.6, DARK).wheel(0, -4.6, 0.35, 0.25);
  P.box(0, y - 0.15, 1.8, 6, 0.3, 3.4, color, { col: true });
  P.box(0, y - 1.0, 0, 0.6, 0.4, 1.5, 0x3e4a3a);   // 연료 탱크
  return P;
}
export function uav(color = 0xd5d9de) {
  const P = new Parts(), y = 1.5;
  P.pipe([0, y, 4.6], [0, y, -3.4], 0.55, color, { col: true }).sph(0, y + 0.1, -3.6, 0.62, color, { sz: 1.4 });
  P.box(0, y + 0.25, -0.6, 19, 0.16, 1.2, color, { col: true });
  for (const s of [-1, 1]) { P.box(s * 1.3, y + 0.75, 4.2, 2.6, 0.12, 1.0, color, { rz: s * 32 }); P.box(s * 9.5, y + 0.25, -0.5, 0.2, 0.4, 1.0, RED); }
  P.box(0, y - 0.7, 3.6, 0.12, 1.4, 0.9, color);
  P.cyl(0, y - 0.5, 4.9, 0.12, 0.2, DARK, { rx: 90 });
  P.box(0, y, 5.0, 2.4, 0.18, 0.18, DARK);
  P.sph(0, y - 0.6, -2.6, 0.38, 0x2b2f38);
  for (const [u, v] of [[-0.9, 0.6], [0.9, 0.6], [0, -2.4]]) { P.cyl(u, 0, v, 0.06, y - 0.4, DARK); P.wheel(u, v, 0.24, 0.16); }
  return P;
}
export function transport(color = 0x7e8a74) {
  const P = new Parts(), y = 3.6;
  P.pipe([0, y, 11], [0, y, -11], 2.3, color, { col: true }).sph(0, y - 0.2, -11, 2.3, color, { sz: 1.3 });
  P.pipe([0, y + 0.3, 11], [0, y + 1.6, 17], 1.5, color, { col: true }).pipe([0, y, 11], [0, y + 1.1, 15], 1.8, color);
  P.box(0, y + 1.9, -10.4, 2.6, 0.7, 1.6, 0x23313f, { mat: "glass" });
  P.box(0, y + 2.0, -1, 40, 0.55, 4.4, color, { col: true });
  P.box(0, y + 2.6, -1, 3.6, 0.7, 5.6, color);
  for (const u of [-12, -6, 6, 12]) {
    P.pipe([u, y + 1.7, -5.2], [u, y + 1.7, 1.6], 0.75, color).sph(u, y + 1.7, -5.3, 0.5, DARK);
    for (let b = 0; b < 4; b++) P.box(u, y + 1.7 - 1.9, -5.8, 0.36, 3.8, 0.12, INK, { rz: b * 45 + 10 });
  }
  P.box(0, y + 1.6, 15.4, 0.5, 7.4, 4.6, color, { col: true }).box(0, y + 2.4, 16.4, 13, 0.4, 2.8, color);
  for (const s of [-1, 1]) { P.box(s * 2.4, 0.6, 1.2, 1.2, 2.4, 6, color); P.wheel(s * 2.2, -0.2, 0.7, 0.5); P.wheel(s * 2.2, 2.6, 0.7, 0.5); }
  P.wheel(0, -8.6, 0.55, 0.4);
  P.box(0, y + 0.4, -6.5, 0.12, 1.2, 1.0, 0xf2f0ea);   // 옆 문
  return P;
}
export function trainer(color = 0xf2f0ea) {
  const P = new Parts(), y = 1.6;
  P.pipe([0, y, 4], [0, y, -3.4], 0.62, color, { col: true }).sph(0, y, -3.5, 0.5, color, { sz: 1.2 });
  P.sph(0, y + 0.55, -0.8, 0.5, 0x1f3a52, { sy: 0.6, sz: 2.6, mat: "glass" });
  P.box(0, y - 0.45, -0.6, 10.6, 0.18, 1.7, color, { col: true }).box(0, y + 0.1, 4.0, 3.6, 0.12, 0.9, color).box(0, y + 0.1, 4.0, 0.12, 1.6, 1.1, color);
  for (const s of [-1, 1]) P.box(s * 4.6, y - 0.45, -0.6, 1.2, 0.2, 1.75, ORG);
  P.cyl(0, y, -4.1, 0.16, 0.3, INK, { rx: 90 });
  P.box(0, y - 0.11, -4.2, 2.6, 0.14, 0.08, INK).box(0, y - 1.3, -4.2, 0.14, 2.6, 0.08, INK);
  for (const [u, v] of [[-1.3, -0.4], [1.3, -0.4], [0, 3.7]]) { P.cyl(u, 0, v, 0.06, y - 0.6, DARK); P.wheel(u, v, 0.3, 0.18); }
  return P;
}
export function helicopter(color = 0x55663f) {
  const P = new Parts(), y = 1.0;
  P.sph(0, y + 1.6, -0.6, 1.8, color, { sz: 2.0, sy: 0.95 }).box(0, y + 0.6, 0.6, 2.8, 2.2, 3.2, color, { col: true });
  P.sph(0, y + 1.9, -3.0, 1.0, 0x1f3a52, { sx: 1.25, sy: 0.75, mat: "glass" });
  P.pipe([0, y + 2.0, 2.0], [0, y + 2.6, 9.2], 0.45, color, { col: true }).box(0, y + 2.4, 9.0, 0.2, 2.2, 1.2, color).box(0, y + 2.6, 8.6, 2.6, 0.12, 0.7, color);
  P.cyl(0, y + 3.2, 0, 0.5, 0.6, DARK);
  for (let b = 0; b < 4; b++) P.box(0, y + 3.85, 0, 0.5, 0.08, 15.5, 0x24282e, { ry: b * 45 + 20 });
  P.box(0.3, y + 2.6, 9.4, 0.06, 2.4, 0.3, 0x24282e);
  for (const s of [-1, 1]) P.pipe([s * 1.1, 0.15, -2.4], [s * 1.1, 0.15, 2.2], 0.1, DARK);
  return P;
}

// ── 관제탑: 콘크리트 기둥, 팔각 유리 관제실, 안테나 기둥과 회전 등대 ──
export function tower(w, K, S) {
  const [x, z] = TOWER, H = 29.4;
  w.box(x, 0, z, 16, 5, 12, CREAM, { mat: "std:concrete", tile: 6 });
  w.box(x, 5, z, 16.6, 0.5, 12.6, DARK, { col: false });
  w.box(x, 0, z, 7, H, 7, 0xdcd6c8, { mat: "std:concrete", tile: 6 });
  for (let k = 0; k < 6; k++) { w.box(x, 7 + k * 3.6, z + 3.52, 1.4, 1.8, 0.08, 0x2a3b4c, { mat: "paint", col: false }); w.box(x - 3.52, 7 + k * 3.6, z, 0.08, 1.8, 1.4, 0x2a3b4c, { mat: "paint", col: false }); }
  for (const yy of [10, 18, 26]) w.box(x, yy, z, 7.3, 0.4, 7.3, ORG, { col: false });
  octa(w, x, H - 1.2, z, 6.4, 1.2, 0xdcd6c8, { mat: "paint" });
  octa(w, x, H, z, 8.4, 0.9, DARK, { mat: "paint" });
  octa(w, x, H + 0.9, z, 7.8, 5.2, 0x7fc0de, { mat: "glass" });
  octa(w, x, H + 0.9, z, 6.2, 1.3, 0x3a4048, { mat: "paint", col: false });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; w.box(x + Math.cos(a) * 7.25, H + 0.9, z + Math.sin(a) * 7.25, 0.32, 5.2, 0.32, DARK, { col: false }); }
  octa(w, x, H + 6.1, z, 8.8, 0.9, WH, { mat: "paint" });
  octa(w, x, H + 6.95, z, 8.9, 0.35, RED, { col: false });
  octa(w, x, H + 7, z, 3, 1.4, GREY, { mat: "paint" });
  w.pipe(x + 1.5, H + 8.4, z, x + 1.5, H + 18, z, 0.18, WH);
  for (const yy of [H + 11, H + 14.5, H + 18]) K.blink.add(x + 1.5, yy, z, RED, 0.32, (yy * 3) | 0);
  w.pipe(x - 2, H + 7, z + 2, x - 2, H + 11, z + 2, 0.08, WH, { col: false });
  w.pipe(x - 2, H + 7, z - 2, x - 2, H + 10, z - 2, 0.08, WH, { col: false });
  // 회전 등대(녹색·흰색)
  const P = new Parts();
  P.cyl(0, 0, 0, 0.5, 0.8, DARK).box(0.45, 0.25, 0, 0.5, 0.5, 0.5, 0xe6fff0, { mat: "glow" }).box(-0.45, 0.25, 0, 0.5, 0.5, 0.5, 0x40ff80, { mat: "glow" });
  const bc = P.group(w, false); bc.position.set(x - 1, H + 8.4, z - 1); w.scene.add(bc);
  w.updaters.push((dt) => { bc.rotation.y += dt * 2.4; });
  S.add("tower", x, 3.2, z + 6.06, 9, { height: 1.3 });
}

// ── 작전본부(브리핑실·관제실이 있는 2층 청사) + 주차장 + 소방대 ──
export function ops(w, K, S) {
  const [x, z] = OPS, W = 50, D = 18, H = 10.5;
  w.box(x, 0, z, W, H, D, CREAM, { mat: "std:concrete", tile: 6 });
  w.box(x, H, z, W + 0.6, 0.9, D + 0.6, 0x9c968a, { col: false });
  for (const [yy, hh] of [[1.6, 2.4], [6.2, 2.4]]) for (const s of [-1, 1]) {
    w.box(x, yy, z + s * (D / 2 + 0.04), W - 4, hh, 0.12, 0x2a4256, { mat: "paint", col: false });
    for (let k = -11; k <= 11; k++) w.box(x + k * 2, yy, z + s * (D / 2 + 0.1), 0.18, hh, 0.12, 0x9c968a, { col: false });
  }
  for (const s of [-1, 1]) w.box(x + s * (W / 2 + 0.04), 6.2, z, 0.12, 2.4, D - 4, 0x2a4256, { mat: "paint", col: false });
  // 현관 차양과 기둥, 국기대
  w.box(x, 3.6, z + D / 2 + 3, 14, 0.5, 6, WH, { mat: "paint" });
  for (const s of [-1, 1]) w.box(x + s * 6.4, 0, z + D / 2 + 5.5, 0.5, 3.6, 0.5, WH, { mat: "paint" });
  w.box(x, 0, z + D / 2 + 0.05, 5, 3.2, 0.12, 0x1f3040, { mat: "glass", col: false });
  // 옥상 설비: 냉방기, 작은 접시
  for (const [dx, dz] of [[-16, -3], [-8, 3], [14, -2]]) w.box(x + dx, H + 0.9, z + dz, 4, 1.6, 3, GREY, { mat: "std:panel", tile: 2 });
  w.box(x + 20, H + 0.9, z + 3, 2, 3.4, 2, DARK, { mat: "paint" });
  S.add("ops", x, H - 1.25, z + D / 2 + 0.08, 22, { height: 2.0 });
  S.add("brief", x - 10, 4.6, z + D / 2 + 0.08, 6, { height: 1.0 });
  // 주차장
  const px = 204, pz = -64;
  w.box(px, 0, pz, 34, AT, 30, 0x5a5c61, { mat: "std:asphalt", tile: 8, col: false, ao: false });
  for (let k = 0; k < 8; k++) for (const s of [-1, 1]) paint(w, px - 14 + k * 4, pz + s * 7, 0.2, 9, WH, AT);
  const CARS = [0xe8e8e8, 0x2b2f38, 0x9aa3ad, 0x2f6fb0, 0xb8312f, 0xe8e8e8, 0x3e4a3a, 0xd8d2c4];
  for (let k = 0; k < 11; k++) { const s = k % 2 ? 1 : -1, slot = (k * 3) % 7; car(w, px - 12 + slot * 4, pz + s * 7, s > 0 ? 0 : 180, CARS[k % CARS.length]); }
  // 소방대: 붉은 문 셋, 소방차 둘
  const fx = 70, fz = -80;
  w.box(fx, 0, fz, 30, 8, 16, 0xe9e2d2, { mat: "std:concrete", tile: 6 });
  w.box(fx, 8, fz, 30.6, 0.6, 16.6, RED, { col: false });
  for (let k = -1; k <= 1; k++) w.box(fx + k * 9.5, 0, fz + 8.05, 7.5, 5.4, 0.12, k ? 0xb8312f : 0x3a3f48, { mat: "std:corrug", tile: 2, col: false });
  S.add("fire", fx, 6.6, fz + 8.1, 12, { height: 1.4 });
  firetruck(w, fx - 9.5, fz + 15, 0); firetruck(w, fx + 9.5, fz + 16, -8);
}

// ── 차량 ──
export function car(w, x, z, ry, color) {
  const P = new Parts();
  P.box(0, 0.35, 0, 1.8, 0.75, 4.4, color, { col: true }).box(0, 1.1, 0.3, 1.6, 0.6, 2.2, 0x22303c, { mat: "glass" }).box(0, 1.1, 0.3, 1.66, 0.08, 2.3, color);
  for (const u of [-0.8, 0.8]) for (const v of [-1.4, 1.4]) P.wheel(u, v, 0.34, 0.24);
  P.place(w, x, w.h(x, z), z, ry);
}
export function firetruck(w, x, z, ry) {
  const P = new Parts();
  P.box(0, 0.6, -3.2, 2.5, 2.4, 2.4, RED, { col: true }).box(0, 1.8, -4.45, 2.2, 0.9, 0.1, 0x22303c, { mat: "paint" });
  P.box(0, 0.6, 1.2, 2.5, 2.2, 6.4, RED, { col: true }).box(0, 2.8, 1.2, 2.2, 0.3, 6, SILVER);
  P.box(0, 3.0, -3.2, 1.2, 0.25, 0.4, 0x5aa9ff, { mat: "glow" }).box(0, 1.5, 1.2, 2.56, 0.25, 6.2, WH);
  for (const v of [-3.2, 1.0, 3.2]) for (const u of [-1.1, 1.1]) P.wheel(u, v, 0.55, 0.35);
  P.place(w, x, w.h(x, z), z, ry);
}
export function fuelTruck(w, x, z, ry) {
  const P = new Parts();
  P.box(0, 0.6, -3.4, 2.4, 2.2, 2.2, 0xe8e3d4, { col: true }).box(0, 1.8, -4.52, 2.1, 0.8, 0.1, 0x22303c, { mat: "paint" });
  P.pipe([0, 2.0, -2], [0, 2.0, 4.2], 1.25, 0xd8d2c4, { col: true }).box(0, 0.6, 1.1, 2.0, 0.6, 6.6, DARK);
  P.box(0, 3.2, 1.1, 0.5, 0.3, 4, YEL).box(0, 2.0, 4.25, 1.4, 0.4, 0.1, RED);
  for (const v of [-3.3, 1.4, 3.2]) for (const u of [-1.05, 1.05]) P.wheel(u, v, 0.5, 0.35);
  P.place(w, x, w.h(x, z), z, ry);
}
export function tug(w, x, z, ry, color = YEL) {
  const P = new Parts();
  P.box(0, 0.3, 0, 2.2, 0.9, 3.6, color, { col: true }).box(0, 1.2, 0.9, 1.6, 1.0, 1.2, 0x22303c, { mat: "glass" });
  for (const u of [-1, 1]) for (const v of [-1.2, 1.2]) P.wheel(u, v, 0.4, 0.3);
  P.place(w, x, w.h(x, z), z, ry);
}
