// 드론 리그 스타디움 — 경기장 안: 두 팀 기지(코어 반응로·기지 문·정비 패드), 세 라인(빛 트랙·빛 고리), 타워 기둥, 정글(기둥·LED 탑·떠 있는 판·고리·아치·터널), 캠프 자리, 보스 구덩이, 숨은 상자 자리
import { ring, octa, ball } from "./moon-kit.js";
import { beam } from "./canyon-kit.js";
import { BASES, BASE_R, PAD_R, LANES, TOWERS, TOWER_H, CAMPS, CACHES, PIT, laneDist, laneHoops, TRACK_KEEP, rng, DEG,
  CYAN, MAG, LIME, AMB, VIO, WH, TB, TR, DARK, DARK2, STEEL, PANEL, INK } from "./stadium-kit.js";

const TEAM = [TB, TR];
const dirDeg = (dx, dz) => Math.atan2(dx, dz) / DEG;   // +z 를 이 방향으로 돌리는 yaw(도)
export const padPos = (t) => { const [x, z] = BASES[t], L = Math.hypot(x, z); return [x + (x / L) * 30, z + (z / L) * 30]; };   // 코어 뒤(바깥쪽) 정비 패드

// ── 기지 ──
export function bases(w, K, S) {
  for (let t = 0; t < 2; t++) {
    const [bx, bz] = BASES[t], col = TEAM[t], y = w.h(bx, bz);
    // 원판 + 빛 테두리 + 바닥 동심원
    w.cyl(bx, y - 0.4, bz, BASE_R, 0.8, DARK2, { mat: "paint", col: false, ao: false });
    ring(w, bx, y + 0.45, bz, BASE_R - 0.6, 0.35, col, { pitch: 90, mat: "glow", col: false, seg: 64 });
    ring(w, bx, y + 0.42, bz, BASE_R * 0.62, 0.18, col, { pitch: 90, mat: "glow", col: false, seg: 48 });
    // 코어 반응로: 네 기둥 + 위아래 고리 + 바닥 받침 (코어 자체는 모드가 세운다)
    octa(w, bx, y, bz, 11, 2, STEEL, { mat: "metal" });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, px = bx + Math.cos(a) * 15, pz = bz + Math.sin(a) * 15;
      w.cyl(px, y, pz, 1.5, 30, PANEL, { mat: "metal", rt: 1.1 });
      w.box(px, y + 3, pz, 0.5, 24, 0.5, col, { mat: "glow", col: false });
      K.blink.add(px, y + 30.6, pz, col, 0.6, i);
    }
    ring(w, bx, y + 29, bz, 15, 0.9, STEEL, { pitch: 90, mat: "metal", col: false, seg: 40 });
    ring(w, bx, y + 29.8, bz, 15, 0.3, col, { pitch: 90, mat: "glow", col: false, seg: 40 });
    ring(w, bx, y + 4, bz, 15, 0.6, col, { pitch: 90, mat: "glow", col: false, seg: 40 });
    w.shaft(bx, y + 60, bz, 1, 5, 60, col, 0.08);
    // 정비 패드: 재출격·업그레이드 자리
    const [px, pz] = padPos(t);
    w.cyl(px, y, pz, PAD_R, 0.5, 0x1c2232, { mat: "paint", col: false, ao: false });
    ring(w, px, y + 0.55, pz, PAD_R, 0.4, LIME, { pitch: 90, mat: "glow", col: false, seg: 48 });
    ring(w, px, y + 0.55, pz, PAD_R * 0.55, 0.2, LIME, { pitch: 90, mat: "glow", col: false, seg: 36 });
    w.pool(px, y + 0.5, pz, PAD_R * 0.9, LIME, 0.3);
    S.add("pad", px, y + 0.62, pz, 22, { pitch: -90, ry: dirDeg(-px, -pz) + 180 });
    S.add(t ? "padR" : "padB", px, y + 14, pz, 26, { holo: true, ry: dirDeg(-px, -pz) });
    // 기지 문: 라인이 나가는 쪽마다 아치 문. 그 사이는 낮은 빛 담장
    const gates = Object.values(LANES).map((pts) => { const p = t ? pts[pts.length - 2] : pts[1]; return Math.atan2(p[1] - bz, p[0] - bx); });
    for (const a of gates) {
      const cx = bx + Math.cos(a) * (BASE_R - 2), cz = bz + Math.sin(a) * (BASE_R - 2), ry = -a / DEG, ox = -Math.sin(a), oz = Math.cos(a);
      for (const s of [-1, 1]) {
        const qx = cx + ox * s * 19, qz = cz + oz * s * 19;
        w.box(qx, y, qz, 4, 32, 4, PANEL, { mat: "metal", ry });
        w.box(qx + Math.cos(a) * 2.05, y + 2, qz + Math.sin(a) * 2.05, 0.4, 28, 1.6, col, { mat: "glow", col: false, ry });
        K.blink.add(qx, y + 32.6, qz, col, 0.55, s > 0 ? 0 : 1);
      }
      w.box(cx, y + 30, cz, 4, 4, 42, PANEL, { mat: "metal", ry });
      w.box(cx + Math.cos(a) * 2.05, y + 30.6, cz + Math.sin(a) * 2.05, 0.4, 1.4, 38, col, { mat: "glow", col: false, ry });
      S.add(t ? "gateR" : "gateB", cx + Math.cos(a) * 2.3, y + 30.4, cz + Math.sin(a) * 2.3, 26, { ry: 90 - a / DEG, height: 3.6 });
    }
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2, am = (a0 + a1) / 2;
      if (gates.some((g) => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < 0.34)) continue;
      const L = 2 * BASE_R * Math.sin(Math.PI / 48) + 0.4, cx = bx + Math.cos(am) * BASE_R, cz = bz + Math.sin(am) * BASE_R;
      w.box(cx, y, cz, 1.2, 5, L, DARK, { mat: "paint", ry: -am / DEG });
      w.box(cx, y + 5, cz, 1.3, 0.35, L, col, { mat: "glow", col: false, ry: -am / DEG });
    }
  }
}

// ── 라인: 바닥 트랙 + 가장자리 빛 줄 + 빛 고리 + 화살표 ──
export function lanes(w, K) {
  for (const [id, pts] of Object.entries(LANES)) {
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = dirDeg(dx, dz), ux = dx / L, uz = dz / L;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.max(w.h(mx, mz), 0);
      const fl = id === "mid" ? 0.12 : 0.1;
      if (!(id === "mid" && Math.hypot(mx, mz) < PIT.r1)) w.box(mx, y + 0.02, mz, 26, fl, L + 26, 0x222a3c, { mat: "paint", col: false, ao: false, ry });
      for (const s of [-1, 1]) {
        const ex = mx - uz * s * 13, ez = mz + ux * s * 13;
        if (id === "mid" && Math.hypot(ex, ez) < PIT.r1) continue;
        w.box(ex, y + 0.12, ez, 0.6, 0.1, L + 20, CYAN, { mat: "glow", col: false, ao: false, ry });
      }
      run += L;
    }
    // 빛 고리(라인 위 비행 높이)와 바닥 화살표
    for (const hp of laneHoops(id)) {
      const [px, pz] = hp.p, gy = w.h(px, pz), ry = hp.ry, ux = Math.sin(ry * DEG), uz = Math.cos(ry * DEG), teamCol = hp.t < 0.5 ? TB : TR;
      ring(w, px, gy + 13, pz, 11, 0.45, teamCol, { yaw: ry, mat: "glow", seg: 32 });
      ring(w, px, gy + 13, pz, 11.9, 0.35, STEEL, { yaw: ry, mat: "metal", col: false, seg: 32 });
      for (const s of [-1, 1]) w.box(px - uz * s * 11.6, gy, pz + ux * s * 11.6, 0.8, 13, 0.8, STEEL, { mat: "metal" });
      for (let k = -1; k <= 1; k++) w.box(px + ux * (k * 5 + 22), gy + 0.13, pz + uz * (k * 5 + 22), 5, 0.06, 1.2, teamCol, { mat: "glow", col: false, ao: false, ry: ry + 90 });
    }
  }
}
// ── 타워 기둥 (포대 머리는 모드가 위에 올린다) ──
export function towers(w, K) {
  for (const list of Object.values(TOWERS)) for (const tw of list) {
    const [x, z] = tw.p, y = w.h(x, z), col = TEAM[tw.team];
    octa(w, x, y, z, 6.5, 1.6, DARK2, { mat: "metal" });
    w.cyl(x, y + 1.6, z, 2.6, TOWER_H - 1.6, PANEL, { mat: "metal", rt: 1.7 });
    for (const hh of [4, 8.5, 13]) ring(w, x, y + hh, z, 2.35 - hh * 0.05, 0.22, col, { pitch: 90, mat: "glow", col: false, seg: 20 });
    w.cyl(x, y + TOWER_H - 0.6, z, 4.2, 0.8, STEEL, { mat: "metal", rt: 4.2 });
    ring(w, x, y + TOWER_H - 0.15, z, 4.25, 0.18, col, { pitch: 90, mat: "glow", col: false, seg: 24 });
    if (tw.tier === "inner") for (let i = 0; i < 3; i++) { const a = i * 2.094; beam(w, [x + Math.cos(a) * 6, y + 1.6, z + Math.sin(a) * 6], [x + Math.cos(a) * 2.6, y + 10, z + Math.sin(a) * 2.6], 0.6, STEEL, { mat: "metal" }); }
    w.pool(x, y, z, 12, col, 0.35);
  }
}

// ── 보스 구덩이 ──
export function bossPit(w, K, S) {
  const fy = -PIT.depth;
  ring(w, 0, 0.4, 0, PIT.r1 + 1, 0.5, MAG, { pitch: 90, mat: "glow", col: false, seg: 72 });
  ring(w, 0, fy + 0.3, 0, PIT.r0 - 6, 0.4, MAG, { pitch: 90, mat: "glow", col: false, seg: 64 });
  ring(w, 0, fy + 0.3, 0, 22, 0.3, VIO, { pitch: 90, mat: "glow", col: false, seg: 40 });
  octa(w, 0, fy, 0, 14, 1, DARK2, { mat: "metal" });
  w.pool(0, fy + 1, 0, 40, MAG, 0.35);
  // 구덩이 둘레 기둥 (가운데 라인 위는 비운다)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13, x = Math.cos(a) * (PIT.r1 + 8), z = Math.sin(a) * (PIT.r1 + 8);
    if (laneDist(LANES.mid, x, z) < 26) continue;
    w.cyl(x, 0, z, 1.6, 26, PANEL, { mat: "metal", rt: 1.1 });
    w.box(x, 2, z, 0.5, 22, 0.5, MAG, { mat: "glow", col: false, ry: -a / DEG });
    K.blink.add(x, 26.5, z, MAG, 0.5, i);
  }
  // 떠 있는 표지와 보스 출현 빛 기둥
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; S.add("pit", Math.cos(a) * (PIT.r1 + 4), 30, Math.sin(a) * (PIT.r1 + 4), 22, { holo: true, ry: -a / DEG - 90 }); }
  w.shaft(0, 90, 0, 2, 14, 90 + PIT.depth, MAG, 0.05);
}

// ── 정글 캠프 자리 ──
export function campPads(w, K) {
  for (const c of CAMPS) {
    const [x, z] = c.p, y = w.h(x, z), col = c.big ? AMB : VIO;
    octa(w, x, y, z, c.big ? 15 : 11, 0.5, DARK2, { mat: "paint", col: false });
    ring(w, x, y + 0.55, z, c.big ? 15 : 11, 0.28, col, { pitch: 90, mat: "glow", col: false, seg: 40 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5, px = x + Math.cos(a) * (c.big ? 19 : 15), pz = z + Math.sin(a) * (c.big ? 19 : 15);
      w.cyl(px, y, pz, 0.9, 9, PANEL, { mat: "metal" });
      ball(w, px, y + 9.6, pz, 0.8, col);
    }
    w.pool(x, y, z, c.big ? 20 : 15, col, 0.3);
  }
}

// ── 숨은 상자 자리를 품는 구조물 (상자 자체는 모드가 놓는다) ──
export function cacheHides(w, K) {
  for (const c of CACHES) {
    const [x, cy, z] = c.p, y = w.h(x, z);
    if (c.where === "floating") {           // 떠 있는 판: 상자는 판 바로 밑 그늘에
      w.box(x, y + 11, z, 26, 1.6, 22, PANEL, { mat: "metal" });
      for (const s of [-1, 1]) w.box(x + s * 13.05, y + 11, z, 0.3, 1.6, 22, CYAN, { mat: "glow", col: false });
      w.box(x, y + 10.9, z, 24, 0.12, 20, 0x2a3346, { mat: "paint", col: false, ao: false });
      for (const s of [-1, 1]) w.box(x + s * 9, y + 12.6, z, 2, 4, 2, STEEL, { mat: "metal" });
    } else if (c.where === "tunnel") {      // 빛 터널: 상자는 터널 한가운데
      const ry = 90;
      for (const s of [-1, 1]) w.box(x, y, z + s * 7, 34, 10, 1.4, PANEL, { mat: "metal", ry: 0 });
      w.box(x, y + 10, z, 34, 1.4, 15.4, PANEL, { mat: "metal" });
      for (let i = -2; i <= 2; i++) ring(w, x + i * 8, y + 5.2, z, 6.4, 0.2, CYAN, { yaw: ry, mat: "glow", col: false, seg: 24, arc: Math.PI });
      void ry;
    } else if (c.where === "tower") {       // LED 탑 꼭대기: 상자는 지붕 위 난간 안
      const top = cy - 1.6;
      w.box(x, y, z, 9, top, 9, DARK, { mat: "paint" });
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) w.box(x + sx * 4.6, y, z + sz * 4.6, 0.5, top, 0.5, MAG, { mat: "glow", col: false });
      for (let k = 1; k < 6; k++) w.box(x, y + top * k / 6, z, 9.4, 0.5, 9.4, k % 2 ? CYAN : MAG, { mat: "glow", col: false });
      for (const s of [-1, 1]) { w.box(x + s * 4.4, y + top, z, 0.4, 1.6, 9, STEEL, { mat: "metal" }); w.box(x, y + top, z + s * 4.4, 9, 1.6, 0.4, STEEL, { mat: "metal" }); }
      K.blink.add(x, y + top + 3, z, 0xff3030, 0.6, 1);
    } else {                                // 두꺼운 아치: 상자는 아치 속 그늘에
      for (const s of [-1, 1]) w.box(x + s * 10, y, z, 4, 15, 10, PANEL, { mat: "metal" });
      w.box(x, y + 15, z, 24, 4, 10, PANEL, { mat: "metal" });
      ring(w, x, y + 7.4, z - 5.1, 7.6, 0.3, AMB, { mat: "glow", col: false, seg: 24, arc: Math.PI });
      ring(w, x, y + 7.4, z + 5.1, 7.6, 0.3, AMB, { mat: "glow", col: false, seg: 24, arc: Math.PI });
    }
  }
}

// ── 정글 장애물: 청 쪽에 고르게 뿌리고 원점 대칭으로 홍 쪽에 똑같이 ──
export function jungle(w, K, S) {
  const r = rng(4242), items = [];
  const keepOut = (x, z, m) => {
    if (z < x + 30) return true;                                                                   // 청 쪽 반(강 z = x 의 남서쪽)만
    if (Math.max(Math.abs(x), Math.abs(z)) > 425) return true;
    for (const pts of Object.values(LANES)) if (laneDist(pts, x, z) < 40 + m) return true;
    for (const b of BASES) if (Math.hypot(x - b[0], z - b[1]) < 110 + m) return true;
    for (const c of CAMPS) if (Math.hypot(x - c.p[0], z - c.p[1]) < 32 + m) return true;
    for (const c of CACHES) if (Math.hypot(x - c.p[0], z - c.p[2]) < 30 + m) return true;
    if (Math.hypot(x, z) < PIT.r1 + 30 + m) return true;
    for (const [kx, kz, kr] of TRACK_KEEP) if (Math.hypot(x - kx, z - kz) < kr + 10 + m || Math.hypot(x + kx, z + kz) < kr + 10 + m) return true;
    for (const it of items) if (Math.hypot(x - it[1], z - it[2]) < 24 + m + it[3]) return true;
    return false;
  };
  const kinds = ["pylon", "led", "platform", "ring", "arch", "pylon", "barrier", "led", "ring", "platform"];
  for (let i = 0, tries = 0; i < 30 && tries < 900; tries++) {
    const x = (r() * 2 - 1) * 420, z = (r() * 2 - 1) * 420, kind = kinds[i % kinds.length], m = kind === "platform" || kind === "arch" ? 8 : 0;
    if (keepOut(x, z, m)) continue;
    items.push([kind, x, z, m, r(), r(), r()]); i++;
  }
  for (const it of items) for (const s of [1, -1]) build(w, K, S, it[0], it[1] * s, it[2] * s, it[4], it[5], it[6], s);
}
function build(w, K, S, kind, x, z, a, b, c, s) {
  const y = w.h(x, z), accent = [CYAN, MAG, LIME, AMB][(a * 4) | 0];
  if (kind === "pylon") {
    const h = 24 + b * 26;
    w.cyl(x, y, z, 2.2, h, PANEL, { mat: "metal", rt: 1.4 });
    for (let k = 1; k <= 3; k++) ring(w, x, y + h * k / 3.6, z, 2.1 - k * 0.15, 0.28, accent, { pitch: 90, mat: "glow", col: false, seg: 18 });
    K.blink.add(x, y + h + 0.5, z, accent, 0.6, (b * 2) | 0);
  } else if (kind === "led") {
    const h = 30 + b * 34, ry = c * 90;
    w.box(x, y, z, 7, h, 7, DARK, { mat: "paint", ry });
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cs = Math.cos(ry * DEG), sn = Math.sin(ry * DEG), lx = sx * 3.6, lz = sz * 3.6;
      w.box(x + lx * cs + lz * sn, y, z - lx * sn + lz * cs, 0.4, h, 0.4, accent, { mat: "glow", col: false, ry });
    }
    const ad = ["ad1", "ad2", "ad3", "ad4", "ad5"][((a * 50) | 0) % 5];
    for (let k = 0; k < 4; k++) { const fy = ry + k * 90, fx = Math.sin(fy * DEG) * 3.56, fz = Math.cos(fy * DEG) * 3.56; S.add(ad, x + fx, y + h * 0.7, z + fz, 6.6, { ry: fy, height: 9 }); }
    K.blink.add(x, y + h + 0.4, z, 0xff3030, 0.5, 0);
  } else if (kind === "platform") {
    const py = y + 12 + b * 16, ry = c * 180, sx = 16 + a * 10, sz = 12 + b * 8;
    w.box(x, py, z, sx, 1.4, sz, PANEL, { mat: "metal", ry });
    w.box(x, py - 0.2, z, sx + 0.6, 0.3, sz + 0.6, accent, { mat: "glow", col: false, ry });
    w.box(x, py - 2.2, z, 2.2, 2, 2.2, STEEL, { mat: "metal", ry });
    ball(w, x, py - 2.6, z, 1.1, accent);
    w.pool(x, y, z, 6, accent, 0.25);
  } else if (kind === "ring") {
    const R = 6 + a * 4, ry = c * 180, ry2 = ry + 90;
    ring(w, x, y + R + 4 + b * 10, z, R, 0.5, accent, { yaw: ry, mat: "glow", seg: 32 });
    w.box(x, y, z, 1, R * 0.0 + 4 + b * 10, 1, STEEL, { mat: "metal", ry: ry2 });
    void ry2;
  } else if (kind === "arch") {
    const ry = c * 180, cs = Math.cos(ry * DEG), sn = Math.sin(ry * DEG), half = 9 + a * 5, h = 12 + b * 8;
    for (const k of [-1, 1]) w.box(x + k * half * cs, y, z - k * half * sn, 3, h, 5, PANEL, { mat: "metal", ry });
    w.box(x, y + h, z, half * 2 + 3, 2.6, 5, PANEL, { mat: "metal", ry });
    w.box(x, y + h - 0.4, z, half * 2 - 3, 0.3, 5.2, accent, { mat: "glow", col: false, ry });
  } else {
    const ry = c * 180, L = 18 + a * 14;
    w.box(x, y, z, L, 3.6, 1.6, DARK2, { mat: "paint", ry });
    w.box(x, y + 3.6, z, L + 0.2, 0.3, 1.7, accent, { mat: "glow", col: false, ry });
  }
  void s; void WH; void INK;
}
