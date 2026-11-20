// 드론 리그 스타디움 제작 도구: 배치 상수(기지·라인·타워·정글 캠프·숨은 상자·보스 구덩이), 지형 높이·색, 네온 간판 아틀라스, 관중 텍스처
// 좌표: 북 = -z, 동 = +x. 청팀 기지 남서(-360, 360), 홍팀 기지 북동(360, -360). 모든 배치는 원점 대칭(x, z → -x, -z)이라 두 팀이 공평하다
import * as THREE from "../../vendor/three.module.min.js";
import { M } from "./canyon-kit.js";
import { hangulOK } from "./city-kit.js";

export const DEG = Math.PI / 180;
export const HALF = 460;                                  // 플레이 구역 절반 크기(보통 맵 230 m 의 두 배 → 넓이 4배)
export const CYAN = 0x3ff0ff, MAG = 0xff3ad6, LIME = 0x8cff4a, AMB = 0xffb040, VIO = 0xa46bff, WH = 0xe9eef6;
export const TB = 0x2f8cff, TR = 0xff2d3d;                // 팀 색 (combat.js TEAM_COLOR 와 같다)
export const DARK = 0x1a1f2b, DARK2 = 0x252c3b, STEEL = 0x4a5468, PANEL = 0x313a4d, INK = 0x0d1018;

const mir = (p) => (p.length === 3 ? [-p[0], p[1], -p[2]] : [-p[0], -p[1]]);
export const BASES = [[-360, 360], [360, -360]];          // 팀 0 청 · 팀 1 홍
export const BASE_R = 66;                                 // 기지 원판 반경 (안에 들어오면 회복·업그레이드)
export const PAD_R = 18;                                  // 재출격·정비 패드 반경 (기지 한가운데에서 경기장 쪽으로 조금 앞)
// 코어 반응로: 기지 깊숙이(경기장 모서리 쪽) 높은 단 위. 둘레는 높은 방벽이고 경기장 쪽 한 면만 열려 짧은 진입로로 이어진다
//  → 코어는 기지 문으로 들어와 진입로 정면에서만 제대로 노릴 수 있다. 진입로 어귀 둘 + 뒤 방벽 위 둘에 기지 방어 포탑
export const REACTOR = { back: 38, r: 16, h: 6, wallR: 21, wallH: 26, wallT: 2.4, open: 34, lane: 10, laneH: 16, pylonH: 15 };
export const fwdOf = (t) => { const [x, z] = BASES[t], L = Math.hypot(x, z); return [-x / L, -z / L]; };   // 기지 → 경기장 가운데 방향
export const corePos = (t) => { const [x, z] = BASES[t], [fx, fz] = fwdOf(t); return [x - fx * REACTOR.back, z - fz * REACTOR.back]; };
export const padPos = (t) => { const [x, z] = BASES[t], [fx, fz] = fwdOf(t); return [x + fx * 14, z + fz * 14]; };
// 기지 방어 포탑 자리 { p:[x, z], y(받침 꼭대기 높이), k: "mouth"(진입로 어귀) | "rear"(뒤 방벽 위) }
export function defensePos(t) {
  const R = REACTOR, [cx, cz] = corePos(t), [fx, fz] = fwdOf(t), px = -fz, pz = fx, oa = R.open * DEG;
  const m = R.wallR * Math.cos(oa) + R.lane, hw = R.wallR * Math.sin(oa) + R.wallT;
  const out = [-1, 1].map((s) => ({ p: [cx + fx * m + px * s * hw, cz + fz * m + pz * s * hw], y: R.pylonH, k: "mouth" }));
  for (const s of [-1, 1]) { const a = 125 * DEG; out.push({ p: [cx + (fx * Math.cos(a) + px * s * Math.sin(a)) * R.wallR, cz + (fz * Math.cos(a) + pz * s * Math.sin(a)) * R.wallR], y: R.wallH + 1.2, k: "rear" }); }
  return out;
}
// 기지 문 방향(라인이 나가는 쪽, 기지 중심 기준 각도 rad) — 문마다 침입 감지 장막
export const gateAngles = (t) => { const [bx, bz] = BASES[t]; return Object.values(LANES).map((pts) => { const p = t ? pts[pts.length - 2] : pts[1]; return Math.atan2(p[1] - bz, p[0] - bx); }); };
// 라인: 청 기지 → 홍 기지 꺾은선 [x, z]
const TOP = [[-352, 300], [-392, 170], [-402, -40], [-396, -250], [-352, -352], [-250, -396], [-40, -402], [170, -392], [300, -352]];
export const LANES = {
  top: TOP,
  mid: [[-312, 312], [-160, 160], [0, 0], [160, -160], [312, -312]],
  bot: TOP.map(mir).reverse().map((p) => [p[0], p[1]]),
};
// 꺾은선 위 비율 f 지점
export function along(pts, f) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let t = Math.max(0, Math.min(1, f)) * L;
  for (let i = 0; i < seg.length; i++) {
    if (t <= seg[i] || i === seg.length - 1) { const k = Math.min(1, t / seg[i]); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
    t -= seg[i];
  }
  return pts[pts.length - 1];
}
export function laneLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
// 점에서 꺾은선까지 거리
export function laneDist(pts, x, z) {
  let best = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// 타워: 라인마다 팀당 바깥·안쪽 둘. 길이 비율로 고르고(청 = f, 홍 = 1 - f) 라인은 서로 대칭이라 위치도 대칭
export const TOWER_F = { inner: 0.2, outer: 0.38 };
export const TOWER_H = 15;                                // 타워 기둥 높이 (포대 머리는 그 위)
export const TOWERS = {};
for (const [id, pts] of Object.entries(LANES)) {
  // mid 는 스스로 대칭, top ↔ bot 은 서로 대칭: 청의 top 타워를 뒤집으면 홍의 bot 타워
  TOWERS[id] = [
    { team: 0, tier: "inner", p: along(pts, TOWER_F.inner) }, { team: 0, tier: "outer", p: along(pts, TOWER_F.outer) },
    { team: 1, tier: "outer", p: along(pts, 1 - TOWER_F.outer) }, { team: 1, tier: "inner", p: along(pts, 1 - TOWER_F.inner) },
  ];
}
// 정글 캠프 (청 쪽 넷 + 대칭 넷). big: 정예 캠프
const CAMPS0 = [{ p: [-262, 62], big: false }, { p: [-182, -58], big: true }, { p: [-62, 262], big: false }, { p: [58, 182], big: true }];
export const CAMPS = [...CAMPS0.map((c) => ({ ...c, side: 0 })), ...CAMPS0.map((c) => ({ p: mir(c.p), big: c.big, side: 1 }))];
// 중앙 보스 구덩이
export const PIT = { r0: 58, r1: 84, depth: 24 };
export const BOSS = [0, -PIT.depth + 16, 0];
// 숨은 부품 상자: 떠 있는 판 밑 · 터널 안 · LED 탑 꼭대기 · 아치 안 (청 쪽 넷 + 대칭 넷)
const CACHE0 = [
  { p: [-312, 5, -168], where: "floating" }, { p: [-132, 4.5, 336], where: "tunnel" },
  { p: [-252, 72, 118], where: "tower" }, { p: [-120, 7.5, -8], where: "arch" },
];
export const CACHES = [...CACHE0, ...CACHE0.map((c) => ({ p: mir(c.p), where: c.where }))];

// ── 지형: 경기장 바닥은 평지, 가운데 보스 구덩이, 관중석 너머는 완만히 솟는 둑과 먼 도시 ──
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { sm };
export function height(x, z) {
  const r = Math.hypot(x, z);
  let h = -PIT.depth * (1 - sm(PIT.r0, PIT.r1, r));
  const e = Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * 0.74) - 560;   // 관중석 바깥 둑
  if (e > 0) h += 26 * sm(0, 160, e) + 6 * Math.sin(x * 0.013) * Math.sin(z * 0.011) * sm(0, 90, e);
  return h;
}
const _c = new THREE.Color(), _c2 = new THREE.Color();
export function colorFn(x, y, z, slope) {
  const n = Math.sin(x * 0.031 + z * 0.017) * Math.sin(z * 0.027 - x * 0.013);
  // 경기장 잔디: 짙은 남청 인조 잔디 + 넓은 줄무늬
  const stripe = Math.floor((x + z + 4000) / 26) % 2 ? 1.06 : 0.94;
  _c.set(0x1d3a3e).lerp(_c2.set(0x183048), 0.5 + n * 0.3).multiplyScalar(stripe);
  const r = Math.hypot(x, z);
  if (r < PIT.r1 + 4) _c.lerp(_c2.set(0x2a1f3e), 1 - sm(PIT.r0 - 10, PIT.r1 + 4, r));          // 보스 구덩이: 보랏빛 바닥
  for (let t = 0; t < 2; t++) {                                                                    // 기지: 팀 색으로 물든 바닥
    const d = Math.hypot(x - BASES[t][0], z - BASES[t][1]);
    if (d < BASE_R + 30) _c.lerp(_c2.set(t ? 0x3a1a24 : 0x16264a), 0.7 * (1 - sm(BASE_R - 10, BASE_R + 30, d)));
  }
  for (const pts of Object.values(LANES)) { const d = laneDist(pts, x, z); if (d < 22) _c.lerp(_c2.set(0x23293a), 0.75 * (1 - sm(12, 22, d))); }   // 라인 트랙
  const e = Math.max(Math.abs(x), Math.abs(z)) - 470;
  if (e > 0) _c.lerp(_c2.set(0x2b2f3a), sm(0, 30, e));
  if (y > 4) _c.lerp(_c2.set(0x23302c), 0.6);
  void slope;
  return _c;
}

// ── 네온 간판 아틀라스: 글씨가 스스로 빛나는 판(빛 받지 않음). 한 메시로 모은다 ──
// designs: [{ id, text: "한글" | ["한글", "EN"], fg, bg, w, h (px), glow(테두리 빛 색), scale }]
export class NeonSigns {
  constructor(w, designs, o = {}) {
    this.w = w;
    const S = 2048, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d"), ko = hangulOK();
    g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
    this.uv = {};
    let x = 0, y = 0, rowH = 0;
    for (const d of designs) {
      const cw = d.w || 512, ch = d.h || 128;
      if (x + cw > S) { x = 0; y += rowH + 4; rowH = 0; }
      g.save(); g.translate(x, y);
      const gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, d.bg || "#0a1030"); gr.addColorStop(1, d.bg2 || d.bg || "#060818");
      g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      if (d.grid) { g.strokeStyle = d.grid; g.lineWidth = 1; g.globalAlpha = 0.35; for (let i = 0; i < cw; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, ch); g.stroke(); } for (let i = 0; i < ch; i += 16) { g.beginPath(); g.moveTo(0, i); g.lineTo(cw, i); g.stroke(); } g.globalAlpha = 1; }
      if (d.glow) { g.strokeStyle = d.glow; g.lineWidth = Math.max(4, ch * 0.05); g.strokeRect(g.lineWidth, g.lineWidth, cw - g.lineWidth * 2, ch - g.lineWidth * 2); }
      if (d.draw) d.draw(g, cw, ch);
      const txt = Array.isArray(d.text) ? (ko ? d.text[0] : d.text[1]) : d.text || "", lines = String(txt).split("\n");
      if (txt) {
        const size = Math.min(ch * (lines.length > 1 ? 0.36 : 0.6) * (d.scale || 1), (cw * 0.9) / Math.max(1, Math.max(...lines.map((l) => l.length))) * (ko && /[가-힣]/.test(txt) ? 1.0 : 1.75));
        g.font = `900 ${size}px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.shadowColor = d.fg || "#fff"; g.shadowBlur = size * 0.25; g.fillStyle = d.fg || "#ffffff";
        lines.forEach((l, i) => g.fillText(l, cw / 2, (d.ty ?? 0.5) * ch + (i - (lines.length - 1) / 2) * size * 1.12, cw * 0.94));
      }
      g.restore();
      const e = 1 / S;
      this.uv[d.id] = [x / S + e, 1 - (y + ch) / S + e, (x + cw) / S - e, 1 - y / S - e, cw / ch];
      x += cw + 4; rowH = Math.max(rowH, ch);
    }
    const t = (this.tex = new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const k = o.k ?? 1.25;
    this.mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(k, k, k), side: THREE.DoubleSide });
    this.holo = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(k, k, k), transparent: true, opacity: o.holo ?? 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.sets = { solid: { p: [], n: [], u: [], i: [], c: 0 }, holo: { p: [], n: [], u: [], i: [], c: 0 } };
    w.disposables.push(t);
  }
  // 중심 (x,y,z), 폭 width(m). ry: 면이 향하는 방향(0 = +z 남쪽). holo: 반투명 홀로그램
  add(id, x, y, z, width, o = {}) {
    const uv = this.uv[id]; if (!uv) return;
    const S = this.sets[o.holo ? "holo" : "solid"];
    const hw = width / 2, hh = (o.height ?? width / uv[4]) / 2, m = M(x, y, z, 1, 1, 1, o.pitch || 0, o.ry || 0, 0), v = new THREE.Vector3(), b = S.c;
    for (const [lx, ly, tu, tv] of [[-hw, -hh, 0, 0], [hw, -hh, 1, 0], [hw, hh, 1, 1], [-hw, hh, 0, 1]]) {
      v.set(lx, ly, 0).applyMatrix4(m); S.p.push(v.x, v.y, v.z); S.n.push(0, 0, 1);
      S.u.push(uv[0] + (uv[2] - uv[0]) * tu, uv[1] + (uv[3] - uv[1]) * tv);
    }
    S.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    S.c += 4;
  }
  finish() {
    for (const [k, S] of Object.entries(this.sets)) {
      if (!S.c) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(S.p, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(S.n, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(S.u, 2));
      g.setIndex(S.i);
      const mesh = new THREE.Mesh(g, k === "holo" ? this.holo : this.mat);
      mesh.frustumCulled = false; if (k === "holo") mesh.renderOrder = 7;
      this.w.scene.add(mesh);
      this.w.disposables.push(g);
    }
  }
}

// 관중 텍스처: 어두운 바탕에 알록달록한 점(응원봉)이 촘촘히. 세로로 반복해 계단식 관중석 경사면에 붙인다
export function crowdTexture() {
  const S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d");
  g.fillStyle = "#07080d"; g.fillRect(0, 0, S, S);
  let s = 77;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pal = ["#3ff0ff", "#ff3ad6", "#5aa9ff", "#ff5a66", "#ffe14a", "#ffffff", "#8cff4a", "#6a7088", "#4a5068"];
  for (let row = 0; row < 16; row++) {
    g.fillStyle = "#11141e"; g.fillRect(0, row * 16 + 12, S, 4);   // 좌석 줄
    for (let i = 0; i < 40; i++) {
      const x = (i + r() * 0.6) * (S / 40), y = row * 16 + 3 + r() * 6, c = pal[(r() * pal.length) | 0];
      g.fillStyle = c; g.globalAlpha = c.startsWith("#6") || c.startsWith("#4") ? 0.8 : 0.55 + r() * 0.45;
      g.fillRect(x, y, 2.4, 3.4);
    }
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// 결정론적 난수
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 48271) % 2147483647 + 2147483647) % 2147483647) / 2147483647); }

// 라인 위 빛 고리 자리: 양쪽 기지에서 똑같이 60 m 부터 120 m 마다(두 팀 대칭), 타워 둘레·보스 구덩이 위는 비운다 → [{ p:[x, z], ry(도), t(라인 위 비율) }]
export function laneHoops(id) {
  const pts = LANES[id], tot = laneLength(pts), tw = Object.values(TOWERS).flat(), out = [];
  const ds = [];
  for (let d = 60; d < tot / 2 - 30; d += 120) ds.push(d, tot - d);
  for (const d of ds.sort((x, y) => x - y)) {
    const [x, z] = along(pts, d / tot), [x2, z2] = along(pts, Math.min(1, (d + 1) / tot)), [x1, z1] = along(pts, Math.max(0, (d - 1) / tot));
    if (tw.some((q) => Math.hypot(q.p[0] - x, q.p[1] - z) < 40) || Math.hypot(x, z) < PIT.r1 + 6) continue;
    out.push({ p: [x, z], ry: Math.atan2(x2 - x1, z2 - z1) / DEG, t: d / tot });
  }
  return out;
}
// 경주 코스 1: 보스 구덩이 둘레 r = 150 의 고리 길 (정글 장애물이 비켜 선다)
export const RING_R = 150;
export const TRACK_KEEP = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [Math.cos(a) * RING_R, Math.sin(a) * RING_R, 18]; });
