// 누리 대륙 구역 맵 만들기: 대륙 좌표에서 창 하나(c, half)를 잘라 한 장의 맵으로
//  · 지형·색은 대륙 함수, 거점은 창 안에 드는 것 모두(이웃 나라 거점이 걸쳐도 같이 지어진다)
//  · 합칠 때는 창만 넓히면 된다 (makeRegion 의 win 을 크게)
import { REGIONS, REGIONS_POLY, LAND, ISLANDS, SITES, ROADS, FRONT, height, colorAt, ownerAt, landD, fbm, vnoise, lineDist, smooth } from "./geo.js";
import { BUILD } from "./sites.js";
import { ST, forest, village, fields, turbine, pylonLine, tankTrap, bunker, wreck, tower, monolith, floorAt } from "./kit.js";

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
    w.terrain(hfn, (x, y, z, sl) => colorAt(x + CX, y, z + CZ, sl), { seg: w.quality === "low" ? 300 : half > 1400 ? 440 : 400, margin: 900, rockLo: 0.32, rockHi: 0.6, ...TEX[R.owner] });
    w.water(0, id === "e3" ? 0x1a0e18 : id === "e2" ? 0x2a2620 : 0x1f5f7a);
    // 거점
    for (const s of here) { const f = BUILD[s.id]; if (f) { const [x, z] = toL(s.p[0], s.p[1]); f(w, x, z, s, { toG, toL }); } }
    const nearSite = (X, Z, m) => SITES.some((s) => Math.hypot(X - s.p[0], Z - s.p[1]) < (s.r || 160) + m);
    const nearRoad = (X, Z, m) => ROADS.some(([a, b]) => lineDist([a, b], X, Z).d < m);
    // 전선: 서쪽(연합) 참호 · 동쪽(제국) 벙커와 대전차 장애물
    for (let i = 0; i < FRONT.length - 1; i++) {
      const [ax, az] = FRONT[i], [bx, bz] = FRONT[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;   // 동쪽(+x) 법선
      for (let t = 0; t < L; t += 45) {
        const X = ax + ((bx - ax) * t) / L, Z = az + ((bz - az) * t) / L;
        if (!inWin(X, Z) || landD(X, Z) < 30) continue;
        const [ex, ez] = toL(X + nx * 90, Z + nz * 90), [wx, wz] = toL(X - nx * 110, Z - nz * 110), [mx, mz] = toL(X, Z);
        tankTrap(w, ex, ez); if ((t / 45) % 3 === 0) bunker(w, ex + nx * 30, ez + nz * 30, Math.atan2(-nz, nx) * 57.3 + 90, ST.e1);
        w.box(wx, w.h(wx, wz) - 1.6, wz, 46, 2, 3.2, 0x3a3228, { ry: Math.atan2(-(bz - az), bx - ax) * 57.3, col: false });
        if ((t / 45) % 4 === 1) wreck(w, mx + (w.rand() - 0.5) * 60, mz + (w.rand() - 0.5) * 60, w.rand() * 360);
      }
    }
    // 들판·숲·마을: 70m 격자, 세력마다 다르게 (잡음으로 군락)
    const r = w.rand, step = 70, lim = half - 20;
    let trees = 0, props = 0;
    const TREE_MAX = 1100, PROP_MAX = 700;
    for (let x = -lim; x < lim; x += step) for (let z = -lim; z < lim; z += step) {
      const jx = x + (r() - 0.5) * step, jz = z + (r() - 0.5) * step, [X, Z] = toG(jx, jz), y = hfn(jx, jz);
      if (y < 2 || nearSite(X, Z, 40) || nearRoad(X, Z, 16)) continue;
      const k = ownerAt(X, Z), n = fbm(X / 420, Z / 420, 3), m = vnoise(X / 90, Z / 90);
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
    // 송전선: 연합 도로 몇 개를 따라
    for (const [a, b, ia, ib] of ROADS) {
      const sa = SITES.find((s) => s.id === ia), sb = SITES.find((s) => s.id === ib);
      if (sa.o.startsWith("e") || sb.o.startsWith("e")) continue;
      if (!inWin(a[0], a[1], -100) && !inWin(b[0], b[1], -100)) continue;
      const [ax, az] = toL(...a), [bx, bz] = toL(...b);
      pylonLine(w, ax, az, bx, bz, 130);
    }
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
    land: (x, z) => landD(x + CX, z + CZ) > 12,   // 바다 위에는 적·보급을 두지 않는다
  };
}

// 썸네일: 대륙 지도 위에 이 구역 창을 밝게
const FILL = { hanul: "#3fb39c", haerim: "#4a7fd0", bukseol: "#a9cfe0", jeoksa: "#d0773f", namdo: "#74b356", e1: "#6c7179", e2: "#a2582c", e3: "#c22a3c" };
function drawThumb(id, W, H) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), R = REGIONS[id], k = Math.min(W / 7400, H / 4600) * 0.9, ox = W / 2, oy = H / 2 + 14 - 160 * k;
  const P = (x, z) => [ox + x * k, oy + z * k];
  g.fillStyle = "#0e2236"; g.fillRect(0, 0, W, H);
  const landPath = () => { g.beginPath(); LAND.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); for (const I of ISLANDS) { const [a, b] = P(I.c[0], I.c[1]); g.moveTo(a + I.rx * k, b); g.ellipse(a, b, I.rx * k, I.ry * k, 0, 0, Math.PI * 2); } };
  g.save(); landPath(); g.clip();
  for (const [key, poly] of Object.entries(REGIONS_POLY)) { g.beginPath(); poly.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fillStyle = FILL[key]; g.globalAlpha = key === R.owner ? 1 : 0.45; g.fill(); }
  g.restore(); g.globalAlpha = 1;
  landPath(); g.strokeStyle = "#e8f0f8"; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); FRONT.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.setLineDash([6, 4]); g.strokeStyle = "#ff4a4a"; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
  for (const s of SITES) { const [a, b] = P(s.p[0], s.p[1]); g.beginPath(); g.arc(a, b, s.t === "cap" ? 4 : 2.6, 0, Math.PI * 2); g.fillStyle = s.t === "cap" ? "#ffd24a" : "#fff"; g.fill(); }
  const [x0, y0] = P(R.c[0] - R.half, R.c[1] - R.half), sz = R.half * 2 * k;
  g.strokeStyle = "#ffd24a"; g.lineWidth = 3; g.strokeRect(x0, y0, sz, sz);
  g.fillStyle = "#ffd24a"; g.font = "bold 22px 'Noto Sans KR', sans-serif"; g.textBaseline = "top"; g.fillText(R.name, 12, 10);
  return cv.toDataURL("image/jpeg", 0.85);
}
