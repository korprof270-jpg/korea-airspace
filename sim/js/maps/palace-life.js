// 단풍 고궁의 움직이는 것들: 조정 마당의 어가 행렬, 순환로의 소달구지, 하늘의 두루미 떼, 방패연, 흩날리는 낙엽
import * as THREE from "../../vendor/three.module.min.js";
import { Geo, Rail, roundRect, fleet, aim, litMat, TRS, G } from "./city-kit.js";
import { C } from "./palace-kit.js";

const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Vector3();

// 사람 한 명(옷 색은 인스턴스 색으로 준다)
function person(g, x = 0, z = 0, tone = 0xffffff, hat = 0x24242a) {
  g.add(G.cone(6, 0.55), TRS(x, 0.68, z, 0, 0.27, 1.36, 0.23), tone);
  g.add(G.box(), TRS(x, 1.5, z, 0, 0.24, 0.26, 0.24), 0xf0d2b8);
  if (hat) g.add(G.cyl(8), TRS(x, 1.66, z, 0, 0.38, 0.05, 0.38), hat).add(G.cyl(8), TRS(x, 1.74, z, 0, 0.16, 0.16, 0.16), hat);
  return g;
}

// 어가 행렬: 깃발 든 군사들과 가마가 마당을 돈다
function procession(w) {
  const rail = new Rail(roundRect(-27, 27, 13, 51, 6, 0.08, 4, true), true), N = 14, col = new THREE.Color();
  const pm = fleet(w, person(new Geo()).build(), litMat(), N, true);
  const bg = new Geo(); bg.cyl(0.32, 0, 0, 0.035, 3.6, 0x5a4030, 6).box(0.32, 2.5, 0.42, 0.05, 1.0, 0.8, 0xffffff);
  const bm = fleet(w, bg.build(), litMat(), 4);
  // 가마: 붉은 몸체, 금빛 지붕, 가마꾼 넷
  const kg = new Geo();
  for (const sx of [-1, 1]) { kg.box(sx * 0.62, 0.95, 0, 0.1, 0.1, 5.0, 0x6a4a30); for (const sz of [-1, 1]) person(kg, sx * 1.02, sz * 2.0, 0x6f8fc0, 0x24242a); }
  kg.box(0, 0.9, 0, 1.3, 1.5, 1.8, C.red).box(0, 1.5, 0, 1.34, 0.5, 1.2, C.yel).box(0, 2.4, 0, 1.7, 0.12, 2.2, C.redD);
  kg.add(G.pyr(0.2), TRS(0, 2.82, 0, 0, 1.6, 0.6, 2.1), C.yel);
  const km = fleet(w, kg.build(), litMat(), 1, true);
  const tones = [C.red, C.red, C.blue, C.yel, C.red, C.blue];
  const off = [];
  for (let i = 0; i < N; i++) { off.push(i * 2.3 + (i >= 7 ? 9 : 0)); pm.setColorAt(i, col.set(tones[i % 6])); w.rider([pm, i], [[0, 0.85, 0, 0.3, 0.85, 0.3]]); }
  [C.red, C.blue, C.yel, C.wht].forEach((c, i) => bm.setColorAt(i, col.set(c)));
  w.rider([km, 0], [[0, 1.4, 0, 1.15, 1.4, 2.5]]);
  let s = 0;
  w.updaters.push((dt) => {
    s += dt * 1.25;
    for (let i = 0; i < N; i++) {
      rail.at(s - off[i], _p, _d); _p.x += (i % 2 ? 0.7 : -0.7) * _d.z; _p.z -= (i % 2 ? 0.7 : -0.7) * _d.x;
      aim(pm, i, _p, _d); if (i % 4 === 0) aim(bm, i / 4, _p, _d);
    }
    rail.at(s - 7 * 2.3 - 3.4, _p, _d); aim(km, 0, _p, _d);
    pm.instanceMatrix.needsUpdate = bm.instanceMatrix.needsUpdate = km.instanceMatrix.needsUpdate = true;
  });
}

// 소달구지: 순환로 바깥 차선을 천천히 돈다
function carts(w) {
  const g = new Geo();
  g.box(0, 0.55, -2.2, 0.85, 0.85, 1.9, 0x8a5a34).box(0, 0.95, -3.4, 0.5, 0.5, 0.7, 0x7a4c2a).box(0, 1.35, -3.3, 0.9, 0.08, 0.08, 0xe8e0d0);
  for (const sx of [-1, 1]) for (const sz of [-2.9, -1.5]) g.box(sx * 0.3, 0, sz, 0.18, 0.6, 0.18, 0x6a4426);
  for (const sx of [-1, 1]) g.box(sx * 0.5, 0.75, -0.6, 0.08, 0.08, 2.6, 0x5a4030).cyl(sx * 0.95, 0.68, 1.4, 0.75, 0.14, 0x4a3424, 10, 0, 90);
  g.box(0, 0.72, 1.4, 1.7, 0.16, 2.7, 0x7a5a3a).box(0, 0.88, 1.5, 1.5, 1.0, 2.3, C.thatch).box(0, 1.88, 1.5, 1.1, 0.4, 1.8, 0xcfa64e);
  person(g, 0, 0.1, 0xf0ead8, 0xc9a352);
  const rail = new Rail(roundRect(-144.3, 144.3, -133.2, 131.6, 10, 0.06, 4, false), true), N = 2;
  const m = fleet(w, g.build(), litMat(), N, true);
  for (let i = 0; i < N; i++) w.rider([m, i], [[0, 0.95, -0.6, 0.95, 0.95, 3.2]]);
  let s = 150;
  w.updaters.push((dt) => {
    s += dt * 2.1;
    for (let i = 0; i < N; i++) { rail.at(s + (i / N) * rail.length, _p, _d); aim(m, i, _p, _d); }
    m.instanceMatrix.needsUpdate = true;
  });
}

// 두루미 떼: 궁궐 위를 크게 돈다
function cranes(w) {
  const g = new Geo();
  g.sph(0, 0, 0, 0.3, 0.26, 0.95, 0xffffff).box(0, -0.02, -1.5, 0.1, 0.1, 1.3, 0xffffff).box(0, 0.0, -2.25, 0.06, 0.06, 0.5, 0x3a3a3a).box(0, 0.08, -1.95, 0.14, 0.08, 0.2, 0xd8302a).box(0, -0.1, 1.5, 0.08, 0.06, 1.4, 0x2a2a2e);
  for (const sx of [-1, 1]) g.add(G.box(), TRS(sx * 1.35, 0.22, 0, 0, 2.6, 0.06, 0.85, 0, sx * 10), 0xffffff).add(G.box(), TRS(sx * 2.85, 0.42, 0.05, 0, 0.7, 0.06, 0.8, 0, sx * 4), 0x26262c);
  const N = 7, m = fleet(w, g.build(), litMat(), N);
  for (let i = 0; i < N; i++) w.rider([m, i], [[0, 0.1, 0, 1.6, 0.35, 1.2]]);
  let a = 0.6;
  w.updaters.push((dt, t) => {
    a += dt * 0.05;
    for (let i = 0; i < N; i++) {
      const k = i - 3, R = 150 + Math.abs(k) * 0 + k * 3.2, ai = a - Math.abs(k) * 0.028;
      _p.set(Math.cos(ai) * R, 96 + Math.sin(t * 0.25 + i) * 1.5 - Math.abs(k) * 0.6, -30 + Math.sin(ai) * R * 0.86);
      _d.set(-Math.sin(ai), 0, Math.cos(ai) * 0.86);
      aim(m, i, _p, _d, 1.5);
    }
    m.instanceMatrix.needsUpdate = true;
  });
}

// 방패연: 들판의 아이가 띄운 연. 줄째로 바람에 흔들린다
function kites(w) {
  const str = new THREE.MeshBasicMaterial({ color: 0xe8e2d4 });
  [[-34, 228, 46, 0xf2f2ea, C.red, 0.2], [58, 229, 54, C.yel, C.blue, -0.3], [-128, 228, 40, 0xf2f2ea, C.blue, 0.5]].forEach(([x, z, L, c1, c2, yaw], i) => {
    const g = new Geo();
    g.box(0, L - 1.5, 0, 2.6, 3.2, 0.06, c1).box(0, L + 0.9, 0.02, 2.6, 0.8, 0.07, c2).box(0, L - 1.5, 0.02, 2.6, 0.5, 0.07, c2);
    g.add(G.cyl(10), TRS(0, L + 0.1, 0.03, 0, 0.55, 0.08, 0.55, 90), 0x2a2a30);
    for (const sx of [-1, 1]) g.box(sx * 0.9, L - 5.5, 0, 0.16, 4.0, 0.03, c2);
    const grp = new THREE.Group(), km = new THREE.Mesh(g.build(), litMat());
    const sg = new THREE.CylinderGeometry(0.03, 0.03, L - 1.5, 4); sg.translate(0, (L - 1.5) / 2, 0);
    grp.add(km, new THREE.Mesh(sg, str));
    grp.position.set(x, 1.2, z); grp.rotation.order = "YXZ";
    w.scene.add(grp);
    w.rider(grp, [[0, L, 0, 1.4, 1.8, 0.3]]);
    w.updaters.push((dt, t) => { grp.rotation.y = yaw + Math.sin(t * 0.21 + i * 2) * 0.22; grp.rotation.x = -0.62 + Math.sin(t * 0.43 + i) * 0.07; grp.rotation.z = Math.sin(t * 0.8 + i * 3) * 0.05; });
  });
}

// 낙엽: 단풍·은행나무 아래로 천천히 떨어지는 점들
function leaves(w) {
  const r = w.rand, SITES = [[71.6, 0, 6, 26, 9, 0], [92, -42, 20, 20, 10, 0], [114, 60, 11, 11, 17, 1], [0, 101, 110, 4, 9, 1], [5, -172, 16, 28, 11, 0], [0, 200, 9, 9, 13, 2], [-90, 78, 24, 3, 8, 0], [0, -66, 46, 6, 8, 0]];
  const N = 520, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), L = [], c = new THREE.Color();
  const pal = [[0xd8402a, 0xe8792a, 0xc9302a], [0xf2c822, 0xe9b81a, 0xf7d84a], [0xd9902a, 0xc9a02a, 0xb8782a]];
  for (let i = 0; i < N; i++) {
    const s = SITES[i % SITES.length], x = s[0] + (r() * 2 - 1) * s[2], z = s[1] + (r() * 2 - 1) * s[3];
    L.push({ x, z, base: Math.max(0, w.h(x, z)), top: s[4] * (0.6 + r() * 0.4), ph: r() * 20, v: 0.6 + r() * 0.8, a: 0.4 + r() * 0.8 });
    c.set(pal[s[5]][(r() * 3) | 0]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.3, vertexColors: true, sizeAttenuation: true }));
  pts.frustumCulled = false;
  w.scene.add(pts);
  const upd = (dt, t) => {
    for (let i = 0; i < N; i++) {
      const l = L[i], k = (t * l.v + l.ph) % l.top;
      pos[i * 3] = l.x + Math.sin(t * 1.3 + l.ph) * l.a + k * 0.25; pos[i * 3 + 1] = l.base + l.top - k; pos[i * 3 + 2] = l.z + Math.cos(t * 0.9 + l.ph * 1.7) * l.a;
    }
    g.attributes.position.needsUpdate = true;
  };
  upd(0, 0);
  w.updaters.push(upd);
}

export function life(w) { procession(w); carts(w); cranes(w); kites(w); leaves(w); void _q; }
