// 모아 — 정비반장 (전신 입간판, viewBox 0 0 1200 2400)
export const ID = "moa", NAME = "모아";

const INK = "#1a1626";
const P = "moa-";
const SK = { b: "#fde3d0", s: "#f2b29c", d: "#d9887a", h: "#fff6ee" };
const HR = { b: "#ff8a2a", s: "#e2581c", d: "#b03a16", h: "#ffd28c" };
const OV = { b: "#3a9a62", s: "#276e46", d: "#1a4e32", h: "#6fd69c" };
const AC = "#3dd68c";
const SH = { b: "#fbfbf7", s: "#d3d7e3", d: "#a9afc4" };
const LE = { b: "#9a5a2e", s: "#6c3b1c", d: "#4a2610", h: "#d48c54" };
const ME = { b: "#c9d0dc", s: "#8a93a6", d: "#5a6274", h: "#ffffff" };
const RIM = "#8fe8ff";
const GL = SK;
// ── 도형 도우미 ──────────────────────────────────────────
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
function fing(pts, w, fill = SK.b, sh = SK.s) {
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
function finger(x1, y1, x2, y2, w, fill = SK.b) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  const ex = (dx / L) * w * 0.55, ey = (dy / L) * w * 0.55;
  const d = `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} C${f(x2 + nx + ex)} ${f(y2 + ny + ey)} ${f(x2 - nx + ex)} ${f(y2 - ny + ey)} ${f(x2 - nx)} ${f(y2 - ny)} L${f(x1 - nx)} ${f(y1 - ny)}`;
  return fillp(d + "Z", fill) + fillp(`M${f(x1 - nx)} ${f(y1 - ny)} L${f(x2 - nx)} ${f(y2 - ny)} C${f(x2 - nx * 0.2 + ex)} ${f(y2 - ny * 0.2 + ey)} ${f(x2 - nx * 0.2)} ${f(y2 - ny * 0.2)} ${f(x2 - nx * 0.2)} ${f(y2 - ny * 0.2)} L${f(x1 - nx * 0.2)} ${f(y1 - ny * 0.2)}Z`, SK.s, ` opacity="0.9"`) + line(d, 3);
}


// ── 그라데이션 정의 ─────────────────────────────────
const defs = () => `
<linearGradient id="${P}hair" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#ffb04a"/><stop offset="0.5" stop-color="${HR.b}"/><stop offset="1" stop-color="#f06a22"/></linearGradient>
<linearGradient id="${P}hairBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0601e"/><stop offset="1" stop-color="#a8381a"/></linearGradient>
<linearGradient id="${P}skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0e4"/><stop offset="0.6" stop-color="${SK.b}"/><stop offset="1" stop-color="#f7cbb6"/></linearGradient>
<linearGradient id="${P}ov" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#4fb878"/><stop offset="0.55" stop-color="${OV.b}"/><stop offset="1" stop-color="#2c7a4e"/></linearGradient>
<linearGradient id="${P}shirt" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="${SH.b}"/><stop offset="1" stop-color="#e2e5ee"/></linearGradient>
<linearGradient id="${P}lea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LE.h}"/><stop offset="0.3" stop-color="${LE.b}"/><stop offset="1" stop-color="${LE.s}"/></linearGradient>
<linearGradient id="${P}leaH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8743e"/><stop offset="0.5" stop-color="${LE.b}"/><stop offset="1" stop-color="${LE.s}"/></linearGradient>
<linearGradient id="${P}metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="${ME.b}"/><stop offset="0.6" stop-color="${ME.s}"/><stop offset="0.75" stop-color="#e6ebf2"/><stop offset="1" stop-color="${ME.d}"/></linearGradient>
<linearGradient id="${P}metalV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef2f8"/><stop offset="0.35" stop-color="${ME.b}"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="0.7" stop-color="${ME.s}"/><stop offset="1" stop-color="${ME.d}"/></linearGradient>
<linearGradient id="${P}boot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8754e"/><stop offset="0.4" stop-color="#7a4f32"/><stop offset="1" stop-color="#4a2e1c"/></linearGradient>
<linearGradient id="${P}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f5a3a"/><stop offset="0.45" stop-color="#22a866"/><stop offset="0.8" stop-color="#7cf0b0"/><stop offset="1" stop-color="#e2ffd0"/></linearGradient>
<radialGradient id="${P}lens" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#e8fff2"/><stop offset="0.3" stop-color="#7ef2b4"/><stop offset="0.75" stop-color="#1f9a62"/><stop offset="1" stop-color="#0c4a30"/></radialGradient>`;

// ── 렌치 (어깨에 걸침) ──────────────────────────────
function wrench() {
  // 손잡이: (506 648) → (366 262)
  const shaft = "M488 660 L348 272 L384 258 L524 646 C526 664 500 672 488 660 Z";
  const ssh = fillp("M370 262 L384 258 L524 646 C524 656 516 664 506 666Z", ME.d, ` opacity="0.6"`) + line("M360 272 L496 648", 4, "#fff", ` opacity="0.9"`) +
    fillp("M430 430 L470 416 L500 498 L460 512Z", "#2a2f3a") + line("M436 446 L474 432 M444 466 L482 452 M452 486 L490 472", 2, "#555d70");
  const head = "M300 300 C276 262 282 210 316 182 L334 168 L346 214 C352 236 374 244 396 236 L410 230 L388 186 L408 176 C446 186 466 228 452 268 C440 302 408 318 384 318 L380 330 L340 344 L334 322 C318 320 306 312 300 300 Z";
  const hsh = fillp("M384 318 C408 318 440 302 452 268 C466 228 446 186 408 176 L414 192 C440 210 446 250 430 276 C416 296 398 306 380 308Z", ME.d, ` opacity="0.7"`) +
    fillp("M310 210 C306 236 312 270 330 296 L320 300 C302 276 298 240 306 210Z", "#fff") + fillp("M318 192 L334 180 L340 206 L326 214Z", "#fff", ` opacity="0.8"`);
  const glint = fillp("M326 196 l4 -16 l4 16 l16 4 l-16 4 l-4 16 l-4 -16 l-16 -4Z", "#fff") + `<circle cx="330" cy="200" r="4" fill="#fff"/>`;
  return part(shaft, `url(#${P}metalV)`, ssh, 4.5) + part(head, `url(#${P}metal)`, hsh, 4.5) + `<circle cx="372" cy="292" r="10" fill="${ME.s}" stroke="${INK}" stroke-width="3"/><circle cx="369" cy="289" r="3.5" fill="#fff"/>` +
    // 초록 테이프 감은 손잡이 끝
    part("M478 632 L516 618 L524 646 C526 664 500 672 488 660 Z", AC, fillp("M500 626 L516 618 L524 646 C524 656 516 664 506 666Z", "#1e8a56"), 3.5) + line("M484 646 L520 632", 2, "#1e8a56") + glint;
}

// ── 뒷머리 ─────────────────────────────────────────
function hairBack() {
  const ds = [
    "M470 320 C450 220 500 116 600 108 C700 116 752 220 732 320 C744 380 748 430 736 480 L470 480 C456 430 458 380 470 320 Z",
    leaf([470, 420], [490, 480], [430, 520], -8), leaf([490, 450], [540, 480], [480, 548], -6),
    leaf([732, 420], [712, 480], [778, 512], 8), leaf([712, 450], [664, 480], [726, 552], 6), leaf([736, 340], [740, 420], [786, 410], 8),
    leaf([468, 340], [462, 420], [420, 400], -8),
  ];
  return union(ds, `url(#${P}hairBack)`, fillp(leaf([520,300],[540,300],[480,520],-10), HR.d, ` opacity="0.6"`) + fillp(leaf([680,300],[660,300],[730,520],10), HR.d, ` opacity="0.6"`) + fillp(leaf([470,300],[490,300],[440,420],-8), "#f07a30", ` opacity="0.7"`) + line("M500 470 L490 380", 3, HR.d) + line("M700 470 L712 380", 3, HR.d) + line("M600 480 L600 400", 3, HR.d), 4.5);
}

// ── 다리 (멜빵바지) ─────────────────────────────────
function legs() {
  const hip = "M500 820 L702 820 C722 880 732 940 732 1000 C706 1100 652 1150 600 1162 C548 1150 496 1100 470 1000 C470 940 480 880 500 820 Z";
  const R = "M732 990 C768 1180 760 1400 744 1600 C738 1760 734 1920 736 2132 L600 2136 C606 1940 614 1780 618 1640 C620 1480 610 1300 598 1150 Z";
  const L = "M470 990 C446 1200 456 1420 466 1620 C454 1800 420 1960 396 2124 L524 2130 C542 1960 570 1800 580 1650 C592 1480 598 1300 602 1150 Z";
  const sh =
    fillp("M560 1150 C540 1300 522 1500 514 1700 C508 1880 506 2000 506 2130 L540 2130 L604 1150Z", OV.s) +
    fillp("M690 1000 C708 1200 702 1450 690 1650 C686 1820 684 1960 680 2140 L720 2140 L740 990Z", OV.s) +
    fillp("M600 1162 C650 1150 700 1110 732 1020 L736 1080 C700 1150 650 1180 610 1190Z", OV.d, ` opacity="0.7"`) +
    line("M600 1162 C584 1130 560 1110 530 1100", 2.5, OV.d) + line("M604 1162 C620 1130 646 1110 676 1100", 2.5, OV.d) +
    line("M454 1450 C470 1480 500 1490 530 1484", 2.5, OV.d) + line("M444 1600 C466 1620 500 1626 534 1614", 2.5, OV.d) + line("M440 1660 C460 1680 494 1684 530 1672", 2.5, OV.d) +
    line("M628 1600 C650 1620 690 1626 722 1612", 2.5, OV.d) + line("M626 1660 C650 1676 688 1680 718 1668", 2.5, OV.d) +
    line("M430 1900 C450 1920 480 1922 510 1914", 2, OV.d) + line("M616 1880 C640 1900 676 1902 710 1890", 2, OV.d) +
    fillp("M484 1060 C470 1250 462 1420 456 1560 L468 1560 C474 1420 482 1250 496 1060Z", OV.h, ` opacity="0.8"`) +
    fillp("M612 1220 C624 1380 630 1520 632 1640 L642 1640 C642 1520 636 1380 624 1220Z", OV.h, ` opacity="0.6"`) +
    // 솔기 (스티치)
    line("M486 1000 C468 1200 458 1400 448 1600 C442 1760 436 1920 430 2120", 2, AC, ` stroke-dasharray="7 6" opacity="0.8"`) +
    line("M720 1000 C732 1200 724 1400 710 1600 C704 1760 700 1920 696 2130", 2, AC, ` stroke-dasharray="7 6" opacity="0.6"`) +
    // 기름 얼룩
    `<ellipse cx="660" cy="1460" rx="20" ry="12" fill="${OV.d}" opacity="0.55" transform="rotate(-20 660 1460)"/><ellipse cx="470" cy="1820" rx="14" ry="8" fill="${OV.d}" opacity="0.5"/>` +
    fillp("M712 1100 L736 1080 L740 1180 L716 1170Z", RIM, ` opacity="0.5"`);
  // 무릎 덧댐 (왼다리)
  const patch = part("M468 1562 L560 1570 L554 1684 L462 1676 Z", "#4cb678", fillp("M524 1566 L560 1570 L554 1684 L520 1680Z", OV.s, ` opacity="0.7"`) + line("M474 1574 L552 1580 L547 1672 L470 1665 Z", 2, "#eaffef", ` stroke-dasharray="5 4" opacity="0.8"`), 3);
  // 접어 올린 바짓단
  const cuffL = part("M392 2100 C430 2086 494 2088 528 2100 L530 2160 C494 2174 430 2172 390 2160 Z", "#56c085", fillp("M480 2092 L518 2100 L522 2160 L484 2168Z", OV.s) + line("M412 2128 C444 2138 490 2138 520 2130", 2.5, OV.d) + fillp("M412 2104 C440 2094 480 2094 500 2098 L498 2106 C470 2102 440 2104 412 2114Z", "#9ff0c2"), 4);
  const cuffR = part("M596 2108 C636 2094 700 2094 740 2108 L740 2166 C700 2180 636 2180 596 2166 Z", "#56c085", fillp("M676 2100 L714 2108 L716 2166 L680 2174Z", OV.s) + line("M608 2136 C640 2146 690 2146 714 2138", 2.5, OV.d) + fillp("M610 2112 C640 2102 680 2102 700 2106 L698 2114 C670 2110 640 2112 610 2122Z", "#9ff0c2"), 4);
  // 오른 허벅지 카고 주머니
  const cargo = part("M660 1300 L756 1290 L752 1440 C730 1452 684 1454 664 1444 Z", "#43a86c", fillp("M720 1294 L756 1290 L752 1440 C744 1446 732 1448 720 1450Z", OV.s, ` opacity="0.8"`) + line("M668 1340 L752 1332", 2.5, OV.d) + line("M668 1312 L750 1304 L746 1432 C726 1442 688 1444 670 1436 Z", 1.8, AC, ` stroke-dasharray="5 4" opacity="0.8"`), 3.5) +
    part("M656 1294 L760 1284 L758 1336 L660 1346 Z", "#4cb678", fillp("M656 1294 L760 1284 L759 1294 L657 1304Z", "#9ff0c2") + fillp("M724 1288 L760 1284 L758 1336 L722 1340Z", OV.s, ` opacity="0.7"`), 3.5) +
    `<circle cx="708" cy="1324" r="7" fill="url(#${P}metal)" stroke="${INK}" stroke-width="2.5"/>`;
  // 추가 주름 (당김·뭉침)
  const folds = line("M520 1180 C536 1240 552 1300 560 1360", 2, OV.d, ` opacity="0.7"`) + line("M690 1180 C676 1240 664 1300 656 1360", 2, OV.d, ` opacity="0.7"`) +
    line("M420 2040 C450 2056 490 2058 520 2048", 2.2, OV.d) + line("M414 2074 C440 2088 480 2090 522 2080", 2.2, OV.d) + line("M604 2050 C640 2066 690 2066 732 2054", 2.2, OV.d) + line("M602 2080 C640 2094 690 2094 734 2084", 2.2, OV.d) +
    line("M760 1200 C756 1400 744 1600 740 1800 C738 1950 738 2050 738 2120", 3, RIM, ` opacity="0.7"`);
  return union([hip, L, R], `url(#${P}ov)`, sh, 5) + folds + patch + cargo + cuffL + cuffR;
}
function boots() {
  // 왼발: 뒤꿈치 들고 발끝으로 (바깥쪽)
  const BL = "M412 2150 C410 2200 404 2250 396 2290 C380 2320 370 2350 376 2372 C384 2392 430 2394 470 2388 C500 2384 520 2372 522 2350 C524 2310 522 2240 520 2152 C480 2140 440 2140 412 2150 Z";
  const BR = "M606 2158 C606 2220 604 2280 600 2330 C598 2362 604 2386 640 2392 L760 2392 C784 2390 790 2370 780 2350 C764 2330 740 2318 720 2306 C718 2250 716 2200 716 2158 C680 2146 640 2146 606 2158 Z";
  const sole = (d) => fillp(d, "#2a1a10");
  const shL = fillp("M480 2146 L520 2152 C522 2240 524 2310 522 2350 C520 2372 500 2384 470 2388 C490 2340 488 2240 480 2146Z", "#3a2416", ` opacity="0.8"`) +
    sole("M374 2360 C390 2378 440 2384 476 2378 C500 2374 516 2366 522 2354 L522 2372 C510 2390 470 2396 430 2396 C396 2394 376 2386 372 2372Z") +
    fillp("M420 2160 C418 2210 414 2250 406 2290 L416 2290 C424 2250 428 2210 430 2160Z", "#d8a274", ` opacity="0.8"`) +
    line("M396 2310 C420 2300 460 2300 500 2310", 2.5, "#3a2416");
  const shR = fillp("M676 2152 L716 2158 C716 2200 718 2250 720 2306 C740 2318 764 2330 780 2350 C790 2370 784 2390 760 2392 L700 2392 C700 2330 690 2240 676 2152Z", "#3a2416", ` opacity="0.8"`) +
    sole("M600 2366 C604 2380 616 2388 640 2390 L762 2390 C780 2388 788 2378 786 2366 L788 2380 C786 2396 770 2398 756 2398 L640 2398 C612 2398 598 2390 598 2376Z") +
    fillp("M616 2170 C616 2230 614 2280 610 2330 L620 2330 C624 2280 626 2230 626 2170Z", "#d8a274", ` opacity="0.8"`) +
    line("M602 2320 C640 2308 700 2306 728 2312", 2.5, "#3a2416");
  // 끈
  let lace = "";
  for (let i = 0; i < 5; i++) { const y = 2180 + i * 26; lace += line(`M436 ${y} L500 ${y + 10} M436 ${y + 10} L500 ${y}`, 3, AC) + `<circle cx="434" cy="${y + 5}" r="3.5" fill="${ME.b}" stroke="${INK}" stroke-width="1.5"/><circle cx="502" cy="${y + 5}" r="3.5" fill="${ME.b}" stroke="${INK}" stroke-width="1.5"/>`; }
  for (let i = 0; i < 5; i++) { const y = 2186 + i * 26; lace += line(`M630 ${y} L694 ${y + 8} M630 ${y + 8} L694 ${y}`, 3, AC) + `<circle cx="628" cy="${y + 4}" r="3.5" fill="${ME.b}" stroke="${INK}" stroke-width="1.5"/><circle cx="696" cy="${y + 4}" r="3.5" fill="${ME.b}" stroke="${INK}" stroke-width="1.5"/>`; }
  lace += line("M468 2180 C460 2160 440 2150 430 2160 M468 2180 C480 2160 500 2154 506 2166", 3, AC) + line("M662 2186 C650 2168 632 2162 626 2172 M662 2186 C676 2166 694 2162 700 2172", 3, AC);
  // 철 토캡
  const capL = part("M376 2330 C384 2310 410 2300 440 2302 C434 2330 434 2360 440 2384 C410 2386 384 2380 376 2370 C372 2356 372 2342 376 2330 Z", `url(#${P}metal)`, "", 3);
  const capR = part("M730 2312 C760 2320 782 2340 786 2362 C784 2380 772 2388 756 2390 C752 2360 744 2332 730 2312 Z", `url(#${P}metal)`, "", 3);
  return part(BL, `url(#${P}boot)`, shL, 5) + part(BR, `url(#${P}boot)`, shR, 5) + capL + capR + lace;
}

// ── 몸통 (셔츠 + 멜빵 앞판) ──────────────────────────
function torso() {
  const d = "M562 458 C520 468 482 476 454 488 C428 500 418 528 420 568 L452 640 C462 720 486 790 500 830 L702 830 C716 790 738 720 748 640 L780 568 C782 528 772 500 746 488 C718 476 680 468 638 458 Z";
  const sh = fillp("M640 466 C700 476 760 494 776 540 L780 568 L748 640 C738 720 716 790 702 830 L650 830 C676 760 690 680 680 600 C670 540 660 500 640 466Z", SH.s) +
    // 가슴 아래 주름 그림자
    fillp("M478 650 C520 680 560 690 600 684 C560 700 520 696 490 684Z", SH.s) + fillp("M620 684 C660 690 700 680 730 650 C716 684 680 698 640 700Z", SH.d, ` opacity="0.7"`) +
    line("M470 560 C490 600 500 630 520 650", 2, SH.d) + line("M740 560 C722 600 708 640 690 660", 2, SH.d) +
    line("M520 760 C540 790 560 806 590 816", 2, SH.d) + line("M690 760 C672 790 650 808 620 818", 2, SH.d) +
    fillp("M460 520 C480 506 510 496 540 494 C516 530 498 570 488 620 C472 590 460 560 460 520Z", "#fff");
  // 셔츠 깃 (열린 V)
  const collarL = "M566 446 C552 470 546 494 548 520 L590 540 L598 500 C592 484 580 466 566 446 Z";
  const collarR = "M634 446 C648 470 656 494 654 520 L612 540 L602 500 C608 484 620 466 634 446 Z";
  const vneck = "M572 460 L600 540 L628 460 Z";
  let s = part(d, `url(#${P}shirt)`, sh + line("M776 560 L746 640 C736 720 714 790 700 830", 3, RIM, ` opacity=\"0.7\"`), 5);
  s += part(vneck, SK.b, fillp("M572 460 L628 460 L620 484 C606 476 594 476 580 484Z", SK.s), 3);
  s += part(collarL, SH.b, fillp("M548 500 L590 540 L596 512Z", SH.s), 3.5) + part(collarR, SH.b, fillp("M602 500 L612 540 L654 520 L650 500Z", SH.s), 3.5);
  s += `<circle cx="600" cy="560" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="600" cy="610" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/>` + line("M600 540 L600 640", 2, SH.d);
  return s;
}
function bib() {
  // 멜빵 앞판: 오른쪽(화면) 끈이 내려가 모서리가 처짐
  const d = "M520 598 C560 604 620 606 660 612 C674 628 686 648 692 672 C690 730 692 780 700 830 L502 830 C508 780 512 700 520 598 Z";
  const sh = fillp("M650 612 L660 612 C674 628 686 648 692 672 C690 730 692 780 700 830 L640 830 C650 760 660 680 650 612Z", OV.s) +
    fillp("M660 612 C672 640 676 660 668 690 C684 676 690 670 692 672 C686 648 674 628 660 612Z", OV.d) +
    fillp("M528 610 C524 680 520 740 516 800 L526 800 C530 740 534 680 538 610Z", OV.h, ` opacity="0.7"`) +
    line("M530 612 L524 826", 2, AC, ` stroke-dasharray="6 5" opacity="0.8"`) + line("M684 680 L690 826", 2, AC, ` stroke-dasharray="6 5" opacity="0.6"`) +
    line("M528 610 C570 616 620 618 654 622", 2, AC, ` stroke-dasharray="6 5" opacity="0.8"`);
  // 가슴 주머니 + 휘장 패치 + 펜
  const pocket = part("M548 650 L652 656 L648 760 C620 772 580 772 552 760 Z", "#44a86e", fillp("M620 654 L652 656 L648 760 C640 764 630 768 618 770Z", OV.s, ` opacity="0.8"`) + line("M556 662 L644 667 L640 754 C614 764 584 764 560 754 Z", 2, AC, ` stroke-dasharray="5 4"`), 3.5);
  const pen = part("M566 610 L578 610 L578 668 L566 668 Z", "#ffcf3a", fillp("M566 610 L572 610 L572 668 L566 668Z", "#fff3b0"), 2.5) + part("M564 604 L580 604 L580 620 L564 620 Z", ME.b, "", 2) + line("M577 616 L577 650", 2.5, ME.s);
  const driver = part("M626 600 L640 600 L640 664 L626 664 Z", "#e8483a", fillp("M626 600 L632 600 L632 664 L626 664Z", "#ff9a8a"), 2.5) + line("M633 600 L633 576", 4, ME.s) + line("M633 600 L633 576", 1.5, "#fff");
  const patch = part("M600 684 L630 712 L600 740 L570 712 Z", "#1f3d2c", fillp("M600 700 C592 706 582 706 576 712 C584 716 592 716 600 722 C608 716 616 716 624 712 C618 706 608 706 600 700Z", AC), 2.5) + line("M600 690 L624 712 L600 734 L576 712 Z", 1.5, AC);
  // 멜빵 단추
  const btn = (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="url(#${P}metal)" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4" fill="${ME.s}"/><circle cx="${x - 4}" cy="${y - 4}" r="2.5" fill="#fff"/>`;
  return part(d, `url(#${P}ov)`, sh, 4.5) + driver + pocket + pen + patch + btn(536, 624) + btn(668, 640) + btn(510, 846) + btn(694, 846);
}
function straps() {
  // 왼쪽(화면) 멜빵: 어깨 위로 / 오른쪽 멜빵: 허리 옆에 늘어짐
  const up = "M516 600 C512 560 510 520 512 476 L548 466 C548 510 548 556 552 604 Z";
  const ush = fillp("M538 470 L548 466 C548 510 548 556 552 604 L542 604 C540 556 538 510 538 470Z", OV.s) + line("M520 480 L522 596", 1.8, AC, ` stroke-dasharray="5 4"`);
  const buckle = part("M508 560 L556 556 L558 600 L510 604 Z", `url(#${P}metal)`, fillp("M518 570 L546 568 L547 590 L519 592Z", OV.b), 3);
  const down = "M708 840 C716 880 724 930 728 980 C730 1010 734 1040 738 1060 L704 1066 C700 1030 694 990 690 950 C686 910 680 870 676 840 Z";
  const dsh = fillp("M720 860 C726 920 732 990 738 1060 L724 1062 C718 990 712 920 706 860Z", OV.s) + line("M688 860 L704 1050", 1.8, AC, ` stroke-dasharray="5 4"`);
  const dbuck = part("M696 1030 L746 1024 L752 1080 L702 1086 Z", `url(#${P}metal)`, fillp("M706 1040 L736 1036 L740 1070 L710 1074Z", "#30343e") + line("M720 1036 L724 1076", 4, ME.b), 3);
  return part(up, `url(#${P}ov)`, ush, 4) + buckle + part(down, `url(#${P}ov)`, dsh, 4) + dbuck;
}
function toolBelt() {
  // 골반에 비스듬히 걸친 가죽 공구 벨트
  const belt = "M468 940 C540 930 640 914 734 896 L740 944 C646 964 544 982 474 990 Z";
  let s = part(belt, `url(#${P}lea)`, fillp("M468 940 C540 930 640 914 734 896 L735 906 C640 924 540 940 469 950Z", LE.h, ` opacity="0.7"`) + line("M474 976 C544 968 646 950 738 932", 1.8, "#f0c890", ` stroke-dasharray="6 5"`) + line("M470 952 C540 944 640 926 736 908", 1.8, "#f0c890", ` stroke-dasharray="6 5"`), 4);
  s += part("M572 912 L626 904 L632 960 L578 968 Z", `url(#${P}metal)`, fillp("M584 922 L616 918 L620 950 L588 954Z", LE.s) + line("M600 920 L604 956", 5, ME.b), 3.5);
  // 왼쪽 큰 파우치 (펜치·드라이버 꽂힘)
  const pliers = part("M496 920 L508 860 L520 862 L512 924 Z", "#e8483a", "", 3) + part("M520 924 L540 866 L552 870 L534 928 Z", "#e8483a", "", 3) + part("M504 864 L514 820 L526 822 L548 868 L536 872 L520 838 L516 866 Z", `url(#${P}metal)`, "", 3);
  const pouch = "M462 960 L566 948 L572 1080 C556 1100 486 1104 470 1086 Z";
  const psh = fillp("M532 952 L566 948 L572 1080 C564 1090 548 1096 534 1098Z", LE.s) + fillp("M462 960 L566 948 L567 990 C530 1000 496 1004 463 1004Z", LE.s, ` opacity="0.6"`) +
    line("M470 1006 C500 1004 534 998 566 992", 2.5, LE.d) + line("M474 1018 L476 1080 M560 1004 L564 1076", 1.8, "#f0c890", ` stroke-dasharray="5 4"`) + fillp("M470 970 L480 968 L486 1080 L476 1078Z", LE.h, ` opacity="0.6"`);
  s = pliers + s + part(pouch, `url(#${P}lea)`, psh, 4) + part("M506 990 L526 988 L528 1012 L508 1014 Z", `url(#${P}metal)`, "", 2.5);
  // 오른쪽 작은 파우치 + 망치 고리
  const hammer = part("M700 960 L716 958 L728 1120 L712 1122 Z", "#c8783a", fillp("M708 959 L716 958 L728 1120 L720 1121Z", "#8a4a20"), 3) + part("M682 1110 L752 1102 L756 1134 L686 1142 Z", `url(#${P}metal)`, "", 3.5);
  const pouch2 = "M640 930 L702 920 L708 1010 C692 1024 656 1026 646 1012 Z";
  s += hammer + part(pouch2, `url(#${P}lea)`, fillp("M680 922 L702 920 L708 1010 C700 1016 690 1020 682 1020Z", LE.s) + fillp("M640 930 L702 920 L703 950 L641 958Z", LE.s, ` opacity="0.6"`) + line("M648 962 L704 954", 2, LE.d), 4) + part("M664 944 L680 942 L681 962 L665 964 Z", `url(#${P}metal)`, "", 2);
  const keys = line("M620 960 C610 980 612 1000 626 1008 C640 1012 648 996 642 980 C638 968 630 962 620 960", 5, INK) + line("M620 960 C610 980 612 1000 626 1008 C640 1012 648 996 642 980 C638 968 630 962 620 960", 2.5, AC) +
    part("M618 1006 L630 1004 L640 1048 L628 1052 Z", `url(#${P}metal)`, "", 2.5) + part("M634 1004 L644 1008 L636 1050 L626 1046 Z", "#ffcf3a", "", 2.5) + part("M612 1046 L644 1040 L648 1070 L616 1076 Z", "#ff8a2a", line("M618 1056 L640 1052", 1.5, "#fff"), 2.5);
  s += keys;
  // 허리에 꽂은 걸레
  const rag = "M470 990 C456 1040 452 1090 460 1140 C468 1160 486 1170 498 1164 C490 1120 494 1060 506 1000 Z";
  s = part(rag, "#ffcf8a", fillp("M490 996 C480 1060 478 1120 486 1166 L498 1164 C490 1120 494 1060 506 1000Z", "#e09a50") + line("M462 1060 L500 1056 M460 1100 L496 1098 M466 1140 L494 1138", 3, "#e8603a", ` opacity="0.7"`) + line("M474 1000 L470 1150 M486 998 L480 1160", 2, "#e8603a", ` opacity="0.5"`), 3.5) + s;
  return s;
}

// ── 목 ─────────────────────────────────────────────
function neck() {
  return part("M576 384 L572 466 Q600 484 628 466 L624 384 Z", SK.b, fillp("M560 384 L640 384 L640 430 C620 414 580 414 560 430Z", SK.s) + fillp("M618 400 L640 400 L640 470 L620 478Z", SK.s));
}

// ── 팔 ─────────────────────────────────────────────
function armLeft() {
  // 화면 왼쪽: 렌치를 어깨에 메는 팔 (팔꿈치 아래로)
  const sleeve = "M456 488 C424 494 404 520 400 556 C392 600 378 640 362 680 L420 708 C436 668 452 626 468 584 Z";
  const ssh = fillp("M440 520 C440 580 432 640 420 708 L400 698 C414 640 424 580 430 520Z", SH.s) + line("M406 600 C420 610 436 612 452 606", 2, SH.d) + fillp("M410 530 C404 560 398 590 390 620 L400 622 C408 590 414 560 420 530Z", "#fff");
  const roll = "M356 668 C370 650 410 658 432 680 C430 700 420 716 404 724 C384 722 362 708 352 692 C350 682 352 674 356 668 Z";
  const rsh = fillp("M400 660 C420 668 432 680 432 680 C430 700 420 716 404 724 C410 704 408 680 400 660Z", SH.s) + line("M358 684 C376 694 398 702 422 704", 2, SH.d);
  // 아래팔: 팔꿈치(380 712) → 손목(470 590)
  const fore = "M362 700 C370 726 396 734 414 722 C440 690 466 650 488 606 L452 580 C430 620 400 660 362 700 Z";
  const fsh = fillp("M414 722 C440 690 466 650 488 606 L476 598 C452 640 426 680 400 712Z", SK.s) + fillp("M376 700 C400 676 424 646 446 610 L452 614 C430 650 404 682 382 706Z", SK.h, ` opacity="0.8"`);
  return part(sleeve, `url(#${P}shirt)`, ssh, 4.5) + part(fore, `url(#${P}skin)`, fsh, 4.5) + part(roll, SH.b, rsh, 4);
}
function handLeft() {
  // 렌치 손잡이를 쥔 주먹 (손가락 마디가 보임)
  let s = "";
  const fist = "M444 548 C452 532 476 524 496 530 C514 536 524 552 520 572 C516 594 500 610 478 612 C460 612 444 600 440 582 C438 570 440 558 444 548 Z";
  s += part(fist, SK.b, fillp("M500 534 C514 540 524 556 520 574 C516 596 500 610 478 612 C496 596 506 570 500 534Z", SK.s), 4);
  // 감싼 손가락 4개 (가로 마디)
  s += fing([[452, 560], [474, 552], [496, 556]], 16) + fing([[452, 576], [476, 570], [500, 574]], 16) + fing([[454, 592], [476, 588], [498, 590]], 15) + fing([[460, 606], [476, 604], [492, 604]], 13);
  // 엄지
  s += fing([[500, 536], [486, 526], [470, 530]], 15);
  // 반창고
  s += `<rect x="470" y="545" width="22" height="11" rx="4" fill="#f6d2a0" stroke="${INK}" stroke-width="1.5" transform="rotate(-8 481 550)"/>`;
  return s;
}
function armRight() {
  // 화면 오른쪽: 엄지 척! (팔꿈치 아래, 주먹은 어깨 옆)
  const sleeve = "M744 488 C776 494 796 520 800 556 C808 600 824 650 840 690 L782 716 C768 676 750 630 732 584 Z";
  const ssh = fillp("M776 520 C784 580 800 640 820 700 L840 690 C824 650 808 600 800 556 C798 540 790 526 776 520Z", SH.s) + line("M752 606 C770 614 788 614 804 606", 2, SH.d) + line("M762 650 C780 658 800 656 816 648", 2, SH.d);
  const roll = "M772 694 C790 670 836 668 852 682 C858 698 852 716 840 726 C816 732 790 726 776 714 C770 708 770 700 772 694 Z";
  const rsh = fillp("M820 674 C840 676 852 682 852 682 C858 698 852 716 840 726 C840 706 834 688 820 674Z", SH.s) + line("M776 704 C796 714 820 716 846 708", 2, SH.d);
  // 아래팔: 팔꿈치(816 722) → 손목(880 600)
  const fore = "M790 712 C796 736 828 742 846 724 C862 690 880 650 900 612 L860 594 C842 630 816 670 790 712 Z";
  const fsh = fillp("M846 724 C862 690 880 650 900 612 L888 606 C870 646 852 686 834 720Z", SK.s) + fillp("M804 708 C824 674 842 640 860 604 L866 608 C848 644 828 680 810 712Z", SK.h, ` opacity="0.8"`);
  const band = part("M856 590 L906 612 L894 640 L846 618 Z", AC, fillp("M880 600 L906 612 L894 640 L872 630Z", "#1e8a56") + line("M852 604 L900 626", 1.5, "#bfffe0"), 3.5);
  return part(sleeve, `url(#${P}shirt)`, ssh + line("M796 540 C806 600 822 650 838 690", 3, RIM, ` opacity=\"0.8\"`), 4.5) + part(fore, `url(#${P}skin)`, fsh + line("M846 722 C864 688 882 648 898 614", 3, RIM, ` opacity=\"0.8\"`), 4.5) + part(roll, SH.b, rsh, 4) + band;
}
function handRight() {
  // 엄지 척 주먹
  let s = "";
  const fist = "M852 556 C856 536 878 524 900 528 C922 532 934 550 930 572 C926 594 908 606 886 604 C866 602 850 588 850 572 C850 566 850 560 852 556 Z";
  s += part(fist, SK.b, fillp("M904 530 C922 536 934 552 930 572 C926 594 908 606 886 604 C906 590 914 562 904 530Z", SK.s), 4);
  s += fing([[858, 548], [884, 544], [904, 552]], 16) + fing([[856, 564], [884, 562], [906, 568]], 16) + fing([[858, 580], [884, 580], [904, 584]], 15) + fing([[864, 594], [884, 596], [900, 598]], 13);
  // 위로 세운 엄지
  s += fing([[880, 540], [878, 512], [884, 488]], 18);
  s += line("M876 522 l10 0", 1.8, SK.d);
  return s;
}

// ── 얼굴 ───────────────────────────────────────────
const FACE = "M508 252 C506 316 528 360 558 388 Q600 416 642 388 C672 360 694 316 692 252 C688 208 650 188 600 188 C550 188 512 208 508 252 Z";
function face() {
  const sh = fillp("M654 196 C690 220 698 266 692 306 C686 346 668 372 642 392 C668 352 676 300 664 250 Z", SK.s, ` opacity="0.85"`) +
    fillp("M500 200 L700 200 L700 280 C690 262 680 270 672 258 C660 272 650 262 640 270 C630 258 620 266 610 256 C600 268 588 258 578 270 C566 258 556 270 546 262 C536 272 526 262 516 276 L500 290Z", SK.s) +
    fillp("M556 386 Q600 414 644 386 C636 408 618 422 600 424 C582 422 564 408 556 386Z", SK.d, ` opacity="0.4"`) +
    fillp("M522 300 C524 330 534 352 548 364 C538 342 530 320 528 296Z", SK.h, ` opacity="0.8"`);
  return part(FACE, `url(#${P}skin)`, sh, 4);
}
function ears() {
  const e = (s) => {
    const X = (x) => 600 + s * x;
    const d = `M${X(90)} 286 C${X(110)} 276 ${X(116)} 300 ${X(112)} 320 C${X(108)} 342 ${X(98)} 352 ${X(84)} 350 Z`;
    return part(d, SK.b, fillp(`M${X(94)} 296 C${X(104)} 294 ${X(106)} 312 ${X(102)} 328 C${X(98)} 336 ${X(92)} 340 ${X(88)} 338Z`, SK.s), 3.5);
  };
  return e(-1) + e(1);
}
function eye(s, e) {
  const X = (x) => 600 + s * x;
  const cfg = {
    normal: { hi: 26, ho: 24, b: 22, ir: 1, look: 0 },
    smile: { hi: 0, ho: 0, b: 0, ir: 1, look: 0 },
    angry: { hi: 14, ho: 24, b: 20, ir: 0.9, look: 0 },
    sad: { hi: 26, ho: 18, b: 22, ir: 1, look: 3 },
    surprise: { hi: 32, ho: 30, b: 26, ir: 0.68, look: 0 },
    serious: { hi: 15, ho: 16, b: 17, ir: 0.95, look: 1 },
  }[e];
  const cy = 308, oy = 304, iy = 310;
  if (e === "smile") {
    // 눈웃음 ^ ^
    return line(`M${X(18)} ${cy + 6} C${X(34)} ${cy - 18} ${X(66)} ${cy - 20} ${X(84)} ${cy + 2}`, 7) + line(`M${X(84)} ${cy + 2} L${X(94)} ${cy - 4}`, 4) + line(`M${X(30)} ${cy + 12} C${X(46)} ${cy + 8} ${X(62)} ${cy + 8} ${X(74)} ${cy + 12}`, 2, INK, ` opacity="0.5"`);
  }
  const top = `M${X(86)} ${oy} C${X(74)} ${cy - cfg.ho} ${X(30)} ${cy - cfg.hi} ${X(14)} ${iy}`;
  const bot = `C${X(28)} ${cy + cfg.b} ${X(68)} ${cy + cfg.b} ${X(86)} ${oy}`;
  const scl = top + " " + bot + "Z";
  const irx = 20 * cfg.ir, iry = 26 * cfg.ir, icx = X(50), icy = cy + 2 + cfg.look;
  let inner = fillp(`M${X(92)} 270 L${X(8)} 270 L${X(8)} ${cy - cfg.hi + 9} L${X(92)} ${cy - cfg.ho + 9}Z`, "#e9c9c0");
  inner += `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#${P}iris)" stroke="#0e4a30" stroke-width="2.5"/>`;
  inner += `<ellipse cx="${icx}" cy="${icy + 2}" rx="${f(irx * 0.45)}" ry="${f(iry * 0.5)}" fill="#0b2a1c"/>`;
  inner += fillp(`M${f(icx - irx * 0.8)} ${f(icy + iry * 0.3)} Q${icx} ${f(icy + iry * 1.1)} ${f(icx + irx * 0.8)} ${f(icy + iry * 0.3)} Q${icx} ${f(icy + iry * 0.7)} ${f(icx - irx * 0.8)} ${f(icy + iry * 0.3)}Z`, "#f4ffb0", ` opacity="0.75"`);
  inner += fillp(`M${f(icx - irx)} ${f(icy - iry)} L${f(icx + irx)} ${f(icy - iry)} L${f(icx + irx)} ${f(icy - iry * 0.3)} Q${icx} ${f(icy - iry * 0.55)} ${f(icx - irx)} ${f(icy - iry * 0.3)}Z`, "#0b2a1c", ` opacity="0.5"`);
  inner += `<ellipse cx="${f(icx - 7)}" cy="${f(icy - 9)}" rx="${f(7 * cfg.ir)}" ry="${f(9 * cfg.ir)}" fill="#fff"/><circle cx="${f(icx + 8)}" cy="${f(icy + 10)}" r="3.4" fill="#fff"/><circle cx="${f(icx + 4)}" cy="${f(icy - 12)}" r="2.2" fill="#fff" opacity="0.85"/>`;
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.2; inner += line(`M${f(icx + Math.cos(a) * irx * 0.5)} ${f(icy + 2 + Math.sin(a) * iry * 0.5)} L${f(icx + Math.cos(a) * irx * 0.9)} ${f(icy + 2 + Math.sin(a) * iry * 0.9)}`, 1.4, "#d8ffb0", ` opacity="0.35"`); }
  inner += `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx * 0.92)}" ry="${f(iry * 0.92)}" fill="none" stroke="#d8ffb0" stroke-width="1.2" opacity="0.4"/>`;
  inner += fillp(`M${f(icx + irx * 0.2)} ${f(icy - iry * 0.75)} l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3Z`, "#fff", ` opacity="0.9"`);
  let o = fillp(scl, "#fffdfb");
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${scl}"/></clipPath>`);
  o += `<g clip-path="url(#${id})">${inner}</g>`;
  // 윗 속눈썹 (굵게 + 바깥 속눈썹 두 가닥)
  o += line(`M${X(12)} ${iy + 1} C${X(30)} ${cy - cfg.hi - 2} ${X(74)} ${cy - cfg.ho - 2} ${X(88)} ${oy - 1}`, 7);
  o += line(`M${X(56)} ${cy - (cfg.hi + cfg.ho) / 2 - 2} C${X(72)} ${cy - cfg.ho - 2} ${X(84)} ${oy - 6} ${X(96)} ${oy - 10}`, 9);
  o += line(`M${X(86)} ${oy - 4} l${s * 12} -6 M${X(88)} ${oy + 2} l${s * 10} 2`, 3.5);
  o += line(`M${X(36)} ${cy + cfg.b - 1} C${X(54)} ${cy + cfg.b + 1} ${X(72)} ${cy + cfg.b - 4} ${X(84)} ${oy + 4}`, 2.4, INK, ` opacity="0.8"`);
  o += line(`M${X(28)} ${cy - cfg.hi - 8} C${X(48)} ${cy - (cfg.hi + cfg.ho) / 2 - 13} ${X(70)} ${cy - cfg.ho - 10} ${X(84)} ${oy - 12}`, 2, INK, ` opacity="0.6"`);
  if (e === "sad") o += fillp(`M${X(34)} ${cy + cfg.b - 3} Q${X(54)} ${cy + cfg.b + 7} ${X(74)} ${cy + cfg.b - 3} Q${X(56)} ${cy + cfg.b + 2} ${X(34)} ${cy + cfg.b - 3}Z`, "#bfe8ff", ` opacity="0.95"`) + fillp(`M${X(44)} ${cy + 26} C${X(38)} ${cy + 40} ${X(38)} ${cy + 50} ${X(46)} ${cy + 52} C${X(54)} ${cy + 50} ${X(52)} ${cy + 38} ${X(44)} ${cy + 26}Z`, "#c8ecff", ` stroke="#6fb6e6" stroke-width="1.5" opacity="0.9"`);
  return o;
}
function brow(s, e) {
  const X = (x) => 600 + s * x;
  const B = { normal: [256, 246, 252], smile: [250, 240, 248], angry: [266, 252, 242], sad: [244, 248, 262], surprise: [236, 226, 234], serious: [262, 256, 254] }[e];
  const d = `M${X(18)} ${B[0] + 2} C${X(40)} ${B[1] - 3} ${X(66)} ${B[1] - 3} ${X(90)} ${B[2]} C${X(66)} ${B[1] + 2} ${X(42)} ${B[1] + 4} ${X(20)} ${B[0] + 9} Z`;
  return path(d, "#c4501c", 2);
}
function nose() {
  return line("M604 340 C606 348 604 352 598 354", 2.5, SK.d) + `<circle cx="592" cy="342" r="3" fill="#fff" opacity="0.8"/>`;
}
function mouth(e) {
  const red = "#8a2c34";
  switch (e) {
    case "smile": return path("M566 368 C584 372 616 372 634 366 C630 396 614 410 600 410 C586 410 570 396 566 368 Z", red, 3) + fillp("M570 370 C590 374 612 374 630 368 L628 378 C610 382 590 382 572 380Z", "#fff") + fillp("M580 398 C590 390 610 390 620 398 C612 408 588 408 580 398Z", "#e86a78");
    case "angry": return path("M574 372 C590 366 612 366 626 372 L620 392 C606 398 592 398 580 392 Z", red, 3) + fillp("M576 373 C592 368 610 368 624 373 L622 381 C606 378 592 378 578 381Z", "#fff") + line("M590 368 l0 12 M602 368 l0 12 M614 368 l0 12", 1.2, "#c9c3d0");
    case "sad": return path("M584 384 C590 376 610 376 616 384 C608 380 592 380 584 384 Z", red, 2.5) + line("M596 392 Q600 391 604 392", 1.5, SK.d);
    case "surprise": return path("M600 366 C616 366 622 382 620 392 C616 404 584 404 580 392 C578 382 584 366 600 366Z", red, 3) + fillp("M586 394 C592 386 608 386 614 394 C610 400 590 400 586 394Z", "#e86a78");
    case "serious": return line("M586 380 C594 378 606 378 614 380", 3) + line("M596 388 Q600 387 604 388", 1.5, SK.d);
    default: return path("M574 370 C590 378 610 378 626 370 C620 386 610 392 600 392 C590 392 580 386 574 370 Z", red, 3) + fillp("M578 372 C592 378 608 378 622 372 L620 377 C608 381 592 381 580 377Z", "#fff") + fillp("M588 386 C594 382 606 382 612 386 C606 391 594 391 588 386Z", "#e86a78");
  }
}
function cheeks(e) {
  // 주근깨 + 홍조 + 기름 자국
  let s = "";
  const o = e === "smile" ? 0.6 : e === "sad" || e === "surprise" ? 0.45 : e === "angry" ? 0.5 : 0.38;
  s += `<ellipse cx="538" cy="352" rx="28" ry="12" fill="#ff8a7a" opacity="${o}"/><ellipse cx="662" cy="352" rx="28" ry="12" fill="#ff8a7a" opacity="${o}"/>`;
  const fr = [[528, 342], [540, 336], [552, 344], [534, 352], [546, 350], [562, 336], [672, 342], [660, 336], [648, 344], [666, 352], [654, 350], [638, 336], [588, 330], [612, 330]];
  s += fr.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#c8643c" opacity="0.75"/>`).join("");
  // 기름 자국 (화면 오른쪽 뺨)
  s += fillp("M640 364 C652 356 676 354 686 362 C690 370 680 376 668 376 C660 382 646 382 640 376 C634 372 634 368 640 364 Z", "#4a4652", ` opacity="0.55"`) + fillp("M650 362 C660 358 672 358 678 362 C670 362 660 364 652 368Z", "#2e2a36", ` opacity="0.5"`);
  if (e === "angry") s += line("M680 214 l14 -10 M684 226 l18 -4 M674 204 l6 -16", 4, "#e0505a");
  if (e === "surprise") s += fillp("M694 256 C688 272 688 284 696 288 C704 284 702 272 694 256Z", "#bfe8ff", ` stroke="#6fb6e6" stroke-width="2"`);
  return s;
}

// ── 앞머리 + 고글 ───────────────────────────────────
function hairFront() {
  const mass = "M492 330 C480 260 490 190 530 152 C560 124 640 120 676 146 C716 176 726 250 712 330 C700 290 690 270 676 262 C660 250 640 246 600 244 C560 246 540 250 524 262 C508 274 498 300 492 330 Z";
  // 삐죽삐죽 부스스한 덩어리들
  const tufts = [
    // 앞머리 (이마 위로 내려옴)
    leaf([512, 240], [562, 230], [514, 288], -8), leaf([552, 230], [604, 226], [566, 282], -8), leaf([596, 226], [640, 232], [612, 290], 6),
    leaf([630, 232], [676, 240], [668, 282], 8), leaf([668, 240], [704, 262], [712, 296], 4),
    // 옆머리 (뺨 옆 → 바깥으로 뻗침)
    leaf([490, 262], [526, 296], [458, 436], -16), leaf([508, 318], [522, 296], [492, 462], 4),
    leaf([710, 262], [674, 296], [742, 436], 16), leaf([692, 318], [678, 296], [710, 462], -4),
    // 정수리 부스스
    leaf([520, 170], [560, 140], [482, 120], -12), leaf([560, 138], [610, 128], [556, 76], -10), leaf([610, 128], [660, 140], [676, 80], 12),
    leaf([660, 146], [700, 176], [742, 132], 14), leaf([496, 220], [510, 180], [448, 190], -10), leaf([706, 186], [716, 230], [770, 216], 10),
  ];
  const ds = [mass, ...tufts];
  let inner =
    fillp("M470 280 C480 340 490 400 500 460 L440 460Z", HR.s) + fillp("M690 160 C730 200 740 280 716 340 C724 380 730 420 740 460 L800 460 L800 140Z", HR.s) +
    // 앞머리 아래 그림자
    fillp("M510 270 L700 270 L710 310 L496 310Z", HR.s, ` opacity="0.6"`) +
    fillp(leaf([546, 236], [556, 234], [536, 292], -2), HR.d, ` opacity="0.6"`) + fillp(leaf([590, 230], [598, 230], [590, 286], -3), HR.d, ` opacity="0.6"`) + fillp(leaf([636, 236], [644, 236], [650, 290], 3), HR.d, ` opacity="0.6"`) + fillp(leaf([672, 244], [680, 248], [690, 292], 2), HR.d, ` opacity="0.5"`) +
    fillp(leaf([500, 300], [508, 300], [470, 410], -6), HR.d, ` opacity="0.5"`) + fillp(leaf([700, 300], [692, 300], [730, 410], 6), HR.d, ` opacity="0.5"`) +
    fillp(leaf([548, 150], [560, 146], [520, 110], -4), HR.s) + fillp(leaf([600, 134], [612, 134], [590, 92], -4), HR.s) + fillp(leaf([640, 140], [650, 144], [668, 98], 4), HR.s) +
    // 윤기 (앞머리 위 고리 모양 하이라이트)
    fillp("M520 252 C540 240 560 238 572 240 L566 252 L578 248 L574 260 C556 258 540 262 526 270Z", HR.h, ` opacity="0.95"`) +
    fillp("M608 236 C626 236 646 240 660 248 L652 256 L664 258 L660 268 C642 260 626 256 610 256Z", HR.h, ` opacity="0.9"`) +
    fillp("M478 320 C480 300 486 286 494 276 C490 296 490 316 492 336Z", HR.h, ` opacity="0.8"`) +
    fillp("M530 150 C550 134 574 124 600 122 C580 132 560 142 544 158Z", HR.h, ` opacity="0.9"`);
  let s = union(ds, `url(#${P}hair)`, inner, 4.5);
  s += line("M560 236 C556 256 554 270 552 286", 2, INK, ` opacity="0.6"`) + line("M612 232 C616 252 620 270 622 290", 2, INK, ` opacity="0.6"`) + line("M506 300 C496 330 486 360 476 400", 2, INK, ` opacity="0.6"`) + line("M696 300 C706 330 716 360 726 400", 2, INK, ` opacity="0.6"`);
  // 아호게 (정수리 한 가닥)
  s += part("M596 128 C590 96 604 66 636 54 C626 72 620 92 622 112 C616 108 610 110 608 128 Z", `url(#${P}hair)`, fillp("M600 120 C598 96 610 74 630 60 C618 80 614 100 616 112Z", HR.h, ` opacity="0.6"`), 3.5);
  // 림 라이트
  s += line("M716 200 C732 260 726 320 720 340", 3.5, RIM, ` opacity="0.85"`);
  return s;
}
function goggles() {
  // 이마 위에 올린 고글: 끈 + 렌즈 2개
  const strap = "M480 214 C520 188 560 180 600 180 C640 180 680 188 724 212 L728 242 C684 220 640 212 600 212 C560 212 520 220 478 244 Z";
  let s = part(strap, "#2e3440", fillp("M480 214 C520 188 560 180 600 180 C640 180 680 188 724 212 L725 220 C684 198 640 190 600 190 C560 190 520 198 480 222Z", "#5a6476") + line("M486 236 C530 212 570 204 600 204 C640 204 680 212 722 234", 1.6, AC, ` stroke-dasharray="6 5"`), 4);
  const lens = (cx) => {
    const r = 40;
    return `<circle cx="${cx}" cy="196" r="${r + 9}" fill="url(#${P}metal)" stroke="${INK}" stroke-width="4"/>` +
      `<circle cx="${cx}" cy="196" r="${r}" fill="url(#${P}lens)" stroke="${INK}" stroke-width="3"/>` +
      fillp(`M${cx - 28} ${190} C${cx - 26} ${172} ${cx - 12} ${162} ${cx + 4} ${162} C${cx - 8} ${170} ${cx - 18} ${180} ${cx - 20} ${196}Z`, "#fff", ` opacity="0.85"`) +
      `<circle cx="${cx + 18}" cy="214" r="5" fill="#fff" opacity="0.7"/>` + line(`M${cx - 30} ${220} C${cx - 10} ${236} ${cx + 18} ${234} ${cx + 32} ${214}`, 3, "#0c4a30", ` opacity="0.6"`) +
      [0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3 + 0.3; return `<circle cx="${f(cx + Math.cos(a) * (r + 4.5))}" cy="${f(196 + Math.sin(a) * (r + 4.5))}" r="2.4" fill="${ME.d}"/>`; }).join("");
  };
  s += lens(552) + lens(648);
  const tuft = [leaf([476, 226], [500, 212], [458, 186], -6), leaf([700, 210], [726, 226], [744, 190], 6), leaf([592, 184], [608, 184], [606, 150], 3)];
  s += union(tuft, `url(#${P}hair)`, fillp("M480 200 L720 200 L720 214 L480 214Z", HR.s, ` opacity="0.7"`), 3.5);
  s += part("M590 186 L610 186 L612 206 L588 206 Z", `url(#${P}metal)`, "", 3);
  return s;
}

export function svg(expr = "normal") {
  if (!["normal", "smile", "angry", "sad", "surprise", "serious"].includes(expr)) expr = "normal";
  clipN = 0; clips.length = 0;
  const body = wrench() + hairBack() + neck() + legs() + boots() + torso() + bib() + straps() + toolBelt() + armRight() + handRight() + armLeft() + handLeft();
  const head = `<g transform="translate(600 440) scale(1.05) translate(-600 -440)"><g transform="rotate(3 600 420)">` + ears() + face() + cheeks(expr) + nose() + mouth(expr) + `<g transform="translate(552 308) scale(1.08) translate(-552 -308)">${eye(-1, expr)}</g><g transform="translate(648 308) scale(1.08) translate(-648 -308)">${eye(1, expr)}</g>` + hairFront() + brow(-1, expr) + brow(1, expr) + goggles() + `</g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${defs()}${clips.join("")}</defs>${body}${head}</svg>`;
}
