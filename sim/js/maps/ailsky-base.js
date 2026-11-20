// 폭풍 무덤의 주인공: 추락한 여제의 기함 '별삼킴'
//  · 꼬리: 서쪽 고원 위에 길게 누운 꼬리뼈 사슬과 찢긴 꼬리 지느러미
//  · 등뼈: 골반에서 치솟아 협곡 위 90 m 높이에 걸린 척추. 마디마다 신경 고리(척수관)가 서 있어 한 줄의 비행 터널이 된다
//  · 갈비뼈 열두 쌍: 북쪽은 검보라 선체 껍질이 남아 있고, 남쪽은 찢겨 열려 있다. 협곡 쪽 갈비는 구름 바다로 늘어진다
//  · 심장방: 등뼈에 힘줄로 매달린 뼈 등롱 속에서 금빛 심장이 아직도 맥박 친다
//  · 머리뼈: 동쪽 고원에 처박힌 갑각 머리, 벌어진 턱과 꺼져 가는 눈
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, tube, bead, lump, V3, DEG, lumpG, ring, Surf, frame3, hoop, chain, vertebra, hulk, stump, rock, spikeG,
  FS, FS_U, FS_YAW, FS_Y0, spineY, RIBS, CAGE,
  BONE, BONE2, BONE3, BONE4, HULL, HULL2, HULL3, FLESH, FLESH2, GOLD, GOLD2, AMBER, VIO, VIO2, PINK, DIMV, DIMP, SLATE,
} from "./ailsky-kit.js";
import { height } from "./ailsky-terrain.js";

// 축 위 한 점 [x, y, z] (s: 꼬리에서 잰 길이, v: 옆(+남), y: 높이)
export const SP = (s, v = 0, y = 0) => { const p = FS(s, v); return [p[0], y, p[1]]; };
export const SY = (s) => FS_Y0 + spineY(s);           // 척추 몸통 높이
export const CANAL_UP = 7, CANAL_R = 7;               // 척수관 고리: 몸통 위 7 m 가 중심, 반경 7 m
export const CANAL = [150, 288];                      // 척수관이 열려 있는 구간
export const CY = (s) => SY(s) + CANAL_UP;            // 척수관 중심 높이
export const HEART_S = 232;
export const HEART = (() => { const p = SP(HEART_S); return [p[0], SY(HEART_S) - 25, p[2]]; })();
export const HEART_R = 13;
export const SKULL_S = 346;

// 축 방향 3D 접선(척추의 기울기 포함)
function tang(s) { const d = (SY(s + 1.5) - SY(s - 1.5)) / 3, l = Math.hypot(1, d); return [FS_U[0] / l, d / l, FS_U[1] / l]; }
const pitchAt = (s) => Math.atan((SY(s + 1.5) - SY(s - 1.5)) / 3) / DEG;

// 기함 근처인가(구역 배치에서 비켜 갈 때): 축 투영 s, 옆 거리 v
export function shipZone(x, z, m = 0) {
  const dx = x - FS(0)[0], dz = z - FS(0)[1], s = dx * FS_U[0] + dz * FS_U[1], v = -dx * FS_U[1] + dz * FS_U[0];
  if (s < -12 - m || s > 378 + m) return false;
  const half = s < CAGE[0] - 10 ? 14 : s < CAGE[1] + 10 ? 48 : 26;
  return Math.abs(v) < half + m;
}

// ── 척추: 꼬리 사슬 + 척수관 고리 + 가시돌기 + 등 지느러미 ──
function spine(w, K) {
  const r = w.rand, pts = [];
  const fin = new Surf(), fin2 = new Surf();
  for (let s = 2; s <= 336; s += s < 118 ? 6 : 7.4) {
    const p = SP(s), y = SY(s), ax = tang(s), R = s < 118 ? 1.6 + 2.6 * (s / 118) : s > 312 ? 4.2 - (s - 312) * 0.04 : 4.4;
    const c = [p[0], y - (s >= CANAL[0] && s <= CANAL[1] ? 2.4 : 0), p[2]];
    pts.push(c);
    vertebra(w, c, ax, R, { wing: R * (s < 118 ? 1.6 : 2.1), crack: (s | 0) % 3 === 0, color: s % 2 < 1 ? BONE : BONE2 });
    w.col.addSphere(V3(...c), R * 0.95);
    if (s >= CANAL[0] && s <= CANAL[1]) {
      // 신경 고리: 축에 수직으로 선 타원 고리, 꼭대기엔 비스듬한 가시돌기
      const F = frame3(p[0], CY(s), p[2], FS_YAW, pitchAt(s));
      hoop(w, F, 0, CANAL_R, CANAL_R * 1.02, 1.05, (s | 0) % 2 ? BONE2 : BONE, { n: 14, col: true, mat: "flat" });
      const top = F.P(0, 0, CANAL_R + 0.6), H = 7 + 6 * Math.sin(Math.PI * (s - CANAL[0]) / (CANAL[1] - CANAL[0])) + r() * 3;
      w.mesh(spikeG(), M(top[0], top[1] - 0.6, top[2], 1.3, H, 2.2, 0, FS_YAW, 18), BONE2, "flat");
      w.col.addCapsule(V3(...top), V3(top[0] - FS_U[0] * H * 0.3, top[1] + H * 0.85, top[2] - FS_U[1] * H * 0.3), 0.9);
      // 고리 안쪽 바닥의 꺼져 가는 빛 줄(척수의 흔적) — 터널의 길잡이
      const b0 = F.P(0, 0, -CANAL_R + 1.4);
      bead(w, b0[0], b0[1], b0[2], 0.45, (s | 0) % 3 ? DIMV : GOLD);
      // 등 지느러미 막: 가시돌기 사이에 찢긴 막
      if (r() < 0.55 && s < CANAL[1] - 8) {
        const s2 = s + 7.4, p2 = SP(s2), t2 = [p2[0], CY(s2) + CANAL_R + 0.6, p2[2]], h1 = H * 0.8;
        const a = top, b = t2, c2 = [b[0] - FS_U[0] * h1 * 0.3, b[1] + h1 * 0.7, b[2] - FS_U[1] * h1 * 0.3], d = [a[0] - FS_U[0] * H * 0.3, a[1] + H * 0.8, a[2] - FS_U[1] * H * 0.3];
        (r() < 0.5 ? fin : fin2).quad(a, b, c2, d);
      }
      if (K && (s | 0) % 4 === 0) K.blink.add(top[0], top[1] + H + 0.6, top[2], GOLD, 0.45, (s | 0) & 1);
    } else if (s < 118) {
      // 꼬리 가시: 땅에 누운 꼬리 위로 비스듬한 가시
      w.mesh(spikeG(), M(c[0], c[1] + R * 0.5, c[2], R * 0.38, R * (1.8 + r()), R * 0.7, 0, FS_YAW, -30), BONE2, "flat");
    } else {
      // 목 마디: 가시만
      w.mesh(spikeG(), M(c[0], c[1] + R * 0.6, c[2], R * 0.4, R * 2.4, R * 0.8, 0, FS_YAW, -24), BONE2, "flat");
    }
  }
  // 마디 사이 연골(굵은 관)과 아래쪽 금빛 혈관
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], rr = i < 19 ? 1.2 + i * 0.1 : 2.8;
    tube(w, ...a, ...b, rr, i % 2 ? BONE3 : BONE4, { seg: 7 });
    tube(w, a[0], a[1] - rr * 0.9, a[2], b[0], b[1] - rr * 0.9, b[2], 0.32, i % 3 ? AMBER : GOLD, { mat: "glow", seg: 3 });
  }
  fin.flush(w, HULL3, "paint"); fin2.flush(w, FLESH2, "paint");
  // 척수관 통과 보너스(입구·심장 위·출구)
  for (const [nm, s] of [["척수관 입구", CANAL[0] + 4], ["별삼킴의 등뼈", HEART_S], ["척수관 출구", CANAL[1] - 4]]) {
    const p = SP(s);
    w.gap(nm, p[0], CY(s), p[2], FS_YAW - 90, CANAL_R * 1.5, CANAL_R * 1.5, 420, 0);
  }
}

// ── 꼬리 지느러미: 꼬리 끝에서 부채처럼 펼쳐진 찢긴 막 (땅에 끌린다) ──
function tailFluke(w) {
  const r = w.rand, S = new Surf(), S2 = new Surf(), base = SP(4, 0, SY(4) + 0.6);
  for (const sd of [-1, 1]) {
    let prev = null;
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * 1.1 + 0.2, L = 34 - k * 2.2, s = -Math.cos(a) * L * 0.55 + 4, v = sd * Math.sin(a) * L;
      const tip = SP(s, v), ty = Math.max(height(tip[0], tip[2]) + 0.4, FS_Y0 + 2 + k * 0.6);
      const p = [tip[0], ty, tip[2]];
      tube(w, ...base, ...p, 0.7 - k * 0.05, BONE2, { seg: 5, col: k % 2 === 0 });
      if (prev && r() < 0.82) (k % 2 ? S : S2).tri(base, prev, p);
      prev = p;
    }
  }
  S.flush(w, HULL2, "paint"); S2.flush(w, FLESH, "paint");
}

// ── 갈비뼈: 축 양옆으로 휘어 내려온다. 북쪽엔 선체 껍질, 일부는 부러졌다 ──
function ribs(w, K) {
  const r = w.rand, NPH = 9, rows = { "-1": [], "1": [] };
  for (const [i, R] of RIBS.entries()) {
    const yS = SY(R.s);
    for (const sd of [-1, 1]) {
      const tipXZ = SP(R.s, sd * R.w), g = height(tipXZ[0], tipXZ[2]), yc = Math.max(g, -24) + 10, H = yS - yc;
      const broken = (i * 7 + (sd > 0 ? 3 : 0)) % 5 === 1, phEnd = broken ? 0.28 + r() * 0.12 : 0.6;
      const pts = [];
      for (let k = 0; k <= NPH; k++) {
        const ph = (0.08 + (phEnd - 0.08) * (k / NPH)) * Math.PI, v = sd * (4 + (R.w - 4) * Math.sin(ph)), y = yc + H * Math.cos(ph);
        const q = SP(R.s + Math.sin(ph) * 6, v, y), gy = height(q[0], q[2]);
        if (y < gy + 0.4) { q[1] = gy + 0.4; pts.push(q); break; }
        pts.push(q);
      }
      rows[sd].push(pts);
      for (let k = 0; k < pts.length - 1; k++) {
        const t = 2.5 - 1.3 * (k / NPH);
        tube(w, ...pts[k], ...pts[k + 1], t, k % 2 ? BONE2 : BONE, { col: true, seg: 7 });
        if (k % 3 === 1) w.mesh(lumpG(), M(...pts[k], t * 1.4, t * 1.3, t * 1.4, k * 31, i * 47, 0), BONE3, "flat");
        // 갈비 안쪽 금빛 결
        if (k % 2 === 0) tube(w, pts[k][0], pts[k][1] - t * 0.8, pts[k][2], pts[k + 1][0], pts[k + 1][1] - t * 0.8, pts[k + 1][2], 0.28, GOLD, { mat: "glow", seg: 3 });
      }
      const e = pts[pts.length - 1];
      if (broken) {
        w.mesh(spikeG(), M(e[0], e[1], e[2], 1.6, 4.5, 1.6, sd * 60, FS_YAW, 0), BONE3, "flat");
        // 부러진 아랫도막: 땅이나 협곡 벽에 박혀 있다
        const lo = SP(R.s + 6, sd * R.w * 0.92), gy = height(lo[0], lo[2]);
        if (gy > -20) stump(w, lo[0], gy, lo[2], 1.9, 12 + r() * 8, 24 + r() * 16, FS_YAW + (sd > 0 ? -90 : 90));
      } else if (e[1] > height(e[0], e[2]) + 3) {
        // 협곡으로 늘어진 갈비: 끝에 찢긴 살막과 매달린 촉수
        tube(w, ...e, e[0], e[1] - 9, e[2], 0.5, FLESH2, { seg: 5 });
        bead(w, e[0], e[1] - 9.6, e[2], 0.8, (i & 1) ? DIMP : DIMV);
      } else {
        lump(w, e[0], e[1] + 0.3, e[2], 3.4, 1.4, 3.4, BONE3, { mat: "flat" });
      }
      if (K && (i & 1)) K.blink.add(pts[2][0], pts[2][1] + 3, pts[2][2], GOLD, 0.4, i & 1);
    }
  }
  // 북쪽 선체 껍질: 이웃한 갈비 사이를 덮는다(군데군데 찢긴 구멍)
  const S = [new Surf(), new Surf(), new Surf()], rowN = rows["-1"], rowS = rows["1"];
  const skin = (row, keep, phMax) => {
    for (let i = 0; i < row.length - 1; i++) {
      if (i === 6) continue;   // 심장방 옆의 찢긴 구멍(폭풍 코스가 지난다)
      const A = row[i], B = row[i + 1], n = Math.min(A.length, B.length, phMax);
      for (let k = 1; k < n - 1; k++) {
        if (r() > keep) continue;
        const a = A[k], b = B[k], c = B[k + 1], d = A[k + 1];
        S[(i + k) % 3].quad(a, b, c, d);
        const m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], m2 = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2, (c[2] + d[2]) / 2];
        w.col.addCapsule(V3(...m1), V3(...m2), 2.2);
        if (r() < 0.22) tube(w, ...a, ...b, 0.22, r() < 0.5 ? DIMV : AMBER, { mat: "glow", seg: 3 });
      }
    }
  };
  skin(rowN, 0.78, 8); skin(rowS, 0.22, 4);
  S[0].flush(w, HULL, "paint"); S[1].flush(w, HULL2, "paint"); S[2].flush(w, HULL3, "paint");
}

// ── 심장방: 등뼈에서 힘줄로 매달린 뼈 등롱 + 맥박 치는 금빛 심장 ──
function heart(w, K) {
  const [hx, hy, hz] = HEART, R = HEART_R, F = frame3(hx, hy, hz, FS_YAW, 0), top = SY(HEART_S);
  // 등롱 살: 경도선 8개(입구가 넓게 열린 두 곳은 비운다)
  const NM = 8;
  for (let j = 0; j < NM; j++) {
    const a = (j / NM) * Math.PI * 2 + Math.PI / NM;
    if (j === 1 || j === 2 || j === 6 || j === 7) continue;   // 남·북 두 창(폭풍 코스가 심장 옆을 꿰뚫는다)
    const pts = [];
    for (let k = 0; k <= 8; k++) { const ph = (0.1 + 0.62 * (k / 8)) * Math.PI, rr = R * Math.sin(ph); pts.push(F.P(Math.cos(a) * rr, Math.sin(a) * rr, R * Math.cos(ph) * 1.1)); }
    chain(w, pts, 0.9, 0.6, j % 2 ? BONE2 : BONE, { col: true, knuckle: BONE3, seg: 5 });
  }
  ring(w, hx, hy - R * 0.72, hz, R * 0.7, 0.7, BONE2, { pitch: 90, col: true, seg: 16 });
  ring(w, hx, hy + R * 0.7, hz, R * 0.7, 0.7, BONE2, { pitch: 90, col: true, seg: 16 });
  // 힘줄: 척추 몸통에서 등롱 꼭대기로
  for (const [ds, dv] of [[-10, -5], [10, -5], [-10, 5], [10, 5], [0, 0]]) {
    const a = SP(HEART_S + ds, dv * 0.6, top - 3), b = F.P(ds * 0.35, dv * 0.7, R * 1.05);
    tube(w, ...a, ...b, ds ? 0.8 : 1.4, ds ? FLESH2 : FLESH, { col: true, seg: 6 });
    tube(w, a[0], a[1] - 0.6, a[2], b[0], b[1], b[2], 0.18, GOLD, { mat: "glow", seg: 3 });
  }
  w.col.addSphere(V3(hx, hy, hz), 4.4);
  w.gap("심장방", ...F.P(8, 0, 0), FS_YAW, 8, 10, 500, 0);
  w.pool(hx, height(hx, hz), hz, 18, GOLD, 0.25);
  // 움직이는 심장: 겹겹의 덩어리(살 + 금빛 핵 + 분홍 막) — 두 번 뛰고 쉰다
  const grp = new THREE.Group(), mats = [];
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(2.2) }));
  const skin = new THREE.Mesh(new THREE.IcosahedronGeometry(5.4, 1), new THREE.MeshLambertMaterial({ color: FLESH2, emissive: new THREE.Color(PINK).multiplyScalar(0.3), flatShading: true, transparent: true, opacity: 0.78 }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 12), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  mats.push(core.material, skin.material, halo.material);
  grp.add(core, skin, halo); grp.position.set(hx, hy, hz); w.scene.add(grp);
  // 심장에서 뻗은 혈관(꿈틀대는 빛): 정적 관 + 맥박에 맞춰 밝아지는 덮개
  const veinParts = [];
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + 0.4, p0 = [hx, hy, hz], p1 = F.P(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8, (k % 3 - 1) * R * 0.5);
    tube(w, ...p0, ...p1, 0.35, FLESH2, { seg: 5 });
    veinParts.push([p0, p1]);
  }
  const light = new THREE.PointLight(GOLD, 0, 90, 1.6); light.position.set(hx, hy, hz); w.scene.add(light);
  w.disposables.push(core.geometry, skin.geometry, halo.geometry, ...mats);
  w.updaters.push((dt, t) => {
    const ph = t % 1.6, beat = Math.exp(-Math.pow((ph - 0.12) * 14, 2)) + 0.7 * Math.exp(-Math.pow((ph - 0.42) * 14, 2));
    const s = 1 + beat * 0.16;
    skin.scale.setScalar(s); core.scale.setScalar(1 + beat * 0.24); halo.scale.setScalar(1 + beat * 0.45);
    halo.material.opacity = 0.08 + beat * 0.2; core.material.color.setHex(GOLD).multiplyScalar(1.6 + beat * 1.6);
    grp.rotation.y = t * 0.08; light.intensity = 2 + beat * 6;
  });
  if (K) for (let k = 0; k < 6; k++) { const a = k * 1.05; K.blink.add(...F.P(Math.cos(a) * R, Math.sin(a) * R, -R * 0.62), GOLD, 0.5, k & 1); }
}

// ── 머리뼈: 동쪽 고원에 처박힌 갑각 머리 (속이 비어 벌어진 턱으로 들여다보인다) ──
function skull(w, K) {
  const r = w.rand, p = SP(SKULL_S), gy = height(p[0], p[2]), y = Math.max(gy + 12, SY(SKULL_S));
  const F = frame3(p[0], y, p[2], FS_YAW, -6, 7);
  hulk(w, K, F, { L: 52, R: 15, t0: 0.08, t1: 1, skin: 0.86, squash: 0.78, col: true, colors: [BONE3, BONE2, BONE4], seam: 0.25, fins: 0, pods: 0, tail: false, eye: GOLD });
  // 볏(뿔 왕관): 머리 위로 뒤로 젖혀진 뿔 다섯
  for (let k = 0; k < 5; k++) {
    const u = -10 + k * 5, v = (k - 2) * 4, base = F.P(u, v, 10.5), H = 18 - Math.abs(k - 2) * 4;
    w.mesh(spikeG(), M(base[0], base[1], base[2], 1.6, H, 1.6, v * 2, FS_YAW + 180, 48), k === 2 ? BONE : BONE2, "flat");
    w.col.addCapsule(V3(...base), V3(...F.P(u - H * 0.7, v * 1.2, 10.5 + H * 0.7)), 1.2);
  }
  // 아래턱: 벌어져 땅에 닿은 턱뼈와 송곳니
  const j0 = F.P(-8, -9, -9), j1 = F.P(30, -7, -15), j2 = F.P(-8, 9, -9), j3 = F.P(30, 7, -15);
  tube(w, ...j0, ...j1, 2.2, BONE2, { col: true }); tube(w, ...j2, ...j3, 2.2, BONE2, { col: true }); tube(w, ...j1, ...j3, 1.8, BONE3, { col: true });
  for (let k = 0; k < 7; k++) {
    const f = k / 6;
    for (const sd of [-1, 1]) {
      const q = F.P(-2 + f * 30, sd * (8.5 - f * 1.5), -10 - f * 5.5);
      w.mesh(spikeG(), M(q[0], q[1], q[2], 0.9, 5 + r() * 3, 0.9, sd * 10, 0, 0), BONE, "flat");
    }
  }
  // 눈구멍 두 개: 꺼져 가는 금빛
  for (const sd of [-1, 1]) { const e = F.P(14, sd * 11.5, 3.5); bead(w, e[0], e[1], e[2], 2.6, sd > 0 ? GOLD : AMBER); ring(w, e[0], e[1], e[2], 3.4, 0.6, BONE, { yaw: FS_YAW + (sd > 0 ? 0 : 180), col: false }); }
  w.pool(p[0], gy, p[2], 26, AMBER, 0.2);
  // 턱 아래로 흘러나온 굳은 금빛 피 웅덩이
  const m = F.P(30, 0, -15);
  w.pool(m[0], height(m[0], m[2]), m[2], 12, GOLD, 0.45);
}

// ── 선체 파편: 기함 둘레에 흩어진 찢긴 갑각 판(땅에 비스듬히 박혔다) ──
function shards(w, K, ctx) {
  const r = w.rand, S = [new Surf(), new Surf()];
  const spots = [[150, -52], [180, -56], [205, 50], [120, -50], [262, 50], [285, -48], [96, 30], [60, 22], [70, -26]];
  for (const [s, v] of spots) {
    const p = SP(s, v), gy = height(p[0], p[2]);
    if (gy < -10 || (ctx && !ctx.road(p[0], p[2], 8))) continue;
    if (ctx && ctx.LINES.some((L) => L.some((q) => Math.hypot(q.x - p[0], q.z - p[2]) < 16 && q.y - gy < 26))) continue;
    const yaw = FS_YAW + r() * 60 - 30, F = frame3(p[0], gy - 1, p[2], yaw, 0, (v > 0 ? 1 : -1) * (35 + r() * 25)), L = 14 + r() * 10, H = 10 + r() * 8;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n - 0.5) * 1.6, a1 = ((i + 1) / n - 0.5) * 1.6;
      const A = F.P(-L / 2, Math.sin(a0) * 6, 0), B = F.P(L / 2, Math.sin(a0) * 6, 0), C = F.P(L / 2 - 2, Math.sin(a1) * 6, H), D = F.P(-L / 2 + 2, Math.sin(a1) * 6, H);
      S[i % 2].quad(A, B, C, D);
    }
    const c0 = F.P(-L / 3, 0, H * 0.4), c1 = F.P(L / 3, 0, H * 0.4);
    w.col.addCapsule(V3(...c0), V3(...c1), 2.6);
    tube(w, ...F.P(-L / 2, 0, 0), ...F.P(-L / 2 + 2, 0, H), 0.6, BONE3, { seg: 5 });
    tube(w, ...F.P(L / 2, 0, 0), ...F.P(L / 2 - 2, 0, H), 0.6, BONE3, { seg: 5 });
    tube(w, ...F.P(-L / 2 + 2, 0, H), ...F.P(L / 2 - 2, 0, H), 0.25, r() < 0.5 ? DIMV : AMBER, { mat: "glow", seg: 3 });
    rock(w, p[0] + 4, gy, p[2] + 3, 2.4, 1.2, 2, SLATE);
  }
  S[0].flush(w, HULL2, "paint"); S[1].flush(w, HULL3, "paint");
}

export function flagship(w, K, ctx) {
  spine(w, K); tailFluke(w); ribs(w, K); heart(w, K); skull(w, K); shards(w, K, ctx);
}
