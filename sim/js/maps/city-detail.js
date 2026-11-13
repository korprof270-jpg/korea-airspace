// 네온 시티 디테일 보강(정적): 보도·차도 표시, 거리 소품, 건물 외벽·옥상, 랜드마크 장식, 천변, 맵 바깥 원경
// 원칙: 여기서 놓는 것은 거의 전부 충돌 없는 장식이다(비행선 근처에는 키 큰 것을 두지 않는다).
// 기존 배치의 난수 순서를 건드리지 않도록 city.js 가 다른 구역을 다 지은 뒤에 부른다.
import * as THREE from "../../vendor/three.module.min.js";
import { DEG, MAG, CYA, YEL, GRN, ORG, VIO, RED, WARM, NEON, TRS, G, ring, bar, hip, tree, people, Signs, icon, neonText } from "./city-kit.js";

const ROADS = [-150, -90, -30, 30, 90, 150];
const GY = 0.18;                                   // 보도(패드) 윗면
const _p = new THREE.Vector3();
const P = (w, x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { col: false, ...o });
const glow = (w, x, y, z, sx, sy, sz, c, o) => w.box(x, y, z, sx, sy, sz, c, { mat: "glow", col: false, ...o });
const dim = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const pick = (w, a) => a[(w.rand() * a.length) | 0];

// 방향 있는 소품 묶음: 로컬 (lx, lz) → 월드. 로컬 +z 가 ry(도) 방향, y0 는 바닥 높이 보정
function ob(w, x, z, ry, y0 = 0) {
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
  const f = (lx, y, lz, sx, sy, sz, col, o) => w.box(x + lx * c + lz * s, y + y0, z - lx * s + lz * c, sx, sy, sz, col, { col: false, ry, ...o });
  f.pos = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  f.ry = ry;
  return f;
}

// ── 새 간판 도안(두 번째 아틀라스) ──
const S = (id, text, icn, fg, frame, kind) => ({ id, text, icon: icn, fg, frame, kind });
const SIGNS2 = [
  S("bus", ["버스", "BUS"], "train", 0xffffff, GRN), S("west", ["서문", "WEST GATE"], null, 0xffe9b0, RED), S("dome", ["스카이 돔", "SKY DOME"], "flag", 0xffffff, CYA),
  S("park", ["달빛 공원", "MOON PARK"], "moon", 0xd8ffd0, GRN), S("bank", ["하늘 은행", "SKY BANK"], "star", YEL, CYA), S("tower", ["하늘탑", "SKY TOWER"], "arrow", 0xffffff, MAG),
  S("a101", "101", null, 0xfff0d0, null), S("a102", "102", null, 0xfff0d0, null), S("a103", "103", null, 0xfff0d0, null),
  S("chicken", ["치킨 호프", "CHICKEN PUB"], "bolt", ORG, YEL), S("tteok", ["떡볶이", "TTEOKBOKKI"], "bowl", RED, ORG), S("parking", ["주차", "PARKING"], "arrow", 0xffffff, CYA),
  S("onair", ["생중계", "ON AIR"], "note", RED, RED), S("walk", ["천변 산책로", "RIVERWALK"], "fish", CYA, CYA), S("safe", ["안전 제일", "SAFETY FIRST"], "warn", GRN, GRN),
  S("v0", ["호텔", "HOTEL"], "moon", 0xffe9b0, VIO, "tall"), S("v1", ["은행", "BANK"], "star", YEL, CYA, "tall"), S("v2", ["치과", "DENTAL"], "cross", 0xffffff, CYA, "tall"), S("v3", ["학원", "ACADEMY"], "flag", GRN, YEL, "tall"),
  S("v4", ["헬스", "GYM"], "bolt", ORG, RED, "tall"), S("v5", ["미용실", "SALON"], "heart", MAG, MAG, "tall"), S("v6", ["부동산", "REALTY"], "arrow", YEL, GRN, "tall"), S("v7", ["편의점", "STORE"], "cup", CYA, VIO, "tall"),
  {
    // 전망대를 도는 전광 띠
    id: "ticker", kind: "big", draw(g, W, H, ko) {
      g.fillStyle = "#070a18"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? "rgba(33,212,253,0.5)" : "rgba(255,43,214,0.5)"; g.fillRect(i * 16, 6, 10, 10); g.fillRect(i * 16 + 4, H - 16, 10, 10); }
      icon(g, "drone", 70, H / 2, 110, "#ffe14a");
      neonText(g, ko ? "하늘길 FPV" : "SKYWAY FPV", 320, 92, 74, "#ffffff", 360);
      neonText(g, ko ? "네온 시티 그랑프리" : "NEON CITY GP", 320, 176, 44, "#21d4fd", 360);
    },
  },
  {
    // 옥상 광고판
    id: "ad", kind: "big", draw(g, W, H, ko) {
      const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "#2a0a16"); gr.addColorStop(1, "#0a1630"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = "#ff7a1a"; g.lineWidth = 6; g.shadowColor = "#ff7a1a"; g.shadowBlur = 14; g.strokeRect(12, 12, W - 24, H - 24); g.shadowBlur = 0;
      icon(g, "drone", 100, 100, 130, "#ff7a1a");
      neonText(g, ko ? "드론 택배" : "DRONE POST", 330, 86, 70, "#ffe14a", 330);
      neonText(g, ko ? "30분 안에 문 앞까지" : "30 MIN TO YOUR DOOR", 300, 180, 34, "#ffffff", 440);
    },
  },
];

// ── 비행선(트랙·순찰 드론 경로) 근처인지: 키 큰 장식을 피하는 데 쓴다 ──
function flightLines(def) {
  const segs = [];
  const add = (pts, loop) => { for (let i = 0; i < pts.length - (loop ? 0 : 1); i++) segs.push([pts[i], pts[(i + 1) % pts.length]]); };
  for (const t of def.tracks) { const pts = t.gates.map((g) => g.p); if (t.start) pts.unshift(t.start.pos); add(pts, t.loop !== false); }
  for (const t of def.tracking) if (t.type === "drone") add(t.path, t.closed !== false);
  // (x,z) 에서 수평 m 미터 안에 높이 yMax 아래로 지나는 비행선이 있는가
  return (x, z, m, yMax = 14) => segs.some(([a, b]) => {
    if (Math.min(a[1], b[1]) > yMax) return false;
    const dx = b[0] - a[0], dz = b[2] - a[2], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / Math.max(1e-6, dx * dx + dz * dz)));
    return Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t) < m;
  });
}

// ── 거리 소품(충돌 없음). f = ob(...) ──
const WOOD = 0x7a5a3a, DARK = 0x2c3138;
const ITEM = {
  bench(w, f) { f(0, GY + 0.4, 0, 1.8, 0.08, 0.5, WOOD); f(0, GY + 0.48, -0.24, 1.8, 0.45, 0.07, WOOD); for (const k of [-0.75, 0.75]) f(k, GY, 0, 0.08, 0.4, 0.45, DARK); },
  bin(w, f) { f(0, GY, 0, 0.5, 0.85, 0.5, 0x2f4a3a, { mat: "paint" }); f(0, GY + 0.85, 0, 0.56, 0.08, 0.56, 0x596273); },
  bollards(w, f) { for (const k of [-1.4, 0, 1.4]) { f(k, GY, 0, 0.22, 0.75, 0.22, DARK); f(k, GY + 0.75, 0, 0.24, 0.07, 0.24, dim(WARM, 0.6), { mat: "glow" }); } },
  planter(w, f) {
    f(0, GY, 0, 2.4, 0.55, 0.9, 0x6a6f7a, { mat: "std:concrete", tile: 3 });
    for (const k of [-0.7, 0, 0.7]) { const [x, z] = f.pos(k, 0); w.mesh(G.leaf((k + 1) | 0), TRS(x, GY + 0.8, z, w.rand() * 360, 0.5, 0.42, 0.45), new THREE.Color().setHSL(0.3 + w.rand() * 0.06, 0.5, 0.22).getHex(), "foliage"); }
    const fc = pick(w, [0xff8ad0, 0xffe14a, 0xffffff]); for (const k of [-0.95, 0.35]) f(k, GY + 0.95, 0.2, 0.16, 0.14, 0.16, dim(fc, 0.5), { mat: "glow" });
  },
  vending(w, f) {
    const c = pick(w, [CYA, RED, GRN, YEL]);
    f(0, GY, -0.2, 1.0, 1.9, 0.7, c === RED ? 0x8a2f2a : 0x2a3f5a, { mat: "paint" }); f(0, GY + 0.35, 0.17, 0.82, 1.35, 0.05, dim(c, 0.55), { mat: "glow" });
    const [x, z] = f.pos(0, 1.7); w.pool(x, 0.2, z, 3, c, 0.25);
  },
  hydrant(w, f) { f(0, GY, 0, 0.28, 0.6, 0.28, 0xc0392b, { mat: "paint" }); f(0, GY + 0.6, 0, 0.2, 0.12, 0.2, 0xc0392b, { mat: "paint" }); },
  cabinet(w, f) { f(0, GY, 0, 1.1, 1.25, 0.45, 0x66707e, { mat: "std:panel", tile: 2 }); f(0.35, GY + 0.95, 0.24, 0.08, 0.08, 0.02, GRN, { mat: "glow" }); },
  bikes(w, f) {
    f(-1.7, GY, 0, 0.35, 1.4, 0.3, DARK); f(-1.7, GY + 0.95, 0.16, 0.25, 0.3, 0.02, dim(GRN, 0.8), { mat: "glow" });
    for (let k = 0; k < 4; k++) { f(-0.9 + k * 0.7, GY + 0.3, 0, 0.07, 0.55, 1.5, 0x3fae6a, { mat: "paint" }); f(-0.9 + k * 0.7, GY, 0.55, 0.06, 0.6, 0.6, 0x101114); f(-0.9 + k * 0.7, GY, -0.55, 0.06, 0.6, 0.6, 0x101114); }
  },
  signpost(w, f) { f(0, GY, 0, 0.07, 2.9, 0.07, 0x8a909c, { mat: "metal" }); f(0, GY + 2.2, 0.06, 0.7, 0.7, 0.05, pick(w, [0x2f6fd0, 0xc0392b, 0xd9a82b]), { mat: "paint" }); },
  cafe(w, f) {
    f(0, GY, 0, 0.08, 0.7, 0.08, DARK); f(0, GY + 0.7, 0, 0.8, 0.05, 0.8, 0xdfe3ea); for (const k of [-0.8, 0.8]) f(k, GY, 0, 0.35, 0.45, 0.35, pick(w, [0xb33a3a, 0x2f8a7a, 0xd98a2b]), { mat: "paint" });
    f(0, GY, 0, 0.05, 2.3, 0.05, 0xdfe3ea); const [x, z] = f.pos(0, 0); hip(w, x, GY + 2.1, z, 2.4, 0.6, 2.4, pick(w, [0xb33a3a, 0x2f8a7a, 0xd98a2b, 0x8a3ab3]), { mat: "paint", col: false, ry: f.ry });
  },
  aframe(w, f) { const c = pick(w, NEON); f(0, GY, 0, 0.6, 0.95, 0.07, dim(c, 0.5), { mat: "glow", rx: -12 }); const [x, z] = f.pos(0, 0.8); w.pool(x, 0.2, z, 1.8, c, 0.22); },
  scooter(w, f) {
    f(0, GY + 0.25, 0, 0.35, 0.35, 1.3, pick(w, [0xd13b3b, 0xffc400, 0x2f8cff, 0xf2f2f2]), { mat: "paint" }); f(0, GY + 0.6, -0.4, 0.42, 0.45, 0.45, 0x1c2430);
    for (const k of [-0.5, 0.5]) f(0, GY, k, 0.12, 0.5, 0.5, 0x101114); f(0, GY + 0.55, -0.66, 0.2, 0.08, 0.03, RED, { mat: "glow" });
  },
  crates(w, f) { f(0, GY, 0, 0.9, 0.7, 0.9, 0x8a6a4a, { mat: "std:wood", tile: 2 }); f(0.85, GY, 0.1, 0.7, 0.55, 0.7, 0x7a5a3a, { mat: "std:wood", tile: 2 }); f(0.1, GY + 0.7, 0, 0.7, 0.5, 0.7, 0x9a7a52, { mat: "std:wood", tile: 2, ry: f.ry + 20 }); },
  cones(w, f) { for (const k of [-0.8, 0, 0.8]) { const [x, z] = f.pos(k, 0); w.mesh(G.cone(6, 0.2), TRS(x, GY + 0.35, z, 0, 0.2, 0.7, 0.2), ORG, "paint"); } },
  shelter(w, f, K) {
    for (const k of [-1.9, 1.9]) f(k, GY, -0.6, 0.1, 2.5, 0.1, DARK);
    f(0, GY + 2.5, 0, 4.4, 0.1, 1.7, DARK); f(0, GY + 0.3, -0.68, 3.7, 1.9, 0.05, 0x8fd3ff, { mat: "glass" });
    f(2.05, GY + 0.4, 0, 0.08, 1.8, 1.2, dim(pick(w, NEON), 0.5), { mat: "glow" }); f(0, GY + 0.42, -0.35, 2.4, 0.08, 0.4, WOOD);
    f(0, GY + 2.44, 0, 3.6, 0.04, 0.12, dim(WARM, 0.9), { mat: "glow" });
    const [x, z] = f.pos(0, 0.6); w.pool(x, 0.2, z, 4.5, WARM, 0.35);
    f(-2.5, GY, 0.5, 0.07, 2.9, 0.07, 0x8a909c, { mat: "metal" }); const [sx, sz] = f.pos(-2.5, 0.56); K.signs2.add("bus", sx, GY + 2.5, sz, 1.0, { ry: f.ry, back: "bus" });
  },
};
const MIX = {
  apt: ["bench", "planter", "bikes", "bin", "hydrant", "planter", "bench", "signpost", "cabinet"],
  biz: ["bollards", "planter", "vending", "signpost", "cabinet", "bin", "bench", "bollards", "bikes", "hydrant"],
  fun: ["cafe", "aframe", "vending", "bench", "scooter", "crates", "planter", "bin", "cafe", "scooter"],
};
const zoneOf = (i, j) => (j >= 2 ? "fun" : i <= -2 && j <= -1 ? "apt" : "biz");

// ── 보도: 경계석·포장 띠·거리 소품 ──
function walks(w, K, near) {
  const r = w.rand;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    if (j === 1) continue;
    const cx = i * 60, cz = j * 60, base = (i === 3 && j === -3) || (i === -3 && j === 3), site = i === 2 && j === -2;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // 경계석(밝은 화강암 띠)과 그 안쪽의 보도 블록 띠
      P(w, cx + dx * 22.85, GY, cz + dz * 22.85, dx ? 0.3 : 46, 0.1, dx ? 46 : 0.3, 0x7d8494);
      if (!base) P(w, cx + dx * 21.3, GY, cz + dz * 21.3, dx ? 1.6 : 44.2, 0.025, dx ? 44.2 : 1.6, 0x655b68, { mat: "std:brick", tile: 2 });
      if (base || site) continue;
      const mix = MIX[zoneOf(i, j)];
      let shelter = r() < 0.3;
      for (const t of [-17, -11.5, -5.5, 5.5, 11.5, 17]) {
        if (r() < 0.3) continue;
        const tt = t + (r() - 0.5) * 2.4, x = cx + dx * 22 + (dx ? 0 : tt), z = cz + dz * 22 + (dz ? 0 : tt);
        if (w.col.blocked(_p.set(x, 1.3, z), 1.1)) continue;
        let kind = mix[(r() * mix.length) | 0];
        const tall = kind === "cafe" || kind === "signpost" || kind === "vending";
        if (shelter && Math.abs(t) < 12 && !near(x, z, 7, 9)) { kind = "shelter"; shelter = false; }
        else if (tall && near(x, z, 4.5, 8)) kind = "bollards";
        ITEM[kind](w, ob(w, x, z, Math.atan2(dx, dz) / DEG), K);
      }
    }
  }
}

// ── 차도: 정지선·진행 화살표·맨홀·보수 자국·자전거 도로 ──
function arrowGeo() {
  // 직진 화살표(길이 4, 폭 1.4), 로컬 -z 가 진행 방향, 윗면을 본다
  const p = [[-0.22, 2], [0.22, 2], [0.22, -0.6], [-0.22, -0.6], [-0.7, -0.6], [0.7, -0.6], [0, -2]], f = [[0, 1, 2], [0, 2, 3], [4, 5, 6]];
  const pos = [], nor = [];
  for (const t of f) for (const i of t) { pos.push(p[i][0], 0, p[i][1]); nor.push(0, 1, 0); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  return g;
}
function roads(w, K) {
  const r = w.rand, PAINT = 0xa9afbb, ag = arrowGeo();
  const stream = (z) => z > 40 && z < 80;
  for (const ix of ROADS) for (const iz of ROADS) {
    // 정지선(우측통행 기준 진입 차로)과 화살표
    P(w, ix + 3.4, 0.02, iz + 11.6, 6.2, 0.035, 0.45, PAINT, { ao: false }); P(w, ix - 3.4, 0.02, iz - 11.6, 6.2, 0.035, 0.45, PAINT, { ao: false });
    P(w, ix - 11.6, 0.02, iz + 3.4, 0.45, 0.035, 6.2, PAINT, { ao: false }); P(w, ix + 11.6, 0.02, iz - 3.4, 0.45, 0.035, 6.2, PAINT, { ao: false });
    if ((ix + iz) % 120 === 0) {
      if (!stream(iz + 19)) w.mesh(ag, TRS(ix + 3.4, 0.05, iz + 19, 0), PAINT, "std");
      if (!stream(iz - 19)) w.mesh(ag, TRS(ix - 3.4, 0.05, iz - 19, 180), PAINT, "std");
      w.mesh(ag, TRS(ix - 19, 0.05, iz + 3.4, -90), PAINT, "std"); w.mesh(ag, TRS(ix + 19, 0.05, iz - 3.4, 90), PAINT, "std");
    }
  }
  ag.dispose();
  // 맨홀과 아스팔트 보수 자국
  for (let n = 0; n < 150; n++) {
    const p = ROADS[(r() * 6) | 0], c = -205 + r() * 410, off = (r() - 0.5) * 9, alongZ = r() < 0.5;
    const x = alongZ ? p + off : c, z = alongZ ? c : p + off;
    if (alongZ && stream(z)) continue;
    if (n % 3 === 0) { w.cyl(x, 0.012, z, 0.55, 0.03, 0x23262d, { col: false }); w.cyl(x, 0.012, z, 0.38, 0.04, 0x3a3f49, { col: false }); }
    else P(w, x, 0.012, z, alongZ ? 2 + r() * 2 : 3 + r() * 5, 0.022, alongZ ? 3 + r() * 5 : 2 + r() * 2, r() < 0.5 ? 0x2b2d35 : 0x44474f, { ao: false });
  }
  // 바깥 순환로(±150)의 자전거 도로: 블록 쪽 가장자리의 붉은 띠
  for (const p of [-150, 150]) for (let m = -3; m <= 3; m++) {
    const s = p < 0 ? 1 : -1;
    if (m !== 1) P(w, p + s * 6.1, 0.014, m * 60, 1.3, 0.02, 44, 0x6a2f36, { ao: false });
    P(w, m * 60, 0.014, p + s * 6.1, 44, 0.02, 1.3, 0x6a2f36, { ao: false });
  }
  // 맵 바깥 고리 도로(±210)와 밖으로 뻗는 도로의 차선·가로등 불빛
  for (const p of [-210, 210]) {
    for (let c = -205; c <= 205; c += 10) { glow(w, p, 0.03, c, 0.2, 0.03, 4, 0x3c4048); glow(w, c, 0.03, p, 4, 0.03, 0.2, 0x3c4048); }
    const e = Math.sign(p) * 7.6;
    for (let c = -195; c <= 195; c += 30) {
      if (Math.abs(c - 60) > 14) { glow(w, p + e, 6.6, c, 0.5, 0.12, 0.3, WARM); w.pool(p + e * 0.7, 0.05, c, 8, WARM, 0.42); }
      glow(w, c, 6.6, p + e, 0.3, 0.12, 0.5, WARM); w.pool(c, 0.05, p + e * 0.7, 8, WARM, 0.42);
    }
    // 고리 도로가 천변을 건너는 다리
    w.box(p, -1.2, 60, 14, 1.22, 22.2, 0x454a55, { mat: "std:concrete", tile: 6 });
    for (const s of [-1, 1]) { P(w, p + s * 6.8, 0.02, 60, 0.3, 1.0, 22.2, 0x596273); glow(w, p + s * 6.8, 1.02, 60, 0.12, 0.08, 22.2, WARM); }
  }
  for (const [x, z] of [[-146, -52], [154, -10], [-86, 172], [26, 176], [-152, 100]]) K.steam.push([x, 0.1, z, 0.7, 3.4]);          // 김 나는 맨홀
  for (const p of [...ROADS, -210, 210]) for (let c = 225; c <= 335; c += 10) for (const s of [-1, 1]) {
    glow(w, p, 0.03, s * c, 0.2, 0.03, 4, 0x3c4048); glow(w, s * c, 0.03, p, 4, 0.03, 0.2, 0x3c4048);
    if (c % 30 === 5) for (const e of [-7.6, 7.6]) {
      glow(w, p + e, 6.6, s * c, 0.5, 0.12, 0.3, WARM); w.pool(p + e * 0.75, 0.05, s * c, 8, WARM, 0.42);
      glow(w, s * c, 6.6, p + e, 0.3, 0.12, 0.5, WARM); w.pool(s * c, 0.05, p + e * 0.75, 8, WARM, 0.42);
    }
  }
}

// ── 일반 빌딩: 모서리 기둥·층띠·옥상 난간과 설비·현관·돌출 간판·옥상 광고판 ──
function towers(w, K, near) {
  const r = w.rand;
  let nb = 0;
  for (const t of K.towers || []) {
    const { x, z, wd, dp, y0, h, nc } = t, top = y0 + h, hx = wd / 2, hz = dp / 2;
    const frame = dim(0x3a404c, 0.9 + r() * 0.3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(w, x + sx * (hx - 0.2), y0, z + sz * (hz - 0.2), 0.75, h, 0.75, frame, { ao: false });
    for (let y = y0 + 12; y < top - 4; y += 12) P(w, x, y - 0.2, z, wd + 0.36, 0.4, dp + 0.36, frame);
    if (h > 34 && r() < 0.55) { const sx = r() < 0.5 ? 1 : -1, sz = r() < 0.5 ? 1 : -1; glow(w, x + sx * (hx + 0.2), y0 + h * 0.3, z + sz * (hz + 0.2), 0.16, h * 0.66, 0.16, dim(nc, 0.7)); }
    // 옥상: 난간 벽 + 밝은 바닥 + 가장자리 설비
    const ry = top + 0.7;
    for (const s of [-1, 1]) { P(w, x, ry, z + s * (hz + 0.1), wd + 0.5, 0.9, 0.3, 0x3d4350); P(w, x + s * (hx + 0.1), ry, z, 0.3, 0.9, dp + 0.5, 0x3d4350); }
    P(w, x, ry, z, wd - 0.6, 0.05, dp - 0.6, 0x4d5464, { mat: "std:concrete", tile: 4 });
    if (h > 40) for (const sx of [-1, 1]) for (const sz of [-1, 1]) glow(w, x + sx * hx, ry + 0.9, z + sz * hz, 0.22, 0.22, 0.22, dim(RED, 0.7));
    if (t.roof !== "none" && t.roof !== "heli" && wd >= 13 && dp >= 13) {
      const alongX = wd >= dp, e = r() < 0.5 ? 1 : -1, L = (alongX ? wd : dp) - 5;
      const ex = (k, d) => (alongX ? [x + k, z + e * (hz - d)] : [x + e * (hx - d), z + k]);
      // 덕트 한 줄과 환기구
      { const [px, pz] = ex(0, 1.0); P(w, px, ry + 0.25, pz, alongX ? L : 0.5, 0.4, alongX ? 0.5 : L, 0x6a7280, { mat: "metal" }); }
      for (let k = -L / 2 + 1; k < L / 2 - 1; k += 3 + r() * 3) { const [px, pz] = ex(k, 2.0); P(w, px, ry, pz, 0.9, 0.7 + r() * 0.4, 0.9, 0x5a616c, { mat: "std:panel", tile: 2 }); P(w, px, ry + 1.1, pz, 1.05, 0.08, 1.05, 0x2c3138); }
      // 계단실(설비 반대쪽 모서리): 문 위 보안등
      const q = r() < 0.5 ? 1 : -1, bxs = alongX ? x + q * (hx - 2.8) : x - e * (hx - 2.6), bzs = alongX ? z - e * (hz - 2.6) : z + q * (hz - 2.8);
      P(w, bxs, ry, bzs, 3, 2.6, 2.8, 0x4a505c, { mat: "std:concrete", tile: 4 });
      glow(w, bxs + (alongX ? 0 : e * 1.52), ry + 2.0, bzs + (alongX ? e * 1.42 : 0), alongX ? 0.9 : 0.06, 0.16, alongX ? 0.06 : 0.9, WARM);
      w.pool(bxs + (alongX ? 0 : e * 3), ry + 0.05, bzs + (alongX ? e * 3 : 0), 4.2, WARM, 0.4);
      // 접시 안테나
      if (r() < 0.5) { const [px, pz] = ex((r() - 0.5) * L * 0.6, 3.6); bar(w, px, ry, pz, px, ry + 1.5, pz, 0.06, 0x8a909c); w.mesh(G.cone(8, 0.2), TRS(px, ry + 1.7, pz, r() * 360, 0.75, 0.3, 0.75, 55), 0xdfe3ea, "paint"); }
    }
    if (y0) continue;
    const ci = Math.round(x / 60), cj = Math.round(z / 60), zone = zoneOf(ci, cj);
    // 현관: 캐노피와 밝은 유리문
    if (Math.min(wd, dp) >= 14) {
      const [dx, dz] = pick(w, [[1, 0], [-1, 0], [0, 1], [0, -1]]), k = (r() < 0.5 ? 1 : -1) * ((dx ? hz : hx) - 4.2);
      const px = x + dx * (hx + 0.3) + (dx ? 0 : k), pz = z + dz * (hz + 0.3) + (dz ? 0 : k);
      if (!w.col.blocked(_p.set(px + dx * 1.6, 1.5, pz + dz * 1.6), 0.8)) {
        const f = ob(w, px, pz, Math.atan2(dx, dz) / DEG);
        f(0, 3.5, 1.0, 5.2, 0.22, 2.4, 0x20242c); f(0, 3.44, 2.1, 5.0, 0.08, 0.1, dim(nc, 0.8), { mat: "glow" });
        f(0, GY, 0.05, 3.2, 2.9, 0.1, dim(WARM, 0.5), { mat: "glow" }); f(0, GY, 0.12, 0.12, 2.9, 0.06, 0x20242c);
        for (const e of [-2.4, 2.4]) f(e, GY, 1.9, 0.16, 3.3, 0.16, 0x8a909c, { mat: "metal" });
        f(0, GY, 1.2, 3.6, 0.06, 2.2, 0x7a2f3a); const [lx, lz] = f.pos(0, 2.2); w.pool(lx, 0.2, lz, 5, WARM, 0.4);
      }
    }
    // 돌출 세로 간판(상가 구역일수록 많이)
    const n = zone === "apt" ? 0 : zone === "fun" ? 1 + ((r() * 3) | 0) : (r() * 3) | 0;
    if (n && h >= 12) {
      const [dx, dz] = pick(w, [[1, 0], [-1, 0], [0, 1], [0, -1]]), k = (r() < 0.5 ? 1 : -1) * ((dx ? hz : hx) - 1.4);
      const px = x + dx * (hx + 0.95) + (dx ? 0 : k), pz = z + dz * (hz + 0.95) + (dz ? 0 : k);
      if (!near(px, pz, 4, 18)) for (let m = 0; m < n && 6 + m * 3.5 + 3 < h; m++) {
        const two = r() < 0.5, sid = (two ? "v" : "t") + ((r() * 8) | 0), y = 7.4 + m * 3.5;
        (two ? K.signs2 : K.signs).add(sid, px, y, pz, 1.55, { ry: dx ? 0 : 90, back: sid });
        P(w, px - dx * 0.5, y + 1.5, pz - dz * 0.5, dx ? 1.1 : 0.08, 0.08, dx ? 0.08 : 1.1, DARK); P(w, px - dx * 0.5, y - 1.6, pz - dz * 0.5, dx ? 1.1 : 0.08, 0.08, dx ? 0.08 : 1.1, DARK);
      }
    }
    // 옥상 광고판: 도심 쪽을 본다
    if (h >= 24 && h <= 54 && wd >= 15 && dp >= 15 && (t.roof === "ac" || t.roof === "tank" || t.roof === "mast") && r() < 0.5 && Math.hypot(x, z) > 60) {
      const fx = Math.abs(x) > Math.abs(z), s = fx ? -Math.sign(x) : -Math.sign(z), bw = Math.min(12, (fx ? dp : wd) - 3);
      const bx = x + (fx ? s * (hx - 0.9) : 0), bz = z + (fx ? 0 : s * (hz - 0.9)), face = fx ? (s > 0 ? 90 : -90) : s > 0 ? 0 : 180;
      for (const k of [-bw / 2 + 1, bw / 2 - 1]) { const ax = bx + (fx ? 0 : k), az = bz + (fx ? k : 0); bar(w, ax, ry, az, ax, ry + 2.2, az, 0.14, 0x3a3f48); bar(w, ax, ry + 2.2, az, ax - (fx ? s * 2.4 : 0), ry, az - (fx ? 0 : s * 2.4), 0.07, 0x3a3f48); }
      P(w, bx, ry + 2.0, bz, fx ? 0.35 : bw + 0.5, bw / 2 + 0.5, fx ? bw + 0.5 : 0.35, 0x161920);
      const id = ["ad", "bank", "chicken", "tower", "ad", "park", "dome"][nb++ % 7], S2 = K.signs2;
      S2.add(id, bx + (fx ? s * 0.2 : 0), ry + 2.25 + bw / 4, bz + (fx ? 0 : s * 0.2), bw, { ry: face, height: bw / 2 });
      glow(w, bx + (fx ? s * 0.5 : 0), ry + 1.9, bz + (fx ? 0 : s * 0.5), fx ? 0.12 : bw, 0.1, fx ? bw : 0.12, dim(WARM, 0.7));
    }
  }
}

// ── 아파트: 층마다 발코니 띠, 옥상 난간, 동 번호, 주차선 ──
function apts(w, K) {
  let n = 0;
  for (const a of K.apts || []) {
    const { x, z, wd, dp, h, ns } = a;
    for (let y = 3; y < h - 1.5; y += 3) for (const s of [-1, 1]) {
      // 긴 면에 붙는 발코니(난간 높이의 띠): 창문 아래쪽만 가린다
      if (ns) P(w, x + s * (wd / 2 + 0.45), y - 0.1, z, 0.9, 0.95, dp - 1.6, 0xc9c2b4, { ao: false });
      else P(w, x, y - 0.1, z + s * (dp / 2 + 0.45), wd - 1.6, 0.95, 0.9, 0xc9c2b4, { ao: false });
    }
    for (const s of [-1, 1]) { P(w, x, h + 0.6, z + s * (dp / 2 + 0.05), wd + 0.3, 0.8, 0.25, 0x5a564e); P(w, x + s * (wd / 2 + 0.05), h + 0.6, z, 0.25, 0.8, dp + 0.3, 0x5a564e); }
    P(w, x, h + 0.6, z, wd - 0.6, 0.05, dp - 0.6, 0x5c5a58, { mat: "std:concrete", tile: 4 });
    // 측벽 꼭대기의 동 번호
    const id = ["a101", "a102", "a103"][n++ % 3];
    for (const e of [-1, 1]) K.signs2.add(id, x + (ns ? 0 : e * (wd / 2 + 0.14)), h - 5, z + (ns ? e * (dp / 2 + 0.14) : 0), 6.5, { ry: ns ? (e > 0 ? 0 : 180) : e > 0 ? 90 : -90 });
  }
}

// ── 하늘탑: 광장 무늬·수직 네온 리브·전망대 창살·안테나 ──
function spirePlus(w, K) {
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 360 + 11.25, c = Math.cos(a * DEG), s = Math.sin(a * DEG); P(w, c * 15.6, 0.3, s * 15.6, 10.4, 0.03, 0.16, 0x7d8494, { ry: -a, ao: false }); }
  ring(w, 0, 0.36, 0, 12.6, 0.07, dim(CYA, 0.5), { col: false, seg: 48, sides: 4 }); ring(w, 0, 0.36, 0, 20.6, 0.09, dim(MAG, 0.5), { col: false, seg: 56, sides: 4 });
  for (let i = 0; i < 4; i++) {
    // 다리 사이 화단과 벤치(낮게)
    const a = i * 90, f = ob(w, Math.sin(a * DEG) * 17.6, Math.cos(a * DEG) * 17.6, a);
    f(0, 0.32, 0, 6, 0.5, 1.4, 0x6a6f7a, { mat: "std:concrete", tile: 3 });
    for (const k of [-2, -0.7, 0.7, 2]) { const [x, z] = f.pos(k, 0); w.mesh(G.leaf(i % 3), TRS(x, 1.05, z, k * 40, 0.75, 0.55, 0.7), 0x2c6a3c, "foliage"); }
    f(0, 0.72, 1.1, 5.2, 0.08, 0.5, WOOD); f(0, 0.34, 0.74, 5.6, 0.05, 0.06, dim(WARM, 0.7), { mat: "glow" });
    const [px, pz] = f.pos(0, 2.2); w.pool(px, 0.32, pz, 5, CYA, 0.3);
  }
  // 몸통 수직 리브(탑의 기울기를 따라)
  const prof = [[8, 7.1], [40, 5.72], [70, 4.32], [85, 3.3]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, c = Math.cos(a), s = Math.sin(a), col = i % 2 ? dim(CYA, 0.75) : dim(0xdfe8ff, 0.6);
    for (let k = 0; k < 3; k++) bar(w, c * prof[k][1], prof[k][0], s * prof[k][1], c * prof[k + 1][1], prof[k + 1][0], s * prof[k + 1][1], 0.09, col, "glow", 4);
  }
  // 전망대: 창살·위아래 테두리·아래쪽 조명
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; P(w, Math.cos(a) * 8.66, 89, Math.sin(a) * 8.66, 0.16, 3, 0.16, 0x2a3040, { ry: -a / DEG, ao: false }); }
  ring(w, 0, 89.0, 0, 8.75, 0.12, WARM, { col: false, seg: 44, sides: 4 }); ring(w, 0, 92.05, 0, 8.75, 0.12, MAG, { col: false, seg: 44, sides: 4 });
  // 꼭대기 안테나 가로대와 접시
  for (const [y, L] of [[112, 2.6], [118, 2.0], [124, 1.4]]) { bar(w, -L, y, 0, L, y, 0, 0.07, 0x8a93a5); bar(w, 0, y, -L, 0, y, L, 0.07, 0x8a93a5); K.beacons.push([L, y + 0.2, 0, 0.2], [-L, y + 0.2, 0, 0.2]); }
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; w.mesh(G.cone(8, 0.25), TRS(Math.cos(a) * 2.6, 99 + i * 2.5, Math.sin(a) * 2.6, -a / DEG + 90, 1.1, 0.4, 1.1, 0, 70), 0xdfe3ea, "paint"); }
  // 탑을 비추는 상향 조명(버팀다리 발치)
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a); K.beams.push([c * 21.5, 0.4, s * 21.5, c * 6, 62, s * 6, 0.4, 4.5, NEON[i], 0.1]); }
}

// ── 성문: 단청·용마루·현판·성가퀴·석등·깃대 ──
function gatePlus(w, K, cx, cz) {
  const teal = 0x2f8a7a, redw = 0xb0402e;
  for (const s of [-1, 1]) {
    // 처마 밑 단청 띠와 서까래 마구리
    P(w, cx + s * 6.2, 12.55, cz, 0.3, 0.38, 29, teal, { mat: "paint" }); P(w, cx + s * 4.5, 18.55, cz, 0.3, 0.38, 20, teal, { mat: "paint" });
    for (let k = -9; k <= 9; k++) P(w, cx + s * 6.38, 12.62, cz + k * 1.5, 0.14, 0.24, 0.5, k % 2 ? redw : 0xe8d9a8, { mat: "paint" });
    for (let k = -6; k <= 6; k++) P(w, cx + s * 4.68, 18.62, cz + k * 1.5, 0.14, 0.24, 0.5, k % 2 ? redw : 0xe8d9a8, { mat: "paint" });
    // 현판(아치 위)
    P(w, cx + s * 5.06, 7.15, cz, 0.12, 1.5, 3.2, 0x1a1418); K.signs2.add("west", cx + s * 5.14, 7.9, cz, 2.9, { ry: s * 90, height: 1.3 });
    // 양옆 낮은 성벽의 성가퀴
    for (const e of [-1, 1]) for (let k = 0; k < 5; k++) P(w, cx + s * 2.2, 5.5, cz + e * (14 + k * 2), 0.6, 0.8, 1.1, 0x8c8478, { mat: "std:rock", tile: 6 });
    // 석등(진입로 양옆)과 깃대
    for (const e of [-1, 1]) {
      const x = cx + s * 12.5, z = cz + e * 6.2;
      P(w, x, GY, z, 0.7, 0.9, 0.7, 0x8c8478, { mat: "std:rock", tile: 3 }); glow(w, x, GY + 0.9, z, 0.5, 0.5, 0.5, dim(WARM, 0.8)); hip(w, x, GY + 1.4, z, 1.0, 0.45, 1.0, 0x4a4640, { col: false });
      w.pool(x, 0.2, z, 3.2, WARM, 0.4);
      // 오방색 깃발(장대에서 늘어뜨린다)
      const bx = cx + s * 11, bz = cz + e * 10.5;
      bar(w, bx, GY, bz, bx, 8.2, bz, 0.07, 0x5a2a24, "paint", 5); bar(w, bx, 8.0, bz - 0.75, bx, 8.0, bz + 0.75, 0.04, 0x5a2a24, "paint", 4);
      K.flags.push({ x: bx, y: 7.95, z: bz, h: 4.4, len: 1.2, c: [0xc0392b, 0x2f6fd0, 0xe8c040, 0xf2f2f2][(s + 1) + (e + 1) / 2], kind: "banner", ry: 90 });
    }
  }
  // 용마루와 취두
  P(w, cx, 22.5, cz, 0.5, 0.5, 6.9, 0xd8d2c4); for (const e of [-1, 1]) P(w, cx, 22.5, cz + e * 3.5, 0.6, 1.1, 0.5, 0xd8d2c4);
  for (const s of [-1, 1]) for (const e of [-1, 1]) { P(w, cx + s * 6.3, 13.0, cz + e * 14.8, 0.5, 0.9, 0.5, 0xd8d2c4, { ry: 45 }); P(w, cx + s * 4.6, 19.0, cz + e * 10.3, 0.45, 0.8, 0.45, 0xd8d2c4, { ry: 45 }); }
}

// ── 야시장 뒷골목(길 쪽 외벽): 실외기·홈통·뒷문·간판·잡동사니 ──
function marketBack(w, K) {
  const r = w.rand, IDS = ["chicken", "tteok", "parking"], IDS1 = ["noodle", "cafe", "sing", "pharm", "mart", "fish", "arcade", "post"];
  let n = 0;
  for (const cx of [-120, -60]) for (const s of [-1, 1]) {
    const face = 120 + s * 20.06, ry = s > 0 ? 0 : 180;
    for (let x = cx - 20; x <= cx + 20; x += 5) {
      const px = x + (r() - 0.5) * 2;
      P(w, px, 4.2 + r() * 2.5, face + s * 0.25, 0.9, 0.7, 0.45, 0x8a909c, { mat: "std:panel", tile: 2 });                 // 실외기
      if (r() < 0.5) P(w, px + 1.6, GY, face + s * 0.1, 0.14, 6 + r() * 2, 0.14, 0x4a505c);                                    // 홈통
      if (r() < 0.55) { glow(w, px - 1.4, GY, face + s * 0.02, 0.9, 2.0, 0.06, dim(WARM, 0.32)); P(w, px - 1.4, 2.5, face + s * 0.5, 1.5, 0.08, 1.0, 0x20242c); w.pool(px - 1.4, 0.2, face + s * 1.8, 2.6, WARM, 0.3); }
      if (r() < 0.45) { const two = r() < 0.5; (two ? K.signs2 : K.signs).add(two ? IDS[n % 3] : IDS1[n % 8], px, 5.2 + r() * 1.5, face + s * 0.1, 3.6, { ry }); n++; }
      if (r() < 0.6) ITEM[pick(w, ["crates", "bin", "scooter", "crates", "aframe"])](w, ob(w, px + 0.6, face + s * 1.1, ry + (r() - 0.5) * 30), K);
    }
  }
  // 등불 골목 좌판의 김 나는 솥(연기는 city-fx)
  for (const [x, sd] of [[-74, 1], [-62, -1], [-50, 1], [-44, -1]]) { const z = 120 + sd * 3.1; P(w, x, GY, z, 1.6, 0.9, 0.9, 0x5a4a3a, { mat: "std:wood", tile: 2 }); w.cyl(x, GY + 0.9, z, 0.38, 0.3, 0x2c3138, { col: false }); glow(w, x, GY + 0.86, z + (z > 120 ? -0.47 : 0.47), 1.2, 0.1, 0.03, ORG); K.steam.push([x, GY + 1.3, z, 0.5, 2.6]); }
}

// ── 달빛 공원: 연못 가장자리 돌·꽃밭·벤치·오솔길 등 ──
function parkPlus(w, K, cx, cz) {
  const r = w.rand;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283 + r() * 0.2; w.blob(cx + Math.cos(a) * 8.9, 0.5, cz + Math.sin(a) * 8.9, 0.7 + r() * 0.5, 0.4, 0.6 + r() * 0.4, 0x7a8090, { mat: "std:rock", col: false, grad: [0.7, 1.05] }); }
  for (const [x, z, c] of [[-14, -9, 0xff8ad0], [13, -11, YEL], [-13, 10, 0xc9a0ff], [6, -16, 0xffffff], [-6, 15, ORG]]) {
    w.blob(cx + x, 0.3, cz + z, 2.4, 0.5, 1.7, 0x2f6a3c, { mat: "foliage", col: false });
    for (let k = 0; k < 7; k++) glow(w, cx + x + (r() - 0.5) * 3.6, 0.72 + r() * 0.1, cz + z + (r() - 0.5) * 2.4, 0.16, 0.14, 0.16, dim(c, 0.55));
  }
  for (const [x, z, ry] of [[-13, -2.7, 0], [13, -2.7, 0], [-13, 2.7, 180], [13, 2.7, 180], [-19, 2.7, 180], [19, -2.7, 0]]) ITEM.bench(w, ob(w, cx + x, cz + z, ry));
  // 길가 낮은 등(동서 산책로를 따라)
  for (let x = -20; x <= 20; x += 8) for (const s of [-1, 1]) { if (Math.abs(x) < 9) continue; glow(w, cx + x, 0.2, cz + s * 2.0, 0.14, 0.5, 0.14, dim(0xd8ffd0, 0.8)); w.pool(cx + x, 0.25, cz + s * 2.0, 2.4, GRN, 0.18); }
  K.signs2.add("park", cx - 22.6, 2.3, cz - 8, 5, { ry: -90, back: true }); for (const k of [-2, 2]) bar(w, cx - 22.6, GY, cz - 8 + k, cx - 22.6, 3.4, cz - 8 + k, 0.07, DARK);
  K.fountain = [cx, 0.74, cz, 6.6];
}

// ── 대관람차·공연장: 매표소·푸드트럭·줄등·풍선·스피커·옆 전광판 ──
function fairPlus(w, K, near) {
  const r = w.rand, cx = 120, cz = 120;
  // 매표소
  P(w, cx - 8.5, GY, cz + 19.5, 3.4, 2.7, 2.6, 0x8a2f5a, { mat: "paint" }); hip(w, cx - 8.5, GY + 2.7, cz + 19.5, 4.4, 1.3, 3.6, 0xffe14a, { mat: "paint", col: false });
  glow(w, cx - 8.5, GY + 1.1, cz + 18.17, 2.2, 1.0, 0.06, dim(WARM, 0.7)); w.pool(cx - 8.5, 0.2, cz + 17, 3.5, WARM, 0.4);
  for (let k = 0; k < 6; k++) K.blink.push([cx - 10 + k * 0.6, GY + 2.62, cz + 18.1, 0.16, k % 2, k % 2 ? YEL : MAG]);
  // 푸드트럭 2대
  for (const [z, c] of [[-5, 0x3fae9a], [5, 0xe0703a]]) {
    const f = ob(w, cx + 17.5, cz + z, -90);
    f(0, GY + 0.45, 0, 4.6, 2.3, 2.1, c, { mat: "paint" }); f(-3.0, GY + 0.45, 0, 1.5, 1.7, 2.0, 0xdfe3ea, { mat: "paint" }); f(0, GY + 1.2, 1.07, 2.6, 1.0, 0.06, dim(WARM, 0.7), { mat: "glow" });
    f(0, GY + 2.3, 1.7, 3.0, 0.08, 1.3, 0xf2f2f2, { rx: 14 }); for (const k of [-1.6, 1.4, -3.1]) f(k, GY, 0.9, 0.3, 0.7, 0.7, 0x101114);
    const [px, pz] = f.pos(0, 2.6); w.pool(px, 0.2, pz, 3.6, WARM, 0.45); K.steam.push([f.pos(1.6, 0)[0], GY + 2.9, f.pos(1.6, 0)[1], 0.4, 2.2]);
  }
  // 천막 사이 줄등
  const tz = [-15, -5, 6, 16];
  for (let k = 0; k < 3; k++) for (let m = 0; m <= 6; m++) { const t = m / 6, z = cz + tz[k] + (tz[k + 1] - tz[k]) * t, y = 4.3 - Math.sin(t * Math.PI) * 0.6; K.blink.push([cx - 17, y, z, 0.17, m % 2, NEON[(m + k) % 6]]); }
  for (let k = 0; k < 3; k++) bar(w, cx - 17, 4.25, cz + tz[k], cx - 17, 4.25, cz + tz[k + 1], 0.02, 0x1c1f27, "paint", 4);
  // 풍선 다발
  for (const [x, z] of [[cx - 6.4, cz + 18], [cx + 12, cz - 20], [cx - 20.5, cz + 0.5]]) for (let k = 0; k < 5; k++) {
    const bx = x + (r() - 0.5) * 0.9, by = 2.7 + r() * 1.1, bz = z + (r() - 0.5) * 0.9;
    w.mesh(G.sph(), TRS(bx, by, bz, 0, 0.3, 0.38, 0.3), pick(w, [0xff5a7a, 0xffd23a, 0x4ad0ff, 0x7aff8a, 0xc98aff]), "paint"); bar(w, x, 0.9, z, bx, by - 0.35, bz, 0.012, 0xdfe3ea, "paint", 3);
  }
  // 승강장 대기줄 난간
  for (const s of [-1, 1]) { bar(w, cx - 4.6, 1.0, cz + s * 9.5, cx - 9.5, 1.0, cz + s * 9.5, 0.04, 0x9aa0a8, "metal", 4); for (const k of [-4.6, -7, -9.5]) bar(w, cx + k, GY, cz + s * 9.5, cx + k, 1.0, cz + s * 9.5, 0.04, 0x9aa0a8, "metal", 4); }
  // 공연장: 스피커 더미, 옆 전광판, 무대 앞 조명 띠
  const sx = 120, sz = 180;
  for (const s of [-1, 1]) {
    const x = sx + s * 19.5;
    for (let k = 0; k < 4; k++) P(w, x, GY + k * 1.5, sz + 8, 2.2, 1.45, 1.8, k % 2 ? 0x1c1f27 : 0x262a34);
    for (let k = 0; k < 4; k++) glow(w, x, GY + 0.45 + k * 1.5, sz + 7.08, 1.1, 0.5, 0.04, dim(k % 2 ? MAG : CYA, 0.35));
    P(w, sx + s * 19.5, 7.2, sz + 14, 5.4, 5.6, 0.3, 0x12151c); K.signs2.add("onair", sx + s * 19.5, 10, sz + 13.82, 5, { ry: 180 });
    bar(w, sx + s * 19.5, GY, sz + 14.2, sx + s * 19.5, 7.2, sz + 14.2, 0.2, 0x3a3f48);
    for (let k = 0; k < 8; k++) K.blink.push([sx + s * (2 + k * 1.8), 1.72, sz + 6.05, 0.18, k % 2, s > 0 ? CYA : MAG]);
  }
  for (let i = 0; i < 6; i++) K.beams.push([sx - 12.5 + i * 5, 1.7, sz + 15.5, sx - 12.5 + i * 5 + (i - 2.5) * 2.4, 15.4, sz + 9, 0.25, 1.6, NEON[(i + 2) % 6], 0.09]);
  for (let k = -3; k <= 3; k++) P(w, sx + k * 4.2, GY, sz - 13.5, 3.6, 1.05, 0.12, 0x596273);                                  // 객석 뒤 가림막
}

// ── 공사장: 가림벽·현장 사무실 창·굴착기·자재·난간·경광등 ──
function sitePlus(w, K, near) {
  const HZ = { mat: "std:hazard", tile: 2 }, r = w.rand;
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0) / DEG, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    P(w, x, GY, z, len, 1.9, 0.1, 0xcfd3da, { ry, mat: "std:corrug", tile: 2 }); P(w, x, GY + 1.9, z, len, 0.3, 0.12, 0xdadada, { ry, ...HZ });
  };
  fence(98, -142.4, 142, -142.4); fence(142.4, -142, 142.4, -130); fence(142.4, -118, 142.4, -106); fence(97.6, -142, 97.6, -126); fence(97.6, -114, 97.6, -98); fence(98, -97.6, 114, -97.6); fence(126, -97.6, 134, -97.6);
  K.signs2.add("safe", 106, 1.3, -97.52, 4.4, { ry: 0, height: 1.3 }); K.signs2.add("safe", 142.48, 1.3, -112, 4.4, { ry: 90, height: 1.3 });
  for (const [x, z] of [[114, -97.6], [126, -97.6], [142.4, -130], [142.4, -118], [97.6, -126], [97.6, -114]]) { P(w, x, GY, z, 0.2, 2.5, 0.2, 0x3a3f48); K.blink.push([x, GY + 2.6, z, 0.2, (x + z) & 1, ORG]); }
  // 현장 사무실(쌓인 컨테이너)의 창과 계단
  for (const y of [0.9, 3.5]) { for (const k of [-3.4, 0, 3.4]) glow(w, 108 + k, y + 0.3, -100.26, 1.6, 0.8, 0.04, dim(k ? WARM : CYA, 0.5)); }
  w.pool(108, 0.2, -98.6, 6, WARM, 0.4);
  // 간이 화장실
  for (const k of [0, 1.4]) { P(w, 131.5 + k, GY, -100, 1.2, 2.3, 1.2, 0x2f6fa0, { mat: "paint" }); P(w, 131.5 + k, GY + 2.3, -100, 1.3, 0.12, 1.3, 0xdfe3ea); }
  // 굴착기(흙더미 옆)
  { const f = ob(w, 124.5, -137.5, 70);
    for (const s of [-1, 1]) f(s * 1.1, GY, 0, 0.6, 0.8, 3.6, 0x1c1f27);
    f(0, GY + 0.8, 0, 2.4, 1.2, 2.6, YEL, { mat: "paint" }); f(-0.5, GY + 2.0, 0.4, 1.2, 1.3, 1.4, 0x1c2430); f(-0.5, GY + 2.2, 1.12, 0.9, 0.8, 0.04, dim(WARM, 0.4), { mat: "glow" });
    const [ax, az] = f.pos(0.6, 1.0), [bx, bz] = f.pos(0.6, 4.2), [ex, ez] = f.pos(0.6, 5.6);
    bar(w, ax, GY + 1.8, az, bx, GY + 4.4, bz, 0.22, YEL, "paint", 6); bar(w, bx, GY + 4.4, bz, ex, GY + 1.4, ez, 0.17, YEL, "paint", 6);
    P(w, ex, GY + 0.6, ez, 0.9, 0.8, 0.8, 0x3a3f48, { ry: 70 }); }
  // 슬래브 위 자재(비행선이 지나는 칸은 비운다)
  for (const [x, y, z] of [[132, 6.5, -112], [130, 6.5, -110.5], [114, 6.5, -112], [132, 12.5, -113], [113.5, 12.5, -129], [106, 24.5, -112], [110, 24.5, -128], [114, 24.5, -118], [126.5, 18.5, -112]]) {
    if (near(x, z, 3.2, y + 6) && y < 20) continue;
    P(w, x, y, z, 1.3, 0.14, 1.1, 0x8a6a4a, { mat: "std:wood", tile: 2 }); P(w, x, y + 0.14, z, 1.15, 0.5 + r() * 0.5, 0.95, pick(w, [0xb9b2a4, 0x9aa0a8, 0xa8763a]), { ry: r() * 20 });
  }
  for (const [x, y, z] of [[108, 24.5, -122], [130, 6.5, -114.5]]) for (let k = 0; k < 5; k++) bar(w, x - 3, y + 0.12 + (k % 2) * 0.14, z + k * 0.16, x + 3, y + 0.12 + (k % 2) * 0.14, z + k * 0.16, 0.05, 0x8a4a3a, "metal", 4);
  // 북쪽 슬래브 끝 안전 난간과 꼭대기 층 난간
  for (const [y, x1] of [[6.5, 136.5], [12.5, 136.5], [18.5, 128.5], [24.5, 116.5]]) for (const dy of [0.55, 1.1]) bar(w, 103.5, y + dy, -132.4, x1, y + dy, -132.4, 0.035, ORG, "paint", 4);
  for (const dy of [0.55, 1.1]) { bar(w, 103.6, 24.5 + dy, -132.4, 103.6, 24.5 + dy, -107.6, 0.035, ORG, "paint", 4); bar(w, 116.4, 24.5 + dy, -132.4, 116.4, 24.5 + dy, -107.6, 0.035, ORG, "paint", 4); }
  // 크레인 팔의 표시등, 용접 불꽃 자리, 원뿔
  const a = Math.atan2(-123 + 101, 108 - 140), jx = Math.cos(a), jz = Math.sin(a);
  for (let k = 1; k <= 7; k++) K.blink.push([140 + jx * k * 6.5, 80.2, -101 + jz * k * 6.5, 0.2, k % 2, k % 2 ? RED : WARM]);
  K.weld = [[112, 18.9, -108.6], [128, 12.9, -131.4]];
  for (const [x, z] of [[101, -112], [118, -100.5], [138, -122], [112, -139]]) ITEM.cones(w, ob(w, x, z, r() * 90));
}

// ── 돔 경기장: 출입구·현수 간판·깃대 ──
function domePlus(w, K, cx, cz) {
  for (let i = 0; i < 4; i++) {
    const a = i * 90 + 45, f = ob(w, cx + Math.sin(a * DEG) * 20.7, cz + Math.cos(a * DEG) * 20.7, a);
    f(0, GY, 0.2, 6, 4.2, 1.2, 0x2a3040); f(0, GY, 0.83, 4.4, 3.2, 0.06, dim(WARM, 0.6), { mat: "glow" }); f(0, 4.4, 0.9, 7, 0.3, 2.4, 0x20242c);
    f(0, 4.3, 2.0, 6.6, 0.1, 0.12, CYA, { mat: "glow" });
    const [sx, sz] = f.pos(0, 2.16); K.signs2.add("dome", sx, 5.6, sz, 5.6, { ry: a, height: 1.7 }); f(0, 4.7, 2.0, 6, 1.9, 0.2, 0x12151c);
    const [px, pz] = f.pos(0, 4.5); w.pool(px, 0.2, pz, 6, WARM, 0.4);
  }
  for (let i = 0; i < 6; i++) { const x = cx - 15 + i * 6, z = cz + 21.6; bar(w, x, GY, z, x, 8.2, z, 0.07, 0xdfe3ea, "metal", 5); K.flags.push({ x, y: 6.4, z, h: 1.6, len: 2.6, c: NEON[i], kind: "flag", ry: 0 }); }
}

// ── 호텔: 차 대는 캐노피·깃발·옥상 수영장 등 ──
function hotelPlus(w, K, cx, cz) {
  P(w, cx, 4.0, cz - 21.5, 12, 0.3, 3.6, 0x2a2634); glow(w, cx, 3.92, cz - 23.2, 11.6, 0.1, 0.12, VIO); glow(w, cx, 3.94, cz - 21.5, 9, 0.05, 2.2, dim(WARM, 0.5));
  for (const k of [-5.4, 5.4]) P(w, cx + k, GY, cz - 23, 0.3, 3.9, 0.3, 0xc9b98a, { mat: "metal" });
  glow(w, cx, GY, cz - 20.06, 6, 3, 0.08, dim(WARM, 0.55)); P(w, cx, GY, cz - 21.6, 4, 0.05, 3, 0x7a2f3a); w.pool(cx, 0.2, cz - 22.5, 8, WARM, 0.45);
  for (let i = 0; i < 3; i++) { const x = cx - 14 - i * 2.2, z = cz - 22.4; bar(w, x, GY, z, x, 7.6, z, 0.06, 0xdfe3ea, "metal", 5); K.flags.push({ x, y: 6.0, z, h: 1.4, len: 2.3, c: [VIO, 0xf2f2f2, YEL][i], kind: "flag", ry: 0 }); }
}

// ── 팀 기지 터: 바닥 표시와 모서리 등(가운데 30m 는 비워 둔다) ──
function basePlus(w, K, cx, cz, c) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = cx + sx * 21.6, z = cz + sz * 21.6;
    P(w, x, GY, z, 0.5, 1.1, 0.5, DARK); K.blink.push([x, GY + 1.25, z, 0.28, (sx * sz) > 0 ? 0 : 1, c]);
    for (const k of [1, 2, 3]) { P(w, x - sx * k * 1.6, GY, z - sz * 0.3, 0.5, 0.03, 2.4, dim(c, 0.35), { ry: sx * sz * 35, ao: false }); }
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + 0.26; P(w, cx + Math.cos(a) * 16.8, GY, cz + Math.sin(a) * 16.8, 2.2, 0.03, 0.3, dim(c, 0.4), { ry: -a / DEG, ao: false }); }
  // 맵 바깥쪽 두 변의 낮은 방호벽
  const ox = Math.sign(cx), oz = Math.sign(cz);
  P(w, cx + ox * 22.3, GY, cz, 0.5, 1.2, 40, 0x4a505c, { mat: "std:concrete", tile: 4 }); glow(w, cx + ox * 22.0, GY + 1.0, cz, 0.06, 0.1, 40, dim(c, 0.8));
  P(w, cx, GY, cz + oz * 22.3, 40, 1.2, 0.5, 0x4a505c, { mat: "std:concrete", tile: 4 }); glow(w, cx, GY + 1.0, cz + oz * 22.0, 40, 0.1, 0.06, dim(c, 0.8));
  K.flags.push({ x: cx + ox * 22.3, y: 4.6, z: cz + oz * 22.3, h: 1.8, len: 3, c, kind: "flag", ry: 0 }); bar(w, cx + ox * 22.3, GY, cz + oz * 22.3, cx + ox * 22.3, 6.6, cz + oz * 22.3, 0.08, 0xdfe3ea, "metal", 5);
}

// ── 천변: 옹벽 버팀띠·배수구·벤치·계단·갈대·안내판·구명환 ──
function streamPlus(w, K) {
  const r = w.rand, weir = (x) => Math.abs(x + 124) < 4 || Math.abs(x - 174) < 4;
  const STAIRS = [[-118, -1, 1], [-64.5, 1, -1], [103, -1, 1], [176, 1, 1]];        // [아래 끝 x, 벽 쪽(±1), 오르는 방향]
  const onStair = (x, s) => STAIRS.some(([x0, ss, d]) => ss === s && (x - x0) * d > -2 && (x - x0) * d < 15);
  for (const s of [-1, 1]) {
    const wz = 60 + s * 10.98, ry = s < 0 ? 0 : 180;
    for (let x = -205; x <= 205; x += 10) P(w, x, -5, 60 + s * 10.86, 0.6, 4.95, 0.28, 0x3e434e, { ao: false });          // 버팀띠
    P(w, 0, -3.3, wz, 420, 0.12, 0.08, 0x30343d); P(w, 0, -0.5, 60 + s * 10.9, 420, 0.45, 0.3, 0x5a606c);
    for (let x = -180; x <= 195; x += 40) { P(w, x, -4.7, 60 + s * 10.8, 1.0, 1.0, 0.4, 0x23262d); glow(w, x, -4.5, 60 + s * 10.58, 0.6, 0.6, 0.04, dim(GRN, 0.22)); P(w, x, -4.98, 60 + s * 9.4, 0.5, 0.03, 2.6, 0x2a3a40, { ao: false }); }
    for (let x = -190; x <= 195; x += 30) if (!weir(x) && !onStair(x, s)) ITEM.bench(w, ob(w, x, 60 + s * 10.45, ry, -5 - GY));
    // 물가 갈대
    for (let x = -200; x <= 200; x += 7 + r() * 9) {
      if (weir(x)) continue;
      for (let k = 0; k < 4; k++) { const hx = x + (r() - 0.5) * 2.2, hh = 0.9 + r() * 0.9; w.mesh(G.cone(6, 0.15), TRS(hx, -5.55 + hh / 2, 60 + s * (7.25 + r() * 0.35), 0, 0.1, hh, 0.1, (r() - 0.5) * 16, (r() - 0.5) * 16), new THREE.Color().setHSL(0.24 + r() * 0.07, 0.45, 0.2 + r() * 0.07).getHex(), "foliage"); }
    }
    // 구명환 기둥
    for (let x = -165; x <= 165; x += 66) { const z = 60 + s * 7.75; P(w, x, -5, z, 0.1, 1.3, 0.1, 0xdfe3ea); ring(w, x, -3.95, z, 0.3, 0.08, ORG, { axis: "z", col: false, seg: 10, sides: 4, mat: "paint" }); }
    // 벽 안내판과 벽등
    for (const x of [-160, -70, 50, 140]) K.signs2.add("walk", x + (s > 0 ? 10 : 0), -2.0, wz - s * 0.06, 5.2, { ry, height: 1.5 });
    for (let x = -200; x <= 200; x += 20) glow(w, x, -0.95, 60 + s * 10.66, 0.5, 0.12, 0.1, dim(WARM, 0.7));
  }
  // 길에서 산책로로 내려가는 계단(벽에 붙여서)
  for (const [x0, s, d] of STAIRS) {
    const z = 60 + s * 10.3;
    for (let k = 0; k < 12; k++) P(w, x0 + d * k * 0.9, -5, z, 0.9, 0.42 * (k + 1), 1.3, 0x5f6570, { mat: "std:concrete", tile: 3, ao: false });
    P(w, x0 + d * 11.65, -5, z, 1.7, 5.04, 1.3, 0x5f6570, { mat: "std:concrete", tile: 3 });
    bar(w, x0, -3.9, z - s * 0.6, x0 + d * 10.8, 0.9, z - s * 0.6, 0.04, 0x9aa0a8, "metal", 4);
    glow(w, x0 + d * 5.4, -2.3, z - s * 0.67, 11.6, 0.05, 0.04, dim(s < 0 ? CYA : MAG, 0.7), { rz: d * 25 });
  }
}

// ── 맵 바깥 원경: 이어지는 블록·먼 스카이라인·능선·사장교 ──
function outskirts(w, K) {
  const r = w.rand, COOL = [0x6f7a8c, 0x5d6678, 0x66758a, 0x566a7a, 0x4f5a70, 0x7a8496], MID = [0x7a7384, 0x80796e, 0x6c7480, 0x77706a];
  const lit = (x, y, z, sx, sy, sz, c, col) => w.box(x, y, z, sx, sy, sz, c, { mat: "lit:facadelit", tile: 24, ao: false, col });
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const ring4 = Math.max(Math.abs(i), Math.abs(j));
    if (ring4 < 4 || j === 1) continue;
    const cx = i * 60, cz = j * 60, near4 = ring4 === 4;
    P(w, cx, 0, cz, 46, 0.18, 46, 0x464a54, { mat: "std:concrete", tile: 5 });
    const n = r() < 0.45 ? 2 : 1, ns = r() < 0.5, hmax = near4 ? 34 : 52;
    for (let k = 0; k < n; k++) {
      const s = n === 2 ? (k ? 1 : -1) : 0, wd = n === 2 ? (ns ? 17 : 38) : 30 + r() * 8, dp = n === 2 ? (ns ? 38 : 17) : 30 + r() * 8, h = 10 + r() * r() * hmax + (near4 ? 0 : 6);
      const x = cx + (ns ? s * 11 : 0), z = cz + (ns ? 0 : s * 11), nc = pick(w, NEON);
      lit(x, 0, z, wd, h, dp, pick(w, r() < 0.5 ? COOL : MID), near4);
      P(w, x, h, z, wd + 0.6, 0.7, dp + 0.6, 0x343943);
      if (r() < 0.45) for (const e of [-1, 1]) { glow(w, x, h + 0.5, z + e * dp * 0.485, wd * 0.97, 0.25, 0.25, nc); glow(w, x + e * wd * 0.485, h + 0.5, z, 0.25, 0.25, dp * 0.97, nc); }
      if (r() < 0.5) { const e = r() < 0.5 ? 1 : -1; glow(w, x + e * (wd / 2 + 0.25) * (ns ? 0 : 1) + (ns ? (r() - 0.5) * wd * 0.5 : 0), h * 0.45, z + (ns ? e * (dp / 2 + 0.25) : (r() - 0.5) * dp * 0.5), ns ? 2 : 0.4, Math.min(h * 0.4, 12), ns ? 0.4 : 2, nc); }
      if (r() < 0.6) P(w, x + (r() - 0.5) * (wd - 8), h + 0.7, z + (r() - 0.5) * (dp - 8), 3 + r() * 3, 1.4 + r() * 1.4, 3 + r() * 3, 0x5a616c);
      if (h > 44) K.beacons.push([x, h + 2, z, 0.7]);
    }
    w.pool(cx + (r() - 0.5) * 30, 0.2, cz + (r() < 0.5 ? 21 : -21), 9, r() < 0.6 ? WARM : pick(w, NEON), 0.3);
  }
  // 먼 스카이라인 둘째 겹(안개에 잠긴 실루엣)
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * 6.283 + r() * 0.07, d = 500 + r() * 210, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 30 + r() * 30, h = 36 + r() * r() * 150;
    if (Math.abs(z - 60) < 40 || Math.abs(z - 150) < 26) continue;
    w.box(x, 0, z, s, h, s * (0.7 + r() * 0.5), pick(w, COOL), { mat: "lit:facadelit", tile: 24, ao: false, col: false, ry: r() * 40 });
    if (h > 80) { K.beacons.push([x, h + 2, z, 1.6]); if (r() < 0.6) w.box(x, h, z, s * 0.45, 12 + r() * 16, s * 0.4, 0x4f5a70, { mat: "lit:facadelit", tile: 24, ao: false, col: false }); }
    if (r() < 0.35) glow(w, x, h + 0.2, z, s * 0.9, 0.8, 0.8, pick(w, NEON), { ry: r() * 90 });
  }
  // 능선: 겹쳐진 어두운 산
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.283 + 0.35 + r() * 0.25, d = 830 + r() * 160, R = 200 + r() * 170, h = 60 + r() * 110;
    w.cone(Math.cos(a) * d, 0, Math.sin(a) * d, R, h, i % 2 ? 0x0d1326 : 0x121a30, { col: false, mat: "flat", grad: [0.7, 1.2] });
    if (i % 5 === 2) { const x = Math.cos(a) * d, z = Math.sin(a) * d; w.pipe(x, h - 3, z, x, h + 34, z, 1.6, 0x3a4660, { col: false }); K.beacons.push([x, h + 36, z, 2.6]); }
  }
  // 동쪽 하류의 사장교(천변 위, 멀리)
  for (const bx of [330, -350]) {
    P(w, bx, 3, 60, 16, 1.4, 120, 0x474c57); for (const s of [-1, 1]) glow(w, bx + s * 8, 4.6, 60, 0.3, 0.3, 120, dim(WARM, 0.8));
    for (const s of [-1, 1]) { P(w, bx, 0, 60 + s * 16, 5, 78, 4, 0x8a93a8, { ao: false }); K.beacons.push([bx, 80, 60 + s * 16, 1.2]); }
    for (const s of [-1, 1]) for (const e of [-1, 1]) for (let k = 1; k <= 5; k++) bar(w, bx + e * 3, 78 - k * 9, 60 + s * 16, bx + e * 6, 4.6, 60 + s * (16 + k * 9), 0.18, dim(bx > 0 ? CYA : MAG, 0.6), "glow", 4);
  }
}

// ── 덧붙임: 승강기 레일, 고가도로 표지 문, 정류장 표지 ──
function extras(w, K) {
  // 유리 승강기 레일(움직이는 칸은 city-fx)
  K.lifts = [
    { x: 60, z: 14.2, h: 60, nx: 0, nz: 1 }, { x: 120, z: -14.2, h: 52, nx: 0, nz: -1 }, { x: 75.2, z: -60, h: 50, nx: 1, nz: 0 }, { x: 135.2, z: -60, h: 54, nx: 1, nz: 0 },
    { x: -15.2, z: -60, h: 56, nx: -1, nz: 0 }, { x: 15.2, z: -60, h: 56, nx: 1, nz: 0 }, { x: 68, z: 99.8, h: 34, nx: 0, nz: -1 }, { x: 52, z: 140.2, h: 25, nx: 0, nz: 1 },
  ];
  for (const l of K.lifts) for (const e of [-1, 1]) P(w, l.x + (l.nz ? e * 1.0 : l.nx * 0.08), 3.6, l.z + (l.nx ? e * 1.0 : l.nz * 0.08), 0.14, l.h - 3.6, 0.14, 0x20242c, { ao: false });
  // 고가도로 표지 문(차로 위)
  for (const x of [-180, -60, 60, 180]) {
    for (const s of [-1, 1]) P(w, x, 10, 150 + s * 5.5, 0.3, 5.6, 0.3, 0x596273);
    P(w, x, 15.3, 150, 0.4, 0.4, 11.4, 0x596273); P(w, x, 13.2, 150, 0.2, 2.0, 9.4, 0x1d5a3a, { mat: "paint" });
    for (const s of [-1, 1]) glow(w, x + s * 0.12, 13.6, 150 - 2.2, 0.03, 0.9, 3.4, dim(0xffffff, 0.45));
    for (const s of [-1, 1]) glow(w, x + s * 0.12, 13.6, 150 + 2.6, 0.03, 0.9, 2.2, dim(YEL, 0.45));
  }
  // 고가도로 가로등(난간 위 작은 불빛)
  for (let x = -235; x <= 235; x += 30) for (const s of [-1, 1]) { P(w, x, 10.9, 150 + s * 5.8, 0.12, 2.6, 0.12, 0x596273); glow(w, x, 13.5, 150 + s * 5.2, 0.3, 0.1, 1.0, WARM); w.pool(x, 10.02, 150 + s * 3, 5.5, WARM, 0.3); }
}

export function detail(w, K, def) {
  const near = flightLines(def);
  K.signs2 = new Signs(w, SIGNS2);
  K.beams = []; K.flags = []; K.blink = []; K.steam = []; K.weld = [];
  walks(w, K, near); roads(w, K); towers(w, K, near); apts(w, K);
  spirePlus(w, K); gatePlus(w, K, -180, 120); marketBack(w, K); parkPlus(w, K, 0, 120); fairPlus(w, K, near); sitePlus(w, K, near);
  domePlus(w, K, 0, -180); hotelPlus(w, K, 60, 120); basePlus(w, K, 180, -180, RED); basePlus(w, K, -180, 180, 0x2f8cff);
  streamPlus(w, K); extras(w, K); outskirts(w, K);
  K.signs2.finish(0.05);
}
