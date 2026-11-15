// 유리 — 최연소 천재 해커 (18). 전신 입간판 SVG. 몸은 고정, 얼굴만 표정별로 바뀐다.
// 큰 후드 재킷, 목에 건 헤드폰, 손목 단말기, 태블릿을 꼭 끌어안은 소심한 자세(무릎 안쪽으로 모음)
export const ID = "yuri", NAME = "유리";

const O = "#1a1626";            // 외곽선
const RIM = "#8fe8ff";          // 림 라이트
const AC = "#c77dff";           // 포인트 색

// ── 그리기 도우미 ─────────────────────────────────────────────
let defs, uid;
const nid = () => `yuri-${uid++}`;
// 셀 셰이딩 도형: 기본색 + 왼쪽 위 광원 기준 자동 그림자 + 직접 그린 음영 + 림 라이트 + 외곽선
function S(d, fill, o = {}) {
  const id = nid();
  const sh = o.sh, sx = o.sx ?? -22, sy = o.sy ?? -16;
  let s = "";
  defs.push(`<clipPath id="${id}c"><path d="${d}"/></clipPath>`);
  if (sh) {
    s += `<path d="${d}" fill="${sh}"/>`;
    s += `<g clip-path="url(#${id}c)"><path d="${d}" fill="${fill}" transform="translate(${sx} ${sy})"/>`;
  } else {
    s += `<path d="${d}" fill="${fill}"/><g clip-path="url(#${id}c)">`;
  }
  if (o.in) s += o.in;
  if (o.rim !== false) {
    const rw = o.rw ?? 7, rc = o.rc ?? RIM;
    defs.push(`<mask id="${id}m"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="translate(${-rw} ${rw * 0.35})"/></mask>`);
    s += `<path d="${d}" fill="${rc}" mask="url(#${id}m)" opacity="${o.ro ?? 0.85}"/>`;
  }
  s += `</g>`;
  if (o.w !== 0) s += `<path d="${o.sd ?? d}" fill="none" stroke="${o.st ?? O}" stroke-width="${o.w ?? 4.5}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return s;
}
const L = (d, w = 2.5, c = O, op = 1) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` opacity="${op}"` : ""}/>`;
const F = (d, c, op = 1) => `<path d="${d}" fill="${c}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
const r1 = (v) => +v.toFixed(1);

// ── 색 ─────────────────────────────────────────────────────
const SK = "#fff0e6", SK2 = "#f4bfae", SK3 = "#df9284";
const HB = "url(#yuri-hair)", HS = "#6a48b0", HD = "#47317f";
const JK = "url(#yuri-jacket)", JK2 = "#1f1638", JK3 = "#7a63b8";
const MT = "url(#yuri-metal)";

function gradients() {
  return `
<linearGradient id="yuri-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2b6ff"/><stop offset=".4" stop-color="#a77ff0"/><stop offset="1" stop-color="#7a52c8"/></linearGradient>
<linearGradient id="yuri-jacket" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#57438e"/><stop offset=".5" stop-color="#3d2e6c"/><stop offset="1" stop-color="#2e2254"/></linearGradient>
<linearGradient id="yuri-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f2ff"/><stop offset=".45" stop-color="#a49cbf"/><stop offset=".55" stop-color="#655d80"/><stop offset="1" stop-color="#d4cde6"/></linearGradient>
<linearGradient id="yuri-iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1260"/><stop offset=".45" stop-color="#7a3fd0"/><stop offset=".8" stop-color="#b98aff"/><stop offset="1" stop-color="#f0d8ff"/></linearGradient>
<linearGradient id="yuri-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5ee"/><stop offset="1" stop-color="#ffe6da"/></linearGradient>
<linearGradient id="yuri-lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f6ff" stop-opacity=".35"/><stop offset=".5" stop-color="#c9b8ff" stop-opacity=".12"/><stop offset="1" stop-color="#b0e8ff" stop-opacity=".3"/></linearGradient>
<linearGradient id="yuri-tab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5c5f7c"/><stop offset=".5" stop-color="#3a3c56"/><stop offset="1" stop-color="#26273c"/></linearGradient>
<linearGradient id="yuri-sock" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a3f6e"/><stop offset=".4" stop-color="#2f2850"/><stop offset="1" stop-color="#1c1733"/></linearGradient>
<radialGradient id="yuri-blush" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff8ca8" stop-opacity=".65"/><stop offset="1" stop-color="#ff8ca8" stop-opacity="0"/></radialGradient>
<radialGradient id="yuri-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${AC}" stop-opacity=".9"/><stop offset="1" stop-color="${AC}" stop-opacity="0"/></radialGradient>
<radialGradient id="yuri-ground" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
}

// 머리 덩어리: 뿌리 두 점에서 끝으로 모이는 휘어진 잎 모양
function clump(x1, y1, x2, y2, tx, ty, bx = 0, by = 0, o = {}) {
  const p = (a, b, k) => a + (b - a) * k;
  const mx0 = (x1 + x2) / 2, my0 = (y1 + y2) / 2, len = Math.hypot(tx - mx0, ty - my0);
  let nx = -(ty - my0) / len, ny = (tx - mx0) / len;
  if ((x1 - mx0) * nx + (y1 - my0) * ny < 0) { nx = -nx; ny = -ny; }
  const f = (o.fat ?? 0.07) * len, f1 = f, f2 = f * 0.5;
  const d = `M${x1} ${y1} C${r1(p(x1, tx, .35) + bx + nx * f1)} ${r1(p(y1, ty, .35) + by + ny * f1)} ${r1(p(x1, tx, .75) + bx * .8 + nx * f2)} ${r1(p(y1, ty, .75) + by * .8 + ny * f2)} ${tx} ${ty} C${r1(p(x2, tx, .75) + bx * .8 - nx * f2)} ${r1(p(y2, ty, .75) + by * .8 - ny * f2)} ${r1(p(x2, tx, .35) + bx - nx * f1)} ${r1(p(y2, ty, .35) + by - ny * f1)} ${x2} ${y2} Z`;
  const mx = mx0, my = my0;
  const line = `M${r1(p(mx, tx, .15) + bx * .3)} ${r1(p(my, ty, .15))} C${r1(p(mx, tx, .45) + bx * .9)} ${r1(p(my, ty, .45) + by)} ${r1(p(mx, tx, .7) + bx * .8)} ${r1(p(my, ty, .7) + by * .8)} ${r1(p(mx, tx, .88) + bx * .3)} ${r1(p(my, ty, .88))}`;
  const gl = `M${r1(p(x1, tx, .2) + bx * .5 + 4)} ${r1(p(y1, ty, .2) + 2)} C${r1(p(x1, tx, .35) + bx + 6)} ${r1(p(y1, ty, .35) + by)} ${r1(p(x1, tx, .45) + bx + 6)} ${r1(p(y1, ty, .45) + by)} ${r1(p(x1, tx, .55) + bx * .9 + 5)} ${r1(p(y1, ty, .55) + by * .9)}`;
  return S(d, o.fill ?? HB, { sd: d.replace(/ Z$/, ""), sh: o.sh ?? HS, sx: o.sx ?? -10, sy: o.sy ?? -8, w: o.w ?? 3.6, rim: o.rim ?? false, rw: o.rw ?? 6,
    in: L(line, 1.8, O, 0.45) + (o.gloss === false ? "" : L(gl, 4, "#fff", 0.5)) + (o.in ?? "") });
}

// 손가락
function finger(x1, y1, x2, y2, w1, w2, o = {}) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const k = w2 * 1.4;
  const d = `M${r1(x1 + nx * w1)} ${r1(y1 + ny * w1)} L${r1(x2 + nx * w2)} ${r1(y2 + ny * w2)} C${r1(x2 + nx * w2 + ux * k)} ${r1(y2 + ny * w2 + uy * k)} ${r1(x2 - nx * w2 + ux * k)} ${r1(y2 - ny * w2 + uy * k)} ${r1(x2 - nx * w2)} ${r1(y2 - ny * w2)} L${r1(x1 - nx * w1)} ${r1(y1 - ny * w1)} Z`;
  let inn = "";
  for (const t of o.joints ?? [0.45]) { const jx = x1 + dx * t, jy = y1 + dy * t, ww = w1 + (w2 - w1) * t; inn += L(`M${r1(jx + nx * ww * 0.7)} ${r1(jy + ny * ww * 0.7)} Q${r1(jx + ux * 2)} ${r1(jy + uy * 2)} ${r1(jx - nx * ww * 0.2)} ${r1(jy - ny * ww * 0.2)}`, 1.3, SK3, 0.8); }
  if (o.nail !== false) inn += L(`M${r1(x2 + nx * w2 * 0.5 - ux * 7)} ${r1(y2 + ny * w2 * 0.5 - uy * 7)} L${r1(x2 + nx * w2 * 0.5 + ux * 2)} ${r1(y2 + ny * w2 * 0.5 + uy * 2)}`, 2.4, "#fff", 0.75);
  return S(d, SK, { sh: SK2, sx: o.sx ?? -4, sy: o.sy ?? -3, w: 3, rw: 3, ro: 0.6, in: inn });
}

// 윤기 띠
function gloss(cx, cy, rx, ry, a0, a1, w, n) {
  const pt = (a, k) => [cx + Math.cos(a * Math.PI / 180) * rx * k, cy + Math.sin(a * Math.PI / 180) * ry * k];
  let top = [], bot = [];
  const steps = n * 2;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * i / steps;
    top.push(pt(a, 1));
    bot.push(pt(a, i % 2 ? 1 - (w * 2.2) / ry : 1 - w / ry));
  }
  const f = (p) => p.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1));
  return `<path d="M${f(top).join(" L")} L${f(bot.reverse()).join(" L")} Z" fill="#fff" opacity=".8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`;
}

// ── 후드(목 뒤) ───────────────────────────────────────────────
function hood() {
  let s = "";
  s += S("M452 560 C430 500 470 440 540 430 C580 424 620 424 660 430 C730 440 770 500 748 560 C700 520 650 510 600 512 C550 510 500 520 452 560 Z", JK, { sh: JK2, sx: -14, sy: -10, rw: 8,
    in: F("M480 520 C520 484 680 484 720 520 C690 500 650 492 600 492 C550 492 510 500 480 520Z", "#5b3f9a", 0.9) });
  return s;
}

// ── 다리·신발 ────────────────────────────────────────────────
function legs() {
  let s = "";
  s += `<ellipse cx="600" cy="2384" rx="210" ry="20" fill="url(#yuri-ground)"/>`;
  // 왼다리(화면 왼쪽) — 무릎을 안쪽으로 모은 자세
  const lLeg = "M460 1280 L598 1290 C600 1380 598 1460 596 1540 C596 1600 600 1660 600 1700 C592 1780 580 1860 572 1960 C566 2060 566 2140 566 2210 L516 2214 C512 2140 508 2060 506 1960 C504 1860 512 1780 530 1700 C514 1620 488 1540 476 1460 C464 1400 458 1340 460 1280 Z";
  const rLeg = "M740 1280 L602 1290 C600 1380 602 1460 604 1540 C604 1600 600 1660 600 1700 C608 1780 620 1860 628 1960 C634 2060 634 2140 634 2210 L684 2214 C688 2140 692 2060 694 1960 C696 1860 688 1780 670 1700 C686 1620 712 1540 724 1460 C736 1400 742 1340 740 1280 Z";
  for (const [d, flip] of [[rLeg, 1], [lLeg, 0]]) {
    s += S(d, SK, { sh: SK2, sx: -24, sy: -6, rw: 6, ro: 0.7,
      in: flip
        ? F("M640 1660 C650 1690 664 1710 676 1712 C666 1730 646 1734 632 1722 Z", SK2, 0.9) + L("M630 1700 C640 1716 656 1722 668 1718", 2, SK3, 0.7)
        : F("M560 1660 C550 1690 536 1710 524 1712 C534 1730 554 1734 568 1722 Z", SK2, 0.9) + L("M570 1700 C560 1716 544 1722 532 1718", 2, SK3, 0.7)
          + F("M500 1420 C506 1500 520 1580 534 1640 L544 1640 C530 1580 518 1500 512 1420Z", "#fff", 0.55) });
  }
  // 무릎 반창고
  s += `<g transform="translate(556 1690) rotate(-24)">` + S("M-22 -9 h44 c5 0 5 18 0 18 h-44 c-5 0 -5 -18 0 -18 Z", "#ffe1c4", { w: 2.5, rim: false, in: F("M-8 -9 h16 v18 h-16Z", "#f5c9a6") + `<circle cx="-3" cy="-3" r="1.5" fill="#d9a880"/><circle cx="3" cy="3" r="1.5" fill="#d9a880"/>` }) + `</g>`;
  // 허벅지 띠 + 데이터 칩 파우치
  s += S("M606 1470 C640 1480 690 1480 726 1466 L728 1490 C690 1504 640 1504 606 1494 Z", "#2c2547", { w: 3, rim: false, in: L("M610 1480 C640 1490 690 1490 724 1478", 1.4, AC, 0.8) });
  s += S("M668 1460 L716 1456 L720 1530 C706 1540 684 1540 672 1532 Z", "#3a3060", { sh: "#1d1835", sx: -6, sy: -6, w: 3.5,
    in: F("M666 1458 L718 1454 L718 1476 L668 1480 Z", "#4c3f7c") + L("M668 1478 L718 1474", 2, O) });
  s += S("M682 1430 L700 1428 L702 1462 L684 1464 Z", MT, { w: 2.5, rim: false, in: F("M686 1436 h10 v6 h-10Z", AC) });
  // 무릎 양말(무릎 아래까지)
  const lSock = "M512 1800 C540 1790 576 1792 590 1800 C584 1880 574 1960 570 2040 C568 2120 568 2180 570 2230 L512 2234 C508 2160 504 2080 504 2000 C504 1930 506 1860 512 1800 Z";
  const rSock = "M688 1800 C660 1790 624 1792 610 1800 C616 1880 626 1960 630 2040 C632 2120 632 2180 630 2230 L688 2234 C692 2160 696 2080 696 2000 C696 1930 694 1860 688 1800 Z";
  for (const [d, x0, x1] of [[rSock, 612, 688], [lSock, 512, 588]]) {
    s += S(d, "url(#yuri-sock)", { sh: "#151126", sx: -16, sy: -4, rw: 6,
      in: L(`M${x0 - 4} 1822 C${(x0 + x1) / 2} 1812 ${(x0 + x1) / 2} 1812 ${x1 + 4} 1822`, 6, AC) + L(`M${x0 - 4} 1842 C${(x0 + x1) / 2} 1832 ${(x0 + x1) / 2} 1832 ${x1 + 4} 1842`, 3, AC)
        + L(`M${x0 + 18} 1880 C${x0 + 14} 1980 ${x0 + 16} 2080 ${x0 + 22} 2180`, 4, "#fff", 0.35) });
    s += L(`M${x0} 1802 C${(x0 + x1) / 2} 1794 ${(x0 + x1) / 2} 1794 ${x1} 1802`, 2, "#6f5ea0", 0.9);
  }
  // 운동화 — 발끝을 안쪽으로
  const lShoe = "M508 2200 C530 2190 560 2190 576 2200 C584 2236 596 2264 616 2290 C634 2312 640 2340 630 2362 L618 2386 C580 2392 520 2392 488 2384 C476 2370 476 2340 486 2316 C496 2290 504 2250 508 2200 Z";
  const rShoe = "M692 2200 C670 2190 640 2190 624 2200 C616 2236 604 2264 584 2290 C566 2312 560 2340 570 2362 L582 2386 C620 2392 680 2392 712 2384 C724 2370 724 2340 714 2316 C704 2290 696 2250 692 2200 Z";
  for (const [d, m] of [[rShoe, -1], [lShoe, 1]]) {
    const X = (x) => m === 1 ? x : 1200 - x;
    s += `<g transform="translate(${X(556)} 2390) scale(1.14) translate(${-X(556)} -2390)">`;
    s += S(d, "#3a3060", { sh: "#1d1835", sx: -14 * m, sy: -6, rw: 6,
      in: F(`M${X(480)} 2340 C${X(530)} 2356 ${X(600)} 2356 ${X(640)} 2340 L${X(640)} 2394 L${X(480)} 2394 Z`, "#f4f0ff")
        + L(`M${X(482)} 2350 C${X(530)} 2366 ${X(600)} 2366 ${X(636)} 2350`, 3, O)
        + L(`M${X(486)} 2372 C${X(540)} 2380 ${X(600)} 2380 ${X(628)} 2372`, 2, "#b9b0d6")
        + F(`M${X(500)} 2290 C${X(520)} 2300 ${X(540)} 2320 ${X(550)} 2340 L${X(530)} 2342 C${X(520)} 2324 ${X(508)} 2310 ${X(494)} 2304Z`, AC)
        + F(`M${X(516)} 2214 C${X(530)} 2208 ${X(556)} 2208 ${X(566)} 2214 L${X(566)} 2226 C${X(552)} 2222 ${X(530)} 2222 ${X(516)} 2228Z`, "#f4f0ff")
        + F(`M${X(560)} 2250 C${X(574)} 2270 ${X(590)} 2290 ${X(606)} 2304 L${X(598)} 2312 C${X(582)} 2298 ${X(566)} 2278 ${X(552)} 2258Z`, "#fff", 0.45) });
    // 신발끈
    for (let i = 0; i < 3; i++) s += L(`M${X(538 + i * 12)} ${2234 + i * 22} l${16 * m} ${6}`, 3.5, "#f4f0ff") + L(`M${X(538 + i * 12)} ${2234 + i * 22} l${16 * m} ${6}`, 1, O, 0.6);
    s += `</g>`;
  }
  return s;
}

// 주름 치마(재킷 밑으로 살짝)
function skirt() {
  let s = "";
  const d = "M470 1286 L730 1286 C746 1336 758 1376 766 1412 L710 1406 L680 1422 L640 1412 L600 1426 L560 1412 L520 1422 L490 1406 L434 1412 C442 1376 454 1336 470 1286 Z";
  s += S(d, "#2c2547", { sh: "#16122a", sx: -18, sy: -6, rw: 6,
    in: L("M520 1306 L520 1422 M560 1306 L560 1412 M600 1306 L600 1426 M640 1306 L640 1412 M680 1306 L680 1422", 2, "#0c0a18", 0.7)
      + L("M444 1396 L490 1392 L520 1406 L560 1396 L600 1410 L640 1396 L680 1406 L710 1392 L756 1396", 3, AC) });
  return s;
}

// ── 몸통(오버사이즈 후드 재킷) ───────────────────────────────
function torso() {
  let s = "";
  const body = "M560 494 C520 504 474 518 450 556 C428 596 424 660 430 740 C436 860 432 1000 428 1120 C424 1200 422 1260 426 1312 C500 1328 560 1334 600 1334 C650 1334 710 1328 776 1312 C780 1260 778 1200 774 1120 C770 1000 766 860 772 740 C778 660 772 596 750 556 C726 518 680 504 640 494 Z";
  s += S(body, JK, { sh: JK2, sx: -34, sy: -12, rw: 9,
    in: F("M440 760 C446 880 444 1000 440 1120 L452 1120 C458 1000 460 880 454 760Z", AC, 0.95)
      + F("M760 760 C754 880 756 1000 760 1120 L748 1120 C742 1000 740 880 746 760Z", AC, 0.95)
      + L("M470 1000 C490 1100 500 1200 504 1280", 3, "#0e0a1c", 0.6) + L("M730 1000 C712 1100 700 1200 696 1280", 3, "#0e0a1c", 0.6)
      + L("M540 1150 C560 1180 580 1200 600 1204", 2.5, "#0e0a1c", 0.5) + L("M660 1150 C640 1180 620 1200 600 1204", 2.5, "#0e0a1c", 0.5)
      + F("M470 580 C500 556 540 548 570 552 C540 570 510 600 494 640Z", JK3, 0.6) });
  // 지퍼
  s += L("M600 520 L600 1312", 5, "#120d22") + L("M600 520 L600 1312", 1.6, "#a89cd0", 0.8);
  for (let y = 540; y < 1300; y += 14) s += L(`M596 ${y} h9`, 1.4, "#7d70a8", 0.8);
  // 주머니(캥거루)
  s += S("M488 1090 C540 1080 660 1080 712 1090 L724 1210 L476 1210 Z", JK, { sh: JK2, sx: -10, sy: -6, w: 3.5, rim: false,
    in: L("M492 1100 L478 1202 M708 1100 L722 1202", 2, "#9a86d6", 0.7) });
  s += L("M488 1090 C470 1130 470 1170 476 1210", 5, "#2a1f48") + L("M712 1090 C730 1130 730 1170 724 1210", 5, "#2a1f48");
  // 밑단 고무단
  s += S("M424 1276 C500 1292 560 1298 600 1298 C650 1298 710 1292 778 1276 L780 1324 C710 1340 650 1346 600 1346 C560 1346 500 1340 422 1324 Z", "#33275a", { sh: "#1a1430", sx: -12, sy: -4, w: 4,
    in: Array.from({ length: 24 }, (_, i) => L(`M${436 + i * 14.5} 1286 l0 50`, 1.3, "#0e0a1c", 0.6)).join("") + L("M426 1290 C500 1306 700 1306 776 1290", 3, AC) });
  // 안쪽 셔츠 깃(목 아래)
  s += S("M560 494 C574 520 588 532 600 534 C612 532 626 520 640 494 C626 500 612 504 600 504 C588 504 574 500 560 494 Z", "#f2eefc", { w: 3.5, rim: false });
  return s;
}

// 후드 끈
function strings() {
  let s = "";
  for (const [x0, x1, y1] of [[578, 566, 680], [622, 640, 690]]) {
    s += L(`M${x0} 520 C${x0 - 4} 580 ${x1 + 4} 630 ${x1} ${y1}`, 7, O) + L(`M${x0} 520 C${x0 - 4} 580 ${x1 + 4} 630 ${x1} ${y1}`, 4, "#efe8ff");
    s += S(`M${x1 - 6} ${y1 - 4} h12 v24 c0 6 -12 6 -12 0 Z`, MT, { w: 2.5, rim: false, in: F(`M${x1 - 6} ${y1 + 12} h12 v8 h-12Z`, AC) });
  }
  return s;
}

// 태블릿(뒷면이 보이게 끌어안음)
function tablet() {
  const cx = 600, cy = 800, w = 240, h = 310, a = -10 * Math.PI / 180;
  const P = (x, y) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  const rr = (hw, hh, r) => {
    const pts = [[-hw + r, -hh], [hw - r, -hh], [hw, -hh], [hw, -hh + r], [hw, hh - r], [hw, hh], [hw - r, hh], [-hw + r, hh], [-hw, hh], [-hw, hh - r], [-hw, -hh + r], [-hw, -hh]].map(([x, y]) => P(x, y).map(r1).join(" "));
    return `M${pts[0]} L${pts[1]} Q${pts[2]} ${pts[3]} L${pts[4]} Q${pts[5]} ${pts[6]} L${pts[7]} Q${pts[8]} ${pts[9]} L${pts[10]} Q${pts[11]} ${pts[0]} Z`;
  };
  let s = "";
  s += S(rr(w / 2, h / 2, 22), "url(#yuri-tab)", { sh: "#1a1b2c", sx: -14, sy: -10, w: 5, rw: 8,
    in: F(rr(w / 2 - 10, h / 2 - 10, 16), "none") });
  s += L(rr(w / 2 - 12, h / 2 - 12, 14), 2, "#7d80a8", 0.8);
  // 광택
  const g1 = P(-100, -150), g2 = P(-40, -150), g3 = P(-110, -40), g4 = P(-110, -90);
  s += F(`M${g1.map(r1).join(" ")} L${g2.map(r1).join(" ")} L${g3.map(r1).join(" ")} L${g4.map(r1).join(" ")} Z`, "#fff", 0.18);
  // 스티커: 휘장(마름모 날개), 별, 코드 괄호, 고양이 없는 독자 디자인의 작은 유령 캐릭터
  const [ex, ey] = P(-30, -90);
  s += `<g transform="translate(${r1(ex)} ${r1(ey)}) rotate(-10)">` + S("M0 -44 L38 0 L0 44 L-38 0 Z", "#1c1830", { w: 3.5, rim: false }) + L("M0 -34 L28 0 L0 34 L-28 0 Z", 2.5, AC)
    + F("M-22 3 C-11 -11 -3 -14 0 -8 C3 -14 11 -11 22 3 C11 0 5 3 0 8 C-5 3 -11 0 -22 3 Z", "#f0e0ff") + `</g>`;
  const [sx1, sy1] = P(70, -120);
  s += `<g transform="translate(${r1(sx1)} ${r1(sy1)}) rotate(14)">` + S("M0 -20 L6 -6 L21 -6 L9 3 L13 18 L0 9 L-13 18 L-9 3 L-21 -6 L-6 -6 Z", "#ffd36a", { w: 3, rim: false }) + `</g>`;
  const [sx2, sy2] = P(60, 100);
  s += `<g transform="translate(${r1(sx2)} ${r1(sy2)}) rotate(-18)">` + S("M-34 -18 h68 v36 h-68 Z", "#2b2a44", { w: 3, rim: false }) + L("M-16 -8 l-10 8 l10 8 M16 -8 l10 8 l-10 8 M6 -12 l-12 24", 3, "#7fffd4") + `</g>`;
  // 카메라
  const [cmx, cmy] = P(-80, -120);
  s += `<circle cx="${r1(cmx)}" cy="${r1(cmy)}" r="11" fill="#14141f" stroke="${O}" stroke-width="3"/><circle cx="${r1(cmx - 3)}" cy="${r1(cmy - 3)}" r="3.5" fill="#8a8fd0"/>`;
  return s;
}

// 팔(오버사이즈 소매)
function arms() {
  let s = "";
  // 화면 왼쪽 위팔
  s += S("M454 546 C410 568 392 630 390 700 C388 770 394 830 408 880 L488 884 C490 820 492 760 490 700 C488 640 482 590 470 556 Z", JK, { sh: JK2, sx: -18, sy: -10, rw: 7,
    in: L("M410 760 C430 770 446 772 460 768", 2.5, "#0e0a1c", 0.6) + L("M404 820 C424 836 450 840 476 836", 2.5, "#0e0a1c", 0.6) + F("M400 640 C398 700 400 760 408 820 L416 820 C410 760 408 700 410 640Z", AC) });
  // 화면 오른쪽 위팔
  s += S("M732 548 C778 566 802 622 808 692 C814 762 814 830 806 890 L726 884 C724 822 718 762 716 702 C714 642 718 592 732 548 Z", JK, { sh: JK2, sx: -18, sy: -10, rw: 9,
    in: L("M790 770 C774 778 758 780 742 776", 2.5, "#0e0a1c", 0.6) + F("M796 640 C800 700 802 760 800 820 L792 820 C794 760 792 700 788 640Z", AC) });
  // 화면 오른쪽 아래팔 — 태블릿 아래쪽을 가로질러 왼쪽 모서리를 쥠
  s += S("M806 852 C812 914 780 946 720 950 C670 954 610 954 562 954 L556 870 C604 870 660 866 712 862 C750 858 780 846 806 852 Z", JK, { sh: JK2, sx: -14, sy: -14, rw: 9,
    in: L("M740 870 C746 900 744 924 736 944", 2.5, "#0e0a1c", 0.6) + L("M690 872 C694 900 694 924 690 950", 2, "#0e0a1c", 0.5) + L("M800 880 C790 900 780 910 766 916", 2.5, "#0e0a1c", 0.6) });
  // 소매 끝(고무단)
  s += S("M570 862 L548 864 C538 890 538 930 548 958 L572 956 C564 928 562 892 570 862 Z", "#33275a", { w: 3.5, rim: false, in: L("M558 866 C550 892 550 928 558 956", 2, AC) });
  // 손등 + 모서리를 감싼 손가락
  s += finger(500, 880, 488, 894, 8, 7, { nail: false, joints: [] });
  s += finger(498, 900, 486, 912, 8.5, 7.5, { nail: false, joints: [] });
  s += finger(500, 920, 488, 930, 8.5, 7.5, { nail: false, joints: [] });
  s += finger(504, 938, 494, 946, 7.5, 6.5, { nail: false, joints: [] });
  s += S("M548 870 C530 868 512 872 500 882 C494 900 494 924 502 944 C516 954 534 956 550 954 C542 926 542 896 548 870 Z", SK, { sh: SK2, sx: -6, sy: -6, w: 3.5, rw: 4,
    in: L("M506 892 C512 890 518 890 522 894 M506 912 C512 910 518 910 522 914 M508 932 C514 930 520 930 524 934", 1.5, SK3, 0.8) });
  // 손목 단말기(오른팔 소매 위, 손목 가까이)
  s += S("M586 858 L640 856 L644 956 L590 958 Z", "#1e1b30", { sh: "#0d0b18", sx: -6, sy: -6, w: 3.5,
    in: F("M596 872 L632 870 L634 940 L598 942 Z", "#2a1f4a") + F("M596 872 L632 870 L634 940 L598 942 Z", "url(#yuri-glow)", 0.85)
      + L("M602 884 l24 -1 M602 896 l16 0 M602 908 l22 -1 M602 920 l12 0", 2, "#f3e3ff") + `<circle cx="626" cy="930" r="3.5" fill="#7fffd4"/>` });
  s += F("M614 906 m-56 0 a56 56 0 1 0 112 0 a56 56 0 1 0 -112 0", "url(#yuri-glow)", 0.3);
  // 화면 왼쪽 아래팔 — 태블릿 오른쪽 위 모서리로 비스듬히
  s += S("M404 862 C424 914 476 906 528 860 C566 826 610 790 652 762 L612 684 C572 712 526 748 484 784 C446 814 412 830 404 862 Z", JK, { sh: JK2, sx: -14, sy: -14, rw: 8,
    in: L("M450 820 C466 842 474 864 474 884", 2.5, "#0e0a1c", 0.6) + L("M520 780 C534 796 542 814 544 832", 2, "#0e0a1c", 0.5) + L("M580 730 C592 744 598 760 600 776", 2, "#0e0a1c", 0.5)
      + F("M420 840 C470 800 540 740 610 690 L614 700 C544 750 474 810 426 852Z", "#7a63b8", 0.5) });
  s += S("M606 688 L626 676 C648 692 664 722 668 752 L648 766 C642 738 628 708 606 688 Z", "#33275a", { w: 3.5, rim: false, in: L("M616 684 C636 702 650 728 656 756", 2, AC) });
  // 손 — 태블릿 오른쪽 가장자리를 감쌈
  s += finger(712, 668, 726, 676, 7.5, 6.5, { nail: false, joints: [] });
  s += finger(716, 688, 730, 694, 8, 7, { nail: false, joints: [] });
  s += finger(718, 708, 732, 712, 8, 7, { nail: false, joints: [] });
  s += finger(718, 728, 730, 730, 7, 6, { nail: false, joints: [] });
  s += S("M628 680 C650 664 680 656 706 660 C718 676 722 708 720 736 C700 748 676 756 654 762 C650 732 642 702 628 680 Z", SK, { sh: SK2, sx: -6, sy: -6, w: 3.5, rw: 4,
    in: L("M690 672 C698 672 704 676 706 682 M694 696 C702 696 708 700 710 706 M696 718 C704 718 708 722 710 728", 1.5, SK3, 0.8) });
  // 단말기 케이블 — 태블릿 위쪽 포트로 고리 지며
  const cab = "M644 900 C690 900 740 880 770 840 C800 800 840 780 846 730 C852 680 820 640 790 640 C770 640 760 646 744 652";
  s += L(cab, 7, O) + L(cab, 3.5, "#5a4f86") + L(cab, 1.2, AC, 0.9);
  return s;
}

// 떠 있는 홀로그램 창(반투명)
function holo(x, y, w, h, rot, kind) {
  let s = `<g transform="translate(${x} ${y}) rotate(${rot})" opacity=".92">`;
  s += `<rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="${AC}" fill-opacity=".13" stroke="#e8d0ff" stroke-width="3"/>`;
  s += `<rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="none" stroke="${AC}" stroke-width="9" stroke-opacity=".25"/>`;
  s += `<rect x="0" y="0" width="${w}" height="26" rx="10" fill="${AC}" fill-opacity=".45"/>`;
  for (let i = 0; i < 3; i++) s += `<circle cx="${w - 18 - i * 16}" cy="13" r="5" fill="#fff" fill-opacity=".8"/>`;
  if (kind === "code") {
    const ws = [0.7, 0.45, 0.8, 0.35, 0.6, 0.5, 0.75];
    ws.forEach((k, i) => { if (40 + i * 18 < h - 10) s += `<rect x="${16 + (i % 3) * 14}" y="${40 + i * 18}" width="${(w - 50) * k}" height="7" rx="3" fill="${i % 2 ? "#8fe8ff" : "#f0dcff"}" fill-opacity=".8"/>`; });
  } else if (kind === "wave") {
    let d = `M14 ${h / 2 + 14}`;
    for (let i = 1; i <= 24; i++) d += ` L${14 + i * (w - 28) / 24} ${h / 2 + 14 + Math.sin(i * 1.3) * (h / 4) * (i % 3 ? 1 : 0.4)}`;
    s += `<path d="${d}" fill="none" stroke="#8fe8ff" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="M14 ${h - 16} L${w - 14} ${h - 16}" stroke="#f0dcff" stroke-width="1.5" stroke-opacity=".6"/>`;
  } else {
    s += `<g transform="translate(${w / 2} ${h / 2 + 12})"><path d="M0 -${h / 3} L${h / 3.4} 0 L0 ${h / 3} L-${h / 3.4} 0 Z" fill="none" stroke="#f0dcff" stroke-width="3"/><path d="M-${h / 6} 2 C-${h / 12} -${h / 12} 0 -${h / 12} 0 -4 C0 -${h / 12} ${h / 12} -${h / 12} ${h / 6} 2 C${h / 12} 0 0 4 0 8 C0 4 -${h / 12} 0 -${h / 6} 2Z" fill="#8fe8ff"/>`;
    s += `<circle r="${h / 2.6}" fill="none" stroke="#8fe8ff" stroke-width="2" stroke-dasharray="8 6"/></g>`;
  }
  return s + `</g>`;
}

// 목에 건 헤드폰
function headphones() {
  let s = "";
  s += L("M500 556 C520 600 560 620 600 622 C640 620 680 600 700 556", 12, O) + L("M500 556 C520 600 560 620 600 622 C640 620 680 600 700 556", 7, "#3a3460");
  for (const [x, r] of [[492, 18], [708, -18]]) {
    s += `<g transform="translate(${x} 556) rotate(${r})">`;
    s += S("M-44 -30 C-44 -50 44 -50 44 -30 L44 30 C44 50 -44 50 -44 30 Z", "#2a2546", { sh: "#14112a", sx: -8, sy: -8, w: 4.5,
      in: F("M-36 -36 C-20 -44 10 -44 24 -38 L20 -28 C6 -34 -20 -34 -32 -26Z", "#a9a0d6", 0.7) });
    s += S("M-30 -18 C-30 -30 30 -30 30 -18 L30 18 C30 30 -30 30 -30 18 Z", "#1c1830", { w: 3, rim: false,
      in: `<circle cx="0" cy="0" r="22" fill="url(#yuri-glow)"/>` });
    s += L("M-14 0 L0 -12 L14 0 L0 12 Z", 3, "#f3e3ff");
    s += `</g>`;
  }
  return s;
}

function neck() {
  return S("M574 410 C576 440 574 470 566 500 C586 510 614 510 634 500 C626 470 624 440 626 410 Z", SK, { w: 4, rw: 5,
    in: F("M560 410 C580 456 620 456 640 410 L640 470 C620 480 580 480 560 470Z", SK2) });
}

// ── 머리 ─────────────────────────────────────────────────────
function backHair() {
  let s = "";
  // 경단 두 개
  for (const [x, m] of [[486, 1], [714, -1]]) {
    s += S(`M${x - 50} 136 C${x - 52} 92 ${x - 20} 70 ${x} 70 C${x + 26} 70 ${x + 52} 94 ${x + 50} 134 C${x + 48} 168 ${x + 20} 186 ${x} 186 C${x - 24} 186 ${x - 48} 170 ${x - 50} 136 Z`, HB, { sh: HS, sx: -14, sy: -12, rw: 6, rim: m < 0,
      in: L(`M${x - 34} 120 C${x - 20} 96 ${x + 14} 92 ${x + 30} 110`, 2, O, 0.5) + L(`M${x - 40} 150 C${x - 20} 120 ${x + 20} 118 ${x + 40} 146`, 2, O, 0.45)
        + L(`M${x - 24} 88 C${x - 10} 80 ${x + 6} 80 ${x + 18} 86`, 5, "#fff", 0.6) + L(`M${x - 38} 132 C${x - 28} 116 ${x - 14} 108 ${x} 106`, 4, "#fff", 0.45) });
  }
  // 뒷머리(단발)
  s += S("M600 96 C704 94 764 160 772 254 C780 330 790 384 772 424 C760 448 734 456 708 448 C722 420 720 380 710 330 L700 300 L502 300 L492 330 C482 380 480 420 494 448 C468 456 442 448 430 424 C412 384 422 330 430 254 C438 160 496 96 600 96 Z", "#7a55c4", { sh: HD, sx: -14, sy: -6, rw: 7,
    in: L("M450 300 C444 350 446 400 460 436", 2, O, 0.5) + L("M752 300 C758 350 756 400 742 436", 2, O, 0.5) + L("M446 260 C440 320 444 380 452 420", 4, "#c9b0ff", 0.5) });
  return s;
}

function face(expr) {
  let s = "";
  s += S("M700 282 C718 270 732 286 726 312 C722 332 710 342 696 340 Z", SK, { w: 3.5, sh: SK2, sx: -6, sy: -4, in: L("M706 294 C716 294 718 310 710 322", 2, SK3) });
  s += S("M502 282 C484 270 470 286 476 312 C480 332 492 342 506 340 Z", SK, { w: 3.5, sh: SK2, sx: -6, sy: -4, rim: false });
  const fc = "M498 222 C494 304 508 348 540 382 C562 404 582 414 600 415 C620 414 640 404 662 382 C694 348 708 304 704 222 C702 150 652 120 600 120 C548 120 500 150 498 222 Z";
  s += S(fc, "url(#yuri-skin)", { sh: SK2, sx: -14, sy: -6, rw: 5, ro: 0.6, w: 4.5,
    in: F("M498 214 C540 244 660 244 704 214 L704 276 C660 254 540 254 498 276 Z", SK2, 0.75) });
  const bo = { smile: 1, sad: 0.8, surprise: 0.9, angry: 0.9, serious: 0.55 }[expr] ?? 0.85;
  s += `<ellipse cx="538" cy="350" rx="36" ry="16" fill="url(#yuri-blush)" opacity="${bo}"/><ellipse cx="664" cy="350" rx="36" ry="16" fill="url(#yuri-blush)" opacity="${bo}"/>`;
  if (expr !== "serious") for (let i = 0; i < 3; i++) s += L(`M${524 + i * 11} 352 l-6 9 M${650 + i * 11} 352 l-6 9`, 1.8, "#e86a8a", 0.75);
  s += L("M604 336 C606 344 604 350 599 353", 2.2, SK3);
  s += eyes(expr);
  s += mouth(expr);
  if (expr === "angry") s += L("M694 200 l10 -14 m-14 6 l14 6 m-6 -16 l2 20", 3, "#e0465a");
  if (expr === "surprise") s += L("M720 170 l22 -16 M728 196 l28 -4 M712 146 l8 -24", 3.5, O);
  if (expr === "sad") s += `<path d="M522 340 C514 360 516 376 526 380 C536 376 536 360 522 340 Z" fill="#d6f2ff" stroke="#6aa8e0" stroke-width="2"/><path d="M684 344 C678 358 680 368 686 371 C692 368 692 358 684 344 Z" fill="#d6f2ff" stroke="#6aa8e0" stroke-width="2"/>`;
  if (expr === "normal" || expr === "sad") s += `<path d="M716 236 C722 250 722 262 714 268 C706 262 708 250 716 236 Z" fill="#cfefff" stroke="#5aa0d8" stroke-width="2"/>`; // 식은땀
  return s;
}

function eye(p) {
  const t0 = p.tO ?? 0, t1 = p.tI ?? 0, lw = p.low ?? 0, k = p.iris ?? 1;
  const tm = (t0 + t1) / 2;
  const up = `M-38 ${-4 + t0} C-30 ${-24 + t0} -6 ${-32 + tm} 14 ${-30 + t1} C26 ${-29 + t1} 34 ${-20 + t1} 36 ${-8 + t1 * 0.6}`;
  const white = `${up} C36 ${4} 30 ${14 - lw} 22 ${18 - lw} C6 ${24 - lw} -16 ${24 - lw} -30 ${12 - lw * 0.6} C-36 ${6} -38 ${0 + t0 * 0.5} -38 ${-4 + t0} Z`;
  const id = nid();
  defs.push(`<clipPath id="${id}"><path d="${white}"/></clipPath>`);
  let s = `<path d="${white}" fill="#fbf8ff"/>`;
  s += `<g clip-path="url(#${id})">`;
  s += F(`M-40 -40 L40 -40 L40 ${-14 + tm} C20 ${-20 + tm} -20 ${-18 + tm} -40 ${-6 + tm} Z`, "#cdbfe6", 0.8);
  const iy = 2 + (p.iy ?? 0);
  s += `<ellipse cx="0" cy="${iy}" rx="${22 * k}" ry="${28 * k}" fill="url(#yuri-iris)" stroke="#24104a" stroke-width="2.4"/>`;
  s += `<ellipse cx="0" cy="${iy + 8 * k}" rx="${15 * k}" ry="${12 * k}" fill="#e6b8ff" opacity=".45"/>`;
  s += `<ellipse cx="0" cy="${iy - 1}" rx="${8.5 * k}" ry="${12.5 * k}" fill="#1a0b36"/>`;
  s += F(`M-24 ${-30 + tm} L24 ${-30 + tm} L24 ${-8 + tm} C10 ${-14 + tm} -10 ${-14 + tm} -24 ${-8 + tm} Z`, "#1a0b36", 0.5);
  for (let a = -60; a <= 60; a += 30) s += L(`M${r1(Math.sin(a * Math.PI / 180) * 9 * k)} ${r1(iy + 10 * k)} L${r1(Math.sin(a * Math.PI / 180) * 17 * k)} ${r1(iy + 20 * k)}`, 1.2, "#f3dcff", 0.6);
  s += `<path d="M${-16 * k} ${iy + 10 * k} C${-10 * k} ${iy + 24 * k} ${10 * k} ${iy + 24 * k} ${16 * k} ${iy + 10 * k} C${8 * k} ${iy + 18 * k} ${-8 * k} ${iy + 18 * k} ${-16 * k} ${iy + 10 * k} Z" fill="#fbeaff" opacity=".85"/>`;
  s += `<ellipse cx="${-12 * k}" cy="${iy + 8 * k}" rx="${3 * k}" ry="${5 * k}" fill="#ffb8f0" opacity=".9"/>`;
  s += `<ellipse cx="${-8 * k}" cy="${iy - 11 * k}" rx="${7.5 * k}" ry="${9.5 * k}" fill="#fff" transform="rotate(-20 ${-8 * k} ${iy - 11 * k})"/>`;
  s += `<circle cx="${9 * k}" cy="${iy + 12 * k}" r="${3.6 * k}" fill="#fff" opacity=".95"/>`;
  s += `<circle cx="${11 * k}" cy="${iy - 12 * k}" r="${2.2 * k}" fill="#fff" opacity=".9"/>`;
  const star = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * .28} ${y - r * .28} L${x + r} ${y} L${x + r * .28} ${y + r * .28} L${x} ${y + r} L${x - r * .28} ${y + r * .28} L${x - r} ${y} L${x - r * .28} ${y - r * .28} Z" fill="#fff"/>`;
  s += star(14 * k, iy - 1 * k, 6 * k);
  if (p.spark) s += star(-6 * k, iy + 6 * k, 9 * k) + star(10 * k, iy - 16 * k, 5 * k);
  if (p.wet) s += `<path d="M-22 16 C-10 22 10 22 22 14" fill="none" stroke="#fff" stroke-width="3" opacity=".85"/>`;
  s += `</g>`;
  s += L(`M-30 ${12 - lw * 0.6} C-16 ${24 - lw} 6 ${24 - lw} 22 ${18 - lw}`, 1.8, "#3a2a40", 0.85);
  s += `<path d="${up} C34 ${-14 + t1} 30 ${-22 + t1} 14 ${-24 + t1} C-4 ${-26 + tm} -28 ${-20 + t0} -38 ${-4 + t0} Z" fill="#1a1626" stroke="#1a1626" stroke-width="5" stroke-linejoin="round"/>`;
  s += F(`M-36 ${-4 + t0} C-42 ${-4 + t0} -48 ${-2 + t0} -50 ${2 + t0} C-44 ${2 + t0} -40 ${4 + t0} -36 ${6 + t0} Z`, "#1a1626");
  s += F(`M-30 ${-18 + t0} C-38 ${-24 + t0} -42 ${-26 + t0} -46 ${-26 + t0} C-42 ${-20 + t0} -38 ${-14 + t0} -34 ${-12 + t0} Z`, "#1a1626");
  s += L(`M-30 ${-30 + t0 * 0.8} C-14 ${-42 + tm * 0.8} 10 ${-42 + tm * 0.8} 28 ${-32 + t1 * 0.8}`, 2.2, "#5a3a58", 0.75);
  return s;
}

function eyes(expr) {
  const E = {
    normal: { tO: 2, tI: 0 },
    smile: { tO: 2, tI: 2, low: 5, spark: true },
    angry: { tO: 0, tI: 12, low: 3, iris: 0.92 },
    sad: { tO: 8, tI: 0, wet: true, iy: 3 },
    surprise: { tO: -6, tI: -6, low: -3, iris: 0.72 },
    serious: { tO: 9, tI: 8, low: 5 },
  }[expr];
  if (expr === "smile") { // 눈웃음 대신 반짝이는 큰 눈 + 반달 아래 눈꺼풀
  }
  return `<g transform="translate(550 306) scale(1.2) rotate(-6)">${eye(E)}</g><g transform="translate(652 306) scale(-1.2 1.2) rotate(-6)">${eye(E)}</g>`;
}

function brows(expr) {
  const B = { normal: [-48, -62, -64], smile: [-54, -68, -66], angry: [-62, -60, -42], sad: [-46, -58, -74], surprise: [-68, -82, -78], serious: [-54, -60, -52] }[expr];
  const one = `<path d="M-42 ${B[0]} C-24 ${B[1] - 3} 8 ${B[1]} 30 ${B[2]} C10 ${B[1] + 3} -22 ${B[1] + 2} -42 ${B[0]} Z" fill="#3c2470" stroke="#22123f" stroke-width="2" stroke-linejoin="round" opacity=".95"/>`;
  return `<g transform="translate(550 306) scale(1.05)">${one}</g><g transform="translate(652 306) scale(-1.05 1.05)">${one}</g>`;
}

function mouth(expr) {
  switch (expr) {
    case "smile":
      return `<path d="M582 372 C590 392 610 392 618 372 C606 377 594 377 582 372 Z" fill="#b8475c" stroke="${O}" stroke-width="2.8" stroke-linejoin="round"/>` + F("M592 384 C598 388 604 388 610 382 C604 384 598 384 592 384Z", "#ff9aa6", 0.9);
    case "angry":
      return `<path d="M582 382 C590 368 610 368 618 382 C606 378 594 378 582 382 Z" fill="#7a2638" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>` + `<path d="M588 376 C596 371 604 371 612 376 L611 379 C604 377 596 377 589 379 Z" fill="#fff"/>` + L("M578 386 l6 -4 M622 386 l-6 -4", 2.4, O);
    case "sad":
      return L("M588 380 C594 372 606 372 612 380", 3, O);
    case "surprise":
      return `<path d="M590 374 C590 360 610 360 610 374 C610 392 590 392 590 374 Z" fill="#6e2236" stroke="${O}" stroke-width="3"/>` + F("M594 386 C597 381 603 381 606 386 C603 389 597 389 594 386Z", "#e0707e");
    case "serious":
      return L("M588 376 C596 374 604 374 612 376", 3, O);
    default: // 소심한 물결 입
      return L("M586 376 C590 372 594 372 598 376 C602 380 606 380 612 375", 2.8, O);
  }
}

function frontHair() {
  let s = "";
  // 정수리
  s += S("M488 264 C472 150 534 96 604 94 C682 94 736 150 718 268 C704 204 664 150 602 146 C546 148 502 200 488 264 Z", HB, { sh: HS, sx: -20, sy: -14, rim: false,
    in: L("M600 98 C580 120 556 150 540 190", 2, O, 0.5) + L("M600 98 C626 120 650 150 664 190", 2, O, 0.5) });
  // 옆머리 — 턱선에서 안쪽으로 말림
  s += clump(496, 186, 534, 210, 494, 436, -46, 0, { sx: -8, fat: 0.1 });
  s += clump(500, 214, 538, 236, 530, 420, -22, 0, { fill: "#9a74e2", fat: 0.08 });
  s += clump(704, 186, 666, 210, 706, 436, 46, 0, { rim: true, rw: 7, sx: -14, fat: 0.1 });
  s += clump(700, 214, 662, 236, 670, 420, 22, 0, { fill: "#9a74e2", rim: true, rw: 5, fat: 0.08 });
  // 앞머리 바탕 — 눈썹을 덮는 두꺼운 앞머리
  s += S("M494 256 C498 168 560 116 604 112 C650 116 708 168 710 256 L692 262 L676 236 L656 284 L632 248 L604 290 L580 248 L552 286 L530 238 L512 266 Z", HS, { w: 0, rim: false, in: F("M494 200 C560 150 650 150 712 200 L712 110 L494 110Z", "#ab88ee") });
  s += clump(560, 146, 620, 140, 508, 272, -18, -4, { fat: 0.1 });
  s += clump(584, 140, 640, 144, 552, 292, -8, 0, { fat: 0.1 });
  s += clump(578, 140, 630, 140, 604, 294, -2, 0, { fill: "#c3a4ff", fat: 0.1 });
  s += clump(570, 144, 626, 140, 656, 290, 8, 0, { fat: 0.1 });
  s += clump(590, 140, 650, 146, 696, 266, 18, -4, { fat: 0.1, rim: true, rw: 5 });
  // 짧은 삐침 머리
  s += S("M592 100 C584 76 596 56 616 50 C608 66 608 82 614 98 Z", HB, { w: 3, rim: false });
  // 잔머리
  s += L("M576 160 C566 210 560 250 566 300", 2.2, O, 0.85) + L("M630 160 C640 210 646 250 640 300", 2.2, O, 0.85);
  s += gloss(604, 246, 98, 80, 218, 322, 5, 12);
  // 경단 머리끈(포인트 색 고리 + 작은 장식)
  for (const [x, a] of [[500, -28], [700, 28]]) {
    s += `<g transform="translate(${x} 168) rotate(${a})">` + S("M-36 -8 C-20 -18 20 -18 36 -8 L34 8 C20 0 -20 0 -34 8 Z", AC, { w: 3.5, sh: "#8a4fc0", sx: -4, sy: -4, rim: false, in: L("M-30 -6 C-14 -14 14 -14 30 -6", 2, "#f1dcff") })
      + `<circle cx="0" cy="-2" r="7" fill="${MT}" stroke="${O}" stroke-width="2.5"/>` + `</g>`;
  }
  return s;
}

// 둥근 안경
function glasses() {
  let s = "";
  for (const x of [550, 652]) {
    s += `<circle cx="${x}" cy="304" r="50" fill="url(#yuri-lens)"/>`;
    s += F(`M${x - 34} ${304 - 20} L${x - 18} ${304 - 38} L${x - 10} ${304 - 34} L${x - 28} ${304 - 14} Z`, "#fff", 0.55);
    s += F(`M${x + 20} ${304 + 26} L${x + 32} ${304 + 12} L${x + 36} ${304 + 16} L${x + 24} ${304 + 30} Z`, "#fff", 0.4);
    s += `<circle cx="${x}" cy="304" r="50" fill="none" stroke="${O}" stroke-width="6"/><circle cx="${x}" cy="304" r="50" fill="none" stroke="#8a6ad0" stroke-width="2"/>`;
    s += `<path d="M${x - 40} 274 A50 50 0 0 1 ${x + 10} 254" fill="none" stroke="#e6d6ff" stroke-width="2.5"/>`;
  }
  s += L("M592 296 C598 288 604 288 610 296", 6, O) + L("M592 296 C598 288 604 288 610 296", 2, "#8a6ad0");
  s += L("M500 298 L486 292 M702 298 L716 292", 5, O);
  return s;
}

export function svg(expr = "normal") {
  defs = []; uid = 0;
  let b = "";
  b += holo(150, 360, 250, 170, -8, "code");
  b += holo(842, 300, 220, 150, 7, "emblem");
  b += holo(830, 1060, 260, 160, -5, "wave");
  b += legs();
  b += skirt();
  const WIDE = (x) => `<g transform="translate(600 0) scale(1.1 1) translate(-600 0)">${x}</g>`;
  b += WIDE(hood() + torso() + strings());
  b += neck();
  // 머리(살짝 갸웃 — 소심하게 고개를 기울임)
  let h = "";
  h += backHair();
  h += face(expr);
  h += frontHair();
  h += brows(expr);
  h += glasses();
  b += `<g transform="rotate(-4 600 470) matrix(1.1 0 0 1.1 -60 -12)">${h}</g>`;
  b += WIDE(headphones() + tablet() + arms());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${gradients()}${defs.join("")}</defs>${b}</svg>`;
}
