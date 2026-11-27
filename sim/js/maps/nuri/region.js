// 누리 대륙 구역 맵 만들기: 대륙 좌표에서 창 하나(c, half)를 잘라 한 장의 맵으로
//  · 지형·색은 대륙 함수, 거점은 창 안에 드는 것 모두(이웃 나라 거점이 걸쳐도 같이 지어진다)
//  · 합칠 때는 창만 넓히면 된다 (makeRegion 의 win 을 크게)
import { toW, REGIONS, REGIONS_POLY, LAND, ISLANDS, SITES, ROADS, FRONT, height, colorAt, ownerAt, landD, fbm, vnoise, lineDist, smooth } from "./geo.js";
import { BUILD } from "./sites.js";
import { BAKE, MARGIN, CONT } from "./bakeinfo.js";
import { ZONES as NZ, THEME } from "./zones.js";
const OWNS = ["hanul", "haerim", "bukseol", "jeoksa", "namdo", "e1", "e2", "e3"];
import { ST, forest, village, fields, turbine, pylonLine, tankTrap, bunker, wreck, tower, monolith, floorAt, road, roadside, treeImpostors } from "./kit.js";

const ENV = {
  hanul: { sky: { top: 0x3f78c8, horizon: 0xcfe4f2, bottom: 0x9ab8c8 }, sunDir: [0.5, 0.55, -0.4], sunColor: 0xfff0d8, sun: 3.4, hemi: 0.45, hemiSky: 0xcfe0ff, hemiGround: 0x6a7a4a, cloud: 0.5, fog: { color: 0xc8dcea, near: 400, far: 2400 } },
  haerim: { sky: { top: 0x3a6ab8, horizon: 0xffd2a8, bottom: 0xb89a88 }, sunDir: [-0.7, 0.3, -0.3], sunColor: 0xffc890, sun: 3.4, hemi: 0.42, hemiSky: 0xd8d8ff, hemiGround: 0x5a6a5a, cloud: 0.5, fog: { color: 0xf0caa8, near: 380, far: 2300 } },
  bukseol: { sky: { top: 0x6a8ab8, horizon: 0xe8f0f8, bottom: 0xc8d4e0 }, sunDir: [0.4, 0.32, -0.6], sunColor: 0xfff4e8, sun: 3.0, hemi: 0.6, hemiSky: 0xe0ecff, hemiGround: 0x9aa8b8, cloud: 0.62, fog: { color: 0xdde8f2, near: 300, far: 2200 } },
  jeoksa: { sky: { top: 0x3a66b0, horizon: 0xffd2a0, bottom: 0xc79a78 }, sunDir: [0.62, 0.36, -0.55], sunColor: 0xffc890, sun: 3.6, hemi: 0.4, hemiSky: 0xbcd0ff, hemiGround: 0x8a5a3a, cloud: 0.45, fog: { color: 0xeccaa2, near: 380, far: 2400 } },
  namdo: { sky: { top: 0x2a7ad0, horizon: 0xc8f0ff, bottom: 0x8ac8d8 }, sunDir: [0.3, 0.6, -0.5], sunColor: 0xfff8e0, sun: 3.6, hemi: 0.5, hemiSky: 0xd0f0ff, hemiGround: 0x4a8a6a, cloud: 0.42, fog: { color: 0xc8eaf4, near: 400, far: 2200 } },
  e1: { sky: { top: 0x4a5462, horizon: 0xa8a49a, bottom: 0x6a665e }, sunDir: [0.4, 0.4, -0.5], sunColor: 0xffd8b0, sun: 2.6, hemi: 0.45, hemiSky: 0xb0b4bc, hemiGround: 0x4a4844, cloud: 0.72, cloudDark: 0x6a6460, fog: { color: 0xa8a49c, near: 300, far: 2000 } },
  e2: { sky: { top: 0x3a2e2a, horizon: 0xd8885a, bottom: 0x5a3a2a }, sunDir: [-0.5, 0.25, -0.5], sunColor: 0xffa060, sun: 2.8, hemi: 0.38, hemiSky: 0xd8a080, hemiGround: 0x3a2a22, cloud: 0.7, cloudDark: 0x4a3028, fog: { color: 0xb8805a, near: 300, far: 2200 } },
  e3: { sky: { top: 0x0e0a14, horizon: 0x5a1a2a, bottom: 0x1a0a10 }, sunDir: [0.3, 0.3, -0.6], sunColor: 0xff8a8a, sun: 1.6, hemi: 0.4, hemiSky: 0x8a5a7a, hemiGround: 0x1a1018, cloud: 0.6, cloudDark: 0x2a1018, fog: { color: 0x3a1a26, near: 260, far: 1900 }, night: true, bloom: { strength: 0.75, radius: 0.6, threshold: 0.82 } },
};
const DESC = {
  hanul: "연합 수도 한울시와 네온 시티, 비행기지·단풍 고궁·드론 리그 스타디움이 한 평원에. 북설 산자락에서 내려온 강이 수도를 지난다",
  haerim: "서해안 항구 연방. 석양의 항만 조선소, 연합 함대 모항 해림 군항, 바닷길을 지키는 등대곶 요새",
  bukseol: "눈과 빙하의 북방. 얼음 성곽 서리성, 설국 산장 마을, 설원 통신기지, 제국과 맞닿은 산마루의 백령 요새",
  jeoksa: "붉은 사암 고원과 협곡. 계단식 광산 도시와 협곡 댐, 협곡 깊이 박힌 제국 2세대 전초기지",
  namdo: "남해의 화산 열도. 지열 발전 화산섬과 수상기 부두가 있는 산호항",
  e1: "전선 동쪽, 제국에 넘어간 옛 인간 땅. 폐허가 된 잿빛 관문시, 제국 코어 저장고, 옛 통합방위청 본부. 서쪽 끝은 포탄 구덩이 무인지대",
  e2: "제국이 직접 찍어 낸 공창 지대. 빙하 골짜기의 거신 공창, 남북을 가르는 강철 방벽, 흑철 조병창, 남해의 궤도 발사기지",
  e3: "에이아의 심장. 붉은 심장 첨탑과 모노리스 숲의 기계제국 수도, 문 없는 모노리스 요새, 기함이 정박한 심해 군항",
};
const G = (t, p, o = {}) => ({ t, p, ...o });
// 돌파 작전: 지역마다 적 요새 자리(지도 단위)와 이야기, 구역 테마 → 임무 종류
const STRIKE = {
  hanul: { fin: [472, 300], story: "제국군이 동부 전선을 뚫고 한울 평원에 교두보 요새를 세웠다. 수도로 오는 길목부터 되찾아라." },
  haerim: { fin: [205, 266], story: "제국 상륙 부대가 해림 해안 구릉에 진지를 박았다. 항구와 바닷길을 지켜라." },
  bukseol: { fin: [470, 206], story: "제국이 빙하 계곡을 타고 북설로 내려와 통신망을 노린다. 설산 아래로 낮게 숨어들어라." },
  jeoksa: { fin: [446, 455], story: "협곡 깊이 박힌 제국 전초기지가 적사 광산을 노린다. 협곡을 뚫고 요새를 무너뜨려라." },
  namdo: { fin: [240, 588], story: "제국이 서쪽 작은 섬에 기지를 세워 남해 바닷길을 끊었다. 섬과 바다를 되찾아라." },
  e1: { fin: [578, 300], story: "전선을 넘어 제국 1세대 점령지로 들어간다. 빼앗긴 도시를 지나 제국 요새를 쳐라." },
  e2: { fin: [702, 300], story: "제국 공창 지대 한복판, 슬래그 황무지의 지휘 요새를 쳐서 생산 라인을 멈춰라." },
  e3: { fin: [800, 342], story: "에이아의 심장부. 모노리스 숲 남쪽의 3세대 요새를 무너뜨려 수도로 가는 길을 연다." },
};
const MT = { city: ["infil", "fight"], river: ["fight", "seize"], base: ["seize", "fight"], heritage: ["infil", "seize"], arena: ["fight", "seize"], rural: ["seize", "fight"], front: ["fight"], port: ["seize", "fight"], coast: ["fight", "infil"],
  fort: ["fight", "seize"], snow: ["infil", "seize"], mountain: ["infil"], glacier: ["infil", "fight"], radar: ["infil", "seize"], canyon: ["infil", "fight"], mesa: ["fight"], mine: ["seize", "fight"], volcano: ["seize", "infil"],
  ruin: ["seize", "fight"], lab: ["infil"], wasteland: ["fight"], factory: ["seize", "fight"], launch: ["infil", "fight"], heart: ["fight"], monolith: ["infil", "fight"], flagship: ["fight"] };
// 지형 바닥 무늬: 구역 주인 땅에 맞춘다 (한 장에 재질 하나)
const TEX = {
  hanul: { flat: "grass", flatTint: "1.04, 1.02, 0.95" }, haerim: { flat: "grass", flatTint: "1.05, 1.0, 0.95" }, namdo: { flat: "grass", flatTint: "1.0, 1.06, 1.0" },
  bukseol: { flat: "dirt", flatTint: "1.06, 1.11, 1.24", rockTint: "0.86, 0.92, 1.08" }, jeoksa: { flat: "dirt", flatTint: "1.4, 1.36, 1.2", rockTint: "1.32, 0.8, 0.55" },
  e1: { flat: "dirt", flatTint: "1.12, 1.1, 1.06", rockTint: "0.9, 0.9, 0.9" }, e2: { flat: "dirt", flatTint: "1.0, 0.92, 0.86", rockTint: "0.8, 0.7, 0.62" }, e3: { flat: "dirt", flatTint: "0.9, 0.82, 0.9", rockTint: "0.6, 0.5, 0.6" },
};

export function makeRegion(id, o = {}) {
  const R = REGIONS[id], [CX, CZ] = R.c, half = o.half || R.half;
  const toG = (x, z) => [x + CX, z + CZ], toL = (X, Z) => [X - CX, Z - CZ];
  const inWin = (X, Z, m = 0) => Math.abs(X - CX) < half + m && Math.abs(Z - CZ) < half + m;
  const here = SITES.filter((s) => inWin(s.p[0], s.p[1], 120));
  const hfn = (x, z) => height(x + CX, z + CZ);
  // ── 구운 지도 (tools/bake-nuri.mjs 가 만든 한 장의 그림). 있으면 계산 대신 읽는다 ──
  const BK = BAKE(id), BN = BK.seg + 1, BSTEP = (BK.half * 2) / BK.seg;
  let baked = null;
  async function preload() {
    if (baked) return;
    const res = await fetch(new URL(`./baked/${id}.png`, import.meta.url));
    if (!res.ok) throw new Error("구운 지도 없음 " + id);
    const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data, W = bmp.width, n = BN;
    const hs = new Float32Array(n * n), own = new Uint8Array(n * n), col = new Uint32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i, o = (j * W + i) * 4, c = (j * W + n + i) * 4;
      hs[k] = ((d[o] << 8) | d[o + 1]) / 100 - 64; own[k] = d[o + 2]; col[k] = (d[c] << 16) | (d[c + 1] << 8) | d[c + 2];
    }
    baked = { hs, own, col };
  }
  const cell = (x, z) => { const fx = (x + BK.half) / BSTEP, fz = (z + BK.half) / BSTEP; return fx < 0 || fz < 0 || fx > BK.seg || fz > BK.seg ? null : [fx, fz]; };
  const near = (x, z) => { const c = cell(x, z); return c ? Math.round(c[1]) * BN + Math.round(c[0]) : -1; };
  const hb = (x, z) => {
    const c = baked && cell(x, z); if (!c) return hfn(x, z);
    const i = Math.min(BK.seg - 1, c[0] | 0), j = Math.min(BK.seg - 1, c[1] | 0), tx = c[0] - i, tz = c[1] - j, H = baked.hs, k = j * BN + i;
    const a0 = H[k], b0 = H[k + 1], c0 = H[k + BN], e0 = H[k + BN + 1];
    return tx + tz <= 1 ? a0 + (b0 - a0) * tx + (c0 - a0) * tz : e0 + (c0 - e0) * (1 - tx) + (b0 - e0) * (1 - tz);
  };
  const colB = (x, y, z, sl) => { const k = baked ? near(x, z) : -1; return k >= 0 ? baked.col[k] : colorAt(x + CX, y, z + CZ, sl); };
  const ownL = (x, z) => { const k = baked ? near(x, z) : -1; return k >= 0 ? OWNS[baked.own[k] & 7] : ownerAt(x + CX, z + CZ); };
  const landL = (x, z) => { const k = baked ? near(x, z) : -1; return k >= 0 ? (baked.own[k] & 8) !== 0 : landD(x + CX, z + CZ) > 12; };
  const own = here.filter((s) => s.o === R.owner || (R.owner.startsWith("e") && s.o.startsWith("e")));
  const friend = here.filter((s) => !s.o.startsWith("e")), foe = here.filter((s) => s.o.startsWith("e"));

  // 출발점: 우리 편 거점 가장자리 (제국 땅이면 창 서쪽 끝 = 전선 쪽)
  let spawnG;
  if (friend.length && !R.owner.startsWith("e")) { const s = own[0] || friend[0]; spawnG = [s.p[0] - (s.r || 120) * 0.6, s.p[1] + (s.r || 120) * 0.9]; }
  else { spawnG = [CX - half * 0.82, CZ]; for (let k = 0; k < 30 && landD(spawnG[0], spawnG[1]) < 60; k++) spawnG[0] += 40; }
  const [SX, SZ] = toL(...spawnG);
  const redS = foe[0] || here.find((s) => s !== own[0]) || here[0];
  const redL = redS ? toL(redS.p[0], redS.p[1]) : [half * 0.6, 0];

  // 경기 코스: 창 안 거점들을 잇는 큰 고리 (거점 상공을 낮게 꿴다)
  const tour = (here.length >= 2 ? here : SITES.slice(0, 3)).map((s) => toL(s.p[0], s.p[1])).filter(([x, z]) => Math.abs(x) < half - 60 && Math.abs(z) < half - 60);
  const ang = (p) => Math.atan2(p[1], p[0]); tour.sort((a, b) => ang(a) - ang(b));
  const gates = [];
  if (tour.length >= 2) for (let i = 0; i < tour.length; i++) {
    const a = tour[i], b = tour[(i + 1) % tour.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(L / 160));
    for (let k = 0; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t + Math.sin(t * Math.PI) * 40, z = a[1] + (b[1] - a[1]) * t; gates.push(G(k === 0 ? "hoop" : "ring", [x, Math.max(0, hfn(x, z)) + 34 + (k % 3) * 6, z], { r: k === 0 ? 9 : 7 })); }
  }
  if (gates.length < 4) { gates.length = 0; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * half * 0.45, z = Math.sin(a) * half * 0.35; gates.push(G(i ? "ring" : "hoop", [x, Math.max(0, hfn(x, z)) + 36, z], { r: i ? 7 : 9 })); } }
  const tracks = gates.length >= 4 ? [{ id: "tour", name: `${R.name} 일주`, level: 3, laps: 1, desc: `${R.name}의 거점 상공을 차례로 꿰는 장거리 코스`, gates }] : [];
  const convoy = tour.length >= 2 ? tour.map(([x, z]) => [x, 0, z, 14]) : [[0, 0, 0, 14], [200, 0, 0, 14]];
  const tracking = [{ id: "recon", name: "정찰기", type: "drone", level: 2, desc: `${R.name} 상공을 크게 도는 정찰기를 따라가세요`, duration: 90, path: convoy.map(([x, , z, v]) => [x, Math.max(0, hfn(x, z)) + 60, z, v + 8]) }];

  function build(w) {
    w.terrain(hb, colB, { seg: w.quality === "low" ? Math.round(BK.seg * 0.75) : BK.seg, margin: MARGIN, rockLo: 0.32, rockHi: 0.6, ...TEX[R.owner] });
    w.water(0, id === "e3" ? 0x1a0e18 : id === "e2" ? 0x2a2620 : 0x1f5f7a);
    // 나무 위치를 모아 먼 거리용 그림(빌보드)을 만든다
    const TREES = [], tree0 = w.tree;
    w.tree = function (x, z, s2 = 1, kind = "round") { tree0.call(this, x, z, s2, kind); if (kind !== "bush") TREES.push(x, w.h(x, z), z, s2, kind === "pine" ? 1 : 0); };
    // 거점
    const PF = globalThis.NURI_PROF, tm = () => performance.now(); let t0 = tm();
    for (const s of here) { const f = BUILD[s.id]; if (f) { const [x, z] = toL(s.p[0], s.p[1]); f(w, x, z, s, { toG, toL }); if (PF) { PF[s.id] = (PF[s.id] || 0) + tm() - t0; t0 = tm(); } } }
    const nearSite = (X, Z, m) => SITES.some((s) => Math.hypot(X - s.p[0], Z - s.p[1]) < (s.r || 160) + m);
    const nearRoad = (X, Z, m) => ROADS.some(([a, b]) => lineDist([a, b], X, Z).d < m);
    // 전선: 서쪽(연합) 참호 · 동쪽(제국) 벙커와 대전차 장애물
    for (let i = 0; i < FRONT.length - 1; i++) {
      const [ax, az] = FRONT[i], [bx, bz] = FRONT[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;   // 동쪽(+x) 법선
      for (let t = 0; t < L; t += 45) {
        const X = ax + ((bx - ax) * t) / L, Z = az + ((bz - az) * t) / L;
        if (!inWin(X, Z) || !landL(X - CX, Z - CZ)) continue;
        const [ex, ez] = toL(X + nx * 90, Z + nz * 90), [wx, wz] = toL(X - nx * 110, Z - nz * 110), [mx, mz] = toL(X, Z);
        tankTrap(w, ex, ez); if ((t / 45) % 3 === 0) bunker(w, ex + nx * 30, ez + nz * 30, Math.atan2(-nz, nx) * 57.3 + 90, ST.e1);
        w.box(wx, w.h(wx, wz) - 1.6, wz, 46, 2, 3.2, 0x3a3228, { ry: Math.atan2(-(bz - az), bx - ax) * 57.3, col: false });
        if ((t / 45) % 4 === 1) wreck(w, mx + (w.rand() - 0.5) * 60, mz + (w.rand() - 0.5) * 60, w.rand() * 360);
      }
    }
    if (PF) { PF.front = tm() - t0; t0 = tm(); }
    // 들판·숲·마을: 70m 격자, 세력마다 다르게 (잡음으로 군락)
    const r = w.rand, step = 70, lim = half - 20;
    let trees = 0, props = 0;
    const q = w.quality, TREE_MAX = q === "low" ? 550 : q === "high" ? 1400 : 1000, PROP_MAX = q === "low" ? 380 : q === "high" ? 850 : 650;   // 품질별 나무·소품 수
    for (let x = -lim; x < lim; x += step) for (let z = -lim; z < lim; z += step) {
      const jx = x + (r() - 0.5) * step, jz = z + (r() - 0.5) * step, [X, Z] = toG(jx, jz), y = w.h(jx, jz);
      if (y < 2 || nearSite(X, Z, 40) || nearRoad(X, Z, 32)) continue;
      const k = ownL(jx, jz), n = fbm(X / 420, Z / 420, 3), m = vnoise(X / 90, Z / 90);
      if (k === "hanul" || k === "haerim") {
        if (n > 0.18 && trees < TREE_MAX) { forest(w, jx, jz, 30, 5, "round"); trees += 5; }
        else if (n < -0.15 && props < PROP_MAX) { fields(w, jx, jz, 30, 2); props += 2; }
        else if (m > 0.62 && props < PROP_MAX) { village(w, jx, jz, 5, ST[k]); props += 5; }
        else if (m < -0.7 && props < PROP_MAX) { turbine(w, jx, jz, 46, r() * 360); props++; }
      } else if (k === "bukseol") {
        if (y < 90 + (Z + 1500) * 0.04 && n > -0.1 && trees < TREE_MAX) { forest(w, jx, jz, 34, 6, "pine"); trees += 6; }
        else if (m > 0.5 && props < PROP_MAX) { w.rock(jx, jz, 4 + r() * 6, 0x9aa4ae); props++; }
      } else if (k === "jeoksa") {
        if (m > 0.35 && props < PROP_MAX) { const yy = floorAt(w, jx, jz, 5); w.cone(jx, yy - 1, jz, 4 + r() * 4, 14 + r() * 18, 0xb86a3a, { mat: "std:rock", grad: [0.7, 1.1] }); props++; }
        else if (m < -0.4 && props < PROP_MAX) { w.rock(jx, jz, 3 + r() * 5, 0xa0603a); props++; }
        else if (n > 0.35 && trees < TREE_MAX) { w.tree(jx, jz, 0.7, "bush"); trees++; }
      } else if (k === "namdo") {
        if (trees < TREE_MAX && n > -0.2) { forest(w, jx, jz, 25, 4, "round"); trees += 4; }
      } else if (k === "e1") {
        if (m > 0.4 && props < PROP_MAX) { tower(w, jx, jz, 10 + r() * 8, 10 + r() * 8, 8 + r() * 16, ST.e1, "ruin", r() * 90); props++; }
        else if (m < -0.55 && props < PROP_MAX) { wreck(w, jx, jz, r() * 360); props++; }
        else if (n > 0.3 && trees < TREE_MAX) { w.tree(jx, jz, 0.8, "bush"); trees++; }
      } else if (k === "e2") {
        if (m > 0.45 && props < PROP_MAX) { const yy = floorAt(w, jx, jz, 6); w.cone(jx, yy - 1, jz, 9 + r() * 8, 6 + r() * 8, 0x2a2420, { mat: "std:rock" }); props++; }
        else if (m < -0.6 && props < PROP_MAX) { tower(w, jx, jz, 12, 10, 8 + r() * 10, ST.e2, "e2", r() * 90); props++; }
      } else if (k === "e3") {
        if (m > 0.62 && props < PROP_MAX) { monolith(w, jx, jz, 18 + r() * 40, ST.e3, { w: 3 + r() * 4, thin: true, ring: false, ry: r() * 90 }); props++; }
      }
    }
    if (PF) { PF.scatter = tm() - t0; t0 = tm(); }
    // 도로: 거점 가장자리에서 끊어 진짜 도로로 (다리 포함). 연합 도로는 가로등과 길가 주택가
    const inSite = (x, z) => { const [X, Z] = toG(x, z); return SITES.some((s) => s.r && Math.hypot(X - s.p[0], Z - s.p[1]) < s.r * 0.82); };
    for (const [a, b, ia, ib] of ROADS) {
      if (!inWin(a[0], a[1], 200) && !inWin(b[0], b[1], 200)) continue;
      const sa = SITES.find((s) => s.id === ia), sb = SITES.find((s) => s.id === ib), enemy = sa.o.startsWith("e") || sb.o.startsWith("e");
      const [ax, az] = toL(...a), [bx, bz] = toL(...b);
      const clip = (x, z) => inSite(x, z) || Math.abs(x) > half + 300 || Math.abs(z) > half + 300;
      road(w, ax, az, bx, bz, { w: enemy ? 12 : 10, col: enemy ? 0x2a2a2c : 0x34363c, lamp: enemy ? null : 0xffe2a8, skip: clip });
      if (!enemy) {
        const L = Math.hypot(bx - ax, bz - az), city = (s) => s.t === "cap" || s.t === "city";
        if (city(sa)) roadside(w, ax, az, bx, bz, ST[sa.o], { t0: sa.r * 0.9, t1: Math.min(L * 0.45, sa.r + 380), skip: clip });
        if (city(sb)) roadside(w, bx, bz, ax, az, ST[sb.o], { t0: sb.r * 0.9, t1: Math.min(L * 0.45, sb.r + 380), skip: clip });
      }
    }
    // 송전선: 연합 도로 몇 개를 따라
    for (const [a, b, ia, ib] of ROADS) {
      const sa = SITES.find((s) => s.id === ia), sb = SITES.find((s) => s.id === ib);
      if (sa.o.startsWith("e") || sb.o.startsWith("e")) continue;
      if (!inWin(a[0], a[1], -100) && !inWin(b[0], b[1], -100)) continue;
      const [ax, az] = toL(...a), [bx, bz] = toL(...b);
      pylonLine(w, ax, az, bx, bz, 130);
    }
    delete w.tree;
    const q2 = w.quality; treeImpostors(w, TREES, { near: q2 === "low" ? 480 : q2 === "high" ? 1000 : 720, snow: R.owner === "bukseol" });
    void smooth;
  }

  const env = { ...ENV[R.owner] };
  return {
    id: "nuri_" + id,
    name: `누리 대륙 · ${R.name}`,
    desc: `대형 맵 · ${DESC[id]}`,
    size: half,
    ceiling: id === "bukseol" || id === "e2" ? 520 : 400,
    seed: 900 + Object.keys(REGIONS).indexOf(id),
    chunk: 420,
    nuri: { region: id, center: [CX, CZ], half },   // 나중에 합칠 때 쓰는 대륙 좌표 정보
    env,
    spawn: { pos: [SX, 0, SZ], yaw: Math.atan2(-(redL[0] - SX), -(redL[1] - SZ)) * 57.3 },
    thumb: { pos: [SX, Math.max(0, hfn(SX, SZ)) + 160, SZ], look: [redL[0] * 0.5 + SX * 0.5, 40, redL[1] * 0.5 + SZ * 0.5] },
    build,
    tracks,
    tracking,
    combat: { blue: [SX, SZ], red: redL, depots: here.slice(0, 4).map((s) => toL(s.p[0], s.p[1])) },
    height: hfn,
    thumbDraw: (W, H) => drawThumb(id, W, H),
    land: landL,
    preload,   // 게임 시작 전에 구운 지도를 읽는다 (main.startSession)
    // 돌파 작전: 적 요새 자리 · 구역(이 지역 구역 중 땅 위) · 이야기
    strike: (() => {
      const S = STRIKE[id], [fx, fz] = toW(S.fin[0], S.fin[1]);
      const zones = NZ.filter((z) => z.region === id && z.theme !== "sea").map((z) => { const [x, zz] = toL(z.p[0], z.p[1]); return { name: z.name, x, z: zz, r: Math.min(z.r, 60), what: THEME[z.theme].name, use: z.use, t: MT[z.theme] || ["fight"] }; });
      return { fin: toL(fx, fz), zones, story: S.story };
    })(),   // 바다 위에는 적·보급을 두지 않는다
  };
}

// 썸네일: 미리 구운 대륙 입체 지형도에서 이 지역을 확대하고, 거점·전선·이름을 얹는다
const FILL = { hanul: "#3fb39c", haerim: "#4a7fd0", bukseol: "#a9cfe0", jeoksa: "#d0773f", namdo: "#74b356", e1: "#9aa0a8", e2: "#e0874a", e3: "#ff4a5a" };
let CIMG = null;
if (typeof Image !== "undefined") { CIMG = new Image(); CIMG.src = new URL("./baked/continent.png", import.meta.url).href; }
function drawThumb(id, W, H) {
  if (!CIMG || !CIMG.complete || !CIMG.naturalWidth) return null;   // 아직 못 읽었으면 다음에 다시
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), R = REGIONS[id], C = CONT, kx = CIMG.naturalWidth / (C.x1 - C.x0), kz = CIMG.naturalHeight / (C.z1 - C.z0);
  // 보여 줄 범위: 지역 창 + 여유, 그림 비율에 맞춰
  const pad = R.half * 0.16, vh = R.half * 2 + pad * 2, vw = vh * (W / H), vx = R.c[0] - vw / 2, vz = R.c[1] - vh / 2;
  const P = (x, z) => [((x - vx) / vw) * W, ((z - vz) / vh) * H];
  g.fillStyle = "#16416a"; g.fillRect(0, 0, W, H);   // 지도 그림 밖은 먼바다
  g.imageSmoothingQuality = "high";
  g.drawImage(CIMG, (vx - C.x0) * kx, (vz - C.z0) * kz, vw * kx, vh * kz, 0, 0, W, H);
  // 지역 창 밖은 어둡게, 창 테두리는 세력색 빛
  const [ax, ay] = P(R.c[0] - R.half, R.c[1] - R.half), [bx, by] = P(R.c[0] + R.half, R.c[1] + R.half), col = FILL[R.owner];
  g.save(); g.fillStyle = "rgba(4,10,20,0.5)"; g.beginPath(); g.rect(0, 0, W, H); g.rect(ax, ay, bx - ax, by - ay); g.fill("evenodd"); g.restore();
  g.save(); g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = col; g.lineWidth = 2.5; g.strokeRect(ax, ay, bx - ax, by - ay); g.restore();
  const cl = 14; g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath();
  for (const [x, y, sx, sy] of [[ax, ay, 1, 1], [bx, ay, -1, 1], [ax, by, 1, -1], [bx, by, -1, -1]]) { g.moveTo(x, y + sy * cl); g.lineTo(x, y); g.lineTo(x + sx * cl, y); }
  g.stroke();
  // 전선
  g.save(); g.beginPath(); FRONT.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.setLineDash([7, 5]); g.strokeStyle = "#ff3a3a"; g.lineWidth = 2.4; g.shadowColor = "#000"; g.shadowBlur = 4; g.stroke(); g.restore();
  // 거점: 수도는 별, 제국은 붉은 마름모, 연합은 흰 원 + 이름
  g.font = "700 12px 'Noto Sans KR', sans-serif"; g.textBaseline = "middle";
  for (const s of SITES) {
    const [x, y] = P(s.p[0], s.p[1]); if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    const foe = s.o.startsWith("e"), inside = x > ax && x < bx && y > ay && y < by;
    g.save(); g.globalAlpha = inside ? 1 : 0.55; g.shadowColor = "#000"; g.shadowBlur = 5;
    g.fillStyle = foe ? "#ff4a5a" : s.t === "cap" ? "#ffd24a" : "#ffffff"; g.beginPath();
    if (foe) { g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); }
    else if (s.t === "cap") { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 3.2 : 7.5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } }
    else g.arc(x, y, 4.2, 0, Math.PI * 2);
    g.closePath(); g.fill(); g.lineWidth = 1.5; g.strokeStyle = "rgba(0,0,0,0.6)"; g.stroke();
    if (inside) { g.fillStyle = "#fff"; g.fillText(s.n, x + 9, y); }
    g.restore();
  }
  // 제목 띠
  const tg = g.createLinearGradient(0, 0, 0, 46); tg.addColorStop(0, "rgba(4,10,20,0.85)"); tg.addColorStop(1, "rgba(4,10,20,0)");
  g.fillStyle = tg; g.fillRect(0, 0, W, 46);
  g.fillStyle = col; g.fillRect(14, 12, 4, 22);
  g.font = "800 21px 'Noto Sans KR', sans-serif"; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.shadowColor = "#000"; g.shadowBlur = 6; g.fillText(R.name, 26, 23); g.shadowBlur = 0;
  // 대륙 속 위치 (오른쪽 아래 작은 지도)
  const mw = 96, mh = mw * ((C.z1 - C.z0) / (C.x1 - C.x0)), mx = W - mw - 8, my = 8;
  g.save(); g.globalAlpha = 0.92; g.drawImage(CIMG, mx, my, mw, mh); g.restore();
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1; g.strokeRect(mx, my, mw, mh);
  const q = (x, z) => [mx + ((x - C.x0) / (C.x1 - C.x0)) * mw, my + ((z - C.z0) / (C.z1 - C.z0)) * mh], [qa, qb] = q(R.c[0] - R.half, R.c[1] - R.half), [qc, qd] = q(R.c[0] + R.half, R.c[1] + R.half);
  g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(qa, qb, qc - qa, qd - qb);
  return cv.toDataURL("image/jpeg", 0.88);
}
