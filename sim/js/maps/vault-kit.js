// 제국 코어 저장고 제작 도구: 배치 상수·색·팔각 성벽 좌표계·속이 빈 다각 껍질(저장고·냉각탑)·빛기둥·증기·탐조등·잔광 입자
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, mat, frame } from "./canyon-kit.js";
import { ring, octa, ball, lattice, Blinkers, lane, V3, yawAcross } from "./moon-kit.js";
import { monolith, hash, local, BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, HAZ } from "./empire-kit.js";

export { M, beam, prop, merged, mat, frame, ring, octa, ball, lattice, Blinkers, lane, V3, yawAcross, monolith, hash, local };
export { BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, HAZ };

export const DEG = Math.PI / 180;
// 저장고의 색: 제국의 검은 강철·포금·붉은 발광에 더해, 이 맵의 주인공인 차가운 청록 코어 빛
export const CYA = 0x38e8ff, CYA2 = 0x1fb6d6, CYA3 = 0x0f7f98, TEAL = 0x0e3a46, ICE = 0xc8f8ff, NAVY = 0x10141c, SLATE = 0x232a35;

// ── 배치 (중심은 원점. 각도는 x 축에서 +z 쪽으로: 0° 동, 90° 남, 180° 서, 270° 북) ──
export const WALL = 200, WALL_H = 22, WALL_T = 6;            // 팔각 성벽: 변까지 거리(내접 반경)·높이·두께
export const VERT_R = WALL / Math.cos(22.5 * DEG);           // 꼭짓점 반경
export const VR = 40, V_SH = 58, V_TOP = 100, V_CROWN = 24;  // 코어 저장고: 몸통 반경, 어깨 높이, 왕관 높이·반경
export const CORE_Y = 24;                                    // 저장고 안에 떠 있는 주 코어
export const ROAD_R = 56, ROAD_HW = 6;                       // 안쪽 순환로(배관 다리 밑)
export const AVE = 7;                                        // 네 문에서 저장고로 뻗은 대로 반폭
export const SILO_D = 80, SILO_R = 10, SILO_H = 42;          // 코어 사일로 고리
export const SILOS = Array.from({ length: 8 }, (_, i) => { const a = (22.5 + i * 45) * DEG; return [Math.cos(a) * SILO_D, Math.sin(a) * SILO_D, a]; });
export const PIPE_Y = 30;                                    // 사일로 → 저장고 배관 다리 높이
export const MANI_Y = 36;                                    // 사일로끼리 잇는 순환 배관 높이
export const RAIL_R = 104, RAIL_Y = 24;                      // 화물 모노레일 고리
export const PRISON = [0, -172];                             // 포로 감시탑
export const YARD = { x0: -62, x1: 62, z0: -196, z1: -112 }; // 감시탑 진지(북쪽 성벽에 붙은 요새 마당)
export const COOL = [[-148, -46, 19, 66, 45], [-160, 34, 20, 74, 0], [-124, 62, 14, 50, 22.5]];   // 냉각탑 [x, z, 밑 반경, 높이, 다리 방위(도)]
export const MAZE = { x0: 116, x1: 188, z0: -74, z1: 74, NS: [124, 150, 176], EW: [-60, -30, 30, 60], yNS: 20, yEW: 29 };   // 배관 미로
export const PADS = [[92, 152], [128, 124], [156, 88]];      // 착륙장
export const DEPOT = { x: -118, z: 118 };                    // 남서 코어 적치장

export function height() { return 0; }
// 성벽 안쪽인가 (m: 벽 중심선에서 안으로 들어온 여유)
export const inside = (x, z, m = 0) => Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * Math.SQRT1_2) < WALL - m;
// 각도(도) → 반경 r 인 점
export const polar = (deg, r) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r];
// 성벽 한 변의 국소 좌표계: u 는 벽을 따라, v 는 바깥쪽. a 는 변 가운데의 방위(도)
export const sideFrame = (w, a, r = WALL) => frame(w, Math.cos(a * DEG) * r, Math.sin(a * DEG) * r, 90 - a);

const _e = new THREE.Euler(), _q = new THREE.Quaternion();

// ── 속이 빈 다각 껍질: tiers = [[y, 내접 반경], ...] 를 차례로 이은 n 각 벽. 안팎 두 면 + 테두리 + 판마다 충돌 상자 ──
// o: { n, phase(라디안), thick, color, inner(안쪽 면 색), mat, skip(k, t) → true 면 그 판을 비운다(문), col, tag }
export function shell(w, cx, cz, tiers, o = {}) {
  const n = o.n || 16, ph = o.phase || 0, th = o.thick ?? 3, skip = o.skip || (() => false);
  const da = (Math.PI * 2) / n, kv = 1 / Math.cos(da / 2), T = tiers.length - 1;
  const has = (k, t) => t >= 0 && t < T && !skip(((k % n) + n) % n, t);
  const P = (a, r, y) => [cx + Math.cos(a) * r * kv, y, cz + Math.sin(a) * r * kv];
  const out = { p: [], u: [] }, inn = { p: [], u: [] };
  const quad = (B, a, b, c, d, nx, ny, nz) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    const L = Math.hypot(ux, uy, uz) / 8, H = Math.hypot(vx, vy, vz) / 8;
    if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz >= 0) { B.p.push(...a, ...b, ...c, ...a, ...c, ...d); B.u.push(0, 0, L, 0, L, H, 0, 0, L, H, 0, H); }
    else { B.p.push(...a, ...c, ...b, ...a, ...d, ...c); B.u.push(0, 0, L, H, L, 0, 0, 0, 0, H, L, H); }
  };
  for (let t = 0; t < T; t++) for (let k = 0; k < n; k++) {
    if (!has(k, t)) continue;
    const a0 = ph + (k - 0.5) * da, a1 = ph + (k + 0.5) * da, am = ph + k * da, [y0, r0] = tiers[t], [y1, r1] = tiers[t + 1];
    const nx = Math.cos(am), nz = Math.sin(am);
    quad(out, P(a0, r0, y0), P(a1, r0, y0), P(a1, r1, y1), P(a0, r1, y1), nx, 0.001, nz);
    quad(inn, P(a0, r0 - th, y0), P(a1, r0 - th, y0), P(a1, r1 - th, y1), P(a0, r1 - th, y1), -nx, 0, -nz);
    if (!has(k, t + 1)) quad(out, P(a0, r1, y1), P(a1, r1, y1), P(a1, r1 - th, y1), P(a0, r1 - th, y1), 0, 1, 0);
    if (!has(k, t - 1) && y0 > 0.01) quad(out, P(a0, r0, y0), P(a1, r0, y0), P(a1, r0 - th, y0), P(a0, r0 - th, y0), 0, -1, 0);
    if (!has(k - 1, t)) quad(out, P(a0, r0, y0), P(a0, r0 - th, y0), P(a0, r1 - th, y1), P(a0, r1, y1), Math.sin(a0), 0, -Math.cos(a0));
    if (!has(k + 1, t)) quad(out, P(a1, r0, y0), P(a1, r0 - th, y0), P(a1, r1 - th, y1), P(a1, r1, y1), -Math.sin(a1), 0, Math.cos(a1));
    if (o.col !== false) {
      const rm = (r0 + r1) / 2 - th / 2, half = ((r0 + r1) / 2) * Math.tan(da / 2) + 0.2;
      _e.set(-Math.atan2(r0 - r1, y1 - y0), Math.PI / 2 - am, 0, "YXZ");
      w.col.addBox(V3(cx + nx * rm, (y0 + y1) / 2, cz + nz * rm), V3(half, Math.hypot(y1 - y0, r0 - r1) / 2, th / 2), _q.setFromEuler(_e), o.tag);
    }
  }
  const I = new THREE.Matrix4();
  for (const [B, color] of [[out, o.color ?? BLK], [inn, o.inner ?? o.color ?? BLK]]) {
    if (!B.p.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(B.p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(B.u, 2));
    g.computeVertexNormals();
    w.mesh(g, I, color, o.mat || "std:panel");
    g.dispose();
  }
}

// 다각 고리 띠(판마다 상자 하나): 저장고 허리띠·난간·받침. r 은 내접 반경(상자 바깥 면)
export function band(w, cx, cz, r, y, h, depth, color, o = {}) {
  const n = o.n || 16, ph = o.phase || 0, da = (Math.PI * 2) / n, wid = 2 * r * Math.tan(da / 2) + (o.over ?? 0.3);
  for (let k = 0; k < n; k++) {
    if (o.skip && o.skip(k)) continue;
    const a = ph + k * da, rm = r - depth / 2;
    w.box(cx + Math.cos(a) * rm, y, cz + Math.sin(a) * rm, wid, h, depth, color, { mat: o.mat || "paint", ry: 90 - a / DEG, col: o.col === true, ao: false });
  }
}

// ── 빛기둥 모음: 저장고·사일로에서 하늘로 솟는 청록 기둥. 하나의 가산 메시로 합치고 천천히 맥동한다 ──
export class Beams {
  constructor(w) { this.w = w; this.pos = []; this.col = []; this.idx = []; this.n = 0; }
  // 바닥 (x, y, z), 반경 r(위로 갈수록 rt 로), 높이 h, 세기 k
  add(x, y, z, r, h, color = CYA, k = 0.5, rt = r) {
    const g = new THREE.CylinderGeometry(rt, r, h, 14, 8, true), P = g.attributes.position, I = g.index, c = new THREE.Color(color);
    for (let i = 0; i < P.count; i++) {
      const f = P.getY(i) / h + 0.5, e = k * 1.5 * Math.pow(1 - f, 1.6) * Math.min(1, f * 14 + 0.25);
      this.pos.push(x + P.getX(i), y + f * h, z + P.getZ(i)); this.col.push(c.r * e, c.g * e, c.b * e);
    }
    for (let i = 0; i < I.count; i++) this.idx.push(this.n + I.getX(i));
    this.n += P.count; g.dispose();
  }
  finish() {
    if (!this.n) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });   // 바깥 면만: 기둥 안으로 들어가도 화면이 빛에 묻히지 않는다
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6;
    this.w.scene.add(mesh); this.w.disposables.push(g, m);
    this.w.updaters.push((dt, t) => { m.opacity = 0.82 + Math.sin(t * 1.3) * 0.1 + Math.sin(t * 5.1) * 0.05; });
  }
}

// ── 증기 모음: 냉각탑·배기구에서 피어올라 퍼지는 덩어리. 인스턴스 메시 하나 ──
export class Steam {
  constructor(w, color = 0x7f9fb0, emissive = 0x0c2630, opacity = 0.5, rate = 0.045) { this.w = w; this.src = []; this.color = color; this.emissive = emissive; this.opacity = opacity; this.rate = rate; }
  // 나오는 곳 (x, y, z), 덩어리 크기 rad, 오르는 높이 rise, 덩어리 수 n
  add(x, y, z, rad, rise, n = 5) { for (let i = 0; i < n; i++) this.src.push([x, y, z, rad, rise, i / n + hash(x * 3 + i, z) * 0.1, hash(i, x + z) * 6.28]); }
  finish() {
    const S = this.src, N = S.length;
    if (!N) return;
    const g = new THREE.IcosahedronGeometry(1, 1);
    const m = new THREE.MeshLambertMaterial({ color: this.color, emissive: this.emissive, flatShading: true, transparent: true, opacity: this.opacity, depthWrite: false }), rate = this.rate;
    const im = new THREE.InstancedMesh(g, m, N); im.frustumCulled = false; im.renderOrder = 4;
    this.w.scene.add(im); this.w.disposables.push(g, m);
    const tm = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion();
    this.w.updaters.push((dt, t) => {
      for (let i = 0; i < N; i++) {
        const [x, y, z, rad, rise, ph, a] = S[i], u = (t * rate + ph) % 1;
        p.set(x + u * rise * 0.3 + Math.sin(a + t * 0.3) * rad * 0.25, y + u * rise, z + u * rise * 0.14 + Math.cos(a + t * 0.25) * rad * 0.25);
        const k = rad * (0.55 + u * 1.6) * Math.min(1, u * 7) * Math.min(1, (1 - u) * 3.2) + 0.001;
        tm.compose(p, q, s.set(k, k * 0.8, k)); im.setMatrixAt(i, tm);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
}

// ── 제국의 붉은 탐조등: 꼭대기에서 비스듬히 아래를 훑는다. 바닥에는 움직이는 빛 원. list: [x, y, z, 위상, 속도, 기울기(도)] ──
function radialTex() {
  const S = 128, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,0.55)"); gr.addColorStop(0.7, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function searchlights(w, list, color = 0xff3a30) {
  if (!list.length) return;
  const L = 190, R = 17;
  const cone = new THREE.CylinderGeometry(0.6, R, L, 18, 1, true); cone.translate(0, -L / 2, 0);
  const cm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const tex = radialTex();
  const sm = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  const disc = new THREE.PlaneGeometry(1, 1); disc.rotateX(-Math.PI / 2);
  const hg = new THREE.CylinderGeometry(1.1, 1.5, 2, 10), hm = new THREE.MeshBasicMaterial({ color: 0xffc0b0 });
  const items = list.map(([x, y, z, ph, sp, tilt]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z);
    const arm = new THREE.Group(); arm.rotation.x = tilt * DEG; pivot.add(arm);
    const m = new THREE.Mesh(cone, cm); m.renderOrder = 6; m.frustumCulled = false; arm.add(m);
    const head = new THREE.Mesh(hg, hm); head.position.y = -0.6; arm.add(head);
    const spot = new THREE.Mesh(disc, sm); spot.renderOrder = 3; spot.frustumCulled = false;
    w.scene.add(pivot, spot);
    return { pivot, spot, ph, sp, tilt: tilt * DEG, y };
  });
  w.disposables.push(cone, cm, sm, disc, tex, hg, hm);
  w.updaters.push((dt, t) => {
    for (const it of items) {
      const a = it.ph + t * it.sp + Math.sin(t * 0.37 + it.ph) * 0.5;
      it.pivot.rotation.y = a;
      const dy = -Math.cos(it.tilt), dh = Math.sin(it.tilt), dx = -dh * Math.sin(a), dz = -dh * Math.cos(a);
      const tt = Math.min(L, it.y / -dy), s = R * (tt / L) * 2.6 / Math.max(0.35, -dy);
      it.spot.position.set(it.pivot.position.x + dx * tt, 0.16, it.pivot.position.z + dz * tt);
      it.spot.scale.set(s, 1, s);
      it.spot.visible = tt < L * 0.98;
    }
  });
}

// ── 바닥 도관을 따라 흐르는 맥동: runs = [[[x0, z0], [x1, z1]], ...]. 인스턴스 메시 하나 ──
export function pulses(w, runs, color, per = 3, speed = 18, size = [4.5, 0.18, 0.8]) {
  const R = runs.map(([a, b]) => ({ a, b, L: Math.hypot(b[0] - a[0], b[1] - a[1]), ry: Math.atan2(-(b[1] - a[1]), b[0] - a[0]) }));
  const N = R.length * per, g = new THREE.BoxGeometry(1, 1, 1), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4) });
  const im = new THREE.InstancedMesh(g, m, N); im.frustumCulled = false; w.scene.add(im); w.disposables.push(g, m);
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(...size);
  w.updaters.push((dt, t) => {
    let i = 0;
    for (let k = 0; k < R.length; k++) {
      const { a, b, L, ry } = R[k];
      e.set(0, ry, 0); q.setFromEuler(e);
      for (let j = 0; j < per; j++, i++) {
        const u = (t * speed / Math.max(L, 30) + j / per + k * 0.137) % 1;
        p.set(a[0] + (b[0] - a[0]) * u, 0.1, a[1] + (b[1] - a[1]) * u);
        tm.compose(p, q, s); im.setMatrixAt(i, tm);
      }
    }
    im.instanceMatrix.needsUpdate = true;
  });
}

// ── 떠오르는 잔광 입자: 중심 둘레 원통 안에서 천천히 솟는 점들 ──
export function motes(w, cx, cz, rad, top, n, color, size = 0.4) {
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = hash(i, 5) * 6.283, d = Math.sqrt(hash(i, 9)) * rad; base.set([cx + Math.cos(a) * d, hash(i, 13) * top, cz + Math.sin(a) * d], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; w.scene.add(pts); w.disposables.push(g, pts.material);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.21 + i) * 3;
      pos[i * 3 + 1] = (base[i * 3 + 1] + t * (1.4 + (i % 5) * 0.5)) % top;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + i * 1.3) * 3;
    }
    g.attributes.position.needsUpdate = true;
  });
}

// 두 점 사이 배관: 굵은 관 + 이음 고리 + (선택) 위에 얹힌 청록 발광선. 충돌은 캡슐 하나
export function duct(w, a, b, r, color = GUN, o = {}) {
  w.pipe(a[0], a[1], a[2], b[0], b[1], b[2], r, color, { mat: o.mat || "metal", col: o.col !== false });
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz), n = Math.max(1, Math.round(L / (o.every || 9)));
  for (let i = 0; i <= n; i++) {
    const u = i / n, f = 0.6 / L;
    w.pipe(a[0] + dx * (u - f), a[1] + dy * (u - f), a[2] + dz * (u - f), a[0] + dx * (u + f), a[1] + dy * (u + f), a[2] + dz * (u + f), r * 1.18, o.joint ?? IRON, { col: false });
  }
  if (o.glow) w.pipe(a[0], a[1] + r * 0.92, a[2], b[0], b[1] + r * 0.92, b[2], Math.max(0.16, r * 0.16), o.glow, { mat: "glow", col: false });
}
