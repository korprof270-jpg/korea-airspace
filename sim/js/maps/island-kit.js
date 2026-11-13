// 화산섬 제작 도구: 야자수, 초가 오두막, 흐르는 용암 재질·띠, 갈매기, 작은 배·수상기 부품
import * as THREE from "../../vendor/three.module.min.js";
import { M, prop } from "./canyon-kit.js";

const DEG = Math.PI / 180;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ── 야자수 ───────────────────────────────────────────────
// 잎 한 장: 휘어 늘어지는 V 자 단면의 띠(양면)
function frondGeo(len, up, droop, width, yaw, segs = 3) {
  const pos = [], c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (t, side) => {
    const r = len * t, y = up * len * t - droop * len * t * t, wd = width * Math.sin(Math.PI * (0.12 + 0.86 * t)) * side;
    return [c * r - s * wd, y - Math.abs(wd) * 0.45, s * r + c * wd];
  };
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    for (const sd of [-1, 1]) {
      const a = P(t0, 0), b = P(t1, 0), e = P(t0, sd), f = P(t1, sd);
      const quad = sd > 0 ? [a, e, f, a, f, b] : [a, f, e, a, b, f];
      for (const q of quad) pos.push(...q);
      for (let k = quad.length - 1; k >= 0; k--) pos.push(...quad[k]);          // 뒷면
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
function mergeGeo(list) {
  let n = 0;
  for (const g of list) n += (g.index ? g.index.count : g.attributes.position.count);
  const pos = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    const P = g.attributes.position, I = g.index, cnt = I ? I.count : P.count;
    for (let i = 0; i < cnt; i++, o++) { const k = I ? I.getX(i) : i; pos[o * 3] = P.getX(k); pos[o * 3 + 1] = P.getY(k); pos[o * 3 + 2] = P.getZ(k); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  out.computeBoundingBox();
  return out;
}
let PALM = null;
const BEND = [0.2, 0.3, 0.12];
function palmTpl() {
  if (PALM) return PALM;
  let sd = 5;
  const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  PALM = BEND.map((bend) => {
    // 줄기: 높이 1, 위로 갈수록 가늘고 한쪽으로 휜다
    const tr = new THREE.CylinderGeometry(0.02, 0.036, 1, 5, 3, true); tr.translate(0, 0.5, 0);
    const P = tr.attributes.position;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + bend * y * y); }
    const nuts = [0, 1, 2].map((i) => { const g = new THREE.OctahedronGeometry(0.03, 0); g.translate(bend + Math.cos(i * 2.1) * 0.035, 0.97, Math.sin(i * 2.1) * 0.035); return g; });
    const fr = [];
    const n = 8;
    for (let i = 0; i < n; i++) { const g = frondGeo(0.4 + rnd() * 0.1, i % 2 ? 0.55 : 0.15, i % 2 ? 0.75 : 0.62, 0.07, (i / n) * Math.PI * 2 + rnd() * 0.5); g.translate(bend, 1, 0); fr.push(g); }
    return { trunk: mergeGeo([tr, ...nuts]), crown: mergeGeo(fr), bend };
  });
  return PALM;
}
// 야자수 심기 함수. palm(x, z, 높이, 방향(도), 잎 색)
export function palmKit(w) {
  const T = palmTpl(), r = w.rand;
  return (x, z, h = 8, yaw = r() * 360, hue = 0) => {
    const k = (r() * 3) | 0, t = T[k], y = w.h(x, z) - 0.25, m = M(x, y, z, h, h, h, 0, yaw, 0);
    w.mesh(t.trunk, m, [0x9a7b52, 0x8a6a48, 0xa68658][k], "std");
    w.mesh(t.crown, m, new THREE.Color().setHSL(0.27 + hue + r() * 0.04, 0.62, 0.3 + r() * 0.06).getHex(), "leaf");
    const a = yaw * DEG, tx = x + t.bend * h * Math.cos(a), tz = z - t.bend * h * Math.sin(a);
    w.col.addCapsule(V3(x, y, z), V3(tx, y + h, tz), 0.03 * h + 0.08);
    w.col.addSphere(V3(tx, y + h, tz), 0.13 * h);
  };
}

// ── 초가 오두막 ──────────────────────────────────────────
// 바닥 y 에 놓인 sx×sz 오두막. o: { stilt(기둥 길이), wall(벽 색), roof(지붕 색), open(벽 없는 정자) }
export function hut(w, x, y, z, sx, sz, ry = 0, o = {}) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), X = (u, v) => x + u * c + v * s, Z = (u, v) => z - u * s + v * c;
  const wall = o.wall ?? 0xd9b878, roof = o.roof ?? 0xb8964a, hh = o.h ?? 2.8;
  if (o.stilt) for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) w.pipe(X(u * (sx / 2 - 0.4), v * (sz / 2 - 0.4)), y - o.stilt, Z(u * (sx / 2 - 0.4), v * (sz / 2 - 0.4)), X(u * (sx / 2 - 0.4), v * (sz / 2 - 0.4)), y, Z(u * (sx / 2 - 0.4), v * (sz / 2 - 0.4)), 0.16, 0x6a4a2c, { mat: "std" });
  w.box(x, y - 0.25, z, sx + 1.6, 0.25, sz + 1.6, 0x9a7446, { mat: "std:wood", tile: 2, ry });
  if (o.open) for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) w.pipe(X(u * (sx / 2 - 0.3), v * (sz / 2 - 0.3)), y, Z(u * (sx / 2 - 0.3), v * (sz / 2 - 0.3)), X(u * (sx / 2 - 0.3), v * (sz / 2 - 0.3)), y + hh, Z(u * (sx / 2 - 0.3), v * (sz / 2 - 0.3)), 0.14, 0x6a4a2c, { mat: "std" });
  else {
    w.box(x, y, z, sx, hh, sz, wall, { mat: "std:wood", tile: 2, ry });
    w.box(X(0, sz / 2 + 0.03), y + 0.1, Z(0, sz / 2 + 0.03), 1.1, 2, 0.08, 0x5a3d28, { ry, col: false });
    w.box(X(sx * 0.28, sz / 2 + 0.03), y + 1.1, Z(sx * 0.28, sz / 2 + 0.03), 1, 0.9, 0.08, 0x3a5a6a, { ry, col: false, mat: "paint" });
  }
  // 사각뿔 초가 지붕
  const rr = Math.max(sx, sz) * 0.5 + 1.3, rh = o.roofH ?? rr * 0.72;
  w.mesh(PYR, M(x, y + hh, z, sx / 2 + 1.2, rh, sz / 2 + 1.2, 0, ry, 0), roof, "std");
  w.mesh(PYR, M(x, y + hh + rh * 0.62, z, sx * 0.24, rh * 0.5, sz * 0.24, 0, ry, 0), 0x8a6a34, "std");
  w.col.addBox(V3(x, y + hh + rh * 0.16, z), V3(sx / 2 + 0.7, rh * 0.16, sz / 2 + 0.7), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry * DEG));
  w.col.addSphere(V3(x, y + hh + rh * 0.5, z), Math.min(sx, sz) * 0.3);
}
const PYR = (() => { const g = new THREE.ConeGeometry(Math.SQRT2, 1, 4, 1, false).toNonIndexed(); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.computeVertexNormals(); g.computeBoundingBox(); return g; })();
export const PYRAMID = PYR;

// ── 용암 ────────────────────────────────────────────────
// 흐르는 용암 재질: 밝은 주황 바탕에 검은 껍질 조각. 천천히 아래로 흐른다
export function lavaMaterial(w) {
  if (w._lavaMat) return w._lavaMat;
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = "#ff6a10"; g.fillRect(0, 0, 128, 128);
  let sd = 11;
  const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const wrap = (fn) => { for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) fn(ox, oy); };
  for (let i = 0; i < 26; i++) { const x = rnd() * 128, y = rnd() * 128, r = 6 + rnd() * 14; g.fillStyle = rnd() < 0.5 ? "#ffc23a" : "#ff8a1c"; wrap((ox, oy) => { g.beginPath(); g.ellipse(x + ox, y + oy, r * 0.6, r, 0, 0, 7); g.fill(); }); }
  for (let i = 0; i < 16; i++) { const x = rnd() * 128, y = rnd() * 128, r = 3 + rnd() * 6; g.fillStyle = "#fff0a0"; wrap((ox, oy) => { g.beginPath(); g.ellipse(x + ox, y + oy, r * 0.5, r, 0, 0, 7); g.fill(); }); }
  for (let i = 0; i < 22; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 7 + rnd() * 11, n = 5 + ((rnd() * 3) | 0), a0 = rnd() * 6, rs = Array.from({ length: n }, () => 0.6 + rnd() * 0.5);
    g.fillStyle = i % 3 ? "#30100a" : "#52180c";
    wrap((ox, oy) => { g.beginPath(); for (let k = 0; k < n; k++) { const a = a0 + (k / n) * 6.283; g.lineTo(x + ox + Math.cos(a) * r * rs[k] * 0.75, y + oy + Math.sin(a) * r * rs[k] * 1.25); } g.closePath(); g.fill(); });
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  const k = 1.75, m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k), side: THREE.DoubleSide });
  w.disposables.push(tex);
  w.updaters.push((dt) => { tex.offset.y += dt * 0.07; });
  return (w._lavaMat = m);
}
// 지형을 따라 흐르는 띠. L: 지형 모듈의 곡선, t0..t1 구간, hw: 절반 폭, lift: 지면 위 높이
export function ribbon(w, L, t0, t1, hw, lift, material, o = {}) {
  const n = Math.max(2, Math.round(((t1 - t0) * L.len) / (o.step || 2.4))), nu = 4, pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) {
    const t = t0 + ((t1 - t0) * j) / n, [x, z] = L.point(t), [dx, dz] = L.dir(t), k = o.widen ? 1 + o.widen * Math.max(0, (t - o.from) / (1 - o.from)) : 1;
    for (let i = 0; i <= nu; i++) {
      const s = (i / nu) * 2 - 1, px = x - dz * s * hw * k, pz = z + dx * s * hw * k;
      pos.push(px, Math.max(w.h(px, pz), o.minY ?? -99) + lift - Math.abs(s) * 0.12, pz); uv.push((i / nu) * (o.tu || 1), (-t * L.len) / (o.tile || 14));
    }
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i; idx.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, material);
  mesh.renderOrder = 1;
  w.scene.add(mesh);
  return mesh;
}

// ── 생물·탈것 ────────────────────────────────────────────
// 갈매기: 활공 자세로 굳힌 메시 하나. list: [cx, y, cz, 반경, 속도, 위상]
export function gulls(w, list) {
  const tri = (pts) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...pts, ...pts.slice(6, 9), ...pts.slice(3, 6), ...pts.slice(0, 3)], 3)); g.computeVertexNormals(); return g; };
  const body = new THREE.ConeGeometry(0.2, 1.3, 5); body.rotateX(-Math.PI / 2);
  const parts = [[body, null, 0xf6f6f2]];
  for (const s of [-1, 1]) {
    parts.push([tri([0, 0.05, -0.3, s * 1.1, 0.34, -0.12, 0, 0.05, 0.28]), null, 0xf0f0ee]);
    parts.push([tri([s * 1.1, 0.34, -0.12, s * 2.1, 0.16, 0.22, 0, 0.05, 0.28]), null, 0x8f98a4]);
  }
  parts.push([tri([0, 0, 0.5, -0.3, 0, 1.0, 0.3, 0, 1.0]), null, 0xdadde2]);
  const all = list.map(([cx, y, cz, R, speed, ph], i) => {
    const g = prop(w, parts, "paint", false);
    g.scale.setScalar(1.1 + (i % 3) * 0.15);
    w.rider(g, [[0, 0.1, 0.2, 1.2, 0.3, 0.7]]);
    return { g, cx, y, cz, R, speed, ph };
  });
  w.updaters.push((dt, t) => {
    for (const b of all) {
      const a = b.ph + (t * b.speed) / b.R, rr = b.R * (1 + 0.15 * Math.sin(t * 0.11 + b.ph * 3));
      b.g.position.set(b.cx + Math.cos(a) * rr, b.y + Math.sin(t * 0.25 + b.ph) * 5, b.cz + Math.sin(a) * rr);
      b.g.rotation.set(Math.sin(t * 0.7 + b.ph) * 0.08, -a + (b.speed > 0 ? Math.PI : 0), (b.speed > 0 ? -1 : 1) * 0.36, "YXZ");
    }
  });
}

// 경비행기·수상기 부품(전방 -Z, 원점은 동체 중심). floats: 플로트 달린 수상기
export function planeParts(color = 0xf2f0ea, trim = 0xe94f37, floats = false) {
  const B = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz), fus = new THREE.CylinderGeometry(0.75, 0.42, 7.4, 8); fus.rotateX(Math.PI / 2);
  const nose = new THREE.ConeGeometry(0.75, 1.3, 8); nose.rotateX(-Math.PI / 2);
  const parts = [
    [fus, M(0, 0, 0.4), color], [nose, M(0, 0, -3.9), trim], [B(11.6, 0.18, 1.7), M(0, 1.0, -0.9), color], [B(1.3, 0.2, 1.72), M(-5.2, 1.0, -0.9), trim], [B(1.3, 0.2, 1.72), M(5.2, 1.0, -0.9), trim],
    [B(1.3, 0.9, 1.6), M(0, 0.6, -1.2), 0x27405c], [B(4.2, 0.14, 1.1), M(0, 0.35, 3.7), color], [B(0.16, 1.7, 1.3), M(0, 1.1, 3.7), trim], [B(2.6, 0.1, 0.22), M(0, 0, -4.6, 1, 1, 1, 0, 0, 30), 0x2c3138],
  ];
  for (const s of [-1, 1]) {
    parts.push([B(0.1, 1.5, 0.1), M(s * 1.3, -0.85, -0.9, 1, 1, 1, 0, 0, s * 18), 0x59606a]);
    if (floats) { const f = new THREE.CylinderGeometry(0.34, 0.2, 5.6, 6); f.rotateX(Math.PI / 2); parts.push([f, M(s * 1.6, -1.75, -0.4), 0xdadde2]); }
    else parts.push([new THREE.CylinderGeometry(0.36, 0.36, 0.24, 8), M(s * 1.55, -1.5, -1.0, 1, 1, 1, 0, 0, 90), 0x1c1f26]);
  }
  return parts;
}
// 작은 배(전방 -Z). kind: fish(고기잡이배) | ski(제트스키) | canoe
export function boatParts(kind = "fish", color = 0x2a9d8f) {
  const B = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz), bow = (r, l) => { const g = new THREE.ConeGeometry(r, l, 4); g.rotateX(-Math.PI / 2); g.rotateZ(Math.PI / 4); g.scale(1, 0.55, 1); return g; };
  if (kind === "ski") return [[B(1.0, 0.5, 2.4), M(0, 0.2, 0), color], [bow(0.7, 1.2), M(0, 0.2, -1.8), color], [B(0.5, 0.5, 1.0), M(0, 0.65, 0.2), 0x23272f], [B(0.9, 0.08, 0.1), M(0, 1.0, -0.6), 0x2c3138], [B(0.42, 0.6, 0.3), M(0, 1.2, 0.25), 0xffc23a], [new THREE.SphereGeometry(0.17, 8, 6), M(0, 1.65, 0.22), 0xe6b48f]];
  if (kind === "canoe") return [[B(0.9, 0.4, 4.2), M(0, 0.15, 0), color], [bow(0.64, 1.3), M(0, 0.15, -2.75), color], [bow(0.64, 1.3), M(0, 0.15, 2.75, 1, 1, 1, 0, 180, 0), color], [B(0.7, 0.06, 0.24), M(0, 0.34, -0.8), 0x9a7446], [B(0.7, 0.06, 0.24), M(0, 0.34, 0.9), 0x9a7446]];
  return [
    [B(2.4, 0.9, 6), M(0, 0.25, 0), color], [bow(1.7, 2.6), M(0, 0.25, -4.3), color], [B(2.5, 0.14, 6.1), M(0, 0.7, 0), 0xf2f0ea], [B(1.7, 1.7, 2), M(0, 1.6, 1.2), 0xf2f0ea], [B(1.74, 0.6, 2.04), M(0, 1.85, 1.2), 0x27405c],
    [B(2, 0.12, 2.4), M(0, 2.5, 1.2), 0xe94f37], [B(0.1, 3.4, 0.1), M(0, 2.4, -1.4), 0x4a3a28], [B(0.08, 0.08, 3), M(0, 3.5, -2.6, 1, 1, 1, 30, 0, 0), 0x4a3a28], [B(1.2, 0.5, 1), M(0, 0.95, -2.4), 0xffc23a],
  ];
}
