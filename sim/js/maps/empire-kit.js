// 기계제국 수도 제작 도구: 배치 좌표·높이 함수(용광로 구덩이)·색·검은 모노리스 탑·붉은 탐조등·용암 재질
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, mat } from "./canyon-kit.js";
import { ring, octa, ball, lattice, Blinkers, lane, V3 } from "./moon-kit.js";
import { prism, arch, ringGate } from "./orbit-kit.js";

export { M, beam, prop, merged, mat, ring, octa, ball, lattice, Blinkers, lane, V3, prism, arch, ringGate };

export const DEG = Math.PI / 180;
// 제국의 색: 검은 강철 · 짙은 철 · 포금 · 녹 · 붉은 발광 · 주황 쇳물 · 경고 노랑
export const BLK = 0x16181d, BLK2 = 0x1d2026, IRON = 0x272a31, STEEL = 0x3b4049, GUN = 0x545a64, RUST = 0x5a3428, ASH = 0x6a6460;
export const RED = 0xff2a36, RED2 = 0xff5a40, DRED = 0x8a1018, ORG = 0xff7a1e, EMB = 0xffb24a, HAZ = 0xe8b01a;

// ── 배치 ──
export const SP = [0, -50];                    // 에이아의 첨탑(중앙 코어 탑)
export const PLAZA = 64;                       // 첨탑 둘레 광장 반경
export const ROAD_R = 135;                     // 순환 대로 반경(원점 중심)
export const AVE = 10;                         // 방사 대로 반폭 (x = 0, z = 0 축)
export const PITS = [[62, 62, 20], [175, 72, 20], [95, 180, 18]];   // 용광로 구덩이 [x, z, 반경]
export const PIT_D = 9;
export const HALL = { x: 85, z0: -82, z1: -22, w: 28, h: 22 };      // 조립동 (남북으로 긴 터널)
export const CRANE_X = [65, 105], CRANE_Y = 34;                    // 조립동 위를 오가는 갠트리 크레인 레일
export const CONV_A = { z: 110, x0: -222, x1: 222, y: 24 };         // 동서 컨베이어 다리 (남쪽)
export const CONV_B = { x: -110, z0: -222, z1: -24, y: 30 };        // 남북 컨베이어 다리 (북서)
export const HIVES = [[-70, 62, 44], [-188, 58, 40], [-82, 196, 40]];  // 적층 공장 블록 [x, z, 한 변]
export const CABLES = { x0: 150, x1: 222, z0: -114, z1: -22, y: 46 };  // 케이블 숲
export const PYLONS = [[-214, -168, 92], [222, -128, 84], [200, 140, 86], [-200, 140, 90]];   // 에너지선 철탑 [x, z, 높이]
export const WALL = 252;

// 높이: 바닥은 0, 용광로 구덩이만 9 m 아래로 꺼진다 (안쪽 평평, 가장자리 5 m 경사)
export function height(x, z) {
  for (const [cx, cz, R] of PITS) {
    const d = Math.hypot(x - cx, z - cz);
    if (d < R) return d < R - 5 ? -PIT_D : -PIT_D * (R - d) / 5;
  }
  return 0;
}

export function hash(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// 회전된 국소 좌표: u = +x, v = +z 를 ry 만큼 돌린 축
export const local = (x, z, ry) => { const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG); return (u, v) => [x + u * c + v * s, z - u * s + v * c]; };

// ── 검은 모노리스 탑: 판넬 몸체 + 붉은 세로 틈 + 눈 띠 + 꼭대기 장치. o.tier: 위층을 좁혀 계단형, o.eye: 꼭대기 붉은 띠 ──
export function monolith(w, K, x, z, sx, sz, h, o = {}) {
  const ry = o.ry || 0, P = local(x, z, ry), r = o.r || w.rand;
  const tier = o.tier ?? (h > 60 && r() < 0.5);
  const h0 = tier ? h * (0.55 + r() * 0.15) : h;
  w.box(x, 0, z, sx + 2, 2.4, sz + 2, IRON, { mat: "paint", ry });
  w.box(x, 0, z, sx, h0, sz, o.color ?? BLK, { mat: "std:panel", tile: 8, ry });
  let ux = sx, uz = sz, top = h0;
  if (tier) {
    ux = sx * 0.62; uz = sz * 0.62;
    w.box(x, h0, z, sx + 0.6, 1.2, sz + 0.6, STEEL, { mat: "paint", ry, col: false });
    w.box(x, h0, z, ux, h - h0, uz, BLK2, { mat: "std:panel", tile: 8, ry });
    top = h;
  }
  // 세로 틈: 각 면 가운데 혹은 양쪽에 붉은 발광 띠
  const slit = (fx, fz, len, y0, y1, along) => {
    const n = len > 14 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : (k ? 0.27 : -0.27) * len;
      const [px, pz] = along === "u" ? P(off, fz) : P(fx, off);
      w.box(px, y0, pz, along === "u" ? 0.55 : 0.14, y1 - y0, along === "u" ? 0.14 : 0.55, RED, { mat: "glow", ry, col: false });
    }
  };
  const y0 = 4 + r() * 6, y1 = h0 - 3;
  if (y1 - y0 > 6) { slit(0, sz / 2 + 0.05, sx, y0, y1, "u"); slit(0, -sz / 2 - 0.05, sx, y0, y1, "u"); slit(sx / 2 + 0.05, 0, sz, y0, y1, "v"); slit(-sx / 2 - 0.05, 0, sz, y0, y1, "v"); }
  // 층 띠
  for (let y = 18; y < h0 - 6; y += 16 + ((r() * 8) | 0)) w.box(x, y, z, sx + 0.4, 0.7, sz + 0.4, IRON, { mat: "paint", ry, col: false });
  // 눈 띠: 꼭대기 가까이 탑을 감싸는 붉은 창
  if (o.eye ?? r() < 0.6) w.box(x, top - 7, z, ux + 0.24, 1.3, uz + 0.24, RED, { mat: "glow", ry, col: false });
  // 지붕 장치
  w.box(x, top, z, ux + 0.8, 1.2, uz + 0.8, STEEL, { mat: "paint", ry, col: false });
  w.box(x, top + 1.2, z, ux * 0.5, 2.4, uz * 0.5, IRON, { mat: "paint", ry });
  const ah = 6 + r() * 10;
  w.pipe(x, top + 3.6, z, x, top + 3.6 + ah, z, 0.3, GUN, { col: false });
  K.blink.add(x, top + 4 + ah, z, RED, 0.5, (x * 7 + z) & 1);
  return top;
}

// ── 붉은 탐조등: 꼭대기에서 비스듬히 아래를 비추며 천천히 돈다. 바닥에는 움직이는 빛 원 ──
export function searchlights(w, list) {
  if (!list.length) return;
  const L = 170, R = 15;
  const cone = new THREE.CylinderGeometry(0.5, R, L, 18, 1, true); cone.translate(0, -L / 2, 0);
  const cm = new THREE.MeshBasicMaterial({ color: 0xff3a30, transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const spotTex = radialTex();
  const sm = new THREE.MeshBasicMaterial({ map: spotTex, color: 0xff4434, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  const disc = new THREE.PlaneGeometry(1, 1); disc.rotateX(-Math.PI / 2);
  const items = list.map(([x, y, z, ph, sp, tilt]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z);
    const arm = new THREE.Group(); arm.rotation.x = tilt * DEG; pivot.add(arm);
    const m = new THREE.Mesh(cone, cm); m.renderOrder = 6; m.frustumCulled = false; arm.add(m);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.8, 10), new THREE.MeshBasicMaterial({ color: 0xffb0a0 })); head.position.y = -0.6; arm.add(head);
    const spot = new THREE.Mesh(disc, sm); spot.renderOrder = 3; spot.frustumCulled = false;
    w.scene.add(pivot, spot);
    return { pivot, spot, ph, sp, tilt: tilt * DEG, y };
  });
  w.disposables.push(cone, cm, sm, disc, spotTex);
  w.updaters.push((dt, t) => {
    for (const it of items) {
      const a = it.ph + t * it.sp + Math.sin(t * 0.37 + it.ph) * 0.5;
      it.pivot.rotation.y = a;
      // 빔 방향: 아래(-y)를 x 축으로 tilt 만큼 기울인 뒤 y 축으로 a 회전
      const dy = -Math.cos(it.tilt), dh = Math.sin(it.tilt);
      const dx = -dh * Math.sin(a), dz = -dh * Math.cos(a);
      const tt = Math.min(L, it.y / -dy), gx = it.pivot.position.x + dx * tt, gz = it.pivot.position.z + dz * tt;
      const s = R * (tt / L) * 2.6 / Math.max(0.35, -dy);
      it.spot.position.set(gx, height(gx, gz) + 0.15, gz);
      it.spot.scale.set(s, 1, s);
      it.spot.visible = tt < L * 0.98;
    }
  });
}

function radialTex() {
  const S = 128, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,0.55)"); gr.addColorStop(0.7, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── 쇳물 표면: 검게 굳은 껍질 사이로 빛나는 균열 (캔버스 텍스처, 천천히 흐른다) ──
let LAVA = null;
export function lavaTexture() {
  if (LAVA) return LAVA;
  const S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"), img = g.createImageData(S, S), d = img.data;
  // 보로노이 셀: 가장 가까운 두 점의 거리 차가 작은 곳이 균열
  const pts = Array.from({ length: 34 }, (_, i) => [hash(i, 3) * S, hash(i, 7) * S]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let a = 1e9, b = 1e9;
    for (const [px, py] of pts) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const dd = Math.hypot(x - px - ox, y - py - oy);
      if (dd < a) { b = a; a = dd; } else if (dd < b) b = dd;
    }
    const e = b - a, k = e < 2.2 ? 1 : e < 5 ? 0.65 : Math.max(0, 0.3 - a / 90);
    const c = k > 0.9 ? [255, 214, 120] : k > 0.6 ? [255, 120, 30] : [40 + k * 300, 10 + k * 60, 8];
    const i = (y * S + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  LAVA = t;
  return t;
}

// 연기 기둥: 굴뚝 꼭대기에서 퍼지며 오르는 덩어리들 (아래쪽은 불빛을 받아 붉게)
export function plume(w, x, y, z, rad, rise, n = 4, color = 0x2a1c18) {
  const m = new THREE.MeshLambertMaterial({ color, emissive: 0x401008, flatShading: true, transparent: true, opacity: 0.92 });
  const g = new THREE.IcosahedronGeometry(1, 1);
  const puffs = Array.from({ length: n }, () => { const p = new THREE.Mesh(g, m); p.renderOrder = 4; w.scene.add(p); return p; });
  const ph = hash(x, z) * 10;
  w.updaters.push((dt, t) => puffs.forEach((p, i) => {
    const u = (t * 0.05 + i / n + ph) % 1;
    p.position.set(x + u * rise * 0.35 + Math.sin(i * 2.4 + t * 0.3) * rad * 0.2, y + u * rise, z + u * rise * 0.12);
    p.scale.setScalar(rad * (0.5 + u * 1.5) * Math.min(1, u * 6) * Math.min(1, (1 - u) * 3) + 0.001);
  }));
}
