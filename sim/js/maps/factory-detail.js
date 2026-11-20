// 석양의 항만 — 디테일 보강: 바닥 표시·포장 얼룩, 창고 안팎, 부두 크레인과 배의 의장, 야적장·탱크·조선소·정유 단지의 덧붙임,
// 간판, 깜박이는 경광등·갈매기·깃발·풍력 발전기 같은 움직이는 요소, 원경. 구조·트랙·임무 좌표는 건드리지 않는다.
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, merged, frame } from "./canyon-kit.js";
import { ring, Signs, icon } from "./city-kit.js";
import { QUAY, CH0, CH1, BRIDGE_Z, TOWER, HULL, SITE, plume } from "./factory-zones.js";

const DEG = Math.PI / 180;
const CONC = 0xa9a9a4, STEEL = 0x4a525c, DARK = 0x2c3138, RED = 0xd9432f, WHITE = 0xf2f0ea, YEL = 0xe0a52a, WARM = 0xffe2b0, ORG = 0xff7a1a;
const CC = [0xb5452f, 0x2f6fb0, 0x3d8b5a, 0xd9a441, 0x8a8f99, 0x7a3fa0, 0xc96a2b, 0x2a9d8f];
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const WIND = 118;   // 깃발·연기가 날리는 방향(도, 0 = +z)

// ── 작은 도구들 (모두 충돌 없음) ──
const flat = (w, x, z, sx, sz, color, o = {}) => w.box(x, o.y ?? 0.035, z, sx, 0.02, sz, color, { col: false, ao: false, ...o });
const bar = (w, a, b, t, color, o = {}) => beam(w, a, b, t, color, { col: false, ...o });
const dot = (w, x, y, z, color = WARM, s = 0.3) => w.box(x, y, z, s, s, s, color, { mat: "glow", col: false });
const deco = (w, x, y, z, sx, sy, sz, color, o = {}) => w.box(x, y, z, sx, sy, sz, color, { col: false, ...o });
function line(w, x0, z0, x1, z1, color, wd = 0.14, o = {}) {
  flat(w, (x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0), wd, color, { ry: Math.atan2(-(z1 - z0), x1 - x0) / DEG, ...o });
}
function dashes(w, x0, z0, x1, z1, color, wd = 0.16, on = 3, off = 4) {
  const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0) / DEG;
  for (let s = off / 2; s < L - on; s += on + off) { const t = (s + on / 2) / L; flat(w, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, on, wd, color, { ry }); }
}
// 난간: 위·중간 가로대와 동자기둥
function handrail(w, a, b, color = YEL, h = 1.05, step = 2.5) {
  bar(w, [a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], 0.07, color);
  bar(w, [a[0], a[1] + h * 0.5, a[2]], [b[0], b[1] + h * 0.5, b[2]], 0.05, color);
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
  for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t; bar(w, [x, y, z], [x, y + h, z], 0.07, color); }
}
// 경사 계단(디딤판 한 장 + 바깥 난간). along: 진행 축 "z" | "x"
function stair(w, a, b, wd, along = "z", color = STEEL, railC = YEL) {
  beam(w, a, b, along === "z" ? 0.14 : wd, color, { col: false, tw: along === "z" ? wd : 0.14 });
  const o = wd / 2;
  for (const s of [-1, 1]) handrail(w, along === "z" ? [a[0] + s * o, a[1], a[2]] : [a[0], a[1], a[2] + s * o], along === "z" ? [b[0] + s * o, b[1], b[2]] : [b[0], b[1], b[2] + s * o], railC, 1, 3);
}
// 원통 탱크를 감아 오르는 나선 계단
function spiral(w, cx, cz, R, y0, y1, a0, a1, color = STEEL, railC = YEL, wd = 1) {
  const n = Math.max(6, Math.round((y1 - y0) / 0.6)), dep = Math.abs(a1 - a0) * R / n + 0.08;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t, y = y0 + (y1 - y0) * t, rr = R + wd / 2;
    w.box(cx + Math.cos(a) * rr, y - 0.1, cz + Math.sin(a) * rr, wd, 0.1, dep, color, { ry: -a / DEG, col: false, ao: false });
    const p = [cx + Math.cos(a) * (R + wd), y + 1, cz + Math.sin(a) * (R + wd)];
    if (prev) bar(w, prev, p, 0.06, railC);
    if (i % 3 === 0) bar(w, [p[0], y, p[2]], p, 0.06, railC);
    prev = p;
  }
}
// 사다리(벽면에 붙는 두 줄 + 가로대)
function ladder(w, x, y0, y1, z, axis = "x", color = YEL) {
  const dx = axis === "x" ? 0.28 : 0, dz = axis === "x" ? 0 : 0.28;
  for (const s of [-1, 1]) bar(w, [x + s * dx, y0, z + s * dz], [x + s * dx, y1, z + s * dz], 0.06, color);
  for (let y = y0 + 0.4; y < y1; y += 0.8) bar(w, [x - dx, y, z - dz], [x + dx, y, z + dz], 0.045, color);
}

// 비행 라인·경로·거점·갭에서 떨어져 있는지 (흩뿌리는 소품용)
function keepOut(w) {
  const def = w.def, segs = [], pts = [];
  for (const tr of def.tracks) { const g = tr.gates, n = g.length; for (let i = 0; i < n; i++) { const a = g[i].p, b = g[(i + 1) % n].p; segs.push([a[0], a[2], b[0], b[2], 6]); } }
  for (const tk of def.tracking) { if (tk.type === "boat") continue; const p = tk.path; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; segs.push([p[i][0], p[i][2], q[0], q[2], tk.type === "drone" ? 2 : 4]); } }
  const mc = def.combat;
  pts.push([...mc.blue, 32], [...mc.red, 32]);
  for (const d of mc.depots) pts.push([...d, 7]);
  if (def.strike) { for (const d of def.strike.turrets) pts.push([...d, 7]); pts.push([...def.strike.core, 12]); }
  for (const g of w.gaps) pts.push([g.pos.x, g.pos.z, g.w / 2 + 2]);
  return (x, z, r = 0) => {
    if (x > -24 - r && x < 20 + r && z > 82 - r && z < 136 + r) return false;          // 비행 훈련 코스
    for (const p of pts) if (Math.hypot(x - p[0], z - p[1]) < p[2] + r) return false;
    for (const s of segs) {
      const dx = s[2] - s[0], dz = s[3] - s[1], t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t) < s[4] + r) return false;
    }
    return true;
  };
}

// ── 간판 도안: 칠한 철판 느낌(테두리 + 픽토그램 + 굵은 글자) ──
const hex = (c) => "#" + c.toString(16).padStart(6, "0");
const plate = (bg, fg, ic) => ({
  bg: hex(bg), draw(g, W, H, ko, txt) {
    const f = hex(fg), m = H * 0.07;
    g.strokeStyle = f; g.lineWidth = H * 0.045; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
    let x0 = m * 2;
    if (ic) { icon(g, ic, x0 + H * 0.34, H / 2, H * 0.6, fg); x0 += H * 0.7; }
    const lines = txt.split("\n"), aw = W - x0 - m * 2.4;
    const size = Math.min(H * (lines.length > 1 ? 0.33 : 0.5), (aw / Math.max(1, ...lines.map((l) => l.length))) * (ko ? 1.02 : 1.7));
    g.font = `900 ${size}px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = f;
    lines.forEach((l, i) => g.fillText(l, x0 + aw / 2 + m * 0.2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.15, aw));
  },
});
const SIGNS = [
  { id: "port", kind: "big", text: ["하늘길\n컨테이너 터미널", "SKYWAY\nCONTAINER TERMINAL"], ...plate(0x1d3557, 0xf2f0ea) },
  { id: "yard", kind: "big", text: ["하늘 조선", "SKYWAY SHIPYARD"], ...plate(0xf2f0ea, 0xb5302a) },
  { id: "wh1", text: ["제1창고", "WAREHOUSE 1"], ...plate(0x1d3557, 0xf2f0ea) },
  { id: "qc1", text: "QC-01", ...plate(0xf2f0ea, 0x1d3557) },
  { id: "qc2", text: "QC-02", ...plate(0xf2f0ea, 0x1d3557) },
  { id: "t1", text: "T-101", ...plate(0xf2f0ea, 0xb5302a) },
  { id: "t2", text: "T-102", ...plate(0xf2f0ea, 0x1d5fa0) },
  { id: "t3", text: "T-103", ...plate(0xf2f0ea, 0x9a7a10) },
  { id: "safe", text: ["안전제일", "SAFETY FIRST"], ...plate(0xf2f0ea, 0x1f8a4c, "cross") },
  { id: "fire", text: ["화기엄금", "NO FLAME"], ...plate(0xf2f0ea, 0xc8281e, "warn") },
  { id: "fish", text: ["어시장", "FISH MARKET"], ...plate(0x14506a, 0xfff0c8, "fish") },
  { id: "ship", text: ["하늘 익스프레스", "SKYWAY EXPRESS"], ...plate(0x20262f, 0xf2f0ea) },
  { id: "slow", text: ["서행 20", "SLOW 20"], ...plate(0xe8b820, 0x16181d, "warn") },
  { id: "rail", text: ["조차장", "RAIL YARD"], ...plate(0x16181d, 0xe8b820, "train") },
  { id: "oil", text: ["하늘 정유", "SKYWAY OIL"], ...plate(0xf2f0ea, 0x1d5fa0, "bolt") },
  { id: "office", text: ["항만 관리동", "PORT OFFICE"], ...plate(0x1d3557, 0xf2f0ea) },
  { id: "gate", text: ["출입 통제", "CHECKPOINT"], ...plate(0xc8281e, 0xf2f0ea) },
];

// ── 바닥: 도로·주차선·야적 칸·포장 얼룩·맨홀 ──
function ground(w, K) {
  const r = w.rand, RD = 0x5d616b, WH = 0xdcdcd6, YL = 0xd8b23a;
  // 포장 얼룩(색이 조금씩 다른 덧씌움)과 콘크리트 판
  const tones = [0x7a7f88, 0x8f949b, 0x747982, 0x94918c, 0x80858d];
  for (let i = 0; i < 90; i++) {
    const isle = i % 6 === 5, x = isle ? 236 + r() * 60 : -194 + r() * 386, z = isle ? -120 + r() * 320 : -96 + r() * 298;
    const sx = 5 + r() * 15, sz = 4 + r() * 12;
    flat(w, x, z, sx, sz, tones[(r() * tones.length) | 0], { y: 0.012, mat: i % 3 ? "std:asphalt" : "std:concrete", tile: 6, ry: (r() < 0.7 ? 0 : r() * 90) });
  }
  // 부두 에이프런: 밝은 콘크리트 + 신축 줄눈 + 배수 트렌치
  flat(w, (-198 + CH0) / 2, -114.5, CH0 + 198, 27, 0x9f9d97, { y: 0.02, mat: "std:concrete", tile: 7 });
  for (let x = -190; x <= 190; x += 19) line(w, x + 9.5, -127.2, x + 9.5, -101, 0x6e6c68, 0.1);
  line(w, -196, -101, CH0 - 2, -101, 0x3a3d44, 0.45);
  for (let x = -190; x <= 190; x += 6.3) flat(w, x, -101, 0.12, 0.45, 0x8a8f99, { y: 0.04 });
  // 외곽 순환로: 어두운 포장 + 차선
  const roads = [[-182, 187, 128, 187], [143, -62, 143, 112], [-188, -80, -188, 172], [-184, -84, -98, -84]];
  for (const [x0, z0, x1, z1] of roads) {
    const hz = z0 === z1, L = hz ? x1 - x0 : z1 - z0;
    flat(w, (x0 + x1) / 2, (z0 + z1) / 2, hz ? L : 9, hz ? 9 : L, RD, { y: 0.022, mat: "std:asphalt", tile: 6 });
    for (const s of [-4.3, 4.3]) line(w, x0 + (hz ? 0 : s), z0 + (hz ? s : 0), x1 + (hz ? 0 : s), z1 + (hz ? s : 0), WH, 0.16);
    dashes(w, x0, z0, x1, z1, YL, 0.18, 3, 4.5);
  }
  // 진행 방향 화살표와 횡단보도
  const arrow = (x, z, ry) => { flat(w, x, z, 0.3, 3, WH, { ry }); for (const s of [-1, 1]) { const a = (ry + s * 35) * DEG, bx = x - Math.sin(ry * DEG) * 1.5, bz = z - Math.cos(ry * DEG) * 1.5; flat(w, bx + Math.sin(a) * 0.6, bz + Math.cos(a) * 0.6, 0.3, 1.5, WH, { ry: ry + s * 35 }); } };
  for (const [x, z, ry] of [[-60, 184.8, 90], [60, 184.8, 90], [0, 189.2, -90], [145.2, 60, 0], [140.8, 0, 180], [-185.8, 100, 180], [-190.2, 20, 0], [-140, -86.2, 90]]) arrow(x, z, ry);
  const zebra = (x, z, hz) => { for (let i = -3; i <= 3; i++) flat(w, x + (hz ? i * 1.2 : 0), z + (hz ? 0 : i * 1.2), hz ? 0.6 : 4.4, hz ? 4.4 : 0.6, WH); };
  zebra(-126, 187, false); zebra(143, 118, true); zebra(-188, 46, true); zebra(100, 187, false);
  for (const [x, z, hz] of [[-131.5, 187, 0], [-120.5, 187, 0], [94.5, 187, 0], [105.5, 187, 0]]) flat(w, x, z, hz ? 9 : 0.4, hz ? 0.4 : 9, WH);
  // 야적장 칸 표시: 줄마다 양옆 실선, 칸막이, 줄 번호 색판
  for (let row = 0; row < 5; row++) {
    const z = 26 + row * 19;
    for (const s of [-1.75, 1.75]) line(w, 34.5, z + s, 126.5, z + s, WH, 0.12);
    for (let i = 0; i <= 6; i++) line(w, 34.5 + i * 15.33, z - 1.75, 34.5 + i * 15.33, z + 1.75, WH, 0.12);
    flat(w, 32.6, z, 2.2, 2.2, CC[row], { y: 0.03 }); flat(w, 128.4, z, 2.2, 2.2, CC[row], { y: 0.03 });
  }
  for (const z of [52, 78]) { line(w, 21, z, 139, z, 0x5a5f68, 0.22, { mat: "metal" }); line(w, 21, z, 139, z, 0x3a3d44, 0.7, { y: 0.02 }); }
  // 창고 문 앞 위험 표시와 중앙 작업 차로
  const HZ = { mat: "std:hazard", tile: 4, y: 0.03 };
  for (const [x, z, sx, sz] of [[-80, -15.5, 10, 8], [-40, -15.5, 10, 8], [-60, -65, 12, 9], [-20, -40, 9, 14]]) flat(w, x, z, sx, sz, 0xdadada, HZ);
  for (const s of [-3, 3]) dashes(w, 12 + s, -92, 12 + s, 78, WH, 0.14, 2, 3);
  for (const z of [-70, -30, 40]) arrow(12, z, z > 0 ? 180 : 0);
  zebra(12, 12, true);
  // 탱크 방유제 안 바닥, 정유 단지 내부 도로
  flat(w, 84, -70, 79, 26, 0x9a9790, { y: 0.02, mat: "std:concrete", tile: 6 });
  for (const [x0, z0, x1, z1] of [[294, -110, 294, 190], [232.5, 7, 296.5, 7], [232.5, 67, 296.5, 67], [235, 9.5, 235, 64.5]]) {
    const hz = z0 === z1;
    flat(w, (x0 + x1) / 2, (z0 + z1) / 2, hz ? x1 - x0 : 5, hz ? 5 : z1 - z0, RD, { y: 0.022, mat: "std:asphalt", tile: 6 }); dashes(w, x0, z0, x1, z1, YL, 0.16, 3, 4.5);
  }
  // 맨홀·배수구·기름 얼룩
  for (let i = 0; i < 46; i++) {
    const isle = i % 7 === 6, x = isle ? 238 + r() * 56 : -192 + r() * 382, z = isle ? -110 + r() * 300 : -94 + r() * 290, t = r();
    if (t < 0.45) { w.cyl(x, 0.02, z, 0.55, 0.035, 0x3a3d44, { col: false, ao: false }); w.cyl(x, 0.03, z, 0.4, 0.035, 0x565a63, { col: false, ao: false, mat: "metal" }); }
    else if (t < 0.7) { flat(w, x, z, 1.4, 0.6, 0x2c2f35, { y: 0.03 }); for (let k = -2; k <= 2; k++) flat(w, x + k * 0.25, z, 0.07, 0.5, 0x7a7f88, { y: 0.045 }); }
    else w.cyl(x, 0.012, z, 1 + r() * 1.6, 0.025, 0x4f535c, { col: false, ao: false, mat: "std:asphalt" });
  }
  void K;
}

// ── 대형 창고 (x -95..-25, z -60..-20, 높이 14): 외벽 띠·문틀·차양, 지붕 설비, 내부 선반·트러스·조명 ──
function warehouse(w, K) {
  const r = w.rand, BAND = 0x2f5f8f, FR = 0xe0a52a, X0 = -95, X1 = -25, Z0 = -60, Z1 = -20;
  // 외벽: 처마 아래 색 띠, 벽기둥, 모서리 홈통
  for (const [z, s] of [[Z0, -1], [Z1, 1]]) deco(w, -60, 12.1, z + s * 0.3, 70.7, 1.4, 0.14, BAND, { mat: "paint", ao: false });
  for (const [x, s] of [[X0, -1], [X1, 1]]) deco(w, x + s * 0.3, 12.1, -40, 0.14, 1.4, 40.7, BAND, { mat: "paint", ao: false });
  for (const x of [-70, -50]) deco(w, x, 0, Z1 + 0.35, 0.5, 14, 0.25, 0x6b7785);
  for (const x of [-73, -47]) deco(w, x, 0, Z0 - 0.35, 0.5, 14, 0.25, 0x6b7785);
  for (const z of [-52, -28]) for (const [x, s] of [[X0, -1], [X1, 1]]) deco(w, x + s * 0.35, 0, z, 0.25, 14, 0.5, 0x6b7785);
  for (const x of [X0 - 0.45, X1 + 0.45]) for (const z of [Z0 - 0.45, Z1 + 0.45]) { bar(w, [x, 0, z], [x, 14, z], 0.3, 0x3a424c); deco(w, x, 13.8, z, 0.5, 0.5, 0.5, 0x3a424c); }
  // 문틀(노랑)과 셔터 함, 문 위 조명
  const door = (axis, c, wd, y1, wallAt, out) => {
    for (const s of [-1, 1]) {
      const o = c + s * (wd / 2 + 0.25);
      if (axis === "x") deco(w, o, 0, wallAt + out * 0.36, 0.5, y1, 0.22, FR, { mat: "paint" }); else deco(w, wallAt + out * 0.36, 0, o, 0.22, y1, 0.5, FR, { mat: "paint" });
    }
    if (axis === "x") { deco(w, c, y1, wallAt + out * 0.5, wd + 1, 0.9, 0.5, 0x3a424c); dot(w, c, y1 + 1.2, wallAt + out * 0.5, WARM, 0.5); w.pool(c, 0, wallAt + out * 4, 8, WARM, 0.32); }
    else { deco(w, wallAt + out * 0.5, y1, c, 0.5, 0.9, wd + 1, 0x3a424c); dot(w, wallAt + out * 0.5, y1 + 1.2, c, WARM, 0.5); w.pool(wallAt + out * 4, 0, c, 8, WARM, 0.32); }
  };
  door("x", -80, 9, 6.5, Z1, 1); door("x", -40, 9, 6.5, Z1, 1); door("x", -60, 11, 7.5, Z0, -1); door("z", -40, 13, 8.5, X1, 1);
  // 창틀
  for (const [x, y0, y1, wd, z, s] of [[-60, 8, 11.5, 6, Z1, 1], [-83, 7.5, 10.5, 5, Z0, -1], [-37, 7.5, 10.5, 5, Z0, -1]]) {
    deco(w, x, y0 - 0.2, z + s * 0.34, wd + 0.6, 0.2, 0.2, WHITE); deco(w, x, y1, z + s * 0.34, wd + 0.6, 0.2, 0.2, WHITE);
    for (const e of [-1, 1]) deco(w, x + e * (wd / 2 + 0.2), y0, z + s * 0.34, 0.2, y1 - y0, 0.2, WHITE);
  }
  K.signs.add("port", -80, 9.4, Z1 + 0.42, 8.4);
  K.signs.add("wh1", X1 + 0.42, 10.8, -40, 5, { ry: 90 }); K.signs.add("wh1", -60, 10, Z0 - 0.42, 5.6, { ry: 180 });
  K.signs.add("slow", -18.6, 2.6, -26, 2.2, { ry: 90 }); bar(w, [-18.7, 0, -26], [-18.7, 2.2, -26], 0.1, STEEL);
  // 지붕: 용마루 환기구, 채광창 턱, 실외기, 배관
  for (const x of [-85, -35]) { deco(w, x, 14.5, -40, 1.4, 0.7, 34, 0x4a5563, { mat: "std:corrug", tile: 2 }); deco(w, x, 15.2, -40, 2, 0.12, 35, 0x6b7785); }
  for (const x of [-72, -48]) { for (const s of [-1, 1]) { deco(w, x + s * 4.2, 14.5, -40, 0.3, 0.35, 15.6, FR, { mat: "paint" }); deco(w, x, 14.5, -40 + s * 7.65, 8.7, 0.35, 0.3, FR, { mat: "paint" }); } }
  for (const [x, z] of [[-33, -27], [-33, -53], [-29, -40]]) { w.box(x, 14.5, z, 2.6, 1.5, 2, 0xcfd3d8, { mat: "std:panel", tile: 2 }); w.cyl(x, 16, z, 0.7, 0.12, DARK, { col: false }); }
  bar(w, [-33, 14.7, -28.5], [-33, 14.7, -51.5], 0.2, 0x8a8f99); bar(w, [-33, 14.7, -40], [-30, 14.7, -40], 0.2, 0x8a8f99);
  for (const x of [-91, -79, -60, -41]) for (const z of [-56, -24]) K.vents.push([x, 14.5, z]);
  // 내부 트러스(남북 방향 3줄)와 매단 조명
  for (const x of [-85, -60, -35]) {
    beam(w, [x, 12.3, Z0 + 0.4], [x, 12.3, Z1 - 0.4], 0.26, 0x8c3b2e);
    bar(w, [x, 13.6, Z0 + 0.4], [x, 13.6, Z1 - 0.4], 0.2, 0x8c3b2e);
    for (let i = 0; i < 8; i++) { const z = Z0 + 0.4 + i * 4.9; bar(w, [x, 12.3, z], [x, 13.6, z + (i % 2 ? 0 : 4.9)], 0.12, 0x8c3b2e); bar(w, [x, 13.6, z], [x, 12.3, z + (i % 2 ? 4.9 : 0)], 0.12, 0x8c3b2e); }
    for (const z of [-50, -30]) { deco(w, x, 11.85, z, 0.5, 0.14, 1.8, 0xfff0c8, { mat: "glow" }); bar(w, [x, 12, z], [x, 12.3, z], 0.05, DARK); w.pool(x, 0.03, z, 10, WARM, 0.3); w.shaft(x, 11.85, z, 0.3, 4.6, 11.8, WARM, 0.01); }
  }
  // 팔레트 선반: 북벽 서쪽·동쪽, 남벽 가운데
  const GOODS = [0xc9a36a, 0xb98f58, 0xe9e7e0, 0x2f6fb0, 0xc94a3a, 0x3d8b5a];
  const rack = (x0, x1, z) => {
    const n = Math.round((x1 - x0) / 2.8), bay = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) for (const dz of [-0.55, 0.55]) bar(w, [x0 + i * bay, 0, z + dz], [x0 + i * bay, 6, z + dz], 0.12, 0x2f5f8f);
    for (const y of [0.15, 2.1, 4.1]) {
      for (const dz of [-0.55, 0.55]) bar(w, [x0, y, z + dz], [x1, y, z + dz], 0.12, ORG);
      for (let i = 0; i < n; i++) {
        if (r() < 0.18) continue;
        const cx = x0 + (i + 0.5) * bay, hh = 0.8 + r() * 0.8;
        deco(w, cx, y + 0.06, z, 1.2, 0.14, 1.0, 0xb08a52, { mat: "std:wood", tile: 2 });
        deco(w, cx + (r() - 0.5) * 0.3, y + 0.2, z, 1.1 + r() * 0.9, hh, 0.95, GOODS[(r() * GOODS.length) | 0]);
      }
    }
    w.col.addBox(new THREE.Vector3((x0 + x1) / 2, 3.1, z), new THREE.Vector3((x1 - x0) / 2, 3.1, 0.65));
  };
  rack(-93.5, -70, -58.6); rack(-52, -41, -58.6); rack(-73.5, -46.5, -21.4);
  // 바닥 통로선과 보행로, 소화기·분전함
  for (const z of [-56.6, -23.4]) line(w, -94, z, -26, z, 0xd8b23a, 0.14, { y: 0.055 });
  for (const x of [-93, -27.5]) line(w, x, -56.6, x, -23.4, 0xd8b23a, 0.14, { y: 0.055 });
  for (const x of [-56, -36]) for (const z of [-50, -30]) { flat(w, x, z, 2, 2, 0xdadada, { mat: "std:hazard", tile: 2, y: 0.055 }); deco(w, x, 0, z, 0.9, 1.6, 0.9, 0x16181d, { mat: "std:hazard", tile: 1.6 }); }
  for (const [x, z] of [[-94.4, -24], [-94.4, -47], [-25.6, -24.5], [-25.6, -55]]) { deco(w, x, 1, z, 0.3, 0.7, 0.3, 0xc8281e, { mat: "paint" }); deco(w, x, 2.1, z, 0.12, 0.5, 0.5, WHITE); }
  deco(w, -34, 4, -52, 9.2, 0.25, 5.2, 0x3a424c); deco(w, -38.55, 1.4, -52, 0.08, 1.4, 2.4, 0xbfe3ff, { mat: "glow" }); deco(w, -34, 1.4, -49.45, 4, 1.4, 0.08, 0xbfe3ff, { mat: "glow" });
  // 문 밖: 쌓아 둔 팔레트·드럼
  for (const [x, z] of [[-72, -17], [-48, -17.4], [-22, -50], [-22.5, -31]]) { for (let k = 0; k < 4; k++) deco(w, x, k * 0.16, z, 1.2, 0.14, 1, 0xb08a52, { mat: "std:wood", tile: 2, ry: k * 4 }); deco(w, x + 1.6, 0, z + 0.2, 1, 1.1, 1, GOODS[(r() * 3) | 0]); }
}

// ── 부두: 방충재·계선줄·부두 소품, 화물선·벌크선의 의장 ──
function quay(w, K) {
  const r = w.rand;
  // 안벽 고무 방충재와 사다리, 차막이
  for (let x = -188; x <= 192; x += 9.5) { w.pipe(x, -0.9, QUAY - 1.62, x, -0.9, QUAY - 2.0, 0.75, 0x1c1e22, { col: false, mat: "std" }); bar(w, [x, -0.2, QUAY - 1.75], [x, 0.1, QUAY - 1.5], 0.06, 0x8a8f99); }
  for (const x of [-180, -104, 100, 196]) ladder(w, x, -2.8, 0.3, QUAY - 1.72, "x", YEL);
  for (const [x0, x1] of [[-196, CH0 - 1], [CH1 + 1, 300]]) deco(w, (x0 + x1) / 2, 0, QUAY + 0.25, x1 - x0, 0.3, 0.3, 0xd8b23a, { mat: "paint" });
  // 부두 가장자리 소품: 육전함, 밧줄 사리, 구명환 걸이
  for (let x = -171; x <= 190; x += 38) {
    deco(w, x, 0, QUAY + 2, 0.9, 1.3, 0.5, 0x3d6b5a, { mat: "paint" }); dot(w, x, 1.05, QUAY + 2.27, 0x35ff7a, 0.12);
    w.cyl(x + 5, 0, QUAY + 2, 0.7, 0.3, 0xb9925a, { col: false }); w.cyl(x + 5, 0.3, QUAY + 2, 0.5, 0.25, 0xa8834f, { col: false });
    bar(w, [x - 6, 0, QUAY + 1.2], [x - 6, 1.5, QUAY + 1.2], 0.08, WHITE); deco(w, x - 6, 0.9, QUAY + 1.28, 0.6, 0.6, 0.1, ORG, { mat: "paint" });
  }
  // 컨테이너 문짝(잠금 봉): 야적장과 부두 쪽 열
  const doors = (x, y, z, ry) => {
    const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG);
    for (const e of [-1, 1]) {
      const px = x + e * 6.13 * c, pz = z - e * 6.13 * s;
      for (const o of [-0.75, -0.3, 0.3, 0.75]) deco(w, px - o * s, y + 0.15, pz - o * c, ry ? 0.07 : 0.06, 2.3, ry ? 0.06 : 0.07, 0xd9dde2, { ao: false });
      deco(w, px, y + 1.2, pz, ry ? 2.2 : 0.05, 0.12, ry ? 0.05 : 2.2, 0x30343a, { ao: false });
    }
  };
  for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) {
    if ((row === 2 && (i === 2 || i === 3)) || (row === 4 && i === 0)) continue;
    const st = 1 + ((row * 7 + i * 3) % 3);
    for (let k = 0; k < st; k++) doors(42 + i * 15.5, k * 2.6, 26 + row * 19 + (k % 2 ? 0.3 : 0), 0);
  }
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const st = 1 + ((i + j * 2) % 3); for (let k = 0; k < st; k++) doors(-170 + i * 13, k * 2.6, -100 + j * 6, 0); }

  // ── 화물선 (SX 10, SZ -152, 길이 164, 폭 24, 갑판 8.7) ──
  const SX = 10, SZ = -152, L = 164, B = 24, bx = SX - L / 2 + 16;
  deco(w, SX, 0.55, SZ, L + 0.12, 0.45, B + 0.12, 0xe9e7e0, { mat: "paint", ao: false });                       // 흘수선 띠
  K.signs.add("ship", SX + L / 2 - 14, 5.6, SZ + B / 2 + 0.08, 9); K.signs.add("ship", bx - 2, 5.6, SZ + B / 2 + 0.08, 9);
  // 선교 날개, 구명정, 굴뚝 띠, 불 켜진 창
  for (const s of [-1, 1]) {
    deco(w, bx + 1, 22.2, SZ + s * 14, 5, 0.5, 4, 0xf2f0ea, { mat: "paint" }); handrail(w, [bx - 1.5, 22.7, SZ + s * 16], [bx + 3.5, 22.7, SZ + s * 16], WHITE, 1, 2.5);
    w.pipe(bx - 4, 15.4, SZ + s * 10.9, bx + 2, 15.4, SZ + s * 10.9, 1.15, ORG, { col: false }); deco(w, bx - 1, 16.2, SZ + s * 10.9, 3.4, 0.7, 1.5, 0xe9e7e0, { mat: "paint" });
    for (const dx of [-3.6, 1.6]) { bar(w, [bx + dx, 13.6, SZ + s * 10.1], [bx + dx, 17.6, SZ + s * 10.1], 0.18, 0x8a8f99); bar(w, [bx + dx, 17.6, SZ + s * 10.1], [bx + dx, 17.2, SZ + s * 11.6], 0.14, 0x8a8f99); }
    dot(w, bx + 1, 23.6, SZ + s * 15.9, s > 0 ? 0xff3030 : 0x35ff7a, 0.4);
    for (let i = 0; i < 7; i++) if ((i * 5 + (s > 0 ? 1 : 3)) % 3) deco(w, bx - 7 + i * 2.3, 11 + ((i * 7) % 3) * 3.4, SZ + s * 10.04, 0.9, 0.7, 0.06, 0xffe2a8, { mat: "glow" });
  }
  for (let i = 0; i < 6; i++) if (i % 4 !== 1) for (const y of [11, 14.4, 17.8]) if ((i + y) % 3 > 0.6) deco(w, bx + 9.04, y, SZ - 7 + i * 2.8, 0.06, 0.7, 0.9, 0xffe2a8, { mat: "glow" });
  w.cyl(bx - 5, 27.6, SZ, 2.24, 1.5, 0xf2f0ea, { col: false, rt: 2.17, mat: "paint", ao: false }); w.cyl(bx - 5, 26, SZ, 2.3, 0.6, 0x1d3557, { col: false, rt: 2.26, mat: "paint", ao: false });
  // 레이더 마스트, 선수 마스트와 양묘기, 해치 사이 통로, 현문 사다리
  bar(w, [bx + 2, 32, SZ - 3], [bx + 2, 32, SZ + 3], 0.16, 0xdadada); bar(w, [bx + 2, 35, SZ - 1.6], [bx + 2, 35, SZ + 1.6], 0.12, 0xdadada);
  K.radars.push([bx + 2, 30.2, SZ, 2.4]); deco(w, bx + 2, 29.6, SZ, 0.6, 0.6, 0.6, 0xdadada);
  K.blink.push([bx + 2, 38.4, SZ, 0.7, 0]);
  const fx = SX + L / 2 - 6;
  w.pipe(fx, 8.7, SZ, fx, 19, SZ, 0.2, 0xdadada); bar(w, [fx, 16, SZ - 2], [fx, 16, SZ + 2], 0.12, 0xdadada); dot(w, fx, 19.2, SZ, 0xfff2c0, 0.4);
  for (const s of [-1, 1]) { w.box(fx + 2, 8.7, SZ + s * 4, 2.4, 1.3, 2, 0x3a424c, { mat: "paint" }); w.cyl(fx - 2, 8.7, SZ + s * 6, 0.5, 1, DARK, { col: false }); bar(w, [fx + 3, 9.6, SZ + s * 4], [fx + 9, 8.8, SZ + s * 2.4], 0.14, DARK); }
  for (let i = 0; i < 9; i++) { const x = SX - L / 2 + 44 + i * 12.8 - 6.4; if (i === 4 || i === 5) continue; for (const z of [SZ - 11, SZ + 11]) bar(w, [x, 8.7, z], [x, 16.5, z], 0.2, 0x8a8f99); bar(w, [x, 16.5, SZ - 11], [x, 16.5, SZ + 11], 0.2, 0x8a8f99); }
  const gx = bx + 12;
  beam(w, [gx, 0.25, QUAY + 1.6], [gx, 8.9, SZ + B / 2 - 0.3], 0.16, 0xcfd3d8, { tw: 1.2 });
  for (const s of [-0.6, 0.6]) handrail(w, [gx + s, 0.25, QUAY + 1.6], [gx + s, 8.9, SZ + B / 2 - 0.3], WHITE, 1, 2.6);
  // 계선줄
  const moor = (ax, ay, az, bxx) => bar(w, [ax, ay, az], [bxx, 0.75, QUAY + 1.2], 0.07, 0xd8cfae);
  for (const [ax, b] of [[-66, -76], [-60, -57], [-30, -38], [40, 38], [78, 76], [86, 95]]) moor(ax, 8.6, SZ + B / 2, b);
  for (const [ax, b] of [[114, 114], [120, 133], [176, 171], [182, 190]]) moor(ax, 6.1, -141, b);
  // 선미 깃발
  bar(w, [SX - L / 2 + 1, 8.7, SZ], [SX - L / 2 - 0.5, 14, SZ], 0.1, 0xdadada); K.flags.push([SX - L / 2 - 0.5, 13.9, SZ, 3, 1.9, 0xc8281e]);

  // ── 벌크선 (X0 148, Z0 -150, 갑판 6.2) ──
  const X0 = 148, Z0 = -150, bb = X0 - 38 + 8;
  deco(w, X0, 0.5, Z0, 76.12, 0.4, 18.12, 0xe9e7e0, { mat: "paint", ao: false });
  for (const s of [-1, 1]) { w.pipe(bb - 3, 12, Z0 + s * 8, bb + 2, 12, Z0 + s * 8, 0.9, ORG, { col: false }); dot(w, bb + 1, 20.4, Z0 + s * 8.9, s > 0 ? 0xff3030 : 0x35ff7a, 0.35); for (let i = 0; i < 4; i++) if (i !== 2) deco(w, bb - 3.6 + i * 2.4, 9 + (i % 2) * 3.6, Z0 + s * 7.04, 0.9, 0.7, 0.06, 0xffe2a8, { mat: "glow" }); }
  w.pipe(bb + 1, 21, Z0, bb + 1, 27, Z0, 0.14, 0xdadada); K.radars.push([bb + 1, 25, Z0, 1.8]); K.blink.push([bb + 1, 27.3, Z0, 0.55, 0]);
  w.cyl(bb - 3, 22.4, Z0, 1.72, 1, 0x1d3b2f, { col: false, rt: 1.62, mat: "paint", ao: false });
  for (let i = 0; i < 4; i++) { const x = X0 - 38 + 26 + i * 14; for (const s of [-1, 1]) bar(w, [x - 5.6, 7.5, Z0 + s * 5.8], [x + 5.6, 7.5, Z0 + s * 5.8], 0.12, YEL); }
  w.pipe(X0 + 34, 6.2, Z0, X0 + 34, 13, Z0, 0.16, 0xdadada); dot(w, X0 + 34, 13.2, Z0, 0xfff2c0, 0.35);
  bar(w, [X0 - 37.5, 6.2, Z0], [X0 - 38.8, 10.4, Z0], 0.1, 0xdadada); K.flags.push([X0 - 38.8, 10.3, Z0, 2.4, 1.5, 0x2f6fb0]);
  void r;
}

// ── 부두 크레인 2기(대표 구조물): 대차·경고 띠·계단·붐 난간·투광등·운전실 창·번호판 ──
function quayCranes(w, K) {
  [-30, 62].forEach((cx, n) => {
    const C = 0x2f6fb0, Hh = 40;
    for (const dx of [-9, 9]) for (const z of [-112, -124]) {
      deco(w, cx + dx, 0, z, 4.4, 1.1, 1.9, 0x30343a, { mat: "paint" });
      for (const e of [-1.4, 0, 1.4]) w.cyl(cx + dx + e, 0, z, 0.42, 0.9, 0x16181d, { col: false, ao: false });
      deco(w, cx + dx, 1.1, z, 1.56, 2.6, 1.56, 0xdadada, { mat: "std:hazard", tile: 1.6, ao: false });
      deco(w, cx + dx, 20, z, 1.5, 0.5, 1.5, WHITE, { mat: "paint", ao: false }); deco(w, cx + dx, 30, z, 1.5, 0.5, 1.5, WHITE, { mat: "paint", ao: false });
    }
    // 다리 바깥면 지그재그 계단(문형보 위부터)과 사다리
    const sx = cx - 10.3;
    ladder(w, cx - 9.74, 1.2, 12.6, -112, "z", YEL);
    for (let k = 0; k < 3; k++) { const y0 = 13 + k * 8.6, za = k % 2 ? -123 : -113, zb = k % 2 ? -113 : -123; stair(w, [sx, y0, za], [sx, y0 + 8.6, zb], 1, "z", STEEL, YEL); deco(w, sx, y0 + 8.5, zb + (k % 2 ? 0.9 : -0.9), 1.2, 0.12, 1.8, STEEL); }
    // 붐 위 난간과 붐 끝 적백 띠, 케이블 릴
    for (const s of [-2.05, 2.05]) handrail(w, [cx + s, Hh + 2.4, -185.5], [cx + s, Hh + 2.4, -119], YEL, 1, 5.5);
    for (let i = 0; i < 4; i++) deco(w, cx, Hh - 0.04, -184.5 + i * 3, 4.1, 2.48, 3, i % 2 ? WHITE : RED, { mat: "paint", ao: false });
    deco(w, cx, Hh - 0.04, -91.5, 4.1, 2.48, 3, RED, { mat: "paint", ao: false });
    K.blink.push([cx, Hh + 2.9, -185.6, 0.7, 0], [cx - 1.8, Hh + 2.9, -90.4, 0.5, 1], [cx + 1.8, Hh + 2.9, -90.4, 0.5, 1]);
    // 붐 아래 투광등(배·부두를 비춘다)
    for (const z of [-172, -156, -140, -128]) { deco(w, cx - 1.2, Hh - 0.35, z, 0.9, 0.3, 0.6, 0xfff0c8, { mat: "glow" }); deco(w, cx + 1.2, Hh - 0.35, z, 0.9, 0.3, 0.6, 0xfff0c8, { mat: "glow" }); }
    w.pool(cx, 0.03, -118, 17, WARM, 0.34); w.pool(cx, 8.75, -150, 15, WARM, 0.26);
    for (const dx of [-8, 8]) { deco(w, cx + dx * 0.6, 11.7, -118, 0.8, 0.3, 0.5, 0xfff0c8, { mat: "glow" }); }
    // 기계실: 창·환기구·번호판, 운전실 유리
    deco(w, cx, Hh + 5.2, -105.95, 6, 1.6, 0.08, 0x9fd0ff, { mat: "glass" });
    for (const s of [-1, 1]) { for (const dz of [-3.5, 0, 3.5]) deco(w, cx + s * 4.54, Hh + 3.4, -112 + dz, 0.08, 1.2, 1.6, 0x30343a); K.signs.add(n ? "qc2" : "qc1", cx + s * 4.6, Hh + 6.6, -112, 5, { ry: s * 90 }); }
    deco(w, cx, Hh + 8.4, -112, 9.4, 0.25, 12.4, 0x566170);
    deco(w, cx, Hh - 3.3, -152.05, 2.6, 1.9, 0.08, 0x9fd0ff, { mat: "glass" }); deco(w, cx, Hh - 3.6, -150, 3.2, 0.25, 4.2, 0x1d3557, { mat: "paint" });
    // 스프레더와 도르래
    deco(w, cx, 26.0, -160, 12.4, 0.5, 2.6, YEL, { mat: "paint" }); deco(w, cx, 26.5, -160, 2.4, 1, 1.6, 0x30343a);
    deco(w, cx, Hh - 1.2, -160, 3.4, 1.2, 3, 0x30343a, { mat: "paint" });
  });
}

// ── 컨테이너 야적장과 갠트리 크레인 ──
function yard(w, K) {
  const YG = 0xe0a52a;
  // 갠트리: 다리 대차·경고 띠, 끝보, 무릎 보강, 투광등, 운전실
  for (const x of [24, 136]) {
    deco(w, x, 0, 65, 1.9, 1.1, 31, 0x30343a, { mat: "paint" });
    for (const z of [52, 78]) { w.cyl(x, 1.1, z, 0.72, 2.4, 0xdadada, { col: false, mat: "std:hazard", tile: 1.5, ao: false }); bar(w, [x, 18, z], [x + (x < 80 ? 6 : -6), 24, z], 0.5, YG); }
    beam(w, [x, 24.8, 52], [x, 24.8, 78], 1.3, YG);
    ladder(w, x + (x < 80 ? -0.66 : 0.66), 1.2, 24, 52, "z", STEEL);
    K.blink.push([x, 26.2, 52, 0.5, 1], [x, 26.2, 78, 0.5, 1]);
  }
  for (const z of [52, 78]) for (let x = 36; x <= 124; x += 22) { deco(w, x, 23.6, z, 1.2, 0.3, 0.7, 0xfff0c8, { mat: "glow" }); w.pool(x, 0.03, z + (z < 65 ? 6 : -6), 13, WARM, 0.26); }
  for (const z of [52, 78]) for (const s of [-0.9, 0.9]) handrail(w, [26, 25.6, z + s], [134, 25.6, z + s], YG, 0.9, 6);
  deco(w, 99.4, 19.6, 60, 2.4, 2.4, 3, 0xe9e7e0, { mat: "paint" }); deco(w, 99.4, 20.2, 58.46, 2, 1.4, 0.08, 0x9fd0ff, { mat: "glass" }); deco(w, 96, 12.95, 65, 12.4, 0.35, 2.6, YG, { mat: "paint" });
  for (const dz of [-1, 1]) bar(w, [96 + dz * 5, 22, 65], [96 + dz * 5, 13.3, 65], 0.08, 0x22262c);
  // 줄 끝 표지 기둥과 가로등, 원뿔 표지
  for (let row = 0; row < 5; row++) { const z = 26 + row * 19; bar(w, [32.6, 0, z], [32.6, 3.6, z], 0.12, STEEL); deco(w, 32.6, 3.6, z, 0.16, 1.2, 1.6, CC[row], { mat: "paint" }); }
  w.lamp(33, 26, 9, 0xffd9a0, 90, 2); w.lamp(33, 64, 9, 0xffd9a0, 90, 2); w.lamp(129.6, 45, 9, 0xffd9a0, -90, 2); w.lamp(129.6, 83, 9, 0xffd9a0, -90, 2);
  for (const [x, z] of [[72, 58.5], [72, 69.5], [89.5, 58.5], [89.5, 69.5], [36, 112], [39, 113.4]]) w.cone(x, 0, z, 0.24, 0.62, ORG, { mat: "paint", col: false });
}

// ── 저장 탱크 3기와 파이프 랙 ──
function tanks(w, K) {
  const TZ = -70, R = 9.5, cols = [0xc94a3a, 0x3d7fc9, 0xd9c23a];
  [58, 84, 110].forEach((x, i) => {
    w.cyl(x, 12.6, TZ, R + 0.06, 1.3, cols[i], { col: false, ao: false, mat: "paint" }); w.cyl(x, 0, TZ, R + 0.12, 0.7, 0x6b727c, { col: false, ao: false });
    spiral(w, x, TZ, R + 0.05, 0.6, 16, 0.2 * Math.PI, 0.8 * Math.PI);
    deco(w, x + Math.cos(0.8 * Math.PI) * (R + 0.6), 15.9, TZ + Math.sin(0.8 * Math.PI) * (R + 0.6), 1.6, 0.12, 1.6, STEEL, { ry: 36 });
    for (const y of [16.5, 17.05]) ring(w, x, y, TZ, R - 0.15, 0.05, YEL, { col: false, mat: "paint", seg: 30, sides: 4 });
    for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; bar(w, [x + Math.cos(a) * (R - 0.15), 16, TZ + Math.sin(a) * (R - 0.15)], [x + Math.cos(a) * (R - 0.15), 17.05, TZ + Math.sin(a) * (R - 0.15)], 0.06, YEL); }
    w.cyl(x, 18.1, TZ, 0.8, 0.5, 0x8a8f99, { col: false }); dot(w, x, 18.7, TZ, 0xfff0c8, 0.3);
    K.signs.add("t" + (i + 1), x, 4.6, TZ + R + 0.1, 4.4);
    // 탱크 → 파이프 랙 배관, 밸브, 펌프
    w.pipe(x - 2, 1, TZ + R, x - 2, 1, -45, 0.3, cols[i], { col: false }); w.pipe(x - 2, 1, -45, x - 2, 8.3, -45, 0.3, cols[i], { col: false });
    w.cyl(x - 2, 1.2, -58, 0.5, 0.12, RED, { col: false, mat: "paint" }); bar(w, [x - 2, 1, -58], [x - 2, 1.3, -58], 0.12, DARK);
    deco(w, x + 1.5, 0, -52, 2.2, 0.3, 1.4, CONC); w.pipe(x + 0.8, 0.9, -52, x + 2.2, 0.9, -52, 0.45, 0x3d6b8c, { col: false }); deco(w, x + 0.4, 0.3, -52, 0.6, 1, 0.8, 0x30343a);
    K.signs.add("fire", x + 5.5, 1.75, -56.2, 2.2); for (const s of [-0.9, 0.9]) bar(w, [x + 5.5 + s, 0, -56.25], [x + 5.5 + s, 2.3, -56.25], 0.08, STEEL);
  });
  // 탱크 꼭대기를 잇는 점검 통로
  for (const x of [71, 97]) { w.box(x, 16.6, TZ, 8.4, 0.2, 1.3, STEEL); for (const s of [-0.6, 0.6]) handrail(w, [x - 4.2, 16.8, TZ + s], [x + 4.2, 16.8, TZ + s], YEL, 1, 2.1); }
  // 방유제(낮은 콘크리트 둑)
  for (const [x, z, sx, sz] of [[84, -83.5, 80, 0.4], [84, -56.5, 80, 0.4], [44, -70, 0.4, 27], [124, -70, 0.4, 27]]) w.box(x, 0, z, sx, 0.9, sz, CONC, { mat: "std:concrete", tile: 4 });
  for (const x of [50, 118]) { stair(w, [x, 0, -55.3], [x, 0.95, -56.3], 1, "z", STEEL); stair(w, [x, 0.95, -56.7], [x, 0, -57.7], 1, "z", STEEL); }
  // 파이프 랙: 케이블 트레이, 팽창 루프, 기둥 등
  deco(w, 84, 7.8, -40.1, 100, 0.14, 0.5, 0x8a8f99, { mat: "metal" });
  for (const x of [52, 116]) { for (const s of [-1, 1]) w.pipe(x + s * 2, 8.3, -45, x + s * 2, 10.4, -45, 0.45, 0xc94a3a, { col: false }); w.pipe(x - 2, 10.4, -45, x + 2, 10.4, -45, 0.45, 0xc94a3a, { col: false }); }
  for (let x = 36; x <= 132; x += 32) { dot(w, x, 7, -46.3, 0xfff0c8, 0.3); dot(w, x, 7, -39.7, 0xfff0c8, 0.3); }
}

// 서 있는 차량들: 야드 트랙터(+섀시·컨테이너), 지게차
function tractor(w, x, z, ry, color, load) {
  const F = frame(w, x, z, ry), nc = { col: false };
  F.box(4.6, 0.7, 0, 2.4, 2.3, 2.4, color, { mat: "paint", col: false }); F.box(5.5, 1.7, 0, 0.7, 1, 2.2, 0x9fd0ff, { mat: "glass", col: false });
  F.box(-1.4, 0.9, 0, 12.4, 0.35, 2.3, DARK, nc); F.box(3, 0.7, 0, 1.4, 0.9, 1.6, 0x30343a, nc);
  for (const u of [-6, -4.8, 2.2, 5]) for (const v of [-1.05, 1.05]) F.pipe(u, 0.5, v - 0.2, u, 0.5, v + 0.2, 0.5, 0x16181d, nc);
  if (load !== undefined) F.box(-1.4, 1.25, 0, 12.2, 2.6, 2.44, load, { mat: "std:corrug", tile: 2, col: false });
  F.box(4.6, 3, 0, 0.3, 0.2, 0.3, 0xffb020, { mat: "glow", col: false });
  const c = Math.cos(ry * DEG), s = Math.sin(ry * DEG), hy = load !== undefined ? 1.95 : 1.5;
  w.col.addBox(new THREE.Vector3(x - 0.4 * c, hy, z + 0.4 * s), new THREE.Vector3(6.6, hy, 1.25), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry * DEG));
}
function forklift(w, x, z, ry, color = 0xf5a623) {
  const F = frame(w, x, z, ry), nc = { col: false };
  F.box(0, 0.35, 0, 2.2, 0.9, 1.2, color, { mat: "paint", col: false }); F.box(-0.7, 1.25, 0, 0.8, 0.5, 1.1, DARK, nc); F.box(-0.1, 2.3, 0, 1.5, 0.08, 1.2, DARK, nc);
  for (const v of [-0.5, 0.5]) { F.beam(-0.8, 1.25, v, -0.8, 2.3, v, 0.07, DARK, nc); F.beam(0.6, 1.25, v, 0.6, 2.3, v, 0.07, DARK, nc); F.beam(1.2, 0.1, v * 0.8, 1.2, 2.7, v * 0.8, 0.1, 0x8a8f99, nc); F.box(1.9, 0.12, v * 0.6, 1.3, 0.07, 0.14, 0x8a8f99, nc); }
  for (const u of [-0.7, 0.75]) for (const v of [-0.62, 0.62]) F.pipe(u, 0.32, v - 0.12, u, 0.32, v + 0.12, 0.32, 0x16181d, nc);
}

// ── 조선소(대표 구조물: 골리앗 크레인): 간판·난간·투광등, 선대 표시, 가공 작업장, 용접 불꽃 ──
function shipyard(w, K) {
  const [hx, z0, z1] = HULL, gz = -78, gy = 58, xa = hx - 40, xb = hx + 38;
  for (const x of [hx - 22, hx + 20]) { K.signs.add("yard", x, gy + 3, gz + 2.62, 5.6); K.signs.add("yard", x, gy + 3, gz - 2.62, 5.6, { ry: 180 }); }
  for (const s of [-2.3, 2.3]) handrail(w, [hx - 42.5, gy + 6, gz + s], [hx + 40.5, gy + 6, gz + s], YEL, 1, 6);
  for (let x = hx - 30; x <= hx + 30; x += 12) for (const s of [-1.6, 1.6]) deco(w, x, gy - 0.3, gz + s, 1.4, 0.3, 0.7, 0xfff0c8, { mat: "glow" });
  w.pool(hx - 16, 0.03, gz, 18, WARM, 0.3); w.pool(hx + 16, 0.03, gz, 18, WARM, 0.3);
  K.blink.push([xa - 2.4, gy + 6.6, gz, 0.7, 0], [xb + 2, gy + 6.6, gz, 0.7, 0], [hx, 26.6, gz, 0.45, 1]);
  for (const s of [-1, 1]) { deco(w, xa, 2, gz + s * 12.55, 2.7, 2.6, 3, 0xdadada, { mat: "std:hazard", tile: 1.8, ao: false }); deco(w, xb, 2, gz + s * 8.65, 1.8, 2.6, 2.2, 0xdadada, { mat: "std:hazard", tile: 1.8, ao: false }); }
  deco(w, hx + 5.2, gy - 5.6, gz, 2.6, 2.6, 3, WHITE, { mat: "paint" }); deco(w, hx + 6.54, gy - 5, gz, 0.08, 1.6, 2.6, 0x9fd0ff, { mat: "glass" });
  ladder(w, xa + 1.3, 2, 22, gz, "z", YEL);
  // 매달린 선체 블록: 보강재
  for (const dx of [-4, 0, 4]) deco(w, hx + dx, 21.2, gz + 4.03, 0.2, 7, 0.08, 0x7a4630, { ao: false });
  for (const y of [23, 25.6]) deco(w, hx, y, gz + 4.03, 12, 0.2, 0.08, 0x7a4630, { ao: false });
  // 선대: 가장자리 위험 띠, 바다로 내려가는 진수 레일, 비계 난간과 등
  for (const s of [-1, 1]) { flat(w, hx + s * 14.6, (z0 + z1) / 2, 0.8, z1 - z0 + 16, 0xdadada, { mat: "std:hazard", tile: 2, y: 0.34 }); bar(w, [hx + s * 4, 0.35, z0], [hx + s * 4, -3.2, z0 - 30], 0.5, STEEL); }
  for (const z of [z0 + 22, z0 + 46]) for (const y of [4.45, 8.75, 13.05]) { dot(w, hx + 14, y + 0.5, z - 4, 0xfff0c8, 0.25); for (const dz of [-4.3, 4.3]) bar(w, [hx + 14.1, y, z + dz], [hx + 14.1, y + 1, z + dz], 0.06, YEL); bar(w, [hx + 14.1, y + 1, z - 4.3], [hx + 14.1, y + 1, z + 4.3], 0.06, YEL); }
  K.signs.add("safe", hx + 14.25, 10.9, z0 + 34, 4.4, { ry: 90 }); for (const dz of [-2.4, 2.4]) bar(w, [hx + 14.15, 0, z0 + 34 + dz], [hx + 14.15, 12.2, z0 + 34 + dz], 0.1, STEEL);
  K.sparks.push([hx - 7.6, 6.6, z0 + 18], [hx + 8, 12.6, z0 + 54], [hx - 6.2, 2.6, z1 - 14], [-207.5, 1.5, -44]);
  // 가공 작업장(트인 창고): 기둥·박공 지붕·철판 더미·작업등
  const SX = -206, SZ = -36;
  for (const dx of [-6, 6]) for (const dz of [-14, 0, 14]) beam(w, [SX + dx, 0, SZ + dz], [SX + dx, 8, SZ + dz], 0.45, 0x8c3b2e);
  for (const s of [-1, 1]) { w.box(SX + s * 3.3, 8.55, SZ, 7, 0.25, 30, 0x4a5563, { mat: "std:corrug", tile: 2, rz: -s * 10 }); bar(w, [SX + s * 6, 8, SZ - 14], [SX + s * 6, 8, SZ + 14], 0.3, 0x8c3b2e); }
  for (const dz of [-14, 0, 14]) { bar(w, [SX - 6, 8, SZ + dz], [SX + 6, 8, SZ + dz], 0.3, 0x8c3b2e); bar(w, [SX - 6, 8, SZ + dz], [SX, 9.1, SZ + dz], 0.2, 0x8c3b2e); bar(w, [SX + 6, 8, SZ + dz], [SX, 9.1, SZ + dz], 0.2, 0x8c3b2e); }
  flat(w, SX, SZ, 13, 30, 0x9a9da2, { mat: "std:concrete", tile: 5, y: 0.03 });
  for (const [dz, k] of [[-9, 5], [0, 3], [8, 6]]) for (let i = 0; i < k; i++) deco(w, SX - 2 + (i % 2) * 0.3, 0.2 + i * 0.22, SZ + dz, 6, 0.2, 3, [0x7a7f88, 0x8a6a52, 0x6f7781][i % 3], { mat: "metal", ao: false });
  deco(w, SX + 3.6, 0, SZ + 5, 1.6, 0.9, 3, 0x3d6b8c, { mat: "paint" }); deco(w, SX + 3.6, 0.9, SZ + 5, 2.2, 0.12, 3.4, 0x8a8f99, { mat: "metal" });
  for (const dz of [-7, 7]) { deco(w, SX, 7.6, SZ + dz, 0.5, 0.14, 1.8, 0xfff0c8, { mat: "glow" }); w.pool(SX, 0.04, SZ + dz, 9, WARM, 0.3); }
  // 가스통 걸이, 케이블 드럼, 현장 사무실
  for (const [x, z] of [[hx + 19, -22], [hx - 20, -100]]) { deco(w, x, 0, z, 2.6, 0.12, 1, STEEL); for (let i = 0; i < 6; i++) w.cyl(x - 1 + i * 0.4, 0.12, z, 0.16, 1.5, [0x3d7fc9, 0xc94a3a, 0x3d8b5a][i % 3], { col: false, mat: "paint" }); bar(w, [x - 1.3, 1.1, z + 0.3], [x + 1.3, 1.1, z + 0.3], 0.06, YEL); }
  for (const [x, z] of [[hx + 22, -96], [hx + 24.6, -97], [hx - 22, -18]]) { w.pipe(x, 1, z - 0.55, x, 1, z + 0.55, 1, 0xb08a52, { col: false, mat: "std" }); w.pipe(x, 1, z - 0.65, x, 1, z + 0.65, 0.45, 0x30343a, { col: false }); }
  w.box(hx - 34, 0, -42, 2.6, 2.7, 6.4, 0xe9e7e0, { mat: "std:corrug", tile: 2 }); deco(w, hx - 32.66, 1.1, -41, 0.08, 1, 1.6, 0xffe2a8, { mat: "glow" }); deco(w, hx - 32.66, 0, -44, 0.08, 2.1, 0.9, 0x3d6b8c);
}

// ── 어시장: 전구 줄, 생선 상자·얼음 상자, 그물 더미, 건조대 ──
function fishMarket(w, K) {
  const r = w.rand, BULB = [0xfff0b0, 0xff6a5a, 0x7ad0ff, 0x9aff9a];
  for (let i = 0; i < 36; i++) dot(w, -197.5 + i * 2.33, 4.25 - Math.sin(((i % 7) / 7) * Math.PI) * 0.35, -112.3, BULB[i % 4], 0.2);
  bar(w, [-198, 4.5, -112.3], [-114, 4.5, -112.3], 0.03, DARK);
  for (const x of [-159.5, -152.5]) bar(w, [x, 0, -111.6], [x, 7.8, -111.6], 0.16, STEEL);
  K.signs.add("fish", -156, 6.2, -111.5, 6.4); deco(w, -156, 4.5, -111.64, 6.7, 3.4, 0.1, 0x10323f);
  for (let i = 0; i < 5; i++) {
    const x = -190 + i * 17;
    for (let k = 0; k < 4; k++) { const cx = x - 5.4 + k * 3.6 + r(), n = 1 + ((r() * 4) | 0), cz = -110.6 + r() * 0.6; for (let j = 0; j < n; j++) deco(w, cx, j * 0.34, cz, 0.9, 0.32, 0.6, [0x2f6fb0, 0xe9e7e0, 0x2a9d8f, 0xd9a441][(k + j + i) % 4], { mat: "paint", ao: false }); }
    deco(w, x + 5.6, 0, -119.9, 1.4, 0.9, 0.9, 0xe9f4ff, { mat: "paint" }); deco(w, x + 5.6, 0.9, -119.9, 1.5, 0.1, 1, 0x2f6fb0, { mat: "paint" });
    for (const [gx, gz] of [[-3, -121.9], [4, -122.2]]) { deco(w, x + gx, 5.25, gz, 0.5, 0.18, 0.2, WHITE, { ao: false }); deco(w, x + gx + 0.28, 5.3, gz, 0.14, 0.1, 0.08, YEL, { ao: false }); }
  }
  // 그물 더미와 부표, 건조대, 어선 계선줄과 갑판 그물
  for (const [x, z] of [[-203, -122], [-118, -123.6], [-164, -108.6]]) { w.blob(x, 0.35, z, 1.8, 0.55, 1.4, 0x2a6a66, { col: false, mat: "std" }); for (let k = 0; k < 5; k++) deco(w, x - 1 + r() * 2, 0.5 + r() * 0.3, z - 0.8 + r() * 1.6, 0.3, 0.3, 0.3, k % 2 ? ORG : 0xe9e7e0, { mat: "paint", ao: false }); }
  for (const z of [-116, -119]) { for (const x of [-206, -201]) bar(w, [x, 0, z], [x, 2.2, z], 0.08, 0x8a6a4a); for (const y of [1.3, 2.1]) { bar(w, [-206, y, z], [-201, y, z], 0.05, 0x8a6a4a); for (let k = 0; k < 9; k++) deco(w, -205.6 + k * 0.55, y - 0.5, z, 0.12, 0.45, 0.04, k % 3 ? 0xc9b89a : 0xb5a07a, { ao: false }); } }
  for (let i = 0; i < 4; i++) { const x = -188 + i * 21; bar(w, [x + 4, 0.2, -134], [x + 2 + (i % 2) * 6, 0.75, QUAY + 1.2], 0.05, 0xd8cfae); deco(w, x + 1.6, 0.7, -135.5, 2.2, 0.45, 1.6, [0x2a6a66, 0xb08a52][i % 2], { ao: false }); }
}

// ── 조차장: 자갈 도상·침목, 차막이·신호기, 건널목, 움직이는 입환 기관차 ──
function railYard(w, K) {
  const TZ = [222, 230, 238, 246];
  for (const z of TZ) {
    flat(w, -45, z, 500, 4.6, 0x74695e, { y: 0.008, mat: "std:dirt", tile: 3 });
    for (let x = -292; x <= 196; x += 2.1) deco(w, x, 0.1, z, 0.3, 0.075, 2.5, 0x3a3028, { ao: false });
  }
  for (const [x, z] of [[-128, 222], [-126, 238], [58, 238], [-122, 230]]) { deco(w, x, 0.2, z, 0.5, 1.3, 2.6, 0x30343a, { mat: "paint" }); deco(w, x + 0.3, 1, z, 0.12, 0.5, 2.2, RED, { mat: "paint" }); dot(w, x + 0.4, 1.6, z, 0xff3030, 0.22); }
  for (const [x, z] of [[-40, 226], [10, 234], [70, 226], [120, 242], [-100, 242]]) { bar(w, [x, 0, z], [x, 1.5, z], 0.1, DARK); deco(w, x, 1.5, z, 0.5, 0.5, 0.12, WHITE, { mat: "paint", ry: 45 }); dot(w, x, 2.1, z, 0xbfe3ff, 0.18); }
  for (const x of [-200, -90, 60, 160]) { deco(w, x, 0, 217.2, 1.2, 1.5, 0.6, 0x8a8f99, { mat: "metal" }); bar(w, [x + 30, 0, 252], [x + 30, 5, 252], 0.14, DARK); deco(w, x + 30, 5, 252, 0.5, 1.3, 0.4, 0x16181d); dot(w, x + 30.3, 5.9, 252, x > 0 ? 0x35ff7a : 0xff3030, 0.26); }
  K.signs.add("rail", -160, 7, 217.5, 6, { ry: 180 }); K.signs.add("rail", -139.7, 6.6, 226, 5, { ry: 90 });
  // 건널목 (x -20): 깔판, 차단기, 경보등
  flat(w, -20, 234, 7, 33, 0x8a6a4a, { y: 0.2, mat: "std:wood", tile: 2 }); flat(w, -20, 204, 8, 26, 0x5d616b, { y: 0.022, mat: "std:asphalt", tile: 6 });
  for (const [x, z, s] of [[-24.6, 216.4, 1], [-15.4, 251.6, -1]]) {
    bar(w, [x, 0, z], [x, 4, z], 0.16, WHITE); bar(w, [x, 1.1, z], [x + s * 5.4, 3.6, z], 0.14, RED);
    deco(w, x, 3.2, z, 1.5, 0.12, 0.12, WHITE, { rz: 45 }); deco(w, x, 3.2, z, 1.5, 0.12, 0.12, WHITE, { rz: -45 });
    K.blink.push([x - 0.5, 2.6, z, 0.3, 1], [x + 0.5, 2.6, z, 0.3, 1]);
  }
  // 입환 기관차: 2번 선로를 천천히 오간다 (화차 두 량을 민다)
  const parts = [[BOXG, M(0, 1.9, 0, 9, 2.2, 2.7), 0xe0a52a], [BOXG, M(-2.2, 3.6, 0, 3, 1.4, 2.6), 0xe0a52a], [BOXG, M(-2.2, 3.75, 0, 3.06, 0.7, 2.66), 0x1d2b3a], [BOXG, M(-2.2, 4.38, 0, 3.4, 0.16, 2.9), 0x30343a], [BOXG, M(0, 0.65, 0, 9.6, 0.5, 2.5), 0x2c3138],
    [BOXG, M(4.56, 1.6, 0, 0.1, 1.4, 2.72), 0x16181d], [BOXG, M(-4.56, 1.6, 0, 0.1, 1.4, 2.72), 0x16181d], [BOXG, M(2.4, 3.2, 0, 0.5, 0.5, 0.5), 0x30343a]];
  for (let k = 1; k <= 2; k++) parts.push([BOXG, M(k * 14.6 - 2.6, 0.85, 0, 13.6, 0.5, 2.7), 0x2c3138], [BOXG, M(k * 14.6 - 2.6, 2.4, 0, 12.2, 2.6, 2.44), CC[k * 3]]);
  const sh = new THREE.Mesh(merged(parts), w.material("paint")); sh.castShadow = true; w.scene.add(sh);
  w.rider(sh, [[0, 2.4, 0, 4.9, 2.1, 1.45], [12, 2.2, 0, 6.9, 1.7, 1.4], [26.6, 2.2, 0, 6.9, 1.7, 1.4]]);
  w.updaters.push((dt, t) => sh.position.set(104 + Math.sin(t * 0.06) * 46, 0.1, 230));
}

// ── 공사장: 철근·호이스트·자재, 현장 사무실 ──
function site(w, K) {
  const [cx, cz] = SITE, r = w.rand;
  for (const dx of [-18, 0, 18]) for (const dz of [-18, 0, 18]) if (dx || dz) for (const [a, b] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) bar(w, [cx + dx + a, 28, cz + dz + b], [cx + dx + a, 29.4 + r() * 0.6, cz + dz + b], 0.06, 0x8a4a32);
  // 서쪽 면 자재 호이스트
  const hxx = cx - 21.6, hz = cz + 7;
  for (const dz of [-1, 1]) beam(w, [hxx, 0, hz + dz], [hxx, 31, hz + dz], 0.3, YEL);
  for (let y = 0; y < 30; y += 3) bar(w, [hxx, y, hz - 1], [hxx, y + 3, hz + 1], 0.12, YEL);
  w.box(hxx + 0.2, 11.2, hz, 1.6, 2.6, 1.8, 0xd9432f, { mat: "paint" }); bar(w, [hxx - 1, 31, hz], [hxx + 1.4, 31, hz], 0.3, YEL);
  // 안전제일 현수막(동쪽 면)
  K.signs.add("safe", cx + 20.3, 24.6, cz + 9, 7, { ry: 90 }); w.col.addBox(new THREE.Vector3(cx + 20.2, 24.6, cz + 9), new THREE.Vector3(0.2, 1.8, 3.6));
  // 층마다 놓인 자재와 방수포
  for (let k = 1; k <= 4; k++) { const y = k * 5.5 + 0.5, s = k % 2 ? 1 : -1; deco(w, cx + s * 15, y, cz + s * 13, 3.4, 0.5, 2.2, 0x2f6fb0, { ao: false }); for (let i = 0; i < 3; i++) deco(w, cx - s * 14 + i * 0.5, y, cz - s * 16.5, 0.3, 0.12 + i * 0.12, 5, 0x8a4a32, { ao: false }); }
  // 지상: 철근 다발, 모래 더미, 시멘트 포대, 레미콘, 현장 사무실, 간이 화장실, 방호벽
  for (let i = 0; i < 5; i++) deco(w, 97 + (i % 3) * 0.5, 0.1 + Math.floor(i / 3) * 0.3, 148, 0.4, 0.28, 9, 0x8a4a32, { ao: false });
  w.cone(100, -0.2, 157, 4, 2.6, 0xd9b45a, { mat: "std:dirt", grad: [0.8, 1.06], col: false });
  for (let i = 0; i < 6; i++) deco(w, 106 + (i % 2) * 1.3, Math.floor(i / 2) * 0.32, 151, 1.2, 0.3, 0.8, 0xcfc8b8, { ao: false });
  const F = frame(w, 106, 164, 20);
  F.box(2.6, 0.8, 0, 2.2, 2.2, 2.4, 0xe9e7e0, { mat: "paint", col: false }); F.box(-1, 0.8, 0, 6, 0.4, 2.2, DARK, { col: false });
  F.pipe(-3.4, 2.2, 0, 0.6, 2.9, 0, 1.3, 0xd9432f); F.pipe(-3.5, 2.2, 0, -3.9, 2.1, 0, 0.9, 0xe9e7e0, { col: false });
  for (const u of [-3, -1.6, 2.4]) for (const v of [-1, 1]) F.pipe(u, 0.5, v - 0.2, u, 0.5, v + 0.2, 0.5, 0x16181d, { col: false });
  for (let k = 0; k < 2; k++) { w.box(100, k * 2.6, 176, 6.1, 2.6, 2.44, k ? 0xe9e7e0 : 0x3d6b8c, { mat: "std:corrug", tile: 2 }); deco(w, 98.4, k * 2.6 + 1.1, 174.75, 1.6, 0.9, 0.06, 0xffe2a8, { mat: "glow" }); deco(w, 101.6, k * 2.6, 174.75, 0.9, 2, 0.06, 0x30343a); }
  stair(w, [104.2, 0, 173.9], [104.2, 2.6, 177], 0.9, "z", STEEL);
  for (const x of [93, 94.5]) { deco(w, x, 0, 176.4, 1.2, 2.3, 1.2, 0x2f8fd0, { mat: "paint" }); deco(w, x, 2.3, 176.4, 1.3, 0.12, 1.3, WHITE); }
  for (const [x, z, k] of [[92, 146, 0], [108, 146, 1], [110, 160, 0], [92, 170, 1]]) { deco(w, x, 0, z, 2.2, 0.25, 0.5, CONC); deco(w, x, 0.25, z, 2, 0.75, 0.12, k ? ORG : WHITE, { mat: "paint" }); }
  // 타워 크레인: 기초, 평형추, 운전실 창
  const tx = cx - 26, tz = cz - 24, H = 46;
  deco(w, tx, 0, tz, 5, 0.8, 5, CONC, { mat: "std:concrete", tile: 3 });
  for (let i = 0; i < 3; i++) deco(w, tx - 0.83 * (9 + i * 1.3), H + 0.8, tz - 0.56 * (9 + i * 1.3), 1.1, 2.4, 2.4, CONC, { ry: -34 });
  K.blink.push([tx + 0.83 * 44, H + 3.8, tz + 0.56 * 44, 0.5, 0]);
}

// ── 관리동·정문·울타리, 정비동, 굴뚝 공장, 사일로, 철골 타워, 원료 야적장, 컨베이어 ──
function yardBuildings(w, K) {
  // 관리동: 잔디·생울타리, 현관 차양, 깃발 게양대, 옥상 안테나
  flat(w, -150, 166, 40, 12, 0x5f8f42, { y: 0.03, mat: "std:grass", tile: 6 });
  for (const [x0, z0, x1, z1] of [[-170, 160, -130, 160], [-170, 172, -130, 172], [-170, 160, -170, 172], [-130, 160, -130, 172]]) deco(w, (x0 + x1) / 2, 0, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.3, 0.22, Math.abs(z1 - z0) + 0.3, CONC);
  for (let i = 0; i < 12; i++) w.blob(-168 + i * 3.3, 0.7, 170.6, 1.5, 0.9, 1.1, 0x3f7a35, { col: false, mat: "foliage", grad: [0.6, 1.1] });
  for (const x of [-164, -136]) w.tree(x, 165, 0.8, "round");
  [-156, -150, -144].forEach((x, i) => { w.cyl(x, 0, 163, 0.09, 9, 0xdadada, { rt: 0.06, mat: "metal" }); dot(w, x, 9.05, 163, 0xe0b52a, 0.16); K.flags.push([x, 8.9, 163, 2.4, 1.5, [0x2f6fb0, 0xf2f0ea, 0x3d8b5a][i]]); });
  deco(w, -150, 3.5, 139.8, 9, 0.3, 4.4, 0x343943); for (const x of [-154, -146]) bar(w, [x, 0, 137.9], [x, 3.5, 137.9], 0.2, 0xdadada);
  deco(w, -150, 3.3, 139.8, 7, 0.1, 0.4, 0xfff0c8, { mat: "glow" }); w.pool(-150, 0.03, 138.6, 8, WARM, 0.36);
  K.signs.add("office", -150, 4.6, 137.5, 5.2, { ry: 180 });
  for (const x of [-162, -138]) { deco(w, x, 0.35, 139.4, 2, 0.1, 0.5, 0x9b6b3d, { mat: "std:wood", tile: 1 }); for (const s of [-0.8, 0.8]) deco(w, x + s, 0, 139.4, 0.1, 0.35, 0.45, DARK); }
  w.pipe(-160, 13.7, 152, -160, 21, 152, 0.1, 0xdadada); bar(w, [-161, 19, 152], [-159, 19, 152], 0.07, 0xdadada); K.blink.push([-160, 21.3, 152, 0.45, 0]);
  w.lamp(-173, 121, 8, 0xffd9a0, 90, 2); w.lamp(-127, 121, 8, 0xffd9a0, -90, 2);
  for (let i = 0; i < 9; i++) flat(w, -168 + i * 4.6 + 2.3, 124.6, 1.6, 0.5, YEL, { y: 0.045 });
  // 남쪽 울타리와 정문 초소·차단기
  const fence = (x0, x1, z) => { w.box((x0 + x1) / 2, 0, z, x1 - x0, 2.1, 0.12, 0x6f8a86, { mat: "glass" }); for (const y of [0.1, 2.1]) bar(w, [x0, y, z], [x1, y, z], 0.07, STEEL); const n = Math.round((x1 - x0) / 4); for (let i = 0; i <= n; i++) bar(w, [x0 + ((x1 - x0) * i) / n, 0, z], [x0 + ((x1 - x0) * i) / n, 2.3, z], 0.09, STEEL); };
  fence(-196, -30, 205.5); fence(-10, 140, 205.5); fence(160, 194, 205.5);
  w.box(-33.5, 0, 203, 3, 2.8, 3, 0xe9e7e0, { mat: "paint" }); deco(w, -33.5, 2.8, 203, 3.6, 0.2, 3.6, 0x1d3557, { mat: "paint" }); deco(w, -31.96, 1.2, 203, 0.06, 1, 2, 0xffe2a8, { mat: "glow" });
  K.signs.add("gate", -33.5, 3.8, 201.2, 3.4, { ry: 180 }); K.signs.add("slow", -11, 2.4, 201, 2.4, { ry: 180 }); bar(w, [-11, 0, 201.05], [-11, 2, 201.05], 0.1, STEEL);
  bar(w, [-30.6, 0, 205.5], [-30.6, 1.2, 205.5], 0.24, YEL); bar(w, [-30.6, 1.1, 205.5], [-12, 5.2, 205.5], 0.14, WHITE);
  K.blink.push([-30.6, 1.5, 205.5, 0.3, 1]);
  // 정비동: 문틀·차양·환기 터빈, 대기 중인 지게차와 타이어·드럼
  for (const z of [-9, 0, 9]) { for (const s of [-1, 1]) deco(w, -148.7, 0, z + s * 3.35, 0.24, 5.3, 0.3, YEL, { mat: "paint" }); deco(w, -148.4, 5.2, z, 1, 0.5, 7.2, 0x3a424c); dot(w, -148, 5.9, z, WARM, 0.3); }
  w.pool(-144, 0.03, 0, 12, WARM, 0.28);
  deco(w, -160, 8.5, 0, 2, 0.5, 26, 0x5a616c, { mat: "std:corrug", tile: 2 }); for (const z of [-10, 0, 10]) K.vents.push([-165, 8.5, z]);
  forklift(w, -146, -12.5, 80); forklift(w, -146.4, -8.6, 96, 0xd9432f);
  for (let k = 0; k < 4; k++) w.cyl(-147, k * 0.3, -18, 0.55, 0.28, 0x16181d, { col: false, ao: false });
  for (let k = 0; k < 3; k++) w.cyl(-152 + k * 1, 0, -17, 0.44, 1.15, [0x2f6fb0, 0xc94a3a, 0xd9c23a][k], { col: false, mat: "paint" });
  deco(w, -158, 0, -17.4, 3, 1.4, 2, 0x9b6b3d, { mat: "std:wood", tile: 2 });
  // 굴뚝 공장: 점검 발판·사다리·덕트, 건물 창과 문
  for (const [x, z, h] of [[-130, 70, 58], [-150, 92, 48]]) {
    const rr = 3.4 - ((h - 14) / h) * 1.2;
    w.cyl(x, h - 14, z, rr + 1.3, 0.2, STEEL, { col: false, ao: false }); ring(w, x, h - 12.8, z, rr + 1.25, 0.05, YEL, { col: false, mat: "paint", seg: 20, sides: 4 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283, px = x + Math.cos(a) * (rr + 1.25), pz = z + Math.sin(a) * (rr + 1.25); bar(w, [px, h - 13.8, pz], [px, h - 12.8, pz], 0.06, YEL); }
    bar(w, [x + 3.5, 0.5, z], [x + rr + 0.15, h - 14, z], 0.1, YEL); bar(w, [x + 3.9, 0.5, z], [x + rr + 0.55, h - 14, z], 0.1, YEL);
    K.blink.push([x + rr + 1.3, h - 13.4, z, 0.4, 0], [x - rr - 1.3, h - 13.4, z, 0.4, 0]);
    w.cyl(x, 0, z, 4.2, 1.2, CONC, { col: false, mat: "std:concrete", tile: 3 });
  }
  w.pipe(-134, 8, 61, -131.2, 13, 67.6, 1.1, 0x8a8f99); w.pipe(-146, 8, 62, -149.4, 12, 89, 0.9, 0x8a8f99);
  for (let i = 0; i < 5; i++) deco(w, -150 + i * 5, 5.4, 65.05, 3, 1.3, 0.08, i % 2 ? 0xffe2a8 : 0x9fd0ff, { mat: i % 2 ? "glow" : "glass" });
  deco(w, -140, 0, 65.1, 5, 4.4, 0.16, 0x3d6b8c, { mat: "std:corrug", tile: 2 }); deco(w, -140, 9, 58, 26.6, 0.4, 14.6, 0x4a4f58);
  for (const x of [-148, -132]) w.box(x, 9.4, 55, 2.4, 1.4, 2, 0xcfd3d8, { mat: "std:panel", tile: 2 });
  // 사일로: 색 띠, 사다리, 꼭대기 난간과 등
  for (let i = 0; i < 4; i++) {
    const x = 150 + (i % 2) * 13, z = 150 + Math.floor(i / 2) * 13;
    w.cyl(x, 23, z, 5.66, 1.6, 0x2f6fb0, { col: false, ao: false, mat: "paint" }); w.cyl(x, 0, z, 5.7, 1, 0x6b727c, { col: false, ao: false });
    ladder(w, x + (i % 2 ? 5.75 : -5.75), 1, 30, z, "z", YEL); dot(w, x, 33.5, z, 0xfff0c8, 0.3);
  }
  for (const s of [-1.4, 1.4]) handrail(w, [145.5, 35, 156.5 + s], [167.5, 35, 156.5 + s], YEL, 1, 2.8);
  K.blink.push([156.5, 36.4, 156.5, 0.45, 0]);
  // 철골 타워: 기초, 층마다 모서리 등, 꼭대기 난간·안테나
  const TX = -40, TZ = 70, S = 10;
  for (const sx of [-S, S]) for (const sz of [-S, S]) { deco(w, TX + sx, 0, TZ + sz, 1.8, 0.5, 1.8, CONC); for (let lv = 1; lv <= 4; lv++) dot(w, TX + sx * 1.04, lv * 8.5 - 0.6, TZ + sz * 1.04, 0xfff0c8, 0.26); }
  for (const s of [-1, 1]) { handrail(w, [TX - 4.5, 34.4, TZ + s * 4.5], [TX + 4.5, 34.4, TZ + s * 4.5], YEL, 1, 3); handrail(w, [TX + s * 4.5, 34.4, TZ - 4.5], [TX + s * 4.5, 34.4, TZ + 4.5], YEL, 1, 3); }
  w.pipe(TX, 34.4, TZ, TX, 43, TZ, 0.14, 0xdadada); for (const y of [38, 40.5]) bar(w, [TX - 1, y, TZ], [TX + 1, y, TZ], 0.08, 0xdadada); K.blink.push([TX, 43.3, TZ, 0.5, 0]);
  // 원료 야적장: 옹벽, 불도저, 살수 기둥
  for (const x of [-275, -251, -227]) w.box(x, 0, 60.5, 20, 2.2, 0.5, CONC, { mat: "std:concrete", tile: 4 });
  const B = frame(w, -238, 52, 25);
  B.box(0, 0.5, 0, 3.4, 1.3, 2.2, YEL, { mat: "paint" }); B.box(-0.5, 1.8, 0, 1.6, 1.4, 1.8, 0x1d2b3a, { mat: "paint", col: false }); B.box(2.3, 0.2, 0, 0.3, 1.5, 3.4, 0x8a8f99, { mat: "metal", col: false });
  for (const v of [-1.3, 1.3]) B.box(0, 0, v, 3.8, 0.9, 0.5, DARK, { col: false });
  for (const [x, z] of [[-288, 100], [-216, 86], [-216, 126]]) { bar(w, [x, 0, z], [x, 6, z], 0.12, 0x3d7fc9); bar(w, [x, 6, z], [x + (x < -250 ? 1.2 : -1.2), 6.6, z], 0.1, 0x3d7fc9); }
  // 컨베이어 통로 창 불빛, 환적탑 계단
  for (let z = -105; z < 150; z += 14.6) for (const s of [-1.63, 1.63]) deco(w, 182 + s, 18.6, z, 0.06, 0.6, 1.6, 0xffe2a8, { mat: "glow" });
  for (let k = 0; k < 4; k++) stair(w, [185.6, k * 5.5, k % 2 ? 155.6 : 150.4], [185.6, k * 5.5 + 5.5, k % 2 ? 150.4 : 155.6], 0.9, "z", STEEL);
  // 동쪽 에이프런과 남쪽 도로변에 대기 중인 야드 트랙터
  tractor(w, 152, -116, 0, 0xe0a52a, 0x2f6fb0); tractor(w, 166, -121, 0, 0xe9e7e0);
}

// ── 정유 단지(대표 구조물: 냉각탑·증류탑·구형 탱크): 작업등, 난간, 배관, 변전 설비, 유조선 의장 ──
function refineryDetail(w, K) {
  // 구형 탱크: 꼭대기 난간·살수 고리·하부 배관·사다리, 점검 통로 난간
  [[252, 24], [276, 24], [252, 50], [276, 50]].forEach(([x, z], i) => {
    const s = x < 264 ? -1 : 1, c = [0xc94a3a, 0x3d7fc9, 0xd9c23a, 0xcfd3d8][i];
    ring(w, x, 20.9, z, 2.2, 0.05, YEL, { col: false, mat: "paint", seg: 16, sides: 4 }); dot(w, x, 20.5, z, 0xfff0c8, 0.3);
    ring(w, x, 17.6, z, 6.2, 0.08, 0x3d7fc9, { col: false, mat: "paint", seg: 24, sides: 4 });
    w.pipe(x, 3.2, z, x, 0.5, z, 0.3, c, { col: false }); w.pipe(x, 0.5, z, x + s * 11.6, 0.5, z, 0.3, c, { col: false });
    w.cyl(x + s * 10, 0.8, z, 0.45, 0.1, RED, { col: false, mat: "paint" }); bar(w, [x + s * 10, 0.5, z], [x + s * 10, 0.85, z], 0.1, DARK);
    ladder(w, x + s * 8.62, 0.3, 11.5, z, "z", YEL);
    dot(w, x + s * 6.2, 3.4, z + 6.2, 0xfff0c8, 0.24);
  });
  for (const z of [24, 50]) for (const s of [-0.7, 0.7]) handrail(w, [253, 20.4, z + s], [275, 20.4, z + s], YEL, 1, 2.75);
  for (const s of [-0.7, 0.7]) handrail(w, [264 + s, 20.4, 25], [264 + s, 20.4, 49], YEL, 1, 3);
  // 증류탑: 발판마다 작업등(해 질 녘 정유 공장의 불빛), 옆 배관
  for (const [x, z, rad, h] of [[250, -62, 3.4, 54], [263, -48, 2.7, 42], [249, -40, 2.4, 34], [262, -78, 2.2, 30]]) {
    for (let y = 9; y < h - 3; y += 9) for (let k = 0; k < 3; k++) { const a = k * 2.094 + y * 0.4; dot(w, x + Math.cos(a) * (rad + 1.25), y + 1.5, z + Math.sin(a) * (rad + 1.25), 0xfff0c8, 0.26); }
    w.pipe(x - rad - 0.32, 0, z, x - rad - 0.32, h - 4, z, 0.25, 0x8a8f99, { col: false });
    w.cyl(x, 0, z, rad + 0.5, 0.8, CONC, { col: false, mat: "std:concrete", tile: 3 });
  }
  // 파이프 랙 작업등과 펌프 열
  for (let z = -104; z <= -6; z += 28) for (const x of [237.5, 242.5]) dot(w, x, 10, z + 0.4, 0xfff0c8, 0.26);
  for (let z = -97; z <= -13; z += 14) { deco(w, 235.4, 0, z, 1.8, 0.3, 1, CONC); w.pipe(234.8, 0.85, z, 236, 0.85, z, 0.42, 0x3d6b8c, { col: false }); deco(w, 234.5, 0.3, z, 0.5, 0.9, 0.7, 0x30343a); bar(w, [236, 0.85, z], [237.5, 0.85, z], 0.18, 0x8a8f99); }
  // 가열로: 버너 불빛, 사다리, 증기. 수평 드럼 두 기
  for (const x of [280.5, 283, 285.5]) deco(w, x, 0.9, -35.46, 1.4, 0.45, 0.08, 0xff8a3a, { mat: "glow" });
  ladder(w, 288.08, 0.4, 12, -38, "z", YEL); for (const s of [-1, 1]) handrail(w, [278.2, 12, -40 + s * 4.4], [287.8, 12, -40 + s * 4.4], YEL, 1, 3.2);
  plume(w, 283, 38.5, -40, 2.2, 16, 2, 0xfff4e6);
  for (const z of [-62, -70]) { w.pipe(281.5, 2.3, z, 288.5, 2.3, z, 1.3, 0xcfd3d8, { mat: "metal" }); for (const x of [282.6, 287.4]) deco(w, x, 0, z, 0.6, 1.4, 2.2, CONC); w.cyl(285, 3.5, z, 0.3, 0.9, 0x8a8f99, { col: false }); }
  // 냉각탑: 꼭대기 적백 띠와 장애등, 펌프실
  const [tx, tz] = TOWER, RR = (y) => 11.29 + (y - 44.5) * 0.2255 + 0.07;
  for (const [y0, y1, c] of [[47.8, 50, RED], [45.6, 47.8, WHITE]]) { const g = new THREE.CylinderGeometry(RR(y1), RR(y0), y1 - y0, 24, 1, true); w.mesh(g, M(tx, (y0 + y1) / 2, tz), c, "paint"); g.dispose(); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + 0.3; K.blink.push([tx + Math.cos(a) * 12.7, 50.3, tz + Math.sin(a) * 12.7, 0.55, 0]); }
  w.box(250, 0, 174, 6, 4, 5, 0x6d7683, { mat: "std:corrug", tile: 3 }); deco(w, 250, 4, 174, 6.4, 0.3, 5.4, 0x4a4f58); w.pipe(253, 1, 173, 261, 1, 163, 0.5, 0x3d7fc9, { col: false }); dot(w, 250, 3.2, 171.4, WARM, 0.3);
  // 변전 설비: 변압기 3기, 문형 철구, 울타리
  for (const z of [83, 87.5, 92]) {
    w.box(284, 0, z, 3, 2.6, 2.4, 0x6d7683, { mat: "std:panel", tile: 2 });
    for (const dx of [-1, 0, 1]) { w.cyl(284 + dx, 2.6, z, 0.14, 1.1, 0xb9b3a8, { col: false, ao: false }); bar(w, [284 + dx, 3.7, z], [280.4, 6.8, z + dx * 0.5], 0.04, DARK); }
    for (let k = 0; k < 4; k++) deco(w, 285.8, 0.4, z - 0.9 + k * 0.6, 0.6, 1.8, 0.08, 0x565d68);
  }
  for (const z of [80, 95]) beam(w, [280.4, 0, z], [280.4, 7, z], 0.3, STEEL); bar(w, [280.4, 6.9, 80], [280.4, 6.9, 95], 0.3, STEEL);
  for (const [x0, z0, x1, z1] of [[278, 78.5, 290, 78.5], [278, 96.5, 290, 96.5], [278, 78.5, 278, 96.5], [290, 78.5, 290, 96.5]]) { for (const y of [1, 2]) bar(w, [x0, y, z0], [x1, y, z1], 0.06, YEL); for (let i = 0; i <= 4; i++) { const t = i / 4; bar(w, [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t], [x0 + (x1 - x0) * t, 2.1, z0 + (z1 - z0) * t], 0.08, YEL); } }
  K.signs.add("fire", 277.9, 1.5, 87.5, 2.4, { ry: -90 }); K.signs.add("oil", 278.9, 5.3, 112, 6, { ry: -90 }); K.signs.add("fire", 239.2, 1.6, 37, 2.6, { ry: -90 });
  // 동쪽 원경 탱크: 나선 계단·난간·색 띠
  for (const z of [-60, 0, 60, 120]) { spiral(w, 332, z, 17.05, 0.5, 14, Math.PI * 0.72, Math.PI * 1.22, STEEL, YEL, 1.2); ring(w, 332, 15, z, 16.8, 0.07, YEL, { col: false, mat: "paint", seg: 32, sides: 4 }); w.cyl(332, 10.6, z, 17.08, 1.3, [0x2f6fb0, 0xc94a3a][(z / 60 + 2) % 2 | 0], { col: false, ao: false, mat: "paint" }); }
  // 유조선과 잔교: 흘수선, 중앙 통로 난간, 마스트·레이더·깃발, 잔교 등
  const X0 = 258, Z0 = -191, bx = 289;
  deco(w, X0, 0.45, Z0, 80.12, 0.4, 14.12, 0xe9e7e0, { mat: "paint", ao: false });
  for (const s of [-2, 2]) handrail(w, [224, 5.25, Z0 + s], [281, 5.25, Z0 + s], WHITE, 1.6, 5.2);
  w.pipe(bx - 1, 18.8, Z0, bx - 1, 23.5, Z0, 0.12, 0xdadada); K.radars.push([bx - 1, 21.6, Z0, 1.7]); K.blink.push([bx - 1, 23.8, Z0, 0.5, 0]);
  for (const s of [-1, 1]) { w.pipe(bx - 1.5, 10.5, Z0 + s * 7, bx + 3, 10.5, Z0 + s * 7, 0.85, ORG, { col: false }); dot(w, bx - 1, 18.3, Z0 + s * 7.4, s > 0 ? 0xff3030 : 0x35ff7a, 0.32); for (let i = 0; i < 4; i++) if (i !== 1) deco(w, bx - 3.4 + i * 2.2, 8 + (i % 2) * 3.4, Z0 + s * 6.04, 0.9, 0.7, 0.06, 0xffe2a8, { mat: "glow" }); }
  bar(w, [X0 + 39.4, 5.2, Z0], [X0 + 40.4, 9.6, Z0], 0.1, 0xdadada); K.flags.push([X0 + 40.4, 9.5, Z0, 2.4, 1.5, 0xe0a52a]);
  w.pipe(X0 - 36, 5.2, Z0, X0 - 36, 12, Z0, 0.14, 0xdadada); dot(w, X0 - 36, 12.2, Z0, 0xfff2c0, 0.35);
  for (let z = -134; z >= -176; z -= 10.5) for (const s of [-1.9, 1.9]) { bar(w, [262 + s, 4, z], [262 + s, 5.4, z], 0.07, YEL); dot(w, 262 + s, 5.5, z, 0xfff0c8, 0.2); }
}

// ── 사장교와 수로: 차선, 경사로 난간, 교각 조명, 항로등, 방충재, 매어 둔 배 ──
function bridgeDetail(w, K) {
  const mid = (CH0 + CH1) / 2, BZ = BRIDGE_Z;
  for (let x = mid - 21; x < mid + 22; x += 6) w.box(x, 10, BZ, 3, 0.03, 0.2, 0xd8b23a, { col: false, ao: false });
  for (const s of [-4.4, 4.4]) w.box(mid, 10, BZ + s, 48, 0.03, 0.16, 0xdcdcd6, { col: false, ao: false });
  for (const s of [-1, 1]) for (const sz of [-1, 1]) {
    const a = [mid + s * 24, 10, BZ + sz * 5.3], b = [mid + s * 61, 0.35, BZ + sz * 5.3];
    handrail(w, a, b, 0xd8d8d8, 0.9, 4.6);
  }
  for (const sz of [-5.7, 5.7]) { dot(w, mid - 9, 8.6, BZ + sz, 0x35ff7a, 0.4); dot(w, mid + 9, 8.6, BZ + sz, 0xff3030, 0.4); dot(w, mid, 8.6, BZ + sz, 0xfff2c0, 0.4); }
  for (const px of [CH0 - 5, CH1 + 5]) {
    w.pool(px, 0.03, BZ, 12, WARM, 0.32);
    for (const sz of [-1, 1]) { deco(w, px, 0, BZ + sz * 7.5, 3.2, 1.1, 3.2, CONC, { mat: "std:concrete", tile: 3 }); dot(w, px, 1.3, BZ + sz * 5.4, 0xfff0c8, 0.4); dot(w, px, 36.2, BZ + sz * 4.4, 0xfff0c8, 0.34); }
    K.blink.push([px, 37.4, BZ, 0.5, 1]);
  }
  // 수로 안벽 방충재와 사다리
  for (let z = -100; z <= 200; z += 25) { w.pipe(CH0 + 0.02, -0.9, z, CH0 + 0.4, -0.9, z, 0.7, 0x1c1e22, { col: false, mat: "std" }); w.pipe(CH1 - 0.02, -0.9, z, CH1 - 0.4, -0.9, z, 0.7, 0x1c1e22, { col: false, mat: "std" }); }
  // 매어 둔 작은 배
  for (const [x, z, c, s] of [[200.4, 150, 0xf2f0ea, -1], [200.4, 165, 0x2a9d8f, -1], [227.6, -24, 0xe94f37, 1], [227.6, -40, 0x2f6fb0, 1]]) {
    w.box(x, -1.5, z, 2.4, 1.6, 6.4, c, { mat: "paint" }); deco(w, x, 0.1, z + 1, 1.8, 1.3, 2.2, WHITE, { mat: "paint" }); deco(w, x, 0.1, z, 2.5, 0.12, 6.5, 0x9b6a36, { ao: false });
    bar(w, [x, 1.4, z + 1], [x, 3.4, z + 1], 0.06, DARK); dot(w, x, 3.5, z + 1, 0xfff2c0, 0.16);
    bar(w, [x, 0.15, z - 3], [x + s * 2.6, 0.75, z - 4], 0.04, 0xd8cfae); bar(w, [x, 0.15, z + 3], [x + s * 2.6, 0.75, z + 4], 0.04, 0xd8cfae);
  }
}

// ── 중앙 광장 바닥 표시: 대기 차로 칸, 드론 이착륙 표시 (모두 칠, 충돌 없음) ──
function plaza(w) {
  const WH = 0xdcdcd6;
  for (let i = 0; i <= 8; i++) { line(w, -18 + i * 4.25, 36, -18 + i * 4.25, 72, WH, 0.12); if (i < 8) flat(w, -15.9 + i * 4.25, 74, 2.6, 1.6, CC[i % CC.length], { y: 0.03 }); }
  line(w, -18, 36, 16, 36, WH, 0.12);
  for (const R of [6.5, 9]) ring(w, 0, 0.03, 130, R, 0.1, WH, { col: false, mat: "paint", seg: 40, sides: 4 });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; flat(w, Math.cos(a) * 7.75, 130 + Math.sin(a) * 7.75, 2, 0.3, 0xd8b23a, { ry: -a / DEG }); }
}

// ── 원경: 능선, 이웃 도시의 불 켜진 건물, 옆 부두의 크레인, 송전탑, 바다의 배와 풍력 발전기 ──
function backdrop(w, K) {
  const r = w.rand;
  // 육지 쪽 능선(안개 속 보랏빛)
  for (let i = 0; i < 26; i++) {
    const a = -0.25 + (i / 25) * (Math.PI + 0.5), d = 860 + r() * 300;
    w.blob(Math.cos(a) * d, -8, Math.abs(Math.sin(a)) * d * 0.9 + 80 + (Math.sin(a) < 0 ? 120 : 0), 150 + r() * 140, 34 + r() * 50, 110 + r() * 90, [0x6d6280, 0x7a6a86, 0x5f5a78][i % 3], { col: false, grad: [0.8, 1.04] });
  }
  for (const [x, z, s] of [[-880, -420, 170], [900, -360, 190], [-1050, -700, 200]]) for (let i = 0; i < 4; i++) w.blob(x + (r() - 0.5) * s * 2, -5, z + (r() - 0.5) * s, s * (0.6 + r() * 0.5), s * (0.12 + r() * 0.12), s * (0.5 + r() * 0.4), 0x566270, { col: false, grad: [0.75, 1.04] });
  // 이웃 도시 윤곽: 창에 불이 켜진 건물 무리
  for (const [cx, cz, n] of [[430, 520, 16], [-470, 500, 14], [60, 640, 12]]) for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * 260, z = cz + (r() - 0.5) * 120, h = 30 + r() * r() * 90, sx = 16 + r() * 18;
    w.box(x, 0, z, sx, h, 14 + r() * 16, [0x5d6478, 0x6c6880, 0x55607a][i % 3], { col: false, mat: "lit:facadelit", tile: 24, ao: false });
    if (h > 80) K.blink.push([x, h + 1.2, z, 1.4, 0]);
  }
  // 옆 부두의 컨테이너 크레인 윤곽(서쪽 해안)
  for (let k = 0; k < 4; k++) {
    const x = -470 - k * 46, z = -40 - k * 14, C = 0x5a6a80;
    for (const dx of [-8, 8]) for (const dz of [-6, 6]) bar(w, [x + dx, 0, z + dz], [x + dx, 40, z + dz], 1.6, C);
    for (const dz of [-6, 6]) bar(w, [x - 8, 40, z + dz], [x + 8, 40, z + dz], 1.4, C);
    bar(w, [x, 41, z + 20], [x, 41, z - 62], 3, C); bar(w, [x, 42, z], [x, 60, z], 1.2, C); bar(w, [x, 60, z], [x, 42.5, z - 58], 0.5, C); bar(w, [x, 60, z], [x, 42.5, z + 18], 0.5, C);
    K.blink.push([x, 61, z, 1.2, 0]);
  }
  w.box(-560, -2, -70, 260, 2.4, 110, 0x7c7a80, { col: false });
  for (let i = 0; i < 14; i++) w.box(-460 - (i % 7) * 26, 0.4, -20 + Math.floor(i / 7) * 16, 22, 5 + ((i * 7) % 3) * 2.6, 9, CC[(i * 3) % CC.length], { col: false, mat: "std:corrug", tile: 3 });
  // 송전탑 줄(남동쪽으로 멀어진다)
  let prev = null;
  for (let k = 0; k < 6; k++) {
    const x = 330 + k * 86, z = 300 + k * 58, h = 44;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bar(w, [x + a * 5, 0, z + b * 5], [x + a * 0.8, h, z + b * 0.8], 0.5, 0x6a7080);
    for (const y of [30, 37, 43]) bar(w, [x - 9 + (y - 30) * 0.3, y, z], [x + 9 - (y - 30) * 0.3, y, z], 0.4, 0x6a7080);
    for (const y of [14, 26]) { const e = 5 - (y / h) * 4.2; bar(w, [x - e, y, z - e], [x + e, y, z + e], 0.3, 0x6a7080); bar(w, [x + e, y, z - e], [x - e, y, z + e], 0.3, 0x6a7080); }
    if (prev) for (const s of [-8.6, 8.6]) { const mx = (prev[0] + x) / 2, mz = (prev[1] + z) / 2; bar(w, [prev[0] + s, 30, prev[1]], [mx + s, 24, mz], 0.12, 0x3a3f4a); bar(w, [mx + s, 24, mz], [x + s, 30, z], 0.12, 0x3a3f4a); }
    K.blink.push([x, h + 0.8, z, 0.9, 0]); prev = [x, z];
  }
  // 정박한 배들(먼 바다)
  for (const [x, z, L, c, ry] of [[-300, -560, 130, 0x2a3442, 8], [200, -660, 170, 0x3a2f38, -6], [560, -480, 110, 0x26403c, 14]]) {
    const F = frame(w, x, z, ry), nc = { col: false };
    F.box(0, -2, 0, L, 8, 20, c, { ...nc, mat: "paint" }); F.box(0, -1.6, 0, L + 0.2, 1.2, 20.2, 0x8a2f26, nc); F.box(-L / 2 + 12, 6, 0, 14, 16, 18, 0xe9e7e0, nc); F.cyl(-L / 2 + 8, 22, 0, 2.6, 7, 0xd9772f, nc);
    for (let i = 0; i < 6; i++) F.box(-L / 2 + 34 + i * (L - 50) / 6, 6, 0, (L - 50) / 6 - 1.5, 5 + ((i * 5) % 3) * 2.6, 17, CC[(i * 3 + (x > 0 ? 1 : 0)) % CC.length], { ...nc, mat: "std:corrug", tile: 3 });
    for (const u of [-L / 2 + 6, -L / 2 + 14, L / 2 - 4]) F.box(u, 23, 0, 0.9, 0.9, 0.9, 0xfff0b0, { mat: "glow", col: false });
    for (let i = 0; i < 5; i++) F.box(-L / 2 + 19.1, 9 + (i % 3) * 3.6, -6 + i * 3, 0.1, 1, 1.4, 0xffe2a8, { mat: "glow", col: false });
  }
  // 수평선을 천천히 지나는 컨테이너선
  const sp = [[BOXG, M(0, 2, 0, 150, 9, 22), 0x1f2a36], [BOXG, M(0, -1.6, 0, 150.2, 1.4, 22.2), 0x8a2f26], [BOXG, M(-56, 16, 0, 14, 20, 20), 0xe9e7e0], [BOXG, M(-62, 29, 0, 4, 7, 4), 0x2f6fb0], [BOXG, M(-48.9, 20, 0, 0.2, 1.2, 14), 0xffe9a8]];
  for (let i = 0; i < 8; i++) sp.push([BOXG, M(-36 + i * 13.5, 9.5 + ((i * 5) % 3) * 1.3, 0, 12.4, 6 + ((i * 5) % 3) * 2.6, 19), CC[(i * 3) % CC.length]]);
  const far = new THREE.Mesh(merged(sp), w.material("paint")); far.frustumCulled = false; w.scene.add(far);
  w.updaters.push((dt, t) => far.position.set(((t * 3.2 + 700) % 2200) - 1100, 0, -800));
  // 해상 풍력 발전기(날개가 돈다)
  for (const [x, z] of TURB) { w.cyl(x, -2, z, 2.6, 78, 0xe9e7e0, { col: false, rt: 1.5, mat: "paint" }); w.box(x, 75, z + 1, 4, 3.6, 9, 0xe9e7e0, { col: false, mat: "paint" }); w.cyl(x, -2, z, 4.4, 5, 0xd8b23a, { col: false, mat: "paint" }); K.blink.push([x, 79.4, z, 1.1, 0]); }
}
const TURB = [[380, -660], [480, -720], [590, -650], [700, -730], [-640, -820], [-760, -760]];

// 갈매기 떼와 풍력 날개 (움직이는 요소)
function wildlife(w) {
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
  const Zax = new THREE.Vector3(0, 0, 1);
  // 풍력 날개
  const bl = [];
  for (let k = 0; k < 3; k++) bl.push([BOXG, M(Math.sin(k * 2.094) * 19, Math.cos(k * 2.094) * 19, 0, 2.6, 38, 0.5, 0, 0, -k * 120), 0xf2f0ea]);
  bl.push([BOXG, M(0, 0, 0, 3.4, 3.4, 2.4), 0xd9dde2]);
  const rot = new THREE.InstancedMesh(merged(bl), w.material("paint"), TURB.length); rot.frustumCulled = false; w.scene.add(rot);
  w.updaters.push((dt, t) => { TURB.forEach((p, i) => { _m.compose(_p.set(p[0], 76.8, p[1] + 6), _q.setFromAxisAngle(Zax, t * (0.5 + (i % 3) * 0.08) + i * 1.1), _s); rot.setMatrixAt(i, _m); }); rot.instanceMatrix.needsUpdate = true; });
  // 갈매기: [중심 x, 고도, 중심 z, 반경, 마리 수]
  const flocks = [[-150, 21, -152, 26, 4], [-104, 44, -270, 22, 3], [30, 30, -214, 44, 4], [214, 27, -196, 28, 3], [-20, 58, -150, 60, 3]], G = [];
  for (const [cx, y, cz, R, n] of flocks) for (let i = 0; i < n; i++) G.push({ cx, y: y + i * 2.4, cz, R: R * (0.7 + 0.3 * ((i * 7) % 5) / 4), ph: i * (6.283 / n) + cx, sp: (5.5 + (i % 3)) * (i % 2 ? 1 : -1) });
  const wg = new THREE.BoxGeometry(1.25, 0.05, 0.42); wg.translate(0.62, 0, 0);
  const mk = (g, c) => { const im = new THREE.InstancedMesh(merged([[g, null, c]]), w.material("paint"), G.length); im.frustumCulled = false; w.scene.add(im); return im; };
  const body = mk(new THREE.BoxGeometry(0.24, 0.2, 0.9), 0xf4f4f0), wl = mk(wg, 0xe2e4e8), wr = mk(wg, 0xe2e4e8);
  G.forEach((g, i) => w.rider([body, i], [[0, 0, 0, 0.7, 0.2, 0.5]]));
  w.updaters.push((dt, t) => {
    for (let i = 0; i < G.length; i++) {
      const g = G[i], a = g.ph + (t * g.sp) / g.R, rr = g.R * (1 + 0.15 * Math.sin(t * 0.17 + g.ph * 2));
      _p.set(g.cx + Math.cos(a) * rr, g.y + Math.sin(t * 0.3 + g.ph) * 3, g.cz + Math.sin(a) * rr);
      _q.setFromEuler(_e.set(0, -a + (g.sp > 0 ? Math.PI : 0), (g.sp > 0 ? -1 : 1) * 0.3, "YXZ"));
      body.setMatrixAt(i, _m.compose(_p, _q, _s));
      const cyc = (t * 0.35 + g.ph) % 1, flap = cyc < 0.4 ? Math.sin((cyc / 0.4) * Math.PI * 6) * 0.6 : 0.14;
      wl.setMatrixAt(i, _m.compose(_p, _q2.copy(_q).multiply(_s2.setFromAxisAngle(Zax, flap)), _s));
      wr.setMatrixAt(i, _m.compose(_p, _q2.copy(_q).multiply(_s2.setFromEuler(_e.set(0, Math.PI, flap, "YXZ"))), _s));
    }
    body.instanceMatrix.needsUpdate = wl.instanceMatrix.needsUpdate = wr.instanceMatrix.needsUpdate = true;
  });
}
const _s2 = new THREE.Quaternion();

// ── 깜박이는 경광등·회전체 등 움직이는 요소 마무리 ──
function finishLife(w, K) {
  const glow = w.env.glow ?? 2.4;
  // 경광등: 0 = 느린 적색 점멸(항공 장애등), 1 = 빠른 황색 점멸(작업 경광등)
  for (const g of [0, 1]) {
    const list = K.blink.filter((b) => b[4] === g);
    if (!list.length) continue;
    const mesh = new THREE.Mesh(merged(list.map(([x, y, z, s]) => [BOXG, M(x, y, z, s, s, s), g ? 0xffb020 : 0xff3030])), new THREE.MeshBasicMaterial({ vertexColors: true }));
    mesh.frustumCulled = false; w.scene.add(mesh);
    w.updaters.push((dt, t) => { const k = g ? (Math.sin(t * 7) > 0.2 ? 1 : 0.12) : 0.25 + 0.75 * Math.max(0, Math.sin(t * 2.2)) ** 4; mesh.material.color.setScalar(glow * k); });
  }
  // 용접 불꽃: 제각기 불규칙하게 번쩍인다
  if (K.sparks.length) {
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.8, 4) });
    const sg = merged([[BOXG, M(0, 0, 0, 0.9, 0.12, 0.12), 0xffffff], [BOXG, M(0, 0, 0, 0.12, 0.9, 0.12), 0xffffff], [BOXG, M(0, 0, 0, 0.12, 0.12, 0.9), 0xffffff], [BOXG, M(0, 0, 0, 0.36, 0.36, 0.36), 0xffffff]]);
    const sp = K.sparks.map((p) => { const m = new THREE.Mesh(sg, sm); m.position.set(p[0], p[1], p[2]); w.scene.add(m); return m; });
    w.updaters.push((dt, t) => sp.forEach((m, i) => { const on = Math.sin(t * 0.7 + i * 2.1) > -0.2 && Math.sin(t * 31 + i * 5) * Math.sin(t * 47.3 + i) > 0.1; m.visible = on; if (on) { m.rotation.set(t * 9 + i, t * 13, 0); m.scale.setScalar(0.6 + 0.6 * Math.abs(Math.sin(t * 61 + i))); } }));
  }
  // 회전체: 지붕 환기 터빈, 배의 레이더
  const im = (geo, mat, list) => { const m = new THREE.InstancedMesh(geo, mat, list.length); m.frustumCulled = false; w.scene.add(m); return m; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  if (K.vents.length) {
    const parts = [[new THREE.CylinderGeometry(0.42, 0.5, 0.5, 8), M(0, 0.25, 0), 0x8a8f99], [new THREE.SphereGeometry(0.62, 8, 5), M(0, 0.95, 0, 1, 0.8, 1), 0xcfd3d8]];
    for (let i = 0; i < 8; i++) parts.push([BOXG, M(Math.cos(i * 0.785) * 0.6, 0.95, Math.sin(i * 0.785) * 0.6, 0.06, 0.8, 0.3, 0, -i * 45 + 30, 0), 0x6b727c]);
    const v = im(merged(parts), w.material("metal"), K.vents);
    w.updaters.push((dt, t) => { K.vents.forEach((p, i) => { _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromAxisAngle(UP, t * (2.2 + (i % 3) * 0.7) + i), _s.set(1, 1, 1)); v.setMatrixAt(i, _m); }); v.instanceMatrix.needsUpdate = true; });
  }
  if (K.radars.length) {
    const rd = im(merged([[BOXG, M(0, 0, 0, 1, 0.16, 0.12), 0xf2f0ea], [BOXG, M(0, -0.25, 0, 0.1, 0.4, 0.1), 0x8a8f99]]), w.material("paint"), K.radars);
    w.updaters.push((dt, t) => { K.radars.forEach((p, i) => { _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromAxisAngle(UP, t * 2.6 + i * 1.3), _s.set(p[3], 1, 1)); rd.setMatrixAt(i, _m); }); rd.instanceMatrix.needsUpdate = true; });
  }
  // 깃발: 한 메시의 정점을 흔든다. [x, y(위), z, 폭, 높이, 색]
  if (K.flags.length) {
    const NX = 6, pos = [], col = [], idx = [], c = new THREE.Color(), base = [];
    K.flags.forEach(([x, y, z, fw, fh, color], f) => {
      const dx = Math.sin(WIND * DEG), dz = Math.cos(WIND * DEG), o = f * (NX + 1) * 2;
      for (let i = 0; i <= NX; i++) for (let j = 0; j < 2; j++) {
        const u = i / NX; pos.push(x + dx * u * fw, y - j * fh, z + dz * u * fw); base.push(x + dx * u * fw, y - j * fh, z + dz * u * fw, u, -dz, dx, f);
        c.set(color).multiplyScalar(i % 2 ? 1 : 0.9); col.push(c.r, c.g, c.b);
      }
      for (let i = 0; i < NX; i++) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.frustumCulled = false; w.scene.add(mesh);
    const P = g.attributes.position;
    w.updaters.push((dt, t) => {
      for (let i = 0, n = base.length / 7; i < n; i++) {
        const b = i * 7, u = base[b + 3], k = Math.sin(t * 5.2 - u * 6 + base[b + 6] * 1.7) * 0.34 * u;
        P.setXYZ(i, base[b] + base[b + 4] * k, base[b + 1] + Math.sin(t * 3.1 - u * 4) * 0.08 * u - u * u * 0.25, base[b + 2] + base[b + 5] * k);
      }
      P.needsUpdate = true;
    });
  }
}

export function detail(w) {
  const K = { ok: keepOut(w), signs: new Signs(w, SIGNS, 0.62), blink: [], vents: [], radars: [], flags: [], sparks: [] };
  ground(w, K);
  warehouse(w, K);
  quay(w, K);
  quayCranes(w, K);
  yard(w, K);
  tanks(w, K);
  shipyard(w, K);
  fishMarket(w, K);
  railYard(w, K);
  site(w, K);
  yardBuildings(w, K);
  refineryDetail(w, K);
  bridgeDetail(w, K);
  plaza(w);
  backdrop(w, K);
  wildlife(w);
  K.signs.finish(0);
  finishLife(w, K);
}
