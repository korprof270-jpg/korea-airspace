// 붉은 협곡 디테일: 구역별 소품·덧붙임, 연기·불꽃·깜박이 같은 작은 움직임, 절벽 식생, 원경 메사
// (구조·트랙·임무 좌표는 canyon.js 그대로. 여기서는 보는 맛만 더한다 — 큰 것만 충돌, 작은 소품은 충돌 없음)
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, mat, merged } from "./canyon-kit.js";
import { riverX, DAM, LAKE, FALLS, TARN, flat, slotPoint, dryness, lakeE } from "./canyon-terrain.js";

const DEG = Math.PI / 180, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const WOOD = 0x9a7446, WOOD2 = 0x6a4a2c, STEEL = 0x4a4f58, DARK = 0x2c3138, WARM = 0xffd9a0, CONC = 0xd4cdbd;
const FLAGS = [0xe94f37, 0xffc23a, 0x3f7fb5, 0xf2f0ea, 0x35b06a];

let T = null;
function templates(K) {
  const up = (g) => { g.translate(0, 0.5, 0); return g; };
  if (!T) T = {
    hex: up(new THREE.CylinderGeometry(1, 1, 1, 6)), rod: new THREE.CylinderGeometry(1, 1, 1, 8), disc: up(new THREE.CylinderGeometry(1, 1, 1, 24)),
    oct: new THREE.OctahedronGeometry(1, 0), cone5: up(new THREE.ConeGeometry(1, 1, 5)), taper: up(new THREE.CylinderGeometry(0.72, 1, 1, 9)),
  };
  return Object.assign(T, K.T);
}

// 회전된 국소 좌표계(u = +x, v = +z 를 ry 도 돌린 축). 메시만 넣고 충돌은 o.col 일 때만
function local(w, cx, cz, ry = 0, y0 = 0) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), X = (u, v) => cx + u * c + v * s, Z = (u, v) => cz - u * s + v * c;
  const put = (g, u, y, v, sx, sy, sz, color, o) => w.mesh(g, M(X(u, v), y0 + y, Z(u, v), sx, sy, sz, o.rx || 0, ry + (o.ry || 0), o.rz || 0), color, o.mat || "std");
  const L = {
    X, Z, ry, y0,
    b(u, y, v, su, sy, sv, color, o = {}) { put(BOX, u, y + sy / 2, v, su, sy, sv, color, o); if (o.col) L.col(u, y, v, su, sy, sv, o.ry); },
    c(u, y, v, r, h, color, o = {}) { put(o.g || T.col8, u, y, v, r, h, r, color, o); },
    o(u, y, v, r, color = WARM, key = "glow") { put(T.oct, u, y, v, r, r, r, color, { mat: key }); },
    col(u, y, v, su, sy, sv, ry2 = 0) { _e.set(0, (ry + ry2) * DEG, 0); w.col.addBox(V3(X(u, v), y0 + y + sy / 2, Z(u, v)), V3(su / 2, sy / 2, sv / 2), _q.setFromEuler(_e)); },
    cap(u, y1, v, y2, r) { w.col.addCapsule(V3(X(u, v), y0 + y1, Z(u, v)), V3(X(u, v), y0 + y2, Z(u, v)), r); },
    beam(u1, y1, v1, u2, y2, v2, t, color, o = {}) { beam(w, [X(u1, v1), y0 + y1, Z(u1, v1)], [X(u2, v2), y0 + y2, Z(u2, v2)], t, color, { col: false, mat: "std", ...o }); },
    P: (u, y, v) => [X(u, v), y0 + y, Z(u, v)],
    h: (u, v) => w.h(X(u, v), Z(u, v)),
    sub: (u, y, v, ry2 = 0) => local(w, X(u, v), Z(u, v), ry + ry2, y0 + y),
  };
  return L;
}

// ── 공용 소품 ──
function signpost(L, u, v, ry = 0, color = 0xf2e6b0) {
  L.b(u, 0, v, 0.14, 2.2, 0.14, WOOD2);
  L.b(u, 1.55, v, 1.3, 0.42, 0.07, color, { ry }); L.b(u, 1.05, v, 1.0, 0.3, 0.07, WOOD, { ry: ry + 25 });
}
function crates(L, u, v, ry = 0, color = 0xb98a4a) {
  L.b(u, 0, v, 0.95, 0.95, 0.95, color, { ry }); L.b(u + 1.0, 0, v + 0.2, 0.8, 0.7, 0.8, 0x9a7446, { ry: ry + 20 }); L.b(u + 0.15, 0.95, v + 0.05, 0.65, 0.6, 0.65, 0xc9a070, { ry: ry - 15 });
}
function barrels(L, u, v, cols = [0xc23b2e, 0x3f6f9a, 0xd9a441]) {
  [[0, 0], [0.95, 0.15], [0.45, 0.85], [1.5, 0.9], [-0.5, 0.75]].forEach(([du, dv], i) => { L.c(u + du, 0, v + dv, 0.42, 1.1, cols[i % cols.length], { mat: "paint" }); L.c(u + du, 1.1, v + dv, 0.36, 0.05, DARK); });
}
// 통나무·관 더미 (축이 v 방향, 3-2-1 로 쌓는다)
function pile(L, u, v, r, len, color, rows = 3, ry = 0, col = true) {
  const F = L.sub(u, 0, v, ry);
  for (let k = 0; k < rows; k++) for (let i = 0; i < rows - k; i++) F.c((i - (rows - k - 1) / 2) * r * 2.05, r + k * r * 1.75, 0, r, len, color, { g: T.rod, rx: 90 });
  if (col) F.col(0, 0, 0, rows * r * 2, r * (1 + rows * 1.6), len);
}
// 차량 (원점 = 바닥 가운데, 앞이 +v)
function car(F, color, truck = false) {
  const len = truck ? 5.8 : 4.1, wd = 1.95, cz = truck ? len * 0.2 : -len * 0.06, cl = truck ? len * 0.3 : len * 0.44;
  F.b(0, 0.42, 0, wd, 0.72, len, color, { mat: "paint" });
  F.b(0, 1.14, cz, wd * 0.92, 0.8, cl, color, { mat: "paint" }); F.b(0, 1.3, cz, wd * 0.95, 0.42, cl * 0.86, 0x232c36, { mat: "paint" }); F.b(0, 1.94, cz, wd * 0.96, 0.08, cl * 1.04, 0xf2f0ea, { mat: "paint" });
  if (truck) { for (const s of [-1, 1]) F.b(s * (wd / 2 - 0.05), 1.14, -len * 0.2, 0.1, 0.5, len * 0.5, color, { mat: "paint" }); F.b(0, 1.14, -len * 0.45, wd, 0.5, 0.1, color, { mat: "paint" }); F.b(0.2, 1.14, -len * 0.2, 1.1, 0.6, 1.5, 0xb98a4a); }
  for (const su of [-1, 1]) for (const sv of [-0.31, 0.31]) F.c(su * (wd / 2 - 0.05), 0.45, sv * len, 0.45, 0.32, 0x1a1b1e, { g: T.rod, rz: 90 });
  for (const su of [-0.62, 0.62]) { F.b(su, 0.78, len / 2, 0.34, 0.2, 0.06, 0xfff2c0, { mat: "glow" }); F.b(su, 0.78, -len / 2, 0.3, 0.16, 0.06, 0xff3a2a, { mat: "glow" }); }
  F.b(0, 0.42, len / 2 + 0.06, wd + 0.1, 0.2, 0.16, DARK); F.col(0, 0, 0, wd, 1.95, len);
}
// 말뚝 울타리 (지형을 따라간다, 충돌 없음)
function fence(w, x1, z1, x2, z2, color = 0x7a5a3a, hgt = 1.2) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / 2.6));
  let px = 0, py = 0, pz = 0;
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n, z = z1 + ((z2 - z1) * i) / n, y = w.h(x, z);
    w.mesh(BOX, M(x, y + hgt / 2 - 0.1, z, 0.14, hgt + 0.2, 0.14), color, "std");
    if (i) for (const k of [0.45, 0.9]) beam(w, [px, py + hgt * k, pz], [x, y + hgt * k, z], 0.08, color, { mat: "std", col: false });
    px = x; py = y; pz = z;
  }
}
// 줄에 매단 것들: kind "flag" 는 바람에 살랑이는 깃발, "light" 는 꼬마전구
function garland(w, a, b, sag, kind = "flag", colors = FLAGS, step = 0.75) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], n = Math.max(3, Math.round(Math.hypot(dx, dy, dz) / step)), yaw = Math.atan2(-dz, dx) / DEG;
  let p = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n, q = [a[0] + dx * t, a[1] + dy * t - sag * 4 * t * (1 - t), a[2] + dz * t];
    if (i % 3 === 0 || i === n) { beam(w, p, q, 0.04, 0x3a2f28, { mat: "std", col: false }); p = q; }
    if (i === n) break;
    if (kind === "flag") w.mesh(BOX, M(q[0], q[1] - 0.24, q[2], 0.42, 0.44, 0.03, 0, yaw, 0), colors[i % colors.length], "foliage");
    else if (i % 2) w.mesh(T.oct, M(q[0], q[1] - 0.14, q[2], 0.11, 0.14, 0.11), i % 4 === 1 ? 0xffe2a8 : 0xffb04a, "glow");
  }
}
// 깃대와 깃발
function flagpole(L, u, v, h, color, ry = 0, col = true) {
  L.b(u, 0, v, 0.1, h, 0.1, 0xdadada, { mat: "paint" }); L.o(u, h + 0.1, v, 0.14, 0xd9a441, "paint");
  const F = L.sub(u, 0, v, ry); F.b(0.85, h - 1.15, 0, 1.6, 1.0, 0.04, color, { mat: "foliage" }); F.b(0.85, h - 0.8, 0, 1.6, 0.22, 0.05, 0xf2f0ea, { mat: "foliage" });
  if (col) L.cap(u, 0, v, h, 0.1);
}

// ── 댐: 줄눈·물때·난간, 마루 도로 표시와 설비, 발전소, 취수탑 띠 ──
function damDetail(w, S) {
  const top = DAM.crest, F = local(w, DAM.x, DAM.z, DAM.ry), r = w.rand, JOINT = 0xa9a294, STAIN = 0x9c9486;
  const side = [[-4, 12, 18], [12, 24, 14.5], [24, 35, 11], [35, top - 1, 8]];
  for (const [u0, u1] of [[-62, -18.4], [14.4, 52]]) side.forEach(([y0, y1, t], i) => {
    const vf = 3 - t, um = (u0 + u1) / 2, len = u1 - u0;
    for (const k of [1 / 3, 2 / 3]) F.b(um, y0 + (y1 - y0) * k, vf - 0.05, len, 0.16, 0.1, JOINT);
    for (let u = u0 + 5.4; u < u1 - 2; u += 7.2) F.b(u, y0, vf - 0.06, 0.18, y1 - y0, 0.12, JOINT);
    for (let k = 0; k < 4; k++) { const hh = 2 + r() * 5; F.b(u0 + 2 + r() * (len - 4), y1 - hh, vf - 0.03, 0.5 + r() * 0.9, hh, 0.06, STAIN); }
    if (i < 3) {                                                                            // 단 위 점검로 난간
      for (const k of [0.55, 1.05]) F.b(um, y1 + k, vf + 0.35, len, 0.07, 0.07, 0x3a3f47, { mat: "paint" });
      for (let u = u0 + 0.4; u <= u1; u += 4.2) F.b(u, y1, vf + 0.35, 0.09, 1.08, 0.09, 0x3a3f47, { mat: "paint" });
    }
  });
  // 여수로: 흐름 줄눈과 감세공(물받이 블록)
  for (const u of [-14.5, -10.5, 6.5, 10.5]) F.b(u, 16.95, -15.75, 0.22, 1.7, 38.2, 0xcfc8b6, { rx: -61.2 });
  for (const u of [-16, -12.2, 8.2, 12]) F.b(u, -0.5, -29.5, 2, 3.2, 2.6, CONC, { col: true });
  for (const u of [-19.1, 15.1]) F.b(u, 34.6, -6.4, 1.5, 0.5, 2.2, 0xe0b23a, { mat: "paint" });
  // 마루 도로: 차선, 난간 기둥머리, 수문 권양기, 차단기, 정비 트럭
  for (let u = -58; u <= 48; u += 6) F.b(u, top + 0.2, -3.6, 2.6, 0.03, 0.22, 0xf2e6b0);
  for (const v of [-7.3, 0.2]) F.b(-5, top + 0.2, v, 112, 0.03, 0.14, 0xf2f0ea);
  for (let u = -61; u <= 51; u += 5.6) for (const v of [-7.8, 3.8]) F.b(u, top + 1.2, v, 0.6, 0.26, 0.62, 0xbdb6a6);
  for (const bu of [-12.2, -2, 8.2]) {
    F.b(bu, top + 0.2, 1.25, 3.2, 1.9, 1.4, 0x4d6f8a, { mat: "paint", col: true }); F.b(bu, top + 2.1, 1.25, 3.6, 0.18, 1.8, DARK);
    F.b(bu, top + 0.2, 0.52, 3.2, 0.45, 0.06, 0xe0b23a, { mat: "paint" }); F.c(bu, top + 1.25, 0.46, 0.42, 0.1, 0xc23b2e, { g: T.rod, rx: 90, mat: "paint" });
  }
  for (const [u, s] of [[-60.5, 1], [50.5, -1]]) { F.b(u, top + 0.2, 0.3, 0.3, 1.2, 0.3, 0xf2f0ea, { mat: "paint" }); for (let k = 0; k < 5; k++) F.b(u, top + 1.15, -0.5 - k * 1.5, 0.14, 0.14, 1.5, k % 2 ? 0xf2f0ea : 0xd9432f, { mat: "paint" }); void s; }
  car(F.sub(-40, top + 0.2, -5.4, 90), 0xe0a52a, true);
  for (const [u, v] of [[-35.5, -4.2], [-36.5, -6.6], [-44.5, -4.2]]) { F.c(u, top + 0.2, v, 0.22, 0.6, 0xff7a1a, { g: T.cone5, mat: "paint" }); F.b(u, top + 0.2, v, 0.42, 0.05, 0.42, DARK); }
  // 관리탑: 문·안테나·경광등·깃발
  for (const [u, k] of [[-21.5, 0], [17.5, 1]]) {
    F.b(u, top + 0.2, -2.07, 1.1, 2.2, 0.07, 0x3a3028); F.b(u, top + 2.45, -2.0, 1.5, 0.1, 0.5, 0x8a4a34);
    for (const du of [-2.22, 2.22]) F.b(u + du, top + 3, -4.6, 0.06, 1.1, 2.2, 0x2a3340, { mat: "paint" });
    if (k) flagpole(F.sub(u + 1.6, top + 6.1, -6.4), 0, 0, 5, 0x3f7fb5, 90, false);
    else { F.b(u, top + 6.1, -4.6, 0.08, 3, 0.08, DARK); F.b(u, top + 8.2, -4.6, 0.9, 0.06, 0.06, DARK); S.blink.push([...F.P(u, top + 9.25, -4.6), 0.24]); }
  }
  // 취수탑: 수위 눈금 띠, 발코니, 창, 꼭대기 경광등
  const tx = F.X(22, 24), tz = F.Z(22, 24);
  for (let k = 0; k < 4; k++) w.mesh(T.disc, M(tx, 36.2 + k * 2.2, tz, 3.66, 0.7, 3.66), k % 2 ? 0xf2f0ea : 0xc23b2e, "paint");
  w.mesh(T.disc, M(tx, 45.4, tz, 4.3, 0.3, 4.3), 0x8f8a80, "std");
  for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + 0.4; w.mesh(BOX, M(tx + Math.cos(a) * 3.62, 48.2, tz + Math.sin(a) * 3.62, 0.1, 1.4, 1.0, 0, -a / DEG, 0), 0x2a3340, "paint"); }
  S.blink.push([tx, 54.5, tz, 0.3]);
  // 저수지에 매어 둔 순찰정
  const B = F.sub(-20, 34.7, 13, 78);
  B.b(0, 0, 0, 1.9, 0.75, 5.6, 0xf2f0ea, { mat: "paint", col: true }); B.b(0, 0.45, 0, 1.96, 0.2, 5.66, 0xd9532f, { mat: "paint" }); B.b(0, 0.75, -0.5, 1.4, 0.9, 1.9, 0xe9e7e0, { mat: "paint" }); B.b(0, 1.1, -0.5, 1.44, 0.36, 1.6, 0x232c36, { mat: "paint" });
  // 하류 왼쪽 기슭의 발전소 (바위에 반쯤 묻혀 있다)
  const P = F.sub(21, 0, -34), yb = Math.min(F.h(16.5, -34), 3) - 1.5;
  P.b(0, yb, 0, 9, 13.5 - yb, 13, 0xcfc8b8, { col: true }); P.b(-0.3, 13.5, 0, 10, 0.5, 14, 0x8a4a34);
  for (let k = -2; k <= 2; k++) { P.b(-4.52, 7.6, k * 2.5, 0.08, 3.2, 1.3, 0xffd9a0, { mat: "glow" }); P.b(-4.6, 7.4, k * 2.5, 0.14, 0.16, 1.7, 0xa9a294); }
  for (const dv of [-3.2, 3.2]) { P.b(-4.52, yb + 1.4, dv, 0.1, 2.3, 3.2, 0x1d2228); S.smoke.push([P.X(-6, dv), 0.6, P.Z(-6, dv), 2.5, 2, -1, 1.6, 4.2, 0xffffff, 2]); }
  P.b(-4.56, 11.6, 0, 0.08, 1.1, 9, 0x3d6b8c, { mat: "paint" });
  for (const u of [18.5, 22.5]) { F.c(u, 17, -20.5, 1.2, 16, 0x6d7683, { g: T.rod, rx: 60, mat: "paint" }); w.col.addCapsule(V3(...F.P(u, 21, -13.6)), V3(...F.P(u, 13, -27.4)), 1.2); for (const k of [-0.3, 0.3]) F.c(u, 17 + k * 8, -20.5 + k * 13.9, 1.36, 0.5, DARK, { g: T.rod, rx: 60 }); }
  // 여수로 물안개
  for (const du of [-5, 1]) S.smoke.push([F.X(du, -29), 1.2, F.Z(du, -29), 11, 5, -3, 3.4, 6, 0xffffff, 3]);
}

// ── 캠프: 통나무 의자·장작·오두막 문과 창·꼬마전구 줄·식탁. 출발 캠프에는 이륙 패드·지프·풍향계 ──
function campDetail(w, S, x, z, ry, spawn) {
  const y = w.h(x, z), L = local(w, x, z, 0, y);
  for (const a of [0.5, 2.6, 4.5]) L.c(Math.cos(a) * 2.7, 0.3, 4 + Math.sin(a) * 2.7, 0.28, 2.1, WOOD2, { g: T.rod, rz: 90, ry: -(a / DEG + 90) });
  for (let i = 0; i < 5; i++) L.c(-3.5 + (i % 3) * 0.42 + (i > 2 ? 0.21 : 0), 0.2 + (i > 2 ? 0.36 : 0), 7.4, 0.2, 1.3, i % 2 ? WOOD : 0xb08a5a, { g: T.rod, rx: 90 });
  S.flames.push([x, y + 0.1, z + 4, 1.25]); S.smoke.push([x, y + 1.6, z + 4, 9, 3, 1, 0.8, 6.5, 0x8f8a86, 3]);
  // 오두막
  const H = L.sub(-8, 0, -5, ry);
  H.b(1.2, 0, 2.52, 1.0, 2.0, 0.08, 0x3a2a1c); H.b(1.2, 2.0, 2.54, 1.3, 0.12, 0.12, WOOD2); H.b(1.2, 0, 3.05, 1.7, 0.18, 0.9, WOOD);
  H.b(-1.4, 1.2, 2.52, 1.2, 0.85, 0.06, WARM, { mat: "glow" }); H.b(-1.4, 1.2, 2.56, 0.07, 0.85, 0.03, WOOD2); H.b(-1.4, 1.58, 2.56, 1.2, 0.07, 0.03, WOOD2); H.b(-1.4, 1.05, 2.6, 1.4, 0.1, 0.16, WOOD2);
  H.b(2, 3.1, -1.4, 0.65, 2.3, 0.65, 0x8f8a80); H.b(2, 5.4, -1.4, 0.85, 0.14, 0.85, 0x6a655d); S.smoke.push([H.X(2, -1.4), y + 5.8, H.Z(2, -1.4), 7, 2.5, 0.8, 0.6, 7, 0xb9b4ac, 2]);
  H.c(-3.55, 0, 1.7, 0.42, 1.0, 0x8a623c); H.c(-3.55, 1.0, 1.7, 0.36, 0.05, DARK); crates(H, -3.75, -0.5, 8);
  // 전구 줄 기둥, 깃발 줄
  L.b(3.5, 0, 0.5, 0.13, 3.9, 0.13, WOOD2); L.cap(3.5, 0, 0.5, 3.8, 0.13); L.o(3.5, 4.0, 0.5, 0.2);
  garland(w, L.P(-5.4, 3.3, -3.4), L.P(3.5, 3.85, 0.5), 0.5, "light");
  garland(w, L.P(3.5, 3.85, 0.5), L.P(10, 5.5, -7), 0.6, "flag");
  // 식탁, 짐
  L.b(3.6, 0.76, 9.2, 1.9, 0.08, 0.85, WOOD); for (const s of [-1, 1]) { L.b(3.6 + s * 0.7, 0, 9.2, 0.1, 0.76, 0.7, WOOD2); L.b(3.6, 0.42, 9.2 + s * 0.78, 1.9, 0.07, 0.3, WOOD2); L.b(3.6 + s * 0.7, 0, 9.2 + s * 0.78, 0.08, 0.42, 0.26, WOOD2); }
  L.b(3.3, 0.84, 9.2, 0.3, 0.22, 0.3, 0xc23b2e, { mat: "paint" }); L.o(3.9, 1.0, 9.1, 0.13);
  L.b(4.1, 0, -1.6, 0.5, 0.62, 0.36, 0x3f7fb5, { ry: 20 }); L.b(10.7, 0, 3.7, 0.7, 0.5, 0.5, 0xb98a4a, { ry: -12 }); L.b(6, 0.01, -1.3, 1.5, 0.05, 1.0, 0xc9a070, { ry: 6 }); L.b(8.4, 0.01, 5.2, 1.5, 0.05, 1.0, 0xd9772f, { ry: -20 });
  if (!spawn) { signpost(L, -2.5, -9.5, 20); return; }
  signpost(L, 11, 9, -30);
  // 이륙 패드
  L.c(2, 0, -10, 2.5, 0.07, STEEL, { g: T.disc }); L.c(2, 0, -10, 2.1, 0.09, 0xf2e6b0, { g: T.disc }); L.c(2, 0, -10, 1.85, 0.11, 0x59606a, { g: T.disc });
  L.b(2, 0.11, -10, 1.7, 0.02, 0.24, 0xffc23a); L.b(2, 0.11, -10, 0.24, 0.02, 1.7, 0xffc23a);
  for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.785; L.o(2 + Math.cos(a) * 2.7, 0.16, -10 + Math.sin(a) * 2.7, 0.13, 0x7ad8ff); }
  L.b(5.6, 0, -12.2, 1.1, 0.5, 0.7, DARK, { ry: 15 }); L.b(5.7, 0.5, -12.2, 0.8, 0.36, 0.5, 0xd9a441, { ry: -8 });
  for (let k = 0; k < 3; k++) { const a = k * 2.094; L.beam(-2.5 + Math.cos(a) * 0.6, 0, -13 + Math.sin(a) * 0.6, -2.5, 1.7, -13, 0.06, DARK); } L.b(-2.5, 1.7, -13, 0.06, 1.2, 0.06, DARK); L.b(-2.5, 2.5, -13, 0.7, 0.5, 0.08, 0xf2f0ea, { mat: "paint", ry: 30 });
  car(L.sub(-2, 0, 12.6, 70), 0x4d7a4a);
  // 풍향계 (바람자루가 흔들린다)
  L.b(13, 0, -2, 0.12, 6, 0.12, 0xdadada, { mat: "paint" }); L.cap(13, 0, -2, 6, 0.12);
  const parts = [];
  for (let i = 0; i < 3; i++) { const g = new THREE.CylinderGeometry(0.4 - (i + 1) * 0.085, 0.4 - i * 0.085, 0.72, 8); g.rotateZ(-Math.PI / 2); g.translate(0.4 + i * 0.72, 0, 0); parts.push([g, null, i % 2 ? 0xf2f0ea : 0xff6a1a]); }
  const sock = prop(w, parts); sock.position.set(x + 13, y + 5.9, z - 2);
  w.rider(sock, [[1.1, 0, 0, 1.1, 0.35, 0.35]]);
  w.updaters.push((dt, t) => { sock.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.3 + Math.sin(t * 1.7) * 0.08; sock.rotation.z = -0.16 + Math.sin(t * 2.3) * 0.07; });
}

// ── 광산: 침목·난간, 선광장 창과 굴뚝, 벨트, 권양탑 바퀴, 자재 더미, 급수탑, 울타리 ──
function mineDetail(w, S) {
  const [MX, MZ] = flat("mine"), y0 = w.h(MX, MZ), F = local(w, MX, MZ, 45, y0), RUST = 0xa4532f, ty = 5.2, v0 = -22;
  let vP = 34;
  while (vP < 72 && w.h(F.X(8, vP), F.Z(8, vP)) < y0 + ty + 1.2) vP += 1;
  for (let v = v0 + 0.8; v < vP; v += 1.7) F.b(8, ty - 0.04, v, 2.3, 0.1, 0.32, WOOD2);
  for (let v = v0 + 1; v < vP - 1; v += 3.25) F.b(9.42, ty, v, 0.1, 1.05, 0.1, WOOD2);
  F.b(9.42, ty + 1.0, (v0 + vP) / 2, 0.1, 0.1, vP - v0 - 2, WOOD); F.b(9.42, ty + 0.55, (v0 + vP) / 2, 0.07, 0.07, vP - v0 - 2, WOOD);
  for (const du of [-1.9, 1.9]) F.o(8 + du, ty + 3.4, vP - 0.3, 0.22, 0xffb04a);
  F.b(8, ty + 3.2, vP - 0.28, 2.4, 0.7, 0.08, 0xf2e6b0); F.b(8, ty + 3.3, vP - 0.33, 2.0, 0.14, 0.04, 0xc23b2e);
  // 선광장 (u=8, v=-27, 9×10×10)
  for (const dv of [-3, 0, 3]) for (const yy of [3, 6.6]) { F.b(12.55, yy, -27 + dv, 0.08, 1.4, 1.7, yy > 5 ? WARM : 0x232c36, { mat: yy > 5 ? "glow" : "paint" }); F.b(12.6, yy - 0.12, -27 + dv, 0.12, 0.12, 2.0, 0x5a3a2c); }
  F.b(12.56, 8.5, -27, 0.08, 1.0, 7, 0xf2f0ea, { mat: "paint" }); F.b(12.6, 8.85, -27, 0.06, 0.2, 7, 0xc23b2e, { mat: "paint" });
  F.b(8, 0, -21.95, 9.1, 0.7, 0.08, 0xe0b23a, { mat: "paint" }); F.b(12.56, 0, -27, 0.08, 0.7, 10.1, 0xe0b23a, { mat: "paint" });
  F.b(12.6, 0, -22.4, 0.2, 10, 0.2, DARK); F.b(9.6, 0, -21.94, 2.4, 3, 0.1, 0x3a3028);
  F.c(10.6, 10.2, -30, 0.75, 6.5, 0x5a5f68, { g: T.taper }); F.c(10.6, 16.7, -30, 0.62, 0.3, DARK); S.smoke.push([F.X(10.6, -30), y0 + 17.2, F.Z(10.6, -30), 16, 9, 3, 1.5, 8, 0x8f8a86, 4]);
  for (const du of [-2.2, 1]) { F.b(8 + du, 10.5, -25, 1.2, 0.8, 1.2, 0x6d7683); F.b(8 + du, 11.3, -25, 1.5, 0.12, 1.5, DARK); }
  F.b(-5.76, 7.44, -27, 21.2, 0.12, 1.3, 0x22262c, { rz: -24 });
  for (let k = 0; k < 6; k++) { const u = -13.5 + k * 3.1; F.c(u, 7.5 - (u + 6) * 0.445, -27, 0.5, 0.45, k % 2 ? 0x8d8378 : 0xb5673c, { g: T.cone5 }); }
  // 권양탑 (u=-12, v=16): 돌아가는 바퀴살, 꼭대기 난간, 경광등, 사다리
  const hu = -12, hv = 16, hh = 21, sp = [];
  for (const wx of [-1.0, 0.6]) { for (let k = 0; k < 3; k++) sp.push([new THREE.BoxGeometry(0.46, 3.5, 0.24), M(wx, 0, 0, 1, 1, 1, k * 60, 0, 0), 0xe0a52a]); sp.push([new THREE.BoxGeometry(0.6, 0.7, 0.7), M(wx, 0, 0), 0x8a4a34]); }
  const wheel = prop(w, sp); wheel.rotation.order = "YXZ"; wheel.rotation.y = 45 * DEG; wheel.position.set(F.X(hu, hv), y0 + hh + 2.4, F.Z(hu, hv));
  w.updaters.push((dt) => { wheel.rotation.x += dt * 1.5; });
  for (const s of [-1, 1]) { F.b(hu, hh + 1.4, hv + s * 2.3, 4.6, 0.08, 0.08, 0xe0b23a, { mat: "paint" }); F.b(hu + s * 2.3, hh + 1.4, hv, 0.08, 0.08, 4.6, 0xe0b23a, { mat: "paint" }); for (const q of [-1, 1]) F.b(hu + s * 2.3, hh + 0.5, hv + q * 2.3, 0.08, 0.95, 0.08, 0xe0b23a, { mat: "paint" }); }
  S.blink.push([...F.P(hu, hh + 4.7, hv), 0.26]); F.b(hu, hh + 0.5, hv, 0.08, 4.1, 0.08, DARK);
  // 권양기실 (u=-12, v=35, 8×5×7)
  F.b(-14, 0, 31.46, 1.2, 2.2, 0.08, 0x3a3028); F.b(-10.3, 1.9, 31.46, 1.8, 1.0, 0.06, WARM, { mat: "glow" }); F.b(-10.3, 1.78, 31.42, 2.1, 0.12, 0.14, 0x5a3a2c);
  F.c(-9.2, 5, 37, 0.28, 3, DARK); S.smoke.push([F.X(-9.2, 37), y0 + 8.2, F.Z(-9.2, 37), 9, 5, 2, 0.8, 5.5, 0x6f6a66, 3]);
  // 야적장
  barrels(F, -22.5, 21.8); crates(F, -18.6, 24.6, 20, 0x8f9aa6);
  pile(F, 19, 7, 0.36, 5.2, 0xb08a5a, 3, 8); pile(F, 14, 13.4, 0.42, 6.4, 0x8f9aa6, 3, 84);
  for (const [u, v] of [[4.5, 33.5], [6.9, 34.6]]) { F.c(u, 1.1, v, 0.75, 1.0, WOOD, { g: T.rod, rz: 90, ry: 30 }); for (const s of [-0.55, 0.55]) F.c(u + s * 0.87, 1.1, v - s * 0.5, 1.1, 0.1, WOOD2, { g: T.rod, rz: 90, ry: 30 }); }
  // 대피선의 광차 세 대
  for (const du of [-0.7, 0.7]) F.b(1.5, 0, 25 + du, 11, 0.12, 0.12, 0x3a3f47, { mat: "metal" });
  for (let u = -3.5; u <= 6.5; u += 1.25) F.b(u, 0, 25, 0.3, 0.07, 2.2, WOOD2);
  for (let k = 0; k < 3; k++) { const u = -1.6 + k * 2.6; F.b(u, 0.35, 25, 2.1, 1.0, 1.5, k === 1 ? 0x6b4a3a : RUST); F.c(u, 1.3, 25, 0.85, 0.6, k % 2 ? 0xb5673c : 0x8d8378, { g: T.cone5 }); for (const s of [-0.7, 0.7]) F.c(u + s, 0.3, 25, 0.3, 1.7, DARK, { g: T.rod, rx: 90 }); }
  F.col(1, 0, 25, 7.6, 1.5, 1.6);
  // 굴착기 (광석 더미 옆)
  const E = F.sub(14.5, 0, 25.5, -62);
  E.b(0, 0.25, 0, 2.6, 0.8, 3.6, DARK); E.b(0, 1.05, -0.2, 2.4, 1.2, 2.8, 0xe0a52a, { mat: "paint" }); E.b(-0.5, 2.25, 0.3, 1.2, 1.2, 1.4, 0xe0a52a, { mat: "paint" }); E.b(-0.5, 2.5, 0.35, 1.26, 0.7, 1.2, 0x232c36, { mat: "paint" });
  E.beam(0.6, 1.9, 1.2, 0.6, 5.2, 4.2, 0.42, 0xe0a52a, { mat: "paint" }); E.beam(0.6, 5.2, 4.2, 0.6, 2.0, 6.4, 0.34, 0xe0a52a, { mat: "paint" }); E.b(0.6, 1.2, 6.5, 1.1, 0.9, 0.9, DARK, { rx: 25 });
  E.col(0, 0, 0, 2.6, 3.4, 3.6);
  // 급수탑
  const WT = F.sub(30, 0, 4), gy = (u, v) => WT.h(u, v) - y0 - 0.4;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) WT.beam(a * 2.2, gy(a * 2.2, b * 2.2), b * 2.2, a * 1.7, 8, b * 1.7, 0.3, WOOD2, { col: true });
  for (const [a, b, c, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) { WT.beam(a * 2, 3.6, b * 2, c * 2, 3.6, d * 2, 0.16, WOOD2); WT.beam(a * 2.1, 1, b * 2.1, c * 1.8, 7, d * 1.8, 0.12, WOOD2); }
  WT.b(0, 8, 0, 4.6, 0.25, 4.6, WOOD); WT.c(0, 8.25, 0, 2.5, 3.6, 0xb08a5a, { g: T.disc }); for (const yy of [8.9, 10.6]) WT.c(0, yy, 0, 2.56, 0.16, DARK, { g: T.disc });
  WT.c(0, 11.85, 0, 2.9, 1.5, 0x8a4a34, { g: T.cone5 }); WT.col(0, 8, 0, 4.2, 4, 4.2); WT.b(2.6, 2, 0, 0.14, 6.2, 0.14, DARK); WT.b(2.6, 2, 0, 0.5, 0.5, 0.5, 0x3d6b8c);
  // 북쪽 울타리, 입구 간판
  const fp = (u, v) => [F.X(u, v), F.Z(u, v)];
  fence(w, ...fp(-30, 12), ...fp(-30, 41)); fence(w, ...fp(-30, 41), ...fp(3, 41)); fence(w, ...fp(13, 41), ...fp(26, 38)); fence(w, ...fp(26, 38), ...fp(34, 18));
  signpost(F, 31, -9, 40, 0xe0b23a);
}

// ── 폭포 골짜기: 물안개·무지개, 이끼와 덩굴, 용소 가장자리 바위, 전망 데크. 타른의 잔교와 연잎, 개울의 통나무 다리 ──
function fallsDetail(w, S) {
  const { x: fx, z: fz, lip, edge } = FALLS, r = w.rand, cx = (fx + edge) / 2 - 1;
  for (let i = 0; i < 5; i++) S.smoke.push([fx + 5 + r() * 4, 1, fz + (i - 2) * 2.6, 10 + r() * 6, 5 + r() * 3, (i - 2) * 1.2, 3 + r() * 1.4, 5 + r() * 2.5, 0xffffff, 2]);
  rainbow(w, fx + 15, -3, fz + 1, 21, Math.PI / 2 - 0.25);
  // 바위 턱의 이끼·고사리와 늘어진 덩굴
  for (let i = 0; i < 20; i++) {
    const a = 0.75 + (i / 19) * 4.78, px = cx + Math.cos(a) * 11, pz = fz + Math.sin(a) * 8.6, s = 0.9 + r() * 0.9;
    w.mesh(T.puff[i % 2], M(px, lip - 1.6 + r() * 1.6, pz, s, s * 0.6, s, 0, r() * 360, 0), [0x4f8a3c, 0x6aa34a, 0x3f7a44][i % 3], "foliage");
    if (i % 2 && Math.cos(a) > -0.2) { const h = 2.5 + r() * 5; w.mesh(BOX, M(px + 0.3, lip - 2.4 - h / 2, pz, 0.3, h, 0.1, 0, r() * 90, 0), 0x3f7a44, "foliage"); }
  }
  // 용소 가장자리의 젖은 바위와 풀
  for (let i = 0; i < 22; i++) {
    const a = -1.9 + (i / 21) * 3.8, d = 13.5 + r() * 4, px = FALLS.pool[0] + Math.cos(a) * d, pz = FALLS.pool[1] + Math.sin(a) * d, y = w.h(px, pz), s = 0.6 + r() * 1.1;
    if (y < -1.2 || y > 5) continue;
    w.mesh(T.rock[i % 4], M(px, y + s * 0.2, pz, s * 1.2, s * 0.7, s, 0, r() * 360, 0), i % 3 ? 0x8a6a58 : 0x6f7a5a, "std:rock");
    if (i % 3 === 0) w.mesh(T.puff[0], M(px + 0.8, y + 0.4, pz + 0.5, 0.9, 0.5, 0.9), 0x5f9a44, "foliage");
  }
  // 전망 데크 (용소를 바라본다)
  const dx = -62, dz = -2, D = local(w, dx, dz, -56, w.h(dx, dz) + 0.5);
  D.b(0, -0.3, 0, 5.4, 0.3, 4.2, WOOD, { col: true }); for (const [u, v] of [[-2.5, -1.9], [2.5, -1.9], [-2.5, 1.9], [2.5, 1.9]]) D.b(u, -1.6, v, 0.22, 1.5, 0.22, WOOD2);
  for (const k of [0.55, 1.05]) { D.b(0, k, 2.0, 5.4, 0.08, 0.08, WOOD2); D.b(-2.6, k, 0, 0.08, 0.08, 4.1, WOOD2); }
  for (let u = -2.6; u <= 2.61; u += 1.3) D.b(u, 0, 2.0, 0.1, 1.1, 0.1, WOOD2);
  D.b(1, 0, -1.2, 1.8, 0.45, 0.5, WOOD); D.b(1, 0.45, -1.42, 1.8, 0.5, 0.08, WOOD); D.b(-2.6, 0, -2, 0.12, 2.6, 0.12, WOOD2); D.o(-2.6, 2.75, -2, 0.2);
  for (let k = 0; k < 3; k++) D.b(3.2 + k * 0.6, -0.45 - k * 0.2, -1, 0.6, 0.15, 1.4, WOOD);
  signpost(D, 4.6, 1.6, 30);
  S.keep(dx, dz, 6);
  // 타른: 잔교·조각배·연잎
  const Q = local(w, TARN.x - 2, TARN.z - 24.5, 8, TARN.y);
  Q.b(0, 0.35, 4.5, 2, 0.2, 10, WOOD, { col: true });
  for (let v = 0.5; v <= 9.5; v += 3) for (const s of [-1.05, 1.05]) Q.b(s, -2.5, v, 0.2, 3.6, 0.2, WOOD2);
  Q.b(1.05, 0.55, 9.3, 0.14, 1.6, 0.14, WOOD2); Q.o(1.05, 2.3, 9.3, 0.18);
  Q.b(-2.3, -0.1, 6.5, 1.3, 0.55, 3.4, 0xe94f37, { mat: "paint", ry: 12 }); Q.b(-2.3, 0.3, 6.5, 1.0, 0.1, 0.3, WOOD, { ry: 12 }); Q.b(-2.3, 0.4, 6.6, 3.2, 0.06, 0.12, WOOD2, { ry: 30 });
  Q.b(1.6, 0.2, -1.6, 1.6, 0.42, 0.45, WOOD, { ry: 20 }); S.keep(Q.X(0, 0), Q.Z(0, 0), 6);
  for (let i = 0; i < 16; i++) {
    const a = r() * 6.283, d = 9 + r() * 12, px = TARN.x + Math.cos(a) * d, pz = TARN.z + Math.sin(a) * d, s = 0.5 + r() * 0.5;
    w.mesh(T.hex, M(px, TARN.y + 0.02, pz, s, 0.04, s, 0, r() * 60, 0), i % 3 ? 0x4f9a4a : 0x6fb85a, "std");
    if (i % 4 === 0) w.mesh(T.oct, M(px + 0.1, TARN.y + 0.18, pz, 0.16, 0.14, 0.16), 0xf7a8c8, "paint");
  }
  // 개울을 건너는 통나무 다리
  const G = local(w, -141, 20, -15, TARN.y);
  for (const du of [-0.5, 0, 0.5]) G.c(du, 1.0, 0, 0.26, 13, du ? WOOD : 0xb08a5a, { g: T.rod, rx: 90 });
  G.col(0, 0.7, 0, 1.5, 0.55, 13); for (const sv of [-6, 6]) for (const su of [-0.9, 0.9]) G.b(su, G.h(su, sv) - TARN.y - 0.2, sv, 0.18, 1.3, 0.18, WOOD2);
  S.keep(-141, 20, 8);
}

// 폭포 물안개에 걸린 무지개 (가산 혼합, 충돌 없음)
function rainbow(w, x, y, z, R, ry) {
  const parts = [0xff4a4a, 0xff9a3a, 0xffe14a, 0x5ad66a, 0x4aa8ff, 0x8a6aff].map((c, i) => [new THREE.RingGeometry(R - (i + 1) * 0.6, R - i * 0.6, 40, 1, 0.1, Math.PI - 0.2), null, c]);
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(merged(parts), m);
  mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.renderOrder = 5;
  w.scene.add(mesh);
}

// ── 바늘귀 협곡: 틈으로 떨어지는 빛기둥, 벽 등불, 돌탑 ──
function slotDetail(w) {
  const r = w.rand, dir = (t) => { const a = slotPoint(t - 0.01), b = slotPoint(t + 0.01), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  for (const [t, rb, off] of [[0.12, 3.2, 0], [0.27, 3, 0], [0.44, 3.6, 0], [0.53, 6, -5], [0.6, 5.5, 4], [0.7, 3.4, 0], [0.87, 3.2, 0]]) {
    const [x0, z0] = slotPoint(t), [dx, dz] = dir(t), x = x0 - dz * off, z = z0 + dx * off, y = w.h(x, z);
    w.shaft(x, y + 34, z, 0.5, rb, 34.5, 0xffe2b0, 0.085); w.pool(x, y, z, rb * 1.15, 0xffe0a8, 0.3);
  }
  let k = 0;
  for (let t = 0.07; t < 0.95; t += 0.062, k++) {
    const [x0, z0] = slotPoint(t), [dx, dz] = dir(t), s = k % 2 ? 1 : -1, wide = Math.abs(t - 0.56) < 0.08 ? 1.9 : 1;
    const x = x0 - dz * s * 4.3 * wide, z = z0 + dx * s * 4.3 * wide, y = w.h(x, z);
    w.mesh(BOX, M(x, y + 0.9, z, 0.1, 1.9, 0.1), WOOD2, "std"); w.mesh(T.oct, M(x, y + 2.0, z, 0.2, 0.26, 0.2), 0xffb04a, "glow"); w.pool(x, y, z, 3.2, 0xffb060, 0.22);
    const cxx = x0 + dz * s * 3.9 * wide, czz = z0 - dx * s * 3.9 * wide, cy = w.h(cxx, czz);
    if (k % 2 === 0) for (let i = 0; i < 3; i++) w.mesh(T.rock[(k + i) % 4], M(cxx, cy + 0.15 + i * 0.36, czz, 0.5 - i * 0.13, 0.24, 0.46 - i * 0.12, 0, r() * 360, 0), [0xd98a58, 0xf0c79a, 0xc9703f][i], "std:rock");
  }
}

// ── 유적: 디딤단, 빛나는 바닥 문양, 부러진 기둥, 화로, 문에 건 휘장, 이끼 ──
function ruinsDetail(w, S) {
  const [x0, z0] = flat("ruins"), y = w.h(x0, z0), R = local(w, x0, z0, 0, y), r = w.rand, ST = 0xe2cfa8, ST2 = 0xc9b48c, RUNE = 0x3fb8e8;
  R.c(0, -0.9, 0, 17.4, 1.03, 0xb5a07c, { g: T.disc }); R.c(0, -0.9, 0, 19.6, 0.94, 0xa08c6a, { g: T.disc });
  for (const [ri, ro] of [[5.3, 5.5], [13.5, 13.75]]) { const g = new THREE.RingGeometry(ri, ro, 40); g.rotateX(-Math.PI / 2); w.mesh(g, M(x0, y + 0.33, z0), RUNE, "glow"); }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3, A = R.sub(Math.cos(a) * 8.2, 0, Math.sin(a) * 8.2, -a / DEG);
    A.b(0, 0.3, 0, 5.0, 0.035, 0.14, RUNE, { mat: "glow" }); A.o(2.9, 0.34, 0, 0.22, RUNE); A.b(1.2, 0.3, 0, 0.14, 0.035, 0.9, RUNE, { mat: "glow" });
    // 바닥 판석과 기둥 밑동의 이끼
    A.b(-0.4, 0.3, 1.5, 2.2, 0.03, 1.6, i % 2 ? 0xd8c59c : 0xbfa980, { ry: 8 });
    if (i % 3 !== 1) w.mesh(T.puff[i % 2], M(x0 + Math.cos(a + 0.09) * 12.9, y + 0.5, z0 + Math.sin(a + 0.09) * 12.9, 0.9, 0.5, 0.8, 0, i * 50, 0), 0x5f9a44, "foliage");
    if (i % 4 === 2) for (let k = 0; k < 4; k++) w.mesh(T.puff[k % 2], M(x0 + Math.cos(a - 0.085) * 12, y + 1.6 + k * 1.7, z0 + Math.sin(a - 0.085) * 12, 0.75, 0.9, 0.75, 0, k * 70, 0), k % 2 ? 0x4f8a3c : 0x6aa34a, "foliage");
  }
  // 바깥 고리: 부러진 기둥과 넘어진 기둥 토막, 화로 (통과 구간인 동서남북 축은 비운다)
  for (let q = 0; q < 4; q++) {
    const a0 = q * Math.PI / 2 + Math.PI / 4, bx = x0 + Math.cos(a0) * 16.6, bz = z0 + Math.sin(a0) * 16.6;
    w.mesh(T.hex, M(bx, y, bz, 0.62, 1.3, 0.62), ST2, "std"); w.mesh(T.hex, M(bx, y + 1.3, bz, 0.9, 0.45, 0.9), 0x4a3f38, "std");
    w.col.addCapsule(V3(bx, y, bz), V3(bx, y + 1.5, bz), 0.6); S.flames.push([bx, y + 1.75, bz, 1.1]); w.pool(bx, y, bz, 6, 0xff9a4a, 0.4);
    for (const s of [-1, 1]) {
      const a = a0 + s * 0.2, px = x0 + Math.cos(a) * 20, pz = z0 + Math.sin(a) * 20, py = w.h(px, pz), h = 0.9 + r() * 1.6;
      w.mesh(T.col8, M(px, py - 0.2, pz, 0.95, h + 0.2, 0.95), s > 0 ? ST : ST2, "std:concrete"); w.mesh(T.col8, M(px, py + h, pz, 0.8, 0.5, 0.8, 8 * s, 0, 6), ST2, "std:concrete");
      w.col.addCapsule(V3(px, py, pz), V3(px, py + h, pz), 0.9);
    }
    const a = a0 - 0.05, px = x0 + Math.cos(a) * 22.6, pz = z0 + Math.sin(a) * 22.6, py = w.h(px, pz);
    for (let k = 0; k < 2; k++) w.mesh(T.rod, M(px + k * 2.1 * Math.sin(a0), py + 0.8, pz - k * 2.1 * Math.cos(a0), 0.95, 1.7, 0.95, 0, -a0 / DEG + 90 + k * 14, 90), k ? ST : ST2, "std:concrete");
    w.col.addSphere(V3(px, py + 0.7, pz), 1);
  }
  // 호수 쪽 문: 갓돌·장식·휘장
  R.b(19, 16, 0, 4.4, 0.5, 16.2, ST); for (let k = -3; k <= 3; k++) R.b(19, 14.2, k * 1.9, 3.85, 0.5, 0.6, ST);
  for (const s of [-1, 1]) {
    R.b(19, -1, s * 5, 3.6, 1.6, 3.6, ST2); R.b(19, 13, s * 5, 3.5, 0.6, 3.5, ST2);
    for (const e of [-1, 1]) { R.b(19 + e * 1.62, 5.4, s * 5, 0.06, 6.6, 1.7, 0x9a2f2a, { mat: "foliage" }); R.b(19 + e * 1.66, 5.4, s * 5, 0.05, 0.5, 1.7, 0xe0b23a, { mat: "foliage" }); R.b(19 + e * 1.66, 9.4, s * 5, 0.05, 1.0, 1.0, 0xe0b23a, { mat: "foliage" }); }
  }
  for (const k of [-2.4, 0, 2.4]) for (const e of [-1, 1]) w.mesh(T.oct, M(x0 + 19 + e * 1.84, y + 15, z0 + k, 0.08, 0.5, 0.5), RUNE, "glow");
  for (let k = 0; k < 2; k++) R.b(15.9 + k * 1.3, -0.25, (k - 0.5) * 0.6, 1.1, 0.3, 2.6, k ? 0xd8c59c : 0xbfa980, { ry: 6 - k * 10 });
}

// ── 감시소·통신탑: 현관·굴뚝·장작, 순찰 트럭, 풍속계, 장비함, 꼭대기 경광등 ──
function rangerDetail(w, S) {
  const [x0, z0] = flat("ranger"), y = w.h(x0, z0), G = local(w, x0, z0, 0, y);
  G.b(11.2, 0, 2.94, 1.0, 2.1, 0.08, 0x3a2a1c); G.b(9, 0, 2.0, 8.4, 0.25, 1.9, WOOD); G.b(9, 2.95, 1.8, 8.8, 0.12, 2.4, 0x3d6b4f, { rx: 9 });
  for (const du of [-3.9, 0, 3.9]) G.b(9 + du, 0.25, 1.15, 0.16, 2.7, 0.16, WOOD2);
  G.b(7.2, 0.25, 1.6, 1.6, 0.45, 0.5, WOOD); G.c(12.4, 0.25, 1.7, 0.4, 0.95, 0x3f6f9a, { mat: "paint" });
  G.b(6.2, 3.4, 7.4, 0.7, 2.8, 0.7, 0x8f8a80); G.b(6.2, 6.2, 7.4, 0.9, 0.14, 0.9, 0x6a655d); S.smoke.push([x0 + 6.2, y + 6.6, z0 + 7.4, 8, 3, 1, 0.65, 7, 0xb9b4ac, 3]);
  pile(G, 13.9, 6.4, 0.2, 1.4, 0xb08a5a, 4, 0, false);
  for (const s of [-1, 1]) G.b(9 + s * 4.02, 1.3, 6, 0.06, 0.9, 1.3, WARM, { mat: "glow" });
  car(G.sub(13, 0, -6.5, 32), 0x3d6b4f, true); S.keep(x0 + 13, z0 - 6.5, 5);
  flagpole(G, 4.2, 0.6, 6.5, 0x35b06a, 0);
  signpost(G, 15.5, 1.5, -20);
  // 통신탑 밑동의 장비함·울타리, 버팀줄 앵커
  G.b(3.4, 0, -3.2, 1.6, 1.8, 1.0, 0x8f9aa6, { mat: "paint", ry: 20, col: true }); G.b(3.4, 1.8, -3.2, 1.8, 0.1, 1.2, DARK, { ry: 20 }); G.b(2.9, 0.9, -2.72, 0.5, 0.5, 0.04, 0xe0b23a, { ry: 20, mat: "paint" });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 3, gx = x0 + Math.cos(a) * 26, gz = z0 + Math.sin(a) * 26; w.mesh(BOX, M(gx, w.h(gx, gz) + 0.2, gz, 1.5, 0.9, 1.5, 0, -a / DEG, 0), 0xbdb6a6, "std"); }
  w.mesh(T.hex, M(x0, y + 56, z0, 1.5, 0.2, 1.5), DARK, "std"); S.blink.push([x0, y + 64.4, z0, 0.32]);
  for (const [dy, a] of [[50, 1.6], [34, 4.2]]) w.mesh(BOX, M(x0 + Math.cos(a) * 1.5, y + dy, z0 + Math.sin(a) * 1.5, 0.3, 2.2, 0.7, 0, -a / DEG, 0), 0xf2f0ea, "paint");
  // 풍속계 (컵이 돈다)
  G.b(3, 0, 11, 0.1, 4.2, 0.1, 0xdadada, { mat: "paint" }); G.cap(3, 0, 11, 4.2, 0.1); G.b(3, 3.3, 11, 0.5, 0.4, 0.3, 0xf2f0ea, { mat: "paint" });
  const parts = [[new THREE.BoxGeometry(0.12, 0.2, 0.12), null, DARK]];
  for (let i = 0; i < 3; i++) { const a = i * 120; parts.push([new THREE.BoxGeometry(0.62, 0.05, 0.05), M(0, 0, 0, 1, 1, 1, 0, a, 0).multiply(M(0.31, 0, 0)), DARK], [new THREE.OctahedronGeometry(0.15, 0), M(0, 0, 0, 1, 1, 1, 0, a, 0).multiply(M(0.66, 0, 0)), 0xe94f37]); }
  const an = prop(w, parts, "paint", false); an.position.set(x0 + 3, y + 4.3, z0 + 11);
  w.rider(an, [[0, 0, 0, 0.7, 0.15, 0.7]]);
  w.updaters.push((dt) => { an.rotation.y -= dt * 4.2; });
}

// ── 전망대: 사다리, 처마 등, 깃발, 밑동의 짐 ──
function towerDetail(w) {
  const [tx, tz] = flat("tower"), y = w.h(tx, tz), L = local(w, tx, tz, 0, y);
  for (const dz of [-0.28, 0.28]) L.b(4.3, 0, 3.6 + dz, 0.08, 13.2, 0.08, WOOD2);
  for (let yy = 0.5; yy < 13; yy += 0.55) L.b(4.3, yy, 3.6, 0.06, 0.06, 0.56, WOOD);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { L.b(a * 4.55, 15.2, b * 4.55, 0.04, 0.9, 0.04, DARK); L.o(a * 4.55, 15.0, b * 4.55, 0.22, 0xffb04a); }
  L.b(0, 18.6, 0, 0.1, 3.4, 0.1, 0xdadada, { mat: "paint" }); L.b(0.8, 20.9, 0, 1.5, 0.9, 0.04, 0xffc23a, { mat: "foliage" });
  crates(L, 6.4, -6.2, 15); signpost(L, -6.5, 6.5, 40); L.b(-6.2, 0, -5.8, 1.9, 0.45, 0.5, WOOD, { ry: 40 });
  L.c(7.6, 0, 5.4, 0.42, 1.0, 0x8a623c); L.c(7.6, 1.0, 5.4, 0.36, 0.05, DARK);
}

// ── 다리: 돌다리의 물가름·쐐기돌·담쟁이, 흔들다리의 기도 깃발 ──
function bridgeDetail(w) {
  const z0 = -4, F = local(w, riverX(z0), z0, 46), ST = 0xc9b79c, ST2 = 0xae9c84, r = w.rand;
  for (const s of [-1, 1]) {
    F.b(0, 6.3, s * 2.36, 1.3, 1.5, 0.22, 0xe0d2b8); for (const u of [-8.6, 8.6]) F.c(u, -2, s * 2.7, 0.9, 8.4, ST2, { g: T.hex });
    for (let u = -18; u <= 18; u += 6) F.b(u, 8.9, s * 2.5, 0.7, 0.3, 0.6, ST);
    for (let k = 0; k < 5; k++) { const u = -16 + r() * 32, sz = 0.6 + r() * 0.6; w.mesh(T.puff[k % 2], M(F.X(u, s * 2.75), 8.2 - r() * 1.4, F.Z(u, s * 2.75), sz, sz * 1.3, sz * 0.6, 0, 46, 0), k % 2 ? 0x4f8a3c : 0x6aa34a, "foliage"); }
    signpost(local(w, F.X(s * 38, 3), F.Z(s * 38, 3), 46, F.h(s * 38, 3)), 0, 0, 90);
  }
  // 흔들다리 (z=-70): canyon.js 와 같은 방법으로 양 끝을 찾는다
  const bz = -70, cx = riverX(bz), y = 27;
  let xl = cx, xr = cx;
  while (w.h(xl, bz) < y - 0.5 && xl > cx - 120) xl -= 1;
  while (w.h(xr, bz) < y - 0.5 && xr < cx + 120) xr += 1;
  xl -= 2; xr += 2;
  const span = xr - xl, n = Math.round(span / 0.9), yAt = (t) => y + 0.4 - 2.6 * 4 * t * (1 - t);
  for (let i = 1; i < n; i++) { const t = i / n; w.mesh(BOX, M(xl + span * t, yAt(t) + 0.98, bz + 1.34, 0.46, 0.4, 0.03), FLAGS[i % 5], "foliage"); }
  for (const x of [xl, xr]) for (const s of [-1.3, 1.3]) w.mesh(T.oct, M(x, y + 2.65, bz + s, 0.2, 0.26, 0.2), 0xffb04a, "glow");
}

// ── 호수: 닻을 내린 돛단배(흔들린다), 물길 부표, 연잎, 보트 창고 손질 ──
function lakeDetail(w) {
  const r = w.rand, bx = LAKE.x - 52, bz = LAKE.z + 2;
  const parts = [
    [new THREE.BoxGeometry(1.8, 0.8, 5.2), M(0, 0.25, 0), 0xf2f0ea], [new THREE.BoxGeometry(1.86, 0.22, 5.26), M(0, 0.5, 0), 0x2f6fb0], [new THREE.BoxGeometry(1.1, 0.5, 1.5), M(0, 0.9, -0.9), 0xe9e7e0],
    [new THREE.ConeGeometry(0.9, 1.6, 4), M(0, 0.25, 3.4, 1, 1, 0.45, 90, 0, 0), 0xf2f0ea], [new THREE.BoxGeometry(0.12, 6.4, 0.12), M(0, 3.8, 0.5), 0x8a623c], [new THREE.BoxGeometry(0.08, 0.08, 3), M(0, 1.5, -1), 0x8a623c],
  ];
  const tri = (pts, c) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...pts, ...pts.slice(0, 3), ...pts.slice(6, 9), ...pts.slice(3, 6)], 3)); g.computeVertexNormals(); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); parts.push([g, null, c]); };
  tri([0.02, 1.7, 0.36, 0.02, 6.8, 0.36, 0.02, 1.7, -2.5], 0xfff2d8); tri([0.02, 1.4, 0.66, 0.02, 5.6, 0.62, 0.02, 1.0, 2.9], 0xe94f37);
  const boat = prop(w, parts);
  w.rider(boat, [[0, 0.3, 0.2, 0.9, 0.5, 2.9], [0, 3.8, 0.1, 0.1, 3.1, 1.6]]);
  w.updaters.push((dt, t) => { boat.position.set(bx + Math.sin(t * 0.07) * 1.5, 0.08 + Math.sin(t * 1.1) * 0.06, bz + Math.cos(t * 0.09) * 1.2); boat.rotation.set(Math.sin(t * 0.8) * 0.03, 0.7 + Math.sin(t * 0.11) * 0.4, Math.sin(t * 0.95) * 0.05); });
  // 물길 부표
  [[-18, -232, 0], [-42, -226, 1], [-52, -258, 1], [-28, -256, 0], [-32, -291, 1], [-10, -271, 0], [2, -297, 1]].forEach(([x, z, k]) => {
    w.mesh(T.hex, M(x, -0.15, z, 0.5, 0.75, 0.5), k ? 0x2f9a5a : 0xd9432f, "paint"); w.mesh(T.cone5, M(x, 0.6, z, 0.36, 0.7, 0.36), 0xf2f0ea, "paint"); w.mesh(T.oct, M(x, 1.42, z, 0.12, 0.16, 0.12), k ? 0x7affa0 : 0xff6a4a, "glow");
  });
  // 연잎 (얕은 가장자리)
  for (let i = 0, n = 0; i < 400 && n < 26; i++) {
    const a = r() * 6.283, d = 0.72 + r() * 0.2, x = LAKE.x + Math.cos(a) * LAKE.rx * d, z = LAKE.z + Math.sin(a) * LAKE.rz * d, y = w.h(x, z), s = 0.45 + r() * 0.5;
    if (y > -0.5 || y < -3.2 || lakeE(x, z) > 0.98) continue;
    w.mesh(T.hex, M(x, 0.03, z, s, 0.04, s, 0, r() * 60, 0), n % 3 ? 0x4f9a4a : 0x6fb85a, "std"); if (n % 4 === 0) w.mesh(T.oct, M(x, 0.2, z, 0.15, 0.13, 0.15), 0xf7a8c8, "paint");
    n++;
  }
  // 보트 창고와 뭍에 올린 배
  const [cx, cz] = flat("camp2"), px = cx + 14;
  let z0 = cz - 12; while (w.h(px, z0) > 0.7 && z0 > cz - 40) z0 -= 1;
  const B = local(w, px + 8, z0 + 2, 0, 0.6);
  B.b(-3.54, 0, 0, 0.08, 2.3, 2.6, 0x2a4f72); B.b(-3.56, 1.1, 0, 0.06, 0.12, 2.6, 0xf2f0ea); B.b(0, 1.5, -4.03, 1.6, 0.9, 0.06, WARM, { mat: "glow" }); B.b(0, 1.36, -4.08, 1.9, 0.12, 0.12, 0xf2f0ea);
  B.c(-3.6, 2.9, 2.6, 0.42, 0.14, 0xff7a1a, { g: T.rod, rz: 90, mat: "paint" }); B.c(-3.64, 2.9, 2.6, 0.22, 0.14, 0xf2f0ea, { g: T.rod, rz: 90, mat: "paint" });
  B.b(-3.3, 0.2, -5.2, 0.12, 2.4, 0.12, WOOD2); B.o(-3.3, 2.75, -5.2, 0.2);
  crates(local(w, px + 4.4, z0 + 9, 0, w.h(px + 4.4, z0 + 9)), 0, 0, 25);
  const ux = LAKE.x - 40, uz = LAKE.z - 25;
  w.mesh(BOX, M(ux, Math.max(0.2, w.h(ux, uz) + 0.3), uz, 1.4, 0.6, 3.8, 0, 35, 12), 0xffc23a, "paint");
}

// ── 풍력 단지와 송전선: 터빈 밑동, 변압기, 광산까지 이어지는 전봇대 ──
function powerDetail(w, S, turbines) {
  for (const [x, z] of turbines) {
    const y = w.h(x, z);
    w.mesh(T.disc, M(x, y - 0.4, z, 3.2, 0.6, 3.2), 0xbdb6a6, "std"); w.mesh(BOX, M(x - 1.72, y + 1.2, z, 0.1, 2.1, 1.0, 0, 0, 0), 0x8f9aa6, "paint");
    w.box(x + 4.6, y - 0.2, z + 2.6, 1.8, 1.9, 1.4, 0x3d6b4f, { mat: "paint", ao: false }); w.mesh(BOX, M(x + 4.6, y + 1.0, z + 1.88, 0.5, 0.5, 0.04), 0xe0b23a, "paint");
    for (let k = 0; k < 4; k++) w.mesh(BOX, M(x + 3.9 + (k % 2) * 1.4, y + 1.9, z + 2.3 + (k >> 1) * 0.6, 0.14, 0.4, 0.14), 0xdadada, "paint");
  }
  const P = [[258, -64], [280, -10], [292, 44], [286, 100], [268, 146], [246, 182], [236, 196]];
  let prev = null;
  P.forEach(([x, z], i) => {
    const y = w.h(x, z), h = 9.5, n = P[Math.min(P.length - 1, i + 1)], b = P[Math.max(0, i - 1)], yaw = Math.atan2(-(n[1] - b[1]), n[0] - b[0]) / DEG + 90;
    const L = local(w, x, z, yaw, y);
    L.c(0, -0.4, 0, 0.2, h + 0.4, WOOD2, { g: T.hex }); L.cap(0, 0, 0, h, 0.2); L.b(0, h - 1, 0, 2.8, 0.16, 0.16, WOOD2); L.beam(-1, h - 1, 0, 0, h - 2.2, 0, 0.1, WOOD2); L.beam(1, h - 1, 0, 0, h - 2.2, 0, 0.1, WOOD2);
    const tips = [-1.25, 0, 1.25].map((u) => { L.c(u, h - 0.92, 0, 0.09, 0.3, 0x9ad0c8, { g: T.hex, mat: "paint" }); return L.P(u, h - 0.6 + (u ? 0 : 0.9), 0); });
    L.b(0, h - 1, 0, 0.12, 1.9, 0.12, WOOD2);
    if (i === P.length - 1) { L.b(1.6, 0, 1.2, 2, 2.2, 1.5, 0x6d7683, { mat: "paint", col: true }); L.b(1.6, 2.2, 1.2, 2.2, 0.12, 1.7, DARK); }
    if (prev) for (let k = 0; k < 3; k++) {                                                   // 처진 전선 (꺾은선 넷) + 충돌은 직선 하나
      const a = prev[k], c = tips[k];
      for (let j = 0; j < 4; j++) { const t0 = j / 4, t1 = (j + 1) / 4, sag = (t) => 1.3 * 4 * t * (1 - t); beam(w, [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0 - sag(t0), a[2] + (c[2] - a[2]) * t0], [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1 - sag(t1), a[2] + (c[2] - a[2]) * t1], 0.05, 0x22262c, { col: false, mat: "std" }); }
      w.col.addCapsule(V3(a[0], a[1] - 0.6, a[2]), V3(c[0], c[1] - 0.6, c[2]), 0.3);
    }
    prev = tips; S.keep(x, z, 3.5);
  });
}

// ── 길: 강변 오솔길의 디딤돌·표지, 버기 길의 돌탑과 깃발 ──
function trailDetail(w, S, runner, buggy) {
  const r = w.rand, pts = runner.slice(0, 10);
  let acc = 0, k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[2] - a[2]), nx = -(b[2] - a[2]) / l, nz = (b[0] - a[0]) / l;
    for (; acc < l; acc += 2.8, k++) {
      const t = acc / l, x = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.9, z = a[2] + (b[2] - a[2]) * t + (r() - 0.5) * 0.9, y = w.h(x, z);
      if (y < 0.7) continue;
      w.mesh(T.slab[k % 2], M(x, y + 0.02, z, 0.62 + r() * 0.3, 0.1, 0.5 + r() * 0.25, 0, r() * 360, 0), k % 3 ? 0xd9c9a4 : 0xc2ae88, "std");
      if (k % 13 === 6) {                                                                     // 길가 표지 말뚝과 작은 등
        const s = k % 2 ? 1 : -1, px = x + nx * s * 2.6, pz = z + nz * s * 2.6, py = w.h(px, pz);
        w.mesh(BOX, M(px, py + 0.6, pz, 0.16, 1.4, 0.16), WOOD2, "std"); w.mesh(BOX, M(px, py + 1.15, pz, 0.2, 0.22, 0.2), 0xff7a1a, "paint"); w.mesh(T.oct, M(px, py + 1.5, pz, 0.14, 0.18, 0.14), 0xffb04a, "glow");
      }
    }
    acc -= l;
  }
  // 쉼터 두 곳 (암석 아치가 보이는 곳, 초지 한가운데)
  for (const [zz, off] of [[122, 30], [46, 24]]) {
    const x = riverX(zz) + off, y = w.h(x, zz), L = local(w, x, zz, 70, y);
    L.b(0, 0.4, 0, 2.2, 0.1, 0.55, WOOD); L.b(0, 0.55, -0.3, 2.2, 0.55, 0.08, WOOD); for (const s of [-0.9, 0.9]) L.b(s, 0, 0, 0.12, 0.42, 0.5, WOOD2);
    signpost(L, 2.2, -0.4, 10); L.b(-2, 0, -0.2, 0.12, 2.5, 0.12, WOOD2); L.o(-2, 2.65, -0.2, 0.2); S.keep(x, zz, 3);
  }
  // 버기 길: 굽이마다 돌탑과 주황 깃발
  const loop = new THREE.CatmullRomCurve3(buggy.map((p) => V3(p[0], 0, p[2])), true, "centripetal"), N = 26, tan = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const p = loop.getPointAt(i / N); loop.getTangentAt(i / N, tan);
    const s = i % 2 ? 1 : -1, x = p.x - tan.z * s * 6.5, z = p.z + tan.x * s * 6.5, y = w.h(x, z);
    if (Math.abs(w.h(x + 1, z) - w.h(x - 1, z)) > 1.2) continue;
    for (let j = 0; j < 3; j++) w.mesh(T.rock[(i + j) % 4], M(x, y + 0.2 + j * 0.42, z, 0.62 - j * 0.16, 0.3, 0.56 - j * 0.14, 0, r() * 360, 0), [0xc98a5a, 0xd98a58, 0xf0c79a][j], "std:rock");
    w.mesh(BOX, M(x, y + 1.9, z, 0.06, 1.6, 0.06), WOOD2, "std"); w.mesh(BOX, M(x + 0.32, y + 2.45, z, 0.6, 0.4, 0.03), 0xff6a1a, "foliage");
  }
}

// ── 원경: 지형 끝 너머의 고원 띠와 먼 뷰트 (충돌 없음, 안개에 잠긴다) ──
function farRing(w) {
  const r = w.rand, tiers = [[0, 0.42, 1, 0xb85f38], [0.42, 0.74, 0.93, 0xd98a58], [0.74, 1, 0.86, 0xe9b98a]];
  const mesa = (x, z, rad, rad2, top, yaw, cap) => {
    for (const [a, b, k, c] of tiers) w.mesh(T.taper, M(x, -3 + (top + 3) * a, z, rad * k, (top + 3) * (b - a), rad2 * k, 0, yaw, 0), c, "std");
    w.mesh(T.taper, M(x, top, z, rad * 0.62, 2.2, rad2 * 0.62, 0, yaw, 0), cap, "std");
  };
  const N = 26;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + 0.07, off = Math.abs(Math.cos(a)) > 0.985 ? 1 : 0;      // 강이 빠져나가는 남북 끝은 한 칸 뒤로
    const d = 668 + r() * 70 + off * 190, x = Math.sin(a) * d, z = Math.cos(a) * d;
    mesa(x, z, 118 + r() * 40, 78 + r() * 34, 66 + r() * 34, a / DEG, dryness(x) > 0.5 ? 0xdba768 : 0x8fae4c);
  }
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * Math.PI * 2 + 0.3 + r() * 0.2, d = 860 + r() * 190, x = Math.sin(a) * d, z = Math.cos(a) * d, rad = 44 + r() * 52;
    mesa(x, z, rad, rad * (0.8 + r() * 0.6), 150 + r() * 95, r() * 180, 0xf0d6ab);
    if (i % 3 === 0) { const sx = x + rad * 1.5 * Math.cos(a), sz = z - rad * 1.5 * Math.sin(a); for (const [k, c] of [[0, 0xb85f38], [1, 0xd98a58], [2, 0xe9b98a]]) w.mesh(T.taper, M(sx, -3 + k * 46, sz, 15 - k * 3.4, 46, 15 - k * 3.4, 0, k * 40, 0), c, "std"); w.mesh(T.rock[i % 4], M(sx, 138, sz, 13, 7, 13), 0xc9703f, "std"); }
  }
}

// ── 작은 움직임: 연기·물안개(인스턴스 하나), 불꽃(인스턴스 하나), 경광등(메시 하나) ──
function finishFx(w, S) {
  const list = [];
  for (const [x, y, z, rise, dx, dz, size, per, color, n] of S.smoke) for (let i = 0; i < n; i++) list.push({ x, y, z, rise, dx, dz, size, per, ph: i / n + list.length * 0.137, color });
  if (list.length) {
    const im = new THREE.InstancedMesh(T.puff[0], new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false }), list.length), c = new THREE.Color();
    list.forEach((a, i) => im.setColorAt(i, c.set(a.color)));
    im.frustumCulled = false; im.renderOrder = 4; im.castShadow = false;
    w.scene.add(im);
    w.updaters.push((dt, t) => {
      for (let i = 0; i < list.length; i++) {
        const a = list[i], u = (t / a.per + a.ph) % 1, sc = a.size * (0.35 + u * 1.1) * Math.min(1, u * 7) * Math.min(1, (1 - u) * 3);
        _m.compose(_p.set(a.x + a.dx * u * u + Math.sin(t * 0.6 + i) * 0.5 * u, a.y + a.rise * u, a.z + a.dz * u * u), _q.identity(), _s.set(sc, sc * 0.85, sc));
        im.setMatrixAt(i, _m);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
  if (S.flames.length) {
    const g = merged([[T.cone5, null, 0xffa23a], [T.cone5, M(0.12, 0, 0.08, 0.6, 0.7, 0.6), 0xffd86a]]);
    const im = new THREE.InstancedMesh(g, mat(w, "glow"), S.flames.length), F = S.flames;
    im.frustumCulled = false; im.castShadow = false;
    w.scene.add(im);
    w.updaters.push((dt, t) => {
      for (let i = 0; i < F.length; i++) {
        const f = F[i], k = f[3], hy = 0.85 + 0.3 * Math.sin(t * 9 + i * 2.1) + 0.14 * Math.sin(t * 23 + i);
        _m.compose(_p.set(f[0] + Math.sin(t * 6 + i) * 0.04, f[1], f[2]), _q.identity(), _s.set(0.5 * k * (1 + 0.1 * Math.sin(t * 7 + i)), 1.35 * k * hy, 0.5 * k));
        im.setMatrixAt(i, _m);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
  if (S.blink.length) {
    const b = prop(w, S.blink.map(([x, y, z, rr]) => [T.oct, M(x, y, z, rr, rr * 1.2, rr), 0xff3030]), "glow", false);
    w.updaters.push((dt, t) => { b.visible = t % 1.7 < 0.85; });
  }
}

// 구조물 디테일을 만든다(식생을 심기 전에 호출). 돌려주는 함수는 식생 뒤에 불러 절벽·고원을 꾸민다
export function detail(w, K, KEEP, o) {
  templates(K);
  const S = { smoke: [], flames: [], blink: [], keep: (x, z, r) => KEEP.push([x, z, r]) };
  damDetail(w, S);
  o.camps.forEach(([x, z, ry], i) => campDetail(w, S, x, z, ry, i === 0));
  mineDetail(w, S);
  fallsDetail(w, S);
  slotDetail(w);
  ruinsDetail(w, S);
  rangerDetail(w, S);
  towerDetail(w);
  bridgeDetail(w);
  lakeDetail(w);
  powerDetail(w, S, o.turbines);
  trailDetail(w, S, o.runner, o.buggy);
  farRing(w);
  finishFx(w, S);
  return (clear, slope) => wild(w, clear, slope);
}

// ── 절벽과 고원의 자잘한 것들: 벼랑 턱의 덤불과 암반, 선인장, 유카, 떠내려온 통나무, 회전초 ──
function wild(w, clear, slope) {
  const r = w.rand, H = (x, z) => w.h(x, z);
  const scatter = (count, tries, R, fn) => { let n = 0; for (let i = 0; i < tries && n < count; i++) if (fn((r() * 2 - 1) * R, (r() * 2 - 1) * R)) n++; };
  const nearCanyon = (x, z) => Math.abs(x - riverX(z)) < 125 || lakeE(x, z) < 1.6;
  // 벼랑 턱에 붙은 덤불
  scatter(300, 14000, 330, (x, z) => {
    const y = H(x, z), s = slope(x, z);
    if (y < 5 || s < 0.75 || s > 2.4 || !nearCanyon(x, z) || !clear(x, z, -3)) return false;
    const dry = dryness(x) > 0.5, c = dry ? [0x8a9a4a, 0xa9a24e, 0x6f8a3c][(r() * 3) | 0] : [0x3f7a44, 0x4f8a3c, 0x6aa34a][(r() * 3) | 0], sz = 0.9 + r() * 1.3;
    w.mesh(T.puff[(r() * 2) | 0], M(x, y + sz * 0.25, z, sz, sz * 0.7, sz, 0, r() * 360, 0), c, "foliage");
    if (r() < 0.5) w.mesh(T.puff[0], M(x + (r() - 0.5) * 2, y + sz * 0.1, z + (r() - 0.5) * 2, sz * 0.7, sz * 0.5, sz * 0.7, 0, r() * 360, 0), c, "foliage");
    return true;
  });
  // 절벽에서 삐져나온 암반 턱
  scatter(90, 9000, 330, (x, z) => {
    const y = H(x, z), s = slope(x, z);
    if (y < 6 || s < 1.0 || s > 3 || !nearCanyon(x, z) || !clear(x, z, -2)) return false;
    const gx = H(x + 2, z) - H(x - 2, z), gz = H(x, z + 2) - H(x, z - 2);
    w.mesh(T.slab[(r() * 2) | 0], M(x, y - 0.5, z, 1.8 + r() * 1.8, 0.5 + r() * 0.5, 1.3 + r() * 1.2, 0, Math.atan2(-gz, gx) / DEG + 90 + (r() - 0.5) * 30, 0), [0xe9b98a, 0xc9703f, 0xd98a58, 0xf0c79a][(r() * 4) | 0], "std:rock");
    return true;
  });
  // 동쪽 고원의 선인장
  scatter(64, 6000, 320, (x, z) => {
    const y = H(x, z);
    if (y < 30 || dryness(x) < 0.62 || slope(x, z) > 0.28 || !clear(x, z, 1)) return false;
    const h = 3.2 + r() * 3, c = r() < 0.5 ? 0x4f8a4a : 0x5a9a58, yaw = r() * 360, L = local(w, x, z, yaw, y - 0.2);
    L.c(0, 0, 0, 0.4, h, c, { g: T.hex }); L.c(0, h, 0, 0.4, 0.36, c, { g: T.cone5 });
    for (const s of [-1, 1]) if (r() < 0.72) { const ay = h * (0.34 + r() * 0.22), ah = 1 + r() * 1.5; L.c(s * 0.3, ay, 0, 0.26, 0.85, c, { g: T.hex, rz: -s * 90 }); L.c(s * 1.12, ay - 0.26, 0, 0.27, ah, c, { g: T.hex }); L.c(s * 1.12, ay - 0.26 + ah, 0, 0.27, 0.25, c, { g: T.cone5 }); }
    w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.45);
    return true;
  });
  // 유카·용설란 포기
  scatter(170, 6000, 320, (x, z) => {
    const y = H(x, z);
    if (y < 30 || dryness(x) < 0.45 || slope(x, z) > 0.5 || !clear(x, z, -3)) return false;
    const s = 0.7 + r() * 0.7, c = r() < 0.5 ? 0x7a9a5a : 0x9aa860, a0 = r() * 360;
    for (let i = 0; i < 5; i++) w.mesh(T.blade, M(x, y - 0.05, z, 0.16 * s, 1.5 * s, 0.16 * s, 38 + r() * 20, a0 + i * 72, 0), c, "foliage");
    w.mesh(T.blade, M(x, y, z, 0.14 * s, 1.7 * s, 0.14 * s), c, "foliage");
    if (r() < 0.3) { w.mesh(BOX, M(x, y + 1.4 * s, z, 0.06, 2.4 * s, 0.06), 0x9a8a5a, "std"); w.mesh(T.puff[0], M(x, y + 2.7 * s, z, 0.3 * s, 0.6 * s, 0.3 * s), 0xfff2d8, "foliage"); }
    return true;
  });
  // 강가에 걸린 유목
  scatter(14, 4000, 280, (x, z) => {
    const y = H(x, z), d = Math.abs(x - riverX(z));
    if (y < 0.3 || y > 1.6 || d < 11 || d > 26 || !clear(x, z, -3)) return false;
    w.mesh(T.rod, M(x, y + 0.2, z, 0.24, 3 + r() * 2.5, 0.24, 0, r() * 360, 86 + r() * 8), 0xb9a58c, "std");
    return true;
  });
  // 풍력 단지 평지를 굴러가는 회전초
  const TW = [[4, 3.4, 0], [14, 4.4, 0.3], [24, 3.0, 0.6], [34, 5.0, 0.1], [57, 3.8, 0.8]], x0 = 242, span = 58;
  const g = new THREE.IcosahedronGeometry(1, 1), im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xb09a62, flatShading: true }), TW.length);
  im.frustumCulled = false; im.castShadow = true;
  w.scene.add(im);
  TW.forEach((_, i) => w.rider([im, i], [[0, 0, 0, 0.45, 0.45, 0.45]]));
  w.updaters.push((dt, t) => {
    for (let i = 0; i < TW.length; i++) {
      const [z, sp, ph] = TW[i], u = ((t * sp) / span + ph) % 1, x = x0 + u * span, zz = z + Math.sin(u * 9 + i) * 2.5, sc = 0.62 * Math.min(1, u * 12, (1 - u) * 12);
      _e.set(0, 0, -(t * sp) / 0.6);
      _m.compose(_p.set(x, w.h(x, zz) + 0.55 + Math.abs(Math.sin(t * sp * 0.8 + i)) * 0.5, zz), _q.setFromEuler(_e), _s.set(sc, sc, sc));
      im.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true;
  });
}
