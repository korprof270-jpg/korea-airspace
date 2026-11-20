// 붉은 협곡 전초기지 바탕: 절벽 요새(협곡 북벽에 박힌 계단식 포대와 격납고 굴), 요새 뒤 안뜰, 지휘 첨탑
//  · 요새 몸체: x -72..72, 앞면 z -44(0단) → -52 → -58 → -64(3단), 뒤는 z -94 에서 안뜰과 만난다. 단 윗면 14 / 30 / 42 / 54(메사 윗면)
//  · 격납고 굴 둘(x = ±38): 폭 18 m·높이 12 m, 협곡 쪽 문에서 안뜰까지 남북으로 뚫려 있다
//  · 안뜰: 메사를 14 m 높이까지 파낸 구덩이(116 × 54 m). 한가운데에서 지휘 첨탑이 솟아 메사 윗면 위로 100 m 넘게 올라간다
import * as THREE from "../../vendor/three.module.min.js";
import {
  M, beam, prop, ring, octa, V3, prism, monolith, slab, turret, shuttle, mast, post, O8, DEG, BOXG,
  BLK, BLK2, IRON, STEEL, GUN, RED, RED2, DRED, ORG, EMB, HAZ,
} from "./outpost-kit.js";
import { FORT, COURT, HANGARS, HANGAR_HW, HANGAR_H, SPIRE, N_TOP } from "./outpost-terrain.js";

const PANEL = { mat: "std:panel", tile: 8 };

// ── 절벽 요새 ──
export function fortress(w, K) {
  const { x0, x1, front, top, back } = FORT, FLOOR_Y = COURT.y;
  const hw = HANGAR_HW, hx = HANGARS;
  // 0단(기단): 협곡 바닥에서 격납고 바닥 높이까지
  slab(w, x0, x1, -3, top[0], back, front[0], BLK, PANEL);
  slab(w, x0 - 1, x1 + 1, -3, 2.4, front[0], front[0] + 1.4, IRON, { mat: "paint" });
  // 1단: 격납고 굴 사이의 세 덩어리 + 굴 천장
  const segs = [[x0, hx[0] - hw], [hx[0] + hw, hx[1] - hw], [hx[1] + hw, x1]];
  for (const [a, b] of segs) slab(w, a, b, top[0], top[1], back, front[1], BLK, PANEL);
  for (const c of hx) slab(w, c - hw, c + hw, top[0] + HANGAR_H, top[1], back, front[1], BLK2, PANEL);
  // 2·3단
  slab(w, x0, x1, top[1], top[2], back, front[2], BLK, PANEL);
  slab(w, x0, x1, top[2], top[3], back, front[3], BLK, PANEL);

  // 단마다: 앞 모서리 아래 붉은 빛 띠, 난간, 버팀 기둥, 창
  for (let i = 0; i < 4; i++) {
    const zf = front[i], y1 = top[i], y0 = i ? top[i - 1] : 0;
    const spans = i === 1 ? segs : [[x0, x1]];
    for (const [a, b] of spans) {
      slab(w, a, b, y1 - 1.5, y1 - 1.1, zf, zf + 0.18, RED, { mat: "glow", col: false });
      slab(w, a, b, y1 - 0.5, y1 + 0.1, zf - 0.2, zf + 0.5, IRON, { mat: "paint", col: false });
      // 난간(격납고 앞·다리 닿는 곳은 비운다)
      for (let x = a + 3; x < b - 2; x += 6) {
        if (i === 0 && hx.some((c) => Math.abs(x - c) < hw + 4)) continue;
        if (i === 1 && Math.abs(x) < 9) continue;
        w.box(x, y1, zf - 0.4, 4.4, 1.1, 0.5, BLK2, { col: false });
      }
      // 버팀 기둥과 그 사이의 붉은 창
      for (let x = a + 4; x <= b - 4; x += 8) {
        w.box(x, y0, zf + 0.5, 1.8, y1 - y0 - 1.6, 1.4, BLK2, { mat: "paint", col: false });
        w.box(x, y0 + 1.5, zf + 1.22, 0.3, y1 - y0 - 5, 0.1, RED, { mat: "glow", col: false });
      }
      for (let x = a + 8; x <= b - 8; x += 8) w.box(x, y0 + (y1 - y0) * 0.45, zf + 0.12, 3.2, 0.7, 0.1, i % 2 ? ORG : EMB, { mat: "glow", col: false });
    }
  }
  // 기단 앞: 굵은 배관과 받침
  for (const [a, b] of [[x0 + 2, hx[0] - hw - 3], [hx[0] + hw + 3, hx[1] - hw - 3], [hx[1] + hw + 3, x1 - 2]]) {
    w.pipe(a, 4.2, front[0] + 2.6, b, 4.2, front[0] + 2.6, 0.9, RUST_PIPE, { mat: "paint" });
    w.pipe(a, 6.6, front[0] + 1.9, b, 6.6, front[0] + 1.9, 0.5, GUN, { mat: "paint", col: false });
    for (let x = a + 2; x < b; x += 9) w.box(x, 0, front[0] + 2.6, 1, 3.4, 1.6, IRON, { col: false });
  }

  // 격납고 굴: 문틀, 내려 놓은 착륙 턱, 속의 주황 조명
  for (const c of hx) {
    // 앞으로 내민 착륙 턱 + 경고 띠 + 가장자리 등
    slab(w, c - hw - 2, c + hw + 2, top[0] - 1.2, top[0], front[0], front[0] + 5, IRON, PANEL);
    for (let k = -3; k <= 3; k++) w.box(c + k * 5.2, top[0], front[0] + 4.4, 2.6, 0.06, 0.8, k % 2 ? HAZ : BLK2, { col: false, ao: false });
    for (const sx of [-1, 1]) { post(w, c + sx * (hw + 1.4), top[0], front[0] + 4.4, 1.6, RED, 0); beam(w, [c + sx * (hw + 1), top[0] - 1, front[0] + 4.6], [c + sx * (hw - 3), 5, front[0] + 0.6], 0.6, STEEL, { col: false }); }
    for (const zf of [front[1], back]) {
      const d = zf === back ? -1 : 1;
      // 문틀: 양 기둥 + 인방, 안쪽 테두리는 붉게 빛난다
      for (const sx of [-1, 1]) {
        w.box(c + sx * (hw + 0.9), FLOOR_Y, zf + d * 0.9, 1.8, HANGAR_H + 1.6, 1.8, IRON, { mat: "paint", col: false });
        w.box(c + sx * (hw - 0.12), FLOOR_Y, zf + d * 0.3, 0.24, HANGAR_H, 0.5, RED, { mat: "glow", col: false });
        for (let k = 0; k < 4; k++) w.box(c + sx * (hw + 0.9), FLOOR_Y + 1 + k * 2.9, zf + d * 1.82, 1.5, 1.2, 0.08, k % 2 ? HAZ : BLK, { col: false, ao: false });
      }
      w.box(c, FLOOR_Y + HANGAR_H, zf + d * 0.9, hw * 2 + 5.4, 2, 1.8, IRON, { mat: "paint", col: false });
      w.box(c, FLOOR_Y + HANGAR_H - 0.25, zf + d * 0.3, hw * 2, 0.25, 0.5, RED, { mat: "glow", col: false });
      w.box(c, FLOOR_Y + HANGAR_H + 0.5, zf + d * 1.84, 7, 1, 0.08, ORG, { mat: "glow", col: false });
    }
    // 속: 벽 갈빗대, 천장 조명 줄, 벽의 주황 조명 띠, 바닥 유도선과 빛 웅덩이
    for (let z = front[1] - 5; z > back + 2; z -= 6) {
      for (const sx of [-1, 1]) w.box(c + sx * (hw - 0.3), FLOOR_Y, z, 0.6, HANGAR_H, 0.9, BLK2, { col: false });
      w.box(c, FLOOR_Y + HANGAR_H - 0.5, z, hw * 2, 0.5, 0.9, BLK2, { col: false });
      w.box(c, FLOOR_Y + HANGAR_H - 0.62, z + 3, 9, 0.12, 0.7, EMB, { mat: "glow", col: false });
    }
    for (const sx of [-1, 1]) {
      slab(w, c + sx * (hw - 0.08), c + sx * (hw - 0.02), FLOOR_Y + 7.6, FLOOR_Y + 8.2, back + 1, front[1] - 1, ORG, { mat: "glow", col: false });
      slab(w, c + sx * (hw - 0.08), c + sx * (hw - 0.02), FLOOR_Y + 1.0, FLOOR_Y + 1.3, back + 1, front[1] - 1, RED, { mat: "glow", col: false });
      // 벽가의 보급 상자·연료통(충돌 없음)
      for (let z = front[1] - 8; z > back + 6; z -= 12) w.box(c + sx * (hw - 1.6), FLOOR_Y, z + sx * 2, 1.8, 1.6 + ((z * 7) % 3) * 0.4, 2.6, (z | 0) % 2 ? DRED : STEEL, { mat: "std:corrug", tile: 2, col: false });
    }
    for (let z = front[1] - 3; z > back; z -= 5) w.box(c, FLOOR_Y + 0.02, z, 0.4, 0.05, 2.6, RED, { mat: "glow", col: false, ao: false });
    for (let z = front[1] - 8; z > back; z -= 13) w.pool(c, FLOOR_Y + 0.03, z, 13, ORG, 0.5);
    w.pool(c, FLOOR_Y + 0.03, front[0] + 1, 12, RED, 0.4);
    w.gap(c < 0 ? "서쪽 격납고 굴 관통" : "동쪽 격납고 굴 관통", c, FLOOR_Y + HANGAR_H / 2, (front[1] + back) / 2, 0, hw * 2 - 3, HANGAR_H - 2, 700);
  }

  // 포대: 단마다 남쪽 협곡을 겨눈 포탑
  const S = -90;   // 남쪽을 보는 yaw
  for (const x of [-62, -20, 20, 62]) turret(w, K, x, top[1], front[1] - 3.2, S + (x < 0 ? -8 : 8), 0.95);
  for (const x of [-50, -28, 28, 50]) turret(w, K, x, top[2], front[2] - 3.2, S + (x < 0 ? 6 : -6), 0.95, { elev: 0.22 });
  for (const x of [-64, -40, 40, 64]) turret(w, K, x, top[3], front[3] - 4, S, 1.35, { elev: 0.3 });

  // 정문(다리가 닿는 2단 가운데): 내민 문루 + 붉게 빛나는 문
  const zg = front[2];
  for (const sx of [-1, 1]) {
    slab(w, sx * 7.5, sx * 11.5, top[1], top[2] + 4, zg, zg + 3, BLK, PANEL);
    w.box(sx * 9.5, top[2] + 4, zg + 1.5, 4.6, 0.5, 3.6, RED, { mat: "glow", col: false });
    w.box(sx * 9.5, top[2] + 4.5, zg + 1.5, 2.6, 2.6, 2.2, IRON, { col: false });
    w.box(sx * 7.4, top[1] + 0.5, zg + 1.6, 0.14, 9, 0.5, RED, { mat: "glow", col: false });
    K.blink.add(sx * 9.5, top[2] + 7.6, zg + 1.5, RED, 0.5, sx > 0 ? 0 : 1);
  }
  slab(w, -7.5, 7.5, top[1] + 10, top[2] + 3, zg, zg + 2.4, BLK, PANEL);
  slab(w, -7.4, 7.4, top[1], top[1] + 10, zg + 0.05, zg + 0.5, 0x2a0b0d, { col: false });
  for (const x of [-4.8, -1.6, 1.6, 4.8]) w.box(x, top[1] + 0.3, zg + 0.56, 0.28, 9.4, 0.1, RED, { mat: "glow", col: false });
  slab(w, -7.4, 7.4, top[1] + 9.2, top[1] + 9.8, zg + 0.5, zg + 0.62, RED2, { mat: "glow", col: false });
  w.pool(0, top[1] + 0.04, zg + 4, 11, RED, 0.6);

  // 윗갑판(54 m): 가운데 지휘동, 양 날개 건물, 양 끝 착륙장
  const d = N_TOP;
  slab(w, -17, 17, d, d + 20, back + 3, front[3] - 9, BLK, PANEL);
  slab(w, -17.3, 17.3, d + 14.5, d + 16, back + 2.7, front[3] - 8.7, RED, { mat: "glow", col: false });
  slab(w, -18, 18, d + 20, d + 21, back + 2, front[3] - 8, IRON, { mat: "paint", col: false });
  for (const sx of [-1, 1]) {
    slab(w, sx * 10, sx * 17, d + 21, d + 28, back + 4, back + 12, BLK2, PANEL);
    w.box(sx * 13.5, d + 24.5, back + 8, 7.3, 0.8, 8.3, RED, { mat: "glow", col: false });
    mast(w, K, sx * 13.5, d + 28, back + 8, 12);
    slab(w, sx * 22, sx * 50, d, d + 9, back + 4, front[3] - 10, BLK2, PANEL);
    slab(w, sx * 22 - sx * 0.2, sx * 50 + sx * 0.2, d + 6, d + 6.8, back + 3.8, front[3] - 9.8, ORG, { mat: "glow", col: false });
    for (const x of [28, 36, 44]) w.box(sx * x, d + 9, back + 9, 4, 1.6 + (x % 3) * 0.7, 5, IRON, { mat: "std:panel", tile: 3, col: false });
    turret(w, K, sx * 36, d + 9, front[3] - 14, S, 1.1, { elev: 0.5 });
    // 끝 착륙장(팔각 판) — 서쪽에는 수송정이 서 있다
    const px = sx * 61, pz = (back + front[3]) / 2 - 2;
    octa(w, px, d, pz, 9.5, 0.5, IRON, { mat: "std:panel", col: false });
    ring(w, px, d + 0.56, pz, 7.2, 0.16, RED, { pitch: 90, mat: "glow", col: false, seg: 32 });
    w.box(px, d + 0.52, pz, 6, 0.05, 0.6, HAZ, { col: false, ao: false }); w.box(px, d + 0.52, pz, 0.6, 0.05, 6, HAZ, { col: false, ao: false });
    for (let k = 0; k < 4; k++) { const a = k * 90 * DEG + 0.78; K.blink.add(px + Math.cos(a) * 9, d + 0.9, pz + Math.sin(a) * 9, RED, 0.3, k); }
    if (sx < 0) shuttle(w, px, d + 0.5, pz, -90, 1.0);
  }
  // 지휘동 지붕: 회전 레이더 받침(움직이는 부분은 detail 에서 단다)
  w.cyl(0, d + 21, back + 14, 2.2, 5, IRON, { mat: "paint" });
  K.radar = [0, d + 26, back + 14];
  // 윗갑판 앞 난간 등
  for (let x = x0 + 6; x <= x1 - 6; x += 12) post(w, x, d, front[3] - 0.8, 1.8, RED, 0);

  // 양 끝 보루: 협곡 바닥에서 솟은 검은 탑
  for (const sx of [-1, 1]) {
    monolith(w, K, sx * 81, -60, 15, 15, 80, { tier: true, eye: true, r: w.rand });
    K.lights.push([sx * 81, 82, -60, sx > 0 ? 0.4 : 2.6, sx * 0.16, 52, 150]);
  }
  w.gap("요새 포대 앞 스치기", 0, 22, front[0] + 12, 90, 20, 22, 300);
}
const RUST_PIPE = 0x4a2c24;

// ── 안뜰: 바닥판, 둘레 벽, 유도선·착륙 표시, 벽 위 난간 ──
export function court(w, K) {
  const { x0, x1, z0, z1, y } = COURT, top = N_TOP + 2;
  slab(w, x0, x1, y - 1, y, z0, z1, 0x2c2d33, PANEL);
  // 둘레 벽(파낸 자리의 흙 비탈을 덮는다)
  slab(w, x0 - 8, x0, y - 1, top, z0 - 8, z1, BLK, PANEL);
  slab(w, x1, x1 + 8, y - 1, top, z0 - 8, z1, BLK, PANEL);
  slab(w, x0, x1, y - 1, top, z0 - 8, z0, BLK, PANEL);
  const walls = [[x0, 1, 0], [x1, -1, 0], [z0, 1, 1]];
  for (const [e, d, ax] of walls) {
    const a = ax ? x0 : z0, b = ax ? x1 : z1;
    for (let s = a + 5; s < b - 2; s += 9) {
      const X = ax ? s : e + d * 0.5, Z = ax ? e + d * 0.5 : s;
      w.box(X, y, Z, ax ? 1.6 : 1, top - y - 4, ax ? 1 : 1.6, BLK2, { col: false });
      w.box(ax ? s + 4.5 : e + d * 0.08, y + 9, ax ? e + d * 0.08 : s + 4.5, ax ? 5 : 0.1, 0.7, ax ? 0.1 : 5, ORG, { mat: "glow", col: false });
      w.box(ax ? s + 4.5 : e + d * 0.08, y + 26, ax ? e + d * 0.08 : s + 4.5, ax ? 3 : 0.1, 6, ax ? 0.1 : 3, DRED, { mat: "glow", col: false });
    }
    // 벽 꼭대기 붉은 띠
    if (ax) slab(w, x0, x1, top - 2.6, top - 2, e, e + d * 0.14, RED, { mat: "glow", col: false });
    else slab(w, e, e + d * 0.14, top - 2.6, top - 2, z0, z1, RED, { mat: "glow", col: false });
  }
  // 바닥: 첨탑 둘레 동심 고리, 격납고로 이어지는 유도선, 구석의 화물
  const [sx, sz] = SPIRE;
  for (const [R, c] of [[19, RED], [26, DRED]]) ring(w, sx, y + 0.06, sz, R, 0.2, c, { pitch: 90, mat: "glow", col: false, seg: 48 });
  w.pool(sx, y + 0.05, sz, 44, RED, 0.3);
  for (const c of HANGARS) { for (let z = z1 - 2; z > z1 - 16; z -= 4) w.box(c, y + 0.03, z, 0.4, 0.05, 2.2, RED, { mat: "glow", col: false, ao: false }); w.pool(c, y + 0.04, z1 - 8, 12, ORG, 0.4); }
  for (const [cx, cz] of [[x0 + 7, z0 + 7], [x1 - 7, z0 + 7], [x0 + 6, z1 - 20], [x1 - 6, z1 - 20]]) {
    w.container(cx, y, cz, cx < 0 ? 0 : 90, DRED, 9); w.container(cx + (cx < 0 ? 0.6 : 0), y + 2.6, cz, cx < 0 ? 8 : 96, 0x30333a, 9);
    w.box(cx + (cx < 0 ? 5 : -5), y, cz + 4, 2.4, 2.4, 2.4, STEEL, { mat: "std:corrug", tile: 2 });
  }
  // 세워 둔 수송정 둘(안뜰 북쪽 구석)
  shuttle(w, x0 + 22, y, z0 + 9, 180, 1.05); shuttle(w, x1 - 22, y, z0 + 9, 0, 1.05);
  for (const cx of [x0 + 22, x1 - 22]) { ring(w, cx, y + 0.06, z0 + 9, 8, 0.14, HAZ, { pitch: 90, col: false, seg: 28 }); }
  // 벽 위 모서리 탑과 탐조등
  for (const [cx, cz, ph] of [[x0 - 4, z0 - 4, 0.8], [x1 + 4, z0 - 4, 2.2]]) {
    w.box(cx, top, cz, 7, 9, 7, BLK2, PANEL);
    w.box(cx, top + 6, cz, 7.3, 0.8, 7.3, RED, { mat: "glow", col: false });
    mast(w, K, cx, top + 9, cz, 9);
    K.lights.push([cx, top + 9.5, cz, ph, 0.12, 48, 130]);
  }
  w.gap("안뜰 강하", sx - 36, y + 22, sz, 0, 30, 30, 300, 90);
}

// ── 지휘 첨탑: 받침 → 버팀 날개를 두른 아랫몸 → 하늘다리 목 → 가는 윗몸 → 광륜 고리 → 붉은 눈의 지휘실 → 바늘 ──
export function spire(w, K) {
  const [x, z] = SPIRE, y0 = COURT.y, rim = N_TOP;
  octa(w, x, y0, z, 15, 4, IRON, { mat: "std:panel" });
  octa(w, x, y0 + 3.6, z, 15.3, 0.5, RED, { mat: "glow", col: false });
  // 아랫몸 (18 → 60, 반경 12 → 9)
  w.mesh(prism(O8, 60, y0 + 4, 9, 12), M(x, 0, z), BLK, "std:panel");
  w.col.addCapsule(V3(x, y0 + 14, z), V3(x, 50, z), 10.4);
  for (let i = 0; i < 4; i++) {
    const a = i * 90 * DEG + 45 * DEG, c = Math.cos(a), s = Math.sin(a);
    beam(w, [x + c * 17.5, y0 + 1, z + s * 17.5], [x + c * 9.6, 57, z + s * 9.6], 1.6, BLK2, { tw: 0.7 });
    beam(w, [x + c * 14.2, y0 + 4, z + s * 14.2], [x + c * 9.3, 44, z + s * 9.3], 0.34, RED, { mat: "glow", col: false });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    w.box(x + c * 10.75, 24, z + s * 10.75, 0.5, 30, 0.16, i % 2 ? RED : ORG, { mat: "glow", col: false, ry: -a / DEG + 90 });
  }
  // 하늘다리 목(60 m): 팔각 갑판과 네 방향 하늘다리 — 안뜰을 가로질러 요새 지휘동·안뜰 벽에 닿는다
  octa(w, x, 58, z, 14, 3, IRON, { mat: "std:panel" });
  octa(w, x, 60.6, z, 14.3, 0.4, RED, { mat: "glow", col: false });
  const SB = 60.2;
  const bridge = (xa, xb, za, zb) => {
    slab(w, xa, xb, SB - 1, SB, za, zb, IRON, { mat: "std:panel", tile: 5 });
    const alongX = Math.abs(xb - xa) > Math.abs(zb - za);
    for (const sd of [-1, 1]) {
      if (alongX) { slab(w, xa, xb, SB, SB + 1.1, sd > 0 ? zb - 0.3 : za, sd > 0 ? zb : za + 0.3, BLK2, { col: false }); slab(w, xa, xb, SB - 0.6, SB - 0.3, sd > 0 ? zb : za - 0.12, sd > 0 ? zb + 0.12 : za, RED, { mat: "glow", col: false }); }
      else { slab(w, sd > 0 ? xb - 0.3 : xa, sd > 0 ? xb : xa + 0.3, SB, SB + 1.1, za, zb, BLK2, { col: false }); slab(w, sd > 0 ? xb : xa - 0.12, sd > 0 ? xb + 0.12 : xa, SB - 0.6, SB - 0.3, za, zb, RED, { mat: "glow", col: false }); }
    }
  };
  bridge(x - 2.6, x + 2.6, z + 13, COURT.z1 + 4);              // 남: 지휘동 뒤
  bridge(x - 2.6, x + 2.6, COURT.z0 - 6, z - 13);              // 북: 안뜰 북벽
  bridge(COURT.x0 - 6, x - 13, z - 2.6, z + 2.6);              // 서
  bridge(x + 13, COURT.x1 + 6, z - 2.6, z + 2.6);              // 동
  for (const [bx, bz] of [[COURT.x0 - 4, z], [COURT.x1 + 4, z], [x, COURT.z0 - 4]]) { w.box(bx, rim + 2, bz, 7, SB - rim - 3, 7, BLK2, PANEL); K.blink.add(bx, SB + 1.6, bz, RED, 0.4, 1); }
  w.gap("하늘다리 밑", x - 34, 40, z, 90, 34, 30, 300);
  w.gap("하늘다리 밑", x + 34, 40, z, 90, 34, 30, 300);
  // 윗몸 (61 → 104, 반경 8.5 → 6)
  w.mesh(prism(O8, 104, 61, 6, 8.5), M(x, 0, z), BLK, "std:panel");
  w.col.addCapsule(V3(x, 68, z), V3(x, 100, z), 7.4);
  for (let i = 0; i < 4; i++) { const a = i * 90 * DEG, c = Math.cos(a), s = Math.sin(a); w.box(x + c * 7.3, 66, z + s * 7.3, 0.6, 34, 0.14, RED, { mat: "glow", col: false, ry: -a / DEG + 90 }); }
  for (const yy of [72, 84]) octa(w, x, yy, z, 8.4 - (yy - 61) * 0.055, 0.8, IRON, { col: false });
  // 광륜: 첨탑을 두른 큰 강철 고리(안쪽 붉은 띠)와 네 살 — 첨탑과 고리 사이로 날아 지나간다
  const HY = 94, HR = 25;
  ring(w, x, HY, z, HR, 1.2, IRON, { pitch: 90, seg: 44 });
  ring(w, x, HY, z, HR - 1.3, 0.3, RED, { pitch: 90, seg: 44, mat: "glow", col: false });
  ring(w, x, HY + 1.3, z, HR, 0.2, RED2, { pitch: 90, seg: 44, mat: "glow", col: false });
  for (let i = 0; i < 4; i++) {
    const a = i * 90 * DEG + 45 * DEG, c = Math.cos(a), s = Math.sin(a);
    beam(w, [x + c * 6.6, HY - 5, z + s * 6.6], [x + c * HR, HY, z + s * HR], 0.8, BLK2);
    beam(w, [x + c * 6.2, HY + 8, z + s * 6.2], [x + c * HR, HY + 0.6, z + s * HR], 0.3, GUN, { col: false });
    K.blink.add(x + c * (HR + 1.6), HY, z + s * (HR + 1.6), RED, 0.55, i);
    w.gap("첨탑 광륜 속", x + Math.cos(a + 45 * DEG) * 16, HY, z + Math.sin(a + 45 * DEG) * 16, -(a / DEG + 45) + 0, 14, 14, 600);
  }
  // 지휘실: 아래로 벌어진 받침 → 붉은 눈 띠를 두른 팔각 머리 → 지붕
  w.mesh(prism(O8, 111, 104, 12.5, 6), M(x, 0, z), BLK2, "std:panel");
  octa(w, x, 111, z, 12.5, 12, BLK, { mat: "std:panel" });
  octa(w, x, 115.4, z, 12.7, 2.2, RED, { mat: "glow", col: false });
  octa(w, x, 120.4, z, 12.7, 0.5, ORG, { mat: "glow", col: false });
  w.mesh(prism(O8, 130, 123, 5, 12.5), M(x, 0, z), BLK2, "std:panel");
  w.col.addSphere(V3(x, 108, z), 9); w.col.addSphere(V3(x, 126, z), 8.5);
  // 바늘과 가로대
  w.pipe(x, 130, z, x, 158, z, 0.8, GUN);
  w.pipe(x, 158, z, x, 168, z, 0.3, STEEL, { col: false });
  for (const [yy, l] of [[138, 6], [146, 4.2], [153, 2.6]]) { beam(w, [x - l, yy, z], [x + l, yy, z], 0.4, STEEL, { col: false }); beam(w, [x, yy, z - l], [x, yy, z + l], 0.4, STEEL, { col: false }); for (const [dx, dz] of [[l, 0], [-l, 0], [0, l], [0, -l]]) K.blink.add(x + dx, yy + 0.5, z + dz, RED, 0.34, (yy | 0) & 1); }
  K.blink.add(x, 168.6, z, RED2, 0.9, 0);
  // 지휘실 아래에서 쏘는 탐조등 셋(협곡·고원을 훑는다)
  for (let i = 0; i < 3; i++) K.lights.push([x, 106, z, i * 2.1, 0.09 + i * 0.03, 58 + i * 6, 190]);
  // 맥박 치는 눈(지휘실 둘레의 빛 고리가 숨 쉰다)
  const eye = prop(w, [[BOXG, M(0, 0, 0, 1, 1, 1), 0xffffff]], "glow", false);
  eye.geometry.dispose();
  eye.geometry = new THREE.TorusGeometry(13.6, 0.5, 6, 40); eye.geometry.rotateX(Math.PI / 2);
  eye.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.3, 0.3), transparent: true, opacity: 0.9 });
  eye.position.set(x, 116.5, z); eye.frustumCulled = false;
  w.disposables.push(eye.geometry, eye.material);
  w.updaters.push((dt, t) => { const k = 0.5 + 0.5 * Math.sin(t * 1.6); eye.scale.setScalar(1 + k * 0.08); eye.material.opacity = 0.45 + 0.5 * k; });
  return { halo: [HY, HR] };
}
