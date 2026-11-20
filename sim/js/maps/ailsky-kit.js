// 폭풍 무덤 제작 도구: 색, 기함 '별삼킴'의 축 좌표, 회전 좌표계, 면 모으개(Surf), 뼈 사슬·늑골 고리·척추 마디,
// 번개 첨탑(바위·결정 바늘과 섬전암 줄기), 난파선 선체(늑골 고리 + 남은 껍질), 빈 합창 가시 포탑, 깃발 모으개, 움직이는 소품용 받침(sink)
// 정적인 것은 모두 월드 배치(재질별 하나의 메시)로 합쳐진다. 에일 키트(ail-kit)의 관·덩어리·뼈 아치를 그대로 빌려 쓴다
import * as THREE from "../../vendor/three.module.min.js";
import { M, tube, bead, lump, V3, DEG, shard, lumpG, ring, Blinkers, lane, merged, ribArch, icoG, faceted, ribDomeG } from "./ail-kit.js";

export { M, tube, bead, lump, V3, DEG, shard, lumpG, ring, Blinkers, lane, merged, ribArch, icoG, faceted, ribDomeG };

// 바위(먹남색) · 뼈(해 질 녘의 상아) · 죽은 선체(검보라) · 폭풍 금빛 · 꺼져 가는 보라·분홍 · 빈 합창의 창백한 빛
export const INK = 0x1a1b33, SLATE = 0x2c2f52, SLATE2 = 0x3c4070, ASH = 0x7a7a9c, CRYS = 0x6a74c8, CRYS2 = 0x8f9cf0;
export const BONE = 0xd6cdbb, BONE2 = 0xb0a48f, BONE3 = 0x857a6c, BONE4 = 0x5c5550;
export const HULL = 0x1c1530, HULL2 = 0x2b1e4a, HULL3 = 0x3e2a64, FLESH = 0x35203f, FLESH2 = 0x4d2a5c;
export const GOLD = 0xffc24a, GOLD2 = 0xffe9a0, AMBER = 0xff9628, VIO = 0x7a45d8, VIO2 = 0xa66cf0, PINK = 0xe052b8, DIMV = 0x4a2a8c, DIMP = 0x8a2c70;
export const CHOR = 0x9af0ff, CHOR2 = 0xe8fbff, TEAL = 0x3ff0d8, WH = 0xe9ebf0, ORG = 0xf07a1e, DK = 0x2b3038;

// ── 기함 '별삼킴'의 축: 꼬리 끝 FS_A 에서 머리뼈 끝까지 s(m). v 는 축에서 옆으로(+ 가 남쪽) ──
export const FS_A = [-210, -38], FS_L = Math.hypot(360, 50), FS_U = [360 / FS_L, -50 / FS_L], FS_N = [50 / FS_L, 360 / FS_L];
export const FS = (s, v = 0) => [FS_A[0] + FS_U[0] * s + FS_N[0] * v, FS_A[1] + FS_U[1] * s + FS_N[1] * v];
export const FS_YAW = Math.atan2(-FS_U[1], FS_U[0]) / DEG;   // 축 방향(동쪽에서 북쪽으로 잰 각)
export const FS_Y0 = 4;                                       // 뼈대 기준 높이(두 고원 윗면의 중간)
// 등뼈 높이(기준 높이 위): 꼬리는 땅에 누웠다가 골반에서 치솟아 가슴 위에서 가장 높고, 목에서 머리뼈로 내려온다
const SPINE_Y = [[0, 1.6], [60, 3.2], [100, 6], [125, 16], [160, 46], [195, 72], [230, 88], [255, 90], [280, 84], [300, 70], [318, 46], [334, 26], [364, 20]];
export function spineY(s) {
  const P = SPINE_Y;
  if (s <= P[0][0]) return P[0][1];
  for (let i = 0; i < P.length - 1; i++) if (s <= P[i + 1][0]) { const t = (s - P[i][0]) / (P[i + 1][0] - P[i][0]); return P[i][1] + (P[i + 1][1] - P[i][1]) * (t * t * (3 - 2 * t)); }
  return P[P.length - 1][1];
}
// 갈비뼈 열두 쌍: 축 위치 s, 반폭 w (높이는 그 자리의 등뼈 높이)
export const RIBS = Array.from({ length: 12 }, (_, k) => { const s = 145 + k * 14.1; return { s, w: 30 + 14 * Math.sin(Math.PI * Math.min(1, (s - 138) / 170)) }; });
export const CAGE = [145, 300], SKULL = [326, 364];

const IDENT = new THREE.Matrix4();
const G = {};
const tp = (k, f) => G[k] || (G[k] = f());
const spikeG = () => tp("spike", () => { const g = new THREE.ConeGeometry(1, 1, 5, 1, true); g.translate(0, 0.5, 0); return faceted(g); });
const rockG = () => tp("rock", () => {
  const g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); v.multiplyScalar(1 + 0.22 * Math.sin(v.x * 3.1 + 1) * Math.sin(v.y * 3.7 + 2) * Math.sin(v.z * 3.3)); P.setXYZ(i, v.x, v.y, v.z); }
  return faceted(g);
});
export { spikeG, rockG };

// ── 회전 좌표계: u = 앞(yaw 0 이면 동쪽, 90 이면 북쪽), v = 오른쪽 옆, h = 위. pitch 는 머리를 드는 각, roll 은 옆으로 눕는 각(도) ──
export function frame3(x, y, z, yaw = 0, pitch = 0, roll = 0) {
  const m = M(x, y, z, 1, 1, 1, roll, yaw, pitch), v = new THREE.Vector3();
  return { m, yaw, pitch, roll, P: (u, s = 0, h = 0) => { v.set(u, h, s).applyMatrix4(m); return [v.x, v.y, v.z]; } };
}

// ── 면 모으개: 삼각형·사각형을 모아 한 번에 월드 배치에 넣는다(양면). 껍질·막·지느러미·바늘 바위에 쓴다 ──
export class Surf {
  constructor() { this.p = []; }
  tri(a, b, c) { this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); return this; }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); return this; }
  flush(w, color, mat = "paint", two = true) {
    const p = this.p, n = p.length / 9;
    if (!n) return;
    const arr = new Float32Array(p.length * (two ? 2 : 1));
    arr.set(p);
    if (two) for (let i = 0; i < n; i++) { const s = i * 9, o = p.length + s; arr[o] = p[s]; arr[o + 1] = p[s + 1]; arr[o + 2] = p[s + 2]; arr[o + 3] = p[s + 6]; arr[o + 4] = p[s + 7]; arr[o + 5] = p[s + 8]; arr[o + 6] = p[s + 3]; arr[o + 7] = p[s + 4]; arr[o + 8] = p[s + 5]; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.computeVertexNormals();
    w.mesh(g, IDENT, color, mat);
    this.p = [];
  }
}

// 뼈 사슬: 점들을 굵기가 변하는 관으로 잇고 마디마다 혹을 둔다. o: { col, mat, knuckle(색), seg }
export function chain(w, pts, r0, r1, color, o = {}) {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const r = r0 + (r1 - r0) * (i / Math.max(1, n - 1));
    tube(w, ...pts[i], ...pts[i + 1], r, Array.isArray(color) ? color[i % color.length] : color, { mat: o.mat, col: o.col, seg: o.seg });
    if (o.knuckle !== undefined && i > 0) w.mesh(lumpG(), M(pts[i][0], pts[i][1], pts[i][2], r * 1.12, r * 1.12, r * 1.12, i * 37, i * 53, 0), o.knuckle, "flat");
  }
}

// 늑골 고리: 좌표계 F 의 u 자리에 선 타원 고리(옆 반경 rv, 위 반경 rh). a0~a1 로 일부만 그릴 수 있다(0 = 오른쪽 옆, 90° = 등)
export function hoop(w, F, u, rv, rh, t, color, o = {}) {
  const n = o.n || 14, a0 = o.a0 ?? 0, a1 = o.a1 ?? Math.PI * 2, pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push(F.P(u, Math.cos(a) * rv, Math.sin(a) * rh)); }
  for (let i = 0; i < n; i++) tube(w, ...pts[i], ...pts[i + 1], t, color, { mat: o.mat, col: o.col, seg: o.seg || 5 });
  return pts;
}

// 척추 마디: 중심 c, 축 방향 ax(단위 벡터), 굵기 r. o: { spike(가시돌기 길이), wing(가로돌기 길이), color, crack(금빛 균열) }
export function vertebra(w, c, ax, r, o = {}) {
  const yaw = Math.atan2(-ax[2], ax[0]) / DEG, pit = Math.asin(Math.max(-1, Math.min(1, ax[1]))) / DEG, col = o.color ?? BONE, nx = -ax[2], nz = ax[0], nl = Math.hypot(nx, nz) || 1;
  w.mesh(lumpG(), M(c[0], c[1], c[2], r * 1.2, r, r * 1.08, 0, yaw, pit), col, "flat");
  if (o.spike) w.mesh(spikeG(), M(c[0], c[1] + r * 0.55, c[2], r * 0.42, o.spike, r * 0.85, 0, yaw, pit - 14), o.color2 ?? BONE2, "flat");
  if (o.wing) for (const sd of [-1, 1]) tube(w, c[0], c[1], c[2], c[0] + (nx / nl) * sd * o.wing, c[1] - o.wing * 0.22, c[2] + (nz / nl) * sd * o.wing, r * 0.3, o.color2 ?? BONE2, { seg: 5 });
  if (o.crack) {
    let p = [c[0] + (nx / nl) * r * 1.02, c[1] + r * 0.2, c[2] + (nz / nl) * r * 1.02];
    for (let k = 0; k < 4; k++) { const q = [p[0] + ax[0] * r * 0.5 * (k % 2 ? -1 : 1), p[1] - r * 0.32, p[2] + ax[2] * r * 0.5 * (k % 2 ? -1 : 1)]; tube(w, ...p, ...q, 0.16 + r * 0.03, GOLD, { mat: "glow", seg: 3 }); p = q; }
  }
}

// ── 번개 첨탑: 비틀리며 좁아지는 육각 바위 바늘(위쪽은 결정) + 꼭대기에서 흘러내린 금빛 섬전암 줄기 ──
// y0 에서 y1 까지. 돌려주는 값: { tip, at(t) → [중심 x, y, z, 반경] }
export function needle(w, K, x, z, y0, y1, R, o = {}) {
  const r = w.rand, N = o.n || 9, SD = 6, la = o.la ?? r() * 6.28, lean = o.lean ?? 0.04 + r() * 0.05, rock = new Surf(), rock2 = new Surf(), crys = new Surf(), lv = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, rr = R * Math.pow(1 - t, 0.72) * (i % 2 ? 1.1 : 0.94) + 0.3, cy = y0 + (y1 - y0) * t, off = lean * (cy - y0) * (1 - t * 0.4);
    const cx = x + Math.cos(la) * off, cz = z + Math.sin(la) * off, tw = i * 0.42 + la, pts = [];
    for (let k = 0; k < SD; k++) { const a = tw + (k / SD) * Math.PI * 2, q = rr * (0.86 + 0.28 * r()); pts.push([cx + Math.cos(a) * q, cy, cz + Math.sin(a) * q]); }
    lv.push({ c: [cx, cy, cz], rr, pts, tw });
  }
  const top = lv[N].c, tip = [top[0], y1 + R * 0.5 + 2, top[2]], cut = o.crystal ?? 0.62;
  for (let i = 0; i < N; i++) for (let k = 0; k < SD; k++) {
    const a = lv[i].pts[k], b = lv[i].pts[(k + 1) % SD], c = lv[i + 1].pts[(k + 1) % SD], d = lv[i + 1].pts[k];
    (i / N >= cut ? crys : (i + k) % 2 ? rock2 : rock).quad(a, b, c, d);
  }
  for (let k = 0; k < SD; k++) crys.tri(lv[N].pts[k], lv[N].pts[(k + 1) % SD], tip);
  rock.flush(w, o.color ?? SLATE, "flat"); rock2.flush(w, o.color2 ?? SLATE2, "flat"); crys.flush(w, o.crys ?? CRYS, "paint");
  for (let i = 0; i < N; i += 1) { const a = lv[i], b = lv[i + 1]; if (b.c[1] > (o.colFrom ?? -1e9)) w.col.addCapsule(V3(...a.c), V3(...b.c), Math.max(0.4, (a.rr + b.rr) * 0.44)); }
  // 섬전암 줄기: 꼭대기에서 지그재그로 흘러내린다
  for (let v = 0; v < (o.veins ?? 3); v++) {
    let prev = null, a = la + v * 2.1;
    const lo = o.veinTo ?? 0.12;
    for (let i = N; i >= 0; i--) {
      const L = lv[i], t = i / N;
      if (t < lo) break;
      a += (r() - 0.5) * 0.9;
      const p = [L.c[0] + Math.cos(a) * L.rr * 1.04, L.c[1], L.c[2] + Math.sin(a) * L.rr * 1.04];
      if (prev) tube(w, ...prev, ...p, 0.14 + R * 0.022, v % 2 ? AMBER : GOLD, { mat: "glow", seg: 3 });
      prev = p;
    }
  }
  w.mesh(spikeG(), M(tip[0], tip[1] - 1.2, tip[2], 0.5 + R * 0.05, 4 + R * 0.4, 0.5 + R * 0.05), GOLD2, "glow");
  if (K) K.blink.add(tip[0], tip[1] + 3.4 + R * 0.4, tip[2], GOLD, 0.5 + R * 0.04, (x | 0) & 1);
  const at = (t) => { const f = Math.min(N - 1e-4, Math.max(0, t * N)), i = f | 0, k = f - i, a = lv[i], b = lv[i + 1]; return [a.c[0] + (b.c[0] - a.c[0]) * k, a.c[1] + (b.c[1] - a.c[1]) * k, a.c[2] + (b.c[2] - a.c[2]) * k, a.rr + (b.rr - a.rr) * k]; };
  return { tip: [tip[0], tip[1] + 3 + R * 0.4, tip[2]], at };
}

// 늘어진 촉수와 그 끝의 주머니: (x,y,z) 에서 아래로 L 만큼. o: { r, pod(주머니 크기), glow, col }
export function podVine(w, x, y, z, L, o = {}) {
  const r = w.rand, n = o.n || 4, r0 = o.r || 0.5, sway = o.sway ?? 0.7;
  let prev = [x, y, z];
  for (let j = 1; j <= n; j++) {
    const p = [prev[0] + (r() - 0.5) * sway * 2, prev[1] - L / n, prev[2] + (r() - 0.5) * sway * 2];
    tube(w, ...prev, ...p, r0 * (1 - (j - 1) / n * 0.6), j % 2 ? FLESH2 : FLESH, { seg: 5 });
    prev = p;
  }
  const s = o.pod ?? 0;
  if (s > 0) {
    w.mesh(lumpG(), M(prev[0], prev[1] - s * 0.8, prev[2], s * 0.8, s, s * 0.8, 0, x * 31 % 360, 0), FLESH2, "paint");
    w.mesh(lumpG(), M(prev[0], prev[1] - s * 1.15, prev[2], s * 0.5, s * 0.55, s * 0.5), o.glow ?? DIMP, "glow");
    if (o.col) w.col.addSphere(V3(prev[0], prev[1] - s * 0.8, prev[2]), s * 0.8);
  } else bead(w, prev[0], prev[1] - 0.3, prev[2], r0 * 0.9, o.glow ?? DIMV);
  return prev;
}

// ── 난파선 선체: 축을 따라 늑골 고리를 세우고 사이사이 남은 껍질을 덮는다. 속이 비어 있어 뚫린 곳으로 드나들 수 있다 ──
// F: 좌표계(u = 뱃머리 쪽). o: { L 길이, R 반경, t0~t1(선체의 어느 구간인가 0 꼬리 ~ 1 머리), skin(껍질 남은 비율), col, open(t, 각) → 비울 곳,
//   fins, pods, colors, seam(솔기 빛 확률), head, tail }
export function hulk(w, K, F, o = {}) {
  const r = w.rand, L = o.L || 70, R = o.R || 10, t0 = o.t0 ?? 0, t1 = o.t1 ?? 1, n = o.n || Math.max(3, Math.round((t1 - t0) * L / 7)), sq = o.squash ?? 0.82, NS = 12;
  const prof = (t) => R * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(0.985, Math.max(0.015, t)), 0.8)), 0.62);
  const U = (t) => (t - 0.5) * L, keep = o.skin ?? 0.62, cols = o.colors || [HULL, HULL2, HULL3], skins = [new Surf(), new Surf(), new Surf()], ts = [];
  for (let i = 0; i <= n; i++) ts.push(t0 + (t1 - t0) * (i / n));
  ts.forEach((t, i) => { const rr = prof(t); if (rr > 1.4) hoop(w, F, U(t), rr, rr * sq, Math.max(0.4, rr * 0.06), i % 2 ? BONE3 : BONE2, { col: o.col, mat: "flat" }); });
  for (let i = 0; i < n; i++) {
    const ta = ts[i], tb = ts[i + 1], ra = prof(ta) * 1.04, rb = prof(tb) * 1.04;
    for (let j = 0; j < NS; j++) {
      const a0 = (j / NS) * Math.PI * 2, a1 = ((j + 1) / NS) * Math.PI * 2, am = (a0 + a1) / 2;
      if ((o.open && o.open((ta + tb) / 2, am)) || r() > keep + Math.sin(am) * 0.25) continue;
      const A = F.P(U(ta), Math.cos(a0) * ra, Math.sin(a0) * ra * sq), B = F.P(U(ta), Math.cos(a1) * ra, Math.sin(a1) * ra * sq);
      const C = F.P(U(tb), Math.cos(a1) * rb, Math.sin(a1) * rb * sq), D = F.P(U(tb), Math.cos(a0) * rb, Math.sin(a0) * rb * sq);
      skins[(i + j * 2 + (Math.sin(am) > 0.5 ? 1 : 0)) % 3].quad(A, B, C, D);
      if (o.col) {
        const rad = Math.max(0.6, (ra + rb) * 0.5 * (Math.PI / NS) * 0.85);
        w.col.addCapsule(V3(...F.P(U(ta), Math.cos(am) * ra * 0.95, Math.sin(am) * ra * sq * 0.95)), V3(...F.P(U(tb), Math.cos(am) * rb * 0.95, Math.sin(am) * rb * sq * 0.95)), rad);
      }
      if (r() < (o.seam ?? 0.14)) tube(w, ...A, ...D, 0.14 + R * 0.008, r() < 0.5 ? DIMV : DIMP, { mat: "glow", seg: 3 });
    }
  }
  skins.forEach((s, k) => s.flush(w, cols[k], "paint"));
  // 등 마루와 찢긴 지느러미
  const ridge = ts.map((t) => F.P(U(t), 0, prof(t) * sq + 0.3));
  chain(w, ridge, Math.max(0.5, R * 0.08), Math.max(0.5, R * 0.08), BONE3, { seg: 5 });
  const fin = new Surf();
  for (let k = 0; k < (o.fins ?? 3); k++) {
    const t = t0 + (t1 - t0) * (0.22 + k * 0.24), h = R * (1.0 - k * 0.18) * (0.7 + r() * 0.5), d = L * 0.045;
    if (prof(t) < R * 0.4) continue;
    const a = F.P(U(t) + d, 0, prof(t) * sq), b = F.P(U(t) - d, 0, prof(t) * sq), c = F.P(U(t) - d * 2.4, 0, prof(t) * sq + h), e = F.P(U(t) - d * 0.6, 0, prof(t) * sq + h * 0.55);
    fin.tri(a, b, c).tri(a, c, e);
    tube(w, ...a, ...c, 0.2 + R * 0.012, BONE3, { seg: 3 });
    tube(w, ...b, ...c, 0.16, k % 2 ? DIMP : DIMV, { mat: "glow", seg: 3 });
  }
  fin.flush(w, cols[2], "paint");
  // 배에서 늘어진 촉수 주머니
  for (let k = 0; k < (o.pods ?? 5); k++) {
    const t = t0 + (t1 - t0) * (0.12 + r() * 0.76), sd = k % 2 ? 1 : -1, pr = prof(t);
    if (pr < R * 0.45) continue;
    const p = F.P(U(t), sd * pr * (0.3 + r() * 0.4), -pr * sq * 0.8);
    podVine(w, p[0], p[1], p[2], R * (0.6 + r() * 1.1), { r: 0.3 + R * 0.03, pod: k % 3 ? 0 : R * 0.16, glow: k % 2 ? DIMP : DIMV });
  }
  // 머리: 입 고리와 감각 촉수, 꺼져 가는 눈
  if (o.head !== false && t1 > 0.97) {
    const rr = prof(0.97);
    hoop(w, F, U(0.99), rr * 0.7, rr * 0.7 * sq, R * 0.07, BONE2, { n: 10, mat: "flat", col: o.col });
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3, p0 = F.P(U(0.98), Math.cos(a) * rr * 0.8, Math.sin(a) * rr * 0.7), p1 = F.P(U(1.07), Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 1.2 - R * 0.25), p2 = F.P(U(1.12), Math.cos(a) * rr * 1.7, Math.sin(a) * rr * 1.2 - R * 0.7); tube(w, ...p0, ...p1, R * 0.05, FLESH2, { seg: 5 }); tube(w, ...p1, ...p2, R * 0.035, FLESH, { seg: 3 }); }
    const e = F.P(U(0.93), prof(0.93) * 0.92, prof(0.93) * sq * 0.3);
    bead(w, e[0], e[1], e[2], R * 0.09, o.eye ?? DIMP);
  }
  // 꼬리: 죽은 추진 주머니 셋
  if (o.tail !== false && t0 < 0.03) {
    for (const [v, h] of [[-0.45, -0.1], [0.45, -0.1], [0, 0.4]]) {
      const a = F.P(U(0.07), v * R, h * R), b = F.P(U(-0.06), v * R * 1.25, h * R * 1.2);
      tube(w, ...a, ...b, R * 0.2, HULL3, { seg: 7, col: o.col });
      w.mesh(lumpG(), M(b[0], b[1], b[2], R * 0.17, R * 0.17, R * 0.17), o.engine ?? HULL, o.engine ? "glow" : "flat");
    }
  }
  return { prof, U, ts };
}

// ── 빈 합창 가시 포탑: 검은 살덩이 밑동에서 창백한 가시가 부채처럼 솟고, 가운데 목구멍이 차갑게 빛난다 ──
export function spineTurret(w, K, x, y, z, s = 1, o = {}) {
  const r = w.rand, n = o.n ?? 6;
  lump(w, x, y + 0.5 * s, z, 2.6 * s, 1.3 * s, 2.6 * s, 0x16121f, { mat: "paint", col: o.col !== false });
  w.mesh(spikeG(), M(x, y + 0.6 * s, z, 0.75 * s, (8 + r() * 3) * s, 0.75 * s, (r() - 0.5) * 8, r() * 360, 0), 0xd8d4e8, "flat");
  if (o.col !== false) w.col.addCapsule(V3(x, y + s, z), V3(x, y + 7 * s, z), 0.6 * s);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 360 + r() * 30, d = (0.9 + r() * 0.8) * s, h = (3.5 + r() * 4.5) * s;
    w.mesh(spikeG(), M(x + Math.cos(a * DEG) * d, y + 0.3 * s, z + Math.sin(a * DEG) * d, (0.3 + r() * 0.25) * s, h, (0.3 + r() * 0.25) * s, 20 + r() * 34, -a + 90, 0), k % 2 ? 0xbcb6d0 : 0xe6e2f2, "flat");
  }
  ring(w, x, y + 1.5 * s, z, 1.5 * s, 0.2 * s, CHOR, { pitch: 90, col: false, mat: "glow", seg: 14 });
  bead(w, x, y + 1.3 * s, z, 0.7 * s, CHOR2);
  if (s > 0.8) w.pool(x, y + 0.08, z, 6.5 * s, CHOR, 0.3);
  if (K && s > 0.9) K.blink.add(x, y + (9 + 2) * s, z, CHOR, 0.3 * s, (x + z) & 1);
}

// 부러진 뼈 조각: 땅에 비스듬히 박힌 뼈 기둥(굵기 r, 길이 h)
export function stump(w, x, y, z, r, h, tilt, az, o = {}) {
  const m = M(x, y - r * 0.5, z, r, h, r, tilt, az, 0);
  w.mesh(spikeG(), m, o.color ?? BONE2, "flat");
  if (o.col !== false && h > 2.5) w.col.addCapsule(V3(0, 0.05, 0).applyMatrix4(m), V3(0, 0.75, 0).applyMatrix4(m), r * 0.6);
}
// 바위 덩이(각진 저폴리). o.col 이면 구 충돌
export function rock(w, x, y, z, rx, ry, rz, color = SLATE, o = {}) {
  w.mesh(rockG(), M(x, y, z, rx, ry, rz, o.rx || 0, o.ry ?? (x * 37 + z * 11) % 360, 0), color, o.mat || "flat");
  if (o.col) w.col.addSphere(V3(x, y, z), Math.min(rx, ry, rz) * 0.9);
}

// ── 깃발·막 모으개: 바람에 찢긴 에일 깃발과 살막. 장대는 정적으로 세우고, 천은 모아 두었다가 한 메시로 펄럭이게 한다(ailsky-detail) ──
// base: 천이 매달린 위쪽 모서리 시작점, dir: 천이 뻗는 방향(수평 단위 벡터), len: 길이, hgt: 아래로 처진 높이
export function flag(K, base, dir, len, hgt, color, o = {}) {
  K.flags.push({ base, dir, len, hgt, color, tear: o.tear ?? 0.5, ph: (base[0] * 0.13 + base[2] * 0.07) % 6.28 });
}
export function bannerPole(w, K, x, y, z, H, dirDeg, color, o = {}) {
  const dx = Math.cos(dirDeg * DEG), dz = -Math.sin(dirDeg * DEG), lean = o.lean ?? 0.06;
  const top = [x + dx * H * lean, y + H, z + dz * H * lean];
  tube(w, x, y - 0.5, z, ...top, 0.22 + H * 0.012, BONE2, { seg: 5, col: H > 6 });
  w.mesh(spikeG(), M(top[0], top[1] - 0.2, top[2], 0.3, 1.8, 0.3), BONE, "flat");
  tube(w, top[0], top[1] - 0.4, top[2], top[0] + dx * (o.len ?? H * 0.45), top[1] - 0.2, top[2] + dz * (o.len ?? H * 0.45), 0.12, BONE3, { seg: 3 });
  flag(K, [top[0], top[1] - 0.5, top[2]], [dx, dz], o.len ?? H * 0.45, o.hgt ?? H * 0.55, color, o);
}

// ── 움직이는 소품용 받침: 월드처럼 mesh/col 을 받지만 조각을 모아 두었다가 재질별 메시로 묶은 그룹을 만든다(충돌 없음) ──
export function sink(w) {
  const parts = {}, none = () => {};
  return {
    rand: w.rand, parts,
    mesh(g, m, c, mat = "std") { (parts[mat] || (parts[mat] = [])).push([g, m.clone(), c]); },
    col: { addCapsule: none, addSphere: none, addBox: none }, pool: none, shaft: none, gap: none,
    group() {
      const grp = new THREE.Group();
      for (const k of Object.keys(parts)) { const me = new THREE.Mesh(merged(parts[k]), w.material(k)); me.frustumCulled = false; me.castShadow = false; grp.add(me); w.disposables.push(me.geometry, me.material); }
      w.scene.add(grp);
      return grp;
    },
  };
}
