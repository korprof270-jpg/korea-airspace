// 비행기지 제작 도구: 배치 상수, 지형 높이·색, 부품 묶음(항공기·차량을 로컬 좌표로 짜서 정적 배치 또는 움직이는 소품으로), 칠한 간판 아틀라스, 7획 숫자
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, frame, flora, birds } from "./canyon-kit.js";
import { ring, dome, octa, ball, lattice, dish, Blinkers, lane, V3 } from "./moon-kit.js";
import { hangulOK } from "./city-kit.js";

export { M, beam, prop, merged, frame, flora, birds, ring, dome, octa, ball, lattice, dish, Blinkers, lane, V3 };

export const DEG = Math.PI / 180;
// 색: 콘크리트·아스팔트·도장·위장 녹색·관제 유리
export const CONC = 0xbdb8ad, CONC2 = 0xa9a499, ASPH = 0x45474c, ASPH2 = 0x393b40, WH = 0xf2f0ea, YEL = 0xf3c22c, ORG = 0xf07a1e, RED = 0xe0392b;
export const GREY = 0x8d96a3, GREY2 = 0x6f7884, DARK = 0x2c3038, INK = 0x1b1e24, STEEL = 0x5f6672, NAVY = 0x23407e, SKY = 0x5aa9ff;
export const OLIVE = 0x5d6b3c, OLIVE2 = 0x4a5631, SAND = 0xd9c9a2, CREAM = 0xebe1c8, ROOF = 0x3f6f8a, ROOF2 = 0x7a3a2c, TILE = 0x3b3f46;
export const GLASS = 0x6fb4d8, GRN = 0x3fe07a, BLUE = 0x3a7bff, AMB = 0xffb040, SILVER = 0xc9d0d9;

// ── 배치 상수 (북 = -z, 동 = +x) ──
export const RWY = { z: 100, x0: -232, x1: 232, w: 32 };           // 활주로 09/27
export const TWY = { z: 40, w: 18, x0: -222, x1: 222 };              // 평행 유도로 A
export const CONN = [-222, -110, 0, 110, 222];                        // 활주로 연결 유도로
export const APRON = { x0: -236, x1: 104, z0: -62, z1: 31 };          // 계류장
export const HANGARS = [-200, -145, -90, -35], HF = -62, HD = 50, HW = 46, HWALL = 6, HRISE = 15;   // 격납고(정면 z = HF, 깊이 HD)
export const OPEN = [true, false, true, true];                        // 앞뒤 문이 열린 격납고(관통 비행 가능)
export const DOOR = { w: 34, h: 15 }, BDOOR = { w: 20, h: 11 };
export const TOWER = [150, -25], OPS = [150, -62];
export const JETS = [62, 80, 98], JET_Z = -8, TRANS = [20, -20];   // 계류장 전투기 줄, 수송기
export const TANKS = [[195, -20], [215, -20], [235, -20]], TANK_R = 6.5, TANK_H = 10;
export const RADAR = [215, -130], RADOME = [-236, -152];
export const BARRACKS = [[-195, -140], [-145, -140], [-195, -178], [-145, -178]];
export const PARADE = [-65, -160], HQ = [5, -150], WTOWER = [45, -185], HELI = [95, -160], MOTOR = [162, -166];
export const FENCE = { x: 258, z0: -212, z1: 162 }, GATE_X = 180;
export const ROAD = { x: 248, z0: -204, z1: 150 };                    // 담장 안 순환 도로
export const SOCKS = [[-200, 64], [200, 64]];

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { sm };
// 결정론적 난수 해시
export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// ── 지형: 기지 안은 평지, 북쪽은 소나무 숲 능선, 동서는 구릉, 남쪽 들녘 너머 먼 산 ──
export function height(x, z) {
  const n1 = Math.sin(x * 0.021 + 0.7) * Math.sin(z * 0.017 + 1.9), n2 = Math.sin(x * 0.053 + z * 0.041) * 0.5 + Math.sin(x * 0.11 - z * 0.07) * 0.2;
  let h = 0;
  const dn = -222 - z;                                                  // 북쪽 능선
  if (dn > 0) h += (38 + 22 * n1) * sm(0, 120, dn) + 10 * sm(60, 200, dn) * (1 + n2);
  const de = Math.abs(x) - 300;                                         // 동서 구릉 (서쪽 진입등 회랑은 낮게)
  if (de > 0) { const lane = x < 0 ? 1 - 0.75 * (1 - sm(30, 70, Math.abs(z - RWY.z))) : 1; h += (30 + 18 * n1) * sm(0, 140, de) * lane + 6 * sm(0, 60, de) * n2 * lane; }
  const ds = z - 268;                                                   // 남쪽 먼 산
  if (ds > 0) h += (34 + 20 * n1) * sm(0, 150, ds) + 8 * sm(40, 160, ds) * (1 + n2);
  return h;
}
const _c = new THREE.Color(), _c2 = new THREE.Color();
export function colorFn(x, y, z, slope) {
  const n = Math.sin(x * 0.05 + z * 0.03) * Math.sin(z * 0.045 - x * 0.02), n2 = Math.sin(x * 0.19 + 2) * Math.sin(z * 0.17 + 1);
  if (y > 1.5) {
    // 소나무 숲 능선: 짙은 초록 + 군데군데 단풍 든 활엽수 얼룩
    _c.set(n > 0.35 ? 0x7d6a2c : n < -0.3 ? 0x3f5a2c : 0x4d6a32).lerp(_c2.set(0x8b8a4a), (n2 + 1) * 0.1);
    if (slope > 0.32) _c.lerp(_c2.set(0x9b8f78), 0.6);
    return _c;
  }
  const inBase = Math.abs(x) < FENCE.x && z > FENCE.z0 && z < FENCE.z1;
  if (inBase) {
    // 깎아 놓은 잔디: 활주로 방향 줄무늬 + 북쪽 생활 구역은 조금 짙게
    const stripe = Math.floor((z + 1000) / 9) % 2 ? 1.05 : 0.95;
    _c.set(0x86a24a).lerp(_c2.set(0xa3a650), 0.35 + n * 0.25).multiplyScalar(stripe * (0.97 + n2 * 0.04));
    if (z < -120) _c.lerp(_c2.set(0x6f8f3e), 0.35);
    return _c;
  }
  // 담장 밖 남쪽: 황금 논배미(바둑판) + 초록 논둑
  if (z > FENCE.z1 + 4 && z < 262 && x < 92 && x > -330) {
    const px = ((x + 2000) % 34), pz = ((z + 2000) % 26);
    if (px < 3.4 || pz < 3.4) return _c.set(0x6f8a3a);
    const k = hash(Math.floor((x + 2000) / 34), Math.floor((z + 2000) / 26));
    return _c.set(k > 0.78 ? 0x9cae4a : k > 0.4 ? 0xcdb24a : 0xd9bc54).multiplyScalar(0.96 + n2 * 0.05);
  }
  _c.set(0x8da04a).lerp(_c2.set(0xb5a554), 0.4 + n * 0.3);
  if (slope > 0.25) _c.lerp(_c2.set(0x9b8f78), 0.6);
  return _c;
}

// ── 부품 묶음: 로컬 좌표(u = 오른쪽 x, v = 뒤쪽 z, 기수는 -v)로 짠 뒤 월드에 정적으로 찍거나 움직이는 메시로 만든다 ──
const T = {};
const tp = (k, f) => T[k] || (T[k] = f());
export const G = {
  box: () => tp("box", () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: () => tp("cyl", () => new THREE.CylinderGeometry(1, 1, 1, 12)),
  cyl6: () => tp("cyl6", () => new THREE.CylinderGeometry(1, 1, 1, 6)),
  sph: () => tp("sph", () => new THREE.SphereGeometry(1, 12, 8)),
  cone: () => tp("cone", () => new THREE.ConeGeometry(1, 1, 12)),
  // 박공지붕 삼각기둥: x -0.5..0.5, 밑변 z -1..1 (y = 0), 꼭대기 y = 1
  roof: () => tp("roof", () => {
    const A = [-0.5, 0, -1], B = [-0.5, 0, 1], C = [-0.5, 1, 0], D = [0.5, 0, -1], E = [0.5, 0, 1], F = [0.5, 1, 0];
    const tri = [A, B, C, D, F, E, A, F, D, A, C, F, B, F, C, B, E, F, A, E, B, A, D, E], pos = [], uv = [];
    for (const p of tri) { pos.push(...p); uv.push(p[0] + p[2], p[1] + p[2]); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }),
};
// 박공지붕: 중심 (x, y = 처마 높이, z), 길이 L(용마루 방향), 폭 D, 높이 h. ry: 용마루 방향(0 = x 축)
export function gableRoof(w, x, y, z, L, D, h, color, o = {}) {
  w.mesh(G.roof(), M(x, y, z, L, h, D / 2, 0, o.ry || 0, 0), color, o.mat || "paint");
  if (o.col !== false) w.col.addBox(V3(x, y + h * 0.35, z), V3(L / 2, h * 0.35, D * 0.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (o.ry || 0) * DEG, 0)));
}
const _Y = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
export class Parts {
  constructor() { this.list = []; this.cols = []; }
  // 상자: (u, y, v) 는 바닥 가운데
  box(u, y, v, su, sy, sv, color, o = {}) { this.list.push([G.box(), M(u, y + sy / 2, v, su, sy, sv, o.rx || 0, o.ry || 0, o.rz || 0), color, o.mat || "paint"]); if (o.col) this.cols.push(["box", u, y + sy / 2, v, su / 2, sy / 2, sv / 2, o.ry || 0]); return this; }
  // 두 점을 잇는 원통
  pipe(a, b, r, color, o = {}) {
    _a.set(...a); _b.set(...b); const d = _b.clone().sub(_a), L = d.length();
    _q.setFromUnitVectors(_Y, d.normalize());
    this.list.push([o.seg === 6 ? G.cyl6() : G.cyl(), new THREE.Matrix4().compose(_a.clone().add(_b).multiplyScalar(0.5), _q.clone(), _s.set(r * (o.sx || 1), L, r * (o.sz || 1))), color, o.mat || "paint"]);
    if (o.col) this.cols.push(["cap", ...a, ...b, r]);
    return this;
  }
  sph(u, y, v, r, color, o = {}) { this.list.push([G.sph(), M(u, y, v, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o.rx || 0, o.ry || 0, 0), color, o.mat || "paint"]); return this; }
  cyl(u, y, v, r, h, color, o = {}) { this.list.push([o.seg === 6 ? G.cyl6() : G.cyl(), M(u, y + h / 2, v, r, h, r, o.rx || 0, o.ry || 0, o.rz || 0), color, o.mat || "paint"]); return this; }
  // 바퀴: 축이 u 방향인 원통
  wheel(u, v, r, w, color = INK) { this.list.push([G.cyl(), M(u, r, v, r, w, r, 0, 0, 90), color, "paint"]); return this; }
  // 월드에 정적 배치 (충돌은 상자·캡슐로)
  place(w, x, y, z, ry = 0) {
    const base = M(x, y, z, 1, 1, 1, 0, ry, 0);
    for (const [g, m, c, mat] of this.list) w.mesh(g, base.clone().multiply(m), c, mat);
    const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), X = (u, v) => x + u * c + v * s, Z = (u, v) => z - u * s + v * c;
    for (const k of this.cols) {
      if (k[0] === "box") { const [, u, yy, v, hx, hy, hz, r2] = k; w.col.addBox(V3(X(u, v), y + yy, Z(u, v)), V3(hx, hy, hz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (ry + r2) * DEG, 0))); }
      else { const [, au, ay, av, bu, by, bv, r] = k; w.col.addCapsule(V3(X(au, av), y + ay, Z(au, av)), V3(X(bu, bv), y + by, Z(bu, bv)), r); }
    }
  }
  // 움직이는 소품: 재질별로 합친 메시 묶음
  group(w, shadow = true) {
    const by = new Map();
    for (const [g, m, c, mat] of this.list) { if (!by.has(mat)) by.set(mat, []); by.get(mat).push([g, m, c]); }
    const grp = new THREE.Group();
    for (const [mat, parts] of by) {
      const mesh = new THREE.Mesh(merged(parts), w.material(mat));
      mesh.castShadow = shadow && !mat.startsWith("glow") && !mat.startsWith("glass");
      grp.add(mesh);
      w.disposables.push(mesh.geometry);
    }
    return grp;
  }
}

// ── 칠한 간판 아틀라스: 낮 맵이라 네온 대신 페인트 글씨. 한 메시로 모은다 ──
// designs: [{ id, text: "한글" | ["한글", "EN"], fg, bg, w, h (px), bold, border }]
export class PaintSigns {
  constructor(w, designs) {
    this.w = w;
    const S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d"), ko = hangulOK();
    g.fillStyle = "#808080"; g.fillRect(0, 0, S, S);
    this.uv = {};
    let x = 0, y = 0, rowH = 0;
    for (const d of designs) {
      const cw = d.w || 256, ch = d.h || 64;
      if (x + cw > S) { x = 0; y += rowH + 2; rowH = 0; }
      g.save(); g.translate(x, y);
      g.fillStyle = d.bg || "#ffffff"; g.fillRect(0, 0, cw, ch);
      if (d.border) { g.strokeStyle = d.border; g.lineWidth = Math.max(3, ch * 0.07); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, cw - g.lineWidth, ch - g.lineWidth); }
      if (d.stripe) { g.fillStyle = d.stripe; g.fillRect(0, ch * 0.82, cw, ch * 0.18); }
      const txt = Array.isArray(d.text) ? (ko ? d.text[0] : d.text[1]) : d.text, lines = String(txt).split("\n");
      const size = Math.min(ch * (lines.length > 1 ? 0.36 : 0.66) * (d.scale || 1), (cw * 0.9) / Math.max(1, Math.max(...lines.map((l) => l.length))) * (ko && /[가-힣]/.test(txt) ? 1.0 : 1.7));
      g.font = `${d.bold === false ? 600 : 900} ${size}px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = d.fg || "#1b1e24";
      lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.15 - (d.stripe ? ch * 0.06 : 0), cw * 0.94));
      g.restore();
      const e = 1 / S;
      this.uv[d.id] = [x / S + e, 1 - (y + ch) / S + e, (x + cw) / S - e, 1 - y / S - e, cw / ch];
      x += cw + 2; rowH = Math.max(rowH, ch);
    }
    const t = (this.tex = new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    this.mat = new THREE.MeshLambertMaterial({ map: t });   // 장면에 들어가면 툰 재질로 바뀐다
    this.p = []; this.n = []; this.u = []; this.i = []; this.count = 0;
    w.disposables.push(t);
  }
  // 중심 (x,y,z), 폭 width(m). ry: 면이 향하는 방향(0 = +z 남쪽, 90 = +x 동쪽). pitch -90: 바닥에 눕힘
  add(id, x, y, z, width, o = {}) {
    const uv = this.uv[id]; if (!uv) return;
    const hw = width / 2, hh = (o.height ?? width / uv[4]) / 2, m = M(x, y, z, 1, 1, 1, o.pitch || 0, o.ry || 0, 0), nm = new THREE.Matrix3().getNormalMatrix(m), b = this.count, v = new THREE.Vector3();
    for (const [lx, ly, tu, tv] of [[-hw, -hh, 0, 0], [hw, -hh, 1, 0], [hw, hh, 1, 1], [-hw, hh, 0, 1]]) {
      v.set(lx, ly, 0).applyMatrix4(m); this.p.push(v.x, v.y, v.z);
      v.set(0, 0, 1).applyMatrix3(nm).normalize(); this.n.push(v.x, v.y, v.z);
      this.u.push(uv[0] + (uv[2] - uv[0]) * tu, uv[1] + (uv[3] - uv[1]) * tv);
    }
    this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.count += 4;
  }
  finish() {
    if (!this.count) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.i);
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.frustumCulled = false; mesh.receiveShadow = true;
    this.w.scene.add(mesh);
    this.w.disposables.push(g);
  }
}

// ── 활주로 번호용 7획 숫자: 중심 (cx, cz), 앞(글자 위쪽) 방향 (fx, fz), 글자 폭 W, 높이 H ──
const SEG = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
export function digit(w, cx, cz, d, fx, fz, W = 5, H = 12, t = 1.1, y = 0.12, color = WH) {
  const rx = -fz, rz = fx;   // 오른쪽 = 앞을 시계 방향으로 90도 (앞 +x → 오른쪽 +z)
  const P = (u, v) => [cx + rx * u + fx * v, cz + rz * u + fz * v];
  const ry = Math.atan2(-fz, fx) / DEG;   // 상자의 x 축을 앞 방향에
  const hw = W / 2, hh = H / 2;
  const seg = { a: [0, hh, W, t], d: [0, -hh, W, t], g: [0, 0, W, t], b: [hw, hh / 2, t, hh], c: [hw, -hh / 2, t, hh], e: [-hw, -hh / 2, t, hh], f: [-hw, hh / 2, t, hh] };
  for (const s of SEG[d]) {
    const [u, v, su, sv] = seg[s], [x, z] = P(u, v);
    w.box(x, y, z, sv + t * 0.5 * (su > sv ? 0 : 1), 0.04, su, color, { ry, col: false, ao: false });
  }
}

// 바닥 칠: 얇은 판(충돌·음영 없음)
export function paint(w, x, z, sx, sz, color, y = 0.12, ry = 0, mat = "std") { w.box(x, y, z, sx, 0.04, sz, color, { ry, col: false, ao: false, mat }); }
