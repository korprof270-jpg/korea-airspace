// 절차적 텍스처(만화풍): 사진 같은 잡티 대신 굵은 모양(창·이음매·벽돌·판자·지층)과 평면 톤으로 칠한다
// 음영은 툰 셰이더가 담당하므로 색·발광 맵만 만든다 (외부 이미지 없음)
import * as THREE from "../vendor/three.module.min.js";

const cache = new Map();

function hash(x, y, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// 타일링되는 값 노이즈 fBm (0..1). base = 첫 옥타브의 격자 수
function field(size, base, oct, seed, sx = 1, sy = 1) {
  const out = new Float32Array(size * size);
  let amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) {
    const px = Math.max(1, Math.round(base * sx * (1 << o))), py = Math.max(1, Math.round(base * sy * (1 << o)));
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * py, iy = Math.floor(fy), ty = fy - iy, wy = ty * ty * (3 - 2 * ty);
      const y0 = iy % py, y1 = (iy + 1) % py;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * px, ix = Math.floor(fx), tx = fx - ix, wx = tx * tx * (3 - 2 * tx);
        const x0 = ix % px, x1 = (ix + 1) % px;
        const a = hash(x0, y0, seed + o), b = hash(x1, y0, seed + o), c = hash(x0, y1, seed + o), d = hash(x1, y1, seed + o);
        out[y * size + x] += (a + (b - a) * wx + (c - a + (a - b - c + d) * wx) * wy) * amp;
      }
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

function toTexture(data, size, srgb) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  cv.getContext("2d").putImageData(new ImageData(data, size, size), 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// 예전 PBR 세트와 모양을 맞추기 위한 1×1 중립 맵(평평한 노멀, 기본 거칠기)
let neutral = null;
function neutralMaps() {
  if (!neutral) {
    const one = (r, g, b) => { const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; };
    neutral = { normalMap: one(128, 128, 255), ormMap: one(255, 210, 0) };
  }
  return neutral;
}

// fn(x, y, i, P) 가 P.c(색 0..1 ×3, 선형), P.e(발광 ×3) 를 채운다
function build(size, fn, emissive = false) {
  const col = new Uint8ClampedArray(size * size * 4);
  const em = emissive ? new Uint8ClampedArray(size * size * 4) : null;
  const P = { c: [1, 1, 1], e: [0, 0, 0] };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, k = i * 4;
    P.e[0] = P.e[1] = P.e[2] = 0;
    fn(x, y, i, P);
    // 선형 → sRGB 근사
    col[k] = Math.pow(Math.max(0, P.c[0]), 0.4545) * 255; col[k + 1] = Math.pow(Math.max(0, P.c[1]), 0.4545) * 255; col[k + 2] = Math.pow(Math.max(0, P.c[2]), 0.4545) * 255; col[k + 3] = 255;
    if (em) { em[k] = Math.pow(P.e[0], 0.4545) * 255; em[k + 1] = Math.pow(P.e[1], 0.4545) * 255; em[k + 2] = Math.pow(P.e[2], 0.4545) * 255; em[k + 3] = 255; }
  }
  const set = { map: toTexture(col, size, true), ...neutralMaps() };
  if (em) set.emissiveMap = toTexture(em, size, true);
  return set;
}

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 값을 n 단계의 평면 톤으로 끊는다(경계만 살짝 부드럽게)
const post = (v, n, soft = 0.06) => { const x = v * n, f = Math.floor(x); return (f + sm(0.5 - soft, 0.5 + soft, x - f)) / n; };
// 중심에서 d 만큼 떨어진 선(폭 w)의 덮임 정도
const band = (d, w, aa = 1) => 1 - sm(w - aa, w + aa, Math.abs(d));

// 손으로 그린 듯한 획 마스크. draw(g, rnd, size) 를 3×3 으로 반복해 타일 경계가 이어진다. 빨강 = 밝게(hi), 초록 = 어둡게(lo)
function strokes(size, seed, draw) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, size, size);
  g.lineCap = "round"; g.lineJoin = "round";
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.save(); g.translate(ox * size, oy * size); draw(g, r, size); g.restore();
  }
  const d = g.getImageData(0, 0, size, size).data, hi = new Float32Array(size * size), lo = new Float32Array(size * size);
  for (let i = 0; i < hi.length; i++) { hi[i] = d[i * 4] / 255; lo[i] = d[i * 4 + 1] / 255; }
  return { hi, lo };
}
const LIGHT = "#f00", DARK = "#0f0";

// 굵은 균열 몇 가닥
function crackStrokes(size, n, seed) {
  return strokes(size, seed, (g, r, S) => {
    g.strokeStyle = DARK;
    for (let i = 0; i < n; i++) {
      let x = r() * S, y = r() * S, a = r() * 6.28;
      g.lineWidth = 2 + r() * 1.6;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5 + r() * 6; k++) { a += (r() - 0.5) * 1.5; x += Math.cos(a) * 22; y += Math.sin(a) * 22; g.lineTo(x, y); }
      g.stroke();
    }
  }).lo;
}

const DEFS = {
  // 아스팔트 (타일 8m): 큰 얼룩 2~3톤 + 굵은 골재 점 + 균열. wet: 하늘이 비치는 물웅덩이 모양
  asphalt: (wet) => {
    const S = 512, a = field(S, 3, 2, 1), sp = field(S, 72, 1, 3), cr = crackStrokes(S, 5, 7), pu = field(S, 3, 2, 5), rf = field(S, 9, 2, 6, 3, 0.6);
    return build(S, (x, y, i, P) => {
      let v = 0.8 + (post(a[i], 3) - 0.5) * 0.1;
      v += sp[i] > 0.88 ? 0.09 : sp[i] < 0.09 ? -0.09 : 0;
      v -= cr[i] * 0.36;
      let r = v, g = v, b = v * 1.03;
      if (wet) {
        const p = sm(0.635, 0.655, pu[i]), rim = (sm(0.615, 0.635, pu[i]) - p) * 0.5;   // 웅덩이 면과 옅은 테두리
        const streak = p * band(rf[i] - 0.5, 0.012, 0.006);                  // 수면에 비친 빛줄기
        r += p * (0.08 + streak * 0.5) - rim * 0.16; g += p * (0.14 + streak * 0.5) - rim * 0.15; b += p * (0.3 + streak * 0.5) - rim * 0.12;
      }
      P.c[0] = r; P.c[1] = g; P.c[2] = b;
    });
  },
  wetasphalt: () => DEFS.asphalt(true),
  // 콘크리트 패널 (타일 6m, 2x2 패널): 이음매 + 모서리 하이라이트 + 폼타이 구멍 + 평면 얼룩
  concrete: () => {
    const S = 512, a = field(S, 3, 2, 11), st = field(S, 5, 2, 13);
    return build(S, (x, y, i, P) => {
      const u = x % 256, w = y % 256, edge = Math.min(u, 255 - u, w, 255 - w);
      let v = 0.92 + (post(a[i], 3) - 0.5) * 0.1 - sm(0.64, 0.66, st[i]) * 0.08;
      if (edge < 3) v = 0.52;
      else if (edge < 7) v += u < 7 || w < 7 ? 0.07 : -0.12;
      for (const hx of [52, 204]) for (const hy of [52, 204]) {
        const d = Math.hypot(u - hx, w - hy);
        if (d < 6) v = 0.5; else if (d < 9 && w > hy) v += 0.07;
      }
      P.c[0] = v; P.c[1] = v * 0.99; P.c[2] = v * 0.96;
    });
  },
  // 골함석·컨테이너 (타일 2m, 골 10개): 골마다 밝은 면·기본 면·그늘 면
  corrug: () => {
    const S = 256, a = field(S, 2, 2, 21);
    return build(S, (x, y, i, P) => {
      const t = ((x * 10) / S) % 1;
      let v = t < 0.14 ? 1.06 : t < 0.52 ? 0.93 : t < 0.66 ? 0.66 : 0.8;
      v += (post(a[i], 3) - 0.5) * 0.08;
      P.c[0] = v; P.c[1] = v; P.c[2] = v * 1.02;
    });
  },
  // 빌딩 외벽 (타일 24m = 창 8x8칸, 1칸 3m): 굵은 창틀, 유리의 사선 반사, 창턱 그림자. lit: 불 켜진 창
  facade: (lit) => {
    const S = 1024, C = 128, a = field(S, 4, 2, 31);
    return build(S, (x, y, i, P) => {
      const cx = x % C, cy = y % C, ix = (x / C) | 0, iy = (y / C) | 0;
      const inX = cx >= 18 && cx < 110, inY = cy >= 24 && cy < 98;
      if (inX && inY) {
        const frame = cx < 24 || cx >= 104 || cy < 30 || cy >= 92 || Math.abs(cx - 64) < 3;
        if (frame) { const v = cy < 27 || cx < 21 ? 0.3 : 0.14; P.c[0] = v; P.c[1] = v; P.c[2] = v * 1.15; return; }
        const k = (cy - 30) / 62, d = (cx + cy * 0.8) % 74;
        const streak = d < 12 ? 1 : d > 20 && d < 25 ? 0.6 : 0;        // 유리의 사선 반사 두 줄
        const g = 0.07 + (1 - k) * 0.05 + streak * 0.09;
        P.c[0] = g * 0.62; P.c[1] = g * 0.9; P.c[2] = g * 1.5;
        if (lit) {
          const h1 = hash(ix, iy, 77), h2 = hash(ix, iy, 78), h3 = hash(ix, iy, 79);
          if (h1 < 0.4) {
            const half = h3 < 0.3 && cx > 64 ? 0.35 : 1;                 // 한쪽 창만 켜진 방
            const blind = k < 0.12 + h3 * 0.45 ? 0.42 : 1;               // 블라인드
            const slat = blind < 1 && ((cy - 30) % 8) < 2 ? 0.7 : 1;
            const br = (0.55 + h2 * 0.45) * blind * slat * half;
            if (h2 < 0.5) { P.e[0] = br; P.e[1] = br * 0.74; P.e[2] = br * 0.36; }             // 따뜻한 전구색
            else if (h2 < 0.78) { P.e[0] = br * 0.62; P.e[1] = br * 0.88; P.e[2] = br; }       // 형광등
            else if (h2 < 0.9) { P.e[0] = br * 0.25; P.e[1] = br * 0.95; P.e[2] = br * 0.85; } // 청록 네온
            else { P.e[0] = br; P.e[1] = br * 0.3; P.e[2] = br * 0.75; }                       // 분홍 네온
          }
        }
      } else {
        let v = 0.92 + (post(a[i], 3) - 0.5) * 0.07;
        if (cy >= 102 && cy < 109) v += 0.08;                           // 창턱 윗면
        else if (cy >= 109 && cy < 117) v -= 0.3;                       // 창턱 아래 그림자
        if (cx < 3 || cx >= 125) v -= 0.2;                              // 패널 세로 줄눈
        if (inX && cy >= 98 && cy < 101) v -= 0.22;
        P.c[0] = v; P.c[1] = v; P.c[2] = v * 1.01;
      }
    }, lit);
  },
  facadelit: () => DEFS.facade(true),
  // 암석 (타일 16m): 굽이치는 지층 띠(4톤) + 띠 사이 균열선 + 세로 틈
  rock: () => {
    const S = 512, N = 14, w = field(S, 2, 2, 43), a = field(S, 6, 2, 41), c = field(S, 5, 2, 42, 2.4, 0.5), mk = field(S, 3, 1, 44);
    const TONE = [[1.0, 0.97, 0.92], [0.86, 0.8, 0.76], [0.72, 0.64, 0.6], [0.93, 0.86, 0.78]];
    return build(S, (x, y, i, P) => {
      const yy = (y / S) * N + w[i] * 3.4 + a[i] * 0.5, bi = Math.floor(yy), ft = yy - bi, id = ((bi % N) + N) % N;
      const t = TONE[(hash(id, 3, 41) * 4) | 0];
      let k = 1;
      if (hash(id, 7, 41) < 0.6) k -= band(ft - 0.035, 0.03, 0.012) * 0.42;       // 지층 경계의 어두운 선
      k += band(ft - 0.1, 0.02, 0.012) * 0.07;                                   // 바로 아래 밝은 턱
      k -= band(c[i] - 0.5, 0.011, 0.006) * sm(0.52, 0.6, mk[i]) * 0.34;         // 세로 균열
      k += (post(a[i], 2) - 0.5) * 0.06;
      P.c[0] = t[0] * k; P.c[1] = t[1] * k; P.c[2] = t[2] * k;
    });
  },
  // 풀밭 (타일 6m): 평면 톤 얼룩 + 풀잎 다발 획
  grass: () => {
    const S = 512, a = field(S, 3, 2, 51);
    const tuft = strokes(S, 53, (g, r) => {
      for (let i = 0; i < 150; i++) {
        const x = r() * S, y = r() * S, h = 9 + r() * 9;
        g.strokeStyle = r() < 0.55 ? LIGHT : DARK; g.lineWidth = 2.6;
        for (const dx of [-0.55, 0, 0.55]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * h, y - h * (dx ? 0.8 : 1)); g.stroke(); }
      }
    });
    return build(S, (x, y, i, P) => {
      const v = 0.88 + (post(a[i], 3) - 0.5) * 0.14 + tuft.hi[i] * 0.2 - tuft.lo[i] * 0.2;
      const warm = sm(0.6, 0.63, a[i]) * 0.1;
      P.c[0] = v * (0.86 + warm); P.c[1] = v; P.c[2] = v * (0.62 - warm * 0.4);
    });
  },
  // 흙·모래 (타일 6m): 평면 톤 얼룩 + 조약돌(밝은 면과 그림자) + 잔물결 획
  dirt: () => {
    const S = 512, a = field(S, 3, 2, 61);
    const peb = strokes(S, 63, (g, r) => {
      for (let i = 0; i < 70; i++) {
        const x = r() * S, y = r() * S, rx = 4 + r() * 7, ry = rx * (0.55 + r() * 0.3), rot = r() * 3;
        g.fillStyle = DARK; g.beginPath(); g.ellipse(x + 2, y + 3, rx, ry, rot, 0, 7); g.fill();
        g.fillStyle = LIGHT; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill();
      }
      g.strokeStyle = DARK; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S, l = 14 + r() * 22; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke(); }
    });
    return build(S, (x, y, i, P) => {
      const v = 0.9 + (post(a[i], 3) - 0.5) * 0.12 + peb.hi[i] * 0.1 - peb.lo[i] * 0.2;
      P.c[0] = v; P.c[1] = v * 0.94; P.c[2] = v * 0.82;
    });
  },
  // 금속 패널 (타일 4m, 2x2판): 굵은 이음매·안쪽 테두리·리벳 + 판마다 사선 광택 띠
  panel: () => {
    const S = 512, a = field(S, 2, 2, 71);
    return build(S, (x, y, i, P) => {
      const u = x % 256, w = y % 256, edge = Math.min(u, 255 - u, w, 255 - w);
      let v = 0.86 + (post(a[i], 2) - 0.5) * 0.06;
      const d = (u + w) % 256;
      if (edge > 20) v += d > 96 && d < 128 ? 0.08 : d > 138 && d < 146 ? 0.05 : 0;       // 사선 광택
      if (edge < 3) v = 0.4;
      else if (edge < 7) v += u < 7 || w < 7 ? 0.1 : -0.16;
      else if (edge >= 16 && edge < 19) v -= 0.14;
      for (const [rx, ry] of [[28, 28], [227, 28], [28, 227], [227, 227], [128, 28], [128, 227]]) {
        const dd = Math.hypot(u - rx, w - ry);
        if (dd < 6) v = dd < 3 && w < ry ? 1.06 : 0.6;
      }
      P.c[0] = v; P.c[1] = v; P.c[2] = v * 1.04;
    });
  },
  // 벽돌 (타일 3m, 8단 × 4장): 벽돌마다 3톤 + 윗면 하이라이트·아랫면 그림자 + 밝은 줄눈
  brick: () => {
    const S = 512, RH = 64, BW = 128;
    return build(S, (x, y, i, P) => {
      const row = (y / RH) | 0, off = row % 2 ? BW / 2 : 0, bx = (x + off) % BW, by = y % RH, id = (((x + off) / BW) | 0) % 4;
      if (bx < 6 || by < 6) { P.c[0] = 0.9; P.c[1] = 0.88; P.c[2] = 0.82; return; }
      const t = hash(id, row, 5);
      let v = t < 0.3 ? 0.76 : t < 0.72 ? 0.9 : 1.02;
      if (by < 11) v += 0.1; else if (by > RH - 7) v -= 0.2;
      if (bx > BW - 6) v -= 0.14;
      P.c[0] = v; P.c[1] = v * (0.84 + t * 0.1); P.c[2] = v * (0.78 + t * 0.12);
    });
  },
  // 나무 판자 (타일 2m, 판 4장): 판마다 톤 + 굵은 나뭇결 선 + 이음 + 못
  wood: () => {
    const S = 256, g = field(S, 4, 2, 91, 3, 0.4);
    return build(S, (x, y, i, P) => {
      const px = x % 64, id = (x / 64) | 0, t = hash(id, 0, 9), joint = ((hash(id, 1, 9) * S) | 0);
      let v = 0.84 + ((t * 3) | 0) * 0.09;
      v -= band(((g[i] * 7) % 1) - 0.5, 0.05, 0.03) * 0.15;                 // 나뭇결
      const jy = (y - joint + S) % S;
      if (px < 3 || jy < 3) v = 0.42;
      else if (px < 6 || jy < 6) v += 0.1;
      else if ((jy > 12 && jy < 18 || jy > S - 14 && jy < S - 8) && Math.abs(px - 33) < 3) v = 0.45;   // 못
      P.c[0] = v; P.c[1] = v * 0.8; P.c[2] = v * 0.58;
    });
  },
};

// 이름 → { map, emissiveMap?, normalMap(중립), ormMap(중립) } (캐시)
export function texSet(name) {
  if (!cache.has(name)) cache.set(name, DEFS[name]());
  return cache.get(name);
}

function simple(name, size, draw) {
  if (cache.has(name)) return cache.get(name);
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  draw(cv.getContext("2d"), size);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  cache.set(name, { map: t });
  return cache.get(name);
}

// 무늬 텍스처(노멀 없음)
export function patternSet(name) {
  if (name === "checker") return simple("checker", 64, (g, s) => { g.fillStyle = "#f2f2f2"; g.fillRect(0, 0, s, s); g.fillStyle = "#1c1c1c"; g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2); });
  if (name === "hazard") return simple("hazard", 64, (g, s) => {
    g.fillStyle = "#f5c518"; g.fillRect(0, 0, s, s); g.fillStyle = "#1a1a1a";
    for (let i = -s; i < s * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - s, s); g.lineTo(i - s, s); g.fill(); }
  });
  // 바닥 조명 웅덩이·광선용 방사형 그라디언트(만화풍으로 두 단계 테두리)
  return simple("radial", 128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.62)"); gr.addColorStop(0.36, "rgba(255,255,255,0.4)");
    gr.addColorStop(0.7, "rgba(255,255,255,0.2)"); gr.addColorStop(0.76, "rgba(255,255,255,0.09)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = "#000"; g.fillRect(0, 0, s, s); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
}

export const hasTex = (name) => name in DEFS;
