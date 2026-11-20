// 붉은 협곡 전초기지 제작 도구: 색·좌표 도우미와 제국 부품(철골 트러스 다리, 포탑, 수송정, 연료 탱크, 철탑, 탐조등, 불꽃, 먼지 기둥)
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, mat, frame, rockArch, hoodoo, boulder, birds } from "./canyon-kit.js";
import { ring, octa, ball, dome, lattice, Blinkers, lane, V3 } from "./moon-kit.js";
import { prism, faceted } from "./orbit-kit.js";
import { monolith, plume, local, BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ } from "./empire-kit.js";
import { height, hash } from "./outpost-terrain.js";

export { M, beam, prop, merged, mat, frame, rockArch, hoodoo, boulder, birds, ring, octa, ball, dome, lattice, Blinkers, lane, V3, prism, faceted, monolith, plume, local, hash };
export { BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ };

export const DEG = Math.PI / 180;
// 연합군 색(고원의 전진 기지): 흰 장갑판 · 남색 · 하늘빛 표시등 / 사암 색
export const WH = 0xdfe3ea, WH2 = 0xb9c0cb, NAVY = 0x23407e, SKY = 0x58c8ff, OLIVE = 0x5a6048;
export const ROCK = [0xd98a58, 0xf0c79a, 0xc9703f], ROCK_D = 0xb8623c;

// (dx, dz) 방향으로 u 축(+x)을 눕히는 ry(도)
export const yawOf = (dx, dz) => Math.atan2(-dz, dx) / DEG;
// 두 좌표축 범위로 상자를 놓는다 (xa..xb, ya..yb, za..zb)
export const slab = (w, xa, xb, ya, yb, za, zb, color, o = {}) => w.box((xa + xb) / 2, ya, (za + zb) / 2, Math.abs(xb - xa), yb - ya, Math.abs(zb - za), color, o);
// 정팔각형 꼭짓점(각기둥 prism 용)
export const O8 = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [Math.cos(a), Math.sin(a)]; });

const BOXG = new THREE.BoxGeometry(1, 1, 1);
const CYLG = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); return g; })();
const CONEG = (() => { const g = new THREE.ConeGeometry(1, 1, 8, 1, true); g.translate(0, 0.5, 0); return g; })();
export { BOXG, CYLG, CONEG };

// ── 철골 트러스 다리: a → b 를 잇는 상판(높이 y) + 양옆 워런 트러스 + 상판 밑 아치. 밑으로도, 트러스 속으로도 지날 수 있다 ──
// o: { width, height, drop(아치 깊이), name, portal(북쪽 끝 절벽 관문), ramp(남쪽 끝 오르막 높이) }
export function trussBridge(w, K, a, b, y, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ry = yawOf(dx, dz);
  const F = frame(w, a[0], a[1], ry, y), W = o.width || 10, H = o.height || 9, D = o.drop || 20;
  const n = Math.max(4, Math.round(L / 9.6 / 2) * 2), p = L / n;
  // 상판: 강판 + 가운데 붉은 유도선 + 가장자리 경고 띠
  F.box(L / 2, -1.2, 0, L, 1.2, W, IRON, { mat: "std:panel", tile: 6 });
  F.box(L / 2, 0.0, 0, L, 0.05, 0.45, RED, { mat: "glow", col: false, ao: false });
  for (const sv of [-1, 1]) {
    const v = (sv * W) / 2;
    F.box(L / 2, 0, v * 0.9, L, 0.05, 0.3, HAZ, { col: false, ao: false });
    F.beam(0, H, v, L, H, v, 0.95, BLK2);                                   // 상현재
    F.beam(0, 0.5, v, L, 0.5, v, 0.8, BLK2, { col: false });                // 하현재
    F.box(L / 2, 1.25, v * 0.97, L, 0.1, 0.1, RED, { mat: "glow", col: false });
    for (let i = 0; i < n; i++) {
      const u0 = i * p, u1 = u0 + p;
      if (i % 2 === 0) F.beam(u0, 0.5, v, u1, H, v, 0.55, STEEL); else F.beam(u0, H, v, u1, 0.5, v, 0.55, STEEL);
      if (i % 2 === 1 && i < n - 1) F.beam(u1, 0.5, v, u1, H, v, 0.36, GUN, { col: false });
    }
    // 상판 밑 아치(포물선): 절벽에서 솟아 가운데서 상판에 붙는다
    let pu = 0, py = -D;
    for (let i = 1; i <= n; i++) {
      const u = i * p, t = (u - L / 2) / (L / 2), ya = -D + (D - 2.6) * (1 - t * t);
      F.beam(pu, py, v * 0.86, u, ya, v * 0.86, 1.1, BLK2);
      if (i < n) F.beam(u, ya, v * 0.86, u, -1.2, v * 0.86, 0.34, STEEL, { col: false });
      pu = u; py = ya;
    }
  }
  // 위·아래 가로재와 X 가새
  for (let i = 0; i <= n; i++) {
    const u = i * p, t = (u - L / 2) / (L / 2), ya = -D + (D - 2.6) * (1 - t * t);
    F.beam(u, H, -W / 2, u, H, W / 2, 0.5, STEEL);
    if (i < n) F.beam(u, H, (i % 2 ? 1 : -1) * W / 2, u + p, H, (i % 2 ? -1 : 1) * W / 2, 0.3, GUN, { col: false });
    if (i > 0 && i < n && i % 2 === 0) F.beam(u, ya, -W * 0.43, u, ya, W * 0.43, 0.5, STEEL, { col: false });
    if (i > 0 && i < n) K.blink.add(F.X(u, 0), y + H + 0.9, F.Z(u, 0), RED, 0.3, i);
  }
  // 양 끝 문틀 탑
  for (const u of [0, L]) {
    for (const sv of [-1, 1]) {
      const v = sv * (W / 2 + 1.4);
      F.box(u, -3, v, 2.4, H + 9, 2.4, BLK, { mat: "std:panel", tile: 4 });
      F.box(u, H + 6, v, 2.7, 0.5, 2.7, RED, { mat: "glow", col: false });
      F.box(u, H + 6.5, v, 1.6, 2.2, 1.6, IRON, { col: false });
      K.blink.add(F.X(u, v), y + H + 9.4, F.Z(u, v), RED, 0.45, sv > 0 ? 0 : 1);
    }
    F.box(u, H + 0.6, 0, 2.2, 2.4, W + 5, BLK, { mat: "std:panel", tile: 4 });
    F.box(u, H + 0.2, 0, 2.3, 0.4, W - 1, RED, { mat: "glow", col: false });
  }
  // 남쪽 끝: 고원에서 상판으로 오르는 짧은 경사로
  if (o.ramp) {
    const len = o.ramp * 4.2;
    F.box(-len / 2, -1.2 - o.ramp / 2, 0, len + 0.6, 1.2, W, IRON, { mat: "std:panel", tile: 6, rz: Math.atan(o.ramp / len) / DEG });
    F.box(-len / 2, -o.ramp - 4, 0, len, o.ramp + 2.8, W - 1, BLK2, { col: false });
  }
  // 북쪽 끝: 절벽에 박힌 관문(검은 문틀 + 붉게 빛나는 속)
  if (o.portal) {
    for (const sv of [-1, 1]) F.box(L + 4, -9, sv * (W / 2 + 3.6), 12, H + 16, 5.2, BLK, { mat: "std:panel", tile: 6 });
    F.box(L + 4, H + 1.2, 0, 12, 5.8, W + 12.4, BLK, { mat: "std:panel", tile: 6 });
    F.box(L + 4, -9, 0, 12, 7.8, W + 2, BLK2, { mat: "std:panel", tile: 6 });
    F.box(L + 8.5, 0, 0, 1.2, H + 1.2, W + 2, 0x2a0a0c, { col: true });
    for (const v of [-3.2, 0, 3.2]) F.box(L + 7.8, 0.4, v, 0.2, H - 0.4, 0.5, RED, { mat: "glow", col: false });
    F.box(L - 1.9, H + 3.4, 0, 0.3, 0.7, W + 6, RED, { mat: "glow", col: false });
    F.box(L - 1.9, H + 7.4, 0, 0.6, 0.5, W + 12.8, STEEL, { col: false });
    w.pool(F.X(L + 2, 0), y + 0.05, F.Z(L + 2, 0), 10, RED, 0.55);
  }
  F.gap(o.name ? `${o.name} 밑` : "철골 다리 밑", L / 2, -D * 0.5 - 6, 0, 0, L * 0.55, D + 6, 300);
  F.gap(o.name ? `${o.name} 트러스 관통` : "트러스 관통", L / 2, H * 0.5, 0, 90, W - 2, H - 1.6, 500);
  return { F, L, ry, n, p };
}

// ── 포탑(장식): 팔각 받침 + 머리 + 쌍열 포신. yaw 방향을 겨눈다 ──
export function turret(w, K, x, y, z, yaw, s = 1, o = {}) {
  const P = local(x, z, yaw), el = o.elev ?? 0.16;
  octa(w, x, y, z, 2.7 * s, 1.1 * s, IRON, { mat: "std:panel" });
  w.cyl(x, y + 1.1 * s, z, 1.9 * s, 1.3 * s, BLK2, { mat: "paint", rt: 1.5 * s, col: false });
  const [hx, hz] = P(0.3 * s, 0);
  w.box(hx, y + 2.4 * s, hz, 3.4 * s, 1.8 * s, 2.9 * s, BLK, { ry: yaw, mat: "std:panel", tile: 3 });
  const [ex, ez] = P(2.02 * s, 0);
  w.box(ex, y + 2.9 * s, ez, 0.12, 0.5 * s, 1.7 * s, RED, { ry: yaw, mat: "glow", col: false });
  for (const sv of [-0.72, 0.72]) {
    const [ax, az] = P(1.6 * s, sv * s), [bx, bz] = P(7.2 * s, sv * s);
    w.pipe(ax, y + 3.3 * s, az, bx, y + (3.3 + 5.6 * el) * s, bz, 0.3 * s, GUN, { col: false });
    const [mx, mz] = P(7.3 * s, sv * s);
    w.box(mx, y + (3.3 + 5.7 * el) * s - 0.3 * s, mz, 0.5 * s, 0.7 * s, 0.7 * s, IRON, { ry: yaw, col: false });
  }
  if (o.light !== false) K.blink.add(hx, y + 4.5 * s, hz, RED, 0.24 * s + 0.1, (x + z) & 1);
}

// ── 제국 수송정(세워 둔 것): 각진 동체 + 뒤로 젖힌 날개 + 꼬리날개. 기수는 yaw 방향 ──
export function shuttle(w, x, y, z, yaw, s = 1, o = {}) {
  const P = local(x, z, yaw), c1 = o.color ?? BLK2, c2 = o.color2 ?? IRON, gl = o.glow ?? RED;
  const B = (u, yy, v, su, sy, sv, c, oo = {}) => { const [px, pz] = P(u * s, v * s); return w.box(px, y + yy * s, pz, su * s, sy * s, sv * s, c, { col: false, ...oo, ry: yaw + (oo.ry || 0) }); };
  B(0, 1.0, 0, 9, 2.3, 3.6, c1, { mat: "std:panel", tile: 4, col: true });
  B(5.5, 1.2, 0, 2.4, 1.6, 2.7, c2);
  B(7.1, 1.4, 0, 1.2, 1.0, 1.7, c1);
  B(3.6, 2.9, 0, 2.2, 0.5, 2.0, gl, { mat: "glow" });
  B(-0.8, 1.9, 3.7, 4.6, 0.36, 4.4, c2, { ry: -20 }); B(-0.8, 1.9, -3.7, 4.6, 0.36, 4.4, c2, { ry: 20 });
  B(-1.6, 2.0, 5.9, 2.2, 0.2, 0.4, gl, { mat: "glow", ry: -20 }); B(-1.6, 2.0, -5.9, 2.2, 0.2, 0.4, gl, { mat: "glow", ry: 20 });
  B(-3.7, 3.2, 0, 2.6, 2.4, 0.4, c2);
  for (const v of [-1.05, 1.05]) { B(-4.7, 1.3, v, 0.6, 1.4, 1.4, c2); B(-5.05, 1.5, v, 0.2, 1.0, 1.0, o.engine ?? ORG, { mat: "glow" }); }
  for (const [u, v] of [[2.6, 1.5], [2.6, -1.5], [-2.6, 1.5], [-2.6, -1.5]]) B(u, 0, v, 0.5, 1.0, 0.5, GUN);
}

// ── 원통 연료 탱크: 몸통 + 띠 + 둥근 지붕 + 꼭대기 난간·표시등 ──
export function fuelTank(w, K, x, y, z, r, h, color = IRON) {
  w.cyl(x, y, z, r, h, color, { mat: "std:panel", tile: 5 });
  for (const f of [0.08, 0.5, 0.92]) w.cyl(x, y + h * f - 0.25, z, r + 0.14, 0.5, f === 0.5 ? DRED : BLK2, { col: false, ao: false });
  dome(w, x, y + h, z, r * 0.98, BLK2, { sy: 0.22, col: false });
  w.cyl(x, y + h, z, r * 0.82, 0.7, STEEL, { col: false, mat: "paint" });
  w.cyl(x, y + h + r * 0.2, z, 0.9, 1.6, GUN, { col: false });
  K.blink.add(x, y + h + r * 0.2 + 2, z, RED, 0.4, (x * 3 + z) & 1);
  // 사다리 + 붉은 수위 표시
  w.box(x + r + 0.2, y, z, 0.3, h, 0.9, GUN, { col: false });
  w.box(x - r - 0.06, y + h * 0.15, z, 0.1, h * 0.6, 0.7, RED, { mat: "glow", col: false });
}
// 구형 가스 탱크: 네 다리 위의 공
export function gasSphere(w, K, x, y, z, r) {
  w.sph(x, y + r * 1.25, z, r, ASH, { mat: "paint" });
  ring(w, x, y + r * 1.25, z, r * 1.01, 0.22, DRED, { pitch: 90, col: false, seg: 24 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) w.pipe(x + sx * r * 0.62, y, z + sz * r * 0.62, x + sx * r * 0.55, y + r * 0.9, z + sz * r * 0.55, 0.3, GUN, { col: false });
  K.blink.add(x, y + r * 2.35, z, RED, 0.36, 1);
}

// ── 안테나 철탑: 가는 격자 기둥 + 가로대 + 꼭대기 깜박이 ──
export function mast(w, K, x, y, z, h, o = {}) {
  const c = o.color ?? GUN, t = o.t ?? 0.28;
  w.box(x, y, z, 2.2, 0.8, 2.2, o.base ?? IRON, { mat: "paint" });
  beam(w, [x, y + 0.8, z], [x, y + h, z], t, c);
  for (let i = 1; i <= 3; i++) { const yy = y + h * (0.45 + i * 0.15), l = 2.4 - i * 0.5; beam(w, [x - l, yy, z], [x + l, yy, z], t * 0.6, c, { col: false }); beam(w, [x, yy, z - l], [x, yy, z + l], t * 0.6, c, { col: false }); }
  for (const [sx, sz] of [[1, 0], [-0.5, 0.87], [-0.5, -0.87]]) beam(w, [x + sx * h * 0.22, y, z + sz * h * 0.22], [x, y + h * 0.7, z], 0.07, 0x15171b, { col: false });
  K.blink.add(x, y + h + 0.5, z, o.light ?? RED, 0.42, o.group ?? ((x + z) & 1));
}

// ── 붉은 등대(낮은 기둥 등): 길가·난간·착륙장 가장자리 ──
export function post(w, x, y, z, h = 2.4, color = RED, pool = 5) {
  w.box(x, y, z, 0.32, h, 0.32, IRON, { col: false });
  w.box(x, y + h, z, 0.5, 0.36, 0.5, color, { mat: "glow", col: false });
  if (pool) w.pool(x, y, z, pool, color, 0.4);
}

// ── 강철 고슴도치(대전차 장애물)와 콘크리트 블록 ──
export function hedgehog(w, x, y, z, s = 1, ry = 0) {
  const P = local(x, z, ry), a = 1.3 * s;
  for (const [p, q] of [[[-a, 0, -a], [a, a * 1.7, a]], [[a, 0, -a], [-a, a * 1.7, a]], [[0, a * 0.2, a * 1.3], [0, a * 1.5, -a * 1.3]]]) {
    const [x0, z0] = P(p[0], p[2]), [x1, z1] = P(q[0], q[2]);
    beam(w, [x0, y + p[1], z0], [x1, y + q[1], z1], 0.26 * s, RUST, { col: false });
  }
  w.col.addSphere(V3(x, y + a * 0.8, z), a * 0.8);
}

// ── 탐조등: 꼭대기에서 비스듬히 아래를 비추며 천천히 도는 빛 원뿔. 바닥(지형 높이)에 빛 원이 따라다닌다 ──
// list: [x, y, z, 위상, 각속도, 기울기(도), 길이?, 색?]
export function searchlights(w, list, color = 0xff3a30) {
  if (!list.length) return;
  const cm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const tex = radialTex();
  const sm_ = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  const disc = new THREE.PlaneGeometry(1, 1); disc.rotateX(-Math.PI / 2);
  const headG = new THREE.CylinderGeometry(1.0, 1.3, 1.6, 8), headM = new THREE.MeshBasicMaterial({ color: 0xffb8a8 });
  const items = list.map(([x, y, z, ph, sp, tilt, L = 150]) => {
    const R = L * 0.085, cone = new THREE.CylinderGeometry(0.5, R, L, 16, 1, true); cone.translate(0, -L / 2, 0);
    const pivot = new THREE.Group(); pivot.position.set(x, y, z);
    const arm = new THREE.Group(); arm.rotation.x = tilt * DEG; pivot.add(arm);
    const m = new THREE.Mesh(cone, cm); m.renderOrder = 6; m.frustumCulled = false; arm.add(m);
    const head = new THREE.Mesh(headG, headM); head.position.y = -0.6; arm.add(head);
    const spot = new THREE.Mesh(disc, sm_); spot.renderOrder = 3; spot.frustumCulled = false;
    w.scene.add(pivot, spot); w.disposables.push(cone);
    return { pivot, spot, ph, sp, tilt: tilt * DEG, y, L, R };
  });
  w.disposables.push(cm, sm_, disc, tex, headG, headM);
  w.updaters.push((dt, t) => {
    for (const it of items) {
      const a = it.ph + t * it.sp + Math.sin(t * 0.37 + it.ph) * 0.5;
      it.pivot.rotation.y = a;
      const dy = -Math.cos(it.tilt), dh = Math.sin(it.tilt), dx = -dh * Math.sin(a), dz = -dh * Math.cos(a);
      // 빛줄기를 따라 내려가다 지형에 닿는 곳을 찾는다
      let tt = it.L, hit = false;
      for (let d = 12; d < it.L; d += 9) { const px = it.pivot.position.x + dx * d, pz = it.pivot.position.z + dz * d; if (it.y + dy * d < height(px, pz) + 0.5) { tt = d; hit = true; break; } }
      const gx = it.pivot.position.x + dx * tt, gz = it.pivot.position.z + dz * tt, s = it.R * (tt / it.L) * 2.4;
      it.spot.position.set(gx, height(gx, gz) + 0.25, gz);
      it.spot.scale.set(s, 1, s);
      it.spot.visible = hit;
    }
  });
}
function radialTex() {
  const S = 128, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,0.55)"); gr.addColorStop(0.7, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── 불꽃(플레어 스택·용접 불): 일렁이는 원뿔 두 겹. list: [x, y, z, 크기] — 인스턴스 메시 하나 ──
export function flames(w, list) {
  if (!list.length) return;
  const g = new THREE.ConeGeometry(1, 1, 7, 1, true); g.translate(0, 0.5, 0);
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(g, m, list.length * 2); im.frustumCulled = false; im.renderOrder = 5;
  const c = new THREE.Color();
  list.forEach((f, i) => { im.setColorAt(i * 2, c.setRGB(2.6, 0.9, 0.18)); im.setColorAt(i * 2 + 1, c.setRGB(3.0, 2.1, 0.7)); });
  w.scene.add(im); w.disposables.push(g, m);
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  w.updaters.push((dt, t) => {
    list.forEach(([x, y, z, k], i) => {
      const f = 0.8 + 0.22 * Math.sin(t * 9 + i * 2.1) + 0.14 * Math.sin(t * 23 + i), lean = 0.22 + 0.08 * Math.sin(t * 1.3 + i);
      e.set(0, 0, -lean); q.setFromEuler(e);
      tm.compose(p.set(x, y, z), q, s.set(k * 0.95, k * 4.2 * f, k * 0.95)); im.setMatrixAt(i * 2, tm);
      tm.compose(p.set(x, y, z), q, s.set(k * 0.5, k * 2.6 * f, k * 0.5)); im.setMatrixAt(i * 2 + 1, tm);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

// ── 먼지 회오리: 위로 넓어지는 반투명 깔때기 여러 겹이 돌며 떠돈다. list: [cx, cz, 떠도는 반경, 높이, 굵기, 위상] ──
export function dustDevils(w, list, groundFn = height) {
  if (!list.length) return;
  const g = new THREE.CylinderGeometry(1, 0.16, 1, 10, 5, true); g.translate(0, 0.5, 0);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i), a = y * 5; P.setX(i, P.getX(i) + Math.sin(a) * 0.16 * y); P.setZ(i, P.getZ(i) + Math.cos(a) * 0.16 * y); }
  const m = new THREE.MeshBasicMaterial({ color: 0xa8683c, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide });
  const items = list.map(([cx, cz, R, h, rad, ph]) => {
    const grp = new THREE.Group();
    for (let k = 0; k < 3; k++) { const me = new THREE.Mesh(g, m); me.scale.set(rad * (1 - k * 0.28), h * (1 - k * 0.12), rad * (1 - k * 0.28)); me.renderOrder = 4; grp.add(me); }
    w.scene.add(grp);
    return { grp, cx, cz, R, ph };
  });
  w.disposables.push(g, m);
  w.updaters.push((dt, t) => {
    for (const it of items) {
      const a = it.ph + t * 0.05, x = it.cx + Math.cos(a) * it.R + Math.sin(t * 0.21 + it.ph) * 8, z = it.cz + Math.sin(a * 1.3) * it.R;
      it.grp.position.set(x, groundFn(x, z) - 0.5, z);
      it.grp.children.forEach((c, k) => { c.rotation.y = t * (2.2 + k * 0.9) + it.ph; });
    }
  });
}

// ── 연기: 바람에 누우며 피어오르는 반투명 덩어리(플레어 스택·먼 연기 기둥). 덩어리는 오르며 커지고 옅어진다 ──
// list: [x, y, z, 굵기, 오르는 높이, 덩어리 수, 색] — 색마다 재질 하나, 모두 같은 구 지오메트리
export function smoke(w, list) {
  if (!list.length) return;
  const g = new THREE.SphereGeometry(1, 9, 7), mats = new Map(), puffs = [];
  for (const [x, y, z, rad, rise, n, color = 0x4a352c] of list) {
    if (!mats.has(color)) mats.set(color, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false }));
    for (let i = 0; i < n; i++) { const me = new THREE.Mesh(g, mats.get(color)); me.renderOrder = 4; w.scene.add(me); puffs.push([me, x, y, z, rad, rise, i / n + hash(x, z)]); }
  }
  w.disposables.push(g, ...mats.values());
  w.updaters.push((dt, t) => {
    for (const [me, x, y, z, rad, rise, ph] of puffs) {
      const u = (t * 0.045 + ph) % 1;
      me.position.set(x + u * u * rise * 0.7 + Math.sin(ph * 40 + t * 0.4) * rad * 0.45, y + u * rise + Math.cos(ph * 70) * rad * 0.4, z + u * rise * 0.15 + Math.cos(ph * 55) * rad * 0.4);
      const s = rad * (0.6 + u * 2.4) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 2.5) + 0.001;
      me.scale.set(s * 1.15, s * (0.9 + 0.2 * Math.sin(ph * 90)), s * 1.05);
    }
  });
}
