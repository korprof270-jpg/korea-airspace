// 절차적 텍스처: 색·노멀·거칠기/금속(ORM)·발광 맵을 코드로 생성 (외부 이미지 없음)
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

// 높이맵 → 노멀맵
function normalFrom(h, size, strength) {
  const d = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = h[y * size + ((x - 1 + size) % size)], xr = h[y * size + ((x + 1) % size)];
    const yu = h[((y - 1 + size) % size) * size + x], yd = h[((y + 1) % size) * size + x];
    const nx = (xl - xr) * strength, ny = (yd - yu) * strength;
    const l = 1 / Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
    d[i] = (nx * l * 0.5 + 0.5) * 255; d[i + 1] = (ny * l * 0.5 + 0.5) * 255; d[i + 2] = (l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  return toTexture(d, size, false);
}

// fn(x, y, i, P) 가 P.c(색 0..1 ×3), P.h(높이), P.r(거칠기), P.m(금속), P.e(발광 ×3) 을 채운다
function build(size, strength, fn, emissive = false) {
  const col = new Uint8ClampedArray(size * size * 4), orm = new Uint8ClampedArray(size * size * 4);
  const em = emissive ? new Uint8ClampedArray(size * size * 4) : null;
  const h = new Float32Array(size * size);
  const P = { c: [1, 1, 1], h: 0.5, r: 0.8, m: 0, e: [0, 0, 0] };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, k = i * 4;
    P.h = 0.5; P.r = 0.8; P.m = 0; P.e[0] = P.e[1] = P.e[2] = 0;
    fn(x, y, i, P);
    // 선형 → sRGB 근사
    col[k] = Math.pow(Math.max(0, P.c[0]), 0.4545) * 255; col[k + 1] = Math.pow(Math.max(0, P.c[1]), 0.4545) * 255; col[k + 2] = Math.pow(Math.max(0, P.c[2]), 0.4545) * 255; col[k + 3] = 255;
    orm[k] = 255; orm[k + 1] = P.r * 255; orm[k + 2] = P.m * 255; orm[k + 3] = 255;
    if (em) { em[k] = Math.pow(P.e[0], 0.4545) * 255; em[k + 1] = Math.pow(P.e[1], 0.4545) * 255; em[k + 2] = Math.pow(P.e[2], 0.4545) * 255; em[k + 3] = 255; }
    h[i] = P.h;
  }
  const set = { map: toTexture(col, size, true), normalMap: normalFrom(h, size, strength), ormMap: toTexture(orm, size, false) };
  if (em) set.emissiveMap = toTexture(em, size, true);
  return set;
}

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 균열 마스크(0..1)
function cracks(size, n, seed) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, size, size);
  g.strokeStyle = "#fff"; g.lineCap = "round";
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    let x = r() * size, y = r() * size, a = r() * 6.28;
    g.lineWidth = 0.8 + r() * 1.2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 14 + r() * 20; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
    g.stroke();
  }
  const d = g.getImageData(0, 0, size, size).data, out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

const DEFS = {
  // 아스팔트 (타일 8m). wet: 젖은 노면처럼 군데군데 매끈함
  asphalt: (wet) => {
    const S = 512, a = field(S, 4, 4, 1), b = field(S, 96, 2, 2), c = field(S, 24, 3, 3), cr = cracks(S, 9, 7);
    return build(S, 2.2, (x, y, i, P) => {
      const v = 0.6 + (b[i] - 0.5) * 0.5 + (a[i] - 0.5) * 0.28 + (c[i] - 0.5) * 0.14 - cr[i] * 0.3;
      P.c[0] = v; P.c[1] = v; P.c[2] = v * 1.02;
      P.h = b[i] * 0.5 + c[i] * 0.3 - cr[i] * 0.8;
      P.r = wet ? 0.16 + sm(0.42, 0.62, a[i]) * 0.55 + b[i] * 0.1 : 0.82 + b[i] * 0.14;
    });
  },
  wetasphalt: () => DEFS.asphalt(true),
  // 콘크리트 패널 (타일 6m, 2x2 패널)
  concrete: () => {
    const S = 512, a = field(S, 3, 5, 11), b = field(S, 80, 2, 12), st = field(S, 6, 4, 13, 2.5, 0.4);
    return build(S, 2.4, (x, y, i, P) => {
      const u = (x % 256) / 256, w = (y % 256) / 256, edge = Math.min(u, 1 - u, w, 1 - w), seam = 1 - sm(0, 0.012, edge);
      const pore = b[i] > 0.78 ? 0.16 : 0;
      const v = 0.78 + (a[i] - 0.5) * 0.3 - sm(0.55, 0.85, st[i]) * 0.16 - seam * 0.35 - pore;
      P.c[0] = v; P.c[1] = v * 0.99; P.c[2] = v * 0.97;
      P.h = 0.6 + (b[i] - 0.5) * 0.25 - seam * 0.6 - pore;
      P.r = 0.78 + a[i] * 0.16;
    });
  },
  // 골함석·컨테이너 (타일 2m, 골 10개)
  corrug: () => {
    const S = 256, a = field(S, 3, 4, 21), g = field(S, 5, 4, 22, 3, 0.35);
    return build(S, 3.2, (x, y, i, P) => {
      const s = Math.sin((x / S) * Math.PI * 2 * 10);
      const grime = sm(0.5, 0.85, g[i]) * 0.3;
      const v = 0.82 + s * 0.05 + (a[i] - 0.5) * 0.14 - grime;
      P.c[0] = v; P.c[1] = v * (1 - grime * 0.25); P.c[2] = v * (1 - grime * 0.5);
      P.h = 0.5 + s * 0.5;
      P.r = 0.42 + grime * 0.6 + a[i] * 0.12; P.m = 0.55 - grime * 0.5;
    });
  },
  // 빌딩 외벽 (타일 24m = 창 8x8칸, 1칸 3m)
  facade: (lit) => {
    const S = 1024, C = 128, a = field(S, 6, 4, 31), b = field(S, 90, 2, 32);
    return build(S, 3, (x, y, i, P) => {
      const cx = x % C, cy = y % C, ix = (x / C) | 0, iy = (y / C) | 0;
      const inX = cx > 16 && cx < 112, inY = cy > 22 && cy < 96;
      const wall = 0.8 + (a[i] - 0.5) * 0.2 + (b[i] - 0.5) * 0.06;
      if (inX && inY) {
        const frame = cx < 20 || cx > 108 || cy < 26 || cy > 92 || Math.abs(cx - 64) < 2;
        if (frame) { P.c[0] = P.c[1] = P.c[2] = 0.16; P.h = 0.45; P.r = 0.5; P.m = 0.6; }
        else {
          const k = (cy - 26) / 66, refl = 0.05 + (1 - k) * 0.07;
          P.c[0] = refl * 0.75; P.c[1] = refl * 0.9; P.c[2] = refl * 1.25;
          P.h = 0.25; P.r = 0.06; P.m = 0.9;
          if (lit) {
            const h1 = hash(ix, iy, 77), h2 = hash(ix, iy, 78), h3 = hash(ix, iy, 79);
            if (h1 < 0.34) {
              const blind = k < h3 * 0.55 ? 0.35 : 1, br = (0.45 + h2 * 0.55) * blind * (0.85 + (1 - k) * 0.25);
              if (h2 < 0.55) { P.e[0] = br; P.e[1] = br * 0.78; P.e[2] = br * 0.46; }
              else if (h2 < 0.85) { P.e[0] = br * 0.72; P.e[1] = br * 0.86; P.e[2] = br; }
              else { P.e[0] = br * 0.5; P.e[1] = br * 0.6; P.e[2] = br * 1.0; }
            }
          }
        }
      } else {
        const ledge = cy >= 110 && cy < 118 ? 1 : 0, pil = cx < 5 || cx > 123 ? 1 : 0;
        const v = wall * (1 - ledge * 0.22) * (1 + pil * 0.05);
        P.c[0] = v; P.c[1] = v; P.c[2] = v;
        P.h = 0.6 + ledge * 0.3 + pil * 0.15; P.r = 0.82;
      }
    }, lit);
  },
  facadelit: () => DEFS.facade(true),
  // 암석 (타일 16m): 지층 줄무늬 + 요철
  rock: () => {
    const S = 512, a = field(S, 3, 5, 41), b = field(S, 40, 3, 42), w = field(S, 2, 3, 43);
    return build(S, 4.5, (x, y, i, P) => {
      const strata = Math.sin((y / S) * Math.PI * 2 * 9 + w[i] * 9) * 0.5 + 0.5;
      const v = 0.62 + (a[i] - 0.5) * 0.4 + (strata - 0.5) * 0.16 + (b[i] - 0.5) * 0.2;
      P.c[0] = v * 1.02; P.c[1] = v * 0.97; P.c[2] = v * 0.9;
      P.h = a[i] * 0.6 + strata * 0.25 + b[i] * 0.3;
      P.r = 0.88;
    });
  },
  // 풀밭 (타일 6m)
  grass: () => {
    const S = 512, a = field(S, 4, 4, 51), b = field(S, 110, 2, 52), c = field(S, 20, 3, 53);
    return build(S, 1.8, (x, y, i, P) => {
      const v = 0.6 + (b[i] - 0.5) * 0.55 + (a[i] - 0.5) * 0.3 + (c[i] - 0.5) * 0.2;
      const dry = sm(0.55, 0.8, a[i]) * 0.25;
      P.c[0] = v * (0.86 + dry); P.c[1] = v; P.c[2] = v * (0.62 - dry * 0.2);
      P.h = b[i]; P.r = 0.93;
    });
  },
  // 흙·모래 (타일 6m)
  dirt: () => {
    const S = 512, a = field(S, 4, 4, 61), b = field(S, 100, 2, 62), c = field(S, 14, 3, 63);
    return build(S, 2, (x, y, i, P) => {
      const peb = c[i] > 0.7 ? 0.12 : 0;
      const v = 0.66 + (b[i] - 0.5) * 0.4 + (a[i] - 0.5) * 0.3 - peb;
      P.c[0] = v; P.c[1] = v * 0.93; P.c[2] = v * 0.8;
      P.h = b[i] * 0.6 + peb * 2; P.r = 0.95;
    });
  },
  // 금속 패널 (타일 4m, 2x2판 + 리벳)
  panel: () => {
    const S = 512, a = field(S, 4, 4, 71), br = field(S, 60, 2, 72, 0.08, 3);
    return build(S, 3, (x, y, i, P) => {
      const u = x % 256, w = y % 256, edge = Math.min(u, 255 - u, w, 255 - w);
      const seam = edge < 3 ? 1 : 0, inset = edge > 12 && edge < 15 ? 1 : 0;
      let rivet = 0;
      for (const [rx, ry] of [[22, 22], [233, 22], [22, 233], [233, 233], [128, 22], [128, 233]]) { const d = Math.hypot(u - rx, w - ry); if (d < 5) rivet = 1 - d / 5; }
      const v = 0.74 + (a[i] - 0.5) * 0.16 + (br[i] - 0.5) * 0.12 - seam * 0.45 - inset * 0.12 + rivet * 0.1;
      P.c[0] = v; P.c[1] = v; P.c[2] = v * 1.03;
      P.h = 0.6 - seam * 0.6 - inset * 0.15 + rivet * 0.4 + (br[i] - 0.5) * 0.05;
      P.r = 0.3 + a[i] * 0.25 + seam * 0.3; P.m = 0.85;
    });
  },
  // 벽돌 (타일 3m)
  brick: () => {
    const S = 512, a = field(S, 5, 4, 81), b = field(S, 90, 2, 82);
    const RH = S / 12, BW = S / 4;
    return build(S, 3.4, (x, y, i, P) => {
      const row = (y / RH) | 0, off = row % 2 ? BW / 2 : 0, bx = (x + off) % BW, by = y % RH, id = ((x + off) / BW) | 0;
      const mortar = bx < 3 || by < 3;
      if (mortar) { const v = 0.6 + (b[i] - 0.5) * 0.2; P.c[0] = v; P.c[1] = v; P.c[2] = v; P.h = 0.2; P.r = 0.95; }
      else {
        const t = hash(id, row, 5), v = 0.62 + t * 0.32 + (b[i] - 0.5) * 0.18 + (a[i] - 0.5) * 0.15;
        P.c[0] = v; P.c[1] = v * (0.86 + t * 0.1); P.c[2] = v * (0.8 + t * 0.12);
        P.h = 0.7 + (b[i] - 0.5) * 0.3; P.r = 0.85;
      }
    });
  },
  // 나무 판자 (타일 2m, 판 4장)
  wood: () => {
    const S = 256, g = field(S, 3, 5, 91, 0.3, 8), a = field(S, 4, 3, 92);
    return build(S, 2.6, (x, y, i, P) => {
      const px = x % 64, id = (x / 64) | 0, gap = px < 2 ? 1 : 0, t = hash(id, 0, 9);
      const v = 0.62 + t * 0.2 + (g[i] - 0.5) * 0.35 + (a[i] - 0.5) * 0.1 - gap * 0.5;
      P.c[0] = v; P.c[1] = v * 0.8; P.c[2] = v * 0.58;
      P.h = 0.6 + (g[i] - 0.5) * 0.4 - gap * 0.6; P.r = 0.8;
    });
  },
};

// 이름 → { map, normalMap, ormMap, emissiveMap? } (캐시)
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
  // 바닥 조명 웅덩이·광선용 방사형 그라디언트
  return simple("radial", 128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = "#000"; g.fillRect(0, 0, s, s); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
}

export const hasTex = (name) => name in DEFS;
