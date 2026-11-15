// 바르가 — 에이아 제국 지상군단장. 뿔 투구와 붉은 바이저 슬릿, 거대한 견갑, 왼팔의 대구경 캐논,
// 망토형 장갑 스커트. 표정은 바이저 모양·밝기와 증기 배출로만 바뀐다.
export const ID = "varga", NAME = "바르가";

const P = "varga-";
const INK = "#1a1626";
const f = (n) => Math.round(n * 10) / 10;
const MIR = `transform="matrix(-1 0 0 1 1200 0)"`;
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const line = (d, col, w, op = 1, extra = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const shape = (d, fill, sw = 4.5, extra = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
const red = (d, w = 3, k = 1) => line(d, "#ff2d3d", w * 5, 0.1 * k) + line(d, "#ff2d3d", w * 2.2, 0.28 * k) + line(d, "#ff4a58", w, 1) + line(d, "#ffd0c8", w * 0.35, 0.9);
const rivet = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8a92a0" stroke="${INK}" stroke-width="2"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#e8eef6"/>`;
function scratch(x, y, len, ang, n = 3) {
  let o = "";
  const a = ang * Math.PI / 180, dx = Math.cos(a) * len, dy = Math.sin(a) * len;
  for (let i = 0; i < n; i++) {
    const ox = x + i * 7 * Math.sin(a), oy = y - i * 7 * Math.cos(a), l = 1 - i * 0.18;
    o += line(`M${f(ox)} ${f(oy)} l${f(dx * l)} ${f(dy * l)}`, "#16181e", 3, 0.75);
    o += line(`M${f(ox + 1.5)} ${f(oy + 1.5)} l${f(dx * l)} ${f(dy * l)}`, "#c8d0dc", 1.4, 0.8);
  }
  return o;
}
const dent = (x, y, r = 7) => `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="#8a92a0" opacity="0.6"/><circle cx="${x}" cy="${y}" r="${r}" fill="#16181e"/><circle cx="${x + 1}" cy="${y + 1}" r="${r * 0.45}" fill="#ff6a3a" opacity="0.6"/>`;

// 표정
const EX = {
  normal: { steam: 1, vis: 1 },
  smile: { steam: 0.8, vis: 1 },
  angry: { steam: 2.2, vis: 1.4 },
  sad: { steam: 0.35, vis: 0.5 },
  surprise: { steam: 1.6, vis: 1.15 },
  serious: { steam: 0.6, vis: 0.9 },
};

function steam(x, y, k, dir, seed) {
  if (k <= 0) return "";
  const R = rng(seed);
  let o = "";
  const n = Math.round(6 * k);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const px = x + dir * (t * 120 * k + (R() - 0.5) * 30), py = y - t * 160 * k - R() * 20;
    const r = 16 + t * 40 * Math.min(k, 1.6) + R() * 10;
    o += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(r)}" fill="#e8eef6" opacity="${f(0.32 * (1 - t * 0.7))}"/>`;
    o += `<circle cx="${f(px - r * 0.3)}" cy="${f(py - r * 0.3)}" r="${f(r * 0.55)}" fill="#ffffff" opacity="${f(0.3 * (1 - t * 0.7))}"/>`;
  }
  return o;
}

// ── 부품 경로 ──
const CAPE = "M470 980 C430 1200 360 1600 300 2000 L340 1980 L330 2080 L400 2020 L420 2140 L470 2060 L520 2180 L560 2080 L600 2200 L640 2080 L690 2170 L730 2060 L780 2140 L800 2020 L870 2080 L860 1980 L900 2000 C840 1600 770 1200 730 980Z";
const HELM = "M600 150 C662 150 704 190 712 252 L720 322 L684 372 L600 396 L516 372 L480 322 L488 252 C496 190 538 150 600 150Z";
const HORN = "M508 214 C452 206 404 168 384 80 C374 130 382 176 420 214 C446 238 480 248 512 250Z";
const HORN2 = "M492 270 C452 276 420 262 396 230 C404 266 428 292 470 302Z";
const BROW = "M484 244 L600 222 L716 244 L706 296 L600 280 L494 296Z";
const FACE = "M524 296 L676 296 L668 356 L600 384 L532 356Z";
const COLLAR = "M466 352 L734 352 L782 432 L600 478 L418 432Z";
const TORSO = "M428 420 C398 520 406 700 456 860 L498 966 L702 966 L744 860 C794 700 802 520 772 420 L600 452Z";
const PEC = "M440 444 L588 476 L584 646 C520 668 462 650 440 606 C430 560 432 500 440 444Z";
const PAULD1 = "M476 396 C380 352 266 372 214 464 C192 526 202 600 236 652 L294 624 L316 690 L382 604 C424 560 454 518 476 478Z";
const PAULD2 = "M470 450 C390 420 290 440 248 520 C232 560 236 610 256 646 L300 622 L320 680 L376 606 C412 570 446 530 470 500Z";
const PAULD3 = "M460 520 C400 500 330 516 296 570 C284 600 290 640 306 666 L330 652 L344 692 L380 630 C410 604 440 576 456 556Z";
const SPIKE = "M300 400 L262 296 L330 384Z M360 380 L344 300 L388 374Z";
const BELT = "M462 952 L738 952 L748 1034 L600 1064 L452 1034Z";
const TASSET = "M474 1010 L592 1048 L576 1430 L508 1460 L424 1388Z";
const FLAP = "M556 1046 L644 1046 L636 1520 L600 1566 L564 1520Z";
const THIGH = "M466 1100 L590 1110 L582 1520 L452 1536 L440 1260Z";
const KNEE = "M432 1520 L590 1508 L604 1600 L560 1660 L460 1666 L420 1600Z";
const SHIN = "M436 1640 L592 1636 L604 2000 L586 2210 L440 2224 L420 2000Z";
const BOOT = "M402 2196 L612 2190 L646 2300 L656 2396 L350 2396 L366 2300Z";
// 오른팔(주먹)
const R_UP = "M820 620 L952 640 L962 900 L840 912Z";
const R_ELB = "M834 880 L970 876 L986 950 L900 990 L822 950Z";
const R_FORE = "M826 940 L990 930 L1000 1180 L848 1200Z";
const R_FIST = "M842 1180 L1004 1170 C1020 1210 1020 1280 1004 1330 C960 1352 890 1352 852 1330 C834 1290 832 1230 842 1180Z";
// 왼팔(캐논)
const L_UP = "M248 620 L380 640 L370 900 L246 912Z";
const L_ELB = "M232 880 L386 884 L396 954 L310 994 L222 952Z";
const CANNON = "M214 930 L404 944 L414 1200 L378 1274 L382 1340 L216 1340 L222 1274 L192 1200Z";

function head(x) {
  let o = "";
  // 뿔
  for (const g of ["", MIR]) {
    o += `<g ${g}>` + shape(HORN, `url(#${P}horn)`, 4.5) + shape(HORN2, `url(#${P}horn)`, 4);
    o += `<path d="M508 222 C458 214 414 178 392 108 C404 160 436 196 480 214Z" fill="#ffffff" opacity="0.35"/>`;
    for (let i = 0; i < 4; i++) o += line(`M${430 - i * 10} ${206 - i * 26} l${22 + i * 3} ${10 + i * 2}`, INK, 2.5, 0.7);
    o += `</g>`;
  }
  o += shape(HELM, `url(#${P}metal)`, 5);
  // 볏(중앙 능선)
  o += shape("M600 132 L622 160 L616 240 L600 250 L584 240 L578 160Z", `url(#${P}metalD)`, 4);
  o += red("M600 150 L600 236", 1.6);
  o += `<path d="M512 250 C510 200 540 168 584 160 L586 176 C548 186 526 214 524 252Z" fill="#ffffff" opacity="0.55"/>`;
  o += line("M704 260 L712 320 L680 364", "#ff6a74", 2, 0.6);
  // 눈썹 장갑 + 바이저
  o += shape(BROW, `url(#${P}metalD)`, 4.5);
  o += shape("M500 262 L600 250 L700 262 L694 288 L600 278 L506 288Z", "#0b0a0e", 3);
  // 바이저 광선 — 표정
  const v = x.vis;
  let vis;
  switch (x) {
    case EX.angry: vis = "M508 262 L586 282 L600 290 L614 282 L692 262 L690 276 L612 296 L600 300 L588 296 L510 276Z"; break;
    case EX.sad: vis = "M512 284 L586 270 L600 268 L614 270 L688 284 L686 290 L600 280 L514 290Z"; break;
    case EX.surprise: vis = "M510 258 L600 248 L690 258 L692 292 L600 286 L508 292Z"; break;
    case EX.smile: vis = "M508 268 Q600 292 692 268 L690 280 Q600 302 510 280Z"; break;
    case EX.serious: vis = "M512 272 L688 272 L686 278 L514 278Z"; break;
    default: vis = "M510 266 L600 260 L690 266 L688 282 L600 276 L512 282Z";
  }
  o += `<ellipse cx="600" cy="272" rx="${f(150 * Math.min(v, 1.3))}" ry="${f(40 * v)}" fill="url(#${P}visGlow)" opacity="${f(Math.min(1, v))}"/>`;
  o += `<path d="${vis}" fill="#ff2d3d" stroke="#ff2d3d" stroke-width="${f(10 * v)}" stroke-opacity="${f(0.2 * v)}" opacity="${f(Math.min(1, 0.4 + v * 0.6))}"/>`;
  o += `<path d="${vis}" fill="url(#${P}vis)" opacity="${f(Math.min(1, 0.4 + v * 0.6))}"/>`;
  if (x === EX.surprise) {
    // 놀람: 바이저 안에서 확대되는 표적 렌즈 둘
    for (const cx of [550, 650]) o += `<circle cx="${cx}" cy="270" r="12" fill="none" stroke="#ffe0d8" stroke-width="2.5"/><circle cx="${cx}" cy="270" r="4" fill="#ffffff"/>`;
  } else if (x !== EX.sad) {
    o += line(x === EX.smile ? "M540 282 Q600 296 660 282" : x === EX.angry ? "M540 280 L590 292 M660 280 L610 292" : "M540 270 L660 270", "#fff0ea", 2.4, 0.95);
  }
  if (x === EX.angry) {
    o += red("M494 300 L470 316 M706 300 L730 316", 2, 1.4);
    o += line("M520 236 L560 250 M680 236 L640 250", "#ff6a74", 3, 0.9);
  }
  // 안면 장갑 + 배기 슬롯
  o += shape(FACE, `url(#${P}metal)`, 4.5);
  for (let i = 0; i < 5; i++) {
    const xx = 560 + i * 20;
    o += `<rect x="${xx - 5}" y="${312 + Math.abs(i - 2) * 2}" width="10" height="${40 - Math.abs(i - 2) * 8}" rx="3" fill="#0b0a0e" stroke="${INK}" stroke-width="1.5"/>`;
    const glowOp = x === EX.angry ? 0.95 : x === EX.smile ? 0.75 : x === EX.sad ? 0.1 : 0.35;
    o += `<rect x="${xx - 3}" y="${330}" width="6" height="${16 - Math.abs(i - 2) * 4}" rx="2" fill="#ff4a58" opacity="${glowOp}"/>`;
  }
  o += `<path d="M532 300 L590 300 L586 314 L540 312Z" fill="#ffffff" opacity="0.5"/>`;
  // 턱 측면 엄니
  o += shape("M532 356 L516 396 L552 372Z M668 356 L684 396 L648 372Z", `url(#${P}horn)`, 3);
  o += scratch(650, 190, 40, 120, 3);
  return o;
}

function pauldron(right) {
  let o = "";
  o += shape(SPIKE, `url(#${P}horn)`, 4);
  o += shape(PAULD1, `url(#${P}metal)`, 5);
  o += `<path d="M470 410 C380 370 280 386 230 470 C224 486 220 500 218 514 C250 430 360 396 466 426Z" fill="#ffffff" opacity="0.45"/>`;
  o += shape(PAULD2, `url(#${P}metalD)`, 4.5);
  o += red("M256 520 C300 456 380 440 460 464", 2);
  o += shape(PAULD3, `url(#${P}metal)`, 4);
  o += `<path d="M454 530 C400 512 336 526 304 570 C330 540 394 528 450 546Z" fill="#ffffff" opacity="0.5"/>`;
  for (const [x, y] of [[250, 600], [290, 520], [350, 470], [420, 450], [320, 610], [380, 560]]) o += rivet(x, y, 6);
  // 증기 배출구
  o += shape("M380 392 L440 400 L436 430 L376 422Z", "#16181e", 3);
  for (let i = 0; i < 3; i++) o += line(`M${384 + i * 18} 400 L${382 + i * 18} 420`, right ? "#ff4a58" : "#ff4a58", 3, 0.8);
  o += scratch(270, 560, 60, -30, 3) + dent(330, 500, 6);
  // 휘장(제국: 고리 + 세로 칼날)
  o += `<circle cx="300" cy="570" r="26" fill="#16181e" stroke="${INK}" stroke-width="3"/>`;
  o += `<circle cx="300" cy="570" r="18" fill="none" stroke="#ff2d3d" stroke-width="4"/><path d="M300 546 L306 570 L300 594 L294 570Z" fill="#ff4a58"/>`;
  return o;
}

function leg() {
  let o = "";
  o += shape(THIGH, `url(#${P}metalD)`, 4.5);
  o += shape("M470 1140 L584 1150 L578 1420 L460 1440Z", `url(#${P}metal)`, 4);
  o += `<path d="M474 1146 L520 1150 L506 1430 L462 1436Z" fill="#ffffff" opacity="0.3"/>`;
  for (let i = 0; i < 4; i++) o += line(`M${466 + i} ${1200 + i * 60} L${580 - i} ${1206 + i * 60}`, INK, 2.5, 0.8);
  o += shape(SHIN, `url(#${P}metal)`, 5);
  o += `<path d="M444 1650 L506 1648 L490 2200 L446 2210 C432 2010 434 1820 444 1650Z" fill="#ffffff" opacity="0.28"/>`;
  o += shape("M470 1700 L566 1700 L572 1980 L520 2040 L466 1980Z", `url(#${P}metalD)`, 3.5);
  o += red("M518 1720 L518 1990", 2.2);
  for (let i = 0; i < 3; i++) o += `<rect x="${480}" y="${1760 + i * 70}" width="18" height="30" rx="3" fill="#0b0a0e"/><rect x="${540}" y="${1760 + i * 70}" width="18" height="30" rx="3" fill="#0b0a0e"/>`;
  o += shape(KNEE, `url(#${P}metal)`, 5);
  o += shape("M478 1540 L512 1470 L548 1540 L516 1600Z", `url(#${P}horn)`, 3.5);
  o += `<path d="M440 1530 L560 1520 L570 1540 L446 1552Z" fill="#ffffff" opacity="0.45"/>`;
  o += rivet(450, 1620) + rivet(578, 1612);
  o += shape(BOOT, `url(#${P}metalD)`, 5);
  o += shape("M380 2290 L630 2286 L652 2396 L354 2396Z", `url(#${P}metal)`, 4);
  for (const xx of [400, 460, 520, 580]) o += line(`M${xx} 2300 L${xx - 6} 2390`, INK, 3, 0.85);
  o += `<path d="M386 2296 L470 2294 L462 2320 L380 2322Z" fill="#ffffff" opacity="0.5"/>`;
  o += red("M412 2240 L600 2236", 2);
  o += scratch(560, 1880, 50, 100, 3) + dent(470, 2100, 6) + scratch(500, 1300, 40, 20, 2);
  return o;
}

function cannon(x) {
  let o = "";
  // 탄띠/급탄 케이블
  o += line("M300 700 C180 760 160 900 214 1000", INK, 26) + line("M300 700 C180 760 160 900 214 1000", `url(#${P}metalD)`, 18);
  for (let i = 0; i < 9; i++) { const t = i / 8; const px = 300 * (1 - t) ** 3 + 3 * 180 * (1 - t) ** 2 * t + 3 * 160 * (1 - t) * t * t + 214 * t ** 3, py = 700 * (1 - t) ** 3 + 3 * 760 * (1 - t) ** 2 * t + 3 * 900 * (1 - t) * t * t + 1000 * t ** 3; o += `<rect x="${f(px - 12)}" y="${f(py - 5)}" width="24" height="10" rx="2" fill="#c8a040" stroke="${INK}" stroke-width="2"/>`; }
  o += shape(L_UP, `url(#${P}metalD)`, 4.5);
  for (let i = 0; i < 4; i++) o += line(`M${252 - i} ${680 + i * 50} L${376 - i * 2} ${690 + i * 50}`, INK, 2.5, 0.8);
  o += shape(L_ELB, `url(#${P}metal)`, 4.5) + rivet(256, 920) + rivet(360, 924);
  o += shape(CANNON, `url(#${P}metal)`, 5);
  o += `<path d="M222 944 L270 948 L262 1270 L224 1272 L200 1200Z" fill="#ffffff" opacity="0.3"/>`;
  // 측면 방열 슬릿
  for (let i = 0; i < 6; i++) {
    o += `<rect x="330" y="${990 + i * 30}" width="56" height="14" rx="4" fill="#0b0a0e" stroke="${INK}" stroke-width="2"/>`;
    o += `<rect x="336" y="${994 + i * 30}" width="44" height="6" rx="3" fill="#ff4a58" opacity="${f(0.45 + i * 0.08)}"/>`;
  }
  o += red("M230 1200 L400 1210", 2.2);
  o += shape("M240 960 L320 966 L314 1160 L246 1160Z", `url(#${P}metalD)`, 3.5);
  o += `<circle cx="280" cy="1060" r="26" fill="#16181e" stroke="${INK}" stroke-width="3"/><circle cx="280" cy="1060" r="16" fill="url(#${P}core)"/>`;
  // 포신 셋
  for (const [bx, w] of [[236, 46], [282, 50], [332, 46]]) {
    o += shape(`M${bx} 1330 L${bx + w} 1330 L${bx + w - 2} 1560 L${bx + 2} 1560Z`, `url(#${P}barrel)`, 4);
    for (const yy of [1380, 1460, 1530]) o += `<rect x="${bx - 4}" y="${yy}" width="${w + 8}" height="16" rx="3" fill="url(#${P}metalD)" stroke="${INK}" stroke-width="3"/>`;
    o += `<ellipse cx="${bx + w / 2}" cy="1562" rx="${w / 2 + 2}" ry="9" fill="#0b0a0e" stroke="${INK}" stroke-width="3"/>`;
    o += `<ellipse cx="${bx + w / 2}" cy="1563" rx="${w / 2 - 8}" ry="5" fill="#ff4a58" opacity="${f(Math.min(1, 0.5 + x.vis * 0.4))}"/>`;
  }
  o += `<ellipse cx="306" cy="1580" rx="130" ry="50" fill="url(#${P}visGlow)" opacity="${f(Math.min(1, 0.5 * x.vis))}"/>`;
  o += scratch(240, 1100, 70, 80, 3) + dent(370, 1250, 7) + dent(250, 1240, 5);
  return o;
}

function rightArm() {
  let o = "";
  o += shape(R_UP, `url(#${P}metalD)`, 4.5);
  for (let i = 0; i < 4; i++) o += line(`M${824 + i} ${680 + i * 50} L${956 - i} ${690 + i * 50}`, INK, 2.5, 0.8);
  o += shape(R_ELB, `url(#${P}metal)`, 4.5) + rivet(846, 920) + rivet(958, 914);
  o += shape(R_FORE, `url(#${P}metal)`, 5);
  o += `<path d="M834 950 L880 948 L890 1194 L852 1196Z" fill="#ffffff" opacity="0.3"/>`;
  o += shape("M984 960 L1040 990 L1000 1020Z M990 1050 L1046 1080 L1000 1110Z", `url(#${P}horn)`, 3.5);
  o += shape("M860 980 L970 972 L976 1130 L870 1140Z", `url(#${P}metalD)`, 3.5);
  o += red("M920 990 L924 1120", 2);
  o += shape(R_FIST, `url(#${P}metalD)`, 5);
  // 손가락 관절(주먹)
  for (let i = 0; i < 4; i++) {
    const xx = 856 + i * 36;
    o += shape(`M${xx} 1240 L${xx + 34} 1238 L${xx + 34} 1320 Q${xx + 17} 1334 ${xx} 1320Z`, `url(#${P}metal)`, 3.5);
    o += shape(`M${xx + 4} 1236 L${xx + 17} 1214 L${xx + 30} 1236Z`, `url(#${P}horn)`, 2.5);
    o += `<path d="M${xx + 4} 1246 L${xx + 14} 1246 L${xx + 12} 1310 L${xx + 4} 1306Z" fill="#ffffff" opacity="0.35"/>`;
  }
  o += shape("M846 1190 L900 1200 L910 1260 L856 1280 C840 1250 838 1220 846 1190Z", `url(#${P}metal)`, 3.5);
  o += scratch(900, 1040, 50, 70, 3);
  return o;
}

export function svg(expr = "normal") {
  const e = EX[expr] ? expr : "normal";
  const x = EX[e];
  const defs = `<defs>
<linearGradient id="${P}metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8b0bc"/><stop offset="0.28" stop-color="#6a7280"/><stop offset="0.5" stop-color="#3e434e"/><stop offset="0.62" stop-color="#5e6674"/><stop offset="0.75" stop-color="#3a3f4a"/><stop offset="1" stop-color="#22252c"/></linearGradient>
<linearGradient id="${P}metalD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a616e"/><stop offset="0.45" stop-color="#2e323b"/><stop offset="0.7" stop-color="#3c414c"/><stop offset="1" stop-color="#16181e"/></linearGradient>
<linearGradient id="${P}horn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8e0d6"/><stop offset="0.4" stop-color="#9a8f86"/><stop offset="1" stop-color="#3a302c"/></linearGradient>
<linearGradient id="${P}barrel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2e36"/><stop offset="0.3" stop-color="#9aa2ae"/><stop offset="0.5" stop-color="#4a505c"/><stop offset="1" stop-color="#16181e"/></linearGradient>
<linearGradient id="${P}vis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0c8"/><stop offset="0.5" stop-color="#ff4a58"/><stop offset="1" stop-color="#b0101e"/></linearGradient>
<linearGradient id="${P}cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a0e16"/><stop offset="0.6" stop-color="#3a0a10"/><stop offset="1" stop-color="#1e060a"/></linearGradient>
<radialGradient id="${P}visGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff2d3d" stop-opacity="0.6"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0"/></radialGradient>
<radialGradient id="${P}core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe8e0"/><stop offset="0.35" stop-color="#ff4a58"/><stop offset="1" stop-color="#7a0010"/></radialGradient>
<radialGradient id="${P}aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff2d3d" stop-opacity="0.22"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0"/></radialGradient>
</defs>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400">${defs}`;
  s += `<ellipse cx="600" cy="700" rx="560" ry="620" fill="url(#${P}aura)"/>`;
  // 망토(뒤)
  s += shape(CAPE, `url(#${P}cape)`, 4.5);
  s += line("M520 1040 C480 1400 430 1700 400 2010 M600 1040 L600 2180 M680 1040 C720 1400 770 1700 800 2010", "#200608", 4, 0.8);
  s += line("M500 1060 C470 1300 440 1500 420 1700", "#a02030", 3, 0.5);
  // 다리
  s += `<g>${leg()}</g><g ${MIR}>${leg()}</g>`;
  // 골반 + 장갑 스커트
  s += shape(BELT, `url(#${P}metalD)`, 5);
  s += `<g>${shape(TASSET, `url(#${P}metal)`, 5)}<path d="M480 1022 L540 1040 L500 1440 L432 1384Z" fill="#ffffff" opacity="0.25"/>${red("M488 1060 L446 1376", 2)}${rivet(500, 1060)}${rivet(560, 1076)}${scratch(520, 1200, 50, 100, 3)}</g>`;
  s += `<g ${MIR}>${shape(TASSET, `url(#${P}metal)`, 5)}${red("M488 1060 L446 1376", 2)}${rivet(500, 1060)}${rivet(560, 1076)}</g>`;
  s += line("M470 1150 L586 1180 M456 1280 L580 1306 M720 1150 L614 1180 M744 1280 L620 1306", INK, 3, 0.8);
  s += shape(FLAP, `url(#${P}metalD)`, 4.5);
  s += red("M600 1110 L600 1500", 2.4);
  s += `<circle cx="600" cy="1010" r="36" fill="#16181e" stroke="${INK}" stroke-width="4"/><circle cx="600" cy="1010" r="24" fill="none" stroke="#ff2d3d" stroke-width="5"/><path d="M600 978 L608 1010 L600 1042 L592 1010Z" fill="#ff4a58"/>`;
  // 몸통
  s += shape(TORSO, `url(#${P}metalD)`, 5);
  for (let i = 0; i < 4; i++) { const y = 700 + i * 64, hw = 150 - i * 12; s += shape(`M${600 - hw} ${y} L${600 + hw} ${y} L${600 + hw - 12} ${y + 56} L${600 - hw + 12} ${y + 56}Z`, `url(#${P}metal)`, 3.5) + `<path d="M${600 - hw + 4} ${y + 4} L${600 - hw + 50} ${y + 4} L${600 - hw + 44} ${y + 18} L${600 - hw + 8} ${y + 18}Z" fill="#ffffff" opacity="0.35"/>`; }
  s += `<g>${shape(PEC, `url(#${P}metal)`, 5)}<path d="M446 452 L540 474 L534 500 L450 486Z" fill="#ffffff" opacity="0.5"/></g><g ${MIR}>${shape(PEC, `url(#${P}metal)`, 5)}</g>`;
  s += scratch(470, 540, 80, 25, 3) + dent(690, 520, 8) + dent(660, 590, 5) + scratch(650, 760, 40, -20, 2);
  // 반응로 코어
  s += `<circle cx="600" cy="600" r="80" fill="url(#${P}visGlow)"/>`;
  s += shape("M600 548 L648 576 L648 632 L600 660 L552 632 L552 576Z", "#16181e", 4.5);
  s += `<circle cx="600" cy="604" r="34" fill="url(#${P}core)"/>`;
  for (let i = 0; i < 5; i++) s += line(`M${574 + i * 13} 584 L${574 + i * 13} 626`, "#16181e", 4, 0.85);
  s += red("M600 452 L600 548 M600 660 L600 700", 2);
  // 칼라
  s += shape(COLLAR, `url(#${P}metal)`, 5);
  s += `<path d="M472 360 L600 360 L600 380 L492 384Z" fill="#ffffff" opacity="0.4"/>`;
  s += red("M430 428 L600 470 L770 428", 2);
  // 팔
  s += rightArm();
  s += `<g>${pauldron(false)}</g><g ${MIR}>${pauldron(true)}</g>`;
  s += cannon(x);
  // 머리
  s += head(x);
  // 증기(표정)
  const k = x.steam;
  s += steam(410, 380, k, -1, 11) + steam(790, 380, k, 1, 12);
  if (x === EX.angry || x === EX.surprise) s += steam(470, 330, k * 0.6, -1, 13) + steam(730, 330, k * 0.6, 1, 14);
  if (x === EX.sad) s += steam(520, 400, 0.5, -0.3, 15);
  // 림 라이트
  s += line("M772 420 C802 520 794 700 744 860", "#ff6a74", 2.5, 0.6) + line("M984 470 C1000 530 994 600 964 652", "#ff6a74", 2.5, 0.6);
  s += `</svg>`;
  return s;
}
