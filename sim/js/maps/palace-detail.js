// 단풍 고궁 디테일 보강: 단청 무늬·공포·서까래·잡상, 박석 마당, 성벽 얼룩과 담쟁이, 길 바퀴 자국, 성 밖 억새·코스모스,
// 마을 마당 살림(고추 멍석·빨랫줄·장작·굴뚝), 연등, 물레방아, 원앙, 굴뚝 연기, 의장기
// 모두 장식이다. 비행 훈련 구역(x -35..5, z -5..45)에는 바닥 무늬만 놓는다
import { C, Fr, roof, roofH, GAB, lanternLine, folk, ball, ball0, far0, sm, G, TRS, THREE } from "./palace-kit.js";
import { Geo, fleet, aim, litMat } from "./city-kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _t = {}, once = (k, fn) => _t[k] || (_t[k] = fn());
// 바닥에 눕힌 판(2 삼각형)과 세운 판(+z 를 본다)
const FQ = () => once("fq", () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.computeBoundingBox(); return g; });
const WQ = () => once("wq", () => { const g = new THREE.PlaneGeometry(1, 1); g.computeBoundingBox(); return g; });
const dec = (w, x, z, sx, sz, color, y = 0.1, ry = 0, mat = "std") => w.mesh(FQ(), TRS(x, y, z, ry, sx, 1, sz), color, mat);
const put = (f, geo, lx, ly, lz, ry, sx, sy, sz, color, mat = "std", rx = 0, rz = 0) => f.w.mesh(geo, TRS(f.X(lx, lz), f.y + ly, f.Z(lx, lz), f.ry + ry, sx, sy, sz, rx, rz), color, mat);
const NB = { col: false, ao: false };

// ── 단청: 창방 띠의 머리초·꽃 무늬, 큰 전각의 공포·서까래 마구리·잡상, 현판 글자 ──
const MOT = [C.redD, C.wht, C.blue];
function dancheong(w) {
  for (const h of w.pHalls || []) {
    const { f, W, D, nx, nz, over, top, rh, open, o } = h;
    if (o.lod || o.band || o.roof === false) continue;                       // 민가·모정은 단청이 없다
    const a = W / 2 + over, b = D / 2 + over, type = o.type || "hipgable", L = o.lift ?? Math.min(a, b) * 0.16 + 0.25;
    const rich = W >= 20 && (o.sign || open) || W * D >= 300;
    for (const [r, len, hd, n, ea, eb] of [[0, W, D / 2, nx, a, b], [180, W, D / 2, nx, a, b], [90, D, W / 2, nz, b, a], [-90, D, W / 2, nz, b, a]]) {
      const s = f.sub(0, 0, 0, r), zf = hd + 0.36, yb = top - 0.3, bw = len / n;
      for (let i = 0; i <= n; i++) {
        const lx = -len / 2 + i * bw;
        for (const sd of [-1, 1]) {
          if (i === 0 && sd < 0 || i === n && sd > 0) continue;
          for (let k = 0; k < 3; k++) put(s, WQ(), lx + sd * (0.5 + k * 0.2), yb, zf, 0, 0.13, 0.52, 1, MOT[k]);
        }
        if (rich) {
          // 공포: 기둥 머리에서 처마 쪽으로 두 단 내민 받침
          put(s, G.box(), lx, top - 0.52, hd + 0.6, 0, 0.4, 0.22, 0.6, C.redD);
          put(s, G.box(), lx, top - 0.3, hd + 0.8, 0, 0.46, 0.22, 1.0, C.blue);
          put(s, WQ(), lx, top - 0.3, hd + 1.31, 0, 0.36, 0.16, 1, C.wht);
        }
      }
      for (let i = 0; i < n; i++) {
        const lx = -len / 2 + (i + 0.5) * bw;
        put(s, WQ(), lx, yb, zf, 0, 0.3, 0.3, 1, C.pink, "std", 0, 45);
        if (bw > 3.2) for (const sd of [-1, 1]) put(s, WQ(), lx + sd * bw * 0.2, yb, zf, 0, 0.18, 0.18, 1, C.yel, "std", 0, 45);
      }
      // 서까래 마구리: 처마 끝을 따라 늘어선 옥색 각재(추녀 쪽으로 갈수록 들린다)
      if (rich && !(type === "gable" && r % 180)) {
        const m = Math.round((2 * (ea - 0.5)) / 1.3), zz = eb - 0.38;
        for (let i = 0; i <= m; i++) {
          const lx = -(ea - 0.5) + (i / m) * 2 * (ea - 0.5), hy = r % 180 ? roofH(a, b, rh, type, L, zz, lx) : roofH(a, b, rh, type, L, lx, zz);
          put(s, G.box(), lx, top + hy - 0.54, zz, 0, 0.2, 0.18, 0.62, 0xd4e8da);
        }
      }
    }
    // 잡상: 추녀마루 끝에 늘어선 작은 상
    if (rich && type !== "gable") {
      const mx = type === "hip" ? a - b * 0.4 : a - GAB * b * 0.45, mz = type === "hip" ? b * 0.6 : b - GAB * b * 0.45, y0 = roofH(a, b, rh, type, L, mx, mz) + 0.12;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let k = 0; k < 4; k++) {
        const t = 0.28 + k * 0.2;
        put(f, G.box(), sx * (mx + (a * 0.985 - mx) * t), top + y0 + (L + 0.14 - y0) * t + 0.42, sz * (mz + (b * 0.985 - mz) * t), 0, 0.2, 0.42 - k * 0.04, 0.2, C.tileD);
      }
    }
    // 현판 글자(세 자)
    if (o.sign) {
      const sw = Math.min(3.6, W * 0.25), gs = Math.min(0.62, sw * 0.24);
      for (let k = -1; k <= 1; k++) { put(f, WQ(), k * sw * 0.3, top + 0.275, D / 2 + 0.635, 0, gs, gs, 1, 0x1f2430); put(f, WQ(), k * sw * 0.3 + gs * 0.08, top + 0.25, D / 2 + 0.67, 0, gs * 0.42, gs * 0.42, 1, C.yel); }
    }
  }
  // 회랑: 마당 쪽 띠의 기둥 머리마다 머리초
  for (const c of w.pCorr || []) for (const sd of [-1, 1]) {
    if (sd === c.side) continue;
    const g = sd > 0 ? c.f : c.f.sub(0, 0, 0, 180), yb = c.plat + c.hc - 0.28;
    for (let i = 0; i <= c.n; i++) for (const e of [-1, 1]) {
      if (i === 0 && e < 0 || i === c.n && e > 0) continue;
      const lx = -c.len / 2 + (i / c.n) * c.len;
      for (let k = 0; k < 3; k++) put(g, WQ(), lx + e * (0.45 + k * 0.2), yb, c.wd / 2 + 0.33, 0, 0.13, 0.44, 1, MOT[k]);
    }
  }
}

// ── 박석: 칸마다 하나씩 놓은 넓적한 돌(서로 겹치지 않는다) ──
function slabs(w, x0, x1, z0, z1, skip, pal, fill = 0.9, y = 0.1) {
  const r = w.rand, cx = 4.2, cz = 3.7;
  for (let x = x0; x + cx <= x1 + 0.01; x += cx) for (let z = z0; z + cz <= z1 + 0.01; z += cz) {
    const sx = 2.6 + r() * 1.5, sz = 2.2 + r() * 1.4, px = x + sx / 2 + r() * (cx - sx), pz = z + sz / 2 + r() * (cz - sz), k = r();
    if (k > fill || skip && skip(px, pz, sx / 2 + 0.3, sz / 2 + 0.3)) continue;
    dec(w, px, pz, sx, sz, pal[(k * 97) % pal.length | 0], y, 0, "std:concrete");
  }
}

function courtFloor(w) {
  const pal = [0xdccb9f, 0xe9d9b2, 0xd3c298, 0xe3d3a8, 0xcfbf96, 0xe0cfa4];
  // 조정 마당(어도와 동문 길, 월대는 비운다)
  slabs(w, -50, 50, -55, 62, (x, z, hx, hz) => Math.abs(x) < 4.6 + hx || x > 0 && Math.abs(z - 40) < 4.4 + hz || z < -6.6 + hz && Math.abs(x) < 35.5 + hx, pal);
  slabs(w, -50, 50, -74, -59.5, (x, z, hx) => Math.abs(x) < 2.6 + hx, [0xcdbd98, 0xe0d0ac, 0xc6b690], 0.6);
  // 어도 줄눈과 가장자리 장대석
  for (const [z0, z1] of [[-8, 60.6], [71.4, 80], [96, 104]]) {
    for (const s of [-1, 1]) dec(w, s * 4.32, (z0 + z1) / 2, 0.26, z1 - z0, C.stoneD, 0.112);
    for (let z = z0 + 2.8; z < z1 - 1; z += 5.6) dec(w, 0, z, 8.4, 0.1, 0xa59f90, 0.155);
  }
  for (let x = 9.8; x < 122; x += 5.6) if (Math.abs(x - 55) > 9) dec(w, x, 40, 0.1, 8, 0xa59f90, 0.13);
  // 정전 앞 계단의 답도(가운데 비스듬한 판석)
  w.box(0, 1.47, -9.52, 2.4, 0.14, 5.8, 0xe9e2cf, { rx: 31.2, ...NB });
  for (const s of [-1, 1]) w.box(s * 1.3, 1.5, -9.52, 0.2, 0.14, 5.8, C.stoneD, { rx: 31.2, ...NB });
  // 편종(동쪽)과 건고(서쪽 큰북): 조회 때 쓰는 악기
  { const f = new Fr(w, 23, 0.07, -2.5);
    for (const s of [-1, 1]) { f.box(s * 2.0, 0, 0, 0.5, 0.35, 1.0, C.stoneL, NB); f.box(s * 2.0, 0.35, 0, 0.2, 2.5, 0.2, C.red, NB); }
    for (const y of [1.55, 2.55]) f.box(0, y, 0, 4.5, 0.14, 0.16, C.red, NB);
    f.box(0, 2.85, 0, 4.9, 0.12, 0.22, C.yel, { ...NB, mat: "paint" });
    for (let i = 0; i < 8; i++) for (const y of [1.0, 2.0]) f.mesh(G.cone(6, 0.62), -1.6 + i * 0.46, y + 0.25, 0, 0, 0.17, 0.5, 0.17, C.bronze, "metal");
  }
  { const f = new Fr(w, -41, 0.07, -2.5);
    f.box(0, 0, 0, 2.2, 0.3, 0.5, C.red, NB); f.box(0, 0, 0, 0.5, 0.3, 2.2, C.red, NB); f.box(0, 0.3, 0, 0.26, 3.5, 0.26, C.red, NB);
    put(f, G.cyl(12), 0, 2.3, 0, 0, 0.95, 1.1, 0.95, C.red, "paint", 90); put(f, G.cyl(12), 0, 2.3, 0.56, 0, 0.86, 0.04, 0.86, C.wht, "std", 90); put(f, G.cyl(12), 0, 2.3, -0.56, 0, 0.86, 0.04, 0.86, C.wht, "std", 90);
    f.box(0, 3.8, 0, 2.0, 0.14, 2.0, C.yel, { ...NB, mat: "paint" }); f.mesh(G.pyr(0.2), 0, 4.25, 0, 0, 1.5, 0.6, 1.5, C.redD);
  }
  // 품계석 옆에 늘어선 관원들(동쪽 반열)
  for (let z = 17; z <= 33; z += 4) for (const [x, c] of [[11.2, C.red], [13.4, C.blue]]) folk(w, x, 0.1, z, c);
}

// ── 성벽 바깥 면: 장대석 띠, 물 자국, 이끼, 담쟁이 ──
function wallsDetail(w) {
  const r = w.rand, F = [[-125, 112, -19, 112, 0], [19, 112, 125, 112, 0], [-125, -122, -8, -122, 180], [8, -122, 96.5, -122, 180], [103.5, -122, 125, -122, 180],
    [127, -120, 127, 31, 90], [127, 49, 127, 84.5, 90], [127, 91.5, 127, 110, 90], [-127, -120, -127, -49, -90], [-127, -31, -127, 110, -90]];
  const vine = [0xc8362a, 0xd9562a, 0xb82a30, 0xe07a2a, 0x9a2a34];
  for (const [ax, az, bx, bz, ry] of F) {
    const len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, f = new Fr(w, mx, 0, mz, ry);   // 지역 +z 가 바깥
    f.box(0, 0, 0, len, 1.0, 0.36, C.stoneD, { col: false, mat: "std:concrete", tile: 2.2 });
    for (let i = 0, n = Math.round(len / 6); i < n; i++) {
      const lx = -len / 2 + 1.5 + r() * (len - 3), k = r();
      if (k < 0.5) put(f, WQ(), lx, 5.3 - r() * 0.6, 0.05, 0, 0.35 + r() * 0.5, 1.6 + r() * 1.6, 1, 0x8f897c);          // 물 자국
      else put(f, WQ(), lx, 1.3 + r() * 0.5, 0.05, 0, 1.6 + r() * 2.6, 0.5 + r() * 0.7, 1, k < 0.8 ? 0x8f9a62 : 0x9aa070);   // 이끼
    }
    for (let lx = -len / 2 + 6 + r() * 10; lx < len / 2 - 4; lx += 17 + r() * 16) {
      const n = 8 + ((r() * 5) | 0);
      for (let i = 0; i < n; i++) { const s = 0.45 + r() * 0.5, t = r(); put(f, WQ(), lx + (r() - 0.5) * (1.2 + t * 2.6), 6.3 - t * 3.2, 0.07, 0, s, s, 1, vine[(r() * 5) | 0], "std", 0, r() * 90); }
    }
  }
}

// ── 길: 바퀴 자국, 가장자리 돌, 흩어진 낙엽 ──
function roadsDetail(w) {
  const r = w.rand, rut = 0xb1976a, edge = 0xd9ccae;
  const X = (z, x0, x1, hw, e = true) => { for (const s of [-1, 1]) { dec(w, (x0 + x1) / 2, z + s * 1.15, x1 - x0, 0.42, rut, 0.092); if (e) dec(w, (x0 + x1) / 2, z + s * (hw - 0.25), x1 - x0, 0.36, edge, 0.092); } };
  const Z = (x, z0, z1, hw) => { for (const s of [-1, 1]) { dec(w, x + s * 1.15, (z0 + z1) / 2, 0.42, z1 - z0, rut, 0.092); dec(w, x + s * (hw - 0.25), (z0 + z1) / 2, 0.36, z1 - z0, edge, 0.092); } };
  X(129, -232, 232, 5); X(-131, -146, 146, 3.5); Z(-142, -127.5, 124, 4); Z(142, -127.5, 124, 4);
  X(180, -217, 222, 4, false);
  for (const s of [-1, 1]) dec(w, 2.5, 180 + s * 3.8, 439, 0.34, C.stoneD, 0.092);      // 큰길 돌 도랑
  const leaf = [0xd8402a, 0xe8792a, 0xf2c822, 0xc9302a, 0xe9b81a];
  for (let i = 0; i < 260; i++) {
    const k = i % 5, t = r(), s = 0.3 + r() * 0.5;
    const [x, z] = k === 0 ? [-225 + t * 450, 124.6 + r() * 8.8] : k === 1 ? [-144 + t * 288, -134 + r() * 6] : k === 2 ? [-145.4 + r() * 6.8, -125 + t * 246] : k === 3 ? [138.6 + r() * 6.8, -125 + t * 246] : [-212 + t * 430, 176.6 + r() * 6.8];
    dec(w, x, z, s, s * (0.6 + r() * 0.4), leaf[(r() * 5) | 0], 0.105, r() * 180);
  }
}

// ── 진영 터: 활터 마당과 큰북 마당(다진 흙 마당에 고리 금과 얼룩) ──
function ringG(r0, r1) { const g = new THREE.RingGeometry(r0, r1, 40); g.rotateX(-Math.PI / 2); return g; }
function yardDisc(w, x, z, R, color, line) {
  const r = w.rand, g = new THREE.CircleGeometry(R, 36); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 7, P.getZ(i) / 7);      // 흙 무늬를 7m 간격으로 깐다
  w.mesh(g, TRS(x, 0.05, z), color, "std:dirt");
  w.mesh(ringG(R - 0.1, R + 0.9), TRS(x, 0.035, z), line, "std");
  for (const rr of [R - 6.5, R * 0.42]) w.mesh(ringG(rr - 0.14, rr + 0.14), TRS(x, 0.085, z), line, "std");
  // 발자국에 닳은 얼룩
  for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = 2 + r() * (R - 6), s = 2.2 + r() * 3.2; dec(w, x + Math.cos(a) * d, z + Math.sin(a) * d, s, s * (0.5 + r() * 0.4), i % 2 ? 0xcbb98c : 0xe6d8b0, 0.07 + (i % 4) * 0.004, r() * 180, "std:dirt"); }
}
function bases(w) {
  yardDisc(w, -185, 10, 26.8, 0xd6c79c, 0xa89a78);
  for (const z of [-14, 10, 34]) { dec(w, -207, z, 31, 1.2, 0xf0e7ce, 0.1); for (const s of [-1, 1]) dec(w, -207, z + s * 0.75, 31, 0.16, 0xa89a78, 0.1); dec(w, -191.8, z, 0.4, 3.4, C.red, 0.13); }
  for (const z of [-14, 34]) { folk(w, -191, 0.08, z - 0.7, C.wht); folk(w, -190.6, 0.08, z + 0.8, 0x8fb0d8); }
  // 화살 꽂이와 과녁 뒤 흙 둔덕
  for (const z of [-14, 10, 34]) { w.mesh(ball0(), TRS(-228.6, 0.5, z, 0, 2.0, 1.5, 4.2), 0xb99a62, "std"); w.box(-190.2, 0, z + 2.2, 0.5, 0.9, 0.5, C.wood, NB); for (let k = 0; k < 3; k++) w.mesh(G.box(), TRS(-190.2 + (k - 1) * 0.12, 1.2, z + 2.2, 0, 0.03, 0.9, 0.03, (k - 1) * 8), 0xe9dfc6, "std"); }
  yardDisc(w, 185, 10, 26.8, 0xdacb9e, 0xb9694a);
  w.mesh(ringG(4.6, 5.6), TRS(185, 0.1, 10), 0xc9573f, "std");
  for (let k = 0; k < 8; k++) { const a = k * 0.785 + 0.39; dec(w, 185 + Math.cos(a) * 14.4, 10 + Math.sin(a) * 14.4, 0.4, 6, k % 2 ? 0xc9573f : 0x4a6fae, 0.1, 90 - a * 57.296); }
}

// ── 성 밖 풀밭: 억새, 코스모스, 갈대 ──
function grass(w, x, z, s = 1, pal = [0xf0e6c8, 0xd8c690], y0) {
  const r = w.rand, y = (y0 ?? w.h(x, z)) - 0.05;
  for (let i = 0; i < 4; i++) {
    const h = (1.4 + r() * 0.9) * s;
    w.mesh(G.cone(4, 0), TRS(x + (r() - 0.5) * 0.8 * s, y + h / 2, z + (r() - 0.5) * 0.8 * s, r() * 360, 0.22 * s, h, 0.22 * s, (r() - 0.5) * 24, (r() - 0.5) * 24), pal[i % pal.length], "foliage");
  }
}
const FLW = [0xf07aa8, 0xfff2f4, 0xd9479a, 0xf5a0c0];
function cosmos(w, x, z) {
  const r = w.rand, y = w.h(x, z);
  w.mesh(ball0(), TRS(x, y + 0.12, z, r() * 360, 1.35, 0.3, 1.0), 0x7d9644, "foliage");
  for (let i = 0; i < 4; i++) w.mesh(ball0(), TRS(x + (r() - 0.5) * 1.9, y + 0.42 + r() * 0.16, z + (r() - 0.5) * 1.3, 0, 0.21, 0.14, 0.21), FLW[(r() * 4) | 0], "foliage");
}
function meadow(w) {
  const r = w.rand;
  // 남쪽 큰길과 마을 담 사이: 코스모스 길
  for (let x = -214; x <= 148; x += 7.5) {
    if (Math.abs(x) < 40 || [-181.5, -145.5, -109.5, -73.5, 73.5, 109.5].some((a) => Math.abs(x - a) < 4.5)) continue;
    cosmos(w, x + r() * 3, 136.6 + r() * 3.4);
  }
  // 성벽 아래(동·서)
  for (let z = -108; z <= 100; z += 15) for (const s of [-1, 1]) if (Math.abs(z - s * 40) > 13 && Math.abs(z - 88) > 9) cosmos(w, s * (129.6 + r()), z + 5 + r() * 3);
  // 순환로 바깥 숲 가장자리와 북쪽 산자락: 억새
  for (let z = -118; z <= 116; z += 9.5) for (const s of [-1, 1]) { if (s > 0 && Math.abs(z - 88) < 10) continue; grass(w, s * (148.6 + r() * 2.5), z + r() * 5, 0.9 + r() * 0.4); }
  for (let x = -138; x <= 138; x += 9) if (Math.abs(x) > 7) grass(w, x + r() * 4, -136.4 - r() * 1.6, 0.9 + r() * 0.4);
  // 뒷산 능선(나무를 비워 둔 띠): 억새밭
  for (let x = -62; x <= 84; x += 5.2) { const px = x + r() * 3, pz = -205 + (r() < 0.5 ? -1 : 1) * (3.2 + r() * 2.6); if (Math.hypot(px - 10, pz + 205) > 13 && Math.abs(px + 28) > 4.5 && Math.abs(px - 48) > 4.5) grass(w, px, pz, 1.0 + r() * 0.5); }
  // 동쪽 냇가: 갈대와 억새, 바위
  for (let x = 152; x <= 242; x += 5.5) {
    if (Math.abs(x - 176) < 5 || Math.abs(x - 205) < 7) continue;
    const zc = x < 190 ? 89 + ((x - 150) / 40) * 11 : 100 + ((x - 190) / 56) * 6, s = r() < 0.5 ? -1 : 1;
    grass(w, x + r() * 2, zc + s * (5.2 + r() * 1.6), 1.0 + r() * 0.4, r() < 0.5 ? [0x9aa24e, 0xc9b468] : undefined);
  }
  for (const [x, z] of [[160, 86], [184, 104], [214, 97], [232, 110], [196, 95]]) w.rock(x, z, 0.8 + r() * 0.7);
  // 성벽과 순환로 사이, 숲 바닥의 떨기나무(단풍 든 것과 푸른 것)와 풀포기
  const bush = [0xc8402a, 0xe0862a, 0x7d9644, 0xd9b02a, 0x93a04a, 0xb8332c], col = new THREE.Color();
  const open = (x, z) => Math.hypot(Math.abs(x) - 185, z - 10) > 31 && Math.hypot(Math.abs(x) - 186, z + 44) > 11 && Math.hypot(x - 186, z - 62) > 12 && !(x > 147 && Math.abs(z - (88 + (x - 150) * 0.2)) < 9) && !(Math.abs(Math.abs(x) - 142) < 5.5) && Math.hypot(x - 205, z - 92) > 8 && !(x < -188 && [-14, 10, 34].some((q) => Math.abs(z - q) < 2.6));
  for (let i = 0; i < 230; i++) {
    const s = r() < 0.5 ? -1 : 1, k = r(), x = s * (k < 0.3 ? 128.6 + r() * 7 : 148 + r() * 80), z = -118 + r() * 232, q = 0.55 + r() * 0.6;
    if (!open(x, z) || Math.abs(x) < 138 && (Math.abs(z - s * 40) < 12 || Math.abs(z - 88) < 9)) continue;
    if (i % 3) w.mesh(ball0(), TRS(x, 0.3 * q, z, r() * 360, q * 1.1, q * 0.7, q), col.set(bush[(r() * 6) | 0]).offsetHSL(0, 0, (r() - 0.5) * 0.06).getHex(), "foliage");
    else for (let j = 0; j < 3; j++) w.mesh(G.cone(4, 0), TRS(x + (j - 1) * 0.3, 0.3, z + (r() - 0.5) * 0.4, r() * 360, 0.14, 0.7 + r() * 0.3, 0.14, (r() - 0.5) * 30, (r() - 0.5) * 30), j % 2 ? 0x8a9a44 : 0xb9a84e, "foliage");
  }
}

// ── 원경: 먼 산을 더 빽빽하게 덮는 단풍 덩어리(20면, 충돌 없음) ──
function farWoods(w) {
  const r = w.rand, col = new THREE.Color();
  for (let i = 0; i < 640; i++) {
    const x = -478 + r() * 956, z = -478 + r() * 956, k = r(), s = 6 + r() * 6;
    if (Math.max(Math.abs(x), Math.abs(z)) < 336) continue;
    col.setHSL(k < 0.42 ? 0.01 + r() * 0.03 : k < 0.74 ? 0.07 + r() * 0.03 : k < 0.93 ? 0.12 + r() * 0.02 : 0.29, 0.7, 0.35 + r() * 0.12);
    w.mesh(far0(), TRS(x, w.h(x, z) + s * 0.4, z, r() * 360, s, s * 0.85, s), col.getHex(), "foliage");
  }
}

// ── 한옥 마을: 집집마다 굴뚝·고추 멍석·장작·빨랫줄·닭, 길가 짐, 장터 좌판 ──
const MAIN = { A: [1, -9.5, 18, 6.4], B: [0, -10, 17, 6.4], C: [0, -10.5, 20, 6], D: [-4, -9.5, 13, 5.6] };
const MAT = { A: [5.5, 1.3], B: [-1, -1.5], C: [-3.4, 4.2], D: [0.5, 1.5] };
const CLOTH = [C.wht, 0xbfd4ea, C.wht, 0xf0c4c0, 0xe9e2cf];
function hen(w, x, z, ry, color) {
  w.mesh(ball0(), TRS(x, 0.3, z, ry, 0.2, 0.2, 0.3), color, "std");
  w.mesh(G.box(), TRS(x - Math.sin(ry * 0.01745) * 0.24, 0.52, z - Math.cos(ry * 0.01745) * 0.24, ry, 0.12, 0.2, 0.12), color, "std");
  w.mesh(G.box(), TRS(x - Math.sin(ry * 0.01745) * 0.26, 0.65, z - Math.cos(ry * 0.01745) * 0.26, ry, 0.04, 0.09, 0.12), 0xd8302a, "std");
}
function line(w, f, ax, bx, lz, n) {
  for (const x of [ax, bx]) f.mesh(G.cyl(6), x, 1.15, lz, 0, 0.05, 2.3, 0.05, C.woodD);
  f.box((ax + bx) / 2, 2.2, lz, bx - ax, 0.04, 0.04, 0x3a2c22, NB);
  for (let k = 0; k < n; k++) { const hh = 0.8 + w.rand() * 0.6; f.box(ax + 0.7 + k * ((bx - ax - 1.4) / Math.max(1, n - 1)), 2.2 - hh, lz, 0.85, hh, 0.04, CLOTH[(k + n) % 5], NB); }
}
function villageDetail(w, smokeAt) {
  const r = w.rand;
  (w.pLots || []).forEach((L, i) => {
    const { f, type, gx } = L, sg = gx > 0 ? 1 : -1, [mx, mz, ml, md] = MAIN[type];
    // 굴뚝(집 뒤에 따로 선다)
    const cx = mx + ml / 2 - 1.6, cz = mz - md / 2 - 1.9;
    f.box(cx, 0, cz, 0.7, 3.9, 0.7, 0xb9805a, { col: false, mat: "std:brick", tile: 1.5 }); f.box(cx, 3.9, cz, 1.0, 0.16, 1.0, C.tileD, NB); f.box(cx, 4.06, cz, 0.42, 0.3, 0.42, 0x3a3028, NB);
    w.col.addCapsule(f.pt(cx, 0.4, cz), f.pt(cx, 3.9, cz), 0.4);
    if (i % 3 === 0) smokeAt.push([f.X(cx, cz), 4.5, f.Z(cx, cz), 0.8]);
    // 멍석에 널어 말리는 고추·곡식
    const [px, pz] = MAT[type], crop = [0xc9281c, 0xc9281c, 0xe8b830][i % 3];
    put(f, FQ(), px, 0.085, pz, 0, 2.7, 1, 1.9, 0xd9c48c); put(f, FQ(), px, 0.115, pz, 0, 2.2, 1, 1.4, crop);
    // 장작더미(대문 반대쪽 앞담 아래)
    f.box(-sg * 12.2, 0, 15.3, 3.4, 1.0, 0.9, 0x86643f, { col: false, mat: "std:wood", tile: 0.8 }); f.box(-sg * 12.2, 1.0, 15.3, 2.6, 0.4, 0.85, 0x9a7650, { col: false, ao: false, mat: "std:wood", tile: 0.8 });
    if (type !== "C") line(w, f, -2.6, 3.0, 9.4, 4);
    for (let k = 0; k < 3; k++) hen(w, f.X(-sg * 6 + (r() - 0.5) * 4, 12.6 + r() * 2), f.Z(-sg * 6 + (r() - 0.5) * 4, 12.6 + r() * 2), r() * 360, k ? 0xf2ece0 : 0x9a6a3a);
    // 초가지붕 위 호박
    if (type === "D") for (const [dx, dz] of [[-6.6, 1.3], [-3.2, 1.6], [-0.8, 1.2]]) { put(f, ball0(), dx, 4.62 - (dz - 1.3) * 0.4, mz + dz, 0, 0.44, 0.3, 0.44, 0xe8862a); put(f, G.box(), dx, 4.95 - (dz - 1.3) * 0.4, mz + dz, 0, 0.08, 0.14, 0.08, 0x5a7a3a); }
  });
  // 큰길 가 짐(자루·궤짝·감 바구니). 게이트 자리는 비운다
  [-199.5, -163.5, -127.5, -91.5, -55.5, 55.5, 91.5, 127.5].forEach((x0, i) => {
    const x = x0 + (i % 2 ? -12.5 : 12.5), z = i % 2 ? 176.75 : 183.25;
    if ([-190, -154, -118, -78].some((a) => Math.abs(x - a) < 5.5)) return;
    w.mesh(ball0(), TRS(x, 0.38, z, 20, 0.46, 0.42, 0.4), 0xd8c8a0, "std"); w.mesh(ball0(), TRS(x + 0.75, 0.32, z + 0.1, 70, 0.4, 0.36, 0.36), 0xcbb88c, "std");
    w.box(x - 0.95, 0.06, z, 0.75, 0.6, 0.6, C.wood, { col: false, mat: "std:wood", tile: 1 });
    w.mesh(G.cyl(8), TRS(x + 1.7, 0.24, z, 0, 0.42, 0.36, 0.42), 0xb08a4a, "std");
    for (let k = 0; k < 3; k++) w.mesh(ball0(), TRS(x + 1.55 + k * 0.16, 0.48, z + (k - 1) * 0.14, 0, 0.15, 0.14, 0.15), 0xff7a1a, "paint");
  });
  // 장터 바닥 좌판(멍석 위 물건)과 구경꾼
  for (let k = 0; k < 6; k++) {
    const x = 185 + (k % 2 ? 5.3 : -5.3), z = 151.2 + (k % 3) * 8.4 + (k > 2 ? 43 : 0);
    dec(w, x, z, 1.7, 2.6, 0xd9c48c, 0.095);
    for (let j = 0; j < 4; j++) w.mesh(ball0(), TRS(x + (j % 2 ? 0.35 : -0.35), 0.3, z - 0.7 + (j >> 1) * 1.3, 0, 0.3, 0.24, 0.3), [0xff7a1a, 0x7a9a3a, 0xd9402a, 0xe9c02a][(j + k) % 4], "paint");
  }
  smokeAt.push([203.5, 1.0, 150, 0.7]);
}

// ── 궁 안 살림: 침전 마당, 생활 구역, 탑마당, 숨은뜰, 연못, 뒷산 ──
function innerYards(w, smokeAt) {
  const r = w.rand;
  // 침전 앞: 괴석 한 쌍, 해시계, 국화 화분, 궁인들
  for (const s of [-1, 1]) { w.box(s * 16, 0.07, -68, 1.2, 0.7, 1.2, C.stoneL, NB); w.blob(s * 16, 1.55, -68, 0.6, 1.0, 0.5, 0x8f8a80, { mat: "std:rock", col: false, grad: [0.7, 1.08] }); }
  w.box(10, 0.07, -66, 0.8, 0.9, 0.8, C.stone, NB); w.mesh(ball0(), TRS(10, 1.05, -66, 0, 0.55, 0.2, 0.55), C.bronze, "metal"); w.mesh(G.box(), TRS(10, 1.25, -66, 0, 0.04, 0.4, 0.04, 30), 0x2a2622, "std");
  const mum = [0xf2c822, 0xb060c0, C.wht, 0xe8792a];
  const pot = (x, y, z, k) => { w.mesh(G.cone(6, 1.3), TRS(x, y + 0.2, z, 0, 0.24, 0.4, 0.24), 0x8a5a3a, "std"); w.mesh(ball0(), TRS(x, y + 0.6, z, 0, 0.36, 0.3, 0.36), mum[k % 4], "foliage"); };
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) pot(s * (4.4 + k * 1.1), 0.07, -73.6, k + (s > 0 ? 1 : 0));
  folk(w, -6, 0.1, -71, C.pink, 0); folk(w, -4.7, 0.1, -71.7, 0x9ac28a, 0); folk(w, 7, 0.1, -70, 0xb9a0d8, 0); folk(w, 31, 0.1, -66, C.wht);
  w.mesh(G.box(), TRS(31.5, 0.85, -66.3, 0, 0.05, 1.6, 0.05, 18), C.woodD, "std"); w.mesh(G.cone(4, 0.3), TRS(31.76, 0.16, -66.3, 0, 0.22, 0.3, 0.1), C.thatch, "std");   // 비질하는 사람
  // 생활 구역: 우물, 빨랫줄, 장작, 부엌 굴뚝, 장독대의 사람들
  { const x = -73, z = -74, f = new Fr(w, x, 0, z);
    w.mesh(G.cyl(10), TRS(x, 0.5, z, 0, 1.4, 1.0, 1.4), C.stone, "std"); w.mesh(G.cyl(10), TRS(x, 0.98, z, 0, 1.05, 0.06, 1.05), 0x2a4a5a, "std"); w.col.addBox(V(x, 0.5, z), V(1.2, 0.5, 1.2), null);
    for (const s of [-1, 1]) f.post(s * 1.9, 0, 0, 0.15, 3.1, C.woodD, { base: false });
    f.roof(0, 3.1, 0, 2.9, 1.5, 1.1, { type: "gable", lod: true, under: C.wood, fascia: C.tileD });
    w.mesh(G.cone(6, 1.2), TRS(x + 1.9, 0.3, z + 1.3, 0, 0.26, 0.5, 0.26), C.wood, "std"); }
  line(w, new Fr(w, -82.5, 0.07, -92), -3.6, 3.6, 0, 5);
  w.box(-112, 0.07, -49.4, 5.4, 1.1, 0.9, 0x86643f, { col: false, mat: "std:wood", tile: 0.8 }); w.box(-112, 1.17, -49.4, 4.4, 0.4, 0.85, 0x9a7650, { col: false, ao: false, mat: "std:wood", tile: 0.8 });
  w.box(-111.8, 0, -101, 0.9, 4.8, 0.9, 0xc77a56, { col: false, mat: "std:brick", tile: 1.5 }); w.mesh(G.pyr(0.25), TRS(-111.8, 5.1, -101, 0, 1.5, 0.6, 1.5), C.tile, "std");
  w.col.addCapsule(V(-111.8, 0.5, -101), V(-111.8, 4.6, -101), 0.5);
  smokeAt.push([-111.8, 5.5, -101, 0.9], [9, 5.4, -97, 0.8]);
  folk(w, -69, 0.6, -80.2, C.wht, 0); folk(w, -72.4, 0.07, -78.2, 0x9ac28a, 0); folk(w, -80, 0.07, -90.6, C.pink, 0); folk(w, -96, 0.07, -30, 0x8fb0d8);
  for (let k = 0; k < 3; k++) hen(w, -104 + r() * 5, -90 + r() * 4, r() * 360, k ? 0xf2ece0 : 0x9a6a3a);
  // 탑마당: 탑에서 뻗은 연등 줄, 향로, 디딤돌, 소원 돌탑
  const lot = [0xff7aa8, 0xffd84a, 0x6fe08a, 0xff5a48, 0x5aa0ff];
  for (const [x, z] of [[95, 57], [95, 73], [104, 76.5]]) {
    w.mesh(G.cyl(6), TRS(x, 2.6, z, 0, 0.08, 5.2, 0.08), 0x5a4030, "std");
    lanternLine(w, [104 + (x - 104) * 0.14, 9.6, 65 + (z - 65) * 0.14], [x, 5.2, z], 7, 0.5, { colors: lot });
  }
  w.cyl(104, 0.07, 59.4, 0.5, 0.85, C.bronze, { mat: "metal", rt: 0.7, col: false }); smokeAt.push([104, 1.1, 59.4, 0.4]);
  for (let k = 0; k < 7; k++) dec(w, 92 + (k > 3 ? (k - 3) * 2.6 : (k % 2) * 0.5), 52.5 + Math.min(k, 3) * 2.6 + (k > 3 ? 0.9 * (k - 3) : 0), 1.7, 1.2, C.stoneL, 0.1, k * 13, "std:concrete");
  for (const [x, z, s] of [[118.5, 66.5, 0.5], [120, 63.6, 0.38], [117.6, 54, 0.45], [119.6, 56.4, 0.3]]) w.mesh(G.cone(7, 0.12), TRS(x, 0.07 + 1.3 * s, z, 0, 1.2 * s, 2.6 * s, 1.2 * s), C.stoneD, "std");
  // 숨은뜰: 단풍 터널 길가의 국화 화분, 못가 갈대
  for (let z = -23, k = 0; z <= 14; z += 4.8, k++) for (const s of [-1, 1]) pot(71.6 + s * 3.0 + Math.sin(z) * 0.5, 0, z + (s > 0 ? 1.2 : 0), k + (s > 0 ? 2 : 0));
  for (let k = 0; k < 9; k++) { const a = k * 0.7 + 0.3, x = 92 + Math.cos(a) * 12.4, z = -42 + Math.sin(a) * 12.4; if (Math.abs(x - 92) > 6.5 || Math.abs(z + 32) > 6.5) grass(w, x, z, 0.8, [0x8a9a4a, 0xb9a45c]); }
  // 달못: 모서리 갈대
  for (const [x, z] of [[-112.4, 8.2], [-110.6, 7.6], [-67.6, 8.4], [-112.6, 67.8], [-67.8, 67.6], [-69.6, 68.4], [-112.2, 40], [-67.6, 44]]) grass(w, x, z, 0.9, [0x8a9a4a, 0xb9a45c, 0x7a8a40], -1.1);
  // 뒷산 돌계단 옆 돌탑
  for (const [z, s, k] of [[-156, 1, 0.5], [-171, -1, 0.42], [-186, 1, 0.55], [-196, -1, 0.4]]) {
    const x = 10 * Math.min(1, (-140 - z) / 65) + Math.sin((-140 - z) * 0.11) * 7 * Math.min(1, (-140 - z) / 12) * Math.max(0, Math.min(1, (z + 205) / 12)) + s * 3.6;
    w.mesh(G.cone(7, 0.12), TRS(x, w.h(x, z) + 1.25 * k, z, 0, 1.2 * k, 2.7 * k, 1.2 * k), C.stoneD, "std");
  }
  smokeAt.push([-150, w.h(-150, -185) + 6.4, -185, 1.5, 0xe9e4da]);
}

// ── 동쪽 냇가의 물레방아와 섶다리 ──
function mill(w) {
  const x = 205, z = 101;
  w.box(x, -0.4, z - 9, 6, 3.2, 4.4, 0xe6d6b4, { ao: false });
  for (const y of [0, 2.6]) w.box(x, y, z - 9, 6.1, 0.22, 4.5, C.woodD, NB);
  w.box(x - 1.2, 0, z - 6.78, 1.2, 2.0, 0.08, C.woodD, NB);
  roof(w, x, 2.8, z - 9, 4.3, 3.5, 2.2, { type: "hip", lod: true, color: C.thatch, mat: "std", under: 0xb08e48, fascia: 0xc7a252, ridge: false, lift: 0.1 });
  for (const dz of [-1.5, 1.5]) w.box(x, -2.6, z + dz, 0.3, 4.0, 0.3, C.woodD, NB);
  // 물받이 홈통
  w.box(x - 5.6, 4.25, z, 8, 0.12, 0.7, C.wood, NB); for (const s of [-1, 1]) w.box(x - 5.6, 4.3, z + s * 0.36, 8, 0.22, 0.06, C.woodD, NB);
  for (const dx of [-8.4, -5]) w.box(x + dx, -2.4, z, 0.22, 6.65, 0.22, C.woodD, NB);
  const g = new Geo(), wood = 0x7a5a3a;
  for (const zz of [-0.5, 0.5]) { g.add(new THREE.TorusGeometry(2.45, 0.09, 4, 16), TRS(0, 0, zz), wood); for (let k = 0; k < 8; k++) { const a = k * 0.7854; g.bar([0, 0, zz], [Math.cos(a) * 2.45, Math.sin(a) * 2.45, zz], 0.055, wood, 4); } }
  for (let k = 0; k < 12; k++) { const a = k * 0.5236; g.add(G.box(), TRS(Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0, 0, 0.75, 0.07, 1.1, 0, a * 57.296), 0x9a7650); }
  g.add(G.cyl(8), TRS(0, 0, -2.9, 0, 0.14, 8.8, 0.14, 90), 0x5a4030);
  const wheel = new THREE.Mesh(g.build(), litMat());
  wheel.position.set(x, 1.4, z); wheel.castShadow = true;
  w.scene.add(wheel);
  w.col.addBox(V(x, 1.4, z), V(2.75, 2.75, 0.8), null);
  w.updaters.push((dt) => { wheel.rotation.z -= dt * 0.55; });
  folk(w, x + 4.4, 0, z - 6.4, C.wht, 0xc9a352);
  for (let k = 0; k < 4; k++) w.mesh(ball0(), TRS(x + 2.2 + (k % 2) * 0.8, 0.36 + (k > 1 ? 0.5 : 0), z - 6.3 + (k > 1 ? 0.1 : 0), k * 40, 0.46, 0.4, 0.4), 0xd8c8a0, "std");
  // 섶다리(통나무 다리)
  w.box(176, 0.1, 96, 2.0, 0.3, 14, C.wood, { mat: "std:wood", tile: 1.2 });
  for (const zz of [91.5, 96, 100.5]) for (const s of [-1, 1]) w.box(176 + s * 0.8, -2.6, zz, 0.2, 2.8, 0.2, C.woodD, NB);
}

// ── 움직이는 것들: 굴뚝·향로·봉수대 연기, 의장기, 원앙 ──
function smoke(w, sites) {
  const K = 4, n = sites.length, m = fleet(w, new Geo().add(ball(), TRS(0, 0, 0), 0xffffff).build(), litMat(), n * K), col = new THREE.Color();
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  for (let i = 0; i < n * K; i++) m.setColorAt(i, col.set(sites[(i / K) | 0][4] || 0xf3efe6));
  const upd = (dt, t) => {
    for (let i = 0; i < n; i++) {
      const s = sites[i], k0 = s[3];
      for (let k = 0; k < K; k++) {
        const u = (t * 0.1 + k / K + i * 0.37) % 1, sc = k0 * (0.3 + u * 0.95) * (1 - sm(0.72, 1, u));
        P.set(s[0] + u * u * 3.4 * k0 + Math.sin(t * 0.7 + k * 2 + i) * 0.12, s[1] + u * 5.6 * k0, s[2] + u * 1.3 * k0);
        m.setMatrixAt(i * K + k, M.compose(P, Q, S.set(sc, sc * 0.85, sc)));
      }
    }
    m.instanceMatrix.needsUpdate = true;
  };
  upd(0, 0); w.updaters.push(upd);
}
function banners(w, list) {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.06, 5.3, 0x2a2420, 6).box(0, 5.3, 0, 0.18, 0.18, 0.18, 0x3a3028).box(0.56, 4.92, 0, 1.2, 0.07, 0.07, 0x2a2420);
  g.box(0.6, 2.3, 0, 0.95, 2.6, 0.05, 0xffffff).box(0.6, 4.55, 0, 0.99, 0.3, 0.07, 0x9a9488).box(0.6, 2.0, 0, 0.5, 0.3, 0.04, 0xffffff);
  const m = fleet(w, g.build(), litMat(), list.length, true), col = new THREE.Color();
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  list.forEach((b, i) => m.setColorAt(i, col.set(b[4])));
  const upd = (dt, t) => {
    for (let i = 0; i < list.length; i++) { const b = list[i]; m.setMatrixAt(i, M.compose(P.set(b[0], b[1], b[2]), Q.setFromAxisAngle(Y, b[3] + Math.sin(t * 1.3 + i * 1.7) * 0.32 + Math.sin(t * 3.1 + i) * 0.07), S)); }
    m.instanceMatrix.needsUpdate = true;
  };
  upd(0, 0); w.updaters.push(upd);
}
function ducks(w) {
  const g = new Geo();
  g.add(ball0(), TRS(0, 0.14, 0, 0, 0.24, 0.19, 0.38), 0xffffff).add(ball0(), TRS(0, 0.4, -0.28, 0, 0.13, 0.14, 0.15), 0xd8d8d8).box(0, 0.36, -0.47, 0.07, 0.05, 0.13, 0xffc040).box(0, 0.2, 0.34, 0.16, 0.14, 0.16, 0xbcbcbc);
  const G2 = [[-108.5, 30, 2.5, 1], [-72, 21, 2.9, -1]], N = 8, m = fleet(w, g.build(), litMat(), N), col = new THREE.Color();
  const P = new THREE.Vector3(), D = new THREE.Vector3();
  for (let i = 0; i < N; i++) { m.setColorAt(i, col.set([0xf08a30, 0xa8845c, 0xf2ece0, 0xa8845c][i % 4])); w.rider([m, i], [[0, 0.2, 0, 0.3, 0.25, 0.42]]); }
  const upd = (dt, t) => {
    for (let i = 0; i < N; i++) {
      const c = G2[i >> 2], a = c[3] * (t * 0.16 - (i & 3) * 0.42) + (i >> 2) * 2;
      P.set(c[0] + Math.cos(a) * c[2], -1.02 + Math.sin(t * 1.6 + i) * 0.025, c[1] + Math.sin(a) * c[2] * 1.5);
      D.set(-Math.sin(a) * c[3], 0, Math.cos(a) * 1.5 * c[3]);
      aim(m, i, P, D);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  upd(0, 0); w.updaters.push(upd);
}

export function detail(w) {
  const smokeAt = [[21, 4.7, -15.5, 0.45], [-21, 4.7, -44.5, 0.45]];   // 월대 향로(훈련 구역 밖 두 곳)
  dancheong(w); courtFloor(w); wallsDetail(w); roadsDetail(w); bases(w); meadow(w); farWoods(w);
  villageDetail(w, smokeAt); innerYards(w, smokeAt); mill(w);
  smoke(w, smokeAt); ducks(w);
  const cols = [C.red, C.blue, C.yel, C.wht, 0x2b2b30], bl = [];
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) bl.push([s * 46.5, 0.07, -2 + k * 5, s > 0 ? Math.PI : 0, cols[(k + (s > 0 ? 2 : 0)) % 5]]);
  for (const s of [-1, 1]) for (const x of [21.5, 24.6]) bl.push([s * x, 0, 114.6, s > 0 ? Math.PI : 0, cols[(x > 23 ? 1 : 0) + (s > 0 ? 2 : 0)]]);
  banners(w, bl);
}
