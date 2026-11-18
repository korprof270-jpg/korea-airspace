// 대형 지상·공중 유닛(전차·대공 로봇·거대로봇·전투함)의 외피: 패널 이음선·리벳·때 묻은 결을 그린 공용 텍스처,
// 모서리를 깎은 상자, 금속 재질. 툰 셰이딩으로 바뀐 뒤에도 map·normalMap 과 금속 광택이 살아 있어 "장난감" 느낌을 줄인다
import * as THREE from "../vendor/three.module.min.js";

const N = 512;
let _tex = null;

// 결정적 난수 (매번 같은 무늬)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function build() {
  const R = rng(7);
  // 높이 맵: 1 = 판 표면, 0 = 이음 홈
  const hc = document.createElement("canvas"); hc.width = hc.height = N;
  const h = hc.getContext("2d");
  h.fillStyle = "#fff"; h.fillRect(0, 0, N, N);
  const col = document.createElement("canvas"); col.width = col.height = N;
  const g = col.getContext("2d");
  g.fillStyle = "#e9ebee"; g.fillRect(0, 0, N, N);

  // 판 나누기: 큰 판을 재귀로 쪼갠다 (타일이 이어지도록 가장자리에도 이음선)
  const panels = [];
  const split = (x, y, w, hh, d) => {
    if (d > 2 || (d > 1 && R() < 0.4) || w < 110 || hh < 110) { panels.push([x, y, w, hh]); return; }
    if (w > hh ? R() < 0.8 : R() < 0.2) { const k = Math.round(w * (0.3 + R() * 0.4)); split(x, y, k, hh, d + 1); split(x + k, y, w - k, hh, d + 1); }
    else { const k = Math.round(hh * (0.3 + R() * 0.4)); split(x, y, w, k, d + 1); split(x, y + k, w, hh - k, d + 1); }
  };
  split(0, 0, N, N, 0);
  for (const [x, y, w, hh] of panels) {
    // 판마다 도장 톤이 조금씩 다르다
    const v = 222 + Math.round((R() - 0.5) * 22);
    g.fillStyle = `rgb(${v},${v + 1},${v + 3})`; g.fillRect(x + 2, y + 2, w - 4, hh - 4);
    // 이음 홈
    g.strokeStyle = "rgba(40,44,52,0.55)"; g.lineWidth = 2.5; g.strokeRect(x + 1.5, y + 1.5, w - 3, hh - 3);
    h.strokeStyle = "#000"; h.lineWidth = 4; h.strokeRect(x + 1.5, y + 1.5, w - 3, hh - 3);
    // 홈 옆 밝은 모서리 (빛 받는 쪽)
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 4, y + hh - 4); g.lineTo(x + 4, y + 4); g.lineTo(x + w - 4, y + 4); g.stroke();
    // 리벳 줄
    if (R() < 0.6) {
      const n = Math.max(2, Math.floor(w / 26));
      for (let i = 0; i < n; i++) for (const yy of [y + 9, y + hh - 9]) {
        const xx = x + 10 + (i * (w - 20)) / Math.max(1, n - 1);
        g.fillStyle = "rgba(60,64,72,0.7)"; g.beginPath(); g.arc(xx, yy, 2.4, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(xx - 0.7, yy - 0.7, 1.1, 0, 7); g.fill();
        h.fillStyle = "#ccc"; h.beginPath(); h.arc(xx, yy, 2.6, 0, 7); h.fill();
      }
    }
    // 점검 해치·환기구
    if (w > 110 && hh > 90 && R() < 0.45) {
      const hw = w * (0.3 + R() * 0.2), hh2 = hh * (0.25 + R() * 0.2), hx = x + (w - hw) * R(), hy = y + (hh - hh2) * R();
      if (R() < 0.5) {   // 환기 슬랫
        for (let k = 0; k < 6; k++) {
          const yy = hy + (k + 0.5) * (hh2 / 6);
          g.fillStyle = "rgba(30,34,40,0.8)"; g.fillRect(hx + 4, yy - 2, hw - 8, 3.5);
          h.fillStyle = "#222"; h.fillRect(hx + 4, yy - 2, hw - 8, 3.5);
        }
      } else {           // 해치 테두리
        g.strokeStyle = "rgba(40,44,52,0.7)"; g.lineWidth = 2; g.strokeRect(hx, hy, hw, hh2);
        h.strokeStyle = "#333"; h.lineWidth = 2.5; h.strokeRect(hx, hy, hw, hh2);
      }
    }
  }
  // 때·긁힘: 홈 아래로 흘러내린 얼룩과 모서리 마모
  for (let i = 0; i < 260; i++) {
    const x = R() * N, y = R() * N, l = 6 + R() * 26;
    g.strokeStyle = `rgba(70,62,50,${0.04 + R() * 0.08})`; g.lineWidth = 1 + R() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y + l); g.stroke();
  }
  for (let i = 0; i < 140; i++) {
    const x = R() * N, y = R() * N;
    g.strokeStyle = `rgba(255,255,255,${0.12 + R() * 0.2})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 14, y + (R() - 0.5) * 5); g.stroke();
  }
  const img = g.getImageData(0, 0, N, N), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);

  // 높이 → 법선
  const hd = h.getImageData(0, 0, N, N).data, nc = document.createElement("canvas"); nc.width = nc.height = N;
  const nx = nc.getContext("2d"), ni = nx.createImageData(N, N), nd = ni.data;
  const H = (x, y) => hd[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1), o = (y * N + x) * 4;
    nd[o] = (-dx / l * 0.5 + 0.5) * 255; nd[o + 1] = (dy / l * 0.5 + 0.5) * 255; nd[o + 2] = (1 / l * 0.5 + 0.5) * 255; nd[o + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);

  const mk = (cv, srgb) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(0.3, 0.3);   // 기하의 월드 UV(단위 m) 기준: 약 3.3m 마다 무늬가 반복
    return t;
  };
  return { map: mk(col, true), normal: mk(nc, false) };
}

export function unitTex() {
  if (_tex) return _tex;
  try { _tex = build(); } catch (e) { console.warn("유닛 외피 텍스처 실패", e); _tex = { map: null, normal: null }; }
  return _tex;
}

// 도장 철판(밝은 색) · 기계부(어두운 색) 재질. 툰 변환 때 금속 광택·림 라이트로 바뀐다
// rep: 무늬 반복 밀도(1m 당). 거대로봇처럼 큰 기체는 작게 줘서 판이 커 보이게 한다
const _rep = new Map();
function repTex(t, rep) {
  const k = t.uuid + rep;
  let r = _rep.get(k);
  if (!r) { r = t.clone(); r.repeat.set(rep, rep); r.needsUpdate = true; _rep.set(k, r); }
  return r;
}
export function armorMat(c, rep = 0.3) {
  const col = new THREE.Color(c), T0 = unitTex(), dark = col.getHSL({}).l < 0.2;
  const T = T0.map ? { map: repTex(T0.map, rep), normal: repTex(T0.normal, rep) } : T0;
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: dark ? 0.5 : 0.38, metalness: dark ? 0.75 : 0.45 });
  if (T.map) { m.map = T.map; m.normalMap = T.normal; m.normalScale = new THREE.Vector2(dark ? 0.4 : 0.8, dark ? 0.4 : 0.8); }
  return m;
}

// 모서리를 깎은 상자 (크기별로 공유). UV 는 월드 단위라 패널 무늬 크기가 상자마다 같다
const _geo = new Map();
export function chamferBox(w, h, d) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let geo = _geo.get(key);
  if (geo) return geo;
  const b = Math.min(0.16, Math.min(w, h, d) * 0.14);
  if (b < 0.02) {
    geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv, pos = geo.attributes.position, nor = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {   // 면마다 월드 크기로 UV 를 다시 잡는다
      const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i));
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (ax > 0.5) uv.setXY(i, z, y); else if (ay > 0.5) uv.setXY(i, x, z); else uv.setXY(i, x, y);
    }
  } else {
    const s = new THREE.Shape(), hw = w / 2 - b, hh = h / 2 - b;
    s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.lineTo(-hw, -hh);
    const depth = Math.max(0.001, d - 2 * b);
    geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: 0, bevelSegments: 1, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
  }
  _geo.set(key, geo);
  return geo;
}
