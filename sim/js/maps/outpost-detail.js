// 붉은 협곡 전초기지 세부·움직임: 요새 지붕의 회전 레이더, 첨탑을 도는 호위 드론 편대, 협곡 벽의 제국 표식과 절벽 포좌,
// 메사 가장자리의 감시 초소, 송전 철탑 줄, 끊어진 옛 인류 다리, 요새 발치의 야적장, 버려진 보급 차량, 벼랑 끝 경계등, 잔돌과 덤불
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, merged, mat, octa, V3, local, turret, mast, post, hedgehog, rockArch, DEG, BOXG, CYLG, BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ, WH2, NAVY, OLIVE } from "./outpost-kit.js";
import { height, canyonPoint, canyonYaw, canyonHW, canyonZ, SPIRE, FORT, BRIDGES, N_TOP, sideSX, sideNX } from "./outpost-terrain.js";

const NC = { col: false }, GL = { mat: "glow", col: false };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

// 요새 지휘동 지붕의 회전 레이더와 윗갑판의 작은 회전 탐지기 둘
function radars(w, K) {
  const list = [[...K.radar, 1, 0.9], [-36, N_TOP + 9, FORT.back + 9, 0.5, -1.4], [36, N_TOP + 9, FORT.back + 9, 0.5, 1.2]];
  const g = merged([[BOXG, M(0, 2.2, 0, 13, 4, 0.5), STEEL], [BOXG, M(0, 2.2, 0.4, 12.4, 3.4, 0.2), DRED], [BOXG, M(0, 0.3, 0, 1.2, 0.8, 1.2), GUN], [BOXG, M(0, 2.2, -1.4, 0.4, 0.4, 2.6), GUN], [BOXG, M(-6.6, 2.2, 0, 0.3, 4.6, 0.7), BLK2], [BOXG, M(6.6, 2.2, 0, 0.3, 4.6, 0.7), BLK2]]);
  w.disposables.push(g);
  const ms = list.map(([x, y, z, s]) => { const me = new THREE.Mesh(g, mat(w, "paint")); me.position.set(x, y, z); me.scale.setScalar(s); me.castShadow = true; w.scene.add(me); if (s < 1) w.cyl(x, y - 2.5, z, 0.7, 2.5, IRON, NC); return me; });
  w.updaters.push((dt, t) => ms.forEach((me, i) => { me.rotation.y = t * list[i][4]; }));
}

// 첨탑 둘레를 도는 호위 드론 편대(충돌 없음, 인스턴스 메시 하나) + 꼬리등
function escorts(w) {
  const N = 9, [sx, sz] = SPIRE;
  const g = merged([[BOXG, M(0, 0, 0, 2.6, 0.5, 1.2), BLK2], [BOXG, M(0, 0, 0, 0.8, 0.3, 3.6, 0, 0, 0), IRON], [BOXG, M(1.5, 0.1, 0, 0.5, 0.3, 0.5), GUN]]);
  const im = new THREE.InstancedMesh(g, mat(w, "paint"), N); im.frustumCulled = false;
  const g2 = new THREE.BoxGeometry(0.5, 0.3, 0.9), m2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.4, 0.3) }), im2 = new THREE.InstancedMesh(g2, m2, N); im2.frustumCulled = false;
  w.scene.add(im, im2); w.disposables.push(g, g2, m2);
  w.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const grp = i % 3, k = (i / 3) | 0, R = 46 + grp * 16, sp = (grp % 2 ? -1 : 1) * (0.2 - grp * 0.04), a = t * sp + k * 2.094 + grp, y = 118 + grp * 13 + Math.sin(t * 0.5 + i) * 3;
      _e.set(0, -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2), 0); _q.setFromEuler(_e);
      _m.compose(_p.set(sx + Math.cos(a) * R, y, sz + Math.sin(a) * R), _q, _s); im.setMatrixAt(i, _m);
      const b = a - Math.sign(sp) * (1.6 / R); _m.compose(_p.set(sx + Math.cos(b) * R, y, sz + Math.sin(b) * R), _q, _s); im2.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true; im2.instanceMatrix.needsUpdate = true;
  });
}

// 협곡 벽의 절벽 포좌와 제국 표식(붉게 빛나는 세로 홈), 벽을 타는 배관
function cliffWorks(w, K, ctx) {
  // 북벽 턱의 포좌: 벽에서 내민 강철 선반 위의 포탑(협곡 바닥을 겨눈다)
  for (const x of [-196, -120, 108, 150, 184]) {
    const yaw = canyonYaw(x), hw = canyonHW(x), p = canyonPoint(x, -(hw + 5.5)), q = canyonPoint(x, -(hw + 13)), y = 19 + ((x * 7) & 3);
    if (!ctx.free(p[0], p[1], 5, y + 8)) continue;
    w.box(p[0], y - 1.2, p[1], 9, 1.2, 9, IRON, { mat: "std:panel", tile: 4, ry: yaw });
    w.box(p[0], y - 1.5, p[1], 9.2, 0.3, 9.2, RED, { ...GL, ry: yaw });
    beam(w, [p[0], y - 1.2, p[1]], [q[0], y - 10, q[1]], 0.8, BLK2, NC);
    w.box(q[0], y - 12, q[1], 7, 22, 7, BLK2, { mat: "std:panel", tile: 5, ry: yaw, col: false });
    turret(w, K, p[0], y, p[1], yaw - 90 + (x < 0 ? 25 : -25), 0.8, { elev: -0.12 });
    ctx.taken.push([p[0], p[1], 7]);
  }
  // 벽면 표식: 붉은 세로 홈 줄(절벽 요새 양옆과 다리 관문 옆)
  for (const [x, n] of [[-104, 3], [96, 3], [-176, 2], [148, 2]]) for (let k = 0; k < n; k++) {
    const xx = x + k * 5, hw = canyonHW(xx), p = canyonPoint(xx, -(hw + 9.5)), y = height(p[0], p[1]);
    w.box(p[0], y - 6, p[1], 1.6, 16, 3, BLK, { ry: canyonYaw(xx), col: false }); w.box(p[0], y - 4, p[1] + 1.56, 0.5, 12, 0.1, RED, { ...GL, ry: canyonYaw(xx) });
  }
  // 요새에서 양옆 다리 관문으로 벽을 타고 가는 굵은 배관
  for (const [xa, xb] of [[-158, -84], [84, 126]]) {
    let prev = null;
    for (let x = xa; x <= xb; x += 6) {
      const p = canyonPoint(x, -(canyonHW(x) + 6.5)), q = [p[0], 31 + Math.sin(x * 0.2) * 0.6, p[1]];
      if (prev) w.pipe(prev[0], prev[1], prev[2], q[0], q[1], q[2], 0.7, 0x4a2c24, NC);
      if (((x - xa) / 6) % 3 === 0) { const b = canyonPoint(x, -(canyonHW(x) + 11)); beam(w, q, [b[0], q[1] - 2, b[1]], 0.4, STEEL, NC); }
      prev = q;
    }
  }
}

// 고원·메사 가장자리의 제국 감시 초소(작은 탑 + 등)와 다리 남쪽 끝의 관문 초소
function outposts(w, K, ctx) {
  const spots = [[16, 104], [118, 58], [200, 40], [-128, -112], [-84, -150], [84, -150], [60, -212], [140, -92], [214, -96], [-212, -96], [-146, -224], [214, 150], [150, 214], [96, 212]];
  for (const [x, z] of spots) {
    const y = height(x, z), h = 9 + ((x * 3 + z) & 7);
    if (!ctx.free(x, z, 4, y + h + 5) || Math.abs(height(x + 5, z) - y) + Math.abs(height(x, z + 5) - y) + Math.abs(height(x - 5, z) - y) > 1.5) continue;
    w.box(x, y - 0.5, z, 3.6, h + 0.5, 3.6, BLK, { mat: "std:panel", tile: 4 });
    w.box(x, y + h - 2.6, z, 3.8, 0.9, 3.8, RED, GL);
    w.box(x, y + h, z, 5, 0.5, 5, IRON, NC); w.box(x, y + h + 0.5, z, 2, 1.4, 2, BLK2, NC);
    w.pipe(x, y + h + 1.9, z, x, y + h + 5.5, z, 0.14, GUN, NC);
    K.blink.add(x, y + h + 5.8, z, RED, 0.38, (x + z) & 1);
    w.pool(x, y + 0.05, z, 9, RED, 0.3);
    ctx.taken.push([x, z, 5]);
  }
  // 다리 남쪽 끝: 차단 블록과 고슴도치(가운데 길은 비운다)
  for (const [bx, zs] of BRIDGES) for (const sx of [-1, 1]) {
    const x = bx + sx * 11, z = zs + 9;
    if (ctx.free(x, z, 2, height(x, z) + 3)) { w.box(x, height(x, z) - 0.2, z, 6, 1.5, 1.2, 0x5a5350, { mat: "std:concrete" }); hedgehog(w, x + sx * 6, height(x + sx * 6, z + 3), z + 3, 1, sx * 30); }
  }
}

// 협곡 바닥·곁협곡의 버려진 인류 보급 차량(봉쇄 이전의 흔적)과 상자
function wrecks(w, K, ctx) {
  const list = [[-176, 13, 20], [-74, -14, -30], [84, 15, 60], [162, -15, 10], [sideSX(70) + 5, 0, 80, 70], [sideSX(130) - 4, 0, 100, 130], [sideNX(-130) + 3, 0, 75, -130]];
  for (const [x, off, ry, zz] of list) {
    const p = zz === undefined ? canyonPoint(x, off) : [x, zz], y = height(p[0], p[1]);
    if (!ctx.free(p[0], p[1], 5, y + 4)) continue;
    const P = local(p[0], p[1], ry);
    w.box(p[0], y + 0.5, p[1], 7, 2.2, 2.7, OLIVE, { mat: "std:corrug", tile: 3, ry, rz: 4 });
    const [cx, cz] = P(4.6, 0); w.box(cx, y + 0.4, cz, 2.2, 2, 2.5, 0x4a4e40, { ry, rz: -5, col: false });
    for (const [u, v] of [[-2.4, 1.5], [-2.4, -1.5], [3.6, 1.5]]) { const [tx, tz] = P(u, v); w.cyl(tx, y, tz, 0.7, 0.5, 0x1c1c1e, NC); }
    const [bx, bz] = P(-6, 2.2); w.box(bx, y, bz, 1.5, 1.2, 1.5, NAVY, { mat: "std:corrug", tile: 2, ry: ry + 25, col: false });
    const [dx, dz] = P(-5, -2.6); w.box(dx, y, dz, 1.2, 0.9, 1.8, WH2, { ry: ry - 40, col: false });
    ctx.taken.push([p[0], p[1], 6]);
  }
}

// 송전 철탑 줄: 격자 철탑과 처진 전선 세 가닥. pts: [x, z][] — 놓을 수 없는 자리는 건너뛰고 전선은 이어진다
function powerLine(w, K, ctx, pts, H = 22) {
  let prev = null;
  pts.forEach(([x, z], i) => {
    const y = height(x, z), h = Math.min(H, ctx.cap(x, z, 6) - y);
    if (h < 10 || !ctx.free(x, z, 3, y + h + 2)) return;
    const ry = i < pts.length - 1 ? Math.atan2(pts[i + 1][0] - x, pts[i + 1][1] - z) / DEG : prev ? prev[4] : 0, P = local(x, z, ry);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) { const [ax, az] = P(su * 2.4, sv * 2.4), [bx, bz] = P(su * 0.6, sv * 0.6); beam(w, [ax, y - 0.3, az], [bx, y + h, bz], 0.32, STEEL, NC); }
    for (let k = 1; k <= 3; k++) { const yy = y + (h * k) / 4, e = 2.4 - (1.8 * k) / 4; for (const s of [-1, 1]) { const [ax, az] = P(-e, s * e), [bx, bz] = P(e, s * e), [cx, cz] = P(s * e, -e), [dx, dz] = P(s * e, e); beam(w, [ax, yy, az], [bx, yy, bz], 0.18, GUN, NC); beam(w, [cx, yy, cz], [dx, yy, dz], 0.18, GUN, NC); } }
    const [lx, lz] = P(-5.4, 0), [rx, rz] = P(5.4, 0);
    beam(w, [lx, y + h - 1, lz], [rx, y + h - 1, rz], 0.36, STEEL, NC);
    w.col.addCapsule(V3(x, y, z), V3(x, y + h, z), 1.6);
    K.blink.add(x, y + h + 0.8, z, RED, 0.36, i);
    const tops = [[lx, y + h - 1.5, lz], [x, y + h + 0.2, z], [rx, y + h - 1.5, rz]];
    if (prev) for (let c = 0; c < 3; c++) { const a = prev[c], b = tops[c]; let q = a; for (let k = 1; k <= 6; k++) { const u = k / 6, pnt = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - 4.5 * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]; w.pipe(q[0], q[1], q[2], pnt[0], pnt[1], pnt[2], 0.07, 0x15171b, NC); q = pnt; } }
    prev = [...tops, 0, ry];
    ctx.taken.push([x, z, 4]);
  });
}

// 요새 발치의 야적장(협곡 바닥 북쪽 가장자리)과 다리 밑 신호등 줄
function yards(w, K, ctx) {
  const r = w.rand;
  for (let x = -66; x <= 66; x += 7) {
    const z = FORT.front[0] + 8.5 + (r() - 0.5) * 2;
    if (Math.abs(Math.abs(x) - 38) < 15 || !ctx.free(x, z, 3.5, 7)) continue;
    const k = (r() * 3) | 0, ry = (r() - 0.5) * 16;
    w.container(x, 0, z, ry, [DRED, 0x30333a, 0x4a2c24][k], 6.2);
    if (r() < 0.55) w.container(x + 0.3, 2.6, z, ry + 4, [0x30333a, DRED, 0x30333a][k], 6.2);
    if (r() < 0.4) w.cyl(x + 2, 0, z + 3.4, 0.8, 1.6, HAZ, { mat: "paint", col: false });
    ctx.taken.push([x, z, 4]);
  }
  // 다리 상판 밑에 매단 신호등(붉은 등 줄)
  for (const [bx, zs, zn, y] of BRIDGES) for (let k = 1; k < 6; k++) { const z = zs + ((zn - zs) * k) / 6; w.box(bx, y - 3.4, z, 0.2, 2.2, 0.2, GUN, NC); w.box(bx, y - 4, z, 0.7, 0.6, 0.7, k % 2 ? RED : ORG, GL); }
}

// 메사 위의 잔돌과 마른 덤불(충돌 없음): 밋밋한 바닥에 결을 준다
function scatter(w, ctx) {
  const r = w.rand, COL = [0xb86a44, 0xa85a38, 0xc88860, 0x96503a];
  for (let i = 0; i < 520; i++) {
    const x = (r() * 2 - 1) * 228, z = (r() * 2 - 1) * 228, y = height(x, z), sl = Math.abs(height(x + 3, z) - y) + Math.abs(height(x, z + 3) - y);
    if (sl > 1.2 || !ctx.free(x, z, 1, y + 2)) continue;
    if (i % 3 === 0 && y > 20) { const s = 0.5 + r() * 0.7; w.blob(x, y + s * 0.5, z, s * 1.2, s * 0.8, s * 1.1, r() < 0.5 ? 0x8a7040 : 0x7a5c3a, { col: false, grad: [0.6, 1.1] }); }
    else { const s = 0.35 + r() * r() * 1.5; w.blob(x, y + s * 0.2, z, s * (1 + r() * 0.6), s * 0.6, s, COL[i % 4], { mat: "std:rock", col: false, grad: [0.6, 1.1] }); }
  }
}

// 끊어진 옛 인류 보급 다리: 봉쇄 때 폭파된 콘크리트 다리 — 양쪽 교각과 부러진 상판만 남았다(가운데 18 m 는 뚫려 있다)
function brokenBridge(w, ctx, x) {
  const ry = canyonYaw(x), c = canyonPoint(x, 0), P = local(c[0], c[1], ry), hw = canyonHW(x), CON = 0x8a7c70, CON2 = 0x6e625a;
  for (const sv of [-1, 1]) {
    const [px, pz] = P(0, sv * 15), top = sv > 0 ? 22 : 24;
    w.box(px, -1, pz, 4, top + 1, 5, CON, { mat: "std:concrete", tile: 5, ry });
    w.box(px, top, pz, 5.4, 1.2, 6.4, CON2, { mat: "std:concrete", ry, col: false });
    // 벽 쪽 상판(남은 부분)과 가운데로 꺾여 처진 토막
    const L = hw + 12 - 15, [dx, dz] = P(0, sv * (15 + L / 2));
    w.box(dx, top + 1.2, dz, 7, 1.3, L + 3, CON, { mat: "std:concrete", tile: 5, ry });
    const [bx, bz] = P(0, sv * 11.2);
    w.box(bx, top - 0.6, bz, 6.6, 1.2, 6.4, CON2, { mat: "std:concrete", tile: 5, ry, rx: sv * 22 });
    for (const su of [-2.6, 2.6]) { const [ax, az] = P(su, sv * 9), [ex, ez] = P(su * 0.8, sv * 6.4); beam(w, [ax, top - 1, az], [ex, top - 4.5, ez], 0.16, RUST, NC); }
    for (const su of [-3.3, 3.3]) { const [rx, rz] = P(su, sv * (15 + L / 2)); w.box(rx, top + 2.5, rz, 0.25, 0.9, L + 2, 0x9a8c80, { ry, col: false }); }
    // 바닥에 떨어진 잔해
    for (let k = 0; k < 3; k++) { const [qx, qz] = P((k - 1) * 4.5 + sv, sv * (7.5 + k * 1.3)); if (ctx.free(qx, qz, 2, 3)) w.box(qx, -0.3, qz, 3.4 - k * 0.6, 1.3, 2.2, k % 2 ? CON : CON2, { mat: "std:concrete", ry: ry + k * 40 + sv * 15, rz: 10 * sv, col: false }); }
    ctx.taken.push([px, pz, 5]);
  }
  w.gap("끊어진 다리 사이", c[0], 22, c[1], ry + 90, 16, 16, 400);
}

// 협곡 벼랑 끝의 경계등: 북쪽 벼랑(제국)은 붉게, 남동 벼랑은 주황으로 협곡의 윤곽을 그린다
function rimLights(w, ctx) {
  for (let x = -220; x <= 220; x += 20) for (const sd of [-1, 1]) {
    if (sd > 0 && x < 84) continue;
    const p = canyonPoint(x, sd * (canyonHW(x) + 17)), y = height(p[0], p[1]);
    if (y < 28 || Math.abs(height(p[0], p[1] + sd * 4) - y) > 2 || !ctx.free(p[0], p[1], 1.5, y + 3)) continue;
    post(w, p[0], y, p[1], 2.4, sd < 0 ? RED : ORG, 6);
  }
}

export function details(w, K, ctx) {
  powerLine(w, K, ctx, [[-72, -160], [-90, -136], [-132, -138], [-150, -170]]);
  powerLine(w, K, ctx, [[70, -160], [104, -166], [128, -128], [140, -100], [176, -78], [204, -66]]);
  powerLine(w, K, ctx, [[204, 74], [196, 96], [178, 104], [140, 100]], 18);
  brokenBridge(w, ctx, -128); rimLights(w, ctx);
  yards(w, K, ctx); scatter(w, ctx);
  // 곁협곡의 암석 아치 둘(남쪽 곁협곡 · 북서 바늘 협곡)
  for (const [x, z, half] of [[sideSX(170), 170, 21], [sideNX(-176), -176, 19]]) { rockArch(w, x - half, z, x + half, z + 3, height(x, z) + 6, 27, 4.6, 0xb8623c); w.gap("곁협곡 암석 아치 밑", x, height(x, z) + 14, z, 0, 26, 20, 300); }

  radars(w, K); escorts(w); cliffWorks(w, K, ctx); outposts(w, K, ctx); wrecks(w, K, ctx);
}
