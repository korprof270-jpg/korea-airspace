// 달 기지 디테일: 구역별 소품·설비·표지·불빛과 작은 움직임 (구조·트랙·임무 좌표는 moon.js 그대로)
//  · 큰 것만 충돌을 주고(ok 로 트랙·피사체·기지·갭·훈련 구역에서 떨어졌는지 확인), 작은 소품은 충돌이 없다
//  · 비행 훈련 구역(x -20..20, z 80..130)에는 바닥 그림 말고는 아무것도 놓지 않는다
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, V3, ring, dome, octa, ball, lattice, WH, WH2, ORG, DK, GREY, GOLD, CYA, AMB, GRN, RED, CONC, NAVY } from "./moon-kit.js";
import { HUB, PADS, LAUNCH, SOLAR, GREEN, PLANT, DISH, OUTPOST, DRIVER, DRIVER_LEN, driverPoint, MINE, roadDist, rillePoint, rilleDir } from "./moon-terrain.js";
import { rgb, g3, curve } from "./moon-ground.js";

const DEG = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); g.translate(0, 0.5, 0); return g; })();
const SPH = new THREE.SphereGeometry(1, 10, 6);
const WHEEL = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); g.rotateZ(Math.PI / 2); return g; })();
const BOWL = (() => { const g = new THREE.SphereGeometry(1, 14, 4, 0, Math.PI * 2, 0, 1.0); g.rotateX(Math.PI); g.translate(0, 1, 0); return g; })();
const WARM = 0xfff0d0, YEL = 0xf0c020, PINK = 0xff5ad0, RUST = 0xb5764a, FOIL = 0xe0b040, BLUE = 0x2f6fb0, VIO = 0xb48cff;
const HAZ = rgb(YEL), WHT = rgb(0xdfe2e8), ORGc = rgb(ORG);

// 가운데 기준 상자 부품 [geo, 행렬, 색, 재질?]
const pb = (sx, sy, sz, x, y, z, c, rx = 0, ry = 0, rz = 0, k) => [BOX, M(x, y, z, sx, sy, sz, rx, ry, rz), c, k];
// 부품 묶음을 정적 배치에 찍는다
function stamp(w, parts, x, z, ry = 0, y = null, key = "paint") {
  const B = M(x, y ?? w.h(x, z), z, 1, 1, 1, 0, ry, 0);
  for (const [g, m, c, k] of parts) w.mesh(g, m ? B.clone().multiply(m) : B, c, k || key);
}
// 돌린 국소 좌표계(로컬 +z 가 ry 방향). b/c 의 y 는 바닥 높이
function frame(w, x, z, ry = 0, y0 = null) {
  const y = y0 ?? w.h(x, z), B = M(x, y, z, 1, 1, 1, 0, ry, 0), q = new THREE.Quaternion().setFromAxisAngle(UP, ry * DEG), m = new THREE.Matrix4();
  const F = {
    x, y, z, ry,
    g(geo, lx, ly, lz, sx, sy, sz, color, key = "paint", rx = 0, r2 = 0, rz = 0) { w.mesh(geo, m.multiplyMatrices(B, M(lx, ly, lz, sx, sy, sz, rx, r2, rz)), color, key); return F; },
    b(lx, ly, lz, sx, sy, sz, color, key, rx, r2, rz) { return F.g(BOX, lx, ly + sy / 2, lz, sx, sy, sz, color, key, rx, r2, rz); },
    c(lx, ly, lz, r, h, color, key, rx, r2, rz) { return F.g(CYL, lx, ly, lz, r, h, r, color, key, rx, r2, rz); },
    s(lx, ly, lz, r, color, key = "paint", sy = 1) { return F.g(SPH, lx, ly, lz, r, r * sy, r, color, key); },
    P(lx, ly, lz) { return V3(lx, ly, lz).applyMatrix4(B); },
    xz(lx, lz) { const p = F.P(lx, 0, lz); return [p.x, p.z]; },
    col(lx, ly, lz, sx, sy, sz) { w.col.addBox(F.P(lx, ly + sy / 2, lz), V3(sx / 2, sy / 2, sz / 2), q); return F; },
    pool(lx, lz, r, color, k) { const p = F.P(lx, 0.1, lz); w.pool(p.x, p.y, p.z, r, color, k); return F; },
  };
  return F;
}

// ── 되풀이 쓰는 소품 ──
function roverParts(c) {
  const parts = [pb(2.2, 0.5, 4.4, 0, 0.9, 0, GREY), pb(2.1, 1.3, 2.2, 0, 1.8, -0.8, WH), pb(2.14, 0.5, 1.2, 0, 2, -1.5, 0x2a4f78), pb(1.9, 0.9, 1.6, 0, 1.6, 1.2, c), pb(0.06, 1.6, 0.06, 0.8, 3.2, 0.2, WH2), pb(2.2, 0.2, 0.3, 0, 1.3, -2.25, AMB)];
  for (const sx of [-1.25, 1.25]) for (const sz of [-1.6, 0, 1.6]) parts.push([WHEEL, M(sx, 0.55, sz, 0.4, 0.55, 0.55), DK]);
  return parts;
}
function truckParts() {
  const parts = [pb(3, 0.8, 7, 0, 1.5, 0, DK), pb(3.3, 1.9, 4.4, 0, 2.85, -1, GOLD), pb(2.9, 0.7, 4, 0, 3.9, -1, RUST), pb(2.4, 1.5, 1.7, 0, 2.65, 2.4, WH), pb(2.44, 0.6, 0.9, 0, 2.95, 2.85, 0x2a4f78), pb(3.1, 0.3, 0.3, 0, 1.6, 3.45, AMB)];
  for (const sx of [-1.7, 1.7]) for (const sz of [-2.3, 0, 2.3]) parts.push([WHEEL, M(sx, 0.95, sz, 0.7, 0.95, 0.95), DK]);
  return parts;
}
function astroParts(suit = WH) {
  return [pb(0.2, 0.8, 0.24, -0.16, 0.4, 0, WH2), pb(0.2, 0.8, 0.24, 0.16, 0.4, 0, WH2), pb(0.62, 0.72, 0.4, 0, 1.14, 0, suit), pb(0.5, 0.74, 0.24, 0, 1.2, -0.3, GREY),
    pb(0.16, 0.6, 0.2, -0.4, 1.14, 0, suit, 10), pb(0.16, 0.6, 0.2, 0.4, 1.14, 0, suit, -10), [SPH, M(0, 1.78, 0, 0.29, 0.29, 0.29), WH], pb(0.38, 0.24, 0.14, 0, 1.78, 0.2, GOLD, 0, 0, 0, "metal"), pb(0.3, 0.12, 0.05, 0, 1.24, 0.21, ORG)];
}
const ASTRO = astroParts(), ASTRO2 = astroParts(0xf2c9a0);
const astro = (w, x, z, ry = 0, y = null, alt = false) => stamp(w, alt ? ASTRO2 : ASTRO, x, z, ry, y);
function crates(w, x, z, ry = 0, c = GOLD) {
  const F = frame(w, x, z, ry);
  F.b(0, 0, 0, 1.2, 1.1, 1.2, c).b(1.3, 0, 0.2, 1, 0.8, 1, WH2, "paint", 0, 20).b(0.2, 1.1, 0.05, 0.8, 0.7, 0.8, ORG, "paint", 0, -15).b(-1.1, 0, 0.9, 0.8, 0.6, 1.4, GREY);
}
function bottles(w, x, z, ry = 0, c = WH2) {
  const F = frame(w, x, z, ry); F.b(0, 0, 0, 2.6, 0.2, 1.1, DK);
  for (let i = 0; i < 4; i++) F.c(-0.9 + i * 0.6, 0.2, 0, 0.26, 1.7, i % 2 ? c : ORG).s(-0.9 + i * 0.6, 1.9, 0, 0.26, GREY);
}
// 투광등 기둥: 기둥 + 기울인 등 + 바닥 빛
function flood(w, x, z, h, ry = 0, color = WARM, col = true) {
  const y = w.h(x, z), dx = Math.sin(ry * DEG), dz = Math.cos(ry * DEG);
  w.pipe(x, y, z, x, y + h, z, 0.14, DK, { col }); w.cyl(x, y, z, 0.5, 0.3, GREY, { col: false, mat: "paint" });
  w.box(x + dx * 0.3, y + h - 0.3, z + dz * 0.3, 2, 0.7, 0.3, color, { mat: "glow", col: false, ry, rx: 28 });
  w.box(x, y + h - 0.45, z, 2.3, 1, 0.3, DK, { col: false, ry, mat: "paint" });
  w.pool(x + dx * h * 0.6, y + 0.1, z + dz * h * 0.6, h * 1.5, color, 0.34); w.shaft(x + dx * h * 0.3, y + h - 0.4, z + dz * h * 0.3, 0.2, h * 0.55, h - 0.4, color, 0.018);
}
// 깃발: 깃대 + 가로대에 걸어 편 깃발(진공이라 펄럭이지 않는다)
function flag(w, x, z, h, ry, c1, c2 = WH, col = false) {
  const F = frame(w, x, z, ry);
  w.pipe(x, F.y, z, x, F.y + h, z, 0.06, WH2, { col }); F.b(0.95, h - 0.12, 0, 1.9, 0.05, 0.05, WH2).b(0.95, h - 1.25, 0, 1.8, 1.15, 0.05, c1).b(0.95, h - 0.9, 0.005, 1.8, 0.3, 0.06, c2);
}
// 바닥에 깔린 배선·배관 트레이. 도로를 만나면 묻혀서 지나간다
function tray(w, pts, o = {}) {
  const L = curve(pts, false, 3.2), wd = o.w || 0.6;
  for (let i = 0; i < L.length - 1; i++) {
    const a = L[i], b = L[i + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / DEG, y = Math.min(w.h(a[0], a[1]), w.h(b[0], b[1]));
    if (roadDist(mx, mz) < 7) { if (roadDist(a[0], a[1]) >= 7 || roadDist(b[0], b[1]) >= 7) w.box(mx, y - 0.1, mz, 1.4, 0.7, wd + 0.9, CONC, { ry, col: false, mat: "std:concrete" }); continue; }
    w.box(mx, y + 0.22, mz, len + 0.05, 0.16, wd, o.color ?? GREY, { ry, col: false, mat: "paint", ao: false });
    if (o.pipe) w.pipe(a[0], y + 0.52, a[1], b[0], y + 0.52, b[1], 0.15, o.pipe, { col: false, mat: "metal" });
    if (i % 2 === 0) w.box(mx, y - 0.05, mz, 0.3, 0.3, wd + 0.4, DK, { ry, col: false });
  }
}
// 작은 접시 안테나 부품 (원점 = 받침 바닥)
function miniDish(R, tilt = 40) {
  return [[CYL, M(0, 0, 0, R * 0.09, R * 0.9, R * 0.09), GREY], pb(R * 0.4, R * 0.24, R * 0.4, 0, R * 0.9, 0, DK), [BOWL, M(0, R * 0.95, 0, R, R * 0.42, R, tilt, 0, 0), WH], [SPH, M(0, R * 0.95 + R * 0.55 * Math.cos(tilt * DEG), R * 0.55 * Math.sin(tilt * DEG), R * 0.1, R * 0.1, R * 0.1), ORG]];
}

// ── 표지판: 글자를 한 장의 캔버스 텍스처에 모아 찍는다 (세운 판·바닥 글씨) ──
const LABELS = ["거주 구역", "착륙장 1", "착륙장 2", "착륙장 3", "발사대", "채굴장", "온실", "태양광 단지", "매스 드라이버", "전파 관측소", "화물 야적장", "차량 정비소", "첫 착륙 기념지", "분사 위험 구역", "관제탑", "월면 기지 고요"];
class Signs {
  constructor(w) { this.w = w; this.p = []; this.u = []; }
  quad(label, c, rx, ux, wd) {   // c: 가운데, rx: 오른쪽 단위 벡터, ux: 위쪽 단위 벡터
    const i = Math.max(0, LABELS.indexOf(label)), u0 = (i % 2) / 2, v0 = 1 - (Math.floor(i / 2) + 1) / 8, hw = wd / 2, hh = wd / 8;
    const pt = (a, b) => [c[0] + rx[0] * a * hw + ux[0] * b * hh, c[1] + rx[1] * a * hw + ux[1] * b * hh, c[2] + rx[2] * a * hw + ux[2] * b * hh];
    const q = [[-1, -1, u0, v0], [1, -1, u0 + 0.5, v0], [1, 1, u0 + 0.5, v0 + 0.125], [-1, -1, u0, v0], [1, 1, u0 + 0.5, v0 + 0.125], [-1, 1, u0, v0 + 0.125]];
    for (const [a, b, u, v] of q) { this.p.push(...pt(a, b)); this.u.push(u, v); }
  }
  // 두 기둥 위에 세운 판 (양면)
  board(label, x, z, ry, wd = 4.4, h = 2.6) {
    const w = this.w, y = w.h(x, z), c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
    w.box(x, y + h - wd / 8 - 0.2, z, wd + 0.4, wd / 4 + 0.4, 0.14, 0x20242c, { ry, col: false, mat: "paint", ao: false });
    w.box(x, y + h + wd / 8 + 0.2, z, wd + 0.5, 0.12, 0.2, ORG, { ry, col: false, mat: "paint", ao: false });
    for (const k of [-1, 1]) w.box(x + c * k * wd * 0.4, y, z - s * k * wd * 0.4, 0.14, h - wd / 8, 0.14, GREY, { col: false, mat: "paint" });
    for (const k of [-1, 1]) this.quad(label, [x + s * 0.09 * k, y + h, z + c * 0.09 * k], [c * k, 0, -s * k], [0, 1, 0], wd);
  }
  // 바닥 글씨 (ry = 0 이면 남쪽에서 북쪽을 보고 읽는다)
  flat(label, x, y, z, ry, wd) { const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG); this.quad(label, [x, y, z], [c, 0, -s], [-s, 0, -c], wd); }
  finish() {
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 1024;
    const g = cv.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    LABELS.forEach((t, i) => {
      const cx = (i % 2) * 512 + 256, cy = Math.floor(i / 2) * 128 + 66; let px = 84;
      do { g.font = `900 ${px}px "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`; px -= 4; } while (g.measureText(t).width > 470 && px > 30);
      g.fillStyle = i === 13 ? "#ffc23a" : "#f4f6fa"; g.fillText(t, cx, cy);
    });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, color: new THREE.Color(0.86, 0.87, 0.9), polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
    m.frustumCulled = false; this.w.scene.add(m); this.w.disposables.push(tex);
  }
}

export function detail(w, K, P, ctx) {
  const skipped = (w.detailSkipped = []), S = new Signs(w), life = [];
  const inBox = (x, z, m = 0) => x > -20 - m && x < 20 + m && z > 74 - m && z < 130 + m;
  // 충돌을 줘도 되는 자리인가
  const ok = (name, x, z, rad = 1.5) => {
    const good = ctx.free(x, z, rad) && !inBox(x, z, rad + 2) && roadDist(x, z) > 8 + rad && !w.gaps.some((g) => Math.hypot(g.pos.x - x, g.pos.z - z) < g.w / 2 + rad + 1.5);
    if (!good) skipped.push(name);
    return good;
  };
  const rover = (name, x, z, ry, c) => { if (!ok(name, x, z, 2.6)) return; stamp(w, roverParts(c), x, z, ry); frame(w, x, z, ry).col(0, 0, 0, 2.6, 2.7, 4.6); };
  const A = { w, K, P, S, ok, rover, life, r: w.rand };
  hub(A); yard(A); motorPool(A); padSites(A); launchSite(A); solarSite(A); greenSite(A); mineSite(A); driverSite(A); dishSite(A); outskirts(A); fieldSites(A); farOutpost(A); sky(A);
  S.finish();
  if (life.length) w.updaters.push((dt, t) => { for (const f of life) f(dt, t); });
}

// ── 거주 구역: 에어록, 승강 통로, 방열판, 창 불빛, 배선 트레이, 깃발, 안내판 ──
function hub({ w, K, P, S, ok, life }) {
  const [hx, hz] = HUB, yc = 9, R = 3.2;
  // 중심 돔의 에어록 터널 (북동·남서 대각)
  for (const ry of [45, 225]) {
    const F = frame(w, hx, hz, ry, 0.3);
    F.b(0, 0, 15, 3.6, 3.2, 5, WH).b(0, 3.2, 15, 4, 0.3, 5.4, ORG).b(0, 0, 17.5, 2.6, 2.9, 0.1, DK).b(0, 0.2, 17.56, 1.7, 2.4, 0.06, CYA, "glow").b(0, -0.3, 18.9, 3.2, 0.3, 2.6, CONC, "std:concrete");
    for (const s of [-1, 1]) F.s(s * 1.55, 2.9, 17.6, 0.16, AMB, "glow").b(s * 1.9, 0, 15, 0.2, 1.2, 3, GREY);
    F.col(0, 0, 15, 3.6, 3.4, 5).pool(0, 21, 7, CYA, 0.3);
    for (const s of [-1.5, 1.5]) P.strip("paint", [F.xz(s, 20.2), F.xz(s, 25)], 0.3, HAZ);
    P.dash("paint", [F.xz(0, 25.5), F.xz(0, 38)], 0.3, WHT, 1.2, 1.2);
    const a = F.P(1.2, 0, 22.5); astro(w, a.x, a.z, ry + 150);
  }
  // 중심 돔 둘째 줄 창과 돔 둘레 고리 도색
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.12; w.box(hx + Math.cos(a) * 10.4, 9.1, hz + Math.sin(a) * 10.4, 1.7, 0.8, 0.5, AMB, { mat: "glow", col: false, ry: -a / DEG + 90, rx: -40 }); }
  { const L = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; L.push([hx + Math.cos(a) * 19.4, hz + Math.sin(a) * 19.4]); } P.dash("paint", L, 0.35, WHT, 2.2, 1.6); }
  // 모듈마다: 한쪽 끝의 승강 통로, 지붕 방열판, 안테나
  [[1, 0], [-1, 0], [0, -1], [0, 1]].forEach(([dx, dz], i) => {
    const cx = hx + dx * 34, cz = hz + dz * 34, ax = dx ? [0, 1] : [1, 0], at = (s) => [cx + ax[0] * s, cz + ax[1] * s], e = i % 2 ? -9 : 9, [ex, ez] = at(e), sg = Math.sign(e);
    w.cyl(ex, 0, ez, 1.15, yc - 2.4, WH2, { mat: "paint" }); w.cyl(ex, 0, ez, 1.5, 0.4, ORG, { col: false, mat: "paint" }); w.cyl(ex, 3.2, ez, 1.2, 0.3, DK, { col: false, mat: "paint" });
    w.box(ex + ax[0] * sg * 1.14, 0.4, ez + ax[1] * sg * 1.14, dx ? 1.2 : 0.12, 2.3, dx ? 0.12 : 1.2, CYA, { mat: "glow", col: false });
    w.box(ex + ax[0] * sg * 2.4, 0, ez + ax[1] * sg * 2.4, dx ? 2.2 : 2.4, 0.2, dx ? 2.4 : 2.2, CONC, { col: false, mat: "std:concrete" });
    w.pool(ex + ax[0] * sg * 3, 0.1, ez + ax[1] * sg * 3, 6, CYA, 0.3);
    for (const s of [-4.4, 4.4]) { const [x, z] = at(s); w.box(x, yc + R - 0.15, z, dx ? 0.12 : 5.2, 2.5, dx ? 5.2 : 0.12, WH2, { col: false, mat: "paint", ao: false }); w.box(x, yc + R + 2.35, z, dx ? 0.2 : 5.4, 0.12, dx ? 5.4 : 0.2, ORG, { col: false, mat: "paint", ao: false }); }
    const [mx, mz] = at(0); w.pipe(mx, yc + R, mz, mx, yc + R + 4.2, mz, 0.05, WH2, { col: false }); K.blink.add(mx, yc + R + 4.3, mz, i % 2 ? CYA : AMB, 0.2, i);
    const [ox, oz] = at(-e * 0.6); astro(w, ox + dx * 5 + ax[0], oz + dz * 5 + ax[1], i * 80, null, i === 2);
  });
  // 작은 돔 두 채: 창 띠와 바깥 에어록
  for (const [x, z, r, ry] of [[hx + 52, hz - 40, 9, 128], [hx - 52, hz + 40, 10, -52]]) {
    const rr = Math.sqrt(r * r - 3.3 * 3.3) - 0.12;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4; w.box(x + Math.cos(a) * rr, 3.2, z + Math.sin(a) * rr, 1.5, 0.8, 0.4, CYA, { mat: "glow", col: false, ry: -a / DEG + 90, rx: -18 }); }
    const F = frame(w, x, z, ry, 0.2);
    F.b(0, 0, r + 0.6, 2.8, 2.7, 3.2, WH).b(0, 2.7, r + 0.6, 3.1, 0.25, 3.5, ORG).b(0, 0.2, r + 2.22, 1.5, 2.1, 0.06, CYA, "glow").col(0, 0, r + 0.6, 2.8, 2.9, 3.2).pool(0, r + 5, 6, CYA, 0.28);
    P.dash("paint", [F.xz(0, r + 3), F.xz(0, r + 12)], 0.3, WHT, 1.2, 1.2);
  }
  // 연료 구 받침 둘레: 위험 표시와 밸브 상자
  for (const z of [hz + 12, hz + 2]) { const L = []; for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; L.push([hx + 50 + Math.cos(a) * 4.6, z + Math.sin(a) * 4.6]); } P.dash("paint", L, 0.3, HAZ, 1.1, 0.8); w.box(hx + 53.6, 0, z, 0.8, 1.2, 1, ORG, { col: false, mat: "paint" }); }
  // 배선·배관 트레이
  tray(w, [[17, -2], [26, 8], [45, 8.5], [46.6, 4]], { pipe: GOLD });
  tray(w, [[134, -96], [120, -80], [96, -66], [60, -62], [24, -57], [11, -50]], { color: 0x5f6672, w: 0.8 });
  tray(w, [[-37, -15], [-62, 5], [-88, 30], [-100, 49]], { pipe: WH2 });
  tray(w, [[-12, -24], [-30, -36], [-38, -44]], { color: 0x5f6672 });
  // 남쪽 광장: 깃발 세 개, 안내판
  [[-2, BLUE, WH], [2, WH, ORG], [6, CYA, WH]].forEach(([x, c1, c2], i) => { if (ok("flag" + i, x, 45.5, 0.3)) { flag(w, x, 45.5, 7, 0, c1, c2, true); w.cyl(x, 0, 45.5, 0.5, 0.25, CONC, { col: false, mat: "std:concrete" }); } });
  P.strip("paint", [[-4.5, 47.6], [8.5, 47.6]], 0.25, WHT); astro(w, 1, 48.6, 200); astro(w, 3.2, 49.4, 150, null, true);
  P.prints(curve([[7.6, 30], [6, 40], [2, 47.5]], false, 1.5)); P.prints(curve([[-9.4, -21], [-22, -4], [-40, 30], [-46, 46]], false, 2));
  S.board("월면 기지 고요", -8.5, 53, 20, 6, 3.4); S.board("거주 구역", 26, 24, -60, 4);
  S.board("관제탑", hx - 31, hz - 46, 60, 3.4, 2.4);
  w.pool(hx - 40, 0.1, hz - 38, 20, AMB, 0.12);
  // 걸어 다니는 우주인 (깃발 앞)
  walker(w, life, [[-6, 50.5], [1, 50], [8, 50.5]], 0);
}

// 통통 뛰며 오가는 우주인. pts 를 왕복한다
function walker(w, life, pts, phase, alt = false) {
  const L = curve(pts, false, 1.2), n = L.length - 1, m = prop(w, alt ? ASTRO2 : ASTRO);
  w.rider(m, [[0, 1, 0, 0.4, 1, 0.3]]);
  life.push((dt, t) => {
    const u = ((t * 0.9 + phase) / n) % 2, f = (u > 1 ? 2 - u : u) * n, i = Math.min(n - 1, f | 0), k = f - i, a = L[i], b = L[i + 1], x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k, hop = Math.abs(Math.sin((t + phase) * 2.6));
    m.position.set(x, w.h(x, z) + hop * 0.5, z); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]) + (u > 1 ? Math.PI : 0);
  });
}

// ── 화물 야적장 (거주 구역 남서): 컨테이너 줄, 문형 크레인, 탱크, 투광등 ──
function yard({ w, K, P, S, ok, rover, life }) {
  const X0 = -65, X1 = -39, Z0 = 47, Z1 = 69.5, cc = [ORG, WH2, BLUE, GOLD, 0x3c9a6a];
  P.dash("paint", [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1], [X0, Z0]], 0.4, HAZ, 2.4, 1.4);
  for (const x of [-56.5, -49.5]) P.strip("paint", [[x, 48.2], [x, 56.5]], 0.2, WHT);
  [[-60, 50], [-53, 50], [-46, 50], [-60, 54], [-53, 54]].forEach(([x, z], i) => {
    if (!ok("yardbox" + i, x, z, 3.2)) return;
    w.container(x, 0, z, 0, cc[i % 5], 6); if (i < 2) w.container(x + 0.3, 2.6, z, 4, cc[(i + 3) % 5], 6);
  });
  // 문형 크레인: 다리 넷 + 주행보 둘 + 오가는 트롤리와 매달린 컨테이너
  const cz0 = 58.6, cz1 = 67.4, cx0 = -62.5, cx1 = -43.5, H = 8.2;
  if (ok("crane", cx0, cz0, 1) && ok("crane", cx1, cz1, 1) && ok("crane", (cx0 + cx1) / 2, (cz0 + cz1) / 2, 6)) {
    for (const x of [cx0, cx1]) { for (const z of [cz0, cz1]) { beam(w, [x, 0, z], [x, H, z], 0.5, YEL); w.box(x, 0, z, 1.1, 0.3, 1.1, DK, { col: false }); } beam(w, [x, H - 1.6, cz0], [x, H - 1.6, cz1], 0.3, YEL, { col: false }); }
    for (const z of [cz0, cz1]) { beam(w, [cx0 - 1, H, z], [cx1 + 1, H, z], 0.6, YEL); K.blink.add(cx0, H + 0.6, z, AMB, 0.25, z > 60 ? 1 : 0); K.blink.add(cx1, H + 0.6, z, AMB, 0.25, z > 60 ? 0 : 1); }
    const span = cz1 - cz0, tro = prop(w, [pb(1, 0.5, span + 1.2, 0, 0.45, 0, DK), pb(1.6, 0.9, 1.8, 0, 0.1, 0, ORG), pb(0.06, 2.5, 0.06, -2, -1.5, 0.8, GREY), pb(0.06, 2.5, 0.06, 2, -1.5, 0.8, GREY), pb(0.06, 2.5, 0.06, -2, -1.5, -0.8, GREY), pb(0.06, 2.5, 0.06, 2, -1.5, -0.8, GREY), pb(6, 2.6, 2.44, 0, -4.05, 0, 0x3c9a6a), pb(6.06, 0.3, 2.5, 0, -3.0, 0, WH2)]);
    w.rider(tro, [[0, 0.45, 0, 0.5, 0.3, span / 2 + 0.6], [0, -4.05, 0, 3, 1.3, 1.22]]);
    life.push((dt, t) => { const u = (t * 0.035) % 2, k = u > 1 ? 2 - u : u, e = k * k * (3 - 2 * k); tro.position.set(cx0 + 3.6 + (cx1 - cx0 - 7.2) * e, H + 0.1, (cz0 + cz1) / 2); });
    stamp(w, [pb(2.4, 0.4, 6.4, 0, 0.9, 0, GREY), ...[-1.3, 1.3].flatMap((sx) => [-2.2, 2.2].map((sz) => [WHEEL, M(sx, 0.55, sz, 0.4, 0.55, 0.55), DK]))], -47.5, 63, 90);
  }
  for (const [x, z, c] of [[-63.4, 61, WH2], [-63.4, 64.6, ORG]]) if (ok("yardtank", x, z, 1.3)) { w.cyl(x, 0, z, 1.25, 2.8, c, { mat: "paint" }); w.sph(x, 2.8, z, 1.25, c, { mat: "paint", col: false, sy: 0.5 }); }
  crates(w, -42.5, 52, 10); crates(w, -41.6, 56.2, 70, BLUE); bottles(w, -44, 48.4, 0);
  if (ok("yardflood", -40.2, 68.4, 0.4)) flood(w, -40.2, 68.4, 9, -120);
  astro(w, -49, 56.6, 60); astro(w, -47.6, 57.4, 250, null, true);
  S.board("화물 야적장", -37.6, 58, 90, 4.4);
  rover("yardrover", -35, 66, 100, GOLD);
}

// ── 차량 정비소 (거주 구역 동쪽): 차고, 세워 둔 로버, 충전기 ──
function motorPool({ w, K, P, S, ok, rover, life }) {
  const x0 = 76, z0 = -5;
  if (!ok("garage", x0, z0, 7)) return;
  w.box(x0, 0, z0, 13, 4.6, 7, WH, { mat: "std:panel", tile: 3 }); w.box(x0, 4.6, z0, 13.6, 0.5, 7.6, ORG, { col: false, mat: "paint" });
  for (const dx of [-4.2, 0, 4.2]) { w.box(x0 + dx, 0.2, z0 + 3.5, 3.3, 3.3, 0.12, 0x3a4250, { col: false, mat: "paint" }); w.box(x0 + dx, 3.6, z0 + 3.55, 3.3, 0.3, 0.1, CYA, { mat: "glow", col: false }); for (const y of [1, 1.9, 2.8]) w.box(x0 + dx, y, z0 + 3.58, 3.3, 0.06, 0.06, GREY, { col: false }); }
  w.pool(x0, 0.1, z0 + 8, 13, CYA, 0.22);
  for (const [i, dx] of [[0, -4.2], [1, 0], [2, 4.2]]) { P.strip("paint", [[x0 + dx - 1.9, z0 + 4.4], [x0 + dx - 1.9, z0 + 11]], 0.18, WHT); if (i === 2) P.strip("paint", [[x0 + dx + 1.9, z0 + 4.4], [x0 + dx + 1.9, z0 + 11]], 0.18, WHT); }
  rover("pool0", x0 - 4.2, z0 + 7.6, 180, ORG); rover("pool1", x0 + 4.2, z0 + 7.9, 172, BLUE);
  for (const dx of [-2.1, 2.1, 6.4]) { w.box(x0 + dx, 0, z0 + 4.6, 0.4, 1.5, 0.4, DK, { col: false, mat: "paint" }); ball(w, x0 + dx, 1.7, z0 + 4.6, 0.2, GRN); }
  // 타이어 더미, 공구 상자, 지붕 접시와 회전 경광등
  for (let i = 0; i < 3; i++) w.mesh(CYL, M(x0 - 8, i * 0.42, z0 + 2.2, 0.6, 0.4, 0.6), DK, "paint");
  crates(w, x0 + 8.4, z0 + 1, 30, ORG); bottles(w, x0 - 8.2, z0 - 1.4, 90);
  stamp(w, miniDish(1.5, 35), x0 - 4, z0 - 1, 200, 4.6);
  beacon(w, life, x0 + 4.5, 5.1, z0, AMB, 0);
  if (ok("poolflood", x0 + 10.5, z0 + 6.5, 0.4)) flood(w, x0 + 10.5, z0 + 6.5, 8, -70);
  astro(w, x0 - 1.6, z0 + 6, 120); S.board("차량 정비소", x0 - 10, z0 + 8, 100, 4.4);
}
// 빙빙 도는 경광등
function beacon(w, life, x, y, z, color, phase) {
  const c = new THREE.Color(color).multiplyScalar(2.2), m = new THREE.Mesh(merged([pb(1.5, 0.22, 0.22, 0, 0.3, 0, 0xffffff), pb(0.36, 0.36, 0.36, 0, 0.3, 0, 0xffffff)]), new THREE.MeshBasicMaterial({ color: c }));
  m.position.set(x, y, z); w.scene.add(m); w.box(x, y, z, 0.5, 0.2, 0.5, DK, { col: false });
  life.push((dt, t) => { m.rotation.y = t * 3 + phase; });
}

// ── 착륙장 둘레: 접근등, 급유 설비, 바닥 글씨, 착륙선 탐사 현장 ──
function padSites({ w, K, P, S, ok, rover, life }) {
  PADS.forEach(([x, z], i) => { S.flat("착륙장 " + (i + 1), x, 0.4, z + 7.2, 0, 5.6); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.39; P.rect("paint", x + Math.cos(a) * 10.6, z + Math.sin(a) * 10.6, 1.6, 0.35, -a / DEG, HAZ, { y: 0.39 }); } });
  // 접근등: 번갈아 깜박이는 줄
  for (const [x, z, dx, dz, c] of [[PADS[0][0], PADS[0][1], 0.98, -0.2, AMB], [PADS[1][0], PADS[1][1], 1, 0.1, AMB], [PADS[2][0], PADS[2][1], -1, 0, CYA]]) for (let k = 0; k < 4; k++) {
    const d = (x === PADS[0][0] ? 24.5 : 14.5) + k * 2.6, px = x + dx * d, pz = z + dz * d;
    w.box(px, 0, pz, 0.2, 1.1, 0.2, DK, { col: false }); K.blink.add(px, 1.25, pz, c, 0.24, k);
  }
  // 1번: 급유 탱크와 카트
  if (ok("bowser", 96, 40, 2.6)) {
    w.pipe(94, 1.5, 40, 98, 1.5, 40, 1.05, WH, { mat: "paint" }); for (const x of [94, 98]) w.sph(x, 1.5, 40, 1.05, ORG, { mat: "paint", col: false });
    for (const x of [94.6, 97.4]) w.box(x, 0, 40, 0.5, 0.6, 2.4, DK, { col: false }); w.pipe(96, 2.5, 40, 96, 3.2, 40, 0.2, GREY, { col: false });
    tray(w, [[93.2, 40.4], [90, 42]], { pipe: GOLD, w: 0.4 }); bottles(w, 96, 43, 0); astro(w, 93.4, 42.6, 250);
  }
  // 2번: 정비 카트 (훈련 구역 밖 동쪽)
  if (ok("cart", 40, 81, 2)) { stamp(w, [pb(1.8, 0.7, 3, 0, 0.9, 0, YEL), pb(1.6, 0.8, 1, 0, 1.6, 0.9, WH2), pb(0.1, 1.4, 0.1, 0.7, 2, -1.2, GREY), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [WHEEL, M(sx, 0.45, sz, 0.3, 0.45, 0.45), DK]))], 40, 81, 40); crates(w, 42.6, 78.4, 0, WH2); astro(w, 41.6, 83, 300, null, true); }
  // 3번: 착륙선 사다리, 실험 장치, 깃발, 발자국
  {
    const [x, z] = PADS[2];
    for (const s of [-0.3, 0.3]) w.pipe(x + s, 4.4, z + 3.2, x + s, 0.5, z + 5.2, 0.04, GREY, { col: false });
    for (let k = 0; k < 5; k++) w.box(x, 0.9 + k * 0.72, z + 4.95 - k * 0.37, 0.6, 0.05, 0.08, GREY, { col: false, ao: false });
    const F = frame(w, -47, 87, 30);
    F.b(0, 0.5, 0, 1.2, 0.8, 1, FOIL, "metal").b(0, 0, 0, 0.1, 0.5, 0.1, GREY).c(1.6, 0, 0.6, 0.5, 0.25, WH2).b(-1.6, 0.7, 0.2, 1.6, 0.06, 1, NAVY, "metal", 30).b(-1.6, 0, 0.2, 0.08, 0.8, 0.08, GREY).c(0.3, 1.3, 0, 0.03, 1.6, WH2).s(0.3, 2.95, 0, 0.12, RED, "glow");
    tray(w, [[-46.4, 86.4], [-40, 83.5]], { w: 0.2, color: FOIL });
    flag(w, -43.5, 71, 4.2, 20, BLUE, WH); astro(w, -45.2, 72.4, 80); astro(w, -45.4, 85.2, 200, null, true);
    P.prints(curve([[x, z + 6], [-39, 86.5], [-45.8, 85.6]], false, 1.5)); P.prints(curve([[x - 1, z + 6], [-42, 80], [-44.6, 72.6]], false, 1.5)); P.prints(curve([[-45, 73.4], [-50, 80], [-46.6, 85.4]], false, 1.5));
    rover("lander-rover", -52, 73, 110, WH2);
  }
  // 걸어 다니는 우주인 (착륙선 ↔ 실험 장치)
  walker(w, life, [[-37, 84.6], [-41, 86.6], [-45, 86.6]], 3, true);
}

// ── 발사대: 투광 삼각대, 갠트리 등, 공급 호스, 증기, 통제 벙커, 출입 금지 도색 ──
function launchSite({ w, K, P, S, ok, rover, life }) {
  const [x0, z0] = LAUNCH, tx = x0 - 15, lh = 62 / 8;
  for (const [x, z] of [[x0 - 19, z0 - 19], [x0 - 19, z0 + 19], [x0 + 16, z0 - 16], [x0 + 16, z0 + 16]]) {
    const ry = Math.atan2(x0 - x, z0 - z) / DEG, F = frame(w, x, z, ry, 0.3);
    for (const a of [0, 120, 240]) beam(w, [x + Math.sin(a * DEG) * 1.1, 0.3, z + Math.cos(a * DEG) * 1.1], [x, 3.1, z], 0.12, DK, { col: false });
    F.b(0, 3, 0, 2.2, 1.1, 0.3, DK).b(0, 3.08, 0.17, 2, 0.95, 0.08, WARM, "glow").pool(5, 8, WARM, 0.3);
  }
  // 갠트리: 층마다 작업등, 중간 경고등, 로켓으로 가는 호스
  for (let lv = 1; lv <= 8; lv++) for (const s of [-1, 1]) w.box(tx - 3.75, 0.3 + lv * lh - 0.6, z0 + s * 3.5, 0.3, 0.3, 0.3, lv % 2 ? WARM : CYA, { mat: "glow", col: false });
  for (const lv of [3, 6]) for (const s of [-1, 1]) K.blink.add(tx - 3.9, 0.3 + lv * lh + 0.4, z0 + s * 3.9, RED, 0.3, lv + (s > 0 ? 1 : 0));
  for (const lv of [3, 5, 7]) w.pipe(tx + 3.5, 0.3 + lv * lh - 1.5, z0 + 1.3, x0 - 3.6, 0.3 + lv * lh - 3.4, z0 + 1, 0.12, DK, { col: false });
  w.box(tx, 0.3 + 62, z0, 8.2, 0.4, 8.2, WH2, { col: false, mat: "paint" }); w.box(tx - 2, 62.7, z0 + 2, 2.4, 1.8, 2.4, 0xd9432f, { col: false, mat: "paint" });
  // 증기: 로켓 옆 배출구와 연료 구 안전밸브에서 뿜었다 흩어진다
  const vg = new THREE.ConeGeometry(1, 1, 9, 1, true); vg.rotateZ(Math.PI / 2); vg.translate(0.5, 0, 0);
  const vent = (x, y, z, ry, rz, len, ph) => {
    const m = new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.86, 1), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(0, ry * DEG, rz * DEG); m.renderOrder = 6; w.scene.add(m);
    life.push((dt, t) => { const c = (t * 0.22 + ph) % 1, k = c < 0.55 ? c / 0.55 : 0; m.visible = k > 0; if (k > 0) { const e = Math.sqrt(k); m.scale.set(len * (0.25 + e), 0.5 + e * len * 0.3, 0.5 + e * len * 0.3); m.material.opacity = 0.34 * (1 - k) * (0.8 + 0.2 * Math.sin(t * 40)); } });
  };
  vent(x0 + 3.7, 22, z0 + 1.4, 0, 12, 9, 0); vent(x0 - 1.2, 40, z0 + 3.7, -90, 8, 7, 0.45); vent(x0 + 32, 10.9, z0 + 10, 0, 90, 6, 0.7);
  w.box(x0 + 3.7, 21.6, z0 + 1.4, 0.3, 0.8, 0.8, DK, { col: false });
  // 바닥 도색: 로켓 둘레 원, 출입 금지 점선, 통로
  { const L = [], L2 = []; for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; L.push([x0 + Math.cos(a) * 16.5, z0 + Math.sin(a) * 16.5]); L2.push([x0 + Math.cos(a) * 39, z0 + Math.sin(a) * 39]); } P.strip("paint", L, 0.35, WHT, { y: 0.35, step: 9 }); P.dash("paint", L2, 0.6, ORGc, 3, 2.4); }
  for (const s of [-1, 1]) P.strip("paint", [[x0 - 22, z0 + s * 2], [x0 - 19.5, z0 + s * 2], [tx - 4.5, z0 + s * 2]], 0.25, WHT, { y: 0.35 });
  S.flat("발사대", x0 - 12, 0.36, z0 + 17.5, 0, 9); S.flat("분사 위험 구역", x0, 0.36, z0 - 19, 180, 10);
  // 작업 구역 소품
  for (const z of [z0 + 13.4, z0 + 16]) { w.mesh(WHEEL, M(x0 - 20, 1.3, z, 0.9, 1, 1), ORG, "paint"); w.mesh(WHEEL, M(x0 - 20, 1.3, z, 1.1, 0.7, 0.7), DK, "paint"); w.box(x0 - 20, 0.3, z, 1.4, 0.3, 1.8, GREY, { col: false }); }
  bottles(w, x0 - 20, z0 - 14, 90); bottles(w, x0 - 20, z0 - 11.6, 90, CYA); crates(w, x0 + 17, z0 + 19.6, 0, WH2); crates(w, x0 - 6, z0 + 20, 40);
  stamp(w, roverParts(YEL), x0 - 20.4, z0 + 7.5, 0, 0.3); frame(w, x0 - 20.4, z0 + 7.5, 0, 0.3).col(0, 0, 0, 2.6, 2.7, 4.6);
  astro(w, x0 - 18, z0 + 10.6, 100, 0.3); astro(w, x0 - 17.2, z0 + 11.6, 240, 0.3, true); astro(w, x0 + 12, z0 - 17, 30, 0.3);
  tray(w, [[157, 62], [147, 71], [143.6, 79]], { color: 0x5f6672 });
  // 발사 통제 벙커 (남동쪽 둔덕 뒤)
  if (ok("bunker", 162, 58, 7)) {
    const F = frame(w, 162, 58, -51);
    F.b(0, -0.4, 0, 13, 3.8, 7.5, CONC, "std:concrete").b(0, 3.4, 0, 13.6, 0.5, 8.1, 0x5a5f68, "std:concrete").b(0, 1.7, 3.78, 9.5, 0.9, 0.1, CYA, "glow").b(0, 1.5, 3.76, 10.1, 1.3, 0.08, DK)
      .b(-5.2, 0, 4.4, 1.6, 2.4, 1.4, CONC, "std:concrete").b(-5.2, 0.2, 5.12, 1, 1.9, 0.06, AMB, "glow").col(0, -0.4, 0, 13, 4.3, 7.5).pool(0, 8, 11, CYA, 0.3);
    for (const [u, v, s] of [[-8, -2, 3.2], [8.2, -1, 2.6], [0, -5.4, 3.6], [5, -5, 2.4]]) { const p = F.P(u, 0, v); w.blob(p.x, p.y + s * 0.3, p.z, s * 1.5, s, s * 1.3, 0x8d8c8a, { mat: "std:rock", grad: [0.6, 1.08], col: false }); }
    const p = F.P(4, 3.9, -1); stamp(w, miniDish(1.6, 50), p.x, p.z, -51 + 180, p.y);
    const q = F.P(-4, 3.9, -2); w.pipe(q.x, q.y, q.z, q.x, q.y + 9, q.z, 0.08, WH2, { col: false }); K.blink.add(q.x, q.y + 9.2, q.z, RED, 0.3, 1);
    const b = F.P(0.5, 3.9, 1.2); beacon(w, life, b.x, b.y, b.z, RED, 1.5);
    const a = F.P(-3, 0, 6.5); astro(w, a.x, a.z, -51 + 20);
  }
  S.board("발사대", 92, 66, 135, 4.4, 3);
}

// ── 태양광 단지: 반사경, 배선, 축전 설비 ──
function solarSite({ w, K, P, S, ok }) {
  const [x0, z0] = SOLAR, tx = 58, tz = -116;
  for (const [R, n, off] of [[12.5, 9, 0.2], [18.5, 12, 0.45]]) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + off; if (Math.cos(a) > 0.52) continue;
    const x = tx + Math.cos(a) * R, z = tz + Math.sin(a) * R, ry = Math.atan2(tx - x, tz - z) / DEG, F = frame(w, x, z, ry);
    F.c(0, 0, 0, 0.1, 1.9, GREY).b(0, 1.3, 0.1, 2.6, 1.8, 0.1, 0xbfd8ff, "metal", -32).b(0, 1.28, 0.04, 2.8, 2, 0.06, WH2, "paint", -32);
  }
  for (const dz of [-19.5, -6.5, 6.5, 19.5]) { w.box(x0, 0, z0 + dz + 1.6, 47, 0.22, 0.4, 0x3a4250, { col: false, mat: "paint", ao: false }); for (const dx of [-22, -11, 0, 11, 22]) w.box(x0 + dx, 0, z0 + dz + 1.2, 0.7, 0.8, 0.6, WH2, { col: false, mat: "paint" }); }
  w.box(x0 + 26.4, 0, z0, 0.5, 0.24, 42, 0x3a4250, { col: false, mat: "paint", ao: false });
  // 축전 설비 (단지 남쪽)
  [-9, -3, 3, 9].forEach((dx, i) => {
    const x = x0 + dx, z = z0 - 33;
    if (!ok("battery" + i, x, z, 2.8)) return;
    w.box(x, 0, z, 5, 2.8, 2.7, WH, { mat: "std:panel", tile: 3 }); w.box(x, 2.8, z, 5.2, 0.3, 2.9, ORG, { col: false, mat: "paint" });
    for (const k of [-1.5, 0, 1.5]) { w.box(x + k, 1, z + 1.37, 0.9, 1.2, 0.06, DK, { col: false }); w.box(x + k, 2.3, z + 1.38, 0.5, 0.14, 0.06, i === 2 && k === 0 ? AMB : GRN, { mat: "glow", col: false }); }
    for (const k of [-1.8, -0.6, 0.6, 1.8]) w.box(x + k, 3.1, z, 0.08, 1.2, 2.4, WH2, { col: false, mat: "paint", ao: false });
  });
  w.pool(x0, 0.1, z0 - 30, 12, GRN, 0.2);
  tray(w, [[x0 + 12, z0 - 31.4], [x0 + 22, z0 - 28], [x0 + 26.4, z0 - 21.5]], { color: 0x3a4250 });
  S.board("태양광 단지", x0 - 34, z0 + 30, -30, 4.4);
  P.dash("paint", [[x0 - 28.5, z0 - 24.5], [x0 + 28.5, z0 - 24.5], [x0 + 28.5, z0 + 24.5], [x0 - 28.5, z0 + 24.5], [x0 - 28.5, z0 - 24.5]], 0.3, WHT, 2, 2);
}

// ── 온실: 재배등, 에어록, 물탱크, 수확 상자 ──
function greenSite({ w, K, P, S, ok }) {
  const Rs = [11, 11, 9.5];
  GREEN.forEach(([x, z], i) => { for (const k of [-1, 0, 1]) w.box(x + k * 3.4, Rs[i] * 0.52, z, 0.22, 0.14, Rs[i] * (k ? 0.9 : 1.2), PINK, { mat: "glow", col: false }); w.pool(x, 0.8, z, Rs[i] * 0.9, PINK, 0.25); });
  {
    const [x, z] = GREEN[0], F = frame(w, x, z, 90, 0.3);
    F.b(0, 0, 11.6, 2.8, 2.7, 3.4, WH).b(0, 2.7, 11.6, 3.1, 0.25, 3.7, GRN_D).b(0, 0.2, 13.32, 1.5, 2.1, 0.06, GRN, "glow").col(0, 0, 11.6, 2.8, 2.9, 3.4).pool(0, 16, 6, GRN, 0.3);
    P.dash("paint", [F.xz(0, 14.2), F.xz(0, 22)], 0.3, WHT, 1.2, 1.2);
    const a = F.P(1.6, 0, 16); astro(w, a.x, a.z, 300);
  }
  for (const [x, z] of [[-85, 87.5], [-85, 91.6]]) if (ok("watertank", x, z, 1.6)) { w.cyl(x, 0, z, 1.5, 4, WH2, { mat: "paint" }); w.cyl(x, 2.6, z, 1.56, 0.5, GRN_D, { col: false, mat: "paint" }); w.sph(x, 4, z, 1.5, WH2, { mat: "paint", col: false, sy: 0.4 }); }
  tray(w, [[-86.6, 89.6], [-90.4, 90.6]], { pipe: WH2, w: 0.4 });
  { const F = frame(w, -83.6, 97, 20); F.b(0, 0.5, 0, 1.8, 0.2, 3, GREY); for (const [u, v, c] of [[-0.4, -0.8, 0x3fae52], [0.4, -0.8, 0x59c85e], [-0.4, 0.3, 0xd9a441], [0.4, 0.3, 0x3fae52], [0, 1.1, 0xe94f37]]) F.b(u, 0.7, v, 0.7, 0.5, 0.9, c); for (const sx of [-0.9, 0.9]) for (const sz of [-1, 1]) F.g(WHEEL, sx, 0.4, sz, 0.25, 0.4, 0.4, DK); }
  astro(w, -82, 95.4, 250, null, true); crates(w, -87.6, 95.4, 0, 0x3c9a6a);
  S.board("온실", -96, 44, 150, 3.4, 2.6);
}
const GRN_D = 0x3c9a6a;

// ── 채굴 크레이터: 테두리·벤치 조명, 바닥 장비, 광석 더미, 벤치를 도는 운반 트럭 ──
function mineSite({ w, K, P, S, ok, life }) {
  const cx = MINE.x, cz = MINE.z, f = MINE.floor;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, da = Math.abs(Math.atan2(Math.sin(a - MINE.notch), Math.cos(a - MINE.notch)));
    if (da > 0.5) { const x = cx + Math.cos(a) * MINE.R * 1.01, z = cz + Math.sin(a) * MINE.R * 1.01, y = w.h(x, z); w.box(x, y - 0.3, z, 0.25, 2.4, 0.25, DK, { col: false }); K.blink.add(x, y + 2.3, z, AMB, 0.38, i); }
    const bx = cx + Math.cos(a + 0.12) * 58.2, bz = cz + Math.sin(a + 0.12) * 58.2, by = w.h(cx + Math.cos(a + 0.12) * 56, cz + Math.sin(a + 0.12) * 56);
    w.box(bx, by - 0.2, bz, 0.2, 1.6, 0.2, DK, { col: false }); ball(w, bx, by + 1.5, bz, 0.26, i % 2 ? AMB : WARM); if (i % 2 === 0) w.pool(cx + Math.cos(a + 0.12) * 54.5, by + 0.1, cz + Math.sin(a + 0.12) * 54.5, 7, AMB, 0.4);
  }
  // 바닥: 이동식 조명탑, 시추 삼각대, 발파공 표시, 광석 통
  for (const [dx, dz, ry] of [[27, 15, 240], [-33, 3, 90], [1, -33, 0]]) {
    const x = cx + dx, z = cz + dz;
    w.box(x, f, z, 1.6, 0.8, 1.2, YEL, { col: false, mat: "paint" }); w.pipe(x, f + 0.8, z, x, f + 5, z, 0.08, GREY, { col: false });
    w.box(x, f + 4.6, z, 1.6, 0.7, 0.25, WARM, { mat: "glow", col: false, ry }); w.pool(x + Math.sin(ry * DEG) * 5, f + 0.1, z + Math.cos(ry * DEG) * 5, 11, WARM, 0.4);
  }
  for (const [dx, dz] of [[21, 25], [-8, 36]]) {
    const x = cx + dx, z = cz + dz;
    for (const a of [0, 120, 240]) beam(w, [x + Math.sin(a * DEG) * 1.6, f, z + Math.cos(a * DEG) * 1.6], [x, f + 4, z], 0.14, YEL, { col: false });
    w.pipe(x, f, z, x, f + 4.6, z, 0.1, GREY, { col: false }); w.box(x, f + 3.6, z, 0.6, 0.6, 0.6, DK, { col: false }); ball(w, x, f + 4.8, z, 0.2, RED); P.ring("dark", x, z, 0, 1.6, g3(0.55), g3(1), { seg: 10 });
  }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const x = cx + 23 + i * 2.6, z = cz - 29 + j * 2.6; P.ring("dark", x, z, 0, 0.42, g3(0.35), g3(0.6), { seg: 6 }); if ((i + j) % 3 === 0) w.box(x + 0.5, f, z, 0.1, 0.9, 0.1, ORG, { col: false }); }
  P.dash("paint", [[cx + 21.4, cz - 30.6], [cx + 35.2, cz - 30.6], [cx + 35.2, cz - 19.4], [cx + 21.4, cz - 19.4], [cx + 21.4, cz - 30.6]], 0.3, HAZ, 1.4, 1);
  for (const [dx, dz, ry] of [[8, -24, 20], [11.4, -25.5, 35], [-14, 12, 80]]) { const F = frame(w, cx + dx, cz + dz, ry, f); F.b(0, 0, 0, 2.6, 1.5, 1.8, 0x5a5f68).b(0, 1.2, 0, 2.3, 0.6, 1.5, RUST, "std:rock"); }
  w.pipe(cx + 4.5, f + 0.3, cz + 4, cx + 12, f + 0.3, cz - 14, 0.2, GOLD, { col: false, mat: "metal" });
  astro(w, cx + 14, cz + 6, 200, f); astro(w, cx + 25, cz + 22, 20, f, true); astro(w, cx - 12, cz + 10, 100, f);
  // 선광 공장 옆 광석 더미와 적재 컨베이어
  const piles = [[-124, 104, 6.5, RUST], [-115.5, 110.5, 4.6, 0xc98f5a], [-131, 99, 4, 0x9a6a52]];
  for (const [x, z, r, c] of piles) if (ok("pile", x, z, r * 0.8)) w.cone(x, w.h(x, z) - 0.3, z, r, r * 0.72, c, { mat: "std:rock", grad: [0.7, 1.1] });
  if (ok("stacker", -128.5, 112.5, 1)) {
    const y = w.h(PLANT[0], PLANT[1]), a = [PLANT[0] + 7, y + 11, PLANT[1] - 7.5], b = [-124.5, w.h(-124, 104) + 8.6, 105.5];
    beam(w, a, b, 0.5, DK); beam(w, [a[0], a[1] + 0.4, a[2]], [b[0], b[1] + 0.4, b[2]], 0.2, ORG, { col: false });
    const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2; for (const s of [-1, 1]) beam(w, [mx + s * 2.6, w.h(mx, mz) - 0.3, mz + s * 1.2], [mx, (a[1] + b[1]) / 2 - 0.3, mz], 0.3, GREY);
  }
  stamp(w, truckParts(), -96, 119, 215); frame(w, -96, 119, 215).col(0, 0, 0, 3.4, 4, 7);
  { const p = [PLANT[0] - 3, w.h(PLANT[0], PLANT[1]) + 10.7, PLANT[1] + 3]; beacon(w, life, p[0], p[1], p[2], AMB, 3); }
  S.board("채굴장", -101, 131, 60, 4.4, 3);
  // 벤치를 도는 운반 트럭
  const truck = prop(w, truckParts()); w.rider(truck, [[0, 2.2, 0, 1.7, 2.2, 3.5]]);
  life.push((dt, t) => { const a = -t * 0.085, x = cx + Math.cos(a) * 53, z = cz + Math.sin(a) * 53; truck.position.set(x, w.h(x, z), z); truck.rotation.y = Math.atan2(Math.sin(a), -Math.cos(a)); });
}

// ── 매스 드라이버: 축전기 열, 대기 화물, 안전선, 고리를 타고 오르는 방전 섬광 ──
function driverSite({ w, K, P, S, ok, life }) {
  const a = DRIVER.a, b = DRIVER.b, ux = (b[0] - a[0]) / DRIVER_LEN, uz = (b[2] - a[2]) / DRIVER_LEN, nx = -uz, nz = ux, yaw = Math.atan2(b[0] - a[0], b[2] - a[2]) / DEG;
  const sx = a[0] - ux * 9, sz = a[2] - uz * 9, L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), pitch = -Math.asin((b[1] - a[1]) / L) / DEG;
  for (let i = 0; i < 5; i++) {
    const x = sx + nx * 15.5 + ux * (i * 3.1 - 4), z = sz + nz * 15.5 + uz * (i * 3.1 - 4);
    if (!ok("capacitor" + i, x, z, 1.3)) continue;
    w.cyl(x, 0, z, 1.1, 3.4, NAVY, { mat: "paint" }); w.cyl(x, 3.4, z, 0.8, 0.5, DK, { col: false, mat: "paint" }); w.cyl(x, 2.4, z, 1.16, 0.3, CYA, { mat: "glow", col: false }); w.cyl(x, 0, z, 1.3, 0.3, GREY, { col: false, mat: "paint" });
  }
  w.pool(sx + nx * 15.5, 0.1, sz + nz * 15.5, 12, CYA, 0.3);
  tray(w, [[sx + nx * 13.6 + ux * 2, sz + nz * 13.6 + uz * 2], [sx + nx * 7 + ux * 6, sz + nz * 7 + uz * 6], [a[0] + nx * 3, a[2] + nz * 3]], { color: 0x3a4250, w: 0.7 });
  // 대기 중인 화물 썰매
  for (let i = 0; i < 3; i++) {
    const x = sx - nx * (11.5 + i * 4.4) - ux * 2, z = sz - nz * (11.5 + i * 4.4) - uz * 2;
    if (!ok("pod" + i, x, z, 2.2)) continue;
    const F = frame(w, x, z, yaw); F.b(0, 0, 0, 2.4, 0.5, 5.2, DK).b(0, 0.5, 0, 1.9, 1.3, 3.6, i % 2 ? WH2 : ORG).b(0, 1.0, 0, 1.95, 0.4, 3.7, i % 2 ? ORG : WH).col(0, 0, 0, 2.4, 1.9, 5.2);
  }
  // 레일 양옆 안전선
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 14; i++) { const p = driverPoint(-0.02 + i * 0.03); pts.push([p[0] + nx * s * 11, p[2] + nz * s * 11]); } P.dash("paint", pts, 0.45, HAZ, 3, 3); }
  S.board("매스 드라이버", sx - ux * 16 - nx * 6, sz - uz * 16 - nz * 6, yaw + 180, 5, 3);
  astro(w, sx - nx * 6.5, sz - nz * 6.5, yaw + 90);
  // 방전 섬광: 썰매가 지나는 고리가 번쩍인다
  const N = 12, pulse = new THREE.Mesh(new THREE.TorusGeometry(5.9, 0.34, 6, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 2.4, 3), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  pulse.rotation.set(pitch * DEG, yaw * DEG, 0, "YXZ"); pulse.visible = false; w.scene.add(pulse);
  const acc = (2 * (L - 6)) / 64;
  life.push((dt, t) => {
    const c = t % 16, run = c - 3, s = run < 0 ? 0 : (3 + 0.5 * acc * run * run) / L, i = Math.round(s * N), near = Math.abs(s * N - i);
    pulse.visible = c < 11 && run > 0 && i >= 1 && i <= N && near < 0.3;
    if (pulse.visible) { const p = driverPoint(i / N, 2.6); pulse.position.set(p[0], p[1], p[2]); pulse.material.opacity = 0.9 * (1 - near / 0.3); pulse.scale.setScalar(i === N ? 1.3 : 1); }
  });
}

// ── 전파 관측 고원: 통제소 지붕의 회전 접시, 배선 도랑, 보행등, 장비 ──
function dishSite({ w, K, P, S, ok, rover, life }) {
  const [x0, z0] = DISH, y = w.h(x0, z0), hut = [x0 + 12, z0 - 30];
  const d = prop(w, miniDish(2.4, 48)); d.position.set(hut[0] - 3, y + 4.5, hut[1]); w.rider(d, [[0, 2.6, 0, 1.8, 1.4, 1.8]]);
  life.push((dt, t) => { d.rotation.y = t * 0.5; });
  w.box(hut[0] + 3.6, y + 4.5, hut[1] - 1, 2.4, 1.2, 2, GREY, { col: false, mat: "paint" }); w.pipe(hut[0] + 4.6, y + 5.7, hut[1] - 1.6, hut[0] + 4.6, y + 9.5, hut[1] - 1.6, 0.05, WH2, { col: false }); K.blink.add(hut[0] + 4.6, y + 9.6, hut[1] - 1.6, CYA, 0.2, 1);
  for (const [dx, dz] of [[-32, -6], [32, -12], [0, 38]]) {
    const L = curve([[hut[0], hut[1] + 5], [x0 + dx * 0.55 + 8, z0 + dz * 0.4 - 12], [x0 + dx * 0.86, z0 + dz * 0.86]], false, 3);
    P.strip("dark", L, 0.9, g3(0.62)); P.strip("light", L, 0.3, g3(0.05), { off: 0.8 });
    L.forEach(([x, z], i) => { if (i % 2 || Math.hypot(x - x0, z - z0 - 2) < 9) return; w.box(x + 1.4, y, z, 0.14, 0.8, 0.14, DK, { col: false }); ball(w, x + 1.4, y + 0.9, z, 0.16, CYA); });
    const L2 = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; L2.push([x0 + dx + Math.cos(a) * 7.5, z0 + dz + Math.sin(a) * 7.5]); } P.dash("paint", L2, 0.3, HAZ, 1.6, 1.2);
  }
  { const F = frame(w, hut[0] + 7.6, hut[1] + 0.5, 0, y); F.b(0, 0, 0, 1.2, 2, 2.2, WH2).b(0.62, 1.2, 0, 0.06, 0.4, 1.6, GRN, "glow").b(0, 0, 2.6, 1, 1.2, 1.4, GREY).b(0, 0, -2.4, 1.4, 0.9, 1.2, ORG); }
  crates(w, hut[0] - 8, hut[1] + 2, 20, WH2); astro(w, hut[0] + 2, hut[1] + 6.5, 160, y); astro(w, x0 - 20, z0 - 2, 280, y, true);
  rover("dishrover", hut[0] - 4, hut[1] + 10, 100, CYA);
  S.board("전파 관측소", x0 + 2, z0 + 22, 0, 4.6, 3);
}

// ── 변두리: 서쪽 초소, 기념지, 릴, 도로변 ──
function outskirts({ w, K, P, S, ok, rover, life }) {
  {
    const [x, z] = OUTPOST;
    for (const [dx, dz] of [[-8, 7], [-11.4, 4], [-13.6, 0]]) { const F = frame(w, x + dx, z + dz, 60); F.c(0, 0, 0, 0.1, 1.6, GREY).b(0, 1.2, 0, 3, 0.1, 2, NAVY, "metal", 28).b(0, 1.16, 0, 3.2, 0.06, 2.2, WH2, "paint", 28); }
    crates(w, x + 6, z - 4.6, 40); flag(w, x + 2, z + 8.6, 5, 0, ORG, WH); stamp(w, miniDish(1.3, 40), x + 7, z + 1, 250, 2.6);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.3; w.box(x + Math.cos(a) * 5.55, 2.6, z + Math.sin(a) * 5.55, 1.1, 0.6, 0.3, CYA, { mat: "glow", col: false, ry: -a / DEG + 90, rx: -24 }); }
    rover("outpost-rover", x + 10, z - 10, 40, 0x3c9a6a); astro(w, x + 8.4, z + 4.6, 140);
    P.prints(curve([[x + 9, z + 2.4], [x + 6, z + 7], [x + 2.6, z + 8.2]], false, 1.5));
  }
  // 기념지: 발자국 고리, 표석, 안내판
  {
    const x = -66, z = 132, L = [];
    for (let i = 0; i <= 30; i++) { const a = (i / 30) * Math.PI * 2; L.push([x + Math.cos(a) * (6.6 + Math.sin(i * 1.9) * 0.5), z + Math.sin(a) * (6.6 + Math.sin(i * 1.9) * 0.5)]); }
    P.prints(L); P.prints(curve([[x + 6, z + 2], [x + 8, z + 3.4]], false, 1)); P.prints(curve([[x - 30, z - 8], [x - 16, z - 2], [x - 7, z]], false, 2));
    w.box(x + 4, w.h(x + 4, z + 9), z + 9, 1.6, 1, 0.3, 0x3a4250, { col: false, mat: "paint", rx: -20 }); w.box(x + 4, w.h(x + 4, z + 9) + 0.2, z + 9.16, 1.3, 0.6, 0.05, GOLD, { col: false, mat: "metal", rx: -20 });
    astro(w, x + 5.6, z + 10.6, 200); astro(w, x + 3, z + 11, 170, null, true);
    S.board("첫 착륙 기념지", x + 13.5, z - 6, -60, 5, 2.8);
    walker(w, life, L.filter((_, i) => i % 3 === 0).map(([px, pz]) => [x + (px - x) * 1.25, z + (pz - z) * 1.25]), 7);
  }
  // 릴: 계측 삼각대, 수정 무리, 평원 쪽 가장자리 경고등
  const N = (t, d) => { const [x, z] = rillePoint(t), a = rilleDir(t) * DEG; return [x + Math.sin(a) * d, z + Math.cos(a) * d]; };
  [0.12, 0.31, 0.45, 0.55, 0.78, 0.92].forEach((t, i) => {
    const [x, z] = N(t, i % 2 ? 9.5 : -9.5), y = w.h(x, z);
    for (const a of [0, 120, 240]) beam(w, [x + Math.sin(a * DEG) * 0.7, y, z + Math.cos(a * DEG) * 0.7], [x, y + 1.5, z], 0.07, GREY, { col: false });
    w.box(x, y + 1.4, z, 0.5, 0.4, 0.5, FOIL, { col: false, mat: "metal" }); ball(w, x, y + 2, z, 0.14, GRN);
  });
  [[0.22, 10, VIO], [0.4, -10, CYA], [0.76, 10, VIO], [0.83, -10.5, CYA], [0.96, 9, VIO]].forEach(([t, d, c]) => {
    const [x, z] = N(t, d), y = w.h(x, z);
    for (let k = 0; k < 5; k++) w.cone(x + Math.cos(k * 2.4) * (0.4 + k * 0.28), y - 0.3, z + Math.sin(k * 2.4) * (0.4 + k * 0.28), 0.34 + (k % 3) * 0.16, 1.2 + ((k * 7) % 5) * 0.5, c, { mat: "glow", col: false });
    w.pool(x, y + 0.1, z, 8, c, 0.45);
  });
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) { const [x, z] = N(0.015 + i * 0.016, s * 23), y = w.h(x, z); if (x > -22 && x < 22 && z > 74 && z < 132) continue; w.box(x, y - 0.2, z, 0.16, 1.3, 0.16, DK, { col: false }); ball(w, x, y + 1.2, z, 0.17, i % 2 ? AMB : RED); }
  // 도로변 안내판
  S.board("착륙장 1", 96, 56, 30, 3.6, 2.6); S.board("채굴장", -70, 96, 110, 3.6, 2.6); S.board("전파 관측소", 29, -98, 0, 4.4, 2.8); S.board("온실", -92, 30, 60, 3, 2.4);
}

// ── 평원 곳곳의 작은 현장: 돔 건설 현장, 안테나 밭, 오래된 탐사선, 발사 추적소 ──
function fieldSites({ w, K, P, S, ok, life }) {
  // 동쪽: 짓다 만 돔과 레골리스 벽돌
  {
    const x0 = 108, z0 = 19;
    if (ok("buildsite", x0, z0, 10)) {
      octa(w, x0, -0.3, z0, 9.6, 0.6, CONC, { mat: "std:concrete", col: false });
      for (const a of [0, 36, 72, 108, 144]) ring(w, x0, 0.3, z0, 8, 0.2, a % 72 ? WH2 : ORG, { yaw: a, arc: Math.PI, seg: 16 });
      for (const [ph, th0, th1] of [[0.3, 0.75, 1.57], [0.93, 0.95, 1.57], [3.6, 0.5, 1.57], [4.23, 1.1, 1.57]]) w.mesh(new THREE.SphereGeometry(8.12, 5, 4, ph, 0.6, th0, th1 - th0), M(x0, 0.3, z0), WH, "paint");
      ring(w, x0, 0.5, z0, 8.3, 0.3, ORG, { pitch: 90, col: false, seg: 24 });
      const F = frame(w, x0 - 12, z0 + 2, 100);
      F.b(0, 0.5, 0, 2.4, 1.2, 3.6, YEL).b(0, 1.7, -0.6, 1.6, 1, 1.6, WH2).b(0, 2.2, 1.6, 0.3, 0.3, 4.4, YEL, "paint", -24).b(0, 2.3, 3.6, 0.5, 1.4, 0.5, DK).s(0, 2.2, 3.6, 0.22, AMB, "glow").col(0, 0, 0, 2.6, 2.8, 3.8);
      for (const sx of [-1.3, 1.3]) for (const sz of [-1.2, 1.2]) F.g(WHEEL, sx, 0.5, sz, 0.4, 0.5, 0.5, DK);
      for (let i = 0; i < 7; i++) w.box(x0 + 9.4 + (i % 3) * 2.2, i > 2 ? (i > 5 ? 2.4 : 1.2) : 0, z0 - 8 + ((i * 7) % 3) * 0.3 + (i > 2 ? 0.5 : 0), 2, 1.2, 1.1, i % 2 ? 0x9a9da6 : 0x84878f, { col: false, mat: "std:concrete", ry: (i * 13) % 9 });
      for (const [dx, dz, sc] of [[3, -12, 2.4], [-3.5, -12.6, 1.8], [8, 11.5, 2]]) w.blob(x0 + dx, sc * 0.3, z0 + dz, sc * 1.7, sc * 0.8, sc * 1.3, 0x8d8c8a, { mat: "std:rock", grad: [0.6, 1.08], col: false });
      const L = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; L.push([x0 + Math.cos(a) * 13.6, z0 + Math.sin(a) * 13.6]); if (i % 2 === 0 && i < 28) { w.box(L[i][0], 0, L[i][1], 0.12, 1.1, 0.12, ORG, { col: false }); } }
      P.dash("paint", L, 0.35, HAZ, 1.6, 1.2);
      astro(w, x0 - 9.6, z0 + 5.4, 250); astro(w, x0 + 6.5, z0 - 10.4, 20, null, true); crates(w, x0 - 8, z0 - 9.4, 30, WH2);
      if (ok("buildflood", x0 + 9.6, z0 + 9.6, 0.4)) flood(w, x0 + 9.6, z0 + 9.6, 8, -135);
    }
  }
  // 북쪽: 안테나 밭과 계측 오두막
  {
    const hx = 22, hz = -145, MASTS = [[0, -151], [8, -151], [16, -151], [4, -142], [12, -142]];
    for (const [x, z] of MASTS) {
      w.pipe(x, 0, z, x, 4.2, z, 0.05, WH2, { col: false }); w.box(x, 3.4, z, 3, 0.05, 0.05, GREY, { col: false, ao: false }); w.box(x, 3.7, z, 0.05, 0.05, 3, GREY, { col: false, ao: false }); w.cyl(x, 0, z, 0.4, 0.2, CONC, { col: false, mat: "std:concrete" }); ball(w, x, 4.3, z, 0.1, CYA);
      P.strip("dark", [[x, z], [x + (hx - x) * 0.5, z + 2.5], [hx - 2, hz]], 0.3, g3(0.6));
    }
    if (ok("fieldhut", hx, hz, 2.6)) {
      w.box(hx, 0, hz, 4.2, 2.7, 3.2, WH, { mat: "std:panel", tile: 3 }); w.box(hx, 2.7, hz, 4.6, 0.3, 3.6, ORG, { col: false, mat: "paint" }); w.box(hx - 2.12, 1.2, hz, 0.06, 0.9, 1.6, CYA, { mat: "glow", col: false });
      stamp(w, miniDish(1.2, 45), hx + 0.8, hz, 300, 3); w.pool(hx - 4, 0.1, hz, 7, CYA, 0.28); astro(w, hx - 4.4, hz + 1.6, 280);
    }
    P.dash("paint", [[-4, -155], [20, -155], [20, -138], [-4, -138], [-4, -155]], 0.25, WHT, 1.5, 1.5);
  }
  // 북서: 오래전에 불시착한 무인 탐사선
  {
    const x = -140, z = -128;
    if (ok("probe", x, z, 3)) {
      const F = frame(w, x, z, 25);
      F.g(CYL, 0, 0.2, 0, 2.1, 2.2, 2.1, FOIL, "metal", 22, 0, 10).g(CYL, 0.5, 2.1, 0.9, 1.3, 1.5, 1.3, 0xb9bcc4, "paint", 22, 0, 10).g(BOWL, -1.6, 0.4, -2.4, 2.2, 0.9, 2.2, WH2, "paint", 70, 40, 0)
        .b(2.6, 0.3, 0.4, 0.14, 3.2, 0.14, GREY, "paint", 0, 0, -58).b(-2.2, 0.2, 1.6, 0.14, 2.6, 0.14, GREY, "paint", 40, 0, 50).b(3.6, 0, -2, 2.6, 0.06, 1.2, NAVY, "metal", 8, 30, 0).b(-4.4, 0, 3, 1.1, 0.5, 0.8, FOIL, "metal", 0, 50, 12).b(5, 0, 2.6, 0.7, 0.3, 0.9, GREY);
      w.col.addSphere(V3(x, w.h(x, z) + 1.5, z), 2.4);
      // 미끄러진 자국과 튄 흙
      const sk = [F.xz(0, -3), F.xz(1.5, -16), F.xz(4, -30)];
      P.strip("dark", sk, 3.2, g3(0.6), { c2: g3(0.95), w2: 1.2 }); for (const s of [-1, 1]) P.strip("light", sk, 1.4, g3(0.1), { c2: g3(0), off: s * 2.6 });
      P.ring("light", x, z, 3, 9, g3(0.1), g3(0), { seg: 14 });
      flag(w, x + 6, z + 5, 3, 200, ORG, WH); const a = F.P(-3.6, 0, 4.6); astro(w, a.x, a.z, 190); const b = F.P(4.6, 0, 4); astro(w, b.x, b.z, 240, null, true);
      for (const an of [0, 120, 240]) beam(w, [x - 6 + Math.sin(an * DEG) * 0.6, w.h(x - 6, z + 3), z + 3 + Math.cos(an * DEG) * 0.6], [x - 6, w.h(x - 6, z + 3) + 1.4, z + 3], 0.06, GREY, { col: false });
      ball(w, x - 6, w.h(x - 6, z + 3) + 1.6, z + 3, 0.14, GRN); w.pool(x, w.h(x, z) + 0.1, z, 9, AMB, 0.16);
      P.prints(curve([[x + 6, z + 5], [x + 2, z + 6], a.toArray().filter((_, i) => i !== 1)], false, 1.5));
    }
  }
  // 남동: 발사 추적소 (작은 관측 돔과 카메라)
  {
    const x = 128, z = 151, y = w.h(x, z);
    if (ok("tracker", x, z, 5)) {
      dome(w, x, y, z, 4.4, WH); ring(w, x, y + 1.2, z, 4.25, 0.24, ORG, { pitch: 90, col: false });
      const ry = Math.atan2(LAUNCH[0] - x, LAUNCH[1] - z) / DEG, F = frame(w, x, z, ry, y);
      F.b(0, 2.2, 2.2, 1.3, 2.6, 2.4, DK, "paint", -38).b(0, 3.3, 3.5, 0.7, 0.7, 1.6, GREY, "paint", -38).b(4.2, 0, -1, 2.4, 2.2, 2.4, WH2).b(5.42, 1, -1, 0.06, 0.8, 1.4, CYA, "glow").pool(0, 6, 9, CYA, 0.25);
      for (const u of [-6, -9]) { const p = F.P(u, 0, 3); for (const an of [0, 120, 240]) beam(w, [p.x + Math.sin(an * DEG) * 0.8, w.h(p.x, p.z), p.z + Math.cos(an * DEG) * 0.8], [p.x, w.h(p.x, p.z) + 1.7, p.z], 0.07, GREY, { col: false }); stamp(w, [pb(0.5, 0.5, 1.1, 0, 1.9, 0.2, DK, -14), pb(0.3, 0.3, 0.5, 0, 2.02, 0.9, GREY, -14)], p.x, p.z, ry); }
      const a = F.P(-7.4, 0, 1.4); astro(w, a.x, a.z, ry); K.blink.add(x, y + 4.8, z, RED, 0.25, 0);
    }
  }
}

// ── 원경: 동쪽 고지대의 전초 기지와 능선 위 중계탑 (맵 밖, 충돌 없음) ──
function farOutpost({ w, K, life }) {
  const x0 = 376, z0 = -94, y = w.h(x0, z0) + 0.5;
  for (const [dx, dz, R, c] of [[0, 0, 17, CYA], [-26, 14, 11, AMB], [18, 22, 9, CYA], [-14, -22, 8, GRN]]) {
    const x = x0 + dx, z = z0 + dz, yy = Math.min(y, w.h(x, z));
    dome(w, x, yy, z, R, WH, { col: false }); ring(w, x, yy + R * 0.32, z, R * 0.95, 0.5, ORG, { pitch: 90, col: false, seg: 20 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; w.box(x + Math.cos(a) * R * 0.9, yy + R * 0.42, z + Math.sin(a) * R * 0.9, R * 0.22, R * 0.1, 0.6, c, { mat: "glow", col: false, ry: -a / DEG + 90 }); }
    w.pool(x, yy + 0.3, z, R * 2, c, 0.3);
  }
  w.pipe(x0 - 26, y + 3, z0 + 14, x0 - 10, y + 6, z0 + 6, 1.6, WH2, { col: false, mat: "paint" }); w.pipe(x0 + 18, y + 3, z0 + 22, x0 + 8, y + 6, z0 + 12, 1.4, WH2, { col: false, mat: "paint" });
  // 탑과 작은 로켓
  w.cyl(x0 + 30, y - 2, z0 - 14, 2.2, 44, WH, { col: false, mat: "paint", rt: 1.4 }); w.cyl(x0 + 30, y + 42, z0 - 14, 5, 3, DK, { col: false, mat: "paint" }); w.cyl(x0 + 30, y + 43, z0 - 14, 5.1, 1.1, CYA, { col: false, mat: "glow" });
  K.blink.add(x0 + 30, y + 50, z0 - 14, RED, 1.1, 0); w.pipe(x0 + 30, y + 45, z0 - 14, x0 + 30, y + 50, z0 - 14, 0.2, WH2, { col: false });
  const rx = x0 - 6, rz = z0 + 44, ry = Math.min(y, w.h(rx, rz));
  w.cyl(rx, ry + 3, rz, 2.6, 26, WH, { col: false, mat: "paint" }); w.cyl(rx, ry + 29, rz, 2.6, 6, ORG, { col: false, mat: "paint", rt: 0.2 }); w.cyl(rx, ry + 12, rz, 2.68, 1.6, ORG, { col: false, mat: "paint" });
  for (const s of [-1, 1]) beam(w, [rx + 5, ry, rz + s * 2], [rx + 5, ry + 30, rz + s * 2], 0.5, 0xd9432f, { col: false }); for (const yy of [8, 16, 24, 30]) beam(w, [rx + 5, ry + yy, rz - 2], [rx + 5, ry + yy, rz + 2], 0.4, WH, { col: false });
  w.box(rx, ry - 0.5, rz, 16, 1.2, 16, 0x70747e, { col: false, mat: "std:concrete" }); w.pool(rx, ry + 0.9, rz, 16, AMB, 0.5); K.blink.add(rx + 5, ry + 31.5, rz, RED, 0.9, 1);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.blink.add(x0 + Math.cos(a) * 46, w.h(x0 + Math.cos(a) * 46, z0 + Math.sin(a) * 46) + 2, z0 + Math.sin(a) * 46, i % 2 ? AMB : CYA, 0.7, i); }
  // 능선 위 중계탑 두 곳
  for (const [x, z, c] of [[140, -390, CYA], [-410, 205, AMB], [230, 425, CYA]]) {
    const yy = w.h(x, z);
    lattice(w, x, yy - 1, z, 2.6, 46, 6, 0xd9432f, { color2: WH, t: 0.5 });
    w.box(x + 9, yy - 0.5, z + 4, 9, 4.5, 6, WH, { col: false, mat: "std:panel" }); w.box(x + 9, yy + 2, z + 7.05, 6, 1.2, 0.1, c, { mat: "glow", col: false }); w.pool(x + 6, yy + 0.3, z + 6, 22, c, 0.35);
    stamp(w, miniDish(5, 55), x, z, Math.atan2(-x, -z) / DEG, yy + 45); K.blink.add(x, yy + 53, z, RED, 1, x > 0 ? 0 : 1); K.blink.add(x, yy + 24, z + 2.9, RED, 0.6, x > 0 ? 1 : 0);
  }
  // 전초 기지에서 이따금 떠오르는 수송선
  const ship = new THREE.Mesh(merged([[SPH, M(0, 0, 0, 2.2, 4, 2.2), 0xffffff], [new THREE.ConeGeometry(2.2, 9, 8), M(0, -7, 0, 1, 1, 1, 180, 0, 0), 0xffb060]]), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2, 2, 2), fog: false }));
  ship.frustumCulled = false; ship.visible = false; w.scene.add(ship);
  life.push((dt, t) => { const c = (t + 20) % 70; ship.visible = c < 26; if (ship.visible) { const k = c / 26; ship.position.set(rx - 40 + k * k * 260, ry + 40 + k * 620 + k * k * 300, rz + 30 - k * k * 420); ship.rotation.z = -k * 0.6; } });
}

// ── 하늘: 천천히 지나가는 궤도 정거장 ──
function sky({ w, life }) {
  const g = merged([pb(26, 9, 9, 0, 0, 0, 0xe9ebf0), pb(9, 9, 22, 0, 0, 0, 0xc9ced8), pb(4, 4, 70, 0, 0, 0, 0x8a8f99), ...[-1, 1].flatMap((s) => [pb(34, 0.6, 14, 0, 0, s * 30, 0x2f5fd0), pb(34, 0.6, 14, 0, 0, s * 46, 0x2f5fd0)]), [new THREE.TorusGeometry(16, 2.4, 6, 20), M(0, 0, 0, 1, 1, 1, 0, 90, 0), 0xf07a1e]]);
  const st = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x30343c, fog: false }));
  st.frustumCulled = false; st.castShadow = false; w.scene.add(st);
  life.push((dt, t) => { const a = t * 0.012 + 0.6; st.position.set(Math.cos(a) * 1300, 760 + Math.sin(a * 2) * 60, Math.sin(a) * 1300 - 200); st.rotation.set(0.4, -a, t * 0.03); });
}
