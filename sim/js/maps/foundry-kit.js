// 거신 공창 제작 도구: 배치 좌표 · 높이 함수(조립 구덩이·쇳물 수로·냉각호·터널 둔덕·산 자락) · 지면 색 · 공통 부품(눈 덮인 상자·쇳물 면·증기)
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, prop, merged, mat, ring, octa, ball, lattice, Blinkers, lane, V3, prism, arch, DEG, hash, local, lavaTexture, plume, searchlights, BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ } from "./empire-kit.js";

export { M, beam, prop, merged, mat, ring, octa, ball, lattice, Blinkers, lane, V3, prism, arch, DEG, hash, local, lavaTexture, plume, searchlights, BLK, BLK2, IRON, STEEL, GUN, RUST, ASH, RED, RED2, DRED, ORG, EMB, HAZ };

// 눈과 얼음, 콘크리트
export const SNOW = 0xe6ecf4, SNOW2 = 0xc4d2e4, ICE = 0xa6d6ea, ICE2 = 0x6faed0, ROCK = 0x59616d, SOOT = 0x2d3037, CONC = 0x737a85, CONC2 = 0x565c66;

// ── 배치 ──
export const C = [0, -30];                     // 조립 구덩이(거신) 중심
export const PIT_R = 60, PIT_D = 24;           // 구덩이 반경·깊이
export const ROAD_R = 88;                      // 구덩이를 도는 순환로 반경
export const RIM = 226;                        // 산 자락이 시작되는 거리(둥근 네모 노름)
export const LAKE = { x: -160, z: -60, r: 38 };                       // 얼어붙은 냉각호
export const FURN = [[178, -135], [180, -30], [178, 75]];             // 고로 셋
// 쇳물 수로(축에 나란한 꺾은선, 고로 → 구덩이)
export const CHAN = [[[164, -135], [35, -135], [35, -80]], [[166, -30], [58, -30]], [[164, 75], [20, 75], [20, 25]]];
// 수로를 건너는 둑길(도로가 지나는 자리, 쇳물은 암거로 흐른다) [x0, x1, z0, z1]
export const CAUSE = [[24, 46, -123, -99], [77, 99, -41, -19], [9, 31, 44, 67], [118, 138, -146, -124], [118, 138, 64, 86]];
export const CH_D = 3.5, LAVA_Y = -2.2;
export const HALL = { x0: 100, x1: 146, z: -30, w: 26, h: 21 };       // 주조동(수로 위에 걸친 동서 터널)
export const RAIL = { z: -180, zA: -184.5, zB: -176.5 };                  // 화물 철도(복선): 열차는 북쪽 선로 zA
export const SPUR = { x: 88, x0: 62, x1: 114, top: 15, half: 9 };     // 철도 터널이 뚫린 눈 둔덕
export const YARD = { z0: 82, z1: 132, x0: -196, x1: -56, y: 46 };    // 부품 야적장 갠트리 주행로
export const NGAN = { z0: -202, z1: -158, x0: -176, x1: 16, y: 38 };  // 철도 하역 갠트리 주행로
export const PARADE = [0, 125];                // 연병장(거신이 내려서는 자리)
export const PSTN = { x: -165, z: 15 };        // 발전소

// 구덩이 중심 기준 극좌표: 각 th(도)는 남쪽(+z)에서 동쪽으로 잰다
export const polar = (th, r) => [C[0] + Math.sin(th * DEG) * r, C[1] + Math.cos(th * DEG) * r];
export const ringPt = (th, r = ROAD_R) => polar(th, r);

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { sstep };
function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / L));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
// 가장 가까운 수로까지의 거리
export function chanDist(x, z) {
  let d = 1e9;
  for (const c of CHAN) for (let i = 0; i < c.length - 1; i++) d = Math.min(d, segDist(x, z, c[i], c[i + 1]));
  return d;
}
export const inCause = (x, z, m = 0) => CAUSE.some((b) => x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m);
// 둥근 네모 노름(맵 가장자리로 갈수록 커진다)
export const edge = (x, z) => Math.pow(x * x * x * x * x * x + z * z * z * z * z * z, 1 / 6);

// 산: 가장자리 밖으로 솟는 눈 능선
function mountain(x, z) {
  const t = edge(x, z) - RIM;
  if (t <= 0) return 0;
  const A = 128 * (1 - Math.exp(-(t / 75) * (t / 75)));
  const n = 0.6 + 0.26 * Math.sin(x * 0.013 + 1.7) * Math.cos(z * 0.011 - 0.6) + 0.2 * Math.sin((x + z) * 0.027 + 0.3) + 0.1 * Math.sin(x * 0.051 - z * 0.043);
  return A * n + Math.min(t, 30) * 0.06 * (1 + Math.sin(x * 0.09) * Math.cos(z * 0.08));
}
// 터널 둔덕: 북쪽 산에서 내려온 낮은 눈 능선. 철도가 지나는 띠는 비운다(그 위를 터널 구조물이 덮는다)
function spur(x, z) {
  if (z > -148 || Math.abs(z - RAIL.z) < 13) return 0;
  const sx = 1 - sstep(15, 30, Math.abs(x - SPUR.x));
  return sx <= 0 ? 0 : SPUR.top * sx * sstep(148, 162, -z) * (1 + 0.12 * Math.sin(x * 0.31 + z * 0.17));
}

// 높이: 골짜기 바닥 0. 조립 구덩이 −24, 쇳물 수로 −3.5, 냉각호 −1.5, 가장자리는 산
export function height(x, z) {
  const d = Math.hypot(x - C[0], z - C[1]);
  if (d < PIT_R + 2) return -PIT_D;
  let h = 0;
  if (d < PIT_R + 6) h = -PIT_D * (1 - (d - PIT_R - 2) / 4);
  if (d < 190 || x > 0) {
    const cd = chanDist(x, z);
    if (cd < 7.5 && !inCause(x, z)) h = Math.min(h, -CH_D * (1 - sstep(4.5, 7.5, cd)));
  }
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r) h = Math.min(h, -1.5 * sstep(LAKE.r, LAKE.r - 6, dl));
  if (h < 0) return h;
  return Math.max(mountain(x, z), spur(x, z));
}

// ── 지면 색: 흰 눈 · 검게 다져진 공장 바닥 · 그을린 수로 · 잿빛 자갈 ──
const _a = new THREE.Color(), _b = new THREE.Color();
const mix = (c1, c2, k) => _a.set(c1).lerp(_b.set(c2), Math.min(1, Math.max(0, k)));
export function industry(x, z) {
  // 0 = 눈밭, 1 = 검은 공장 바닥
  const d = Math.hypot(x - C[0], z - C[1]);
  let k = 1 - sstep(100, 116, d);
  k = Math.max(k, sstep(96, 112, x) * (1 - sstep(96, 112, z)) * (1 - sstep(214, 222, x)));          // 동쪽 제철 지대
  k = Math.max(k, 0.85 * sstep(-142, -152, z) * (1 - sstep(206, 214, Math.abs(x))));               // 북쪽 철도 띠
  k = Math.max(k, 0.8 * (1 - sstep(52, 64, Math.abs(x - PARADE[0]))) * sstep(60, 72, z));           // 진입로와 연병장
  k = Math.max(k, 0.55 * (1 - sstep(-60, -48, x)) * sstep(40, 50, z) * (1 - sstep(138, 148, z)) * sstep(-210, -200, x));   // 야적장(다져진 눈)
  k = Math.max(k, 0.7 * (1 - sstep(30, 44, Math.hypot(x - PSTN.x, z - PSTN.z))));
  return k;
}
export function colorFn(x, y, z, slope) {
  const n = 0.5 + 0.5 * Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2) * Math.cos(z * 0.06 + 1.3), n2 = hash(Math.round(x * 0.4), Math.round(z * 0.4));
  if (y < -6) return mix(0x2b2f36, 0x3a3f48, n).getHex();                                    // 구덩이
  const cd = chanDist(x, z);
  if (y < -0.5 && cd < 9) return mix(0x1e1a1a, 0x5a2410, sstep(-1.2, -3.4, y)).getHex();       // 수로 벽(쇳물 빛)
  if (y < -0.4) return mix(ICE2, ICE, n).getHex();                                           // 호수 바닥
  if (y > 2) return mix(SNOW2, SNOW, 0.35 + n * 0.65 + (slope > 0.3 ? -0.3 : 0)).getHex();   // 산
  let k = industry(x, z);
  k = k > 0.02 && k < 0.98 ? k + (n2 - 0.5) * 0.5 : k;                                       // 경계는 얼룩덜룩
  const snow = mix(SNOW2, SNOW, 0.3 + n * 0.7).getHex();
  const dark = mix(0x3a3e47, 0x4b505b, n * 0.7 + n2 * 0.3).getHex();
  const c = mix(snow, dark, k);
  if (cd < 16) c.lerp(_b.set(0x2a2624), 0.75 * (1 - sstep(8, 16, cd)));                       // 수로 가장자리는 눈이 녹아 그을렸다
  return c.getHex();
}

// ── 공통 부품 ──
// 눈이 얹힌 상자: 지붕 위 흰 판(충돌 없음)
export function snowCap(w, x, y, z, sx, sz, ry = 0, t = 0.7) { w.box(x, y, z, sx, t, sz, SNOW, { ry, col: false, ao: false }); }

// 쇳물 면 모으기: 사각형 a-b-c-d(시계/반시계 무관, 양면)를 쌓아 두었다가 한 메시로 만든다. uv 는 월드 좌표 기준
export class Lava {
  constructor() { this.pos = []; this.uv = []; }
  // 수평 띠: 중심선 (x0,z0)→(x1,z1), 폭 wd, 높이 y
  strip(x0, z0, x1, z1, wd, y) {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), nx = -dz / L * wd / 2, nz = dx / L * wd / 2;
    this.quad([x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz]);
  }
  quad(a, b, c, d) {
    for (const p of [a, b, c, a, c, d]) { this.pos.push(...p); this.uv.push((p[0] + p[1] * 0.7) / 26, (p[2] + p[1] * 0.7) / 26); }
  }
  build(w) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    const tex = lavaTexture().clone(); tex.needsUpdate = true;
    const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.7, 1.25, 0.95), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    w.scene.add(mesh); w.disposables.push(g, m, tex);
    w.updaters.push((dt, t) => {
      tex.offset.set(t * 0.012, t * 0.007);
      const k = 1.5 + Math.sin(t * 1.7) * 0.12 + Math.sin(t * 4.3) * 0.05;
      m.color.setRGB(k * 1.1, k * 0.82, k * 0.62);
    });
    return mesh;
  }
}

// 증기 기둥: 흰 덩어리가 피어올라 옅어진다 (한 곳당 메시 n 개가 아니라 전체를 InstancedMesh 하나로)
export class Steam {
  constructor() { this.list = []; }
  add(x, y, z, rad, rise, n = 4, drift = 0.25) { for (let i = 0; i < n; i++) this.list.push([x, y, z, rad, rise, i / n + hash(x * 3 + i, z * 5) * 0.2, drift]); }
  finish(w, color = 0xeef2f8, opacity = 0.62) {
    const N = this.list.length; if (!N) return;
    const g = new THREE.IcosahedronGeometry(1, 1);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const im = new THREE.InstancedMesh(g, m, N); im.frustumCulled = false; im.renderOrder = 4;
    const mm = new THREE.Matrix4(), L = this.list;
    w.scene.add(im); w.disposables.push(g, m);
    w.updaters.push((dt, t) => {
      for (let i = 0; i < N; i++) {
        const [x, y, z, rad, rise, ph, drift] = L[i], u = (t * 0.06 + ph) % 1;
        const s = rad * (0.45 + u * 1.6) * Math.min(1, u * 7) * Math.min(1, (1 - u) * 2.6) + 0.001;
        mm.makeScale(s, s * 0.85, s).setPosition(x + u * rise * drift + Math.sin(i * 2.4 + t * 0.3) * rad * 0.25, y + u * rise, z + u * rise * drift * 0.4);
        im.setMatrixAt(i, mm);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }
}
