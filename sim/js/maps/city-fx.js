// 네온 시티 디테일 보강(움직이는 것): 상향 조명, 깜박이 등, 김·연기, 떠다니는 등불·분수·반딧불·용접 불꽃, 택배 드론,
// 전망대 전광 띠, 깃발, 유리 승강기, 불꽃놀이, 무대 조명. city-detail 이 K 에 모아 둔 자리를 쓴다
import * as THREE from "../../vendor/three.module.min.js";
import { MAG, CYA, YEL, GRN, ORG, WARM, NEON, TRS, Geo, Rail, roundRect, fleet, aim, litMat, glowMat } from "./city-kit.js";

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _d = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _c = new THREE.Color();
const fract = (x) => x - Math.floor(x);
const hash = (n) => fract(Math.sin(n * 127.1 + 3.7) * 43758.5453);
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const addMat = (o) => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, ...o });

// 인스턴스 묶음(색도 인스턴스별)
function swarm(w, geo, mat, n) {
  const im = fleet(w, geo, mat, n);
  for (let i = 0; i < n; i++) { im.setColorAt(i, _c.set(0)); im.setMatrixAt(i, _m.makeScale(0, 0, 0)); }
  im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  return im;
}
const put = (im, i, x, y, z, sx, sy = sx, sz = sx) => im.setMatrixAt(i, _m.makeScale(sx, sy, sz).setPosition(x, y, z));

// 고정 상향 조명(가산 혼합 원뿔 한 메시). [x0,y0,z0, x1,y1,z1, r0, r1, 색, 세기]
function beams(w, list) {
  if (!list.length) return;
  const pos = [], col = [], idx = [], Y = new THREE.Vector3(0, 1, 0);
  let base = 0;
  for (const [x0, y0, z0, x1, y1, z1, r0, r1, c, k] of list) {
    _d.set(x1 - x0, y1 - y0, z1 - z0); const len = _d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, 10, 1, true), P = g.attributes.position;
    _m.compose(_p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), _q.setFromUnitVectors(Y, _d.normalize()), _s.set(1, 1, 1));
    _c.set(c).multiplyScalar(k);
    for (let i = 0; i < P.count; i++) { const f = 0.5 - P.getY(i) / len; _p.fromBufferAttribute(P, i).applyMatrix4(_m); pos.push(_p.x, _p.y, _p.z); col.push(_c.r * f * f, _c.g * f * f, _c.b * f * f); }
    for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    base += P.count; g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, addMat({ vertexColors: true, side: THREE.DoubleSide }));
  m.renderOrder = 6; m.frustumCulled = false; w.scene.add(m);
}

// 깜박이 등(두 박자) + 용접 불빛 + 아파트 TV 불빛: 재질 밝기만 바꾼다
function blinkers(w, K) {
  const A = new Geo(), B = new Geo(), W = new Geo(), T = new Geo(), oct = new THREE.OctahedronGeometry(1, 0), box = new THREE.BoxGeometry(1, 1, 1), r = w.rand;
  for (const [x, y, z, s, ph, c] of K.blink) (ph ? B : A).add(oct, TRS(x, y, z, 0, s, s, s), c);
  for (const [x, y, z] of K.weld) W.add(oct, TRS(x, y, z, 0, 0.3, 0.3, 0.3), 0xcfe4ff);
  for (const a of K.apts || []) for (let k = 0; k < 4; k++) {
    // 창 한 칸(3m 격자)의 반쪽에 맞춘다
    const s = r() < 0.5 ? 1 : -1, L = a.ns ? a.dp : a.wd, cell = (r() * Math.floor(L / 3)) | 0, t = -L / 2 + cell * 3 + (r() < 0.5 ? 0.96 : 2.04), y = 3 * (1 + ((r() * (a.h / 3 - 2)) | 0)) + 1.65;
    if (a.ns) T.add(box, TRS(a.x + s * (a.wd / 2 + 0.04), y, a.z + t, 0, 0.05, 0.85, 0.95), 0x8fb8ff); else T.add(box, TRS(a.x + t, y, a.z + s * (a.dp / 2 + 0.04), 0, 0.95, 0.85, 0.05), 0x8fb8ff);
  }
  const mk = (g, k) => { const mat = glowMat(w, k), m = new THREE.Mesh(g.build(), mat); m.frustumCulled = false; w.scene.add(m); return mat; };
  const ma = mk(A, 1), mb = mk(B, 1), mw = mk(W, 1.6), mt = mk(T, 0.5), k = w.env.glow ?? 2.4;
  oct.dispose(); box.dispose();
  w.updaters.push((dt, t) => {
    const on = fract(t * 1.4) < 0.5;
    ma.color.setScalar(k * (on ? 1 : 0.12)); mb.color.setScalar(k * (on ? 0.12 : 1));
    mw.color.setScalar(fract(t / 9) < 0.4 && hash(Math.floor(t * 24)) > 0.4 ? k * 1.6 : 0);
    mt.color.setScalar(k * (0.28 + 0.22 * hash(Math.floor(t * 5)) + 0.1 * Math.sin(t * 3.1)));
  });
}

// 김·연기: 솟으며 퍼지고 흐려지는 덩어리 [x, y, z, 굵기, 높이]
function steam(w, list) {
  const n = list.length * 4;
  if (!n) return;
  const im = swarm(w, new THREE.IcosahedronGeometry(1, 1), addMat({ fog: true }), n);
  im.renderOrder = 6;
  w.updaters.push((dt, t) => {
    for (let e = 0; e < list.length; e++) {
      const [x, y, z, r, h] = list[e];
      for (let j = 0; j < 4; j++) {
        const u = fract(t * 0.2 + j / 4 + e * 0.37), a = Math.sin(u * Math.PI) * 0.085, i = e * 4 + j, sc = r * (0.45 + 1.5 * u);
        put(im, i, x + Math.sin(u * 3 + e + j) * 0.35 * u, y + u * h, z + Math.cos(u * 2.3 + e) * 0.3 * u, sc, sc * 0.85, sc);
        im.setColorAt(i, _c.setRGB(a * 0.8, a * 0.88, a));
      }
    }
    im.instanceMatrix.needsUpdate = im.instanceColor.needsUpdate = true;
  });
}

// 작은 빛 알갱이 한 묶음: 물 위 등불, 공원 분수와 반딧불, 용접 불꽃, 먼 하늘의 비행기
function motes(w, K) {
  const NL = 40, NF = 36, NB = 22, NW = 12, NA = 3, N = NL + NF + NB + NW + NA, k = w.env.glow ?? 2.4;
  const mat = new THREE.MeshBasicMaterial({ fog: false }); mat.color.setScalar(k);
  const im = swarm(w, new THREE.OctahedronGeometry(1, 0), mat, N), r = w.rand;
  const lan = [], bug = [];
  const LC = [0xffb060, 0xff7a9a, 0xffe08a, 0x7fd8ff];
  for (let i = 0; i < NL; i++) { lan.push([r() * 400, 53.4 + r() * 13.2, r() * 6.283]); im.setColorAt(i, _c.set(LC[i % 4]).multiplyScalar(0.8)); }
  for (let i = 0; i < NF; i++) im.setColorAt(NL + i, _c.set(0x9fe8ff).multiplyScalar(0.55));
  for (let i = 0; i < NB; i++) { bug.push([9 + r() * 11, r() * 6.283, 0.5 + r(), r() * 6.283]); im.setColorAt(NL + NF + i, _c.set(0xd8ff70).multiplyScalar(0.9)); }
  for (let i = 0; i < NW; i++) im.setColorAt(NL + NF + NB + i, _c.set(0xffb040));
  [0xffffff, 0xff3030, 0x30ff60].forEach((c, i) => im.setColorAt(N - NA + i, _c.set(c)));
  im.instanceColor.needsUpdate = true;
  const F = K.fountain, weld = K.weld;
  w.updaters.push((dt, t) => {
    let o = 0;
    for (let i = 0; i < NL; i++) { const l = lan[i]; put(im, o + i, ((l[0] + t * 0.45) % 400) - 200, -5.4 + Math.sin(t * 1.3 + l[2]) * 0.03, l[1] + Math.sin(t * 0.2 + l[2]) * 0.4, 0.2, 0.24, 0.2); }
    o += NL;
    for (let i = 0; i < NF; i++) {
      const j = (i / 3) | 0, u = fract(t * 0.8 + (i % 3) / 3 + j * 0.13), a = (j / 12) * 6.283, rr = F[3] - u * 2.4;
      put(im, o + i, F[0] + Math.cos(a) * rr, F[1] + 6.4 * u * (1 - u), F[2] + Math.sin(a) * rr, 0.09);
    }
    o += NF;
    for (let i = 0; i < NB; i++) {
      const b = bug[i], a = b[1] + t * 0.12 * b[2], on = Math.max(0, Math.sin(t * 1.7 + b[3]));
      put(im, o + i, F[0] + Math.cos(a) * b[0] + Math.sin(t * 0.6 + b[3]) * 1.2, 1.1 + Math.sin(t * 0.7 + b[3]) * 0.6, F[2] + Math.sin(a * 1.3) * b[0], 0.07 * on);
    }
    o += NB;
    const burst = fract(t / 9) < 0.4;
    for (let i = 0; i < NW; i++) {
      const p = weld[i % weld.length], u = fract(t * 2.1 + i / NW), a = i * 2.4;
      put(im, o + i, p[0] + Math.cos(a) * u * 0.9, p[1] + u * 0.5 - u * u * 2.6, p[2] + Math.sin(a) * u * 0.9, burst ? 0.06 * (1 - u) : 0);
    }
    o += NW;
    const a = t * 0.012 + 2, px = Math.cos(a) * 760, pz = Math.sin(a) * 760, st = fract(t * 0.8) < 0.12 ? 3.2 : 0;
    put(im, o, px, 340, pz, st); put(im, o + 1, px - Math.sin(a) * 9, 340, pz + Math.cos(a) * 9, 1.6); put(im, o + 2, px + Math.sin(a) * 9, 340, pz - Math.cos(a) * 9, 1.6);
    im.instanceMatrix.needsUpdate = true;
  });
}

// 택배 드론: 건물 위 높은 항로를 돈다(닿을 수 있으므로 충돌 상자를 붙인다)
function couriers(w) {
  const body = new Geo(), lite = new Geo();
  body.box(0, -0.12, 0, 0.9, 0.24, 1.1, 0x2a3040).box(0, -0.72, 0, 0.7, 0.6, 0.7, 0xd98a2b);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { body.bar([0, 0, 0], [sx * 0.85, 0.05, sz * 0.85], 0.05, 0x596273, 4); body.cyl(sx * 0.85, 0.08, sz * 0.85, 0.5, 0.04, 0xaab4c4, 10); }
  lite.box(0, -0.08, -0.57, 0.5, 0.1, 0.05, 0xffffff).box(0, -0.08, 0.57, 0.5, 0.1, 0.05, 0xff3030).box(0, -1.0, 0, 0.3, 0.05, 0.3, 0x35ff7a);
  const routes = [
    [new Rail(Array.from({ length: 8 }, (_, i) => [Math.cos(i * 0.7854) * 36, 104, Math.sin(i * 0.7854) * 36]), true), 3, 8],
    [new Rail(roundRect(-120, 120, -120, 100, 30, 96, 5), true), 5, 11],
  ];
  const list = [];
  for (const [rail, n, v] of routes) for (let k = 0; k < n; k++) list.push({ rail, s: (k / n) * rail.length, v: v * (0.92 + k * 0.04) });
  const bm = fleet(w, body.build(), litMat(), list.length), lm = fleet(w, lite.build(), glowMat(w, 1), list.length);
  list.forEach((c, i) => w.rider([bm, i], [[0, -0.4, 0, 1.4, 0.8, 1.4]]));
  w.updaters.push((dt, t) => {
    for (let i = 0; i < list.length; i++) { const c = list[i]; c.s += c.v * dt; c.rail.at(c.s, _p, _d); _p.y += Math.sin(t * 1.1 + i * 2) * 0.5; aim(bm, i, _p, _d, 1.5); aim(lm, i, _p, _d, 1.5); }
    bm.instanceMatrix.needsUpdate = lm.instanceMatrix.needsUpdate = true;
  });
}

// 깃발(장대 옆으로 나부낌)·늘어뜨린 깃발: 한 메시의 정점을 매 프레임 흔든다
function flags(w, list) {
  if (!list.length) return;
  const NX = 6, NY = 3, VN = (NX + 1) * (NY + 1), pos = new Float32Array(list.length * VN * 3), col = [], idx = [];
  list.forEach((f, n) => {
    _c.set(f.c);
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const k = f.kind === "banner" ? (i === 0 || i === NX ? 0.6 : 1) : 0.75 + 0.25 * (j / NY); col.push(_c.r * k, _c.g * k, _c.b * k); }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = n * VN + j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  });
  const g = new THREE.BufferGeometry(), pa = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("position", pa); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }); mat.color.setScalar(0.6);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; w.scene.add(m);
  w.updaters.push((dt, t) => {
    let o = 0;
    for (let n = 0; n < list.length; n++) {
      const f = list[n], ca = Math.cos((f.ry || 0) * Math.PI / 180), sa = Math.sin((f.ry || 0) * Math.PI / 180);
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
        const u = i / NX, v = j / NY;
        let lx, ly, lz;
        if (f.kind === "banner") { lx = (u - 0.5) * f.len; ly = -v * f.h; lz = Math.sin(t * 1.6 + v * 2.2 + n * 1.7) * 0.16 * v + Math.sin(t * 2.3 + u * 3 + n) * 0.04 * v; }
        else { lx = u * f.len; ly = v * f.h - u * u * 0.3; lz = Math.sin(u * 5.5 - t * 4.2 + n * 1.3) * 0.2 * u; }
        pos[o++] = f.x + lx * ca + lz * sa; pos[o++] = f.y + ly; pos[o++] = f.z - lx * sa + lz * ca;
      }
    }
    pa.needsUpdate = true;
  });
}

// 유리 승강기: 외벽 레일을 오르내리는 불 켜진 칸
function lifts(w, list) {
  const g = new Geo();
  g.box(0, 0, 0, 1.5, 2.3, 0.5, 0xffe6b0).box(0, 2.3, 0, 1.7, 0.14, 0.6, 0x21d4fd).box(0, -0.14, 0, 1.7, 0.14, 0.6, 0x21d4fd);
  const im = fleet(w, g.build(), glowMat(w, 0.55), list.length);
  w.updaters.push((dt, t) => {
    list.forEach((l, i) => {
      const p = fract(t * 0.035 + i * 0.37), k = p < 0.4 ? smooth(p / 0.4) : p < 0.5 ? 1 : p < 0.9 ? 1 - smooth((p - 0.5) / 0.4) : 0;
      _m.makeRotationY(l.nx ? Math.PI / 2 : 0).setPosition(l.x + l.nx * 0.3, 4 + (l.h - 8) * k, l.z + l.nz * 0.3); im.setMatrixAt(i, _m);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

// 불꽃놀이: 공연장 너머 남동쪽 하늘(맵 밖)
function fireworks(w) {
  const SH = 3, PN = 40, k = w.env.glow ?? 2.4, mat = new THREE.MeshBasicMaterial({ fog: false }); mat.color.setScalar(k * 1.2);
  const im = swarm(w, new THREE.OctahedronGeometry(1, 0), mat, SH * PN), dirs = [];
  for (let i = 0; i < PN; i++) { const y = 1 - (2 * (i + 0.5)) / PN, rr = Math.sqrt(1 - y * y), a = i * 2.39996; dirs.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); }
  w.updaters.push((dt, t) => {
    for (let s = 0; s < SH; s++) {
      const u = (t + s * 2.3) / 6.2, n = Math.floor(u), f = u - n, h = n * 3 + s;
      const cx = 120 + hash(h) * 110, cy = 92 + hash(h + 0.3) * 40, cz = 262 + hash(h + 0.7) * 50, R = 24 + hash(h + 0.5) * 14;
      _c.set(NEON[(hash(h + 0.9) * 6) | 0]);
      for (let i = 0; i < PN; i++) {
        const j = s * PN + i;
        if (f < 0.16) { if (i < 3) { const e = f / 0.16 - i * 0.04; put(im, j, cx, 20 + (cy - 20) * smooth(e), cz, 0.35 - i * 0.08); im.setColorAt(j, _d.set(1, 0.85, 0.6)); } else put(im, j, 0, -99, 0, 0); continue; }
        const e = (f - 0.16) / 0.6;
        if (e >= 1) { put(im, j, 0, -99, 0, 0); continue; }
        const d = dirs[i], rr = R * (1 - Math.exp(-4.5 * e)), b = (1 - e) * (1 - e) * (0.75 + 0.25 * Math.sin(t * 30 + i));
        put(im, j, cx + d[0] * rr, cy + d[1] * rr - 16 * e * e, cz + d[2] * rr, 0.75 * (1 - e * 0.5));
        im.setColorAt(j, _d.set(_c.r * b + b * 0.15, _c.g * b + b * 0.15, _c.b * b + b * 0.15));
      }
    }
    im.instanceMatrix.needsUpdate = im.instanceColor.needsUpdate = true;
  });
}

// 무대 위에서 객석 하늘을 훑는 조명 4줄
function stageLights(w) {
  const g = new THREE.CylinderGeometry(3.4, 0.2, 60, 12, 1, true);
  g.translate(0, 30, 0);
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const k = 1 - P.getY(i) / 60; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k * k; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  [[108, MAG], [116, CYA], [124, YEL], [132, GRN]].forEach(([x, c], i) => {
    const m = new THREE.Mesh(g, addMat({ color: new THREE.Color(c).multiplyScalar(0.16), vertexColors: true, side: THREE.DoubleSide }));
    m.position.set(x, 16.6, 188.5); m.renderOrder = 6; m.frustumCulled = false; m.rotation.order = "YXZ"; w.scene.add(m);
    w.updaters.push((dt, t) => { m.rotation.x = -0.75 + Math.sin(t * 0.9 + i * 1.6) * 0.3; m.rotation.z = Math.sin(t * 0.6 + i * 2.1) * 0.5; });
  });
}

export function fx(w, K) {
  beams(w, K.beams); blinkers(w, K); steam(w, K.steam); motes(w, K); couriers(w); flags(w, K.flags); lifts(w, K.lifts); fireworks(w); stageLights(w);
  // 전망대 아래를 도는 전광 띠
  const band = K.signs2.band(Array(12).fill("ticker"), 8.9, 2.38);
  band.position.set(0, 86.9, 0); w.scene.add(band);
  w.updaters.push((dt) => { band.rotation.y -= dt * 0.18; });
}
