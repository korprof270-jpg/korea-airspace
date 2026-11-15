// 에이아 — 기계제국 총괄지성. 얼굴 없는 도자기 가면과 붉은 단안, 등 뒤의 붉은 동심원 고리와 떠다니는 파편,
// 케이블 다발 "머리카락", 바닥까지 흐르는 판갑 드레스. 표정은 단안의 모양과 고리의 세기로만 바뀐다.
export const ID = "eia", NAME = "에이아";

const P = "eia-";
const f = (n) => Math.round(n * 10) / 10;
const INK = "#1a1626";
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MIR = `transform="matrix(-1 0 0 1 1200 0)"`;
const line = (d, col, w, op = 1, extra = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const shape = (d, fill, sw = 4, extra = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
function redGlow(d, w = 3, k = 1) {
  return line(d, "#ff2d3d", w * 6, 0.08 * k) + line(d, "#ff2d3d", w * 2.6, 0.22 * k) + line(d, "#ff6a74", w, 0.95) + line(d, "#ffe0e2", w * 0.35, 0.9);
}
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}

// 표정별 고리 세기·눈 모양
const EX = {
  normal: { ring: 1, w: 58, h: 18, ir: 17, eyeOp: 1, spread: 1 },
  smile: { ring: 1.1, w: 56, h: 14, ir: 15, eyeOp: 1, spread: 1 },
  angry: { ring: 1.7, w: 62, h: 12, ir: 13, eyeOp: 1, spread: 1.06 },
  sad: { ring: 0.45, w: 54, h: 12, ir: 14, eyeOp: 0.6, spread: 0.98 },
  surprise: { ring: 1.35, w: 50, h: 36, ir: 11, eyeOp: 1, spread: 1.08 },
  serious: { ring: 0.9, w: 60, h: 6, ir: 12, eyeOp: 1, spread: 1 },
};

const RC = [600, 300]; // 고리 중심

function rings(x) {
  const k = x.ring, [cx, cy] = RC;
  let o = `<circle cx="${cx}" cy="${cy}" r="560" fill="url(#${P}aura)" opacity="${Math.min(1, 0.55 + k * 0.35)}"/>`;
  const R = [[190, 3, "none", 0.9], [250, 7, "60 14 8 14", 0.85], [318, 2, "4 10", 0.7], [372, 12, "180 24 30 24", 0.55], [440, 2.5, "none", 0.5], [500, 5, "40 30", 0.38], [548, 1.5, "2 14", 0.4]];
  for (const [r0, w, dash, op] of R) {
    const r = f(r0 * x.spread);
    const da = dash === "none" ? "" : `stroke-dasharray="${dash}"`;
    o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff2d3d" stroke-width="${w * 5}" opacity="${f(0.05 * k)}" ${da}/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff2d3d" stroke-width="${w * 2.2}" opacity="${f(Math.min(0.5, 0.14 * k))}" ${da}/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ff4a58" stroke-width="${w}" opacity="${f(Math.min(1, op * (0.5 + k * 0.5)))}" ${da}/>`;
    if (w >= 3) o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffd6da" stroke-width="${f(w * 0.3)}" opacity="${f(Math.min(1, 0.4 * k))}" ${da}/>`;
  }
  // 눈금
  for (let i = 0; i < 120; i++) {
    const a = (i * 3 * Math.PI) / 180, r1 = 280 * x.spread, r2 = r1 + (i % 10 === 0 ? 26 : i % 5 === 0 ? 16 : 8);
    o += `<path d="M${f(cx + r1 * Math.cos(a))} ${f(cy + r1 * Math.sin(a))} L${f(cx + r2 * Math.cos(a))} ${f(cy + r2 * Math.sin(a))}" stroke="#ff6a74" stroke-width="${i % 10 === 0 ? 3 : 1.4}" opacity="${f(Math.min(1, 0.45 * k))}"/>`;
  }
  // 기호 같은 노드
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 + 22.5) * Math.PI / 180, r = 372 * x.spread, px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
    o += `<rect x="${f(px - 9)}" y="${f(py - 9)}" width="18" height="18" transform="rotate(45 ${f(px)} ${f(py)})" fill="${INK}" stroke="#ff4a58" stroke-width="3" opacity="${f(Math.min(1, 0.6 + 0.3 * k))}"/>`;
    o += `<circle cx="${f(px)}" cy="${f(py)}" r="3.5" fill="#ffd0d4"/>`;
  }
  if (k > 1.5) {
    // 분노: 고리에서 뻗는 섬광 가시
    for (let i = 0; i < 24; i++) {
      const a = (i * 15 + 7) * Math.PI / 180, r1 = 400, r2 = 470 + (i % 3) * 40;
      o += `<path d="M${f(cx + r1 * Math.cos(a - 0.02))} ${f(cy + r1 * Math.sin(a - 0.02))} L${f(cx + r2 * Math.cos(a))} ${f(cy + r2 * Math.sin(a))} L${f(cx + r1 * Math.cos(a + 0.02))} ${f(cy + r1 * Math.sin(a + 0.02))}Z" fill="#ff4a58" opacity="0.55"/>`;
    }
  }
  return o;
}

// 떠다니는 기하 파편
function shards(front) {
  const R = rng(front ? 913 : 41);
  const list = front
    ? [[214, 760, 46, 20], [1000, 640, 40, -30], [140, 1180, 30, 50], [1080, 1120, 34, 10], [190, 1720, 26, -20], [1040, 1640, 30, 40]]
    : [[300, 150, 60, 15], [910, 170, 54, -25], [180, 420, 40, 35], [1040, 400, 48, -10], [250, 560, 28, 60], [960, 540, 30, 0], [420, 70, 26, 30], [800, 76, 30, -40]];
  let o = "";
  for (const [x, y, s, rot] of list) {
    const t = R();
    let top, dark;
    if (t < 0.5) { // 길쭉한 마름모(두 면)
      top = `M0 ${-s * 1.6} L${s * 0.55} 0 L0 ${s * 1.6} Z`; dark = `M0 ${-s * 1.6} L${-s * 0.55} 0 L0 ${s * 1.6} Z`;
    } else { // 삼각뿔
      top = `M0 ${-s} L${s * 0.9} ${s * 0.7} L${s * 0.1} ${s * 0.3} Z`; dark = `M0 ${-s} L${s * 0.1} ${s * 0.3} L${-s * 0.8} ${s * 0.6} Z`;
    }
    o += `<g transform="translate(${x} ${y}) rotate(${rot})">`;
    o += `<path d="${dark}" fill="#141018" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    o += `<path d="${top}" fill="url(#${P}shard)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    o += `<path d="${top}" fill="none" stroke="#ff4a58" stroke-width="1.6" opacity="0.85"/>`;
    o += `<path d="M0 ${-s * (t < 0.5 ? 1.6 : 1)} L0 ${s * 0.25}" stroke="#ffd0d4" stroke-width="1.5" opacity="0.6"/>`;
    o += `</g>`;
    o += `<ellipse cx="${x}" cy="${y + s * 2}" rx="${s * 0.6}" ry="${s * 0.12}" fill="#ff2d3d" opacity="0.18"/>`;
  }
  return o;
}

// 케이블 머리카락
function cables(side, layer) {
  // side: 1 = 화면 오른쪽, 그리는 건 오른쪽 기준 후 미러
  const R = rng(layer === "back" ? 300 : 700);
  let o = "";
  const defs = layer === "back"
    ? [
      [[690, 230], [860, 280], [700, 800], [880, 1300], [1000, 2000], 22],
      [[700, 290], [900, 420], [780, 1000], [960, 1500], [1100, 1820], 18],
      [[680, 340], [780, 560], [660, 1200], [800, 1800], [840, 2380], 20],
      [[706, 210], [980, 220], [940, 640], [1080, 1000], [1150, 1320], 14],
      [[690, 300], [830, 600], [760, 1400], [900, 1900], [960, 2390], 16],
    ]
    : [
      [[690, 360], [750, 470], [730, 560], [712, 690], [700, 860], 13],
    ];
  for (const [p0, p1, p2, p3, end, w] of defs) {
    // 두 구간 곡선: p0 → p3 (제어 p1,p2), p3 → end
    const q1 = [p3[0] * 2 - p2[0], p3[1] * 2 - p2[1]], q2 = [end[0] - (R() - 0.5) * 60, end[1] - (end[1] - p3[1]) * 0.45];
    const d = `M${p0[0]} ${p0[1]} C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]} C${f(q1[0])} ${f(q1[1])} ${f(q2[0])} ${f(q2[1])} ${end[0]} ${end[1]}`;
    // 세 가닥 꼬인 다발
    for (const dx of [-w * 0.75, w * 0.75]) {
      o += line(d, INK, w * 0.55 + 6, 1, `transform="translate(${f(dx)} ${f(Math.abs(dx) * 0.4)})"`);
      o += line(d, `url(#${P}cable)`, w * 0.55, 1, `transform="translate(${f(dx)} ${f(Math.abs(dx) * 0.4)})"`);
    }
    o += line(d, INK, w + 8, 1);
    o += line(d, `url(#${P}cable)`, w, 1);
    o += line(d, "#6a6278", w * 0.22, 0.75, `transform="translate(${-w * 0.22} 0)"`);
    o += line(d, "#ff2d3d", 1.6, 0.45, `stroke-dasharray="3 22" transform="translate(${w * 0.18} 0)"`);
    // 연결 고리(붉은 링)
    for (const t of [0.35, 0.7]) {
      const [x, y] = bez(p0, p1, p2, p3, t);
      o += `<rect x="${f(x - w * 0.75)}" y="${f(y - 6)}" width="${f(w * 1.5)}" height="12" rx="3" fill="#2a2430" stroke="${INK}" stroke-width="2.5"/>`;
      o += `<rect x="${f(x - w * 0.6)}" y="${f(y - 2)}" width="${f(w * 1.2)}" height="4" fill="#ff4a58"/>`;
    }
    const [mx, my] = bez(p3, q1, q2, end, 0.5);
    o += `<rect x="${f(mx - w * 0.75)}" y="${f(my - 7)}" width="${f(w * 1.5)}" height="14" rx="3" fill="#2a2430" stroke="${INK}" stroke-width="2.5"/><rect x="${f(mx - w * 0.6)}" y="${f(my - 2)}" width="${f(w * 1.2)}" height="4" fill="#ff4a58"/>`;
    // 끝 플러그(빛나는 단자)
    if (end[1] < 2350) {
      o += `<path d="M${end[0] - w * 0.7} ${end[1]} L${end[0] + w * 0.7} ${end[1]} L${end[0] + w * 0.4} ${end[1] + 26} L${end[0] - w * 0.4} ${end[1] + 26}Z" fill="#2a2430" stroke="${INK}" stroke-width="3"/>`;
      o += `<circle cx="${end[0]}" cy="${end[1] + 34}" r="${f(w * 0.35)}" fill="#ff4a58"/><circle cx="${end[0]}" cy="${end[1] + 34}" r="${f(w * 0.9)}" fill="#ff2d3d" opacity="0.25"/>`;
    }
  }
  void side;
  return o;
}

// ── 몸 ──
const TORSO = "M528 548 C474 566 432 590 420 636 C424 716 472 764 500 826 C520 884 530 950 540 1012 L660 1012 C670 950 680 884 700 826 C728 764 776 716 780 636 C768 590 726 566 672 548Z";
const BREAST = "M516 640 C556 616 644 616 684 640 C694 722 662 804 600 866 C538 804 506 722 516 640Z";
const GOWN = "M540 1000 C500 1300 390 1800 210 2392 L990 2392 C810 1800 700 1300 660 1000Z";
const PETAL_L = "M548 1004 C470 1300 480 1600 390 1900 C356 2010 326 2130 290 2280 L376 2200 L418 2300 L454 2186 C484 1980 516 1720 536 1500 C552 1300 568 1150 582 1030Z";
const PETAL_L2 = "M560 1020 C540 1400 480 1900 440 2394 L520 2370 L548 2394 C560 1960 576 1500 594 1040Z";
const CENTER = "M584 1030 L616 1030 C622 1500 634 2000 650 2394 L600 2360 L550 2394 C566 2000 578 1500 584 1030Z";
const COLLAR_L = "M520 556 C480 520 456 470 446 400 C478 430 504 446 530 452 L556 540Z";
const PAULD_L = "M462 624 C420 596 360 592 316 612 L240 520 L286 636 C282 690 306 746 336 792 C350 744 378 714 416 700 C444 690 458 668 466 650Z";
const PAULD_L2 = "M444 650 C400 648 356 668 332 708 L280 680 L318 740 C320 770 334 794 352 812 C366 780 392 758 422 746 C450 734 462 708 466 686Z";
const ARM_L_UP = "M340 760 C330 840 336 920 344 1000 L394 1004 C404 924 420 850 434 770Z";
const ARM_L_FORE = "M340 996 C330 1090 326 1200 328 1300 L382 1302 C388 1200 394 1090 398 1000Z";
const GAUNT_L = "M332 1110 C326 1180 324 1250 328 1302 L384 1304 C388 1250 392 1180 396 1110 C376 1098 352 1098 332 1110Z";
const ARM_R_UP = "M770 760 C800 840 840 920 870 990 L918 970 C890 880 856 800 840 740Z";
const ARM_R_FORE = "M872 984 C904 1060 936 1150 960 1240 L1008 1222 C984 1130 952 1040 918 966Z";
const GAUNT_R = "M902 1080 C924 1130 944 1190 962 1244 L1010 1226 C996 1170 976 1110 952 1060 C934 1056 914 1064 902 1080Z";

function capsule(x1, y1, x2, y2, r1, r2 = r1) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  return `M${f(x1 + nx * r1)} ${f(y1 + ny * r1)} L${f(x2 + nx * r2)} ${f(y2 + ny * r2)} A${r2} ${r2} 0 0 0 ${f(x2 - nx * r2)} ${f(y2 - ny * r2)} L${f(x1 - nx * r1)} ${f(y1 - ny * r1)} A${r1} ${r1} 0 0 0 ${f(x1 + nx * r1)} ${f(y1 + ny * r1)}Z`;
}
// 손가락: [마디점들]
function hand(palm, fingers, tipCol = "#ff4a58") {
  let o = shape(palm, `url(#${P}black)`, 4);
  for (const pts of fingers) {
    for (let i = 0; i < pts.length - 1; i++) {
      const r = 7.5 - i * 1.4;
      o += shape(capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, r - 1.2), i === 1 ? `url(#${P}porc)` : `url(#${P}black)`, 2.6);
    }
    const [ax, ay] = pts[pts.length - 2], [bx, by] = pts[pts.length - 1];
    const a = Math.atan2(by - ay, bx - ax);
    o += `<path d="M${f(bx + Math.cos(a + 1.6) * 4)} ${f(by + Math.sin(a + 1.6) * 4)} L${f(bx + Math.cos(a) * 14)} ${f(by + Math.sin(a) * 14)} L${f(bx + Math.cos(a - 1.6) * 4)} ${f(by + Math.sin(a - 1.6) * 4)}Z" fill="${tipCol}" stroke="${INK}" stroke-width="1.6"/>`;
  }
  return o;
}

function gownDetails() {
  let o = "";
  // 검은 판 마디 (가로 호)
  o += `<g clip-path="url(#${P}gownClip)">`;
  for (let i = 0; i < 15; i++) {
    const y = 1080 + i * 90, spread = 60 + i * 24;
    o += `<path d="M${600 - spread - 60} ${y} Q600 ${y + 40} ${600 + spread + 60} ${y}" fill="none" stroke="${INK}" stroke-width="5"/>`;
    o += `<path d="M${600 - spread - 60} ${y + 6} Q600 ${y + 46} ${600 + spread + 60} ${y + 6}" fill="none" stroke="#4a4256" stroke-width="2" opacity="0.8"/>`;
  }
  // 세로 붉은 혈관선
  for (const [x0, x1] of [[566, 470], [634, 730], [552, 360], [648, 840]]) o += redGlow(`M${x0} 1040 C${x0 + (x1 - x0) * 0.2} 1500 ${x1 - (x1 - x0) * 0.1} 1900 ${x1} 2400`, 2, 0.8);
  o += `</g>`;
  return o;
}

function maskAndEye(x) {
  let o = "";
  // 머리 뒤 껍질(검은 갑각) + 왕관 첨탑
  const SHELL = "M600 124 C684 124 726 196 728 290 C730 372 708 440 676 490 L600 540 L524 490 C492 440 470 372 472 290 C474 196 516 124 600 124Z";
  // 등 뒤 부채꼴 관(크레스트) 칼날
  for (const g of ["", MIR]) {
    o += `<g ${g}>`;
    const blades = [[-168, 250, 34], [-150, 330, 40], [-132, 300, 36], [-114, 250, 30], [-186, 190, 26], [-200, 140, 20]];
    for (const [deg, len, wd] of blades) {
      const a = deg * Math.PI / 180, bx = 600 + Math.cos(a) * 70, by = 290 + Math.sin(a) * 70;
      const tx = 600 + Math.cos(a) * len, ty = 290 + Math.sin(a) * len;
      const nx = -Math.sin(a) * wd / 2, ny = Math.cos(a) * wd / 2;
      const mx = 600 + Math.cos(a) * len * 0.62, my = 290 + Math.sin(a) * len * 0.62;
      const d = `M${f(bx + nx * 0.4)} ${f(by + ny * 0.4)} L${f(mx + nx)} ${f(my + ny)} L${f(tx)} ${f(ty)} L${f(mx - nx)} ${f(my - ny)} L${f(bx - nx * 0.4)} ${f(by - ny * 0.4)}Z`;
      o += shape(d, `url(#${P}black)`, 3.5);
      o += `<path d="M${f(bx)} ${f(by)} L${f(mx + nx)} ${f(my + ny)} L${f(tx)} ${f(ty)}Z" fill="#4a4256" opacity="0.6"/>`;
      o += redGlow(`M${f(bx + Math.cos(a) * 30)} ${f(by + Math.sin(a) * 30)} L${f(tx - Math.cos(a) * 16)} ${f(ty - Math.sin(a) * 16)}`, 1.3, 0.8);
    }
    o += `</g>`;
  }
  o += shape("M600 30 L626 140 L600 160 L574 140Z", `url(#${P}black)`, 4);
  o += shape("M520 70 L560 150 L534 170 L508 150Z M680 70 L640 150 L666 170 L692 150Z", `url(#${P}black)`, 4);
  o += shape("M452 140 L506 190 L476 220 L440 200Z M748 140 L694 190 L724 220 L760 200Z", `url(#${P}black)`, 4);
  o += line("M600 44 L600 140 M524 84 L540 150 M676 84 L660 150", "#ff4a58", 2.5, 0.9);
  o += shape(SHELL, `url(#${P}black)`, 5);
  o += line("M492 270 C500 196 540 150 600 144 M708 270 C700 196 660 150 600 144", "#5a5266", 3, 0.7);
  // 가면
  const MASK = "M600 150 C658 150 694 200 696 268 C698 330 680 388 650 432 L600 494 L550 432 C520 388 502 330 504 268 C506 200 542 150 600 150Z";
  o += shape(MASK, `url(#${P}mask)`, 5);
  // 면 분할 음영 (왼쪽 위 광원 → 오른쪽 면 그늘)
  o += `<path d="M600 150 C658 150 694 200 696 268 C698 330 680 388 650 432 L600 494 L606 372 L652 344 L604 250Z" fill="#7d7590" opacity="0.35"/>`;
  o += `<path d="M534 350 L600 384 L600 494 L550 432 C530 404 516 380 510 352Z" fill="#b9b2c4" opacity="0.45"/>`;
  o += line("M600 152 L600 250 M600 384 L600 492 M508 344 L556 362 L600 386 L644 362 L692 344 M524 222 L600 240 L676 222", "#7d7590", 2, 0.75);
  // 뺨 장식판(검은 상감)
  o += `<path d="M512 360 C520 400 540 430 566 452 L572 420 C552 404 534 384 526 360Z" fill="#1e1a24" stroke="${INK}" stroke-width="2.5"/>`;
  o += `<path d="M688 360 C680 400 660 430 634 452 L628 420 C648 404 666 384 674 360Z" fill="#1e1a24" stroke="${INK}" stroke-width="2.5"/>`;
  o += line("M524 368 C532 396 548 418 566 436 M676 368 C668 396 652 418 634 436", "#ff4a58", 1.6, 0.9);
  o += `<path d="M528 196 C548 172 580 160 604 160 C574 172 552 190 540 214Z" fill="#ffffff" opacity="0.85"/>`;
  // 금(균열) 장식 — 붉은 빛이 새는 선
  o += redGlow("M640 340 L656 372 L648 398 L664 430", 1.6, 0.8);
  o += redGlow("M560 190 L548 214 L558 232", 1.3, 0.6);
  // 눈 소켓(각진 렌즈 하우징)
  o += `<path d="M522 300 L556 262 L644 262 L678 300 L644 338 L556 338Z" fill="#0b080d" stroke="${INK}" stroke-width="4"/>`;
  o += line("M522 300 L556 262 L644 262 L678 300", "#5a5266", 2, 0.9);
  const { w, h, ir, eyeOp } = x, cx = 600, cy = 300;
  // 셔터 모양 = 표정
  let eye;
  if (x === EX.smile) eye = `M${cx - w} ${cy + 6} Q${cx} ${cy - h * 2.4} ${cx + w} ${cy + 6} Q${cx} ${cy - h * 0.6} ${cx - w} ${cy + 6}Z`;
  else if (x === EX.angry) eye = `M${cx - w} ${cy - 12} L${cx - 14} ${cy + 2} L${cx + 14} ${cy + 2} L${cx + w} ${cy - 12} L${cx + w * 0.55} ${cy + h} L${cx - w * 0.55} ${cy + h}Z`;
  else if (x === EX.sad) eye = `M${cx - w} ${cy + 10} L${cx - w * 0.3} ${cy - h * 1.2} L${cx + w * 0.3} ${cy - h * 1.2} L${cx + w} ${cy + 10} Q${cx} ${cy + h * 1.4} ${cx - w} ${cy + 10}Z`;
  else if (x === EX.surprise) eye = `M${cx - h} ${cy} A${h} ${h} 0 1 1 ${cx + h} ${cy} A${h} ${h} 0 1 1 ${cx - h} ${cy}Z`;
  else eye = `M${cx - w} ${cy} Q${cx - w * 0.5} ${cy - h * 1.5} ${cx} ${cy - h * 1.5} Q${cx + w * 0.5} ${cy - h * 1.5} ${cx + w} ${cy} Q${cx + w * 0.5} ${cy + h * 1.5} ${cx} ${cy + h * 1.5} Q${cx - w * 0.5} ${cy + h * 1.5} ${cx - w} ${cy}Z`;
  o += `<g opacity="${eyeOp}">`;
  o += `<ellipse cx="${cx}" cy="${cy}" rx="${w * 2}" ry="${h * 2 + 46}" fill="url(#${P}eyeGlow)"/>`;
  o += `<clipPath id="${P}eyeClip"><path d="${eye}"/></clipPath>`;
  o += `<path d="${eye}" fill="#ff2d3d" stroke="#ff2d3d" stroke-width="14" stroke-opacity="0.22"/>`;
  o += `<g clip-path="url(#${P}eyeClip)">`;
  // 렌즈: 동심원 + 조리개
  o += `<circle cx="${cx}" cy="${cy}" r="40" fill="url(#${P}eye)"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="${ir + 12}" fill="none" stroke="#ffd0d4" stroke-width="1.5" opacity="0.8"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="${ir + 6}" fill="#7a0010"/>`;
  o += `<circle cx="${cx}" cy="${cy}" r="${ir}" fill="url(#${P}iris)"/>`;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; o += `<path d="M${f(cx + Math.cos(a) * ir * 0.35)} ${f(cy + Math.sin(a) * ir * 0.35)} L${f(cx + Math.cos(a + 0.6) * ir)} ${f(cy + Math.sin(a + 0.6) * ir)}" stroke="#7a0010" stroke-width="1.5"/>`; }
  o += `<circle cx="${cx}" cy="${cy}" r="${f(ir * 0.32)}" fill="#ffe8ea"/>`;
  o += `<circle cx="${cx - ir * 0.55}" cy="${cy - ir * 0.6}" r="${f(Math.max(2.5, ir * 0.25))}" fill="#ffffff"/>`;
  o += `<circle cx="${cx + ir * 0.6}" cy="${cy + ir * 0.5}" r="2" fill="#ffffff" opacity="0.8"/>`;
  o += `</g>`;
  o += `<path d="${eye}" fill="none" stroke="#ffe0e2" stroke-width="2.4"/>`;
  o += `</g>`;
  // 셔터 판 가장자리
  o += line(`M528 300 L${cx - w} ${cy} M672 300 L${cx + w} ${cy}`, "#ff4a58", 2, 0.7);
  if (x === EX.sad) {
    // 붉은 눈물 같은 빛줄기
    o += redGlow("M612 330 C616 370 610 410 618 470", 2, 0.7);
    o += `<circle cx="618" cy="474" r="5" fill="#ff8a92"/>`;
  }
  if (x === EX.angry) {
    o += `<path d="M524 298 L556 262 L596 262 L586 300 L560 286Z M676 298 L644 262 L604 262 L614 300 L640 286Z" fill="#2a2430" stroke="${INK}" stroke-width="3"/>`;
    o += line("M530 296 L558 282 L586 298 M670 296 L642 282 L614 298", "#ff6a74", 2.2, 1);
    // 가면의 균열이 더 붉게 타오름
    o += redGlow("M560 250 L576 270 L566 286 M640 250 L624 270 L634 286", 2, 1.4);
    o += line("M520 286 L548 296 M680 286 L652 296", "#ff8a92", 3, 0.9);
  }
  if (x === EX.surprise) {
    o += line("M520 250 L506 234 M680 250 L694 234 M600 226 L600 206", "#ff8a92", 3, 0.9);
  }
  if (x === EX.serious) {
    o += line("M530 290 L670 290 M530 310 L670 310", "#ff4a58", 1.2, 0.6);
  }
  // 이마 보석
  o += `<path d="M600 186 L614 206 L600 226 L586 206Z" fill="#ff2d3d" stroke="${INK}" stroke-width="3"/><path d="M600 192 L606 206 L600 200Z" fill="#ffe0e2"/>`;
  return o;
}

export function svg(expr = "normal") {
  const e = EX[expr] ? expr : "normal";
  const x = EX[e];
  const defs = `<defs>
<radialGradient id="${P}aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff2d3d" stop-opacity="0.38"/><stop offset="0.45" stop-color="#b0101e" stop-opacity="0.16"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0"/></radialGradient>
<radialGradient id="${P}eyeGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff2d3d" stop-opacity="0.6"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0"/></radialGradient>
<radialGradient id="${P}eye" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#ffd0d4"/><stop offset="0.35" stop-color="#ff4a58"/><stop offset="1" stop-color="#9a0614"/></radialGradient>
<radialGradient id="${P}iris" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#ff8a92"/><stop offset="0.8" stop-color="#e01828"/><stop offset="1" stop-color="#6a0010"/></radialGradient>
<radialGradient id="${P}core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe0e2"/><stop offset="0.3" stop-color="#ff4a58"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0"/></radialGradient>
<linearGradient id="${P}mask" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#ece8ef"/><stop offset="1" stop-color="#a49cb2"/></linearGradient>
<linearGradient id="${P}porc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf9fc"/><stop offset="0.55" stop-color="#e2dde8"/><stop offset="1" stop-color="#9890a8"/></linearGradient>
<linearGradient id="${P}porcV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f3f8"/><stop offset="0.6" stop-color="#d6d0de"/><stop offset="1" stop-color="#8c849c"/></linearGradient>
<linearGradient id="${P}black" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#3a3444"/><stop offset="0.35" stop-color="#1e1a24"/><stop offset="1" stop-color="#0c0a10"/></linearGradient>
<linearGradient id="${P}gown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241f2a"/><stop offset="0.7" stop-color="#16121a"/><stop offset="1" stop-color="#3a0a12"/></linearGradient>
<linearGradient id="${P}cable" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4256"/><stop offset="0.4" stop-color="#25202c"/><stop offset="1" stop-color="#0e0b12"/></linearGradient>
<linearGradient id="${P}shard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5266"/><stop offset="0.5" stop-color="#2a2430"/><stop offset="1" stop-color="#5a0a14"/></linearGradient>
<linearGradient id="${P}hem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2d3d" stop-opacity="0"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0.45"/></linearGradient>
<clipPath id="${P}gownClip"><path d="${GOWN}"/></clipPath>
</defs>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400">${defs}`;
  s += `<circle cx="600" cy="300" r="560" fill="url(#${P}aura)"/>`;
  // 뒤 케이블
  s += cables(1, "back") + `<g ${MIR}>${cables(-1, "back")}</g>`;
  s += rings(x);
  s += shards(false);
  // 드레스
  s += shape(GOWN, `url(#${P}gown)`, 5);
  s += gownDetails();
  s += `<path d="${GOWN}" fill="url(#${P}hem)"/>`;
  for (const g of ["", MIR]) {
    s += `<g ${g}>`;
    s += shape(PETAL_L, `url(#${P}porcV)`, 4.5);
    s += `<path d="M548 1004 C470 1300 480 1600 390 1900 C356 2010 326 2130 290 2280 L330 2244 C370 2080 400 1980 430 1900 C500 1640 500 1300 560 1010Z" fill="#ffffff" opacity="0.45"/>`;
    s += redGlow("M568 1040 C540 1300 520 1600 480 1860 C466 1980 450 2080 436 2200", 1.6, 0.8);
    s += shape(PETAL_L2, `url(#${P}black)`, 4);
    s += line("M576 1060 C562 1500 520 1960 500 2360", "#5a5266", 2, 0.8);
    // 판 문양
    for (let i = 0; i < 6; i++) { const y = 1250 + i * 190, xx = 540 - i * 40; s += `<path d="M${xx} ${y} l14 -18 l14 18 l-14 18Z" fill="#ff4a58" stroke="${INK}" stroke-width="2"/>`; }
    s += `</g>`;
  }
  s += shape(CENTER, `url(#${P}porcV)`, 4);
  s += redGlow("M600 1050 C602 1500 610 2000 600 2350", 2.4);
  // 허리 장식판(태싯)
  for (const g of ["", MIR]) {
    s += `<g ${g}>`;
    s += shape("M552 1000 C514 1060 486 1150 474 1270 L516 1238 L548 1286 C556 1180 568 1090 588 1016Z", `url(#${P}porc)`, 4);
    s += shape("M536 1010 C494 1060 456 1130 440 1210 L480 1196 C496 1120 520 1060 556 1020Z", `url(#${P}black)`, 3.5);
    s += redGlow("M560 1030 C536 1100 520 1180 514 1236", 1.3, 0.8);
    s += `<path d="M544 1020 C520 1070 500 1140 492 1220 L500 1214 C510 1140 528 1076 556 1026Z" fill="#ffffff" opacity="0.7"/>`;
    s += `</g>`;
  }
  // 뒤쪽 높은 칼라
  s += shape(COLLAR_L, `url(#${P}porc)`, 4) + `<g ${MIR}>${shape(COLLAR_L, `url(#${P}porc)`, 4)}${line("M530 540 C500 510 478 470 466 424", "#ff4a58", 2, 0.8)}</g>`;
  s += line("M530 540 C500 510 478 470 466 424", "#ff4a58", 2, 0.8);
  // 몸통
  s += shape(TORSO, `url(#${P}black)`, 5);
  s += line("M432 650 C440 720 480 770 506 830 M768 650 C760 720 720 770 694 830", "#5a5266", 2.5, 0.8);
  // 허리 코르셋 마디
  for (let i = 0; i < 5; i++) { const y = 880 + i * 28, hw = 92 - i * 6 + (i > 3 ? 8 : 0); s += `<path d="M${600 - hw} ${y} Q600 ${y + 14} ${600 + hw} ${y}" fill="none" stroke="#4a4256" stroke-width="3"/>`; }
  s += redGlow("M540 1012 Q600 1030 660 1012", 2.4);
  s += shape(BREAST, `url(#${P}porc)`, 4);
  s += `<path d="M600 640 L600 866 C540 804 506 722 516 640 C540 626 570 620 600 620Z" fill="#ffffff" opacity="0.35"/>`;
  s += line("M530 660 Q600 700 670 660 M548 760 L600 800 L652 760", "#8c849c", 2, 0.8);
  // 가슴 코어
  s += `<circle cx="600" cy="720" r="64" fill="url(#${P}core)" opacity="${f(Math.min(1, 0.5 + x.ring * 0.3))}"/>`;
  s += `<path d="M600 692 L624 720 L600 748 L576 720Z" fill="#ff2d3d" stroke="${INK}" stroke-width="3"/><path d="M600 700 L612 720 L600 712Z" fill="#ffe0e2"/>`;
  s += redGlow("M600 748 L600 860 M600 692 L600 640", 1.6);
  // 목
  s += shape("M562 470 L638 470 L646 566 L554 566Z", `url(#${P}black)`, 4);
  for (let i = 0; i < 4; i++) s += line(`M${560 + i} ${490 + i * 20} Q600 ${500 + i * 20} ${640 - i} ${490 + i * 20}`, "#4a4256", 3, 0.9);
  s += redGlow("M600 480 L600 560", 1.4, 0.8);
  // 견갑
  for (const g of ["", MIR]) {
    s += `<g ${g}>`;
    s += shape(PAULD_L, `url(#${P}porc)`, 4.5);
    s += shape(PAULD_L2, `url(#${P}black)`, 4);
    s += redGlow("M290 640 C320 612 380 600 440 618", 1.6, 0.9);
    s += `<path d="M250 534 L300 626 C340 606 390 600 430 610 C390 612 340 622 310 644Z" fill="#ffffff" opacity="0.75"/>`;
    s += `</g>`;
  }
  // 긴 소매(팔 뒤로 늘어진 판갑 천)
  const SLV_L = "M338 960 C300 1100 262 1300 250 1500 C246 1600 262 1700 300 1780 L330 1700 L352 1760 L372 1660 C380 1500 392 1300 400 1020Z";
  const SLV_R = "M880 980 C920 1080 990 1220 1050 1380 C1080 1470 1090 1580 1076 1700 L1040 1620 L1018 1690 L998 1600 C980 1480 950 1300 930 1200Z";
  for (const d of [SLV_L, SLV_R]) s += shape(d, `url(#${P}gown)`, 4);
  s += line("M352 1000 C320 1200 290 1450 296 1700 M370 1040 C352 1300 350 1500 350 1700", "#4a4256", 2.5, 0.9);
  s += line("M900 1020 C960 1180 1030 1350 1060 1600 M930 1160 C970 1300 1000 1460 1010 1620", "#4a4256", 2.5, 0.9);
  s += redGlow("M250 1500 C246 1600 262 1700 300 1780 L330 1700 L352 1760 L372 1660", 1.6, 0.8);
  s += redGlow("M1050 1380 C1080 1470 1090 1580 1076 1700 L1040 1620 L1018 1690 L998 1600", 1.6, 0.8);
  // 팔
  s += shape(ARM_L_UP, `url(#${P}black)`, 4) + shape(ARM_L_FORE, `url(#${P}black)`, 4) + shape(GAUNT_L, `url(#${P}porc)`, 4);
  s += shape("M344 790 C340 840 342 890 348 930 L404 930 C410 880 418 830 428 790 C400 774 368 776 344 790Z", `url(#${P}porc)`, 3.5) + line("M356 800 C352 850 354 890 358 920", "#ffffff", 3, 0.7);
  s += shape("M788 800 C806 840 826 880 846 920 L894 902 C878 860 860 816 840 780 C820 776 800 784 788 800Z", `url(#${P}porc)`, 3.5);
  s += `<circle cx="369" cy="1000" r="20" fill="#2a2430" stroke="${INK}" stroke-width="3"/><circle cx="369" cy="1000" r="7" fill="#ff4a58"/>`;
  s += redGlow("M360 1140 L352 1290", 1.4, 0.8) + line("M340 1130 C346 1200 344 1250 340 1294", "#ffffff", 3, 0.6);
  s += shape(ARM_R_UP, `url(#${P}black)`, 4) + shape(ARM_R_FORE, `url(#${P}black)`, 4) + shape(GAUNT_R, `url(#${P}porc)`, 4);
  s += `<circle cx="894" cy="978" r="20" fill="#2a2430" stroke="${INK}" stroke-width="3"/><circle cx="894" cy="978" r="7" fill="#ff4a58"/>`;
  s += redGlow("M936 1100 L976 1220", 1.4, 0.8) + line("M912 1090 C930 1140 946 1190 958 1234", "#ffffff", 3, 0.6);
  // 손: 왼손은 아래로 늘어뜨림, 오른손은 바깥으로 펼쳐 손바닥을 보임
  s += hand("M326 1296 C318 1330 320 1370 330 1392 L380 1394 C390 1366 392 1330 386 1298Z",
    [[[332, 1388], [324, 1430], [322, 1468]], [[346, 1392], [342, 1442], [342, 1486]], [[362, 1392], [362, 1440], [366, 1480]], [[378, 1388], [384, 1428], [390, 1460]], [[388, 1320], [404, 1360], [408, 1396]]]);
  s += hand("M958 1236 C950 1270 960 1306 980 1324 L1022 1310 C1028 1282 1024 1246 1008 1222Z",
    [[[982, 1322], [988, 1366], [992, 1404]], [[996, 1320], [1010, 1362], [1022, 1396]], [[1008, 1316], [1030, 1350], [1046, 1380]], [[1018, 1304], [1046, 1326], [1068, 1344]], [[960, 1260], [940, 1294], [936, 1330]]]);
  // 펼친 손 위 붉은 문장
  s += `<circle cx="1000" cy="1430" r="70" fill="url(#${P}eyeGlow)" opacity="${f(Math.min(1, 0.4 + x.ring * 0.3))}"/>`;
  s += line("M1000 1380 L1043 1405 L1043 1455 L1000 1480 L957 1455 L957 1405Z", "#ff4a58", 2.5, 0.9) + line("M1000 1400 L1026 1445 L974 1445Z", "#ffd0d4", 2, 0.9);
  // 팔 마디·광택
  for (const [x0, y0, x1, y1] of [[340, 1030, 398, 1032], [338, 1060, 396, 1062], [878, 1010, 922, 992], [890, 1040, 934, 1022]]) s += line(`M${x0} ${y0} L${x1} ${y1}`, "#4a4256", 3, 1);
  s += line("M350 770 C342 850 344 930 350 990 M786 770 C810 850 846 930 876 990", "#6a6278", 3, 0.8);
  s += line("M346 1010 C338 1100 336 1180 336 1240 M884 1000 C910 1070 934 1140 950 1200", "#6a6278", 2.5, 0.7);
  for (const [x0, y0] of [[369, 860], [818, 860]]) s += `<path d="M${x0} ${y0 - 14} L${x0 + 10} ${y0} L${x0} ${y0 + 14} L${x0 - 10} ${y0}Z" fill="#ff2d3d" stroke="${INK}" stroke-width="2"/>`;
  // 목걸이 형 노드 + 가슴판 문양
  for (let i = 0; i <= 8; i++) { const t = i / 8, x0 = 470 + t * 260, y0 = 590 + Math.sin(t * Math.PI) * 40; s += `<circle cx="${f(x0)}" cy="${f(y0)}" r="${i % 2 ? 4 : 6}" fill="#ff4a58" stroke="${INK}" stroke-width="2"/>`; }
  s += line("M470 590 Q600 670 730 590", "#ff4a58", 1.5, 0.7);
  s += line("M540 650 C560 680 580 690 600 692 C620 690 640 680 660 650 M556 780 C576 800 590 820 600 840 C610 820 624 800 644 780", "#ff4a58", 1.5, 0.75);
  s += `<path d="M528 650 C540 700 560 760 590 820 L584 830 C548 772 530 710 522 652Z" fill="#ffffff" opacity="0.9"/>`;
  // 꽃잎 판 이음새 + 광택
  for (const g of ["", MIR]) {
    s += `<g ${g}>`;
    for (let i = 0; i < 7; i++) { const t = (i + 1) / 8, y0 = 1060 + t * 1140, xo = 548 - t * t * 240 - t * 30, xi = 582 - t * 110; s += line(`M${f(xo)} ${f(y0)} Q${f((xo + xi) / 2)} ${f(y0 + 16)} ${f(xi)} ${f(y0 - 4)}`, "#8c849c", 2, 0.8); }
    s += `</g>`;
  }
  // 앞쪽 케이블(어깨 위로)
  s += cables(1, "front") + `<g ${MIR}>${cables(-1, "front")}</g>`;
  s += maskAndEye(x);
  s += shards(true);
  // 바닥 붉은 반사
  s += `<ellipse cx="600" cy="2392" rx="380" ry="16" fill="#ff2d3d" opacity="0.25"/>`;
  // 림 라이트(오른쪽)
  s += line("M780 636 C776 716 728 764 700 826", "#ff6a74", 2.5, 0.7) + line("M710 272 C714 354 682 424 640 460", "#ff6a74", 2.5, 0.6);
  s += `</svg>`;
  return s;
}
