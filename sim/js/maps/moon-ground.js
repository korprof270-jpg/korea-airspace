// 달 기지 바닥·원경 디테일: 레골리스 재질 보정, 바닥 그림(바퀴 자국·발자국·분사 자국·잔 크레이터·광조·도색), 자갈, 먼 능선
// (모두 충돌 없음. 바닥 그림은 지형 위에 살짝 띄운 납작한 면 세 장 — 어둡게(곱셈)·밝게(가산)·도색(불투명))
import * as THREE from "../../vendor/three.module.min.js";
import { M, V3, lane } from "./moon-kit.js";
import { reserved, POCKS, ROAD, PADS, LAUNCH, MINE, basinE } from "./moon-terrain.js";

// ── 지형 재질 보정: 협곡용 가로 지층 띠(셰이더의 띠와 암석 텍스처의 줄무늬)를 지우고, 평원 흙 무늬의 반복을 큰 무늬와 섞어 깬다 ──
// (지형 재질은 공용 셰이더라 고칠 수 없으므로, 이 맵의 지형 메시에만 덧씌운다. 원문이 바뀌면 그냥 건너뛴다)
export function regolith(w) {
  const mesh = w.scene.children.find((o) => o.isMesh && o.material && o.material.customProgramCacheKey && String(o.material.customProgramCacheKey()).includes("terrain"));
  if (!mesh) return;
  const m = mesh.material, base = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) {
    base.call(this, sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace("vec3 rk = texture2D(tRock, vWPos.zy * 0.055).rgb * bw.x + texture2D(tRock, vWPos.xy * 0.055).rgb * bw.y;", "vec3 rk = (texture2D(tFlat, vWPos.zy * 0.085).rgb * bw.x + texture2D(tFlat, vWPos.xy * 0.085).rgb * bw.y) * vec3(0.86, 0.9, 1.0);")
      .replace("rk *= 0.84 + st * 0.13;", "rk *= 0.965 + st * 0.016; rk *= 0.8 + 0.3 * texture2D(tRock, vWPos.xz * 0.021).g;")
      .replace("vec3 fl = texture2D(tFlat, vWPos.xz * 0.16).rgb;", "vec3 fl = texture2D(tFlat, vWPos.xz * 0.16).rgb; fl = mix(fl, texture2D(tFlat, vec2(vWPos.x * 0.8 - vWPos.z * 0.6, vWPos.x * 0.6 + vWPos.z * 0.8) * 0.037).rgb, 0.42);");
  };
  m.customProgramCacheKey = () => "toon:moon-regolith";
}

// ── 바닥 그림 ──
const _c = new THREE.Color();
const rgb = (hex) => { _c.set(hex); return [_c.r, _c.g, _c.b]; };
const g3 = (k) => [k, k, k];
const LIFT = { dark: 0.05, light: 0.06, paint: 0.08 };

export class Paint {
  constructor(w) { this.w = w; this.L = { dark: { p: [], c: [] }, light: { p: [], c: [] }, paint: { p: [], c: [] } }; }
  // 점 [x, z] 또는 [x, z, y] 세 개와 색 세 개
  tri(k, a, b, c, ca, cb = ca, cc = ca) {
    const L = this.L[k], w = this.w, up = LIFT[k];
    if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) < 0) { const t = b; b = c; c = t; const tc = cb; cb = cc; cc = tc; }   // 항상 위를 보게
    for (const [q, col] of [[a, ca], [b, cb], [c, cc]]) { L.p.push(q[0], q[2] ?? w.h(q[0], q[1]) + up, q[1]); L.c.push(col[0], col[1], col[2]); }
  }
  quad(k, a, b, c, d, ca, cb = ca, cc = cb, cd = ca) { this.tri(k, a, b, c, ca, cb, cc); this.tri(k, a, c, d, ca, cc, cd); }
  // 꺾은선을 따라가는 띠. o: { off(옆으로 민다), y, step, c2(끝 색), w2(끝 너비) }
  strip(k, pts, wd, col, o = {}) {
    const step = o.step || 2.6, P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let j = i ? 1 : 0; j <= n; j++) P.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    const N = P.length, off = o.off || 0, c2 = o.c2 || col, w2 = o.w2 ?? wd; let pl = null, pr = null, pc = null;
    for (let i = 0; i < N; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, nz = (b[0] - a[0]) / d;
      const t = i / (N - 1), hw = (wd + (w2 - wd) * t) / 2, cc = [col[0] + (c2[0] - col[0]) * t, col[1] + (c2[1] - col[1]) * t, col[2] + (c2[2] - col[2]) * t];
      const l = [P[i][0] + nx * (off + hw), P[i][1] + nz * (off + hw)], r = [P[i][0] + nx * (off - hw), P[i][1] + nz * (off - hw)];
      if (o.y !== undefined) { l[2] = o.y; r[2] = o.y; }
      if (pl) this.quad(k, pl, pr, r, l, pc, pc, cc, cc);
      pl = l; pr = r; pc = cc;
    }
  }
  // 점선
  dash(k, pts, wd, col, on = 2, gap = 2, o = {}) {
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const T = cum[cum.length - 1], at = (s) => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
    for (let s = 0; s < T - 0.3; s += on + gap) this.strip(k, [at(s), at(Math.min(T, s + on))], wd, col, o);
  }
  // 고리(r0 = 0 이면 원판). 안쪽 색 c0 → 바깥 색 c1. o: { y, seg, a0, a1 }
  ring(k, x, z, r0, r1, c0, c1 = c0, o = {}) {
    const seg = o.seg || 14, a0 = o.a0 ?? 0, a1 = o.a1 ?? Math.PI * 2, pt = (r, a) => { const q = [x + Math.cos(a) * r, z + Math.sin(a) * r]; if (o.y !== undefined) q[2] = o.y; return q; };
    for (let i = 0; i < seg; i++) {
      const a = a0 + (a1 - a0) * i / seg, b = a0 + (a1 - a0) * (i + 1) / seg;
      if (r0 <= 0) this.tri(k, pt(0, 0), pt(r1, b), pt(r1, a), c0, c1, c1); else this.quad(k, pt(r0, a), pt(r0, b), pt(r1, b), pt(r1, a), c0, c0, c1, c1);
    }
  }
  // 돌린 네모 (가운데 x,z, 크기 sx×sz, ry 도)
  rect(k, x, z, sx, sz, ry, col, o = {}) {
    const c = Math.cos(ry * Math.PI / 180), s = Math.sin(ry * Math.PI / 180), pt = (u, v) => { const q = [x + u * c + v * s, z - u * s + v * c]; if (o.y !== undefined) q[2] = o.y; return q; };
    this.quad(k, pt(-sx / 2, -sz / 2), pt(-sx / 2, sz / 2), pt(sx / 2, sz / 2), pt(sx / 2, -sz / 2), col);
  }
  // 두 줄 바퀴 자국
  ruts(pts, sep = 2.4, wd = 0.42, k = 0.74) { for (const s of [-1, 1]) this.strip("dark", pts, wd, g3(k), { off: s * sep / 2 }); }
  // 발자국 줄
  prints(pts, k = 0.66) {
    let side = 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, ry = Math.atan2(-uz, ux) * 180 / Math.PI;
      for (let s = 0.3; s < len; s += 0.72, side = -side) this.rect("dark", a[0] + ux * s - uz * side * 0.2, a[1] + uz * s + ux * side * 0.2, 0.34, 0.17, ry, g3(k));
    }
  }
  finish() {
    const w = this.w, mk = (L, mat, order, nrm) => {
      if (!L.p.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(L.p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(L.c, 3));
      if (nrm) { const n = new Float32Array(L.p.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute("normal", new THREE.BufferAttribute(n, 3)); }
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = order; m.receiveShadow = nrm; m.castShadow = false; w.scene.add(m);
    };
    const po = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };
    mk(this.L.dark, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.MultiplyBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false, ...po }), 1, false);
    mk(this.L.light, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, ...po }), 1, false);
    mk(this.L.paint, new THREE.MeshLambertMaterial({ vertexColors: true, ...po, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0, true);
    this.count = (this.L.dark.p.length + this.L.light.p.length + this.L.paint.p.length) / 9;
  }
}
export { rgb, g3 };

// 부드러운 곡선으로 바꾼 꺾은선 [[x, z], ...]
export function curve(pts, closed = false, step = 2.6) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => V3(p[0], 0, p[1])), closed, "centripetal");
  return c.getSpacedPoints(Math.max(4, Math.ceil(c.getLength() / step))).map((v) => [v.x, v.z]);
}

// 잔 크레이터 하나: 해 쪽 안벽은 그늘지고 맞은편 안벽과 테두리는 밝다
const SUN = [0.9, 0.44];
function crater(P, x, z, R) {
  const seg = R > 2.5 ? 12 : 8, pt = (r, a) => [x + Math.cos(a) * r, z + Math.sin(a) * r], dk = (k) => g3(0.76 - 0.26 * k), lt = (k) => g3(0.035 + 0.14 * Math.max(0, -k)), Z = g3(0), W = g3(1);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * 6.2832, b = ((i + 1) / seg) * 6.2832, ka = Math.cos(a) * SUN[0] + Math.sin(a) * SUN[1], kb = Math.cos(b) * SUN[0] + Math.sin(b) * SUN[1];
    P.tri("dark", [x, z], pt(R * 0.72, b), pt(R * 0.72, a), g3(0.78), dk(kb), dk(ka));
    P.quad("dark", pt(R * 0.72, a), pt(R * 0.72, b), pt(R * 1.08, b), pt(R * 1.08, a), dk(ka), dk(kb), W, W);
    P.quad("light", pt(R * 0.4, a), pt(R * 0.4, b), pt(R, b), pt(R, a), Z, Z, lt(kb), lt(ka));
    P.quad("light", pt(R, a), pt(R, b), pt(R * 1.9, b), pt(R * 1.9, a), lt(ka), lt(kb), Z, Z);
  }
}

// ── 평원 전체의 바닥 그림: 도로·샛길 바퀴 자국, 착륙장·발사대 분사 자국, 잔 크레이터와 광조 ──
export function groundPaint(w, P, ctx) {
  const r = w.rand;
  // 순환 도로의 두 차선
  for (const off of [-2.9, 2.9]) { const L = lane(ROAD, off, 200); L.push(L[0]); P.ruts(L, 2.5, 0.5, 0.8); }
  // 샛길
  const SPURS = [
    [[131, 8], [108, 2], [90, 8], [78, 10], [60, 18], [44, 20], [30, 34], [14, 44]], [[14, 44], [20, 60], [24, 74]], [[-4, 48], [-18, 60], [-27, 69]],
    [[62, 92], [80, 96], [97, 94]], [[-66, 108], [-86, 122], [-106, 138], [-124, 139]], [[-40, 4], [-66, 22], [-90, 40], [-100, 46]],
    [[-8, -58], [-24, -86], [-40, -104]], [[112, -44], [124, -70], [134, -88]], [[22, -92], [20, -130], [26, -170], [34, -205], [44, -228]],
    [[-124, -8], [-150, -10], [-172, -10]], [[136, -10], [158, -8], [176, -8]], [[-112, -40], [-134, -58], [-144, -66]], [[-52, 62], [-60, 80], [-62, 98]],
  ];
  for (const s of SPURS) P.ruts(curve(s), 2.4, 0.42, 0.76);
  P.ruts(curve(ctx.buggy.map((p) => [p[0], p[2]]), true), 1.9, 0.36, 0.78);
  // 채굴 크레이터 벤치를 도는 운반로
  { const L = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; L.push([MINE.x + Math.cos(a) * 53, MINE.z + Math.sin(a) * 53]); } P.ruts(L, 3, 0.6, 0.72); }

  // 착륙장: 먼지가 쓸려 나가 밝아진 테와 방사형 그을음
  PADS.forEach(([x, z], i) => {
    P.ring("light", x, z, 12.4, 31, g3(0.085), g3(0), { seg: 28 });
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + r() * 0.2, L = 17 + r() * 11, wd = 0.5 + r() * 0.9, c = Math.cos(a), s = Math.sin(a);
      P.tri("dark", [x + c * 12.3 + s * wd, z + s * 12.3 - c * wd], [x + c * 12.3 - s * wd, z + s * 12.3 + c * wd], [x + c * L, z + s * L], g3(0.7), g3(0.7), g3(1));
    }
    P.ring("dark", x, z, 0, i === 2 ? 5 : 7, g3(0.5), g3(1), { y: 0.39, seg: 16 });
  });
  // 발사대: 화염 통로 네 방향으로 뻗은 그을음
  {
    const [x, z] = LAUNCH;
    P.ring("dark", x, z, 0, 15, g3(0.42), g3(1), { y: 0.33, seg: 20 });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const A = (d, s) => [x + dx * d - dz * s, z + dz * d + dx * s];
      P.quad("dark", [...A(6, -4), 0.34], [...A(6, 4), 0.34], [...A(23, 7), 0.34], [...A(23, -7), 0.34], g3(0.5), g3(0.5), g3(0.78), g3(0.78));
      for (let k = 0; k < 4; k++) { const d0 = 23.2 + k * 6, d1 = d0 + 6, w0 = 7 + k * 1.2, w1 = w0 + 1.2, c0 = g3(0.72 + k * 0.07), c1 = g3(0.79 + k * 0.07); P.quad("dark", A(d0, -w0), A(d0, w0), A(d1, w1), A(d1, -w1), c0, c0, c1, c1); }
    }
    P.ring("light", x, z, 34, 62, g3(0.06), g3(0), { seg: 32 });
  }
  // 잔 크레이터: 어두운 바닥 + 밝은 테
  let n = 0;
  for (let i = 0; i < 2400 && n < 300; i++) {
    const x = (r() * 2 - 1) * 335, z = (r() * 2 - 1) * 335, R = 0.9 + r() * r() * 4.6;
    if (reserved(x, z, R + 1) || Math.abs(w.h(x + R, z) - w.h(x - R, z)) + Math.abs(w.h(x, z + R) - w.h(x, z - R)) > R * 0.7) continue;
    crater(P, x, z, R); n++;
  }
  // 광조: 큰 크레이터에서 튀어 나간 밝은 줄무늬
  for (const [px, pz, R] of POCKS) {
    if (basinE(px, pz) > 1.15) continue;
    const k = 6 + ((r() * 4) | 0), a0 = r() * 6.28;
    for (let j = 0; j < k; j++) {
      const a = a0 + (j / k) * 6.28 + (r() - 0.5) * 0.5, L = R * (2.2 + r() * 2.6), c = Math.cos(a), s = Math.sin(a), pts = [[px + c * R * 1.15, pz + s * R * 1.15], [px + c * L, pz + s * L]];
      if (reserved(pts[1][0], pts[1][1], -4)) continue;
      P.strip("light", pts, R * (0.16 + r() * 0.14), g3(0.075), { c2: g3(0), w2: 0.3, step: 5 });
    }
  }
}

// ── 자갈: 큰 바위 둘레와 평원 곳곳에 뿌리는 작은 돌(충돌 없음) ──
export function pebbles(w, rocks) {
  const r = w.rand, G = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0)], C = [0xa8a6a2, 0x8d8c8a, 0xc2bfb8, 0x77767a];
  let n = 0;
  const put = (x, z, s) => { if (x > -22 && x < 22 && z > 74 && z < 132) return; w.mesh(G[n & 1], M(x, w.h(x, z) + s * 0.18, z, s * (0.8 + r() * 0.6), s * (0.45 + r() * 0.3), s * (0.8 + r() * 0.6), r() * 30, r() * 360, 0), C[n % 4], "std:rock"); n++; };
  for (const [x, z, s] of rocks) { const k = 1 + ((r() * 3) | 0); for (let i = 0; i < k; i++) { const a = r() * 6.28, d = s * (1.1 + r() * 1.6) + 0.6; put(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.18 + r() * 0.4); } }
  for (let i = 0; i < 2600 && n < 1500; i++) {
    const x = (r() * 2 - 1) * 300, z = (r() * 2 - 1) * 300;
    if (reserved(x, z, -5)) continue;
    put(x, z, 0.14 + r() * r() * 0.5);
  }
  return n;
}

// ── 원경: 지형 끝 너머로 겹쳐 보이는 두 겹의 능선(충돌 없음) ──
export function horizon(w) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (const [R0, R1, H, seed, tone] of [[620, 900, 120, 3, 0.86], [860, 1350, 250, 11, 0.7]]) {
    const SEG = 150, rows = [[0, -40], [0.2, 0.42], [0.4, 0.92], [0.58, 1], [0.8, 0.5], [1, -40]], pos = [], col = [], idx = [];
    const ph = [1, 2, 3, 4, 5].map((k) => (Math.sin(seed * k * 12.9898) * 43758.5453) % 6.28);
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2, j = i % SEG;
      const n = 0.5 + 0.24 * Math.sin(a * 3 + ph[0]) + 0.17 * Math.sin(a * 7 + ph[1]) + 0.1 * Math.sin(a * 13 + ph[2]) + 0.05 * Math.sin(a * 31 + ph[3]);
      const hh = H * Math.max(0.2, n);
      for (const [t, k] of rows) {
        const rr = R0 + (R1 - R0) * t + 14 * Math.sin(j * 1.7 + t * 5 + ph[4]), y = k < 0 ? k : hh * k * (0.92 + 0.1 * Math.sin(j * 2.3 + t * 9));
        pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
        const b = tone * (0.62 + 0.38 * Math.min(1, Math.max(0, y / H))); col.push(b * 0.74, b * 0.73, b * 0.72);
      }
    }
    const m = rows.length;
    for (let i = 0; i < SEG; i++) for (let k = 0; k < m - 1; k++) { const a = i * m + k, b = a + m; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; w.scene.add(mesh);
  }
}
