// 차도윤 — 엘리트 라이벌 파일럿 (전신 입간판, viewBox 0 0 1200 2400)
export const ID = "doyun", NAME = "차도윤";

const INK = "#1a1626";
const P = "doyun-";
// 팔레트
const SK = { b: "#fde4d6", s: "#f0b4a6", d: "#d98c86", h: "#fff6f0" };
const HR = { b: "#eef2f9", s: "#b4bfd8", d: "#7f8aac", h: "#ffffff" };
const SU = { b: "#2c2b40", s: "#1b1a29", d: "#121120", h: "#4b4a66" };
const GD = { b: "#e0b84a", s: "#a57b25", h: "#fff0b4" };
const SC = { b: "#f7f8fc", s: "#ccd2e4", d: "#98a2c0" };
const GL = { b: "#f4f5f9", s: "#c3c8da", d: "#9aa0b8" };
const RIM = "#8fe8ff";

// ── 도구 ────────────────────────────────────────────
const f = (n) => Math.round(n * 10) / 10;
const path = (d, fill, sw = 4, extra = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
const fillp = (d, fill, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const line = (d, sw = 2.5, col = INK, extra = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
let clipN = 0;
const clips = [];
// 기본 도형 + 그 안에만 그려지는 음영
function part(d, fill, inner, sw = 4) {
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
  return fillp(d, fill) + `<g clip-path="url(#${id})">${inner}</g>` + path(d, "none", sw);
}
function clipGroup(ds, inner) {
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}">${ds.map((d) => `<path d="${d}"/>`).join("")}</clipPath>`);
  return `<g clip-path="url(#${id})">${inner}</g>`;
}
// 여러 도형의 합집합 외곽선만 그리기 (안쪽 선 없음) + 내부 음영
function union(ds, fill, inner = "", sw = 4.5) {
  return ds.map((d) => `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${sw * 2}" stroke-linejoin="round"/>`).join("") +
    ds.map((d) => fillp(d, fill)).join("") + (inner ? clipGroup(ds, inner) : "");
}
// 둥근 획 손가락: 점 목록을 따라 굵기 w
function fing(pts, w, fill = GL.b, sh = GL.s) {
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  return line(d, w + 6, INK) + line(d, w, fill) + `<path d="${d}" fill="none" stroke="${sh}" stroke-width="${w * 0.35}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${w * 0.22} ${w * 0.1})"/>`;
}
// 머리카락 덩어리(잎 모양): 밑변 b1-b2, 끝 t, 휨 k
function leaf(b1, b2, t, k = 0, k2 = k) {
  const mx = (b1[0] + b2[0]) / 2, my = (b1[1] + b2[1]) / 2;
  const dx = t[0] - mx, dy = t[1] - my, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const c1 = [(b1[0] + t[0]) / 2 + nx * k, (b1[1] + t[1]) / 2 + ny * k];
  const c2 = [(b2[0] + t[0]) / 2 + nx * k2, (b2[1] + t[1]) / 2 + ny * k2];
  return `M${f(b1[0])} ${f(b1[1])} Q${f(c1[0])} ${f(c1[1])} ${f(t[0])} ${f(t[1])} Q${f(c2[0])} ${f(c2[1])} ${f(b2[0])} ${f(b2[1])}Z`;
}
// 손가락(캡슐): 시작점에서 끝점까지, 굵기 w
function finger(x1, y1, x2, y2, w, fill = GL.b) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  const ex = (dx / L) * w * 0.55, ey = (dy / L) * w * 0.55;
  const d = `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} C${f(x2 + nx + ex)} ${f(y2 + ny + ey)} ${f(x2 - nx + ex)} ${f(y2 - ny + ey)} ${f(x2 - nx)} ${f(y2 - ny)} L${f(x1 - nx)} ${f(y1 - ny)}`;
  return fillp(d + "Z", fill) + fillp(`M${f(x1 - nx)} ${f(y1 - ny)} L${f(x2 - nx)} ${f(y2 - ny)} C${f(x2 - nx * 0.2 + ex)} ${f(y2 - ny * 0.2 + ey)} ${f(x2 - nx * 0.2)} ${f(y2 - ny * 0.2)} ${f(x2 - nx * 0.2)} ${f(y2 - ny * 0.2)} L${f(x1 - nx * 0.2)} ${f(y1 - ny * 0.2)}Z`, GL.s, ` opacity="0.9"`) + line(d, 3);
}

// ── 그라데이션 정의 ─────────────────────────────────
const defs = () => `
<linearGradient id="${P}hair" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="${HR.b}"/><stop offset="1" stop-color="#c3cce2"/></linearGradient>
<linearGradient id="${P}hairBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d1e6"/><stop offset="1" stop-color="#8d97b8"/></linearGradient>
<linearGradient id="${P}skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0e6"/><stop offset="0.6" stop-color="${SK.b}"/><stop offset="1" stop-color="#f6cdbf"/></linearGradient>
<linearGradient id="${P}suit" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#3b3a55"/><stop offset="0.5" stop-color="${SU.b}"/><stop offset="1" stop-color="#1f1e2e"/></linearGradient>
<linearGradient id="${P}leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3953"/><stop offset="0.55" stop-color="${SU.b}"/><stop offset="1" stop-color="#1c1b2a"/></linearGradient>
<linearGradient id="${P}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GD.h}"/><stop offset="0.35" stop-color="${GD.b}"/><stop offset="1" stop-color="${GD.s}"/></linearGradient>
<linearGradient id="${P}goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GD.h}"/><stop offset="0.4" stop-color="${GD.b}"/><stop offset="1" stop-color="${GD.s}"/></linearGradient>
<linearGradient id="${P}boot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4966"/><stop offset="0.35" stop-color="#26253a"/><stop offset="1" stop-color="#121120"/></linearGradient>
<linearGradient id="${P}scarf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="${SC.b}"/><stop offset="1" stop-color="#dfe4f0"/></linearGradient>
<linearGradient id="${P}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3f6e"/><stop offset="0.45" stop-color="#4f93cf"/><stop offset="0.8" stop-color="#9edcff"/><stop offset="1" stop-color="#d8f6ff"/></linearGradient>
<radialGradient id="${P}helm" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#5a5a78"/><stop offset="0.4" stop-color="#2a2940"/><stop offset="1" stop-color="#0e0d18"/></radialGradient>
<linearGradient id="${P}visor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f6ff"/><stop offset="0.35" stop-color="#5fb8e8"/><stop offset="1" stop-color="#1b3c6a"/></linearGradient>
<linearGradient id="${P}rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${RIM}" stop-opacity="0"/><stop offset="1" stop-color="${RIM}" stop-opacity="0.9"/></linearGradient>`;

// ── 망토처럼 날리는 머플러 꼬리 (뒤) ───────────────────
function scarfTail() {
  const d = "M640 470 C720 432 790 486 862 456 C930 428 958 360 1036 344 C1092 332 1126 298 1156 248 L1172 360 C1142 398 1110 430 1062 440 C996 454 968 520 896 560 C826 600 752 564 680 548 Z";
  const sh = fillp("M862 456 C930 428 958 360 1036 344 L1060 440 C996 454 968 520 896 560 C886 520 878 488 862 456Z", SC.s) +
    fillp("M1036 344 C1092 332 1126 298 1156 248 L1172 360 C1142 398 1110 430 1062 440 C1066 410 1054 376 1036 344Z", SC.b) +
    fillp("M1110 300 C1130 286 1144 268 1156 248 L1172 360 C1160 376 1146 390 1130 402 C1130 366 1124 330 1110 300Z", SC.s, ` opacity="0.8"`) +
    line("M720 486 C780 506 830 500 878 474", 2.5, SC.d) + line("M760 534 C820 546 870 532 920 494", 2.5, SC.d) + line("M950 430 C980 410 1004 380 1040 366", 2.5, SC.d) + line("M1070 380 C1100 372 1124 352 1150 320", 2, SC.d) +
    fillp("M650 478 C730 446 790 496 862 466 C930 438 958 372 1036 356 L1036 366 C962 382 934 448 864 476 C790 506 730 456 650 488Z", "#fff", ` opacity="0.85"`);
  let fr = "";
  for (let i = 0; i < 8; i++) { const t = i / 7, x = 1156 + 16 * t, y = 248 + 112 * t; fr += line(`M${f(x)} ${f(y)} q${f(16 - 3 * t)} ${f(-4 + 8 * t)} ${f(28 - 4 * t)} ${f(-2 + 14 * t)}`, 4.5, SC.s) + line(`M${f(x)} ${f(y)} q${f(16 - 3 * t)} ${f(-4 + 8 * t)} ${f(28 - 4 * t)} ${f(-2 + 14 * t)}`, 1.5, INK, ` opacity="0.6"`); }
  return part(d, `url(#${P}scarf)`, sh) + fr + line("M1146 266 L1162 362", 3.5, GD.b) + line("M1134 284 L1148 376", 2.5, GD.b);
}
// ── 뒷머리 ─────────────────────────────────────────
function hairBack() {
  const ds = [
    "M494 330 C474 270 474 200 500 150 C530 105 580 88 625 90 C680 92 728 125 738 182 C746 232 736 290 712 334 L700 392 L540 392 Z",
    leaf([500, 330], [530, 380], [478, 424], -6),
    leaf([520, 360], [556, 392], [520, 444], -4),
    leaf([700, 330], [670, 380], [724, 424], 6),
    leaf([680, 360], [644, 392], [684, 446], 4),
  ];
  return union(ds, `url(#${P}hairBack)`, line("M512 400 L500 340", 2.5, HR.d) + line("M690 400 L702 340", 2.5, HR.d), 4);
}
// ── 다리·부츠 ───────────────────────────────────────
function legs() {
  // 바지: 골반 + 두 다리 (안쪽 외곽선 없이 하나로)
  const hip = "M486 940 C540 950 660 950 716 940 L726 1060 C700 1140 650 1190 600 1200 C550 1190 500 1140 478 1060 Z";
  const L = "M480 1000 C462 1150 470 1320 490 1480 C500 1580 504 1660 500 1740 C494 1800 488 1880 492 1960 C498 2080 512 2180 520 2250 L582 2252 C580 2160 582 2050 586 1960 C590 1880 578 1800 574 1750 C572 1650 584 1500 598 1380 C606 1300 606 1240 602 1190 Z";
  const R = "M598 1190 C618 1300 640 1450 662 1600 C670 1660 676 1720 680 1760 C690 1850 712 1960 730 2060 L758 2240 L830 2232 C818 2120 802 1980 792 1880 C786 1820 776 1770 770 1730 C768 1600 758 1350 724 1020 Z";
  const sh =
    // 오른다리 전체 어둡게 (광원 반대쪽) + 왼다리 안쪽
    fillp("M560 1190 C556 1300 548 1500 556 1700 C558 1800 566 1900 570 2000 L600 2000 L604 1190Z", SU.s) +
    fillp("M700 1060 C722 1300 738 1560 744 1740 C754 1860 772 1980 790 2120 L840 2120 L740 1000Z", SU.s) +
    fillp("M600 1200 C640 1190 680 1160 726 1080 L730 1140 C700 1190 650 1220 610 1230Z", SU.d, ` opacity="0.8"`) +
    // 가랑이 주름
    line("M600 1200 C590 1170 570 1150 540 1140", 2.5, SU.d) + line("M604 1200 C618 1172 640 1156 668 1150", 2.5, SU.d) +
    line("M600 1196 L600 1110", 2, SU.d) + line("M520 1060 C540 1100 560 1140 580 1170", 2, SU.d, ` opacity="0.7"`) +
    // 무릎 주름
    line("M508 1690 C526 1708 550 1712 572 1702", 2.5, SU.d) + line("M502 1744 C524 1764 552 1766 574 1754", 2.5, SU.d) + line("M510 1790 C530 1800 552 1800 572 1792", 2, SU.d) +
    line("M668 1690 C690 1708 716 1712 762 1698", 2.5, SU.d) + line("M676 1744 C700 1762 732 1766 770 1750", 2.5, SU.d) +
    line("M494 1300 C520 1340 548 1350 576 1340", 2, SU.d) + line("M650 1330 C676 1360 704 1366 736 1352", 2, SU.d) +
    // 하이라이트 (왼쪽 허벅지·정강이)
    fillp("M496 1080 C488 1250 494 1400 510 1540 L522 1540 C506 1400 502 1250 508 1080Z", SU.h, ` opacity="0.8"`) +
    fillp("M616 1240 C632 1400 650 1540 664 1660 L674 1660 C660 1540 644 1400 628 1240Z", SU.h, ` opacity="0.55"`) +
    // 바깥 옆선 금색 파이핑
    line("M482 1010 C466 1150 474 1320 494 1480 C502 1560 506 1640 504 1720", 3, GD.b) +
    line("M720 1030 C752 1340 764 1560 768 1720", 3, GD.s) + line("M724 1030 C756 1340 768 1560 772 1720", 2.5, RIM, ` opacity="0.7"`);
  // 허벅지 홀스터 (왼다리)
  const holster = part("M484 1240 L590 1246 L588 1290 L486 1286 Z", "#1a1928", fillp("M484 1240 L590 1246 L589 1256 L485 1252Z", SU.h)) +
    part("M496 1290 L566 1292 L562 1430 C546 1446 514 1446 502 1430 Z", "#232236", fillp("M536 1290 L566 1292 L562 1430 C554 1438 544 1442 534 1442Z", SU.d) + line("M508 1320 L558 1322", 2, GD.b) + fillp("M505 1292 L522 1292 L516 1420 L506 1415Z", SU.h, ` opacity="0.5"`)) +
    part("M520 1302 L544 1302 L544 1334 L520 1334Z", `url(#${P}gold)`, line("M526 1308 L526 1328", 1.5, GD.s), 2.5) +
    part("M490 1248 L502 1248 L502 1282 L490 1282Z", `url(#${P}gold)`, "", 2) + part("M576 1252 L588 1252 L586 1286 L574 1286Z", `url(#${P}gold)`, "", 2);
  const knee = part("M674 1650 C700 1630 744 1632 768 1655 L774 1740 C752 1762 708 1762 684 1744 Z", "#22213a",
    fillp("M674 1650 C700 1630 744 1632 768 1655 L767 1672 C746 1652 704 1652 676 1668Z", SU.h) + fillp("M740 1640 L772 1655 L776 1740 L748 1754Z", SU.d)) +
    line("M684 1700 L766 1700", 2.5, GD.b) + line("M684 1708 L768 1708", 1.6, GD.s);
  const harness = part("M482 1120 C520 1150 560 1172 600 1192 L604 1214 C560 1194 520 1172 480 1146 Z", "#15141f", fillp("M482 1120 C520 1150 560 1172 600 1192 L601 1198 C560 1178 520 1156 481 1128Z", "#4a4966"), 3) +
    part("M600 1192 C640 1172 690 1150 722 1126 L726 1152 C690 1176 640 1196 604 1214 Z", "#15141f", fillp("M600 1192 C640 1172 690 1150 722 1126 L723 1133 C690 1157 640 1178 601 1198Z", "#4a4966"), 3) +
    part("M520 1148 L544 1160 L538 1186 L514 1174Z", `url(#${P}gold)`, line("M524 1158 L534 1163", 1.5, GD.s), 2.2) + part("M654 1162 L678 1150 L684 1176 L660 1188Z", `url(#${P}gold)`, line("M662 1162 L672 1158", 1.5, GD.s), 2.2) +
    line("M600 1000 L600 1190", 6, "#15141f") + line("M600 1000 L600 1190", 2.5, "#4a4966");
  return union([hip, L, R], `url(#${P}leg)`, sh, 5) + harness + holster + knee;
}
function boots() {
  const BL = "M484 1866 C484 1990 498 2120 510 2262 C500 2292 482 2322 474 2350 C470 2372 480 2390 504 2392 L594 2392 C606 2380 604 2340 594 2300 L586 2240 C586 2120 590 2000 594 1866 C560 1852 520 1852 484 1866 Z";
  const BR = "M686 1860 C696 1990 720 2120 746 2252 C754 2300 772 2336 806 2360 C840 2384 900 2390 906 2368 C910 2348 878 2330 852 2300 L832 2242 C820 2120 800 1990 790 1856 C756 1840 718 1844 686 1860 Z";
  const shL = fillp("M560 1860 L594 1866 C590 2000 586 2120 586 2240 L594 2300 C604 2340 606 2380 594 2392 L564 2392 C570 2300 560 2100 560 1860Z", SU.d) +
    fillp("M494 1890 C494 2000 506 2120 516 2240 L524 2240 C516 2120 506 2000 506 1890Z", "#6a6a8a", ` opacity="0.8"`) +
    fillp("M480 2350 C504 2340 564 2342 600 2360 L600 2392 L484 2392Z", "#0c0b14") + line("M478 2356 C514 2346 564 2348 600 2362", 2, "#55547a") +
    line("M510 2200 C534 2210 564 2210 586 2200", 2.5, SU.d) + line("M504 2270 C524 2292 564 2294 590 2282", 2.5, SU.d) + line("M500 2340 C520 2320 540 2316 560 2318", 2, "#6a6a8a");
  const shR = fillp("M752 1846 L790 1856 C800 1990 820 2120 832 2242 L852 2300 C878 2330 910 2348 906 2368 L840 2372 C800 2300 776 2100 752 1846Z", SU.d) +
    fillp("M698 1890 C708 2000 724 2120 744 2240 L752 2240 C734 2120 718 2000 710 1890Z", "#6a6a8a", ` opacity="0.8"`) +
    fillp("M770 2336 C820 2352 880 2356 910 2366 L906 2392 L800 2392Z", "#0c0b14") + line("M772 2340 C828 2354 880 2358 908 2368", 2, "#55547a") +
    line("M724 2186 C752 2198 784 2198 806 2186", 2.5, SU.d) + line("M780 2330 C800 2316 820 2314 840 2318", 2, "#6a6a8a");
  const cuffL = part("M480 1852 C520 1836 560 1836 598 1852 L598 1888 C560 1872 520 1872 480 1888 Z", `url(#${P}gold)`, fillp("M566 1838 L598 1852 L598 1888 L566 1874Z", GD.s, ` opacity="0.6"`) + line("M484 1862 C520 1848 560 1848 596 1862", 1.5, GD.h), 3.5);
  const cuffR = part("M682 1846 C720 1830 760 1830 794 1842 L796 1876 C760 1864 720 1864 684 1880 Z", `url(#${P}gold)`, fillp("M762 1832 L794 1842 L796 1876 L764 1866Z", GD.s, ` opacity="0.6"`) + line("M686 1856 C720 1842 760 1842 792 1852", 1.5, GD.h), 3.5);
  const strap = (x1, x2, y, sk = 0) => part(`M${x1} ${y} L${x2} ${y - 4 + sk} L${x2} ${y + 18 + sk} L${x1} ${y + 22}Z`, "#121120", fillp(`M${x1} ${y} L${x2} ${y - 4 + sk} L${x2} ${y + 4 + sk} L${x1} ${y + 8}Z`, "#4a4966"), 3) +
    part(`M${(x1 + x2) / 2 - 12} ${y - 4 + sk / 2} L${(x1 + x2) / 2 + 12} ${y - 6 + sk / 2} L${(x1 + x2) / 2 + 12} ${y + 22 + sk / 2} L${(x1 + x2) / 2 - 12} ${y + 24 + sk / 2}Z`, `url(#${P}gold)`, "", 2.5) + line(`M${(x1 + x2) / 2 - 5} ${y + 2 + sk / 2} L${(x1 + x2) / 2 - 5} ${y + 18 + sk / 2}`, 2, GD.s);
  return part(BL, `url(#${P}boot)`, shL, 5) + part(BR, `url(#${P}boot)`, shR, 5) + cuffL + cuffR + strap(488, 592, 2010) + strap(702, 804, 2000, 4) + strap(498, 588, 2140) + strap(720, 818, 2130, 4);
}
// ── 몸통 ───────────────────────────────────────────
function torso() {
  const d = "M562 462 C520 478 470 488 438 500 C410 512 398 540 400 580 L440 650 C455 740 490 820 500 880 C495 930 486 960 484 990 L718 990 C714 960 702 930 698 880 C708 820 745 740 760 650 L800 580 C800 540 790 512 762 500 C730 488 680 478 638 462 Z";
  const sh =
    // 오른쪽(광원 반대) 그림자
    fillp("M640 470 C700 480 760 500 790 540 L800 580 L760 650 C745 740 708 820 698 880 C700 940 712 960 718 990 L640 990 C660 950 650 900 670 820 C690 720 700 600 640 470Z", SU.s) +
    // 가슴 아래 그림자
    fillp("M470 690 C520 720 560 724 600 716 C640 724 690 720 735 690 C720 720 690 744 640 748 C620 750 600 744 600 744 C600 744 580 750 560 748 C510 744 480 720 470 690Z", SU.d, ` opacity="0.8"`) +
    // 하이라이트
    fillp("M450 520 C470 510 510 500 545 498 C520 540 500 600 490 680 C475 640 455 600 450 520Z", SU.h, ` opacity="0.7"`) +
    fillp("M505 770 C515 820 520 860 515 900 L525 900 C530 860 525 820 515 770Z", SU.h, ` opacity="0.6"`) +
    // 허리 주름
    line("M520 860 C545 872 570 876 598 872", 2.5, SU.d) + line("M612 880 C640 884 665 878 690 862", 2.5, SU.d) +
    line("M470 620 C490 640 500 660 505 690", 2.2, SU.d) + line("M742 620 C724 645 715 665 712 690", 2.2, SU.d);
  // 비대칭 앞판(금색 테두리) — 왼쪽 어깨에서 오른쪽 허리로
  const flap = "M548 470 C560 560 600 640 640 700 C665 760 676 840 672 950 L700 950 C702 840 690 760 668 700 C650 650 640 560 652 470 Z";
  const flapIn = fillp("M652 470 C640 560 650 650 668 700 C690 760 702 840 700 950 L672 950 C676 840 665 760 640 700 Z", SU.s, ` opacity="0.7"`);
  const trim = line("M548 470 C560 560 600 640 640 700 C665 760 676 840 672 950", 7, INK) + line("M548 470 C560 560 600 640 640 700 C665 760 676 840 672 950", 4, GD.b) + line("M550 474 C562 560 600 636 638 694", 1.5, GD.h);
  // 지퍼
  let zip = line("M646 712 C664 760 672 840 668 950", 4, "#55546e");
  for (let i = 0; i < 18; i++) { const t = i / 17, y = 720 + 225 * t, x = 648 + 22 * Math.sin(t * 1.5); zip += line(`M${f(x - 4)} ${f(y)} L${f(x + 4)} ${f(y)}`, 1.6, "#9a99b8"); }
  zip += part("M640 712 L652 708 L656 736 L644 740Z", `url(#${P}gold)`, "", 2);
  // 가슴 주머니 (왼쪽 가슴)
  const pocket = part("M470 600 L560 606 L556 660 L474 654 Z", "#25243a", fillp("M470 600 L560 606 L559 616 L470 610Z", SU.h, ` opacity="0.6"`) + line("M478 618 L552 623", 1.6, "#5c5b7a", ` stroke-dasharray="5 4"`)) + line("M480 632 L548 636", 3, "#6b6a8a") + part("M546 630 L556 631 L555 645 L545 644Z", `url(#${P}gold)`, "", 1.6);
  // 휘장 (오른쪽 가슴): 마름모 안의 날개
  const emblem = part("M712 590 L740 620 L712 650 L684 620 Z", `url(#${P}gold)`, fillp("M712 590 L740 620 L712 650Z", GD.s, ` opacity="0.5"`), 3) +
    fillp("M712 610 C704 616 694 616 688 620 C696 624 704 624 712 630 C720 624 728 624 736 620 C730 616 720 616 712 610Z", "#2c2b40") + `<circle cx="712" cy="620" r="4" fill="${GD.h}" stroke="${INK}" stroke-width="1.5"/>`;
  // 벨트
  const belt = part("M484 950 C540 968 660 968 716 950 L720 996 C660 1014 540 1014 480 996 Z", "#15141f",
    fillp("M484 950 C540 968 660 968 716 950 L716 960 C660 978 540 978 484 960Z", "#4a4966") + line("M488 986 C540 1002 660 1002 716 986", 1.5, "#4a4966", ` stroke-dasharray="6 5"`));
  const buckle = part("M570 954 L630 954 L634 1006 L566 1006 Z", `url(#${P}gold)`, fillp("M582 966 L618 966 L620 994 L580 994Z", "#15141f") + fillp("M600 954 L634 954 L634 1006 L605 1006Z", GD.s, ` opacity="0.45"`), 3) +
    fillp("M600 970 L612 980 L600 990 L588 980Z", GD.b, ` stroke="${INK}" stroke-width="1.5"`);
  // 오른쪽 허리 파우치
  const pouch = part("M684 990 L734 984 L740 1060 C726 1072 698 1074 688 1062 Z", "#22213a", fillp("M714 986 L734 984 L740 1060 C732 1066 724 1070 716 1070Z", SU.d) + fillp("M684 990 L734 984 L735 1004 L685 1010Z", "#3a3953")) + part("M704 1000 L716 999 L716 1016 L704 1017Z", `url(#${P}gold)`, "", 1.6);
  // 허리 아래 금색 라인 (바지 옆선)
  const rim = line("M796 580 L758 652 C744 740 706 820 696 880", 3, RIM, ` opacity="0.8"`) + "";
  return part(d, `url(#${P}suit)`, sh + flapIn + pocket, 5) + trim + zip + emblem + belt + buckle + pouch + rim;
}

// ── 목·머플러 ───────────────────────────────────────
function neck() {
  const d = "M566 380 L562 478 Q600 500 638 478 L634 380 Z";
  return part(d, SK.b, fillp("M560 380 L640 380 L640 440 C620 420 580 420 560 440Z", SK.s) + fillp("M620 400 L640 400 L640 480 L622 488Z", SK.s));
}
function collar() {
  // 높은 깃 (금 테두리)
  const d = "M546 470 C548 444 560 430 572 428 L600 452 L628 428 C640 430 652 444 654 470 L640 488 C620 470 580 470 560 488 Z";
  return part(d, SU.b, fillp("M600 452 L628 428 C640 430 652 444 654 470 L640 488 C625 474 610 468 600 466Z", SU.s), 4) +
    line("M548 468 C550 446 560 434 572 430", 3, GD.b) + line("M652 468 C650 446 640 434 628 430", 3, GD.b);
}
function scarfFront() {
  // 앞으로 늘어진 끝자락 (가슴 위, 살짝 휘날림)
  const tail = "M548 516 C538 580 526 640 516 700 C510 740 498 770 486 806 L562 818 C564 760 572 720 580 660 C588 610 596 570 606 532 Z";
  const tsh = fillp("M578 524 L606 532 C596 570 588 610 580 660 C572 720 564 760 562 818 L538 814 C546 760 556 700 562 640 C568 590 572 556 578 524Z", SC.s) +
    line("M542 560 C534 620 524 690 510 760", 2.5, SC.d) + line("M566 590 C560 650 552 720 548 790", 2, SC.d) +
    fillp("M552 540 C546 580 540 610 532 650 L540 650 C548 610 554 580 560 540Z", "#fff") +
    fillp("M496 762 L568 772 L567 782 L494 772Z", GD.b) + fillp("M492 784 L566 794 L566 799 L491 789Z", GD.b);
  let fr = "";
  for (let i = 0; i < 9; i++) { const x = 488 + i * 9; fr += line(`M${x} ${806 + i * 1.3} q${-3 + i * 0.4} 18 ${-8 + i * 0.6} 34`, 4.5, SC.s) + line(`M${x} ${806 + i * 1.3} q${-3 + i * 0.4} 18 ${-8 + i * 0.6} 34`, 1.5, INK, ` opacity="0.55"`); }
  // 목에 두 번 감은 부분 + 매듭
  const loop2 = "M534 488 C528 470 550 462 576 470 C600 476 630 474 654 464 C676 456 690 474 680 496 C670 524 640 536 604 538 C572 538 544 522 534 488 Z";
  const loop1 = "M540 462 C534 440 556 430 580 438 C596 444 612 444 628 438 C652 430 672 442 664 466 C656 486 628 494 600 494 C574 494 548 484 540 462 Z";
  const knot = "M536 500 C526 512 528 534 544 546 C560 554 582 548 588 530 C590 512 576 498 558 496 C548 496 540 498 536 500 Z";
  const l2sh = fillp("M610 476 C630 474 654 462 672 462 C690 474 684 512 660 528 C640 536 620 538 604 538Z", SC.s) + line("M552 500 C580 512 620 512 664 494", 2.5, SC.d) + line("M570 524 C600 530 630 526 660 512", 2, SC.d);
  const l1sh = fillp("M604 444 C624 444 644 432 660 440 C670 456 660 480 640 488 C626 492 612 494 600 494Z", SC.s) + line("M552 462 C580 474 620 474 656 458", 2.5, SC.d) + fillp("M548 452 C560 444 576 446 592 452 C578 456 560 458 548 462Z", "#fff");
  const ksh = fillp("M566 498 C582 502 592 516 588 530 C582 548 562 554 548 548 C566 540 576 524 566 498Z", SC.s) + line("M546 512 C556 522 566 528 578 528", 2, SC.d);
  return part(tail, `url(#${P}scarf)`, tsh) + fr + part(loop2, `url(#${P}scarf)`, l2sh) + part(loop1, `url(#${P}scarf)`, l1sh) + fillp("M548 528 C560 540 580 544 598 538 L604 532 C590 548 566 550 548 540Z", SC.d, ` opacity="0.7"`);
}
// ── 견장 ───────────────────────────────────────────
function epaulette(s) {
  // s=-1 왼쪽(화면), 1 오른쪽
  const X = (x) => 600 + s * x;
  const d = `M${X(70)} 476 C${X(120)} 482 ${X(170)} 490 ${X(200)} 506 C${X(222)} 520 ${X(226)} 548 ${X(214)} 566 C${X(180)} 556 ${X(140)} 530 ${X(80)} 512 Z`;
  let s2 = part(d, SU.b, fillp(`M${X(70)} 476 C${X(120)} 482 ${X(170)} 490 ${X(200)} 506 L${X(196)} 518 C${X(160)} 504 ${X(120)} 496 ${X(74)} 490Z`, SU.h, ` opacity="0.6"`), 4);
  s2 += line(d, 4.5, GD.b) + line(`M${X(120)} 492 C${X(150)} 500 ${X(180)} 512 ${X(200)} 528`, 3.5, GD.b) + line(`M${X(112)} 504 C${X(144)} 512 ${X(172)} 526 ${X(190)} 542`, 3.5, GD.b);
  s2 += `<circle cx="${X(92)}" cy="494" r="9" fill="url(#${P}gold)" stroke="${INK}" stroke-width="2.5"/><circle cx="${X(89)}" cy="491" r="3" fill="${GD.h}"/>`;
  // 금 술
  for (let i = 0; i < 9; i++) { const t = i / 8, x = X(196 + 22 * t), y = 518 + 40 * t; s2 += line(`M${f(x)} ${f(y)} l${f(s * 6)} ${f(26 - 6 * t)}`, 4, GD.s) + line(`M${f(x)} ${f(y)} l${f(s * 6)} ${f(26 - 6 * t)}`, 2, GD.b); }
  return s2;
}

// ── 팔 ─────────────────────────────────────────────
function armLeft() {
  // 화면 왼쪽 팔: 늘어뜨리고 헬멧을 든다
  const d = "M446 500 C410 502 388 536 390 590 C388 680 382 780 380 870 C378 960 380 1060 386 1150 L446 1152 C452 1060 460 960 464 880 C470 790 472 720 464 650 Z";
  const sh = fillp("M430 650 C440 700 446 780 444 880 C440 960 436 1060 432 1152 L446 1152 C452 1060 460 960 464 880 C470 790 472 720 464 650Z", SU.d) +
    fillp("M398 560 C396 640 392 760 390 860 L402 860 C404 760 408 640 412 560Z", SU.h, ` opacity="0.7"`) +
    line("M388 860 C404 876 430 880 458 868", 2.5, SU.d) + line("M390 900 C410 912 436 912 456 902", 2.2, SU.d) + line("M398 720 C410 740 430 745 452 735", 2, SU.d) + line("M384 940 C400 956 424 960 452 950", 2, SU.d) + line("M392 820 C404 830 420 834 440 830", 2, SU.d, ` opacity="0.7"`) + line("M386 1040 C402 1050 426 1052 446 1046", 2, SU.d, ` opacity="0.7"`) + line("M392 600 C396 640 398 680 396 700", 3, SU.h, ` opacity="0.6"`);
  const band = part("M390 640 L466 648 L466 690 L388 682 Z", "#15141f", fillp("M390 650 L466 658 L466 664 L390 656Z", GD.b) + fillp("M389 670 L466 678 L466 682 L389 674Z", GD.b));
  const cuff = part("M382 1110 L450 1112 L448 1160 L384 1158 Z", `url(#${P}goldH)`, fillp("M430 1110 L450 1112 L448 1160 L430 1158Z", GD.s, ` opacity="0.6"`) + line("M384 1124 L450 1126", 1.5, GD.s), 3.5);
  return part(d, `url(#${P}suit)`, sh, 5) + band + cuff;
}
function helmet() {
  const d = "M300 1320 C300 1250 350 1200 412 1200 C478 1200 526 1252 526 1320 C526 1380 500 1420 470 1436 L340 1436 C312 1414 300 1376 300 1320 Z";
  const sh = fillp("M420 1200 C480 1204 526 1252 526 1320 C526 1380 500 1420 470 1436 L430 1436 C470 1400 490 1340 470 1270 C460 1236 440 1214 420 1200Z", "#0b0a14", ` opacity="0.7"`) +
    fillp("M330 1250 C350 1220 380 1208 410 1206 C380 1222 356 1248 346 1280Z", "#8a8aac", ` opacity="0.7"`);
  const stripe = part("M400 1201 C412 1200 424 1201 432 1203 L436 1300 L398 1300 Z", `url(#${P}gold)`, "", 3);
  const visor = part("M310 1320 C340 1300 400 1296 470 1310 C490 1340 488 1390 470 1412 C410 1420 350 1410 316 1390 C306 1370 304 1342 310 1320 Z", `url(#${P}visor)`,
    fillp("M320 1326 C350 1312 390 1308 420 1312 L380 1400 C350 1396 330 1390 318 1382Z", "#ffffff", ` opacity="0.35"`) + line("M328 1340 C360 1328 400 1326 440 1332", 3, "#ffffff", ` opacity="0.8"`), 4);
  return part(d, `url(#${P}helm)`, sh, 5) + stripe + visor + line("M340 1436 L470 1436", 5) + line("M512 1270 C520 1290 524 1310 524 1330", 3, RIM, ` opacity="0.8"`);
}
function handLeft() {
  // 헬멧 윗부분을 쥔 손 (손등이 보임)
  let s = fing([[392, 1182], [370, 1212], [360, 1236]], 21);
  const palm = "M384 1150 C374 1180 376 1212 386 1238 C410 1248 436 1248 454 1238 C462 1210 460 1178 450 1150 Z";
  s += part(palm, GL.b, fillp("M432 1150 L450 1150 C460 1178 462 1210 454 1238 L432 1244Z", GL.s) + line("M404 1172 C410 1192 412 1212 410 1232", 2, GL.d, ` opacity="0.6"`) + line("M426 1170 C430 1192 432 1212 430 1234", 2, GL.d, ` opacity="0.6"`), 4);
  s += fing([[395, 1232], [386, 1262], [390, 1286]], 20) + fing([[412, 1240], [408, 1272], [412, 1298]], 21) + fing([[430, 1242], [430, 1272], [436, 1296]], 21) + fing([[447, 1236], [452, 1262], [458, 1282]], 18);
  s += line("M392 1250 l10 2 M410 1258 l10 1 M428 1258 l10 0 M446 1252 l9 -1", 2, GL.d, ` opacity="0.7"`);
  return s;
}
function armRight() {
  // 화면 오른쪽 팔: 허리에 손
  const d = "M756 500 C796 504 822 536 828 580 C860 650 892 730 918 812 C926 832 920 852 906 866 C866 912 826 960 778 1010 L742 974 C784 930 822 886 856 846 C830 780 798 720 770 664 Z";
  const sh = fillp("M780 600 C820 680 858 760 880 820 C896 840 900 858 906 866 C866 912 826 960 778 1010 L770 1000 C812 950 850 905 880 870 C860 800 820 700 780 600Z", SU.d) +
    fillp("M770 520 C800 530 812 560 815 590 C790 560 778 545 766 530Z", SU.h, ` opacity="0.6"`) +
    line("M856 846 C870 838 884 826 900 808", 2.5, SU.d) + line("M846 826 C862 820 874 808 886 792", 2.2, SU.d) + line("M862 870 C876 876 890 876 904 868", 2.2, SU.d) +
    line("M828 580 C860 650 892 730 918 812", 3, RIM, ` opacity="0.85"`);
  const band = part("M800 620 L848 600 L864 640 L816 662 Z", "#15141f", fillp("M804 630 L852 610 L855 617 L807 637Z", GD.b) + fillp("M810 648 L859 628 L861 633 L812 653Z", GD.b));
  const cuff = part("M744 970 L782 940 L812 978 L778 1012 Z", `url(#${P}goldH)`, line("M752 964 L786 994", 1.5, GD.s), 3.5);
  return part(d, `url(#${P}suit)`, sh, 5) + band + cuff;
}
function handRight() {
  // 허리를 짚은 손: 손등 + 앞으로 감싼 손가락
  let s = "";
  s += fing([[760, 1048], [752, 1076], [750, 1094]], 17) + fing([[744, 1052], [732, 1082], [728, 1102]], 19) + fing([[728, 1046], [712, 1074], [706, 1094]], 19) + fing([[714, 1034], [698, 1056], [692, 1074]], 18);
  const palm = "M752 976 C736 988 718 1002 708 1022 C700 1038 706 1052 720 1058 C740 1060 760 1056 772 1046 C786 1032 796 1016 800 1000 Z";
  s += part(palm, GL.b, fillp("M772 1046 C786 1032 796 1016 800 1000 L778 990 C770 1010 760 1030 744 1056Z", GL.s) + line("M742 1000 C732 1018 728 1034 730 1048", 2, GL.d, ` opacity="0.5"`) + line("M760 1004 C752 1020 748 1036 750 1048", 2, GL.d, ` opacity="0.5"`), 4);
  return s;
}
// ── 얼굴 ───────────────────────────────────────────
const FACE = "M512 246 C512 306 528 350 554 386 L588 422 Q600 432 612 422 L646 386 C672 350 688 306 688 246 C684 204 648 184 600 184 C552 184 516 204 512 246 Z";
function ears() {
  const e = (s) => {
    const X = (x) => 600 + s * x;
    const d = `M${X(92)} 282 C${X(112)} 272 ${X(118)} 296 ${X(114)} 316 C${X(110)} 340 ${X(100)} 352 ${X(86)} 352 Z`;
    return part(d, SK.b, fillp(`M${X(96)} 292 C${X(106)} 290 ${X(108)} 310 ${X(104)} 326 C${X(100)} 336 ${X(94)} 340 ${X(90)} 338Z`, SK.s), 3.5);
  };
  return e(-1) + e(1);
}
function face() {
  const sh = fillp("M652 192 C690 214 696 262 690 306 C684 346 666 372 646 392 L620 420 C650 380 670 320 662 250 Z", SK.s, ` opacity="0.9"`) +
    // 머리카락 그림자 (이마)
    fillp("M500 200 L700 200 L700 270 C690 252 676 238 660 232 C640 226 626 226 616 232 L600 272 C596 244 586 232 570 230 C550 230 530 240 516 258 L500 280Z", SK.s) +
    // 턱 아래
    fillp("M552 384 L588 420 Q600 430 612 420 L648 384 C640 410 620 434 600 436 C580 434 560 410 552 384Z", SK.d, ` opacity="0.45"`) +
    fillp("M522 300 C524 330 534 350 548 362 C538 342 530 320 528 296Z", SK.h, ` opacity="0.8"`);
  return part(FACE, `url(#${P}skin)`, sh, 4);
}
function eye(s, e) {
  const X = (x) => 600 + s * x;
  const cfg = {
    normal: { hi: 14, ho: 18, b: 16, ir: 1, look: 2 },
    smile: { hi: 12, ho: 15, b: 9, ir: 1, look: 0 },
    angry: { hi: 6, ho: 19, b: 15, ir: 0.92, look: 0 },
    sad: { hi: 21, ho: 16, b: 18, ir: 1, look: 3 },
    surprise: { hi: 27, ho: 27, b: 21, ir: 0.72, look: 0 },
    serious: { hi: 9, ho: 11, b: 12, ir: 0.95, look: 1 },
  }[e];
  const cy = 304, oy = 296, iy = 308;
  const top = `M${X(84)} ${oy} C${X(70)} ${cy - cfg.ho} ${X(32)} ${cy - cfg.hi} ${X(18)} ${iy}`;
  const bot = e === "smile" ? `C${X(30)} ${cy + 4} ${X(60)} ${cy + 2} ${X(84)} ${oy}` : `C${X(30)} ${cy + cfg.b} ${X(66)} ${cy + cfg.b} ${X(84)} ${oy}`;
  const scl = top + " " + bot + "Z";
  const irx = 16 * cfg.ir, iry = 20 * cfg.ir, icx = X(50), icy = cy + 2 + cfg.look;
  let inner = fillp(`M${X(90)} 280 L${X(10)} 280 L${X(10)} ${cy - cfg.hi + 8} L${X(90)} ${cy - cfg.ho + 8}Z`, "#c5cde4");
  inner += `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#${P}iris)" stroke="#1d3558" stroke-width="2.5"/>`;
  inner += `<ellipse cx="${icx}" cy="${icy + 2}" rx="${f(irx * 0.45)}" ry="${f(iry * 0.5)}" fill="#0f1a33"/>`;
  inner += fillp(`M${f(icx - irx * 0.8)} ${f(icy + iry * 0.3)} Q${icx} ${f(icy + iry * 1.1)} ${f(icx + irx * 0.8)} ${f(icy + iry * 0.3)} Q${icx} ${f(icy + iry * 0.7)} ${f(icx - irx * 0.8)} ${f(icy + iry * 0.3)}Z`, "#d9fbff", ` opacity="0.7"`);
  inner += fillp(`M${f(icx - irx)} ${f(icy - iry)} L${f(icx + irx)} ${f(icy - iry)} L${f(icx + irx)} ${f(icy - iry * 0.35)} Q${icx} ${f(icy - iry * 0.55)} ${f(icx - irx)} ${f(icy - iry * 0.35)}Z`, "#0f1a33", ` opacity="0.55"`);
  inner += `<ellipse cx="${f(icx - 6)}" cy="${f(icy - 7)}" rx="${f(5.5 * cfg.ir)}" ry="${f(7 * cfg.ir)}" fill="#fff"/><circle cx="${f(icx + 7)}" cy="${f(icy + 8)}" r="2.6" fill="#fff"/><circle cx="${f(icx + 2)}" cy="${f(icy - 10)}" r="1.6" fill="#fff" opacity="0.8"/>`;
  let o = fillp(scl, "#fbfcff");
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${scl}"/></clipPath>`);
  o += `<g clip-path="url(#${id})">${inner}</g>`;
  // 윗 속눈썹 (굵게, 바깥 끝 치켜올림)
  const lash = `M${X(16)} ${iy + 1} C${X(32)} ${cy - cfg.hi - 1} ${X(70)} ${cy - cfg.ho - 1} ${X(86)} ${oy - 1} L${X(96)} ${oy - 9}`;
  o += line(lash, 6.5) + line(`M${X(58)} ${cy - (cfg.ho + cfg.hi) / 2 - 1} C${X(70)} ${cy - cfg.ho - 1} ${X(80)} ${oy - 4} ${X(94)} ${oy - 9}`, 9);
  o += line(`M${X(86)} ${oy + 1} L${X(94)} ${oy + 4}`, 3);
  // 아래 속눈썹
  if (e === "smile") o += line(`M${X(26)} ${cy + 6} C${X(44)} ${cy + 2} ${X(64)} ${cy + 1} ${X(80)} ${oy + 2}`, 2.5);
  else o += line(`M${X(36)} ${cy + cfg.b - 1} C${X(54)} ${cy + cfg.b + 1} ${X(72)} ${cy + cfg.b - 4} ${X(82)} ${oy + 3}`, 2.2, INK, ` opacity="0.8"`);
  // 쌍꺼풀
  o += line(`M${X(30)} ${cy - cfg.hi - 7} C${X(48)} ${cy - (cfg.hi + cfg.ho) / 2 - 12} ${X(68)} ${cy - cfg.ho - 9} ${X(82)} ${oy - 10}`, 2, INK, ` opacity="0.7"`);
  if (e === "sad") o += fillp(`M${X(40)} ${cy + cfg.b - 2} Q${X(54)} ${cy + cfg.b + 6} ${X(70)} ${cy + cfg.b - 2} Q${X(56)} ${cy + cfg.b + 2} ${X(40)} ${cy + cfg.b - 2}Z`, "#bfe8ff", ` opacity="0.9"`) + (s > 0 ? fillp(`M${X(46)} ${cy + 22} C${X(42)} ${cy + 34} ${X(42)} ${cy + 42} ${X(48)} ${cy + 44} C${X(54)} ${cy + 42} ${X(52)} ${cy + 32} ${X(46)} ${cy + 22}Z`, "#c8ecff", ` stroke="#6fb6e6" stroke-width="1.5" opacity="0.9"`) : "");
  return o;
}
function brow(s, e) {
  const X = (x) => 600 + s * x;
  let B = { normal: [262, 250, 256], smile: [258, 246, 252], angry: [274, 256, 244], sad: [248, 254, 266], surprise: [238, 228, 236], serious: [268, 262, 260] }[e];
  if ((e === "normal" || e === "smile") && s > 0) B = B.map((v) => v - 6); // 한쪽 눈썹 치켜올림(오만)
  const d = `M${X(20)} ${B[0] + 2} C${X(42)} ${B[1] - 3} ${X(68)} ${B[1] - 3} ${X(94)} ${B[2]} C${X(70)} ${B[1] + 2} ${X(44)} ${B[1] + 4} ${X(22)} ${B[0] + 10} Z`;
  return path(d, "#b4bdd6", 1.6, ` stroke="#4d5677"`).replace(`stroke="${INK}" `, "") + fillp(`M${X(22)} ${B[0] + 8} C${X(44)} ${B[1] + 2} ${X(70)} ${B[1]} ${X(94)} ${B[2]} C${X(70)} ${B[1] + 3} ${X(44)} ${B[1] + 5} ${X(22)} ${B[0] + 10}Z`, "#5d6788");
}
function nose() {
  return line("M604 338 C606 348 604 354 596 357", 2.5, SK.d) + fillp("M604 334 C610 344 610 352 604 358 L598 356 C604 350 606 344 604 334Z", SK.s, ` opacity="0.8"`) + `<circle cx="590" cy="344" r="3" fill="#fff" opacity="0.7"/>`;
}
function mouth(e) {
  const red = "#7a2c38";
  switch (e) {
    case "smile": return path("M578 384 Q602 400 626 376 Q604 388 578 384Z", red, 3) + fillp("M584 386 Q604 390 620 380 L618 384 Q604 392 586 388Z", "#fff") + line("M626 376 l6 -4", 2.5);
    case "angry": return path("M574 382 Q600 378 626 382 L622 400 Q600 406 578 400 Z", red, 3) + fillp("M576 384 Q600 380 624 384 L623 392 Q600 389 577 392Z", "#fff") + line("M588 383 L588 391 M600 382 L600 390 M612 383 L612 391", 1.4, "#c9c3d0") + fillp("M578 398 Q600 402 622 398 L622 400 Q600 406 578 400Z", "#fff", ` opacity="0.9"`);
    case "sad": return line("M584 392 Q600 384 616 392", 3) + line("M594 398 Q600 397 606 398", 1.5, SK.d);
    case "surprise": return path("M600 378 C614 378 618 392 616 400 C612 410 588 410 584 400 C582 392 586 378 600 378Z", red, 3) + fillp("M588 400 C594 394 606 394 612 400 C608 406 592 406 588 400Z", "#d86a78");
    case "serious": return line("M584 388 L616 387", 3) + line("M594 396 Q600 395 606 396", 1.5, SK.d);
    default: return line("M582 388 Q602 392 620 382", 3) + line("M620 382 l5 -3", 2.5) + line("M594 397 Q600 396 606 397", 1.5, SK.d);
  }
}
function blush(e) {
  if (e === "angry" || e === "serious") return "";
  const o = e === "smile" || e === "sad" ? 0.5 : 0.18;
  return `<ellipse cx="540" cy="350" rx="24" ry="9" fill="#ff8f8f" opacity="${o}"/><ellipse cx="660" cy="350" rx="24" ry="9" fill="#ff8f8f" opacity="${o}"/>` +
    (e === "smile" ? line("M528 348 l6 -8 M540 350 l6 -8 M652 348 l6 -8 M664 350 l6 -8", 2, "#e06a6a", ` opacity="0.6"`) : "");
}
function extra(e) {
  if (e === "angry") return line("M690 210 l14 -10 M694 222 l18 -4 M684 200 l6 -16", 4, "#e0505a");
  if (e === "surprise") return fillp("M698 250 C692 266 692 278 700 282 C708 278 706 266 698 250Z", "#bfe8ff", ` stroke="#6fb6e6" stroke-width="2"`);
  return "";
}

// ── 앞머리 ─────────────────────────────────────────
function hairFront() {
  const mass = "M502 332 C496 300 498 268 510 246 C530 222 562 210 600 206 C640 208 672 220 690 244 C702 268 704 298 702 330 C716 300 728 262 730 220 C732 170 712 128 676 106 C640 86 580 84 542 100 C500 118 480 160 478 210 C478 256 488 300 502 332 Z";
  const locks = [
    leaf([484, 304], [480, 244], [428, 276], -12),
    leaf([480, 252], [488, 184], [422, 204], -18),
    leaf([488, 192], [516, 132], [440, 136], -22),
    leaf([712, 132], [730, 192], [786, 156], 18),
    leaf([730, 198], [732, 256], [790, 246], 16),
    leaf([728, 262], [708, 322], [768, 314], 10),
  ];
  let inner =
    fillp("M690 110 C730 150 744 230 714 320 L800 320 L800 100Z", HR.s) +
    fillp("M470 250 C480 290 490 310 502 332 L440 332Z", HR.s) +
    fillp("M502 332 C496 300 498 268 510 246 C530 222 562 210 600 206 C640 208 672 220 690 244 C702 268 704 298 702 330 L702 296 C690 266 670 240 640 228 C620 222 600 222 580 224 C550 228 520 246 506 290Z", HR.s, ` opacity="0.7"`) +
    // 오른쪽 옆머리 결
    fillp(leaf([650, 214], [664, 220], [726, 150], 12), HR.d, ` opacity="0.6"`) + fillp(leaf([676, 232], [688, 244], [744, 214], 8), HR.d, ` opacity="0.6"`) + fillp(leaf([690, 268], [698, 282], [752, 280], 4), HR.d, ` opacity="0.5"`) +
    // 왼쪽 옆머리 결
    fillp(leaf([520, 236], [530, 228], [452, 190], -10), HR.s) + fillp(leaf([506, 268], [512, 256], [446, 254], -8), HR.s) + fillp(leaf([540, 222], [550, 216], [478, 140], -14), HR.d, ` opacity="0.45"`);
  let s = union([mass, ...locks], `url(#${P}hair)`, inner, 4.5);
  // 큰 볏 덩어리: 이마에서 솟아 오른쪽 뒤로 넘어감
  const crest = "M528 216 C512 160 534 108 588 84 C636 62 700 56 748 70 C724 76 706 86 694 100 C726 106 748 118 762 134 C720 128 684 134 660 148 C630 164 604 188 590 210 C570 206 546 208 528 216 Z";
  const crest2 = "M560 212 C548 176 556 140 590 118 C580 150 584 180 604 204 Z";
  const cin =
    fillp("M590 210 C604 188 630 164 660 148 C684 134 720 128 762 134 L762 170 C720 160 690 170 664 184 C640 196 616 210 600 220Z", HR.s) +
    fillp(leaf([600, 200], [612, 196], [740, 100], 22), HR.s, ` opacity="0.9"`) + fillp(leaf([570, 210], [580, 206], [690, 76], 26), HR.s, ` opacity="0.8"`) +
    fillp(leaf([546, 212], [556, 210], [620, 72], 22), HR.s, ` opacity="0.7"`) + fillp(leaf([620, 182], [630, 176], [748, 124], 14), HR.d, ` opacity="0.6"`) +
    // 윤기
    fillp("M540 150 C556 118 590 98 630 88 L624 100 L642 96 L636 108 C600 116 570 132 552 158 L548 146Z", "#ffffff") +
    fillp("M650 84 C680 78 710 76 730 78 C708 84 690 90 678 98 L668 92Z", "#ffffff", ` opacity="0.95"`) +
    fillp("M536 176 C538 166 542 158 548 150 C546 162 546 172 548 184Z", "#ffffff", ` opacity="0.8"`);
  s += part(crest, `url(#${P}hair)`, cin, 4);
  // 진한 결선
  s += line("M610 196 C640 160 690 130 740 112", 2.2, INK, ` opacity="0.7"`) + line("M560 196 C556 160 570 120 610 94", 2, INK, ` opacity="0.6"`) +
    line("M532 228 C512 210 494 196 470 186", 2.2, INK, ` opacity="0.7"`) + line("M684 240 C704 222 724 210 750 200", 2.2, INK, ` opacity="0.7"`);
  // 앞으로 떨어진 한 가닥 (S자)
  const strand = "M598 208 C616 206 630 208 636 214 C630 236 610 250 598 266 C590 278 584 290 574 304 C572 284 578 266 588 250 C596 238 604 226 598 208 Z";
  const strand2 = "M590 210 C598 208 604 210 606 214 C596 226 588 238 578 256 C578 240 582 222 590 210 Z";
  s += part(strand2, `url(#${P}hair)`, fillp("M590 210 L606 214 L594 232Z", HR.s), 2.5);
  s += part(strand, `url(#${P}hair)`, fillp("M598 206 L640 206 L636 230 C620 226 606 230 598 240Z", HR.s) + fillp("M606 248 C614 240 620 232 626 222 C622 238 612 252 600 264Z", HR.d, ` opacity="0.6"`) + line("M616 222 C604 244 590 262 580 290", 2.5, "#fff"), 3.5);
  // 림 라이트 + 잔머리
  s += line("M724 150 C738 196 736 250 716 312", 3.5, RIM, ` opacity="0.9"`) + line("M700 62 C724 62 740 66 748 70", 3, RIM, ` opacity="0.8"`) + line("M760 132 C770 140 778 148 786 156", 3, RIM, ` opacity="0.8"`);
  s += line("M422 204 C412 202 404 206 398 212", 2.5) + line("M748 70 C760 64 772 64 782 68", 2.5) + line("M790 246 C800 248 808 244 814 238", 2.5);
  return s;
}
export function svg(expr = "normal") {
  if (!["normal", "smile", "angry", "sad", "surprise", "serious"].includes(expr)) expr = "normal";
  clipN = 0; clips.length = 0;
  const body = scarfTail() + hairBack() + legs() + boots() + torso() + armRight() + handRight() + armLeft() + helmet() + handLeft() +
    neck() + collar() + scarfFront() + epaulette(-1) + epaulette(1);
  const head = `<g transform="rotate(-2 600 420)">` + ears() + face() + blush(expr) + nose() + mouth(expr) + `<g transform="translate(553 302) scale(1.1) translate(-553 -302)">${eye(-1, expr)}</g><g transform="translate(647 302) scale(1.1) translate(-647 -302)">${eye(1, expr)}</g>` + brow(-1, expr) + brow(1, expr) + hairFront() + extra(expr) + `</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${defs()}${clips.join("")}</defs>${body}${head}</svg>`;
}
