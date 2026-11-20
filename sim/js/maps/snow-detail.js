// 설국 산장 디테일: 눈 결 텍스처, 지면 그림(스키 자국·발자국·바퀴 자국·얼음 금), 눈 더미·바위 턱,
// 마을 거리 소품, 스키장·호수·정상 소품, 굴뚝 연기와 깃발 같은 작은 움직임, 원경 능선
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop } from "./canyon-kit.js";
import { LAKE, POND, PISTE, GORGE, CREV, ROAD, PLOUGH_CP, flat, lakeE, gorgeAt, crevAt, forest } from "./snow-terrain.js";
import { SNOW, SNOW_SH, ICE, ICE_D, STONE, STONE_D, TIMBER, TIMBER_D, WARM, PRISM, PYR, FAN, CHALETS, garland, roof } from "./snow-kit.js";
import { SITE } from "./snow-places.js";

const DEG = Math.PI / 180, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const STEEL = 0x59606a, RED = 0xd9432f, BLUE = 0x2f6fb0, YEL = 0xffc23a, GREEN = 0x35b06a, DARK = 0x23262e, ORANGE = 0xff7a1a, SKIN = 0xf2c9a0;
export const COATS = [RED, BLUE, YEL, GREEN, 0xb44cff, 0xff7ad0, 0x2a9d8f, 0xf2f0ea];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// 저폴리 템플릿 (기본 도형의 구·원통은 삼각형이 많아 소품에는 이것을 쓴다)
const up = (g) => { g.translate(0, 0.5, 0); g.computeBoundingBox(); return g; };
export const OCT = new THREE.OctahedronGeometry(1, 0), ICO = new THREE.IcosahedronGeometry(1, 0);
export const CYL6 = up(new THREE.CylinderGeometry(1, 1, 1, 6)), CYL8 = up(new THREE.CylinderGeometry(1, 1, 1, 8)), TAPER = up(new THREE.CylinderGeometry(0.55, 1, 1, 6));
export const CONE5 = up(new THREE.ConeGeometry(1, 1, 5));
export const WHEEL = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); g.rotateZ(Math.PI / 2); g.computeBoundingBox(); return g; })();   // 축이 x
for (const g of [OCT, ICO]) g.computeBoundingBox();

// ── 눈 결 텍스처: 바람결(사스트루기) 곡선과 반짝임. 지형의 평지 텍스처(흙·조약돌) 대신 쓴다 ──
function snowTexture() {
  const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d");
  g.fillStyle = "rgb(243,238,225)"; g.fillRect(0, 0, S, S);
  g.lineCap = "round";
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    let s = 4711;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.save(); g.translate(ox * S, oy * S);
    // 넓고 옅은 얼룩
    for (let i = 0; i < 9; i++) { const x = r() * S, y = r() * S, rx = 60 + r() * 80; g.fillStyle = i % 2 ? "rgba(255,251,240,0.5)" : "rgba(226,226,222,0.4)"; g.beginPath(); g.ellipse(x, y, rx, rx * 0.45, 0.25, 0, 7); g.fill(); }
    // 바람결: 한쪽으로 누운 초승달 그늘 + 위쪽 가장자리의 밝은 능선
    for (let i = 0; i < 30; i++) {
      const x = r() * S, y = r() * S, l = 50 + r() * 120, b = 5 + r() * 9, wd = 3 + r() * 5, a = 0.2 + (r() - 0.5) * 0.25;
      g.save(); g.translate(x, y); g.rotate(a);
      g.strokeStyle = "rgba(214,216,214,0.75)"; g.lineWidth = wd; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l / 2, -b, l, 0); g.stroke();
      g.strokeStyle = "rgba(255,252,242,0.9)"; g.lineWidth = Math.max(1.5, wd * 0.45); g.beginPath(); g.moveTo(2, -wd * 0.7); g.quadraticCurveTo(l / 2, -b - wd * 0.7, l - 2, -wd * 0.7); g.stroke();
      g.restore();
    }
    // 반짝임
    g.fillStyle = "rgba(255,255,250,0.95)";
    for (let i = 0; i < 46; i++) { const x = r() * S, y = r() * S, k = 1.5 + r() * 1.5; g.fillRect(x - k, y - 0.6, k * 2, 1.2); g.fillRect(x - 0.6, y - k, 1.2, k * 2); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// 방금 만든 지형 메시의 평지 텍스처 유니폼을 눈 결 텍스처로 바꿔 끼운다
export function snowGround(w) {
  const mesh = w.scene.children[w.scene.children.length - 1], m = mesh && mesh.isMesh && mesh.material;
  if (!m || typeof m.onBeforeCompile !== "function" || typeof document === "undefined") return;
  const tex = snowTexture(), base = m.onBeforeCompile;
  w.disposables.push(tex);
  m.onBeforeCompile = function (sh, r) { base.call(this, sh, r); if (sh.uniforms && sh.uniforms.tFlat) sh.uniforms.tFlat.value = tex; };
}

// ── 회전 좌표계 + 저폴리 소품 도구 (충돌은 기본으로 없다) ──
export function local(w, cx, cz, ry = 0, y0 = null) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), X = (u, v) => cx + u * c + v * s, Z = (u, v) => cz - u * s + v * c;
  if (y0 === null) y0 = w.h(cx, cz);
  const L = {
    w, X, Z, ry, y0,
    b: (u, y, v, su, sy, sv, color, o = {}) => w.box(X(u, v), y0 + y, Z(u, v), su, sy, sv, color, { col: false, ...o, ry: ry + (o.ry || 0) }),
    m: (geo, u, y, v, sx, sy, sz, color, mat = "std", yaw = 0, rx = 0, rz = 0) => w.mesh(geo, M(X(u, v), y0 + y, Z(u, v), sx, sy, sz, rx, ry + yaw, rz), color, mat),
    beam: (u1, y1, v1, u2, y2, v2, t, color, o = {}) => beam(w, [X(u1, v1), y0 + y1, Z(u1, v1)], [X(u2, v2), y0 + y2, Z(u2, v2)], t, color, { col: false, ...o }),
    post: (u, y, v, h, r, color, mat = "paint") => w.mesh(CYL6, M(X(u, v), y0 + y, Z(u, v), r, h, r), color, mat),
    bulb: (u, y, v, r, color = WARM) => w.mesh(OCT, M(X(u, v), y0 + y, Z(u, v), r, r, r), color, "glow"),
    at: (u, v, yaw = 0) => local(w, X(u, v), Z(u, v), ry + yaw),          // 지면 높이에 맞춘 하위 좌표계
    sub: (u, y, v, yaw = 0) => local(w, X(u, v), Z(u, v), ry + yaw, y0 + y),
  };
  return L;
}
// 사람(서 있는 인형, 약 1.8m). sit 이면 앉은 자세
export function person(L, u, v, yaw = 0, coat = RED, o = {}) {
  const P = L.sub(u, o.y || 0, v, yaw), sit = o.sit ? 0.42 : 0, hat = o.hat ?? coat;
  if (sit) P.b(0, 0.42, -0.25, 0.42, 0.26, 0.6, 0x2a3340, { ao: false }); else P.b(0, 0, 0, 0.42, 0.82, 0.3, 0x2a3340, { ao: false });
  P.b(0, 0.82 - sit * 0.35, 0, 0.52, 0.8, 0.34, coat, { ao: false, mat: "paint" });
  P.m(ICO, 0, 1.84 - sit * 0.35, 0, 0.21, 0.23, 0.21, SKIN, "paint");
  P.b(0, 1.95 - sit * 0.35, 0, 0.44, 0.17, 0.44, hat, { ao: false, mat: "paint" });
  if (o.ski) for (const s of [-0.16, 0.16]) P.b(s, 0, -0.1, 0.11, 0.05, 1.7, o.ski, { ao: false, mat: "paint" });
  if (o.arm) P.b(0.34, 1.3, -0.1, 0.14, 0.7, 0.14, coat, { ao: false, mat: "paint", rx: -50 });
  return P;
}
export function bench(L, u, v, yaw = 0, color = TIMBER) {
  const B = L.at(u, v, yaw);
  B.b(0, 0.42, 0, 1.9, 0.1, 0.5, color, { mat: "std:wood", tile: 2, ao: false }); B.b(0, 0.6, 0.24, 1.9, 0.5, 0.08, color, { mat: "std:wood", tile: 2, ao: false });
  for (const s of [-0.8, 0.8]) B.b(s, 0, 0, 0.1, 0.44, 0.46, DARK, { ao: false });
  B.b(0, 1.1, 0.24, 1.94, 0.1, 0.16, SNOW, { ao: false });
  return B;
}
export const barrel = (L, u, v, color = 0x8a5a34, s = 1) => { L.m(CYL8, u, 0, v, 0.36 * s, 0.9 * s, 0.36 * s, color, "std"); L.m(CYL8, u, 0.9 * s, v, 0.38 * s, 0.1, 0.38 * s, SNOW, "std"); };
export const crate = (L, u, v, s = 0.8, yaw = 0, color = 0xb98a4a, y = 0) => { L.b(u, y, v, s, s, s, color, { mat: "std:wood", tile: 1.2, ry: yaw }); L.b(u, y + s, v, s * 1.04, 0.1, s * 1.04, SNOW, { ry: yaw, ao: false }); };
// 화분에 심은 작은 전나무(전구 장식)
export function potFir(L, u, v, s = 1, lights = true) {
  L.m(TAPER, u, 0.5 * s, v, 0.42 * s, -0.5 * s, 0.42 * s, 0x8d4a3a, "std");
  for (let i = 0; i < 2; i++) { L.m(FAN, u, (0.45 + i * 0.75) * s, v, (0.8 - i * 0.28) * s, (1.3 - i * 0.2) * s, (0.8 - i * 0.28) * s, 0x1f5a3a, "foliage", i * 40); L.m(FAN, u, (0.95 + i * 0.75) * s, v, (0.5 - i * 0.2) * s, (0.8 - i * 0.2) * s, (0.5 - i * 0.2) * s, SNOW, "foliage", i * 40 + 20); }
  if (lights) for (let k = 0; k < 4; k++) { const a = k * 1.7; L.bulb(u + Math.cos(a) * 0.5 * s, (0.75 + k * 0.28) * s, v + Math.sin(a) * 0.5 * s, 0.08, [0xff5a4a, 0xffd23a, 0x4ad0ff, 0x6aff8a][k]); }
}
// 등불 기둥
export function lantern(L, u, v, h = 2.6, color = WARM) { L.post(u, -0.2, v, h + 0.2, 0.07, DARK); L.b(u, h, v, 0.34, 0.42, 0.34, color, { mat: "glow" }); L.m(PYR, u, h + 0.42, v, 0.3, 0.22, 0.3, DARK, "paint"); }
// 표지판: 기둥 + 판자 화살표 n 개
export function signpost(L, u, v, yaw = 0, colors = [YEL, 0xf2f0ea, BLUE]) {
  const P = L.at(u, v, yaw);
  P.post(0, -0.2, 0, 3.2, 0.08, TIMBER_D, "std");
  colors.forEach((c, i) => P.b(i % 2 ? -0.5 : 0.5, 2.5 - i * 0.42, 0, 1.3, 0.3, 0.06, c, { mat: "paint", ao: false, ry: i * 28 }));
  P.b(0, 3, 0, 0.3, 0.12, 0.3, SNOW, { ao: false });
}
// 깃대와 바람에 흔들리는 깃발(나뭇잎 재질의 바람을 빌린다)
export function flagpole(L, u, v, h, color, o = {}) {
  const x = L.X(u, v), z = L.Z(u, v), y = o.y ?? L.w.h(x, z), yaw = (o.yaw ?? 20) * DEG, fw = o.fw || 2.2, fh = o.fh || 1.3;
  L.w.mesh(CYL6, M(x, y - 0.3, z, 0.07, h + 0.3, 0.07), 0xdfe3e8, "paint"); L.w.mesh(OCT, M(x, y + h + 0.1, z, 0.14, 0.14, 0.14), YEL, "paint");
  for (let i = 0; i < 3; i++) { const d = (i + 0.5) * fw / 3; L.w.box(x + Math.cos(yaw) * d, y + h - fh - 0.1, z - Math.sin(yaw) * d, fw / 3 + 0.02, fh, 0.05, i === 1 && o.mid ? o.mid : color, { mat: "foliage", col: false, ao: false, ry: yaw / DEG }); }
  if (o.col) L.w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 0.12);
}
// 삼각 깃발 줄(바람에 살랑인다)
export function bunting(w, a, b, sag = 0.6, n = 8, colors = [RED, YEL, BLUE, 0xf2f0ea, GREEN]) {
  let prev = a;
  const yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]) / DEG;
  for (let i = 1; i <= n; i++) {
    const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    beam(w, prev, p, 0.04, 0x2a2f38, { col: false });
    w.mesh(PRISM, M((prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2, (prev[2] + p[2]) / 2, 0.3, 0.62, 0.04, 0, yaw, 180), colors[i % colors.length], "foliage");
    prev = p;
  }
}
// 나무 울타리(지형을 따라간다)
export function fence(w, x1, z1, x2, z2, color = TIMBER_D, hgt = 1.1, step = 2.6) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / step));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n, y = w.h(x, z);
    w.mesh(CYL6, M(x, y - 0.3, z, 0.08, hgt + 0.4, 0.08), color, "std"); w.mesh(OCT, M(x, y + hgt + 0.14, z, 0.14, 0.1, 0.14), SNOW, "std");
    if (prev) for (const k of [0.45, 0.9]) beam(w, [prev[0], prev[1] + hgt * k, prev[2]], [x, y + hgt * k, z], 0.09, color, { col: false, mat: "std" });
    prev = [x, y, z];
  }
}

// ── 지면 그림: 지형을 따라 깔리는 얇은 면들을 한 메시로 모은다 ──
export function decals(w) {
  const pos = [], col = [], idx = [], c = new THREE.Color(), H = (x, z) => w.h(x, z);
  const vert = (x, y, z) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
  const D = {
    // 띠: pts [[x, z], ...] 를 따라 폭 wd
    ribbon(pts, wd, color, up = 0.08, closed = false) {
      c.set(color);
      const n = pts.length; let a0 = -1, b0 = -1, fa = -1, fb = -1;
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], o = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)];
        let dx = q[0] - o[0], dz = q[1] - o[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const k = (p[2] ?? 1) * wd / 2, ax = p[0] - dz * k, az = p[1] + dx * k, bx = p[0] + dz * k, bz = p[1] - dx * k;
        const a = vert(ax, H(ax, az) + up, az), b = vert(bx, H(bx, bz) + up, bz);
        if (a0 >= 0) idx.push(a0, a, b0, b0, a, b); else { fa = a; fb = b; }
        a0 = a; b0 = b;
      }
      if (closed && n > 2) idx.push(a0, fa, b0, b0, fa, fb);
    },
    // 원판·고리(타원 가능)
    disc(x, z, r, color, up = 0.08, o = {}) {
      c.set(color);
      const n = o.n || 14, r0 = o.r0 || 0, kz = o.kz || 1, rot = (o.ry || 0) * DEG, cs = Math.cos(rot), sn = Math.sin(rot), wob = o.wob || 0;
      const P = (rr, a) => { const k = 1 + wob * Math.sin(a * 3 + x) + wob * 0.6 * Math.sin(a * 5 + z), u = Math.cos(a) * rr * k, v = Math.sin(a) * rr * kz * k, px = x + u * cs + v * sn, pz = z - u * sn + v * cs; return vert(px, H(px, pz) + up, pz); };
      if (r0 > 0) { let pa = -1, pb = -1, fa = -1, fb = -1; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, ia = P(r0, a), ib = P(r, a); if (pa >= 0) idx.push(pa, ia, pb, pb, ia, ib); else { fa = ia; fb = ib; } pa = ia; pb = ib; } idx.push(pa, fa, pb, pb, fa, fb); }
      else { const ctr = vert(x, H(x, z) + up, z); let first = -1, prev = -1; for (let i = 0; i < n; i++) { const v = P(r, (i / n) * Math.PI * 2); if (prev >= 0) idx.push(ctr, v, prev); else first = v; prev = v; } idx.push(ctr, first, prev); }
    },
    // 네모(가운데 x,z, 크기 sx×sz, 회전 ry)
    quad(x, z, sx, sz, ry, color, up = 0.08) {
      c.set(color);
      const cs = Math.cos(ry * DEG), sn = Math.sin(ry * DEG), v = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const u = a * sx / 2, t = b * sz / 2, px = x + u * cs + t * sn, pz = z - u * sn + t * cs; return vert(px, H(px, pz) + up, pz); });
      idx.push(v[0], v[2], v[1], v[0], v[3], v[2]);
    },
    // 발자국 줄
    steps(pts, color = 0xb7c8de, stride = 0.8, up = 0.08) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(l / stride), dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l, ry = Math.atan2(dx, dz) / DEG;
        for (let k = 0; k < n; k++) { const s = (k % 2 ? 1 : -1) * 0.17, t = k * stride; D.quad(a[0] + dx * t - dz * s, a[1] + dz * t + dx * s, 0.22, 0.42, ry, color, up); }
      }
    },
    finish() {
      if (!idx.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = w.material("std"); m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2;
      const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.castShadow = false; w.scene.add(mesh); w.disposables.push(g, m);
    },
  };
  return D;
}
// 조절점 [x,z][] 을 부드럽게 잘게 나눈다(약 step m 간격)
export function spline(cp, step = 2, closed = false) {
  const curve = new THREE.CatmullRomCurve3(cp.map((p) => V3(p[0], 0, p[1])), closed, "centripetal");
  return curve.getSpacedPoints(Math.max(2, Math.round(curve.getLength() / step))).slice(0, closed ? -1 : undefined).map((v) => [v.x, v.z]);
}
export const lineAt = (L, t, off) => { const p = L.point(t), d = L.dir(t); return [p[0] - d[1] * off, p[1] + d[0] * off]; };

// ── 지면 그림 ──
export function groundPaint(w, D) {
  const r = w.rand, H = (x, z) => w.h(x, z), TRACK = 0xbdd0e8, RUT = 0xb3c1d4;
  // 슬로프의 스키 자국: 구불구불한 카빙 선
  for (let k = 0; k < 8; k++) {
    const base = -11 + k * 3.1 + (r() - 0.5), amp = 2 + r() * 3.5, lam = 0.035 + r() * 0.03, ph = r() * 6, t0 = 0.03 + r() * 0.08, t1 = 0.86 + r() * 0.1, pts = [];
    for (let t = t0; t < t1; t += 0.0065) { const off = Math.max(-13.5, Math.min(13.5, base * (1 - 0.35 * Math.max(0, t - 0.75) / 0.25) + amp * Math.sin(t / lam + ph))); pts.push(lineAt(PISTE, t, off)); }
    D.ribbon(pts, k % 4 === 3 ? 0.8 : 0.42, k % 3 ? TRACK : 0xcbdaee, 0.1);
  }
  // 설상차가 다진 줄무늬(슬로프 가장자리)
  for (const off of [12.6, 14.6]) { const pts = []; for (let t = 0.48; t < 0.9; t += 0.008) pts.push(lineAt(PISTE, t, off)); D.ribbon(pts, 0.7, 0xc3d2e6, 0.1); }
  // 산비탈의 자유 활강 자국: 비탈을 따라 흘러내린다
  for (const [sx, sz, ph] of [[-34, -206, 0], [-52, -190, 2], [42, -214, 1], [60, -196, 4], [-196, -92, 3], [-216, -70, 5], [-176, -60, 1], [236, -26, 2], [222, -4, 0], [-66, -128, 3], [118, -196, 5], [96, -150, 2]]) {
    let x = sx, z = sz; const pts = [];
    for (let i = 0; i < 110; i++) {
      const y = H(x, z), gx = (H(x + 2, z) - H(x - 2, z)) / 4, gz = (H(x, z + 2) - H(x, z - 2)) / 4, g = Math.hypot(gx, gz);
      if (g < 0.05 || g > 0.85 || y < 3 || gorgeAt(x, z)[0] > 0.03 || crevAt(x, z)[0] > 0.02) break;
      const dx = -gx / g, dz = -gz / g, sw = Math.sin(i * 0.33 + ph) * 0.8;
      pts.push([x, z]); x += (dx - dz * sw) * 2.2; z += (dz + dx * sw) * 2.2;
    }
    if (pts.length > 8) { D.ribbon(pts, 0.5, TRACK, 0.11); D.ribbon(pts.map((p, i) => [p[0] + 0.9 + Math.sin(i * 0.4) * 0.6, p[1] + 0.7]), 0.4, 0xc6d6ea, 0.11); }
  }
  // 눈길의 바퀴(스노모빌) 자국
  { const pts = ROAD.pts; for (const off of [-1.1, 1.1]) D.ribbon(pts.map((p, i) => { const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], l = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1; return [p[0] - (q[1] - o[1]) / l * off, p[1] + (q[0] - o[0]) / l * off]; }), 0.5, RUT, 0.09); }
  // 마을 길: 제설차가 민 길(다져진 눈) + 가운데 바퀴 자국
  {
    const pts = spline(PLOUGH_CP, 2.5, true);
    D.ribbon(pts, 7.4, 0xd3dce8, 0.06, true); D.ribbon(pts, 6.2, 0xc7d1de, 0.075, true);
    for (const off of [-1.5, 1.5]) D.ribbon(pts.map((p, i) => { const q = pts[(i + 1) % pts.length], o = pts[(i + pts.length - 1) % pts.length], l = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1; return [p[0] - (q[1] - o[1]) / l * off, p[1] + (q[0] - o[0]) / l * off]; }), 0.55, 0xb2bfd0, 0.09, true);
  }
  // 광장 바닥: 트리를 두른 돌 포장 고리
  { const { x, z } = SITE.tree; D.disc(x, z, 17.4, 0xbcc4cf, 0.06, { n: 28 }); D.disc(x, z, 16.6, 0x98a2b2, 0.075, { n: 28, r0: 15.9 }); D.disc(x, z, 9.4, 0x98a2b2, 0.075, { n: 24, r0: 8.7 }); D.disc(x, z, 8.7, 0xdfe6ee, 0.07, { n: 24 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; D.ribbon([[x + Math.cos(a) * 9.4, z + Math.sin(a) * 9.4], [x + Math.cos(a) * 15.9, z + Math.sin(a) * 15.9]], 0.3, 0x98a2b2, 0.08); } }
  // 골목·오솔길의 발자국
  const walks = [
    [[36, 178], [30, 180], [24, 179]], [[44, 150], [50, 146], [50, 143.5], [78, 143.2]], [[44, 186], [58, 187.5], [66, 186.5]], [[35, 132], [31, 132]], [[45, 136], [49.5, 136]], [[45, 168], [51, 168]], [[45, 183], [49.5, 183]], [[35, 210], [33.5, 210]],
    [[10, 172], [0, 170], [-2, 180], [-2, 196]], [[-6, 198], [-6, 193]], [[-10, 160], [-12, 150], [-22, 140], [-40, 136], [-50, 140]], [[-50, 142], [-48, 148], [-56, 152], [-66, 156]], [[-20, 136], [-24, 135]],
    [[84, 146], [84, 152], [80, 156]], [[72, 180], [66, 176], [58, 176]], [[104, 172], [112, 174], [117, 176]], [[82, 206], [82, 201], [88, 198]], [[60, 104], [68, 96], [80, 86], [90, 80]], [[52, 76], [60, 80], [74, 74]], [[96, 82], [92, 74], [88, 71]],
    [[-100, 204], [-100, 198]], [[-108, 214], [-104, 208]], [[-112, 184], [-118, 187], [-122, 188]], [[-76, 158], [-84, 160.5]], [[-134, 172], [-128, 172], [-116, 174]], [[-150, 162], [-146, 168], [-142, 170]],
  ];
  for (const p of walks) D.steps(spline(p, 3), 0xb4c5dc, 0.8, 0.1);
  // 들판의 짐승 발자국(작고 촘촘)
  for (const p of [[[-150, 108], [-136, 96], [-120, 100], [-108, 92], [-92, 96]], [[150, 196], [162, 210], [158, 224], [170, 236]], [[-190, 190], [-204, 200], [-216, 196], [-226, 206]], [[0, 96], [-10, 88], [-6, 78], [-18, 70]], [[120, 60], [128, 50], [124, 38]]]) D.steps(spline(p, 3), 0xbccbe0, 0.55, 0.1);
  // ── 호수 얼음: 눈 가장자리, 바람에 쓸린 눈 얼룩, 금, 스케이트 자국 ──
  const inRink = (x, z) => Math.abs(x - SITE.rink.x) < 20 && Math.abs(z - SITE.rink.z) < 12, ell = (a, k) => [LAKE.x + Math.cos(a) * LAKE.rx * k, LAKE.z + Math.sin(a) * LAKE.rz * k];
  D.ribbon(Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * 6.283; return [...ell(a, 0.975 + Math.sin(a * 7) * 0.012), 1 + Math.sin(a * 5 + 1) * 0.5]; }), 3.2, 0xe9f3fb, 0.075, true);
  for (let i = 0, n = 0; i < 400 && n < 34; i++) {
    const a = r() * 6.283, k = Math.sqrt(r()) * 0.9, [x, z] = ell(a, k), rr = 1.4 + r() * 2.4;
    if (inRink(x, z) || Math.abs(k - 0.76) < 0.07 || Math.hypot(x - SITE.huts.x, z - SITE.huts.z) < 12) continue;
    D.disc(x, z, rr, n % 3 ? 0xe6f2fa : 0xf4f9fd, 0.07, { n: 9, kz: 0.28 + r() * 0.22, ry: 14 + r() * 24, wob: 0.14 }); n++;
  }
  for (let i = 0, n = 0; i < 200 && n < 11; i++) {
    let a = r() * 6.283, k = Math.sqrt(r()) * 0.82, [x, z] = ell(a, k), dir = r() * 6.283; const pts = [];
    if (inRink(x, z)) continue;
    for (let s = 0; s < 9 + r() * 12; s++) { if (lakeE(x, z) > 0.93 || inRink(x, z)) break; pts.push([x, z, 0.5 + r() * 1.0]); dir += (r() - 0.5) * 1.3; const l = 2.5 + r() * 4; x += Math.cos(dir) * l; z += Math.sin(dir) * l; }
    if (pts.length < 3) continue;
    D.ribbon(pts, 0.2, 0xf6fcff, 0.085); n++;
    if (pts.length > 5) { const b = pts[(pts.length / 2) | 0], d2 = dir + 1.4; D.ribbon([[b[0], b[1]], [b[0] + Math.cos(d2) * 4, b[1] + Math.sin(d2) * 4], [b[0] + Math.cos(d2 + 0.5) * 8, b[1] + Math.sin(d2 + 0.5) * 8]], 0.14, 0xf6fcff, 0.085); }
  }
  for (const k of [0.745, 0.775]) D.ribbon(Array.from({ length: 64 }, (_, i) => ell((i / 64) * 6.283, k + Math.sin(i * 0.9) * 0.008)), 0.14, 0xeaf6fd, 0.082, true);
  // 빙상장의 스케이트 궤적
  for (const [rx, rz] of [[13, 7], [8, 4.5], [15.5, 8.4]]) D.ribbon(Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * 6.283; return [SITE.rink.x + Math.cos(a) * rx, SITE.rink.z + Math.sin(a) * rz]; }), 0.1, 0xf2fbff, 0.085, true);
  // 얼음 못의 금
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4; D.ribbon([[POND.x + Math.cos(a) * 2, POND.z + Math.sin(a) * 2, 1], [POND.x + Math.cos(a + 0.3) * 6, POND.z + Math.sin(a + 0.3) * 6, 0.8], [POND.x + Math.cos(a + 0.1) * 10.5, POND.z + Math.sin(a + 0.1) * 10.5, 0.4]], 0.18, 0xf6fcff, 0.16); }
  // 얼어붙은 개울 위의 눈 얼룩
  for (let t = 0.14; t < 0.98; t += 0.035) { const p = GORGE.point(t); if (gorgeAt(p[0], p[1])[0] > 0.9) D.disc(p[0] + (r() - 0.5) * 3, p[1] + (r() - 0.5) * 3, 1.2 + r() * 1.6, 0xeef6fc, 0.09, { n: 8, kz: 0.5, ry: r() * 180, wob: 0.15 }); }
}

// ── 넓은 눈밭을 깨는 것들: 바람에 쌓인 눈 더미, 바위 턱 ──
export function wild(w, K, clear, slope) {
  const r = w.rand, H = (x, z) => w.h(x, z), T = K.T;
  const scatter = (count, tries, fn, R = 340) => { let n = 0; for (let i = 0; i < tries && n < count; i++) if (fn((r() * 2 - 1) * R, (r() * 2 - 1) * R)) n++; };
  // 눈 더미(사스트루기): 바람 방향으로 길게 누운 낮은 둔덕
  scatter(240, 7000, (x, z) => {
    const s = slope(x, z);
    if (s > 0.34 || !clear(x, z, -5) || (forest(x, z) > 0.52 && r() < 0.7)) return false;
    const l = 3 + r() * 5.5, hgt = 0.35 + r() * 0.5;
    w.mesh(T.puff[(r() * 2) | 0], M(x, H(x, z) - hgt * 0.25, z, l, hgt, l * (0.3 + r() * 0.2), 0, 20 + r() * 26, 0), r() < 0.5 ? 0xf6f9fd : 0xe2ecf8, "std");
    return true;
  });
  // 바위 턱: 눈 모자를 쓴 어두운 바위 무리(가파른 설면과 능선)
  scatter(52, 6000, (x, z) => {
    const y = H(x, z), s = slope(x, z);
    if (y < 24 || s < 0.24 || s > 0.8 || !clear(x, z, 5)) return false;
    const n = 2 + ((r() * 3) | 0), c0 = [0x6d778c, 0x7d8698, 0x5d667a][(r() * 3) | 0];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, d = i ? 2 + r() * 4 : 0, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, py = H(px, pz), sx = (i ? 1.6 : 2.8) + r() * 2.4, sy = sx * (0.7 + r() * 0.5), ry = r() * 360;
      w.mesh(T.slab[i % 2], M(px, py + sy * 0.2, pz, sx, sy, sx * (0.7 + r() * 0.4), 8, ry, 6), c0, "std:rock");
      w.mesh(T.puff[i % 2], M(px, py + sy * 0.95, pz, sx * 0.82, sy * 0.3, sx * 0.62, 0, ry, 0), SNOW, "std");
      if (!i) w.col.addSphere(V3(px, py + sy * 0.3, pz), sx * 0.75);
    }
    return true;
  });
  // 호숫가의 마른 갈대와 눈 둔덕
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * 6.283 + r() * 0.06, k = 1.03 + r() * 0.07, x = LAKE.x + Math.cos(a) * LAKE.rx * k, z = LAKE.z + Math.sin(a) * LAKE.rz * k;
    if (!clear(x, z, -5) && i % 3) continue;
    if (i % 2) K.reed(x, z, 0.9 + r() * 0.5, r() < 0.5 ? 0xcdb98a : 0xb9a674);
    else w.mesh(T.puff[i % 4 > 1 ? 1 : 0], M(x, H(x, z) - 0.15, z, 1.6 + r() * 1.8, 0.5 + r() * 0.4, 1.2 + r() * 1.2, 0, r() * 360, 0), 0xf6f9fd, "std");
  }
  // 빙하 위의 얼음 탑(세락): 크레바스 가장자리에 푸른 얼음 덩어리
  for (let t = 0.06; t < 0.96; t += 0.045) for (const s of [-1, 1]) {
    if (r() < 0.3) continue;
    const [x, z] = lineAt(CREV, t, s * (15 + r() * 12));
    if (!clear(x, z, 3) || slope(x, z) > 0.6) continue;
    const y = H(x, z), sc = 1.4 + r() * 2.4, ry = r() * 360;
    w.mesh(T.slab[(r() * 2) | 0], M(x, y - sc * 0.3, z, sc, sc * (1.2 + r()), sc * 0.8, 10 * s, ry, 8), r() < 0.5 ? ICE : ICE_D, "paint");
    w.mesh(T.puff[0], M(x, y + sc * (0.75 + r() * 0.3), z, sc * 0.8, sc * 0.3, sc * 0.7, 0, ry, 0), SNOW, "std");
    if (sc > 2.6) w.col.addSphere(V3(x, y + sc * 0.4, z), sc * 0.7);
  }
}
