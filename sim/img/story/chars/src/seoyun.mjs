// 한서윤 — 에이아(EIA)의 창조자, 30대 후반 과학자 (「에이아 연대기」 전신 입간판, viewBox 0 0 1200 2400)
export const ID = "seoyun", NAME = "한서윤";

const P = "seoyun-";
const INK = "#1a1626";
const SK = { b: "#fbe1d3", s: "#eab3a3", d: "#cf8b84", h: "#fff4ee" };
const HR = { b: "#2b2638", s: "#1a1624", d: "#110e19", h: "#5b5878", g: "#8d8fb4" };
const CT = { b: "#f3f6fb", s: "#ccd5e6", d: "#9ba9c4", h: "#ffffff" }; // 가운
const TN = { b: "#2f3346", s: "#22253a", d: "#171a2a", h: "#4a5070" }; // 터틀넥
const PT = { b: "#383a4c", s: "#262838", d: "#1a1b28", h: "#555872" }; // 바지
const ACC = "#b8e0ff", GLOW = "#7fd8ff", RIM = "#b8e0ff";

// ── 도구 ────────────────────────────────────────────
const f = (n) => Math.round(n * 10) / 10;
const S = (d, fill, sw = 4, ex = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${ex}/>`;
const F = (d, fill, ex = "") => `<path d="${d}" fill="${fill}"${ex}/>`;
const L = (d, sw = 2.5, col = INK, ex = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${ex}/>`;
let clipN = 0, clips = [];
function part(d, fill, inner = "", sw = 4) {
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
  return F(d, fill) + `<g clip-path="url(#${id})">${inner}</g>` + S(d, "none", sw);
}
function clipG(ds, inner) {
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}">${ds.map((d) => `<path d="${d}"/>`).join("")}</clipPath>`);
  return `<g clip-path="url(#${id})">${inner}</g>`;
}
function union(ds, fill, inner = "", sw = 4.5) {
  return ds.map((d) => `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${sw * 2}" stroke-linejoin="round"/>`).join("") +
    ds.map((d) => F(d, fill)).join("") + (inner ? clipG(ds, inner) : "");
}
function leaf(b1, b2, t, k = 0, k2 = k) {
  const mx = (b1[0] + b2[0]) / 2, my = (b1[1] + b2[1]) / 2;
  const dx = t[0] - mx, dy = t[1] - my, l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  const c1 = [(b1[0] + t[0]) / 2 + nx * k, (b1[1] + t[1]) / 2 + ny * k];
  const c2 = [(b2[0] + t[0]) / 2 + nx * k2, (b2[1] + t[1]) / 2 + ny * k2];
  return `M${f(b1[0])} ${f(b1[1])} Q${f(c1[0])} ${f(c1[1])} ${f(t[0])} ${f(t[1])} Q${f(c2[0])} ${f(c2[1])} ${f(b2[0])} ${f(b2[1])}Z`;
}
// 손가락: 점들을 잇는 둥근 획
function fing(pts, w, fill = SK.b, sh = SK.s) {
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  const n = pts[pts.length - 1];
  return L(d, w + 6, INK) + L(d, w, fill) + `<path d="${d}" fill="none" stroke="${sh}" stroke-width="${f(w * 0.38)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f(w * 0.2)} ${f(w * 0.12)})"/>` +
    `<ellipse cx="${n[0]}" cy="${n[1]}" rx="${f(w * 0.22)}" ry="${f(w * 0.16)}" fill="${SK.h}" opacity="0.7"/>`;
}
function rimL(d, w = 5, op = 0.85) { return L(d, w, RIM, ` opacity="${op}"`); }

// ── 그라데이션 ──────────────────────────────────────
const defs = () => `
<linearGradient id="${P}hair" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#5a5578"/><stop offset="0.45" stop-color="#2f2a40"/><stop offset="1" stop-color="#16131f"/></linearGradient>
<linearGradient id="${P}hairBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26213a"/><stop offset="1" stop-color="#0f0c16"/></linearGradient>
<linearGradient id="${P}skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0e6"/><stop offset="0.6" stop-color="${SK.b}"/><stop offset="1" stop-color="#f4c9ba"/></linearGradient>
<linearGradient id="${P}coat" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="${CT.b}"/><stop offset="1" stop-color="#d7deec"/></linearGradient>
<linearGradient id="${P}coatIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c1cadc"/><stop offset="1" stop-color="#8e9ab4"/></linearGradient>
<linearGradient id="${P}tn" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="${TN.h}"/><stop offset="0.45" stop-color="${TN.b}"/><stop offset="1" stop-color="${TN.d}"/></linearGradient>
<linearGradient id="${P}pant" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${PT.h}"/><stop offset="0.45" stop-color="${PT.b}"/><stop offset="1" stop-color="${PT.d}"/></linearGradient>
<linearGradient id="${P}shoe" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#6a4a44"/><stop offset="0.4" stop-color="#3a2626"/><stop offset="1" stop-color="#1a1012"/></linearGradient>
<linearGradient id="${P}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1828"/><stop offset="0.45" stop-color="#4a3a52"/><stop offset="0.8" stop-color="#8a6d84"/><stop offset="1" stop-color="#d9b8c4"/></linearGradient>
<linearGradient id="${P}screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14304c"/><stop offset="0.5" stop-color="#0b1b30"/><stop offset="1" stop-color="#06101e"/></linearGradient>
<radialGradient id="${P}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${GLOW}" stop-opacity="0.75"/><stop offset="0.5" stop-color="${GLOW}" stop-opacity="0.25"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient>
<linearGradient id="${P}lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6f6ff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#bfe6ff" stop-opacity="0.08"/><stop offset="1" stop-color="#9fd4ff" stop-opacity="0.25"/></linearGradient>`;

// ── 뒷머리 ─────────────────────────────────────────
function hairBack() {
  const ds = [
    "M478 280 C462 190 510 104 600 100 C690 104 742 190 724 280 C722 340 712 400 690 450 L512 450 C490 400 480 340 478 280Z",
    leaf([480, 330], [540, 360], [452, 560], -14, -4),
    leaf([500, 380], [560, 420], [488, 600], -10, 0),
    leaf([476, 300], [500, 360], [436, 470], -12),
    leaf([704, 360], [722, 420], [800, 560], 18, 6),
  ];
  const sh = F("M478 280 C470 380 470 470 470 560 L560 560 L560 300Z", HR.d, ` opacity="0.5"`) +
    L("M470 360 C462 430 460 490 456 540", 2.5, HR.h, ` opacity="0.6"`) + L("M500 420 C496 480 494 530 492 580", 2.5, HR.h, ` opacity="0.5"`);
  return union(ds, `url(#${P}hairBack)`, sh, 4);
}

// ── 가운 뒷자락 (다리 뒤) ────────────────────────────
function coatBack() {
  const d = "M470 900 C450 1150 420 1420 392 1700 C470 1722 540 1716 600 1712 C700 1716 790 1720 870 1690 C930 1668 990 1640 1040 1590 C1000 1560 980 1520 990 1470 C940 1440 900 1380 880 1300 C840 1180 790 1040 740 900Z";
  const inner = F(d, `url(#${P}coatIn)`) + L("M520 1100 C505 1300 490 1500 480 1710", 3, CT.d) + L("M720 1080 C760 1300 800 1500 850 1694", 3, CT.d) +
    L("M800 1160 C850 1320 900 1460 990 1470", 3, CT.d) + L("M860 1400 C900 1500 960 1560 1036 1590", 2.5, CT.d) +
    F("M880 1300 C900 1380 940 1440 990 1470 C980 1520 1000 1560 1040 1590 L1060 1560 C1000 1520 960 1440 930 1360Z", "#6e7a96", ` opacity="0.5"`);
  return part(d, "#b4bfd4", inner, 4.5);
}

// ── 다리와 신발 ─────────────────────────────────────
function legs() {
  // 체중을 실은 화면 왼쪽 다리 + 느슨한 오른쪽 다리
  const Lg = "M510 1150 C500 1380 512 1600 528 1820 C536 1980 540 2120 546 2290 L606 2290 C610 2120 612 1980 606 1820 C604 1600 600 1380 598 1160Z";
  const Rg = "M602 1160 C612 1380 640 1600 660 1820 C674 1980 688 2120 700 2280 L758 2282 C756 2120 746 1980 728 1820 C716 1600 704 1380 690 1150Z";
  const shL = F("M570 1150 C580 1400 590 1620 590 1820 C592 1990 596 2140 598 2290 L606 2290 C610 2120 612 1980 606 1820 C604 1600 600 1380 598 1160Z", PT.d, ` opacity="0.7"`) +
    L("M540 1760 C556 1780 574 1784 592 1776", 2.5, PT.d) + L("M546 2200 C560 2210 584 2212 600 2206", 2, PT.d) +
    L("M528 1300 C524 1500 532 1700 540 1900", 3, PT.h, ` opacity="0.6"`);
  const shR = F("M670 1170 C690 1400 708 1620 718 1820 C730 1990 744 2140 752 2282 L758 2282 C756 2120 746 1980 728 1820 C716 1600 704 1380 690 1150Z", PT.d, ` opacity="0.8"`) +
    L("M666 1770 C684 1786 704 1788 722 1778", 2.5, PT.d) + L("M640 1400 C650 1560 664 1700 676 1860", 2.5, PT.s);
  // 발목과 신발 (로퍼)
  const ankL = S("M552 2280 C552 2300 552 2318 556 2330 L598 2330 C600 2316 600 2300 600 2280Z", `url(#${P}skin)`, 3);
  const ankR = S("M704 2272 C706 2292 708 2310 712 2322 L752 2322 C754 2306 754 2290 752 2272Z", `url(#${P}skin)`, 3);
  const shoeL = "M548 2318 C540 2340 526 2356 512 2366 C498 2378 500 2392 520 2394 L606 2394 C616 2392 618 2380 614 2366 L612 2318 C592 2330 568 2330 548 2318Z";
  const shoeR = "M706 2310 C704 2330 706 2350 714 2364 C720 2380 736 2390 760 2392 L800 2392 C816 2390 816 2376 800 2364 C782 2352 768 2336 760 2308 C744 2318 722 2318 706 2310Z";
  const shoeSh = (d, hx) => part(d, `url(#${P}shoe)`, F(`M${hx} 2370 L${hx + 140} 2370 L${hx + 140} 2400 L${hx} 2400Z`, "#120b0d", ` opacity="0.7"`) +
    L(`M${hx + 30} 2340 C${hx + 46} 2348 ${hx + 66} 2350 ${hx + 90} 2344`, 3, "#a87a6c", ` opacity="0.7"`), 4);
  return part(Lg, `url(#${P}pant)`, shL, 4.5) + part(Rg, `url(#${P}pant)`, shR, 4.5) + ankL + ankR +
    shoeSh(shoeL, 500) + shoeSh(shoeR, 700) + L("M514 2380 L606 2380", 3, "#0c0708") + L("M722 2378 L808 2378", 3, "#0c0708") +
    rimL("M754 2282 C754 2150 744 2000 726 1830", 4, 0.6);
}

// ── 몸통(터틀넥) ────────────────────────────────────
function torso() {
  const d = "M540 430 C520 450 470 470 452 500 C470 640 500 800 515 900 C520 980 506 1080 500 1160 C560 1180 640 1180 700 1160 C696 1080 684 980 688 900 C702 800 732 640 748 500 C730 470 680 450 660 430Z";
  const inner = F("M640 440 C680 460 720 480 748 500 C732 640 702 800 688 900 C684 980 696 1080 700 1160 L640 1170Z", TN.d, ` opacity="0.6"`) +
    L("M560 620 C580 650 620 650 640 620", 2.5, TN.d) + // 가슴 아래 주름
    L("M548 800 C580 815 620 815 652 800", 2, TN.d) + L("M536 860 C560 880 590 884 610 876", 2, TN.d) +
    F("M520 620 C540 560 600 560 620 600 C590 590 550 600 520 620Z", TN.h, ` opacity="0.5"`) +
    // 허리 벨트
    F("M500 940 C560 952 640 952 700 940 L702 980 C640 992 560 992 500 980Z", "#1a1824") + L("M500 940 C560 952 640 952 700 940", 2.5) + L("M500 980 C560 992 640 992 700 980", 2.5) +
    S("M584 942 L618 942 L618 984 L584 984Z", "#c9cfdc", 2.5) + F("M590 948 L612 948 L612 978 L590 978Z", "#1a1824") +
    // 바지 앞 주름
    L("M600 990 L600 1150", 2.5, PT.d) + L("M560 1020 C570 1060 576 1100 578 1150", 2, PT.s);
  // 바지 윗부분 색 (벨트 아래)
  return part(d, `url(#${P}tn)`, F("M480 980 L720 980 L720 1200 L480 1200Z", `url(#${P}pant)`) + inner, 4.5);
}
// 목과 터틀넥 칼라
function neck() {
  const nk = S("M566 370 C568 400 566 420 560 440 C580 452 620 452 640 440 C634 420 632 400 634 370Z", `url(#${P}skin)`, 4);
  const nsh = F("M566 380 C580 410 620 410 634 380 L634 420 C612 432 588 432 566 420Z", SK.s, ` opacity="0.9"`);
  const col = "M552 420 C548 440 548 470 556 492 C586 504 614 504 644 492 C652 470 652 440 648 420 C620 432 580 432 552 420Z";
  const colIn = L("M556 446 C586 458 614 458 644 446", 2, TN.d) + L("M558 470 C588 482 612 482 642 470", 2, TN.d) + F("M620 425 L648 420 C652 440 652 470 644 492 L626 498Z", TN.d, ` opacity="0.6"`);
  return nk + nsh + part(col, `url(#${P}tn)`, colIn, 4);
}

// ── 가운 앞판 ───────────────────────────────────────
function coat() {
  // 화면 왼쪽 앞판
  const Lp = "M548 440 C520 452 470 466 440 488 C430 520 428 560 432 600 C438 760 440 900 436 1020 C430 1240 410 1460 380 1680 C440 1716 510 1716 552 1704 C556 1480 556 1250 548 1040 C544 940 542 860 548 760 C552 700 560 640 574 590 C568 540 556 490 548 440Z";
  const LpIn = F("M432 600 C470 640 488 760 480 900 C476 1100 470 1400 460 1708 L400 1690 C416 1460 430 1240 436 1020 C440 900 438 760 432 600Z", CT.s, ` opacity="0.7"`) +
    L("M470 1040 C478 1200 470 1420 452 1660", 3, CT.d) + L("M512 1200 C514 1360 512 1520 506 1700", 2.5, CT.d) +
    L("M440 1120 C460 1140 490 1150 520 1146", 2.5, CT.d) +
    // 주머니
    S("M446 1180 C480 1186 520 1188 546 1184 L546 1196 C520 1200 480 1198 446 1192Z", CT.s, 2.5) + L("M446 1196 C446 1260 446 1320 444 1360", 2, CT.d, ` stroke-dasharray="8 6"`) +
    // 앞 단추 자리 바느질
    L("M538 780 C534 1000 540 1300 540 1690", 2, CT.d, ` stroke-dasharray="10 7"`);
  // 화면 오른쪽 앞판
  const Rp = "M652 440 C680 452 730 466 760 488 C770 520 772 560 768 600 C762 760 762 900 768 1020 C776 1240 810 1430 900 1630 C820 1690 720 1712 652 1704 C648 1480 648 1250 654 1040 C658 940 660 860 654 760 C650 700 640 640 626 590 C632 540 644 490 652 440Z";
  const RpIn = F("M700 470 C740 600 750 760 744 900 C746 1100 780 1400 860 1660 L900 1630 C788 1460 774 1240 768 1020 C762 900 762 760 768 600 C772 560 770 520 760 488Z", CT.s, ` opacity="0.9"`) +
    F("M740 520 C760 700 760 900 766 1060 C780 1300 820 1460 900 1630 L860 1660 C800 1480 750 1240 746 1040 C742 860 744 680 740 520Z", CT.d, ` opacity="0.5"`) +
    L("M700 1000 C700 1200 720 1440 760 1690", 3, CT.d) + L("M680 1300 C680 1450 690 1580 700 1706", 2.5, CT.d) + L("M740 1200 C770 1360 810 1500 870 1650", 2.5, CT.d) +
    L("M666 1060 C690 1080 720 1086 746 1080", 2.5, CT.d) +
    // 가슴 주머니 + 펜
    S("M676 650 L740 646 L742 720 C720 726 698 726 678 722Z", CT.b, 2.5) +
    S("M690 612 L698 612 L698 652 L690 652Z", "#3a5a8c", 2) + S("M708 604 L716 604 L716 652 L708 652Z", "#262838", 2) + F("M710 606 L714 606 L714 640 L710 640Z", "#d9c27a") +
    S("M724 618 L730 618 L730 652 L724 652Z", ACC, 2) + L("M676 664 L740 660", 2, CT.d) +
    // 허리 주머니
    S("M664 1180 C700 1184 740 1186 768 1182 L770 1194 C740 1198 700 1198 664 1194Z", CT.s, 2.5) +
    // 단추
    `<circle cx="664" cy="800" r="9" fill="${CT.s}" stroke="${INK}" stroke-width="2.5"/><circle cx="662" cy="940" r="9" fill="${CT.s}" stroke="${INK}" stroke-width="2.5"/><circle cx="662" cy="1080" r="9" fill="${CT.s}" stroke="${INK}" stroke-width="2.5"/>`;
  // 옷깃(라펠)
  const lapL = "M548 440 C540 470 530 520 528 560 C540 620 556 700 572 760 C566 690 566 640 574 590 C568 540 558 490 548 440Z";
  const colL = "M548 440 C520 430 492 440 470 460 C490 470 510 476 520 496 C530 480 540 460 548 440Z";
  const lapR = "M652 440 C660 470 670 520 672 560 C660 620 644 700 628 760 C634 690 634 640 626 590 C632 540 642 490 652 440Z";
  const colR = "M652 440 C680 430 708 440 730 460 C710 470 690 476 680 496 C670 480 660 460 652 440Z";
  // 빛 테두리
  const rim = rimL("M766 600 C762 760 762 900 768 1020 C776 1240 810 1430 896 1628", 5, 0.8) + rimL("M990 1470 C980 1520 1000 1560 1036 1588", 4, 0.7);
  return part(Lp, `url(#${P}coat)`, LpIn, 4.5) + part(Rp, `url(#${P}coat)`, RpIn, 4.5) +
    part(lapL, CT.h, F("M540 600 L572 760 L560 760Z", CT.s), 3) + part(lapR, CT.s, F("M650 560 L628 760 L640 760Z", CT.d, ` opacity="0.6"`), 3) +
    part(colL, CT.h, "", 3) + part(colR, CT.s, "", 3) + rim;
}

// ── 사원증 목걸이 ───────────────────────────────────
function lanyard() {
  const strap = L("M566 448 C560 540 574 640 600 720", 12, INK) + L("M566 448 C560 540 574 640 600 720", 7, ACC) +
    L("M634 448 C640 540 628 640 604 720", 12, INK) + L("M634 448 C640 540 628 640 604 720", 7, "#8fc4ea");
  const clip = S("M592 712 L610 712 L612 740 L590 740Z", "#c8ced8", 2.5);
  const card = part("M556 738 L648 734 L652 864 L560 868Z", "#ffffff",
    F("M556 738 L648 734 L649 760 L557 764Z", "#3a6ea8") + F("M570 776 L606 774 L608 818 L572 820Z", "#c9d6e8") +
    `<circle cx="589" cy="790" r="9" fill="#5b5878"/>` + F("M576 818 C578 804 600 802 604 816Z", "#5b5878") +
    L("M614 782 L640 781", 3, "#7b8aa8") + L("M614 794 L636 793", 3, "#9aa8c0") + L("M614 806 L640 805", 3, "#9aa8c0") +
    L("M570 836 L640 834", 3, "#3a6ea8") + L("M570 848 L620 847", 2.5, "#9aa8c0") +
    F("M624 818 L640 817 L641 828 L625 829Z", GLOW) + L("M560 744 L650 740", 1.5, "#fff", ` opacity="0.8"`), 3.5);
  const sleeve = S("M552 736 L652 732 L656 870 L556 874Z", "none", 2) ; // 비닐 커버
  return strap + clip + card + F("M560 742 L620 740 L566 860Z", "#fff", ` opacity="0.25"`) + sleeve;
}

// ── 화면 오른쪽 팔(그녀의 왼팔): 자연스럽게 내림 ──────────
function armR() {
  const sl = "M748 486 C780 496 800 530 806 580 C814 680 826 760 832 840 C838 900 846 960 852 1010 C830 1026 800 1030 780 1022 C774 960 768 900 760 846 C752 760 742 680 734 600 C728 560 730 516 748 486Z";
  const inner = F("M790 520 C806 600 816 700 826 800 C832 880 842 950 852 1010 L830 1020 C824 950 814 880 806 800 C796 700 788 600 776 520Z", CT.s) +
    F("M816 640 C824 720 834 800 840 860 C846 920 850 970 852 1010 L842 1014 C836 960 830 900 826 840 C820 780 814 700 808 640Z", CT.d, ` opacity="0.6"`) +
    L("M766 820 C780 836 800 840 818 834", 3, CT.d) + L("M772 850 C790 862 808 864 822 858", 2.5, CT.d) + L("M760 700 C770 760 774 800 778 830", 2.5, CT.s);
  const cuff = part("M778 990 C800 1000 830 998 852 988 L858 1030 C834 1042 806 1044 782 1034Z", CT.b, L("M780 1004 C804 1014 832 1012 854 1002", 2, CT.d) + F("M836 994 L858 988 L858 1030 L840 1038Z", CT.s), 4);
  // 손
  const palm = S("M790 1030 C786 1060 790 1090 800 1110 C816 1124 840 1124 852 1108 C860 1090 862 1060 856 1030Z", `url(#${P}skin)`, 4);
  const fingers = fing([[800, 1100], [796, 1132], [800, 1156]], 13) + fing([[814, 1112], [812, 1148], [816, 1176]], 14) +
    fing([[830, 1114], [830, 1150], [834, 1174]], 14) + fing([[845, 1108], [848, 1138], [852, 1160]], 12.5);
  const thumb = fing([[794, 1050], [784, 1078], [788, 1100]], 14);
  return part(sl, `url(#${P}coat)`, inner, 4.5) + rimL("M806 590 C816 690 828 780 836 860 C842 920 848 970 852 1006", 4.5, 0.85) +
    thumb + palm + F("M830 1040 C848 1050 856 1080 850 1104 C860 1088 862 1060 856 1032Z", SK.s) + fingers + cuff;
}

// ── 화면 왼쪽 팔(그녀의 오른팔): 태블릿을 허리에 끼고 듦 ────
function armL() {
  const up = "M452 488 C424 496 404 530 398 580 C390 670 386 760 392 840 C400 870 430 880 452 866 C456 800 460 720 470 640 C476 580 480 520 452 488Z";
  const upIn = F("M398 580 C390 670 386 760 392 840 L420 860 C414 780 414 680 420 590Z", CT.s, ` opacity="0.8"`) + L("M400 800 C414 812 432 816 448 810", 2.5, CT.d);
  const fore = "M392 830 C384 870 400 900 430 920 C470 944 510 960 540 970 C556 950 560 920 552 900 C520 886 480 868 452 846 C440 836 420 822 392 830Z";
  const foreIn = F("M392 860 C410 900 470 936 540 970 L548 958 C500 944 440 916 404 880Z", CT.s, ` opacity="0.9"`) +
    L("M420 840 C430 860 440 874 456 882", 2.5, CT.d) + L("M436 836 C446 852 456 862 470 868", 2, CT.d) + L("M470 900 C490 908 510 914 526 918", 2, CT.d);
  const cuff = part("M520 900 C540 904 556 914 560 928 C562 944 556 962 544 974 C532 970 522 966 514 962 C522 944 524 920 520 900Z", CT.b, F("M530 960 L560 940 L556 962 L544 974Z", CT.s), 4);
  return part(up, `url(#${P}coat)`, upIn, 4.5) + part(fore, `url(#${P}coat)`, foreIn, 4.5) + cuff;
}
// 태블릿 + 그것을 쥔 손
function tablet() {
  // 살짝 기운 태블릿 (화면 정면)
  const body = "M534 900 L742 930 C752 932 758 940 756 950 L726 1190 C724 1200 716 1206 706 1204 L498 1176 C488 1174 482 1166 484 1156 L514 916 C516 906 524 898 534 900Z";
  const scr = "M534 920 L734 948 L706 1184 L506 1156Z";
  // 로고: 동심원 고리 + 가운데 'E' 를 닮은 날개 마름모
  const cx = 620, cy = 1052;
  const logo = `<g transform="rotate(8 ${cx} ${cy})">` +
    `<ellipse cx="${cx}" cy="${cy}" rx="120" ry="120" fill="url(#${P}glow)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="58" fill="none" stroke="${GLOW}" stroke-width="5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="44" fill="none" stroke="${GLOW}" stroke-width="2.5" stroke-dasharray="14 6" opacity="0.8"/>` +
    F(`M${cx} ${cy - 32} L${cx + 26} ${cy} L${cx} ${cy + 32} L${cx - 26} ${cy}Z`, GLOW, ` opacity="0.95"`) +
    F(`M${cx} ${cy - 18} L${cx + 14} ${cy} L${cx} ${cy + 18} L${cx - 14} ${cy}Z`, "#e8fbff") +
    L(`M${cx - 70} ${cy} L${cx - 34} ${cy}`, 3, GLOW) + L(`M${cx + 34} ${cy} L${cx + 70} ${cy}`, 3, GLOW) +
    L(`M${cx} ${cy - 92} L${cx} ${cy - 64}`, 3, GLOW, ` opacity="0.7"`) +
    // 글자 E·I·A (선으로)
    L(`M${cx - 30} ${cy + 80} L${cx - 44} ${cy + 80} L${cx - 44} ${cy + 104} L${cx - 30} ${cy + 104} M${cx - 44} ${cy + 92} L${cx - 33} ${cy + 92}`, 3.5, GLOW) +
    L(`M${cx - 6} ${cy + 80} L${cx + 6} ${cy + 80} M${cx} ${cy + 80} L${cx} ${cy + 104} M${cx - 6} ${cy + 104} L${cx + 6} ${cy + 104}`, 3.5, GLOW) +
    L(`M${cx + 22} ${cy + 104} L${cx + 33} ${cy + 80} L${cx + 44} ${cy + 104} M${cx + 26} ${cy + 96} L${cx + 40} ${cy + 96}`, 3.5, GLOW) +
    L(`M${cx - 80} ${cy - 104} L${cx - 30} ${cy - 104}`, 3, GLOW, ` opacity="0.5"`) + L(`M${cx - 80} ${cy - 92} L${cx - 50} ${cy - 92}`, 3, GLOW, ` opacity="0.35"`) +
    `</g>`;
  const scan = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => L(`M${f(530 - i * 2.3)} ${f(940 + i * 20)} L${f(732 - i * 2.3)} ${f(968 + i * 20)}`, 1, GLOW, ` opacity="0.12"`)).join("");
  const screen = part(scr, `url(#${P}screen)`, scan + logo + F("M534 920 L620 932 L560 1160 L506 1156Z", "#ffffff", ` opacity="0.06"`), 2.5);
  const t = part(body, "#2a2e40", F("M742 930 C752 932 758 940 756 950 L726 1190 C724 1200 716 1206 706 1204 L716 1190 L746 950Z", "#12141e") + L("M534 904 L740 934", 2, "#6a7090"), 4.5) + screen +
    `<circle cx="640" cy="928" r="3" fill="#4a5070"/>`;
  // 쥔 손: 엄지는 화면 앞, 손가락 끝은 왼쪽 가장자리
  const hand = S("M500 950 C486 960 480 990 486 1016 C494 1036 512 1044 530 1040 C540 1020 540 980 530 956 C522 946 510 944 500 950Z", `url(#${P}skin)`, 4) +
    F("M486 1000 C494 1030 512 1040 530 1040 C520 1030 500 1020 486 1000Z", SK.s) +
    fing([[496, 1036], [492, 1052], [500, 1066]], 13) + fing([[508, 1040], [506, 1062], [514, 1076]], 13) +
    fing([[530, 962], [556, 976], [574, 982]], 15); // 엄지 (화면 위)
  // 화면 빛이 손·가운에 반사
  const spill = `<ellipse cx="620" cy="1060" rx="200" ry="180" fill="url(#${P}glow)" opacity="0.35"/>`;
  return spill + t + hand;
}

// ── 머리(얼굴형·귀) ─────────────────────────────────
function head() {
  const face = "M500 250 C498 318 516 362 548 392 C570 410 588 420 600 421 C612 420 630 410 652 392 C684 362 702 318 700 250 C700 160 655 128 600 128 C545 128 500 160 500 250Z";
  const earL = S("M504 280 C486 270 478 286 482 306 C486 328 496 344 512 346Z", `url(#${P}skin)`, 3.5) + L("M494 296 C492 310 498 324 506 332", 2, SK.d);
  const earR = S("M696 280 C714 270 722 286 718 306 C714 328 704 344 688 346Z", SK.b, 3.5) + L("M706 296 C708 310 702 324 694 332", 2, SK.d);
  const shade = F("M680 240 C690 300 684 350 652 392 C630 410 612 420 600 421 C640 400 670 360 676 300Z", SK.s, ` opacity="0.7"`) +
    // 앞머리 그림자
    F("M500 230 C540 250 560 230 590 250 C620 236 650 252 700 236 L700 200 L500 200Z", SK.s, ` opacity="0.9"`);
  return earL + earR + part(face, `url(#${P}skin)`, shade, 4.5);
}

// ── 얼굴 부품 ───────────────────────────────────────
// 왼쪽 눈 기준(안쪽 = +x) 로컬 좌표로 그리고, 오른쪽은 좌우 반전
const EXP = {
  normal: { o: 1, to: 4, ti: 0, iris: 1, lid: 0 },
  smile: { closed: true },
  angry: { o: 0.82, to: -2, ti: 6, iris: 0.92, lid: 1 },
  sad: { o: 0.9, to: 8, ti: -4, iris: 1, lid: 0, tear: true },
  surprise: { o: 1.2, to: 0, ti: 0, iris: 0.72, lid: 0 },
  serious: { o: 0.66, to: 2, ti: 2, iris: 1, lid: 1 },
};
function eye(e, side) {
  if (e.closed) { // 눈웃음
    return L("M-32 2 C-18 -16 14 -18 32 -4", 6.5) + L("M-32 2 C-38 -2 -42 -6 -44 -12", 3.5) + L("M-22 10 C-10 14 8 14 20 10", 1.8, INK, ` opacity="0.5"`);
  }
  const o = e.o, ol = 1;
  const up = `M-32 ${2 + e.to} C-24 ${f(-20 * o + e.to * 0.5)} 14 ${f(-26 * o + e.ti * 0.5)} 32 ${-4 + e.ti}`;
  const low = `C26 ${f(16 * ol)} -14 ${f(20 * ol)} -30 ${8 + e.to * 0.4}Z`;
  const scl = up + " " + low;
  const id = `${P}e${side}${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${scl}"/></clipPath>`);
  const r = e.iris, irx = 16 * r, iry = 21 * r, icx = 3, icy = 1;
  const iris = `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#${P}iris)" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="${icx}" cy="${f(icy + 2)}" rx="${f(irx * 0.48)}" ry="${f(iry * 0.5)}" fill="#120e18"/>` +
    `<path d="M${f(icx - irx * 0.8)} ${f(icy + iry * 0.3)} Q${icx} ${f(icy + iry * 1.05)} ${f(icx + irx * 0.8)} ${f(icy + iry * 0.3)}" fill="none" stroke="#f2d4dc" stroke-width="2.5" opacity="0.7"/>` +
    `<circle cx="${f(icx - irx * 0.4)}" cy="${f(icy - iry * 0.4)}" r="${f(6 * r + 1)}" fill="#fff"/>` +
    `<circle cx="${f(icx + irx * 0.5)}" cy="${f(icy + iry * 0.45)}" r="2.8" fill="#fff"/><circle cx="${f(icx + irx * 0.62)}" cy="${f(icy - iry * 0.2)}" r="1.8" fill="#fff" opacity="0.9"/>`;
  const sclera = F(scl, "#fffdfb") + `<g clip-path="url(#${id})">${F(`M-40 -40 L40 -40 L40 ${f(-10 * o)} C10 ${f(-4 * o)} -10 ${f(-4 * o)} -40 ${f(-6 * o)}Z`, "#e4d6e4")}${iris}</g>`;
  const lash = `<path d="${up}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>` +
    F(`M-32 ${2 + e.to} C-38 ${f(-2 + e.to)} -44 ${f(-4 + e.to)} -47 ${f(-11 + e.to)} C-40 ${f(-6 + e.to)} -34 ${f(-6 + e.to)} -28 ${f(-6 + e.to)}Z`, INK) +
    L(`M-30 ${f(-4 + e.to)} L-38 ${f(-14 + e.to)}`, 2.5) +
    L(`M30 ${f(8 * ol)} C14 ${f(17 * ol)} -12 ${f(18 * ol)} -26 ${f(9 + e.to * 0.4)}`, 1.8, "#5a3a4a") +
    L(`M-24 ${f(-24 * o + e.to * 0.5 - 6)} C-10 ${f(-32 * o - 4)} 12 ${f(-32 * o + e.ti * 0.5 - 4)} 26 ${f(-18 * o + e.ti - 6)}`, 2, "#8a5a5e", ` opacity="0.8"`); // 쌍꺼풀
  let extra = "";
  if (e.tear) extra += F("M-20 14 C-16 26 -18 34 -24 38 C-30 34 -30 26 -20 14Z", "#bfe8ff", ` stroke="${INK}" stroke-width="1.5"`) + L("M24 10 C10 16 -10 16 -24 12", 3, "#bfe8ff", ` opacity="0.9"`);
  return sclera + lash + extra;
}
function brows(x) {
  const B = {
    normal: "M-38 -6 C-22 -16 6 -18 30 -10 C8 -12 -18 -10 -38 -2Z",
    smile: "M-38 -10 C-22 -20 6 -22 30 -14 C8 -16 -18 -14 -38 -6Z",
    angry: "M-36 -16 C-14 -14 10 -6 30 6 C8 -2 -16 -8 -36 -10Z",
    sad: "M-38 4 C-20 -6 6 -14 30 -20 C8 -14 -16 -4 -38 8Z",
    surprise: "M-38 -18 C-22 -30 6 -32 30 -24 C8 -26 -18 -24 -38 -14Z",
    serious: "M-38 -6 C-20 -10 8 -8 30 -2 C8 -6 -18 -6 -38 -2Z",
  }[x];
  return S(B, "#2b2638", 2.5);
}
function mouth(x) {
  switch (x) {
    case "smile": return S("M572 368 C586 386 614 386 628 368 C614 376 586 376 572 368Z", "#b84a5a", 2.5) + F("M586 378 C594 384 606 384 614 378 C606 380 594 380 586 378Z", "#e98a96");
    case "angry": return S("M578 380 C590 368 610 368 622 380 C612 390 588 390 578 380Z", "#5a1e2c", 2.5) + F("M584 375 C594 371 606 371 616 375 L614 379 C604 377 596 377 586 379Z", "#fff");
    case "sad": return L("M582 382 C592 374 608 374 618 382", 3);
    case "surprise": return S("M590 368 C590 360 610 360 610 368 C612 384 606 392 600 392 C594 392 588 384 590 368Z", "#7a2836", 2.5) + F("M592 382 C596 388 604 388 608 382 C604 380 596 380 592 382Z", "#e07a88");
    case "serious": return L("M584 376 L616 376", 3);
    default: return L("M584 372 C592 378 608 378 616 372", 3);
  }
}
function face(x) {
  const e = EXP[x];
  const eL = `<g transform="translate(553 292)">${eye(e, "L")}</g>`;
  const eR = `<g transform="translate(647 292) scale(-1 1)">${eye(e, "R")}</g>`;
  const bL = `<g transform="translate(552 248)">${brows(x)}</g>`, bR = `<g transform="translate(648 248) scale(-1 1)">${brows(x)}</g>`;
  const nose = L("M602 330 C604 340 604 346 598 350", 2.5, SK.d) + F("M604 336 C610 344 608 350 600 352Z", SK.s, ` opacity="0.7"`);
  const blush = (x === "smile" || x === "surprise" || x === "sad")
    ? `<ellipse cx="530" cy="340" rx="26" ry="11" fill="#f58a9a" opacity="0.4"/><ellipse cx="670" cy="340" rx="26" ry="11" fill="#f58a9a" opacity="0.4"/>` +
      [0, 1, 2].map((i) => L(`M${518 + i * 10} 346 l6 -9`, 1.8, "#e06a7a", ` opacity="0.6"`) + L(`M${658 + i * 10} 346 l6 -9`, 1.8, "#e06a7a", ` opacity="0.6"`)).join("")
    : `<ellipse cx="530" cy="342" rx="24" ry="9" fill="#f58a9a" opacity="0.2"/><ellipse cx="670" cy="342" rx="24" ry="9" fill="#f58a9a" opacity="0.2"/>`;
  // 피곤한 눈 밑 그늘(트레이드마크)
  const tired = L("M528 318 C544 326 566 326 578 318", 2, "#c48a8e", ` opacity="0.6"`) + L("M622 318 C634 326 656 326 672 318", 2, "#c48a8e", ` opacity="0.6"`);
  let fx = "";
  if (x === "surprise") fx = F("M712 190 C716 206 716 216 710 222 C704 216 704 206 712 190Z", "#bfe8ff", ` stroke="${INK}" stroke-width="2"`);
  if (x === "angry") fx = L("M700 170 l14 -14 M708 180 l18 -6 M696 162 l4 -18", 3.5, "#e04a5a");
  return blush + tired + eL + eR + bL + bR + nose + mouth(x) + fx;
}
function glasses() {
  const lens = (cx) => `M${cx - 46} 270 L${cx + 44} 268 C${cx + 48} 268 ${cx + 50} 272 ${cx + 49} 276 L${cx + 46} 318 C${cx + 46} 322 ${cx + 42} 324 ${cx + 38} 324 L${cx - 40} 326 C${cx - 44} 326 ${cx - 47} 322 ${cx - 47} 318 L${cx - 50} 276 C${cx - 50} 272 ${cx - 48} 270 ${cx - 46} 270Z`;
  const lL = lens(551), lR = `M${1200 - 551 + 46} 270 L${1200 - 551 - 44} 268 C${1200 - 551 - 48} 268 ${1200 - 551 - 50} 272 ${1200 - 551 - 49} 276 L${1200 - 551 - 46} 318 C${1200 - 551 - 46} 322 ${1200 - 551 - 42} 324 ${1200 - 551 - 38} 324 L${1200 - 551 + 40} 326 C${1200 - 551 + 44} 326 ${1200 - 551 + 47} 322 ${1200 - 551 + 47} 318 L${1200 - 551 + 50} 276 C${1200 - 551 + 50} 272 ${1200 - 551 + 48} 270 ${1200 - 551 + 46} 270Z`;
  return F(lL, `url(#${P}lens)`) + F(lR, `url(#${P}lens)`) +
    `<path d="${lL}" fill="none" stroke="#2e2a3a" stroke-width="2.8"/><path d="${lR}" fill="none" stroke="#2e2a3a" stroke-width="2.8"/>` +
    L("M598 279 C599 275 601 275 602 279", 3, "#2e2a3a") + L("M501 276 L486 280", 3, "#2e2a3a") + L("M699 276 L714 280", 3, "#2e2a3a") +
    L("M512 300 L540 276", 3, "#fff", ` opacity="0.55"`) + L("M520 312 L556 280", 2, "#fff", ` opacity="0.4"`) + L("M612 300 L640 276", 3, "#fff", ` opacity="0.55"`) +
    L("M507 272 L540 271", 1.5, "#c8d0e0", ` opacity="0.9"`) + L("M606 272 L640 271", 1.5, "#c8d0e0", ` opacity="0.9"`);
}

// ── 앞머리·옆머리 ───────────────────────────────────
function hairFront() {
  // 정수리 덩어리 + 가르마(화면 왼쪽) + 옆으로 흐르는 앞머리
  const crown = "M486 270 C476 180 520 112 600 108 C684 112 728 180 716 270 C700 230 680 200 650 186 C620 176 586 178 560 188 C530 200 506 230 486 270Z";
  const ds = [
    crown,
    leaf([566, 176], [520, 196], [500, 300], -10, 6),
    leaf([570, 178], [596, 186], [536, 262], -6, 6),
    leaf([570, 178], [640, 184], [600, 262], 10, 4),
    leaf([600, 180], [680, 196], [660, 268], 12, 2),
    leaf([630, 184], [700, 210], [708, 286], 10, 0),
    leaf([660, 196], [716, 236], [726, 330], 4, -6),
    leaf([500, 220], [488, 280], [484, 360], -6),
    // 얼굴 옆으로 흘러내린 긴 가닥(좌)
    "M496 240 C480 300 482 380 490 440 C496 480 504 520 498 560 C516 530 520 490 516 450 C512 390 512 320 520 260Z",
    // 우측: 귀 뒤로 넘겨 낮게 묶어 어깨 앞으로
    "M700 240 C716 290 718 350 708 400 C700 430 692 450 690 470 C706 456 726 420 732 380 C738 330 730 280 710 240Z",
  ];
  const sh = F("M560 188 C530 200 506 230 486 270 L486 300 C520 260 540 230 566 200Z", HR.d, ` opacity="0.6"`) +
    L("M540 210 C526 240 516 270 512 300", 2.5, HR.d) + L("M596 196 C584 220 572 240 560 262", 2.5, HR.d) + L("M636 196 C640 220 636 240 628 262", 2.5, HR.d) +
    L("M676 214 C690 240 696 270 700 300", 2.5, HR.d) +
    // 윤기 띠
    L("M560 116 C530 140 510 180 500 220 M600 110 C590 140 580 160 576 180 M646 116 C670 140 690 170 704 210", 2.5, HR.d) + gloss(600, 300, 120, 158, 210, 330, 15, 7);
  const strands = L("M574 186 C556 230 548 270 556 320", 2.5) + L("M628 190 C640 230 650 270 640 310", 2.5) +
    L("M708 244 C722 300 728 360 716 420", 2.5, INK, ` opacity="0.7"`) + L("M504 260 C496 320 500 380 508 430", 2, HR.h, ` opacity="0.8"`);
  // 아호게·잔머리
  const loose = L("M600 108 C590 84 604 70 624 74", 3.5) + L("M612 108 C620 90 636 88 642 98", 3) +
    L("M494 340 C486 380 492 420 486 460", 2.5) + L("M710 330 C720 370 716 400 724 430", 2.5);
  return union(ds, `url(#${P}hair)`, sh, 4.5) + strands + loose + rimL("M716 270 C730 300 734 340 728 380", 4, 0.9);
}
// 윤기: 타원 호를 따라 끊어진 잎 모양 하이라이트 조각
function gloss(cx, cy, rx, ry, a0, a1, w, n) {
  // 천사 고리형 윤기: 위는 매끈한 호, 아래는 머리끝처럼 뾰족한 톱니
  const p = (t, r) => [f(cx + Math.cos(t * Math.PI / 180) * rx * r), f(cy + Math.sin(t * Math.PI / 180) * ry * r)];
  const top = [], bot = [];
  for (let i = 0; i <= n * 2; i++) {
    const t = a0 + (a1 - a0) * (i / (n * 2));
    const mid = 1 - Math.abs(i / (n * 2) - 0.5) * 1.2;
    top.push(p(t, 1 - 0.02 * mid));
    bot.push(p(t, 1 - (w / ry) * mid * (i % 2 ? 1.6 : 0.8)));
  }
  const d = "M" + top.map((q) => q.join(" ")).join(" L") + " L" + bot.reverse().map((q) => q.join(" ")).join(" L") + "Z";
  const top2 = [];
  for (let i = 0; i <= 8; i++) top2.push(p(a0 + 12 + (a1 - a0 - 24) * (i / 8), 0.985).join(" "));
  return F(d, HR.g, ` opacity="0.7"`) + L("M" + top2.join(" L"), 3, "#e8eaff", ` opacity="0.7"`);
}
// 어깨 앞으로 늘어진 낮은 포니테일 (화면 오른쪽)
function ponytail() {
  const ds = [
    "M688 448 C712 470 728 510 730 560 C732 620 722 680 708 740 C700 770 690 790 680 806 C700 760 708 720 704 680 C700 620 690 560 670 500 C664 480 672 460 688 448Z",
    leaf([690, 560], [720, 580], [668, 780], -6, 8),
    leaf([706, 600], [728, 620], [716, 810], 4, -2),
    leaf([680, 500], [700, 470], [744, 700], 14, 2),
    leaf([712, 620], [726, 680], [800, 830], 16, 4),
    leaf([706, 700], [716, 740], [760, 860], 10, 2),
  ];
  const sh = F("M710 520 C730 600 728 700 716 800 L740 700 C742 620 736 560 720 520Z", HR.d, ` opacity="0.6"`) +
    L("M696 520 C708 600 708 680 696 760", 2.5, HR.d) + L("M712 560 C720 640 720 720 712 790", 2, HR.d) +
    L("M690 540 C698 600 700 650 694 700", 4, HR.g, ` opacity="0.55"`) + L("M716 600 C722 650 722 690 718 730", 3, HR.g, ` opacity="0.4"`);
  const band = S("M670 462 C686 452 706 452 718 466 L712 494 C698 482 682 484 668 492Z", ACC, 3.5) + L("M676 470 C688 464 702 464 712 472", 2, "#ffffff", ` opacity="0.8"`);
  return union(ds, `url(#${P}hair)`, sh, 4.5) + band + rimL("M730 560 C732 620 724 690 708 750", 4, 0.85);
}

export function svg(expr = "normal") {
  if (!EXP[expr]) expr = "normal";
  clipN = 0; clips.length = 0;
  const body = hairBack() + coatBack() + legs() + torso() + coat() + neck() + lanyard() +
    armR() + armL() + tablet() + head() + face(expr) + glasses() + hairFront() + ponytail();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${defs()}${clips.join("")}</defs>${body}</svg>`;
}
