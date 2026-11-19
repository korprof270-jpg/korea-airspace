// 아군 함선 모델: 호송 임무의 수송함, 함께 나는 호위정, 트래킹 피사체(관측정·화물 드론). 전방 = -Z, 원점 = 선체 중심
import * as THREE from "../vendor/three.module.min.js";
import { toonMat } from "./toon.js";
import { buildDrone, botLook } from "./dronemodel.js";

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const mat = (color, o = {}) => toonMat({ color, ...o });
const gloss = (color, k = 0.5) => toonMat({ color, spec: k, shine: 70, rim: 0.3 });
const lit = (color, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });

// 같은 재질끼리 한 메시로 합치는 조립기. add(재질, 지오메트리, 위치, 회전, 크기)
function kit() {
  const groups = new Map();
  const add = (m, geo, p = [0, 0, 0], r = null, s = null) => {
    _q.identity(); if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    _s.set(1, 1, 1); if (s) _s.set(s[0], s[1], s[2]);
    let L = groups.get(m); if (!L) groups.set(m, (L = []));
    L.push({ geo, m: new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s) });
  };
  const bake = (root) => {
    for (const [m, list] of groups) {
      let nv = 0, ni = 0;
      for (const it of list) { nv += it.geo.attributes.position.count; ni += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni), nm = new THREE.Matrix3();
      let vo = 0, io = 0;
      for (const { geo, m: mx } of list) {
        if (!geo.attributes.normal) geo.computeVertexNormals();
        const P = geo.attributes.position, N = geo.attributes.normal, I = geo.index; nm.getNormalMatrix(mx);
        for (let i = 0; i < P.count; i++) {
          _v.fromBufferAttribute(P, i).applyMatrix4(mx); pos.set([_v.x, _v.y, _v.z], (vo + i) * 3);
          _v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([_v.x, _v.y, _v.z], (vo + i) * 3);
        }
        const n = I ? I.count : P.count;
        for (let i = 0; i < n; i++) idx[io++] = vo + (I ? I.getX(i) : i);
        vo += P.count; geo.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = !m.isMeshBasicMaterial; root.add(mesh);
    }
    return root;
  };
  return { add, bake };
}
const box = (w, h, l) => new THREE.BoxGeometry(w, h, l);
// 앞(-Z)으로 갈수록 좁아지는 상자: 앞면의 폭·높이 비율과 앞면 높이 치우침(dy)
function wedge(w, h, l, fx, fy, dy = 0) {
  const g = new THREE.BoxGeometry(w, h, l), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) if (P.getZ(i) < 0) { P.setX(i, P.getX(i) * fx); P.setY(i, P.getY(i) * fy + dy); }
  g.computeVertexNormals();
  return g;
}
const cylZ = (r0, r1, l, n = 14, open = false) => { const g = new THREE.CylinderGeometry(r0, r1, l, n, 1, open); g.rotateX(Math.PI / 2); return g; };   // 축 = Z, r0 = 뒤(+Z) 쪽 반지름
// 분사 불꽃: 뒤(+Z)로 뻗는 가산 혼합 원뿔 둘
function flame(root, x, y, z, r, len, color) {
  const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
  for (const [k, op] of [[1, 0.5], [0.55, 0.9]]) {
    const geo = new THREE.ConeGeometry(r * k, len * (k < 1 ? 0.6 : 1), 12, 1, true); geo.rotateX(Math.PI / 2); geo.translate(0, 0, len * (k < 1 ? 0.3 : 0.5));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: k < 1 ? 0xffffff : color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 3; g.add(m);
  }
  return g;
}

// 아군 수송함 (길이 약 19m · 폭 11m). 흰 선체에 연합 파랑 띠, 갑판 화물, 뒤쪽 함교, 양옆 엔진 포드와 아래 부양기
// userData: tick(dt, speed, t) · radius · nozzles(엔진 분사구 로컬 좌표) · boxes(충돌 상자) · dispose()
export function makeTransportShip(color = 0x2f6fb0) {
  const g = new THREE.Group(), K = kit(), A = K.add;
  const hull = gloss(0xdde3ec, 0.4), plate = gloss(0x8d97a8, 0.35), dark = mat(0x1d2129), blue = gloss(color, 0.5), glass = gloss(0x1f3550, 0.9), crate = gloss(0xd98a2b, 0.25);
  const win = lit(0x9fe4ff, 1.7), thr = lit(0x58c8ff, 2.6), lamp = lit(0xfff2c0, 1.8), red = lit(0xff2a2a, 2.2), green = lit(0x2aff6a, 2.0), teamLit = lit(0x4aa8ff, 2.2);
  // 선체
  A(hull, box(5.0, 2.4, 11), [0, 0, 0.6]);
  A(hull, wedge(5.0, 2.4, 4.6, 0.3, 0.42, -0.35), [0, 0, -7.2]);                 // 뱃머리
  A(plate, box(3.8, 0.9, 11.6), [0, -1.5, 0.4]);
  A(plate, wedge(3.8, 0.9, 3.4, 0.35, 0.6, 0.12), [0, -1.5, -7.1]);               // 용골 앞
  A(plate, box(5.5, 2.9, 2.4), [0, 0.1, 6.9]);                                    // 기관실
  A(blue, box(5.56, 0.34, 2.46), [0, 1.0, 6.9]);                                  // 기관실 띠
  A(dark, box(3.4, 1.5, 0.12), [0, -0.25, 8.08]);                                 // 뒷문(화물 경사로)
  A(hull, box(3.7, 0.16, 0.2), [0, 0.56, 8.1]); A(hull, box(3.7, 0.16, 0.2), [0, -1.06, 8.1]);
  for (const x of [-1, 1]) A(red, box(0.5, 0.16, 0.08), [x * 2.3, 0.45, 8.12]);   // 미등
  for (const x of [-1, 1]) {
    A(plate, box(0.9, 1.1, 9.4), [x * 2.85, -0.45, 0.2]);                         // 옆구리 덧판
    A(blue, box(0.1, 0.5, 10.6), [x * 2.52, 0.62, 0.6]);                          // 파랑 띠
    A(blue, wedge(0.1, 0.5, 4.2, 1, 0.5, -0.2), [x * 1.62, 0.62, -7.1], [0, x * 0.372, 0]);
    A(teamLit, box(0.06, 0.1, 9.6), [x * 3.32, -0.3, 0.2]);                       // 옆 조명 띠
    for (const z of [-3.2, -1.2, 0.8, 2.8]) A(win, box(0.06, 0.34, 0.9), [x * 2.53, 0.05, z]);   // 선실 창
    A(lamp, box(0.5, 0.22, 0.1), [x * 0.55, -0.55, -9.42]);                       // 전조등
  }
  A(dark, box(4.6, 0.12, 9.6), [0, 1.24, 0.2]);                                   // 갑판
  A(blue, wedge(2.2, 0.08, 3.4, 0.2, 1), [0, 1.0, -6.6], [0.2, 0, 0]);            // 뱃머리 표식
  // 갑판 화물
  const cm = [crate, blue, plate, plate, crate, blue];
  for (let i = 0; i < 6; i++) {
    const x = (i % 2 ? 1 : -1) * 1.12, z = -3.4 + Math.floor(i / 2) * 2.5;
    A(cm[i], box(2.0, 1.45, 2.3), [x, 2.02, z]);
    A(dark, box(2.06, 1.5, 0.14), [x, 2.02, z - 0.7]); A(dark, box(2.06, 1.5, 0.14), [x, 2.02, z + 0.7]);
  }
  // 함교
  A(hull, wedge(3.8, 2.0, 3.2, 0.82, 0.55, 0.42), [0, 2.3, 5.4]);
  A(glass, box(3.0, 0.62, 0.12), [0, 2.78, 3.86], [-0.26, 0, 0]);
  A(win, box(2.7, 0.2, 0.1), [0, 2.72, 3.8], [-0.26, 0, 0]);
  for (const x of [-1, 1]) A(glass, box(0.1, 0.55, 1.5), [x * 1.86, 2.75, 5.2]);
  A(plate, box(3.2, 0.24, 2.4), [0, 3.42, 5.7]);
  A(dark, new THREE.CylinderGeometry(0.07, 0.1, 2.0, 6), [0.9, 4.5, 6.2]);        // 돛대
  A(dark, box(1.5, 0.08, 0.1), [0.9, 5.0, 6.2]);
  for (const x of [-1, 1]) A(blue, box(0.22, 2.3, 2.6), [x * 2.3, 2.3, 7.4], [0.25, 0, -x * 0.3]);   // 꼬리날개
  // 엔진 포드
  const pods = [], nozzles = [];
  for (const x of [-1, 1]) {
    A(plate, box(1.9, 0.5, 2.4), [x * 3.2, 0.2, 5.6]);                            // 지지대
    A(hull, cylZ(1.2, 1.05, 4.8), [x * 4.4, 0.2, 5.4]);
    A(dark, cylZ(1.05, 0.6, 1.0), [x * 4.4, 0.2, 2.5]);                           // 흡입구
    A(blue, cylZ(1.24, 1.24, 0.7), [x * 4.4, 0.2, 4.2]);
    A(dark, cylZ(1.0, 1.28, 0.9, 14, true), [x * 4.4, 0.2, 8.2]);                 // 노즐
    A(x < 0 ? red : green, new THREE.SphereGeometry(0.16, 8, 6), [x * 5.62, 0.2, 4.4]);   // 좌현 빨강 · 우현 초록
    nozzles.push(new THREE.Vector3(x * 4.4, 0.2, 8.5));
  }
  // 아래 부양기
  for (const x of [-1, 1]) for (const z of [-4.2, 3.6]) {
    A(dark, new THREE.CylinderGeometry(0.95, 0.8, 0.6, 12), [x * 1.6, -2.2, z]);
    A(thr, new THREE.CylinderGeometry(0.66, 0.66, 0.06, 12), [x * 1.6, -2.52, z]);
  }
  K.bake(g);
  // 움직이는 부분: 엔진 불빛·불꽃, 섬광등, 레이더
  const glowGeo = new THREE.CircleGeometry(0.96, 14), flames = [];
  for (const n of nozzles) {
    const d = new THREE.Mesh(glowGeo, thr); d.position.set(n.x, n.y, n.z - 0.55); g.add(d); pods.push(d);
    flames.push(flame(g, n.x, n.y, n.z - 0.3, 0.9, 5.2, 0x4ab8ff));
  }
  for (const x of [-0.75, 0.75]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), thr); d.position.set(x, -0.2, 8.12); g.add(d); pods.push(d); }
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lit(0xffffff, 3)); strobe.position.set(0.9, 5.55, 6.2); g.add(strobe);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), red); beacon.position.set(0, -2.05, 0); g.add(beacon);
  const radar = new THREE.Mesh(box(1.5, 0.5, 0.1), plate); radar.position.set(-0.8, 3.9, 5.6); g.add(radar);
  let t = 0;
  g.userData.tick = (dt, speed = 7) => {
    t += dt;
    const k = 0.9 + Math.sin(t * 31) * 0.06 + Math.sin(t * 17) * 0.04, pw = Math.min(1.3, 0.55 + speed * 0.07);
    for (const p of pods) p.scale.setScalar(k);
    for (const f of flames) f.scale.set(k, k, pw * (0.9 + Math.sin(t * 43 + f.position.x) * 0.1));
    strobe.visible = t % 1.4 < 0.09 || (t % 1.4 > 0.22 && t % 1.4 < 0.3);
    beacon.visible = t % 1.4 > 0.7 && t % 1.4 < 0.85;
    radar.rotation.y = t * 1.6;
  };
  g.userData.radius = 7;
  g.userData.nozzles = nozzles;
  // 충돌 상자 [cx, cy, cz, hx, hy, hz]
  g.userData.boxes = [[0, -0.2, -0.4, 2.9, 1.7, 8.8], [0, 2.4, 2.4, 2.1, 1.2, 5.2], [-4.4, 0.2, 5.4, 1.2, 1.2, 3.2], [4.4, 0.2, 5.4, 1.2, 1.2, 3.2]];
  g.userData.dispose = () => g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return g;
}

// 아군 소형정 (길이 약 6.5m): 호위정 · 1인승 관측정. 유리 조종석, 꺾인 날개, 쌍발 엔진
export function makeEscortCraft(color = 0x2f6fb0) {
  const g = new THREE.Group(), K = kit(), A = K.add;
  const hull = gloss(0xdde3ec, 0.4), plate = gloss(0x8d97a8, 0.35), dark = mat(0x1d2129), blue = gloss(color, 0.5), glass = gloss(0x7ec8ff, 0.9);
  const thr = lit(0x58c8ff, 2.6), red = lit(0xff2a2a, 2.2), green = lit(0x2aff6a, 2.0), lamp = lit(0xfff2c0, 1.8);
  A(hull, box(1.5, 1.0, 3.4), [0, 0, 0.3]);
  A(hull, wedge(1.5, 1.0, 2.4, 0.3, 0.4, -0.15), [0, 0, -2.6]);
  A(plate, box(1.1, 0.4, 3.6), [0, -0.6, 0.2]);
  A(glass, wedge(1.1, 0.6, 1.9, 0.6, 0.3, -0.2), [0, 0.72, -0.9]);
  A(blue, box(1.54, 0.2, 3.0), [0, 0.2, 0.5]);
  A(lamp, box(0.36, 0.12, 0.08), [0, -0.2, -3.82]);
  for (const x of [-1, 1]) {
    A(hull, wedge(2.4, 0.14, 1.8, 1, 1), [x * 1.9, -0.1, 0.9], [0, x * 0.3, -x * 0.12]);   // 날개
    A(blue, box(0.16, 0.5, 1.5), [x * 3.05, 0.05, 1.3], [0, x * 0.3, 0]);                  // 날개 끝
    A(plate, cylZ(0.42, 0.36, 2.2, 10), [x * 0.95, 0.05, 1.7]);                            // 엔진
    A(dark, cylZ(0.36, 0.46, 0.4, 10, true), [x * 0.95, 0.05, 2.95]);
    A(thr, new THREE.CircleGeometry(0.34, 10), [x * 0.95, 0.05, 2.9]);
    A(blue, box(0.1, 0.9, 1.0), [x * 0.5, 0.8, 1.9], [0.3, 0, -x * 0.35]);                 // 꼬리날개
    A(x < 0 ? red : green, new THREE.SphereGeometry(0.09, 6, 5), [x * 3.1, 0.32, 1.3]);
  }
  K.bake(g);
  const flames = [flame(g, -0.95, 0.05, 3.0, 0.32, 2.0, 0x4ab8ff), flame(g, 0.95, 0.05, 3.0, 0.32, 2.0, 0x4ab8ff)];
  let t = Math.random() * 10;
  g.userData.tick = (dt, speed = 8) => { t += dt; const k = 0.9 + Math.sin(t * 37) * 0.1; for (const f of flames) f.scale.set(k, k, Math.min(1.3, 0.5 + speed * 0.06) * k); };
  g.userData.radius = 2.6;
  g.userData.dispose = () => g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return g;
}

// 화물 드론: 큰 쿼드콥터가 컨테이너를 매달고 난다 (정비창 폐기물 운반)
export function makeCargoDrone(color = 0xf5a623) {
  const g = new THREE.Group();
  const d = buildDrone({ ...botLook("racer", 1), accentColor: "#ffb02e", ledColor: "#ffd400", propColor: "#e8ecf4" }, 11, { halo: 0xffd400 });
  d.position.y = 1.35; g.add(d);
  const K = kit(), A = K.add, steel = gloss(0x7d8796, 0.4), dark = mat(0x1d2129), paint = gloss(color, 0.3);
  A(paint, box(1.3, 1.1, 2.2), [0, -0.3, 0]);
  for (const z of [-0.8, 0, 0.8]) A(dark, box(1.36, 1.14, 0.1), [0, -0.3, z]);
  A(steel, box(1.5, 0.1, 2.4), [0, 0.3, 0]);
  for (const x of [-0.5, 0.5]) for (const z of [-0.9, 0.9]) A(dark, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), [x, 0.8, z]);
  K.bake(g);
  const tick = d.userData.tick; let t = 0;
  g.userData.tick = (dt) => { t += dt; tick(dt, 0.7, t); };
  g.userData.radius = 2.2;
  g.userData.dispose = () => { if (d.userData.dispose) d.userData.dispose(); g.children.forEach((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); };
  return g;
}
