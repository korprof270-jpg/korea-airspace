// 맵 제작 도구 모음(협곡·항만 공용): 회전 좌표계, 각재, 저폴리 식생·바위, 암석 아치, 폭포 물줄기, 새·열기구 등 움직이는 소품
import * as THREE from "../../vendor/three.module.min.js";

const DEG = Math.PI / 180;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

// 변환 행렬 (회전은 도, YXZ 순서)
export function M(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  _e.set(rx * DEG, ry * DEG, rz * DEG, "YXZ");
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz));
}

// 월드 빌더의 재질을 움직이는 소품에도 쓴다(화풍이 바뀌어도 같이 따라가도록). 없으면 기본 재질
export function mat(w, key = "paint") {
  if (typeof w._material === "function") { try { return w._material(key); } catch (e) { /* 아래 기본 재질 */ } }
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

// 여러 지오메트리를 정점 색과 함께 하나로 합친다. parts: [geo, matrix|null, color][]
export function merged(parts) {
  let n = 0;
  for (const [g] of parts) n += g.index ? g.index.count : g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
  let o = 0;
  for (const [g, m, color] of parts) {
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index, cnt = I ? I.count : P.count;
    c.set(color ?? 0xffffff);
    if (m) nm.getNormalMatrix(m);
    for (let i = 0; i < cnt; i++, o++) {
      const k = I ? I.getX(i) : i;
      v.fromBufferAttribute(P, k); if (m) v.applyMatrix4(m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      v.fromBufferAttribute(N, k); if (m) v.applyMatrix3(nm).normalize();
      nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
      if (U) { uv[o * 2] = U.getX(k); uv[o * 2 + 1] = U.getY(k); }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

// 합친 지오메트리로 움직이는 소품 메시를 만들어 장면에 넣는다
export function prop(w, parts, key = "paint", shadow = true) {
  const mesh = new THREE.Mesh(merged(parts), mat(w, key));
  mesh.castShadow = shadow; mesh.receiveShadow = false;
  w.scene.add(mesh);
  return mesh;
}

// 회전된 국소 좌표계. u 는 +x, v 는 +z 를 ry(도)만큼 돌린 축. y0 는 기준 높이
export function frame(w, cx, cz, ry = 0, y0 = 0) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
  const X = (u, v) => cx + u * c + v * s, Z = (u, v) => cz - u * s + v * c;
  return {
    X, Z, ry, y0,
    box: (u, y, v, su, sy, sv, color, o = {}) => w.box(X(u, v), y0 + y, Z(u, v), su, sy, sv, color, { ...o, ry: ry + (o.ry || 0) }),
    cyl: (u, y, v, r, h, color, o) => w.cyl(X(u, v), y0 + y, Z(u, v), r, h, color, o),
    pipe: (u1, y1, v1, u2, y2, v2, r, color, o) => w.pipe(X(u1, v1), y0 + y1, Z(u1, v1), X(u2, v2), y0 + y2, Z(u2, v2), r, color, o),
    beam: (u1, y1, v1, u2, y2, v2, t, color, o) => beam(w, [X(u1, v1), y0 + y1, Z(u1, v1)], [X(u2, v2), y0 + y2, Z(u2, v2)], t, color, o),
    sph: (u, y, v, r, color, o) => w.sph(X(u, v), y0 + y, Z(u, v), r, color, o),
    cone: (u, y, v, r, h, color, o) => w.cone(X(u, v), y0 + y, Z(u, v), r, h, color, o),
    gap: (name, u, y, v, yaw, gw, gh, pts, pitch) => w.gap(name, X(u, v), y0 + y, Z(u, v), ry + yaw, gw, gh, pts, pitch),
    h: (u, v) => w.h(X(u, v), Z(u, v)),
  };
}

// 두 점을 잇는 각재(12 삼각형) + 캡슐 충돌체. o: { mat, col, tw(가로 두께) }
const BOX = new THREE.BoxGeometry(1, 1, 1);
export function beam(w, a, b, t, color, o = {}) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _d.length();
  _q.setFromUnitVectors(Y, _d.multiplyScalar(1 / len));
  _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(o.tw || t, len, t));
  w.mesh(BOX, _m, color, o.mat || "paint");
  if (o.col !== false) w.col.addCapsule(new THREE.Vector3(...a), new THREE.Vector3(...b), Math.max(t, o.tw || t) * 0.5, o.tag);
}

// ── 저폴리 식생·바위 ──────────────────────────────────────
function lumpy(geo, seed, amp, smooth) {
  const P = geo.attributes.position, v = new THREE.Vector3(), o = [seed * 1.7, seed * 2.9 + 1, seed * 4.1 + 2];
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    const n = Math.sin(v.x * 2.7 + o[0]) * Math.sin(v.y * 3.1 + o[1]) * Math.sin(v.z * 2.9 + o[2]);
    v.multiplyScalar(1 + n * amp);
    P.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  if (smooth) { const N = geo.attributes.normal, f = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).normalize().lerp(f.fromBufferAttribute(N, i), 0.3).normalize(); N.setXYZ(i, v.x, v.y, v.z); } }
  geo.computeBoundingBox();
  return geo;
}
let TPL = null;
function tpl() {
  if (TPL) return TPL;
  const up = (g) => { g.translate(0, 0.5, 0); return g; };
  TPL = {
    trunk: up(new THREE.CylinderGeometry(0.5, 1, 1, 5, 1, true)),
    coneC: up(new THREE.ConeGeometry(1, 1, 7, 1, false)),
    coneO: up(new THREE.ConeGeometry(1, 1, 7, 1, true)),
    crown: [0, 1, 2].map((k) => lumpy(new THREE.IcosahedronGeometry(1, 1), 3 + k, 0.2, true)),
    puff: [0, 1].map((k) => lumpy(new THREE.IcosahedronGeometry(1, 0), 7 + k, 0.12, true)),
    rock: [0, 1, 2, 3].map((k) => lumpy(new THREE.IcosahedronGeometry(1, 1), 11 + k, 0.3, false)),
    slab: [0, 1].map((k) => lumpy(new THREE.DodecahedronGeometry(1, 0), 17 + k, 0.1, false)),
    blade: up(new THREE.ConeGeometry(1, 1, 3, 1, true)),
    col8: up(new THREE.CylinderGeometry(1, 1, 1, 8, 1, false)),
  };
  return TPL;
}
const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l).getHex();

// 식생 도구. 반환된 함수들은 지면 높이에 맞춰 심는다
export function flora(w) {
  const T = tpl(), r = w.rand, mm = (x, y, z, sx, sy, sz, ry = 0) => { _e.set(0, ry, 0); return _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz)); };
  return {
    // 소나무: 세 단 원뿔
    pine(x, z, s = 1, tint = 0) {
      const y = w.h(x, z) - 0.3, h = (9 + r() * 6) * s, g = hsl(0.37 + r() * 0.05 + tint, 0.5, 0.2 + r() * 0.06), g2 = hsl(0.36 + tint, 0.5, 0.15);
      w.mesh(T.trunk, mm(x, y, z, 0.32 * s, h * 0.5, 0.32 * s), 0x5a3f28, "std");
      for (let i = 0; i < 3; i++) { const t = i / 2, rr = (2.9 - t * 1.9) * s * (0.9 + r() * 0.2); w.mesh(i ? T.coneO : T.coneC, mm(x, y + h * (0.16 + t * 0.27), z, rr, h * (0.44 - t * 0.07), rr, r() * 6), i ? g : g2, "foliage"); }
      w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h * 0.88, z), 0.75 * s);
    },
    // 활엽수: 줄기 + 둥근 수관 덩어리
    round(x, z, s = 1, hue = 0.27, sat = 0.55) {
      const y = w.h(x, z) - 0.3, h = (3.2 + r() * 2.2) * s, cr = (2.4 + r() * 1.1) * s, c = new THREE.Color().setHSL(hue + r() * 0.05, sat, 0.26 + r() * 0.07);
      w.mesh(T.trunk, mm(x, y, z, 0.3 * s, h + cr * 0.4, 0.3 * s), 0x5b4129, "std");
      w.mesh(T.crown[(r() * 3) | 0], mm(x, y + h + cr * 0.55, z, cr, cr * 0.82, cr, r() * 6), c.getHex(), "foliage");
      for (let i = 0; i < 2; i++) { const a = r() * 6.28, d = cr * (0.55 + r() * 0.2), br = cr * (0.5 + r() * 0.15); w.mesh(T.puff[i], mm(x + Math.cos(a) * d, y + h + cr * (0.25 + r() * 0.3), z + Math.sin(a) * d, br, br * 0.85, br, r() * 6), c.clone().offsetHSL(0.01, 0, i ? 0.05 : -0.04).getHex(), "foliage"); }
      w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 0.35 * s);
      w.col.addSphere(new THREE.Vector3(x, y + h + cr * 0.55, z), cr * 0.78);
    },
    // 덤불(충돌 없음)
    bush(x, z, s = 1, color) {
      const y = w.h(x, z), c = color ?? hsl(0.25 + r() * 0.08, 0.5, 0.24 + r() * 0.06);
      const n = 1 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) { const br = (0.8 + r() * 0.5) * s; w.mesh(i ? T.puff[0] : T.crown[(r() * 3) | 0], mm(x + (i ? (r() - 0.5) * 1.6 * s : 0), y + br * 0.45, z + (i ? (r() - 0.5) * 1.6 * s : 0), br, br * 0.7, br, r() * 6), c, "foliage"); }
    },
    // 각진 바위
    rock(x, z, s = 1, color = 0xc98a5a, col = true) {
      const y = w.h(x, z), sx = s * (0.8 + r() * 0.5), sy = s * (0.5 + r() * 0.4), sz = s * (0.8 + r() * 0.5);
      w.mesh(T.rock[(r() * 4) | 0], mm(x, y + sy * 0.3, z, sx, sy, sz, r() * 6), color, "std:rock");
      if (col && s > 0.9) w.col.addSphere(new THREE.Vector3(x, y + sy * 0.3, z), Math.min(sx, sy, sz) * 0.85);
    },
    // 갈대·풀 포기
    reed(x, z, s = 1, color = 0xb7b45a) {
      const y = w.h(x, z) - 0.1;
      for (let i = 0; i < 3; i++) w.mesh(T.blade, mm(x + (r() - 0.5) * 0.9, y, z + (r() - 0.5) * 0.9, 0.16 * s, (1.3 + r() * 1.1) * s, 0.16 * s, r() * 6), color, "foliage");
    },
    // 말라 죽은 나무
    snag(x, z, s = 1) {
      const y = w.h(x, z) - 0.3, h = (5 + r() * 3) * s;
      w.mesh(T.trunk, mm(x, y, z, 0.3 * s, h, 0.3 * s), 0xb9a58c, "std");
      for (let i = 0; i < 3; i++) { const a = r() * 6.28, yy = y + h * (0.45 + i * 0.16), l = (1.6 + r() * 1.2) * s; beam(w, [x, yy, z], [x + Math.cos(a) * l, yy + l * 0.7, z + Math.sin(a) * l], 0.14 * s, 0xb9a58c, { mat: "std", col: false }); }
      w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h, z), 0.3 * s);
    },
    T,
  };
}

// 바위 덩어리(큰 것): 보이는 모양과 비슷한 구 충돌체 여러 개
export function boulder(w, x, y, z, rx, ry, rz, color, o = {}) {
  w.blob(x, y, z, rx, ry, rz, color, { mat: "std:rock", grad: [0.55, 1.1], col: false, ...o });
  const rm = Math.min(rx, ry, rz) * 0.86, ext = Math.max(rx, rz) - rm;
  if (ext < rm * 0.35) w.col.addSphere(new THREE.Vector3(x, y, z), rm);
  else {
    // 긴 축을 따라 캡슐 (blob 의 회전을 모르므로 o.ry 를 준 경우에만 정확)
    const a = (o.ry || 0) * DEG, long = rx >= rz ? [Math.cos(a), -Math.sin(a)] : [Math.sin(a), Math.cos(a)];
    w.col.addCapsule(new THREE.Vector3(x - long[0] * ext, y, z - long[1] * ext), new THREE.Vector3(x + long[0] * ext, y, z + long[1] * ext), rm);
  }
}

// 암석 아치: (ax,az) → (bx,bz) 를 잇는 반타원 호. rise 는 꼭대기 높이(바닥 기준), thick 는 굵기
export function rockArch(w, ax, az, bx, bz, y0, rise, thick, color, o = {}) {
  const r = w.rand, n = o.n || Math.max(7, Math.round((Math.hypot(bx - ax, bz - az) + rise * 2) / (thick * 1.25)));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * t, k = 0.5 - 0.5 * Math.cos(a);
    const x = ax + (bx - ax) * k + (r() - 0.5) * thick * 0.25, z = az + (bz - az) * k + (r() - 0.5) * thick * 0.25, y = y0 + Math.sin(a) * rise;
    const rr = thick * (1.35 - 0.45 * Math.sin(a)) * (0.92 + r() * 0.16);
    w.blob(x, y, z, rr * 1.05, rr * (0.9 + 0.25 * (1 - Math.sin(a))), rr, color, { mat: "std:rock", grad: [0.55, 1.1], col: false });
    const p = new THREE.Vector3(x, y, z);
    if (prev) w.col.addCapsule(prev.p, p, Math.min(prev.r, rr) * 0.8); else w.col.addSphere(p, rr * 0.8);
    prev = { p, r: rr };
  }
}

// 후두(버섯바위): 층층이 쌓인 기둥 + 넓은 갓돌
export function hoodoo(w, x, z, h, rad, colors = [0xd98a58, 0xf0c79a, 0xc9703f]) {
  const T = tpl(), r = w.rand, y = w.h(x, z) - 0.6, n = 3 + ((r() * 2) | 0);
  let yy = y;
  for (let i = 0; i < n; i++) {
    const hh = (h / n) * (0.8 + r() * 0.4), rr = rad * (1.15 - (i / n) * 0.5) * (0.85 + r() * 0.3);
    _e.set(0, r() * 6, 0);
    w.mesh(T.col8, _m.compose(_p.set(x + (r() - 0.5) * rad * 0.2, yy, z + (r() - 0.5) * rad * 0.2), _q.setFromEuler(_e), _s.set(rr, hh, rr)), colors[i % colors.length], "std:rock");
    yy += hh;
  }
  w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, yy, z), rad * 0.8);
  const cr = rad * (1.5 + r() * 0.5);
  _e.set(0, r() * 6, 0);
  w.mesh(T.rock[(r() * 4) | 0], _m.compose(_p.set(x, yy + cr * 0.3, z), _q.setFromEuler(_e), _s.set(cr, cr * 0.55, cr)), colors[(n + 1) % colors.length], "std:rock");
  w.col.addSphere(new THREE.Vector3(x, yy + cr * 0.3, z), cr * 0.6);
  return yy + cr * 0.8;
}

// ── 물 ───────────────────────────────────────────────────
// 강·바다와 같은 수면 재질을 쓰는 추가 수면(저수지·못)
export function waterPatch(w, geo, color = 0x1e6a70) {
  const m = w.waterMesh && w.waterMesh.material ? w.waterMesh.material : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = 3;
  w.scene.add(mesh);
  return mesh;
}

// 흘러내리는 물줄기 재질(줄무늬 텍스처를 아래로 흘린다). 맵마다 하나를 함께 쓴다
function streakTexture() {
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = "#bfe6f2"; g.fillRect(0, 0, 64, 128);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 64, y = rnd() * 128, len = 18 + rnd() * 60, wd = 1.5 + rnd() * 4;
    g.fillStyle = rnd() < 0.7 ? "#ffffff" : "#7fc4dc";
    for (const oy of [0, -128]) g.fillRect(x, y + oy, wd, len);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function fallMaterial(w, speed = 1.1) {
  if (w._fallMat) return w._fallMat;
  const tex = streakTexture();
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  w.disposables.push(tex);
  w.updaters.push((dt) => { tex.offset.y += dt * speed; });
  return (w._fallMat = m);
}
// 물줄기 면: 위쪽 가장자리 a→b 에서 아래쪽 가장자리 c→d 로. bulge 는 바깥으로 부푸는 정도(법선 방향)
export function fallSheet(w, a, b, c, d, o = {}) {
  const nu = o.nu || 2, nv = o.nv || 6, pos = [], uv = [], idx = [];
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), C = new THREE.Vector3(...c), D = new THREE.Vector3(...d);
  const nrm = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A)).normalize(), p = new THREE.Vector3(), q = new THREE.Vector3();
  const h = A.distanceTo(C), wd = A.distanceTo(B);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const s = i / nu, t = j / nv;
    p.lerpVectors(A, B, s); q.lerpVectors(C, D, s); p.lerp(q, o.ease ? t * t : t);
    p.addScaledVector(nrm, (o.bulge || 0) * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    pos.push(p.x, p.y, p.z); uv.push((s * wd) / (o.tile || 6), (-t * h) / (o.tileV || 22));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const k = j * (nu + 1) + i; idx.push(k, k + nu + 1, k + 1, k + 1, k + nu + 1, k + nu + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, fallMaterial(w));
  mesh.renderOrder = 4;
  w.scene.add(mesh);
  return mesh;
}
// 물보라: 수면에서 퍼졌다 사라지는 흰 고리 (메시 하나, 여러 고리를 차례로 재활용)
export function foamRings(w, spots, color = 0xffffff) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const rings = spots.map(([x, y, z, r], i) => {
    const g = new THREE.RingGeometry(0.72, 1, 20); g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.renderOrder = 4; mesh.userData = { r, ph: i * 0.37 };
    w.scene.add(mesh);
    return mesh;
  });
  w.updaters.push((dt, t) => { for (const k of rings) { const u = (t * 0.45 + k.userData.ph) % 1; k.scale.setScalar(k.userData.r * (0.35 + u * 0.75)); k.visible = u < 0.92; } m.opacity = 0.42 + 0.12 * Math.sin(t * 3); });
}

// ── 생물·탈것 ────────────────────────────────────────────
// 선회하는 큰 새(독수리). 중심 (cx,cz), 고도 y, 반경 R
export function birds(w, list) {
  const body = new THREE.MeshLambertMaterial({ color: 0x4a362a }), tip = new THREE.MeshLambertMaterial({ color: 0x6b4f3a, side: THREE.DoubleSide });
  const wingG = new THREE.BufferGeometry();
  wingG.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.45, 2.6, 0.1, -0.1, 0, 0, 0.5, 2.6, 0.1, -0.1, 2.3, 0.08, 0.55, 0, 0, 0.5], 3));
  wingG.computeVertexNormals();
  const bodyG = new THREE.ConeGeometry(0.28, 1.9, 5); bodyG.rotateX(-Math.PI / 2);
  const tailG = new THREE.BufferGeometry();
  tailG.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.6, -0.5, 0, 1.5, 0.5, 0, 1.5], 3)); tailG.computeVertexNormals();
  const all = list.map(([cx, y, cz, R, speed, ph], i) => {
    const g = new THREE.Group(), wl = new THREE.Mesh(wingG, tip), wr = new THREE.Mesh(wingG, tip);
    wr.scale.x = -1;
    g.add(new THREE.Mesh(bodyG, body), new THREE.Mesh(tailG, tip), wl, wr);
    g.scale.setScalar(1.25 + (i % 3) * 0.2);
    w.scene.add(g);
    w.rider(g, [[0, 0, 0.3, 0.9, 0.25, 0.8]]);
    return { g, wl, wr, cx, y, cz, R, speed, ph };
  });
  w.updaters.push((dt, t) => {
    for (const b of all) {
      const a = b.ph + (t * b.speed) / b.R, rr = b.R * (1 + 0.12 * Math.sin(t * 0.13 + b.ph * 3));
      b.g.position.set(b.cx + Math.cos(a) * rr, b.y + Math.sin(t * 0.21 + b.ph) * 6, b.cz + Math.sin(a) * rr);
      b.g.rotation.set(0, -a + (b.speed > 0 ? Math.PI : 0), (b.speed > 0 ? -1 : 1) * 0.32, "YXZ");
      const cyc = (t * 0.22 + b.ph) % 1, flap = cyc < 0.18 ? Math.sin(cyc / 0.18 * Math.PI * 4) * 0.55 : 0.12 + 0.05 * Math.sin(t * 1.3 + b.ph);   // 가끔 날갯짓, 대부분 활공
      b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
    }
  });
}

// 열기구 부품 목록(원점 = 풍선 중심). 세로 줄무늬 colors
export function balloonParts(s, colors) {
  const parts = [], n = 12, prof = [[0.0, -1.25], [0.34, -1.0], [0.72, -0.55], [0.98, -0.05], [1.0, 0.3], [0.84, 0.68], [0.5, 0.93], [0.0, 1.02]].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  for (let i = 0; i < n; i++) parts.push([new THREE.LatheGeometry(prof, 1, (i / n) * Math.PI * 2, (Math.PI * 2) / n), null, colors[i % colors.length]]);
  parts.push([new THREE.BoxGeometry(0.34 * s, 0.26 * s, 0.34 * s), M(0, -1.78 * s, 0), 0x8a5a2e]);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push([new THREE.BoxGeometry(0.02 * s, 0.5 * s, 0.02 * s), M(dx * 0.15 * s, -1.42 * s, dz * 0.15 * s), 0x3a2a1c]);
  return parts;
}
// 줄에 매인 열기구(정적, 충돌 있음)
export function balloon(w, x, y, z, s, colors, ground) {
  for (const [g, m, c] of balloonParts(s, colors)) w.mesh(g, m ? M(x, y, z).multiply(m) : M(x, y, z), c, "paint");
  w.col.addSphere(new THREE.Vector3(x, y + 0.1 * s, z), s * 0.98);
  w.col.addSphere(new THREE.Vector3(x, y - 0.8 * s, z), s * 0.5);
  w.col.addBox(new THREE.Vector3(x, y - 1.78 * s, z), new THREE.Vector3(0.2 * s, 0.16 * s, 0.2 * s));
  w.sph(x, y - 1.3 * s, z, 0.07 * s, 0xffb040, { mat: "glow", col: false });
  if (ground !== undefined) beam(w, [x, y - 1.9 * s, z], [x + s * 0.6, ground, z + s * 0.4], 0.07, 0xd8d0c0, { col: false });
}
