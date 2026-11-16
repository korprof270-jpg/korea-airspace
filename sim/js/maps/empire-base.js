// 기계제국 수도 바탕: 강철 바닥(용광로 구덩이 포함), 순환 대로·방사 대로·광장 무늬와 붉은 에너지 도관, 에이아의 첨탑(붉은 심장), 외곽 성벽
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, ring, octa, V3, DEG, hash, prism, mat, height,
  BLK, BLK2, IRON, STEEL, GUN, RUST, RED, RED2, DRED, ORG, EMB, HAZ,
  SP, PLAZA, ROAD_R, AVE, PITS, PIT_D, WALL,
} from "./empire-kit.js";

const O8 = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [Math.cos(a), Math.sin(a)]; });

// ── 바닥: 가운데 ±264 m 는 2.5 m 격자(구덩이 경사를 살린다), 바깥은 큰 판 네 장 ──
export function ground(w) {
  const H = 264, N = 212, g = new THREE.PlaneGeometry(H * 2, H * 2, N, N);
  g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, U = g.attributes.uv, col = new Float32Array(P.count * 3), c = new THREE.Color(), hot = new THREE.Color(0xff6a1a);
  const TONES = [0x3a3c42, 0x34363c, 0x403f42, 0x2f3137, 0x3b3a3c];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), y = height(x, z);
    P.setY(i, y);
    U.setXY(i, x / 8, z / 8);
    const r0 = Math.hypot(x, z);
    c.set(TONES[(hash(Math.floor((x + 400) / 24), Math.floor((z + 400) / 24)) * TONES.length) | 0]);
    if (Math.abs(r0 - ROAD_R) < 8 || (Math.abs(x) < AVE && (z > 0 || z < SP[1])) || (Math.abs(z) < AVE && Math.abs(x) > 0)) c.multiplyScalar(0.62);
    if (Math.hypot(x - SP[0], z - SP[1]) < PLAZA) c.set(0x2b2c31);
    if (y < -0.05) { const k = -y / PIT_D; c.set(0x2a1c18).lerp(hot, k * k * 0.85); }
    const k = 1 + (hash(Math.floor(x / 6), Math.floor(z / 6)) - 0.5) * 0.08;
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const ma = w.material("std:panel"), m = new THREE.Mesh(g, ma);
  m.receiveShadow = true; m.frustumCulled = false;
  w.scene.add(m); w.disposables.push(g);
  // 바깥 판
  const F = 1600, cc = new THREE.Color(0x2a2b30);
  for (const [x0, x1, z0, z1] of [[-F, F, -F, -H], [-F, F, H, F], [-F, -H, -H, H], [H, F, -H, H]]) {
    const q = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1); q.rotateX(-Math.PI / 2); q.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const Q = q.attributes.position, qc = new Float32Array(Q.count * 3), QU = q.attributes.uv;
    for (let i = 0; i < Q.count; i++) { qc.set([cc.r, cc.g, cc.b], i * 3); QU.setXY(i, Q.getX(i) / 8, Q.getZ(i) / 8); }
    q.setAttribute("color", new THREE.BufferAttribute(qc, 3));
    const qm = new THREE.Mesh(q, ma); qm.receiveShadow = true; w.scene.add(qm); w.disposables.push(q);
  }
}

// ── 바닥 무늬: 순환 대로·방사 대로 가장자리 붉은 점선, 광장 동심원, 대로 가운데 에너지 도관(흐르는 맥동) ──
export function markings(w, K) {
  const flat = (geo, x, y, z, color, m = "glow") => { geo.rotateX(-Math.PI / 2); w.mesh(geo, M(x, y, z), color, m); };
  // 순환 대로
  for (let i = 0; i < 112; i++) {
    const a = (i / 112) * Math.PI * 2, ry = -a / DEG;
    for (const r of [ROAD_R - 7.4, ROAD_R + 7.4]) w.box(Math.cos(a) * r, 0.03, Math.sin(a) * r, 0.4, 0.05, 3.2, i % 2 ? RED : 0x8a8a90, { mat: i % 2 ? "glow" : "std", col: false, ry, ao: false });
    if (i % 2) w.box(Math.cos(a) * ROAD_R, 0.03, Math.sin(a) * ROAD_R, 0.35, 0.05, 4, HAZ, { col: false, ry, ao: false });
  }
  // 방사 대로: 가장자리 점선
  const arms = [[0, 1, SP[1] - PLAZA + 4, -WALL + 4], [0, 1, 6, WALL - 4], [1, 0, 6, WALL - 4], [1, 0, -6, -WALL + 4]];
  for (const [ax, az, s0, s1] of arms) {
    const dir = Math.sign(s1 - s0);
    for (let s = s0; dir * (s1 - s) > 0; s += dir * 7) {
      if (Math.abs(Math.abs(s) - ROAD_R) < 9) continue;
      for (const side of [-AVE + 0.6, AVE - 0.6]) {
        const x = ax ? s : side, z = ax ? side : s;
        w.box(x, 0.03, z, ax ? 3 : 0.4, 0.05, ax ? 0.4 : 3, (Math.round(s / 7) & 1) ? RED : 0x7a7a80, { mat: (Math.round(s / 7) & 1) ? "glow" : "std", col: false, ao: false });
      }
    }
  }
  // 광장: 동심원 + 방사 홈
  const [px, pz] = SP;
  for (const [r0, r1, c] of [[PLAZA - 4, PLAZA - 3, RED], [44, 45.2, RED], [38, 38.4, DRED]]) flat(new THREE.RingGeometry(r0, r1, 96, 1), px, 0.04, pz, c);
  w.pool(px, 0.05, pz, 70, RED, 0.22);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + Math.PI / 24, ry = -a / DEG + 90;
    w.box(px + Math.cos(a) * 51, 0.04, pz + Math.sin(a) * 51, 0.5, 0.05, 12, i % 3 ? 0x5a5a60 : RED, { mat: i % 3 ? "std" : "glow", col: false, ry, ao: false });
  }
  // 대로 가운데 에너지 도관: 덮개판 + 발광 홈. 맥동이 첨탑에서 바깥으로 흐른다
  const runs = [[[0, SP[1] - 36], [0, -WALL + 6]], [[0, SP[1] + 36], [0, WALL - 6]], [[30, SP[1] + 20], [WALL - 6, 0]], [[-30, SP[1] + 20], [-WALL + 6, 0]]];
  const pulseL = [];
  for (const [a, b] of runs) {
    // 첨탑 → 대로 축으로 꺾이는 짧은 연결
    const pts = Math.abs(b[1]) < 1 ? [a, [a[0] * 1.6, 0], b] : [a, b];
    for (let k = 0; k < pts.length - 1; k++) {
      const p0 = pts[k], p1 = pts[k + 1], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ry = Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]) / DEG;
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
      w.box(mx, 0.02, mz, L, 0.06, 3.4, 0x1a1b20, { col: false, ry, ao: false });
      w.box(mx, 0.04, mz, L, 0.06, 0.7, RED, { mat: "glow", col: false, ry, ao: false });
      pulseL.push([p0, p1, L]);
    }
  }
  // 맥동: 하나의 인스턴스 메시
  const N = pulseL.length * 5, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.5, 0.35) }), N);
  im.frustumCulled = false; w.scene.add(im); w.disposables.push(im.geometry, im.material);
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const total = pulseL.reduce((s, l) => s + l[2], 0);
  w.updaters.push((dt, t) => {
    let i = 0;
    for (let k = 0; k < pulseL.length; k++) {
      const [p0, p1, L] = pulseL[k], ry = Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]);
      e.set(0, ry, 0); q.setFromEuler(e);
      for (let j = 0; j < 5; j++, i++) {
        const u = ((t * 22 / Math.max(L, 40) + j / 5 + k * 0.13) % 1);
        pv.set(p0[0] + (p1[0] - p0[0]) * u, 0.08, p0[1] + (p1[1] - p0[1]) * u);
        tm.compose(pv, q, sv.set(5, 1, 0.95)); im.setMatrixAt(i, tm);
      }
    }
    im.instanceMatrix.needsUpdate = true;
    void total;
  });
}

// ── 에이아의 첨탑: 3단 받침 → 버팀 날개를 두른 팔각 몸체 → 기둥 넷 사이로 트인 심장실(맥박 치는 붉은 심장) → 가늘어지는 상부 첨탑과 바늘 ──
export const HEART_Y = 77, CH_Y0 = 58, CH_Y1 = 96, CH_PIL = 24;
export function spire(w, K) {
  const [x, z] = SP;
  octa(w, x, 0, z, 36, 2.5, IRON, { mat: "std:panel" });
  octa(w, x, 2.4, z, 36.4, 0.5, RED, { mat: "glow", col: false });
  octa(w, x, 2.9, z, 29, 4.6, BLK, { mat: "std:panel" });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; w.box(x + Math.cos(a) * 32.5, 2.9, z + Math.sin(a) * 32.5, 4, 0.3, 1.4, RED, { mat: "glow", col: false, ry: -a / DEG + 90 }); }
  // 몸체 (7.5 → 58 m, 반경 18 → 12.5)
  w.mesh(prism(O8, CH_Y0, 7.5, 12.5, 18), M(x, 0, z), BLK, "std:panel");
  w.col.addCapsule(V3(x, 8, z), V3(x, 22, z), 15.5);
  w.col.addCapsule(V3(x, 22, z), V3(x, 40, z), 13.2);
  w.col.addCapsule(V3(x, 40, z), V3(x, 52, z), 11.2);
  for (const [cx, cz] of O8) beam(w, [x + cx * 18.15, 7.5, z + cz * 18.15], [x + cx * 12.65, CH_Y0, z + cz * 12.65], 0.55, RED, { mat: "glow", col: false });
  for (const y of [18, 30, 42]) { const k = 18 - (y - 7.5) / (CH_Y0 - 7.5) * 5.5; w.mesh(prism(O8, y + 1, y, k + 0.35, k + 0.4), M(x, 0, z), IRON, "paint"); }
  // 버팀 날개 4장 (동서남북): 계단형 + 꼭대기 붉은 선
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), ry = -a / DEG;
    w.box(x + c * 24, 0, z + s * 24, 13, 18, 3.4, BLK2, { mat: "std:panel", ry });
    w.box(x + c * 20, 18, z + s * 20, 6, 22, 3.4, BLK2, { mat: "std:panel", ry });
    w.box(x + c * 18, 40, z + s * 18, 2.5, 12, 3, BLK2, { mat: "std:panel", ry, col: false });
    w.box(x + c * 30.4, 0, z + s * 30.4, 0.3, 17.5, 0.8, RED, { mat: "glow", col: false, ry });
    w.box(x + c * 24, 17.9, z + s * 24, 13.2, 0.5, 3.8, RED, { mat: "glow", col: false, ry });
  }
  // 심장실: 바닥판·천장판, 대각선 기둥 넷
  octa(w, x, CH_Y0 - 2, z, CH_PIL + 2, 2.4, IRON, { mat: "std:panel" });
  octa(w, x, CH_Y1, z, CH_PIL + 2, 3, IRON, { mat: "std:panel" });
  for (const y of [CH_Y0 + 0.45, CH_Y1 - 0.05]) ring(w, x, y, z, CH_PIL - 0.8, 0.3, RED, { pitch: 90, seg: 48, mat: "glow", col: false });
  for (const y of [CH_Y0 + 0.42, CH_Y1 - 0.02]) ring(w, x, y, z, 12, 0.18, DRED, { pitch: 90, seg: 32, mat: "glow", col: false });
  const d = CH_PIL / Math.SQRT2;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const px = x + sx * d, pz = z + sz * d;
    w.box(px, CH_Y0, pz, 3.6, CH_Y1 - CH_Y0, 3.6, BLK, { mat: "std:panel", ry: 45 });
    w.box(px - sx * 1.35, CH_Y0 + 3, pz - sz * 1.35, 0.5, CH_Y1 - CH_Y0 - 6, 0.5, RED, { mat: "glow", col: false, ry: 45 });
    // 심장으로 이어지는 굵은 관: 바닥 쪽으로 비스듬히 (비행 경로를 가리지 않게 안쪽 아래로)
    w.pipe(x + sx * 4.5, HEART_Y - 4, z + sz * 4.5, x + sx * 9, CH_Y0 + 0.4, z + sz * 9, 0.9, GUN, { col: false });
    w.pipe(x + sx * 4.5, HEART_Y - 4, z + sz * 4.5, x + sx * 9, CH_Y0 + 0.4, z + sz * 9, 0.4, RED, { mat: "glow", col: false });
  }
  // 심장 받침과 위에서 내려오는 관
  w.cyl(x, CH_Y0 + 0.4, z, 4.5, 3, GUN, { mat: "metal", rt: 2.6 });
  w.cyl(x, HEART_Y + 5.4, z, 2.2, CH_Y1 - HEART_Y - 5.4, GUN, { mat: "metal", rt: 3.2, col: false });
  w.pool(x, CH_Y0 + 0.5, z, 22, RED, 0.5);
  w.pool(x, CH_Y1 - 0.1, z, 18, RED, 0.25);
  w.col.addSphere(V3(x, HEART_Y, z), 6.2);
  // 고정 고리
  ring(w, x, HEART_Y, z, 8.6, 0.4, GUN, { pitch: 90, seg: 40 });
  ring(w, x, HEART_Y + 0.42, z, 8.6, 0.16, RED, { pitch: 90, seg: 40, mat: "glow", col: false });
  // 상부 첨탑 (99 → 152 m, 반경 12 → 3)
  w.mesh(prism(O8, 152, CH_Y1 + 3, 3, 12), M(x, 0, z), BLK, "std:panel");
  w.col.addCapsule(V3(x, 104, z), V3(x, 112, z), 10.2);
  w.col.addCapsule(V3(x, 112, z), V3(x, 130, z), 7.2);
  w.col.addCapsule(V3(x, 130, z), V3(x, 150, z), 4.2);
  for (const [cx, cz] of O8) beam(w, [x + cx * 12.1, CH_Y1 + 3, z + cz * 12.1], [x + cx * 3.1, 152, z + cz * 3.1], 0.45, RED, { mat: "glow", col: false });
  for (const y of [112, 126, 140]) { const k = 12 - (y - 99) / 53 * 9; w.mesh(prism(O8, y + 1.2, y, k + 0.3, k + 0.4), M(x, 0, z), RED, "glow"); }
  // 왕관 고리와 바늘
  ring(w, x, 132, z, 15, 0.5, GUN, { pitch: 90, seg: 48, col: false });
  ring(w, x, 132.5, z, 15, 0.22, RED, { pitch: 90, seg: 48, mat: "glow", col: false });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; beam(w, [x + Math.cos(a) * 6.6, 131.5, z + Math.sin(a) * 6.6], [x + Math.cos(a) * 14.6, 132, z + Math.sin(a) * 14.6], 0.5, GUN, { col: false }); }
  w.pipe(x, 152, z, x, 190, z, 1.1, GUN);
  w.pipe(x, 160, z, x, 186, z, 0.5, RED, { mat: "glow", col: false });
  K.blink.add(x, 190.6, z, RED, 1.1, 0);

  // ── 움직이는 심장: 이중 박동으로 부풀고 밝아진다. 바깥 빛 껍질, 서로 엇갈려 도는 자이로 고리 둘 ──
  const hm = new THREE.MeshBasicMaterial({ color: 0xff2a30 });
  const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(5.4, 2), hm);
  heart.position.set(x, HEART_Y, z);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(7.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff2a20, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  shell.position.copy(heart.position);
  const glowS = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 12), new THREE.MeshBasicMaterial({ color: 0xff3018, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
  glowS.position.copy(heart.position);
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.35, 0.3) });
  const g1 = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.22, 6, 48), gm), g2 = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.22, 6, 48), gm);
  g1.position.copy(heart.position); g2.position.copy(heart.position);
  // 심장을 비추는 빛기둥(위아래로, 가산)
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, CH_Y1 - CH_Y0, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  bm.position.set(x, (CH_Y0 + CH_Y1) / 2, z);
  for (const m of [heart, shell, glowS, g1, g2, bm]) { m.frustumCulled = false; w.scene.add(m); }
  for (const m of [shell, glowS, bm]) m.renderOrder = 6;
  const base = new THREE.Color(0xff2a30);
  w.updaters.push((dt, t) => {
    const p = t % 1.25, beat = Math.exp(-((p - 0.05) ** 2) * 160) + 0.65 * Math.exp(-((p - 0.32) ** 2) * 160);
    const k = 1.15 + beat * 1.9;
    hm.color.copy(base).multiplyScalar(k);
    heart.scale.setScalar(1 + beat * 0.09);
    shell.scale.setScalar(1 + beat * 0.22); shell.material.opacity = 0.18 + beat * 0.3;
    glowS.material.opacity = 0.05 + beat * 0.09;
    bm.material.opacity = 0.08 + beat * 0.1;
    g1.rotation.set(t * 0.7, t * 0.4, 0); g2.rotation.set(-t * 0.5 + 1.2, 0, t * 0.6);
    heart.rotation.y = t * 0.2;
  });
  w.gap("에이아의 심장실 관통", x, HEART_Y, z - 12, 90, 18, 14, 900);
  w.gap("에이아의 심장실 관통", x, HEART_Y, z + 12, 90, 18, 14, 900);
  w.gap("에이아의 심장실 관통", x - 12, HEART_Y, z, 0, 18, 14, 900);
  w.gap("에이아의 심장실 관통", x + 12, HEART_Y, z, 0, 18, 14, 900);
  w.gap("첨탑 왕관 고리", x, 132, z, 0, 14, 14, 500, 90);
}

// ── 외곽 성벽: 검은 판벽, 위쪽 붉은 띠와 총안, 모서리 탑(탐조등 자리) ──
export const CORNERS = [[-WALL, -WALL], [WALL, -WALL], [-WALL, WALL], [WALL, WALL]];
export function walls(w, K) {
  const Hh = 34, T = 6;
  for (const [x, z, sx, sz] of [[0, -WALL, WALL * 2, T], [0, WALL, WALL * 2, T], [-WALL, 0, T, WALL * 2], [WALL, 0, T, WALL * 2]]) {
    w.box(x, 0, z, sx, Hh, sz, BLK, { mat: "std:panel", tile: 8 });
    w.box(x, Hh, z, sx + 1, 1.4, sz + 1, IRON, { mat: "paint", col: false });
    w.box(x, Hh - 6, z, sx + 0.3, 1.1, sz + 0.3, RED, { mat: "glow", col: false });
    w.box(x, 0, z, sx + 2, 4, sz + 2, IRON, { mat: "paint", col: false });
    // 버팀 기둥
    const L = Math.max(sx, sz), along = sx > sz;
    for (let s = -L / 2 + 20; s < L / 2 - 10; s += 28) {
      const bx2 = along ? s : x - Math.sign(x) * 4, bz2 = along ? z - Math.sign(z) * 4 : s;
      w.box(bx2, 0, bz2, along ? 4 : 3, Hh + 4, along ? 3 : 4, BLK2, { mat: "std:panel" });
      w.box(bx2 - (along ? 0 : Math.sign(x) * 1.6), 6, bz2 - (along ? Math.sign(z) * 1.6 : 0), along ? 0.5 : 0.12, Hh - 8, along ? 0.12 : 0.5, RED, { mat: "glow", col: false });
      K.blink.add(bx2, Hh + 4.8, bz2, RED, 0.45, (s / 28) & 1);
    }
  }
  for (const [x, z] of CORNERS) {
    octa(w, x, 0, z, 13, 64, BLK2, { mat: "std:panel" });
    octa(w, x, 64, z, 15, 3, IRON, { mat: "paint" });
    octa(w, x, 50, z, 13.3, 1.4, RED, { mat: "glow", col: false });
    w.pipe(x, 67, z, x, 84, z, 0.6, GUN, { col: false });
    K.blink.add(x, 84.6, z, RED, 0.8, 1);
  }
}
