// 드론 리그 스타디움 — 엄폐물: 라인 옆 에너지 방벽(마디마다 틈) · 라인 가장자리 장갑 격벽 · 타워 곁 엄폐 블록 · 정글 캠프를 감싸는 벽(네 갈래 길목)
//  · 시야를 끊는 높은 기둥 · 라인을 가로지르는 고가 다리. 배치는 청 쪽 반만 만들고 원점 대칭(x, z → -x, -z)으로 홍 쪽에 똑같이 둔다
//  · 라인 중심(미니드론 길) · 타워 · 빛 고리 · 캠프 자리 · 숨은 상자 · 기지 · 보스 구덩이 · 센터 서킷 고리 길은 비워 둔다 (fits)
//  조각: { k, x, z, ry(도, 길이 방향 = 로컬 +z), L(길이), T(두께), H(높이), y0(바닥에서 띄운 높이), team(0 청 쪽 · 1 홍 쪽) }
import { BASES, BASE_R, LANES, TOWERS, CAMPS, CACHES, PIT, RING_R, along, laneLength, laneDist, laneHoops, DEG,
  CYAN, MAG, AMB, VIO, TB, TR, DARK, DARK2, STEEL, PANEL } from "./stadium-kit.js";
import { ring } from "./moon-kit.js";

const LIM = 425;                                                   // 경기장 담장 안쪽 여유
const CACHE_R = { tunnel: 24, floating: 22, arch: 18, tower: 12 };
const tangent = (pts, d, len) => { const [x1, z1] = along(pts, Math.max(0, d - 2) / len), [x2, z2] = along(pts, Math.min(len, d + 2) / len), l = Math.hypot(x2 - x1, z2 - z1) || 1; return [(x2 - x1) / l, (z2 - z1) / l]; };
const yaw = (ux, uz) => Math.atan2(ux, uz) / DEG;

// 조각의 바닥 선분을 2 m 간격 점으로
function samples(p) {
  const n = Math.max(1, Math.ceil(p.L / 2)), ux = Math.sin(p.ry * DEG), uz = Math.cos(p.ry * DEG), out = [];
  for (let i = 0; i <= n; i++) { const t = (i / n - 0.5) * p.L; out.push([p.x + ux * t, p.z + uz * t]); }
  return out;
}
// 비워 둘 곳과의 거리 검사. o.lane: 라인 중심에서 떨어질 거리, o.own: 그 라인만 예외 거리
function fits(p, list, o = {}) {
  const pts = samples(p), half = p.T / 2, hoops = Object.keys(LANES).flatMap((id) => laneHoops(id));
  for (const [x, z] of pts) {
    if (Math.max(Math.abs(x), Math.abs(z)) + half > (o.lim ?? LIM)) return false;
    if (Math.hypot(x, z) - half < PIT.r1 + 16) return false;
    if (Math.abs(Math.hypot(x, z) - RING_R) - half < 26) return false;             // 센터 서킷 고리 길
    for (const b of BASES) if (Math.hypot(x - b[0], z - b[1]) - half < BASE_R + 16) return false;
    for (const [id, l] of Object.entries(LANES)) if (laneDist(l, x, z) - half < (id === o.ownLane && o.own !== undefined ? o.own : o.lane ?? 26)) return false;
    for (const tw of Object.values(TOWERS).flat()) if (Math.hypot(x - tw.p[0], z - tw.p[1]) - half < (o.tower ?? 16)) return false;
    for (const h of hoops) if (Math.hypot(x - h.p[0], z - h.p[1]) - half < 22) return false;
    if (!o.camp) for (const c of CAMPS) if (Math.hypot(x - c.p[0], z - c.p[1]) - half < (c.big ? 30 : 26)) return false;
    for (const c of CACHES) if (Math.hypot(x - c.p[0], z - c.p[2]) - half < CACHE_R[c.where] + 8) return false;
    for (const q of list) if (q !== p && segDist(x, z, q) - half < (o.gap ?? 8)) return false;
  }
  return true;
}
function segDist(x, z, q) {
  const ux = Math.sin(q.ry * DEG), uz = Math.cos(q.ry * DEG), t = Math.max(-q.L / 2, Math.min(q.L / 2, (x - q.x) * ux + (z - q.z) * uz));
  return Math.hypot(x - q.x - ux * t, z - q.z - uz * t) - q.T / 2;
}

function layout() {
  const out = [];
  const add = (p, o) => { if (fits(p, out, o)) { out.push(p); return true; } return false; };
  const lanes = (fn) => { for (const [id, pts] of Object.entries(LANES)) { const len = laneLength(pts), at = (d, side, lat) => { const [x, z] = along(pts, d / len), [ux, uz] = tangent(pts, d, len); return { x: x - uz * side * lat, z: z + ux * side * lat, ry: yaw(ux, uz) }; }; fn(id, pts, len, at); } };
  // 먼저 놓는 것이 자리를 차지한다: 다리 → 캠프 벽 → 타워 블록 → 격벽 → 방벽 → 기둥
  // 1. 고가 다리: 라인을 가로지르는 다리(바닥 28 m) — 기둥은 라인 중심에서 25 m
  lanes((id, pts, len, at) => {
    const bd = id === "mid" ? 225 : 340, c = at(bd, 0, 0), [ux, uz] = tangent(pts, bd, len), nx = -uz, nz = ux;
    const legs = [-1, 1].map((s) => ({ k: "leg", x: c.x + nx * s * 25, z: c.z + nz * s * 25, ry: c.ry, L: 4, T: 4, H: 28, y0: 0 }));
    if (legs.every((q) => fits(q, out, { ownLane: id, own: 21, lane: 24, lim: 440 }))) out.push(...legs, { k: "deck", x: c.x, z: c.z, ry: yaw(nx, nz), L: 58, T: 8, H: 2.4, y0: 28 });
  });
  // 2. 정글 캠프 벽: 캠프를 둘러싼 네 조각(사이사이 40° 길목). 한 길목은 가장 가까운 라인 쪽을 본다
  for (const c of CAMPS.filter((q) => q.side === 0)) {
    const R = c.big ? 40 : 35;
    let bl = null, bd2 = 1e9;
    for (const pts of Object.values(LANES)) for (let f = 0; f <= 1; f += 0.005) { const [x, z] = along(pts, f), d = Math.hypot(x - c.p[0], z - c.p[1]); if (d < bd2) { bd2 = d; bl = [x, z]; } }
    const a0 = Math.atan2(bl[1] - c.p[1], bl[0] - c.p[0]);
    for (let i = 0; i < 4; i++) {
      const a = a0 + Math.PI / 4 + (i * Math.PI) / 2, cx = c.p[0] + Math.cos(a) * R, cz = c.p[1] + Math.sin(a) * R;
      add({ k: "wall", x: cx, z: cz, ry: yaw(-Math.sin(a), Math.cos(a)), L: 2 * R * Math.sin(25 * DEG), T: 2.6, H: 15, y0: 0, big: c.big }, { camp: true, lane: 24 });
    }
  }
  lanes((id, pts, len, at) => {
    // 3. 타워 곁 엄폐 블록: 타워에서 적 쪽으로 24 m, 양옆 21 m
    for (const tw of TOWERS[id].filter((q) => q.team === 0)) {
      let best = 0, bd = 1e9;
      for (let d = 0; d <= len; d += 2) { const [x, z] = along(pts, d / len), e = Math.hypot(x - tw.p[0], z - tw.p[1]); if (e < bd) { bd = e; best = d; } }
      for (const s of [-1, 1]) add({ k: "block", ...at(best + 24, s, 21), L: 10, T: 4, H: 9, y0: 0 }, { ownLane: id, own: 17, lane: 24, tower: 14, lim: 440 });
    }
    // 4. 장갑 격벽: 트랙 바로 바깥(19.5 m)에 낮고 두꺼운 벽을 양쪽 번갈아 (라인 안 엄폐)
    let k = 0;
    for (let d = 84; d < len / 2 - 20; d += 104, k++) add({ k: "bulk", ...at(d, k % 2 ? 1 : -1, 19.5), L: 12, T: 3.4, H: 10, y0: 0 }, { ownLane: id, own: 16, lane: 24, tower: 20, lim: 440 });
    // 5. 라인 옆 에너지 방벽: 라인 중심에서 31 m, 30 m 마디 + 22 m 틈 (정글에서 라인을 바로 쏘지 못하게)
    for (let d = 40; d < len / 2 - 10; d += 52) for (const s of [-1, 1]) add({ k: "barrier", ...at(d, s, 31), L: 30, T: 1.4, H: 16, y0: 0 }, { ownLane: id, own: 29, lane: 24 });
  });
  // 6. 시야를 끊는 높은 기둥: 라인에서 45~110 m 떨어진 정글 자리 중 서로 70 m 이상 떨어진 곳
  const cand = [];
  for (let x = -420; x <= 420; x += 14) for (let z = -420; z <= 420; z += 14) {
    if (z < x + 40) continue;
    const dl = Math.min(...Object.values(LANES).map((l) => laneDist(l, x, z)));
    if (dl < 45 || dl > 110) continue;
    cand.push([x, z, Math.abs(dl - 60) + Math.abs(Math.hypot(x, z) - 250) * 0.1]);
  }
  cand.sort((a, b) => a[2] - b[2]);
  let n = 0;
  for (const [x, z] of cand) {
    if (n >= 6) break;
    if (out.some((q) => q.k === "pillar" && Math.hypot(q.x - x, q.z - z) < 90)) continue;
    if (add({ k: "pillar", x, z, ry: 0, L: 0.01, T: 11, H: 46, y0: 0 }, { lane: 40, gap: 14 })) n++;
  }
  // 원점 대칭: 홍 쪽
  for (const p of [...out]) out.push({ ...p, x: -p.x, z: -p.z, ry: p.ry + 180, team: 1 });
  for (const p of out) if (p.team === undefined) p.team = 0;
  return out;
}
export const COVER = layout();
// 정글 장애물 배치가 엄폐물과 겹치지 않게: 점에서 가장 가까운 엄폐물까지 거리 (다리 바닥은 공중이라 뺀다)
export function coverDist(x, z) { let d = 1e9; for (const q of COVER) if (q.k !== "deck") d = Math.min(d, segDist(x, z, q)); return d; }

// ── 짓기 (모두 합친 지오메트리: world.box/cyl 은 재질별로 한 메시로 모인다) ──
export function cover(w, K) {
  for (const p of COVER) {
    const y = w.h(p.x, p.z), col = p.team ? TR : TB, ry = p.ry, ux = Math.sin(ry * DEG), uz = Math.cos(ry * DEG), at = (t) => [p.x + ux * t, p.z + uz * t];
    if (p.k === "barrier") {             // 에너지 방벽: 양끝 기둥 + 반투명 판 + 빛 테
      for (const s of [-1, 1]) { const [x, z] = at(s * (p.L / 2 - 0.8)); w.box(x, y, z, 2, p.H + 1, 2, STEEL, { mat: "metal", ry }); K.blink.add(x, y + p.H + 1.5, z, col, 0.5, s > 0 ? 0 : 1); }
      w.box(p.x, y + 0.6, p.z, p.T, p.H - 0.6, p.L - 3, col, { mat: "glass", ry });
      for (const hh of [0.6, p.H * 0.5, p.H - 0.4]) w.box(p.x, y + hh, p.z, p.T + 0.2, 0.35, p.L - 3, hh > 1 && hh < p.H - 1 ? CYAN : col, { mat: "glow", col: false, ry });
      w.box(p.x, y, p.z, p.T + 1.6, 0.6, p.L, DARK, { mat: "paint", ry });
    } else if (p.k === "bulk") {         // 장갑 격벽: 두꺼운 판 + 위 덮개 + 노란 경고 띠
      w.box(p.x, y, p.z, p.T, p.H, p.L, DARK2, { mat: "metal", ry });
      w.box(p.x, y + p.H, p.z, p.T + 0.6, 0.8, p.L + 0.6, STEEL, { mat: "metal", ry, col: false });
      w.box(p.x, y + p.H * 0.62, p.z, p.T + 0.15, 0.6, p.L + 0.15, AMB, { mat: "glow", col: false, ry });
    } else if (p.k === "block") {        // 타워 곁 엄폐 블록
      w.box(p.x, y, p.z, p.T, p.H, p.L, PANEL, { mat: "metal", ry });
      w.box(p.x, y + p.H - 0.5, p.z, p.T + 0.15, 0.4, p.L + 0.15, col, { mat: "glow", col: false, ry });
    } else if (p.k === "wall") {         // 정글 캠프 벽
      w.box(p.x, y, p.z, p.T, p.H, p.L, DARK, { mat: "paint", ry });
      w.box(p.x, y + p.H - 1.2, p.z, p.T + 0.2, 0.4, p.L + 0.1, p.big ? AMB : VIO, { mat: "glow", col: false, ry });
      w.box(p.x, y + p.H, p.z, p.T + 0.8, 0.7, p.L + 0.8, PANEL, { mat: "metal", ry, col: false });
      for (const s of [-1, 1]) { const [x, z] = at(s * (p.L / 2)); w.box(x, y, z, p.T + 1.2, p.H + 1.5, 1.6, STEEL, { mat: "metal", ry }); }
    } else if (p.k === "pillar") {       // 높은 기둥
      const r = p.T / 2;
      w.cyl(p.x, y, p.z, r, p.H, PANEL, { mat: "metal", rt: r * 0.82 });
      for (const hh of [6, 18, 30, 42]) ring(w, p.x, y + hh, p.z, r - (hh / p.H) * r * 0.18 + 0.05, 0.35, hh % 24 === 18 ? MAG : CYAN, { pitch: 90, mat: "glow", col: false, seg: 24 });
      w.cyl(p.x, y + p.H, p.z, r * 0.95, 1.2, STEEL, { mat: "metal", col: false });
      K.blink.add(p.x, y + p.H + 1.8, p.z, 0xff3030, 0.6, p.team);
    } else if (p.k === "leg") {          // 다리 기둥
      w.box(p.x, y, p.z, p.T, p.H, p.L, PANEL, { mat: "metal", ry });
      w.box(p.x, y + 2, p.z, p.T + 0.15, p.H - 4, 0.4, col, { mat: "glow", col: false, ry });
    } else if (p.k === "deck") {         // 다리 바닥: 아래 빛줄 + 양옆 난간
      const yy = y + p.y0;
      w.box(p.x, yy, p.z, p.T, p.H, p.L, STEEL, { mat: "metal", ry });
      w.box(p.x, yy - 0.15, p.z, 0.6, 0.15, p.L - 2, CYAN, { mat: "glow", col: false, ry });
      for (const s of [-1, 1]) {
        const ox = Math.cos(ry * DEG) * s * (p.T / 2), oz = -Math.sin(ry * DEG) * s * (p.T / 2);
        w.box(p.x + ox, yy + p.H, p.z + oz, 0.5, 1.6, p.L, DARK2, { mat: "metal", ry });
        w.box(p.x + ox, yy + p.H + 1.6, p.z + oz, 0.6, 0.25, p.L, col, { mat: "glow", col: false, ry });
      }
    }
  }
  void MAG;
}
