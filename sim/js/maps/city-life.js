// 네온 시티의 움직이는 것들(장식, 충돌 없음): 모노레일 열차·차량·유람선·대관람차·비행선·탐조등·경고등·회전 간판
import * as THREE from "../../vendor/three.module.min.js";
import { MAG, CYA, YEL, NEON, TRS, Geo, Rail, roundRect, fleet, aim, litMat, glowMat } from "./city-kit.js";

const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4();
const CAR_COLORS = [0xd13b3b, 0xf2f2f2, 0x2f8cff, 0xffc400, 0x35c46a, 0xb44cff, 0x3a4250, 0xff7a1a];

// 모노레일 열차 4량: 역 근처에서 속도를 줄인다
function train(w, pts) {
  const rail = new Rail(pts, true), N = 4, LEN = 11.7, body = new Geo(), lite = new Geo();
  body.box(0, -1.0, 0, 3.0, 1.1, 10.4, 0x2a3040).box(0, 0.1, 0, 2.9, 2.5, 10.9, 0xe8ecf2).box(0, 2.6, 0, 2.3, 0.3, 9.6, 0xb8c0cc).box(0, 0.42, 0, 2.96, 0.36, 10.95, 0x21b4dd);
  lite.box(0, 1.2, 0, 2.97, 0.85, 9.4, 0xffe6b0).box(0, 0.5, -5.47, 1.8, 0.25, 0.06, 0xffffff).box(0, 0.5, 5.47, 1.8, 0.25, 0.06, 0xff3030);
  const bm = fleet(w, body.build(), litMat(), N, true), lm = fleet(w, lite.build(), glowMat(w, 0.5), N);
  let s = 60, v = 12;
  w.updaters.push((dt) => {
    rail.at(s - LEN * 1.5, _p);
    const near = Math.min(Math.hypot(_p.x, _p.z + 90), Math.hypot(_p.x, _p.z - 90));
    v += Math.max(-5 * dt, Math.min(3 * dt, (near < 36 ? 3 + near * 0.33 : 15) - v));
    s += v * dt;
    for (let i = 0; i < N; i++) {
      const c = s - i * LEN;
      rail.at(c + 4, _a); rail.at(c - 4, _b);          // 앞뒤 대차 두 점으로 자세를 잡는다
      _p.addVectors(_a, _b).multiplyScalar(0.5); _d.subVectors(_a, _b);
      aim(bm, i, _p, _d); aim(lm, i, _p, _d);
    }
    bm.instanceMatrix.needsUpdate = lm.instanceMatrix.needsUpdate = true;
  });
}

// 도로를 도는 차량(인스턴스 한 묶음) + 고가도로 차량
function traffic(w) {
  const car = new Geo(), lite = new Geo();
  car.box(0, 0.3, 0, 1.8, 0.65, 4.4, 0xffffff).box(0, 0.95, 0.25, 1.6, 0.55, 2.3, 0x1e2632);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) car.box(sx * 0.82, 0, sz * 1.4, 0.3, 0.68, 0.68, 0x101114);
  lite.box(0, 0.62, -2.22, 1.5, 0.16, 0.06, 0xfff2c0).box(0, 0.64, 2.22, 1.5, 0.14, 0.06, 0xff2020);
  const o = 3.5;
  const loops = [
    [roundRect(-150 + o, 150 - o, -150 + o, 90 - o, 9, 0, 4, true), 4, 14],
    [roundRect(-30 - o, 30 + o, -150 - o, 90 + o, 9, 0, 4, false), 3, 12],
    [roundRect(-90 + o, 90 - o, -30 + o, 30 - o, 9, 0, 4, true), 3, 11],
    [roundRect(-150 - o, -90 + o, 90 - o, 210 + o, 9, 0, 4, false), 2, 12],
    [roundRect(30 + o, 150 - o, 90 + o, 210 - o, 9, 0, 4, true), 3, 13],
    [roundRect(-500, 500, 147.2, 152.8, 2.7, 10.05, 3, false), 6, 23],
  ];
  const cars = [];
  loops.forEach(([pts, n, v], li) => { const rail = new Rail(pts, true); for (let k = 0; k < n; k++) cars.push({ rail, s: ((k + li * 0.37) / n) * rail.length, v: v * (0.9 + ((k * 7 + li * 3) % 5) * 0.05) }); });
  const bm = fleet(w, car.build(), litMat(), cars.length, true), lm = fleet(w, lite.build(), glowMat(w, 0.9), cars.length);
  const col = new THREE.Color();
  cars.forEach((c, i) => bm.setColorAt(i, col.set(CAR_COLORS[i % CAR_COLORS.length])));
  w.updaters.push((dt) => {
    for (let i = 0; i < cars.length; i++) { const c = cars[i]; c.s += c.v * dt; c.rail.at(c.s, _p, _d); aim(bm, i, _p, _d); aim(lm, i, _p, _d); }
    bm.instanceMatrix.needsUpdate = lm.instanceMatrix.needsUpdate = true;
  });
}

// 천변 유람선
function boats(w) {
  const g = new Geo();
  g.box(0, -0.15, 0, 2.2, 0.75, 5.6, 0xffffff).box(0, -0.15, -3.3, 1.4, 0.6, 1.2, 0xffffff).box(0, 0.6, 0.3, 1.8, 0.95, 2.6, 0x30384a).box(0, 1.55, 0.3, 2.1, 0.12, 3.0, 0xffffff);
  const rail = new Rail(roundRect(-112, 162, 54.6, 65.4, 3.2, -5.5, 4, false), true), N = 3;
  const bm = fleet(w, g.build(), litMat(), N), col = new THREE.Color();
  [0xffc94a, 0x5ad6ff, 0xff7ac8].forEach((c, i) => bm.setColorAt(i, col.set(c)));
  let t0 = 0;
  w.updaters.push((dt) => {
    t0 += dt * 3.2;
    for (let i = 0; i < N; i++) { rail.at(t0 + (i / N) * rail.length, _p, _d); _p.y += Math.sin(t0 * 0.5 + i * 2) * 0.05; aim(bm, i, _p, _d); }
    bm.instanceMatrix.needsUpdate = true;
  });
}

// 대관람차 바퀴(축은 x 방향)와 곤돌라
function ferris(w, cx, cz, hubY, R) {
  const lit = new Geo(), neon = new Geo(), N = 16, toYZ = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const tor = (g, r, tube, seg, dx, c) => g.add(new THREE.TorusGeometry(r, tube, 5, seg), new THREE.Matrix4().makeTranslation(dx, 0, 0).multiply(toYZ), c);
  for (const dx of [-1.5, 1.5]) {
    tor(lit, R, 0.28, 48, dx, 0xdfe3ea); tor(lit, R * 0.52, 0.15, 32, dx, 0xdfe3ea); tor(neon, R + 0.36, 0.11, 64, dx, MAG); tor(neon, R * 0.52, 0.2, 32, dx * 1.12, CYA);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.2832, c = Math.cos(a), s = Math.sin(a);
      lit.bar([dx, 0, 0], [dx, s * R, c * R], 0.12, 0xdfe3ea, 5);
      neon.bar([dx * 1.14, s * R * 0.56, c * R * 0.56], [dx * 1.14, s * R * 0.97, c * R * 0.97], 0.07, NEON[i % 6], 4);
    }
  }
  for (let i = 0; i < N; i++) { const a = (i / N) * 6.2832; lit.bar([-1.5, Math.sin(a) * R, Math.cos(a) * R], [1.5, Math.sin(a) * R, Math.cos(a) * R], 0.1, 0xdfe3ea, 5); }
  const grp = new THREE.Group();
  grp.position.set(cx, hubY, cz);
  const wm = new THREE.Mesh(lit.build(), litMat()), nm = new THREE.Mesh(neon.build(), glowMat(w, 0.8));
  wm.castShadow = true; wm.frustumCulled = nm.frustumCulled = false;
  grp.add(wm, nm); w.scene.add(grp);
  const gg = new Geo();
  gg.box(0, -3.3, 0, 2.0, 2.2, 2.2, 0xffffff).box(0, -1.1, 0, 2.3, 0.25, 2.5, 0xffffff).box(0, -0.9, 0, 0.12, 0.9, 0.12, 0x9aa0a8);
  const gm = fleet(w, gg.build(), litMat(), N), col = new THREE.Color();
  for (let i = 0; i < N; i++) gm.setColorAt(i, col.set(NEON[i % 6]).lerp(new THREE.Color(0xffffff), 0.35));
  let rot = 0;
  w.updaters.push((dt) => {
    rot += dt * 0.075; grp.rotation.x = -rot;
    for (let i = 0; i < N; i++) { const a = (i / N) * 6.2832 + rot; gm.setMatrixAt(i, _m.makeTranslation(cx, hubY + Math.sin(a) * R, cz + Math.cos(a) * R)); }
    gm.instanceMatrix.needsUpdate = true;
  });
}

// 도심 상공을 도는 광고 비행선
function airship(w, K) {
  const g = new Geo();
  g.sph(0, 0, 0, 5.6, 5.6, 19, 0xcfd6e2).box(0, -6.9, 1, 2.4, 1.7, 6, 0x3a4050).box(0, -3.6, 15.5, 0.3, 7.2, 5, 0x21b4dd).box(0, -0.15, 15.5, 7.2, 0.3, 5, 0x21b4dd);
  const grp = new THREE.Group(), m = new THREE.Mesh(g.build(), litMat());
  grp.add(m);
  for (const s of [-1, 1]) { const p = K.signs.plane("gp", 17); p.position.set(s * 5.75, 0, 0); p.rotation.y = (s * Math.PI) / 2; grp.add(p); }
  w.scene.add(grp);
  w.updaters.push((dt, t) => { const a = t * 0.04 + 1; grp.position.set(Math.cos(a) * 165, 126 + Math.sin(t * 0.3) * 2, Math.sin(a) * 165 - 20); grp.rotation.y = Math.PI - a; });
}

// 하늘을 훑는 탐조등
function searchlights(w) {
  const g = new THREE.CylinderGeometry(9, 0.4, 170, 14, 1, true);
  g.translate(0, 85, 0);
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const k = 1 - P.getY(i) / 170; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k * k; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  [[104, 16, 197, CYA], [136, 16, 197, MAG], [21, 1, -197, YEL], [-21, 1, -197, CYA]].forEach(([x, y, z, c], i) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.11), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z); m.renderOrder = 6; m.frustumCulled = false; m.rotation.order = "YXZ";
    w.scene.add(m);
    w.updaters.push((dt, t) => { m.rotation.y = t * 0.23 * (i % 2 ? -1 : 1) + i * 1.7; m.rotation.x = 0.42 + Math.sin(t * 0.31 + i) * 0.2; });
  });
}

// 깜빡이는 항공 경고등(한 메시, 재질 밝기만 바꾼다)
function beacons(w, K) {
  const g = new Geo();
  for (const [x, y, z, s = 0.42] of K.beacons) g.add(new THREE.OctahedronGeometry(1, 0), TRS(x, y, z, 0, s, s, s), 0xff2a2a);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true }), m = new THREE.Mesh(g.build(), mat), k = (w.env.glow ?? 2.4) * 1.3;
  m.frustumCulled = false; w.scene.add(m);
  w.updaters.push((dt, t) => mat.color.setScalar(k * (0.2 + 0.8 * Math.max(0, Math.sin(t * 2.6)) ** 2)));
}

export function life(w, K, railPts) {
  train(w, railPts); traffic(w); boats(w); ferris(w, 120, 120, 38, 27); airship(w, K); searchlights(w); beacons(w, K);
  // 원통 타워 꼭대기의 회전 간판 고리
  const band = K.signs.band(["neon", "gp", "neon", "gp"], 9.3, 5.4);
  band.position.set(-60, 63.3, 0); w.scene.add(band);
  w.updaters.push((dt) => { band.rotation.y += dt * 0.25; });
}
