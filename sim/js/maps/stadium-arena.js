// 드론 리그 스타디움 — 경기장 둘레: 광고판 담장, 계단식 관중석(관중 텍스처), 지붕 차양, 대형 전광판, 모서리 조명탑, 하늘의 홍보 비행선 고리, 먼 미래 도시
import * as THREE from "../../vendor/three.module.min.js";
import { lattice, ball } from "./moon-kit.js";
import { crowdTexture, rng, DEG, CYAN, MAG, AMB, TB, TR, DARK, DARK2, STEEL, PANEL } from "./stadium-kit.js";

const F = 468;              // 경기장 담장(광고판) 위치
const S0 = 478, S1 = 566;   // 관중석 앞·뒤
const TIERS = 10, RISE = 4.4;
const SIDE = 430;           // 한 변 관중석의 절반 길이 (모서리는 조명탑 자리)
const ADS = ["ad1", "ad2", "ad3", "ad4", "ad5", "league", "fpv"];

// 변마다 좌표계: 바깥 방향 (nx, nz), 변을 따라가는 방향 (tx, tz)
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([nx, nz]) => ({ nx, nz, tx: -nz, tz: nx }));

export function stands(w, K, S) {
  const crowd = { p: [], u: [], i: [], c: 0 };
  for (const sd of SIDES) {
    const P = (d, t) => [sd.nx * d + sd.tx * t, sd.nz * d + sd.tz * t], ry = Math.atan2(sd.nx, sd.nz) / DEG;
    // 광고판 담장
    const [fx, fz] = P(F, 0);
    w.box(fx, 0, fz, sd.tx ? F * 2 : 2.4, 3.4, sd.tz ? F * 2 : 2.4, DARK, { mat: "paint" });
    for (let t = -F + 22, k = 0; t < F - 10; t += 46, k++) { const [x, z] = P(F - 1.25, t); S.add(ADS[k % ADS.length], x, 1.9, z, 44, { ry: ry + 180, height: 3 }); }
    // 계단식 관중석
    const dep = (S1 - S0) / TIERS;
    for (let i = 0; i < TIERS; i++) {
      const d0 = S0 + i * dep, [x, z] = P(d0 + dep / 2, 0), h = slopeY(d0) - 0.25;
      w.box(x, 0, z, sd.tx ? SIDE * 2 : dep, h, sd.tz ? SIDE * 2 : dep, i % 2 ? DARK2 : DARK, { mat: "paint", col: false, ao: false });
      if (i % 3 === 2) { const [gx, gz] = P(d0, 0); w.box(gx, slopeY(d0) + 0.05, gz, sd.tx ? SIDE * 2 : 0.5, 0.3, sd.tz ? SIDE * 2 : 0.5, i % 2 ? MAG : CYAN, { mat: "glow", col: false }); }
    }
    w.col.addBox(new THREE.Vector3(...xyz(P((S0 + S1) / 2, 0), TIERS * RISE / 2)), new THREE.Vector3(sd.tx ? SIDE : (S1 - S0) / 2, TIERS * RISE / 2, sd.tz ? SIDE : (S1 - S0) / 2));
    // 관중: 계단 경사면을 덮는 한 장 (빛 받지 않는 텍스처, 세로로 반복)
    const b = crowd.c, q = [P(S0, -SIDE), P(S0, SIDE), P(S1, SIDE), P(S1, -SIDE)], ys = [RISE * 0.9, RISE * 0.9, TIERS * RISE + 0.3, TIERS * RISE + 0.3];
    q.forEach(([x, z], k) => { crowd.p.push(x, ys[k], z); crowd.u.push(k === 1 || k === 2 ? SIDE * 2 / 18 : 0, k >= 2 ? TIERS * 1.3 : 0); });
    crowd.i.push(b, b + 1, b + 2, b, b + 2, b + 3); crowd.c += 4;
    // 지붕 차양 + 앞 끝 빛줄 + 받침 기둥
    const RY = TIERS * RISE + 18, [rx, rz] = P(S1 - 26, 0);
    w.box(rx, RY, rz, sd.tx ? SIDE * 2 + 8 : 56, 2, sd.tz ? SIDE * 2 + 8 : 56, PANEL, { mat: "metal", col: false });
    const [ex, ez] = P(S1 - 54, 0);
    w.box(ex, RY - 0.2, ez, sd.tx ? SIDE * 2 + 8 : 0.8, 0.8, sd.tz ? SIDE * 2 + 8 : 0.8, CYAN, { mat: "glow", col: false });
    for (let t = -SIDE; t <= SIDE; t += 86) { const [px, pz] = P(S1 - 2, t); w.box(px, 0, pz, 2.4, RY, 2.4, STEEL, { mat: "metal" }); }
    // 대형 전광판: 지붕 위에 선 틀 + 화면 (경기장 쪽을 본다)
    for (const [t, id] of [[-200, "screenA"], [200, "screenB"]]) {
      const [x, z] = P(S0 + 34, t), sy = RY + 2;
      w.box(x, sy, z, sd.tx ? 92 : 3, 46, sd.tz ? 92 : 3, DARK, { mat: "paint", col: false });
      for (const k of [-1, 1]) { const [lx, lz] = P(S0 + 34, t + k * 46); w.box(lx, sy, lz, 1, 46, 1, MAG, { mat: "glow", col: false }); }
      const [sx, sz] = P(S0 + 32.2, t);
      S.add(sd.nx + sd.nz > 0 ? (id === "screenA" ? "screenB" : "screenA") : id, sx, sy + 23, sz, 88, { ry: ry + 180, height: 42 });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(crowd.p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(crowd.u, 2));
  g.setIndex(crowd.i); g.computeVertexNormals();
  const tex = crowdTexture(), mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.15, 1.15, 1.15), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
  w.scene.add(m); w.disposables.push(g, mat, tex);
  // 응원봉 물결: 관중 텍스처를 천천히 흘려 반짝이는 듯
  w.updaters.push((dt, t) => { tex.offset.x = Math.floor(t * 3) * 0.013; });
}
const xyz = ([x, z], y) => [x, y, z];
const slopeY = (d) => RISE * 0.9 + (d - S0) / (S1 - S0) * (TIERS * RISE + 0.3 - RISE * 0.9);

// 모서리 조명탑: 격자탑 + 조명 뭉치 + 경기장 쪽으로 쏟아지는 빛
export function floodlights(w, K) {
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = sx * 505, z = sz * 505, H = 96;
    lattice(w, x, 0, z, 4, H, 8, STEEL, { t: 0.8, color2: PANEL });
    w.box(x - sx * 3, H, z - sz * 3, 20, 10, 20, DARK, { mat: "paint", ry: 45 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ball(w, x - sx * 9 + (i - 1) * 4.6, H + 2.4 + j * 3, z - sz * 9 + (j - 1) * 1.5 - (i - 1) * 2, 1.4, 0xfff4dc);
    w.shaft(x - sx * 12, H, z - sz * 12, 2, 32, H, 0xdde8ff, 0.035);
    K.blink.add(x, H + 11, z, 0xff3030, 0.8, (sx + sz) & 1);
  }
}

// 먼 미래 도시: 안개 너머 빛줄 박힌 탑들 (단순 상자, 안개가 먹는다)
export function skyline(w, K) {
  const r = rng(915);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + r() * 0.06, d = 720 + r() * 380, x = Math.cos(a) * d, z = Math.sin(a) * d, gy = w.h(x, z) - 2;
    const h = 60 + r() * 170, wd = 18 + r() * 26, ry = r() * 90, acc = [CYAN, MAG, AMB, TB, TR][(r() * 5) | 0];
    w.box(x, gy, z, wd, h, wd * (0.6 + r() * 0.6), 0x161a26, { mat: "paint", col: false, ry, ao: false });
    w.box(x, gy, z, wd + 0.6, h * 0.98, 1.2, acc, { mat: "glow", col: false, ry, ao: false });
    if (r() < 0.5) w.box(x, gy + h * (0.3 + r() * 0.5), z, wd + 1, 1.2, wd * 0.9, acc, { mat: "glow", col: false, ry, ao: false });
    K.blink.add(x, gy + h + 1, z, 0xff3030, 1.6, i & 1);
  }
}

// 하늘의 홍보 비행선 둘: 경기장 위를 천천히 돈다 (충돌 없음)
export function blimps(w, S) {
  const geo = new THREE.SphereGeometry(1, 16, 10), mat = new THREE.MeshLambertMaterial({ color: 0x2a3142 }), list = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(geo, mat);
    body.scale.set(9, 9, 30); g.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: i ? 0xff5ad6 : 0x3ff0ff, side: THREE.DoubleSide }));
    band.rotation.x = Math.PI / 2; g.add(band);
    w.scene.add(g); list.push(g);
    w.disposables.push(band.geometry, band.material);
  }
  w.disposables.push(geo, mat);
  w.updaters.push((dt, t) => list.forEach((g, i) => { const a = t * 0.025 + i * Math.PI; g.position.set(Math.cos(a) * 300, 175 + i * 12, Math.sin(a) * 300); g.rotation.y = -a; }));
  void S; void DARK2;
}
