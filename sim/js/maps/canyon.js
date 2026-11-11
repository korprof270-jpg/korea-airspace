// 맵: 붉은 협곡 — 강이 굽이치는 사암 협곡과 고원. 흔들다리·암석 아치·풍력 발전기
import * as THREE from "../../vendor/three.module.min.js";

// ── 지형 높이 함수 ─────────────────────────────────────────
function hash(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, t = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); t += a; x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s / t; }
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const riverX = (z) => 70 * Math.sin(z * 0.011) + 28 * Math.sin(z * 0.027 + 1.3);

// 계곡 안의 바위 기둥 [x, z, 반경, 높이]
const SPIRES = [[riverX(30) + 34, 30, 11, 40], [riverX(-150) - 36, -150, 13, 52], [riverX(190) - 30, 190, 9, 30]];
// 평평하게 다진 터 [x, z, 반경] — 기지·캠프·착륙장
const FLATS = [[-190, 160, 34], [200, -150, 34], [-170, -40, 16], [190, 100, 16], [riverX(230) + 26, 230, 15], [riverX(60) - 26, 60, 13], [riverX(-190) + 27, -190, 13], [120, -30, 14]];

function raw(x, z) {
  const d = Math.abs(x - riverX(z));
  const n = fbm(x * 0.007, z * 0.007), n2 = fbm(x * 0.028 + 7, z * 0.028 + 3, 3), n3 = vnoise(x * 0.11, z * 0.11);
  const wall = sm(15, 62 + n2 * 34, d);
  let plateau = 44 + n * 46 + n2 * 9;
  plateau += (Math.round(plateau / 10) * 10 - plateau) * 0.5;         // 계단식 지층
  const rg = 1 - Math.abs(vnoise(x * 0.05 + 3, z * 0.05 + 8) * 2 - 1), rg2 = 1 - Math.abs(vnoise(x * 0.13, z * 0.13 + 5) * 2 - 1);
  let h = Math.pow(wall, 1.7) * plateau + (rg * rg * 8 + rg2 * 2.4) * Math.min(1, wall * (1 - wall) * 5 + wall * 0.12);   // 절벽의 능선·바위 주름
  h += (n2 - 0.5) * 3.2 * (1 - wall) + 1.7 + (n3 - 0.5) * 0.7;
  h -= 5.4 * (1 - sm(0, 13, d));                                       // 강바닥
  for (const [sx, sz, r, sh] of SPIRES) { const k = sm(r, r * 0.5, Math.hypot(x - sx, z - sz)); if (k > 0) h = Math.max(h, k * (sh + (n3 - 0.5) * 3)); }
  return h;
}
const FLAT_H = FLATS.map(([x, z]) => raw(x, z));
export function height(x, z) {
  let h = raw(x, z);
  for (let i = 0; i < FLATS.length; i++) {
    const [fx, fz, r] = FLATS[i], d = Math.hypot(x - fx, z - fz);
    if (d < r * 1.7) h += (FLAT_H[i] - h) * sm(r * 1.7, r, d);
  }
  return h;
}

function colorFn(x, y, z, slope) {
  const n = fbm(x * 0.02 + 3, z * 0.02 + 5, 3), d = Math.abs(x - riverX(z));
  const c = new THREE.Color();
  if (y < 1.1 && d < 22) return c.set(0xe6d3a4).lerp(new THREE.Color(0x9b8a62), sm(0.9, -1.5, y)).getHex();       // 강가 모래
  if (d < 60 && y < 12) return c.set(0x9cc24e).lerp(new THREE.Color(0xc8b060), n * 0.7 + sm(0.1, 0.35, slope) * 0.3).getHex(); // 계곡 초지
  const n2 = fbm(x * 0.07 + 9, z * 0.07 + 2, 2);
  return c.set(0xd0a56a).lerp(new THREE.Color(0x8fa04c), sm(0.38, 0.62, n) * 0.85).lerp(new THREE.Color(0xb98a52), sm(0.55, 0.8, n2) * 0.5).lerp(new THREE.Color(0xe2c79a), sm(70, 95, y) * 0.4).getHex(); // 고원
}

function build(w) {
  const r = w.rand;
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.4, 1.36, 1.2", rockTint: "1.32, 0.8, 0.55", rockLo: 0.2, rockHi: 0.4 });
  w.water(0, 0x1e6a70);
  const H = (x, z) => w.h(x, z);
  const slope = (x, z) => Math.max(Math.abs(H(x + 2, z) - H(x - 2, z)), Math.abs(H(x, z + 2) - H(x, z - 2))) / 4;
  const ROCK = 0xc98a5a;

  // ── 흔들다리 (z = -70) ──
  {
    const bz = -70, cx = riverX(bz), y = 27;
    let xl = cx, xr = cx;
    while (H(xl, bz) < y - 0.5 && xl > cx - 120) xl -= 1;
    while (H(xr, bz) < y - 0.5 && xr < cx + 120) xr += 1;
    xl -= 2; xr += 2;
    const span = xr - xl, n = Math.round(span / 1.25), sag = 2.6;
    const yAt = (t) => y + 0.4 - sag * 4 * t * (1 - t);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = xl + span * t;
      w.box(x, yAt(t), bz, 1.05, 0.12, 2.6, i % 7 === 3 ? 0x7a5a3a : 0x9a7446, { mat: "std:wood", tile: 2, rz: -Math.atan(sag * 4 * (1 - 2 * t) / span) * 57.3, col: i % 2 === 0 });
    }
    for (const s of [-1.3, 1.3]) {
      for (let i = 0; i < 16; i++) {
        const t0 = i / 16, t1 = (i + 1) / 16;
        w.pipe(xl + span * t0, yAt(t0) + 1.25, bz + s, xl + span * t1, yAt(t1) + 1.25, bz + s, 0.045, 0x4a3a28, { col: false });
        w.pipe(xl + span * t0, yAt(t0) + 0.08, bz + s, xl + span * t1, yAt(t1) + 0.08, bz + s, 0.05, 0x4a3a28, { col: false });
        if (i % 2) w.pipe(xl + span * t0, yAt(t0) + 0.08, bz + s, xl + span * t0, yAt(t0) + 1.25, bz + s, 0.025, 0x4a3a28, { col: false });
      }
      for (const [x, yy] of [[xl, y], [xr, y]]) w.pipe(x, yy - 1.5, bz + s, x, yy + 2.4, bz + s, 0.22, 0x5a4026);
    }
    w.gap("흔들다리 아래", cx, 12, bz, 0, 34, 22, 350);
    w.gap("흔들다리 위 스치기", cx, y + 2.6, bz, 0, 30, 3.4, 450);
    build.bridge = { x: cx, y, z: bz };
  }

  // ── 암석 아치 (z = 112, 강을 가로지름) ──
  {
    const az = 112, cx = riverX(az);
    for (const s of [-1, 1]) {
      let y = H(cx + s * 17, az) - 1;
      for (let i = 0; i < 6; i++) { const rr = 6.2 - i * 0.55 + r(); w.blob(cx + s * (17 - i * 0.9) + (r() - 0.5), y + rr * 0.6, az + (r() - 0.5) * 2, rr, rr * 0.85, rr * 0.95, ROCK, { mat: "std:rock", grad: [0.55, 1.1] }); y += rr * 0.95; }
    }
    for (let i = 0; i < 7; i++) { const t = i / 6, x = cx - 14 + t * 28, yy = 25 + Math.sin(t * Math.PI) * 3.2; w.blob(x, yy, az + (r() - 0.5) * 1.5, 4.6, 3.1 + Math.sin(t * Math.PI), 4.4, ROCK, { mat: "std:rock", grad: [0.5, 1.12] }); }
    w.gap("암석 아치", cx, 11.5, az, 0, 20, 20, 400);
  }

  // ── 전망대 (고원 가장자리) ──
  {
    const tx = 120, tz = -30, y = H(tx, tz);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) w.pipe(tx + dx * 1.25, y - 0.5, tz + dz * 1.25, tx + dx, y + 13, tz + dz, 0.2, 0x6a4a2c);
    for (const dy of [4.5, 9]) for (const [a, b] of [[[-3, -3], [3, -3]], [[3, -3], [3, 3]], [[3, 3], [-3, 3]], [[-3, 3], [-3, -3]]])
      w.pipe(tx + a[0] * (1.2 - dy * 0.015), y + dy, tz + a[1] * (1.2 - dy * 0.015), tx + b[0] * (1.2 - dy * 0.015), y + dy, tz + b[1] * (1.2 - dy * 0.015), 0.1, 0x6a4a2c);
    w.box(tx, y + 13, tz, 8, 0.25, 8, 0x9a7446, { mat: "std:wood", tile: 2 });
    for (const s of [-1, 1]) { w.box(tx + s * 3.9, y + 13.25, tz, 0.12, 1.1, 8, 0x7a5a3a, { mat: "std:wood", tile: 2 }); w.box(tx, y + 13.25, tz + s * 3.9, 8, 1.1, 0.12, 0x7a5a3a, { mat: "std:wood", tile: 2 }); }
    for (const [dx, dz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) w.pipe(tx + dx, y + 13.2, tz + dz, tx + dx, y + 16.2, tz + dz, 0.1, 0x6a4a2c);
    w.box(tx, y + 16.2, tz, 9.4, 0.25, 9.4, 0x5a3d28, { mat: "std:wood", tile: 2 });
    w.cone(tx, y + 16.4, tz, 6.2, 2.4, 0x7a4a34, { mat: "std", col: false, grad: [0.8, 1.05] });
    w.gap("전망대 다리 사이", tx, y + 6.5, tz, 0, 6, 12, 400); w.gap("전망대 다리 사이", tx, y + 6.5, tz, 90, 6, 12, 400);
    w.gap("전망대 난간 통과", tx, y + 14.8, tz, 0, 7, 2.6, 800);
  }

  // ── 풍력 발전기 (고원) ──
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.4 });
  for (const [x, z, ph] of [[-150, 40, 0], [-210, -80, 1.2], [205, 20, 2.1], [150, 190, 0.6]]) {
    const y = H(x, z), th = 46;
    w.cyl(x, y - 1, z, 1.7, th + 1, 0xeeeeea, { rt: 0.95, mat: "paint" });
    w.box(x, y + th - 0.4, z + 1.2, 2.4, 2.2, 6.4, 0xe4e4e0, { mat: "paint", ao: false });
    const hub = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 21, 0.3), bladeMat);
      b.geometry.translate(0, 11, 0);
      const p = b.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) { const t = p.getY(k) / 21; p.setX(k, p.getX(k) * (1 - t * 0.72)); }
      b.rotation.z = (i / 3) * Math.PI * 2; b.castShadow = true;
      hub.add(b);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), bladeMat); nose.scale.z = 1.5; hub.add(nose);
    hub.position.set(x, y + th + 0.7, z - 2.4);
    hub.rotation.z = ph;
    w.scene.add(hub);
    w.updaters.push((dt) => { hub.rotation.z += dt * 0.9; });
    w.sph(x, y + th + 2.2, z + 3.6, 0.3, 0xff3030, { mat: "glow", col: false });
  }

  // ── 캠프(오두막·텐트·모닥불) ──
  const camp = (x, z, ry) => {
    const y = H(x, z);
    w.box(x - 6, y - 0.3, z - 4, 6, 3.4, 5, 0x8a623c, { mat: "std:wood", tile: 2, ry });
    w.box(x - 6, y + 3, z - 4, 7, 0.3, 6, 0x4f3423, { mat: "std:wood", tile: 2, ry, rz: 0 });
    w.cone(x - 6, y + 3.2, z - 4, 4.8, 2.2, 0x5a3a28, { mat: "std", col: false, grad: [0.8, 1.05] });
    for (const [dx, dz, c] of [[5, -3, 0xd9772f], [7, 3, 0x3f7fb5]]) w.cone(x + dx, y - 0.1, z + dz, 2.1, 2.3, c, { mat: "std", grad: [0.7, 1.05] });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; w.blob(x + Math.cos(a) * 0.9, y + 0.15, z + 4 + Math.sin(a) * 0.9, 0.3, 0.25, 0.3, 0x6a655d, { mat: "std:rock", col: false }); }
    w.cone(x, y + 0.1, z + 4, 0.45, 1.1, 0xff8a2a, { mat: "glow", col: false });
    w.pool(x, y + 0.05, z + 4, 6, 0xff9a4a, 0.5);
    w.pipe(x + 9, y, z - 6, x + 9, y + 6, z - 6, 0.06, 0xdadada);
    w.box(x + 9.8, y + 4.8, z - 6, 1.6, 1.0, 0.04, 0xe94f37, { col: false, ao: false });
  };
  camp(riverX(230) + 26, 230, 10); camp(riverX(60) - 26, 60, -20); camp(riverX(-190) + 27, -190, 30); camp(-170, -40, 0); camp(190, 100, 60);

  // ── 폭포(서쪽 절벽) ──
  {
    const fz = 20, cx = riverX(fz);
    let x = cx - 20; while (H(x, fz) < 38 && x > cx - 140) x -= 1;
    const top = H(x, fz);
    for (let i = 0; i < 5; i++) w.box(x + 3 + i * 3.4, 0, fz + (i % 2 ? 0.6 : -0.6), 2.2, Math.max(2, top - i * 8.5), 3.2 - i * 0.2, 0xdff3ff, { mat: "glass", col: false, rz: -4 });
    for (let i = 0; i < 6; i++) w.blob(cx - 12 + r() * 6, 0.6, fz + (r() - 0.5) * 8, 2 + r() * 2, 1.2, 2 + r() * 2, 0xffffff, { mat: "glass", col: false, grad: [1, 1] });
  }

  // ── 식생·바위 (차량 경로와 거점 주변은 비운다) ──
  const KEEP = [[riverX(0) + 20, 0, 6], [-150, -120, 6], [170, 60, 6], [riverX(-140) - 20, -140, 6], [-150, -70, 5], [170, 130, 5]];
  const LINES = [BUGGY.map((p) => [p[0], p[2]]), MESA.map((g) => [g.p[0], g.p[2]]), RIDGE.map((g) => [g.p[0], g.p[2]])];
  const clear = (x, z) => {
    if (FLATS.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr + 4) || KEEP.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr)) return false;
    for (const L of LINES) for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[(i + 1) % L.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 10) return false;
    }
    return true;
  };
  let n = 0, guard = 0;
  while (n < 520 && guard++ < 9000) {
    const x = (r() * 2 - 1) * 420, z = (r() * 2 - 1) * 420, y = H(x, z), d = Math.abs(x - riverX(z));
    if (y < 1.6 || slope(x, z) > 0.42 || !clear(x, z)) continue;
    if (Math.abs(z + 70) < 6 || (Math.abs(z - 112) < 9 && d < 26) || Math.hypot(x - 120, z + 30) < 10) continue;
    const dense = fbm(x * 0.013 + 40, z * 0.013 + 11, 2);
    if (d > 60 && dense < 0.47) continue;                       // 고원은 군락 형태로만
    if (d < 60 && d < 14) continue;
    w.tree(x, z, 0.8 + r() * 0.8, d < 60 && r() < 0.35 ? "round" : "pine");
    n++;
  }
  // 계곡 바닥 숲
  for (let i = 0; i < 900 && n < 800; i++) {
    const z = (r() * 2 - 1) * 330, x = riverX(z) + (r() < 0.5 ? -1 : 1) * (15 + r() * 38), y = H(x, z);
    if (y < 1.4 || y > 16 || slope(x, z) > 0.4 || !clear(x, z)) continue;
    if (Math.abs(z + 70) < 6 || Math.abs(z - 112) < 12) continue;
    w.tree(x, z, 0.8 + r() * 0.7, r() < 0.6 ? "round" : "pine");
    n++;
  }
  for (let i = 0; i < 620; i++) {
    const x = (r() * 2 - 1) * 380, z = (r() * 2 - 1) * 380, y = H(x, z);
    if (y < -0.5 || slope(x, z) > 0.8 || !clear(x, z)) continue;
    if (r() < 0.45) w.tree(x, z, 0.7 + r() * 0.7, "bush"); else w.rock(x, z, 0.7 + r() * r() * 3.2, ROCK);
  }
  // 강 위의 바위
  for (let z = -280; z < 280; z += 26 + r() * 30) { const x = riverX(z) + (r() < 0.5 ? -1 : 1) * (6.5 + r() * 3); if (Math.abs(z - 112) > 14 && Math.abs(z + 70) > 8) w.blob(x, 0.1, z, 1.3 + r() * 1.1, 1 + r(), 1.3 + r() * 1.1, 0xb08a68, { mat: "std:rock" }); }
}

const BUGGY = [[150, 0, 150, 13], [176, 0, 96, 11], [206, 0, 40, 14], [226, 0, -30, 13], [200, 0, -100, 12], [150, 0, -84, 11], [128, 0, -58, 9], [144, 0, 40, 13], [124, 0, 110, 12]];

// 지면 높이 + up 지점
const T = (x, z, up) => [x, height(x, z) + up, z];
const G = (t, p, o = {}) => ({ t, p, ...o });
const RV = (z, y, dx = 0) => [riverX(z) + dx, y, z];

const MESA = [
  G("square", T(150, 10, 12), { w: 6, h: 4.6 }), G("square", T(136, -30, 11), { w: 7, h: 5 }), G("ring", T(150, -80, 13), { r: 3 }), G("square", T(196, -96, 13), { w: 6, h: 4.6 }),
  G("ring", T(232, -40, 15), { r: 3 }), G("square", T(222, 20, 24), { w: 7, h: 5 }), G("ring", T(214, 70, 14), { r: 3 }), G("square", T(178, 98, 12), { w: 7, h: 5 }), G("ring", T(152, 60, 12), { r: 3 }),
];
const RIDGE = [
  G("square", RV(160, 7), { w: 7, h: 5 }), G("ring", RV(112, 11.5), { r: 4 }), G("ring", RV(70, 17), { r: 3.4 }), G("ring", RV(30, 31, -6), { r: 3.4 }), G("ring", RV(-10, 47), { r: 3.4 }),
  G("square", RV(-46, 53), { w: 9, h: 9, pitch: -90, yaw: 0 }), G("ring", RV(-70, 10), { r: 4 }), G("ring", RV(-112, 9), { r: 3.4 }), G("ring", RV(-178, 10, 6), { r: 3.4 }),
  G("ring", RV(-122, 9, 13), { r: 3.2 }), G("ring", RV(-70, 14, 13), { r: 3.2 }), G("ring", RV(-10, 9, 12), { r: 3.2 }), G("ring", RV(52, 10, -12), { r: 3.2 }),
  G("ring", RV(112, 15, 32), { r: 3.2 }), G("ring", RV(204, 11, 6), { r: 3.4 }),
];

export default {
  id: "canyon",
  name: "붉은 협곡",
  desc: "강이 굽이치는 사암 협곡과 고원. 흔들다리 아래, 암석 아치, 풍력 발전기 사이를 비행",
  size: 300,
  ceiling: 190,
  seed: 51,
  env: {
    sky: { top: 0x3a66b0, horizon: 0xffd2a0, bottom: 0xc79a78 }, sunDir: [0.62, 0.36, -0.55], sunColor: 0xffc890, sun: 3.6,
    hemi: 0.4, hemiSky: 0xbcd0ff, hemiGround: 0x8a5a3a, cloud: 0.52, cloudLit: 0xfff0dc, cloudDark: 0xb08a90,
    fog: { color: 0xeccaa2, near: 220, far: 1700 }, exposure: 1.0,
  },
  spawn: { pos: [riverX(230) + 26, 0, 222], yaw: 0 },
  build,
  tracks: [
    {
      id: "run", name: "협곡 런", level: 1, loop: false, desc: "강을 따라 내려가며 암석 아치와 흔들다리 아래를 통과하는 구간 주행",
      start: { pos: [riverX(262) + 4, 0, 262], yaw: 0 },
      gates: [
        G("hoop", RV(228, 9)), G("hoop", RV(190, 12, 6)), G("hoop", RV(150, 10)), G("hoop", RV(112, 11.5, 0), { r: 6 }), G("hoop", RV(74, 9)), G("hoop", RV(36, 12, -8)),
        G("hoop", RV(0, 9)), G("hoop", RV(-36, 11)), G("hoop", RV(-70, 12, 0), { r: 6 }), G("hoop", RV(-108, 9)), G("hoop", RV(-146, 13, 10)), G("hoop", RV(-184, 9)), G("hoop", RV(-224, 11)), G("hoop", RV(-262, 14)),
      ],
    },
    { id: "mesa", name: "고원 슬라럼", level: 2, laps: 2, desc: "전망대와 풍력 발전기 사이를 누비는 고원 코스", gates: MESA },
    { id: "ridge", name: "협곡 왕복", level: 3, laps: 2, desc: "협곡을 치솟아 다리 너머로 급강하한 뒤 좁은 계곡에서 되돌아오는 고난도 코스", start: { pos: [riverX(180) + 15, 0, 180], yaw: 8 }, gates: RIDGE },
  ],
  tracking: [
    {
      id: "boat", name: "강 위의 보트", type: "boat", level: 1, desc: "굽이치는 강을 내려가는 보트를 따라가세요", duration: 78, closed: false,
      path: Array.from({ length: 27 }, (_, i) => { const z = 260 - i * 20; return [riverX(z), 0.15, z, 7]; }),
    },
    {
      id: "buggy", name: "오프로드 버기", type: "sportscar", level: 2, desc: "고원을 달리는 버기 추적. 언덕 뒤로 숨는 순간을 조심하세요", duration: 80, color: 0xd9772f,
      path: BUGGY,
    },
    {
      id: "drone", name: "협곡 드론", type: "drone", level: 3, desc: "협곡을 오르내리는 드론을 화면에 담으세요", duration: 75,
      path: [RV(200, 14), RV(150, 20, 10), RV(112, 12), RV(60, 24, -14), RV(10, 40, 20), RV(-40, 22), RV(-70, 12), RV(-120, 30, -18), RV(-70, 44, 30), RV(-10, 56, -30), RV(70, 48, 30), RV(150, 36, -20)].map((p) => [...p, 12]),
    },
  ],
  combat: { blue: [-190, 160], red: [200, -150], depots: [[riverX(0) + 20, 0], [-150, -120], [170, 60], [riverX(-140) - 20, -140]] },
  supply: {
    depot: [riverX(230) + 13, 239],
    camps: [[riverX(60) - 26, 64], [-170, -36], [riverX(-190) + 27, -186], [190, 104]],
    turrets: [[-150, -70], [170, 130]],
  },
};
