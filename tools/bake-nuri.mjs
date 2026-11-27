// 누리 대륙 구역 맵을 '한 장의 그림'으로 굽는다 → sim/js/maps/nuri/baked/<id>.png
//  왼쪽 절반: R·G = 높이 16비트 ((h + 64) × 100), B = 땅 주인 번호(하위 3비트) + 땅 여부(8)
//  오른쪽 절반: 지형 색 (경사·눈·모래까지 반영된 최종 색)
//  게임은 이 그림을 읽어 지형을 바로 만든다 (매번 대륙 함수를 계산하지 않는다)
//  사용: node tools/bake-nuri.mjs [id ...]
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { REGIONS, height, colorAt, ownerAt, landD } from "../sim/js/maps/nuri/geo.js";
import { BAKE } from "../sim/js/maps/nuri/bakeinfo.js";

const OUT = new URL("../sim/js/maps/nuri/baked/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const OWN = ["hanul", "haerim", "bukseol", "jeoksa", "namdo", "e1", "e2", "e3"];

// PNG (RGBA 8비트) 직접 인코딩
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const t = Buffer.from(type), len = Buffer.alloc(4), cr = Buffer.alloc(4); len.writeUInt32BE(data.length); cr.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]); }
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(REGIONS);
for (const id of ids) {
  const t0 = Date.now(), R = REGIONS[id], { half: H, seg: S } = BAKE(id), n = S + 1, step = (H * 2) / S, [CX, CZ] = R.c;
  const hs = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) hs[j * n + i] = height(CX - H + i * step, CZ - H + j * step);
  const W = n * 2, img = Buffer.alloc(W * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, x = CX - H + i * step, z = CZ - H + j * step, h = hs[k];
    // 경사: 이웃 격자로 법선을 만들어 (1 - ny)
    const hx = hs[j * n + Math.min(n - 1, i + 1)] - hs[j * n + Math.max(0, i - 1)], hz = hs[Math.min(n - 1, j + 1) * n + i] - hs[Math.max(0, j - 1) * n + i];
    const ny = (2 * step) / Math.hypot(hx, hz, 2 * step), slope = 1 - ny;
    const q = Math.max(0, Math.min(65535, Math.round((h + 64) * 100)));
    const own = OWN.indexOf(ownerAt(x, z)), land = landD(x, z) > 12 ? 8 : 0;
    let o = (j * W + i) * 4; img[o] = q >> 8; img[o + 1] = q & 255; img[o + 2] = (own & 7) | land; img[o + 3] = 255;
    const c = colorAt(x, h, z, slope); o = (j * W + n + i) * 4; img[o] = c >> 16; img[o + 1] = (c >> 8) & 255; img[o + 2] = c & 255; img[o + 3] = 255;
  }
  const buf = png(W, n, img);
  writeFileSync(new URL(`${id}.png`, OUT), buf);
  console.log(`${id}: ${n}×${n} → ${(buf.length / 1024).toFixed(0)}KB (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
