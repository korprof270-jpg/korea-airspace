// 강도현 — 젊은 시험비행 조종사 (15년 전의 강 교관, 흉터·콧수염 이전) (「에이아 연대기」 전신 입간판, viewBox 0 0 1200 2400)
export const ID = "dohyun", NAME = "강도현";

const P = "dohyun-";
const INK = "#1a1626";
const SK = { b: "#f4d2bc", s: "#dca48c", d: "#b97a68", h: "#fff0e4" };
const HR = { b: "#2e2620", s: "#1c1612", d: "#100c0a", h: "#5a4a3e", g: "#9a8470" };
const OL = { b: "#5f6b3e", s: "#454f2c", d: "#2e351d", h: "#84925a" }; // 올리브 재킷
const OR = { b: "#ffc46a", s: "#d9963a", d: "#a8682a", h: "#fff0c8" }; // 포인트
const PN = { b: "#343c4c", s: "#252c3a", d: "#181d29", h: "#515b70" }; // 바지
const TS = { b: "#ebe8e2", s: "#c4c0b8", d: "#9a968e" }; // 티셔츠
const GV = { b: "#5a4536", s: "#3a2c22", d: "#241a14", h: "#8a6e58" }; // 장갑
const RIM = "#ffd590";

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
// 장갑 낀 손가락
function fing(pts, w, fill = GV.b, sh = GV.s) {
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  const n = pts[pts.length - 1];
  return L(d, w + 6, INK) + L(d, w, fill) + `<path d="${d}" fill="none" stroke="${sh}" stroke-width="${f(w * 0.4)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f(w * 0.18)} ${f(w * 0.16)})"/>` +
    `<ellipse cx="${f(n[0] - w * 0.1)}" cy="${f(n[1] - w * 0.12)}" rx="${f(w * 0.2)}" ry="${f(w * 0.13)}" fill="${GV.h}" opacity="0.9"/>`;
}
function rimL(d, w = 5, op = 0.85) { return L(d, w, RIM, ` opacity="${op}"`); }
const snap = (x, y, r = 7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#b8bcc6" stroke="${INK}" stroke-width="2"/><circle cx="${f(x - 2)}" cy="${f(y - 2)}" r="2.2" fill="#fff"/>`;

// ── 그라데이션 ──────────────────────────────────────
const defs = () => `
<linearGradient id="${P}hair" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#5a4a3e"/><stop offset="0.5" stop-color="${HR.b}"/><stop offset="1" stop-color="#140f0c"/></linearGradient>
<linearGradient id="${P}skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde6d6"/><stop offset="0.6" stop-color="${SK.b}"/><stop offset="1" stop-color="#e6b49e"/></linearGradient>
<linearGradient id="${P}jk" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="${OL.h}"/><stop offset="0.45" stop-color="${OL.b}"/><stop offset="1" stop-color="${OL.d}"/></linearGradient>
<linearGradient id="${P}lin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${OR.h}"/><stop offset="0.4" stop-color="${OR.b}"/><stop offset="1" stop-color="${OR.s}"/></linearGradient>
<linearGradient id="${P}pant" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${PN.h}"/><stop offset="0.45" stop-color="${PN.b}"/><stop offset="1" stop-color="${PN.d}"/></linearGradient>
<linearGradient id="${P}boot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a4a40"/><stop offset="0.35" stop-color="#2e2420"/><stop offset="1" stop-color="#141010"/></linearGradient>
<linearGradient id="${P}tee" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="${TS.b}"/><stop offset="1" stop-color="${TS.s}"/></linearGradient>
<radialGradient id="${P}helm" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#dfe2e4"/><stop offset="1" stop-color="#8e949c"/></radialGradient>
<linearGradient id="${P}visor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c8"/><stop offset="0.3" stop-color="${OR.b}"/><stop offset="0.7" stop-color="#b8622a"/><stop offset="1" stop-color="#4a2410"/></linearGradient>
<linearGradient id="${P}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e120a"/><stop offset="0.45" stop-color="#6a3e1e"/><stop offset="0.8" stop-color="#c47e3a"/><stop offset="1" stop-color="#ffd08a"/></linearGradient>`;

// ── 다리·장화 ───────────────────────────────────────
function legs() {
  const Lg = "M500 1040 C480 1220 468 1400 462 1560 C458 1700 456 1860 450 2000 C448 2100 446 2200 446 2260 L560 2266 C566 2160 574 2040 582 1920 C592 1780 600 1600 604 1420 C606 1300 606 1160 604 1060Z";
  const Rg = "M600 1060 C610 1200 630 1360 650 1520 C664 1650 676 1800 690 1960 C700 2080 710 2180 716 2260 L828 2252 C816 2160 800 2060 786 1940 C772 1800 762 1640 750 1480 C740 1330 726 1180 716 1040Z";
  const pk = (x, y, w, h) => S(`M${x} ${y} L${x + w} ${y + 4} L${x + w - 2} ${y + h} C${x + w * 0.6} ${y + h + 8} ${x + w * 0.3} ${y + h + 6} ${x + 2} ${y + h - 2}Z`, PN.s, 2.5) +
    S(`M${x - 2} ${y - 2} L${x + w + 2} ${y + 2} L${x + w + 2} ${y + 22} L${x - 2} ${y + 18}Z`, PN.b, 2.5) + snap(x + w / 2, y + 12, 5);
  const shL = F("M560 1080 C566 1300 560 1600 552 1900 C548 2050 548 2180 550 2266 L560 2266 C566 2160 574 2040 582 1920 C592 1780 600 1600 604 1420 C606 1300 606 1160 604 1060Z", PN.d, ` opacity="0.7"`) +
    L("M486 1300 C490 1330 500 1360 520 1380", 2.5, PN.s) + L("M470 1760 C500 1780 540 1784 576 1774", 2.5, PN.d) +
    L("M480 1200 C474 1400 470 1600 466 1800", 3, PN.h, ` opacity="0.5"`) + pk(468, 1420, 76, 120) +
    // 무릎 보호대
    S("M466 1680 C490 1660 550 1660 584 1676 L580 1790 C548 1806 494 1806 462 1790Z", "#2a3040", 3) + L("M472 1720 L578 1724 M470 1756 L578 1760", 2, "#4a5468");
  const shR = F("M690 1080 C710 1300 730 1520 750 1740 C766 1900 784 2060 806 2254 L828 2252 C816 2160 800 2060 786 1940 C772 1800 762 1640 750 1480 C740 1330 726 1180 716 1040Z", PN.d, ` opacity="0.8"`) +
    L("M640 1330 C660 1350 690 1356 716 1350", 2.5, PN.s) + L("M680 1800 C710 1814 746 1814 776 1800", 2.5, PN.d) + pk(664, 1440, 74, 118) +
    S("M674 1700 C700 1684 754 1684 780 1696 L790 1806 C760 1822 708 1824 682 1810Z", "#232836", 3) + L("M680 1740 L786 1744 M684 1776 L788 1778", 2, "#3e475a");
  // 끈 달린 비행 장화
  const bootL = "M444 2180 C440 2240 438 2300 432 2330 C410 2346 388 2360 384 2378 C382 2392 396 2398 420 2398 L566 2398 C578 2394 580 2380 574 2366 C568 2330 566 2270 568 2190 C530 2206 480 2204 444 2180Z";
  const bootR = "M714 2176 C718 2240 722 2300 724 2334 C726 2360 728 2384 740 2396 L830 2398 C852 2396 856 2380 842 2366 C826 2348 820 2320 818 2290 C818 2250 822 2210 828 2170 C790 2192 750 2194 714 2176Z";
  const lace = (x0, x1, y0) => { let o = ""; for (let i = 0; i < 4; i++) { const y = y0 + i * 32; o += L(`M${x0} ${y} L${x1} ${y + 14} M${x0} ${y + 14} L${x1} ${y}`, 2.5, "#b8a890"); } return o; };
  const bootSh = (d, x0, x1) => part(d, `url(#${P}boot)`, lace(x0 + 30, x1 - 34, 2210) + F(`M${x0} 2370 L${x1 + 30} 2370 L${x1 + 30} 2400 L${x0} 2400Z`, "#0e0a0a") +
    L(`M${x0 + 10} 2198 C${x0 + 40} 2214 ${x1 - 40} 2214 ${x1} 2196`, 3, "#7a6a5a") + F(`M${x0 + 8} 2240 L${x0 + 18} 2240 L${x0 + 16} 2330 L${x0 + 6} 2330Z`, "#fff", ` opacity="0.3"`), 4.5);
  // 다리를 엉덩이 기준으로 살짝 벌려 당당한 자세로
  const sk = (k, inner) => `<g transform="matrix(1 0 ${k} 1 ${f(-k * 1050)} 0)">${inner}</g>`;
  return sk(-0.045, part(Lg, `url(#${P}pant)`, shL, 4.5) + bootSh(bootL, 436, 570)) +
    sk(0.035, part(Rg, `url(#${P}pant)`, shR, 4.5) + bootSh(bootR, 716, 830) + rimL("M826 2250 C814 2150 798 2050 784 1930", 4, 0.7));
}

// ── 몸통: 흰 티 + 벨트 ───────────────────────────────
function torso() {
  const d = "M540 440 C500 456 460 470 440 500 C452 640 470 800 486 940 C490 990 494 1030 496 1070 C560 1090 650 1090 716 1070 C716 1030 718 990 722 940 C738 800 754 640 762 500 C742 470 700 456 660 440Z";
  const inner = F("M640 450 C690 470 740 480 762 500 C754 640 738 800 722 940 L660 960Z", TS.s, ` opacity="0.7"`) +
    L("M530 700 C560 720 640 720 670 700", 2.5, TS.s) + L("M600 740 L600 900", 2, TS.s, ` opacity="0.8"`) + // 가슴·복근 암시
    L("M560 820 C580 830 620 830 640 820", 2, TS.s) + L("M566 880 C584 888 616 888 634 880", 2, TS.s) +
    // 벨트
    F("M480 980 C560 996 650 996 726 980 L728 1024 C650 1040 560 1040 482 1024Z", "#2a2420") + L("M480 980 C560 996 650 996 726 980", 3) + L("M482 1024 C560 1040 650 1040 728 1024", 3) +
    // 바지 윗단
    F("M470 1024 L740 1024 L740 1100 L470 1100Z", `url(#${P}pant)`) + L("M604 1036 L604 1094", 2.5, PN.d);
  const buckle = part("M580 978 L630 980 L630 1030 L580 1030Z", "#c8ccd4", F("M590 988 L620 990 L620 1020 L590 1020Z", "#2a2420") + F("M582 980 L628 982 L628 988 L582 986Z", "#fff", ` opacity="0.7"`), 3);
  // 군번줄
  const tags = L("M560 452 C566 540 584 600 596 640", 2, "#9aa0aa", ` stroke-dasharray="3 2"`) + L("M640 452 C634 540 616 600 604 640", 2, "#9aa0aa", ` stroke-dasharray="3 2"`) +
    S("M584 640 L606 636 L612 676 L590 680Z", "#c8ccd6", 2) + S("M598 646 L620 644 L622 684 L600 686Z", "#e2e6ee", 2) + L("M604 656 L616 655 M604 664 L614 663", 1.4, "#7a808a");
  return part(d, `url(#${P}tee)`, inner, 4.5) + buckle + tags;
}
function neck() {
  const nk = S("M554 360 C556 400 552 430 544 452 C576 472 624 472 656 452 C648 430 644 400 646 360Z", `url(#${P}skin)`, 4) +
    F("M560 372 C576 410 624 410 640 372 L642 430 C618 444 582 444 558 430Z", SK.s, ` opacity="0.9"`) + L("M592 424 C596 432 604 432 608 424", 2, SK.d);
  const col = S("M548 446 C570 476 630 476 652 446 L660 458 C632 494 568 494 540 458Z", TS.b, 3); // 티 목둘레
  return nk + col;
}

// ── 비행 재킷 ───────────────────────────────────────
function jacket() {
  // 화면 왼쪽 앞판
  const Lp = "M546 444 C510 452 462 466 432 492 C424 540 426 600 432 660 C440 760 452 860 460 960 L462 1000 C500 1012 540 1016 572 1014 C566 940 562 860 566 780 C570 700 574 620 582 560 C572 520 556 480 546 444Z";
  const LpIn = F("M432 660 C440 760 452 860 460 960 L490 966 C480 860 470 760 460 660Z", OL.h, ` opacity="0.35"`) +
    L("M470 760 C490 780 520 786 548 780", 2.5, OL.d) + L("M466 870 C494 884 530 888 560 880", 2.5, OL.d) +
    // 이름표 자리(벨크로) + 펜 꽂이 소매 주머니
    S("M470 620 L548 616 L548 650 L470 654Z", "#3e4628", 2.5) + L("M480 628 L536 626 M480 640 L524 638", 3, OR.b) +
    S("M474 820 L540 816 L546 900 L478 904Z", OL.s, 2.5) + L("M474 830 L540 826", 2, OL.d) + snap(509, 838, 5) + // 사선 지퍼 주머니
    L("M548 700 C552 760 556 860 562 1000", 2, OL.d, ` stroke-dasharray="7 5"`);
  // 화면 오른쪽 앞판
  const Rp = "M654 444 C690 452 738 466 768 492 C776 540 774 600 768 660 C760 760 750 860 744 960 L742 1000 C704 1012 664 1016 632 1014 C638 940 640 860 636 780 C632 700 626 620 618 560 C628 520 644 480 654 444Z";
  const RpIn = F("M768 660 C760 760 750 860 744 960 L700 970 C712 860 724 760 730 660Z", OL.d, ` opacity="0.6"`) +
    L("M660 780 C690 790 716 790 740 780", 2.5, OL.d) + L("M650 880 C680 892 710 892 738 884", 2.5, OL.d) +
    S("M664 824 L728 820 L724 904 L660 908Z", OL.s, 2.5) + snap(694, 840, 5);
  // 주황 안감 (열린 앞섶 안쪽)
  const linL = S("M546 444 C556 480 572 520 582 560 C574 620 570 700 566 780 C562 860 566 940 572 1014 L586 1014 C582 940 580 860 582 780 C586 700 590 620 596 560 C586 520 566 480 556 446Z", `url(#${P}lin)`, 2.5);
  const linR = S("M654 444 C644 480 628 520 618 560 C626 620 632 700 636 780 C640 860 638 940 632 1014 L618 1014 C622 940 622 860 620 780 C618 700 612 620 606 560 C616 520 634 480 644 446Z", OR.s, 2.5);
  // 지퍼(오른 앞판 가장자리)
  let zip = "";
  for (let y = 580; y < 1004; y += 9) zip += L(`M${f(622 - (y - 580) * 0.005)} ${y} l6 0`, 2, "#9aa0a8");
  zip += S("M612 960 L628 960 L628 990 L612 990Z", "#c8ccd4", 2) + L("M620 990 L620 1006", 3, "#c8ccd4");
  // 리브 밑단 + 칼라
  const hem = S("M460 960 C500 976 540 980 572 978 L574 1024 C540 1026 500 1022 462 1008Z", OL.s, 3.5) + S("M632 978 C664 980 704 976 744 960 L742 1008 C706 1022 666 1026 632 1024Z", OL.d, 3.5);
  const hemRib = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => L(`M${470 + i * 13} ${972 + i * 0.6} l0 42`, 1.5, OL.d) + L(`M${640 + i * 13} ${980 - i * 1.2} l0 42`, 1.5, "#232816")).join("");
  const colL = S("M548 440 C520 430 486 440 462 466 C470 490 486 510 506 518 C520 490 536 466 548 440Z", OL.s, 3.5) + L("M480 470 C490 486 500 498 510 504", 1.5, OL.d) + L("M494 456 C502 472 510 484 520 490", 1.5, OL.d);
  const colR = S("M652 440 C680 430 714 440 738 466 C730 490 714 510 694 518 C680 490 664 466 652 440Z", OL.d, 3.5) + L("M720 470 C710 486 700 498 690 504", 1.5, "#232816");
  // 가슴 부대 패치 (화면 오른쪽): 원형, 날개 + 번개
  const patch = `<circle cx="700" cy="640" r="40" fill="#1e2a44" stroke="${INK}" stroke-width="3"/><circle cx="700" cy="640" r="34" fill="none" stroke="${OR.b}" stroke-width="3"/>` +
    S("M666 646 C680 630 690 628 700 634 C710 628 720 630 734 646 C720 642 710 644 700 650 C690 644 680 642 666 646Z", "#e8ecf4", 1.5) +
    S("M704 612 L692 640 L702 640 L694 664 L712 632 L702 632 L708 612Z", OR.b, 1.5) + `<circle cx="686" cy="626" r="3" fill="#fff"/>`;
  const rim = rimL("M770 500 C776 560 772 620 766 680 C758 780 750 870 744 960", 5, 0.85);
  return part(Lp, `url(#${P}jk)`, LpIn, 4.5) + part(Rp, `url(#${P}jk)`, RpIn, 4.5) + linL + linR + zip + hem + hemRib + colL + colR + patch + rim;
}

// ── 화면 오른쪽 팔: 허리에 손을 얹음 (팔꿈치 바깥으로) ─────
function armR() {
  const up = "M748 486 C790 490 830 520 852 570 C876 630 892 700 900 760 C890 790 860 800 836 790 C824 730 806 670 784 620 C766 580 744 540 748 486Z";
  const upIn = F("M852 570 C876 630 892 700 900 760 L880 776 C870 710 852 640 830 590Z", OL.d, ` opacity="0.6"`) +
    L("M800 600 C820 640 836 690 846 740", 2.5, OL.d) +
    // 어깨 성조 패치(일반 부대 깃발 모양) + 주황 줄
    S("M792 540 L840 556 L828 600 L780 584Z", "#2a3450", 2.5) + F("M796 552 L834 564 L831 574 L793 562Z", OR.b) + F("M790 566 L830 579 L827 588 L787 576Z", "#e8ecf4") +
    L("M770 500 C800 504 830 520 848 546", 7, OR.b) + L("M770 500 C800 504 830 520 848 546", 2, INK, ` opacity="0.5"`);
  const fore = "M836 770 C870 790 896 780 904 750 C900 820 880 880 840 920 C810 950 770 970 740 980 C726 960 726 936 736 920 C770 904 800 880 816 850 C830 826 836 800 836 770Z";
  const foreIn = F("M904 750 C900 820 880 880 840 920 C810 950 770 970 740 980 L744 964 C780 950 820 920 846 880 C870 840 886 800 890 760Z", OL.d, ` opacity="0.6"`) +
    L("M840 790 C852 800 868 804 884 800", 2.5, OL.d) + L("M846 810 C860 820 874 822 888 818", 2, OL.d);
  const cuff = S("M736 914 C752 906 770 900 782 896 L796 944 C780 952 762 960 746 968 C734 952 730 930 736 914Z", OL.s, 3.5) + L("M748 912 L760 960 M762 906 L774 954", 1.5, OL.d);
  // 장갑 낀 손: 허리 옆에 손등, 손가락은 앞쪽 아래로
  const hand = S("M740 930 C720 928 700 940 694 962 C690 986 700 1004 718 1010 C736 1012 750 1002 756 984 C760 964 756 942 740 930Z", GV.b, 4) +
    F("M694 962 C690 986 700 1004 718 1010 C708 996 700 980 694 962Z", GV.s) + L("M712 944 C724 940 736 942 744 950", 1.8, GV.h);
  const fings = fing([[702, 960], [684, 976], [680, 1000]], 14) + fing([[704, 978], [688, 996], [688, 1020]], 14.5) +
    fing([[710, 994], [698, 1012], [700, 1034]], 14) + fing([[720, 1004], [712, 1022], [716, 1040]], 12.5);
  return part(up, `url(#${P}jk)`, upIn, 4.5) + part(fore, `url(#${P}jk)`, foreIn, 4.5) + fings + hand + cuff +
    rimL("M856 576 C880 640 894 700 902 760 C898 820 880 880 842 918", 5, 0.85);
}

// ── 화면 왼쪽 팔 + 옆구리에 낀 헬멧 ─────────────────────
function armL() {
  const up = "M452 488 C420 496 398 530 390 580 C380 660 376 740 380 820 C396 846 430 852 452 836 C452 760 458 680 468 620 C474 570 478 520 452 488Z";
  const upIn = F("M390 580 C380 660 376 740 380 820 L404 836 C400 750 402 660 410 590Z", OL.h, ` opacity="0.35"`) +
    L("M392 790 C408 806 430 810 448 804", 2.5, OL.d) +
    S("M402 560 L446 552 L452 600 L408 608Z", "#3e4628", 2.5) + `<circle cx="427" cy="580" r="13" fill="${OR.b}" stroke="${INK}" stroke-width="2"/>` + star5(427, 580, 8, "#2a3450") +
    L("M430 500 C410 506 396 524 390 548", 7, OR.b);
  return part(up, `url(#${P}jk)`, upIn, 4.5);
}
function star5(x, y, r, fill) {
  let d = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? "L" : "M") + f(x + Math.cos(a) * rr) + " " + f(y + Math.sin(a) * rr); }
  return F(d + "Z", fill);
}
function helmet() {
  // 옆구리에 낀 비행 헬멧 (흰색 + 주황 띠 + 반사 바이저)
  const cx = 420, cy = 960;
  const shell = `M${cx - 112} ${cy + 20} C${cx - 118} ${cy - 70} ${cx - 50} ${cy - 128} ${cx + 20} ${cy - 124} C${cx + 96} ${cy - 118} ${cx + 128} ${cy - 50} ${cx + 120} ${cy + 30} C${cx + 114} ${cy + 80} ${cx + 90} ${cy + 116} ${cx + 50} ${cy + 124} C${cx} ${cy + 132} ${cx - 60} ${cy + 124} ${cx - 92} ${cy + 96} C${cx - 108} ${cy + 76} ${cx - 112} ${cy + 50} ${cx - 112} ${cy + 20}Z`;
  const inner = F(`M${cx - 120} ${cy - 30} C${cx - 60} ${cy - 60} ${cx + 40} ${cy - 66} ${cx + 130} ${cy - 40} L${cx + 130} ${cy - 18} C${cx + 40} ${cy - 44} ${cx - 60} ${cy - 38} ${cx - 120} ${cy - 8}Z`, OR.b) +
    L(`M${cx - 120} ${cy - 30} C${cx - 60} ${cy - 60} ${cx + 40} ${cy - 66} ${cx + 130} ${cy - 40}`, 2, INK) + L(`M${cx - 120} ${cy - 8} C${cx - 60} ${cy - 38} ${cx + 40} ${cy - 44} ${cx + 130} ${cy - 18}`, 2, INK) +
    F(`M${cx + 60} ${cy - 120} C${cx + 120} ${cy - 80} ${cx + 130} ${cy} ${cx + 110} ${cy + 80} L${cx + 140} ${cy + 80} L${cx + 140} ${cy - 120}Z`, "#6a7078", ` opacity="0.45"`) +
    F(`M${cx - 70} ${cy - 96} C${cx - 40} ${cy - 116} ${cx} ${cy - 120} ${cx + 30} ${cy - 112} C${cx} ${cy - 104} ${cx - 40} ${cy - 96} ${cx - 64} ${cy - 80}Z`, "#fff", ` opacity="0.9"`);
  const visor = `M${cx - 96} ${cy + 4} C${cx - 50} ${cy - 16} ${cx + 50} ${cy - 18} ${cx + 106} ${cy + 6} C${cx + 104} ${cy + 60} ${cx + 80} ${cy + 96} ${cx + 30} ${cy + 104} C${cx - 20} ${cy + 108} ${cx - 70} ${cy + 90} ${cx - 92} ${cy + 56} C${cx - 98} ${cy + 40} ${cx - 98} ${cy + 20} ${cx - 96} ${cy + 4}Z`;
  const visorIn = F(`M${cx - 80} ${cy + 20} C${cx - 40} ${cy + 6} ${cx + 20} ${cy + 4} ${cx + 60} ${cy + 14} C${cx + 20} ${cy + 20} ${cx - 30} ${cy + 30} ${cx - 76} ${cy + 50}Z`, "#fff", ` opacity="0.75"`) +
    L(`M${cx - 70} ${cy + 72} C${cx - 20} ${cy + 90} ${cx + 40} ${cy + 88} ${cx + 90} ${cy + 50}`, 3, "#fff2c8", ` opacity="0.6"`) +
    F(`M${cx + 40} ${cy + 30} L${cx + 70} ${cy + 26} L${cx + 50} ${cy + 80} L${cx + 26} ${cy + 84}Z`, "#fff", ` opacity="0.25"`);
  const trim = L(`M${cx - 96} ${cy + 4} C${cx - 50} ${cy - 16} ${cx + 50} ${cy - 18} ${cx + 106} ${cy + 6}`, 7, "#3a3e46") + snap(cx - 100, cy + 30, 8) + snap(cx + 112, cy + 34, 8);
  return part(shell, `url(#${P}helm)`, inner, 5) + part(visor, `url(#${P}visor)`, visorIn, 4) + trim;
}
function foreL() {
  // 헬멧 위를 감싸고 앞쪽 테두리를 쥔 팔뚝
  const fore = "M380 810 C374 850 390 880 420 900 C450 918 480 934 504 948 C520 930 522 904 512 888 C490 870 466 852 450 834 C436 818 410 800 380 810Z";
  const foreIn = F("M380 840 C400 880 460 920 504 948 L512 936 C470 910 420 876 392 840Z", OL.d, ` opacity="0.6"`) + L("M408 822 C418 840 430 852 446 858", 2.5, OL.d) + L("M424 816 C434 832 446 842 460 846", 2, OL.d);
  const cuff = S("M488 880 C504 884 518 894 522 906 C524 924 518 940 508 952 C496 948 486 944 478 940 C486 922 490 900 488 880Z", OL.s, 3.5);
  const hand = S("M512 900 C530 892 552 900 560 920 C566 940 558 962 540 972 C522 978 506 970 500 954 C496 934 500 912 512 900Z", GV.b, 4) +
    F("M558 930 C562 950 556 964 540 972 C550 960 556 946 558 930Z", GV.s);
  const fings = fing([[548, 916], [566, 936], [568, 962]], 14) + fing([[552, 936], [566, 958], [564, 984]], 14.5) +
    fing([[548, 954], [556, 976], [550, 998]], 14) + fing([[536, 966], [540, 988], [532, 1006]], 12.5);
  const thumb = fing([[516, 906], [530, 890], [548, 886]], 14);
  return part(fore, `url(#${P}jk)`, foreIn, 4.5) + cuff + hand + fings + thumb;
}

// ── 머리 ────────────────────────────────────────────
function head() {
  const face = "M504 250 C502 322 510 362 528 388 C548 410 576 421 600 422 C624 421 652 410 672 388 C690 362 698 322 696 250 C696 166 652 130 600 130 C548 130 504 166 504 250Z";
  const earL = S("M506 280 C488 268 480 286 484 308 C488 330 498 346 514 348Z", `url(#${P}skin)`, 3.5) + L("M496 296 C494 310 500 324 508 332", 2, SK.d);
  const earR = S("M694 280 C712 268 720 286 716 308 C712 330 702 346 686 348Z", SK.s, 3.5) + L("M704 296 C706 310 700 324 692 332", 2, SK.d);
  const shade = F("M676 236 C690 300 688 350 666 384 C644 408 622 418 600 420 C640 396 666 360 672 300Z", SK.s, ` opacity="0.75"`) +
    F("M504 220 C540 246 570 226 600 244 C630 228 660 248 696 226 L696 190 L504 190Z", SK.s, ` opacity="0.85"`) +
    L("M534 384 C552 402 570 412 586 416", 2, SK.d, ` opacity="0.4"`);
  return earL + earR + part(face, `url(#${P}skin)`, shade, 4.5);
}
const EXP = {
  normal: { o: 0.8, to: -4, ti: 4, iris: 0.9 },
  smile: { closed: true },
  angry: { o: 0.74, to: -8, ti: 12, iris: 0.8 },
  sad: { o: 0.82, to: 6, ti: -4, iris: 0.94, tear: true },
  surprise: { o: 1.18, to: 0, ti: 0, iris: 0.68 },
  serious: { o: 0.58, to: -6, ti: 8, iris: 0.9 },
};
function eye(e, side) {
  if (e.closed) return L("M-32 4 C-18 -16 14 -18 30 -2", 6.5) + L("M-32 4 L-38 8", 3) + L("M-20 12 C-8 16 8 16 18 12", 1.8, INK, ` opacity="0.45"`);
  const o = e.o;
  const up = `M-32 ${4 + e.to} C-22 ${f(-20 * o + e.to * 0.5)} 12 ${f(-26 * o + e.ti * 0.5)} 30 ${-6 + e.ti}`;
  const low = `C24 ${f(12)} -12 ${f(17)} -30 ${8 + e.to * 0.3}Z`;
  const scl = up + " " + low;
  const id = `${P}e${side}${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${scl}"/></clipPath>`);
  const r = e.iris, irx = 16 * r, iry = 20 * r, icx = 3, icy = 1;
  const iris = `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#${P}iris)" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="${icx}" cy="${f(icy + 1)}" rx="${f(irx * 0.44)}" ry="${f(iry * 0.48)}" fill="#120a06"/>` +
    `<path d="M${f(icx - irx * 0.8)} ${f(icy + iry * 0.3)} Q${icx} ${f(icy + iry * 1.05)} ${f(icx + irx * 0.8)} ${f(icy + iry * 0.3)}" fill="none" stroke="#ffe0a8" stroke-width="2.5" opacity="0.75"/>` +
    `<circle cx="${f(icx - irx * 0.42)}" cy="${f(icy - iry * 0.35)}" r="${f(5.5 * r + 0.8)}" fill="#fff"/>` +
    `<circle cx="${f(icx + irx * 0.5)}" cy="${f(icy + iry * 0.42)}" r="2.6" fill="#fff"/><circle cx="${f(icx + irx * 0.6)}" cy="${f(icy - iry * 0.25)}" r="1.6" fill="#fff" opacity="0.9"/>`;
  const sclera = F(scl, "#fffcf8") + `<g clip-path="url(#${id})">${F(`M-40 -40 L40 -40 L40 ${f(-10 * o)} C10 ${f(-4 * o)} -10 ${f(-4 * o)} -40 ${f(-6 * o)}Z`, "#e6dcd6")}${iris}</g>`;
  const lash = `<path d="${up}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>` +
    L(`M-32 ${4 + e.to} L-40 ${f(4 + e.to)}`, 4) +
    L(`M28 6 C12 14 -12 16 -26 ${f(8 + e.to * 0.3)}`, 2, "#5a3a2a") +
    L(`M-22 ${f(-22 * o + e.to * 0.5 - 6)} C-8 ${f(-30 * o - 4)} 12 ${f(-30 * o + e.ti * 0.5 - 4)} 24 ${f(-18 * o + e.ti - 6)}`, 2, "#8a5a46", ` opacity="0.75"`);
  let extra = "";
  if (e.tear) extra = F("M-18 16 C-14 28 -16 36 -22 40 C-28 36 -28 28 -18 16Z", "#bfe8ff", ` stroke="${INK}" stroke-width="1.5"`);
  return sclera + lash + extra;
}
function brows(x) {
  const B = {
    normal: "M-42 -6 C-24 -18 4 -18 30 -8 L30 0 C4 -8 -24 -8 -42 2Z",
    smile: "M-42 -12 C-24 -24 4 -24 30 -14 L30 -6 C4 -14 -24 -14 -42 -4Z",
    angry: "M-42 -14 C-20 -14 6 -6 30 8 L28 16 C4 4 -20 -4 -42 -4Z",
    sad: "M-42 4 C-22 -4 4 -12 30 -18 L30 -10 C4 -4 -22 4 -42 12Z",
    surprise: "M-42 -18 C-24 -32 4 -32 30 -22 L30 -14 C4 -22 -24 -22 -42 -10Z",
    serious: "M-42 -6 C-22 -10 4 -6 30 2 L30 10 C4 2 -22 0 -42 2Z",
  }[x];
  return S(B, "#2a201a", 2.5);
}
function mouth(x) {
  switch (x) {
    case "smile": return S("M564 362 C580 398 624 398 640 360 C620 370 584 372 564 362Z", "#6a2228", 2.8) + F("M570 365 C588 372 618 372 634 363 L632 372 C616 378 590 378 572 372Z", "#fff") + F("M586 388 C596 392 608 392 618 386 C610 384 594 384 586 388Z", "#d96a72");
    case "angry": return S("M570 378 C582 364 618 364 630 378 C618 392 582 392 570 378Z", "#4a1a20", 2.5) + F("M576 373 C590 368 610 368 624 373 L622 378 C608 375 592 375 578 378Z", "#fff") + F("M580 384 C592 388 608 388 620 384 L620 381 C608 384 592 384 580 381Z", "#fff");
    case "sad": return L("M580 384 C592 376 608 376 620 384", 3);
    case "surprise": return S("M586 370 C588 360 612 360 614 370 C616 388 608 396 600 396 C592 396 584 388 586 370Z", "#5a1a22", 2.5) + F("M590 386 C596 392 604 392 610 386 C604 384 596 384 590 386Z", "#d96a72");
    case "serious": return L("M582 378 L618 378", 3.2);
    default: return S("M578 372 C592 382 612 382 628 366 C612 374 592 376 578 372Z", "#7a2a30", 2.5) + F("M586 374 C598 378 612 377 622 371 L620 375 C610 380 596 380 588 377Z", "#fff") + L("M626 366 L632 362", 2.5); // 자신만만한 비뚤 미소
  }
}
function face(x) {
  const e = EXP[x];
  const eL = `<g transform="translate(554 292)">${eye(e, "L")}</g>`;
  const eR = `<g transform="translate(646 292) scale(-1 1)">${eye(e, "R")}</g>`;
  const bL = `<g transform="translate(552 254)">${brows(x)}</g>`, bR = `<g transform="translate(648 254) scale(-1 1)">${brows(x)}</g>`;
  const nose = L("M604 306 C608 324 610 338 606 346", 2.2, SK.d) + L("M592 350 C598 354 606 354 612 348", 2.2, SK.d) + F("M608 324 C616 340 614 350 604 352Z", SK.s, ` opacity="0.8"`);
  const blush = (x === "smile") ? `<ellipse cx="530" cy="340" rx="24" ry="9" fill="#f08a80" opacity="0.35"/><ellipse cx="670" cy="340" rx="24" ry="9" fill="#f08a80" opacity="0.35"/>` : "";
  let fx = "";
  if (x === "angry") fx = L("M594 262 L598 276 M606 262 L602 276", 2, SK.d) + L("M704 176 l14 -14 M712 188 l18 -6", 3.5, "#d83a3a");
  if (x === "surprise") fx = F("M712 208 C716 224 716 234 710 240 C704 234 704 224 712 208Z", "#bfe8ff", ` stroke="${INK}" stroke-width="2"`);
  // 반창고 대신: 콧등에 작은 상처 자국(젊은 시절의 혈기)
  const nick = L("M640 330 L652 324", 2, SK.d, ` opacity="0.7"`);
  return blush + eL + eR + bL + bR + nose + mouth(x) + nick + fx;
}
// 짧고 살짝 흐트러진 머리
function hair() {
  const ds = [
    "M496 270 C484 186 520 118 600 112 C682 116 720 180 708 266 C700 240 692 222 680 210 C650 200 620 198 600 200 C576 198 548 202 522 212 C510 226 502 246 496 270Z",
    leaf([520, 180], [560, 140], [486, 172], -10, 6),
    leaf([560, 130], [620, 116], [574, 90], -8, 8),
    leaf([610, 116], [670, 140], [664, 94], 10, -2),
    leaf([660, 150], [704, 200], [726, 168], 12, -4),
    leaf([500, 220], [520, 190], [470, 250], -6),
    leaf([690, 200], [708, 250], [734, 268], 6),
    // 앞머리 갈래
    leaf([530, 200], [580, 196], [534, 262], -6, 8),
    leaf([570, 196], [620, 198], [588, 268], -4, 10),
    leaf([610, 196], [660, 202], [642, 258], 6, 6),
    leaf([650, 200], [700, 220], [690, 266], 8, 2),
    leaf([510, 214], [540, 204], [500, 300], -6, 4),
    leaf([680, 210], [706, 240], [704, 310], 6, -4),
  ];
  const sh = F("M540 200 L520 270 L500 300 L496 200Z", HR.d, ` opacity="0.5"`) +
    L("M560 140 C556 170 552 190 548 206", 2.5, HR.d) + L("M620 120 C626 150 628 176 624 198", 2.5, HR.d) + L("M672 150 C680 176 686 196 690 214", 2.5, HR.d) +
    L("M556 210 C552 230 546 246 540 258", 2, HR.d) + L("M600 206 C598 230 594 250 590 264", 2, HR.d) + L("M640 210 C644 228 644 244 642 256", 2, HR.d) +
    // 윤기
    F("M520 176 C544 150 576 140 604 140 C580 150 560 164 548 186Z", HR.g, ` opacity="0.75"`) + F("M590 150 C612 138 640 138 664 150 C644 152 624 160 612 172Z", HR.g, ` opacity="0.65"`) +
    F("M650 168 C668 166 686 176 696 190 C680 186 666 186 656 192Z", HR.g, ` opacity="0.5"`) +
    L("M536 166 C552 154 570 148 590 146", 2, "#f2e4d4", ` opacity="0.8"`) + L("M604 146 C620 142 636 144 650 150", 2, "#f2e4d4", ` opacity="0.7"`);
  return union(ds, `url(#${P}hair)`, sh, 4.5) + L("M600 112 C596 92 604 80 618 78", 3) + rimL("M708 262 C716 220 714 180 700 150", 4, 0.8);
}

export function svg(expr = "normal") {
  if (!EXP[expr]) expr = "normal";
  clipN = 0; clips.length = 0;
  // 비율 보정: 상체를 세로로 늘리고(허리선 ↓) 다리를 그만큼 줄인다. 헬멧은 원형 유지
  const K = 1.15, up = `matrix(1 0 0 ${K} 0 ${f(440 - 440 * K)})`, lg = 0.934;
  const helm = `<g transform="translate(0 960) scale(1 ${f(1 / K * 1000) / 1000}) translate(0 -960)">${helmet()}</g>`;
  const body = `<g transform="matrix(1 0 0 ${lg} 0 ${f(2400 * (1 - lg))})">${legs()}</g>` +
    `<g transform="${up}">${torso()}${jacket()}${armR()}${armL()}${helm}${foreL()}</g>` + neck() + head() + face(expr) + hair();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${defs()}${clips.join("")}</defs>${body}</svg>`;
}
